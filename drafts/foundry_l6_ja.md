# Mastering Foundry — L6 draft (JA)

> Capstone。openhl-liquidation Stage 10b (`260883b`) の Rust `InsuranceFund` をソースオブトゥルースとして参照する。L13 の per-scan 保存則 proptest (`0a8464e`) を、ポートされる 4 つの invariant 形状として cross-reference する。すべての capstone artifact は in-repo で `examples/foundry-capstone/` に住む。

## L6 — `foundry-capstone-ja`

**Title**: レッスン 6 — Capstone — openhl-liquidation の `InsuranceFund` を Solidity へ port し、4 つの invariant を証明する

**Duration**: 60 分 · **XP**: 110

---

````markdown
# レッスン 6 — Capstone — openhl-liquidation の `InsuranceFund` を Solidity へ port し、4 つの invariant を証明する

## ゴール

このレッスンで掴む概念:

- **Capstone は、コースの thesis を散文ではなくコードで証明する。** L0–L5 のすべては 1 つの主張のための setup だった。openhl-liquidation で使った保存則（Conservation law）規律は Solidity に機械的に転写でき、`forge invariant` は `proptest!` と同じやり方でそれを証明する — この主張だ。L6 はその主張を読むのをやめ、*実行する* 場所だ。openhl-liquidation Stage 10b の `InsuranceFund` (システムの最後の防衛線となる資本を保持する Rust contract) を取り、field-by-field で Solidity に port する。L13 の `proptest!` state-machine の形状をミラーする `Handler` を書く。そして L13 が Rust で証明したのと同じ 4 つの保存則 invariant を、Solidity で証明する。緑の `(runs: 256, calls: 12800, reverts: 0)` 行が表示された瞬間にコースは終わる。規律転写（Discipline transfer）が言語境界を survive したと、その時に実演し終えている。
- **4 つの invariant、1 つの形状。contract state と ghost accounting の間の等価性として書かれた保存則だ。** この capstone のすべての invariant は `<contract observable> == <ghost variable の関数>` の形を取る。(1) **Conservation:** `fund.balance() == ghostSumDeposits - ghostSumWithdrawn - ghostSumAbsorbed`。(2) **Deposit accounting:** `fund.totalDeposited() == ghostSumDeposits`。(3) **Withdraw accounting:** `fund.totalWithdrawn() == ghostSumWithdrawn`。(4) **Absorb decomposition:** `ghostSumAbsorbed + ghostSumUnabsorbed == ghostSumLossRequested`。これらは openhl-liquidation L13 の proptest と *同じ* 4 つの保存則だ。同じ算術、違う構文。**1 つの保存則形状を、4 つの異なる observable に対して 4 回使う。**
- **Handler こそが Rust↔Solidity の同型対応（Isomorphism）が住む場所だ。** `InsuranceFundHandler` は Solidity contract で、`wrappedDeposit(uint256)` / `wrappedWithdraw(uint256)` / `wrappedAbsorb(uint256)` を公開し、5 つの ghost 変数を維持する。各 method は入力を bound し (`forge invariant` のランダム parameter が常に productive な call を生むため、`vm.assume` rejection を避けるため)、ghost を target と lockstep で更新する。Solidity Handler の各 method は、Rust L13 capstone の `proptest!` state-machine 遷移関数に 1:1 で対応する。**Handler と L13 の `proptest!` block を side-by-side で見ると、同じ操作が同じ順序で同じ accounting で行われている。翻訳されたのであって、再設計されたのではない。**
- **レッスンの deliverable は permanent。`examples/foundry-capstone/` に住む。** このレッスンで build するすべて (`src/InsuranceFund.sol`、`test/InsuranceFundHandler.sol`、`test/InsuranceFund.invariant.t.sol`) は、コースの答え合わせとして in-repo に残る。L5 を卒業する将来の reader は、自分の作業をまさにこのディレクトリに対して check する。Capstone は disposable ではない。コースが動くことを証明する最終 artifact だ。

確認:

```bash
cd examples/foundry-capstone
forge test --match-contract InsuranceFundInvariantTest -vvv
```

…で 4 つの invariant それぞれに対して `[PASS] invariant_Conservation() (runs: 256, calls: 12800, reverts: 0)` が表示される。本レッスン完走後はこれらを手にする。Full な capstone を build した経験、12,800 ランダム系列にわたって invariant が成立し続けるのを観察した経験、意図的に 1 つを壊して multi-call counterexample を読んだ経験、そして openhl-liquidation L13 の Rust `proptest!` との side-by-side diff を読んだ経験。

具体的な変更:

- **新規ディレクトリ `examples/foundry-capstone/`** — コースの pragma `^0.8.35` に pin した `forge init` 形状の Foundry プロジェクト。Sub-project として扱い、rethlab Next.js build には含めない。
- **そのディレクトリ内に新規 Solidity ファイル 3 つ** — `src/InsuranceFund.sol` (~80 行)、`test/InsuranceFundHandler.sol` (~70 行)、`test/InsuranceFund.invariant.t.sol` (~60 行)。Capstone 全体で合計 ~210 行。

