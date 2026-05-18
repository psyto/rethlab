# Building OpenHL — L9 draft (JA)

> openhl SHA `0844d58` (Stage 7c) に対してドラフト。本レッスンが設計する trait は L1 (contract)、L7 (Engine API mapping)、L10 (Decided handler) でも cite されている — L9 は Module 4 の残りが build される設計根拠レッスンだ。
> EN ミラー: `drafts/openhl_l9_en.md`。
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10)。
> 20 分レッスン — L7/L10 より長い、設計選択にはコードだけでなく根拠が要るからだ。

---

## L9 — `openhl-bridge-trait-ja`

- **Module:** 4 (配線 — consensus crate)、module 内 sortOrder 0
- **Course-level sortOrder:** 8 (13 レッスン中の 9 番目)
- **Duration:** 20 分
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# Contract を設計する — `ConsensusBridge` trait

> **現在地。** サブモジュール 4/5: *配線。* サブモジュール 2 と 3 では、Malachite と Reth という 2 つの半分を別々に見てきた。本サブモジュールはそれらが出会う場所を扱う。L9 (本レッスン) は 4 メッセージ contract を表現する Rust trait — なぜこの形をしているかという設計判断 — を扱う。L10 は commit 側のフロー (Malachite `Decided` → Reth `forkchoice_updated`)、L11 は propose 側の hot loop を walk する。L11 まで読み終える頃には、trait の各メソッドが `engine_app.rs` 上で具体的にどのパスを通って実行されるかが分かるようになる。

EVM の上に BFT をボルト止めするすべての chain は最終的にこの trait を書くことになる。HyperBFT がやった、Tempo がやった、すべての CometBFT 系 chain がやった。メソッド名は違うが、形は同じだ。問題は、L1 の 4 メッセージを明示し failure mode を名指して *意図的に* 書くか、「consensus が必要としたときに必要としたものから accrete する」かだ。

我々は意図的に書く。一度だけ。

> 🛑 **スクロール前に予測。** L1 で 4 メッセージを見た。L7 で Ethereum Engine API へのマッピングを見た。今: *Rust trait* はどう見えるべきか? 具体的に — async か blocking か? Owned 引数か borrowed か? エラー type 1 つか複数か? Trait メソッドのシグネチャは思っているより重要だ。

## 1. すべての BFT-L1 が最終的に書く trait

`crates/consensus/src/bridge.rs:11@0844d58` を開け。全体で 40 行:

```rust
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
```

これが contract だ。Consensus に参加する他のすべての crate はこの trait を実装する (EVM crate、3 つの impl — `InMemoryEvmBridge`、`RethEvmBridge`、`LiveRethEvmBridge`) か、メソッドを call するために `Arc<dyn ConsensusBridge>` を持つ (consensus crate の runner と engine-app loop)。

本レッスンの残りは正当化だ。なぜこの 4 メソッド、このシグネチャ、このエラー type なのか? 各選択は何かを trade off する。レッスンの目的は trade を visible にして、偶然ではなく意図的に違う選択ができるようにすることだ。

## 2. Async か blocking か?

シグネチャを見よ: すべてのメソッドが `async` だ。これはタダではない。Rust では trait の `async fn` は長年のサーガだった (`#[async_trait]` マクロは workaround); async は全体に `Send + Sync` bound を強制する; sync から async を呼ぶには tokio handle が必要だ。

代替は blocking だった:

```rust
pub trait ConsensusBridge: Send + Sync {
    fn build_payload(&self, ...) -> Result<PayloadId, BridgeError>;
    // ...
}
```

シグネチャが単純。`#[async_trait]` なし。Future pinning 問題なし。なぜこの道を行かなかったか?

| 考慮事項 | Async 勝 | Blocking 勝 |
| :--- | :--- | :--- |
| Reth の `BlockchainProvider` (sync) を呼ぶ | tied — どちらも動く | tied |
| Reth の `EngineHandle::fork_choice_updated` (async) を呼ぶ | **async でなければならない** | `block_on` が必要 |
| Malachite の tokio runtime 内 | thread block しない | 各 call が worker thread を block |
| `run_engine_app` AppMsg loop | 自然 | spawn-blocking 体操が必要 |
| Test double (in-memory state) | trivial — `Mutex` 持つだけ | trivial |

