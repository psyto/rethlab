# Building OpenHL Precompiles — L0 draft (EN) — build-along

> Drafted against openhl SHA `1761d4d` (Stage 9a — custom EVM with CLOB precompile boots via NodeBuilder).
> This is **course 8 of 10** in the L1 Architect track, the third of the openhl-based build-along courses.
> Course: `building-openhl-precompiles-en` (track: `reth-l1-architect`).

---

## L0 — `openhl-precompiles-orientation-en`

- **Module:** 0 (Orientation), sortOrder 0 within module
- **Course-level sortOrder:** -1 (lesson 0 of ~12)
- **Duration:** 15 min
- **XP reward:** 50
- **Type:** CONTENT

### Content

````markdown
# Build OpenHL Precompiles — connecting CLOB state to smart contracts

The previous course (`building-openhl-clob`) ended with the bridge owning a CLOB matching engine. Orders submit, fills flow into payloads, the integration test exercises the whole pipeline against a real Reth node. **But the fills are still a parallel list.** Smart contracts running inside that same Reth node can't see them. The CLOB state and the EVM state live in two different worlds.

This course closes that gap. You'll add **custom EVM precompiles** — special addresses that, when called from Solidity (or any EVM caller), execute Rust code that reads or writes the CLOB. After course 8:

- A smart contract can call `0x...0c1b` to **read** the current best bid.
- A smart contract can call `0x...0c1c` to **place an order** that the matching engine processes.

Once these two paths exist, the CLOB stops being a parallel structure beside the EVM and starts being a **state extension** the EVM can interact with. That's what makes the chain "Hyperliquid-shape" — Hyperliquid's whole novelty is that the perp matching engine is callable from smart contracts running on the same chain.

By the end of this course, `cargo test clob_precompile_round_trip` passes — a smart contract call places an order via precompile, the order matches against existing book state, and the resulting fill flows back into the bridge.

## 1. What you'll have at the end

A new `crates/evm/src/precompiles/` module containing:

- **Two custom precompiles** registered at well-known EVM addresses:
  - `clob_read_best_bid` (read): returns `(price, qty)` of the best bid as a 64-byte response.
  - `clob_place_order` (write): decodes an order from calldata, submits it to the CLOB, returns the fill summary.
- **Custom EVM machinery** (`openhl_evm.rs`) — an `EvmFactory` + `ExecutorBuilder` that wires the precompiles into Reth's executor.
- **Bridge integration** — `LiveRethEvmBridge` spawns its underlying Reth node with the custom EVM, so smart contract calls to the precompiles touch the same CLOB instance the bridge owns.

About **6 commits worth of work** in openhl (~860 LOC), broken into 11 lessons + capstone. The end-to-end test takes ~3 seconds: bootstrap Reth, deploy a thin solidity wrapper (or call directly via the engine), trigger the precompile, assert the fill.

## 2. What you won't have at the end

This course covers **openhl Stage 9 (9a-9e) only**. It does NOT cover:

- **Encoding Fill → real EVM transaction in the block body.** The fills are still a parallel list attached to payloads (the situation from course 7 L12). Course 8 makes them *accessible from EVM execution*, but doesn't make them *part of the block body*. That's a future course.
- **Funding state machine.** That's Stage 8b / course 9.
- **Liquidations, oracles, perp-specific math.** Not in Stage 9.
- **Multi-market precompiles.** Stage 9 has one CLOB; production would have one precompile per market or one with market-id calldata.

When you finish this course you have a chain where smart contracts can read and write the CLOB. That's a **massive** capability jump — it's the difference between "the chain has an orderbook somewhere" and "the chain *is* an orderbook + EVM." But fully closing the loop (fills back into block body as txs) is downstream work.

## 3. Prerequisites

You need:

- **`building-openhl-clob` complete** — or, equivalently, a workspace at the end-of-course-7 state. Your `LiveRethEvmBridge<P>` should have `clob`, `pending_fills`, `submit_order`, `payload_fills`, and `pending_fill_count` from L9-L11 of that course. If yours doesn't, work through course 7 first.
- **Rust 1.95+**, same as before.
- **Familiarity with REVM at the trait level.** You don't need to have written precompiles before — L1 explains the pattern — but if you've never seen REVM's `Precompile`, `PrecompileFn`, or `Precompiles` types, skim the [revm precompile docs](https://docs.rs/revm-precompile) first.
- **Comfort with `Arc<Mutex<T>>` for shared state across thread boundaries.** Precompiles need to read the CLOB from the EVM's execution context, which is a different async/sync boundary than the bridge's normal call sites.

You do **not** need:

- Any prior `EvmFactory` or `ExecutorBuilder` knowledge (L1-L2 explain them).
- Any Solidity (we don't write Solidity — we just exercise the precompiles via raw calldata).
- Knowledge of Reth's internal block-execution pipeline beyond what course 6 covered.

## 4. Setup confirmation (do this now)

You should already have the two-directory workflow from courses 6 and 7:

- `~/code/my-openhl/` — your workspace
- `~/code/openhl-reference/` — read-only `psyto/openhl` clone

Bring the reference repo up to date in case Stage 9 commits are newer than your clone:

```bash
cd ~/code/openhl-reference
git fetch origin
git log --oneline | head -25
# You should see commits up to and including SHA d19ba1b (Stage 9c+).
# Stage 9 commits in chronological order:
#   1761d4d — Stage 9a
#   2ba97c6 — Stage 9e
#   b635ef7 — Stage 9b
#   a8823a1 — Stage 9c
#   2f796c3 — Stage 9d
#   d19ba1b — Stage 9c+
```

Then confirm your workspace is at the end-of-course-7 state:

```bash
cd ~/code/my-openhl
cargo test -p openhl-evm clob_fills_flow_into_payload --release 2>&1 | tail -5
# Expect: test passes (this is course 7's milestone test).
```

If that passes, you're at the right starting point.

> 🛑 **やりがちな勘違い.** "Custom EVM precompiles are just a fancier version of contract calls — I'll think of them as Solidity functions." **No, they're more fundamental.** Precompiles execute Rust directly inside the EVM at well-known addresses, with no Solidity bytecode in between. From the calling contract's perspective they look like an external call to a fixed address, but the implementation is native Rust running with full access to whatever state we choose to expose. The mental model is "native function callable from EVM" — not "another smart contract."

## 5. The 12-lesson map

| # | Module | What you build | End-of-lesson test |
| - | - | - | - |
| **L0** | Orientation | (this lesson) | setup confirmed |
| **L1** | Custom EVM bootstrap | `openhl_evm.rs` — EvmFactory pattern + dependencies | `cargo check -p openhl-evm` |
| **L2** | Custom EVM bootstrap | `precompiles/mod.rs` — Stage 9a's hardcoded read precompile + registry | precompile compiles |
| **L3** | Custom EVM bootstrap | `OpenHlExecutorBuilder` + NodeBuilder wiring; smoke test that calls the precompile (Stage 9e) | `precompile_is_callable_via_registry` passes |
| **L4** | Read precompile | install_clob() — Arc-shared CLOB state, ready for precompile injection | bridge compiles with shared state |
| **L5** | Read precompile | wire the read precompile to live CLOB state (Stage 9b proper) | precompile returns real best_bid |
| **L6** | Read precompile | end-to-end test: read precompile reflects bridge.submit_order results | integration test passes |
| **L7** | Write precompile | `clob_place_order` signature + calldata decoding (Stage 9c part 1) | precompile decodes correctly |
| **L8** | Write precompile | implementation: submit to CLOB + return fill summary (Stage 9c part 2) | precompile writes correctly |
| **L9** | Bridge integration | `install_fill_sink()` — fills produced by precompile flow back to bridge's pending_fills (Stage 9c+) | precompile-placed fills reach bridge |
| **L10** | Bridge integration | bridge spawns against the custom-EVM Reth node (Stage 9d) | full pipeline test passes |
| **L11** | Capstone | recap, what's next (funding via course 9, fill-as-EVM-tx as future course) | (no test — recap) |

**L10 is the milestone.** Finishing L10, you have an EVM-callable CLOB on a live Reth node: smart contracts call precompiles, the matching engine runs, fills emerge through the bridge into payloads. L11 names what's still missing (the fills aren't yet EVM transactions — that's beyond Stage 9).

## 6. The answer-key discipline (same as before)

Each lesson L1–L10 cites one of the 6 Stage 9 commits:

| Lessons | Stage | SHA |
| - | - | - |
| L1-L3 | 9a + 9e | `1761d4d`, `2ba97c6` |
| L4-L6 | 9b | `b635ef7` |
| L7-L8 | 9c | `a8823a1` |
| L9 | 9c+ | `d19ba1b` |
| L10 | 9d | `2f796c3` |

After each lesson's test passes:

```bash
cd ~/code/openhl-reference
git checkout <SHA>
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

Match meaningfully — same types, same control flow. Whitespace and naming will differ.

> 🛑 **やりがちな勘違い.** "Precompiles seem like a custom thing — surely the openhl reference is more advanced than what I'd write." **The reference is straightforward; this course teaches the canonical Reth + REVM pattern.** Reth provides an `EvmFactory` + `ExecutorBuilder` pattern specifically for cases like this (the upstream example is `paradigmxyz/reth/examples/custom-evm`). What openhl does is *follow the pattern, with one read precompile and one write precompile registered*. If you understand the pattern, you can add more precompiles by copy-modifying the existing ones.

## 7. Setup confirmation — the actual L0 exercise

Before L1, run all of these and confirm they pass:

```bash
# 1. Rust version
rustc --version    # expect: rustc 1.95.x or later

# 2. End-of-course-7 state
cd ~/code/my-openhl && cargo test -p openhl-evm clob_fills_flow_into_payload --release 2>&1 | tail -3
# Expect: 1 test passing

# 3. Reference repo has Stage 9 commits
cd ~/code/openhl-reference && git log --oneline | grep -E "(1761d4d|b635ef7|a8823a1)"
# Expect: all three SHAs appear
```

If all three pass, you're ready for L1.

> **Final check.** In one sentence, what does this course add that course 7 didn't? If your answer doesn't mention "smart contracts can read and write the CLOB," re-read §1.
````

---

## Seed-file slot

L0 lands in Module 0 (Orientation), sortOrder 0:

```typescript
{
  title: 'Build OpenHL Precompiles — connecting CLOB state to smart contracts',
  slug: 'openhl-precompiles-orientation-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# Build OpenHL Precompiles — connecting CLOB state to smart contracts\n\n...`
},
```

## SHA pinning table for course 8

| Lessons | openhl Stage | SHA |
| - | - | - |
| L1-L3 | 9a + 9e | `1761d4d`, `2ba97c6` |
| L4-L6 | 9b | `b635ef7` |
| L7-L8 | 9c | `a8823a1` |
| L9 | 9c+ | `d19ba1b` |
| L10 | 9d | `2f796c3` |
| L11 | (capstone) | — |

## Style review notes (self-critique before paste)

- **§1's "CLOB stops being a parallel structure beside the EVM and starts being a state extension the EVM can interact with"** is the conceptual hook for the entire course. Worth repeating.
- **§Predict-anchor anti-fluency** about "precompiles are not Solidity functions" preempts the natural beginner misconception — they're Rust functions callable from Solidity, but live closer to "system call" than "user function."
- **§4 prerequisites** explicitly requires course 7 complete, matching course 7's pattern of requiring course 6 complete.
- **§5 lesson map labels L10 as the milestone** (not the final lesson) with L11 as capstone — same convention as courses 6 + 7.
- **§6 names the SHA grouping** so readers know L1-L3 span Stage 9a + 9e, not a 1:1 mapping. Avoids the confusion of "why does my code not match SHA X yet" after L1.
- **§Final check** is a single-sentence comprehension test — same convention as courses 6 + 7.
