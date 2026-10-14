const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./helpers/app.js");

const CONFIG = { animationMs: 0, cpuDelayMs: 0 };

/** Random value that makes flipPage() return `page`. */
function pageValue(page) {
  return (page - 0.5) / 200;
}

/** Boot the app with saved storage, fill the setup form and click Start. */
function start({ p1 = "Asha", p2 = "Ravi", pages = [], storage, rawStorage } = {}) {
  const app = loadApp({ storage, rawStorage, random: pages.map(pageValue), config: CONFIG });
  app.$("#p1-name").value = p1;
  app.$("#p2-name").value = p2;
  app.click("start-btn");
  return app;
}

/** Click Flip `n` times. */
function flip(app, n) {
  for (let i = 0; i < n; i += 1) app.click("flip-btn");
}

// Asha scores 2 in innings 1 and is out; Ravi is out for 0 → Asha wins.
const ASHA_WINS = [2, 10, 10];
// Both are out for 0 → tie.
const TIE = [10, 10];

test("AC: after finishing a match won by Asha, #tally-p1 and #tally-p2 show the records", () => {
  const app = start({ pages: ASHA_WINS });
  flip(app, 2);
  app.click("break-continue-btn");
  flip(app, 1);
  assert.equal(app.$("#result-banner").textContent, "Asha wins!");
  assert.equal(app.$("#tally-p1").textContent, "W 1 · L 0 · T 0");
  assert.equal(app.$("#tally-p2").textContent, "W 0 · L 1 · T 0");
});

test("AC: a tied match adds a tie to both players' records", () => {
  const app = start({ pages: TIE });
  flip(app, 1);
  app.click("break-continue-btn");
  flip(app, 1);
  assert.equal(app.$("#result-banner").textContent, "It's a tie!");
  assert.equal(app.$("#tally-p1").textContent, "W 0 · L 0 · T 1");
  assert.equal(app.$("#tally-p2").textContent, "W 0 · L 0 · T 1");
});

test("AC: the tally accumulates over matches and is stored once per finished match", () => {
  const app = start({ pages: [...ASHA_WINS, ...ASHA_WINS] });
  flip(app, 2);
  app.click("break-continue-btn");
  flip(app, 1);
  app.click("play-again-btn");
  flip(app, 2);
  app.click("break-continue-btn");
  flip(app, 1);
  assert.equal(app.$("#tally-p1").textContent, "W 2 · L 0 · T 0");
  assert.equal(app.$("#tally-p2").textContent, "W 0 · L 2 · T 0");
  const stored = JSON.parse(app.window.localStorage.getItem("bookCricket.tally"));
  assert.deepEqual(stored, {
    Asha: { w: 2, l: 0, t: 0 },
    Ravi: { w: 0, l: 2, t: 0 },
  });
});

test("AC: a stored record for 'asha' is incremented and stored under the current spelling", () => {
  const app = start({
    pages: ASHA_WINS,
    storage: { "bookCricket.tally": { asha: { w: 4, l: 1, t: 0 } } },
  });
  flip(app, 2);
  app.click("break-continue-btn");
  flip(app, 1);
  assert.equal(app.$("#tally-p1").textContent, "W 5 · L 1 · T 0");
  const stored = JSON.parse(app.window.localStorage.getItem("bookCricket.tally"));
  assert.deepEqual(stored.Asha, { w: 5, l: 1, t: 0 });
  assert.equal(Object.hasOwn(stored, "asha"), false);
});

test("AC: with invalid JSON in bookCricket.tally, finishing a match starts a fresh tally without throwing", () => {
  const app = start({ pages: ASHA_WINS, rawStorage: { "bookCricket.tally": "not json" } });
  flip(app, 2);
  app.click("break-continue-btn");
  flip(app, 1);
  assert.equal(app.$("#result-banner").textContent, "Asha wins!");
  assert.equal(app.$("#tally-p1").textContent, "W 1 · L 0 · T 0");
  assert.deepEqual(JSON.parse(app.window.localStorage.getItem("bookCricket.tally")), {
    Asha: { w: 1, l: 0, t: 0 },
    Ravi: { w: 0, l: 1, t: 0 },
  });
});

test("AC: confirming reset history leaves bookCricket.tally unchanged", () => {
  const tally = { Asha: { w: 3, l: 0, t: 1 }, Ravi: { w: 0, l: 3, t: 1 } };
  const history = [{
    date: "2026-01-01T00:00:00.000Z",
    p1: { name: "Asha", score: 2 },
    p2: { name: "Ravi", score: 0 },
    winner: "Asha",
    ballsPerInnings: 6,
    battedFirst: "p1",
  }];
  const app = loadApp({
    storage: { "bookCricket.tally": tally, "bookCricket.history": history },
    config: CONFIG,
  });
  app.click("setup-history-btn");
  const before = app.window.localStorage.getItem("bookCricket.tally");
  app.click("reset-history-btn");
  assert.equal(app.window.localStorage.getItem("bookCricket.tally"), before);
  assert.equal(app.window.localStorage.getItem("bookCricket.history"), null);
});

test("players with no earlier record start from zero before their first match is counted", () => {
  const app = start({ p1: "Meera", p2: "Dev", pages: ASHA_WINS });
  flip(app, 2);
  app.click("break-continue-btn");
  flip(app, 1);
  assert.equal(app.$("#tally-p1").textContent, "W 1 · L 0 · T 0");
  assert.equal(app.$("#tally-p2").textContent, "W 0 · L 1 · T 0");
});
