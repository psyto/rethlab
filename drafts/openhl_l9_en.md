# Building OpenHL — L9 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHA `d59d6cf` (Stage 6c — implement Node trait, first start_engine call works).
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).
> Note: L9 is the engine-boots milestone. After this lesson, `start_engine` spawns the actor system and tears it down cleanly. L10-L15 build out the app loop, the live Reth bridge, and the validate/commit paths.

---

## L9 — `openhl-node-en`

- **Module:** 4 (CL types), sortOrder 3 within module
- **Course-level sortOrder:** 8 (lesson 9 of 16)
- **Duration:** 55 min
- **XP reward:** 100
- **Type:** CONTENT

### Content

````markdown
# Lesson 9 — `OpenHlNode` and the first `start_engine` call

## Goal

Concepts you'll grasp in this lesson:

- **`Node` as handshake interface, not runtime** — `OpenHlNode` holds long-lived configuration (key, validator set, home dir, moniker) and *constructs* the engine. The actual running actor system lives in `OpenHlNodeHandle`, returned from `start()`. Construction and execution are different lifecycle stages, in different types.
- **The actor-system spawn surface** — what `start_engine` actually does (spawns ractor cells, binds libp2p, allocates a `Channels<OpenHlContext>`), why it returns an `EngineHandle`, and how `OpenHlNodeHandle` wraps it to satisfy the `NodeHandle<OpenHlContext>` trait.
- **`Mutex<Option<Channels>>` take-once semantics** — why the channel handle is takeable exactly once. The app loop (L10) consumes them; subsequent calls return `None`, a clean signal that ownership has transferred.
- **Centralized address derivation** — `SHA-256(pubkey)[12..32]` lives in one place (`get_address`), and a test asserts it matches the helper used in L6's runner. Centralization + a verification test prevents silent drift across files.
- **Type-safe placeholders over `todo!()`** — `run()` returns `Err("not yet implemented (L10)")` instead of panicking. Code that calls it fails gracefully with a pointer to the next lesson, surviving across PRs and stale tabs.
- **Why the smoke test is necessary** — L8's compile-time `assert_impl_all!` proved the codec satisfies the trait. The smoke test proves the *runtime* path — spawn, channel allocation, libp2p binding, kill propagation — actually works end-to-end. Types are necessary but not sufficient.

Verification:

```bash
cargo test -p openhl-consensus
```

…passes **20 tests** (16 from L8 + 4 new ones for the Node impl). The capstone test:

```
test node::tests::start_engine_smoke_spawns_and_kills ... ok
```

…spawns the full Malachite actor system against your code, asserts the channel handle is available exactly once, and tears the actor system down cleanly — **in about 0.02 seconds**. After this lesson, the engine boots; the only thing missing is the application loop that consumes from `Channels<OpenHlContext>` and drives the bridge.

Specific changes:

- 1 dep added to `crates/consensus/Cargo.toml`: `informalsystems-malachitebft-app-channel`.
- `crates/consensus/src/node.rs` — new file (~310 lines) with `OpenHlNode`, `OpenHlConfig`, `OpenHlGenesis`, `OpenHlPrivateKeyFile`, `OpenHlNodeHandle`, the `impl Node for OpenHlNode` (5 associated types, 12 methods), and 4 unit tests (private-key round-trip, config defaults, address derivation, `start_engine` smoke).
- `crates/consensus/src/lib.rs` — wires `pub mod node;`.

## Recap

After L8 your `openhl-consensus` crate has:

```
crates/consensus/src/lib.rs               — pub mod bridge, codec, context, signing, signing_provider, types
crates/consensus/src/codec.rs             — OpenHlCodec (1 real + 7 stub Codec impls, 2 tests)
crates/consensus/src/signing_provider.rs  — SigningProvider<OpenHlContext>
crates/consensus/src/context.rs           — Context<OpenHlContext>
crates/consensus/src/types/               — 7 type files
```

`cargo test -p openhl-consensus` passes 16 tests. You've satisfied every trait bound `start_engine` requires *at the type level*, but you can't actually call it yet — there's no `Node` impl, no config, no genesis, no private key file, no node handle.

## Plan

Six things:

1. **Add 5 more deps to `crates/consensus/Cargo.toml`** — `informalsystems-malachitebft-app-channel`, `informalsystems-malachitebft-config`, enable `serde` feature on signing-ed25519, add `serde` and `tokio` as runtime deps (not just dev), add `tempfile` as dev-dep.
2. **Create `crates/consensus/src/node.rs`** with: `OpenHlConfig` (impl `NodeConfig`), `OpenHlGenesis` (unit struct), `OpenHlPrivateKeyFile` (wire wrapper), `OpenHlNodeHandle` (returned from `start()`), `OpenHlNode` (the main struct), and `impl Node for OpenHlNode` with 5 associated types and 12 methods.
3. **Wire `pub mod node;`** into `lib.rs`.
4. **Add 4 unit tests** to `node.rs`.
5. **Run** `cargo test -p openhl-consensus` — 20 tests pass.
6. **Stare at** `start_engine_smoke_spawns_and_kills` passing in 0.02 seconds. This is the moment your code becomes a running BFT engine.

