# Building OpenHL CLOB — L6 draft (EN) — build-along

> Drafted against openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine).
> Course: `building-openhl-clob-en` (track: `reth-l1-architect`).

---

## L6 — `openhl-clob-cancel-en`

- **Module:** 2 (Matching engine), sortOrder 3 within module
- **Course-level sortOrder:** 5 (lesson 6 of 12)
- **Duration:** 20 min
- **XP reward:** 50
- **Type:** CONTENT

### Content

````markdown
# Lesson 6 — `cancel` — pulling an order off the book

## Goal

Concepts you'll grasp in this lesson:

- **`BTreeMap::retain` does "mutate + drop empty entry" in one closure** — the same callback both removes the matching order from a queue *and* returns whether to keep the level. One pass; the empty-level invariant from `submit` is maintained automatically.
- **O(n) linear scan is the right v0 choice** — adding `HashMap<OrderId, (Side, Price)>` for O(1) cancel adds a second data structure to keep in sync, extra memory, extra cache pressure. Don't optimize what doesn't show up in profiling; add the index when the scan does.
- **`bool` return is the smallest honest shape** — `Option<RestingOrder>` would leak the private `RestingOrder` type from L3; `Result<(), CancelError>` would force callers to treat "not found" as an error, but cancellation idempotency (calling cancel twice is safe) is a feature.
- **The empty-level cleanup is what keeps `best_bid` honest** — if `retain` left a phantom empty queue at price 100, `best_bid()` would report 100 even with zero liquidity, and the next sell would match at a phantom price. The cleanup is the same invariant `submit` enforces; `cancel` must enforce it too.

Verification:

```bash
cargo check -p openhl-clob
```

…still compiles.

Specific changes:

You'll have one new method on `Book`:

- **`cancel(&mut self, order_id: OrderId) -> bool`** — searches both bid and ask sides for an order with the given id, removes it if found, drops the price level if cancellation leaves it empty. Returns `true` if removed, `false` if not found.

About 25 LOC. After L6, the matching engine is **functionally complete**. Submit (Limit + Market) + cancel = the full v0 surface. L7 starts the test suite.

## Recap

After L5, `Book` has:

```rust
impl Book {
    pub fn new() -> Self { ... }                          // L3
    pub fn best_bid(&self) -> Option<Price> { ... }       // L3
    pub fn best_ask(&self) -> Option<Price> { ... }       // L3
    pub fn depth_bid(&self) -> usize { ... }              // L3
    pub fn depth_ask(&self) -> usize { ... }              // L3
    pub fn submit(&mut self, order: Order) -> FillResult { ... }  // L4 + L5
    // submit_limit, submit_market (private)
}
```

What's missing: a way to **remove** a resting order. If a user submits a Limit Buy at 100 that rests on the book, they currently have no way to take it off. L6 adds that.

## Plan

One method, one file. In `crates/clob/src/book.rs`, add `cancel` to the existing `impl Book` block:

1. **Search bids first** via `BTreeMap::retain` — a closure that removes the matching order from its queue and reports whether the queue is now non-empty.
2. **If found in bids**, return `true` immediately.
3. **Otherwise search asks** the same way.
4. **Return `found`** (true if found in asks, false if not found anywhere).

The trick is `retain`. We use the same closure to do **two jobs**:

- **Mutate the queue** (remove the order if its id matches).
- **Signal whether to drop the BTreeMap entry** (return `!queue.is_empty()`).

`retain` calls the closure on every (key, value) pair and removes the pair if the closure returns `false`. By combining the queue-mutation with the empty-check return, we get the "remove + clean up empty levels" invariant for free.

> 🛑 **Predict.** Before scrolling: a user submits a Limit Buy at 100 for 50 units (which fully rests on the book), then submits Cancel for that order's id. After cancel, **what should `best_bid()` return**? Hint: think about whether the price level still exists in the map after the cancellation.

