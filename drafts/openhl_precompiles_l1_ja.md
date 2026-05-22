# OpenHL Precompile を作る — L1 draft (JA) — build-along

> openhl SHA `1761d4d` (Stage 9a — custom EVM with CLOB precompile boots via NodeBuilder) 基準。
> コース: `building-openhl-precompiles-ja` (track: `reth-l1-architect`)。

---

## L1 — `openhl-precompiles-evm-scaffold-ja`

- **モジュール:** 1 (Custom EVM bootstrap), モジュール内 sortOrder 0
- **コース全体 sortOrder:** 0 (12 レッスン中 1 番目)
- **所要時間:** 40 分
- **XP:** 80
- **type:** CONTENT

### Content

````markdown
# レッスン 1 — `OpenHlEvmFactory` — すべての EVM 生成にフックする

## ゴール

このレッスンで掴む概念:

- **`EvmFactory` + `ExecutorBuilder` — Reth の「スロットを 1 つだけ差し替える」継ぎ目。** Reth が構築するすべての EVM (payload build、block validation、eth_call RPC、debug RPC) は単一の factory を経由するため、custom precompile は一度登録すればすべての経路に伝播する。
- **`alloy-evm` (抽象トレイト) と `reth-evm` (具体実装) の役割分担。** 両方が必要なのは、トレイト層が EVM の *正体* を表現し、executor 層が Reth による *駆動方法* を表現するため。
- **spec ごとの `Precompiles` を `OnceLock` でキャッシュ。** precompile セットの構築は重く (address のハッシュ化を伴う)、`create_evm` はホットパスなので、各 hardfork 層のセットを 1 度だけ生成して `&'static` として共有する。
- **シグネチャだけ固定した stub による段階的構築。** passthrough の `openhl_precompiles(base) -> Precompiles` は factory を *今* 組み込み可能な形にしておき、本体は L2 で埋める。callsite の書き換えは発生しない。

検証：

```bash
cargo check -p openhl-evm
```

上記の実行結果がクリーンにコンパイル。

具体的な変更:

`crates/evm/src/` 配下に **新規モジュールが 2 個** 増える:

- **`openhl_evm.rs`** — `OpenHlEvmFactory` (Reth の `EvmFactory` スロット) + `OpenHlExecutorBuilder` (Reth の `ExecutorBuilder` スロット)、加えて `OnceLock` 経由で hardfork ごとに precompile を dispatch する仕組み。約 80 LOC。
- **`precompiles/mod.rs`** — `openhl_precompiles(base) -> Precompiles` の **stub**、ひとまずただの passthrough。L2 で本物の read precompile を埋める。

加えて **依存も 5 個追加** (workspace 1 + crate 4 — このうち `reth-node-api` は新規の git-pin 依存)。

L1 が終わると、custom EVM の **構造** が end-to-end で存在することになる。Reth は factory 経由で EVM instance を construct でき、factory 自体の仕事 (custom precompile の登録) はまだ何もしない — それら precompile を定義するのは L2 のため。

## おさらい

Course 7 完了時点の `crates/evm/src/`:

```
crates/evm/src/
├── bridges/                    L4-L5: InMemoryEvmBridge, RethEvmBridge
├── reth_node.rs                L11 (c6): bootstrap proof (test-only)
└── live_node.rs                L12-L14 (c6) + L9-L11 (c7): LiveRethEvmBridge<P>
```

`cargo test -p openhl-evm clob_fills_flow_into_payload --release` は pass する。Bridge が CLOB を所有し、`build_payload` 経由で約定を route する。**しかし bridge の Reth node 内で動くスマートコントラクトからは CLOB が見えない** — L1 はそのギャップを閉じ始めるレッスンだ。

## 計画

やることは 7 つ:

1. **`alloy-evm = "0.34"`** を workspace の `Cargo.toml` に追加。これは public な `alloy-evm` crate (Reth に git-pin されていない) で、`EvmFactory` / `Database` / `EvmEnv` 等を提供する。
2. **`crates/evm/Cargo.toml` に依存を 4 つ追加**: `reth-evm`、`reth-evm-ethereum`、`reth-node-api` (新規 git dep — 同じ SHA)、そして `reth-node-builder` を `[dev-dependencies]` から `[dependencies]` へ昇格。
3. **`crates/evm/src/openhl_evm.rs` を作成** — `OpenHlEvmFactory` + `OpenHlExecutorBuilder` + `precompiles_for(spec)`。
4. **`crates/evm/src/precompiles/mod.rs` を作成** — passthrough の stub。
5. **`pub mod openhl_evm; mod precompiles;`** を `crates/evm/src/lib.rs` に接続。
6. **`OpenHlEvmFactory` と `OpenHlExecutorBuilder` を crate root に re-export** — L3 の NodeBuilder 統合で使うため。
7. **`cargo check -p openhl-evm`** が clean に通ること。