L6 は密度が高い。60 分が時間予算で、半分が Solidity port、半分が `forge invariant` 実行と L13 cross-reference に充てる。Payoff は、4 つの緑の invariant が表示され、保存則規律が言語を超えて運ばれたと腹落ちする瞬間だ。

## おさらい

L5 の後はこうなっている。
- L0 — Foundry が commodity prerequisite として positioned + REVM が統一エンジン
- L1–L3 — Solidity testing 規律。`forge test`、`forge fuzz`、`forge invariant` (Handler パターン、ghost 変数、sequence counterexample)
- L4 — `cast` が `alloy::Provider` 上の CLI surface
- L5 — `anvil` がローカル mainnet クローン + 3-surface REVM アーキテクチャ

L6 がループを閉じる。L0–L5 のすべての概念が capstone で使われる。
- L1 の `vm.expectRevert` — InsuranceFund の revert path を test する
- L3 の `forge invariant` — multi-call sequencing engine
- L3 の Handler パターン — `InsuranceFundHandler` が `CounterHandler` の形状をミラーする
- L3 の openhl-liquidation L13 cross-reference からの 4 つの invariant — 前に名指された、今 port する

コースは常にこの artifact を指していた。中間レッスンはすべて prerequisite だった。

## 計画

7 ステップ、3 つの Solidity ファイルにまたがる。

1. **Capstone プロジェクトをセットアップ** — `mkdir examples/foundry-capstone && cd examples/foundry-capstone && forge init --no-git`。Pragma を pin。Default の Counter を delete。
2. **openhl-liquidation Stage 10b の `InsuranceFund` ソースを読む** — `crates/openhl-liquidation/src/insurance_fund.rs` の Rust contract (SHA `260883b`)。3 つの operation (deposit、withdraw、absorb) と 4 つの observable な state フィールドを特定する。
3. **`src/InsuranceFund.sol` を書く** — field-by-field な port。同じ operation、同じフィールド名 (snake_case → camelCase)、同じ revert 条件、`absorb` からの同じ return shape。
4. **`test/InsuranceFundHandler.sol` を書く** — `wrappedDeposit` / `wrappedWithdraw` / `wrappedAbsorb` と、5 つの ghost 変数 (`ghostSumDeposits`、`ghostSumWithdrawn`、`ghostSumAbsorbed`、`ghostSumUnabsorbed`、`ghostSumLossRequested`) を持つ Handler。
5. **`test/InsuranceFund.invariant.t.sol` を書く** — 4 つの invariant。`invariant_Conservation`、`invariant_DepositAccounting`、`invariant_WithdrawAccounting`、`invariant_AbsorbDecomposition`。
6. **`forge invariant` を走らせる** — 4 つの invariant すべてが default の 256 runs × 50 depth = 12,800 call で成立する。Proof-of-the-day には 100,000 call まで bump する。
7. **意図的な break デモ + side-by-side L13 diff** — Handler の ghost update を 1 つ壊し、multi-call counterexample が現れるのを見る。次に Solidity capstone を L13 の Rust に対して `diff` し、同じ操作が同じ順序で起きているのを目で確認する。

> 🛑 **予測。** 続きを読む前に: openhl-liquidation L13 の cascade-conservation proptest は `assert_eq!(fund.balance(), initial + sum_deposits - sum_withdrawals - sum_absorbed)` の形だった。この *exact* な assertion を Solidity に port するなら、最も近い 1 行の forge invariant コードは何か? (Handler が 3 つの sum-of-* ghost を track していると仮定する。)

(答え: **`assertEq(fund.balance(), handler.ghostSumDeposits() - handler.ghostSumWithdrawn() - handler.ghostSumAbsorbed());`**。同じ算術、同じオペランド、同じ assert。違いは 2 点。Solidity の `assertEq` は (actual, expected) を取る (Rust の `(left, right)` 順序ではない)。そして ghost アクセサは明示的な `handler.X()` method 呼び出しになる (Solidity は別 contract からのフィールド直接アクセスを持たないため)。**変換が機械的になるのは、下層の定理が言語非依存だからだ。保存則は構文ではなく数学だ。**)

## Deliverable ファイルツリー

```
examples/foundry-capstone/
├── foundry.toml                              ← invariant runs、depth、fail_on_revert
├── src/
│   └── InsuranceFund.sol                     ← ~80 行 — Solidity port
├── test/
│   ├── InsuranceFundHandler.sol              ← ~70 行 — 3 wrapped method + 5 ghost を持つ Handler
│   └── InsuranceFund.invariant.t.sol         ← ~60 行 — 4 つの invariant_* 関数
└── lib/forge-std/                            ← standard な forge-std submodule
```

L6 を完了したとき、このツリーのすべてのファイルが存在し、`forge test` が 12,800+ ランダム系列で 4 つの invariant assertion を pass させる。

## Rust ↔ Solidity フィールド マッピング

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

