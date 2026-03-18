import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface AppEntry {
  title: string;
  url: string;
  date: string;
}

function run(cmd: string): string {
  return execSync(cmd, {
    encoding: 'utf-8',
    shell: 'bash',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

export async function deployLanding(apps: AppEntry[] = []): Promise<void> {
  const token = process.env.VERCEL_TOKEN;
  const scope = process.env.VERCEL_SCOPE ?? process.env.VERCEL_TEAM_ID;
  const domain = process.env.CUSTOM_DOMAIN;

  if (!token) throw new Error('VERCEL_TOKEN is required');
  if (!domain) throw new Error('CUSTOM_DOMAIN is required');

  const scopeFlag = scope ? `--scope ${scope}` : '';

  // Inject apps data into landing HTML
  const landingPath = path.resolve('landing', 'index.html');
  let html = fs.readFileSync(landingPath, 'utf-8');
  html = html.replace(
    /window\.__APPS__\s*=\s*\[.*?\];/s,
    `window.__APPS__=${JSON.stringify(apps)};`
  );

  // Write to a temp file so we don't dirty the source
  const tmpDir = path.resolve('landing', '.tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'index.html'), html, 'utf-8');

  console.log('[deploy-landing] Deploying...');
  const deploymentUrl = run(
    `npx vercel --cwd "${tmpDir.replace(/\\/g, '/')}" --token ${token} ${scopeFlag} --yes --prod`
  );
  console.log(`[deploy-landing] Deployed to: ${deploymentUrl}`);

  // Clean up temp dir (delayed to let Vercel CLI release file handles)
  setTimeout(() => fs.rmSync(tmpDir, { recursive: true, force: true }), 2000);

  for (const alias of [`www.${domain}`, domain]) {
    try {
      run(`npx vercel alias set "${deploymentUrl}" "${alias}" --token ${token} ${scopeFlag} --yes`);
      console.log(`[deploy-landing] Alias assigned: ${alias}`);
    } catch {
      // alias may already exist, non-fatal
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
      .map((r: any) => ({ title: r.idea, url: r.url, date: r.date.slice(0, 10) }));
  }
  deployLanding(apps).catch(err => {
    console.error('[deploy-landing] Fatal:', err.message ?? err);
    process.exit(1);
  });
}
