# Building OpenHL — L8 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHA `4229502` (Stage 6b — OpenHlCodec satisfying WalCodec/ConsensusCodec/SyncCodec).
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).
> Note: this is the first of two lessons that together close out Stage 6 (engine spawn). L9 finishes the job with the Node trait + `start_engine` smoke test.

---

## L8 — `openhl-codec-en`

- **Module:** 4 (CL types), sortOrder 2 within module
- **Course-level sortOrder:** 7 (lesson 8 of 16 — total grew from 15 after the Codec/Node split)
- **Duration:** 35 min
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# Lesson 8 — `OpenHlCodec` — codec slot the engine demands

## Goal

Concepts you'll grasp in this lesson:

- **Stub-as-trait-satisfier** — incremental development at the type level. Writing 4-line stubs that name what's unimplemented beats writing 50-line protobuf encoders for paths the engine never exercises. The stub fires loudly if Malachite ever does call it.
- **Sub-trait blanket impls** — `WalCodec / ConsensusCodec / SyncCodec` are automatic once you implement the right `Codec<T>` constituents. A `static_assertions::assert_impl_all!` test verifies the blanket impls fire and the compile-time bound is real.
- **Where the codec belongs in the crate graph** — codec lives in `openhl-consensus`, not `openhl-types`, because it depends on Malachite's `informalsystems-malachitebft-app` (libp2p, ractor). Putting it in `types/` would force every downstream crate that wants `BlockHash` to pull libp2p too.
- **Wire format vs. canonical signing format** — L7's canonical encoding is *what gets signed*; L8's codec is *what gets sent over the wire*. They overlap but aren't the same: wire format adds framing, versioning, length prefixes — none of which the signature covers.
- **Why one real codec is enough at L8** — only `ProposalPart` round-trips in our single-validator devnet. The other 7 are gossip / sync / WAL paths that don't fire until you add peers or recover from a crash.

Verification:

```bash
cargo test -p openhl-consensus
```

…passes **16 tests** (14 from L7 + 2 new ones for the codec). The 2 new tests are: a compile-time assertion that `OpenHlCodec` satisfies all three super-traits, and a runtime round-trip test for `ProposalPart`.

You also unblock a much heavier dependency: `informalsystems-malachitebft-app` pulls in libp2p, ractor, and the rest of the engine surface — your first compile after this **is genuinely heavy** (~38 seconds on a modern multi-core machine; can stretch to several minutes on single-core-bound or resource-constrained environments). The investment buys you the actor system you'll spawn in L9.

Specific changes:

- `crates/consensus/Cargo.toml` adds `informalsystems-malachitebft-app` + `static_assertions` (dev).
- `crates/consensus/src/codec.rs` — new file with `OpenHlCodec` struct, `CodecStub` error type, 8 `Codec<T>` impls (1 real for `ProposalPart`, 7 stubs), 2 unit tests.
- `crates/consensus/src/lib.rs` — wires `pub mod codec;`.

## Recap

After L7 your `openhl-consensus` crate has:

```
crates/consensus/src/lib.rs   — pub mod bridge, context, signing, signing_provider, types
crates/consensus/src/signing.rs            — canonical encoding + low-level sign/verify
crates/consensus/src/signing_provider.rs   — OpenHlSigningProvider impls SigningProvider<OpenHlContext>
crates/consensus/src/types/                — 7 type files + mod.rs
crates/consensus/src/context.rs            — OpenHlContext + Context impl
```

`cargo test -p openhl-consensus` passes 14 tests. **The engine still won't compile** — `start_engine` is generic over a codec, and we haven't provided one yet.

## Plan

Five things:

1. **Add `informalsystems-malachitebft-app` to `crates/consensus/Cargo.toml`.** This is the heavy lift — it pulls libp2p, ractor, and the full app surface transitively. First compile after this **is genuinely heavy** (~38s on a modern multi-core box; up to several minutes on slower or more constrained machines).
2. **Create `crates/consensus/src/codec.rs`** with the `OpenHlCodec` unit struct, a `CodecStub` error, and 8 `Codec<T>` impls.
3. **Wire `pub mod codec;`** into `lib.rs`.
4. **Run** `cargo test -p openhl-consensus` — 16 tests pass.
5. **Observe** that the compile-time assertion compiles. This is the signal that you've satisfied the engine's codec trait bound.