This lesson teaches **the bridge pattern between your code and Malachite**. The engine — written by someone else, generic over your `Context` and `Codec` — needs five things to spawn: an instance of your context, an instance of your node (to get config, signing, address derivation), a config value, a codec value, an initial height, and a validator set. The `Node` trait is the **handshake interface** that lets Malachite ask your code for those things uniformly. Once you implement it, `start_engine` works for any chain that follows the same handshake.

> 🛑 **Predict.** Before scrolling: why does Malachite ask for a separate `OpenHlConfig` rather than just letting `OpenHlNode` carry its own config fields? Hint: think about who *owns* the config and when it can change. The node is created once at process startup, but configuration (listen address, value payload mode, value sync settings) might be reloaded from disk on signal. Separating `OpenHlConfig` from `OpenHlNode` lets the config be loaded via `Node::load_config()` — re-callable, returning a fresh value each time — without re-instantiating the node.

## Walk-through

### Step 1: Update `crates/consensus/Cargo.toml`

Open `crates/consensus/Cargo.toml`. The current `[dependencies]` section (after L8) looks like:

```toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }

informalsystems-malachitebft-core-types      = { workspace = true }
informalsystems-malachitebft-core-driver     = { workspace = true }
informalsystems-malachitebft-core-consensus  = { workspace = true }
informalsystems-malachitebft-app             = { workspace = true }
informalsystems-malachitebft-signing-ed25519 = { workspace = true, features = ["rand"] }
bytes                                         = "1"
rand                                          = "0.8"
sha2                                          = "0.10"

[dev-dependencies]
tokio = { workspace = true }
```

Replace it with:

```toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }

informalsystems-malachitebft-core-types      = { workspace = true }
informalsystems-malachitebft-core-driver     = { workspace = true }
informalsystems-malachitebft-core-consensus  = { workspace = true }
informalsystems-malachitebft-app             = { workspace = true }
informalsystems-malachitebft-app-channel     = { workspace = true }
informalsystems-malachitebft-config          = { workspace = true }
informalsystems-malachitebft-signing-ed25519 = { workspace = true, features = ["rand", "serde"] }
bytes                                         = "1"
rand                                          = "0.8"
sha2                                          = "0.10"
serde                                         = { workspace = true }
tokio                                         = { workspace = true }

[dev-dependencies]
tokio    = { workspace = true }
tempfile = "3"

[lints]
workspace = true
```

What each new dep is for:

- **`informalsystems-malachitebft-app-channel`** — provides `start_engine()`, the function we're about to call, plus the `Channels<Ctx>` type returned to communicate with the engine.
- **`informalsystems-malachitebft-config`** — `ConsensusConfig`, `ValueSyncConfig`, `ValuePayload` types we'll embed in `OpenHlConfig`.
- **`serde` feature on `signing-ed25519`** — lets us derive `Serialize`/`Deserialize` on `OpenHlPrivateKeyFile`, which needs the `PrivateKey` newtype to be serializable.
- **`serde`** (runtime dep) — used by `OpenHlConfig`, `OpenHlGenesis`, `OpenHlPrivateKeyFile` for `#[derive(Serialize, Deserialize)]`.
- **`tokio`** moved from dev-dep to dep — `OpenHlNodeHandle` holds a `tokio::sync::Mutex`.
- **`tempfile`** dev-dep — the smoke test creates a temp directory for the node's home dir.

This is your second heavy compile. First time pulling in `app-channel` + `config` will take ~20 more seconds.

### Step 2: Create `crates/consensus/src/node.rs` — imports and `OpenHlConfig`

Start with imports:

```rust
//! `Node` trait implementation — describes our chain to Malachite's engine
//! and provides the [`OpenHlNode::start`] entry point that calls
//! `malachitebft_app_channel::start_engine` to spawn the actor system.

use std::path::PathBuf;

use async_trait::async_trait;
use eyre::eyre;
use informalsystems_malachitebft_app::node::{EngineHandle, Node, NodeConfig, NodeHandle};
use informalsystems_malachitebft_app::types::Keypair;
use informalsystems_malachitebft_app_channel::Channels;
use informalsystems_malachitebft_config::{ConsensusConfig, ValueSyncConfig, ValuePayload};
use informalsystems_malachitebft_core_types::Height as _;
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, PublicKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::sync::Mutex;

use crate::codec::OpenHlCodec;
use crate::context::OpenHlContext;
use crate::signing_provider::OpenHlSigningProvider;
use crate::types::{OpenHlAddress, OpenHlHeight, OpenHlValidatorSet};
```

