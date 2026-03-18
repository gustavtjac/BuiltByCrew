import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { OpsAgentInput, OpsAgentOutput, PipelineConfig } from '../types';

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

export async function runOpsAgent(
  input: OpsAgentInput,
  config: PipelineConfig
): Promise<OpsAgentOutput> {
  const { vercelToken, vercelTeamId, customDomain } = config;
  const { slug, htmlContent } = input;
  const tq = teamQuery(vercelTeamId);

  // Save HTML locally
  const deployDir = path.resolve('apps', slug);
  fs.mkdirSync(deployDir, { recursive: true });
  fs.writeFileSync(path.join(deployDir, 'index.html'), htmlContent, 'utf-8');

  console.log(`[ops] Deploying ${slug}...`);

  // Create deployment via Vercel API
  const { data: deployment } = await axios.post(
    `${BASE}/v13/deployments${tq}`,
    {
      name: `app-factory-${slug}`,
      target: 'production',
      files: [
        {
          file: 'index.html',
          data: Buffer.from(htmlContent).toString('base64'),
          encoding: 'base64',
        },
      ],
      projectSettings: { framework: null },
    },
    { headers: headers(vercelToken) }
  );

  const deploymentUrl = await waitForReady(vercelToken, vercelTeamId, deployment.id);
  console.log(`[ops] Deployed to: ${deploymentUrl}`);

  // Add subdomain to the project (triggers cert provisioning automatically)
  const subdomain = `${slug}.${customDomain}`;
  const projectName = `app-factory-${slug}`;
  try {
    await axios.post(
      `${BASE}/v9/projects/${projectName}/domains${tq}`,
      { name: subdomain },
      { headers: headers(vercelToken) }
    );
    console.log(`[ops] Domain added: https://${subdomain}`);
    return { liveUrl: `https://${subdomain}` };
  } catch (err: any) {
    const detail = err?.response?.data ?? err?.message ?? err;
    console.warn(`[ops] Domain assignment failed (${subdomain}):`, JSON.stringify(detail));
    return { liveUrl: deploymentUrl };
  }
}