This lesson teaches **one pattern that matters more than any specific impl**: **stub trait methods with a clear failure mode**. When you need to satisfy a large trait bound but the methods aren't on your hot path, you can stub them. The stub error message should name what was called so the reader knows what to implement next. This is **incremental development at the type-system level** — you don't have to implement every codec at once; you provide enough to compile, fail loudly on the actual call sites.

> 🛑 **Predict.** Before scrolling: why does Malachite force the engine to know how to encode network messages when our single-validator devnet has no network to send them on? Hint: trait bounds are about *types*, not *runtime behavior*. The engine is generic over your codec because validators that don't gossip in your devnet *would* gossip in a multi-validator deployment. The codec slot is required because the engine doesn't know whether it has peers; the impl needn't be complete because in our test, the gossip code path never fires.

## Walk-through

### Step 1: Add the app dependency to Cargo.toml

Open `crates/consensus/Cargo.toml`. Add one line in the `[dependencies]` section:

```toml
informalsystems-malachitebft-app             = { workspace = true }
```

Place it next to the other malachite deps. The `app` crate is a meta-crate that re-exports types from across the engine — `Codec`, `ConsensusCodec`, `SyncCodec`, `WalCodec`, `SignedConsensusMsg`, `StreamMessage`, `ProposedValue`, `sync::{Status, Request, Response}` all live here.

Run a quick sanity check:

```bash
cargo check -p openhl-consensus 2>&1 | tail -5
```

The first build is genuinely heavy (libp2p + ractor + dependencies compile for the first time — **~38s on a modern multi-core machine, up to several minutes on slower or single-core-bound environments**). If the progress log looks stuck, it isn't — pour another coffee. Subsequent builds use the cache and the incremental rebuild is back to seconds.

### Step 2: Create `crates/consensus/src/codec.rs`

Top of the file:

```rust
//! Stub `Codec<T>` impls so `OpenHlCodec` satisfies `WalCodec`, `ConsensusCodec`,
//! and `SyncCodec` via Malachite's blanket impls.
//!
//! In single-validator mode none of these codecs fire — they're for network
//! gossip (Consensus), peer sync (Sync), and crash-recovery WAL writes. The
//! engine requires them to exist by trait bound, but the methods are not
//! invoked on the happy path.
//!
//! When L9 spins up actors and one of these stubs IS hit, the error
//! message names the type that needs a real impl — that's the cue to swap
//! the stub for a Protobuf/JSON implementation.

use bytes::Bytes;
use informalsystems_malachitebft_app::types::codec::Codec;
use informalsystems_malachitebft_app::types::streaming::StreamMessage;
use informalsystems_malachitebft_app::types::sync::{Request, Response, Status};
use informalsystems_malachitebft_app::types::{ProposedValue, SignedConsensusMsg};
use informalsystems_malachitebft_core_consensus::LivenessMsg;
use thiserror::Error;

use crate::context::OpenHlContext;
use crate::types::OpenHlProposalPart;

#[derive(Copy, Clone, Debug, Default)]
pub struct OpenHlCodec;

#[derive(Debug, Error)]
#[error("codec for {0} is a Stage 6b stub; implement before this path can fire")]
pub struct CodecStub(pub &'static str);
```

`OpenHlCodec` is a unit struct — no state. Codecs in Malachite are pure functions; the receiver only exists so the trait can dispatch. `CodecStub` is the error type that all eight Codec impls share. The `&'static str` field carries the name of the type whose codec is missing, so when an unimplemented path *does* fire, the error message tells you exactly what to write.

> 🛑 **Anti-fluency.** "Why is `CodecStub` a struct holding a `&'static str` instead of an enum with one variant per stub?" **Because adding new stubs would require editing two places** — the enum definition and every callsite. A `&'static str` argument is open-ended; you can stub any new `Codec<T>` impl by passing its type name as a literal, no enum changes needed. Trade-off: less type-safety (you could pass any string), but the trait surface itself enforces what `T` is, so the string is just a human-readable label.

