# Building OpenHL — L3 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHA `13113db` (Stage 4: ConsensusBridge trait + CL/EL contract types). L2 covered the types portion of this commit; L3 covers the trait portion.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).

---

## L3 — `openhl-bridge-trait-en`

- **Module:** 2 (Contract types), sortOrder 1 within module
- **Course-level sortOrder:** 2 (lesson 3 of 15)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Lesson 3 — The `ConsensusBridge` trait

## Goal

By the end of this lesson:

```bash
cargo check -p openhl-consensus
```

…passes. The `openhl-consensus` crate now contains the four-message `ConsensusBridge` trait — the typed API surface that consensus calls into and execution implements. **No impls yet** (those start in L4); just the trait and its associated error type. Once this compiles, the contract is fully defined at the type level, and every later lesson is "fill in this trait method" or "use a method on this trait."

## Recap

After L2:

```
crates/types/src/lib.rs:
  - BlockHash, PayloadId, PayloadAttrs, PayloadStatus, ExecutedBlock
  - + Display impl for BlockHash
  - + 4 unit tests passing
```

The other crates (including `openhl-consensus`) are still empty stubs:

```
crates/consensus/src/lib.rs:
  //! Consensus layer — Malachite BFT.
crates/consensus/Cargo.toml:
  [dependencies]   ← empty
```

## Plan

You'll do three things:

1. **Add 4 dependencies** to `crates/consensus/Cargo.toml`: `openhl-types` (to use the types from L2), `async-trait` (the macro that makes `async fn` legal in trait methods), `thiserror` (derive macro for nice error types), `eyre` (a `Result` library that pairs well with `thiserror`).
2. **Create `crates/consensus/src/bridge.rs`** with the `ConsensusBridge` trait (4 async methods) and the `BridgeError` enum (3 variants).
3. **Wire `bridge` into the crate** by adding `pub mod bridge;` to `crates/consensus/src/lib.rs`.

This trait is the **single most-referenced artifact in the entire course**. L4 implements it (`InMemoryEvmBridge`). L5 implements it again (`RethEvmBridge`). L9 calls into it from the actor pipeline. L11-L13 implement it a third time (`LiveRethEvmBridge`). **The signatures you write now propagate everywhere downstream.**

> 🛑 **Predict.** Look at the four method names again: `build_payload`, `payload_ready`, `validate_payload`, `commit`. **Three of them are CL → EL (consensus calling execution); one is EL → CL (execution responding). Which one is the EL → CL direction, and why?** Hint: think about which method's *return value* the consensus side is waiting on.

## Walk-through

### Step 1: Add dependencies to `crates/consensus/Cargo.toml`

Open `crates/consensus/Cargo.toml`. The `[dependencies]` section is currently empty (just a header). Replace it with:

```toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }
```

That's all four deps. Each uses `workspace = true` to inherit the pinned version from the root `Cargo.toml`. Save the file and run:

```bash
cargo check -p openhl-consensus
```

This should still pass — we just declared deps we haven't used yet. Cargo will fetch any that aren't already in the lock file. `async-trait` and `thiserror` are small; this should be ~5 seconds.

**Why these four specifically?**

- **`openhl-types`** because the trait signatures reference `BlockHash`, `PayloadAttrs`, `PayloadId`, `ExecutedBlock`, `PayloadStatus` — all five types from L2.
- **`async-trait`** because Rust's native `async fn` in trait is still gated behind several caveats (Send bounds, `dyn` compatibility). The `#[async_trait]` macro handles them by desugaring to `Pin<Box<dyn Future<...>>>`. Verbose, but stable and `dyn`-compatible.
- **`thiserror`** to derive a custom error enum without writing boilerplate `impl Display`/`impl Error` by hand.
- **`eyre`** for the catch-all `Internal` error variant. `eyre::Report` wraps any error with a backtrace; we use it for "something unexpected went wrong" without enumerating every internal failure mode.

### Step 2: Create `crates/consensus/src/bridge.rs`

A new file. The full content:

```rust
//! The CL/EL contract: four messages between consensus and execution.

use async_trait::async_trait;
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use thiserror::Error;

/// The four-message contract between BFT consensus and EVM execution.
///
/// Every interaction between `openhl-consensus` and `openhl-evm` flows through one of these methods. Anything else is a contract leak.
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
    /// CL → EL: build a candidate block on `parent`. Returns immediately; await the block via [`Self::payload_ready`].
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError>;

    /// EL → CL: wait for an in-flight build to complete.
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError>;

    /// CL → EL: would this peer-proposed block execute cleanly?
    async fn validate_payload(
        &self,
        block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError>;

    /// CL → EL: finalize this block. Fire-and-forget; failure halts the chain.
    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError>;
}

#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("execution layer rejected payload: {0}")]
    Rejected(String),

    #[error("execution layer is syncing")]
    Syncing,

    #[error("internal: {0}")]
    Internal(#[from] eyre::Report),
}
```

Walk through what each piece does — this is the most important file in the course.

### Step 3: Understand the trait declaration

```rust
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
```

**`#[async_trait]`** is an attribute macro. It rewrites the trait so each `async fn` returns `Pin<Box<dyn Future<Output = ...> + Send + 'a>>` behind the scenes. Without this macro, Rust gives you an error trying to use `async fn` in a trait you want to call via `dyn ConsensusBridge` (which we will).

**`pub trait ConsensusBridge`** makes the trait part of the public API — both `openhl-consensus` and downstream crates (like the upcoming `openhl-evm` impls) can name it.

**`: Send + Sync`** are super-trait bounds. They say: every type that implements `ConsensusBridge` must also be `Send` (movable across thread boundaries) and `Sync` (referenceable from multiple threads). We need this because the bridge will be held in an `Arc<dyn ConsensusBridge>` shared between actor tasks; each actor may live on a different thread.

> 🛑 **Anti-fluency.** "Can't I just write `async fn` directly without the macro?" **As of Rust 1.75 you can, but with caveats.** Native async-fn-in-trait doesn't yet give you `Send` bounds on the returned future automatically, and `dyn Trait` for traits with native async fns has rough edges. `#[async_trait]` is the boring, working solution. When the native feature matures (likely 1.95-2025+), we can revisit. For now: macro.

### Step 4: Understand the four method signatures

```rust
async fn build_payload(
    &self,
    parent: BlockHash,
    attrs: PayloadAttrs,
) -> Result<PayloadId, BridgeError>;
```

Inputs: parent block hash and payload attributes. Output: a `PayloadId`, which is an opaque handle — the bridge has started building, but the block isn't ready yet. Returns immediately.

```rust
async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError>;
```

The companion. Hand back the `PayloadId` from `build_payload`; receive the `ExecutedBlock`. Async because the call may block until the in-flight build finishes.

**Why split into `build_payload` + `payload_ready` instead of one `build_payload -> ExecutedBlock`?** Because the EL needs to build *during* the previous round's voting. If `build_payload` returned the block synchronously, the proposer would have to wait for build before broadcasting; with the split, build runs in the background while voting happens, and the proposer's hot path becomes "fetch the prepared block" (microseconds). This is the **single most important latency trick** in the design. Sub-second block times depend on it.

```rust
async fn validate_payload(
    &self,
    block: &ExecutedBlock,
) -> Result<PayloadStatus, BridgeError>;
```

Different shape: `&ExecutedBlock` (borrowed, not owned). The bridge is *examining* the block, not consuming it. Returns `PayloadStatus` (the enum from L2): Valid / Invalid / Syncing.

**Why borrowed?** Because consensus may need to inspect the same block multiple times (broadcast it, persist it, then validate). Taking ownership would consume the value at the call site, forcing the caller to clone. Borrowing lets the caller keep it.

```rust
async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError>;
```

Smallest signature: hash in, unit out. **Fire-and-forget.** When consensus has decided on a block, this method tells the EL to finalize it. The EL applies it to state, updates fork-choice, and never sees this hash unset later. Returning `Result<()>` lets the EL signal a hard failure (which **halts the chain** — see L9), but successful commits return nothing.

