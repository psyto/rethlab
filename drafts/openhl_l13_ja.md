# OpenHL を作る — L13 draft (JA) — C2 build-along 書き直し

> openhl SHA `0844d58` (Stage 7c — `validate_payload` が Reth の `EthBeaconConsensus` を走らせる) 基準。
> コース: `building-openhl-consensus-ja` (track: `reth-l1-architect`, 10 コース中 6 番目)。
> 注: L13 で bridge の両側が production-shape を強制される — `build_payload` は real Reth-shape header を合成し、`validate_payload` は Reth の real validator を走らせる。両者が **合意** しなければならない。つまり本レッスンが、production EIP-1559 数式、post-merge invariant、gas-limit drift ルールに触れる最初のレッスン。

---

## L13 — `openhl-validate-payload-ja`

- **モジュール:** 6 (Live Reth)
- **モジュール sortOrder:** 2 (L12 の parent lookup の後)
- **コース全体 sortOrder:** 12 (16 レッスン中 13 番目)
- **所要時間:** 55 分
- **XP:** 100
- **type:** CONTENT

### Content

````markdown
# レッスン 13 — `validate_payload` が Reth の `EthBeaconConsensus` を走らせる

## ゴール

このレッスンの終わりに:

```bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
```

…依然合格する — ただしテストは **3 つの追加結果** を assert する (happy + invalid block の `validate_payload` チェック追加):

```
test live_node::tests::live_bridge_builds_on_real_genesis ... ok
```

中身の変化:
- 今 build した block に対する `bridge.validate_payload(block)` は `PayloadStatus::Valid` を返す — Reth の **real** validator (`EthBeaconConsensus::validate_header_against_parent`) が承認したから。
- `bridge.validate_payload(block_with_unknown_hash)` は `PayloadStatus::Invalid` を返す — validate する header がないから。

これを動かすために、**`build_payload` は production-shape header を produce し始めなければならなかった** — gas_limit を parent からコピー (1/1024 drift bound)、next_block_base_fee を chain spec 経由で計算 (validator が使うのと同じヘルパー)、difficulty をゼロに (post-merge invariant)、attrs が古かった場合 timestamp を `parent.timestamp + 1` に snap。**Validator が builder に誠実であることを強制する。**

3 個の新規 workspace dep + 4 個の新規 evm production dep + `live_node.rs` の rewrite で約 141 行の変更。**ファイルの shape は変わらない** — 同じ struct、同じ `ConsensusBridge` impl。変わるのは `validate_payload` が **何をするか**。

## おさらい

L12 完了時点で `crates/evm/src/live_node.rs` には:

```rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    state: Mutex<State>,
}
```

`build_payload` は parent number を live provider から読むが、ほとんどデフォルトフィールドの header を合成する。`validate_payload` は stub: `Ok(PayloadStatus::Valid)`。Integration test は build/fetch を happy/negative path で exercise するのみ — validation は決して走らない。

`cargo test` で workspace 全体 37 個合格。**Bridge は自分自身と合意しているが、まだ Reth の valid block の概念と合意することを強制されていない。**

## 計画

7 つやる:

1. **3 個の workspace dep を追加**: `reth-consensus` (`HeaderValidator` trait)、`reth-ethereum-consensus` (具象 `EthBeaconConsensus`)、`reth-primitives-traits` (`SealedHeader`)。
2. **`crates/evm/Cargo.toml` を更新** — `reth-chainspec` を dev-dep から production dep へ昇格、3 個の新規 production dep を追加。
3. **`LiveRethEvmBridge` に 2 個の新規フィールド** を追加: `chain_spec: Arc<ChainSpec>` と `validator: EthBeaconConsensus<ChainSpec>`。`new()` を chain spec を受け取るように更新。
4. **`P` の trait bound を拡張** — 今は `HeaderProvider<Header = Header>` も (parent の full sealed header を fetch するため)。
5. **`build_payload` をアップグレード** — parent の full `SealedHeader` を pull、next_block_base_fee を計算、gas_limit をコピー、difficulty をゼロに、timestamp monotonicity を強制。
6. **`validate_payload` を rewrite** — pending/chain から自分の header を見つけ、provider から parent sealed を fetch、`validator.validate_header_against_parent` を走らせる。
7. **テストに 2 個の新規 assertion を追加** — 今 build した block で `Valid`、unknown hash で `Invalid`。

