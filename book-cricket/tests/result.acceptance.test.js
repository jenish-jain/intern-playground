const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./helpers/app.js");

const CONFIG = { animationMs: 0, cpuDelayMs: 0 };

/** Random value that makes flipPage() return `page`. */
function pageValue(page) {
  return (page - 0.5) / 200;
}

/** Boot the app, fill the setup form and click Start. */
function start({ p1 = "Asha", p2 = "Ravi", balls, pages = [] } = {}) {
  const app = loadApp({ random: pages.map(pageValue), config: CONFIG });
  app.$("#p1-name").value = p1;
  app.$("#p2-name").value = p2;
  if (balls !== undefined) app.$("#balls-select").value = balls;
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

/** Text of each li in the list with the given id. */
function items(document, id) {
  return [...document.querySelectorAll(`#${id} li`)].map((li) => li.textContent);
}

// Innings 1: pages 3,3,3,3,3,7 = 15 runs over 6 balls → target 16.
const FIRST_15 = [3, 3, 3, 3, 3, 7];

test("AC: after innings 1 totals 15, Continue shows a fresh innings 2 chasing 16", () => {
  const app = start({ pages: FIRST_15 });
  flip(app, 6);
  app.click("break-continue-btn");
  assert.deepEqual(visible(app.document), ["screen-game"]);
  assert.equal(app.$("#innings-label").textContent, "Innings 2");
  assert.equal(app.$("#batter-name").textContent, "Ravi");
  assert.equal(app.$("#score").textContent, "0");
  assert.equal(app.$("#balls-left").textContent, "6");
  assert.equal(app.$("#last-page").textContent, "–");
  assert.ok(!app.$("#target-info").classList.contains("hidden"));
  assert.equal(app.$("#target").textContent, "16");
  assert.equal(app.$("#runs-needed").textContent, "16");
  assert.equal(app.$("#ball-log").children.length, 0);
});

test("AC: in innings 2 with target 16, page 6 leaves 10 runs needed", () => {
  const app = start({ pages: [...FIRST_15, 6] });
  flip(app, 6);
  app.click("break-continue-btn");
  flip(app, 1);
  assert.equal(app.$("#runs-needed").textContent, "10");
  assert.deepEqual(items(app.document, "ball-log"), ["Ball 1: Page 6 – 6 runs"]);
});

test("AC: player 2 reaching the target shows the result at once and ignores further flips", () => {
  // Innings 2: 6 + 6 + 4 = 16 after three balls.
  const app = start({ pages: [...FIRST_15, 6, 6, 4, 5] });
  flip(app, 6);
  app.click("break-continue-btn");
  flip(app, 2);
  assert.deepEqual(visible(app.document), ["screen-game"]);
  flip(app, 1);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  assert.equal(app.$("#result-banner").textContent, "Ravi wins!");
  flip(app, 1);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  assert.equal(app.$("#result-p2-score").textContent, "16");
  assert.equal(items(app.document, "result-log-p2").length, 3);
});

test("AC: player 2 out below the target means player 1 wins", () => {
  const app = start({ pages: [...FIRST_15, 4, 20] });
  flip(app, 6);
  app.click("break-continue-btn");
  flip(app, 2);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  assert.equal(app.$("#result-banner").textContent, "Asha wins!");
});

test("AC: equal totals show It's a tie!", () => {
  // Innings 2 mirrors innings 1: 15 runs over 6 balls.
  const app = start({ pages: [...FIRST_15, ...FIRST_15] });
  flip(app, 6);
  app.click("break-continue-btn");
  flip(app, 6);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  assert.equal(app.$("#result-banner").textContent, "It's a tie!");
});

test("AC: result shows both totals and both logs, one li per ball", () => {
  const app = start({ pages: [5, 10, 2, 147, 30] });
  flip(app, 2);
  app.click("break-continue-btn");
  flip(app, 3);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  assert.equal(app.$("#result-p1-score").textContent, "5");
  assert.equal(app.$("#result-p2-score").textContent, "2");
  assert.equal(app.$("#result-banner").textContent, "Asha wins!");
  assert.deepEqual(items(app.document, "result-log-p1"), [
    "Ball 1: Page 5 – 5 runs",
    "Ball 2: Page 10 – OUT",
  ]);
  assert.deepEqual(items(app.document, "result-log-p2"), [
    "Ball 1: Page 2 – 2 runs",
    "Ball 2: Page 147 – Dot ball",
    "Ball 3: Page 30 – OUT",
  ]);
});

test("HTML in a player name is literal text in the result banner", () => {
  const app = start({ p1: "<b>x</b>", pages: [5, 10, 10] });
  flip(app, 1);
  flip(app, 1);
  app.click("break-continue-btn");
  flip(app, 1);
  assert.equal(app.$("#result-banner").textContent, "<b>x</b> wins!");
  assert.equal(app.$("#screen-result b"), null);
});

/** Play a 12-ball match that ends on the first ball of each innings. */
function finishedMatch() {
  const app = start({ balls: "12", pages: [10] });
  flip(app, 1);
  app.click("break-continue-btn");
  flip(app, 1);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  return app;
}

test("AC: Play Again starts innings 1 with the same batter and balls per innings", () => {
  const app = finishedMatch();
  app.click("play-again-btn");
  assert.deepEqual(visible(app.document), ["screen-game"]);
  assert.equal(app.$("#innings-label").textContent, "Innings 1");
  assert.equal(app.$("#score").textContent, "0");
  assert.equal(app.$("#batter-name").textContent, "Asha");
  assert.equal(app.$("#balls-left").textContent, "12");
  assert.equal(app.$("#last-page").textContent, "–");
  assert.equal(app.$("#ball-log").children.length, 0);
  assert.ok(app.$("#target-info").classList.contains("hidden"));
});

test("Play Again keeps the match's names and ignores edited setup inputs", () => {
  const app = finishedMatch();
  app.$("#p1-name").value = "Someone else";
  app.click("play-again-btn");
  assert.equal(app.$("#batter-name").textContent, "Asha");
});

test("AC: Change Players shows setup with the previous names in the inputs", () => {
  const app = start({ p1: "  Asha ", p2: "Ravi", pages: [10] });
  flip(app, 1);
  app.$("#p1-name").value = "";
  app.$("#p2-name").value = "";
  app.click("break-continue-btn");
  flip(app, 1);
  app.click("change-players-btn");
  assert.deepEqual(visible(app.document), ["screen-setup"]);
  assert.equal(app.$("#p1-name").value, "Asha");
  assert.equal(app.$("#p2-name").value, "Ravi");
  assert.ok(app.$("#setup-error").classList.contains("hidden"));
});

test("after Change Players, Start begins a new match", () => {
  const app = finishedMatch();
  app.click("change-players-btn");
  app.$("#p1-name").value = "Mia";
  app.click("start-btn");
  assert.deepEqual(visible(app.document), ["screen-game"]);
  assert.equal(app.$("#batter-name").textContent, "Mia");
  assert.equal(app.$("#innings-label").textContent, "Innings 1");
});
