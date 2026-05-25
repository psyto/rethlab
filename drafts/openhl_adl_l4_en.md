# Building OpenHL ADL — L4 draft (EN) — build-along

> openhl SHA `d66b44a` (Stage 10d — auto-deleveraging). Capstone — closes both the ADL course AND the Stage 10 quartet.

## L4 — `openhl-adl-capstone-en`

**Stage**: Stage 10d — `d66b44a`

**Title**: Lesson 4 — Capstone — 5 invariant proptests + Stage 10 quartet retrospective

**Duration**: 45 min · **XP**: 90

---

````markdown
# Lesson 4 — Capstone — 5 invariant proptests + Stage 10 quartet retrospective

## Goal

Concepts you'll grasp in this lesson:

- **L4 closes two things at once: the ADL course AND the Stage 10 quartet.** Stage 10a (margin classification, pure compute) + 10b (insurance fund, stateful absorption) + 10c (scanner, orchestration) + 10d (ADL, off-orderbook fallback) is the full safety-net cascade. After L4 you can point at every account state transition under stress and name (a) which layer handled it, (b) which conservation law preserved it, and (c) which proptest proves it universally. **Four stages, three layers, one discipline.**
- **5 invariant proptests universalize what L2+L3 proved on specific inputs.** L2's 5 degenerate-path tests and L3's 6 nuanced-absorption tests prove `execute_adl` on hand-picked inputs; L4's 5 proptests prove the same properties on *random* inputs. (1) `conservation_absorbed_plus_remaining_equals_deficit` — the load-bearing conservation law. (2) `each_record_balances_pnl` — per-record decomposition. (3) `total_haircut_equals_deficit_absorbed` — per-record/aggregate accounting consistency. (4) `execute_adl_is_deterministic` — same input → same output, always. (5) `records_in_rank_order` — sort discipline holds for any input. **Specific tests prove the function's shape; proptests prove the function's universality.**
- **The proptest's input strategy is the spec for "what counts as valid input".** `collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15)` says "between 0 and 15 candidate accounts, each with collateral between 1 and 1,000,000." `mark in 1_u64..1_000` says "the mark price ranges 1 to 1000." `deficit in 0_i64..1_000_000` says "the deficit ranges 0 to 1M." These ranges are the *meaningful operating regime* — outside them, the proptest doesn't generate inputs (overflow/underflow edge cases get handled by the saturating ops L2 introduced, not by the proptest). **Input strategies aren't just "any input"; they're "any input in the operating regime."**
- **The Stage 10 retrospective is a course-spanning thesis statement.** The 4 stages compose into a single per-block orchestration: scanner classifies, insurance fund absorbs, ADL fallbacks, and every layer's failure mode is *bounded by structural invariants that are mechanically proven*. This is the rethlab thesis applied to one production cascade: discipline transfers across layers because conservation laws don't care about layer boundaries. **Conservation isn't a property you add; it's a discipline you preserve from Layer 1 to Layer 3.**

Verification:

```bash
cargo test -p openhl-liquidation adl::tests
```

…now reports **21 tests passing** (L1: 5 score-eligibility/ordering + L2: 5 degenerate + L3: 6 nuanced + L4: 5 proptests). The full ADL surface — score eligibility, pipeline correctness, conservation laws, decomposition, determinism, ordering — is proven against both specific and random inputs.

Specific changes:

- **`crates/liquidation/src/adl.rs`** — append a `proptest! { ... }` block at the bottom of the `#[cfg(test)] mod tests` module containing the 5 invariants.

5 proptests, ~60 lines of new test code. Plus the Stage 10 quartet retrospective walks the cascade architecture — no code, just architectural framing that closes the course.

## Recap

