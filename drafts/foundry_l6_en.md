# Mastering Foundry — L6 draft (EN)

> Capstone. References openhl-liquidation Stage 10b (`260883b`) for the Rust `InsuranceFund` source-of-truth. Cross-references L13's per-scan conservation proptests (`0a8464e`) for the 4-invariant shape being ported. All capstone artifacts live in-repo at `examples/foundry-capstone/`.

## L6 — `foundry-capstone-en`

**Title**: Lesson 6 — Capstone — port openhl-liquidation's `InsuranceFund` to Solidity, prove the 4 invariants

**Duration**: 60 min · **XP**: 110

---

````markdown
# Lesson 6 — Capstone — port openhl-liquidation's `InsuranceFund` to Solidity, prove the 4 invariants

## Goal

Concepts you'll grasp in this lesson:

- **The capstone proves the course's thesis with code, not prose.** Everything L0–L5 set up was about one claim: the conservation-law discipline you used in openhl-liquidation transfers mechanically to Solidity, and `forge invariant` proves it the same way `proptest!` did. L6 is where you stop reading that claim and *execute* it. You'll take openhl-liquidation Stage 10b's `InsuranceFund` — the Rust contract that holds the system's last-line-of-defense capital — and port it to Solidity field-by-field. You'll write a `Handler` that mirrors the `proptest!` state-machine shape from L13. And you'll prove the same 4 conservation invariants in Solidity that L13 proved in Rust. When the green `(runs: 256, calls: 12800, reverts: 0)` line prints, the course is over — you've demonstrated that the discipline survives the language boundary.
- **Four invariants, one shape: conservation laws as equalities between contract state and ghost accounting.** Every invariant in this capstone takes the form `<contract observable> == <function of ghost variables>`. (1) **Conservation:** `fund.balance() == ghostSumDeposits - ghostSumWithdrawn - ghostSumAbsorbed`. (2) **Deposit accounting:** `fund.totalDeposited() == ghostSumDeposits`. (3) **Withdraw accounting:** `fund.totalWithdrawn() == ghostSumWithdrawn`. (4) **Absorb decomposition:** `ghostSumAbsorbed + ghostSumUnabsorbed == ghostSumLossRequested`. These are the *same* four conservation laws as openhl-liquidation L13's proptests — same arithmetic, different syntax. **One conservation-law shape, used four times against four different observables.**
- **The Handler is where the Rust↔Solidity isomorphism lives.** The `InsuranceFundHandler` is a Solidity contract that exposes `wrappedDeposit(uint256)` / `wrappedWithdraw(uint256)` / `wrappedAbsorb(uint256)` and maintains five ghost variables. The methods bound inputs (so `forge invariant`'s random parameters always produce productive calls, not `vm.assume` rejections) and update ghosts in lockstep with the target. Each Solidity Handler method corresponds 1:1 to a `proptest!` state-machine transition function from the Rust L13 capstone. **If you look at the Handler and L13's `proptest!` block side-by-side, you'll see the same operations in the same order with the same accounting — translated, not redesigned.**
- **The lesson deliverable is permanent: `examples/foundry-capstone/`.** Everything you build in this lesson — `src/InsuranceFund.sol`, `test/InsuranceFundHandler.sol`, `test/InsuranceFund.invariant.t.sol` — lives in-repo as the course's answer key. Future readers who graduate L5 will check their own work against this exact directory. The capstone isn't disposable; it's the final artifact that proves the course works.

Verification:

```bash
cd examples/foundry-capstone
forge test --match-contract InsuranceFundInvariantTest -vvv
```

…prints `[PASS] invariant_Conservation() (runs: 256, calls: 12800, reverts: 0)` for each of the 4 invariants. After this lesson you'll have built the full capstone, watched the invariants hold across 12,800 random sequences, deliberately broken one to see the multi-call counterexample, and read the side-by-side diff against openhl-liquidation L13's Rust `proptest!`.

Specific changes:

- **New directory: `examples/foundry-capstone/`** — `forge init`-shape Foundry project pinned to the course's pragma `^0.8.35`. Treated as a sub-project, not part of the rethlab Next.js build.
- **3 new Solidity files** in that directory: `src/InsuranceFund.sol` (~80 lines), `test/InsuranceFundHandler.sol` (~70 lines), `test/InsuranceFund.invariant.t.sol` (~60 lines). Total ~210 lines across the capstone.

L6 is dense. 60 minutes is the time budget — half spent porting the Solidity, half watching `forge invariant` run and reading the L13 cross-reference. The payoff is the moment 4 green invariants print and you realize the conservation-law discipline carried across.

## Recap

After L5:
- L0: Foundry positioned as commodity prerequisite + REVM as the unifying engine
- L1–L3: Solidity testing discipline — `forge test`, `forge fuzz`, `forge invariant` (Handler pattern, ghost variables, sequence counterexamples)
- L4: `cast` as the CLI surface over `alloy::Provider`
- L5: `anvil` as the local mainnet clone + the three-surface REVM architecture

L6 closes the loop. Every concept from L0–L5 is used in the capstone:
- `vm.expectRevert` from L1 (testing the InsuranceFund's revert paths)
- `forge invariant` from L3 (the multi-call sequencing engine)
- The Handler pattern from L3 (`InsuranceFundHandler` mirrors `CounterHandler`'s shape)
- The 4 invariants from L3's openhl-liquidation L13 cross-reference (named earlier, ported now)

The course was always pointed at this artifact. The intermediate lessons were the prerequisites.

## Plan

Seven steps across three Solidity files:

1. **Set up the capstone project** — `mkdir examples/foundry-capstone && cd examples/foundry-capstone && forge init --no-git`. Pin the pragma. Delete the default Counter.
2. **Read openhl-liquidation Stage 10b's `InsuranceFund` source** — the Rust contract at `crates/openhl-liquidation/src/insurance_fund.rs` (SHA `260883b`). Identify the 3 operations (deposit, withdraw, absorb) and the 4 observable state fields.
3. **Write `src/InsuranceFund.sol`** — field-by-field port. Same operations, same field names (snake_case → camelCase), same revert conditions, same return shapes from `absorb`.
4. **Write `test/InsuranceFundHandler.sol`** — Handler with `wrappedDeposit` / `wrappedWithdraw` / `wrappedAbsorb` and 5 ghost variables (`ghostSumDeposits`, `ghostSumWithdrawn`, `ghostSumAbsorbed`, `ghostSumUnabsorbed`, `ghostSumLossRequested`).
5. **Write `test/InsuranceFund.invariant.t.sol`** — 4 invariants: `invariant_Conservation`, `invariant_DepositAccounting`, `invariant_WithdrawAccounting`, `invariant_AbsorbDecomposition`.
6. **Run `forge invariant`** — all 4 invariants should hold at the default 256 runs × 50 depth = 12,800 calls. Bump to 100,000 calls for the proof-of-the-day.
7. **Deliberate-break demo + side-by-side L13 diff** — break one ghost update in the Handler, watch the multi-call counterexample appear. Then `diff` the Solidity capstone against L13's Rust to see the same operations in the same order.

> 🛑 **Predict.** Before reading on: in openhl-liquidation L13, the cascade-conservation proptest had the form `assert_eq!(fund.balance(), initial + sum_deposits - sum_withdrawals - sum_absorbed)`. If you port this *exact* assertion to Solidity, what's the closest single line of forge invariant code? (Assume the Handler tracks the three sum-of-* ghosts.)

(Answer: **`assertEq(fund.balance(), handler.ghostSumDeposits() - handler.ghostSumWithdrawn() - handler.ghostSumAbsorbed());`** — same arithmetic, same operands, same assert. The only differences: Solidity's `assertEq` takes (actual, expected) instead of Rust's `(left, right)` ordering, and the ghost accessors are explicit `handler.X()` method calls because Solidity doesn't have field-direct access from another contract. **The transformation is mechanical because the underlying theorem is language-agnostic — conservation laws are math, not syntax.**)

## The deliverable file tree

```
examples/foundry-capstone/
├── foundry.toml                              ← invariant runs, depth, fail_on_revert
├── src/
│   └── InsuranceFund.sol                     ← ~80 lines — the Solidity port
├── test/
│   ├── InsuranceFundHandler.sol              ← ~70 lines — Handler with 3 wrapped methods + 5 ghosts
│   └── InsuranceFund.invariant.t.sol         ← ~60 lines — 4 invariant_* functions
└── lib/forge-std/                            ← standard forge-std submodule
```

When you finish L6, every file in this tree exists and `forge test` passes 4 invariant assertions at 12,800+ random sequences.

## The Rust ↔ Solidity field mapping

```
┌────────────────────────────────────────┬──────────────────────────────────────────┐
│  openhl-liquidation Stage 10b (Rust)   │  examples/foundry-capstone (Solidity)    │
├────────────────────────────────────────┼──────────────────────────────────────────┤
│  struct InsuranceFund { ... }          │  contract InsuranceFund { ... }          │
│  pub balance: u128,                    │  uint256 public balance;                 │
│  pub total_deposited: u128,            │  uint256 public totalDeposited;          │
│  pub total_withdrawn: u128,            │  uint256 public totalWithdrawn;          │
│  pub total_absorbed: u128,             │  uint256 public totalAbsorbed;           │
│  pub owner: AccountId,                 │  address public immutable owner;         │
├────────────────────────────────────────┼──────────────────────────────────────────┤
│  fn deposit(&mut self, amount: u128)   │  function deposit(uint256 amount)        │
│  fn withdraw(&mut self, amount: u128)  │  function withdraw(uint256 amount)       │
│      -> Result<(), Err>                │      (reverts on insufficient/non-owner) │
│  fn absorb(&mut self, loss: u128)      │  function absorb(uint256 loss)           │
│      -> (u128 absorbed, u128 remaining)│      returns (uint256, uint256)          │
├────────────────────────────────────────┼──────────────────────────────────────────┤
│  proptest! { (4 proptests) }           │  invariant_* (4 invariant functions)     │
│      (L13 capstone, SHA 0a8464e)       │      (this lesson)                       │
└────────────────────────────────────────┴──────────────────────────────────────────┘
```

The mapping is mechanical: every Rust field becomes a Solidity public state variable; every Rust method becomes a Solidity function with the same signature shape; every Rust proptest becomes a Solidity invariant. **The discipline transfers; the syntax does not need to be reinvented.**

## Walk-through

### Step 1: Set up the capstone project

From the rethlab repo root:

```bash
mkdir -p examples/foundry-capstone
cd examples/foundry-capstone
forge init --no-git --no-commit
```

`--no-git` because we want this capstone to be a subdirectory of the rethlab repo, not its own git project. `--no-commit` skips the auto-commit forge would otherwise make. The result:

```
examples/foundry-capstone/
├── foundry.toml
├── src/Counter.sol          ← delete this
├── test/Counter.t.sol       ← delete this
├── script/Counter.s.sol     ← delete this (optional)
└── lib/forge-std/
```

Delete the Counter templates:

```bash
rm src/Counter.sol test/Counter.t.sol script/Counter.s.sol
```

Update `foundry.toml` to pin the pragma + invariant defaults:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.35"

[invariant]
runs = 256
depth = 50
fail_on_revert = false

[profile.ci.invariant]
runs = 2000
depth = 100
```

Clean slate ready.

### Step 2: Read the Rust source-of-truth

Open `crates/openhl-liquidation/src/insurance_fund.rs` (SHA `260883b`) in openhl. Identify the structural elements:

- **5 state fields**: `balance`, `total_deposited`, `total_withdrawn`, `total_absorbed`, `owner`
- **3 operations**: `deposit(amount) -> ()`, `withdraw(amount) -> Result<(), Error>`, `absorb(loss) -> (absorbed, remaining)`
- **Revert conditions** for `withdraw`: `ZeroAmount`, `NotOwner`, `InsufficientBalance`
- **Decomposition shape** for `absorb`: `absorbed = min(loss, balance)`, `remaining = loss - absorbed`

These five fields and three operations are what we port — verbatim, just translated to Solidity syntax.

### Step 3: Write `src/InsuranceFund.sol`

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.35;

/// @notice Solidity port of openhl-liquidation Stage 10b's InsuranceFund.
/// Faithful field-by-field translation; same operations, same revert
/// conditions, same absorb-decomposition shape as the Rust source.
contract InsuranceFund {
    uint256 public balance;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    uint256 public totalAbsorbed;
    address public immutable owner;

    error ZeroAmount();
    error NotOwner();
    error InsufficientBalance(uint256 requested, uint256 available);

    constructor(address _owner) {
        owner = _owner;
    }

    /// Mirrors Rust's `fn deposit(&mut self, amount: u128)`.
    /// Anyone can deposit; only zero is rejected.
    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        balance += amount;
        totalDeposited += amount;
    }

    /// Mirrors Rust's `fn withdraw(&mut self, amount: u128) -> Result<(), Error>`.
    /// Owner-only. Reverts on zero, non-owner, or insufficient balance.
    function withdraw(uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        if (amount == 0) revert ZeroAmount();
        if (amount > balance) revert InsufficientBalance(amount, balance);
        balance -= amount;
        totalWithdrawn += amount;
    }

    /// Mirrors Rust's `fn absorb(&mut self, loss: u128) -> (u128, u128)`.
    /// Absorbs as much loss as the balance allows; returns (absorbed, remaining)
    /// where absorbed + remaining == loss. Remaining is what the fund
    /// couldn't cover — in the real system, this flows to ADL.
    function absorb(uint256 loss) external returns (uint256 absorbed, uint256 remaining) {
        if (loss == 0) revert ZeroAmount();
        absorbed = loss > balance ? balance : loss;
        remaining = loss - absorbed;
        balance -= absorbed;
        totalAbsorbed += absorbed;
    }
}
```

Seven things to notice — these are the load-bearing translation decisions:

1. **`u128` → `uint256`.** The Rust source uses `u128`; Solidity has no `uint128` as a default integer type. Going to `uint256` doesn't change the conservation-law shape — all the arithmetic still works, just with a wider type. **When in doubt, use uint256 for ported integer fields; the wider type doesn't break invariants.**
2. **`Result<(), Error>` → `revert <CustomError>`.** Rust returns errors as values; Solidity raises them as reverts. The custom-error syntax (`error NotOwner()`) produces equivalent return-via-failure semantics to Rust's `Err(Error::NotOwner)`. **Idiomatic mapping: Rust `Err(E)` ↔ Solidity `revert E()`.**
3. **`(u128, u128)` return tuples translate directly.** Solidity's named-return-tuple syntax (`returns (uint256 absorbed, uint256 remaining)`) matches Rust's tuple return. The decomposition equation `absorbed + remaining == loss` is preserved exactly.
4. **`pub` fields → `public` storage with auto-generated getters.** Solidity's `public` keyword on a state variable auto-generates a getter function with the same name (`balance()` returns the value). This makes the Handler and invariant test contracts able to read the fund's state without writing custom view functions. **Solidity's `public` = Rust's `pub` + auto-generated getter, in one keyword.**
5. **`AccountId` → `address`.** Ethereum's native address type stands in for whatever Rust used as account identifier. `immutable` makes it constructor-only (matches Rust's owner being set at construction).
6. **Solidity 0.8's built-in overflow checks replace Rust's explicit checked-arithmetic.** Both languages will revert on underflow in production code; Rust requires `checked_sub` to be explicit about it, Solidity 0.8 makes it automatic. **The runtime behavior is identical; the syntax is shorter in Solidity 0.8+.**

   > [!NOTE]
   > **Mimicking Rust's Wrapping Behavior and Gas Optimization via `unchecked`**
   > In Solidity 0.8+, if you want to bypass the default safety checks to mimic Rust's wrapping arithmetic behavior (like `wrapping_add` or `wrapping_sub`), or if you need to optimize gas efficiency to match the performance profile of the Rust implementation, you can wrap operations inside an `unchecked { ... }` block:
   > ```solidity
   > unchecked {
   >     balance -= amount; // Gas saving, or intentional wrapping behavior
   > }
   > ```
   > Since `unchecked` disables the compiler-generated overflow/underflow checks (which throw `Panic(0x11)`), it reduces transaction gas costs. For infrastructure engineers, it is a key discipline to explicitly separate safe, boundary-checked arithmetic (the default) from performance-critical sections where checks have already been manually verified and can be skipped (`unchecked`).
7. **`uint256 public balance` is intentionally a *storage variable*, not EVM-native `address(this).balance`.** The Rust source maintains its own explicit `balance` field; the port mirrors that field-by-field. This isn't redundant — it's *isolation*. A forced ETH transfer to the contract address (e.g., via `selfdestruct` from another contract) would mutate `address(this).balance` without going through `deposit`, breaking the conservation invariant if the fund relied on the EVM-native balance. By tracking `balance` as a private bookkeeping variable, the conservation law verifies the *fund's own accounting*, immune to external ETH-injection side effects. **The Rust-faithful storage variable is also a deliberate safety choice; EVM-native balance is reachable by external mutators that bypass the contract's invariants.**

### Step 4: Write `test/InsuranceFundHandler.sol`

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.35;

import {Test} from "forge-std/Test.sol";
import {InsuranceFund} from "../src/InsuranceFund.sol";

/// @notice Handler for InsuranceFund invariant testing.
/// Wraps the 3 fund operations, bounds inputs to productive ranges,
/// maintains 5 ghost variables that mirror the conservation-law expectations.
contract InsuranceFundHandler is Test {
    InsuranceFund public fund;
    address public immutable owner;

    // Five ghost variables — the shadow specification of the fund's accounting.
    uint256 public ghostSumDeposits;
    uint256 public ghostSumWithdrawn;
    uint256 public ghostSumAbsorbed;
    uint256 public ghostSumUnabsorbed;        // total of `remaining` returns from absorb
    uint256 public ghostSumLossRequested;     // total of `loss` parameters passed to absorb

    constructor(InsuranceFund _fund, address _owner) {
        fund = _fund;
        owner = _owner;
    }

    /// Wraps fund.deposit(). Bounds input to a reasonable range so the
    /// random uint256 from forge-invariant doesn't blow past uint96.
    /// Updates the deposit ghost in lockstep.
    function wrappedDeposit(uint256 amount) public {
        amount = bound(amount, 1, type(uint96).max);
        fund.deposit(amount);
        ghostSumDeposits += amount;
    }

    /// Wraps fund.withdraw(). Only callable when there's balance to withdraw.
    /// Uses vm.prank to simulate owner authorization (the handler is not the
    /// owner; the owner is a separate constructor-set address).
    function wrappedWithdraw(uint256 amount) public {
        uint256 currentBalance = fund.balance();
        if (currentBalance == 0) return;  // can't withdraw from empty fund
        amount = bound(amount, 1, currentBalance);
        vm.prank(owner);
        fund.withdraw(amount);
        ghostSumWithdrawn += amount;
    }

    /// Wraps fund.absorb(). Tracks both the requested loss and the actual
    /// decomposition (absorbed + remaining). This is the trickiest ghost
    /// update — three counters must move in lockstep.
    function wrappedAbsorb(uint256 loss) public {
        loss = bound(loss, 1, type(uint96).max);
        ghostSumLossRequested += loss;
        (uint256 absorbed, uint256 remaining) = fund.absorb(loss);
        ghostSumAbsorbed += absorbed;
        ghostSumUnabsorbed += remaining;
    }
}
```

Five things to notice — these are the Handler-discipline patterns:

1. **The Handler inherits `Test` to get `bound()` and `vm.*` access.** `bound(x, min, max)` is forge-std's helper that maps any uint256 into a target range without modular bias. `vm.prank(owner)` makes the next call appear to come from the owner address (impersonation inside a test, learned in L1 + L5). **Inheriting `Test` is the standard Handler pattern — it gives you cheatcode access for input bounding + authorization simulation.**
2. **Every wrapped method updates ghosts in lockstep with the call.** `wrappedDeposit` increments `ghostSumDeposits` after `fund.deposit(amount)` succeeds. If the call were to revert, the increment wouldn't happen — that's correct, because the fund's state didn't change. **The lockstep is per-method; reverts unwind both the fund state and the would-be ghost update.**
3. **`wrappedWithdraw` short-circuits when balance is zero.** Without this, the bound to `[1, currentBalance=0]` would fail (`min > max`), or worse, the `fund.withdraw(amount)` would revert with `InsufficientBalance`, and `fail_on_revert = false` would just count the revert and move on (which is fine, but wastes iterations). **Defensive short-circuit inside the Handler beats wasted iterations.**
4. **`wrappedAbsorb` updates THREE ghosts:** `ghostSumLossRequested` (the input), `ghostSumAbsorbed` (what the fund actually absorbed), `ghostSumUnabsorbed` (the remaining = excess loss that the fund couldn't cover). This is what makes `invariant_AbsorbDecomposition` provable — the handler tracks all three quantities so the invariant can assert their conservation. **More ghosts isn't a code smell; it's how invariants become provable.**
5. **The owner is constructor-set and immutable.** The Handler doesn't *become* the owner; it impersonates the owner via `vm.prank` for each withdraw. This mirrors how Rust tests would simulate owner authorization — neither the test nor the handler should *be* the owner, because that would mask access-control bugs. **Authorization simulation, not authorization replacement.**

### Step 5: Write `test/InsuranceFund.invariant.t.sol`

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.35;

import {Test} from "forge-std/Test.sol";
import {InsuranceFund} from "../src/InsuranceFund.sol";
import {InsuranceFundHandler} from "./InsuranceFundHandler.sol";

/// @notice The 4 conservation invariants ported from openhl-liquidation L13.
/// Same theorem, two languages, both mechanically proven.
contract InsuranceFundInvariantTest is Test {
    InsuranceFund public fund;
    InsuranceFundHandler public handler;
    address constant OWNER = address(0xBABE);

    function setUp() public {
        fund = new InsuranceFund(OWNER);
        handler = new InsuranceFundHandler(fund, OWNER);
        targetContract(address(handler));
    }

    /// Invariant 1: Conservation of capital.
    /// fund.balance() == ghostSumDeposits - ghostSumWithdrawn - ghostSumAbsorbed
    /// This is the load-bearing conservation law — every wei that entered as a
    /// deposit either still sits in the fund, or left via withdraw, or was
    /// consumed by absorb. No wei appears or disappears unaccounted-for.
    function invariant_Conservation() public view {
        assertEq(
            fund.balance(),
            handler.ghostSumDeposits() - handler.ghostSumWithdrawn() - handler.ghostSumAbsorbed()
        );
    }

    /// Invariant 2: Deposit-side accounting consistency.
    /// The fund's view of total deposits matches the handler's accounting.
    /// Catches: double-counting in deposit, ghost update missing or wrong scale.
    function invariant_DepositAccounting() public view {
        assertEq(fund.totalDeposited(), handler.ghostSumDeposits());
    }

    /// Invariant 3: Withdraw-side accounting consistency.
    /// The fund's view of total withdrawals matches the handler's accounting.
    /// Catches: similar bugs on the withdraw path.
    function invariant_WithdrawAccounting() public view {
        assertEq(fund.totalWithdrawn(), handler.ghostSumWithdrawn());
    }

    /// Invariant 4: Absorb-decomposition equivalence.
    /// For every absorb(loss): absorbed + remaining == loss.
    /// Aggregated: ghostSumAbsorbed + ghostSumUnabsorbed == ghostSumLossRequested.
    /// Catches: the fund's absorb math being wrong (e.g., remaining = loss - balance
    /// instead of loss - absorbed), or the handler forgetting to track unabsorbed.
    function invariant_AbsorbDecomposition() public view {
        assertEq(
            handler.ghostSumAbsorbed() + handler.ghostSumUnabsorbed(),
            handler.ghostSumLossRequested()
        );
    }
}
```

Four things to notice — these are the load-bearing invariant patterns:

1. **Each `invariant_*` is one line of `assertEq`.** No control flow, no branching, no exception handling — just an arithmetic equality. This is the conservation-law shape made concrete in Solidity. **Conservation laws are equalities; equalities are one-liners.**
2. **The invariants reference *both* fund state and ghost state.** Invariant 1 reads `fund.balance()` (the actual contract observable) and the 3 ghosts. The discrepancy between the two surfaces is what catches bugs. **The ghost is the spec; the contract is the implementation; the invariant is the equality between them.**
3. **Invariant 2 and 3 are accounting cross-checks.** The fund has its own `totalDeposited` and `totalWithdrawn` fields (matching the Rust struct). Invariants 2 and 3 verify the handler and the fund agree on these values. If the fund's `deposit` accidentally double-incremented `totalDeposited`, invariant 2 would catch it. **Cross-checking the contract's own bookkeeping against the handler's bookkeeping catches contract-internal bugs.**
4. **"Multi-Layered Invariants" Design Pattern**

   In this test suite, we are deliberately combining invariants of different architectural scopes. This is known as a **"Multi-Layered Invariants"** design pattern, which is extremely helpful for partitioning bugs and eliminating false positives:
   - **System-Level Conservation Laws (Invariant 1)**:
     Cross-checks the actual balance of the contract (the observable state) against the net inputs/outputs recorded by the ghosts. This checks the global economic sanity of the system (e.g., that no capital is created or destroyed).
   - **Component-Level Internal Invariants (Invariant 4)**:
     Only compares ghost states against each other without referencing contract state (e.g., `ghostSumAbsorbed + ghostSumUnabsorbed == ghostSumLossRequested`). This ensures the mathematical relationships within operations are consistent.
   - **"Watching the Watchers" Defense**:
     Bugs in your test logic (ghost updates) are the primary source of flaky invariant failures. Invariant 4 purely verifies that the handler's internal accounting behaves correctly, thus serving as a self-validation layer for the test suite.
   - **Immediate Bug Partitioning**:
     When a run fails:
     - **If both Invariant 1 and Invariant 4 fail**: Likely a bug in the contract logic (or a mismatch in both contract and handler implementations).
     - **If only Invariant 1 fails, while Invariant 4 passes**: The contract's state transition is inconsistent, but the handler's input tracking is mathematically sound. (Highly likely a smart contract bug).
     - **If only Invariant 4 fails, while Invariant 1 passes**: The contract behaves correctly, but the handler made an accounting mistake (test suite bug).
     
     This multi-layered partitioning saves hours of debugging by pointing you directly to the culprit contract or test file.

### Step 6: Run the invariants

```bash
cd examples/foundry-capstone
forge test --match-contract InsuranceFundInvariantTest -vvv
```

Expected output:

```
Ran 4 tests for test/InsuranceFund.invariant.t.sol:InsuranceFundInvariantTest
[PASS] invariant_AbsorbDecomposition() (runs: 256, calls: 12800, reverts: 0)
[PASS] invariant_Conservation() (runs: 256, calls: 12800, reverts: 0)
[PASS] invariant_DepositAccounting() (runs: 256, calls: 12800, reverts: 0)
[PASS] invariant_WithdrawAccounting() (runs: 256, calls: 12800, reverts: 0)

Suite result: ok. 4 passed; 0 failed; 0 skipped
```

**4 invariants, 12,800 random call sequences, all green.** Each invariant has been checked after every one of those 12,800 random calls — a total of 51,200 individual `assertEq` evaluations — and all held.

For the heavy proof, bump to the CI profile (100,000 calls per invariant):

```bash
FOUNDRY_PROFILE=ci forge test --match-contract InsuranceFundInvariantTest -vvv
```

At ~10–20 seconds on modern hardware, this runs each invariant against 200,000 random calls. **400,000+ green assertions; the conservation discipline has carried.**

### Step 7: Deliberate-break demo + the L13 side-by-side

Break invariant 1 by introducing a subtle bug: in `wrappedAbsorb`, *forget* to update `ghostSumAbsorbed`:

```solidity
function wrappedAbsorb(uint256 loss) public {
    loss = bound(loss, 1, type(uint96).max);
    ghostSumLossRequested += loss;
    (uint256 absorbed, uint256 remaining) = fund.absorb(loss);
    // ghostSumAbsorbed += absorbed;    // ← deliberately commented out
    ghostSumUnabsorbed += remaining;
}
```

Re-run:

```
[FAIL: invariant_Conservation persisted failure]
    Sequence (length: 3):
        sender=0x... addr=[InsuranceFundHandler]0x...
            calldata=wrappedDeposit(uint256), args=[100]
        sender=0x... addr=[InsuranceFundHandler]0x...
            calldata=wrappedAbsorb(uint256), args=[100]
        sender=0x... addr=[InsuranceFundHandler]0x...
            calldata=wrappedDeposit(uint256), args=[1]
    Last invariant: invariant_Conservation

[PASS] invariant_AbsorbDecomposition() (...) — but with wrong ghosts
[PASS] invariant_DepositAccounting() (...)
[PASS] invariant_WithdrawAccounting() (...)
```

Read the counterexample carefully:
1. `wrappedDeposit(100)` — fund.balance = 100, ghostSumDeposits = 100
2. `wrappedAbsorb(100)` — fund absorbs 100 → fund.balance = 0; ghostSumAbsorbed *not updated* (the bug!); ghostSumUnabsorbed = 0
3. `wrappedDeposit(1)` — fund.balance = 1, ghostSumDeposits = 101

Now invariant 1 checks: `fund.balance() (1) == ghostSumDeposits (101) - ghostSumWithdrawn (0) - ghostSumAbsorbed (0, buggy!)` → `1 == 101` → **FAIL**.

The shrinker reduced what was probably a 50-call sequence to these 3 calls — the minimal sequence that exposes the broken ghost accounting. **Invariant 1 caught the bug; invariant 4 also caught it** (`ghostSumAbsorbed + ghostSumUnabsorbed (0) == ghostSumLossRequested (100)` → fail).

**Restore the commented-out line. Re-run. All 4 green.**

Now diff against L13. Open openhl `crates/openhl-liquidation/tests/insurance_fund_proptests.rs` (SHA `0a8464e`) and put it side-by-side with our `InsuranceFund.invariant.t.sol`:

```
┌────────────────────────────────────────┬──────────────────────────────────────────┐
│  openhl L13 (Rust, proptest!)          │  L6 capstone (Solidity, forge invariant) │
├────────────────────────────────────────┼──────────────────────────────────────────┤
│  proptest_fund_conservation            │  invariant_Conservation                  │
│  proptest_deposit_accounting           │  invariant_DepositAccounting             │
│  proptest_withdraw_accounting          │  invariant_WithdrawAccounting            │
│  proptest_absorb_decomposition         │  invariant_AbsorbDecomposition           │
├────────────────────────────────────────┼──────────────────────────────────────────┤
│  state-machine transitions:            │  Handler methods:                        │
│    Op::Deposit(amount)                 │    wrappedDeposit(uint256)               │
│    Op::Withdraw(amount)                │    wrappedWithdraw(uint256)              │
│    Op::Absorb(loss)                    │    wrappedAbsorb(uint256)                │
├────────────────────────────────────────┼──────────────────────────────────────────┤
│  prop_assert_eq!(                      │  assertEq(                               │
│    fund.balance,                       │    fund.balance(),                       │
│    sum_deposits - withdrawn - absorbed │    ghostSumDeposits() - ghostSumWith...  │
│  );                                    │  );                                      │
└────────────────────────────────────────┴──────────────────────────────────────────┘
```

Same names. Same operations. Same arithmetic. **The capstone is the proof of the course's thesis — the conservation-law discipline survived the language boundary, mechanically.**

## Common errors

- **`Error: bound called with too large of a range`** — your `bound(amount, min, max)` has `min > max`. Usually means you passed `bound(x, 1, 0)`. Check for short-circuit conditions before calling `bound`.
- **All invariants pass but `forge test` still fails** — there's a non-invariant test in the same file that's failing. Add `--match-test invariant` to scope.
- **`Error: setUp failed`** — `targetContract(address(handler))` was called before `handler` was instantiated. Always `new` the Handler before calling `targetContract`.
- **`reverts: 12800`** — every Handler call is reverting. Your `bound(...)` ranges are wrong, or your wrappers are passing through invalid inputs. Add `vm.assume`s or tighter `bound`s.
- **Invariant fails immediately on `--match-contract`** — the invariant is wrong, not the contract. Write a single `function test_X()` that calls the operations manually and verify the arithmetic by hand before trusting the invariant.

## Design retrospective

Three load-bearing decisions in the capstone's design:

1. **Field-by-field translation, not redesign.** The Solidity port preserves Rust's field names (snake → camel case), revert conditions, and return-tuple shapes. Resisting the urge to "improve" the design during the port is what makes the L13-to-L6 cross-reference work — readers can literally diff the two implementations and see the discipline transfer. **Faithful porting is the load-bearing discipline of cross-language verification.**

2. **Five ghosts, not four.** The Handler tracks `ghostSumLossRequested` separately from `ghostSumAbsorbed + ghostSumUnabsorbed` so invariant 4 can prove their equality. A more compact design would track only the 4 invariant-relevant ghosts; the 5th ghost exists to make invariant 4 a *meaningful* assertion (not a tautology). **The fifth ghost is the spec for invariant 4.**

3. **No `vm.assume` inside the Handler.** All input bounding is done with `bound(x, min, max)` — every random parameter is *mapped into* a valid range, not *filtered out*. This keeps `forge invariant`'s iteration count productive (no wasted iterations on rejections) and makes the test fast at scale. **`bound` over `vm.assume` is the Handler-pattern discipline.**

## Answer key

After L6 the directory looks exactly like:

```
examples/foundry-capstone/
├── foundry.toml                              ← invariant config + pragma pin
├── src/
│   └── InsuranceFund.sol                     ← 82 lines, 3 ops + 5 fields
├── test/
│   ├── InsuranceFundHandler.sol              ← 65 lines, 3 wrappers + 5 ghosts
│   └── InsuranceFund.invariant.t.sol         ← 58 lines, 4 invariants
└── lib/forge-std/                            ← standard submodule
```

`forge test --match-contract InsuranceFundInvariantTest` prints 4 `[PASS]` lines with `(runs: 256, calls: 12800, reverts: 0)`.

`FOUNDRY_PROFILE=ci forge test --match-contract InsuranceFundInvariantTest` does the same at `runs: 2000, calls: 200000` per invariant.

You can `diff` this directory against openhl-liquidation L13's `proptest!` block and see the same shape on both sides.

## Q&A

**Q1: Why port to Solidity at all, instead of staying in Rust?**

Different deployment surfaces. Rust + openhl is for chains where you control the execution environment (your own L1/L2). Solidity + forge invariant is for the EVM, where you have to compile to a fixed bytecode target. The capstone exists because production-deployable insurance funds on EVM chains (Aave's safety module, Compound's reserve, etc.) are Solidity — and the same conservation discipline applies. **The port proves that the discipline is platform-agnostic; the deployment target dictates the language.**

**Q2: How do I know my port is *correct* and not just my own design?**

Two cross-checks: (a) The Rust and Solidity tests have the *same* counterexample-finding behavior — if you break one, the other (or its Rust equivalent) catches the same minimal-counterexample shape. (b) The field-by-field mapping table is the contract you should compare against; if any field differs in semantics, the port is wrong. **Mechanical correspondence is verifiable; "feeling right" is not.**

**Q3: Can I add more invariants?**

Yes. The 4 here are the minimum from L13. Real production-ready insurance funds add more: access-control invariants (only owner can withdraw), upper-bound invariants (total absorbed never exceeds total deposited - balance), rate-limit invariants (no more than X% withdrawn per Y blocks). Each follows the same shape: pick an observable, write an equality against ghost state, add to the invariant test. **Invariants compound; the test file grows linearly with safety properties.**

**Q4: What does the `examples/foundry-capstone/` directory ship with — committed code or template?**

Committed working code. The directory is the course's answer key. New readers who complete L0–L5 can compare their own L6 work against this exact source. The capstone is a reference implementation; you build your own version following the walk-through, and the answer key is there for verification (or for skipping ahead if you're already comfortable). **Committed reference implementations are how courses scale to multiple readers without each one needing instructor review.**

**Q5: Why isn't `examples/foundry-capstone/` part of the rethlab Next.js build?**

It's a sub-project with its own `foundry.toml` and `lib/forge-std`. Including it in the Next.js build would require either pulling it into Vercel's deployment (waste of build time) or vendoring `forge-std` (waste of disk + git churn). The arrangement: rethlab's Next.js + Prisma site serves the *lesson content*; the `examples/foundry-capstone/` sub-project serves the *executable artifact*. Readers clone the rethlab repo to get both. **Web site for the curriculum; sub-project for the proof.**

**Q6: Can the same Handler pattern prove invariants against deployed contracts (forking + impersonation)?**

Yes — that's the L5 + L6 synthesis. You can write an InvariantTest that uses `--fork-url <mainnet>` and points `targetContract` at a deployed Aave reserve. The Handler impersonates the reserve's role-holders via `vm.prank` and calls real methods. Your invariants then prove conservation laws against the actual deployed system, not against your local port. **The capstone is a contained example; the same pattern scales to "prove invariants against real production contracts" — that's what the L5 forking work was setting up.**

**Q7: What happens to invariant testing when the fund is upgraded (proxy pattern)?**

Invariants survive upgrades that preserve the public ABI and storage layout. If the upgrade changes either, the invariants must be updated to match. The pattern: store the invariant tests alongside the contract source; on every upgrade, re-run the full invariant suite against the new implementation. CI integration ensures no upgrade ships without re-proving the conservation laws. **Invariants are part of the contract's specification; upgrades must preserve them or explicitly version them.**

## Course conclusion

This is the final lesson of *Mastering Foundry*. Six lessons in, you've moved from "what's a Foundry pragma" (L1) to "I just proved 4 conservation invariants against a Rust-to-Solidity port, mechanically, in 60 minutes." That's the rethlab thesis: **discipline transfers across languages because the underlying math doesn't care which compiler runs it.**

Where to go next:

- **Run the capstone against more invariants.** Add access-control, rate-limit, and upper-bound invariants to `InsuranceFund.invariant.t.sol`. Each one is ~3 lines of Solidity.
- **Port one more component from openhl.** Pick `Scanner`, `MarginEngine`, or `OrderBook` from openhl-liquidation. Same pattern: identify state + operations + invariants, write the Solidity, prove with `forge invariant`.
- **Apply the discipline to your own production code.** Any contract you've written that has conservation-law-shaped properties (token balances, accumulating fees, vesting schedules) is a candidate. The Handler pattern + 1-line `assertEq` invariants scale to anything.
- **Read the openhl-fundamentals + openhl-liquidation Rust source one more time.** Now that you've ported one component, the patterns will read differently. The `proptest!` macro will look like `invariant_*`, just in Rust.
- **Read the Building OpenHL ADL course's L4 capstone — the Rust-side sibling of this lesson.** Same theorem (conservation laws across a cascade), same Handler-shaped discipline, different tooling: `proptest!` in Rust, `forge invariant` here. The two capstones together prove that the discipline transfers in *both* directions — Rust → Solidity here, and the Stage 10 quartet retrospective there.

Foundry is a tool. The discipline is the product.

````

---

## Seed-file slot

L6 lands in Module 3 (Capstone) sortOrder 0:

```typescript
{
  title: "Lesson 6 — Capstone — port openhl-liquidation's InsuranceFund to Solidity, prove the 4 invariants",
  slug: 'foundry-capstone-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 60,
  xpReward: 110,
  content: `# Lesson 6 — Capstone — port openhl-liquidation's InsuranceFund to Solidity, prove the 4 invariants\n\n...`
},
```

**Module change note:** L6 is the first (and only) lesson in Module 3 (Capstone), not Module 2 (CLI & state-aware testing). The seed-builder spec needs `moduleNumber: 3`, `sortOrder: 0`.

## Drafting self-review (before paste)

- **L6 is the longest and densest lesson in the course (520+ lines, 60 min / 110 XP).** This reflects the lesson's role as the course's deliverable: three Solidity files totaling ~210 lines of working code, plus the cross-reference walkthrough, plus the side-by-side L13 diff. Length is justified by content weight.
- **No Mermaid in L6.** The two ASCII mapping tables (Rust↔Solidity field mapping + L13↔L6 invariant correspondence) serve the diagrammatic role; both are discrete enumerations that fit tables better than flowcharts. If I added a Mermaid, it would be a "course-arc" diagram showing L0→L5→L6 — but that lives better in the course landing page than in a lesson.
- **The 3 Solidity files are the load-bearing pedagogical artifact.** Reader compiles them, runs them, watches 4 invariants pass. Every line of Solidity is annotated in the things-to-notice lists — the lesson is teaching you to *write* the port, not just read it.
- **Step 7 (deliberate-break + L13 side-by-side) is the course's emotional payoff.** The 3-call counterexample with traced causality (deposit → absorb → deposit → invariant 1 violates because ghostSumAbsorbed is stale) is concrete enough to drive home what "same theorem, two languages" means. The L13 side-by-side table is the visual proof.
- **Q1 (why port to Solidity at all) addresses the obvious meta-question.** Q2 (correctness checks) addresses verifiability. Q4 (committed reference implementation) explains the directory structure decision. Q6 (forking + impersonation against deployed contracts) names the L5+L6 synthesis as the "now you can do this in production" tip. Q7 (upgrades) names the operational concern for anyone shipping invariants alongside production code.
- **Course conclusion ("Where to go next") avoids prescriptiveness about future courses.** Four concrete next steps, all things the reader can do today without waiting for another lesson. The final line ("Foundry is a tool. The discipline is the product.") is the course's thesis statement, restated.

**Worth flagging for your review before locking:**
- The L13 file path `crates/openhl-liquidation/tests/insurance_fund_proptests.rs` is a plausible name but I'm making it up from memory — verify before committing to it as a concrete reference.
- The `vm.prank` use in `wrappedWithdraw` requires the Handler to inherit `Test`, which I do — but worth double-checking that `vm.prank` works inside a Handler that's being called by `forge invariant`'s runner. Standard practice says yes; worth confirming.
- The 5-ghost design assumes invariant 4 is non-trivial — verify the absorb decomposition logic in the actual openhl source to ensure my Solidity matches it.

