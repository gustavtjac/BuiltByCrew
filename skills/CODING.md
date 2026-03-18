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

## Performance
- Keep the total file size under 150 KB.
- No blocking operations on the main thread; use `requestAnimationFrame` for animations.
- Debounce only computationally expensive work (not visual updates).

## Security
- Never use `innerHTML` with unsanitized user input; use `textContent` or build DOM nodes programmatically.
- No `eval()` or `Function()` constructor calls.

## Output
Return the complete HTML content as a single string. The first character must be `<!DOCTYPE html>`.
