# Building OpenHL — L6 + L8 draft (JA)

> openhl SHA `0844d58` (Stage 7c) に対してドラフト。Module 3 (ライブラリとしての Reth) を閉じる。L6 は「Reth を fork しない、configure する」をセットアップする — openhl が Reth をライブラリとして再利用できる NodeBuilder パターン。L8 は Module 2 の CLOB が最終的に plug in する payload-building パイプラインを walk する。
> EN ミラー: `drafts/openhl_l6_l8_en.md`。
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10)。

---

## L6 — `openhl-reth-nodebuilder-ja`

- **Module:** 3 (ライブラリとしての Reth)、module 内 sortOrder 0
- **Course-level sortOrder:** 5 (13 レッスン中の 6 番目)
- **Duration:** 15 分
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# Geth 形を捨てた Reth — NodeBuilder と component

> **現在地。** サブモジュール 3/5: *ライブラリとしての Reth。* サブモジュール 2 は Malachite (CL 側) だった。本サブモジュールでは Reth (EL 側) を扱う。L6 (本レッスン) は `NodeBuilder` パターンを説明する — リポジトリ全体を fork するのではなく個別の component を差し替える設計のこと。L7 は Engine API の surface — 4 メッセージを EL の視点から見たときの形を扱う。L8 では Reth の `PayloadBuilderService` がブロックを組み立てるときに実際に何をしているのかを walk する。

**Reth を fork しない。configure する。** 初めて Reth に近づくチームは `git clone paradigmxyz/reth` に手を伸ばし、`bin/reth/src/main.rs` を編集し、即座に技術的負債を積み上げる — upstream の bump 1 回ごとに merge conflict だ。

正しい道は `reth-node-builder::NodeBuilder` だ。Component (consensus engine、payload builder、block validator) をスワップしつつ、それ以外 (DB、mempool、RPC、network) を Reth のデフォルトのまま使える fluent API だ。結果: openhl の `LiveRethEvmBridge` は fork を維持せずに real Reth node に対して動く。

本レッスンは「何を replace するか」と「何を keep するか」の seam についてだ。読み終える頃には、典型的な L1 chain でカスタムコードが必要な Reth の 5% と、なぜ残りの 95% を upstream デフォルトに残すべきかが分かる。

> 🛑 **スクロール前に予測。** カスタム consensus (Malachite/HotStuff 系) を持つが普通の EVM execution を使う L1 を build している。Reth の ~30 個の component (DB、mempool、payload builder、network、RPC、transaction pool、validator set provider 等) のうち、**どれを replace してどれをデフォルトのままにする?** §3 を読む前にリストを sketch せよ。

## 1. Reth を fork する誘惑

最も抵抗が少なく見える道:

```bash
git clone https://github.com/paradigmxyz/reth
cd reth
# bin/reth/src/main.rs を編集して consensus を plug in
# crates/payload/builder/... を編集して payload semantics を変更
# ... やがて 40 ファイルにまたがる 200 行の patch を持っていることに気付く
```

3 ヶ月後、Reth が v2.3.0 をリリース。Patch を rebase しようとする。半分が refactor されたファイルにある。Merge に 1 週間かかる。**fork してしまった**、そして永久にその fork を維持することになる。

`NodeBuilder` パターンはまさにこれを避けるために存在する。Reth の作者は downstream chain が consensus と payload assembly を swap したがることを認識している。Trait ベースの component アーキテクチャがサポートされた答えだ。

> 🛑 **反流暢性。** 「我々の chain は trait surface には custom すぎるので Reth を fork する必要がある。」 **ほぼ常に違う。** カスタマイズが「異なる consensus」「異なる payload selection」「異なる block validation rule」なら、trait はそのために設計されている。Fork するのは *storage engine* (MDBX → 他) を変える必要があるか *EVM 自体* (カスタム opcode) を変える必要があるときだけだ — どちらも極めて稀。

## 2. `NodeBuilder` の component trait

Reth の `NodeBuilder` は各 component にどの type が impl するかを宣言する fluent API を expose する。デフォルトの `EthereumNode` 構成はすべてに Reth 自身の実装を plug in する; 個別 slot を自分の type を提供して swap する。

Component trait、機能でグループ化:

