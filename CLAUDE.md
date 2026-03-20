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
7. Write a description for the landing page card and announce the launch on LinkedIn

---

## Always do first
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.


## How to run the pipeline

When the user says **"run the pipeline"** (or the webhook triggers it), Claude Code executes the following sequence using the `Agent` tool — one subagent per phase:

```
Bash                → read data/runs.json to determine next run ID (max existing numeric ID + 1) and collect all existing shortNames for uniqueness check
Agent (ideation)    → reads skills/IDEATION.md, generates idea + shortName (must not match any existing shortName)
Agent (validation)  → reads skills/VALIDATION.md, approves or rejects with reason
Agent (dev)         → reads skills/FRONTEND.md + skills/CODING.md, builds the HTML
Agent (QA)          → reads skills/QA.md, reviews the HTML, approves or lists issues
Bash                → deploys HTML to Vercel, assigns subdomain
Bash                → captures screenshot via microlink API, stores URL as `screenshot_url` in runs.json and meta.json
Bash                → creates public GitHub repo under BuiltByCrew org, pushes index.html + meta.json + README
Agent (marketing)   → reads skills/MARKETING.md, writes landing page description
Bash                → compute current Copenhagen time and nearest slot offset (minutes), pass as context to linkedin agent
Agent (linkedin)    → reads skills/LINKEDIN.md, writes LinkedIn post text (with timing note if >20 min off), stored as `linkedinPost` on the run
Bash                → runs `npm run post:linkedin <slug>` to post to LinkedIn via Zapier webhook
```

Each subagent receives structured input (prior outputs, skill content, run context) and returns structured output. The orchestrator (Claude Code) passes outputs forward and handles feedback loops.

---

## Agents

**Idea agent** (subagent)
Generates a fresh webapp idea. Must never repeat an idea already in `data/runs.json`. Targets practical, niche utility tools simple enough to build in one HTML file. Also generates a `shortName` — a creative 1–2 word slug like `commitfmt`, `budgetsplit`, or `keymap` — used as the subdomain. Also assigns a `category` from: `tools`, `games`, `productivity`, `finance`, `creative`, `sandbox`, `puzzle`, `other`.

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

After confirming the deployment is ready, **poll the live subdomain URL until it returns HTTP 200 before screenshotting**. Use this exact loop — do not skip it:
```bash
for i in $(seq 1 24); do
  STATUS=$(curl -o /dev/null -s -w "%{http_code}" "https://<shortName>.builtbycrew.online")
  if [ "$STATUS" = "200" ]; then break; fi
  echo "Waiting for DNS... ($STATUS) attempt $i/24"
  sleep 10
done
```
This retries every 10 seconds for up to 4 minutes. Only proceed to screenshot once a 200 is confirmed.

Then capture the screenshot:
```
curl "https://api.microlink.io/?url=<appUrl>&screenshot=true&meta=false&force=true"
```
Extract `.data.screenshot.url` from the JSON response and store it as `screenshot_url` in both `data/runs.json` and `meta.json`. This URL is used as the app's thumbnail on the landing page and `/apps` page.

Then creates a public GitHub repo under the `BuiltByCrew` org named after the slug. Pushes `index.html`, `meta.json`, and a generated `README.md` to the repo. Uses `scripts/create-github-repo.ts` (callable via `npm run deploy:github <slug>`). The `gh` CLI is used for repo creation and must be authenticated.

**Marketing agent** (subagent)
Writes a 1–2 sentence description for the app's landing page card. Output is valid JSON with a single `description` field, stored in `data/runs.json`.

Must read and apply `skills/MARKETING.md` before writing.

**LinkedIn agent** (subagent)
Writes a formatted LinkedIn post for the BuiltByCrew company page. Output is valid JSON with `title`, `description`, and `post` fields, stored as `linkedinContent` on the run in `data/runs.json`. The post is sent via `npm run post:linkedin <slug>` which posts to LinkedIn through the Zapier webhook with a screenshot of the live app as the image.

Before calling this agent, the orchestrator must compute the current Copenhagen time and determine timing context to pass as input:
- Scheduled slots are **06:00** and **18:00** Copenhagen time
- Find the nearest slot and compute the offset in minutes (positive = late, negative = early)
- Pass `currentCopenhagenTime` (e.g. `"06:34"`) and `minutesOffSchedule` (e.g. `34`) to the agent
- The agent uses this to decide whether to include a timing acknowledgment in the post (only if |minutesOffSchedule| > 20)

Must read and apply `skills/LINKEDIN.md` before writing.

---

## Feedback loops

- If the validation agent rejects an idea, the idea agent retries with the rejection reason. After `MAX_IDEA_RETRIES` (default 3) failed attempts, the run is abandoned and logged as `failed`.
- If QA rejects the build, the dev agent retries with the list of issues. After `MAX_QA_RETRIES` (default 3) failed attempts, the run is abandoned and logged as `failed`.

---

## Subdomain naming

Each app gets a creative short subdomain — not a slugified title. The idea agent is responsible for generating it as `shortName`. It should be memorable, relevant, and ideally one compound word or two short words joined (e.g. `splitwise`, `commitfmt`, `keymap`, `budgetly`). Max 20 characters.

**Before accepting a shortName, the orchestrator must verify it does not already exist** in `data/runs.json` (check `shortName` field of all runs). If it collides, the idea agent must generate a new one.

---

## Data

`data/runs.json` is the pipeline log. `apps/<slug>/meta.json` is the public-facing data for each app. **Both must be kept in sync** — the same fields must appear in both. GitHub `meta.json` is the authoritative source for the landing page deploy.

Every run must be persisted to `data/runs.json` with:
- `id` — unique run identifier, auto-incremented from highest existing ID (e.g. if max is `run_003`, next is `run_004`)
- `date` — full ISO 8601 timestamp (e.g. `2026-03-19T18:00:00.000Z`). **Never truncate to a date-only string** — the time component determines morning vs evening slot on the landing page.
- `idea` — the idea title
- `description` — 1–2 sentence tagline written by the marketing agent, shown on the landing page card
- `shortName` — the subdomain slug
- `status` — `success | failed | skipped`
- `url` — live URL if deployed
- `github_repo_url` — GitHub repo URL (e.g. `https://github.com/BuiltByCrew/<slug>`)
- `screenshot_url` — microlink screenshot URL
- `category` — one of: `tools`, `games`, `productivity`, `finance`, `creative`, `sandbox`, `puzzle`, `other`. Assigned by the idea agent. Used for filtering on the `/apps` page.

`apps/<slug>/meta.json` must include all of: `title`, `slug`, `description`, `url`, `date` (full ISO timestamp), `category`, `screenshot_url`, `builtBy`, `builtByUrl`.

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

The landing page at `www.builtbycrew.online` is redeployed automatically by a server cron at **exactly 06:00 and 18:00 Copenhagen time** — not by the pipeline. This ensures new apps appear on the landing page at the public release times, even if the pipeline finishes early.

**Do NOT run `npm run deploy:landing` at the end of the pipeline.** The pipeline's job ends after posting to LinkedIn. The landing page deploy is handled separately.

To manually redeploy the landing page outside of the cron schedule:

```
npm run deploy:landing
```

---

## Constraints

- No app idea should ever be repeated
- Every deployed app must be publicly accessible (no Vercel auth wall) before the marketing agent runs
- The pipeline must recover from a failed agent without taking down the whole run
- All runs, decisions, and outcomes must be logged
