const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp } = require("./helpers/app.js");

const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");

/** Read the stored theme, decoding the JSON encoding used for every key. */
function storedTheme(window) {
  const raw = window.localStorage.getItem("bookCricket.theme");
  return raw === null ? null : JSON.parse(raw);
}

test("AC1: toggle sets dark then light on <html> and in storage, repeatedly", () => {
  const { window, document, click } = loadApp();
  const html = document.documentElement;
  assert.equal(storedTheme(window), null, "nothing stored before a click");

  for (let i = 0; i < 2; i += 1) {
    click("theme-toggle");
    assert.equal(html.getAttribute("data-theme"), "dark");
    assert.equal(storedTheme(window), "dark");

    click("theme-toggle");
    assert.equal(html.hasAttribute("data-theme"), false);
    assert.equal(storedTheme(window), "light");
  }
});

test("AC1: toggling from a dark system preference goes light and stores light", () => {
  const { window, document, click } = loadApp({ colorScheme: { dark: true } });
  assert.equal(document.documentElement.getAttribute("data-theme"), "dark");
  click("theme-toggle");
  assert.equal(document.documentElement.hasAttribute("data-theme"), false);
  assert.equal(storedTheme(window), "light");
});

test("AC1/AC2: the toggled choice survives a reload", () => {
  const first = loadApp();
  first.click("theme-toggle");
  const saved = storedTheme(first.window);

  const second = loadApp({ storage: { "bookCricket.theme": saved } });
  assert.equal(second.document.documentElement.getAttribute("data-theme"), "dark");
});

test("AC2: saved 'dark' wins over a light system preference", () => {
  const { document } = loadApp({ storage: { "bookCricket.theme": "dark" }, colorScheme: { dark: false } });
  assert.equal(document.documentElement.getAttribute("data-theme"), "dark");
});

test("AC2: saved 'dark' starts dark and the toggle reflects it", () => {
  const { $ } = loadApp({ storage: { "bookCricket.theme": "dark" } });
  assert.equal($("#theme-toggle").getAttribute("aria-pressed"), "true");
});

test("AC3: an invalid saved theme falls back to the system preference", () => {
  const dark = loadApp({ storage: { "bookCricket.theme": "purple" }, colorScheme: { dark: true } });
  assert.equal(dark.document.documentElement.getAttribute("data-theme"), "dark");

  const light = loadApp({ storage: { "bookCricket.theme": 42 } });
  assert.equal(light.document.documentElement.hasAttribute("data-theme"), false);
});

test("AC3: matchMedia undefined with no saved theme starts light without throwing", () => {
  const { window, document, $ } = loadApp();
  assert.equal(typeof window.matchMedia, "undefined");
  assert.equal(document.documentElement.hasAttribute("data-theme"), false);
  assert.equal($("#theme-toggle").getAttribute("aria-pressed"), "false");
});

test("#theme-toggle is visible on every screen (not inside any screen section, not hidden)", () => {
  const { document, $ } = loadApp();
  const toggle = $("#theme-toggle");
  assert.ok(toggle);
  for (const section of document.querySelectorAll("section[id^='screen-']")) {
    assert.equal(section.contains(toggle), false, `${section.id} does not contain the toggle`);
  }
  for (let el = toggle; el; el = el.parentElement) {
    assert.equal(el.classList.contains("hidden"), false, "no ancestor is hidden");
    assert.equal(el.hasAttribute("hidden"), false, "no ancestor has the hidden attribute");
  }
});

test("AC4: [data-theme=\"dark\"] overrides background and text custom properties defined on :root", () => {
  const root = css.match(/:root\s*\{([^}]*)\}/);
  assert.ok(root, "has a :root rule");
  const dark = css.match(/\[data-theme="dark"\]\s*\{([^}]*)\}/);
  assert.ok(dark, "has a [data-theme=\"dark\"] rule");

  for (const prop of ["--color-bg", "--color-text"]) {
    const re = new RegExp(`${prop}\\s*:\\s*([^;]+);`);
    const lightValue = root[1].match(re);
    const darkValue = dark[1].match(re);
    assert.ok(lightValue, `${prop} defined on :root`);
    assert.ok(darkValue, `${prop} overridden in dark`);
    assert.notEqual(darkValue[1].trim(), lightValue[1].trim(), `${prop} differs in dark`);
  }
});

test("AC4: body uses the background and text custom properties", () => {
  const body = css.match(/(^|\n)\s*body\s*\{([^}]*)\}/);
  assert.ok(body, "has a body rule");
  assert.match(body[2], /var\(--color-bg\)/);
  assert.match(body[2], /var\(--color-text\)/);
});
