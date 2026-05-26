# Building OpenHL Liquidation — L9 draft (EN) — build-along

> openhl SHA `260883b` (Stage 10b — insurance fund state machine + close-outcome decomposition).

## L9 — `openhl-liquidation-withdraw-shortfall-en`

**Stage**: Stage 10b — `260883b`

**Title**: Lesson 9 — `withdraw_shortfall` — the Layer 2 → Layer 3 boundary as code

**Duration**: 30 min · **XP**: 60

---

````markdown
# Lesson 9 — `withdraw_shortfall` — the Layer 2 → Layer 3 boundary as code

## Goal

Concepts you'll grasp in this lesson:

- **The three-variant outcome enum is the cascade boundary in type form.** `WithdrawOutcome::Covered` is "Layer 2 absorbed it fully." `PartiallyDrained` is "Layer 2 absorbed what it could; the rest escalates." `Depleted` is "Layer 2 had nothing; everything escalates." Stage 10d's ADL routine pattern-matches on this enum to decide what work it has to do. **Architecture seams that span multiple stages become enum variants that span multiple call sites.**
- **Early-return ladders for total functions.** `withdraw_shortfall` handles four distinct cases (non-positive shortfall, empty fund, sufficient balance, partial drain) and uses four guarded early returns instead of nested `match`. The ladder reads top-down as a sequence of "is it *this* case? if yes, return; if no, keep going." **Early returns flatten conditional structure when each case is independent.**
- **Conservation laws encoded as proptests.** Type systems can express "this enum has three variants" but not "regardless of which variant fires, `amount + unfilled = original_shortfall`." Proptests over `(initial_balance, requested_shortfall)` pairs let us prove the conservation law against thousands of random inputs. **Proptests are how invariants the compiler can't enforce become invariants the test suite *does* enforce.**
- **`&mut self` methods that return *outcomes*, not just new state.** Unlike `deposit` (returns the new balance), `withdraw_shortfall` returns a *categorically different shape* per path. Three variants × different payloads = three different "what just happened" responses for the same method. **When mutations have qualitatively distinct success modes, return the distinction in the type.**

Verification:

```bash
cargo test -p openhl-liquidation
```

…passes 45 tests (24 compute + 21 insurance: 9 from L8 + 8 new unit tests + 4 new proptests). The full `insurance.rs` module is byte-for-byte against `260883b` after L9.

Specific changes:

- **`src/insurance.rs`** — adds `withdraw_shortfall` to the `impl InsuranceFund` block, 7 unit tests covering the three variants and the negative/zero edge cases, 1 sequencing test that combines deposit + withdraw, and 4 proptests.
- **No changes to `lib.rs`** — `WithdrawOutcome` was already re-exported in L8.

L9 closes the insurance fund module. After this lesson the answer-key diff against `260883b` is fully clean for `insurance.rs`.

## Recap

After L8:
- `insurance.rs` exists, with the `InsuranceFund` struct, `WithdrawOutcome` enum (declared, unused), three constructors, the `balance()` accessor, and the `deposit()` mutator.
- `lib.rs` re-exports both `InsuranceFund` and `WithdrawOutcome`.
- `cargo test` runs 33 tests, all green.
- The fund **accumulates** deposits (with the `balance ≥ 0` invariant defended at every public method), but it doesn't yet **drain**.

L9 wires the drain path. The enum the reader met in L8 finally has a method that returns its variants.

## Plan

Two edits:

1. **Add `withdraw_shortfall` to the `impl InsuranceFund` block** in `crates/liquidation/src/insurance.rs`. The method is ~20 lines plus the doc comment; the implementation is an early-return ladder that handles four input cases.
2. **Add 8 unit tests + 4 proptests** to the existing `#[cfg(test)] mod tests` block. The proptests need a small change at the top of the test module — `use proptest::prelude::*;` — and a `proptest! { ... }` block wrapping the property assertions.

> 🛑 **Predict.** Before reading further: a fund with balance 300 receives a `withdraw_shortfall(500)` call. What's the new balance, and which variant of `WithdrawOutcome` should the method return — including the payload values? Now imagine the next call on the same fund: `withdraw_shortfall(100)`. Same questions.

