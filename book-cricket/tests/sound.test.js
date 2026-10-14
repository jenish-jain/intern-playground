const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resultForPage, soundForBall, loadMuted, saveMuted } = require("../script.js");

/** In-memory fake of the localStorage API, optionally seeded with raw string values. */
function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

/** Storage whose every method throws, like a blocked localStorage. */
function throwingStorage() {
  const fail = () => { throw new Error("storage unavailable"); };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

test("soundForBall: 6 runs give 'six', OUT gives 'out', everything else gives null", () => {
  assert.equal(soundForBall(resultForPage(6)), "six");
  assert.equal(soundForBall(resultForPage(16)), "six");
  assert.equal(soundForBall(resultForPage(10)), "out");
  assert.equal(soundForBall(resultForPage(20)), "out");
  for (const page of [1, 2, 3, 4, 5, 7, 8, 9]) {
    assert.equal(soundForBall(resultForPage(page)), null, `page ${page}`);
  }
  assert.equal(soundForBall(null), null);
});

test("loadMuted is false unless the stored value is JSON true", () => {
  assert.equal(loadMuted(memoryStorage()), false);
  assert.equal(loadMuted(memoryStorage({ "bookCricket.muted": "true" })), true);
  assert.equal(loadMuted(memoryStorage({ "bookCricket.muted": "false" })), false);
  assert.equal(loadMuted(memoryStorage({ "bookCricket.muted": '"yes"' })), false);
  assert.equal(loadMuted(memoryStorage({ "bookCricket.muted": "not json" })), false);
  assert.equal(loadMuted(throwingStorage()), false);
});

test("saveMuted stores a JSON boolean and loadMuted reads it back", () => {
  const s = memoryStorage();
  saveMuted(s, true);
  assert.equal(s.getItem("bookCricket.muted"), "true");
  assert.equal(loadMuted(s), true);
  saveMuted(s, false);
  assert.equal(s.getItem("bookCricket.muted"), "false");
  assert.equal(loadMuted(s), false);
});

test("saveMuted ignores storage failures", () => {
  assert.doesNotThrow(() => saveMuted(throwingStorage(), true));
  assert.doesNotThrow(() => saveMuted(null, true));
});
