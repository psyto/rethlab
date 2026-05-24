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
      duration: 40,
      xpReward: 100,
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

- **Why Foundry won the Solidity tooling war**: because it's Rust-built, single-binary, sub-second-feedback, and embeds Revm directly — the same Revm you've been peering into across the openhl courses.
- **Why Hardhat / Truffle / Brownie lost ground**: JS-based, slower, indirect EVM access via remote forks rather than embedded execution.
- **What \`forge fuzz\` and \`forge invariant\` actually do under the hood** — they're orchestrating Revm via the same patterns rethlab teaches in \`crates/evm\` of openhl, just exposed as Solidity-side tests.
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

1. **Speed.** Foundry's test runner embeds Revm directly in-process. There's no IPC round-trip between a JS test runner and a separate \`ganache\` / \`hardhat node\`. A 1,000-test suite that takes 60 seconds in Hardhat finishes in 2-3 seconds with \`forge test\`. The architecture difference:

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
      │   │   │  test runner │     Revm execution            │  │
      │   │   └──────────────┘     (same process)            │  │
      │   └─────────────────────────────────────────────────┘  │
      │            ↑ ~µs per call, no IPC, no serialization     │
      └─────────────────────────────────────────────────────────┘
   \`\`\`

   The 20-30× speedup isn't an optimization — it's an architectural consequence of removing the process boundary.
2. **Fuzzing as a first-class primitive.** Hardhat had property-based testing as a plugin. Foundry shipped it built-in, with shrinking, with corpus persistence, with invariant testing for sequenced calls. The closest JS equivalent (\`fast-check\` + Hardhat) requires non-trivial wiring.
3. **Cheatcodes-as-precompiles.** Hardhat's \`evm_snapshot\` / \`evm_increaseTime\` are JSON-RPC methods that ask a remote node to change its state. Foundry's \`vm.warp\` / \`vm.deal\` / \`vm.prank\` are Solidity calls to a magic precompile at address \`0x7109709ECfa91a80626fF3989D68f67F5b1DD12D\` that **hacks Revm's state from the inside** — same process, no IPC, no remote-node trust. For readers who came through the openhl Precompiles course (Stage 9), this is the *same precompile-as-EVM-superpower pattern* you learned in Rust, exposed via Solidity for testing. Faster, more composable, and (importantly) testable inside the same Solidity file as the contracts they test.

**The strategic implication for an L1 engineer:** if you write or read Reth/Revm/Alloy code (rethlab's existing focus), Foundry is the same toolchain in a different language wrapper. Learning it is not switching ecosystems — it's adding a second language to the same execution engine.

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
[⠒] Compiling 27 files with Solc 0.8.28
[⠢] Solc 0.8.28 finished in 1.49s
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
pragma solidity ^0.8.28;

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

1. **\`pragma solidity ^0.8.28\`** — the \`^\` is a caret-style version constraint (same syntax Cargo uses). Means "any 0.8.28+ version, but not 0.9". Solidity 0.8 is the discipline-line: it introduced built-in overflow checks (no more \`SafeMath\`), which is what makes our \`test_RevertWhen_DecrementBelowZero\` test possible later.
2. **\`uint256 public number\`** — \`public\` auto-generates a getter function (\`number()\`) returning the value. The state variable itself can also be written directly from inside the contract; from outside, only the auto-generated getter is callable. **Solidity collapses \`let pub\` and \`let pub fn ...()\` into one declaration.**
3. **No constructor.** Default initialization: \`number = 0\`. Same default-zero semantics as Rust's \`i64::default()\`.
4. **\`setNumber\` and \`increment\` are \`public\`** — anyone can call them. (Restriction modifiers like \`onlyOwner\` would go here in production; the example is intentionally permissionless.)
5. **No \`decrement\` function exists.** That's a hint. Our new test will *add* a decrement function in the test file (via local construction), then test that it reverts on underflow.

### Step 3: Read \`test/Counter.t.sol\`

\`\`\`solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

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
4. **The \`uint256 zero = 0; zero - 1\` pattern is the constant-folding workaround.** Writing \`uint256(0) - 1\` as a literal expression looks identical but doesn't compile — Solc 0.8 evaluates literal arithmetic at compile time, sees the underflow, and rejects the source. Storing zero in a local variable opaques it past the constant folder; the SUB opcode runs at runtime, and the *runtime* overflow check (which Solidity 0.8 inserts around every arithmetic op outside \`unchecked {}\`) is what triggers \`Panic(0x11)\`. **Compile-time and runtime overflow checks live at different layers; the pattern you write determines which one fires.**
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
- **\`Error: test_RevertWhen_DecrementBelowZero() FAILED. Reason: call did not revert as expected\`** — your Solidity version isn't 0.8.x and lacks the built-in overflow check. Check \`pragma solidity ^0.8.28\` is at the top of \`Counter.sol\`.
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

3. **\`vm.*\` cheatcodes are precompiles, not JS-side wrappers.** Hardhat's \`evm_snapshot\` is an RPC method; Foundry's \`vm.expectRevert\` is a precompile call. The cheatcode lives at address \`0x7109709ECfa91a80626fF3989D68f67F5b1DD12D\` and Foundry's Revm fork intercepts calls to that address — exactly the precompile-as-EVM-superpower pattern from openhl Stage 9. **L1 only used \`vm.expectRevert\`; L2 and L3 will introduce more cheatcodes. Each one is a precompile.**

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

**Q6: Why does Solidity have \`pragma solidity ^0.8.28\` instead of \`[package] edition = "2024"\` like Rust?**

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
              ],
            },
          },
        ],
      },
    },
  });
}
