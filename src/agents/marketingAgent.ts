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

  const text = (response.content[0] as { type: 'text'; text: string }).text.trim();

  let parsed: MarketingAgentOutput;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Marketing agent returned non-JSON: ${text}`);
  }

  // Validate tweet lengths
  for (const [key, tweet] of Object.entries(parsed) as [keyof MarketingAgentOutput, string][]) {
    if (tweet.length > 280) {
      throw new Error(`${key} exceeds 280 characters (${tweet.length})`);
    }
  }

  // Post the day-0 tweet immediately
  const twitterClient = new TwitterApi({
    appKey: config.twitterApiKey,
    appSecret: config.twitterApiSecret,
    accessToken: config.twitterAccessToken,
    accessSecret: config.twitterAccessSecret,
  });

  await twitterClient.v2.tweet(parsed.day0Tweet);
  console.log(`[marketing] Day-0 tweet posted`);

  return parsed;
}