(Answer: **First call:** balance becomes 0; outcome is `PartiallyDrained { amount: 300, unfilled: 200 }`. The fund covered 300 (everything it had) and 200 must escalate to ADL. **Second call:** balance stays 0; outcome is `Depleted { unfilled: 100 }`. The fund was already empty before this call started, so we returned the depleted variant — *not* `PartiallyDrained { amount: 0, unfilled: 100 }`. The distinction matters: `PartiallyDrained` means "we paid out something," `Depleted` means "we paid out nothing." Stage 10c's scanner logs them differently because operationally they represent different bridge health states — a fund actively draining vs a fund already exhausted.)

The mental model for the three variants:

```
   Initial state              Call                         Outcome variant
   ─────────────              ────                         ────────────────
   balance = 1000        withdraw_shortfall(300)        Covered { amount: 300 }
   balance = 1000        withdraw_shortfall(1000)       Covered { amount: 1000 }     ← exact drain
   balance =  300        withdraw_shortfall(500)        PartiallyDrained {            ← only partial
                                                          amount: 300,
                                                          unfilled: 200
                                                        }
   balance =    0        withdraw_shortfall(500)        Depleted { unfilled: 500 }    ← nothing to give
   balance = 1000        withdraw_shortfall(0)          Covered { amount: 0 }         ← no-op
   balance = 1000        withdraw_shortfall(-100)       Covered { amount: 0 }         ← defensive

   ── after each call ──────────────────────────────────────────────────────
   balance becomes        sum of `amount` payouts        ≥ 0 always
   `unfilled` payload      escalates to ADL (Stage 10d)   carries Layer 3's input
```

Notice three things about the variant assignments:

1. **`Covered` covers both "perfect match" and "no-op" cases.** A shortfall of exactly the balance is `Covered { amount: balance }`. A shortfall of 0 is `Covered { amount: 0 }`. The variant says "the fund had what was asked of it"; the payload says how much that was. **A variant's payload carries the magnitude; the variant itself carries the meaning.**
2. **`PartiallyDrained` requires *both* a positive balance and an insufficient-but-not-zero deficit.** It can't fire when `balance == 0` (that's `Depleted`) or when `shortfall ≤ balance` (that's `Covered`). The variant has a narrow eligibility window — which is what makes it informationally meaningful at the call site. **Each variant fires under conditions that no other variant fires under.**
3. **`Depleted` doesn't change state.** Balance is already 0; the method does nothing except surface the unfilled amount. The variant exists *to be observed*, not to record an action. **Outcome enums that include "no action taken" variants are usually right — they let callers branch on the cascade-position fact, not just on the side effect.**

## Walk-through

### Step 1: Add `withdraw_shortfall` to the `impl InsuranceFund` block

Open `crates/liquidation/src/insurance.rs`. Find the existing `impl InsuranceFund { ... }` block. After `deposit`, append `withdraw_shortfall`:

```rust
    /// Attempt to absorb `shortfall` from the fund.
    ///
    /// Three outcomes:
    ///   - `shortfall ≤ balance` → [`WithdrawOutcome::Covered`], balance
    ///     decreases by `shortfall`.
    ///   - `0 < balance < shortfall` → [`WithdrawOutcome::PartiallyDrained`],
    ///     balance drops to 0, unfilled = `shortfall − prior_balance`.
    ///   - `balance == 0` → [`WithdrawOutcome::Depleted`], no state change,
    ///     unfilled = `shortfall`.
    ///
    /// Non-positive `shortfall` is treated as a successful no-op
    /// (`Covered { amount: 0 }`): no balance change, no escalation.
    pub fn withdraw_shortfall(&mut self, shortfall: i64) -> WithdrawOutcome {
        if shortfall <= 0 {
            return WithdrawOutcome::Covered { amount: 0 };
        }
        if self.balance == 0 {
            return WithdrawOutcome::Depleted {
                unfilled: shortfall,
            };
        }
        if self.balance >= shortfall {
            self.balance -= shortfall;
            WithdrawOutcome::Covered { amount: shortfall }
        } else {
            let prior = self.balance;
            self.balance = 0;
            WithdrawOutcome::PartiallyDrained {
                amount: prior,
                unfilled: shortfall - prior,
            }
        }
    }
```

Six things to notice about this 20-line method:

1. **The early-return ladder handles four cases in evaluation order.** Non-positive shortfall first (defensive). Empty fund second (no balance can be moved). Sufficient balance third (the happy path). Partial drain fourth (fallthrough). **Each guard is independent — none cascades into the next.** A guarded early-return ladder beats a nested `match` here because the cases don't share structure: each one's input shape is different (`shortfall <= 0` vs `balance == 0` vs `balance >= shortfall` vs everything else).
2. **`shortfall <= 0` covers both negative and zero in one branch.** Zero shortfall is a meaningful caller call ("the fee was 0; nothing to draw from the fund"); negative shortfall is a caller bug. Both produce the same `Covered { amount: 0 }` because the caller-facing semantics are identical: nothing was drawn, nothing escalates. **Group input cases by their *outcome*, not by their *intent*.**
3. **`self.balance -= shortfall` is plain `-`, not `saturating_sub`.** Because the previous guard (`self.balance >= shortfall`) has *already proven* — deterministically and identically across every validator — that the `i64` subtraction cannot underflow. This isn't a contradiction of L8's "consensus state must never panic" rule: it's the narrow exception where a static control-flow guard makes the panic probability *provably zero*, so the redundant saturation can be dropped. **A type invariant that holds at the precondition of a subtraction makes saturating arithmetic redundant.** This is the inverse pattern to `deposit`'s `saturating_add` — there we couldn't prove the precondition, so we saturated; here we *did* prove it (the `if` is the proof), so we use plain subtraction.
4. **`PartiallyDrained` reads `prior` into a local first, then sets `balance = 0`, then constructs the variant.** The order matters: if you wrote `WithdrawOutcome::PartiallyDrained { amount: self.balance, unfilled: shortfall - self.balance }` and then `self.balance = 0`, the construction would be fine (it captures `self.balance` before any mutation), but the assignment after struct construction looks like an afterthought to readers. Storing `prior` first makes the temporal order obvious: read → mutate → construct. **For state-machine transitions, name the prior state explicitly when you'll reference it after the mutation.**
5. **`Covered { amount: shortfall }` uses `shortfall` directly, not `self.balance` before subtraction.** That's fine because we've already checked `self.balance >= shortfall`, so `shortfall` is exactly what we paid out. **Use the *requested* amount in the payload, not the *available* amount, when they're equal — it matches the caller's mental model better.**
6. **The method takes `&mut self` and returns by value.** No reference, no lifetime, no `Result`. The variant *is* the success-shape; the borrow checker treats this exactly like `deposit`'s `-> i64`. **Outcome enums by-value compose smoothly with `match` at call sites; they don't force the caller to manage a borrow.**

> 🛑 **Anti-fluency.** "Why not `Result<i64, FundError>` where `FundError::PartiallyDrained(amount, unfilled)` and `FundError::Depleted(unfilled)`?" Three problems. (1) `PartiallyDrained` and `Depleted` aren't *errors* — they're successful outcomes that surface escalation work to the caller. Tagging them as errors blurs the line between "this method failed" and "this method succeeded with caveat." (2) The `?` operator on `Result` short-circuits the caller; we don't *want* short-circuit here, we want the caller to *pattern-match* and route. (3) `WithdrawOutcome` is also returned from later signed-outcome wrappers (Stage 10c); a `Result` would force every consumer to wrap their own helpers in `Result` propagation. **`Result` is for "should I unwind?" `Enum` is for "what kind of success did I just have?"**

### Step 2: Add the 8 unit tests

Inside the existing `#[cfg(test)] mod tests { ... }` block in `insurance.rs`, add three test sections after the existing L8 deposit tests:

```rust
    // ─── withdraw_shortfall: Covered ───────────────────────────────

    #[test]
    fn withdraw_covered_typical() {
        let mut f = InsuranceFund::new(1_000);
        let out = f.withdraw_shortfall(300);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 300 });
        assert_eq!(f.balance(), 700);
    }

    #[test]
    fn withdraw_covered_exact_balance() {
        let mut f = InsuranceFund::new(1_000);
        let out = f.withdraw_shortfall(1_000);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 1_000 });
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn withdraw_zero_is_covered_noop() {
        let mut f = InsuranceFund::new(1_000);
        let out = f.withdraw_shortfall(0);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 0 });
        assert_eq!(f.balance(), 1_000);
    }

    #[test]
    fn withdraw_negative_is_covered_noop() {
        // Defensive: a negative shortfall is a caller bug, not a deposit.
        let mut f = InsuranceFund::new(1_000);
        let out = f.withdraw_shortfall(-100);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 0 });
        assert_eq!(f.balance(), 1_000);
    }

    // ─── withdraw_shortfall: PartiallyDrained ──────────────────────

    #[test]
    fn withdraw_partial_drains_to_zero() {
        let mut f = InsuranceFund::new(300);
        let out = f.withdraw_shortfall(500);
        assert_eq!(
            out,
            WithdrawOutcome::PartiallyDrained {
                amount: 300,
                unfilled: 200
            }
        );
        assert_eq!(f.balance(), 0);
    }

    // ─── withdraw_shortfall: Depleted ──────────────────────────────

    #[test]
    fn withdraw_depleted_no_change() {
        let mut f = InsuranceFund::empty();
        let out = f.withdraw_shortfall(500);
        assert_eq!(out, WithdrawOutcome::Depleted { unfilled: 500 });
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn withdraw_after_full_drain_is_depleted() {
        let mut f = InsuranceFund::new(100);
        let _ = f.withdraw_shortfall(100); // Covered, drains to 0
        let out = f.withdraw_shortfall(50);
        assert_eq!(out, WithdrawOutcome::Depleted { unfilled: 50 });
    }

    // ─── deposit + withdraw sequencing ─────────────────────────────

    #[test]
    fn deposit_after_drain_recovers() {
        let mut f = InsuranceFund::new(100);
        let _ = f.withdraw_shortfall(100); // drains
        f.deposit(50);
        let out = f.withdraw_shortfall(30);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 30 });
        assert_eq!(f.balance(), 20);
    }
```

Six things to notice about how these tests are grouped:

1. **Three section dividers — Covered, PartiallyDrained, Depleted — match the variant names exactly.** A reader scanning the test file to find the test for a specific `WithdrawOutcome` variant can grep on the section header. **For tests that exercise an enum's variants, group by variant.**
2. **`withdraw_covered_exact_balance` is the boundary case for the `balance >= shortfall` branch.** When `balance == shortfall`, the `>=` predicate is true and the `Covered` path fires. The test makes sure a future "off-by-one" refactor (`>` instead of `>=`) would be caught. **Boundary tests on inequality predicates catch the most common refactor mistakes.**
3. **`withdraw_partial_drains_to_zero` is the *only* test for the `PartiallyDrained` variant.** One test is enough because the variant's path is unique: it fires when `0 < balance < shortfall`, and the math (`amount = balance`, `unfilled = shortfall - balance`) is a direct read from the struct construction. **Single-path code needs single-path coverage; the proptest below covers the conservation law across all paths.**
4. **`withdraw_after_full_drain_is_depleted` tests the state transition, not just the variant.** A naive "no setup" test (`withdraw on empty`) is already covered by `withdraw_depleted_no_change`. This second `Depleted` test catches a different bug: a future refactor that accidentally cached the balance before mutation (so the *second* call sees the *first* call's pre-drain balance). **Multiple tests for one variant should each catch a *different* class of regression.**
5. **`deposit_after_drain_recovers` is the only sequencing test.** It chains four operations (`new`, `withdraw_shortfall`, `deposit`, `withdraw_shortfall`) and asserts the final balance and outcome. The test exists because the per-operation tests verify each method in isolation, but a real liquidation event sequence is exactly this kind of multi-operation chain. **Unit tests verify methods; sequencing tests verify state-machine transitions across method boundaries.**
6. **The negative-shortfall test has `// Defensive` as a marker comment**, same pattern as L8's `deposit_negative_is_noop`. A future maintainer who looks at this test and thinks "we never pass negatives, this is dead code" gets stopped by the one-word comment. **Marker comments are how tests defend defensive code from refactor removal.**

### Step 3: Add the 4 proptests

Proptests are the conservation laws of `insurance.rs`. They're not testing one specific input → output relationship; they're testing that *every* valid input pair satisfies a property the type system can't express.

First, add the proptest import at the top of the `#[cfg(test)] mod tests` block (between `use super::*;` and the first `#[test]`):

```rust
    use proptest::prelude::*;
```

Then, after the unit tests, add the proptest block:

```rust
    // ─── proptest: type invariants ─────────────────────────────────

    proptest! {
        /// The fund's balance is never negative after any sequence of
        /// deposits and withdraws.
        #[test]
        fn balance_never_negative(
            ops in proptest::collection::vec(
                proptest::prelude::any::<(bool, i64)>(),
                0..20,
            ),
        ) {
            let mut f = InsuranceFund::empty();
            for (is_deposit, amount) in ops {
                if is_deposit {
                    f.deposit(amount);
                } else {
                    f.withdraw_shortfall(amount);
                }
                prop_assert!(f.balance() >= 0);
            }
        }

        /// `deposit(x).deposit(y)` accumulates: balance after two deposits
        /// equals the sum of the two (modulo saturation at i64::MAX).
        #[test]
        fn deposit_is_additive(a in 0_i64..1_000_000, b in 0_i64..1_000_000) {
            let mut f = InsuranceFund::empty();
            f.deposit(a);
            f.deposit(b);
            prop_assert_eq!(f.balance(), a + b);
        }

        /// After a withdraw, the change in balance equals the `amount`
        /// reported in the outcome — regardless of which variant fired.
        #[test]
        fn withdraw_amount_matches_balance_delta(
            initial in 0_i64..1_000_000,
            shortfall in 0_i64..1_000_000,
        ) {
            let mut f = InsuranceFund::new(initial);
            let before = f.balance();
            let out = f.withdraw_shortfall(shortfall);
            let after = f.balance();
            let delta = before - after;
            match out {
                WithdrawOutcome::Covered { amount }
                | WithdrawOutcome::PartiallyDrained { amount, .. } => {
                    prop_assert_eq!(delta, amount);
                }
                WithdrawOutcome::Depleted { .. } => {
                    prop_assert_eq!(delta, 0);
                }
            }
        }

        /// Conservation: `amount + unfilled` across all outcome shapes
        /// always equals the original (positive) shortfall.
        #[test]
        fn withdraw_amount_plus_unfilled_equals_shortfall(
            initial in 0_i64..1_000_000,
            shortfall in 1_i64..1_000_000,
        ) {
            let mut f = InsuranceFund::new(initial);
            let out = f.withdraw_shortfall(shortfall);
            let total = match out {
                WithdrawOutcome::Covered { amount } => amount,
                WithdrawOutcome::PartiallyDrained { amount, unfilled } => amount + unfilled,
                WithdrawOutcome::Depleted { unfilled } => unfilled,
            };
            prop_assert_eq!(total, shortfall);
        }
    }
```

Eight things to notice about these four properties:

1. **`balance_never_negative` is *the* type invariant from L8.** This is the proptest that proves the `balance ≥ 0` discipline holds across arbitrary sequences. The input — a vector of `(is_deposit, amount)` pairs of length 0 to 20 — covers virtually every reachable state-machine trajectory in fewer than a thousand cases. **The proptest of the type invariant is the strongest possible statement that defensive coding works.**
2. **`deposit_is_additive` uses bounded ranges (`0..1_000_000`)**, not `i64::MIN..i64::MAX`. Why? Because we'd otherwise need to encode saturation into the property. With the bounded range, `a + b ≤ 2_000_000` never approaches `i64::MAX`, so saturation never fires and we can use exact equality. **Bound proptest inputs to the operating range where the property is simply expressible; let unit tests cover the boundary cases.** (The `deposit_saturates_at_max` unit test from L8 owns the saturation boundary; proptests own the arithmetic identity.)
3. **`withdraw_amount_matches_balance_delta` uses one of Rust's most powerful pattern-matching features — the or-pattern: `Covered { amount } | PartiallyDrained { amount, .. }`.** Distinct variants can share a single bind site as long as they expose the same field name and type (`amount: i64` here); Rust 1.53+ strengthened this to support nested or-patterns too. Both variants carry an `amount` field; the property is the same for both ("delta equals the reported `amount`"). The `..` skips the `unfilled` field on `PartiallyDrained` that we don't need. **Or-patterns flatten conditional logic when distinct variants share a payload field.**
4. **The proptest doesn't try to predict *which* variant fires.** Given `initial=300, shortfall=500`, the test doesn't compute "this should be `PartiallyDrained`"; it lets the method decide and then asserts the property. **Proptests assert properties, not paths.** A test that re-implements the method under test to predict its output isn't testing — it's a mirror.
5. **`withdraw_amount_plus_unfilled_equals_shortfall` has `shortfall in 1..1_000_000`** (positive only). The boundary at zero is `Covered { amount: 0 }` and falls into the conservation as `0 + 0 = 0`, but the property is most informative when there's actually a shortfall to conserve. Restricting the range puts the test on the meaningful regime. **Restrict input ranges to where the property *says* something.**
6. **No proptest covers "deposit followed by withdraw."** The `deposit_after_drain_recovers` unit test handles the sequenced case manually. Why isn't this a property? Because the property would need to thread `(deposit_amount, balance_before_withdraw)` into the assertion in a way that's hard to make readable — and the sequence is short enough that the unit test is more illustrative. **Use proptests for properties over arbitrary inputs; use unit tests for sequenced narratives.**
7. **All four proptests use `prop_assert!` / `prop_assert_eq!`, not `assert!`.** The `prop_*` macros emit shrinkage information when a test fails, so when proptest finds a counterexample it can report the *minimal* failing input. **Use the proptest-specific macros inside `proptest!` blocks; plain `assert!` defeats shrinkage.**
8. **The proptest block is at the *end* of the test module.** Unit tests fail fast and give precise messages; proptests give *distributions* of behavior. By putting proptests after unit tests, the failure stream — if anything goes wrong — leads with the most diagnostically useful information. **Order tests in the file by "highest signal-to-noise first."**

### Step 4: Run the tests

```bash
cargo test -p openhl-liquidation
```

Expected output (abbreviated; 24 compute tests at the top, then insurance):

```
running 45 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
... (22 more compute tests)
test insurance::tests::balance_never_negative ... ok
test insurance::tests::default_is_empty ... ok
test insurance::tests::deposit_accumulates ... ok
test insurance::tests::deposit_after_drain_recovers ... ok
test insurance::tests::deposit_is_additive ... ok
test insurance::tests::deposit_negative_is_noop ... ok
test insurance::tests::deposit_saturates_at_max ... ok
test insurance::tests::deposit_zero_is_noop ... ok
test insurance::tests::empty_is_zero ... ok
test insurance::tests::new_with_negative_clamps_to_zero ... ok
test insurance::tests::new_with_positive_balance ... ok
test insurance::tests::new_with_zero_is_empty ... ok
test insurance::tests::withdraw_after_full_drain_is_depleted ... ok
test insurance::tests::withdraw_amount_matches_balance_delta ... ok
test insurance::tests::withdraw_amount_plus_unfilled_equals_shortfall ... ok
test insurance::tests::withdraw_covered_exact_balance ... ok
test insurance::tests::withdraw_covered_typical ... ok
test insurance::tests::withdraw_depleted_no_change ... ok
test insurance::tests::withdraw_negative_is_covered_noop ... ok
test insurance::tests::withdraw_partial_drains_to_zero ... ok
test insurance::tests::withdraw_zero_is_covered_noop ... ok

test result: ok. 45 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**45 tests passing. The insurance fund module is byte-for-byte against `260883b`.** Stage 10b's stateful core is complete; only the close-outcome decomposition (`liquidation_fee`, `solvent_close_outcome`, `underwater_close_outcome`) remains for L10.

Common errors:

- **`balance_never_negative` fails with a shrunken counterexample like `[(false, -100)]`** — your `withdraw_shortfall` is treating negative `shortfall` as a deposit (subtracting a negative = adding). The defensive guard `if shortfall <= 0 { return ... }` must be the first guard, before any state mutation.
- **`withdraw_amount_plus_unfilled_equals_shortfall` fails on `initial=300, shortfall=500` with `total=300`** — your `PartiallyDrained` is only carrying `amount` and missing `unfilled`. Re-read the struct construction: both fields must be populated and their sum must equal `shortfall`.
- **`withdraw_amount_matches_balance_delta` fails on a Depleted case with `delta=-N`** — your `withdraw_shortfall` is mutating `self.balance` in the Depleted branch when it shouldn't. The branch should return immediately without touching state.
- **`withdraw_covered_exact_balance` passes but `withdraw_partial_drains_to_zero` fails with `balance=300, expected 0`** — your `if self.balance >= shortfall` branch is correct but your `else` branch forgot to set `self.balance = 0`. The partial-drain path always zeroes the balance.

## Design reflection

Three load-bearing decisions in this lesson:

1. **A three-variant outcome enum, not `Option` or `Result`.** `Option<i64>` could express "we paid out N or nothing," but it loses the distinction between "paid out everything we had" and "had nothing to pay." `Result<i64, FundError>` could carry both, but it tags the partial-drain case as a *failure*, which it isn't. **The right shape is the enum that matches the actual decision tree of the caller** — and the caller (Stage 10c's scanner) has three distinct routing decisions: log a successful absorb, log a partial absorb + escalate, log a depletion + escalate.

2. **The four-case early-return ladder.** Cases are checked in order of "is this trivially the answer?": negative shortfall (defensive), empty fund (no work possible), sufficient balance (happy path), partial drain (fallthrough). The ordering matters operationally: it's the *cost-ordered* sequence — cheapest check first, structural mutation last. **State-machine methods should evaluate guards in order of cost.**

3. **The proptest suite encodes invariants the type system can't.** `balance_never_negative` is the proptest of the L8 type invariant. `withdraw_amount_plus_unfilled_equals_shortfall` is the conservation law for the cascade math. `deposit_is_additive` proves the abelian-group structure of deposits. `withdraw_amount_matches_balance_delta` ties the variant payload to the observable state change. **Together, these four properties make every public method's contract a thing the test suite can *prove*, not just *probe*.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/insurance.rs ./crates/liquidation/src/insurance.rs
```

After L9:
- **insurance.rs** matches Stage 10b's `insurance.rs` **byte-for-byte**. The full state machine — struct, enum, three constructors, accessor, deposit, withdraw_shortfall, Default impl, 12 unit tests, 4 proptests — is in the file.
- **lib.rs** was already byte-for-byte after L8.

If you also re-ran `lib.rs`'s `mod` ordering or re-export styling differently in L8, fix it now: the answer key lists `pub mod compute; pub mod insurance; pub mod types;` and `pub use insurance::{InsuranceFund, WithdrawOutcome};` on a single line. Minor whitespace differences are harmless.

## Common questions

**Q1: Why doesn't `withdraw_shortfall` take `&mut self` and return `Result<i64, WithdrawOutcome>` where the success case is the new balance and the "error" case carries escalation info?**

Because the cascade pattern needs the caller to *always* pattern-match. With a `Result`, the typical Rust idiom is `let new_balance = f.withdraw_shortfall(s)?;` — and `?` would short-circuit the scanner's loop on the very first partial drain, exactly when we *don't* want short-circuit (we want to keep scanning and absorb deposits from later events). Returning the variant by value forces the caller to think about each outcome explicitly. **The `?` operator is a poor fit for "successful with caveat" semantics.**

**Q2: Should `Covered`'s `amount` field equal `shortfall` (the request) or the previous balance minus the new balance (the delta)?**

They're identical in `Covered`'s eligibility window (`shortfall ≤ balance`), so both representations are correct. We pick `shortfall` because it matches the *caller's mental model* — they asked for X, they got X. The `withdraw_amount_matches_balance_delta` proptest verifies this is consistent. **When two representations are mathematically equal, pick the one that matches the caller's framing.**

**Q3: Why is the proptest input range `0..1_000_000` instead of `i64::MIN..i64::MAX`?**

For two reasons. (1) The interesting properties hold in the *operating* range; the boundary saturation cases are unit-tested separately (L8's `deposit_saturates_at_max`). (2) Wider ranges would force the properties to encode saturation logic in their assertions, making them harder to read. **Proptest ranges should match the regime where the property is simply expressible — boundary cases belong to unit tests.**

**Q4: Why no proptest for "if balance > 0, the next withdraw never returns Depleted"?**

Because that property is *trivially* a consequence of the code's structure — the `if self.balance == 0` guard fires only when balance is zero, and balance can only be zero after a covering or partial-draining withdraw. A property test for it would be testing the existence of the guard, not its consequences. **Proptests should test the *consequences* of the implementation, not its *structure*.**

**Q5: Could `WithdrawOutcome` be `WithdrawResult` with `Covered` as the `Ok` variant and the other two as `Err`?**

You could write it that way, but it conflates *categories of success* with *failure*. The cascade math says all three variants are "successful in their layer" — Covered absorbs at Layer 2, the other two correctly delegate to Layer 3. Calling them "errors" leaks Stage 10b's internal regime into Stage 10c's vocabulary. **Naming should reflect the architectural role; error vs success is a 1-bit distinction that this 3-bit decision tree doesn't fit.**

**Q6: The proptest `balance_never_negative` uses `proptest::collection::vec(..., 0..20)`. Why 20 and not 100?**

Two reasons. (1) 20 operations is enough to exercise every reachable transition in the state machine multiple times; longer sequences don't increase coverage. (2) Proptest's shrinker can shrink a 20-op failure case down to the minimal subsequence in a reasonable time; shrinking a 100-op failure can take seconds and produce a less-readable counterexample. **Pick proptest sizes for shrinkage cost, not for "more is better."**

## Next lesson (L10) — `liquidation_fee` + close-outcome decomposition

L10 returns to `compute.rs` and adds the three Stage 10b pure-compute functions that bridge `compute` and `insurance`: `liquidation_fee(notional, params)`, `solvent_close_outcome(snapshot, mark, params)`, and `underwater_close_outcome(snapshot, mark, params)`. Together they decompose every liquidation event into a `(fund credit, residual to trader)` or `(fund debit, partial fee captured)` tuple — exactly the shape the Stage 10c scanner needs to call `InsuranceFund::deposit` / `InsuranceFund::withdraw_shortfall` per close.

After L10, the `compute` and `insurance` modules talk to each other through the cascade math: pure functions produce the credit/debit numbers, the state machine accumulates them. L11 wraps this loop in the `LiquidationScanner` and the safety-net cascade has a runnable scanner.

````

---

## Seed-file slot

L9 lands in Module 3 at sortOrder 1:

```typescript
{
  title: 'Lesson 9 — withdraw_shortfall — the Layer 2 → Layer 3 boundary as code',
  slug: 'openhl-liquidation-withdraw-shortfall-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 9 — withdraw_shortfall — the Layer 2 → Layer 3 boundary as code\n\n...`
},
```

## SHA pinning discipline

L9 cites `260883b` (Stage 10b). After L9, `insurance.rs` is byte-for-byte against the answer key — the full state machine is in place. The next pinned SHA appears in L11 once Stage 10c (`scanner.rs`) is introduced; L10 stays on `260883b` because it returns to `compute.rs`.

## Style review notes (self-critique before paste)

- **L9 is the longest lesson in the Liquidation course so far** (30 min, edging past L8's 25). Justified by the proptest material — proptests need their own treatment because they encode invariants that aren't visible in unit-test reasoning. The reader has just learned the state machine in L8; L9's job is to teach them how to *prove* it works.
- **The "three-variant outcome enum" framing repeats from L8** — deliberately. The reader saw the enum declared but unused in L8; L9 makes the variants live by giving them call sites. The repetition signals "this is the payoff," not redundancy.
- **The four proptest properties are the deepest material in the lesson.** I gave them the most "things to notice" items (eight) and explicit motivation in the design reflection. The reader who skips the proptests can still ship the code; the reader who internalizes them can read any future proptest in the crate with confidence. **L9 is where the course transitions from "follow along to ship code" to "understand why this code is correct."**
- **The next-lesson preview names L10 + Stage 10c context.** Honest scoping: L10 is still on `260883b` (Stage 10b complete), L11 will jump to Stage 10c. The reader knows the SHA pinning will hold steady for one more lesson.
- **No new `lib.rs` changes in L9.** That's intentional — L8 already re-exported `WithdrawOutcome`. The L9 reader makes one file edit (`insurance.rs`) and the answer-key diff closes. Self-contained per-lesson scope is the discipline.
