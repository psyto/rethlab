# Building OpenHL Liquidation — L1 draft (EN) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math).

````markdown
## L1 — `openhl-liquidation-margin-scale-en`

**Stage**: Stage 10a — `22eedf9`

**Title**: Lesson 1 — `MARGIN_SCALE` + `LiquidationParams` — the dials on the risk engine

**Duration**: 30 min · **XP**: 60

---

# Lesson 1 — `MARGIN_SCALE` + `LiquidationParams` — the dials on the risk engine

## Goal

Concepts you'll grasp in this lesson:

- **Why basis points are the right fixed-point unit for margin** — bps gives you 4 decimal digits of precision, which is exactly the resolution real exchanges (HL, Binance, Drift) express margin requirements in. Same i64-saturating discipline as `RATE_SCALE`, different scale.
- **Why margin and rates need different scales** — funding rates need parts-per-billion because a single funding interval moves wealth by `0.0001` to `0.04` of notional; margin requirements move in `0.02` to `0.10` of notional. Two orders of magnitude difference → two orders of magnitude difference in scale.
- **`LiquidationParams` as network state, not user state** — the 10% / 2% / 1.5% defaults are *consensus parameters*, set once at network genesis and changed only by governance. The struct's job is to make the parameters first-class and explicit, not magic constants scattered through `compute.rs`.
- **The `hyperliquid_default()` constant constructor** — `const fn` so the defaults can land in `static` contexts, in test fixtures, in compile-time assertions. **`#[must_use]` so the struct can't be silently dropped after construction.**

Verification:

```bash
cargo build -p openhl-liquidation
```

…compiles.

Specific changes:

- **Cargo.toml** wiring `openhl-clob` and `openhl-funding` dependencies (`AccountId`, `Side`, `Qty` come from clob; `MarkPrice`, `PositionSize`, `Notional` come from funding — both are part of the production type signature, not test-only).
- **`src/types.rs`** — newly created, containing the module doc + `MARGIN_SCALE` constant + `LiquidationParams` struct + impl block with defaults and accessors.
- **`src/lib.rs`** — was empty, now declares `pub mod types;` + re-exports `MARGIN_SCALE` and `LiquidationParams` at the crate root.

L1 has no tests — `MARGIN_SCALE` is a value and `LiquidationParams` is a passive struct. L2's first behavior-bearing type (the `MarginHealth` enum) earns the first unit test.

## Recap

After L0:
- You understand why a perp DEX runs liquidations in consensus, not off-chain.
- You understand why floats are a chain-fork hazard (same as funding).
- The liquidation crate scaffold (Cargo.toml + empty `src/lib.rs`) is already in your workspace from before Stage 10a — same as the funding crate scaffold was before Stage 8b.

L1 turns the empty crate into a real crate with one publicly-visible scale + the parameters that govern the entire engine.

## Plan

Three edits, exactly mirroring funding L1's shape but with two deps instead of one:

1. **`crates/liquidation/Cargo.toml`** — add `openhl-clob = { path = "../clob" }` and `openhl-funding = { path = "../funding" }` to `[dependencies]`, plus a `[dev-dependencies]` block with `proptest` (used at L5 / L6).
2. **Create `crates/liquidation/src/types.rs`** — module doc explaining the bps rationale + `MARGIN_SCALE` constant + `LiquidationParams` struct + impl block.
3. **`crates/liquidation/src/lib.rs`** — was empty; add the crate doc + `pub mod types;` + `pub use types::{LiquidationParams, MARGIN_SCALE};`.

> 🛑 **Predict.** Before scrolling: funding uses `RATE_SCALE = 1_000_000_000` (parts-per-billion, 9 decimal digits of precision). Why does liquidation use `MARGIN_SCALE = 10_000` (basis points, 4 decimal digits)? Hint: think about what magnitudes you need to represent — funding rates are typically `0.0001` to `0.04` per interval; margin requirements are `0.02` to `0.10` of notional.