決定は 2 行目と 3 行目で落ちる。Real Reth backend は async API (Engine API、payload builder service、network) を使い、我々の consensus 側は Malachite の tokio runtime で動く。Blocking にすると、AppMsg loop 全体がすべての bridge call で spawn-blocking になる — 無駄、エラーが起きやすく、負荷下で observably 遅い。

> 🛑 **反流暢性。** 「Async は blocking より柔軟なだけ、後から async にできる。」 **違う。** Blocking-trait から async-trait への移行は viral な変更だ — すべての caller が切り替える必要がある。Trait の各 async メソッドは `Send + Sync + 'static` 制約をコードに伝播させる。**Async を早めに pick して、コストを受け入れろ。さもなくば blocking に commit して二度と振り返るな。**

## 3. なぜ正確に 4 メソッドなのか (少なくも多くもなく)

4 メソッド。3 ではない。5 でもない。なぜこの数か?

3 に collapse する誘惑:

- 「**`payload_ready` は `build_payload` の一部だ。`build_payload` がブロックを直接返せ。**」 説得力あり — メソッドが少ない、call site が単純。**違う。** そうすると L7 §4 の build-during-voting parallelism が死ぬ。Proposer の hot path が「build 待ち、その後 propose」になり、「すでに build されたものを propose」ではなくなる。Sub-second slot は不可能になる。

- 「**`validate_payload` と `commit` をマージすべきだ。Validation が通ったら commit すれば。**」 ほとんどの call site が連続でやるので誘惑される。**違う。** Validator は height ごとに多数の candidate proposal を import するが (round-robin の proposer slot ごとに 1 つ)、commit するのは 1 つだけ — deciding value。Validation は speculative; commit は final。マージすると speculative state 変更を強制し、rollback machinery を意味し、はるかに複雑な EVM crate を意味する。

5 に拡張する誘惑:

- 「**`notify_view_change(round)` を追加して EVM に round timeout を知らせよ。**」 もっともらしい — view change は real consensus event だ。**不要だ。** EVM は round について知る必要がない; decided block について知ればいい。Round 変更は CL 内部 state だ。`notify_view_change` を追加すると consensus 内部を execution に leak する — contract leak だ (L1 §5 参照)。

- 「**`restream_proposal(hash)` を追加して bridge が stale proposal を re-broadcast できるように。**」 もっともらしい — Malachite の AppMsg loop には `RestreamProposal` variant がある。**不要だ。** Restreaming はネットワーク層の関心事だ: consensus crate の app loop が bridge 関与なしで直接 handle する (`engine_app.rs:96@0844d58` 参照)。Bridge は EL contract であり、一般的な consensus event sink ではない。

4 メソッドは、contract leak を招かずに L7 マッピングを capture できる最小のセットだ (各メソッドが正確に 1 つの Ethereum Engine API call にマップする)。

## 4. エラー semantics — Rejected、Syncing、Internal

`crates/consensus/src/bridge.rs:33@0844d58` の `BridgeError`:

```rust
#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("execution layer rejected payload: {0}")]
    Rejected(String),

    #[error("execution layer is syncing")]
    Syncing,

    #[error("internal: {0}")]
    Internal(#[from] eyre::Report),
}
```

3 variant。各々が specific な consensus 側応答にマップする:

| Variant | 何を意味するか | Consensus 応答 |
| :--- | :--- | :--- |
| `Rejected(reason)` | EL がロジックを適用して no と決めた。Block が malformed、未知の parent を参照、EIP-1559 違反等。 | Proposal を Invalid として扱う; この値に nil 投票。次の round へ。 |
| `Syncing` | EL はまだ答えられる state を持っていない — ネットワークの tip にキャッチアップ中だ。 | 待つ。Nil 投票しない (block が悪いかどうか分からない)。Backoff してリトライ、または timeout に落ちる。 |
| `Internal(report)` | 本当に壊れている。DB 破損、EL panic、ファイル消失。 | **Chain を halt せよ。** エラーを上に propagate、大声でログ。安全に続行できない。 |

