const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const appDir = path.join(__dirname, "..", "..");
const html = fs.readFileSync(path.join(appDir, "index.html"), "utf8");
const script = fs.readFileSync(path.join(appDir, "script.js"), "utf8");

/**
 * Boot index.html in jsdom and evaluate script.js.
 * @param {object} [options]
 * @param {object} [options.storage] localStorage seed; each value is JSON-stringified.
 * @param {Object<string, string>} [options.rawStorage] localStorage seed stored as-is (e.g. invalid JSON); applied after `storage`.
 * @param {number[]} [options.random] values returned by Math.random in order, then the last repeats (0.5 if empty).
 * @param {boolean} [options.confirm] value returned by window.confirm.
 * @param {object} [options.config] assigned to window.BOOK_CRICKET_CONFIG before the script runs.
 * @param {{ dark: boolean }} [options.colorScheme] stubs window.matchMedia so "(prefers-color-scheme: dark)" matches when dark is true; omitted, matchMedia stays undefined (jsdom default).
 * @returns {{ window: Window, document: Document, click: (id: string) => void, $: (selector: string) => Element | null }}
 */
function loadApp({ storage = {}, rawStorage = {}, random = [], confirm = true, config, colorScheme } = {}) {
  const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only" });
  const { window } = dom;
  const { document } = window;

  for (const [key, value] of Object.entries(storage)) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
  for (const [key, value] of Object.entries(rawStorage)) {
    window.localStorage.setItem(key, value);
  }

  const values = random.slice();
  let index = 0;
  window.Math.random = () => {
    if (values.length === 0) return 0.5;
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };

  window.confirm = () => confirm;

  if (config !== undefined) window.BOOK_CRICKET_CONFIG = config;

  if (colorScheme !== undefined) {
    window.matchMedia = (query) => ({
      media: query,
      matches: query === "(prefers-color-scheme: dark)" && colorScheme.dark,
      addEventListener() {},
      removeEventListener() {},
    });
  }

  window.eval(script);

  return {
    window,
    document,
    click(id) {
      const el = document.getElementById(id);
      if (!el) throw new Error(`No element with id "${id}"`);
      el.click();
    },
    $(selector) {
      return document.querySelector(selector);
    },
  };
}

module.exports = { loadApp };
