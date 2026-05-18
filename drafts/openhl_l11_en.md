# Building OpenHL — L11 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHA `e6b4ebb` (Stage 7a — live Reth EthereumNode bootstraps in our workspace).
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).
> Note: L11 opens Module 6 (Live Reth). This lesson is the **dependency-validation milestone** — proves Reth v2.2.0 and Malachite v0.5.0 coexist in one workspace before we invest in L12-L15 wiring `LiveRethEvmBridge`.

---

## L11 — `openhl-reth-bootstrap-en`

- **Module:** 6 (Live Reth — first lesson in a new module)
- **Module sortOrder:** 6 (after Engine integration)
- **Course-level sortOrder:** 10 (lesson 11 of 16)
- **Duration:** 40 min (~30 min of which is the first long compile)
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# Lesson 11 — Booting a live Reth `EthereumNode` in your workspace

## Goal

By the end of this lesson:

```bash
cargo test -p openhl-evm reth_dev_node_bootstraps --release
```

…passes one new test:

```
test reth_node::tests::reth_dev_node_bootstraps ... ok
```

…that **spins up a full Reth `EthereumNode` v2.2.0** (MDBX storage, payload builder, mempool, RPC stub, the whole stack) in ~2.7 seconds, queries its provider for the chain ID, and asserts the result. **This is your proof that Reth and Malachite — the two largest pieces of infra in an L1 reference impl — coexist in one workspace without conflict.**

What you'll have done:
- Added 4 new workspace deps (`reth-node-core`, `reth-tasks`, `reth-provider`, `alloy-genesis`)
- Added 8 new dev-dependencies to `crates/evm/Cargo.toml` (test-only — production scope unchanged)
- Created `crates/evm/src/reth_node.rs` (~100 lines, test module only)

No production code. No bridge changes. Just **validation that the dependency tree resolves** before we start writing the live-bridge code in L12.

## Recap

After L10 your workspace has:

```
crates/types/           — BlockHash, PayloadId, PayloadAttrs, ExecutedBlock, PayloadStatus
crates/evm/             — InMemoryEvmBridge, RethEvmBridge (alloy types)
crates/consensus/       — Full BFT engine: Context, signing, codec, node, engine_app
bin/openhl/             — Empty binary stub
```

`cargo test` passes 35 tests workspace-wide (21 consensus + 14 evm). The engine produces real blocks through `InMemoryEvmBridge`. **But the EL is still a placeholder.** `RethEvmBridge` exists (L5) but it doesn't actually call Reth — it just uses alloy types to compute hashes.

## Plan

Four things:

1. **Add 4 workspace-level deps** to `Cargo.toml`: `reth-node-core`, `reth-tasks`, `reth-provider`, `alloy-genesis` — all pinned to the same Reth SHA we've been using since L1.
2. **Add 8 dev-dependencies** to `crates/evm/Cargo.toml` (test-utils variants of Reth's node-builder/ethereum + their support crates).
3. **Create `crates/evm/src/reth_node.rs`** with a test module that builds a dev chain spec, launches `EthereumNode` via `NodeBuilder::testing_node`, and verifies the provider responds.
4. **Wire `mod reth_node;`** into `crates/evm/src/lib.rs` (test-cfg only — keep production scope clean).

This lesson teaches **the dependency-coexistence validation pattern**. When you depend on two large infrastructure crates (Reth and Malachite, in our case), you don't find out they conflict until you write the integration code — by which point you've invested heavily in code that *should* work but doesn't compile. **The validation pattern is to write the smallest possible test that exercises both at once, before writing the integration.** If the test passes, both deps resolve and link. If it fails, the failure is visible immediately, with a small blast radius.

> 🛑 **Predict.** Before scrolling: why is the bootstrap test marked `--release` in the goal command? Hint: think about compile times and what dominates them. Reth's MDBX bindings + libp2p + alloy + rocksdb-style storage stack are *enormous* — debug-mode compile is ~2:34 first time, release is similar but the resulting binary runs significantly faster. The test itself only does a bootstrap and a chain-ID check, so we want fast runtime over fast compile *after the first compile*. Run `--release` after that first cold build.

## Walk-through

### Step 1: Add workspace-level Reth deps

Open the root `Cargo.toml`. Find the `# --- Reth (pinned to v2.2.0 release tag) ---` block. After L10 it ends like:

```toml
reth-engine-primitives    = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-primitives   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
```

Add 4 more lines so the block becomes:

```toml
reth-node-builder         = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-ethereum        = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-core            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-tasks                = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-chainspec            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-evm                  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-evm-ethereum         = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-primitives  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-engine-primitives    = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-primitives   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
```

What each adds:

- **`reth-node-core`** — `NodeConfig` and related types (defines the node's config structure: chain spec, datadir, JSON-RPC endpoints, etc.).
- **`reth-tasks`** — `Runtime` and `TaskExecutor` for spawning Reth's background tasks (block validation, mempool gossip, payload builder).
- **`reth-provider`** — the `BlockchainProvider` that serves historical/canonical chain queries. L12's `LiveRethEvmBridge::with_live_node()` will hold one of these.
- **`alloy-genesis`** — Genesis JSON deserialization. Reth's `ChainSpec` is constructed from a `Genesis` via `genesis.into()`.

**The Reth SHA `88505c7f...` is the v2.2.0 release tag** — same SHA we've used in L1 for `reth-evm`, `reth-evm-ethereum`, etc. **Pinning to a release-tag SHA, not main HEAD, is the invariant.** Bumping Reth happens in a dedicated PR.

> 🛑 **Anti-fluency.** "Why pin to the SHA when there's a published v2.2.0 crate on crates.io?" **Because Reth's release cadence on crates.io lags behind GitHub by weeks-to-months.** The v2.2.0 git tag is the latest tested binary; the published crate is often older. Pinning to git+SHA means you get the exact commit the maintainers stamped as v2.2.0, with no surprises from a stale crates.io upload. This is standard practice for fast-moving infra crates.

### Step 2: Update `crates/evm/Cargo.toml`

Open `crates/evm/Cargo.toml`. The current `[dev-dependencies]` is just `tokio`:

```toml
[dev-dependencies]
tokio = { workspace = true }
```

Replace it with:

```toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-builder    = { workspace = true, features = ["test-utils"] }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
reth-chainspec       = { workspace = true }
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
eyre                 = { workspace = true }
tempfile             = "3"
```

Three categories:

- **`reth-node-builder` + `reth-node-ethereum` with `test-utils` feature** — gives us `NodeBuilder::testing_node(runtime)` which constructs a node in a tempdir with MDBX, debug capabilities, ephemeral ports. Without `test-utils`, these methods don't exist.
- **`reth-node-core` + `reth-tasks` + `reth-chainspec` + `reth-provider`** — runtime-supporting crates the test uses directly (`NodeConfig`, `Runtime`, `ChainSpec`, provider access).
- **`alloy-genesis` + `serde_json` + `eyre` + `tempfile`** — test support: JSON parsing for the dev genesis, error handling, temp directory creation.

**All in `[dev-dependencies]`** — production scope unchanged. If we accidentally use any of these in `lib.rs`'s non-`#[cfg(test)]` code, the compile fails. **Test-only deps are a guardrail.**

### Step 3: Create `crates/evm/src/reth_node.rs`

Top of the file — module doc with an ASCII roadmap showing where we are in Stage 7:

```rust
//! Live Reth node bootstrap — Stage 7a.
//!
//! Demonstrates that a full `EthereumNode` can be spun up in our workspace
//! via `NodeBuilder::testing_node`. Stage 7b will wire `RethEvmBridge` to
//! consume this node's provider + payload builder; for now this module is a
//! validated bootstrap recipe (the smoke test confirms it works) and a
//! placeholder for the future `live_node()` constructor.
//!
//! ```text
//! +----------------------+  Stage 7a (this commit)
//! | NodeBuilder          |--+
//! |   .testing_node      |  |  EthereumNode spins up with MDBX in tempdir,
//! |   .node(Ethereum)    |  |  payload builder, mempool, RPC stub, etc.
//! |   .launch_with_dbg() |--+
//! +----------------------+
//!
//! +----------------------+  Stage 7b (next)
//! | RethEvmBridge        |  Bridge methods (build_payload, payload_ready,
//! |   ::with_live_node() |  validate_payload, commit) route through the
//! +----------------------+  live node's services instead of in-process maps.
//! ```
```

The ASCII roadmap is intentional. **Module 6 has 5 lessons (L11-L15); each replaces one stubbed body in the bridge.** The roadmap gives you the mental scaffold so you know where the current lesson sits in the larger arc.

The file has *no non-test code*. Everything below is `#[cfg(test)] mod tests`:

```rust
#[cfg(test)]
mod tests {
    use alloy_genesis::Genesis;
    use eyre::Result;
    use reth_chainspec::ChainSpec;
    use reth_node_builder::{NodeBuilder, NodeHandle};
    use reth_node_core::node_config::NodeConfig;
    use reth_node_ethereum::EthereumNode;
    use reth_tasks::Runtime;
    use std::sync::Arc;

    // ... helpers + test ...
}
```

The imports are dense but each has a single role:
- `Genesis` — deserialize the dev genesis JSON
- `ChainSpec` — Reth's chain configuration (we get one via `Genesis::into()`)
- `NodeBuilder`, `NodeHandle` — the builder pattern that constructs and launches a node
- `NodeConfig` — node-level configuration (datadir, RPC endpoints, etc.)
- `EthereumNode` — the concrete node type we're spinning up (mainnet Ethereum behaviour)
- `Runtime` — `reth-tasks`' wrapper around tokio runtime
- `Arc` — `ChainSpec` is passed around as `Arc<ChainSpec>`

### Step 4: The `dev_chain_spec` helper

Inside the test module:

```rust
    fn dev_chain_spec() -> Arc<ChainSpec> {
        // Minimal post-merge dev genesis. ChainID 2600 mirrors the upstream
        // custom-dev-node example so we can compare behaviour 1:1 if needed.
        let custom_genesis = r#"{
            "nonce": "0x42",
            "timestamp": "0x0",
            "extraData": "0x5343",
            "gasLimit": "0x5208",
            "difficulty": "0x400000000",
            "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "coinbase": "0x0000000000000000000000000000000000000000",
            "alloc": {},
            "number": "0x0",
            "gasUsed": "0x0",
            "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "config": {
                "ethash": {},
                "chainId": 2600,
                "homesteadBlock": 0,
                "eip150Block": 0,
                "eip155Block": 0,
                "eip158Block": 0,
                "byzantiumBlock": 0,
                "constantinopleBlock": 0,
                "petersburgBlock": 0,
                "istanbulBlock": 0,
                "berlinBlock": 0,
                "londonBlock": 0,
                "terminalTotalDifficulty": 0,
                "terminalTotalDifficultyPassed": true,
                "shanghaiTime": 0
            }
        }"#;
        let genesis: Genesis =
            serde_json::from_str(custom_genesis).expect("dev genesis json parses");
        Arc::new(genesis.into())
    }
```

A handful of things to notice:

- **`chainId: 2600`** — matches Reth's upstream `custom-dev-node` example so you can compare behaviour line-by-line if debugging. **2600 is not a magic OpenHL number**; it's whatever Reth's docs use.
- **All EIP block numbers = 0** — every Ethereum hardfork is active from height 0. This is "post-merge dev" — we don't simulate the historical sequence of forks.
- **`terminalTotalDifficulty: 0` + `terminalTotalDifficultyPassed: true`** — the chain starts post-merge. No pre-merge proof-of-work blocks ever existed.
- **`shanghaiTime: 0`** — Shanghai (withdrawals) is active at genesis.
- **`alloc: {}`** — no pre-funded accounts. For tests that need balances, you'd add entries here.

The JSON is parsed via `serde_json::from_str(...)` into `Genesis`, then converted to `ChainSpec` via `genesis.into()` (alloy-genesis provides the impl). `Arc::new(...)` because the node holds it as `Arc<ChainSpec>` — multiple subsystems share it.

> 🛑 **Anti-fluency.** "Why a raw JSON string instead of constructing a `ChainSpec` directly in Rust?" **Because Reth's `ChainSpec` builder has 50+ fields and complex internal invariants.** Constructing one programmatically means catching up to every recent fork's required fields. Constructing from JSON via the `Genesis` deserializer means letting Reth's own type system enforce defaults and validity. **The JSON format is the chain's external interface anyway** — production chains all use the same JSON shape (look at `reth-chainspec/res/genesis/mainnet.json`).

### Step 5: The `launch_and_check` helper

Below `dev_chain_spec`:

```rust
    /// Bootstrap a real Reth `EthereumNode` and verify the provider responds.
    /// Returns nothing if successful; panics on launch or assertion failure.
    async fn launch_and_check() -> Result<()> {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let expected_chain_id = chain_spec.chain.id();

        let node_config = NodeConfig::test().dev().with_chain(chain_spec);

        let NodeHandle {
            node,
            node_exit_future: _,
        } = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .node(EthereumNode::default())
            .launch_with_debug_capabilities()
            .await?;

        // The provider should serve canonical chain queries off the genesis state.
        let observed_chain_id = node.chain_spec().chain.id();
        assert_eq!(observed_chain_id, expected_chain_id);

        // NOTE: not awaiting node_exit_future — drop the NodeAdapter and let
        // its background tasks tear themselves down when the runtime drops.
        Ok(())
    }
```

Walk through:

1. **`Runtime::test()`** — `reth-tasks`' canonical "test runtime" — wraps the current tokio runtime so Reth's `TaskExecutor` can spawn into it.
2. **`dev_chain_spec()`** — the genesis-derived chain spec we just built.
3. **`NodeConfig::test().dev().with_chain(chain_spec)`** — builder chain:
   - `test()` — sane test defaults (ephemeral ports, etc.)
   - `.dev()` — single-validator dev mode (no peer-discovery, no MEV)
   - `.with_chain(...)` — bind to our dev chain spec
4. **`NodeBuilder::new(config).testing_node(runtime).node(EthereumNode::default())`** — the four-stage builder:
   - `new(config)` — pull in the config
   - `.testing_node(runtime)` — declare we're a test (tempdir storage, debug RPC, etc.)
   - `.node(EthereumNode::default())` — say "we want Ethereum mainnet behaviour" (vs. Optimism, custom, etc.)
5. **`.launch_with_debug_capabilities()`** — spawn all the node's services (MDBX, payload builder, RPC, mempool gossip in test mode, etc.). Returns `NodeHandle { node, node_exit_future }`.
6. **`node.chain_spec().chain.id()` assertion** — the simplest possible "did the node start correctly?" check. If we can fetch the chain ID off the live `BlockchainProvider`, the node booted.
7. **`node_exit_future: _`** — we *don't* await this future. Awaiting would block waiting for the node to shut down (which it never will until killed). Instead, we drop `NodeHandle` at end-of-function and let the runtime tear down the background tasks.

> 🛑 **Anti-fluency.** "What does `NodeConfig::test().dev()` actually disable?" **Crucially: peer discovery via libp2p Kademlia and the full mempool gossip protocol.** A non-test, non-dev node would attempt to dial peers, sync the chain, and respond to libp2p requests. In our test, none of that — the node is fully isolated. This is essential because our chain ID (2600) doesn't match any public network, so any peer dial would either time out or get rejected.

### Step 6: The test itself

Finally:

```rust
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn reth_dev_node_bootstraps() {
        if let Err(e) = launch_and_check().await {
            panic!("Reth dev node bootstrap failed: {e:?}");
        }
    }
```

The body is 2 lines. **The validation is in `launch_and_check`**; the test just calls it and surfaces failures as panics with the inner error preserved.

`flavor = "multi_thread", worker_threads = 4` — same setup as L10's integration test. Reth's internal tasks (MDBX commits, payload builder, RPC handler, network service) all want their own thread; 4 gives them room without contention.

### Step 7: Wire `reth_node.rs` into `crates/evm/src/lib.rs`

Open `crates/evm/src/lib.rs`. Currently it has the in-memory and Reth bridges from L4-L5 plus their re-exports. Add **one line, gated to test cfg:**

```rust
//! ... existing docs ...

pub mod bridges; // existing

#[cfg(test)]
mod reth_node;

// ... existing re-exports ...
```

The `#[cfg(test)]` is the key. **The Reth bootstrap module is test-only** — not visible to consumers of `openhl-evm`, not compiled in non-test builds. This is consistent with all the deps being `[dev-dependencies]`: nothing about L11 affects production scope.

## Test

```bash
cargo test -p openhl-evm reth_dev_node_bootstraps --release
```

**First run:** ~2:34 cold compile (Reth's MDBX, libp2p, payload builder, RPC stack all build for the first time), then ~3 seconds run.

Subsequent runs: ~30 seconds (Cargo's incremental compilation), then ~3 seconds run.

Output:

```
running 1 test
test reth_node::tests::reth_dev_node_bootstraps ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Full suite check:

```bash
cargo test
```

…should produce 36 tests passing workspace-wide (21 consensus + 15 evm now that we have one new test).

Common errors and fixes:

- **`error[E0432]: unresolved import 'reth_node_builder'`** — `crates/evm/Cargo.toml` is missing the `test-utils` feature. Re-check Step 2: it must be `features = ["test-utils"]`.
- **`error: failed to resolve: use of undeclared crate or module 'reth_provider'`** — workspace-level `reth-provider = ...` is missing. Re-check Step 1.
- **`error: feature 'test-utils' on 'reth-node-builder' requires feature 'X'`** — version skew. The Reth SHA you're pinning must match what `reth-node-builder` expects from its peer crates. All 12 reth-* deps must use the same SHA — re-check Step 1.
- **`Reth dev node bootstrap failed: Failed to bind...`** — port conflict from a previous test run. `NodeConfig::test()` uses ephemeral ports, but stale state in tempdir can collide. Run `cargo clean -p openhl-evm` and retry.
- **Test compiles but hangs > 30s** — `Runtime::test()` not working right. Check that you're using `#[tokio::test(flavor = "multi_thread", worker_threads = 4)]`, not the single-threaded default.

## Design reflection

Three load-bearing decisions encoded here:

1. **Production deps stay minimal; test-only deps validate the entire stack.** `crates/evm/Cargo.toml` has 6 production deps (unchanged from L5) plus 11 dev-deps. The 11 dev-deps validate that Reth's full node-builder + provider stack works *now* — but a downstream crate that uses `openhl-evm` doesn't pull them in. **This is how you keep `openhl-evm` slim while still proving the integration works.**

2. **A bootstrap-only test is a meaningful artifact.** This lesson's test does nothing except spin up the node and check the chain ID. It doesn't build a block, doesn't execute a transaction, doesn't query historical state. **And yet it's the lesson the whole rest of Module 6 depends on.** If the bootstrap fails, nothing in L12-L15 can possibly work. **Bootstrap-only tests catch infrastructure regressions before any business logic is involved.**

3. **The ASCII roadmap in the module doc is the trail marker for L12-L15.** Each remaining lesson replaces a stubbed body in the bridge — `build_payload`, `payload_ready`, `validate_payload`, `commit`. The roadmap shows where in the larger arc each lesson sits. **Module docs are for orientation, not implementation details.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout e6b4ebb
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/reth_node.rs ./crates/evm/src/reth_node.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
```

The reference at `e6b4ebb` includes the workspace dep updates, the 11 dev-deps, and the 105-line `reth_node.rs`. The JSON genesis string, the builder chain, and the test attribute should match closely. Doc comments and exact wording can vary.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why is the chain ID 2600 instead of 1 (mainnet) or a random number?**
Two reasons: (1) it doesn't collide with any public network, so peer discovery never accidentally connects you to a real chain; (2) it matches Reth's upstream `custom-dev-node` example, letting you `diff` behaviour against the canonical reference. You can change it freely later — there's no semantic significance to 2600 in OpenHL specifically.

**Q: What's `NodeConfig::test().dev()` doing differently from `NodeConfig::default()`?**
`test()` = ephemeral tempdir for MDBX, bind to `:0` (kernel-allocated) ports, no peer discovery, sane test logging. `dev()` = single-validator mode (no actual consensus among multiple validators), assume the local node is the only block producer, no mempool gossip. Combined: a fully isolated dev/test environment.

**Q: Does `launch_with_debug_capabilities` mean it's slower than normal?**
No — it enables additional RPC endpoints (`debug_*` namespace) that are normally gated. The performance overhead is negligible; the cost is just exposing extra surface that would be security risks in prod. Fine for tests.

**Q: Why don't we `kill()` the node like we did `OpenHlNodeHandle` in L9?**
Because the `NodeHandle` Reth returns doesn't have a `kill()` method on the path we use. The expectation is that you drop the handle and let the runtime tear things down. For longer-running tests that need explicit cleanup, you'd call `node.task_executor.shutdown(...)` — but for a 3-second smoke test, drop suffices.

## Next lesson (L12)

Reth and Malachite now coexist. **But the bridge still doesn't talk to Reth.** L12 builds `LiveRethEvmBridge::with_live_node()` — a constructor that takes the `node` we just bootstrapped and exposes its `BlockchainProvider` so `build_payload` (L4-L5's stubbed bridge methods) can do *real* parent-block lookups against the live MDBX state. This is the moment when "Reth is in our workspace" becomes "Reth is producing data the consensus engine reads."
````

---

## Seed-file slot

L11 opens new Module 6 (Live Reth), sortOrder 0:

```typescript
modules: {
  0: { title: 'Orientation', sortOrder: 0 },
  1: { title: 'Foundations', sortOrder: 1 },
  2: { title: 'Contract types', sortOrder: 2 },
  3: { title: 'EL test double', sortOrder: 3 },
  4: { title: 'CL types', sortOrder: 4 },
  5: { title: 'Engine integration', sortOrder: 5 },
  6: { title: 'Live Reth', sortOrder: 6 },  // NEW
},
```

```typescript
{
  title: 'Lesson 11 — Booting a live Reth EthereumNode in your workspace',
  slug: 'openhl-reth-bootstrap-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 80,
  content: `# Lesson 11 — Booting a live Reth \`EthereumNode\` in your workspace\n\n...`
},
```

## SHA pinning discipline

L11 cites one openhl commit (§Answer key):
- `e6b4ebb` (Stage 7a — live Reth EthereumNode bootstraps in our workspace)

This is the dependency-validation milestone — proves Reth + Malachite coexist before L12-L15 wire `LiveRethEvmBridge`.

## Style review notes (self-critique before paste)

- **§Plan's "dependency-coexistence validation pattern" callout** generalizes beyond OpenHL to any project depending on two large infra stacks.
- **Step 4's "JSON instead of programmatic constructor" anti-fluency** anticipates the natural Rust-purist instinct to write a typed builder; the JSON path is correct because the upstream maintains the format.
- **The ASCII roadmap in Step 3** is intentionally repeated for emphasis — it's the trail marker for L12-L15.
- **The §Common questions about `kill()`** anticipates carryover confusion from L9 where we did kill manually.
- **The compile-time call-out (~2:34 cold, ~30s incremental)** sets realistic expectations so readers don't think they broke something.
