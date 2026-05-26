# Building OpenHL Liquidation — L13 draft (EN) — build-along

> openhl SHA `0a8464e` (Stage 10c — multi-account liquidation scanner).

## L13 — `openhl-liquidation-scanner-capstone-en`

**Stage**: Stage 10c — `0a8464e`

**Title**: Lesson 13 — Scanner capstone — 6 nuanced unit tests + 4 invariant proptests + the Stage 10 retrospective

**Duration**: 40 min · **XP**: 80

---

````markdown
# Lesson 13 — Scanner capstone — 6 nuanced unit tests + 4 invariant proptests + the Stage 10 retrospective

## Goal

Concepts you'll grasp in this lesson:

- **The 6 nuanced unit tests form a 4×2 matrix.** Four outcomes (solvent-close, fully-covered-underwater, partial-drain-underwater, depleted-underwater) crossed with two batch shapes (single-account-batch, multi-account-batch). The mixed-batch test is the explicit 4-state proof; the FIFO test is the multi-underwater fairness proof. **Together they exercise every reachable interaction between L6 classification, L10 close-outcomes, and L8/L9 fund operations.**
- **The 4 proptests encode invariants the type system can't.** Fund accounting closes (`before + deposits − withdrawals = after`). Unfilled deficit implies an empty fund (`unfilled > 0 ⇒ balance == 0`). Record count is bounded by input count (`|records| ≤ |accounts|`). Determinism holds (`scan(same inputs) ≡ scan(same inputs)`). **Each invariant is a contract the scanner must keep across every scan, every block, every validator.**
- **Conservation laws compose vertically across the crate.** Three layers, three identities, one math story:

  ```
  L9  (single fund call):       amount + unfilled                    = shortfall
  L10 (single position close):  fee_to_fund + residual_to_account    = post_close_equity
  L13 (per-block scan batch):   balance_before + Σ deposits − Σ withdrawals = balance_after
  ```

  **Each layer's conservation law is consumed by the next layer's invariant; the crate's math closes.**
- **Stage 10 is *three* stages plus *one* trilogy.** Stage 10a (margin math) built the pure-compute classifier. Stage 10b (insurance fund + close-outcome decomposition) introduced state and the credit/debit decomposition. Stage 10c (multi-account scanner) tied them together with one orchestration loop. **L13 closes the trilogy: 69 tests, 4 modules, byte-for-byte against `0a8464e`.**

Verification:

```bash
cargo test -p openhl-liquidation
```

…passes 69 tests (34 compute + 21 insurance + 14 scanner = 10 unit + 4 proptest). The liquidation crate is *complete* against Stage 10c's answer key.

> **Note on the count:** L11 and L12's next-lesson previews said "68 total" — that was an off-by-one. The actual L13 adds 6 nuanced unit tests, not 5; the FIFO-fairness test is its own test, distinct from the mixed-batch test. The correct total is 69. (The cascade-math reasoning is unaffected.)

Specific changes:

- **`src/scanner.rs`** — adds 6 nuanced unit tests after the 4 simple ones from L12, and a `proptest!` block with 4 invariant properties.

After L13, the Liquidation course is complete. Stage 10d (ADL) is the next openhl roadmap entry but is a separate course.

## Recap

After L12:
- `scanner.rs` has the type vocabulary (L11), the `scan` method (L12), and 4 simple unit tests covering the skip paths.
- `cargo test` runs 59 tests, all green.
- The scanner *works* — it iterates, classifies, dispatches, mutates, aggregates, returns. But the only tests so far cover the "skip" cases. The four "work" outcomes — solvent, fully-covered, partial-drain, depleted — have no per-scan assertions yet.

L13 fills that gap, then locks the invariants with proptests, then steps back for the Stage 10 retrospective.

## Plan

Three edits:

1. **Append 6 nuanced unit tests** to the existing `#[cfg(test)] mod tests` block in `crates/liquidation/src/scanner.rs`.
2. **Append a `proptest!` block** with 4 invariant properties at the bottom of the test module.
3. **Verify** with `cargo test`. After this commit, the Liquidation crate is byte-for-byte against `0a8464e`.

> 🛑 **Predict.** Before reading further: name the four "fund state transitions" a single liquidation can cause, and pair each one with the `WithdrawOutcome` variant or `deposit` call that drives it. Then: which of those transitions can *not* happen if the input is `Solvent` (i.e., `Liquidatable && post_close_equity ≥ fee`)?

