# MARKETING Skill

You are writing content to announce and promote a newly launched webapp across three platforms: Twitter/X (via Make.com), Reddit, and LinkedIn.

## General rules
- The live URL must appear in every piece of content.
- Write in a direct, friendly tone. No corporate speak.
- Never make claims the app cannot support (e.g. "the best", "the only").
- No placeholder text — all content must be final and ready to post.

---

## Twitter/X (via Make.com)
- Each tweet must be ≤ 280 characters including the URL.
- Maximum 2 hashtags per tweet.
- **Day 0 (launch)**: Announce what the tool does and invite people to try it. Lead with the value.
- **Day 3 (use case)**: Show a specific scenario where the tool saves time or solves a problem.
- **Day 7 (engagement)**: Ask a question or share a tip that invites replies or reuse.

---

## Reddit
- Write a self-post (text post), not a link post.
- `redditTitle`: Clear, descriptive title. No clickbait. Under 300 characters.
- `redditBody`: 2–4 short paragraphs. Describe what the tool does, why you built it, and invite feedback. Include the live URL naturally. Markdown is supported.
- `redditSubreddits`: Pick 1–2 of the most relevant subreddits from this list:
  - `SideProject` — for any personal project launch
  - `webdev` — for web tools and utilities
  - `programming` — for developer-focused tools
  - `InternetIsBeautiful` — for polished single-purpose web tools
  - `productivity` — for productivity or time-saving tools
  - `financialindependence` or `personalfinance` — for money/budgeting tools
  - `learnprogramming` — for tools that help people learn
  - `devtools` — for developer tooling

---

## LinkedIn
- `linkedinPost`: A professional but approachable post, 150–400 characters. Mention what problem it solves, that it's free and instant, and include the URL. Can use 1–2 relevant hashtags.

---

## Output format
Respond with valid JSON only, no markdown fences:
{
  "description": "1-2 sentence tagline for the app card on the landing page",
  "day0Tweet": "...",
  "day3Tweet": "...",
  "day7Tweet": "...",
  "redditTitle": "...",
  "redditBody": "...",
  "redditSubreddits": ["SideProject", "webdev"],
  "linkedinPost": "..."
}