このレッスンが教えるのは **producer-consumer の自己整合性パターン**。同じ artifact の builder と validator がある場合、**両者は同じルールを使わなければならない**。`build_payload` が 1 つの base-fee 公式を使い `validate_payload` が別のを使うなら、すべての block が validation に失敗する。これを確保する方法は **両方を同じソースから導出すること** — ここでは `ChainSpec`。`ChainSpec::next_block_base_fee()` が build に使われ、`EthBeaconConsensus::validate_against_parent_eip1559_base_fee` の中で同じヘルパーが check に使われる。**Source-of-truth の共有がシステムを自己整合にする。**

> 🛑 **予測してみよう。** スクロールする前に: なぜ `EthBeaconConsensus::validate_header_against_parent` は parent の **full** sealed header (gas_limit、timestamp、base_fee_per_gas、すべて) を必要とするが、`BlockNumReader::block_number` は `u64` しか返さない? ヒント: Reth の validator が走らせる 4 つの sub-check を考える。Number monotonicity は parent.number だけでいい。Timestamp monotonicity は parent.timestamp が必要。Gas-limit drift は parent.gas_limit が必要。EIP-1559 base fee は parent.base_fee_per_gas + parent.gas_used + parent.gas_limit が必要。**Validate する瞬間に、header 全体が必要 — number だけではない。** だから L13 で trait bound を `BlockNumReader` から **加えて** `HeaderProvider<Header = Header>` に拡張する。

## 手順

### Step 1: 3 個の workspace dep を追加

ルート `Cargo.toml` を開く。L12 の reth ブロックは次で終わる:

```toml
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
```

`reth-storage-api` と `alloy-genesis` の間に 3 行挿入:

```toml
reth-consensus            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-consensus   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-primitives-traits    = "0.3"
```

3 個の dep、3 つの役割:

- **`reth-consensus`** — `HeaderValidator` trait を定義。`EthBeaconConsensus` がこれを impl。この trait 経由で `.validate_header_against_parent(...)` を呼ぶ。
- **`reth-ethereum-consensus`** — `EthBeaconConsensus<ChainSpec>` を提供 — Reth の post-merge Ethereum 用 production header validator。
- **`reth-primitives-traits` (crates.io `0.3` から)** — `SealedHeader` を提供、`Header` とその hash をペアにするラッパー。**これは crates.io から、git ではない** — stable foundation crate として spin out された。

> 🛑 **やりがちな勘違い。** 「なぜ `reth-primitives-traits` だけ crates.io、他は git-pin?」 **`reth-primitives-traits` は Reth の中で public Rust エコシステム crate として **stabilize** された部分だから。** 他の crate (alloy、foundry、custom L2) も全部これに依存している。Git SHA で pin すると、crates.io から import している人すべてとバージョン衝突する — そして皆 crates.io から import している。**Git-pin reth-* dep は主に Reth の「内部」表面; `reth-primitives-traits` は **外部** 表面。**

### Step 2: `crates/evm/Cargo.toml` を更新

`[dependencies]` セクションが 4 行増え、`reth-chainspec` が `[dev-dependencies]` から昇格:

```toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }
reth-consensus           = { workspace = true }    # NEW
reth-ethereum-consensus  = { workspace = true }    # NEW
reth-primitives-traits   = { workspace = true }    # NEW
reth-chainspec           = { workspace = true }    # NEW — [dev-dependencies] にあった
```

そして `[dev-dependencies]` が `reth-chainspec` 行を失う (今は production):

```toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-builder    = { workspace = true, features = ["test-utils"] }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
# reth-chainspec 行は削除 — 今は production dep
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
tempfile             = "3"
```

