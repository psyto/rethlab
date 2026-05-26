# Mastering Foundry — L0 draft (JA)

> openhl SHA pin はなし（このコースは Foundry そのものを教える）。L6 capstone で openhl-liquidation Stage 10b の `InsuranceFund`（openhl SHA `260883b`）を Solidity に port し、rethlab の `examples/foundry-capstone/` に答え合わせの Solidity + tests が置かれる。

## L0 — `foundry-orientation-ja`

**Title**: Foundry を極める — すでに Rust で考えるエンジニアのための Solidity テスト規律

**Duration**: 15 分 · **XP**: 50

---

````markdown
# Foundry を極める — すでに Rust で考えるエンジニアのための Solidity テスト規律

## このコースで得るもの

rethlab の openhl 系コース（Consensus、CLOB、Funding、Liquidation、ADL）を通過していれば、すでに次の規律は身についている。

- pure-compute プリミティブ
- `debug_assert!` + `saturating_arithmetic` で守る state machine
- `proptest!` による保存則の検証
- byte-for-byte の答え合わせ

このコースの目的は、その規律を Solidity contract に 1:1 で移植することだ。Foundry は、その移植を機械的に回すための実行環境である。

完走後の到達点:

- **`forge init` で最小構成を立ち上げる。** build / test / fuzz のループをローカルで高速に回せる。
- **`forge fuzz` を Rust の `proptest!` と同じ感覚で使う。** shrinking、失敗入力の最小化、再実行まで一通り実践する。
- **`forge invariant` で multi-call 保存則を検証する。** `Handler` を介してランダムな呼び出し列を作り、各ステップで不変条件を確認する。
- **`cast` を日常的に使える状態にする。** storage 読み取り、view 呼び出し、ABI decode を手癖化する。
- **`anvil --fork-url` + cheatcodes で state-aware testing を行う。** `vm.deal` / `vm.warp` / `vm.prank` を使い、実チェーン状態に近い検証を行う。
- **Capstone:** openhl-liquidation Stage 10b の `InsuranceFund` を Rust から Solidity に移植し、同じ定理を 2 言語で検証する。

このコースで理解すること:

- **なぜ Foundry が標準になったか。** Rust 製の single binary で、REVM を同一プロセスで直接扱えるため。
- **なぜ JS 系ツールだけでは不足するか。** IPC/JSON-RPC 経由の間接実行が増え、重い検証ほど遅延が効くため。
- **`forge fuzz` / `forge invariant` の正体。** openhl の `crates/evm` と同種の REVM 駆動パターンを、Solidity テストとして表面化したもの。
- **なぜ cheatcodes が precompile なのか。** テストから EVM 状態へ直接アクセスでき、検証ループを短く保てるため。

## このコースが存在する理由

ほとんどの Foundry チュートリアルは「このツールをどう使うか」に答える。本コースが答えるのは別の問いだ: **「Rust で学んだ厳格テストの規律を、どうやって Solidity contract に持ち込むか。」**

すべての openhl 系コースで繰り返されてきた、その規律の形:

```
   ┌──────────────────────────────────────────────────────────────┐
   │  rethlab の Rust 規律           ←→  Foundry Solidity 等価物   │
   ├──────────────────────────────────────────────────────────────┤
   │  cargo test                            forge test              │
   │  proptest! (single-input)              forge fuzz              │
   │  proptest! (sequenced ops)             forge invariant         │
   │  debug_assert!                         require / vm.expectRevert│
   │  saturating_add (consensus)            Solidity 0.8 unchecked  │
   │  conservation laws                     invariant assertions    │
   │  byte-for-byte 答え合わせ              reference contract +   │
   │     vs openhl SHA                        forge test corpus     │
   └──────────────────────────────────────────────────────────────┘
```

右列のすべての行を、L6 までにあなたは自分の手で書く。Capstone こそが、左列と右列が同じことを言っている *証明* になる。

## なぜ Hardhat / Truffle / Brownie ではなく Foundry なのか

背景を短く整理する。

- 2022-2024 年にかけて、Foundry は JS ベースの主要ツールを置き換えた。
- Truffle は終了し、Hardhat は主にデプロイやフロント連携で使われる。
- L1 / contract / engine 開発では、Foundry が事実上の標準になった。

このコースの対象（L1 / infra エンジニア）にとって、Foundry は競争優位ではなく前提知識である。本コースは新しい作法を教えるのではなく、既存の Rust 規律を Solidity 側へ移すことに集中する。Foundry が選ばれた理由は次の 3 点だ。

