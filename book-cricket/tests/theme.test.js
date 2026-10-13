const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp } = require("./helpers/app.js");
const { resolveTheme, toggleTheme, loadTheme, saveTheme } = require("../script.js");

/** In-memory storage fake. */
function fakeStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
  };
}

const throwingStorage = {
  getItem() {
    throw new Error("denied");
  },
  setItem() {
    throw new Error("denied");
  },
};

test("resolveTheme prefers a saved theme, then the system preference", () => {
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme(null, false), "light");
  assert.equal(resolveTheme("purple", true), "dark");
});

test("toggleTheme flips between light and dark", () => {
  assert.equal(toggleTheme("light"), "dark");
  assert.equal(toggleTheme("dark"), "light");
});

test("loadTheme reads valid values and defaults to null otherwise", () => {
  assert.equal(loadTheme(fakeStorage({ "bookCricket.theme": '"dark"' })), "dark");
  assert.equal(loadTheme(fakeStorage({ "bookCricket.theme": '"light"' })), "light");
  assert.equal(loadTheme(fakeStorage({ "bookCricket.theme": "dark" })), "dark");
  assert.equal(loadTheme(fakeStorage({ "bookCricket.theme": '"blue"' })), null);
  assert.equal(loadTheme(fakeStorage({ "bookCricket.theme": "{bad" })), null);
  assert.equal(loadTheme(fakeStorage()), null);
  assert.equal(loadTheme(throwingStorage), null);
  assert.equal(loadTheme(null), null);
});

test("saveTheme stores JSON and ignores storage failures", () => {
  const storage = fakeStorage();
  saveTheme(storage, "dark");
  assert.equal(storage.data["bookCricket.theme"], '"dark"');
  assert.doesNotThrow(() => saveTheme(throwingStorage, "dark"));
});

test("#theme-toggle is outside the screen sections", () => {
  const { $ } = loadApp();
  const toggle = $("#theme-toggle");
  assert.ok(toggle);
  assert.equal(toggle.closest("section"), null);
});

test("clicking #theme-toggle switches to dark and back, persisting each choice", () => {
  const { window, document, click, $ } = loadApp();
  const html = document.documentElement;
  assert.equal(html.hasAttribute("data-theme"), false);

  click("theme-toggle");
  assert.equal(html.getAttribute("data-theme"), "dark");
  assert.equal(JSON.parse(window.localStorage.getItem("bookCricket.theme")), "dark");
  assert.equal($("#theme-toggle").getAttribute("aria-pressed"), "true");
  assert.equal($("#theme-toggle").textContent, "Light mode");

  click("theme-toggle");
  assert.equal(html.hasAttribute("data-theme"), false);
  assert.equal(JSON.parse(window.localStorage.getItem("bookCricket.theme")), "light");
  assert.equal($("#theme-toggle").getAttribute("aria-pressed"), "false");
  assert.equal($("#theme-toggle").textContent, "Dark mode");
});

test("a saved dark theme applies on load", () => {
  const { document } = loadApp({ storage: { "bookCricket.theme": "dark" } });
  assert.equal(document.documentElement.getAttribute("data-theme"), "dark");
});

test("a saved light theme beats a dark system preference", () => {
  const { document } = loadApp({ storage: { "bookCricket.theme": "light" }, colorScheme: { dark: true } });
  assert.equal(document.documentElement.hasAttribute("data-theme"), false);
});

test("without a saved theme, a dark matchMedia preference starts dark", () => {
  const { document } = loadApp({ colorScheme: { dark: true } });
  assert.equal(document.documentElement.getAttribute("data-theme"), "dark");
});

test("without a saved theme, a light matchMedia preference starts light", () => {
  const { document } = loadApp({ colorScheme: { dark: false } });
  assert.equal(document.documentElement.hasAttribute("data-theme"), false);
});

test("without a saved theme and with matchMedia undefined, the app starts light", () => {
  const { window, document } = loadApp();
  assert.equal(window.matchMedia, undefined);
  assert.equal(document.documentElement.hasAttribute("data-theme"), false);
});

test("style.css overrides background and text colours for dark mode", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");
  const match = css.match(/\[data-theme="dark"\]\s*\{([^}]*)\}/);
  assert.ok(match, "has a [data-theme=\"dark\"] rule");
  assert.match(match[1], /--color-bg\s*:/);
  assert.match(match[1], /--color-text\s*:/);
});
