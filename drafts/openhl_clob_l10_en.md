# Building OpenHL CLOB — L10 draft (EN) — build-along

> Drafted against openhl SHA `428cc26` (Stage 8d — CLOB fills flow into bridge payloads).
> Course: `building-openhl-clob-en` (track: `reth-l1-architect`).

---

## L10 — `openhl-clob-bridge-drain-en`

- **Module:** 4 (Bridge integration), sortOrder 1 within module
- **Course-level sortOrder:** 9 (lesson 10 of 12)
- **Duration:** 25 min
- **XP reward:** 50
- **Type:** CONTENT

### Content

````markdown
# Lesson 10 — `build_payload` drains pending fills

## Goal

Concepts you'll grasp in this lesson:

- **`std::mem::take` is O(1) — a pointer swap, not element copying** — for a `Vec<Fill>` with 1000 entries, `mem::take` swaps the (ptr, len, cap) triple in one assignment; `drain(..).collect()` is O(N) with iterator overhead. Knowing the stdlib primitive saves you from inventing slower versions.
- **Drain at `build_payload`, not at `submit`** — fills get grouped by *which payload they ride in*, not by submission order. If we drained at submit time, the bridge would need a side-channel to track payload assignment. Buffer-then-drain encodes the grouping for free.
- **Forward-only drain mirrors block immutability** — payload N gets the fills accumulated between the previous `build_payload` and now. Earlier payloads are not retroactively updated. This is the same semantics as committed blocks: once built, frozen.
- **Two short locks beat one long lock when operations are independent** — we lock `state` to compute the payload ID, *briefly* lock `pending_fills` for the swap, then continue under `state`'s lock to insert. The `pending_fills` mutex isn't held during the heavy work.
- **The lost-fill failure mode is real but acceptable for v0** — if `build_payload` errors *after* the drain, the fills are gone from `pending_fills` but never made it into a payload. Production hardening would add a recovery queue; v0 single-validator devnet accepts the risk.

Verification:

```bash
cargo test -p openhl-evm --release
```

…still passes 38 tests.

Specific changes:

**One small change in `build_payload`** — about 8 lines — replaces L9's `Vec::new()` placeholder with `std::mem::take(...)`, so each new payload drains every fill the CLOB has accumulated since the last `build_payload` call.

The drain is **forward-only**: once a fill is attached to payload N, it's gone from `pending_fills` and will not appear in payload N+1. This is the data-flow promise the bridge makes to its consumers — each payload owns exactly one snapshot of fills, taken at build time.

L10 is short (one focused change). L11 will write the integration test that exercises the full pipeline.

## Recap

After L9, the bridge has:

```rust
// new fields
clob: Mutex<Book>,
pending_fills: Mutex<Vec<Fill>>,

// new methods
pub fn submit_order(&self, order: Order) -> FillResult     // pushes fills
pub fn payload_fills(&self, id: PayloadId) -> Option<Vec<Fill>>  // reads fills
pub fn pending_fill_count(&self) -> usize                  // reads count
```

You can submit orders. Fills accumulate in `pending_fills`. `pending_fill_count()` reports the buffer size. **But `build_payload` ignores the buffer** — it inserts `Vec::new()` as the third element of the pending tuple. So `payload_fills(id)` returns `Some(vec![])` even when the buffer has entries.

L10 closes that gap.

## Plan

One change, in one location. Inside `crates/evm/src/live_node.rs`'s `build_payload` method, the line:

```rust
s.pending.insert(id, (hash, header, Vec::new()));
```

…becomes:

```rust
let drained_fills = std::mem::take(
    &mut *self
        .pending_fills
        .lock()
        .expect("pending_fills mutex poisoned"),
);
s.pending.insert(id, (hash, header, drained_fills));
```

That's the whole lesson. Eight lines of code. The interesting parts are **what `std::mem::take` does** and **why we want forward-only drain semantics**.

