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

/** New game state in phase "innings", innings 1, with `firstBatter` batting. */
function createGame({ p1, p2, ballsPerInnings, firstBatter = "p1" }) {
  const secondBatter = firstBatter === "p1" ? "p2" : "p1";
  return {
    phase: "innings",
    players: { p1, p2 },
    ballsPerInnings,
    battingOrder: [firstBatter, secondBatter],
    currentInnings: 1,
    currentBatter: firstBatter,
    scores: { p1: 0, p2: 0 },
    ballsLeft: ballsPerInnings,
    target: null,
    out: { p1: false, p2: false },
    log: { p1: [], p2: [] },
    lastBall: null,
    result: null,
  };
}

/** New state after one ball on `page`; returns the input unchanged unless phase is "innings". */
function playBall(state, page) {
  if (state.phase !== "innings") return state;
  const batter = state.currentBatter;
  const ball = resultForPage(page);
  const score = state.scores[batter] + ball.runs;
  const next = {
    ...state,
    scores: { ...state.scores, [batter]: score },
    ballsLeft: state.ballsLeft - 1,
    out: { ...state.out, [batter]: state.out[batter] || ball.out },
    log: { ...state.log, [batter]: [...state.log[batter], ball] },
    lastBall: ball,
  };
  const inningsOver = ball.out || next.ballsLeft === 0;
  if (state.currentInnings === 1) {
    if (inningsOver) {
      next.phase = "break";
      next.target = score + 1;
    }
  } else if (inningsOver || score >= state.target) {
    next.phase = "result";
    next.result = computeResult(next);
  }
  return next;
}

/** State for innings 2 from a "break" state; returns the input unchanged otherwise. */
function startSecondInnings(state) {
  if (state.phase !== "break") return state;
  return {
    ...state,
    phase: "innings",
    currentInnings: 2,
    currentBatter: state.battingOrder[1],
    ballsLeft: state.ballsPerInnings,
    lastBall: null,
  };
}

/** Match result from the scores: `{ winner: "p1" | "p2" | null, p1Score, p2Score }` (null is a tie). */
function computeResult(state) {
  const p1Score = state.scores.p1;
  const p2Score = state.scores.p2;
  let winner = null;
  if (p1Score > p2Score) winner = "p1";
  else if (p2Score > p1Score) winner = "p2";
  return { winner, p1Score, p2Score };
}

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
  module.exports = { flipPage, resultForPage, createGame, playBall, startSecondInnings,
                     computeResult, loadPlayers, savePlayers, loadHistory, addHistory,
                     clearHistory, buildHistoryEntry };
}
if (typeof document !== "undefined") init();