マッピングは機械的だ。Rust の各フィールドは Solidity の public state 変数になる。Rust の各 method は同じ signature shape の Solidity 関数になる。各 Rust proptest は Solidity invariant になる。**規律が転写される。構文を再発明する必要はない。**

## 手を動かす walk-through

### Step 1: Capstone プロジェクトをセットアップする

rethlab repo root から実行する:

```bash
mkdir -p examples/foundry-capstone
cd examples/foundry-capstone
forge init --no-git --no-commit
```

`--no-git` は、この capstone を rethlab repo のサブディレクトリとして抱えたいからだ (それ自身の git project にはしたくない)。`--no-commit` は forge が default で行う自動 commit を skip する。結果:

```
examples/foundry-capstone/
├── foundry.toml
├── src/Counter.sol          ← これを削除
├── test/Counter.t.sol       ← これを削除
├── script/Counter.s.sol     ← これを削除 (option)
└── lib/forge-std/
```

Counter テンプレートを削除:

```bash
rm src/Counter.sol test/Counter.t.sol script/Counter.s.sol
```

`foundry.toml` を更新して pragma + invariant default を pin する:

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

クリーンスレートの準備完了だ。

### Step 2: Rust ソースオブトゥルースを読む

openhl で `crates/openhl-liquidation/src/insurance_fund.rs` (SHA `260883b`) を開く。構造要素を特定する:

- **5 つの state フィールド**: `balance`、`total_deposited`、`total_withdrawn`、`total_absorbed`、`owner`
- **3 つの operation**: `deposit(amount) -> ()`、`withdraw(amount) -> Result<(), Error>`、`absorb(loss) -> (absorbed, remaining)`
- **`withdraw` の revert 条件**: `ZeroAmount`、`NotOwner`、`InsufficientBalance`
- **`absorb` の decomposition 形状**: `absorbed = min(loss, balance)`、`remaining = loss - absorbed`

port するのはこの 5 フィールドと 3 operation だ。一字一句（Verbatim）違わずに Solidity の構文へと射影する。

### Step 3: `src/InsuranceFund.sol` を書く

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

押さえる点が 7 つ。load-bearing な翻訳決定だ。

1. **`u128` → `uint256`。** Rust ソースは `u128` を使う。Solidity は default integer 型として `uint128` を持たない。`uint256` に上げても保存則の形は変わらない。算術はすべて動く、ただ wider 型でだ。**迷ったら port した integer フィールドには uint256 を使う。wider 型は invariant を壊さない。**
2. **`Result<(), Error>` → `revert <CustomError>`。** Rust は error を値として返す。Solidity は revert として上げる。Custom-error 構文 (`error NotOwner()`) が Rust の `Err(Error::NotOwner)` と等価な return-via-failure semantics を生む。**Idiomatic マッピング。Rust `Err(E)` ↔ Solidity `revert E()`。**
3. **`(u128, u128)` の return tuple は直接翻訳される。** Solidity の named-return-tuple 構文 (`returns (uint256 absorbed, uint256 remaining)`) が Rust の tuple return と一致する。Decomposition 等式 `absorbed + remaining == loss` が正確に保たれる。
4. **`pub` フィールド → `public` storage with auto-generated getter。** Solidity の state 変数上の `public` キーワードは同名の getter 関数を自動生成する (`balance()` が値を返す)。これで Handler と invariant test contract が、カスタム view 関数を書かずに fund の state を読める。**Solidity の `public` = Rust の `pub` + auto-generated getter を 1 キーワードで。**
5. **`AccountId` → `address`。** Ethereum のネイティブ address 型が、Rust の account 識別子の代わりに立つ。`immutable` がそれを constructor-only にする (Rust の owner が construction で set される挙動と一致)。
6. **Solidity 0.8 の built-in overflow check が Rust の explicit な checked-arithmetic を置き換える。** 両言語とも production code で underflow に revert する。Rust は `checked_sub` を明示的に書くことを要求する。Solidity 0.8 は自動でやる。**Runtime 挙動は同一。Solidity 0.8+ では構文が短いだけだ。**

   > [!NOTE]
   > **`unchecked` ブロックによる Rust の wrapping 挙動の模倣とガス最適化**
   > Solidity 0.8+ では、オーバーフロー/アンダーフローを許容する wrapping 算術（Rust の `wrapping_add` や `wrapping_sub` に相当）を行いたい場合、あるいはガス効率を極限まで高めて Rust 実装と同等のガスプロファイルに近づけたい場合、`unchecked { ... }` ブロックを使用します：
   > ```solidity
   > unchecked {
   >     balance -= amount; // ガス節約、または意図的な wrapping 動作
   > }
   > ```
   > `unchecked` は Solidity の標準的なオーバーフローチェックコード生成（`Panic(0x11)` をスローする条件分岐）を無効化するため、ガスコストを削減できる。インフラエンジニアとしては、安全性が必要な場所（デフォルトの安全な算術評価）と、すでに手動で境界値チェック（bounds check）を済ませてオーバーフローが絶対に起き得ないためガスを節約したい場所（`unchecked`）を厳格に区別して設計する習慣が重要だ。
