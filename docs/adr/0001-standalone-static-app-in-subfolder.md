# 0001: Standalone static app in `book-cricket/`

## Context
The repository already contains `dobby`, a Go CLI. The PRD asks for a plain HTML/CSS/JS app with no framework and no build step.

## Decision
Build the game as a self-contained static app in `book-cricket/` (`index.html`, `style.css`, `script.js`). It shares nothing with the Go code. The verify contract checks only the game (`npm test` in `book-cricket/`).

## Consequences
- The app can be opened straight from disk or published by pointing GitHub Pages/Netlify at `book-cricket/`.
- Go code is not checked by the verify contract; game tickets must not modify Go files.
