// ---------------------------------------------------------------------------
// Game logic (pure functions: no DOM, no storage)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Storage (wraps localStorage; every call in try/catch)
// ---------------------------------------------------------------------------

const PLAYERS_KEY = "bookCricket.players";
const HISTORY_KEY = "bookCricket.history";
const HISTORY_LIMIT = 10;

/** Read and JSON-parse a key; returns undefined on a missing key or any error. */
function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (raw === null || raw === undefined) return undefined;
    return JSON.parse(raw);
  } catch (e) {
    return undefined;
  }
}

/** JSON-stringify and write a key; returns true on success, false on any error. */
function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

/** Saved player names `{ p1, p2 }`, or null if missing, corrupt or wrong-shaped. */
function loadPlayers(storage) {
  const data = readJson(storage, PLAYERS_KEY);
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (typeof data.p1 !== "string" || typeof data.p2 !== "string") return null;
  return { p1: data.p1, p2: data.p2 };
}

/** Persist player names; write failures are ignored. */
function savePlayers(storage, { p1, p2 }) {
  writeJson(storage, PLAYERS_KEY, { p1, p2 });
}

/** Saved match history, newest first; [] if missing, corrupt or not an array. */
function loadHistory(storage) {
  const data = readJson(storage, HISTORY_KEY);
  return Array.isArray(data) ? data : [];
}

/** Prepend an entry (keeping at most 10) and return the stored history. */
function addHistory(storage, entry) {
  const previous = loadHistory(storage);
  const next = [entry, ...previous].slice(0, HISTORY_LIMIT);
  return writeJson(storage, HISTORY_KEY, next) ? next : previous;
}

/** Remove all saved history; failures are ignored. */
function clearHistory(storage) {
  try {
    storage.removeItem(HISTORY_KEY);
  } catch (e) {
    // Ignored: the game keeps working without storage.
  }
}

/** History entry (PRD shape plus battedFirst) for a finished game, or null if not in phase "result". */
function buildHistoryEntry(state, date = new Date()) {
  if (!state || state.phase !== "result") return null;
  const { players, scores } = state;
  let winner = null;
  if (scores.p1 > scores.p2) winner = players.p1;
  else if (scores.p2 > scores.p1) winner = players.p2;
  return {
    date: date.toISOString(),
    p1: { name: players.p1, score: scores.p1 },
    p2: { name: players.p2, score: scores.p2 },
    winner,
    ballsPerInnings: state.ballsPerInnings,
    battedFirst: state.battingOrder[0],
  };
}

// ---------------------------------------------------------------------------
// UI (DOM)
// ---------------------------------------------------------------------------

/** Wire up the page. Does nothing yet; behaviour comes in later tickets. */
function init() {}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { loadPlayers, savePlayers, loadHistory, addHistory, clearHistory,
                     buildHistoryEntry };
}
if (typeof document !== "undefined") init();