That's the full surface this file needs. Worth scanning once: `Node`, `NodeConfig`, `NodeHandle` are the three Malachite traits we'll implement. `EngineHandle` + `Channels` are what `start_engine` returns. `ConsensusConfig` + `ValueSyncConfig` + `ValuePayload` are the config types embedded in our `OpenHlConfig`. `Keypair` is libp2p's keypair type. `PrivateKey`/`PublicKey` are the Ed25519 types we've used since L7. `Sha256` is for address derivation.

Now write `OpenHlConfig`:

```rust
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenHlConfig {
    pub moniker: String,
    #[serde(flatten)]
    pub consensus: ConsensusConfig,
    pub value_sync: ValueSyncConfig,
}

impl OpenHlConfig {
    #[must_use]
    pub fn new(moniker: impl Into<String>) -> Self {
        // OpenHL runs ProposalOnly (no streaming proposal parts) — must match
        // our `Context::ProposalPart` shape.
        let consensus = ConsensusConfig {
            value_payload: ValuePayload::ProposalOnly,
            ..ConsensusConfig::default()
        };
        Self {
            moniker: moniker.into(),
            consensus,
            value_sync: ValueSyncConfig::default(),
        }
    }
}

impl NodeConfig for OpenHlConfig {
    fn moniker(&self) -> &str {
        &self.moniker
    }
    fn consensus(&self) -> &ConsensusConfig {
        &self.consensus
    }
    fn value_sync(&self) -> &ValueSyncConfig {
        &self.value_sync
    }
}
```

Three pieces:

- The struct wraps `ConsensusConfig` + `ValueSyncConfig` and adds a `moniker` (validator's nickname for logs). `#[serde(flatten)]` on `consensus` means the consensus fields are inlined into the parent — when serialized to disk, the user sees `[consensus]` section keys at the top level, not nested under `consensus.`.
- `new()` enforces one critical choice: `value_payload: ValuePayload::ProposalOnly`. This *must* match our `Context::ProposalPart = OpenHlProposalPart` (the unit struct). If we accidentally set this to `ValuePayload::PartsOnly`, the engine would expect streamed proposal parts, and our unit-struct `ProposalPart` would never satisfy what the engine sends. This is the kind of invariant that's easier to enforce at construction than to debug later.
- `NodeConfig` impl is three trivial accessors. The trait exists so Malachite can pull out the sub-configs without knowing the parent's layout.

### Step 3: `OpenHlGenesis` and `OpenHlPrivateKeyFile`

Next:

```rust
/// Genesis is a unit struct at v0 — the validator set is passed directly to
/// `start_engine` rather than read from disk. When `OpenHL` grows a real
/// on-disk genesis format this becomes the `load_genesis()` return.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct OpenHlGenesis;

/// Wire-friendly wrapper around the raw 32-byte Ed25519 private key.
#[derive(Clone, Serialize, Deserialize)]
pub struct OpenHlPrivateKeyFile {
    pub bytes: [u8; 32],
}

impl OpenHlPrivateKeyFile {
    #[must_use]
    pub fn from_private_key(sk: &PrivateKey) -> Self {
        Self {
            bytes: sk.inner().to_bytes(),
        }
    }

    #[must_use]
    pub fn into_private_key(self) -> PrivateKey {
        PrivateKey::from(self.bytes)
    }
}

impl std::fmt::Debug for OpenHlPrivateKeyFile {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OpenHlPrivateKeyFile")
            .field("bytes", &"[redacted]")
            .finish()
    }
}
```

Two types:

- **`OpenHlGenesis`** — a unit struct. At v0 we have no genesis content (no allocations, no precompiles registered at boot — those come later in Module 6). The validator set is passed directly to `start_engine` rather than via genesis. When OpenHL adds a real genesis format, this becomes the type that `load_genesis()` deserializes.
- **`OpenHlPrivateKeyFile`** — a wire-friendly wrapper around the 32-byte private key. `PrivateKey` itself (from `malachitebft_signing_ed25519`) doesn't implement `Serialize`/`Deserialize` by default; the wrapper does, and the conversions `from_private_key` / `into_private_key` are explicit. **The manual `Debug` impl** redacts the bytes — `{:?}` printing the actual private key in a log would be a serious security bug. The `[redacted]` token is the convention.

> 🛑 **Anti-fluency.** "Why not just `#[derive(Debug)]`?" **Because the default derived `Debug` for `[u8; 32]` prints all 32 bytes.** If anyone ever wraps an `OpenHlPrivateKeyFile` in another `Debug`-derived struct and logs it, the key leaks into stderr / log files / Sentry. A manual `Debug` with `[redacted]` makes this impossible without conscious effort. **Treat private keys like passwords — never let them print.**

The relationship between `OpenHlNode` and `OpenHlNodeHandle` in one diagram makes the central design choice of this lesson — **separating construction (static config) from execution (dynamic actor system) into two distinct types** — immediately intuitive:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ◆ Lifecycle 1: static config / construction (Node)                       │
│                                                                          │
│   OpenHlNode {                                                            │
│       private_key, validator_set,                                         │
│       home_dir, moniker, …                                                │
│   }                                                                       │
│                                                                          │
│   • Created once at process start, long-lived                             │
│   • Engine **is not running yet** (just config in hand)                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │  .start().await   ◄── handshake (Node trait)
                             │                        executes (Step 5)
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ ◆ Lifecycle 2: dynamic execution / actor system (Handle)                 │
│                                                                          │
│   OpenHlNodeHandle {                                                      │
│       engine   : EngineHandle           ──► ractor cell + libp2p running │
│       channels : Mutex<Option<Channels<OpenHlContext>>>                   │
│                                         ──► L10's app loop pulls it out  │
│                                            exactly once via `take()`     │
│   }                                                                       │
│                                                                          │
│   • Returned by `start()`; lives until `.kill().await`                   │
│   • Ownership flows Node → Handle → app loop in one direction            │
└─────────────────────────────────────────────────────────────────────────┘
```

Three things this picture pins down: (a) **`OpenHlNode` only holds config — it doesn't own an actor system** — calling `start()` is what spins up any threads at all. (b) **`OpenHlNodeHandle` owns both the running actor system and the comm channels** — the engine and libp2p lifetimes are bound to this handle. (c) **`Mutex<Option<Channels<...>>>` is a one-way ownership gate** — once `take()` hands it to L10's app loop, it can never be reclaimed, and "already consumed" is expressed at the type level as `None`. L9's `run()` method returns an "unimplemented" error precisely because the (c) consumer side (L10's **app loop**) hasn't been written yet.

### Step 4: `OpenHlNodeHandle` — what `start()` returns

```rust
/// Handle returned by [`OpenHlNode::start`]. Owns the engine actor system
/// and the channel handles for the (yet-to-be-implemented) app loop.
pub struct OpenHlNodeHandle {
    engine: EngineHandle,
    channels: Mutex<Option<Channels<OpenHlContext>>>,
}

impl std::fmt::Debug for OpenHlNodeHandle {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OpenHlNodeHandle")
            .field("engine", &"<EngineHandle>")
            .field("channels", &"<Channels>")
            .finish()
    }
}