3 つは互換ではない。未知の parent (これは `Rejected` 相当) で `Internal` を返す bridge は、本来 nil 投票すべきところで chain を halt させる。Syncing 条件で `Rejected` を返す bridge は、本来答えを与えてくれたはずの peer から永久に fork する。

> 🛑 **反流暢性。** 「エラーはエラーだ。1 つの `Error` enum で十分。」 **違う。** Consensus コードでは、エラーの *カテゴリ* が chain が進むか、pause するか、halt するかを決定する。Collapse すると liveness にとって load-bearing な情報を失う。3 variant が最小だ。

> 🛑 **予測。** 1 つ選べ: peer が parent block hash を我々の chain に持たない proposal を送ってきた。Bridge は `Rejected`、`Syncing`、`Internal` のどれを返すべきか?

答えは **その parent を後から知る見込みがあるか** に依存する。Node が遅れていて parent が real (まだ sync していないだけ) → `Syncing`。Node が up to date でそんな block が存在しない → `Rejected`。Bridge は常にどちらのケースかを判別できない; 実務では production bridge は classify 前に provider の sync state を check する。

`crates/evm/src/live_node.rs:68@0844d58` の `LiveRethEvmBridge::build_payload` では、現在のコードは provider に given hash の block がないとき `Rejected` を返す。**我々の provider が up to date だと仮定すれば** correct だ — single-validator mode では true (peer が我々より進んでいる可能性なし)、multi-node デプロイメントでは tighten が必要。

## 5. Test double — canonical pattern としての `InMemoryEvmBridge`

`ConsensusBridge` の 3 つの impl が `crates/evm/src/` に住む:

- `InMemoryEvmBridge` (`in_memory.rs:14@0844d58`) — pure in-process state、Reth dep なし。Bridge call を高速で隔離したい unit test で使う。
- `RethEvmBridge` (`engine.rs`) — real alloy `Header` + `B256` を使うが in-memory state。Mock と live の bridge。
- `LiveRethEvmBridge` (`live_node.rs`) — real Reth `BlockchainProvider` + `EthBeaconConsensus` をラップ。Production-shape。

パターン: **trait first、複数 impl、各々が「real」軸の異なる点に**。Unit test は最も安い impl を使い、integration test はリッチな impl、production は live impl。

`InMemoryEvmBridge` は canonical test double だ。その `build_payload`:

```rust
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
```

16 行。Reth なし、provider なし、validator なし。Block hash は real header から compute するのではなく `(payload_id, number)` から synthesize される。State root はゼロ。**そして trait は気にしない。**

それが test-double payoff だ: trait は EL contract が *何* かを表現し、*どう* 実装するかではない。Unit test は `run_single_validator(&InMemoryEvmBridge::new(), parent)` を microsecond で走らせられる; 同じ caller コードが production で signature 変更なしに `LiveRethEvmBridge` に対して走る。

> 🛑 **反流暢性。** 「Test double は常に嘘をつく。」 ほぼ true だが、正しい framing ではない。Test double はテストしている部分に contract を *narrow* する。`InMemoryEvmBridge` は「parent の上に child block を build する」を truthfully に impl する — real EVM 実行や hash 計算は declined するだけだ、それらが consensus test がテストしているものではないからだ。

## 6. Type ownership — なぜ contract type は `openhl-types` に住むか

Trait のシグネチャを見よ:

```rust
async fn build_payload(&self, parent: BlockHash, attrs: PayloadAttrs)
    -> Result<PayloadId, BridgeError>;
```

`BlockHash`、`PayloadAttrs`、`PayloadId` — これらは `openhl-consensus` や `openhl-evm` に定義されていない。`openhl-types` にある。なぜか?

なぜなら **consensus crate と evm crate の両方が name する必要がある** からだ — consensus は trait を call するため、evm は trait を impl するため。Type が `openhl-consensus` に住むと、`openhl-evm` は trait を impl するため `openhl-consensus` に依存する必要がある。`openhl-evm` に住むと、`openhl-consensus` が trait を call するため `openhl-evm` に依存する必要がある。

どちらでもサイクルが発生する: A が B に依存、B が A に依存。Rust の crate graph は DAG だ; サイクルは compile error だ。Fix は **共有 type crate**: `openhl-consensus` と `openhl-evm` の両方が `openhl-types` に依存し、どちらも type 定義のために他方に依存しない。