**Notice no `&ExecutedBlock` argument.** By the time commit is called, the bridge already saw this block during `payload_ready` or `validate_payload`. Asking for just the hash forces consensus to remember nothing — the EL keeps state, the CL stays stateless.

### Step 5: Understand the `BridgeError` enum

```rust
#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("execution layer rejected payload: {0}")]
    Rejected(String),

    #[error("execution layer is syncing")]
    Syncing,

    #[error("internal: {0}")]
    Internal(#[from] eyre::Report),
}
```

Three variants — same number as `PayloadStatus`, but **not** a 1:1 correspondence. The distinction:

- **`Rejected(String)`** — the EL applied logic to the block and said "no, this is bad." The String holds a human-readable reason. Consensus should treat the block as invalid: vote nil, move to the next round.
- **`Syncing`** — the EL doesn't have the state to give an answer yet. Different from rejection: we don't know if the block is bad, we just can't tell yet. Consensus should retry later, not vote nil.
- **`Internal(eyre::Report)`** — something unexpected broke. Disk full, mutex poisoned, panic caught. Consensus should **halt** — this is not recoverable at the chain level.

**Why is `Syncing` an error variant, when `PayloadStatus::Syncing` is also a status?** Because the contract has two layers:

- `PayloadStatus::Syncing` from `validate_payload` means "the EL processed the request and reports its sync state."
- `BridgeError::Syncing` from any method means "the call itself couldn't complete." More commonly applies to `build_payload` (can't build if you don't have parent state) and `commit` (can't finalize what you can't apply).

**`#[from] eyre::Report`** auto-derives `From<eyre::Report> for BridgeError::Internal`. That means bridge implementations can write `let foo = some_call()?;` where `some_call()` returns `Result<_, eyre::Report>`, and the `?` automatically wraps it as `BridgeError::Internal`. This is the canonical way to bubble up "unexpected" errors.

### Step 6: Wire `bridge` into the crate

Open `crates/consensus/src/lib.rs`. Currently:

```rust
//! Consensus layer — Malachite BFT.
```

Replace with:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
```

`pub mod bridge;` tells Rust "this crate has a public module called `bridge`, sourced from `src/bridge.rs`." Without this line, your `bridge.rs` is invisible from outside the crate.

## Test

Run:

```bash
cargo check -p openhl-consensus
```

Expected:

```
   Compiling openhl-consensus v0.1.0
    Finished `dev` profile [optimized + debuginfo] target(s) in 0.45s
```

You might get warnings about unused imports (e.g., `ExecutedBlock` if you typo'd a method signature) or unused trait. **Hard errors are not OK**; warnings are fine for now.

Common errors and fixes:

- **`use of undeclared crate or module 'async_trait'`** — `async-trait` isn't in `[dependencies]`. Re-check Step 1.
- **`cannot find type 'BlockHash' in this scope`** — `openhl-types` isn't imported. Re-check the `use` line in `bridge.rs`.
- **`expected type parameter 'Send + Sync', found...`** — you wrote `pub trait ConsensusBridge` without `: Send + Sync`. Add it back.
- **`#[from] is only allowed on a single field`** — you have more than one `#[from]` on a variant, or wrote `#[from]` on a variant without a tuple field.

You can also try compiling the whole workspace:

```bash
cargo check --workspace
```

Should still pass.

## Design reflection

Three load-bearing decisions encoded:

1. **Four methods, not three or five.** Every BFT-L1 implementation converges on exactly these four. Collapsing `build_payload` + `payload_ready` into one would kill build-during-voting. Adding a fifth (e.g., `notify_view_change`) would leak consensus internals into execution. The number is determined by the BFT round structure (propose → vote → decide), not by language preference.

2. **`Send + Sync` bound on the trait.** Forces every implementation to be thread-safe. Without this, an `Arc<dyn ConsensusBridge>` shared between actors won't compile. With this, implementers know up-front that mutable state must be behind `Mutex` or atomics. The compiler enforces what would otherwise be a runtime-bug discipline.