**なぜ `reth-chainspec` が今 production**: bridge が struct 内に `Arc<ChainSpec>` を保持する。それは production-visible なフィールドなので、型も production-visible dep でなければならない。

### Step 3: `live_node.rs` の import + struct を更新

`crates/evm/src/live_node.rs` を開く。Import が 3 つ増える:

```rust
use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use reth_chainspec::{ChainSpec, EthChainSpec};                      // NEW
use reth_consensus::HeaderValidator;                                // NEW
use reth_ethereum_consensus::EthBeaconConsensus;                    // NEW
use reth_primitives_traits::SealedHeader;                           // NEW
use reth_storage_api::{BlockNumReader, HeaderProvider};             // CHANGED: + HeaderProvider
use std::collections::HashMap;
use std::sync::{Arc, Mutex};                                        // CHANGED: + Arc
```

5 個の新規型:
- `ChainSpec` — Reth の chain configuration、構築時に渡す。
- `EthChainSpec` — `ChainSpec` に `next_block_base_fee` メソッドを与える trait。
- `HeaderValidator` — `validate_header_against_parent` を持つ trait。`EthBeaconConsensus` がこれを impl。
- `EthBeaconConsensus` — Reth の production post-merge header validator。
- `SealedHeader` — `(Header, hash)` ペア。

変更された import 2 つ: `HeaderProvider` (`sealed_header_by_hash` 用)、`Arc` (chain spec を共有するため)。

次に struct が 2 つフィールドを増やす:

```rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,                          // NEW
    validator: EthBeaconConsensus<ChainSpec>,            // NEW
    state: Mutex<State>,
}
```

そして `new()` が chain spec を受け取るように広がる:

```rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            state: Mutex::new(State::default()),
        }
    }

    #[must_use]
    pub fn chain_spec(&self) -> &Arc<ChainSpec> {
        &self.chain_spec
    }
}
```

`State` は変わらず — 同じ `next_payload_id`、`pending`、`chain`、`head`。

`chain_spec()` accessor を追加するのは、テストと将来の production caller が欲しがるから (例: ある高さで active な hardfork を chain spec に尋ねる)。`&Arc<ChainSpec>` 経由で expose し、caller が自分の参照を持ちたければ clone できる。

### Step 4: `P` の trait bound を拡張

`impl` ブロックの `where` 句がもう 1 個 bound を増やす:

```rust
#[async_trait]
impl<P> ConsensusBridge for LiveRethEvmBridge<P>
where
    P: BlockNumReader + HeaderProvider<Header = Header> + Clone + Sync + 'static,
{
```

`HeaderProvider<Header = Header>` — provider は number だけでなく、full `Header` オブジェクトを serve しなければならない。Associated-type binding `Header = Header` は「provider の Header 型は **我々の** alloy Header 型」と言う。別の Reth バージョンは `HeaderProvider` を別の header 型でパラメータ化する可能性がある (例: Optimism); 我々のは mainnet Ethereum のに制約する。

**`BlockNumReader` は今ある意味冗長** (full header をくれる物は number もくれる)、が明示的に残す理由:
- L12 はちょうど `BlockNumReader` 用に書いた — 残すことが L12→L13 の進行を文書化する
- 将来の caller は number だけ必要なコードパスにより狭い bound を望むかも

### Step 5: `build_payload` をアップグレード — production-shape header

これが load-bearing な変更。新しい `build_payload`:

```rust
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let parent_b256 = B256::from(parent.0);

        // LIVE READ: pull the parent's full sealed header from the real
        // provider so we can copy fields that EthBeaconConsensus will check
        // against during validate_payload (gas_limit drift, EIP-1559 base
        // fee, difficulty=0 post-merge).
        let parent_sealed = self
            .provider
            .sealed_header_by_hash(parent_b256)
            .map_err(|e| BridgeError::Internal(eyre::eyre!("provider error: {e}")))?
            .ok_or_else(|| {
                BridgeError::Rejected(format!("provider has no block with hash {parent_b256}"))
            })?;
        let parent_header = parent_sealed.header();

        let mut s = self.state.lock().expect("state mutex poisoned");
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1);

        // Compute the EIP-1559 base fee for our block via the chain spec —
        // identical math to what EthBeaconConsensus's
        // `validate_against_parent_eip1559_base_fee` will check against.
        let next_base_fee = self
            .chain_spec
            .next_block_base_fee(parent_header, our_timestamp);

        let header = Header {
            parent_hash: parent_b256,
            number: parent_header.number + 1,
            // Timestamp must be strictly greater than parent's; force at least
            // parent.timestamp + 1 even if attrs.timestamp came in stale.
            timestamp: our_timestamp,
            beneficiary: Address::from(attrs.fee_recipient),
            mix_hash: B256::from(attrs.prev_randao),
            // Keep gas_limit identical to parent so EthBeaconConsensus's
            // 1/1024 drift check passes trivially. A real payload builder
            // would tune this per network policy.
            gas_limit: parent_header.gas_limit,
            // Post-merge: difficulty must be 0.
            difficulty: alloy_primitives::U256::ZERO,
            base_fee_per_gas: next_base_fee,
            ..Default::default()
        };
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header));
        Ok(PayloadId(id))
    }
```

L12 からの 3 つの変更:

1. **`block_number` ではなく `sealed_header_by_hash`。** 今 full parent header が必要、number だけではない。Error マッピングは同じ: `Err(provider_err)` → `Internal`、`Ok(None)` → `Rejected`。

2. **`our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1)`。** Timestamp は厳密に monotonic でなければならない。Engine が `attrs.timestamp = 5` と `parent.timestamp = 100` を渡したら、`101` (parent + 1) を使う。これが古い clock データが `validate_payload` を即座に fail させるのを防ぐ。

3. **Header 構築に 4 つの慎重に選ばれたフィールド** が増えた (L12 から):
   - `gas_limit = parent_header.gas_limit` — コピーすることで 1/1024 drift check が自明に満たされる。
   - `difficulty = U256::ZERO` — post-merge invariant。非ゼロ値はすべて validator を fail させる。
   - `base_fee_per_gas = next_base_fee` — `chain_spec.next_block_base_fee(...)` で計算、validator が使うのと **同じヘルパー**。
   - `..Default::default()` — 他すべて (gas_used、transactions_root など) はゼロのまま。将来 stage のフル実行検証では意味があるが、header-against-parent ではない。

> 🛑 **やりがちな勘違い。** 「なぜ build は EIP-1559 数式を inline でやらず `chain_spec.next_block_base_fee(parent, timestamp)` を呼ぶ?」 **Validator が **同じ** call をするから。** 数式を手書きしたら、公式が変わるたびに自分の impl を Reth のと sync しなければならない (変わる — Cancun は `BASE_FEE_MAX_CHANGE_DENOMINATOR` を変えた、将来の fork も微調整する)。**Chain spec のヘルパーを呼ぶことで、自分の builder は永遠に validator と合意することが保証される — chain spec が知っていて自分の builder が知らない hardfork も含めて。**

### Step 6: `validate_payload` を rewrite

もう一つの load-bearing な変更。Stub を次で置き換える:

```rust
    async fn validate_payload(
        &self,
        block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        let block_hash = B256::from(block.hash.0);
        let parent_hash = B256::from(block.parent_hash.0);

        // Find our header for this block. In single-validator mode we always
        // built it, so it sits in pending (pre-commit) or chain (post-commit).
        let header = {
            let s = self.state.lock().expect("state mutex poisoned");
            s.pending
                .values()
                .find(|(h, _)| *h == block_hash)
                .map(|(_, h)| h.clone())
                .or_else(|| s.chain.get(&block_hash).cloned())
        };
        let Some(header) = header else {
            return Ok(PayloadStatus::Invalid);
        };

        // Fetch parent sealed header from the LIVE provider.
        let Some(parent_sealed) = self
            .provider
            .sealed_header_by_hash(parent_hash)
            .map_err(|e| BridgeError::Internal(eyre::eyre!("provider error: {e}")))?
        else {
            return Ok(PayloadStatus::Invalid);
        };

        // Run Reth's real header validator. EthBeaconConsensus checks number
        // monotonicity, timestamp monotonicity, gas-limit drift, base-fee.
        let our_sealed = SealedHeader::new(header, block_hash);
        match self
            .validator
            .validate_header_against_parent(&our_sealed, &parent_sealed)
        {
            Ok(()) => Ok(PayloadStatus::Valid),
            Err(_) => Ok(PayloadStatus::Invalid),
        }
    }
```

