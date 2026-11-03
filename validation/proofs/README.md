# Exact minimum certificates for the two original final puzzles

Both original graphs and thresholds are preserved. The stable IDs are 9 and 10;
their positions in the expanded campaign can change.

| Stable ID | Original title | Certified minimum | Exhaustively excluded | Visited states in final proof |
|---|---|---:|---:|---:|
| 9 | Moonlit circle | 15 | Every solution using at most 14 moves | 110,905 |
| 10 | Perfect harmony | 18 | Every solution using at most 17 moves | 745,888,292 |

`original-final-certificates.json` contains the exact winning edge-index sequences,
proof metadata, source SHA-256, and exact final percentages. These are offline
validation certificates, not player-facing hints or browser assets.

## Reproduce

Run from the project root:

```sh
g++ -O3 -std=c++17 tools/certify-final-levels.cpp -o /tmp/certify-final-levels
/tmp/certify-final-levels 9 14 180
/tmp/certify-final-levels 10 17 180
```

The original 9/10 graph definitions are intentionally fixed in this specialized
solver. The separate `original-levels.json` snapshot documents those definitions.
The proof succeeds only when the result says `found:false,timedout:false`.
The recorded final runs took approximately 0.01 and 82 seconds respectively;
runtime can differ between machines. A timeout is not a certificate.

## Why the search and pruning are exact

1. **Integer states.** For a horizon `T`, the solver multiplies every percentage
   by `2^T`. Starting with `100 * 2^T` at the root makes every average through
   step `T` an exact integer. State transitions and target comparisons use no
   floating-point tolerance.

2. **All shorter solutions are included.** Every visited state is tested for a
   win before pruning or expanding. Thus a completed unsuccessful horizon-17
   traversal excludes solutions of every length up to 17, not merely those of
   exactly 17 moves. Equal-endpoint actions can be omitted because they do not
   change the state.

3. **At most one newly met goal per move.** Of two endpoints, the one with the
   larger old weight cannot increase under averaging. If it was below its
   goal, it remains below. Thus one move can newly meet at most one goal. A
   state with more unmet goals than remaining moves is impossible. When these
   counts are equal, every remaining move must reduce the unmet count; the
   closing search examines precisely those candidate moves.

4. **Weighted target upper bounds.** For any fixed remaining sequence, the
   final amount at target `g` is a dot product `p_g · w` with current weights
   `w`. Because every averaging matrix is symmetric, `p_g` is the distribution
   produced by starting with one unit at `g` and reversing the sequence. The
   distance theorem therefore gives
   `0 <= p_g(v) <= 1 / (distance(g,v)+1)`, and vertices beyond the remaining
   move radius have coefficient zero. For nonnegative integer target weights
   `lambda_g`, their combined coefficient vector `q` has total mass
   `sum(lambda_g)`, each coordinate is at most `max(lambda_g)`, and each is at
   most the sum of its individual distance caps. The solver maximizes `q · w`
   over this relaxed capacity set by filling the highest-weight vertices
   first. If even that upper bound is below the weighted required target sum,
   success is impossible. All graph-distance denominators divide 420, so the
   capacities, objective, and comparisons are exact integers. The finite
   collection of target-weight vectors only affects pruning strength; it does
   not restrict possible solutions.

5. **Commuting edges.** Operations on vertex-disjoint edges commute. Any
   feasible action word has a lexicographically minimal equivalent ordering,
   which cannot contain an adjacent inverted pair of independent edges. The
   solver omits only those inverted pairs. The direct final-move check may
   include additional noncanonical words, which cannot invalidate exclusion.

6. **Exact caching includes the ordering context.** Keys contain all seven
   integer vertex weights and the last edge index, and equality compares all
   of them; hash collisions alone never merge states. A previously exhausted
   identical state/context with at least as many remaining moves dominates a
   later visit. Identical ancestors cannot occur because averaging unequal
   endpoints strictly reduces the sum of squared weights. The cache has a
   size cap; reaching it disables further caching rather than omitting work.

## Independent consistency checks

The level-9 15-move witness and original level-10 18-move witness were replayed
with Python `fractions.Fraction`. They conserve exactly 100% and first satisfy
all goals at moves 15 and 18 respectively. Together with the completed shorter-
horizon exclusions, this establishes the minima.

Earlier weaker versions of the exact search independently completed the same
exclusions: level 9 visited 293,521 states; level 10 version 3 visited
2,461,483,460 states. Their logs remain alongside the final proof results.
The exploratory MILP runs timed out and are not used as certificates.
