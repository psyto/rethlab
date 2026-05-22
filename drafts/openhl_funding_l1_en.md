# Building OpenHL Funding — L1 draft (EN) — build-along

> Drafted against openhl SHA `cd94137` (Stage 8b — funding state machine).
> Course: `building-openhl-funding-en` (track: `reth-l1-architect`).

---

## L1 — `openhl-funding-rate-scale-en`

- **Module:** 1 (Determinism + types), sortOrder 0
- **Course-level sortOrder:** 1 (lesson 2 of 12)
- **Duration:** 25 min
- **XP reward:** 50
- **Type:** CONTENT

### Content

````markdown
# Lesson 1 — `RATE_SCALE` — the constant that defends consensus

## Goal

Concepts you'll grasp in this lesson:

- **Why floats can't run in consensus** — FMA, rounding modes, denormals all diverge across compilers/CPUs; a single LSB disagreement on a rate forks the chain.
- **Why `RATE_SCALE = 1e9` is the sweet spot for fixed-point in i64** — parts-per-billion gives 9 decimal digits of precision while keeping 11 orders of magnitude of i64 headroom for products; `1e6` loses precision, `1e12` loses headroom.
- **The crate scaffolding move** — turning an empty `lib.rs` into a real crate with one `pub mod` and one re-export — and why module declarations land only when the file exists.
- **The "set once, never change" constant** — `RATE_SCALE` is consensus state, not a tunable; doc-comment placement and immutability matter.

Verification:

```bash
cargo build -p openhl-funding
```

…compiles.

Specific changes:

- **Cargo.toml** wiring an `openhl-clob` dependency (we'll need `AccountId` from there later, but the dep goes in now so it's not a surprise at L3) and a `[dev-dependencies]` block ready for `proptest` (used at L4 / L7).
- **`src/types.rs`** — newly created, containing the module doc + `pub const RATE_SCALE: i64 = 1_000_000_000`. Nothing else yet.
- **`src/lib.rs`** — was empty, now declares `pub mod types;` + re-exports `RATE_SCALE` at the crate root.

That's the lesson. **One constant, the most important constant in the entire crate.** Every rate, every premium, every settlement in the next 10 lessons will be expressed in terms of `RATE_SCALE`. Get this right and the rest of the math is straightforward; get it wrong and validators fork.

There are no tests in L1 — `RATE_SCALE` is a value, not a behavior. L2's first money type will get the first test.

## Recap

After L0:
- You understand why funding payments exist (mark/index drift correction).
- You understand why floats are a consensus fork hazard.
- The funding crate scaffold (Cargo.toml + empty `src/lib.rs`) was already in your workspace from before Stage 8b.

L1 turns the empty crate into a real crate with one publicly-visible value.

## Plan

Three edits:

1. **`crates/funding/Cargo.toml`** — add `openhl-clob = { path = "../clob" }` to `[dependencies]`, add a new `[dev-dependencies]` block with `proptest`.
2. **Create `crates/funding/src/types.rs`** — module doc explaining the determinism rationale + `RATE_SCALE` constant.
3. **`crates/funding/src/lib.rs`** — was empty; add the crate doc + `pub mod types;` + `pub use types::RATE_SCALE;` re-export.

That's it. Compile, see green, move on.

> 🛑 **Predict.** Before scrolling: `RATE_SCALE` is `1_000_000_000` = `1e9` = parts-per-billion. Why not `1_000_000` (parts-per-million, 6 digits) or `1_000_000_000_000` (parts-per-trillion, 12 digits)? Hint: think about what range of rates you need to represent, and what i64 can hold.

