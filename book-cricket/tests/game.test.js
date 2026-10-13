const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createGame, playBall, startSecondInnings, computeResult } = require("../script.js");

/** Play each page in order, starting from `state`. */
function playPages(state, pages) {
  return pages.reduce((s, page) => playBall(s, page), state);
}

/** A new 6-ball game between Asha and Ravi. */
function newGame(options = {}) {
  return createGame({ p1: "Asha", p2: "Ravi", ballsPerInnings: 6, ...options });
}

test("createGame returns the initial innings 1 state", () => {
  const state = newGame();
  assert.equal(state.phase, "innings");
  assert.deepEqual(state.players, { p1: "Asha", p2: "Ravi" });
  assert.equal(state.ballsPerInnings, 6);
  assert.equal(state.currentInnings, 1);
  assert.equal(state.currentBatter, "p1");
  assert.deepEqual(state.battingOrder, ["p1", "p2"]);
  assert.deepEqual(state.scores, { p1: 0, p2: 0 });
  assert.equal(state.ballsLeft, 6);
  assert.equal(state.target, null);
  assert.deepEqual(state.out, { p1: false, p2: false });
  assert.deepEqual(state.log, { p1: [], p2: [] });
  assert.equal(state.lastBall, null);
  assert.equal(state.result, null);
});

test("createGame with firstBatter 'p2' puts p2 in first", () => {
  const state = newGame({ firstBatter: "p2" });
  assert.equal(state.currentBatter, "p2");
  assert.deepEqual(state.battingOrder, ["p2", "p1"]);
});

test("playBall scores the page and leaves the input state unchanged", () => {
  const state = newGame();
  const before = structuredClone(state);
  const next = playBall(state, 4);
  assert.equal(next.scores.p1, 4);
  assert.equal(next.ballsLeft, 5);
  assert.equal(next.log.p1.length, 1);
  assert.equal(next.lastBall.page, 4);
  assert.equal(next.phase, "innings");
  assert.deepEqual(state, before);
});

test("playBall never mutates the input, including on innings and match end", () => {
  let state = newGame();
  for (const page of [6, 10]) {
    const before = structuredClone(state);
    state = playBall(state, page);
    assert.notEqual(state.log, before.log);
  }
  state = startSecondInnings(state);
  for (const page of [6, 4]) {
    const before = structuredClone(state);
    const next = playBall(state, page);
    assert.deepEqual(state, before);
    state = next;
  }
  assert.equal(state.phase, "result");
});

test("six balls end innings 1 with phase 'break' and target score + 1", () => {
  const state = playPages(newGame(), [1, 2, 3, 4, 5, 6]);
  assert.equal(state.phase, "break");
  assert.equal(state.scores.p1, 21);
  assert.equal(state.target, 22);
  assert.equal(state.ballsLeft, 0);
  assert.equal(state.log.p1.length, 6);
});

test("OUT on the first ball ends innings 1 and uses up a ball", () => {
  const state = playBall(newGame(), 10);
  assert.equal(state.phase, "break");
  assert.equal(state.out.p1, true);
  assert.equal(state.scores.p1, 0);
  assert.equal(state.target, 1);
  assert.equal(state.ballsLeft, 5);
  assert.equal(state.lastBall.label, "OUT");
});

test("startSecondInnings switches to the second batter with a full innings", () => {
  const breakState = playBall(newGame(), 10);
  const before = structuredClone(breakState);
  const state = startSecondInnings(breakState);
  assert.equal(state.phase, "innings");
  assert.equal(state.currentInnings, 2);
  assert.equal(state.currentBatter, "p2");
  assert.equal(state.ballsLeft, state.ballsPerInnings);
  assert.equal(state.lastBall, null);
  assert.equal(state.target, 1);
  assert.deepEqual(breakState, before);
});

test("innings 2 ends as soon as the chaser reaches the target", () => {
  let state = startSecondInnings(playPages(newGame(), [4, 10]));
  assert.equal(state.target, 5);
  state = playBall(state, 3);
  assert.equal(state.phase, "innings");
  state = playBall(state, 2);
  assert.equal(state.phase, "result");
  assert.equal(state.ballsLeft, 4);
  assert.equal(state.result.winner, "p2");
  assert.deepEqual(state.result, { winner: "p2", p1Score: 4, p2Score: 5 });
});

test("equal scores when the chaser is out give a tie", () => {
  let state = playPages(newGame(), [6, 10]);
  state = playPages(startSecondInnings(state), [6, 10]);
  assert.equal(state.phase, "result");
  assert.equal(state.out.p2, true);
  assert.equal(state.result.winner, null);
  assert.deepEqual(computeResult(state), { winner: null, p1Score: 6, p2Score: 6 });
});

test("the first batter wins when the chaser uses all balls short of the target", () => {
  let state = playPages(newGame(), [6, 6, 10]);
  assert.equal(state.scores.p1, 12);
  state = playPages(startSecondInnings(state), [1, 7, 1, 8, 1, 9]);
  assert.equal(state.phase, "result");
  assert.equal(state.ballsLeft, 0);
  assert.deepEqual(state.result, { winner: "p1", p1Score: 12, p2Score: 3 });
});

test("playBall outside phase 'innings' returns the state unchanged", () => {
  const breakState = playBall(newGame(), 10);
  const breakCopy = structuredClone(breakState);
  assert.deepEqual(playBall(breakState, 6), breakCopy);

  const resultState = playBall(startSecondInnings(breakState), 6);
  assert.equal(resultState.phase, "result");
  const resultCopy = structuredClone(resultState);
  assert.deepEqual(playBall(resultState, 6), resultCopy);
});

test("with firstBatter 'p2' innings 1 is recorded under p2 and the result is correct", () => {
  let state = playPages(newGame({ firstBatter: "p2" }), [5, 3, 10]);
  assert.equal(state.phase, "break");
  assert.equal(state.scores.p2, 8);
  assert.equal(state.log.p2.length, 3);
  assert.equal(state.scores.p1, 0);
  assert.equal(state.log.p1.length, 0);
  assert.equal(state.out.p2, true);
  assert.equal(state.target, 9);

  state = startSecondInnings(state);
  assert.equal(state.currentBatter, "p1");
  state = playPages(state, [2, 2, 10]);
  assert.equal(state.phase, "result");
  assert.equal(state.scores.p1, 4);
  assert.equal(state.log.p1.length, 3);
  assert.deepEqual(state.result, { winner: "p2", p1Score: 4, p2Score: 8 });
  assert.deepEqual(computeResult(state), state.result);
});

test("computeResult picks the higher score or null for a tie", () => {
  const base = newGame();
  assert.deepEqual(computeResult({ ...base, scores: { p1: 7, p2: 3 } }),
    { winner: "p1", p1Score: 7, p2Score: 3 });
  assert.deepEqual(computeResult({ ...base, scores: { p1: 2, p2: 9 } }),
    { winner: "p2", p1Score: 2, p2Score: 9 });
  assert.deepEqual(computeResult({ ...base, scores: { p1: 5, p2: 5 } }),
    { winner: null, p1Score: 5, p2Score: 5 });
});
