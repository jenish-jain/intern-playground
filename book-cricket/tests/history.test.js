const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./helpers/app.js");

const CONFIG = { animationMs: 0, cpuDelayMs: 0 };
const KEY = "bookCricket.history";

/** Random value that makes flipPage() return `page`. */
function pageValue(page) {
  return (page - 0.5) / 200;
}

function entry(winner, p1Score = 18, p2Score = 10, date = "2026-03-04T05:06:00.000Z") {
  return {
    date,
    p1: { name: "Asha", score: p1Score },
    p2: { name: "Ravi", score: p2Score },
    winner,
    ballsPerInnings: 6,
    battedFirst: "p1",
  };
}

/** Play a full match: Asha scores 3 then is out, Ravi chases 4 with a 6 and wins. */
function playMatch(storage = {}, confirm = true) {
  const app = loadApp({ storage, confirm, config: CONFIG, random: [3, 10, 6].map(pageValue) });
  app.$("#p1-name").value = "Asha";
  app.$("#p2-name").value = "Ravi";
  app.click("start-btn");
  app.click("flip-btn");
  app.click("flip-btn");
  app.click("break-continue-btn");
  app.click("flip-btn");
  return app;
}

function visible(document) {
  return [...document.querySelectorAll("section[id^='screen-']")]
    .filter((s) => !s.classList.contains("hidden"))
    .map((s) => s.id);
}

function stored(app) {
  return JSON.parse(app.window.localStorage.getItem(KEY));
}

test("finishing a match saves exactly one entry, and result-screen activity adds none", () => {
  const app = playMatch();
  assert.equal(stored(app).length, 1);
  const [saved] = stored(app);
  assert.equal(saved.p1.score, 3);
  assert.equal(saved.p2.score, 6);
  assert.equal(saved.winner, "Ravi");
  app.click("view-history-btn");
  app.click("history-back-btn");
  app.click("flip-btn");
  app.click("change-players-btn");
  assert.equal(stored(app).length, 1);
});

test("history screen lists stored entries in order and hides the empty message", () => {
  const app = loadApp({ storage: { [KEY]: [entry(null), entry("Asha"), entry("Ravi")] }, config: CONFIG });
  app.click("setup-history-btn");
  assert.deepEqual(visible(app.document), ["screen-history"]);
  const rows = app.document.querySelectorAll("#history-table tr");
  assert.equal(rows.length, 3);
  assert.ok(app.$("#history-empty").classList.contains("hidden"));
  const cells = [...rows[1].children].map((td) => td.textContent);
  assert.match(cells[0], /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  assert.deepEqual(cells.slice(1), ["Asha (18)", "Ravi (10)", "Asha", "6"]);
  assert.equal(rows[0].children[3].textContent, "Tie");
});

test("empty history shows the empty message and no rows", () => {
  const app = loadApp({ config: CONFIG });
  app.click("setup-history-btn");
  assert.equal(app.document.querySelectorAll("#history-table tr").length, 0);
  assert.ok(!app.$("#history-empty").classList.contains("hidden"));
});

test("reset clears history only when confirmed", () => {
  const storage = { [KEY]: [entry("Asha"), entry(null)] };
  const no = loadApp({ storage, confirm: false, config: CONFIG });
  no.click("setup-history-btn");
  no.click("reset-history-btn");
  assert.equal(no.document.querySelectorAll("#history-table tr").length, 2);
  assert.equal(stored(no).length, 2);

  const yes = loadApp({ storage, confirm: true, config: CONFIG });
  yes.click("setup-history-btn");
  yes.click("reset-history-btn");
  assert.equal(yes.document.querySelectorAll("#history-table tr").length, 0);
  assert.deepEqual(JSON.parse(yes.window.localStorage.getItem(KEY) ?? "[]"), []);
  assert.ok(!yes.$("#history-empty").classList.contains("hidden"));
});

test("back returns to the screen history was opened from", () => {
  const setup = loadApp({ config: CONFIG });
  setup.click("setup-history-btn");
  setup.click("history-back-btn");
  assert.deepEqual(visible(setup.document), ["screen-setup"]);

  const result = playMatch();
  result.click("view-history-btn");
  assert.deepEqual(visible(result.document), ["screen-history"]);
  result.click("history-back-btn");
  assert.deepEqual(visible(result.document), ["screen-result"]);
});

test("a saved match appears in history after a fresh load", () => {
  const first = playMatch();
  const fresh = loadApp({ storage: { [KEY]: stored(first) }, config: CONFIG });
  fresh.click("setup-history-btn");
  const rows = fresh.document.querySelectorAll("#history-table tr");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].children[3].textContent, "Ravi");
});
