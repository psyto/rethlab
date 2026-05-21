# OpenHL を作る — L12 draft (JA) — C2 build-along 書き直し

> openhl SHA `8d211b8` (Stage 7b — `LiveRethEvmBridge` が live provider 経由で parent を lookup する) 基準。
> コース: `building-openhl-consensus-ja` (track: `reth-l1-architect`, 10 コース中 6 番目)。
> 注: L12 は **bridge コードが実際に live Reth chain から読む最初のコミット**。L13-L15 で残りの stub を順次置き換える。

---

## L12 — `openhl-live-bridge-ja`

- **モジュール:** 6 (Live Reth)
- **モジュール sortOrder:** 1 (L11 の bootstrap の後)
- **コース全体 sortOrder:** 11 (16 レッスン中 12 番目)
- **所要時間:** 50 分
- **XP:** 100
- **type:** CONTENT

### Content

````markdown
# レッスン 12 — `LiveRethEvmBridge` が real chain から parent を読む

## ゴール

このレッスンで掴む概念:

- **`BlockchainProvider` の具象型ではなく `P: BlockNumReader` に generic にする。** bridge が必要とする Reth の capability を *ちょうど 1 つ* に宣言する。具象 provider は 30 個以上の trait bound を背負っていて、それを全 caller に流すのは負担。Generic は surface を絞り、mock test も自明にしてくれる。
- **honest な validation の最小単位としての happy/negative ペア。** happy だけだと in-memory への silent fallback を見逃す。negative だけだと「常に reject する bridge」を見逃す。「bridge は Reth と対話している」を真の主張にするには両方が load-bearing でなければならない。
- **`Result<Option<u64>>` が運用エラーとプロトコルエラーを区別する。** DB call の失敗 → `BridgeError::Internal` (アラート)、未知の hash → `BridgeError::Rejected` (nil に投票して進む)。エラーはメッセージだけでなく意味も運ぶ。
- **未知の親の拒否は安全性プロパティ。** consensus engine が live chain の見たことない hash の上に build しろと言ってきたら、bridge は拒否しなければならない。これが、悪意ある proposer や壊れた proposer が EL を fork subtree に誘導することを防ぐルールだ。
- **integration の段階を示す 2 つの bridge。** `RethEvmBridge` (L5、alloy のみ) と `LiveRethEvmBridge` (L12、live provider) は両方とも codebase に残る。重複実装ではなく、integration の 2 段階を表している。

検証:

```bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
```

上記の実行結果が **happy path と negative path の両方** を exercise する新規テスト 1 個に合格する:

```
test live_node::tests::live_bridge_builds_on_real_genesis ... ok
```

Happy path: `EthereumNode` を boot し、その `BlockchainProvider` に実際の genesis hash を query し、provider を `LiveRethEvmBridge` に渡し、`build_payload(genesis_hash, attrs)` を呼ぶ。結果の child block は `number = 1` と `parent_hash = genesis` を持つ — どちらも **live provider 由来** であって、メモリ内の合成ではない。

Negative path: `build_payload(BlockHash([0xee; 32]), attrs)` を呼ぶ。Provider はその hash を知らないので、bridge は `BridgeError::Rejected` を返す。**Live chain が見たことのない parent に対して build を拒否することで、bridge を consensus に接続しても安全になる。**

具体的な変更:

- `crates/evm/src/live_node.rs` — 新規ファイル (~227 行)。`LiveRethEvmBridge<P>` は `P: BlockNumReader + Clone + Sync + 'static` に generic。`build_payload` は real (live provider を query する)。`payload_ready` はインメモリの pending 状態を読む。`validate_payload` と `commit` は L13-L14 まで stub のままだ。
- `crates/evm/Cargo.toml` に generic bound が要求する production dep を追加。
- `crates/evm/src/lib.rs` — `pub mod live_node;` を組み込む。

## おさらい

L11 完了時点で workspace には以下がある:

```
Cargo.toml                       — 13 個の reth-* workspace dep + alloy-genesis
crates/evm/Cargo.toml            — production dep 6 個 + dev-dep 11 個
crates/evm/src/bridges/          — InMemoryEvmBridge (L4) + RethEvmBridge (L5)
crates/evm/src/reth_node.rs      — bootstrap-only smoke test
crates/consensus/                — フル BFT engine + run_engine_app
```

`cargo test` で workspace 全体 36 個が合格する。**Reth は boot し、Malachite は block を 生成するが、互いに会話していない。** `RethEvmBridge` は parent lookup にインプロセス state を使う。`LiveRethEvmBridge` はまだ存在しない。

## 計画

6 つやる:

1. **`reth-storage-api` を workspace レベルで追加する** — `BlockNumReader` trait surface を提供する crate だ。これに対してジェネリックにする。
2. **`crates/evm/Cargo.toml` を更新する** — `eyre` を dev-dep から production dep へ昇格させ (`BridgeError::Internal` のメッセージ構築で使う)、`reth-storage-api` を production dep として追加する。
3. **`crates/evm/src/live_node.rs` を作成する** — `LiveRethEvmBridge<P>` struct と `ConsensusBridge` impl (`build_payload` は live、他は stub)。
4. **`pub mod live_node;`** を `crates/evm/src/lib.rs` に組み込む (今回は production-visible で、**`#[cfg(test)]` ではない**)。
5. **integration test `live_bridge_builds_on_real_genesis`** を追加する — real node を bootstrap して、happy と negative の両方の path を assert する。
6. **実行** — `cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release` が ~2.4 秒で合格する。

このレッスンが教えるのは **provider に対してジェネリックなパターン** だ。これによって bridge を isolation でテスト可能にする。`LiveRethEvmBridge<P>` は `P: BlockNumReader + Clone + Sync + 'static` に対してジェネリックだ。Production では `P` は live node の `BlockchainProvider` になる。テストでは `P` を、決定的な `(hash → number)` マッピングを返す `MockProvider` にしてもよい。**Bridge 自体はどちらかを気にしない** — ただ `provider.block_number(...)` を呼ぶだけだ。これは L10 の `run_engine_app<B: ConsensusBridge>` と同じパターンで、具象型ではなく trait に依存する。

> 🛑 **考えてみよう。** スクロールする前に: `build_payload` が live provider から読むのに、なぜ `LiveRethEvmBridge` は依然として `pending`、`chain`、`head` フィールドを持つ内部の `Mutex<State>` を保持しているのか? ヒント: `build_payload` は `PayloadId` を返し、engine は後で `payload_ready(id)` を呼んで実際の block を fetch する。Pending 状態がこの 2 つの呼び出しの橋渡しをする — Reth の payload-builder は block を組み立てるのに 10-50ms かかるので、engine が待っている間、bridge は **結果** をどこかに保持しておく必要がある。**L13 でこのインメモリの pending 状態を Reth の実 payload-builder に置き換える。** 今のところは build-then-fetch の形が動くことを証明する placeholder だ。

## 手順

### Step 1: workspace に `reth-storage-api` を追加

ルート `Cargo.toml` を開く。L11 後、reth ブロックは次で終わる:

```toml
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
```

`reth-provider` と `alloy-genesis` の間に 1 行追加:

```toml
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
```

`reth-storage-api` は `BlockNumReader` や `BlockHashReader` といった reader trait が住む場所だ。**他の reth-* dep と同じ pinned SHA を使う** — ここで version skew があると、`BlockNumReader` のバージョンが違うために `LiveRethEvmBridge` が `node.provider` を受け入れられなくなる。

### Step 2: `crates/evm/Cargo.toml` を更新

小さな変更 2 つ。`[dependencies]` セクションに 2 個追加:

```toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }      # NEW: [dev-dependencies] にあったのを production へ
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }      # NEW
```

そして `eyre` を `[dev-dependencies]` から削除:

```toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-builder    = { workspace = true, features = ["test-utils"] }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
reth-chainspec       = { workspace = true }
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
# eyre 行は削除 — 今は production dep
tempfile             = "3"
```

**`eyre` が今 production な理由**: `BridgeError::Internal(eyre::eyre!(...))` は `build_payload` (production コード) で構築するからで、テストだけではない。L11 では dev-dep が正しかった (`eyre::Result` を import するのはテストだけだった)。今は production コード側が必要としている。

### Step 3: `crates/evm/src/live_node.rs` を作成 — モジュール doc + import

ファイル冒頭。役割を明示し、残りの stub を call out して、何が本レッスンで load-bearing で何が後に来るのかを読者に明確に示す:

```rust
//! `LiveRethEvmBridge` — `ConsensusBridge` backed by a real Reth provider.
//!
//! Stage 7b: parent lookups go through the live node's provider via the
//! `BlockNumReader` trait, so `build_payload` produces a child block whose
//! `number` and `parent_hash` reflect actual chain state rather than the
//! in-process synthesis of [`crate::engine::RethEvmBridge`].
//!
//! Still stubbed for now (each rolls into a later stage):
//!   - `validate_payload` → Stage 7c: real `BlockExecutor` execution
//!   - `commit` → Stage 7d: forkchoice via in-process Engine API
//!
//! Both stubs are visible markers of "what still needs the live node."

use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use reth_storage_api::BlockNumReader;
use std::collections::HashMap;
use std::sync::Mutex;
```

`BlockNumReader` が live read を駆動する唯一の trait だ。他はすべて L4 以来使っている bridge 型だ。

### Step 4: struct を定義

```rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, (B256, Header)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}

impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P) -> Self {
        Self {
            provider,
            state: Mutex::new(State::default()),
        }
    }
}
```

2 つのピース:

- **`LiveRethEvmBridge<P>`** は provider を value で保持し、build/commit の bookkeeping のために `Mutex<State>` を持つ。**`P` に対してジェネリック** で、具象 provider 型は焼き付けない。
- **`State`** は `InMemoryEvmBridge` (L4) が持っていたものを反映したものだ — `next_payload_id` カウンタ、`pending` マップ (payload_id → fetch 待ちの built header)、`chain` マップ (commit 履歴)、`head` ポインタ。L13-L15 でこれらをそれぞれ live Reth 構造で置き換えていく。

> 🛑 **やりがちな勘違い。** 「なぜ `provider` を `State` の中に入れて mutex を 1 つにまとめないのか?」 **`BlockNumReader` 実装は普通 `Sync + Clone` — 多数の async task で同時に共有されることを前提に作られているからだ。** Provider を mutex の中に入れると、すべての `block_number` lookup が直列化されてしまう。外に置けば、`build_payload` への並行呼び出しが (安価な) state lock を奪い合うことはあっても、互いの (高コストになりうる) provider read を block することはない。**Lock は変更されるものを守るためにあり、読まれるものを守るためではない。**

### Step 5: `ConsensusBridge` impl — `build_payload` が live read

```rust
#[async_trait]
impl<P> ConsensusBridge for LiveRethEvmBridge<P>
where
    P: BlockNumReader + Clone + Sync + 'static,
{
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let parent_b256 = B256::from(parent.0);

        // LIVE READ: parent's block number comes from the real provider, not
        // an in-process HashMap. If the provider doesn't know this hash, we
        // refuse to build a child on it.
        let parent_number = self
            .provider
            .block_number(parent_b256)
            .map_err(|e| BridgeError::Internal(eyre::eyre!("provider error: {e}")))?
            .ok_or_else(|| {
                BridgeError::Rejected(format!("provider has no block with hash {parent_b256}"))
            })?;

        let mut s = self.state.lock().expect("state mutex poisoned");
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let header = Header {
            parent_hash: parent_b256,
            number: parent_number + 1,
            timestamp: attrs.timestamp,
            beneficiary: Address::from(attrs.fee_recipient),
            mix_hash: B256::from(attrs.prev_randao),
            ..Default::default()
        };
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header));
        Ok(PayloadId(id))
    }
```

