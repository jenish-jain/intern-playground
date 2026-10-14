const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp } = require("./helpers/app.js");

const appDir = path.join(__dirname, "..");
const repoRoot = path.join(appDir, "..");

/** Element ids referenced in docs/architecture.md, read from the doc itself. */
function contractIdsFromDoc() {
  const doc = fs.readFileSync(path.join(repoRoot, "docs", "architecture.md"), "utf8");
  const ids = new Set(doc.match(/#[a-z0-9]+(?:-[a-z0-9]+)*/g).map((s) => s.slice(1)));
  return [...ids].filter((id) => !/^[0-9a-f]{3,8}$/.test(id));
}

test("every id mentioned in docs/architecture.md exists exactly once", () => {
  const { document } = loadApp();
  const ids = contractIdsFromDoc();
  assert.ok(ids.length >= 40, `found ${ids.length} ids in the doc`);
  for (const id of ids) {
    assert.equal(document.querySelectorAll(`[id="${id}"]`).length, 1, `#${id} appears once`);
  }
});

test("screen sections are <section> elements and setup has no hidden class", () => {
  const { document } = loadApp();
  const sections = [...document.querySelectorAll("section[id^='screen-']")];
  assert.equal(sections.length, 6);
  const visible = sections.filter((s) => !s.classList.contains("hidden")).map((s) => s.id);
  assert.deepEqual(visible, ["screen-setup"]);
});

test("#balls-select default is 6 via the selected option", () => {
  const { $ } = loadApp();
  const select = $("#balls-select");
  assert.equal(select.options.length, 3);
  assert.equal(select.selectedIndex, 0);
  assert.equal(select.options[select.selectedIndex].value, "6");
});

test("require('../script.js') exports only functions without touching the DOM", () => {
  assert.equal(typeof document, "undefined");
  const mod = require("../script.js");
  const allowed = ["flipPage", "tossWinner", "resultForPage", "soundForBall", "createGame", "playBall",
    "startSecondInnings", "computeResult", "normalizeNames", "loadPlayers", "savePlayers", "loadHistory",
    "addHistory", "clearHistory", "buildHistoryEntry", "resolveTheme", "toggleTheme",
    "loadTheme", "saveTheme", "loadMuted", "saveMuted", "findTallyKey", "updateTally", "loadTally",
    "saveTally"];
  for (const [name, value] of Object.entries(mod)) {
    assert.ok(allowed.includes(name), `${name} is a documented export`);
    assert.equal(typeof value, "function", `${name} is a function`);
  }
});

test("loadApp with no options leaves localStorage empty", () => {
  const { window } = loadApp();
  assert.equal(window.localStorage.length, 0);
  assert.equal(window.BOOK_CRICKET_CONFIG, undefined);
});

test("loadApp instances are isolated from each other", () => {
  const a = loadApp({ storage: { k: [1, 2] }, random: [0.9] });
  const b = loadApp();
  assert.equal(a.window.localStorage.getItem("k"), "[1,2]");
  assert.equal(b.window.localStorage.getItem("k"), null);
  assert.equal(b.window.Math.random(), 0.5);
  assert.equal(a.window.Math.random(), 0.9);
});

test("package.json matches the ticket", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(appDir, "package.json"), "utf8"));
  assert.equal(pkg.name, "book-cricket");
  assert.equal(pkg.private, true);
  assert.equal(pkg.engines.node, ">=20");
  assert.equal(pkg.scripts.test, "node --test");
  assert.ok(pkg.devDependencies.jsdom);
  assert.deepEqual(Object.keys(pkg.devDependencies), ["jsdom"]);
  assert.equal(pkg.dependencies, undefined);
  assert.ok(fs.existsSync(path.join(appDir, "package-lock.json")));
});

test("root .gitignore ignores node_modules/", () => {
  const gitignore = fs.readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
  assert.ok(gitignore.split(/\r?\n/).includes("node_modules/"));
});

test("CI workflow runs npm ci and npm test in book-cricket on Node 20", () => {
  const yml = fs.readFileSync(path.join(repoRoot, ".github", "workflows", "book-cricket.yml"), "utf8");
  assert.match(yml, /push:/);
  assert.match(yml, /pull_request:/);
  assert.match(yml, /node-version:\s*["']?20/);
  assert.match(yml, /working-directory:\s*book-cricket/);
  assert.match(yml, /run:\s*npm ci/);
  assert.match(yml, /run:\s*npm test/);
});

test("index.html loads no external scripts or stylesheets", () => {
  const { document } = loadApp();
  const srcs = [...document.querySelectorAll("script[src], link[href]")]
    .map((el) => el.getAttribute("src") || el.getAttribute("href"));
  assert.deepEqual(srcs.sort(), ["script.js", "style.css"]);
});

test("README has a Book Cricket section", () => {
  const readme = fs.readFileSync(path.join(repoRoot, "README.md"), "utf8");
  assert.match(readme, /#+\s*Book Cricket/);
  assert.match(readme, /npm test/);
});