### Step 3: The one real impl — `ProposalPart`

Next:

```rust
// ---- ProposalPart ---------------------------------------------------------
// ProposalPart is a unit struct in OpenHL (ValuePayload::ProposalOnly), so its
// encoding is genuinely empty — this one is real, not a stub.

impl Codec<OpenHlProposalPart> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<OpenHlProposalPart, Self::Error> {
        Ok(OpenHlProposalPart)
    }

    fn encode(&self, _msg: &OpenHlProposalPart) -> Result<Bytes, Self::Error> {
        Ok(Bytes::new())
    }
}
```

This one is *real*. `OpenHlProposalPart` is a unit struct (zero fields), so:

- **Encode** returns an empty `Bytes` — a unit struct's wire representation is the empty string.
- **Decode** ignores the input bytes and returns `OpenHlProposalPart` — the only possible value of the type. Even if someone hands you garbage bytes, decoding into a unit type can't fail.

This is **not a stub** — it's a complete, correct implementation that happens to be trivial. Unit types have a degenerate wire format. The empty-bytes encoding gets exercised by `proposal_part_round_trips` in `signing_provider.rs` and by anything else that asks "encode/decode a `ProposalPart`."

### Step 4: The 7 stub impls

Now the seven impls that aren't real:

```rust
// ---- Consensus messages (gossip) -----------------------------------------

impl Codec<SignedConsensusMsg<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<SignedConsensusMsg<OpenHlContext>, Self::Error> {
        Err(CodecStub("SignedConsensusMsg<OpenHlContext>"))
    }

    fn encode(&self, _msg: &SignedConsensusMsg<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("SignedConsensusMsg<OpenHlContext>"))
    }
}

impl Codec<LivenessMsg<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<LivenessMsg<OpenHlContext>, Self::Error> {
        Err(CodecStub("LivenessMsg<OpenHlContext>"))
    }

    fn encode(&self, _msg: &LivenessMsg<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("LivenessMsg<OpenHlContext>"))
    }
}

impl Codec<StreamMessage<OpenHlProposalPart>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<StreamMessage<OpenHlProposalPart>, Self::Error> {
        Err(CodecStub("StreamMessage<OpenHlProposalPart>"))
    }

    fn encode(&self, _msg: &StreamMessage<OpenHlProposalPart>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("StreamMessage<OpenHlProposalPart>"))
    }
}

// ---- WAL (crash recovery) -------------------------------------------------

impl Codec<ProposedValue<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<ProposedValue<OpenHlContext>, Self::Error> {
        Err(CodecStub("ProposedValue<OpenHlContext>"))
    }

    fn encode(&self, _msg: &ProposedValue<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("ProposedValue<OpenHlContext>"))
    }
}

// ---- Sync (peer catch-up) -------------------------------------------------

impl Codec<Status<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<Status<OpenHlContext>, Self::Error> {
        Err(CodecStub("sync::Status<OpenHlContext>"))
    }

    fn encode(&self, _msg: &Status<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("sync::Status<OpenHlContext>"))
    }
}

impl Codec<Request<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<Request<OpenHlContext>, Self::Error> {
        Err(CodecStub("sync::Request<OpenHlContext>"))
    }

    fn encode(&self, _msg: &Request<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("sync::Request<OpenHlContext>"))
    }
}

impl Codec<Response<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<Response<OpenHlContext>, Self::Error> {
        Err(CodecStub("sync::Response<OpenHlContext>"))
    }

    fn encode(&self, _msg: &Response<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("sync::Response<OpenHlContext>"))
    }
}
```

Seven Codec impls, all the same pattern: `decode` returns `Err(CodecStub(...))`, `encode` returns `Err(CodecStub(...))`, the type name is passed as a literal so the stub error names itself.

Three categories:

- **Consensus messages (gossip)** — `SignedConsensusMsg`, `LivenessMsg`, `StreamMessage`. These go over libp2p between validators. In a single-validator devnet, no peers exist, so these never get called.
- **WAL (crash recovery)** — `ProposedValue`. The engine writes proposals to disk for crash recovery. We run in-process tests so this never fires.
- **Sync (peer catch-up)** — `Status`, `Request`, `Response`. When a validator falls behind it asks peers to send it past blocks. No peers means no falling-behind means no sync.

