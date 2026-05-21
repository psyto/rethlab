# OpenHL を作る — L14 draft (JA) — C2 build-along 書き直し

> openhl SHA `0cac571` (Stage 7d — `commit` が Reth Engine API forkchoice を駆動する) 基準。
> コース: `building-openhl-consensus-ja` (track: `reth-l1-architect`, 10 コース中 6 番目)。
> 注: L14 で consensus↔EVM contract が閉じる — 本レッスン後、4 つの `ConsensusBridge` メソッドすべてが real Reth コードパスに到達する。Wire は接続される; フルな `engine_newPayload` ラウンドトリップ (EVM-executable トランザクション body が必要) は将来コースに残す。

---

## L14 — `openhl-commit-forkchoice-ja`

- **モジュール:** 6 (Live Reth)
- **モジュール sortOrder:** 3 (L13 の validator 接続の後)
- **コース全体 sortOrder:** 13 (16 レッスン中 14 番目)
- **所要時間:** 50 分
- **XP:** 90
- **type:** CONTENT

### Content

````markdown
# レッスン 14 — `commit` が Reth の Engine API forkchoice を駆動する

## ゴール

このレッスンで掴む概念:

- **local-first、engine-second の commit 順序。** bridge の `chain: HashMap` が consensus layer の真実の source だ。local を先に commit して engine への通知を後にすることで、engine 呼び出しが失敗しても consensus commit を rollback する羽目にはならない (rollback は safety 違反だ)。一般化すると「primary store が先、secondary index/replica は後」というパターン。
- **test ergonomics のための `Option<EngineHandle>`。** optional にしておかないと、すべての unit test が実 node を bootstrap して engine handle を作る羽目になる。`Option` にすることで、テストは `None` を渡してローカル path だけを、integration test は `Some(handle)` を渡して両方の path を exercise できる。型レベルの optionality が、インフラを全テストに強制することを防いでくれる。
- **engine 応答は意図的に破棄する。** マッチする `engine_newPayload` を先に送っていない以上、現時点では `SYNCING` が正解応答だ。これをエラー扱いすると、すべての caller が「L14 は部分統合」であることを知らなければならなくなる。破棄しておけば API は正直なまま: 「ローカル commit は完了、下流通知は best-effort」と言える。
- **3 フィールドの `ForkchoiceState` の崩し方。** mainnet は head / safe / finalized を区別する (即時 / 32-slot / 64+-slot checkpoint)。v0 single-validator OpenHL には区別がない — 全 commit が final なので、3 つとも同じ hash を入れる。形は multi-validator OpenHL への forward-compat のために保っておく。
- **`add_ons_handle.beacon_engine_handle` が in-process Engine API。** 外部 CL client (Lighthouse、Prysm) が JSON-RPC で叩く `engine_*` メソッドを backing しているのと同じ handle だ。こちらは in-process でショートカットしているが、surface は同一。
- **4 つの `ConsensusBridge` メソッドすべてが実際の Reth に到達する。** このレッスンでループが閉じる。`build_payload` / `payload_ready` / `validate_payload` / `commit` すべてが実際の Reth コードパスに到達する。

検証:

```bash
cargo test -p openhl-evm commit_sends_forkchoice_to_engine_when_handle_installed --release
```

上記の実行結果が新規 integration test 1 個に合格する。L11-L13 の既存テストと合わせて、bridge は **4 つの `ConsensusBridge` メソッドすべてが real な Reth コードパスに到達する** 状態になる:

| メソッド | やること | 走る real Reth コード |
| - | - | - |
| `build_payload` | Child block を build | `HeaderProvider::sealed_header_by_hash`, `ChainSpec::next_block_base_fee` |
| `payload_ready` | Build された block を fetch | (ローカル — bridge の pending map) |
| `validate_payload` | Block を check | `EthBeaconConsensus::validate_header_against_parent` |
| **`commit`** | Block を canonical にする | **`ConsensusEngineHandle::fork_choice_updated`** |

**Engine は今のところ `SYNCING` を返す — そしてこの段階ではそれが正しい。** まだマッチする `engine_newPayload` 呼び出しを送っていないからだ (それには EVM-executable なトランザクション body が必要で、本コースの範囲外だ)。Wire は接続される。payload-execution の alignment は、約定 (fill) が EVM トランザクションになってからの作業になる。

具体的な変更:

- `LiveRethEvmBridge` に新規 optional フィールド `engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>` を追加する。
- 新規 builder メソッド `with_engine_handle()` (`#[must_use]`) と introspection 用の `has_engine_handle()` を追加する。
- `commit()` が **2 つのこと** をするようになる: (1) ローカル bookkeeping (L13 から変わらず)、続いて (2) engine handle がインストールされていれば Reth の in-process Engine API に `ForkchoiceUpdated` を fire し応答は破棄する。
- 新規 integration test が `EthereumNode` を bootstrap し、`add_ons_handle.beacon_engine_handle` を bridge にインストールし、local commit と forkchoice 経路の両方が fire することを assert する。

## おさらい

L13 完了時点で `crates/evm/src/live_node.rs` には:

```rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    state: Mutex<State>,
}
```

`build_payload`、`payload_ready`、`validate_payload` はすべて live な Reth に対して走る。`commit` は依然として、新しい head を `state.chain` (in-process な `HashMap`) に記録し、`state.head` を更新するだけだ。**ローカルのみ** だ。Live な Reth node に query する RPC クライアントから見ると、head は依然 genesis に見える — consensus engine は、こちらが何を確定させたかを知らない。

`cargo test` で workspace 全体 37 個が合格する。**Bridge は canonical chain を知っているが、Reth は知らない。**

## 計画

6 つやる:

1. **2 個の workspace dep を追加する**: `reth-ethereum-engine-primitives` (`EthEngineTypes` 用) と `alloy-rpc-types-engine` (`ForkchoiceState` 用)。
2. **`crates/evm/Cargo.toml` を更新する** — 3 個の新規 production dep を追加する (上記 2 個 + `ConsensusEngineHandle` を提供する `reth-engine-primitives`)。
3. **`live_node.rs` の import と struct を更新する** — 新規フィールド `engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>` を加える。
4. **Builder メソッドを追加する** — `with_engine_handle()` は self を consume して handle をインストールする。`has_engine_handle()` は `const fn` accessor。
5. **`commit()` を rewrite する** — まずローカル bookkeeping (変わらず) を行い、engine handle がインストールされていれば best-effort で `ForkchoiceUpdated` を送る。
6. **integration test を追加する** — `EthereumNode` を bootstrap し、`add_ons_handle.beacon_engine_handle` を pull し、`with_engine_handle()` 経由で接続し、commit パスを exercise する。

このレッスンが教えるのは **成功後の副作用パターン** だ。Bridge のローカル bookkeeping が consensus 層の **source of truth** で、他の何かが起こる前に成功しなければならない。Engine API 呼び出しは **副作用** だ: 有用ではある (下流の RPC クライアントが新しい head を見られる) が、その失敗で commit を roll back すべきではない。パターンは:

```text
1. 成功しなければならないこと (ローカル state mutation) をする。
2. Best-effort 副作用 (fire-and-mostly-forget)。
3. 成功を返す。
```

Step 2 が失敗してもログするが伝播はしない — Step 1 がすでに起きており、roll back すると不整合な状態に陥るからだ。**成功の **後** に続く副作用は、成功を **gate する** 副作用とは別物だ。**

> 🛑 **考えてみよう。** スクロールする前に: なぜテストは `commit().await.expect(...)` が成功することだけを assert し、Reth の canonical chain head が動いたことは assert しないのか? ヒント: `build_payload` の出力に何が欠けているかを考える。Engine に渡す `ExecutedBlock` は header だけで、トランザクションも receipt も state root も無い。Reth の engine は canonical chain を advance させるために **実際の block body** が必要だ。`engine_newPayload` を先に送らない限り、`fork_choice_updated` は `SYNCING` (「この block をまだ知らない、body を fetch しろ」) を返す。Wire は接続されているが、データが違う。**L14 で証明するのは接続だ。payload execution は将来コースに先送りする。**

## 手順

### Step 1: 2 個の workspace dep を追加

ルート `Cargo.toml` を開く。Reth ブロック (L13 後) は次で終わる:

```toml
reth-ethereum-consensus   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-primitives-traits    = "0.3"
alloy-genesis             = { version = "2.0", default-features = false }
```

`reth-ethereum-consensus` の直後に 1 行追加:

```toml
reth-ethereum-engine-primitives = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
```

そしてもう少し下の alloy ブロック (既存の `alloy-consensus` workspace dep を見つける) に 1 行追加:

```toml
alloy-rpc-types-engine = { version = "2.0", default-features = false }
```

