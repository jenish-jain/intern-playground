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

const ui = {
  theme: "light",
};

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

/** Redraw the page from state. */
function render() {
  renderTheme();
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
  render();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { flipPage, resultForPage, resolveTheme, toggleTheme,
                     loadPlayers, savePlayers, loadHistory, addHistory, clearHistory,
                     buildHistoryEntry, loadTheme, saveTheme };
}
if (typeof document !== "undefined") init();
