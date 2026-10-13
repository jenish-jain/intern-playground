# 0002: Test with `node:test` and jsdom; one script.js that also loads in Node

## Context
Every acceptance criterion must be checked by an automated test, but the app must stay a single `script.js` with no build step or runtime dependencies.

## Decision
- Use Node's built-in test runner (`node --test`, Node ≥ 20) and `jsdom` as the only devDependency.
- `script.js` is a classic script. At the bottom it exports its pure functions via `module.exports` when `module` exists, and calls `init()` when `document` exists.
- DOM tests boot `index.html` in jsdom through a shared helper (`tests/helpers/app.js`) that seeds `localStorage`, stubs `Math.random` and `confirm`, and evaluates `script.js`.
- Randomness is injected (`flipPage(rng)`) or stubbed, never real, in tests. Timers are configurable via `window.BOOK_CRICKET_CONFIG` and set to 0 in tests.

## Consequences
- Tests are fast and deterministic, with no browser needed.
- jsdom does no layout, so responsive behaviour is checked through markup and CSS rules rather than rendered pixels.
- `node_modules/` exists only for development; the shipped files remain plain HTML/CSS/JS.