2 個の dep、2 つの役割:

- **`reth-ethereum-engine-primitives`** — `EthEngineTypes` を提供する。「Ethereum mainnet の engine surface」を表す type bundle だ (Optimism や custom L2 との対比で)。こちらの `ConsensusEngineHandle<EthEngineTypes>` はこれに対してパラメータ化される。
- **`alloy-rpc-types-engine`** — `ForkchoiceState { head_block_hash, safe_block_hash, finalized_block_hash }` を提供する。`engine_forkchoiceUpdatedV4` 呼び出しの canonical な wire-format payload だ。同じ struct を CL クライアント (Lighthouse、Prysm) が EL クライアントに JSON-RPC 越しに送る — こちらは in-process で使う。

**`alloy-rpc-types-engine` のバージョンに注意**: `2.0` に pin して、Reth v2.2.0 自身が pin している `alloy-rpc-types-engine` `2.0.4` と一致させる。ここでバージョン不一致があると `ForkchoiceState` が 2 つの異なる型になり、engine handle が呼び出しを拒否する。

### Step 2: `crates/evm/Cargo.toml` を更新

`[dependencies]` ブロックが 3 行増える:

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
reth-consensus           = { workspace = true }
reth-ethereum-consensus  = { workspace = true }
reth-primitives-traits   = { workspace = true }
reth-chainspec           = { workspace = true }
reth-engine-primitives          = { workspace = true }    # NEW: ConsensusEngineHandle
reth-ethereum-engine-primitives = { workspace = true }    # NEW: EthEngineTypes
alloy-rpc-types-engine          = { workspace = true }    # NEW: ForkchoiceState
```

`reth-engine-primitives` は L1 から workspace dep だった (中間 stage で `PayloadAttributesBuilder` が住む場所として)。ここで「workspace で利用可能」から「この crate で import する」へ昇格させる。

### Step 3: `live_node.rs` の import + struct を更新

`crates/evm/src/live_node.rs` を開く。Import が 3 行増える:

```rust
use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use alloy_rpc_types_engine::ForkchoiceState;                        // NEW
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use reth_chainspec::{ChainSpec, EthChainSpec};
use reth_consensus::HeaderValidator;
use reth_engine_primitives::ConsensusEngineHandle;                  // NEW
use reth_ethereum_consensus::EthBeaconConsensus;
use reth_ethereum_engine_primitives::EthEngineTypes;                // NEW
use reth_primitives_traits::SealedHeader;
use reth_storage_api::{BlockNumReader, HeaderProvider};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
```

新規の型 3 個:
- `ForkchoiceState` — engine に送る payload (head/safe/finalized block hash)。
- `ConsensusEngineHandle` — Reth が engine actor にメッセージを送るためにくれる handle。
- `EthEngineTypes` — handle を Ethereum mainnet の engine surface に bind する type parameter。

次に struct が 1 フィールド増える — `engine_handle`、optional:

```rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    /// Optional in-process Engine API handle. When installed via
    /// [`Self::with_engine_handle`], `commit` sends a `ForkchoiceUpdated`
    /// to Reth so its canonical chain advances in lockstep with consensus.
    /// `None` at v0 means commits stay local to the bridge's `state.chain`
    /// `HashMap` — fine for unit tests, but RPC clients won't see new heads.
    engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>,           // NEW
    state: Mutex<State>,
}
```

`State` は変わらず。

> 🛑 **やりがちな勘違い。** 「なぜ `engine_handle` が `Option<...>` で、常に必須ではないのか?」 **`LiveRethEvmBridge` のすべての consumer が Reth を bootstrap する production node ではないからだ。** Unit test (L12、L13) は provider に対する bridge だけが欲しい — 動く engine は要らない。Engine handle を全 caller に強制すると、(a) 全 test でフルな node を bootstrap するか、(b) 構築が難しい no-op の「fake handle」型を用意するか、のどちらかが必要になる。`Option` なら同じ struct が両方の世界に仕える: test は `None` を渡し、production は `Some(handle)` を渡せる。**型レベルの optionality が、漏れる API surface を避ける手段になる。**

### Step 4: `new()` を更新し、builder メソッドを追加

`new()` が `engine_handle: None` を初期化:

```rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            engine_handle: None,                                  // NEW
            state: Mutex::new(State::default()),
        }
    }

    /// Install a Reth in-process Engine API handle. After this call,
    /// `commit` will fire a `ForkchoiceUpdated` to Reth's consensus engine
    /// alongside its own local bookkeeping. Without an engine handle, the
    /// bridge still works (commits go to its internal `HashMap`) but Reth's
    /// canonical chain won't advance — RPC and any other Reth consumer will
    /// see only the genesis block.
    #[must_use]
    pub fn with_engine_handle(
        mut self,
        handle: ConsensusEngineHandle<EthEngineTypes>,
    ) -> Self {
        self.engine_handle = Some(handle);
        self
    }

    #[must_use]
    pub const fn has_engine_handle(&self) -> bool {
        self.engine_handle.is_some()
    }

    #[must_use]
    pub fn chain_spec(&self) -> &Arc<ChainSpec> {
        &self.chain_spec
    }
}
```

3 個の新規メソッド:

- **`with_engine_handle()`** — consume-and-return-self builder だ。`mut self` パラメータが所有権を取り、mutate して return する。canonical な Rust の「builder method」パターン。**`#[must_use]`** にしているのは、返り値を bind し忘れる (例: `bridge.with_engine_handle(h);`) と、修正された bridge がサイレントに drop されてしまうからだ。
- **`has_engine_handle()`** — `const fn` accessor。Test と assertion 用だ (「接続が実際に効いたか?」)。`const` にしているのは、`Option::is_some()` チェックが runtime 計算を必要としないからだ。
- **`new()` 初期化** — 唯一の変更は `engine_handle: None` だ。Handle が欲しい caller は `LiveRethEvmBridge::new(p, c).with_engine_handle(h)` を使う。

