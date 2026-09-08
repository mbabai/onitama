# Forced-mate audit — September 7, 2026

All **115,078 unique saved starting setups** are forced wins for the starting
player. The canonical JSON and browser bundle now retain each setup’s **shortest
forced mate** and a complete principal variation. The original scan resume index
remains **6,041,280**.

| Winner’s moves | Plies | Verified setups |
| --- | --- | ---: |
| 2 | 3 | 5,240 |
| 3 | 5 | 79,414 |
| 4 | 7 | 14,922 |
| 5 | 9 | 8,211 |
| 6 | 11 | 7,286 |
| 7 | 13 | 5 |

The two old mate-in-8 (15-ply) claims were overestimates. Both are **mate in 7
(13 plies)**:

* `ppmppeeeeeeeeeeeeeeePPMPP06-25-01-27-21XR`
* `ppmppeeeeeeeeeeeeeeePPMPP06-26-01-27-21XR`

The other three 13-ply claims were confirmed. These five positions cannot be
proved within the old 11-ply limit; they received separate explicit deeper checks.
Every other saved distance was already minimal.

## What was wrong

1. The former mate scanner accepted a transposition-table entry whenever its
   stored depth was **greater than or equal to** the requested depth. A position
   reached later along another branch could reuse a deeper proof, extending the
   effective horizon beyond the configured limit. Normalizing mate scores by ply
   did not enforce that limit or establish the shortest root mate.
2. Both merge paths reduced records to `game_state` and `mate_plies`, discarding
   their principal variations. The former PV extractor followed replaceable table
   entries and could stop before the win, without rejecting an incomplete line.
3. Positions with no legal piece moves were treated as leaf draws. The official
   rules instead require a pass **and a choice of either card to exchange**.
   Both verification and live play now implement that choice.
4. Live play carried an old mate evaluation into later positions, checking only
   the first attacker move for a deviation. An attacker could subsequently throw
   away the win while the old mate label remained. Each move now invalidates that
   position’s remembered evaluation.

Rule source: [Arcane Wonders rulebook, “Step 2: Exchange Cards”](https://www.arcanewonders.com/wp-content/uploads/2021/05/Onitama-Rulebook.pdf).

## Meaning of “verified”

`forced_mate.js` implements a bounded AND/OR proof search, independently of the
playing engine’s alpha-beta evaluator. An attacker node succeeds if **one** legal
move forces a win; a defender node succeeds only if **all** legal replies lose.
Defender wins and nonterminal horizon leaves are failures to prove the attack.
Cycles cannot establish a bounded win by themselves.

The solver tests 1, 3, 5, … plies in increasing order. The first successful bound
is therefore the shortest forced mate. It uses neither static evaluations nor
selective pruning. Cache lookup checks the complete piece masks, cards, turn,
generation, and **exact remaining depth**; a hash collision only evicts an entry.

The principal variation chooses a fastest winning attacker move and a defender
reply with the longest remaining forced-mate distance. It is rebuilt from proof
queries, checked for exact length, and required to terminate in the winner’s
capture or temple entry. It illustrates one optimal defense; it is not the entire
branching strategy. Other replies can require different attacker moves.

Each verified record stores `verification: "forced-v1"`, `status: "verified"`,
`mate_plies`, `mate_moves`, `verified_depth`, and `principal_variation`. Moves use
`card_id`, `from`, and `to`; compulsory exchanges use `card_id` and `pass: true`.
Squares are indexed 0–24, row-major from the original Blue home row. Replay labels
them A1–E5, independent of the live board’s player-perspective labels.

Merge code preserves these fields, prefers verified results over historical
claims, and retains the lower verified mate if both are verified. JSON and JS
use compact serialization because the full move library is approximately 44 MB.

## Validation and reproduction

```powershell
node --test mate_search/forced_mate.test.js
node mate_search/validate_library.js
node mate_search/audit_starting_states.js 8
node mate_search/build_worker_bundle.js
node mate_search/dev_server.js
```

The audit is resumable through input-hash-specific JSONL checkpoints under the
ignored `.audit` directory. It checks each historical claim through at least 11
plies, or its claimed depth if greater. Failed claims are preserved in
`mate_audit_unproven.json`, never silently discarded. That file is empty after
this audit. `mate_audit_report.json` records the input SHA-256, counts, and changes.

All **671,354 saved PV moves** were independently replayed with string-board
rules, checking legal movement, card exchange, turn order, and the winning
terminal state. Tests also compare the independent rules with both engines,
exercise forced passing, depth limits, collisions, and lossless merge round trips.
The HTTP and file-opened scanner use the same generated worker source.

This audit rechecked **every saved positive claim**, not all six million original
scan outcomes. It establishes the library’s correctness and minimal distances;
it does not establish that the old scan found every possible forced mate. Reset
and run the corrected scanner to investigate potentially missed setups. Resetting
the scanner leaves the saved library available and persists the new scan cursor.

## Interface

The home page, game board, custom setup, and search dashboard share the new theme.
Puzzle selectors show 100 entries per page and support card-name filtering;
random selection still draws from all matching setups. **Study** opens a saved
main line with previous/next controls, playback, current cards, and clickable
moves. Small screens receive a rearranged game board instead of a miniature
desktop layout. Reduced-motion preferences disable decorative animation.

The follow-up UI keeps the original tan/beige appearance. Each card can be
included (eligible), excluded, or required (guaranteed in the five-card deal).
At most five cards can be required; at least five must remain available. These
persisted choices apply equally to new deals, puzzle counts, selection, and
random puzzles. Required cards are shuffled across both hands and the neutral slot.

Click the evaluation bar when it shows a forced mate to toggle a translucent
next-move arrow and card name. It follows the saved line at matching positions,
or the current engine's exact root move after a deviation, for either player.
Hints are tied to the full current state and clear when the board changes.
For a compulsory pass the hint identifies the card to exchange. Enter/Space
also toggle the hint. Run `node --test ui_rules.test.js` for these rules.

Live search reuse (September 8): the worker retains its transposition table across
moves and immediately returns an exact mate already solved at the current root.
The UI caches exact mate positions from searched lines for the current game and
uses audited saved-line moves without starting a worker. Background analysis
stops on a reusable exact mate. Bound-only entries are never promoted to exact
mate results; deviations can require more search using the retained table.
Forced-loss searches retain the exact move that maximizes resistance.
Regression coverage: `node --test in_play_search.test.js ui_rules.test.js`.
The five-ply test uses 3,779 initial nodes, zero on a repeated root, and 345 to
resolve its child from retained bounds; repeating that child also uses zero.
