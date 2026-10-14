const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./helpers/app.js");

const CONFIG = { animationMs: 0, cpuDelayMs: 0 };
const PLAYERS_KEY = "bookCricket.players";

/** Fill the setup form on an app and press Start. */
function start(app, p1, p2) {
  app.$("#p1-name").value = p1;
  app.$("#p2-name").value = p2;
  app.click("start-btn");
}

/** True when the given screen section is visible. */
function isVisible(app, name) {
  return !app.$(`#screen-${name}`).classList.contains("hidden");
}

/** Parsed value of the saved players key, or null when absent. */
function savedPlayers(app) {
  const raw = app.window.localStorage.getItem(PLAYERS_KEY);
  return raw === null ? null : JSON.parse(raw);
}

// AC1: starting as Asha/Ravi saves { p1: "Asha", p2: "Ravi" }
test("AC1: starting as Asha/Ravi stores exactly { p1, p2 } under bookCricket.players", () => {
  const app = loadApp({ config: CONFIG });
  assert.equal(savedPlayers(app), null);
  start(app, "Asha", "Ravi");
  assert.ok(isVisible(app, "game"));
  assert.deepEqual(savedPlayers(app), { p1: "Asha", p2: "Ravi" });
});

test("AC1: a later successful Start overwrites earlier saved names", () => {
  const app = loadApp({ config: CONFIG, storage: { [PLAYERS_KEY]: { p1: "Old", p2: "Names" } } });
  start(app, "Asha", "Ravi");
  assert.deepEqual(savedPlayers(app), { p1: "Asha", p2: "Ravi" });
});

test("AC1: empty inputs save the default names", () => {
  const app = loadApp({ config: CONFIG });
  start(app, "", "");
  assert.deepEqual(savedPlayers(app), { p1: "Player 1", p2: "Player 2" });
});

// AC2: saved names pre-fill the inputs
test("AC2: saved names pre-fill #p1-name and #p2-name on load", () => {
  const app = loadApp({ config: CONFIG, storage: { [PLAYERS_KEY]: { p1: "Asha", p2: "Ravi" } } });
  assert.ok(isVisible(app, "setup"));
  assert.equal(app.$("#p1-name").value, "Asha");
  assert.equal(app.$("#p2-name").value, "Ravi");
});

test("AC2: pre-filled names can be started without editing", () => {
  const app = loadApp({ config: CONFIG, storage: { [PLAYERS_KEY]: { p1: "Asha", p2: "Ravi" } } });
  app.click("start-btn");
  assert.ok(isVisible(app, "game"));
  assert.equal(app.$("#batter-name").textContent, "Asha");
});

test("AC1+AC2: names saved in one session pre-fill the next session", () => {
  const first = loadApp({ config: CONFIG });
  start(first, "Asha", "Ravi");
  const raw = first.window.localStorage.getItem(PLAYERS_KEY);
  const second = loadApp({ config: CONFIG, rawStorage: { [PLAYERS_KEY]: raw } });
  assert.equal(second.$("#p1-name").value, "Asha");
  assert.equal(second.$("#p2-name").value, "Ravi");
});

test("AC2: markup-like saved names are set as plain input values", () => {
  const name = "<img src=x onerror=alert(1)>";
  const app = loadApp({ config: CONFIG, storage: { [PLAYERS_KEY]: { p1: name, p2: "Ravi" } } });
  assert.equal(app.$("#p1-name").value, name);
  assert.equal(app.document.querySelector("img"), null);
});

// AC3: invalid JSON -> empty inputs, Start works
test("AC3: invalid JSON leaves inputs empty, no error shown, and Start works", () => {
  const app = loadApp({ config: CONFIG, rawStorage: { [PLAYERS_KEY]: "{oops" } });
  assert.equal(app.$("#p1-name").value, "");
  assert.equal(app.$("#p2-name").value, "");
  assert.ok(app.$("#setup-error").classList.contains("hidden"));
  start(app, "Asha", "Ravi");
  assert.ok(isVisible(app, "game"));
  assert.equal(app.$("#batter-name").textContent, "Asha");
});

for (const [label, value] of [
  ["null", "null"],
  ["an array", "[\"Asha\",\"Ravi\"]"],
  ["a string", "\"Asha\""],
  ["non-string names", "{\"p1\":1,\"p2\":2}"],
]) {
  test(`AC3: saved players holding ${label} leaves inputs empty and Start works`, () => {
    const app = loadApp({ config: CONFIG, rawStorage: { [PLAYERS_KEY]: value } });
    assert.equal(app.$("#p1-name").value, "");
    assert.equal(app.$("#p2-name").value, "");
    start(app, "Asha", "Ravi");
    assert.ok(isVisible(app, "game"));
  });
}

test("AC3/storage failure: getItem throwing at load does not break init or Start", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  // Boot a pristine page, make storage reads throw, then run init again in that window.
  const app = loadApp({ config: CONFIG, storage: { [PLAYERS_KEY]: { p1: "Asha", p2: "Ravi" } } });
  app.$("#p1-name").value = "";
  app.$("#p2-name").value = "";
  app.window.Storage.prototype.getItem = () => {
    throw new Error("SecurityError");
  };
  assert.doesNotThrow(() => app.window.eval(script));
  assert.equal(app.$("#p1-name").value, "");
  assert.equal(app.$("#p2-name").value, "");
});

// AC4: failed Start does not change saved names
test("AC4: duplicate names (case-insensitive) do not overwrite saved names", () => {
  const app = loadApp({ config: CONFIG, storage: { [PLAYERS_KEY]: { p1: "Asha", p2: "Ravi" } } });
  start(app, "Kiran", "  KIRAN ");
  assert.ok(isVisible(app, "setup"));
  assert.ok(!app.$("#setup-error").classList.contains("hidden"));
  assert.deepEqual(savedPlayers(app), { p1: "Asha", p2: "Ravi" });
});

test("AC4: a failed Start with nothing saved leaves the key absent", () => {
  const app = loadApp({ config: CONFIG });
  start(app, "Kiran", "kiran");
  assert.ok(isVisible(app, "setup"));
  assert.equal(app.window.localStorage.getItem(PLAYERS_KEY), null);
});

test("AC4: failed Start then a corrected Start saves the corrected names", () => {
  const app = loadApp({ config: CONFIG, storage: { [PLAYERS_KEY]: { p1: "Asha", p2: "Ravi" } } });
  start(app, "Kiran", "kiran");
  assert.deepEqual(savedPlayers(app), { p1: "Asha", p2: "Ravi" });
  start(app, "Kiran", "Meera");
  assert.ok(isVisible(app, "game"));
  assert.deepEqual(savedPlayers(app), { p1: "Kiran", p2: "Meera" });
});
