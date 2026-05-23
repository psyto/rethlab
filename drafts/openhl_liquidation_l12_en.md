# Building OpenHL Liquidation — L12 draft (EN) — build-along

> openhl SHA `0a8464e` (Stage 10c — multi-account liquidation scanner).

## L12 — `openhl-liquidation-scan-method-en`

**Stage**: Stage 10c — `0a8464e`

**Title**: Lesson 12 — `scan` — the orchestration heart of the safety cascade

**Duration**: 35 min · **XP**: 70

---

````markdown
# Lesson 12 — `scan` — the orchestration heart of the safety cascade

## Goal

Concepts you'll grasp in this lesson:

- **The `scan` method is the *only verb* in the orchestration layer; everything else is noun.** L11 declared four types that describe state; L12 implements one method that produces state from input. The method takes `(accounts, mark)` and returns a `ScanReport` — and inside its body, every Stage 10a + 10b primitive you've built across L4–L10 is called exactly once per liquidatable account. **Composition is the architecture; one verb consumes ten nouns.**
- **`match` on `MarginHealth` with a `continue`-guard is the cleanest "skip non-liquidatable accounts" pattern.** The alternative — `if !matches!(c, MarginHealth::Liquidatable | MarginHealth::Underwater) { continue; }` — is shorter but loses exhaustiveness. The `match` form makes the compiler enforce that *every* `MarginHealth` variant has been considered, which is the discipline that catches the future bug where someone adds a fifth variant. **Exhaustive `match` over an enum beats predicate-with-`!` whenever the enum might grow.**
- **The solvent-vs-underwater dispatch inside the loop directly mirrors L10's `debug_assert!` pair.** `if post_close_equity >= fee_desired` routes to `solvent_close_outcome`; the `else` routes to `underwater_close_outcome`. The scanner is doing exactly the routing that L10's debug-asserts said the caller would do. **The runtime predicate in the caller is identical to the contract enforced in the callee.**
- **The underwater branch's `WithdrawOutcome` pattern-match decomposes the L9 enum into a `(paid, unfilled)` tuple — that's the *only* place in the loop where L9's three-variant enum needs more than one line of handling.** Solvent closes never touch `withdraw_shortfall`; they only `deposit`. Underwater closes call `withdraw_shortfall` and pattern-match on the result. The aggregation into `ScanReport`'s i64 fields is a `saturating_add` per record. **The orchestration layer translates between L9's variants and L11's i64 aggregates in exactly one pattern-match.**

Verification:

```bash
cargo test -p openhl-liquidation
```

…passes 59 tests (34 compute + 21 insurance + 4 new scanner tests). The next 5 unit tests and 4 proptests land in L13; after L13, 68 tests total.

Specific changes:

- **`src/scanner.rs`** — adds the `scan` method to the existing `impl LiquidationScanner` block. The L11 imports finally have a consumer; the unused-import warnings go away. Adds the `#[cfg(test)] mod tests` scaffolding (helpers + `use` block + first section divider) and the 4 simplest unit tests.

L12 makes the scanner *runnable*. L13 stress-tests it.

## Recap

After L11:
- `scanner.rs` has the type vocabulary (`CloseOutcomeKind`, `LiquidationRecord`, `ScanReport`, `LiquidationScanner`) and 5 accessors (`new`, `with_empty_fund`, `fund_balance`, `fund`, `into_fund`).
- `lib.rs` re-exports all four scanner types.
- `cargo check` compiles cleanly, with unused-import warnings on `account_equity`, `close_order_spec`, `liquidation_fee`, `margin_health`, `notional_value`, `solvent_close_outcome`, `underwater_close_outcome`, and `WithdrawOutcome` — all *staged for L12*.
- `cargo test` still runs L0–L10's 55 tests, all green.

L12 cashes in every one of those staged imports.

## Plan

Two edits:

1. **Add the `scan` method to the `impl LiquidationScanner` block** in `crates/liquidation/src/scanner.rs`. The method body is ~50 lines — the orchestration loop that ties Stage 10a margin classification, Stage 10b close-outcome decomposition, and the InsuranceFund state machine into one batch operation.
2. **Add the `#[cfg(test)] mod tests` block** with three helper imports, the `snapshot` factory, the `default_params` helper, and the 4 simplest unit tests.

> 🛑 **Predict.** Before reading further: you're writing a single function that, for each account in a slice, either liquidates it (with the fund moving in some direction) or skips it. List the *six* distinct branches the function body needs — including the two skip cases (Safe/AtRisk continue, flat-position continue) and the four work cases (solvent → fund deposit; underwater positive equity → partial fee + withdraw; underwater zero equity → no fee + full withdraw; underwater negative equity → no fee + extra-large withdraw).

