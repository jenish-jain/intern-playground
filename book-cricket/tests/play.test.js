const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeNames } = require("../script.js");
const { loadApp } = require("./helpers/app.js");

const CONFIG = { animationMs: 0, cpuDelayMs: 0 };

/** Random value that makes flipPage() return `page`. */
function pageValue(page) {
  return (page - 0.5) / 200;
}

/** Boot the app with the given pages queued and start a match. */
function startMatch({ p1 = "Asha", p2 = "Ravi", balls = "6", pages = [] } = {}) {
  const app = loadApp({ random: pages.map(pageValue), config: CONFIG });
  app.$("#p1-name").value = p1;
  app.$("#p2-name").value = p2;
  app.$("#balls-select").value = balls;
  app.click("start-btn");
  return app;
}

/** Ids of the screen sections that are not hidden. */
function visibleScreens(document) {
  return [...document.querySelectorAll("section[id^='screen-']")]
    .filter((s) => !s.classList.contains("hidden"))
    .map((s) => s.id);
}

/** Text of each #ball-log item. */
function logItems(document) {
  return [...document.querySelectorAll("#ball-log li")].map((li) => li.textContent);
}

test("normalizeNames trims names", () => {
  assert.deepEqual(normalizeNames("  Asha ", "Ravi"), { p1: "Asha", p2: "Ravi", error: null });
});

test("normalizeNames defaults blank names", () => {
  assert.deepEqual(normalizeNames("", "   "), { p1: "Player 1", p2: "Player 2", error: null });
});

test("normalizeNames rejects names equal ignoring case and spaces", () => {
  assert.equal(normalizeNames("asha", "ASHA ").error, "Players must have different names");
});

test("normalizeNames accepts two blank names (the defaults differ)", () => {
  assert.equal(normalizeNames(" ", "").error, null);
});

test("duplicate names keep the setup screen and show #setup-error", () => {
  const { document, $ } = startMatch({ p1: "Asha", p2: "asha" });
  assert.deepEqual(visibleScreens(document), ["screen-setup"]);
  assert.equal($("#setup-error").classList.contains("hidden"), false);
  assert.equal($("#setup-error").textContent, "Players must have different names");
});

test("fixing the names after an error starts the match and hides the error", () => {
  const app = startMatch({ p1: "Asha", p2: "asha" });
  app.$("#p2-name").value = "Ravi";
  app.click("start-btn");
  assert.deepEqual(visibleScreens(app.document), ["screen-game"]);
  assert.ok(app.$("#setup-error").classList.contains("hidden"));
});

test("Start shows only the game screen with a fresh scoreboard", () => {
  const { document, $ } = startMatch({ balls: "12" });
  assert.deepEqual(visibleScreens(document), ["screen-game"]);
  assert.equal($("#batter-name").textContent, "Asha");
  assert.equal($("#score").textContent, "0");
  assert.equal($("#balls-left").textContent, "12");
  assert.equal($("#innings-label").textContent, "Innings 1");
  assert.equal($("#last-page").textContent, "–");
  assert.equal($("#last-result").textContent, "–");
  assert.equal(logItems(document).length, 0);
});

test("one flip shows the page, result, balls left and a log item", () => {
  const { document, $, click } = startMatch({ pages: [147] });
  click("flip-btn");
  assert.equal($("#last-page").textContent, "147");
  assert.equal($("#last-result").textContent, "Dot ball");
  assert.equal($("#balls-left").textContent, "5");
  assert.deepEqual(logItems(document), ["Ball 1: Page 147 – Dot ball"]);
});

test("flipping pages 4 then 6 scores 10 with two log items in order", () => {
  const { document, $, click } = startMatch({ pages: [4, 6] });
  click("flip-btn");
  click("flip-btn");
  assert.equal($("#score").textContent, "10");
  assert.deepEqual(logItems(document), ["Ball 1: Page 4 – 4 runs", "Ball 2: Page 6 – 6 runs"]);
});

test("#target-info is hidden during innings 1", () => {
  const { $, click } = startMatch({ pages: [3] });
  assert.ok($("#target-info").classList.contains("hidden"));
  click("flip-btn");
  assert.ok($("#target-info").classList.contains("hidden"));
});

test("OUT on the first ball shows only the break screen with score 0 and target 1", () => {
  const { document, $, click } = startMatch({ pages: [10] });
  click("flip-btn");
  assert.deepEqual(visibleScreens(document), ["screen-break"]);
  assert.match($("#break-score").textContent, /0/);
  assert.match($("#break-target").textContent, /1/);
});

test("six non-out balls totalling 15 show the break screen with target 16", () => {
  const { document, $, click } = startMatch({ pages: [1, 2, 3, 4, 5, 7] });
  for (let i = 0; i < 6; i += 1) click("flip-btn");
  assert.deepEqual(visibleScreens(document), ["screen-break"]);
  assert.match($("#break-score").textContent, /15/);
  assert.match($("#break-target").textContent, /16/);
});

test("player names are shown as literal text", () => {
  const { $ } = startMatch({ p1: "<b>x</b>" });
  assert.equal($("#batter-name").textContent, "<b>x</b>");
  assert.equal($("#batter-name b"), null);
});