7. **`uint256 public balance` は意図的に *storage 変数* であって、EVM ネイティブの `address(this).balance` ではない。** Rust ソースが自身の明示的な `balance` フィールドを保持しているから、port はそれを field-by-field でミラーする。これは冗長ではない — *隔離* だ。Contract address への強制的な ETH 送金 (別 contract からの `selfdestruct` 経由など) は `deposit` を通らずに `address(this).balance` を mutate する。Fund が EVM ネイティブな balance に依存していたら、保存則が壊れる。`balance` を private な bookkeeping 変数として track することで、保存則 invariant は *fund 自身の会計* を検証する。外部 ETH 注入の副作用に対して immune だ。**Rust に忠実な storage 変数は意図的な safety 選択でもある — EVM ネイティブの balance は contract の invariant を bypass する外部 mutator から触れられる。**

### Step 4: `test/InsuranceFundHandler.sol` を書く

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

押さえる点が 5 つ。Handler 規律のパターンだ。

1. **Handler は `Test` を継承して `bound()` と `vm.*` アクセスを得る。** `bound(x, min, max)` は forge-std のヘルパーで、任意の uint256 を modular bias なしで target range に map する。`vm.prank(owner)` が次の call を owner address から来たかのように見せる (L1 + L5 で学んだ test 内 impersonation)。**`Test` 継承が標準 Handler パターン。入力 bounding と認可 simulation のための cheatcode アクセスを与える。**
2. **すべての wrapped method が call と lockstep で ghost を更新する。** `wrappedDeposit` は `fund.deposit(amount)` が成功した後に `ghostSumDeposits` を増分する。Call が revert すれば increment は起きない。これが正しい挙動だ。Fund の state も変わっていないからだ。**Lockstep は per-method。Revert は fund state と would-be ghost update の両方を unwind する。**
3. **`wrappedWithdraw` は balance がゼロのとき short-circuit する。** これがないと `[1, currentBalance=0]` への bound が失敗するか (`min > max`)、`fund.withdraw(amount)` が `InsufficientBalance` で revert し、`fail_on_revert = false` が単に revert を数えて先に進む (これは fine だが iteration を無駄にする)。**Handler 内部の defensive short-circuit が無駄な iteration に勝つ。**
4. **`wrappedAbsorb` は 3 つの ghost を更新する。** `ghostSumLossRequested` (入力)、`ghostSumAbsorbed` (fund が実際に absorb したもの)、`ghostSumUnabsorbed` (remaining = fund がカバーできなかった超過 loss)。これが `invariant_AbsorbDecomposition` を provable にする。handler が 3 量すべてを track するから、invariant がその conservation を assert できる。**Ghost が多いことは code smell ではない。それが invariant を provable にする方法だ。**
5. **Owner は constructor-set で immutable だ。** Handler は owner *になる* のではない。各 withdraw 用に `vm.prank` 経由で owner を impersonate する。これは Rust test が owner 認可を simulate する方法をミラーしている。test も handler も owner *である* べきではない。それが access-control バグを mask してしまうからだ。**認可の simulation であって、認可の replacement ではない。**

### Step 5: `test/InsuranceFund.invariant.t.sol` を書く

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

押さえる点が 4 つ。load-bearing な invariant パターンだ。

