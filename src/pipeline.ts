import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';

import { PipelineConfig, RunRecord, RunsStore, IdeaAgentOutput } from './types';
import { runIdeaAgent } from './agents/ideaAgent';
import { runValidationAgent } from './agents/validationAgent';
import { runDevAgent } from './agents/devAgent';
import { runQAAgent } from './agents/qaAgent';
import { runOpsAgent } from './agents/opsAgent';
import { runMarketingAgent } from './agents/marketingAgent';
import { deployLanding } from '../scripts/deploy-landing';

const RUNS_PATH = path.resolve('data', 'runs.json');
const APPS_DIR = path.resolve('apps');

// ── Config ────────────────────────────────────────────────────────────────────

function loadConfig(): PipelineConfig {
  const required = [
    'ANTHROPIC_API_KEY',
    'VERCEL_TOKEN',
    'CUSTOM_DOMAIN',
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_SECRET',
  ] as const;

  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  }

  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    vercelToken: process.env.VERCEL_TOKEN!,
    vercelScope: process.env.VERCEL_SCOPE ?? process.env.VERCEL_TEAM_ID ?? '',
    vercelTeamId: process.env.VERCEL_TEAM_ID ?? '',
    customDomain: process.env.CUSTOM_DOMAIN!,
    twitterApiKey: process.env.TWITTER_API_KEY!,
    twitterApiSecret: process.env.TWITTER_API_SECRET!,
    twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN!,
    twitterAccessSecret: process.env.TWITTER_ACCESS_SECRET!,
    maxIdeaRetries: parseInt(process.env.MAX_IDEA_RETRIES ?? '3', 10),
    maxQaRetries: parseInt(process.env.MAX_QA_RETRIES ?? '3', 10),
    topicPreferences: (process.env.TOPIC_PREFERENCES ?? '').split(',').filter(Boolean),
  };
}

// ── Persistence ───────────────────────────────────────────────────────────────

function loadRuns(): RunsStore {
  if (!fs.existsSync(RUNS_PATH)) return { runs: [] };
  return JSON.parse(fs.readFileSync(RUNS_PATH, 'utf-8')) as RunsStore;
}

