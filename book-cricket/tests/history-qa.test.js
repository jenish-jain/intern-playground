const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./helpers/app.js");

const CONFIG = { animationMs: 0, cpuDelayMs: 0 };
const KEY = "bookCricket.history";
const pageValue = (page) => (page - 0.5) / 200;

function startMatch(pages) {
  const app = loadApp({ config: CONFIG, random: pages.map(pageValue) });
  app.$("#p1-name").value = "Asha";
  app.$("#p2-name").value = "Ravi";
  app.click("start-btn");
  return app;
}

const stored = (app) => JSON.parse(app.window.localStorage.getItem(KEY));

test("a tied match is saved once with winner null and shows Tie", () => {
  const app = startMatch([3, 10, 3, 10]);
  app.click("flip-btn");
  app.click("flip-btn");
  app.click("break-continue-btn");
  app.click("flip-btn");
  app.click("flip-btn");
  assert.equal(stored(app).length, 1);
  assert.equal(stored(app)[0].winner, null);
  assert.equal(stored(app)[0].p1.score, 3);
  assert.equal(stored(app)[0].p2.score, 3);
  app.click("view-history-btn");
  const cells = [...app.document.querySelectorAll("#history-table tr")[0].children].map((c) => c.textContent);
  assert.deepEqual(cells.slice(1), ["Asha (3)", "Ravi (3)", "Tie", "6"]);
});

test("nothing is saved before the match finishes", () => {
  const app = startMatch([3, 10]);
  app.click("flip-btn");
  app.click("flip-btn");
  assert.equal(app.window.localStorage.getItem(KEY), null);
});

test("play again then finishing saves a second entry, newest first", () => {
  const app = startMatch([3, 10, 6, 3, 10, 3, 10]);
  app.click("flip-btn");
  app.click("flip-btn");
  app.click("break-continue-btn");
  app.click("flip-btn");
  assert.equal(stored(app).length, 1);
  app.click("play-again-btn");
  assert.equal(stored(app).length, 1);
  app.click("flip-btn");
  app.click("flip-btn");
  app.click("break-continue-btn");
  app.click("flip-btn");
  app.click("flip-btn");
  assert.equal(stored(app).length, 2);
  assert.equal(stored(app)[0].winner, null);
});

test("player names are rendered as text, not HTML", () => {
  const entry = { date: "2026-03-04T05:06:00.000Z", p1: { name: "<b>x</b>", score: 1 }, p2: { name: "Ravi", score: 2 }, winner: "Ravi", ballsPerInnings: 6 };
  const app = loadApp({ storage: { [KEY]: [entry] }, config: CONFIG });
  app.click("setup-history-btn");
  assert.equal(app.$("#history-table tr td:nth-child(2)").textContent, "<b>x</b> (1)");
  assert.equal(app.document.querySelectorAll("#history-table b").length, 0);
});
