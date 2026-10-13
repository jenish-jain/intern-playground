# 0003: Pure state transitions plus a single render()

## Context
The PRD asks for a single `gameState` object and a `render()` function, and the project's goal is learning state management.

## Decision
Game rules are pure functions (`createGame`, `playBall`, `startSecondInnings`, `computeResult`) that return a new state object and never touch the DOM or storage. Event handlers replace `gameState` with the returned state and call `render()`, which redraws the visible screen from state. The state shape and DOM ids are fixed in `docs/architecture.md` so tickets can be built in parallel.

## Consequences
- Rules are unit-testable without a DOM.
- `render()` must be idempotent: calling it twice produces the same DOM.
- Adding features (toss, vs Computer) means adding state fields and handlers, not editing the DOM ad hoc.
