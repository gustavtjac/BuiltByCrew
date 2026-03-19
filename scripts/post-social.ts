import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface MarketingContent {
  description: string;
  day0Tweet: string;
  day3Tweet: string;
  day7Tweet: string;
  redditTitle: string;
  redditBody: string;
  redditSubreddits: string[];
  linkedinPost: string;
}

interface ScheduledPost {
  platform: 'twitter';
  day: number;
  text: string;
  postAt: string; // YYYY-MM-DD
  posted: boolean;
}

// --- Reddit ---

async function getRedditToken(): Promise<string> {
  const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD } = process.env;
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USERNAME || !REDDIT_PASSWORD) {
    throw new Error('Missing Reddit credentials (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD)');
  }
  const res = await axios.post(
    'https://www.reddit.com/api/v1/access_token',
    `grant_type=password&username=${encodeURIComponent(REDDIT_USERNAME)}&password=${encodeURIComponent(REDDIT_PASSWORD)}`,
    {
      auth: { username: REDDIT_CLIENT_ID, password: REDDIT_CLIENT_SECRET },
      headers: {
        'User-Agent': 'BuiltByCrew/1.0',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
  return res.data.access_token;
}

async function postToReddit(token: string, subreddit: string, title: string, body: string): Promise<string> {
  const res = await axios.post(
    'https://oauth.reddit.com/api/submit',
    `kind=self&sr=${encodeURIComponent(subreddit)}&title=${encodeURIComponent(title)}&text=${encodeURIComponent(body)}&nsfw=false&spoiler=false&resubmit=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'BuiltByCrew/1.0',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
  const url: string = res.data?.json?.data?.url ?? `https://reddit.com/r/${subreddit}`;
  console.log(`[reddit] Posted to r/${subreddit}: ${url}`);
  return url;
}

// --- LinkedIn ---

async function postToLinkedIn(text: string): Promise<string> {
  const { LINKEDIN_ACCESS_TOKEN, LINKEDIN_AUTHOR_URN } = process.env;
  if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_AUTHOR_URN) {
    throw new Error('Missing LinkedIn credentials (LINKEDIN_ACCESS_TOKEN, LINKEDIN_AUTHOR_URN)');
  }
  const res = await axios.post(
    'https://api.linkedin.com/v2/ugcPosts',
    {
      author: LINKEDIN_AUTHOR_URN,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    },
    {
      headers: {
        Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    },
  );
  const postUrn: string = res.headers['x-restli-id'] ?? '';
  const url = postUrn ? `https://www.linkedin.com/feed/update/${postUrn}` : 'https://www.linkedin.com/feed/';
  console.log(`[linkedin] Posted: ${url}`);
  return url;
}

// --- Twitter via Make.com webhook ---

async function postToTwitter(text: string): Promise<void> {
  const { MAKE_WEBHOOK_URL } = process.env;
  if (!MAKE_WEBHOOK_URL) {
    console.warn('[twitter] MAKE_WEBHOOK_URL not set — skipping');
    return;
  }
  await axios.post(MAKE_WEBHOOK_URL, { text });
  console.log('[twitter] Tweet sent via Make.com webhook');
}

// --- Scheduled post checker (runs at start of every pipeline run) ---

export async function postDueScheduled(): Promise<void> {
  const runsPath = path.resolve('data', 'runs.json');
  if (!fs.existsSync(runsPath)) return;

  const store = JSON.parse(fs.readFileSync(runsPath, 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;

  for (const run of store.runs ?? []) {
    for (const post of run.scheduledPosts ?? []) {
      if (!post.posted && post.postAt <= today) {
        try {
          await postToTwitter(post.text);
          post.posted = true;
          changed = true;
          console.log(`[scheduled] Posted day ${post.day} tweet for ${run.shortName}`);
        } catch (err: any) {
          console.error(`[scheduled] Failed for ${run.shortName} day ${post.day}:`, err.message);
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(runsPath, JSON.stringify(store, null, 2));
    console.log('[scheduled] runs.json updated');
  }
}

// --- Main export ---

export async function postSocial(
  slug: string,
  content: MarketingContent,
  runDate: string,
): Promise<{
  redditUrls: string[];
  linkedinUrl: string | null;
  twitterPosted: boolean;
  scheduledPosts: ScheduledPost[];
}> {
  const results = {
    redditUrls: [] as string[],
    linkedinUrl: null as string | null,
    twitterPosted: false,
    scheduledPosts: [] as ScheduledPost[],
  };

  // Reddit
  try {
    const token = await getRedditToken();
    for (const subreddit of content.redditSubreddits) {
      const url = await postToReddit(token, subreddit, content.redditTitle, content.redditBody);
      results.redditUrls.push(url);
    }
  } catch (err: any) {
    console.error('[reddit] Failed:', err.message);
  }

  // LinkedIn
  try {
    results.linkedinUrl = await postToLinkedIn(content.linkedinPost);
  } catch (err: any) {
    console.error('[linkedin] Failed:', err.message);
  }

  // Twitter — day 0 immediately via Make.com
  try {
    await postToTwitter(content.day0Tweet);
    results.twitterPosted = true;
  } catch (err: any) {
    console.error('[twitter] Failed day 0 tweet:', err.message);
  }

  // Twitter — day 3 and day 7 stored for scheduled posting
  const base = new Date(runDate);
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r.toISOString().slice(0, 10);
  };

  results.scheduledPosts = [
    { platform: 'twitter', day: 3, text: content.day3Tweet, postAt: addDays(base, 3), posted: false },
    { platform: 'twitter', day: 7, text: content.day7Tweet, postAt: addDays(base, 7), posted: false },
  ];

  return results;
}

// --- Standalone entry point ---
// Usage:
//   ts-node scripts/post-social.ts          — runs scheduled check only
//   ts-node scripts/post-social.ts <slug>   — runs scheduled check + posts for <slug>

if (require.main === module) {
  postDueScheduled()
    .then(async () => {
      const slug = process.argv[2];
      if (!slug) {
        console.log('[social] Scheduled check complete. Pass a slug to post for a specific run.');
        return;
      }

      const runsPath = path.resolve('data', 'runs.json');
      const store = JSON.parse(fs.readFileSync(runsPath, 'utf-8'));
      const run = store.runs?.find((r: any) => r.shortName === slug);
      if (!run) {
        console.error(`No run found for slug: ${slug}`);
        process.exit(1);
      }
      if (!run.marketingContent) {
        console.error('No marketingContent on run — was the marketing agent run?');
        process.exit(1);
      }

      const socialResults = await postSocial(slug, run.marketingContent, run.date);

      run.social = socialResults;
      run.tweets_posted = socialResults.twitterPosted;
      run.scheduledPosts = socialResults.scheduledPosts;
      fs.writeFileSync(runsPath, JSON.stringify(store, null, 2));

      console.log('[social] Done:', JSON.stringify(socialResults, null, 2));
    })
    .catch((err: any) => {
      console.error('[social] Fatal:', err.message ?? err);
      process.exit(1);
    });
}
