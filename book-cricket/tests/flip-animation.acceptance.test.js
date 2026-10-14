const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp } = require("./helpers/app.js");

const CSS = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");

/** Random value that makes flipPage() return `page`. */
function pageValue(page) {
  return (page - 0.5) / 200;
}

/**
 * Boot the app on the game screen with `config`, and replace window.setTimeout with a stub
 * that records callbacks instead of waiting. `fire()` runs the pending callbacks, as if the
 * delay had elapsed, so the tests never use real timers.
 */
function startGame({ config, pages = [] } = {}) {
  const app = loadApp({ random: pages.map(pageValue), config });
  const timers = [];
  app.window.setTimeout = (callback, delay) => {
    timers.push({ callback, delay });
    return timers.length;
  };
  app.$("#p1-name").value = "Asha";
  app.$("#p2-name").value = "Ravi";
  app.click("start-btn");
  app.fire = () => {
    while (timers.length > 0) timers.shift().callback();
  };
  app.timers = timers;
  return app;
}

test("AC: #screen-game contains an element #book", () => {
  const { $ } = loadApp({ config: { animationMs: 0, cpuDelayMs: 0 } });
  assert.ok($("#screen-game #book"));
});

test("AC: with animationMs 0 a flip updates #score immediately and #book does not keep 'flipping'", () => {
  const app = startGame({ config: { animationMs: 0, cpuDelayMs: 0 }, pages: [6] });
  app.click("flip-btn");
  assert.equal(app.$("#score").textContent, "6");
  assert.equal(app.$("#balls-left").textContent, "5");
  assert.equal(app.timers.length, 0);
  assert.ok(!app.$("#book").classList.contains("flipping"));
  assert.equal(app.$("#flip-btn").disabled, false);
});

test("AC: with animationMs 50 the flip is pending right after the click and applies after the delay", () => {
  const app = startGame({ config: { animationMs: 50, cpuDelayMs: 0 }, pages: [6] });
  app.click("flip-btn");
  assert.ok(app.$("#book").classList.contains("flipping"));
  assert.equal(app.$("#flip-btn").disabled, true);
  assert.equal(app.$("#balls-left").textContent, "6");
  assert.equal(app.$("#score").textContent, "0");
  assert.equal(app.timers.length, 1);
  assert.equal(app.timers[0].delay, 50);

  app.fire();
  assert.equal(app.$("#score").textContent, "6");
  assert.equal(app.$("#balls-left").textContent, "5");
  assert.ok(!app.$("#book").classList.contains("flipping"));
  assert.equal(app.$("#flip-btn").disabled, false);
});

test("AC: clicking #flip-btn twice during one animation applies only one ball", () => {
  const app = startGame({ config: { animationMs: 50, cpuDelayMs: 0 }, pages: [6, 4] });
  app.click("flip-btn");
  app.click("flip-btn");
  assert.equal(app.timers.length, 1);

  app.fire();
  assert.equal(app.$("#balls-left").textContent, "5");
  assert.equal(app.$("#score").textContent, "6");
  assert.equal(app.$("#ball-log").children.length, 1);
});

test("without BOOK_CRICKET_CONFIG the animation defaults to 600ms", () => {
  const app = startGame({ pages: [6] });
  app.click("flip-btn");
  assert.equal(app.timers[0].delay, 600);
});

test("style.css disables the page-flip animation under prefers-reduced-motion", () => {
  const rule = CSS.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(rule, "missing @media (prefers-reduced-motion: reduce) rule");
  assert.match(rule[1], /\.book\.flipping \.book-page\s*\{\s*animation:\s*none;?\s*\}/);
});
