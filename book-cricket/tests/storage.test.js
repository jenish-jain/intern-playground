const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  loadPlayers, savePlayers, loadHistory, addHistory, clearHistory, buildHistoryEntry,
} = require("../script.js");

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

/** A finished game state in the architecture-doc shape. */
function resultState({ p1Score = 18, p2Score = 14, battingOrder = ["p1", "p2"] } = {}) {
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

test("savePlayers then loadPlayers round-trips and stores valid JSON", () => {
  const s = memoryStorage();
  savePlayers(s, { p1: "Asha", p2: "Ravi" });
  assert.deepEqual(loadPlayers(s), { p1: "Asha", p2: "Ravi" });
  assert.deepEqual(JSON.parse(s.getItem("bookCricket.players")), { p1: "Asha", p2: "Ravi" });
});

test("loadPlayers returns null for empty, invalid or wrong-shaped data", () => {
  assert.equal(loadPlayers(memoryStorage()), null);
  assert.equal(loadPlayers(memoryStorage({ "bookCricket.players": "not json" })), null);
  assert.equal(loadPlayers(memoryStorage({ "bookCricket.players": "[]" })), null);
  assert.equal(loadPlayers(memoryStorage({ "bookCricket.players": "null" })), null);
  assert.equal(loadPlayers(memoryStorage({ "bookCricket.players": '{"p1":"Asha"}' })), null);
});

test("loadHistory returns [] for missing, invalid or non-array data", () => {
  assert.deepEqual(loadHistory(memoryStorage()), []);
  assert.deepEqual(loadHistory(memoryStorage({ "bookCricket.history": "not json" })), []);
  assert.deepEqual(loadHistory(memoryStorage({ "bookCricket.history": "{}" })), []);
});

test("addHistory prepends newest first and returns the new list", () => {
  const s = memoryStorage();
  const a = { date: "A" };
  const b = { date: "B" };
  assert.deepEqual(addHistory(s, a), [a]);
  assert.deepEqual(addHistory(s, b), [b, a]);
  assert.deepEqual(loadHistory(s), [b, a]);
});

test("addHistory keeps at most 10 entries, dropping the oldest", () => {
  const s = memoryStorage();
  for (let i = 1; i <= 11; i += 1) addHistory(s, { date: `entry-${i}` });
  const history = loadHistory(s);
  assert.equal(history.length, 10);
  assert.equal(history[0].date, "entry-11");
  assert.ok(!history.some((e) => e.date === "entry-1"));
});

test("clearHistory empties the history", () => {
  const s = memoryStorage();
  addHistory(s, { date: "A" });
  clearHistory(s);
  assert.deepEqual(loadHistory(s), []);
});

test("every storage function returns its default when storage throws", () => {
  const s = throwingStorage();
  assert.equal(loadPlayers(s), null);
  assert.equal(savePlayers(s, { p1: "Asha", p2: "Ravi" }), undefined);
  assert.deepEqual(loadHistory(s), []);
  assert.deepEqual(addHistory(s, { date: "A" }), []);
  assert.equal(clearHistory(s), undefined);
});

test("buildHistoryEntry returns the PRD shape including battedFirst", () => {
  const state = resultState();
  const before = JSON.stringify(state);
  const entry = buildHistoryEntry(state, new Date("2026-10-13T12:30:00Z"));
  assert.deepEqual(entry, {
    date: "2026-10-13T12:30:00.000Z",
    p1: { name: "Asha", score: 18 },
    p2: { name: "Ravi", score: 14 },
    winner: "Asha",
    ballsPerInnings: 6,
    battedFirst: "p1",
  });
  assert.equal(JSON.stringify(state), before);
});

test("buildHistoryEntry records p2 as winner and as first batter after a toss", () => {
  const entry = buildHistoryEntry(resultState({ p1Score: 3, p2Score: 9, battingOrder: ["p2", "p1"] }));
  assert.equal(entry.winner, "Ravi");
  assert.equal(entry.battedFirst, "p2");
  assert.equal(typeof entry.date, "string");
});

test("buildHistoryEntry for a tie has winner null", () => {
  const entry = buildHistoryEntry(resultState({ p1Score: 12, p2Score: 12 }), new Date(0));
  assert.equal(entry.winner, null);
});

test("buildHistoryEntry returns null for a game not in phase result", () => {
  assert.equal(buildHistoryEntry({ ...resultState(), phase: "innings" }), null);
});
