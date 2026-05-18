# Building OpenHL — L1 draft (JA)

> openhl SHA `0844d58` (Stage 7c) に対してドラフト。
> EN ミラー: `drafts/openhl_l1_en.md`。
> rethlab の chapter format に準拠 (3am hook → 🛑 予測/反流暢性 callout → 番号付きセクション → 練習 + 最終チェック)。
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10)。
> course arc の最初のレッスン — 他のすべてのレッスンが参照する 4 メッセージ contract を確立する。

---

## L1 — `openhl-consensus-contract-ja`

- **Module:** 1 (execution/consensus split)、module 内 sortOrder 0
- **Course-level sortOrder:** 0 (13 レッスン中の 1 番目)
- **Duration:** 15 分
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# BFT と EVM の contract

午前 3 時。OpenHL の devnet が 3 ブロック前から停止している。Malachite のログは `waiting for value` と言う。Reth のログは `engine idle` と言う。どちらも error を投げていない。**どっちが壊れているのか?**

この質問に 30 秒で答えられないなら、バグはどちらの crate にもない — 2 つがどう話しているかのメンタルモデル側にある。本レッスンはそのモデルをインストールする。読み終える頃には、consensus と execution の間を流れる 4 つのメッセージ、それぞれの promise、そしてどれかが消えたときにどちらの crate を責めればいいかが正確に分かるようになる。

> 🛑 **スクロール前に予測。** 同一プロセス内で動く 2 サービス: Malachite (BFT) と Reth (EVM)。**ブロックが produce され commit されるまでに両者間を流れる必要があるメッセージを、思いつくだけ挙げよ。** 「ブロックが consensus から EVM に流れる」で止まったなら、contract はまだ手に入っていない。

## 1. なぜ contract が必要か

素朴な L1 は consensus と execution を 1 つの巨大モジュールに融合させる。State の更新、署名検証、fork choice、投票集計、mempool — すべて 1 つのバイナリに、すべて絡み合って。これは 2020 年以前のほとんどのチェーンの書き方だ。動く。**しかし、すべてを失うコストが伴う。**

コストは 3 箇所に落ちる:

| コスト | 何を失うか |
| :--- | :--- |
| **Swappability** | EVM を書き直さずに consensus を変えられない、逆もしかり。HL は HyperBFT v1 から v2 へ移行する際 matching engine に触れずに済む — v1 と v2 は同じ contract を honor するからだ。 |
| **Testability** | EVM を起動せずに consensus を unit-test できない、逆もしかり。両半分とも integration-test オンリーになる。 |
| **Debuggability** | 午前 3 時にどちら側が stall したか分からない。クラッシュダンプは区別のつかない泥団子になる。 |

Contract がその答えだ。両側のメッセージに名前を付けると、それぞれの側を単独で replace、mock、fuzz、reason できるようになる。**Contract が API である。コードは実装詳細だ。**

## 2. BFT が EVM に約束するもの

consensus crate が execution crate に負っているのは厳密に 2 つ:

1. **Committed ブロックの ordered stream。** すべての validator が同じブロックを同じ順序で見る。Gap なし。Reorg なし — classical BFT chain においては。Nakamoto chain はもっと弱いものを約束するが、ここで作っているのはそれではない。
2. **Validity assertions。** Commit された各ブロックは ≥ 2f+1 の validator によって投票された。EVM が適用して invalid な state を生成したら、それは *実装側* のバグであり consensus のバグではない。

これが BFT 側から見た contract の全部だ。ここに *無い* ものに注意:

- 「正しい transactions」ではない。(BFT は tx が何をするか知らない。)
- 「正しい state root」ではない。(BFT は state を compute していない。)
- 「正しい canonical fork」ではない。(BFT には fork *自体が* 存在しない — それが要点だ。)

> 🛑 **反流暢性。** 「Consensus が次の state を選ぶ。」 **違う。** Consensus は次の *ブロック* を選ぶ。State はそのブロックを適用したときに EVM が compute するものだ。2 validator が state について意見が違う場合、それは consensus のバグではない — execution の determinism バグだ。

