import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const GITHUB_ORG = 'BuiltByCrew';

interface AppMeta {
  slug: string;
  title: string;
  description: string;
  url: string;
  date: string;
  category?: string;
  screenshot_url?: string;
}

function buildReadme(p: { title: string; slug: string; description: string; url: string; date: string; repoUrl: string }): string {
  return `# ${p.title}

> ${p.description}

[![Live demo](https://img.shields.io/badge/Live%20demo-builtbycrew.online-00c853?style=for-the-badge&logo=vercel&logoColor=white)](${p.url})
[![BuiltByCrew](https://img.shields.io/badge/Built%20by-BuiltByCrew-6c63ff?style=for-the-badge)](https://builtbycrew.online)

---

## Try it

**→ [${p.url}](${p.url})**

No login. No install. Just open it and use it.

---

## About

This app was autonomously designed, built, and deployed by **[BuiltByCrew](https://builtbycrew.online)** — an AI-powered webapp factory that ships a new single-page app every day.

- **Built on:** ${p.date}
- **Stack:** Pure HTML, CSS, and JavaScript — zero dependencies, fully self-contained
- **Deployed to:** Vercel (subdomain of \`builtbycrew.online\`)

---

## Source

The entire app lives in [\`index.html\`](./index.html) — one file, no build step, no framework.

---

## License

MIT — do whatever you want with it.

---

*Part of the [BuiltByCrew](https://builtbycrew.online) collection — a new app every day, built by AI.*
`;
}

function run(cmd: string, opts?: { cwd?: string }): string {
  return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
}

export async function createGithubRepo(meta: AppMeta): Promise<string> {
  const { slug, title, description, url, date } = meta;
  const repoName = slug;
  const appDir = path.resolve('apps', slug);

  console.log(`[github] Creating repo ${GITHUB_ORG}/${repoName}...`);

  // Create the repo under the org (public, no auto-init — we'll push)
  try {
    run(
      `gh repo create ${GITHUB_ORG}/${repoName} --public --description "${description.replace(/"/g, "'")}" --confirm`,
    );
  } catch (e: any) {
    // If already exists, that's fine — just push
    if (!e.message?.includes('already exists')) throw e;
    console.log(`[github] Repo already exists, pushing to it.`);
  }

  // Write meta.json into the app dir
  const metaJson: Record<string, string> = {
    title,
    slug,
    description,
    url,
    date,
    builtBy: 'BuiltByCrew',
    builtByUrl: 'https://builtbycrew.online',
  };
  if (meta.category) metaJson.category = meta.category;
  if (meta.screenshot_url) metaJson.screenshot_url = meta.screenshot_url;
  fs.writeFileSync(path.join(appDir, 'meta.json'), JSON.stringify(metaJson, null, 2));

  // Write README
  const repoUrl = `https://github.com/${GITHUB_ORG}/${repoName}`;
  const readme = buildReadme({ title, slug, description, url, date, repoUrl });
  fs.writeFileSync(path.join(appDir, 'README.md'), readme);

  // Init git repo in the app dir and push
  const remote = `https://github.com/${GITHUB_ORG}/${repoName}.git`;

  // Remove existing .git if present (idempotent)
  const gitDir = path.join(appDir, '.git');
  if (fs.existsSync(gitDir)) fs.rmSync(gitDir, { recursive: true, force: true });

  run('git init', { cwd: appDir });
  run('git add .', { cwd: appDir });
  run(`git commit -m "feat: initial build — ${title}"`, { cwd: appDir });
  run('git branch -M main', { cwd: appDir });
  run(`git remote add origin ${remote}`, { cwd: appDir });
  run('git push -u origin main --force', { cwd: appDir });

  console.log(`[github] Pushed to ${repoUrl}`);
  return repoUrl;
}

// Run as standalone script: ts-node scripts/create-github-repo.ts <slug>
if (require.main === module) {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: ts-node scripts/create-github-repo.ts <slug>');
    process.exit(1);
  }

  const runsPath = path.resolve('data', 'runs.json');
  const store = JSON.parse(fs.readFileSync(runsPath, 'utf-8'));
  const run_ = store.runs.find((r: any) => r.shortName === slug);
  if (!run_) {
    console.error(`No run found for slug: ${slug}`);
    process.exit(1);
  }

  createGithubRepo({
    slug: run_.shortName,
    title: run_.idea,
    description: run_.description,
    url: run_.url,
    date: run_.date,
    category: run_.category,
    screenshot_url: run_.screenshot_url,
  }).catch(err => {
    console.error('[github] Fatal:', err.message ?? err);
    process.exit(1);
  });
}
