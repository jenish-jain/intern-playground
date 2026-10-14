const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./helpers/app.js");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Random value that makes flipPage() return `page`. */
function pageValue(page) {
  return (page - 0.5) / 200;
}

/** Boot the app, tick vs Computer and Start; Asha (p1) bats first. */
function startCpu({ pages = [], cpuDelayMs = 0 } = {}) {
  const app = loadApp({ random: pages.map(pageValue), config: { animationMs: 0, cpuDelayMs } });
  app.$("#p1-name").value = "Asha";
  app.$("#cpu-toggle").click();
  app.click("start-btn");
  return app;
}

/** Asha is out first ball (page 10), then the computer's innings begins. */
function startComputerInnings(options) {
  const app = startCpu(options);
  app.click("flip-btn");
  app.click("break-continue-btn");
  return app;
}

test("checking #cpu-toggle disables #p2-name and Start names player 2 Computer", () => {
  const app = startCpu();
  assert.equal(app.$("#p2-name").disabled, true);
  assert.equal(app.$("#p2-name").value, "Computer");
  assert.equal(app.$("#batter-name").textContent, "Asha");
});

test("unchecking #cpu-toggle restores the typed player 2 name", () => {
  const app = loadApp();
  app.$("#p2-name").value = "Ravi";
  app.$("#cpu-toggle").click();
  app.$("#cpu-toggle").click();
  assert.equal(app.$("#p2-name").disabled, false);
  assert.equal(app.$("#p2-name").value, "Ravi");
});

test("computer innings plays itself to the result and is saved in history", async () => {
  const app = startCpu({ pages: [6, 6, 6, 10, 4, 6, 7, 10] });
  for (let i = 0; i < 4; i += 1) app.click("flip-btn");
  app.click("break-continue-btn");
  await wait(300);
  assert.equal(app.$("#screen-result").classList.contains("hidden"), false);
  assert.equal(app.$("#result-p2-score").textContent, "10");
  const history = JSON.parse(app.window.localStorage.getItem("bookCricket.history"));
  assert.equal(history.length, 1);
  assert.equal(history[0].p2.name, "Computer");
});

test("#flip-btn is disabled only while the computer is batting", () => {
  const app = startCpu({ pages: [10], cpuDelayMs: 1000 });
  assert.equal(app.$("#flip-btn").disabled, false);
  app.click("flip-btn");
  assert.equal(app.$("#flip-btn").disabled, false);
  app.click("break-continue-btn");
  assert.equal(app.$("#flip-btn").disabled, true);
  app.click("change-players-btn");
});

test("#flip-btn click is ignored while the computer is batting", () => {
  const app = startComputerInnings({ pages: [10, 4], cpuDelayMs: 1000 });
  app.click("flip-btn");
  assert.equal(app.$("#balls-left").textContent, "6");
  app.click("change-players-btn");
});

test("#change-players-btn during a computer innings stops automatic flips", async () => {
  const app = startComputerInnings({ pages: [10, 1, 1, 1, 1, 1], cpuDelayMs: 10 });
  assert.equal(app.$("#balls-left").textContent, "6");
  app.click("change-players-btn");
  await wait(50);
  assert.equal(app.$("#balls-left").textContent, "6");
  assert.equal(app.$("#score").textContent, "0");
  assert.equal(app.$("#screen-setup").classList.contains("hidden"), false);
});

test("the computer's toss win still waits for a human click", async () => {
  const app = loadApp({ random: [0.9], config: { animationMs: 0, cpuDelayMs: 0 } });
  app.$("#p1-name").value = "Asha";
  app.$("#cpu-toggle").click();
  app.$("#toss-toggle").click();
  app.click("start-btn");
  assert.equal(app.$("#toss-result").textContent, "Computer won the toss and bats first");
  await wait(20);
  assert.equal(app.$("#screen-toss").classList.contains("hidden"), false);
  app.click("toss-continue-btn");
  assert.equal(app.$("#flip-btn").disabled, true);
  await wait(300);
  assert.equal(app.$("#screen-break").classList.contains("hidden"), false);
});
