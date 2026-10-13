const { test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../script.js");

const { flipPage, resultForPage } = app;

test("flipPage and resultForPage are exported functions", () => {
  assert.equal(typeof flipPage, "function");
  assert.equal(typeof resultForPage, "function");
});

test("flipPage maps every 1/200 slice of rng onto its page", () => {
  for (let page = 1; page <= 200; page++) {
    const mid = (page - 0.5) / 200;
    assert.equal(flipPage(() => mid), page, `rng ${mid}`);
  }
});

test("flipPage handles the largest double below 1", () => {
  assert.equal(flipPage(() => 1 - Number.EPSILON / 2), 200);
});

test("flipPage calls rng exactly once per flip", () => {
  let calls = 0;
  flipPage(() => {
    calls++;
    return 0.5;
  });
  assert.equal(calls, 1);
});

test("flipPage with Math.random reaches both ends of the range", () => {
  const seen = new Set();
  for (let i = 0; i < 20000; i++) seen.add(flipPage());
  assert.ok(seen.has(1), "page 1 seen");
  assert.ok(seen.has(200), "page 200 seen");
  for (const page of seen) assert.ok(Number.isInteger(page) && page >= 1 && page <= 200);
});

test("resultForPage returns exactly the documented keys and labels for every page", () => {
  for (let page = 1; page <= 200; page++) {
    const digit = page % 10;
    const out = digit === 0;
    const runs = digit >= 1 && digit <= 6 ? digit : 0;
    let label;
    if (out) label = "OUT";
    else if (runs === 0) label = "Dot ball";
    else if (runs === 1) label = "1 run";
    else label = `${runs} runs`;
    assert.deepEqual(resultForPage(page), { page, digit, runs, out, label }, `page ${page}`);
  }
});

test("resultForPage labels each digit 2-6 as 'N runs'", () => {
  const expected = { 102: "2 runs", 33: "3 runs", 144: "4 runs", 5: "5 runs", 66: "6 runs" };
  for (const [page, label] of Object.entries(expected)) {
    assert.equal(resultForPage(Number(page)).label, label);
  }
});

test("resultForPage returns a fresh object each call", () => {
  const a = resultForPage(143);
  const b = resultForPage(143);
  assert.notEqual(a, b);
  a.runs = 99;
  assert.equal(resultForPage(143).runs, 3);
});

test("logic functions do not touch DOM or storage globals", () => {
  assert.equal(typeof globalThis.document, "undefined");
  assert.equal(typeof globalThis.localStorage, "undefined");
  assert.doesNotThrow(() => {
    flipPage(() => 0.3);
    resultForPage(57);
  });
});
