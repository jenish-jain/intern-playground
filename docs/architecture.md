# Architecture: Book Cricket

## Overview

A static single-page app in `book-cricket/`: one `index.html`, one `style.css`, one `script.js`. No framework, no bundler, no runtime dependencies. Node.js (≥ 20) and `jsdom` are used **only for tests**.

```
book-cricket/
  index.html        all screens as <section> elements
  style.css         layout, mobile-first, .hidden utility
  script.js         logic + storage + rendering (classic script, also loadable by Node)
  package.json      devDependency: jsdom; "test": "node --test"
  package-lock.json
  tests/
    helpers/app.js  loadApp() helper that boots the page in jsdom
    *.test.js       node:test test files
.github/workflows/book-cricket.yml   CI: npm ci + npm test in book-cricket/
```

The Go CLI at the repository root is unrelated and is not touched by this project.

## script.js structure

One file, organised in three layers, top to bottom. Lower layers never touch the DOM.

1. **Game logic (pure functions, no DOM, no storage)**
   - `flipPage(rng = Math.random)` → integer 1–200: `Math.floor(rng() * 200) + 1`.
   - `tossWinner(rng = Math.random)` → `"p1"` when `rng() < 0.5`, otherwise `"p2"`. With `#toss-toggle` checked, Start consumes one `Math.random()` value for the toss, shows `#screen-toss`, and `#toss-continue-btn` starts `createGame({ ..., firstBatter })`. Play Again reuses `battingOrder[0]` without a new toss.
   - `resultForPage(page)` → `{ page, digit, runs, out, label }` where `digit = page % 10`; labels: `"1 run"`, `"2 runs"` … `"6 runs"`, `"Dot ball"`, `"OUT"`.
   - `soundForBall(ball)` → `"out"` for OUT, `"six"` for 6 runs, otherwise `null` (`null` for a null ball).
   - `createGame({ p1, p2, ballsPerInnings, firstBatter = "p1" })` → new game state in phase `"innings"`, innings 1.
   - `playBall(state, page)` → **new** state (never mutates input) after one ball; handles innings end and match end.
   - `startSecondInnings(state)` → state in phase `"innings"`, innings 2.
   - `computeResult(state)` → `{ winner: "p1" | "p2" | null, p1Score, p2Score }`.
   - `normalizeNames(rawP1, rawP2)` → `{ p1, p2, error }` (trim, blank defaults, case-insensitive duplicate → `error: "Players must have different names"`).
2. **Storage (wraps `localStorage`, every call in try/catch)**
   - `loadPlayers(storage)` / `savePlayers(storage, {p1, p2})`
   - `loadHistory(storage)` → array (`[]` if missing, corrupt or not an array)
   - `addHistory(storage, entry)` → prepends, keeps at most 10, returns new array
   - `clearHistory(storage)`
   - `loadTheme(storage)` → `"light" | "dark" | null` / `saveTheme(storage, theme)` (pure helpers `resolveTheme(saved, prefersDark)` and `toggleTheme(theme)` live in the logic section)
   - `buildHistoryEntry(state, date = new Date())` → entry in the PRD shape
   - `loadMuted(storage)` → `true` only when `bookCricket.muted` holds JSON `true`, otherwise `false` / `saveMuted(storage, muted)` writes a JSON boolean.
   - `storage` is passed in (defaults to `window.localStorage` at the UI layer) so tests can use fakes, including one whose methods throw.
3. **UI (DOM)**
   - A single module-level `gameState` object (the app state) plus `ui` state for the current screen and `ui.muted`.
   - `playSound(kind)` (`"six"` | `"out"`) plays a short Web Audio tone: one oscillator per sound, connected straight to `destination`. It does nothing when `ui.muted` is set or `window.AudioContext` is missing, and swallows audio errors. `handleFlip` calls it with `soundForBall(lastBall)`.
   - `render()` redraws everything from state: shows exactly one `<section>` by toggling the `hidden` class, fills the scoreboard and logs. Event handlers only update state, then call `render()`.
   - `init()` wires event listeners, pre-fills names, calls `render()`.

