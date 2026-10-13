const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp } = require("./helpers/app.js");

const SCREENS = ["setup", "toss", "game", "break", "result", "history"];

// Every element id in the DOM contract of docs/architecture.md.
const CONTRACT_IDS = [
  "screen-setup", "p1-name", "p2-name", "balls-select", "toss-toggle", "start-btn",
  "setup-error", "setup-history-btn",
  "screen-toss", "toss-result", "toss-continue-btn",
  "screen-game", "innings-label", "batter-name", "score", "balls-left", "last-page",
  "last-result", "target-info", "target", "runs-needed", "flip-btn", "ball-log",
  "screen-break", "break-score", "break-target", "break-continue-btn",
  "screen-result", "result-banner", "result-p1-score", "result-p2-score", "result-log-p1",
  "result-log-p2", "play-again-btn", "change-players-btn", "view-history-btn",
  "screen-history", "history-table", "history-empty", "reset-history-btn", "history-back-btn",
];

test("script.js can be required in Node", () => {
  assert.doesNotThrow(() => require("../script.js"));
  assert.equal(typeof require("../script.js"), "object");
});

test("only the setup screen is visible on load", () => {
  const { $ } = loadApp();
  for (const name of SCREENS) {
    const section = $(`section#screen-${name}`);
    assert.ok(section, `#screen-${name} exists`);
    assert.equal(section.classList.contains("hidden"), name !== "setup", `#screen-${name} hidden state`);
  }
});

test("every DOM contract id is present", () => {
  const { document } = loadApp();
  for (const id of CONTRACT_IDS) {
    assert.ok(document.getElementById(id), `#${id} exists`);
  }
});

test("contract elements have the expected tags and attributes", () => {
  const { $ } = loadApp();
  assert.equal($("#p1-name").getAttribute("maxlength"), "20");
  assert.equal($("#p2-name").getAttribute("maxlength"), "20");
  assert.equal($("#toss-toggle").type, "checkbox");
  assert.ok($("#setup-error").classList.contains("hidden"));
  assert.ok($("#target-info").classList.contains("hidden"));
  assert.ok($("#target-info #target"));
  assert.ok($("#target-info #runs-needed"));
  for (const id of ["ball-log", "result-log-p1", "result-log-p2"]) {
    assert.equal($(`#${id}`).tagName, "OL", `#${id} is an <ol>`);
  }
  assert.equal($("#history-table").tagName, "TBODY");
});

test("#balls-select offers 6, 12, 18 with 6 selected", () => {
  const { $ } = loadApp();
  const select = $("#balls-select");
  assert.equal(select.tagName, "SELECT");
  assert.deepEqual([...select.options].map((o) => o.value), ["6", "12", "18"]);
  assert.equal(select.value, "6");
});

test("index.html has the viewport meta tag, stylesheet and deferred script", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'));
  const { $ } = loadApp();
  assert.ok($('link[rel="stylesheet"][href="style.css"]'));
  const script = $('script[src="script.js"]');
  assert.ok(script && script.hasAttribute("defer"));
  assert.equal(script.parentElement.tagName, "BODY");
  assert.equal(script.parentElement.lastElementChild, script);
});

test("style.css defines the .hidden utility", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");
  assert.match(css, /\.hidden\s*\{\s*display:\s*none\s*!important;\s*\}/);
  assert.match(css, /:root\s*\{[^}]*--[\w-]+\s*:/);
});

test("loadApp seeds localStorage with JSON-stringified values", () => {
  const { window } = loadApp({ storage: { "bookCricket.players": { p1: "A", p2: "B" } } });
  assert.equal(window.localStorage.getItem("bookCricket.players"), '{"p1":"A","p2":"B"}');
});

test("loadApp stubs Math.random with the given values, then repeats the last", () => {
  const { window } = loadApp({ random: [0.1, 0.2] });
  assert.equal(window.Math.random(), 0.1);
  assert.equal(window.Math.random(), 0.2);
  assert.equal(window.Math.random(), 0.2);
});

test("loadApp stubs Math.random with 0.5 when no values are given", () => {
  const { window } = loadApp();
  assert.equal(window.Math.random(), 0.5);
});

test("loadApp stubs confirm and sets BOOK_CRICKET_CONFIG before the script runs", () => {
  const { window } = loadApp({ confirm: false, config: { animationMs: 0, cpuDelayMs: 0 } });
  assert.equal(window.confirm("Sure?"), false);
  assert.deepEqual({ ...window.BOOK_CRICKET_CONFIG }, { animationMs: 0, cpuDelayMs: 0 });
  assert.equal(loadApp().window.confirm("Sure?"), true);
});
