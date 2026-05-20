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

上記の実行結果が新規テスト 1 個に合格する:

```
test reth_node::tests::reth_dev_node_bootstraps ... ok
```

上記の実行結果が、フルな Reth `EthereumNode` v2.2.0 (MDBX ストレージ、payload builder、mempool、RPC stub、フルスタック) を ~2.7 秒で **spin up し**、provider に chain ID を query して結果を assert する。**これは、Reth と Malachite — L1 リファレンス実装で最大級のインフラ 2 つ — が 1 つの workspace で衝突なく共存することの証明だ。**

やったことのまとめ:
- workspace 依存を 4 個追加 (`reth-node-core`、`reth-tasks`、`reth-provider`、`alloy-genesis`)
- `crates/evm/Cargo.toml` に dev-dependency を 8 個追加 (test-only — production scope は変わらない)
- `crates/evm/src/reth_node.rs` を作成 (~100 行、test モジュールのみ)

Production コードは無し。Bridge への変更も無し。L12 で live-bridge コードを書き始める前に、**dependency tree が resolve することを検証する** だけだ。

## おさらい

L10 完了時点で workspace には以下がある:

```
crates/types/           — BlockHash, PayloadId, PayloadAttrs, ExecutedBlock, PayloadStatus
crates/evm/             — InMemoryEvmBridge, RethEvmBridge (alloy types)
crates/consensus/       — フル BFT engine: Context, signing, codec, node, engine_app
bin/openhl/             — 空のバイナリ stub
```

`cargo test` で workspace 全体が 35 個合格する (consensus 21 + evm 14)。Engine は `InMemoryEvmBridge` 経由で real block を produce する。**ただし EL はまだ placeholder だ。** `RethEvmBridge` は存在する (L5) が、実際には Reth を呼ばない — alloy 型を使って hash を計算するだけだ。

## 計画

4 つやる:

1. **workspace レベルで依存を 4 個追加する** — `Cargo.toml` に `reth-node-core`、`reth-tasks`、`reth-provider`、`alloy-genesis` を追加。すべて L1 以来使ってきたのと同じ Reth SHA に pin する。
2. **`crates/evm/Cargo.toml` に dev-dependency を 8 個追加する** (Reth の node-builder/ethereum の test-utils variant とサポート crate)。
3. **`crates/evm/src/reth_node.rs` を作成する** — dev chain spec を build し、`NodeBuilder::testing_node` で `EthereumNode` を launch し、provider が応答することを検証する test モジュール。
4. **`mod reth_node;`** を `crates/evm/src/lib.rs` に配線する (test-cfg のみ — production scope をクリーンに保つ)。

このレッスンが教えるのは **依存共存の検証パターン** だ。大きなインフラ crate を 2 つ (今回は Reth と Malachite) に依存する場合、衝突は integration コードを書いて初めて判明する — その時点では、**動くはずなのに** コンパイルできないコードに大量投資済みになっている。**検証パターンは、integration を書く前に、両方を同時に exercise する最小のテストを書くことだ。** Test が pass すれば両方の dep が resolve・link される。失敗すれば失敗が即座に visible になり、blast radius が小さくて済む。

> 🛑 **考えてみよう。** スクロールする前に: なぜゴールコマンドで bootstrap test を `--release` で走らせるのか? ヒント: compile time とその支配要因を考える。Reth の MDBX bindings + libp2p + alloy + rocksdb 系ストレージスタックは **巨大** だ — debug mode の初回コンパイルは ~2:34、release も同程度だが、結果バイナリは大幅に高速になる。Test 自体は bootstrap と chain-ID チェックだけなので、**初回コンパイル後** は fast compile よりも fast runtime のほうが欲しい。初回 cold ビルド後は `--release` で走らせる。

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

- **`reth-node-core`** — `NodeConfig` 関連の型 (node の config 構造: chain spec、datadir、JSON-RPC エンドポイントなどを定義する)。
- **`reth-tasks`** — Reth のバックグラウンドタスク (block validation、mempool gossip、payload builder) を spawn するための `Runtime` と `TaskExecutor`。
- **`reth-provider`** — 履歴 / canonical chain クエリを提供する `BlockchainProvider`。L12 の `LiveRethEvmBridge::with_live_node()` がこれを 1 個保持する。
- **`alloy-genesis`** — Genesis JSON のデシリアライズ。Reth の `ChainSpec` は `Genesis` から `genesis.into()` で構築する。

