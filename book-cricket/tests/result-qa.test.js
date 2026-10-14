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

test("QA: innings 1 all out on ball 1 for 0 gives target 1 and runs needed 1", () => {
  const app = start({ pages: [10] });
  flip(app, 1);
  assert.deepEqual(visible(app.document), ["screen-break"]);
  app.click("break-continue-btn");
  assert.equal(app.$("#target").textContent, "1");
  assert.equal(app.$("#runs-needed").textContent, "1");
  assert.equal(app.$("#batter-name").textContent, "Ravi");
});

test("QA: overshooting the target ends the match and runs needed never goes negative", () => {
  // Innings 1: 2 then out → target 3; innings 2: page 6 overshoots.
  const app = start({ pages: [2, 10, 6] });
  flip(app, 2);
  app.click("break-continue-btn");
  flip(app, 1);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  assert.equal(app.$("#result-banner").textContent, "Ravi wins!");
  assert.equal(app.$("#result-p1-score").textContent, "2");
  assert.equal(app.$("#result-p2-score").textContent, "6");
  assert.ok(Number(app.$("#runs-needed").textContent) >= 0);
});

test("QA: player 2 running out of balls below target means player 1 wins", () => {
  const app = start({ pages: [...[6, 6, 6, 6, 6, 6], 1, 1, 1, 1, 1, 1] });
  flip(app, 6);
  app.click("break-continue-btn");
  flip(app, 5);
  assert.deepEqual(visible(app.document), ["screen-game"]);
  assert.equal(app.$("#runs-needed").textContent, "32");
  flip(app, 1);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  assert.equal(app.$("#result-banner").textContent, "Asha wins!");
  assert.equal(items(app.document, "result-log-p1").length, 6);
  assert.equal(items(app.document, "result-log-p2").length, 6);
});

test("QA: tie when player 2 is out with equal score", () => {
  const app = start({ pages: [4, 10, 4, 10] });
  flip(app, 2);
  app.click("break-continue-btn");
  flip(app, 2);
  assert.equal(app.$("#result-banner").textContent, "It's a tie!");
  assert.equal(app.$("#result-p1-score").textContent, "4");
  assert.equal(app.$("#result-p2-score").textContent, "4");
});

test("QA: Play Again with 18 balls keeps 18 and a full second match plays through", () => {
  const app = start({ balls: "18", pages: [10, 10, 3, 10, 2, 10] });
  flip(app, 1);
  app.click("break-continue-btn");
  flip(app, 1);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  app.click("play-again-btn");
  assert.equal(app.$("#balls-left").textContent, "18");
  assert.equal(app.$("#batter-name").textContent, "Asha");
  assert.equal(app.$("#ball-log").children.length, 0);
  flip(app, 2);
  assert.deepEqual(visible(app.document), ["screen-break"]);
  app.click("break-continue-btn");
  assert.equal(app.$("#target").textContent, "4");
  assert.equal(app.$("#balls-left").textContent, "18");
  flip(app, 2);
  assert.deepEqual(visible(app.document), ["screen-result"]);
  assert.equal(app.$("#result-banner").textContent, "Asha wins!");
  assert.deepEqual(items(app.document, "result-log-p1"), ["Ball 1: Page 3 – 3 runs", "Ball 2: Page 10 – OUT"]);
  assert.deepEqual(items(app.document, "result-log-p2"), ["Ball 1: Page 2 – 2 runs", "Ball 2: Page 10 – OUT"]);
});

test("QA: Change Players restores default names when blanks were used", () => {
  const app = start({ p1: "", p2: " ", pages: [10] });
  flip(app, 1);
  app.click("break-continue-btn");
  flip(app, 1);
  app.click("change-players-btn");
  assert.deepEqual(visible(app.document), ["screen-setup"]);
  assert.equal(app.$("#p1-name").value, "Player 1");
  assert.equal(app.$("#p2-name").value, "Player 2");
});

test("QA: setup re-renders do not clobber names typed after Change Players", () => {
  const app = start({ pages: [10] });
  flip(app, 1);
  app.click("break-continue-btn");
  flip(app, 1);
  app.click("change-players-btn");
  app.$("#p1-name").value = "Mia";
  app.click("theme-toggle");
  assert.equal(app.$("#p1-name").value, "Mia");
});
