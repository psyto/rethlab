# Building OpenHL Liquidation — L8 draft (EN) — build-along

> openhl SHA `260883b` (Stage 10b — insurance fund state machine + close-outcome decomposition).

## L8 — `openhl-liquidation-insurance-fund-intro-en`

**Stage**: Stage 10b — `260883b`

**Title**: Lesson 8 — `InsuranceFund` — where the crate stops being pure

**Duration**: 25 min · **XP**: 50

---

````markdown
# Lesson 8 — `InsuranceFund` — where the crate stops being pure

## Goal

Concepts you'll grasp in this lesson:

- **The pure → stateful boundary.** Stage 10a's `compute.rs` is pure: every function is a deterministic projection of its arguments. Stage 10b introduces the first state in the liquidation crate — the insurance fund's accumulating balance — because the fund is genuinely a fact about *history*, not a fact about a single snapshot. **State appears in code only when the value can't be re-derived from its inputs.**
- **The `balance ≥ 0` type invariant.** Every public operation on `InsuranceFund` preserves it. The field type is `i64` (for arithmetic uniformity with the rest of the crate), but **the invariant is enforced in code, not in the type system**. `new(-500)` clamps to 0; `deposit(-50)` is a no-op; `withdraw_shortfall(...)` saturates at 0 with the unfilled portion surfaced via `WithdrawOutcome` (L9). The discipline: **make every public method a transition that preserves the invariant.**
- **Defensive boundaries vs. defensive functions.** The `compute` module trusts its inputs; the `insurance` module doesn't. Why the difference? `compute` is a pure projection — its caller already constructed a valid `AccountSnapshot`. `InsuranceFund` is *the boundary* — bridges, scanners, and (later) ADL routines all call it from different layers, and any of them can be buggy. **Defensive coding earns its keep at boundaries that aggregate many callers.**
- **Saturating arithmetic in consensus state.** `deposit` uses `saturating_add` instead of `+`. The reason isn't just "to avoid panics in dev." Rust's `+` operator has *two* failure modes across build profiles: **debug builds panic on overflow** (one validator crashes, others continue → fork), and **release builds silently wrap** in two's-complement (every validator produces a *different* `i64` from its peers → fork). The release wrap is the deceptive one — no crash, no error, just disagreement. `saturating_add` clamps to `i64::MAX` (or `MIN`) under every build profile, so every validator sees the same value regardless of which compiler flags they used. **Saturation is the consensus-safe arithmetic discipline.**

Verification:

```bash
cargo test -p openhl-liquidation
```

…passes 33 tests (24 from L0–L7 + 9 new tests for construction + deposit). The 22 additional withdrawal / proptest cases land in L9.

Specific changes:

- **`src/insurance.rs`** — new module file. Adds `InsuranceFund` struct, three constructors (`new` / `empty` / `Default::default`), `balance()` accessor, `deposit()` mutator, and 9 unit tests.
- **`src/lib.rs`** — adds `pub mod insurance;` and re-exports `InsuranceFund`.

L8 lands roughly half of `insurance.rs`. The withdraw path — including the `WithdrawOutcome` enum — is the L9 capstone of the insurance-fund module.

## Recap

After L7:
- `compute.rs` is complete for Stage 10a: 6 functions (`notional_value`, `unrealized_pnl`, `account_equity`, `margin_ratio`, `margin_health`, `close_order_spec`) plus the `saturate_i128_to_i64` helper.
- `lib.rs` re-exports all 6 compute functions and the Stage 10a types.
- `cargo test` runs 24 tests, all green.
- The crate is **purely functional**: no `&mut self`, no module-level state, every function returns a value derived from its arguments alone.

L8 starts Stage 10b. The first thing that changes is that the crate is no longer purely functional.

## Plan

Three edits:

1. **Create `crates/liquidation/src/insurance.rs`** — a new module file with the `InsuranceFund` struct, two constructors, the `balance()` accessor, the `deposit()` mutator, the `WithdrawOutcome` enum scaffold (used in L9), and 9 unit tests covering construction + deposit.
2. **Add `pub mod insurance;`** and the re-exports to `crates/liquidation/src/lib.rs`.
3. **Update `lib.rs`'s top-of-file roadmap** to mark Stage 10b in progress.

