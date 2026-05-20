# Building OpenHL — L1 draft (EN) — C2 build-along rewrite

> Drafted against openhl SHAs `75be9de` (Stage 1: workspace bootstrap) and `5fc7ca1` (Stage 2+3: Reth and Malachite pinned). This is the **first build-along lesson** — the reader writes the workspace skeleton from scratch.
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10).

---

## L1 — `openhl-workspace-en`

- **Module:** 1 (Foundations), sortOrder 0 within module
- **Course-level sortOrder:** 0 (lesson 1 of 15)
- **Duration:** 45 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# Lesson 1 — Workspace + Reth + Malachite (Stages 1-3)

## Goal

Concepts you'll grasp in this lesson:

- **Dependency-graph-first workflow** — why getting Reth + Malachite to coexist *before* writing any application code prevents mid-course backtracking when transitive conflicts surface.
- **Workspace-level dep declaration** — declaring every external dep once at the root `Cargo.toml` and inheriting via `{ workspace = true }`, so a Reth version bump is a one-line change instead of an 11-crate sweep.
- **Git-SHA pinning vs. crates.io** — why production L1s pin Reth and Malachite to commit SHAs, not semver ranges; absolute reproducibility beats convenience when validators must agree byte-for-byte.
- **The 10-crate + 1-bin layout** — how OpenHL's 5 subsystems (types, codec, clob, consensus, evm, …) map onto a flat `crates/` directory plus one `bin/openhl` entry point.

Verification:

```bash
cargo check --workspace
```

…run from your `~/code/my-openhl/` directory, returns `Finished` with no warnings other than "unused dependency" warnings. **You will have written zero application logic** — that's L2 onwards.

The Reth compile graph alone is ~600 crates. The first `cargo check` will take 5-15 minutes depending on your machine. Plan accordingly. Subsequent checks are incremental and fast.

Specific changes:

- 10 empty library crates and one binary crate scaffolded under `crates/` and `bin/openhl/`.
- Root `Cargo.toml` declares `members`, workspace defaults, and `[workspace.dependencies]`.
- Reth pinned as a git dependency at a specific SHA, declared at the workspace level.
- Malachite pinned the same way.

## Recap

You ran the L0 setup. You have:

- `~/code/my-openhl/` — your workspace, currently a default `cargo init --lib` artifact
- `~/code/openhl-reference/` — `psyto/openhl` cloned, `cargo check` passing

This lesson edits files in `~/code/my-openhl/`. **Never** touch `openhl-reference/`.

## Plan

You'll do three things, in order:

1. **Stage 1** — replace the default `cargo init --lib` output with a real workspace: 10 empty library crates, 1 binary crate, top-level `Cargo.toml` declaring all the workspace defaults. **Test**: `cargo check --workspace` succeeds with no external dependencies.
2. **Stage 2** — pin Reth as a git dependency at a specific SHA, declared at the workspace level. **Test**: `cargo check --workspace` still succeeds (no crate uses Reth yet — we just verify the dep resolves).
3. **Stage 3** — pin Malachite the same way. **Test**: `cargo check --workspace` still succeeds.

Each stage is a real commit in `psyto/openhl`: `75be9de`, then `5fc7ca1`.

The reason we set up the dep graph before writing application code: dependency resolution is the most common source of friction in a Rust workspace. Getting Reth + Malachite to compile cleanly together is non-trivial — they're both big crates with deep transitive dep trees. **If we deferred this to "later," we'd discover the conflicts in the middle of writing application code and have to backtrack.** Getting the deps right first means every subsequent lesson focuses on the lesson's actual topic, not yak-shaving dependencies.

> 🛑 **Predict.** Before you scroll, sketch: how many `members` should the workspace Cargo.toml have, and what should they be? Hint: 10 library crates + 1 binary crate. You learned the 5 subsystems in L0 §3; what 10 crates implement them? (Look at L0 §4 if you need to.)

## Walk-through

### Step 1: Reset `~/code/my-openhl/`

The L0 setup left a default cargo project there. We need to wipe it and start fresh:

```bash
cd ~/code/my-openhl
rm Cargo.toml Cargo.lock src/lib.rs
rmdir src
```

You should now have only `.git/` (from the initial cargo init) and nothing else visible:

```bash
ls -la
# .  ..  .git
```

### Step 2: Write the top-level workspace Cargo.toml

Create `Cargo.toml` at the root with this content. Type it; don't copy from the reference. Pay attention to each section.

