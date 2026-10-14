// ---------------------------------------------------------------------------
// Game logic (pure functions: no DOM, no storage)
// ---------------------------------------------------------------------------

const PAGE_COUNT = 200;
const MAX_RUNS = 6;

/** Flip to a random page: an integer from 1 to 200 inclusive. */
function flipPage(rng = Math.random) {
  return Math.floor(rng() * PAGE_COUNT) + 1;
}

/** Coin toss for batting order: "p1" when rng() < 0.5, otherwise "p2". */
function tossWinner(rng = Math.random) {
  return rng() < 0.5 ? "p1" : "p2";
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

const DUPLICATE_NAMES_ERROR = "Players must have different names";

/** Trim names, default blanks to "Player 1"/"Player 2", and reject case-insensitive duplicates. */
function normalizeNames(rawP1, rawP2) {
  const p1 = String(rawP1 ?? "").trim() || "Player 1";
  const p2 = String(rawP2 ?? "").trim() || "Player 2";
  const error = p1.toLowerCase() === p2.toLowerCase() ? DUPLICATE_NAMES_ERROR : null;
  return { p1, p2, error };
}

/** Pick the theme: a saved "light"/"dark" wins, otherwise follow the system preference. */
function resolveTheme(savedTheme, prefersDark) {
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return prefersDark ? "dark" : "light";
}

/** Return the other theme. */
function toggleTheme(theme) {
  return theme === "dark" ? "light" : "dark";
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

const THEME_KEY = "bookCricket.theme";

/** Read the saved theme: "light", "dark", or null when missing, corrupt or unreadable. */
function loadTheme(storage) {
  try {
    const raw = storage.getItem(THEME_KEY);
    if (raw === null) return null;
    let value;
    try {
      value = JSON.parse(raw);
    } catch (err) {
      value = raw;
    }
    return value === "light" || value === "dark" ? value : null;
  } catch (err) {
    return null;
  }
}

/** Save the theme ("light" | "dark"); failures are ignored. */
function saveTheme(storage, theme) {
  try {
    storage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch (err) {
    // Storage unavailable: the theme still applies for this session.
  }
}

// ---------------------------------------------------------------------------
// UI (DOM)
// ---------------------------------------------------------------------------

const NO_BALL_YET = "–";
const SCREENS = ["setup", "toss", "game", "break", "result", "history"];

let gameState = null;

const ui = {
  theme: "light",
  screen: "setup",
  setupError: null,
  pendingNames: null,
  pendingGame: null,
  cpu: false,
  cpuTimer: null,
  savedP2Name: "",
};

const DEFAULT_CPU_DELAY_MS = 700;
const COMPUTER_NAME = "Computer";

/** True when the browser reports a dark colour-scheme preference. */
function systemPrefersDark() {
  try {
    if (typeof window.matchMedia !== "function") return false;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    return Boolean(query && query.matches);
  } catch (err) {
    return false;
  }
}

/** Apply ui.theme to <html> and the toggle button. */
function renderTheme() {
  const dark = ui.theme === "dark";
  if (dark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.textContent = dark ? "Light mode" : "Dark mode";
    toggle.setAttribute("aria-pressed", String(dark));
  }
}

/** The screen to show: the game screens follow gameState.phase. */
function currentScreen() {
  if (ui.screen === "game" && gameState) {
    if (gameState.phase === "break") return "break";
    if (gameState.phase === "result") return "result";
  }
  return ui.screen;
}

/** Show exactly one screen section by toggling the hidden class. */
function renderScreens(screen) {
  for (const name of SCREENS) {
    document.getElementById(`screen-${name}`).classList.toggle("hidden", name !== screen);
  }
}

/** Fill the setup error message, hidden when there is none. */
function renderSetup() {
  const error = document.getElementById("setup-error");
  error.textContent = ui.setupError || "";
  error.classList.toggle("hidden", !ui.setupError);
  if (ui.pendingNames) {
    document.getElementById("p1-name").value = ui.pendingNames.p1;
    if (!ui.cpu) document.getElementById("p2-name").value = ui.pendingNames.p2;
    ui.pendingNames = null;
  }
}

/** Fill the toss result from the pending game, if any. */
function renderToss() {
  const pending = ui.pendingGame;
  if (!pending) return;
  document.getElementById("toss-result").textContent =
    `${pending[pending.firstBatter]} won the toss and bats first`;
}

/** Ball log `<li>` items in the "Ball n: Page p – label" format. */
function logItems(entries) {
  return entries.map((entry, i) => {
    const li = document.createElement("li");
    li.textContent = `Ball ${i + 1}: Page ${entry.page} – ${entry.label}`;
    return li;
  });
}

/** Fill the scoreboard and ball log for the current innings. */
function renderGame() {
  if (!gameState) return;
  const batter = gameState.currentBatter;
  const ball = gameState.lastBall;
  document.getElementById("innings-label").textContent = `Innings ${gameState.currentInnings}`;
  document.getElementById("batter-name").textContent = gameState.players[batter];
  document.getElementById("score").textContent = String(gameState.scores[batter]);
  document.getElementById("balls-left").textContent = String(gameState.ballsLeft);
  document.getElementById("last-page").textContent = ball ? String(ball.page) : NO_BALL_YET;
  document.getElementById("last-result").textContent = ball ? ball.label : NO_BALL_YET;
  document.getElementById("target-info").classList.toggle("hidden", gameState.currentInnings === 1);
  if (gameState.target !== null) {
    const needed = Math.max(gameState.target - gameState.scores[batter], 0);
    document.getElementById("target").textContent = String(gameState.target);
    document.getElementById("runs-needed").textContent = String(needed);
  }
  document.getElementById("ball-log").replaceChildren(...logItems(gameState.log[batter]));
  document.getElementById("flip-btn").disabled = isCpuTurn();
}

/** True while the computer is batting and the game screen is showing. */
function isCpuTurn() {
  return ui.cpu && ui.screen === "game" && Boolean(gameState)
    && gameState.phase === "innings" && gameState.currentBatter === "p2";
}

/** Milliseconds between the computer's automatic flips. */
function cpuDelayMs() {
  const config = window.BOOK_CRICKET_CONFIG;
  const delay = config && config.cpuDelayMs;
  return typeof delay === "number" && delay >= 0 ? delay : DEFAULT_CPU_DELAY_MS;
}

/** Cancel any pending computer flip. */
function cancelCpuTimer() {
  if (ui.cpuTimer !== null) clearTimeout(ui.cpuTimer);
  ui.cpuTimer = null;
}

/** Keep exactly one computer flip pending while it is the computer's turn, none otherwise. */
function syncCpuTimer() {
  if (!isCpuTurn()) {
    cancelCpuTimer();
  } else if (ui.cpuTimer === null) {
    ui.cpuTimer = setTimeout(handleCpuFlip, cpuDelayMs());
  }
}

/** Disable and fix the Player 2 input while vs Computer is on; restore it when off. */
function syncCpuToggle() {
  const input = document.getElementById("p2-name");
  const checked = document.getElementById("cpu-toggle").checked;
  if (checked === input.disabled) return;
  if (checked) {
    ui.savedP2Name = input.value;
    input.value = COMPUTER_NAME;
  } else {
    input.value = ui.savedP2Name;
  }
  input.disabled = checked;
}

/** Store a new game state and save the history entry once the match is finished. */
function commitState(next) {
  const finished = next.phase === "result" && gameState.phase !== "result";
  gameState = next;
  if (finished) addHistory(getStorage(), buildHistoryEntry(next));
}

/** The computer flips its ball. */
function handleCpuFlip() {
  ui.cpuTimer = null;
  if (!isCpuTurn()) return;
  commitState(playBall(gameState, flipPage()));
  render();
}

/** Fill the innings break with the first innings score and the target. */
function renderBreak() {
  if (!gameState || gameState.target === null) return;
  const [first, second] = gameState.battingOrder;
  document.getElementById("break-score").textContent =
    `${gameState.players[first]} scored ${gameState.scores[first]}`;
  document.getElementById("break-target").textContent =
    `${gameState.players[second]} needs ${gameState.target} to win`;
}

/** Fill the result screen: banner, both totals and both ball logs. */
function renderResult() {
  if (!gameState || !gameState.result) return;
  const { winner, p1Score, p2Score } = gameState.result;
  document.getElementById("result-banner").textContent =
    winner ? `${gameState.players[winner]} wins!` : "It's a tie!";
  document.getElementById("result-p1-score").textContent = String(p1Score);
  document.getElementById("result-p2-score").textContent = String(p2Score);
  document.getElementById("result-log-p1").replaceChildren(...logItems(gameState.log.p1));
  document.getElementById("result-log-p2").replaceChildren(...logItems(gameState.log.p2));
}

/** Redraw the page from state. */
function render() {
  renderTheme();
  renderScreens(currentScreen());
  renderSetup();
  renderToss();
  renderGame();
  renderBreak();
  renderResult();
  syncCpuTimer();
}

/** Start a match from the setup form (via the toss screen when the toss is on), or show the name error. */
function handleStart() {
  ui.cpu = document.getElementById("cpu-toggle").checked;
  const names = normalizeNames(
    document.getElementById("p1-name").value,
    ui.cpu ? COMPUTER_NAME : document.getElementById("p2-name").value,
  );
  ui.setupError = names.error;
  if (!names.error) {
    const ballsPerInnings = Number(document.getElementById("balls-select").value);
    const settings = { p1: names.p1, p2: names.p2, ballsPerInnings };
    if (document.getElementById("toss-toggle").checked) {
      ui.pendingGame = { ...settings, firstBatter: tossWinner() };
      ui.screen = "toss";
    } else {
      gameState = createGame(settings);
      ui.screen = "game";
    }
  }
  render();
}

/** Start the match with the batting order decided by the toss. */
function handleTossContinue() {
  if (!ui.pendingGame) return;
  gameState = createGame(ui.pendingGame);
  ui.pendingGame = null;
  ui.screen = "game";
  render();
}

/** Play one ball on a random page. */
function handleFlip() {
  if (!gameState || isCpuTurn()) return;
  commitState(playBall(gameState, flipPage()));
  render();
}

/** Begin the second innings from the break. */
function handleBreakContinue() {
  if (!gameState) return;
  gameState = startSecondInnings(gameState);
  render();
}

/** Start a new match with the same names, balls per innings and batting order. */
function handlePlayAgain() {
  if (!gameState) return;
  const { players, ballsPerInnings, battingOrder } = gameState;
  gameState = createGame({ p1: players.p1, p2: players.p2, ballsPerInnings, firstBatter: battingOrder[0] });
  ui.screen = "game";
  render();
}

/** Return to setup with the current names in the inputs. */
function handleChangePlayers() {
  if (gameState) ui.pendingNames = { ...gameState.players };
  ui.setupError = null;
  ui.screen = "setup";
  render();
}

/** Switch between light and dark and remember the choice. */
function handleThemeToggle() {
  ui.theme = toggleTheme(ui.theme);
  saveTheme(getStorage(), ui.theme);
  render();
}

/** Return window.localStorage, or null when accessing it throws (storage functions tolerate null). */
function getStorage() {
  try {
    return window.localStorage;
  } catch (err) {
    return null;
  }
}

/** Wire up the page. */
function init() {
  ui.theme = resolveTheme(loadTheme(getStorage()), systemPrefersDark());
  document.getElementById("theme-toggle").addEventListener("click", handleThemeToggle);
  document.getElementById("start-btn").addEventListener("click", handleStart);
  document.getElementById("cpu-toggle").addEventListener("change", syncCpuToggle);
  document.getElementById("toss-continue-btn").addEventListener("click", handleTossContinue);
  document.getElementById("flip-btn").addEventListener("click", handleFlip);
  document.getElementById("break-continue-btn").addEventListener("click", handleBreakContinue);
  document.getElementById("play-again-btn").addEventListener("click", handlePlayAgain);
  document.getElementById("change-players-btn").addEventListener("click", handleChangePlayers);
  render();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { flipPage, tossWinner, resultForPage, createGame, playBall, startSecondInnings,
                     computeResult, normalizeNames, resolveTheme, toggleTheme, loadPlayers, savePlayers,
                     loadHistory, addHistory, clearHistory, buildHistoryEntry, loadTheme,
                     saveTheme };
}
if (typeof document !== "undefined") init();