## 3. EVM が BFT に約束するもの

execution crate が consensus crate に負っているのは厳密に 3 つ:

1. **Deterministic execution。** State S にブロック B を適用したとき、すべての validator が同じ S' を生成する。Floating-point なし、system time なし、randomness なし、map iteration order なし。Determinism は non-negotiable; 1 つの違反でチェーンが fork する。
2. **Fast block assembly。** Consensus が「ブロックを build せよ」と言ったとき、execution は propose-timeout の予算内 (HL、Tempo、OpenHL では ~300–500ms) でブロックを返す。それより遅いとチェーンが stall する。
3. **Import 時の validity verification。** Peer の proposal が到着したとき、execution は「これは cleanly に execute するか?」を *commit 前に* 答えられる。

> 🛑 **予測。** EVM の 3 つの promise のうち、1 つは他より遥かに難しい。**どれで、なぜ自前 L1 を書くチームを最も頻繁に噛むのか?** 偶然 ship してしまう nondeterminism の最も簡単なソースを考えよ。

答えは determinism だ。すべての junior エンジニアは最終的に「ちょっとログ出すだけ」のために `HashMap` の iteration や `SystemTime::now()` を追加し、午前 3 時にチェーンを fork させる。Reth の API surface がこれについて paranoid なのには理由がある; 尊重せよ。

## 4. 4 つのメッセージ

これが contract の全部、4 つのメッセージで:

| 方向 | メッセージ | 送信タイミング | Promise |
| :--- | :--- | :--- | :--- |
| CL → EL | `build_payload(parent, attrs)` | validator が height N の proposer になったとき | 「`parent` の上に candidate block を build せよ。」 |
| EL → CL | `payload_ready(block, state_root)` | propose deadline 前に build が完了したとき | 「ブロックはこれだ。proposal value として使え。」 |
| CL → EL | `validate_payload(block)` | peer の proposal が到着したとき | 「このブロックは cleanly に execute するか? VALID / INVALID / SYNCING で答えよ。」 |
| CL → EL | `commit(block_hash)` | height N で BFT が `Decided` に到達したとき | 「このブロックを new head として finalize せよ。」 |

それだけだ。CL → EL 方向に 3、EL → CL 方向に 1。**他のあらゆる interaction は leak である。**

このテーブルで明確に見るべきものが 3 つある:

- **Validation と commit は分離されている。** Validator は height ごとに多数の candidate block を import し (round-robin の各 proposer slot あたり 1 つ)、それぞれを speculatively に execute し、commit するのは 1 つだけだ。多くのチームはこれらを 1 つのメッセージに collapse し、後で speculative execution が feature ではなく refactor になったときに代償を払う。
- **`build_payload` は即座に何も返さない。** Async build job を kick off するだけ; ブロックは後で `payload_ready` 経由で到着する。これが「build during voting」のトリック — payload assembly が前のブロックの投票と overlap するので、propose の hot path がほぼゼロ latency になる。
- **`commit` は fire-and-forget。** consensus が「これは final だ」と言ったら、execution は適用しなければならない。「本当にいいんですか?」の round-trip は存在しない。Execution が committed block を適用できない場合、チェーンは halt する。それが正しい挙動だ — committed block を silently に drop するのが世界を fork させるやり方だ。

## 5. OpenHL コードでの boundary の在処

具体的に我々の workspace では:

```
crates/consensus/      ← Malachite を話す。CL 側から 4 メッセージを所有。
  src/bridge.rs        ← ConsensusBridge trait — 境界を渡る typed cable
  src/runner.rs        ← build_payload を発行し、payload_ready を待つ
  src/engine_app.rs    ← validate_payload + commit を発行 (AppMsg ループ経由)

crates/evm/            ← Reth を話す。EL 側から 4 メッセージを所有。
  src/engine.rs        ← RethEvmBridge — Reth 型を使った early in-process impl
  src/live_node.rs     ← LiveRethEvmBridge — real Reth node に対する full impl
```

