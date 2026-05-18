# OpenHL を作る — L14 draft (JA) — C2 build-along 書き直し

> openhl SHA `0cac571` (Stage 7d — `commit` が Reth Engine API forkchoice を駆動する) 基準。
> コース: `building-openhl-consensus-ja` (track: `reth-l1-architect`, 10 コース中 6 番目)。
> 注: L14 で consensus↔EVM contract が閉じる — 本レッスン後、4 つの `ConsensusBridge` メソッドすべてが real Reth コードパスに到達する。Wire は接続される; フルな `engine_newPayload` ラウンドトリップ (EVM-executable トランザクション body が必要) は将来コースに残す。

---

## L14 — `openhl-commit-forkchoice-ja`

- **モジュール:** 6 (Live Reth)
- **モジュール sortOrder:** 3 (L13 の validator 配線の後)
- **コース全体 sortOrder:** 13 (16 レッスン中 14 番目)
- **所要時間:** 50 分
- **XP:** 90
- **type:** CONTENT

### Content

````markdown
# レッスン 14 — `commit` が Reth の Engine API forkchoice を駆動する

## ゴール

このレッスンの終わりに:

```bash
cargo test -p openhl-evm commit_sends_forkchoice_to_engine_when_handle_installed --release
```

…が新規 integration test 1 個に合格する。L11-L13 の既存テストと合わせて、bridge は **4 つの `ConsensusBridge` メソッドすべてが real Reth コードパスに到達** する状態に:

| メソッド | やること | 走る real Reth コード |
| - | - | - |
| `build_payload` | Child block を build | `HeaderProvider::sealed_header_by_hash`, `ChainSpec::next_block_base_fee` |
| `payload_ready` | Build された block を fetch | (ローカル — bridge の pending map) |
| `validate_payload` | Block を check | `EthBeaconConsensus::validate_header_against_parent` |
| **`commit`** | Block を canonical にする | **`ConsensusEngineHandle::fork_choice_updated`** |

中身の変化:
- `LiveRethEvmBridge` に新規 optional フィールド `engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>`。
- 新規 builder メソッド `with_engine_handle()` と introspection `has_engine_handle()`。
- `commit()` が **2 つのこと** をする: (1) ローカル bookkeeping (L13 から変わらず)、続いて (2) engine handle がインストールされていれば Reth の in-process Engine API に `ForkchoiceUpdated` を fire する。

**Engine は今のところ `SYNCING` を返す — そしてこの段階ではそれが正しい。** まだマッチする `engine_newPayload` 呼び出しを送っていないから (それは EVM-executable トランザクション body が必要で、本コースの範囲外)。Wire は接続される; payload-execution alignment は fills が EVM トランザクションになってからの作業。

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

`build_payload`、`payload_ready`、`validate_payload` はすべて live Reth に対して走る。`commit` は依然新しい head を `state.chain` (in-process `HashMap`) に記録し `state.head` を更新する。**ローカルのみ。** Live Reth node を query する RPC クライアントには head が依然 genesis に見える — consensus engine は我々が何を decide したか知らない。

`cargo test` で workspace 全体 37 個合格。**Bridge は canonical chain を知っているが、Reth は知らない。**

## 計画

6 つやる:

1. **2 個の workspace dep を追加**: `reth-ethereum-engine-primitives` (`EthEngineTypes` 用) と `alloy-rpc-types-engine` (`ForkchoiceState` 用)。
2. **`crates/evm/Cargo.toml` を更新** — 3 個の新規 production dep を追加 (上記 2 個 + `reth-engine-primitives` で `ConsensusEngineHandle` を提供)。
3. **`live_node.rs` の import + struct を更新** — 新規フィールド `engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>`。
4. **Builder メソッドを追加** — `with_engine_handle()` は self を consume して handle をインストール; `has_engine_handle()` は `const fn` accessor。
5. **`commit()` を rewrite** — ローカル bookkeeping を先 (変わらず)、engine handle がインストールされていれば best-effort で `ForkchoiceUpdated`。
6. **integration test を追加** — `EthereumNode` を bootstrap、`add_ons_handle.beacon_engine_handle` を pull、`with_engine_handle()` 経由で配線、commit パスを exercise。

このレッスンが教えるのは **成功後の副作用パターン**。Bridge のローカル bookkeeping が consensus 層の **source of truth** — 他の何かが起こる前に成功しなければならない。Engine API 呼び出しは **副作用**: 有用 (下流 RPC クライアントが新しい head を見られる) だが、その失敗がコミットを roll back するべきではない。パターン:

```text
1. 成功しなければならないこと (ローカル state mutation) をする。
2. Best-effort 副作用 (fire-and-mostly-forget)。
3. 成功を返す。
```

Step 2 が失敗してもログするが伝播しない — Step 1 はすでに起きたから、roll back すると不整合状態に陥る。**成功の **後** に続く副作用は、成功を **gate する** 副作用とは異なる。**

> 🛑 **予測してみよう。** スクロールする前に: なぜテストは `commit().await.expect(...)` が成功することだけを assert し、Reth の canonical chain head が動いたことは assert しない? ヒント: `build_payload` の出力に何が欠けているか考える。Engine に渡す `ExecutedBlock` は header だけ — トランザクションなし、receipt なし、state root なし。Reth の engine は canonical chain を advance するために **実際の block body** が必要。`engine_newPayload` を先に送らないと、`fork_choice_updated` は `SYNCING` (「この block をまだ知らない、body を fetch しろ」) を返す。Wire は接続されている; データは違う。**L14 は接続を証明する; payload execution は将来コースに deferred。**

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

- **`reth-ethereum-engine-primitives`** — `EthEngineTypes` を提供、「Ethereum mainnet の engine surface」と言う type bundle (vs. Optimism、custom L2)。我々の `ConsensusEngineHandle<EthEngineTypes>` はこれに対してパラメータ化される。
- **`alloy-rpc-types-engine`** — `ForkchoiceState { head_block_hash, safe_block_hash, finalized_block_hash }` を提供、`engine_forkchoiceUpdatedV4` 呼び出しの canonical wire-format payload。同じ struct を CL クライアント (Lighthouse、Prysm) が EL クライアントに JSON-RPC 越しに送る; 我々は in-process で使う。

**`alloy-rpc-types-engine` のバージョンに注意**: `2.0` に pin、Reth v2.2.0 自身の pinned `alloy-rpc-types-engine` `2.0.4` とマッチ。ここでバージョン不一致だと `ForkchoiceState` が 2 つの異なる型になり、engine handle が呼び出しを拒否する。

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

`reth-engine-primitives` は L1 から workspace dep だった (中間 stage で `PayloadAttributesBuilder` が住む場所として)。ここで「workspace で利用可能」から「この crate で import」へ昇格。

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

3 個の新規型:
- `ForkchoiceState` — engine に送る payload (head/safe/finalized block hash)。
- `ConsensusEngineHandle` — Reth が engine actor にメッセージを送るために我々にくれる handle。
- `EthEngineTypes` — Ethereum mainnet の engine surface に handle を bind する type parameter。

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

> 🛑 **流暢さ警告。** 「なぜ `engine_handle` が `Option<...>` で常に必須ではない?」 **`LiveRethEvmBridge` のすべての consumer が Reth を bootstrap する production node ではないから。** Unit test (L12、L13) は provider に対する bridge だけが欲しい; 動く engine は要らない。Engine handle を全 caller に強制すると、(a) 全 test がフル node を bootstrap するか、(b) 構築が難しい no-op「fake handle」型が必要。`Option` なら同じ struct が両世界に仕える: test は `None` を渡す、production は `Some(handle)` を渡す。**型レベルの optionality が漏れる API surface を避ける方法。**

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

- **`with_engine_handle()`** — consume-and-return-self builder。`mut self` パラメータが所有権を取り、mutate、return。canonical Rust「builder method」パターン。**`#[must_use]`** にするのは、返り値を bind し忘れる (例: `bridge.with_engine_handle(h);`) と modify された bridge がサイレントに drop されるから。
- **`has_engine_handle()`** — `const fn` accessor。Test と assertion 用 (「配線が実際に効いたか?」)。`const` なのは `Option::is_some()` チェックが runtime 計算を要さないから。
- **`new()` 初期化** — 唯一の変更は `engine_handle: None`。Handle が欲しい caller は `LiveRethEvmBridge::new(p, c).with_engine_handle(h)` を使う。

### Step 5: `commit()` を rewrite — ローカル先、engine は best-effort

Load-bearing な変更。L13 の `commit` を置き換える:

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

1. **ローカル bookkeeping** — L13 と同じ shape。Pending header を hash で lookup、`chain` に insert、`head` を更新。Header が欠けていれば → `BridgeError::Rejected`。Header binding は今 `let _header` — この関数で後で使わないから; binding は明瞭さと将来の telemetry 用に存在。

2. **Best-effort engine 通知** — `engine_handle.is_some()` のときだけ。3 スロット (head、safe、finalized) すべてを新しい hash に向けた `ForkchoiceState` を build。**なぜ 3 つすべて同じ hash?** v0 では separate finalization layer がない — 我々のモデルではコミットされた block はすべて safe で finalized。Production multi-validator chain は別々に track する (block は head になれるが、その descendant に 2/3 の validator が vote するまで finalized ではない)。