(Answer in the body: the function has exactly two `continue` branches and two routing branches (solvent vs underwater), with the underwater branch unifying the three positive/zero/negative equity sub-cases under one `underwater_close_outcome` call — the call internally branches but presents one return type. So at the scanner level: **two skips + one solvent + one underwater = four branches**. The "six" you might have predicted collapses to four because L10's `underwater_close_outcome` already handled the sub-case unification. **Encapsulating sub-cases inside a callee shrinks the caller's branch count.**)

The scan-method shape:

```
   ┌────────────────────────────────────────────────────────────┐
   │  scan(accounts, mark) → ScanReport                         │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  let mut report = ScanReport::default();                   │
   │  for snapshot in accounts {                                │
   │                                                            │
   │      let classification = margin_health(...);              │
   │      match classification {                                │
   │          Safe | AtRisk => continue,    ←─ skip path 1       │
   │          Liquidatable | Underwater => {} ← work path        │
   │      }                                                     │
   │                                                            │
   │      if snapshot.position_size.0 == 0 { continue; } ← skip 2│
   │                                                            │
   │      let close_order = close_order_spec(snapshot);         │
   │                                                            │
   │      let outcome = if post_close_equity >= fee_desired {   │
   │          // Solvent branch                                 │
   │          let s = solvent_close_outcome(...);               │
   │          self.fund.deposit(s.fee_to_fund);                 │
   │          report.fund_deposits += s.fee_to_fund;            │
   │          CloseOutcomeKind::Solvent(s)                      │
   │      } else {                                              │
   │          // Underwater branch                              │
   │          let u = underwater_close_outcome(...);            │
   │          if u.fee_to_fund > 0 { self.fund.deposit(u.f_t_f);│
   │                                  report.fund_deposits +=  }│
   │          let w = self.fund.withdraw_shortfall(u.shortfall);│
   │          // Pattern-match on WithdrawOutcome → (paid, unfilled)│
   │          report.fund_withdrawals += paid;                  │
   │          report.unfilled_deficit  += unfilled;             │
   │          CloseOutcomeKind::Underwater(u)                   │
   │      };                                                    │
   │                                                            │
   │      report.records.push(LiquidationRecord { ... });       │
   │  }                                                         │
   │                                                            │
   │  report                                                    │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
```

Three things to notice about the shape:

1. **The outer iteration is `for snapshot in accounts` — a simple ordered loop.** No `iter().filter().map().collect()` chain. Why? Because each iteration has *side effects* (fund mutation, report mutation). Iterator chains compose well over pure transformations; for stateful per-iteration work, a plain `for` is more readable and easier to debug. **`for` loops beat iterator chains when iteration side-effects mutate state outside the closure.**
2. **The two `continue` branches are at the *top* of the loop body.** They reject inputs before the function commits to any work — classification first, flat-skip second. The "happy path" code (after the skips) sits inline at the same indent level, not nested inside an `if`. **Top-of-loop rejection is the cleanest pattern for skip-conditions; nesting would push the work deeper than it needs to go.**
3. **The aggregation into `ScanReport` fields uses `saturating_add` per iteration, not a final `.iter().sum()`.** L11's design choice (aggregate fields next to record vector) demands per-iteration accumulation. The cost is one `saturating_add` per scalar per record — a microsecond next to the work being done. **Single-pass accumulation matches the L11 design contract.**

## Walk-through

### Step 1: Add the `scan` method

Open `crates/liquidation/src/scanner.rs`. Find the existing `impl LiquidationScanner { ... }` block (which currently ends with the `into_fund` accessor). After `into_fund`, append the `scan` method:

