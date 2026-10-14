const test = require("node:test");
const assert = require("node:assert/strict");
const { tossWinner } = require("../script.js");
const { loadApp } = require("./helpers/app.js");

const CONFIG = { animationMs: 0, cpuDelayMs: 0 };

/** Random value that makes flipPage() return `page`. */
function pageValue(page) {
  return (page - 0.5) / 200;
}

/** Boot the app with the given Math.random values, fill the setup form and click Start. */
function start({ toss = false, random = [], p1 = "Asha", p2 = "Ravi" } = {}) {
  const app = loadApp({ random, config: CONFIG });
  app.$("#p1-name").value = p1;
  app.$("#p2-name").value = p2;
  app.$("#toss-toggle").checked = toss;
  app.click("start-btn");
  return app;
}

/** Click Flip `n` times. */
function flip(app, n) {
  for (let i = 0; i < n; i += 1) app.click("flip-btn");
}

/** Ids of the screen sections that are not hidden. */
function visible(document) {
  return [...document.querySelectorAll("section[id^='screen-']")]
    .filter((s) => !s.classList.contains("hidden"))
    .map((s) => s.id);
}

test("tossWinner: p1 when rng() < 0.5, p2 otherwise", () => {
  assert.equal(tossWinner(() => 0), "p1");
  assert.equal(tossWinner(() => 0.49), "p1");
  assert.equal(tossWinner(() => 0.5), "p2");
  assert.equal(tossWinner(() => 0.99), "p2");
});

test("AC: with #toss-toggle unchecked, Start goes straight to the game with player 1 batting", () => {
  const app = start({ toss: false, random: [0.8] });
  assert.deepEqual(visible(app.document), ["screen-game"]);
  assert.equal(app.$("#batter-name").textContent, "Asha");
});

test("AC: with the toss on and random [0.2], Start shows only the toss screen naming player 1", () => {
  const app = start({ toss: true, random: [0.2] });
  assert.deepEqual(visible(app.document), ["screen-toss"]);
  assert.equal(app.$("#toss-result").textContent, "Asha won the toss and bats first");
});

test("AC: with the toss on and random [0.8], player 2 wins the toss and bats first", () => {
  const app = start({ toss: true, random: [0.8] });
  assert.equal(app.$("#toss-result").textContent, "Ravi won the toss and bats first");
  app.click("toss-continue-btn");
  assert.deepEqual(visible(app.document), ["screen-game"]);
  assert.equal(app.$("#innings-label").textContent, "Innings 1");
  assert.equal(app.$("#batter-name").textContent, "Ravi");
});

// Toss 0.8 → Ravi bats first; pages 3×5 + 7 (dot ball) = 15 runs over 6 balls → target 16.
const RAVI_FIRST_15 = [0.8, ...[3, 3, 3, 3, 3, 7].map(pageValue)];

test("AC: after player 2 bats first, the break target is their score + 1 and player 1 bats in innings 2", () => {
  const app = start({ toss: true, random: RAVI_FIRST_15 });
  app.click("toss-continue-btn");
  flip(app, 6);
  assert.deepEqual(visible(app.document), ["screen-break"]);
  assert.equal(app.$("#break-score").textContent, "Ravi scored 15");
  assert.equal(app.$("#break-target").textContent, "Asha needs 16 to win");
  app.click("break-continue-btn");
  assert.equal(app.$("#innings-label").textContent, "Innings 2");
  assert.equal(app.$("#batter-name").textContent, "Asha");
  assert.equal(app.$("#target").textContent, "16");
});

test("AC: the result names player 1 when they chase successfully after player 2 batted first", () => {
  // Asha chases 16: 6,6,6 = 18.
  const app = start({ toss: true, random: [...RAVI_FIRST_15, ...[6, 6, 6].map(pageValue)] });
  app.click("toss-continue-btn");
  flip(app, 6);
  app.click("break-continue-btn");
  flip(app, 3);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  assert.equal(app.$("#result-banner").textContent, "Asha wins!");
  assert.equal(app.$("#result-p1-score").textContent, "18");
  assert.equal(app.$("#result-p2-score").textContent, "15");
});

test("Play again keeps the tossed batting order without a new toss", () => {
  // Every later Math.random value is 0.2, which would make Asha win a fresh toss.
  const app = start({ toss: true, random: [0.8, 0.2] });
  app.click("toss-continue-btn");
  flip(app, 6);
  app.click("break-continue-btn");
  flip(app, 6);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  app.click("play-again-btn");
  assert.deepEqual(visible(app.document), ["screen-game"]);
  assert.equal(app.$("#innings-label").textContent, "Innings 1");
  assert.equal(app.$("#batter-name").textContent, "Ravi");
});
