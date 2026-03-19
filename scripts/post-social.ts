import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface MarketingContent {
  description: string;
  redditTitle: string;
  redditBody: string;
  redditSubreddits: string[];
  linkedinPost: string;
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

// --- Main export ---

export async function postSocial(
  slug: string,
  content: MarketingContent,
): Promise<{
  redditUrls: string[];
  linkedinUrl: string | null;
}> {
  const results = {
    redditUrls: [] as string[],
    linkedinUrl: null as string | null,
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

  return results;
}

// --- Standalone entry point ---
// Usage: ts-node scripts/post-social.ts <slug>

if (require.main === module) {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: ts-node scripts/post-social.ts <slug>');
    process.exit(1);
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

  postSocial(slug, run.marketingContent)
    .then(socialResults => {
      run.social = socialResults;
      fs.writeFileSync(runsPath, JSON.stringify(store, null, 2));
      console.log('[social] Done:', JSON.stringify(socialResults, null, 2));
    })
    .catch((err: any) => {
      console.error('[social] Fatal:', err.message ?? err);
      process.exit(1);
    });
}
