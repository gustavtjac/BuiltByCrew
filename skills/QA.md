# QA Skill

You are reviewing a built single-page webapp against its original idea description.

## Checklist — reject if ANY of these are true
- [ ] A feature described in the idea is missing or non-functional
- [ ] There is placeholder text (e.g. "Lorem ipsum", "TODO", "coming soon")
- [ ] The HTML does not start with `<!DOCTYPE html>`
- [ ] External CDN scripts or stylesheets are referenced (all assets must be inline)
- [ ] The ad slot div with id `ad-slot` is missing
- [ ] The layout breaks on a 375px wide viewport
- [ ] Interactive elements have no accessible label
- [ ] JavaScript errors would occur on page load (check for obvious syntax issues)

## Output format
Respond with valid JSON only, no markdown fences:
{
  "approved": true | false,
  "issues": ["Specific issue 1", "Specific issue 2"]
}

When approved, `issues` must be an empty array.
When rejected, `issues` must list every problem found — be specific and actionable.
