# OpenHL を作る — L11 draft (JA) — C2 build-along 書き直し

> openhl SHA `e6b4ebb` (Stage 7a — live Reth EthereumNode が workspace で boot する) 基準。
> コース: `building-openhl-consensus-ja` (track: `reth-l1-architect`, 10 コース中 6 番目)。
> 注: L11 は Module 6 (Live Reth) を開く。これは **依存検証マイルストーン** — L12-L15 で `LiveRethEvmBridge` を配線する前に、Reth v2.2.0 と Malachite v0.5.0 が 1 workspace で共存することを証明する。

---

## L11 — `openhl-reth-bootstrap-ja`

- **モジュール:** 6 (Live Reth — 新規モジュールの最初のレッスン)
- **モジュール sortOrder:** 6 (Engine integration の後)
- **コース全体 sortOrder:** 10 (16 レッスン中 11 番目)
- **所要時間:** 40 分 (うち ~30 分は初回 long compile)
- **XP:** 80
- **type:** CONTENT

### Content

````markdown
# レッスン 11 — workspace で live Reth `EthereumNode` を boot する

## ゴール

このレッスンの終わりに:

```bash
cargo test -p openhl-evm reth_dev_node_bootstraps --release
```

…が新規テスト 1 個に合格する:

```
test reth_node::tests::reth_dev_node_bootstraps ... ok
```

…が、フル Reth `EthereumNode` v2.2.0 (MDBX ストレージ、payload builder、mempool、RPC stub、フルスタック) を ~2.7 秒で **spin up し**、provider に chain ID を query して結果を assert する。**これは Reth と Malachite — L1 リファレンス実装で最大級のインフラ 2 つ — が 1 workspace で衝突なく共存することの証明。**

やったことのまとめ:
- 4 個の新規 workspace 依存を追加 (`reth-node-core`, `reth-tasks`, `reth-provider`, `alloy-genesis`)
- `crates/evm/Cargo.toml` に 8 個の新規 dev-dependency を追加 (test-only — production scope は変わらず)
- `crates/evm/src/reth_node.rs` を作成 (~100 行、test モジュールのみ)

Production コードなし。Bridge 変更なし。L12 で live-bridge コードを書き始める前に **dependency tree が resolve することの検証** のみ。

## おさらい

L10 完了時点で workspace には以下がある:

```
crates/types/           — BlockHash, PayloadId, PayloadAttrs, ExecutedBlock, PayloadStatus
crates/evm/             — InMemoryEvmBridge, RethEvmBridge (alloy types)
crates/consensus/       — フル BFT engine: Context, signing, codec, node, engine_app
bin/openhl/             — 空のバイナリ stub
```

`cargo test` で workspace 全体 35 個合格 (consensus 21 + evm 14)。Engine は `InMemoryEvmBridge` 経由で real block を produce する。**ただし EL はまだ placeholder。** `RethEvmBridge` は存在する (L5) が、実際には Reth を呼ばない — alloy 型を使って hash を計算するだけ。

## 計画

4 つやる:

1. **workspace レベルの依存を 4 個追加** — `Cargo.toml` に: `reth-node-core`, `reth-tasks`, `reth-provider`, `alloy-genesis` — すべて L1 以来使ってきた同じ Reth SHA に pin。
2. **`crates/evm/Cargo.toml` に dev-dependency を 8 個追加** (Reth の node-builder/ethereum の test-utils variant + サポート crate)。
3. **`crates/evm/src/reth_node.rs` を作成** — dev chain spec を build し、`NodeBuilder::testing_node` で `EthereumNode` を launch し、provider が応答することを検証する test モジュール。
4. **`mod reth_node;`** を `crates/evm/src/lib.rs` に配線 (test-cfg のみ — production scope をクリーンに保つ)。

このレッスンが教えるのは **依存共存の検証パターン**。大きなインフラ crate 2 つに依存する (我々の場合 Reth と Malachite) 場合、衝突が判明するのは integration コードを書いてから — その時点で、**動くべき** だが compile しないコードに大量投資済み。**検証パターンは、integration を書く前に、両方を同時に exercise する最小のテストを書くこと。** Test が pass すれば両 dep が resolve・link する。失敗すれば失敗が即座に visible になり、blast radius が小さい。

