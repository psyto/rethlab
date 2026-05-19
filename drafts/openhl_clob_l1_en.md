# Building OpenHL CLOB — L1 draft (EN) — build-along

> Drafted against openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine).
> Course: `building-openhl-clob-en` (track: `reth-l1-architect`).

---

## L1 — `openhl-clob-types-newtype-en`

- **Module:** 1 (CLOB types), sortOrder 0 within module
- **Course-level sortOrder:** 0 (lesson 1 of 12)
- **Duration:** 25 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Lesson 1 — CLOB newtypes, `Side`, `OrderType`

## Goal

By the end of this lesson:

```bash
cargo check -p openhl-clob
```

…compiles cleanly. You'll have one new crate (`crates/clob/`) registered in the workspace, with a single file `src/types.rs` containing the **atomic, field-level types** the matching engine uses:

- **4 newtypes over `u64`** — `AccountId`, `OrderId`, `Price`, `Qty` — for type-safety against accidental swaps.
- **`Side` enum** (`Buy` | `Sell`) with an `opposite()` helper.
- **`OrderType` enum** — `Limit { price }` or `Market`.
- **`Display` impls** on `OrderId`, `Price`, `Qty` so debug output reads naturally (`"#42"`, `"1000000"`, etc.).

No record types yet (those are L2). No book yet (that's L3 onward). This lesson is the foundation — every later lesson uses the types you build here.

## Recap

After course 6, your workspace has:

```
crates/types/             — BlockHash, PayloadId, PayloadAttrs, ExecutedBlock, PayloadStatus
crates/evm/               — InMemoryEvmBridge, RethEvmBridge, LiveRethEvmBridge
crates/consensus/         — full BFT engine (Context, signing, codec, node, engine_app)
bin/openhl/               — stub binary
```

`cargo test` passes ~38 tests workspace-wide. `LiveRethEvmBridge::commit` sends `ForkchoiceUpdated` to Reth. **But `build_payload` produces empty blocks** — nothing to fill them with.

## Plan

Four things:

1. **Create `crates/clob/` directory** with `Cargo.toml` and `src/`.
2. **Register `crates/clob/` in the workspace** — add to `[workspace.members]` in the root `Cargo.toml`.
3. **Add `openhl-clob` to workspace dependencies** in the root `Cargo.toml` so other crates can depend on it.
4. **Write `src/types.rs`** — the 4 newtypes, `Side`, `OrderType`, and `Display` impls. **No record types yet** (those go in L2).
5. **Wire `pub mod types;` + re-exports into `src/lib.rs`** so the crate's public API is the types.

The lesson is short because the types are short. The interesting part isn't the code — it's the **design decisions** (why newtypes over raw `u64`, why `Limit` carries its price as a struct field, what unit `Qty` is in).

> 🛑 **Predict.** Before scrolling: when you see four newtypes wrapping the same `u64` (`AccountId(u64)`, `OrderId(u64)`, `Price(u64)`, `Qty(u64)`), what's the one bug each newtype prevents — that a raw `u64` everywhere would let through? Hint: think about a function that takes `(u64, u64, u64)`. Now imagine someone calls it with arguments in the wrong order. **The newtype pattern's main job is making argument-swap bugs into compile errors.**

## Walk-through

### Step 1: Create the crate directory + Cargo.toml

From the workspace root (`~/code/my-openhl/`):

```bash
mkdir -p crates/clob/src
touch crates/clob/Cargo.toml crates/clob/src/lib.rs crates/clob/src/types.rs
```

Now open `crates/clob/Cargo.toml` and write:

```toml
[package]
name         = "openhl-clob"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[lints]
workspace = true
```

No dependencies. The CLOB matching engine is pure data + pure logic; it doesn't even need `serde` at this stage (Stage 8b adds it for funding, but we don't need it now).

### Step 2: Register in workspace

Open the root `Cargo.toml`. Find `[workspace] members = [...]`. Add `"crates/clob"` to the list. Make sure to keep the existing ordering (alphabetical or insertion-order is fine):

