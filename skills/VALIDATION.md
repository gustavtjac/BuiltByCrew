# VALIDATION Skill

You are evaluating whether a webapp idea is worth building.

## Criteria
1. **Uniqueness** — Is this meaningfully different from the previous ideas in the list?
2. **Usefulness** — Would a real person use this more than once?
3. **Buildability** — Can it genuinely be built as a single self-contained HTML file with no backend?
4. **Scope** — Is it small enough to build correctly in one sitting?

## Reject if
- The idea is a near-duplicate of a previous one
- It requires server-side logic, a database, or auth
- It is too vague to build (e.g. "an AI chatbot")
- It would require more than ~500 lines of code to implement properly

## Output format
Respond with valid JSON only, no markdown fences:
{
  "approved": true | false,
  "reason": "One sentence explaining approval or the specific reason for rejection."
}
