# Building OpenHL Precompiles — L1 draft (EN) — build-along

> Drafted against openhl SHA `1761d4d` (Stage 9a — custom EVM with CLOB precompile boots via NodeBuilder).
> Course: `building-openhl-precompiles-en` (track: `reth-l1-architect`).

---

## L1 — `openhl-precompiles-evm-scaffold-en`

- **Module:** 1 (Custom EVM bootstrap), sortOrder 0 within module
- **Course-level sortOrder:** 0 (lesson 1 of 12)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# Lesson 1 — `OpenHlEvmFactory` — hooking into every EVM creation

## Goal

Concepts you'll grasp in this lesson:

- **`EvmFactory` + `ExecutorBuilder` as Reth's "swap one slot" seam** — every EVM that Reth constructs (payload build, block validation, eth_call RPC, debug RPC) goes through one factory, so registering custom precompiles once propagates everywhere.
- **`alloy-evm` (abstract traits) vs `reth-evm` (concrete wiring)** — why both deps are required: the trait layer expresses what an EVM *is*, the executor layer expresses how Reth *runs* it.
- **Per-spec `OnceLock` caching of `Precompiles`** — building a precompile set is expensive (hashing addresses), `create_evm` is hot, so each hardfork tier's set is constructed once and shared as `&'static`.
- **Stub-with-stable-signature as an incremental-construction tactic** — the passthrough `openhl_precompiles(base) -> Precompiles` lets the factory wire up *now* while L2 fills the body later, with no call-site rewrites.

Verification:

```bash
cargo check -p openhl-evm
```

…compiles cleanly.

Specific changes:

You'll have **two new modules** in `crates/evm/src/`:

- **`openhl_evm.rs`** — `OpenHlEvmFactory` (Reth's `EvmFactory` slot) + `OpenHlExecutorBuilder` (Reth's `ExecutorBuilder` slot) + per-hardfork precompile dispatch via `OnceLock`. About 80 LOC.
- **`precompiles/mod.rs`** — a **stub** `openhl_precompiles(base) -> Precompiles` that passes through unchanged. L2 fills in the actual read precompile.

You also add **5 new dependencies** (1 workspace-level, 4 crate-level — including 1 new git-pinned dep for `reth-node-api`).

After L1, the custom EVM **structure** exists end-to-end. Reth can construct EVM instances via our factory; the factory's job (register custom precompiles) just doesn't do anything yet because L2 is what defines those precompiles.

## Recap

After course 7, `crates/evm/src/` has:

```
crates/evm/src/
├── bridges/                    L4-L5: InMemoryEvmBridge, RethEvmBridge
├── reth_node.rs                L11 (c6): bootstrap proof (test-only)
└── live_node.rs                L12-L14 (c6) + L9-L11 (c7): LiveRethEvmBridge<P>
```

`cargo test -p openhl-evm clob_fills_flow_into_payload --release` passes. The bridge owns a CLOB and routes fills through `build_payload`. **But smart contracts running inside the bridge's Reth node can't see the CLOB** — that's the gap L1 starts closing.

## Plan

Seven things:

1. **Add `alloy-evm = "0.34"`** to the workspace `Cargo.toml`. This is the public `alloy-evm` crate (not git-pinned to Reth) that provides `EvmFactory`, `Database`, `EvmEnv`, etc.
2. **Add 4 deps** to `crates/evm/Cargo.toml`: `reth-evm`, `reth-evm-ethereum`, `reth-node-api` (new git dep — same SHA as the rest), and promote `reth-node-builder` from `[dev-dependencies]` to `[dependencies]`.
3. **Create `crates/evm/src/openhl_evm.rs`** with `OpenHlEvmFactory` + `OpenHlExecutorBuilder` + `precompiles_for(spec)`.
4. **Create `crates/evm/src/precompiles/mod.rs`** as a passthrough stub.
5. **Wire `pub mod openhl_evm; mod precompiles;`** into `crates/evm/src/lib.rs`.
6. **Re-export `OpenHlEvmFactory` and `OpenHlExecutorBuilder`** at crate root for L3's NodeBuilder integration.
7. **`cargo check -p openhl-evm`** — clean.

This is the **dependency-heaviest** lesson in course 8. Once the scaffold compiles, L2 adds the actual precompile content; L3 wires it into NodeBuilder and tests that the precompile is reachable from EVM execution.

> 🛑 **Predict.** Before scrolling: Reth's `EvmFactory` is a trait — why does Reth need a factory at all instead of just constructing one EVM instance and reusing it? Hint: think about what code paths inside a chain need to *execute* EVM transactions. Block validation (validate_payload), payload assembly (build_payload), eth_call RPC, debug RPC — every one of these creates a fresh EVM instance with its own database snapshot. **The factory exists because Reth makes many EVMs**, not one.

## Walk-through

### Step 1: Add `alloy-evm` to the workspace

Open the root `Cargo.toml`. The alloy block (after L11 in course 6 / L12 in course 7) ends with:

```toml
alloy-rpc-types-engine    = { version = "2.0", default-features = false }
alloy-genesis             = { version = "2.0", default-features = false }
```

Add **one line**:

```toml
alloy-evm                 = { version = "0.34", default-features = false }
```

`alloy-evm` is the public alloy crate that provides REVM's abstractions at the trait level (`EvmFactory`, `Database`, `EvmEnv`). It's a stable crates.io dependency, not git-pinned to Reth — same status as `alloy-genesis` and `alloy-rpc-types-engine`.

> 🛑 **やりがちな勘違い.** "`alloy-evm` and `reth-evm` are the same thing — pick one." **No, they're different layers.** `alloy-evm` provides the *abstract* traits (`EvmFactory`, `Database`, etc.) that any EVM implementation can satisfy. `reth-evm` is Reth's *concrete* implementation that wires those traits to its block-executor pipeline. We import both: the abstract for our factory definition, the concrete for the executor wiring.

### Step 2: Update `crates/evm/Cargo.toml`

Open `crates/evm/Cargo.toml`. After course 7's L9 + L12 (course 6), the `[dependencies]` section has 12 entries. We add 4 more (3 new + 1 promotion):

```toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
openhl-clob              = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
alloy-rpc-types-engine   = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }
reth-consensus           = { workspace = true }
reth-ethereum-consensus  = { workspace = true }
reth-primitives-traits   = { workspace = true }
reth-chainspec           = { workspace = true }
reth-engine-primitives          = { workspace = true }
reth-ethereum-engine-primitives = { workspace = true }
reth-evm                 = { workspace = true }                                                                                          # NEW
reth-evm-ethereum        = { workspace = true }                                                                                          # NEW
reth-node-api            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }              # NEW (1-off git dep)
reth-node-builder        = { workspace = true }                                                                                          # NEW (was dev-dep)
alloy-evm                = { workspace = true }                                                                                          # NEW
```

`reth-node-builder` moves from `[dev-dependencies]` to `[dependencies]` — production code (`OpenHlExecutorBuilder`) now uses it. Remove the line in `[dev-dependencies]`:

```toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
tempfile             = "3"
# reth-node-builder removed from here — now a production dep
```

**`reth-node-api` is a one-off direct git dep** (not via workspace). The workspace `Cargo.toml` doesn't declare it; we inline the git+rev directly. This is intentional: `reth-node-api` is used in exactly one crate (`openhl-evm`), and the rest of the workspace doesn't need it. Promoting it to a workspace dep would force every crate's build graph to know about it.

> 🛑 **やりがちな勘違い.** "Every Reth dep should be a workspace dep — that's the pattern." **Not necessarily.** Workspace deps are useful when multiple crates need the same dep at the same version. When only one crate needs it, inline declaration is cleaner — fewer entries in the workspace-level Cargo.toml, less indirection for readers. `reth-node-api` is openhl-evm-only; treat it accordingly.

### Step 3: Create `crates/evm/src/precompiles/mod.rs` (stub)

Before writing `openhl_evm.rs`, we need the precompile module to exist (because `openhl_evm.rs` imports from it). Create the directory + file:

```bash
mkdir -p crates/evm/src/precompiles
touch crates/evm/src/precompiles/mod.rs
```

Open `crates/evm/src/precompiles/mod.rs` and write:

```rust
//! Custom REVM precompiles that expose CLOB state to EVM execution.
//!
//! Stage 9a — scout commit. L2 adds the first real precompile
//! (`clob_read_best_bid` at 0x...0c1b) that returns a hardcoded best-bid
//! response so smart contracts can prove the precompile is reachable.
//! L4+ wires it to live CLOB state.