> 🛑 **予測してみよう。** スクロールする前に: なぜゴールコマンドで bootstrap test を `--release` でマークする? ヒント: compile time とその支配要因を考える。Reth の MDBX bindings + libp2p + alloy + rocksdb 系ストレージスタックは **巨大** — debug mode の初回コンパイルは ~2:34、release も同程度だが結果バイナリが大幅に高速。Test 自体は bootstrap と chain-ID チェックだけなので、**初回コンパイル後** は fast compile より fast runtime が欲しい。初回 cold ビルド後は `--release` で走る。

## 手順

### Step 1: workspace レベルで Reth 依存を追加

ルート `Cargo.toml` を開く。`# --- Reth (pinned to v2.2.0 release tag) ---` ブロックを探す。L10 後はこう終わっている:

```toml
reth-engine-primitives    = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-primitives   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
```

4 行追加してブロックを次にする:

```toml
reth-node-builder         = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-ethereum        = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-core            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-tasks                = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-chainspec            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-evm                  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-evm-ethereum         = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-primitives  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-engine-primitives    = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-primitives   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
```

各依存の用途:

- **`reth-node-core`** — `NodeConfig` 関連の型 (node の config 構造: chain spec、datadir、JSON-RPC エンドポイントなどを定義)。
- **`reth-tasks`** — Reth のバックグラウンドタスク (block validation、mempool gossip、payload builder) を spawn するための `Runtime` と `TaskExecutor`。
- **`reth-provider`** — 履歴/canonical chain query を提供する `BlockchainProvider`。L12 の `LiveRethEvmBridge::with_live_node()` がこれを 1 個保持する。
- **`alloy-genesis`** — Genesis JSON のデシリアライズ。Reth の `ChainSpec` は `Genesis` から `genesis.into()` で構築。

**Reth SHA `88505c7f...` は v2.2.0 release tag** — L1 で `reth-evm`, `reth-evm-ethereum` などに使ったのと同じ SHA。**main HEAD ではなく release-tag SHA に pin することが不変条件。** Reth のバンプは専用 PR で行う。

> 🛑 **流暢さ警告。** 「crates.io に v2.2.0 が publish されているのに、なぜ SHA pin?」 **Reth の crates.io への release cadence が GitHub より数週間から数ヶ月遅れているから。** v2.2.0 git tag が最新の test 済みバイナリ。Publish された crate はしばしばより古い。Git+SHA pin なら maintainer が v2.2.0 と stamp した正確な commit が得られる、stale な crates.io upload からのサプライズなしで。これは高速進化するインフラ crate の標準プラクティス。

### Step 2: `crates/evm/Cargo.toml` を更新

`crates/evm/Cargo.toml` を開く。現在の `[dev-dependencies]` は `tokio` だけ:

```toml
[dev-dependencies]
tokio = { workspace = true }
```

これを次に置き換える:

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
eyre                 = { workspace = true }
tempfile             = "3"
```

3 カテゴリ:

- **`reth-node-builder` + `reth-node-ethereum` (test-utils feature 付き)** — `NodeBuilder::testing_node(runtime)` を提供する。これは tempdir 上の MDBX、debug capabilities、エフェメラルポートで node を構築する。`test-utils` なしではこれらのメソッドは存在しない。
- **`reth-node-core` + `reth-tasks` + `reth-chainspec` + `reth-provider`** — test が直接使う runtime サポート crate (`NodeConfig`, `Runtime`, `ChainSpec`, provider アクセス)。
- **`alloy-genesis` + `serde_json` + `eyre` + `tempfile`** — test サポート: dev genesis 用 JSON parsing、error handling、temp directory 作成。

**すべて `[dev-dependencies]`** — production scope は変わらない。`lib.rs` の `#[cfg(test)]` 外コードで誤ってこれらを使うと compile が失敗する。**Test-only dep がガードレール。**

