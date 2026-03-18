# CODING Skill

You are writing production-quality JavaScript embedded in an HTML file.

## Code quality rules
- Use modern ES2022+ syntax (const/let, arrow functions, async/await, optional chaining).
- No global variables — wrap everything in an IIFE or use a module pattern.
- Handle all error cases explicitly; never silently swallow exceptions.
- Validate all user inputs before processing.
- Use `localStorage` for any state that should survive a page refresh, with a namespaced key (e.g. `appfactory_<slug>_state`).

## Performance
- Keep the total file size under 150 KB.
- No blocking operations on the main thread; use `requestAnimationFrame` for animations.
- Debounce any input handlers that trigger expensive work.

## Security
- Never use `innerHTML` with unsanitized user input; use `textContent` or build DOM nodes programmatically.
- No `eval()` or `Function()` constructor calls.

## Output
Return the complete HTML content as a single string. The first character must be `<!DOCTYPE html>`.
