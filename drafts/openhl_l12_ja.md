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

このレッスンの終わりに:

```bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
```

…が **happy path と negative path の両方** を exercise する新規テスト 1 個に合格する:

```
test live_node::tests::live_bridge_builds_on_real_genesis ... ok
```

Happy path: `EthereumNode` を boot し、その `BlockchainProvider` に real genesis hash を query し、provider を `LiveRethEvmBridge` に渡し、`build_payload(genesis_hash, attrs)` を呼ぶ。結果の child block は `number = 1` と `parent_hash = genesis` を持つ — どちらも **live provider 由来**、メモリ内合成ではない。

Negative path: `build_payload(BlockHash([0xee; 32]), attrs)` を呼ぶ。Provider はその hash を知らないので、bridge は `BridgeError::Rejected` を返す。**Live chain が見たことがない parent に対して build を拒否することが、bridge を consensus に配線して安全にする。**

新規ファイル: **`crates/evm/src/live_node.rs`** (~227 行) — `LiveRethEvmBridge<P>` は `P: BlockNumReader` に対してジェネリック。`build_payload` は real; `payload_ready` はインメモリ pending 状態を読む; `validate_payload` + `commit` は L14-L15 まで stub。

## おさらい

L11 完了時点で workspace には以下がある:

```
Cargo.toml                       — 13 個の reth-* workspace dep + alloy-genesis
crates/evm/Cargo.toml            — production dep 6 個 + dev-dep 11 個
crates/evm/src/bridges/          — InMemoryEvmBridge (L4) + RethEvmBridge (L5)
crates/evm/src/reth_node.rs      — bootstrap-only smoke test
crates/consensus/                — フル BFT engine + run_engine_app
```

`cargo test` で workspace 全体 36 個合格。**Reth は boot し、Malachite は block を produce するが、互いに話さない。** `RethEvmBridge` は parent lookup にインプロセス state を使う; `LiveRethEvmBridge` はまだ存在しない。

## 計画

6 つやる:

1. **`reth-storage-api` を workspace レベルで追加** — `BlockNumReader` trait surface を提供する。これに対してジェネリックになる。
2. **`crates/evm/Cargo.toml` を更新** — `eyre` を dev-dep から production dep へ昇格 (`BridgeError::Internal` のメッセージ構築用); `reth-storage-api` を production dep として追加。
3. **`crates/evm/src/live_node.rs` を作成** — `LiveRethEvmBridge<P>` struct + `ConsensusBridge` impl (`build_payload` は live、他は stub)。
4. **`pub mod live_node;`** を `crates/evm/src/lib.rs` に配線 (今回は production-visible、**`#[cfg(test)]` ではない**)。
5. **integration test `live_bridge_builds_on_real_genesis`** を追加 — real node を bootstrap、happy + negative path を assert。
6. **実行** — `cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release` が ~2.4 秒で合格。

このレッスンが教えるのは **provider-に対してジェネリックなパターン**、bridge を isolation で testable にする。`LiveRethEvmBridge<P>` は `P: BlockNumReader + Clone + Sync + 'static` に対してジェネリック。Production では `P` は live node の `BlockchainProvider`。テストでは `P` は決定的な `(hash → number)` マッピングを返す `MockProvider` でもよい。**Bridge 自体はどちらか気にしない** — ただ `provider.block_number(...)` を呼ぶ。これは L10 の `run_engine_app<B: ConsensusBridge>` と同じパターン: 具象型ではなく trait に依存する。

> 🛑 **予測してみよう。** スクロールする前に: `build_payload` が live provider から読むのに、なぜ `LiveRethEvmBridge` は依然として `pending`, `chain`, `head` フィールドを持つ内部 `Mutex<State>` を保持する? ヒント: `build_payload` は `PayloadId` を返し、engine は後で `payload_ready(id)` を呼んで実際の block を fetch する。Pending 状態がこれら 2 つの呼び出しを橋渡しする — Reth の payload-builder は block を組み立てるのに 10-50ms かかり、engine が待つ間 bridge は **結果** をどこかに保持する必要がある。**L13 でこのインメモリ pending 状態を Reth の実 payload-builder に置き換える。** 今のところは build-then-fetch shape が動くことを証明する placeholder。

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