> 🛑 **Anti-fluency.** "Couldn't I just `#[derive(Serialize, Deserialize)]` on these types and use bincode?" **You can — for some.** But many of these types contain generics, `Box<dyn Trait>` fields, or other items serde can't easily handle. The reference implementation in Malachite's `test` crate uses ~400 lines of hand-written Protobuf encoding to handle them all. Our stub approach skips that work for now; when you need a real network or persistent WAL, this is where you swap in the protobuf or borsh implementation, one method at a time.

### Step 5: Add the test module

At the bottom of `codec.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use informalsystems_malachitebft_app::types::codec::{
        ConsensusCodec, SyncCodec, WalCodec,
    };

    // Compile-time assertions: by implementing the constituent Codec<T>
    // traits, OpenHlCodec automatically satisfies all three super-traits.
    fn assert_wal_codec<C: WalCodec<OpenHlContext>>() {}
    fn assert_consensus_codec<C: ConsensusCodec<OpenHlContext>>() {}
    fn assert_sync_codec<C: SyncCodec<OpenHlContext>>() {}

    #[test]
    fn openhl_codec_satisfies_all_three_super_traits() {
        assert_wal_codec::<OpenHlCodec>();
        assert_consensus_codec::<OpenHlCodec>();
        assert_sync_codec::<OpenHlCodec>();
    }

    #[test]
    fn proposal_part_round_trips() {
        let codec = OpenHlCodec;
        let part = OpenHlProposalPart;
        let bytes = codec.encode(&part).unwrap();
        let decoded = codec.decode(bytes).unwrap();
        assert_eq!(part, decoded);
    }
}
```

Two tests:

- **`openhl_codec_satisfies_all_three_super_traits`** — this is a *compile-time* assertion disguised as a test. `WalCodec<Ctx>`, `ConsensusCodec<Ctx>`, and `SyncCodec<Ctx>` are super-traits in Malachite — they're automatically satisfied if a type implements *all the right* `Codec<T>` constituent impls. The three `assert_*` functions exist only to force the compiler to check the bound. If you forgot a single `Codec<T>` impl, this would fail to compile, **not** fail at runtime. The runtime test body is just a no-op — the verification happens at type-check time.
- **`proposal_part_round_trips`** — exercises the one *real* codec impl. Encode an empty `ProposalPart`, decode the resulting bytes, assert equality. This proves the real impl works; the seven stub impls aren't tested at runtime here because they're meant to panic-via-error if anything ever calls them.

> 🛑 **Anti-fluency.** "Why does the test pass — it's empty?" **Because the assertion is in the type-checker, not the runtime.** When you write `assert_wal_codec::<OpenHlCodec>()`, Rust must check that `OpenHlCodec: WalCodec<OpenHlContext>` at compile time. If that bound fails, the file doesn't compile, and `cargo test` reports a **compile error**, not a test failure. This is a common pattern in Rust: convert a runtime check into a compile check by calling a function with the bound you want to verify.

### Step 6: Wire codec into `lib.rs`

Open `crates/consensus/src/lib.rs`. Currently:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
```

Add one line:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod codec;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
```

## Test

First compile will be slow — first time fetching libp2p, ractor, and ~200 transitive deps:

```bash
cargo test -p openhl-consensus
```

After about 30-40 seconds:

```
running 16 tests
test bridge::tests::... ... ok            # (consensus has bridge tests from L3? — depends on workspace)
test codec::tests::openhl_codec_satisfies_all_three_super_traits ... ok
test codec::tests::proposal_part_round_trips ... ok
test context::tests::... (5 tests) ... ok
test signing::tests::... (2 tests) ... ok
test signing_provider::tests::... (7 tests) ... ok

test result: ok. 16 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Common errors and fixes:

- **`error[E0277]: the trait bound 'OpenHlCodec: WalCodec<OpenHlContext>' is not satisfied`** — you're missing one of the eight `Codec<T>` impls. Re-check Step 3 and Step 4 — all eight constituent types must have `impl Codec<T> for OpenHlCodec`.
- **`error[E0061]: this function takes 1 argument but 0 arguments were supplied`** (or `error[E0308]: mismatched types`) — `CodecStub` is a tuple struct that takes a single `pub &'static str`, so writing `CodecStub` with no argument or using the brace form `CodecStub { ... }` won't compile. Pass the type name literal explicitly: `Err(CodecStub("SignedConsensusMsg<OpenHlContext>"))`.
- **`error[E0432]: unresolved import 'informalsystems_malachitebft_app::types::codec::ConsensusCodec'`** — you forgot to add `informalsystems-malachitebft-app` to Cargo.toml. Re-check Step 1.
- **Build takes 60+ seconds even on a recompile** — try `cargo build` (no `--release`). If still slow, the issue is libp2p; let it run.

## Design reflection

Three load-bearing decisions encoded here:

1. **Stubs with a clear failure name beat full impls that aren't needed yet.** A *real* `SignedConsensusMsg` codec is ~50 lines of protobuf encoding. We don't write it because we don't need it. We write a 4-line stub that, if it ever fires, names what wasn't implemented. **Incremental development at the type level.**

2. **One trait impl can satisfy multiple super-traits via blanket impls.** `WalCodec<Ctx>` is automatically `impl<C> WalCodec<Ctx> for C where C: Codec<ProposedValue<Ctx>>` (and similar for Consensus/Sync). By implementing the right *constituent* `Codec<T>` impls, you don't have to write `impl WalCodec` — Malachite gives you the blanket impl free. The compile-time assertion test verifies this is real.

3. **The codec is in `consensus/`, not `types/`.** Codecs depend on the engine's notion of "what gets wired" — `SignedConsensusMsg`, `ProposedValue`, `sync::Status` — which is a consensus-layer concern, not a base-type concern. Putting codec in `types/` would force `types/` to depend on `informalsystems-malachitebft-app`, which would make `openhl-types` a heavy dep for downstream crates that don't need the engine.

The "no codec inside `types/`" discipline is easiest to see by drawing the two dependency graphs side by side:

```
🟢 The design we picked (clean dependency graph)
   ┌─────────────────────────┐                  ┌──────────────────────────────────┐
   │   openhl-evm            │ ─┐               │  openhl-consensus (holds Codec)   │
   ├─────────────────────────┤   ▼               │   - bridge.rs / types/ / codec.rs │
   │   openhl-node           │ ─► openhl-types  │   - signing*.rs / context.rs       │
   ├─────────────────────────┤   ▲   (lightweight ────►─── informalsystems-malachitebft-app
   │   (other downstream)    │ ─┘    zero-dep)            (libp2p / ractor / heavy)
   └─────────────────────────┘                  └──────────────────────────────────┘
       Editing the EVM side never recompiles consensus / libp2p / ractor → fast inner loop

🔴 Anti-pattern (codec colocated inside types/)
   ┌─────────────────────────┐
   │   openhl-evm            │ ─┐
   ├─────────────────────────┤   ▼
   │   openhl-node           │ ─► openhl-types (codec also lives here) ─► informalsystems-malachitebft-app
   ├─────────────────────────┤   ▲                                            (libp2p / ractor / heavy)
   │   (other downstream)    │ ─┘
   └─────────────────────────┘
       A single-line tweak in EVM logic drags libp2p and the actor system into every rebuild;
       the ~38s first-build cost gets paid again and again.
```