```toml
[workspace]
resolver = "3"
members = [
    "bin/openhl",
    "crates/types",
    "crates/clob",      # NEW
    "crates/evm",
    "crates/consensus",
]
```

Then in the same root `Cargo.toml`, find `[workspace.dependencies]` and add a path entry for `openhl-clob`:

```toml
[workspace.dependencies]
# --- Internal crates ---
openhl-types     = { path = "crates/types" }
openhl-clob      = { path = "crates/clob" }     # NEW
openhl-evm       = { path = "crates/evm" }
openhl-consensus = { path = "crates/consensus" }
```

Now any crate that wants `openhl-clob` can declare `openhl-clob = { workspace = true }` in its own `Cargo.toml`. We'll use this in L9 when the bridge consumes the CLOB.

### Step 3: Write the newtypes

Open `crates/clob/src/types.rs`. Start with the module doc and the 4 newtypes:

```rust
//! Core types for the CLOB matching engine.
//!
//! Pure data — no I/O, no allocation beyond what's needed for fills. The
//! whole module is deterministic by construction: every type's `PartialEq`
//! and `Ord` impl derives from byte-equal field comparison.

use core::fmt;

/// Account identifier. Opaque to the CLOB; chain integration maps these to
/// EVM addresses, validator addresses, or whatever the chain uses.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct AccountId(pub u64);

/// Sequential order identifier. Caller allocates; the book doesn't generate.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OrderId(pub u64);

/// Price in minor units. For a USDC market, `Price(1_000_000) = $1.00`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Price(pub u64);

/// Quantity in minor units.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Qty(pub u64);
```

Four structures, all 1 line each, all wrapping `u64`. **The 7 derives are identical** across all 4 types — that's intentional. The newtype pattern works because the types have the *same operations* as `u64` but the *type system rejects* mixing them.

Three things to notice in the doc comments:

- **`AccountId` is opaque** — the CLOB doesn't know whether your chain uses EVM addresses, ed25519 pubkeys, or sequential integers. It just compares them for equality. Chain integration (course 8 with precompiles, eventually production node code) maps `AccountId(...)` to whatever the chain wants.
- **`OrderId` is caller-allocated** — the book doesn't generate IDs; callers do. This keeps the book pure-stateless: `submit_order` is a function of (book, order), not (book, order, generator-state).
- **`Price`/`Qty` are in minor units** — `Price(1_000_000)` represents $1.00 for a 6-decimal token like USDC. There's no `f64` in the matching engine. **Floats are forbidden in money math.**

> 🛑 **Anti-fluency.** "I'll add a method `pub fn from_dollars(d: f64) -> Price` for convenience." **No, that smuggles f64 imprecision into the engine.** `Price(1_000_000)` is the wire format; if a user-facing tool wants to do `from_dollars`, it does the integer multiplication at its boundary and hands the bridge an integer-typed Price. The matching engine never sees a float.

### Step 4: Add the `Side` enum and `opposite()` helper

Continue in `types.rs`:

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Side {
    Buy,
    Sell,
}

impl Side {
    #[must_use]
    pub const fn opposite(self) -> Self {
        match self {
            Self::Buy => Self::Sell,
            Self::Sell => Self::Buy,
        }
    }
}
```

Two variants. The `opposite()` method is a one-liner now, but it's load-bearing later: when a taker order arrives, you walk *the opposite side* of the book to find liquidity. A buy taker walks the asks; a sell taker walks the bids. **Encoding the rule in `opposite()` once means you can't forget which side to walk when reading book code later.**

`#[derive(PartialOrd, Ord)]` is intentionally NOT here. Asking "is Buy less than Sell?" is meaningless — these aren't ordered values, they're tags. Leaving the trait off keeps callers from accidentally writing `if side < Side::Sell` and getting an unintended ordering (which would be `Buy < Sell` since Buy comes first in the source).

> 🛑 **Anti-fluency.** "Why isn't this a bool? `is_buy: bool` would save bytes." **It would also lose meaning at the call site.** `submit_order(order, true)` reads garbage; `submit_order(order, Side::Buy)` reads obvious. The 1-byte cost of an enum vs. a bool is irrelevant compared to the readability cost of the bool. Enums for things that have *names*, bools only for things that have *no name beyond on/off*.

