import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { DevAgentInput, DevAgentOutput, PipelineConfig } from '../types';

function loadSkill(name: string): string {
  return fs.readFileSync(path.resolve('skills', name), 'utf-8');
}

export async function runDevAgent(
  input: DevAgentInput,
  config: PipelineConfig
): Promise<DevAgentOutput> {
  const frontendSkill = loadSkill('FRONTEND.md');
  const codingSkill = loadSkill('CODING.md');
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const systemPrompt = [frontendSkill, '\n\n---\n\n', codingSkill].join('');

  const userLines = [
    `Build the following webapp as a single self-contained HTML file.`,
    ``,
    `Title: ${input.idea.title}`,
    `Description: ${input.idea.description}`,
    `Slug: ${input.idea.slug}`,
  ];

  if (input.qaIssues && input.qaIssues.length > 0) {
    userLines.push('');
    userLines.push('QA has rejected the previous version. Fix ALL of the following issues:');
    input.qaIssues.forEach(issue => userLines.push(`- ${issue}`));
  }

  userLines.push('');
  userLines.push('Return ONLY the raw HTML. The first character must be `<!DOCTYPE html>`. Do not wrap in markdown fences.');

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userLines.join('\n') }],
  });

  const htmlContent = (response.content[0] as { type: 'text'; text: string }).text.trim();

  if (!htmlContent.startsWith('<!DOCTYPE html>') && !htmlContent.startsWith('<!doctype html>')) {
    throw new Error('Dev agent did not return valid HTML (missing DOCTYPE)');
  }

  return { htmlContent };
}