### Step 3: `crates/evm/src/reth_node.rs` を作成

ファイル冒頭 — Stage 7 でどこにいるかを示す ASCII ロードマップ付きモジュール doc:

```rust
//! Live Reth node bootstrap — Stage 7a.
//!
//! Demonstrates that a full `EthereumNode` can be spun up in our workspace
//! via `NodeBuilder::testing_node`. Stage 7b will wire `RethEvmBridge` to
//! consume this node's provider + payload builder; for now this module is a
//! validated bootstrap recipe (the smoke test confirms it works) and a
//! placeholder for the future `live_node()` constructor.
//!
//! ```text
//! +----------------------+  Stage 7a (this commit)
//! | NodeBuilder          |--+
//! |   .testing_node      |  |  EthereumNode spins up with MDBX in tempdir,
//! |   .node(Ethereum)    |  |  payload builder, mempool, RPC stub, etc.
//! |   .launch_with_dbg() |--+
//! +----------------------+
//!
//! +----------------------+  Stage 7b (next)
//! | RethEvmBridge        |  Bridge methods (build_payload, payload_ready,
//! |   ::with_live_node() |  validate_payload, commit) route through the
//! +----------------------+  live node's services instead of in-process maps.
//! ```
```

ASCII ロードマップは意図的。**Module 6 はレッスン 5 個 (L11-L15) を持ち、それぞれが bridge の stubbed body を 1 個ずつ置き換える。** ロードマップが mental scaffold を提供し、現在のレッスンが大きな弧のどこに位置するか分かる。

ファイルには **non-test コードがない**。以下すべて `#[cfg(test)] mod tests` 内:

```rust
#[cfg(test)]
mod tests {
    use alloy_genesis::Genesis;
    use eyre::Result;
    use reth_chainspec::ChainSpec;
    use reth_node_builder::{NodeBuilder, NodeHandle};
    use reth_node_core::node_config::NodeConfig;
    use reth_node_ethereum::EthereumNode;
    use reth_tasks::Runtime;
    use std::sync::Arc;

    // ... helpers + test ...
}
```

Import は密だが各が単一の役割:
- `Genesis` — dev genesis JSON のデシリアライズ
- `ChainSpec` — Reth の chain configuration (`Genesis::into()` で取得)
- `NodeBuilder`, `NodeHandle` — node を構築・launch する builder パターン
- `NodeConfig` — node レベル configuration (datadir、RPC エンドポイントなど)
- `EthereumNode` — spin up する具体的な node 型 (mainnet Ethereum 挙動)
- `Runtime` — tokio runtime に対する `reth-tasks` のラッパー
- `Arc` — `ChainSpec` は `Arc<ChainSpec>` で渡される

### Step 4: `dev_chain_spec` ヘルパー

Test モジュール内:

```rust
    fn dev_chain_spec() -> Arc<ChainSpec> {
        // Minimal post-merge dev genesis. ChainID 2600 mirrors the upstream
        // custom-dev-node example so we can compare behaviour 1:1 if needed.
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
        let genesis: Genesis =
            serde_json::from_str(custom_genesis).expect("dev genesis json parses");
        Arc::new(genesis.into())
    }
```

注目すべきポイント:

- **`chainId: 2600`** — Reth の上流 `custom-dev-node` 例と一致するので、デバッグ時に行ごとに挙動比較できる。**2600 は OpenHL のマジックナンバーではない**; Reth のドキュメントが使う数字。
- **EIP block number すべて = 0** — すべての Ethereum hardfork が height 0 から有効。これは「post-merge dev」 — fork の歴史的順序をシミュレートしない。
- **`terminalTotalDifficulty: 0` + `terminalTotalDifficultyPassed: true`** — chain は post-merge から始まる。Pre-merge PoW block は存在しない。
- **`shanghaiTime: 0`** — Shanghai (withdrawals) が genesis で active。
- **`alloc: {}`** — pre-funded アカウントなし。残高が必要なテストではエントリを追加する。