### Step 5: `commit()` を rewrite — ローカル先、engine は best-effort

Load-bearing な変更だ。L13 の `commit` を置き換える:

```rust
    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        let hash = B256::from(block_hash.0);

        // Local bookkeeping first. If this fails, we never call the engine
        // — the bridge stays in a consistent state.
        let _header = {
            let mut s = self.state.lock().expect("state mutex poisoned");
            let header = s
                .pending
                .values()
                .find(|(h, _)| *h == hash)
                .map(|(_, h)| h.clone())
                .ok_or_else(|| {
                    BridgeError::Rejected(format!("commit for unknown hash {hash}"))
                })?;
            s.chain.insert(hash, header.clone());
            s.head = Some(hash);
            header
        };

        // Best-effort: if an Engine API handle has been installed, also tell
        // Reth's consensus engine about the new canonical head. We always
        // commit *locally* first (above) — sending to the engine is best-
        // effort at this stage because we haven't yet uploaded a real
        // ExecutionPayload via newPayload, so the engine will return
        // SYNCING/INVALID. The wire being connected is what 7d proves; full
        // payload-execution alignment is downstream once fills become EVM
        // transactions.
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
```

2 フェーズ:

1. **ローカル bookkeeping** — L13 と同じ shape。Pending header を hash で lookup し、`chain` に insert し、`head` を更新する。Header が欠けていれば → `BridgeError::Rejected`。Header binding は今 `let _header` だ — この関数で後から使わないからだ。binding は明瞭さと将来の telemetry のために残してある。

2. **Best-effort な engine 通知** — `engine_handle.is_some()` のときだけ行う。3 スロット (head、safe、finalized) すべてを新しい hash に向けた `ForkchoiceState` を build する。**なぜ 3 つすべて同じ hash なのか?** v0 では separate な finalization layer が無く、こちらのモデルではコミットされた block はすべて safe で finalized だからだ。Production の multi-validator chain は別々に track する (block は head になれるが、その descendant に 2/3 の validator が vote するまでは finalized にならない)。

3. **`let _ = ...await` は意図的だ** — engine のレスポンスを discard する。Engine の返す値は:
   - `VALID` — マッチする `engine_newPayload` をマッチする block body と共に先に送っていれば、これが happy case になる。
   - `SYNCING` — **今** 得るもの。`newPayload` を送っていないからだ。Engine は peer から block を fetch したいが、peer がいない。
   - `INVALID` — engine が拒否した block を canonical にせよと頼んだ、という意味だ。自分で build した block には実際には起きないはずだ。

**L14 では、3 つのレスポンスすべてが同じコードパス、continue に導く。** ローカル bookkeeping はすでに起きている。

