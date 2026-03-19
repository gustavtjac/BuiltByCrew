import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface LinkedInContent {
  title: string;
  description: string;
  post: string;
}

// Free screenshot service — no API key needed
function getScreenshotUrl(appUrl: string): string {
  return `https://api.microlink.io/?url=${encodeURIComponent(appUrl)}&screenshot=true&meta=false&embed=screenshot.url`;
}

export async function postToLinkedIn(content: LinkedInContent, appUrl: string): Promise<void> {
  const { ZAPIER_LINKEDIN_WEBHOOK } = process.env;
  if (!ZAPIER_LINKEDIN_WEBHOOK) {
    throw new Error('Missing ZAPIER_LINKEDIN_WEBHOOK in .env');
  }

  await axios.post(ZAPIER_LINKEDIN_WEBHOOK, {
    post:        content.post,
    title:       content.title,
    description: content.description,
    media_url:   getScreenshotUrl(appUrl),
  });

  console.log('[linkedin] Posted via Zapier webhook');
}

// Standalone: ts-node scripts/post-linkedin.ts <slug>
if (require.main === module) {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: ts-node scripts/post-linkedin.ts <slug>');
    process.exit(1);
  }

  const runsPath = path.resolve('data', 'runs.json');
  const store = JSON.parse(fs.readFileSync(runsPath, 'utf-8'));
  const run = store.runs?.find((r: any) => r.shortName === slug);
  if (!run) {
    console.error(`No run found for slug: ${slug}`);
    process.exit(1);
  }
  if (!run.linkedinContent) {
    console.error('No linkedinContent on run — was the LinkedIn agent run?');
    process.exit(1);
  }

  postToLinkedIn(run.linkedinContent, run.url)
    .then(() => {
      run.linkedin_posted = true;
      fs.writeFileSync(runsPath, JSON.stringify(store, null, 2));
      console.log('[linkedin] Done');
    })
    .catch((err: any) => {
      console.error('[linkedin] Fatal:', err.message ?? err);
      process.exit(1);
    });
}
