# Building OpenHL CLOB — L8 draft (EN) — build-along

> Drafted against openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine).
> Course: `building-openhl-clob-en` (track: `reth-l1-architect`).

---

## L8 — `openhl-clob-proptests-en`

- **Module:** 3 (Testing), sortOrder 1 within module
- **Course-level sortOrder:** 7 (lesson 8 of 12)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# Lesson 8 — 3 proptest invariants: 768 random scenarios

## Goal

By the end of this lesson:

```bash
cargo test -p openhl-clob
```

…passes **12 tests** (9 unit + 3 proptest invariants), with each proptest running **256 cases** each = **768 random scenarios**. You'll have written:

- **One new dev-dep** — `proptest = { workspace = true }` in `crates/clob/Cargo.toml`.
- **A new `#[cfg(test)] mod prop_tests` block** at the bottom of `book.rs`, containing:
  - `Action` enum — a simplified action representation for property generators.
  - 3 generator strategies — `arb_side`, `arb_action`, `arb_actions` — that produce random valid action sequences.
  - 3 `proptest!` blocks — `qty_conservation`, `no_crossed_book`, `determinism`.

After L8, the matching engine has **property-level proof** that its invariants hold across many random orderings — not just the 9 hand-traced scenarios from L7.

## Recap

After L7:

- 9 hand-traced unit tests pass.
- Each tests a specific invariant on a specific scenario.

**What L7 doesn't test**: random sequences. If a bug exists that only triggers when (e.g.) you submit 17 limits, cancel 3 of them, and then submit a Market, L7's 9 tests will likely miss it. You'd need to either think of that specific scenario yourself (hard — bugs hide in places you don't think to test) or test *many* scenarios automatically. L8 does the latter.

## Plan

Three things:

1. **Add `proptest` as a dev-dependency** to `crates/clob/Cargo.toml`. `proptest` is already a workspace dep (used by `consensus` for proposer-election tests in the existing rethlab L1 Architect tier); we just need to declare we use it.
2. **Add a new `mod prop_tests` block** below the existing `mod tests` in `book.rs`. The new module contains:
   - `Action` enum (subset of operations the property tests will exercise — for now, just SubmitLimit + SubmitMarket; cancel will arrive in a follow-up).
   - Generator strategies for random `Action` sequences.
   - 3 `proptest!` blocks — one per invariant.
3. **Run `cargo test -p openhl-clob`** — 12 tests pass (9 unit + 3 props).

The 3 invariants:

- **`qty_conservation`**: total quantity entering the book equals total filled + total resting (the "money math is conserved" property).
- **`no_crossed_book`**: `best_bid < best_ask` always holds — the safety property test 9 hand-traced, now random-tested.
- **`determinism`**: the same action sequence produces the same fills + same book state, every time. **This is the replayability property the chain's safety relies on.**

If proptest finds a counterexample for any of them, it **automatically shrinks** the failing input to the smallest sequence that still fails. That's the load-bearing benefit of properties over examples.

> 🛑 **Predict.** Before scrolling: imagine a bug where `submit_limit::Buy` sometimes (e.g., 1% of the time) walks the asks in *random* order instead of best-first. Which of the 3 invariants would catch it fastest? Which would catch it most informatively?