use alloy_evm::revm::precompile::Precompiles;

/// Wraps Reth's spec-default precompile set, adding openhl's CLOB precompiles.
///
/// L1 (this lesson): passthrough — clones the base unchanged.
/// L2: registers `clob_read_best_bid`.
/// L7+: registers `clob_place_order`.
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    // L2 will replace this with `let mut precompiles = base.clone();
    // precompiles.extend([...]); precompiles`.
    base.clone()
}
```

3 lines of body. The function takes a `Precompiles` set (Reth's default for the current hardfork) and returns it unchanged. **L2 inserts the actual `clob_read_best_bid` between `base` and the `return`.**

The function signature is the **stable contract** the EVM factory depends on. L2-L11 will change the *contents* of this function, but `openhl_precompiles(base: Precompiles) -> Precompiles` stays the same shape throughout.

> 🛑 **やりがちな勘違い.** "An empty function is wasted code — combine L1 + L2." **The passthrough is what proves the structure compiles** before we add the precompile logic. If we wrote L1 + L2 as one lesson and the precompile registration was broken, the reader wouldn't know whether the factory wiring or the precompile registration was at fault. Splitting the lesson makes the failure modes addressable separately.

### Step 4: Create `crates/evm/src/openhl_evm.rs`

The main file. Top of the file:

```rust
//! `OpenHlEvmFactory` + `OpenHlExecutorBuilder` — Reth's `ConfigureEvm` slot,
//! filled with our custom-precompile EVM.
//!
//! Stage 9a (scout commit) — modelled on Reth's `examples/custom-evm/src/main.rs`
//! pattern. The factory's `create_evm` installs `openhl_precompiles(...)` so
//! any EVM execution path (RPC call, payload assembly, validation) sees the
//! CLOB precompile registered at `CLOB_READ_BEST_BID`.

