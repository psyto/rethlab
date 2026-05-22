# Building OpenHL CLOB — L7 draft (EN) — build-along

> Drafted against openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine).
> Course: `building-openhl-clob-en` (track: `reth-l1-architect`).

---

## L7 — `openhl-clob-unit-tests-en`

- **Module:** 3 (Testing), sortOrder 0 within module
- **Course-level sortOrder:** 6 (lesson 7 of 12)
- **Duration:** 35 min
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# Lesson 7 — 9 hand-traced unit tests

## Goal

Concepts you'll grasp in this lesson:

- **Coverage by invariant, not by count** — the 9 tests aren't "9 arbitrary scenarios"; each corresponds to a distinct invariant (empty-book, resting, walks-levels, respects-limit, FIFO time priority, partial-market, cancel-found, cancel-not-found, no-cross). The list of invariants is short and well-defined; that's why 9 is a defensible number.
- **Hand-traced unit tests are the oracle for proptests (L8)** — when a property test fails with a random 25-action sequence, you debug against a hand-traced test that isolates one invariant. Proptests are the amplifier; unit tests are the foundation.
- **Helper functions over builder patterns** — `limit(...)` and `market(...)` with positional args are the cheapest abstraction that removes repetition without adding indirection. Builder patterns would add ceremony for tests that need ~5 lines each.
- **Source layout encodes priority** — placing `book_does_not_cross_after_match` last in source order signals to a maintainer scanning the file: this is the load-bearing safety property. Tests run alphabetically; source order is for humans.
- **`assert_eq!` over `assert!(a == b)`** — `assert_eq!` prints both sides on failure; the actual-value diagnostic is what makes test debugging fast.

Verification:

```bash
cargo test -p openhl-clob
```

…passes **9 tests**.

Specific changes:

You'll have a new `#[cfg(test)] mod tests` block at the bottom of `book.rs` containing:

- **2 helper functions** — `limit(...)` and `market(...)` — that construct `Order` structs with sensible defaults so the test bodies don't repeat the 5-field struct literal everywhere.
- **9 hand-traced scenarios** — each tests a specific invariant the matching engine should maintain.

The 9 tests are your **regression safety net**. If you (or a future contributor) introduces a bug in `submit_limit`, `submit_market`, or `cancel`, at least one of these tests will catch it. Together they're the load-bearing proof that the matching logic from L4-L6 actually works.

## Recap

After L6, your matching engine is functionally complete:

```rust
// book.rs (~190 lines)
pub struct Book { bids, asks }
impl Book {
    pub fn new() -> Self
    pub fn submit(&mut self, order: Order) -> FillResult
    pub fn cancel(&mut self, order_id: OrderId) -> bool
    pub fn best_bid(&self) -> Option<Price>
    pub fn best_ask(&self) -> Option<Price>
    pub fn depth_bid(&self) -> usize
    pub fn depth_ask(&self) -> usize
}
```

`cargo check -p openhl-clob` is clean. **But the engine has no proof it's correct.** Every match could be silently wrong; we haven't asserted anything beyond compilation. L7 fixes that.

## Plan