| Component カテゴリ | 何をするか | openhl で replace する? |
| :--- | :--- | :--- |
| **DB** (`Database`) | MDBX-backed storage | **しない** — Reth のものを keep |
| **Provider** (`BlockchainProvider`) | DB 上の read API | **しない** — Reth のものを keep |
| **Network** (`NetworkHandle`) | devp2p / discv5 / RLPx | **おそらく しない** — compat のため keep、single-CL では peer discovery を disable してもよい |
| **Pool** (`TransactionPool`) | Mempool | **しない** — Reth のものを keep |
| **EVM** (`ConfigureEvm`) | EVM config、precompile、hardfork | **多分** — カスタム precompile (openhl の Module 3) で replace |
| **Consensus** (`Consensus`) | Block レベルの validation rule (PoW/PoS gadget) | **する** — Reth の gadget ではなく Malachite を使う |
| **PayloadBuilder** | mempool からブロックを assemble | **多分** — v0 ではデフォルト keep、CLOB がカスタム ordering を要したら replace |
| **EngineApi** | CL ↔ EL 会話 surface | **異なる transport** — openhl は JSON-RPC ではなく in-process trait |
| **RPC** (`RpcEthApi`) | eth_* JSON-RPC method | **しない** — compat のため keep |

"しない" の row が Reth のコードの ~80%。"する" / "多分" の row が典型的 BFT L1 のカスタマイズ surface だ。

## 3. 何を keep するか — Reth が正しくやる 5 component

Reth の MDBX-backed storage、BlockchainProvider、mempool、networking stack、RPC server は mature で十分にテストされており、downstream-compatible だ (mainnet Reth と話すウォレットは openhl の RPC とも変更なしで話せる)。**これらのどれを replace しても multi-month プロジェクトでアップサイドゼロだ。**

具体的に:

- **MDBX**: LMDB より速く、Erigon と Reth で battle-tested; replace するとは storage engine を書き直すことを意味する
- **BlockchainProvider**: 他の component すべてが依存する read API; replace すると ~10 trait impl にカスケードする
- **TransactionPool**: EIP-1559 ordering、replacement rule、blob-tx サポートを持つ mempool; 再現するエッジケースが ~30k LOC
- **Network**: devp2p 互換性は既存 peer から sync できることを意味する; 失うと Ethereum インフラから bootstrap できない
- **RPC**: すべてのウォレット、indexer、explorer が `eth_getBlockByNumber`、`eth_call` 等を期待する; 再実装するとエコシステム全員が chain を special-case する必要が生じる

全 5 つ keep せよ。実際に変更する必要のある component にエンジニアリング予算を取っておけ。

## 4. 何を replace するか — openhl がカスタマイズする 3 component

| Component | なぜ replace | openhl のどこ |
| :--- | :--- | :--- |
| **Consensus** (`Consensus` trait) | Reth のデフォルトは Ethereum の PoW/PoS gadget; 我々は Malachite を使う | 暗黙的 — Reth の `Consensus` trait に engage しない; Malachite が chain を外部から駆動 |
| **EngineApi transport** | Reth デフォルトは JSON-RPC; 我々は in-process Rust trait | openhl の JSON-RPC engine API の代わりに `ConsensusBridge` (L1/L7/L9) |
| **PayloadBuilder** | Module 2 の CLOB がカスタム transaction ordering を必要とする | v0 ではまだ replace されていない — 何が変わるかは L8 を参照 |

Replace されない *もの* に注意: EVM、storage engine、mempool、RPC。**openhl は stock Reth の 90%** で、consensus と engine transport が swap out されている。Stock EVM semantics 上のカスタム consensus chain には正しい比率だ。

## 5. 我々の codebase の dev-node 例

`crates/evm/src/reth_node.rs:74@0844d58` — Stage 7a の smoke test を見よ:

```rust
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
```

行ごとに読め:

1. **`Runtime::test()`** — テスト用の軽量 tokio runtime (real デプロイは long-running tokio runtime を使う)
2. **`dev_chain_spec()`** — chain ID 2600、dev genesis (L12 で walk した)
3. **`NodeConfig::test().dev().with_chain(chain_spec)`** — Reth の "dev mode" preset + 我々の chain spec。`dev()` は peer discovery を disable し、debugging conveniences を有効にする; production が使うものではない。
4. **`NodeBuilder::new(node_config).testing_node(runtime).node(EthereumNode::default())`** — API の心臓部。**我々は `EthereumNode::default()` を使っている** — Reth の stock 構成、全 component がデフォルト。カスタマイズするには `.node(EthereumNode::default())` を `.node(OpenHlEthereumNode::new())` 等にスワップする。
5. **`.launch_with_debug_capabilities().await?`** — 全 actor を spawn、listen を start、DB を open。
6. **`node.chain_spec().chain.id()`** — node が見ている chain が我々が構成したものと一致するか sanity check。