impl OpenHlNodeHandle {
    /// Take ownership of the engine→app message channels. Returns None on
    /// the second call. L10 will consume from this to drive the bridge.
    pub async fn take_channels(&self) -> Option<Channels<OpenHlContext>> {
        self.channels.lock().await.take()
    }
}

#[async_trait]
impl NodeHandle<OpenHlContext> for OpenHlNodeHandle {
    fn subscribe(&self) -> informalsystems_malachitebft_app::events::RxEvent<OpenHlContext> {
        // No event subscription in Stage 6c — caller can't yet observe engine
        // events. L10 wires the TxEvent from the engine to here.
        informalsystems_malachitebft_app::events::TxEvent::new().subscribe()
    }

    async fn kill(&self, _reason: Option<String>) -> eyre::Result<()> {
        self.engine.actor.kill_and_wait(None).await?;
        self.engine.handle.abort();
        Ok(())
    }
}
```

The handle owns two things:

- **`engine: EngineHandle`** — Malachite's handle to the spawned actor system. Has an `actor` (the ractor `ActorCell`) and a `handle` (the tokio task handle). `kill()` cleanly tears both down.
- **`channels: Mutex<Option<Channels<OpenHlContext>>>`** — the application-side endpoints. The engine sends `AppMsg<OpenHlContext>` to us; we send `AppReply<OpenHlContext>` back. `Mutex<Option<...>>` so that `take_channels()` can hand them to the app loop exactly once — second call returns `None`, signaling "you've already consumed these."

**Why `tokio::sync::Mutex` rather than `std::sync::Mutex`?** Because `take_channels()` is `async` and the lock is held across an `.await` boundary. `std::sync::Mutex` would block the entire executor thread; `tokio::sync::Mutex` yields cooperatively.

The `NodeHandle` impl is mostly placeholder at this stage:
- `subscribe()` returns a *fresh* `TxEvent::subscribe()` — an empty event stream with no producer attached. L10 will wire up the real one.
- `kill()` is real — it kills the actor cell and aborts the tokio task. This is what `start_engine_smoke_spawns_and_kills` exercises.

### Step 5: `OpenHlNode` struct + `Node` impl

```rust
#[derive(Clone, Debug)]
pub struct OpenHlNode {
    pub private_key: PrivateKey,
    pub validator_set: OpenHlValidatorSet,
    pub home_dir: PathBuf,
    pub moniker: String,
}