One block to add at the bottom of `crates/clob/src/book.rs`, after `fn match_at_level` and *outside* `impl Book`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn limit(id: u64, account: u64, side: Side, price: u64, qty: u64) -> Order { ... }
    fn market(id: u64, account: u64, side: Side, qty: u64) -> Order { ... }

    #[test] fn empty_book_has_no_best_prices() { ... }
    #[test] fn resting_limit_creates_bid_or_ask() { ... }
    #[test] fn buy_market_takes_best_ask() { ... }
    #[test] fn limit_buy_walks_asks_within_price() { ... }
    #[test] fn price_time_priority_within_level() { ... }
    #[test] fn market_with_insufficient_liquidity_returns_remaining() { ... }
    #[test] fn cancel_removes_resting_order() { ... }
    #[test] fn cancel_unknown_returns_false() { ... }
    #[test] fn book_does_not_cross_after_match() { ... }
}
```

That's it. No new types, no new methods on `Book`. Just 9 tests + 2 helpers.

The 9 tests are organized in **complexity order**: start with the simplest invariant (empty book has no prices), end with the strongest (book doesn't cross after match — the **safety property** that distinguishes a well-formed orderbook from garbage).

> 🛑 **Predict.** Before scrolling: which of the 9 tests would *fail* if I made the bug `submit_limit::Buy` walks asks **descending** (highest first) instead of ascending? Hint: think about the test that specifically asserts "best ask first."

(Answer: both `buy_market_takes_best_ask` AND `limit_buy_walks_asks_within_price` catch it — but as different bug symptoms. `buy_market_takes_best_ask` catches an **order-of-fills inversion** (`[105, 100]`): the best-first assertion `r.fills[0].price == Price(100)` fails. `limit_buy_walks_asks_within_price` catches a **premature-stop bug**: walking descending, the first ask is 105, the limit is 103, so `price > limit` triggers an immediate stop — and the 100 ask that *should* match is never visited, resulting in zero fills. **Directional bugs would also be caught by randomized tests, but hand-traced tests pinpoint them from two different angles — which test fails first tells you which kind of bug it is.**)

## Walk-through

### Step 1: Set up the test module

In `crates/clob/src/book.rs`, **outside** the `impl Book` block and **after** `fn match_at_level`, add:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn limit(id: u64, account: u64, side: Side, price: u64, qty: u64) -> Order {
        Order {
            id: OrderId(id),
            account: AccountId(account),
            side,
            qty: Qty(qty),
            order_type: OrderType::Limit {
                price: Price(price),
            },
        }
    }

    fn market(id: u64, account: u64, side: Side, qty: u64) -> Order {
        Order {
            id: OrderId(id),
            account: AccountId(account),
            side,
            qty: Qty(qty),
            order_type: OrderType::Market,
        }
    }

    // tests follow...
}
```

Two helper functions. Without them, every test body would say:

```rust
let order = Order {
    id: OrderId(1),
    account: AccountId(100),
    side: Side::Sell,
    qty: Qty(5),
    order_type: OrderType::Limit { price: Price(100) },
};
```

…which is 5 lines of boilerplate per order. With `limit(1, 100, Side::Sell, 100, 5)`, it's 1 line. The helper takes raw `u64`s and wraps them in the appropriate newtypes; that's the only thing it does.

**The argument order matters**: `(id, account, side, price, qty)` for `limit`, `(id, account, side, qty)` for `market`. Memorize it once; every test uses the same convention. Putting `id` first means tests read in chronological order (`limit(1, ...)` is the first order, `limit(2, ...)` is the second).

> 🛑 **Anti-fluency.** "I'll just use a builder pattern — `OrderBuilder::new().id(1).account(100).side(Buy).qty(10).limit_price(100).build()`." **It's more verbose than the 5-field struct literal, defeating the purpose.** Builders shine when fields are optional or vary widely; here, every order has all 5 fields and they're all required. A 5-arg function with positional arguments is faster to write, faster to read at the call site, and immediately tells the reader what an Order needs.

### Step 2: Test 1 — `empty_book_has_no_best_prices`

Inside the `tests` module, after the helpers:

```rust
    #[test]
    fn empty_book_has_no_best_prices() {
        let book = Book::new();
        assert_eq!(book.best_bid(), None);
        assert_eq!(book.best_ask(), None);
        assert_eq!(book.depth_bid(), 0);
        assert_eq!(book.depth_ask(), 0);
    }
```

The simplest possible test: a freshly-constructed `Book` has no prices and zero depth. **If this fails, something is broken in `Book::new()` or in the accessor logic.** Every later test depends on this — if `new()` returns garbage state, nothing else makes sense.

`assert_eq!(book.best_bid(), None)` is the kind of test that looks trivial but earns its keep. The accessors could have returned `Some(Price(0))` (a default-construction bug). `None` is the explicit "no liquidity exists" signal.

### Step 3: Test 2 — `resting_limit_creates_bid_or_ask`

```rust
    #[test]
    fn resting_limit_creates_bid_or_ask() {
        let mut book = Book::new();
        let r = book.submit(limit(1, 100, Side::Buy, 90, 10));
        assert!(r.fills.is_empty());
        assert_eq!(book.best_bid(), Some(Price(90)));
        assert_eq!(book.best_ask(), None);

        let r = book.submit(limit(2, 101, Side::Sell, 100, 5));
        assert!(r.fills.is_empty());
        assert_eq!(book.best_ask(), Some(Price(100)));
    }
```