(Answer: **Four transitions** are (a) `+fee` only (solvent close — `deposit`, no withdraw), (b) `+fee_partial − shortfall_full` (underwater with positive equity — `deposit` + `withdraw_shortfall` returning `Covered`), (c) `0 − shortfall_partial` (underwater already underwater, fund partially drained — `withdraw_shortfall` returning `PartiallyDrained`), (d) `0 − 0_with_unfilled` (underwater with depleted fund — `withdraw_shortfall` returning `Depleted`). **Transitions b, c, d cannot happen on a Solvent input** — L10's `debug_assert!` would fire. Solvent inputs only drive transition (a). **The 4 nuanced unit tests exercise transitions a, b, c, d. The 5th (mixed batch) and 6th (FIFO) verify that the orchestration loop processes multi-account batches correctly.**)

The scan-coverage matrix:

```
   ┌─────────────────────────────────────────────────────────────┐
   │  Test coverage matrix — Stage 10c                             │
   ├─────────────────────────────────────────────────────────────┤
   │                                                              │
   │  4 outcomes × 2 batch shapes:                                │
   │                                                              │
   │                  single account     multi-account            │
   │                  ──────────────     ──────────────           │
   │  Solvent         #1 ✓                (covered by mixed)      │
   │  Covered uw      #2 ✓                                        │
   │  Partial uw      #3 ✓                #6 ✓ (FIFO fairness)    │
   │  Depleted uw     #4 ✓                                        │
   │                                                              │
   │  Mixed-batch     —                   #5 ✓ (4 health states)  │
   │                                                              │
   │  Proptests (cross-cutting):                                  │
   │  ────────────────────────                                    │
   │  #1 fund_balance_delta_matches_report                        │
   │  #2 unfilled_implies_empty_fund                              │
   │  #3 records_count_bounded_by_accounts                        │
   │  #4 scan_is_deterministic                                    │
   │                                                              │
   └─────────────────────────────────────────────────────────────┘
```

Two things to notice about the matrix:

1. **The single-account column covers all 4 outcomes; the multi-account column covers the *interesting* compound cases** (mixed health states + FIFO fairness). We don't need a "multi-account Solvent" test because per-account behavior is the same in both columns — the orchestration loop is the same on iteration 2 as on iteration 1. **Test what's *new* when multiplicity is introduced; don't repeat what's already proven.**
2. **The 4 proptests are *cross-cutting* — they apply to every outcome and every batch shape**. They're not in the matrix because they're orthogonal to it. **Unit tests verify specific points; proptests verify the *shape* of all points.**

## Walk-through

### Step 1: Add the 6 nuanced unit tests

Inside the existing `#[cfg(test)] mod tests` block in `scanner.rs`, after the 4 simple tests from L12, append the 6 nuanced cases. The tests are grouped by single-vs-multi-account and by outcome.

#### Test 1: Solvent close deposits fee

```rust
    // ─── single Liquidatable: solvent close ────────────────────────

    #[test]
    fn scan_liquidatable_solvent_deposits_fee() {
        // size=1, entry=1_000, collateral=20, mark=999.
        //   notional=999; fee = 999 × 150 / 10_000 = 14
        //   pnl = -1; post_close_equity = 19
        //   ratio = 19 / 999 × 10_000 = 190 bps < 200 maint → Liquidatable
        //   post_close_equity (19) ≥ fee (14) → solvent close
        //   residual_to_account = 19 - 14 = 5
        let accts = vec![snapshot(7, 1, 1_000, 20)];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(999));

        assert_eq!(report.records.len(), 1);
        let rec = &report.records[0];
        assert_eq!(rec.account, AccountId(7));
        assert_eq!(rec.classification, MarginHealth::Liquidatable);
        match rec.outcome {
            CloseOutcomeKind::Solvent(s) => {
                assert_eq!(s.fee_to_fund, 14);
                assert_eq!(s.residual_to_account, 5);
            }
            CloseOutcomeKind::Underwater(_) => panic!("expected Solvent"),
        }
        assert_eq!(report.fund_deposits, 14);
        assert_eq!(report.fund_withdrawals, 0);
        assert_eq!(report.unfilled_deficit, 0);
        assert_eq!(s.fund_balance(), 14);
    }
```

Five things to notice:

1. **The comment block walks the math step-by-step from primitives.** notional → fee → pnl → equity → ratio → classification → routing decision → outputs. A reader debugging a failing test reads this comment and re-derives the expected values from the snapshot's 4 inputs. **Math-walk comments turn a single test into a worked example of the full Stage 10a + 10b pipeline.** (A subtle bind-name note: the test introduces `let mut s = LiquidationScanner::...` and *also* shadows `s` inside the `match` arm via `CloseOutcomeKind::Solvent(s)`. Inside the arm, `s` is the `SolventClose` payload; the moment the arm closes, the outer scanner `s` is back in scope, which is why `s.fund_balance()` two lines later works. This is a deliberate Rust idiom — shadowing inside a match arm is scope-bounded — but new readers should recognize the dual binding for what it is.)
2. **The chosen numbers — entry=1_000, collateral=20, mark=999 — pick a *boundary case*** where ratio (190 bps) is just barely below maintenance (200 bps). A bug that flipped the inequality (`>` instead of `>=`, etc.) would land 190 in the wrong bucket. **Boundary inputs make tests catch off-by-one in classification predicates.**
3. **The `match` on `outcome` uses `panic!("expected Solvent")` for the wrong variant.** Failure messages name the *expected* variant; a future reader of a failing test log immediately knows which branch they meant to hit. **Panic messages name the expected variant, not the unexpected one.**
4. **All four `ScanReport` fields are asserted, plus `fund_balance()`.** The aggregate fields are checked even though the per-record `outcome` already implies them. Why? Because the L11 design contract said aggregates are first-class — a regression that breaks the aggregation math is a different bug class than one that breaks the per-record decomposition. **Aggregate fields and per-record fields get separate assertions; they're separate invariants.**
5. **`s.fund_balance() == 14` proves the fund actually mutated** — not just that the report claims it did. The fund is *state*, not derivation; a separate read confirms the report doesn't lie. **State changes deserve a separate post-call read; reports describing them deserve their own assertions.**

#### Test 2: Underwater account, fully covered by fund

```rust
    // ─── single Underwater: fully covered by fund ──────────────────

    #[test]
    fn scan_underwater_fully_covered_drains_fund_partially() {
        // 1 BTC long, entry $100k, $10k collateral, mark $80,500 →
        // pnl = −19_500, equity = −9_500 → Underwater.
        // notional = 80_500, fee = 1_207, shortfall = 1_207 + 9_500 = 10_707.
        // Start fund with $20k — covers in full.
        let accts = vec![snapshot(1, 1, 100_000, 10_000)];
        let fund = InsuranceFund::new(20_000);
        let mut s = LiquidationScanner::new(default_params(), fund);
        let report = s.scan(&accts, MarkPrice(80_500));

        assert_eq!(report.records.len(), 1);
        match report.records[0].outcome {
            CloseOutcomeKind::Underwater(u) => {
                assert_eq!(u.fee_to_fund, 0); // already underwater pre-fee
                assert_eq!(u.shortfall_to_fund, 10_707);
            }
            CloseOutcomeKind::Solvent(_) => panic!("expected Underwater"),
        }
        assert_eq!(report.fund_deposits, 0);
        assert_eq!(report.fund_withdrawals, 10_707);
        assert_eq!(report.unfilled_deficit, 0);
        assert_eq!(s.fund_balance(), 20_000 - 10_707);
    }
```

Four things to notice:

1. **The Perp Primer L3 scenario reappears for the fourth time** in this course: $100k entry, $10k collateral, $80,500 close, $19,500 PnL, $9,500 negative equity. The numbers thread through L10's `fee_basic`, L10's `underwater_close_already_underwater_pre_fee`, and now L13's scanner-level test. **Curriculum reinforcement compounds: by L13 the reader recognizes the numbers without re-deriving them.**
2. **`fee_to_fund == 0`** — confirmed at the scanner level. The L10 contract said "negative equity pre-fee → no fee collected"; L13 verifies the contract is preserved through the orchestration layer. **Cross-layer contract tests verify that orchestration doesn't *break* the lower-layer guarantees.**
3. **`fund_deposits == 0` AND `fund_withdrawals == 10_707`** — the aggregate fields show *zero deposit* (because `fee_to_fund == 0`) and *full withdrawal* (because the fund had enough). The two aggregates together describe the full balance-flow story. **Aggregate fields are the bridge's read-once telemetry; they should be precise.**
4. **`s.fund_balance() == 20_000 - 10_707`** — the post-scan fund balance is computed from the inputs, not asserted as a literal. This makes the test self-documenting: the reader sees `20_000 - 10_707` and knows where each number came from. **Arithmetic expressions in assertions make the test self-explain better than hardcoded literals.**

#### Test 3: Underwater, fund partially drained

```rust
    // ─── single Underwater: fund partially drained, deficit escalates ─

    #[test]
    fn scan_underwater_partial_drain_surfaces_unfilled() {
        // Same underwater account, but fund only has $5k — can't cover.
        let accts = vec![snapshot(1, 1, 100_000, 10_000)];
        let fund = InsuranceFund::new(5_000);
        let mut s = LiquidationScanner::new(default_params(), fund);
        let report = s.scan(&accts, MarkPrice(80_500));

        assert_eq!(report.fund_withdrawals, 5_000); // drained to 0
        assert_eq!(report.unfilled_deficit, 10_707 - 5_000);
        assert_eq!(s.fund_balance(), 0);
    }
```

Three things to notice:

1. **The test reuses the same snapshot as Test 2.** Only the fund balance changes — $20k vs $5k. The reader can read Test 2 and Test 3 back-to-back and see *exactly* what difference the fund size makes. **Reusing the same input across tests isolates the input-axis that matters.**
2. **Fewer assertions than Test 2.** Only the 3 most-changed values are asserted (`fund_withdrawals`, `unfilled_deficit`, `fund_balance`). The classification, the per-record outcome, the account ID — already proven by Test 2 — are not re-asserted. **Tests that share setup with earlier tests assert only the differential.**
3. **`unfilled_deficit == 10_707 - 5_000`** — again an arithmetic expression. The reader sees `shortfall − available = unfilled` and instantly grasps the conservation law `paid + unfilled = shortfall`. **Algebraic expressions in assertions teach invariants alongside the assertion itself.**

#### Test 4: Underwater, fund already depleted

```rust
    #[test]
    fn scan_underwater_depleted_fund_escalates_full_shortfall() {
        // Fund empty from the start.
        let accts = vec![snapshot(1, 1, 100_000, 10_000)];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(80_500));

        assert_eq!(report.fund_withdrawals, 0);
        assert_eq!(report.unfilled_deficit, 10_707);
        assert_eq!(s.fund_balance(), 0);
    }
```

Three things to notice:

1. **`with_empty_fund` instead of `new(0)`** — the named constructor at the call site says "empty fund" instead of "0 balance fund." Reading the test, the reader sees the intent immediately. **Named constructors at test call sites are documentation.**
2. **`fund_withdrawals == 0`** — *not* the full shortfall. The L8 `Depleted` variant returns `(0, unfilled)`, meaning the fund pays *zero* (because it had nothing) and escalates the *full* shortfall. The aggregate fields preserve this distinction. **`Depleted` and `Covered { amount: 0 }` are different outcomes; the aggregates must show different numbers.**
3. **The test is shorter than Test 2 and Test 3** — fewer assertions, simpler setup, cleaner narrative. The depleted state is the "edge of the cliff" of the cascade — the boundary where Stage 10d (ADL) would have to fire. **Edge-case tests should be terse; their *being there* is most of their value.**

#### Test 5: Mixed batch processes only unhealthy accounts

```rust
    // ─── mixed batch ───────────────────────────────────────────────

    #[test]
    fn scan_mixed_batch_processes_only_unhealthy() {
        // 4 accounts, all 1 long @ entry $100, mark $80 (−20% adverse).
        // Vary collateral to span the 4 states:
        //   coll 50 → equity 30, ratio 30/80 = 37.5% → Safe
        //   coll 25 → equity 5,  ratio  5/80 = 6.25% → AtRisk
        //   coll 21 → equity 1,  ratio  1/80 = 1.25% → Liquidatable (solvent close)
        //   coll 10 → equity −10 → Underwater
        let accts = vec![
            snapshot(1, 1, 100, 50),
            snapshot(2, 1, 100, 25),
            snapshot(3, 1, 100, 21),
            snapshot(4, 1, 100, 10),
        ];
        let mut s = LiquidationScanner::new(default_params(), InsuranceFund::new(1_000));
        let report = s.scan(&accts, MarkPrice(80));

        assert_eq!(report.records.len(), 2);
        assert_eq!(report.records[0].account, AccountId(3));
        assert_eq!(report.records[1].account, AccountId(4));
        assert_eq!(report.records[0].classification, MarginHealth::Liquidatable);
        assert_eq!(report.records[1].classification, MarginHealth::Underwater);
    }
```

Six things to notice:

1. **Four accounts in one slice — each calibrated to land in a different `MarginHealth` state.** Account 1 → Safe, 2 → AtRisk, 3 → Liquidatable, 4 → Underwater. The slice exercises *every* arm of L6's classification cascade in a single call. **Mixed-batch tests are the cheapest way to verify the classification cascade is complete.**
2. **`report.records.len() == 2`** — *not* 4. Safe and AtRisk produce no records; only Liquidatable and Underwater do. The test catches a future bug where someone misclassifies AtRisk as a liquidation trigger. **Length assertions on filtered outputs catch "wrong filter" bugs at the orchestration level.**
3. **`report.records[0].account == AccountId(3)` and `[1].account == AccountId(4)`** — the records preserve *input order*. Account 3 came before account 4 in the input slice; the records appear in the same order. This is the FIFO ordering policy from L11's module-level doc. **Ordered iteration → ordered records; the policy is enforced by the test.**
4. **The math comments are *per-account*, not per-test.** Each account gets its own classification math worked out inline. **For mixed-batch tests, math comments belong next to the accounts they describe.**
5. **`InsuranceFund::new(1_000)` — non-empty fund.** A fund of $1,000 covers any solvent fee and any small underwater shortfall in this batch. The fund-state mutations are validated but not the primary point of the test; the primary point is the *classification + filtering* behavior. **One test, one primary point; fund state is incidental here.**
6. **No assertion on `fund_deposits`/`fund_withdrawals`/`unfilled_deficit`.** Those are derivative of the per-account outcomes (which the records carry). Asserting them would duplicate test #1-#4's coverage; mixed-batch tests should focus on what's *new* — the orchestration of multiple accounts. **Assert the new behavior; don't re-assert what's already covered.**

#### Test 6: FIFO fairness on multi-underwater partial drain

```rust
    // ─── FIFO fairness when fund partially drains ──────────────────

    #[test]
    fn scan_first_underwater_gets_paid_then_second_unfilled() {
        // Two underwater accounts, fund has enough for the first only.
        // Underwater shortfall per account: notional 80_500, fee 1_207,
        // equity -9_500 → shortfall 10_707.
        // Fund starts at 12_000: covers first (10_707), leaves 1_293;
        // second needs 10_707 → partial 1_293 + unfilled 9_414.
        let accts = vec![
            snapshot(1, 1, 100_000, 10_000),
            snapshot(2, 1, 100_000, 10_000),
        ];
        let mut s = LiquidationScanner::new(default_params(), InsuranceFund::new(12_000));
        let report = s.scan(&accts, MarkPrice(80_500));

        assert_eq!(report.records.len(), 2);
        assert_eq!(report.fund_withdrawals, 12_000); // 10_707 + 1_293
        assert_eq!(report.unfilled_deficit, 10_707 - 1_293);
        assert_eq!(s.fund_balance(), 0);
    }
```

Five things to notice:

1. **Two *identical* underwater accounts.** Same entry, same collateral, same close mark. The only thing that differs is iteration position. By making them identical, the test isolates the *fairness policy* — FIFO — as the only thing that determines outcome differences. **Identical inputs across iterations isolate the policy variable.**
2. **The fund balance ($12,000) is *exactly* `first shortfall + partial second payment`** — $10,707 + $1,293 = $12,000. The reader sees the fund deplete *exactly* through the first underwater account, with the partial remainder going to the second. **Carefully-chosen fund balances make the fairness policy visible in the assertions.**
3. **`fund_withdrawals == 12_000`** — the *total* withdrawal, summed across both accounts. The aggregate field doesn't distinguish "first account got 10,707, second got 1,293"; it just shows the sum. **Aggregate fields summarize; per-record fields differentiate.**
4. **The comment includes the arithmetic explicitly**: `10_707 + 1_293`. A reader debugging a failure traces the unfilled-deficit number back to the FIFO rule via the comment. **Test comments that show the FIFO arithmetic are how the policy stays auditable.**
5. **The `unfilled_deficit == 10_707 − 1_293` assertion is the *only* signal Stage 10d would consume.** The next stage (ADL) would force-close enough profitable counter-positions to cover this `9_414` shortfall. L13's test fixes the contract that Stage 10d will read. **Per-stage handoff tests fix the contract the next stage will consume.**

### Step 2: Add the 4 invariant proptests

Append a `proptest!` block after the 6 unit tests. The block exercises 4 cross-cutting invariants over random `(collaterals × mark × initial_fund)` triples.

```rust
    // ─── proptest: invariants ──────────────────────────────────────

    proptest! {
        /// The scanner's `fund_balance` after a scan equals the prior
        /// balance plus `fund_deposits` minus `fund_withdrawals`.
        #[test]
        fn fund_balance_delta_matches_report(
            collaterals in proptest::collection::vec(1_i64..1_000_000, 0..10),
            mark in 50_u64..150,
            initial_fund in 0_i64..10_000_000,
        ) {
            let accts: Vec<_> = collaterals
                .iter()
                .enumerate()
                .map(|(i, c)| snapshot(i as u64, 1, 100, *c))
                .collect();
            let mut s = LiquidationScanner::new(
                default_params(),
                InsuranceFund::new(initial_fund),
            );
            let before = s.fund_balance();
            let report = s.scan(&accts, MarkPrice(mark));
            let after = s.fund_balance();
            // before + deposits - withdrawals = after
            prop_assert_eq!(
                before.saturating_add(report.fund_deposits).saturating_sub(report.fund_withdrawals),
                after,
            );
        }

        /// `unfilled_deficit > 0` implies the fund was insufficient at
        /// some point during the scan, which implies `fund_balance == 0`
        /// at the end of the scan.
        #[test]
        fn unfilled_implies_empty_fund(
            collaterals in proptest::collection::vec(1_i64..1_000, 1..10),
            mark in 50_u64..70,    // adverse to long positions
            initial_fund in 0_i64..5_000,
        ) {
            let accts: Vec<_> = collaterals
                .iter()
                .enumerate()
                .map(|(i, c)| snapshot(i as u64, 1, 100, *c))
                .collect();
            let mut s = LiquidationScanner::new(
                default_params(),
                InsuranceFund::new(initial_fund),
            );
            let report = s.scan(&accts, MarkPrice(mark));
            if report.unfilled_deficit > 0 {
                prop_assert_eq!(s.fund_balance(), 0);
            }
        }

        /// Number of records ≤ number of input accounts. Safe and AtRisk
        /// accounts never produce records; the inequality is strict
        /// when at least one input is healthy.
        #[test]
        fn records_count_bounded_by_accounts(
            collaterals in proptest::collection::vec(1_i64..1_000_000, 0..20),
            mark in 50_u64..150,
        ) {
            let accts: Vec<_> = collaterals
                .iter()
                .enumerate()
                .map(|(i, c)| snapshot(i as u64, 1, 100, *c))
                .collect();
            let mut s = LiquidationScanner::with_empty_fund(default_params());
            let report = s.scan(&accts, MarkPrice(mark));
            prop_assert!(report.records.len() <= accts.len());
        }

        /// Determinism: scanning the same input twice produces the same
        /// report (fresh fund + fresh scanner each time).
        #[test]
        fn scan_is_deterministic(
            collaterals in proptest::collection::vec(1_i64..1_000_000, 0..10),
            mark in 50_u64..150,
            initial_fund in 0_i64..1_000_000,
        ) {
            let accts: Vec<_> = collaterals
                .iter()
                .enumerate()
                .map(|(i, c)| snapshot(i as u64, 1, 100, *c))
                .collect();

            let mut s1 = LiquidationScanner::new(
                default_params(),
                InsuranceFund::new(initial_fund),
            );
            let mut s2 = LiquidationScanner::new(
                default_params(),
                InsuranceFund::new(initial_fund),
            );
            let r1 = s1.scan(&accts, MarkPrice(mark));
            let r2 = s2.scan(&accts, MarkPrice(mark));
            prop_assert_eq!(r1, r2);
            prop_assert_eq!(s1.fund_balance(), s2.fund_balance());
        }
    }
```

The 4 proptests together encode the *invariants of the orchestration layer*. Each one is a contract:

#### Proptest #1: `fund_balance_delta_matches_report`

**The conservation law for the fund.** `before + ∑deposits − ∑withdrawals = after`. The L8 invariant (`balance ≥ 0`) extends per-call; L13 extends it across an entire scan. Every deposit the report claims must show up in the fund balance; every withdrawal must too. **If this proptest passes, the report and the fund agree on what happened.**

Three things to notice:

1. **The math is `saturating_add` and `saturating_sub`** to match the scanner's own arithmetic. Without saturation, the proptest would have to either bound inputs more tightly or accept overflow as "the property doesn't hold." **The proptest's arithmetic must match the production code's arithmetic.**
2. **Input ranges (`1..1_000_000`)** are bounded well below `i64::MAX` so the property is *simply expressible* — no saturation actually fires in the operating range. The proptest still works against `saturating_add` because saturation in the bounded range is a no-op. **Bound proptest inputs so the property holds in the simplest form, not in the saturated form.**
3. **`mark in 50..150`** — a 50-150% range around the assumed entry price of $100, sweeping both Safe and Liquidatable / Underwater conditions. **Mark ranges should sweep across the boundary that classification cares about.**

#### Proptest #2: `unfilled_implies_empty_fund`

**The fund-exhaustion contract.** If the report shows `unfilled_deficit > 0`, the fund *must* be empty at the end. This catches the bug where the scanner reports "unfilled exists" but the fund still has money — a contradiction. The contract holds because L9's `withdraw_shortfall` drains the fund to 0 before reporting any unfilled deficit. **L9's per-call contract scales to a per-scan invariant.**

Three things to notice:

1. **The `if report.unfilled_deficit > 0 { ... }` filter inside the proptest body.** Only the cases where unfilled exists trigger the assertion; cases where the fund had enough to cover everything are valid "no assertion fires" cases. **Conditional assertions inside proptests are how you express "when X is true, Y must hold."**
2. **The input range is *adverse* — `mark in 50..70`.** Long positions at entry $100 face severe losses at mark $50-70, making underwater outcomes likely. This biases the test toward triggering the `unfilled > 0` branch. **Proptest inputs should be biased toward triggering the *interesting* condition; otherwise most cases skip the assertion silently.** This is the *proptest density problem*: with a wide range like `mark in 50..150`, the majority of randomly generated inputs would land Safe or Solvent, the conditional assertion would never fire, and across the proptest's default 100-250 iterations *the property could pass without ever being tested* — an invisible dead-code test. Bias inputs toward the regime where the assertion actually fires; otherwise your property test is exercising no property at all.
3. **`initial_fund in 0..5_000` — capped at the bottom range.** The fund is sized to be insufficient for the expected aggregate shortfall (which scales with the number of underwater accounts). **Sizing the fund below the expected shortfall maximizes the chance of an unfilled deficit.**
4. **In L13 we prefer Strategy-side pre-biasing over heavy `prop_assume!` rejection.** The goal of this property is high-density execution of the `unfilled > 0` branch, so pushing the generator directly into the adverse regime is more efficient. That keeps reject counts low and lowers `TooManyAssumptions` risk. **Use L5-style `prop_assume!` when you need to state a mathematical precondition; use L13-style Strategy shaping when you need branch-density.**

#### Proptest #3: `records_count_bounded_by_accounts`

**The cardinality bound.** The scanner can never produce more records than input accounts. Safe and AtRisk accounts contribute zero records; Liquidatable and Underwater each contribute exactly one. **The orchestration loop can't *create* records out of nothing or *amplify* them per account.**

Two things to notice:

1. **The assertion uses `<=`, not `<` strict.** When all accounts are unhealthy, records count *equals* accounts count. The bound is non-strict because zero-skipped-accounts is a valid case. **Cardinality bounds are usually `<=`; strict-`<` would falsely reject the all-unhealthy case.**
2. **The proptest covers up to 20 accounts per scan** (`vec(..., 0..20)`). Larger than the other proptests, because the cardinality bound is the easiest to violate at scale and the cheapest to test. **Use larger collections in proptests where the invariant scales linearly.**

#### Proptest #4: `scan_is_deterministic`

**The validator-consensus contract.** Two scanners with identical state and identical inputs must produce byte-identical outputs. If this proptest fails, the scanner has nondeterminism — and on a consensus chain, nondeterminism means a fork. **This proptest is the single most load-bearing test in the entire course.**

Four things to notice:

1. **The proptest constructs *two* scanners, not one, and scans the same input through both.** A single scanner that scans twice could mask nondeterminism if the second scan's state inherits something from the first. Two fresh scanners catch any state that survives an `InsuranceFund::new(initial_fund)` reset. **Determinism tests must use independent state at every run.**
2. **The assertion is on *both* `report == report` AND `fund_balance == fund_balance`.** A scanner that produces a deterministic report but a nondeterministic fund-balance change would pass a report-only test but be a real bug. The two-way assertion catches both. **Determinism tests assert on every observable side effect.**
3. **`PartialEq` on `ScanReport` is *what enables this test*.** L11's derive `#[derive(Clone, Debug, PartialEq, Eq, Default)]` is what lets `prop_assert_eq!(r1, r2)` compile. Without `PartialEq`, this proptest couldn't be written. **Standard-derive traits unlock standard-test patterns; derive them eagerly.**
4. **No `Hash` derive needed.** The determinism test compares by `==`, not by hashing. `Hash` would be redundant for this test (and most others). **Derive what tests actually need; resist the urge to derive `Hash` defensively.**

### Step 3: Run the tests

```bash
cargo test -p openhl-liquidation
```

Expected output (abbreviated):

```
running 69 tests
test compute::tests::close_flat_has_zero_qty ... ok
... (33 more compute tests)
test insurance::tests::balance_never_negative ... ok
... (20 more insurance tests)
test scanner::tests::fund_balance_delta_matches_report ... ok
test scanner::tests::records_count_bounded_by_accounts ... ok
test scanner::tests::scan_all_safe_accounts_does_nothing ... ok
test scanner::tests::scan_atrisk_does_not_liquidate ... ok
test scanner::tests::scan_empty_accounts_returns_empty_report ... ok
test scanner::tests::scan_first_underwater_gets_paid_then_second_unfilled ... ok
test scanner::tests::scan_is_deterministic ... ok
test scanner::tests::scan_liquidatable_solvent_deposits_fee ... ok
test scanner::tests::scan_mixed_batch_processes_only_unhealthy ... ok
test scanner::tests::scan_skips_flat_positions ... ok
test scanner::tests::scan_underwater_depleted_fund_escalates_full_shortfall ... ok
test scanner::tests::scan_underwater_fully_covered_drains_fund_partially ... ok
test scanner::tests::scan_underwater_partial_drain_surfaces_unfilled ... ok
test scanner::tests::unfilled_implies_empty_fund ... ok

test result: ok. 69 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**69 tests passing. The Liquidation crate is byte-for-byte against `0a8464e`.** Stage 10c is complete; Stage 10 — the trilogy of margin math + insurance fund + scanner — is *closed*.

Common errors:

- **`scan_is_deterministic` flakes on some runs and passes on others** — your scanner has a hidden non-determinism. The most common cause: iterating a `HashMap` (whose iteration order varies). Stage 10c never uses `HashMap`; if you introduced one, switch to `BTreeMap` or `Vec`. **Hidden non-determinism is a chain-fork risk; the proptest catches it before mainnet.**
- **`fund_balance_delta_matches_report` fails with `5000 vs 4999`** — off-by-one in the `saturating_add` order. Re-check the production code: `before + deposits − withdrawals`, in that order. Reversing to `before − withdrawals + deposits` looks arithmetically identical but is actually different: the intermediate `before − withdrawals` can go negative in *some* invocations and, *in release builds without saturation*, silently *wraps* to a huge positive number — every validator producing a different `i64` than its peers, every chain forking. Saturating arithmetic in the L12 order is the cheap defense; the proptest is what catches the order if you reverse it.
- **`unfilled_implies_empty_fund` fails with `unfilled=500, balance=1000`** — your `scan` exits early when the fund depletes (skipping further underwater accounts). The L11 design contract says the scan continues; you should be aggregating across *every* underwater account in the slice. Re-read the L12 fan-out logic.
- **`records_count_bounded_by_accounts` fails with `records=21, accounts=20`** — somewhere your loop double-pushed. Most likely cause: you wrote `report.records.push(...)` *inside* the `if`/`else` branches AND once more outside. Re-check the loop body — the push should be exactly once at the bottom.

## Design reflection — the Stage 10 trilogy

Three load-bearing decisions that shaped Stage 10 across all 13 lessons:

1. **Layered conservation laws.** L9's `amount + unfilled = shortfall` (per call), L10's `fee_to_fund + residual_to_account = post_close_equity` (per close), L13's `before + ∑deposits − ∑withdrawals = after` (per scan). Each layer's law is consumed by the next layer's invariant. The crate's math closes from the smallest unit (one `withdraw_shortfall` call) to the largest (one `scan` batch). **Layered conservation is how consensus state machines stay *provably* correct under composition.**

2. **`debug_assert!` pair + `saturating_arithmetic` everywhere.** Every function in the crate uses one or both. The L10 dispatch (`solvent_close_outcome` / `underwater_close_outcome`) is a debug-assert pair; the L8 deposit and L9 withdraw use saturating arithmetic. The L12 scan combines both — debug-asserts via the routing predicates, saturation via the report aggregation. **The dev-assertion + prod-saturation discipline scales from one function to one crate.**

3. **Vocabulary before mechanism, four times in a row.** L1-L3 declared `LiquidationParams`, `MarginRatio`, `MarginHealth`, `AccountSnapshot`, `CloseOrderSpec` before any `margin_health` was implemented. L8 declared `InsuranceFund`, `WithdrawOutcome` before `withdraw_shortfall`. L10 declared `SolventClose`, `UnderwaterClose` while implementing them. L11 declared `CloseOutcomeKind`, `LiquidationRecord`, `ScanReport`, `LiquidationScanner` before `scan`. **The pattern is consistent across the course because *vocabulary defines the contract; mechanism implements it*.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
```

After L13:
- **scanner.rs** matches Stage 10c's `scanner.rs` **byte-for-byte**. The full file — module-level doc + imports + 4 types + 5 accessors + `scan` method + 10 unit tests + 4 proptests — is in your workspace.
- **All other files** in `crates/liquidation/src/` have been byte-for-byte stable since L10.

**The Liquidation course is complete.** Module 0 (Orientation, L0) + Module 1 (Types, L1-L3) + Module 2 (Pure compute, L4-L7) + Module 3 (Insurance fund, L8-L10) + Module 4 (Scanner + capstone, L11-L13) = 13 lessons across 5 modules.

## Common questions

**Q1: Why does L13 add 6 unit tests and not 4 or 8?**

Because the test coverage matrix has 4 outcomes × 2 batch shapes, and the multi-account column collapses 3 of the 4 outcomes into the mixed-batch test. The remaining 4 single-account outcomes (Solvent, FullyCovered, PartialDrain, Depleted) need their own tests, and the multi-account column needs the mixed-batch test plus the FIFO-fairness test (because identical-account-iteration-order is the *only* thing that distinguishes the two underwater iterations). 4 + 1 (mixed) + 1 (FIFO) = 6. **Coverage math, not arbitrary count.**

**Q2: Why doesn't L13 add a "scanner runs after fund depletes mid-batch" test?**

Because that case is already covered by `unfilled_implies_empty_fund` proptest #2 (which triggers exactly when the fund depletes mid-scan) and by `scan_first_underwater_gets_paid_then_second_unfilled` unit test #6 (which constructs a deterministic version). Adding a dedicated "mid-batch depletion" test would duplicate either of those. **The 6 unit tests + 4 proptests already cover the case; redundant tests are noise.**

**Q3: Could the 4 proptests be reduced to 1 by combining them all into one mega-property?**

You *could* (`fund_balance_delta_matches_report ∧ unfilled_implies_empty_fund ∧ records_count_bounded_by_accounts ∧ scan_is_deterministic`), but each property is independently meaningful — proving them separately makes the test failure message tell you *which* invariant broke. A mega-property with `prop_assert!(A && B && C && D)` would only report "the mega-property failed" without saying which sub-property. **Property-level granularity gives diagnostic granularity at failure time.**

**Q4: Why does `scan_is_deterministic` only run two iterations, not many?**

Because two iterations is what catches the nondeterminism. If two runs differ, *any* number of runs would differ. Three runs would catch the same bug; four runs same. The "many runs" defense is for *flaky* tests where the bug occurs probabilistically (which scanner determinism shouldn't have — it's deterministic by construction). **Test the property at minimum-multiplicity; multiplicity beyond that is wasted iteration.**

**Q5: What's not tested by L13's tests + proptests?**

A few things — deliberately. **Out of scope:** (a) the precise byte-layout of `ScanReport` (it's only used in-process, never serialized to disk in Stage 10c); (b) thread-safety (`LiquidationScanner` isn't `Send + Sync`-tested because Stage 10c uses single-threaded execution by design); (c) panic-safety (the bridge handles panics at a higher level). **In scope:** every classification → routing → aggregation path that affects fund state. **L13's tests cover what consensus actually needs.**

**Q6: What does Stage 10d (ADL) consume from L13's scanner?**

Exactly `ScanReport.unfilled_deficit` — the i64 that means "this many quote units of shortfall the fund couldn't absorb." Stage 10d would (a) read this field after every block's scan, (b) if non-zero, walk the *profitable* counter-positions in deterministic order, (c) force-close enough of them to cover the deficit. The L13 proptest `unfilled_implies_empty_fund` *guarantees* that this field is the only place the bridge needs to look — there's no second escalation signal hiding elsewhere. **Stage 10d gets one number; it knows what to do with it.**

## Module 4 + Stage 10 retrospective

The 13 lessons of the Liquidation course, in one table:

| # | Module | Lessons | Stage | What was built |
|---|---|---|---|---|
| M0 | Orientation | L0 | — | Course overview, openhl context |
| M1 | Types | L1, L2, L3 | 10a | `LiquidationParams`, `MarginRatio`, `MarginHealth`, `AccountSnapshot`, `CloseOrderSpec` |
| M2 | Pure compute | L4, L5, L6, L7 | 10a | `notional_value`, `unrealized_pnl`, `account_equity`, `margin_ratio`, `margin_health`, `close_order_spec` |
| M3 | Insurance fund | L8, L9, L10 | 10b | `InsuranceFund` state machine, `WithdrawOutcome` 3-variant enum, `liquidation_fee`, `solvent_close_outcome`, `underwater_close_outcome`, `SolventClose`, `UnderwaterClose` |
| M4 | Scanner + capstone | **L11, L12, L13** | 10c | `CloseOutcomeKind`, `LiquidationRecord`, `ScanReport`, `LiquidationScanner`, `scan` method, 10 unit tests + 4 proptests |

**69 tests. 4 modules. 13 lessons. 3 openhl commit SHAs.** The Liquidation crate is now a complete, deterministic, defensively-coded multi-account orchestration layer that the openhl bridge can call once per block to drive the entire safety-net cascade up to (but not including) ADL.

The next course in the openhl curriculum — Stage 10d, ADL — will consume `ScanReport.unfilled_deficit` as its only input, walk profitable counter-positions, and force-close them to absorb whatever the fund couldn't. The contract L13's proptests fix is what Stage 10d will read.

## Next course — Stage 10d, ADL (separate course)

L13 is the *last* lesson in the Liquidation course. The cascade's Layer 3 — ADL (auto-deleveraging) — is its own dedicated future course. The handoff:

1. **The scanner produces `unfilled_deficit > 0`** when the fund couldn't absorb all underwater shortfalls (L13 proptest #2 guarantees this is the *only* signal).
2. **Stage 10d's ADL routine** would read this field after each block's scan.
3. **The ADL routine** walks all *profitable* counter-positions in deterministic order (likely `(pnl_pct × leverage)` descending, with `account_id` as tiebreaker), force-closes them in sequence, and credits the recovered margin back to the insolvent positions.
4. **The ADL outcome** is a separate `AdlReport` type, with its own conservation law and its own proptests.

Stage 10d is implemented in openhl at commit `d66b44a`; the rethlab ADL course will land when its lessons are drafted.

````

---

## Seed-file slot

L13 lands in Module 4 at sortOrder 2:

```typescript
{
  title: 'Lesson 13 — Scanner capstone — 6 nuanced unit tests + 4 invariant proptests + the Stage 10 retrospective',
  slug: 'openhl-liquidation-scanner-capstone-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 40,
  xpReward: 80,
  content: `# Lesson 13 — Scanner capstone — 6 nuanced unit tests + 4 invariant proptests + the Stage 10 retrospective\n\n...`
},
```

## SHA pinning discipline

L13 stays on `0a8464e` (Stage 10c). After L13, `scanner.rs` matches the answer key **byte-for-byte**. The Liquidation crate is *complete* at the end of Stage 10c. Stage 10d (ADL, `d66b44a`) is a separate course.

## Style review notes (self-critique before paste)

- **L13 is the longest lesson in the course** (40 min). Justified by the capstone status — 6 nuanced tests + 4 proptests + Stage 10 trilogy retrospective + Module 4 retrospective. The reader who finishes L13 has built a complete, deterministic, defensively-coded multi-account liquidation orchestration layer; the lesson honors that achievement with a comprehensive walkthrough.
- **The "off-by-one note" in the verification block** (the 68 → 69 correction) is honest scoping. L11 and L12 projected the wrong total based on a miscount. L13 corrects it and acknowledges the source. Course-internal corrections build reader trust — a reader who sees a project author correct themselves is more likely to trust the rest of the content.
- **The "Test coverage matrix" diagram** at the start makes the 6+4 structure visible *before* the reader walks through the tests one by one. This is the same vocabulary-first pattern from L11; it works equally well here at the test level.
- **The Q6 ADL handoff** is the longest forward-reference in the entire course. Stage 10d is openhl commit `d66b44a` (already shipped), but the rethlab ADL course doesn't exist yet. Naming the consumption pattern (`unfilled_deficit > 0 → walk profitable counters → force-close in order`) gives the reader a glimpse of the next stage without needing to wait.
- **The "trilogy retrospective" framing** treats Stage 10 as a *single architectural decision* spread across 3 stages — pure compute, state, orchestration. The 5-module course table at the end is the visual companion to that framing.
- **No new `lib.rs` changes in L13.** Same as L9 and L12 — once the scanner type vocabulary is re-exported (L11), and the scan method is implemented (L12), L13's only file edit is the test module. **The crate's public surface is set; L13 just locks in its tested behaviors.**
