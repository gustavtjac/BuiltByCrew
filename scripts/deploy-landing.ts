import 'dotenv/config';
import { execSync } from 'child_process';

function run(cmd: string): string {
  return execSync(cmd, {
    encoding: 'utf-8',
    shell: 'bash',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

async function deployLanding(): Promise<void> {
  const token = process.env.VERCEL_TOKEN;
  const scope = process.env.VERCEL_SCOPE ?? process.env.VERCEL_TEAM_ID;
  const domain = process.env.CUSTOM_DOMAIN;

  if (!token) throw new Error('VERCEL_TOKEN is required');
  if (!scope) throw new Error('VERCEL_SCOPE is required (your Vercel username or team slug)');
  if (!domain) throw new Error('CUSTOM_DOMAIN is required');

  const scopeFlag = `--scope ${scope}`;

  // Deploy to production
  console.log('[deploy-landing] Deploying...');
  const deploymentUrl = run(
    `npx vercel --cwd landing --token ${token} ${scopeFlag} --yes --prod`
  );
  console.log(`[deploy-landing] Deployed to: ${deploymentUrl}`);

  // Assign www alias
  const wwwAlias = `www.${domain}`;
  try {
    run(`npx vercel alias set "${deploymentUrl}" "${wwwAlias}" --token ${token} ${scopeFlag}`);
    console.log(`[deploy-landing] Alias assigned: ${wwwAlias}`);
  } catch (err) {
    console.warn(`[deploy-landing] www alias failed:`, err);
  }

  // Assign root domain alias
  try {
    run(`npx vercel alias set "${deploymentUrl}" "${domain}" --token ${token} ${scopeFlag}`);
    console.log(`[deploy-landing] Alias assigned: ${domain}`);
  } catch (err) {
    console.warn(`[deploy-landing] Root domain alias failed:`, err);
  }

  console.log(`[deploy-landing] Done. Live at https://www.${domain}`);
}

deployLanding().catch(err => {
  console.error('[deploy-landing] Fatal:', err.message ?? err);
  process.exit(1);
});
