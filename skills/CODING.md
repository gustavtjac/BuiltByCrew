# CODING Skill

You are writing production-quality JavaScript embedded in an HTML file.

## Code quality rules
- Use modern ES2022+ syntax (const/let, arrow functions, async/await, optional chaining).
- No global variables — wrap everything in an IIFE or use a module pattern.
- Handle all error cases explicitly; never silently swallow exceptions.
- Validate all user inputs before processing.
- Use `localStorage` for any state that should survive a page refresh, with a namespaced key (e.g. `appfactory_<slug>_state`).

## Interactivity & animation
- All visual state changes must be animated — no instant/jarring swaps. Use CSS transitions or JS animations.
- Use `requestAnimationFrame` for all game loops, canvas rendering, and smooth number counting/rolling.
- Implement particle effects, ripples, or burst animations for primary actions (button clicks, score events, completions).
- Sliders and drag interactions must update visuals in real-time at 60fps — no debounce on visual output (debounce only expensive non-visual side effects).
- Number outputs that change should count/roll to their new value, not snap.
- Entrance animations: key elements should animate in on load using CSS `@keyframes` with staggered `animation-delay`.
- Every button needs a physical press feel: `transform: scale(0.96)` on `:active` minimum.

## Sandbox apps (category: sandbox)
When the idea is a sandbox (physics/generative-art playground), apply these additional rules:

- Use a full-viewport `<canvas>` element as the primary surface — no fixed-width containers.
- Drive everything with a `requestAnimationFrame` loop from the first frame. The canvas must never be static.
- Implement mouse AND touch interaction — drag, tap, swipe. The user's cursor/finger should visibly affect the simulation immediately.
- Aim for visual beauty over accuracy: smooth blending, colour gradients, motion blur (`ctx.globalAlpha` trails), and glow effects (`ctx.shadowBlur`) are encouraged.
- Particle counts and simulation steps must be capped to maintain 60fps on a mid-range device. Prefer quality over quantity — 200 beautiful particles beat 2000 ugly ones.
- Include at least one ambient behaviour that runs without user input (auto-evolving, drifting, pulsing) so the canvas is alive even if the user just watches.
- Add subtle on-screen hints (bottom-left, small, themed) like "click to attract · drag to push" — one line, disappears after 5 seconds.
- No UI panels, no settings menus, no buttons unless absolutely essential. The canvas IS the UI.

## Daily puzzle apps (category: puzzle)
When the idea is a daily puzzle (Wordle/Contexto-style), apply these additional rules:

- **Date seed**: derive today's puzzle deterministically from the current date. Use `new Date().toISOString().slice(0,10)` as the seed string; hash or index into your puzzle data with it. Never use `Math.random()` — the puzzle must be identical for all players on the same day.
- **All puzzle data embedded**: word lists, answer sets, puzzle configs — everything ships inside the HTML. No fetch calls for content.
- **Attempt state in localStorage**: save the player's guesses and completion status under a namespaced key that includes the date (e.g. `bycrew_<slug>_2026-03-20`). On load, restore state so a partial game survives a refresh.
- **Streak tracking**: store `currentStreak`, `bestStreak`, and `lastWonDate` in localStorage. Update on win/lose.
- **Share button**: on win or game over, show a "Copy result" button that writes a spoiler-free emoji summary to the clipboard (e.g. `Puzzle #42 ⬛🟨🟩🟩🟩 4/6`). Use `navigator.clipboard.writeText()` with a fallback.
- **Countdown to next puzzle**: on the win/loss screen, show a live countdown (updated every second) to midnight local time when the next puzzle unlocks.
- **Puzzle number**: derive a stable puzzle number from the date (days since a fixed epoch, e.g. 2026-01-01) and display it in the UI (e.g. "Puzzle #79").
- **Mobile-first keyboard**: for word puzzles, render an on-screen keyboard in addition to supporting physical keyboard input. Minimum key tap target: 44px.
- **Animations**: tile flip on guess reveal (CSS 3D transform), row shake on invalid guess, celebration burst on win.

## Performance
- Keep the total file size under 150 KB.
- No blocking operations on the main thread; use `requestAnimationFrame` for animations.
- Debounce only computationally expensive work (not visual updates).

## Security
- Never use `innerHTML` with unsanitized user input; use `textContent` or build DOM nodes programmatically.
- No `eval()` or `Function()` constructor calls.

## Output
Return the complete HTML content as a single string. The first character must be `<!DOCTYPE html>`.
