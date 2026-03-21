import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface AppEntry {
  title: string;
  url: string;
  date: string;
  description?: string;
  screenshot_url?: string;
  category?: string;
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

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateRss(apps: AppEntry[], domain: string): string {
  const items = apps.map(a => `
  <item>
    <title>${escapeXml(a.title)}</title>
    <link>${escapeXml(a.url)}</link>
    <guid isPermaLink="true">${escapeXml(a.url)}</guid>
    <description>${escapeXml(a.description ?? '')}</description>
    <pubDate>${new Date(a.date).toUTCString()}</pubDate>
    ${a.screenshot_url ? `<enclosure url="${escapeXml(a.screenshot_url)}" type="image/png" length="0"/>` : ''}
  </item>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>BuiltByCrew — A new app every day</title>
    <link>https://www.${domain}</link>
    <description>Six AI agents. One new web app every day. Games, tools, and utilities — built autonomously and shipped live.</description>
    <language>en-us</language>
    <atom:link href="https://www.${domain}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
}

function generateSitemap(apps: AppEntry[], domain: string): string {
  const staticUrls = [
    `https://www.${domain}/`,
    `https://www.${domain}/apps`,
  ];
  const appUrls = apps.map(a => a.url);
  const allUrls = [...staticUrls, ...appUrls];

  const urlEntries = allUrls.map(url => `
  <url>
    <loc>${escapeXml(url)}</loc>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlEntries}
</urlset>`;
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

  // Branded OG image — stable PNG generated from og-image.html (re-run if og-image.html changes)
  const OG_IMAGE_URL = 'https://iad.microlink.io/Q216ISaI2WCAbnO4w0KLPmLkVHGqXqp-qeidpE6-xzvHLE11pcIvUyFsJLGOIb_Spwlji6vTuUdEehq71XvebQ.png';
  html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${OG_IMAGE_URL}">`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${OG_IMAGE_URL}">`);


  // Inject apps data into apps page HTML
  const appsPagePath = path.resolve('landing', 'apps.html');
  let appsHtml = fs.readFileSync(appsPagePath, 'utf-8');
  appsHtml = appsHtml.replace(
    /window\.__APPS__\s*=\s*\[.*?\];/s,
    `window.__APPS__=${JSON.stringify(apps)};`
  );

  // Generate RSS feed
  const rss = generateRss(apps, domain);

  // Generate sitemap
  const sitemap = generateSitemap(apps, domain);

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
        {
          file: 'apps/index.html',
          data: Buffer.from(appsHtml).toString('base64'),
          encoding: 'base64',
        },
        {
          file: 'og-image.html',
          data: Buffer.from(fs.readFileSync(path.resolve('landing', 'og-image.html'))).toString('base64'),
          encoding: 'base64',
        },
        {
          file: 'rss.xml',
          data: Buffer.from(rss).toString('base64'),
          encoding: 'base64',
        },
        {
          file: 'sitemap.xml',
          data: Buffer.from(sitemap).toString('base64'),
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

const GITHUB_ORG = 'BuiltByCrew';

/**
 * Fetch all app entries from the BuiltByCrew GitHub org by reading each repo's
 * meta.json. This is the persistent source of truth — it works regardless of
 * whether data/runs.json exists or is complete.
 */
async function fetchAppsFromGithub(): Promise<AppEntry[]> {
  const apps: AppEntry[] = [];

  try {
    // List all repos in the org (up to 100; paginate if needed)
    const { data: repos } = await axios.get(
      `https://api.github.com/orgs/${GITHUB_ORG}/repos?type=public&per_page=100&sort=created&direction=desc`,
      { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } }
    );

    for (const repo of repos) {
      try {
        const { data: meta } = await axios.get(
          `https://raw.githubusercontent.com/${GITHUB_ORG}/${repo.name}/main/meta.json`
        );
        if (meta.url && meta.title) {
          apps.push({
            title: meta.title,
            url: meta.url,
            date: meta.date ?? repo.created_at ?? '',
            description: meta.description ?? '',
            screenshot_url: meta.screenshot_url ?? '',
            category: meta.category ?? 'other',
          });
        }
      } catch {
        // Repo has no meta.json (e.g. the main BuiltByCrew repo itself) — skip it
      }
    }
  } catch (err: any) {
    console.warn('[deploy-landing] Could not fetch apps from GitHub:', err.message ?? err);
  }

  return apps;
}

// Run as standalone script
if (require.main === module) {
  (async () => {
    // Primary source: GitHub org repos (persistent across all runs and clones)
    console.log(`[deploy-landing] Fetching apps from GitHub org ${GITHUB_ORG}...`);
    const githubApps = await fetchAppsFromGithub();
    console.log(`[deploy-landing] Found ${githubApps.length} apps on GitHub`);

    // Read local apps/*/meta.json — these have the most accurate category data
    const localMetaByUrl = new Map<string, AppEntry>();
    const appsDir = path.resolve('apps');
    if (fs.existsSync(appsDir)) {
      for (const slug of fs.readdirSync(appsDir)) {
        const metaPath = path.join(appsDir, slug, 'meta.json');
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            if (meta.url) localMetaByUrl.set(meta.url, meta);
          } catch {}
        }
      }
    }
    console.log(`[deploy-landing] Found ${localMetaByUrl.size} apps in local apps/ directory`);

    // Patch GitHub apps with local category if GitHub has 'other' but local has a real category
    for (const app of githubApps) {
      const local = localMetaByUrl.get(app.url);
      if (local?.category && local.category !== 'other') {
        app.category = local.category;
      }
      if (local?.screenshot_url && !app.screenshot_url) {
        app.screenshot_url = local.screenshot_url;
      }
    }

    // Supplement with local runs.json — catches apps whose repo push may have failed
    const runsPath = path.resolve('data', 'runs.json');
    const localApps: AppEntry[] = [];
    if (fs.existsSync(runsPath)) {
      const store = JSON.parse(fs.readFileSync(runsPath, 'utf-8'));
      (store.runs ?? [])
        .filter((r: any) => r.status === 'success' && r.url)
        .forEach((r: any) => {
          const local = localMetaByUrl.get(r.url);
          localApps.push({ title: r.idea, url: r.url, date: r.date, description: r.description ?? '', screenshot_url: r.screenshot_url ?? local?.screenshot_url ?? '', category: local?.category ?? r.category ?? 'other' });
        });
    }

    // Merge: GitHub is authoritative; local fills in anything missing (dedup by url)
    const seen = new Set(githubApps.map(a => a.url));
    for (const app of localApps) {
      if (!seen.has(app.url)) {
        githubApps.push(app);
        seen.add(app.url);
      }
    }

    // Sort newest first by date
    githubApps.sort((a, b) => b.date.localeCompare(a.date));

    console.log(`[deploy-landing] Deploying with ${githubApps.length} total apps...`);
    await deployLanding(githubApps);
  })().catch(err => {
    console.error('[deploy-landing] Fatal:', err.message ?? err);
    process.exit(1);
  });
}