1. **各 `invariant_*` は 1 行の `assertEq`。** Control flow なし、branching なし、exception handling なし。ただの算術等価性だ。これが Solidity で concrete になった保存則形状だ。**保存則は等価性。等価性は one-liner。**
2. **Invariant は fund state と ghost state の *両方* を参照する。** Invariant 1 は `fund.balance()` (実際の contract observable) と 3 つの ghost を読む。2 つの surface の間の不一致こそがバグを catch する。**Ghost は spec。Contract は implementation。Invariant は両者の間の等価性。**
3. **Invariant 2 と 3 は accounting の cross-check だ。** Fund は独自の `totalDeposited` と `totalWithdrawn` フィールドを持つ (Rust struct と一致)。Invariant 2 と 3 は handler と fund がこれらの値で agree していることを検証する。Fund の `deposit` が誤って `totalDeposited` を double-increment したら、invariant 2 が catch する。**Contract 自身の bookkeeping を handler の bookkeeping に対して cross-check することが、contract-internal なバグを catch する。**
4. **「多層的インバリアント（Multi-Layered Invariants）」の設計パターン**

   このテスト設計では、異なる階層の性質を持つインバリアントを意図的に組み合わせており、これを**「多層的インバリアント」**と呼ぶ。デバッグの効率化と偽陽性の排除において強力な力を発揮する：
   - **システムレベルの保存則（System-Level Conservation Laws - Invariant 1）**：
     コントラクト自体の残高（リアルな状態）と、外部とのすべての入出力の総和（ゴースト状態）を突き合わせる最もマクロな不変条件。システム全体の経済的合理性（「資金がどこからも現れず、どこにも消えない」こと）を検証する。
   - **コンポーネントレベルの内部インバリアント（Component-Level Invariants - Invariant 4）**：
     コントラクトの状態は参照せず、ハンドラー（ゴースト変数）の内部状態のみを相互検証するミクロな不変条件。今回の例では、`ghostSumAbsorbed + ghostSumUnabsorbed == ghostSumLossRequested`（吸い込まれた損失とカバーされなかった損失の和は、発生した総損失と等しい）がこれに相当する。
   - **「監視者を監視する（Who watches the watchers?）」防衛ライン**：
     インバリアントテスト自体のバグ（ゴースト変数の更新ロジック自体の誤り）は、テストの有効性を無効化する最大の要因だ。Invariant 4 は純粋にハンドラー側の記録整合性をアサートしているため、「テストロジックが仕様通りに機能しているか」を自己検証する。
   - **バグ所在の瞬時切り分け（Partitioning of Bugs）**：
     もしバグによってテストが失敗した際：
     - **Invariant 1 と Invariant 4 の両方が失敗**：コントラクトの実装バグ（またはコントラクトとハンドラー両方の誤り）。
     - **Invariant 1 のみ失敗し、Invariant 4 はパス**：コントラクトの内部状態遷移に不整合があるが、ハンドラーの記録自体は正しい（コントラクト本体にバグが存在する確率が極めて高い）。
     - **Invariant 4 のみ失敗し、Invariant 1 はパス**：コントラクトは正しく動作しているが、ハンドラー（テストロジック）側のゴースト変数の更新漏れ（テスト側のバグ）。
     
     このようにアサーションの階層を分けることで、複雑なプロトコルでも「本体コード」と「テスト用モック・ハンドラーコード」のどちらに原因があるかを一目で特定できる。

### Step 6: Invariant を走らせる

```bash
cd examples/foundry-capstone
forge test --match-contract InsuranceFundInvariantTest -vvv
```

期待される出力:

```
Ran 4 tests for test/InsuranceFund.invariant.t.sol:InsuranceFundInvariantTest
[PASS] invariant_AbsorbDecomposition() (runs: 256, calls: 12800, reverts: 0)
[PASS] invariant_Conservation() (runs: 256, calls: 12800, reverts: 0)
[PASS] invariant_DepositAccounting() (runs: 256, calls: 12800, reverts: 0)
[PASS] invariant_WithdrawAccounting() (runs: 256, calls: 12800, reverts: 0)

Suite result: ok. 4 passed; 0 failed; 0 skipped
```

**4 つの invariant、12,800 ランダム call 系列、すべて緑。** 各 invariant は 12,800 ランダム call のそれぞれの後で check された。合計 51,200 個の個別 `assertEq` 評価だ。そしてすべてが成立した。

Heavy な proof には CI profile (invariant あたり 100,000 calls) に bump する:

```bash
FOUNDRY_PROFILE=ci forge test --match-contract InsuranceFundInvariantTest -vvv
```

モダンハードウェアで ~10–20 秒。各 invariant を 200,000 ランダム call に対して走らせる。**400,000+ の緑 assertion。保存則規律が言語境界を超えて carry した。**

### Step 7: 意図的な break デモ + L13 side-by-side

Invariant 1 を subtle なバグで壊す。`wrappedAbsorb` で `ghostSumAbsorbed` の更新を *忘れる*:

```solidity
function wrappedAbsorb(uint256 loss) public {
    loss = bound(loss, 1, type(uint96).max);
    ghostSumLossRequested += loss;
    (uint256 absorbed, uint256 remaining) = fund.absorb(loss);
    // ghostSumAbsorbed += absorbed;    // ← 意図的にコメントアウト
    ghostSumUnabsorbed += remaining;
}
```

再実行:

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

[PASS] invariant_AbsorbDecomposition() (...) — だが間違った ghost で
[PASS] invariant_DepositAccounting() (...)
[PASS] invariant_WithdrawAccounting() (...)
```

Counterexample を注意深く読む:
1. `wrappedDeposit(100)` — fund.balance = 100、ghostSumDeposits = 100
2. `wrappedAbsorb(100)` — fund が 100 を absorb → fund.balance = 0; ghostSumAbsorbed は *更新されない* (バグ); ghostSumUnabsorbed = 0
3. `wrappedDeposit(1)` — fund.balance = 1、ghostSumDeposits = 101

ここで invariant 1 が check する: `fund.balance() (1) == ghostSumDeposits (101) - ghostSumWithdrawn (0) - ghostSumAbsorbed (0、バグ)` → `1 == 101` → **FAIL**。

Shrinker は、おそらく 50-call だった元系列をこの 3 calls まで reduce した。壊れた ghost accounting を露出する最小系列だ。**Invariant 1 がバグを catch した。invariant 4 も catch した** (`ghostSumAbsorbed + ghostSumUnabsorbed (0) == ghostSumLossRequested (100)` → 失敗)。

**コメントアウトした行を restore する。再実行する。4 つすべて緑に戻る。**

今度は L13 に対して diff する。openhl の `crates/openhl-liquidation/tests/insurance_fund_proptests.rs` (SHA `0a8464e`) を開き、自分の `InsuranceFund.invariant.t.sol` と side-by-side に置く:

```
┌────────────────────────────────────────┬──────────────────────────────────────────┐
│  openhl L13 (Rust、proptest!)          │  L6 capstone (Solidity、forge invariant) │
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

