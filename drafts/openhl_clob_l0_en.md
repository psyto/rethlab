# Building OpenHL CLOB — L0 draft (EN) — build-along

> Drafted against openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine) + `428cc26` (Stage 8d — fills flow into bridge payloads). This is **course 7 of 10** in the L1 Architect track, the second of the openhl-based build-along courses.
> Course: `building-openhl-clob-en` (track: `reth-l1-architect`).

---

## L0 — `openhl-clob-orientation-en`

- **Module:** 0 (Orientation), sortOrder 0 within module
- **Course-level sortOrder:** -1 (lesson 0 of ~12)
- **Duration:** 15 min
- **XP reward:** 50
- **Type:** CONTENT

### Content

````markdown
# Build OpenHL CLOB — adding the matching engine on top of the Reth substrate

The previous course (`building-openhl-consensus`) ended with a single-validator BFT chain that decides blocks through a real Reth EVM in 0.02 seconds. **It decides empty blocks.** No transactions. No matching. No price discovery.

This course adds the **CLOB matching engine** — the part of Hyperliquid that turns "I want to buy 10 HYPE at $25" + "I want to sell 5 HYPE at $25" into a real fill. Stage 8a (701 lines) builds the pure state machine; Stage 8d (171 lines) wires it into the bridge so committed blocks now carry the fills the matching engine produced.

By the end of this course, `cargo test clob_fills_flow_into_payload` passes — a real fill flows from the matching engine through `LiveRethEvmBridge::build_payload` and into a payload that consensus then commits.

## 1. What you'll have at the end

A new `crates/clob/` crate with:

- **A price-time-priority matching engine** that runs in microseconds — pure state machine, no I/O, fully deterministic.
- **`Book` + `Order` + `Fill` types** that match what a CEX would call its order book.
- **12 tests passing**: 9 hand-traced scenarios (empty book, FIFO priority, market-order liquidity exhaustion, partial fills, cancellation, no-crossed-book post-match) and 3 proptest invariants exercising 768 random scenarios (quantity conservation, no-crossed-book always, determinism = replayability).

And a new integration test in `crates/evm/`:

- **`clob_fills_flow_into_payload`** — bootstraps a real Reth node, submits a maker bid + crossing taker sell to the bridge's CLOB, asserts the resulting fill appears in the next `build_payload` output, and asserts that **earlier payloads weren't retroactively filled** (drain semantics are forward-only).

By the time you finish, you can:

- Explain why a price-time-priority CLOB is the canonical structure for on-chain perpetual exchanges
- Reason about the trade-offs between matching engines that buffer fills (this one) vs those that emit them synchronously
- Reproduce the matching logic from scratch — and modify it (e.g., to support stop orders, post-only orders, or pro-rata matching) by knowing where to cut into the code

## 2. What you won't have at the end

This course covers **Stage 8a + 8d only**. It does NOT cover:

- Stage 9: custom EVM precompiles that read/write CLOB state (= course 8)
- Stage 8b: funding rate state machine (= course 9)
- Encoding fills as EVM-executable transactions (= future work past Stage 9 in openhl itself)
- Liquidations, mark-vs-index pricing, leverage limits

When you finish this course you have a **working matching engine producing fills into committed blocks**, but those fills are still a parallel list — not yet executable as Ethereum transactions readable by smart contracts. That's what course 8 adds via custom EVM precompiles.

This is honest scoping. A CLOB engine without execution wiring is half the story; the other half (precompiles) is course 8.

## 3. Prerequisites

You need:

- **`building-openhl-consensus` complete** — or, equivalently, a workspace at the end-of-course-6 state. Your `crates/evm/src/live_node.rs` should already have `LiveRethEvmBridge<P>` with `provider`, `chain_spec`, `validator`, and optional `engine_handle` fields. If yours doesn't, work through course 6 first.
- **Rust 1.95+** — openhl's `rust-toolchain.toml` pins `1.95.0`. Same prerequisite as course 6.
- **Comfort with `BTreeMap`, `VecDeque`, `Reverse<T>`, and proptest.** If "natural ordering" and "reverse-ordering trick to walk highest-first" are unfamiliar, skim the `std::collections::BTreeMap` docs first.

You do **not** need:

- Any prior matching-engine experience (we'll build the data structures from scratch)
- Any prior order-book reading skill (the test scenarios walk every step)
- Multi-validator setup (still single-validator throughout)

## 4. Setup confirmation (do this now)

You should already have the two-directory workflow from course 6:

- `~/code/my-openhl/` — your workspace
- `~/code/openhl-reference/` — read-only `psyto/openhl` clone

Bring the reference repo up to date in case Stage 8 commits are newer than your clone:

```bash
cd ~/code/openhl-reference
git fetch origin
git log --oneline | head -15
# You should see commits up to and including SHA 0cac571 (Stage 7d) and
# 428cc26 (Stage 8d).
```

Then confirm your workspace is at the end-of-course-6 state:

```bash
cd ~/code/my-openhl
cargo test -p openhl-evm --release 2>&1 | tail -10
# Expect: roughly 38 tests pass workspace-wide, including
# - reth_dev_node_bootstraps (L11 of course 6)
# - live_bridge_builds_on_real_genesis (L12-L13 of course 6)
# - commit_sends_forkchoice_to_engine_when_handle_installed (L14 of course 6)
```

If those tests pass, you're at the right starting point. If they don't, finish course 6 first.

> 🛑 **Anti-fluency.** "I'll just `git clone psyto/openhl` and start course 7 against that codebase." **You can — but you'll miss the friction.** This course is build-along: you write the matching engine from scratch in `my-openhl/` and diff against the reference. If you start in `openhl-reference` you're back in "type from the answer key" mode, which we discussed in course 6 §7.

## 5. The 12-lesson map

| # | Module | What you build | End-of-lesson test |
| - | - | - | - |
| **L0** | Orientation | (this lesson) | setup confirmed |
| **L1** | CLOB types | newtypes — `AccountId`, `OrderId`, `Price`, `Qty`, `Side`, `OrderType` | `cargo check -p openhl-clob` |
| **L2** | CLOB types | `Order`, `Fill`, `FillResult` | types compile |
| **L3** | Matching engine | `Book` struct + `Reverse<Price>` trick + accessors | `cargo check -p openhl-clob` |
| **L4** | Matching engine | `submit_order` — Limit order, in-book matching | matches resting orders |
| **L5** | Matching engine | `submit_order` — Market orders + crossing + partial fills | edge-case behaviour |
| **L6** | Matching engine | `cancel` + empty-level cleanup | cancel-by-id works |
| **L7** | Testing | 9 hand-traced unit tests | all 9 pass |
| **L8** | Testing | 3 proptest invariants (qty conservation, no-crossed-book, determinism) | 768 random scenarios pass |
| **L9** | Bridge integration | Add `clob` + `pending_fills` to `LiveRethEvmBridge`; `submit_order` method | bridge compiles |
| **L10** | Bridge integration | `build_payload` drains pending fills; `payload_fills(id)` inspector | fills appear in payload |
| **L11** | Bridge integration | `clob_fills_flow_into_payload` integration test | **full pipeline test passes** |
| **L12** | Capstone | recap, what's next (precompiles via course 8) | (no test — recap) |

**L11 is the milestone.** Finishing L11, you have a fill produced by the matching engine flowing through the BFT engine into a real block. L12 names what's still missing (the fills aren't yet readable from smart contracts — that's course 8).

## 6. The answer-key discipline (same as course 6)

Every lesson L1–L11 cites either SHA `55a9dff` (Stage 8a) or `428cc26` (Stage 8d). After your lesson test passes:

```bash
cd ~/code/openhl-reference
git checkout 55a9dff    # or 428cc26 for L9-L11
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
# (etc.)
```

Match meaningfully — same types, same control flow. Whitespace and naming will differ.

> 🛑 **Anti-fluency.** "I already know how a CLOB works, I can skip to L9 and just learn the bridge integration." **You can — but L1–L8 encode design decisions that matter when you modify the engine later.** Reverse-ordered bids, FIFO within price levels, the cancel-then-cleanup invariant — none of these are obvious unless you build them. Skipping L1–L8 means you can read the code but you can't change it safely.

## 7. Setup confirmation — the actual L0 exercise

Before L1, run all of these and confirm they pass:

```bash
# 1. Rust version
rustc --version    # expect: rustc 1.95.x or later

# 2. End-of-course-6 state
cd ~/code/my-openhl && cargo test -p openhl-evm --release
# Expect: trailing line `test result: ok. 3 passed; 0 failed; ...`

# 3. Reference repo has Stage 8 commits
cd ~/code/openhl-reference && git log --oneline | grep -E "(55a9dff|428cc26)"
# Expect: both SHAs appear
```

If all three pass, you're ready for L1.

> **Final check.** In one sentence, what does this course add that course 6 didn't have? If your answer doesn't mention "a matching engine producing fills that flow into committed blocks", re-read §1.
````

---

## Seed-file slot

L0 lands in Module 0 (Orientation), sortOrder 0:

```typescript
{
  title: 'Build OpenHL CLOB — adding the matching engine on top of the Reth substrate',
  slug: 'openhl-clob-orientation-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# Build OpenHL CLOB — adding the matching engine on top of the Reth substrate\n\n...`
},
```

## SHA pinning table for course 7

| Lesson | openhl Stage | SHA |
| - | - | - |
| L1-L8 | Stage 8a (split across 8 lessons) | `55a9dff` |
| L9-L11 | Stage 8d (split across 3 lessons) | `428cc26` |
| L12 | (capstone) | n/a |

## Style review notes (self-critique before paste)

- **L0 is shorter than course 6's L0 (15 min vs 20 min).** Justified because course 7 readers have course 6 background — less prerequisite setup explanation needed, and the scope-cut section can be more concise.
- **§3 (prerequisites)** explicitly requires course 6 completion. This is the cleanest dependency contract and avoids vague "make sure you know consensus" pre-conditions.
- **§4 (setup confirmation)** is shorter than course 6's because the workspace already exists. Just verify the test landscape.
- **The 12-lesson map** is provisional; if individual lessons turn out to be too big or too small as I draft them, the map updates.
- **L11 is the milestone** (not the final lesson), with L12 as capstone — same pattern as course 6 (where L14 was the milestone and L15 was capstone).