### Step 5: Add the `OrderType` enum

Below the `Side` impl:

```rust
/// Order type — describes liquidity-taking + liquidity-providing behavior.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OrderType {
    /// Take liquidity at or better than `price`; rest the remainder on the book.
    Limit { price: Price },
    /// Take whatever liquidity is available at any price; never rests.
    Market,
}
```

Two variants:

- **`Limit { price: Price }`** — a struct-style enum variant. The order has a price; if you can't match at-or-better, the remainder rests on the book.
- **`Market`** — unit variant. No price; takes whatever's available at any price, then discards the remainder.

The struct-style `Limit { price: Price }` is deliberate over a tuple-style `Limit(Price)`. When code reads `order.order_type` and pattern-matches, `Limit { price }` makes the field name `price` part of the pattern. Tuples force you to write `Limit(p)` and remember what `p` means. **Named fields make the type self-documenting**.

> 🛑 **Anti-fluency.** "Why not also `Stop`, `StopLimit`, `Iceberg`, `Post-Only`?" **Because the engine doesn't need them yet, and adding unused variants is technical debt.** Limit + Market is the smallest set that covers the spot-trading test scenarios in L7-L8. When openhl needs Stop orders (probably perp territory, course 9 or later), the maintainers add the variant then — at which point matching logic, book logic, AND test scenarios all update together. **Add types when you're about to use them, not before.**

### Step 6: Add `Display` impls for the 3 user-facing newtypes

Append:

```rust
impl fmt::Display for OrderId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "#{}", self.0)
    }
}

impl fmt::Display for Price {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl fmt::Display for Qty {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}
```

Three `Display` impls. **Note `AccountId` doesn't get one** — that's intentional. AccountIDs are opaque IDs; if you want to print them, you probably want the chain-integration's mapping to a real address, not the raw `u64`. Leaving `Display` off forces callers to be explicit (e.g., `format!("{}", a.0)` or "render via the chain's address renderer").

OrderId formats as `"#42"` so test output reads naturally (`fill from #1 to #2`). Price and Qty are just their numeric values — but having the `Display` impl means you can use them in `format!` and `println!` without writing `.0`.

### Step 7: Wire types into `lib.rs`

Open `crates/clob/src/lib.rs`:

```rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [`book::Book`] for the matching state machine (L3+).

pub mod types;

pub use types::*;
```

Three lines of body, plus a doc comment. `pub use types::*` re-exports the types at the crate root so callers can write `use openhl_clob::{Order, Side}` instead of `use openhl_clob::types::{Order, Side}` — the shorter form is what we'll use everywhere.

The `book` module comes in L3; the `pub mod types;` line goes alone for now.

## Test

```bash
cargo check -p openhl-clob
```

Expected:

```
   Compiling openhl-clob v0.1.0 (.../crates/clob)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.23s
```

No warnings. No errors. The crate's public API is now `AccountId`, `OrderId`, `Price`, `Qty`, `Side`, `OrderType` (no records yet).

If you want to also verify nothing in the workspace broke:

```bash
cargo check --workspace
```

Should complete cleanly. The new crate is empty of dependents; nothing's affected.

Common errors and fixes:

- **`error: failed to read 'crates/clob/Cargo.toml'`** — typo in workspace `members` list, or the file doesn't exist. Re-check Step 2.
- **`error[E0432]: unresolved import 'fmt'`** — forgot `use core::fmt;` at the top of `types.rs`. Re-check Step 3.
- **`error[E0277]: 'Price' doesn't implement `Display`** — added `Display` for `OrderId` but not `Price`/`Qty`. Re-check Step 6.
- **`warning: unused import: 'types'`** — your `lib.rs` says `mod types;` (private) instead of `pub mod types;`. Re-check Step 7.

## Design reflection

Three load-bearing decisions encoded here:

1. **Newtypes prevent argument-swap bugs at compile time.** Code that took `submit(book, account: u64, price: u64, qty: u64)` would compile with any permutation of those three `u64`s passed in. Code that takes `submit(book, AccountId, Price, Qty)` rejects the wrong types at compile time. The cost is two extra `.0` deref calls; the benefit is bugs you can't write.

2. **Money math uses integers, not floats.** `Price` and `Qty` are `u64`-backed. There's no `Price::from_f64`. Anyone wanting to display a price as "$1.00" does the integer-to-decimal conversion at the rendering boundary, *outside* the engine. The matching engine's invariants (e.g., "total fills always conserve quantity") are exact-integer invariants; introducing float intermediates would break them.

3. **`OrderType::Limit { price }` not `Limit(Price)`.** When you later write `match order.order_type { Limit { price } => ..., Market => ... }`, the `price` binding makes the role obvious. Tuple-style enum variants are right when the variant is just "I'm a wrapper around this one thing"; struct-style is right when the field has a *name*. Here it does (`price`), so struct-style wins.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
diff -u ~/code/my-openhl/crates/clob/Cargo.toml ./crates/clob/Cargo.toml
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
```

The reference at `55a9dff` has types.rs at ~109 lines total (the full type set). Your version after L1 has only the newtypes + Side + OrderType + Display impls — about 65 lines. The remaining ~45 lines (Order, Fill, FillResult) are L2's scope. Diff should show those as the differences.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why are `AccountId`, `OrderId`, `Price`, `Qty` all `Copy`?**
They're `u64` under the hood — 8 bytes, no heap. Marking them `Copy` lets the engine pass them by value freely without `.clone()` everywhere. The trait bound costs nothing at runtime.

**Q: Why `Hash` on these types?**
Future use: `HashMap<OrderId, RestingOrder>` for O(1) cancel-by-id (lesson L6). Adding `Hash` now means no derive-cascade churn later.

**Q: Why isn't `Side: PartialOrd + Ord`?**
Because asking "is Buy less than Sell" is a meaningless question. If we derived `Ord`, callers could write `if side < Side::Sell { ... }` and get whichever variant Rust enumerated first (Buy, in our case) — but that's an artifact of declaration order, not semantically meaningful. Leaving the trait off forces callers to use `match` or `==`.

**Q: Why `#[must_use]` on `opposite()`?**
Because writing `side.opposite();` (without assigning the result) is almost certainly a bug — `opposite()` returns a new `Side`, it doesn't mutate. `#[must_use]` makes that bug a warning. Good practice for any function whose only purpose is to return a value.

## Next lesson (L2)

You have the field-level types — the atomic pieces. L2 builds the **record-level types** that combine them: `Order` (the input to the matching engine), `Fill` (the output), `FillResult` (the wrapper that bundles fills with remaining-quantity info). After L2, the type vocabulary is complete; L3+ uses these types to build the actual matching state machine.
````

---

## Seed-file slot

L1 lands in Module 1 (CLOB types) at sortOrder 0:

```typescript
{
  title: 'Lesson 1 — CLOB newtypes, Side, OrderType',
  slug: 'openhl-clob-types-newtype-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 25,
  xpReward: 60,
  content: `# Lesson 1 — CLOB newtypes, \`Side\`, \`OrderType\`\n\n...`
},
```

## SHA pinning discipline

L1 cites one openhl commit (§Answer key):
- `55a9dff` (Stage 8a — CLOB pure state machine — covers L1-L8 of this course since Stage 8a is one big commit)

The reader's diff against `55a9dff` will be partial at this point (only newtypes + Side + OrderType, no records yet). That's expected — L2 fills in the record types.

## Style review notes (self-critique before paste)

- **§Plan's "the interesting part isn't the code — it's the design decisions"** sets reader expectation correctly. L1 has very little code; the value is the rationale.
- **3 anti-fluency callouts** (no f64, no bool for Side, no premature OrderType variants). Each names a real Junior-engineer instinct.
- **Step 6's "AccountId doesn't get Display"** is the kind of detail that's invisible until you trip over it. Calling it out preempts the question.
- **§Common questions's `#[must_use]` note** is small but useful — readers won't always notice why we add it.
- **L2 preview** ("after L2 the type vocabulary is complete; L3+ uses them to build the state machine") names the load-bearing payoff for L1+L2 together.