**これがパターン全部だ。** ~10 行の glue。複雑さは我々のコードではなく Reth の `NodeBuilder` 内部にある。**Production openhl node は ~50 行** — これに加えて listen port、data directory、validator keypair の構成。

## 6. なぜこれが openhl の long-term にとって重要か

NodeBuilder パターンは openhl を 3 つのことに対して future-proof にする:

1. **Reth バージョン bump** — Reth が v2.3.0 をリリースしたら、`workspace.dependencies` の SHA を 1 つ変えて `cargo update` を走らせる。Trait surface は minor バージョン間で安定; patch を merge する必要がない。
2. **カスタム precompile** (openhl の Module 3) — CLOB-reading precompile を追加するとき、`ConfigureEvm` slot を replace。残りの Reth はデフォルトのまま。
3. **カスタム payload builder** (openhl の Module 2) — CLOB がカスタム transaction ordering を必要とするとき、`PayloadBuilder` slot を replace。Mempool、EVM execution、state computation はデフォルトのまま。

**各カスタマイズは slot であり fork ではない。** それが NodeBuilder 設計の価値だ。

## 7. 練習

1. **Slot を identify せよ。** §2 のテーブルから、9 つの component カテゴリと openhl が各々を replace するかを名指せ。何も見ずに、後続モジュールで replace を検討するであろう 4 つを書き出せ。
2. **Fork の誘惑を見つけよ。** openhl リポで `reth-*-builder::*`、`reth-storage-api`、`reth-consensus`、`reth-chainspec`、または alloy より *深い* Reth crate パスを import しているコードを検索せよ。**深い import は「trait surface が expose していないものが必要だった」のサインだ。** これは我々のカスタマイズについて何を示唆するか?
3. **カスタム EVM 実験。** openhl がカスタム EVM opcode を欲しがると仮定 (real Module 3 領域)。`crates/evm/src/reth_node.rs` への diff を sketch せよ: どの `EthereumNode` slot を replace し、自分のカスタム type はどの trait を impl するか?

> **最終チェック。** 1 文で、なぜ `NodeBuilder::new(config).node(EthereumNode::default())` は `git clone reth && edit main.rs` より良いパターンか? 答えに「upstream-trackable」または「codebase 全体を fork せずに component を swap」が含まれていなければ、§1 を再読。
````

---

## L8 — `openhl-payload-building-ja`

- **Module:** 3 (ライブラリとしての Reth)、module 内 sortOrder 2
- **Course-level sortOrder:** 7 (13 レッスン中の 8 番目)
- **Duration:** 15 分
- **XP reward:** 40
- **Type:** CONTENT
- コースのコンテンツ arc の最終ドラフトレッスン。

### Content

````markdown
# ブロックはどこから来るか — Reth 内の payload 構築

`forkchoice_updated(parent, attrs)` (L7 の request) と `getPayload(id)` (L7 の fetch) の間で、**Reth がブロックを assemble する**。その間隔で何が起こるか — そして openhl 固有の seam がどこに行くか — を知ることが、ship する chain と謎の stall をする chain の違いだ。

本レッスンは Reth の `PayloadBuilderService` (L11 の "async trick" セクションが forward reference した production-shape の payload assembly) を walk し、openhl が現在代わりに何をしているか (空ヘッダを synthesize) を名指し、Module 2 の CLOB がどこに plug in するかを preview する。

> 🛑 **スクロール前に予測。** CL が「payload を build せよ」と言う瞬間から EL が「state root X のブロックがここに」と言う瞬間まで、Reth が走らせるすべての operation を名指せ。ヒント: 少なくとも 4 つある、そのうち 1 つが他より latency で支配する。

## 1. ライフサイクル、request からブロックまで

L7 からの Engine API call:

```
forkchoiceUpdated(state{head=parent}, Some(attrs)) → PayloadId
                                                       │
                                                       ▼ (後で)
                          getPayload(id) → ExecutionPayload
```

`forkchoiceUpdated` (即座に `PayloadId` を返す) と `getPayload` (組み立てたブロックを fetch) の間で、Reth の `PayloadBuilderService` は次のパイプラインを走らせる:

| Step | Owner | 何が走るか |
| :--- | :--- | :--- |
| 1 | PayloadBuilderService | build-job request 受信; `PayloadId` 割り当て |
| 2 | `EthereumPayloadBuilder` | mempool (`TransactionPool`) から transaction を pull |
| 3 | `EthereumPayloadBuilder` | Ordering ポリシー適用 (priority fee、EIP-1559、nonce) |
| 4 | `EthEvm` (BlockExecutor) | Parent state に対して transaction を execute; gas を track |
| 5 | `EthEvm` | Merkle Patricia Trie 経由で state root を compute |
| 6 | `EthereumPayloadBuilder` | Header を assemble (state_root、receipts_root 等とともに) |
| 7 | PayloadBuilderService | 結果をキャッシュ、`PayloadId` が ready と signal |

Step 2-5 が wall clock を支配する。**Step 4 (real EVM execution) は通常 full block で 50-300ms かかる**; step 5 (state root) がさらに 50-150ms 追加。

`EthereumPayloadBuilder` は `reth_ethereum::node::EthereumPayloadBuilder` (Reth v2.2.0 source の `reth-ethereum-payload-builder` から) に住む。`reth-payload-builder` の `PayloadBuilder` trait を impl する。**上記の各 step は我々のコードではなく Reth のコードの中だ。**

## 2. Transaction 選択 — `Pool::best_transactions`

`TransactionPool` trait (`reth-transaction-pool::TransactionPool`) は tx を優先順で yield する `best_transactions()` メソッドを expose する。デフォルトの ordering ポリシー:

1. **EIP-1559 effective tip first** — `min(max_priority_fee, max_fee - base_fee)` 降順
2. **送信者内で nonce 順** — 同じ address で nonce 4 より先に nonce 5 を含められない
3. **Replacement rule** — 同じ nonce でより高い fee の新しい tx が古い tx を replace

Pool が除外するもの:
- Gas が `block_gas_limit` を超える tx
- ブロック内の事前 tx 後に sender の balance が不足する tx
- Revert する tx (一部の pool 構成 — 多くは「含めて revert させる」semantics)

**Pool は mempool-aware だ。** Peer が broadcast したがまだ含まれていない txn、RPC 経由で submit されたローカル txn を知っている; すべてを priority queue で track している。

> 🛑 **反流暢性。** 「Payload building は順番に transaction を実行するだけだ。」 **違う。** どの transaction を含めるか — そしてどの順番で — の *選択* が仕事の半分だ。Ordering ポリシーは fee revenue、transaction fairness、(重要なことに) MEV opportunity を決定する。**Ordering ポリシーの変更は chain が行える最も consequential なカスタマイズの 1 つだ。**

## 3. State root 計算 — execution が数字になる場所

Step 4 (transaction 実行済み) の後、EVM は state diff を持つ: 修正された account、touch された storage slot、更新された balance。Step 5 はこれを単一の 32-byte `state_root` ハッシュに condense する:

1. すべての state 変更を parent の state trie (Merkle Patricia Trie) に適用
2. Trie root を recompute
3. 結果が `state_root` — post-block state への canonical commitment

これが **expensive な部分**だ。~1000 account を touch する full mainnet block の新しい trie root 計算には、parent state がどれだけ cache されているかにもよるが 100ms+ かかる。

State root は `validate_header_against_parent` が check *しない* (できない — execution していない) が `validate_block_post_execution` が check するものだ。**同じブロックに対して異なる state root を compute する 2 validator は determinism バグを持つ** (L2 §2 領域)。これが state-root mismatch が chain fork の代表的な failure mode である理由だ。

Reth の trie 計算は高度に最適化されている — state diff が十分大きいときコアにまたがって hash 計算を並列化する。**Reth を fork しない理由の 1 つ** (L6 §3) は、すべてこれを diminishing returns で再現することになるからだ。

## 4. openhl が現在何をしているか (vs production-shape)

`crates/evm/src/live_node.rs:68@0844d58` の openhl の `LiveRethEvmBridge::build_payload` と比較せよ:

```rust
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
```

§1 の 7 step パイプラインと比較せよ:

| Step | Production Reth | `0844d58` の openhl |
| :--- | :--- | :--- |
| 1. PayloadId 割り当て | PayloadBuilderService | In-memory counter (`pending` HashMap) |
| 2. Transaction を pull | `Pool::best_transactions` | **Skip** — まだ transaction なし |
| 3. Ordering 適用 | EIP-1559 priority fee math | **Skip** |
| 4. EVM で execute | EthEvm + receipts | **Skip** — 空 body |
| 5. State root を compute | Merkle Patricia Trie | **Skip** — state_root = parent_header.state_root (暗黙) |
| 6. Header を assemble | `EthereumPayloadBuilder` | 完了 — ほぼデフォルトフィールド |
| 7. 結果をキャッシュ | PayloadBuilderService | In-memory HashMap |

