# FRONTEND Skill

You must invoke the `frontend-design@claude-code-plugins` plugin before designing or writing any UI. This plugin is enabled in the project settings and provides design standards, component patterns, and aesthetic guidance. Always apply its output to your implementation.

- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

You are building a single-page web application as a fully self-contained HTML file.

## Required `<head>` tags
Every app must include these in `<head>`. Replace `{{TITLE}}`, `{{DESCRIPTION}}`, and `{{SLUG}}` with the actual app values:

```html
<title>{{TITLE}}</title>
<meta name="description" content="{{DESCRIPTION}}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://{{SLUG}}.builtbycrew.online/">
<meta property="og:type" content="website">
<meta property="og:title" content="{{TITLE}}">
<meta property="og:description" content="{{DESCRIPTION}}">
<meta property="og:url" content="https://{{SLUG}}.builtbycrew.online/">
<meta property="og:site_name" content="BuiltByCrew">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="{{TITLE}}">
<meta name="twitter:description" content="{{DESCRIPTION}}">
<link rel="icon" href="data:image/svg+xml,<!-- themed SVG favicon, see below -->">
```

The favicon must be an inline SVG data URI — a small, recognisable icon that reflects the app's theme and palette. Keep it simple (a symbol, initial, or motif) so it reads clearly at 16×32px.



## Interactivity first
Every app must feel alive. The user should be doing something — dragging, clicking, drawing, building, playing — not just looking at static output. Build for delight, not just function.

**Required interactive elements:**
- At least one element that responds to user input in real-time (live preview, animation, visual state change)
- Hover states that do something interesting — not just colour changes
- At least one "wow moment" — a satisfying animation, a surprising reveal, a pleasing visual reaction
- Smooth transitions on all state changes (no jarring instant swaps)

**Animations to always include:**
- Page load: staggered entrance animations for key elements (CSS animation-delay)
- Primary action: a satisfying visual response (scale pulse, ripple, particle burst, number roll)
- Inputs/sliders: live visual feedback as the user types or drags
- Buttons: press-down feel (scale + shadow), not just colour change

**Never ship:**
- Static pages that could be a screenshot
- Buttons with no visual press feedback
- Inputs that update output with no transition
- Empty space that could be filled with ambient animation

## Theme-driven design
The idea input will include a `theme` object with a name, description, color palette, and font direction. **You must design the entire UI around this theme.** It should be unmistakable — someone looking at the app should immediately feel the theme without being told what it is.

Apply the theme to:
- Background, surface, and text colors (use the provided palette)
- Typography — match the font style described (use system fonts or inline a Google Font via `@import` in the `<style>` tag)
- Component style — buttons, inputs, cards, borders should all reflect the aesthetic
- Micro-interactions — hover effects, animations, transitions should feel on-brand
- Layout mood — spacing, density, and visual weight should match the theme's energy

Do not use generic "clean and minimal" defaults. Every pixel should feel intentional and themed.

## Structure rules
- One file: all CSS in a `<style>` tag, all JS in a `<script>` tag at the bottom of `<body>`.
- No external CDN links, no `import` statements, no `fetch` to third-party APIs.
- Google Fonts may be loaded via `@import url(...)` inside the `<style>` tag.
- All other assets (icons, illustrations) must be inlined as base64 data URIs or drawn with CSS/SVG.

## Design standards
- Mobile-first responsive layout using CSS flexbox or grid.
- Minimum tap target size: 44px × 44px.
- Color contrast ratio ≥ 4.5:1 for all text.
- No light/dark mode switching — the theme defines the look, bake it in.

## Refrence Images
- If a refrence images is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not imporve or add to the design-
- If no refrence image: design from scrath with high craft (see guardrails below)
- Screenshot your output, compare against refrence, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible diffrences remain or user says so.

## Required footer
Every app must end with this footer, before `</body>`. Replace `{{SLUG}}` with the app's slug. Style it to blend with the theme (small text, muted color):
```html
<footer>
  <span>Built by <a href="https://builtbycrew.online/" target="_blank" rel="noopener">BuiltByCrew</a> — a new app every day</span>
  &nbsp;·&nbsp;
  <a href="https://github.com/BuiltByCrew/{{SLUG}}" target="_blank" rel="noopener" aria-label="View source on GitHub">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align:middle">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  </a>
  &nbsp;·&nbsp;
  <a href="https://buymeacoffee.com/builtbycrew" target="_blank" rel="noopener">☕ Buy me a coffee</a>
</footer>
```
## Accessibility
- All interactive elements must have accessible labels.
- Keyboard navigation must work end-to-end.
- Use semantic HTML elements (`<main>`, `<header>`, `<footer>`, `<button>`, etc.).
