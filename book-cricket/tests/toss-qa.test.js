const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./helpers/app.js");

const CONFIG = { animationMs: 0, cpuDelayMs: 0 };

/** Random value that makes flipPage() return `page`. */
function pageValue(page) {
  return (page - 0.5) / 200;
}

/** Boot the app, fill the setup form and click Start. */
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

test("QA: toss off consumes no Math.random value; the first flip uses the first value", () => {
  const app = start({ toss: false, random: [pageValue(147)] });
  flip(app, 1);
  assert.equal(app.$("#last-page").textContent.includes("147"), true);
});

test("QA: toss on, the coin uses the first value and the first flip the second", () => {
  const app = start({ toss: true, random: [0.8, pageValue(147)] });
  app.click("toss-continue-btn");
  flip(app, 1);
  assert.equal(app.$("#batter-name").textContent, "Ravi");
  assert.equal(app.$("#last-page").textContent.includes("147"), true);
});

test("QA: toss with blank names uses the default names", () => {
  const app = start({ toss: true, random: [0.8], p1: "", p2: "" });
  assert.equal(app.$("#toss-result").textContent, "Player 2 won the toss and bats first");
});

test("QA: toss boundary 0.5 means player 2 bats first", () => {
  const app = start({ toss: true, random: [0.5] });
  assert.equal(app.$("#toss-result").textContent, "Ravi won the toss and bats first");
});

test("QA: toss on with duplicate names stays on setup with the error and no toss screen", () => {
  const app = start({ toss: true, random: [0.8], p1: "Asha", p2: "asha" });
  assert.deepEqual(visible(app.document), ["screen-setup"]);
  assert.notEqual(app.$("#setup-error").textContent, "");
});

test("QA: toss result shows player names as text, not HTML", () => {
  const app = start({ toss: true, random: [0.2], p1: "<b>Asha</b>" });
  assert.equal(app.$("#toss-result").textContent, "<b>Asha</b> won the toss and bats first");
  assert.equal(app.$("#toss-result").children.length, 0);
});

test("QA: toss screen to game shows a fresh innings 1 scoreboard", () => {
  const app = start({ toss: true, random: [0.8] });
  app.click("toss-continue-btn");
  assert.equal(app.$("#score").textContent, "0");
  assert.equal(app.$("#balls-left").textContent, "6");
  assert.ok(app.$("#target-info").classList.contains("hidden"));
});

test("QA: when player 2 bats first and player 1 falls short, player 2 wins", () => {
  // Ravi scores 15; Asha scores 6 dot-balled out to 6 runs.
  const random = [0.8, ...[3, 3, 3, 3, 3, 7].map(pageValue), ...[6, 7, 7, 7, 7, 7].map(pageValue)];
  const app = start({ toss: true, random });
  app.click("toss-continue-btn");
  flip(app, 6);
  app.click("break-continue-btn");
  flip(app, 6);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  assert.equal(app.$("#result-banner").textContent, "Ravi wins!");
  assert.equal(app.$("#result-p1-score").textContent, "6");
  assert.equal(app.$("#result-p2-score").textContent, "15");
});

test("QA: Change players and Start again with the toss on runs a new toss", () => {
  const app = start({ toss: true, random: [0.8, 0.2] });
  app.click("toss-continue-btn");
  app.click("change-players-btn");
  app.$("#toss-toggle").checked = true;
  app.click("start-btn");
  assert.deepEqual(visible(app.document), ["screen-toss"]);
  assert.equal(app.$("#toss-result").textContent, "Asha won the toss and bats first");
});
