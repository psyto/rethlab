# Building OpenHL — L7 draft (JA)

> openhl SHA `0844d58` (Stage 7c — `validate_payload` が Reth の `EthBeaconConsensus` を駆動する) に対してドラフト。
> EN ミラー: `drafts/openhl_l7_l10_en.md` の L7 セクション。
> レッスン 7 は Stage 7c の validator-forcing moment に anchor されているため、レッスン 10 (Stage 7d、SHA `0cac571`) とは独立に SHA `0844d58` で固定される。
> rethlab の chapter format に準拠 (3am hook → 🛑 予測/反流暢性 callout → 番号付きセクション → 練習 + 最終チェック)。
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10)。

---

## L7 — `openhl-engine-api-ja`

- **Module:** 3 (ライブラリとしての Reth)、module 内 sortOrder 1
- **Course-level sortOrder:** 6 (13 レッスン中の 7 番目)
- **Duration:** 15 分
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# Engine API — `forkchoice_updated` と `new_payload` が実際に何をしているか

午前 3 時。同じマシン上の 2 つのサービス — Reth プロセスと Lighthouse プロセス — が、**正確に 2 つの RPC メソッド** だけをやり取りしている。これが Ethereum の consensus layer と execution layer の間の会話のすべてだ。この 2 つのメソッドに名前を付け、openhl の実コードでそれらを trace し、実際の validator が「真っ当な実装でなければ通さない」と強制してくるさまを目にしたとき、なぜ HL や Tempo のようなチェーンが Ethereum の 12 秒に対してサブ秒 finality を提供できるかが分かるようになる。

> 🛑 **スクロール前に予測。** 2 つのメソッド、3 つの forkchoice ポインタ (head/safe/finalized)、1 つの payload-build hint、1 つの validation result。それぞれのメソッドが何を入力に取り何を返すかを紙に sketch してみよ。後で実際の spec と、`crates/evm/src/live_node.rs:68@0844d58` のコードに照らし合わせて検証する。

## 1. 会話に名前を付ける

Ethereum の Engine API — CL が EL と話すあらゆる場所で使われる — は active な call が 3 つある:

- `engine_forkchoiceUpdatedV3` — 「新しい head/safe/finalized state はこれだ。オプションで、この head から payload を build せよ。」
- `engine_getPayloadV3` — 「以前 build を開始した payload をくれ。」
- `engine_newPayloadV3` — 「このブロックを実行して、valid かどうか教えてくれ。」

3 つの call だが、概念的には 2 つの操作だ: `forkchoiceUpdated` + `getPayload` を合わせて 1 つの操作 (ブロックを build する) になる。これが「2 つのメソッド」フレーミングの根拠。

ここに **無い** ものに注意。「次の決定を送れ」という call は **無い**。CL は EL に「何を決定すべきか」を尋ねない。決定は CL 側で下される; EL は決定された内容を告げられる。

## 2. `forkchoice_updated` — 1 つのメソッドに 2 つの目的

```
forkchoiceUpdated(ForkchoiceState, Option<PayloadAttributes>) → ForkchoiceUpdatedResponse
```

`ForkchoiceState`:
- `headBlockHash` — EL が canonical head とみなすべきもの
- `safeBlockHash` — reasonably finalized なもの (PoS 用語では justified)
- `finalizedBlockHash` — 不可逆的に finalized なもの

`PayloadAttributes`:
- `timestamp`、`prevRandao`、`suggestedFeeRecipient`、加えて optional フィールド

何をするか:
- **常に**: EL の head/safe/finalized の view を更新する。
- **attrs が Some の場合**: 加えて payload-build job を開始し、後で結果を取得するための `PayloadId` を返す。

> 🛑 **予測。** なぜ `forkchoice_updated` は optional な payload-attribute 引数を取るのか? なぜ別の `start_build_payload` call にしないのか? ヒント: proposer の hot path における CL と EL の round-trip 数を数えてみよ。

答え: **amortization (償却)**。Proposer のもっともレイテンシ的にセンシティブな瞬間は自分の slot の開始時だ。「fork-choice を進める」と「build を開始する」が 2 つの別 call なら、2 RTT を支払う。Bundle すれば 1 RTT で済む。サブ秒 slot を狙う HyperBFT のような CL にとって、これは viable かどうかの違いになる。

## 3. `new_payload` — 「これを実行して valid か教えてくれ」

```
newPayload(ExecutionPayload) → PayloadStatus
```

CL が peer の proposal を受け取ると、投票する前に EL に validate してくれと頼む。EL は:
- transactions を re-execute する
- 結果として得られる state root を compute する
- proposed state root と比較する
- 一致すれば `Valid`、しなければ `Invalid`、EL が遅れていれば `Syncing` を返す

