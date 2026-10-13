# CLAUDE.md

This repository holds two unrelated things:
- `book-cricket/`: the Book Cricket web game (current work). Read `docs/PRD.md`, `docs/architecture.md` and `docs/adr/` before starting a ticket.
- The `dobby` Go CLI at the root (`main.go`, `cmd/`). Do not modify Go files in Book Cricket tickets.

## Stack (Book Cricket)
- Plain HTML, CSS and JavaScript (ES2020) in exactly three app files: `book-cricket/index.html`, `book-cricket/style.css`, `book-cricket/script.js`.
- No frameworks, no bundler, no transpiler, no runtime dependencies, no CDN scripts. The app must work by opening `index.html` from disk.
- Node.js ≥ 20 for tests only; `jsdom` is the only devDependency.

## Commands (run from `book-cricket/`)
- Install: `npm ci`
- Test: `npm test` (runs `node --test`)
- Run the app: open `book-cricket/index.html` in a browser, or `npx serve book-cricket` from the root.

From the repository root: `npm ci --prefix book-cricket` and `npm test --prefix book-cricket` (this is what verify runs).

## Layout
- `book-cricket/script.js`: three sections in this order: game logic (pure), storage, UI. Keep the `module.exports` / `init()` footer described in the architecture doc, and add any new pure function to the exports.
- `book-cricket/tests/*.test.js`: node:test tests, CommonJS (`require`). Use `tests/helpers/app.js` (`loadApp`) for DOM tests; extend the helper rather than duplicating jsdom setup.

## Rules
- Use the DOM ids and text formats in `docs/architecture.md` exactly; other tickets and tests rely on them. If you must add an element, add an id and document it there.
- Game logic functions are pure: never mutate their input state, never touch `document`, `window` or `localStorage`.
- UI handlers update state and then call `render()`; don't patch the DOM from handlers.
- Show/hide screens only via the `hidden` class on `<section id="screen-...">`.
- All `localStorage` access goes through the storage functions, each wrapped in try/catch.
- Never use real randomness or real timers in tests: pass `rng`/pages to pure functions, use `loadApp({ random: [...] })`, and set `window.BOOK_CRICKET_CONFIG` delays to 0.
- Use `textContent`, never `innerHTML`, for user-provided text (player names).
- Style: 2-space indent, double quotes, semicolons, `const`/`let` (no `var`), camelCase functions, small functions with JSDoc one-liners for exported ones.
- Every ticket adds or updates tests for its acceptance criteria. Keep `npm test` green and under a few seconds.
- Do not edit `.intern/`.
