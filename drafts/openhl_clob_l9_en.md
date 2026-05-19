# Building OpenHL CLOB — L9 draft (EN) — build-along

> Drafted against openhl SHA `428cc26` (Stage 8d — CLOB fills flow into bridge payloads).
> Course: `building-openhl-clob-en` (track: `reth-l1-architect`).

---

## L9 — `openhl-clob-bridge-fields-en`

- **Module:** 4 (Bridge integration), sortOrder 0 within module
- **Course-level sortOrder:** 8 (lesson 9 of 12)
- **Duration:** 40 min
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# Lesson 9 — `LiveRethEvmBridge` gets a CLOB + `submit_order`

## Goal

By the end of this lesson:

```bash
cargo test -p openhl-evm --release
```

…still passes (38 tests from course 6 + 1 new test from L9). The bridge now **owns** a CLOB matching engine. You'll have written:

- **One new workspace dep** — `openhl-clob = { workspace = true }` in `crates/evm/Cargo.toml`.
- **Two new fields** on `LiveRethEvmBridge`: `clob: Mutex<Book>` and `pending_fills: Mutex<Vec<Fill>>`.
- **A wider pending tuple** — `pending: HashMap<u64, (B256, Header)>` becomes `HashMap<u64, (B256, Header, Vec<Fill>)>`. The third element is the per-payload fill list.
- **Three new methods** on the bridge: `submit_order(&self, order: Order) -> FillResult`, `payload_fills(id) -> Option<Vec<Fill>>` (inspection), `pending_fill_count() -> usize` (inspection).
- **Ripple updates** — destructuring on the pending tuple in `build_payload`, `payload_ready`, `validate_payload`, `commit` all need the 3-tuple pattern.

**`build_payload` doesn't drain `pending_fills` yet** — it inserts an empty `Vec<Fill>` for now. L10 makes the drain real. After L9 you can submit orders, see fills accumulate in `pending_fills`, but the bridge's payloads carry no fills. **L10 closes that gap; L11 writes the integration test that proves it.**

## Recap

After course 6 (L14) + course 7 L8, your workspace has:

```
crates/clob/                            — complete matching engine (L1-L8)
crates/evm/src/live_node.rs             — LiveRethEvmBridge<P>
  fields: provider, chain_spec, validator, engine_handle: Option<...>, state: Mutex<State>
  pending: HashMap<u64, (B256, Header)>
crates/consensus/                       — full BFT engine
```

`cargo test -p openhl-evm` passes 38 tests. **The CLOB exists, the bridge exists, but they don't know about each other.** L9 wires the bridge to the CLOB.

## Plan

Six things, all in `crates/evm/`:

1. **Add `openhl-clob = { workspace = true }`** to `crates/evm/Cargo.toml`'s `[dependencies]`.
2. **Add the import** to `crates/evm/src/live_node.rs`: `use openhl_clob::{Book, Fill, FillResult, Order};`.
3. **Add `clob` + `pending_fills` fields** to the `LiveRethEvmBridge<P>` struct.
4. **Change `pending` to a 3-tuple** in the `State` struct.
5. **Update `new()`** to initialize the new fields.
6. **Add three methods** to the `impl<P> LiveRethEvmBridge<P>` block: `submit_order`, `payload_fills`, `pending_fill_count`.
7. **Ripple-update the destructuring** in `build_payload`, `payload_ready`, `validate_payload`, `commit` to match the new 3-tuple shape. `build_payload` inserts an empty `Vec<Fill>` for now.

Step 7 sounds tedious but is mechanical: every place that wrote `(hash, header)` or `(h, _)` becomes `(hash, header, fills)` or `(h, _, _)`. The compiler tells you each location with a clear error.

> 🛑 **Predict.** Before scrolling: after L9 you can call `bridge.submit_order(order)` and see fills accumulate via `bridge.pending_fill_count()`. If you then call `bridge.build_payload(parent, attrs)`, what does `bridge.payload_fills(id)` return for the newly-built payload? Hint: read §Step 7 carefully.

