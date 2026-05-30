// hand-written (NOT auto-generated): building-openhl-precompiles の概念ファースト版コース。
// 散文（WHY）は圧縮し、学習者が手を動かせる実行物（型定義・関数本体・全テスト）を原則として保つ。

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlPrecompilesJA(prisma: PrismaClient) {
  const tags = ["reth", "evm", "precompile", "clob", "l1", "openhl", "expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-precompiles-ja",
      title: "Step 3. Precompiles — EVM 拡張による CLOB ステートのスマートコントラクト連携",
      description:
        "前回構築した CLOB ステートマシンを、カスタム EVM Precompile として再定義し、スマートコントラクト層へシームレスに結合する。コントラクトから well-known なアドレスを介してマッチングエンジンを直接 Read/Write するランタイムを実装。発生した fill（約定イベント）をブリッジ経由で次期ペイロードへ伝播させるデータパイプラインを完遂させる。「DIY Perp シリーズ」の第3ステップ。App-chain のコアとなる EVM 拡張基盤をハックする。",
      difficulty: "EXPERT",
      duration: 400,
      xpReward: 820,
      track: "diy-perp",
      tags,
      isPublished: true,
      sortOrder: 1012,
      locale: "ja",
      instructorName: "RethLab",
      modules: {
        create: [
          {
            title: "Orientation",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "レッスン0 — OpenHL Precompile を作る（CLOB state をスマートコントラクトに接続する）",
                  slug: "openhl-precompiles-orientation-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# レッスン0 — OpenHL Precompile を作る（CLOB state をスマートコントラクトに接続する）

## 問い

前コース（CLOB）は bridge が matching engine を所有する地点で終わった。だが **約定はまだ並列リストにすぎず**、同じ Reth node 上で動くスマートコントラクトからは見えない。CLOB の状態と EVM の状態は別世界にある。どうやってスマートコントラクトが CLOB を read/write できるようにするか？

> 注: OpenHL コースのコードブロックは原則として手元で実行可能な形で示す。ただし \`<file>\` などのプレースホルダや答え合わせ用コマンドは、各レッスンの指示に従って置換してから実行すること。

## 原理（最小モデル）

- **custom EVM precompile = EVM 内の固定 address で native Rust を実行する。** 間に Solidity bytecode は挟まらない。caller からは固定 address への external call に見えるが、実装は自分が選んだ state にフルアクセスできる native Rust。**「もう 1 つのスマートコントラクト」でなく「EVM から呼べる native 関数」**。
- **custom range は \`0x0c00\` 以降。** Ethereum は \`0x01\`〜\`0x0a\` を標準 precompile（ECDSA recovery / SHA-256 等）に予約済み。CLOB precompile は衝突しない並列 range に置く。
- **read + write の 2 パス。** \`0x...0c1b\` で best bid を read、\`0x...0c1c\` で order を発注。これで CLOB は EVM の横の独立構造から、EVM が対話できる **state 拡張** になる。
- **precompile は bridge が所有するのと同じ CLOB instance に触れる。** これがチェーンを「Hyperliquid 型」にする本質 — perp matching engine が同じチェーン上のコントラクトから呼び出せる。

## 具体例

\`\`\`
Solidity contract ──call(0x...0c1b)──► clob_read_best_bid  → (price, qty) を 64-byte で返す
Solidity contract ──call(0x...0c1c, calldata)──► clob_place_order → decode → book.submit → 約定要約
\`\`\`

ゴールは \`cargo test -p openhl-evm bridge_against_custom_evm_node_shares_clob_with_precompile --release\` — コントラクトの call が precompile 経由で order を発注し、既存 book とマッチし、約定が bridge へ流れる。

## 失敗例（誤解）

「Rust の HTTP サービスを並列に立てて、コントラクトから \`call()\` で best_bid を読めばいい」は誤り — **consensus パスで破綻する**。EVM 実行は決定的でなければならず、全 validator が同じ入力から同じ結果を計算する必要がある。外部 HTTP read は非決定的（ネットワーク遅延・サービス状態で結果が変わる）で、validator 間の合意を壊す。read は **EVM 実行内で決定的に完結する native precompile** でなければならない。「precompile を Solidity 関数のように考える」も誤り（precompile は固定 address の native Rust）。

---

ここまでで「precompile は EVM 内の決定的 native 関数」は着地した。ここから先はスコープ・前提・12レッスンのロードマップに入る。L1 以降は実際に Rust を書く。

> 🛑 **予測。** Solidity から CLOB の \`best_bid\` を読みたい。素朴な「Rust の HTTP サービスを並列に立てて \`call()\`」がなぜ consensus パスで破綻するか — そこから read メカニズムはどんな形でなければならないと結論できるか？（答え: EVM 実行は決定的でないと validator が合意できない。外部 read は非決定的。→ read は EVM 内で決定的に完結する native precompile であるべき。）

## 終了時に手にするもの

新規 \`crates/evm/src/precompiles/\` モジュール:
- 既知 EVM address に登録された custom precompile 2 個: \`clob_read_best_bid\`（read、\`(price,qty)\` を 64-byte で返す）/ \`clob_place_order\`（write、calldata から order を decode → CLOB submit → 約定要約を返す）
- custom EVM machinery（\`openhl_evm.rs\`）— Reth executor に precompile を組み込む \`EvmFactory\` + \`ExecutorBuilder\`
- Bridge 統合 — \`LiveRethEvmBridge\` が custom EVM 付き Reth node を spawn し、precompile への call が bridge 所有の同じ CLOB instance に触れる

end-to-end test は ~3 秒（Reth bootstrap → precompile trigger → 約定 assert）。

## 終了時にも手にしないもの（意図的な scope cut）

- 約定を実 EVM tx として block body に encode（約定は payload に attach された並列リストのまま。read/write から *見える* が block body の一部ではない）
- Funding state machine（= Step 4）
- Liquidation / oracle / perp 固有 math
- Multi-market precompile（Stage 9 は CLOB 1 つ。production は market ごと 1 precompile か market-id calldata）

「チェーンのどこかに orderbook がある」→「チェーンそのものが orderbook + EVM」への大きな capability ジャンプ。ループを完全に閉じる（約定を tx として block body に戻す）のは下流。

## 前提

- **CLOB（Step 2）完了** — \`LiveRethEvmBridge<P>\` に \`clob\`/\`pending_fills\`/\`submit_order\`/\`payload_fills\`/\`pending_fill_count\` が揃っていること。
- Rust 1.95+。
- **REVM に trait レベルで慣れていること**（\`Precompile\`/\`PrecompileFn\`/\`Precompiles\` 型。未見なら revm-precompile docs を一読）。
- スレッド境界を越えた共有 state に \`Arc<Mutex<T>>\`。

不要: \`EvmFactory\`/\`ExecutorBuilder\` 予備知識（L1-2 で説明）/ Solidity（raw calldata でテスト）。

## セットアップ確認（今やる）

\`\`\`bash
cd ~/code/openhl-reference
git fetch origin
git log --oneline | grep -E "(1761d4d|b635ef7|a8823a1|d19ba1b|2f796c3|2ba97c6)"
# Stage 9a〜9e の SHA が見えるはず

cd ~/code/my-openhl
cargo test -p openhl-evm clob_fills_flow_into_payload --release 2>&1 | tail -5
# 期待: Step 2 のマイルストーンテストが pass
\`\`\`

## 12レッスンのロードマップ

| # | build するもの | 終了時テスト |
| - | - | - |
| 0 | Orientation（本レッスン） | セットアップ確認 |
| 1 | \`openhl_evm.rs\` — EvmFactory パターン + 依存 | \`cargo check -p openhl-evm\` |
| 2 | \`precompiles/mod.rs\` — hardcoded read precompile + registry | precompile がコンパイル |
| 3 | \`OpenHlExecutorBuilder\` + NodeBuilder 統合; call する smoke test | \`precompile_is_callable_via_registry\` |
| 4 | \`install_clob()\` — Arc-shared CLOB state | bridge が shared state でコンパイル |
| 5 | read precompile を live CLOB state に接続 | precompile が実 best_bid を返す |
| 6 | end-to-end: read が bridge.submit_order の結果を反映 | integration test pass |
| 7 | \`clob_place_order\` signature + calldata decode | precompile が正しく decode |
| 8 | book.submit + 約定要約を返す | precompile が正しく write |
| 9 | \`install_fill_sink()\` — precompile 約定が bridge の pending_fills に流れる | precompile 約定が bridge に届く |
| 10 | bridge が custom-EVM Reth node に spawn | **full pipeline test pass** |
| 11 | Capstone | （recap） |

**マイルストーンは レッスン10** — live Reth node 上で EVM から呼べる CLOB（コントラクトが precompile を call → matching → 約定が bridge を経由して payload に現れる）。レッスン11 で「まだ何が足りないか（約定はまだ EVM tx でない）」を名指す。

## 答え合わせの規律

| Lessons | Stage | SHA |
| - | - | - |
| L1〜3 | 9a + 9e | \`1761d4d\` / \`2ba97c6\` |
| L4〜6 | 9b | \`b635ef7\` |
| L7〜8 | 9c | \`a8823a1\` |
| L9 | 9c+ | \`d19ba1b\` |
| L10 | 9d | \`2f796c3\` |

\`\`\`bash
# レッスン範囲に応じて checkout:
# 1761d4d / b635ef7 / a8823a1 / d19ba1b / 2f796c3 / 2ba97c6
cd ~/code/openhl-reference && git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

本質（型・制御フロー）が一致していればよい。

## 合格基準

- \`cargo test ... bridge_against_custom_evm_node_shares_clob_with_precompile\` を通せる（コース完走時）。
- precompile が「EVM から呼べる native 関数」であることを説明できる。
- なぜ外部 HTTP read が consensus で破綻するか（非決定性）を 1 文で言える。

## まとめ（3行）

- custom EVM precompile は固定 address（\`0x0c00\`+）で native Rust を決定的に実行する — Solidity bytecode なし、external call と同じ呼び出し shape。
- read（\`clob_read_best_bid\`）+ write（\`clob_place_order\`）で CLOB を EVM の state 拡張にする — これがチェーンを「Hyperliquid 型」にする本質。
- precompile は bridge 所有の同じ CLOB instance に触れる。約定の EVM-tx 化（block body への encode）はまだ scope 外。`,
                },
              ],
            },
          },
          {
            title: "Custom EVM bootstrap",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "レッスン1 — OpenHlEvmFactory — すべての EVM 生成にフックする",
                  slug: "openhl-precompiles-evm-scaffold-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン1 — \`OpenHlEvmFactory\` — すべての EVM 生成にフックする

## 問い

custom precompile を、Reth が EVM を作るすべての経路（payload build / block validation / eth_call RPC / debug RPC）に、一度の登録でどう伝播させるか？

## 原理（最小モデル）

- **\`EvmFactory\` + \`ExecutorBuilder\` = Reth の「スロット 1 つ差し替え」継ぎ目。** Reth が構築する全 EVM は単一 factory を経由する → custom precompile は一度登録すれば全経路に伝播。
- **\`alloy-evm\`（抽象 trait）と \`reth-evm\`（具体実装）の役割分担。** trait 層が EVM の *正体*、executor 層が Reth による *駆動方法*。両方 import する。
- **spec ごとの \`Precompiles\` を \`OnceLock\` でキャッシュ。** 構築は重く（address の hashing）、\`create_evm\` はホットパス → hardfork 層ごとに 1 度生成して \`&'static\` で共有。
- **シグネチャ固定の stub で段階的構築。** passthrough の \`openhl_precompiles(base) -> Precompiles\` を *今* 組み込み可能にし、本体はレッスン2 で埋める（callsite 書き換えなし）。

## 具体例

Reth が EVM を作る経路はどれも factory を呼ぶ:

\`\`\`
build_payload（payload assembly）┐
validate_payload（block valid） ├─► OpenHlEvmFactory::create_evm → openhl_precompiles 登録
eth_call RPC                    │
debug RPC                       ┘
\`\`\`

factory は 1 つ、EVM は多数、precompile 登録はどこでも一貫。

## 失敗例（誤解）

「\`alloy-evm\` と \`reth-evm\` は同じで片方選べばいい」は誤り — 別の層（抽象 trait vs Reth の具体実装）、両方 import する。「全 reth dep を workspace dep に」も誤り（1 crate でしか使わない \`reth-node-api\` は inline git-pin が clean）。「passthrough stub は無駄だから L1+L2 統合」も誤り（precompile 登録が壊れたとき factory 接続が原因か登録が原因か切り分けられなくなる）。

---

ここまでで「factory 継ぎ目・2 層・OnceLock・stub」は着地した。ここから scaffold を組み立てる。コードは完全形（precompile 本体はレッスン2）。

> 🛑 **予測。** \`EvmFactory\` は trait。なぜ Reth は 1 EVM instance を使い回さず factory を必要とするか？ ヒント: EVM tx を実行する経路（validation / payload assembly / eth_call / debug RPC）を思い浮かべる。（答え: それぞれ自分の database snapshot で新 EVM を作る。Reth は EVM を 1 つでなく多数作るから factory が要る。）

## ステップで組み立てる

### Step 1: workspace \`Cargo.toml\` に \`alloy-evm\`

\`\`\`toml
alloy-evm                 = { version = "0.34", default-features = false }
\`\`\`

public な alloy crate（REVM 抽象を trait レベルで提供、git-pin でなく crates.io stable）。

### Step 2: \`crates/evm/Cargo.toml\`（3 新規 + 1 昇格）

\`\`\`toml
[dependencies]
# ... 既存 12 entries ...
reth-evm                 = { workspace = true }                                                                              # NEW
reth-evm-ethereum        = { workspace = true }                                                                              # NEW
reth-node-api            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }  # NEW (1-off git dep)
reth-node-builder        = { workspace = true }                                                                              # NEW (was dev-dep)
alloy-evm                = { workspace = true }                                                                              # NEW
\`\`\`

\`reth-node-builder\` を dev-dep から昇格（production の \`OpenHlExecutorBuilder\` が使う）。**\`reth-node-api\` の rev は他の reth-* と完全一致させる** — Reth は内部 crate 間で型（\`FullNodeTypes\`/\`NodeTypes\`/\`BuilderContext\`）を厳格共有し、rev のズレは「同名だが別型」の難解エラーを大量発生させる。1 crate でしか使わないので workspace でなく inline git-pin（build graph を汚さない）。

### Step 3: \`precompiles/mod.rs\`（stub）

\`\`\`rust
//! Custom REVM precompiles that expose CLOB state to EVM execution.
//!
//! Stage 9a — scout commit. レッスン 2 adds the first real precompile
//! (\`clob_read_best_bid\` at 0x...0c1b) that returns a hardcoded best-bid
//! response so smart contracts can prove the precompile is reachable.
//! レッスン 4+ wires it to live CLOB state.

use alloy_evm::revm::precompile::Precompiles;

/// Wraps Reth's spec-default precompile set, adding openhl's CLOB precompiles.
///
/// レッスン 1 (this lesson): passthrough — clones the base unchanged.
/// レッスン 2: registers \`clob_read_best_bid\`.
/// レッスン 7+: registers \`clob_place_order\`.
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    // レッスン 2 will replace this with \`let mut precompiles = base.clone();
    // precompiles.extend([...]); precompiles\`.
    base.clone()
}
\`\`\`

シグネチャ \`openhl_precompiles(base) -> Precompiles\` が factory の依存する **安定契約** — 中身はレッスン2-11 で変わるが shape は不変。

### Step 4: \`openhl_evm.rs\` — imports + factory

\`\`\`rust
//! \`OpenHlEvmFactory\` + \`OpenHlExecutorBuilder\` — Reth's \`ConfigureEvm\` slot,
//! filled with our custom-precompile EVM.
//!
//! Stage 9a (scout commit) — modelled on Reth's \`examples/custom-evm/src/main.rs\`
//! pattern. The factory's \`create_evm\` installs \`openhl_precompiles(...)\` so
//! any EVM execution path (RPC call, payload assembly, validation) sees the
//! CLOB precompile registered at \`CLOB_READ_BEST_BID\`.

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
\`\`\`

8 つの associated type は scaffold（多くは Reth default）。\`create_evm\` が core: ① \`Context::mainnet()\` ② db/cfg/block を差す ③ no-op inspector で build ④ **\`.with_precompiles(...precompiles_for(spec))\` で precompile 登録** ⑤ \`EthEvm\` で wrap。\`db: DB\` を generic にするのは Reth が経路ごとに別 snapshot 型（MDBX / 履歴 / overlay）を使うから。

### Step 5: \`precompiles_for(spec)\`（OnceLock キャッシュ）

\`\`\`rust
/// Lazily-initialised per-spec precompile sets. \`OnceLock\` ensures we build
/// each set once and share the static reference across every \`create_evm\` call,
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
\`\`\`

hardfork ごとに標準 precompile セットが異なる。\`OnceLock\` を 3 つ（PRAGUE+OSAKA / CANCUN / FALLBACK）。\`Precompiles\` は HashMap ベースで構築コストが高く、\`create_evm\` は毎 eth_call / validation / build で走るので spec ごと 1 回キャッシュ（Reth custom-evm 例の定石）。

### Step 6: \`OpenHlExecutorBuilder\`

\`\`\`rust
/// Executor builder that swaps in \`OpenHlEvmFactory\` while keeping all other
/// Reth \`EthereumNode\` components at default.
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
\`\`\`

\`ExecutorBuilder\` は \`EthereumNode\` の EVM config を差し替える Reth の hook。\`EVM = EthEvmConfig<ChainSpec, OpenHlEvmFactory>\`（標準 config をこちらの factory でパラメータ化）。trait bound が Ethereum mainnet primitive + こちらの \`ChainSpec\` に制約（Optimism 等は満たさない、意図的）。\`#[non_exhaustive]\` は将来 field 追加を破壊的変更にしないため。

### Step 7: \`lib.rs\`

\`\`\`rust
pub mod openhl_evm;  // NEW
mod precompiles;     // NEW (internal)

pub use openhl_evm::{OpenHlEvmFactory, OpenHlExecutorBuilder};  // NEW
\`\`\`

\`precompiles\` は内部に留める（スマートコントラクトは address で呼ぶので consumer が \`openhl_precompiles\` を直接 import する必要なし）。factory/builder の re-export はレッスン3 の NodeBuilder 統合で使う。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/openhl_evm.rs ./crates/evm/src/openhl_evm.rs
git checkout main
\`\`\`

\`1761d4d\` は \`precompiles/mod.rs\` の **完全版**（Stage 9a の read precompile）を持つので stub とは差が出る（レッスン2 で埋める）。\`openhl_evm.rs\` は厳密一致するはず。

## 合格基準

\`\`\`bash
cargo check -p openhl-evm
cargo test -p openhl-evm --release   # 既存 39 を壊していない回帰チェック
\`\`\`

初回 ~30-60 秒（alloy-evm + reth crate 取得）。よくあるミス: \`reth-node-api\` git dep 追加忘れ / rev のズレ（型不一致）/ associated type のタイポ / base set を \`openhl_precompiles(...)\` で包み忘れ。

## まとめ（3行）

- \`EvmFactory\` + \`ExecutorBuilder\` で「全 EVM 生成」を 1 箇所フック — precompile を一度登録すれば payload/validation/RPC 全経路に伝播する。
- spec ごとの \`Precompiles\` を \`OnceLock\` でキャッシュ（hot path の \`create_evm\` で再構築しない）。
- passthrough stub（\`openhl_precompiles\`）が安定契約 — factory は今組み込み、本体はレッスン2 で callsite を変えず埋める。`,
                },
                {
                  title: "レッスン2 — clob_read_best_bid — 最初の本物の precompile",
                  slug: "openhl-precompiles-read-hardcoded-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン2 — \`clob_read_best_bid\` — 最初の本物の precompile

## 問い

最初の本物の precompile をどう書くか？ そして Solidity コントラクトがそのまま \`abi.decode\` できるよう、wire format をどう設計するか？

## 原理（最小モデル）

- **\`PrecompileFn\` シグネチャ \`fn(&[u8], u64, u64) -> PrecompileResult\`。** 関数ポインタ（クロージャでない）、3 引数（input / gas_limit / reservoir）固定。registry が関数ポインタを保持するのでこの形に正確に従う。
- **Solidity ABI の 32-byte slot レイアウト。** \`(uint256, uint256)\` は計 64 バイト big-endian、低位バイトは index 31/63。これに合わせれば Solidity がそのまま decode する。
- **hardcoded stub が「接続テスト」と「内容テスト」を分割する。** \`(100, 10)\` を返す（\`unimplemented!()\` でなく）ことで、レッスン3 は precompile の **到達可能性** だけを単独検証できる。
- **\`base.clone()\` で extend-not-replace / address は pub・gas は private。** 標準セット（ECDSA/SHA-256）を保つ。caller は address を要る（call するため）、gas は EVM が内部処理（caller は知らなくてよい）。

## 具体例

64-byte buffer のレイアウト（big-endian u256 ×2、実値は右端に着地）:

\`\`\`
byte: 0 .. 31    | 32 .. 63
      [00..00 64]| [00..00 0a]   ← index 31 = price(100=0x64), index 63 = qty(10=0x0a)
      第1スロット price (u256)  第2スロット qty (u256)
\`\`\`

u256 は 32 バイト固定幅。小さい数でも左（高位）はゼロパディング、右端（低位）に実値。

## 失敗例（誤解）

「8 バイト（u32×2）返せば十分」は誤り — Solidity の \`returns(uint256, uint256)\` は値が小さくても **常に各 32 バイト**。8 バイトだと malformed な \`uint256\` として revert する。「address を \`[u8;20]\` で」も誤り（\`Precompile::new\` は \`Address\` を要求）。「\`unimplemented!()\` にしておく」も誤り（レッスン3 の接続テストが panic し「呼べるか」と「正しい値か」が切り分けられない）。

---

ここまでで「PrecompileFn の形・ABI レイアウト・hardcoded の意図」は着地した。ここから \`precompiles/mod.rs\` を完成させる。コードは完全形（live state 接続はレッスン4-5）。

> 🛑 **予測。** call は 64 バイト（u256×2）を返す。price も qty も u32 に収まるのに、なぜ 8 バイトでなく 64 バイトか？ ヒント: Solidity がネイティブに返す型。（答え: ABI は \`uint256\` を必要 bit 数に関わらず常に 32 バイトに pad する。8 バイトだと Solidity が malformed として revert。wire format は内部表現でなく Solidity ABI に合わせる。）

## ステップで組み立てる

### Step 1: import 拡張

\`\`\`rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
\`\`\`

\`Precompile\`（Address + PrecompileFn の wrapper）/ \`PrecompileId\`（識別子、tracing 用）/ \`PrecompileOutput\`（成功型、消費 gas + 出力 + reserve）/ \`PrecompileResult\`（\`Result<.., PrecompileError>\`、v0 は常に \`Ok\`）/ \`address!\` マクロ / \`Address\`・\`Bytes\`。

### Step 2: 定数（address は pub、gas は private）

\`\`\`rust
/// Address of the "read best bid" precompile.
///
/// Solidity call shape: \`staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)\`
pub const CLOB_READ_BEST_BID: Address = address!("0x0000000000000000000000000000000000000c1b");

/// The minimum gas charge for invoking a CLOB precompile. Tuned later.
const CLOB_BASE_GAS_COST: u64 = 500;
\`\`\`

\`CLOB_READ_BEST_BID\` は \`pub\`（テスト/caller が call する）、\`0x0c1b\` は「CLB」ニーモニックで標準 precompile（1-9）と衝突しない。\`CLOB_BASE_GAS_COST\` は private（EVM が dispatch 中に処理）。

### Step 3: \`read_best_bid\` 関数

\`\`\`rust
/// Stage 9a stub: returns a hardcoded best bid so the precompile is callable
/// without requiring live CLOB state injection. Stage 9b replaces this with
/// an \`Arc<Mutex<Book>>\`-aware closure captured into the precompile.
///
/// \`PrecompileFn\` signature is \`fn(&[u8], u64, u64) -> PrecompileResult\`;
/// the third arg is a \`reservoir\` value (extra gas budget) that we ignore
/// at v0.
///
/// Encoding: 64 bytes total
///   bytes  0..32  big-endian u256 price (hardcoded 100)
///   bytes 32..64  big-endian u256 qty   (hardcoded 10)
// \`PrecompileFn\` signature mandates the \`PrecompileResult\` (i.e. \`Result\`)
// return type. Our v0 stub never errors — gas accounting is the EVM's
// responsibility — but the wrapper is structurally required.
#[allow(clippy::unnecessary_wraps)]
fn read_best_bid(_input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    let mut out = vec![0u8; 64];
    // price = 100 (big-endian u256, rightmost byte holds the value)
    out[31] = 100;
    // qty = 10
    out[63] = 10;

    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
\`\`\`

\`vec![0u8; 64]\`（u256×2 の ABI shape）、\`out[31]=100\`/\`out[63]=10\`（big-endian の低位バイト）、\`PrecompileOutput::new(gas, Bytes, reservoir=0)\`。3 引数すべて \`_\` 接頭辞（v0 は input/gas_limit/reservoir を使わない）。\`#[allow(clippy::unnecessary_wraps)]\` は「常に Ok なら unwrap した型を返せ」lint を黙らせる — \`PrecompileFn\` が \`PrecompileResult\` を要求するので unwrap できない。

### Step 4: \`openhl_precompiles\` を完成版に

\`\`\`rust
/// Build a \`Precompiles\` set that extends Reth's standard precompiles with
/// openhl's CLOB-reading additions. The base set is parameterized over the
/// hardfork's spec id so we inherit Ethereum's evolution (e.g., the
/// BLS-12-381 precompiles activated in Prague).
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    let mut precompiles = base.clone();
    precompiles.extend([Precompile::new(
        PrecompileId::custom("clob_read_best_bid"),
        CLOB_READ_BEST_BID,
        read_best_bid,
    )]);
    precompiles
}
\`\`\`

\`base.clone()\`（\`&Precompiles\` を所有権付き mutable に）→ \`extend([Precompile::new(id, address, fn)])\` → return。\`Precompile::new\` は (PrecompileId, Address, 関数) から作る。レッスン7 で \`clob_place_order\` 用に 2 つ目を同じパターンで追加。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
git checkout main
\`\`\`

本レッスン後、\`precompiles/mod.rs\` は \`1761d4d\` と機能的に同一。

## 合格基準

\`\`\`bash
cargo check -p openhl-evm
grep -r "CLOB_READ_BEST_BID" crates/evm/src/   # const 宣言を確認
\`\`\`

precompile は **callable だが dumb**（book 状態に関わらず同じ答え）。callable 証明はレッスン3、smart 化はレッスン4-5。よくあるミス: import パスのタイポ / \`address!\` マクロ（小文字）を import 忘れ / index 31/63 の取り違え。

## まとめ（3行）

- \`PrecompileFn\` は \`fn(&[u8], u64, u64) -> PrecompileResult\` 固定 — v0 は引数を使わないので \`_\` 接頭辞。
- wire format は Solidity ABI に合わせる（\`(u256,u256)\`=64 バイト、実値は index 31/63）— 内部表現でなく ABI shape。
- hardcoded stub が「接続テスト（レッスン3）」と「内容テスト（レッスン4-6）」を分割する。\`base.clone()\` で extend-not-replace。`,
                },
                {
                  title: "レッスン3 — NodeBuilder への組み込み + registry callability test",
                  slug: "openhl-precompiles-node-wiring-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン3 — NodeBuilder への組み込み + registry callability test

## 問い

precompile が「コンパイルできる」だけでなく「EVM 実行から **到達可能**」であることを、どう証明するか？ そしてテストをどう構成すれば、失敗時にどの層のバグか即わかるか？

## 原理（最小モデル）

- **テストの scope = バグの局在化。** unit test 3 つを段階的 scope（関数本体 → registry 登録 → registry dispatch）で構成 → 失敗すればどの層が壊れているか直接わかる。
- **extend-not-replace の dual assertion。** \`CLOB_READ_BEST_BID\` 登録 **と** \`0x...01\` の ECDSA recover 残存の **両方** を check → 単一 assertion なら見逃す silent-replace バグを捕まえる。
- **\`with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))\`。** explicit-builder 経路。1 スロットだけ差し替え、他 Reth default を継承（「fork しない、configure する」）。
- **integration test は組み立ての assertion（挙動でない）。** 「NodeBuilder + ExecutorBuilder + AddOns が clean に合成」と「precompile が正しいバイトを返す」は別関心事（後者は unit test）。

## 具体例

4 テストの scope 階層（狭→広）:

\`\`\`
① read_best_bid_returns_hardcoded_*        関数本体だけ        → 失敗=レッスン2 Step3
② openhl_precompiles_registers_clob_*      registry 登録の不変条件 → 失敗=レッスン2 Step4 の clone/extend
③ registered_precompile_is_invokable_*     registry 経由 dispatch  → 失敗=Precompile::new の組み立て
④ reth_dev_node_with_openhl_executor       Node 全体の合成(integration) → 失敗=レッスン1 の Factory/Builder 接続
\`\`\`

特定 scope だけ落ちればバグ位置が一意に絞られる。

## 失敗例（誤解）

「executor を closure で inline に書けばいい」は誤り — \`ComponentsBuilder\` が受ける契約は \`ExecutorBuilder\` trait で、closure を inline で書くのは扱いづらい（struct が存在するのは trait が API surface だから）。「テスト③は冗長（①②が通れば dispatch も動く）」も誤り — registry から引いて dispatch する経路は別物で、\`Precompile::new\` の組み立てバグ（関数ポインタ違い等）は①②が通っても③で落ちる。

---

ここまでで「scope 階層・dual assertion・1 スロット差し替え」は着地した。ここから 4 テストを組み立てる。コードは完全形。**これが到達可能性マイルストーン。**

> 🛑 **予測。** \`openhl_precompiles_registers_clob_address\` はなぜ \`CLOB_READ_BEST_BID\` だけでなく \`0x...01\` の ECDSA recover **も** 存在を assert するか？（答え: extend-not-replace の不変条件を強制するため。base を clone+extend でなく新規 set を作るバグだと CLOB は存在するが標準 precompile が消える。ECDSA がなければ署名検証コントラクトが revert。dual assertion が silent-replace を捕まえる。）

## ステップで組み立てる

### Step 1: \`reth_node.rs\` の import 更新

\`\`\`rust
use reth_node_ethereum::{node::EthereumAddOns, EthereumNode};   // EthereumAddOns 追加
use crate::OpenHlExecutorBuilder;
\`\`\`

\`EthereumAddOns\` は \`.with_add_ons(...)\` で必要（explicit-builder 経路は全 slot を埋める）、\`OpenHlExecutorBuilder\` は差し込み対象。

### Step 2: integration test \`reth_dev_node_with_openhl_executor\`（\`mod tests\` 末尾）

\`\`\`rust
    /// Stage 9a: prove that \`NodeBuilder\` accepts \`OpenHlExecutorBuilder\` in
    /// place of Reth's default executor, and that the resulting node still
    /// spawns cleanly with our custom precompile registered.
    ///
    /// Doesn't yet invoke the precompile (that requires deploying a
    /// Solidity contract); just validates the \`EvmFactory\` + \`ExecutorBuilder\`
    /// composition compiles, spawns, and tears down.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn reth_dev_node_with_openhl_executor() {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let expected_chain_id = chain_spec.chain.id();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec);

        let result: Result<()> = async {
            let _handle = NodeBuilder::new(node_config)
                .testing_node(runtime)
                .with_types::<EthereumNode>()
                .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
                .with_add_ons(EthereumAddOns::default())
                .launch()
                .await?;
            // ノードはカスタム EVM とともにクリーンに起動した。これ以上の検査は
            // 不要 — もし EvmFactory や ExecutorBuilder が壊れていれば、
            // ここまで到達せず launch() の時点で失敗している。
            let _ = expected_chain_id;
            Ok(())
        }
        .await;
        if let Err(e) = result {
            panic!("Reth dev node bootstrap with OpenHl EVM failed: {e:?}");
        }
    }
\`\`\`

load-bearing は \`.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))\` — \`components()\` が default \`ComponentsBuilder\` を返し \`.executor(...)\` で 1 スロットだけ上書き（network/payload/pool 等は default 継承）。Step 1（Consensus）の \`.node(...).launch_with_debug_capabilities()\` shorthand と対比。

### Step 3: \`precompiles/mod.rs\` の 3 unit test（ファイル末尾）

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use alloy_primitives::U256;

    /// Direct unit test of the precompile function: invoked with empty input,
    /// it returns the hardcoded (price=100, qty=10) as 64 big-endian u256 bytes.
    #[test]
    fn read_best_bid_returns_hardcoded_price_and_qty() {
        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
        assert_eq!(result.bytes.len(), 64);
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(100u64));
        assert_eq!(qty, U256::from(10u64));
        assert_eq!(result.gas_used, CLOB_BASE_GAS_COST);
    }

    /// Registry test: \`openhl_precompiles()\` extends a base precompile set
    /// with our CLOB precompile at the well-known address. This is what the
    /// Stage 9a \`EvmFactory\` plugs into every EVM instance Reth constructs.
    #[test]
    fn openhl_precompiles_registers_clob_address() {
        let base = Precompiles::cancun();
        let extended = openhl_precompiles(base);

        // The CLOB address must be in the extended set.
        assert!(
            extended.contains(&CLOB_READ_BEST_BID),
            "openhl_precompiles must register the CLOB_READ_BEST_BID address"
        );

        // The base Ethereum precompiles (e.g. ECDSA recover at 0x...01) must
        // still be present — we EXTEND, not replace.
        let ecrecover: Address = alloy_primitives::address!("0x0000000000000000000000000000000000000001");
        assert!(
            extended.contains(&ecrecover),
            "extended set must retain base Ethereum precompiles"
        );
    }

    /// Invoke the registered precompile end-to-end through the registry
    /// (rather than calling \`read_best_bid\` directly). This proves the
    /// registration is wired such that an EVM dispatch to the address hits
    /// our function — the same path Reth's EVM uses on \`staticcall\` to
    /// \`CLOB_READ_BEST_BID\`.
    #[test]
    fn registered_precompile_is_invokable_via_registry() {
        let extended = openhl_precompiles(Precompiles::cancun());
        let precompile = extended
            .get(&CLOB_READ_BEST_BID)
            .expect("CLOB precompile must be registered");

        // Precompile::execute is the public dispatch method — same as what
        // the EVM calls internally when a contract STATICCALLs the address.
        let result = precompile
            .execute(&[], 100_000, 0)
            .expect("call must not error");
        assert_eq!(result.bytes.len(), 64);
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(100u64));
        assert_eq!(qty, U256::from(10u64));
    }
}
\`\`\`

scope を広げる 3 段: ①関数を直接（最狭）②\`openhl_precompiles\` の extend-not-replace を dual assertion ③registry から \`.get().execute()\`（REVM が STATICCALL で使う dispatch のフル経路）。\`U256::from_be_slice\` で 32-byte big-endian を decode。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 2ba97c6
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/reth_node.rs ./crates/evm/src/reth_node.rs
git checkout main
\`\`\`

本レッスン後、\`2ba97c6\`（Stage 9a 統合 + 9e の unit test 3 個）と一致。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_with_openhl_executor --release
cargo test -p openhl-evm --lib precompiles   # 3 unit test
cargo test -p openhl-evm --release           # 42 個（既存 39 + 新規 4 — --lib/integration の名前被りで多少ずれる）
\`\`\`

→ pass。**到達可能性マイルストーン: custom EVM + precompile が EVM 実行から到達可能と証明された。** よくあるミス: \`EthereumAddOns\` を \`node::\` なしで import / \`openhl_precompiles\` が新規 set を作って ECDSA assertion が落ちる / \`Precompile::new\` の引数順違いで③が panic。

## まとめ（3行）

- 4 テストを scope 階層（関数→registry 登録→dispatch→node 合成）で構成 — 特定 scope の失敗がバグ位置を一意に絞る。
- extend-not-replace は dual assertion（CLOB address + ECDSA recover の両方）で守る — 1 assertion は間違った理由で pass しうる。
- \`with_components(...executor(OpenHlExecutorBuilder))\` で 1 スロットだけ差し替え、他は Reth default 継承 — fork でなく configure。`,
                },
              ],
            },
          },
          {
            title: "Read precompile",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "レッスン4 — install_clob() — EVM の state をマッチングエンジンに橋渡しする",
                  slug: "openhl-precompiles-install-clob-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン4 — \`install_clob()\` — EVM の state をマッチングエンジンに橋渡しする

## 問い

precompile は関数ポインタ（\`fn(&[u8], u64, u64) -> PrecompileResult\`）で、環境をキャプチャできない（\`move\` クロージャが書けない）。では bridge が所有する live CLOB state を、どうやって precompile に届けるか？

## 原理（最小モデル）

- **関数ポインタ → プロセスグローバル state が回避策。** 共有 state を \`static\` に置き、precompile が呼び出し時にそこを読む。bridge が \`install_clob\` で書き、precompile が \`current_best_bid()\` で読む。
- **\`RwLock<Option<Arc<Mutex<Book>>>>\` — アクセスパターンが違えばロックの種類も違う。** 外 \`RwLock\` は installed/uninstalled の区別（write 稀）、内 \`Mutex\` は matching engine（write 頻繁）。\`Mutex<Option<...>>\` 1 個だと全 read が 1 箇所のボトルネックを通る。
- **\`Arc<Mutex<Book>>\` で bridge/precompile 境界を越えて所有を共有。** 別々の caller が同じ \`Book\` を見る。Arc =「所有者は複数、データは同じ」。
- **install は replace（error にしない）/ 配管は通すが電流は流さない。** test が install/uninstall を反復する。レッスン4 は配管（static / install 関数 / bridge フィールド型）を繋ぐが \`read_best_bid\` はハードコードのまま — スイッチはレッスン5。

## 具体例

4 層ラッパー \`RwLock<Option<Arc<Mutex<Book>>>>\` の責務分担:

\`\`\`
① RwLock     : install 済みか否か（write=install/uninstall 超レア、read=precompile 毎回・並列OK → RwLock）
② Option     : install 前(None)/後(Some) を型で表現（None→precompile はゼロ encode）
③ Arc        : bridge と static が同じ Book を強参照（所有共有）
④ Mutex<Book>: matching engine 本体の排他保護（submit/best_bid_with_qty、write 頻繁 → Mutex）
\`\`\`

bridge: \`submit_order → .lock().submit\`／precompile: \`current_best_bid → .lock().best_bid_with_qty\` — 同じ Book。

## 失敗例（誤解）

「\`OnceLock\`/\`lazy_static!\` を使えばいい」は誤り — \`OnceLock\` は 1 回しか set できず、test 分離のための install/uninstall 反復に不向き。Rust 1.63+ の \`static RwLock = RwLock::new(None)\`（const fn）が標準イディオム。「\`Mutex<Option<...>>\` 1 個に統合」も誤り（全 read がボトルネック）。

---

ここまでで「process-global static・4 層の責務分担」は着地した。ここから配管を組み立てる（read_best_bid 本体はレッスン5）。コードは完全形。

> 🛑 **予測。** \`PrecompileFn\` は関数ポインタで環境キャプチャ不可。precompile にインスタンスごとの state を渡す唯一の方法は？（答え: \`Arc<Mutex<Book>>\` を引数で渡せない（シグネチャ固定）→ \`static\` から読む。bridge が install で書き、precompile が読む。トレードオフ: プロセスあたり CLOB は 1 つに固定 — 単一バリデータでは受容可能。）

## ステップで組み立てる

### Step 1: \`Book\` に \`best_bid_with_qty\` + \`best_ask_with_qty\`（\`crates/clob/src/book.rs\`）

\`\`\`rust
    /// Best bid price + total qty resting at that price level (sum of every
    /// resting order in the level's FIFO queue). Returns \`None\` if there
    /// are no bids.
    #[must_use]
    pub fn best_bid_with_qty(&self) -> Option<(Price, Qty)> {
        self.bids.iter().next().map(|(rev_price, queue)| {
            let qty: u64 = queue.iter().map(|o| o.qty.0).sum();
            (rev_price.0, Qty(qty))
        })
    }

    /// Best ask price + total qty resting at that price level.
    #[must_use]
    pub fn best_ask_with_qty(&self) -> Option<(Price, Qty)> {
        self.asks.iter().next().map(|(price, queue)| {
            let qty: u64 = queue.iter().map(|o| o.qty.0).sum();
            (*price, Qty(qty))
        })
    }
\`\`\`

\`best_bid()\`（価格のみ）と違い \`(price, そのレベルの FIFO キュー内 qty 合計)\` を返す — precompile の 64-byte 2 値レスポンス用。\`depth_bid()\`（全 bid の注文本数）とは別メトリクス。

### Step 2: \`precompiles/mod.rs\` の import

\`\`\`rust
use openhl_clob::Book;
use std::sync::{Arc, Mutex, RwLock};
\`\`\`

\`RwLock\` は read（precompile 毎回）が write（install プロセス 1 回）より圧倒的多なので並行 read を許す。

### Step 3: \`static CLOB_STATE\`

\`\`\`rust
/// Process-global handle to the CLOB the precompile reads from.
///
/// \`None\` until [\`install_clob\`] is called (typically by \`LiveRethEvmBridge::new\`).
/// While \`None\`, \`read_best_bid\` returns zero-encoded output rather than
/// erroring — this keeps existing tests deterministic and matches what an
/// uninitialised perp market would return on mainnet.
static CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>> = RwLock::new(None);
\`\`\`

\`RwLock::new(None)\` は \`const fn\` でコンパイル時評価 → 実行時の初期化レースが起きない。\`None\` は「未インストール」= ゼロ encode（メインネットの未初期化 perp market と同じ契約）。

### Step 4: 3 つのモジュール関数

\`\`\`rust
/// Install the CLOB instance the precompile should read from. The bridge
/// shares its \`Arc<Mutex<Book>>\` with the global so every EVM-side
/// \`staticcall\` to \`CLOB_READ_BEST_BID\` sees the same book the application
/// writes to via \`submit_order\`.
///
/// Calling this replaces any previously-installed CLOB. Production deployments
/// should call it exactly once at bridge construction.
pub fn install_clob(clob: Arc<Mutex<Book>>) {
    *CLOB_STATE.write().expect("CLOB_STATE rwlock poisoned") = Some(clob);
}

/// Clear the installed CLOB. Used by tests that need a clean slate; rare in
/// production. Idempotent — uninstalling when nothing is installed is a no-op.
pub fn uninstall_clob() {
    *CLOB_STATE.write().expect("CLOB_STATE rwlock poisoned") = None;
}

/// Read the currently-installed CLOB's best bid. Returns \`None\` if no CLOB
/// is installed or if the book has no bids. Public so tests can verify
/// install/uninstall without going through the precompile dispatch.
#[must_use]
pub fn current_best_bid() -> Option<(openhl_clob::Price, openhl_clob::Qty)> {
    let state = CLOB_STATE.read().expect("CLOB_STATE rwlock poisoned");
    let clob = state.as_ref()?;
    let book = clob.lock().expect("clob mutex poisoned");
    book.best_bid_with_qty()
}
\`\`\`

\`install_clob\` は直前を置き換え（idempotent）、\`uninstall_clob\` は主に test 用、\`current_best_bid\` は EVM を経由せず直接テストできるよう公開。**ロック順序の不変条件: 常に外(\`CLOB_STATE\` RwLock)→内(\`Book\` Mutex) の順**（逆順を作らない限り deadlock しない）。

### Step 5: bridge の \`clob\` を \`Arc<Mutex<Book>>\` に（\`live_node.rs\`）

struct フィールドと \`new()\` を変更:

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    /// \`Arc<Mutex<Book>>\` rather than \`Mutex<Book>\` so the bridge can share
    /// its CLOB with the precompile module's process-global state. The bridge
    /// writes via \`submit_order\`; smart contracts read via the
    /// \`clob_read_best_bid\` precompile — both touch the same \`Book\`.
    clob: Arc<Mutex<Book>>,
    pending_fills: Mutex<Vec<Fill>>,
    state: Mutex<State>,
}

impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        let clob = Arc::new(Mutex::new(Book::new()));

        // Make our CLOB visible to the \`clob_read_best_bid\` precompile so
        // smart contracts can query live orderbook state. The bridge writes
        // (submit_order), the EVM reads (precompile); they share the same Arc.
        crate::precompiles::install_clob(Arc::clone(&clob));

        Self {
            provider,
            chain_spec,
            validator,
            clob,
            pending_fills: Mutex::new(Vec::new()),
            state: Mutex::new(State::default()),
        }
    }
\`\`\`

\`Arc::clone(&clob)\` で refcount をインクリメント（bridge と static の両方が強参照）。\`submit_order\` の \`self.clob.lock()\` は \`Arc<Mutex<Book>>\` が \`&Mutex<Book>\` に deref するのでそのまま動く（他の callsite 変更不要）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout b635ef7
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
git checkout main
\`\`\`

本レッスン後、Stage 9b に **部分的に** 一致（新メソッド/static/関数3/bridge フィールド）。残る差: \`read_best_bid\` がまだハードコード（レッスン5）+ レッスン3 の unit test がまだハードコード値を期待。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

→ **42 テスト pass**（レッスン3 の unit test は依然ハードコード値を期待 — \`read_best_bid\` 未変更だから）。配管は通したが電流はまだ流れない。よくあるミス: \`self.clob.deref().lock()\` と書く（\`self.clob.lock()\` が正）/ struct リテラルで \`clob\` を使い忘れ。

## まとめ（3行）

- 関数ポインタ制約への定石は process-global \`static\` — bridge が install で書き、precompile が読む（コストは CLOB 1 つ/プロセス）。
- \`RwLock<Option<Arc<Mutex<Book>>>>\` の 4 層は別々の責務（installed 区別 / 型表現 / 所有共有 / engine 保護）— 重ねるでなく分担。
- レッスン4 は配管（static/install/Arc 共有）を通すが \`read_best_bid\` はハードコードのまま — スイッチはレッスン5。`,
                },
                {
                  title: "レッスン5 — read_best_bid がライブ状態を読む — current_best_bid() に差し替え",
                  slug: "openhl-precompiles-swap-to-live-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン5 — \`read_best_bid\` がライブ状態を読む — \`current_best_bid()\` に差し替え

## 問い

レッスン4 で配管は通ったが \`read_best_bid\` はハードコードのまま。これを live state read にどう差し替えるか？ そして \`cargo test\` の並列実行でプロセスグローバル \`CLOB_STATE\` が競合する問題をどう解くか？

## 原理（最小モデル）

- **未インストール時 zero = 「未初期化 storage slot」のセマンティクス。** Solidity は \`STATICCALL\` の zero を「liquidity なし」と解釈し trade を控える。error にすると boot 中（install 前）の全 transaction が revert する。
- **constant-time precompile = gas 課金で state を漏らさない。** 未インストール時だけ gas を減らすと、attacker が gas を測って validator の state を推測できる。\`CLOB_BASE_GAS_COST\` を一定に保つ。
- **\`cargo test\` 並列 → global 競合 → \`TEST_SERIALIZER\` が必要。** \`CLOB_STATE\` を触るテストが 2 個あると、並列実行で \`Some(clob)\` と \`None\` の間を flap する。\`Mutex<()>\` で直列化。
- **serializer はモジュール単位 / uninstall はテストの *先頭*。** 直列化スコープを狭く。panic したテストは cleanup を走らせない → 次のテスト先頭の reset が safety net。

## 具体例

\`out[24..32]\` への直接書き込み（u64 を u256 の右端 8 byte に zero-extend）:

\`\`\`
slot1: [00..00(24byte) | price BE 8byte]  ← out[24..32].copy_from_slice(&price.0.to_be_bytes())
slot2: [00..00(24byte) | qty   BE 8byte]  ← out[56..64].copy_from_slice(&qty.0.to_be_bytes())
上位 24 byte は vec![0u8; 64] の zero-init のまま（追加コスト 0 で zero-extend 成立）
\`\`\`

24 と 56 は (32−8) と (64−8) の算数 — マジックでない。

## 失敗例（誤解）

「\`U256::from(price.0).to_be_bytes::<32>().copy_from_slice(...)\` が明快」は誤り — 一時 \`[u8;32]\`（うち 24 byte は zero）を allocate して 32 byte memcpy する。直接 \`out[24..32].copy_from_slice(&price.0.to_be_bytes())\` なら 8 byte memcpy のみ（仕事半分、precompile は hot path）。「\`serial_test\` crate を使う」も誤り（global 1 つに mutex 1 行で済む）。

---

ここまでで「zero セマンティクス・constant gas・直列化」は着地した。ここから差し替える。コードは完全形（e2e proof はレッスン6）。

> 🛑 **予測。** \`cargo test\` は並列実行。\`CLOB_STATE\` を read/write するテストが 2 つあるとき、直列化しないとどんな失敗モードか？（答え: **flaky test**。A が install して B が「CLOB なし→zero」を assert したいのに、B が A の install/uninstall の間に走ると A の CLOB を見て間違った値を assert。スケジューリング次第で 0〜30% failure。CI がランダム flake。\`TEST_SERIALIZER\` で 1 つずつ走らせて排除。）

## ステップで組み立てる

### Step 1: \`read_best_bid\` 本体を差し替え

\`\`\`rust
#[allow(clippy::unnecessary_wraps)]
fn read_best_bid(_input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    let mut out = vec![0u8; 64];

    if let Some((price, qty)) = current_best_bid() {
        // Big-endian u256: rightmost bytes carry the value.
        out[24..32].copy_from_slice(&price.0.to_be_bytes());
        out[56..64].copy_from_slice(&qty.0.to_be_bytes());
    }
    // If no CLOB is installed or there are no bids, \`out\` stays all zeros —
    // matches what an uninitialised perp market would return on mainnet.

    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
\`\`\`

\`current_best_bid()\` を read、\`None\` なら short-circuit で \`out\` は zero のまま。\`price.0.to_be_bytes()\`（\`[u8;8]\`）を 32-byte word の右端（24..32）にコピー — 上位 24 byte は zero のまま = u64 の big-endian u256 encoding。ハードコードの \`out[31]=100\`/\`out[63]=10\` は消える。doc コメントも「0 if no bid or no CLOB installed」に更新（コントラクトは「未インストール」と「empty book」を見分けられない、意図的）。

### Step 2: テストモジュールに \`TEST_SERIALIZER\`

\`\`\`rust
/// Tests in this module touch process-global \`CLOB_STATE\`. This mutex
/// serializes them so parallel test execution can't observe a torn state.
static TEST_SERIALIZER: Mutex<()> = Mutex::new(());
\`\`\`

\`CLOB_STATE\` を触る各テストは冒頭で \`let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);\`。\`unwrap_or_else(PoisonError::into_inner)\` が **死活問題** — これがないとテスト 1 つの panic で mutex が poison し以降全テストが落ちる（poison から復旧して「panic したが後続は走る」にする）。型推論が詰まる環境では \`unwrap_or_else(|e| e.into_inner())\` の明示クロージャ形が安定。

### Step 3: レッスン3 の 2 テストを更新（zero output を期待 + 直列化）

\`\`\`rust
    /// With no CLOB installed, the precompile returns 64 zero bytes —
    /// matching what an uninitialised perp market would report on mainnet.
    #[test]
    fn read_best_bid_returns_zero_when_no_clob_installed() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        uninstall_clob();

        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
        assert_eq!(result.bytes.len(), 64);
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::ZERO);
        assert_eq!(qty, U256::ZERO);
        assert_eq!(result.gas_used, CLOB_BASE_GAS_COST);
    }
\`\`\`

\`registered_precompile_is_invokable_via_registry\` も同様に冒頭で \`TEST_SERIALIZER\` 取得 + \`uninstall_clob()\` を追加し、\`assert_eq!(price, U256::ZERO)\` に変更:

\`\`\`rust
    #[test]
    fn registered_precompile_is_invokable_via_registry() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        uninstall_clob();

        let extended = openhl_precompiles(Precompiles::cancun());
        let precompile = extended
            .get(&CLOB_READ_BEST_BID)
            .expect("CLOB precompile must be registered");
        let result = precompile
            .execute(&[], 100_000, 0)
            .expect("call must not error");
        assert_eq!(result.bytes.len(), 64);
        // No CLOB → zero output.
        let price = U256::from_be_slice(&result.bytes[0..32]);
        assert_eq!(price, U256::ZERO);
    }
\`\`\`

**uninstall はテスト先頭**（panic したテストは末尾 cleanup を走らせない → 次のテスト先頭の reset が safety net、idempotent なので常に安全）。**真ん中の \`openhl_precompiles_registers_clob_address\` は \`CLOB_STATE\` を触らない**ので serializer/uninstall を加えない（不要な直列化）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
git checkout main
\`\`\`

本レッスン後、Stage 9b に **かなり近い**（本体・TEST_SERIALIZER・更新 2 テスト）。残る差は \`read_best_bid_returns_live_state_*\`（レッスン6）。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

→ **42 テスト pass**（precompile を触る 4 テストのうち 2 つが直列化、修正 2 テストが zero output を assert）。よくあるミス: \`Mutex\` を tokio から import（\`std::sync::Mutex\` が正）/ \`_g\` の取得が \`uninstall_clob()\` の後 / \`use openhl_clob::{Order, ...}\` を消す（レッスン6 で使う、unused 警告は無害）。

## まとめ（3行）

- 未インストール時は zero を返す（error でなく）— 未初期化 perp market のセマンティクス、boot 中の revert を避ける。
- u64 → u256 は右端 8 byte に直接コピー（\`out[24..32]\`）— 中間 \`[u8;32]\` を確保しない hot path 最適化。
- \`TEST_SERIALIZER\`（モジュール単位 \`Mutex<()>\`）+ テスト先頭の \`uninstall_clob()\` で並列 \`cargo test\` の global 競合を排除。`,
                },
                {
                  title: "レッスン6 — 読み出しマイルストーン — ラウンドトリップを証明する",
                  slug: "openhl-precompiles-live-state-proof-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン6 — 読み出しマイルストーン — ラウンドトリップを証明する

## 問い

read チェーン全体（\`Solidity → STATICCALL → EVM dispatch → precompile → live Book → encode → コントラクト\`）が end-to-end で動くことを、どう証明するか？

## 原理（最小モデル）

- **read チェーンを end-to-end で繋ぐ。** \`CLOB に bid 発注 → bridge が Mutex 経由で書く → precompile が global 経由で read → 64-byte ABI encode → 呼び出し元に返す\`。チェーン全体を一度に走査する最初のテスト。
- **敵対的テストデータ > ランダム。** order 2 個を意図的に: \`(250, 7)\`（正しい答え）と \`(240, 99)\`（反復順を間違えたら取る larger-qty の罠）。50 個のランダム order より価値が高い。
- **dispatch test と behavior test を分割。** レッスン5 は \`Precompile::execute\` 経由で到達可能を証明。レッスン6 は \`read_best_bid\` を直接呼び live state を読むことを証明。混ぜると失敗時のデバッグが難しくなる。
- **assertion メッセージは保守者へのドキュメント。** \`"best bid is the 250 order, not 240"\` はどの不変条件が壊れたか伝える（素の \`left=240 right=250\` は値しか伝えない）。

## 具体例

\`(250, 7)\` と \`(240, 99)\` を install して \`read_best_bid\` を呼ぶと:

\`\`\`
素朴「最大 qty」    → (240, 99)  ✗
素朴「最後 submit」 → (240, 99)  ✗
正しい「最高価格」  → (250, 7)   ✓  ← best bid は最高価格であって最大数量ではない
\`\`\`

market sell は最高価格 250-bid に最初にぶつかり、250 を使い切ってから 240 に下りる。

## 失敗例（誤解）

「order 1 つでテストすれば十分」は誤り — \`(250,7)\` 1 つだけなら素朴な実装も全 pass し、正しさと偶然を切り分けられない。\`(240,99)\` を加えて初めて「best=最高価格」を証明できる（最小 order 数は 2）。「dispatch+behavior+state を 1 テストに束ねる」も誤り（失敗時にどこが壊れたか覆い隠す）。

---

ここまでで「e2e チェーン・敵対的データ」は着地した。ここからテストを追加する（production コード変更ゼロ）。コードは完全形。**これが読み出しマイルストーン。**

> 🛑 **予測。** \`(price=250, qty=7)\` と \`(price=240, qty=99)\` を install。\`read_best_bid\` は何を返すか？（答え: \`(250, 7)\`。best bid = 最高価格であって最大数量でない。qty=99 は悪い価格 240 にあり候補にすら入らない。market sell が最初にぶつかる先 = 250。）

## ステップで組み立てる

テストモジュールの import に \`Order, OrderId, AccountId, OrderType, Price, Qty, Side\` が含まれることを確認（レッスン5 を通して残しておいた）し、\`read_best_bid_returns_zero_when_no_clob_installed\` と \`openhl_precompiles_registers_clob_address\` の間に追加:

\`\`\`rust
    /// **Stage 9b end-to-end**: install a CLOB with a known bid, call the
    /// precompile, observe the live data flow through to the EVM-visible
    /// response. This is the moment custom EVM execution reads real
    /// orderbook state.
    #[test]
    fn read_best_bid_returns_live_state_when_clob_installed() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);

        let book = Arc::new(Mutex::new(Book::new()));
        // Rest a buy @ 250 with qty 7
        book.lock().unwrap().submit(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(7),
            order_type: OrderType::Limit { price: Price(250) },
        });
        // Rest another buy @ 240 (lower; shouldn't be picked as best bid)
        book.lock().unwrap().submit(Order {
            id: OrderId(2),
            account: AccountId(43),
            side: Side::Buy,
            qty: Qty(99),
            order_type: OrderType::Limit { price: Price(240) },
        });

        install_clob(book);

        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(250u64), "best bid is the 250 order, not 240");
        assert_eq!(qty, U256::from(7u64), "qty at the best level is 7");

        uninstall_clob();
    }
\`\`\`

要点:
- 冒頭で \`TEST_SERIALIZER\` 取得（**\`uninstall_clob()\` は呼ばない** — すぐ自分の CLOB を install するから、\`install_clob\` が原子的に置き換える）。
- order 2 個の **敵対的データ**（\`(240,99)\` が罠）。\`OrderId\` は別々に（\`submit\` は OrderId をキーにするので使い回すと上書き）。
- \`install_clob(book)\` で \`book\` を **move**（\`Arc::clone\` でない — install 後使わないので）。
- \`read_best_bid(&[], ...)\` を **直接呼ぶ**（dispatch はレッスン5 で証明済み、ここは behavior を 1 assertion に絞る）。
- assertion メッセージがドキュメント。
- **末尾で \`uninstall_clob()\`**（このモジュールで明示 cleanup するのはこのテストだけ — 空でない CLOB を install したまま終わるので、次の zero-output テストが拾わないように）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
git checkout main
\`\`\`

本レッスン後、\`precompiles/mod.rs\` は Stage 9b と **バイト単位で同一**（doc を変えていなければ）。\`git diff b635ef7 -- crates/evm\` が空になる。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm --release returns_live_state
cargo test -p openhl-evm --release   # 43 個（既存 42 + 本レッスン 1）
\`\`\`

→ pass。**この \`ok\` 行が読み出しマイルストーン** — custom EVM precompile が live matching engine の state を read し、データが EVM から見える出力 bytes までラウンドトリップする。よくあるミス: \`best_bid_with_qty\` が \`.iter().next_back()\`（最高価格は \`.next()\`）/ 全レベルを sum（best level の \`queue.iter()\` のみ）/ \`install_clob(book)\` 後に \`book\` を使う（move 済み）。

## まとめ（3行）

- read チェーン全体（Solidity→dispatch→precompile→live Book→encode→コントラクト）を 1 本の assert_eq! で e2e 証明する。
- 敵対的データ（\`(250,7)\` + 罠の \`(240,99)\`）が「best=最高価格、最大数量でない」を証明 — 正しさと偶然を切り分ける最小 order 数は 2。
- dispatch（レッスン5）と behavior（レッスン6）を別テストに分割 — 片方の失敗がもう片方を覆い隠さない。`,
                },
              ],
            },
          },
          {
            title: "Write precompile",
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: "レッスン7 — clob_place_order — calldata デコード scaffold",
                  slug: "openhl-precompiles-place-order-scaffold-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン7 — \`clob_place_order\` — calldata デコード scaffold

## 問い

read precompile（\`0x...0c1b\`）でコントラクトは CLOB を *読める* ようになった。では *書く* には？ write 側 precompile を、挙動より先に「呼べる schema」として固定するにはどうするか？

## 原理（最小モデル）

- **schema-first：calldata layout は public な契約。挙動より先にロックする。** \`0x...0c1c\` に露出した瞬間からコントラクトが呼ぶ。レッスン7 で入力 layout を固定すれば、レッスン8 で挙動を足しても caller を壊さない。
- **128-byte ABI 入力 = 32-byte slot 4 個。** Solidity ABI は scalar を 32-byte word に詰める。\`u64\` は右端 8 byte（\`[0;24] + [u64 BE]\`）。4 word = \`account_id\` / \`side\` / \`price\` / \`qty\`。
- **precompile は panic でなく soft fail。** 4 つの rejection path（長さ不足・無効 side byte・\`qty==0\`・CLOB 未 install）は sentinel \`0\` を返し tx を revert しない。caller は EVM-level error でなく分岐可能な値を受け取る。
- **\`AtomicU64::fetch_add(1, Relaxed)\` で ID 採番。** ID に必要なのは一意性だけ（atomic が保証）。他 state との同期不変条件は不要（Book が自前 Mutex を持つ）→ 最弱の ordering を選ぶ。\`Mutex<u64>\` だと order 発注が 1 クリティカルセクションに直列化される。
- **sentinel 0 には 1 始まりが必須。** ID が 0 始まりだと最初の成功 order も 0 を返し「rejected」と区別できない。1 始まりなら割当 ID は必ず \`> 0\`、\`0\` は曖昧さなく rejection。

## 具体例

128-byte calldata のメモリ配置（4 × 32-byte slot、値は各 slot 右端に右寄せ）:

\`\`\`
  slot 0 (input[ 0.. 32])  account_id   bytes  24..32  = u64 BE  ← u64_from_be_chunk(&input[0..32])
  slot 1 (input[32.. 64])  side         byte   63      = u8      ← side_byte = input[63]
  slot 2 (input[64.. 96])  price        bytes  88..96  = u64 BE  ← u64_from_be_chunk(&input[64..96])
  slot 3 (input[96..128])  qty          bytes 120..128 = u64 BE  ← u64_from_be_chunk(&input[96..128])
\`\`\`

u64 を載せる slot は絶対 byte 位置 \`[32×N + 24 .. 32×N + 32]\`。side は slot 1 の最右端 1 byte（\`32×1 + 31 = 63\`）。パーサが \`[24..32]\` を拾う理由も、テストヘルパーが \`buf[88..96]\` を price に使う理由も、すべてこの zero pad / value 境界 — マジックでなく ABI 規約 + 算数。

## 失敗例（誤解）

「まだ使わない \`account_id\` / \`price\` を parse する必要はない」は誤り — レッスン7 の仕事は *schema を確定する* こと。全フィールドを parse する形がそのまま契約になり、レッスン8 で parse 対象を変えると間にビルドされた全コントラクトが壊れる（未使用 binding は \`_\` 接頭辞で許容する）。「malformed input は panic でよい」も誤り — panic は precompile error として tx revert に伝播する。caller にハンドリング余地（ログ・リトライ・表示）を残すには sentinel \`0\` を返す。

---

ここまでで schema-first・soft fail・atomic 採番は着地した。ここから precompile を組み立てる（\`read_best_bid\` と read 側のテストには手を入れない — 純粋に追加）。**ただし \`book.submit(...)\` はまだ呼ばない**（それはレッスン8）。コードは完全形。レッスン7 は書き込みパスの scaffold レッスン — read 側の レッスン2 に相当する。

> 🛑 **予測。** read precompile は空入力（\`&[]\`）で 64 byte を返した。\`place_order\` は 128 byte 入力で 32 byte を返す。**なぜ Solidity は u64 を 32 byte に pad するか？**（答え: ABI は 1 slot = 固定 32 byte。\`f(uint64,uint8,uint64,uint64)\` は pack せず 4×32=128 byte を割当て、各値は slot 内で右寄せ。precompile は通常の call opcode で呼ばれ同じ規約に従う。パーサは各 slot の意味ある 8 ないし 1 byte だけ読む。）

## ステップで組み立てる

### Step 1: import 拡張

\`openhl_clob\` import を拡張してマッチングエンジン型を引き込み、\`std::sync\` に atomic を追加する（型はレッスン8 で \`Order\` を組み立てるのに使う — import は今のうちに入れて diff をレッスン7 の関心事に絞る）:

\`\`\`rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
use openhl_clob::{AccountId, Book, Order, OrderId, OrderType, Price, Qty, Side};
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc, Mutex, RwLock,
};
\`\`\`

### Step 2: アドレス定数 + 原子カウンタ

\`CLOB_READ_BEST_BID\` の後ろに（ニーモニック \`0c1c\` = 「CL[ob] [pla]C[e]」、\`0c1b\` の隣）:

\`\`\`rust
/// Address of the "place order" precompile (write path — Stage 9c).
///
/// Solidity call shape (ABI-aligned 128-byte input):
/// \`call(gas, 0x...0c1c, calldata=(uint64 account, uint8 side, uint64 price, uint64 qty), ...) → uint256 order_id\`
///
/// \`side\` encoding: 0 = Buy, 1 = Sell. Any other value → call returns 0
/// (rejected, no state change). Order type is hardcoded to Limit at v0.
///
/// Return: 32 bytes; the last 8 are a big-endian u64 \`order_id\`. A return
/// of 0 means the order was rejected (no CLOB installed, malformed input,
/// or invalid side byte) — distinguishable from "placed" because allocated
/// IDs start at 1.
pub const CLOB_PLACE_ORDER: Address = address!("0x0000000000000000000000000000000000000c1c");
\`\`\`

\`CLOB_BASE_GAS_COST\` の後ろに:

\`\`\`rust
/// Monotonic order-ID counter for orders placed via the EVM. Starts at 1
/// so the sentinel value 0 (returned on rejection) is distinguishable from
/// a successfully placed order.
///
/// **Single-validator caveat:** This is a process-global counter. For
/// multi-validator deployments, order IDs must come from consensus —
/// each validator's precompile must allocate the same ID for the same
/// EVM-side call, which means the counter has to be either deterministic
/// from input or read from a shared block-scoped state. Out of scope at v0.
static NEXT_ORDER_ID: AtomicU64 = AtomicU64::new(1);
\`\`\`

焼き込んだ決定 2 つ: ① **0 でなく 1 始まり** — \`0\` を rejection sentinel に使うため。0 始まりだと最初の成功 order が 0 を返して区別できない。② **\`Mutex<u64>\` でなく \`AtomicU64\`** — \`fetch_add\` は wait-free、\`Mutex::lock\` はブロックする。ID 採番は発注の hot path に乗るので、mutex だと全発注が 1 クリティカルセクションに直列化される。multi-validator では ID を consensus から採るべき（doc コメントに silent な chain-divergence 失敗モードを明記しておく）— v0 スコープ外。

### Step 3: u64_from_be_chunk ヘルパー

\`read_best_bid\` の下、\`openhl_precompiles\` の上に:

\`\`\`rust
/// Read a big-endian u64 from the last 8 bytes of a 32-byte ABI chunk.
fn u64_from_be_chunk(chunk: &[u8]) -> u64 {
    debug_assert!(chunk.len() == 32);
    let mut buf = [0u8; 8];
    buf.copy_from_slice(&chunk[24..32]);
    u64::from_be_bytes(buf)
}
\`\`\`

\`debug_assert!\` で長さチェック（release では消える）、\`from_be_bytes\` は \`[u8; 8]\` を要求するので 8 byte をスタックバッファにコピー、外から使わないので private \`fn\`。\`try_into().unwrap()\` でも release では同一命令にコンパイルされる — 名前付きヘルパーが節約するのは認知負荷。

### Step 4: place_order 関数

\`read_best_bid\` の下、\`u64_from_be_chunk\` の上に:

\`\`\`rust
/// Place a limit order on the installed CLOB. The write counterpart to
/// \`read_best_bid\` — completes the EVM ↔ CLOB bidirectional surface.
///
/// Calldata layout (ABI-aligned, 128 bytes):
/// \`\`\`text
///   [  0.. 32]  account_id  (u64 in last 8 bytes)
///   [ 32.. 64]  side        (u8 in last byte: 0 = Buy, 1 = Sell)
///   [ 64.. 96]  price       (u64 in last 8 bytes)
///   [ 96..128]  qty         (u64 in last 8 bytes)
/// \`\`\`
///
/// Returns 32 bytes: the allocated \`order_id\` in the last 8 bytes, or zero
/// on rejection (no CLOB installed, malformed input, invalid side byte).
/// Allocated IDs start at 1, so zero is unambiguously "rejected".
///
/// NOTE: this scaffold parses + validates + allocates an order_id, but does
/// NOT yet submit the order to the book — that one line lands next.
#[allow(clippy::unnecessary_wraps)]
fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    let mut out = vec![0u8; 32];

    // Need exactly 128 bytes of input (4 × ABI-padded fields).
    if input.len() < 128 {
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    }

    let _account_id = u64_from_be_chunk(&input[0..32]);
    let side_byte = input[63];
    let _price_value = u64_from_be_chunk(&input[64..96]);
    let qty_value = u64_from_be_chunk(&input[96..128]);

    let _side = match side_byte {
        0 => Side::Buy,
        1 => Side::Sell,
        _ => return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)),
    };

    // Reject orders with zero quantity outright — the book accepts them
    // technically, but a zero-qty order is always a bug from the caller.
    if qty_value == 0 {
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    }

    let state = CLOB_STATE.read().expect("CLOB_STATE rwlock poisoned");
    if state.as_ref().is_none() {
        // No CLOB installed → 0 sentinel.
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    }
    drop(state); // released early — the submit line lands next lesson

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

    // Scaffold stops here. Next: clob.lock().submit(Order { ... }).

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
\`\`\`

5 つの逐次ステップ、rejection はそれぞれ **早期 return**（ネストした \`if\` にせず happy path を線形に保つ）。\`_account_id\`/\`_price_value\`/\`_side\` の \`_\` は「parse 済み、まだ使わない」マーカー（レッスン8 で外す）。冒頭 \`< 128\` の長さチェックは guard — 以降の \`input[X]\` を provably safe にする（アクセスごとの bounds-check も panic リスクもなし）。\`drop(state)\` を ID 採番前に置くのは read lock 保持窓を縮めるため（read lock を握ったまま実行すると、その間ずっと他主体の \`install_clob\` をブロックする）。

> 🛑 **やりがちな勘違い。** 「なぜ \`Ordering::Relaxed\` で \`SeqCst\` でないのか？」 — ID は他 state と ordering 依存を持たないから。\`Relaxed\` は atomicity（2 スレッドが同じ ID を得ない）は保証するが他メモリ操作との同期はしない。ID を book への書き込みと順序づける必要はない（book は自前 mutex を持ち、それが可視性順序を提供する）。\`SeqCst\` は increment ごとにフェンスを足すだけで得るものがない。**必要な不変条件のうち最弱の ordering を選ぶ。**

### Step 5: openhl_precompiles を両方登録

\`extend\` に precompile を 2 つ（要素 2 つの配列）渡す:

\`\`\`rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    let mut precompiles = base.clone();
    precompiles.extend([
        Precompile::new(
            PrecompileId::custom("clob_read_best_bid"),
            CLOB_READ_BEST_BID,
            read_best_bid,
        ),
        Precompile::new(
            PrecompileId::custom("clob_place_order"),
            CLOB_PLACE_ORDER,
            place_order,
        ),
    ]);
    precompiles
}
\`\`\`

doc コメントも「CLOB-reading additions」→「CLOB-reading + CLOB-writing additions」に更新（今やらないとコードと乖離する）。

### Step 6: 3 テスト + ヘルパー

\`#[cfg(test)] mod tests\` 内、レッスン6 のラウンドトリップテストの後に:

\`\`\`rust
    /// Helper: build a 128-byte ABI-aligned \`place_order\` calldata buffer.
    fn place_order_calldata(account: u64, side: u8, price: u64, qty: u64) -> Vec<u8> {
        let mut buf = vec![0u8; 128];
        buf[24..32].copy_from_slice(&account.to_be_bytes());
        buf[63] = side;
        buf[88..96].copy_from_slice(&price.to_be_bytes());
        buf[120..128].copy_from_slice(&qty.to_be_bytes());
        buf
    }

    /// With no CLOB installed, \`place_order\` rejects (returns sentinel 0).
    #[test]
    fn place_order_returns_zero_when_no_clob_installed() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        uninstall_clob();

        let calldata = place_order_calldata(42, 0, 100, 5);
        let result = place_order(&calldata, 100_000, 0).expect("precompile must not error");
        let order_id = U256::from_be_slice(&result.bytes[0..32]);
        assert_eq!(order_id, U256::ZERO);
    }

    /// \`place_order\` with bad input (too short, invalid side byte, zero qty)
    /// rejects — returns the sentinel 0.
    ///
    /// NOTE: this test only checks the return value. A \`book.depth_bid() == 0\`
    /// side-effect assertion lands once submit is wired in.
    #[test]
    fn place_order_rejects_malformed_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        install_clob(Arc::new(Mutex::new(Book::new())));

        // Too short.
        let r = place_order(&[0u8; 64], 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "short input rejects");

        // Invalid side byte.
        let bad_side = place_order_calldata(42, 7, 100, 5);
        let r = place_order(&bad_side, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "bad side byte rejects");

        // Zero qty.
        let zero_qty = place_order_calldata(42, 0, 100, 0);
        let r = place_order(&zero_qty, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "zero qty rejects");

        uninstall_clob();
    }

    /// \`place_order\` on the happy path returns a non-zero order ID.
    ///
    /// NOTE: this only proves we **return** a non-zero ID; coverage extends to
    /// prove the order is actually visible on the book in the round-trip test.
    #[test]
    fn place_order_returns_nonzero_id_on_valid_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        install_clob(Arc::new(Mutex::new(Book::new())));

        let calldata = place_order_calldata(0xABCD, 0, 175, 12);
        let result = place_order(&calldata, 100_000, 0).expect("precompile must not error");
        let order_id = U256::from_be_slice(&result.bytes[0..32]);
        assert!(order_id > U256::ZERO, "allocated id must be > 0 sentinel");

        uninstall_clob();
    }
\`\`\`

ヘルパーは 4 つの論理値から 128-byte バッファを組み立て、ABI パディングを各テストから隠す。1 テスト 1 関心事（未 install→0 / malformed→0 の 3 path / valid→nonzero ID）— fail したテスト名そのものが原因を指す。malformed テストは戻り値だけ見る（\`depth_bid==0\` の side-effect チェックは submit 接続後に追加）、valid テストも ID が *返る* ことだけ（book に乗ったかは次レッスン）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
git checkout main
\`\`\`

このレッスン後、あなたのコードは Stage 9c に **近いが特定地点で止まっている** — diff は空にならない。Stage 9c は ① ID 採番と encoding の間に \`book.submit(...)\` を呼ぶ ② \`place_order_rejects_malformed_input\` に \`depth_bid()==0\` assertion を持つ ③ \`place_order_then_read_best_bid_round_trips\` テストを持つ — どれもこの scaffold にはまだない。次レッスンで全部足して 9c を閉じる。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm --release            # 46 個（既存 43 + 本レッスン 3）
cargo test -p openhl-evm --release place_order # 3 個 pass
\`\`\`

→ pass。read_best_bid と read 側 43 テストは無変更（純粋追加）。よくあるミス: \`AccountId/Order/...\` を import したが未使用で warning（レッスン8 で全部使うので消さない・\`#[allow(unused_imports)]\` か warning 許容）/ \`_side\` の underscore を外して unused-variable warning / 個別 pass・スイート fail（\`TEST_SERIALIZER\` lock が最初の文でない）。

## まとめ（3行）

- schema-first：\`0x...0c1c\` の 128-byte calldata layout と 32-byte 戻り値を *挙動より先に* 確定 — 公開した日から契約が安定する。
- 4 つの rejection path は sentinel \`0\` を返し panic しない（1 始まり ID が \`0\`=rejection を曖昧さなくする）。happy path は ID を採番して返すが **まだ book に書かない**。
- ID 採番は \`AtomicU64::fetch_add(1, Relaxed)\` — 一意性だけ要る／Book が同期を担う／hot path を直列化しない。`,
                },
                {
                  title: "レッスン8 — book.submit(...) — 書き込みパスが live になる",
                  slug: "openhl-precompiles-place-order-write-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン8 — \`book.submit(...)\` — 書き込みパスが live になる

## 問い

\`place_order\` は parse・検証・ID 採番までやるが、まだ book に書かない。read 側はレッスン6 で live になった。書き込みパスを閉じ、**EVM 実行が CLOB state を mutate する** 最初の瞬間を作るには？

## 原理（最小モデル）

- **precompile は on-chain caller を代表する。** テストが \`book.lock().submit(...)\` を直接呼ぶのは bridge（off-chain）の模倣。\`place_order\` が書くのは EVM transaction（on-chain）の模倣。ここが EVM 実行が CLOB を mutate し始める瞬間。
- **precompile 2 + Arc 1 + 共有 state = ラウンドトリップ成立。** 両 precompile が \`CLOB_STATE\` 経由で read/write するため \`0x...0c1c\` の write が即 \`0x...0c1b\` の read から見える。レッスン4 のアーキはこの瞬間のため。
- **schema-first だから behavior-second は小さい。** レッスン7 は ~70 行（定数・atomic・parser・登録・tests）。本レッスンは ~7 行（submit + binding rename + テスト拡張）だけ。契約を先に固めたから挙動追加が圧縮される。
- **副作用テストには handle 保持が要る。** レッスン7 の malformed テストは Arc を捨てて book を inspect できなかった。\`let book = Arc::new(...); install_clob(book.clone());\` で直す — clone（refcount++）が「戻り値テスト」と「state テスト」を分ける。
- **\`_result\` は future-intent マーカー。** \`_result\`=「値はあるが今は使わない、将来使う」、\`_\`=「明示的に使わない」。\`submit\` が返す \`Vec<Fill>\` を \`_result\` に捨て、レッスン9 で \`fills\` に改名して route する。

## 具体例

\`place_order\` への変更は実質: ① ID 採番と encoding の間に \`clob.lock().submit(Order{...})\` を挟む ② \`_account_id\`/\`_price_value\`/\`_side\` の \`_\` を外す（今度こそ使う）③ \`None\` チェックを \`let-else\` に書き換える（\`clob\` が \`state\` 内部を借りるので \`state\` を \`book.submit()\` まで延命）。テストは malformed テストに \`depth_bid()==0\` を足し、happy-path テストをラウンドトリップに置換。

## 失敗例（誤解）

「\`book.clone()\` でなく \`book\` を渡せばいい」は誤り — \`install_clob(Arc<Mutex<Book>>)\` は Arc を move し、inspect 用ローカル handle を失う。\`Arc::clone\` は関数呼び出しをまたいで所有権を共有する安価な手段（atomic increment 1 回）。「\`drop(book)\` は NLL があるので不要」は機械的には正しいが、encoding と \`Ok()\` 構築の間ロックを握り続けない宣言として明示する（hot path のロック窓を縮める／後段に別ロックが増えても安全性を読み取りやすい）。

---

ここまでで「precompile = on-chain caller」「Arc 1 つがラウンドトリップを成立させる」は着地した。ここから ~7 行を足す。コードは完全形。**このラウンドトリップが書き込みマイルストーン** — EVM ↔ CLOB のサーフェスが双方向になる瞬間だ。

> 🛑 **予測。** \`Book\` を install し \`place_order\` で Buy を発注、\`read_best_bid\` で読む。**もし read と write の precompile が *別々の* \`Arc<Mutex<Book>>\` を持っていたら？**（答え: テストは fail。read 側は空 book を見て 0 を返す。ラウンドトリップが成立する唯一の理由は、両 precompile が同じ \`CLOB_STATE\` から読み、その global が 1 つの Arc を保持し、その Arc が 1 つの Book を指すから。precompile ごとに private state を持てば機能的に切り離され、同じ CLOB に話せない。）

## ステップで組み立てる

### Step 1: place_order に submit を追加

qty チェックの後ろのロックセクションを次に置き換える（\`drop(state)\` が消え、\`is_none\` チェックが \`let-else\` になる）:

\`\`\`rust
    let state = CLOB_STATE.read().expect("CLOB_STATE rwlock poisoned");
    let Some(clob) = state.as_ref() else {
        // No CLOB installed → 0 sentinel.
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    };

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

    let mut book = clob.lock().expect("clob mutex poisoned");
    let _result = book.submit(Order {
        id: OrderId(order_id_val),
        account: AccountId(account_id),
        side,
        qty: Qty(qty_value),
        order_type: OrderType::Limit {
            price: Price(price_value),
        },
    });
    drop(book);

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
\`\`\`

\`Some\` で bind したあとは **\`state\` を drop してはいけない** — \`clob\`（\`state\` への参照）を \`clob.lock()\` まで有効に保つ必要がある。\`submit\` は \`Vec<Fill>\`（生じた約定）を返すが、ここでは \`_result\` に捨てる（レッスン9 で route）。\`drop(book)\` で encoding/return の前に Book ロックを手放す。

binding の \`_\` 接頭辞も外す（今度は実際に使う）:

\`\`\`rust
    let account_id = u64_from_be_chunk(&input[0..32]);   // was _account_id
    let side_byte = input[63];
    let price_value = u64_from_be_chunk(&input[64..96]); // was _price_value
    let qty_value = u64_from_be_chunk(&input[96..128]);

    let side = match side_byte {                          // was _side
        0 => Side::Buy,
        1 => Side::Sell,
        _ => return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)),
    };
\`\`\`

レッスン7 で parse 済みのデータが、そのまま \`Order\` 構造体に流れ込む。doc コメントの「submit はまだ呼ばない」NOTE は削除し、代わりに「\`submit\` が返す fills を捨てている」Side note を残す（レッスン9 で埋める *既知の* ギャップだと将来の読者に伝わり、見落としと誤解されない）。

> 🛑 **やりがちな勘違い。** 「どうせスコープ末尾で release されるのに、なぜ \`drop(book)\` を明示するか？」 — encoding（\`out[24..32]\`）と \`Ok()\` 構築がまだ残っているから。どちらもロックを必要としない。明示 drop は「このロックは用済み」という宣言で、hot path のロック保持窓を目に見えて縮める。Rust の NLL で機械的には省略可能だが、後段に \`FILL_SINK\` など別ロック取得が増えても安全性を読み取りやすいガードレールにもなる。

### Step 2: place_order_rejects_malformed_input を depth_bid check で拡張

レッスン7 のテストは Book を install しても Arc を捨てて state を確認できなかった。次に置き換える:

\`\`\`rust
    /// \`place_order\` with bad input (too short, invalid side byte, zero qty)
    /// rejects without mutating state.
    #[test]
    fn place_order_rejects_malformed_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let book = Arc::new(Mutex::new(Book::new()));
        install_clob(book.clone());

        // Too short.
        let r = place_order(&[0u8; 64], 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO);
        assert_eq!(book.lock().unwrap().depth_bid(), 0, "no order on book after short input");

        // Invalid side byte.
        let bad_side = place_order_calldata(42, 7, 100, 5);
        let r = place_order(&bad_side, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO);
        assert_eq!(book.lock().unwrap().depth_bid(), 0, "no order on book after bad side");

        // Zero qty.
        let zero_qty = place_order_calldata(42, 0, 100, 0);
        let r = place_order(&zero_qty, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO);
        assert_eq!(book.lock().unwrap().depth_bid(), 0, "no order on book after zero qty");

        uninstall_clob();
    }
\`\`\`

\`let book = Arc::new(...); install_clob(book.clone());\` で Arc をローカルに残す。追加した 3 つの \`depth_bid() == 0\` が side-effect 側の証明 — レッスン7 の \`U256::ZERO\` assertion は「sentinel を *返す*」しか見なかったが、ここで「**何も書き込んでいない**」も確かめる。

> 🛑 **やりがちな勘違い。** 「なぜ \`book\` でなく \`book.clone()\`？」 — \`install_clob(book.clone())\` のあと、global が 1 つの Arc、このスコープの \`book\` がもう 1 つを保持する（どちらも同じ Book）。\`install_clob(book)\` だと \`.lock().depth_bid()\` を呼ぶローカル handle を失う。

### Step 3: happy-path テストをラウンドトリップに置換

\`place_order_returns_nonzero_id_on_valid_input\` を削除し、これを追加:

\`\`\`rust
    /// **Stage 9c end-to-end (write side)**: place a Buy via the precompile,
    /// then read the best bid via the read precompile. The two-precompile
    /// round-trip is the moment the EVM ↔ CLOB surface becomes bidirectional.
    #[test]
    fn place_order_then_read_best_bid_round_trips() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let book = Arc::new(Mutex::new(Book::new()));
        install_clob(book);

        // EVM call: place Buy @ 175 with qty 12, account 0xABCD.
        let calldata = place_order_calldata(0xABCD, 0, 175, 12);
        let result = place_order(&calldata, 100_000, 0).expect("precompile must not error");
        let returned_id = U256::from_be_slice(&result.bytes[0..32]);
        assert!(
            returned_id > U256::ZERO,
            "place_order must return a non-zero order id on success"
        );

        // Now read the best bid via the read precompile. Should see our order.
        let read_result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
        let price = U256::from_be_slice(&read_result.bytes[0..32]);
        let qty = U256::from_be_slice(&read_result.bytes[32..64]);
        assert_eq!(price, U256::from(175u64), "best bid is the placed order's price");
        assert_eq!(qty, U256::from(12u64), "qty at best level matches placed qty");

        uninstall_clob();
    }
\`\`\`

「追加」でなく「置き換え」なのは、レッスン7 の \`assert!(order_id > ZERO)\` が新テストの \`assert!(returned_id > ZERO)\` に **包含される** から（包含されるテストは coverage を増やさずメンテだけ増える死荷重）。2 つの precompile call は独立 — \`read_best_bid\` は \`place_order\` を知らないが、両者が \`CLOB_STATE\` 経由で同じ Arc を read/write する。Solidity 視点ではこう:

\`\`\`solidity
uint256 order_id = call(0x...0c1c, abi.encode(0xABCD, 0, 175, 12));   // ~ id > 0
(uint256 price, uint256 qty) = staticcall(0x...0c1b, "");             // ~ (175, 12)
\`\`\`

EVM call は別々、precompile も別々だが、global を共有するので state も共有される。そのグローバルを install するのが bridge で、bridge 自身の \`submit_order\` もそこに書く（bridge の \`pending_fills\` はまだ何も受け取らない — レッスン9 で直す）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
git checkout main
\`\`\`

このレッスン後、あなたのコードは Stage 9c と一致する。diff は **空**（自分で書き換えた doc コメントの言い回しを除けば）。**これで Stage 9c が閉じる。**

## 合格基準

\`\`\`bash
cargo test -p openhl-evm --release round_trips  # 1 個 pass = 書き込みマイルストーン
cargo test -p openhl-evm --release              # 46 個（テスト数据え置き：1 置換 + 1 拡張）
\`\`\`

→ pass。テスト数はレッスン7 と同じ 46（\`..._returns_nonzero_id...\` → \`..._round_trips\` の置換と malformed テストの拡張）。よくあるミス: \`let Some(clob) = state.as_ref() else {...};\` の後に \`drop(state)\` を足す（E0382 borrow of moved value）/ \`Order\` リテラル側の \`_\` は外したが parse 行が \`let _account_id\` のまま（E0425）/ \`Price(qty_value)\` のようなフィールド取り違え（round-trip が \`left=200 right=175\`）/ \`depth_bid\` が Book に無い（Step 2（CLOB）で追加済みのはず）。

## まとめ（3行）

- \`clob.lock().submit(Order{...})\` の 1 行で書き込みパスが live に — schema を先に固めたので挙動追加は ~7 行。
- precompile 2・Arc 1・共有 state でラウンドトリップ成立（\`0x...0c1c\` write が \`0x...0c1b\` read から見える）= 書き込みマイルストーン。
- 副作用テストは \`book.clone()\` で handle を保持して \`depth_bid()\` を検証 — \`submit\` が返す \`Vec<Fill>\` は \`_result\` に捨てる（レッスン9 で route）。`,
                },
              ],
            },
          },
          {
            title: "Bridge統合",
            sortOrder: 4,
            lessons: {
              create: [
                {
                  title: "レッスン9 — install_fill_sink — 約定を bridge に戻す",
                  slug: "openhl-precompiles-fill-sink-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン9 — \`install_fill_sink\` — 約定を bridge に戻す

## 問い

レッスン8 で \`place_order\` は book に書き、ラウンドトリップも証明した。だが \`submit\` が返す \`Vec<Fill>\` は \`_result\` に捨てている。EVM 経由で発注された order の約定を、bridge の payload（\`build_payload\` が drain する \`pending_fills\`）まで届けるには？

## 原理（最小モデル）

- **shared-buffer パターンは一般化する。** レッスン4 の「\`Arc<Mutex<T>>\` + プロセスグローバル」を約定にそのまま再利用。primitive が一度あれば、追加の共有 state は ~20 行で済む。レッスン4 の抽象化が複利で効く。
- **直交した global = 直交したテスト setup。** \`CLOB_STATE\` と \`FILL_SINK\` を 1 つにまとめると全テストが両方 install する羽目に。分けておけば各テストは触る分だけ install できる（composable、uninstalled なら実行時コスト 0）。
- **common case の early-out は free。** \`if !submit_result.fills.is_empty()\` で、order が交差せず rest する主流ケースの sink ロック取得をスキップ。hot path に分岐 1 つ足すだけで \`RwLock\` 取得を節約。
- **sink push の前に \`drop(book)\`。** Book と sink を同時保持するとロック順序 hazard が出る。Book guard を明示 drop してロック取得を厳密に逐次化する。
- **doc コメント = 借金トラッカー。** レッスン8 の「fills discarded」doc は load-bearing だった（意図的ギャップを明示）。ここでギャップを閉じ doc も更新する — 文書化されたギャップは半分修正済み、未文書化は invisible debt。

## 具体例

precompile（\`fn\` ポインタ）は bridge への参照をキャプチャできない（→ \`CLOB_STATE\` と同じ制約）。だから約定を届ける方法は「bridge が所有するバッファを install し、precompile は global 経由で push」一択 — read 側で解いたのと同じ shared-Arc パターンの自然な拡張だ。レッスン9 で order → Book → Fill → payload の loop が初めて閉じ、on-chain（\`place_order\`）と off-chain（\`bridge.submit_order\`）の 2 writer が同じ \`pending_fills\` に合流する。

## 失敗例（誤解）

「CLOB と fill-sink を 1 つの global にまとめればいい（\`Option<(Arc<Mutex<Book>>, Arc<Mutex<Vec<Fill>>>)>\`）」は誤り — install タイミングが違う。\`read_best_bid\` だけ exercise するテストは sink 不要。束ねると毎テストで両方準備する羽目になる。global を直交に保てば、各テストは触る分だけ install できる（static が 2 つあるコストは名前空間だけ、利得はテストごとの合成可能性）。

---

ここまでで「shared-buffer の一般化」「直交 global」は着地した。ここから 1 バッファぶんの配管（\`precompiles/mod.rs\` に 5 編集 + \`live_node.rs\` に 2 編集）を足す。コードは完全形。

> 🛑 **予測。** 約定を bridge に届ける案は 3 つ: (a) precompile が bridge を直接呼ぶ (b) bridge がポーリング (c) precompile が push する共有バッファを install。**なぜ (c) がアーキからほぼ強制されるか？**（答え: precompile は \`fn\` ポインタで \`&Bridge\` をキャプチャできない（(a) は \`CLOB_STATE\` で解いた「fn ポインタは closure を持てない」問題そのもの）。(b) は bridge が「ポーリングすべき」と知る必要があり関心分離に反する。(c) は \`CLOB_STATE\` と同じパターン — 共有 CLOB state がある以上、共有 fill state はその自然な拡張。）

## ステップで組み立てる

### Step 1: Fill を import

\`crates/evm/src/precompiles/mod.rs\` の openhl_clob import に \`Fill\` を追加:

\`\`\`rust
use openhl_clob::{AccountId, Book, Fill, Order, OrderId, OrderType, Price, Qty, Side};
\`\`\`

\`Fill\` は Step 2（CLOB）の値型で \`price: Price\` / \`qty: Qty\` を持つ（Copy 可能）。\`live_node.rs\` は既に import 済みなので変更しない。

### Step 2: FILL_SINK + install/uninstall 関数

\`uninstall_clob\` の後ろに:

\`\`\`rust
/// Process-global handle to the buffer where the precompile pushes fills.
///
/// Same lifecycle rules as \`CLOB_STATE\`: installed by \`LiveRethEvmBridge::new\`,
/// none until set. When set, \`place_order\` extends this buffer with any fills
/// produced by the matched order, so production-shape EVM-placed orders flow
/// into the next \`build_payload\`'s drained fills exactly like bridge-side
/// \`submit_order\` does.
static FILL_SINK: RwLock<Option<Arc<Mutex<Vec<Fill>>>>> = RwLock::new(None);

/// Install the \`pending_fills\` buffer the precompile should write to.
/// Companion to \`install_clob\`. Calling this replaces any previously-installed
/// sink.
pub fn install_fill_sink(sink: Arc<Mutex<Vec<Fill>>>) {
    *FILL_SINK.write().expect("FILL_SINK rwlock poisoned") = Some(sink);
}

/// Clear the installed fill sink. Test-only typical use; idempotent.
pub fn uninstall_fill_sink() {
    *FILL_SINK.write().expect("FILL_SINK rwlock poisoned") = None;
}
\`\`\`

\`CLOB_STATE\` と構造的に対称（外側 \`RwLock\` = 稀な install/uninstall、内側 \`Mutex\` = 頻繁な write）。2 関数は CLOB 版のミラー（body 1 行、\`pub fn\`、doc でライフサイクルを明示）。

### Step 3: place_order を約定 push まで拡張

レッスン8 の \`let _result = book.submit(...); drop(book);\` 周辺をこう変える:

\`\`\`rust
    let mut book = clob.lock().expect("clob mutex poisoned");
    let submit_result = book.submit(Order {
        id: OrderId(order_id_val),
        account: AccountId(account_id),
        side,
        qty: Qty(qty_value),
        order_type: OrderType::Limit {
            price: Price(price_value),
        },
    });
    drop(book);

    // Stage 9c+: route any fills produced by this order through the bridge's
    // pending_fills buffer so they reach the next \`build_payload\`. Drops
    // silently if no sink is installed (consistent with no-CLOB → return 0).
    if !submit_result.fills.is_empty() {
        let sink_state = FILL_SINK.read().expect("FILL_SINK rwlock poisoned");
        if let Some(sink) = sink_state.as_ref() {
            sink.lock()
                .expect("fill_sink mutex poisoned")
                .extend(submit_result.fills.iter().copied());
        }
    }

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
\`\`\`

変化 3 つ: \`_result\`→\`submit_result\`（レッスン8 で予告した「将来」が来た）/ \`if !...is_empty()\` early-out（rest だけの主流ケースでロックをスキップ）/ \`as_ref()\`→\`lock()\`→\`extend()\`（read パターンと同形）。\`Fill\` は Copy なので \`.iter().copied()\`（\`.into_iter()\` より安価、\`submit_result\` の他フィールドを消費しない）。

> 🛑 **やりがちな勘違い。** 「\`if !submit_result.fills.is_empty()\` の guard を外して無条件に FILL_SINK を取っても挙動は同じでは？」 — 挙動は同じだが約定なしケースで性能が落ちる。limit を rest させただけの一般ケースのたびに read ロックを取り「何も push しない」を確認する。guard はそれを短絡する — hot path で一般ケースを早期回避できるならタダの勝ち。

### Step 4: place_order doc コメント更新

レッスン8 の「fills are discarded」side note を消し、これに置き換える:

\`\`\`rust
/// Stage 9c+ (this commit): any fills produced by the submit are pushed into
/// the \`FILL_SINK\` global if installed. This is what makes EVM-placed orders
/// flow into the bridge's \`pending_fills\` and out via \`build_payload\`,
/// matching the bridge-side \`submit_order\` semantics. If no sink is
/// installed the fills are still produced (visible via subsequent
/// \`read_best_bid\`) but won't reach a payload.
\`\`\`

明示 2 点: 「Stage 9c+ (this commit)」で何が変わったか / fallback セマンティクス（sink 未 install でも約定自体は生まれる → 約定を気にしないテスト＝レッスン8 のラウンドトリップは sink を install せずに済む）。

### Step 5: Unit test

\`place_order_then_read_best_bid_round_trips\` の後に:

\`\`\`rust
    /// **Stage 9c+**: when a \`FILL_SINK\` is installed alongside the CLOB,
    /// fills produced by a \`place_order\` call flow into the sink. This is the
    /// hook the bridge relies on to surface EVM-placed fills in the next
    /// \`build_payload\`. With no sink installed, fills are still produced but
    /// silently dropped — verified by the round-trip test above (which never
    /// installs a sink yet still observes book state changes).
    #[test]
    fn place_order_routes_fills_to_installed_sink() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let book = Arc::new(Mutex::new(Book::new()));
        let sink: Arc<Mutex<Vec<Fill>>> = Arc::new(Mutex::new(Vec::new()));
        install_clob(book);
        install_fill_sink(Arc::clone(&sink));

        // Maker: Buy @ 100, qty 10. Rests, no fill.
        let maker = place_order_calldata(1, 0, 100, 10);
        let r = place_order(&maker, 100_000, 0).unwrap();
        assert!(U256::from_be_slice(&r.bytes[0..32]) > U256::ZERO);
        assert!(sink.lock().unwrap().is_empty(), "no fills after resting maker");

        // Taker: Sell @ 100, qty 10. Crosses the maker → exactly one fill.
        let taker = place_order_calldata(2, 1, 100, 10);
        let r = place_order(&taker, 100_000, 0).unwrap();
        assert!(U256::from_be_slice(&r.bytes[0..32]) > U256::ZERO);

        let fills = sink.lock().unwrap().clone();
        assert_eq!(fills.len(), 1, "exactly one fill from the crossing taker");
        assert_eq!(fills[0].price, Price(100));
        assert_eq!(fills[0].qty, Qty(10));

        uninstall_fill_sink();
        uninstall_clob();
    }
\`\`\`

maker（rest、約定 0）+ taker（cross、約定 1）が routing をテストする最小データ（空 book への単独 submit は約定 0 個 → routing を exercise できない）。sink は \`clone()\` で取り出してから assert（Mutex 握ったまま assert しない）、install と逆順で uninstall。

### Step 6: live_node.rs — pending_fills を Arc に

\`LiveRethEvmBridge<P>\` struct の \`pending_fills\` の型を変える:

\`\`\`rust
    /// Same shared-Arc pattern as \`clob\`: the precompile module's \`FILL_SINK\`
    /// global points at this buffer too, so fills produced by EVM-placed
    /// orders (via \`clob_place_order\`) flow into the same queue the bridge's
    /// own \`submit_order\` writes to (Stage 9c+).
    pending_fills: Arc<Mutex<Vec<Fill>>>,
\`\`\`

### Step 7: LiveRethEvmBridge::new を更新

\`\`\`rust
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        let clob = Arc::new(Mutex::new(Book::new()));
        let pending_fills = Arc::new(Mutex::new(Vec::new()));

        // Make our CLOB visible to the \`clob_read_best_bid\` precompile so
        // smart contracts can query live orderbook state. The bridge writes
        // (submit_order), the EVM reads (precompile); they share the same Arc.
        crate::precompiles::install_clob(Arc::clone(&clob));

        // Route fills produced by the \`clob_place_order\` precompile into the
        // same queue \`submit_order\` writes to. Without this, EVM-placed orders
        // would match but their fills would be silently dropped (Stage 9c+).
        crate::precompiles::install_fill_sink(Arc::clone(&pending_fills));

        Self {
            provider,
            chain_spec,
            validator,
            clob,
            pending_fills,
            state: Mutex::new(State::default()),
        }
    }
\`\`\`

\`install_clob\` のミラーで \`install_fill_sink(Arc::clone(&pending_fills))\`。他の call site（\`pending_fill_count()\`、\`build_payload\` の drain）は \`Arc<Mutex<T>>\`→\`&Mutex<T>\` の deref coercion でそのまま動く（レッスン4 で \`clob\` を Arc にしたときと同じ）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
git checkout main
\`\`\`

\`precompiles/mod.rs\` の diff は空、\`live_node.rs\` も *このレッスンでカバーした変更については* 空。Stage 9c+ commit は bridge integration test も拡張する（まだ無い — 次レッスンが追加）ので、\`live_node.rs\` のテスト region に非空 diff が出るのは想定どおり。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm --release            # 47 個（既存 46 + 本レッスン 1）
cargo test -p openhl-evm --release routes_fills # 1 個 pass
\`\`\`

→ pass。よくあるミス: \`pending_fills\` を Arc::new+Mutex::new でラップし忘れ（E0277）/ struct literal が \`Mutex::new(...)\` を直書き（レッスン4 形の残骸）/ \`fills.len()==1\` が 0（taker が maker とクロスしていない — 同価格を確認）/ 永久ハング（\`drop(book)\` が sink push ブロックの *前* にあるか確認）。

## まとめ（3行）

- shared-buffer パターンを約定に再利用 — \`FILL_SINK\` static + install/uninstall は \`CLOB_STATE\` の完全ミラーで ~20 行。レッスン4 の抽象化が複利で効く。
- precompile（\`fn\` ポインタ）は bridge をキャプチャできない → bridge が所有するバッファを install して precompile が push する shared-Arc 一択。on-chain と off-chain の 2 writer が同じ \`pending_fills\` に合流。
- \`if !fills.is_empty()\` の early-out で主流ケースのロックを節約、\`drop(book)\` を sink push の前に置いてロック順序 hazard を回避。

## 次のレッスン（レッスン10）

実際の Reth ノードを \`OpenHlExecutorBuilder\` で bootstrap し、その provider に \`LiveRethEvmBridge\` を構築する integration test。bridge が book に書き precompile が読む、precompile が書き bridge が約定を見る — Custom EVM bootstrap / Read / Write / Bridge統合 の全成果が実プロセス内で噛み合うことを 1 本で証明する。`,
                },
                {
                  title: "レッスン10 — コースマイルストーン — 実際の Reth ノード内でフルスタック",
                  slug: "openhl-precompiles-bridge-integration-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 90,
                  content: `# レッスン10 — コースマイルストーン — 実際の Reth ノード内でフルスタック

## 問い

unit test 47 個は各部品を単独で証明した。だが「実際の Reth ノード上で bridge と precompile が *同じ* Book / Fill バッファを共有する」ことは未証明。\`NodeBuilder\` チェーンのタイポ 1 つで、unit test を green に保ったまま production が壊れうる。これを 1 本の integration test でどう塞ぐ？

## 原理（最小モデル）

- **integration test は unit test が捕まえない接続バグを捕まえる。** \`with_components(...executor(OpenHlExecutorBuilder))\` のタイポや \`EthereumAddOns\` 漏れは unit を green に保ったまま production を壊す。integration 1 本 = 接続全体の assertion。
- **cross-module test には \`pub(crate)\` が適切。** \`pub\` は API を漏らす、\`#[cfg(test)] pub(crate)\` は無意味な ceremony（可視性はコンパイル時のみ・生成コードは同一）。\`pub(crate)\`=「crate 内なら誰でも、外は不可」。
- **inline calldata > DRY ヘルパー。** バイト位置コメント付き手書き \`[u8;128]\` で ABI レイアウトが callsite から見える。system-level test では各バイトが learnable artifact であるべき。
- **正典: integration 1 + unit 多数。** 失敗の局所化は unit、組み込み全体の保証は integration。
- **正直な deferred: RPC roundtrip は Reth の責務。** JSON-RPC→eth_call→revm dispatch は openhl でなく Reth の検証。「openhl が Reth に正しく接続する」スコープに「Reth の RPC が動く」は含まない。

## 具体例

このテストは 4 フェーズ: bootstrap（\`OpenHlExecutorBuilder\` 付き Reth）→ bridge 構築 → bridge が book に書く（\`submit_order\`）→ precompile が読む（\`current_best_bid()==Some((200,33))\`、**接続証明 #1**）→ precompile が書く（\`place_order\` で cross する Sell）→ bridge が約定を見る（\`pending_fill_count()==1\`、**接続証明 #2**）。production コード変更は \`place_order\` を \`pub(crate)\` にする 1 つだけ — 価値は新挙動でなく *証明* にある。

## 失敗例（誤解）

「unit test が全部通るなら integration test は冗長」は誤り — 各 unit は precompile か bridge を *単独* で構築する。\`NodeBuilder.launch()\` が \`OpenHlEvmFactory\` を作り、bridge が *その* EVM の precompile 経由で *同じ* CLOB を見るパスを exercise したものは 1 つもない。「\`spawn_custom_evm_test_node()\` ヘルパーに切り出すべき」も誤り — Reth の \`NodeAdapter\` は ~5 個の phantom generic で、戻り型を名指すと全 caller が絡め取られる。3 つ目の caller が出るまで inline 合成のままにする。

---

ここまでで「integration が接続を証明する」「\`pub(crate)\` が適切な可視性」は着地した。ここから可視性を 1 語変えて integration test を足す。コードは完全形。**この \`ok\` 行がコースマイルストーン。**

> 🛑 **予測。** unit test（レッスン3/6/9）で部品は証明済み。**なのに \`NodeBuilder\` を通る integration test が要るのはなぜ？**（答え: unit は bridge と Reth executor の *接続ミス* を観測できない。各 unit は precompile か bridge を単独構築する。\`NodeBuilder::launch()\` が \`OpenHlEvmFactory\` を作り bridge が *その* EVM 経由で *同じ* CLOB を見るパスを exercise したものはない。\`with_components\` チェーンのタイポや \`EthereumAddOns\` 漏れは unit を green に保ったまま production を壊す。integration = 接続全体の assertion。）

## ステップで組み立てる

### Step 1: place_order を pub(crate) に

\`crates/evm/src/precompiles/mod.rs\`:

\`\`\`rust
#[allow(clippy::unnecessary_wraps)]
pub(crate) fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
\`\`\`

\`pub\` でなく \`pub(crate)\` の理由: precompile は registry 経由で呼ぶべき（直接呼びを抑止）/ \`PrecompileFn\` シグネチャを外に広く晒さない / integration test は crate 内なので \`pub(crate)\` がちょうど。\`read_best_bid\` は private のまま（モジュール外から直接呼ぶ予定がない）。可視性はコンパイル時のみの情報なので \`#[cfg(test)]\` は不要。

### Step 2: integration test を追加

\`live_node.rs\` の \`#[cfg(test)] mod tests\` 末尾に:

\`\`\`rust
    /// **Stage 9d**: bootstrap a Reth node WITH \`OpenHlExecutorBuilder\` (so its
    /// EVM has our CLOB precompiles registered), construct a \`LiveRethEvmBridge\`
    /// against that node's provider, submit an order via the bridge — verify
    /// that the precompile module's process-global \`CLOB_STATE\` now reflects
    /// the order. This proves the full bridge ↔ custom-EVM-node integration:
    /// the same \`Arc<Mutex<Book>>\` that the bridge's \`submit_order\` writes to
    /// is the one any smart contract calling \`clob_read_best_bid\` through this
    /// node's EVM would see.
    ///
    /// Doesn't yet invoke the precompile via RPC \`eth_call\` — that's deferred
    /// indefinitely (validates Reth's plumbing rather than openhl behavior).
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn bridge_against_custom_evm_node_shares_clob_with_precompile() {
        use crate::OpenHlExecutorBuilder;
        use crate::precompiles::{
            CLOB_PLACE_ORDER, current_best_bid, uninstall_clob, uninstall_fill_sink,
        };
        use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};
        use reth_node_ethereum::node::EthereumAddOns;

        // Start from a clean global state — other tests may have left a CLOB
        // or fill sink installed; that's fine for those tests but would mask
        // bugs here (especially the "sink was wired by bridge::new" assertion).
        uninstall_clob();
        uninstall_fill_sink();

        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        let handle = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .with_types::<EthereumNode>()
            .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
            .with_add_ons(EthereumAddOns::default())
            .launch()
            .await
            .expect("launch of custom-EVM node failed");

        // Build the bridge against the live custom-EVM node's provider.
        // The bridge installs its CLOB as the precompile's global state
        // (per the install_clob call inside LiveRethEvmBridge::new).
        let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);

        // Pre-condition: precompile sees an empty book.
        assert_eq!(current_best_bid(), None);

        // Submit a resting bid via the bridge. This goes through Book::submit
        // under the same Arc<Mutex<Book>> the precompile reads from.
        bridge.submit_order(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(33),
            order_type: OrderType::Limit { price: Price(200) },
        });

        // Post-condition: the precompile's view (which is what a smart
        // contract calling \`clob_read_best_bid\` through this node would see)
        // now reflects the order.
        let best = current_best_bid().expect("CLOB has bids after submit_order");
        assert_eq!(best.0, Price(200));
        assert_eq!(best.1, Qty(33));

        // === Stage 9c+ ===
        // Now hit the WRITE precompile: place a crossing Sell @ 200 qty 33
        // via \`place_order\`. The bridge's pending_fills should see the fill
        // even though we never went through bridge.submit_order. This proves
        // the FILL_SINK that LiveRethEvmBridge::new installed is the same
        // Arc<Mutex<Vec<Fill>>> the bridge later drains in build_payload.
        assert_eq!(
            bridge.pending_fill_count(),
            0,
            "fills empty before crossing taker via precompile"
        );

        let mut calldata = [0u8; 128];
        // account_id = 7 (last 8 bytes of slot 0)
        calldata[24..32].copy_from_slice(&7u64.to_be_bytes());
        // side = Sell (1) at byte 63
        calldata[63] = 1;
        // price = 200 (last 8 bytes of slot 2)
        calldata[88..96].copy_from_slice(&200u64.to_be_bytes());
        // qty = 33 (last 8 bytes of slot 3)
        calldata[120..128].copy_from_slice(&33u64.to_be_bytes());

        let r = crate::precompiles::place_order(&calldata, 100_000, 0)
            .expect("place_order must not error");
        let order_id_bytes = &r.bytes[24..32];
        let order_id = u64::from_be_bytes(order_id_bytes.try_into().unwrap());
        assert!(order_id > 0, "successful place_order returns nonzero id");

        // The fill from the cross should have landed in bridge's pending_fills
        // via the FILL_SINK install_fill_sink path inside LiveRethEvmBridge::new.
        assert_eq!(
            bridge.pending_fill_count(),
            1,
            "precompile-placed cross must populate bridge.pending_fills (Stage 9c+)"
        );

        // CLOB_PLACE_ORDER's address constant is part of the public surface
        // (and registered into the precompiles set by \`openhl_precompiles\`);
        // touch it here so the import resolves and the constant stays load-bearing.
        let _ = CLOB_PLACE_ORDER;

        // Clean up the globals so other tests can start clean.
        uninstall_fill_sink();
        uninstall_clob();

        // Drop the node handle explicitly to make the lifecycle visible
        // in the trace.
        drop(handle);
    }
\`\`\`

4 フェーズ: **A setup**（\`uninstall_*\` で global を空に — 他テストが残した state は信用しない + \`NodeBuilder.launch()\`）/ **B** bridge 構築 + bridge→precompile read（\`new()\` が両 global に install、接続証明 #1）/ **C** precompile→bridge fills（接続証明 #2）/ **D** cleanup（逆順 uninstall + \`drop(handle)\`）。

約定が bridge に届くまでの 5 段の間接:

\`\`\`
place_order
  → submit_result.fills (Vec<Fill>)
  → FILL_SINK.read() → Some(sink: Arc<Mutex<Vec<Fill>>>)
  → sink.lock().extend(...)
  → bridge.pending_fills と同じ Arc
  → bridge.pending_fill_count() が increment を見る
\`\`\`

要点: \`tokio::test(multi_thread, worker_threads=4)\`（Reth の async bootstrap が背景タスクを spawn — single-thread だと stall）/ \`uninstall_*\` を先頭で（プロセスグローバルなので他テストが残しうる）/ 手書き calldata は明示性のため（ヘルパーへ飛ばず ABI が読める）/ \`place_order\` を **直接呼ぶ**（registry 経由はレッスン3 で証明済み、ここは bridge↔precompile 接続に scope を絞る）/ \`spawn_custom_evm_test_node()\` ヘルパーは作らない（\`NodeAdapter\` の generic 複雑度が戻り型を厄介にする）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
git checkout main
\`\`\`

両 diff とも **空** になるはず（Stage 9c+ HEAD と一致）。**これで Stage 9 が閉じる** — 9a（カスタム EVM bootstrap）/ 9b（live な CLOB read）/ 9c（write path）/ 9c+（約定を bridge に route）/ 9d（bridge integration）の全マイルストーンを再現した。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm --release bridge_against_custom_evm  # 1 個 pass
cargo test -p openhl-evm --release                            # 48 個（unit 47 + integration 1）
\`\`\`

→ pass。よくあるミス: \`place_order\` が private（\`pub(crate)\` 忘れ → E0603）/ NodeBuilder タイポ（レッスン3 の \`reth_dev_node_with_openhl_executor\` と比較）/ \`worker_threads=1\` でハング / \`.await\` 抜けで silent skip（Future は lazy）/ \`calldata[63]=1\` が Sell（0 だと Buy でクロスせず \`pending_fill_count==0\`）。

## まとめ（3行）

- integration test 1 本が、unit が捕まえない「bridge ↔ Reth executor の接続ミス」を塞ぐ — \`NodeBuilder\` チェーンのタイポ 1 つで unit green のまま production が壊れる現実的 regression を 1 本で防ぐ。
- production 変更は \`place_order\` を \`pub(crate)\` にする 1 語だけ — cross-module test に必要十分な可視性（\`pub\` は API を漏らす、\`#[cfg(test)]\` は無意味）。
- 接続証明 #1（bridge write → precompile read）+ #2（precompile write → bridge fills）で、Custom EVM bootstrap / Read / Write / Bridge統合 の 4 成果が実 Reth プロセス内で同時に噛み合うことを証明 = 48 tests green。

## 次のレッスン（レッスン11）

capstone。新しいコードはなし。築いたアーキテクチャを記憶から再現できるよう整理し、v0 で *意図的に* 先送りした 4 項目（RPC roundtrip / マルチバリデータ OrderId / transaction-scoped rollback / staticcall mutation 拒否）を名指し、次に出荷できる拡張を複雑度順に並べる。`,
                },
              ],
            },
          },
          {
            title: "Capstone",
            sortOrder: 5,
            lessons: {
              create: [
                {
                  title: "レッスン11 — Capstone — 築いたもの、先送りしたもの、次にくるもの",
                  slug: "openhl-precompiles-capstone-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 40,
                  content: `# レッスン11 — Capstone — 築いたもの、先送りしたもの、次にくるもの

## 問い

EVM ↔ CLOB のアーキテクチャを、記憶を頼りにホワイトボードへ描けるか？ v0 で *意図的に* 先送りした項目を名指し、なぜスコープ外かを説明できるか？ **このレッスンにコードはなし** — メンタルモデルだけだ。

## 原理（最小モデル）

全体のテーゼは 1 行: **Arc が物理的に 1 つしかない。** precompile も bridge も同じ Arc を握り、同じ Book / 同じ \`Vec<Fill>\` を read/write する。\`CLOB_STATE\` と \`FILL_SINK\` は「その Arc をどこからでも取れる shared register」にすぎない。**翻訳レイヤなし、シリアライゼーションの往復なし、メモリだけ。**

## 具体例

\`\`\`
                ┌─────────────────────────────────────────────┐
                │           LiveRethEvmBridge                  │
                │  clob: Arc<Mutex<Book>>                      │
                │  pending_fills: Arc<Mutex<Vec<Fill>>>        │
                └──────┬───────────────┬───────────────────────┘
            install_   │               │ install_
            clob       ▼               ▼ fill_sink
              ┌─────────────────────────────────────┐
              │  precompiles module (process-global)│
              │  CLOB_STATE: RwLock<Option<…>>      │
              │  FILL_SINK:  RwLock<Option<…>>      │
              └──────┬───────────────┬──────────────┘
        read_best_   ▼               ▼ place_order
        bid   ┌─────────────────────────────────────┐
              │  Reth EVM (via OpenHlEvmFactory)    │
              │  registry: 0x...0c1b → read_best_bid│
              │            0x...0c1c → place_order  │
              └──────┬──────────────────────────────┘
                     ▼
              ┌─────────────────────────────────────┐
              │  Solidity: staticcall(0x...0c1b,"") │
              │            call(0x...0c1c, abi…)    │
              └─────────────────────────────────────┘
\`\`\`

上→下: bridge がデータを所有、precompile モジュールが process-global handle で公開、EVM が dispatch、Solidity は \`ecrecover\` と同じ感覚で同じアドレスを叩く。下→上: \`STATICCALL(0x...0c1b)\` → registry → \`read_best_bid\` → \`CLOB_STATE\` → bridge の \`submit_order\` が書くのと同じ \`Arc<Mutex<Book>>\`。**このマップを記憶から再現できれば、precompile レイヤを脳内で再構築できている。**

## 失敗例（誤解）

「precompile ごとに自前 state を持てばシンプル」は誤り — 機能的に切り離され、read precompile と write precompile が別々の Book を見てラウンドトリップが壊れる。「EVM と CLOB の間に翻訳/シリアライズ層がある」も誤り — 同一プロセスの同一 Arc を共有するだけで変換は一切ない。**「Arc が物理的に 1 つ」を外すと、このアーキテクチャは成立しない。**

## 各モジュールが届けたもの

- **Custom EVM bootstrap（レッスン1〜3）** — プラガブルなシーム: \`OpenHlEvmFactory\`（\`alloy_evm::EvmFactory\`）+ \`OpenHlExecutorBuilder\`（\`reth_node_builder::ExecutorBuilder\`）+ \`openhl_precompiles\`（hardfork ごとに自アドレスを足す、\`OnceLock\` キャッシュ）。\`.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))\` で boot。
- **Read precompile（レッスン4〜6）** — \`0x...0c1b\`、空 calldata → 64-byte \`(price, qty)\`。\`CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>>\` + install/uninstall/current_best_bid。
- **Write precompile（レッスン7〜8）** — \`0x...0c1c\`、128-byte \`(account, side, price, qty)\` → 32-byte \`(order_id)\`。\`NEXT_ORDER_ID: AtomicU64\`（1 始まり、\`0\`=rejected sentinel）、4 つの rejection path。
- **Bridge統合（レッスン9〜10）** — \`FILL_SINK: RwLock<Option<Arc<Mutex<Vec<Fill>>>>>\`、\`new()\` が両 global に install、約定が bridge の drain を通って次の \`build_payload\` に届く。合計 48 tests（unit 47 + integration 1）。

## 正直に先送り（意図的な scope cut）

4 項目、どれも実プロダクションギャップでコード上に doc 化済み:

1. **RPC \`eth_call\` ラウンドトリップ** — Rust 直接呼びは証明、JSON-RPC→Solidity 経路は Reth の責務（RPC サーバ / tx simulation / dispatch）。見直し: Reth を大幅 fork する／registry インターフェースが変わるメジャーアップグレード時。
2. **マルチバリデータ deterministic OrderId** — プロセスグローバルカウンタは 2 validator で別々の ID を採り book が **silent に分岐**（エラーも crash も出ない）。要 \`keccak(tx_hash, call_index)\` か block-scoped state。見直し: マルチバリデータ deployment 前（\`NEXT_ORDER_ID\` doc で名指し済み）。
3. **Transaction-scoped state shadowing** — \`place_order\` 成功後に tx revert しても Book は rollback しない（Book は EVM storage 外の Arc 内）。要 journaling か virtual モード。single-actor なら OK、DeFi composability では必須。
4. **\`staticcall\` での mutation 拒否** — EVM は static フラグを precompile に渡さず、\`STATICCALL(0x...0c1c)\` でも抵抗なく book に書けてしまう。\`PrecompileFn\` シグネチャ拡張（revm fork）が必要。見直し: 監査が攻撃 vector としてフラグしたとき。

## 次に来るもの

複雑度順に 4 つ:

1. **\`best_ask\` precompile（1 日）** — \`read_best_bid\` の sell 側ミラー。形は同じ方向だけ逆、~30 行でほぼ機械的。
2. **\`clob_depth_at_price\` precompile（2-3 日）** — \`(side, price)\` → その価格レベルの合計 qty。スリッページ見積もり用。calldata に入力パラメータを含む新パターン。
3. **\`clob_cancel_order\` precompile（1 週間）** — \`(order_id, account)\` → 削除成否。認可問題が出る（EVM の \`msg.sender\` は呼び出しコントラクトで、元アカウントでない）。要署名スキームか事前登録の認可マッピング。
4. **約定を EVM event として emit（2 週間）** — \`eth_getLogs\` / event filter で subscribe 可能に（ERC-20 transfer と同じ要領）。precompile からの event emit は revm API が扱いづらく、\`PrecompileFn\` 拡張＝小さな fork が要りうる。インパクト大・摩擦大。

## このコースの位置（L1 Architect トラック）

- **コース1〜5**（Reth internals）: pipeline / payload building / NodeBuilder / evm crate / RPC。
- **Step 1（Consensus）/ Step 2（CLOB）**: Malachite コンセンサス統合 → マッチングエンジン。
- **Step 3（Precompiles、本コース）**: カスタム precompile で EVM ↔ CLOB を橋渡し。**Reth のプラガブルな EVM シームに触れる最初のコース。**
- **Step 4（Funding）**: funding rate 機構。本コースの precompile パターンの上に積む。
- **Step 5（Liquidation）**: capstone — 実行可能な openhl ノードとサンプルトレーディングコントラクトを出荷。

ここで内在化したパターンは CLOB precompile を超えて一般化する: カスタム EVM の「1 スロット差し替え」（\`EvmFactory\` + \`ExecutorBuilder\` + \`.with_components\`）/ precompile state の「プロセスグローバル Arc」（\`fn\` ポインタは closure を持てないから）/ schema-first プロトコル設計（契約は calldata layout にあり関数 body にない）/ 敵対的テストデータ / doc 上で正直に scope を切ること。

## 最終答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/ ./crates/evm/ --recursive
\`\`\`

レッスン11 を終えると、\`crates/evm/\` ディレクトリ全体が openhl の \`d19ba1b\` HEAD と byte-identical に一致する。5 つの commit（9a / 9b / 9c / 9c+ / 9d）を手で再現し、各行がなぜそこにあるかを完全に理解した上で。

main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## まとめ（3行）

- 全アーキテクチャは 1 行に集約: precompile も bridge も *物理的に 1 つの Arc* を共有し、\`CLOB_STATE\`/\`FILL_SINK\` はその Arc を取り出す shared register にすぎない（翻訳なし・シリアライズなし・メモリだけ）。
- 4 モジュールの成果: プラガブル EVM シーム → live state read → live state write → 約定の payload 還流。48 tests が部品 + 組み込みを証明する。
- 4 つの先送り（RPC roundtrip / マルチバリデータ OrderId / tx-scoped rollback / staticcall mutation 拒否）はすべて doc 化済みの *意図的* scope cut — 出荷可能な、Reth ベースのカスタム L1 トレーディングプリミティブが手元にある。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