(Answer: **i64 max is ~9.2e18.** With `RATE_SCALE = 1e9`, a raw value of `1e18` represents `1e9` = a billion. We don't need rates in the billion range — funding rates are typically `0.0001` to `0.04` per interval. **`RATE_SCALE = 1e9` gives 9 decimal digits of precision with massive headroom**: `40_000_000` (`0.04`, the HL cap) is 11 orders of magnitude below `i64::MAX`. Going to `1e12` (parts-per-trillion) would buy more precision but cost headroom — multiplying two `1e12`-scaled values would need `i256` to stay safe. Going to `1e6` would save no real headroom and lose meaningful precision when a funding rate is `0.0001%` = `10` ppb. **`1e9` is the sweet spot for fixed-point rates in i64.**)

Lining the headroom up on a magnitude ruler makes it obvious why `1e9` sits in the safe zone:

```
magnitude                          value                              what lives there
─────────────────────────────────────────────────────────────────────────────────────
1e18  ────────  9_223_372_036_854_775_807  ───────  i64::MAX (~9.2 × 10^18)
1e18                                                ↑ ceiling for intermediate values
                                                    │
1e15  ────────  1_600_000_000_000_000     ───────  4% × 4% (cap²) = 1.6 × 10^15
                                                    │  ← absorbed comfortably by i128 intermediates
                                                    │
1e9   ────────  1_000_000_000             ───────  RATE_SCALE = 100% (one billion)
                                                    │
1e7   ────────       40_000_000           ───────  HL Funding Cap 4% (40 million)
                                                    │
1e6   ────────        1_000_000           ───────  0.1%
                                                    │
1e1   ────────               10           ───────  0.0001% = 10 ppb (realistic minimum granularity)
```

Three things this picture nails down:
1. **The cap (`4e7`) and RATE_SCALE (`1e9`) are still more than one order of magnitude apart** — a rate of `0.04` represented as `40_000_000` has comfortable room above it.
2. **Even cap² is only `1.6e15`** — that's still 3+ orders of magnitude below the i64 ceiling (`9.2e18`). So products like "rate × rate" or "rate × notional" can be promoted to `i128`, computed safely, then divided back by `RATE_SCALE` to land in `i64`. Module 2's `compute_premium` / `apply_funding` is exactly the place where those three orders of margin get spent.
3. **The smallest realistic granularity (`10` ppb = `0.0001%`) is still representable** — at `1e6` (parts-per-million), this value would round to `0` and precision would be destroyed. `1e9` is the integer size that fits both the realistic floor and ceiling of a funding rate into one space.

## Walk-through

### Step 1: Update Cargo.toml

Open `crates/funding/Cargo.toml`. Currently it looks like:

```toml
[package]
name         = "openhl-funding"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]

[lints]
workspace = true
```

Update to:

```toml
[package]
name         = "openhl-funding"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]
openhl-clob = { path = "../clob" }

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
```

Two changes:

1. **`openhl-clob = { path = "../clob" }`** in `[dependencies]`. The funding crate will need `AccountId` from `openhl-clob` (it appears in `Position` at L3). Adding the dep now keeps the diff focused at L3. **Cost: ~0** — declaring a path dep doesn't recompile anything until the first `use`.
2. **`[dev-dependencies]` block** with `proptest`. Used at L4 (premium antisymmetry test) and L7 (balanced-book zero-sum). Same logic: declare the dev-dep now, use it later. Production builds don't include proptest.

> 🛑 **Anti-fluency.** "Why not also add `openhl-clob` as a dev-dependency, since tests use it too?" **Because the production code uses `openhl_clob::AccountId` in `Position`, not just tests.** If `AccountId` were test-only we'd dev-dep it; since it's part of the production type signature, it has to be a regular dep. Dev-deps are only for things the tests pull in *that production never touches*.

### Step 2: Create `src/types.rs`

Create `crates/funding/src/types.rs`. The file doesn't exist yet — it's brand new in this lesson. Initial content:

```rust
//! Core types for the funding state machine.
//!
//! Pure data — no I/O, no allocation beyond what's needed for settlements.
//! Every type is `Copy`-friendly (or, in the case of `Position`, `Clone +
//! Copy`) so callers can pass snapshots without lifetime gymnastics.
//!
//! ### Why fixed-point integers, not floats
//!
//! Consensus determinism — every validator must compute the *same* funding
//! rate from the *same* inputs. Float arithmetic gives different bit patterns
//! across compilers and CPUs (FMA, rounding mode, denormal handling); the
//! moment two validators disagree on a single LSB they fork. We use signed
//! integers scaled by [`RATE_SCALE`] (parts-per-billion) for rates and
//! premiums, and a separate `Notional` type for quote-currency deltas.

/// Scale factor for [`FundingRate`] and [`Premium`]. A raw value of
/// `RATE_SCALE` represents `1.0` (i.e., 100%). With `1e9` we get 9 decimal
/// digits of precision — more than enough for funding rates that typically
/// sit in the ±0.01% to ±0.05% per interval band.
pub const RATE_SCALE: i64 = 1_000_000_000;
```

Four things to notice about this 15-line file:

1. **Module doc has a "Why fixed-point integers, not floats" section.** This is the load-bearing rationale for the entire crate. The next engineer reading `types.rs` six months from now needs to see this explanation at the top — not buried in a commit message. The phrase at the end of the module doc — "**callers can pass snapshots without lifetime gymnastics**" — encodes a design choice that drives the rest of the crate: "**snapshot**" means values are passed by-value (a copy of the state at a point in time, not a reference into someone's storage); "**lifetime gymnastics**" is Rust's idiom for the cascade of `'a` / `'b` annotations that creep into signatures when you start holding `&'a T` everywhere. Every money type added in L2+ (`MarkPrice`, `Premium`, etc.) is a `Copy` newtype precisely so that callers can hand values around freely without those lifetime annotations.
2. **The `[`FundingRate`]` and `[`Premium`]` cross-references.** Those types don't exist yet (L2 / L3). Rustdoc will warn about broken links during the L1 build. **Tolerate the warnings** — they resolve as we add types in L2/L3. If you really want zero warnings now, use `[FundingRate]` (no backticks) in plain text rather than `[`FundingRate`]` — but the cross-reference style matches the source convention.
3. **`pub const RATE_SCALE: i64 = 1_000_000_000`** — `i64`, not `u64`. Rates and premiums are *signed* (longs paying = positive premium, shorts paying = negative). Signed integers also let the arithmetic in `compute.rs` flow without sign-checking, since `i128` intermediates absorb the products naturally.
4. **The doc says `1.0` = `100%`.** That's a unit-of-account decision. A raw `RATE_SCALE` value (1e9) means a 100% funding rate per interval. `40_000_000` means 4%. `1_000_000` means 0.1%. **Read it as parts-per-billion of "1 unit notional."**

> 🛑 **Anti-fluency.** "Couldn't we just use `f64` and round the result before sharing across validators?" **Two reasons no.** (1) The intermediate calculations diverge before the final round; by then the damage is done. (2) "Round to N decimal places" itself uses float ops with rounding behavior that varies. **There's no escape hatch from float nondeterminism that's simpler than just using integers.**

### Step 3: Update `src/lib.rs`

Open `crates/funding/src/lib.rs`. Currently empty (`e69de29` blob). Replace with:

```rust
//! `openhl-funding` — funding-rate state machine.
//!
//! Pure state machine: no I/O, no async, no networking. Funding is applied
//! deterministically on a fixed cadence (see [`FundingClock`]); every tick is
//! a pure function over `(now, mark, index, positions)` → settlements.
//!
//! ### Hyperliquid-shape funding, in one paragraph
//!
//! Perpetual contracts don't expire, so the mark price can drift arbitrarily
//! from the spot ("index") price. Funding payments push it back: when mark >
//! index (longs are overpaying), longs pay shorts; when mark < index, shorts
//! pay longs. The premium `(mark - index) / index` is divided by a
//! per-day-interval count (HL: 8 — one settlement every 3 hours) to derive a
//! per-interval rate, capped at a network-set absolute max. At each tick
//! every account with an open position settles `position_size * mark * rate`
//! in quote currency.
//!
//! Integration with the rest of openhl happens at the EVM bridge: settlement
//! deltas become balance updates that the bridge bundles into payloads. That
//! integration lives in `crates/evm/`; the rate math and tick gating are here.

pub mod types;

pub use types::RATE_SCALE;
```

Notice what's missing compared to the L11-end version: `pub mod clock`, `pub mod compute`, the rest of the `pub use types::{...}` re-exports. Those come in lessons L4-L10 as we add the modules. **L1 lib.rs is the minimum that compiles.**

The crate-level doc (`//! ...`) explains:
- This is a pure state machine. No I/O.
- A 1-paragraph HL funding recap — for any reader who lands on the crate root without context.
- Where integration happens (the bridge, not here).

The cross-reference `[`FundingClock`]` will be broken until L8 adds it; same handling as types.rs cross-refs.

> 🛑 **Predict.** What happens if you write `pub mod compute;` here without creating `compute.rs`? Hint: think about what `pub mod foo;` actually does.

(Answer: **Compile error.** `pub mod compute;` tells the compiler to find either `compute.rs` or `compute/mod.rs` in the same directory. With neither present, you get `error[E0583]: file not found for module 'compute'`. That's why we add the `pub mod` declarations *as we create each file*, not all upfront.)

### Step 4: Compile

```bash
cargo build -p openhl-funding
```

Expected output:

```
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to `FundingRate`
warning: unresolved link to `Premium`
warning: unresolved link to `FundingClock`
    Finished `dev` profile [unoptimized + debuginfo] in 0.5s
```

Three rustdoc warnings about unresolved links. Those are expected — the linked types arrive in L2/L3 (types.rs) and L8 (clock.rs). **All three resolve by L11.** Don't suppress them with `#[allow(rustdoc::broken_intra_doc_links)]` — they're useful "you still need to add X" indicators while building.

Common errors:

- **`error[E0463]: can't find crate for 'openhl_clob'`** — you forgot the `openhl-clob = { path = "../clob" }` line in Cargo.toml. We don't use `openhl_clob` in L1 code, but if you preempted L3 and added the `use openhl_clob::AccountId` import to types.rs without the dep, this fires.
- **`error[E0583]: file not found for module 'clock'`** or `'compute'` — you preemptively added `pub mod clock;` to lib.rs. Remove it; we'll add it back in L8.
- **`error: failed to parse manifest`** — Cargo.toml syntax. Double-check the `[dev-dependencies]` block isn't typo'd as `[dev-dependences]`.

## Design reflection

Three load-bearing decisions in this lesson:

1. **`RATE_SCALE = 1e9` is i64, not u64.** Signed because rates are signed. The arithmetic in `compute.rs` will use `i128` intermediates to absorb products; `u64` would complicate sign handling for no benefit.

2. **Module doc comment is the rationale, not a tutorial.** The "Why fixed-point integers, not floats" paragraph explains *why* this design exists. A reader who lands on `types.rs` in 6 months needs the *why* — the *how* is in the code itself. **Doc comments earn their keep when they preempt the questions a future reader would ask.**

3. **`pub use types::RATE_SCALE` at the crate root.** Callers can write `use openhl_funding::RATE_SCALE;` instead of `use openhl_funding::types::RATE_SCALE;`. The shorter path is the canonical one; the module path is internal. **Re-export at the crate root for anything callers actually use.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/Cargo.toml ./crates/funding/Cargo.toml
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

After L1:
- **Cargo.toml** matches Stage 8b exactly.
- **types.rs** matches the *first ~30 lines* of Stage 8b's types.rs — module doc + `RATE_SCALE`. Everything below (the type definitions) is L2/L3.
- **lib.rs** is shorter than Stage 8b's lib.rs — only `pub mod types;` + the one `pub use`. The other module decls and re-exports come in later lessons.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why declare `[dev-dependencies] proptest` now if L1 has no tests?**
Because the Cargo.toml is a single diff target. Adding proptest at L4 would mean two Cargo.toml touches across the course; doing it once at L1 means the file stops changing after this lesson. **Cargo.toml stability is worth a small unused dep declaration.**

**Q: What's a "parts-per-billion" interpretation in practice?**
A funding rate of `1_250_000` raw means `0.00125` (0.125% per interval). Read it as "1,250,000 out of 1,000,000,000" — i.e., 0.125%. With HL's 8 settlements per day and a 4% cap, the range of values you'll see in practice is `±40_000_000` raw = `±4%/interval` = `±32%/day` worst case. **All comfortably representable in i64.**

**Q: Could we change `RATE_SCALE` later without breaking consumers?**
**No.** `RATE_SCALE` is a chain-consensus constant. Every persisted balance, every historical settlement, every test fixture is calibrated against `RATE_SCALE = 1e9`. Changing it requires a coordinated network upgrade. **Treat it as immutable post-deployment.** This is why we set it once, in a `const`, at the start of the crate.

**Q: Why no test for `RATE_SCALE`?**
What would the test assert? `assert_eq!(RATE_SCALE, 1_000_000_000)` is tautological — it tests the constant against itself. The constant's meaning lives in how *other* code uses it. **L2's first money type gets the first meaningful test.**

## Next lesson (L2)

L2 adds the four "money types" — `MarkPrice`, `IndexPrice`, `Premium`, `Notional`. Each is a newtype wrapping a primitive. The teaching focus shifts from "why fixed-point" to "why newtypes": preventing accidental cross-feeding (e.g., passing an `IndexPrice` where a `MarkPrice` is expected). The four types add ~30 lines to `types.rs` and prove out the newtype pattern that the remaining types (L3) will follow.
````

---

## Seed-file slot

L1 lands in Module 1 (Determinism + types) at sortOrder 0:

```typescript
{
  title: 'Lesson 1 — RATE_SCALE — the constant that defends consensus',
  slug: 'openhl-funding-rate-scale-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 25,
  xpReward: 50,
  content: `# Lesson 1 — \`RATE_SCALE\` — the constant that defends consensus\n\n...`
},
```

## SHA pinning discipline

L1 cites `cd94137` (Stage 8b). After L1, `Cargo.toml` matches Stage 8b exactly. `types.rs` matches the first ~30 lines (module doc + `RATE_SCALE`). `lib.rs` is a strict subset (just `pub mod types;` + the one `pub use`). The rest is L2-L10.

## Style review notes (self-critique before paste)

- **§Goal is tight** — 1 const, 3 file edits, no tests yet. Reader knows the surface area.
- **§Predict on RATE_SCALE = 1e9 vs alternatives** earns the choice — readers who haven't thought about fixed-point will arrive at the sweet-spot argument by reasoning, not by being told.
- **§Step 1 anti-fluency on dev-dep vs regular dep** preempts the common Rust-Cargo confusion.
- **§Step 3 predict on `pub mod` without file** preempts a real error readers will hit if they preempt later lessons.
- **§Step 4 documents the 3 rustdoc warnings** as *expected* — readers won't waste time debugging them.
- **§Common question on why no RATE_SCALE test** explicitly handles the "shouldn't every value be tested?" reflex.
- **L2 preview** is concrete: ~30 lines, 4 newtypes, the newtype pattern.