(Answer: `qty_conservation` would catch it indirectly — over enough cases, the wrong walk order produces wrong totals when the matched price differs from what the hand math expects. `no_crossed_book` would catch it directly: a buy that doesn't take the cheapest ask first leaves a cheaper ask on the book, and the next bid that's above that ask creates a cross. `determinism` would catch it on *every* run because each run picks a different "random" walk order, so two runs of the same input produce different fills. **`determinism` is the load-bearing property** for consensus chains — without it, validators won't agree.)

## Walk-through

### Step 1: Add `proptest` to `crates/clob/Cargo.toml`

Open `crates/clob/Cargo.toml`. The current state is:

```toml
[package]
name         = "openhl-clob"
# ... shared package fields ...

[dependencies]

[lints]
workspace = true
```

Add a `[dev-dependencies]` section:

```toml
[package]
name         = "openhl-clob"
# ... shared package fields ...

[dependencies]

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
```

`proptest` is already declared in the workspace `Cargo.toml` (you don't need to add it there — it's been a workspace dep since L1 Architect's first courses). The `[dev-dependencies]` block makes it available only when building tests, not when building production code.

> 🛑 **Anti-fluency.** "Why not put `proptest` in `[dependencies]` so I can use it in non-test code too?" **Because then `openhl-clob` carries `proptest` as a runtime dependency for every consumer.** Smart contracts, validators, indexers — none of them need property test infrastructure to *use* the matching engine. `[dev-dependencies]` is the discipline: testing infrastructure lives only where it's needed.

### Step 2: Set up `mod prop_tests` with the `Action` enum

In `crates/clob/src/book.rs`, **after** the existing `mod tests { ... }` block (still at module scope), add:

```rust
#[cfg(test)]
mod prop_tests {
    use super::*;
    use proptest::prelude::*;

    /// A simplified action enum for property-based testing.
    #[derive(Clone, Debug)]
    enum Action {
        SubmitLimit {
            id: u64,
            account: u64,
            side: Side,
            price: u64,
            qty: u64,
        },
        SubmitMarket {
            id: u64,
            account: u64,
            side: Side,
            qty: u64,
        },
    }
```

The `Action` enum is **a simplified representation of what proptest will randomly generate**. Each variant carries the raw `u64`s that a real call to `Book::submit` would need (wrapped in newtypes later). Two variants for now — Limit and Market submits. Cancel actions aren't here yet; we add them in a follow-up stage of openhl.

**Why model actions as an enum?** Because property tests need to generate *sequences* of actions, and each action can be one of N kinds. The enum captures that variability. proptest's strategy combinators (`prop_oneof!`, `prop::collection::vec`, etc.) work well with enums.

### Step 3: Write the strategies

Continue inside `mod prop_tests`:

```rust
    fn arb_side() -> impl Strategy<Value = Side> {
        prop_oneof![Just(Side::Buy), Just(Side::Sell)]
    }

    fn arb_action(id: u64) -> impl Strategy<Value = Action> {
        let limit_action = (1u64..=200, 1u64..=20, arb_side(), 50u64..=150)
            .prop_map(move |(account, qty, side, price)| Action::SubmitLimit {
                id,
                account,
                side,
                price,
                qty,
            });
        let market_action = (1u64..=200, 1u64..=20, arb_side()).prop_map(
            move |(account, qty, side)| Action::SubmitMarket {
                id,
                account,
                side,
                qty,
            },
        );
        prop_oneof![3 => limit_action, 1 => market_action]
    }

    fn arb_actions() -> impl Strategy<Value = Vec<Action>> {
        prop::collection::vec(0u64..1000, 1..30)
            .prop_flat_map(|ids| {
                ids.into_iter()
                    .enumerate()
                    .map(|(i, _)| arb_action(i as u64 + 1))
                    .collect::<Vec<_>>()
            })
    }
```

Three strategies, building up:

- **`arb_side()`** — uniformly picks Buy or Sell. `prop_oneof![Just(...), Just(...)]` is proptest's "one of these literals" combinator.
- **`arb_action(id)`** — generates a random `Action` with a fixed `id`. The Limit branch generates `(account, qty, side, price)` in ranges; the Market branch generates `(account, qty, side)`. Weights: `3 => limit_action, 1 => market_action` — Limit actions happen 3× as often as Market, reflecting realistic order-book usage.
- **`arb_actions()`** — generates a random `Vec<Action>` of length 1..30. The `.prop_flat_map` pattern is a bit unusual: it first generates a vec of u64s just to **decide the length**, then maps each position to an `arb_action(i+1)` so order IDs increment. The trick is that `arb_actions` produces sequences with strictly-increasing order IDs (avoiding collisions in the book).

**Why use ranges (`1..=200` for account, `50..=150` for price)?** To bias proptest toward generating *plausible* scenarios. With `0..=u64::MAX` ranges, proptest would mostly generate extreme outliers (account_id = 18_446_744_073_709_551_614). Realistic ranges produce scenarios that look like real trading: accounts 1-200, prices 50-150, quantities 1-20. The matching engine's bugs are most likely to hide in normal-looking sequences.

> 🛑 **Anti-fluency.** "Wider ranges = more coverage = better." **Wider ranges = more useless tests.** A 99.99% chance of generating an order with `qty = u64::MAX - 1` doesn't exercise normal matching logic; it exercises overflow boundary cases. Both are interesting, but you want the *easy bugs found cheap first*. Tightening the ranges to plausible values means proptest spends its budget on the matching paths that real production traffic exercises.

### Step 4: The first invariant — `qty_conservation`

Append below the strategies:

```rust
    proptest! {
        #![proptest_config(ProptestConfig {
            cases: 256,
            ..ProptestConfig::default()
        })]

        /// Quantity is conserved: every fill_qty came from a resting maker;
        /// total qty in/out balances.
        #[test]
        fn qty_conservation(actions in arb_actions()) {
            let mut book = Book::new();
            let mut total_in = 0u64;
            let mut total_filled = 0u64;
            let mut total_market_unfilled = 0u64;

            for action in actions {
                match action {
                    Action::SubmitLimit { id, account, side, price, qty } => {
                        total_in += qty;
                        let r = book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Limit { price: Price(price) },
                        });
                        total_filled += r.total_filled().0;
                    }
                    Action::SubmitMarket { id, account, side, qty } => {
                        total_in += qty;
                        let r = book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Market,
                        });
                        total_filled += r.total_filled().0;
                        total_market_unfilled += r.remaining_qty.0;
                    }
                }
            }

            // Resting quantity = total_in - 2*total_filled - total_market_unfilled.
            // (Each fill consumes one unit from a maker AND one unit from a taker,
            // so total_filled counts qty, but the qty appeared in total_in twice
            // — once when the maker was submitted, once when the taker arrived.)
            let resting: u64 = book.bids.values()
                .flat_map(|q| q.iter())
                .chain(book.asks.values().flat_map(|q| q.iter()))
                .map(|o| o.qty.0)
                .sum();
            prop_assert_eq!(total_in, 2 * total_filled + total_market_unfilled + resting);
        }
```

This is the "quantity is conserved" invariant. The body has three counters:

- **`total_in`**: sum of all `qty` values from submitted orders.
- **`total_filled`**: sum of `fill_qty` across all `Fill`s produced.
- **`total_market_unfilled`**: sum of `remaining_qty` from Market orders (the leftover discarded).

The invariant: `total_in = 2 * total_filled + total_market_unfilled + resting_qty`.

Why `2 *`? **Because a fill consumes 1 unit from the maker AND 1 unit from the taker, so 1 unit of fill_qty appears in `total_in` twice** — once when the maker was originally submitted, once when the taker arrived. The math:

| Action | `total_in` | What's left at the end |
| - | - | - |
| Submit Limit 10 units that fully rest | +10 | 10 units resting |
| Submit Market 10 units, no liquidity | +10 | 10 units discarded (no fill) |
| Submit Limit 10 units that match a 5-unit ask | +10 | 5 units filled (one from each), 5 units left over to rest |

If 5 units fill, that means: maker offered 5 (already in `total_in`), taker took 5 (also in `total_in`). The 5 filled units appear in `total_in` as 10 — once from each side. **That's why `2 * total_filled`.**

**The `#![proptest_config(ProptestConfig { cases: 256, .. })]` line at the top** of the `proptest!` block sets each test to run 256 times. With 3 invariants × 256 cases = 768 random scenarios.

**The `prop_assert_eq!` (not `assert_eq!`) is important** — proptest needs to distinguish "test failed" from "test panicked due to a system error." `prop_assert_eq!` reports the failure to proptest's shrinking machinery, which then tries to find a minimal counterexample.

> 🛑 **Anti-fluency.** "`total_in = 2 * total_filled + ...` looks off — why double-count?" **Because in a marketplace, a fill *involves two units* — one buyer's intent and one seller's intent.** When maker offers 5 and taker takes 5, the engine has seen 10 units of "demand for matching": 5 from each side. The two collapsed into a Fill of size 5, but they were 10 individual taker-or-maker-units when they entered. **The invariant counts *individual taker/maker intents*, not unique units.**

### Step 5: The second invariant — `no_crossed_book`

Below the first proptest, still inside the same `proptest! { ... }` block:

```rust
        /// Book invariant: best bid is strictly less than best ask. The book
        /// should never be crossed after submit() completes.
        #[test]
        fn no_crossed_book(actions in arb_actions()) {
            let mut book = Book::new();
            for action in actions {
                match action {
                    Action::SubmitLimit { id, account, side, price, qty } => {
                        book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Limit { price: Price(price) },
                        });
                    }
                    Action::SubmitMarket { id, account, side, qty } => {
                        book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Market,
                        });
                    }
                }
                if let (Some(b), Some(a)) = (book.best_bid(), book.best_ask()) {
                    prop_assert!(b < a, "book crossed: bid={} ask={}", b.0, a.0);
                }
            }
        }
```

The body:

1. **For each action**, submit the order.
2. **After each submission**, check that `book.best_bid() < book.best_ask()` (if both exist).
3. **If at any point `best_bid >= best_ask`**, the test fails — the book is crossed.

This is the **same invariant as L7's `book_does_not_cross_after_match`**, but tested against random sequences. L7 proves the invariant holds on **one** scenario; L8 proves it holds on **256 randomized** scenarios.

The `prop_assert!(b < a, "...")` macro includes a format string — when proptest fails, the error message shows the actual bid/ask values that crossed. This is more informative than the plain `assert!(b < a)`.

> 🛑 **Anti-fluency.** "What if the property test finds a failure that the hand-traced test missed?" **That's exactly the point.** Hand-traced tests verify specific scenarios; proptests verify the general invariant. If a proptest finds a bug, the shrinking phase produces a minimal failing case — which you then *add to the hand-traced suite as a permanent regression test*. **Proptests find bugs; hand-traced tests prevent them from coming back.**

### Step 6: The third invariant — `determinism`

The most important one:

```rust
        /// Determinism: applying the same action sequence produces the same
        /// book + fill history every time. (The "replayability" property
        /// from the architecture doc — required for consensus determinism.)
        #[test]
        fn determinism(actions in arb_actions()) {
            let run = |actions: &[Action]| {
                let mut book = Book::new();
                let mut all_fills: Vec<Fill> = Vec::new();
                for action in actions {
                    let order = match action {
                        Action::SubmitLimit { id, account, side, price, qty } => Order {
                            id: OrderId(*id),
                            account: AccountId(*account),
                            side: *side,
                            qty: Qty(*qty),
                            order_type: OrderType::Limit { price: Price(*price) },
                        },
                        Action::SubmitMarket { id, account, side, qty } => Order {
                            id: OrderId(*id),
                            account: AccountId(*account),
                            side: *side,
                            qty: Qty(*qty),
                            order_type: OrderType::Market,
                        },
                    };
                    all_fills.extend(book.submit(order).fills);
                }
                (book.best_bid(), book.best_ask(), book.depth_bid(), book.depth_ask(), all_fills)
            };
            prop_assert_eq!(run(&actions), run(&actions));
        }
    }
}
```

This invariant defines a helper closure `run` that applies a sequence of actions to a fresh `Book` and returns a 5-tuple summarizing the end state: `(best_bid, best_ask, depth_bid, depth_ask, all_fills_in_order)`.

Then: `prop_assert_eq!(run(&actions), run(&actions))`.

**Two runs of the same input must produce the same output.** If the matching engine has any non-determinism — randomness, HashMap iteration order, threading races — this test will catch it.

**Why this is the most important property**: a consensus chain relies on every validator computing the same fills from the same inputs. If one validator's matching engine produces different fills than another's, validators can't agree on the block, and the chain forks. **Determinism is the load-bearing property** — `no_crossed_book` is about correctness, but determinism is about *agreement*. A correct-but-nondeterministic engine breaks consensus; a deterministic-but-incorrect engine is at least repairable.

**The `Action::SubmitLimit { id, account, side, price, qty }` destructuring uses `*id`, `*account`, etc.** because `actions` is borrowed as `&[Action]`, so each field is a borrowed `&u64`. The `*` dereferences to get the value.

> 🛑 **Anti-fluency.** "Determinism seems trivially true — it's just function application." **It looks trivial, but small mistakes can break it.** Sources of nondeterminism that *would* fail this test:
> - Using `HashMap` instead of `BTreeMap` for `bids`/`asks` (HashMap iteration is randomized).
> - Adding a `std::time::Instant::now()` call inside `submit` for telemetry.
> - Spawning a `tokio::task` to process the order async without sync barriers.
> - Storing a `f64` field and depending on its bits.
>
> Each of these would compile, pass `no_crossed_book`, and only fail when a future contributor introduces them — caught here by `determinism`. **This is the test that protects you from yourself in 6 months.**

## Test

```bash
cargo test -p openhl-clob
```

Expected (12 tests):

```
running 12 tests
test prop_tests::determinism ... ok
test prop_tests::no_crossed_book ... ok
test prop_tests::qty_conservation ... ok
test tests::book_does_not_cross_after_match ... ok
test tests::buy_market_takes_best_ask ... ok
test tests::cancel_removes_resting_order ... ok
test tests::cancel_unknown_returns_false ... ok
test tests::empty_book_has_no_best_prices ... ok
test tests::limit_buy_walks_asks_within_price ... ok
test tests::market_with_insufficient_liquidity_returns_remaining ... ok
test tests::price_time_priority_within_level ... ok
test tests::resting_limit_creates_bid_or_ask ... ok

test result: ok. 12 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Total runtime: **a few seconds**. Proptest runs 256 cases per test, each case is a small in-memory matching simulation, so the total cost is well under 10 seconds.

If any prop test fails, you'll see:

```
proptest: Saving this and future failures in /Users/.../proptest-regressions/...
proptest: If this test was expected to be flaky, ...
```

Proptest **caches the failing input** in a file under `proptest-regressions/`. Subsequent runs will re-test the cached input first, so once you find a bug, fixing it is verified against the same minimal counterexample every time. Add the regressions file to git (it's tiny).

Common errors and fixes:

- **`error: cannot find macro 'proptest' in this scope`** — your `mod prop_tests` is missing `use proptest::prelude::*;`. Re-check Step 2.
- **`error: trait 'Strategy' not satisfied`** — your generator function's return type isn't `impl Strategy<Value = T>`. The `prop_oneof![Just(...)]` returns `impl Strategy<Value = T>` for the type inside `Just`; chaining `.prop_map(...)` may change the value type. Make sure your `Strategy<Value = ...>` type matches what you actually generate.
- **`prop_assert_eq` fails with totals not matching** — your `total_in` accumulator is wrong. Each submit adds the order's `qty` to `total_in`, not the fill quantity. Re-check Step 4 — only sum at submit, not at fill.
- **Determinism fails** — you likely introduced a HashMap somewhere, or a `time::Instant`, or some non-deterministic primitive. Check the recent diff against L1-L7's code; the bug is wherever a non-deterministic primitive was added.

## Design reflection

Three load-bearing decisions encoded here:

1. **Proptest is dev-dep, not runtime dep.** Property tests run during `cargo test`, not in production. Putting `proptest` in `[dependencies]` would force every consumer of `openhl-clob` to compile and link proptest. The `[dev-dependencies]` discipline keeps the production dependency graph clean.

2. **The Action enum is a simplified intermediate.** Each variant carries raw `u64`s, not the `OrderId(u64)` / `AccountId(u64)` newtype-wrapped versions. **The proptest strategies generate the raw values; the test body wraps them in newtypes before calling `submit`.** This is on purpose — proptest's combinators work most easily with primitive types, and the `as u64` ergonomics save us boilerplate. Newtype enforcement happens at the API boundary (calling `submit`), not inside the test generator.

3. **`determinism` is the load-bearing property for consensus.** A correct-but-non-deterministic matching engine breaks consensus; a deterministic-but-incorrect one is repairable. The test that catches non-determinism is the one that protects the chain's safety. **Naming and prioritizing properties by what they protect — not by what they test — is the discipline.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/clob/Cargo.toml ./crates/clob/Cargo.toml
```

After L8, your `book.rs` mirrors the reference at `55a9dff` (modulo doc comments). `Cargo.toml` has the `[dev-dependencies] proptest` line.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why `cases: 256` and not `1024` or `100`?**
A balance. 256 cases × 3 properties × ~10ms per case ≈ 8 seconds total — fast enough to run on every `cargo test`. 1024 cases would push it to 30+ seconds, becoming a friction in dev iteration. 100 cases would risk missing rare bugs. **Pick a case count that's small enough to run cheaply but large enough to catch common bugs.**

**Q: Why no `cancel` in the proptest actions?**
Because cancel actions complicate the determinism + conservation properties: after a cancel, you need to track which order IDs are still alive. The simplification "submit-only sequences" makes the 3 invariants tractable. Adding cancel-aware properties is a follow-up; the existing 3 invariants are the highest-value ones to get right first.

**Q: What happens when proptest finds a failing input?**
It enters the **shrinking phase**. Starting from the failing input, proptest tries to find the smallest subset / smallest values that still fail. For our test case generators (which produce `Vec<Action>`), shrinking might reduce a 25-action sequence to a 3-action sequence that still reproduces the bug. The minimal sequence is what you debug against — much easier than the original input.

**Q: Can I make `arb_actions` produce only Limit orders?**
Yes — change `arb_action`'s `prop_oneof![3 => limit_action, 1 => market_action]` to `prop_oneof![1 => limit_action]` (or just return `limit_action` directly without the `prop_oneof`). For the invariants we have, Market orders are *useful* (they exercise the discard-remainder path), but if you want to focus testing on Limit-only flows, you can. **proptest strategies are composable.**

## Next lesson (L9)

The matching engine is fully tested. **It's not yet integrated with consensus.** L9 starts Module 4 (Bridge integration): adding `Book` + `pending_fills` fields to `LiveRethEvmBridge`, and a `submit_order` method that routes orders into the CLOB and accumulates resulting Fills in a buffer. After L9, the bridge owns a matching engine; L10 will drain the buffer at `build_payload` time.
````

---

## Seed-file slot

L8 lands in Module 3 (Testing) at sortOrder 1:

```typescript
{
  title: 'Lesson 8 — 3 proptest invariants: 768 random scenarios',
  slug: 'openhl-clob-proptests-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 40,
  xpReward: 80,
  content: `# Lesson 8 — 3 proptest invariants: 768 random scenarios\n\n...`
},
```

## SHA pinning discipline

Same as L1-L7 — `55a9dff` (Stage 8a). After L8, `book.rs`'s prop_tests module mirrors the reference's; `Cargo.toml` has the dev-dep added.

## Style review notes (self-critique before paste)

- **§Plan's "load-bearing benefit of properties over examples"** is the conceptual hook — proptest finds bugs you didn't think to test for.
- **§Step 4's "why `2 *`"** is the load-bearing pedagogical moment in L8 — the conservation math is unintuitive on first read but obvious once you grok "fill_qty appears in `total_in` twice."
- **§Step 6's "determinism is the load-bearing property for consensus"** generalizes the lesson: correctness vs determinism is a real distinction, and the latter is what protects the chain.
- **The 4-item list in §Step 6's anti-fluency** (HashMap, time::Instant, tokio::task, f64) names concrete sources of nondeterminism that *would* fail this test. Hard to argue with concretes.
- **§Test's "proptest caches failing inputs"** introduces a real proptest feature without overwhelming. Worth mentioning since it's how you debug a property failure in practice.
- **Module 3 (Testing) is now complete after L8** — 9 unit + 3 prop tests, all green.
