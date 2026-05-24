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
        "本コースは、rethlab の openhl 系コースで学んだ厳格テスト規律（proptest! による保存則、debug_assert! のルーティング契約、openhl SHA に対する Byte-for-byte の答え合わせ）を、Solidity コントラクトへ機械的に転送（Transfer）するための道具立てとして Foundry を教えます。\n\nすでに Rust で考える L1 / コントラクト / エンジン開発者を前提に、`forge test` の基本アサーションから、`forge fuzz`（Solidity 版 proptest!）、複数呼び出しに対する `forge invariant`、CLI ツールとしての `cast`、メインネット状態を再現する `anvil --fork-url` + cheatcodes までを 6 レッスンで網羅。Cheatcodes が「リモートノードに JSON-RPC で依頼する」のではなく「Revm を内側から hack する Magic Precompile」であるという正体まで掘り下げます。\n\nL6 Capstone では、openhl-liquidation Stage 10b の `InsuranceFund` を Rust から Solidity へポート（Port）。同じ 4 つの保存則 invariant を `forge invariant` で 10K iteration 走らせ、**同じ定理を 2 言語で機械的に証明する** ことで、規律が言語を超えて成立することを体感します。\n\n2026 年現在、Foundry の習得は本格的な L1 / インフラ開発における前提条件（Commodity Prerequisite）であり、もはや競争優位ではありません。本コースは「ツールの使い方」ではなく「すでに持っている規律を Solidity 側へ持ち込む方法」を教える、唯一のポジショニングを取ります。4 モジュール・7 レッスン、in-repo の `examples/foundry-capstone/` に答え合わせ実装が常駐します。",
      difficulty: "ADVANCED",
      duration: 40,
      xpReward: 100,
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

