# Mastering Foundry — L0 draft (EN)

> No openhl SHA pin (this course teaches Foundry itself). The L6 capstone
> ports openhl-liquidation's Stage 10b `InsuranceFund` (openhl SHA
> `260883b`) to Solidity, and lives in-repo at `examples/foundry-capstone/`
> in rethlab — that's where the answer-key Solidity + tests will sit.

## L0 — `foundry-orientation-en`

**Title**: Mastering Foundry — Solidity testing discipline for engineers who already think in Rust

**Duration**: 15 min · **XP**: 50

---

````markdown
# Mastering Foundry — Solidity testing discipline for engineers who already think in Rust

## What you'll build

If you've been through any of rethlab's openhl courses (Consensus, CLOB, Funding, Liquidation, ADL), you've learned a *discipline*: pure-compute primitives, state machines defended by `debug_assert!` + `saturating_arithmetic`, conservation laws proven by `proptest!`, byte-for-byte answer keys. **That discipline transfers to Solidity contracts almost 1-to-1 — and Foundry is the tool that makes the transfer mechanical.**

By the end of this course, you'll have:

- **A Solidity project initialized with `forge init`** that builds, tests, and fuzzes locally with sub-second feedback loops.
- **First-hand experience with `forge fuzz`** — Solidity's `proptest!` equivalent. Same shrinking, same input distribution, same "find the minimal failing input" workflow you learned in L9 of the Liquidation course.
- **`forge invariant` multi-call testing** — the closest Solidity primitive to per-scan conservation laws (Liquidation L13). Define a `Handler`, run thousands of random method-call sequences, assert a property holds at every step.
- **`cast` muscle memory** — the chain CLI most production traders/engineers run dozens of times daily. Read storage slots, call view functions, decode ABIs.
- **`anvil --fork-url` + cheatcodes** — local mainnet replication with `vm.deal` / `vm.warp` / `vm.prank` for state-aware testing. Cheatcodes are precompiles in disguise (see the openhl Precompiles course); Foundry exposes them via Solidity instead of Rust.
- **A capstone**: port openhl-liquidation Stage 10b's `InsuranceFund` from Rust to Solidity, write the L9 conservation-law invariants in Foundry, and prove the same theorem mechanically in two languages.

You'll understand:

- **Why Foundry won the Solidity tooling war**: because it's Rust-built, single-binary, sub-second-feedback, and embeds Revm directly — the same Revm you've been peering into across the openhl courses.
- **Why Hardhat / Truffle / Brownie lost ground**: JS-based, slower, indirect EVM access via remote forks rather than embedded execution.
- **What `forge fuzz` and `forge invariant` actually do under the hood** — they're orchestrating Revm via the same patterns rethlab teaches in `crates/evm` of openhl, just exposed as Solidity-side tests.
- **Why cheatcodes are precompiles** — and why that's the design choice that makes Foundry's test environment so much faster than JS-based alternatives.

## Why this course exists

Most Foundry tutorials answer "how do I use this tool?" This course answers a different question: **"how do I take the rigorous-testing discipline I learned in Rust and apply it to Solidity contracts?"**

The shape of that discipline, repeated across every openhl course:

```
   ┌──────────────────────────────────────────────────────────────┐
   │  rethlab Rust discipline           ←→  Foundry Solidity      │
   │                                          equivalent           │
   ├──────────────────────────────────────────────────────────────┤
   │  cargo test                            forge test              │
   │  proptest! (single-input)              forge fuzz              │
   │  proptest! (sequenced ops)             forge invariant         │
   │  debug_assert!                         require / vm.expectRevert│
   │  saturating_add (consensus)            Solidity 0.8 unchecked  │
   │  conservation laws                     invariant assertions    │
   │  byte-for-byte answer key             reference contract +    │
   │     vs openhl SHA                        forge test corpus     │
   └──────────────────────────────────────────────────────────────┘
```

Every row in the right column is what you'll be writing by L6. The capstone is the *proof* that the left column and the right column are saying the same thing.

## Why Foundry, not Hardhat / Truffle / Brownie

A one-paragraph history: **Foundry replaced the JS-based stack between 2022 and 2024 for serious Ethereum engineering — Truffle is end-of-life, Hardhat survives mostly for deploy scripts and frontend integration, and for L1 / contract / engine work Foundry is now the de facto standard.** For the audience of this course (L1 / infra engineers), **Foundry fluency is a commodity prerequisite — not a competitive advantage.** This course teaches it so the discipline you already have transfers. Three reasons Foundry won:

1. **Speed.** Foundry's test runner embeds Revm directly in-process. There's no IPC round-trip between a JS test runner and a separate `ganache` / `hardhat node`. A 1,000-test suite that takes 60 seconds in Hardhat finishes in 2-3 seconds with `forge test`. The architecture difference:

   ```
      ┌─────────────────────────────────────────────────────────┐
      │  Hardhat / Truffle (out-of-process — slow)              │
      ├─────────────────────────────────────────────────────────┤
      │   ┌────────────┐    JSON-RPC over    ┌────────────────┐│
      │   │ JS test    │  ◄── IPC / TCP ──►  │ hardhat node    ││
      │   │ runner     │   (eth_sendRaw...,   │ (separate proc)││
      │   │ (mocha)    │   eth_call, ...)    │  embeds EVM    ││
      │   └────────────┘                     └────────────────┘│
      │            ↑ ~1ms per call, ×1000s of calls per test    │
      └─────────────────────────────────────────────────────────┘

      ┌─────────────────────────────────────────────────────────┐
      │  Foundry (in-process — fast)                            │
      ├─────────────────────────────────────────────────────────┤
      │   ┌─────────────────────────────────────────────────┐  │
      │   │   forge test (single Rust binary)                │  │
      │   │   ┌──────────────┐     direct fn calls           │  │
      │   │   │  Solidity    │  ───────────────►             │  │
      │   │   │  test runner │     Revm execution            │  │
      │   │   └──────────────┘     (same process)            │  │
      │   └─────────────────────────────────────────────────┘  │
      │            ↑ ~µs per call, no IPC, no serialization     │
      └─────────────────────────────────────────────────────────┘
   ```

   The 20-30× speedup isn't an optimization — it's an architectural consequence of removing the process boundary.
2. **Fuzzing as a first-class primitive.** Hardhat had property-based testing as a plugin. Foundry shipped it built-in, with shrinking, with corpus persistence, with invariant testing for sequenced calls. The closest JS equivalent (`fast-check` + Hardhat) requires non-trivial wiring.
3. **Cheatcodes-as-precompiles.** Hardhat's `evm_snapshot` / `evm_increaseTime` are JSON-RPC methods that ask a remote node to change its state. Foundry's `vm.warp` / `vm.deal` / `vm.prank` are Solidity calls to a magic precompile at address `0x7109709ECfa91a80626fF3989D68f67F5b1DD12D` that **hacks Revm's state from the inside** — same process, no IPC, no remote-node trust. For readers who came through the openhl Precompiles course (Stage 9), this is the *same precompile-as-EVM-superpower pattern* you learned in Rust, exposed via Solidity for testing. Faster, more composable, and (importantly) testable inside the same Solidity file as the contracts they test.