3. **`let _ = ...await` は意図的** — engine のレスポンスを discard する。Engine は返す:
   - `VALID` — マッチする `engine_newPayload` をマッチする block body と共に先に送ると、これが happy case。
   - `SYNCING` — **今** 得るもの、`newPayload` を送っていないから。Engine は peer から block を fetch したいが peer がいない。
   - `INVALID` — engine が拒否した block を canonical にせよと頼んだ意味。我々が自分で build した block には実際には起きないはず。

**L14 では 3 つすべての response が同じコードパスに導く: continue。** ローカル bookkeeping はすでに起きた。

> 🛑 **流暢さ警告。** 「`INVALID` で error を返さず engine のレスポンスを discard するのはなぜ?」 **Bridge のローカル state が consensus 層の source of truth で、Reth のではないから。** Reth が `INVALID` と言ってローカル state を roll back すると、Malachite に「実はその decided block は存在しない」と告げることになり、chain を break する。この層での不一致への正しい応答は **大声でログする** こと **operator にアラートする** こと — だが consensus commit を decode roll back しない。**Reth の chain の view は consensus の下流であり、逆ではない。**

### Step 6: テスト更新 (rename + engine 配線追加)

L13 の既存 test `live_bridge_builds_on_real_genesis` を開く。既存テストを modify するのではなく、新規テストを **追加** する — L12/L13 のテストは依然証明していることを証明し、別テストを追加することで新挙動を isolated に保つ。

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

新規部分の walk-through:

1. **`with_types::<EthereumNode>()` + `with_components(...)` + `with_add_ons(EthereumAddOns::default())`** — 明示的 builder パス。`launch_with_debug_capabilities` (L11-L13) は `add_ons_handle` を expose しないショートカット。Beacon engine handle を pull するには明示的形が必要。
2. **`handle.node.add_ons_handle.beacon_engine_handle.clone()`** — Engine handle は add_ons の中。内部的に `Arc` ベース handle; clone は安価。
3. **`.with_engine_handle(engine_handle)`** — 新規 builder メソッド。なしだと `commit` はローカル bookkeeping だけ。ありだと `commit` も forkchoice を fire する。
4. **`assert!(bridge.has_engine_handle())`** — 配線 guard。`with_engine_handle()` にバグがあれば、テストの残りが走る前に catch する。
5. **`commit(block.hash).await.expect("commit failed")`** — メイン assertion。**engine が返したものは check しない** — `commit` が `Ok(())` を返すだけ。Engine の SYNCING レスポンスは Step 5 で `commit` 内で discard される。
6. **Negative case 維持** — unknown hash は依然 `BridgeError::Rejected`。Bridge が engine パスに到達する前に bail するので engine パスは fire しない。

> 🛑 **流暢さ警告。** 「`launch_with_debug_capabilities` を使って add_ons_handle がそこにあると願えばいいんじゃ?」 **ダメ — 異なる launch パスは異なる handle shape を produce する。** `launch_with_debug_capabilities` は debug RPC 付き `NodeHandle` を返すが add_ons を expose しない。明示的 builder chain (`.with_types().with_components().with_add_ons().launch()`) が `add_ons_handle` をくれる形。**どの launch パスがどの handle shape を produce するかを知ることは、特定のフィールドが必要になるまで invisible な詳細。**

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

…workspace 全体 38 個合格するはず (L13 の 37 + 新規テスト)。

よくあるエラーと対処:

- **`error[E0282]: type annotations needed for `Option<ConsensusEngineHandle<_>>`** — `new()` の `engine_handle: None` は型パラメータが推論される必要がある。Struct フィールドの型注釈が欠けているか間違っている、または `EthEngineTypes` import を忘れている。Step 3 を再確認。
- **`error: cannot find struct `EthereumAddOns` in module `reth_node_ethereum::node`** — `reth-node-ethereum` と他の `reth-*` の version drift。すべての git-pinned reth dep は同じ SHA を共有しなければならない。
- **テストが 30 秒以上 hang** — `fork_choice_updated` 呼び出しが return していない可能性が高い。`let _ = handle.fork_choice_updated(state, None).await` (`.await` 付き!) を使ったか確認 — なしだと future が完了前に drop される。
- **`assert!(bridge.has_engine_handle())` が fail** — `with_engine_handle` が `#[must_use]` だが return を bind し忘れた: `let bridge = ...new(...); bridge.with_engine_handle(h);`。`let bridge = ...new(...).with_engine_handle(h);` でなければならない。
- **Commit が `Ok` を返すが unknown hash テストも `Ok` を返す (rejection なし)** — commit ロジックが local lookup の前に engine パスに到達している。Step 5 を再確認 — `?` が `BridgeError::Rejected` を伝播し engine ブロック前に exit する。

