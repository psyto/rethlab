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

このレッスンの終わりに:

```bash
cargo check -p openhl-evm
```

…がクリーンにコンパイル。`crates/evm/src/` に **新規モジュール 2 個**:

- **`openhl_evm.rs`** — `OpenHlEvmFactory` (Reth の `EvmFactory` スロット) + `OpenHlExecutorBuilder` (Reth の `ExecutorBuilder` スロット) + `OnceLock` 経由の hardfork ごとの precompile dispatch。約 80 LOC。
- **`precompiles/mod.rs`** — **stub** の `openhl_precompiles(base) -> Precompiles`、そのまま passthrough。L2 で実 read precompile を埋める。

新規依存 **5 個** も追加 (workspace 1 + crate 4 — `reth-node-api` の新規 git-pin dep 含む)。

L1 後、custom EVM **構造** が end-to-end で存在する。Reth が factory 経由で EVM instance を construct でき、factory の仕事 (custom precompile を register) はまだ何もしない、L2 がそれら precompile を定義するから。

## おさらい

Course 7 完了時点で `crates/evm/src/` には:

```
crates/evm/src/
├── bridges/                    L4-L5: InMemoryEvmBridge, RethEvmBridge
├── reth_node.rs                L11 (c6): bootstrap proof (test-only)
└── live_node.rs                L12-L14 (c6) + L9-L11 (c7): LiveRethEvmBridge<P>
```

`cargo test -p openhl-evm clob_fills_flow_into_payload --release` が pass。Bridge が CLOB を所有し、`build_payload` 経由で fill を route する。**だが bridge の Reth node 内で走る smart contract は CLOB を見られない** — L1 が閉じ始めるギャップ。

## 計画

7 つやる:

1. **`alloy-evm = "0.34"`** を workspace `Cargo.toml` に追加。これは public な `alloy-evm` crate (Reth に git-pin されていない)、`EvmFactory`、`Database`、`EvmEnv` 等を提供する。
2. **`crates/evm/Cargo.toml` に 4 dep 追加**: `reth-evm`、`reth-evm-ethereum`、`reth-node-api` (新規 git dep — 同じ SHA)、そして `reth-node-builder` を `[dev-dependencies]` から `[dependencies]` へ昇格。
3. **`crates/evm/src/openhl_evm.rs` を作成** — `OpenHlEvmFactory` + `OpenHlExecutorBuilder` + `precompiles_for(spec)`。
4. **`crates/evm/src/precompiles/mod.rs` を作成** — passthrough stub。
5. **`pub mod openhl_evm; mod precompiles;`** を `crates/evm/src/lib.rs` に配線。
6. **`OpenHlEvmFactory` と `OpenHlExecutorBuilder` を crate root に re-export** — L3 の NodeBuilder 統合のため。
7. **`cargo check -p openhl-evm`** — clean。

これが course 8 で **依存最重量** のレッスン。Scaffold がコンパイルしたら、L2 が実 precompile content を追加; L3 で NodeBuilder に配線、precompile が EVM 実行から到達可能かをテスト。

> 🛑 **考えてみよう。** スクロールする前に: Reth の `EvmFactory` は trait — なぜ Reth が 1 つの EVM instance を construct して再利用するのではなく、factory が必要? ヒント: chain 内で EVM transaction を **実行する** code path を考える。Block validation (validate_payload)、payload assembly (build_payload)、eth_call RPC、debug RPC — どれも fresh な EVM instance を自分の database snapshot で作る。**Factory が存在するのは Reth が多数の EVM を作るから**、1 つではなく。

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

`alloy-evm` は public な alloy crate、REVM の抽象を trait レベルで提供 (`EvmFactory`、`Database`、`EvmEnv`)。stable crates.io 依存で Reth に git-pin されていない — `alloy-genesis` や `alloy-rpc-types-engine` と同じ status。

> 🛑 **やりがちな勘違い。** 「`alloy-evm` と `reth-evm` は同じもの — どちらか選ぶ」。 **違う、別の層。** `alloy-evm` は任意の EVM 実装が満たせる **抽象** trait (`EvmFactory`、`Database` 等) を提供。`reth-evm` は Reth の **具体** 実装、それらの trait を block-executor pipeline に配線する。両方 import する: factory 定義に抽象、executor 配線に具体。