> 🛑 **Predict.** Before reading further: in a state machine with a single non-negative balance field, what's the smallest defensive surface that preserves `balance ≥ 0` across an open set of callers? Specifically: **`new(initial: i64)`, `deposit(fee: i64)`, `withdraw(amount: i64)`** — at which of these three call sites do you need to defend, and against what bad input shape?

(Answer: **All three.** `new` defends against a negative initial — clamp to 0. `deposit` defends against a negative fee — treat as no-op (a negative fee would silently drain the fund). `withdraw` defends against (a) a negative shortfall — treat as a 0-amount Covered, (b) an amount exceeding the balance — drain to 0 and surface the unfilled portion. Each defense exists because the public API is callable from many layers and **any single bad call must not violate the type invariant**. L8 covers `new` + `deposit`; L9 covers `withdraw`.)

The architectural picture of why state appears here:

```
   ┌────────────────────────────────────────────────────────────────┐
   │ Stage 10a — pure compute (compute.rs)                          │
   │                                                                │
   │  margin_health(snapshot, mark, params) → MarginHealth          │
   │  margin_ratio(snapshot, mark)          → MarginRatio           │
   │  close_order_spec(snapshot)            → CloseOrderSpec        │
   │                                                                │
   │  Every result is a projection of inputs. Re-evaluable forever. │
   └────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
   ┌────────────────────────────────────────────────────────────────┐
   │ Stage 10b — state machine (insurance.rs)                       │
   │                                                                │
   │  InsuranceFund { balance: i64 }   ← the fund accumulates       │
   │      .deposit(fee)                ← fees CREDIT the fund        │
   │      .withdraw_shortfall(amount)  ← deficits DEBIT the fund     │
   │      .balance()                   ← current accumulated value  │
   │                                                                │
   │  Balance is a fact about *history*, not a fact about an input. │
   │  Two different sequences of (deposit, withdraw) calls produce  │
   │  two different balances — even if the *final* call's arguments │
   │  are identical.                                                │
   └────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
   ┌────────────────────────────────────────────────────────────────┐
   │ Stage 10c — scanner (scanner.rs, L11–L12)                      │
   │                                                                │
   │  Owns an InsuranceFund; calls .deposit / .withdraw_shortfall   │
   │  per liquidation event; threads outcomes back into ScanReport. │
   └────────────────────────────────────────────────────────────────┘
```

The point: **pure compute returns; stateful modules accumulate.** Stage 10a told the engine *what* the world looks like for each account. Stage 10b lets the engine remember *what happened* across accounts and across blocks. The scanner (L11–L12) is the layer that orchestrates the two.

## Walk-through

### Step 1: Create `src/insurance.rs`

Create a new file `crates/liquidation/src/insurance.rs`. The whole-module doc comment comes first; it's the single most-read piece of prose in the module because every doc generator and every `cargo doc` reader sees it before any function.

```rust
//! Insurance fund state machine (Stage 10b).
//!
//! The insurance fund is the venue's pooled buffer that absorbs the
//! deficit when a Liquidatable account's close turns underwater, or when
//! an Underwater account is liquidated outright. It accumulates the
//! liquidation fees that solvent closes pay in. Stage 10c's scanner will
//! own an [`InsuranceFund`] and call its deposit / withdraw operations
//! from the per-account liquidation loop.
//!
//! ### Why stateful here when the rest of the crate is pure
//!
//! Margin classification, fee math, and close-outcome computation
//! ([`crate::compute`]) are pure functions over per-account snapshots —
//! they can be re-evaluated lossless at any time. The insurance fund's
//! balance, in contrast, accumulates effects from many liquidation events
//! across many blocks; it is genuinely state. The shape mirrors
//! `openhl_funding::clock` — a small state machine, owned by the bridge,
//! mutated only on well-defined boundary events.
//!
//! ### Sign discipline
//!
//! The balance is `i64` internally for arithmetic uniformity with
//! [`crate::compute`], but the type invariant is **`balance ≥ 0`** —
//! every public operation preserves it. Withdrawals that exceed the
//! balance saturate at 0 and surface the unfilled portion via
//! [`WithdrawOutcome`]. Stage 10c's scanner reads the unfilled portion
//! as the trigger to escalate to ADL (Stage 10d).
//!
//! ### Deposit semantics
//!
//! `deposit` accepts a non-negative fee amount. Negative deposits are
//! treated as zero (saturating semantics, no panic) — defensive coding
//! against accidental misuse from the caller. Saturating-add caps at
//! `i64::MAX` for network-pathological accumulated balances.
```

