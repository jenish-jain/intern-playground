const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./helpers/app.js");

/** A Math.random value that makes flipPage() return `page`. */
function randomForPage(page) {
  return (page - 0.5) / 200;
}

/** Start a match with the default setup (no toss) and flip once per page given. */
function startAndFlip(options, pages) {
  const app = loadApp({ ...options, random: pages.map(randomForPage) });
  app.click("start-btn");
  for (let i = 0; i < pages.length; i += 1) app.click("flip-btn");
  return app;
}

/** Read the stored mute flag, decoding the JSON encoding used for every key. */
function storedMuted(window) {
  return JSON.parse(window.localStorage.getItem("bookCricket.muted"));
}

test("AC1: with AudioContext stubbed, page 6 makes one oscillator, page 10 one more, page 3 none", () => {
  const app = loadApp({ audio: true, random: [randomForPage(6), randomForPage(10), randomForPage(3)] });
  app.click("start-btn");

  app.click("flip-btn");
  assert.equal(app.oscillators.length, 1, "page 6 (six)");

  app.click("flip-btn");
  assert.equal(app.oscillators.length, 2, "page 10 (OUT)");

  app.click("flip-btn");
  assert.equal(app.oscillators.length, 2, "page 3 (3 runs) makes no sound");
});

test("AC2: with window.AudioContext undefined, flipping page 6 does not throw", () => {
  const app = startAndFlip({}, [6]);
  assert.equal(app.window.AudioContext, undefined);
  assert.equal(app.$("#score").textContent, "6");
  assert.deepEqual(app.oscillators, []);
});

test("AC3: after clicking #mute-toggle, page 6 makes no oscillator and bookCricket.muted is true", () => {
  const app = loadApp({ audio: true, random: [randomForPage(6)] });
  app.click("start-btn");
  app.click("mute-toggle");

  app.click("flip-btn");
  assert.equal(app.oscillators.length, 0);
  assert.equal(storedMuted(app.window), true);
});

test("a flip after the innings has ended (phase break) does not repeat the OUT sound", () => {
  const app = loadApp({ audio: true, random: [randomForPage(10), randomForPage(6)] });
  app.click("start-btn");
  app.click("flip-btn");
  assert.equal(app.oscillators.length, 1, "OUT sounds once");
  assert.equal(app.$("#screen-break").classList.contains("hidden"), false, "innings 1 is over");

  app.click("flip-btn");
  assert.equal(app.oscillators.length, 1, "no extra sound when no ball is played");
});

test("AC4: loadApp with bookCricket.muted true shows #mute-toggle muted (aria-pressed='true')", () => {
  const app = loadApp({ audio: true, storage: { "bookCricket.muted": true } });
  assert.equal(app.$("#mute-toggle").getAttribute("aria-pressed"), "true");
  assert.equal(app.$("#mute-toggle").textContent, "Unmute");
});

test("#mute-toggle is unmuted by default and sits on the game screen", () => {
  const app = loadApp({ audio: true });
  const toggle = app.$("#mute-toggle");
  assert.equal(toggle.getAttribute("aria-pressed"), "false");
  assert.equal(toggle.textContent, "Mute");
  assert.equal(app.$("#screen-game").contains(toggle), true);
});

test("muting then unmuting restores sound on the next six and stores false", () => {
  const app = loadApp({ audio: true, random: [randomForPage(6), randomForPage(6)] });
  app.click("start-btn");
  app.click("mute-toggle");
  app.click("mute-toggle");
  assert.equal(storedMuted(app.window), false);
  assert.equal(app.$("#mute-toggle").getAttribute("aria-pressed"), "false");

  app.click("flip-btn");
  assert.equal(app.oscillators.length, 1);
});

test("the mute choice from a previous visit silences a six after reload", () => {
  const app = loadApp({ audio: true, storage: { "bookCricket.muted": true }, random: [randomForPage(6)] });
  app.click("start-btn");
  app.click("flip-btn");
  assert.equal(app.oscillators.length, 0);
});