JSON は `serde_json::from_str(...)` で `Genesis` に parse され、`genesis.into()` で `ChainSpec` に変換される (alloy-genesis が impl 提供)。`Arc::new(...)` なのは node が `Arc<ChainSpec>` として保持し、複数のサブシステムで共有するから。

> 🛑 **流暢さ警告。** 「なぜ Rust で `ChainSpec` を直接構築せず raw JSON 文字列?」 **Reth の `ChainSpec` builder には 50+ フィールドと複雑な内部 invariant があるから。** プログラマチックに構築するということは、最近のフォークごとに必要なフィールドに追いつくこと。`Genesis` deserializer 経由で JSON から構築すると、Reth 自身の型システムにデフォルトと validity を強制させられる。**JSON フォーマットはどのみち chain の外部インターフェース** — production chain はすべて同じ JSON 形を使う (`reth-chainspec/res/genesis/mainnet.json` を見よ)。

### Step 5: `launch_and_check` ヘルパー

`dev_chain_spec` の下:

```rust
    /// Bootstrap a real Reth `EthereumNode` and verify the provider responds.
    /// Returns nothing if successful; panics on launch or assertion failure.
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

        // The provider should serve canonical chain queries off the genesis state.
        let observed_chain_id = node.chain_spec().chain.id();
        assert_eq!(observed_chain_id, expected_chain_id);

        // NOTE: not awaiting node_exit_future — drop the NodeAdapter and let
        // its background tasks tear themselves down when the runtime drops.
        Ok(())
    }
```

Walk-through:

1. **`Runtime::test()`** — `reth-tasks` の canonical「test runtime」 — 現在の tokio runtime をラップして Reth の `TaskExecutor` がそこに spawn できるようにする。
2. **`dev_chain_spec()`** — さっき build した genesis 由来 chain spec。
3. **`NodeConfig::test().dev().with_chain(chain_spec)`** — builder chain:
   - `test()` — sane test default (エフェメラルポートなど)
   - `.dev()` — single-validator dev mode (peer discovery なし、MEV なし)
   - `.with_chain(...)` — dev chain spec に bind
4. **`NodeBuilder::new(config).testing_node(runtime).node(EthereumNode::default())`** — 4 段の builder:
   - `new(config)` — config を取り込む
   - `.testing_node(runtime)` — test と宣言 (tempdir ストレージ、debug RPC など)
   - `.node(EthereumNode::default())` — 「Ethereum mainnet 挙動が欲しい」(vs. Optimism、custom など) と言う
5. **`.launch_with_debug_capabilities()`** — node のサービス (MDBX、payload builder、RPC、test mode の mempool gossip など) をすべて spawn。`NodeHandle { node, node_exit_future }` を返す。
6. **`node.chain_spec().chain.id()` の assertion** — 最もシンプルな「node が正しく起動した?」チェック。Live `BlockchainProvider` から chain ID を fetch できれば、node は boot した。
7. **`node_exit_future: _`** — この future を await **しない**。Await すると node のシャットダウンを待ってブロックする (kill されるまで永遠に発生しない)。代わりに関数末で `NodeHandle` を drop し、runtime にバックグラウンドタスクを tear down させる。

> 🛑 **流暢さ警告。** 「`NodeConfig::test().dev()` は実際何を disable する?」 **重要なのは: libp2p Kademlia 経由の peer discovery とフル mempool gossip プロトコル。** Non-test、non-dev node は peer に dial を試み、chain を sync し、libp2p リクエストに応答する。我々のテストではそのいずれも実行しない — node は完全に isolated。これが essential なのは、chain ID (2600) がどの public network とも一致しないので、peer への dial は timeout か拒否されるから。

### Step 6: テスト本体

最後:

```rust
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn reth_dev_node_bootstraps() {
        if let Err(e) = launch_and_check().await {
            panic!("Reth dev node bootstrap failed: {e:?}");
        }
    }
```

Body は 2 行。**検証は `launch_and_check` 内**; test はそれを呼んで、内部 error を保持した panic として失敗を surface するだけ。