### Step 2: `crates/evm/Cargo.toml` を更新

`crates/evm/Cargo.toml` を開く。Course 7 L9 + course 6 L12 後、`[dependencies]` セクションには 12 entry。4 個追加 (3 個 new + 1 昇格):

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

`reth-node-builder` が `[dev-dependencies]` から `[dependencies]` に移動 — production コード (`OpenHlExecutorBuilder`) が今これを使う。`[dev-dependencies]` から行を削除:

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

**`reth-node-api` は 1 回限りの直接 git dep** (workspace 経由ではない)。Workspace `Cargo.toml` がそれを宣言しない; git+rev を直接 inline 宣言する。意図的: `reth-node-api` は 1 個の crate (`openhl-evm`) でしか使われず、workspace の残りには必要ない。Workspace dep に昇格すると、全 crate の build graph がそれを知る必要が出る。

> 🛑 **やりがちな勘違い。** 「すべての Reth dep は workspace dep にすべき — それがパターン」。 **必ずしも違う。** Workspace dep が有用なのは、複数 crate が同じ dep を同じバージョンで必要とするとき。1 個の crate しか必要としないなら inline 宣言の方がクリーン — workspace-level Cargo.toml のエントリが少なく、reader に対して間接化が少ない。`reth-node-api` は openhl-evm のみ; それに応じて扱う。

### Step 3: `crates/evm/src/precompiles/mod.rs` (stub) を作成

`openhl_evm.rs` を書く前に、precompile モジュールを存在させる必要がある (`openhl_evm.rs` がそこから import するため)。Directory + file を作成:

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

Body 3 行。関数は `Precompiles` set (現在 hardfork に対する Reth のデフォルト) を取り、そのまま返す。**L2 が実 `clob_read_best_bid` を `base` と `return` の間に挿入する。**

関数 signature は EVM factory が依存する **stable contract**。L2-L11 がこの関数の **content** を変更するが、`openhl_precompiles(base: Precompiles) -> Precompiles` は全体を通して同じ shape を保つ。

> 🛑 **やりがちな勘違い。** 「空関数は無駄なコード — L1 + L2 を統合する」。 **passthrough は precompile ロジックを追加する前に **構造がコンパイルすることを証明する**。** L1 + L2 を 1 レッスンとして書き、precompile 登録が壊れていたら、reader は factory 配線と precompile 登録のどちらが原因か分からない。レッスンを分割すると failure mode が別々に addressable になる。

### Step 4: `crates/evm/src/openhl_evm.rs` を作成

メインファイル。ファイル冒頭:

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

20 ほどの import。多くは `alloy-evm` の re-export 経由の REVM 内部。Scan する価値あり、暗記する必要なし:

- **`EvmFactory`** — 実装する trait。Reth は EVM instance が必要なたびに factory の `create_evm` を call する。
- **`ExecutorBuilder`** — `OpenHlExecutorBuilder` に実装する trait。Reth の `NodeBuilder` がこれを使って EVM config を construct する。
- **`Precompiles`** — REVM の precompiled contract コレクション。我々はこれに追加する。
- **`OnceLock`** — std の once-init primitive。Per-spec の precompile セットを cache する。

次に factory struct:

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

8 個の associated type は scaffold — どの `EvmFactory` impl も必要で、多くは Reth のデフォルトと同じ。**興味深い部分は `create_evm`。** 5 step:

1. **`Context::mainnet()`** — REVM の「Ethereum mainnet」プリセット (gas 定数等)。
2. **`.with_db(db)` + `.with_cfg(input.cfg_env)` + `.with_block(input.block_env)`** — 渡された database、config、block env をインストール。
3. **`.build_mainnet_with_inspector(NoOpInspector {})`** — no-op inspector (tracing なし) で EVM を construct。
4. **`.with_precompiles(PrecompilesMap::from_static(precompiles_for(spec)))`** — **precompile をインストール**。`precompiles_for(spec)` が現在 Ethereum hardfork に対する正しい precompile セットを返す。
5. **`EthEvm::new(evm, false)`** — Reth の EthEvm 型でラップ。

`create_evm_with_inspector` は同じ path に no-op の代わりに custom inspector。ほとんどの caller は `create_evm` を使う; inspector variant は debug RPC 用。