### Loading in browser and Node

```js
// bottom of script.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { flipPage, tossWinner, resultForPage, soundForBall, createGame, playBall,
                     startSecondInnings, computeResult, normalizeNames, resolveTheme, toggleTheme,
                     loadPlayers, savePlayers, loadHistory, addHistory, clearHistory, buildHistoryEntry,
                     loadTheme, saveTheme, loadMuted, saveMuted };
}
if (typeof document !== "undefined") init();
```

`index.html` loads it with `<script src="script.js" defer></script>` at the end of `<body>`. Unit tests `require("../script.js")`; DOM tests use the jsdom helper.

## Game state

```js
{
  phase: "innings" | "break" | "result",
  players: { p1: "Asha", p2: "Ravi" },
  ballsPerInnings: 6,
  battingOrder: ["p1", "p2"],     // or ["p2", "p1"] after a toss
  currentInnings: 1 | 2,
  currentBatter: "p1" | "p2",
  scores: { p1: 0, p2: 0 },
  ballsLeft: 6,                    // for the current innings
  target: null | number,           // set when innings 1 ends: first score + 1
  out: { p1: false, p2: false },
  log: { p1: [], p2: [] },         // arrays of resultForPage() objects, in order
  lastBall: null | resultForPage() object,
  result: null | computeResult() object
}
```

Transitions in `playBall`:
- Ball applied: `ballsLeft -= 1`, runs added, entry appended to the batter's log, `lastBall` set.
- Innings 1 ends (OUT or `ballsLeft === 0`): `phase = "break"`, `target = score + 1`.
- Innings 2 ends (OUT, `ballsLeft === 0`, or score ≥ target): `phase = "result"`, `result = computeResult(state)`.
- `playBall` on a state whose phase is not `"innings"` returns the state unchanged.

UI screens (`ui.screen`): `"setup" | "toss" | "game" | "break" | "result" | "history"`. The `game`/`break`/`result` screens follow `gameState.phase`; `ui.previousScreen` remembers where History was opened from so Back returns there.

## DOM contract (ids shared by all tickets)

| Screen section | Elements |
|---|---|
| header (outside the screens, always visible) | `#theme-toggle` (button; text "Dark mode"/"Light mode", `aria-pressed` reflects dark) |
| `#screen-setup` | `#p1-name`, `#p2-name` (text, `maxlength="20"`), `#balls-select` (`<select>` with values 6, 12, 18; 6 selected), `#toss-toggle` (checkbox), `#start-btn`, `#setup-error` (hidden unless error), `#setup-history-btn` |
| `#screen-toss` | `#toss-result`, `#toss-continue-btn` |
| `#screen-game` | `#innings-label` ("Innings 1"/"Innings 2"), `#batter-name`, `#score`, `#balls-left`, `#last-page`, `#last-result`, `#target-info` (hidden in innings 1; contains `#target` and `#runs-needed`), `#book` (decorative `<div>` with `aria-hidden`; gets class `flipping` while a ball is pending), `#flip-btn` (disabled while `#book` is `flipping`), `#mute-toggle` (button; text "Mute"/"Unmute", `aria-pressed` reflects muted), `#ball-log` (`<ol>`, one `<li>` per ball) |
| `#screen-break` | `#break-score`, `#break-target`, `#break-continue-btn` |
| `#screen-result` | `#result-banner`, `#result-p1-score`, `#result-p2-score`, `#result-log-p1`, `#result-log-p2` (`<ol>`), `#play-again-btn`, `#change-players-btn`, `#view-history-btn` |
| `#screen-history` | `#history-table` (`<tbody>` rows: Date, Player 1, Player 2, Winner, Balls), `#history-empty` (shown when no matches), `#reset-history-btn`, `#history-back-btn` |