これが course 8 で **依存追加が最も重い** レッスン。scaffold がコンパイルしたら、L2 で本物の precompile を埋め、L3 で NodeBuilder に組み込んで precompile が EVM 実行から到達可能かをテストする。

> 🛑 **考えてみよう。** スクロールする前に — Reth の `EvmFactory` は trait だ。なぜ Reth は 1 つの EVM instance を construct して使い回すのではなく、factory を必要とするのか? ヒント: チェーンで EVM transaction を **実行する** コードパスを思い浮かべる。Block validation (validate_payload)、payload assembly (build_payload)、eth_call RPC、debug RPC — どれも自分の database snapshot で新しい EVM instance を作る。**Factory がある理由は、Reth が EVM を 1 つではなく多数作るからだ。**

## 手順

### Step 1: `alloy-evm` を workspace に追加

ルート `Cargo.toml` を開く。alloy ブロック (course 6 L11 / course 7 L12 後) は次で終わる:

```toml
alloy-rpc-types-engine    = { version = "2.0", default-features = false }
alloy-genesis             = { version = "2.0", default-features = false }
```

**1 行追加**:

```toml
alloy-evm                 = { version = "0.34", default-features = false }
```

`alloy-evm` は public な alloy crate で、REVM の抽象を trait レベル (`EvmFactory` / `Database` / `EvmEnv`) で提供する。crates.io の stable 依存であり、Reth に git-pin されていない — `alloy-genesis` や `alloy-rpc-types-engine` と同じ扱いだ。

> 🛑 **やりがちな勘違い。** 「`alloy-evm` と `reth-evm` は同じもので、どちらかを選べばいい」 — **違う、別の層だ。** `alloy-evm` は任意の EVM 実装が満たせる **抽象** trait (`EvmFactory`、`Database` など) を提供する。`reth-evm` は Reth の **具体** 実装で、それらの trait を block-executor pipeline に組み込む。今回は両方 import する: factory 定義には抽象を、executor 統合には具体を使う。

### Step 2: `crates/evm/Cargo.toml` を更新

`crates/evm/Cargo.toml` を開く。Course 7 L9 + course 6 L12 後の `[dependencies]` セクションには 12 個のエントリがある。ここに 4 つ追加する (新規 3 つ + 昇格 1 つ):

```toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
openhl-clob              = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
alloy-rpc-types-engine   = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }
reth-consensus           = { workspace = true }
reth-ethereum-consensus  = { workspace = true }
reth-primitives-traits   = { workspace = true }
reth-chainspec           = { workspace = true }
reth-engine-primitives          = { workspace = true }
reth-ethereum-engine-primitives = { workspace = true }
reth-evm                 = { workspace = true }                                                                                          # NEW
reth-evm-ethereum        = { workspace = true }                                                                                          # NEW
reth-node-api            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }              # NEW (1-off git dep)
reth-node-builder        = { workspace = true }                                                                                          # NEW (was dev-dep)
alloy-evm                = { workspace = true }                                                                                          # NEW
```

`reth-node-builder` は `[dev-dependencies]` から `[dependencies]` に昇格する — production コード (`OpenHlExecutorBuilder`) がこれを使い始めるため。`[dev-dependencies]` 側の行は削除:

```toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
tempfile             = "3"
# reth-node-builder ここから削除 — 今は production dep
```

**`reth-node-api` だけは workspace 経由ではなく、1 回限りの直接 git dep として宣言する。** workspace の `Cargo.toml` には宣言を置かず、git+rev を inline で書く。これは意図的だ — `reth-node-api` を使う crate は `openhl-evm` だけで、workspace の他の部分には不要。workspace dep に昇格させると、すべての crate の build graph がこれを把握する羽目になる。