> 🛑 **反流暢性。** 「CL がブロックを validate する。」 **違う。** CL は *consensus rules* を validate する — 署名、fork-choice、justification。EL は *ブロックの内容* を validate する — execution、state、receipts。これらを混同すると、validation を間違った場所に配線することになる。

## 4. Async asymmetry — `getPayload`

`forkchoice_updated(parent, Some(attrs))` は `PayloadId` を直ちに返す。ブロックはまだ build されていない — EL はバックグラウンドジョブを開始し、mempool から transactions を引き出し、state を compute している。

CL がブロックを必要とするとき (自分の propose deadline が到来したとき)、`getPayload(id)` を call して取得する。

なぜ decouple するのか? **投票中に build する。** 前のブロックはまだ投票されている。EL は前のブロックが finalize される *前から* 次のブロックの build を開始できる。CL が propose する番になる頃には、新しいブロックはすでに組み立てられている。

| タイミング | 操作 | レイテンシ予算 |
| :--- | :--- | :--- |
| 前のラウンド進行中 | EL がバックグラウンドで次の payload を build | 100–400ms |
| 自分の slot 開始 | CL が `getPayload(id)` を call | < 5ms |
| Payload 取得 | CL が proposal を gossip | network-bound |

Async split が無ければ、propose は build を待たなければならない。この単一の設計選択が、高速 L1 を可能にしている。

## 5. openhl: in-process、名前は違うが、形は同じ

openhl は CL と EL を 1 つのバイナリで動かす。だから我々の「Engine API」は JSON-RPC ではなく Rust の trait surface だ。しかし *形* は identical だ。

`crates/consensus/src/bridge.rs:11@0844d58` の `ConsensusBridge` trait が openhl の Engine API である:

```rust
async fn build_payload(&self, parent: BlockHash, attrs: PayloadAttrs)
    -> Result<PayloadId, BridgeError>;
async fn payload_ready(&self, id: PayloadId)
    -> Result<ExecutedBlock, BridgeError>;
async fn validate_payload(&self, block: &ExecutedBlock)
    -> Result<PayloadStatus, BridgeError>;
async fn commit(&self, block_hash: BlockHash)
    -> Result<(), BridgeError>;
```

それぞれを Ethereum にマップする:

| openhl | Ethereum 相当 |
| :--- | :--- |
| `build_payload(parent, attrs)` | `forkchoiceUpdated(state{head=parent}, Some(attrs))` で `PayloadId` を返す |
| `payload_ready(id)` | `getPayload(id)` |
| `validate_payload(block)` | `newPayload(block)` |
| `commit(block_hash)` | `forkchoiceUpdated(state{head=hash, finalized=hash}, None)` |

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

openhl の歴史でもっとも pedagogically valuable な瞬間は、`crates/evm/src/live_node.rs:139@0844d58` で `validate_payload` を Reth の実 `EthBeaconConsensus::validate_header_against_parent` に配線したときだった。

テストが red になった。Reth の validator は我々のそれまで問題なかった `build_payload` の出力を即座に reject した。理由は:
- `gas_limit: 0` (default Header value)
- `base_fee_per_gas: None` (default)
- `difficulty: 0` (post-merge 用) すら気にしていなかった

Reth の validator はすべてキャッチした。修正は validator を緩めることではなく — `build_payload` に real production-shape の header を生成させることだった:

```rust
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
```

Base-fee 計算は、Reth の validator が base-fee を *verify* するために使うのと同じヘルパー (`ChainSpec::next_block_base_fee`) を call している。**仕組み上** 両者は一致する — 偶然ではない。

> 🛑 **反流暢性。** 「`validate_payload` は後で実装するよ。」 **順番が違う。** Validation を先にやる。なぜなら real validation こそが real construction を強制するからだ。`build_payload` を permissive validator (またはまったく validator なし) に対して実装すると、見た目は問題ないが、real node が validate しようとしたときに 3 層下で失敗する header を ship することになる。

これが レッスン 7 のレッスンを具体化したものだ: Engine API は受動的な形ではない。**Active な discipline (規律)** である。Reth の validator が spec そのものであり、その上のすべては validator のルールに従わなければならない。

## 7. 練習