Trait bound `P: BlockNumReader + Clone + Sync + 'static` が契約だ: hash→number lookup ができる、clone が安価、スレッド間で共有しても安全、任意の async task より長生きする — そのような provider なら何でもよい、ということになる。

`build_payload` の body は 3 フェーズだ:

1. **Live read** (load-bearing な行)。`self.provider.block_number(parent_b256)` は `Result<Option<u64>, _>` を返す:
   - `Ok(Some(n))` — provider は parent を知っており、number は `n`。続行する。
   - `Ok(None)` — provider は parent を知らない。`BridgeError::Rejected` を返す。**これが、bridge を consensus に接続しても安全にする要因だ** — live chain が見たことのない parent に対しては build しない。
   - `Err(e)` — provider が失敗した (DB 破損、deadlock、何でも)。`BridgeError::Internal` を返す。

2. **State allocation**。Mutex を lock し、next ID を取って increment する。高速で、lock 下に I/O は無い。

3. **Header 合成**。`number = parent_number + 1` (live read 由来)、`parent_hash = parent_b256`、engine が渡した attrs で child `Header` を build する。`header.hash_slow()` で hash を計算し、`(id → (hash, header))` マッピングを `pending` に格納する。

> 🛑 **やりがちな勘違い。** 「なぜ parent lookup は `Result<u64, _>` ではなく `Result<Option<u64>, _>` なのか?」 **「provider がこの hash を見つけられなかった」と「provider が crash した」は別の failure mode で、consumer は別扱いすべきだからだ。** 欠けている hash は **プロトコル** の問題 (「知らないものに対して build を要求された」 — 悪意ある peer か stale なメッセージ) を意味する。Provider error は **運用** の問題 (「DB が壊れた」 — 運用アラート) を意味する。2 層の `Result<Option<...>>` にすれば caller が両者を区別でき、それぞれを別の `BridgeError` variant (`Rejected` vs `Internal`) にマップできる。

### Step 6: `payload_ready` + `commit` の stub

この 2 つは L4 のインメモリ bridge とほぼ同じだ — live-Reth 統合は L13 (`payload_ready` を Reth の実 payload-builder に対して) と L15 (`commit` を Engine API に対して) で行う:

```rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        let (hash, header) = s
            .pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
        Ok(ExecutedBlock {
            hash: BlockHash(hash.0),
            parent_hash: BlockHash(header.parent_hash.0),
            number: header.number,
            state_root: header.state_root.0,
        })
    }

    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        // Stage 7c: replace with real BlockExecutor execution + state-root check.
        Ok(PayloadStatus::Valid)
    }

    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        // Stage 7d: replace with in-process Engine API forkchoice update.
        let hash = B256::from(block_hash.0);
        let mut s = self.state.lock().expect("state mutex poisoned");
        let header = s
            .pending
            .values()
            .find(|(h, _)| *h == hash)
            .map(|(_, h)| h.clone())
            .ok_or_else(|| BridgeError::Rejected(format!("commit for unknown hash {hash}")))?;
        s.chain.insert(hash, header);
        s.head = Some(hash);
        Ok(())
    }
}
```

- **`payload_ready`** は `pending` から payload を ID で lookup し、格納された header から `ExecutedBlock` を build する。L4 と同じ shape だ。
- **`validate_payload`** は `Ok(PayloadStatus::Valid)` を返す — 文字通り「常に valid」な stub だ。コメントが、real execution が入る場所として L14 (Stage 7c) を名指ししている。**Visible な stub は技術負債ではなく、進捗マーカーだ。**
- **`commit`** は block を `chain` に記録して `head` を更新する。L4 と同じ shape。コメントが、forkchoice が入る場所として L15 (Stage 7d) を名指ししている。

### Step 7: `live_node.rs` を `lib.rs` に組み込む

`crates/evm/src/lib.rs` を開く。L11 ではこうだった:

```rust
pub mod bridges;

#[cfg(test)]
mod reth_node;
```

`live_node` を追加する — **今回は production-visible だ:**

```rust
pub mod bridges;
pub mod live_node;

#[cfg(test)]
mod reth_node;
```

なぜ `#[cfg(test)]` にしないのか? L13-L15 で `LiveRethEvmBridge` を production コードから使う (最終的には `bin/openhl/src/main.rs` から) からだ。L11 の bootstrap モジュールは genuine に test-only で、dep tree を検証するためだけに存在していた。L12 の bridge は production API だ。

### Step 8: integration test を追加

`crates/evm/src/live_node.rs` に append:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use alloy_genesis::Genesis;
    use reth_chainspec::ChainSpec;
    use reth_node_builder::{NodeBuilder, NodeHandle};
    use reth_node_core::node_config::NodeConfig;
    use reth_node_ethereum::EthereumNode;
    use reth_storage_api::BlockHashReader;
    use reth_tasks::Runtime;
    use std::sync::Arc;

    fn dev_chain_spec() -> Arc<ChainSpec> {
        let custom_genesis = r#"{
            "nonce": "0x42",
            "timestamp": "0x0",
            "extraData": "0x5343",
            "gasLimit": "0x5208",
            "difficulty": "0x400000000",
            "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "coinbase": "0x0000000000000000000000000000000000000000",
            "alloc": {},
            "number": "0x0",
            "gasUsed": "0x0",
            "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "config": {
                "ethash": {},
                "chainId": 2600,
                "homesteadBlock": 0,
                "eip150Block": 0,
                "eip155Block": 0,
                "eip158Block": 0,
                "byzantiumBlock": 0,
                "constantinopleBlock": 0,
                "petersburgBlock": 0,
                "istanbulBlock": 0,
                "berlinBlock": 0,
                "londonBlock": 0,
                "terminalTotalDifficulty": 0,
                "terminalTotalDifficultyPassed": true,
                "shanghaiTime": 0
            }
        }"#;
        let genesis: Genesis = serde_json::from_str(custom_genesis).expect("dev genesis parses");
        Arc::new(genesis.into())
    }

    /// END-TO-END Stage 7b: bootstrap a real Reth node, hand its provider to
    /// `LiveRethEvmBridge`, build a payload on top of the real genesis block.
    /// Asserts the `parent_hash` and number come from the live chain, not an
    /// in-process synthesis.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn live_bridge_builds_on_real_genesis() {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec);

        let NodeHandle {
            node,
            node_exit_future: _,
        } = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .node(EthereumNode::default())
            .launch_with_debug_capabilities()
            .await
            .expect("launch failed");

        // Pull the genesis hash from the live provider.
        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no block 0 (genesis)");

        // Construct the bridge against the live provider.
        let bridge = LiveRethEvmBridge::new(node.provider.clone());

        // Build a payload on the real genesis.
        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs.clone())
            .await
            .expect("build_payload failed");
        let block = bridge.payload_ready(id).await.expect("payload_ready failed");

        // The bridge's lookup hit the LIVE provider — assert the resulting
        // header carries genesis as its parent and is at height 1.
        assert_eq!(block.parent_hash, BlockHash(genesis_hash_b256.0));
        assert_eq!(block.number, 1);

        // Negative case: a fabricated parent hash must be rejected because
        // the live provider doesn't know it.
        let fake_parent = BlockHash([0xeeu8; 32]);
        let err = bridge.build_payload(fake_parent, attrs).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
}
```

テストの順を追って見ていく:

1. **実際の `EthereumNode` を bootstrap する** — L11 と同じセットアップ。
2. **`node.provider.block_hash(0)`** — live provider に genesis block hash を尋ねる。これは `BlockHashReader` の API だ (`BlockNumReader` とは別 trait で、ペアになっている)。
3. **`LiveRethEvmBridge::new(node.provider.clone())`** — bridge を構築する。`BlockchainProvider` は内部的に `Arc` ベースなので、clone は安価だ。
4. **Happy path**: 実際の genesis hash の上に payload を build し、`payload_ready` 経由で fetch して、`parent_hash == genesis_hash` と `number == 1` を assert する。**これが live read が起きたことの証明だ。** もしインメモリ合成だったら、parent_hash は渡したもの (これは正しい) になるが、`number` は任意の値でありえた。`1` が出るのは、`provider.block_number(genesis_hash)` が `Some(0)` を返したときだけだ。
5. **Negative path**: `BlockHash([0xee; 32])` は chain が見たことのない fabricated hash だ。`build_payload` は `BridgeError::Rejected` を返さなければならない。`matches!(err, BridgeError::Rejected(_))` が exhaustive な check になる — 他の error variant が来たらテスト失敗だ。

> 🛑 **やりがちな勘違い。** 「なぜ negative path までテストするのか?」 **Rejection をテストしないテストは、happy path が動くことしか証明できない — bridge が偶然インメモリ state に fallback して任意の parent に対して child block を 生成するバグを catch できない。** ガベージな parent の上にサイレントに build する bridge は、コンパイルが通り、happy path は pass し、consensus は破損した高さの block を嬉々として commit してしまう。Negative path こそが、live read が実際に load-bearing であることを証明する。

## テスト

```bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
```

~30 秒後 (コンパイル + 初回 node bootstrap):

```
running 1 test
test live_node::tests::live_bridge_builds_on_real_genesis ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Test runtime: ~2.4 秒 (Reth bootstrap が支配的)。