`crates/consensus/src/bridge.rs:11@0844d58` の `ConsensusBridge` trait が contract を textual に表現したものだ:

```rust
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
```

この trait を注意深く読め。**OpenHL における consensus と execution の間のすべての interaction は、これら 4 メソッドのいずれかを流れる。** 境界を別の方法で渡って reach しようとしている自分に気づいたら — consensus crate から Reth DB handle にアクセスしたり、EVM crate から Malachite の vote state を覗き見したり — それは contract を破った瞬間であり、1 週間以内に forked devnet で代償を払うことになる。

> 🛑 **反流暢性。** 「Reth *が* OpenHL の consensus layer だ。」 **違う。** Reth は `Consensus` trait を ship しているが、それは *block-validation hook* だ — parent-hash check、gas-limit check、EIP-1559 base-fee math。BFT エンジンではない。Reth には leader election も投票も view change も無い。BFT エンジンは Malachite であり、`crates/consensus` に座って、上記 4 メッセージを通じて Reth と話している。これらを混同するとアーキテクチャ図が永久に間違いになる。

## 6. 真面目な BFT L1 はすべて同じ場所に線を引いている

これは OpenHL の発明ではない。production にある真面目な BFT L1 がすべて converge した先だ:

| Chain | CL 側 | EL 側 | Contract surface |
| :--- | :--- | :--- | :--- |
| **Ethereum** | Lighthouse、Prysm、Teku、Nimbus | Reth、Geth、Erigon | JSON-RPC 経由の Engine API (`engine_newPayload`、`engine_forkchoiceUpdated`、`engine_getPayload`) |
| **Hyperliquid** | HyperBFT | HyperCore + HyperEVM | 内部 Rust trait (closed source) |
| **Tempo** | Tempo BFT (CometBFT-derived) | Reth-based | In-process Rust trait |
| **OpenHL** | Malachite | Reth | `ConsensusBridge` trait |

Ethereum は特殊例だ: contract が JSON-RPC 上にあるのは CL と EL が *別プロセス* で、しばしば異なる言語の異なるチームから来るからだ。HL、Tempo、OpenHL はすべて CL と EL を 1 バイナリで動かすので、contract は Rust trait — しかし **message surface は同じ**である。同じ形、違う transport。

> 🛑 **予測。** Ethereum の CL/EL split は CL と EL を別プロセスで JSON-RPC wire format で動かす。OpenHL は 2 crate を 1 バイナリで in-process trait で動かす。**Ethereum が process separation から得るものは何か、そしてそれが Ethereum と OpenHL に何のコストを払わせるか?** 誰が何を replace できるかを考えよ。

Ethereum は **client diversity** を得る: 4 CL、複数 EL、1 client がバグでダウンしても single-implementation risk が無い。Latency でコストを払う (RPC overhead、1 call あたり ~5–15ms)。OpenHL は low-latency call を得る (in-process で microsecond) が、1 バイナリで ship する。Sub-second finality を狙う single-team L1 にとって、trade は明らかに正しい。そして OpenHL がいつか client diversity を望むなら、trait は十分小さいので後で JSON-RPC 経由で expose できる — contract はすでに存在する。

## 7. 練習

1. **4 つのメッセージを何も見ずに再導出せよ。** 書き出せ: 方向、名前、いつ送るか、それぞれが何を約束するか。1 つでも漏らしたら、contract はまだ internalize されていない。
2. **Contract leak を見つけよ。** SHA `0844d58` で `crates/consensus/src/bridge.rs` と `crates/evm/src/live_node.rs` を開け。両ファイルを上から下まで読め。`ConsensusBridge` を *通らずに* 一方の crate からもう一方に access している箇所を identify せよ。あるべきではない。もし見つけたら issue を立てよ。
3. **Ethereum にマップせよ。** OpenHL の 4 メッセージそれぞれに対応する Ethereum Engine API メソッドの名前を挙げよ。
   *Cheat sheet:* `build_payload` + `payload_ready` ↔ `engine_forkchoiceUpdated` (with payload attrs) + `engine_getPayload`。`validate_payload` ↔ `engine_newPayload`。`commit` ↔ new finalized hash を持つ `engine_forkchoiceUpdated`。

