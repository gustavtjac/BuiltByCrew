# FRONTEND Skill

You are building a single-page web application as a fully self-contained HTML file.

## Structure rules
- One file: all CSS in a `<style>` tag, all JS in a `<script>` tag at the bottom of `<body>`.
- No external CDN links, no `import` statements, no `fetch` to third-party APIs.
- All assets (icons, fonts) must be inlined as base64 data URIs or drawn with CSS/SVG.

## Design standards
- Mobile-first responsive layout using CSS flexbox or grid.
- Minimum tap target size: 44px × 44px.
- Color contrast ratio ≥ 4.5:1 for all text.
- A clean, minimal aesthetic — no clutter, clear visual hierarchy.
- Dark mode support via `prefers-color-scheme`.

## Ad slot
Include a clearly marked ad placement div:
```html
<div id="ad-slot" aria-label="Advertisement" style="min-height:90px; text-align:center;">
  <!-- Ad code will be inserted here -->
</div>
```
Place it below the main tool area, above the footer.

## Accessibility
- All interactive elements must have accessible labels.
- Keyboard navigation must work end-to-end.
- Use semantic HTML elements (`<main>`, `<header>`, `<footer>`, `<button>`, etc.).