```rust
    /// Scan every account and produce a [`ScanReport`] of the resulting
    /// liquidations.
    ///
    /// All accounts are classified at the given `mark`. Liquidatable and
    /// Underwater accounts are converted to close orders + outcomes,
    /// with the insurance fund mutated in place. `Safe` and `AtRisk`
    /// accounts produce no record and no fund mutation.
    ///
    /// Flat positions (`position_size == 0`) that misclassify as
    /// Liquidatable are also skipped — `close_order_spec` would emit a
    /// zero-qty spec which the CLOB rejects.
    pub fn scan(
        &mut self,
        accounts: &[AccountSnapshot],
        mark: MarkPrice,
    ) -> ScanReport {
        let mut report = ScanReport::default();

        for snapshot in accounts {
            let classification = margin_health(snapshot, mark, &self.params);
            match classification {
                MarginHealth::Safe | MarginHealth::AtRisk => continue,
                MarginHealth::Liquidatable | MarginHealth::Underwater => {}
            }

            // Skip flat positions defensively — the upstream
            // classification should never put them here, but the math
            // for a zero-size position produces a zero-qty close order
            // which the CLOB rejects.
            if snapshot.position_size.0 == 0 {
                continue;
            }

            let close_order = close_order_spec(snapshot);

            // Decide solvent vs underwater path on post-close-equity vs
            // desired fee, exactly mirroring the compute module's
            // contract.
            let notional = notional_value(snapshot, mark);
            let fee_desired = liquidation_fee(notional, &self.params);
            let post_close_equity = account_equity(snapshot, mark);

            let outcome = if post_close_equity >= fee_desired {
                let solvent = solvent_close_outcome(snapshot, mark, &self.params);
                self.fund.deposit(solvent.fee_to_fund);
                report.fund_deposits =
                    report.fund_deposits.saturating_add(solvent.fee_to_fund);
                CloseOutcomeKind::Solvent(solvent)
            } else {
                let underwater = underwater_close_outcome(snapshot, mark, &self.params);
                if underwater.fee_to_fund > 0 {
                    self.fund.deposit(underwater.fee_to_fund);
                    report.fund_deposits = report
                        .fund_deposits
                        .saturating_add(underwater.fee_to_fund);
                }
                let withdraw = self.fund.withdraw_shortfall(underwater.shortfall_to_fund);
                let (paid, unfilled) = match withdraw {
                    WithdrawOutcome::Covered { amount } => (amount, 0),
                    WithdrawOutcome::PartiallyDrained { amount, unfilled } => {
                        (amount, unfilled)
                    }
                    WithdrawOutcome::Depleted { unfilled } => (0, unfilled),
                };
                report.fund_withdrawals = report.fund_withdrawals.saturating_add(paid);
                report.unfilled_deficit = report.unfilled_deficit.saturating_add(unfilled);
                CloseOutcomeKind::Underwater(underwater)
            };

            report.records.push(LiquidationRecord {
                account: snapshot.account,
                close_order,
                classification,
                outcome,
            });
        }

        report
    }
```

Walking the body phase-by-phase:

#### Phase 1: Classify (lines 1-5 inside the loop)

```rust
let classification = margin_health(snapshot, mark, &self.params);
match classification {
    MarginHealth::Safe | MarginHealth::AtRisk => continue,
    MarginHealth::Liquidatable | MarginHealth::Underwater => {}
}
```

Three things to notice:

1. **The `match` is exhaustive — and the compiler enforces it.** L6's `MarginHealth` has exactly four variants; the two arms cover all four. If someone adds a fifth variant tomorrow (e.g., `LiquidatableButOnHold`), this `match` will fail to compile, and the build break tells us we need to decide which side it goes on. **The non-exhaustive alternative — `if !matches!(c, Liquidatable | Underwater) { continue; }` — would silently accept the new variant as a skip, hiding the design question.**
2. **The work-path arm is `{} `, not a body.** The arm exists *only* to make exhaustiveness work; the actual work happens after the `match`. This is the Rust idiom for "filter and fall through to the rest of the function." **Empty arms in `match` are how you fall through after exhaustiveness checking.**
3. **Or-patterns (`Safe | AtRisk`)** unify the two skip cases under one arm. The same trick L9's proptest used (`Covered { amount } | PartiallyDrained { amount, .. }`) reappears here for variant grouping. **Or-patterns are the rhythm of exhaustive-match code in Rust.**

Before Phase 2, the rejection-ladder structure that Phase 1's `match` and Phase 2's flat-check form together is worth pausing on. Both guards live at the top of the loop body and *exit the iteration* if they fire; the happy path then runs at the same indent level as the guards themselves, never nested inside an `if`:

```
   Account slice ─┐
                  │
                  ▼
        [Phase 1: margin_health]
                  │
                  ├─ Safe / AtRisk ──────────→ continue (next iteration)
                  │
                  ▼ Liquidatable / Underwater
        [Phase 2: defensive flat-check]
                  │
                  ├─ size == 0 ──────────────→ continue (next iteration)
                  │
                  ▼ size != 0
        ── happy path (no nesting) ──
        Phase 3-6: close order, routing, fund mutation, push record
```

The two rejection branches diverge *out of* the iteration; the happy-path code stays flat at one indent level. **The pattern is "filter at the top, work at the bottom, no nesting in between."**

#### Phase 2: Defensive flat-skip (lines 7-13)

```rust
if snapshot.position_size.0 == 0 {
    continue;
}
```

This is a defensive guard against a *theoretically-impossible* state: the only way for a flat position to reach this point is for `margin_health` to misclassify it as `Liquidatable` or `Underwater`, which L6's classification rules forbid (flat → ratio MAX → `Safe`). But the bridge can submit unsanitized snapshots, and L7's `close_order_spec` would produce a zero-qty `CloseOrderSpec` that the CLOB rejects. **The skip is cheap defensive coding — *protect downstream consumers from upstream bugs we can't enforce away.***

#### Phase 3: Generate close order (line 15)

```rust
let close_order = close_order_spec(snapshot);
```

One line. L7's pure function does all the work. **A single-line call to a Stage 10a function is what the orchestration layer's "use the primitives" look like.**

#### Phase 4: Routing decision (lines 17-24)

