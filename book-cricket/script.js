// ---------------------------------------------------------------------------
// Game logic (pure functions: no DOM, no storage)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Storage (wraps localStorage; every call in try/catch)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// UI (DOM)
// ---------------------------------------------------------------------------

/** Wire up the page. Does nothing yet; behaviour comes in later tickets. */
function init() {}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {};
}
if (typeof document !== "undefined") init();