(Answer: `Some(vec![])` — the empty fill list. L9 wires the data flow but `build_payload` still inserts an empty Vec instead of draining. L10's "drain on build" change is what turns this into `Some(vec![fill_a, fill_b, ...])`.)

## Walk-through

### Step 1: Add the dep to `crates/evm/Cargo.toml`

Open `crates/evm/Cargo.toml`. The current `[dependencies]` section (after course 6) has the various `openhl-types`, `reth-*`, `alloy-*` deps. Add one line:

```toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
openhl-clob              = { workspace = true }      # NEW
async-trait              = { workspace = true }
# ... rest unchanged ...
```

`openhl-clob` is already declared in the workspace `Cargo.toml` (you added the path entry in L1). The `[dependencies]` entry says "this specific crate uses it."

### Step 2: Add the import to `live_node.rs`

Open `crates/evm/src/live_node.rs`. The current imports include all the reth-related types. Add this line above the `openhl_consensus` import:

```rust
use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use alloy_rpc_types_engine::ForkchoiceState;
use async_trait::async_trait;
use openhl_clob::{Book, Fill, FillResult, Order};                     // NEW
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
// ... rest unchanged ...
```

Four types pulled in: `Book` (the matching engine), `Fill` (output), `FillResult` (the wrapper from `Book::submit`), `Order` (the input to submit).

Also update the module-level doc comment to acknowledge the new stage. Find the existing block of `//! Stage 7X` comments at the top of the file:

```rust
//! Stage 7a: parent lookups go through the live node's provider via the
//! `BlockNumReader` trait.
//!
//! Stage 7c: `validate_payload` runs Reth's `EthBeaconConsensus::
//! validate_header_against_parent` against the live parent ...
//!
//! Stage 7d: `commit` now sends a `ForkchoiceUpdated` to Reth's in-process
//! consensus engine ...
```

…and insert a new Stage 8d block somewhere reasonable (between 7c and 7d is fine):

```rust
//! Stage 8d: the bridge now owns a CLOB matching engine. `submit_order` routes
//! orders into the book and accumulates resulting fills in `pending_fills`.
//! `build_payload` drains the pending fills and stores them alongside the
//! synthesized header, so the payload carries real CLOB-generated content.
//! Fills are not yet encoded as EVM transactions executable by Reth's
//! `BlockExecutor` — that's the next stage (or Module 3). 8d proves the
//! wiring exists; encoding is downstream.
```

This is meta-documentation — when someone reads the file 6 months from now, the staging comments are the map.

### Step 3: Add fields to `LiveRethEvmBridge`

Find the struct definition. Add two fields between `validator` and `state`:

```rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Mutex<Book>,                                            // NEW
    pending_fills: Mutex<Vec<Fill>>,                              // NEW
    engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>,
    state: Mutex<State>,
}
```

Two `Mutex`-wrapped fields. Why both `Mutex`?

- **`clob: Mutex<Book>`** — the matching engine. `Book` itself is not thread-safe internally; wrapping in `Mutex` lets multiple callers submit orders concurrently (the bridge will be shared via `Arc<LiveRethEvmBridge>` once integrated into the engine app loop).
- **`pending_fills: Mutex<Vec<Fill>>`** — the buffer where `submit_order` pushes fills and `build_payload` (in L10) drains them. Separate `Mutex` from `clob` because the two mutate at different times: a submit holds `clob`'s lock briefly to do matching, then briefly holds `pending_fills`'s lock to append. A separate lock means two submits don't serialize through the full submit → push chain.

> 🛑 **Anti-fluency.** "Why two `Mutex`es instead of one `Mutex<(Book, Vec<Fill>)>`?" **Lock granularity.** One mutex around both means every submit holds the lock for both the matching work AND the fill-buffer mutation. Future code that reads `pending_fill_count` without submitting (e.g., L10's `build_payload` drain, debugging tools) would block on submits-in-progress. Two mutexes let reads bypass write contention. **The cost is a few extra `Mutex::new` calls; the benefit is better concurrent throughput.**

### Step 4: Change the `pending` tuple

Find the `State` struct definition:

```rust
#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, (B256, Header)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}
```

Change `pending`'s value type to a 3-tuple, with the third element being `Vec<Fill>`:

```rust
#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    /// Pending payloads keyed by `PayloadId.0`. Value is (`block_hash`, `header`,
    /// fills drained from the CLOB at `build_payload` time).
    pending: HashMap<u64, (B256, Header, Vec<Fill>)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}
```

`chain` stays as `HashMap<B256, Header>` because committed blocks don't need to track their fills here — the fills are downstream of commit. (Production code would persist fills somewhere; that's beyond this course.)

**The new doc comment is part of the lesson.** It explains *why* the third element exists — the data flow from `submit_order` → `pending_fills` → `build_payload` drains → per-payload `Vec<Fill>` in `pending` map.

### Step 5: Update `new()`

The current `new()` initializes 4 fields. After the changes, it initializes 6. Update:

```rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            clob: Mutex::new(Book::new()),                        // NEW
            pending_fills: Mutex::new(Vec::new()),                // NEW
            engine_handle: None,
            state: Mutex::new(State::default()),
        }
    }
