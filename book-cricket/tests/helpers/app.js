const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const appDir = path.join(__dirname, "..", "..");
const html = fs.readFileSync(path.join(appDir, "index.html"), "utf8");
const script = fs.readFileSync(path.join(appDir, "script.js"), "utf8");

/**
 * Fake AudioContext class that records every oscillator it creates in `oscillators`.
 * @param {object[]} oscillators array that receives each created oscillator
 * @returns {Function} constructor to assign to window.AudioContext
 */
function audioContextStub(oscillators) {
  return class FakeAudioContext {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
    }

    createOscillator() {
      const oscillator = {
        type: "sine",
        frequency: { value: 0 },
        connect() {},
        start() {},
        stop() {},
      };
      oscillators.push(oscillator);
      return oscillator;
    }
  };
}

/**
 * Boot index.html in jsdom and evaluate script.js.
 * @param {object} [options]
 * @param {object} [options.storage] localStorage seed; each value is JSON-stringified.
 * @param {number[]} [options.random] values returned by Math.random in order, then the last repeats (0.5 if empty).
 * @param {boolean} [options.confirm] value returned by window.confirm.
 * @param {object} [options.config] assigned to window.BOOK_CRICKET_CONFIG before the script runs.
 * @param {{ dark: boolean }} [options.colorScheme] stubs window.matchMedia so "(prefers-color-scheme: dark)" matches when dark is true; omitted, matchMedia stays undefined (jsdom default).
 * @param {boolean} [options.audio] when true, window.AudioContext is a stub that records oscillators; omitted, it stays undefined.
 * @returns {{ window: Window, document: Document, click: (id: string) => void, $: (selector: string) => Element | null, oscillators: object[] }}
 */
function loadApp({ storage = {}, random = [], confirm = true, config, colorScheme, audio } = {}) {
  const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only" });
  const { window } = dom;
  const { document } = window;
  const oscillators = [];

  for (const [key, value] of Object.entries(storage)) {
    window.localStorage.setItem(key, JSON.stringify(value));
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

  if (audio) window.AudioContext = audioContextStub(oscillators);

  window.eval(script);

  return {
    window,
    document,
    oscillators,
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
