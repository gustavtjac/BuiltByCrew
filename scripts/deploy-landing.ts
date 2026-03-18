import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface AppEntry {
  title: string;
  url: string;
  date: string;
  description?: string;
}

const BASE = 'https://api.vercel.com';

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function teamQuery(teamId: string) {
  return teamId ? `?teamId=${teamId}` : '';
}

async function waitForReady(token: string, teamId: string, deploymentId: string): Promise<string> {
  const tq = teamQuery(teamId);
  for (let i = 0; i < 60; i++) {
    const { data } = await axios.get(`${BASE}/v13/deployments/${deploymentId}${tq}`, {
      headers: headers(token),
    });
    if (data.readyState === 'READY') return `https://${data.url}`;
    if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') {
      throw new Error(`Deployment ${deploymentId} ended with state: ${data.readyState}`);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('Deployment timed out after 3 minutes');
}

export async function deployLanding(apps: AppEntry[] = []): Promise<void> {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_SCOPE ?? process.env.VERCEL_TEAM_ID ?? '';
  const domain = process.env.CUSTOM_DOMAIN;

  if (!token) throw new Error('VERCEL_TOKEN is required');
  if (!domain) throw new Error('CUSTOM_DOMAIN is required');

  const tq = teamQuery(teamId);

  // Inject apps data into landing HTML
  const landingPath = path.resolve('landing', 'index.html');
  let html = fs.readFileSync(landingPath, 'utf-8');
  html = html.replace(
    /window\.__APPS__\s*=\s*\[.*?\];/s,
    `window.__APPS__=${JSON.stringify(apps)};`
  );

  console.log(`[deploy-landing] Deploying with ${apps.length} apps...`);

  // Deploy via REST API
  const { data: deployment } = await axios.post(
    `${BASE}/v13/deployments${tq}`,
    {
      name: 'builtbycrew-landing',
      target: 'production',
      public: true,
      files: [
        {
          file: 'index.html',
          data: Buffer.from(html).toString('base64'),
          encoding: 'base64',
        },
      ],
      projectSettings: { framework: null },
    },
    { headers: headers(token) }
  );

  const deploymentUrl = await waitForReady(token, teamId, deployment.id);
  console.log(`[deploy-landing] Deployed to: ${deploymentUrl}`);

  // Assign aliases via REST API (use deployment ID, not URL)
  for (const alias of [domain, `www.${domain}`]) {
    try {
      await axios.post(
        `${BASE}/v2/deployments/${deployment.id}/aliases${tq}`,
        { alias },
        { headers: headers(token) }
      );
      console.log(`[deploy-landing] Alias assigned: ${alias}`);
    } catch (err: any) {
      const detail = err?.response?.data ?? err?.message ?? err;
      console.warn(`[deploy-landing] Alias failed for ${alias}:`, JSON.stringify(detail));
    }
  }

  console.log(`[deploy-landing] Done. Live at https://www.${domain}`);
}

// Run as standalone script
if (require.main === module) {
  const runsPath = path.resolve('data', 'runs.json');
  let apps: AppEntry[] = [];
  if (fs.existsSync(runsPath)) {
    const store = JSON.parse(fs.readFileSync(runsPath, 'utf-8'));
    apps = (store.runs ?? [])
      .filter((r: any) => r.status === 'success' && r.url)
      .map((r: any) => ({ title: r.idea, url: r.url, date: r.date.slice(0, 10), description: r.description ?? '' }));
  }
  console.log(`[deploy-landing] Found ${apps.length} successful apps`);
  deployLanding(apps).catch(err => {
    console.error('[deploy-landing] Fatal:', err.message ?? err);
    process.exit(1);
  });
}
