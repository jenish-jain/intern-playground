# PRD: Book Cricket (2-Player, Single Page App)

## 1. Overview

A browser version of book cricket, the classroom game where you open a book to a random page and the last digit of the page number decides the runs. Two players take turns batting on the same device. Names and match history are saved in the browser (`localStorage`); there is no backend.

**Goal:** a small learning project for DOM manipulation, state management and `localStorage` in plain HTML, CSS and JS, with no frameworks and no build step.

The game lives in the `book-cricket/` folder of this repository (the repository root also holds the unrelated `dobby` Go CLI, see ADR 0001).

## 2. Game rules

- Two players: Player 1 and Player 2. Each bats exactly one innings.
- Each innings has a fixed number of balls, chosen on the setup screen: **6 (default), 12 or 18**.
- On each ball the batter presses **Flip Page**. The app picks a random page number from 1 to 200 (`Math.floor(Math.random() * 200) + 1`) and takes the last digit (`page % 10`):

  | Last digit | Result |
  |---|---|
  | 1–6 | That many runs |
  | 7, 8, 9 | Dot ball (0 runs) |
  | 0 | OUT (0 runs) |

- Every flip, including an OUT, uses up one ball.
- An innings ends when the batter is OUT (one wicket per innings), when no balls are left, or (second innings only) when the chasing batter's score exceeds the first innings score.
- **Target** = first innings score + 1.
- The higher total wins. Equal totals are a tie.
- By default Player 1 bats first and Player 2 chases. If the optional toss is enabled, a coin flip decides who bats first.

## 3. User flow

1. **Setup screen:** enter both names, pick balls per innings, optionally tick "Toss for who bats first", press Start.
2. **Toss screen** (only if the toss is ticked): shows the coin flip result, e.g. "Ravi won the toss and bats first". Press Continue.
3. **Innings 1:** the batter flips pages. The screen shows the page number, the result, the running score and the balls left, plus a ball-by-ball log.
4. **Innings break:** shows the first innings score and the target. Press "Start innings 2".
5. **Innings 2:** same as innings 1, also showing the target and the runs needed.
6. **Result screen:** winner banner (or tie), both scores and the ball-by-ball log of both innings. Buttons: **Play Again** (same names and balls, straight into a new match), **Change Players** (back to setup), **View History**.
7. **History screen:** table of the last 10 matches, newest first, a **Reset history** button (asks for confirmation) and a **Back** button. Also reachable from the setup screen.

## 4. Decisions made in planning

- **Names:** trimmed; at most 20 characters. A blank name becomes "Player 1" / "Player 2". Two names that are equal ignoring case are rejected with an error message, so winners in the history are unambiguous.
- **Toss** is an opt-in checkbox on the setup screen, unticked by default.
- **Tie in history:** stored as `winner: null` and shown as "Tie".
- **History** keeps the 10 most recent matches; adding an 11th drops the oldest. Only completed matches are saved.
- **Player names** are saved when Start is pressed and pre-filled on the next visit.
- If `localStorage` is unavailable or contains invalid data, the game still works; missing or corrupt data is treated as empty.
- Nice-to-have features are planned as a separate, lower-priority epic, built after the MVP.

## 5. Features

### Must have (MVP)
- Setup form with names, balls per innings, optional toss
- Random page flip with the last-digit logic
- Live scoreboard and ball-by-ball log
- Innings break with target; runs needed during the chase
- Win, lose or tie result with full scorecard
- Player names saved in `localStorage` and pre-filled next visit
- Match history (last 10) saved in `localStorage`, history screen, reset history button
- Layout usable on mobile (≥ 320 px wide) and desktop

### Nice to have (EXTRA epic)
- Page-flip animation and a book graphic
- Sound effects for a six or a wicket, with a mute toggle
- Win/loss/tie tally per player name
- Dark mode toggle
- "vs Computer" mode (Player 2 is the computer and flips automatically)

## 6. Data model (localStorage)

```js
// key: "bookCricket.players"
{ p1: "Asha", p2: "Ravi" }

// key: "bookCricket.history"  (newest first, max 10)
[
  {
    date: "2026-10-13T12:30:00.000Z",   // new Date().toISOString()
    p1: { name: "Asha", score: 18 },
    p2: { name: "Ravi", score: 14 },
    winner: "Asha",                       // null for a tie
    ballsPerInnings: 6,
    battedFirst: "p1"                     // "p1" or "p2"
  }
]
```

Nice-to-have keys: `bookCricket.tally`, `bookCricket.theme`, `bookCricket.muted` (see architecture).

## 7. Acceptance criteria (product level)

- Every flip gives the result defined in the table above.
- The innings ends correctly on OUT, on no balls left, and when the target is reached.
- The winner is always computed correctly, including ties.
- Names and history survive a page refresh.
- The layout works on both mobile and desktop.

## 8. Out of scope

Online multiplayer, accounts, a backend, real book scanning, tournaments, deployment automation (the app can be opened locally or published to GitHub Pages/Netlify by hand).