A Buy Limit @ 90 enters an empty book → no fills, rests as a bid. A Sell Limit @ 100 enters → no fills (bid at 90, ask wants 100, no cross), rests as an ask.

The two assertions per submit are key:
- **`r.fills.is_empty()`** — nothing matched, because there was nothing on the other side.
- **`book.best_bid() == Some(Price(90))`** — the resting order is observable via the accessor.

This is the "rest-the-remainder" path from L4 in action.

### Step 4: Test 3 — `buy_market_takes_best_ask`

```rust
    #[test]
    fn buy_market_takes_best_ask() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5));
        book.submit(limit(2, 101, Side::Sell, 105, 5));

        let r = book.submit(market(99, 200, Side::Buy, 8));
        assert_eq!(r.fills.len(), 2);
        assert_eq!(r.fills[0].price, Price(100)); // best ask first
        assert_eq!(r.fills[0].qty, Qty(5));
        assert_eq!(r.fills[1].price, Price(105));
        assert_eq!(r.fills[1].qty, Qty(3));
        assert_eq!(r.remaining_qty, Qty(0));
        assert_eq!(book.depth_ask(), 1); // ask @ 105 has 2 left
    }
```

Setup: two resting asks at 100 (5 units) and 105 (5 units). A Market buy for 8 units arrives. Expected matching:
- Take 5 from price 100 (cheapest), leaving 3 units to fill.
- Take 3 from price 105 (next cheapest).
- Total filled: 8. Remaining: 0.

Asserts encode this: 2 fills in best-first order, `remaining_qty == 0` (Market fully filled), and ask @ 105 still has 2 units depth.

**This test catches** directional bugs in the asks walk (testing for "best first") and also the "drop empty level" invariant (the 100-priced level should be gone after being fully consumed, but the 105 level should remain with reduced depth).

### Step 5: Test 4 — `limit_buy_walks_asks_within_price`

```rust
    #[test]
    fn limit_buy_walks_asks_within_price() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5));
        book.submit(limit(2, 101, Side::Sell, 105, 5));

        // Buy limit @ 103 — should only fill the 100-priced level.
        let r = book.submit(limit(99, 200, Side::Buy, 103, 10));
        assert_eq!(r.fills.len(), 1);
        assert_eq!(r.fills[0].price, Price(100));
        assert_eq!(r.fills[0].qty, Qty(5));
        // Remainder rests as a bid @ 103.
        assert_eq!(book.best_bid(), Some(Price(103)));
        assert_eq!(book.depth_bid(), 1);
    }
```

Same starting book as test 3 (asks at 100 and 105). But this time the incoming order is a **Limit Buy @ 103** for 10 units.

Expected:
- The 100-priced ask is at-or-better (100 ≤ 103) — match 5 units.
- The 105-priced ask is **not** at-or-better (105 > 103) — stop matching.
- Remaining 5 units rest as a new bid at 103.

The difference from test 3 is the **limit price check** stops the walk early. Test 3's Market buy kept walking past 100 (Market takes any price); test 4's Limit buy stops at 103.

Together these two tests prove L4's price-check logic works in both directions: Market (no check, walk everything) and Limit (check, stop at limit).

### Step 6: Test 5 — `price_time_priority_within_level`

```rust
    #[test]
    fn price_time_priority_within_level() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5)); // first
        book.submit(limit(2, 101, Side::Sell, 100, 5)); // same price, later

        let r = book.submit(market(99, 200, Side::Buy, 7));
        assert_eq!(r.fills.len(), 2);
        assert_eq!(r.fills[0].maker_order_id, OrderId(1)); // first in, first out
        assert_eq!(r.fills[0].qty, Qty(5));
        assert_eq!(r.fills[1].maker_order_id, OrderId(2));
        assert_eq!(r.fills[1].qty, Qty(2));
    }
```

Two resting Sells at the **same price** (100), but submitted in order: order 1, then order 2. A Market buy for 7 units arrives.

Expected:
- Order 1 (placed first) fills first — 5 units.
- Order 2 (placed second) fills next — 2 units.

