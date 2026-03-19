# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# BuiltByCrew — CLAUDE.md

## What this project does

This project is an autonomous webapp factory. When triggered (via webhook or manually), Claude Code orchestrates the full pipeline using subagents — one per phase. No separate Anthropic API calls are made; all AI reasoning happens inside Claude Code itself.

When triggered, the pipeline must:
1. Come up with an idea for a small, useful single-page webapp
2. Evaluate whether the idea is worth building
3. Build the webapp as a self-contained HTML file
4. Verify the result is functional and complete
5. Deploy it live under a subdomain of `builtbycrew.online`
6. Create a public GitHub repo for the app under the `BuiltByCrew` org
7. Announce the launch on Twitter/X (via Make.com), Reddit, and LinkedIn

---

## Always do first
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.


## How to run the pipeline

When the user says **"run the pipeline"** (or the webhook triggers it), Claude Code executes the following sequence using the `Agent` tool — one subagent per phase:

```
Agent (ideation)    → reads skills/IDEATION.md, generates idea + shortName
Agent (validation)  → reads skills/VALIDATION.md, approves or rejects with reason
Agent (dev)         → reads skills/FRONTEND.md + skills/CODING.md, builds the HTML
Agent (QA)          → reads skills/QA.md, reviews the HTML, approves or lists issues
Bash                → deploys HTML to Vercel, assigns subdomain
Bash                → creates public GitHub repo under BuiltByCrew org, pushes index.html + meta.json + README
Bash                → runs `npm run post:scheduled` to post any due day-3/day-7 tweets from prior runs
Agent (marketing)   → reads skills/MARKETING.md, writes tweets + Reddit post + LinkedIn post
Bash                → runs `npm run post:social <slug>` to post to all platforms, writes result to data/runs.json
Bash                → runs `npm run deploy:landing` to redeploy the landing page with the updated app list
```

Each subagent receives structured input (prior outputs, skill content, run context) and returns structured output. The orchestrator (Claude Code) passes outputs forward and handles feedback loops.

---

## Agents

**Idea agent** (subagent)
Generates a fresh webapp idea. Must never repeat an idea already in `data/runs.json`. Targets practical, niche utility tools simple enough to build in one HTML file. Also generates a `shortName` — a creative 1–2 word slug like `commitfmt`, `budgetsplit`, or `keymap` — used as the subdomain.

Must read and apply `skills/IDEATION.md` before generating.

**Validation agent** (subagent)
Decides whether the idea is worth building. Considers uniqueness, usefulness, and buildability. If it rejects, it must explain why so the idea agent can retry with that feedback.

Must read and apply `skills/VALIDATION.md` before validating.

**Dev agent** (subagent)
Builds the webapp. Output must be a complete, working, self-contained HTML file — no placeholders, no broken features, no external dependencies. Must include a slot for ads. If QA returns issues, it fixes exactly those issues.

Must read and apply `frontend-design`skill `skills/FRONTEND.md` and `skills/CODING.md` before building.

**QA agent** (subagent)
Reviews the built HTML against the original idea. Checks that all described features work, the app is usable on mobile, and there is no placeholder content. If anything is wrong it lists the exact issues.

Must read and apply `skills/QA.md` before reviewing.

**Ops** (Bash — no subagent needed)
Deploys the HTML file to Vercel via REST API and assigns a subdomain `<shortName>.builtbycrew.online`. Confirms the URL is live before continuing. Uses `scripts/deploy-app.ts` or direct Vercel API calls.

Then creates a public GitHub repo under the `BuiltByCrew` org named after the slug. Pushes `index.html`, `meta.json`, and a generated `README.md` to the repo. Uses `scripts/create-github-repo.ts` (callable via `npm run deploy:github <slug>`). The `gh` CLI is used for repo creation and must be authenticated.

**Marketing agent** (subagent)
Writes content for three platforms:
- **Twitter/X**: Three tweets (day 0 launch, day 3 use-case, day 7 engagement) — each ≤280 chars including URL
- **Reddit**: A self-post title + body for 1–2 relevant subreddits
- **LinkedIn**: A professional post (150–400 chars)
- **description**: A 1–2 sentence tagline for the runs.json card