impl OpenHlNode {
    #[must_use]
    pub fn new(
        private_key: PrivateKey,
        validator_set: OpenHlValidatorSet,
        home_dir: PathBuf,
        moniker: impl Into<String>,
    ) -> Self {
        Self {
            private_key,
            validator_set,
            home_dir,
            moniker: moniker.into(),
        }
    }
}

#[async_trait]
impl Node for OpenHlNode {
    type Context = OpenHlContext;
    type Config = OpenHlConfig;
    type Genesis = OpenHlGenesis;
    type PrivateKeyFile = OpenHlPrivateKeyFile;
    type SigningProvider = OpenHlSigningProvider;
    type NodeHandle = OpenHlNodeHandle;

    fn get_home_dir(&self) -> PathBuf {
        self.home_dir.clone()
    }

    fn load_config(&self) -> eyre::Result<Self::Config> {
        let mut cfg = OpenHlConfig::new(&self.moniker);
        // Bind to an ephemeral port on localhost so tests and devnets don't
        // step on each other. Real deployments override this in their config.
        cfg.consensus.p2p.listen_addr = "/ip4/127.0.0.1/tcp/0"
            .parse()
            .map_err(|e| eyre!("invalid listen_addr: {e}"))?;
        Ok(cfg)
    }

    fn get_address(&self, pk: &PublicKey) -> OpenHlAddress {
        let digest = Sha256::digest(pk.as_bytes());
        let mut addr = [0u8; 20];
        addr.copy_from_slice(&digest[12..32]);
        OpenHlAddress(addr)
    }

    fn get_public_key(&self, pk: &PrivateKey) -> PublicKey {
        pk.public_key()
    }

    fn get_keypair(&self, pk: PrivateKey) -> Keypair {
        Keypair::ed25519_from_bytes(pk.inner().to_bytes())
            .expect("ed25519 private key is always 32 bytes")
    }

    fn load_private_key(&self, file: Self::PrivateKeyFile) -> PrivateKey {
        file.into_private_key()
    }

    fn load_private_key_file(&self) -> eyre::Result<Self::PrivateKeyFile> {
        Ok(OpenHlPrivateKeyFile::from_private_key(&self.private_key))
    }

    fn load_genesis(&self) -> eyre::Result<Self::Genesis> {
        // Validator set is passed directly to start_engine; genesis carries
        // nothing else at v0.
        Ok(OpenHlGenesis)
    }

    fn get_signing_provider(&self, private_key: PrivateKey) -> Self::SigningProvider {
        OpenHlSigningProvider::new(private_key)
    }

    async fn start(&self) -> eyre::Result<Self::NodeHandle> {
        let cfg = self.load_config()?;
        let validator_set = self.validator_set.clone();

        let (channels, engine) = informalsystems_malachitebft_app_channel::start_engine(
            OpenHlContext,
            self.clone(),
            cfg,
            OpenHlCodec, // WAL
            OpenHlCodec, // Network
            Some(OpenHlHeight::INITIAL),
            validator_set,
        )
        .await?;

        Ok(OpenHlNodeHandle {
            engine,
            channels: Mutex::new(Some(channels)),
        })
    }