**The strategic implication for an L1 engineer:** if you write or read Reth/Revm/Alloy code (rethlab's existing focus), Foundry is the same toolchain in a different language wrapper. Learning it is not switching ecosystems — it's adding a second language to the same execution engine.

## The discipline transfer — three concrete invariants you'll port

A preview of what L2, L3, and L6 walk through:

### From Liquidation L9 (Rust proptest):

$$\text{amount} + \text{unfilled} = \text{shortfall}$$

The fund returns `WithdrawOutcome { amount, unfilled }`; their sum equals the shortfall the caller passed in. Rust proptest:

```rust
proptest! {
    #[test]
    fn withdraw_amount_plus_unfilled_equals_shortfall(
        initial in 0_i64..1_000_000,
        shortfall in 1_i64..1_000_000,
    ) {
        // ... fund setup, withdraw call ...
        prop_assert_eq!(amount + unfilled, shortfall);
    }
}
```

### To Foundry (forge fuzz) — what L2 teaches:

```solidity
function testFuzz_AmountPlusUnfilledEqualsShortfall(
    uint64 initial,
    uint64 shortfall
) public {
    vm.assume(shortfall > 0 && shortfall < 1_000_000);
    vm.assume(initial < 1_000_000);
    InsuranceFund f = new InsuranceFund(initial);
    (uint64 amount, uint64 unfilled) = f.withdrawShortfall(shortfall);
    assertEq(uint256(amount) + uint256(unfilled), uint256(shortfall));
}
```

Same theorem. Different syntax. The Rust shrinker and the Foundry shrinker behave identically on a counter-example. **By L6 you'll have ported the whole `InsuranceFund` and all four L9 invariants. Same theorem, two languages, both proven mechanically.**

## The 7 lessons

### Module 0 — Orientation
- **L0** (this lesson) — Why Foundry, the discipline-transfer thesis, the 7-lesson roadmap.

### Module 1 — Test discipline (L1–L3) — the core
- **L1** — `forge test` — first invariants, basic assertions, `assertEq` / `vm.expectRevert`, run with `-vvv`. The Solidity equivalent of `cargo test`.
- **L2** — `forge fuzz` — Solidity's `proptest!`. Single-parameter fuzzing, shrinking, corpus persistence. Cross-references Liquidation L9.
- **L3** — `forge invariant` — multi-call invariant testing with `Handler` contracts and `targetContract`. Cross-references Liquidation L13's scanner proptests (per-scan conservation laws).

### Module 2 — CLI + state-aware testing (L4–L5)
- **L4** — `cast` — chain CLI deep dive. `call` / `send` / `storage` / `abi-decode` / `4byte`. Mainnet examples via `ethereum.reth.rs/rpc`.
- **L5** — `anvil --fork-url` + cheatcodes — state-aware testing with `vm.deal` / `vm.warp` / `vm.prank`. Cheatcodes-as-precompiles framing (cross-reference openhl Precompiles course).

### Module 3 — Capstone (L6)
- **L6** — **InsuranceFund.sol + forge invariants** — port openhl-liquidation Stage 10b's `InsuranceFund` from Rust to Solidity, write the L9 conservation-law invariants in Foundry, run 10K iterations, prove the same theorem mechanically in two languages. Answer-key contract + tests sit in-repo at `examples/foundry-capstone/`.

## What's NOT in this course

- **Gas optimization deep dive** — `forge inspect` for gas snapshots is a real topic, but it's optimization, not discipline. Out of scope. (Future course candidate: "Solidity for L1 engineers — gas, storage layouts, bytecode.")
- **Slither / Mythril / formal verification** — Foundry-adjacent but a different tooling family. Not covered.
- **Frontend / ethers.js / viem** — the JS side of the dApp stack. rethlab's audience is L1 / contract / engine engineers; UI is its own concern.
- **Foundry script (`forge script` for deployments)** — covered briefly in L4's `cast send` section. The deployment story is a separate skill from the testing discipline this course teaches.

## License / asset discipline

This course's reference assets — the L6 `InsuranceFund.sol` capstone + the `forge` test corpus — live in-repo at `rethlab/examples/foundry-capstone/`. Pinned to whatever rethlab git SHA the lesson ships at; the reader can `git checkout <sha>` to get a byte-for-byte working copy.

Foundry itself is updated frequently. The course pins to `foundry-rs/foundry` rev (as listed in `foundryup` defaults at the time the course ships). If a future Foundry version breaks any lesson, file a rethlab issue — the course is intended to track current stable Foundry.

## Audience prerequisites

You should already be comfortable with:
- Basic Solidity syntax (you can read a `function` definition and understand `mapping` vs `struct`).
- Running `cargo test` against a Rust crate (rethlab's openhl courses use this pattern throughout).
- Reading rethlab's openhl-liquidation course at least through L9 (where the first `WithdrawOutcome` proptest appears). L6's capstone assumes you've internalized the `InsuranceFund` semantics from that course.

If any of those feel shaky, no problem — the openhl-liquidation course is the natural pre-req, and basic Solidity can be picked up from solidity-by-example.org in an afternoon.

````

---

## Seed-file slot

L0 lands at module 0 / sortOrder 0 in the new course:

```typescript
{
  title: 'Mastering Foundry — Solidity testing discipline for engineers who already think in Rust',
  slug: 'foundry-orientation-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# Mastering Foundry — Solidity testing discipline for engineers who already think in Rust\n\n...`
},
```

Course-level metadata (new):

```typescript
{
  slug: 'mastering-foundry-en',
  title: 'Mastering Foundry — Solidity testing discipline for engineers who already think in Rust',
  description: '...',
  difficulty: 'ADVANCED',
  duration: 220,  // L0..L6 total: 15+25+35+40+25+35+45
  xpReward: 460,  // L0..L6 total: 50+50+70+80+50+70+90
  tags: ['foundry', 'forge', 'anvil', 'cast', 'solidity', 'testing', 'invariants', 'fuzz', 'l1', 'reth'],
  sortOrder: 350,  // between fundamentals (sub-300) and L1 Architect tier (sortOrder 300-340)
  track: 'reth-stack',
  isPublished: true,
},
```

## Style review notes (self-critique before paste)

- **L0 is the shortest lesson** (15 min). Same orientation pattern as ADL L0 and Liquidation L0. Frame the discipline, preview the roadmap, name the prerequisites.
- **The "discipline transfer" thesis is the load-bearing idea** for the whole course. L0 names it three times (intro, "Why this course exists", the comparison table) so the reader walks away with one clear takeaway. Every subsequent lesson will reference it.
- **The comparison table (Rust ↔ Foundry equivalents)** is the visual hook. Most Foundry tutorials would compare Foundry to Hardhat. This course compares Foundry to *Rust testing*. That positioning is what makes rethlab's version different from Foundry-book.
- **The math-and-code preview** (L9 proptest in Rust, then forge fuzz in Solidity) is the most concrete "what's coming" element. A reader who sees these two snippets side-by-side knows exactly what the course delivers.
- **What's NOT in this course** section is honest scoping. Foundry has a huge surface area; pretending to cover all of it would dilute the discipline thesis. Naming the omissions makes the focus credible.
- **The license / asset discipline section** is short by design. The in-repo `examples/foundry-capstone/` is a simple, single-source-of-truth answer key. No external repo dependency.