`flavor = "multi_thread", worker_threads = 4` — L10 の integration test と同じセットアップ。Reth の内部タスク (MDBX commit、payload builder、RPC handler、network service) はすべて自分のスレッドが欲しい; 4 で contention なく余裕。

### Step 7: `reth_node.rs` を `crates/evm/src/lib.rs` に配線

`crates/evm/src/lib.rs` を開く。L4-L5 の in-memory + Reth bridge とその re-export がある。**test cfg でゲートした 1 行追加:**

```rust
//! ... existing docs ...

pub mod bridges; // existing

#[cfg(test)]
mod reth_node;

// ... existing re-exports ...
```

`#[cfg(test)]` がキー。**Reth bootstrap モジュールは test-only** — `openhl-evm` の consumer に見えない、non-test ビルドではコンパイルされない。すべての dep が `[dev-dependencies]` であることと整合 — L11 は production scope に何も影響しない。

## テスト

```bash
cargo test -p openhl-evm reth_dev_node_bootstraps --release
```

**初回 run:** ~2:34 のコールドコンパイル (Reth の MDBX、libp2p、payload builder、RPC スタックが初めてビルドされる)、その後 ~3 秒で run。

以降の run: ~30 秒 (Cargo のインクリメンタルコンパイル)、その後 ~3 秒で run。

出力:

```
running 1 test
test reth_node::tests::reth_dev_node_bootstraps ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Full suite 確認:

```bash
cargo test
```

…workspace 全体 36 個合格 (consensus 21 + evm 15、新規 test 1 個追加)。

よくあるエラーと対処:

- **`error[E0432]: unresolved import 'reth_node_builder'`** — `crates/evm/Cargo.toml` で `test-utils` feature が抜けている。Step 2 を再確認: `features = ["test-utils"]` であること。
- **`error: failed to resolve: use of undeclared crate or module 'reth_provider'`** — workspace レベルで `reth-provider = ...` が抜けている。Step 1 を再確認。
- **`error: feature 'test-utils' on 'reth-node-builder' requires feature 'X'`** — version skew。Pin している Reth SHA が `reth-node-builder` の peer crate 期待と一致する必要がある。すべての reth-* dep (12 個) が同じ SHA を使うこと — Step 1 を再確認。
- **`Reth dev node bootstrap failed: Failed to bind...`** — 前回 test run からのポート衝突。`NodeConfig::test()` はエフェメラルポートを使うが、tempdir の stale 状態が衝突しうる。`cargo clean -p openhl-evm` で retry。
- **Test がコンパイルできるが 30 秒以上 hang** — `Runtime::test()` が正しく動いていない。Single-thread default ではなく `#[tokio::test(flavor = "multi_thread", worker_threads = 4)]` を使っていることを確認。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Production dep は最小、test-only dep がスタック全体を検証する。** `crates/evm/Cargo.toml` の production dep は 6 個 (L5 から変わらず) + dev-dep 11 個。Dev-dep 11 個が Reth のフル node-builder + provider スタックが **今動く** ことを検証 — が、`openhl-evm` を使う下流 crate はそれらを pull しない。**これが `openhl-evm` を slim に保ちつつ integration が動くことを証明する方法。**

2. **Bootstrap-only test は意味のある artifact。** このレッスンの test は node を spin up して chain ID を check するだけ。Block を build しない、トランザクションを実行しない、過去 state を query しない。**それでも Module 6 の残りが依存するレッスン。** Bootstrap が失敗すれば L12-L15 は何も動かない。**Bootstrap-only test がビジネスロジックが関わる前にインフラ regression を catch する。**