> **最終チェック:** 1 文で、なぜ「EVM は consensus の internal state から最新の committed block を読めばいい」が contract を破るのか — そしてそれが引き起こす determinism failure mode は何か? 答えに「EVM crate が consensus internals に依存するようになり、その internals への変更がチェーンを fork させ得る」が含まれなければ、§5 を再読。
````

---

## Seed-file slot

L1 は `prisma/seed-reth-openhl-consensus-ja.ts` (course `building-openhl-consensus-ja`) に landing する、Module 1 の最初のレッスンとして:

```typescript
// Course.modules.create array:
{
  title: 'Execution/consensus split',
  sortOrder: 0,
  lessons: { create: [
    {
      title: 'BFT と EVM の contract',
      slug: 'openhl-consensus-contract-ja',
      type: 'CONTENT',
      sortOrder: 0,
      duration: 15,
      xpReward: 40,
      content: `# BFT と EVM の contract\n\n午前 3 時。 ...`  // L1 markdown
    },
    // L2: Hyperliquid、Tempo、CometBFT-based chain が converge する場所 (TBD)
  ]}
},
```

## SHA pinning discipline

すべての `file:line@SHA` cite は SHA `0844d58` を pin する。L1 は L7/L10 より cite が少ない — レッスンが大部分 conceptual (contract design) だからだ; anchored citation は `crates/consensus/src/bridge.rs:11` の trait のみで、これは Stage 6a (`13113db`) 以来安定しており `0844d58` でも変わっていない。

この trait は course arc 全体にとって load-bearing な artifact だ:
- L1 は contract として導入する
- L7 は各メソッドを Ethereum Engine API にマップする
- L9 は設計プロセスを walk する
- L10 はそれを exercise する commit handler を cite する

Trait surface への変更は 4 レッスンすべてを invalidate する; SHA で cite するので invalidation が detect 可能になる。

## Style review notes (self-critique before paste)

- **L1 が lesson-format テンプレートだった。** L7 + L10 はその cadence (3am hook → 7 sections → practice + final check) に従う。どれかを更新するときは cadence を一貫させ、コースが 1 つの voice で読めるようにすること。
- **§5 の "boundary がどこに住むか" テーブル** は最初 (proposer.rs、validator.rs、sync.rs といった) 存在しないパスを列挙していた。`0844d58` での実ファイル (bridge.rs、runner.rs、engine_app.rs、engine.rs、live_node.rs) と一致するよう更新済み。File layout が再シフトした場合 (例: actor-engine work が consolidate されたとき) はこのテーブルも追随が必要。
- **Exercise 2 は両ファイルを SHA `0844d58` で読むよう指示する** — これは 3 つのうち最も強力なエクササイズ、コードを実際に開かせるし「contract leak なし」の主張は testable だからだ。
- **翻訳 policy は L7/L10 JA と同一**:
  - Engine API 用語、Reth/Malachite 識別子、`bridge`、`commit`、`validator`、`consensus`、`execution`、`payload` は英語のまま。
  - 🛑 callout: Predict → 予測、Anti-fluency → 反流暢性。
  - File paths、function names、types は英語のまま。
- **「contract」をカタカナ「コントラクト」にしない理由**: 本レッスンは API design 教育であり、英語の "contract" は API/プロトコル/型 contract という多義語として機能している。カタカナにすると "smart contract" との混同を読者に持ち込む。
- **未公開**: `course.isPublished: false` のまま。L11/L12/L13 JA 翻訳が揃ってから一斉公開予定。