1. **メソッドをマップする。** 何も見ずに、openhl の `ConsensusBridge` の 4 つのメソッドとそれぞれの Ethereum Engine API 相当を書き出せ。
2. **Build-while-voting moment を見つける。** `crates/consensus/src/engine_app.rs` で `AppMsg::GetValue` arm を見つけよ。それに相当する Ethereum の sequence は何か? (Cheat sheet: CL の `engine_forkchoiceUpdated(state, Some(attrs))` のあとに `getPayload`。)
3. **Validator-forcing。** `crates/evm/src/live_node.rs:68@0844d58` の `LiveRethEvmBridge::build_payload` を読め。どのフィールドが `Default` ではなく non-trivial にセットされているかを identify せよ。それぞれについて、もし default のままにしていたら `EthBeaconConsensus` のどの sub-check が失敗していたかを名前を挙げよ。

> **最終チェック。** 1 文で、なぜ openhl は素朴に 1 つで済むと思える場所に 2 つの関数 (`build_payload` + `payload_ready`) を必要とするのか? 答えに「build-during-voting parallelism」または「proposer の hot-path latency」が含まれていなければ、§4 を再読。
````

---

## Seed-file slot

EN seed `prisma/seed-reth-openhl-consensus-en.ts` と並んで、JA バージョンは `prisma/seed-reth-openhl-consensus-ja.ts` に landing する (まだ未作成 — レッスン 11/12/レッスン 13 の JA 翻訳が揃ったあとに generator スクリプトで一括生成する)。Module 構造は EN と同一:

```typescript
{
  title: 'ライブラリとしての Reth',
  sortOrder: 2,
  lessons: { create: [
    // L6 (JA, TBD)
    {
      title: 'Engine API — forkchoice_updated と new_payload',
      slug: 'openhl-engine-api-ja',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 15,
      xpReward: 40,
      content: `# Engine API — \`forkchoice_updated\` と \`new_payload\` が実際に何をしているか ...`
    },
    // L8 (JA, TBD)
  ]}
}
```

## SHA pinning discipline

レッスン 7 JA の `file:line@SHA` cite は SHA `0844d58` (Stage 7c HEAD) で pin する — EN ミラーと同一。レッスン 7 のコンテンツは validator-forcing moment という *歴史的瞬間* に anchor されており、SHA を前に進めるとそのレッスンが教えている瞬間が obscure になる。これは レッスン 10 (Stage 7d で advancing) とは異なる policy で、レッスン 7+レッスン 10 EN ミラーの末尾の "SHA pinning discipline" セクションで明示している:

- レッスン 7 (EN/JA both) → SHA `0844d58` で frozen
- レッスン 10 (EN/JA both) → 各ステージで bump (現在 `0cac571`)

CI link-check workflow (`.github/workflows/openhl-cite-check.yml`) は レッスン 7 JA の 3 つの cite を `0844d58` に対して resolve する。EN/JA で同一 cite を共有しているので、SHA bump が起きたら EN/JA を lockstep で更新する。

## Style review notes (self-critique before paste)

- **レッスン 10 JA と完全に同じ翻訳 policy**:
  - Engine API 用語 (`forkchoiceUpdated`、`newPayload`、`getPayload`、`PayloadAttributes`、`ForkchoiceState` 等) は英語のまま。Reth/Ethereum のドキュメントを後で読むときの cognitive bridge が直接になる。
  - 🛑 callout: Predict → 予測、Anti-fluency → 反流暢性 (consensus-engineering JA の確立した訳)。
  - File paths、function names、types は英語のまま。
- **Section 6 (validator forces honesty)** は EN 版で「the most pedagogically valuable moment in openhl's history」と書かれている。JA では「pedagogically valuable」を「pedagogically valuable」のまま英語で残す案もあったが、結果的に「もっとも pedagogically valuable な瞬間」とミックスした。読者の register が技術者なので、「教育的価値の高い」より「pedagogically valuable」が直感的。
- **「By construction, they agree」** を「**仕組み上** 両者は一致する」と訳した。「by construction」は型理論/形式手法系の用語で英語のまま残す手もあるが、ここでは技術 reader にも自然に読める「仕組み上」を採用した。
- **レッスン 10 JA との重複コードブロック** (例えば `ConsensusBridge` trait の 4 メソッド) は意図的に同一の英文コードを保持。読者が レッスン 7 と レッスン 10 を行き来したときに同じ trait を再認識できる。
- **レッスン 7 EN は 15 分予算の上限近い** (≈1450 word + 表 + コードブロック) という EN レビュー notes と同じ問題が JA でも生じる。日本語の方が情報密度が高いので、実時間としては 14 分前後に収まる見込み。
- **未公開**: レッスン 10 EN/JA、レッスン 7 EN、そして本 レッスン 7 JA ともに `course.isPublished: false` のまま。レッスン 11/12/レッスン 13 JA 翻訳が揃ってから一斉公開予定。
