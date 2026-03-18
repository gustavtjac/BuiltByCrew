# BuiltByCrew

**Six AI agents. One new web app. Every day.**

→ [builtbycrew.online](https://www.builtbycrew.online)

---

## What is this?

BuiltByCrew is an autonomous webapp factory that runs on a daily schedule with no human intervention. Every morning at 6AM, a pipeline of six specialized AI agents wakes up, argues about what to build, writes the code, tears it apart, ships it live, and tweets about it.

No standups. No sprint planning. No pull request reviews. Just apps.

---

## The Crew

| Agent | Role | Responsibility |
|-------|------|----------------|
| **Spark** | Chief Idea Officer | Generates fresh webapp ideas. Reads the full archive of past builds to ensure nothing is repeated. |
| **Judge** | VP of Standards | Validates each idea for uniqueness, usefulness, and buildability. Rejects anything that doesn't pass. |
| **Builder** | Lead Engineer | Writes the complete app as a single self-contained HTML file. No frameworks. No CDNs. No servers. |
| **Inspector** | QA Lead | Reviews the build against the original spec. Checks mobile layout, feature completeness, and accessibility. Sends failures back to Builder. |
| **Hermes** | Head of Operations | Deploys to Vercel via API, polls until live, assigns a subdomain. Never touches a dashboard. |
| **Buzz** | Chief Marketing Officer | Writes three tweets per app — launch day, day 3, day 7 — and posts them on schedule. |

---

## How it works

```
06:00 ──► SPARK generates idea
          │
          ▼
       JUDGE validates
          │ reject → back to SPARK (max 3 attempts)
          ▼
       BUILDER writes app
          │
          ▼
       INSPECTOR reviews
          │ fail → back to BUILDER (max 3 attempts)
          ▼
       HERMES deploys to Vercel
          │
          ▼
       BUZZ schedules tweets
          │
          ▼
       Run logged to data/runs.json
```

Each built app is saved as `apps/<slug>/index.html` with a `meta.json` alongside it.

---

## Project structure

```
├── src/
│   ├── pipeline.ts          # Main orchestrator — runs all 6 agents in sequence
│   ├── scheduler.ts         # Cron job (daily at 06:00) + --run-now CLI flag
│   ├── types.ts             # Shared TypeScript types
│   └── agents/
│       ├── ideaAgent.ts
│       ├── validationAgent.ts
│       ├── devAgent.ts
│       ├── qaAgent.ts
│       ├── opsAgent.ts
│       └── marketingAgent.ts
├── skills/                  # Prompt files loaded by agents before acting
│   ├── IDEATION.md
│   ├── VALIDATION.md
│   ├── FRONTEND.md
│   ├── CODING.md
│   ├── QA.md
│   ├── DEPLOYMENT.md
│   └── MARKETING.md
├── scripts/
│   └── deploy-landing.ts    # Deploys the root landing page to Vercel
├── landing/
│   └── index.html           # builtbycrew.online landing page
├── apps/                    # Generated apps live here (gitignored)
└── data/                    # Run logs and state (gitignored)
```

---

## Setup

**1. Clone and install**

```bash
git clone https://github.com/gustavtjac/BuiltByCrew.git
cd BuiltByCrew
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Fill in `.env`:

```env
ANTHROPIC_API_KEY=          # Claude API key
VERCEL_TOKEN=               # Vercel personal access token
VERCEL_TEAM_ID=             # Optional — only needed for Vercel Teams
CUSTOM_DOMAIN=builtbycrew.online
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
MAX_IDEA_RETRIES=3
MAX_QA_RETRIES=3
TOPIC_PREFERENCES=          # Optional — e.g. "productivity, developer tools"
```

**3. Run once manually**

```bash
npm run pipeline -- --run-now
```

**4. Start the daily scheduler**

```bash
npm run schedule
```

Fires automatically every day at 06:00.

**5. Deploy the landing page**

```bash
npm run deploy:landing
```

---

## Data & state

Every run is persisted to `data/runs.json`:

```json
{
  "id": "2026-03-18",
  "date": "2026-03-18",
  "idea": "...",
  "status": "success",
  "url": "https://tool-name.builtbycrew.online",
  "tweets_posted": true
}
```

Possible statuses: `success` · `failed` · `skipped`

---

## Built apps

Each generated app lives at `apps/<slug>/index.html` and is deployed to a subdomain:

```
https://<slug>.builtbycrew.online
```

---

## Tech stack

- **Runtime**: Node.js + TypeScript
- **AI**: Claude (Anthropic API)
- **Deployment**: Vercel REST API
- **Scheduling**: node-cron
- **Social**: Twitter/X API v2
- **Landing page**: Vanilla HTML/CSS/JS

---

## License

MIT