Four things to notice about this preamble:

1. **It opens with the *role*, not the *type*.** "The insurance fund is the venue's pooled buffer that absorbs the deficit…" — a reader who skims only the first sentence already knows where this module fits in the safety-net cascade. **Module docs are read by people deciding whether to keep reading. Lead with the role.**
2. **It cites Stage 10c and Stage 10d by name.** Even though those stages don't exist yet in the reader's checkout, the doc anticipates them so the reader knows the module is part of a planned arc — not a one-off addition. **Forward references in docs are a contract with the future: "this is going somewhere."**
3. **The sign-discipline section is *not* about Rust's type system.** It's about a invariant the type *doesn't* enforce. **Document invariants that the compiler can't check; the compiler already documents the ones it can.**
4. **"openhl_funding::clock"** is a cross-module cite to a *pattern* the reader has already seen — small state machine, owned by the bridge, mutated only on boundary events. Anchoring a new module to a familiar one shortens the learning curve. **When introducing a new pattern, point at a previous instance of the same pattern in the codebase.**

### Step 2: Add the `InsuranceFund` struct and its constructors

Below the doc comment, add the struct definition and its three constructors:

```rust
/// The insurance fund's accumulating balance.
///
/// Owned by the bridge (Stage 10c+), exposed via deposit / withdraw
/// operations that maintain the `balance ≥ 0` invariant.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InsuranceFund {
    balance: i64,
}
```

Two things to notice about the struct shape:

1. **The field is private (`balance: i64`, no `pub`).** That's the entire enforcement mechanism for the `balance ≥ 0` invariant. If `balance` were public, any caller could write `fund.balance = -1` and silently violate the contract. **Private fields are how Rust expresses "this invariant exists, and you must go through my public methods to change it."**
2. **`Clone + Copy + Debug + PartialEq + Eq`** — every trait that the compiler can derive for a single-`i64` struct, derived. Cheap to pass by value, easy to assert in tests, comparable in proptests. **For pure-value types, derive the standard four (or five, with `Hash`) eagerly.**

Now the constructors:

```rust
impl InsuranceFund {
    /// Create a fund with the given initial balance.
    ///
    /// Negative initial balances are clamped to zero — defensive against
    /// accidental misuse. A negative initial balance can't represent any
    /// physical state of the fund and would violate the type invariant.
    #[must_use]
    pub const fn new(initial_balance: i64) -> Self {
        Self {
            balance: if initial_balance > 0 {
                initial_balance
            } else {
                0
            },
        }
    }

    /// An empty fund; equivalent to [`InsuranceFund::new(0)`].
    #[must_use]
    pub const fn empty() -> Self {
        Self { balance: 0 }
    }

    /// Current balance of the fund. Always `≥ 0`.
    #[must_use]
    pub const fn balance(&self) -> i64 {
        self.balance
    }
}

impl Default for InsuranceFund {
    fn default() -> Self {
        Self::empty()
    }
}
```

Five things to notice:

1. **`new` clamps negatives to 0 silently.** No `Result<Self, ...>`, no panic. Why? Because the *physical* meaning of a negative initial balance is undefined — a fund that owes money isn't a fund. **When the only sensible interpretation of a bad input is "make it the nearest valid input," do that without ceremony.** A `Result` here would force every caller to handle an error that should never happen in practice; a panic would create a debug-vs-release behaviour split. Clamping is the cheapest correct answer.
2. **`empty()` exists despite `new(0)` doing the same thing.** Two reasons. First, `InsuranceFund::empty()` reads more clearly at call sites than `InsuranceFund::new(0)` — intent over numerics. Second, `empty` is also what `Default::default()` calls, so the two names point at the same construction site. **A named constructor for the canonical zero value is a small clarity win that pays compounding interest.**
3. **`const fn` on every method that touches the field.** The struct has one `i64` field; everything that doesn't mutate the underlying state is trivially const-evaluable. This lets future code use `InsuranceFund` in const contexts (e.g., as a default in a config struct), and signals to readers that these operations are pure. **`const fn` is documentation as much as it is capability — it says "this method does nothing fancy."**
4. **`#[must_use]` on `new` and `empty`.** Constructing a fund and throwing it away is almost always a bug — usually a leftover from a refactor. `#[must_use]` makes the compiler complain about it. **Marker attributes catch the "obviously wrong, easily missed" cases.**
5. **`Default::default()` is implemented manually**, not derived. The derived `Default` for a struct with `balance: i64` would produce `balance: 0` — same result. But pointing the manual impl at `Self::empty()` makes the *intent* explicit: "the default fund is the empty fund, by design, not by coincidence." **Manual `Default` impls are valuable when the default value has semantic meaning beyond zero-initialization.**