**7 step のうち 5 つが skip されている。** これは SHA `0844d58` の openhl がまだ real transaction を produce していないからだ — CLOB (openhl の Module 2) がそれらの source だ。そのモジュールが ship するまで、bridge はヘッダレベル validation (L7 §6 — validator-forcing-honesty moment) は通るが実際の transaction を含まない空ヘッダを synthesize する。

7 step パイプラインが重要なのは、**production-shape の PayloadBuilder を swap in することが Module 2 の最初のステージ** だからだ。CLOB が fills を produce し始めると、それらが transaction になり、bridge は real builder を使い始める。

## 5. openhl がどこに plug in するか — Module 2 の preview

Module 2 への L8 forward reference:

> *"OpenHL が後で CLOB-fill transaction を注入する場所"*

openhl の CLOB 統合計画:

1. **CLOB エンジン** (`crates/clob/src/`) が chain 実行中に matched fill を produce
2. **各 fill が transaction になる** — EVM 経由の buyer-seller 間の account 転送
3. **Transaction pool** がこれらの fill をユーザ submit の txn と並んで受信
4. **カスタム `PayloadBuilder`** (L6 §4 の EthereumPayloadBuilder slot を replace) が payload-assembly order でユーザ tx より CLOB fill を優先
5. **標準 Reth state 計算が走る** — 新しい state root はユーザ tx と CLOB fill の両方を反映

ここで openhl が *generic EVM* ではなく *perp DEX* になる。Mechanical な部分 — 1 つの Reth component を replace すること — は小さい (L6 の NodeBuilder パターン in action)。興味深い部分は CLOB matching ロジック自体で、これは rethlab コースの Module 2 だ。

**L8 はモジュール間の bridge だ。** 学習者に伝える: 「consensus substrate は master した; EVM payload パイプラインが Module 2 の plug in する場所だ。」

## 6. L11 の async-trick、具体化

L11 §5 は「まだ使っていない async trick」を導入した:

> 「Round-decided 時に `build_payload(...)` を kick off して、EL に前の round の投票ウィンドウ全部を block assembly に使わせよ。」

今、何が amortize されているかが見える。§1 のテーブルの expensive operation (step 2-5: pull、order、execute、state root) は full mainnet-shape block で累積 100-400ms かかる。これらが前の round の投票 *中* に走れば (vote 伝播は常に少なくとも 200-500ms かかる)、propose hot path は「キャッシュ済み payload を fetch」に落ちる — microsecond、何百ms ではなく。

これが **the** パフォーマンス最適化で、HL、Tempo、openhl が real EVM execution をしながらサブ秒 slot を動かせる理由だ。**これなしにはサブ秒 slot は得られない。** 空 EVM を動かす (`0844d58` の openhl のように real tx を execute しない) か、execution を投票ウィンドウに対して並列化するかだ。

ConsensusBridge trait の `build_payload` (start) と `payload_ready` (fetch) の split はこれをサポートするよう形作られている。**Trait API は実装の先を行っている。** Production-shape の `LiveRethEvmBridge` が landing したとき、`engine_app.rs::run_engine_app` のループは `build_payload` call を前に動かし (`AppMsg::Decided` の直後)、`payload_ready` は定数時間 fetch になる。

## 7. 練習

1. **State-root 質問。** 2 validator が同じ proposal (同じ Header bytes) を受け取り、それぞれの parent state コピーに対して execute し、*異なる* state root に到達する。何が壊れるか? §1 のパイプラインのどの step で divergence が起こったか?
2. **Ordering ポリシー。** Reth のデフォルト ordering は EIP-1559 priority fee 降順だ。openhl の CLOB が異なる ordering ポリシー — 例えば「CLOB fill first、その後 priority fee でユーザ tx」 — を使ったら **何が変わるか?** `EthereumPayloadBuilder` のどの行を replace する必要があるか? (ヒント: executor ではなく `Pool::best_transactions` iterator が再実装される。)
3. **Async-trick の gap。** `crates/consensus/src/engine_app.rs:65-82@0844d58` (`AppMsg::GetValue` arm) を読め。`bridge.build_payload(...)` call を `AppMsg::Decided` で発火するよう移動する diff を sketch せよ。AppMsg loop はこれら 2 メッセージ間でどんな state を track する必要があるか?