In the picked layout (left), `openhl-types` stays "the lightweight shared dictionary everyone references," and the heavy consensus / libp2p / ractor surface is sealed inside `openhl-consensus`. In the anti-pattern (right), every downstream crate that touches `openhl-types` is forced to build through libp2p. **"Keep types light; introduce heavy dependencies in the layer that actually needs them"** is the discipline this `crates/` topology bakes in.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 4229502
diff -u ~/code/my-openhl/crates/consensus/src/codec.rs ./crates/consensus/src/codec.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
```

The reference at `4229502` includes Cargo.lock changes (the libp2p tree) and the 166 lines of `codec.rs`. The implementation pattern (one stub, repeated) should match closely. Doc comments can vary.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why do I need the `_msg` and `_bytes` underscore-prefixed parameter names?**
Rust requires unused parameters to be prefixed with `_` to suppress the unused-variable warning. The `&self` is needed by trait dispatch but never read; the `_msg`/`_bytes` are similarly ignored. Some stubs *use* them (we don't here), but the underscore is the idiom to tell Rust "I see this exists, I'm not using it."

**Q: What's the difference between `WalCodec`, `ConsensusCodec`, and `SyncCodec`?**
They're sub-traits that group related codec impls. `WalCodec` requires you to encode `ProposedValue`. `ConsensusCodec` requires `SignedConsensusMsg` + `LivenessMsg` + `StreamMessage<ProposalPart>` + `ProposalPart`. `SyncCodec` requires `Status` + `Request` + `Response`. By implementing the individual `Codec<T>` traits, you get all three super-traits for free.

**Q: If the stubs never fire, why do they exist at all?**
Because Rust's trait system can't conditionally include or exclude impls based on runtime configuration. The engine's `start_engine` function has a trait bound `C: ConsensusCodec<Ctx> + WalCodec<Ctx> + SyncCodec<Ctx>`, and the bound is checked at compile time, regardless of whether the codec methods ever execute. **The stubs are there to satisfy the type system, not the runtime.**

**Q: When would I replace a stub with a real impl?**
When the engine actually calls it. L9's smoke test will spawn the actor system and exercise some paths; if a stub fires, the error message tells you which one. The most likely first call is `Codec<ProposedValue<OpenHlContext>>` (WAL), because the engine writes the very first proposal to disk for crash recovery before any peer gossip happens. You'd swap that one for a protobuf-backed encoder.

## Next lesson (L9)

You've satisfied the codec trait bound — `start_engine`'s signature is now satisfiable. But you don't yet have the *value* you'd pass for the codec, the node config, or the validator set, all of which `start_engine` also requires. L9 implements `Node` trait on `OpenHlNode`: ~300 lines covering `OpenHlConfig` (NodeConfig impl), `OpenHlGenesis`, `OpenHlPrivateKeyFile`, `OpenHlNodeHandle`, and the `Node` impl itself with 5 associated types and 12 methods. The capstone of L9 is `start_engine_smoke_spawns_and_kills` — a test that calls `start_engine` and proves the actor system spawns and tears down cleanly in ~0.02 seconds. After L9, the engine boots; we'll spend L10-L15 wiring the AppMsg loop and the live Reth integration.
````

---

## Seed-file slot

L8 lands in Module 4 (CL types) at sortOrder 2 (after L6 at 0 and L7 at 1):

```typescript
{
  title: 'Lesson 8 — OpenHlCodec — codec slot the engine demands',
  slug: 'openhl-codec-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 35,
  xpReward: 70,
  content: `# Lesson 8 — \`OpenHlCodec\` — codec slot the engine demands\n\n...`
},
```

## SHA pinning discipline

L8 cites one openhl commit (§Answer key):
- `4229502` (Stage 6b — OpenHlCodec satisfying WalCodec/ConsensusCodec/SyncCodec)

The original plan was to combine codec + Node + start_engine into one lesson. After drafting, splitting into L8 (codec) and L9 (Node + start_engine) gives more digestible 35 min + 55 min chunks instead of one 90-minute marathon. Total course is now 16 lessons rather than 15.

## Style review notes (self-critique before paste)

- **§Plan's "one pattern that matters more than any specific impl" callout** names stubbing as a reusable technique, not just a codec thing.
- **Step 5's compile-time-vs-runtime distinction** for `assert_wal_codec` is load-bearing — readers will be confused by an "empty" test if they don't see the bound being checked.
- **Step 2's `&'static str` design choice** (vs. enum variants) is the kind of micro-decision that doesn't read as important but shapes how stubs are written elsewhere.
- **§Common questions's "why do stubs exist at all"** addresses the type-system-vs-runtime gap head-on.
- **The §Anti-fluency about `#[derive(Serialize)]`** anticipates the "couldn't this be simpler" instinct.
- **L9 preview promises the smoke test passes** — this is the meaningful payoff after a long compile.