Output must be valid JSON matching the schema in `skills/MARKETING.md`. The marketing content is stored on the run as `marketingContent` and passed to `npm run post:social <slug>`.

Must read and apply `skills/MARKETING.md` before writing.

---

## Feedback loops

- If the validation agent rejects an idea, the idea agent retries with the rejection reason. After `MAX_IDEA_RETRIES` (default 3) failed attempts, the run is abandoned and logged as `failed`.
- If QA rejects the build, the dev agent retries with the list of issues. After `MAX_QA_RETRIES` (default 3) failed attempts, the run is abandoned and logged as `failed`.

---

## Subdomain naming

Each app gets a creative short subdomain — not a slugified title. The idea agent is responsible for generating it as `shortName`. It should be memorable, relevant, and ideally one compound word or two short words joined (e.g. `splitwise`, `commitfmt`, `keymap`, `budgetly`). Max 20 characters.

---

## Data

Every run must be persisted to `data/runs.json` with:
- `id` — unique run identifier
- `date` — ISO timestamp
- `idea` — the idea title
- `description` — 1–2 sentence tagline written by the marketing agent, shown on the landing page card
- `shortName` — the subdomain slug
- `status` — `success | failed | skipped`
- `url` — live URL if deployed
- `github_repo_url` — GitHub repo URL (e.g. `https://github.com/BuiltByCrew/<slug>`)
- `marketingContent` — full JSON output from the marketing agent (stored for use by post:social)
- `tweets_posted` — boolean (true if day 0 tweet posted via Make.com)
- `social` — object with `redditUrls`, `linkedinUrl`, `twitterPosted` from the posting run
- `scheduledPosts` — array of `{ platform, day, text, postAt, posted }` for day 3/7 tweets

---

## Scheduling

The pipeline is triggered via a webhook on the home server. A daily cron hits the webhook endpoint once per day. It can also be triggered manually by telling Claude Code to "run the pipeline".

No `node-cron` or scheduler process needed — the server cron calls the webhook, the webhook calls `claude -p "run the pipeline"` via the Claude Code CLI.

---

## Environment

All secrets come from environment variables or `.env` — never hardcoded.

Required:
- `VERCEL_TOKEN`
- `VERCEL_SCOPE` (team or personal scope)
- `CUSTOM_DOMAIN` (e.g. `builtbycrew.online`)
- `MAKE_WEBHOOK_URL` (Make.com webhook — triggers Twitter/X post, no direct API key needed)
- `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USERNAME`, `REDDIT_PASSWORD`
- `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN`
- `MAX_IDEA_RETRIES` (default 3)
- `MAX_QA_RETRIES` (default 3)
- `TOPIC_PREFERENCES` (optional)

GitHub repo creation uses the `gh` CLI (must be authenticated via `gh auth login`). No extra env var needed — the org is hardcoded as `BuiltByCrew` in `scripts/create-github-repo.ts`.

`ANTHROPIC_API_KEY` is not needed — all AI reasoning runs inside Claude Code.

---

## File structure

```
skills/          # Skill prompt files loaded by subagents
apps/<slug>/     # index.html + meta.json per built app
data/runs.json   # Run log and state
landing/         # Landing page source
scripts/         # deploy-landing.ts, deploy-app.ts
```

---

## Landing page

After every successful app deployment, the landing page at `www.builtbycrew.online` must be redeployed to reflect the new app. Run:

```
npm run deploy:landing
```

This reads `data/runs.json`, injects all successful apps into the homepage, and redeploys to Vercel. Never skip this step — the landing page must always be in sync with the latest builds.

---

## Constraints

- No app idea should ever be repeated
- Every deployed app must be publicly accessible (no Vercel auth wall) before the marketing agent runs
- The pipeline must recover from a failed agent without taking down the whole run
- All runs, decisions, and outcomes must be logged
