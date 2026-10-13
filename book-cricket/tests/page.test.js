const { test } = require("node:test");
const assert = require("node:assert/strict");
const { flipPage, resultForPage } = require("../script.js");

test("flipPage maps the rng range onto pages 1 and 200", () => {
  assert.equal(flipPage(() => 0), 1);
  assert.equal(flipPage(() => 0.99999), 200);
});

test("flipPage with Math.random always returns an integer from 1 to 200", () => {
  for (let i = 0; i < 1000; i++) {
    const page = flipPage();
    assert.ok(Number.isInteger(page), `${page} is an integer`);
    assert.ok(page >= 1 && page <= 200, `${page} is within 1-200`);
  }
});

test("resultForPage(143) scores 3 runs", () => {
  assert.deepEqual(resultForPage(143), { page: 143, digit: 3, runs: 3, out: false, label: "3 runs" });
});

test("resultForPage uses a singular label for 1 run", () => {
  const one = resultForPage(21);
  assert.equal(one.runs, 1);
  assert.equal(one.label, "1 run");
  const six = resultForPage(196);
  assert.equal(six.runs, 6);
  assert.equal(six.label, "6 runs");
});

test("resultForPage gives a dot ball for digits 7, 8 and 9", () => {
  for (const page of [7, 118, 199]) {
    const result = resultForPage(page);
    assert.equal(result.runs, 0, `page ${page} runs`);
    assert.equal(result.out, false, `page ${page} out`);
    assert.equal(result.label, "Dot ball", `page ${page} label`);
  }
});

test("resultForPage is OUT for digit 0", () => {
  for (const page of [10, 200]) {
    const result = resultForPage(page);
    assert.equal(result.runs, 0, `page ${page} runs`);
    assert.equal(result.out, true, `page ${page} out`);
    assert.equal(result.label, "OUT", `page ${page} label`);
  }
});

test("resultForPage is consistent with the last digit for every page", () => {
  for (let page = 1; page <= 200; page++) {
    const digit = page % 10;
    const result = resultForPage(page);
    assert.equal(result.page, page);
    assert.equal(result.digit, digit);
    assert.equal(result.runs, digit >= 1 && digit <= 6 ? digit : 0, `page ${page} runs`);
    assert.equal(result.out, digit === 0, `page ${page} out`);
  }
});