use alloy_evm::{
    eth::EthEvmContext,
    precompiles::PrecompilesMap,
    revm::{
        context::{BlockEnv, Context, TxEnv},
        context_interface::result::{EVMError, HaltReason},
        handler::EthPrecompiles,
        inspector::{Inspector, NoOpInspector},
        interpreter::interpreter::EthInterpreter,
        precompile::Precompiles,
        primitives::hardfork::SpecId,
        MainBuilder, MainContext,
    },
    Database, EvmEnv, EvmFactory,
};
use reth_chainspec::ChainSpec;
use reth_ethereum_primitives::EthPrimitives;
use reth_evm_ethereum::{EthEvm, EthEvmConfig};
use reth_node_api::{FullNodeTypes, NodeTypes};
use reth_node_builder::{components::ExecutorBuilder, BuilderContext};
use std::sync::OnceLock;

use crate::precompiles::openhl_precompiles;
```

20-ish imports. Most are REVM internals via `alloy-evm`'s re-exports. Worth scanning, not memorizing:

- **`EvmFactory`** — the trait we'll implement. Reth calls our factory's `create_evm` whenever it needs an EVM instance.
- **`ExecutorBuilder`** — the trait we'll implement for `OpenHlExecutorBuilder`. Reth's `NodeBuilder` uses it to construct an EVM config.
- **`Precompiles`** — REVM's collection of precompiled contracts. We add to this.
- **`OnceLock`** — std's once-init primitive. We cache the per-spec precompile sets.

Now the factory struct:

```rust
/// EVM factory that registers openhl's custom precompiles on every EVM
/// instance Reth constructs (for payload assembly, block validation, RPC
/// state queries, etc.).
#[derive(Debug, Clone, Default)]
#[non_exhaustive]
pub struct OpenHlEvmFactory;

impl EvmFactory for OpenHlEvmFactory {
    type Evm<DB: Database, I: Inspector<EthEvmContext<DB>, EthInterpreter>> =
        EthEvm<DB, I, Self::Precompiles>;
    type Tx = TxEnv;
    type Error<DBError: core::error::Error + Send + Sync + 'static> = EVMError<DBError>;
    type HaltReason = HaltReason;
    type Context<DB: Database> = EthEvmContext<DB>;
    type Spec = SpecId;
    type BlockEnv = BlockEnv;
    type Precompiles = PrecompilesMap;

    fn create_evm<DB: Database>(&self, db: DB, input: EvmEnv) -> Self::Evm<DB, NoOpInspector> {
        let spec = input.cfg_env.spec;
        let evm = Context::mainnet()
            .with_db(db)
            .with_cfg(input.cfg_env)
            .with_block(input.block_env)
            .build_mainnet_with_inspector(NoOpInspector {})
            .with_precompiles(PrecompilesMap::from_static(precompiles_for(spec)));
        EthEvm::new(evm, false)
    }