`ConsensusBridge` trait 自体は `openhl-consensus` に住む (consensus が contract を所有) が、trait の *語彙* は dep graph の 1 つ下に住む。

このパターンは深刻な型システムを持つすべての L1 で現れる:

| Chain | Contract type が住む場所 | Trait が住む場所 |
| :--- | :--- | :--- |
| Ethereum (Reth) | `alloy-primitives`、`reth-primitives-traits` | `reth-engine-primitives`、`reth-rpc-api` |
| Tendermint / CometBFT | `tendermint-proto` | 各種 consumer crate |
| Malachite | `informalsystems-malachitebft-core-types` | `informalsystems-malachitebft-core-consensus` |
| **OpenHL** | `openhl-types` | `openhl-consensus` |

同じ形。違う名前。

## 7. この trait が *しない* こと

Contract 設計で最も難しいのは何を残すかだ。`ConsensusBridge` が意図的に持たない 4 つのもの:

1. **Transaction pool なし。** Real EL は mempool を持つ。Bridge に `submit_transaction(tx)` を expose できた。**しない。** Mempool は EL 内部の関心事; Consensus は EVM がどう block に入れる transaction を見つけるかを気にすべきではない。(real Reth では、payload builder が mempool アクセスを所有する; consensus は触れない。)

2. **State クエリなし。** `get_balance(addr)` なし、`read_storage(addr, slot)` なし。**State は EL 専用の関心事だ。** Consensus が state を読む必要があるなら、何かが間違っている — consensus は block とその順序を知ればよく、内容は不要だ。

3. **Subscription API なし。** `subscribe_decisions()` なし、`on_block_committed(callback)` なし。Bridge は同期 (well, async-await) request-response trait だ; EL は consensus にイベントを push しない。Consensus が decision を知りたければ、*それを作っている* — callback 不要。

4. **Genesis/init メソッドなし。** `initialize_genesis(spec)` なし。Genesis は chain-spec の関心事で、node bootstrap で handle される (`OpenHlNode::start()` が `Genesis` から chain spec を読む — Module 5 領域)。Bridge は initialization ではなく steady-state operation のためだ。

これらの誘惑はそれぞれ real で、それぞれ trait を大きくしただろう。**最小 viable contract は正確に 4 メソッドだ。** 拡張に抵抗するのは design discipline だ。

> 🛑 **予測。** 新しい contributor が主張: 「trait に `query_state(addr) -> StateView` を追加すべきだ — デバッグが楽になる。」 **なぜこれが間違いか?** ヒント: dep graph (§6) と consensus が決定を下すために何を知る必要があるかを考えよ。

答え: consensus は state を読む必要がない; 次の *block* を選ぶのであって次の *state* ではない。`query_state` を追加すると馬車を馬の前に置くことになり、EL 内部を CL crate に leak し、すべての impl (`InMemoryEvmBridge` 含む) にクエリ可能な state machine を維持する義務を負わせる。State クエリの正しい場所は EL crate 独自のデバッグインタフェースであり、consensus contract ではない。

## 8. 練習

1. **2 つの stub bridge を見つけよ。** `crates/consensus/src/runner.rs` と `crates/consensus/src/engine_app.rs` の test module で inline `StubBridge` impl を見つけよ。なぜ *2 つ* (共有 1 つではなく) か? 各々が `InMemoryEvmBridge` に対して minimum で何を実装するか? (ヒント: 両 stub は `openhl-evm` を `openhl-consensus` の test-only dep として追加するより前に書かれた — それは §6 の dep cycle を作る。Inline stub は cycle を避ける。)

2. **Halt-vs-recover 監査。** `crates/evm/src/live_node.rs@0844d58` の `LiveRethEvmBridge` で各 `Err(BridgeError::...)` return を読め。それぞれが `Rejected`、`Syncing`、`Internal` のどれか identify せよ。それから check: consensus 側の caller (`runner.rs` または `engine_app.rs`) はその variant を §4 のテーブルが prescribe する方法で handle するか?

