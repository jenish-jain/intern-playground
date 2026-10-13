const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createGame, playBall, startSecondInnings, computeResult } = require("../script.js");

/** Play each page in order, checking each call never mutates its input. */
function play(state, pages) {
  return pages.reduce((s, page) => {
    const before = structuredClone(s);
    const next = playBall(s, page);
    assert.deepEqual(s, before, `input mutated on page ${page}`);
    return next;
  }, state);
}

/** Recursively freeze an object so any mutation throws in strict mode. */
function deepFreeze(obj) {
  Object.values(obj).forEach((v) => {
    if (v && typeof v === "object") deepFreeze(v);
  });
  return Object.freeze(obj);
}

function game(options = {}) {
  return createGame({ p1: "Asha", p2: "Ravi", ballsPerInnings: 6, ...options });
}

test("AC1: createGame returns the documented initial state", () => {
  const s = game();
  assert.equal(s.phase, "innings");
  assert.equal(s.currentInnings, 1);
  assert.equal(s.currentBatter, "p1");
  assert.deepEqual(s.battingOrder, ["p1", "p2"]);
  assert.deepEqual(s.scores, { p1: 0, p2: 0 });
  assert.equal(s.ballsLeft, 6);
  assert.equal(s.target, null);
  assert.deepEqual(s.players, { p1: "Asha", p2: "Ravi" });
  assert.deepEqual(s.out, { p1: false, p2: false });
  assert.deepEqual(s.log, { p1: [], p2: [] });
  assert.equal(s.lastBall, null);
  assert.equal(s.result, null);
  assert.equal(s.ballsPerInnings, 6);
});

test("AC1: createGame honours 12 and 18 balls per innings", () => {
  assert.equal(game({ ballsPerInnings: 12 }).ballsLeft, 12);
  assert.equal(game({ ballsPerInnings: 18 }).ballsLeft, 18);
});

test("AC2: firstBatter 'p2' bats first", () => {
  const s = game({ firstBatter: "p2" });
  assert.equal(s.currentBatter, "p2");
  assert.deepEqual(s.battingOrder, ["p2", "p1"]);
});

test("AC3: first ball on page 4 updates a new state, input untouched", () => {
  const s = game();
  const copy = structuredClone(s);
  const n = playBall(s, 4);
  assert.equal(n.scores.p1, 4);
  assert.equal(n.ballsLeft, 5);
  assert.equal(n.log.p1.length, 1);
  assert.equal(n.lastBall.page, 4);
  assert.equal(n.lastBall.runs, 4);
  assert.deepEqual(s, copy);
  assert.notEqual(n, s);
});

test("AC3: playBall works on a deeply frozen state (no mutation at all)", () => {
  let s = deepFreeze(game());
  for (const page of [6, 6, 6, 6, 6, 10]) s = deepFreeze(playBall(s, page));
  s = deepFreeze(startSecondInnings(s));
  for (const page of [1, 10]) s = deepFreeze(playBall(s, page));
  assert.equal(s.phase, "result");
});

test("AC4: pages 1..6 end innings 1 with 21 and target 22", () => {
  const s = play(game(), [1, 2, 3, 4, 5, 6]);
  assert.equal(s.phase, "break");
  assert.equal(s.scores.p1, 21);
  assert.equal(s.target, 22);
  assert.equal(s.ballsLeft, 0);
  assert.equal(s.log.p1.length, 6);
});

test("AC4: innings 1 does not end before the last ball", () => {
  const s = play(game(), [1, 2, 3, 4, 5]);
  assert.equal(s.phase, "innings");
  assert.equal(s.target, null);
  assert.equal(s.ballsLeft, 1);
});

test("AC5: OUT on the first ball ends innings 1", () => {
  const s = play(game(), [10]);
  assert.equal(s.phase, "break");
  assert.equal(s.out.p1, true);
  assert.equal(s.scores.p1, 0);
  assert.equal(s.target, 1);
  assert.equal(s.ballsLeft, 5);
  assert.equal(s.log.p1.length, 1);
  assert.equal(s.lastBall.out, true);
});

