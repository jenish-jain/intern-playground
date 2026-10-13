const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp } = require("./helpers/app.js");

const css = fs
  .readFileSync(path.join(__dirname, "..", "style.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Split CSS into top-level rules, flattening @media blocks.
 * Each rule is { selector, body, media } where media is the at-rule prelude or null.
 */
function parseRules(text) {
  const rules = [];
  const walk = (src, media) => {
    let i = 0;
    while (i < src.length) {
      const open = src.indexOf("{", i);
      if (open === -1) break;
      const prelude = src.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < src.length && depth > 0) {
        if (src[j] === "{") depth += 1;
        else if (src[j] === "}") depth -= 1;
        j += 1;
      }
      const body = src.slice(open + 1, j - 1);
      if (prelude.startsWith("@media")) walk(body, prelude);
      else rules.push({ selector: prelude, body, media });
      i = j;
    }
  };
  walk(text, null);
  return rules;
}

/** Declarations of a rule body as [property, value] pairs. */
function declarations(body) {
  return body
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const colon = d.indexOf(":");
      return [d.slice(0, colon).trim().toLowerCase(), d.slice(colon + 1).trim()];
    });
}

/** Rules whose comma-separated selector list includes `selector`. */
function rulesFor(selector) {
  return rules.filter((r) => r.selector.split(",").map((s) => s.trim()).includes(selector));
}

/** Last value of `prop` across rules matching `selector`, or undefined. */
function valueFor(selector, prop) {
  let value;
  for (const rule of rulesFor(selector)) {
    for (const [p, v] of declarations(rule.body)) if (p === prop) value = v;
  }
  return value;
}

const rules = parseRules(css);

test("app container is centred with max-width 480px", () => {
  const { document } = loadApp();
  const main = document.querySelector("main");
  assert.ok(main.classList.contains("app"));
  assert.equal(valueFor(".app", "max-width"), "480px");
  assert.match(valueFor(".app", "margin"), /^\S+ auto$/);
});

test("#flip-btn is at least 48px high and every button at least 44px", () => {
  const flip = parseFloat(valueFor("#flip-btn", "min-height"));
  assert.ok(flip >= 48, `#flip-btn min-height ${flip}`);
  const button = parseFloat(valueFor("button", "min-height"));
  assert.ok(button >= 44, `button min-height ${button}`);
  assert.match(valueFor("#flip-btn", "min-height"), /px$/);
  assert.match(valueFor("button", "min-height"), /px$/);
});

test("#history-table's parent has a class with overflow-x: auto", () => {
  const { document } = loadApp();
  const parent = document.getElementById("history-table").parentElement;
  const classes = [...parent.classList];
  assert.ok(classes.length > 0, "parent has a class");
  const scrolls = classes.some((c) => valueFor(`.${c}`, "overflow-x") === "auto");
  assert.ok(scrolls, `one of ${classes.join(", ")} sets overflow-x: auto`);
});

test("no width declaration above 480px outside @media (min-width) blocks", () => {
  for (const rule of rules) {
    if (rule.media && /min-width/.test(rule.media)) continue;
    for (const [prop, value] of declarations(rule.body)) {
      if (!/(^|-)width$/.test(prop)) continue;
      for (const match of value.matchAll(/(\d+(?:\.\d+)?)px/g)) {
        assert.ok(Number(match[1]) <= 480, `${rule.selector} { ${prop}: ${value} }`);
      }
    }
  }
});

test("colours are custom properties on :root and used via var()", () => {
  const colourLiteral = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i;
  const root = rulesFor(":root");
  assert.ok(root.length > 0, ":root rule exists");
  for (const rule of root) {
    for (const [prop] of declarations(rule.body)) {
      assert.ok(prop.startsWith("--"), `:root declares only custom properties, got ${prop}`);
    }
  }
  for (const rule of rules) {
    if (rule.selector === ":root") continue;
    // The dark theme redefines the colour tokens, so literals are allowed there in custom properties.
    const themeTokens = rule.selector === '[data-theme="dark"]';
    for (const [prop, value] of declarations(rule.body)) {
      if (themeTokens && prop.startsWith("--")) continue;
      assert.doesNotMatch(value, colourLiteral, `${rule.selector} { ${prop}: ${value} }`);
    }
  }
  assert.match(valueFor("body", "color"), /^var\(--/);
  assert.match(valueFor("body", "background"), /^var\(--/);
});
