# 0004: localStorage schema and failure handling

## Context
Names and the last 10 matches must survive a refresh. The PRD's data model does not say how a tie or the batting order is recorded, and `localStorage` can throw (private mode, quota) or hold corrupt data.

## Decision
- Keys are namespaced `bookCricket.*`: `players`, `history`, and for extras `tally`, `theme`, `muted`.
- History entries follow the PRD shape plus `battedFirst: "p1" | "p2"`; a tie is `winner: null`. Newest first, capped at 10.
- Every read and write is wrapped in try/catch. Corrupt JSON or a wrong shape is treated as the default value; failed writes are ignored.
- Storage functions take the storage object as a parameter so tests can pass fakes.
- Player names must differ (case-insensitive) so `winner` by name is unambiguous.

## Consequences
- The game never crashes because of storage.
- Adding a field later is backward compatible; readers must tolerate older entries without `battedFirst`.