> 🛑 **やりがちな勘違い。** 「factory が `db: DB` を generic に取るのは? 具体的な `RevmDatabase` の方がシンプル」。 **Reth は context によって多くの異なる database snapshot 型を使うから。** Block validation は live MDBX state を使う; eth_call RPC は履歴 snapshot を使う; debug RPC は in-memory overlay を使うかも。Factory はそれら全部で動かなければならない。Generic over `DB: Database` が、具体型にコミットせずそれを表現する方法。

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

各 Ethereum hardfork が異なる標準 precompile セットを持つ (ECDSA recovery、SHA-256、ModExp、EC-pairing 等)。Cancun が blob 用の point evaluation precompile を追加。Prague がさらに追加予定。**Wrapper の `openhl_precompiles` が、現在 active な base set に custom precompile を注入する。**

3 個の `OnceLock`、hardfork 階層ごと:

- **`PRAGUE`** — Prague + Osaka をカバー (Osaka が当面 Prague の precompile を継承)。
- **`CANCUN`** — Cancun。
- **`FALLBACK`** — Berlin/London/Paris/Shanghai、`EthPrecompiles::new(spec)` を使って Reth がその spec に対して正しいと考えるセットを取得。

**なぜ `OnceLock` で per call 計算ではない?** `Precompiles` は HashMap ベースの構造で、construct コストが高い (全 precompile address を hashing)。Spec ごとに 1 回計算 + cache が、Reth の custom-evm 例が示す最適化の 1 つ。Caching が重要なのは、`create_evm` が **非常に** 頻繁に call されるから — 毎 RPC eth_call、毎 block validation、毎 block build。

### Step 6: `OpenHlExecutorBuilder` を追加

`openhl_evm.rs` 末尾:

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

10 行。`ExecutorBuilder` trait は Reth の hook、`EthereumNode` が使う EVM config を swap する。Associated type `EVM = EthEvmConfig<ChainSpec, OpenHlEvmFactory>` が「Reth 標準の EthEvmConfig を使うが、我々の factory でパラメータ化する」と言う。`build_evm` がその config を construct する。

Trait bound `Node: FullNodeTypes<Types: NodeTypes<ChainSpec = ChainSpec, Primitives = EthPrimitives>>` がこの builder が動く node の種類を制約する — Ethereum mainnet primitive、我々の `ChainSpec`。より exotic なもの (Optimism、OP Stack) はこれらの bound を満たさない; 意図的。

**両 struct の `#[non_exhaustive]`** が、後で field を追加してもブレーキング API change にならないようにする。今は unit struct; openhl がいずれ configuration を運ばせる必要が出ても、この属性で consumer が `OpenHlExecutorBuilder {}` リテラルで construct できない。

### Step 7: `crates/evm/src/lib.rs` に配線

`crates/evm/src/lib.rs` を開く。現在は前コースの bridges + reth_node + live_node モジュールがある。2 行追加:

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

2 つの変更:
- **`pub mod openhl_evm`** — consumer に visible。
- **`mod precompiles`** — internal、外部に公開しない。Smart contract は **address で** precompile を call する; `openhl-evm` の consumer は `openhl_precompiles` を直接 import する必要なし。

末尾の re-export (`pub use openhl_evm::{OpenHlEvmFactory, OpenHlExecutorBuilder}`) が consumer code から 2 型を `openhl_evm::OpenHlEvmFactory` としてアクセス可能にする。L3 の NodeBuilder 統合がこれらを使う。

## テスト

```bash
cargo check -p openhl-evm
```

初回 run は遅い — `alloy-evm` + 新 Reth crate が non-trivial なコードを引き込む。~30-60 秒予期。以降の run は cache 使用。

期待:

```
   Compiling openhl-evm v0.1.0 (.../crates/evm)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 32.45s
```

警告なし (import list は長いが各 item が使われる)。エラーなし。

既存テストスイートも他に何も壊れていないことを確認:

```bash
cargo test -p openhl-evm --release
```

39 個依然 pass。新モジュールにはまだテストなし — L3 が最初のものを追加。

よくあるエラーと対処:

- **`error[E0432]: unresolved import 'reth_node_api'`** — inline git dep が追加されていない。Step 2 を再確認。
- **`error[E0277]: 'EvmFactory' is not implemented for 'OpenHlEvmFactory'` (ある associated type で)** — 8 個の associated type のどれかに typo。`1761d4d` の参照と比較。最一般: `type Spec = SpecId` vs `type Spec = u64` 等。
- **`error[E0282]: type annotations needed for 'PrecompilesMap'`** — `PrecompilesMap::from_static` が generic を返す; call site が型を知る必要。我々の場合 `with_precompiles(...)` 呼び出しが推論を提供。Compiler が文句を言ったら、import を二重チェック。
- **`unused import: 'openhl_precompiles'`** — 関数は `precompiles_for` の closure で参照される。この warning を見たら、`openhl_precompiles(Precompiles::prague())` の代わりに `Precompiles::prague()` を直接書いたかも。各 base set を `openhl_precompiles(...)` でラップ。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Factory パターンが Reth の「多数の EVM instance」現実とマッチ。** Reth は 1 つの EVM を construct して再利用しない — 各 RPC call、各 block validation、各 payload build で fresh な EVM を作る。`EvmFactory` trait が「すべての EVM 生成」に 1 箇所でフックする方法。**1 factory、多数の EVM、どこでも一貫した precompile 登録。**

2. **Spec ごとの `OnceLock` が正しい caching shape。** `Precompiles` セットの構築は non-trivial (address の hashing、fn の insertion)。`create_evm` call ごとにやるのは cycle の無駄。Per-spec caching が各 hardfork 階層 (Prague、Cancun、fallback) を 1 度だけ construct する。`OnceLock` が thread-safe な lazy init を保証。

3. **`openhl_precompiles` の passthrough stub が L1 を isolated に保つ。** 関数は正しい signature で存在; まだ何もしない。L2 が body を埋める。**正しい signature を持つ stub は契約**: caller (factory) が今配線でき、実装は call site を変えずに後から land できる。これが rewrite を必要としない incremental construction。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/openhl_evm.rs ./crates/evm/src/openhl_evm.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
```

`1761d4d` の参照は **full** な `precompiles/mod.rs` (Stage 9a の read precompile) を持つ。Stub 版はそれと異なる:

```bash
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
# 期待: stub は参照より大幅に短い; 参照に大きな追加として差が見える。L2 が欠けている content を追加。
```

`openhl_evm.rs` は厳密にマッチするはず (factory 構造は同一; doc コメントの言い回しだけ違うかも)。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: precompile モジュールが `mod precompiles` (private) で `pub mod openhl_evm` なのは?**
`OpenHlEvmFactory` は consumer が必要とする public API (L3 の NodeBuilder 統合が使う) だが、`openhl_precompiles` は `openhl_evm.rs` 内部だけで consume される実装詳細。precompile モジュールを private に保つことが API leakage を防ぐ; caller は自分で precompile セットを construct や modify すべきでない。

**Q: `Precompiles::from_static` と `Precompiles::default` の違い?**
`from_static` は `&'static Precompiles` 参照を取る — つまり precompile セットは cache して再利用するもの。`default` は新規 (空) `Precompiles` instance を構築する。`create_evm` が `from_static` を使うのは、`OnceLock`-cache されたセットが `'static` だから。Caching + static 参照 = EVM 生成ごとの allocation なし。

**Q: なぜ `PRAGUE` が `OSAKA` もカバー?**
Osaka (Prague の次の hardfork 案) は参照 SHA 時点で新規標準 precompile を導入しない。Osaka が最終的に新 precompile を追加したら、この match arm が別々の `OSAKA` と `PRAGUE` ブランチに分割される。それまでは同じ `OnceLock` を共有するのが正しい。

**Q: `OpenHlExecutorBuilder` は `Clone` が必要?**
Trait は `Clone` を要求しないが、`#[derive(Clone, Copy)]` は安価 (zero-sized な unit struct)、Reth のパターンとマッチ。後で struct に field を追加するなら、API の ergonomic のために `Clone` を保つべき。

## 次のレッスン (L2)

Factory は配線されたが precompile モジュールは passthrough — Reth 標準 precompile がインストールされ、余分なものなし。L2 が最初の **real** precompile を追加: address `0x...0c1b` の `clob_read_best_bid`。今は hardcoded 値を返す (openhl Stage 9a と同じアプローチ)。L4-L5 が live CLOB state に配線; このレッスンは関数を定義し、register し、registry 経由で到達可能にするだけ。
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
