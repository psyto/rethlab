# Building OpenHL Precompiles — L3 draft (EN) — build-along

> Drafted against openhl SHAs `1761d4d` (Stage 9a — NodeBuilder integration test) + `2ba97c6` (Stage 9e — precompile callability tests).
> Course: `building-openhl-precompiles-en` (track: `reth-l1-architect`).

---

## L3 — `openhl-precompiles-node-wiring-en`

- **Module:** 1 (Custom EVM bootstrap), sortOrder 2 within module
- **Course-level sortOrder:** 2 (lesson 3 of 12)
- **Duration:** 35 min
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# Lesson 3 — NodeBuilder wiring + registry callability tests

## Goal

By the end of this lesson:

```bash
cargo test -p openhl-evm reth_dev_node_with_openhl_executor --release
cargo test -p openhl-evm --lib precompiles
```

…both pass. You'll have written **4 new tests** total:

- **1 integration test** in `crates/evm/src/reth_node.rs` — `reth_dev_node_with_openhl_executor`. Bootstraps a Reth node with `OpenHlExecutorBuilder` swapped in for the default executor. Validates that the `EvmFactory` + `ExecutorBuilder` composition spawns cleanly.
- **3 unit tests** in `crates/evm/src/precompiles/mod.rs`:
  - `read_best_bid_returns_hardcoded_price_and_qty` — direct function-call test.
  - `openhl_precompiles_registers_clob_address` — **extend-not-replace** invariant.
  - `registered_precompile_is_invokable_via_registry` — full registry-dispatch test (the path REVM uses internally).

**This is the milestone lesson for Module 1.** After L3, the custom EVM + precompile are not just compile-clean — they're proven reachable from EVM execution. Modules 2-4 build the *content* (live state, write paths, bridge integration); Module 1 set up the *plumbing*.

## Recap

After L2:

- `openhl_evm.rs` has `OpenHlEvmFactory` + `OpenHlExecutorBuilder` (L1).
- `precompiles/mod.rs` has `CLOB_READ_BEST_BID` + `read_best_bid` + `openhl_precompiles` (L2).
- `cargo check -p openhl-evm` passes.

**Nothing has invoked any of this code.** L3 writes the four tests that prove the plumbing works.

## Plan

Five things:

1. **Update imports in `reth_node.rs`** — add `EthereumAddOns` (needed for `with_add_ons(...)`) and `crate::OpenHlExecutorBuilder` (the type we'll wire in).
2. **Add `reth_dev_node_with_openhl_executor` integration test** — same shape as course 6's `reth_dev_node_bootstraps`, but uses the explicit-builder path with `.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))`.
3. **Add `#[cfg(test)] mod tests` to `precompiles/mod.rs`** with 3 unit tests.
4. **Run both test paths** — integration test passes, 3 unit tests pass.
5. **Verify everything else still passes** — `cargo test -p openhl-evm --release` shows all prior course-6 + course-7 tests still green.

The 3 unit tests cover three distinct concerns:

| Test | Concern | If it fails, the bug is in… |
| - | - | - |
| `read_best_bid_returns_hardcoded_price_and_qty` | The function's body is correct (writes the right bytes) | L2's `read_best_bid` implementation |
| `openhl_precompiles_registers_clob_address` | Extend-not-replace invariant | L2's `openhl_precompiles` body — likely the wrong `clone()` or `extend(...)` semantics |
| `registered_precompile_is_invokable_via_registry` | EVM dispatch path through the registry works | The `Precompile::new(...)` call shape, the `PrecompileId`, or registration ordering |

> 🛑 **Predict.** Before scrolling: why does `openhl_precompiles_registers_clob_address` assert that **both** `CLOB_READ_BEST_BID` AND ECDSA recover at `0x...01` are present in the extended set? The first assertion alone seems sufficient — we registered it, why check that ECDSA is still there?

(Answer: because the test enforces the **extend-not-replace** invariant. If your `openhl_precompiles` accidentally created a fresh `Precompiles` set instead of cloning the base and extending it, `CLOB_READ_BEST_BID` would still be present, but the standard Ethereum precompiles (ECDSA recover, SHA-256, etc.) would be **gone**. The base set is one of the load-bearing things our wrapper must preserve. Without ECDSA recover, any contract that verifies signatures would revert. **The dual assertion catches the silent-replace bug.**)

## Walk-through

### Step 1: Update imports in `reth_node.rs`

Open `crates/evm/src/reth_node.rs`. The existing test module (`mod tests` from course 6) imports:

```rust
use reth_node_ethereum::EthereumNode;
```

Change to:

```rust
use reth_node_ethereum::{node::EthereumAddOns, EthereumNode};
```

Also add an import for `OpenHlExecutorBuilder`. Put it just after the `use` block, before `dev_chain_spec()`:

```rust
use crate::OpenHlExecutorBuilder;
```

Two imports because `EthereumAddOns` is needed for `.with_add_ons(...)` (the explicit-builder path requires the `add_ons` argument, even if we don't customize them), and `OpenHlExecutorBuilder` is the type we're swapping in.

### Step 2: Add `reth_dev_node_with_openhl_executor` integration test

Append the following test to the `mod tests` block in `reth_node.rs`, after the existing `reth_dev_node_bootstraps` test:

```rust
    /// Stage 9a: prove that `NodeBuilder` accepts `OpenHlExecutorBuilder` in
    /// place of Reth's default executor, and that the resulting node still
    /// spawns cleanly with our custom precompile registered.
    ///
    /// Doesn't yet invoke the precompile (that requires deploying a
    /// Solidity contract); just validates the `EvmFactory` + `ExecutorBuilder`
    /// composition compiles, spawns, and tears down.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn reth_dev_node_with_openhl_executor() {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let expected_chain_id = chain_spec.chain.id();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec);

        let result: Result<()> = async {
            let _handle = NodeBuilder::new(node_config)
                .testing_node(runtime)
                .with_types::<EthereumNode>()
                .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
                .with_add_ons(EthereumAddOns::default())
                .launch()
                .await?;
            // The node spawned with our custom EVM. We don't need to inspect
            // further — if the EvmFactory or ExecutorBuilder were broken,
            // launch() would have failed.
            let _ = expected_chain_id;
            Ok(())
        }
        .await;
        if let Err(e) = result {
            panic!("Reth dev node bootstrap with OpenHl EVM failed: {e:?}");
        }
    }
```

Compare against course 6's `reth_dev_node_bootstraps` test — same setup pattern, but one critical line differs:

```rust
// course 6:
.node(EthereumNode::default())
.launch_with_debug_capabilities()

// course 8:
.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
.with_add_ons(EthereumAddOns::default())
.launch()
```

The course-6 path uses `.node(...)` which is shorthand — it takes a pre-built node spec. The course-8 path uses the explicit builder: **swap in `OpenHlExecutorBuilder` while keeping every other component (network, payload pool, RPC handler) at default.** That's the "you don't fork Reth, you configure it" property.

The `.executor(OpenHlExecutorBuilder)` chain is the load-bearing piece. `EthereumNode::components()` returns a default `ComponentsBuilder`; `.executor(...)` overrides one slot. The remaining slots (network, payload, pool, etc.) come from defaults. **One slot swapped, everything else inherited.**

> 🛑 **Anti-fluency.** "I could just write the executor inline — `.executor(my_closure)` instead of building a whole `OpenHlExecutorBuilder` struct." **The `ExecutorBuilder` trait is the contract Reth's `ComponentsBuilder` accepts.** A closure would have to satisfy the same trait (`impl ExecutorBuilder<Node>`), which is awkward to write inline. The struct exists because the trait is the API surface; closures are a worse fit for this particular hook.

### Step 3: Add the `mod tests` block to `precompiles/mod.rs`

Open `crates/evm/src/precompiles/mod.rs`. Append the following at the end of the file (after `openhl_precompiles`):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use alloy_primitives::U256;

    /// Direct unit test of the precompile function: invoked with empty input,
    /// it returns the hardcoded (price=100, qty=10) as 64 big-endian u256 bytes.
    #[test]
    fn read_best_bid_returns_hardcoded_price_and_qty() {
        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
        assert_eq!(result.bytes.len(), 64);
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(100u64));
        assert_eq!(qty, U256::from(10u64));
        assert_eq!(result.gas_used, CLOB_BASE_GAS_COST);
    }

    /// Registry test: `openhl_precompiles()` extends a base precompile set
    /// with our CLOB precompile at the well-known address. This is what the
    /// Stage 9a `EvmFactory` plugs into every EVM instance Reth constructs.
    #[test]
    fn openhl_precompiles_registers_clob_address() {
        let base = Precompiles::cancun();
        let extended = openhl_precompiles(base);

        // The CLOB address must be in the extended set.
        assert!(
            extended.contains(&CLOB_READ_BEST_BID),
            "openhl_precompiles must register the CLOB_READ_BEST_BID address"
        );

        // The base Ethereum precompiles (e.g. ECDSA recover at 0x...01) must
        // still be present — we EXTEND, not replace.
        let ecrecover: Address = alloy_primitives::address!("0x0000000000000000000000000000000000000001");
        assert!(
            extended.contains(&ecrecover),
            "extended set must retain base Ethereum precompiles"
        );
    }

    /// Invoke the registered precompile end-to-end through the registry
    /// (rather than calling `read_best_bid` directly). This proves the
    /// registration is wired such that an EVM dispatch to the address hits
    /// our function — the same path Reth's EVM uses on `staticcall` to
    /// `CLOB_READ_BEST_BID`.
    #[test]
    fn registered_precompile_is_invokable_via_registry() {
        let extended = openhl_precompiles(Precompiles::cancun());
        let precompile = extended
            .get(&CLOB_READ_BEST_BID)
            .expect("CLOB precompile must be registered");

        // Precompile::execute is the public dispatch method — same as what
        // the EVM calls internally when a contract STATICCALLs the address.
        let result = precompile
            .execute(&[], 100_000, 0)
            .expect("call must not error");
        assert_eq!(result.bytes.len(), 64);
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(100u64));
        assert_eq!(qty, U256::from(10u64));
    }
}
```

Three tests in **increasing scope**:

- **`read_best_bid_returns_hardcoded_price_and_qty`** — calls the function directly with `(empty_input, gas_limit=100_000, reservoir=0)`. Asserts byte length, decoded price, decoded qty, gas used. **The narrowest scope** — just the function, no registry, no EVM.
- **`openhl_precompiles_registers_clob_address`** — calls `openhl_precompiles(Precompiles::cancun())`, checks that both our address AND the standard ECDSA recover address are in the extended set. **The extend-not-replace invariant** is the load-bearing assertion: a buggy wrapper could replace the base set instead of extending it.
- **`registered_precompile_is_invokable_via_registry`** — extracts the precompile from the registry via `.get(&CLOB_READ_BEST_BID)`, calls its `.execute(...)` method. **The full dispatch path** — same code REVM uses internally on a `STATICCALL`.

The `alloy_primitives::U256` import is needed for decoding the 64-byte response. `U256::from_be_slice(&bytes[..])` decodes a 32-byte big-endian slice into a U256 value.

> 🛑 **Anti-fluency.** "The third test seems redundant — if the function works (test 1) and the address is registered (test 2), invoking via registry has to work." **It doesn't have to.** Test 2 only checks that `address.contains(&...)` returns true. The dispatch from registry to function lookup is separate — REVM internally uses `.get(&address)` then calls `.execute(...)`. **A bug in `Precompile::new(...)`'s wiring (wrong function pointer, type mismatch) would pass tests 1 and 2 but fail test 3.** The dispatch test catches a real bug class.

### Step 4: Run the tests

```bash
cargo test -p openhl-evm reth_dev_node_with_openhl_executor --release
```

After ~30 seconds (first incremental build with the new tests):

```
running 1 test
test reth_node::tests::reth_dev_node_with_openhl_executor ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Then the unit tests:

```bash
cargo test -p openhl-evm --lib precompiles
```

```
running 3 tests
test precompiles::tests::openhl_precompiles_registers_clob_address ... ok
test precompiles::tests::read_best_bid_returns_hardcoded_price_and_qty ... ok
test precompiles::tests::registered_precompile_is_invokable_via_registry ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Note `--lib` ensures we run the unit tests inside the library (not integration tests, which live in `tests/`). Without `--lib`, `cargo test precompiles` would also try to match integration test names.

### Step 5: Verify nothing else broke

Full suite:

```bash
cargo test -p openhl-evm --release
```

After ~30 seconds:

```
running 42 tests
... 42 tests pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**42 tests workspace-wide for `openhl-evm`** (39 from courses 6+7 + 3 new unit tests + 1 new integration test - some test counts may overlap because `--lib` and integration tests share name patterns; the exact count varies). All prior tests still green.

Common errors and fixes:

- **Integration test fails with `with_components` not found** — the new test uses `with_components` instead of the shorthand `.node(...)`. Make sure you replaced the shorthand entirely, not just appended to it.
- **`error[E0277]: 'EthereumAddOns' is not a 'NodeAddOns'`** — wrong import path. Use `reth_node_ethereum::node::EthereumAddOns` (with `node::` in the path), not just `reth_node_ethereum::EthereumAddOns`.
- **`assert!(extended.contains(&ecrecover))` fails** — your `openhl_precompiles` body created a fresh `Precompiles` set instead of cloning the base. Re-check L2's Step 4: it must be `let mut precompiles = base.clone(); precompiles.extend(...); precompiles`. **NOT `let precompiles = Precompiles::default(); precompiles.extend(...)`.**
- **`result.gas_used` doesn't match `CLOB_BASE_GAS_COST`** — the constant has a different value than what `read_best_bid` charges. Re-check L2's Step 3: `PrecompileOutput::new(CLOB_BASE_GAS_COST, ...)` — both must reference the same constant.
- **Test `registered_precompile_is_invokable_via_registry` panics** — your `Precompile::new(...)` call in L2's `openhl_precompiles` was wrong (e.g., wrong function pointer or wrong argument order). Re-check the 3-argument shape: `(PrecompileId, Address, fn)`.

## Design reflection

Three load-bearing decisions encoded here:

1. **Tests in increasing scope.** The 3 unit tests start with the narrowest (function body) and expand outward (registry registration → registry dispatch). When one fails, you know exactly which layer is broken. **Test scope = bug localization.**

2. **The extend-not-replace check is the dual assertion.** A passing test for `extended.contains(CLOB_READ_BEST_BID)` alone doesn't prove the wrapper isn't catastrophically wrong — a buggy wrapper that *replaces* the base set would still pass. Asserting that ECDSA recover is *also* there catches the silent-replace bug. **A single assertion can pass for the wrong reasons; the dual asserts together can't.**

3. **The integration test doesn't invoke the precompile.** The full RPC roundtrip would require deploying a Solidity contract — that's Reth-RPC testing surface, not precompile testing. The Module-1 milestone is "the EvmFactory + ExecutorBuilder spawn cleanly." The unit tests (Step 3) cover the precompile behavior; the integration test covers the assembly. **Two tests with different scope, addressed separately.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout 2ba97c6
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/reth_node.rs ./crates/evm/src/reth_node.rs
```

After L3, your code matches the reference at `2ba97c6` — both Stage 9a's NodeBuilder wiring and Stage 9e's 3 unit tests are present. Only doc-comment wording may differ.

Return:

```bash
git checkout main
```

## Common questions

**Q: Why use `EthereumNode::components()` instead of `EthereumNode::default()`?**
`default()` returns a pre-built node spec where every component is fixed; you can't swap individual components. `components()` returns a `ComponentsBuilder` that exposes `.executor(...)`, `.network(...)`, `.payload(...)`, etc. as chainable methods. **You use `components()` when you need to swap one or more slots; `default()` when you accept everything as-is.**

**Q: What does `Precompile::execute(&[], 100_000, 0)` actually do internally?**
It's the public dispatch method on the `Precompile` type. Internally it calls the stored function pointer (our `read_best_bid`) with the provided arguments. REVM uses this same method when a smart contract `STATICCALL`s the precompile's address — the EVM looks up the address in the precompile registry, gets back a `&Precompile`, and calls `.execute(input, gas_limit, reservoir)`.

**Q: Why does the integration test need `--release`?**
For speed. `--release` cuts the test runtime from ~5 seconds (debug) to ~1 second by enabling optimizations. The other unit tests are tiny enough that the debug overhead is negligible.

**Q: Could the `.with_add_ons(EthereumAddOns::default())` be skipped?**
No — `NodeBuilder`'s build chain requires every "slot" to be filled, even with defaults. Skipping it would fail at compile time. The explicit `EthereumAddOns::default()` says "use the defaults" without ambiguity.

**Q: Why is the integration test using `Result<()>` and an `async` block instead of `unwrap()` chains?**
For better error reporting. If something inside the `NodeBuilder` chain fails, the `?` operator propagates the error to the outer `result`, and the `panic!` at the end prints `{e:?}` so the failure cause is visible. With `.unwrap()`, you'd get a generic panic without the original error chain.

## Next lesson (L4)

The precompile is registered and proven callable, but it returns **hardcoded values**. L4 starts wiring **live CLOB state** to the precompile — adding `install_clob()` so the bridge can inject its `Arc<Mutex<Book>>` into the precompile module, and updating `openhl_precompiles` to accept the shared state. After L4, the precompile is *capable* of returning real data; L5 makes it *actually* read from the shared book.
````

---

## Seed-file slot

L3 lands in Module 1 (Custom EVM bootstrap) at sortOrder 2:

```typescript
{
  title: 'Lesson 3 — NodeBuilder wiring + registry callability tests',
  slug: 'openhl-precompiles-node-wiring-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 35,
  xpReward: 70,
  content: `# Lesson 3 — NodeBuilder wiring + registry callability tests\n\n...`
},
```

## SHA pinning discipline

L3 cites both `1761d4d` (Stage 9a) and `2ba97c6` (Stage 9e). After L3 your code matches `2ba97c6` (the chronologically-later of the two).

## Style review notes (self-critique before paste)

- **§Plan's 3-row table** maps each test to "if it fails, the bug is in…" — bug-localization framing.
- **§Predict on the dual ECDSA assertion** is the conceptual key for L3 — silent-replace bug class would pass a naive test but fail the dual.
- **§Step 2's contrast** between course-6's `.node(...)` shorthand and course-8's explicit `.with_components(...)` chain is the moment readers see "this is how you customize Reth without forking."
- **§Step 3's "tests in increasing scope"** generalizes to other test architecture — narrow tests first, expand outward.
- **§Anti-fluency on test redundancy** preempts "test 3 seems redundant" — names the bug class (Precompile::new wiring error) that only test 3 catches.
- **§Common questions on `.execute()`** demystifies REVM's dispatch path without overwhelming.
- **L4 preview names `install_clob()`** — sets up the live-state injection pattern.