(Answer: `None`. The order was the only one at price 100, so canceling it leaves the queue empty, which means `retain` drops the level from the map, which means `bids.keys().next()` returns `None`, which means `best_bid()` returns `None`. **The empty-level cleanup is what keeps `best_bid` honest about whether liquidity actually exists.**)

## Walk-through

### Step 1: Add `cancel` to the impl block

In `crates/clob/src/book.rs`, inside `impl Book { ... }` (after `submit_market`), add:

```rust
    /// Cancel a resting order by id. O(n) linear scan; fine for v0 book sizes.
    /// Returns true if the order was found and removed. Empty price levels
    /// left behind by cancellation are also dropped, so `best_bid`/`best_ask`
    /// stay consistent with `depth_bid`/`depth_ask`.
    pub fn cancel(&mut self, order_id: OrderId) -> bool {
        let mut found = false;
        self.bids.retain(|_, queue| {
            if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id) {
                queue.remove(pos);
                found = true;
            }
            !queue.is_empty()
        });
        if found {
            return true;
        }
        self.asks.retain(|_, queue| {
            if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id) {
                queue.remove(pos);
                found = true;
            }
            !queue.is_empty()
        });
        found
    }
```

Walk it carefully:

1. **`let mut found = false`** — local flag. Becomes `true` the moment we find and remove the order.
2. **`self.bids.retain(|_, queue| { ... })`** — `retain` walks every (`Reverse<Price>`, `VecDeque<RestingOrder>`) pair. The closure mutates `queue` and returns `bool`: `false` drops the entry, `true` keeps it.
3. **`if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id)`** — search only if we haven't already found it. `iter().position()` returns `Option<usize>` — the index of the first element matching the predicate. Combined with `if let`, this is the idiomatic Rust pattern for "do something with the index if it exists."
4. **`queue.remove(pos)`** — `VecDeque::remove(index)` pulls out the element at that index. It returns `Option<T>` (the removed element), which we ignore here. **`VecDeque::remove` is O(n)** — it shifts subsequent elements one slot left. For a queue of a few hundred orders, that's microseconds.
5. **`found = true`** — set the flag so subsequent levels don't get scanned. **This is the load-bearing optimization** — once we find the order, we still walk the rest of the levels (to check for empty queues that might exist from prior cancellations), but we skip the linear scan inside each remaining queue.
6. **`!queue.is_empty()`** — the return value. If the queue is now empty (because we just removed its last order, or it was empty for some other reason), return `false` so `retain` drops the entry. Otherwise return `true` to keep it.
7. **`if found { return true }`** — short-circuit. If we already found and removed the order in bids, no need to search asks.
8. **`self.asks.retain(...)`** — same logic against asks. The closure body is identical (no key differences — both maps use `VecDeque<RestingOrder>` as values).
9. **`found`** — the final return. If we found in bids, we returned `true` earlier; if we found in asks, `found` got set to `true` and we return that; if neither, `found` stays `false`.

> 🛑 **Anti-fluency.** "I'll just iterate over the BTreeMap, find the entry, remove the order, then iterate again to drop empty levels." **Two passes is wasteful, and worse, it splits the invariant across two places.** With `retain`, the "remove order" and "drop empty level" decisions are both encoded in one closure. There's no window between "removed the order" and "checked if the level is empty" where the data structure is in an inconsistent state. **One closure, two jobs, one invariant.**

### Step 2: Verify the new method has a path through both branches

`cargo check -p openhl-clob` should compile cleanly. No warnings.

The unused-import warnings from previous lessons should all be gone — `cancel` doesn't introduce new imports (everything it uses, `OrderId` + `VecDeque::remove` + the BTreeMap surface, was already in scope).

