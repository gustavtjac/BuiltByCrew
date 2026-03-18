import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { QAAgentInput, QAAgentOutput, PipelineConfig } from '../types';

function loadSkill(name: string): string {
  return fs.readFileSync(path.resolve('skills', name), 'utf-8');
}

export async function runQAAgent(
  input: QAAgentInput,
  config: PipelineConfig
): Promise<QAAgentOutput> {
  const skill = loadSkill('QA.md');
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const userMessage = [
    `Original idea:\nTitle: ${input.idea.title}\nDescription: ${input.idea.description}`,
    ``,
    `Built HTML:`,
    `\`\`\`html`,
    input.htmlContent,
    `\`\`\``,
    ``,
    `Review against the checklist and respond with JSON.`,
  ].join('\n');

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: skill,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = (response.content[0] as { type: 'text'; text: string }).text.trim();
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed: QAAgentOutput;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`QA agent returned non-JSON: ${raw}`);
  }

  return parsed;
}