3. **Three error variants, not one or many.** Three corresponds to three distinct consensus-side actions: vote-against, wait, halt. One `BridgeError(String)` would make the consensus side parse strings. Five+ variants (e.g., `Rejected.Hash`, `Rejected.Number`, `Rejected.BaseFee`) would either leak EL internals to the consensus side or rapidly drift out of sync as EL changes. Three is the cardinality of the **consensus response** to errors; the EL's internal taxonomy stays opaque behind the String in `Rejected`.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 13113db
diff -u ~/code/my-openhl/crates/consensus/src/bridge.rs ./crates/consensus/src/bridge.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
```

Expected: doc-comment wording can vary slightly (you might have written `commit` or `Commit` for the variant — both ok). The 4 method signatures, the 3 error variants, the `#[async_trait]` attribute, and the `: Send + Sync` bound must match exactly.

Return:

```bash
git checkout main
```

## Common questions

**Q: My `cargo check` complains about `pub mod bridge` and `bridge.rs not found`.**
The file is at `crates/consensus/src/bridge.rs`, not `crates/consensus/bridge.rs`. The convention is that modules declared in `lib.rs` live as siblings to it.

**Q: Why is `validate_payload` async if it just inspects bytes?**
At v0 it could be sync — checking a `BlockHash` against a `parent_hash` is microseconds. But production validate_payload runs the EVM against the parent state, which requires async DB access. Marking it async now means we don't have to break the trait later. Cost is ~0 (an immediate-ready future is essentially free).

**Q: Can I rename the methods? `build_payload` is verbose.**
You can in your own code, but you'll diverge from openhl. The names match the Ethereum Engine API (`engine_forkchoiceUpdated` returns a `PayloadId` that you fetch via `engine_getPayload`), which makes the openhl ↔ Ethereum mapping recognizable to anyone familiar with the latter.

**Q: What's `eyre::Report` and why not just `String`?**
`eyre::Report` captures a chain of causes with source-location info. When debugging a chain halt, you want to see "DB write failed: disk full: at io.rs:142" not just "internal error". `Report` does this; `String` doesn't. We use it for the catch-all variant.

## Next lesson (L4)

The contract is now fully specified at the type level. L4 starts implementing it. We write `InMemoryEvmBridge` — a test double that stores fake blocks in a `Mutex<HashMap>` and returns synthesized hashes. No real EVM, no real state — just enough to make the trait satisfiable and the consensus side testable. **Critically, the same trait `ConsensusBridge` covers both `InMemoryEvmBridge` (L4) and `LiveRethEvmBridge` (L11+) — that's the polymorphism win we're paying for with the `Send + Sync` bound and `async_trait` macro.**
````

---

## Seed-file slot

L3 lands in Module 2 (Contract types) at sortOrder 1:

```typescript
{
  title: 'Lesson 3 — The ConsensusBridge trait',
  slug: 'openhl-bridge-trait-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 3 — The \`ConsensusBridge\` trait\n\n...`
},
```

## SHA pinning discipline

L3 references one openhl commit (§Answer key):
- `13113db` (Stage 4: ConsensusBridge trait + CL/EL contract types — same commit as L2; L3 covers the trait, L2 covered the types)

## Style review notes (self-critique before paste)

- **L3 is 30 min — same length as L2.** Code volume is small (~45 lines of `bridge.rs`), but understanding density is high. Each line of the trait has design rationale.
- **Step 3-4-5 walk through the file piece by piece.** This is intentional. After L1 (TOML/Cargo) and L2 (5 type defs), readers may glaze through code blocks. The break-down forces them to engage with each design choice.
- **The Anti-fluency callout in Step 3** ("Can't I just write async fn directly?") addresses Rust 1.75+ readers who know the language has matured but don't know the trade-offs yet.
- **§Design reflection emphasizes the trait number is determined by BFT structure**, not language taste. This is the strongest meta-claim in the lesson and the one most worth landing.
- **The "Common questions" Q3** (renaming methods) is a place where I've seen learners get tripped up. They want to "simplify" `build_payload` → `build`, then later find they can't map openhl ↔ Engine API. Worth pre-empting.
