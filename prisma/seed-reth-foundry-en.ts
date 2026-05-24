// AUTO-GENERATED from drafts/foundry_*_en.md by .github/scripts/build-foundry-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethFoundryEN(prisma: PrismaClient) {
  const tags = ["foundry","forge","anvil","cast","solidity","testing","invariants","fuzz","l1","reth"];

  await prisma.course.create({
    data: {
      slug: "mastering-foundry-en",
      title: "Mastering Foundry — Solidity testing discipline for engineers who already think in Rust",
      description:
        "The rigorous-testing discipline you learned in rethlab's openhl courses (proptest! conservation laws, debug_assert! routing contracts, byte-for-byte answer keys against openhl SHAs) transfers to Solidity contracts almost 1:1 — and Foundry is the tool that makes the transfer mechanical. This course teaches forge test / fuzz / invariant + cast + anvil for L1 / contract / engine engineers who already think in Rust. By the L6 capstone, you'll have ported openhl-liquidation Stage 10b's InsuranceFund from Rust to Solidity and proven the same 4 conservation invariants with forge — same theorem, two languages, both mechanically proven. Foundry mastery is now a commodity prerequisite for serious L1 work; this course assumes you already have the discipline and gives you the Solidity syntax. 7 lessons across 4 modules, openhl SHA references via L6 capstone, in-repo answer keys at examples/foundry-capstone/.",
      difficulty: "ADVANCED",
      duration: 145,
      xpReward: 310,
      track: "reth-stack",
      tags,
      isPublished: true,
      sortOrder: 350,
      locale: "en",
      instructorName: "RethLab",
      modules: {
        create: [
          {
            title: "Orientation",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "Mastering Foundry — Solidity testing discipline for engineers who already think in Rust",
                  slug: "foundry-orientation-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# Mastering Foundry — Solidity testing discipline for engineers who already think in Rust

## What you'll build

If you've been through any of rethlab's openhl courses (Consensus, CLOB, Funding, Liquidation, ADL), you've learned a *discipline*: pure-compute primitives, state machines defended by \`debug_assert!\` + \`saturating_arithmetic\`, conservation laws proven by \`proptest!\`, byte-for-byte answer keys. **That discipline transfers to Solidity contracts almost 1-to-1 — and Foundry is the tool that makes the transfer mechanical.**

By the end of this course, you'll have:

- **A Solidity project initialized with \`forge init\`** that builds, tests, and fuzzes locally with sub-second feedback loops.
- **First-hand experience with \`forge fuzz\`** — Solidity's \`proptest!\` equivalent. Same shrinking, same input distribution, same "find the minimal failing input" workflow you learned in L9 of the Liquidation course.
- **\`forge invariant\` multi-call testing** — the closest Solidity primitive to per-scan conservation laws (Liquidation L13). Define a \`Handler\`, run thousands of random method-call sequences, assert a property holds at every step.
- **\`cast\` muscle memory** — the chain CLI most production traders/engineers run dozens of times daily. Read storage slots, call view functions, decode ABIs.
- **\`anvil --fork-url\` + cheatcodes** — local mainnet replication with \`vm.deal\` / \`vm.warp\` / \`vm.prank\` for state-aware testing. Cheatcodes are precompiles in disguise (see the openhl Precompiles course); Foundry exposes them via Solidity instead of Rust.
- **A capstone**: port openhl-liquidation Stage 10b's \`InsuranceFund\` from Rust to Solidity, write the L9 conservation-law invariants in Foundry, and prove the same theorem mechanically in two languages.

You'll understand:

- **Why Foundry won the Solidity tooling war**: because it's Rust-built, single-binary, sub-second-feedback, and embeds REVM directly — the same REVM you've been peering into across the openhl courses.
- **Why Hardhat / Truffle / Brownie lost ground**: JS-based, slower, indirect EVM access via remote forks rather than embedded execution.
- **What \`forge fuzz\` and \`forge invariant\` actually do under the hood** — they're orchestrating REVM via the same patterns rethlab teaches in \`crates/evm\` of openhl, just exposed as Solidity-side tests.
- **Why cheatcodes are precompiles** — and why that's the design choice that makes Foundry's test environment so much faster than JS-based alternatives.

## Why this course exists

Most Foundry tutorials answer "how do I use this tool?" This course answers a different question: **"how do I take the rigorous-testing discipline I learned in Rust and apply it to Solidity contracts?"**

The shape of that discipline, repeated across every openhl course:

\`\`\`
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
\`\`\`

Every row in the right column is what you'll be writing by L6. The capstone is the *proof* that the left column and the right column are saying the same thing.

## Why Foundry, not Hardhat / Truffle / Brownie

A one-paragraph history: **Foundry replaced the JS-based stack between 2022 and 2024 for serious Ethereum engineering — Truffle is end-of-life, Hardhat survives mostly for deploy scripts and frontend integration, and for L1 / contract / engine work Foundry is now the de facto standard.** For the audience of this course (L1 / infra engineers), **Foundry fluency is a commodity prerequisite — not a competitive advantage.** This course teaches it so the discipline you already have transfers. Three reasons Foundry won:

1. **Speed.** Foundry's test runner embeds REVM directly in-process. There's no IPC round-trip between a JS test runner and a separate \`ganache\` / \`hardhat node\`. A 1,000-test suite that takes 60 seconds in Hardhat finishes in 2-3 seconds with \`forge test\`. The architecture difference:

   \`\`\`
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
      │   │   │  test runner │     REVM execution            │  │
      │   │   └──────────────┘     (same process)            │  │
      │   └─────────────────────────────────────────────────┘  │
      │            ↑ ~µs per call, no IPC, no serialization     │
      └─────────────────────────────────────────────────────────┘
   \`\`\`

   The 20-30× speedup isn't an optimization — it's an architectural consequence of removing the process boundary.
2. **Fuzzing as a first-class primitive.** Hardhat had property-based testing as a plugin. Foundry shipped it built-in, with shrinking, with corpus persistence, with invariant testing for sequenced calls. The closest JS equivalent (\`fast-check\` + Hardhat) requires non-trivial wiring.
3. **Cheatcodes-as-precompiles.** Hardhat's \`evm_snapshot\` / \`evm_increaseTime\` are JSON-RPC methods that ask a remote node to change its state. Foundry's \`vm.warp\` / \`vm.deal\` / \`vm.prank\` are Solidity calls to a magic precompile at address \`0x7109709ECfa91a80626fF3989D68f67F5b1DD12D\` that **hacks REVM's state from the inside** — same process, no IPC, no remote-node trust. For readers who came through the openhl Precompiles course (Stage 9), this is the *same precompile-as-EVM-superpower pattern* you learned in Rust, exposed via Solidity for testing. Faster, more composable, and (importantly) testable inside the same Solidity file as the contracts they test.

**The strategic implication for an L1 engineer:** if you write or read Reth/REVM/Alloy code (rethlab's existing focus), Foundry is the same toolchain in a different language wrapper. Learning it is not switching ecosystems — it's adding a second language to the same execution engine.

## The discipline transfer — three concrete invariants you'll port

A preview of what L2, L3, and L6 walk through:

### From Liquidation L9 (Rust proptest):

$$\\text{amount} + \\text{unfilled} = \\text{shortfall}$$

The fund returns \`WithdrawOutcome { amount, unfilled }\`; their sum equals the shortfall the caller passed in. Rust proptest:

\`\`\`rust
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
\`\`\`

### To Foundry (forge fuzz) — what L2 teaches:

\`\`\`solidity
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
\`\`\`

Same theorem. Different syntax. The Rust shrinker and the Foundry shrinker behave identically on a counter-example. **By L6 you'll have ported the whole \`InsuranceFund\` and all four L9 invariants. Same theorem, two languages, both proven mechanically.**

## The 7 lessons

### Module 0 — Orientation
- **L0** (this lesson) — Why Foundry, the discipline-transfer thesis, the 7-lesson roadmap.

### Module 1 — Test discipline (L1–L3) — the core
- **L1** — \`forge test\` — first invariants, basic assertions, \`assertEq\` / \`vm.expectRevert\`, run with \`-vvv\`. The Solidity equivalent of \`cargo test\`.
- **L2** — \`forge fuzz\` — Solidity's \`proptest!\`. Single-parameter fuzzing, shrinking, corpus persistence. Cross-references Liquidation L9.
- **L3** — \`forge invariant\` — multi-call invariant testing with \`Handler\` contracts and \`targetContract\`. Cross-references Liquidation L13's scanner proptests (per-scan conservation laws).

### Module 2 — CLI + state-aware testing (L4–L5)
- **L4** — \`cast\` — chain CLI deep dive. \`call\` / \`send\` / \`storage\` / \`abi-decode\` / \`4byte\`. Mainnet examples via \`ethereum.reth.rs/rpc\`.
- **L5** — \`anvil --fork-url\` + cheatcodes — state-aware testing with \`vm.deal\` / \`vm.warp\` / \`vm.prank\`. Cheatcodes-as-precompiles framing (cross-reference openhl Precompiles course).

### Module 3 — Capstone (L6)
- **L6** — **InsuranceFund.sol + forge invariants** — port openhl-liquidation Stage 10b's \`InsuranceFund\` from Rust to Solidity, write the L9 conservation-law invariants in Foundry, run 10K iterations, prove the same theorem mechanically in two languages. Answer-key contract + tests sit in-repo at \`examples/foundry-capstone/\`.

## What's NOT in this course

- **Gas optimization deep dive** — \`forge inspect\` for gas snapshots is a real topic, but it's optimization, not discipline. Out of scope. (Future course candidate: "Solidity for L1 engineers — gas, storage layouts, bytecode.")
- **Slither / Mythril / formal verification** — Foundry-adjacent but a different tooling family. Not covered.
- **Frontend / ethers.js / viem** — the JS side of the dApp stack. rethlab's audience is L1 / contract / engine engineers; UI is its own concern.
- **Foundry script (\`forge script\` for deployments)** — covered briefly in L4's \`cast send\` section. The deployment story is a separate skill from the testing discipline this course teaches.

## License / asset discipline

This course's reference assets — the L6 \`InsuranceFund.sol\` capstone + the \`forge\` test corpus — live in-repo at \`rethlab/examples/foundry-capstone/\`. Pinned to whatever rethlab git SHA the lesson ships at; the reader can \`git checkout <sha>\` to get a byte-for-byte working copy.

Foundry itself is updated frequently. The course pins to \`foundry-rs/foundry\` rev (as listed in \`foundryup\` defaults at the time the course ships). If a future Foundry version breaks any lesson, file a rethlab issue — the course is intended to track current stable Foundry.

## Audience prerequisites

You should already be comfortable with:
- Basic Solidity syntax (you can read a \`function\` definition and understand \`mapping\` vs \`struct\`).
- Running \`cargo test\` against a Rust crate (rethlab's openhl courses use this pattern throughout).
- Reading rethlab's openhl-liquidation course at least through L9 (where the first \`WithdrawOutcome\` proptest appears). L6's capstone assumes you've internalized the \`InsuranceFund\` semantics from that course.

If any of those feel shaky, no problem — the openhl-liquidation course is the natural pre-req, and basic Solidity can be picked up from solidity-by-example.org in an afternoon.
`,
                },
              ],
            },
          },
          {
            title: "Test discipline",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "Lesson 1 — forge test — the Solidity equivalent of cargo test",
                  slug: "foundry-forge-test-basics-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 50,
                  content: `# Lesson 1 — \`forge test\` — the Solidity equivalent of \`cargo test\`

## Goal

Concepts you'll grasp in this lesson:

- **The \`forge init\` project shape is the Foundry equivalent of \`cargo new --lib\`.** Same disciplined directory layout (\`src/\`, \`test/\`, \`lib/\`, \`foundry.toml\`) the way Rust uses (\`src/\`, \`tests/\`, \`target/\`, \`Cargo.toml\`). If you've written a Rust crate, you already know how Foundry organizes contracts and tests; the names are slightly different but the *roles* map 1:1.
- **\`forge test\` is the binary that lives at the same place in your daily loop as \`cargo test\`.** Same sub-second feedback after the first compile, same \`--match-*\` filtering, same convention that test functions are picked up by name (Rust: \`#[test]\` attribute; Foundry: function name starts with \`test\`). The two tools intentionally converge on the same workflow because Foundry's authors are Rust-native and built the muscle memory there first.
- **\`assertEq\` / \`assertTrue\` / \`vm.expectRevert\` are the three primitives** that 90% of unit tests use. \`assertEq\` for value equality (with overloads for every Solidity primitive type), \`assertTrue\` for boolean conditions, \`vm.expectRevert\` for negative-path tests (asserting that the next call MUST revert with a specific reason). Cross-references to Rust: \`assertEq\` ↔ \`assert_eq!\`, \`vm.expectRevert\` ↔ \`#[should_panic]\` or \`assert!(matches!(result, Err(_)))\`.
- **Verbosity ramps from \`-v\` (silent) to \`-vvvvv\` (full call trace).** \`-vvv\` is the daily default — shows failed tests with full storage dumps. \`-vvvvv\` is for debugging weird reverts and includes opcode traces. Cross-reference to Rust: \`cargo test -- --nocapture\` gives you \`println!\` output; Foundry's \`-vvv\` gives you the Solidity equivalent plus storage diffs the EVM saw at each step.

Verification:

\`\`\`bash
forge test
\`\`\`

…runs the two tests from \`forge init\`'s default Counter contract. After this lesson you'll have added one negative-path test (\`vm.expectRevert\`) for a total of three; the lesson ends with all three green.

Specific changes:

- **\`src/Counter.sol\`** — unchanged from \`forge init\` default (you'll *read* it, not edit it).
- **\`test/Counter.t.sol\`** — appends one new test function (\`test_RevertWhen_DecrementBelowZero\`) that exercises the underflow-revert path. Demonstrates \`vm.expectRevert\` against Solidity 0.8's built-in overflow check.

Total: ~10 lines of test code added. L1 is about ergonomics and the test-discovery loop, not about a clever assertion.

## Recap

After L0:
- The course's positioning is clear: same theorem, two languages, port the rethlab Rust discipline to Solidity.
- The roadmap is 7 lessons: orientation (L0) → test discipline (L1–L3) → CLI + state-aware testing (L4–L5) → capstone (L6).
- You've installed Foundry (\`curl -L https://foundry.paradigm.xyz | bash && foundryup\`) and the \`forge\`, \`cast\`, \`anvil\`, \`chisel\` binaries are on your \`$PATH\`.

L1 starts the test-discipline track. The first verb is \`forge test\`.

## Plan

Three edits:

1. **\`forge init my-project && cd my-project\`** — creates the standard Foundry project layout. Read what's produced before touching anything.
2. **Read \`src/Counter.sol\` and \`test/Counter.t.sol\`** as-is — they ship with \`forge init\` and demonstrate the conventions. Understand each line.
3. **Append one new test** to \`test/Counter.t.sol\`: \`test_RevertWhen_DecrementBelowZero\` that triggers a runtime underflow via the constant-folding-resistant \`uint256 zero = 0; counter.setNumber(zero - 1);\` pattern, with \`vm.expectRevert\` armed beforehand. Run with \`forge test -vvv\` to see the full trace.

> 🛑 **Predict.** Before reading the \`forge init\` output below: list the Foundry equivalents of these Rust files:
> 
> - \`Cargo.toml\` →
> - \`src/lib.rs\` →
> - \`tests/integration_test.rs\` →
> - \`target/\` →
> - \`Cargo.lock\` →

(Answer: \`Cargo.toml\` → \`foundry.toml\`, \`src/lib.rs\` → \`src/Counter.sol\` (or whatever you named your main contract), \`tests/integration_test.rs\` → \`test/Counter.t.sol\`, \`target/\` → \`out/\` + \`cache/\`, \`Cargo.lock\` → no direct equivalent (Foundry uses git submodules in \`lib/\` for dependencies, with \`lib/forge-std\` as the standard testing library always present). The mapping is intentional: the Foundry team built it to feel familiar to Rust developers because that's their own background.)

## The \`forge init\` project shape — a one-page tour

\`\`\`
   my-project/
   ├── foundry.toml         ← Like Cargo.toml: profile config, deps, compiler flags
   ├── src/                  ← Like src/: production contracts live here
   │   └── Counter.sol       ←   The default starter contract
   ├── test/                 ← Like tests/: integration tests live here
   │   └── Counter.t.sol     ←   The default starter tests (note .t.sol convention)
   ├── script/               ← Foundry-only: deployment scripts live here (covered L4)
   │   └── Counter.s.sol     ←   Default deploy script
   ├── lib/                  ← Like Cargo's deps cache, but git submodules
   │   └── forge-std/        ←   The standard test library — always present
   ├── README.md
   └── .gitignore            ← Pre-configured to ignore out/ and cache/
\`\`\`

Four things to notice about the layout:

1. **\`.t.sol\` and \`.s.sol\` are file-naming conventions, not enforced by the compiler.** Foundry treats any contract in \`test/\` whose function names start with \`test\` as a test. The \`.t.sol\` suffix is a human-readable convention so you can grep \`*.t.sol\` to find all your test files. Same convention applies to \`.s.sol\` for scripts. **Foundry uses naming conventions where Rust uses attributes; the discipline is the same.**
2. **\`lib/forge-std\` is a git submodule, not an npm/cargo dep.** \`forge init\` runs \`forge install foundry-rs/forge-std\`, which clones it into \`lib/\`. Versioning is by git tag or commit. This is genuinely simpler than the Cargo/npm dependency-resolver complexity, at the cost of one git submodule per dep. **Foundry's dep model trades semver complexity for git transparency — you can \`cd lib/forge-std && git log\` to see exactly what code you're depending on.**
3. **\`out/\` and \`cache/\` are gitignored by default.** \`out/\` holds compiled bytecode + ABI JSONs (the equivalent of Rust's \`target/debug/\`). \`cache/\` holds incremental compilation state. Both are safe to delete and re-generate; both should never be committed.
4. **\`script/\` is for deployment scripts (covered briefly in L4).** Foundry combines testing and scripting under the same \`forge\` binary; Hardhat splits them into separate tools (\`hardhat test\` vs \`hardhat run\`). The unification is small but reduces context-switching cost over a day. **One binary, one config, one mental model.**

## Walk-through

### Step 1: \`forge init\` and look around

\`\`\`bash
forge init my-foundry-lab
cd my-foundry-lab
ls -la
\`\`\`

You should see the layout from the previous section. If \`lib/forge-std/\` is empty (network issue during init), run \`forge install foundry-rs/forge-std\` to fix it.

\`\`\`bash
forge test
\`\`\`

Expected output (abbreviated):

\`\`\`
[⠊] Compiling...
[⠒] Compiling 27 files with Solc 0.8.35
[⠢] Solc 0.8.35 finished in 1.49s
Compiler run successful!

Ran 2 tests for test/Counter.t.sol:CounterTest
[PASS] test_Increment() (gas: 31303)
[PASS] testFuzz_SetNumber(uint256) (runs: 256, μ: 31000, ~: 31161)
Suite result: ok. 2 passed; 0 failed; 0 skipped; finished in 5.67ms

Ran 1 test suite in 12.46ms (5.67ms CPU time): 2 tests passed, 0 failed, 0 skipped (2 tests)
\`\`\`

**Two tests, both green.** The first compile takes a few seconds; subsequent runs are sub-second.

Three things to notice about the output format:

1. **\`(gas: 31303)\`** — every test reports gas used. Hardhat doesn't show this by default; Foundry treats gas as a first-class metric. (For consensus-determinism-trained engineers: gas is the EVM's analogue of consensus cost — every validator computes the same gas for the same transaction. Tracking it is part of the discipline.)
2. **\`(runs: 256, μ: 31000, ~: 31161)\`** — that test is a fuzz test (we'll see why in L2). \`runs: 256\` means it ran with 256 random inputs; \`μ\` is mean gas, \`~\` is median. Foundry shows fuzz statistics inline.
3. **\`5.67ms CPU time\`** — Foundry shows wall-clock vs CPU time separately. For parallel test suites, CPU time exceeds wall-clock; for a 2-test suite they're identical.

### Step 2: Read \`src/Counter.sol\`

\`\`\`solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.35;

contract Counter {
    uint256 public number;

    function setNumber(uint256 newNumber) public {
        number = newNumber;
    }

    function increment() public {
        number++;
    }
}
\`\`\`

Five things to notice:

1. **\`pragma solidity ^0.8.35\`** — the \`^\` is a caret-style version constraint (same syntax Cargo uses). Means "any 0.8.35+ version, but not 0.9". Solidity 0.8 is the discipline-line: it introduced built-in overflow checks (no more \`SafeMath\`), which is what makes our \`test_RevertWhen_DecrementBelowZero\` test possible later.
2. **\`uint256 public number\`** — \`public\` auto-generates a getter function (\`number()\`) returning the value. The state variable itself can also be written directly from inside the contract; from outside, only the auto-generated getter is callable. **Solidity collapses \`let pub\` and \`let pub fn ...()\` into one declaration.**
3. **No constructor.** Default initialization: \`number = 0\`. Same default-zero semantics as Rust's \`i64::default()\`.
4. **\`setNumber\` and \`increment\` are \`public\`** — anyone can call them. (Restriction modifiers like \`onlyOwner\` would go here in production; the example is intentionally permissionless.)
5. **No \`decrement\` function exists.** That's a hint. Our new test will *add* a decrement function in the test file (via local construction), then test that it reverts on underflow.

### Step 3: Read \`test/Counter.t.sol\`

\`\`\`solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.35;

import {Test, console} from "forge-std/Test.sol";
import {Counter} from "../src/Counter.sol";

contract CounterTest is Test {
    Counter public counter;

    function setUp() public {
        counter = new Counter();
        counter.setNumber(0);
    }

    function test_Increment() public {
        counter.increment();
        assertEq(counter.number(), 1);
    }

    function testFuzz_SetNumber(uint256 x) public {
        counter.setNumber(x);
        assertEq(counter.number(), x);
    }
}
\`\`\`

Six things to notice:

1. **\`import {Test, console} from "forge-std/Test.sol"\`** — \`Test\` is the base contract every test inherits from. It bundles \`assertEq\` / \`assertTrue\` / \`vm.*\` cheatcodes etc. \`console.log\` is Foundry's \`dbg!\` macro equivalent — print-debugging that doesn't affect the actual contract bytecode.
2. **\`contract CounterTest is Test\`** — your test file is itself a contract that inherits from \`forge-std\`'s \`Test\`. Function inheritance is how you get access to \`assertEq\` and \`vm.*\`. **Solidity's inheritance is the API surface for tooling, where Rust uses traits + \`use\`.**
3. **\`function setUp() public\`** — runs before *every* test function. Same role as Rust's \`#[test]\` per-function init, just centralized in one function. **One \`setUp\` per test contract; if you want per-test setup, you wrap it inside individual test functions.**
4. **\`function test_Increment() public\`** — name starts with \`test\`, marked \`public\`. That's it — no annotations. Foundry's test discovery is *name-based*. **The "underscore-suffix-or-prefix names a kind" convention is Solidity's analogue of Rust's attribute system.**
5. **\`testFuzz_SetNumber(uint256 x)\`** — name starts with \`testFuzz\` AND takes parameters. Foundry interprets this as a fuzz test (covered in L2). \`setNumber(x)\` is called with 256 random \`uint256\` values; the assertion must hold for all of them.
6. **\`assertEq(counter.number(), 1)\`** — equality assertion. \`forge-std\`'s \`Test\` overloads \`assertEq\` for *every* Solidity primitive type (\`uint\`, \`int\`, \`bool\`, \`address\`, \`bytes\`, \`string\`, \`bytes32\`, ...). You don't pick a typed variant; the right overload is selected by the type of your arguments. **One-line assertions, no \`let x = ...; let y = ...; assert_eq!(x, y);\` cascade like in Rust.**

### Step 4: Add a negative-path test with \`vm.expectRevert\`

The Counter contract has \`increment\` but no \`decrement\`. Solidity 0.8 has built-in overflow checks, so subtracting from \`uint256(0)\` reverts with \`Panic(uint256)\` (the underflow panic code, \`0x11\`). We'll write a test that exercises this by triggering the underflow inline as part of the test setup.

Append to \`test/Counter.t.sol\`:

\`\`\`solidity
    function test_RevertWhen_DecrementBelowZero() public {
        // Counter starts at 0 from setUp(). Decrementing should revert
        // with the Solidity 0.8 built-in arithmetic-panic (overflow code 0x11).
        // forge-std's \`Test\` exposes \`vm.expectRevert(bytes)\` for matching
        // arbitrary revert reasons.
        vm.expectRevert();
        // Trick: writing \`uint256(0) - 1\` as a literal would be constant-
        // folded by Solc and rejected at *compile time*. We want the
        // underflow at *runtime* so vm.expectRevert can catch it. Storing
        // the zero in a local variable defeats the constant folder — the
        // subtraction becomes a runtime SUB opcode, which Solidity 0.8
        // wraps with the overflow check that triggers Panic(0x11).
        //
        // Important: \`zero - 1\` evaluates *in this test contract* — the
        // argument to setNumber must be computed before the external call
        // is made. So the panic fires here, in the test contract, and the
        // call to \`counter.setNumber\` is never actually dispatched. A trace
        // (\`forge test -vvvv\`) shows no call into \`counter\`. vm.expectRevert
        // still catches it because it intercepts any revert that occurs
        // between arming and the next external-call site.
        uint256 zero = 0;
        counter.setNumber(zero - 1);
    }
\`\`\`

Six things to notice:

1. **\`test_RevertWhen_<condition>\` is the naming convention** for negative-path tests in Foundry's docs. Not enforced by the test runner — \`forge test\` doesn't care about the suffix — but the convention makes your test list self-documenting. **Naming conventions are documentation when the tooling doesn't enforce structure.**
2. **\`vm.expectRevert()\` with no argument** — matches *any* revert reason. Use the no-arg form when you don't care about the specific reason; use \`vm.expectRevert(bytes)\` when you want to assert a specific reason (we'll see this in L3 with custom errors).
3. **\`vm.expectRevert\` must be called *immediately before* the call you expect to revert.** It's not a wrapper; it's a one-shot cheatcode that arms the next external call. If you call something else between \`expectRevert\` and the target, the cheatcode triggers on the wrong call and your test fails confusingly. The lifetime is exactly one call:

   \`\`\`
      Time ──►

      ┌──────────────────────────────────────────────────────────┐
      │  CORRECT — vm.expectRevert arms the very next ext call    │
      ├──────────────────────────────────────────────────────────┤
      │   vm.expectRevert();      ←─── arms the trap              │
      │   counter.setNumber(...); ←─── trap fires, expects revert │
      │                            ✓  test passes if call reverts │
      └──────────────────────────────────────────────────────────┘

      ┌──────────────────────────────────────────────────────────┐
      │  WRONG — intervening call consumes the arm prematurely    │
      ├──────────────────────────────────────────────────────────┤
      │   vm.expectRevert();      ←─── arms the trap              │
      │   counter.number();       ←─── trap fires HERE, doesn't   │
      │                            ✗      revert → arm consumed   │
      │   counter.setNumber(...); ←─── runs unarmed, actual revert│
      │                                  is NOT caught by the test │
      └──────────────────────────────────────────────────────────┘
   \`\`\`

   **\`vm.expectRevert\` has a 1-call lifetime; respect the ordering.**
4. **The \`uint256 zero = 0; zero - 1\` pattern is the constant-folding workaround.** Writing \`uint256(0) - 1\` as a literal expression looks identical but doesn't compile — Solc 0.8 evaluates literal arithmetic at compile time, sees the underflow, and rejects the source. Storing zero in a local variable opaques it past the constant folder; the SUB opcode runs at runtime, and the *runtime* overflow check (which Solidity 0.8 inserts around every arithmetic op outside \`unchecked {}\`) is what triggers \`Panic(0x11)\`. **Compile-time and runtime overflow checks live at different layers; the pattern you write determines which one fires.** Subtle but worth knowing: the SUB opcode runs *inside this test contract* while computing the argument — so the panic fires before the external call to \`counter.setNumber\` is ever dispatched. A \`-vvvv\` trace shows no call into \`counter\`; the test passes because \`vm.expectRevert\` catches any revert that happens between arming and the next external-call site, including reverts inside the test contract itself.
5. **The comment block walks the test's intent step-by-step.** Same \`math-walk in comments\` discipline from openhl-liquidation L13's tests. A future reader debugging a failure reads the comment and re-derives the expected behavior. **Math-walk comments turn one test into a worked example of the EVM behavior under test.**
6. **No \`decrement()\` was added to \`Counter.sol\`** — we triggered the underflow inside the test directly. This keeps the production contract unchanged while still exercising the behavior. For production contracts with real \`decrement\` methods, the test would \`counter.decrement()\` directly. **Tests can construct minimal scenarios without modifying the contract under test.**

### Step 5: Run with \`forge test -vvv\`

\`\`\`bash
forge test -vvv
\`\`\`

Expected output (abbreviated):

\`\`\`
Ran 3 tests for test/Counter.t.sol:CounterTest
[PASS] testFuzz_SetNumber(uint256) (runs: 256, μ: 31000, ~: 31161)
[PASS] test_Increment() (gas: 31303)
[PASS] test_RevertWhen_DecrementBelowZero() (gas: 8957)
Suite result: ok. 3 passed; 0 failed; 0 skipped; finished in 7.12ms
\`\`\`

**Three tests passing.** Notice the gas cost of \`test_RevertWhen_DecrementBelowZero\` (~9k) is much lower than the others (~31k) — because the EVM only got partway through the call before reverting. **Reverts are cheaper than successes; the SSTORE that would have happened on the successful path is what costs the gas.**

To intentionally break the test and see what \`-vvv\` shows on failure, change the test temporarily:

\`\`\`solidity
vm.expectRevert();
counter.setNumber(42); // This will NOT revert; the test should fail.
\`\`\`

Re-run \`forge test -vvv\`. You'll see:

\`\`\`
[FAIL: call did not revert as expected] test_RevertWhen_DecrementBelowZero() (gas: ...)
\`\`\`

\`-vvv\` adds storage traces; \`-vvvvv\` adds opcode-level traces. The verbosity is your debug tool.

Revert the test back to the original passing version before continuing.

Common errors:

- **\`Source "forge-std/Test.sol" not found\`** — you didn't run \`forge install foundry-rs/forge-std\` and \`lib/forge-std/\` is empty. Run it now. (\`forge init\` usually does this for you, but a network hiccup can skip it.)
- **\`Error: test_RevertWhen_DecrementBelowZero() FAILED. Reason: call did not revert as expected\`** — your Solidity version isn't 0.8.x and lacks the built-in overflow check. Check \`pragma solidity ^0.8.35\` is at the top of \`Counter.sol\`.
- **\`compile error: not found: Counter\`** — your import path is wrong. The test file says \`import {Counter} from "../src/Counter.sol"\`; double-check the relative path.

### Step 6: Filter tests with \`--match-test\`

\`\`\`bash
forge test --match-test test_Increment -vvv
\`\`\`

Runs only the \`test_Increment\` test, ignoring the fuzz test and the revert test. Useful when iterating on one test at a time — Foundry's compile cache means subsequent runs of a single test take ~50ms.

Other useful filters:

- \`--match-contract CounterTest\` — run all tests in a specific contract
- \`--match-path 'test/Counter.t.sol'\` — run all tests in a specific file
- \`--no-match-test testFuzz_SetNumber\` — skip a specific test (\`!\`-style negation)

**Cross-reference to Rust:** \`forge test --match-test foo\` is exactly \`cargo test foo\` — partial-name match. The \`--match-*\` family makes it more explicit which axis you're filtering on. **When tooling converges on the same workflow, the syntax converges too.**

## Design reflection

Three load-bearing decisions that shaped Foundry's \`forge test\`:

1. **Tests live in Solidity, not in JavaScript.** Hardhat tests are JS files calling into a contract via ethers.js. Foundry tests *are* contracts — same language as production code, same compiler, same bytecode. This collapses one entire layer of context-switching. **When test code and production code share a compiler, you can \`import {Counter} from "../src/Counter.sol"\` and statically type-check the entire test surface.**

2. **Test discovery is by name, not by attribute.** Foundry doesn't need \`@Test\` annotations because Solidity doesn't have decorators. Functions named \`test*\` are tests. The convention is enforced by \`forge\`'s grep through the test contract's function list. **Conventions documented in tooling output are equivalent to attributes for the human reader; both produce the "this is a test" signal.**

3. **\`vm.*\` cheatcodes are precompiles, not JS-side wrappers.** Hardhat's \`evm_snapshot\` is an RPC method; Foundry's \`vm.expectRevert\` is a precompile call. The cheatcode lives at address \`0x7109709ECfa91a80626fF3989D68f67F5b1DD12D\` and Foundry's REVM fork intercepts calls to that address — exactly the precompile-as-EVM-superpower pattern from openhl Stage 9. **L1 only used \`vm.expectRevert\`; L2 and L3 will introduce more cheatcodes. Each one is a precompile.**

## Answer key

This lesson's "answer key" is what \`forge init\` produces, plus your one new test function. The directory structure should look like:

\`\`\`
   my-foundry-lab/
   ├── foundry.toml         (unchanged from init)
   ├── src/Counter.sol       (unchanged from init)
   ├── script/Counter.s.sol  (unchanged from init)
   ├── test/Counter.t.sol    (+10 lines from your new test function)
   └── lib/forge-std/        (git submodule, unchanged)
\`\`\`

After L1:
- \`forge test\` passes 3 tests cleanly
- You've read every line of \`Counter.sol\` and \`Counter.t.sol\` and understand the conventions
- You've added a \`vm.expectRevert\` test and seen what \`-vvv\` shows

The course doesn't have an in-repo answer-key for L1–L5 because \`forge init\`'s output is the answer key — same output for every reader on the same Foundry version. L6's capstone changes this: at L6 you'll work against a specific \`InsuranceFund.sol\` + tests at \`rethlab/examples/foundry-capstone/\`.

## Common questions

**Q1: Why does \`forge init\` create \`script/\` if this course doesn't really cover deployments?**

Because \`forge\` is one binary that handles testing AND deployment scripting; the project layout has slots for both even if you only use one. We touch \`script/\` briefly in L4 (\`cast send\` + simple deploy via \`forge script\`); a full deployment workflow is its own course (out of scope, per L0's "what's NOT in this course" list).

**Q2: Why does \`setUp()\` run before every test and not once for the whole contract?**

Because Foundry's test isolation runs each test against a *fresh* EVM state — no test can leak state to another. \`setUp()\` is the per-test initializer. If you want a one-time global init (e.g., a heavy fixture), you set it up in the constructor of the test contract; that runs once when the test contract is deployed. **Per-test isolation is the default because cross-test state leaks are the #1 source of flaky tests in any test runner.**

**Q3: Why is \`assertEq(counter.number(), 1)\` calling \`number()\` as a function, not reading \`number\` as a field?**

Because \`uint256 public number\` auto-generates a getter function with that name. Inside the same contract you'd write \`number\`; from outside (which is where the test sits — \`CounterTest\` is a different contract from \`Counter\`), you call \`counter.number()\`. **Public state variables are syntactic sugar for \`get*\` functions in Solidity; the call-site syntax reflects the underlying generated function.**

**Q4: What does \`-vvv\` actually add over the default output?**

- \`-v\` / no flag: pass/fail summary
- \`-vv\`: failed tests get an error message
- \`-vvv\`: failed tests get a stack trace (which function called which)
- \`-vvvv\`: failed AND passing tests get the stack trace
- \`-vvvvv\`: opcode-level execution trace (the deepest debug mode)

In practice: use \`-vvv\` for daily development (fast, only shows interesting stuff on failure), \`-vvvvv\` only when you're stuck on a weird revert.

**Q5: Can I write tests in a separate file outside \`test/\`?**

You can configure \`foundry.toml\` to add other test paths, but the default \`test/\` directory is conventional and tooling integrations (IDE plugins, CI matrices) assume it. Stay with the default unless you have a real reason (e.g., a giant monorepo where contract teams want their own test/ subdirs). **Convention beats configuration when the default is sane.**

**Q6: Why does Solidity have \`pragma solidity ^0.8.35\` instead of \`[package] edition = "2024"\` like Rust?**

Different language-evolution model. Rust's editions are *epochs* that change defaults (e.g., 2024 enables new keyword reservations) without breaking old syntax. Solidity's pragma constrains which compiler version can build the file, which matters more in Solidity because compiler bugs are common and consensus determinism makes mid-deploy version mismatches catastrophic. **Solidity's pragma is closer to \`rust-version = "1.85"\` in Cargo.toml than to \`edition = "2024"\`.**

## Next lesson (L2) — \`forge fuzz\` — Solidity's \`proptest!\`

L2 turns the \`testFuzz_SetNumber\` test into a real working example of property-based testing — what L9 of openhl-liquidation calls "proptest". You'll learn:

- The default 256-iteration fuzz cycle and how to bump it via \`foundry.toml\`
- \`vm.assume(condition)\` — the Solidity equivalent of \`prop_assume!\` for filtering inputs that violate preconditions
- Shrinking — how Foundry reduces a 32-byte counterexample down to the minimal \`uint256\` that triggers a failure
- Corpus persistence — \`cache/fuzz/\` saves failing inputs so re-runs immediately replay the same counterexamples

After L2 you'll have written your first conservation-law fuzz test in Solidity, mapping 1:1 to the \`balance_never_negative\` proptest from openhl-liquidation L8.
`,
                },
                {
                  title: "Lesson 2 — forge fuzz — Solidity's proptest!",
                  slug: "foundry-forge-fuzz-en",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 35,
                  xpReward: 70,
                  content: `# Lesson 2 — \`forge fuzz\` — Solidity's \`proptest!\`

## Goal

Concepts you'll grasp in this lesson:

- **\`forge fuzz\` is \`proptest!\` with different syntax.** Same theorem-first mindset: write an assertion that should hold *for all valid inputs* (not just hand-picked examples), and let the runner search the input space for a counterexample. Same shrinker that reduces a 32-byte failing input to the minimal \`uint256\` that triggers the bug. Same corpus persistence that replays known counterexamples instantly on the next run. If you wrote \`proptest! { #[test] fn balance_never_negative(...) { ... } }\` in openhl-liquidation L9, you already know the shape of a \`testFuzz_*\` function — Solidity just wraps it in contract syntax.
- **\`vm.assume(condition)\` is the Solidity equivalent of \`prop_assume!\`.** Both filter out inputs that violate preconditions *before* the assertion runs, so the test only exercises the regime where the property is well-defined. The pattern matches Liquidation L9's \`prop_assume!(entry * size > collateral)\` rule: when an input would push the test out of its meaningful domain, discard it. The fuzzer just generates another input and tries again.
- **Default 256 iterations is a *minimum*, not a goal.** \`foundry.toml\`'s \`fuzz.runs = 256\` is the out-of-the-box default — enough to catch the obvious bugs in seconds, not enough to prove a property. Production codebases bump it to 10_000 or 100_000 for CI and reserve the higher counts for nightly runs. Same trade-off Rust's \`proptest!\` makes with its \`CASES = 256\` default.
- **Shrinking is the difference between "the test failed somewhere" and "the test failed at exactly this input."** When \`forge fuzz\` finds a counterexample (say, \`x = 0xa3b8...4d2f\` — a random 32-byte value), it doesn't just report the failure. It runs a binary-search-style reduction to find the *smallest* \`x\` that reproduces the failure. The output you see is the minimal counterexample — often a single-digit number — which makes debugging an order of magnitude faster than "well, *some* input broke it."

Verification:

\`\`\`bash
forge test
\`\`\`

…passes 4 tests (3 from L1 + 1 new fuzz test added in this lesson). All four green at the default 256 iterations; you'll also see what happens at 100_000.

Specific changes:

- **\`foundry.toml\`** — adds a \`[fuzz]\` profile section with \`runs = 1000\` for the default and a profile alias \`[profile.ci]\` with \`runs = 100000\` for the heavy run. Demonstrates how to tune iteration counts without hard-coding them in each test.
- **\`test/Counter.t.sol\`** — appends one new fuzz test: \`testFuzz_IncrementPreservesPlusOne(uint256 x)\`. Uses \`vm.assume(x < type(uint256).max)\` to filter out the overflow case before asserting the property holds.

Total: ~15 lines of new code. L2 is about *what fuzzing is* and *why the shrinker matters*, not about clever fuzz coverage.

## Recap

After L1:
- \`forge test\` runs 3 tests cleanly (the 2 \`forge init\` defaults + your new \`vm.expectRevert\` test).
- You've internalized the project shape, the \`setUp\` per-test isolation pattern, and the \`-v\` through \`-vvvvv\` verbosity ladder.
- You've seen the \`testFuzz_SetNumber(uint256 x)\` test pass with 256 runs — but it was unexplained. L2 explains *what* it was doing.

L2 turns that mysterious 256-run line into the central tool of property-based testing.

## Plan

Three edits:

1. **Open \`foundry.toml\`** and add a \`[fuzz]\` section to tune the default iteration count. Add a \`[profile.ci]\` profile with a higher count for heavy runs. (No new contract code yet — just configuration.)
2. **Read \`testFuzz_SetNumber(uint256 x)\` from L1's \`Counter.t.sol\`**. Understand why Foundry treats it as a fuzz test, what the runner does each iteration, and how the result line \`(runs: 256, μ: 31000, ~: 31161)\` is generated.
3. **Append one new fuzz test**: \`testFuzz_IncrementPreservesPlusOne(uint256 x)\`. Set \`counter\` to \`x\`, call \`counter.increment()\`, assert \`counter.number() == x + 1\`. Use \`vm.assume(x < type(uint256).max)\` to filter out the overflow case. Run with \`forge test -vvv\`.

> 🛑 **Predict.** Before reading further: in \`proptest!\` from openhl-liquidation L9, the default number of \`CASES\` is \`256\`. In \`forge fuzz\`, the default \`fuzz.runs\` is also \`256\`. What's the practical CI-tier value most production codebases use? And what's the trade-off if you bump it to 1_000_000?

(Answer: **Most production CI runs at \`10_000\` or \`100_000\`**; nightly fuzzers push to \`1_000_000\`. The trade-off: each iteration runs the full test (setUp → call → assertion → state cleanup). At 256 iterations a single fuzz test takes ~50ms; at 100_000 it takes ~20 seconds; at 1_000_000 it takes ~200 seconds. Past 100_000 the diminishing returns kick in unless your test is exercising a vast input space — most uint256 fuzz tests have *de facto* small interesting regions, and 100_000 hits them already. **Run high counts on dedicated nightly CI, default counts on PR CI, low counts during local development.**)

## What \`forge fuzz\` actually does

\`\`\`mermaid
flowchart TD
    A[1. Generate random uint256] --> B[2. Run setUp<br/>fresh Counter, number = 0]
    B --> C[3. Call testFuzz_* x = generated]
    C --> D{4. vm.assume cond?}
    D -->|false: discard iteration| A
    D -->|true| E[5. Run assertion<br/>assertEq / assertTrue]
    E -->|PASS: next iteration| A
    E -->|FAIL: trigger shrinker| F[find minimal counterexample]
    A -.->|max_test_rejects exceeded| H[TooManyAssumptions error exit]
    A -.->|after fuzz.runs successes| G[report gas stats μ ~]
\`\`\`

Three things to notice about the loop:

1. **\`setUp()\` runs *every* iteration.** This is per-iteration state isolation — same discipline as per-test isolation in L1, just at a finer grain. A failing iteration cannot poison the next iteration; each run is fresh. **Per-iteration isolation is what makes fuzz failures reproducible.**
2. **\`vm.assume(cond)\` inside a fuzz test silently discards the iteration if the condition is false.** It doesn't fail the test, doesn't count as a pass — it just generates a new input. This is the input-filtering mechanism. **Use \`vm.assume\` for preconditions; use \`vm.expectRevert\` for negative-path tests.** They sound similar; they do opposite things.
3. **Gas statistics (μ and ~) come from the iterations that *passed*.** Failing iterations don't contribute. So a fuzz test that mostly passes but occasionally hits an expensive edge case still reports a low μ because the cheap iterations dominate. Don't read fuzz gas numbers as worst-case; they're typical-case. **For worst-case gas, use unit tests on the specific high-gas inputs.**

## When the shrinker kicks in

\`\`\`mermaid
flowchart TD
    A[Initial failing input<br/>x = 0xa3b8_f4c2_... huge number] --> B{Try halving<br/>x / 2}
    B -->|still fails| B
    B -->|passes| C[Roll back to last failure]
    C --> D{Try small mutations<br/>x ± 1, x ± 2, ...}
    D -->|smaller failure found| D
    D -->|shrink exhausted| E[Final report<br/>counterexample args=5<br/>minimal x that reproduces bug]
\`\`\`

Two things to notice about shrinking:

1. **The shrinker is *not* exhaustive.** It uses heuristics — halving, small-step mutations, bit-flipping — to find a small failure, not the absolutely-smallest one. In practice this is fine: a counterexample of \`5\` debugs the same way as the absolute-minimum \`3\`. **Heuristic shrinking is good enough; exhaustive shrinking is impractical for 32-byte input spaces.**
2. **Shrinkage is per-parameter.** A fuzz test taking \`(uint256 a, uint256 b)\` shrinks each parameter independently. Foundry doesn't try \`a, b/2\`-then-\`a/2, b\` cross-products; it shrinks one at a time. **Multi-parameter shrinking is local, not global; the minimal counterexample you see is locally minimal per axis.**

## Walk-through

### Step 1: Tune \`foundry.toml\` for fuzz iteration counts

Open \`foundry.toml\`. It should look like this after \`forge init\`:

\`\`\`toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]

# See more config options https://github.com/foundry-rs/foundry/blob/master/crates/config/README.md#all-options
\`\`\`

Append a \`[fuzz]\` section to the default profile and a heavier \`[profile.ci]\`:

\`\`\`toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]

[fuzz]
runs = 1000
max_test_rejects = 65536

[profile.ci.fuzz]
runs = 100000
\`\`\`

Three things to notice:

1. **\`runs = 1000\` is the new default** — 4× the out-of-the-box 256. Tight enough to keep local development feedback under a second; loose enough to catch obvious bugs the default would miss. **Bump from 256 to 1000 as soon as you write your second fuzz test; the cost is sub-second.**
2. **\`max_test_rejects = 65536\`** — the maximum number of \`vm.assume\` rejections before the test gives up and reports a failure. The default is 65536; you'll usually never hit it. If you do, your \`vm.assume\` predicate is too restrictive — the fuzzer can't find inputs that satisfy it. **A \`max_test_rejects\` failure is a signal that your precondition is wrong, not that the fuzzer is broken.**
3. **\`[profile.ci.fuzz] runs = 100000\`** — when CI runs \`FOUNDRY_PROFILE=ci forge test\`, this 100K-iteration value overrides the default. Production codebases (Uniswap, Compound, AAVE) all use this profile-per-environment pattern. **Profiles let you tune iteration counts per environment without hard-coding.**

Run \`forge test\` to confirm the config didn't break anything:

\`\`\`bash
forge test
\`\`\`

Expected output now shows \`(runs: 1000, ...)\` for the existing fuzz test:

\`\`\`
[PASS] testFuzz_SetNumber(uint256) (runs: 1000, μ: 31000, ~: 31161)
\`\`\`

### Step 2: Read \`testFuzz_SetNumber\` from L1

The test from \`forge init\` (which you already have):

\`\`\`solidity
function testFuzz_SetNumber(uint256 x) public {
    counter.setNumber(x);
    assertEq(counter.number(), x);
}
\`\`\`

Four things to notice:

1. **Function name starts with \`testFuzz_\`.** Foundry recognizes any function whose name starts with \`test\` AND takes parameters as a fuzz test. The \`testFuzz_\` prefix is convention (not strict syntax); the parameter is what triggers fuzzing. **Convention + parameter signature = fuzz test.**
2. **\`uint256 x\` is the fuzz input.** Foundry generates a random \`uint256\` for each iteration. Multi-parameter signatures (e.g., \`function testFuzz_Op(uint256 a, address b)\`) get independently-fuzzed values for each. **Each fuzz parameter is independently sampled.**
3. **The assertion \`assertEq(counter.number(), x)\` is the property.** Read it as: "for all uint256 values \`x\`, after \`setNumber(x)\`, the counter holds \`x\`." That's a statement of program correctness, not a single example. **A fuzz assertion is a universally-quantified property; a unit-test assertion is one example.**
4. **There's no \`vm.assume\` because there's no precondition.** Every \`uint256\` value is valid input to \`setNumber\`. When every input is valid, you don't need to filter — just let the fuzzer iterate. **\`vm.assume\` is for restricting the regime; omit it when the property holds universally.**

This particular test is *trivially* true — \`setNumber\` just stores the value. The property is "the storage write actually stored what we passed in." It's a property worth proving (a future refactor that masked some bits in the setter would fail this fuzz test), but it's not an interesting demonstration of fuzzing's power. Our new test in Step 3 is.

### Step 3: Add \`testFuzz_IncrementPreservesPlusOne\`

Append to \`test/Counter.t.sol\`:

\`\`\`solidity
    function testFuzz_IncrementPreservesPlusOne(uint256 x) public {
        // Precondition: x must not be at the type ceiling, otherwise
        // increment() would overflow and Solidity 0.8 would revert,
        // taking the assertion with it. vm.assume filters these inputs
        // before the assertion runs — same role as openhl-liquidation
        // L9's prop_assume!(entry * size > collateral).
        vm.assume(x < type(uint256).max);

        counter.setNumber(x);
        counter.increment();
        assertEq(counter.number(), x + 1);
    }
\`\`\`

Six things to notice:

1. **\`vm.assume(x < type(uint256).max)\` filters the one input the property doesn't hold for** — the maximum value, where \`x + 1\` would overflow. Without this filter, the test would *correctly* fail on that single input. With the filter, the test proves the property for the *meaningful* input range. **\`vm.assume\` defines the regime where the property is asserted.** This is the opposite role from L1's \`vm.expectRevert\`. \`vm.expectRevert\` is a negative-path test that *expects* the revert to happen and treats it as success; \`vm.assume\` is a positive-path test that *excludes* inputs that would revert, so the property assertion can run on the well-defined domain. Same physical phenomenon (the contract would revert at this input) — opposite test-discipline intent.
2. **The comment cross-references openhl-liquidation L9's \`prop_assume!\`** — same role, same pattern, different syntax. Readers who came through that course recognize the discipline. **Cross-language pattern recognition is the load-bearing pedagogical move of this whole course.**
3. **The property \`counter.number() == x + 1\` is the conservation law.** Before increment: \`x\`. After increment: \`x + 1\`. The difference is exactly 1 — and it holds *for all valid \`x\`*. Same shape as the L9 proptest \`withdraw_amount_plus_unfilled_equals_shortfall\`. **Fuzz tests express conservation laws; unit tests express specific cases.**
4. **\`x + 1\` happens inside the assertion, after \`vm.assume\` rejected \`type(uint256).max\`.** So the \`+1\` arithmetic is always safe — never overflows. The \`vm.assume\` is what protects this assertion from misfire. **Preconditions guard arithmetic; preconditions are part of the property.**
5. **\`counter.setNumber(x)\` mutates state before the assertion.** Each fuzz iteration is fresh (the per-iteration \`setUp\` from Step 1's diagram), so the mutation only affects this iteration's contract instance. **State setup + property assertion = one iteration; isolation prevents leak.**
6. **No \`expectRevert\`.** This is a positive-path fuzz test — we're not testing the overflow case (that was L1's job). We're testing that *when overflow doesn't happen*, the conservation law holds. **One test per property; one property per test.**

Run:

\`\`\`bash
forge test -vvv
\`\`\`

Expected output:

\`\`\`
[PASS] testFuzz_IncrementPreservesPlusOne(uint256) (runs: 1000, μ: 36000, ~: 36000)
[PASS] testFuzz_SetNumber(uint256) (runs: 1000, μ: 31000, ~: 31161)
[PASS] test_Increment() (gas: 31303)
[PASS] test_RevertWhen_DecrementBelowZero() (gas: 8957)

Suite result: ok. 4 passed; 0 failed; 0 skipped
\`\`\`

**Four tests, all green at 1000 iterations.** The new fuzz test runs in ~50ms despite the iteration count because each iteration is cheap.

> ⚠️ **\`vm.assume\` trap: write loose filters, not pinpoint ones.** A good \`vm.assume(x < type(uint256).max)\` predicate excludes *one* value from the $2^{256}$ space — the fuzzer almost always gets a valid input. But \`vm.assume(x == 42)\` — "I want exactly this value" — has effectively zero chance of the fuzzer randomly drawing \`42\` from $2^{256}$, so the test burns through \`max_test_rejects\` (default 65536) and dies with \`TooManyAssumptions\`. **Rule of thumb: use \`vm.assume\` only when it excludes a tiny slice of the input space (typically < 1%). If you want to test a pinpoint value, that's a unit test, not a fuzz test.**

### Step 4: See the shrinker in action by breaking the test

To demonstrate shrinking, deliberately break the property. Change the assertion to:

\`\`\`solidity
assertEq(counter.number(), x + 2);  // Wrong: should be x + 1
\`\`\`

Run \`forge test -vvv\`:

\`\`\`
[FAIL: assertion failed: ... ≠ ...]
testFuzz_IncrementPreservesPlusOne(uint256) (runs: 1, μ: ...)
counterexample: args=[0]
\`\`\`

**Notice: \`args=[0]\`** — the shrinker reduced whatever 32-byte value originally failed to the minimal \`0\`. Even though the first failing iteration probably had \`x = 0xa3b8_f4c2_...\` (some random huge number), the shrinker realized \`0\` also fails ($\\text{number} = 0 + 1 = 1 \\neq 2$), and reported the minimal case.

If you'd never seen shrinking, you might assume the bug only triggers at specific large inputs. With shrinking, you see immediately that *every* input fails — the bug is in your assertion, not in the contract.

**Revert the assertion back to \`x + 1\` before continuing.**

\`\`\`solidity
assertEq(counter.number(), x + 1);  // Restored
\`\`\`

Re-run \`forge test\`. All four tests green again.

### Step 5: Look at the corpus directory

Foundry persists failing inputs to \`cache/fuzz/\`. After your deliberate-break-and-revert above, look:

\`\`\`bash
ls cache/fuzz/
\`\`\`

You should see a directory with files named after test signatures. Each file holds failing inputs from past runs. The next time you run \`forge test\`, Foundry *immediately* re-runs against those persisted inputs before generating new random ones.

This means: **if you fixed a bug and re-broke it, the test fails immediately with the same counterexample — no waiting for the fuzzer to rediscover it.** This is the corpus persistence pattern, and it's the same thing \`proptest\`'s \`proptest-regressions/\` files do in Rust.

\`\`\`bash
# Persist a counterexample by intentionally breaking + reverting:
# (the bad assertion run already did this above)
ls cache/fuzz/
# → Directory holds the seed that broke testFuzz_IncrementPreservesPlusOne
\`\`\`

You can git-ignore \`cache/fuzz/\` (and \`forge init\` does by default) or commit it. The argument for committing: counterexamples that previously broke your code stay in the test suite forever, so a regression is caught instantly. **Some production codebases commit \`cache/fuzz/\`; most don't. Pick a side per repo.**

### Step 6: Run with the CI profile

\`\`\`bash
FOUNDRY_PROFILE=ci forge test
\`\`\`

This runs with \`fuzz.runs = 100000\` (the profile we added in Step 1). The output:

\`\`\`
[PASS] testFuzz_IncrementPreservesPlusOne(uint256) (runs: 100000, μ: 36000, ~: 36000)
[PASS] testFuzz_SetNumber(uint256) (runs: 100000, μ: 31000, ~: 31161)
...
\`\`\`

100× more iterations. On modern hardware this takes ~10–20 seconds for two fuzz tests; production codebases with dozens of fuzz tests run nightly, not on every PR. **Use profiles to gate iteration counts to environment.**

## Common errors

- **\`No tests to run\`** — your test function doesn't have a parameter, so Foundry treats it as a non-fuzz test, but its name starts with \`testFuzz_\`. Add a \`uint256 x\` parameter or rename the function.
- **\`called \`Result::unwrap()\` on an \`Err\` value: TooManyAssumptions\`** — \`vm.assume\` rejected more than \`max_test_rejects\` inputs. Your predicate is too restrictive. Loosen it or rework the test.
- **\`counterexample: args=[...]\` with a huge number** — your shrinker hint isn't kicking in. Check that the failure is actually in the simple input range; if not, \`vm.assume\` may be filtering valid inputs.
- **\`runs: 1\`** in the output of a \`[PASS]\` line — that's not actually a pass; that's \`forge fuzz\` finding a counterexample on iteration 1 and the shrinker working. Re-read the full output for the \`[FAIL]\` indicator.

## Design reflection

Three load-bearing decisions in \`forge fuzz\`'s design:

1. **Parameter signature is the fuzz signal, not a \`@fuzz\` annotation.** Same convention-over-attribute discipline as \`forge test\` itself. **Foundry's testing surface scales by *naming* + *parameters*, not by markup. Tooling doesn't need a syntax tree to discover tests.**

2. **\`vm.assume\` filters rather than fails.** The alternative would be \`vm.requirePrecondition(cond)\` that *fails* the iteration if false. Foundry chose the filter semantics because: (a) most precondition violations are inputs you genuinely don't want to test, not bugs; (b) treating them as test failures would flood your CI with noise; (c) \`max_test_rejects\` already catches the case where your precondition is too restrictive to ever find valid inputs. **\`vm.assume\` says "this input isn't interesting"; failures say "this property is broken."**

3. **Shrinking is per-parameter local, not global.** A multi-parameter test taking \`(uint256 a, uint256 b)\` shrinks \`a\` independently of \`b\`. This trades cross-parameter optimality for runtime speed; in practice, single-axis minimal counterexamples are good enough for 95% of debugging. **Heuristic local shrinking beats exhaustive global shrinking when the input space is 64+ bytes.**

## Answer key

After L2:

\`\`\`
   my-foundry-lab/
   ├── foundry.toml         (+ [fuzz] runs = 1000, + [profile.ci.fuzz] runs = 100000)
   ├── src/Counter.sol       (unchanged from L1)
   ├── test/Counter.t.sol    (+ testFuzz_IncrementPreservesPlusOne)
   └── lib/forge-std/        (unchanged)
\`\`\`

After L2:
- \`forge test\` passes 4 tests at 1000 iterations
- \`FOUNDRY_PROFILE=ci forge test\` passes 4 tests at 100,000 iterations
- You've seen the shrinker reduce a failing counterexample to its minimal form
- You've seen \`cache/fuzz/\` persist failures for instant replay

## Common questions

**Q1: Why isn't the default \`fuzz.runs\` higher than 256? Wouldn't more iterations be strictly better?**

Tradeoff: 256 is the speed-vs-coverage sweet spot for *local development* (sub-second feedback per test). Production codebases bump it for CI because they have time budget for it; local development needs to stay tight. **256 is for the inner loop; 10_000–100_000 is for the outer loop.**

**Q2: Why does \`forge fuzz\` use random input generation instead of exhaustive search?**

Because \`uint256\`'s input space is $2^{256} \\approx 10^{77}$ values — exhaustive search is impossible. Random sampling with a good distribution finds counterexamples in the *interesting* regions (around $0$, $1$, \`type(uint256).max\`, $2^N$ boundaries, ...) thanks to a slight bias in Foundry's input generator toward edge values. **Pure-random over $2^{256}$ would miss every edge case; biased-random + shrinking hits them.**

**Q3: Should every state-changing function have a corresponding fuzz test?**

Ideally yes — every external function that mutates state should have at least one fuzz test proving the relevant invariant. In practice, prioritize: arithmetic (overflow boundaries), access control (caller checks), and any function that has a conservation law (deposit/withdraw, mint/burn). **Aim for fuzz coverage of properties, not lines.**

**Q4: How is \`forge fuzz\` different from \`forge invariant\` (L3)?**

\`forge fuzz\` is single-call: each iteration calls *one* function with random parameters and checks an assertion. \`forge invariant\` (L3) is multi-call: each iteration calls *many* functions in random sequence and checks an invariant after each call. **Fuzz tests one function in isolation; invariant tests sequences of function calls. Both are property tests; the granularity differs.**

**Q5: What happens if my fuzz test calls a function that internally calls \`vm.assume\`?**

\`vm.assume\` works wherever you call it — even nested inside other functions called from your fuzz test. The first \`vm.assume(false)\` discards the iteration regardless of call depth. **Composability is built into the cheatcode model.**

**Q6: Does shrinking work with \`bytes\` and \`string\` parameters?**

Yes. For \`bytes\`, the shrinker tries shorter slices. For \`string\`, it tries shorter strings + simpler character sets. Both work, though they're slower than \`uint256\` shrinking (since each shrinking step requires a longer comparison). **Don't avoid \`bytes\`/\`string\` fuzz tests just because they shrink slower; the shrinker still works, just take more wall-clock seconds.**

## Next lesson (L3) — \`forge invariant\` — multi-call invariant testing

L3 graduates from single-call fuzz testing to *multi-call invariant testing* — the closest Solidity primitive to per-scan conservation laws from openhl-liquidation L13.

The key concept: define a \`Handler\` contract whose functions are the "things the system can do" (deposit, withdraw, increment, etc.). Tell Foundry "treat this Handler as the surface area to fuzz." Foundry then generates random *sequences* of method calls — \`deposit(100), withdraw(50), increment(), withdraw(75)\` — and checks an \`invariant_*\` function after each step.

This is what catches multi-call bugs that single-call fuzzing never sees: token-balance reentrancy, ordering-dependent state corruption, the kind of bug that crashed Mt. Gox in slow-motion. **L3 is where \`forge\` becomes a real adversary, not just a parameter generator.**
`,
                },
                {
                  title: "Lesson 3 — forge invariant — multi-call invariant testing via the Handler pattern",
                  slug: "foundry-forge-invariant-en",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 40,
                  xpReward: 80,
                  content: `# Lesson 3 — \`forge invariant\` — multi-call invariant testing via the Handler pattern

## Goal

Concepts you'll grasp in this lesson:

- **\`forge invariant\` graduates fuzz testing from one call to call *sequences*.** \`forge fuzz\` (L2) calls one function per iteration with random parameters and asserts a property. \`forge invariant\` generates a random *sequence* of method calls — \`increment, increment, setNumber(0), increment, increment\` — and after every step in the sequence re-checks every \`invariant_*\` function. This catches bugs that need a specific *ordering* to surface: token-balance reentrancy, withdraw-during-deposit races, ghost-state divergence that survives one call but breaks two calls later. The single-call analogue can't see them. **L2 found bugs that exist at a single input; L3 finds bugs that need a history.**
- **The Handler is your "test API surface area" wrapper around the target contract.** You don't usually point \`forge invariant\` at the target contract directly — you point it at a Handler contract whose \`public\` methods wrap the target's methods, bound their inputs, and track ghost variables (mirror state the invariant compares against). Foundry then randomly calls Handler methods, not target methods. This sounds like ceremony but it solves a load-bearing problem: most target contracts have methods whose random parameters would immediately violate a precondition (\`withdraw(uint256)\` with \`uint256 > balance\`), so direct fuzzing wastes iterations on \`vm.assume\` rejections. The Handler clips inputs to the meaningful range, so 100% of iterations exercise the target. **Without a Handler, \`forge invariant\` spends most iterations rejecting nonsense; with one, every iteration is a real adversary move.**
- **\`invariant_*\` functions name the conservation laws that must hold *after every call in the sequence*.** Same \`invariant_\` prefix discipline as \`test_\`/\`testFuzz_\`. The body asserts an equality or bound that should be true regardless of what happened. The classic example is \`balance + sum_of_withdrawals == sum_of_deposits\` — a conservation law that holds for any sequence of deposits and withdrawals. This is the *exact* shape of openhl-liquidation L13's \`before + deposits - withdrawals == after\` per-scan proptest. **\`invariant_*\` is the Solidity binding for the same conservation-law discipline you used in Rust; the syntax is \`assertEq(handler.ghostSum(), target.actualBalance())\`.**
- **When an invariant fails, the counterexample is the full call sequence, not one input.** \`forge fuzz\` reports \`counterexample: args=[5]\`; \`forge invariant\` reports a *trace* of \`deposit(100), withdraw(50), increment(), withdraw(75)\` and tells you which call broke which invariant. The shrinker reduces the *sequence* — drops calls that aren't load-bearing, halves remaining argument values — until you get the minimal-length, minimal-value call series that still violates the invariant. **A 200-call counterexample shrinks to 3 calls; that's debuggable. Without sequence-shrinking, invariant testing would produce unreadable failures.**

Verification:

\`\`\`bash
forge test --match-test invariant
\`\`\`

…runs the new invariant suite and reports \`(runs: <N>, calls: <M>, reverts: <R>)\`. After this lesson you'll have a Handler wrapping Counter, an \`invariant_NumberEqualsIncrementCount\` that holds across thousands of random call sequences, and you'll have deliberately broken it to see the call-sequence counterexample.

Specific changes:

- **\`foundry.toml\`** — adds \`[invariant]\` profile section configuring \`runs\`, \`depth\` (calls per run), and \`fail_on_revert\`.
- **\`test/CounterHandler.sol\`** — new file. A Handler contract exposing \`wrappedIncrement()\` and (optionally) \`wrappedSetNumber(uint256)\` with ghost-variable tracking.
- **\`test/Counter.invariant.t.sol\`** — new file. The invariant test contract that wires the Handler to \`targetContract(...)\` and declares \`invariant_*\` functions.

Total: ~50 lines of new code across two new test files. L3 is about *understanding the Handler pattern*, not about clever invariant arithmetic.

## Recap

After L2:
- \`forge fuzz\` runs 256+ iterations of a single test function with random parameters.
- \`vm.assume\` filters preconditions, \`vm.expectRevert\` is for negative-path tests, and they have opposite intents.
- Shrinker reduces 32-byte failing inputs to minimal counterexamples; \`cache/fuzz/\` persists them.
- You wrote \`testFuzz_IncrementPreservesPlusOne\` — a one-call conservation property.

L3 takes that conservation property and runs it across *sequences* of calls. Same theorem, deeper adversary.

## Plan

Five edits across two new files:

1. **Add \`[invariant]\` config to \`foundry.toml\`** — \`runs = 256\`, \`depth = 50\` (50 random calls per run), \`fail_on_revert = false\`. Define what a "run" means for invariant testing.
2. **Create \`test/CounterHandler.sol\`** — a contract that holds a \`Counter\` instance, exposes \`wrappedIncrement()\` that bumps a \`ghostIncrementCount\` variable in lockstep, and (later) \`wrappedSetNumber(uint256)\` that updates the ghost to track resets.
3. **Create \`test/Counter.invariant.t.sol\`** — inherits \`Test\`, instantiates \`CounterHandler\`, registers it with \`targetContract(...)\`, declares \`invariant_NumberEqualsIncrementCount\` that asserts \`counter.number() == handler.ghostIncrementCount()\`.
4. **Run \`forge test --match-contract CounterInvariantTest -vvv\`** — observe \`(runs: 256, calls: 12800, reverts: 0)\` and watch the invariant hold across thousands of random sequences.
5. **Deliberately break by exposing raw \`setNumber\` without ghost update** — see Foundry produce a multi-call counterexample like \`wrappedIncrement(), wrappedIncrement(), badSetNumber(0), wrappedIncrement()\`.

> 🛑 **Predict.** Before reading on: in openhl-liquidation L13, the cascade-conservation proptest asserts \`before_balance + sum(deposits) - sum(withdrawals) == after_balance\` across a random sequence of operations applied to the insurance fund. If that test were ported to \`forge invariant\` against an \`InsuranceFund.sol\` contract, what would the Handler need to track as ghost variables, and what would the \`invariant_*\` function assert?

(Answer: **The Handler would need \`ghostSumDeposits\` and \`ghostSumWithdrawals\`, both incremented inside \`wrappedDeposit(uint256)\` and \`wrappedWithdraw(uint256)\`.** It would also need \`ghostInitialBalance\` captured once at construction time. The invariant would assert \`target.balance() == handler.ghostInitialBalance() + handler.ghostSumDeposits() - handler.ghostSumWithdrawals()\` — the *exact* arithmetic shape of the L13 proptest. Same theorem, two languages. The L6 capstone of this course does precisely this port for openhl-liquidation Stage 10b's \`InsuranceFund\`.)

## How \`forge invariant\` differs from \`forge fuzz\`

\`\`\`mermaid
flowchart TD
    A[1. Pick a random Handler method] --> B[2. Pick random parameters in declared bounds]
    B --> C[3. Call Handler method<br/>which calls target + updates ghost]
    C --> D{4. Did the call revert?}
    D -->|yes, and fail_on_revert=true| F[FAIL run — counterexample = sequence so far]
    D -->|yes, and fail_on_revert=false| E[5. Check all invariant_* functions]
    D -->|no| E
    E -->|any invariant failed| F
    E -->|all held| G{6. Depth limit reached?}
    G -->|no| A
    G -->|yes| H[Run complete — start next run]
    F -.->|shrinker reduces sequence| I[Minimal call sequence reported]
\`\`\`

Five things to notice about the loop:

1. **There are two nested random axes: method choice AND parameters.** L2's \`forge fuzz\` had one axis — given a fixed test function, pick parameters. L3's \`forge invariant\` has two — at each step, pick *which* Handler method to call AND its parameters. The search space is \`(num_methods × param_space)^depth\`. At depth 50 and 3 methods with 32-byte params, the space is \`(3 × 2^256)^50\` — exhaustive is laughable, biased random + shrinking is your only hope. **The combinatorial blow-up is why Handler-bounded inputs matter: every iteration spent on a precondition violation is an iteration not spent on real adversary moves.**
2. **\`fail_on_revert\` is the dial that controls how strict your test is.** With \`fail_on_revert = true\`, *any* revert from a Handler call fails the run — your Handler must never let the target panic. This is strict-mode and catches handlers that pass through invalid inputs. With \`fail_on_revert = false\`, reverts are tolerated and only invariant violations fail the run — this is the looser default while you're iterating on the Handler. **Start with \`fail_on_revert = false\`; flip to \`true\` once your Handler is tight, to catch bugs where the target panics on Handler-permitted inputs.**
3. **Invariants are checked after *every* call, not just at the end.** This is the multi-call equivalent of L2's per-iteration assertion. If the invariant \`total >= 0\` holds after call 1 and call 3 but breaks after call 2, the failure is detected at call 2 — not "eventually noticed." This is what makes invariant testing useful for catching transient inconsistencies that self-heal. **A bug that exists for one call between two consistent states is exactly the kind of thing single-call fuzzing can't see.**
4. **The \`depth\` parameter trades coverage for run time.** \`depth = 50\` means each run does 50 random calls; \`runs = 256\` means 256 of those runs happen; total calls per \`forge test\` invocation = \`runs × depth = 12,800\`. Each call runs setUp, picks a method, picks params, calls the Handler, checks invariants. At depth 50 a typical run takes ~100ms; at depth 500 it takes ~1s. **Bigger depth = better at catching ordering bugs; bigger runs = better at catching sensitivity to initial state. Tune both per environment, same as \`fuzz.runs\`.**
5. **Sequence shrinking is the killer feature.** When the invariant fails after a 50-call sequence, the raw failure is unreadable. The shrinker tries dropping individual calls — does the invariant still fail without call #23? Without call #7? — and reduces the sequence to the minimal subset that still triggers the failure. The reported counterexample is often 2–5 calls, even though the failure was found at call 47. **Without sequence shrinking, invariant testing produces failures you can't debug.**

## The Handler pattern in one paragraph

A Handler is a contract whose job is to be the *test-controlled API surface* of your target. It holds a reference to the target, exposes a handful of \`public\` methods that wrap the target's methods, *bounds* the inputs to those methods (e.g., \`bound(amount, 1, target.balance())\`), and updates *ghost variables* that mirror the conceptual state the invariant expects. Foundry's invariant runner calls random Handler methods with random parameters. The Handler decides which parameter values are sensible (no withdraw beyond balance), how to count what happened (ghost-variable accumulators), and what to ignore (methods you don't want fuzzed, just don't expose). The \`invariant_*\` functions then compare the Handler's ghost state to the target's actual state — any divergence is a bug. **The Handler is your shadow specification, written in Solidity, executed alongside the contract under test.**

## Walk-through

### Step 1: Configure \`[invariant]\` in \`foundry.toml\`

Append to \`foundry.toml\`:

\`\`\`toml
[invariant]
runs = 256
depth = 50
fail_on_revert = false
call_override = false
\`\`\`

Four things to notice:

1. **\`runs = 256\` matches \`fuzz.runs\` default** — same number-of-trials concept. Each run is a fresh \`setUp()\` followed by \`depth\` random calls. Production CI bumps this to \`1000\` or higher.
2. **\`depth = 50\` means 50 random Handler calls per run.** That's how deep into the call-history space each run explores. Default is 500 in newer Foundry; 50 is a smaller-faster value while you're learning. Once your Handler is correct, bump to 500 for real adversary coverage.
3. **\`fail_on_revert = false\`** lets Handler methods revert without failing the run. Useful while iterating — you can use \`try/catch\` inside the Handler to swallow expected reverts. Production codebases flip this to \`true\` once the Handler is tight, because at that point any revert means the Handler failed to bound inputs correctly. **\`false\` for development; \`true\` for the proof.**
4. **\`call_override = false\`** — controls whether Foundry can override \`msg.sender\` per call. Leave \`false\` for L3; we'll see \`msg.sender\` manipulation in L4 via \`vm.prank\`.

### Step 2: Write \`test/CounterHandler.sol\`

Create \`test/CounterHandler.sol\`:

\`\`\`solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.35;

import {Counter} from "../src/Counter.sol";

contract CounterHandler {
    Counter public counter;
    uint256 public ghostIncrementCount;

    constructor(Counter _counter) {
        counter = _counter;
    }

    function wrappedIncrement() public {
        counter.increment();
        ghostIncrementCount++;
    }
}
\`\`\`

Four things to notice:

1. **The Handler is a normal Solidity contract, not a test contract.** It inherits from nothing — no \`Test\`, no \`forge-std\`. It just holds state (\`counter\`, \`ghostIncrementCount\`) and exposes methods. Foundry's invariant runner discovers it via \`targetContract(...)\` (next step). **The Handler is plain Solidity; the invariant runner is the discovery layer.**
2. **\`ghostIncrementCount\` is a ghost variable** — it mirrors what we *expect* the target's state to be, derived from the calls we've made. The invariant test will assert \`counter.number() == handler.ghostIncrementCount()\`. If a future code change in \`Counter.increment()\` accidentally double-increments, this Handler catches it because \`ghostIncrementCount\` and \`counter.number()\` will diverge. **Ghost variables are the test's "shadow specification" — what we expect, separate from what the contract does.**
3. **\`wrappedIncrement()\` does two things in lockstep: call the target AND update the ghost.** This is the load-bearing discipline. If you call the target without updating the ghost, the invariant will fail on the next check (because actual diverges from expected). If you update the ghost without calling the target, the invariant will fail too. The wrapper enforces the 1:1 binding between "the target did X" and "the ghost tracked X." **The Handler method is the place where target action and ghost update are atomic.**
4. **The Handler doesn't expose \`setNumber\`** — yet. We're starting with a Handler that only exposes the *one* operation whose invariant we can express simply (\`number == count\`). When the Handler doesn't expose a method, the invariant runner can't call it, so methods that would break the invariant are simply omitted. **Handler-exposed surface ≠ target's full surface. You expose what you can write an invariant for.**

### Step 3: Write \`test/Counter.invariant.t.sol\`

Create \`test/Counter.invariant.t.sol\`:

\`\`\`solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.35;

import {Test} from "forge-std/Test.sol";
import {Counter} from "../src/Counter.sol";
import {CounterHandler} from "./CounterHandler.sol";

contract CounterInvariantTest is Test {
    Counter public counter;
    CounterHandler public handler;

    function setUp() public {
        counter = new Counter();
        handler = new CounterHandler(counter);

        // Tell Foundry: when generating random call sequences, only
        // call methods on \`handler\`. Without this, Foundry would also
        // try to fuzz Counter directly, and uncontrolled setNumber(x)
        // calls would immediately break our invariant.
        targetContract(address(handler));
    }

    function invariant_NumberEqualsIncrementCount() public view {
        // The conservation law: every wrappedIncrement() bumps both
        // counter.number() and handler.ghostIncrementCount() by 1.
        // No matter what random sequence of Handler calls Foundry has
        // generated, these two values must remain equal.
        assertEq(counter.number(), handler.ghostIncrementCount());
    }
}
\`\`\`

Five things to notice:

1. **\`setUp()\` runs once per *run*, not once per call.** Inside each run, the same \`counter\` and \`handler\` instances are reused across all 50 calls — that's how state accumulates across the sequence. Between runs, fresh instances. **Same per-run isolation as L2's per-iteration isolation, but at the outer loop.**
2. **\`targetContract(address(handler))\` tells Foundry where to fuzz.** Without it, Foundry would try to call methods on *every* contract it can reach, including \`Counter\` directly. Uncontrolled \`counter.setNumber(x)\` calls would break the invariant immediately because they bypass the ghost. The \`targetContract\` registration scopes the search to the Handler's \`public\` methods only. **\`targetContract\` is the invariant runner's discovery scope; you control what gets fuzzed by what you register.**
3. **\`invariant_NumberEqualsIncrementCount\` is marked \`view\`** — it doesn't change state, just reads and asserts. Foundry calls it after every Handler call in the sequence. If you forgot \`view\`, the runner would still call it but the gas cost would be higher; with \`view\` the call is essentially free. **Invariants should be \`view\` for performance; the assertion semantics are the same either way.**
4. **The function name starts with \`invariant_\`** — same naming-convention discovery as \`test_\` and \`testFuzz_\`. Foundry's runner scans for \`invariant_*\` functions and calls each one after every Handler call. You can have multiple invariants in one test contract; all of them are checked after each call. **Multiple invariants per contract = multiple conservation laws checked simultaneously, like L13's 4 separate proptests.**
5. **The assertion is the same \`assertEq\` from L1.** Nothing exotic — the invariant is just an assertion that should always hold. The novelty is *when* it's checked (after every random call), not *what* is checked (a plain Solidity equality). **\`forge invariant\` is \`forge fuzz\` with a different discovery loop, not a new assertion vocabulary.**

### Step 4: Run the invariant suite

\`\`\`bash
forge test --match-contract CounterInvariantTest -vvv
\`\`\`

Expected output:

\`\`\`
[PASS] invariant_NumberEqualsIncrementCount() (runs: 256, calls: 12800, reverts: 0)
\`\`\`

Read the line carefully:
- \`runs: 256\` — number of separate runs (matches \`[invariant] runs\`)
- \`calls: 12800\` — total Handler calls across all runs (256 × 50 = 12800)
- \`reverts: 0\` — number of calls that reverted (zero here because \`wrappedIncrement()\` never reverts)

**12,800 random Handler calls and the invariant held every time.** The conservation law \`number == ghostIncrementCount\` is proven over an enormous variety of call sequences.

### Step 5: Deliberately break the invariant

To see the sequence-counterexample workflow, expose a Handler method that bypasses the ghost. Add to \`CounterHandler.sol\`:

\`\`\`solidity
    function badSetNumber(uint256 x) public {
        // Intentionally wrong: updates the target without updating the ghost.
        // This breaks the invariant on purpose to demonstrate Foundry's
        // sequence-counterexample reporting.
        counter.setNumber(x);
    }
\`\`\`

Re-run:

\`\`\`bash
forge test --match-contract CounterInvariantTest -vvv
\`\`\`

Expected output:

\`\`\`
[FAIL: invariant_NumberEqualsIncrementCount persisted failure]
    Counter: 0x...
    Sequence (length: 2):
        sender=0x... addr=[CounterHandler]0x... calldata=badSetNumber(uint256), args=[42]
        sender=0x... addr=[CounterHandler]0x... calldata=wrappedIncrement(), args=[]
    Last invariant: invariant_NumberEqualsIncrementCount
\`\`\`

**The reported counterexample is a 2-call sequence.** Foundry initially found the failure after ~30 random calls, then the shrinker reduced it: dropped most calls, halved \`badSetNumber(0xa3b8...)\` to \`badSetNumber(42)\`, found that the minimal failure requires exactly \`badSetNumber(42)\` followed by \`wrappedIncrement()\`. The causality chain is important and worth tracing call-by-call: \`badSetNumber(42)\` *succeeds without reverting* — \`counter.setNumber(42)\` is a legal operation, just one that bypasses the ghost. Because \`fail_on_revert = false\`, Foundry doesn't flag the call itself; it lets the state mutation through, leaving \`counter.number() = 42\` while \`ghostIncrementCount\` is still \`0\`. The conservation law has already broken at this point, but the invariant runner doesn't know yet — it only checks after the *next* call returns. So Foundry proceeds to the next Handler method, calls \`wrappedIncrement()\`, that call returns cleanly, and *then* \`invariant_NumberEqualsIncrementCount\` evaluates: \`counter.number() == handler.ghostIncrementCount()\` → \`43 != 1\` → fail. The shrinker keeps both calls because together they form the minimal trace that reaches a checked-invariant moment after the divergence.

**Remove \`badSetNumber\` from \`CounterHandler.sol\` before continuing.** The conservation discipline is intact only when every Handler method updates both target and ghost in lockstep.

### Step 6: Add a properly-handled \`wrappedSetNumber\`

Now expose \`setNumber\` *correctly* — by updating the ghost to match. Append to \`CounterHandler.sol\`:

\`\`\`solidity
    function wrappedSetNumber(uint256 newNumber) public {
        counter.setNumber(newNumber);
        // setNumber breaks the simple "number == incrementCount" relationship,
        // so we reset the ghost to match the new target value. The invariant
        // is now: "number equals the number we asked for, plus increments since."
        ghostIncrementCount = newNumber;
    }
\`\`\`

Re-run:

\`\`\`bash
forge test --match-contract CounterInvariantTest -vvv
\`\`\`

Expected output:

\`\`\`
[PASS] invariant_NumberEqualsIncrementCount() (runs: 256, calls: 12800, reverts: 0)
\`\`\`

**The invariant holds again.** Foundry's runner is now picking randomly between \`wrappedIncrement()\` and \`wrappedSetNumber(uint256)\` calls, and both Handler methods maintain the ghost in lockstep. The invariant is the same one-line \`assertEq\`, but the test surface area is wider — and the invariant still holds across 12,800 random sequences mixing the two operations.

**This is the L3 punchline:** the invariant is a *contract* between Handler-mediated mutations and the conservation law. Add a Handler method without updating the ghost → invariant fails. Update the ghost correctly → invariant holds across an exponentially larger sequence space than any unit test could cover.

## Common failure modes

- **\`fail_on_revert = true\` and your Handler reverts** — this means a Handler method passed an input that the target couldn't handle. Add input bounding (\`amount = bound(amount, 1, target.balance())\`) inside the Handler method.
- **\`runs: 256, calls: 12800, reverts: 12000\`** — most of your Handler calls are reverting. Your Handler's input bounds are too loose, or your target's precondition is too tight. Either tighten the Handler's \`bound(...)\` calls or relax \`fail_on_revert\` to keep iterations productive.
- **Invariant fails *every* run, immediately** — the invariant is wrong, not the contract. Check the assertion arithmetic. Run a single-call manual test to confirm the invariant holds when you expect it to.
- **Invariant fails only sometimes, after long sequences** — this is the *good* kind of failure. It means a specific ordering of calls reveals a real bug. Use the shrunk counterexample to write a unit test that reproduces it deterministically.

## Design retrospective

Three load-bearing decisions in \`forge invariant\`'s design:

1. **The Handler pattern is convention, not syntax.** Foundry doesn't require you to write a Handler — you can \`targetContract(target)\` directly and let it fuzz the target's methods raw. But the *community has standardized* on Handlers because they solve the "every iteration is a \`vm.assume\` rejection" problem. The convention is enforced by collective practice, not by the tool. **Foundry gives you the multi-call sequencing primitive; the Handler pattern is the discipline the ecosystem layered on top.**

2. **Ghost variables live in the Handler, not in the target.** This is deliberate: the target stays clean Solidity; the test infrastructure stays in the test directory. Ghost variables in the target would pollute production bytecode and add gas cost. By keeping ghosts in the Handler, the conservation discipline costs zero gas to deploy. **Tests should never modify production contracts to be testable; the Handler isolates test-only state from target state.**

3. **Sequence shrinking is per-call, not per-byte.** When invariant fails, the shrinker reduces *which calls to keep* and *what their arguments are* in separate passes. It doesn't try to mutate the call graph randomly; it walks the sequence and asks "can I drop this call?" then "can I shrink this argument?" Foundry inherits this from \`proptest\`'s state-machine shrinking strategy. The result: minimal counterexamples are usually 2–5 calls, never the original 30+. **Per-call shrinking is what makes invariant testing debuggable; without it, you'd get 50-call traces no one could parse.**

## Answer key

After L3:

\`\`\`
   my-foundry-lab/
   ├── foundry.toml                      (+ [invariant] section)
   ├── src/Counter.sol                    (unchanged from L1)
   ├── test/Counter.t.sol                 (unchanged from L2)
   ├── test/CounterHandler.sol            (new — Handler with wrappedIncrement + wrappedSetNumber)
   ├── test/Counter.invariant.t.sol       (new — invariant test with targetContract)
   └── lib/forge-std/                     (unchanged)
\`\`\`

After L3:
- \`forge test --match-contract CounterInvariantTest\` passes \`(runs: 256, calls: 12800, reverts: 0)\`
- You've seen the multi-call counterexample format (sequence of calls, not single args)
- You've watched the shrinker reduce a 30+ call failure to a 2-call minimal example
- You understand why Handlers exist: they bound inputs so iterations are productive

## Q&A

**Q1: Why not just call the target directly with \`targetContract(address(counter))\`?**

You can, and for trivial contracts it works. But for any contract with preconditions (e.g., \`withdraw(amount)\` requires \`amount <= balance\`), random \`uint256\` parameters would violate those preconditions on virtually every call. With \`fail_on_revert = true\`, the test fails immediately; with \`fail_on_revert = false\`, you get \`reverts: 12800\` and zero productive iterations. The Handler is the layer that converts random inputs into *bounded, sensible* inputs the target can actually exercise. **Direct fuzzing works for stateless or precondition-free targets; Handler-mediated fuzzing works for everything else.**

**Q2: Can I have multiple \`invariant_*\` functions in one test contract?**

Yes, and you should. openhl-liquidation L13's capstone has 4 separate invariant proptests, each asserting a different conservation law. The same applies here: each \`invariant_*\` checks one law. Foundry runs all of them after every call. If three pass and one fails, you know which law broke, which is much easier to debug than a single bundled invariant. **One invariant per conservation law; multiple invariants per Handler is the norm.**

**Q3: What's the difference between \`targetContract\` and \`targetSelector\`?**

\`targetContract(address)\` tells Foundry "fuzz any \`public\`/\`external\` method on this contract." \`targetSelector(FuzzSelector({addr: address, selectors: [bytes4[]]}))\` is finer-grained: "fuzz only these specific methods on this contract." Use \`targetSelector\` when your Handler has methods you don't want fuzzed (e.g., view-only helpers) but can't easily make private. For most Handlers, \`targetContract\` plus careful \`public\`/\`internal\` discipline is enough. **Start with \`targetContract\`; reach for \`targetSelector\` when you need surgical scoping.**

**Q4: How is this different from openhl-liquidation L13's proptests?**

L13 uses Rust's \`proptest!\` macro with a manually-constructed test that calls the insurance fund methods in sequence and asserts conservation. The pattern is identical to what \`forge invariant\` does: random sequences of operations, conservation laws asserted after each. The key differences: \`forge invariant\` provides the sequencing+shrinking machinery as a built-in (you write only the Handler + invariants), while in Rust you typically write the sequencing yourself or use \`proptest-state-machine\`. Foundry's tooling is more turnkey for stateful testing; Rust's gives you finer control. **Same theorem, Foundry's tooling lifts more of the ceremony.**

**Q5: When \`fail_on_revert = false\`, how do I know if my Handler is correct?**

Watch the \`reverts:\` counter. If \`reverts: 12800\` out of 12800 calls, every Handler call reverted — your input bounding is broken. If \`reverts: 30\`, you have occasional reverts which is usually fine (some operations naturally fail given certain prior state). If \`reverts: 0\`, your Handler is tight enough to flip to \`fail_on_revert = true\` for the stricter proof. **\`reverts:\` is your Handler-quality dashboard; aim for low single digits or zero.**

**Q6: Can \`invariant_*\` functions modify state for setup?**

No. They must be \`view\` or \`pure\` — Foundry calls them between Handler calls and a state mutation inside an invariant would corrupt the test sequence. If you need to do work before checking, do it inside the Handler or in \`setUp()\`. **Invariants are pure observations of state; they never mutate.**

## Next lesson (L4) — \`cast\` — the Solidity CLI swiss army knife

L4 leaves the testing primitives behind and introduces \`cast\`, the CLI tool that ships with Foundry. Where \`forge\` builds and tests, \`cast\` interacts with chains, decodes data, and computes ABI encoding from your terminal — same workflow ergonomics as \`curl\` for HTTP. Cross-references to \`alloy\` (which \`cast\` is built on, just like Reth) make this lesson the "if you grok \`alloy::Provider\`, you already know cast's mental model" payoff for Rust engineers.

You'll learn:
- \`cast call\` for read-only contract queries (RPC equivalent of a view function)
- \`cast send\` for state-changing transactions (with \`--rpc-url\` to point at mainnet/testnet/anvil)
- \`cast abi-encode\` / \`cast abi-decode\` for working with calldata in scripts
- \`cast block\` / \`cast tx\` / \`cast logs\` for chain introspection
- The full read-eval pattern: write contract → forge test → cast call against a forked anvil to verify behavior on real state

After L4 you'll be able to interact with deployed contracts from a shell loop without writing a Solidity script — the CLI equivalent of \`curl\`+\`jq\` for the EVM.
`,
                },
              ],
            },
          },
          {
            title: "CLI & state-aware testing",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "Lesson 4 — cast — the EVM's curl + jq",
                  slug: "foundry-cast-cli-en",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 60,
                  content: `# Lesson 4 — \`cast\` — the EVM's \`curl\` + \`jq\`

## Goal

Concepts you'll grasp in this lesson:

- **\`cast\` is \`alloy::Provider\` exposed as a terminal command.** Every \`cast\` subcommand maps to a method on \`alloy_provider::Provider\` — the same trait you call from Rust code in the rethlab \`alloy-provider\` lesson. \`cast call\` ↔ \`provider.call(...)\`, \`cast block\` ↔ \`provider.get_block(...)\`, \`cast send\` ↔ \`provider.send_transaction(...)\`. The CLI is a thin shell wrapper around the same Rust code path. If you already wrote \`provider.call().await?\` in Rust, you're not learning a new mental model — you're learning a new keyboard shortcut. **\`cast\` is alloy bindings + a shell prompt; the underlying RPC requests are identical.**
- **\`cast\` separates *what you're asking* from *which chain you're asking it of*.** Every command takes an optional \`--rpc-url <URL>\` flag that points at a node. With no flag, \`cast\` uses \`$ETH_RPC_URL\` from your environment. The same \`cast call\` against mainnet, sepolia, or a local anvil instance is a single flag change — the command itself is identical. **The chain is a parameter, not a binding.** This is the L1-engineer payoff: the same query reads from prod, staging, or a forked simulation with one substitution.
- **Read-only \`cast call\` and state-changing \`cast send\` are the two verbs you'll use 90% of the time.** \`cast call\` runs view/pure functions or simulates a transaction without broadcasting — it returns the function's return value as raw bytes (or decoded if you pass a function signature). \`cast send\` actually broadcasts a transaction, requires a \`--private-key\`, and prints the transaction hash. The remaining commands (\`cast block\`, \`cast tx\`, \`cast logs\`, \`cast abi-encode\`, \`cast 4byte\`) are introspection and data-manipulation tools — useful, but the load-bearing pair is \`call\` and \`send\`. **Most production debugging is \`cast call\` against a forked anvil; most production deployment is \`cast send\` against testnet then mainnet.**
- **\`cast abi-encode\` / \`cast abi-decode\` close the data-layer loop.** When you need to construct calldata manually (for \`cast send --create\`, for a multisig submission, for embedding in a Solidity script), \`cast abi-encode "transfer(address,uint256)" 0x... 1000\` produces the exact bytes that would be sent on-chain. \`cast abi-decode\` does the inverse — given calldata and a function signature, it pulls out the typed arguments. This is the *same* ABI machinery that \`forge\`'s test runner uses internally, exposed at the CLI. **If you've ever debugged calldata by hand, \`cast abi-decode\` is the tool that should have been in your shell aliases years ago.**

Verification:

\`\`\`bash
cast --version
cast call --rpc-url https://ethereum.reth.rs/rpc \\
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 "totalSupply()(uint256)"
\`\`\`

…runs against real mainnet via the Reth project's public RPC and returns USDC's current total supply (a ~12-digit number in 6-decimal precision). After this lesson you'll know which \`cast\` subcommands map to which alloy methods, when to reach for \`cast call\` vs \`cast send\`, and how to assemble calldata by hand when you need to.

Specific changes:

- **No source-file edits.** L4 is all CLI invocation. You'll run ~8 different \`cast\` commands against mainnet and (optionally) against a local anvil.
- **\`.env\`** (optional) — you may want to set \`ETH_RPC_URL=https://ethereum.reth.rs/rpc\` to avoid passing \`--rpc-url\` on every command. The L5 lesson on anvil will demonstrate switching \`ETH_RPC_URL\` between mainnet and a forked anvil per terminal session.

Total: zero lines of Solidity. L4 is shell time. The pedagogical move is internalizing the alloy-method ↔ cast-subcommand mapping so the next time you reach for a Rust \`Provider\`, you reach for \`cast\` first.

## Recap

After L3:
- \`forge invariant\` runs random call sequences against a Handler, checks \`invariant_*\` after each call.
- Handlers wrap targets, bound inputs, track ghost variables (shadow specification).
- Sequence shrinking reduces a 30+ call failure to a 2-call minimal counterexample.

L3 lived inside \`test/\` files. L4 leaves the test directory entirely — \`cast\` is what you reach for when you have a deployed contract, a transaction hash, or calldata you need to decode, and you don't want to write a Solidity script just to look at it. **The L1 engineer's debug loop is \`forge test\` then \`cast call\`, not \`forge test\` alone.**

## Plan

Five categories of invocation:

1. **\`cast call\`** — read mainnet state from the terminal. We'll query USDC's \`totalSupply()\` and \`balanceOf(address)\` for a known address.
2. **\`cast block\` / \`cast tx\`** — chain introspection. Look up a recent mainnet block; inspect a specific transaction by hash.
3. **\`cast abi-encode\` / \`cast abi-decode\`** — calldata manipulation. Build the bytes for an ERC-20 transfer call; decode bytes back to typed arguments.
4. **\`cast 4byte\` / \`cast 4byte-decode\`** — function-selector lookup. Given the first 4 bytes of calldata, find the human-readable function name via the public 4byte directory.
5. **\`cast send\` against a local anvil (preview)** — state-changing transactions. We won't deploy anything significant; the exercise demonstrates how \`cast send\` interacts with a chain (L5 covers anvil itself in depth).

> 🛑 **Predict.** Before reading on: in the rethlab \`alloy-provider\` lesson, you wrote (paraphrased) \`let supply = provider.call(&tx).await?\` where \`tx\` was built with \`eth_call\` semantics. What's the exact \`cast\` invocation that produces the same result against mainnet?

(Answer: **\`cast call --rpc-url <URL> <contract-address> "<function-signature>" [args...]\`**. The pieces map directly: the \`--rpc-url\` flag is the alloy \`RootProvider\`'s underlying transport URL, the contract address is the \`to\` field in the transaction, the function signature is the human-readable ABI shorthand that cast hashes into a 4-byte selector internally (alloy uses the same \`Function::parse\` machinery), and any args are positional. The return is raw hex unless you specify return types as \`"(...returntypes)"\` after the function signature, in which case cast decodes for you. **Same code path, two surfaces — Rust for programs, cast for the shell.**)

## How \`cast\` maps to \`alloy::Provider\`

\`\`\`
┌─────────────────────────┬────────────────────────────────────────────────┐
│  cast subcommand        │  alloy::Provider method                        │
├─────────────────────────┼────────────────────────────────────────────────┤
│  cast call              │  provider.call(tx)                             │
│  cast send              │  provider.send_transaction(tx)                 │
│  cast block             │  provider.get_block(block_id)                  │
│  cast tx <hash>         │  provider.get_transaction_by_hash(hash)        │
│  cast receipt <hash>    │  provider.get_transaction_receipt(hash)        │
│  cast logs              │  provider.get_logs(filter)                     │
│  cast balance <addr>    │  provider.get_balance(addr)                    │
│  cast nonce <addr>      │  provider.get_transaction_count(addr)          │
│  cast chain-id          │  provider.get_chain_id()                       │
│  cast gas-price         │  provider.get_gas_price()                      │
│  cast block-number      │  provider.get_block_number()                   │
├─────────────────────────┼────────────────────────────────────────────────┤
│  cast abi-encode        │  alloy_dyn_abi::DynSolType::abi_encode         │
│  cast abi-decode        │  alloy_dyn_abi::DynSolType::abi_decode         │
│  cast 4byte             │  (public 4byte directory lookup, not RPC)      │
│  cast keccak <data>     │  alloy_primitives::keccak256(data)             │
└─────────────────────────┴────────────────────────────────────────────────┘
\`\`\`

The structural takeaway: \`cast\` ≈ \`alloy::Provider\` for RPC operations, \`cast\` ≈ \`alloy_dyn_abi\` for ABI operations. If you've grokked these two crates from the rethlab Fundamentals course, you already know what every \`cast\` subcommand does — you just don't know the argument syntax yet.

## Walk-through

### Step 1: Orient — \`cast --version\` and \`cast help\`

\`\`\`bash
cast --version
\`\`\`

You should see something like \`cast Version: 1.7.x\` matching your \`forge\` version (both ship from the same \`foundry-rs/foundry\` binary distribution).

\`\`\`bash
cast help
\`\`\`

The output is a flat list of subcommands. Three things to notice:

1. **Subcommands are categorized by what they touch.** \`cast call\`, \`cast send\`, \`cast call --trace\` interact with chain state. \`cast abi-*\`, \`cast keccak\`, \`cast 4byte\` are local data-manipulation tools (no RPC). \`cast wallet\` manages keys. Mentally bucket them: *RPC commands need \`--rpc-url\`; local commands don't*.
2. **Many subcommands have aliases.** \`cast call\` is also \`cast c\`, \`cast send\` is also \`cast s\`. You don't need to type them out long-form in interactive use. The full names appear in scripts.
3. **\`cast help <subcommand>\`** gives detailed flags for any subcommand. \`cast help call\` shows every flag \`cast call\` accepts (block tag, value, gas overrides, etc.). **When in doubt, \`cast help <subcommand>\` is faster than reading docs.**

### Step 2: Read mainnet state with \`cast call\`

Public RPC endpoint we'll use throughout: \`https://ethereum.reth.rs/rpc\` (the Reth project's public node — same one used in the rethlab \`alloy-provider\` lesson).

\`\`\`bash
cast call --rpc-url https://ethereum.reth.rs/rpc \\
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \\
  "totalSupply()(uint256)"
\`\`\`

That's USDC's contract address on mainnet, calling \`totalSupply()\` and asking cast to decode the return as a \`uint256\`.

Expected output:

\`\`\`
35234876543210000000  # the exact number changes; ~35 billion USDC in 6-decimal precision
\`\`\`

Six things to notice:

1. **The function signature is the human-readable Solidity form, not the 4-byte selector.** cast parses \`"totalSupply()(uint256)"\` internally using the same parser alloy uses, hashes the signature with keccak256, takes the first 4 bytes, and uses that as the function selector in the underlying \`eth_call\`. **You write Solidity-ergonomic syntax; cast does the encoding.**
2. **The \`(uint256)\` after the function name is the return-type annotation.** Without it, cast prints the raw hex bytes (\`0x0000...\`). With it, cast decodes the return as a \`uint256\` and prints the decimal. Multi-return functions follow the same pattern — \`"slot0()(uint160,int24,uint16,uint16,uint16,uint8,bool)"\` is the Uniswap V3 pool's slot0 signature, and cast prints each tuple element on its own line. If the inline decode trips on an exotic signature (rare but possible — dynamic arrays of structs are the usual suspects), the stable fallback is to drop the return-type annotation entirely and pipe the raw hex into \`cast abi-decode "<full-signature>"\`, which uses the same parser but in a more permissive context. **For most real production signatures, the inline form just works; reach for \`cast abi-decode\` only when it doesn't.**
3. **No private key needed.** \`cast call\` is read-only; it executes against the node's view of state without broadcasting. This is the workhorse for production debugging — you can simulate any view function against mainnet without spending a wei.
4. **\`--rpc-url\` can be replaced by \`ETH_RPC_URL\` in your shell env.** Set \`export ETH_RPC_URL=https://ethereum.reth.rs/rpc\` once and drop the flag from subsequent commands. The L5 lesson on anvil will show switching \`ETH_RPC_URL\` between mainnet and forked anvil.
5. **The output decimal is raw integer, not human-formatted.** USDC has 6 decimals, so \`35,234,876,543,210,000,000\` raw means \`35,234,876,543,210.000000 USDC\`. cast doesn't apply decimal scaling — that's your job, or use \`cast --to-unit <value> ether\` for conversion (despite the name, the unit conversion is general).
6. **The mainnet block used for \`cast call\` is the chain's current head by default.** To call against a specific block, add \`--block <number-or-hash-or-tag>\`. Useful for replaying past state: \`--block 12345678\` simulates what \`totalSupply()\` would have returned at that block.

Try one more — query a specific address's USDC balance:

\`\`\`bash
cast call --rpc-url https://ethereum.reth.rs/rpc \\
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \\
  "balanceOf(address)(uint256)" \\
  0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503  # arbitrary mainnet address
\`\`\`

This is the CLI equivalent of \`provider.call(USDC.balanceOf(addr).await?)\` in Rust. Same RPC underneath, different keyboard ergonomics.

### Step 3: Inspect blocks and transactions

Look at the current block:

\`\`\`bash
cast block latest --rpc-url https://ethereum.reth.rs/rpc
\`\`\`

You'll see a YAML-style dump: \`number\`, \`hash\`, \`parentHash\`, \`timestamp\`, \`gasLimit\`, \`gasUsed\`, \`baseFeePerGas\`, \`miner\`, the full transactions list, withdrawals, etc. Same data structure alloy's \`Block\` type contains, formatted for terminal reading.

\`\`\`bash
cast block 19000000 --rpc-url https://ethereum.reth.rs/rpc
\`\`\`

Lookup by number — replaying a historical block. Useful when debugging "what state did contract X have at block N."

Inspect a specific transaction:

\`\`\`bash
cast tx 0xa84a9... --rpc-url https://ethereum.reth.rs/rpc  # any real mainnet tx hash
\`\`\`

Returns the transaction's \`from\`, \`to\`, \`value\`, \`input\` (the calldata), \`gas\`, \`gasPrice\`, \`nonce\`, signature components. **The \`input\` field is where you'll most often want \`cast abi-decode\` next.**

The receipt — what actually happened when the tx mined:

\`\`\`bash
cast receipt 0xa84a9... --rpc-url https://ethereum.reth.rs/rpc
\`\`\`

Includes \`status\` (1 = success, 0 = reverted), \`gasUsed\`, the emitted \`logs\` (events), \`blockNumber\`, etc. **When debugging "did my deploy succeed," \`cast receipt\` is the first command after \`cast send\`.**

### Step 4: Manipulate calldata with \`cast abi-encode\` / \`cast abi-decode\`

Build the calldata for an ERC-20 \`transfer(address,uint256)\` call:

\`\`\`bash
cast abi-encode "transfer(address,uint256)" \\
  0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503 \\
  1000000  # 1 USDC in 6-decimal precision
\`\`\`

Output (the actual calldata bytes for the call):

\`\`\`
0xa9059cbb00000000000000000000000047ac0fb4f2d84898e4d9e7b4dab3c24507a6d50300000000000000000000000000000000000000000000000000000000000f4240
\`\`\`

Three sections to read:
- \`0xa9059cbb\` — the 4-byte selector for \`transfer(address,uint256)\` (keccak256 of the signature, first 4 bytes)
- \`0000...0047ac...\` — the first argument (address), padded to 32 bytes
- \`0000...0f4240\` — the second argument (uint256 1,000,000 = 0xf4240), padded to 32 bytes

This is the exact \`data\` field you'd embed in a raw transaction. **For multisig proposals, governance calldata, or Solidity scripts that need to construct external calls, this is how you build the bytes.**

Reverse the operation — given calldata, recover the typed arguments:

\`\`\`bash
cast abi-decode "transfer(address,uint256)" \\
  0xa9059cbb00000000000000000000000047ac0fb4f2d84898e4d9e7b4dab3c24507a6d50300000000000000000000000000000000000000000000000000000000000f4240
\`\`\`

Output:

\`\`\`
0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503
1000000
\`\`\`

**\`abi-decode\` is what you reach for when you have a mystery calldata blob and a function signature.** Most production debugging is "I have this calldata from a tx, what does it actually do" — and that's exactly what \`cast abi-decode\` solves.

### Step 5: Function-selector lookup with \`cast 4byte\`

Sometimes you have calldata but *don't* know the function signature. The first 4 bytes are the selector; cast queries a public directory (4byte.directory) to recover the human-readable name:

\`\`\`bash
cast 4byte 0xa9059cbb
\`\`\`

Output:

\`\`\`
transfer(address,uint256)
\`\`\`

If multiple candidate signatures hash to the same 4 bytes, cast lists all of them — selector collisions exist (rare for production functions, common for obscure ones). **\`cast 4byte\` is the first command you run on unknown calldata before reaching for \`cast abi-decode\`.**

A full unknown-calldata debug loop:

\`\`\`bash
# Step 5a — given mystery calldata, find the function name:
cast 4byte 0xa9059cbb
# → transfer(address,uint256)

# Step 5b — decode the calldata using the recovered signature:
cast abi-decode "transfer(address,uint256)" 0xa9059cbb...
# → 0x47ac... 1000000
\`\`\`

### Step 6: Preview \`cast send\` against a local anvil

\`cast send\` is \`cast call\`'s state-changing twin. It requires a private key (or one of the wallet-management commands), broadcasts the transaction, and prints the resulting transaction hash. We won't actually send anything significant — L5 covers anvil and the full local-development loop — but the syntax is worth seeing:

\`\`\`bash
# Start a local anvil in another terminal (L5 covers this in depth):
#   anvil
# Anvil prints 10 funded test accounts and their private keys.

# Send a transaction against the local anvil:
cast send --rpc-url http://localhost:8545 \\
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \\
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \\
  "transfer(address,uint256)" \\
  0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503 \\
  1000000
\`\`\`

Three things to notice (even without running it):

1. **\`--private-key\` is the only new flag vs \`cast call\`.** Everything else is identical. cast signs the transaction with the key, broadcasts via the RPC, and prints the hash.
2. **The default anvil private key \`0xac0974...\`** comes pre-funded — anvil seeds 10 deterministic accounts on startup. Same private key every time, safe for local development only. **Never use anvil's default keys against any real network.**
3. **The output is a transaction hash** — pipe it into \`cast receipt $tx\` (back-tick the hash) to see status, gas used, and emitted logs. The two-step pattern is \`cast send\` → \`cast receipt\`, just like in alloy you'd do \`provider.send_transaction(...).await?.get_receipt().await?\`.

L5 (next lesson) returns to anvil with mainnet forking, which is where \`cast send\` becomes truly useful — you can simulate real mainnet transactions against forked state without spending real ETH.

## Common errors

- **\`error sending request for url\`** — \`--rpc-url\` is unreachable. Check the URL, your network, or fall back to a different public RPC (Cloudflare's, Ankr's, etc.).
- **\`Error: Wrong function selector ...\`** — the function signature you passed doesn't match the contract. Use \`cast 4byte\` on the contract's actual calldata to recover correct signatures, or read the contract's ABI from a block explorer.
- **\`Error: missing field "input"\`** — you're querying a transaction hash that doesn't exist on the chain you're pointed at (e.g., you used a mainnet hash against a testnet RPC). Verify the chain.
- **\`cast send\` returns the tx hash but the receipt shows \`status: 0\`** — the tx mined but reverted. Use \`cast call\` with the same calldata to see the revert reason (cast call simulates without broadcasting and shows revert messages).
- **\`Error: insufficient funds\`** — your \`--private-key\` controls an account with no ETH on the target chain. For local anvil, use one of anvil's seeded accounts; for testnets, request from a faucet.

## Design retrospective

Three load-bearing decisions in \`cast\`'s design:

1. **\`cast\` reuses alloy under the hood — no separate JSON-RPC client.** Foundry's \`cast\` binary links against the same \`alloy\` crates Reth uses. Every \`cast\` invocation walks the same code path your Rust program would. The implication: if Reth supports a new RPC method (e.g., new tracing endpoints), \`cast\` gets it for free once the alloy version bumps. **One implementation, two surfaces. The CLI is not maintained separately from the library.**

2. **Function signatures are human-readable, not 4-byte selectors.** cast could have required you to pass \`0xa9059cbb\` for \`transfer(address,uint256)\` — Geth's \`eth_call\` does take the raw bytes. cast accepts both, but the human-readable form is the documented default. The discipline: *the keyboard ergonomics match the Solidity source you wrote*. **The thing you type into cast matches the thing you typed into Solidity. No mental translation step.**

3. **\`--rpc-url\` is per-command, not per-session.** You can set \`ETH_RPC_URL\` once in your environment, but every individual \`cast\` invocation can override it inline. This is deliberately stateless — there's no "current chain" mode like \`npm\` has with \`npm config set registry\`. The reason: chain mistakes are catastrophic (sending to mainnet when you meant testnet), and cast's design forces the chain to be visible on every state-changing command. **Statelessness is a safety feature, not a usability oversight.**

## Answer key

After L4, your shell history should include something like:

\`\`\`bash
# Read mainnet
cast call --rpc-url https://ethereum.reth.rs/rpc \\
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \\
  "totalSupply()(uint256)"

# Inspect a block
cast block latest --rpc-url https://ethereum.reth.rs/rpc

# Build calldata
cast abi-encode "transfer(address,uint256)" 0x... 1000000

# Decode mystery calldata
cast 4byte 0xa9059cbb
cast abi-decode "transfer(address,uint256)" 0xa9059cbb...

# Optional: send against local anvil
cast send --rpc-url http://localhost:8545 \\
  --private-key 0xac09... 0xA0b8... "transfer(address,uint256)" 0x47ac... 1000000
\`\`\`

After L4 you can:
- Read any view function on any contract on any chain from your terminal
- Inspect blocks and transactions without opening a block explorer
- Build and decode calldata for multisig proposals, governance, or scripts
- Look up unknown function selectors via 4byte
- Send transactions against local anvil (full anvil treatment in L5)

## Q&A

**Q1: Why use \`cast\` when Etherscan + a browser do the same thing?**

Three reasons. **(a) Composability** — \`cast\` output pipes into \`jq\`, \`awk\`, \`xargs\`, \`grep\`, exactly like any Unix tool. Etherscan output is in a browser. **(b) Reproducibility** — a cast command is a shareable bash one-liner; an Etherscan workflow is a series of clicks you can't paste into a runbook. **(c) Speed** — \`cast call\` against a local Reth node returns in milliseconds; Etherscan loads in seconds with rate limits. For L1 engineers doing dozens of view queries per hour, cast is 10×+ faster than browser-based tools. **Etherscan for one-off exploration; cast for everything else.**

**Q2: Does \`cast\` support every JSON-RPC method or only a subset?**

cast exposes ~30 named subcommands covering the common methods. For anything not directly exposed, use \`cast rpc <method> [params...]\` which is the raw escape hatch — it sends the method name and parameters as a JSON-RPC request and prints the JSON response. **Same pattern as \`provider.client().request::<...>()\` in alloy when you want a method without a typed wrapper.**

**Q3: How does \`cast\` handle signed transactions for \`cast send\`?**

When you pass \`--private-key\`, cast constructs the transaction client-side, signs it with the key (using \`alloy_signer_local\`), and submits the *signed* transaction via \`eth_sendRawTransaction\`. The private key never leaves your machine. For hardware-wallet workflows, use \`--ledger\` or \`--trezor\` instead; cast walks the same \`alloy_signer_*\` traits. **The signing is local; the RPC only sees broadcast bytes.**

**Q4: When should I write a Rust program with \`alloy::Provider\` instead of using \`cast\`?**

When the workflow is longer than 3 commands or needs branching/loops/error handling beyond bash. Rough rule: ad-hoc queries → \`cast\`; repeated workflows or anything that runs in CI → Rust + alloy. For one-time deployments, \`cast send\` is fine. For deployment scripts that need to verify, set up roles, transfer ownership, configure parameters — write a Rust binary (or a Foundry \`script/\` file in Solidity). **cast scales to a 1-line bash script; alloy scales to a deployment binary.**

**Q5: Can \`cast call\` simulate a transaction with a different \`msg.sender\`?**

Yes. The \`--from <address>\` flag overrides who the transaction appears to come from. Useful for testing access-controlled functions — \`--from <owner-address>\` lets you simulate what the owner would see. Note: this is a *simulated* call; it doesn't actually impersonate the address on-chain. If you need impersonation for tests, that's \`vm.prank\` in Solidity or \`anvil_impersonateAccount\` via RPC (L5 covers both). **cast call --from for simulation, anvil_impersonateAccount for forked-chain testing.**

**Q6: Does \`cast\` work with non-Ethereum EVM chains?**

Yes — anything that speaks the standard JSON-RPC interface. Optimism, Arbitrum, Base, Polygon, BNB Chain, your custom L2 — all work identically. Just point \`--rpc-url\` at the right endpoint. The exception is chains with non-standard RPC methods (e.g., Tron, NEAR, non-EVM Solana) which obviously don't apply. **For any EVM-compatible chain, cast is your CLI; for non-EVM chains, you need the chain's own tooling.**

## Next lesson (L5) — \`anvil\` + cheatcodes — local development with mainnet state

L5 wires the last piece: local development against *real* mainnet state via \`anvil --fork-url\`. You'll learn:

- \`anvil --fork-url <mainnet-rpc>\` — spin up a local chain that mirrors mainnet's current state at startup
- The 10 funded test accounts anvil seeds, and why they're deterministic
- Anvil-specific RPC methods: \`anvil_impersonateAccount\`, \`anvil_setBalance\`, \`anvil_mine\`, \`anvil_setStorageAt\`
- How Foundry's \`vm.*\` cheatcodes (from L1–L3 tests) map to anvil's RPC equivalents — same machinery, different surface
- The full local-dev loop: \`anvil --fork-url\` → \`cast send\` against forked mainnet → \`cast call\` to verify → no real ETH spent

After L5 you can develop against mainnet state without leaving your laptop. L5 closes the test-discipline + CLI portion of the course; L6 is the capstone where you port openhl-liquidation Stage 10b's \`InsuranceFund\` to Solidity and prove the same 4 conservation invariants with \`forge invariant\`.
`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