```toml
[workspace]
resolver = "3"
members = [
    "bin/openhl",
    "crates/types",
    "crates/codec",
    "crates/clob",
    "crates/oracle",
    "crates/funding",
    "crates/liquidation",
    "crates/vault",
    "crates/evm",
    "crates/consensus",
    "crates/node",
]

[workspace.package]
version      = "0.1.0"
edition      = "2024"
rust-version = "1.95"
license      = "MIT OR Apache-2.0"
repository   = "https://github.com/yourusername/my-openhl"
authors      = ["Your Name <you@example.com>"]

[workspace.dependencies]
# --- Internal crates ---
openhl-types       = { path = "crates/types" }
openhl-codec       = { path = "crates/codec" }
openhl-clob        = { path = "crates/clob" }
openhl-oracle      = { path = "crates/oracle" }
openhl-funding     = { path = "crates/funding" }
openhl-liquidation = { path = "crates/liquidation" }
openhl-vault       = { path = "crates/vault" }
openhl-evm         = { path = "crates/evm" }
openhl-consensus   = { path = "crates/consensus" }
openhl-node        = { path = "crates/node" }

# --- Reth and Malachite — added in Steps 7 and 8 below ---

# --- Shared utilities ---
tokio              = { version = "1", features = ["full"] }
async-trait        = "0.1"
serde              = { version = "1", features = ["derive"] }
serde_json         = "1"
thiserror          = "1"
eyre               = "0.6"
tracing            = "0.1"
proptest           = "1"

[workspace.lints.rust]
unsafe_code                   = "forbid"
missing_debug_implementations = "warn"
unreachable_pub               = "warn"
rust_2018_idioms              = { level = "warn", priority = -1 }

[workspace.lints.clippy]
all      = { level = "warn", priority = -1 }
pedantic = { level = "warn", priority = -1 }
module_name_repetitions = "allow"
must_use_candidate      = "allow"
missing_errors_doc      = "allow"
missing_panics_doc      = "allow"

[profile.release]
opt-level     = 3
lto           = "fat"
codegen-units = 1
strip         = "symbols"
debug         = false
panic         = "abort"

[profile.dev]
opt-level = 1
debug     = true

[profile.dev.package."*"]
opt-level = 3
```

**Three load-bearing choices in this file:**

1. **`resolver = "3"`**. The Cargo dep resolver version. Resolver 3 (the default in Rust 2024 edition) handles feature unification more strictly. Reth and Malachite both have complex feature flags; resolver 3 avoids subtle issues.
2. **`unsafe_code = "forbid"` at the workspace level**. This forbids `unsafe` in every member crate. Reth depends on `unsafe` internally; we don't. Forbidding it at the application layer is the determinism rail from L0 §4 — if a pure state-machine crate ever wants `unsafe`, that's a code review smell.
3. **`pedantic = "warn"` (clippy)**. Pedantic clippy lints catch a lot of subtle stuff. Some are noisy, hence the `module_name_repetitions`/etc. allowances at the bottom. Setting pedantic-warn up front means every commit lands clippy-clean.

### Step 3: Add `rust-toolchain.toml` at the root

Create `rust-toolchain.toml`:

```toml
[toolchain]
channel    = "1.95.0"
components = ["clippy", "rustfmt"]
profile    = "minimal"
```

This pins the Rust version. When the reader (or CI) runs `cargo`, the toolchain is fetched and used automatically. Without this, different machines could build with different rustc versions and produce different artifacts — a determinism risk we don't want.

### Step 4: Create the first library crate (`crates/types`) as a template

We'll create one crate end-to-end, then replicate the pattern.

```bash
mkdir -p crates/types/src
```

Create `crates/types/Cargo.toml`:

```toml
[package]
name         = "openhl-types"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]
serde = { workspace = true }

[lints]
workspace = true
```

Create `crates/types/src/lib.rs`:

```rust
//! Shared primitives and CL/EL contract types.
```

That's it. The crate is empty other than a module doc comment. Subsequent lessons fill it in.

**Why `version = { workspace = true }` etc.?** This inherits from `[workspace.package]` in the root Cargo.toml. Every member crate has identical metadata — versioning, edition, license. Inheriting via `workspace = true` means a one-line bump to the workspace gets propagated. The alternative (per-crate `version = "0.1.0"`) duplicates 6 lines into 11 crates and is easy to drift out of sync.