If you want to verify the `if let && pattern` syntax is OK with your Rust version (it's stable in 1.65+):

```bash
rustc --version
# Should report 1.95.x or later from the course prerequisites.
```

If you're stuck on an older Rust, the equivalent without let-chains is:

```rust
if !found {
    if let Some(pos) = queue.iter().position(|o| o.id == order_id) {
        queue.remove(pos);
        found = true;
    }
}
```

Same behavior, two extra lines, no `let && let` chain.

## Test

```bash
cargo check -p openhl-clob
```

Clean. The matching engine is now feature-complete — `book.rs` has `new`, all 4 accessors, `submit` (with both Limit and Market paths), and `cancel`. No `todo!()` left.

Smoke test (delete after, like L4/L5):

```rust
#[cfg(test)]
mod smoke {
    use super::*;

    fn limit_buy(id: u64, account: u64, qty: u64, price: u64) -> Order {
        Order {
            id: OrderId(id),
            account: AccountId(account),
            side: Side::Buy,
            qty: Qty(qty),
            order_type: OrderType::Limit { price: Price(price) },
        }
    }

    #[test]
    fn cancel_removes_resting_order() {
        let mut book = Book::new();
        // Rest a buy at 100, then a buy at 99 (different price levels).
        book.submit(limit_buy(1, 1, 30, 100));
        book.submit(limit_buy(2, 2, 30, 99));
        assert_eq!(book.best_bid(), Some(Price(100)));
        assert_eq!(book.depth_bid(), 2);

        // Cancel order 1 — the 100-price level should be gone.
        assert!(book.cancel(OrderId(1)));
        assert_eq!(book.best_bid(), Some(Price(99))); // 99 is now the best
        assert_eq!(book.depth_bid(), 1);

        // Cancel again — already removed, should return false.
        assert!(!book.cancel(OrderId(1)));
    }

    #[test]
    fn cancel_searches_both_sides() {
        let mut book = Book::new();
        // Resting Sell at 100, no bids.
        book.submit(Order {
            id: OrderId(7),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
        assert!(book.cancel(OrderId(7)));
        assert_eq!(book.best_ask(), None);
    }

    #[test]
    fn cancel_nonexistent_returns_false() {
        let mut book = Book::new();
        book.submit(limit_buy(1, 1, 30, 100));
        assert!(!book.cancel(OrderId(99))); // not in the book
        assert_eq!(book.depth_bid(), 1); // resting order untouched
    }
}
```

`cargo test -p openhl-clob smoke`. All three should pass. **Then delete the smoke module** — L7 brings the real test suite.

Common errors and fixes:

- **`error: 'retain' has no method named 'retain' on BTreeMap<...>`** — typo or wrong version. `BTreeMap::retain` is stable since Rust 1.53. Check `rustc --version`.
- **`error: 'position' has no method named 'position'`** — `iter().position()` is on the `Iterator` trait, which is in scope by default in `std`. If your closure took `queue.position(|o| ...)` (without `iter()`), it won't compile. Use `queue.iter().position(...)`.
- **Cancel returns true but `best_bid()` still shows the cancelled order's price** — your `retain` closure isn't returning `!queue.is_empty()` correctly. Probably returning `true` unconditionally. Check the closure body's last expression.
- **`cancel` removes the wrong order** — your `position` predicate is checking the wrong field. The compare should be `o.id == order_id` (matching by OrderId), not `o.account == order_id` or similar.

## Design reflection

Three load-bearing decisions encoded here:

1. **`retain` for the "remove + cleanup" combo.** Two separate operations done in one closure pass: mutate the queue, decide whether to drop the entry. This is `retain`'s exact use case. Alternatives (iterate-then-cleanup, or `BTreeMap::iter_mut` plus manual collection of empty keys) would split the invariant across more code. **When a method exists that exactly matches your operation, use it.**

2. **O(n) linear scan is fine for v0.** Real exchanges have thousands or tens of thousands of resting orders. For v0 openhl with hundreds, the scan is microseconds. Adding a `HashMap<OrderId, (Side, Price)>` index would make cancel O(1) but also adds: a second data structure to keep in sync with the BTreeMaps, additional memory, additional cache pressure. **Don't optimize what doesn't show up in profiling.** When openhl outgrows v0 scale, add the index; until then, the scan is the right shape.

3. **Cancel returns `bool`, not `Option<RestingOrder>` or a `Result<(), CancelError>`.** Returning the removed order would expose `RestingOrder` (intentionally a private type from L3). Returning a `Result` would force callers to handle the "not found" case as an error — but cancellation idempotency is a feature, not a bug (calling cancel twice should be safe). `bool` cleanly says "I did the work or I didn't" without leaking internals or forcing error-handling. **Pick the smallest return shape that's honest about what happened.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
```

After L6, your `book.rs` should be **functionally identical** to the reference at `55a9dff`. The remaining differences are doc comments / whitespace and the test module at the bottom — L7-L8 will add the 9 unit tests + 3 proptest invariants the reference has.

Return:

```bash
git checkout main
```

## Common questions

**Q: What's the cost of NOT clearing empty levels in `retain`?**
Eventually `best_bid()` returns a price even though no orders exist at that level. Then a Sell limit at slightly below that "best" gets matched at the phantom price, fills against zero quantity (which `match_at_level` would handle weirdly), and the engine's invariants drift. The empty-level cleanup is the invariant `submit` already maintains; `cancel` must maintain it too.

**Q: Why is the `if !found &&` guard inside the closure necessary?**
Without it, `retain` would scan every level looking for the order, even after we found and removed it from an earlier level. The match would happen at most once (the order is unique by `OrderId`), so the `found` flag is more of an optimization than a correctness fix. But: setting `found = true` on the first match means subsequent levels skip the `iter().position()` call, which is the O(k) work per level. **Optimization through early-out.**

**Q: What if two different orders had the same `OrderId`?**
Then `cancel` would remove the first one it finds (probably from bids, since they're scanned first). The matching engine assumes `OrderId` is unique per book — caller responsibility. The newtype + `pub u64` field design in L1 makes this caller's job: they construct the ID and they own its uniqueness.

**Q: Why not use `position` on each VecDeque, get a `(Reverse<Price>, position)`, then handle removal outside `retain`?**
You'd need to borrow the BTreeMap immutably to find the position, then borrow it mutably to remove. Rust's borrow checker would reject that without a `clone()` of the position. The `retain` approach holds the mutable borrow throughout — simpler.

## Next lesson (L7)

The matching engine compiles. **What it can't do**: prove it works. L7 starts the test module — 9 hand-traced unit tests covering the scenarios you'd expect: empty book matching, FIFO time priority within a price level, market order liquidity exhaustion, partial fills across multiple price levels, cancel + re-submit, no-crossed-book invariant after matches. Each test walks one specific path through the engine; together they're a regression suite for the matching logic you've built so far.
````

---

## Seed-file slot

L6 lands in Module 2 (Matching engine) at sortOrder 3:

```typescript
{
  title: 'Lesson 6 — cancel — pulling an order off the book',
  slug: 'openhl-clob-cancel-en',
  type: 'CONTENT',
  sortOrder: 3,
  duration: 20,
  xpReward: 50,
  content: `# Lesson 6 — \`cancel\` — pulling an order off the book\n\n...`
},
```

## SHA pinning discipline

Same as L1-L5 — `55a9dff` (Stage 8a). After L6, the reader's `book.rs` should be functionally identical to the reference. L7-L8 add the test module at the bottom.

## Style review notes (self-critique before paste)

- **§Plan's "two jobs in one closure" framing** is the central teaching: `retain` is the idiom that handles both "mutate the queue" and "drop the entry" in one pass, with no inconsistent intermediate state.
- **§Predict's concrete trace** (cancel the only resting order at a price → best_bid becomes None) sets up the empty-level cleanup story.
- **Step 1's 9-point breakdown** of the function walks each line; the closure is 4 lines but each has a specific role.
- **§Common questions on `if !found &&` guard** answers "why is this even there?" — it's an optimization, not a correctness fix.
- **3 anti-fluency callouts** — (a) why one closure not two passes (the "split invariant" trap), (b) why O(n) is fine for v0, (c) why bool return instead of Result/Option.
- **§Design reflection's "pick the smallest return shape that's honest"** generalizes — applies any time you're choosing between bool/Option/Result returns.