> ⚠️ **rev は他の `reth-*` クレートと完全一致させる。** inline で `rev = "88505c7..."` を書くときは、**workspace で固定されている他の `reth-*` クレートとまったく同じコミットハッシュ**でなければならない。Reth は内部 crate 間の型 (`FullNodeTypes`、`NodeTypes`、`BuilderContext` 等) を厳格に共有しており、Cargo の同一バージョン・同一ソースルールにより、わずかな rev のズレでも「同じ名前だが別の型」として扱われ、`expected ChainSpec, found ChainSpec` のような難解な型不一致エラーが大量発生する。`reth-node-api` を独自に「最新版」へ書き換えたい誘惑は強いが、必ず他の `reth-*` の rev をまず upgrade してから合わせること。

> 🛑 **やりがちな勘違い。** 「Reth 関連の依存はすべて workspace dep にすべき、それがパターンだ」 — **必ずしもそうではない。** workspace dep が有用なのは、複数の crate が同じ依存を同じバージョンで必要とする場合。1 つの crate でしか必要としないなら、inline 宣言のほうがクリーンだ — workspace-level の Cargo.toml にエントリが増えず、読み手にとって間接参照も減る。`reth-node-api` は openhl-evm でしか使わないので、それに合わせて扱う。

### Step 3: `crates/evm/src/precompiles/mod.rs` (stub) を作成

`openhl_evm.rs` を書く前に、precompile モジュールが存在している必要がある (`openhl_evm.rs` がそこから import するため)。ディレクトリとファイルを作る:

```bash
mkdir -p crates/evm/src/precompiles
touch crates/evm/src/precompiles/mod.rs
```

`crates/evm/src/precompiles/mod.rs` を開いて書く:

```rust
//! Custom REVM precompiles that expose CLOB state to EVM execution.
//!
//! Stage 9a — scout commit. L2 adds the first real precompile
//! (`clob_read_best_bid` at 0x...0c1b) that returns a hardcoded best-bid
//! response so smart contracts can prove the precompile is reachable.
//! L4+ wires it to live CLOB state.

use alloy_evm::revm::precompile::Precompiles;

/// Wraps Reth's spec-default precompile set, adding openhl's CLOB precompiles.
///
/// L1 (this lesson): passthrough — clones the base unchanged.
/// L2: registers `clob_read_best_bid`.
/// L7+: registers `clob_place_order`.
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    // L2 will replace this with `let mut precompiles = base.clone();
    // precompiles.extend([...]); precompiles`.
    base.clone()
}
```

body は 3 行。関数は `Precompiles` set (現在の hardfork に対する Reth のデフォルト) を受け取って、そのまま返す。**L2 でこの `base` と `return` の間に本物の `clob_read_best_bid` を挿入する。**

この関数のシグネチャは EVM factory が依存する **安定した契約**。L2-L11 でこの関数の **中身** は変わっていくが、`openhl_precompiles(base: Precompiles) -> Precompiles` という shape はずっと変わらない。

> 🛑 **やりがちな勘違い。** 「空の関数なんて無駄なコードだから、L1 と L2 は統合してしまえばいい」 — **passthrough は precompile ロジックを足す前に「構造がコンパイルすること」を証明するために存在する。** L1 と L2 を 1 レッスンにまとめて書いてしまうと、precompile 登録が壊れたときに、読み手は factory の接続が原因か precompile 登録が原因か切り分けられない。レッスンを分けることで、失敗モードが別々に診断できるようになる。

### Step 4: `crates/evm/src/openhl_evm.rs` を作成

これがメインファイル。冒頭:

```rust
//! `OpenHlEvmFactory` + `OpenHlExecutorBuilder` — Reth's `ConfigureEvm` slot,
//! filled with our custom-precompile EVM.
//!
//! Stage 9a (scout commit) — modelled on Reth's `examples/custom-evm/src/main.rs`
//! pattern. The factory's `create_evm` installs `openhl_precompiles(...)` so
//! any EVM execution path (RPC call, payload assembly, validation) sees the
//! CLOB precompile registered at `CLOB_READ_BEST_BID`.

