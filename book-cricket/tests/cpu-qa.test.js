const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./helpers/app.js");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pageValue = (page) => (page - 0.5) / 200;

function boot(pages, cpuDelayMs) {
  const app = loadApp({ random: pages.map(pageValue), config: { animationMs: 0, cpuDelayMs } });
  app.$("#p1-name").value = "Asha";
  app.$("#cpu-toggle").click();
  app.click("start-btn");
  return app;
}

test("AC: computer innings 2 with pages 4,6,7,10 shows computer score 10", async () => {
  const app = boot([6, 6, 6, 10, 4, 6, 7, 10], 0);
  for (let i = 0; i < 4; i += 1) app.click("flip-btn");
  app.click("break-continue-btn");
  await wait(50);
  assert.equal(app.$("#screen-result").classList.contains("hidden"), false);
  assert.equal(app.$("#result-p2-score").textContent, "10");
  assert.match(app.$("#result-banner").textContent, /Asha wins!/);
});

test("AC: flip button enabled for human batting, disabled for computer", () => {
  const app = boot([10], 1000);
  assert.equal(app.$("#flip-btn").disabled, false);
  app.click("flip-btn");
  app.click("break-continue-btn");
  assert.equal(app.$("#batter-name").textContent, "Computer");
  assert.equal(app.$("#flip-btn").disabled, true);
  app.click("change-players-btn");
});

test("AC: change players stops flips (cpuDelayMs 10)", async () => {
  const app = boot([10, 1, 1, 1, 1, 1], 10);
  app.click("flip-btn");
  app.click("break-continue-btn");
  app.click("change-players-btn");
  const before = app.$("#balls-left").textContent;
  await wait(50);
  assert.equal(app.$("#balls-left").textContent, before);
  assert.equal(app.$("#screen-setup").classList.contains("hidden"), false);
});

test("AC: finished vs Computer match is saved once with p2.name Computer", async () => {
  const app = boot([6, 6, 6, 10, 4, 6, 7, 10], 0);
  for (let i = 0; i < 4; i += 1) app.click("flip-btn");
  app.click("break-continue-btn");
  await wait(50);
  const history = JSON.parse(app.window.localStorage.getItem("bookCricket.history"));
  assert.equal(history.length, 1);
  assert.equal(history[0].p2.name, "Computer");
  assert.equal(history[0].p1.name, "Asha");
});

test("without the toggle, p2 is human and flip stays enabled", () => {
  const app = loadApp({ random: [pageValue(10)], config: { animationMs: 0, cpuDelayMs: 0 } });
  app.$("#p1-name").value = "Asha";
  app.$("#p2-name").value = "Ravi";
  app.click("start-btn");
  app.click("flip-btn");
  app.click("break-continue-btn");
  assert.equal(app.$("#batter-name").textContent, "Ravi");
  assert.equal(app.$("#flip-btn").disabled, false);
});