Text formats:
- Ball log item: `Ball {n}: Page {page} – {label}` (en dash), e.g. `Ball 3: Page 147 – Dot ball`.
- `#score`: the number of runs; `#balls-left`: the number of balls left; `#runs-needed`: `max(target - score, 0)`.
- `#result-banner`: `"{name} wins!"` or `"It's a tie!"`.
- `#toss-result`: `"{name} won the toss and bats first"`.
- History Winner column: the winner's name or `Tie`; Date column: `YYYY-MM-DD HH:MM` in local time.

Before the first ball of an innings, `#last-page` and `#last-result` show `–`.

## Persistence

- Keys: `bookCricket.players`, `bookCricket.history` (MVP); `bookCricket.tally`, `bookCricket.theme`, `bookCricket.muted` (EXTRA).
- All reads: `JSON.parse` inside try/catch; any error or wrong shape → default value. All writes: try/catch, failures ignored (the game keeps working).
- `bookCricket.theme` holds `"light"` or `"dark"` (JSON-encoded, like every key), saved on each `#theme-toggle` click. On load: saved theme if valid, otherwise `matchMedia("(prefers-color-scheme: dark)")` when available, otherwise light. Dark sets `data-theme="dark"` on `<html>`; light removes the attribute.
- Names saved on a successful Start. History entry saved once, when a match reaches phase `"result"`.

## Testing

- `node --test` (built-in runner, Node ≥ 20) run from `book-cricket/`; test files `tests/*.test.js`, CommonJS.
- Unit tests `require("../script.js")` and pass explicit `rng`/`page` values and fake storage objects.
- DOM tests use `tests/helpers/app.js`:
  `loadApp({ storage = {}, rawStorage = {}, random = [] , confirm = true, config, colorScheme, audio })` → `{ window, document, click(id), $(selector), oscillators }`. With `audio: true`, `window.AudioContext` is a stub that records each created oscillator in `oscillators`; otherwise it is undefined.
  It creates a `JSDOM` from `index.html` with `url: "http://localhost/"` and `runScripts: "outside-only"`, seeds `window.localStorage` from `storage` (values JSON-stringified) and then from `rawStorage` (string values stored as-is, e.g. to seed invalid JSON), replaces `window.Math.random` with a function returning the given values in order (then repeating the last, or 0.5 if empty), stubs `window.confirm`, sets `window.BOOK_CRICKET_CONFIG` from `config`, stubs `window.matchMedia` from `colorScheme` (`{ dark: true }` makes `(prefers-color-scheme: dark)` match; omitted leaves it undefined), then evaluates `script.js` with `window.eval`.
  Page from a random value `r`: `Math.floor(r * 200) + 1`, so `r = (page - 0.5) / 200` yields `page`.
- No real timers or network in tests. Animation and computer delays are configurable through `window.BOOK_CRICKET_CONFIG` (`{ animationMs, cpuDelayMs }`, defaults 600 and 700) so tests can set them to 0.

## Styling

Mobile-first CSS; `<meta name="viewport" content="width=device-width, initial-scale=1">`; a single centred column with `max-width: 480px` on wide screens; tap targets ≥ 48 px high (the Flip button larger still); `.hidden { display: none !important; }`. The history `<table>` carries the class `table-scroll` (`display: block; overflow-x: auto`) so it scrolls sideways instead of overflowing 320 px screens. Width declarations above 480 px only inside `@media (min-width: ...)` blocks. Theme colours as CSS custom properties on `:root` so dark mode can override them via `[data-theme="dark"]`.

Page-flip animation: on Flip, `#book` gets `flipping` and `#flip-btn` is disabled; the ball is applied after `animationMs` (`window.BOOK_CRICKET_CONFIG`, default 600; 0 applies it at once). The `--flip-duration` custom property is set from `animationMs` on `#book`. `@media (prefers-reduced-motion: reduce)` turns the page animation off; the ball is still applied after the delay.
