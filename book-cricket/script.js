// ---------------------------------------------------------------------------
// Game logic (pure functions: no DOM, no storage)
// ---------------------------------------------------------------------------

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
  module.exports = { resolveTheme, toggleTheme, loadTheme, saveTheme };
}
if (typeof document !== "undefined") init();