    fn create_evm_with_inspector<DB: Database, I: Inspector<Self::Context<DB>, EthInterpreter>>(
        &self,
        db: DB,
        input: EvmEnv,
        inspector: I,
    ) -> Self::Evm<DB, I> {
        EthEvm::new(
            self.create_evm(db, input).into_inner().with_inspector(inspector),
            true,
        )
    }
}
```

The 8 associated types are scaffolding — every `EvmFactory` impl needs them, and most are the same as Reth's defaults. **The interesting part is `create_evm`.** Five steps:

1. **`Context::mainnet()`** — REVM's "Ethereum mainnet" preset (gas constants, etc.).
2. **`.with_db(db)` + `.with_cfg(input.cfg_env)` + `.with_block(input.block_env)`** — install the database, config, and block env passed in.
3. **`.build_mainnet_with_inspector(NoOpInspector {})`** — construct the EVM with a no-op inspector (no tracing).
4. **`.with_precompiles(PrecompilesMap::from_static(precompiles_for(spec)))`** — **install our precompiles**. `precompiles_for(spec)` returns the right precompile set for the current Ethereum hardfork.
5. **`EthEvm::new(evm, false)`** — wrap in Reth's EthEvm type.

`create_evm_with_inspector` is the same path with a custom inspector instead of the no-op. Most callers use `create_evm`; the inspector variant is for debug RPC.

> 🛑 **やりがちな勘違い.** "Why does the factory take `db: DB` as a generic? Wouldn't a concrete `RevmDatabase` be simpler?" **Because Reth uses many different database snapshot types depending on context.** Block validation uses the live MDBX state; eth_call RPC uses a historical snapshot; debug RPC may use an in-memory overlay. The factory must work with any of them. Generic over `DB: Database` is the way to express that without committing to a concrete type.

### Step 5: Add the `precompiles_for(spec)` helper

Below the factory impl:

```rust
/// Lazily-initialised per-spec precompile sets. `OnceLock` ensures we build
/// each set once and share the static reference across every `create_evm` call,
/// matching the pattern in Reth's custom-evm example. Shanghai/Paris/London
/// don't add new precompiles, so they fall through to the Berlin set.
fn precompiles_for(spec: SpecId) -> &'static Precompiles {
    static PRAGUE: OnceLock<Precompiles> = OnceLock::new();
    static CANCUN: OnceLock<Precompiles> = OnceLock::new();
    static FALLBACK: OnceLock<Precompiles> = OnceLock::new();

    match spec {
        SpecId::PRAGUE | SpecId::OSAKA => {
            PRAGUE.get_or_init(|| openhl_precompiles(Precompiles::prague()))
        }
        SpecId::CANCUN => CANCUN.get_or_init(|| openhl_precompiles(Precompiles::cancun())),
        // For older hardforks (Berlin/London/Paris/Shanghai), use the Berlin
        // set as the most-recent-additions-cutoff base plus ours.
        _ => FALLBACK.get_or_init(|| {
            let base = EthPrecompiles::new(spec).precompiles;
            openhl_precompiles(base)
        }),
    }
}
```

Each Ethereum hardfork has a different set of standard precompiles (ECDSA recovery, SHA-256, ModExp, EC-pairing, etc.). Cancun adds the point evaluation precompile for blobs. Prague will add yet more. **Our wrapper `openhl_precompiles` injects our custom precompile(s) into whichever base set is active.**

Three `OnceLock`s, one per hardfork tier:

- **`PRAGUE`** — covers Prague + Osaka (Osaka inherits Prague's precompiles for now).
- **`CANCUN`** — covers Cancun.
- **`FALLBACK`** — Berlin/London/Paris/Shanghai, using `EthPrecompiles::new(spec)` to get whatever set Reth thinks is right for that spec.

**Why `OnceLock` instead of computing per call?** Because `Precompiles` is a HashMap-backed structure that's expensive to construct (hashing every precompile address). Computing it once per spec + caching is one of the optimizations Reth's custom-evm example demonstrates. Caching matters because `create_evm` is called *very* frequently — every RPC eth_call, every block validation, every block build.

### Step 6: Add the `OpenHlExecutorBuilder`

At the bottom of `openhl_evm.rs`:

```rust
/// Executor builder that swaps in `OpenHlEvmFactory` while keeping all other
/// Reth `EthereumNode` components at default.
#[derive(Debug, Default, Clone, Copy)]
#[non_exhaustive]
pub struct OpenHlExecutorBuilder;

