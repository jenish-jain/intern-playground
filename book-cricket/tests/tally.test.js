const { test } = require("node:test");
const assert = require("node:assert/strict");
const { updateTally, findTallyKey, loadTally, saveTally } = require("../script.js");

/** In-memory fake of the localStorage API, optionally seeded with raw string values. */
function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

/** A finished match in the history entry shape; `winner` null is a tie. */
function entry(winner, p1 = "Asha", p2 = "Ravi") {
  return { p1: { name: p1, score: 0 }, p2: { name: p2, score: 0 }, winner };
}

test("updateTally adds the winner's win and the other player's loss to an empty tally", () => {
  const tally = updateTally({}, entry("Asha"));
  assert.deepEqual(tally, {
    Asha: { w: 1, l: 0, t: 0 },
    Ravi: { w: 0, l: 1, t: 0 },
  });
});

test("updateTally does not mutate its input tally or entry", () => {
  const tally = { Asha: { w: 1, l: 0, t: 0 } };
  const before = structuredClone(tally);
  const e = entry("Ravi");
  const eBefore = structuredClone(e);
  const next = updateTally(tally, e);
  assert.deepEqual(tally, before);
  assert.deepEqual(e, eBefore);
  assert.notEqual(next, tally);
  assert.notEqual(next.Asha, tally.Asha);
  assert.deepEqual(next.Asha, { w: 1, l: 1, t: 0 });
});

test("a tied entry increments t for both players", () => {
  const tally = updateTally({ Asha: { w: 2, l: 0, t: 0 } }, entry(null));
  assert.deepEqual(tally, {
    Asha: { w: 2, l: 0, t: 1 },
    Ravi: { w: 0, l: 0, t: 1 },
  });
});

test("an existing key matched case-insensitively is incremented and re-stored under the new spelling", () => {
  const tally = updateTally({ asha: { w: 1, l: 0, t: 0 } }, entry("Asha"));
  assert.deepEqual(tally, {
    Asha: { w: 2, l: 0, t: 0 },
    Ravi: { w: 0, l: 1, t: 0 },
  });
  assert.equal(Object.hasOwn(tally, "asha"), false);
});

test("the winner is matched to a player case-insensitively", () => {
  const tally = updateTally({}, entry("ASHA"));
  assert.deepEqual(tally.Asha, { w: 1, l: 0, t: 0 });
  assert.deepEqual(tally.Ravi, { w: 0, l: 1, t: 0 });
});

test("other players' records are kept as they are", () => {
  const tally = updateTally({ Meera: { w: 3, l: 1, t: 2 } }, entry(null));
  assert.deepEqual(tally.Meera, { w: 3, l: 1, t: 2 });
});

test("findTallyKey returns the stored key matching a name case-insensitively, or undefined", () => {
  assert.equal(findTallyKey({ asha: {}, Ravi: {} }, "ASHA"), "asha");
  assert.equal(findTallyKey({ asha: {} }, "Ravi"), undefined);
});

test("loadTally returns {} for missing, invalid, non-object or array data", () => {
  assert.deepEqual(loadTally(memoryStorage()), {});
  assert.deepEqual(loadTally(memoryStorage({ "bookCricket.tally": "not json" })), {});
  assert.deepEqual(loadTally(memoryStorage({ "bookCricket.tally": "null" })), {});
  assert.deepEqual(loadTally(memoryStorage({ "bookCricket.tally": "[]" })), {});
  assert.deepEqual(loadTally(memoryStorage({ "bookCricket.tally": "7" })), {});
});

test("loadTally drops records that are not { w, l, t } integers", () => {
  const raw = JSON.stringify({
    Asha: { w: 1, l: 0, t: 0 },
    Ravi: { w: "1", l: 0, t: 0 },
    Meera: { w: 1 },
    Dev: null,
  });
  assert.deepEqual(loadTally(memoryStorage({ "bookCricket.tally": raw })), {
    Asha: { w: 1, l: 0, t: 0 },
  });
});

test("saveTally then loadTally round-trips and stores JSON under bookCricket.tally", () => {
  const s = memoryStorage();
  const tally = { Asha: { w: 1, l: 0, t: 0 } };
  saveTally(s, tally);
  assert.deepEqual(loadTally(s), tally);
  assert.deepEqual(JSON.parse(s.getItem("bookCricket.tally")), tally);
});
