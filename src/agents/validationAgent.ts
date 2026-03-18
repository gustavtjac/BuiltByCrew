import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { ValidationAgentInput, ValidationAgentOutput, PipelineConfig } from '../types';

function loadSkill(name: string): string {
  return fs.readFileSync(path.resolve('skills', name), 'utf-8');
}

export async function runValidationAgent(
  input: ValidationAgentInput,
  config: PipelineConfig
): Promise<ValidationAgentOutput> {
  const skill = loadSkill('VALIDATION.md');
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const userMessage = [
    `Previously built ideas:\n${input.previousIdeas.map(i => `- ${i}`).join('\n') || 'None yet.'}`,
    `\nIdea to evaluate:\nTitle: ${input.idea.title}\nDescription: ${input.idea.description}`,
    '\nEvaluate this idea and respond with JSON.',
  ].join('');

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 256,
    system: skill,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = (response.content[0] as { type: 'text'; text: string }).text.trim();

  let parsed: ValidationAgentOutput;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Validation agent returned non-JSON: ${text}`);
  }

  return parsed;
}