> 🛑 **Predict.** Before scrolling: `std::mem::take(&mut v)` takes ownership of the contents of `v` and replaces `v` with `Default::default()`. For `Vec<Fill>`, that means we get the entire vector contents, and `v` becomes an empty `Vec<Fill>`. **One question:** could we instead write `v.drain(..).collect::<Vec<_>>()` for the same effect? What's the practical difference?

(Answer: `drain(..)` removes the elements one at a time, returning an iterator. `mem::take` swaps the entire `Vec<Fill>` by value — one pointer swap, no per-element work. For a Vec with N fills, `drain` is O(N) plus iterator overhead; `mem::take` is O(1) constant-time. **`mem::take` is faster and clearer for "take everything and reset to default."**)

## Walk-through

### Step 1: Find the line to change

Open `crates/evm/src/live_node.rs`. Inside `impl<P> ConsensusBridge for LiveRethEvmBridge<P>`, find `build_payload`. Scroll to near the end of the body (just before `Ok(PayloadId(id))`). You should see the L9 placeholder line:

```rust
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header, Vec::new()));    // empty Vec<Fill> for now; L10 drains pending_fills here
        Ok(PayloadId(id))
    }
```

The comment from L9 explicitly points here. This is the spot.

### Step 2: Replace with the drain

Change the section from `let hash = header.hash_slow();` through the insert to:

```rust
        let hash = header.hash_slow();

        // Drain whatever fills the CLOB has accumulated since the last
        // build_payload call. The fills attach to this payload so the bridge
        // can route them downstream (encode as EVM txs, return via
        // payload_fills, etc.). 8d keeps them as a parallel list; future
        // stages encode them into the block body.
        let drained_fills = std::mem::take(
            &mut *self
                .pending_fills
                .lock()
                .expect("pending_fills mutex poisoned"),
        );

        s.pending.insert(id, (hash, header, drained_fills));
        Ok(PayloadId(id))
    }
```

Two new statements: the `let drained_fills` block and the modified insert. The comment is intentional — it documents the **drain-on-build semantics** for future readers.

Walk the new code carefully:

1. **`self.pending_fills.lock()`** — acquire the mutex. Returns `LockResult<MutexGuard<Vec<Fill>>>`. The `.expect("pending_fills mutex poisoned")` unwraps the result (`expect` over poisoned mutexes is fine — see L9's design reflection).
2. **`.lock().expect(...)`** returns a `MutexGuard<Vec<Fill>>`. `MutexGuard` is `Deref<Target = Vec<Fill>>`, but it also has `DerefMut`. To take ownership of the Vec by value, we need `&mut Vec<Fill>`, which we get by `&mut *guard`.
3. **`std::mem::take(&mut *guard)`** does the swap: the Vec's heap-pointer + len + capacity move out of the MutexGuard into our `drained_fills` variable; the MutexGuard's Vec is replaced with `Vec::default()` (which is `Vec::new()` — an empty Vec with no allocation).
4. **The MutexGuard is dropped at the end of the block expression** — the lock releases.
5. **`s.pending.insert(id, (hash, header, drained_fills))`** stores the snapshot of fills with the new payload. **The pending_fills buffer is now empty, ready for the next round of submits.**

The whole `std::mem::take(...)` expression is **a single atomic operation under the lock** — no other caller can see "half-drained" state. Either `pending_fills` is full or it's empty; never mid-drain.

> 🛑 **Anti-fluency.** "Couldn't I just collect into `drained_fills` and clear separately, like `let drained = guard.iter().copied().collect::<Vec<_>>(); guard.clear();`?" **You could — and the result is the same** for the caller. But: (a) `iter().copied().collect()` does O(N) copy work plus O(N) clear work, vs. `mem::take`'s O(1) pointer swap; (b) the two-step version has a window where someone reading `pending_fill_count()` would see the old count even though we've already collected. `mem::take` is atomic from the outside's view. **The one-shot swap is both faster and more correct.**

### Step 3: Verify nothing else changed

Run `cargo check -p openhl-evm`. You should see only the line you just modified compile differently — no ripple effects, no other tests broken. The signature of `build_payload` is unchanged (still `async fn ... -> Result<PayloadId, BridgeError>`), so callers don't notice.

If you want a quick mental test of "are the fills actually moving?":

```rust
// Conceptually:
bridge.submit_order(order1);  // fill F1 → pending_fills: [F1]
bridge.submit_order(order2);  // fill F2 → pending_fills: [F1, F2]
assert_eq!(bridge.pending_fill_count(), 2);

let id1 = bridge.build_payload(...).await.unwrap();
// Now pending_fills is empty (drained into payload id1)
assert_eq!(bridge.pending_fill_count(), 0);
// And the payload has the fills attached
assert_eq!(bridge.payload_fills(id1), Some(vec![F1, F2]));

let id2 = bridge.build_payload(...).await.unwrap();  // empty drain this time
assert_eq!(bridge.payload_fills(id2), Some(vec![]));  // no retroactive fills
```

This is roughly what L11's integration test does, but executed against a real Reth node bootstrap. L10 just makes the underlying mechanism work.

## Test

```bash
cargo test -p openhl-evm --release
```

After ~30 seconds (incremental compile):

```
... 38 tests ...

test result: ok. 38 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Course 6's existing tests still pass. The L9 + L10 changes are structural — the matching engine isn't being exercised by any existing test (those come in L11), but everything that did work before still works.

You can confirm the change took effect with a quick `grep`:

```bash
grep -n "std::mem::take" crates/evm/src/live_node.rs
# Should report 1 line in build_payload — your new change.

grep -n "Vec::new()" crates/evm/src/live_node.rs
# Should NOT report the line in build_payload anymore. (Other Vec::new() in the
# file, like for the initial pending_fills initialization, are fine.)
```

Common errors and fixes:

- **`error[E0596]: cannot borrow `*self.pending_fills.lock()...` as mutable`** — the lock returns a `LockResult` which needs `.expect(...)` (or `.unwrap()`) to unwrap to `MutexGuard`. Re-check that `.lock().expect("...")` chain.
- **`error[E0277]: `MutexGuard<'_, Vec<Fill>>` doesn't implement `DerefMut`** — make sure you're using `&mut *guard` and not `&*guard`. The `*guard` deref + `&mut` borrow is what gives you `&mut Vec<Fill>`.
- **`error: cannot move out of borrowed content`** — you tried something like `std::mem::take(self.pending_fills.lock().expect(...))` (no `&mut *`). The mem::take signature is `fn take<T: Default>(dest: &mut T) -> T`. The argument has to be a `&mut`, and dereferencing the MutexGuard gives you the right shape.

## Design reflection

Three load-bearing decisions encoded here:

1. **Drain at build_payload, not at submit.** Submits push into `pending_fills`; only `build_payload` empties it. This is intentional — **fills are grouped by the payload they were assembled into**, not by the order they came in. The downstream payload-consumer gets a coherent "this batch of fills happened between the previous payload and this one." If we drained at submit time, the bridge would need a side-channel to track which fills go with which payload — more state, more bookkeeping.

2. **`std::mem::take` is the right primitive.** It's O(1), atomic under the lock, and signals intent ("take everything, leave default"). The alternative — `collect::<Vec<_>>(...drain(..))` then explicit clear — is O(N) + has a half-drained window. **Knowing the standard-library primitives saves you from inventing slower or buggier versions.**

3. **The drain is forward-only.** Payload N attaches fills produced between (the previous build_payload call) and (this call). Earlier payloads aren't updated with fills that arrive later. This matches the chain's semantics: once a block is built, its contents are frozen. **The buffer-then-drain shape encodes "what's in this block" without requiring an explicit grouping mechanism.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

After L10, the bridge code is **functionally equivalent** to `428cc26` modulo doc comments. The only difference from the reference should be the integration test — `clob_fills_flow_into_payload` doesn't exist in your code yet. That's L11.

Return:

```bash
git checkout main
```

## Common questions

**Q: What if `pending_fills` has many fills (say 1000)?**
`std::mem::take` is still O(1). The Vec itself owns a heap allocation; `mem::take` swaps the (pointer, length, capacity) triple. No element-by-element work. The downstream consumer eventually iterates over the 1000 fills, but that's their cost, not the drain's.

**Q: Could two `build_payload` calls race and both think they have the full fill set?**
No, because `std::mem::take` is under a `MutexGuard`. While the lock is held, no other thread can acquire the lock. The first build_payload gets the full set; the second gets an empty Vec (because the first replaced it with `Vec::default()`). **The mutex serializes the drains.**

**Q: What if `build_payload` errors out *after* the drain?**
The fills are gone from `pending_fills` but never made it into a payload. They're effectively lost — submitted but not committed. **This is a real bug class** that production code should handle (e.g., save the drained fills to a recovery queue before doing the rest of `build_payload`). For our v0 single-validator devnet, the failure path is rare enough that we accept the loss; production hardening is downstream work.

**Q: Why is `drained_fills` not in the `state` lock — it's locked separately?**
Because `pending_fills` and `state` are separate mutexes (the L9 design decision). We lock `state` first (to compute the new payload ID), then briefly lock `pending_fills` (just for the swap), then continue using the state lock to insert into `pending`. **Two short locks beat one long lock when the operations are independent.**

## Next lesson (L11)

The bridge has the data flow. **Nothing yet proves it works end-to-end.** L11 writes the `clob_fills_flow_into_payload` integration test:

1. Bootstrap a real Reth `EthereumNode` (same pattern as course 6).
2. Construct `LiveRethEvmBridge` with the live provider.
3. Call `build_payload` on an empty book — verify no fills attached (`payload_fills` returns `Some(vec![])`).
4. Submit a maker BID @ 100, then a crossing taker SELL @ 100 — fill is produced.
5. Verify `pending_fill_count == 1`.
6. Build the next payload — verify the fill is drained AND attached.
7. Verify `pending_fill_count == 0`.
8. Verify the earlier (pre-orders) payload was NOT retroactively filled (drain is forward-only).

After L11, you have a single integration test that exercises the entire Course 7 pipeline. **That's the "we built a working CLOB-integrated bridge" milestone.**
````

---

## Seed-file slot

L10 lands in Module 4 (Bridge integration) at sortOrder 1:

```typescript
{
  title: 'Lesson 10 — build_payload drains pending fills',
  slug: 'openhl-clob-bridge-drain-en',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 25,
  xpReward: 50,
  content: `# Lesson 10 — \`build_payload\` drains pending fills\n\n...`
},
```

## SHA pinning discipline

Same `428cc26`. After L10, the bridge is functionally equivalent to the reference; only the integration test (L11) is left.

## Style review notes (self-critique before paste)

- **§Plan's "one change, eight lines"** sets the lesson scope honestly — L10 is small and focused. The conceptual content (drain semantics + `std::mem::take` primitive) is the value, not the LOC.
- **§Predict's `mem::take` vs `drain(..).collect()`** asks the reader to think about *which primitive is right* — a thinking exercise, not a code-typing exercise. L10's value is more conceptual than mechanical.
- **§Step 2's 5-step walk** through the new code unpacks what looks like 3 lines into the actual atomic-swap semantics under the lock.
- **§Anti-fluency about two-step collect-then-clear** anticipates the natural urge to "just iterate and clear" — names the correctness issue (half-drained window).
- **§Design reflection's "drain at build_payload, not submit"** is the lesson's general principle — group state by *when it was assembled into output*, not by *when it arrived*.
- **§Common questions about error-after-drain** is honest about a real bug class (drained fills lost on commit failure) — production hardening is downstream.