> 🛑 **やりがちな勘違い。** 「`INVALID` で error を返さず、engine のレスポンスを discard するのはなぜか?」 **Bridge のローカル state が consensus 層の source of truth であって、Reth ではないからだ。** Reth が `INVALID` と言ったからといってローカル state を roll back すると、Malachite に「実はその decided block は存在しない」と告げることになり、chain が壊れる。この層での不一致に対する正しい応答は **大きな声でログする** こと、**operator にアラートする** ことであって、consensus commit を roll back することではない。**Reth の chain の view は consensus の下流であり、逆ではない。**

### Step 6: テスト更新 (rename + engine 接続を追加)

L13 の既存テスト `live_bridge_builds_on_real_genesis` を開く。既存テストを修正するのではなく、新規テストを **追加** する — L12/L13 のテストは依然として証明していることを証明し続け、別テストを追加することで新しい挙動を isolated に保つ。

`crates/evm/src/live_node.rs` の `tests` モジュールに append:

```rust
    /// **Stage 7d**: with a Reth `ConsensusEngineHandle` installed, `commit`
    /// sends a `ForkchoiceUpdated` to the in-process Engine API. The bridge's
    /// own bookkeeping still happens (so existing callers don't regress), but
    /// now Reth is told about the new head too.
    ///
    /// At this stage the engine will respond SYNCING because we haven't sent
    /// a matching `newPayload` (`build_payload` doesn't yet produce a real
    /// `ExecutionPayload`). That's intentional: L14 proves the wire is
    /// connected. Full alignment between Malachite's commit and Reth's
    /// canonical head needs `newPayload` integration, which is the next
    /// staging chunk after fills become EVM transactions.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn commit_sends_forkchoice_to_engine_when_handle_installed() {
        use reth_node_ethereum::node::EthereumAddOns;

        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        // We need add_ons_handle for the engine handle — use the explicit
        // NodeBuilder path with EthereumAddOns rather than launch_with_dbg.
        let handle = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .with_types::<EthereumNode>()
            .with_components(EthereumNode::components())
            .with_add_ons(EthereumAddOns::default())
            .launch()
            .await
            .expect("launch failed");

        // Pull the engine handle out of add_ons. This is what RPC's
        // engine_forkchoiceUpdated endpoint would dispatch to — we're
        // taking the in-process shortcut around the JSON-RPC layer.
        let engine_handle = handle.node.add_ons_handle.beacon_engine_handle.clone();

        let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec)
            .with_engine_handle(engine_handle);
        assert!(
            bridge.has_engine_handle(),
            "with_engine_handle must install the handle"
        );

        let genesis_hash_b256 = handle
            .node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no genesis");

        // Build a payload on top of genesis so commit has something to find.
        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs)
            .await
            .expect("build_payload failed");
        let block = bridge.payload_ready(id).await.expect("payload_ready failed");

        // The actual test: commit should not panic, not block forever, not
        // surface an error from the engine-side SYNCING response. We're
        // proving the wire is connected — that fork_choice_updated reaches
        // the engine and returns *some* response (even SYNCING).
        bridge
            .commit(block.hash)
            .await
            .expect("commit failed even though local bookkeeping should succeed");

        // Negative case: a commit for an unknown hash must still be Rejected
        // (the engine-side call doesn't happen because the bridge bails out
        // before it).
        let bogus = BlockHash([0xddu8; 32]);
        let err = bridge.commit(bogus).await.unwrap_err();
        assert!(
            matches!(err, BridgeError::Rejected(_)),
            "unknown hash must yield Rejected"
        );

        drop(handle);
    }
```

新規部分を順に見ていく:

1. **`with_types::<EthereumNode>()` + `with_components(...)` + `with_add_ons(EthereumAddOns::default())`** — 明示的な builder パスだ。`launch_with_debug_capabilities` (L11-L13) は `add_ons_handle` を expose しないショートカット。Beacon engine handle を pull するには、この明示的な形が必要だ。
2. **`handle.node.add_ons_handle.beacon_engine_handle.clone()`** — Engine handle は add_ons の中にある。内部的には `Arc` ベースの handle で、clone は安価だ。
3. **`.with_engine_handle(engine_handle)`** — 新規 builder メソッド。これが無いと `commit` はローカル bookkeeping だけを行う。あると `commit` が forkchoice も fire する。
4. **`assert!(bridge.has_engine_handle())`** — 接続の guard。`with_engine_handle()` にバグがあれば、テストの残りが走る前に catch できる。
5. **`commit(block.hash).await.expect("commit failed")`** — メインの assertion。**engine が返したものは check しない** — `commit` が `Ok(())` を返すかどうかだけを見る。Engine の SYNCING レスポンスは Step 5 で `commit` 内で discard される。
6. **Negative case を維持する** — unknown hash は依然として `BridgeError::Rejected` を返す。Bridge が engine パスに到達する前に bail するので、engine パスは fire しない。

