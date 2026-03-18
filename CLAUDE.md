# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# app-factory — CLAUDE.md

## What this project does

This project is an autonomous webapp factory. It runs on a home server and operates on a schedule without human intervention.

When triggered, it must:
1. Come up with an idea for a small, useful single-page webapp
2. Evaluate whether the idea is worth building
3. Build the webapp as a self-contained file
4. Verify the result is functional and complete
5. Deploy it live under a custom domain
6. Announce the launch on Twitter and follow up over the next week

---

## Agents

The system is made up of six agents. Each agent has a single responsibility.

**Idea agent**
Generates a fresh webapp idea. It must never repeat an idea that has already been built. It should target practical, niche utility tools that are simple enough to build in one file.

Before generating an idea, the idea agent must always read and apply the IDEATION skill.

**Validation agent**
Decides whether the idea is worth building. It should consider uniqueness, usefulness, and buildability. If it rejects an idea, it must explain why so the idea agent can try again with that feedback.

Before validating, the validation agent must always read and apply the VALIDATION skill.

**Dev agent**
Builds the webapp. The output must be a complete, working, self-contained file — no placeholders, no broken features, no external dependencies. It should include a slot for ads. If QA sends it back with issues, it must fix those specific issues.

Before building any frontend, the dev agent must always read and apply the FRONTEND skill.
Before writing any logic or functional code, the dev agent must always read and apply the CODING skill.

**QA agent**
Reviews the built webapp against the original idea. It checks that all described features work, the app is usable on mobile, and there is no placeholder content. If anything is wrong it must list the exact issues so the dev agent can fix them.

Before reviewing, the QA agent must always read and apply the QA skill.

**Ops agent**
Deploys the webapp to Vercel and assigns it a subdomain under the project's custom domain. It must confirm the URL is live before passing it forward.

Before deploying, the ops agent must always read and apply the DEPLOYMENT skill.

**Marketing agent**
Writes three tweets about the app: a launch tweet for day 0, a use-case focused tweet for day 3, and an engagement tweet for day 7. Each must include the live URL and stay under 280 characters.

Before writing any tweets, the marketing agent must always read and apply the MARKETING skill.

---

## Feedback loops

- If the validation agent rejects an idea, the idea agent tries again with the rejection reason as context. After too many failed attempts, the run is abandoned and logged.
- If QA rejects the build, the dev agent tries again with the list of issues. After too many failed attempts, the run is abandoned and logged.

---

## Data

Every run must be persisted. The system must be able to answer:
- What apps have been built and where are they live?
- What is the status of every run (success, skipped, failed)?
- Have the follow-up tweets been posted?

---

## Scheduling

The pipeline runs automatically on a daily schedule. It should also be possible to trigger a single run manually.

---

## Environment

All secrets and configuration (API keys, domain, thresholds, topic preferences) must come from environment variables or a config file — never hardcoded.

---

## Constraints

- No app idea should ever be repeated
- Every deployed app must be live and accessible before the marketing agent runs
- The pipeline must be able to recover from a failed agent without taking down the whole system
- All runs, decisions, and outcomes must be logged

---

## Implementation architecture (to be built)

This is a greenfield project. When implementing, use the following conventions:

**Pipeline orchestrator** — a single entry point (`pipeline.ts` or `pipeline.py`) that runs the six agents in sequence, handles feedback loops, and persists run state.

**Skills** — read-only prompt files that agents load before acting. Store in `skills/` as markdown files: `IDEATION.md`, `VALIDATION.md`, `FRONTEND.md`, `CODING.md`, `QA.md`, `DEPLOYMENT.md`, `MARKETING.md`.

**Run log / state** — a JSON or SQLite store (e.g. `data/runs.json` or `data/runs.db`) tracking every run with fields: `id`, `date`, `idea`, `status` (`success|failed|skipped`), `url`, `tweets_posted`.

**Built apps** — output each generated app as a single `.html` file in `apps/<slug>/index.html` alongside a metadata file `apps/<slug>/meta.json` (idea, url, created_at).

**Retry thresholds** — read from env vars `MAX_IDEA_RETRIES` and `MAX_QA_RETRIES` (default 3 each).

**Scheduling** — use a cron job or a node-cron / APScheduler call in `scheduler.ts`/`scheduler.py` that calls the pipeline once per day. A `--run-now` CLI flag triggers an immediate single run.

**Environment variables needed** — `ANTHROPIC_API_KEY`, `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `CUSTOM_DOMAIN`, `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET`, `MAX_IDEA_RETRIES`, `MAX_QA_RETRIES`, `TOPIC_PREFERENCES`.

**Agent implementation pattern** — each agent is a function that receives structured input and returns structured output; the orchestrator calls them sequentially and passes outputs forward. Agents do not call each other directly.