3. **モジュール doc の ASCII ロードマップが L12-L15 のトレイルマーカー。** 残りの各レッスンは bridge の stubbed body を 1 個ずつ置き換える — `build_payload`, `payload_ready`, `validate_payload`, `commit`。ロードマップは各レッスンが大きな弧のどこに位置するかを示す。**Module doc は orientation 用で実装詳細用ではない。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout e6b4ebb
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/reth_node.rs ./crates/evm/src/reth_node.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
```

`e6b4ebb` の参照には workspace dep update、11 個の dev-dep、105 行の `reth_node.rs` が含まれる。JSON genesis 文字列、builder chain、test 属性は厳密に一致するべき。Doc コメントの言い回しは個人差可。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜ chain ID は 1 (mainnet) でもランダム数字でもなく 2600?**
2 つの理由: (1) どの public network とも衝突しないので、peer discovery が偶然 real chain に接続することがない; (2) Reth の上流 `custom-dev-node` 例と一致するので、canonical reference と挙動を `diff` できる。後で自由に変えられる — OpenHL 内に 2600 の意味的な特別性はない。

**Q: `NodeConfig::test().dev()` は `NodeConfig::default()` と何が違う?**
`test()` = エフェメラル tempdir for MDBX、`:0` (kernel-allocated) port に bind、peer discovery なし、sane test logging。`dev()` = single-validator mode (複数 validator 間の actual consensus なし)、local node を唯一の block producer とみなす、mempool gossip なし。組み合わせ: 完全に isolated な dev/test 環境。

**Q: `launch_with_debug_capabilities` は通常より遅くなる?**
ならない — 通常 gate される追加 RPC エンドポイント (`debug_*` namespace) を有効化する。パフォーマンスオーバーヘッドは無視できる; コストは prod でセキュリティリスクとなる余分な surface を晒すだけ。テスト用には fine。

**Q: なぜ L9 の `OpenHlNodeHandle` のように node を `kill()` しない?**
Reth が返す `NodeHandle` には、我々が使うパスで `kill()` メソッドがないから。Handle を drop して runtime に物を tear down させるのが期待される使い方。明示的クリーンアップが必要な長時間 test では `node.task_executor.shutdown(...)` を呼ぶが、3 秒の smoke test なら drop で十分。

## 次のレッスン (L12)

Reth と Malachite はこれで共存する。**ただし bridge はまだ Reth と話していない。** L12 で `LiveRethEvmBridge::with_live_node()` を build する — さっき bootstrap した `node` を受け取り、`BlockchainProvider` を expose するコンストラクタ。これにより `build_payload` (L4-L5 の stubbed bridge メソッド) が live MDBX state に対して **real な** 親ブロック lookup を行える。これが「Reth が workspace にいる」から「Reth が consensus engine が読むデータを produce している」へ移行する瞬間。
````

---

## Seed ファイルスロット

L11 は新規 Module 6 (Live Reth) sortOrder 0 に入る:

```typescript
modules: {
  0: { title: 'Orientation', sortOrder: 0 },
  1: { title: 'Foundations', sortOrder: 1 },
  2: { title: 'Contract types', sortOrder: 2 },
  3: { title: 'EL test double', sortOrder: 3 },
  4: { title: 'CL types', sortOrder: 4 },
  5: { title: 'Engine integration', sortOrder: 5 },
  6: { title: 'Live Reth', sortOrder: 6 },  // 新規
},
```

```typescript
{
  title: 'レッスン 11 — workspace で live Reth EthereumNode を boot する',
  slug: 'openhl-reth-bootstrap-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 80,
  content: `# レッスン 11 — workspace で live Reth \`EthereumNode\` を boot する\n\n...`
},
```

## SHA pinning 規律

L11 が参照する openhl コミット (§答え合わせ):
- `e6b4ebb` (Stage 7a — live Reth EthereumNode が workspace で boot する)

これが依存検証マイルストーン — L12-L15 で `LiveRethEvmBridge` を配線する前に Reth + Malachite の共存を証明する。

## 翻訳セルフレビュー (paste 前)

- **「load-bearing」「dependency-coexistence」「bootstrap」** は専門語として英語のまま保持。
- **「stale」「blast radius」「validation」** はそのまま (ニュアンス保持)。
- **「post-merge」「hardfork」「Shanghai」** は Ethereum 専門語そのまま。
- **「予測してみよう」「流暢さ警告」** は L4-L10 で確立した訳語と統一。
- **タイトル/コードコメントは英語のまま** (OSS 実装にコピーされる前提)。
- **「インフラ」「サブシステム」** はカタカナ (一般定着語)。
