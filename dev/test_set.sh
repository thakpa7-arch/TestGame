#!/usr/bin/env bash
# One-shot import + full test pass for a new set.
#   test_set.sh <SET_CODE> <cards.ndjson>     (gcg-api bulk file, or any file in that schema)
# Steps: convert -> import into the game (in place, bumps sw.js) -> regenerate game.js -> card suite ->
# coverage report for the new set -> keyword/while/Qubeley suites -> 180 full games -> browser smoke.
set -euo pipefail
SET="$1"; SRC="$2"
PAD="$(cd "$(dirname "$0")" && pwd)"
GAME="$PAD/../gundam-card-game.html"
cd "$PAD"
echo "== 1. convert $SET"
python3 -I tools/gcg2sim.py "$SRC" "$SET" --out "$PAD/${SET}_sim.json"
echo "== 2. import into the game"
python3 -I tools/import_set.py "$PAD/${SET}_sim.json" "$SET" --html "$GAME" --bump-sw "$PAD/../sw.js"
echo "== 3. regenerate game.js"
python3 -I mkgame.py
echo "== 4. every card instantiates and parses"
node run_cards.js | tail -2
echo "== 5. coverage: printed clauses in $SET with no parsed effect"
node cover.js "$PAD/${SET}_sim.json" | sed -n '3,80p'
echo "== 6. mechanics suites"
node rules_check.js | tail -2; [ -f "${SET,,}_check.js" ] && node "${SET,,}_check.js" | tail -2; node keywords_check.js | tail -2; node while_check.js | grep -E "failures"; node qub2.js | tail -1
node pool_check.js | tail -2; node review_check.js | tail -2
echo "== 7. auto-build a $SET test deck and add it as a preset (if enough legal cards)"
node mkdeck.js "$SET" || true
python3 -I mkgame.py
echo "== 8. 180 full games across every preset"
ROUNDS=6 node pt_games.js | tail -6
node fuzz_ui.js 1 150 | tail -3
echo "== 9. browser smoke"
node pw_check.js | grep -E "allPresetSizes|JS ERRORS" | tr '\n' ' '; echo
echo "== done: $SET"