test("AC6: startSecondInnings switches to the chaser with a full innings", () => {
  for (const balls of [6, 12]) {
    const brk = play(game({ ballsPerInnings: balls }), [10]);
    const copy = structuredClone(brk);
    const s = startSecondInnings(brk);
    assert.equal(s.phase, "innings");
    assert.equal(s.currentInnings, 2);
    assert.equal(s.currentBatter, "p2");
    assert.equal(s.ballsLeft, balls);
    assert.equal(s.target, 1);
    assert.deepEqual(brk, copy);
  }
});

test("AC7: chase reaches target 5 with pages 3 then 2", () => {
  let s = startSecondInnings(play(game(), [4, 10]));
  assert.equal(s.target, 5);
  s = play(s, [3]);
  assert.equal(s.phase, "innings");
  s = play(s, [2]);
  assert.equal(s.phase, "result");
  assert.equal(s.ballsLeft, 4);
  assert.equal(s.result.winner, "p2");
  assert.deepEqual(s.result, { winner: "p2", p1Score: 4, p2Score: 5 });
});

test("AC7: a ball after the chase is won changes nothing", () => {
  const s = play(startSecondInnings(play(game(), [4, 10])), [6]);
  assert.equal(s.phase, "result");
  assert.deepEqual(playBall(s, 3), s);
});

test("AC8: 6 vs 6-then-out is a tie", () => {
  const s = play(startSecondInnings(play(game(), [6, 10])), [6, 10]);
  assert.equal(s.phase, "result");
  assert.equal(s.result.winner, null);
  assert.deepEqual(s.result, { winner: null, p1Score: 6, p2Score: 6 });
  assert.equal(s.out.p2, true);
});

test("AC9: chaser uses all 6 balls scoring 3 and loses", () => {
  const s = play(startSecondInnings(play(game(), [6, 6, 7, 8, 9, 7])), [1, 1, 1, 7, 8, 9]);
  assert.equal(s.phase, "result");
  assert.equal(s.ballsLeft, 0);
  assert.deepEqual(s.result, { winner: "p1", p1Score: 12, p2Score: 3 });
});

test("AC9: chaser reaching the target on the final ball wins", () => {
  const s = play(startSecondInnings(play(game(), [1, 7, 7, 7, 7, 7])), [7, 7, 7, 7, 7, 2]);
  assert.equal(s.phase, "result");
  assert.equal(s.result.winner, "p2");
});

test("AC10: playBall on 'break' and 'result' returns a deep-equal state", () => {
  const brk = play(game(), [10]);
  const brkCopy = structuredClone(brk);
  assert.deepEqual(playBall(brk, 4), brkCopy);
  assert.deepEqual(brk, brkCopy);

  const res = play(startSecondInnings(brk), [10]);
  assert.equal(res.phase, "result");
  const resCopy = structuredClone(res);
  assert.deepEqual(playBall(res, 6), resCopy);
  assert.deepEqual(res, resCopy);
});

test("AC11: firstBatter 'p2' records innings 1 under p2; p1 chases and wins", () => {
  let s = play(game({ firstBatter: "p2" }), [3, 10]);
  assert.equal(s.phase, "break");
  assert.equal(s.scores.p2, 3);
  assert.equal(s.log.p2.length, 2);
  assert.equal(s.scores.p1, 0);
  assert.equal(s.log.p1.length, 0);
  assert.equal(s.out.p2, true);
  assert.equal(s.target, 4);
  s = startSecondInnings(s);
  assert.equal(s.currentBatter, "p1");
  s = play(s, [2, 2]);
  assert.equal(s.phase, "result");
  assert.equal(s.log.p1.length, 2);
  assert.deepEqual(s.result, { winner: "p1", p1Score: 4, p2Score: 3 });
  assert.deepEqual(computeResult(s), s.result);
});

test("AC11: firstBatter 'p2' who defends the total wins", () => {
  const s = play(startSecondInnings(play(game({ firstBatter: "p2" }), [6, 6, 6, 6, 6, 6])), [10]);
  assert.equal(s.scores.p2, 36);
  assert.deepEqual(s.result, { winner: "p2", p1Score: 0, p2Score: 36 });
});

test("computeResult does not mutate its input", () => {
  const s = { scores: { p1: 2, p2: 2 } };
  assert.deepEqual(computeResult(s), { winner: null, p1Score: 2, p2Score: 2 });
  assert.deepEqual(s, { scores: { p1: 2, p2: 2 } });
});