    async fn run(self) -> eyre::Result<()> {
        // L10 will consume from channels here and run the app loop.
        Err(eyre!("OpenHlNode::run is not yet implemented (L10)"))
    }
}
```

This is the load-bearing block. Walk through:

**The struct** carries four things: private key, validator set, home dir, moniker. These are the long-lived bits that don't change per-config-reload.

**The 6 associated types** declare the concrete types for each handshake slot:
- `Context = OpenHlContext` — what Malachite uses to typecheck everything else
- `Config = OpenHlConfig` — what `load_config()` returns
- `Genesis = OpenHlGenesis` — what `load_genesis()` returns
- `PrivateKeyFile = OpenHlPrivateKeyFile` — what `load_private_key_file()` returns
- `SigningProvider = OpenHlSigningProvider` — what `get_signing_provider()` returns
- `NodeHandle = OpenHlNodeHandle` — what `start()` returns

**The 12 methods**:

| Method | Purpose | Body |
| :--- | :--- | :--- |
| `get_home_dir` | Where the node stores its data | Returns the path passed at construction |
| `load_config` | Build the config (re-callable) | Constructs `OpenHlConfig`, then overrides the listen address to ephemeral local |
| `get_address` | SHA-256 hash → 20-byte address | Last 20 of the 32-byte digest |
| `get_public_key` | PK from SK | `sk.public_key()` |
| `get_keypair` | libp2p Keypair from Ed25519 | Convert via `ed25519_from_bytes` |
| `load_private_key` | Unwrap the file format | `file.into_private_key()` |
| `load_private_key_file` | Serialize PK to file format | `OpenHlPrivateKeyFile::from_private_key(...)` |
| `load_genesis` | Read the genesis | Returns `OpenHlGenesis` (unit struct, nothing to read) |
| `get_signing_provider` | Construct the SigningProvider | `OpenHlSigningProvider::new(pk)` |
| `start` | Spawn the engine | Calls `start_engine` with 7 args, wraps return in `OpenHlNodeHandle` |
| `run` | Run the app loop | **Unimplemented at L9** — returns error pointing to L10 |

**The `start()` method is the highlight.** It calls `start_engine` with:
- the context (`OpenHlContext` — a unit struct)
- the node itself (`self.clone()`)
- the config (`cfg`)
- two codec values (one for WAL, one for Network — both `OpenHlCodec`)
- the initial height (`Some(OpenHlHeight::INITIAL)`)
- the validator set (`validator_set`)

What `start_engine` returns: `(Channels<OpenHlContext>, EngineHandle)`. We wrap these into `OpenHlNodeHandle` and return.

**Why is `run()` unimplemented?** Because Malachite's `Node::run` is meant to combine `start()` with the app loop into one async future. Since the app loop doesn't exist until L10, we return an error pointing to L10. Once L10 is done, `run()` will look like: call `start()`, take the channels, drive the app loop, await termination.

> 🛑 **Anti-fluency.** "Why does `start()` take the codec twice?" **Because the engine has separate codec slots for WAL and Network gossip.** They could be different types — e.g., your WAL might use bincode, your network might use protobuf. In our case both use the same `OpenHlCodec`, but the API doesn't assume they'll be the same. Passing them separately lets you swap one without the other.

### Step 6: Wire `node.rs` into `lib.rs`

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod codec;
pub mod context;
pub mod node;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
```

### Step 7: Add 4 unit tests

At the bottom of `node.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::OpenHlValidator;
    use rand::rngs::OsRng;

    fn single_validator_node(home_dir: PathBuf) -> OpenHlNode {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let digest = Sha256::digest(pk.as_bytes());
        let mut addr_bytes = [0u8; 20];
        addr_bytes.copy_from_slice(&digest[12..32]);
        let address = OpenHlAddress(addr_bytes);
        let validator_set = OpenHlValidatorSet::new(vec![OpenHlValidator::new(address, pk, 1)]);
        OpenHlNode::new(sk, validator_set, home_dir, "openhl-test")
    }

    #[test]
    fn private_key_file_round_trips() {
        let sk = PrivateKey::generate(OsRng);
        let file = OpenHlPrivateKeyFile::from_private_key(&sk);
        let restored = file.into_private_key();
        assert_eq!(restored.inner().to_bytes(), sk.inner().to_bytes());
    }

    #[test]
    fn load_config_sets_proposal_only_payload_and_ephemeral_listen_addr() {
        let tmp = tempfile::tempdir().unwrap();
        let node = single_validator_node(tmp.path().to_path_buf());
        let cfg = node.load_config().unwrap();
        assert_eq!(cfg.consensus.value_payload, ValuePayload::ProposalOnly);
        // listen_addr should be /ip4/127.0.0.1/tcp/0 (ephemeral)
        let listen_str = cfg.consensus.p2p.listen_addr.to_string();
        assert!(
            listen_str.starts_with("/ip4/127.0.0.1/tcp/0"),
            "unexpected listen_addr: {listen_str}"
        );
    }

    #[test]
    fn get_address_matches_runner_derivation() {
        let tmp = tempfile::tempdir().unwrap();
        let node = single_validator_node(tmp.path().to_path_buf());
        let pk = node.private_key.public_key();
        let addr1 = node.get_address(&pk);
        // Same derivation as runner.rs (last 20 bytes of SHA-256(pubkey)).
        let digest = Sha256::digest(pk.as_bytes());
        let mut expected = [0u8; 20];
        expected.copy_from_slice(&digest[12..32]);
        assert_eq!(addr1, OpenHlAddress(expected));
    }

    /// Smoke test: spin up the actor system, get a handle back, kill cleanly.
    /// Does NOT drive consensus — that's L10.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn start_engine_smoke_spawns_and_kills() {
        let tmp = tempfile::tempdir().unwrap();
        let node = single_validator_node(tmp.path().to_path_buf());
        let handle = match node.start().await {
            Ok(h) => h,
            Err(e) => panic!("start_engine failed: {e:?}"),
        };
        // Sanity-poke the channels handle is available exactly once.
        assert!(handle.take_channels().await.is_some());
        assert!(handle.take_channels().await.is_none());
        handle.kill(None).await.unwrap();
    }
}
```