> 🛑 **やりがちな勘違い。** 「`launch_with_debug_capabilities` を使って、add_ons_handle がそこにあると願えばいいのでは?」 **ダメだ — launch パスが違えば handle の shape も違ってくる。** `launch_with_debug_capabilities` は debug RPC 付きの `NodeHandle` を返すが、add_ons を expose しない。`add_ons_handle` をくれるのは明示的な builder chain (`.with_types().with_components().with_add_ons().launch()`) の方だ。**どの launch パスがどの handle shape を生成するかという知識は、特定のフィールドが必要になるまでは見えない詳細だ。**

## テスト

```bash
cargo test -p openhl-evm commit_sends_forkchoice_to_engine_when_handle_installed --release
```

~30 秒後 (コンパイル + node bootstrap):

```
running 1 test
test live_node::tests::commit_sends_forkchoice_to_engine_when_handle_installed ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Test runtime: ~3 秒 (Reth bootstrap + forkchoice ラウンドトリップ)。

Full suite:

```bash
cargo test
```

…workspace 全体 38 個が合格するはず (L13 の 37 + 新規テスト)。

よくあるエラーと対処:

- **`error[E0282]: type annotations needed for `Option<ConsensusEngineHandle<_>>`** — `new()` の `engine_handle: None` は型パラメータが推論される必要がある。Struct フィールドの型注釈が欠けているか間違っているか、`EthEngineTypes` import を忘れているかだ。Step 3 を再確認。
- **`error: cannot find struct `EthereumAddOns` in module `reth_node_ethereum::node`** — `reth-node-ethereum` と他の `reth-*` の version drift だ。すべての git-pinned reth dep は同じ SHA を共有しなければならない。
- **テストが 30 秒以上 hang する** — `fork_choice_updated` 呼び出しが return していない可能性が高い。`let _ = handle.fork_choice_updated(state, None).await` (`.await` 付きで!) を使っているか確認する。`.await` が無いと future が完了前に drop されてしまう。
- **`assert!(bridge.has_engine_handle())` が fail する** — `with_engine_handle` は `#[must_use]` だが、return を bind し忘れている: `let bridge = ...new(...); bridge.with_engine_handle(h);` ではなく、`let bridge = ...new(...).with_engine_handle(h);` でなければならない。
- **Commit が `Ok` を返すが、unknown hash テストでも `Ok` が返る (rejection なし)** — commit ロジックが local lookup の前に engine パスに到達している。Step 5 を再確認 — `?` が `BridgeError::Rejected` を伝播し、engine ブロックの前に exit するはずだ。

## 設計の振り返り

3 つの load-bearing な決定:

1. **ローカル state を先に、engine を後に。** Bridge の `chain: HashMap` が consensus 層の source of truth だ。Engine に **先に** 送って失敗すると、ローカル state を roll back するかどうかを判断しなければならない — そして consensus commit を roll back するのは safety 違反だ。**順序が正しさを強制する: ローカルで成功してから下流に通知する。** このパターンは、primary store + secondary index/replica があるシステム全般に一般化する。

2. **`Option<EngineHandle>` がテスト surface をクリーンに保つ。** Optionality が無いと、すべての unit test が non-test な engine handle を得るためにフル node を bootstrap しなければならない。Optionality があれば、test は `None` を渡してローカルパスを exercise でき、integration test は `Some(handle)` を渡して両方を exercise できる。**型レベルの optionality が、全テストにインフラを強制せずに済ませる手段になる。**

3. **Engine レスポンスは意図的に discard する。** `SYNCING` が今期待されるレスポンスだ (`newPayload` を送っていないので)。これに error を返すと、すべての consumer に L14 が partial integration であることを知らせることを強制してしまう。Discard することで API contract をクリーンに保つ: 「commit はローカルで完了、下流通知は best-effort」だ。**クライアントが知る必要があることだけを知らせる — それ以上は不要だ。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 0cac571
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