This is the **time priority** half of "price-time priority." Within a price level, orders are FIFO — first in is first out. The `VecDeque<RestingOrder>` we chose in L3 implements this naturally via `push_back` (new orders go to the back) + `pop_front` (matched orders come from the front).

**This test would fail** if we accidentally used `Vec<RestingOrder>` and did `Vec::remove(0)` (still correct, but shifts the queue — O(n) per match), or if we used `VecDeque::push_front` instead of `push_back` (newest-first, which would be price-anti-time-priority).

### Step 7: Tests 6, 7, 8 — `market_with_insufficient_liquidity`, `cancel_removes_resting_order`, `cancel_unknown_returns_false`

```rust
    #[test]
    fn market_with_insufficient_liquidity_returns_remaining() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 3));

        let r = book.submit(market(99, 200, Side::Buy, 10));
        assert_eq!(r.fills.len(), 1);
        assert_eq!(r.fills[0].qty, Qty(3));
        assert_eq!(r.remaining_qty, Qty(7)); // market discards remainder
        assert_eq!(book.depth_ask(), 0);
    }

    #[test]
    fn cancel_removes_resting_order() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Buy, 90, 10));
        assert_eq!(book.depth_bid(), 1);

        assert!(book.cancel(OrderId(1)));
        assert_eq!(book.depth_bid(), 0);
        assert_eq!(book.best_bid(), None);
    }

    #[test]
    fn cancel_unknown_returns_false() {
        let mut book = Book::new();
        assert!(!book.cancel(OrderId(999)));
    }
```

Three tests in one step because each is short:

- **Test 6 (`market_with_insufficient_liquidity_returns_remaining`)**: a single ask of 3 units, a Market buy for 10 — exercise L5's "Market discards remainder" semantic. `remaining_qty == 7` (the unfilled portion). Book is empty afterward.
- **Test 7 (`cancel_removes_resting_order`)**: a resting bid, then cancel it. Verify `cancel` returns `true`, depth drops to 0, `best_bid()` returns `None` (the empty-level cleanup from L6).
- **Test 8 (`cancel_unknown_returns_false`)**: cancel an OrderId that was never submitted. Returns `false`, book is unchanged (the empty book has nothing in it anyway).

The pairing of tests 7 + 8 catches a class of bugs in `cancel`: if `cancel` returned `true` indiscriminately, test 8 would catch it; if it returned `false` for a valid cancel, test 7 would catch it. **Tests that check the success path + failure path together** are more robust than either alone.

### Step 8: Test 9 — `book_does_not_cross_after_match`

The most important test, last:

```rust
    #[test]
    fn book_does_not_cross_after_match() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5));
        book.submit(limit(2, 101, Side::Buy, 95, 5));
        // Spread: bid 95, ask 100. No cross.
        let bid = book.best_bid().unwrap();
        let ask = book.best_ask().unwrap();
        assert!(bid < ask);

        // Now a buy @ 100 — fully fills, no resting.
        book.submit(limit(3, 102, Side::Buy, 100, 5));
        // Best bid is still 95 (from order 2). Ask is gone.
        assert_eq!(book.best_bid(), Some(Price(95)));
        assert_eq!(book.best_ask(), None);
    }
```

The **no-crossed-book invariant**: at all times, `best_bid < best_ask` (or one side is empty). A crossed book — `best_bid >= best_ask` — would mean there's a buy and a sell that should have matched but didn't. **It's a soundness violation**: the matching engine has somehow let two orders coexist on the book that should have collided.

This test setup:
1. Sell @ 100, Buy @ 95 → spread = (95, 100), no cross. Assert `bid < ask`.
2. Incoming Buy @ 100 → matches the 100-priced ask exactly (5 units → 5 units), no leftover to rest.
3. Final state: ask is gone (consumed), bid is still 95 (order 2 was untouched).

The final assertions check:
- `best_bid() == Some(Price(95))` — order 2 is still resting.
- `best_ask() == None` — order 1's ask was fully consumed.

**Why this is the strongest test**: the no-crossed-book invariant is what makes an orderbook *correct*. A book that crosses is showing you trades that should have happened but didn't — a fundamental matching engine failure. If this test passes, you have evidence (not proof — that's L8's proptest) that the engine maintains the safety property.