`reth-storage-api` は `BlockNumReader`, `BlockHashReader` などの reader trait が住む場所。**他の reth-* dep と同じ pinned SHA** — ここで version skew があると、`LiveRethEvmBridge` は `node.provider` を受け入れられない、`BlockNumReader` のバージョンが違うから。

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

**なぜ `eyre` が今 production**: `BridgeError::Internal(eyre::eyre!(...))` は `build_payload` (production コード) で構築される、テストだけではなく。L11 では dev-dep が正しかった (`eyre::Result` を import するのはテストだけだった); 今は production コードが必要とする。

### Step 3: `crates/evm/src/live_node.rs` を作成 — モジュール doc + import

ファイル冒頭。役割を明示し、残りの stub を call out して、何が本レッスンで load-bearing で何が後に来るかを読者に明確にする:

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

`BlockNumReader` が live read を駆動する唯一の trait; 他はすべて L4 以来使っている bridge 型。

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

- **`LiveRethEvmBridge<P>`** は provider を value で保持し、build/commit の bookkeeping のために `Mutex<State>` を持つ。**`P` に対してジェネリック** — 具象 provider 型は焼き付けない。
- **`State`** は `InMemoryEvmBridge` (L4) が持っていたものをミラー — `next_payload_id` カウンタ、`pending` マップ (payload_id → fetch 待ちの built header)、`chain` マップ (commit 履歴)、`head` ポインタ。L13-L15 でこれらの各々を live Reth 構造で置き換える。

> 🛑 **やりがちな勘違い。** 「なぜ `provider` を `State` の中に入れて mutex を 1 つにしない?」 **`BlockNumReader` 実装は普通 `Sync + Clone` — 多数の async task で同時共有されるように作られているから。** Provider を mutex の中に入れると、すべての `block_number` lookup が直列化される。外に置くことで、`build_payload` への並行呼び出しが (安価な) state lock を奪い合っても、互いの (高コストかもしれない) provider read を block しない。**Lock は変更されるものを守る、読まれるものではない。**

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

Trait bound `P: BlockNumReader + Clone + Sync + 'static` が契約: hash→number lookup ができる、clone が安価、スレッド間で共有しても安全、任意の async task より長生き — そのような provider なら何でも。

`build_payload` の body は 3 フェーズ:

1. **Live read** (load-bearing な行)。`self.provider.block_number(parent_b256)` は `Result<Option<u64>, _>` を返す:
   - `Ok(Some(n))` — provider は parent を知っていて、number は `n`。続行。
   - `Ok(None)` — provider は parent を知らない。`BridgeError::Rejected` を返す。**これが bridge を consensus に配線して安全にする** — live chain が見たことがない parent に対して build しない。
   - `Err(e)` — provider が失敗 (DB 破損、deadlock、何でも)。`BridgeError::Internal` を返す。

2. **State allocation**。Mutex を lock、next ID を取り、increment。高速 — lock 下に I/O なし。

3. **Header 合成**。`number = parent_number + 1` (live read 由来)、`parent_hash = parent_b256`、engine が渡した attrs で child `Header` を build。`header.hash_slow()` で hash 計算。`(id → (hash, header))` マッピングを `pending` に格納。

> 🛑 **やりがちな勘違い。** 「なぜ parent lookup は `Result<u64, _>` ではなく `Result<Option<u64>, _>`?」 **「provider がこの hash を見つけられなかった」と「provider が crash した」は別の failure mode で、consumer は別扱いすべきだから。** 欠けている hash は **プロトコル** 問題 (「知らないものに対して build を要求された」 — 悪意ある peer または stale message)。Provider error は **運用** 問題 (「我々の DB が壊れた」 — 運用アラート)。2 層 `Result<Option<...>>` で caller が区別できる — そして各を別の `BridgeError` variant にマップする (`Rejected` vs. `Internal`)。

