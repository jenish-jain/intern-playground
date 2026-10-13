const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp } = require("./helpers/app.js");

const appDir = path.join(__dirname, "..");
const css = fs
  .readFileSync(path.join(appDir, "style.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

/** Flatten CSS into { selectors, decls, media } rules (nested @media walked). */
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
      if (prelude.startsWith("@")) {
        walk(body, prelude);
      } else {
        const decls = body
          .split(";")
          .map((d) => d.trim())
          .filter(Boolean)
          .map((d) => {
            const c = d.indexOf(":");
            return [d.slice(0, c).trim().toLowerCase(), d.slice(c + 1).trim()];
          });
        rules.push({ selectors: prelude.split(",").map((s) => s.trim()), decls, media });
      }
      i = j;
    }
  };
  walk(text, null);
  return rules;
}

const rules = parseRules(css);

/** Convert a length to px (rem/em at 16px); null when not a plain length. */
function toPx(value) {
  const m = /^(-?\d*\.?\d+)(px|rem|em|vw)?$/.exec(value.trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (m[2] === "rem" || m[2] === "em") return n * 16;
  if (m[2] === "vw") return null;
  return n;
}

test("QA: the app container element exists, wraps all screens and its rule centres it", () => {
  const { document } = loadApp();
  const main = document.querySelector("main");
  assert.ok(main, "<main> exists");
  for (const s of document.querySelectorAll("section[id^='screen-']")) {
    assert.ok(main.contains(s), `${s.id} is inside <main>`);
  }
  const matching = rules.filter((r) =>
    r.selectors.some((sel) => sel === "main" || [...main.classList].some((c) => sel === `.${c}`) || (main.id && sel === `#${main.id}`))
  );
  const decls = matching.filter((r) => !r.media).flatMap((r) => r.decls);
  assert.ok(decls.some(([p, v]) => p === "max-width" && v === "480px"), "max-width: 480px outside media queries");
  const margin = decls.filter(([p]) => p === "margin").map(([, v]) => v.split(/\s+/)).pop();
  const ml = decls.filter(([p]) => p === "margin-left" || p === "margin-inline").map(([, v]) => v).pop();
  const centred =
    (margin && (margin.length === 1 ? margin[0] === "auto" : margin[1] === "auto" && (margin[3] ?? margin[1]) === "auto")) ||
    ml === "auto";
  assert.ok(centred, "horizontal margins are auto");
});

test("QA: no rule overrides a button's min-height below 44px (and #flip-btn stays >= 48px)", () => {
  const { document } = loadApp();
  const buttons = [...document.querySelectorAll("button")];
  assert.ok(buttons.length > 0);
  for (const btn of buttons) {
    let minHeight = null;
    for (const r of rules) {
      if (r.media) continue;
      const hit = r.selectors.some((sel) => {
        try {
          return btn.matches(sel);
        } catch {
          return false;
        }
      });
      if (!hit) continue;
      for (const [p, v] of r.decls) if (p === "min-height") minHeight = toPx(v);
    }
    const label = btn.id || btn.textContent.trim();
    assert.ok(minHeight !== null && minHeight >= 44, `${label} min-height ${minHeight}`);
    if (btn.id === "flip-btn") assert.ok(minHeight >= 48, `#flip-btn min-height ${minHeight}`);
  }
  // Media queries must not shrink tap targets either.
  for (const r of rules.filter((x) => x.media)) {
    for (const [p, v] of r.decls) {
      if (p === "min-height" && r.selectors.some((s) => /button|btn/.test(s))) {
        assert.ok(toPx(v) >= 44, `${r.media} ${r.selectors} min-height ${v}`);
      }
    }
  }
});

test("QA: #history-table's parent scroll class sets overflow-x: auto and is not hidden", () => {
  const { document } = loadApp();
  const parent = document.getElementById("history-table").parentElement;
  const classRules = rules.filter((r) => !r.media && r.selectors.some((s) => [...parent.classList].includes(s.replace(/^\./, "")) && s.startsWith(".")));
  const overflowX = classRules.flatMap((r) => r.decls).filter(([p]) => p === "overflow-x" || p === "overflow").map(([p, v]) => (p === "overflow" ? v.split(/\s+/)[0] : v)).pop();
  assert.equal(overflowX, "auto");
  const display = classRules.flatMap((r) => r.decls).filter(([p]) => p === "display").map(([, v]) => v).pop();
  assert.notEqual(display, "none");
  // The history table is still the one inside #screen-history.
  assert.ok(document.getElementById("screen-history").contains(parent));
});

test("QA: no width-like declaration above 480px (including rem/em) outside @media (min-width)", () => {
  for (const r of rules) {
    if (r.media && /min-width/.test(r.media)) continue;
    for (const [p, v] of r.decls) {
      if (!/(^|-)width$/.test(p) && p !== "flex-basis" && p !== "inline-size") continue;
      if (/^border/.test(p) || /^outline/.test(p)) continue;
      for (const token of v.split(/[\s,()]+/)) {
        const px = toPx(token);
        if (px !== null) assert.ok(px <= 480, `${r.selectors.join(",")} { ${p}: ${v} }`);
      }
    }
  }
});

test("QA: every var() reference resolves to a :root custom property and no named colours leak", () => {
  const rootVars = new Set(
    rules.filter((r) => r.selectors.includes(":root")).flatMap((r) => r.decls).map(([p]) => p).filter((p) => p.startsWith("--"))
  );
  assert.ok(rootVars.size > 0, ":root declares custom properties");
  const used = new Set();
  const colourProps = /^(color|background|background-color|border|border-[a-z-]*color|border-(top|right|bottom|left)|outline|outline-color|fill|stroke|box-shadow|text-shadow|caret-color|accent-color)$/;
  const named = /\b(red|blue|green|black|white|gray|grey|yellow|orange|purple|pink|brown|navy|teal|silver|maroon|olive|lime|aqua|fuchsia)\b/i;
  for (const r of rules) {
    for (const [p, v] of r.decls) {
      for (const m of v.matchAll(/var\(\s*(--[\w-]+)/g)) {
        used.add(m[1]);
        assert.ok(rootVars.has(m[1]) || r.selectors.includes(":root"), `${m[1]} used in ${r.selectors} is defined on :root`);
      }
      if (r.selectors.includes(":root")) continue;
      if (colourProps.test(p)) {
        assert.doesNotMatch(v, named, `${r.selectors} { ${p}: ${v} } uses a named colour`);
        assert.doesNotMatch(v, /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i, `${r.selectors} { ${p}: ${v} }`);
      }
    }
  }
  assert.ok(used.size > 0, "custom properties are used via var()");
});

test("QA: index.html links style.css and declares a mobile viewport", () => {
  const { document } = loadApp();
  assert.ok(document.querySelector("link[rel='stylesheet'][href='style.css']"));
  const vp = document.querySelector("meta[name='viewport']");
  assert.match(vp.getAttribute("content"), /width=device-width/);
});