function saveRuns(store: RunsStore): void {
  fs.mkdirSync(path.dirname(RUNS_PATH), { recursive: true });
  fs.writeFileSync(RUNS_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

function saveApp(slug: string, htmlContent: string, meta: object): void {
  const dir = path.join(APPS_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), htmlContent, 'utf-8');
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
}

function updateRecord(store: RunsStore, record: RunRecord): void {
  const idx = store.runs.findIndex(r => r.id === record.id);
  if (idx !== -1) store.runs[idx] = record;
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runPipeline(): Promise<void> {
  console.log(`[pipeline] Starting run at ${new Date().toISOString()}`);
  const config = loadConfig();
  const store = loadRuns();
  const previousIdeas = store.runs.map(r => r.idea).filter(Boolean);

  const runId = uuidv4();
  const runDate = new Date().toISOString();

  // Write partial record immediately so a crash still leaves a trace
  const record: RunRecord = {
    id: runId,
    date: runDate,
    idea: '',
    ideaDescription: '',
    slug: '',
    status: 'failed',
    url: null,
    tweetsPosted: { day0: false, day3: false, day7: false },
  };
  store.runs.push(record);
  saveRuns(store);

  try {
    // ── Phase 1: Ideation + Validation loop ───────────────────────────────────
    let idea: IdeaAgentOutput | null = null;
    let rejectionReason: string | undefined;

    for (let attempt = 0; attempt < config.maxIdeaRetries; attempt++) {
      console.log(`[pipeline] Idea attempt ${attempt + 1}/${config.maxIdeaRetries}`);
      const ideaOut = await runIdeaAgent(
        { previousIdeas, rejectionReason, topicPreferences: config.topicPreferences },
        config
      );
      console.log(`[pipeline] Idea: "${ideaOut.title}"`);

      const validation = await runValidationAgent({ idea: ideaOut, previousIdeas }, config);
      console.log(`[pipeline] Validation: ${validation.approved ? 'APPROVED' : 'REJECTED'} — ${validation.reason}`);

      if (validation.approved) {
        idea = ideaOut;
        break;
      }
      rejectionReason = validation.reason;
    }

    if (!idea) {
      record.status = 'skipped';
      record.failureReason = `All ${config.maxIdeaRetries} idea attempts rejected by validation`;
      updateRecord(store, record);
      saveRuns(store);
      console.log(`[pipeline] Skipped: no approved idea after ${config.maxIdeaRetries} attempts`);
      return;
    }

    record.idea = idea.title;
    record.ideaDescription = idea.description;
    const fullSlug = slugify(idea.slug, { lower: true, strict: true });
    record.slug = fullSlug.split('-').slice(0, 2).join('-');
    updateRecord(store, record);
    saveRuns(store);

    // ── Phase 2: Dev + QA loop ────────────────────────────────────────────────
    let htmlContent: string | null = null;
    let qaIssues: string[] | undefined;

    for (let attempt = 0; attempt < config.maxQaRetries; attempt++) {
      console.log(`[pipeline] Dev attempt ${attempt + 1}/${config.maxQaRetries}`);
      const devOut = await runDevAgent({ idea, qaIssues }, config);

      console.log(`[pipeline] QA reviewing...`);
      const qaOut = await runQAAgent({ idea, htmlContent: devOut.htmlContent }, config);
      console.log(`[pipeline] QA: ${qaOut.approved ? 'APPROVED' : 'REJECTED'}${qaOut.issues.length ? ' — ' + qaOut.issues.join('; ') : ''}`);

      if (qaOut.approved) {
        htmlContent = devOut.htmlContent;
        break;
      }
      qaIssues = qaOut.issues;
    }

    if (!htmlContent) {
      record.status = 'failed';
      record.failureReason = `Build failed QA after ${config.maxQaRetries} attempts. Last issues: ${qaIssues?.join('; ')}`;
      updateRecord(store, record);
      saveRuns(store);
      console.log(`[pipeline] Failed: QA never approved the build`);
      return;
    }

    // Save app files locally before deploying
    saveApp(record.slug, htmlContent, {
      idea: idea.title,
      description: idea.description,
      created_at: runDate,
    });

    // ── Phase 3: Deployment ───────────────────────────────────────────────────
    console.log(`[pipeline] Deploying...`);
    const opsOut = await runOpsAgent(
      { slug: record.slug, htmlContent, customDomain: config.customDomain },
      config
    );
    console.log(`[pipeline] Live at: ${opsOut.liveUrl}`);

    record.url = opsOut.liveUrl;

    // Update meta.json with live URL
    const metaPath = path.join(APPS_DIR, record.slug, 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    meta.url = opsOut.liveUrl;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    updateRecord(store, record);
    saveRuns(store);

    // ── Phase 4: Marketing ────────────────────────────────────────────────────
    console.log(`[pipeline] Writing and posting tweets...`);
    const marketingOut = await runMarketingAgent({ idea, liveUrl: opsOut.liveUrl }, config);

    meta.tweets = {
      day0: marketingOut.day0Tweet,
      day3: marketingOut.day3Tweet,
      day7: marketingOut.day7Tweet,
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    record.tweetsPosted.day0 = true;
    record.status = 'success';
    updateRecord(store, record);
    saveRuns(store);

    console.log(`[pipeline] Run complete. App: ${idea.title} — ${opsOut.liveUrl}`);

    // Redeploy landing page with updated apps list
    try {
      const successfulApps = store.runs
        .filter(r => r.status === 'success' && r.url)
        .map(r => ({ title: r.idea, url: r.url!, date: r.date.slice(0, 10) }));
      await deployLanding(successfulApps);
      console.log(`[pipeline] Landing page updated`);
    } catch (err: any) {
      console.warn(`[pipeline] Landing redeploy failed:`, err?.message ?? err);
    }
  } catch (err) {
    record.status = 'failed';
    record.failureReason = err instanceof Error ? err.message : String(err);
    updateRecord(store, record);
    saveRuns(store);
    console.error(`[pipeline] Unhandled error:`, err);
    throw err;
  }
}

// ── Follow-up tweet poster ────────────────────────────────────────────────────

export async function postFollowUpTweets(): Promise<void> {
  const config = loadConfig();
  const store = loadRuns();
  const now = new Date();

  const { TwitterApi } = await import('twitter-api-v2');
  const twitterClient = new TwitterApi({
    appKey: config.twitterApiKey,
    appSecret: config.twitterApiSecret,
    accessToken: config.twitterAccessToken,
    accessSecret: config.twitterAccessSecret,
  });

  let changed = false;

  for (const run of store.runs) {
    if (run.status !== 'success' || !run.url) continue;

    const runDate = new Date(run.date);
    const daysSince = Math.floor((now.getTime() - runDate.getTime()) / 86_400_000);
    const metaPath = path.join(APPS_DIR, run.slug, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    if (!meta.tweets) continue;

    if (daysSince >= 3 && !run.tweetsPosted.day3) {
      await twitterClient.v2.tweet(meta.tweets.day3);
      run.tweetsPosted.day3 = true;
      changed = true;
      console.log(`[marketing] Day-3 tweet posted for ${run.slug}`);
    }
    if (daysSince >= 7 && !run.tweetsPosted.day7) {
      await twitterClient.v2.tweet(meta.tweets.day7);
      run.tweetsPosted.day7 = true;
      changed = true;
      console.log(`[marketing] Day-7 tweet posted for ${run.slug}`);
    }
  }

  if (changed) saveRuns(store);
}