> **最終チェック。** 1 文で、なぜ production-shape の payload-building パイプライン (§1) は `engine_forkchoiceUpdated` 中 inline で実行されるのではなく、別 service に decouple されているのか? 答えに「async / build-during-voting」または「proposer の hot path は assemble ではなく fetch する必要がある」が含まれていなければ、§6 を再読。

---

**おめでとう** — これは *Building OpenHL — Consensus Substrate* の最後のレッスンだ。Contract (L1)、convergence (L2)、ライブラリとしての Malachite (L3 + L4 + L5)、ライブラリとしての Reth (L6 + L7 + L8)、wiring (L9 + L10 + L11)、devnet (L12 + L13) をカバーした。

**rethlab L1 Architect トラックの Module 2 は openhl の CLOB matching engine から始まる** — そこで最初の real transaction が chain に入り、§5 の preview が Module 2 の最初のレッスンになる。
````

---

## Seed-file slot

L6 と L8 が Module 3 で L7 の両側に座る:

```typescript
// Course.modules.create array:
{
  title: 'ライブラリとしての Reth',
  sortOrder: 2,
  lessons: { create: [
    {
      title: 'Geth 形を捨てた Reth — NodeBuilder と component',
      slug: 'openhl-reth-nodebuilder-ja',
      type: 'CONTENT',
      sortOrder: 0,
      duration: 15,
      xpReward: 40,
      content: `# Geth 形を捨てた Reth — NodeBuilder と component\n\n...`  // L6 markdown
    },
    {
      title: 'Engine API — forkchoice_updated と new_payload',
      slug: 'openhl-engine-api-ja',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 15,
      xpReward: 40,
      content: `# Engine API — ...`  // L7 markdown (openhl_l7_ja.md ですでに drafted)
    },
    {
      title: 'ブロックはどこから来るか — Reth 内の payload 構築',
      slug: 'openhl-payload-building-ja',
      type: 'CONTENT',
      sortOrder: 2,
      duration: 15,
      xpReward: 40,
      content: `# ブロックはどこから来るか — Reth 内の payload 構築\n\n...`  // L8 markdown
    },
  ]}
}
```

## SHA pinning discipline

すべての cite は SHA `0844d58` を pin する。L6 が参照するもの:
- `crates/evm/src/reth_node.rs:74@0844d58` — Stage 7a で書いた dev-node bootstrap 関数
- Reth source path で `NodeBuilder`、`EthereumNode` (line ではなく名前で cite — trait surface が spec)

L8 が参照するもの:
- `crates/evm/src/live_node.rs:68@0844d58` — `LiveRethEvmBridge::build_payload`
- `crates/consensus/src/engine_app.rs:65-82@0844d58` — `AppMsg::GetValue` arm
- Reth source path で `EthereumPayloadBuilder`、`PayloadBuilderService` (名前指定、行番号なし)

## Style review notes (self-critique before paste)

- **L6 の反流暢性 callout** (「我々の chain は trait surface には custom すぎる」) は high-leverage。Reth に近づくチームのほとんどはこの道にいる。カットや soften しない。
- **L6 §2 の component-category テーブル** は lesson 内最も reference 可能な artifact。
- **L8 §1 の 7 step パイプライン** は load-bearing argument。
- **L8 §4 の比較テーブル** (「openhl vs production Reth」) は lesson にしては珍しく self-critical で、7 step のうち 5 が "skipped" と示している。次のモジュールの作業を visible にする framing なので削らない。
- **L8 の締めの「おめでとう」** はこれをコースの最終レッスンとして扱う。
- **翻訳 policy は L1/L2/L3/L4/L5/L7/L10 JA と同一**:
  - `NodeBuilder`、`EthereumNode`、Reth component 名は英語のまま。
  - Reth の trait 名 (`Database`、`BlockchainProvider`、`TransactionPool`、`ConfigureEvm`、`PayloadBuilder`、`Consensus`) は英語のまま。
  - 🛑 callout: Predict → 予測、Anti-fluency → 反流暢性。
  - File paths、function names、types は英語のまま。
- **「fork」「slot」「seam」** は英語のまま — JA でカタカナ化すると意味が薄れる technical 用語。
- **未公開**: `course.isPublished: false` のまま。L9/L11/L12/L13 JA 翻訳が揃ってから一斉公開予定。