### Step 6: `payload_ready` + `commit` の stub

この 2 つは L4 のインメモリ bridge と大まかに同じ — live-Reth 統合は L13 (`payload_ready` を Reth の実 payload-builder に対して) と L15 (`commit` を Engine API に対して) で来る:

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

- **`payload_ready`** は `pending` から payload を ID で lookup、格納された header から `ExecutedBlock` を build。L4 と同じ shape。
- **`validate_payload`** は `Ok(PayloadStatus::Valid)` — 文字通り「常に valid」な stub。コメントが L14 (Stage 7c) を real execution が来る場所として名指し。**Visible stub は技術負債ではなく進捗マーカー。**
- **`commit`** は block を `chain` に記録し `head` を更新。L4 と同じ shape。コメントが L15 (Stage 7d) を forkchoice が来る場所として名指し。

### Step 7: `live_node.rs` を `lib.rs` に配線

`crates/evm/src/lib.rs` を開く。L11 ではこうだった:

```rust
pub mod bridges;

#[cfg(test)]
mod reth_node;
```

`live_node` を追加する — **今回は production-visible:**

```rust
pub mod bridges;
pub mod live_node;

#[cfg(test)]
mod reth_node;
```

なぜ `#[cfg(test)]` ではない? L13-L15 で `LiveRethEvmBridge` を production コードから使う (最終的には `bin/openhl/src/main.rs` から) から。L11 の bootstrap モジュールは genuine に test-only — dep tree を検証するためだけに存在する。L12 の bridge は production API。

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

テストの walk-through:

1. **real `EthereumNode` を bootstrap** — L11 と同じセットアップ。
2. **`node.provider.block_hash(0)`** — live provider に genesis block hash を尋ねる。これは `BlockHashReader` の API (`BlockNumReader` と別 trait — ペア)。
3. **`LiveRethEvmBridge::new(node.provider.clone())`** — bridge を構築。`BlockchainProvider` は内部 `Arc` ベースなので clone は安価。
4. **Happy path**: real genesis hash 上に payload を build、`payload_ready` 経由で fetch、`parent_hash == genesis_hash` と `number == 1` を assert。**これが live read が起きたことの証明** — もしインメモリ合成だったら、parent_hash は渡したもの (正しい) になるが `number` は我々が選ぶ何でもありえた。`1` が出るのは `provider.block_number(genesis_hash)` が `Some(0)` を返したからのみ。
5. **Negative path**: `BlockHash([0xee; 32])` は chain が見たことのない fabricated hash。`build_payload` は `BridgeError::Rejected` を返さなければならない。`matches!(err, BridgeError::Rejected(_))` が exhaustive check — 他の error variant ならテスト失敗。

> 🛑 **やりがちな勘違い。** 「なぜ negative path をそもそもテストする?」 **Rejection をテストしないテストは happy path が動くことしか証明しない — bridge が偶然インメモリ state に fallback して任意の parent に対して child block を produce するバグを catch できない。** ガベージな parent 上にサイレントに build する bridge はコンパイルが通り、happy path は pass し、consensus は破損した高さで嬉々として block を commit する。Negative path が live read が実際に load-bearing であることを証明する。

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

…workspace 全体 37 個合格するはず。

よくあるエラーと対処:

- **`error[E0277]: P: BlockNumReader is not satisfied for ...`** — workspace の `reth-storage-api` SHA が他の reth-* SHA と一致していない。Step 1 を再確認。
- **Happy path テストで `provider has no block with hash 0x000...`** — `block_hash(0)` を query しているが `None` を返している。`NodeConfig` で `.dev()` mode を使っていることを確認 (`.dev()` なしの test mode は genesis を事前 seed しないことがある)。
- **Test が `matches!(err, BridgeError::Rejected(_))` で失敗** — `build_payload` が `BridgeError::Internal` を伝播している。`.ok_or_else(|| BridgeError::Rejected(...))` の行を確認; 代わりに `.expect(...)` や `.unwrap_or(0)` を使うと error path が発火しない。
- **Test はコンパイルするが「P is private」と言う** — `LiveRethEvmBridge<P>` には `pub struct ... { provider: P, ... }` が必要。`provider` が `pub` でも、ジェネリックパラメータが `pub` なのは implicit。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Bridge は `P: BlockNumReader` に対してジェネリック、`BlockchainProvider` に対して具象ではない。** Production では live provider を渡す; テストは mock を渡せる; 将来 module 7 では別 Reth プロセスに JSON-RPC で話す `RemoteProvider` を渡せる。**Bridge コードは変わらない** — 型パラメータだけが変わる。