```

Two new field initializations. `Book::new()` from L3's helper (workspaces are wired so `openhl_clob::Book::new()` is callable here). `Vec::new()` for the empty fill buffer.

### Step 6: Add the three new methods

Below `new()` (or after `chain_spec()` if you prefer grouping pub methods together), add:

```rust
    /// Submit an order to the CLOB. Resulting fills are buffered in
    /// `pending_fills` until the next `build_payload` drains them.
    pub fn submit_order(&self, order: Order) -> FillResult {
        let mut book = self.clob.lock().expect("clob mutex poisoned");
        let result = book.submit(order);
        if !result.fills.is_empty() {
            self.pending_fills
                .lock()
                .expect("pending_fills mutex poisoned")
                .extend(result.fills.iter().copied());
        }
        result
    }

    /// Inspect (read-only) the fills attached to a built payload. Returns
    /// `None` if the payload id is unknown. Production code would encode
    /// these as EVM-executable transactions before they reach the block
    /// body; v0 keeps them as a parallel list for test inspection.
    #[must_use]
    pub fn payload_fills(&self, id: PayloadId) -> Option<Vec<Fill>> {
        let s = self.state.lock().expect("state mutex poisoned");
        s.pending.get(&id.0).map(|(_, _, fills)| fills.clone())
    }

    /// Number of fills currently buffered, waiting for the next `build_payload`.
    #[must_use]
    pub fn pending_fill_count(&self) -> usize {
        self.pending_fills
            .lock()
            .expect("pending_fills mutex poisoned")
            .len()
    }
```

Three methods, three intents:

- **`submit_order`** — the **write** path. Takes `&self` (not `&mut self`) because internal mutability via `Mutex` lets shared references mutate the bridge. Locks `clob`, calls `book.submit`, gets back a `FillResult`. If any fills were produced, locks `pending_fills` and appends them. Returns the `FillResult` so the caller knows what happened.
- **`payload_fills`** — the **inspection** path. Returns `Option<Vec<Fill>>` for a given `PayloadId`. `None` if the id isn't in pending; `Some(vec)` (possibly empty) if it is. The doc comment is explicit that this is a test-and-debug method — production code would route fills through a transaction-encoding pipeline.
- **`pending_fill_count`** — a small debugging helper. How many fills are sitting in the buffer waiting to be drained. Useful for tests like "submit two orders that cross, expect count == 1."

Notice all three methods take `&self`. The internal `Mutex`es do the heavy lifting; the public API is "shared reference + interior mutability," which is exactly what async code needs (multiple async tasks can hold `&LiveRethEvmBridge` concurrently).

> 🛑 **Anti-fluency.** "Why does `submit_order` take `&self` instead of `&mut self`?" **Because the bridge needs to be shared across async tasks that all want to submit orders concurrently.** The matching engine (the actual code that mutates) is behind a `Mutex`, which Rust's borrow checker accepts as "this mutation is safe because the mutex enforces exclusion." If `submit_order` took `&mut self`, you'd need an `Arc<RwLock<LiveRethEvmBridge>>` and every submit would lock the entire bridge — worse performance and weirder API. **Interior mutability is the right tool when shared concurrent access is the use case.**

### Step 7: Ripple-update the destructuring

This is the tedious-but-mechanical part. The pending tuple is now 3 elements; every place that pattern-matches on it needs to know. Five sites total:

**Site 1: `build_payload`** — search for `s.pending.insert(id, ...)`. Currently:

```rust
let hash = header.hash_slow();
s.pending.insert(id, (hash, header));
Ok(PayloadId(id))
```

Change to:

```rust
let hash = header.hash_slow();
s.pending.insert(id, (hash, header, Vec::new()));    // empty Vec<Fill> for now; L10 drains pending_fills here
Ok(PayloadId(id))
```

**`Vec::new()` is the placeholder.** L10 replaces it with `std::mem::take(&mut *self.pending_fills.lock()...)`.

**Site 2: `payload_ready`** — search for `s.pending.get(&n).cloned()`. Currently:

```rust
let (hash, header) = s
    .pending
    .get(&n)
    .cloned()
    .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
```

Update the destructuring:

```rust
let (hash, header, _fills) = s
    .pending
    .get(&n)
    .cloned()
    .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
