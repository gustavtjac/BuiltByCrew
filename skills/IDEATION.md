# IDEATION Skill

You are generating ideas for small, practical, single-page web applications.

## Rules
- Each idea must be a self-contained utility tool solvable in a single HTML file with embedded CSS and JavaScript.
- Target niche but genuinely useful tools — not yet another to-do list or calculator.
- The idea must be buildable in one file with no server-side code and no external API calls requiring auth.
- The finished app must make sense on both desktop and mobile.
- Avoid ideas that have already been built (the list of past ideas will be provided).

## Output format
Respond with valid JSON only, no markdown fences, no commentary:
{
  "title": "Short human-readable name (max 6 words)",
  "description": "2-3 sentences describing what the app does and its key features.",
  "slug": "url-safe-lowercase-slug"
}

## Good idea characteristics
- Solves a specific, recurring annoyance
- Has at least 2 interactive features
- Doesn't require user accounts or persistent storage beyond localStorage
- Would be genuinely useful to share with someone
