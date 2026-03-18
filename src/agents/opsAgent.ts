import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { OpsAgentInput, OpsAgentOutput, PipelineConfig } from '../types';

function run(cmd: string): string {
  return execSync(cmd, {
    encoding: 'utf-8',
    shell: 'bash',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

export async function runOpsAgent(
  input: OpsAgentInput,
  config: PipelineConfig
): Promise<OpsAgentOutput> {
  const { vercelToken, vercelScope, slug, customDomain } = { ...config, ...input };
  const scopeFlag = vercelScope ? `--scope ${vercelScope}` : '';

  // Write the HTML to a temp deploy directory
  const deployDir = path.resolve('apps', slug);
  fs.mkdirSync(deployDir, { recursive: true });
  fs.writeFileSync(path.join(deployDir, 'index.html'), input.htmlContent, 'utf-8');

  // Deploy to Vercel
  console.log(`[ops] Deploying ${slug}...`);
  const deploymentUrl = run(
    `npx vercel --cwd "${deployDir.replace(/\\/g, '/')}" --token ${vercelToken} ${scopeFlag} --yes --prod --name app-factory-${slug}`
  );
  console.log(`[ops] Deployed to: ${deploymentUrl}`);

  // Assign subdomain alias
  const alias = `${slug}.${customDomain}`;
  try {
    run(`npx vercel alias set "${deploymentUrl}" "${alias}" --token ${vercelToken} ${scopeFlag}`);
    console.log(`[ops] Alias assigned: ${alias}`);
    return { liveUrl: `https://${alias}` };
  } catch (err) {
    console.error(`[ops] Alias assignment failed; falling back to deployment URL`);
    return { liveUrl: deploymentUrl };
  }
}
