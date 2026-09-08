# Live bot evaluation

`main.js` uses the same evaluation for the live search and the displayed static
score. Positive scores favor Red. Internal scores are divided by eight for display.

- A student is worth 40 internal points.
- Student mobility counts distinct destinations per piece: two points for an
  unattacked destination, one for an attacked destination, capped at 40 per side.
- Master mobility uses current movement cards and tests enemy attacks after the
  move, including removal of a captured attacker. Zero/one/two safe destinations
  score -60/-28/-8; additional safe destinations give a small capped bonus.
- Immediate enemy master-capture or temple-entry threats incur a penalty. When
  the threatened player is to move, a bounded count of actual surviving replies
  adds pressure for having fewer than four defenses. Student moves and forced
  card-exchange passes count as defenses; unsafe master moves remain legal.
- Temple distance costs four points per move, capped at eight moves. Cached
  empty-board routes use the current pair of cards. This is optimistic: blockers,
  future exchanges, and enemy responses are not modeled as part of the route.

At ordinary search leaves, a maximum of two additional tactical plies examine
captures, quiet moves creating immediate winning threats, and every response to
an existing winning threat. Threatened positions cannot stand pat. Timeouts and
the undo-buffer limit bound extensions. This selective search is not a complete
solution to zugzwang or longer tactical sequences.

Extension wins/losses remain finite (at most 8,000 points), below the 900,000 mate
threshold. Only the full search can prove a mate and report its distance. The
mate-only depth cutoff remains zero; the separate forced-mate verifier is unchanged.

Validation:

```
node --test evaluation.test.js ui_rules.test.js in_play_search.test.js mate_search/forced_mate.test.js
node mate_search/evaluation_benchmark.js 75
```

The benchmark plays two starting deals with bot sides swapped and equal move
budgets against the former evaluator/search cutoff. It checks legal play and
reports results, elapsed time, and completed search depths. It is a smoke test,
not a statistically meaningful strength rating. More elaborate leaf evaluation
reduces raw search depth; tune weights against equal-time games rather than
equal-depth games. Finite evaluation values are not win probabilities or mate
distances.
