# dev/ — import + test tooling (mirror of the session scratchpad)

Run everything from this directory. Scripts read the game from `../gundam-card-game.html`
(`GAMEJS=/path/to/game.js` points the harness at another build).

    python3 -I mkgame.py              # extract the <script> body to game.js (harness.js loads it)
    node run_cards.js                 # every card instantiates + parses -> must say Errors: 0
    node cover.js [cards.json]        # printed 【…】 clauses with no parsed effect
    node rules_check.js               # comprehensive-rules conformance (cites rule numbers)
    node gd06_check.js                # GD06 cards that needed bespoke engine support (43 cases)
    node keywords_check.js            # keyword mechanics vs their reminder text
    node while_check.js               # "While <cond>, …" continuous abilities
    node qub2.js; node qub3.js        # Qubeley token payoff + duel
    node pool_check.js                # pool-wide cards that needed bespoke engine support
    node review_check.js              # regressions for the adversarial-review findings (one case per finding)
    ROUNDS=6 node pt_games.js         # full games across every preset; conservation + rules invariants
    node fuzz_ui.js [seed] [games]    # random human play through the real UI entry points (fuzz_harness.js)
    node pw_check.js                  # Chromium smoke (needs /opt/pw-browsers/chromium)
    NG=8 node pw_play.js              # Chromium: real setup flow + random play to game over; reports JS errors

Importing a new set from the gcg-api dataset (https://github.com/yzRobo/gcg-api, data/cards.ndjson):

    bash test_set.sh GD06 /path/to/cards.ndjson

which converts (tools/gcg2sim.py), appends a GUNDAM_CARDS.push block + bumps sw.js
(tools/import_set.py), regenerates game.js, runs every suite, auto-builds a 50-card preset from the
set (mkdeck.js) and plays 180 games. `gcg2sim.py` was validated field-for-field against ST13/ST14
(identical) and GD05 (wording-only differences).
