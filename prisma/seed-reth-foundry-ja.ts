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
        "rethlab の openhl 系コースで学んだ厳格テスト規律 (proptest! による保存則、debug_assert! の routing 契約、openhl SHA に対する byte-for-byte 答え合わせ) は、Solidity contract にほぼ 1:1 で transfer する — そして Foundry がその transfer を mechanical にする道具だ。本コースは、すでに Rust で考える L1 / contract / engine エンジニアのための forge test / fuzz / invariant + cast + anvil を教える。L6 capstone までに、openhl-liquidation Stage 10b の InsuranceFund を Rust から Solidity に port し、同じ 4 つの保存則 invariant を forge で証明する — 同じ定理、2 言語、両方とも mechanical に証明済み。Foundry の習得は今や本格的な L1 開発の commodity prerequisite。本コースは既に規律を持っている前提で Solidity 構文を渡す。7 lessons across 4 modules、openhl SHA は L6 capstone 経由で参照、答え合わせは in-repo の examples/foundry-capstone/。",
      difficulty: "ADVANCED",
      duration: 15,
      xpReward: 50,
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
        ],
      },
    },
  });
}
