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
      duration: 75,
      xpReward: 170,
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

- **\`forge fuzz\` は別構文の \`proptest!\`。** 同じ theorem-first のマインドセット: assertion が *すべての valid な入力に対して* 成立するべきと書き（hand-picked example だけではなく）、runner に入力空間の counterexample を探させる。同じ shrinker が 32-byte の失敗入力を、bug を trigger する最小の \`uint256\` に reduce する。同じ corpus persistence が既知の counterexample を次回 run で即座に replay する。openhl-liquidation L9 で \`proptest! { #[test] fn balance_never_negative(...) { ... } }\` を書いたなら、\`testFuzz_*\` 関数の形はすでに知っている。Solidity が contract 構文で包むだけだ。
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

(答え: **ほとんどの production CI は \`10_000\` か \`100_000\` で回す**。Nightly fuzzer は \`1_000_000\` まで push する。トレードオフはこう。各 iteration が full test (setUp → call → assertion → state cleanup) を走らせる。256 iteration なら単一の fuzz test は ~50ms、100_000 で ~20 秒、1_000_000 で ~200 秒。100_000 を超えると diminishing returns が始まる。巨大な入力空間を exercise していない限り、だが。ほとんどの uint256 fuzz test には *de facto* 小さい interesting region があり、100_000 でそこに到達する。**High count は専用 nightly CI で、デフォルト count は PR CI で、低 count はローカル開発で。**)

## \`forge fuzz\` が実際に何をするか

\`\`\`mermaid
flowchart TD
    A[1. ランダムな uint256 生成] --> B[2. setUp 実行<br/>fresh な Counter, number = 0]
    B --> C[3. testFuzz_* x = generated 呼び出し]
    C --> D{4. vm.assume cond?}
    D -->|false: iteration discard| A
    D -->|true| E[5. assertion 実行<br/>assertEq / assertTrue / ...]
    E -->|PASS: loop back| A
    E -->|FAIL: shrinker trigger| F[次セクション]
    A -.->|fuzz.runs 回成功後| G[gas 統計 μ ~ 報告]
\`\`\`

Loop で押さえる点が 3 つ。

1. **\`setUp()\` が *毎* iteration 走る。** これが per-iteration state isolation。L1 の per-test isolation と同じ規律だが、より細かい粒度だ。失敗する iteration が次の iteration を poison できない。各 run は fresh。**Per-iteration isolation が fuzz failure を reproducible にする。**
2. **Fuzz test 内の \`vm.assume(cond)\` は、condition が false なら iteration を silently discard する。** Test を失敗させず、pass としてもカウントしない。新しい入力を生成するだけだ。これが入力 filtering メカニズム。**Precondition には \`vm.assume\`、negative-path test には \`vm.expectRevert\`。** 似て聞こえるが、逆のことをする。
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
2. **Shrinkage は per-parameter。** \`(uint256 a, uint256 b)\` を取る fuzz test は各パラメータを独立に shrink する。Foundry は \`a, b/2\` の後 \`a/2, b\` のような cross-product を試さない。1 つずつ shrink する。**Multi-parameter shrinking は global ではなく local。出力に現れる minimal counterexample は per-axis に局所的に minimal。**

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

1. **\`vm.assume(x < type(uint256).max)\` が、property が成立しない唯一の入力を filter する** — 最大値、\`x + 1\` が overflow する場所。Filter なしだと test は *正しく* その 1 つの入力で失敗する。Filter ありだと、test は *意味ある* 入力範囲で property を証明する。**\`vm.assume\` が、property が assert される regime を定義する。**
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

3. **Shrinking は per-parameter で局所的、global ではない。** \`(uint256 a, uint256 b)\` を取る multi-parameter test は \`a\` を \`b\` と独立に shrink する。これは cross-parameter optimality を runtime speed と引き換えにする決定だ。実務的には、single-axis minimal counterexample が debugging の 95% で十分。**ヒューリスティックな local shrinking は、入力空間が 64+ バイトのとき exhaustive global shrinking に勝つ。**

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
              ],
            },
          },
        ],
      },
    },
  });
}
