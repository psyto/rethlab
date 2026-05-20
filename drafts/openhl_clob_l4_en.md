# Building OpenHL CLOB — L4 draft (EN) — build-along

> Drafted against openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine).
> Course: `building-openhl-clob-en` (track: `reth-l1-architect`).

---

## L4 — `openhl-clob-submit-limit-en`

- **Module:** 2 (Matching engine), sortOrder 1 within module
- **Course-level sortOrder:** 3 (lesson 4 of 12)
- **Duration:** 45 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# Lesson 4 — `submit` for Limit orders + `match_at_level`

## Goal

Concepts you'll grasp in this lesson:

- **Buy and Sell are structural mirrors, not generic abstractions** — the Buy branch walks asks ascending; Sell walks bids descending. Two near-identical functions read more clearly than one fully-generic helper with boolean-flag puzzles inside.
- **Walk-while-crossing is the matching engine's core loop** — `while remaining > 0 && best_opposite_price crosses limit { match_at_level; advance/drop level }`. Once you see this shape, market orders in L5 fall out as "the same loop minus the price check."
- **Empty-queue invariant must be maintained on every mutation** — `if queue.is_empty() { remove(price) }` after each match. If an empty queue is left in the map, `best_bid()` lies and the no-crossed-book invariant breaks.
- **Return value describes what happened to the call; book state describes what is** — `FillResult::remaining_qty` is `Qty(0)` for Limit (whatever didn't fill went to rest); to know the rested remainder, query `best_bid` / `depth_bid` separately. Don't mix the two contracts.
- **`match_at_level` as a free function names its scope** — no `self`; it operates on data the caller has already extracted (queue + remaining). Function signature is documentation.

Verification:

```bash
cargo check -p openhl-clob
```

…still compiles.

Specific changes:

Your `Book` can now accept **Limit orders** (Buy + Sell) and produce real `Fill`s. Market orders are still `todo!()` — that's L5.

What you'll write:

- **`submit()`** — the dispatch method that routes to `submit_limit` or `submit_market` based on `order.order_type`.
- **`submit_limit()`** — the meat: walks the opposite side of the book, matches at-or-better than the limit price, rests any unfilled remainder back on the book.
- **`match_at_level()`** — a private helper called from `submit_limit` (and from `submit_market` in L5) that does the actual fill at a single price level, mutating both the maker queue and the taker's remaining quantity.

After L4 you'll have **~150 lines of book.rs**. Buy + Sell Limit orders both work; Market still panics with `todo!`.

## Recap

After L3, `book.rs` has:

```rust
pub struct Book {
    bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>,
    asks: BTreeMap<Price, VecDeque<RestingOrder>>,
}

struct RestingOrder { id: OrderId, account: AccountId, qty: Qty }

impl Book {
    pub fn new() -> Self { ... }
    pub fn best_bid(&self) -> Option<Price> { ... }
    pub fn best_ask(&self) -> Option<Price> { ... }
    pub fn depth_bid(&self) -> usize { ... }
    pub fn depth_ask(&self) -> usize { ... }
}
```

**No way to put an order in.** That's what L4 fixes.

## Plan

Three additions, all in `crates/clob/src/book.rs`:

1. **`submit()` dispatcher** — 1 `match` over `OrderType`. Limit → `submit_limit`; Market → `todo!()` for now.
2. **`submit_limit()` body** — about 60 lines. Buy walks asks ascending, matches while `ask_price <= limit`. Sell walks bids descending, matches while `bid_price >= limit`. Unfilled remainder rests on the book (entering as a `RestingOrder`).
3. **`match_at_level()` helper** — about 25 lines. Pops or shrinks the maker at the front of a queue, returns a single `Fill`, mutates the taker's `remaining` quantity.

This is **most of the matching engine**. L5 adds Market (which is `submit_limit` minus the price check + minus the resting step). L6 adds cancel. **The core of the matching engine is this lesson.**

> 🛑 **Predict.** Before scrolling: a Limit Buy order at price 100 walks the asks from cheapest. Suppose the asks look like `{ Price(98): [O_a], Price(99): [O_b, O_c], Price(101): [O_d] }`. The buyer wants to buy 50 units; each resting order has 30 units. **In what order do fills happen? What's the final state of the book?** Hint: walk asks from `keys().next()` and match each level until you're full or the next level exceeds your limit.

(Answer: fills are `[Fill@98 for 30, Fill@99 for 20]`. After the trade, `O_a` is gone, `O_b` has 10 units left, `O_c` is untouched at 30, `O_d` is untouched at 30. The buyer paid less than the limit (98 + 99 vs 100) — that's the "at-or-better" rule.)

## Walk-through

### Step 1: Add the `submit()` dispatcher

In `crates/clob/src/book.rs`, inside the existing `impl Book { ... }` block (right after `new()`), add:

```rust
    /// Submit a taker order. Limit orders rest any unfilled remainder on the
    /// book; Market orders discard it (returned via `remaining_qty`).
    pub fn submit(&mut self, order: Order) -> FillResult {
        match order.order_type {
            OrderType::Limit { price } => self.submit_limit(order, price),
            OrderType::Market => todo!("Market orders land in L5"),
        }
    }
```

3 lines of body. The dispatcher is intentionally tiny — all the matching logic lives in `submit_limit` and (eventually) `submit_market`. **The dispatcher's only job is type-driven routing**, not matching.

`todo!()` is the right placeholder here: it panics with a clear message at runtime if a Market order is submitted, but compiles cleanly. L5 will replace it with a real `self.submit_market(order)` call.

> 🛑 **Anti-fluency.** "Why not write submit() inline as one big match with the matching logic inside each arm?" **Because then `submit_limit` and `submit_market` would be hidden inside the dispatcher's match arms.** Two effects: (1) the public method `submit` grows to 100+ lines and is hard to read at a glance; (2) testing each path becomes harder (the test imports `Book::submit` but has to construct an `Order` with the right `order_type` to exercise a specific path). Pulling `submit_limit` / `submit_market` out as named functions makes them addressable and testable.

### Step 2: Start writing `submit_limit` — the dispatcher's body

Below `submit()`, still inside `impl Book`:

```rust
    fn submit_limit(&mut self, order: Order, limit_price: Price) -> FillResult {
        let mut remaining = order.qty;
        let mut fills = Vec::new();

        match order.side {
            Side::Buy => {
                // Buy walks asks from cheapest; matches while ask <= limit.
                loop {
                    if remaining.0 == 0 {
                        break;
                    }
                    let Some(best_price) = self.asks.keys().next().copied() else {
                        break;
                    };
                    if best_price > limit_price {
                        break;
                    }
                    let queue = self
                        .asks
                        .get_mut(&best_price)
                        .expect("price level exists by construction");
                    fills.push(match_at_level(&order, best_price, queue, &mut remaining));
                    if queue.is_empty() {
                        self.asks.remove(&best_price);
                    }
                }
            }
            Side::Sell => {
                // Sell walks bids from highest; matches while bid >= limit.
                loop {
                    if remaining.0 == 0 {
                        break;
                    }
                    let Some(best_rev) = self.bids.keys().next().copied() else {
                        break;
                    };
                    let best_price = best_rev.0;
                    if best_price < limit_price {
                        break;
                    }
                    let queue = self
                        .bids
                        .get_mut(&best_rev)
                        .expect("price level exists by construction");
                    fills.push(match_at_level(&order, best_price, queue, &mut remaining));
                    if queue.is_empty() {
                        self.bids.remove(&best_rev);
                    }
                }
            }
        }

        // (rest-the-remainder logic comes next)
        FillResult { fills, remaining_qty: Qty(0) }
    }
```

This is the matching loop. Walk it carefully. The Buy branch:

1. **Loop forever, breaking on conditions.** Three exits: (a) taker is fully filled, (b) book is empty on this side, (c) the cheapest ask is more expensive than the limit.
2. **`self.asks.keys().next().copied()`** — the cheapest ask price. `.copied()` because we want a `Price` value, not `&Price`.
3. **`if best_price > limit_price { break }`** — the at-or-better rule. We won't pay more than `limit_price` for an ask.
4. **`self.asks.get_mut(&best_price).expect(...)`** — the queue at that price. **`.expect` is safe here** because we just got `best_price` from `keys().next()` — the level definitely exists. The expect message documents this invariant.
5. **`match_at_level(&order, best_price, queue, &mut remaining)`** — does the actual match. We'll write this helper next; for now know that it returns a `Fill` and mutates both `queue` (pops the maker if fully filled) and `remaining` (subtracts the filled quantity).
6. **`if queue.is_empty() { self.asks.remove(&best_price) }`** — if `match_at_level` left the queue empty, drop the level so `best_ask()` stays consistent with `depth_ask()`. (If we left an empty queue in the map, `best_ask()` would return that level's price even though no orders are there.)

The Sell branch is **structurally identical** but inverted:
- Walks `bids` instead of `asks`.
- The keys are `Reverse<Price>`, so we unwrap via `best_rev.0`.
- Compares with `best_price < limit_price` (sell at-or-better means sell at or above limit).

**The "structural identity" is the load-bearing observation.** A Buy + a Sell are mirror images of each other. Both walk the opposite side's best-first; both match while the price clears the limit; both pop the level if it goes empty. The only difference is which BTreeMap they touch and which direction the comparison goes. If you understand the Buy branch, you understand the Sell branch.

> 🛑 **Anti-fluency.** "Couldn't I parameterize over Buy/Sell and write this loop once?" **You could — but it's not worth it.** The fully-generic version requires you to abstract the BTreeMap (`Reverse<Price>` vs `Price`), the comparison operator (`>` vs `<`), and the keys (`bids` vs `asks`). The savings is ~30 lines of duplication; the cost is one of the most hostile generic-bound puzzles in Rust. **Duplication is cheap; abstraction-budget is precious. Spend it where you actually win.**

### Step 3: Add the rest-the-remainder logic

The matching loop above ends with `FillResult { fills, remaining_qty: Qty(0) }` — that's a placeholder. Replace it with the real "rest the remainder" logic:

```rust
        // Any unfilled limit qty rests on the book.
        if remaining.0 > 0 {
            let resting = RestingOrder {
                id: order.id,
                account: order.account,
                qty: remaining,
            };
            match order.side {
                Side::Buy => self
                    .bids
                    .entry(Reverse(limit_price))
                    .or_default()
                    .push_back(resting),
                Side::Sell => self.asks.entry(limit_price).or_default().push_back(resting),
            }
            // Limit orders that rest report zero remaining to the caller —
            // the remainder isn't in the return value, it's in the book.
            FillResult {
                fills,
                remaining_qty: Qty(0),
            }
        } else {
            FillResult {
                fills,
                remaining_qty: Qty(0),
            }
        }
    }
```

Walk this carefully:

1. **`if remaining.0 > 0`** — taker still has unfilled quantity. For Limit orders, that quantity goes onto the book (Market orders, in L5, discard it instead).
2. **Construct `RestingOrder`** — drop the side and order_type (encoded by which map we push into), keep id + account + remaining qty.
3. **`self.bids.entry(Reverse(limit_price)).or_default().push_back(resting)`** — for a Buy order's unfilled remainder. `entry` + `or_default` is the "insert if missing, get mutable ref either way" idiom for BTreeMap. The `Reverse(limit_price)` is the key shape we picked for bids in L3.
4. **`self.asks.entry(limit_price).or_default().push_back(resting)`** — symmetric for Sell.
5. **`FillResult { fills, remaining_qty: Qty(0) }`** — return zero `remaining_qty` to the caller. **This is the load-bearing semantic** the doc on `FillResult` in L2 promised: a Limit order that rests *says zero remaining*. The remainder is in the book, not in the return value.
6. **Both branches** (`if` and `else`) return `Qty(0)` remaining. The `else` branch is for the fully-filled case (taker matched 100%; nothing rests, nothing remains). The two branches produce the same return value but for different reasons.

> 🛑 **Anti-fluency.** "Why does a Limit order that rests return `remaining_qty: Qty(0)` instead of the resting amount? Callers might want to know how much went onto the book." **Because `FillResult` is the result of *matching*, not the state of the book.** A caller who wants the resting amount can query `best_bid()` or `depth_bid()` after the call. Conflating "the book accepted this much new resting liquidity" with "the matcher had leftover taker quantity it couldn't place" makes the semantics ambiguous. **Returns describe what happened; book state describes what's there. Separate concerns.**

### Step 4: Write the `match_at_level()` helper

Below the `impl Book { ... }` block (at module scope, not inside the impl), add:

```rust
/// Match a taker against the front of a single price level.
/// Mutates `queue` (pops the maker if fully filled) and `remaining`.
fn match_at_level(
    taker: &Order,
    price: Price,
    queue: &mut VecDeque<RestingOrder>,
    remaining: &mut Qty,
) -> Fill {
    let maker = queue
        .front_mut()
        .expect("match_at_level called with empty queue");
    let fill_qty = Qty(maker.qty.0.min(remaining.0));

    let fill = Fill {
        maker_order_id: maker.id,
        taker_order_id: taker.id,
        maker_account: maker.account,
        taker_account: taker.account,
        price,
        qty: fill_qty,
    };

    maker.qty.0 -= fill_qty.0;
    remaining.0 -= fill_qty.0;

    if maker.qty.0 == 0 {
        queue.pop_front();
    }

    fill
}
```

This is **the actual match** — the smallest function that does the real work. Walk it:

1. **`queue.front_mut().expect(...)`** — the maker at the front of the queue. Time priority means the first-placed order matches first. `expect` is safe because `submit_limit` only calls `match_at_level` after confirming the level exists.
2. **`fill_qty = min(maker.qty, remaining)`** — match the smaller of the two. If the maker has 30 units and the taker still needs 50, the fill is 30 (the maker is fully consumed). If the maker has 30 and the taker only needs 10, the fill is 10 (the maker still has 20 left).
3. **Build the `Fill`** — store both order IDs and both account IDs (L2's design decision: self-contained Fills).
4. **`maker.qty.0 -= fill_qty.0`** — shrink the maker. This is the **mutation that's safe inside RestingOrder but would be weird inside Order** (L3's anti-fluency callout — RestingOrder exists exactly to make this kind of mutation explicit).
5. **`remaining.0 -= fill_qty.0`** — shrink the taker's outstanding quantity. The caller (`submit_limit`) sees this via the `&mut Qty` argument.
6. **`if maker.qty.0 == 0 { queue.pop_front() }`** — if the maker is fully consumed, pop them off. The next iteration of `submit_limit`'s outer loop will check this queue again — if it's now empty, the level itself gets dropped.

**Why is this a free function instead of a method on Book?** Because it doesn't need access to `self`. It only touches a single queue (which `submit_limit` already has a mutable reference to) and a single `remaining` counter. Making it a free function reflects that scope: nothing about `Book` as a whole is involved.

> 🛑 **Anti-fluency.** "The `expect("empty queue")` panic seems risky. What if the queue *is* empty?" **The function isn't supposed to be called with an empty queue — that's an `submit_limit` invariant.** Specifically, `submit_limit` calls `match_at_level` only after `keys().next()` returned `Some(price)`, which guarantees the level (and thus its queue) has at least one element. If `match_at_level` were called with an empty queue, that's a bug in `submit_limit`, not in `match_at_level` — and `expect` makes the bug surface as a panic with a clear message instead of an `Option::None` silently propagating. **Trust internal invariants; assert them with `expect`.**

## Test

```bash
cargo check -p openhl-clob
```

Should compile clean. Unused-import warnings from L3 (specifically `Fill`, `FillResult`, `Order`, `OrderType`, `Qty`, `Side`) should be gone now — `submit_limit` and `match_at_level` use all of them.

To sanity-check the matching logic, we don't have tests yet (those are L7-L8), but you can write a one-off in `src/lib.rs` temporarily:

```rust
#[cfg(test)]
mod smoke {
    use super::*;

    #[test]
    fn buy_crosses_resting_ask() {
        let mut book = Book::new();
        // Place a resting sell at 100 for 30 units.
        book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
        // Cross with a buy at 100 for 50 units.
        let result = book.submit(Order {
            id: OrderId(2),
            account: AccountId(2),
            side: Side::Buy,
            qty: Qty(50),
            order_type: OrderType::Limit { price: Price(100) },
        });
        assert_eq!(result.fills.len(), 1);
        assert_eq!(result.fills[0].qty, Qty(30));
        assert_eq!(result.fills[0].price, Price(100));
        assert_eq!(result.fills[0].maker_order_id, OrderId(1));
        assert_eq!(result.fills[0].taker_order_id, OrderId(2));
        // 50 - 30 = 20 unfilled, rests as a new bid at 100.
        assert_eq!(result.remaining_qty, Qty(0)); // rested, not returned
        assert_eq!(book.best_bid(), Some(Price(100)));
        assert_eq!(book.depth_bid(), 1);
        assert_eq!(book.depth_ask(), 0); // ask was fully consumed
    }
}
```

Run with `cargo test -p openhl-clob buy_crosses_resting_ask`. If it passes, your Limit Buy + Limit Sell logic is correct.

**Delete this smoke test before moving to L5** — the real test suite goes in L7-L8 with proper hand-traced scenarios + proptests. The smoke test above is just to verify L4 compiles AND runs correctly. Keep your `src/lib.rs` clean for L5.

Common errors and fixes:

- **`error: 'Buy' branch panics with 'todo!()' but I selected Limit not Market`** — your `submit` dispatcher's `OrderType::Limit` arm still has `todo!()` from a draft state. Re-check Step 1; the Limit arm should call `self.submit_limit(order, price)`.
- **`error[E0596]: cannot borrow 'maker' as mutable... requires Copy`** — `front_mut()` returns `Option<&mut T>`, not `Option<T>`. If you wrote `let maker = queue.front_mut().expect(...).clone()`, you're working with a `Copy` of the maker and your mutations don't persist. Use the reference directly: `let maker = queue.front_mut().expect(...)`.
- **`error: cannot find value 'asks' in scope`** in match_at_level — `match_at_level` is a free function, not a Book method. It doesn't have `self`. Use the parameters (`queue`, `remaining`) instead.
- **Smoke test reports `depth_bid: 0`** — your rest-the-remainder logic didn't push to bids. Re-check Step 3, especially the `Reverse(limit_price)` key wrapping (forgetting `Reverse` means you push into an unwrapped-Price entry which won't be found by `best_bid`'s `Reverse`-keyed lookup).

## Design reflection

Three load-bearing decisions encoded here:

1. **Buy and Sell are structural mirrors.** The Buy branch walks asks ascending; the Sell branch walks bids descending. We didn't try to abstract over them with generics — duplication was cheaper than the abstraction tax. **Two structurally identical functions are easier to read than one fully-generic function.**

2. **`match_at_level` is a free function, not a method.** It doesn't need `self`. Making it a free function documents that it operates on data the caller has already extracted (queue + remaining), not on the Book's overall state. **Function signature is documentation: name your scope.**

3. **`remaining_qty: Qty(0)` for resting Limit orders is intentional.** The caller sees "this many units matched; nothing leftover for me." If they want to know about the resting remainder, they query the book directly via `best_bid` / `depth_bid` — those are book-state methods. **Return values describe what happened to the call; book state describes what is. Don't mix.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
```

After L4, your `book.rs` is approximately **the first ~145 lines** of the reference (struct + accessors from L3 + submit dispatcher + submit_limit + match_at_level). The reference also has `submit_market` (~40 LOC, L5) and `cancel` (~25 LOC, L6) that you haven't written yet.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why is `match_at_level`'s `taker` an `&Order` reference but `queue` is `&mut VecDeque<RestingOrder>`?**
Because `match_at_level` reads from `taker` (just to copy fields into the `Fill`) but writes to `queue` (pops or shrinks the front element). The function signature matches usage: `&` for read-only, `&mut` for mutating. The compiler enforces this — you can't accidentally mutate `taker` because the reference type doesn't allow it.

**Q: What happens if a price level exists but its queue is empty?**
That's a bug. The invariant is "every key in the map corresponds to a non-empty queue." `submit_limit` enforces this by checking `if queue.is_empty() { self.asks.remove(&best_price) }` after each match — so an empty queue is never left behind. If you ever see an empty queue, look for places that mutated the queue without checking emptiness afterward.

**Q: Why not use `BTreeMap::pop_first()` to grab the best level + remove it in one call?**
Two reasons. (1) Popping unconditionally removes the level, but we don't always want that — sometimes the level still has orders after matching (the maker got partially filled, queue still has others behind them). (2) `pop_first` was stabilized in Rust 1.66 but the matching pattern with `get_mut` + conditional `remove` reads more naturally for the "consume some, maybe drop the level" flow.

**Q: Is there a fast path for "the taker exactly matches the maker"?**
No, and we don't need one. The general path (`min(maker.qty, remaining)` + shrink-or-pop) handles "exact match" as a special case of the general one. Adding a special-case branch would add a code path to test for marginal speedup; profile first if performance matters.

## Next lesson (L5)

Limit orders work. **Market orders still `todo!()`.** L5 finishes the matching engine by:
- Replacing `todo!()` in `submit()` with `self.submit_market(order)`
- Writing `submit_market()` — like `submit_limit` but **without the price check** (Market takes any price) and **without resting the remainder** (Market discards leftovers).

L5 is shorter than L4 because most of the work (`match_at_level`, the dispatcher) is done. By the end of L5 you have a complete matching engine with both order types working.
````

---

## Seed-file slot

L4 lands in Module 2 (Matching engine) at sortOrder 1:

```typescript
{
  title: 'Lesson 4 — submit for Limit orders + match_at_level',
  slug: 'openhl-clob-submit-limit-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 45,
  xpReward: 80,
  content: `# Lesson 4 — \`submit\` for Limit orders + \`match_at_level\`\n\n...`
},
```

## SHA pinning discipline

Same as L1-L3 — `55a9dff` (Stage 8a). After L4, the reader's `book.rs` is approximately the first ~145 lines of the reference (everything except `submit_market` (L5) and `cancel` (L6)).

## Style review notes (self-critique before paste)

- **The §Predict walk-through (asks levels, 50-unit buy, expected fills)** gives readers a concrete trace before they write code. The answer is folded into the same callout so they can self-check.
- **§Step 2's "structural identity is the load-bearing observation"** preempts the natural urge to deduplicate Buy/Sell with generics — answered in §Step 2's anti-fluency callout.
- **§Step 3's separation of "rest-the-remainder" from "matching loop"** — the matching loop is one logical operation, rest-the-remainder is another. Splitting them in the prose mirrors the code.
- **§Step 4's "free function not method"** explains the design choice that's easy to miss — `match_at_level` reads like internal API, but the scoping decision is deliberate.
- **§Test's optional smoke test** gives reader a concrete way to verify L4 *runs* correctly, not just compiles. The instruction to delete before L5 keeps things clean.
- **3 anti-fluency callouts** — (a) why submit() dispatcher is small, (b) why no generic over Buy/Sell, (c) why expect() in match_at_level is safe.
