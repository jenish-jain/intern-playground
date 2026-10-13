// ---------------------------------------------------------------------------
// Game logic (pure functions: no DOM, no storage)
// ---------------------------------------------------------------------------

const PAGE_COUNT = 200;
const MAX_RUNS = 6;

/** Flip to a random page: an integer from 1 to 200 inclusive. */
function flipPage(rng = Math.random) {
  return Math.floor(rng() * PAGE_COUNT) + 1;
}

/** Describe the ball scored by a page from its last digit. */
function resultForPage(page) {
  const digit = page % 10;
  const out = digit === 0;
  const runs = digit <= MAX_RUNS ? digit : 0;
  let label;
  if (out) label = "OUT";
  else if (runs === 0) label = "Dot ball";
  else if (runs === 1) label = "1 run";
  else label = `${runs} runs`;
  return { page, digit, runs, out, label };
}

// ---------------------------------------------------------------------------
// Storage (wraps localStorage; every call in try/catch)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// UI (DOM)
// ---------------------------------------------------------------------------

/** Wire up the page. Does nothing yet; behaviour comes in later tickets. */
function init() {}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { flipPage, resultForPage };
}
if (typeof document !== "undefined") init();