1. **速度。** Foundry の test runner は REVM を直接 in-process で embed する。JS test runner と別プロセスの `ganache` / `hardhat node` をつなぐ IPC round-trip がない。Hardhat で 60 秒かかる 1000-test スイートが、`forge test` なら 2-3 秒で終わる。アーキテクチャ的な違い:

   ```
      ┌─────────────────────────────────────────────────────────┐
      │  Hardhat / Truffle (out-of-process — 遅い)              │
      ├─────────────────────────────────────────────────────────┤
      │   ┌────────────┐   JSON-RPC over    ┌────────────────┐ │
      │   │ JS test    │ ◄── IPC / TCP ──► │ hardhat node    │ │
      │   │ runner     │  (eth_sendRaw...,  │ (別プロセス)    │ │
      │   │ (mocha)    │   eth_call, ...)   │  EVM を embed   │ │
      │   └────────────┘                    └────────────────┘ │
      │            ↑ 呼び出しごとに ~1ms × test あたり数千回    │
      └─────────────────────────────────────────────────────────┘

      ┌─────────────────────────────────────────────────────────┐
      │  Foundry (in-process — 速い)                            │
      ├─────────────────────────────────────────────────────────┤
      │   ┌─────────────────────────────────────────────────┐  │
      │   │   forge test (単一の Rust binary)                │  │
      │   │   ┌──────────────┐     直接の関数呼び出し         │  │
      │   │   │  Solidity    │  ───────────────►             │  │
      │   │   │  test runner │     REVM の実行                │  │
      │   │   └──────────────┘     (同一プロセス)             │  │
      │   └─────────────────────────────────────────────────┘  │
      │            ↑ 呼び出しごとに ~µs、IPC なし、serialize なし│
      └─────────────────────────────────────────────────────────┘
   ```

   この 20-30× の差は、最適化の積み上げではない。process boundary を外したアーキテクチャ差によるものだ。
2. **Fuzzing が first-class primitive。** Hardhat では property-based testing は plugin 扱いだった。Foundry は built-in で出荷した — shrinking、corpus persistence、sequenced call 用の invariant testing 込みで。最も近い JS 等価物 (`fast-check` + Hardhat) は非自明な配線を要求する。
3. **Cheatcodes-as-precompiles。** Hardhat の `evm_snapshot` / `evm_increaseTime` は JSON-RPC method — リモートノードに state を変えるよう依頼する。Foundry の `vm.warp` / `vm.deal` / `vm.prank` はアドレス `0x7109709ECfa91a80626fF3989D68f67F5b1DD12D` の magic precompile への Solidity 呼び出し。これが **REVM の state を内側から hack する** — 同一プロセス、IPC なし、リモートノードへの信頼も不要。openhl Precompiles コース (Stage 9) を通った読者には、これは *Rust で学んだ「precompile-as-EVM-superpower」パターン* が Solidity 経由でテスト用に露出されたものだと分かる。速く、composable、何より contract と同じ Solidity ファイル内で testable。

**L1 エンジニアにとっての戦略的含意。** Reth / REVM / Alloy code を書いたり読んだりするなら（rethlab の既存フォーカス）、Foundry は別言語の wrapper を被った同じ toolchain だ。生態系を切り替えるのではない。同じ execution engine に第 2 の言語を足すだけだ。

## 規律の transfer — port する 3 つの具体的不変条件

L2、L3、L6 で歩く内容のプレビュー。

### Liquidation L9 から（Rust proptest）:

$$\text{amount} + \text{unfilled} = \text{shortfall}$$

Fund は `WithdrawOutcome { amount, unfilled }` を返す。両者の和は caller が渡した shortfall と必ず一致する。Rust proptest はこう書く。

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

### Foundry へ（forge fuzz） — L2 で教える内容。

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

同じ定理、違う syntax。Rust の shrinker と Foundry の shrinker は反例に対して同じ挙動をする。**L6 が終わる頃には `InsuranceFund` 全体と L9 の 4 つの invariant をすべて port し終えている。同じ定理、2 言語、両方とも mechanical に証明済みだ。**

## 7 つのレッスン

### Module 0 — Orientation
- **L0** (本レッスン) — なぜ Foundry、discipline-transfer の thesis、7-lesson ロードマップ。

### Module 1 — Test discipline (L1–L3) — コア
- **L1** — `forge test` — first invariants、basic assertions、`assertEq` / `vm.expectRevert`、`-vvv` での実行。Solidity 版の `cargo test`。
- **L2** — `forge fuzz` — Solidity の `proptest!`。Single-parameter fuzzing、shrinking、corpus persistence。Liquidation L9 を cross-reference する。
- **L3** — `forge invariant` — `Handler` contract と `targetContract` で回す multi-call invariant testing。Liquidation L13 の scanner proptest（per-scan な保存則）を cross-reference する。

### Module 2 — CLI + state-aware testing (L4–L5)
- **L4** — `cast` — chain CLI の deep dive。`call` / `send` / `storage` / `abi-decode` / `4byte`。`ethereum.reth.rs/rpc` 経由のメインネット例。
- **L5** — `anvil --fork-url` + cheatcodes — `vm.deal` / `vm.warp` / `vm.prank` で回す state-aware testing。Cheatcodes-as-precompiles の framing（openhl Precompiles コースを cross-reference）。

### Module 3 — Capstone (L6)
- **L6** — **InsuranceFund.sol + forge invariants** — openhl-liquidation Stage 10b の `InsuranceFund` を Rust から Solidity に port し、L9 の保存則 invariant を Foundry で書き、10K iteration を回し、同じ定理を 2 言語で mechanical に証明する。答え合わせの contract + tests は rethlab の `examples/foundry-capstone/` 内。