**Reth SHA `88505c7f...` は v2.2.0 release tag** — L1 で `reth-evm` や `reth-evm-ethereum` などに使ったのと同じ SHA だ。**main HEAD ではなく release-tag SHA に pin することが不変条件だ。** Reth のバンプは専用 PR で行う。

> 🛑 **やりがちな勘違い。** 「crates.io に v2.2.0 が publish されているのに、なぜ SHA pin するのか?」 **Reth の crates.io への release cadence が GitHub より数週間から数ヶ月遅れているからだ。** v2.2.0 git tag が最新の test 済みバイナリで、Publish された crate はそれより古いことが多い。Git + SHA pin なら、maintainer が v2.2.0 と stamp した正確な commit が得られ、stale な crates.io upload からのサプライズもない。これは高速進化するインフラ crate の標準プラクティスだ。

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
- **`reth-node-core` + `reth-tasks` + `reth-chainspec` + `reth-provider`** — test が直接使う runtime サポート crate (`NodeConfig`、`Runtime`、`ChainSpec`、provider アクセス)。
- **`alloy-genesis` + `serde_json` + `eyre` + `tempfile`** — test サポート用だ: dev genesis 用の JSON parsing、error handling、temp directory 作成。

**すべて `[dev-dependencies]` だ** — production scope は変わらない。`lib.rs` の `#[cfg(test)]` 外のコードで誤ってこれらを使うと compile が失敗する。**Test-only dep がガードレールになる。**

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

ASCII ロードマップは意図的に置いている。**Module 6 はレッスン 5 個 (L11-L15) から成り、それぞれが bridge の stubbed body を 1 個ずつ置き換えていく。** ロードマップが mental scaffold を提供し、現在のレッスンが大きな弧のどこに位置するかを示してくれる。

ファイルには **non-test コードがない**。以下はすべて `#[cfg(test)] mod tests` 内だ:

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

Import は密だが、それぞれ単一の役割を持つ:
- `Genesis` — dev genesis JSON のデシリアライズ
- `ChainSpec` — Reth の chain configuration (`Genesis::into()` で取得する)
- `NodeBuilder`、`NodeHandle` — node を構築・launch する builder パターン
- `NodeConfig` — node レベルの configuration (datadir、RPC エンドポイントなど)
- `EthereumNode` — spin up する具体的な node 型 (mainnet Ethereum 挙動)
- `Runtime` — tokio runtime に対する `reth-tasks` のラッパー
- `Arc` — `ChainSpec` は `Arc<ChainSpec>` として渡す

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

- **`chainId: 2600`** — Reth の上流 `custom-dev-node` 例と一致するので、デバッグ時に行ごとに挙動を比較できる。**2600 は OpenHL のマジックナンバーではない** — Reth のドキュメントで使われている数字に過ぎない。
- **EIP の block number はすべて 0** — Ethereum の全 hardfork が height 0 から有効になる。これは「post-merge dev」設定で、fork の歴史的順序はシミュレートしない。
- **`terminalTotalDifficulty: 0` + `terminalTotalDifficultyPassed: true`** — chain は post-merge から始まる。Pre-merge PoW block は存在しない。
- **`shanghaiTime: 0`** — Shanghai (withdrawals) が genesis から active になる。
- **`alloc: {}`** — pre-funded アカウントなし。残高が必要なテストでは、ここにエントリを追加する。

JSON は `serde_json::from_str(...)` で `Genesis` に parse され、`genesis.into()` で `ChainSpec` に変換される (alloy-genesis が impl を提供している)。`Arc::new(...)` にしているのは、node が `Arc<ChainSpec>` として保持し、複数のサブシステムで共有するからだ。

> 🛑 **やりがちな勘違い。** 「なぜ Rust で `ChainSpec` を直接構築せず、raw JSON 文字列を使うのか?」 **Reth の `ChainSpec` builder には 50 以上のフィールドと複雑な内部 invariant があるからだ。** プログラマチックに構築するということは、最近のフォークごとに必要なフィールドに自分で追いついていくことを意味する。`Genesis` deserializer 経由で JSON から構築すれば、Reth 自身の型システムにデフォルトと validity を強制させられる。**JSON フォーマットはどのみち chain の外部インターフェースだ** — production chain はすべて同じ JSON 形を使う (`reth-chainspec/res/genesis/mainnet.json` を見よ)。

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

順を追って見ていく:

1. **`Runtime::test()`** — `reth-tasks` の canonical「test runtime」だ。現在の tokio runtime をラップして、Reth の `TaskExecutor` がそこに spawn できるようにする。
2. **`dev_chain_spec()`** — さっき build した genesis 由来の chain spec。
3. **`NodeConfig::test().dev().with_chain(chain_spec)`** — builder chain:
   - `test()` — sane な test default (エフェメラルポートなど)
   - `.dev()` — single-validator dev mode (peer discovery なし、MEV なし)
   - `.with_chain(...)` — dev chain spec に bind
4. **`NodeBuilder::new(config).testing_node(runtime).node(EthereumNode::default())`** — 4 段の builder:
   - `new(config)` — config を取り込む
   - `.testing_node(runtime)` — test だと宣言する (tempdir ストレージ、debug RPC など)
   - `.node(EthereumNode::default())` — 「Ethereum mainnet 挙動が欲しい」と指定する (Optimism や custom などと区別する)
5. **`.launch_with_debug_capabilities()`** — node のサービス (MDBX、payload builder、RPC、test mode の mempool gossip など) をすべて spawn する。`NodeHandle { node, node_exit_future }` を返す。
6. **`node.chain_spec().chain.id()` の assertion** — 最もシンプルな「node が正しく起動したか?」のチェック。Live `BlockchainProvider` から chain ID を fetch できれば、node は boot している。
7. **`node_exit_future: _`** — この future は await **しない**。Await すると node のシャットダウンを待ってブロックしてしまう (kill されるまで永遠に発生しない)。代わりに関数末で `NodeHandle` を drop して、runtime にバックグラウンドタスクを tear down させる。

> 🛑 **やりがちな勘違い。** 「`NodeConfig::test().dev()` は実際には何を disable しているのか?」 **重要なのは libp2p Kademlia 経由の peer discovery と、フルな mempool gossip プロトコルだ。** Non-test、non-dev node は peer に dial を試み、chain を sync し、libp2p リクエストに応答する。こちらのテストではそのいずれも実行しない — node は完全に isolated だ。これが essential なのは、chain ID (2600) がどの public network とも一致しないので、peer への dial は timeout するか拒否されるからだ。

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

本体は 2 行だ。**検証は `launch_and_check` 内で行う** — test はそれを呼んで、内部 error を保持した panic として失敗を surface させるだけだ。

`flavor = "multi_thread", worker_threads = 4` は L10 の integration test と同じセットアップだ。Reth の内部タスク (MDBX commit、payload builder、RPC handler、network service) はすべて自分のスレッドを欲しがる。4 つあれば contention なく余裕がある。

### Step 7: `reth_node.rs` を `crates/evm/src/lib.rs` に配線

`crates/evm/src/lib.rs` を開く。L4-L5 の in-memory + Reth bridge とその re-export がある。**test cfg でゲートした 1 行追加:**

```rust
//! ... existing docs ...

pub mod bridges; // existing

#[cfg(test)]
mod reth_node;

// ... existing re-exports ...
```

`#[cfg(test)]` がキーだ。**Reth bootstrap モジュールは test-only** — `openhl-evm` の consumer からは見えず、non-test ビルドではコンパイルされない。すべての dep が `[dev-dependencies]` であることと整合する — L11 は production scope に何も影響を与えない。

## テスト

```bash
cargo test -p openhl-evm reth_dev_node_bootstraps --release
```

**初回 run:** ~2:34 のコールドコンパイル (Reth の MDBX、libp2p、payload builder、RPC スタックが初めてビルドされる)、そのあと ~3 秒で run する。

以降の run: ~30 秒 (Cargo のインクリメンタルコンパイル)、そのあと ~3 秒で run する。

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

…workspace 全体 36 個合格するはず (consensus 21 + evm 15、新規テストを 1 個追加した)。

よくあるエラーと対処:

- **`error[E0432]: unresolved import 'reth_node_builder'`** — `crates/evm/Cargo.toml` で `test-utils` feature が抜けている。Step 2 を再確認: `features = ["test-utils"]` であること。
- **`error: failed to resolve: use of undeclared crate or module 'reth_provider'`** — workspace レベルで `reth-provider = ...` が抜けている。Step 1 を再確認。
- **`error: feature 'test-utils' on 'reth-node-builder' requires feature 'X'`** — version skew だ。Pin している Reth SHA が `reth-node-builder` の peer crate の期待と一致する必要がある。すべての reth-* dep (12 個) が同じ SHA を使っているか、Step 1 を再確認。
- **`Reth dev node bootstrap failed: Failed to bind...`** — 前回の test run からのポート衝突だ。`NodeConfig::test()` はエフェメラルポートを使うが、tempdir の stale 状態が衝突を生むことがある。`cargo clean -p openhl-evm` してから retry する。
- **Test はコンパイルできるが 30 秒以上 hang する** — `Runtime::test()` が正しく動いていない。Single-thread default ではなく `#[tokio::test(flavor = "multi_thread", worker_threads = 4)]` を使っているか確認する。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Production dep は最小に保ち、test-only dep でスタック全体を検証する。** `crates/evm/Cargo.toml` の production dep は 6 個 (L5 から変わらず) + dev-dep が 11 個。11 個の dev-dep が、Reth のフルな node-builder + provider スタックが **今動く** ことを検証する — それでいて `openhl-evm` を使う下流 crate はそれらを pull しない。**これで `openhl-evm` を slim に保ちつつ、integration が動くことを証明できる。**

2. **Bootstrap-only test は意味のある artifact だ。** このレッスンの test は、node を spin up して chain ID を check するだけだ。Block を build せず、トランザクションを実行せず、過去の state も query しない。**それでも Module 6 の残りが依存するレッスンになっている。** Bootstrap が失敗すれば L12-L15 は何も動かない。**Bootstrap-only test が、ビジネスロジックに到達する前にインフラ regression を catch してくれる。**

3. **モジュール doc の ASCII ロードマップが L12-L15 のトレイルマーカーになる。** 残りの各レッスンは bridge の stubbed body を 1 個ずつ置き換える — `build_payload`、`payload_ready`、`validate_payload`、`commit`。ロードマップが、各レッスンが大きな弧のどこに位置するかを示してくれる。**Module doc は orientation 用であって、実装詳細用ではない。**

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

**Q: chain ID はなぜ 1 (mainnet) でもランダム数字でもなく 2600 なのか?**
2 つの理由がある: (1) どの public network とも衝突しないので、peer discovery が偶然 real chain に接続することがない、(2) Reth の上流 `custom-dev-node` 例と一致するので、canonical reference と挙動を `diff` できる。後で自由に変えられる — OpenHL 内で 2600 に意味的な特別性はない。

**Q: `NodeConfig::test().dev()` は `NodeConfig::default()` と何が違うのか?**
`test()` は、MDBX 用のエフェメラル tempdir、`:0` (kernel-allocated) port への bind、peer discovery なし、sane な test logging を設定する。`dev()` は、single-validator mode (複数 validator 間の actual consensus なし)、local node を唯一の block producer とみなす、mempool gossip なし、を設定する。組み合わせれば完全に isolated な dev/test 環境になる。

**Q: `launch_with_debug_capabilities` は通常より遅くなるのか?**
ならない — 通常はゲートされている追加 RPC エンドポイント (`debug_*` namespace) を有効化するだけだ。パフォーマンスオーバーヘッドは無視できる。コストとしては、prod ではセキュリティリスクになる余分な surface を晒すこと、それだけだ。テスト用には問題ない。

**Q: なぜ L9 の `OpenHlNodeHandle` のように node を `kill()` しないのか?**
Reth が返す `NodeHandle` には、こちらで使うパスでの `kill()` メソッドが無いからだ。Handle を drop して runtime に tear down を任せるのが期待される使い方になる。明示的なクリーンアップが必要な長時間テストでは `node.task_executor.shutdown(...)` を呼ぶが、3 秒の smoke test なら drop で十分だ。

## 次のレッスン (L12)

Reth と Malachite はこれで共存する。**ただし bridge はまだ Reth と話していない。** L12 では `LiveRethEvmBridge::with_live_node()` を build する — さっき bootstrap した `node` を受け取り、`BlockchainProvider` を expose するコンストラクタだ。これによって `build_payload` (L4-L5 の stubbed bridge メソッド) が live な MDBX state に対して **real な** 親ブロック lookup を行えるようになる。これが「Reth が workspace にいる」から「Reth が consensus engine の読むデータを produce している」へ移行する瞬間だ。
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
- **「考えてみよう」「やりがちな勘違い」** は L4-L10 で確立した訳語と統一。
- **タイトル/コードコメントは英語のまま** (OSS 実装にコピーされる前提)。
- **「インフラ」「サブシステム」** はカタカナ (一般定着語)。