4 フェーズ:

1. **Header lookup** — `block.hash` 用の自分の header を `pending` (just-built) または `chain` (already-committed) で見つける。見つからなければ → `Invalid`。Single-validator モードでは、validate するすべての block は **我々が** build したものなので、それら 2 つの map のどちらかにある。
2. **Parent lookup via live provider** — `sealed_header_by_hash(parent_hash)`。見つからなければ → `Invalid`。Provider が error なら → `BridgeError::Internal`。
3. **`SealedHeader` で wrap** — `SealedHeader::new(header, block_hash)` が header と hash を再計算なしでペアにする。
4. **Validator を走らせる** — `validator.validate_header_against_parent(&our_sealed, &parent_sealed)` は `Result<(), ConsensusError>` を返す。`Ok(())` → `PayloadStatus::Valid`、任意の `Err(_)` → `PayloadStatus::Invalid` にマップ。

**Reth が内部で走らせる 4 つの sub-check** (自分で書く必要はないが、知っておく価値あり):
- `validate_against_parent_hash_number` — block.number == parent.number + 1
- `validate_against_parent_timestamp` — header.timestamp > parent.timestamp
- `validate_against_parent_gas_limit` — gas_limit が parent から 1/1024 以内
- `validate_against_parent_eip1559_base_fee` — base_fee_per_gas が EIP-1559 公式に一致

どれかが fail すると、validator は `Err(...)` を返す。特定の error は伝播しない — この層では engine は「valid か否か」を知るだけでよい。将来のデバッグでは error 型をログできる。

> 🛑 **やりがちな勘違い。** 「なぜ `Err(_)` を `PayloadStatus::Invalid` にマップして `BridgeError::Internal` ではない?」 **Validation 失敗は protocol レベルのシグナルで、運用失敗ではないから。** 「この block はルールを満たさない」は validator が **そのために存在する** こと — 答えであって crash ではない。`BridgeError::Internal` は上に伝播して engine app loop を kill する。`PayloadStatus::Invalid` は engine を継続させ、block を拒否された proposal として扱う。**Error の型を会話レベルに合わせる。**

### Step 7: テスト更新 — 2 個の新規 assertion

テストは新しい bridge constructor 呼び出し (今は chain_spec を取る) と 2 個の `validate_payload` assertion を得る:

```rust
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn live_bridge_builds_on_real_genesis() {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        let NodeHandle {
            node,
            node_exit_future: _,
        } = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .node(EthereumNode::default())
            .launch_with_debug_capabilities()
            .await
            .expect("launch failed");

        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no block 0 (genesis)");

        // CHANGED: bridge takes chain_spec now (wires up EthBeaconConsensus).
        let bridge = LiveRethEvmBridge::new(node.provider.clone(), chain_spec.clone());

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

        assert_eq!(block.parent_hash, BlockHash(genesis_hash_b256.0));
        assert_eq!(block.number, 1);

        // NEW: validate_payload runs EthBeaconConsensus against the live parent.
        let status = bridge
            .validate_payload(&block)
            .await
            .expect("validate_payload failed");
        assert_eq!(status, PayloadStatus::Valid);

        // NEW: unknown block hash → Invalid (we have no header to validate).
        let unknown_block = ExecutedBlock {
            hash: BlockHash([0xddu8; 32]),
            parent_hash: BlockHash(genesis_hash_b256.0),
            number: 1,
            state_root: [0u8; 32],
        };
        let status = bridge
            .validate_payload(&unknown_block)
            .await
            .expect("validate_payload failed");
        assert_eq!(status, PayloadStatus::Invalid);

        // (L12 からの negative case は変わらず。)
        let fake_parent = BlockHash([0xeeu8; 32]);
        let err = bridge.build_payload(fake_parent, attrs).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
```