> 🛑 **Anti-fluency.** "Why not `pub fn new(initial_balance: u64) -> Self` — `u64` makes the invariant impossible to violate, no?" Three problems. (1) The rest of the crate uses `i64` for fungible amounts (`pnl`, `equity`, `collateral`); changing the type at a single boundary forces a cast at every call site. (2) Validators that compute fees with i64 arithmetic would need a checked `u64::try_from` everywhere — adding panics where saturation suffices. (3) The *invariant* `balance ≥ 0` is enforced by code anyway, so the type-level safety is gilt on a lily. **Match the surrounding type discipline; defend the invariant in code where the rest of the crate already does the same.**

### Step 3: Add the `WithdrawOutcome` enum scaffold

Even though L8 doesn't implement `withdraw_shortfall`, we declare `WithdrawOutcome` now so the L9 changes are purely additive in `impl InsuranceFund` (no enum-introduction churn). Add this **above the `impl InsuranceFund` block**:

```rust
/// Outcome of attempting to absorb a shortfall via
/// [`InsuranceFund::withdraw_shortfall`].
///
/// The three variants are exactly the three transitions across the
/// "Layer 2 → Layer 3" boundary in the safety-net cascade:
///   - [`WithdrawOutcome::Covered`] — the fund had enough; Layer 2
///     fully absorbed the deficit.
///   - [`WithdrawOutcome::PartiallyDrained`] — the fund drained to
///     zero and covered part of the shortfall; the remainder must
///     escalate to Layer 3 (ADL).
///   - [`WithdrawOutcome::Depleted`] — the fund was already empty
///     before the call; nothing covered, full shortfall escalates.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WithdrawOutcome {
    /// Fund had enough balance to cover the request in full.
    Covered {
        /// Amount paid out of the fund (= requested shortfall).
        amount: i64,
    },
    /// Fund partially covered the shortfall before draining to zero.
    PartiallyDrained {
        /// Amount actually paid out (= fund's prior balance).
        amount: i64,
        /// Remaining shortfall that the caller must escalate to ADL.
        unfilled: i64,
    },
    /// Fund was already empty; nothing was paid out.
    Depleted {
        /// Full shortfall that must escalate to ADL.
        unfilled: i64,
    },
}
```

This enum is **declared now and used in L9**. L8 introduces it because:

1. **The enum's existence is part of the public surface story.** A reader who skims `insurance.rs` after L8 should see the full type vocabulary of the module, even if some methods are deferred. **Vocabulary before mechanism.**
2. **Each variant carries its own payload.** `Covered` and `PartiallyDrained` both carry `amount` (what was actually paid out), and `PartiallyDrained` and `Depleted` both carry `unfilled` (what the scanner must escalate). The L9 proptest `withdraw_amount_plus_unfilled_equals_shortfall` is the conservation law that ties them together — but you can already see the shape of the law in the variant payloads. **Self-describing variants are documentation that the compiler enforces.**
3. **`Layer 2 → Layer 3 boundary`** in the doc comment names the cascade architecture explicitly: margin (Layer 1, Stage 10a) → fund (Layer 2, Stage 10b) → ADL (Layer 3, Stage 10d). The reader gets the map every time they look at this enum. **When a type sits at an architectural seam, say so in its doc.**

### Step 4: Add the `deposit` method

Append `deposit` to the existing `impl InsuranceFund` block:

```rust
    /// Credit the fund with a fee. Returns the new balance.
    ///
    /// Negative inputs are treated as a no-op (defensive against the
    /// caller passing a signed value where the contract expects a credit).
    /// Saturates at `i64::MAX` for network-pathological accumulated
    /// balances.
    pub fn deposit(&mut self, fee: i64) -> i64 {
        if fee > 0 {
            self.balance = self.balance.saturating_add(fee);
        }
        self.balance
    }
```

Five things to notice:

1. **`fee > 0` (strict).** A fee of `0` is also a no-op, so `>` and `>=` produce identical behaviour for zero. The strict form makes the branch fire only when there's actual work to do. **For predicates that gate side effects, prefer `> 0` (the "is this meaningful?" test) over `>= 0` (the "is this non-negative?" test) when zero is a no-op.**
2. **Negative inputs are silently ignored, not panicked or errored on.** Why? Because the alternative is consensus disaster. A panic-on-negative would halt one validator while others continue if a single bridge bug ever pushed a negative fee — and Rust's panic semantics are particularly cruel here (debug vs release, hook differences, etc.). A `Result<i64, ...>` would force every caller in the scanner to either `unwrap` (panic-by-other-name) or thread an error type through code that has no good error path. **Saturating-no-op semantics give consensus determinism for free.**
3. **`saturating_add`, not `+`.** Two failure modes if you use `+`: in debug, `100i64 + i64::MAX` panics with overflow (one validator halts, others continue → fork); in release, it silently wraps to a negative value — *which violates the `balance ≥ 0` invariant AND produces a different `i64` than every peer that handled the same operation differently → fork*. `saturating_add` caps at `i64::MAX` under every build profile, so every validator sees the same number. The network can never accumulate more than `9.2 × 10^18` of fees anyway, and the cap is invisible in any non-pathological state. **`saturating_*` family is the consensus-safe arithmetic family.**
4. **Returns the new balance.** The caller often wants to log it ("fee credited: 150, fund balance now: 2_400_150") and a single chained call is cleaner than a two-step `let _ = f.deposit(150); let new_balance = f.balance();`. The method is `&mut self`-and-returns; that pattern shows up in Rust's standard library too (e.g., `HashMap::insert` returns the old value). **`&mut self` methods that return useful state save a follow-up `balance()` call.**
5. **The doc string says "non-negative fee amount" then handles negatives anyway.** This isn't a contradiction — it's defensive documentation. The doc says "this is what you should pass"; the implementation says "but if you pass garbage, we won't crash." **Doc the intended contract; implement the merciful failure mode.**

### Step 5: Wire the module into `lib.rs`

Open `crates/liquidation/src/lib.rs`. Make two changes:

First, add the module declaration. Find the existing `pub mod compute;` and `pub mod types;` block and insert `insurance` between them:

```rust
pub mod compute;
pub mod insurance;
pub mod types;
```

Second, add the `InsuranceFund` re-export. Find the existing `pub use compute::{ ... };` block and add an `insurance` re-export after it:

```rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
pub use insurance::{InsuranceFund, WithdrawOutcome};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
```

Both re-exports — the type and the enum — go on one line. Why both now? Because **users of the crate import what they call**, and the L9 path that calls `withdraw_shortfall` will pattern-match on `WithdrawOutcome` immediately. Re-exporting the enum at L8 means L9 needs no changes to `lib.rs`. **Re-export the public surface once per module, not per method.**

### Step 6: Add the 9 unit tests