## このコースに *含まれない* もの

- **Gas optimization の deep dive** — `forge inspect` の gas snapshot 自体は real な topic だが、optimization は規律ではない。スコープ外。（将来コース候補: 「L1 エンジニアのための Solidity — gas、storage layout、bytecode」）
- **Slither / Mythril / formal verification** — Foundry 隣接だが別の tooling family。扱わない。
- **Frontend / ethers.js / viem** — dApp stack の JS 側。rethlab の読者は L1 / contract / engine エンジニアであり、UI は別の関心事だ。
- **Foundry script (`forge script` での deployment)** — L4 の `cast send` セクションで軽く触れる程度。Deployment story は本コースが教える testing 規律とは別のスキルだ。

## License / asset discipline

本コースの reference asset — L6 の `InsuranceFund.sol` capstone + `forge` test corpus — は rethlab の `examples/foundry-capstone/` に in-repo で住む。レッスンが ship される rethlab git SHA に pin される。読者は `git checkout <sha>` で byte-for-byte に動く copy を手に入れる。

Foundry 自体は頻繁に update される。コースは `foundry-rs/foundry` rev に pin する（コースが ship する時点での `foundryup` デフォルト）。将来の Foundry version がレッスンを壊したら rethlab issue を立てる — コースは current stable Foundry を追随する設計だ。

## 前提知識

以下に慣れていること:
- 基本的な Solidity 構文 (`function` 定義が読め、`mapping` と `struct` を区別できる)。
- Rust crate での `cargo test` の実行 (rethlab の openhl 系コース全体で使うパターン)。
- rethlab の openhl-liquidation コースを少なくとも L9 まで読了している (最初の `WithdrawOutcome` proptest が登場するレッスン)。L6 capstone は、そのコースから `InsuranceFund` のセマンティクスを内面化していることを前提にする。

どれか心許なくても問題ない。openhl-liquidation コースが自然な前提知識で、基本 Solidity は solidity-by-example.org で 1 日で拾える。

````

---

## Seed-file slot

L0 は新規コースの最初のレッスン、module 0 / sortOrder 0:

```typescript
{
  title: 'Foundry を極める — すでに Rust で考えるエンジニアのための Solidity テスト規律',
  slug: 'foundry-orientation-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# Foundry を極める — すでに Rust で考えるエンジニアのための Solidity テスト規律\n\n...`
},
```

コースレベルメタデータ (新規):

```typescript
{
  slug: 'mastering-foundry-ja',
  title: 'Foundry を極める — すでに Rust で考えるエンジニアのための Solidity テスト規律',
  description: '...',
  difficulty: 'ADVANCED',
  duration: 220,
  xpReward: 460,
  tags: ['foundry', 'forge', 'anvil', 'cast', 'solidity', 'testing', 'invariants', 'fuzz', 'l1', 'reth'],
  sortOrder: 350,
  track: 'reth-stack',
  isPublished: true,
},
```

## 翻訳セルフレビュー（paste 前）

- **L0 はコース内で最短のレッスン** (15 分)。ADL L0 と Liquidation L0 と同じ orientation パターン。規律を framing し、ロードマップを preview し、前提知識を名指す。
- **「規律の transfer」thesis がコース全体の load-bearing なアイデア。** L0 は 3 回それを名指す (intro、「このコースが存在する理由」、比較表)。読者が 1 つの明確な takeaway を持って離れるように。後続のすべてのレッスンが参照する。
- **比較表 (Rust ↔ Foundry 等価物)** が視覚的フック。ほとんどの Foundry チュートリアルは Foundry を Hardhat と比較する。本コースは Foundry を *Rust testing* と比較する。この positioning こそが rethlab 版を foundry-book と differentiate するもの。
- **数式 + コードのプレビュー** (L9 proptest の Rust、その後 forge fuzz の Solidity) が最も具体的な「これから来るもの」要素。2 つの snippet を side-by-side で見た読者は、コースが何を deliver するかを正確に知る。
- **「このコースに *含まれない* もの」セクション** は honest scoping。Foundry は表面積が膨大で、それを全部カバーするフリは規律 thesis を薄める。除外するものを名指すことで focus に信頼性が出る。
- **License / asset discipline セクション** は意図的に短い。`examples/foundry-capstone/` in-repo は simple、single-source-of-truth な答え合わせ。外部 repo dependency なし。

### JA 特有のスタイル決定

- **専門用語は英語のまま** (`forge`, `cast`, `anvil`, `cheatcodes`, `invariant`, `fuzz`, `proptest`, `shrinking`, `corpus persistence`, `discipline transfer`, `state-aware testing` など)。Liquidation コースおよび ADL コースの慣例に従う。
- **Solidity コードと Rust コードは英語のまま**（コメント含めて）。答え合わせとの byte-for-byte 一致のため。
- **「規律」は和語維持** — 「discipline」のカタカナ化（ディシプリン）は読みにくい。英語専門用語と並ぶときの文脈で「規律」が最適。
- **「load-bearing」は英語のまま** — Liquidation シリーズ全体で確立された表現。