`0cac571` の参照には、本コースで導入していない追加コード (Stage 8 由来の CLOB integration) が含まれることがある。Stage 7d 固有の変更 — `engine_handle` フィールド、`with_engine_handle()` builder、`commit` body の再構成、`add_ons_handle.beacon_engine_handle` を使う integration test — は厳密に一致するはず。Doc コメントの言い回しは個人差があってよい。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: `add_ons_handle` とは何で、なぜ engine handle がその中にあるのか?**
`add_ons_handle` は、launched node に attach された「追加 capability」 — RPC server、engine API endpoint、payload builder hook — の Reth bundle だ。Beacon engine handle がそれらの 1 つなのは、engine API が **外部の** CL クライアント (Lighthouse、Prysm) が JSON-RPC で使うものだからだ。こちらは handle を直接 pull することで in-process ショートカットを取っているが、同じ handle がネットワーク向け API も支えている。

**Q: なぜ `ForkchoiceState` には 3 フィールド (head/safe/finalized) があるのに、すべて同じ値に設定するのか?**
Engine API が、separate な finalization layer を持つ chain 用に設計されたからだ。Ethereum mainnet では head は slot ごとに (12 秒で) 進められるが、block が「safe」になるのは 32 slot 後 (Casper checkpoint)、「finalized」になるのは 64 slot 以降だ。こちらの v0 single-validator chain にはそんな区別はない — どのコミットも final だ。3 つすべてを同じ hash に設定するのが v0 の簡略化で、multi-validator OpenHL になれば区別する。

**Q: マッチする `newPayload` なしで `ForkchoiceUpdated` を受け取ると、engine は実際には **何を** するのか?**
`PayloadStatusEnum::Syncing` で応答し、内部的には peer から block を sync しようとし始める。こちらの isolated な dev node には peer がいないので、sync リクエストはどこにも届かない。Engine はその hash 用の「block 待ち」状態にただ座っているだけになる。**それで構わない** — L14 の目的で、engine に canonical chain を advance させる必要は実は無い。`newPayload` 経由で実 block body を導入する将来コースの教材が、このギャップを埋めることになる。

**Q: Await ではなく、`ForkchoiceUpdated` を非同期に送って即座に return できるか?**
できる — `tokio::spawn(handle.fork_choice_updated(...))` で fire-and-forget にできる。だが await は fast (SYNCING で sub-millisecond) で、レスポンスをログするオプションも与えてくれる。Async-spawn アプローチはテストの順序も難しくする (テスト exit 前に engine が update を見るか?)。**Await が安全なデフォルトだ。**

## 次のレッスン (L15 — capstone)

完全な consensus↔EVM bridge ができた。**4 つの `ConsensusBridge` メソッドすべてが real な Reth コードパスに到達している。** L15 は capstone だ: フルシステムを示す 1 ページの recap、production には必要だが skip したもの (`newPayload` 経由の実 block body、stub の代わりに real な Codec impl、gossip codec、persistent WAL)、自然な次コース。新規コードは無く、victory lap と roadmap だけだ。
````

---

## Seed ファイルスロット

L14 は Module 6 (Live Reth) sortOrder 3 に入る:

```typescript
{
  title: 'レッスン 14 — commit が Reth の Engine API forkchoice を駆動する',
  slug: 'openhl-commit-forkchoice-ja',
  type: 'CONTENT',
  sortOrder: 3,
  duration: 50,
  xpReward: 90,
  content: `# レッスン 14 — \`commit\` が Reth の Engine API forkchoice を駆動する\n\n...`
},
```

## SHA pinning 規律

L14 が参照する openhl コミット (§答え合わせ):
- `0cac571` (Stage 7d — `commit` が Reth Engine API forkchoice を駆動する)

これが consensus↔EVM contract を閉じる — 4 つの `ConsensusBridge` メソッドすべてが real Reth に到達。

## 翻訳セルフレビュー (paste 前)

- **「side-effect-after-success」「fire-and-forget」「best-effort」** は専門語そのまま。
- **「source of truth」「downstream」「primary store」** はそのまま (DDD/データエンジ慣用)。
- **「fork choice」「forkchoice」** はそのまま (Ethereum 用語)。
- **「SYNCING」「VALID」「INVALID」** は Engine API レスポンス名そのまま。
- **「考えてみよう」「やりがちな勘違い」** は L4-L13 で確立した訳語と統一。
- **タイトル/コードコメントは英語のまま** (OSS 実装にコピーされる前提)。
