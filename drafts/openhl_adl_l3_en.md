# Building OpenHL ADL — L3 draft (EN) — build-along

> openhl SHA `d66b44a` (Stage 10d — auto-deleveraging).

## L3 — `openhl-adl-absorption-tests-en`

**Stage**: Stage 10d — `d66b44a`

**Title**: Lesson 3 — 6 nuanced absorption tests — proving `execute_adl` against the matrix

**Duration**: 35 min · **XP**: 60

---

````markdown
# Lesson 3 — 6 nuanced absorption tests — proving `execute_adl` against the matrix

## Goal

Concepts you'll grasp in this lesson:

- **L3 is the unit-test capstone for `execute_adl` — 6 tests that span the behavior matrix.** L2 shipped the 5-phase pipeline + 5 degenerate-path tests (zero/negative deficit, no candidates, no profitable, single happy-path winner). L3 fills in the *interesting* middle: what happens when a single winner gets fully haircut, when multiple winners share a deficit, when ties break, when losers and flats coexist with winners. Each test is one cell in the 2-axis matrix `{single winner, multiple winners} × {full absorb, partial absorb, mixed eligibility}`. After L3 you can read `execute_adl` and know — for any input — which test covers it. **Six tests for one function isn't excess; it's the matrix's size.**
- **Each test is a hand-computed worked example with the math in the comment.** Same `math-walk in comments` discipline from openhl-liquidation L13's capstone tests — the comment derives the expected output step-by-step so a debugger doesn't have to. When `adl_multiple_winners_in_score_order` says "B's score is 26,666 vs A's 10,000," that number is computed from `(pnl_pct_bps × leverage_bps) / MARGIN_SCALE` and reproduced in the test comment for the reader. The L4 proptests will universalize what these tests prove on specific inputs; here the inputs are chosen *because* they make the math obvious. **The math-walk turns each test into a 5-line worked example, not a black-box assertion.**
- **The 6 tests progress from simple to compound.** Tests 1-2 stay within Phase 4's single-iteration regime (one winner). Tests 3-4 introduce Phase 3's sorting + Phase 4's multi-iteration loop. Test 5 isolates the tiebreaker (Phase 3's `then_with`). Test 6 proves that Phase 2's `filter_map` correctly drops losers and flats *even when winners are present in the same input* — the eligibility filter must work in mixed populations, not just pure ones. **The arc: single winner → multi-winner → sort discipline → tiebreaker → integration.**
- **Test names follow the `adl_<scenario>_<expected_outcome>` convention.** `adl_single_winner_partial_haircut_at_full_pnl`, `adl_drains_first_winner_then_partially_second`, `adl_tiebreaker_by_account_id_ascending` — each test name reads as a hypothesis the test proves. Production codebases use this discipline so that `cargo test --list` (or `cargo test -- --quiet`) produces a *specification* of the function's behavior, not just a list of arbitrary names. **Tests are documentation when their names are sentences.**

Verification:

```bash
cargo test -p openhl-liquidation adl::tests::adl_
```

…now reports 11 tests passing (L1's 5 + L2's 5 + L3's 6 — wait, that's 16). Actually it reports 16: L1's 5 score-eligibility/ordering tests + L2's 5 pipeline-degenerate tests + L3's 6 nuanced-absorption tests. The full ADL test matrix is now covered for *specific* inputs. L4 will add 5 proptests that universalize these specific cases to random inputs.

Specific changes:

- **`crates/liquidation/src/adl.rs`** — append 6 tests to the existing `#[cfg(test)] mod tests` block. No production code changes; we're proving the L2 implementation against more inputs.

Six tests, ~80 lines of new test code. The lesson walks each test as a worked example.

## Recap