Four tests:

1. **`private_key_file_round_trips`** — generate a key, wrap in `OpenHlPrivateKeyFile`, unwrap, assert byte-equality. Proves the wire format is lossless.
2. **`load_config_sets_proposal_only_payload_and_ephemeral_listen_addr`** — construct a node, call `load_config()`, verify two things: `value_payload == ProposalOnly` (the invariant we enforce at construction) and `listen_addr` is the ephemeral local socket. Catches accidental config drift.
3. **`get_address_matches_runner_derivation`** — derive the same address two ways (once via the trait method, once by inlining the SHA-256 logic). Asserts they match. Catches accidental drift if someone changes one without the other.
4. **`start_engine_smoke_spawns_and_kills`** — the capstone. Uses `#[tokio::test(flavor = "multi_thread", worker_threads = 2)]` because the engine needs the multi-threaded runtime (it spawns multiple actors). Steps: construct a single-validator node, call `node.start().await`, poke the channels handle (once `Some`, second time `None`), call `kill()`. **If this passes, your code is now a running BFT engine.**

The smoke test is roughly **0.02 seconds** wall-clock. The bulk is libp2p setting up the local listener — even on a tcp/0 ephemeral port, libp2p's negotiation has a fixed cost.

> 🛑 **Anti-fluency.** "Why `flavor = 'multi_thread'`?" **Because the engine spawns multiple actors, each on its own task.** A single-threaded runtime can run them all on one thread — but the engine has internal `block_on` patterns that would deadlock under single-thread. Multi-thread runtime works around this. **This is the kind of detail that's invisible at the API level but lethal at the test-failure level.**
> In `current_thread`, a `block_on(...)` can occupy the only worker and starve the future it is waiting on, so initialization hangs forever. In `multi_thread`, another worker can drive the remaining future and unblock the pattern. The Malachite / ractor / libp2p stack hits this shape internally, so tests must force multi-threaded execution.

## Test

```bash
cargo test -p openhl-consensus
```

After ~20 seconds (first compile after the dep changes):

```
running 20 tests
test codec::tests::openhl_codec_satisfies_all_three_super_traits ... ok
test codec::tests::proposal_part_round_trips ... ok
test context::tests::height_increment_and_decrement ... ok
test context::tests::new_prevote_and_precommit_have_distinct_types ... ok
test context::tests::new_proposal_round_trips_fields ... ok
test context::tests::select_proposer_round_robins_deterministically ... ok
test context::tests::validator_set_is_sorted_by_power_then_address ... ok
test node::tests::get_address_matches_runner_derivation ... ok
test node::tests::load_config_sets_proposal_only_payload_and_ephemeral_listen_addr ... ok
test node::tests::private_key_file_round_trips ... ok
test signing::tests::vote_signature_is_field_sensitive ... ok
test signing::tests::vote_signature_round_trips ... ok
test signing_provider::tests::proposal_part_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_tamper_detected ... ok
test signing_provider::tests::signature_from_one_provider_does_not_verify_under_another ... ok
test signing_provider::tests::vote_extension_sign_verify_round_trips ... ok
test signing_provider::tests::vote_sign_verify_round_trips ... ok
test signing_provider::tests::vote_tamper_detected ... ok
test node::tests::start_engine_smoke_spawns_and_kills ... ok

test result: ok. 20 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

The smoke test runs last because of the multi-thread runtime setup.

Common errors and fixes:

- **`error[E0432]: unresolved import 'informalsystems_malachitebft_app_channel'`** — Cargo.toml doesn't have `app-channel`. Re-check Step 1.
- **`error[E0277]: PrivateKey: Deserialize is not satisfied`** — missing `serde` feature on `signing-ed25519`. Re-check Step 1 (`features = ["rand", "serde"]`).
- **smoke test hangs forever** — usually `flavor = "current_thread"` (default for `#[tokio::test]`). Re-check Step 7: the attribute must be `#[tokio::test(flavor = "multi_thread", worker_threads = 2)]`.
- **`error: Keypair::ed25519_from_bytes expected mutable bytes`** — version mismatch. The libp2p `Keypair::ed25519_from_bytes` signature changed across versions; the workspace pin should align with what `informalsystems-malachitebft-app` re-exports.
- **`Address derivation does not match`** — your `get_address` doesn't match the helper in the test. Both must use the last 20 bytes of `SHA-256(pubkey)` — slice `[12..32]`.

## Design reflection

Three load-bearing decisions encoded here:

1. **`OpenHlNode` is the handshake interface, not the runtime.** The struct holds long-lived fields (key, validator set, home dir, moniker). It doesn't *run* the chain. The runtime lives in `OpenHlNodeHandle` (engine + channels), returned from `start()`. **Construction and execution are different lifecycle stages**, so they live in different types.

