// AUTO-GENERATED from drafts/openhl_*_ja.md by .github/scripts/build-openhl-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlConsensusJA(prisma: PrismaClient) {
  const tags = ["reth","malachite","bft","evm","clob","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "reth-openhl-consensus-ja",
      title: "OpenHL を構築する — Consensus Substrate",
      description:
        "L1 Architect tier の worked example: Reth と Malachite の上に Hyperliquid 形状の L1 (BFT consensus + EVM execution + CLOB matching engine) を構築する。読み終える頃には、load-bearing なすべての piece — 4 メッセージ ConsensusBridge contract、Malachite の Context trait、Reth の NodeBuilder swap-slot、proposer hot loop、live orderbook state を読むカスタム EVM precompile — を psyto/openhl の実コードを通じて追跡した。Consensus 理論が動く cargo バイナリになるコース。",
      difficulty: "EXPERT",
      duration: 195,
      xpReward: 560,
      track: "reth-l1-architect",
      tags,
      isPublished: false,
      sortOrder: 600,
      locale: "ja",
      instructorName: "RethLab",
      modules: {
        create: [
          {
            title: "Execution/consensus split",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "BFT と EVM の contract",
                  slug: "openhl-consensus-contract-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 40,
                  content: `# BFT と EVM の contract

午前 3 時。OpenHL の devnet が 3 ブロック前から停止している。Malachite のログは \`waiting for value\` と言う。Reth のログは \`engine idle\` と言う。どちらも error を投げていない。**どっちが壊れているのか?**

この質問に 30 秒で答えられないなら、バグはどちらの crate にも無い — お前のメンタルモデルにある。2 つがどう話しているかのモデルだ。本レッスンはそのモデルをインストールする。読み終える頃には、consensus と execution の間を流れる 4 つのメッセージ、それぞれの promise、そしてどれかが消えたときにどちらの crate を責めればいいかが正確に分かるようになる。

> 🛑 **スクロール前に予測。** 同一プロセス内で動く 2 サービス: Malachite (BFT) と Reth (EVM)。**ブロックが produce され commit されるまでに両者間を流れる必要があるメッセージを、思いつくだけ挙げよ。** 「ブロックが consensus から EVM に流れる」で止まったなら、contract はまだ手に入っていない。

## 1. なぜ contract が必要か

素朴な L1 は consensus と execution を 1 つの巨大モジュールに融合させる。State の更新、署名検証、fork choice、投票集計、mempool — すべて 1 つのバイナリに、すべて絡み合って。これは 2020 年以前のほとんどのチェーンの書き方だ。動く。**しかし、すべてを失うコストが伴う。**

コストは 3 箇所に落ちる:

| コスト | 何を失うか |
| :--- | :--- |
| **Swappability** | EVM を書き直さずに consensus を変えられない、逆もしかり。HL は HyperBFT v1 から v2 へ移行する際 matching engine に触れずに済む — v1 と v2 は同じ contract を honor するからだ。 |
| **Testability** | EVM を起動せずに consensus を unit-test できない、逆もしかり。両半分とも integration-test オンリーになる。 |
| **Debuggability** | 午前 3 時にどちら側が stall したか分からない。クラッシュダンプはひとかたまりの泥である。 |

Contract が cure である。2 半部間のメッセージに名前を付けると、それぞれの半分は単独で replace、mock、fuzz、reason できるものになる。**Contract が API である。コードは実装詳細だ。**

## 2. BFT が EVM に約束するもの

consensus crate が execution crate に負っているのは厳密に 2 つ:

1. **Committed ブロックの ordered stream。** すべての validator が同じブロックを同じ順序で見る。Gap なし。Reorg なし — classical BFT chain においては。Nakamoto chain はもっと弱いものを約束するが、お前はそれを作っているわけではない。
2. **Validity assertions。** Commit された各ブロックは ≥ 2f+1 の validator によって投票された。お前の EVM が適用して invalid な state を生成したら、それは *お前の* バグであり consensus のバグではない。

これが BFT 側から見た contract の全部だ。ここに *無い* ものに注意:

- 「正しい transactions」ではない。(BFT はお前の tx が何をするか知らない。)
- 「正しい state root」ではない。(BFT は state を compute していない。)
- 「正しい canonical fork」ではない。(BFT には fork *自体が* 存在しない — それが要点だ。)

> 🛑 **反流暢性。** 「Consensus が次の state を選ぶ。」 **違う。** Consensus は次の *ブロック* を選ぶ。State はそのブロックを適用したときに EVM が compute するものだ。2 validator が state について意見が違う場合、それは consensus のバグではない — execution の determinism バグだ。

## 3. EVM が BFT に約束するもの

execution crate が consensus crate に負っているのは厳密に 3 つ:

1. **Deterministic execution。** State S にブロック B を適用したとき、すべての validator が同じ S' を生成する。Floating-point なし、system time なし、randomness なし、map iteration order なし。Determinism は non-negotiable; 1 つの違反でチェーンが fork する。
2. **Fast block assembly。** Consensus が「ブロックを build せよ」と言ったとき、execution は propose-timeout の予算内 (HL、Tempo、OpenHL では ~300–500ms) でブロックを返す。それより遅いとチェーンが stall する。
3. **Import 時の validity verification。** Peer の proposal が到着したとき、execution は「これは cleanly に execute するか?」を *commit 前に* 答えられる。

> 🛑 **予測。** EVM の 3 つの promise のうち、1 つは他より遥かに難しい。**どれで、なぜ自前 L1 を書くチームを最も頻繁に噛むのか?** 偶然 ship してしまう nondeterminism の最も簡単なソースを考えよ。

答えは determinism だ。すべての junior エンジニアは最終的に「ちょっとログ出すだけ」のために \`HashMap\` の iteration や \`SystemTime::now()\` を追加し、午前 3 時にチェーンを fork させる。Reth の API surface がこれについて paranoid なのには理由がある; 尊重せよ。

## 4. 4 つのメッセージ

これが contract の全部、4 つのメッセージで:

| 方向 | メッセージ | 送信タイミング | Promise |
| :--- | :--- | :--- | :--- |
| CL → EL | \`build_payload(parent, attrs)\` | validator が height N の proposer になったとき | 「\`parent\` の上に candidate block を build せよ。」 |
| EL → CL | \`payload_ready(block, state_root)\` | propose deadline 前に build が完了したとき | 「ブロックはこれだ。proposal value として使え。」 |
| CL → EL | \`validate_payload(block)\` | peer の proposal が到着したとき | 「このブロックは cleanly に execute するか? VALID / INVALID / SYNCING で答えよ。」 |
| CL → EL | \`commit(block_hash)\` | height N で BFT が \`Decided\` に到達したとき | 「このブロックを new head として finalize せよ。」 |

それだけだ。CL → EL 方向に 3、EL → CL 方向に 1。**他のあらゆる interaction は leak である。**

このテーブルで明確に見るべきものが 3 つある:

- **Validation と commit は分離されている。** Validator は height ごとに多数の candidate block を import し (round-robin の各 proposer slot あたり 1 つ)、それぞれを speculatively に execute し、commit するのは 1 つだけだ。多くのチームはこれらを 1 つのメッセージに collapse し、後で speculative execution が feature ではなく refactor になったときに代償を払う。
- **\`build_payload\` は即座に何も返さない。** Async build job を kick off するだけ; ブロックは後で \`payload_ready\` 経由で到着する。これが「build during voting」のトリック — payload assembly が前のブロックの投票と overlap するので、propose の hot path がほぼゼロ latency になる。
- **\`commit\` は fire-and-forget。** consensus が「これは final だ」と言ったら、execution は適用しなければならない。「本当にいいんですか?」の round-trip は存在しない。Execution が committed block を適用できない場合、チェーンは halt する。それが正しい挙動だ — committed block を silently に drop するのが世界を fork させるやり方だ。

## 5. OpenHL コードでの boundary の在処

具体的に我々の workspace では:

\`\`\`
crates/consensus/      ← Malachite を話す。CL 側から 4 メッセージを所有。
  src/bridge.rs        ← ConsensusBridge trait — 境界を渡る typed cable
  src/runner.rs        ← build_payload を発行し、payload_ready を待つ
  src/engine_app.rs    ← validate_payload + commit を発行 (AppMsg ループ経由)

crates/evm/            ← Reth を話す。EL 側から 4 メッセージを所有。
  src/engine.rs        ← RethEvmBridge — Reth 型を使った early in-process impl
  src/live_node.rs     ← LiveRethEvmBridge — real Reth node に対する full impl
\`\`\`

\`crates/consensus/src/bridge.rs:11@0844d58\` の \`ConsensusBridge\` trait が contract を textual に表現したものだ:

\`\`\`rust
// crates/consensus/src/bridge.rs
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError>;

    async fn payload_ready(
        &self,
        id: PayloadId,
    ) -> Result<ExecutedBlock, BridgeError>;

    async fn validate_payload(
        &self,
        block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError>;

    async fn commit(
        &self,
        block_hash: BlockHash,
    ) -> Result<(), BridgeError>;
}
\`\`\`

この trait を注意深く読め。**OpenHL における consensus と execution の間のすべての interaction は、これら 4 メソッドのいずれかを流れる。** 境界を別の方法で渡って reach しようとしている自分に気づいたら — consensus crate から Reth DB handle にアクセスしたり、EVM crate から Malachite の vote state を覗き見したり — お前は contract を破ったし、1 週間以内に forked devnet で代償を払うことになる。

> 🛑 **反流暢性。** 「Reth *が* OpenHL の consensus layer だ。」 **違う。** Reth は \`Consensus\` trait を ship しているが、それは *block-validation hook* だ — parent-hash check、gas-limit check、EIP-1559 base-fee math。BFT エンジンではない。Reth には leader election も投票も view change も無い。BFT エンジンは Malachite であり、\`crates/consensus\` に座って、上記 4 メッセージを通じて Reth と話している。これらを混同するとアーキテクチャ図が永久に間違いになる。

## 6. 真面目な BFT L1 はすべて同じ場所に線を引いている

これは OpenHL の発明ではない。production にある真面目な BFT L1 がすべて converge した先だ:

| Chain | CL 側 | EL 側 | Contract surface |
| :--- | :--- | :--- | :--- |
| **Ethereum** | Lighthouse、Prysm、Teku、Nimbus | Reth、Geth、Erigon | JSON-RPC 経由の Engine API (\`engine_newPayload\`、\`engine_forkchoiceUpdated\`、\`engine_getPayload\`) |
| **Hyperliquid** | HyperBFT | HyperCore + HyperEVM | 内部 Rust trait (closed source) |
| **Tempo** | Tempo BFT (CometBFT-derived) | Reth-based | In-process Rust trait |
| **OpenHL** | Malachite | Reth | \`ConsensusBridge\` trait |

Ethereum は特殊例だ: contract が JSON-RPC 上にあるのは CL と EL が *別プロセス* で、しばしば異なる言語の異なるチームから来るからだ。HL、Tempo、OpenHL はすべて CL と EL を 1 バイナリで動かすので、contract は Rust trait — しかし **message surface は同じ**である。同じ形、違う transport。

> 🛑 **予測。** Ethereum の CL/EL split は CL と EL を別プロセスで JSON-RPC wire format で動かす。OpenHL は 2 crate を 1 バイナリで in-process trait で動かす。**Ethereum が process separation から得るものは何か、そしてそれが Ethereum と OpenHL に何のコストを払わせるか?** 誰が何を replace できるかを考えよ。

Ethereum は **client diversity** を得る: 4 CL、複数 EL、1 client がバグでダウンしても single-implementation risk が無い。Latency でコストを払う (RPC overhead、1 call あたり ~5–15ms)。OpenHL は low-latency call を得る (in-process で microsecond) が、1 バイナリで ship する。Sub-second finality を狙う single-team L1 にとって、trade は明らかに正しい。そして OpenHL がいつか client diversity を望むなら、trait は十分小さいので後で JSON-RPC 経由で expose できる — contract はすでに存在する。

## 7. 練習

1. **4 つのメッセージを何も見ずに再導出せよ。** 書き出せ: 方向、名前、いつ送るか、それぞれが何を約束するか。1 つでも漏らしたら、contract はまだ internalize されていない。
2. **Contract leak を見つけよ。** SHA \`0844d58\` で \`crates/consensus/src/bridge.rs\` と \`crates/evm/src/live_node.rs\` を開け。両ファイルを上から下まで読め。\`ConsensusBridge\` を *通らずに* 一方の crate からもう一方に access している箇所を identify せよ。あるべきではない。もし見つけたら issue を立てよ。
3. **Ethereum にマップせよ。** OpenHL の 4 メッセージそれぞれに対応する Ethereum Engine API メソッドの名前を挙げよ。
   *Cheat sheet:* \`build_payload\` + \`payload_ready\` ↔ \`engine_forkchoiceUpdated\` (with payload attrs) + \`engine_getPayload\`。\`validate_payload\` ↔ \`engine_newPayload\`。\`commit\` ↔ new finalized hash を持つ \`engine_forkchoiceUpdated\`。

> **最終チェック:** 1 文で、なぜ「EVM は consensus の internal state から最新の committed block を読めばいい」が contract を破るのか — そしてそれが引き起こす determinism failure mode は何か? 答えに「EVM crate が consensus internals に依存するようになり、その internals への変更がチェーンを fork させ得る」が含まれなければ、§5 を再読。`,
                },
                {
                  title: "Hyperliquid、Tempo、CometBFT 系チェーンが converge する場所",
                  slug: "openhl-consensus-convergence-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 40,
                  content: `# Hyperliquid、Tempo、CometBFT 系チェーンがすべて converge する場所

Production の BFT L1 をどれか 1 つ取って、consensus 側のアーキテクチャを読め。**3 つの異なる会社の 3 つのチームが、3 つの異なる go-to-market のために最適化していて、全員が同じ設計に converge する。** Hyperliquid (closed source、HotStuff 派生)。Tempo (CometBFT 派生)。Cosmos エコシステムのすべてのチェーン (CometBFT)。openhl が使う Malachite は同じアイデアの clean-room 実装だ。

これは偶然ではない。Forcing function が存在する。本レッスンの終わりまでにそれが何か分かるようになる — そしてなぜ major な BFT L1 が optimistic execution を採用しないかも。

> 🛑 **スクロール前に予測。** 1 つ選べ: BFT chain において execution はブロックが finalize される *前* (optimistic)、finalization の *最中* (mid-flight)、finalization の *後* (decide-first-then-execute) のどれで起こるか? 選んだ後、他の 2 パターンが犠牲にする 3 つの性質を挙げよ。

## 1. Convergence — 観察

| Chain | Consensus family | execution はいつ起こる? |
| :--- | :--- | :--- |
| Bitcoin (PoW) | Nakamoto / longest-chain | **During** (miner は candidate を build しながら tx を実行する; chain は PoW が landing したとき進む) |
| Ethereum 1.0 (PoW) | Nakamoto | **During** (Bitcoin と同様) |
| Ethereum 2.0 (PoS) | Casper FFG + LMD-GHOST | **Optimistic、その後 finalized** (fork-choice の下で execute し、~13 分後に finalize) |
| Cosmos chains (CometBFT) | Tendermint BFT | **Decide の後** (consensus が commit に到達してから ABCI app が execute) |
| **Hyperliquid (HyperBFT)** | HotStuff 系 BFT | **Decide の後** (同じパターン、違う名前) |
| **Tempo (CometBFT 派生)** | Tendermint-shape | **Decide の後** |
| **openhl (Malachite)** | Tendermint BFT (clean-room) | **Decide の後** |

最後の列の BFT L1 はすべて同じ row に landing する: **決定が先、execution が後。** 3 つの独立したチームがこの設計に converge した — お互いに話して決めたのではなく、BFT の safety 性質がそれを強制するからだ。

## 2. なぜ decide-first-execute-after — safety 議論

BFT の promise は **safety** だ: 2 人の honest validator が同じ height について異なる値で decide することはない。これには corollary がある: **一度 decide されたら reorg は無い。** やり直しは無い。

これが成り立つには、execution が *decided block に対して* deterministic でなければならない。Decided block を適用したすべての validator が同じ post-state に到達する必要がある。さもなくば、ブロック内容に同意したが効果には同意しなかった 2 validator が事実上 fork する — 同じブロック、異なる state — そして chain の safety 性質は silently に違反される。

Optimistic execution はこれを subtle に undermine する。パターン:

1. Validator が candidate block を受け取る (まだ decide されていない)
2. Validator が speculatively に block を execute して state を compute する
3. Validator は compute した state に基づいて投票
4. 他の validator も同じことをする
5. 投票を集約; 2/3+ なら decide

問題は step 2 だ: 各 validator は自分の state で block を execute している。Pre-state が diverge していたら (以前の nondeterminism バグ、network partition 等で)、異なる post-state を compute して異なる投票をする。**Fork は投票中に起こる、後ではない。** そして BFT の safety promise はそれを catch しない — 投票は同じ block_hash で quorum に到達するかもしれないが、結果の state は disagree する。

Decide-first パターンはこれを sidestep する:

1. Validator が candidate block (ただの bytes; execution なし) に同意する
2. Bytes に投票する
3. 一度 2/3+ commit すれば、決定は final
4. *それから* 各 validator は bytes を state に適用する
5. State が diverge したら、それは consensus バグではなく determinism バグ — chain は silently に fork するのではなく visible に halt する (state-root mismatch)

> 🛑 **反流暢性。** 「Optimistic execution は BFT のパフォーマンス最適化に過ぎない。」 **違う。** Rollback machinery (投票が逆方向に行ったときの speculative execution を undo する) を要する *異なるパラダイム* であり、safety story を変える。**Major な BFT L1 で v1 から optimistic execution を採用しているものは無い。** 上位バージョン用に提案しているものはある (HotShot、Solana 系); ship したものは無い。

## 3. Nakamoto counterexample — なぜ Bitcoin は違う必要があったか

Bitcoin が decide-first を使えないのは **decision event が存在しない** からだ。Nakamoto consensus では「決定」とは chain weight (累積 PoW) であり、確率的なものだ。Validator 全員が「このブロックは final」と同意する瞬間は無い — あるのは「このブロックは N 個のさらなる confirmation の下に埋まっており、reorg の確率は exponentially に小さい」だけだ。

その世界では optimistic execution が唯一の選択肢になる。Miner は candidate block を *必ず* execute する (valid なものを見つける方法だからだ)、そして chain の safety story は algorithmic finality ではなく economic finality に依存する。

Bitcoin はこれの代償を払う:
- 平均 ~10 分の block time (BFT のサブ秒に対して)
- 高額取引には ~6 ブロック confirmation depth (BFT の instant に対して ~1 時間)
- Slashing なし (miner を不正行為で罰せない — miner は pseudonymous だからだ)

引き換えに得るもの:
- Permissionless 参加 (ハッシュパワーがあれば誰でも mine できる)
- Bounded validator set なし (3f+1 制約なし)
- Partition 下での liveness (両側が mining を続け、再結合時に reconcile する)

これが L2 テーブルの最初の 2 row が払う trade だ。**BFT より良いとか悪いとかではない — 違う問題のためのものだ。** Sub-second finality を最適化する chain (HL、Tempo、openhl) には BFT が勝つ; permissionless miner を最適化する chain (Bitcoin) には Nakamoto が勝つ。

## 4. ETH 2.0 のハイブリッド — microcosm における forcing function

Ethereum の post-merge アーキテクチャは興味深い中間ケースだ: head で LMD-GHOST (Nakamoto 形式の fork-choice) を、finality で Casper FFG (BFT 形式) を動かす。EL は optimistic に execute する; CL の Casper は ~13 分後にブロックを finalize する。

これが機能するのは EL/CL split (L1 §6 が convergence point として名指したもの) が各層に fit する consensus family を使わせるからだ:

- CL は BFT 形式の finality を得る (chain が fork から復帰できるように)
- EL は Nakamoto 形式の柔軟性を保つ (optimistic state を produce し続けられるように)

しかしハイブリッドはタダではない。EL は **head での reorg** をサポートしなければならない (Casper が異なる fork を finalize したら数ブロック revert する)。これが Reth の深い \`BlockExecutor\` の複雑さの源だ — append-only ではなく reorg-safe である必要がある。

**openhl はこの複雑さを skip する。** Pure BFT は reorg がまったく無いことを意味する — Casper 形式の「これは finalized、あれは違った」は不要だ、なぜなら *すべてが* finalized だからだ。HL と Tempo を decide-first chain にさせた同じ性質が、我々にもより単純な EL contract を買ってくれた。

## 5. openhl が継承するもの

Decide-first パターンは openhl の設計を 3 つの方法で形作る:

1. **\`commit\` は fire-and-forget** (L1 §4)。撤回するものが無いから「本当にいいのか?」round-trip も無い。EL が知る頃には決定はすでに permanent だ。

2. **\`validate_payload\` が存在する** (L1 §3、L7 §3)。Validator は peer から proposal を受け取り、投票 *前に* EL に executability を check させる。これが decide-first chain における optimistic-execution-equivalent だ: post-state を speculate しないが、proposal が commit に値する程度に well-formed かを check は *する*。

3. **Reorg machinery なし** (本レッスン)。EL は committed block を undo する必要が一度もない。State 成長は monotonic; canonical chain は append-only だ。Reth の reorg サポートは未使用のまま残る。

それぞれが同じ forcing function — BFT safety 性質 — からの意図的な継承だ。

> 🛑 **予測。** スタートアップが「optimistic execution を持つ BFT chain」を提案 — decide-first に対して 2x スループットを主張する。**§1 のテーブルが露出しなかったアーキテクチャ commitment は何か?**

答え: rollback 可能な EL に commit している — speculatively に execute されたブロックに対して consensus が反対投票したときに state を revert できる execution layer。Decide-first chain の EL より桁違いに複雑だ。**2x スループットの主張は本物だが、エンジニアリングの請求書は EL で発生する。** これを試みるほとんどのチームは ship する前に EL を 2 回書き直すことになる。

## 6. 練習

1. **コードで convergence を見つけよ。** CometBFT 系チェーンのリポを開け (例: \`cometbft/cometbft\` 自体、または Osmosis 等の downstream)。Consensus が「decide する」場所と application が「execute する」場所を locate せよ。openhl の \`crates/consensus/src/engine_app.rs:119@0844d58\` (L10 で walk する \`AppMsg::Decided\` arm) と比較せよ。
2. **Trade を名指せ。** Bitcoin は optimistic execution を使う。**なぜこれが Bitcoin にとって safe か?** ヒント: Bitcoin における「decision」が何を意味するか — それはいつ不可逆になるかを考えよ。
3. **ハイブリッドケース。** Ethereum 2.0 の LMD-GHOST + Casper ハイブリッドは EL に reorg サポートを要求する。これが現れる場所を Reth で 1 箇所見つけよ (\`reth-provider\` で \`block_indices\`、\`reorg\`、\`revert_state\` を検索)。

> **最終チェック。** 1 文で、なぜ decide-first-execute-after パターンが 4 メッセージ contract (L1 §4) に \`validate_payload\` と \`commit\` を *別* メソッドとして持たせることを *強制* するか? 答えに「validation は speculative; commit は final; これらは異なる protocol moment で起こる」が含まれていなければ、§2 を再読。`,
                },
              ],
            },
          },
          {
            title: "ライブラリとしての Malachite",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "Malachite が与えてくれるもの — Context trait",
                  slug: "openhl-malachite-context-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 40,
                  content: `# Malachite が与えてくれるもの — \`Context\` trait

Malachite は 10 個の associated type と 4 個のメソッドを持つ 1 つの trait だ。**10 個の type に名前を付けたら、自分の chain に名前を付けたことになる。** これは比喩ではない — consensus エンジンはそれらの type に対して parametric であり、各メソッドのシグネチャはそれらから derive される。正しい type を選べば Malachite はそれらの上で consensus を駆動する。

> 🛑 **スクロール前に予測。** BFT consensus プロトコルは address、height、value、vote、validator、signature について知る必要がある。それぞれについて associated type を持つ Rust trait を sketch せよ。§1 で Malachite の \`Context\` と比較し、\`crates/consensus/src/context.rs:19@0844d58\` の openhl の concrete impl を見る。

## 1. \`Context\` trait、名指し

\`informalsystems_malachitebft_core_types::Context\` から:

\`\`\`rust
pub trait Context
where
    Self: Sized + Clone + Send + Sync + 'static,
{
    type Address: Address;
    type Height: Height;
    type ProposalPart: ProposalPart<Self>;
    type Proposal: Proposal<Self>;
    type Validator: Validator<Self>;
    type ValidatorSet: ValidatorSet<Self>;
    type Value: Value;
    type Vote: Vote<Self>;
    type Extension: Extension;
    type SigningScheme: SigningScheme;

    fn select_proposer(&self, validator_set: &Self::ValidatorSet,
                       height: Self::Height, round: Round)
        -> &Self::Validator;
    fn new_proposal(&self, height: Self::Height, round: Round,
                    value: Self::Value, pol_round: Round,
                    address: Self::Address) -> Self::Proposal;
    fn new_prevote(&self, height: Self::Height, round: Round,
                   value_id: NilOrVal<ValueId<Self>>,
                   address: Self::Address) -> Self::Vote;
    fn new_precommit(&self, height: Self::Height, round: Round,
                     value_id: NilOrVal<ValueId<Self>>,
                     address: Self::Address) -> Self::Vote;
}
\`\`\`

10 type、4 method。Doc comment 込みで全体は約 90 行。**この trait を読むことは、Malachite から見て自分の chain がどう見えるかを読むことそのものだ。**

各 type への制約に注目: それぞれが自分の sub-trait (\`Address\`、\`Height\`、\`Proposal<Self>\` 等) を持ち、Malachite が期待する operation を定義している。§2 でこれらを inventory する。

## 2. 10 type、それぞれ

| Associated type | 何か | openhl の選択 |
| :--- | :--- | :--- |
| \`Address\` | Validator identity (小さく、比較可能) | \`OpenHlAddress([u8; 20])\` — Ethereum 20-byte convention |
| \`Height\` | Block height; 単調 counter | \`OpenHlHeight(u64)\` |
| \`Value\` | Consensus が decide する対象 | \`OpenHlValue(BlockHash)\` — 32-byte hash をラップ |
| \`Validator\` | 単一 validator (addr + key + power) | \`OpenHlValidator { address, public_key, voting_power }\` |
| \`ValidatorSet\` | Validator のコレクション | \`OpenHlValidatorSet(Vec<OpenHlValidator>)\` ソート済み (power desc、addr asc) |
| \`Proposal\` | 提案された値 + round metadata | \`OpenHlProposal { height, round, value, pol_round, address }\` |
| \`Vote\` | Prevote または precommit | \`OpenHlVote { height, round, value_id, vote_type, address }\` |
| \`ProposalPart\` | ストリームされる proposal piece (大きな value 用) | \`OpenHlProposalPart\` (unit struct; ProposalOnly mode) |
| \`Extension\` | Precommit に付随するアプリケーションデータ | \`()\` (v0 では extension なし) |
| \`SigningScheme\` | 署名がどう見えるか | \`malachitebft-signing-ed25519\` の \`Ed25519\` |

各 row は \`crates/consensus/src/types/\` のファイルに対応する — それが構造だ: **1 概念につき 1 type、7 ファイル** (Address と Validator は \`validator.rs\` で共有; \`Extension\` は \`()\` なのでファイル不要; \`SigningScheme\` は Malachite が ship)。

\`\`\`
crates/consensus/src/types/
├── address.rs        ← OpenHlAddress
├── height.rs         ← OpenHlHeight
├── value.rs          ← OpenHlValue (openhl_types::BlockHash をラップ)
├── validator.rs      ← OpenHlValidator + OpenHlValidatorSet
├── proposal.rs       ← OpenHlProposal
├── vote.rs           ← OpenHlVote
└── proposal_part.rs  ← OpenHlProposalPart
\`\`\`

(Address と key は \`validator.rs\` に同居; \`Extension\` は \`()\` なのでファイル不要; \`SigningScheme\` は Malachite が ship するので impl 不要。)

L4 が各ファイルを詳しく walk する。今のところ: **これら 10 type が存在することを知っていることが、Malachite が何かを知ることの半分だ。** もう半分は 4 メソッド (§3)。

> 🛑 **反流暢性。** 「Malachite は Tendermint だ。」 **ほぼ違う。** Malachite は *抽象* Tendermint アルゴリズム — state machine、proposal-vote-precommit の dance、3f+1 quorum math — で、I/O を抜いたものだ。実際の CometBFT 実装は I/O (libp2p、ABCI、mempool、ネットワーク) を所有する; Malachite はアルゴリズムだけを所有する。**この分離が openhl に CometBFT の runtime 全部を継承せず Malachite を使わせる。**

## 3. 4 メソッド

メソッドは protocol のメッセージを構築する。重い処理が type 側にあるので、シグネチャは minimal に見える。

\`\`\`rust
fn select_proposer(&self, validator_set: &Self::ValidatorSet,
                   height: Self::Height, round: Round)
    -> &Self::Validator;
\`\`\`

Validator set + (height, round) を与えると、誰の番かを返す。openhl は sort 済み validator に対する round-robin を使う; \`crates/consensus/src/context.rs:32@0844d58\`。**関数は deterministic でなければならない** — すべての honest validator が同じ (height, round) に対して同じ proposer を compute する。ここでの nondeterminism は chain を fork させる。

\`\`\`rust
fn new_proposal(&self, height: Self::Height, round: Round,
                value: Self::Value, pol_round: Round,
                address: Self::Address) -> Self::Proposal;
fn new_prevote(...) -> Self::Vote;
fn new_precommit(...) -> Self::Vote;
\`\`\`

3 つのメッセージコンストラクタ — consensus message type それぞれに 1 つずつ。**なぜ直接の struct 構築ではなく factory 関数か?** *Protocol* (Malachite の \`Driver\`) がこれらのメッセージを作る必要があるが、*chain* がそれらの見た目を定義するからだ。Factory パターンは protocol ロジックとメッセージ形を decouple する。

\`Proposal\` type が (height, round, value, pol_round, address) を超える追加フィールドを持つなら、\`new_proposal\` impl に含められる。Malachite はそれらを見ない — chain 固有だ。

## 4. お前に残されたもの

Malachite が protocol を与える。**与えない:**

| 関心事 | 誰が所有するか |
| :--- | :--- |
| Address の選択 | お前 (chain の identity スキーム) |
| Validator set の構築 | お前 (genesis + slashing ロジック) |
| Propose する値の選択 | お前 (bridge 経由の \`build_payload\`) |
| 値の validation | お前 (bridge 経由の \`validate_payload\`) |
| メッセージの signing | お前 (\`SigningProvider\` impl — L4 §7) |
| Network gossip | エンジン actor system (libp2p) |
| 永続化 (WAL) | エンジン actor system |
| Decided block の storage | お前 (EL state) |
| Mempool | お前 (EL transaction pool) |

Split は意図的だ。**Malachite が小さい** のは consensus アルゴリズムだけを所有するからだ。Chain 固有のすべて — address、signing、payload assembly、storage — はお前のものだ。

> 🛑 **予測。** チームが openhl を fork して新しい chain を作る。違う address フォーマット (Ethereum 形式の 20-byte ではなく Solana 形式の 32-byte address) が欲しい。**何ファイル触るか?**

答え: **1 ファイル — \`crates/consensus/src/types/address.rs\`。** \`OpenHlAddress\` を \`[u8; 20]\` から \`[u8; 32]\` に変更し、\`Address: Clone + Debug + Display + Eq + Ord + Send + Sync\` を依然として満たすことを保証すれば、それで終わりだ。Malachite は byte 幅を気にしない; trait bound が満たされていることだけを気にする。Chain の残り — proposer election、vote tallying、network gossip — はそのまま動く。

それが parametricity の payoff だ。正しく仕上げるコストは 10 type すべてを最初に実装すること; 報酬は単一 type を swap しても他に何も変わらないことだ。

## 5. Malachite の \`Driver\` を読む

\`malachitebft-core-driver\` の \`Driver\` (openhl の \`run_single_validator\` が \`crates/consensus/src/runner.rs:34@0844d58\` で使う) は protocol state machine だ。Expose するのは:

\`\`\`rust
fn process(&mut self, input: Input<Ctx>) -> Result<Vec<Output<Ctx>>, Error<Ctx>>
\`\`\`

\`Input<Ctx>\` と \`Output<Ctx>\` enum は \`Context\` で parameterize される。Variant がお前の type を carry する:

- \`Input::Proposal(SignedProposal<Ctx>, Validity)\` — proposal が到着した。\`SignedProposal\` は \`Ctx::Proposal\` に対して generic。
- \`Output::Vote(Ctx::Vote)\` — この vote を broadcast せよ。お前の \`OpenHlVote\` が戻ってくる。
- \`Output::Decide(Round, Ctx::Proposal)\` — consensus がこの proposal で decide した。

**\`Driver\` 自体はお前の type が存在しないかのように読める。** \`Ctx::Address\`、\`Ctx::Vote\`、\`Ctx::Proposal\` を traffic する — \`OpenHlAddress\`、\`OpenHlVote\`、\`OpenHlProposal\` を扱うことは一度もない。Protocol 全体が type-parametric だ。

なぜこれが重要か? **Tendermint protocol 全体が 1 つのコードであり、それを使うすべての chain にまたがって一度 debug される。** Cosmos chain、openhl、Tempo、その他が Malachite (または概念的等価物) を使うとき、全員がアルゴリズム自体への bug fix の恩恵を受ける。BFT を re-implement する必要のある chain は無い。

> 🛑 **反流暢性。** 「各 BFT chain が自分の consensus を実装する。」 **違う。** 各 chain は自分の *type* と *I/O* を実装する。アルゴリズムは family にまたがって共有される — 時には文字通り (同じライブラリを使う chain)、時には概念的に (HotStuff variant は同じ state machine に converge する)。**L1 architect としてのお前の仕事は type と I/O であり、アルゴリズムではない。**

## 6. 練習

1. **Type を inventory せよ。** コードを見ずに、\`Context\` の 10 個の associated type と各々が chain で何を表すかをリストせよ。それから \`crates/consensus/src/context.rs:19@0844d58\` を開いてリストを check せよ。
2. **Solana-address 実験。** \`OpenHlAddress\` が \`[u8; 20]\` ではなく \`[u8; 32]\` だったら何が変わるかを sketch せよ。変わるファイル (ヒント: 1 つだけ) と変わらないファイル (ヒント: ほとんど) を identify せよ。
3. **Driver を見つけよ。** \`crates/consensus/src/runner.rs:34-83@0844d58\` (\`run_single_validator\` の始まり) を読め。お前の \`OpenHlContext\` type が現れる場所と Malachite 内部 type が現れる場所を identify せよ。Seam はどこか?

> **最終チェック。** 1 文で、なぜ Malachite の \`Context\` は単なる generic parameter (\`Driver<Address, Height, Value, ...>\`) ではなく *associated type* を使うのか? 答えに「associated type は chain あたり 1 セットの type を lock-in する — generic だと caller が mix-and-match できてしまい、determinism invariant を破る」が含まれていなければ、§3 を再読。`,
                },
                {
                  title: "お前が実装するもの — proposal、validator、vote、signing",
                  slug: "openhl-malachite-impl-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 20,
                  xpReward: 60,
                  content: `# お前が実装するもの — proposal、validator、vote、signing

L3 は 10 個の type に名前を付けた。次にそれらを書く。**40 行の trait impl で、お前の chain にアイデンティティが生まれる。** 練習はほぼ機械的だ — 各 sub-trait の surface は小さい — がその 40 行に encode された選択は、後続レッスンすべてが参照するものだ。

> 🛑 **スクロール前に予測。** SHA \`0844d58\` で \`crates/consensus/src/types/\` を開け。ファイルを読まずに、10 個の Context sub-type それぞれに対して期待する *trait bound* を sketch せよ。ヒント: Malachite が必要とする operation を考えよ (sort のための address 比較、VoteKeeper lookup のための value hash、ログ用の height display)。

## 1. Trait-bound ツアー

各 Context associated type は自分の sub-trait を持つ。Bound が Malachite の期待する API surface だ:

| Sub-trait | 必要な bound | なぜ |
| :--- | :--- | :--- |
| \`Address\` | \`Clone + Debug + Display + Eq + Ord + Send + Sync\` | validator set でソート、ログで表示 |
| \`Height\` | \`Copy + Clone + Default + Debug + Display + Eq + Ord + Send + Sync\` + \`ZERO\`、\`INITIAL\`、\`increment_by\`、\`decrement_by\`、\`as_u64\` | 単調 counter math |
| \`Value\` | \`Clone + Debug + Eq + Ord + Send + Sync\` + \`type Id: Clone + Debug + Display + Eq + Ord + Send + Sync\` と \`fn id() -> Self::Id\` | コンパクトな identifier (vote payload) を持つ |
| \`Validator<Ctx>\` | \`Clone + Debug + Eq + Send + Sync\` + \`address()\`、\`public_key()\`、\`voting_power()\` | weight 付きの参加者を identify |
| \`ValidatorSet<Ctx>\` | \`Clone + Debug + Eq + Send + Sync\` + \`count()\`、\`total_voting_power()\`、\`get_by_address()\`、\`get_by_index()\` | 反復可能、ソート可能、lookup 可能なコレクション |
| \`Proposal<Ctx>\` | \`Clone + Debug + Eq + Send + Sync + 'static\` + 6 accessor | value + round metadata を carry |
| \`Vote<Ctx>\` | \`Clone + Debug + Eq + Ord + Send + Sync + 'static\` + 9 accessor | prevote または precommit |
| \`ProposalPart<Ctx>\` | \`Clone + Debug + Eq + Send + Sync + 'static\` + \`is_first\`、\`is_last\` | \`PartsOnly\` mode で stream 可能 |
| \`Extension\` | \`Clone + Debug + Eq + Send + Sync + 'static\` + \`size_bytes()\` | optional な precommit attachment |
| \`SigningScheme\` | \`Clone + Debug + Eq\` + \`type Signature\`、\`type PublicKey\`、\`type PrivateKey\`、encode/decode | wire-format 暗号 |

**全 type が \`Send + Sync\` も必要だ — Malachite が actor 境界をまたいで動くからだ。** その単一要件で thread-unsafe な選択 (例: 生の \`Rc<_>\` フィールド) は除外される。コンパイラが強制する。

## 2. 自明な 3 つ — \`Address\`、\`Height\`、\`Value\`

これらは最も単純だ。3 struct、それぞれ ~20 行。\`crates/consensus/src/types/address.rs:7@0844d58\` を開け:

\`\`\`rust
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlAddress(pub [u8; 20]);

impl fmt::Display for OpenHlAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("0x")?;
        for b in &self.0 {
            write!(f, "{b:02x}")?;
        }
        Ok(())
    }
}

impl Address for OpenHlAddress {}
\`\`\`

3 つのこと:
1. **\`#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]\`** がほとんどの trait bound を無料で与える。\`[u8; 20]\` フィールドがこれらを自然に derive する。
2. **\`fmt::Display\` impl** は address を hex エンコードする。\`Address\` super-trait が要求する; ログとエラーメッセージで使う。
3. **\`impl Address for OpenHlAddress {}\`** — 空 impl。Trait は bound が要求するものを超える独自メソッドを持たない。

\`Height\` と \`Value\` は同じ形に従う。\`Height\` は \`crates/consensus/src/types/height.rs@0844d58\` で \`INITIAL = 1\`、\`ZERO = 0\`、飽和算術 \`increment_by\`/\`decrement_by\` を加える。\`Value\` は \`crates/consensus/src/types/value.rs\` で \`BlockHash\` をラップし、\`Value::id() -> Self::Id = BlockHash\` を impl する (value が自分自身の id である — block hash がすでに 32 byte だからだ。下の予測を参照)。

> 🛑 **予測。** 我々の \`Value::Id\` は \`Value\` 自体と同じ type だ (両方 \`BlockHash\`)。Cosmos chain では \`Value\` が full block を carry し、\`Value::Id\` がそのブロックの hash だ。**なぜ openhl はそうしないか — なぜ \`Value\` は単なる hash なのか?**

なぜなら、まだ consensus 上で transaction を ship していないからだ。Bridge がブロックを produce し、ブロックの hash が投票対象になり、EL がブロック内容の source of truth になる。Full block を consensus 経由で carry すると、libp2p gossipsub 上で transaction を serialize することになる — 無駄だ、すべての validator がすでに EL state を持っていて hash からブロックを reconstruct できるからだ。**Module 2 (CLOB) でこの計算は変わるかもしれない** — consensus value が EVM mempool に無い CLOB fills を含むようになったとき、\`Value\` が hash 以上を carry する必要が生じるかもしれない。

## 3. \`Validator\` と \`ValidatorSet\` — sort order が load-bearing

\`crates/consensus/src/types/validator.rs:21@0844d58\` を開け:

\`\`\`rust
impl Validator<OpenHlContext> for OpenHlValidator {
    fn address(&self) -> &OpenHlAddress { &self.address }
    fn public_key(&self) -> &PublicKey { &self.public_key }
    fn voting_power(&self) -> VotingPower { self.voting_power }
}
\`\`\`

3 accessor。Trait が期待するもの; struct が格納するもの。自明だ。

興味深いのは \`OpenHlValidatorSet\` の \`new\`、\`crates/consensus/src/types/validator.rs:42@0844d58\`:

\`\`\`rust
pub fn new(mut validators: Vec<OpenHlValidator>) -> Self {
    validators.sort_by(|a, b| {
        b.voting_power
            .cmp(&a.voting_power)
            .then_with(|| a.address.cmp(&b.address))
    });
    Self(validators)
}
\`\`\`

\`(voting_power desc, address asc)\` でソート。**このソート順は determinism にとって load-bearing だ。**

理由: \`OpenHlContext::select_proposer\` は \`validator_set.get_by_index((height + round) % count)\` で proposer を選ぶ (L11 領域)。同じ validator set に対して 2 validator がソート順が違うと、同じ round で異なる proposer を選び、chain が fork する。

CometBFT convention (openhl が継承) は \`voting_power desc, address asc\` だ。このソート + modulo 回転を使う chain は、address space が totally ordered である限り deterministic な proposer election を得る — それが \`Address: Ord\` が hard bound (§1) である理由だ。

> 🛑 **反流暢性。** 「ソート順は実装詳細だ。」 **consensus では違う。** consensus においては、ソート順 *が* protocol だ。異なるソートをする 2 実装は、type signature がどう見えようと、異なる consensus protocol を動かしている。CometBFT のソート convention は de-facto BFT family standard の一部だ。

## 4. \`Proposal\` と \`Vote\` — メッセージコンストラクタ

\`Proposal\` は \`crates/consensus/src/types/proposal.rs@0844d58\` で 5 フィールド struct に対する 6 accessor だ:

\`\`\`rust
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlProposal {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value: OpenHlValue,
    pub pol_round: Round,    // "Proof-of-lock round" — Tendermint nuance
    pub address: OpenHlAddress,
}
\`\`\`

\`pol_round\` は提案された値がロックされた round だ — Tendermint が「自分は以前の round でこの値に prevote したが、その round がタイムアウトした; いま再度それを propose している」というケースを扱うのに使う。First-round の proposal では \`pol_round = Round::Nil\`。

\`Vote\` は \`crates/consensus/src/types/vote.rs:10@0844d58\`:

\`\`\`rust
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct OpenHlVote {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value_id: NilOrVal<BlockHash>,    // NilOrVal: 値に対する vote、または nil
    pub vote_type: VoteType,              // Prevote | Precommit
    pub address: OpenHlAddress,
}
\`\`\`

\`value_id: NilOrVal<BlockHash>\` が実際の仕事をしている。Vote は:
- \`NilOrVal::Val(hash)\` — 「この id を持つ値に vote する」
- \`NilOrVal::Nil\` — 「この round の任意の値に反対する」(タイムアウト、proposal が来なかった)

Nil 投票は Tendermint が proposal の欠落や invalid を扱う方法だ; round はそれでも終了しなければならない。

両 type とも単純な accessor 関数で各々の sub-trait を impl する — それぞれ 20 行。我々が書くのは *protocol* (Malachite が所有する) ではなく、*protocol が traffic する type* だ。

## 5. \`ProposalPart\` — 使わない streaming type

\`ProposalPart\` は \`crates/consensus/src/types/proposal_part.rs@0844d58\` で codebase 中もっとも退屈なファイルだ:

\`\`\`rust
pub struct OpenHlProposalPart;

impl ProposalPart<OpenHlContext> for OpenHlProposalPart {
    fn is_first(&self) -> bool { true }
    fn is_last(&self) -> bool { true }
}
\`\`\`

Unit struct。\`is_first = is_last = true\` (単一 part が唯一の part)。

なぜこの type が存在するのか? Malachite は 3 つの \`ValuePayload\` mode をサポートする (L5 §6 領域):
- \`ProposalOnly\` — 全 value が \`Proposal\` メッセージにある。**openhl はこれを使う。**
- \`PartsOnly\` — value は chunk で stream される; \`Proposal\` がそれらを参照する。
- \`ProposalAndParts\` — 両方。

他の 2 mode は単一 gossip メッセージに収まらない大きな値を propose する chain (multi-MB ブロック) のために存在する。\`ProposalPart\` が streaming chunk だ。**openhl は 32-byte block hash を propose するので、streaming は不要だ。** しかし Context trait は associated type を要求するので、bound を満たすが実際には wire を流れない unit struct を提供する。

## 6. Signing — Ed25519 を 0 行で

我々の \`SigningScheme\` は \`Ed25519\` で、\`informalsystems-malachitebft-signing-ed25519\` で Malachite が ship する。**我々はそれに対して 0 行書く。** \`crates/consensus/src/context.rs:29@0844d58\` から:

\`\`\`rust
type SigningScheme = Ed25519;
\`\`\`

それだけだ。Malachite が signature encoding/decoding、\`Signature\` / \`PublicKey\` / \`PrivateKey\` type、全部を handle する。

BLS aggregation (より小さな commit certificate) が欲しければ、異なる \`SigningScheme\` impl にスワップする — Malachite の設計はスキームに対して parametric だ。我々はしない; Ed25519 はより単純で、Tempo/HL の両方が使う。

> 🛑 **予測。** Ed25519 から BLS への切り替えは \`OpenHlContext\` の 1 行変更だ。**openhl で他に何を変える必要があるか?** ヒント: validator-set storage と wire に乗るものについて考えよ。

答え: ほとんどは変わらない。Validator-set storage は \`PublicKey\` を格納する; \`PublicKey\` の concrete type は \`SigningScheme\` から来る。スキーム切り替えで type は変わるが、storage コード (単なる \`Vec<_>\`) は気にしない。Vote / commit certificate の wire 形式は変わる (BLS は aggregable signature を与える) ので、\`OpenHlCodec\` impl は更新が必要かもしれない。しかしコードの大半 — type、runner、engine_app — はスキーム選択に対して invariant だ。

## 7. \`SigningProvider\` — signing が実際に起こる場所

\`SigningScheme\` は signature が *どう見えるか* を定義する。\`SigningProvider\` は誰が *作る* かを定義する。2 つは別 trait だ; 分離は意図的だ。

\`OpenHlSigningProvider\` は \`crates/consensus/src/signing_provider.rs:18@0844d58\`:

\`\`\`rust
pub struct OpenHlSigningProvider {
    private_key: PrivateKey,
}
\`\`\`

1 フィールド。Validator の private key を持つ。

\`\`\`rust
impl SigningProvider<OpenHlContext> for OpenHlSigningProvider {
    fn sign_vote(&self, vote: OpenHlVote) -> SignedMessage<OpenHlContext, OpenHlVote> {
        sign_vote_with(vote, &self.private_key)
    }
    fn verify_signed_vote(&self, vote: &OpenHlVote,
                          signature: &Signature, public_key: &PublicKey) -> bool {
        public_key.verify(&vote_signing_bytes(vote), signature).is_ok()
    }
    // ... sign/verify pair for proposal、proposal_part、vote_extension
}
\`\`\`

全部で 8 メソッド — 4 つの signable メッセージ type (vote、proposal、proposal_part、vote_extension) に対する sign/verify pair。Signing 関数は \`crates/consensus/src/signing.rs\` の canonical-encoding ヘルパーに delegate する; verification は直接の \`public_key.verify(...)\`。

**なぜ \`SigningProvider\` を別 trait にしたのか — \`OpenHlContext\` のメソッドではなく?** なぜなら \`Context\` は純粋に *type-level* (type を選ぶが、state を持たない) だが、\`SigningProvider\` は private key — runtime state を持つからだ。Private key を \`Context\` に置くと、すべての Context インスタンスが key を持つことになり、それは間違いだ (key を持つのは validator のみ; observer は持たない)。

> 🛑 **反流暢性。** 「Context trait が validator を configure する場所だ。」 **違う。** Context は type を選ぶ; SigningProvider は key を持つ; validator set は identity を carry する。**3 つの別々の関心事、3 つの別々の trait。** これらを混ぜると、テストが難しく swap 不可能な単一 godclass になる。

## 8. 40 行の主張、検証

L4 の hook が「40 行の trait impl で chain にアイデンティティが生まれる」と主張した。足し算しよう:

| ファイル | 行数 | 何を impl したか |
| :--- | :--- | :--- |
| \`address.rs\` | 19 | \`Address\` + \`Display\` |
| \`height.rs\` | ~20 | \`Height\` + \`Display\` |
| \`value.rs\` | ~15 | \`Value\` |
| \`validator.rs\` | 73 | \`Validator\` + \`ValidatorSet\` + constructor |
| \`proposal.rs\` | ~35 | \`Proposal\` (6 accessor) |
| \`vote.rs\` | 54 | \`Vote\` (9 accessor) |
| \`proposal_part.rs\` | ~10 | \`ProposalPart\` (unit struct) |
| \`context.rs\` | ~90 | \`Context\` (10 type def + 4 method body) |

Type 約 230 LOC + Context impl 90 LOC = Module 2 deliverable 全体で ~320 LOC。「40 行」の主張は trait impl 限定だった (struct そのものではない); より広い codebase はその ~8 倍に landing する。

しかし load-bearing な決定の数は小さい: **どこにでも propagate する 2 つの設計選択。**

1. **CometBFT のソート convention** (\`voting_power desc, address asc\`) — すべての validator-set 構築に順序の合意を強制する
2. **20-byte Ethereum address フォーマット** — chain genesis で固定; 後続のすべてがそれを仮定する

どちらかを変えると consensus 実装全体が見直しを要する。残りの 318 行は確立した Rust convention に従う機械的な type 定義だ。

## 9. 練習

1. **Bound を覗き見せずに trace せよ。** 10 個の Context associated type それぞれについて、Malachite が要求する trait bound をリストせよ (sketch した後で §1 のテーブルを使え)。予測と比較せよ。
2. **Solana-address 実験。** \`OpenHlAddress\` が \`[u8; 20]\` ではなく \`[u8; 32]\` だと仮定せよ。\`crates/consensus/src/\` 配下 (SHA \`0844d58\`) のどのファイルが compile-error するか? (ヒント: discipline を保てば 1 つだけ — \`address.rs\` 自身。propagation は他のファイルには見えないはずだ。)
3. **Signing-scheme スワップ。** \`type SigningScheme = Ed25519\` を仮想的な \`Bls12_381\` impl に切り替える diff を sketch せよ。どの行が変わるか? どの行が残るか? (ヒント: 変わる行より残る行のほうが多い。)
4. **Validator-set ソート順 leak。** \`crates/consensus/src/context.rs:32@0844d58\` の \`OpenHlContext::select_proposer\` を読め。**2 validator が異なるソート順で validator set を持つと何が壊れるか?** Chain divergence シナリオを sketch せよ。

> **最終チェック。** 1 文で、なぜ \`Context\`、\`SigningProvider\`、\`ValidatorSet\` は別々の trait なのか (1 つの巨大 trait に collapse されていない)? 答えに「type-level vs runtime-state vs identity-set が 3 つの異なる関心事」が含まれていなければ、§7 を再読。`,
                },
                {
                  title: "malachitebft-engine の actor model",
                  slug: "openhl-malachite-engine-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 40,
                  content: `# \`malachitebft-engine\` の actor model

L3 は Malachite を「I/O を抜いた抽象 Tendermint アルゴリズム」と言った。本レッスンは I/O を *戻す* ものについてだ。**Consensus は時間を無視する state machine; engine がそれに時計を与える。**

Malachite の protocol ロジックは synchronous な \`Driver\` struct に住む — pure state machine、timer なし、network なし、thread なし。\`malachitebft-engine\` crate がそれを actor system (\`ractor\` 経由) でラップし、real consensus が必要とする runtime context — timeout、network socket、WAL write、mempool access — を提供する。

L4 の type は Malachite に *何が* お前の chain かを伝える。本レッスンは Malachite が *どう* それらの type を running node に変えるかについてだ。

> 🛑 **スクロール前に予測。** Consensus protocol は timeout (round-change、propose) のスケジューリング、network メッセージの受信、WAL への書き込み、application への decision 通知が必要だ。これらの tokio ベースアーキテクチャを sketch せよ。§2 で Malachite が実際にやっていることと比較する。

## 1. なぜ actor framework か

誘惑: \`tokio::spawn\` と channel を使えばいい。なぜ Malachite は ractor を使うのか?

3 つの理由:

| 必要なもの | tokio | ractor |
| :--- | :--- | :--- |
| 長時間並行 task を spawn | \`tokio::spawn(future)\` | \`Actor::spawn(name, args)\` |
| 特定の task にメッセージ送信 | \`tx.send(msg)\` (channel を自分で wire) | \`actor_ref.cast(msg)\` (組込) |
| 送信者に reply (request/response) | \`oneshot::channel\` でラップ | \`actor_ref.call(msg)\` (組込) |
| クラッシュした task の restart | DIY (catch_unwind、respawn) | supervision (組込) |
| Actor の pause/resume | DIY | \`actor_ref.stop()\` / \`start()\` |
| Pre-stop hook (クリーンシャットダウン) | DIY | trait method \`pre_stop\` |

これらすべてを tokio の上に build できる — しかし書き終えた抽象は正確に ractor になる。**複雑な multi-actor system (Consensus、Network、Wal、Sync、Host が連携) では boilerplate が積み上がる。** Malachite は ractor を選んだ; openhl はその選択を継承する。

> 🛑 **反流暢性。** 「ractor は \`tokio::spawn\` への単なる indirection だ。」 ほぼ違う。ractor は supervision、message ordering 保証、named actor lookup を提供する — さもなくば手書きすることになる。**5-actor system では load-bearing infrastructure であり syntactic sugar ではない。**

## 2. Actor topology

\`OpenHlNode::start()\` が \`start_engine\` を call するとき (openhl の Stage 6c → 6d)、engine は 5 つの actor を spawn する:

| Actor | どこに住むか | 何を所有 |
| :--- | :--- | :--- |
| **Consensus** | \`malachitebft-engine::consensus\` | \`Driver\` (state machine)、proposer-timeout タイマー、vote tallying |
| **Network** | \`malachitebft-engine::network\` | libp2p socket、gossipsub topic 購読、peer discovery |
| **Wal** | \`malachitebft-engine::wal\` | ディスク上 consensus メッセージの append-only log (\`get_home_dir()/wal\`) |
| **Host** (connector) | \`malachitebft-app-channel::connector\` | エンジンと **お前の** app loop の bridge (\`AppMsg\` イベント送信) |
| **Sync** | \`malachitebft-engine::sync\` | Peer catch-up — 遅れているとき欠けたブロックを fetch |

加えて我々自身の runtime concern:

| Component | どこに住むか | 何を所有 |
| :--- | :--- | :--- |
| **\`run_engine_app\` loop** | \`crates/consensus/src/engine_app.rs:29@0844d58\` | \`AppMsg\` を受信、\`ConsensusBridge\` メソッドを call、reply |

これは actor ではない — 我々自身が spawn する async task だ。しかし Host actor の application 側 counterpart である: engine が \`AppMsg\` 経由で我々に質問し、loop が \`oneshot::Reply\` channel 経由で答える。

## 3. \`AppMsg\` channel — 何が入り、何が出るか

app-channel の \`Channels<Ctx>\` struct:

\`\`\`rust
pub struct Channels<Ctx: Context> {
    pub consensus: mpsc::Receiver<AppMsg<Ctx>>,    // engine → us
    pub network: mpsc::Sender<NetworkMsg<Ctx>>,    // us → network actor
    pub events: TxEvent<Ctx>,                      // observer subscribe 用
}
\`\`\`

3 channel:

1. **\`consensus\`** — engine が我々に何かを聞いてくる。\`AppMsg::GetValue\`、\`AppMsg::Decided\`、その他すべて (L11 / L13 で walk した)。
2. **\`network\`** — 我々が network actor に何かを伝える。主な使い道は 2 つ: \`PublishProposalPart\` (streaming proposal 用; openhl は使わない) と \`BroadcastConsensusMsg\` (vote 転送用)。
3. **\`events\`** — 外部 observer (metrics、ログ、downstream consumer) 向けの read-only イベントストリーム。

我々の \`run_engine_app\` は \`consensus\` からしか consume しない。\`network\` には publish しない — Malachite は Consensus actor 経由で内部的に vote broadcast を handle する。**Network channel は application 層の network injection が必要な chain 用** (例: consensus と並行して commitment を送る DA layer); openhl は不要だ。

## 4. Consensus actor の役割

\`malachitebft-engine::consensus::Consensus\` の Consensus actor が Malachite の protocol Driver が実際に動く場所だ。仕事:

1. Network actor から consensus メッセージ受信 (peer proposal、peer vote)
2. それらを \`Driver::Input\` として protocol state machine に feed
3. \`Driver::Output\` 処理 — timeout のスケジュール、Network 経由の vote broadcast、Host への \`Decide\` 通知
4. Round 遷移、timeout、view change の管理

openhl ではこのコードを見ない。**我々のコードは Driver を直接 invoke できない** — それが意図的だ。Driver は actor の後ろに shield されている; input を送る唯一の方法は Consensus actor にメッセージを送ること、output を読む唯一の方法は Host connector から \`AppMsg\` を受信することだ。**我々の \`run_engine_app\` loop はその会話の application 側だ。**

\`crates/consensus/src/runner.rs:34@0844d58\` の \`run_single_validator\` と比較せよ — Driver を actor ラッパーなしで直接使う。あれは Stage 5 (pedagogical) だった; Stage 6 が actor でラップした。**両方とも同じ chain 挙動を produce する**; actor 版が production-shape のものだ。

## 5. Network + WAL actor

Network actor は libp2p をラップする:

- Consensus メッセージ用の gossipsub topic 管理
- \`ConsensusCodec\` 経由で outgoing vote/proposal を encode (Stage 6b → 現在 stub impl; openhl \`crates/consensus/src/codec.rs\` のソースで stub set を参照)
- Incoming メッセージを decode して Consensus に forward
- Peer discovery を handle

Single-validator mode (peer なし) では、Network actor は依然として spawn する — libp2p が \`/ip4/127.0.0.1/tcp/0\` で listen し始める — が、inbound メッセージは無く、誰にも broadcast しない。**Single-validator mode では no-op になる**、これが \`OpenHlCodec\` の gossip stub (Stage 6b) が error を返してもうまくいく理由だ: 何もそれらを encode していない。

WAL actor は crash recovery のために consensus メッセージをディスクに書く:

- 署名したすべての \`Vote\` と \`Proposal\` は broadcast 前に persist される
- すべての \`Decided\` 値は bridge が commit する前に persist される
- Restart 時に WAL は engine が consensus を再開する前に replay される

Single-validator mode では WAL write は起こるが replay されない (テストは cleanup される tempfile home_dir を使う)。**Production では、WAL が validator restart にまたがって chain を durable にするものだ。**

> 🛑 **予測。** Round の途中で openhl を再起動するとどうなるか (vote 投じ後、round 決定前)?

WAL なし: 再起動時、engine は前の vote を覚えていない。Peer が「お前は値 X に投票した」と覚えていて、再起動時にお前が値 Y に投票したら、お前は equivocate した — production BFT chain では slashable な offense だ。WAL あり: 再起動時、engine は前の vote を replay し、お前が X に投票したことを見て、Y への投票を拒否する。**WAL が single-machine consensus が restart にまたがる self-equivocation を回避する方法だ。**

## 6. Malachite gotcha 1 つ — proposal-part streaming

Malachite は 3 つの \`ValuePayload\` mode をサポートする (L4 §5 で最後に登場):
- \`ProposalOnly\` — 値が 1 つの \`Proposal\` メッセージに収まる。openhl はこれを使う。
- \`PartsOnly\` — 値が chunk で stream される。
- \`ProposalAndParts\` — 両方。

\`PartsOnly\` または \`ProposalAndParts\` を使うと、network actor は per-proposer per-round の *stream* を維持する。Host actor は part が到着するたびに reassemble し、「full proposal 到着」を \`AppMsg::ReceivedProposalPart\` の \`reply: Option<ProposedValue>\` 経由でシグナルする。我々の \`run_engine_app\` loop は全 part が到着するまで \`None\` で reply; その後 \`Some(full_value)\`。

**openhl はこれを完全に skip する** (\`ProposalOnly\`)、そのため \`AppMsg::ReceivedProposalPart\` は我々には絶対に fire しない。しかし大きな proposal を持つ chain 用に openhl を fork するなら (例: 10MB の pending fill を value が carry する CLOB chain)、stream-reassembly path を実装する必要がある。

注意すべき gotcha: **part-streaming コードは \`malachitebft-engine::util::streaming\` に住む**、app loop ではない。\`ConsensusConfig::value_payload\` で configure する; engine が残りを handle する。**お前は streaming コードを書かない; value-reassembly ロジックを書く。**

## 7. 練習

1. **Actor をマップせよ。** 何も見ずに、engine が spawn する 5 actor をリストせよ。各々について、所有する関数 1 つと produce する channel/message 1 つを名指せ。
2. **Actor seam を見つけよ。** \`crates/consensus/src/node.rs::OpenHlNode::start@0844d58\` を読め。Engine actor system が start される行を identify せよ (ヒント: \`malachitebft_app_channel::start_engine(...)\` call)。openhl が engine に何を与え、何を受け取るか?
3. **Actor-vs-Driver 比較。** \`crates/consensus/src/runner.rs:34@0844d58\` の \`run_single_validator\` (Driver 直接、sync loop) と \`crates/consensus/src/engine_app.rs:29@0844d58\` の \`run_engine_app\` (AppMsg loop、async) を比較せよ。Driver が produce する \`Output<Ctx>\` variant それぞれに対して、相当する AppMsg variant を identify せよ。Mapping は 1:1 か?
4. **Single-validator no-op。** openhl が single-validator で動くとき、Network actor は start するが絶対にメッセージを受信しない。**なぜ consensus は peer vote を待って halt しないのか?** ヒント: proposer 自身の vote が何を寄与するかを考えよ。

> **最終チェック。** 1 文で、\`Driver::process\` を直接 call する (\`run_single_validator\` がするように) と得られないものを、actor system が与えてくれるのは何か? 答えに「timer、network、persistence、supervision」が含まれていなければ、§1 + §2 を再読。`,
                },
              ],
            },
          },
          {
            title: "ライブラリとしての Reth",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "Geth 形を捨てた Reth — NodeBuilder と component",
                  slug: "openhl-reth-nodebuilder-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 40,
                  content: `# Geth 形を捨てた Reth — NodeBuilder と component

**Reth を fork しない。configure する。** 初めて Reth に近づくチームは \`git clone paradigmxyz/reth\` に手を伸ばし、\`bin/reth/src/main.rs\` を編集し、即座に技術的負債を積み上げる — upstream の bump 1 回ごとに merge conflict だ。

正しい道は \`reth-node-builder::NodeBuilder\` だ。Component (consensus engine、payload builder、block validator) をスワップしつつ、それ以外 (DB、mempool、RPC、network) を Reth のデフォルトのまま使える fluent API だ。結果: openhl の \`LiveRethEvmBridge\` は fork を維持せずに real Reth node に対して動く。

本レッスンは「何を replace するか」と「何を keep するか」の seam についてだ。読み終える頃には、典型的な L1 chain でカスタムコードが必要な Reth の 5% と、なぜ残りの 95% を upstream デフォルトに残すべきかが分かる。

> 🛑 **スクロール前に予測。** カスタム consensus (Malachite/HotStuff 系) を持つが普通の EVM execution を使う L1 を build している。Reth の ~30 個の component (DB、mempool、payload builder、network、RPC、transaction pool、validator set provider 等) のうち、**どれを replace してどれをデフォルトのままにする?** §3 を読む前にリストを sketch せよ。

## 1. Reth を fork する誘惑

最も抵抗が少なく見える道:

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth
# bin/reth/src/main.rs を編集して consensus を plug in
# crates/payload/builder/... を編集して payload semantics を変更
# ... やがて 40 ファイルにまたがる 200 行の patch を持っていることに気付く
\`\`\`

3 ヶ月後、Reth が v2.3.0 をリリース。Patch を rebase しようとする。半分が refactor されたファイルにある。Merge に 1 週間かかる。**fork してしまった**、そして永久にその fork を維持することになる。

\`NodeBuilder\` パターンはまさにこれを避けるために存在する。Reth の作者は downstream chain が consensus と payload assembly を swap したがることを認識している。Trait ベースの component アーキテクチャがサポートされた答えだ。

> 🛑 **反流暢性。** 「我々の chain は trait surface には custom すぎるので Reth を fork する必要がある。」 **ほぼ常に違う。** カスタマイズが「異なる consensus」「異なる payload selection」「異なる block validation rule」なら、trait はそのために設計されている。Fork するのは *storage engine* (MDBX → 他) を変える必要があるか *EVM 自体* (カスタム opcode) を変える必要があるときだけだ — どちらも極めて稀。

## 2. \`NodeBuilder\` の component trait

Reth の \`NodeBuilder\` は各 component にどの type が impl するかを宣言する fluent API を expose する。デフォルトの \`EthereumNode\` 構成はすべてに Reth 自身の実装を plug in する; 個別 slot を自分の type を提供して swap する。

Component trait、機能でグループ化:

| Component カテゴリ | 何をするか | openhl で replace する? |
| :--- | :--- | :--- |
| **DB** (\`Database\`) | MDBX-backed storage | **しない** — Reth のものを keep |
| **Provider** (\`BlockchainProvider\`) | DB 上の read API | **しない** — Reth のものを keep |
| **Network** (\`NetworkHandle\`) | devp2p / discv5 / RLPx | **おそらく しない** — compat のため keep、single-CL では peer discovery を disable してもよい |
| **Pool** (\`TransactionPool\`) | Mempool | **しない** — Reth のものを keep |
| **EVM** (\`ConfigureEvm\`) | EVM config、precompile、hardfork | **多分** — カスタム precompile (openhl の Module 3) で replace |
| **Consensus** (\`Consensus\`) | Block レベルの validation rule (PoW/PoS gadget) | **する** — Reth の gadget ではなく Malachite を使う |
| **PayloadBuilder** | mempool からブロックを assemble | **多分** — v0 ではデフォルト keep、CLOB がカスタム ordering を要したら replace |
| **EngineApi** | CL ↔ EL 会話 surface | **異なる transport** — openhl は JSON-RPC ではなく in-process trait |
| **RPC** (\`RpcEthApi\`) | eth_* JSON-RPC method | **しない** — compat のため keep |

"しない" の row が Reth のコードの ~80%。"する" / "多分" の row が典型的 BFT L1 のカスタマイズ surface だ。

## 3. 何を keep するか — Reth が正しくやる 5 component

Reth の MDBX-backed storage、BlockchainProvider、mempool、networking stack、RPC server は mature で十分にテストされており、downstream-compatible だ (mainnet Reth と話すウォレットは openhl の RPC とも変更なしで話せる)。**これらのどれを replace しても multi-month プロジェクトでアップサイドゼロだ。**

具体的に:

- **MDBX**: LMDB より速く、Erigon と Reth で battle-tested; replace するとは storage engine を書き直すことを意味する
- **BlockchainProvider**: 他の component すべてが依存する read API; replace すると ~10 trait impl にカスケードする
- **TransactionPool**: EIP-1559 ordering、replacement rule、blob-tx サポートを持つ mempool; 再現するエッジケースが ~30k LOC
- **Network**: devp2p 互換性は既存 peer から sync できることを意味する; 失うと Ethereum インフラから bootstrap できない
- **RPC**: すべてのウォレット、indexer、explorer が \`eth_getBlockByNumber\`、\`eth_call\` 等を期待する; 再実装するとエコシステム全員が chain を special-case する必要が生じる

全 5 つ keep せよ。実際に変更する必要のある component にエンジニアリング予算を取っておけ。

## 4. 何を replace するか — openhl がカスタマイズする 3 component

| Component | なぜ replace | openhl のどこ |
| :--- | :--- | :--- |
| **Consensus** (\`Consensus\` trait) | Reth のデフォルトは Ethereum の PoW/PoS gadget; 我々は Malachite を使う | 暗黙的 — Reth の \`Consensus\` trait に engage しない; Malachite が chain を外部から駆動 |
| **EngineApi transport** | Reth デフォルトは JSON-RPC; 我々は in-process Rust trait | openhl の JSON-RPC engine API の代わりに \`ConsensusBridge\` (L1/L7/L9) |
| **PayloadBuilder** | Module 2 の CLOB がカスタム transaction ordering を必要とする | v0 ではまだ replace されていない — 何が変わるかは L8 を参照 |

Replace されない *もの* に注意: EVM、storage engine、mempool、RPC。**openhl は stock Reth の 90%** で、consensus と engine transport が swap out されている。Stock EVM semantics 上のカスタム consensus chain には正しい比率だ。

## 5. 我々の codebase の dev-node 例

\`crates/evm/src/reth_node.rs:74@0844d58\` — Stage 7a の smoke test を見よ:

\`\`\`rust
async fn launch_and_check() -> Result<()> {
    let runtime = Runtime::test();
    let chain_spec = dev_chain_spec();
    let expected_chain_id = chain_spec.chain.id();

    let node_config = NodeConfig::test().dev().with_chain(chain_spec);

    let NodeHandle {
        node,
        node_exit_future: _,
    } = NodeBuilder::new(node_config)
        .testing_node(runtime)
        .node(EthereumNode::default())
        .launch_with_debug_capabilities()
        .await?;

    let observed_chain_id = node.chain_spec().chain.id();
    assert_eq!(observed_chain_id, expected_chain_id);
    Ok(())
}
\`\`\`

行ごとに読め:

1. **\`Runtime::test()\`** — テスト用の軽量 tokio runtime (real デプロイは long-running tokio runtime を使う)
2. **\`dev_chain_spec()\`** — chain ID 2600、dev genesis (L12 で walk した)
3. **\`NodeConfig::test().dev().with_chain(chain_spec)\`** — Reth の "dev mode" preset + 我々の chain spec。\`dev()\` は peer discovery を disable し、debugging conveniences を有効にする; production が使うものではない。
4. **\`NodeBuilder::new(node_config).testing_node(runtime).node(EthereumNode::default())\`** — API の心臓部。**我々は \`EthereumNode::default()\` を使っている** — Reth の stock 構成、全 component がデフォルト。カスタマイズするには \`.node(EthereumNode::default())\` を \`.node(OpenHlEthereumNode::new())\` 等にスワップする。
5. **\`.launch_with_debug_capabilities().await?\`** — 全 actor を spawn、listen を start、DB を open。
6. **\`node.chain_spec().chain.id()\`** — node が見ている chain が我々が構成したものと一致するか sanity check。

**これがパターン全部だ。** ~10 行の glue。複雑さは我々のコードではなく Reth の \`NodeBuilder\` 内部にある。**Production openhl node は ~50 行** — これに加えて listen port、data directory、validator keypair の構成。

## 6. なぜこれが openhl の long-term にとって重要か

NodeBuilder パターンは openhl を 3 つのことに対して future-proof にする:

1. **Reth バージョン bump** — Reth が v2.3.0 をリリースしたら、\`workspace.dependencies\` の SHA を 1 つ変えて \`cargo update\` を走らせる。Trait surface は minor バージョン間で安定; patch を merge する必要がない。
2. **カスタム precompile** (openhl の Module 3) — CLOB-reading precompile を追加するとき、\`ConfigureEvm\` slot を replace。残りの Reth はデフォルトのまま。
3. **カスタム payload builder** (openhl の Module 2) — CLOB がカスタム transaction ordering を必要とするとき、\`PayloadBuilder\` slot を replace。Mempool、EVM execution、state computation はデフォルトのまま。

**各カスタマイズは slot であり fork ではない。** それが NodeBuilder 設計の価値だ。

## 7. 練習

1. **Slot を identify せよ。** §2 のテーブルから、9 つの component カテゴリと openhl が各々を replace するかを名指せ。何も見ずに、後続モジュールで replace を検討するであろう 4 つを書き出せ。
2. **Fork の誘惑を見つけよ。** openhl リポで \`reth-*-builder::*\`、\`reth-storage-api\`、\`reth-consensus\`、\`reth-chainspec\`、または alloy より *深い* Reth crate パスを import しているコードを検索せよ。**深い import は「trait surface が expose していないものが必要だった」のサインだ。** これは我々のカスタマイズについて何を示唆するか?
3. **カスタム EVM 実験。** openhl がカスタム EVM opcode を欲しがると仮定 (real Module 3 領域)。\`crates/evm/src/reth_node.rs\` への diff を sketch せよ: どの \`EthereumNode\` slot を replace し、お前のカスタム type はどの trait を impl するか?

> **最終チェック。** 1 文で、なぜ \`NodeBuilder::new(config).node(EthereumNode::default())\` は \`git clone reth && edit main.rs\` より良いパターンか? 答えに「upstream-trackable」または「codebase 全体を fork せずに component を swap」が含まれていなければ、§1 を再読。`,
                },
                {
                  title: "Engine API — forkchoice_updated と new_payload が実際に何をしているか",
                  slug: "openhl-engine-api-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 40,
                  content: `# Engine API — \`forkchoice_updated\` と \`new_payload\` が実際に何をしているか

午前 3 時。同じマシン上の 2 つのサービス — Reth プロセスと Lighthouse プロセス — が、**正確に 2 つの RPC メソッド** だけをやり取りしている。これが Ethereum の consensus layer と execution layer の間の会話のすべてだ。この 2 つのメソッドに名前を付け、openhl の実コードでそれらを trace し、実際の validator がそれらを honestly に実装することを強制するさまを見たとき、なぜ HL や Tempo のようなチェーンが Ethereum の 12 秒に対してサブ秒 finality を提供できるかが理解できるようになる。

> 🛑 **スクロール前に予測。** 2 つのメソッド、3 つの forkchoice ポインタ (head/safe/finalized)、1 つの payload-build hint、1 つの validation result。それぞれのメソッドが何を入力に取り何を返すかを紙に sketch してみよ。後で実際の spec と、\`crates/evm/src/live_node.rs:68@0844d58\` のコードに照らし合わせて検証する。

## 1. 会話に名前を付ける

Ethereum の Engine API — CL が EL と話すあらゆる場所で使われる — は active な call が 3 つある:

- \`engine_forkchoiceUpdatedV3\` — 「新しい head/safe/finalized state はこれだ。オプションで、この head から payload を build せよ。」
- \`engine_getPayloadV3\` — 「以前 build を開始した payload をくれ。」
- \`engine_newPayloadV3\` — 「このブロックを実行して、valid かどうか教えてくれ。」

3 つの call だが、概念的には 2 つの操作だ: \`forkchoiceUpdated\` + \`getPayload\` を合わせて 1 つの操作 (ブロックを build する) になる。これが「2 つのメソッド」フレーミングの根拠。

ここに **無い** ものに注意。「次の決定を送れ」という call は **無い**。CL は EL に「何を決定すべきか」を尋ねない。決定は CL 側で下される; EL は決定された内容を告げられる。

## 2. \`forkchoice_updated\` — 1 つのメソッドに 2 つの目的

\`\`\`
forkchoiceUpdated(ForkchoiceState, Option<PayloadAttributes>) → ForkchoiceUpdatedResponse
\`\`\`

\`ForkchoiceState\`:
- \`headBlockHash\` — EL が canonical head とみなすべきもの
- \`safeBlockHash\` — reasonably finalized なもの (PoS 用語では justified)
- \`finalizedBlockHash\` — 不可逆的に finalized なもの

\`PayloadAttributes\`:
- \`timestamp\`、\`prevRandao\`、\`suggestedFeeRecipient\`、加えて optional フィールド

何をするか:
- **常に**: EL の head/safe/finalized の view を更新する。
- **attrs が Some の場合**: 加えて payload-build job を開始し、後で結果を取得するための \`PayloadId\` を返す。

> 🛑 **予測。** なぜ \`forkchoice_updated\` は optional な payload-attribute 引数を取るのか? なぜ別の \`start_build_payload\` call にしないのか? ヒント: proposer の hot path における CL と EL の round-trip 数を数えてみよ。

答え: **amortization (償却)**。Proposer のもっともレイテンシ的にセンシティブな瞬間は自分の slot の開始時だ。「fork-choice を進める」と「build を開始する」が 2 つの別 call なら、2 RTT を支払う。Bundle すれば 1 RTT で済む。サブ秒 slot を狙う HyperBFT のような CL にとって、これは viable かどうかの違いになる。

## 3. \`new_payload\` — 「これを実行して valid か教えてくれ」

\`\`\`
newPayload(ExecutionPayload) → PayloadStatus
\`\`\`

CL が peer の proposal を受け取ると、投票する前に EL に validate してくれと頼む。EL は:
- transactions を re-execute する
- 結果として得られる state root を compute する
- proposed state root と比較する
- 一致すれば \`Valid\`、しなければ \`Invalid\`、EL が遅れていれば \`Syncing\` を返す

> 🛑 **反流暢性。** 「CL がブロックを validate する。」 **違う。** CL は *consensus rules* を validate する — 署名、fork-choice、justification。EL は *ブロックの内容* を validate する — execution、state、receipts。これらを混同すると、validation を間違った場所に配線することになる。

## 4. Async asymmetry — \`getPayload\`

\`forkchoice_updated(parent, Some(attrs))\` は \`PayloadId\` を直ちに返す。ブロックはまだ build されていない — EL はバックグラウンドジョブを開始し、mempool から transactions を引き出し、state を compute している。

CL がブロックを必要とするとき (自分の propose deadline が到来したとき)、\`getPayload(id)\` を call して取得する。

なぜ decouple するのか? **投票中に build する。** 前のブロックはまだ投票されている。EL は前のブロックが finalize される *前から* 次のブロックの build を開始できる。CL が propose する番になる頃には、新しいブロックはすでに組み立てられている。

| タイミング | 操作 | レイテンシ予算 |
| :--- | :--- | :--- |
| 前のラウンド進行中 | EL がバックグラウンドで次の payload を build | 100–400ms |
| 自分の slot 開始 | CL が \`getPayload(id)\` を call | < 5ms |
| Payload 取得 | CL が proposal を gossip | network-bound |

Async split が無ければ、propose は build を待たなければならない。この単一の設計選択が、高速 L1 を可能にしている。

## 5. openhl: in-process、名前は違うが、形は同じ

openhl は CL と EL を 1 つのバイナリで動かす。だから我々の「Engine API」は JSON-RPC ではなく Rust の trait surface だ。しかし *形* は identical だ。

\`crates/consensus/src/bridge.rs:11@0844d58\` の \`ConsensusBridge\` trait が openhl の Engine API である:

\`\`\`rust
async fn build_payload(&self, parent: BlockHash, attrs: PayloadAttrs)
    -> Result<PayloadId, BridgeError>;
async fn payload_ready(&self, id: PayloadId)
    -> Result<ExecutedBlock, BridgeError>;
async fn validate_payload(&self, block: &ExecutedBlock)
    -> Result<PayloadStatus, BridgeError>;
async fn commit(&self, block_hash: BlockHash)
    -> Result<(), BridgeError>;
\`\`\`

それぞれを Ethereum にマップする:

| openhl | Ethereum 相当 |
| :--- | :--- |
| \`build_payload(parent, attrs)\` | \`forkchoiceUpdated(state{head=parent}, Some(attrs))\` で \`PayloadId\` を返す |
| \`payload_ready(id)\` | \`getPayload(id)\` |
| \`validate_payload(block)\` | \`newPayload(block)\` |
| \`commit(block_hash)\` | \`forkchoiceUpdated(state{head=hash, finalized=hash}, None)\` |

同じ 4 つのメッセージ、違う名前。Semantic マッピングは **exact** である。

In-process にすることで節約するもの:
- JSON-RPC encoding overhead (1 call あたり ~1–5ms) なし
- HTTP/TCP の round-trip なし
- 型付き Rust value の hex 文字列 JSON への serialization なし
- 境界での strong typing — コンパイラが mismatch をキャッチする

In-process にすることで失うもの:
- Client diversity (Ethereum は CL/EL を mix-and-match できる; 我々はできない)
- ネットワーク debug 可能な transport (JSON-RPC は人間可読)

openhl の設計ポイント (single-team L1、サブ秒 finality) では、この trade は明らかに正しい。**そして client diversity が欲しくなった場合でも、trait は小さいので後で JSON-RPC 経由で expose できる — contract はすでに存在する。**

## 6. Validator が honesty を強制する

openhl の歴史でもっとも pedagogically valuable な瞬間は、\`crates/evm/src/live_node.rs:139@0844d58\` で \`validate_payload\` を Reth の実 \`EthBeaconConsensus::validate_header_against_parent\` に配線したときだった。

テストが red になった。Reth の validator は我々のそれまで問題なかった \`build_payload\` の出力を即座に reject した。理由は:
- \`gas_limit: 0\` (default Header value)
- \`base_fee_per_gas: None\` (default)
- \`difficulty: 0\` (post-merge 用) すら気にしていなかった

Reth の validator はすべてキャッチした。修正は validator を緩めることではなく — \`build_payload\` に real production-shape の header を生成させることだった:

\`\`\`rust
let next_base_fee = self
    .chain_spec
    .next_block_base_fee(parent_header, our_timestamp);

let header = Header {
    parent_hash: parent_b256,
    number: parent_header.number + 1,
    timestamp: our_timestamp,
    gas_limit: parent_header.gas_limit,        // no drift
    difficulty: U256::ZERO,                    // post-merge
    base_fee_per_gas: next_base_fee,           // EIP-1559 math
    ..Default::default()
};
\`\`\`

Base-fee 計算は、Reth の validator が base-fee を *verify* するために使う同じヘルパー (\`ChainSpec::next_block_base_fee\`) を call する。**構築によって** 両者は一致する — 偶然ではない。

> 🛑 **反流暢性。** 「\`validate_payload\` は後で実装するよ。」 **順番が違う。** Validation を先にやる。なぜなら real validation こそが real construction を強制するからだ。\`build_payload\` を permissive validator (またはまったく validator なし) に対して実装すると、見た目は問題ないが、real node が validate しようとしたときに 3 層下で失敗する header を ship することになる。

これが L7 のレッスンを具体化したものだ: Engine API は受動的な形ではない。**Active な discipline (規律)** である。Reth の validator が spec そのものであり、その上のすべては validator のルールに従わなければならない。

## 7. 練習

1. **メソッドをマップする。** 何も見ずに、openhl の \`ConsensusBridge\` の 4 つのメソッドとそれぞれの Ethereum Engine API 相当を書き出せ。
2. **Build-while-voting moment を見つける。** \`crates/consensus/src/engine_app.rs\` で \`AppMsg::GetValue\` arm を見つけよ。それに相当する Ethereum の sequence は何か? (Cheat sheet: CL の \`engine_forkchoiceUpdated(state, Some(attrs))\` のあとに \`getPayload\`。)
3. **Validator-forcing。** \`crates/evm/src/live_node.rs:68@0844d58\` の \`LiveRethEvmBridge::build_payload\` を読め。どのフィールドが \`Default\` ではなく non-trivial にセットされているかを identify せよ。それぞれについて、もし default のままにしていたら \`EthBeaconConsensus\` のどの sub-check が失敗していたかを名前を挙げよ。

> **最終チェック。** 1 文で、なぜ openhl は素朴に 1 つで済むと思える場所に 2 つの関数 (\`build_payload\` + \`payload_ready\`) を必要とするのか? 答えに「build-during-voting parallelism」または「proposer の hot-path latency」が含まれていなければ、§4 を再読。`,
                },
                {
                  title: "ブロックはどこから来るか — Reth 内の payload 構築",
                  slug: "openhl-payload-building-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 40,
                  content: `# ブロックはどこから来るか — Reth 内の payload 構築

\`forkchoice_updated(parent, attrs)\` (L7 の request) と \`getPayload(id)\` (L7 の fetch) の間で、**Reth がブロックを assemble する**。その間隔で何が起こるか — そして openhl 固有の seam がどこに行くか — を知ることが、ship する chain と謎の stall をする chain の違いだ。

本レッスンは Reth の \`PayloadBuilderService\` (L11 の "async trick" セクションが forward reference した production-shape の payload assembly) を walk し、openhl が現在代わりに何をしているか (空ヘッダを synthesize) を名指し、Module 2 の CLOB がどこに plug in するかを preview する。

> 🛑 **スクロール前に予測。** CL が「payload を build せよ」と言う瞬間から EL が「state root X のブロックがここに」と言う瞬間まで、Reth が走らせるすべての operation を名指せ。ヒント: 少なくとも 4 つある、そのうち 1 つが他より latency で支配する。

## 1. ライフサイクル、request からブロックまで

L7 からの Engine API call:

\`\`\`
forkchoiceUpdated(state{head=parent}, Some(attrs)) → PayloadId
                                                       │
                                                       ▼ (後で)
                          getPayload(id) → ExecutionPayload
\`\`\`

\`forkchoiceUpdated\` (即座に \`PayloadId\` を返す) と \`getPayload\` (組み立てたブロックを fetch) の間で、Reth の \`PayloadBuilderService\` は次のパイプラインを走らせる:

| Step | Owner | 何が走るか |
| :--- | :--- | :--- |
| 1 | PayloadBuilderService | build-job request 受信; \`PayloadId\` 割り当て |
| 2 | \`EthereumPayloadBuilder\` | mempool (\`TransactionPool\`) から transaction を pull |
| 3 | \`EthereumPayloadBuilder\` | Ordering ポリシー適用 (priority fee、EIP-1559、nonce) |
| 4 | \`EthEvm\` (BlockExecutor) | Parent state に対して transaction を execute; gas を track |
| 5 | \`EthEvm\` | Merkle Patricia Trie 経由で state root を compute |
| 6 | \`EthereumPayloadBuilder\` | Header を assemble (state_root、receipts_root 等とともに) |
| 7 | PayloadBuilderService | 結果をキャッシュ、\`PayloadId\` が ready と signal |

Step 2-5 が wall clock を支配する。**Step 4 (real EVM execution) は通常 full block で 50-300ms かかる**; step 5 (state root) がさらに 50-150ms 追加。

\`EthereumPayloadBuilder\` は \`reth_ethereum::node::EthereumPayloadBuilder\` (Reth v2.2.0 source の \`reth-ethereum-payload-builder\` から) に住む。\`reth-payload-builder\` の \`PayloadBuilder\` trait を impl する。**上記の各 step は我々のコードではなく Reth のコードの中だ。**

## 2. Transaction 選択 — \`Pool::best_transactions\`

\`TransactionPool\` trait (\`reth-transaction-pool::TransactionPool\`) は tx を優先順で yield する \`best_transactions()\` メソッドを expose する。デフォルトの ordering ポリシー:

1. **EIP-1559 effective tip first** — \`min(max_priority_fee, max_fee - base_fee)\` 降順
2. **送信者内で nonce 順** — 同じ address で nonce 4 より先に nonce 5 を含められない
3. **Replacement rule** — 同じ nonce でより高い fee の新しい tx が古い tx を replace

Pool が除外するもの:
- Gas が \`block_gas_limit\` を超える tx
- ブロック内の事前 tx 後に sender の balance が不足する tx
- Revert する tx (一部の pool 構成 — 多くは「含めて revert させる」semantics)

**Pool は mempool-aware だ。** Peer が broadcast したがまだ含まれていない txn、RPC 経由で submit されたローカル txn を知っている; すべてを priority queue で track している。

> 🛑 **反流暢性。** 「Payload building は順番に transaction を実行するだけだ。」 **違う。** どの transaction を含めるか — そしてどの順番で — の *選択* が仕事の半分だ。Ordering ポリシーは fee revenue、transaction fairness、(重要なことに) MEV opportunity を決定する。**Ordering ポリシーの変更は chain が行える最も consequential なカスタマイズの 1 つだ。**

## 3. State root 計算 — execution が数字になる場所

Step 4 (transaction 実行済み) の後、EVM は state diff を持つ: 修正された account、touch された storage slot、更新された balance。Step 5 はこれを単一の 32-byte \`state_root\` ハッシュに condense する:

1. すべての state 変更を parent の state trie (Merkle Patricia Trie) に適用
2. Trie root を recompute
3. 結果が \`state_root\` — post-block state への canonical commitment

これが **expensive な部分**だ。~1000 account を touch する full mainnet block の新しい trie root 計算には、parent state がどれだけ cache されているかにもよるが 100ms+ かかる。

State root は \`validate_header_against_parent\` が check *しない* (できない — execution していない) が \`validate_block_post_execution\` が check するものだ。**同じブロックに対して異なる state root を compute する 2 validator は determinism バグを持つ** (L2 §2 領域)。これが state-root mismatch が chain fork の代表的な failure mode である理由だ。

Reth の trie 計算は高度に最適化されている — state diff が十分大きいときコアにまたがって hash 計算を並列化する。**Reth を fork しない理由の 1 つ** (L6 §3) は、すべてこれを diminishing returns で再現することになるからだ。

## 4. openhl が現在何をしているか (vs production-shape)

\`crates/evm/src/live_node.rs:68@0844d58\` の openhl の \`LiveRethEvmBridge::build_payload\` と比較せよ:

\`\`\`rust
let parent_sealed = self.provider.sealed_header_by_hash(parent_b256)?
    .ok_or_else(|| BridgeError::Rejected(...))?;
let parent_header = parent_sealed.header();

let next_base_fee = self.chain_spec.next_block_base_fee(parent_header, our_timestamp);

let header = Header {
    parent_hash: parent_b256,
    number: parent_header.number + 1,
    timestamp: our_timestamp,
    gas_limit: parent_header.gas_limit,
    difficulty: U256::ZERO,
    base_fee_per_gas: next_base_fee,
    ..Default::default()
};
let hash = header.hash_slow();
\`\`\`

§1 の 7 step パイプラインと比較せよ:

| Step | Production Reth | \`0844d58\` の openhl |
| :--- | :--- | :--- |
| 1. PayloadId 割り当て | PayloadBuilderService | In-memory counter (\`pending\` HashMap) |
| 2. Transaction を pull | \`Pool::best_transactions\` | **Skip** — まだ transaction なし |
| 3. Ordering 適用 | EIP-1559 priority fee math | **Skip** |
| 4. EVM で execute | EthEvm + receipts | **Skip** — 空 body |
| 5. State root を compute | Merkle Patricia Trie | **Skip** — state_root = parent_header.state_root (暗黙) |
| 6. Header を assemble | \`EthereumPayloadBuilder\` | 完了 — ほぼデフォルトフィールド |
| 7. 結果をキャッシュ | PayloadBuilderService | In-memory HashMap |

**7 step のうち 5 つが skip されている。** これは SHA \`0844d58\` の openhl がまだ real transaction を produce していないからだ — CLOB (openhl の Module 2) がそれらの source だ。そのモジュールが ship するまで、bridge はヘッダレベル validation (L7 §6 — validator-forcing-honesty moment) は通るが実際の transaction を含まない空ヘッダを synthesize する。

7 step パイプラインが重要なのは、**production-shape の PayloadBuilder を swap in することが Module 2 の最初のステージ** だからだ。CLOB が fills を produce し始めると、それらが transaction になり、bridge は real builder を使い始める。

## 5. openhl がどこに plug in するか — Module 2 の preview

Module 2 への L8 forward reference:

> *"OpenHL が後で CLOB-fill transaction を注入する場所"*

openhl の CLOB 統合計画:

1. **CLOB エンジン** (\`crates/clob/src/\`) が chain 実行中に matched fill を produce
2. **各 fill が transaction になる** — EVM 経由の buyer-seller 間の account 転送
3. **Transaction pool** がこれらの fill をユーザ submit の txn と並んで受信
4. **カスタム \`PayloadBuilder\`** (L6 §4 の EthereumPayloadBuilder slot を replace) が payload-assembly order でユーザ tx より CLOB fill を優先
5. **標準 Reth state 計算が走る** — 新しい state root はユーザ tx と CLOB fill の両方を反映

ここで openhl が *generic EVM* ではなく *perp DEX* になる。Mechanical な部分 — 1 つの Reth component を replace すること — は小さい (L6 の NodeBuilder パターン in action)。興味深い部分は CLOB matching ロジック自体で、これは rethlab コースの Module 2 だ。

**L8 はモジュール間の bridge だ。** 学習者に伝える: 「お前は consensus substrate を mastered した; EVM payload パイプラインが Module 2 が plug in する場所だ。」

## 6. L11 の async-trick、具体化

L11 §5 は「まだ使っていない async trick」を導入した:

> 「Round-decided 時に \`build_payload(...)\` を kick off して、EL に前の round の投票ウィンドウ全部を block assembly に使わせよ。」

今、何が amortize されているかが見える。§1 のテーブルの expensive operation (step 2-5: pull、order、execute、state root) は full mainnet-shape block で累積 100-400ms かかる。これらが前の round の投票 *中* に走れば (vote 伝播は常に少なくとも 200-500ms かかる)、propose hot path は「キャッシュ済み payload を fetch」に落ちる — microsecond、何百ms ではなく。

これが **the** パフォーマンス最適化で、HL、Tempo、openhl が real EVM execution をしながらサブ秒 slot を動かせる理由だ。**これなしにはサブ秒 slot は得られない。** 空 EVM を動かす (\`0844d58\` の openhl のように real tx を execute しない) か、execution を投票ウィンドウに対して並列化するかだ。

ConsensusBridge trait の \`build_payload\` (start) と \`payload_ready\` (fetch) の split はこれをサポートするよう形作られている。**Trait API は実装の先を行っている。** Production-shape の \`LiveRethEvmBridge\` が landing したとき、\`engine_app.rs::run_engine_app\` のループは \`build_payload\` call を前に動かし (\`AppMsg::Decided\` の直後)、\`payload_ready\` は定数時間 fetch になる。

## 7. 練習

1. **State-root 質問。** 2 validator が同じ proposal (同じ Header bytes) を受け取り、それぞれの parent state コピーに対して execute し、*異なる* state root に到達する。何が壊れるか? §1 のパイプラインのどの step で divergence が起こったか?
2. **Ordering ポリシー。** Reth のデフォルト ordering は EIP-1559 priority fee 降順だ。openhl の CLOB が異なる ordering ポリシー — 例えば「CLOB fill first、その後 priority fee でユーザ tx」 — を使ったら **何が変わるか?** \`EthereumPayloadBuilder\` のどの行を replace する必要があるか? (ヒント: executor ではなく \`Pool::best_transactions\` iterator が再実装される。)
3. **Async-trick の gap。** \`crates/consensus/src/engine_app.rs:65-82@0844d58\` (\`AppMsg::GetValue\` arm) を読め。\`bridge.build_payload(...)\` call を \`AppMsg::Decided\` で発火するよう移動する diff を sketch せよ。AppMsg loop はこれら 2 メッセージ間でどんな state を track する必要があるか?

> **最終チェック。** 1 文で、なぜ production-shape の payload-building パイプライン (§1) は \`engine_forkchoiceUpdated\` 中 inline で実行されるのではなく、別 service に decouple されているのか? 答えに「async / build-during-voting」または「proposer の hot path は assemble ではなく fetch する必要がある」が含まれていなければ、§6 を再読。

---

**おめでとう** — これは *Building OpenHL — Consensus Substrate* の最後のレッスンだ。Contract (L1)、convergence (L2)、ライブラリとしての Malachite (L3 + L4 + L5)、ライブラリとしての Reth (L6 + L7 + L8)、wiring (L9 + L10 + L11)、devnet (L12 + L13) をカバーした。

**rethlab L1 Architect トラックの Module 2 は openhl の CLOB matching engine から始まる** — そこで最初の real transaction が chain に入り、§5 の preview が Module 2 の最初のレッスンになる。`,
                },
              ],
            },
          },
          {
            title: "配線 — consensus crate",
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: "Contract を設計する — ConsensusBridge trait",
                  slug: "openhl-bridge-trait-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 60,
                  content: `# Contract を設計する — \`ConsensusBridge\` trait

EVM の上に BFT をボルト止めするすべての chain は最終的にこの trait を書くことになる。HyperBFT がやった、Tempo がやった、すべての CometBFT 系 chain がやった。メソッド名は違うが、形は同じだ。問題は、L1 の 4 メッセージを明示し failure mode を名指して *意図的に* 書くか、「consensus が必要としたときに必要としたものから accrete する」かだ。

我々は意図的に書く。一度だけ。

> 🛑 **スクロール前に予測。** L1 で 4 メッセージを見た。L7 で Ethereum Engine API へのマッピングを見た。今: *Rust trait* はどう見えるべきか? 具体的に — async か blocking か? Owned 引数か borrowed か? エラー type 1 つか複数か? Trait メソッドのシグネチャは思っているより重要だ。

## 1. すべての BFT-L1 が最終的に書く trait

\`crates/consensus/src/bridge.rs:11@0844d58\` を開け。全体で 40 行:

\`\`\`rust
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError>;

    async fn payload_ready(&self, id: PayloadId)
        -> Result<ExecutedBlock, BridgeError>;

    async fn validate_payload(&self, block: &ExecutedBlock)
        -> Result<PayloadStatus, BridgeError>;

    async fn commit(&self, block_hash: BlockHash)
        -> Result<(), BridgeError>;
}
\`\`\`

これが contract だ。Consensus に参加する他のすべての crate はこの trait を実装する (EVM crate、3 つの impl — \`InMemoryEvmBridge\`、\`RethEvmBridge\`、\`LiveRethEvmBridge\`) か、メソッドを call するために \`Arc<dyn ConsensusBridge>\` を持つ (consensus crate の runner と engine-app loop)。

本レッスンの残りは正当化だ。なぜこの 4 メソッド、このシグネチャ、このエラー type なのか? 各選択は何かを trade off する。レッスンの目的は trade を visible にして、お前が偶然ではなく意図的に違う選択をできるようにすることだ。

## 2. Async か blocking か?

シグネチャを見よ: すべてのメソッドが \`async\` だ。これはタダではない。Rust では trait の \`async fn\` は長年のサーガだった (\`#[async_trait]\` マクロは workaround); async は全体に \`Send + Sync\` bound を強制する; sync から async を呼ぶには tokio handle が必要だ。

代替は blocking だった:

\`\`\`rust
pub trait ConsensusBridge: Send + Sync {
    fn build_payload(&self, ...) -> Result<PayloadId, BridgeError>;
    // ...
}
\`\`\`

シグネチャが単純。\`#[async_trait]\` なし。Future pinning 問題なし。なぜこの道を行かなかったか?

| 考慮事項 | Async 勝 | Blocking 勝 |
| :--- | :--- | :--- |
| Reth の \`BlockchainProvider\` (sync) を呼ぶ | tied — どちらも動く | tied |
| Reth の \`EngineHandle::fork_choice_updated\` (async) を呼ぶ | **async でなければならない** | \`block_on\` が必要 |
| Malachite の tokio runtime 内 | thread block しない | 各 call が worker thread を block |
| \`run_engine_app\` AppMsg loop | 自然 | spawn-blocking 体操が必要 |
| Test double (in-memory state) | trivial — \`Mutex\` 持つだけ | trivial |

決定は 2 行目と 3 行目で落ちる。Real Reth backend は async API (Engine API、payload builder service、network) を使い、我々の consensus 側は Malachite の tokio runtime で動く。Blocking にすると、AppMsg loop 全体がすべての bridge call で spawn-blocking になる — 無駄、エラーが起きやすく、負荷下で observably 遅い。

> 🛑 **反流暢性。** 「Async は blocking より柔軟なだけ、後から async にできる。」 **違う。** Blocking-trait から async-trait への移行は viral な変更だ — すべての caller が切り替える必要がある。Trait の各 async メソッドは \`Send + Sync + 'static\` 制約をコードに伝播させる。**Async を早めに pick して、コストを受け入れろ。さもなくば blocking に commit して二度と振り返るな。**

## 3. なぜ正確に 4 メソッドなのか (少なくも多くもなく)

4 メソッド。3 ではない。5 でもない。なぜこの数か?

3 に collapse する誘惑:

- 「**\`payload_ready\` は \`build_payload\` の一部だ。\`build_payload\` がブロックを直接返せ。**」 説得力あり — メソッドが少ない、call site が単純。**違う。** そうすると L7 §4 の build-during-voting parallelism が死ぬ。Proposer の hot path が「build 待ち、その後 propose」になり、「すでに build されたものを propose」ではなくなる。Sub-second slot は不可能になる。

- 「**\`validate_payload\` と \`commit\` をマージすべきだ。Validation が通ったら commit すれば。**」 ほとんどの call site が連続でやるので誘惑される。**違う。** Validator は height ごとに多数の candidate proposal を import するが (round-robin の proposer slot ごとに 1 つ)、commit するのは 1 つだけ — deciding value。Validation は speculative; commit は final。マージすると speculative state 変更を強制し、rollback machinery を意味し、はるかに複雑な EVM crate を意味する。

5 に拡張する誘惑:

- 「**\`notify_view_change(round)\` を追加して EVM に round timeout を知らせよ。**」 もっともらしい — view change は real consensus event だ。**不要だ。** EVM は round について知る必要がない; decided block について知ればいい。Round 変更は CL 内部 state だ。\`notify_view_change\` を追加すると consensus 内部を execution に leak する — contract leak だ (L1 §5 参照)。

- 「**\`restream_proposal(hash)\` を追加して bridge が stale proposal を re-broadcast できるように。**」 もっともらしい — Malachite の AppMsg loop には \`RestreamProposal\` variant がある。**不要だ。** Restreaming はネットワーク層の関心事だ: consensus crate の app loop が bridge 関与なしで直接 handle する (\`engine_app.rs:96@0844d58\` 参照)。Bridge は EL contract であり、一般的な consensus event sink ではない。

4 メソッドは contract leak を招かずに L7 マッピングを capture する最小だ (各メソッドが正確に 1 つの Ethereum Engine API call にマップする)。

## 4. エラー semantics — Rejected、Syncing、Internal

\`crates/consensus/src/bridge.rs:33@0844d58\` の \`BridgeError\`:

\`\`\`rust
#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("execution layer rejected payload: {0}")]
    Rejected(String),

    #[error("execution layer is syncing")]
    Syncing,

    #[error("internal: {0}")]
    Internal(#[from] eyre::Report),
}
\`\`\`

3 variant。各々が specific な consensus 側応答にマップする:

| Variant | 何を意味するか | Consensus 応答 |
| :--- | :--- | :--- |
| \`Rejected(reason)\` | EL がロジックを適用して no と決めた。Block が malformed、未知の parent を参照、EIP-1559 違反等。 | Proposal を Invalid として扱う; この値に nil 投票。次の round へ。 |
| \`Syncing\` | EL はまだ答えられる state を持っていない — ネットワークの tip にキャッチアップ中だ。 | 待つ。Nil 投票しない (block が悪いかどうか分からない)。Backoff してリトライ、または timeout に落ちる。 |
| \`Internal(report)\` | 本当に壊れている。DB 破損、EL panic、ファイル消失。 | **Chain を halt せよ。** エラーを上に propagate、大声でログ。安全に続行できない。 |

3 つは互換ではない。未知の parent (これは \`Rejected\` 相当) で \`Internal\` を返す bridge は、本来 nil 投票すべきところで chain を halt させる。Syncing 条件で \`Rejected\` を返す bridge は、答えを与えられた peer から永久に fork する。

> 🛑 **反流暢性。** 「エラーはエラーだ。1 つの \`Error\` enum で十分。」 **違う。** Consensus コードでは、エラーの *カテゴリ* が chain が進むか、pause するか、halt するかを決定する。Collapse すると liveness にとって load-bearing な情報を失う。3 variant が最小だ。

> 🛑 **予測。** 1 つ選べ: peer が parent block hash を我々の chain に持たない proposal を送ってきた。Bridge は \`Rejected\`、\`Syncing\`、\`Internal\` のどれを返すべきか?

答えは **parent について学ぶ可能性があるか** に依存する。Node が遅れていて parent が real (まだ sync していないだけ) → \`Syncing\`。Node が up to date でそんな block が存在しない → \`Rejected\`。Bridge は常にどちらのケースかを判別できない; 実務では production bridge は provider の sync state を classify 前に check する。

\`crates/evm/src/live_node.rs:68@0844d58\` の \`LiveRethEvmBridge::build_payload\` では、現在のコードは provider に given hash の block がないとき \`Rejected\` を返す。**我々の provider が up to date だと仮定すれば** correct だ — single-validator mode では true (peer が我々より進んでいる可能性なし)、multi-node デプロイメントでは tighten が必要。

## 5. Test double — canonical pattern としての \`InMemoryEvmBridge\`

\`ConsensusBridge\` の 3 つの impl が \`crates/evm/src/\` に住む:

- \`InMemoryEvmBridge\` (\`in_memory.rs:14@0844d58\`) — pure in-process state、Reth dep なし。Bridge call を高速で隔離したい unit test で使う。
- \`RethEvmBridge\` (\`engine.rs\`) — real alloy \`Header\` + \`B256\` を使うが in-memory state。Mock と live の bridge。
- \`LiveRethEvmBridge\` (\`live_node.rs\`) — real Reth \`BlockchainProvider\` + \`EthBeaconConsensus\` をラップ。Production-shape。

パターン: **trait first、複数 impl、各々が「real」軸の異なる点に**。Unit test は最も安い impl を使い、integration test はリッチな impl、production は live impl。

\`InMemoryEvmBridge\` は canonical test double だ。その \`build_payload\`:

\`\`\`rust
async fn build_payload(
    &self,
    parent: BlockHash,
    _attrs: PayloadAttrs,
) -> Result<PayloadId, BridgeError> {
    let mut s = self.state.lock().expect("state mutex poisoned");
    let id = s.next_payload_id;
    s.next_payload_id += 1;

    let parent_number = s.chain.get(&parent.0).map_or(0, |b| b.number);
    let number = parent_number + 1;

    let mut hash_bytes = [0u8; 32];
    hash_bytes[..8].copy_from_slice(&id.to_le_bytes());
    hash_bytes[8..16].copy_from_slice(&number.to_le_bytes());

    let block = ExecutedBlock {
        hash: BlockHash(hash_bytes),
        parent_hash: parent,
        number,
        state_root: [0u8; 32],
    };
    s.pending.insert(id, block);
    Ok(PayloadId(id))
}
\`\`\`

16 行。Reth なし、provider なし、validator なし。Block hash は real header から compute するのではなく \`(payload_id, number)\` から synthesize される。State root はゼロ。**そして trait は気にしない。**

それが test-double payoff だ: trait は EL contract が *何* かを表現し、*どう* 実装するかではない。Unit test は \`run_single_validator(&InMemoryEvmBridge::new(), parent)\` を microsecond で走らせられる; 同じ caller コードが production で signature 変更なしに \`LiveRethEvmBridge\` に対して走る。

> 🛑 **反流暢性。** 「Test double は常に嘘をつく。」 ほぼ true だが、正しい framing ではない。Test double はテストしている部分に contract を *narrow* する。\`InMemoryEvmBridge\` は「parent の上に child block を build する」を truthfully に impl する — real EVM 実行や hash 計算は declined するだけだ、それらが consensus test がテストしているものではないからだ。

## 6. Type ownership — なぜ contract type は \`openhl-types\` に住むか

Trait のシグネチャを見よ:

\`\`\`rust
async fn build_payload(&self, parent: BlockHash, attrs: PayloadAttrs)
    -> Result<PayloadId, BridgeError>;
\`\`\`

\`BlockHash\`、\`PayloadAttrs\`、\`PayloadId\` — これらは \`openhl-consensus\` や \`openhl-evm\` に定義されていない。\`openhl-types\` にある。なぜか?

なぜなら **consensus crate と evm crate の両方が name する必要がある** からだ — consensus は trait を call するため、evm は trait を impl するため。Type が \`openhl-consensus\` に住むと、\`openhl-evm\` は trait を impl するため \`openhl-consensus\` に依存する必要がある。\`openhl-evm\` に住むと、\`openhl-consensus\` が trait を call するため \`openhl-evm\` に依存する必要がある。

どちらでもサイクルが発生する: A が B に依存、B が A に依存。Rust の crate graph は DAG だ; サイクルは compile error だ。Fix は **共有 type crate**: \`openhl-consensus\` と \`openhl-evm\` の両方が \`openhl-types\` に依存し、どちらも type 定義のために他方に依存しない。

\`ConsensusBridge\` trait 自体は \`openhl-consensus\` に住む (consensus が contract を所有) が、trait の *語彙* は dep graph の 1 つ下に住む。

このパターンは深刻な型システムを持つすべての L1 で現れる:

| Chain | Contract type が住む場所 | Trait が住む場所 |
| :--- | :--- | :--- |
| Ethereum (Reth) | \`alloy-primitives\`、\`reth-primitives-traits\` | \`reth-engine-primitives\`、\`reth-rpc-api\` |
| Tendermint / CometBFT | \`tendermint-proto\` | 各種 consumer crate |
| Malachite | \`informalsystems-malachitebft-core-types\` | \`informalsystems-malachitebft-core-consensus\` |
| **OpenHL** | \`openhl-types\` | \`openhl-consensus\` |

同じ形。違う名前。

## 7. この trait が *しない* こと

Contract 設計で最も難しいのは何を残すかだ。\`ConsensusBridge\` が意図的に持たない 4 つのもの:

1. **Transaction pool なし。** Real EL は mempool を持つ。Bridge に \`submit_transaction(tx)\` を expose できた。**しない。** Mempool は EL 内部の関心事; Consensus は EVM がどう block に入れる transaction を見つけるかを気にすべきではない。(real Reth では、payload builder が mempool アクセスを所有する; consensus は触れない。)

2. **State クエリなし。** \`get_balance(addr)\` なし、\`read_storage(addr, slot)\` なし。**State は EL 専用の関心事だ。** Consensus が state を読む必要があるなら、何かが間違っている — consensus は block とその順序を知ればよく、内容は不要だ。

3. **Subscription API なし。** \`subscribe_decisions()\` なし、\`on_block_committed(callback)\` なし。Bridge は同期 (well, async-await) request-response trait だ; EL は consensus にイベントを push しない。Consensus が decision を知りたければ、*それを作っている* — callback 不要。

4. **Genesis/init メソッドなし。** \`initialize_genesis(spec)\` なし。Genesis は chain-spec の関心事で、node bootstrap で handle される (\`OpenHlNode::start()\` が \`Genesis\` から chain spec を読む — Module 5 領域)。Bridge は initialization ではなく steady-state operation のためだ。

これらの誘惑はそれぞれ real で、それぞれ trait を大きくしただろう。**最小 viable contract は正確に 4 メソッドだ。** 拡張に抵抗するのは design discipline だ。

> 🛑 **予測。** 新しい contributor が主張: 「trait に \`query_state(addr) -> StateView\` を追加すべきだ — デバッグが楽になる。」 **なぜこれが間違いか?** ヒント: dep graph (§6) と consensus が決定を下すために何を知る必要があるかを考えよ。

答え: consensus は state を読む必要がない; 次の *block* を選ぶのであって次の *state* ではない。\`query_state\` を追加すると馬車を馬の前に置くことになり、EL 内部を CL crate に leak し、すべての impl (\`InMemoryEvmBridge\` 含む) にクエリ可能な state machine を維持する義務を負わせる。State クエリの正しい場所は EL crate 独自のデバッグインタフェースであり、consensus contract ではない。

## 8. 練習

1. **2 つの stub bridge を見つけよ。** \`crates/consensus/src/runner.rs\` と \`crates/consensus/src/engine_app.rs\` の test module で inline \`StubBridge\` impl を見つけよ。なぜ *2 つ* (共有 1 つではなく) か? 各々が \`InMemoryEvmBridge\` に対して minimum で何を実装するか? (ヒント: 両 stub は \`openhl-evm\` を \`openhl-consensus\` の test-only dep として追加するより前に書かれた — それは §6 の dep cycle を作る。Inline stub は cycle を避ける。)

2. **Halt-vs-recover 監査。** \`crates/evm/src/live_node.rs@0844d58\` の \`LiveRethEvmBridge\` で各 \`Err(BridgeError::...)\` return を読め。それぞれが \`Rejected\`、\`Syncing\`、\`Internal\` のどれか identify せよ。それから check: consensus 側の caller (\`runner.rs\` または \`engine_app.rs\`) はその variant を §4 のテーブルが prescribe する方法で handle するか?

3. **5 番目のメソッドを sketch せよ (そしてしない理由を発見せよ)。** Malachite の \`RestreamProposal\` AppMsg をサポートするため \`restream_proposal(block_hash)\` を追加すると仮定せよ。Trait 変更を sketch せよ。それから \`engine_app.rs:96@0844d58\` を読め — 現在のコードは \`RestreamProposal\` に何をするか? なぜ bridge は関与する必要がないか?

> **最終チェック。** 1 文で、なぜ \`validate_payload\` は \`ExecutedBlock\` (owned) ではなく \`&ExecutedBlock\` (*borrowed* reference) を取るのか? 答えに「validation は block を consume すべきではない — consensus がまだ必要かもしれない」または「borrow は偶発的な ownership 移行に対する type-system 安全レールだ」が含まれていなければ、trait シグネチャを再読。`,
                },
                {
                  title: "Malachite の Decided から Reth の forkchoice_updated へ",
                  slug: "openhl-decided-to-fcu-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 40,
                  content: `# Malachite の \`Decided\` から Reth の \`forkchoice_updated\` へ

午前 3 時。バリデータが今しがた block 17 の決定的 precommit に署名した。Malachite が \`Decided\` を emit する。EL はそこに座って待っている。**チェーンが block 18 に進むまでに、どの順番で、何が起こる必要があるか?**

「\`bridge.commit(hash)\` を呼ぶだけ」と答えたなら、読み進めてほしい。**呼び出すこと自体より、順番のほうが重要だ。**

> 🛑 **スクロール前に予測。** Malachite が \`Decided\` と言ってから、次のラウンドが始まるまでの間に起こるべき状態変化を順番にリストアップせよ。ヒント: 3 つ以上ある。どれか 1 つを飛ばすとチェーンが停止する。

## 1. BFT における \`Decided\` の意味

Malachite が高さ H の値 V について \`Decided\` を emit するとき、3 つのことが同時に真である:

1. **投票権の 2/3+1 以上** が H における V に対して precommit を署名した。
2. **高さ H で他の値が決定されることはもうあり得ない** — 署名は記録されており、バリデータによる equivocation は slashable な証拠になる。
3. **H における reorg は不可能** — block H はチェーンの不可逆な事実になった。

これが BFT の約束である。Nakamoto 形式のチェーン (PoW、ETH 1.0 longest-chain) では「決定された」は確率的だ — k confirmations を待って、fork が追いついてこないことを祈る。BFT では、**決定されたものは決定されている。永遠に。**

この単一の性質が、EL の応答方法を変える。Ethereum では、EL は fork-choice の下でブロックを適用し、どれが finalized になったかは Casper FFG 経由で *あとから* (~13 分後) 通知される。BFT では、head と finalized block は同じブロックで、同じ操作で決定される。

## 2. \`forkchoice_updated\` が我々に求めるもの

Engine API のコールの形:

\`\`\`
forkchoiceUpdated(ForkchoiceState {
    headBlockHash:      B256,
    safeBlockHash:      B256,
    finalizedBlockHash: B256,
}, payload_attrs: None)
\`\`\`

3 つの hash。Reth (および準拠した EL) は内部ポインタを更新し、指名されたブロックを直ちに canonical として扱い始める。

Ethereum では、これらは潜在的に異なる 3 つのブロックである:
- \`head\`: バリデータが現在その上に build しているブロック (まだ reorg され得る)
- \`safe\`: justified、1/3+ の悪意あるステークがない限り reorg されない
- \`finalized\`: 不可逆的に commit、archive 可能

BFT では、**これらは collapse する**。Malachite の Decision の後:
- \`head = decided block\`
- \`safe = decided block\`
- \`finalized = decided block\`

> 🛑 **反流暢性。** 「BFT と PoS の finality は同じものだ。」 完全には正しくない。Ethereum の Casper FFG は Nakamoto chain の上に重ねられた BFT *gadget* であり、head の後ろにあるブロックを finalize することができる。Pure BFT (Tendermint、HyperBFT、openhl) にはこのギャップは存在しない — head がすべてのステップで finalized であるからだ。

## 3. Collapse、具体的に

この collapse は Decided ハンドラを単純化する。3 つの別々の forkchoice ポインタを追跡する必要はない — 常に同一だからだ。Forkchoice update は次のように退化する:

\`\`\`
forkchoiceUpdated(ForkchoiceState {
    headBlockHash:      decided_hash,
    safeBlockHash:      decided_hash,
    finalizedBlockHash: decided_hash,
}, None)
\`\`\`

これが Reth 側。openhl の in-process variant では、L7 でマッピングした trait の \`bridge.commit(decided_hash)\` ただそれだけだ。

## 4. Decided ハンドラ、歩く

openhl のアプリループの実際の Decided arm、\`crates/consensus/src/engine_app.rs:119@0cac571\` から:

\`\`\`rust
AppMsg::Decided {
    certificate, reply, ..
} => {
    let hash = certificate.value_id;
    bridge.commit(hash).await?;
    decided.push(hash);
    current_parent = hash;

    if decided.len() >= stop_after_decisions {
        let next_height = certificate.height.increment();
        let _ = reply.send(Next::Start(next_height, validator_set.clone()));
        return Ok(decided);
    }

    let next_height = certificate.height.increment();
    current_height = next_height;
    if reply.send(Next::Start(next_height, validator_set.clone())).is_err() {
        tracing::warn!("{APP_REPLY_WAIT_LOG} (Decided)");
    }
}
\`\`\`

5 ステップ。順番に:

1. **決定された hash を取り出す。** \`certificate.value_id\` は BFT が今しがた不可逆的に commit した \`BlockHash\` である。決定に対して我々は何もしていない — すでに決まっている。

2. **bridge 経由で commit する。** \`bridge.commit(hash).await?\` が決定を EL に伝播する。Stage 7d (commit \`0cac571\`) の時点で、これは Reth の in-process Engine API に対する実際の \`forkchoiceUpdated\` コールを発火する — body は §6 を参照。**もしこれが error を返すなら、我々はそれを propagate する — チェーンが停止する。** これが正しい挙動だ。我々は今しがた決定を行い、EL が適用を拒否した。**サイレントに fork するより停止するほうがマシだ。**

3. **追跡を更新する。** 呼び出し元のビューのために \`decided.push(hash)\`、次の \`build_payload\` が何の上に build するかを知るために \`current_parent = hash\`。

4. **consensus に次が何かを伝える。** \`reply.send(Next::Start(...))\` で Malachite に次の高さを開始するよう指示する。代わりに \`Next::Restart\` を送ると、Malachite は現在の高さをやり直す。

5. **(テスト専用) 早期終了。** \`stop_after_decisions\` に到達したら return し、テストがクリーンに終了できるようにする。

> 🛑 **予測。** ステップ 4 を飛ばす — どんな reply も送らない — とどうなる?

Malachite が停止する。Consensus actor は我々の応答を待ってブロックし、次の高さに進まなくなる。チェーンが凍結する。**これは設計通りだ** — Malachite は明示的なアプリケーション確認なしに進むことを拒否する。これは EL が CL を先回りさせないようにする方法である。

## 5. \`Next::Start\` vs \`Next::Restart\`

| Variant | 使用場面 |
| :--- | :--- |
| \`Next::Start(height+1, validator_set)\` | Commit 成功; 次の高さに進む。 |
| \`Next::Restart(current_height, validator_set)\` | Commit 失敗; 現在の高さをやり直す (異なる proposer rotation が役立つかもしれない)。 |

openhl の現在の実装では \`Next::Start\` のみを使用する。\`bridge.commit\` が失敗すると、error を stack 上に propagate する — \`Restart\` を検討する頃にはチェーンはすでに停止している。**自動 restart ループは存在しない。** これは意図的だ: 失敗した commit は我々の状態が破損しているか EL が壊れていることを意味し、静かにリトライすると問題を悪化させる。

Production 形の \`Restart\` 使用は infrastructure 層の recovery (state 復元、WAL replay) と組み合わせて再試行することになる。Stage 7d の commit パスにおける WAL 統合は、そのパターンが landed する場所だ。

## 6. Stage 7d — \`commit\` が Reth に honestly に届く

Stage 7c は動作する \`commit\` の stub を与えてくれた: ブリッジ自身の \`HashMap\` に header を書き、\`head\` を進め、\`Ok\` を返す。Stage 7d はその stub を Reth の in-process Engine API に対する実際の \`forkchoiceUpdated\` に変える — 望まない caller を一切壊さずに。

実際の \`commit\` body、\`crates/evm/src/live_node.rs:301@0cac571\`:

\`\`\`rust
async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
    let hash = B256::from(block_hash.0);
    let header = {
        let mut s = self.state.lock().expect("state mutex poisoned");
        let header = s
            .pending
            .values()
            .find(|(h, _, _)| *h == hash)
            .map(|(_, h, _)| h.clone())
            .ok_or_else(|| {
                BridgeError::Rejected(format!("commit for unknown hash {hash}"))
            })?;
        s.chain.insert(hash, header.clone());
        s.head = Some(hash);
        header
    };

    if let Some(handle) = &self.engine_handle {
        let state = ForkchoiceState {
            head_block_hash: hash,
            safe_block_hash: hash,
            finalized_block_hash: hash,
        };
        let _ = handle.fork_choice_updated(state, None).await;
    }

    Ok(())
}
\`\`\`

3 つ気付くべきこと:

**ローカル先、engine 後。** bridge 自身の \`HashMap\` は tight な critical section の *中で* 更新される。それから lock を drop し、その後で engine に reach する。順番が load-bearing だ: もし engine call が panic したり hang したりしても、bridge 自身のチェーンビューはすでに consistent な状態にある。handle を install していないテストはそのまま動作する — \`engine_handle: None\` が後半を short-circuit する。

**3 つの hash、1 つの値。** §3 の collapse の具体化: \`head = safe = finalized = hash\`。BFT には justification ステップがないので justification と finality の間に drift は存在しない — 決定が finalization そのものだからだ。Casper-FFG client ではこれら 3 つが通常異なるブロックになる、対比される。

**\`let _ = ... .await\`。** engine の応答は意図的に捨てている。なぜか?

> 🛑 **予測。** openhl が \`newPayload\` 経由で見たことのない \`hash\` について \`forkchoiceUpdated(hash)\` を送ったとき、Reth の engine は何を返すか? 3 つの選択肢: \`VALID\`、\`INVALID\`、\`SYNCING\`。どれで、なぜか?

答えは \`SYNCING\` である。Reth は database にそのブロックを持っていない — openhl は bridge 内で header を built したが、Reth に実行を依頼せず、\`engine_newPayload\` のための \`ExecutionPayload\` を生成していない。Reth は正しく応答する: 「私はこのチェーンの上にいない; 何の話か分からない; 私が syncing 中だと仮定してくれ。」

これが Stage 7d の **honest-scoping flag** だ。配線は接続されている — コールは engine に到達し、engine は応答し、我々は deadlock せず panic しない。しかし engine の応答はまだ *有用* ではない、なぜなら validate する実際の payload がないからだ。次の staging chunk (Module 3 以降、CLOB の fills が EVM transactions として encode されたあと) では \`commit\` を先行する \`newPayload(payload)\` と pair させ、forkchoice が到着する頃には engine がすでにブロックを知っている状態にする。

handle install のパスは \`crates/evm/src/live_node.rs:118@0cac571\` に存在する:

\`\`\`rust
#[must_use]
pub fn with_engine_handle(
    mut self,
    handle: ConsensusEngineHandle<EthEngineTypes>,
) -> Self {
    self.engine_handle = Some(handle);
    self
}
\`\`\`

Builder スタイルなのは、bridge が Reth node の launch 完了前に構築されるからだ — \`new()\` に handle を渡せない。\`crates/evm/src/live_node.rs:691@0cac571\` の integration test が実際の hand-off を示す:

\`\`\`rust
let handle = NodeBuilder::new(node_config)
    .testing_node(runtime)
    .with_types::<EthereumNode>()
    .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
    .with_add_ons(EthereumAddOns::default())
    .launch()
    .await?;

let engine_handle = handle.node.add_ons_handle.beacon_engine_handle.clone();

let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec)
    .with_engine_handle(engine_handle);
\`\`\`

Handle は launched node の \`add_ons_handle.beacon_engine_handle\` から pluck される。このフィールドが存在するのは \`EthereumAddOns::default()\` で compose したからだ; これがなければフィールドは存在せず、\`with_engine_handle\` に install するものがない。

> 🛑 **反流暢性。** 「Decided と committed は同じものだ。」 **違う。** *Decided* は BFT による 2/3+1 のバリデータが合意したという主張。*Committed* は EL がブロックを実際に適用したという確認。チェーンが進むには両方が起こる必要がある。これらを 1 つの概念に collapse すると、bridge 呼び出しを完全に skip してしまい、EL が適用を拒否するブロックについて consensus が決定する状態に陥る。

> 🛑 **反流暢性。** 「engine が SYNCING を返すなら Stage 7d は壊れている。」 **違う。** SYNCING は engine がブロックを持っていないという意味だ — そして我々はそもそも送っていないのだから *正しい* 応答である。バグになるのは SYNCING が我々を驚かせる場合だ; 代わりに我々はそれを期待し、文書化し、次のステージの \`newPayload\` 統合の後ろに gate している。

## 7. 練習

1. **3 つのポインタを trace する。** openhl で block 5 が decided されたあと、openhl が Reth に送る 3 つの Forkchoice hash は何か? もし Ethereum mainnet で block 5 が head だが block 3 が最新 finalized だった場合に送る内容と比較せよ。
2. **停止条件を見つける。** \`bridge.commit\` のどの error がステップ 4 の実行を妨げるか? \`crates/evm/src/live_node.rs:301@0cac571\` で、どの分岐が \`Ok(())\` を返し、どの分岐が \`Err\` を返すか identify せよ。(ヒント: \`Err\` を返す分岐は 1 つだけ — Stage 7c と同じものだ。)
3. **なぜ engine の応答を捨てるか?** §6 の \`commit\` は \`let _ = handle.fork_choice_updated(...)\` と書いている。次のステージが CLOB の fills を EVM transactions として encode し、この \`forkchoiceUpdated\` の前に \`newPayload\` コールを追加することを想像してみよ。Body を以下のように書き直せ: (a) まず \`newPayload(payload)\` を呼ぶ、(b) 返された \`PayloadStatus\` を check する、(c) \`PayloadStatus::Valid\` の場合にのみ forkchoice-update する。\`Invalid\` の場合にどんな \`BridgeError\` を生成するか? \`Syncing\` の場合は?
4. **Restart 使用をスケッチする。** もし \`bridge.commit\` が「proposer の値はクリーンに適用できないが、次の試行はうまくいくはず」を意味する error を返したら、Decided ハンドラはどう変わるか? \`Next::Restart\` に切り替える diff をスケッチせよ。

> **最終チェック。** 1 文で、なぜ openhl は \`Decided\` 上で即座に進む代わりに、次の高さに進む前にアプリケーションの reply (ステップ 4) を待つのか? もし答えに「EL が拒否するかも」または「CL が先回りするのを防ぐ」が含まれていなければ、§4 ステップ 2 を再読。`,
                },
                {
                  title: "ブロックを produce する — Malachite proposer → Reth payload → broadcast",
                  slug: "openhl-proposer-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 40,
                  content: `# ブロックを produce する — Malachite proposer → Reth payload → broadcast

午前 3 時。Malachite の leader election 関数が今しがた、お前を height 47、round 0 の proposer に選んだ。お前には **400 ミリ秒** ある — ブロックを produce し、peer に broadcast し、prevote 収集を開始するまで。時計はすでに動いている。

そのミリ秒はどこに消えるのか? 予算のうち 200µs はお前のコード、50ms は Reth、100ms はネットワーク伝播 (proposer がどんなに頑張っても縮められない) — どれがどれか? 本レッスンは openhl の実コード経由で proposer hot path を trace し、重要な瞬間に名前を付ける。

> 🛑 **スクロール前に予測。** お前は height N の proposer だ。お前のコードがこれを知る瞬間から proposal を broadcast するまでに、起こる必要があるアクションをすべて順番に名指せ。ヒント: 少なくとも 5 つあり、そのうち 1 つは「synchronously に起こる必要がない」だ。

## 1. Hot path、名指し

openhl の \`run_engine_app\` ループが consensus engine から \`AppMsg::GetValue\` を見るとき、エンジンが言っているのは: 「お前の slot だ。Propose するブロックを build せよ。」

bridge より上から trace する:

| Step | Owner | 何が走るか | 典型予算 |
| :--- | :--- | :--- | :--- |
| 1 | Malachite Consensus actor | Round-robin が我々を proposer に選ぶ | <1µs |
| 2 | Malachite Engine actor | \`AppMsg::GetValue { height, round, timeout, reply }\` を送る | <5µs |
| 3 | **openhl \`run_engine_app\`** | \`bridge.build_payload(parent, attrs)\` を call | varies — §3 参照 |
| 4 | **openhl \`run_engine_app\`** | \`bridge.payload_ready(id)\` を call | varies |
| 5 | **openhl \`run_engine_app\`** | \`LocallyProposedValue\` でラップ、\`reply\` 経由で送信 | <10µs |
| 6 | Malachite Consensus actor | 値を受信、\`OpenHlContext::new_proposal\` を call | <100µs (signing) |
| 7 | Malachite Network actor | libp2p 経由で proposal を gossip | network-bound |

Step 3-5 が我々のもの。Step 1-2 と 6-7 は Malachite。**我々がコントロールする proposer hot path 全体は 16 行のコードだ。**

## 2. ミリ秒はどこに消えるか

\`AppMsg::GetValue\` payload は \`timeout: Duration\` を含む — Malachite が我々にどれだけ時間があるかを伝えている。我々のコードは現在それを無視している (\`timeout: _\`)、テストモード (bridge call が synchronous) では問題ない。**Production では問題だ** — \`build_payload\` が timeout より時間がかかると、Malachite は待つのをやめ、round は proposal なしで timeout する。

Malachite のデフォルト \`ConsensusConfig\` の timeout は **propose timeout** で、安全のため典型的に 1-3 秒だが、HL や Tempo のようにサブ秒 slot を狙う chain では 300-500ms までチューニング可能だ。

| 予算消費者 | テストモード (今日) | Production モード |
| :--- | :--- | :--- |
| \`bridge.build_payload\` body | microsecond (in-memory) | 100-400ms (real Reth payload assembly) |
| \`bridge.payload_ready\` body | microsecond | <5ms (cached result) |
| \`reply.send(...)\` channel 書き込み | nanosecond | nanosecond |
| \`OpenHlContext::new_proposal\` + sign | microsecond | microsecond |
| Network gossip 伝播 | n/a (single validator) | 50-200ms (peer-count 依存) |

Production で expensive な行は **mempool から実際の payload を assemble する** ことだ — Reth の payload builder が transaction を pick、execute、state を compute する。そこに 100-400ms が住む。それ以外はオーバーヘッドだ。

> 🛑 **反流暢性。** 「自分の番のときに同期的に payload を build すればいい — それが最も単純な設計だ。」 **production では違う。** 同期 build は propose 予算のほとんどを、もっと早くできた仕事に費やしてしまう。4 メソッド \`ConsensusBridge\` trait (L9) はまさにこの async 最適化を可能にするために存在する。§5 でどうやるか見る。

## 3. Proposer のコード、walked

\`crates/consensus/src/engine_app.rs:65@0844d58\` を開け:

\`\`\`rust
AppMsg::GetValue {
    height,
    round,
    timeout: _,
    reply,
} => {
    let attrs = default_attrs();
    let id = bridge.build_payload(current_parent, attrs).await?;
    let block = bridge.payload_ready(id).await?;
    let value = OpenHlValue(block.hash);
    let lpv = informalsystems_malachitebft_app_channel::app::types
        ::LocallyProposedValue::new(height, round, value);
    if reply.send(lpv).is_err() {
        tracing::warn!("{APP_REPLY_WAIT_LOG} (GetValue)");
    }
}
\`\`\`

16 行。5 つの論理ステップ:

1. **Payload attributes を build。** \`default_attrs()\` は \`PayloadAttrs { timestamp: 0, fee_recipient: [0u8; 20], prev_randao: [0u8; 32] }\` を返す。Production ではどこかから来る — chain config、validator settings、前のブロックの randao reveal。v0 ではこれらは定数だ、chain logic のどの部分もまだ依存していないからだ。

2. **Payload build を start。** \`bridge.build_payload(current_parent, attrs).await\` — テストモードでは即座に \`PayloadId\` を返す (sync impl) か、production では async job を start する (\`LiveRethEvmBridge\` で、Reth の payload-builder service に dispatch する)。

3. **ブロックを待つ。** \`bridge.payload_ready(id).await\` — assemble された \`ExecutedBlock\` を返す。テストモードでは即座に返る; production では payload-builder service が ready をシグナルするまで block する (または propose timeout が fire し、round を失う — §5 で回避方法を見る)。

4. **\`LocallyProposedValue\` でラップ。** Malachite の app-channel はこの type を local に build された proposal の contract handoff として使う。\`(height, round, value)\` の struct だ。\`Proposal\` を直接構築するのではない — それは consensus actor の仕事だ。

5. **Reply oneshot 経由で送信。** \`reply.send(lpv)\` は \`tokio::sync::oneshot\` channel だ。Engine actor は oneshot の反対側で block して待っている。**送らないと Malachite が stall する** (L10 の \`Decided\` reply と同じ halt パターン)。\`is_err()\` で warning を送る — \`send\` が失敗する唯一の方法は receiver がすでに drop されていることだからだ — engine が timeout して先に進んだ意味だ。

> 🛑 **予測。** Step 5 の \`reply.send(...)\` が engine の propose timeout 発火 *後* に起こるとどうなる?

\`send\` は \`Err(_)\` を返す、engine がすでに oneshot を諦めたからだ。Warning をログして続行する。**Malachite は我々の proposal なしに次の round に進む** — round が timeout し、prevote は nil に行き、次の proposer (round-robin) が番をもらう。Chain は halt しない; ただ round を 1 つ失うだけだ。

これは correct な挙動だ: 遅い proposer は chain を永久に block すべきではない。1/3+ byzantine fault assumption がこれから保護する — 1 round あたり 1 validator が遅くても、chain は average validator のスピードで進む。

## 4. \`LocallyProposedValue\` — consensus が実際に受け取るもの

我々は Malachite \`Proposal\` を直接構築しない。\`LocallyProposedValue::new(height, round, value)\` を構築する。Malachite の Consensus actor が我々の値を取り、\`OpenHlContext::new_proposal\` (L4 領域) 経由で \`Proposal\` を build、\`SigningProvider\` (Stage 6a) 経由で sign、署名済み Proposal を Network actor に gossip 用に渡す。

我々はそれら 4 操作のどれもしない。Trait split は意図的だ: 我々は *値選択* (どのブロックを propose するか) を所有し、Malachite は *proposal 構築* (wire 形式)、*signing*、*broadcast* を所有する。

| Operation | Owner | なぜこの owner か |
| :--- | :--- | :--- |
| 値を pick | **openhl app loop** | Application-specific — chain が何をブロックと見なすかを決める |
| \`Proposal\` struct でラップ | Malachite | Consensus-protocol concern — on-wire 形式は BFT spec で固定 |
| Sign | \`OpenHlSigningProvider\` (Stage 6a) | Validator-key-specific — 我々だけが key を持つ |
| Broadcast | Malachite Network actor | Network-layer concern — gossipsub topic 管理 |

これが L1 §5 が 4 メッセージ contract で名指した同じ separation-of-concerns だ: bridge は「EVM が何をするか」を所有; Malachite は「consensus が何をするか」を所有; SigningProvider は「我々の validator の key が何をするか」を所有。各部分は隔離してデバッグできる程度に小さい。

## 5. 我々がまだ使っていない async trick

§3 の step 2 と 3 をもう一度見よ。\`build_payload\` と \`payload_ready\` は *別 call* — 偶然ではない。Split は production で次を可能にする:

\`\`\`
Time:  t=0       t=200ms        t=400ms                   t=propose
       │           │               │                          │
       ▼           ▼               ▼                          ▼
       │       round N-1            │            our slot starts (round N)
       │   voting in progress       │
       │           │               │                          │
       └─ build_payload(...)─async─┴─ payload_ready(id) ─────┘
          (round N-1 がまだ          (すでに built された
           voting 中に kick off)        block を fetch するだけ)
\`\`\`

\`build_payload\` は早期に call される — 前 round の decided block が分かった瞬間に — EL は round の投票時間を次のブロックの並列 assembly に費やせる。\`payload_ready\` が call される頃にはブロックがそこに座っている。Propose 時の critical path は「準備された payload を fetch + reply を送信」に減る — ミリ秒ではなくマイクロ秒だ。

これが L7 §4 の **build-during-voting** 最適化だ。**今日の openhl コードはこれをしない** — \`AppMsg::GetValue\` arm は同じハンドラ内で \`build_payload\` と \`payload_ready\` を連続で call する。テストモードでは問題ない (どれもマイクロ秒だ)。Production では「\`build_payload\` を round-decided 時に kick off、\`payload_ready\` を propose 時に await」に変える必要がある。

Trait surface はこれをすでにサポートする — 4 メソッド split が API だ。Async 最適化のための実装作業は bridge の外に住む: AppMsg loop が \`GetValue\` が来る前に \`build_payload\` を call することを学ぶ必要がある。

> 🛑 **反流暢性。** 「\`build_payload\` と \`payload_ready\` は今日常に一緒に call されるから 1 つのメソッドに collapse できる。」 **違う。** 今日一緒に call される事実が我々が最終的に直すバグだ — trait は fix を *可能にする* よう形作られている。メソッドを collapse すると同期設計を永久に lock-in する。

## 6. Reply の後 — Malachite が何をするか

\`reply.send(lpv)\` が return すると、我々のコードは終わりだ。Malachite の Consensus actor が値を受信し、残りをする:

1. \`OpenHlContext::select_proposer\` で (height, round) の proposer の address を lookup (我々であることを verify)
2. \`OpenHlContext::new_proposal(height, round, value, pol_round, address)\` を call して \`Proposal\` を構築
3. Proposal を \`OpenHlSigningProvider::sign_proposal\` に渡して Ed25519 署名
4. \`SignedProposal\` でラップして Network actor に渡す
5. Network actor が libp2p gossipsub 経由で broadcast
6. 各 peer が proposal を受信、署名を validate、*自分の* Consensus actor に external input として渡す

そのリストの step 1 で我々は終わりだ。Proposer から見れば、下流の pipeline 全体は opaque だ — actor フレームワークが handle する。

これが L11 のレッスンを具体化したものだ: **proposer のコードが小さいのは contract が well-designed だからだ。** Malachite が consensus protocol を handle; 我々が application-specific な「どの値を propose するか」を handle; bridge が EL-specific な「どう build するか」を handle する。

## 7. 練習

1. **予算を trace せよ。** Production の openhl デプロイメントが 1 秒の propose timeout を使う。Reth の payload builder は典型的に 200ms かかる。Peer へのネットワーク伝播は ~80ms。**1 秒の予算の残りはどれだけか?** Proposer はそのバッファを何に使うか? (ヒント: peer からの prevote 収集は proposal broadcast と並列に起こるが、proposer は precommit 前に 2/3+ prevote を待つ。)

2. **Timeout 無視行を見つけよ。** \`engine_app.rs:65@0844d58\` で、\`AppMsg::GetValue\` destructure は \`timeout: _\` を持つ。\`timeout\` や別フィールドを \`_\` で破棄する他のすべての AppMsg variant を見つけよ。それらは load-bearing か? (ヒント: ほとんどは fine — 全フィールドが必要なわけではない — が、1-2 個は production gap かもしれない。)

3. **Async 最適化を sketch せよ。** 今日の \`AppMsg::GetValue\` ハンドラは sync (build + ready 連続)。代わりに毎 \`AppMsg::Decided\` 直後に \`build_payload\` を call、結果の \`PayloadId\` を \`(next_height, round=0)\` で keyed して保存するよう diff を sketch せよ。それから \`GetValue\` は単に \`payload_ready\` + \`reply.send\` になる。これは L10 §5 の \`Next::Restart\` とどう interact するか?

> **最終チェック。** 1 文で、なぜ openhl の proposer コードは \`Proposal\` を直接構築せず、\`LocallyProposedValue\` を返して Malachite に \`Proposal\` を build させるのか? 答えに「separation of concerns: application は値選択を所有、consensus は proposal 構築を所有」または「on-wire \`Proposal\` 形式は application ではなく consensus protocol で固定」が含まれていなければ、§4 を再読。`,
                },
              ],
            },
          },
          {
            title: "Single-validator devnet",
            sortOrder: 4,
            lessons: {
              create: [
                {
                  title: "Bootstrap — genesis、key、single-node config",
                  slug: "openhl-devnet-bootstrap-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 30,
                  content: `# Bootstrap — genesis、key、single-node config

お前は module 1-4 のすべての概念をインストールした。Contract (L1) を読め、Engine API (L7) を trace し、bridge (L9) を設計し、decided block (L10) を commit し、proposer として 1 つ produce (L11) できる。**さあ bootstrap する。** 最小の runnable openhl はどう見えるか — 1 validator、1 node、peer なし? そしてなぜそれが「toy」が実際にこれまで build してきたものすべての real test なのか?

> 🛑 **スクロール前に予測。** 1 validator devnet を動かしたい。構築する必要のある artifact をリストせよ (まだコードを書かず — 列挙のみ)。ヒント: 正確に 4 つあり、SHA \`0844d58\` ですでに 3 つが存在する。

## 1. 4 つの artifact

Single-validator openhl devnet を bootstrap するには:

| Artifact | 何を carry するか | openhl のどこ |
| :--- | :--- | :--- |
| **Ed25519 keypair** | 署名用 validator identity | \`PrivateKey::generate(OsRng)\` で生成 |
| **Validator set** | 「誰が propose / vote できるか」 — 我々だけ、\`voting_power = 1\` で | \`crates/consensus/src/types/validator.rs:42@0844d58\` の \`OpenHlValidatorSet::new(vec![...])\` |
| **ChainSpec** | Genesis state、hardfork timestamp、chain ID | \`reth_chainspec::ChainSpec\`、\`Genesis\` JSON から構築 |
| **Home directory** | WAL の書き込み先、key を persist できる場所 | テストでは \`tempfile::tempdir()\`; production では real path |

加えて \`OpenHlConfig\` (NodeConfig + ConsensusConfig + ValueSyncConfig) — がほとんどデフォルト。上記 4 つが chain-defining 入力だ。

## 2. \`OpenHlNode\` コンストラクタ

すべてが 1 つの struct に bundle される。\`crates/consensus/src/node.rs:144@0844d58\`:

\`\`\`rust
pub fn new(
    private_key: PrivateKey,
    validator_set: OpenHlValidatorSet,
    home_dir: PathBuf,
    moniker: impl Into<String>,
) -> Self {
    Self {
        private_key,
        validator_set,
        home_dir,
        moniker: moniker.into(),
    }
}
\`\`\`

4 フィールド、驚きなし。\`moniker\` は単なる人間可読 identifier だ — ログと metrics に出る。他の 3 つは §1 の chain-defining 入力 (ChainSpec は \`load_config()\` 経由で plumbed され、ここには格納されない — §5 参照)。

テストヘルパー \`single_validator_node\` (\`crates/consensus/src/node.rs:249@0844d58\`) が end-to-end 構築を walk する:

\`\`\`rust
fn single_validator_node(home_dir: PathBuf) -> OpenHlNode {
    let sk = PrivateKey::generate(OsRng);
    let pk = sk.public_key();
    let digest = Sha256::digest(pk.as_bytes());
    let mut addr_bytes = [0u8; 20];
    addr_bytes.copy_from_slice(&digest[12..32]);
    let address = OpenHlAddress(addr_bytes);
    let validator_set =
        OpenHlValidatorSet::new(vec![OpenHlValidator::new(address, pk, 1)]);
    OpenHlNode::new(sk, validator_set, home_dir, "openhl-test")
}
\`\`\`

8 行。Keypair を generate、Ethereum 形式 address を derive (\`SHA-256(pubkey)\` の最後の 20 byte — L4 §1 参照)、\`voting_power = 1\` の 1 要素 validator set にラップ、node を instantiate。

これが **最小 chain だ。** Module 1-4 のすべて — Context impl、bridge、engine actor、Reth 統合 — がこの単一 struct に対して動く。

## 3. Single-validator のエスケープハッチ

Bona-fide な BFT chain は \`f\` byzantine fault を許容するには \`n ≥ 3f + 1\` validator が必要だ。最小の非自明 set は \`n = 4, f = 1\`。なぜ single-validator (\`n = 1, f = 0\`) で動くのか?

動くのは **quorum 閾値が vacuously に easy になる** からだ: 2/3 の 1 validator はまあ 1 validator だ。我々が唯一の voter だから常に quorum を持つ。Byzantine fault が attack する対象がない — 反対する他の validator がいない。

\`OpenHlContext::select_proposer\` の round-robin (L4 §3 領域) は single-validator では定数関数になる: 我々が常に proposer だ。すべての prevote、precommit、commit certificate は正確に 1 つの署名を持つ — 我々のものだ。

> 🛑 **反流暢性。** 「Single-validator は偽 consensus、何も証明しない。」 **違う。** Single-validator は *real* consensus を degenerate validator set に対して走らせている。すべての piece が exercise される:
> - \`OpenHlContext\` trait surface (proposer election、proposal 構築、vote signing)
> - \`ConsensusBridge\` contract (全 4 メソッド)
> - エンジン actor system (libp2p start、ractor actor spawn、WAL write)
> - Reth 統合 (\`LiveRethEvmBridge\` path が \`EthBeaconConsensus\` に対して validate)
>
> Exercise しないもの: multi-peer ネットワーク gossip、sync protocol、byzantine handling。それは \`run_multi_validator\` 領域 (codebase の Stage 5)。しかし「byzantine handling なし」は **「consensus なし」ではない** — 「全 consensus 機構、trivial topology 上」だ。

## 4. ChainSpec

方程式の Reth 側。\`Genesis\` JSON から構築 — v0 では \`crates/evm/src/reth_node.rs:35@0844d58\` の minimal post-merge dev spec を使う:

\`\`\`rust
fn dev_chain_spec() -> Arc<ChainSpec> {
    let custom_genesis = r#"{
        "nonce": "0x42",
        "timestamp": "0x0",
        "extraData": "0x5343",
        "gasLimit": "0x5208",
        "difficulty": "0x400000000",
        "alloc": {},
        "number": "0x0",
        "parentHash": "0x00...",
        "config": {
            "ethash": {},
            "chainId": 2600,
            "homesteadBlock": 0,
            // ... London、Paris、Shanghai すべて 0 で
            "terminalTotalDifficulty": 0,
            "shanghaiTime": 0
        }
    }"#;
    let genesis: Genesis = serde_json::from_str(custom_genesis).expect("...");
    Arc::new(genesis.into())
}
\`\`\`

Chain ID 2600 は Reth 自身の \`custom-dev-node\` 例を mirror するので、chain はその reference に対して observable-compatible だ。すべての hardfork は block 0 から有効 (post-merge dev mode); PoW phase なし、chain lifetime 中の fork 遷移なし。

ChainSpec は 2 つの consumer に feed する:
- **Reth 側**: \`NodeBuilder::new(NodeConfig::test().dev().with_chain(chain_spec.clone()))\` (§5)
- **OpenHL bridge**: \`LiveRethEvmBridge::new(provider, chain_spec)\` (Stage 7c) — この chain の hardfork に対して走る \`EthBeaconConsensus\` validator を構築

同じ \`Arc<ChainSpec>\` が両者に流れる。**両者は同意しなければならない** — bridge の validator と Reth の executor が有効ブロックについて disagree すると、chain は最初の hardfork-sensitive 操作で fork する。

## 5. \`load_config\` 内のエスケープハッチ

\`crates/consensus/src/node.rs:34@0844d58\` の \`OpenHlConfig::new(moniker)\` が consensus config を build する:

\`\`\`rust
pub fn new(moniker: impl Into<String>) -> Self {
    let consensus = ConsensusConfig {
        value_payload: ValuePayload::ProposalOnly,  // ← 我々の ProposalPart が要求
        ..ConsensusConfig::default()
    };
    Self { moniker: moniker.into(), consensus, value_sync: ValueSyncConfig::default() }
}
\`\`\`

加えて \`load_config()\` の listen-address override:

\`\`\`rust
cfg.consensus.p2p.listen_addr = "/ip4/127.0.0.1/tcp/0"  // OS が port を選ぶ
    .parse()
    .map_err(|e| eyre!("invalid listen_addr: {e}"))?;
\`\`\`

Port 0 は「OS が ephemeral port を選ぶ」を意味する — テストには重要 (衝突なし)、production では無害 (real config file で override する)。

## 6. 練習

1. **4 つの artifact を再導出せよ。** 何も見ずに、bootstrap で \`OpenHlNode::new\` が必要とするもの (または \`start_engine\` に流れるもの) 4 つをリストせよ。各々を \`node.rs\` の introduce 行と match させよ。
2. **Voting-power-1 質問。** \`single_validator_node\` では validator が \`voting_power = 1\` で作られる。\`voting_power = 100\` を使ったら何か変わるか? (ヒント: single-validator mode では 100 power の 100% は 1 power の 100% と同じ — しかしロギング、metrics、仮想 second validator が overcome すべきものについて考えよ。)
3. **bin/openhl gap。** \`bin/openhl/src/main.rs@0844d58\` を開け。実際に何をしているか? Real \`openhl run\` コマンドになるには何が必要か? 関数 body を sketch せよ。(ヒント: 大体 \`start_engine_smoke_spawns_and_kills\` の body から smoke-test assertion を除いたもの。)

> **最終チェック。** 1 文で、なぜ trivial quorum でも single-validator mode が「全 consensus 機構」をテストするのか? 答えに「trait surface、actor system、Reth 統合」または「multi-peer gossip と byzantine handling を除くすべて」が含まれていなければ、§3 を再読。`,
                },
                {
                  title: "最初のブロック — openhl を走らせ、tick するのを見る",
                  slug: "openhl-devnet-first-block-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 30,
                  content: `# 最初のブロック — openhl を走らせ、tick するのを見る

テスト出力に \`decided_hash = BlockHash([0x42; 32])\` が見えたら、**本コースのすべての概念が正しく compose されたのだ**。これから wire でそれがどう見えるかを読む。

これがコースの最終レッスンだ。前の 12 が piece を build した — contract (L1)、Context (L3-L5)、Reth 統合 (L6-L8)、bridge 配線 (L9-L11)、bootstrap (L12)。L13 はそれらを一緒に走らせ trace を読む。

> 🛑 **スクロール前に予測。** \`first_block_via_engine_actors\` を走らせて assertion failure を得たとイメージせよ: \`decided[0]\` が build したものと違う。コードを見ずに、何が悪かった可能性のあること 5 つを *最も可能性が高い順に* リストせよ。Sketch を実際のフローに対して trace する。

## 1. v0 における runnable artifact

今日の「openhl devnet」は \`crates/consensus/src/engine_app.rs:246@0844d58\` の integration test だ:

\`\`\`rust
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn first_block_via_engine_actors() {
    let tmp = tempfile::tempdir().unwrap();
    let node = make_test_node(tmp.path().to_path_buf());
    let validator_set = node.validator_set.clone();

    let handle = node.start().await.expect("start_engine failed");
    let channels = handle.take_channels().await.expect("...");

    let bridge = Arc::new(StubBridge::default());
    let bridge_for_check = bridge.clone();

    let app_task = tokio::spawn(run_engine_app(bridge, channels, validator_set, 1));

    let decisions = tokio::time::timeout(Duration::from_secs(15), app_task)
        .await.expect("timed out").expect("panicked").expect("returned err");

    assert_eq!(decisions.len(), 1, "expected exactly one decided block");
    let decided_hash = decisions[0];

    let committed = bridge_for_check.committed.lock().unwrap().clone();
    assert_eq!(committed, vec![decided_hash], "bridge must commit decided hash");
    assert_eq!(
        *bridge_for_check.last_built.lock().unwrap(),
        Some(decided_hash),
        "decided hash must match what we built",
    );

    handle.kill(None).await.unwrap();
}
\`\`\`

走らせるには:

\`\`\`bash
cargo test -p openhl-consensus first_block_via_engine_actors
\`\`\`

実行時間: 実際の consensus round は ~0.02 秒 (libp2p + ractor 起動が ~2.5s で wall clock を支配)。

## 2. AppMsg トレース、順番に

テストが走るとき、engine は次の順で \`run_engine_app\` ループに AppMsg イベントを emit する:

| # | AppMsg | 我々のハンドラがすること |
| :--- | :--- | :--- |
| 1 | \`ConsensusReady\` | \`(INITIAL height, validator_set)\` で reply |
| 2 | \`StartedRound { height=1, round=0, proposer=us, role=Proposer }\` | \`Vec::new()\` で reply (cached proposal なし) |
| 3 | \`GetValue { height=1, round=0, timeout }\` | \`bridge.build_payload\` + \`payload_ready\` を call、\`LocallyProposedValue\` で reply |
| 4 | (Malachite が内部 handle: proposal を sign、"broadcast" — peer なしだが動作する) | — |
| 5 | (Malachite が内部 handle: prevote、polka、precommit) | — |
| 6 | \`Decided { certificate }\` | \`bridge.commit(hash)\` を call、\`decided\` vec に push、\`Next::Start(height=2)\` で reply |

6 つの AppMsg イベント。我々のコードから 3 つの reply。**1 つの decided block。** これがコース全体を 1 トレースに収めたものだ。

> 🛑 **予測。** Step 4 と 5 は完全に Malachite 内部だ — 我々の \`GetValue\` への reply (step 3) と \`Decided\` の到着 (step 6) の間で起こる。Single-validator chain では、step 4-5 で実際にどんな consensus protocol activity が起こるか?

答え: **同じ protocol が走る**、ただすべての vote が我々からだ。Malachite の Consensus actor は (1) 我々の値を \`Proposal\` でラップして sign (Stage 6a の \`OpenHlSigningProvider\`); (2) \`OpenHlContext::new_prevote\` を call、sign、"broadcast"; (3) VoteKeeper が prevote を受信して tally — 1/1 vote で我々の値、2/3 閾値を超える; polka 到達; (4) \`new_precommit\`、sign、"broadcast"; (5) 1/1 precommit が閾値超え; (6) Decided event 発火。Protocol 全体が trivial validator set に対して execute する。

## 3. Assertion が証明するもの

テストは 3 つを assert する:

\`\`\`rust
assert_eq!(decisions.len(), 1, "expected exactly one decided block");
let decided_hash = decisions[0];

let committed = bridge_for_check.committed.lock().unwrap().clone();
assert_eq!(committed, vec![decided_hash], "bridge must commit decided hash");
assert_eq!(
    *bridge_for_check.last_built.lock().unwrap(),
    Some(decided_hash),
    "decided hash must match what we built",
);
\`\`\`

平易な日本語で:
1. **正確に 1 つの decision が出た** — ゼロではなく (chain halt せず)、2 でもなく (\`stop_after_decisions = 1\` の early-return が正しく動いた)。
2. **Bridge が consensus が合意した hash を commit した** — L10 の commit path が実際に発火したことを証明。
3. **Decided hash が \`build_payload\` が produce したものと一致する** — L11 の propose path が、Malachite の signing + broadcast + voting を経由して Decided として戻ってくるまで intact に round-trip した値を produce したことを証明。

これが本コースの **end-to-end check** だ。3 つすべてが pass すれば、L1 から L12 までのすべてのレッスンが順番に execute したことになる。

## 4. Trace 出力を読む

\`RUST_LOG=info\` で走らせる:

\`\`\`bash
RUST_LOG=informalsystems_malachitebft=info,openhl=info \\
  cargo test -p openhl-consensus first_block_via_engine_actors -- --nocapture
\`\`\`

(おおよそ) 次が見える:

\`\`\`
INFO  consensus: starting consensus engine
INFO  network: libp2p listening on /ip4/127.0.0.1/tcp/<port>
INFO  wal: opened wal at /tmp/.tmpXXX/wal
INFO  consensus: ConsensusReady — height=1, validators=1
INFO  consensus: starting height=1
INFO  consensus: proposer for height=1 round=0 is <our address>
INFO  consensus: building payload (parent=<genesis> attrs=...)
INFO  consensus: payload ready (id=PayloadId(1))
INFO  consensus: proposing height=1 round=0 value=<hash>
INFO  consensus: prevote (h=1 r=0 v=<hash>) from <our address>
INFO  consensus: polka reached at height=1 round=0
INFO  consensus: precommit (h=1 r=0 v=<hash>) from <our address>
INFO  consensus: decided at height=1 round=0 value=<hash>
INFO  consensus: committed via bridge: <hash>
INFO  consensus: starting height=2
\`\`\`

各行は本コースの 1 文にマップする。**このトレースを 1 度読め。** お前が学んだ各層について「chain が実際に何をするか」の答えだ。

## 5. 次に壊すもの

走らせる価値のある pedagogical 実験 3 つ:

1. **Propose-timeout を 1ms までクランクダウンせよ。** \`OpenHlConfig::new\` を編集して \`consensus.timeouts.timeout_propose = Duration::from_millis(1)\` に set。テストを再実行。何が起こるか? (ヒント: テストモードの bridge call は十分速いのでまだ動く。しかし production-mode で real payload builder では round を失う。)

2. **Second validator を追加せよ。** \`single_validator_node\` を変更して 2 keypair を生成し両方を validator set に入れる、ただし 1 node だけを走らせる。テストは何をするか? (ヒント: 2 番目の validator は node を持たない、vote が決して到着しない。単一稼動 node は 1/2 voting power = 50% を持ち、2/3 閾値を下回る。Chain は stall する。**これが正しい挙動** — BFT は validator が存在することではなく、voting power の少なくとも 2/3 から実際の vote を要求する。)

3. **Bridge を壊せ。** \`StubBridge::commit\` が \`BridgeError::Internal(eyre!("oops"))\` を返すよう作れ。再実行。何が起こるか? (ヒント: \`run_engine_app\` がエラーを propagate、spawned task が \`Err\` を返す、テストは propagation chain で panic する。**L9 §4 の halt-the-chain 挙動 in action。**)

> 🛑 **反流暢性。** 「テストが pass すれば production で chain が動く。」 **完全には正しくない。** テストは 4 メッセージ contract の *correctness*、actor 配線、trait impl を exercise する。Exercise *しない*: ネットワーク遅延下の liveness、byzantine validator、partial state からの sync、負荷下の gossip 伝播、real Reth payload assembly with mempool。それらは別 scale の integration test だ。**First-block テストは passing necessary condition だが、production readiness の sufficient condition ではない。**

## 6. 次に何が来るか — Module 2 の preview

本コース (openhl の Module 1) は consensus substrate を build する。Module 2-5 はその上に build する:

- **Module 2 — CLOB matching engine** — real transaction を追加: マッチされた fill を produce する deterministic orderbook。\`LiveRethEvmBridge::validate_payload\` が実際に block body を execute する初の時 (今日のテストは空ブロックを validate)。
- **Module 3 — Core↔EVM precompile** — EVM に CLOB state を読ませるカスタム REVM precompile。Orderbook (off-EVM) と EVM を bridge する。
- **Module 4 — Funding、oracle、liquidation** — settlement loop。Chain が perp DEX に見える場所。
- **Module 5 — Vault primitive** — first-class on-chain object、Kodiak 系の strategy が app contract ではなく protocol-native になる。

本コースの trait surface は Module 2-5 で変わらない。**4 メッセージは 4 メッセージのままだ。** 変わるのは EL crate が \`build_payload\` (real transaction) と \`validate_payload\` (state に対する real execution) の内部ですることだ。

## 7. 練習

1. **自分の run を trace せよ。** \`RUST_LOG=info\` と \`--nocapture\` でテストを走らせ。各ログ行を本コースのセクションにマップせよ。マップしない行: issue を立てよ。(数行あるかもしれない — production logging は curriculum coverage を outpace することがある。)
2. **Failure mode を予測せよ。** 走らせずに、Decided arm の \`reply.send(Next::Start(...))\` 行を削除したら \`cargo test first_block_via_engine_actors\` が何をするか予測せよ。それから走らせて confirm せよ。
3. **2-validator stall。** §5 の実験 2 を実装せよ。Chain は stall する — stall するときトレースがどう見えるか観察せよ。Silence 前の最後のログ行は何か?

> **最終チェック。** 1 文で、*「テストが pass した」* と *「production で chain が動く」* の違いは何か? 答えに「adversarial condition 下の liveness」または「テストは passing-necessary であり sufficient ではない」が含まれていなければ、§5 の反流暢性 callout を再読。

---

**おめでとう** — お前は *Building OpenHL — Consensus Substrate* を完了した。L1 Architect tier の次のコースは Module 2 (CLOB matching engine) から始まる、real transaction が初めて system に入る場所だ。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
