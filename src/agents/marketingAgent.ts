import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { TwitterApi } from 'twitter-api-v2';
import { MarketingAgentInput, MarketingAgentOutput, PipelineConfig } from '../types';

function loadSkill(name: string): string {
  return fs.readFileSync(path.resolve('skills', name), 'utf-8');
}

export async function runMarketingAgent(
  input: MarketingAgentInput,
  config: PipelineConfig
): Promise<MarketingAgentOutput> {
  const skill = loadSkill('MARKETING.md');
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const userMessage = [
    `App title: ${input.idea.title}`,
    `Description: ${input.idea.description}`,
    `Live URL: ${input.liveUrl}`,
    ``,
    `Write three tweets following the skill guidelines.`,
  ].join('\n');

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: skill,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = (response.content[0] as { type: 'text'; text: string }).text.trim();
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed: MarketingAgentOutput;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Marketing agent returned non-JSON: ${raw}`);
  }

  // Truncate tweets that exceed 280 characters
  for (const key of Object.keys(parsed) as (keyof MarketingAgentOutput)[]) {
    if (parsed[key].length > 280) {
      parsed[key] = parsed[key].slice(0, 277) + '...';
    }
  }

  // Post the day-0 tweet immediately (non-fatal if Twitter API is unavailable)
  if (config.twitterApiKey && config.twitterApiSecret && config.twitterAccessToken && config.twitterAccessSecret) {
    try {
      const twitterClient = new TwitterApi({
        appKey: config.twitterApiKey,
        appSecret: config.twitterApiSecret,
        accessToken: config.twitterAccessToken,
        accessSecret: config.twitterAccessSecret,
      });
      await twitterClient.v2.tweet(parsed.day0Tweet);
      console.log(`[marketing] Day-0 tweet posted`);
    } catch (err: any) {
      console.warn(`[marketing] Tweet skipped: ${err?.message ?? err}`);
    }
  } else {
    console.log(`[marketing] Twitter credentials not set — skipping tweet`);
  }

  return parsed;
}