use alloy_evm::{
    eth::EthEvmContext,
    precompiles::PrecompilesMap,
    revm::{
        context::{BlockEnv, Context, TxEnv},
        context_interface::result::{EVMError, HaltReason},
        handler::EthPrecompiles,
        inspector::{Inspector, NoOpInspector},
        interpreter::interpreter::EthInterpreter,
        precompile::Precompiles,
        primitives::hardfork::SpecId,
        MainBuilder, MainContext,
    },
    Database, EvmEnv, EvmFactory,
};
use reth_chainspec::ChainSpec;
use reth_ethereum_primitives::EthPrimitives;
use reth_evm_ethereum::{EthEvm, EthEvmConfig};
use reth_node_api::{FullNodeTypes, NodeTypes};
use reth_node_builder::{components::ExecutorBuilder, BuilderContext};
use std::sync::OnceLock;

use crate::precompiles::openhl_precompiles;
```

import は 20 個ほど。多くは `alloy-evm` の re-export 経由で来る REVM 内部の型だ。一通り眺める価値はあるが、暗記する必要はない:

- **`EvmFactory`** — 実装する trait。Reth は EVM instance が必要になるたびに、factory の `create_evm` を呼ぶ。
- **`ExecutorBuilder`** — `OpenHlExecutorBuilder` に実装する trait。Reth の `NodeBuilder` がこれを使って EVM config を construct する。
- **`Precompiles`** — REVM の precompiled contract コレクション。ここに追加する形になる。
- **`OnceLock`** — std の once-init primitive。spec ごとの precompile セットをキャッシュするのに使う。

次は factory の struct:

```rust
/// EVM factory that registers openhl's custom precompiles on every EVM
/// instance Reth constructs (for payload assembly, block validation, RPC
/// state queries, etc.).
#[derive(Debug, Clone, Default)]
#[non_exhaustive]
pub struct OpenHlEvmFactory;

impl EvmFactory for OpenHlEvmFactory {
    type Evm<DB: Database, I: Inspector<EthEvmContext<DB>, EthInterpreter>> =
        EthEvm<DB, I, Self::Precompiles>;
    type Tx = TxEnv;
    type Error<DBError: core::error::Error + Send + Sync + 'static> = EVMError<DBError>;
    type HaltReason = HaltReason;
    type Context<DB: Database> = EthEvmContext<DB>;
    type Spec = SpecId;
    type BlockEnv = BlockEnv;
    type Precompiles = PrecompilesMap;

    fn create_evm<DB: Database>(&self, db: DB, input: EvmEnv) -> Self::Evm<DB, NoOpInspector> {
        let spec = input.cfg_env.spec;
        let evm = Context::mainnet()
            .with_db(db)
            .with_cfg(input.cfg_env)
            .with_block(input.block_env)
            .build_mainnet_with_inspector(NoOpInspector {})
            .with_precompiles(PrecompilesMap::from_static(precompiles_for(spec)));
        EthEvm::new(evm, false)
    }