同じ名前。同じ operation。同じ算術。**Capstone がコース thesis の証明だ。保存則規律が言語境界を機械的に survive した。**

## よくある失敗パターン

- **`Error: bound called with too large of a range`** — `bound(amount, min, max)` で `min > max` になっている。通常 `bound(x, 1, 0)` を渡したことを意味する。`bound` を呼ぶ前に short-circuit 条件を check する。
- **すべての invariant が pass するが `forge test` がまだ失敗する** — 同じファイルに invariant ではない test があって失敗している。`--match-test invariant` でスコープする。
- **`Error: setUp failed`** — `targetContract(address(handler))` が `handler` がインスタンス化される前に call された。`targetContract` を呼ぶ前に必ず Handler を `new` する。
- **`reverts: 12800`** — すべての Handler call が revert している。`bound(...)` の range が間違っているか、wrapper が invalid な入力を素通りさせているかのどちらかだ。`vm.assume` を加えるか、より tight な `bound` にする。
- **Invariant が `--match-contract` で即座に失敗する** — Invariant が間違っている。Contract ではない。Operation を手で呼ぶ単一の `function test_X()` を書き、invariant を信じる前に手で算術を検証する。

## 設計の振り返り

Capstone の設計に焼き込んだ load-bearing な決定が 3 つ。

1. **Field-by-field な翻訳であって、再設計ではない。** Solidity port は Rust のフィールド名 (snake → camel case)、revert 条件、return-tuple の形を保つ。Port 中に「improve」する誘惑に抵抗することこそが L13-to-L6 cross-reference を機能させる。読者は 2 つの実装を文字通り diff して規律転写を目で見るできる。**忠実な porting が言語横断 verification の load-bearing な規律だ。**

2. **4 つではなく 5 つの ghost。** Handler は `ghostSumLossRequested` を `ghostSumAbsorbed + ghostSumUnabsorbed` とは別に track する。これで invariant 4 が両者の等価性を証明できる。よりコンパクトな設計なら invariant に直接関連する 4 ghost だけを track するだろう。5 番目の ghost は invariant 4 を *意味ある* assertion にするために存在する (tautology ではなく)。**5 番目の ghost は invariant 4 の spec だ。**

3. **Handler 内部に `vm.assume` なし。** 入力 bounding はすべて `bound(x, min, max)` で行う。すべてのランダム parameter が valid range に *map される*、filter out されるのではない。これで `forge invariant` の iteration count が productive に保たれ (rejection で潰れる iteration がない)、スケールでの test も fast になる。**`vm.assume` ではなく `bound`。これが Handler パターンの規律だ。**

## 答え合わせ

L6 の後、ディレクトリは exact にこの形になる:

```
examples/foundry-capstone/
├── foundry.toml                              ← invariant config + pragma pin
├── src/
│   └── InsuranceFund.sol                     ← 82 行、3 ops + 5 fields
├── test/
│   ├── InsuranceFundHandler.sol              ← 65 行、3 wrappers + 5 ghosts
│   └── InsuranceFund.invariant.t.sol         ← 58 行、4 invariants
└── lib/forge-std/                            ← standard な submodule
```

`forge test --match-contract InsuranceFundInvariantTest` が 4 つの `[PASS]` 行を `(runs: 256, calls: 12800, reverts: 0)` で表示する。

`FOUNDRY_PROFILE=ci forge test --match-contract InsuranceFundInvariantTest` が同じことを invariant あたり `runs: 2000, calls: 200000` で行う。

このディレクトリを openhl-liquidation L13 の `proptest!` block と `diff` すれば、両側に同じ形が現れる。

## よくある質問

**Q1: なぜ Rust に留まらず Solidity に port するのか?**

違う deployment surface だ。Rust + openhl は実行環境をコントロールできる chain (自分の L1/L2) 向け。Solidity + forge invariant は EVM 向けで、固定された bytecode target にコンパイルしなければならない。Capstone が存在するのは、EVM chain 上の production-deployable な insurance fund (Aave の safety module、Compound の reserve など) が Solidity だからだ。そして同じ保存則規律が適用される。**Port は規律が platform-agnostic であることを証明する。Deployment target が言語を決める。**

**Q2: 自分の port が *正しい* と知るには? 自分の設計でしかないと感じるが?**

