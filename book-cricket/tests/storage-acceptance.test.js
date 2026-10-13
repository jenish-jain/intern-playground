const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  loadPlayers, savePlayers, loadHistory, addHistory, clearHistory, buildHistoryEntry,
} = require("../script.js");
const { loadApp } = require("./helpers/app.js");

/** Real jsdom localStorage plus the app's storage functions as loaded in the browser. */
function browser(seed) {
  const { window } = loadApp({ storage: seed });
  return { window, s: window.localStorage };
}

/** Storage where getItem and setItem throw but removeItem is absent (exact AC wording). */
function getSetThrowingStorage() {
  const fail = () => { throw new Error("SecurityError"); };
  return { getItem: fail, setItem: fail };
}

/** Readable storage whose writes fail, like a full quota. */
function quotaStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: () => { throw new Error("QuotaExceededError"); },
    removeItem: (key) => data.delete(key),
  };
}

/** Finished-game state in the architecture-doc shape. */
function resultState(p1Score, p2Score, battingOrder = ["p1", "p2"]) {
  return {
    phase: "result",
    players: { p1: "Asha", p2: "Ravi" },
    ballsPerInnings: 6,
    battingOrder,
    currentInnings: 2,
    currentBatter: battingOrder[1],
    scores: { p1: p1Score, p2: p2Score },
    ballsLeft: 0,
    target: null,
    out: { p1: false, p2: false },
    log: { p1: [], p2: [] },
    lastBall: null,
    result: null,
  };
}

test("AC1: players round-trip through real jsdom localStorage as valid JSON", () => {
  const { window, s } = browser();
  window.savePlayers(s, { p1: "Asha", p2: "Ravi" });
  assert.deepEqual({ ...window.loadPlayers(s) }, { p1: "Asha", p2: "Ravi" });
  assert.deepEqual(JSON.parse(s.getItem("bookCricket.players")), { p1: "Asha", p2: "Ravi" });
});

test("AC1: savePlayers overwrites earlier names", () => {
  const { s } = browser();
  savePlayers(s, { p1: "Asha", p2: "Ravi" });
  savePlayers(s, { p1: "Meera", p2: "Kabir" });
  assert.deepEqual(loadPlayers(s), { p1: "Meera", p2: "Kabir" });
});

test("AC2: loadPlayers null on empty, 'not json' and other wrong shapes", () => {
  assert.equal(loadPlayers(browser().s), null);
  const { s } = browser();
  s.setItem("bookCricket.players", "not json");
  assert.equal(loadPlayers(s), null);
  for (const raw of ['"Asha"', "42", "true", '{"p1":1,"p2":2}', "{}", ""]) {
    s.setItem("bookCricket.players", raw);
    assert.equal(loadPlayers(s), null, `raw=${raw}`);
  }
});

test("AC3: loadHistory [] for missing, invalid JSON, '{}' and other non-arrays", () => {
  assert.deepEqual(loadHistory(browser().s), []);
  const { s } = browser();
  for (const raw of ["not json", "{}", "null", '"x"', "7", "", "[1,"]) {
    s.setItem("bookCricket.history", raw);
    assert.deepEqual(loadHistory(s), [], `raw=${raw}`);
  }
});

test("AC4: addHistory prepends in real localStorage: A then B gives [B, A]", () => {
  const { s } = browser();
  const a = { date: "2026-10-13T10:00:00.000Z", winner: "Asha" };
  const b = { date: "2026-10-13T11:00:00.000Z", winner: null };
  addHistory(s, a);
  addHistory(s, b);
  assert.deepEqual(loadHistory(s), [b, a]);
});

test("AC4: addHistory onto corrupt existing history starts a fresh list", () => {
  const { s } = browser();
  s.setItem("bookCricket.history", "{}");
  addHistory(s, { date: "A" });
  assert.deepEqual(loadHistory(s), [{ date: "A" }]);
});

test("AC5: 11 adds leave 10 entries newest first with the first-added gone", () => {
  const { s } = browser();
  for (let i = 1; i <= 11; i += 1) addHistory(s, { date: `e${i}` });
  const history = loadHistory(s);
  assert.deepEqual(history.map((e) => e.date), ["e11", "e10", "e9", "e8", "e7", "e6", "e5", "e4", "e3", "e2"]);
  assert.equal(JSON.parse(s.getItem("bookCricket.history")).length, 10);
});

test("AC5: exactly 10 adds keeps all 10", () => {
  const { s } = browser();
  for (let i = 1; i <= 10; i += 1) addHistory(s, { date: `e${i}` });
  assert.equal(loadHistory(s).length, 10);
  assert.equal(loadHistory(s)[9].date, "e1");
});

test("AC6: clearHistory then loadHistory returns [], and players are untouched", () => {
  const { s } = browser();
  savePlayers(s, { p1: "Asha", p2: "Ravi" });
  addHistory(s, { date: "A" });
  addHistory(s, { date: "B" });
  clearHistory(s);
  assert.deepEqual(loadHistory(s), []);
  assert.deepEqual(loadPlayers(s), { p1: "Asha", p2: "Ravi" });
  clearHistory(s);
  assert.deepEqual(loadHistory(s), []);
});

test("AC7: getItem/setItem throwing (no removeItem): every function returns its default", () => {
  const s = getSetThrowingStorage();
  assert.doesNotThrow(() => {
    assert.equal(loadPlayers(s), null);
    assert.equal(savePlayers(s, { p1: "Asha", p2: "Ravi" }), undefined);
    assert.deepEqual(loadHistory(s), []);
    assert.deepEqual(addHistory(s, { date: "A" }), []);
    assert.equal(clearHistory(s), undefined);
  });
});

test("AC7: null storage object does not throw", () => {
  assert.doesNotThrow(() => {
    assert.equal(loadPlayers(null), null);
    savePlayers(null, { p1: "Asha", p2: "Ravi" });
    assert.deepEqual(loadHistory(null), []);
    addHistory(null, { date: "A" });
    clearHistory(null);
  });
});

test("AC7: write failure (quota) leaves existing history intact and does not throw", () => {
  const existing = [{ date: "old" }];
  const s = quotaStorage({ "bookCricket.history": JSON.stringify(existing) });
  assert.doesNotThrow(() => savePlayers(s, { p1: "Asha", p2: "Ravi" }));
  assert.doesNotThrow(() => addHistory(s, { date: "new" }));
  assert.deepEqual(loadHistory(s), existing);
});

test("AC8: buildHistoryEntry exact shape for Asha 18 vs Ravi 14, round-trips through storage", () => {
  const state = resultState(18, 14);
  const snapshot = structuredClone(state);
  const entry = buildHistoryEntry(state, new Date("2026-10-13T12:30:00Z"));
  const expected = {
    date: "2026-10-13T12:30:00.000Z",
    p1: { name: "Asha", score: 18 },
    p2: { name: "Ravi", score: 14 },
    winner: "Asha",
    ballsPerInnings: 6,
    battedFirst: "p1",
  };
  assert.deepEqual(entry, expected);
  assert.deepEqual(state, snapshot);
  const { s } = browser();
  addHistory(s, entry);
  assert.deepEqual(loadHistory(s), [expected]);
});

test("AC9: buildHistoryEntry for a tie has winner null (including 0-0 and p2 first)", () => {
  assert.equal(buildHistoryEntry(resultState(14, 14), new Date(0)).winner, null);
  const zero = buildHistoryEntry(resultState(0, 0, ["p2", "p1"]), new Date(0));
  assert.equal(zero.winner, null);
  assert.equal(zero.battedFirst, "p2");
  assert.equal(zero.p1.score, 0);
});