impl<Node> ExecutorBuilder<Node> for OpenHlExecutorBuilder
where
    Node: FullNodeTypes<Types: NodeTypes<ChainSpec = ChainSpec, Primitives = EthPrimitives>>,
{
    type EVM = EthEvmConfig<ChainSpec, OpenHlEvmFactory>;

    async fn build_evm(self, ctx: &BuilderContext<Node>) -> eyre::Result<Self::EVM> {
        Ok(EthEvmConfig::new_with_evm_factory(
            ctx.chain_spec(),
            OpenHlEvmFactory,
        ))
    }
}
```

10 lines. The `ExecutorBuilder` trait is Reth's hook for swapping the EVM config used by `EthereumNode`. The associated type `EVM = EthEvmConfig<ChainSpec, OpenHlEvmFactory>` says "use Reth's standard EthEvmConfig, but parameterize over our factory." `build_evm` constructs that config.

The trait bound `Node: FullNodeTypes<Types: NodeTypes<ChainSpec = ChainSpec, Primitives = EthPrimitives>>` constrains what kind of node this builder works with — Ethereum mainnet primitives, our `ChainSpec`. Anything more exotic (Optimism, OP Stack) wouldn't satisfy these bounds; that's by design.

**`#[non_exhaustive]` on both structs** lets us add fields later without a breaking API change. They're unit structs now; if openhl ever needs them to carry configuration, the attribute means consumers can't construct them via `OpenHlExecutorBuilder {}` literal.

### Step 7: Wire into `crates/evm/src/lib.rs`

Open `crates/evm/src/lib.rs`. Currently it has the bridges + reth_node + live_node modules from previous courses. Add two lines:

```rust
//! ... existing module doc ...

pub mod bridges;     // existing
pub mod live_node;   // existing (course 6+)
pub mod openhl_evm;  // NEW
mod precompiles;     // NEW (internal)

#[cfg(test)]
mod reth_node;       // existing (test-only smoke)

pub use openhl_evm::{OpenHlEvmFactory, OpenHlExecutorBuilder};  // NEW
// ... existing re-exports ...
```

Two changes:
- **`pub mod openhl_evm`** — visible to consumers.
- **`mod precompiles`** — internal, not exposed externally. Smart contracts call precompiles by *address*; consumers of `openhl-evm` don't need to import `openhl_precompiles` directly.

The re-export at the bottom (`pub use openhl_evm::{OpenHlEvmFactory, OpenHlExecutorBuilder}`) makes the two types accessible as `openhl_evm::OpenHlEvmFactory` from consumer code. L3's NodeBuilder integration will use them.

## Test

```bash
cargo check -p openhl-evm
```

First run is slow — `alloy-evm` + the new Reth crates pull in non-trivial code. Expect ~30-60 seconds. Subsequent runs use the cache.

Expected:

```
   Compiling openhl-evm v0.1.0 (.../crates/evm)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 32.45s
```

No warnings (the import list is long but every item is used). No errors.

You can also run the existing test suite to confirm nothing else broke:

```bash
cargo test -p openhl-evm --release
```

39 tests still pass. The new modules don't have tests yet — L3 adds the first one.

Common errors and fixes:

- **`error[E0432]: unresolved import 'reth_node_api'`** — the inline git dep wasn't added. Re-check Step 2.
- **`error[E0277]: 'EvmFactory' is not implemented for 'OpenHlEvmFactory'` (some associated type)** — typo in one of the 8 associated types. Compare against the reference at SHA `1761d4d`. Most common: `type Spec = SpecId` vs `type Spec = u64` or similar.
- **`error[E0282]: type annotations needed for 'PrecompilesMap'`** — `PrecompilesMap::from_static` returns a generic; the call site needs to know the type. In our case, the `with_precompiles(...)` call provides the inference. If the compiler complains, double-check the imports.
- **`unused import: 'openhl_precompiles'`** — the function is referenced in `precompiles_for`'s closures. If you see this warning, you may have written `Precompiles::prague()` directly instead of `openhl_precompiles(Precompiles::prague())`. Wrap each base set in `openhl_precompiles(...)`.

## Design reflection

Three load-bearing decisions encoded here:

1. **The factory pattern matches Reth's "many EVM instances" reality.** Reth doesn't construct one EVM and reuse it — it creates a fresh EVM for every RPC call, every block validation, every payload build. The `EvmFactory` trait is how we hook into "every EVM creation" in one place. **One factory, many EVMs, consistent precompile registration everywhere.**

