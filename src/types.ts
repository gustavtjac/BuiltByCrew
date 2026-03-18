// ── Run state (persisted to data/runs.json) ──────────────────────────────────

export type RunStatus = 'success' | 'failed' | 'skipped';

export interface TweetsPosted {
  day0: boolean;
  day3: boolean;
  day7: boolean;
}

export interface RunRecord {
  id: string;               // uuid v4
  date: string;             // ISO date string
  idea: string;             // one-line idea title
  ideaDescription: string;  // full idea description used for dev
  slug: string;             // filesystem slug
  status: RunStatus;
  url: string | null;
  tweetsPosted: TweetsPosted;
  failureReason?: string;
}

export interface RunsStore {
  runs: RunRecord[];
}

// ── Idea agent ────────────────────────────────────────────────────────────────

export interface IdeaAgentInput {
  previousIdeas: string[];
  rejectionReason?: string;
  topicPreferences: string[];
}

export interface IdeaAgentOutput {
  title: string;
  description: string;
  slug: string;
}

// ── Validation agent ──────────────────────────────────────────────────────────

export interface ValidationAgentInput {
  idea: IdeaAgentOutput;
  previousIdeas: string[];
}

export interface ValidationAgentOutput {
  approved: boolean;
  reason: string;
}

// ── Dev agent ─────────────────────────────────────────────────────────────────

export interface DevAgentInput {
  idea: IdeaAgentOutput;
  qaIssues?: string[];
}

export interface DevAgentOutput {
  htmlContent: string;
}

// ── QA agent ──────────────────────────────────────────────────────────────────

export interface QAAgentInput {
  idea: IdeaAgentOutput;
  htmlContent: string;
}

export interface QAAgentOutput {
  approved: boolean;
  issues: string[];
}

// ── Ops agent ─────────────────────────────────────────────────────────────────

export interface OpsAgentInput {
  slug: string;
  htmlContent: string;
  customDomain: string;
}

export interface OpsAgentOutput {
  liveUrl: string;
}

// ── Marketing agent ───────────────────────────────────────────────────────────

export interface MarketingAgentInput {
  idea: IdeaAgentOutput;
  liveUrl: string;
}

export interface MarketingAgentOutput {
  day0Tweet: string;
  day3Tweet: string;
  day7Tweet: string;
}

// ── Pipeline config ───────────────────────────────────────────────────────────

export interface PipelineConfig {
  maxIdeaRetries: number;
  maxQaRetries: number;
  topicPreferences: string[];
  customDomain: string;
  vercelToken: string;
  vercelScope: string;
  vercelTeamId: string;
  anthropicApiKey: string;
  twitterApiKey: string;
  twitterApiSecret: string;
  twitterAccessToken: string;
  twitterAccessSecret: string;
}