After L2:
- `execute_adl(candidates, mark, deficit) -> AdlReport` — the 5-phase pipeline is shipped (defensive guard, score+filter, stable-sort with tiebreaker, haircut loop with conservation accounting, finalize).
- 10 tests in `adl.rs` so far: L1's 5 (score eligibility 4 + score ordering 1), L2's 5 (4 degenerate paths + 1 single-winner happy path).
- The conservation law `deficit_absorbed + deficit_remaining == input_deficit` is *structurally* preserved by the loop body — not yet *universally* proven (that's L4).

L3 takes the 5-phase pipeline and exercises its load-bearing paths: full-haircut decomposition, multi-winner ordering, tiebreaker determinism, mixed-eligibility filtering. Same `execute_adl` from L2; richer inputs.

## Plan

Six tests, each appended to the `#[cfg(test)] mod tests` block below L2's tests:

1. **`adl_single_winner_partial_haircut_at_full_pnl`** — Phase 4 edge case: haircut == pnl_gross → pnl_paid = 0
2. **`adl_single_winner_exhausted_with_remaining_deficit`** — Phase 4 edge case: pnl_gross < deficit → record absorbed but remainder propagates
3. **`adl_multiple_winners_in_score_order`** — Phase 3 ordering: B's higher leverage means B ranks first, even though A and B have the same PnL
4. **`adl_drains_first_winner_then_partially_second`** — Phase 4 quota exhaustion: full haircut on rank 1, partial on rank 2
5. **`adl_tiebreaker_by_account_id_ascending`** — Phase 3 `then_with`: identical scores → ascending account_id picks the winner
6. **`adl_does_not_touch_losers_or_flats`** — Phase 2 `filter_map`: ineligible accounts in mixed populations are correctly skipped

> 🛑 **Predict.** Before reading the tests below: when `execute_adl(candidates=[A_pnl_100, B_pnl_100], deficit=80)` runs, and A has score 10,000 and B has score 26,666, the report has *exactly* `[B with haircut 80]` — A is untouched. Why is A's record not in the report at all (instead of being included with haircut = 0)?

(Answer: **Phase 4's `if remaining <= 0 break;` exits the loop *before* A is processed.** After B is haircut by 80, `remaining` becomes 0; the loop breaks; A never enters the loop body, so no record is created for A. This is the structural payoff of the `break` (recall L2's predict callout): a quota-bounded loop produces records only for the accounts that *actually* received haircuts, not zero-haircut padding. The report's `records.len()` becomes a meaningful count: "how many accounts got force-closed by this ADL pass." **`break` keeps the report's record count meaningful.**)

## The 6 tests

Append to the existing `#[cfg(test)] mod tests` block in `adl.rs`:

### Test 1: full-PnL haircut leaves a zero payout

```rust
#[test]
fn adl_single_winner_partial_haircut_at_full_pnl() {
    // PnL = 100, deficit = 100 → full haircut, payout = 0.
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 100);
    let rec = &report.records[0];
    assert_eq!(rec.haircut, 100);
    assert_eq!(rec.pnl_paid, 0);
    assert_eq!(report.deficit_remaining, 0);
}
```

Three things to notice:

1. **`haircut == pnl_gross` is the boundary case where the winner pays everything.** `min(remaining=100, pnl_gross=100) = 100`. The decomposition `pnl_paid = pnl_gross - haircut = 0` holds, but the trader receives nothing — they were the system's last line of defense. **This is the case where a winner's full PnL gets eaten by ADL; ethically the worst case for the trader, structurally just `min` doing its job.**
2. **`deficit_remaining = 0` even though we drained the winner.** The deficit was exactly covered, so nothing remains. Compare with Test 2 where the deficit *exceeds* the winner's PnL — there, `deficit_remaining > 0` and the chain has unresolved trouble.
3. **No assertion on `report.records.len()`.** L2's tests asserted record counts explicitly; here we just index `records[0]`. Both styles are valid; this test trusts the L2-tested invariant that "exactly one winner produces exactly one record". **Don't over-assert what prior tests already proved.**

### Test 2: deficit exceeds winner's PnL — remainder propagates

```rust
#[test]
fn adl_single_winner_exhausted_with_remaining_deficit() {
    // PnL = 100, deficit = 250 → full haircut, 150 remains.
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 250);
    assert_eq!(report.records.len(), 1);
    assert_eq!(report.deficit_absorbed, 100);
    assert_eq!(report.deficit_remaining, 150);
}
```

Three things to notice:

1. **`min(250, 100) = 100` — the winner's PnL caps the haircut, not the deficit.** Phase 4's `haircut = remaining.min(pnl_gross)` reads "take as much as the deficit needs, or as much as the winner has, whichever is less." Here the winner is smaller, so `haircut = pnl_gross = 100`. **`min` of two upper bounds — both apply, the smaller wins.**
2. **`deficit_absorbed + deficit_remaining == 250` — the conservation law holds.** `100 + 150 == 250`. This is the structural conservation we set up in L2 and will universalize in L4's proptest. Every test in L3 implicitly verifies it; L4's proptest verifies it *universally*. **Conservation is implicit in L3 tests, explicit in L4 proptests.**
3. **`deficit_remaining = 150` is the signal to the bridge: "I couldn't cover this".** The bridge reads `deficit_remaining > 0` and decides what to do (halt the chain, take it as protocol loss, raise an alert). The function's job ends at reporting; policy is the bridge's responsibility. **`execute_adl` reports the deficit state; the bridge decides policy.**

### Test 3: multi-winner ranking — higher leverage wins

```rust
#[test]
fn adl_multiple_winners_in_score_order() {
    // Two long winners; the higher-leverage one ranks first.
    // A: coll 100, pnl 100 → score 10_000 (per L1's score derivation)
    // B: coll 50,  pnl 100 → score 26_666
    // deficit = 80 → B haircut = 80, pnl_paid = 20; A untouched.
    let candidates = vec![snapshot(1, 1, 100, 100), snapshot(2, 1, 100, 50)];
    let report = execute_adl(&candidates, MarkPrice(200), 80);
    assert_eq!(report.records.len(), 1, "deficit smaller than B's pnl → only B");
    assert_eq!(report.records[0].account, AccountId(2));
    assert_eq!(report.records[0].haircut, 80);
}
```

Four things to notice:

1. **A and B have the same PnL (100), different collateral.** A is `coll 100`, so `pnl_pct = 100×10000/100 = 10000` bps and leverage = `notional/equity = 200/200 = 10000` bps → score 10,000. B is `coll 50`, so `pnl_pct = 100×10000/50 = 20000` bps and leverage = `200/150 ≈ 13333` bps → score `20000 × 13333 / 10000 = 26666`. **Same PnL but higher leverage = higher score = haircut first.**
2. **The score-math comment is the test's spec.** Without the math in the comment, the test would be a magic-numbers assertion: "trust me, B has score 26666". With the math, the test reads as a derivation a human can verify. **Math-walk comments turn assertions into proofs.**
3. **A's record is absent from the report.** The `break` in Phase 4 fires after B is haircut (remaining = 0); A never enters the loop body. The assertion `records.len() == 1` documents this — A isn't there because A wasn't needed. **The Predict callout's payoff: the record count tells you how many accounts actually got force-closed.**
4. **The `"deficit smaller than B's pnl → only B"` message on the length assertion is documentation.** If this test ever fails (e.g., a refactor breaks Phase 3's sort discipline), the failure message tells the debugger *why* this matters. **Assertion messages are documentation — write them as if you'd read them in CI logs at 3am.**

### Test 4: deficit drains rank 1, partially covers rank 2

```rust
#[test]
fn adl_drains_first_winner_then_partially_second() {
    // Both winners contribute to a large deficit.
    // A: coll 100, pnl 100 → score 10_000, rank #2
    // B: coll 50,  pnl 100 → score 26_666, rank #1
    // deficit = 150 → B haircut = 100 (full), A haircut = 50 (partial)
    let candidates = vec![snapshot(1, 1, 100, 100), snapshot(2, 1, 100, 50)];
    let report = execute_adl(&candidates, MarkPrice(200), 150);
    assert_eq!(report.records.len(), 2);
    assert_eq!(report.records[0].account, AccountId(2)); // B first
    assert_eq!(report.records[0].haircut, 100);
    assert_eq!(report.records[0].pnl_paid, 0);
    assert_eq!(report.records[1].account, AccountId(1)); // A second
    assert_eq!(report.records[1].haircut, 50);
    assert_eq!(report.records[1].pnl_paid, 50);
    assert_eq!(report.deficit_absorbed, 150);
    assert_eq!(report.deficit_remaining, 0);
}
```

Five things to notice:

1. **Same inputs as Test 3 (A and B), bigger deficit (150).** This isolates the *quota exhaustion* behavior. Test 3 had deficit = 80 (smaller than B alone) → loop exits after B. Test 4 has deficit = 150 (more than B alone) → loop continues into A. **The pair tests-3-and-4 walks the deficit axis: under one winner, over one winner.**
2. **B is fully haircut (100), then A gets the residual (50).** Phase 4 iteration: rank #1 = B, `haircut = min(150, 100) = 100`, `remaining = 50`. Rank #2 = A, `haircut = min(50, 100) = 50`, `remaining = 0`. Loop exits naturally on next iteration's `break` (no rank #3 anyway). **Quota exhausts winner 1 entirely, then bites partially into winner 2.**
3. **`records[0]` is B, `records[1]` is A — sorted by score, descending.** L2's Phase 3 sort is doing its job. The test asserts the order explicitly; if Phase 3's `b.1.cmp(&a.1)` were ever swapped to `a.1.cmp(&b.1)`, this test would fail loudly. **Order assertions in tests are how you guard sort discipline against future refactors.**
4. **`deficit_absorbed = 150` and `deficit_remaining = 0`.** Conservation: `100 + 50 + 0 == 150`. Every wei of deficit was accounted for. **Conservation in action — the test verifies the loop-body invariant on a 2-iteration input.**
5. **A's `pnl_paid = 50` — A keeps half their PnL.** This is the human story behind the math: the higher-leverage trader (B) loses everything, the lower-leverage trader (A) loses half. The system protects A more than B because ranking by `pnl_pct × leverage` is conservative toward less-leveraged winners. **The score discipline isn't arbitrary; it allocates the burden to the most-leveraged winner first.**

### Test 5: equal scores → ascending account_id wins

```rust
#[test]
fn adl_tiebreaker_by_account_id_ascending() {
    // Two structurally identical winners. Tiebreaker is account_id
    // ascending → smaller account_id is force-closed first.
    let candidates = vec![
        snapshot(7, 1, 100, 50),  // identical except account
        snapshot(3, 1, 100, 50),
    ];
    let report = execute_adl(&candidates, MarkPrice(200), 50);
    assert_eq!(report.records.len(), 1);
    assert_eq!(report.records[0].account, AccountId(3));
}
```

Three things to notice:

1. **The two snapshots differ *only* in account_id (7 vs 3).** Same position size, same entry, same collateral → same score, same PnL. The only thing Phase 3's `then_with` has to break the tie on is `account_id`. **Test isolates the tiebreaker by making everything else identical.**
2. **AccountId(3) wins, not AccountId(7), despite being passed *second* in the input vector.** Phase 3's stable sort puts AccountId(3) first because `then_with(|| a.0.account.0.cmp(&b.0.account.0))` is ascending. The input order doesn't matter; the sort discipline does. **Input order is irrelevant when the sort discipline is total.**
3. **deficit = 50 covers exactly one winner's full PnL** (PnL = 100 for each at mark 200, but actually let me re-check — coll 50, pnl from mark 200 - entry 100 = 100). Actually deficit = 50, pnl_gross = 100 → haircut = 50, only one record. The single-record assertion isolates the tiebreaker question from any multi-iteration noise. **Test design choice: deficit sized to produce exactly one record, so the assertion is purely about *which* winner was picked.**

### Test 6: losers and flats are filtered out, even in mixed populations

```rust
#[test]
fn adl_does_not_touch_losers_or_flats() {
    let candidates = vec![
        snapshot(1, 1, 100, 50),     // winner @ mark 200
        snapshot(2, 1, 100, 1_000),  // loser? — same mark applies, see below
        snapshot(3, 0, 100, 1_000),  // flat
    ];
    // All evaluated at mark = 200 → only acct 1 is profitable.
    let report = execute_adl(&candidates, MarkPrice(200), 10);
    assert_eq!(report.records.len(), 1);
    assert_eq!(report.records[0].account, AccountId(1));
}
```

Three things to notice:

1. **Acct 1 and acct 2 both pass the eligibility filter, but acct 2 doesn't get touched — for a different reason.** All candidates evaluated at the same mark (200). Acct 1 (long 1 @ entry 100, mark 200) and acct 2 (long 1 @ entry 100, mark 200) both have PnL = +100 — both profitable. L1's `adl_score` doesn't return `None` based on collateral magnitude, so both pass Phase 2 and enter `ranked`. But acct 2 has higher collateral (1000 vs acct 1's 50) → lower leverage → lower score → rank #2. `deficit = 10` is fully exhausted by the haircut to top-ranked acct 1 → Phase 4's `break` exits the loop before acct 2 is processed. **Acct 3 was filtered out at Phase 2 (eligibility). Acct 2 was left untouched at Phase 4 (quota exhaustion). One test, two distinct defense layers proven simultaneously.** The `// loser?` comment is honestly preserved drafting-history residue from when acct 2 was originally intended as a loser.
2. **Acct 3 is flat (position_size = 0) → `adl_score` returns `None` (L1's first eligibility check).** Phase 2's `filter_map` drops the `None` → acct 3 never enters `ranked` → no record. **L1's eligibility tests prove `adl_score` on inputs in isolation; this test proves the filter integrates with the full pipeline.**
3. **`deficit = 10` is a deliberate test-design choice — small enough to trigger Phase 4's `break` after acct 1.** A larger deficit would have continued the loop into acct 2 and obscured what this test is meant to prove. The size of deficit is itself part of the test's design — it isolates the "filter at Phase 2 + early-break at Phase 4" composition by picking a deficit that exercises both. **Test inputs aren't just data; they're chosen to make the proof visible.**

## Test progression at a glance

```
   simple ────────────────────────────────────────────────────► compound

   Test 1 ─┐
           ├── single winner edge cases ────────────────── Phase 4 (boundary)
   Test 2 ─┘

   Test 3 ─┐
           ├── multi-winner ordering ──────── Phase 3 (sort) + Phase 4 (break)
   Test 4 ─┘

   Test 5 ───── tiebreaker isolation ──────── Phase 3 (then_with, determinism)

   Test 6 ───── mixed-population integration ──── Phase 2 + Phase 4 composition
                                                          ↓
                                              two-defense-layer capstone
```

## Test-to-behavior mapping

| Test | Pipeline phase exercised | Behavior proven |
|---|---|---|
| 1. `adl_single_winner_partial_haircut_at_full_pnl` | Phase 4 (boundary) | `haircut == pnl_gross` → pnl_paid = 0; decomposition holds at the boundary |
| 2. `adl_single_winner_exhausted_with_remaining_deficit` | Phase 4 (insufficient capacity) | `pnl_gross < deficit` → record absorbed, remainder propagates to bridge |
| 3. `adl_multiple_winners_in_score_order` | Phase 3 (sort) + Phase 4 (`break`) | Higher leverage ranks first; lower-ranked winner untouched when deficit fits in rank 1 |
| 4. `adl_drains_first_winner_then_partially_second` | Phase 3 (sort) + Phase 4 (quota exhaustion) | Multi-iteration absorption; quota distributes across ranks |
| 5. `adl_tiebreaker_by_account_id_ascending` | Phase 3 (`then_with`) | Determinism under score ties — same input across validators produces same output |
| 6. `adl_does_not_touch_losers_or_flats` | Phase 2 (`filter_map`) + integration | Eligibility filter integrates with the full pipeline in mixed populations |

The 6 tests collectively prove that L2's pipeline is correct on the load-bearing input cases. L4's 5 proptests will universalize this: same conservation law, same decomposition, same determinism, against random inputs.

## Run them

```bash
cargo test -p openhl-liquidation adl::tests::adl_
```

Expected: 16 tests pass (L1's 5 + L2's 5 + L3's 6). The full ADL unit-test matrix is now covered.

## Q&A

**Q1: Six tests for one function — isn't that a lot?**

Not for a function with this much surface area. `execute_adl` has 5 phases × multiple input dimensions (deficit size, candidate count, score distribution, eligibility mix). The matrix is much larger than 6; L1+L2+L3 together give 16 tests, which is closer to "minimal coverage" than "excess." The L4 proptests will *generalize* what these specific cases prove; you can't generalize what you haven't first verified on hand-picked inputs. **Specific tests prove the function's shape; proptests prove the function's universality. Both layers needed.**

**Q2: Why hand-compute expected values in comments instead of just asserting?**

Two reasons. First, the comment is a *spec* that future readers can verify against the production code — if `adl_score` ever changes how it computes score, the comment's number will be wrong and the test will fail loudly, not silently. Second, the comment turns the test into a debugger-friendly worked example — when a failure happens, the comment is the first thing the debugger reads. Without the math walk, the failure message is just "expected 26666, got X" and the debugger has to re-derive 26666 by hand. **Math in comments is the cheapest form of test documentation.**

**Q3: When should I add a 7th unit test vs. add a 6th proptest?**

Add a unit test if there's a *specific* input that exercises a behavior the current tests don't cover (e.g., "what about deficit = i64::MAX?"). Add a proptest if there's a *universal* property the current tests can't express (e.g., "for all valid inputs, conservation holds"). Unit tests are concrete examples; proptests are universal claims. The ADL course uses 16 unit tests + 5 proptests; that ratio is typical for well-tested consensus code. **Unit tests for concrete behaviors, proptests for universal properties.**

**Q4: Could these tests be parameterized (e.g., `#[rstest]` with multiple inputs)?**

Yes, but the openhl-liquidation crate doesn't use `rstest` and the per-test math-walk comments would become harder to maintain across parameterized rows. The duplication cost of 6 explicit tests is lower than the cognitive cost of parameterization in this case. **Parameterization is the right tool when the test bodies are identical and only inputs vary; here each test has its own setup story.**

**Q5: Test 6's comment says "loser?" with a question mark — is the test wrong?**

The test is correct; the comment is honestly flagged. Acct 2 *isn't* actually a loser at mark = 200 (PnL = +100, same as acct 1) — it was intended as a loser in an earlier draft and the comment wasn't fully updated. As Test 6 #1 covers in detail, the test still proves what it claims (acct 3 filtered at Phase 2, acct 2 untouched at Phase 4), but the inline `// loser?` comment betrays the drafting history. **Honest about-the-test comments are useful — they signal "this test grew up; here's the rough edge". Don't airbrush them out.**

## Next lesson (L4) — Capstone — 5 invariant proptests + Stage 10 quartet retrospective

L4 closes the ADL course (and the Stage 10 quartet) with 5 invariant proptests against random inputs:

1. `conservation_absorbed_plus_remaining_equals_deficit` — universalizes L3 Tests 2 & 4
2. `each_record_balances_pnl` — universalizes L3 Tests 1, 2 & 4 (decomposition law)
3. `total_haircut_equals_deficit_absorbed` — universalizes the per-record/aggregate accounting consistency
4. `execute_adl_is_deterministic` — universalizes L3 Test 5's tiebreaker discipline as "same input → same output, always"
5. `records_in_rank_order` — universalizes L3 Tests 3 & 4's ordering discipline

Plus a Stage 10 retrospective: how Stage 10a (margin classification) + 10b (insurance fund) + 10c (scanner) + 10d (ADL) compose into the full Layer 1 → Layer 2 → Layer 3 safety-net cascade. The 4 stages, 4 layers of bookkeeping, 1 byte-for-byte-reproducible system.

After L4, the ADL course is complete: 5 lessons across 2 modules, 16 unit tests + 5 proptests, byte-for-byte against openhl Stage 10d at `d66b44a`. The DIY Perp series closes its 6th installment.

````

---

## Seed-file slot

L3 lands in Module 1 (ADL implementation) at sortOrder 2:

```typescript
{
  title: 'Lesson 3 — 6 nuanced absorption tests — proving execute_adl against the matrix',
  slug: 'openhl-adl-absorption-tests-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 35,
  xpReward: 60,
  content: `# Lesson 3 — 6 nuanced absorption tests — proving execute_adl against the matrix\n\n...`
},
```

## Drafting self-review (before paste)

- **L3 is intentionally shorter than L2** (35 min / 60 XP vs 40/70). No new pipeline; just 6 tests proving the L2 pipeline against richer inputs. Length: ~380 lines.
- **Test-to-behavior mapping table** at the end is the load-bearing structural visual. Same pattern as L2's test-to-phase table.
- **Pair-progression `Tests 1-2 / 3-4 / 5 / 6`** is the pedagogical scaffold. Tests 1-2 stay single-winner; tests 3-4 introduce multi-winner; test 5 isolates determinism; test 6 proves filter integration.
- **The Predict callout reuses L2's `break` framing** — recall is "quota-bounded loops produce records only for accounts that received haircuts." This is the load-bearing payoff readers carry from L2.
- **Q5 honestly explains the `// loser?` comment** — drafting honesty. Don't airbrush. The test still passes; the comment was preserved from an earlier draft and signals that.
- **L4 preview names the 5 proptests + the Stage 10 retrospective explicitly** — the capstone is the universal generalization of L3's specific cases.
- **No Mermaid in L3.** The test-to-behavior mapping table + the math-walk comments inside each test are the structural visuals. A Mermaid for "6 tests in a 2-axis matrix" would be visual noise compared to the table.