### Step 5: Create the other 9 library crates

The pattern is the same as `crates/types`. For each, create:

- `crates/<name>/Cargo.toml` (same shape, only `name` field differs)
- `crates/<name>/src/lib.rs` (empty other than doc comment)

The 9 remaining crates and their doc comments:

| Crate | `name` | `lib.rs` doc comment |
| - | - | - |
| codec | `openhl-codec` | `//! Canonical encoding for consensus messages.` |
| clob | `openhl-clob` | `//! CLOB matching engine — pure state machine.` |
| oracle | `openhl-oracle` | `//! Mark price aggregation.` |
| funding | `openhl-funding` | `//! Funding-rate calculation and settlement.` |
| liquidation | `openhl-liquidation` | `//! Liquidation engine.` |
| vault | `openhl-vault` | `//! Protocol-native vault primitive.` |
| evm | `openhl-evm` | `//! EVM execution layer — Reth integration.` |
| consensus | `openhl-consensus` | `//! Consensus layer — Malachite BFT.` |
| node | `openhl-node` | `//! Node assembly: consensus + evm + clob.` |

For `clob`, `oracle`, `funding`, `liquidation`, `vault`, `node`: the `[dependencies]` section can be empty (`[dependencies]` line followed by a blank `[lints]` block). For `codec`, `evm`, `consensus`: also empty initially — the actual dependencies land in later lessons when we write code that uses them.

> 🛑 **Anti-fluency.** "Why not write all dependencies up front and avoid edits later?" **No.** A crate with an unused dependency is technical debt: it slows builds, confuses readers, and invites version conflicts. Add dependencies exactly when the code that needs them lands. The workspace `Cargo.toml` declares the *available* dependencies; each crate's `Cargo.toml` declares the *used* ones.

### Step 6: Create `bin/openhl`

The binary crate. It does nothing yet — just proves the workspace compiles.

```bash
mkdir -p bin/openhl/src
```

Create `bin/openhl/Cargo.toml`:

```toml
[package]
name         = "openhl"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[[bin]]
name = "openhl"
path = "src/main.rs"

[dependencies]

[lints]
workspace = true
```

Create `bin/openhl/src/main.rs`:

```rust
fn main() {
    println!("openhl v{}", env!("CARGO_PKG_VERSION"));
}
```

The `[[bin]]` section names the binary `openhl` and points it at `src/main.rs`. The `env!("CARGO_PKG_VERSION")` macro inlines the package version from `Cargo.toml` at compile time — useful for `openhl --version` later.

### Step 7: First `cargo check`

```bash
cd ~/code/my-openhl
cargo check --workspace
```

Expected output:

```
   Compiling openhl-types v0.1.0
   Compiling openhl-codec v0.1.0
   ...(all 10 crates plus openhl bin)...
    Finished `dev` profile
```

