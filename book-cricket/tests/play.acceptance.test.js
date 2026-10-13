const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeNames } = require("../script.js");
const { loadApp } = require("./helpers/app.js");

const CONFIG = { animationMs: 0, cpuDelayMs: 0 };

/** Random value that makes flipPage() return `page`. */
function pageValue(page) {
  return (page - 0.5) / 200;
}

/** Boot the app, fill the setup form and click Start. */
function start({ p1 = "Asha", p2 = "Ravi", balls, toss = false, pages = [] } = {}) {
  const app = loadApp({ random: pages.map(pageValue), config: CONFIG });
  app.$("#p1-name").value = p1;
  app.$("#p2-name").value = p2;
  if (balls !== undefined) app.$("#balls-select").value = balls;
  app.$("#toss-toggle").checked = toss;
  app.click("start-btn");
  return app;
}

/** Ids of the screen sections that are not hidden. */
function visible(document) {
  return [...document.querySelectorAll("section[id^='screen-']")]
    .filter((s) => !s.classList.contains("hidden"))
    .map((s) => s.id);
}

/** Text of each #ball-log item. */
function log(document) {
  return [...document.querySelectorAll("#ball-log li")].map((li) => li.textContent);
}

test("AC: normalizeNames('asha', 'ASHA ') returns the duplicate error", () => {
  const result = normalizeNames("asha", "ASHA ");
  assert.equal(result.error, "Players must have different names");
});

test("normalizeNames: name equal to a default of the other blank is a duplicate", () => {
  assert.equal(normalizeNames("", "player 1").error, "Players must have different names");
});

test("normalizeNames: inner spaces are kept and different names pass", () => {
  assert.deepEqual(normalizeNames(" Mary Ann ", "Ann"), { p1: "Mary Ann", p2: "Ann", error: null });
});

test("app loads on the setup screen only with #setup-error hidden", () => {
  const { document, $ } = loadApp({ config: CONFIG });
  assert.deepEqual(visible(document), ["screen-setup"]);
  assert.ok($("#setup-error").classList.contains("hidden"));
});

test("AC: case-insensitive duplicate (with spaces) keeps setup and shows the error", () => {
  const { document, $ } = start({ p1: " Asha", p2: "ASHA  " });
  assert.deepEqual(visible(document), ["screen-setup"]);
  assert.ok(!$("#setup-error").classList.contains("hidden"));
  assert.equal($("#setup-error").textContent, "Players must have different names");
});

test("blank names start a match with Player 1 batting", () => {
  const { document, $ } = start({ p1: "  ", p2: "" });
  assert.deepEqual(visible(document), ["screen-game"]);
  assert.equal($("#batter-name").textContent, "Player 1");
});

test("default ball count is 6; 18 balls can be chosen", () => {
  assert.equal(start().$("#balls-left").textContent, "6");
  assert.equal(start({ balls: "18" }).$("#balls-left").textContent, "18");
});

test("AC: Asha/Ravi with 12 balls shows a fresh innings 1 scoreboard", () => {
  const { document, $ } = start({ p1: "  Asha ", balls: "12" });
  assert.deepEqual(visible(document), ["screen-game"]);
  assert.equal($("#batter-name").textContent, "Asha");
  assert.equal($("#score").textContent, "0");
  assert.equal($("#balls-left").textContent, "12");
  assert.equal($("#innings-label").textContent, "Innings 1");
  assert.equal($("#last-page").textContent, "–");
  assert.equal($("#ball-log").children.length, 0);
  assert.ok($("#target-info").classList.contains("hidden"));
});

test("toss checkbox is ignored: Player 1 bats first and game screen shows", () => {
  const { document, $ } = start({ toss: true, pages: [1] });
  assert.deepEqual(visible(document), ["screen-game"]);
  assert.equal($("#batter-name").textContent, "Asha");
});

test("AC: loadApp({ random: [(147-0.5)/200] }) one flip shows page 147 dot ball", () => {
  const app = loadApp({ random: [(147 - 0.5) / 200], config: CONFIG });
  app.$("#p1-name").value = "Asha";
  app.$("#p2-name").value = "Ravi";
  app.click("start-btn");
  app.click("flip-btn");
  assert.equal(app.$("#last-page").textContent, "147");
  assert.equal(app.$("#last-result").textContent, "Dot ball");
  assert.equal(app.$("#balls-left").textContent, "5");
  assert.deepEqual(log(app.document), ["Ball 1: Page 147 – Dot ball"]);
});

test("AC: pages 4 then 6 score 10 with log items in order; last ball shown", () => {
  const { document, $, click } = start({ pages: [4, 6] });
  click("flip-btn");
  assert.equal($("#score").textContent, "4");
  click("flip-btn");
  assert.equal($("#score").textContent, "10");
  assert.equal($("#last-page").textContent, "6");
  assert.equal($("#balls-left").textContent, "4");
  assert.deepEqual(log(document), ["Ball 1: Page 4 – 4 runs", "Ball 2: Page 6 – 6 runs"]);
  assert.ok($("#target-info").classList.contains("hidden"));
});

test("AC: OUT on first ball shows only the break screen with score 0 and target 1", () => {
  const { document, $, click } = start({ pages: [10] });
  click("flip-btn");
  assert.deepEqual(visible(document), ["screen-break"]);
  assert.ok($("#break-score").textContent.includes("0"));
  assert.ok($("#break-target").textContent.includes("1"));
  assert.ok(!$("#break-score").textContent.includes("1"), "score should not mention 1");
});

test("AC: six non-out balls totalling 15 show break with target 16", () => {
  const { document, $, click } = start({ pages: [3, 3, 3, 3, 3, 7] });
  // pages 3,3,3,3,3 = 15 runs; page 7 is a dot ball
  for (let i = 0; i < 5; i += 1) click("flip-btn");
  assert.deepEqual(visible(document), ["screen-game"]);
  click("flip-btn");
  assert.deepEqual(visible(document), ["screen-break"]);
  assert.ok($("#break-score").textContent.includes("15"));
  assert.ok($("#break-target").textContent.includes("16"));
});

test("break screen with 12 balls appears only after the 12th ball", () => {
  const { document, click } = start({ balls: "12", pages: [2] });
  for (let i = 0; i < 11; i += 1) click("flip-btn");
  assert.deepEqual(visible(document), ["screen-game"]);
  click("flip-btn");
  assert.deepEqual(visible(document), ["screen-break"]);
});

test("AC: HTML in a player name is literal text in #batter-name", () => {
  const { $ } = start({ p1: "<b>x</b>" });
  assert.equal($("#batter-name").textContent, "<b>x</b>");
  assert.equal($("#batter-name").querySelector("b"), null);
  assert.equal($("#screen-game b"), null);
});

test("HTML in a player name is literal text on the break screen", () => {
  const { document, click } = start({ p1: "<b>x</b>", p2: "<i>y</i>", pages: [10] });
  click("flip-btn");
  assert.equal(document.querySelector("#screen-break b, #screen-break i"), null);
  assert.ok(document.getElementById("break-score").textContent.includes("<b>x</b>"));
});