    fn create_evm_with_inspector<DB: Database, I: Inspector<Self::Context<DB>, EthInterpreter>>(
        &self,
        db: DB,
        input: EvmEnv,
        inspector: I,
    ) -> Self::Evm<DB, I> {
        EthEvm::new(
            self.create_evm(db, input).into_inner().with_inspector(inspector),
            true,
        )
    }
}
```

8 個の associated type は scaffold だ — どの `EvmFactory` 実装にも必要で、多くは Reth のデフォルトと同じ。**面白いのは `create_evm` のほう。** 5 ステップ:

1. **`Context::mainnet()`** — REVM の「Ethereum mainnet」プリセット (gas 定数など) を取る。
2. **`.with_db(db)` + `.with_cfg(input.cfg_env)` + `.with_block(input.block_env)`** — 渡された database、config、block env を差し込む。
3. **`.build_mainnet_with_inspector(NoOpInspector {})`** — no-op inspector (tracing なし) で EVM を construct。
4. **`.with_precompiles(PrecompilesMap::from_static(precompiles_for(spec)))`** — **precompile をインストール**。`precompiles_for(spec)` が現在の Ethereum hardfork に対する正しい precompile セットを返す。
5. **`EthEvm::new(evm, false)`** — Reth の EthEvm 型でラップ。

`create_evm_with_inspector` は同じパスを、no-op の代わりに custom inspector でたどる。ほとんどの caller は `create_evm` を使い、inspector 版は debug RPC 用だ。

> 🛑 **やりがちな勘違い。** 「factory が `db: DB` を generic で取っているのはなぜ? 具体型の `RevmDatabase` のほうがシンプルだ」 — **Reth はコンテキストごとに別々の database snapshot 型を使うからだ。** Block validation は live な MDBX state を使い、eth_call RPC は履歴 snapshot を使い、debug RPC は in-memory overlay を使うこともある。Factory はそれら全部で動かなければならない。`DB: Database` で generic にすることが、具体型にコミットせずにそれを表現する手段だ。

### Step 5: `precompiles_for(spec)` ヘルパーを追加

Factory impl の下:

```rust
/// Lazily-initialised per-spec precompile sets. `OnceLock` ensures we build
/// each set once and share the static reference across every `create_evm` call,
/// matching the pattern in Reth's custom-evm example. Shanghai/Paris/London
/// don't add new precompiles, so they fall through to the Berlin set.
fn precompiles_for(spec: SpecId) -> &'static Precompiles {
    static PRAGUE: OnceLock<Precompiles> = OnceLock::new();
    static CANCUN: OnceLock<Precompiles> = OnceLock::new();
    static FALLBACK: OnceLock<Precompiles> = OnceLock::new();

    match spec {
        SpecId::PRAGUE | SpecId::OSAKA => {
            PRAGUE.get_or_init(|| openhl_precompiles(Precompiles::prague()))
        }
        SpecId::CANCUN => CANCUN.get_or_init(|| openhl_precompiles(Precompiles::cancun())),
        // For older hardforks (Berlin/London/Paris/Shanghai), use the Berlin
        // set as the most-recent-additions-cutoff base plus ours.
        _ => FALLBACK.get_or_init(|| {
            let base = EthPrecompiles::new(spec).precompiles;
            openhl_precompiles(base)
        }),
    }
}
```

各 Ethereum hardfork ごとに標準 precompile セットが異なる (ECDSA recovery、SHA-256、ModExp、EC-pairing など)。Cancun では blob 用の point evaluation precompile が追加され、Prague でさらに追加される予定だ。**この wrapper の `openhl_precompiles` が、現在 active な base set にカスタム precompile を差し込む。**

`OnceLock` は hardfork 階層ごとに 3 つ用意する:

- **`PRAGUE`** — Prague + Osaka をカバー (Osaka は当面 Prague の precompile を継承する)。
- **`CANCUN`** — Cancun。
- **`FALLBACK`** — Berlin/London/Paris/Shanghai。`EthPrecompiles::new(spec)` を使って、Reth がその spec に対して正しいと判断するセットを取得する。

**`OnceLock` を使い、call ごとに計算しないのはなぜか?** `Precompiles` は HashMap ベースの構造で、construct コストが高い (precompile address を全部 hashing する)。spec ごとに 1 回だけ計算してキャッシュする — これは Reth の custom-evm 例にも示されている定石の最適化だ。キャッシュが効くのは `create_evm` が **非常に** 頻繁に呼ばれるからで、毎 RPC eth_call、毎 block validation、毎 block build で走る。

### Step 6: `OpenHlExecutorBuilder` を追加

`openhl_evm.rs` の末尾に:

```rust
/// Executor builder that swaps in `OpenHlEvmFactory` while keeping all other
/// Reth `EthereumNode` components at default.
#[derive(Debug, Default, Clone, Copy)]
#[non_exhaustive]
pub struct OpenHlExecutorBuilder;

impl<Node> ExecutorBuilder<Node> for OpenHlExecutorBuilder
where
    Node: FullNodeTypes<Types: NodeTypes<ChainSpec = ChainSpec, Primitives = EthPrimitives>>,
{
    type EVM = EthEvmConfig<ChainSpec, OpenHlEvmFactory>;

    async fn build_evm(self, ctx: &BuilderContext<Node>) -> eyre::Result<Self::EVM> {
        Ok(EthEvmConfig::new_with_evm_factory(
            ctx.chain_spec(),
            OpenHlEvmFactory,
        ))
    }
}
```

10 行。`ExecutorBuilder` trait は Reth が用意した hook で、`EthereumNode` が使う EVM config を差し替えるためのもの。associated type の `EVM = EthEvmConfig<ChainSpec, OpenHlEvmFactory>` は「Reth 標準の EthEvmConfig を使うが、こちらの factory でパラメータ化する」という意味だ。`build_evm` がその config を construct する。

trait bound `Node: FullNodeTypes<Types: NodeTypes<ChainSpec = ChainSpec, Primitives = EthPrimitives>>` は、この builder が動作する node の種類を制約する — Ethereum mainnet primitive、こちらの `ChainSpec`。Optimism や OP Stack のような exotic なものはこの bound を満たさない。意図的にそうしている。

**両 struct に付けた `#[non_exhaustive]`** は、後でフィールドを追加しても破壊的な API 変更にならないようにするためのもの。今は unit struct だが、いずれ openhl が configuration を持たせる必要が出ても、この属性のおかげで consumer は `OpenHlExecutorBuilder {}` リテラルで construct できない。