After L3:
- `execute_adl(candidates, mark, deficit) -> AdlReport` is shipped (L2) and tested against 11 specific inputs (L1's 5 + L2's 5 + L3's 6 = 16 unit tests).
- The 5-phase pipeline (early-return + filter_map + sort_by + haircut loop + finalize) is structurally correct on every hand-picked input we've thrown at it.
- The conservation law `deficit_absorbed + deficit_remaining == input_deficit` is *implicit* in every L3 test (verified per-input) but not yet *universal* (verified for-all-inputs).

L4 takes the same `execute_adl` and proves the same properties universally. Same function, same theorems, infinitely many inputs.

## Plan

Two artifacts:

1. **5 proptests** appended to `adl.rs`'s `#[cfg(test)] mod tests` block, inside a `proptest! { ... }` macro invocation. Each proptest takes a `(collaterals, mark, deficit)` input strategy and proves one of the 5 invariants.

2. **Stage 10 quartet retrospective** — no code; an architectural walkthrough of how 10a + 10b + 10c + 10d compose into the safety-net cascade, with the conservation laws of each stage named.

> 🛑 **Predict.** Before reading the proptests below: openhl-liquidation L13's capstone had 4 proptests; L4 here has 5. What's the extra proptest here that L13 didn't need, given that ADL has a *return value* (the report) and L13's scanner has a similar one?

(Answer: **`records_in_rank_order`** — universalizes ADL's *sort discipline*. L13's scanner doesn't sort its records (it processes accounts in insertion order); ADL's records must be in `(score descending, account_id ascending)` order, and this proptest proves it for any input. The other 4 proptests (conservation, decomposition, accounting consistency, determinism) have direct L13 analogues; the 5th exists only because ADL has a stronger ordering contract than the scanner did. **More structure in the output requires more invariants to preserve it.**)

## The 5 proptests

Append to `adl.rs`, after the L3 unit tests, inside the same `#[cfg(test)] mod tests` block:

```rust
proptest! {
    /// Conservation: absorbed + remaining = input deficit (for
    /// non-negative inputs).
    #[test]
    fn conservation_absorbed_plus_remaining_equals_deficit(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15),
        mark in 1_u64..1_000,
        deficit in 0_i64..1_000_000,
    ) {
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let report = execute_adl(&candidates, MarkPrice(mark), deficit);
        prop_assert_eq!(report.deficit_absorbed + report.deficit_remaining, deficit);
    }

    /// Every record has `pnl_paid == pnl_gross - haircut`, with
    /// both haircut and pnl_paid non-negative.
    #[test]
    fn each_record_balances_pnl(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15),
        mark in 1_u64..1_000,
        deficit in 1_i64..1_000_000,
    ) {
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let report = execute_adl(&candidates, MarkPrice(mark), deficit);
        for rec in &report.records {
            prop_assert!(rec.haircut >= 0);
            prop_assert!(rec.haircut <= rec.pnl_gross);
            prop_assert!(rec.pnl_paid >= 0);
            prop_assert_eq!(rec.pnl_paid, rec.pnl_gross - rec.haircut);
        }
    }

    /// Total haircuts equal `deficit_absorbed`.
    #[test]
    fn total_haircut_equals_deficit_absorbed(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15),
        mark in 1_u64..1_000,
        deficit in 1_i64..1_000_000,
    ) {
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let report = execute_adl(&candidates, MarkPrice(mark), deficit);
        let total: i64 = report.records.iter().map(|r| r.haircut).sum();
        prop_assert_eq!(total, report.deficit_absorbed);
    }

    /// Determinism: same input twice → same report.
    #[test]
    fn execute_adl_is_deterministic(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 0..10),
        mark in 1_u64..1_000,
        deficit in 0_i64..1_000_000,
    ) {
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let r1 = execute_adl(&candidates, MarkPrice(mark), deficit);
        let r2 = execute_adl(&candidates, MarkPrice(mark), deficit);
        prop_assert_eq!(r1, r2);
    }

    /// Records are in non-increasing score order (or equal score
    /// with strictly ascending account_id).
    #[test]
    fn records_in_rank_order(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 2..15),
        mark in 100_u64..500,
        deficit in 1_000_000_i64..10_000_000,
    ) {
        // Big deficit ensures we get many records.
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let report = execute_adl(&candidates, MarkPrice(mark), deficit);
        for w in report.records.windows(2) {
            let (a, b) = (&w[0], &w[1]);
            // Either strict score decrease, OR same score with smaller account_id first.
            let ok = a.score > b.score
                || (a.score == b.score && a.account.0 < b.account.0);
            prop_assert!(ok, "rank order broken between {:?} and {:?}", a, b);
        }
    }
}
```

## Walk-through — what each proptest universalizes

### Proptest 1: Conservation

```rust
prop_assert_eq!(report.deficit_absorbed + report.deficit_remaining, deficit);
```

Three things to notice:

1. **This is the load-bearing conservation law from L2's Phase 5 + Phase 4 loop body.** Every iteration's `haircut + new_remaining == old_remaining` accumulates so that at the end, `deficit_absorbed + deficit_remaining == initial_deficit`. The proptest verifies this for *any* `(collaterals, mark, deficit)` tuple in the operating regime.
2. **`deficit in 0_i64..1_000_000`** includes zero. This catches Phase 1's `deficit <= 0` early-return — `deficit = 0` produces `deficit_absorbed = 0` and `deficit_remaining = 0`, and `0 + 0 == 0` holds. **The input range includes the boundary; the conservation law holds at the boundary.**
3. **L3 Tests 2 (`single_winner_exhausted_with_remaining_deficit`) and 4 (`drains_first_winner_then_partially_second`)** each verified conservation on one specific input. This proptest verifies it on default-256 random inputs (configurable to 100,000+ in CI). **What 2 unit tests assert on 2 inputs, 1 proptest asserts on 256.**

### Proptest 2: Per-record decomposition

```rust
for rec in &report.records {
    prop_assert!(rec.haircut >= 0);
    prop_assert!(rec.haircut <= rec.pnl_gross);
    prop_assert!(rec.pnl_paid >= 0);
    prop_assert_eq!(rec.pnl_paid, rec.pnl_gross - rec.haircut);
}
```

Three things to notice:

1. **Four sub-assertions per record:** non-negative haircut, haircut bounded by pnl_gross, non-negative pnl_paid, and the decomposition equation. Each is a separate `prop_assert!` so a failure tells you exactly which sub-property broke. **Granular assertions make proptest failures debuggable.**
2. **`for rec in &report.records` iterates over the *actual* records produced.** If the report has 0 records (degenerate input case), the loop is a no-op and the proptest passes — vacuously. **Proptests with no records are vacuous proofs; that's fine, they're not the interesting cases.**
3. **L3 Tests 1, 2, 4 each verified one record's decomposition on a specific input. This proptest verifies all records on random inputs.** The arithmetic identity `pnl_paid = pnl_gross - haircut` from Phase 4's `pnl_gross.saturating_sub(haircut)` is universal here. **Saturating subtraction doesn't matter here — `haircut <= pnl_gross` is enforced by the `.min` in Phase 4, so the subtraction never underflows.**

### Proptest 3: Aggregate accounting consistency

```rust
let total: i64 = report.records.iter().map(|r| r.haircut).sum();
prop_assert_eq!(total, report.deficit_absorbed);
```

Three things to notice:

1. **This proves the cross-check between per-record and aggregate accounting.** Phase 4 accumulates `deficit_absorbed = deficit_absorbed.saturating_add(haircut)` in lockstep with `records.push(... haircut ...)`. So summing all `record.haircut` *must* equal `deficit_absorbed`. If the accumulator ever drifted from the records (e.g., a refactor adds a haircut but forgets to push the record), this proptest catches it.
2. **The `total: i64 = ... .sum()` could overflow in principle.** In practice, each `haircut <= deficit` and `deficit <= 1_000_000` (the input range), and there are at most 15 candidates — so total ≤ 15,000,000, well within i64 bounds. **The input strategy's upper bound implicitly bounds the sum's upper bound.**
3. **This invariant is the one that's hardest to verify by inspection but easiest to verify by proptest.** A reader looking at `execute_adl` *could* convince themselves that the records-vs-accumulator drift is impossible, but a proptest is faster and more certain. **Some invariants are reader-verifiable; others are proptest-verifiable. Use the right tool.**

### Proptest 4: Determinism

```rust
let r1 = execute_adl(&candidates, MarkPrice(mark), deficit);
let r2 = execute_adl(&candidates, MarkPrice(mark), deficit);
prop_assert_eq!(r1, r2);
```

Three things to notice:

1. **Same function, same input, twice → asserts equality of full reports.** This catches *any* hidden non-determinism: a `HashMap` iteration that randomizes order, a clock read that returns different values, a `sort_unstable_by` that breaks ties differently. None of these exist in `execute_adl`, but if a future refactor accidentally introduces one, this proptest catches it.
2. **`AdlReport` derives `PartialEq` (via L1's design).** That's what makes `prop_assert_eq!(r1, r2)` work — the equality compares every field (records, deficit_absorbed, deficit_remaining) for byte-identical match. **`PartialEq` derive on every report type is non-optional in consensus code; without it, determinism proptests can't exist.**
3. **The `0..10` candidate count (smaller than other proptests' `0..15`) keeps this fast.** Determinism is more expensive to test (each iteration calls `execute_adl` twice). The smaller input range is a performance trade-off; the property still holds at any size, so reducing the range doesn't weaken the proof. **Performance budgets shape input-range choices in proptests.**

### Proptest 5: Rank order

```rust
for w in report.records.windows(2) {
    let (a, b) = (&w[0], &w[1]);
    let ok = a.score > b.score
        || (a.score == b.score && a.account.0 < b.account.0);
    prop_assert!(ok, "rank order broken between {:?} and {:?}", a, b);
}
```

Four things to notice:

1. **`.windows(2)` pairs adjacent records.** For each adjacent pair (rank N and rank N+1), the test verifies the sort discipline: either strictly descending score, or equal score with strictly ascending account_id. **`.windows(2)` is the idiomatic way to verify pairwise invariants in Rust.**
2. **The `||` (or) is exactly the inverse of Phase 3's `b.cmp(&a).then_with(|| a.cmp(&b))`.** Phase 3 sorts so that score-desc-then-id-asc holds; this proptest asserts that exact ordering on the output. If Phase 3's sort were ever silently broken (e.g., a refactor swaps the comparator), this proptest catches it.
3. **`deficit in 1_000_000_i64..10_000_000` is much bigger than other proptests.** Why? Because a small deficit produces few records (often just 1), and "rank order" of a single record is trivially satisfied. We want *many* records in the output to actually exercise the ordering discipline. **The input range is calibrated to make the property non-vacuously testable.**
4. **The failure message `"rank order broken between {:?} and {:?}"` formats both records.** When a proptest fails, the message goes into CI logs; including the actual records gives the debugger immediate context. **Failure messages are documentation that runs when things break.**

## Run them all

```bash
cargo test -p openhl-liquidation adl::tests
```

Expected:

```
test adl::tests::adl_does_not_touch_losers_or_flats ... ok
test adl::tests::adl_drains_first_winner_then_partially_second ... ok
test adl::tests::adl_multiple_winners_in_score_order ... ok
...
test adl::tests::adl_tiebreaker_by_account_id_ascending ... ok
test adl::tests::conservation_absorbed_plus_remaining_equals_deficit ... ok
test adl::tests::each_record_balances_pnl ... ok
test adl::tests::execute_adl_is_deterministic ... ok
test adl::tests::records_in_rank_order ... ok
test adl::tests::total_haircut_equals_deficit_absorbed ... ok

test result: ok. 21 passed; 0 failed
```

**21 tests, 16 specific inputs + 5 universal properties, all green.** The ADL implementation is mechanically verified.

For the heavy proof — bump proptest's `PROPTEST_CASES` env var:

```bash
PROPTEST_CASES=10000 cargo test -p openhl-liquidation adl::tests
```

This runs each proptest 10,000 times instead of the default 256. Takes ~10-30 seconds on modern hardware. Production CI runs nightly with `PROPTEST_CASES=100000` for the full proof-of-the-day.

## Stage 10 quartet retrospective — the safety-net cascade

The 4 stages compose into a single per-block orchestration. Each layer has its own conservation law; failures cascade downward through the layers in a bounded, observable way.

### Cascade at a glance — capacity drops layer by layer

```
   ┌─────────────────────────────────────────────────────────────┐
   │  Detectors  (Layer 1 + 1.5)                                 │
   │    margin classify + scanner orchestration                  │
   │    → produces ScanReport { unfilled_deficit: D }            │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼ if D > 0
   ┌─────────────────────────────────────────────────────────────┐
   │  Buffer     (Layer 2, capacity = fund balance)              │
   │    insurance fund absorbs min(D, fund_balance)              │
   │    → remaining D' = D − absorbed                            │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼ if D' > 0
   ┌─────────────────────────────────────────────────────────────┐
   │  Fallback   (Layer 3, capacity = ∑ winners' PnL)            │
   │    ADL absorbs min(D', ∑PnL_winners)                        │
   │    → remaining D'' = D' − absorbed                          │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼ if D'' > 0
   ┌─────────────────────────────────────────────────────────────┐
   │  Last resort (Layer 4, no in-system capacity)               │
   │    protocol policy: halt the chain · accept residual        │
   └─────────────────────────────────────────────────────────────┘

   Deficit shrinks monotonically: D ≥ D' ≥ D'' ≥ 0
   Each layer's residual becomes the next layer's input.
```

The detailed orchestration view below names the inputs, outputs, and conservation law of each layer:

```
   ╔══════════════════════════════════════════════════════════════════╗
   ║  Per-block orchestration loop (the bridge calls this each block) ║
   ╠══════════════════════════════════════════════════════════════════╣
   ║                                                                  ║
   ║  ┌─ Layer 1 — Stage 10a: Margin classification (pure compute) ─┐ ║
   ║  │  Inputs:  account snapshots × mark price                    │ ║
   ║  │  Output:  MarginPhase per account (Safe/AtRisk/             │ ║
   ║  │           Liquidatable/Underwater)                          │ ║
   ║  │  Law:     Phase boundaries deterministic per (snapshot,     │ ║
   ║  │           mark, params)                                     │ ║
   ║  └─────────────────────────────────────────────────────────────┘ ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 1.5 — Stage 10c: Scanner (orchestrator) ────────────┐  ║
   ║  │  Inputs:  classified accounts × mark price                 │  ║
   ║  │  Output:  ScanReport { closes, unfilled_deficit }          │  ║
   ║  │  Law:     before_balance + ∑deposits − ∑withdrawals =      │  ║
   ║  │           after_balance (per-scan conservation)            │  ║
   ║  └────────────────────────────────────────────────────────────┘  ║
   ║                              ↓                                   ║
   ║                if scan.unfilled_deficit > 0:                     ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 2 — Stage 10b: InsuranceFund (stateful absorption) ─┐  ║
   ║  │  Inputs:  ScanReport closes, fund state                    │  ║
   ║  │  Output:  WithdrawOutcome (Covered/PartiallyDrained/       │  ║
   ║  │           Depleted)                                        │  ║
   ║  │  Law:     fee + residual = equity (per-close balance)      │  ║
   ║  └────────────────────────────────────────────────────────────┘  ║
   ║                              ↓                                   ║
   ║              if WithdrawOutcome != Covered:                      ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 3 — Stage 10d: ADL (off-orderbook fallback) ───────┐   ║
   ║  │  Inputs:  remaining accounts × mark × unfilled_deficit    │   ║
   ║  │  Output:  AdlReport { records, deficit_absorbed,          │   ║
   ║  │           deficit_remaining }                             │   ║
   ║  │  Law:     deficit_absorbed + deficit_remaining = input    │   ║
   ║  │           deficit (this lesson, proptest 1)               │   ║
   ║  └───────────────────────────────────────────────────────────┘   ║
   ║                              ↓                                   ║
   ║              if AdlReport.deficit_remaining > 0:                 ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 4 — Protocol policy (out of scope) ─────────────┐      ║
   ║  │  Options: halt the chain · accept as protocol loss ·   │      ║
   ║  │           page operators                               │      ║
   ║  └────────────────────────────────────────────────────────┘      ║
   ║                                                                  ║
   ╚══════════════════════════════════════════════════════════════════╝
```

Three structural takeaways:

1. **Each layer's output is the next layer's input.** Scanner's `unfilled_deficit` becomes InsuranceFund's input. InsuranceFund's `WithdrawOutcome` gates whether ADL fires. ADL's `deficit_remaining` gates whether protocol policy kicks in. **Information flow is downstream-only; no layer reads a layer above it.**
2. **Each layer's failure mode is structurally bounded.** Margin classification can't crash on valid inputs (pure compute, no allocations). InsuranceFund can drain but the `WithdrawOutcome` enum names the exact failure shape. ADL can have `deficit_remaining > 0` but the conservation law bounds how big it can be. Protocol policy is the only layer with no in-system bound — by design, because that's where deployment policy enters. **Failure semantics are typed all the way down.**
3. **Every layer has a conservation law, proven by a proptest at the corresponding course.** L13's per-scan conservation (Stage 10c), Stage 10b's fee/residual decomposition, ADL's `deficit_absorbed + deficit_remaining = deficit` (this lesson). The Stage 10 quartet isn't 4 separate features — it's 4 proofs of the same discipline at different layers. **One discipline, four layers, byte-for-byte reproducible end-to-end.**

## Q&A

**Q1: Why default to 256 proptest iterations and not 10,000?**

Speed in the inner-loop dev cycle. `cargo test` should finish in seconds during development; 256 iterations × 5 proptests × ~1ms each = ~1.3 seconds for the proptest block. 10,000 iterations would take ~50 seconds, slowing every `cargo test` invocation. The compromise: 256 by default (catches obvious bugs in seconds), 10,000+ in CI (catches subtle bugs that need rare random inputs). **Default for speed, override for proof.**

**Q2: What if a proptest fails — how do I debug it?**

`proptest!` automatically shrinks the failing input to a minimal counterexample and prints it. The shrinker iteratively reduces the input (smaller collaterals vector, smaller mark, smaller deficit) while keeping the failure reproducing, until you get the smallest input that triggers the bug. Then you copy that exact input into a regular `#[test]` to reproduce deterministically in your IDE/debugger. **Proptests are property checkers; shrinkers are debuggers.**

**Q3: Could a proptest pass by accident — never hitting the actual bug?**

In principle yes (256 iterations doesn't guarantee hitting all edge cases), in practice rarely. The input strategies are calibrated to hit the operating regime densely. Specific failure modes you suspect can be added as unit tests in L1-L3, even after L4 ships. **Proptests are necessary but not sufficient — they complement unit tests, don't replace them.**

**Q4: Why is the `records_in_rank_order` proptest's `deficit` so much larger than the others?**

To force many records into the output. A small deficit gets absorbed by the first ranked winner, leaving 1 record (or 0). With 1 record, `.windows(2)` produces zero pairs and the test passes vacuously. Cranking `deficit` to `1_000_000..10_000_000` against `0..15` candidates ensures most runs produce 5-15 records, actually exercising the pairwise ordering. **Calibrate input ranges to make properties non-vacuously testable.**

**Q5: Is `proptest!` faster than `quickcheck`?**

For typical workloads, comparable. `proptest!` is the better-maintained option in the 2026 Rust ecosystem and is what the openhl codebase uses throughout. It also has better shrinker behavior for complex inputs (vectors of structs, etc.). For new Rust projects in 2026, `proptest!` is the default; `quickcheck` is a legacy option. **In openhl, `proptest!` is the convention. Use it.**

**Q6: How does this compare with `forge invariant` (Foundry)?**

Same theorem, different mechanics. `forge invariant` randomly *sequences method calls* against a Handler and checks invariants after each call; `proptest!` here generates *random parameter sets* and runs the function once per input. Both prove "for all valid inputs, this property holds." `forge invariant` is multi-call; `proptest!` here is single-call (a separate `proptest-state-machine` crate handles stateful properties in Rust). **Same discipline, different surface: Rust uses `proptest!` for single-call and state-machine for multi-call; Solidity uses `forge invariant` for both.** The *Mastering Foundry* L6 capstone is the Solidity-side sibling to this lesson — it ports openhl-liquidation Stage 10b's `InsuranceFund` to Solidity and proves 4 invariants via `forge invariant`. Read alongside this L4 capstone, the pair demonstrates that the discipline transfers in both language directions.

## Course conclusion — DIY Perp series #6 complete

This is the final lesson of *Building OpenHL ADL*. 5 lessons in, you've:

- L0: Understood ADL's role as Layer 3 of the safety-net cascade
- L1: Defined `AdlScore`, `AdlRecord`, `AdlReport` + `adl_score` — the ranking function
- L2: Implemented `execute_adl` as a 5-phase pipeline + 5 degenerate tests
- L3: Proved the pipeline against 6 nuanced absorption tests
- L4: Universalized the proofs via 5 invariant proptests AND closed the Stage 10 quartet

The course is byte-for-byte against openhl Stage 10d at `d66b44a`. The Stage 10 quartet (10a + 10b + 10c + 10d) is complete: margin classification → insurance fund → scanner → ADL → bounded protocol policy. 16 unit tests + 5 proptests for ADL alone; combined with the openhl-liquidation course's tests for 10a/b/c, the full quartet has 60+ unit tests and 9+ invariant proptests mechanically proving the cascade.

Where to go next:

- **Stage 11 (oracle) and Stage 12 (vault)** when they land in openhl — same build-along pattern, same conservation discipline applied to new layers.
- **Re-read openhl-liquidation L13's capstone with ADL eyes** — the per-scan conservation law from L13 is now visible as "Layer 1.5's contribution to the cascade." The two capstones (L13 and this L4) are sibling artifacts.
- **Apply the discipline elsewhere.** Any system with `before/after/delta` state transitions — token vesting, fee accumulation, prediction-market settlement — admits this exact pattern. Define the per-step conservation, write the Handler-equivalent that exercises it, and prove the invariants.

The Stage 10 quartet isn't just 4 features. It's 4 proofs of the same discipline at different layers.

**One discipline. Four layers. Byte-for-byte reproducible end-to-end.**

````

---

## Seed-file slot

L4 lands in Module 1 (ADL implementation) at sortOrder 3 (capstone):

```typescript
{
  title: 'Lesson 4 — Capstone — 5 invariant proptests + Stage 10 quartet retrospective',
  slug: 'openhl-adl-capstone-en',
  type: 'CONTENT',
  sortOrder: 3,
  duration: 45,
  xpReward: 90,
  content: `# Lesson 4 — Capstone — 5 invariant proptests + Stage 10 quartet retrospective\n\n...`
},
```

## Drafting self-review (before paste)

- **L4 is the capstone closing both the ADL course AND the Stage 10 quartet** (45 min / 90 XP — bigger than L3's 35/60, smaller than Foundry L6's 60/110 because the proptest code is shorter than the Foundry capstone's Solidity port).
- **The Stage 10 cascade ASCII diagram is the load-bearing visual.** Shows Layer 1 → 1.5 → 2 → 3 → 4 with each layer's input/output/conservation law named. The diagram is dense but that density is the point — readers can see the full cascade in one view.
- **The 5 proptest walkthrough mirrors L2's 5-phase pipeline walkthrough structure.** Each proptest gets a code block + 3-4 things-to-notice. This pattern is now familiar across L2+L3+L4.
- **Predict callout asks "why 5 proptests vs L13's 4?"** The answer (ADL has sort discipline, scanner doesn't) is a structural insight that L13's capstone didn't have to teach.
- **Q6 explicitly cross-references Foundry L6's `forge invariant`** — closes the cross-course loop. Readers who've done the Foundry course will see ADL L4 + Foundry L6 as sibling capstones using different tools for the same discipline.
- **Course conclusion closes with the thesis: "One discipline. Four layers. Byte-for-byte reproducible end-to-end."** Mirrors Foundry L6's "Foundry is a tool. Discipline is the product." in punch but different in claim — Foundry was about tooling; ADL is about cascade composition.
- **Length: ~480 lines** — appropriate for a capstone, between L2 (398) and Foundry L6 (594). The Stage 10 retrospective alone is ~30 lines of ASCII + 30 lines of structural takeaways; the rest is proptests + Q&A.