- **Foundry が Solidity ツール戦争に勝った理由**: Rust 製、single-binary、sub-second feedback、Revm を直接 embed する。その Revm こそ、openhl 系コースで内部を覗いてきた Revm そのものだ。
- **Hardhat / Truffle / Brownie が後退した理由**: JS ベース、遅い、EVM へのアクセスが embedded execution ではなく remote fork 経由で間接的だった。
- **\`forge fuzz\` と \`forge invariant\` が内部で実際にやっていること** — rethlab が openhl の \`crates/evm\` で教えているのと同じパターンで Revm を orchestrate し、それを Solidity 側の test として露出させているだけ。
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

1. **速度。** Foundry の test runner は Revm を直接 in-process で embed する。JS test runner と別プロセスの \`ganache\` / \`hardhat node\` をつなぐ IPC round-trip がない。Hardhat で 60 秒かかる 1000-test スイートが、\`forge test\` なら 2-3 秒で終わる。アーキテクチャ的な違い:

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
      │   │   │  test runner │     Revm の実行                │  │
      │   │   └──────────────┘     (同一プロセス)             │  │
      │   └─────────────────────────────────────────────────┘  │
      │            ↑ 呼び出しごとに ~µs、IPC なし、serialize なし│
      └─────────────────────────────────────────────────────────┘
   \`\`\`

   この 20-30× の高速化は optimization ではない — process boundary を取り除いた アーキテクチャ的な必然だ。
2. **Fuzzing が first-class primitive。** Hardhat では property-based testing は plugin 扱いだった。Foundry は built-in で出荷した — shrinking、corpus persistence、sequenced call 用の invariant testing 込みで。最も近い JS 等価物 (\`fast-check\` + Hardhat) は非自明な配線を要求する。
3. **Cheatcodes-as-precompiles。** Hardhat の \`evm_snapshot\` / \`evm_increaseTime\` は JSON-RPC method — リモートノードに state を変えるよう依頼する。Foundry の \`vm.warp\` / \`vm.deal\` / \`vm.prank\` はアドレス \`0x7109709ECfa91a80626fF3989D68f67F5b1DD12D\` の magic precompile への Solidity 呼び出し。これが **Revm の state を内側から hack する** — 同一プロセス、IPC なし、リモートノードへの信頼も不要。openhl Precompiles コース (Stage 9) を通った読者には、これは *Rust で学んだ「precompile-as-EVM-superpower」パターン* が Solidity 経由でテスト用に露出されたものだと分かる。速く、composable、何より contract と同じ Solidity ファイル内で testable。

**L1 エンジニアにとっての戦略的含意。** Reth / Revm / Alloy code を書いたり読んだりするなら（rethlab の既存フォーカス）、Foundry は別言語の wrapper を被った同じ toolchain だ。生態系を切り替えるのではない。同じ execution engine に第 2 の言語を足すだけだ。

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
[⠒] Compiling 27 files with Solc 0.8.28
[⠢] Solc 0.8.28 finished in 1.49s
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

押さえる点が 5 つ。

1. **\`pragma solidity ^0.8.28\`** — \`^\` は caret style version 制約 (Cargo と同じ構文) で、「0.8.28 以上、ただし 0.9 未満」を意味する。Solidity 0.8 が規律の境界線: built-in overflow check が導入された (\`SafeMath\` 不要)。これこそが後の \`test_RevertWhen_DecrementBelowZero\` test を可能にしている。
2. **\`uint256 public number\`** — \`public\` が getter 関数 (\`number()\`) を自動生成する。State variable 自体はコントラクト内部から直接書ける。外部からは自動生成された getter のみ呼び出せる。**Solidity は \`let pub\` と \`let pub fn ...()\` を 1 つの宣言に collapse する。**
3. **コンストラクタなし。** デフォルト初期化で \`number = 0\`。Rust の \`i64::default()\` と同じ default-zero semantics。
4. **\`setNumber\` と \`increment\` は \`public\`** — 誰でも呼べる。(\`onlyOwner\` のような制限 modifier は production ではここに入る。例は意図的に permissionless。)
5. **\`decrement\` 関数は存在しない。** これがヒント。新規 test は test ファイル内で *decrement を加えず* に underflow を直接トリガする (local 構築経由)。

### Step 3: \`test/Counter.t.sol\` を読む

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
4. **\`uint256 zero = 0; zero - 1\` パターンは constant-folding 回避策。** \`uint256(0) - 1\` をリテラル式として書くと見た目は同じだが、コンパイルが通らない — Solc 0.8 はリテラル算術をコンパイル時に評価し、underflow を検出してソースを reject する。ゼロをローカル変数に格納すると、constant folder の目を欺ける: SUB opcode が runtime で走り、Solidity 0.8 が \`unchecked {}\` の外のあらゆる算術 op に挿入する *runtime* overflow check が \`Panic(0x11)\` を trigger する。**Compile-time と runtime の overflow check は別の layer に住む。書き方がどちらを発火させるかを決める。**
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
- **\`Error: test_RevertWhen_DecrementBelowZero() FAILED. Reason: call did not revert as expected\`** — Solidity version が 0.8.x ではなく、built-in overflow check を欠いている。\`Counter.sol\` の冒頭で \`pragma solidity ^0.8.28\` を確認する。
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

3. **\`vm.*\` cheatcodes は precompile であって、JS 側 wrapper ではない。** Hardhat の \`evm_snapshot\` は RPC method。Foundry の \`vm.expectRevert\` は precompile call。Cheatcode はアドレス \`0x7109709ECfa91a80626fF3989D68f67F5b1DD12D\` に住み、Foundry の Revm fork がそのアドレスへの call を intercept する。まさに openhl Stage 9 の precompile-as-EVM-superpower パターン。**L1 では \`vm.expectRevert\` だけを使った。L2 と L3 でさらに cheatcode が登場する。それぞれが precompile だ。**

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

**Q6: なぜ Solidity は Rust の \`[package] edition = "2024"\` のような形ではなく \`pragma solidity ^0.8.28\` を持つのか?**

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
              ],
            },
          },
        ],
      },
    },
  });
}