Some `unused_imports` warnings are OK (we declared `serde` as a workspace dep but most crates don't use it yet). Hard errors are NOT OK — if you see one, the most common causes are:

- **Typo in a crate name in workspace.members or in a per-crate Cargo.toml.** Cargo will name the missing crate; fix the typo.
- **Missing `src/lib.rs` for a library crate.** Each crate listed in workspace.members must have either `src/lib.rs` or `src/main.rs`.
- **`[lints]` block but no `workspace = true` inside.** Each crate's `[lints]` must say `workspace = true` to inherit.

Resolve any errors before moving to Step 8.

### Step 8: Pin Reth as a workspace dependency

Edit the workspace `Cargo.toml`. Find the line:

```toml
# --- Reth and Malachite — added in Steps 7 and 8 below ---
```

Replace it with:

```toml
# --- Reth (pinned to v2.2.0 release tag) ---
# Bump in a dedicated PR. Always pin to a release-tag SHA, never main HEAD.
reth-node-builder         = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-ethereum        = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-core            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-tasks                = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-chainspec            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-evm                  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-primitives  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-engine-primitives    = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-primitives   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-consensus            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-consensus   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-primitives-traits    = "0.3"
alloy-primitives          = { version = "1.5", default-features = false }
alloy-consensus           = { version = "2.0", default-features = false }
alloy-genesis             = { version = "2.0", default-features = false }
alloy-evm                 = { version = "0.34", default-features = false }
alloy-rlp                 = { version = "0.3", default-features = false }
```

**Why this many Reth crates?** Reth is a multi-crate codebase. Different parts (the node builder, the EVM, the storage API, the consensus hook) live in different crates. We declare all the ones our later lessons will use at the workspace level so each consuming crate just references `reth-xxx = { workspace = true }` later.

**Why pin to a SHA?** Reth has frequent breaking changes. Pinning to a release tag's SHA (here `88505c7f...` = v2.2.0) gives us a stable target. If we used `version = "2.2"` or a branch, our build could break when Reth releases an unrelated change.

**Why pin to a release-tag SHA, not main HEAD?** Main HEAD can be broken at any moment. Release tags are tested and stable. The comment in the file (`# Bump in a dedicated PR. Always pin to a release-tag SHA, never main HEAD.`) is a process discipline note for future bumps.

> 🛑 **Predict.** What happens to `cargo check --workspace` when you run it now? Pick one before scrolling:
> - (a) Same as before — no change since no crate uses any Reth dep yet
> - (b) Massively slower the first time — fetches and compiles ~600 transitive Reth deps
> - (c) Errors out — Reth needs explicit configuration we haven't provided

The answer is (b). Cargo's `workspace.dependencies` declarations cause **resolution** but not **compilation** of unused deps. However, `cargo check` does walk the dep graph and fetch the git source. That's the 5-15 minute first-run cost. The good news: subsequent runs use the cached source.

Run it:

```bash
cargo check --workspace
```

Go make coffee. Come back. You should see:

```
    Updating git repository `https://github.com/paradigmxyz/reth`
    Updating crates.io index
...(lots of "Downloading" and "Compiling" lines)...
    Finished `dev` profile [optimized + debuginfo] target(s) in 14m 23s
```

If it errors, the most common causes:

- **alloy version conflict.** If you copy the workspace.deps block above but already have an older `alloy-primitives = "0.x"` declared, Cargo can't unify. Solution: bump all alloy versions to match `1.5` / `2.0` as shown.
- **rustc version too old.** Reth v2.2.0 needs rustc 1.93+. The `rust-toolchain.toml` should have pinned `1.95.0` — verify with `rustc --version`.
- **Network failure fetching git deps.** Re-run. Cargo's git fetch is occasionally flaky.

### Step 9: Pin Malachite as a workspace dependency

Append to the `[workspace.dependencies]` section:

```toml
# --- Malachite BFT (pinned to v0.5.0 release tag) ---
# Note: crate names in the malachite repo are prefixed `informalsystems-malachitebft-*`.
informalsystems-malachitebft-core-types      = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-core-consensus  = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-core-driver     = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55", features = ["std"] }
informalsystems-malachitebft-engine          = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-app             = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-app-channel     = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-config          = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-codec           = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-signing-ed25519 = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
```

**Crate-name oddity.** Malachite's repo (`informalsystems/malachite`) publishes its crates under the prefix `informalsystems-malachitebft-*`. We use the full prefixed names in Cargo.toml. In Rust source code we'll use `informalsystems_malachitebft_core_types::Context` (snake_case rename). The comment in the file documents this.

**`features = ["std"]` on core-driver.** The driver crate has a `std` feature gate. We need standard library facilities (BTreeMap, HashMap, etc.), so we enable it explicitly. Other Malachite crates default to `std`, so no explicit feature is needed.

Run cargo check again:

```bash
cargo check --workspace
```

This time the incremental Reth cache means only Malachite needs fetching/compiling. ~2-5 minutes typically.

## Test

After Step 9 finishes successfully:

```bash
cargo check --workspace 2>&1 | tail -5
```

Expected (the exact "x warnings" count and timing may differ):

```
    Finished `dev` profile [optimized + debuginfo] target(s) in 23.45s
```

You can also try:

```bash
cargo build --bin openhl
./target/debug/openhl
```

Expected:

```
openhl v0.1.0
```

That's L1 done.

## Design reflection

Two load-bearing decisions you just encoded:

1. **All external deps are declared at the workspace level**, not per-crate. Per-crate Cargo.toml entries say `reth-storage-api = { workspace = true }`, inheriting the version. This means a Reth version bump is a one-line change. The alternative (each crate declaring its own version) would cause every Cargo.toml in 11 crates to drift.

2. **Reth and Malachite are git deps, not crates.io deps.** Both projects publish to crates.io, but with significantly different versioning cadence. Pinning to a specific commit SHA in the workspace is a deliberate trade-off: more friction for bumps, but absolute reproducibility. Production L1s pin like this for the same reason — you don't want your validators desyncing because two of them happened to fetch a different "0.5.x" patch from crates.io.

These two decisions propagate: every later lesson assumes them. When you add `reth-storage-api = { workspace = true }` to a crate's `[dependencies]` in L11, Cargo finds the workspace-level pin and resolves correctly without you thinking about it.

## Answer key

Compare your workspace state to `psyto/openhl` at the Stage 2+3 commit:

```bash
cd ~/code/openhl-reference
git checkout 5fc7ca1
diff -ru ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -ru ~/code/my-openhl/crates/types ./crates/types
diff -ru ~/code/my-openhl/bin/openhl ./bin/openhl
```

Differences in `authors`, `repository`, and comment wording are fine. Differences in `members`, `workspace.dependencies` pin SHAs, `[workspace.lints]`, or profiles are not — re-read whichever step you skimmed.

Return to main when you're done diffing:

```bash
git checkout main
```

## Common questions

**Q: Should I commit my work to git?** Yes. Initialize git in `~/code/my-openhl/` and commit after each step or each lesson. The commit log becomes your own personal Stage history.

```bash
cd ~/code/my-openhl
git init  # if you haven't
git add .
git commit -m "L1 — workspace + Reth + Malachite pinned"
```

**Q: Why so many "unused dependency" warnings?** Because each member crate's `[dependencies]` section is mostly empty. We declared deps at the workspace level so they're *available*, but no crate has `[dependencies]` populated yet. As lessons progress, crates pull in their needed deps and the warnings drop.

**Q: My machine ran out of disk space.** The Reth + Malachite source trees plus their target/ cache can easily reach 10-15 GB. Add disk or move target/ to an external drive via `[build] target-dir = ...` in `.cargo/config.toml`.

**Q: Can I parallelize fetching deps?** Cargo does this automatically. The "Updating git repository" steps run sequentially because each one writes to the same git cache. The "Compiling" steps fan out across cores. If yours is slow, check `cargo build -j $(nproc)`.

## Next lesson (L2)

You have a workspace that compiles. No application logic yet. In L2 we write the first application code — `openhl-types`'s `BlockHash`, `PayloadId`, `PayloadAttrs`, `ExecutedBlock`, and `PayloadStatus`. These are the **shared vocabulary** of the consensus↔EVM contract. After L2, the contract types compile and have basic tests. Then L3 writes the trait that uses them.
````

---

## Seed-file slot

L1 lands in Module 1 (Foundations) at sortOrder 0:

```typescript
{
  title: 'Lesson 1 — Workspace + Reth + Malachite (Stages 1-3)',
  slug: 'openhl-workspace-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 45,
  xpReward: 80,
  content: `# Lesson 1 — Workspace + Reth + Malachite (Stages 1-3)\n\n...`
},
```

## SHA pinning discipline

L1 references two openhl commits in §Answer key:
- `75be9de` (Stage 1: bootstrap workspace)
- `5fc7ca1` (Stage 2+3: pin Reth and Malachite)

These SHAs may change if the openhl repo is rebased/squashed; if they do, this lesson's §Answer key needs an update. Otherwise the content is independent of openhl line-level changes.

## Style review notes (self-critique before paste)

- **L1 is 45 min — longer than L0**. Justified because reader actually types code (~150 lines of TOML), waits 10-15 min for first `cargo check`, and reads multiple "why this choice" subsections. The 80 XP reflects this weight.
- **The "predict" callout in §Plan** (sketch which 10 crates) is the first time the reader's L0 knowledge gets tested. If the reader can't recall, L0 §3-§4 is the answer.
- **The "anti-fluency" callout in §5** ("why not declare all deps up front") is a real beginner trap. Junior Rust devs frequently over-declare dependencies because they think it's helpful. Don't soften this.
- **The "first cargo check takes 5-15 min" warning** is essential — without it the reader thinks the command is hung and aborts. Set expectations early.
- **The "what to expect when it errors" section in Step 7** covers the 3 most common bootstrap mistakes. If a reviewer says "what about X?" and X isn't there, add it — these are the points where the lesson loses readers.
- **Step 5 leaves 9 crates as exercise** — show the pattern with `types`, list the rest as a table. This is a deliberate choice to keep the lesson length manageable. Junior readers may want all 10 walked; intermediates will find that boring.
- **No JA mirror yet at first paste.** Translation pass next.