Full suite:

```bash
cargo test
```

…workspace 全体 37 個が合格するはず。

よくあるエラーと対処:

- **`error[E0277]: P: BlockNumReader is not satisfied for ...`** — workspace の `reth-storage-api` SHA が他の reth-* SHA と一致していない。Step 1 を再確認。
- **Happy path テストで `provider has no block with hash 0x000...`** — `block_hash(0)` を query しているのに `None` を返している。`NodeConfig` で `.dev()` mode を使っているか確認する (`.dev()` なしの test mode では genesis が事前 seed されないことがある)。
- **Test が `matches!(err, BridgeError::Rejected(_))` で失敗する** — `build_payload` が `BridgeError::Internal` を伝播している。`.ok_or_else(|| BridgeError::Rejected(...))` の行を確認する。代わりに `.expect(...)` や `.unwrap_or(0)` を使うと error path が発火しない。
- **Test はコンパイルできるが「P is private」と言われる** — `LiveRethEvmBridge<P>` には `pub struct ... { provider: P, ... }` が必要だ。`provider` が `pub` でも、ジェネリックパラメータが `pub` であるのは暗黙的になる。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Bridge は `P: BlockNumReader` に対してジェネリックにし、`BlockchainProvider` の具象型に対して書かない。** Production では live provider を渡す。テストでは mock を渡せる。将来 module 7 では、別の Reth プロセスに JSON-RPC で話す `RemoteProvider` を渡せる。**Bridge コードは変わらない** — 型パラメータだけが変わる。

2. **`Result<Option<u64>, _>` が運用エラーとプロトコルエラーを区別する。** 失敗した DB call と「この hash を知らない」は別の問題だ。それぞれを `BridgeError::Internal` と `BridgeError::Rejected` にマップすることで、consumer が適切に応答できる — 前者にはアラート、後者は ignore-and-vote-nil。**Error は単なるメッセージではなく、意味論を運ぶ。**

