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

test("a successful Start saves the player names", () => {
  const app = loadApp({ config: CONFIG });
  start(app, "Asha", "Ravi");
  assert.deepEqual(JSON.parse(app.window.localStorage.getItem(PLAYERS_KEY)), { p1: "Asha", p2: "Ravi" });
});

test("Start saves the normalized names", () => {
  const app = loadApp({ config: CONFIG });
  start(app, "  Asha  ", "   ");
  assert.deepEqual(JSON.parse(app.window.localStorage.getItem(PLAYERS_KEY)), { p1: "Asha", p2: "Player 2" });
});

test("saved names pre-fill the setup inputs", () => {
  const app = loadApp({ config: CONFIG, storage: { [PLAYERS_KEY]: { p1: "Asha", p2: "Ravi" } } });
  assert.equal(app.$("#p1-name").value, "Asha");
  assert.equal(app.$("#p2-name").value, "Ravi");
});

test("invalid JSON leaves the inputs empty and Start still works", () => {
  const app = loadApp({ config: CONFIG, rawStorage: { [PLAYERS_KEY]: "{not json" } });
  assert.equal(app.$("#p1-name").value, "");
  assert.equal(app.$("#p2-name").value, "");
  start(app, "Asha", "Ravi");
  assert.ok(isVisible(app, "game"));
  assert.deepEqual(JSON.parse(app.window.localStorage.getItem(PLAYERS_KEY)), { p1: "Asha", p2: "Ravi" });
});

test("wrong-shaped saved players leave the inputs empty", () => {
  const app = loadApp({ config: CONFIG, storage: { [PLAYERS_KEY]: { p1: "Asha" } } });
  assert.equal(app.$("#p1-name").value, "");
  assert.equal(app.$("#p2-name").value, "");
});

test("a failed Start (duplicate names) does not change the saved names", () => {
  const app = loadApp({ config: CONFIG, storage: { [PLAYERS_KEY]: { p1: "Asha", p2: "Ravi" } } });
  start(app, "Kiran", "kiran");
  assert.ok(isVisible(app, "setup"));
  assert.deepEqual(JSON.parse(app.window.localStorage.getItem(PLAYERS_KEY)), { p1: "Asha", p2: "Ravi" });
});

test("Start still works when saving to storage throws", () => {
  const app = loadApp({ config: CONFIG });
  app.window.Storage.prototype.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  start(app, "Asha", "Ravi");
  assert.ok(isVisible(app, "game"));
  assert.equal(app.$("#batter-name").textContent, "Asha");
});