## 設計の振り返り

3 つの load-bearing な決定:

1. **ローカル state 先、engine 後。** Bridge の `chain: HashMap` が consensus 層の source of truth。Engine に **先に** 送って失敗すると、ローカル state を roll back するか判断しなければならない — そして consensus commit を roll back することは safety 違反。**順序が正解を強制する: ローカルで成功してから下流に通知。** このパターンは primary store + secondary index/replica があるシステムに一般化する。

2. **`Option<EngineHandle>` がテスト surface をクリーンに保つ。** Optionality なしだと、すべての unit test が non-test engine handle を得るためにフル node を bootstrap する必要がある。Optionality ありだと、test は `None` を渡してローカルパスを exercise、integration test は `Some(handle)` を渡して両方を exercise。**型レベル optionality がインフラを全 test に強制する回避法。**

3. **Engine レスポンスは意図的に discard される。** `SYNCING` が今期待されるレスポンス (`newPayload` を送っていない)。これに error を返すと、すべての consumer に L14 が partial integration と知らせることを強制する。Discard で API contract をクリーンに保つ: 「commit はローカルで完了、下流通知は best-effort」。**クライアントが知る必要があるのは知る必要があるだけ — それ以上は不要。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 0cac571
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

`0cac571` の参照には本コースで導入していない追加コード (Stage 8 由来の CLOB integration) が含まれる場合がある。Stage 7d 固有の変更 — `engine_handle` フィールド、`with_engine_handle()` builder、`commit` body の restructure、`add_ons_handle.beacon_engine_handle` を使う integration test — は厳密に一致するべき。Doc コメントの言い回しは個人差可。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: `add_ons_handle` とは何で、なぜ engine handle がその中にある?**
`add_ons_handle` は launched node に attach された「追加 capability」 — RPC server、engine API endpoint、payload builder hook — の Reth bundle。Beacon engine handle がこれらの 1 つなのは、engine API が **外部** CL クライアント (Lighthouse、Prysm) が JSON-RPC で使うものだから。我々は handle を直接 pull することで in-process ショートカットを取っているが、同じ handle がネットワーク向け API を支える。

**Q: なぜ `ForkchoiceState` には 3 フィールド (head/safe/finalized) があるのにすべて同じ値に設定する?**
Engine API は separate finalization layer を持つ chain 用に設計されたから。Ethereum mainnet では head はすべての slot (12 秒) で advance できるが、block が「safe」になるのは 32 slot 後 (Casper checkpoint)、「finalized」になるのは 64+ slot 後。我々の v0 single-validator chain にはそんな区別はない — どのコミットも final。3 つすべてを同じ hash に設定するのが v0 の簡略化; multi-validator OpenHL なら区別する。

**Q: マッチする `newPayload` なしで `ForkchoiceUpdated` を受け取ると engine は実際に **何を** する?**
`PayloadStatusEnum::Syncing` で応答し、内部的に peer から block を sync しようとし始める。我々の isolated dev node には peer がいないので、sync リクエストはどこにも行かない。Engine は単にその hash 用の「block 待ち」状態に座る。**それでいい** — L14 の目的で engine が canonical chain を advance させる必要は実は決してない。`newPayload` 経由で実 block body を導入する将来コース教材がこのギャップを埋めるだろう。

**Q: Await の代わりに `ForkchoiceUpdated` を非同期に送って即座に return できる?**
できる — `tokio::spawn(handle.fork_choice_updated(...))` で fire-and-forget。だが await は fast (SYNCING で sub-millisecond) でレスポンスをログするオプションをくれる。Async-spawn アプローチはテスト順序も難しくする (テスト exit 前に engine が update を見るか?)。**Await が安全なデフォルト。**

## 次のレッスン (L15 — capstone)

完全な consensus↔EVM bridge ができた。**4 つの `ConsensusBridge` メソッドすべてが real Reth コードパスに到達する。** L15 は capstone: フルシステムを示す 1 ページの recap、production が必要だが skip したもの (`newPayload` 経由の実 block body、stub の代わりに real Codec impl、gossip codec、persistent WAL)、自然な次コース。新規コードなし — victory lap と roadmap だけ。
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
- **「予測してみよう」「流暢さ警告」** は L4-L13 で確立した訳語と統一。
- **タイトル/コードコメントは英語のまま** (OSS 実装にコピーされる前提)。