> 🛑 **Anti-fluency.** "Why not write 100 unit tests instead of 9? More coverage is better." **More tests aren't more coverage if they exercise the same paths.** These 9 tests were chosen to exercise *distinct invariants*: empty-book, resting, market-walks-levels, limit-respects-price, time-priority, partial-market, cancel-found, cancel-not-found, no-cross. Each one tests a property the other 8 don't. **Writing 100 tests that all exercise "buy crosses ask" gives you 99 redundant tests.**

## Test

```bash
cargo test -p openhl-clob
```

Expected:

```
running 9 tests
test tests::book_does_not_cross_after_match ... ok
test tests::buy_market_takes_best_ask ... ok
test tests::cancel_removes_resting_order ... ok
test tests::cancel_unknown_returns_false ... ok
test tests::empty_book_has_no_best_prices ... ok
test tests::limit_buy_walks_asks_within_price ... ok
test tests::market_with_insufficient_liquidity_returns_remaining ... ok
test tests::price_time_priority_within_level ... ok
test tests::resting_limit_creates_bid_or_ask ... ok

test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Tests run in alphabetical order (Rust's default). All 9 pass.

Common errors and fixes:

- **`error: cannot find function 'limit' in this scope`** inside tests — your `fn limit(...)` is outside the `mod tests` block. Move it inside, after the `use super::*;` line.
- **Test fails with `assertion failed: r.fills[0].price == Price(100)`** — you got `Price(105)` instead. The bug is in `submit_market` or `submit_limit` — you're walking the wrong direction. Check the `keys().next()` call: for asks, you want the lowest first; for bids (with `Reverse<Price>`), you want the highest first (which is what `keys().next()` gives you when the key is `Reverse<Price>`).
- **`assertion failed: r.fills[0].maker_order_id == OrderId(1)`** in `price_time_priority_within_level` — you got `OrderId(2)`, meaning the LATER-submitted order matched first. Your queue is acting LIFO. Check `submit_limit`'s rest path: it should `push_back` (FIFO), not `push_front` (LIFO).
- **`assertion failed: book.depth_ask() == 0`** in `market_with_insufficient_liquidity_returns_remaining` — the ask wasn't cleaned up. Your `submit_market`'s loop is missing the `if queue.is_empty() { self.asks.remove(&best_price) }` step (or its equivalent for bids in the Sell case).

## Design reflection

Three load-bearing decisions encoded here:

1. **Helper functions over builder patterns or struct literals.** `limit(...)` and `market(...)` are 5- and 4-argument functions with positional arguments. They're fast to write, fast to read, and require zero documentation (the function name + argument positions are self-explanatory). **The right amount of abstraction is "just enough to remove repetition."**

2. **9 tests is a finite, defensible set.** Each test corresponds to a specific invariant: empty-book, resting, walks-levels, respects-limit, FIFO, partial-market, cancel-found, cancel-not-found, no-cross. We didn't write 100 tests. **The list of invariants is short and well-defined; coverage should be by invariant, not by count.**

3. **`book_does_not_cross_after_match` is positioned last.** Tests run in alphabetical order, so this specific test's placement in *source order* doesn't affect run order. But for *reading* order (a maintainer scanning the file top-to-bottom), the strongest safety property — the one that can only be validated *after* all 8 prior tests (resting / walks / FIFO / cancel / ...) have already established their preconditions — caps the file as the grand finale. It's the terminal note that says: "if you got this far, the engine's correctness stands as a framework." **Source layout encodes priority signals about what the core defensive boundary is.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
```

After L7, your `book.rs` has the test module (9 tests + 2 helpers) at the bottom. The reference at `55a9dff` is identical except for doc-comment wording. The reference also contains a `mod prop_tests` block — that's L8's scope.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why are the helpers `limit` and `market` (not `pub limit` and `pub market`)?**
Because they're private to the `mod tests` block. Other modules don't need to construct test Orders. Keeping them private is the right encapsulation: tests can use them freely, but the test helpers don't leak into the public API of `openhl-clob`.