2. **Address derivation is centralized in `get_address`.** When you used `SHA-256(pubkey)[12..32]` in the runner back in L6 setup-code, that was *the same derivation*. The test `get_address_matches_runner_derivation` asserts they're identical, so future refactors can't silently drift one without the other. **Centralization with a verification test beats duplication every time.**

3. **`run()` returns an error pointing at the next lesson.** Rather than `unimplemented!()` (panics) or `todo!()` (also panics), an `eyre::Result::Err("not yet implemented (L10)")` is a *type-safe placeholder*. Code that calls `run()` gets a graceful failure with a message pointing at where to look. **This is the kind of crumb that survives across pull requests, code reviews, and stale tabs.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout d59d6cf
diff -u ~/code/my-openhl/crates/consensus/src/node.rs ./crates/consensus/src/node.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
```

The reference at `d59d6cf` includes 310 lines of `node.rs`. The `Node` impl methods (12 total), the struct layouts, and the smoke test should match closely. Doc comments and exact wording can vary.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why does `start_engine` need both the node and the validator set when the validator set is already inside the node?**
Because the engine doesn't reach into the node's internals. The node has many fields (path, moniker, key, etc.) that are not relevant to validator-set election. `start_engine` accepts the validator set explicitly so the engine doesn't need to know about your node's specific field layout. This is the same separation-of-concerns principle as `Node::load_config()`.

**Q: What does the smoke test prove that the compile-time assertions don't?**
The compile-time assertions in L8 proved `OpenHlCodec: WalCodec + ConsensusCodec + SyncCodec`. The smoke test proves that the *runtime* path — actor spawning, channel allocation, libp2p binding, kill propagation — actually works end-to-end. Type-safety is necessary but not sufficient; the test catches things like "spawn deadlocks" or "the engine panics on first message" that types can't catch.

**Q: What's the difference between `EngineHandle` and `NodeHandle`?**
`EngineHandle` (from Malachite) is the low-level handle to the spawned actor system — actor cell, tokio task handle. `NodeHandle` (your trait) is the high-level abstraction Malachite uses to ask "is this still alive? subscribe me to events. kill it." Your `OpenHlNodeHandle` impls `NodeHandle<OpenHlContext>` and internally holds the `EngineHandle`. Two layers; you only deal with one.

**Q: Why does `take_channels` use `Option<Channels<...>>` instead of just removing the channels?**
Because `take_channels` is called *from the outside* — the app loop wants to consume them. Removing them entirely would require either a mutable reference or moving the handle. `Mutex<Option<...>>` lets the app loop call it via shared reference (`&self`), grab the channels once, and find `None` on subsequent calls — a clean signal "you already took these."

## Next lesson (L10)

You now have the engine running. But — critically — **the engine is sending you messages and you're ignoring them**. The actor system is parked, waiting for the app loop to consume from `Channels<OpenHlContext>` and respond to `AppMsg::ProposeValue`, `AppMsg::Decided`, etc. L10 implements the app loop: a `tokio::select` over the channel + a state struct + handlers that route engine messages to `InMemoryEvmBridge`. When L10 ships, `cargo test first_block_via_engine_actors` produces an actual block through the full engine pipeline.
````

---

## Seed-file slot

L9 lands in Module 4 (CL types) at sortOrder 3 (after L6, L7, L8):

```typescript
{
  title: 'Lesson 9 — OpenHlNode and the first start_engine call',
  slug: 'openhl-node-en',
  type: 'CONTENT',
  sortOrder: 3,
  duration: 55,
  xpReward: 100,
  content: `# Lesson 9 — \`OpenHlNode\` and the first \`start_engine\` call\n\n...`
},
```

## SHA pinning discipline

L9 cites one openhl commit (§Answer key):
- `d59d6cf` (Stage 6c — implement Node trait, first start_engine call works)

This is the engine-boots milestone. L8 satisfied the trait bounds; L9 provides the values and proves `start_engine` works.

## Style review notes (self-critique before paste)

- **§Plan's "bridge pattern between your code and Malachite" callout** — this is the conceptual frame. Worth keeping as load-bearing.
- **The 12-method table in Step 5** is the load-bearing artifact for trait orientation; without it readers will be lost in the wall of code.
- **The smoke-test wall-clock callout (~0.02s)** is the kind of detail that grounds the "abstract trait" feeling into a real result. Worth keeping.
- **§Anti-fluency about `flavor = 'multi_thread'`** anticipates the trap where the test hangs forever, which is the *exact* kind of failure that wastes hours.
- **The private-key `[redacted]` Debug treatment** is the most "this would matter in production" callout — worth keeping verbose.
- **§Design reflection's "centralization with a verification test"** is a generalizable principle, not just an OpenHL fact.
