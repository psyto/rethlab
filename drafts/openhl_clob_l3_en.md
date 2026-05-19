# Building OpenHL CLOB — L3 draft (EN) — build-along

> Drafted against openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine).
> Course: `building-openhl-clob-en` (track: `reth-l1-architect`).

---

## L3 — `openhl-clob-book-struct-en`

- **Module:** 2 (Matching engine), sortOrder 0 within module
- **Course-level sortOrder:** 2 (lesson 3 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Lesson 3 — The `Book` struct and the `Reverse<Price>` trick

## Goal

By the end of this lesson:

```bash
cargo check -p openhl-clob
```

…still compiles. You'll have a new file `crates/clob/src/book.rs` containing:

- **`Book` struct** — two `BTreeMap`s (bids + asks), each mapping a price level to a `VecDeque` of resting orders.
- **`RestingOrder` struct** — what a single order looks like once it's resting on the book (trimmed from `Order`).
- **`new()` constructor** + 4 read-only accessors (`best_bid`, `best_ask`, `depth_bid`, `depth_ask`).

**No matching logic yet** — `submit` lands in L4 + L5, `cancel` in L6. This lesson is about building the data structure correctly so the matching logic can be a few lines on top of it.

The single load-bearing idea: **`Reverse<Price>` as a `BTreeMap` key** makes the natural-order iterator walk bids highest-first. Once you see why that works, the rest of the matching code becomes obvious.

## Recap

After L2, your `crates/clob/src/types.rs` is complete (~109 lines): 4 newtypes, `Side`, `OrderType`, `Order`, `Fill`, `FillResult`, `Display` impls.

`crates/clob/src/lib.rs` re-exports all of those via `pub use types::*`. **There is no `book` module yet** — this lesson creates it.

## Plan

Five things:

1. **Create `crates/clob/src/book.rs`.**
2. **Write the `Book` struct** with `bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>` and `asks: BTreeMap<Price, VecDeque<RestingOrder>>`.
3. **Write the `RestingOrder` struct** — trimmed from `Order` (no side, no order_type, no qty growth).
4. **Add `Book::new()`** + the 4 accessor methods.
5. **Wire `pub mod book;`** into `lib.rs`.

The accessors return `Option<Price>` or `usize` — pure read operations against the BTreeMap shape. The interesting design choices are the **map key types** and what `RestingOrder` keeps vs. drops from `Order`.

> 🛑 **Predict.** Before scrolling: `BTreeMap` iterates keys in **natural order** (smallest to largest). For **asks** (we want lowest price first), `BTreeMap<Price, _>` is perfect — natural order already walks lowest-first. For **bids**, we want **highest price first** — but natural order would walk lowest-first. **What's the cheapest way to make BTreeMap walk highest-first without writing a custom comparator?** Hint: think about what "reverse a u64's ordering" looks like as a type.

## Walk-through

### Step 1: Create `book.rs` with module doc and imports

`touch crates/clob/src/book.rs` (or just create the file in your editor). Top of the file:

```rust
//! Price-time priority orderbook + matching engine.
//!
//! Bids are stored with a `Reverse<Price>` key so `BTreeMap` natural-order
//! iteration walks them best-first (highest price first). Asks are stored
//! with `Price` directly so they also walk best-first (lowest price first).
//! Within each price level, orders are queued FIFO — that's the "time
//! priority" half of price-time priority.

use core::cmp::Reverse;
use std::collections::{BTreeMap, VecDeque};

use crate::types::{
    AccountId, Fill, FillResult, Order, OrderId, OrderType, Price, Qty, Side,
};
```

A few things to scan:

- **`core::cmp::Reverse`** — the wrapper that flips the ordering of any `Ord` type. `Reverse(Price(100))` compares **greater than** `Reverse(Price(200))`, because `Reverse` inverts the underlying comparison.
- **`BTreeMap`** — a sorted map. Iteration walks keys in ascending order (= **natural order** = whatever `Ord::cmp` says is "smaller goes first"). Insert/remove/lookup are all O(log n).
- **`VecDeque`** — a double-ended queue. We use it for the "time priority" inside each price level: `push_back` for new orders (they go to the back of the line), `pop_front` for matched orders (front of the line gets filled first).
- **All the types from L1 + L2** — even ones we don't use directly in this lesson (`Fill`, `FillResult`, `Side`, etc.). We're importing them now to match the final imports list; they'll all be used by L4-L6's matching code.

> 🛑 **Anti-fluency.** "Why not use `HashMap` instead of `BTreeMap`? Hash lookups are O(1) vs BTreeMap's O(log n)." **Because we don't just look up — we iterate in price order.** Finding "the best bid" means "the bid with the highest price." A HashMap has no notion of "next key in sorted order"; we'd have to scan all keys (O(n)) and find the max. BTreeMap's sorted iteration gives us best-first in O(1) for the lookup (`keys().next()`) — that's what makes matching cheap.

### Step 2: Write the `Book` struct

Continue:

```rust
#[derive(Debug, Default)]
pub struct Book {
    /// Bids: `Reverse<Price>` key gives best-first iteration (highest first).
    bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>,
    /// Asks: `Price` key gives best-first iteration (lowest first).
    asks: BTreeMap<Price, VecDeque<RestingOrder>>,
}
```

The whole matching engine's state is **two BTreeMaps**. That's it. No order-id index (we'll do O(n) cancel in L6 and address that trade-off explicitly), no separate "best price" cache (the BTreeMap already gives us best in O(1)), no tick-size tables.

The asymmetry between bids and asks — `Reverse<Price>` vs. `Price` — looks weird, but it's the load-bearing trick:

- **Asks: `BTreeMap<Price, _>`.** Natural-order keys means iteration goes `Price(99)`, `Price(100)`, `Price(101)`, ... A buy-taker that wants the cheapest ask reads `asks.keys().next()` → `Price(99)`. Best-first.
- **Bids: `BTreeMap<Reverse<Price>, _>`.** Natural order on `Reverse<Price>(p)` is **descending in `p`**: `Reverse(Price(101))` comes before `Reverse(Price(100))` comes before `Reverse(Price(99))`. A sell-taker that wants the highest bid reads `bids.keys().next()` → `Reverse(Price(101))`. Best-first.

**Both sides use `keys().next()` to get the best price.** That's the API symmetry that justifies the type asymmetry. Without `Reverse`, bid lookup would have to be `keys().next_back()` (the BTreeMap iterator's reverse direction), and the matching code would be asymmetric across sides — easy to confuse, easy to write wrong.

`#[derive(Default)]` is here so `Book::new()` (next step) can just be `Self::default()` — no need to write `BTreeMap::new()` four times in a constructor. Default for `BTreeMap` is an empty map; same for `Default` on `Book` overall.

### Step 3: Write the `RestingOrder` struct

Below `Book`:

```rust
/// An order resting on the book. Trimmed from `Order` — side and `order_type`
/// are implicit from which side of the book it's resting on, and `qty` shrinks
/// as fills consume it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct RestingOrder {
    id: OrderId,
    account: AccountId,
    qty: Qty,
}
```

3 fields, **not pub** (this is an internal type — callers never touch `RestingOrder` directly).

What's missing from `Order`:

- **`side`** — gone. We know what side a RestingOrder is on by which map it lives in (bids vs. asks). Storing it twice would be redundant + error-prone.
- **`order_type`** — gone. Resting orders are always Limit orders by definition (Market orders never rest — they fill what they can and discard the rest). Storing `order_type` would let us construct a `RestingOrder` with `OrderType::Market`, which is meaningless.
- **`qty` stays** — but it **shrinks over time** as the order gets partially filled. The submit code in L4 will mutate `RestingOrder.qty` directly when a maker eats less than 100% of a taker's quantity.

> 🛑 **Anti-fluency.** "Why not just store the original `Order` in the book and modify its `qty`?" **Because `Order` is `Copy` (5 fields, all stack-safe), but mutating a field-of-a-Copy looks like a bug to careful reviewers.** Specifically, if `Order` were stored in the queue, the matching code might do `*order_in_queue.qty.0 -= fill_qty.0` — but that's mutating data that `Copy` is supposed to be cheap to clone. `RestingOrder` is a separate type that makes the "this gets mutated" property explicit: callers know `RestingOrder.qty` shrinks because that's what `RestingOrder` is *for*.

### Step 4: Add `new()` and the 4 accessors

Append to `book.rs`:

```rust
impl Book {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    #[must_use]
    pub fn best_bid(&self) -> Option<Price> {
        self.bids.keys().next().map(|rp| rp.0)
    }

    #[must_use]
    pub fn best_ask(&self) -> Option<Price> {
        self.asks.keys().next().copied()
    }

    #[must_use]
    pub fn depth_bid(&self) -> usize {
        self.bids.values().map(VecDeque::len).sum()
    }

    #[must_use]
    pub fn depth_ask(&self) -> usize {
        self.asks.values().map(VecDeque::len).sum()
    }
}
```

5 methods, all `#[must_use]`:

- **`new()`** — `Self::default()`. We could write `Book { bids: BTreeMap::new(), asks: BTreeMap::new() }` but `#[derive(Default)]` handles that uniformly.
- **`best_bid()`** — `keys().next()` returns the smallest natural-order key. Because bids use `Reverse<Price>`, that key wraps the highest price. We unwrap with `.map(|rp| rp.0)` — the `rp.0` peels off the `Reverse` wrapper.
- **`best_ask()`** — same pattern, but the key is `Price` directly. `keys().next()` returns the smallest `Price`, and we `.copied()` to get a `Price` value (without that, we'd get `Option<&Price>`).
- **`depth_bid()` / `depth_ask()`** — sum of queue lengths across all price levels. Inspection-only methods, used by tests and debugging.

**Why `Option<Price>` for best?** When the book is empty, there's no best price. `Option::None` is the right answer; returning `Price(0)` or `Price(u64::MAX)` would let callers accidentally treat them as real prices. The type forces the empty case to be handled.

> 🛑 **Anti-fluency.** "`depth_bid` is O(n) — that's slow." **It's only called from tests and inspection code, where O(n) is fine.** The matching engine itself never calls `depth_bid` — it walks `keys().next()` and `front()` in O(1)/O(log n). If `depth_bid` were on the hot path, we'd add a counter and bump it on every push/pop; but it's not, so we don't.

### Step 5: Wire into `lib.rs`

Open `crates/clob/src/lib.rs`. L1 + L2's content is:

```rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [`book::Book`] for the matching state machine (L3+).

pub mod types;

pub use types::*;
```

Add **one line** for the new module, and **one re-export** for the public `Book` type:

```rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [`book::Book`] for the matching state machine.

pub mod book;
pub mod types;

pub use book::Book;
pub use types::*;
```

The order is intentional: `book` first alphabetically, `types` second. Imports in Rust crates generally read better when crate-level modules are alphabetized.

**Only `Book` is re-exported, not `RestingOrder`.** `RestingOrder` is the internal queue element; nothing outside the matching engine should construct or read it. Keeping it `struct` (not `pub struct`) inside `book.rs` makes that explicit. The compiler enforces "no one outside this module touches RestingOrder."

## Test

```bash
cargo check -p openhl-clob
```

Expected: clean compile, no warnings.

You might see a warning about **unused imports** — that's because `book.rs` imports `Fill`, `FillResult`, `Order`, `OrderType`, `Qty`, `Side` but L3 doesn't use them yet:

```
warning: unused import: `Fill, FillResult, Order, OrderType, Qty, Side`
 --> crates/clob/src/book.rs:11:5
```

**Two options for how to handle this:**

1. **Suppress the warning for now** by adding `#[allow(unused_imports)]` above the use statement. Remove it once L4 starts using everything.
2. **Comment out the unused imports for now**, uncomment as you need them in L4-L6.

The reference at SHA `55a9dff` keeps all imports (because the file is complete at that SHA). For build-along, choice 1 is closer to the reference; choice 2 is cleaner if you mind warnings. Either is fine.

A quick sanity test that the structure compiles correctly:

```bash
cat > /tmp/book_test.rs <<'EOF'
use openhl_clob::Book;
use openhl_clob::Price;

fn main() {
    let b = Book::new();
    assert_eq!(b.best_bid(), None);
    assert_eq!(b.best_ask(), None);
    assert_eq!(b.depth_bid(), 0);
    assert_eq!(b.depth_ask(), 0);
    let _: Option<Price> = b.best_bid();
}
EOF
```

You don't need to run this; the types just have to compile. If `cargo check -p openhl-clob` is clean, you're good.

Common errors and fixes:

- **`error[E0277]: 'BTreeMap<Reverse<Price>, ...>' is not 'Default'`** — `BTreeMap<K, V>` requires `K: Ord`, and `Reverse<T>` requires `T: Ord`. Since `Price: Ord` from L1, this works. If you forgot to derive `Ord` on `Price` in L1, that derive chain breaks here.
- **`error[E0599]: no method named 'len' for `VecDeque<RestingOrder>`** — typo in `depth_bid`/`depth_ask`. The method is `VecDeque::len`, accessed as `.len()` directly or as `VecDeque::len(deque_ref)`.
- **`error[E0382]: borrow of moved value: `rp`** in `best_bid` — using `.map(|rp| rp.0)` on a `&Reverse<Price>` reference: the closure receives `rp: &Reverse<Price>`, and `rp.0` is `Price` by value because `Reverse<Price>: Copy` (since `Price: Copy`). If this errors, `Price` isn't `Copy` — check L1's derive list.
- **`error: cannot find type 'RestingOrder' in module 'book'`** from outside — `RestingOrder` is private. That's intentional.

## Design reflection

Three load-bearing decisions encoded here:

1. **The state of the matching engine is two BTreeMaps.** No order-id index, no best-price cache, no per-side counters. Everything else is derived from those two maps. Future optimizations (e.g., `HashMap<OrderId, (Side, Price)>` for O(1) cancel) can be added without changing the core data model. **Start with the simplest representation that supports the operations; optimize when profiling demands it.**

2. **`Reverse<Price>` for bids is a type-level trick that saves matching-code complexity.** Without it, every place that walks the book would have to branch: "if asks, use `next`; if bids, use `next_back`." With `Reverse<Price>` on bids, both sides use `next` uniformly. **One symmetric API at the call site is worth one type asymmetry in the data definition.**

3. **`RestingOrder` is trimmed from `Order` to encode invariants.** A resting order doesn't have a side (we know its side from which map it's in) and doesn't have an `order_type` (Market orders never rest). Removing those fields from `RestingOrder` makes the impossible states unrepresentable. **Type design = constraint engineering.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/clob/src/lib.rs ./crates/clob/src/lib.rs
```

After L3, your `book.rs` is approximately **the first ~45 lines** of the reference (struct definitions + `new()` + 4 accessors). The reference at this SHA also contains `submit` (~100 LOC, L4 + L5), `cancel` (~25 LOC, L6), and `match_at_level` helper (~30 LOC, L4). Those will land in subsequent lessons.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why `VecDeque` and not `Vec`?**
Because we need fast push-back **and** fast pop-front. `Vec::remove(0)` shifts every element left — O(n). `VecDeque::pop_front()` is O(1). FIFO queues should always use `VecDeque` (or a real ringbuffer) — never `Vec` shifted from the front.

**Q: What's `Reverse` actually doing under the hood?**
It flips the `Ord::cmp` direction. `Reverse(a).cmp(&Reverse(b)) == b.cmp(&a)`. That's all. `BTreeMap` queries the key's `Ord` impl when sorting; by wrapping the key in `Reverse`, we make `BTreeMap` think `Reverse(higher)` is "smaller" than `Reverse(lower)` and walks accordingly.

**Q: Couldn't `RestingOrder` just be `Order`?**
You could — but you'd carry the `side` and `order_type` fields uselessly (we already know the side from the map, and a resting Market order is a contradiction). The trim is small, but the **type-level guarantee** "you can't construct a resting Market order" comes for free.

**Q: Why are the BTreeMap fields private?**
Because callers shouldn't directly modify the maps — they should go through `submit` / `cancel` (L4+ / L6) which maintain invariants like "an empty queue is never left in the map." If someone called `book.asks.insert(price, VecDeque::new())`, they'd create a phantom empty price level that `best_ask()` would return. The encapsulation prevents that.

## Next lesson (L4)

You have the data structure. L4 puts the first matching logic on top of it — `submit` for Limit Buy orders. Reader writes the `Buy` branch that walks asks from cheapest, matches at-or-below the limit, and rests the unfilled remainder. ~60 LOC of body + a `match_at_level` helper that L4-L5 both use. After L4, your matching engine produces real `Fill`s for the most common scenario (limit buy crossing a resting ask).
````

---

## Seed-file slot

L3 lands in Module 2 (Matching engine) at sortOrder 0:

```typescript
{
  title: 'Lesson 3 — The Book struct and the Reverse<Price> trick',
  slug: 'openhl-clob-book-struct-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 3 — The \`Book\` struct and the \`Reverse<Price>\` trick\n\n...`
},
```

## SHA pinning discipline

Same as L1/L2 — `55a9dff` (Stage 8a). After L3, the reader's `book.rs` is approximately the first ~45 lines of the reference (struct + `new()` + accessors only).

## Style review notes (self-critique before paste)

- **§Plan's "single load-bearing idea" callout** names what L3 is really about — the `Reverse<Price>` trick. Everything else (BTreeMap choice, VecDeque, accessors) is mechanical once that lands.
- **§Predict** sets up the trick without revealing it. Reader has to think "how do you flip BTreeMap's ordering" before scrolling. This is the kind of "aha" moment that earns the lesson.
- **Step 2's "API symmetry justifies type asymmetry"** is the generalizable principle — pay slightly weird type definitions to keep callers symmetric.
- **3 anti-fluency callouts** — (a) why not HashMap, (b) why not store Order directly, (c) why depth methods are O(n) is fine.
- **§Test's `#[allow(unused_imports)]` discussion** preempts the warning the reader will see; explicitly noting both options is more honest than picking one silently.
- **§Common questions's `Reverse` mechanism** demystifies the "magic" with a 1-line explanation.