2. **`Result<Option<u64>, _>` が運用 vs プロトコル failure を区別する。** 失敗した DB call と「この hash を知らない」は別の問題。それぞれを `BridgeError::Internal` vs. `BridgeError::Rejected` にマップすることで、consumer が適切に応答できる — 前者にアラート、後者は ignore-and-vote-nil。**Error は単なるメッセージではなく意味論を運ぶ。**

3. **happy/negative 2 テストペアが **最小** の誠実な検証。** どちらか片方では不十分: happy 単独はインメモリ state へのサイレント fallback を catch しない、negative 単独は常に reject する bridge を catch しない。**Live integration は両方が load-bearing でなければならない。**

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

**Q: なぜ `BlockchainProvider` を直接取らず `P に対してジェネリック`?**
2 つの理由。1 つ目、`BlockchainProvider` は定義に 30+ trait bound を持つ重い具象型 — 直接使うと、`LiveRethEvmBridge` のすべての consumer がそれらの bound を糸通しする必要がある。Generic `P: BlockNumReader` は surface を bridge が必要とする **唯一の能力** に絞る。2 つ目、generic-over-trait は mock テストを容易にする — `MockProvider` impl を書き、`LiveRethEvmBridge::new(...)` に渡し、real node bootstrap が不要な unit-testable bridge を得る。

**Q: `BlockNumReader::block_number` と `BlockHashReader::block_hash` の違いは?**
方向。`block_number(hash) → Option<u64>` は「この hash の number は?」に答える。`block_hash(n) → Option<B256>` は「この number の hash は?」に答える。テストは両方を使う: `block_hash(0)` で genesis hash を pull、それから `LiveRethEvmBridge` が内部で `block_number(hash)` を使って parent の number を lookup。同じ chain index、2 つのアクセスパターン。

**Q: なぜ `parking_lot::Mutex<State>` ではなく `Mutex<State>`?**
`std::sync::Mutex` は低 contention のシナリオでは fine。Bridge の state は `build_payload` / `payload_ready` / `commit` でだけ触られる — 各 block あたり最大 1 回、数十から数千ミリ秒の間隔。`parking_lot` は contention が多いときに意味がある; ここではほぼゼロ。理由なしに dep を追加しない。

**Q: この bridge はいつ `RethEvmBridge` を実際に置き換える?**
すでに置き換わった — `RethEvmBridge` (L5) は production 用途では `LiveRethEvmBridge` で superseded された。`RethEvmBridge` は教育的 waypoint および engine テストの `StubBridge` で使うインメモリ variant として codebase に残る。**Codebase 内の 2 bridge は重複実装ではなく統合の 2 段階を表す。**

## 次のレッスン (L13)

Bridge は `build_payload` で Reth から読む。だが `pending` HashMap はまだインプロセス合成のまま — engine は「propose する次の block」を尋ね、我々は我々が作った header を返す。**L13 で `pending` を Reth の実 `PayloadBuilder` に置き換える** — Reth が JSON-RPC `engine_getPayloadV4` call で block を組み立てるのと同じ機構。L13 完了で、bridge は real Ethereum tooling が受け入れる block を produce する (フル transaction list、receipt、gas usage、state root)。これが「bridge が Reth のストレージと話す」から「bridge が Reth の実行パイプラインと完全統合される」への transition。
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
- **「予測してみよう」「やりがちな勘違い」** は L4-L11 で確立した訳語と統一。
- **タイトル/コードコメントは英語のまま** (OSS 実装にコピーされる前提)。