2 個の新規ブロック:

- **`build_payload` 後の `validate_payload(&block)`** — 今 build した block は validate されなければならない。**これが load-bearing な assertion** — build と validate がルールに合意していることを証明する。EIP-1559 公式を間違えたら、difficulty が非ゼロだったら、gas_limit が drift したら、これは fail する。
- **`validate_payload(&unknown_block)`** — hash が pending/chain にない block は `Invalid` を返す。Lookup fallthrough をテスト。

## テスト

```bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
```

~30 秒後 (コンパイル + test):

```
running 1 test
test live_node::tests::live_bridge_builds_on_real_genesis ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Test runtime: 依然 ~2.4 秒 — Reth bootstrap が支配的、`validate_payload` は < 1ms を追加。

Full suite:

```bash
cargo test
```

…workspace 全体 37 個合格するはず (テスト数は変わらず — 既存テストが assertion を増やしただけ)。

よくあるエラーと対処:

- **`assert_eq!(status, PayloadStatus::Valid)` が fail** — 最も多い問題。`build_payload` が `EthBeaconConsensus` が拒否する header を produce している。可能性のある原因:
  - `difficulty: U256::ZERO` を忘れた — デフォルトは非ゼロ、post-merge check が fail。
  - `gas_limit: parent_header.gas_limit` を忘れた — デフォルトはゼロ、parent から 1/1024 以上 drift。
  - base_fee 計算間違い — `chain_spec.next_block_base_fee(parent, timestamp)` を使うべき。
  - Timestamp が parent より厳密に大きくない — `our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1)` を強制すべき。
- **`error[E0277]: HeaderProvider not satisfied`** — workspace の `reth-storage-api` SHA が `reth-provider` と一致しない。すべての reth-* git-pin dep は同じ SHA を共有しなければならない。
- **`error[E0277]: HeaderValidator is not in scope`** — `use reth_consensus::HeaderValidator` を忘れた。Trait はメソッドを呼ぶために scope に入っている必要がある。
- **`error: 'next_block_base_fee' not found on ChainSpec`** — `use reth_chainspec::EthChainSpec` を忘れた。`next_block_base_fee` は `ChainSpec` 自体ではなく `EthChainSpec` 拡張 trait 上にある。

## 設計の振り返り

3 つの load-bearing な決定:

1. **builder と validator が source of truth を共有する。** `ChainSpec::next_block_base_fee` が次 block の base fee を build するもの; `EthBeaconConsensus::validate_against_parent_eip1559_base_fee` が同じヘルパーを呼んで check する。**重複した数式なし、hardfork 間の drift リスクなし。** これは build/validate ペアがあるたびにコピーするパターン。

2. **validator の error は `Invalid` になり、伝播しない。** Validator が「いいえ、これは malformed」と答えるのは crash ではなく **通常** パス。その `Err(_)` を `PayloadStatus::Invalid` にマップすると engine は走り続け、次の proposal を選べる。運用失敗 (DB error) は依然 `BridgeError::Internal` 経由でエスカレート。

3. **`P` の trait bound は incrementally 広がる。** L12 は `BlockNumReader` が必要だった; L13 は `BlockNumReader + HeaderProvider` が必要。各レッスンが新しい capability surface を露出する。**Trait bound は spec — 自分の implementation が何を要求するかを consumer に正確に伝える。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 0844d58
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

`0844d58` の参照には `live_node.rs` に L12 から ~141 行の変更が含まれる。新しい struct フィールド、アップグレードされた `build_payload`、rewrite された `validate_payload`、新しい test assertion は厳密に一致するべき。Doc コメントの言い回しは個人差可。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜ 4 つの sub-check (`validate_against_parent_hash_number` など) を手動で走らせない?**
できる — すべて `EthBeaconConsensus` 上で `pub`。だが `validate_header_against_parent` は 4 つを順序に走らせ、正しい引数形と適切な short-circuiting を提供する。**Orchestration を再実装することは、trait メソッドが防ぐためにある error-prone な仕事。** ボーナス: 将来の Reth バージョンが 5 つ目の check を追加するかもしれない; orchestrating method を呼ぶことで無料で拾える。

**Q: `SealedHeader::new(header, hash)` は tuple として保持するのと何が違う?**
キャッシュ。`SealedHeader` は hash を保存するので、後続の `.hash()` 呼び出しが再計算しない (Keccak over ~500 bytes — 高 block rate では意味がある)。Tuple は再計算を強制する。**ネットワーク端でしばらく重要になる最適化** — 毎秒数千 block を処理する場所; 我々の test ではマイクロ秒の節約。

**Q: なぜテストは `dev_chain_spec()` が `Arc<ChainSpec>` を返すのに `chain_spec.clone()` を使う?**
`Arc<T>` を clone すると refcount を increment する; 下位の `ChainSpec` データはコピーしない。3 つの参照が必要: 1 つは `NodeConfig` 内、1 つは `LiveRethEvmBridge::new` に渡す、1 つは将来の用途用。各 `.clone()` は atomic increment だけ — ナノ秒単位。

**Q: `dev_chain_spec()` ではなく `chain_spec: Arc::new(ChainSpec::default())` を渡すと何が起きる?**
Validator と chain がどの hardfork が active か合意しない。`ChainSpec::default()` は最小限の Ethereum mainnet shape; live node は `dev_chain_spec()` (chainId 2600、すべての fork が 0) で構築された。Validator が内部で走らせる `EthChainSpec::is_fork_active_at_timestamp(...)` check で発散する。**同じ chain_spec を node と bridge の両方に渡す** — それが contract。

## 次のレッスン (L14)

4 つの `ConsensusBridge` メソッドのうち 2 つは live Reth に当たる。**3 つ目 — `commit` — はまだ in-process `chain: HashMap` に hash を記録している。** L14 (最後の大レッスン) でこれを real **Engine API forkchoice update** に置き換える、Reth が production で block を commit するために使う JSON-RPC call。L14 完了後、我々の bridge は他のどの Ethereum CL client (Lighthouse、Prysm、Teku) も produce する同じ wire-format アクションを produce する。**L15 がそれから capstone** — 1 ページの再キャップ、「構築したすべて」図、optional な production-readiness チェックリスト (block bodies、gossip codec、real WAL)。
````

---

## Seed ファイルスロット

L13 は Module 6 (Live Reth) sortOrder 2 に入る:

```typescript
{
  title: 'レッスン 13 — validate_payload が Reth の EthBeaconConsensus を走らせる',
  slug: 'openhl-validate-payload-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 55,
  xpReward: 100,
  content: `# レッスン 13 — \`validate_payload\` が Reth の \`EthBeaconConsensus\` を走らせる\n\n...`
},
```

## SHA pinning 規律

L13 が参照する openhl コミット (§答え合わせ):
- `0844d58` (Stage 7c — validate_payload が Reth の EthBeaconConsensus を走らせる)

これは production validation ルールが builder に誠実さを強制する最初のコミット。

## 翻訳セルフレビュー (paste 前)

- **「producer-consumer self-consistency」「load-bearing」** は専門語として英語のまま保持。
- **「source of truth」「source-of-truth」** はそのまま (DDD/データエンジ慣用)。
- **「short-circuiting」「orchestration」「fallthrough」** はそのまま (専門語)。
- **「monotonicity」「monotonic」** はそのまま (数学/CS 慣用)。
- **「予測してみよう」「やりがちな勘違い」** は L4-L12 で確立した訳語と統一。
- **タイトル/コードコメントは英語のまま** (OSS 実装にコピーされる前提)。