3. **5 番目のメソッドを sketch せよ (そしてしない理由を発見せよ)。** Malachite の `RestreamProposal` AppMsg をサポートするため `restream_proposal(block_hash)` を追加すると仮定せよ。Trait 変更を sketch せよ。それから `engine_app.rs:96@0844d58` を読め — 現在のコードは `RestreamProposal` に何をするか? なぜ bridge は関与する必要がないか?

> **最終チェック。** 1 文で、なぜ `validate_payload` は `ExecutedBlock` (owned) ではなく `&ExecutedBlock` (*borrowed* reference) を取るのか? 答えに「validation は block を consume すべきではない — consensus がまだ必要かもしれない」または「borrow は偶発的な ownership 移行に対する type-system 安全レールだ」が含まれていなければ、trait シグネチャを再読。
````

---

## Seed-file slot

L9 は `prisma/seed-reth-openhl-consensus-ja.ts` (course `building-openhl-consensus-ja`) に Module 4 の最初のレッスンとして (すでに drafted の L10 直前に) landing する:

```typescript
// Course.modules.create array:
{
  title: '配線 — consensus crate',
  sortOrder: 3,
  lessons: { create: [
    {
      title: 'Contract を設計する — ConsensusBridge trait',
      slug: 'openhl-bridge-trait-ja',
      type: 'CONTENT',
      sortOrder: 0,
      duration: 20,
      xpReward: 60,
      content: `# Contract を設計する — \`ConsensusBridge\` trait\n\n...`  // L9 markdown
    },
    {
      title: 'Malachite の Decided から Reth の forkchoice_updated へ',
      slug: 'openhl-decided-to-fcu-ja',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 15,
      xpReward: 40,
      content: `# Malachite の \`Decided\` から Reth の \`forkchoice_updated\` へ ...`  // L10 markdown
    },
    // L11 (TBD)
  ]}
}
```

## SHA pinning discipline

すべての cite は SHA `0844d58` を pin する。L9 は珍しく citation-dense — design lesson だからだ; trait の形に関するすべての主張が実コードに anchor される:

- `crates/consensus/src/bridge.rs:11` — trait
- `crates/consensus/src/bridge.rs:33` — BridgeError
- `crates/evm/src/in_memory.rs:14` — InMemoryEvmBridge struct
- `crates/evm/src/in_memory.rs:34` — InMemoryEvmBridge の trait impl
- `crates/evm/src/live_node.rs:68` — LiveRethEvmBridge::build_payload
- `crates/consensus/src/engine_app.rs:96` — RestreamProposal handler (Exercise 3 参照)

Stage 7d が landing し `LiveRethEvmBridge::commit` が real `forkchoice_updated` call になるとき:
- L9 の論点構造 (4 メソッド、3 エラー variant、共有 crate の type) は valid のまま
- §4 の "halt-vs-recover" テーブルの `LiveRethEvmBridge::commit` cite は bump が必要

## Style review notes (self-critique before paste)

- **L9 は設計上 20 分** — L7/L10 より重い。8 section 構造 (L1/L7/L10 の 7 section テンプレート vs) は意図的: §3 (なぜ 4 メソッドか) と §7 (trait が *しない* こと) が追加時間を正当化する design-rationale section だ。
- **§4 の halt-vs-recover テーブルが本レッスンで最も leverage の高い段落。** 学習者が自分の bridge を実装するときに reference back する 1 つのものだ。レッスンの残りが切られても、このセクションは残せ。
- **§6 の dep-graph 議論は Rust 固有だ。** JA への翻訳は care が必要 — 「依存グラフ」は動くが、cycle-as-compile-error のオチは違って land するかもしれない。Translator にフラグ。
- **翻訳 policy は他の JA レッスンと同一**:
  - `async`、`blocking`、`async_trait`、Rust trait/error type 関連の technical 用語は英語のまま。
  - `Send + Sync`、`'static`、`#[async_trait]`、`Mutex` 等の Rust 固有 token は英語のまま。
  - 🛑 callout: Predict → 予測、Anti-fluency → 反流暢性。
  - File paths、function names、types は英語のまま。
- **「contract」「leak」「liveness」「sink」「fall to a timeout」** は英語のまま — Rust/分散システム文脈で direct な訳がない多義的概念。
- **未公開**: `course.isPublished: false` のまま。L11/L12/L13 JA 翻訳が揃ってから一斉公開予定。