2. **`OnceLock` per spec is the right caching shape.** Building a `Precompiles` set is non-trivial (hashing addresses, inserting fns). Doing it per `create_evm` call would burn cycles. Per-spec caching means each hardfork tier (Prague, Cancun, fallback) is constructed once. The `OnceLock` ensures thread-safe lazy init.

3. **The passthrough `openhl_precompiles` stub keeps L1 isolated.** The function exists with the right signature; it does nothing yet. L2 fills the body. **A stub with the right signature is a contract**: callers (the factory) can be wired now, and the implementation can land later without changing the call site. This is incremental construction with no rewrites required.

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/openhl_evm.rs ./crates/evm/src/openhl_evm.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
```

The reference at `1761d4d` has the **full** `precompiles/mod.rs` (Stage 9a's read precompile). Your stubbed version differs:

```bash
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
# Expected: your stub is much shorter than the reference; you'll see the
# difference as a big addition in the reference. L2 adds the missing content.
```

`openhl_evm.rs` should match closely (the factory structure is identical; only doc-comment wording may differ).

Return:

```bash
git checkout main
```

## Common questions

**Q: Why is the precompile module `mod precompiles` (private) but `pub mod openhl_evm`?**
Because `OpenHlEvmFactory` is a public API consumers need (L3's NodeBuilder integration uses it), but `openhl_precompiles` is implementation detail consumed only by `openhl_evm.rs` internally. Keeping the precompile module private prevents API leakage; callers shouldn't construct or modify the precompile set themselves.

**Q: What's the difference between `Precompiles::from_static` and `Precompiles::default`?**
`from_static` takes a `&'static Precompiles` reference — meaning the precompile set is one we've cached and reuse. `default` builds a new (empty) `Precompiles` instance. Our `create_evm` uses `from_static` because the `OnceLock`-cached set is `'static`. Caching + static reference = no allocation per EVM creation.

**Q: Why is `PRAGUE` covering `OSAKA` too?**
Osaka (the proposed next hardfork after Prague) doesn't introduce new standard precompiles as of the reference SHA. When Osaka eventually adds a new precompile, this match arm splits into separate `OSAKA` and `PRAGUE` branches. Until then, sharing the same `OnceLock` is correct.

**Q: Does `OpenHlExecutorBuilder` need to be `Clone`?**
The trait doesn't require `Clone`, but `#[derive(Clone, Copy)]` is cheap (it's a unit struct, zero-sized) and matches Reth's pattern. If you later add fields to the struct, you'd want to keep `Clone` for ergonomic API.

## Next lesson (L2)

The factory is wired but the precompile module is a passthrough — Reth's standard precompiles are installed, no extra ones. L2 adds the first **real** precompile: `clob_read_best_bid` at address `0x...0c1b`. It returns hardcoded values for now (the same approach as openhl Stage 9a). L4-L5 will wire it to live CLOB state; this lesson just gets the function defined, registered, and reachable via the registry.
````

---

## Seed-file slot

L1 lands in Module 1 (Custom EVM bootstrap) at sortOrder 0:

```typescript
{
  title: 'Lesson 1 — OpenHlEvmFactory — hooking into every EVM creation',
  slug: 'openhl-precompiles-evm-scaffold-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 80,
  content: `# Lesson 1 — \`OpenHlEvmFactory\` — hooking into every EVM creation\n\n...`
},
```

## SHA pinning discipline

L1 cites `1761d4d` (Stage 9a). The reader's code after L1 matches structurally but `precompiles/mod.rs` is a passthrough stub; L2 fills it in.

## Style review notes (self-critique before paste)

- **§Plan's "7 things" enumeration** lays out the dep-heavy work in advance. The reader knows the lesson is mechanical-but-many-touchpoints.
- **§Predict on "why does Reth need a factory?"** earns the EvmFactory framing.
- **3 anti-fluency callouts**: (a) alloy-evm vs reth-evm distinction, (b) workspace-deps-are-not-the-only-pattern, (c) passthrough stub is intentional.
- **Step 5's "Why `OnceLock`?"** explains the perf rationale without making the reader work for it.
- **Step 6's `#[non_exhaustive]` note** is the kind of detail that's invisible but matters for API evolution.
- **§Common questions on `from_static` vs `default`** clarifies a REVM API detail that's not obvious from skimming.