```rust
let notional = notional_value(snapshot, mark);
let fee_desired = liquidation_fee(notional, &self.params);
let post_close_equity = account_equity(snapshot, mark);

let outcome = if post_close_equity >= fee_desired {
    // ... solvent branch
} else {
    // ... underwater branch
};
```

Five things to notice:

1. **The predicate is exactly the inverse of L10's `underwater_close_outcome` `debug_assert!` (`equity < fee`).** L10's assertion said "underwater means equity < fee"; here we use `>=` for solvent. The scanner's runtime check matches L10's compile-time contract. **The scanner does *no math* L10 didn't already document.**
2. **Three local variables (`notional`, `fee_desired`, `post_close_equity`) before the predicate.** Each is named, each is one line, each is an existing function call. The reader walks down the local-variable cascade and arrives at the predicate knowing exactly what's on each side. **Locally-named intermediate values are the cheapest readability win.**
3. **`solvent_close_outcome` and `underwater_close_outcome` are called *separately* in each branch — they're not unified into one routed call.** A unified call (`let outcome = if is_solvent { solvent_close_outcome(...) } else { underwater_close_outcome(...) }`) would force one of them to be called with a precondition violation in the *other* branch, triggering L10's `debug_assert!`. Keeping them in separate branches makes each call self-consistent with its precondition. **Separate the dispatch from the call; each callee gets its precondition met cleanly.**
4. **The local variable `outcome` is set inside the `if`/`else` and used after.** It's a `let outcome = if ... { ... } else { ... };` pattern. Rust's if-as-expression returns a value, so this is idiomatic. **`let x = if y { a } else { b };` is the Rust way of conditionally computing a value.**
5. **Both branches return a `CloseOutcomeKind` variant.** The two variants share a parent type; the `if`/`else` types out cleanly. **An `if`/`else` returning two variants of the same enum is the safest pattern for variant-routing.**

#### Phase 5a: Solvent branch (3 lines)

```rust
let solvent = solvent_close_outcome(snapshot, mark, &self.params);
self.fund.deposit(solvent.fee_to_fund);
report.fund_deposits = report.fund_deposits.saturating_add(solvent.fee_to_fund);
CloseOutcomeKind::Solvent(solvent)
```

Three things to notice:

1. **`fee_to_fund` is read three times: once into `deposit`, once into the aggregate, once as part of the moved `solvent` value into `CloseOutcomeKind::Solvent`.** Because `SolventClose` is `Copy`, this is free — no clones, no borrows. **`Copy`-derived types let you spread fields across multiple writes without ownership ceremony.**
2. **No conditional on `fee_to_fund == 0`.** Solvent closes always have positive `fee_to_fund` (per L10's contract — the precondition was `equity >= fee`, and fee is positive). If we wrote `if solvent.fee_to_fund > 0 { ... }` here, we'd be checking a condition that's guaranteed false-or-impossible. **Don't defend against conditions the type contract has already ruled out.**
3. **No call to `withdraw_shortfall`.** Solvent closes credit the fund and pay residual back to the trader; the fund is *never* drawn from. The bridge does the trader-balance crediting (using `solvent.residual_to_account`) — that's outside the scanner's scope. **The scanner only mutates the fund; the bridge handles trader balances.**

#### Phase 5b: Underwater branch (8 lines)

```rust
let underwater = underwater_close_outcome(snapshot, mark, &self.params);
if underwater.fee_to_fund > 0 {
    self.fund.deposit(underwater.fee_to_fund);
    report.fund_deposits = report
        .fund_deposits
        .saturating_add(underwater.fee_to_fund);
}
let withdraw = self.fund.withdraw_shortfall(underwater.shortfall_to_fund);
let (paid, unfilled) = match withdraw {
    WithdrawOutcome::Covered { amount } => (amount, 0),
    WithdrawOutcome::PartiallyDrained { amount, unfilled } => (amount, unfilled),
    WithdrawOutcome::Depleted { unfilled } => (0, unfilled),
};
report.fund_withdrawals = report.fund_withdrawals.saturating_add(paid);
report.unfilled_deficit = report.unfilled_deficit.saturating_add(unfilled);
CloseOutcomeKind::Underwater(underwater)
```

Six things to notice:

1. **The `if underwater.fee_to_fund > 0` guard exists** because L10's `underwater_close_outcome` *can* return `fee_to_fund == 0` (the "already underwater pre-fee" sub-case). `deposit(0)` is a no-op per L8, but the guard saves the `saturating_add` and the function-call overhead. **Predicates that gate "do nothing" actions are cheap correctness.**
2. **The pattern-match on `WithdrawOutcome` destructures into `(paid, unfilled)`.** All three variants collapse to one tuple shape:

   - `WithdrawOutcome::Covered { amount }` → `(amount, 0)` — fund paid out the full requested shortfall; nothing escalates.
   - `WithdrawOutcome::PartiallyDrained { amount, unfilled }` → `(amount, unfilled)` — fund paid out everything it had; the remainder is recorded as protocol-level unfilled deficit.
   - `WithdrawOutcome::Depleted { unfilled }` → `(0, unfilled)` — fund was already empty; nothing paid out, full shortfall escalates.

   The conservation law `amount + unfilled = requested_shortfall` holds in all three rows (L9's proptest proved it). L13 will lift that law from the per-call level to the per-scan level via `report_unfilled_equals_sum_of_unfilled_shortfalls`. **The tuple is the *normalized form* of L9's variant payloads — three different shapes collapse to one `(i64, i64)`, and conservation carries forward.**
3. **The match arms use *or-pattern destructuring* indirectly.** Strictly speaking they're three separate arms, but each arm computes the same tuple shape `(paid, unfilled)`. The visual symmetry makes the code easy to scan. **Pattern-match arms that compute a uniform output type are visually parallel — make them line up.**
4. **The `paid` and `unfilled` are immediately consumed by `saturating_add` on the report.** Both per-variant aggregations happen in two lines. The match → tuple → aggregate cascade is the standard "enum-to-scalar" pattern across the crate. **L9's `WithdrawOutcome` returns *information*; the scanner converts it to *numbers*.**
5. **`saturating_add` on both `fund_withdrawals` and `unfilled_deficit`.** Even though both running totals are bounded by realistic protocol scale (~$10^15 max), saturation is the consistent discipline. **Saturating arithmetic everywhere costs nothing and consistently respects the determinism contract.**
6. **The final line — `CloseOutcomeKind::Underwater(underwater)` — moves `underwater` into the enum.** This is the only place `underwater` is consumed after its fields are read; `UnderwaterClose` is `Copy`, so the move is just a value-copy. **`Copy` types let "read fields, then move into enum" feel like a free operation.**

#### Phase 6: Push the record (lines 26-30)

```rust
report.records.push(LiquidationRecord {
    account: snapshot.account,
    close_order,
    classification,
    outcome,
});
```

The struct-construction is direct: four fields, each a local already in scope. **At the end of every iteration, one push.** That's the only allocation `scan` does per-record (the `Vec` may grow, but the push itself is a tail allocation). **Per-iteration allocation is bounded by record count; no scratch allocations.**

> 🛑 **Anti-fluency.** "Why is the for-loop using indexes or `iter()`? Wouldn't `iter().filter_map(...).collect()` be more idiomatic?" Two problems. (1) `filter_map` over a closure that mutates `self.fund` borrows `self` exclusively for the entire iterator chain, which collides with the closure capture. Rust's borrow checker rejects this without major refactoring (interior mutability or splitting the fund out). (2) Even if it compiled, the iterator chain hides the per-iteration side effects (deposit, withdraw, aggregate-add) inside a `map` closure — readers can't easily see "this iteration mutated the fund." **For loops with `&mut self` capture beat iterator chains when the body mutates the enclosing self.**

### Step 2: Add the test module scaffolding

Append the test module at the bottom of `scanner.rs`. The scaffolding has three parts: imports, helpers, and the first section divider.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use openhl_funding::{Notional, PositionSize};
    use proptest::prelude::*;

    fn snapshot(account: u64, size: i64, entry: u64, collateral: i64) -> AccountSnapshot {
        AccountSnapshot {
            account: AccountId(account),
            position_size: PositionSize(size),
            avg_entry: MarkPrice(entry),
            collateral: Notional(collateral),
        }
    }

    fn default_params() -> LiquidationParams {
        LiquidationParams::hyperliquid_default()
    }

    // ─── empty / non-liquidatable input ────────────────────────────
```

Three things to notice:

1. **`use proptest::prelude::*;` is imported even though L12 has no proptests.** Staged for L13. Same staging discipline as L11's `account_equity` import. **Tests in this course are written *forward-compatibly* — L12's `use` block is L13's `use` block.**
2. **The `snapshot` helper packages 4 fields into the full `AccountSnapshot` struct.** Mirroring L4's `compute::tests::snapshot` helper (same name, same return type). This keeps every test's first line readable: `let s = snapshot(1, 1, 100_000, 50_000);` reads as "account 1, long 1 BTC, entry $100k, $50k collateral." **Test helpers that hide irrelevant construction noise are worth their weight; here, the alternative would be 8 lines per test.**
3. **The section divider `// ─── empty / non-liquidatable input ───` matches the style we established in L8/L9.** The Liquidation course's test files use box-drawing dividers consistently. **Consistent test-file structure across modules is a small but compounding readability win.**

### Step 3: Add the 4 simple unit tests

Inside the test module, append:

```rust
    #[test]
    fn scan_empty_accounts_returns_empty_report() {
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&[], MarkPrice(100));
        assert!(report.records.is_empty());
        assert_eq!(report.fund_deposits, 0);
        assert_eq!(report.fund_withdrawals, 0);
        assert_eq!(report.unfilled_deficit, 0);
    }

    #[test]
    fn scan_all_safe_accounts_does_nothing() {
        // Long 1 @ $100k, $50k collateral, mark $100k → 50% ratio = Safe.
        let accts = vec![
            snapshot(1, 1, 100_000, 50_000),
            snapshot(2, 1, 100_000, 50_000),
        ];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(100_000));
        assert!(report.records.is_empty());
    }

    #[test]
    fn scan_atrisk_does_not_liquidate() {
        // Long 1 @ $100k, $5k collateral, mark $100k → 5% ratio
        // 5% > 2% maintenance, < 10% initial → AtRisk; no liquidation.
        let accts = vec![snapshot(1, 1, 100_000, 5_000)];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(100_000));
        assert!(report.records.is_empty());
    }

    #[test]
    fn scan_skips_flat_positions() {
        // Flat (size 0) accounts misclassified somewhere upstream get
        // silently skipped. Default ratio for flat positions is MAX
        // (Safe), so this is also defensive against future
        // classification changes.
        let accts = vec![snapshot(1, 0, 100_000, 1_000)];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(100_000));
        assert!(report.records.is_empty());
    }
```

Eight things to notice about the test design:

1. **`scan_empty_accounts_returns_empty_report` asserts *all four* `ScanReport` fields.** Records empty, three aggregates at 0. The four assertions catch a future bug where the `ScanReport::default()` initialization stops being all-zero — a regression even smaller than a logic bug. **Default-state tests assert every field of the default.**
2. **`scan_all_safe_accounts_does_nothing` uses *two* accounts, not one.** Why two? Because one-account tests can mask a "loop ran for the first iteration but skipped the second" bug. Two accounts force the loop to iterate twice, both times producing nothing. **Multi-account skip tests beat single-account skip tests at catching loop-control bugs.**
3. **The arithmetic comments in `scan_all_safe_accounts_does_nothing` document the expected classification.** "50% ratio = Safe" lets a reader follow the L1–L6 logic mentally without re-deriving it. **Test comments that name the classification path are how curriculum reinforcement happens here.**
4. **`scan_atrisk_does_not_liquidate` is the *most pedagogically important* of the four.** It establishes that `AtRisk` is a *warning state*, not a *trigger state*. If a future maintainer "promotes" AtRisk to trigger liquidation (by adding it to the match arm), this test fails immediately. **Tests for stable architectural boundaries are how the course's design choices survive refactoring.**
5. **The 5% boundary in `scan_atrisk_does_not_liquidate` is *deliberately* close to the maintenance margin (2%) and the initial margin (10%).** A value at 1% (< maintenance) would be Liquidatable; a value at 15% (> initial) would be Safe; 5% is the *middle* — both sides of the AtRisk boundary feel testable from here. **Boundary tests pick values that exercise the *interior* of the classification, not just the edges.**
6. **`scan_skips_flat_positions` uses `snapshot(1, 0, 100_000, 1_000)`.** Notice `size = 0` — the flat case. Even though L6's `margin_ratio` returns MAX for flat positions (which would classify as Safe and skip via the Phase-1 `continue`), the test exercises the Phase-2 defensive guard *in case* an upstream change promotes flats to Liquidatable. **Defense-in-depth tests verify the second layer of protection independent of the first.**
7. **All four tests use `LiquidationScanner::with_empty_fund(default_params())`.** No starting fund balance, default Hyperliquid params. Consistency lets the reader scan all four tests and absorb only the *differences* (accounts, mark). **Per-test isolation lets you read the diff between tests at a glance.**
8. **The test names form a 4-step narrative:** empty → all-Safe → all-AtRisk → flat. The reader learning "what scan skips" walks through them in order and builds a complete mental model. **Test ordering can encode pedagogical progression.**

### Step 4: Run the tests

```bash
cargo test -p openhl-liquidation
```

Expected output (abbreviated):

```
running 59 tests
test compute::tests::close_flat_has_zero_qty ... ok
... (33 more compute tests from L0–L10)
test insurance::tests::balance_never_negative ... ok
... (20 more insurance tests from L8–L9)
test scanner::tests::scan_all_safe_accounts_does_nothing ... ok
test scanner::tests::scan_atrisk_does_not_liquidate ... ok
test scanner::tests::scan_empty_accounts_returns_empty_report ... ok
test scanner::tests::scan_skips_flat_positions ... ok

test result: ok. 59 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**59 tests passing. The scanner is *runnable*.** L13 stress-tests it with 5 nuanced unit tests (solvent fee deposit, underwater fully/partially/depleted, mixed batch, FIFO fairness) plus 4 proptests (conservation laws across scans). After L13, 68 tests total.

Common errors:

- **Compile error: `cannot find function \`account_equity\` in this scope`** — the L11 imports staged six compute functions; if you forgot one (or removed an unused-import warning by deleting an import you actually need), `scan` won't compile. Re-add the missing function from the `use crate::compute::{...}` line at the top of `scanner.rs`.
- **Test fail: `assertion failed: report.records.is_empty()` on `scan_all_safe_accounts_does_nothing`** — your `margin_health` is misclassifying 50% ratio. L6 said 50% > 10% initial = Safe; if your `match` arm reads `MarginHealth::Safe | MarginHealth::Liquidatable` (typo), then Safe gets liquidated. Re-read the `match`'s arm 1.
- **Test fail: `report.fund_deposits != 0` on `scan_empty_accounts_returns_empty_report`** — your `ScanReport::default()` is mis-derived. The `derive(Default)` on `ScanReport` is what makes this test green; if you `impl Default` manually with non-zero defaults, you break the contract.
- **Compile error: `the trait bound \`SomeType: Copy\` is not satisfied`** — somewhere in the `outcome = if ... { ... }` branches you have a type that the compiler thinks is non-`Copy`. Check that `SolventClose` and `UnderwaterClose` both have `#[derive(Clone, Copy, Debug, PartialEq, Eq)]` (they do, from L10) — if they don't, the `if`/`else` returning these variants needs them.

## Design reflection

Three load-bearing decisions in this lesson:

1. **The `scan` method is a *thin orchestrator*, not a *fat coordinator*.** Every line in `scan` either calls a Stage 10a/10b primitive or applies a `saturating_add` to a `ScanReport` field. No new math, no new policy, no new data shape. **Orchestration layers should call primitives, not duplicate them.**

2. **Exhaustive `match` beats predicate-with-`!`.** The `MarginHealth` `match` in Phase 1 is the discipline that catches future enum-variant additions. If we wrote `if !matches!(c, Liquidatable | Underwater) { continue; }`, adding a fifth variant tomorrow would silently classify it as a skip. **Exhaustive `match` is how an enum and its consumers stay in sync across refactors.**

3. **The `WithdrawOutcome → (paid, unfilled)` tuple destructuring is the *only* place L9's enum needs more than one line of orchestration handling.** Three variants collapse to one `(i64, i64)` because the aggregation contract is uniform. **L9's `WithdrawOutcome` returns information; the scanner converts it to numbers.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
```

After L12:
- **scanner.rs** matches Stage 10c's `scanner.rs` **through the test module's `scan_skips_flat_positions` test**. Specifically: doc + imports + `CloseOutcomeKind` + `LiquidationRecord` + `ScanReport` + `LiquidationScanner` struct + 5 accessors + `scan` method + test module scaffolding + 4 simple unit tests. The 5 nuanced unit tests and 4 proptests land in L13.

## Common questions

**Q1: Why does `scan` take `&[AccountSnapshot]` instead of `&mut [AccountSnapshot]`? The scanner doesn't need to write to the snapshots.**

The scanner *doesn't* need to write to snapshots — exactly. `&[T]` (immutable slice) signals "I read-only consume this slice." `&mut [T]` (mutable slice) would imply the scanner *could* mutate the snapshots, which it shouldn't and doesn't. **Choose the borrow that matches the function's needs, not the caller's convenience.** The caller (bridge) can pass `&accounts[..]` even if it owns `accounts` mutably elsewhere.

**Q2: Why does `scan` take `MarkPrice` by value but `&self.params` by reference inside?**

`MarkPrice` is a 1-field `Copy` struct — passing by value is free. `LiquidationParams` is a 3-field `Copy` struct that the scanner already owns, so passing `&self.params` to the called functions avoids a struct-copy. Both choices are about cost-of-copy: tiny `Copy` types go by value, larger `Copy` types go by reference. **Pass `Copy` types by value when they're tiny; by reference when they're bigger.**

**Q3: Could the `for snapshot in accounts` loop be replaced with `accounts.iter().enumerate().for_each(|(i, snap)| ...)` to track the iteration index?**

Yes, but the index isn't needed — `LiquidationRecord` carries `account: AccountId` from the snapshot, which is the *durable* identifier. The iteration index would be a synthetic ID (positional in the slice) that means nothing to downstream consumers. **Identifiers should be domain-meaningful, not iteration-positional.**

**Q4: Why doesn't `scan` early-return after the loop body if the scanner reaches a "fund fully depleted" state?**

Because the L11 design contract says aggregate fields capture *everything* that happens during the scan, including post-depletion underwater closes. An early return would cut off the audit trail; a Liquidatable account in iteration position 50 would never produce a `LiquidationRecord`, and the bridge would miss it. **Scan completes the batch even if the fund's been emptied; the aggregate `unfilled_deficit` is the bridge's signal that more aggressive policy (ADL) is needed.**

**Q5: What if two snapshots in the slice have the same `AccountId`?**

The scanner processes them in iteration order. The first one's `LiquidationRecord` and fund-mutations land first; the second's land second. There's no deduplication. This is *by design* — the scanner trusts the bridge to deliver a deterministic, deduplicated slice. Duplicate-account behavior would be a bridge bug, not a scanner bug. **Trust the caller for invariants the caller controls.**

**Q6: The body uses `report.fund_deposits = report.fund_deposits.saturating_add(...)`. Could this be `report.fund_deposits += ...` instead?**

The `+=` operator's behavior changes between build profiles: **panics on overflow in debug, silently *wraps* (two's-complement modular arithmetic) in release**. The release-build wrap is the actual consensus danger — it doesn't crash, so an overflowing add on one validator quietly produces a different `i64` than the others. The result is a state disagreement → a chain fork. The debug panic is the easy failure mode; the silent release wrap is the *deceptive* one. `saturating_add` clamps to `i64::MAX` (or `i64::MIN`) under every build profile, so every validator sees the same value regardless of which compiler flags they used. **`+=` is fine for non-consensus arithmetic; `saturating_add` is the standard for state that validators must agree on byte-for-byte.**

## Next lesson (L13) — Module 4 capstone: 5 nuanced unit tests + 4 proptests

L13 closes Module 4 — and Stage 10c — and Module 10 of openhl entirely. The 5 nuanced unit tests cover:
- `scan_liquidatable_solvent_deposits_fee` — happy path: trader's collateral covers everything.
- `scan_underwater_fully_covered_drains_fund_partially` — fund drains but covers.
- `scan_underwater_partial_drain_surfaces_unfilled` — fund partially drains; some shortfall escalates.
- `scan_underwater_depleted_fund_escalates_full_shortfall` — fund already empty.
- `scan_first_underwater_gets_paid_then_second_unfilled` — FIFO fairness with multiple underwater accounts.

Plus a `scan_mixed_batch_processes_only_unhealthy` to verify the loop handles heterogeneous batches.

The 4 proptests verify conservation laws across scans:
- `fund_balance_never_negative_across_scans` — the L8 invariant extends to multi-account scans.
- `report_unfilled_equals_sum_of_unfilled_shortfalls` — `unfilled_deficit` is consistent with per-account unfilled amounts.
- `fund_deposits_minus_withdrawals_equals_balance_change` — fund accounting closes.
- `scan_preserves_account_order_in_records` — determinism: records appear in input order.

After L13, the Liquidation crate is *complete* — 68 tests, byte-for-byte against `0a8464e`. The reader has built an entire pure-compute + state-machine + orchestration cascade in 13 lessons.

````

---

## Seed-file slot

L12 lands in Module 4 at sortOrder 1:

```typescript
{
  title: 'Lesson 12 — scan — the orchestration heart of the safety cascade',
  slug: 'openhl-liquidation-scan-method-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 35,
  xpReward: 70,
  content: `# Lesson 12 — scan — the orchestration heart of the safety cascade\n\n...`
},
```

## SHA pinning discipline

L12 stays on `0a8464e` (Stage 10c). After L12, `scanner.rs` matches the answer key through the `scan_skips_flat_positions` test. L13 stays on `0a8464e` and adds the remaining tests + proptests to close the crate byte-for-byte.

## Style review notes (self-critique before paste)

- **L12 is the second-longest lesson in Module 4** (35 min). Justified because the `scan` body is the *only verb* in the orchestration layer, and walking through it phase-by-phase (6 phases) is the way to make the reader internalize how the cascade composes.
- **Phase-by-phase walk-through structure (Phase 1 through Phase 6)** is new to this lesson. Previous lessons used "Step 1 through Step N" for *edits* the reader makes. This one uses "Phase 1 through Phase 6" for *parts of one method* — same numbering pattern, different unit. The phase structure mirrors the body's natural decomposition: classify → flat-skip → close-order → routing → solvent/underwater work → record-push. The reader who completes L12 can recite the 6 phases from memory.
- **The "anti-fluency" callout addresses the `iter()` vs `for` debate** explicitly. Rust idiom for stateful iteration is `for`; the chained-iterator approach is tempting but fails on borrow-checker grounds. Documenting this preempts the "shouldn't this be a fold?" reviewer comment.
- **Test pedagogy is heavier than usual.** Eight "things to notice" on the 4-test set (vs 5-6 on earlier lessons) because the tests *are* the verification — the reader runs them, sees them pass, and knows the scanner works. The "things to notice" list earns its keep by extracting maximum signal from 4 simple tests.
- **The next-lesson preview names L13's tests + proptests by their actual identifiers.** Honest scoping: the reader knows exactly what's coming. L13 will be the longest single lesson in the course (40 min) because Module 4's capstone is also the Liquidation course's capstone *and* Module 10 of openhl's capstone.