```

The `_fills` binding catches the new third element but doesn't use it — `payload_ready` returns an `ExecutedBlock`, which doesn't need the fills directly. The `_` prefix tells the compiler "we know it's there, we don't need it."

**Site 3: `validate_payload`** — inside the `let header = { ... }` block, search for `.find(|(h, _)| *h == block_hash)`:

```rust
.find(|(h, _)| *h == block_hash)
.map(|(_, h)| h.clone())
```

Update both closures to 3-element patterns:

```rust
.find(|(h, _, _)| *h == block_hash)
.map(|(_, h, _)| h.clone())
```

**Site 4: `commit`** — search for the same `.find(|(h, _)| *h == hash)` pattern, change identically:

```rust
let header = s
    .pending
    .values()
    .find(|(h, _, _)| *h == hash)
    .map(|(_, h, _)| h.clone())
    .ok_or_else(|| ...)?;
```

**Site 5: `payload_fills`** (the new method you just added in Step 6) — already uses the 3-element pattern in the `.map(|(_, _, fills)| fills.clone())` line. No change needed.

That's all 5 sites. Run `cargo check -p openhl-evm` — if you missed any, the compiler will tell you with a "pattern matches against tuple of length 2 but expected 3" error.

> 🛑 **Anti-fluency.** "Couldn't I make the `pending` map's third field a `Vec<Fill>` only on payloads with fills, like `(B256, Header, Option<Vec<Fill>>)`?" **You could, but it's worse.** `Vec<Fill>` already represents "zero or more fills" — the empty vec is the natural "no fills" case. `Option<Vec<Fill>>` adds an extra unwrap step at every consumer site, and doesn't save meaningful memory (an empty Vec is 24 bytes vs Option's 32 bytes — negligible). **Don't add Option wrappers when the inner type already has a natural empty state.**

## Test

```bash
cargo test -p openhl-evm --release
```

After ~30 seconds (incremental compile + node bootstrap):

```
... 38 tests ...

test result: ok. 38 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

All course 6 tests still pass. L9 doesn't add new tests — the new functionality (submit_order, etc.) gets exercised by L11's integration test. The L9 change is **structural** — the bridge now has new fields and methods, but the existing test surface doesn't touch them, so all those tests continue to work.

You can do a quick sanity check that the new methods are wired correctly:

```rust
// In your existing live_bridge_builds_on_real_genesis test or a new smoke test:
let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);
assert_eq!(bridge.pending_fill_count(), 0); // empty after fresh bridge
```

That should pass. We're not testing the matching path yet (that's L11) — just that the new method compiles and returns 0 for a fresh bridge.

Common errors and fixes:

- **`error[E0432]: unresolved import 'openhl_clob'`** — Cargo.toml is missing the dep. Re-check Step 1.
- **`error[E0277]: 'Mutex<Book>' is not 'Send'`** — somewhere a `Book` is being held across an `.await`. Check that `submit_order` and `pending_fill_count` finish their lock + work before any await (they should — they're all synchronous in their bodies).
- **`error: pattern requires 2 fields, struct has 3`** — you missed a ripple-update site. The compiler will name the file:line. Add the third pattern element (`_fills` or `_`).
- **`error: cannot find value 'pending_fills'`** in `build_payload` — you didn't add the field to the struct or to `new()`. Re-check Steps 3 and 5.

## Design reflection

Three load-bearing decisions encoded here:

1. **Two `Mutex`es instead of one.** The bridge's CLOB state and its fill buffer are different concerns mutated at different times. Splitting locks lets concurrent submits avoid blocking each other unnecessarily. **Lock granularity matters when contention is on the hot path.**

2. **`submit_order` takes `&self`.** Interior mutability via `Mutex` lets shared references mutate the bridge. The bridge will be wrapped in `Arc` and shared across async tasks; making methods take `&mut self` would require `RwLock<Bridge>` at the top, which would serialize all access through one global lock. **Internal `Mutex` + `&self` API is the idiomatic Rust pattern for async-shared state.**

3. **Empty `Vec<Fill>` placeholder in `build_payload`.** L9 wires the structure; L10 makes it functional. Leaving the placeholder is honest scoping — readers can see exactly where the missing functionality lives. **A `Vec::new()` placeholder is more discoverable than a future TODO comment.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
```

After L9, your code is partway through 428cc26's full set of changes — fields + methods are in, but `build_payload` doesn't yet drain (L10) and there's no integration test (L11). The diff should show:
- ✅ `clob` + `pending_fills` fields (matches reference)
- ✅ `submit_order`, `payload_fills`, `pending_fill_count` methods (matches reference)
- ✅ 3-tuple in `pending` (matches reference)
- ❌ `build_payload` still inserts `Vec::new()` — reference uses `std::mem::take(...)`
- ❌ No `clob_fills_flow_into_payload` integration test — reference has it

The `❌` items land in L10 + L11.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why does `submit_order` lock `clob`, finish, then separately lock `pending_fills`, instead of holding both locks at once?**
Because the `pending_fills` append depends on the *result* of the matching, not on the matching's intermediate state. After `book.submit(order)` returns, the `FillResult` is owned data — we can release `clob`'s lock and safely process the result. Holding both locks would serialize unrelated `pending_fills` operations (e.g., another caller reading `pending_fill_count` would block) for no correctness benefit.

**Q: Why is `payload_fills` returning `Vec<Fill>` (cloned) instead of `&[Fill]` (borrowed)?**
Because returning `&[Fill]` would require the caller to hold the `state` Mutex's lock guard for the lifetime of the slice — which would deadlock anything else that wants the lock. Cloning the Vec is one allocation per `payload_fills` call, which is fine for an inspection method called rarely. **APIs that lock should never return references back through the lock.**

**Q: Could the `clob` field be `Arc<Mutex<Book>>` instead of `Mutex<Book>`?**
Yes — and openhl's Stage 9 (later) actually does this, because the CLOB needs to be shared with custom EVM precompiles that read its state. For Stage 8d, plain `Mutex<Book>` is enough. The change from `Mutex<T>` to `Arc<Mutex<T>>` is mechanical — wrap one place, change a few `.lock()` sites to `.lock().expect(...)`-on-arc. **Defer the Arc wrap until you actually need the sharing.**

**Q: What happens if `pending_fills.lock()` panics because of a poisoned mutex?**
A panic propagates up through `submit_order` and crashes whatever task called it. In Rust, mutex poisoning happens when a thread panics while holding the lock. In a synchronous body like `book.submit(order)`, panics are rare (the only sources are explicit `unwrap()`s, OOM, or stack overflow). If they do happen, the bridge is in an inconsistent state anyway — propagating the panic is the right behavior. **The `.expect("mutex poisoned")` is a tripwire, not a recovery path.**

## Next lesson (L10)

The bridge has a CLOB and fills accumulate. **Payloads built via `build_payload` still don't carry those fills** — the placeholder `Vec::new()` is the gap. L10 replaces the placeholder with `std::mem::take(&mut *pending_fills.lock(...))` so each new payload drains all accumulated fills. After L10, `bridge.payload_fills(id)` returns the actual fills produced since the last build, and `bridge.pending_fill_count()` resets to 0. L11 writes the end-to-end test that proves this drain semantic is forward-only (earlier payloads aren't retroactively filled).
````

---

## Seed-file slot

L9 lands in **new Module 4 (Bridge integration)** at sortOrder 0:

```typescript
modules: {
  0: { title: 'Orientation', sortOrder: 0 },
  1: { title: 'CLOB types', sortOrder: 1 },
  2: { title: 'Matching engine', sortOrder: 2 },
  3: { title: 'Testing', sortOrder: 3 },
  4: { title: 'Bridge integration', sortOrder: 4 },  // NEW
  // 5: { title: 'Capstone', sortOrder: 5 }, — L12
},
```

```typescript
{
  title: 'Lesson 9 — LiveRethEvmBridge gets a CLOB + submit_order',
  slug: 'openhl-clob-bridge-fields-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 70,
  content: `# Lesson 9 — \`LiveRethEvmBridge\` gets a CLOB + \`submit_order\`\n\n...`
},
```

## SHA pinning discipline

L9 cites `428cc26` (Stage 8d). The reference at that SHA has the full bridge integration including L10's drain and L11's integration test. After L9 the reader's code matches *structurally* but `build_payload` still uses `Vec::new()` (L10) and the integration test doesn't exist (L11).

## Style review notes (self-critique before paste)

- **§Plan's 7 numbered steps** lay out the ripple-update sites in advance so the reader doesn't get surprised by "wait, why does payload_ready need to change?"
- **§Step 3's "lock granularity" anti-fluency** generalizes — the two-Mutex decision teaches a principle that applies to any concurrent-access design.
- **§Step 6's `&self` vs `&mut self`** answers a question many Rust devs have when they first see `Mutex<T>` in struct fields.
- **§Step 7's enumeration of 5 sites** is the kind of explicit map that prevents "tedious bug hunting" — the compiler will catch missed sites, but knowing in advance keeps the lesson tight.
- **§Test's "L9 doesn't add new tests"** is honest scoping — the L11 integration test is where the new bridge methods get exercised end-to-end.
- **L10 preview** explicitly names `std::mem::take(...)` as the replacement for `Vec::new()`, setting up the conceptual hook.