### Step 7: `crates/evm/src/lib.rs` に組み込む

`crates/evm/src/lib.rs` を開く。現状は前コースの bridges + reth_node + live_node モジュールが並んでいる。ここに 2 行追加する:

```rust
//! ... existing module doc ...

pub mod bridges;     // existing
pub mod live_node;   // existing (course 6+)
pub mod openhl_evm;  // NEW
mod precompiles;     // NEW (internal)

#[cfg(test)]
mod reth_node;       // existing (test-only smoke)

pub use openhl_evm::{OpenHlEvmFactory, OpenHlExecutorBuilder};  // NEW
// ... existing re-exports ...
```

変更は 2 点:
- **`pub mod openhl_evm`** — consumer から見えるようにする。
- **`mod precompiles`** — 内部用にとどめ、外部には公開しない。スマートコントラクトは precompile を **address で** 呼ぶので、`openhl-evm` の consumer が `openhl_precompiles` を直接 import する必要はない。

末尾の re-export (`pub use openhl_evm::{OpenHlEvmFactory, OpenHlExecutorBuilder}`) は、これら 2 つの型を consumer 側から `openhl_evm::OpenHlEvmFactory` としてアクセスできるようにするためのもの。L3 の NodeBuilder 統合で使う。

## テスト

```bash
cargo check -p openhl-evm
```

初回ビルドは遅い — `alloy-evm` と新しい Reth crate がそれなりの量のコードを引き込むため、30-60 秒は見ておく。2 回目以降はキャッシュが効く。

期待される出力:

```
   Compiling openhl-evm v0.1.0 (.../crates/evm)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 32.45s
```

警告は出ない (import 一覧は長いが、すべて使われている)。エラーもない。

**既存テストへの回帰確認 (regression check)** — L1 では新モジュールに対する新規テストはまだ追加していないが、依存追加や `lib.rs` の改変が前コースから引き継いだ 39 個のテスト (Course 6 の bridges / live_node、Course 7 の clob bridge integration 等) を壊していないかを確認する:

```bash
cargo test -p openhl-evm --release
```

39 個は引き続き pass するはずだ。**これは L1 の新規ロジックを検証するためのテストではなく、純粋に「構造変更が既存の挙動を壊していない」ことを保証する回帰チェック**である点に注意。新モジュール自体の最初のテストは L3 で追加する (`precompile_is_callable_via_registry`)。もし L1 時点でビルドだけ確認すれば十分という場合は、`cargo check -p openhl-evm` だけでも構造の整合性は担保できる。

よくあるエラーと対処:

- **`error[E0432]: unresolved import 'reth_node_api'`** — inline git dep の追加忘れ。Step 2 を確認する。
- **`error[E0277]: 'EvmFactory' is not implemented for 'OpenHlEvmFactory'` (associated type のどれかで発生)** — 8 個の associated type のどこかにタイポがある。`1761d4d` の参照と突き合わせる。よくあるのは `type Spec = SpecId` を `type Spec = u64` と書いてしまうケースなど。
- **`error[E0282]: type annotations needed for 'PrecompilesMap'`** — `PrecompilesMap::from_static` が generic を返すので、call site が型を知っている必要がある。ここでは `with_precompiles(...)` 呼び出しが推論材料を提供する。compiler が文句を言うなら import を見直す。
- **`unused import: 'openhl_precompiles'`** — この関数は `precompiles_for` の closure 内で参照する。この warning が出るなら、`openhl_precompiles(Precompiles::prague())` の代わりに `Precompiles::prague()` を直接書いてしまっている可能性がある。各 base set を `openhl_precompiles(...)` で包むこと。

## 設計の振り返り

要となる決定が 3 つ:

1. **Factory パターンが「Reth は EVM instance を多数作る」という現実に噛み合う。** Reth は 1 つの EVM を construct して使い回すわけではなく、RPC call ごと、block validation ごと、payload build ごとに新しい EVM を作る。`EvmFactory` trait は「すべての EVM 生成」を 1 箇所でフックする手段だ。**factory は 1 つ、EVM は多数、precompile 登録はどこでも一貫。**