(Answer: **the resolution you need scales with the smallest meaningful step.** A funding rate of `0.0001%` per interval is a meaningful difference for high-volume traders — ppb is the right resolution. A maintenance margin of `0.02%` instead of `0.05%` is **not** a meaningful difference at the engine layer — production deployments set maintenance in whole bps (`200 bps`, `500 bps`). Bps is the conventional unit; using ppb would buy precision the system can't actually use. **Use the smallest scale that covers your real range.**)

## Walk-through

### Step 1: Update Cargo.toml

Open `crates/liquidation/Cargo.toml`. Currently:

```toml
[package]
name         = "openhl-liquidation"
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
name         = "openhl-liquidation"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]
openhl-clob    = { path = "../clob" }
openhl-funding = { path = "../funding" }

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
```

Three changes:

1. **`openhl-clob = { path = "../clob" }`** — needed for `AccountId`, `Side`, `Qty` (the bridge layer reuses these for liquidation orders, and `AccountSnapshot` carries `AccountId`).
2. **`openhl-funding = { path = "../funding" }`** — needed for `MarkPrice`, `PositionSize`, `Notional`. These types are the contact surface between funding and liquidation: both crates speak the same currency.
3. **`[dev-dependencies]` block** with `proptest`. Used at L5 (margin-ratio monotonicity test) and L6 (margin-health determinism test). Declared now, used later.

> 🛑 **Anti-fluency.** "Why not put both deps as dev-deps too, since L5/L6 are tests?" **Because the production code uses `MarkPrice`, `AccountId` etc. in the function signatures of `compute.rs`, not just in tests.** Funding made the same call at its L1. The rule: a type that appears in any `pub fn` signature has to be a regular dep, not dev-only.

### Step 2: Create `src/types.rs`

Create `crates/liquidation/src/types.rs`. The file doesn't exist yet — brand new this lesson. Initial content:

```rust
//! Core types for the liquidation engine.
//!
//! Pure data — no I/O, no allocation. Every type is `Copy`-friendly so the
//! engine can be invoked on snapshots taken at the bridge layer without
//! lifetime gymnastics. The convention follows `openhl-funding`: the
//! liquidation crate never owns mutable state in Stage 10a; it computes
//! over snapshots that the caller assembled.
//!
//! ### Why fixed-point integers, not floats
//!
//! Same answer as `openhl-funding`: consensus determinism. Every validator
//! must reach the same `MarginHealth` from the same inputs, and float
//! arithmetic varies bit-for-bit across compilers and CPUs. We use signed
//! integers scaled by [`MARGIN_SCALE`] (basis points, 10⁴) for margin
//! ratios.

/// Scale factor for `MarginRatio` — basis points (1 bp = 0.01%).
///
/// A raw value of `MARGIN_SCALE` represents `100%`; `MARGIN_SCALE / 10`
/// (= 1_000) represents `10%`. Bps is the conventional unit for margin
/// in TradFi and in crypto perp venues (Hyperliquid, Binance, Drift all
/// express margin requirements in bps).
pub const MARGIN_SCALE: i64 = 10_000;

/// Network parameters governing the margin model.
///
/// Bps convention: `initial_margin_bps = 1000` means a 10% initial margin
/// requirement. Maintenance must be ≤ initial; if a misconfigured network
/// sets them equal, every position at exactly that threshold classifies as
/// `Liquidatable` (the conservative default).
///
/// `liquidation_fee_bps` is charged on the notional being closed, paid
/// out of the account's collateral, and credited to the insurance fund
/// (Stage 10b). A typical HL-style value is 1–2% (100–200 bps).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LiquidationParams {
    /// Initial margin requirement in bps (e.g., 1000 = 10%).
    pub initial_margin_bps: u32,
    /// Maintenance margin requirement in bps (e.g., 200 = 2%).
    pub maintenance_margin_bps: u32,
    /// Liquidation fee in bps, charged on closed notional.
    pub liquidation_fee_bps: u32,
}

impl LiquidationParams {
    /// Hyperliquid-style defaults: 10% initial, 2% maintenance, 1.5% fee.
    /// Real production deployments use tiered maintenance (higher margin
    /// for larger position sizes) — out of scope for Stage 10a.
    #[must_use]
    pub const fn hyperliquid_default() -> Self {
        Self {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: 150,
        }
    }

    #[must_use]
    pub const fn initial_margin_bps(&self) -> u32 {
        self.initial_margin_bps
    }

    #[must_use]
    pub const fn maintenance_margin_bps(&self) -> u32 {
        self.maintenance_margin_bps
    }

    #[must_use]
    pub const fn liquidation_fee_bps(&self) -> u32 {
        self.liquidation_fee_bps
    }
}
```

Five things to notice about this file:

1. **`MARGIN_SCALE: i64 = 10_000`** — `i64`, not `u32` or `i32`. Even though the scale itself fits in i32, every multiplication that produces a margin ratio uses i128 intermediates and then saturates back to i64 — keeping `MARGIN_SCALE` as i64 means no extra `as i64` casts at every arithmetic site.

2. **`#[derive(Clone, Copy, Debug, PartialEq, Eq)]` on `LiquidationParams`.** All three of the fields are `u32`; the struct is 12 bytes and trivially `Copy`. The engine passes `LiquidationParams` to `margin_health` by reference (`&LiquidationParams`), but the type being `Copy` means callers don't get yelled at if they accidentally pass by value.

3. **`pub` fields *and* `const fn` getters.** The fields are public for the same reason `MarkPrice.0` is — these are transparent newtypes / params, not encapsulation boundaries. The `const fn` getters exist alongside the public fields because they're useful in constant contexts (e.g., a compile-time assertion that `maintenance_bps < initial_bps`) where `params.initial_margin_bps` works only in `const` if the type is `Copy`. Both styles, both fine.

4. **`hyperliquid_default()` is `const fn`.** This lets the defaults appear in `static` items: `static PARAMS: LiquidationParams = LiquidationParams::hyperliquid_default();` works in any context, including embedded in tests, fixtures, and protobuf-encoded genesis state. **A `const fn` constructor is the bridge between "value I want" and "value I can declare anywhere."**

5. **`#[must_use]` on the constructor and getters.** Constructed-but-dropped `LiquidationParams` is almost certainly a bug — you computed the defaults and threw them away. Same logic for accessor: reading `initial_margin_bps()` and ignoring the result is almost always wrong. `#[must_use]` makes the compiler ask the reader to confirm.

> 🛑 **Anti-fluency.** "Why three separate `u32` fields instead of one `LiquidationParams` newtype wrapping a `(u32, u32, u32)` tuple?" **Because the three values mean different things.** Tuple ordering is positional and fragile — a refactor that swaps `initial` and `maintenance` produces a silent semantic bug. Named fields force the call site to be explicit: `LiquidationParams { initial_margin_bps: 1000, ... }`. **Names cost no runtime; positional tuples earn no runtime.**

### Step 3: Update `src/lib.rs`

Open `crates/liquidation/src/lib.rs`. Currently empty. Replace with:

```rust
//! `openhl-liquidation` — perpetual-position liquidation engine.
//!
//! Pure compute in Stage 10a: no I/O, no async, no networking. Liquidation
//! decisions are deterministic functions over `(account_snapshot, mark,
//! params)`. Every validator on the chain must reach the same
//! [`MarginHealth`] from the same inputs; if two validators classify the
//! same account differently, the chain forks.
//!
//! ### Hyperliquid-shape liquidation, in one paragraph
//!
//! Perpetual contracts are levered positions backed by deposited
//! collateral. As the mark price moves against an open position,
//! unrealized PnL eats into the account's equity. When `equity / notional`
//! drops below the network's maintenance-margin requirement, the engine
//! force-closes the position at market — opposite side, full size, no
//! limit price. The liquidation fee is debited from collateral and
//! credited to the insurance fund. Any residual collateral, after fee
//! and PnL settlement, stays with the account. If equity went negative
//! before the close (the account is "underwater"), the insurance fund
//! absorbs the deficit instead of the position closing solvently.

pub mod types;

pub use types::{LiquidationParams, MARGIN_SCALE};
```

Notice what's missing compared to the L11-end version: `pub mod compute`, the rest of the `pub use types::{...}` re-exports for `MarginHealth`, `MarginRatio`, `AccountSnapshot`, `CloseOrderSpec`. Those come in L2-L7 as we add the types and the compute functions. **L1 lib.rs is the minimum that compiles.**

The cross-reference `[`MarginHealth`]` will be broken until L2 adds the enum; rustdoc will emit a warning that we tolerate (same handling as funding L1).

> 🛑 **Predict.** What happens if you write `pub use types::*;` here instead of the explicit two-name re-export? Hint: think about what types exist after L1 vs after L7, and which API surface you're committing to.

(Answer: **`pub use types::*` would re-export everything that ever lives in `types.rs`, including future helpers and private support types you might accidentally `pub`.** Explicit `pub use types::{LiquidationParams, MARGIN_SCALE}` makes the crate's public surface a deliberate decision — every time you add a public type to `types.rs`, you also have to add it to the lib.rs re-export, which forces a moment of "is this part of the public API?" Glob re-exports are a maintenance hazard: a future helper added with `pub` instead of `pub(crate)` accidentally becomes part of the public API. **Explicit re-export is a checklist for the public API surface.**)

### Step 4: Compile

```bash
cargo build -p openhl-liquidation
```

Expected output:

```
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
warning: unresolved link to `MarginHealth`
    Finished `dev` profile [unoptimized + debuginfo] in 0.4s
```

One rustdoc warning about an unresolved link to `MarginHealth` (added at L2). **Don't suppress it** — it's the build telling you what's still missing.

Common errors:

- **`error[E0463]: can't find crate for 'openhl_clob'` or `'openhl_funding'`** — you forgot to add one of the `path = "..."` deps in Cargo.toml. L1 code doesn't actually use them yet, but if you preempted the L3 imports they'll fire.
- **`error[E0583]: file not found for module 'compute'`** — you preemptively added `pub mod compute;` to lib.rs. Remove it; we'll add it back at L4.
- **`error: failed to parse manifest`** — Cargo.toml syntax. Easy mistake: `[dev-dependences]` typo.

## Design reflection

Three load-bearing decisions in this lesson:

1. **`MARGIN_SCALE = 10_000`, not `1_000_000_000`.** Two orders of magnitude finer than funding's `RATE_SCALE` would be wrong — production margin parameters are not set in ppb. Two orders coarser (`100`, percent) would lose meaningful resolution. **Bps is the unit the world has settled on for margin; we match it.**

2. **Default constructor is `const fn`, not a `Default` impl.** Why both styles aren't right: `Default::default()` returns reasonable zero-ish defaults across many types. `LiquidationParams::default()` would suggest "zero margin, zero fee" which is **dangerous** — a network running with `default()` params has no liquidations at all. **`hyperliquid_default()` is a named, intentional default** — callers have to ask for it by name, which keeps the safety-critical nature visible.

3. **Three independent `u32` fields, not a `LiquidationConfig` struct nested inside.** Future migration to tiered maintenance margin (HL-style: higher maintenance % for larger positions) might want a `Vec<MaintenanceTier>` field. We don't add that now — premature generalization. **Stage 10a uses flat margin; Stage 10c+ can revisit if tiered is needed.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/Cargo.toml ./crates/liquidation/Cargo.toml
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

After L1:
- **Cargo.toml** matches Stage 10a exactly.
- **types.rs** matches the *first ~50 lines* of Stage 10a's types.rs — module doc + `MARGIN_SCALE` + `LiquidationParams` + impl. The rest (`MarginRatio`, `MarginHealth`, `AccountSnapshot`, `CloseOrderSpec`) is L2/L3.
- **lib.rs** matches the *first ~25 lines* of Stage 10a's lib.rs — crate doc + `pub mod types;` + the two re-exports. The other re-exports come as we add their types.

## Common questions

**Q1: Why not put `MARGIN_SCALE` in `lib.rs` alongside the crate doc?**

It belongs with the type system it scales. `types.rs` is where everything related to the unit-of-account (margin ratios, bps, classification thresholds) lives. The lib.rs is the public-API surface — re-exporting `MARGIN_SCALE` from types.rs to the crate root is cleaner than splitting the source of truth.

**Q2: Should `LiquidationParams` validate that `maintenance ≤ initial` in the constructor?**

Stage 10a says no — the struct accepts any combination. Stage 10c will add a `validated()` constructor that returns `Result<Self, ParamsError>` when called by genesis-loading code; the unvalidated constructor stays for tests and proptest generators that *want* to feed pathological inputs.

**Q3: Why is `hyperliquid_default()` 10% / 2% / 1.5% and not something else?**

HL's actual maintenance margin tiers run from 1.25% to 6.67% depending on position size; we picked 2% as a representative middle value. Initial is 10× maintenance — a common shape. Fee at 1.5% is the public HL number for ETH/BTC; lighter assets are lower. **None of these are precious — your network sets its own.**

**Q4: What's the actual i64-overflow risk on a margin ratio computation?**

`margin_ratio = equity * MARGIN_SCALE / notional`. With `MARGIN_SCALE = 10_000` and `equity` and `notional` bounded by `i64::MAX`, the product `equity * MARGIN_SCALE` can overflow i64 when `equity > i64::MAX / 10_000 ≈ 9.2e14`. At realistic exchange scales that's $920 trillion of equity — far above plausible inputs, but L5 still does the multiplication in `i128` and saturates back. **The reflex is the same as funding: any product that *can* exceed i64 *will* exceed i64 at some adversarial input.**

**Q5: Could we use `u32` for `MARGIN_SCALE` and `bps` and avoid the i64 conversion noise?**

You could — and you'd save a few `i64::from(...)` calls. The cost: every margin-ratio calculation involves `equity` (signed) and `notional` (unsigned), and mixing signed/unsigned in arithmetic requires explicit casts at every site. Better to upcast to i64 once at the boundary (`i64::from(params.initial_margin_bps)`) and keep the arithmetic signed throughout. **Convert at the boundary, compute in one type.**

## Next lesson (L2)

L2 adds the `MarginRatio` newtype + the `MarginHealth` enum. `MarginHealth` is the load-bearing classification type — the next 5 lessons all return or consume it. You'll see why we made it a 4-variant enum and not a `bool` or a `u8`.

````

---

## Seed-file slot

L1 lands in Module 1 at sortOrder 0:

```typescript
{
  title: 'Lesson 1 — MARGIN_SCALE + LiquidationParams — the dials on the risk engine',
  slug: 'openhl-liquidation-margin-scale-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 1 — MARGIN_SCALE + LiquidationParams — the dials on the risk engine\n\n...`
},
```

## SHA pinning discipline

L1 cites `22eedf9` (Stage 10a). The Cargo.toml diff and the types.rs diff in the answer key both compare against this SHA.

## Style review notes (self-critique before paste)

- **The "Why bps, not ppb" predict callout** is the educational backbone of L1. Without it, the reader takes `MARGIN_SCALE = 10_000` on faith; with it, they understand *why* the scale was chosen, and the "use the smallest scale that covers your real range" principle generalizes to the next L1 they write for any future fixed-point crate.
- **The `hyperliquid_default()` discussion** is longer than the funding L1's `RATE_SCALE` discussion because `LiquidationParams` is a struct with three knobs, each meaningful, with safety implications. Funding's `RATE_SCALE` was one number; here we have to also justify the default values themselves.
- **The `Default::default()` vs named-default discussion in §Design reflection** is the most opinionated part of the lesson. Some Rust idioms encourage `Default` — for safety-critical params, named defaults are the better discipline. Worth surfacing because the reader's first instinct will be to derive `Default`.
- **Q5 in Common questions** addresses a real code-review comment Hiro will get: "why all the `i64::from` calls?" Pre-empt it here so it doesn't have to be debated in a PR.