Append the test module at the bottom of `insurance.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // ─── construction ──────────────────────────────────────────────

    #[test]
    fn new_with_positive_balance() {
        let f = InsuranceFund::new(1_000);
        assert_eq!(f.balance(), 1_000);
    }

    #[test]
    fn new_with_zero_is_empty() {
        let f = InsuranceFund::new(0);
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn new_with_negative_clamps_to_zero() {
        let f = InsuranceFund::new(-500);
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn empty_is_zero() {
        let f = InsuranceFund::empty();
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn default_is_empty() {
        let f = InsuranceFund::default();
        assert_eq!(f.balance(), 0);
    }

    // ─── deposit ───────────────────────────────────────────────────

    #[test]
    fn deposit_accumulates() {
        let mut f = InsuranceFund::empty();
        assert_eq!(f.deposit(100), 100);
        assert_eq!(f.deposit(250), 350);
        assert_eq!(f.balance(), 350);
    }

    #[test]
    fn deposit_zero_is_noop() {
        let mut f = InsuranceFund::new(100);
        assert_eq!(f.deposit(0), 100);
    }

    #[test]
    fn deposit_negative_is_noop() {
        // Defensive: negative deposits must not silently drain the fund.
        let mut f = InsuranceFund::new(100);
        assert_eq!(f.deposit(-50), 100);
        assert_eq!(f.balance(), 100);
    }

    #[test]
    fn deposit_saturates_at_max() {
        let mut f = InsuranceFund::new(i64::MAX - 10);
        assert_eq!(f.deposit(1_000), i64::MAX);
    }
}
```

Six things to notice about how this test module is shaped:

1. **`// ─── construction ───` section headers.** Box-drawing-character comments mark the four logical groups (construction · deposit · in L9: withdrawal-covered · withdrawal-partial · withdrawal-depleted · sequencing · proptests). The headers exist because the eventual module has ~22 tests; scanning the file by section name beats scrolling by line number. **In a test file with more than ~10 tests, group them.**
2. **`new_with_zero_is_empty` exists even though it's trivially derivable from the `new` source.** It's not redundant — it locks the behaviour in. A future refactor that accidentally added `if initial_balance >= 0` instead of `> 0` would still pass this test (because 0 falls through both predicates correctly), but a refactor that flipped to `if initial_balance < 0` *with* a typo would break exactly this case. **Boundary tests on small predicates catch typos that bigger tests miss.**
3. **`new_with_negative_clamps_to_zero` directly tests the defensive surface.** The test isn't there to verify the *function works*; it's there to verify the *invariant is preserved*. If a future refactor "fixed" the apparent dead code in `new` by removing the clamp, this test would catch it. **Tests for defensive code defend the defensive code.**
4. **`default_is_empty` is a one-liner that proves the `Default` impl points at `Self::empty()`** and didn't accidentally get derived (which would also produce `balance: 0`, but with different intent). **Tests can lock in *which path* produces a result, not just the result.**
5. **`deposit_negative_is_noop` has a `// Defensive` comment.** The comment names the failure mode the test guards against: "negative deposits must not silently drain the fund." A reader who removes the test will see the comment and reconsider. **Brief test-level comments are scaffolding for future maintainers who might think a test is unnecessary.**
6. **`deposit_saturates_at_max` uses `i64::MAX - 10`** as the initial balance. Why not `i64::MAX`? Because a deposit of any amount into a max-balance fund saturates at max — the test would also pass even if `saturating_add` were *replaced* by `wrapping_add`, since `i64::MAX + anything >= 0` wraps to a negative value, but `+1000` would wrap, and the test would catch it. Starting near max gives the test room to fire the saturation logic. **Boundary tests on saturating arithmetic need a buffer so the boundary actually fires.**

### Step 7: Run the tests

```bash
cargo test -p openhl-liquidation
```

Expected output:

```
running 33 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
test compute::tests::close_short_with_buy ... ok
test compute::tests::equity_can_go_negative ... ok
... (21 more Stage 10a tests)
test insurance::tests::default_is_empty ... ok
test insurance::tests::deposit_accumulates ... ok
test insurance::tests::deposit_negative_is_noop ... ok
test insurance::tests::deposit_saturates_at_max ... ok
test insurance::tests::deposit_zero_is_noop ... ok
test insurance::tests::empty_is_zero ... ok
test insurance::tests::new_with_negative_clamps_to_zero ... ok
test insurance::tests::new_with_positive_balance ... ok
test insurance::tests::new_with_zero_is_empty ... ok

test result: ok. 33 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**33 tests passing. The insurance fund module exists, its invariant is enforced, and deposit semantics are locked in.** Withdraw (and the `WithdrawOutcome` payload semantics) land in L9.

Common errors:

- **`new_with_negative_clamps_to_zero` fails with `assertion failed: f.balance() == 0 — left: -500, right: 0`** — you wrote `if initial_balance >= 0 { initial_balance } else { 0 }`, which would clamp on negatives but pass `-500` through if the comparison were reversed. Or you wrote `Self { balance: initial_balance }` without the clamp. Re-check the `if` condition: `> 0`.
- **`deposit_saturates_at_max` fails with overflow panic** — you wrote `self.balance += fee` instead of `self.balance.saturating_add(fee)`. Debug build panics on overflow; release build silently wraps. `saturating_*` is the only consensus-safe choice.
- **`deposit_negative_is_noop` fails with `left: 50, right: 100`** — you forgot the `if fee > 0` guard and let `saturating_add(-50)` run, which decremented the balance to 50. Saturating add doesn't preserve the invariant by itself; the predicate is load-bearing.
- **`new_with_zero_is_empty` fails with `left: 1, right: 0`** — you wrote `if initial_balance > 0 { initial_balance } else { 1 }` (or similar typo in the else branch). Re-check the else branch literal: `0`.

## Design reflection

Three load-bearing decisions in this lesson:

1. **State appears at the layer where history matters.** The fund's balance is a fact about all the deposits and withdraws that have ever happened to it; the snapshot type can't represent that, because a snapshot is a fact about one account at one moment. **State appears in code only at the boundary where re-derivation from inputs stops being possible.** Stage 10a was that boundary in one direction; Stage 10b crosses it deliberately.

2. **The `balance ≥ 0` invariant is enforced in code, not the type system.** We could have used `balance: u64` and let the compiler enforce it. We didn't, because the rest of the crate computes in `i64` and a u64 field would force casts at every interaction. The decision is a **type-discipline tradeoff**: pick the representation that makes the crate-internal code cleanest, and defend the invariant at the methods that take untyped inputs from outside. **Cross-crate uniformity beats per-field type safety when the per-field invariant is single-line code.**

3. **Defensive code is concentrated at boundaries, not sprinkled throughout.** `compute.rs` trusts every input; `insurance.rs` checks every input. The difference: `compute.rs` is called by other in-crate code that already constructed the inputs correctly, while `insurance.rs` is the boundary where the bridge, the scanner, ADL, and (future) governance all converge. **One module pays the defensive cost; the rest of the crate goes fast.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/insurance.rs ./crates/liquidation/src/insurance.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

After L8:
- **insurance.rs** matches Stage 10b's `insurance.rs` **up through line 118** (everything except `withdraw_shortfall`, the proptest section, and the sequencing test, which land in L9). Specifically: doc comment + struct + `WithdrawOutcome` enum + `impl` block ending at `deposit` + `impl Default` + tests up through `deposit_saturates_at_max`.
- **lib.rs** matches Stage 10b's `lib.rs` **byte-for-byte** for the `pub mod` lines and `InsuranceFund / WithdrawOutcome` re-exports. (The roadmap comment at the top of `lib.rs` is also updated — that's an optional cosmetic edit in this lesson; L9 brings it in line with the answer key anyway.)

## Common questions

**Q1: Why not use `Option<NonZeroI64>` or similar to make the invariant a type-level fact?**

Because every consumer in `compute.rs` would have to unwrap the option to do arithmetic. The `compute.rs` functions are already validated to handle zero correctly; forcing them through an `Option` boundary adds dead branches without protecting anything. **Type-level invariants are great when many callers will *read* the value with structurally-aware code; less great when many callers want to *compute* with it.**

**Q2: Should `deposit` return `Result<i64, FundError>` instead of returning the balance unconditionally?**

No. There's no failure mode worth distinguishing at the call site. Saturation is silent because it's the right behaviour (the fund really does cap at `i64::MAX`); negative fees are silent because the caller is buggy (a `Result` here would force a thread of error handling through every scanner site, just to ignore the error). **Use `Result` when the caller has a meaningful action to take; here they don't.**

**Q3: Why does `WithdrawOutcome` get declared in L8 if `withdraw_shortfall` is in L9?**

Three reasons. (1) Re-exports — `lib.rs` exports the enum at L8 so L9 doesn't touch `lib.rs` again. (2) Public-surface vocabulary — a reader who lands on `insurance.rs` after L8 sees the full type vocabulary of the module, even if some methods are deferred. (3) The variants document the safety-cascade architecture; their *shapes* tell the reader where the fund sits in Layer 2→3 transitions. **Types are documentation that compile; declare them when you can describe them, not when you call them.**

**Q4: Could `InsuranceFund` be a free-standing `i64` value with module-level functions that mutate it, like global state?**

Technically yes, mechanically no. The Stage 10c scanner owns the fund as a field of `LiquidationScanner`; the bridge owns the scanner. Threading the fund through the call stack (rather than reaching for global state) is what makes the scanner unit-testable in isolation. **State that touches consensus must be owned by a known component; ownership-by-stack-position is the discipline that lets multiple scanners coexist without interference.**

**Q5: Why is `new` `const fn` but `deposit` isn't?**

`new` reads only its argument and the `Self` constructor; nothing it does involves mutation through `&mut self`. `deposit` mutates `self.balance` — which Rust currently doesn't allow in `const fn` for non-trivially-const types. `new` being const lets `static FUND: InsuranceFund = InsuranceFund::new(0);` compile, which is useful for tests and (later) for default-config constants. **`const fn` what you can; the boundary is usually whether the function mutates state.**

## Next lesson (L9) — `withdraw_shortfall`

L9 closes out `insurance.rs` with the withdrawal path. The `WithdrawOutcome` enum we declared in L8 finally gets used: `withdraw_shortfall(amount)` returns `Covered { amount }` when the fund has enough, `PartiallyDrained { amount, unfilled }` when it drains to zero, and `Depleted { unfilled }` when it was already empty.

The two interesting parts: (1) the three-variant outcome is **exactly** the three transitions across the Layer 2 → Layer 3 boundary in the safety-net cascade, and (2) four proptests enforce conservation laws — `balance_never_negative`, `deposit_is_additive`, `withdraw_amount_matches_balance_delta`, and `withdraw_amount_plus_unfilled_equals_shortfall`. The proptests are where the cascade math becomes a property the type-system-but-not-quite enforces.

````

---

## Seed-file slot

L8 lands in a new Module 3 at sortOrder 0:

```typescript
{
  title: 'Lesson 8 — InsuranceFund — where the crate stops being pure',
  slug: 'openhl-liquidation-insurance-fund-intro-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 25,
  xpReward: 50,
  content: `# Lesson 8 — InsuranceFund — where the crate stops being pure\n\n...`
},
```

Module 3 metadata (new):

```typescript
3: { title: 'Insurance fund', sortOrder: 3 },
```

## SHA pinning discipline

L8 cites `260883b` (Stage 10b). After L8, `insurance.rs` matches the answer key up to (and including) the `deposit_saturates_at_max` test; `withdraw_shortfall` + proptests + sequencing tests land in L9. The L8 lib.rs re-exports — both `InsuranceFund` and `WithdrawOutcome` — match the Stage 10b answer key byte-for-byte.

## Style review notes (self-critique before paste)

- **L8 is the longest lesson in the Liquidation course so far** (25 min). Justifies itself by introducing the first stateful module in the crate — that's a real conceptual shift that needs space. Subsequent insurance lessons (L9 + L10) will be tighter because the discipline is already established.
- **The "Stage 10b begins" framing** is load-bearing in two ways: it tells the reader they've crossed a milestone (Stage 10a is complete), and it warns them that the chapter is now teaching state-management discipline (which deserves more careful reading than pure compute).
- **The `WithdrawOutcome` declaration without use** is a deliberate teaching device — vocabulary before mechanism. The reader meets the enum, sees its three-variant shape, and (importantly) sees the doc comment that names the Layer 2→3 boundary. By the time L9 implements `withdraw_shortfall`, the enum is familiar. This is the same technique L0 used for "the safety-net cascade" overview before any specific layer was implemented.
- **Six "things to notice" lists** show up in L8 — one per significant code addition. Each list is 4-6 items, hitting different facets (correctness, performance, style, defensiveness, composability). The pattern is consistent enough that a reader scanning a future L9-L15 lesson will know where to look for "what to internalize."
- **The "consensus determinism" framing** in Step 4's deposit notice is the first time the lesson explicitly names that consensus state arithmetic is different from app arithmetic. This framing reappears throughout the rest of the course; introducing it here, where saturation first matters, gives the reader the right mental model before the scanner (L11–L12) starts threading the same discipline through batch processing.
