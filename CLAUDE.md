# Project notes for Claude

## Sharing playtest links (user preference)
When sharing a link to play/preview the game, ALWAYS send **both** of these formats, and only these:
1. A **raw.githack** link pinned to the current commit, e.g.
   `https://raw.githack.com/thakpa7-arch/TestGame/<full-40-char-commit-sha>/gundam-card-game.html`
   (open in a real browser tab — full card art).
2. The **Artifact** link (hosted on claude.ai) — renders inline in the Claude app.

Do not default to statically.io / jsDelivr / raw.githubusercontent unless the user asks.

## The game
- `gundam-card-game.html` is a single-file browser game (Gundam Card Game simulator). All card
  data lives in `GUNDAM_CARDS` (+ `GUNDAM_CARDS.push(...)` blocks). `sw.js` caches the shell for
  offline play — bump its `CACHE` version on every change to the HTML.
- Development happens on branch `claude/gundam-tcg-card-game-a1qm2z`.

## Validating changes (Node test harness)
- The harness lives in the session scratchpad (`harness.js` stubs DOM/timers and exposes internals
  via `global.__G`; `game.js` is the extracted `<script>` body, regenerated after every HTML edit).
- After any change, regenerate `game.js` and run the suite; every script must report `Errors: 0`:
  `run_cards.js` (all cards), `pt_gd05_games.js` (full GD05 games), `fuzz_player.js` / `fuzz_hard.js`
  (AI win-rate sanity). Keep base-set behavior and win rates steady.