3. **happy / negative の 2 テストペアが **最小** の誠実な検証になる。** どちらか片方では不十分だ: happy 単独ではインメモリ state へのサイレント fallback を catch できないし、negative 単独では常に reject する bridge を catch できない。**Live integration では両方が load-bearing でなければならない。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 8d211b8
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
```

`8d211b8` の参照には ~227 行の `live_node.rs` が含まれる。Trait bound `P: BlockNumReader + Clone + Sync + 'static`、`build_payload` 本体、2 パステストは厳密に一致するべき。Doc コメントの言い回しは個人差可。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜ `BlockchainProvider` を直接取らず、`P` に対してジェネリックにするのか?**
理由は 2 つある。1 つ目、`BlockchainProvider` は定義に 30 以上の trait bound を持つ重い具象型だ — 直接使うと、`LiveRethEvmBridge` のすべての consumer がそれらの bound を糸通ししなければならない。Generic な `P: BlockNumReader` は、bridge が必要とする **唯一の能力** に surface を絞ってくれる。2 つ目、generic-over-trait は mock テストを容易にする — `MockProvider` impl を書いて `LiveRethEvmBridge::new(...)` に渡せば、実際の node bootstrap なしで unit-testable な bridge を得られる。

**Q: `BlockNumReader::block_number` と `BlockHashReader::block_hash` の違いは?**
方向だ。`block_number(hash) → Option<u64>` は「この hash の number は?」に答える。`block_hash(n) → Option<B256>` は「この number の hash は?」に答える。テストは両方を使う: `block_hash(0)` で genesis hash を pull し、そのあと `LiveRethEvmBridge` が内部で `block_number(hash)` を使って parent の number を lookup する。同じ chain index に対する 2 つのアクセスパターンだ。

**Q: なぜ `parking_lot::Mutex<State>` ではなく `Mutex<State>` を使うのか?**
`std::sync::Mutex` は低 contention のシナリオでは問題ない。Bridge の state は `build_payload` / `payload_ready` / `commit` でしか触られず、各 block あたり最大 1 回、数十から数千ミリ秒の間隔で触れるだけだ。`parking_lot` は contention が多いときに意味がある — ここではほぼゼロだ。理由なしに dep を追加しないようにする。

**Q: この bridge は `RethEvmBridge` を実際にいつ置き換えるのか?**
すでに置き換わっている — `RethEvmBridge` (L5) は production 用途では `LiveRethEvmBridge` に取って代わられた。`RethEvmBridge` は、教育的な waypoint および engine テストの `StubBridge` で使うインメモリ variant として codebase に残る。**Codebase 内の 2 つの bridge は重複実装ではなく、統合の 2 段階を表している。**

## 次のレッスン (L13)

Bridge は `build_payload` で Reth から読むようになった。だが `pending` HashMap はまだインプロセス合成のままだ — engine が「propose する次の block」を尋ねてきたら、こちらは自分で作った header を返している。**L13 で `pending` を Reth の実 `PayloadBuilder` に置き換える** — Reth が JSON-RPC `engine_getPayloadV4` call で block を組み立てるのと同じ機構だ。L13 完了で、bridge は実際の Ethereum tooling が受け入れる block を 生成するようになる (フルな transaction list、receipt、gas usage、state root)。これが「bridge が Reth のストレージと会話する」から「bridge が Reth の実行パイプラインと完全に統合される」への移行だ。
````

---

## Seed ファイルスロット

L12 は Module 6 (Live Reth) sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 12 — LiveRethEvmBridge が real chain から parent を読む',
  slug: 'openhl-live-bridge-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 50,
  xpReward: 100,
  content: `# レッスン 12 — \`LiveRethEvmBridge\` が real chain から parent を読む\n\n...`
},
```

## SHA pinning 規律

L12 が参照する openhl コミット (§答え合わせ):
- `8d211b8` (Stage 7b — LiveRethEvmBridge が live provider 経由で parent を lookup する)

これが bridge コードが実際に live Reth chain から読む最初のコミット。

## 翻訳セルフレビュー (paste 前)

- **「load-bearing」「provider」「bridge」** は専門語として英語のまま保持。
- **「generic-over-trait」「protocol vs operational failure」** はそのまま (ニュアンス保持)。
- **「happy path」「negative path」「sad path」** は英語のまま (CS / QA 慣用語)。
- **「考えてみよう」「やりがちな勘違い」** は L4-L11 で確立した訳語と統一。
- **タイトル/コードコメントは英語のまま** (OSS 実装にコピーされる前提)。
