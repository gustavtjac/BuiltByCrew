import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { IdeaAgentInput, IdeaAgentOutput, PipelineConfig } from '../types';

function loadSkill(name: string): string {
  return fs.readFileSync(path.resolve('skills', name), 'utf-8');
}

export async function runIdeaAgent(
  input: IdeaAgentInput,
  config: PipelineConfig
): Promise<IdeaAgentOutput> {
  const skill = loadSkill('IDEATION.md');
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const systemPrompt = `${skill}\n\nTopic preferences (optional, use as inspiration): ${input.topicPreferences.join(', ')}`;

  const userMessage = [
    `Previously built ideas (do NOT repeat these):\n${input.previousIdeas.map(i => `- ${i}`).join('\n') || 'None yet.'}`,
    input.rejectionReason
      ? `\nThe last idea was rejected for this reason: ${input.rejectionReason}\nGenerate a different idea that avoids this problem.`
      : '',
    '\nGenerate a new webapp idea now.',
  ].join('');

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = (response.content[0] as { type: 'text'; text: string }).text.trim();

  let parsed: IdeaAgentOutput;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Idea agent returned non-JSON: ${text}`);
  }

  if (!parsed.title || !parsed.description || !parsed.slug) {
    throw new Error(`Idea agent response missing required fields: ${text}`);
  }

  return parsed;
}
