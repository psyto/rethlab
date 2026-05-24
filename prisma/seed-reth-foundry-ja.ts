// AUTO-GENERATED from drafts/foundry_*_ja.md by .github/scripts/build-foundry-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethFoundryJA(prisma: PrismaClient) {
  const tags = ["foundry","forge","anvil","cast","solidity","testing","invariants","fuzz","l1","reth"];

  await prisma.course.create({
    data: {
      slug: "mastering-foundry-ja",
      title: "Foundry を極める — すでに Rust で考えるエンジニアのための Solidity テスト規律",
      description:
        "本コースは、rethlab の openhl 系列コースで学んだ厳格なテスト規律（proptest! による保存則、debug_assert! によるルーティング契約、openhl SHA に対する Byte-for-byte の検証）を、Solidity コントラクトへ機械的に転写（Transfer）するための道具立てとして Foundry を扱います。\n\nすでに Rust で思考する L1 / コントラクト / エンジン開発者を前提に、forge test の基本アサーションから、forge fuzz（Solidity 版 proptest!）、複数呼び出しに対する forge invariant、CLI ツールとしての cast、メインネット状態を再現する anvil --fork-url ＋ cheatcodes までを網羅。Cheatcodes が単に「リモートノードに JSON-RPC で依頼する」のではなく、「REVM を内部から操作する Magic Precompile」であるというアーキテクチャの正体まで掘り下げます。\n\n最終章（L7 Capstone）では、openhl-liquidation Stage 10b の InsuranceFund を Rust から Solidity へ移植（Port）。まったく同じ 4 つの保存則（Invariants）を forge invariant で 10,000 iteration 実行し、同じ定理を 2 つの言語で機械的に検証することで、テスト規律が言語の壁を超えて成立することを体感します。\n\n2026 年現在、Foundry の習得は本格的な L1 / インフラ開発における前提条件（Commodity Prerequisite）であり、もはやそれ自体は競争優位ではありません。本コースは単なる「ツールの使い方」ではなく、「すでに脳内にある厳格な規律を Solidity 側へいかに持ち込むか」を叩き込む、唯一無二のポジショニングを取ります。\n\n全 4 モジュール・7 レッスン。リポジトリ内の examples/foundry-capstone/ にリファレンス実装が常駐します。",
      difficulty: "ADVANCED",
      duration: 145,
      xpReward: 310,
      track: "reth-stack",
      tags,
      isPublished: true,
      sortOrder: 350,
      locale: "ja",
      instructorName: "RethLab",
      modules: {
        create: [
          {
            title: "Orientation",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "Foundry を極める — すでに Rust で考えるエンジニアのための Solidity テスト規律",
                  slug: "foundry-orientation-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# Foundry を極める — すでに Rust で考えるエンジニアのための Solidity テスト規律

## このコースで作るもの

rethlab の openhl 系コース（Consensus、CLOB、Funding、Liquidation、ADL）のどれかを通過していれば、すでに *規律* は身についている: pure-compute プリミティブ、\`debug_assert!\` + \`saturating_arithmetic\` で守られた state machine、\`proptest!\` で証明された保存則、byte-for-byte の答え合わせ。**この規律はそのまま Solidity contract に 1:1 で transfer する。Foundry はその transfer を mechanical にする道具だ。**

完走後にはこうなる:

- **\`forge init\` で initialize された Solidity プロジェクト** — build、test、fuzz が sub-second の feedback loop でローカルで回る。
- **\`forge fuzz\` のハンズオン経験** — Solidity 版の \`proptest!\`。shrinking、input distribution、最小失敗入力の特定 — Liquidation L9 で学んだワークフローと同一。
- **\`forge invariant\` の multi-call testing** — per-scan な保存則（Liquidation L13）に最も近い Solidity プリミティブ。\`Handler\` を定義し、何千通りのランダムなメソッド呼び出し系列を回し、各ステップで property を assert する。
- **\`cast\` の筋肉記憶** — production の trader / engineer が 1 日に何十回も叩く chain CLI。Storage slot を読み、view 関数を呼び、ABI を decode する。
- **\`anvil --fork-url\` + cheatcodes** — \`vm.deal\` / \`vm.warp\` / \`vm.prank\` でローカルにメインネットを再現し、state-aware testing を回す。Cheatcodes の正体は precompile（openhl Precompiles コース参照）。Foundry はそれを Rust ではなく Solidity 経由で露出させているだけだ。
- **Capstone**: openhl-liquidation Stage 10b の \`InsuranceFund\` を Rust から Solidity に port し、L9 の保存則 invariant を Foundry で書き直し、同じ定理を 2 言語で mechanical に証明する。

掴むこと:

- **Foundry が Solidity ツール戦争に勝った理由**: Rust 製、single-binary、sub-second feedback、REVM を直接 embed する。その REVM こそ、openhl 系コースで内部を覗いてきた REVM そのものだ。
- **Hardhat / Truffle / Brownie が後退した理由**: JS ベース、遅い、EVM へのアクセスが embedded execution ではなく remote fork 経由で間接的だった。
- **\`forge fuzz\` と \`forge invariant\` が内部で実際にやっていること** — rethlab が openhl の \`crates/evm\` で教えているのと同じパターンで REVM を orchestrate し、それを Solidity 側の test として露出させているだけ。
- **なぜ cheatcodes が precompile なのか** — この設計判断ひとつが、Foundry の test 環境を JS ベースの代替より圧倒的に速くしている。

## このコースが存在する理由

ほとんどの Foundry チュートリアルは「このツールをどう使うか」に答える。本コースが答えるのは別の問いだ: **「Rust で学んだ厳格テストの規律を、どうやって Solidity contract に持ち込むか。」**

すべての openhl 系コースで繰り返されてきた、その規律の形:

\`\`\`
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
\`\`\`

右列のすべての行を、L6 までにあなたは自分の手で書く。Capstone こそが、左列と右列が同じことを言っている *証明* になる。

## なぜ Hardhat / Truffle / Brownie ではなく Foundry なのか

歴史を 1 段落で。**Foundry は 2022-2024 年にかけて JS ベース stack を置き換えた — Truffle は終了、Hardhat は主に deploy script や frontend 連携用途で生き残るのみ、L1 / contract / engine 開発では Foundry が事実上の業界標準 (de facto standard) になった。** 本コースのターゲット層 (L1 / infra エンジニア) にとって、**Foundry の習得は競争優位ではなく前提知識 (commodity prerequisite) だ。** 本コースが Foundry を教えるのは、すでに持っている規律をそのまま transfer するため。Foundry が勝った理由は 3 つ。

1. **速度。** Foundry の test runner は REVM を直接 in-process で embed する。JS test runner と別プロセスの \`ganache\` / \`hardhat node\` をつなぐ IPC round-trip がない。Hardhat で 60 秒かかる 1000-test スイートが、\`forge test\` なら 2-3 秒で終わる。アーキテクチャ的な違い:

   \`\`\`
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
   \`\`\`

   この 20-30× の高速化は optimization ではない — process boundary を取り除いた アーキテクチャ的な必然だ。
2. **Fuzzing が first-class primitive。** Hardhat では property-based testing は plugin 扱いだった。Foundry は built-in で出荷した — shrinking、corpus persistence、sequenced call 用の invariant testing 込みで。最も近い JS 等価物 (\`fast-check\` + Hardhat) は非自明な配線を要求する。
3. **Cheatcodes-as-precompiles。** Hardhat の \`evm_snapshot\` / \`evm_increaseTime\` は JSON-RPC method — リモートノードに state を変えるよう依頼する。Foundry の \`vm.warp\` / \`vm.deal\` / \`vm.prank\` はアドレス \`0x7109709ECfa91a80626fF3989D68f67F5b1DD12D\` の magic precompile への Solidity 呼び出し。これが **REVM の state を内側から hack する** — 同一プロセス、IPC なし、リモートノードへの信頼も不要。openhl Precompiles コース (Stage 9) を通った読者には、これは *Rust で学んだ「precompile-as-EVM-superpower」パターン* が Solidity 経由でテスト用に露出されたものだと分かる。速く、composable、何より contract と同じ Solidity ファイル内で testable。

**L1 エンジニアにとっての戦略的含意。** Reth / REVM / Alloy code を書いたり読んだりするなら（rethlab の既存フォーカス）、Foundry は別言語の wrapper を被った同じ toolchain だ。生態系を切り替えるのではない。同じ execution engine に第 2 の言語を足すだけだ。

## 規律の transfer — port する 3 つの具体的不変条件

L2、L3、L6 で歩く内容のプレビュー。

### Liquidation L9 から（Rust proptest）:

$$\\text{amount} + \\text{unfilled} = \\text{shortfall}$$

Fund は \`WithdrawOutcome { amount, unfilled }\` を返す。両者の和は caller が渡した shortfall と必ず一致する。Rust proptest はこう書く。

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

### Foundry へ（forge fuzz） — L2 で教える内容。

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

同じ定理、違う syntax。Rust の shrinker と Foundry の shrinker は反例に対して同じ挙動をする。**L6 が終わる頃には \`InsuranceFund\` 全体と L9 の 4 つの invariant をすべて port し終えている。同じ定理、2 言語、両方とも mechanical に証明済みだ。**

## 7 つのレッスン

### Module 0 — Orientation
- **L0** (本レッスン) — なぜ Foundry、discipline-transfer の thesis、7-lesson ロードマップ。

### Module 1 — Test discipline (L1–L3) — コア
- **L1** — \`forge test\` — first invariants、basic assertions、\`assertEq\` / \`vm.expectRevert\`、\`-vvv\` での実行。Solidity 版の \`cargo test\`。
- **L2** — \`forge fuzz\` — Solidity の \`proptest!\`。Single-parameter fuzzing、shrinking、corpus persistence。Liquidation L9 を cross-reference する。
- **L3** — \`forge invariant\` — \`Handler\` contract と \`targetContract\` で回す multi-call invariant testing。Liquidation L13 の scanner proptest（per-scan な保存則）を cross-reference する。

### Module 2 — CLI + state-aware testing (L4–L5)
- **L4** — \`cast\` — chain CLI の deep dive。\`call\` / \`send\` / \`storage\` / \`abi-decode\` / \`4byte\`。\`ethereum.reth.rs/rpc\` 経由のメインネット例。
- **L5** — \`anvil --fork-url\` + cheatcodes — \`vm.deal\` / \`vm.warp\` / \`vm.prank\` で回す state-aware testing。Cheatcodes-as-precompiles の framing（openhl Precompiles コースを cross-reference）。

### Module 3 — Capstone (L6)
- **L6** — **InsuranceFund.sol + forge invariants** — openhl-liquidation Stage 10b の \`InsuranceFund\` を Rust から Solidity に port し、L9 の保存則 invariant を Foundry で書き、10K iteration を回し、同じ定理を 2 言語で mechanical に証明する。答え合わせの contract + tests は rethlab の \`examples/foundry-capstone/\` 内。

## このコースに *含まれない* もの

- **Gas optimization の deep dive** — \`forge inspect\` の gas snapshot 自体は real な topic だが、optimization は規律ではない。スコープ外。（将来コース候補: 「L1 エンジニアのための Solidity — gas、storage layout、bytecode」）
- **Slither / Mythril / formal verification** — Foundry 隣接だが別の tooling family。扱わない。
- **Frontend / ethers.js / viem** — dApp stack の JS 側。rethlab の読者は L1 / contract / engine エンジニアであり、UI は別の関心事だ。
- **Foundry script (\`forge script\` での deployment)** — L4 の \`cast send\` セクションで軽く触れる程度。Deployment story は本コースが教える testing 規律とは別のスキルだ。

## License / asset discipline

本コースの reference asset — L6 の \`InsuranceFund.sol\` capstone + \`forge\` test corpus — は rethlab の \`examples/foundry-capstone/\` に in-repo で住む。レッスンが ship される rethlab git SHA に pin される。読者は \`git checkout <sha>\` で byte-for-byte に動く copy を手に入れる。

Foundry 自体は頻繁に update される。コースは \`foundry-rs/foundry\` rev に pin する（コースが ship する時点での \`foundryup\` デフォルト）。将来の Foundry version がレッスンを壊したら rethlab issue を立てる — コースは current stable Foundry を追随する設計だ。

## 前提知識

以下に慣れていること:
- 基本的な Solidity 構文 (\`function\` 定義が読め、\`mapping\` と \`struct\` を区別できる)。
- Rust crate での \`cargo test\` の実行 (rethlab の openhl 系コース全体で使うパターン)。
- rethlab の openhl-liquidation コースを少なくとも L9 まで読了している (最初の \`WithdrawOutcome\` proptest が登場するレッスン)。L6 capstone は、そのコースから \`InsuranceFund\` のセマンティクスを内面化していることを前提にする。

どれか心許なくても問題ない。openhl-liquidation コースが自然な前提知識で、基本 Solidity は solidity-by-example.org で 1 日で拾える。
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
                  title: "レッスン 1 — forge test — cargo test の Solidity 等価物",
                  slug: "foundry-forge-test-basics-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン 1 — \`forge test\` — \`cargo test\` の Solidity 等価物

## ゴール

このレッスンで掴む概念:

- **\`forge init\` のプロジェクト形は \`cargo new --lib\` の Foundry 等価物。** Rust が \`src/\` / \`tests/\` / \`target/\` / \`Cargo.toml\` で使うのと同じ規律あるディレクトリレイアウトを、Foundry は \`src/\` / \`test/\` / \`lib/\` / \`foundry.toml\` で再現する。Rust crate を書いたことがあれば、Foundry がコントラクトとテストをどう organize するかすでに知っている。名前は少し違うが、*役割* は 1:1 で対応する。
- **\`forge test\` は \`cargo test\` と同じ位置の binary。** First compile 後は sub-second feedback、同じ \`--match-*\` filtering、test 関数は名前で discover される慣例（Rust は \`#[test]\` attribute、Foundry は関数名が \`test\` で始まること）。両ツールが意図的に同じワークフローに収斂している理由はひとつ。Foundry の作者が Rust ネイティブで、その筋肉記憶をそこで先に育てたからだ。
- **\`assertEq\` / \`assertTrue\` / \`vm.expectRevert\` が unit test の 90% で使う 3 つの primitive。** \`assertEq\` は value equality（あらゆる Solidity primitive 型へのオーバーロード付き）、\`assertTrue\` は boolean 条件、\`vm.expectRevert\` は negative-path test（次の呼び出しが特定の reason で revert することを assert）。Rust への cross-reference は \`assertEq\` ↔ \`assert_eq!\`、\`vm.expectRevert\` ↔ \`#[should_panic]\` あるいは \`assert!(matches!(result, Err(_)))\`。
- **Verbosity は \`-v\` (silent) から \`-vvvvv\` (full call trace) まで段階的に上がる。** \`-vvv\` が daily default — 失敗した test を full storage dump 付きで表示する。\`-vvvvv\` は変な revert を debug したいときの opcode trace 込みのモード。Rust への cross-reference は \`cargo test -- --nocapture\`（\`println!\` 出力が見える）。Foundry の \`-vvv\` はその Solidity 等価物に加えて、各 step で EVM が見た storage diff まで見せてくれる。

確認:

\`\`\`bash
forge test
\`\`\`

…で \`forge init\` のデフォルト Counter コントラクトに付属する 2 つの test が走る。L1 完走後は negative-path test (\`vm.expectRevert\`) を 1 つ追加して合計 3 つ。レッスン終了時には 3 つすべて green。

具体的な変更:

- **\`src/Counter.sol\`** — \`forge init\` デフォルトから変更なし（編集ではなく *読む* 対象）。
- **\`test/Counter.t.sol\`** — 新しい test 関数 (\`test_RevertWhen_DecrementBelowZero\`) を 1 つ追加。Underflow-revert path を exercise する。Solidity 0.8 の built-in overflow check に対する \`vm.expectRevert\` のデモ。

合計で約 10 行の test code を追加。L1 の主題は ergonomics と test-discovery loop であって、賢い assertion ではない。

## おさらい

L0 の後はこうなっている。
- コースの positioning は明確: 同じ定理、2 言語、rethlab の Rust 規律を Solidity に port する。
- ロードマップは 7 レッスン: orientation (L0) → test discipline (L1–L3) → CLI + state-aware testing (L4–L5) → capstone (L6)。
- Foundry を install 済み (\`curl -L https://foundry.paradigm.xyz | bash && foundryup\`)、\`forge\`, \`cast\`, \`anvil\`, \`chisel\` の binary が \`$PATH\` に乗っている。

ここから L1 が test-discipline track を始める。最初の動詞は \`forge test\`。

## 計画

編集は 3 つ。

1. **\`forge init my-project && cd my-project\`** — 標準 Foundry プロジェクトレイアウトを作成する。何かを触る前に生成物を読む。
2. **\`src/Counter.sol\` と \`test/Counter.t.sol\` をそのまま読む** — どちらも \`forge init\` で同梱、慣例を実演している。1 行ずつ理解する。
3. **\`test/Counter.t.sol\` に test を 1 つ追加** — \`test_RevertWhen_DecrementBelowZero\`。新規の \`Counter\` (\`setUp()\` で \`number = 0\`) に対して、constant-folding を回避するために \`uint256 zero = 0;\` を経由した \`zero - 1\` を \`c.setNumber(...)\` に渡し、\`vm.expectRevert\` で revert を assert する。\`forge test -vvv\` で full trace を見ながら走らせる。

> 🛑 **予測。** 以下の \`forge init\` 出力を読む前に: Rust ファイルの Foundry 等価物を列挙せよ。
> 
> - \`Cargo.toml\` →
> - \`src/lib.rs\` →
> - \`tests/integration_test.rs\` →
> - \`target/\` →
> - \`Cargo.lock\` →

(答え: \`Cargo.toml\` → \`foundry.toml\`、\`src/lib.rs\` → \`src/Counter.sol\`（あるいは main コントラクトとして付けた名前）、\`tests/integration_test.rs\` → \`test/Counter.t.sol\`、\`target/\` → \`out/\` + \`cache/\`、\`Cargo.lock\` → 直接の等価物なし（Foundry は \`lib/\` の git submodule を依存解決に使い、\`lib/forge-std\` は standard testing library として常に存在する）。マッピングは意図的。Foundry チーム自身が Rust 出身で、Rust 開発者に familiar な感覚を作るためにこう構築した。)

## \`forge init\` プロジェクト形 — 1 ページツアー

\`\`\`
   my-project/
   ├── foundry.toml         ← Cargo.toml 相当: profile config、deps、コンパイラフラグ
   ├── src/                  ← src/ 相当: production コントラクトはここに住む
   │   └── Counter.sol       ←   デフォルトの starter コントラクト
   ├── test/                 ← tests/ 相当: integration test はここに住む
   │   └── Counter.t.sol     ←   デフォルトの starter test (.t.sol 慣例に注目)
   ├── script/               ← Foundry 専用: deployment script はここに住む (L4 でカバー)
   │   └── Counter.s.sol     ←   デフォルトの deploy script
   ├── lib/                  ← Cargo の deps cache 相当、ただし git submodule
   │   └── forge-std/        ←   standard test library — 常に存在
   ├── README.md
   └── .gitignore            ← out/ と cache/ を ignore するよう事前設定済み
\`\`\`

レイアウトで押さえる点が 4 つ。

1. **\`.t.sol\` と \`.s.sol\` はファイル命名慣例であって、コンパイラが enforce するものではない。** Foundry は \`test/\` 内のコントラクトで関数名が \`test\` で始まるものを test として扱う。\`.t.sol\` サフィックスは人間可読のための慣例で、\`*.t.sol\` で grep すれば全 test ファイルが見つかる。\`.s.sol\` で script ファイルも同様。**Foundry は naming convention を使い、Rust は attribute を使う。規律は同じ。**
2. **\`lib/forge-std\` は git submodule で、npm/cargo dep ではない。** \`forge init\` が \`forge install foundry-rs/forge-std\` を走らせ、\`lib/\` に clone する。Versioning は git tag か commit。Cargo/npm の依存解決の複雑性より genuinely simple だが、dep ごとに 1 つの git submodule が要る。**Foundry の dep モデルは、semver の複雑性を git の透明性と引き換えにする — \`cd lib/forge-std && git log\` で依存しているコードを正確に見られる。**
3. **\`out/\` と \`cache/\` はデフォルトで gitignore されている。** \`out/\` はコンパイル済み bytecode + ABI JSON を保持する（Rust の \`target/debug/\` 相当）。\`cache/\` は incremental compilation state を保持する。どちらも安全に消して再生成できる。そしてどちらも絶対に commit してはいけない。
4. **\`script/\` は deployment script 用 (L4 で簡単に触れる)。** Foundry は testing と scripting を同じ \`forge\` binary 下に統合する。Hardhat は 2 つのツールに split する (\`hardhat test\` vs \`hardhat run\`)。統合は小さいが、1 日の context-switching コストを削減する。**1 つの binary、1 つの config、1 つのメンタルモデル。**

## 手を動かす walk-through

### Step 1: \`forge init\` して見回す

\`\`\`bash
forge init my-foundry-lab
cd my-foundry-lab
ls -la
\`\`\`

前セクションのレイアウトが見えるはず。\`lib/forge-std/\` が空なら（init 中のネットワーク問題）、\`forge install foundry-rs/forge-std\` を走らせて修正する。

\`\`\`bash
forge test
\`\`\`

期待される出力（短縮版）:

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

**2 つの test、両方とも green。** First compile は数秒。その後の run は sub-second。

出力フォーマットで押さえる点が 3 つ。

1. **\`(gas: 31303)\`** — すべての test が消費した gas を報告する。Hardhat はデフォルトで表示しない。Foundry は gas を first-class metric として扱う。（コンセンサス決定性に慣れた engineer 向けに補足: gas は EVM の「コンセンサスコスト」相当だ。同じ transaction に対してすべての validator が同じ gas を計算する。Tracking は規律の一部。）
2. **\`(runs: 256, μ: 31000, ~: 31161)\`** — その test は fuzz test (理由は L2 で説明)。\`runs: 256\` は 256 個のランダム入力で走らせたという意味。\`μ\` は mean gas、\`~\` は median。Foundry は fuzz の統計を inline で表示する。
3. **\`5.67ms CPU time\`** — Foundry は wall-clock と CPU time を別々に表示する。並列 test suite では CPU time が wall-clock を超える。2-test suite では同じになる。

### Step 2: \`src/Counter.sol\` を読む

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

押さえる点が 5 つ。

1. **\`pragma solidity ^0.8.35\`** — \`^\` は caret style version 制約 (Cargo と同じ構文) で、「0.8.35 以上、ただし 0.9 未満」を意味する。Solidity 0.8 が規律の境界線: built-in overflow check が導入された (\`SafeMath\` 不要)。これこそが後の \`test_RevertWhen_DecrementBelowZero\` test を可能にしている。
2. **\`uint256 public number\`** — \`public\` が getter 関数 (\`number()\`) を自動生成する。State variable 自体はコントラクト内部から直接書ける。外部からは自動生成された getter のみ呼び出せる。**Solidity は \`let pub\` と \`let pub fn ...()\` を 1 つの宣言に collapse する。**
3. **コンストラクタなし。** デフォルト初期化で \`number = 0\`。Rust の \`i64::default()\` と同じ default-zero semantics。
4. **\`setNumber\` と \`increment\` は \`public\`** — 誰でも呼べる。(\`onlyOwner\` のような制限 modifier は production ではここに入る。例は意図的に permissionless。)
5. **\`decrement\` 関数は存在しない。** これがヒント。新規 test は test ファイル内で *decrement を加えず* に underflow を直接トリガする (local 構築経由)。

### Step 3: \`test/Counter.t.sol\` を読む

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

押さえる点が 6 つ。

1. **\`import {Test, console} from "forge-std/Test.sol"\`** — \`Test\` がすべての test が継承する base contract で、\`assertEq\` / \`assertTrue\` / \`vm.*\` cheatcodes 等を bundle する。\`console.log\` は Foundry の \`dbg!\` macro 相当 — 実際のコントラクト bytecode に影響しない print-debugging だ。
2. **\`contract CounterTest is Test\`** — test ファイル自体が \`forge-std\` の \`Test\` を継承するコントラクト。関数継承で \`assertEq\` と \`vm.*\` への access を得る。**Solidity の継承は tooling の API surface だ。Rust は trait + \`use\` を使う。**
3. **\`function setUp() public\`** — *すべての* test 関数の前に走る。Rust の \`#[test]\` ごとの init と同じ役割を 1 つの関数に集約したものだ。**Test contract あたり \`setUp\` 1 つ。Per-test の setup が欲しければ、個別の test 関数内に wrap する。**
4. **\`function test_Increment() public\`** — 名前が \`test\` で始まり、\`public\` でマーク。それだけ、annotation なし。Foundry の test discovery は *name-based*。**「underscore-suffix-or-prefix が kind を名付ける」慣例は Solidity 版の Rust attribute システムだ。**
5. **\`testFuzz_SetNumber(uint256 x)\`** — 名前が \`testFuzz\` で始まり、かつ parameter を取る。Foundry はこれを fuzz test と解釈する (L2 でカバー)。\`setNumber(x)\` が 256 個のランダム \`uint256\` 値で呼ばれる。Assertion はそのすべてに対して成立する必要がある。
6. **\`assertEq(counter.number(), 1)\`** — equality assertion。\`forge-std\` の \`Test\` は \`assertEq\` を *すべての* Solidity primitive 型 (\`uint\`, \`int\`, \`bool\`, \`address\`, \`bytes\`, \`string\`, \`bytes32\`, ...) に対して overload する。型付きの variant を選ぶ必要はない。引数の型から正しい overload が選ばれる。**1 行 assertion、Rust の \`let x = ...; let y = ...; assert_eq!(x, y);\` の cascade はなし。**

### Step 4: \`vm.expectRevert\` で negative-path test を追加

Counter コントラクトには \`increment\` はあるが \`decrement\` はない。Solidity 0.8 は built-in overflow check を持つので、\`uint256(0)\` からの減算は \`Panic(uint256)\` で revert する (underflow の panic code は \`0x11\`)。これを exercise する test を、underflow を test 内に inline で trigger しながら書く。

\`test/Counter.t.sol\` に追記:

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

押さえる点が 6 つ。

1. **\`test_RevertWhen_<condition>\` は negative-path test の Foundry docs での命名慣例。** Test runner は強制しない (\`forge test\` はサフィックスを気にしない)。だが慣例が test 一覧を self-documenting にする。**Tooling が構造を強制しないとき、命名慣例がドキュメントになる。**
2. **\`vm.expectRevert()\` を引数なしで** — *任意の* revert reason に一致する。具体的な reason を気にしないときは引数なし形を使う。具体的な reason を assert したいときは \`vm.expectRevert(bytes)\` を使う (L3 で custom error と一緒に見る)。
3. **\`vm.expectRevert\` は revert を期待する call の *直前* に呼ばなければならない。** Wrapper ではなく、次の external call を arm する one-shot cheatcode だ。\`expectRevert\` と target の間に何か別の呼び出しを挟むと、cheatcode は wrong call で trigger し、test が紛らわしく失敗する。Lifetime はちょうど 1 call ぶん:

   \`\`\`
      時間 ──►

      ┌──────────────────────────────────────────────────────────┐
      │  正しい — vm.expectRevert が *次の* external call を arm  │
      ├──────────────────────────────────────────────────────────┤
      │   vm.expectRevert();      ←─── 罠を arm する              │
      │   counter.setNumber(...); ←─── 罠が発火、revert を期待    │
      │                            ✓  call が revert すれば test 成功 │
      └──────────────────────────────────────────────────────────┘

      ┌──────────────────────────────────────────────────────────┐
      │  誤り — 間に挟まる call が arm を先に消費してしまう       │
      ├──────────────────────────────────────────────────────────┤
      │   vm.expectRevert();      ←─── 罠を arm する              │
      │   counter.number();       ←─── 罠はここで発火するが、     │
      │                            ✗      revert しない → arm 消費 │
      │   counter.setNumber(...); ←─── unarmed で走り、real な    │
      │                                  revert は test に捕まらない │
      └──────────────────────────────────────────────────────────┘
   \`\`\`

   **\`vm.expectRevert\` は 1-call の lifetime を持つ。順序を尊重する。**
4. **\`uint256 zero = 0; zero - 1\` パターンは constant-folding 回避策。** \`uint256(0) - 1\` をリテラル式として書くと見た目は同じだが、コンパイルが通らない — Solc 0.8 はリテラル算術をコンパイル時に評価し、underflow を検出してソースを reject する。ゼロをローカル変数に格納すると、constant folder の目を欺ける: SUB opcode が runtime で走り、Solidity 0.8 が \`unchecked {}\` の外のあらゆる算術 op に挿入する *runtime* overflow check が \`Panic(0x11)\` を trigger する。**Compile-time と runtime の overflow check は別の layer に住む。書き方がどちらを発火させるかを決める。** 微妙だが押さえておくべき点: SUB opcode は *このテストコントラクトの内部* で実行される — \`counter.setNumber\` への引数を組み立てる段階で発火する。つまり panic が走る場所はテストコントラクト側であり、\`counter.setNumber\` への external call は実際には dispatch されない。\`-vvvv\` トレースを見ると \`counter\` への call は現れない。それでもテストが pass するのは、\`vm.expectRevert\` が arm から次の external-call サイトまでの間に起きるあらゆる revert を catch するからだ — テストコントラクト自身が起こす revert もこれに含まれる。
5. **コメントブロックが test の意図を step-by-step で walk する。** openhl-liquidation L13 の test と同じ \`math-walk in comments\` 規律だ。失敗を debug する将来の reader はコメントを読んで期待される挙動を再導出できる。**Math-walk コメントが 1 つの test を、テスト対象の EVM 挙動の worked example に変える。**
6. **\`Counter.sol\` に \`decrement()\` を追加していない** — underflow を test 内部で直接 trigger した。Production contract を変更せずに挙動を exercise できるという意味だ。Real な \`decrement\` メソッドがある production contract では、test は \`counter.decrement()\` を直接呼ぶ。**Test は contract を変更せずに minimal シナリオを構築できる。**

### Step 5: \`forge test -vvv\` で走らせる

\`\`\`bash
forge test -vvv
\`\`\`

期待される出力（短縮版）:

\`\`\`
Ran 3 tests for test/Counter.t.sol:CounterTest
[PASS] testFuzz_SetNumber(uint256) (runs: 256, μ: 31000, ~: 31161)
[PASS] test_Increment() (gas: 31303)
[PASS] test_RevertWhen_DecrementBelowZero() (gas: 8957)
Suite result: ok. 3 passed; 0 failed; 0 skipped; finished in 7.12ms
\`\`\`

**3 つの test pass。** \`test_RevertWhen_DecrementBelowZero\` の gas コスト (~9k) が他 (~31k) よりはるかに低いことに注目。EVM が call の途中で revert しているからだ。**Revert は成功より安い。成功 path で起きるはずの SSTORE が gas を食う。**

意図的に test を壊して \`-vvv\` が失敗時に何を見せるか確認するには、test を一時的にこう変える。

\`\`\`solidity
vm.expectRevert();
counter.setNumber(42); // これは revert しない。Test は失敗するはず。
\`\`\`

\`forge test -vvv\` を再実行:

\`\`\`
[FAIL: call did not revert as expected] test_RevertWhen_DecrementBelowZero() (gas: ...)
\`\`\`

\`-vvv\` は storage trace を追加し、\`-vvvvv\` は opcode-level trace を追加する。Verbosity こそが debug tool だ。

続行する前に test を元の pass 版に戻す。

エラー時にありがちなパターン。

- **\`Source "forge-std/Test.sol" not found\`** — \`forge install foundry-rs/forge-std\` を実行しておらず、\`lib/forge-std/\` が空。今走らせる。(\`forge init\` が通常やってくれるが、ネットワーク不具合で skip されることがある。)
- **\`Error: test_RevertWhen_DecrementBelowZero() FAILED. Reason: call did not revert as expected\`** — Solidity version が 0.8.x ではなく、built-in overflow check を欠いている。\`Counter.sol\` の冒頭で \`pragma solidity ^0.8.35\` を確認する。
- **\`compile error: not found: Counter\`** — import path が wrong。Test ファイルは \`import {Counter} from "../src/Counter.sol"\` と書く。相対 path を再確認する。

### Step 6: \`--match-test\` で test を filter

\`\`\`bash
forge test --match-test test_Increment -vvv
\`\`\`

\`test_Increment\` test のみを走らせ、fuzz test と revert test を無視する。1 つの test を反復するときに便利だ。Foundry の compile cache のおかげで、単一 test の subsequent run は ~50ms で済む。

他の便利な filter。

- \`--match-contract CounterTest\` — 特定 contract の全 test を走らせる
- \`--match-path 'test/Counter.t.sol'\` — 特定 file の全 test を走らせる
- \`--no-match-test testFuzz_SetNumber\` — 特定 test を skip (\`!\`-style negation)

**Rust への cross-reference。** \`forge test --match-test foo\` は \`cargo test foo\` と同じ partial-name match だ。\`--match-*\` ファミリーはどの axis で filter しているかを明示的にする。**Tooling が同じワークフローに収斂するとき、syntax も収斂する。**

## 設計の振り返り

Foundry の \`forge test\` を形作った load-bearing な決定が 3 つ。

1. **Test は JavaScript ではなく Solidity に住む。** Hardhat の test は JS ファイルで、ethers.js 経由でコントラクトを呼び出す。Foundry の test は *コントラクトそのもの* — production code と同じ言語、同じコンパイラ、同じ bytecode。これが context-switching を 1 層丸ごと collapse する。**Test code と production code がコンパイラを共有すれば、\`import {Counter} from "../src/Counter.sol"\` で test surface 全体を statically type-check できる。**

2. **Test discovery は attribute ではなく name で行う。** Foundry が \`@Test\` annotation を必要としないのは、Solidity に decorator がないからだ。\`test*\` で名付けられた関数が test。慣例は \`forge\` の test contract の関数リストへの grep で enforce される。**Tooling 出力に documented された慣例は、人間 reader にとって attribute と等価だ。両方とも「これは test」signal を生む。**

3. **\`vm.*\` cheatcodes は precompile であって、JS 側 wrapper ではない。** Hardhat の \`evm_snapshot\` は RPC method。Foundry の \`vm.expectRevert\` は precompile call。Cheatcode はアドレス \`0x7109709ECfa91a80626fF3989D68f67F5b1DD12D\` に住み、Foundry の REVM fork がそのアドレスへの call を intercept する。まさに openhl Stage 9 の precompile-as-EVM-superpower パターン。**L1 では \`vm.expectRevert\` だけを使った。L2 と L3 でさらに cheatcode が登場する。それぞれが precompile だ。**

## 答え合わせ

このレッスンの「答え合わせ」は \`forge init\` が生成するもの + あなたが追加した 1 つの test 関数。ディレクトリ構造はこうなる。

\`\`\`
   my-foundry-lab/
   ├── foundry.toml         (init から変更なし)
   ├── src/Counter.sol       (init から変更なし)
   ├── script/Counter.s.sol  (init から変更なし)
   ├── test/Counter.t.sol    (新規 test 関数で +10 行)
   └── lib/forge-std/        (git submodule、変更なし)
\`\`\`

L1 の後:
- \`forge test\` が 3 つの test を pass する
- \`Counter.sol\` と \`Counter.t.sol\` の各行を読み、慣例を理解した
- \`vm.expectRevert\` test を追加し、\`-vvv\` が何を見せるか確認した

L1–L5 には in-repo の答え合わせがない。\`forge init\` の出力が答え合わせだからだ。同じ Foundry version なら、すべての reader に対して同じ出力が出る。L6 の capstone がこれを変える: L6 では \`rethlab/examples/foundry-capstone/\` の特定の \`InsuranceFund.sol\` + test に対して作業する。

## よくある質問

**Q1: なぜ本コースが deployment を本格的にカバーしないのに \`forge init\` が \`script/\` を作るのか?**

\`forge\` が testing と deployment scripting の両方を扱う 1 つの binary だから。プロジェクトレイアウトには両方のための slot がある。片方しか使わなくても、だ。\`script/\` は L4 で軽く触れる (\`cast send\` + \`forge script\` 経由のシンプルな deploy)。Full な deployment ワークフローはそれ自体が別コース (スコープ外、L0 の「含まれないもの」リスト通り)。

**Q2: なぜ \`setUp()\` が全 test の前に走り、contract 全体に 1 度ではないのか?**

Foundry の test isolation が各 test を *fresh* な EVM state に対して走らせるからだ。どの test も state を別の test に leak できない。\`setUp()\` は per-test initializer。一度だけの global init (heavy fixture など) が欲しければ、test contract のコンストラクタに setup する。それは test contract がデプロイされたときに 1 度走る。**Per-test isolation がデフォルトなのは、cross-test の state leak がどんな test runner でも flaky test の #1 source だからだ。**

**Q3: なぜ \`assertEq(counter.number(), 1)\` が \`number()\` を関数として呼び、field として読まないのか?**

\`uint256 public number\` がその名前の getter 関数を自動生成するから。同じ contract 内部からは \`number\` と書ける。外部からは — test がいる場所、つまり \`CounterTest\` は \`Counter\` とは別の contract だ — \`counter.number()\` を呼ぶ必要がある。**Public state variable は Solidity の \`get*\` 関数の syntactic sugar。Call-site 構文が裏で生成された関数を反映する。**

**Q4: \`-vvv\` が default 出力に何を追加するのか?**

段階はこう。

- \`-v\` / フラグなし: pass/fail summary
- \`-vv\`: 失敗 test がエラーメッセージを得る
- \`-vvv\`: 失敗 test が stack trace を得る (どの関数がどれを呼んだか)
- \`-vvvv\`: 失敗・通過の両方が stack trace を得る
- \`-vvvvv\`: opcode-level の実行 trace (最も深い debug モード)

実務的には日常開発に \`-vvv\` (速い、失敗時にだけ興味深いものが見える)、変な revert で詰まったときだけ \`-vvvvv\`。

**Q5: \`test/\` の外の別ファイルで test を書けるか?**

書ける。\`foundry.toml\` を設定して他の test path を追加できる。だが default の \`test/\` ディレクトリが慣例で、tooling integration (IDE plugin、CI matrix) はそれを前提にする。Real な理由がない限り (各 contract チームが独自 \`test/\` subdir を欲しがる巨大 monorepo など) default のままで。**慣例は default が sane であるとき configuration に勝つ。**

**Q6: なぜ Solidity は Rust の \`[package] edition = "2024"\` のような形ではなく \`pragma solidity ^0.8.35\` を持つのか?**

言語進化モデルが違うから。Rust の edition は *epoch* で、古い構文を壊さずに default を変える (例: 2024 が新しいキーワード予約を有効化)。Solidity の pragma はどの compiler version が file をビルドできるかを制約する。Solidity では compiler bug が一般的で、コンセンサス決定性が mid-deploy version 不一致を catastrophic にする。だからこちらのほうが重い。**Solidity の pragma は Cargo.toml の \`edition = "2024"\` よりも \`rust-version = "1.85"\` に近い。**

## 次のレッスン (L2) — \`forge fuzz\` — Solidity の \`proptest!\`

L2 は \`testFuzz_SetNumber\` test を property-based testing の real な working example に変える。openhl-liquidation の L9 が "proptest" と呼ぶものだ。学ぶこと:

- Default の 256-iteration fuzz cycle と \`foundry.toml\` 経由でのバンプ
- \`vm.assume(condition)\` — \`prop_assume!\` の Solidity 等価物、precondition に違反する入力を filter する
- Shrinking — Foundry が 32-byte counterexample を、failure を trigger する最小 \`uint256\` まで reduce する仕組み
- Corpus persistence — \`cache/fuzz/\` が失敗入力を保存し、re-run が同じ counterexample を即座に replay する

L2 後、Solidity で最初の保存則 fuzz test を書き終えている。openhl-liquidation L8 の \`balance_never_negative\` proptest に 1:1 で map するものだ。
`,
                },
                {
                  title: "レッスン 2 — forge fuzz — Solidity の proptest!",
                  slug: "foundry-forge-fuzz-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン 2 — \`forge fuzz\` — Solidity の \`proptest!\`

## ゴール

このレッスンで掴む概念:

- **\`forge fuzz\` は別構文の \`proptest!\`。** 同じ「定理先行（Theorem-first）」のマインドセット: assertion が *すべての valid な入力に対して* 成立するべきと書き（hand-picked example だけではなく）、runner に入力空間の counterexample を探させる。同じ shrinker が 32-byte の失敗入力を、bug を trigger する最小の \`uint256\` に reduce する。同じ corpus persistence が既知の counterexample を次回 run で即座に replay する。openhl-liquidation L9 で \`proptest! { #[test] fn balance_never_negative(...) { ... } }\` を書いたなら、\`testFuzz_*\` 関数の形はすでに知っている。Solidity が contract 構文で包むだけだ。
- **\`vm.assume(condition)\` は \`prop_assume!\` の Solidity 等価物。** どちらも前提条件に違反する入力を、assertion が走る *前* に filter する。Test は property の well-defined な regime だけを exercise する。Liquidation L9 の \`prop_assume!(entry * size > collateral)\` と同じパターン: 入力が test の意味ある domain から外れるなら捨てる。Fuzzer は別の入力を生成して再試行する。それだけ。
- **デフォルト 256 iteration は *最小* であって、ゴールではない。** \`foundry.toml\` の \`fuzz.runs = 256\` が out-of-the-box デフォルト。明らかな bug を数秒で catch するには十分、property を証明するには不十分。Production codebase は CI で 10_000 や 100_000 まで bump し、より高い count は nightly run のために予約する。Rust の \`proptest!\` が \`CASES = 256\` デフォルトで取るのと同じ trade-off。
- **Shrinking は「test がどこかで失敗した」と「test が *正確にこの入力で* 失敗した」の差。** \`forge fuzz\` が counterexample (例えば \`x = 0xa3b8...4d2f\` — ランダムな 32 バイト値) を見つけたとき、失敗を報告して終わりではない。Binary-search スタイルの reduction を走らせ、失敗を再現する *最小* の \`x\` を見つける。出力に現れるのは minimal counterexample (しばしば 1 桁の数字) で、「ある入力で壊れた」より一桁速く debug できる。

確認:

\`\`\`bash
forge test
\`\`\`

…で 4 つの test が pass する (L1 由来の 3 つ + 本レッスンで追加する fuzz test 1 つ)。デフォルト 256 iteration では 4 つすべて green。100_000 iteration での挙動も見る。

具体的な変更:

- **\`foundry.toml\`** — \`[fuzz]\` profile セクション (\`runs = 1000\`) と、heavy run 用のプロファイル alias \`[profile.ci]\` (\`runs = 100000\`) を追加。各 test に hard-coding せずに iteration count を tune するやり方のデモ。
- **\`test/Counter.t.sol\`** — 新規 fuzz test を 1 つ追加: \`testFuzz_IncrementPreservesPlusOne(uint256 x)\`。\`vm.assume(x < type(uint256).max)\` で overflow ケースを assertion 前に filter する。

合計で約 15 行の新規コード。L2 の主題は *fuzzing とは何か* と *なぜ shrinker が重要か* であって、賢い fuzz coverage ではない。

## おさらい

L1 の後はこうなっている。
- \`forge test\` が 3 つの test (forge init デフォルトの 2 + L1 で追加した \`vm.expectRevert\` test) を clean に走らせる。
- プロジェクト形、\`setUp\` per-test isolation パターン、\`-v\` から \`-vvvvv\` までの verbosity ladder を内面化済み。
- \`testFuzz_SetNumber(uint256 x)\` test が 256 runs で pass するのを見た。ただし説明はなかった。L2 がその *中身* を説明する。

L2 がその謎の 256-run 行を property-based testing の中心ツールに変える。

## 計画

編集は 3 つ。

1. **\`foundry.toml\` を開く** — \`[fuzz]\` セクションを追加してデフォルト iteration count を tune する。Heavy run 用に \`[profile.ci]\` を追加。(まだ新規 contract code なし。設定のみ。)
2. **L1 の \`Counter.t.sol\` の \`testFuzz_SetNumber(uint256 x)\` を読む。** Foundry が fuzz test として扱う理由、runner が各 iteration で何をするか、結果行 \`(runs: 256, μ: 31000, ~: 31161)\` がどう生成されるかを理解する。
3. **新規 fuzz test を 1 つ追加** — \`testFuzz_IncrementPreservesPlusOne(uint256 x)\`。\`counter\` を \`x\` にセット、\`counter.increment()\` を呼ぶ、\`counter.number() == x + 1\` を assert する。\`vm.assume(x < type(uint256).max)\` で overflow ケースを filter する。\`forge test -vvv\` で走らせる。

> 🛑 **予測。** 続きを読む前に: openhl-liquidation L9 の \`proptest!\` で \`CASES\` のデフォルトは \`256\`。\`forge fuzz\` でも \`fuzz.runs\` のデフォルトは \`256\`。Production codebase がよく使う CI-tier の実用値は? \`1_000_000\` に bump するとトレードオフは?

(答え: **ほとんどの production CI は \`10_000\` か \`100_000\` で回す**。Nightly fuzzer は \`1_000_000\` まで push する。トレードオフはこう。各 iteration が full test (setUp → call → assertion → state cleanup) を走らせる。256 iteration なら単一の fuzz test は ~50ms、100_000 で ~20 秒、1_000_000 で ~200 秒。100_000 を超えると収穫逓減（Diminishing returns）が始まる。巨大な入力空間を exercise していない限り、だが。ほとんどの uint256 fuzz test には *de facto* 小さい interesting region があり、100_000 でそこに到達する。**High count は専用 nightly CI で、デフォルト count は PR CI で、低 count はローカル開発で。**)

## \`forge fuzz\` が実際に何をするか

\`\`\`mermaid
flowchart TD
    A[1. ランダムな uint256 生成] --> B[2. setUp 実行<br/>fresh な Counter, number = 0]
    B --> C[3. testFuzz_* x = 生成値 で呼び出し]
    C --> D{4. vm.assume の条件合致?}
    D -->|false: イテレーション破棄| A
    D -->|true| E[5. アサーション実行<br/>assertEq / assertTrue]
    E -->|PASS: 次のループへ| A
    E -->|FAIL: シュリンカー起動| F[最小の反例を特定]
    A -.->|max_test_rejects 超過| H[TooManyAssumptions エラー終了]
    A -.->|fuzz.runs 回成功後| G[Gas 統計 μ / ~ を報告]
\`\`\`

Loop で押さえる点が 3 つ。

1. **\`setUp()\` が *毎* iteration 走る。** これが per-iteration state isolation。L1 の per-test isolation と同じ規律だが、より細かい粒度だ。失敗する iteration が次の iteration を poison できない。各 run は fresh。**Per-iteration isolation が fuzz failure を reproducible にする。**
2. **Fuzz test 内の \`vm.assume(cond)\` は、condition が false なら iteration を暗黙的に破棄（Discard）する。** Test を失敗させず、pass としてもカウントしない。新しい入力を生成するだけだ。これが入力 filtering メカニズム。**Precondition には \`vm.assume\`、negative-path test には \`vm.expectRevert\`。** 似て聞こえるが、逆のことをする。
3. **Gas 統計 (μ と ~) は *pass した* iteration から来る。** 失敗 iteration は寄与しない。Fuzz test がほぼ pass するが時々高コストな edge case に当たる場合、cheap iteration が dominant で μ は低く報告される。Fuzz gas 値を worst-case として読まない。typical-case だ。**Worst-case gas が欲しければ、特定の high-gas 入力に対する unit test を使う。**

## Shrinker が発火するとき

\`\`\`mermaid
flowchart TD
    A[初期の失敗入力<br/>x = 0xa3b8_f4c2_... 巨大な数] --> B{半分にしてみる<br/>x / 2}
    B -->|まだ失敗| B
    B -->|pass| C[直前の失敗にロールバック]
    C --> D{小さい mutation を試す<br/>x ± 1, x ± 2, ...}
    D -->|より小さい失敗あり| D
    D -->|shrink 限界| E[最終報告<br/>counterexample args=5<br/>bug を再現する最小の x]
\`\`\`

Shrinking で押さえる点が 2 つ。

1. **Shrinker は *網羅的ではない*。** ヒューリスティック (半分にする、small-step mutation、bit-flipping) を使い、絶対的な最小ではなく「小さい」失敗を見つける。実務的にはこれで十分。counterexample \`5\` は absolute-minimum \`3\` と同じように debug できる。**ヒューリスティック shrinking で十分。32-byte 入力空間に exhaustive shrinking は実用的でない。**
2. **Shrinkage は per-parameter。** \`(uint256 a, uint256 b)\` を取る fuzz test は各パラメータを独立に shrink する。Foundry は \`a, b/2\` の後 \`a/2, b\` のような cross-product を試さない。1 つずつ shrink する。**Multi-parameter shrinking は大域的最適（Global）ではなく局所的最適（Local）。出力に現れる minimal counterexample は per-axis に局所的に minimal。**

## 手を動かす walk-through

### Step 1: Fuzz iteration count のために \`foundry.toml\` を tune する

\`foundry.toml\` を開く。\`forge init\` の後はこう見えるはず:

\`\`\`toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]

# See more config options https://github.com/foundry-rs/foundry/blob/master/crates/config/README.md#all-options
\`\`\`

\`[fuzz]\` セクションを default profile に追加し、より heavy な \`[profile.ci]\` も追加:

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

押さえる点が 3 つ。

1. **\`runs = 1000\` が新しいデフォルト** — out-of-the-box の 256 の 4 倍。ローカル開発の feedback を 1 秒未満に保つには tight、デフォルトが見逃す明らかな bug を catch するには loose。**2 つ目の fuzz test を書く時点で 256 から 1000 に bump する。コストは sub-second。**
2. **\`max_test_rejects = 65536\`** — test が失敗を報告する前に許容する \`vm.assume\` rejection の最大数。デフォルトは 65536、通常は到達しない。到達したならば \`vm.assume\` predicate が too restrictive だ。fuzzer がそれを満たす入力を見つけられない。**\`max_test_rejects\` 失敗は、precondition が wrong である signal であって、fuzzer が壊れている signal ではない。**
3. **\`[profile.ci.fuzz] runs = 100000\`** — CI が \`FOUNDRY_PROFILE=ci forge test\` を走らせると、この 100K-iteration 値がデフォルトを上書きする。Production codebase (Uniswap、Compound、AAVE) はすべてこの profile-per-environment パターンを使う。**Profile が iteration count を環境ごとに tune させる。hard-coding なしで。**

\`forge test\` を走らせて config が何も壊していないことを確認:

\`\`\`bash
forge test
\`\`\`

期待される出力は既存 fuzz test に \`(runs: 1000, ...)\` を表示するようになる:

\`\`\`
[PASS] testFuzz_SetNumber(uint256) (runs: 1000, μ: 31000, ~: 31161)
\`\`\`

### Step 2: L1 の \`testFuzz_SetNumber\` を読む

\`forge init\` 由来の test (すでに持っている):

\`\`\`solidity
function testFuzz_SetNumber(uint256 x) public {
    counter.setNumber(x);
    assertEq(counter.number(), x);
}
\`\`\`

押さえる点が 4 つ。

1. **関数名が \`testFuzz_\` で始まる。** Foundry は名前が \`test\` で始まり、かつパラメータを取る関数を fuzz test として認識する。\`testFuzz_\` プレフィックスは慣例 (strict な構文ではない)。パラメータが fuzzing を trigger する。**慣例 + パラメータ signature = fuzz test。**
2. **\`uint256 x\` が fuzz input。** Foundry は各 iteration でランダムな \`uint256\` を生成する。Multi-parameter signature (例: \`function testFuzz_Op(uint256 a, address b)\`) は各パラメータに独立に fuzz された値を得る。**各 fuzz パラメータが独立にサンプリングされる。**
3. **\`assertEq(counter.number(), x)\` の行が property。** こう読む。「すべての uint256 値 \`x\` について、\`setNumber(x)\` 後に counter は \`x\` を保持する」。これは program correctness の statement で、単一 example ではない。**Fuzz assertion は普遍量化された property、unit-test assertion は 1 つの example。**
4. **\`vm.assume\` がない。precondition がないから。** すべての \`uint256\` 値が \`setNumber\` への valid 入力だ。すべての入力が valid なら filter する必要はない。fuzzer に iterate させるだけだ。**\`vm.assume\` は regime を制限するためのもの。Property が普遍的に成立するなら省く。**

この特定 test は *trivially* true。\`setNumber\` がただ値を保存するだけだ。Property は「storage write が渡したものを実際に保存した」。証明する価値はある property (将来 setter で一部 bit をマスクする refactor がこの fuzz test を失敗させる) だが、fuzzing の power の興味深いデモではない。Step 3 の新規 test がそのデモだ。

### Step 3: \`testFuzz_IncrementPreservesPlusOne\` を追加

\`test/Counter.t.sol\` に追記:

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

押さえる点が 6 つ。

1. **\`vm.assume(x < type(uint256).max)\` が、property が成立しない唯一の入力を filter する** — 最大値、\`x + 1\` が overflow する場所。Filter なしだと test は *正しく* その 1 つの入力で失敗する。Filter ありだと、test は *意味ある* 入力範囲で property を証明する。**\`vm.assume\` が、property が assert される regime を定義する。** これは L1 の \`vm.expectRevert\` とは目的が真逆だ。\`vm.expectRevert\` は「リバートが起きること」を期待する negative-path test であり、リバート発生こそが成功条件。一方 \`vm.assume\` は「そもそもリバートを引き起こす入力を試験空間から除外する」positive-path test の保護機構で、property assertion が well-defined な domain で走れるようにする。物理現象は同じ（このコントラクトはこの入力でリバートする）— だが test 規律上の意図は正反対。
2. **コメントが openhl-liquidation L9 の \`prop_assume!\` を cross-reference する。** 同じ役割、同じパターン、別の構文。そのコースを通った読者はこの規律を認識する。**Cross-language pattern recognition がこのコース全体の load-bearing pedagogical move。**
3. **Property \`counter.number() == x + 1\` が保存則。** Increment 前: \`x\`。Increment 後: \`x + 1\`。差はちょうど 1。そして *すべての valid な \`x\`* で成立する。L9 proptest \`withdraw_amount_plus_unfilled_equals_shortfall\` と同じ shape。**Fuzz test は保存則を表現する、unit test は特定の case を表現する。**
4. **\`x + 1\` は assertion 内、\`vm.assume\` が \`type(uint256).max\` を reject した後に起きる。** だから \`+1\` の算術は常に安全 (never overflow)。\`vm.assume\` がこの assertion を misfire から protect する。**Precondition が算術を guard する。Precondition は property の一部だ。**
5. **\`counter.setNumber(x)\` が assertion 前に state を mutate する。** 各 fuzz iteration は fresh (Step 1 の図にある per-iteration \`setUp\`) なので、mutation はこの iteration の contract instance だけに影響する。**State setup + property assertion = 1 iteration、isolation が leak を防ぐ。**
6. **\`expectRevert\` なし。** これは positive-path fuzz test だ。overflow case を test しているのではない (それは L1 の仕事だった)。Overflow が起きない *とき* に保存則が成立することを test している。**Property 1 つにつき 1 つの test、test 1 つにつき 1 つの property。**

走らせる:

\`\`\`bash
forge test -vvv
\`\`\`

期待される出力:

\`\`\`
[PASS] testFuzz_IncrementPreservesPlusOne(uint256) (runs: 1000, μ: 36000, ~: 36000)
[PASS] testFuzz_SetNumber(uint256) (runs: 1000, μ: 31000, ~: 31161)
[PASS] test_Increment() (gas: 31303)
[PASS] test_RevertWhen_DecrementBelowZero() (gas: 8957)

Suite result: ok. 4 passed; 0 failed; 0 skipped
\`\`\`

**4 test、すべて 1000 iteration で green。** 新規 fuzz test は iteration count によらず ~50ms で走る。各 iteration が cheap だからだ。

> ⚠️ **\`vm.assume\` の罠: 緩いフィルタを書け、ピンポイントなフィルタを書くな。** 良い \`vm.assume(x < type(uint256).max)\` のような predicate は $2^{256}$ 空間から *1 つの* 値だけを除外する。fuzzer はほぼ常に valid な入力を得る。一方で \`vm.assume(x == 42)\` のような「特定のピンポイント値を期待する」predicate を書くと、fuzzer が $2^{256}$ から偶然 \`42\` を引く確率は実質ゼロで、\`max_test_rejects\` (デフォルト 65536) を使い切って \`TooManyAssumptions\` で自爆する。**経験則: \`vm.assume\` は入力空間のごく一部 (典型的には < 1%) しか除外しないときだけ使う。pinpoint な値を test したいなら、それは fuzz test ではなく unit test だ。**

### Step 4: Test を意図的に壊して shrinker を見る

Shrinking をデモするため、property を意図的に壊す。Assertion を次のように変更:

\`\`\`solidity
assertEq(counter.number(), x + 2);  // 誤り: x + 1 のはず
\`\`\`

\`forge test -vvv\` を走らせる:

\`\`\`
[FAIL: assertion failed: ... ≠ ...]
testFuzz_IncrementPreservesPlusOne(uint256) (runs: 1, μ: ...)
counterexample: args=[0]
\`\`\`

**注目: \`args=[0]\`。** Shrinker が、最初に失敗した 32-byte 値が何であれ、最小の \`0\` まで reduce した。最初の失敗 iteration はおそらく \`x = 0xa3b8_f4c2_...\` (ランダムな巨大な数) だったが、shrinker は \`0\` も失敗する ($\\text{number} = 0 + 1 = 1 \\neq 2$) と気づき、最小ケースを報告した。

Shrinking を見たことがなければ、bug は特定の大きな入力でしか trigger しないと想定するかもしれない。Shrinking が入れば *すべての* 入力が失敗するとすぐ分かる。bug は contract ではなく assertion にある。

**続行する前に assertion を \`x + 1\` に戻す。**

\`\`\`solidity
assertEq(counter.number(), x + 1);  // 復元
\`\`\`

\`forge test\` を再実行。4 test 全部 green に戻る。

### Step 5: Corpus ディレクトリを見る

Foundry は失敗入力を \`cache/fuzz/\` に persist する。上記の deliberate-break-and-revert の後、見る:

\`\`\`bash
ls cache/fuzz/
\`\`\`

Test signature にちなんで名付けられたディレクトリが見えるはず。各ファイルが過去 run からの失敗入力を保持する。次に \`forge test\` を走らせるとき、Foundry は新しいランダム値を生成する *前に* それらの persist された入力に対して即座に re-run する。

つまり: **bug を直して再度壊した場合、test が同じ counterexample で即座に失敗する。fuzzer が再発見するのを待たない。** これが corpus persistence パターンで、Rust の \`proptest\` の \`proptest-regressions/\` ファイルと同じ。

\`\`\`bash
# 意図的な break + revert で counterexample を persist する:
# (上の bad assertion run がすでにやった)
ls cache/fuzz/
# → ディレクトリが testFuzz_IncrementPreservesPlusOne を壊した seed を保持
\`\`\`

\`cache/fuzz/\` は gitignore できる (\`forge init\` がデフォルトでそうする) し、commit もできる。Commit する理由はこう。以前 code を壊した counterexample が test suite に永遠に残り、regression が即座に catch される。**Production codebase によっては \`cache/fuzz/\` を commit する。ほとんどはしない。Repo ごとに sides を選ぶ。**

### Step 6: CI profile で走らせる

\`\`\`bash
FOUNDRY_PROFILE=ci forge test
\`\`\`

これが \`fuzz.runs = 100000\` (Step 1 で追加した profile) で走らせる。出力:

\`\`\`
[PASS] testFuzz_IncrementPreservesPlusOne(uint256) (runs: 100000, μ: 36000, ~: 36000)
[PASS] testFuzz_SetNumber(uint256) (runs: 100000, μ: 31000, ~: 31161)
...
\`\`\`

100 倍多い iteration。モダンハードウェアでは 2 つの fuzz test に対して ~10-20 秒。Production codebase で十数個の fuzz test があるなら nightly に走らせる。毎 PR ではない。**Profile を使って iteration count を環境に gate する。**

## エラー時にありがちなパターン

- **\`No tests to run\`** — test 関数にパラメータがないのに、名前が \`testFuzz_\` で始まっている。Foundry は non-fuzz test として扱う。\`uint256 x\` パラメータを追加するか、関数名を変える。
- **\`called \\\`Result::unwrap()\\\` on an \\\`Err\\\` value: TooManyAssumptions\`** — \`vm.assume\` が \`max_test_rejects\` を超える入力を reject した。Predicate が too restrictive。緩めるか test を再構成する。
- **\`counterexample: args=[...]\` に巨大な数が出る** — shrinker のヒントが効いていない。失敗が simple な入力 range に実際あるか確認する。なければ \`vm.assume\` が valid 入力を filter している可能性。
- **出力の \`[PASS]\` 行に \`runs: 1\`** — それは実際には pass ではない。\`forge fuzz\` が iteration 1 で counterexample を見つけ、shrinker が動いている。Full output で \`[FAIL]\` indicator を再読する。

## 設計の振り返り

\`forge fuzz\` の設計に焼き込んだ load-bearing な決定が 3 つ:

1. **\`@fuzz\` annotation ではなく parameter signature が fuzz signal。** \`forge test\` 自体と同じ convention-over-attribute 規律。**Foundry の testing surface は *naming* + *parameters* で scale する。markup ではない。Tooling が test 発見に syntax tree を必要としない。**

2. **\`vm.assume\` が fail ではなく filter する。** 代替は \`vm.requirePrecondition(cond)\` で、false なら iteration を *fail* させる形になる。Foundry は filter semantics を選んだ。理由は 3 つ。(a) ほとんどの precondition 違反は genuinely test したくない入力で、bug ではない、(b) それを test failure として扱うと CI がノイズで溢れる、(c) \`max_test_rejects\` がすでに、precondition が too restrictive で valid 入力を見つけられないケースを catch する。**\`vm.assume\` は「この入力は interesting でない」を言う、failure は「この property が壊れている」を言う。**

3. **Shrinking は per-parameter で局所的最適（Local）、大域的最適（Global）ではない。** \`(uint256 a, uint256 b)\` を取る multi-parameter test は \`a\` を \`b\` と独立に shrink する。これは cross-parameter optimality を runtime speed と引き換えにする決定だ。実務的には、single-axis minimal counterexample が debugging の 95% で十分。**ヒューリスティックな局所的最適 shrinking は、入力空間が 64+ バイトのとき exhaustive な大域的最適 shrinking に勝つ。**

## 答え合わせ

L2 の後:

\`\`\`
   my-foundry-lab/
   ├── foundry.toml         (+ [fuzz] runs = 1000、+ [profile.ci.fuzz] runs = 100000)
   ├── src/Counter.sol       (L1 から変更なし)
   ├── test/Counter.t.sol    (+ testFuzz_IncrementPreservesPlusOne)
   └── lib/forge-std/        (変更なし)
\`\`\`

L2 の後:
- \`forge test\` が 1000 iteration で 4 test を pass する
- \`FOUNDRY_PROFILE=ci forge test\` が 100,000 iteration で 4 test を pass する
- Shrinker が失敗 counterexample を minimal form に reduce するのを見た
- \`cache/fuzz/\` が失敗を persist して即座に replay できるのを見た

## よくある質問

**Q1: なぜ \`fuzz.runs\` デフォルトが 256 より高くないのか? Iteration が多い方が strictly better では?**

256 が *ローカル開発* の速度-vs-カバレッジ sweet spot (test 1 つあたり sub-second feedback) だからだ。Production codebase は CI で bump する。時間予算があるからだ。ローカル開発は tight に保つ必要がある。**256 は inner loop 用、10_000-100_000 は outer loop 用。**

**Q2: なぜ \`forge fuzz\` は exhaustive search ではなくランダム入力生成を使うのか?**

\`uint256\` の入力空間が $2^{256} \\approx 10^{77}$ 値だからだ。exhaustive は不可能。良い分布のランダムサンプリングが *interesting* な領域 ($0$ 周辺、$1$、\`type(uint256).max\`、$2^N$ 境界、...) で counterexample を見つける。Foundry の input generator が edge value に slight bias をかけるおかげだ。**$2^{256}$ 上の pure-random はすべての edge case を miss する。Biased-random + shrinking が hit する。**

**Q3: 状態変更する関数すべてに対応する fuzz test が必要か?**

理想的には yes。state を mutate する external function はすべて、関連する invariant を証明する fuzz test を少なくとも 1 つ持つべきだ。実務的には優先順位を付ける。算術 (overflow boundary)、access control (caller check)、保存則を持つ関数 (deposit/withdraw、mint/burn)。**行ではなく property の fuzz coverage を目指す。**

**Q4: \`forge fuzz\` は \`forge invariant\` (L3) とどう違うのか?**

\`forge fuzz\` は single-call: 各 iteration が *1 つ* の関数をランダムパラメータで呼び、assertion を check する。\`forge invariant\` (L3) は multi-call: 各 iteration が *多くの* 関数をランダム系列で呼び、各 call 後に invariant を check する。**Fuzz は 1 関数を isolation で test、invariant は関数 call の系列を test。両方とも property test だが、粒度が違う。**

**Q5: Fuzz test が内部で \`vm.assume\` を呼ぶ関数を call したらどうなるか?**

\`vm.assume\` はどこから呼んでも動く。fuzz test から呼ばれた別の関数の中にネストされていても、だ。最初の \`vm.assume(false)\` が call 深さに関係なく iteration を discard する。**Composability が cheatcode モデルに組み込まれている。**

**Q6: Shrinking は \`bytes\` と \`string\` パラメータでも動くか?**

Yes。\`bytes\` には shrinker が短いスライスを試す。\`string\` には短い文字列 + simpler な文字セットを試す。両方とも動くが、\`uint256\` shrinking より遅い (各 shrinking step がより長い比較を要するため)。**\`bytes\`/\`string\` fuzz test を shrink が遅いという理由だけで避けない。Shrinker は依然動く。wall-clock 秒数が多くかかるだけだ。**

## 次のレッスン (L3) — \`forge invariant\` — multi-call invariant testing

L3 が single-call fuzz testing から *multi-call invariant testing* に graduate する。openhl-liquidation L13 の per-scan 保存則に最も近い Solidity primitive だ。

Key concept: \`Handler\` contract を定義する。その関数が「システムができること」(deposit、withdraw、increment 等) を表す。Foundry に「この Handler を fuzz する surface area として扱え」と告げる。Foundry はランダムなメソッド call *系列* を生成し (\`deposit(100), withdraw(50), increment(), withdraw(75)\`)、各 step 後に \`invariant_*\` 関数を check する。

これが single-call fuzzing が決して見ない multi-call bug を catch する。token-balance reentrancy、ordering-dependent な state corruption、Mt. Gox をスローモーションでクラッシュさせたタイプの bug。**L3 は \`forge\` が単なるパラメータ生成器ではなく、real な adversary になる場所だ。**
`,
                },
                {
                  title: "レッスン 3 — forge invariant — Handler パターンによる multi-call invariant testing",
                  slug: "foundry-forge-invariant-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン 3 — \`forge invariant\` — Handler パターンによる multi-call invariant testing

## ゴール

このレッスンで掴む概念:

- **\`forge invariant\` は、fuzz testing を 1 call から call の *系列* へと格上げする。** \`forge fuzz\` (L2) は各 iteration で 1 つの関数をランダム parameter で呼び、property を assert する。\`forge invariant\` は method call の *ランダム系列* — \`increment, increment, setNumber(0), increment, increment\` — を生成し、系列の各 step 後に *すべての* \`invariant_*\` 関数を再 check する。これが、特定の *順序* で初めて顔を出すバグを catch する。token-balance reentrancy、withdraw-during-deposit のレース、1 call は survive するが 2 call 後に壊れる ghost-state divergence。Single-call の系譜ではこれらは見えない。**L2 は単一入力で存在するバグを見つけた。L3 は履歴を必要とするバグを見つける。**
- **Handler は、target contract に対する「test 制御の API surface area」ラッパーだ。** \`forge invariant\` を target contract に直接向けることは普通しない。代わりに Handler contract に向ける。Handler は target の method を wrap し、入力を bound し（例: \`bound(amount, 1, target.balance())\`）、ghost variable（invariant が比較するための mirror state）を track する \`public\` method を一握り公開する。Foundry はその Handler の method をランダムに呼ぶのであって、target の method を直接呼ぶのではない。一見、冗長な手続き（Ceremony）に思えるが、これが load-bearing な問題を解く。target contract の大半は「ランダム parameter だと precondition を即座に violate する」method を持つ（\`withdraw(uint256)\` に \`uint256 > balance\` を渡すなど）。直接 fuzz すると iteration の大半が \`vm.assume\` rejection で無駄になる。Handler は入力を意味ある range に clip するので、iteration の 100% が target を exercise する。**Handler なしの \`forge invariant\` は iteration の大半をナンセンス拒否で消費する。Handler ありなら、各 iteration が真の adversary move になる。**
- **\`invariant_*\` 関数は、*系列の各 call 後に* 成立すべき保存則（Conservation law）を名指す。** \`test_\` / \`testFuzz_\` と同じ prefix 規律で \`invariant_\` を使う。Body は何が起きようと成立するべき equality か bound を assert する。古典的な例は \`balance + sum_of_withdrawals == sum_of_deposits\`。どんな deposit/withdraw 系列でも成立する保存則だ。これは openhl-liquidation L13 の \`before + deposits - withdrawals == after\` per-scan proptest と *まったく同じ* 形状。**\`invariant_*\` は Rust で使った保存則規律の Solidity bindings。構文は \`assertEq(handler.ghostSum(), target.actualBalance())\`。**
- **Invariant が失敗すると、反例（Counterexample）は単一入力ではなく call 系列全体になる。** \`forge fuzz\` の counterexample は \`args=[5]\`。\`forge invariant\` は \`deposit(100), withdraw(50), increment(), withdraw(75)\` という *trace* を報告し、どの call がどの invariant を壊したかを教える。Shrinker は *系列を* reduce する。load-bearing でない call を drop し、残る引数値を半分にし、invariant をまだ違反する最小長・最小値の call 系列に到達するまで続ける。**200-call 反例が 3 calls まで縮む。それなら debug できる。Sequence shrinking がなければ、invariant testing は読めない失敗を吐き出すだけだ。**

確認:

\`\`\`bash
forge test --match-test invariant
\`\`\`

…で新しい invariant suite が走り、\`(runs: <N>, calls: <M>, reverts: <R>)\` を報告する。本レッスン完走後はこれらを手にする。Counter を wrap する Handler、何千ものランダム call 系列にわたって成立する \`invariant_NumberEqualsIncrementCount\`、そして意図的に壊して call-sequence 反例を観察した経験。

具体的な変更:

- **\`foundry.toml\`** — \`[invariant]\` profile セクションを追加し、\`runs\`、\`depth\`（run あたりの call 数）、\`fail_on_revert\` を設定する。
- **\`test/CounterHandler.sol\`** — 新規ファイル。\`wrappedIncrement()\` と（後で）\`wrappedSetNumber(uint256)\` を ghost-variable tracking 付きで公開する Handler contract。
- **\`test/Counter.invariant.t.sol\`** — 新規ファイル。Handler を \`targetContract(...)\` に wire し、\`invariant_*\` 関数を宣言する invariant test contract。

合計で約 50 行の新規コードを 2 つの新規 test ファイルにまたがって書く。L3 の主題は *Handler パターンを理解すること* であって、賢い invariant 算術ではない。

## おさらい

L2 の後はこうなっている。
- \`forge fuzz\` が 1 つの test 関数を 256+ iteration、ランダム parameter で走らせる。
- \`vm.assume\` は precondition を filter し、\`vm.expectRevert\` は negative-path test のためのもので、目的は真逆。
- Shrinker が 32-byte の失敗入力を minimal counterexample まで reduce する。\`cache/fuzz/\` がそれらを persist する。
- \`testFuzz_IncrementPreservesPlusOne\` を書いた。1 call の保存則 property だ。

L3 はその保存則 property を call の *系列* で走らせる。同じ定理、より深い adversary だ。

## 計画

編集は 5 つ、2 つの新規ファイルにまたがる。

1. **\`foundry.toml\` に \`[invariant]\` config を追加** — \`runs = 256\`、\`depth = 50\` (run あたり 50 ランダム call)、\`fail_on_revert = false\`。Invariant testing における「run」が何を意味するかを定義する。
2. **\`test/CounterHandler.sol\` を作る** — \`Counter\` instance を保持し、\`ghostIncrementCount\` 変数を lockstep で bump する \`wrappedIncrement()\` を公開する。後で reset を track する \`wrappedSetNumber(uint256)\` も追加する。
3. **\`test/Counter.invariant.t.sol\` を作る** — \`Test\` を継承し、\`CounterHandler\` をインスタンス化し、\`targetContract(...)\` で登録、\`counter.number() == handler.ghostIncrementCount()\` を assert する \`invariant_NumberEqualsIncrementCount\` を宣言する。
4. **\`forge test --match-contract CounterInvariantTest -vvv\` を走らせる** — \`(runs: 256, calls: 12800, reverts: 0)\` を観察し、何千ものランダム系列を超えて invariant が成立し続けるのを見る。
5. **\`setNumber\` を ghost 更新なしで公開して意図的に壊す** — \`wrappedIncrement(), wrappedIncrement(), badSetNumber(0), wrappedIncrement()\` のような multi-call counterexample を Foundry が生成するのを観察する。

> 🛑 **予測。** 続きを読む前に: openhl-liquidation L13 の cascade-conservation proptest は、insurance fund に適用される operation 系列にわたって \`before_balance + sum(deposits) - sum(withdrawals) == after_balance\` を assert する。この test を \`InsuranceFund.sol\` contract に対する \`forge invariant\` へ port するとき、Handler は ghost variable として何を track する必要があり、\`invariant_*\` 関数は何を assert する?

(答え: **Handler は \`ghostSumDeposits\` と \`ghostSumWithdrawals\` の両方を track する必要がある。** どちらも \`wrappedDeposit(uint256)\` と \`wrappedWithdraw(uint256)\` の内部で増分する。構築時に 1 回 capture される \`ghostInitialBalance\` も必要。Invariant は \`target.balance() == handler.ghostInitialBalance() + handler.ghostSumDeposits() - handler.ghostSumWithdrawals()\` を assert する。L13 proptest と *まったく同じ* 算術形状だ。同じ定理、2 言語。本コースの L6 capstone がまさに openhl-liquidation Stage 10b の \`InsuranceFund\` についてこの port を行う。)

## \`forge invariant\` が \`forge fuzz\` とどう違うか

\`\`\`mermaid
flowchart TD
    A[1. ランダムな Handler メソッドを選択] --> B[2. 宣言済み bound 内でランダム引数を選択]
    B --> C[3. Handler メソッドを呼び出し<br/>target を駆動しゴースト変数を更新]
    C --> D{4. 呼び出しがリバートした?}
    D -->|yes, かつ fail_on_revert=true| F[FAIL: 系列全体を反例として登録]
    D -->|yes, かつ fail_on_revert=false| E[5. すべての invariant_* 関数を評価]
    D -->|no| E
    E -->|インバリアント違反発生| F
    E -->|すべての保存則が成立| G{6. Depth 上限に到達?}
    G -->|no| A
    G -->|yes| H[Run 完了: setUp をリセットし次の Run へ]
    F -.->|系列シュリンカーがトレースを圧縮| I[最小化されたコール系列を報告]
\`\`\`

Loop で押さえる点が 5 つ。

1. **2 つのネストしたランダム軸がある。method 選択と parameter 選択だ。** L2 の \`forge fuzz\` は軸が 1 つ。固定された test 関数があり、parameter を選ぶだけ。L3 の \`forge invariant\` は軸が 2 つ。各 step で *どの* Handler method を呼ぶかと、その parameter を選ぶ。探索空間は \`(num_methods × param_space)^depth\`。Depth 50 で 3 つの method、32-byte parameter なら \`(3 × 2^256)^50\`。総当たり（Exhaustive）など到底不可能であり、biased random + shrinking だけが頼みの綱。**この組み合わせ爆発こそが Handler-bounded inputs が重要な理由だ。Precondition 違反に費やす iteration は、真の adversary move に費やさない iteration だ。**
2. **\`fail_on_revert\` が test の strict 度合いを制御する dial。** \`fail_on_revert = true\` のとき、Handler call からの *任意の* revert が run を失敗させる。Handler は target を panic させてはならない、という strict mode で、Handler が無効入力を素通りさせるバグを catch する。\`fail_on_revert = false\` のとき、revert は許容され、invariant 違反だけが run を失敗させる。Handler を iterate している間の緩い default だ。**まず \`fail_on_revert = false\` で始める。Handler が tight になったら \`true\` に flip して、Handler が許した入力で target が panic するバグを catch する。**
3. **Invariant は終わりだけでなく *毎 call 後に* check される。** これが L2 の per-iteration assertion の multi-call 等価物だ。\`total >= 0\` invariant が call 1 と call 3 の後では成立するが call 2 の後に壊れる場合、失敗は call 2 で検出される。「いつか気づく」ではない。これが invariant testing を「self-heal する一過性の inconsistency」を catch するのに有用にする所以だ。**一貫した 2 つの状態の間で 1 call の間だけ存在するバグは、single-call fuzzing には絶対に見えない種類だ。**
4. **\`depth\` parameter が coverage と実行時間を trade off する。** \`depth = 50\` は各 run が 50 ランダム call を行う。\`runs = 256\` はその run が 256 回起きる。1 回の \`forge test\` invocation あたりの total call は \`runs × depth = 12,800\`。各 call が setUp、method 選択、parameter 選択、Handler 呼び出し、invariant check を走らせる。Depth 50 で typical run は ~100ms、depth 500 で ~1s。**Depth を増やす = 順序バグを catch しやすい。Runs を増やす = 初期状態への sensitivity を catch しやすい。\`fuzz.runs\` と同じく、環境ごとに両方を tune する。**
5. **Sequence shrinking が killer feature だ。** Invariant が 50-call 系列の後で失敗するとき、生の失敗は読めない。Shrinker は個々の call を drop してみる。call #23 なしでも invariant はまだ失敗するか。call #7 なしでも。そうやって系列を、失敗をまだ trigger する最小 subset まで reduce する。報告される counterexample はしばしば 2–5 calls。失敗が call 47 で発見されたとしてもだ。**Sequence shrinking なしでは、invariant testing は debug できない失敗を吐く。**

## Handler パターンを 1 段落で

Handler とは、target の *test 制御の API surface* となることを仕事にした contract だ。target への参照を保持し、target の method を wrap する \`public\` method を一握り公開する。それらの method の入力を *bound* し（例: \`bound(amount, 1, target.balance())\`）、invariant が期待する conceptual state を mirror する *ゴースト変数（Ghost variables）* を更新する。Foundry の invariant runner はランダムな Handler method をランダム parameter で呼ぶ。Handler は 3 つを決める。どの parameter 値が sensible か（balance を超える withdraw はしない）、何が起きたかをどう数えるか（ghost-variable accumulator）、何を無視するか（fuzz したくない method はそもそも公開しない）。\`invariant_*\` 関数は Handler の ghost state を target の actual state と比較する。一致しなければバグだ。**Handler はあなたの「シャドウ仕様（Shadow Specification）」だ。Solidity で書かれ、test 対象の contract と並走して実行される。**

## 手を動かす walk-through

### Step 1: \`foundry.toml\` に \`[invariant]\` を設定する

\`foundry.toml\` に追記:

\`\`\`toml
[invariant]
runs = 256
depth = 50
fail_on_revert = false
call_override = false
\`\`\`

押さえる点が 4 つ。

1. **\`runs = 256\` は \`fuzz.runs\` default と同じ** — 同じ「試行回数」概念だ。各 run は fresh な \`setUp()\` の後に \`depth\` 回のランダム call。Production CI はこれを \`1000\` 以上まで bump する。
2. **\`depth = 50\` は run あたり 50 ランダム Handler call を意味する。** これが各 run が call-history 空間にどれだけ深く分け入るかだ。Newer Foundry の default は 500。50 は学習中の小さく速い値だ。Handler が正しくなったら 500 まで bump して real な adversary coverage を得る。
3. **\`fail_on_revert = false\`** は Handler method が revert しても run を失敗させない。Iterate 中は便利だ。Handler 内部で \`try/catch\` を使って expected revert を飲み込める。Production codebase は Handler が tight になったら \`true\` に flip する。その時点で revert があれば Handler が入力 bounding に失敗した signal だからだ。**開発中は \`false\`、証明には \`true\`。**
4. **\`call_override = false\`** は Foundry が call ごとに \`msg.sender\` を override できるかを制御する。L3 では \`false\` のまま。\`msg.sender\` 操作は L4 で \`vm.prank\` 経由で見る。

### Step 2: \`test/CounterHandler.sol\` を書く

\`test/CounterHandler.sol\` を作る:

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

押さえる点が 4 つ。

1. **Handler は普通の Solidity contract で、test contract ではない。** 何も継承しない。\`Test\` も \`forge-std\` もなし。State (\`counter\`, \`ghostIncrementCount\`) を保持し、method を公開するだけだ。Foundry の invariant runner は \`targetContract(...)\` 経由でそれを発見する（次の step）。**Handler は plain Solidity。Invariant runner は discovery layer だ。**
2. **\`ghostIncrementCount\` は ghost 変数だ。** *これまでの call から* target の state がこうあるべきだと予想する値を mirror する。Invariant test は \`counter.number() == handler.ghostIncrementCount()\` を assert する。将来 \`Counter.increment()\` の code 変更で誤って double-increment するようになれば、この Handler はそれを catch する。\`ghostIncrementCount\` と \`counter.number()\` が乖離するからだ。**Ghost 変数は test の「shadow specification」だ。Contract が何をするかとは別に、我々が何を期待しているか。**
3. **\`wrappedIncrement()\` は lockstep で 2 つのことをする。target を呼び、ghost を更新する。** これが load-bearing 規律だ。Ghost を更新せずに target を呼ぶと、次の invariant check で失敗する（actual が expected と乖離するから）。Target を呼ばずに ghost を更新しても失敗する。Wrapper が「target は X をした」と「ghost は X を track した」の 1:1 binding を強制する。**Handler method こそが、target action と ghost update が atomic に起きる場所だ。**
4. **Handler は \`setNumber\` を公開していない** — まだ、だ。我々は invariant を簡単に表現できる *1 つの* operation だけを公開する Handler から始める (\`number == count\`)。Handler が method を公開しなければ、invariant runner はそれを呼べない。Invariant を壊す method は単に省くという選択をしているのだ。**Handler が公開する surface ≠ target の full surface。Invariant を書ける範囲だけを公開する。**

### Step 3: \`test/Counter.invariant.t.sol\` を書く

\`test/Counter.invariant.t.sol\` を作る:

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

押さえる点が 5 つ。

1. **\`setUp()\` は call ごとではなく *run ごと* に走る。** 各 run の内部では、同じ \`counter\` と \`handler\` instance が 50 call すべてにわたって再利用される。それが state が系列にわたって蓄積する仕組みだ。Run 間では fresh instance。**L2 の per-iteration isolation と同じ規律だが、外側のループで起きる。**
2. **\`targetContract(address(handler))\` が Foundry にどこを fuzz するか教える。** これがないと、Foundry は到達できる *すべての* contract の method を呼ぼうとする。\`Counter\` も含めて直接、だ。Uncontrolled な \`counter.setNumber(x)\` call は ghost を bypass するから invariant を即座に壊す。\`targetContract\` 登録は探索を Handler の \`public\` method のみに scope する。**\`targetContract\` は invariant runner の discovery scope。何を登録するかで何が fuzz されるかをコントロールする。**
3. **\`invariant_NumberEqualsIncrementCount\` は \`view\` でマークされている。** State を変えず、ただ読んで assert するだけだ。Foundry は系列の各 Handler call 後にこれを呼ぶ。\`view\` を忘れても runner はそれでも呼ぶが gas コストが高くなる。\`view\` ならその call は事実上 free だ。**Performance のために invariant は \`view\` であるべき。Assertion の意味はどちらでも同じ。**
4. **関数名が \`invariant_\` で始まる。** \`test_\` や \`testFuzz_\` と同じ naming-convention discovery だ。Foundry の runner は \`invariant_*\` 関数を scan し、Handler call ごとに各 invariant を呼ぶ。1 つの test contract に複数の invariant を持てる。それらすべてが各 call 後に check される。**Test contract あたり複数 invariant = 複数の保存則を同時に check する。L13 の 4 つの独立した proptest と同じ構造だ。**
5. **Assertion は L1 と同じ \`assertEq\` だ。** 異質なものはない。invariant は単に常に成立するべき assertion。新規性は *いつ* check されるか（ランダム call ごと）であって、*何を* check するか（plain Solidity の equality）ではない。**\`forge invariant\` は新しい assertion vocabulary ではなく、discovery loop が違う \`forge fuzz\` だ。**

### Step 4: Invariant suite を走らせる

\`\`\`bash
forge test --match-contract CounterInvariantTest -vvv
\`\`\`

期待される出力:

\`\`\`
[PASS] invariant_NumberEqualsIncrementCount() (runs: 256, calls: 12800, reverts: 0)
\`\`\`

この行を注意深く読む。
- \`runs: 256\` — 別々の run の数 (\`[invariant] runs\` と一致)
- \`calls: 12800\` — 全 run にわたる total Handler call 数 (256 × 50 = 12800)
- \`reverts: 0\` — revert した call の数 (\`wrappedIncrement()\` は決して revert しないからゼロ)

**12,800 ランダム Handler call、invariant は毎回成立した。** 保存則 \`number == ghostIncrementCount\` が膨大なバリエーションの call 系列にわたって証明された。

### Step 5: 意図的に invariant を壊す

Sequence-counterexample ワークフローを見るため、ghost を bypass する Handler method を公開する。\`CounterHandler.sol\` に追記:

\`\`\`solidity
    function badSetNumber(uint256 x) public {
        // Intentionally wrong: updates the target without updating the ghost.
        // This breaks the invariant on purpose to demonstrate Foundry's
        // sequence-counterexample reporting.
        counter.setNumber(x);
    }
\`\`\`

再実行:

\`\`\`bash
forge test --match-contract CounterInvariantTest -vvv
\`\`\`

期待される出力:

\`\`\`
[FAIL: invariant_NumberEqualsIncrementCount persisted failure]
    Counter: 0x...
    Sequence (length: 2):
        sender=0x... addr=[CounterHandler]0x... calldata=badSetNumber(uint256), args=[42]
        sender=0x... addr=[CounterHandler]0x... calldata=wrappedIncrement(), args=[]
    Last invariant: invariant_NumberEqualsIncrementCount
\`\`\`

**報告された反例は、わずか 2 コールの系列にまで圧縮されている。** Foundry は最初におそらく ~30 ランダム call 後に失敗を見つけ、shrinker が reduce した。大半の call を drop し、\`badSetNumber(0xa3b8...)\` を \`badSetNumber(42)\` まで半分にし、最小失敗が ちょうど \`badSetNumber(42)\` の後に \`wrappedIncrement()\` を必要とすることを発見した。ここでの因果連鎖を call-by-call で追うと押さえどころが見える。\`badSetNumber(42)\` は *リバートせずに成功する* — \`counter.setNumber(42)\` は合法な操作で、ただ ghost を bypass するだけだ。\`fail_on_revert = false\` の設定により、Foundry はこの call 自体を問題視せず、state mutation を素通しさせる。結果、\`counter.number() = 42\` のまま \`ghostIncrementCount\` は \`0\` で取り残される。この時点で保存則はすでに崩壊しているが、invariant runner はまだそれを知らない。invariant は *次の* call が返ってきた後にだけ評価されるからだ。Foundry は次の Handler method に進み、\`wrappedIncrement()\` を呼び、その call が clean に返り、*そこで* \`invariant_NumberEqualsIncrementCount\` が走る: \`counter.number() == handler.ghostIncrementCount()\` → \`43 != 1\` → 失敗。Shrinker が 2 コール両方を残すのは、両者が組み合わさってこそ「乖離発生 → 評価点に到達」までの最短 trace を形成するからだ。

**続行する前に \`CounterHandler.sol\` から \`badSetNumber\` を削除する。** 保存則規律は、すべての Handler method が target と ghost を lockstep で更新する場合だけ成立する。

### Step 6: 適切に handle された \`wrappedSetNumber\` を追加する

今度は \`setNumber\` を *正しく* 公開する。ghost を一致させて更新することで、だ。\`CounterHandler.sol\` に追記:

\`\`\`solidity
    function wrappedSetNumber(uint256 newNumber) public {
        counter.setNumber(newNumber);
        // setNumber breaks the simple "number == incrementCount" relationship,
        // so we reset the ghost to match the new target value. The invariant
        // is now: "number equals the number we asked for, plus increments since."
        ghostIncrementCount = newNumber;
    }
\`\`\`

再実行:

\`\`\`bash
forge test --match-contract CounterInvariantTest -vvv
\`\`\`

期待される出力:

\`\`\`
[PASS] invariant_NumberEqualsIncrementCount() (runs: 256, calls: 12800, reverts: 0)
\`\`\`

**Invariant は再び成立する。** Foundry の runner は今、\`wrappedIncrement()\` と \`wrappedSetNumber(uint256)\` の call からランダムに選び、両 Handler method が ghost を lockstep で維持する。Invariant は同じ 1 行の \`assertEq\` だが、test surface area は広い。それでも invariant は 2 つの operation を混ぜた 12,800 のランダム系列にわたって成立する。

**これが L3 の punchline だ。** Invariant は Handler 媒介の mutation と保存則の間の *契約* だ。Handler method を ghost 更新なしで追加 → invariant 失敗。Ghost を正しく更新 → invariant がどんな unit test もカバーできない指数的に大きな系列空間にわたって成立する。

## よくある失敗パターン

- **\`fail_on_revert = true\` で Handler が revert する** — Handler method が target が扱えない入力を渡したことを意味する。Handler method 内部に入力 bounding (\`amount = bound(amount, 1, target.balance())\`) を追加する。
- **\`runs: 256, calls: 12800, reverts: 12000\`** — Handler call の大半が revert している。Handler の入力 bound が緩すぎるか、target の precondition がきつすぎるかのどちらかだ。Handler の \`bound(...)\` をきつくするか、\`fail_on_revert\` を緩めて iteration を生産的に保つ。
- **Invariant が *毎* run で即座に失敗する** — invariant が間違っている。contract ではない。Assertion の算術を check する。単一 call の manual test を走らせて期待通りに成立するか確認する。
- **Invariant が時々、長い系列の後でだけ失敗する** — これが *good* な種類の失敗だ。特定の call 順序が本物のバグを暴いている。Shrink された counterexample を使って、それを deterministic に再現する unit test を書く。

## 設計の振り返り

\`forge invariant\` の設計に焼き込んだ load-bearing な決定が 3 つ。

1. **Handler パターンは syntax ではなく convention だ。** Foundry は Handler を書くことを *要求* しない。\`targetContract(target)\` を直接呼んで target の method を raw に fuzz できる。だが *コミュニティが Handler に標準化した* のは、それが「すべての iteration が \`vm.assume\` rejection」問題を解くからだ。Convention は集合的実践によって enforce され、ツールによってではない。**Foundry が multi-call sequencing primitive を与え、Handler パターンはエコシステムがその上に重ねた規律だ。**

2. **Ghost 変数は target ではなく Handler に住む。** これは意図的だ。target は clean Solidity のまま、test infrastructure は test ディレクトリに住む。Target に ghost 変数があれば production bytecode を汚染し、gas コストを上げる。Ghost を Handler に置くことで、保存則規律は deploy 時に zero gas コストだ。**Test は production contract を testable にするために変更してはならない。Handler が test-only state を target state から isolate する。**

3. **Sequence shrinking は per-byte ではなく per-call だ。** Invariant が失敗すると、shrinker は *どの call を残すか* と *引数値を何にするか* を別の pass で reduce する。Call graph をランダムに mutate しようとはしない。系列を walk して「この call を drop できるか」、次に「この引数を shrink できるか」と問う。Foundry はこれを \`proptest\` の state-machine shrinking strategy から継承している。結果として、最小 counterexample は usually 2–5 calls、決して original の 30+ ではない。**Per-call shrinking が invariant testing を debuggable にする。なしでは誰も parse できない 50-call trace を吐く。**

## 答え合わせ

L3 の後:

\`\`\`
   my-foundry-lab/
   ├── foundry.toml                      (+ [invariant] セクション)
   ├── src/Counter.sol                    (L1 から変更なし)
   ├── test/Counter.t.sol                 (L2 から変更なし)
   ├── test/CounterHandler.sol            (新規 — wrappedIncrement + wrappedSetNumber を持つ Handler)
   ├── test/Counter.invariant.t.sol       (新規 — targetContract を持つ invariant test)
   └── lib/forge-std/                     (変更なし)
\`\`\`

L3 の後:
- \`forge test --match-contract CounterInvariantTest\` が \`(runs: 256, calls: 12800, reverts: 0)\` で pass する
- Multi-call counterexample 形式を見た (単一引数ではなく call の系列)
- Shrinker が 30+ call の失敗を 2-call minimal example まで reduce するのを見た
- Handler がなぜ存在するかを理解した。入力を bound して iteration を生産的にするためだ

## よくある質問

**Q1: なぜ target を直接 \`targetContract(address(counter))\` で呼ばないのか?**

呼べる。Trivial な contract には動く。だが precondition を持つ contract (\`withdraw(amount)\` が \`amount <= balance\` を要求するなど) にとって、ランダム \`uint256\` parameter は事実上すべての call で precondition を violate する。\`fail_on_revert = true\` なら test は即座に失敗する。\`fail_on_revert = false\` なら \`reverts: 12800\` と生産的な iteration ゼロを得る。Handler はその間に挟まる layer だ。ランダム入力を、target が実際に exercise できる *bound されて意味ある* 入力に変換する。**直接 fuzz は stateless または precondition-free な target に動く。Handler 媒介の fuzz はそれ以外のすべてに動く。**

**Q2: 1 つの test contract に複数の \`invariant_*\` 関数を持てる?**

Yes、持つべきだ。openhl-liquidation L13 capstone は 4 つの独立した invariant proptest を持ち、それぞれが異なる保存則を assert する。ここでも同じだ。各 \`invariant_*\` が 1 つの法則を check する。Foundry は各 call 後にそれらすべてを走らせる。3 つが pass して 1 つが失敗するなら、どの法則が壊れたかが分かる。これは bundle された 1 つの invariant よりずっと debug しやすい。**保存則 1 つにつき 1 つの invariant。Handler あたり複数の invariant が norm だ。**

**Q3: \`targetContract\` と \`targetSelector\` の違いは?**

\`targetContract(address)\` は Foundry に「この contract のすべての \`public\`/\`external\` method を fuzz しろ」と告げる。\`targetSelector(FuzzSelector({addr: address, selectors: [bytes4[]]}))\` はより細かい。「この contract のこれら特定の method *だけ* を fuzz しろ」だ。Fuzz したくない method を持つ Handler に使う (view-only ヘルパーなど、簡単に private にできない場合)。ほとんどの Handler には \`targetContract\` と慎重な \`public\`/\`internal\` 規律で十分。**\`targetContract\` から始める。Surgical scoping が必要になったら \`targetSelector\` を出す。**

**Q4: これは openhl-liquidation L13 の proptest とどう違う?**

L13 は Rust の \`proptest!\` macro と手書きの test を使い、insurance fund method を系列で呼んで保存則を assert する。Pattern は \`forge invariant\` がやることと同一だ。ランダム operation 系列、call ごとに assert する保存則。鍵となる違いはこれだ。\`forge invariant\` は sequencing + shrinking machinery を built-in として提供する (Handler と invariant だけ書く)。Rust では sequencing は通常自分で書くか \`proptest-state-machine\` を使う。Foundry の tooling は stateful testing でより turnkey、Rust の tooling はより細かい制御を与える。**同じ定理、Foundry の tooling が ceremony をより多く持ち上げる。**

**Q5: \`fail_on_revert = false\` のとき、Handler が正しいかどうやって分かる?**

\`reverts:\` カウンタを見る。12800 call のうち \`reverts: 12800\` なら、すべての Handler call が revert した。入力 bounding が壊れているサインだ。\`reverts: 30\` なら occasional な revert がある。これは usually 大丈夫 (一部の operation は特定の prior state を与えられたら自然に失敗する)。\`reverts: 0\` なら Handler は \`fail_on_revert = true\` に flip して strict な証明にできるくらい tight だ。**\`reverts:\` が Handler-quality dashboard。低い 1 桁台かゼロを目指す。**

**Q6: \`invariant_*\` 関数は setup 用に state を変更できる?**

No。\`view\` か \`pure\` でなければならない。Foundry は Handler call の間に呼ぶからだ。Invariant 内部の state mutation は test 系列を破壊する。Check 前に work が必要なら、Handler 内部か \`setUp()\` で行う。**Invariant は state の純粋な観察。決して mutate しない。**

## 次のレッスン (L4) — \`cast\` — Solidity CLI の swiss army knife

L4 が testing primitive を後にして、Foundry に同梱される CLI ツール \`cast\` を導入する。\`forge\` がビルドと test を行うのに対し、\`cast\` は chain と対話し、data を decode し、ABI encoding を terminal から計算する。HTTP の \`curl\` と同じワークフロー ergonomics だ。\`alloy\` (Reth と同様、\`cast\` の構築基盤) への cross-reference が、このレッスンを Rust エンジニアにとって「\`alloy::Provider\` を grok しているなら、cast の mental model はすでに知っている」という payoff にする。

学ぶこと:
- \`cast call\` で read-only contract query (view 関数の RPC 等価物)
- \`cast send\` で state-changing transaction (\`--rpc-url\` で mainnet/testnet/anvil を指す)
- script で calldata を扱うための \`cast abi-encode\` / \`cast abi-decode\`
- Chain introspection 用の \`cast block\` / \`cast tx\` / \`cast logs\`
- Full read-eval パターン: contract を書く → forge test → forked anvil に対して cast call を打って real state で挙動を検証する

L4 完走後は、Solidity script を書かずに shell loop からデプロイされた contract と対話できるようになる。EVM 用の \`curl\`+\`jq\` の CLI 等価物だ。
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
                  title: "レッスン 4 — cast — EVM の curl + jq",
                  slug: "foundry-cast-cli-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 4 — \`cast\` — EVM の \`curl\` + \`jq\`

## ゴール

このレッスンで掴む概念:

- **\`cast\` は \`alloy::Provider\` を terminal コマンドとして露出させたものだ。** すべての \`cast\` subcommand が \`alloy_provider::Provider\` の method に map する — rethlab の \`alloy-provider\` レッスンで Rust コードから呼んだのと同じ trait だ。\`cast call\` ↔ \`provider.call(...)\`、\`cast block\` ↔ \`provider.get_block(...)\`、\`cast send\` ↔ \`provider.send_transaction(...)\`。CLI は同じ Rust code path への thin な shell wrapper にすぎない。Rust で \`provider.call().await?\` をすでに書いたなら、新しいメンタルモデル（Mental model）は要らない。タイピングの筋肉記憶（Muscle memory）を更新するだけだ。**\`cast\` は alloy bindings + shell prompt。背後の RPC リクエストは同一だ。**
- **\`cast\` は *何を尋ねるか* と *どのチェーンに尋ねるか* を分離する。** どのコマンドも \`--rpc-url <URL>\` フラグを option として取り、ノードを指す。フラグなしなら \`cast\` は環境変数 \`$ETH_RPC_URL\` を使う。同じ \`cast call\` を mainnet、sepolia、ローカル anvil instance のいずれに対しても、フラグ 1 つ変えるだけで実行できる。コマンド自体は同一だ。**ターゲットチェーンは束縛（Binding）ではなく引数（Parameter）。** これが L1 エンジニアにとっての payoff だ。同じクエリが prod、staging、forked simulation を読む。置換 1 つで。
- **\`cast call\`（読み取り専用）と \`cast send\`（state-changing）の 2 つが 90% の時間使う動詞だ。** \`cast call\` は view / pure 関数を走らせるか、broadcast せずに transaction を simulate する。関数の return 値を raw bytes として（あるいは function signature を渡せば decoded で）返す。\`cast send\` は実際に transaction を broadcast する。\`--private-key\` を要求し、transaction hash を表示する。残りのコマンド (\`cast block\`、\`cast tx\`、\`cast logs\`、\`cast abi-encode\`、\`cast 4byte\`) は内省（Introspection）とデータ操作のツールだ。便利だが、load-bearing なペアは \`call\` と \`send\`。**Production debug の大半は forked anvil に対する \`cast call\`。Production deploy の大半は testnet に続いて mainnet への \`cast send\`。**
- **\`cast abi-encode\` / \`cast abi-decode\` がデータレイヤーのループを閉じる。** Calldata を手で構築する必要があるとき (\`cast send --create\` 用、multisig 提出用、Solidity script への埋め込み用)、\`cast abi-encode "transfer(address,uint256)" 0x... 1000\` がオンチェーンで送られる exact bytes を生成する。\`cast abi-decode\` は逆。calldata と function signature を与えると、type 付き引数を取り出す。これは \`forge\` の test runner が内部で使うのと *同じ* ABI 機構（ABI machinery）が CLI で露出されたものだ。**Calldata を手で debug したことがあるなら、\`cast abi-decode\` は何年も前に shell alias に入れておくべきだったツールだ。**

確認:

\`\`\`bash
cast --version
cast call --rpc-url https://ethereum.reth.rs/rpc \\
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 "totalSupply()(uint256)"
\`\`\`

…で Reth プロジェクトの public RPC 経由で real mainnet に対して走り、USDC の現在の total supply を返す（~12 桁の数字、6 桁 decimal 精度）。本レッスン完走後は次の 3 つを手にする。どの \`cast\` subcommand がどの alloy method に map するか、\`cast call\` と \`cast send\` のどちらに手を伸ばすべきか、calldata を必要に応じて手で組み立てる方法。

具体的な変更:

- **ソースファイル編集なし。** L4 はすべて CLI invocation。Mainnet に対して ~8 種類の \`cast\` コマンドを走らせ、（option として）ローカル anvil に対しても走らせる。
- **\`.env\`**（option）— \`ETH_RPC_URL=https://ethereum.reth.rs/rpc\` を設定して、毎コマンドに \`--rpc-url\` を渡すのを避けたいかもしれない。L5 で anvil を扱う際、terminal session ごとに \`ETH_RPC_URL\` を mainnet と forked anvil の間で切り替えるデモをする。

合計で Solidity ゼロ行。L4 は shell time。Pedagogical move は alloy-method ↔ cast-subcommand マッピングを内面化すること。次に Rust の \`Provider\` に手を伸ばすとき、まず \`cast\` に手を伸ばすようになる。

## おさらい

L3 の後はこうなっている。
- \`forge invariant\` が Handler に対してランダム call 系列を走らせ、毎 call 後に \`invariant_*\` を check する。
- Handler が target を wrap し、入力を bound し、ghost variable (shadow specification) を track する。
- Sequence shrinking が 30+ call の失敗を 2-call minimal counterexample まで reduce する。

L3 は \`test/\` ファイル内に住んだ。L4 は test ディレクトリを完全に離れる。\`cast\` は、deploy 済み contract、transaction hash、decode したい calldata があり、それを見るためだけに Solidity script を書きたくないときに手を伸ばすツールだ。**L1 エンジニアの debug ループは \`forge test\` だけではなく、\`forge test\` の後の \`cast call\` だ。**

## 計画

invocation のカテゴリが 5 つ。

1. **\`cast call\`** — terminal から mainnet state を読む。USDC の \`totalSupply()\` と既知 address の \`balanceOf(address)\` をクエリする。
2. **\`cast block\` / \`cast tx\`** — チェーン内省。最近の mainnet block を lookup する。Hash で特定 transaction を検査する。
3. **\`cast abi-encode\` / \`cast abi-decode\`** — calldata 操作。ERC-20 transfer call の bytes を構築する。Bytes を type 付き引数へ decode して戻す。
4. **\`cast 4byte\` / \`cast 4byte-decode\`** — function-selector lookup。Calldata の先頭 4 bytes を与えると、public な 4byte directory 経由で人間可読 function 名を見つける。
5. **ローカル anvil に対する \`cast send\`（preview）** — state-changing transaction。重要なものは deploy しない。この演習は \`cast send\` がチェーンとどう interact するかをデモする (L5 が anvil 自体を深掘りする)。

> 🛑 **予測。** 続きを読む前に: rethlab の \`alloy-provider\` レッスンで、\`eth_call\` semantics で構築した \`tx\` を使って (paraphrased) \`let supply = provider.call(&tx).await?\` と書いた。同じ結果を mainnet に対して生成する exact な \`cast\` invocation は何か?

(答え: **\`cast call --rpc-url <URL> <contract-address> "<function-signature>" [args...]\`**。各ピースが直接 map する。\`--rpc-url\` フラグは alloy の \`RootProvider\` の underlying transport URL。Contract address は transaction の \`to\` フィールド。Function signature は cast が内部で 4-byte selector に hash する人間可読 ABI 短縮形 (alloy が同じ \`Function::parse\` 機構を使う)。任意の args は positional。Return は raw hex (function signature の後に \`"(...returntypes)"\` で return type を指定しない限り)。指定すれば cast が decode する。**同じ code path、2 つの surface。プログラム用は Rust、shell 用は cast。**)

## \`cast\` が \`alloy::Provider\` にどう map するか

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

構造的に押さえるべきこと。\`cast\` ≈ \`alloy::Provider\`（RPC operation 用）、\`cast\` ≈ \`alloy_dyn_abi\`（ABI operation 用）。rethlab Fundamentals コースでこれら 2 つの crate を grok 済みなら、すべての \`cast\` subcommand が何をするかをすでに知っている。まだ引数構文を知らないだけだ。

## 手を動かす walk-through

### Step 1: 方角合わせ — \`cast --version\` と \`cast help\`

\`\`\`bash
cast --version
\`\`\`

\`forge\` version (両者は同じ \`foundry-rs/foundry\` バイナリ配布から船出する) と一致する \`cast Version: 1.7.x\` のような表示が見えるはず。

\`\`\`bash
cast help
\`\`\`

出力は subcommand のフラットなリスト。押さえる点が 3 つ。

1. **Subcommand は何に触るかでカテゴリ分けされている。** \`cast call\`、\`cast send\`、\`cast call --trace\` はチェーン state と interact する。\`cast abi-*\`、\`cast keccak\`、\`cast 4byte\` はローカルデータ操作ツール (RPC なし)。\`cast wallet\` は鍵を管理する。頭の中で bucket 分けする。*RPC コマンドは \`--rpc-url\` を要求する。ローカルコマンドはしない*。
2. **多くの subcommand に alias がある。** \`cast call\` は \`cast c\` でもある。\`cast send\` は \`cast s\` でもある。Interactive 利用では長形を打つ必要はない。Full name はスクリプトに現れる。
3. **\`cast help <subcommand>\`** が任意の subcommand の詳細フラグを与える。\`cast help call\` は \`cast call\` が受け付けるすべてのフラグを表示する (block tag、value、gas override 等)。**迷ったら docs を読むより \`cast help <subcommand>\` のほうが速い。**

### Step 2: \`cast call\` で mainnet state を読む

レッスン全体で使う public RPC endpoint: \`https://ethereum.reth.rs/rpc\`（Reth プロジェクトの public ノード — rethlab \`alloy-provider\` レッスンと同じもの）。

\`\`\`bash
cast call --rpc-url https://ethereum.reth.rs/rpc \\
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \\
  "totalSupply()(uint256)"
\`\`\`

これは mainnet 上の USDC contract address に対し、\`totalSupply()\` を呼び、cast に return を \`uint256\` として decode してくれと頼んでいる。

期待される出力:

\`\`\`
35234876543210000000  # 実際の数字は変わる。~350 億 USDC、6 桁 decimal 精度
\`\`\`

押さえる点が 6 つ。

1. **Function signature は 4-byte selector ではなく人間可読 Solidity 形式だ。** cast が内部で \`"totalSupply()(uint256)"\` を alloy と同じ parser で parse し、signature を keccak256 で hash し、先頭 4 bytes を取り、それを背後の \`eth_call\` における function selector として使う。**書くのは Solidity-ergonomic な構文、encode は cast がやる。**
2. **Function 名の後の \`(uint256)\` が return type の annotation だ。** これがないと cast は raw hex bytes (\`0x0000...\`) を表示する。あれば cast は return を \`uint256\` として decode し、decimal を表示する。複数 return の関数も同じパターンに従う — \`"slot0()(uint160,int24,uint16,uint16,uint16,uint8,bool)"\` は Uniswap V3 pool の slot0 signature で、cast は各 tuple 要素を 1 行ずつ表示する。Inline decode が exotic な signature で躓いた場合（稀だが起こり得る。動的配列を含む struct が典型）、安定したフォールバックは return-type annotation を完全に省き、生 hex を \`cast abi-decode "<full-signature>"\` にパイプすることだ。同じ parser を使うが、より permissive な context で走る。**実 production の signature の大半では inline 形式で動く。動かないときだけ \`cast abi-decode\` に手を伸ばす。**
3. **Private key 不要。** \`cast call\` は read-only。Broadcast せずノードの state view に対して実行する。これが production debug のワークホースだ。mainnet に対して任意の view 関数を 1 wei も使わずに simulate できる。
4. **\`--rpc-url\` は shell 環境の \`ETH_RPC_URL\` で代替できる。** \`export ETH_RPC_URL=https://ethereum.reth.rs/rpc\` を 1 回設定し、以降のコマンドからフラグを落とす。L5 で anvil を扱う際、terminal session ごとに \`ETH_RPC_URL\` を mainnet と forked anvil の間で切り替えるデモをする。
5. **出力 decimal は人間フォーマットされていない、raw integer だ。** USDC は decimal 6 桁。\`35,234,876,543,210,000,000\` raw は \`35,234,876,543,210.000000 USDC\` を意味する。cast は decimal scaling を適用しない。それは自分の仕事だ。あるいは \`cast --to-unit <value> ether\` で変換する (名前にもかかわらず、unit conversion は汎用)。
6. **\`cast call\` で使われる mainnet block は default ではチェーンの現在の head だ。** 特定 block に対して call するには \`--block <number-or-hash-or-tag>\` を追加する。過去 state の replay に便利。\`--block 12345678\` がその block 時点で \`totalSupply()\` が返したであろう値を simulate する。

もう 1 つ試す — 特定 address の USDC balance をクエリ:

\`\`\`bash
cast call --rpc-url https://ethereum.reth.rs/rpc \\
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \\
  "balanceOf(address)(uint256)" \\
  0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503  # 任意の mainnet address
\`\`\`

これが Rust の \`provider.call(USDC.balanceOf(addr).await?)\` の CLI 等価物だ。背後の RPC は同一、違うのはキーボード ergonomics だけ。

### Step 3: Block と transaction を検査する

現在の block を見る:

\`\`\`bash
cast block latest --rpc-url https://ethereum.reth.rs/rpc
\`\`\`

YAML-style な dump が見える: \`number\`、\`hash\`、\`parentHash\`、\`timestamp\`、\`gasLimit\`、\`gasUsed\`、\`baseFeePerGas\`、\`miner\`、full transactions list、withdrawals 等。Alloy の \`Block\` type が持つのと同じデータ構造、terminal 読み用にフォーマットされている。

\`\`\`bash
cast block 19000000 --rpc-url https://ethereum.reth.rs/rpc
\`\`\`

Number で lookup して過去 block を replay する。「contract X が block N でどんな state を持っていたか」を debug するときに有用。

特定 transaction を検査:

\`\`\`bash
cast tx 0xa84a9... --rpc-url https://ethereum.reth.rs/rpc  # 任意の real な mainnet tx hash
\`\`\`

Transaction の \`from\`、\`to\`、\`value\`、\`input\` (calldata)、\`gas\`、\`gasPrice\`、\`nonce\`、signature components を返す。**\`input\` フィールドこそが次に \`cast abi-decode\` を使いたくなる場所だ。**

Receipt — tx が mine されたとき実際に何が起きたか:

\`\`\`bash
cast receipt 0xa84a9... --rpc-url https://ethereum.reth.rs/rpc
\`\`\`

\`status\` (1 = success、0 = reverted)、\`gasUsed\`、emit された \`logs\` (events)、\`blockNumber\` 等を含む。**「deploy は成功したか」を debug するとき、\`cast send\` の後の最初のコマンドは \`cast receipt\`。**

### Step 4: \`cast abi-encode\` / \`cast abi-decode\` で calldata を操作する

ERC-20 \`transfer(address,uint256)\` call の calldata を構築:

\`\`\`bash
cast abi-encode "transfer(address,uint256)" \\
  0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503 \\
  1000000  # 1 USDC、6-decimal 精度
\`\`\`

出力 (call の実際の calldata bytes):

\`\`\`
0xa9059cbb00000000000000000000000047ac0fb4f2d84898e4d9e7b4dab3c24507a6d50300000000000000000000000000000000000000000000000000000000000f4240
\`\`\`

3 セクションを読む。
- \`0xa9059cbb\` — \`transfer(address,uint256)\` の 4-byte selector (signature の keccak256 の先頭 4 bytes)
- \`0000...0047ac...\` — 第 1 引数 (address)、32 bytes に padded
- \`0000...0f4240\` — 第 2 引数 (uint256 1,000,000 = 0xf4240)、32 bytes に padded

これが生 transaction の \`data\` フィールドに埋め込む exact な bytes。**Multisig 提案、governance calldata、external call を構築する必要のある Solidity script のために bytes を build する方法はこれだ。**

逆操作。calldata を与えて、type 付き引数を recover する。

\`\`\`bash
cast abi-decode "transfer(address,uint256)" \\
  0xa9059cbb00000000000000000000000047ac0fb4f2d84898e4d9e7b4dab3c24507a6d50300000000000000000000000000000000000000000000000000000000000f4240
\`\`\`

出力:

\`\`\`
0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503
1000000
\`\`\`

**\`abi-decode\` は、謎 calldata blob と function signature を持っているときに手を伸ばすツールだ。** Production debug の大半は「tx からの calldata がある、これが実際に何をするのか」。それこそが \`cast abi-decode\` が解く問題だ。

### Step 5: \`cast 4byte\` で function-selector lookup

時に calldata はあるが function signature を *知らない*。先頭 4 bytes が selector だ。cast が public directory (4byte.directory) をクエリして人間可読名を recover する。

\`\`\`bash
cast 4byte 0xa9059cbb
\`\`\`

出力:

\`\`\`
transfer(address,uint256)
\`\`\`

複数候補 signature が同じ 4 bytes に hash すれば、cast はすべてを列挙する。selector の衝突は存在する (production 関数では稀、obscure な関数では一般的)。**\`cast 4byte\` は unknown calldata に最初に走らせるコマンドで、その後に \`cast abi-decode\` を出す。**

Unknown-calldata の full な debug ループ。

\`\`\`bash
# Step 5a — 謎 calldata を与えて、function 名を見つける:
cast 4byte 0xa9059cbb
# → transfer(address,uint256)

# Step 5b — recover した signature を使って calldata を decode する:
cast abi-decode "transfer(address,uint256)" 0xa9059cbb...
# → 0x47ac... 1000000
\`\`\`

### Step 6: ローカル anvil に対する \`cast send\` の preview

\`cast send\` は \`cast call\` の state-changing なツインだ。Private key を要求し (あるいは wallet 管理コマンドの 1 つ)、transaction を broadcast し、結果の transaction hash を表示する。重要なものは実際には送らない (L5 が anvil と full なローカル開発ループを扱う)。だが構文は見ておく価値がある。

\`\`\`bash
# 別 terminal でローカル anvil を起動 (L5 が深掘りする):
#   anvil
# anvil は 10 個の funded test account とその private key を表示する。

# ローカル anvil に対して transaction を送る:
cast send --rpc-url http://localhost:8545 \\
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \\
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \\
  "transfer(address,uint256)" \\
  0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503 \\
  1000000
\`\`\`

押さえる点が 3 つ (走らせなくても見える)。

1. **\`cast call\` に対して \`--private-key\` だけが新しいフラグ。** 他はすべて同一だ。cast が key で transaction を sign し、RPC で broadcast し、hash を表示する。
2. **anvil の default private key \`0xac0974...\` は事前 fund 済みだ。** anvil が起動時に 10 個の deterministic account を seed する。毎回同じ private key、ローカル開発のみ safe。**anvil の default key を任意の real network に対して決して使うな。**
3. **出力は transaction hash。** それを \`cast receipt $tx\` に pipe する (hash を back-tick) と status、gas used、emit された logs が見える。2-step pattern は \`cast send\` → \`cast receipt\`。Alloy では \`provider.send_transaction(...).await?.get_receipt().await?\` をやるのと同じだ。

L5 (次のレッスン) が anvil に mainnet forking で戻る。そこで \`cast send\` が真に有用になる。real な mainnet transaction を forked state に対して、real ETH を使わずに simulate できる。

## よくある失敗パターン

- **\`error sending request for url\`** — \`--rpc-url\` が到達不可能。URL、自分のネットワーク、または別の public RPC (Cloudflare、Ankr 等) にフォールバックを check する。
- **\`Error: Wrong function selector ...\`** — 渡した function signature が contract と一致していない。Contract の実際の calldata に \`cast 4byte\` を使って正しい signature を recover するか、block explorer から contract の ABI を読む。
- **\`Error: missing field "input"\`** — 指している chain に存在しない transaction hash をクエリしている (例: testnet RPC に対して mainnet hash を使った)。Chain を検証する。
- **\`cast send\` が tx hash を返すが receipt は \`status: 0\` を表示する** — tx は mine されたが revert した。同じ calldata で \`cast call\` を走らせて revert reason を見る (cast call は broadcast せずに simulate し、revert message を表示する)。
- **\`Error: insufficient funds\`** — \`--private-key\` が target chain で ETH を持たない account を制御している。ローカル anvil なら anvil の seed 済み account を使う。Testnet なら faucet からリクエストする。

## 設計の振り返り

\`cast\` の設計に焼き込んだ load-bearing な決定が 3 つ。

1. **\`cast\` は背後で alloy を再利用する。別の JSON-RPC クライアントなし。** Foundry の \`cast\` バイナリは Reth が使うのと同じ \`alloy\` crate に link する。すべての \`cast\` invocation が、自分の Rust プログラムが歩むのと同じ code path を歩む。含意はこうだ。Reth が新しい RPC method (例えば新しい tracing endpoint) をサポートすれば、alloy version が bump された時点で \`cast\` はそれを無料で得る。**実装は 1 つ、surface は 2 つ。CLI は library と別に保守されていない。**

2. **Function signature は 4-byte selector ではなく人間可読だ。** cast は \`transfer(address,uint256)\` に対して \`0xa9059cbb\` を渡せと要求することもできた (Geth の \`eth_call\` は raw bytes を取る)。cast はどちらも受け付けるが、人間可読形式が documented default だ。規律はこうだ。*キーボード ergonomics が自分の書いた Solidity ソースと一致する*。**cast に打ち込むものが、Solidity に打ち込んだものと一致する。メンタルな翻訳ステップなし。**

3. **\`--rpc-url\` は session 単位ではなく command 単位だ。** 環境に \`ETH_RPC_URL\` を 1 回設定できるが、個々の \`cast\` invocation が inline でそれを上書きできる。これは deliberate に stateless。\`npm\` が \`npm config set registry\` で持つような「現在の chain」モードはない。理由はこうだ。chain mistake は破滅的だ (testnet を意図して mainnet に送る)。cast の設計はすべての state-changing コマンドで chain を可視に保つことを強制する。**ステートレス性（Statelessness）は usability の見落としではなく safety feature だ。**

## 答え合わせ

L4 の後、shell history はこんな具合に含む。

\`\`\`bash
# Mainnet を読む
cast call --rpc-url https://ethereum.reth.rs/rpc \\
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \\
  "totalSupply()(uint256)"

# Block を検査
cast block latest --rpc-url https://ethereum.reth.rs/rpc

# Calldata を build
cast abi-encode "transfer(address,uint256)" 0x... 1000000

# 謎 calldata を decode
cast 4byte 0xa9059cbb
cast abi-decode "transfer(address,uint256)" 0xa9059cbb...

# Option: ローカル anvil に対して送る
cast send --rpc-url http://localhost:8545 \\
  --private-key 0xac09... 0xA0b8... "transfer(address,uint256)" 0x47ac... 1000000
\`\`\`

L4 の後はこれができる。
- 任意の chain 上の任意の contract の任意の view 関数を terminal から読む
- Block explorer を開かずに block と transaction を検査する
- Multisig 提案、governance、scripts 用に calldata を build / decode する
- 4byte 経由で unknown function selector を lookup する
- ローカル anvil に対して transaction を送る (L5 で anvil を full に扱う)

## よくある質問

**Q1: Etherscan + ブラウザで同じことができるのに、なぜ \`cast\` を使うのか?**

理由は 3 つ。**(a) 合成可能性（Composability）** — \`cast\` の出力はプレインテキストなので、Unix のパイプライン思想そのままに \`jq\`、\`awk\`、\`xargs\`、\`grep\` へ直接流し込める。自動化スクリプトへの組み込みが容易だ。Etherscan の出力はブラウザの中だ。**(b) 再現性（Reproducibility）** — cast コマンドは単一の bash one-liner としてチーム内で共有できる。Etherscan ワークフローはランブックに paste できないクリックの連続だ。**(c) スピード** — ローカル Reth ノードに対する \`cast call\` は milliseconds で返る。Etherscan は rate limit 付きで重い Web ブラウザのロードを待たされる。1 時間に数十の view クエリを投げる L1 エンジニアには、思考の同期を保つために cast の 10×+ の速度差が死活問題だ。**Etherscan は一度きりの探索用、cast はそれ以外のすべてに。**

**Q2: \`cast\` はすべての JSON-RPC method を サポートする? それとも subset か?**

Subset だ。cast は ~30 の named subcommand を露出し、common method をカバーする。直接露出していないものには \`cast rpc <method> [params...]\` を使う。これが raw escape hatch だ。method 名と parameter を JSON-RPC リクエストとして送り、JSON response を表示する。**Typed wrapper なしで method を欲しいとき、alloy で \`provider.client().request::<...>()\` を使うのと同じパターンだ。**

**Q3: \`cast\` は \`cast send\` のために signed transaction をどう扱うのか?**

すべて client side で sign する。\`--private-key\` を渡すと、cast が client side で transaction を構築し、key (\`alloy_signer_local\` を使う) で sign し、*signed* な transaction を \`eth_sendRawTransaction\` 経由で submit する。Private key は machine を離れない。Hardware wallet ワークフローには \`--ledger\` か \`--trezor\` を代わりに使う。cast が同じ \`alloy_signer_*\` trait を歩む。**Signing はローカル、RPC が見るのは broadcast bytes だけ。**

**Q4: \`cast\` の代わりに \`alloy::Provider\` で Rust プログラムを書くべきはいつか?**

ワークフローが 3 コマンドより長く、bash を超える branching / loop / error handling を必要とするときだ。Rough rule。場当たり的クエリは \`cast\`、繰り返しのワークフローや CI で走るものは Rust + alloy。一度きりの deploy には \`cast send\` で十分。検証、role 設定、ownership 移譲、parameter 設定を必要とする deployment script なら Rust バイナリ (あるいは Foundry の \`script/\` ファイル、Solidity) を書く。**cast は 1 行 bash script までスケールする。alloy は deployment バイナリまでスケールする。**

**Q5: \`cast call\` で異なる \`msg.sender\` を持つ transaction を simulate できる?**

Yes。\`--from <address>\` フラグが transaction の見かけ上の sender を上書きする。Access-controlled 関数の test に有用だ。\`--from <owner-address>\` で owner が見るものを simulate できる。ただし注意。これは *simulated* な call だ。On-chain で address を impersonate するわけではない。Test 用に impersonation が必要なら、それは Solidity の \`vm.prank\` か、RPC 経由の \`anvil_impersonateAccount\` だ (L5 が両方を扱う)。**Simulation には cast call --from、Forked-chain testing には anvil_impersonateAccount。**

**Q6: \`cast\` は non-Ethereum な EVM チェーンで動くか?**

Yes。標準 JSON-RPC interface を喋るものなら何でも動く。Optimism、Arbitrum、Base、Polygon、BNB Chain、自分のカスタム L2 — すべて同一に動く。\`--rpc-url\` を正しい endpoint に向けるだけだ。例外は非標準 RPC method を持つ chain (Tron、NEAR、non-EVM Solana 等)。明らかに当てはまらない。**任意の EVM 互換 chain には cast がある。Non-EVM chain には chain 自身の tooling が要る。**

## 次のレッスン (L5) — \`anvil\` + cheatcodes — real な mainnet state でのローカル開発

L5 が最後の piece を wire する。\`anvil --fork-url\` 経由で *real な* mainnet state に対するローカル開発だ。学ぶこと。

- \`anvil --fork-url <mainnet-rpc>\` — 起動時に mainnet の現 state を mirror するローカル chain を立ち上げる
- anvil が seed する 10 個の funded test account と、なぜ deterministic か
- anvil 固有の RPC method: \`anvil_impersonateAccount\`、\`anvil_setBalance\`、\`anvil_mine\`、\`anvil_setStorageAt\`
- Foundry の \`vm.*\` cheatcode (L1–L3 test の) が anvil の RPC 等価物にどう map するか。同じ機構、違う surface
- Full なローカル開発ループ。\`anvil --fork-url\` → forked mainnet に対する \`cast send\` → 検証用の \`cast call\` → real ETH ゼロ消費

L5 完走後、laptop を離れずに real な mainnet state に対して開発できる。L5 がコースの test-discipline + CLI 部分を閉じる。L6 が capstone で、そこで openhl-liquidation Stage 10b の \`InsuranceFund\` を Solidity に port し、同じ 4 つの保存則を \`forge invariant\` で証明する。
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