**Q: Should I parametrize the tests, e.g., use a property test "for any incoming order, the book invariants hold"?**
L8 does exactly that — 3 proptest invariants exercising 768 random scenarios. But proptests rely on hand-traced tests as their oracle: when a proptest fails, you want a small hand-traced test you can isolate to. **Hand-traced unit tests are the foundation; proptests are the amplifier.**

**Q: What about tests for sell-side limit orders?**
Good question. The 9 tests focus on buy-side scenarios because they're more intuitive to trace ("walk asks lowest-first" is more visualisable than "walk bids highest-first"). Sell-side tests aren't necessary for correctness *if* `submit_limit::Sell` is the structural mirror of `submit_limit::Buy` (which L4 established). **The decisive reason: L8's proptests generate action sequences that randomly mix Buy and Sell across 256 cases × 3 invariants = 768 scenarios. Mirror-broken bugs (inverted inequality, missing `Reverse<Price>` on the bid side) get caught mercilessly by `no_crossed_book` and `qty_conservation`.** Hand-trace is the minimum check that one side's invariants are wired up correctly; proptest provides the cross-side chaos coverage. That division of labor saves you writing 9 sell-side mirror tests by hand. If you're still paranoid, add a few — they'd mirror tests 3, 4, 5 from this set.

**Q: Why `assert_eq!` instead of `assert!`?**
`assert_eq!(a, b)` prints both values on failure, while `assert!(a == b)` prints only "left == right" with no values. For test debugging, knowing the actual value the engine produced is critical. `assert_eq!` is strictly better when the comparison is equality.

## Next lesson (L8)

You have 9 hand-traced tests. **They cover specific scenarios you thought of.** L8 adds **3 proptest invariants** — properties that hold for *any* sequence of submit+cancel actions:

- **`qty_conservation`**: total quantity entering the book equals total filled + total resting.
- **`no_crossed_book`**: `best_bid < best_ask` always holds (the safety property test 9 hand-traced, now random-tested).
- **`determinism`**: same action sequence produces the same fills + same book state.

256 random cases × 3 invariants = 768 random scenarios. If any one of them violates an invariant, proptest **automatically shrinks** the failing sequence to a minimal counterexample. That's the load-bearing benefit of properties over examples.
````

---

## Seed-file slot

L7 lands in **new Module 3 (Testing)** at sortOrder 0:

```typescript
modules: {
  0: { title: 'Orientation', sortOrder: 0 },
  1: { title: 'CLOB types', sortOrder: 1 },
  2: { title: 'Matching engine', sortOrder: 2 },
  3: { title: 'Testing', sortOrder: 3 },  // M3 starts here
  // 4: { title: 'Bridge integration', sortOrder: 4 }, — L9+
  // 5: { title: 'Capstone', sortOrder: 5 }, — L12
},
```

```typescript
{
  title: 'Lesson 7 — 9 hand-traced unit tests',
  slug: 'openhl-clob-unit-tests-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 35,
  xpReward: 70,
  content: `# Lesson 7 — 9 hand-traced unit tests\n\n...`
},
```

## SHA pinning discipline

Same as L1-L6 — `55a9dff` (Stage 8a). After L7, `book.rs`'s test module mirrors the reference's first 9 unit tests; L8 adds the `mod prop_tests` block.

## Style review notes (self-critique before paste)

- **§Plan's "complexity order" framing** — tests start simple (empty book), end strong (no-crossed-book). Mirrors how the lesson narrative builds.
- **§Step 1's argument-order callout** (`(id, account, side, price, qty)` for limit) preempts confusion when reading later tests.
- **Step-by-step walk through each test** in §Step 2-§Step 8 lets the reader understand what each test catches *before* they type it. Important because tests can look superficially similar but exercise distinct invariants.
- **§Step 8's "why this is the strongest test"** distinguishes "tests that compile" from "tests that prove the engine is sound." The no-crossed-book invariant is the engine's safety property.
- **§Anti-fluency about builders vs helpers** answers the natural "shouldn't I use a builder?" question for any reader who's seen too much enterprise Java.
- **§Common questions on sell-side tests** preempts paranoid-reader feedback.
- **L8 preview names the 3 proptest invariants** (qty_conservation, no_crossed_book, determinism) — sets up the contrast between examples (L7) and properties (L8).