Cross-check は 2 つだ。(a) Rust と Solidity の test が *同じ* counterexample-finding 挙動を持つ。一方を壊すと、もう一方 (あるいはその Rust 等価物) が同じ minimal-counterexample shape を catch する。(b) Field-by-field マッピング表が比較対照すべき契約だ。任意のフィールドが semantics で異なるなら、port は wrong。**機械的な対応は検証可能だ。「感じが正しい」は検証可能ではない。**

**Q3: invariant をもっと追加できる?**

Yes、できるしすべきだ。ここの 4 つは L13 からの最小限だ。Real な production-ready insurance fund はもっと加える。access-control invariant (owner だけが withdraw できる)、upper-bound invariant (total absorbed が total deposited - balance を決して超えない)、rate-limit invariant (Y ブロックあたり X% より多くは withdraw されない)。どれも同じ形に従う。observable を選び、ghost state に対する等価性を書き、invariant test に追加する。**Invariant は compound する。Test ファイルは safety property と線形に成長する。**

**Q4: `examples/foundry-capstone/` ディレクトリは何を ship するのか — commit されたコード? それともテンプレート?**

Commit された動作するコードだ。ディレクトリはコースの答え合わせ。L0–L5 を完了する新しい読者は、自分の L6 作業をこの exact なソースに対して比較できる。Capstone は reference implementation だ。Walk-through に従って自分のバージョンを build し、答え合わせはそこに検証用として置かれている (既に快適なら飛ばすためにも)。**Commit された reference implementation こそが、instructor review なしでコースが複数読者にスケールする仕組みだ。**

**Q5: なぜ `examples/foundry-capstone/` が rethlab Next.js build の一部ではないのか?**

独自の `foundry.toml` と `lib/forge-std` を持つ sub-project だからだ。Next.js build に含めるには、Vercel の deployment にそれを pull する (build time の無駄) か、`forge-std` を vendor する (disk + git churn の無駄) かのどちらかが必要になる。配置はこうだ。rethlab の Next.js + Prisma site が *レッスンコンテンツ* を serve する。`examples/foundry-capstone/` sub-project が *executable な artifact* を serve する。読者は両方を得るために rethlab repo を clone する。**カリキュラム用は Web site、証明用は sub-project。**

**Q6: 同じ Handler パターンが、deploy された contract に対して invariant を証明できる (forking + impersonation)?**

Yes、できる。それが L5 + L6 シンセシスだ。`--fork-url <mainnet>` を使い、`targetContract` を deploy された Aave reserve に向ける InvariantTest を書ける。Handler が `vm.prank` 経由で reserve の role-holder を impersonate し、real な method を呼ぶ。Invariant は、自分のローカル port に対してではなく、実際に deploy されたシステムに対して保存則を証明する。**Capstone は contained な例だ。同じパターンが「real production contract に対して invariant を証明する」までスケールする。L5 forking 作業がセットアップしていたのはこれだ。**

**Q7: Fund がアップグレードされたとき (proxy パターン)、invariant testing はどうなる?**

Invariant は public ABI と storage layout を保つアップグレードを survive する。アップグレードがそのどちらかを変えるなら、invariant は match するように更新されなければならない。パターンはこうだ。invariant test を contract source と一緒に store する。アップグレードのたびに新実装に対して full invariant suite を再走させる。CI 統合が、保存則を再証明せずにアップグレードが ship しないことを保証する。**Invariant は contract の specification の一部だ。アップグレードはそれらを preserve するか、明示的に version しなければならない。**

## コース総括

これが *Mastering Foundry* の最終レッスンだ。6 レッスンを経て、「Foundry pragma とは何か」(L1) から「Rust-to-Solidity port に対して 4 つの保存則 invariant を機械的に 60 分で証明した」まで歩いた。これが rethlab thesis だ。**規律は言語を超えて転写する。下層の数学は、どのコンパイラが走るかを気にしないからだ。**

次にどこへ行くか。

- **Capstone をもっと多くの invariant で走らせる。** `InsuranceFund.invariant.t.sol` に access-control、rate-limit、upper-bound invariant を加える。各々 ~3 行の Solidity だ。
- **openhl からもう 1 つコンポーネントを port する。** openhl-liquidation から `Scanner`、`MarginEngine`、`OrderBook` のいずれかを選ぶ。同じパターンだ。state + operation + invariant を特定し、Solidity を書き、`forge invariant` で証明する。
- **規律を自分の production code に適用する。** 自分が書いた保存則形状の property (token balance、累積 fee、vesting schedule) を持つ contract は候補だ。Handler パターン + 1 行 `assertEq` invariant が何にでもスケールする。
- **openhl-fundamentals + openhl-liquidation の Rust ソースをもう一度読む。** 1 つコンポーネントを port した今、パターンは違って読める。`proptest!` macro が `invariant_*` のように見える。Rust ではあるが、骨格は同じだ。
- **Building OpenHL ADL コースの L4 capstone を読む — 本レッスンの Rust 側 sibling capstone だ。** 同じ定理（cascade を貫く保存則）、同じ Handler 形状の規律、違うツール: あちらは `proptest!` (Rust)、ここは `forge invariant` (Solidity)。2 つの capstone を合わせると、規律が *両方向* で転写することが証明される — ここでは Rust → Solidity、あちらは Stage 10 四部作のレトロスペクティブとして。