2. **Spec ごとの `OnceLock` がキャッシュとして正しい形。** `Precompiles` セットの構築は軽くない (address の hashing、関数の insertion)。これを `create_evm` 呼び出しのたびにやるのは無駄。spec ごとにキャッシュすれば、hardfork 階層 (Prague、Cancun、fallback) ごとに 1 回だけ construct すれば済む。`OnceLock` がスレッドセーフな lazy 初期化を保証してくれる。

3. **`openhl_precompiles` の passthrough stub が L1 を孤立させる。** 関数は正しいシグネチャで存在するが、まだ何もしない。本体は L2 で埋める。**正しいシグネチャを持つ stub は契約として機能する**: caller (factory) は今すぐ組み込み可能で、実装は call site を変えずに後で着地できる。これが書き直しを伴わない段階的構築のやり方だ。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/openhl_evm.rs ./crates/evm/src/openhl_evm.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
```

`1761d4d` の参照には **完全版** の `precompiles/mod.rs` (Stage 9a の read precompile) が入っている。stub 版とは差が出る:

```bash
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
# 期待: stub は参照より大幅に短い; 参照に大きな追加として差が見える。L2 が欠けている content を追加。
```

`openhl_evm.rs` は厳密に一致するはず (factory の構造は同一; doc コメントの言い回しが違う程度)。

main に戻る:

```bash
git checkout main
```

## よくある質問

**Q: precompile モジュールを `mod precompiles` (private) にして、`pub mod openhl_evm` だけにしているのはなぜ?**
`OpenHlEvmFactory` は consumer が必要とする public API (L3 の NodeBuilder 統合で使う) だが、`openhl_precompiles` は `openhl_evm.rs` の内部でだけ消費される実装詳細だ。precompile モジュールを private に保つことで API の漏出を防ぐ — caller が自分で precompile セットを construct したり改変したりすべきではない。

**Q: `Precompiles::from_static` と `Precompiles::default` の違いは?**
`from_static` は `&'static Precompiles` の参照を取る — つまり precompile セットは「キャッシュして使い回すもの」という前提だ。`default` は新規の (空の) `Precompiles` インスタンスを作る。`create_evm` が `from_static` を使うのは、`OnceLock` でキャッシュされたセットが `'static` だから。キャッシュ + static 参照 = EVM 生成ごとの allocation がゼロ、ということになる。

**Q: なぜ `PRAGUE` が `OSAKA` もカバーするのか?**
Osaka (Prague の次に予定されている hardfork) は、参照 SHA 時点では新たな標準 precompile を導入しない。Osaka で新規 precompile が追加されたタイミングで、この match arm を `OSAKA` と `PRAGUE` の別ブランチに分割すればよい。それまでは同じ `OnceLock` を共有するのが正しい。

**Q: `OpenHlExecutorBuilder` に `Clone` は必要?**
trait は `Clone` を要求しないが、`#[derive(Clone, Copy)]` は安価 (中身のない unit struct なので zero-sized) で、Reth のパターンともマッチする。後で struct にフィールドを足すことになっても、API の使い勝手のために `Clone` は維持しておくのがよい。

## 次のレッスン (L2)

factory は接続できたが、precompile モジュールは passthrough のまま — Reth 標準の precompile だけがインストールされ、追加分はゼロ。L2 で最初の **本物の** precompile を追加する: address `0x...0c1b` の `clob_read_best_bid` だ。当面は hardcoded 値を返す (openhl Stage 9a と同じやり方)。live な CLOB state に接続するのは L4-L5。L2 では関数を定義し、登録し、registry 経由で到達可能にするところまでをやる。
````

---

## Seed ファイルスロット

L1 は Module 1 (Custom EVM bootstrap) sortOrder 0 に入る:

```typescript
{
  title: 'レッスン 1 — OpenHlEvmFactory — すべての EVM 生成にフックする',
  slug: 'openhl-precompiles-evm-scaffold-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 80,
  content: `# レッスン 1 — \`OpenHlEvmFactory\` — すべての EVM 生成にフックする\n\n...`
},
```

## SHA pinning 規律

L1 が `1761d4d` (Stage 9a) を cite。L1 後、reader のコードは構造的にマッチするが `precompiles/mod.rs` は passthrough stub; L2 が埋める。