Capstone を走らせ終わったその瞬間、画面には 4 行の緑が並んでいる。書いたのは Solidity、走らせたのは `forge invariant`、証明したのは Rust で先に証明したのと同じ 4 つの保存則。コードは 2 つ、定理は 1 つ。これがコース全体が指していた一点だ。

Foundry は道具だ。規律こそがプロダクトだ。

````

---

## Seed-file slot

L6 は Module 3 (Capstone) の sortOrder 0 に入る:

```typescript
{
  title: "レッスン 6 — Capstone — openhl-liquidation の InsuranceFund を Solidity へ port し、4 つの invariant を証明する",
  slug: 'foundry-capstone-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 60,
  xpReward: 110,
  content: `# レッスン 6 — Capstone — openhl-liquidation の InsuranceFund を Solidity へ port し、4 つの invariant を証明する\n\n...`
},
```

**モジュール変更注:** L6 は Module 2 (CLI & state-aware testing) ではなく Module 3 (Capstone) の最初 (かつ唯一) のレッスンだ。Seed-builder の spec は `moduleNumber: 3`、`sortOrder: 0` が必要。

## 翻訳セルフレビュー（paste 前）

- **L6 はコース中で最も長く最も密度の高いレッスン (594 EN 行 / ~620 JA 行、60 分 / 110 XP)。** これは レッスンの役割を反映する: コースの deliverable だ。3 つの Solidity ファイル合計 ~210 行の動作するコード、cross-reference の walkthrough、L13 との side-by-side diff。Length は content の重みに正当化される。
- **L6 に Mermaid なし。** 2 つの ASCII マッピング表 (Rust↔Solidity フィールドマッピング + L13↔L6 invariant 対応) が diagrammatic な役割を果たす。両方とも discrete な列挙で、flowchart より表が合う。Mermaid を加えるなら「コースアーク」図 (L0→L5→L6) になるが、それはレッスンよりコースランディングページに住む方がよい。
- **3 つの Solidity ファイルが load-bearing な pedagogical artifact だ。** 読者がそれらをコンパイルし、走らせ、4 つの invariant が pass するのを観察する。Solidity の各行が things-to-notice リストでアノテートされている — レッスンは port を *書く* ことを教えている、ただ読むのではなく。
- **Step 7 (意図的な break + L13 side-by-side) がコースの emotional payoff だ。** Traced causality 付きの 3-call counterexample (deposit → absorb → deposit → invariant 1 が違反するのは ghostSumAbsorbed が stale だから) が、「同じ定理、2 つの言語」が何を意味するかを打ち込むのに concrete だ。L13 side-by-side 表が visual な証明だ。
- **Q1 (なぜ Solidity に port するか) が明白な meta-質問に答える。** Q2 (correctness check) が verifiability に答える。Q4 (commit された reference implementation) がディレクトリ構造の決定を説明する。Q6 (forking + impersonation against deployed contract) が L5+L6 シンセシスを「今やこれを production で行える」tip として名指す。Q7 (アップグレード) が、production code と一緒に invariant を ship する人にとっての operational な懸念を名指す。
- **コース総括 (「次にどこへ行くか」) が将来のコースについて prescriptive にならない。** 4 つの concrete な次ステップ、すべて読者が今日できること、別のレッスンを待たずに。最終行 (「Foundry は道具だ。規律こそがプロダクトだ。」) はコースの thesis statement の再述だ。

### JA 特有のスタイル決定

- **専門用語は英語のまま** (`forge invariant`, `Handler`, `targetContract`, `targetSelector`, `ghost variable`, `wrappedDeposit`, `wrappedWithdraw`, `wrappedAbsorb`, `invariant_*`, `vm.prank`, `vm.expectRevert`, `bound`, `fail_on_revert`, `setUp`, `proptest!`, `assert_eq!`, `prop_assert_eq!`, `InsuranceFund`, `forge-std`, `revm`, `REVM`, `cheatcode`, `keccak256`, `load-bearing`, `discipline transfer`, `cross-reference`, `field-by-field`, `lockstep`, `state-machine` など)。
- **Solidity / TOML / bash コードと in-code コメントは英語のまま**。Reader が直接 copy-paste する。
- **ASCII マッピング表は cell content も英語のまま**。Code/method identifier の翻訳は混乱を増やすだけ。
- **Bilingual annotation** は first-mention にのみ適用: `保存則（Conservation law）`、`規律転写（Discipline transfer）`、`同型対応（Isomorphism）`、`シャドウ仕様 (Shadow Specification)` (L3 から established)。
- **`load-bearing`、`pedagogical artifact`、`emotional payoff`、`source-of-truth`** は英語のまま使用。L0–L5 と一貫。
- **コース総括の最終行「Foundry は道具だ。規律こそがプロダクトだ。」** は意図的に簡潔に翻訳。Punch を保つ。
