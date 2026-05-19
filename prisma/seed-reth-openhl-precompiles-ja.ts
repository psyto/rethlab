// AUTO-GENERATED from drafts/openhl_precompiles_*_ja.md by .github/scripts/build-openhl-precompiles-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlPrecompilesJA(prisma: PrismaClient) {
  const tags = ["reth","evm","precompile","clob","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-precompiles-ja",
      title: "OpenHL Precompile を作る — CLOB state をスマートコントラクトに接続する",
      description:
        "L1 Architect トラックの 10 コース中 8 番目。openhl ベースの build-along コースの 3 つ目。`building-openhl-clob` から続く: course 7 end state の workspace (LiveRethEvmBridge に統合された CLOB matching engine、fill が並行リストとして蓄積) から始め、reader は smart contract が CLOB state を read する custom EVM precompile (`clob_read_best_bid`) と order を place する precompile (`clob_place_order`) を追加する。終了状態: smart contract call が precompile 経由で order を発注、既存 book state とマッチ、結果の fill が bridge を通じて流れる。openhl Stage 9 (9a-9e、6 commits ~860 LOC) をカバー: EvmFactory パターン、registry ベースの precompile dispatch、Arc-shared CLOB state、calldata decoding、fill-sink を bridge に route。範囲外: fill を block body の EVM-executable transaction として encode (future course)、funding state machine (course 9)。",
      difficulty: "EXPERT",
      duration: 400,
      xpReward: 820,
      track: "reth-l1-architect",
      tags,
      isPublished: false,
      sortOrder: 800,
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
                  title: "OpenHL Precompile を作る — CLOB state をスマートコントラクトに接続する",
                  slug: "openhl-precompiles-orientation-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# OpenHL Precompile を作る — CLOB state をスマートコントラクトに接続する

前コース (\`building-openhl-clob\`) は bridge が CLOB matching engine を所有する状態で終わった。Order が submit され、fill が payload に流れ、integration test が real Reth node に対して pipeline 全体を exercise する。**だが fill はまだ並行リスト。** 同じ Reth node で走るスマートコントラクトはそれを見られない。CLOB state と EVM state が別々の世界に住む。

本コースがそのギャップを閉じる。**Custom EVM precompile** を追加する — Solidity (または任意の EVM caller) から call されると、CLOB を read/write する Rust コードを実行する特殊な address。Course 8 後:

- スマートコントラクトが \`0x...0c1b\` を call すると、現在の **best bid を読める**。
- スマートコントラクトが \`0x...0c1c\` を call すると、matching engine が処理する **order を発注できる**。

これら 2 つのパスが存在すると、CLOB が EVM の横にある並行構造から、EVM が対話できる **state 拡張** になる。これが chain を「Hyperliquid-shape」にする — Hyperliquid の本質的な新規性は、perp matching engine が同じ chain で走るスマートコントラクトから call 可能であること。

本コース終了時、\`cargo test clob_precompile_round_trip\` が pass する — スマートコントラクト call が precompile 経由で order を発注、既存 book state とマッチ、結果の fill が bridge に流れる。

## 1. 終了時に手にするもの

新規 \`crates/evm/src/precompiles/\` モジュール:

- **既知 EVM address に登録された custom precompile 2 個**:
  - \`clob_read_best_bid\` (read): 64-byte response として best bid の \`(price, qty)\` を返す。
  - \`clob_place_order\` (write): calldata から order を decode、CLOB に submit、fill 要約を返す。
- **Custom EVM machinery** (\`openhl_evm.rs\`) — Reth の executor に precompile を配線する \`EvmFactory\` + \`ExecutorBuilder\`。
- **Bridge 統合** — \`LiveRethEvmBridge\` が custom EVM 付きの Reth node を spawn するので、precompile への smart contract call が bridge が所有する同じ CLOB instance に触れる。

openhl では **6 commit 分** の作業 (~860 LOC)、11 レッスン + capstone に分割。End-to-end テストは ~3 秒: Reth bootstrap、thin Solidity wrapper deploy (またはエンジン経由で直接 call)、precompile trigger、fill を assert。

## 2. 終了時にも手にしないもの

本コースは **openhl Stage 9 (9a-9e) のみ** をカバー。以下は扱わない:

- **Fill → 実 EVM transaction を block body にエンコード**。Fill は依然 payload に attach された並行リスト (course 7 L12 の状況)。Course 8 はそれらを *EVM 実行から accessible に* するが、*block body の一部に* はしない。それは将来コース。
- **Funding state machine**。それは Stage 8b / course 9。
- **Liquidation、oracle、perp-specific math**。Stage 9 にない。
- **Multi-market precompile**。Stage 9 は 1 つの CLOB; production では market ごとに 1 precompile、または market-id calldata 付きの 1 つ。

本コース終了時、スマートコントラクトが CLOB を read/write できる chain がある。これは **大きな** capability ジャンプ — 「chain に orderbook がどこかにある」と「chain が orderbook + EVM **そのもの**」の違い。だがループを完全に閉じる (fill を tx として block body に戻す) のは下流の作業。

## 3. 前提

必要なもの:

- **\`building-openhl-clob\` 完了** — または同等の course 7 end state の workspace。\`LiveRethEvmBridge<P>\` に L9-L11 の \`clob\`、\`pending_fills\`、\`submit_order\`、\`payload_fills\`、\`pending_fill_count\` がある。なければまず course 7 を完了させる。
- **Rust 1.95+**、前と同じ。
- **Trait レベルで REVM に慣れていること。** Precompile を書いたことがある必要はない — L1 がパターンを説明する — だが REVM の \`Precompile\`、\`PrecompileFn\`、\`Precompiles\` 型を見たことがないなら、まず [revm precompile docs](https://docs.rs/revm-precompile) を skim する。
- **スレッド境界を超える共有 state に \`Arc<Mutex<T>>\` を使うことに慣れていること。** Precompile は EVM の実行コンテキストから CLOB を read する必要があり、それは bridge の通常 call site とは異なる async/sync 境界。

不要なもの:

- 過去の \`EvmFactory\` や \`ExecutorBuilder\` 知識 (L1-L2 で説明)。
- Solidity (Solidity は書かない — raw calldata 経由で precompile を exercise するだけ)。
- Course 6 がカバーしたものを超える Reth の内部 block 実行 pipeline 知識。

## 4. セットアップ確認 (今やる)

Course 6 と 7 から 2 ディレクトリのワークフロー:

- \`~/code/my-openhl/\` — workspace
- \`~/code/openhl-reference/\` — read-only な \`psyto/openhl\` clone

Stage 9 commit が clone より新しい場合に備えて reference repo を更新:

\`\`\`bash
cd ~/code/openhl-reference
git fetch origin
git log --oneline | head -25
# SHA d19ba1b (Stage 9c+) までの commit が見えるはず。
# Stage 9 commit を chronological 順で:
#   1761d4d — Stage 9a
#   2ba97c6 — Stage 9e
#   b635ef7 — Stage 9b
#   a8823a1 — Stage 9c
#   2f796c3 — Stage 9d
#   d19ba1b — Stage 9c+
\`\`\`

それから workspace が course 7 end state にあることを確認:

\`\`\`bash
cd ~/code/my-openhl
cargo test -p openhl-evm clob_fills_flow_into_payload --release 2>&1 | tail -5
# 期待: test pass (course 7 のマイルストーンテスト)。
\`\`\`

それが pass すれば start point として正しい。

> 🛑 **やりがちな勘違い。** 「Custom EVM precompile は単に fancy なコントラクト call — Solidity 関数のように考える」。 **違う、もっと根本的。** Precompile は EVM 内で既知 address で Rust を直接実行する、間に Solidity bytecode がない。Caller のコントラクト視点では固定 address への external call に見えるが、実装は我々が選んだ state にフルアクセスできる native Rust。メンタルモデルは「EVM から call 可能な native 関数」 — 「別のスマートコントラクト」ではない。

## 5. 12 レッスンの全体マップ

| # | モジュール | 何を build するか | レッスン終了時のテスト |
| - | - | - | - |
| **L0** | Orientation | (本レッスン) | セットアップ確認 |
| **L1** | Custom EVM bootstrap | \`openhl_evm.rs\` — EvmFactory パターン + 依存 | \`cargo check -p openhl-evm\` |
| **L2** | Custom EVM bootstrap | \`precompiles/mod.rs\` — Stage 9a の hardcoded read precompile + registry | precompile がコンパイル |
| **L3** | Custom EVM bootstrap | \`OpenHlExecutorBuilder\` + NodeBuilder 配線; precompile を call する smoke test (Stage 9e) | \`precompile_is_callable_via_registry\` が pass |
| **L4** | Read precompile | install_clob() — Arc-shared CLOB state、precompile 注入用 | bridge が shared state でコンパイル |
| **L5** | Read precompile | read precompile を live CLOB state に配線 (Stage 9b 本体) | precompile が real best_bid を返す |
| **L6** | Read precompile | end-to-end test: read precompile が bridge.submit_order の結果を反映 | integration test pass |
| **L7** | Write precompile | \`clob_place_order\` signature + calldata decoding (Stage 9c part 1) | precompile が正しく decode する |
| **L8** | Write precompile | 実装: CLOB に submit + fill 要約を返す (Stage 9c part 2) | precompile が正しく write する |
| **L9** | Bridge 統合 | \`install_fill_sink()\` — precompile が produce した fill が bridge の pending_fills に流れる (Stage 9c+) | precompile-placed fill が bridge に届く |
| **L10** | Bridge 統合 | bridge が custom-EVM Reth node に対して spawn (Stage 9d) | full pipeline test pass |
| **L11** | Capstone | recap、次は何か (funding via course 9、fill-as-EVM-tx として future course) | (テストなし — recap) |

**L10 がマイルストーン。** L10 を終えると、live Reth node 上で EVM-callable CLOB がある: スマートコントラクトが precompile を call、matching engine が走り、fill が bridge を通じて payload に出現する。L11 が「まだ何が足りないか」を named する (fill がまだ EVM tx ではない — それは Stage 9 を超える)。

## 6. 答え合わせの規律 (前と同じ)

各レッスン L1-L10 は 6 個の Stage 9 commit のどれかを cite:

| Lessons | Stage | SHA |
| - | - | - |
| L1-L3 | 9a + 9e | \`1761d4d\`、\`2ba97c6\` |
| L4-L6 | 9b | \`b635ef7\` |
| L7-L8 | 9c | \`a8823a1\` |
| L9 | 9c+ | \`d19ba1b\` |
| L10 | 9d | \`2f796c3\` |

各レッスンのテストが pass した後:

\`\`\`bash
cd ~/code/openhl-reference
git checkout <SHA>
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

意味のあるレベルで一致 — 同じ型、同じ制御フロー。空白と命名は違ってよい。

> 🛑 **やりがちな勘違い。** 「Precompile は custom なものに見える — openhl の参照は自分で書くものより advanced なはず」。 **参照は素直で、本コースが canonical な Reth + REVM パターンを教える。** Reth はちょうどこういうケース用に \`EvmFactory\` + \`ExecutorBuilder\` パターンを提供する (上流の例は \`paradigmxyz/reth/examples/custom-evm\`)。openhl がやるのは *そのパターンに従い、1 read precompile と 1 write precompile を登録する* こと。パターンを理解すれば、既存のものを copy-modify することで precompile を追加できる。

## 7. セットアップ確認 — 実際の L0 演習

L1 に進む前に、以下を全部走らせて pass を確認:

\`\`\`bash
# 1. Rust バージョン
rustc --version    # 期待: rustc 1.95.x 以降

# 2. Course 7 end state
cd ~/code/my-openhl && cargo test -p openhl-evm clob_fills_flow_into_payload --release 2>&1 | tail -3
# 期待: 1 test pass

# 3. Reference repo に Stage 9 commit がある
cd ~/code/openhl-reference && git log --oneline | grep -E "(1761d4d|b635ef7|a8823a1)"
# 期待: 3 つの SHA すべて現れる
\`\`\`

3 つ全部 pass すれば L1 に進む準備 OK。

> **最終チェック。** 本コースが course 7 になかった何を追加するのか、1 文で言える? もし答えに「スマートコントラクトが CLOB を read/write できる」が入っていなければ §1 を読み直す。`,
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
                  title: "レッスン 1 — OpenHlEvmFactory — すべての EVM 生成にフックする",
                  slug: "openhl-precompiles-evm-scaffold-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン 1 — \`OpenHlEvmFactory\` — すべての EVM 生成にフックする

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

…がクリーンにコンパイル。\`crates/evm/src/\` に **新規モジュール 2 個**:

- **\`openhl_evm.rs\`** — \`OpenHlEvmFactory\` (Reth の \`EvmFactory\` スロット) + \`OpenHlExecutorBuilder\` (Reth の \`ExecutorBuilder\` スロット) + \`OnceLock\` 経由の hardfork ごとの precompile dispatch。約 80 LOC。
- **\`precompiles/mod.rs\`** — **stub** の \`openhl_precompiles(base) -> Precompiles\`、そのまま passthrough。L2 で実 read precompile を埋める。

新規依存 **5 個** も追加 (workspace 1 + crate 4 — \`reth-node-api\` の新規 git-pin dep 含む)。

L1 後、custom EVM **構造** が end-to-end で存在する。Reth が factory 経由で EVM instance を construct でき、factory の仕事 (custom precompile を register) はまだ何もしない、L2 がそれら precompile を定義するから。

## おさらい

Course 7 完了時点で \`crates/evm/src/\` には:

\`\`\`
crates/evm/src/
├── bridges/                    L4-L5: InMemoryEvmBridge, RethEvmBridge
├── reth_node.rs                L11 (c6): bootstrap proof (test-only)
└── live_node.rs                L12-L14 (c6) + L9-L11 (c7): LiveRethEvmBridge<P>
\`\`\`

\`cargo test -p openhl-evm clob_fills_flow_into_payload --release\` が pass。Bridge が CLOB を所有し、\`build_payload\` 経由で fill を route する。**だが bridge の Reth node 内で走る smart contract は CLOB を見られない** — L1 が閉じ始めるギャップ。

## 計画

7 つやる:

1. **\`alloy-evm = "0.34"\`** を workspace \`Cargo.toml\` に追加。これは public な \`alloy-evm\` crate (Reth に git-pin されていない)、\`EvmFactory\`、\`Database\`、\`EvmEnv\` 等を提供する。
2. **\`crates/evm/Cargo.toml\` に 4 dep 追加**: \`reth-evm\`、\`reth-evm-ethereum\`、\`reth-node-api\` (新規 git dep — 同じ SHA)、そして \`reth-node-builder\` を \`[dev-dependencies]\` から \`[dependencies]\` へ昇格。
3. **\`crates/evm/src/openhl_evm.rs\` を作成** — \`OpenHlEvmFactory\` + \`OpenHlExecutorBuilder\` + \`precompiles_for(spec)\`。
4. **\`crates/evm/src/precompiles/mod.rs\` を作成** — passthrough stub。
5. **\`pub mod openhl_evm; mod precompiles;\`** を \`crates/evm/src/lib.rs\` に配線。
6. **\`OpenHlEvmFactory\` と \`OpenHlExecutorBuilder\` を crate root に re-export** — L3 の NodeBuilder 統合のため。
7. **\`cargo check -p openhl-evm\`** — clean。

これが course 8 で **依存最重量** のレッスン。Scaffold がコンパイルしたら、L2 が実 precompile content を追加; L3 で NodeBuilder に配線、precompile が EVM 実行から到達可能かをテスト。

> 🛑 **考えてみよう。** スクロールする前に: Reth の \`EvmFactory\` は trait — なぜ Reth が 1 つの EVM instance を construct して再利用するのではなく、factory が必要? ヒント: chain 内で EVM transaction を **実行する** code path を考える。Block validation (validate_payload)、payload assembly (build_payload)、eth_call RPC、debug RPC — どれも fresh な EVM instance を自分の database snapshot で作る。**Factory が存在するのは Reth が多数の EVM を作るから**、1 つではなく。

## 手順

### Step 1: \`alloy-evm\` を workspace に追加

ルート \`Cargo.toml\` を開く。alloy ブロック (course 6 L11 / course 7 L12 後) は次で終わる:

\`\`\`toml
alloy-rpc-types-engine    = { version = "2.0", default-features = false }
alloy-genesis             = { version = "2.0", default-features = false }
\`\`\`

**1 行追加**:

\`\`\`toml
alloy-evm                 = { version = "0.34", default-features = false }
\`\`\`

\`alloy-evm\` は public な alloy crate、REVM の抽象を trait レベルで提供 (\`EvmFactory\`、\`Database\`、\`EvmEnv\`)。stable crates.io 依存で Reth に git-pin されていない — \`alloy-genesis\` や \`alloy-rpc-types-engine\` と同じ status。

> 🛑 **やりがちな勘違い。** 「\`alloy-evm\` と \`reth-evm\` は同じもの — どちらか選ぶ」。 **違う、別の層。** \`alloy-evm\` は任意の EVM 実装が満たせる **抽象** trait (\`EvmFactory\`、\`Database\` 等) を提供。\`reth-evm\` は Reth の **具体** 実装、それらの trait を block-executor pipeline に配線する。両方 import する: factory 定義に抽象、executor 配線に具体。

### Step 2: \`crates/evm/Cargo.toml\` を更新

\`crates/evm/Cargo.toml\` を開く。Course 7 L9 + course 6 L12 後、\`[dependencies]\` セクションには 12 entry。4 個追加 (3 個 new + 1 昇格):

\`\`\`toml
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
\`\`\`

\`reth-node-builder\` が \`[dev-dependencies]\` から \`[dependencies]\` に移動 — production コード (\`OpenHlExecutorBuilder\`) が今これを使う。\`[dev-dependencies]\` から行を削除:

\`\`\`toml
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
\`\`\`

**\`reth-node-api\` は 1 回限りの直接 git dep** (workspace 経由ではない)。Workspace \`Cargo.toml\` がそれを宣言しない; git+rev を直接 inline 宣言する。意図的: \`reth-node-api\` は 1 個の crate (\`openhl-evm\`) でしか使われず、workspace の残りには必要ない。Workspace dep に昇格すると、全 crate の build graph がそれを知る必要が出る。

> 🛑 **やりがちな勘違い。** 「すべての Reth dep は workspace dep にすべき — それがパターン」。 **必ずしも違う。** Workspace dep が有用なのは、複数 crate が同じ dep を同じバージョンで必要とするとき。1 個の crate しか必要としないなら inline 宣言の方がクリーン — workspace-level Cargo.toml のエントリが少なく、reader に対して間接化が少ない。\`reth-node-api\` は openhl-evm のみ; それに応じて扱う。

### Step 3: \`crates/evm/src/precompiles/mod.rs\` (stub) を作成

\`openhl_evm.rs\` を書く前に、precompile モジュールを存在させる必要がある (\`openhl_evm.rs\` がそこから import するため)。Directory + file を作成:

\`\`\`bash
mkdir -p crates/evm/src/precompiles
touch crates/evm/src/precompiles/mod.rs
\`\`\`

\`crates/evm/src/precompiles/mod.rs\` を開いて書く:

\`\`\`rust
//! Custom REVM precompiles that expose CLOB state to EVM execution.
//!
//! Stage 9a — scout commit. L2 adds the first real precompile
//! (\`clob_read_best_bid\` at 0x...0c1b) that returns a hardcoded best-bid
//! response so smart contracts can prove the precompile is reachable.
//! L4+ wires it to live CLOB state.

use alloy_evm::revm::precompile::Precompiles;

/// Wraps Reth's spec-default precompile set, adding openhl's CLOB precompiles.
///
/// L1 (this lesson): passthrough — clones the base unchanged.
/// L2: registers \`clob_read_best_bid\`.
/// L7+: registers \`clob_place_order\`.
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    // L2 will replace this with \`let mut precompiles = base.clone();
    // precompiles.extend([...]); precompiles\`.
    base.clone()
}
\`\`\`

Body 3 行。関数は \`Precompiles\` set (現在 hardfork に対する Reth のデフォルト) を取り、そのまま返す。**L2 が実 \`clob_read_best_bid\` を \`base\` と \`return\` の間に挿入する。**

関数 signature は EVM factory が依存する **stable contract**。L2-L11 がこの関数の **content** を変更するが、\`openhl_precompiles(base: Precompiles) -> Precompiles\` は全体を通して同じ shape を保つ。

> 🛑 **やりがちな勘違い。** 「空関数は無駄なコード — L1 + L2 を統合する」。 **passthrough は precompile ロジックを追加する前に **構造がコンパイルすることを証明する**。** L1 + L2 を 1 レッスンとして書き、precompile 登録が壊れていたら、reader は factory 配線と precompile 登録のどちらが原因か分からない。レッスンを分割すると failure mode が別々に addressable になる。

### Step 4: \`crates/evm/src/openhl_evm.rs\` を作成

メインファイル。ファイル冒頭:

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
\`\`\`

20 ほどの import。多くは \`alloy-evm\` の re-export 経由の REVM 内部。Scan する価値あり、暗記する必要なし:

- **\`EvmFactory\`** — 実装する trait。Reth は EVM instance が必要なたびに factory の \`create_evm\` を call する。
- **\`ExecutorBuilder\`** — \`OpenHlExecutorBuilder\` に実装する trait。Reth の \`NodeBuilder\` がこれを使って EVM config を construct する。
- **\`Precompiles\`** — REVM の precompiled contract コレクション。我々はこれに追加する。
- **\`OnceLock\`** — std の once-init primitive。Per-spec の precompile セットを cache する。

次に factory struct:

\`\`\`rust
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

8 個の associated type は scaffold — どの \`EvmFactory\` impl も必要で、多くは Reth のデフォルトと同じ。**興味深い部分は \`create_evm\`。** 5 step:

1. **\`Context::mainnet()\`** — REVM の「Ethereum mainnet」プリセット (gas 定数等)。
2. **\`.with_db(db)\` + \`.with_cfg(input.cfg_env)\` + \`.with_block(input.block_env)\`** — 渡された database、config、block env をインストール。
3. **\`.build_mainnet_with_inspector(NoOpInspector {})\`** — no-op inspector (tracing なし) で EVM を construct。
4. **\`.with_precompiles(PrecompilesMap::from_static(precompiles_for(spec)))\`** — **precompile をインストール**。\`precompiles_for(spec)\` が現在 Ethereum hardfork に対する正しい precompile セットを返す。
5. **\`EthEvm::new(evm, false)\`** — Reth の EthEvm 型でラップ。

\`create_evm_with_inspector\` は同じ path に no-op の代わりに custom inspector。ほとんどの caller は \`create_evm\` を使う; inspector variant は debug RPC 用。

> 🛑 **やりがちな勘違い。** 「factory が \`db: DB\` を generic に取るのは? 具体的な \`RevmDatabase\` の方がシンプル」。 **Reth は context によって多くの異なる database snapshot 型を使うから。** Block validation は live MDBX state を使う; eth_call RPC は履歴 snapshot を使う; debug RPC は in-memory overlay を使うかも。Factory はそれら全部で動かなければならない。Generic over \`DB: Database\` が、具体型にコミットせずそれを表現する方法。

### Step 5: \`precompiles_for(spec)\` ヘルパーを追加

Factory impl の下:

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

各 Ethereum hardfork が異なる標準 precompile セットを持つ (ECDSA recovery、SHA-256、ModExp、EC-pairing 等)。Cancun が blob 用の point evaluation precompile を追加。Prague がさらに追加予定。**Wrapper の \`openhl_precompiles\` が、現在 active な base set に custom precompile を注入する。**

3 個の \`OnceLock\`、hardfork 階層ごと:

- **\`PRAGUE\`** — Prague + Osaka をカバー (Osaka が当面 Prague の precompile を継承)。
- **\`CANCUN\`** — Cancun。
- **\`FALLBACK\`** — Berlin/London/Paris/Shanghai、\`EthPrecompiles::new(spec)\` を使って Reth がその spec に対して正しいと考えるセットを取得。

**なぜ \`OnceLock\` で per call 計算ではない?** \`Precompiles\` は HashMap ベースの構造で、construct コストが高い (全 precompile address を hashing)。Spec ごとに 1 回計算 + cache が、Reth の custom-evm 例が示す最適化の 1 つ。Caching が重要なのは、\`create_evm\` が **非常に** 頻繁に call されるから — 毎 RPC eth_call、毎 block validation、毎 block build。

### Step 6: \`OpenHlExecutorBuilder\` を追加

\`openhl_evm.rs\` 末尾:

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

10 行。\`ExecutorBuilder\` trait は Reth の hook、\`EthereumNode\` が使う EVM config を swap する。Associated type \`EVM = EthEvmConfig<ChainSpec, OpenHlEvmFactory>\` が「Reth 標準の EthEvmConfig を使うが、我々の factory でパラメータ化する」と言う。\`build_evm\` がその config を construct する。

Trait bound \`Node: FullNodeTypes<Types: NodeTypes<ChainSpec = ChainSpec, Primitives = EthPrimitives>>\` がこの builder が動く node の種類を制約する — Ethereum mainnet primitive、我々の \`ChainSpec\`。より exotic なもの (Optimism、OP Stack) はこれらの bound を満たさない; 意図的。

**両 struct の \`#[non_exhaustive]\`** が、後で field を追加してもブレーキング API change にならないようにする。今は unit struct; openhl がいずれ configuration を運ばせる必要が出ても、この属性で consumer が \`OpenHlExecutorBuilder {}\` リテラルで construct できない。

### Step 7: \`crates/evm/src/lib.rs\` に配線

\`crates/evm/src/lib.rs\` を開く。現在は前コースの bridges + reth_node + live_node モジュールがある。2 行追加:

\`\`\`rust
//! ... existing module doc ...

pub mod bridges;     // existing
pub mod live_node;   // existing (course 6+)
pub mod openhl_evm;  // NEW
mod precompiles;     // NEW (internal)

#[cfg(test)]
mod reth_node;       // existing (test-only smoke)

pub use openhl_evm::{OpenHlEvmFactory, OpenHlExecutorBuilder};  // NEW
// ... existing re-exports ...
\`\`\`

2 つの変更:
- **\`pub mod openhl_evm\`** — consumer に visible。
- **\`mod precompiles\`** — internal、外部に公開しない。Smart contract は **address で** precompile を call する; \`openhl-evm\` の consumer は \`openhl_precompiles\` を直接 import する必要なし。

末尾の re-export (\`pub use openhl_evm::{OpenHlEvmFactory, OpenHlExecutorBuilder}\`) が consumer code から 2 型を \`openhl_evm::OpenHlEvmFactory\` としてアクセス可能にする。L3 の NodeBuilder 統合がこれらを使う。

## テスト

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

初回 run は遅い — \`alloy-evm\` + 新 Reth crate が non-trivial なコードを引き込む。~30-60 秒予期。以降の run は cache 使用。

期待:

\`\`\`
   Compiling openhl-evm v0.1.0 (.../crates/evm)
    Finished \`dev\` profile [unoptimized + debuginfo] target(s) in 32.45s
\`\`\`

警告なし (import list は長いが各 item が使われる)。エラーなし。

既存テストスイートも他に何も壊れていないことを確認:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

39 個依然 pass。新モジュールにはまだテストなし — L3 が最初のものを追加。

よくあるエラーと対処:

- **\`error[E0432]: unresolved import 'reth_node_api'\`** — inline git dep が追加されていない。Step 2 を再確認。
- **\`error[E0277]: 'EvmFactory' is not implemented for 'OpenHlEvmFactory'\` (ある associated type で)** — 8 個の associated type のどれかに typo。\`1761d4d\` の参照と比較。最一般: \`type Spec = SpecId\` vs \`type Spec = u64\` 等。
- **\`error[E0282]: type annotations needed for 'PrecompilesMap'\`** — \`PrecompilesMap::from_static\` が generic を返す; call site が型を知る必要。我々の場合 \`with_precompiles(...)\` 呼び出しが推論を提供。Compiler が文句を言ったら、import を二重チェック。
- **\`unused import: 'openhl_precompiles'\`** — 関数は \`precompiles_for\` の closure で参照される。この warning を見たら、\`openhl_precompiles(Precompiles::prague())\` の代わりに \`Precompiles::prague()\` を直接書いたかも。各 base set を \`openhl_precompiles(...)\` でラップ。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Factory パターンが Reth の「多数の EVM instance」現実とマッチ。** Reth は 1 つの EVM を construct して再利用しない — 各 RPC call、各 block validation、各 payload build で fresh な EVM を作る。\`EvmFactory\` trait が「すべての EVM 生成」に 1 箇所でフックする方法。**1 factory、多数の EVM、どこでも一貫した precompile 登録。**

2. **Spec ごとの \`OnceLock\` が正しい caching shape。** \`Precompiles\` セットの構築は non-trivial (address の hashing、fn の insertion)。\`create_evm\` call ごとにやるのは cycle の無駄。Per-spec caching が各 hardfork 階層 (Prague、Cancun、fallback) を 1 度だけ construct する。\`OnceLock\` が thread-safe な lazy init を保証。

3. **\`openhl_precompiles\` の passthrough stub が L1 を isolated に保つ。** 関数は正しい signature で存在; まだ何もしない。L2 が body を埋める。**正しい signature を持つ stub は契約**: caller (factory) が今配線でき、実装は call site を変えずに後から land できる。これが rewrite を必要としない incremental construction。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/openhl_evm.rs ./crates/evm/src/openhl_evm.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
\`\`\`

\`1761d4d\` の参照は **full** な \`precompiles/mod.rs\` (Stage 9a の read precompile) を持つ。Stub 版はそれと異なる:

\`\`\`bash
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
# 期待: stub は参照より大幅に短い; 参照に大きな追加として差が見える。L2 が欠けている content を追加。
\`\`\`

\`openhl_evm.rs\` は厳密にマッチするはず (factory 構造は同一; doc コメントの言い回しだけ違うかも)。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: precompile モジュールが \`mod precompiles\` (private) で \`pub mod openhl_evm\` なのは?**
\`OpenHlEvmFactory\` は consumer が必要とする public API (L3 の NodeBuilder 統合が使う) だが、\`openhl_precompiles\` は \`openhl_evm.rs\` 内部だけで consume される実装詳細。precompile モジュールを private に保つことが API leakage を防ぐ; caller は自分で precompile セットを construct や modify すべきでない。

**Q: \`Precompiles::from_static\` と \`Precompiles::default\` の違い?**
\`from_static\` は \`&'static Precompiles\` 参照を取る — つまり precompile セットは cache して再利用するもの。\`default\` は新規 (空) \`Precompiles\` instance を構築する。\`create_evm\` が \`from_static\` を使うのは、\`OnceLock\`-cache されたセットが \`'static\` だから。Caching + static 参照 = EVM 生成ごとの allocation なし。

**Q: なぜ \`PRAGUE\` が \`OSAKA\` もカバー?**
Osaka (Prague の次の hardfork 案) は参照 SHA 時点で新規標準 precompile を導入しない。Osaka が最終的に新 precompile を追加したら、この match arm が別々の \`OSAKA\` と \`PRAGUE\` ブランチに分割される。それまでは同じ \`OnceLock\` を共有するのが正しい。

**Q: \`OpenHlExecutorBuilder\` は \`Clone\` が必要?**
Trait は \`Clone\` を要求しないが、\`#[derive(Clone, Copy)]\` は安価 (zero-sized な unit struct)、Reth のパターンとマッチ。後で struct に field を追加するなら、API の ergonomic のために \`Clone\` を保つべき。

## 次のレッスン (L2)

Factory は配線されたが precompile モジュールは passthrough — Reth 標準 precompile がインストールされ、余分なものなし。L2 が最初の **real** precompile を追加: address \`0x...0c1b\` の \`clob_read_best_bid\`。今は hardcoded 値を返す (openhl Stage 9a と同じアプローチ)。L4-L5 が live CLOB state に配線; このレッスンは関数を定義し、register し、registry 経由で到達可能にするだけ。`,
                },
                {
                  title: "レッスン 2 — clob_read_best_bid — 最初の real precompile",
                  slug: "openhl-precompiles-read-hardcoded-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 2 — \`clob_read_best_bid\` — 最初の real precompile

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

…依然コンパイル。\`precompiles/mod.rs\` が今 **full な Stage 9a 版**:

- 定数 \`CLOB_READ_BEST_BID: Address = 0x...0c1b\` — precompile の address。
- 定数 \`CLOB_BASE_GAS_COST: u64 = 500\` — precompile call ごとの最小 gas 料金。
- 関数 \`read_best_bid(input, gas_limit, reservoir) -> PrecompileResult\` — 64 バイトで hardcoded \`(price=100, qty=10)\` を返す。
- \`openhl_precompiles\` 関数 (もはや passthrough ではない) が base set を新規 precompile で extend する。

約 40 LOC 追加。Precompile は **register されたが、まだ live CLOB state に配線されていない** — hardcoded 値を返す。意図的: L3 で precompile が EVM 実行から **到達可能** であることをテスト; L4-L5 で hardcoded 値を live CLOB read に swap する。**先に関数、content は後** — L1 の passthrough と同じ incremental パターン。

## おさらい

L1 後:

\`\`\`rust
// crates/evm/src/precompiles/mod.rs (passthrough stub)
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    base.clone()
}
\`\`\`

関数 signature は固定 (L1 が契約を設定); body は入力を clone するだけ。L2 が body を変更 — 同じ signature、中身がより多い。

## 計画

\`crates/evm/src/precompiles/mod.rs\` 内で 4 つ:

1. **Import を expand** — \`alloy_evm::revm::precompile\` から \`Precompile\`、\`PrecompileId\`、\`PrecompileOutput\`、\`PrecompileResult\` を、\`alloy_primitives\` から \`address\`、\`Address\`、\`Bytes\` を追加。
2. **Address 定数を追加** — \`CLOB_READ_BEST_BID: Address = 0x000...0c1b\`。Public、consumer (とテスト) が名前で precompile を call できるように。
3. **Gas-cost 定数 + \`read_best_bid\` 関数を追加** — private。関数が hardcoded \`(price=100, qty=10)\` を 64 バイト ABI-encode で返す。
4. **Passthrough を置き換え** — \`openhl_precompiles\` が base set を clone、新 precompile 登録で \`extend\`。

Precompile はこのレッスン後に **callable** だが **dumb** — book 状態に関わらず同じ答えを返す。L3 が callable を証明; L4-L5 が smart にする。

> 🛑 **考えてみよう。** スクロールする前に: Solidity からの EVM call shape は \`staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)\`。Precompile が 64 バイト (2 個の u256) を返す。**なぜ 64 バイトで 8 バイト (2 個の u32) ではない — price と quantity は u32 に収まるはず?** ヒント: Solidity が native に返す型を考える。

(答え: Solidity の ABI encoding \`returns(uint256, uint256)\` は 64 バイト — 各値は実際に必要な bit 数に関わらず **常に** 32 バイト。\`u64\` price は 8 バイトに収まるが ABI は 32 バイトに pad する。8 バイトを返したら、Solidity が malformed な \`uint256\` として解釈して多分 revert する。**Wire format は Solidity の ABI とマッチする、内部表現ではなく。**)

## 手順

### Step 1: Import を expand

\`crates/evm/src/precompiles/mod.rs\` を開く。L1 の現在の import:

\`\`\`rust
use alloy_evm::revm::precompile::Precompiles;
\`\`\`

次に置き換え:

\`\`\`rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
\`\`\`

6 個の新規型/マクロ:

- **\`Precompile\`** — \`Address\` と \`PrecompileFn\` をペアにする wrapper。Precompiles set がこれらを保存する。
- **\`PrecompileId\`** — 識別子 (主にデバッグ / tracing 用)。\`PrecompileId::custom("clob_read_best_bid")\` を使う。
- **\`PrecompileOutput\`** — precompile から返される success 型。Gas 消費 + 出力バイト + 残 gas reserve を運ぶ。
- **\`PrecompileResult\`** — \`Result<PrecompileOutput, PrecompileError>\`。v0 は error しないので常に \`Ok(...)\` を返す。
- **\`address\` マクロ** — \`address!("0x...")\` がコンパイル時に const \`Address\` を作る。
- **\`Address\`、\`Bytes\`** — EVM コードで至るところに使われる 2 つの byte-array 型。

> 🛑 **やりがちな勘違い。** 「address に \`[u8; 20]\` を使い \`alloy_primitives::Address\` をスキップできる?」 **ダメ — EVM エコシステムが \`Address\` を標準化し、\`Precompile::new\` がそれを要求する。** \`[u8; 20]\` を渡そうとすると型 check が失敗するか、どこかしらに \`.into()\` 変換が必要。\`Address\` が canonical な EVM-address 型; それを使う。

### Step 2: Precompile address 定数を追加

Import の後、関数の前に追加:

\`\`\`rust
/// Address of the "read best bid" precompile.
///
/// Solidity call shape: \`staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)\`
pub const CLOB_READ_BEST_BID: Address = address!("0x0000000000000000000000000000000000000c1b");

/// The minimum gas charge for invoking a CLOB precompile. Tuned later.
const CLOB_BASE_GAS_COST: u64 = 500;
\`\`\`

2 個の定数:

- **\`CLOB_READ_BEST_BID\`** — **\`pub\`**、テスト (L3) と下流 caller がこの address を call する必要があるから。\`0x...0c1b\` は「CLB」(CLOB) のニーモニック。慣習:
  - address \`1-9\` は Ethereum 標準 precompile (ECDSA recovery、SHA-256 等)
  - 衝突を避けて 0x0c1b+ に保つ
- **\`CLOB_BASE_GAS_COST\`** — **private**、内部コスト数。500 gas は CLOB precompile 何でもへの per-call charge。実 EVM 計算は memory expansion + per-byte コストも charge するが、これは base だけ。

\`pub\` vs private split は意図的。外部 caller は address を気にする (precompile を **call する** ため); gas cost は気にしない (EVM が dispatch 中に処理する)。

### Step 3: \`read_best_bid\` 関数を書く

定数の下:

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

Body を walk:

1. **\`vec![0u8; 64]\`** — 64 個のゼロバイト。\`(uint256, uint256)\` の ABI shape は 32 バイト block 2 個。
2. **\`out[31] = 100\`** — 最初の 32 バイト block の最右バイトに price (100) を書く。Big-endian u256 means 上位バイトがゼロ、低位バイト (index 31) が実値を持つ。qty も index 63 で同じ。
3. **\`PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)\`** — output を build:
   - 第 1 引数: 消費 gas (500 charge)。
   - 第 2 引数: output バイト (64 バイト buffer)。
   - 第 3 引数: reservoir (extra budget); 0 を使う。

関数の 3 引数すべてが \`_\` 接頭辞 (未使用)、v0 stub は:
- input を読まない (call は empty calldata)。
- gas_limit を respect しない (EVM が overflow check を処理)。
- reservoir を無視 (必要ない advanced feature)。

\`#[allow(clippy::unnecessary_wraps)]\` が「この関数は常に \`Ok(...)\` を返す、unwrap した型を返せ」という lint を silence する。**unwrap できない** のは、\`PrecompileFn\` trait signature が \`PrecompileResult\` を **要求する** から。Lint がここでは間違い; この属性が正しい応答。

> 🛑 **やりがちな勘違い。** 「hardcoded \`100, 10\` は TODO に感じる — L4 が real データを持つまで \`unimplemented!()\` のままにすべき?」 **Hardcoded 値が Stage 9a の本質。** それが **次の** レッスン (L3) で、CLOB state 注入がまだ動かなくても precompile が **到達可能** であることを証明できるようにする。\`unimplemented!()\` のままにすると L3 テストが panic し、「precompile は callable か?」と「正しい値を返すか?」を分離できない。**Hardcoded stub が、内容をテストする前に配線をテストできるようにする。**

### Step 4: Passthrough \`openhl_precompiles\` を置き換え

現在の passthrough 関数を見つける:

\`\`\`rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    // L2 will replace this with \`let mut precompiles = base.clone();
    // precompiles.extend([...]); precompiles\`.
    base.clone()
}
\`\`\`

Full な実装に置き換え:

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

Body 3 行:

1. **\`let mut precompiles = base.clone()\`** — base set で開始。\`base\` を直接 mutate できない (\`&Precompiles\`); clone が owned で mutable な copy を得る唯一の方法。
2. **\`precompiles.extend([Precompile::new(...)])\`** — 我々の precompile を set に追加。\`extend\` は \`Precompile\` の iterator を受け取る; 長さ 1 の array を渡すと、array が \`IntoIterator\` を impl するので動く。
3. **\`precompiles\` を return** — 我々の追加を含む owned \`Precompiles\`。

\`Precompile::new(...)\` call は 3 piece から新規 entry を作る:
- \`PrecompileId\` (human-readable 名、デバッグ/tracing 用)。
- 登録される \`Address\`。
- Call する関数。

L7+ で \`clob_place_order\` 用に 2 つ目の \`Precompile::new(...)\` を追加する。パターンは続く: clone、extend、return。

## テスト

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

依然 clean。Precompile は今 register されたが、まだそれを exercise するテストがない — それは L3。

オプションで precompile address が正しく export されているか verify:

\`\`\`bash
grep -r "CLOB_READ_BEST_BID" crates/evm/src/
# 報告するはず: precompiles/mod.rs が const を宣言
\`\`\`

よくあるエラーと対処:

- **\`error[E0432]: unresolved import 'alloy_evm::revm::precompile::Precompile'\`** — import list の typo。正しい path は \`alloy_evm::revm::precompile::{Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles}\`。
- **\`error: expected struct, found macro 'address'\`** — \`address\` を間違った場所から import。\`alloy_primitives\` の \`address!\` マクロ; import list に \`address\` (小文字、マクロ) を含めること。
- **\`out[31] = 100u8\` overflow lint** — \`100\` は既に \`i32\`、\`u8\` への変換は fine、だが clippy が文句を言ったら \`out[31] = 100;\` (型注釈不要)。
- **\`out[63] = 10\` が assertion に現れない** — \`read_best_bid\` が間違った index を読んでいる。Index 31 が price (最初の 32 バイト) で index 63 が qty (2 番目の 32 バイト) を再確認。
- **\`#[allow(clippy::unnecessary_wraps)]\` でも clippy が文句** — 属性は関数に付ける、containing block ではない。\`fn read_best_bid(...)\` の直上に置く。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Address 定数は \`pub\`; gas-cost 定数は private。** 外部 caller (test、smart contract) は precompile を **どこに** call するか知る必要がある。**どれだけのコスト** が必要かは知る必要なし — EVM が内部で処理する。Public vs private のマッピングが API 表面を反映する。

2. **関数は \`(&[u8], u64, u64)\` を取る — v0 では全部未使用。** \`PrecompileFn\` trait が signature を固定する; 使わなくてもこれら引数を受け付けるしかない。Underscore-prefix 慣習 (\`_input\`、\`_gas_limit\`、\`_reservoir\`) が compiler に「存在は知っている、まだ必要なし」と伝える。L7+ は \`_input\` を order データの decode に使う。

3. **64-byte output は ABI shape、内部 shape ではない。** 64-bit price は 8 バイトに収まるが、Solidity は \`(uint256, uint256)\` を合計 64 バイトとして期待する。Wire format で ABI にマッチすると \`read_best_bid()\` を Solidity で直接書ける。内部 \`Qty(u64)\` 型は実装詳細。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

L2 後、\`precompiles/mod.rs\` が \`1761d4d\` の参照と **機能的に同一**。Doc コメントの言い回しのみ異なる。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`PrecompileId::custom("clob_read_best_bid")\` で enum variant ではない?**
\`PrecompileId\` が opaque な identifier で、REVM の logging/tracing layer が主に使うから。Custom precompile は文字列名を使う、標準セットの外だから。文字列は human-readable; precompile call が trace に現れたら numeric variant ではなく「clob_read_best_bid」が見える。

**Q: error handling を追加したい場合?**
Return path を \`Ok(...)\` から \`Err(PrecompileError::Other(...))\` に変える。Trait は既にこれをサポート; v0 で failure mode を持たないだけ。Read precompile が live state を得る (L4-L5) と、可能なエラー 1 つは「CLOB lock が poisoned」 — それが \`PrecompileError\` にマップされる。

**Q: なぜ \`Bytes::from(out)\` が必要 — \`Vec<u8>\` を直接 return できる?**
できない、trait が \`Bytes\` (alloy の reference-counted byte buffer、Rust の std \`Vec<u8>\` ではない) を欲しがる。\`Bytes::from(vec)\` が変換する。Wrapper 型の理由: \`Bytes\` は安く clone され、re-allocation せずに EVM 内部全体で共有できる。

**Q: smart contract が calldata で read_best_bid に引数を渡せる?**
Yes — calldata が \`_input\` パラメータ。v0 では precompile がそれを無視 (best bid を関わらず返す)、production code は calldata を使って **どの market の** best bid を読むか指定する。現在のセットアップは single-market; multi-market サポートは \`_input\` decoding を追加する。

## 次のレッスン (L3)

Precompile は register されたが **テストされていない**。L3 で executor builder を NodeBuilder に配線 + Reth node を custom EVM で boot し、precompile が \`CLOB_READ_BEST_BID\` で callable であることを verify する smoke test を書く。テストは小さい (~60 LOC) が full toolchain を exercise する: custom EVM、executor builder、NodeBuilder 統合、EVM call dispatch、precompile registry lookup。L3 後、smart contract が \`0x...0c1b\` を call して \`(100, 10)\` を返してくる Reth node がある。`,
                },
                {
                  title: "レッスン 3 — NodeBuilder 配線 + registry callability test",
                  slug: "openhl-precompiles-node-wiring-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン 3 — NodeBuilder 配線 + registry callability test

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_with_openhl_executor --release
cargo test -p openhl-evm --lib precompiles
\`\`\`

…両方 pass。**新規テスト 4 個** を書く:

- **integration test 1 個** を \`crates/evm/src/reth_node.rs\` に — \`reth_dev_node_with_openhl_executor\`。デフォルト executor の代わりに \`OpenHlExecutorBuilder\` を swap した Reth node を bootstrap する。\`EvmFactory\` + \`ExecutorBuilder\` 合成が clean に spawn することを validate。
- **unit test 3 個** を \`crates/evm/src/precompiles/mod.rs\` に:
  - \`read_best_bid_returns_hardcoded_price_and_qty\` — 直接関数 call test。
  - \`openhl_precompiles_registers_clob_address\` — **extend-not-replace** invariant。
  - \`registered_precompile_is_invokable_via_registry\` — full registry-dispatch test (REVM が内部で使うパス)。

**これが Module 1 のマイルストーンレッスン。** L3 後、custom EVM + precompile は compile-clean なだけでなく、EVM 実行から到達可能であることが証明された。Module 2-4 が **content** (live state、write path、bridge 統合) を build する; Module 1 は **配管** を set up した。

## おさらい

L2 後:

- \`openhl_evm.rs\` に \`OpenHlEvmFactory\` + \`OpenHlExecutorBuilder\` (L1)。
- \`precompiles/mod.rs\` に \`CLOB_READ_BEST_BID\` + \`read_best_bid\` + \`openhl_precompiles\` (L2)。
- \`cargo check -p openhl-evm\` が pass。

**まだ何もこのコードを invoke していない。** L3 で配管が動くことを証明する 4 つのテストを書く。

## 計画

5 つやる:

1. **\`reth_node.rs\` の import を更新** — \`EthereumAddOns\` (\`with_add_ons(...)\` に必要) と \`crate::OpenHlExecutorBuilder\` (配線する型) を追加。
2. **\`reth_dev_node_with_openhl_executor\` integration test を追加** — course 6 の \`reth_dev_node_bootstraps\` と同じ shape、だが explicit-builder path で \`.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))\` を使う。
3. **\`#[cfg(test)] mod tests\` を \`precompiles/mod.rs\` に追加** — unit test 3 個。
4. **両 test path を run** — integration test が pass、unit test 3 個が pass。
5. **他に何も壊れていないことを verify** — \`cargo test -p openhl-evm --release\` で course 6 + course 7 のすべての先行テストが green。

3 個の unit test が 3 つの異なる concern をカバー:

| Test | Concern | 失敗したらバグの場所 |
| - | - | - |
| \`read_best_bid_returns_hardcoded_price_and_qty\` | 関数 body が正しい (正しいバイトを書く) | L2 の \`read_best_bid\` 実装 |
| \`openhl_precompiles_registers_clob_address\` | Extend-not-replace invariant | L2 の \`openhl_precompiles\` body — おそらく間違った \`clone()\` または \`extend(...)\` semantics |
| \`registered_precompile_is_invokable_via_registry\` | Registry 経由の EVM dispatch path が動く | \`Precompile::new(...)\` call shape、\`PrecompileId\`、または registration ordering |

> 🛑 **考えてみよう。** スクロールする前に: なぜ \`openhl_precompiles_registers_clob_address\` が **両方** \`CLOB_READ_BEST_BID\` AND \`0x...01\` の ECDSA recover が extended set に存在することを assert する? 最初の assertion だけで十分に見える — 我々が register した、なぜ ECDSA がまだあることを check?

(答え: テストが **extend-not-replace** invariant を強制するから。\`openhl_precompiles\` が誤って base を clone して extend する代わりに fresh な \`Precompiles\` set を作ったら、\`CLOB_READ_BEST_BID\` は依然存在するが、標準 Ethereum precompile (ECDSA recover、SHA-256 等) は **消える**。Base set は wrapper が preserve しなければならない load-bearing なものの 1 つ。ECDSA recover なしでは、signature を verify するコントラクトが revert する。**Dual assertion が silent-replace バグを catch する。**)

## 手順

### Step 1: \`reth_node.rs\` の import を更新

\`crates/evm/src/reth_node.rs\` を開く。既存 test モジュール (course 6 の \`mod tests\`) の import:

\`\`\`rust
use reth_node_ethereum::EthereumNode;
\`\`\`

次に変更:

\`\`\`rust
use reth_node_ethereum::{node::EthereumAddOns, EthereumNode};
\`\`\`

\`OpenHlExecutorBuilder\` の import も追加。\`use\` block の直後、\`dev_chain_spec()\` の前:

\`\`\`rust
use crate::OpenHlExecutorBuilder;
\`\`\`

2 つの import が必要なのは、\`EthereumAddOns\` が \`.with_add_ons(...)\` に必要 (explicit-builder path が \`add_ons\` 引数を要求、customize しなくても)、\`OpenHlExecutorBuilder\` が swap する型だから。

### Step 2: \`reth_dev_node_with_openhl_executor\` integration test を追加

\`reth_node.rs\` の \`mod tests\` block に、既存 \`reth_dev_node_bootstraps\` test の後に append:

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
            // The node spawned with our custom EVM. We don't need to inspect
            // further — if the EvmFactory or ExecutorBuilder were broken,
            // launch() would have failed.
            let _ = expected_chain_id;
            Ok(())
        }
        .await;
        if let Err(e) = result {
            panic!("Reth dev node bootstrap with OpenHl EVM failed: {e:?}");
        }
    }
\`\`\`

Course 6 の \`reth_dev_node_bootstraps\` テストと比較 — 同じセットアップパターンだが、1 つ重要な行が違う:

\`\`\`rust
// course 6:
.node(EthereumNode::default())
.launch_with_debug_capabilities()

// course 8:
.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
.with_add_ons(EthereumAddOns::default())
.launch()
\`\`\`

Course-6 path は \`.node(...)\` を使う、これは shorthand — 事前構築された node spec を取る。Course-8 path は explicit builder を使う: **\`OpenHlExecutorBuilder\` を swap、他のすべての component (network、payload pool、RPC handler) をデフォルトに保つ。** これが「Reth を fork せず configure する」property。

\`.executor(OpenHlExecutorBuilder)\` chain が load-bearing な部分。\`EthereumNode::components()\` がデフォルト \`ComponentsBuilder\` を返す; \`.executor(...)\` が 1 つの slot を override。残りの slot (network、payload、pool 等) はデフォルトから来る。**1 slot を swap、他はすべて inherit。**

> 🛑 **やりがちな勘違い。** 「executor を inline で書ける — \`.executor(my_closure)\` で \`OpenHlExecutorBuilder\` struct を全部 build しなくても」。 **\`ExecutorBuilder\` trait が Reth の \`ComponentsBuilder\` が受け入れる契約。** Closure も同じ trait (\`impl ExecutorBuilder<Node>\`) を満たさなければならず、それを inline で書くのは厄介。Struct が存在するのは trait が API surface だから; この特定の hook には closure が悪い fit。

### Step 3: \`mod tests\` block を \`precompiles/mod.rs\` に追加

\`crates/evm/src/precompiles/mod.rs\` を開く。ファイル末尾 (\`openhl_precompiles\` の後) に append:

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

**Scope を増しながら** 3 つの test:

- **\`read_best_bid_returns_hardcoded_price_and_qty\`** — 関数を直接 \`(empty_input, gas_limit=100_000, reservoir=0)\` で call。バイト長、decoded price、decoded qty、消費 gas を assert。**最も狭い scope** — 関数のみ、registry なし、EVM なし。
- **\`openhl_precompiles_registers_clob_address\`** — \`openhl_precompiles(Precompiles::cancun())\` を call、我々の address AND 標準 ECDSA recover address の両方が extended set にあることを check。**Extend-not-replace invariant** が load-bearing な assertion: buggy wrapper が base set を extend する代わりに replace するかもしれない。
- **\`registered_precompile_is_invokable_via_registry\`** — \`.get(&CLOB_READ_BEST_BID)\` で registry から precompile を extract、その \`.execute(...)\` メソッドを call。**Full dispatch path** — REVM が \`STATICCALL\` で内部使用するのと同じコード。

\`alloy_primitives::U256\` import が 64-byte response の decode に必要。\`U256::from_be_slice(&bytes[..])\` が 32-byte big-endian slice を U256 値に decode する。

> 🛑 **やりがちな勘違い。** 「3 番目のテストは redundant — 関数が動く (test 1) し address が register された (test 2) なら、registry 経由 invocation は動くはず」。 **そうとは限らない。** Test 2 は \`address.contains(&...)\` が true を返すことだけを check。Registry から関数 lookup への dispatch は別 — REVM は内部で \`.get(&address)\` をして \`.execute(...)\` を呼ぶ。**\`Precompile::new(...)\` の配線のバグ (間違った関数ポインタ、型ミスマッチ) が test 1 と 2 を pass し test 3 を fail する。** Dispatch test が real なバグクラスを catch する。

### Step 4: テストを実行

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_with_openhl_executor --release
\`\`\`

~30 秒後 (新テストでの初回 incremental build):

\`\`\`
running 1 test
test reth_node::tests::reth_dev_node_with_openhl_executor ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

それから unit test:

\`\`\`bash
cargo test -p openhl-evm --lib precompiles
\`\`\`

\`\`\`
running 3 tests
test precompiles::tests::openhl_precompiles_registers_clob_address ... ok
test precompiles::tests::read_best_bid_returns_hardcoded_price_and_qty ... ok
test precompiles::tests::registered_precompile_is_invokable_via_registry ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

\`--lib\` が unit test を library 内で走らせる (\`tests/\` 内の integration test ではなく)。\`--lib\` なしだと \`cargo test precompiles\` が integration test 名パターンともマッチしようとする。

### Step 5: 他に何も壊れていないことを verify

Full suite:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

~30 秒後:

\`\`\`
running 42 tests
... 42 tests pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**\`openhl-evm\` で 42 個 pass** (course 6+7 から 39 + 新 unit test 3 + 新 integration test 1 — \`--lib\` と integration test が名前パターンを share するので exact count は変わる)。All prior tests still green。

よくあるエラーと対処:

- **Integration test が \`with_components\` not found で失敗** — 新テストが shorthand \`.node(...)\` の代わりに \`with_components\` を使う。Shorthand を完全に置き換えたか確認、追加しただけではないこと。
- **\`error[E0277]: 'EthereumAddOns' is not a 'NodeAddOns'\`** — import path が間違い。\`reth_node_ethereum::EthereumAddOns\` だけでなく \`reth_node_ethereum::node::EthereumAddOns\` (path に \`node::\`) を使う。
- **\`assert!(extended.contains(&ecrecover))\` が失敗** — \`openhl_precompiles\` body が base を clone する代わりに fresh な \`Precompiles\` set を作った。L2 Step 4 を再確認: \`let mut precompiles = base.clone(); precompiles.extend(...); precompiles\` であるべき。**\`let precompiles = Precompiles::default(); precompiles.extend(...)\` ではない。**
- **\`result.gas_used\` が \`CLOB_BASE_GAS_COST\` とマッチしない** — 定数が \`read_best_bid\` が charge する値と違う。L2 Step 3 を再確認: \`PrecompileOutput::new(CLOB_BASE_GAS_COST, ...)\` — 両方が同じ定数を参照する必要。
- **Test \`registered_precompile_is_invokable_via_registry\` が panic** — L2 の \`openhl_precompiles\` での \`Precompile::new(...)\` call が間違い (例: 間違った関数ポインタや引数順)。3 引数 shape を再確認: \`(PrecompileId, Address, fn)\`。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Scope を増しながらのテスト。** 3 unit test が最も狭い (関数 body) から expand outward (registry registration → registry dispatch) で開始する。1 つが失敗すると、どの層が壊れているか正確に分かる。**Test scope = バグ localization。**

2. **Extend-not-replace check が dual assertion。** \`extended.contains(CLOB_READ_BEST_BID)\` 単独の passing test では wrapper が catastrophically wrong でないことを証明しない — base set を **replace する** buggy wrapper も pass する。ECDSA recover **も** ある assertion が silent-replace バグを catch する。**1 つの assertion は間違った理由で pass しうる; 2 つの dual はそうできない。**

3. **Integration test は precompile を invoke しない。** Full RPC roundtrip は Solidity コントラクトのデプロイが必要 — それは Reth-RPC のテスト surface、precompile のテストではない。Module-1 マイルストーンは「EvmFactory + ExecutorBuilder が clean に spawn」。Unit test (Step 3) が precompile 挙動をカバー; integration test が assembly をカバー。**2 つの test、異なる scope、別々に対処。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 2ba97c6
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/reth_node.rs ./crates/evm/src/reth_node.rs
\`\`\`

L3 後、コードが \`2ba97c6\` の参照とマッチ — Stage 9a の NodeBuilder 配線と Stage 9e の 3 unit test が両方ある。Doc コメントの言い回しのみ異なるかも。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`EthereumNode::default()\` ではなく \`EthereumNode::components()\` を使う?**
\`default()\` は事前構築された node spec を返す、個別 component を swap できない。\`components()\` は \`ComponentsBuilder\` を返し、\`.executor(...)\`、\`.network(...)\`、\`.payload(...)\` 等を chainable methods として expose する。**1 つ以上の slot を swap する必要があるとき \`components()\` を使う; すべてを as-is で受け入れるなら \`default()\`。**

**Q: \`Precompile::execute(&[], 100_000, 0)\` は内部で実際何をする?**
\`Precompile\` 型の public dispatch メソッド。内部で stored function pointer (我々の \`read_best_bid\`) を提供された引数で call する。Smart contract が precompile の address を \`STATICCALL\` するとき REVM がこの同じメソッドを使う — EVM が precompile registry で address を lookup、\`&Precompile\` を取得、\`.execute(input, gas_limit, reservoir)\` を call。

**Q: なぜ integration test に \`--release\` が必要?**
速度のため。\`--release\` がテスト runtime を ~5 秒 (debug) から ~1 秒に削減する、optimization を有効にすることで。他の unit test は小さすぎて debug オーバーヘッドが無視できる。

**Q: \`.with_add_ons(EthereumAddOns::default())\` をスキップできる?**
できない — \`NodeBuilder\` の build chain が全 "slot" を埋めることを要求、デフォルトでも。スキップすると compile time に失敗。Explicit な \`EthereumAddOns::default()\` が曖昧さなく「デフォルトを使う」と言う。

**Q: なぜ integration test が \`unwrap()\` chain ではなく \`Result<()>\` と \`async\` block を使う?**
より良い error reporting のため。\`NodeBuilder\` chain 内で何かが失敗すれば、\`?\` 演算子が error を outer \`result\` に伝播し、末尾の \`panic!\` が \`{e:?}\` を print するので失敗原因が visible。\`.unwrap()\` だと original error chain なしの generic panic を得る。

## 次のレッスン (L4)

Precompile が register され callable と証明されたが、**hardcoded 値** を返す。L4 で **live CLOB state** を precompile に配線開始 — bridge が \`Arc<Mutex<Book>>\` を precompile モジュールに inject できるよう \`install_clob()\` を追加、\`openhl_precompiles\` が shared state を受け取るよう更新。L4 後、precompile は real データを返す **能力がある**; L5 で実際に shared book から read する。`,
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
                  title: "レッスン 4 — install_clob() — EVM の state をマッチングエンジンに橋渡しする",
                  slug: "openhl-precompiles-install-clob-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン 4 — \`install_clob()\` — EVM の state をマッチングエンジンに橋渡しする

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…が引き続き通る（L3 で追加した 4 つを含む 42 tests）。**\`read_best_bid\` が返す値はまだ変えずに**、live CLOB state を流すための**配管だけ**を仕込みます：

- **\`Book\` に 2 つの新メソッド**（\`crates/clob/src/book.rs\`）：\`best_bid_with_qty()\` / \`best_ask_with_qty()\`。それぞれ \`Option<(Price, Qty)>\` を返す。
- **\`precompiles/mod.rs\` にモジュールレベルの \`static CLOB_STATE\`**：\`Option<Arc<Mutex<Book>>>\` を保持。
- **\`precompiles/mod.rs\` に 3 つの新モジュール関数**：\`install_clob\` / \`uninstall_clob\` / \`current_best_bid\`。
- **\`LiveRethEvmBridge\` のフィールド型変更**：\`clob: Mutex<Book>\` を \`clob: Arc<Mutex<Book>>\` に。\`new()\` の中で \`install_clob(clob.clone())\` を呼ぶ。

**\`read_best_bid\` 本体は変更しません** — 引き続きハードコードの \`(100, 10)\` を返します。L5 で live state に差し替えます。L4 の仕事は配管を**通せる状態にする**こと（まだ通しません）。

## おさらい

L3 終了時点（Module 1 完了時点）：

- カスタム EVM precompile は登録済みで、呼び出しも検証済み。
- 全テスト（course 6 + 7 + L3 の新 4 件）が green。
- \`LiveRethEvmBridge::new()\` は \`clob: Mutex::new(Book::new())\` を作る — 誰とも共有していない所有。
- \`read_best_bid\` はハードコード。

**ブリッジと precompile は互いの存在を知りません。** precompile はハードコード値を返し、ブリッジの CLOB は EVM 実行から見えません。L4 ではこの 2 つをプロセスグローバルなハンドルで繋ぎます。

## プラン

6 ステップ：

1. **\`best_bid_with_qty\` + \`best_ask_with_qty\` を \`Book\` に追加**。既存の \`best_bid()\` は価格だけを返す。新メソッドは \`(price, summed_qty_at_that_level)\` — その価格レベルの FIFO キュー内の数量合計 — を返す。precompile が 2 値レスポンスを返すために必要。
2. **\`precompiles/mod.rs\` の imports を更新** — \`openhl_clob::Book\` と \`std::sync::{Arc, Mutex, RwLock}\` を追加。
3. **モジュールレベルの \`static CLOB_STATE\` を追加** — \`RwLock<Option<Arc<Mutex<Book>>>>\`。\`RwLock\`（\`Mutex\` ではなく）にする理由は、precompile からの read は install からの write より圧倒的に多いから。
4. **3 つのモジュール関数を追加** — \`pub fn install_clob(...)\`, \`pub fn uninstall_clob()\`, \`pub fn current_best_bid() -> Option<...>\`。ブリッジから呼べるよう public。
5. **ブリッジの \`clob\` フィールド型を \`Mutex<Book>\` → \`Arc<Mutex<Book>>\`** に変更。\`new()\` で \`install_clob(clob.clone())\` を呼んで、precompile がブリッジと同じ \`Book\` を見るようにする。
6. **\`read_best_bid\` は触らない** — まだハードコード値を返す。L5 で \`current_best_bid()\` に差し替え。

L4 終了時点では、ブリッジと precompile の間の**配線は存在する**が、**まだ電流は流れていない**。precompile は live CLOB を無視したまま。L5 で初めて読みに行きます。

> 🛑 **考えてみよう。** スクロール前に考えてください — REVM の \`PrecompileFn\` は \`fn(&[u8], u64, u64) -> PrecompileResult\` で、**関数ポインタ**であって \`Fn\` クロージャではありません。つまり環境をキャプチャできません（\`move |...| { ... }\` が書けない）。**だとすれば、precompile に instance ごとの state を渡す唯一の方法は？** ヒント：「引数として渡されない関数間で可変な共有 state を扱う」ための Rust の典型パターンを 2 つ思い浮かべてください。

（答え：プロセスグローバル storage。\`Arc<Mutex<Book>>\` を precompile 関数に**引数として渡す**ことはできない — 関数ポインタのシグネチャは固定。だから precompile は \`static\` 変数からその共有 state を読む。ブリッジが \`install_clob\` で static に書き込み、precompile が \`current_best_bid()\` で読む。これは関数ポインタのシグネチャがクロージャキャプチャを許さないときの定石パターン。**トレードオフ：プロセスあたり CLOB は 1 つ。** 単一バリデータの openhl では受容可能。REVM の将来バージョンで関数ポインタ制約が緩めば変わるかも。）

## 手順

### Step 1: \`Book\` に \`best_bid_with_qty\` + \`best_ask_with_qty\` を追加

\`crates/clob/src/book.rs\` を開く。既存の \`best_bid\` / \`best_ask\` メソッドを探して、その直後に 2 つの新メソッドを追加：

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

既存の \`best_bid()\` は \`Option<Price>\` のみ。新メソッドはその価格 **+ そのレベルに resting する数量合計** — その best price の FIFO キュー内の全注文の数量合計 — を返します。

これが precompile が必要とする形。Solidity 側の戻り値シグネチャは \`(price: u256, qty: u256)\`。precompile は 64-byte レスポンスを埋めるために両方の値が必要。

> 🛑 **やりがちな勘違い。** 「precompile が \`best_bid()\` と \`depth_bid()\` を別々に呼べばよくない？」 **\`depth_bid()\` は全 bids にわたる注文の数を返すのであって、best level の qty ではありません。** 別のメトリクスです。\`best_bid_with_qty()\` こそが precompile の契約形 — 「最良価格はいくらで、その価格にどれだけ流動性があるか」 — に合った形。

### Step 2: \`precompiles/mod.rs\` の imports を更新

\`crates/evm/src/precompiles/mod.rs\` を開く。L2 終了時点の imports：

\`\`\`rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
\`\`\`

2 行追加：

\`\`\`rust
use openhl_clob::Book;
use std::sync::{Arc, Mutex, RwLock};
\`\`\`

3 つの新しい型が入ってくる：
- **\`Book\`** — 共有するマッチングエンジン state。
- **\`Arc\`** — atomic な参照カウントハンドル。ブリッジと precompile の両方が 1 つずつ持つ。
- **\`Mutex\`** — \`Book\` 本体を守る（course 7 のブリッジパターン）。
- **\`RwLock\`** — \`Option<...>\`（共有 \`Arc<Mutex<Book>>\` のラッパ）を守る。**Read（precompile 呼び出しごと）は write（プロセスあたり 1 回の install）より圧倒的に多い**ので \`RwLock\` で並行 read を許容。

### Step 3: モジュールレベルの \`static CLOB_STATE\` を追加

imports の下、関数の前に：

\`\`\`rust
/// Process-global handle to the CLOB the precompile reads from.
///
/// \`None\` until [\`install_clob\`] is called (typically by \`LiveRethEvmBridge::new\`).
/// While \`None\`, \`read_best_bid\` returns zero-encoded output rather than
/// erroring — this keeps existing tests deterministic and matches what an
/// uninitialised perp market would return on mainnet.
static CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>> = RwLock::new(None);
\`\`\`

1 行で多くを語っています：

- **\`static CLOB_STATE\`** — プロセスグローバル。プログラムのライフタイム全体で生きる。
- **\`RwLock<...>\`** — 外側のロック。「CLOB がインストールされているか？」と「CLOB の中身は？」を分離。
- **\`Option<...>\`** — ブリッジが CLOB を install する前は \`None\`、install 後は \`Some(Arc<Mutex<Book>>)\`。
- **\`Arc<Mutex<Book>>\`** — 共有ハンドル。ブリッジが 1 Arc、この static が 1 Arc 持つ。ブリッジが \`Book\` を変更すれば（\`clob.lock().submit(...)\`）、precompile から同じ変更が見える（\`clob.lock().best_bid_with_qty()\`）。
- **\`RwLock::new(None)\`** — \`const fn\` なのでコンパイル時に評価される。ランタイム初期化レースがそもそも起こりえない。

ドキュメントコメントがレッスンの肝 — \`None\` は「未インストール」状態であり、エラーではなく zero bytes を返すことを明示。メインネットで未初期化の perp market を読む契約はゼロ値を見る — その挙動と一致させる。

> 🛑 **やりがちな勘違い。** 「\`lazy_static!\` や \`OnceLock\` を使えばいいんじゃ？」 **使えますが、過度に制約されます。** \`OnceLock\` は 1 回だけ set 可能 — でも \`install_clob\` はテスト隔離のために再呼び出し可能にしたい。\`lazy_static!\` は unsafe な初期化トリックが要る — Rust 1.63 以降の \`static RwLock<...> = RwLock::new(None)\` ならそれが要らない。素の \`static RwLock<...>\` こそ 2024 年の最もクリーンなイディオム。

### Step 4: 3 つのモジュール関数を追加

static の下に：

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

3 つとも \`pub\` にする理由：

- **\`install_clob\`** — ブリッジが \`new()\` で呼ぶ。直前の install を**置き換える** — 同じ Arc を 2 回呼べば idempotent。\`*CLOB_STATE.write().expect(...) = Some(clob)\` は「write lock 取得 → 値 set → release」の典型イディオム。
- **\`uninstall_clob\`** — テスト用が典型。テスト setup で install / 後始末で uninstall。Production では稀。
- **\`current_best_bid\`** — EVM 経由でなく直接テストできるよう露出。流れ：write lock → read lock → option deref → mutex lock → \`best_bid_with_qty()\`。**3 つのロック**を経由して 1 値を読む — 高くつくように見えるが各々マイクロ秒オーダー、しかも reads は \`RwLock\` 下で並行可能。

> 🛑 **やりがちな勘違い。** 「1 read に 3 ロックは無駄じゃ？」 **ロックはそれぞれ別の目的を持っています。** \`RwLock\` は installed-vs-uninstalled を分離（write 衝突は稀）。\`Mutex<Book>\` はマッチングエンジン state を守る（write 衝突は頻繁だがミリ秒）。1 つのロックに統合したら、全 read + write がそのロックで一様に直列化される — 並行性は遥かに悪化。**多層ロックは多層の関心事を反映している。**

### Step 5: \`LiveRethEvmBridge::clob\` を \`Arc<Mutex<Book>>\` に変更

\`crates/evm/src/live_node.rs\` を開く。\`LiveRethEvmBridge\` の struct 定義を探す：

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Mutex<Book>,
    pending_fills: Mutex<Vec<Fill>>,
    state: Mutex<State>,
}
\`\`\`

\`clob\` を変更：

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
\`\`\`

そして \`new()\` を探す：

\`\`\`rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            clob: Mutex::new(Book::new()),
            pending_fills: Mutex::new(Vec::new()),
            state: Mutex::new(State::default()),
        }
    }
\`\`\`

Arc で包んで install するように更新：

\`\`\`rust
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

3 つの変更：

1. **\`let clob = Arc::new(...)\`** — Arc をローカル束縛。\`install_clob\` 用と struct 内用で 2 回使うため。
2. **\`crate::precompiles::install_clob(Arc::clone(&clob))\`** — precompile モジュールと Arc を共有。**\`Arc::clone(&clob)\` は refcount をインクリメント** — ブリッジと static の両方が強参照を持つ。
3. **struct リテラル内の \`clob,\`** — \`clob\` のみ（フィールド名とローカル名が同じ）。

\`precompiles\` は \`crates/evm/\` の private モジュールだが \`install_clob\` は \`pub fn\` — crate 内なら \`crate::precompiles::install_clob\` でアクセス可能。

### Step 6: 他の壊れた箇所がないか確認

\`live_node.rs\` の他のコードが \`clob: Mutex<Book>\` 前提で書かれていないか確認 — \`Arc<Mutex<Book>>\` 前提のみのはず。\`self.clob.lock()\` の呼び出しを探す。動きます — \`Arc<Mutex<Book>>\` は \`Mutex<Book>\` に deref coercion されるので、\`self.clob.lock()\` は変更不要。

\`clob\` が使われている他の箇所：
- \`submit_order(&self, order: Order)\` — \`self.clob.lock()\` を使用。動く（Arc が内側の Mutex に deref）。
- 以上。

\`build_payload\` / \`payload_ready\` 等は \`clob\` を直接触っていない。

## テスト

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

30 秒ほど待つと：

\`\`\`
running 42 tests
... 42 tests pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

L3 のテストは全部 green のまま。注意：**L3 の unit tests は今もハードコード値**（\`U256::from(100u64)\`, \`U256::from(10u64)\`）**を期待**しています — 我々はまだ \`read_best_bid\` を変えていないから。配管は通したが、\`read_best_bid\` を流れる値はまだハードコード。

配管が実際に効いているか sanity check したければ（L5 で本体を差し替える前に）、ワンオフを書いてもよい：

\`\`\`rust
#[cfg(test)]
mod smoke {
    use super::*;
    use openhl_clob::{AccountId, Book, Order, OrderId, OrderType, Price, Qty, Side};
    use std::sync::{Arc, Mutex};

    #[test]
    fn current_best_bid_reflects_installed_clob() {
        crate::precompiles::uninstall_clob();
        let book = Arc::new(Mutex::new(Book::new()));
        book.lock().unwrap().submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Buy,
            qty: Qty(7),
            order_type: OrderType::Limit { price: Price(250) },
        });
        crate::precompiles::install_clob(Arc::clone(&book));
        let result = crate::precompiles::current_best_bid();
        assert_eq!(result, Some((Price(250), Qty(7))));
        crate::precompiles::uninstall_clob();
    }
}
\`\`\`

実行：\`cargo test -p openhl-evm current_best_bid_reflects_installed_clob\`。通るはず。**確認できたら消す** — L5 以降が本物のテストセットを持つ。

よくあるエラーと対処：

- **\`error[E0277]: 'Arc<Mutex<Book>>' is not 'Mutex'\`** — \`submit_order\` の \`self.clob.lock()\` がコンパイラに弾かれている。実は動くはず — \`Arc<Mutex<Book>>\` は \`&Mutex<Book>\` に deref する。このエラーが出るなら、どこかで \`self.clob.deref().lock()\` を書いている可能性 — それは間違った形。\`self.clob.lock()\` だけが正しい。
- **\`error[E0277]: 'PoisonError<RwLockWriteGuard<Option<Arc<Mutex<Book>>>>>' is not 'Send'\`** — テストや呼び出し側で poisoned lock が panic している。\`.expect(...)\` は標準パターン。これが見えるならどこかでロック保持中の panic が起きている。
- **Static initialization warning** — Rust 1.63+ は \`static RwLock<T> = RwLock::new(...)\` を直接サポート。「calls in static contexts are unstable」が見えるなら toolchain が古い — L0 の前提を確認。
- **\`unused variable: clob\` in \`new()\`** — struct リテラル内で \`clob\` を使い忘れている。\`let clob = Arc::new(...)\` で束縛した変数は struct 内に \`clob,\` として登場する必要がある。

## 設計の振り返り

ここに焼き込んだ重要な決定 3 つ：

1. **関数ポインタのシグネチャ制約に対する定石は process-global state。** REVM の \`PrecompileFn = fn(...) -> PrecompileResult\` は関数ポインタであってクロージャではない。state をキャプチャできない。残る選択肢：(a) 関数引数として受け取る（REVM API 変更が必要）、(b) process-global から読む。我々は (b)。**コスト：プロセスあたり CLOB 1 つ。** 単一バリデータ deployment なら OK、マルチテナントなら REVM API 変更が必要。

2. **外側の Option には \`RwLock\`、内側の \`Book\` には \`Mutex\`。** 外側のロックは installed-vs-uninstalled を分離（write は稀）。内側のロックはマッチングエンジン state を守る（write 頻繁 — submit ごと）。アクセスパターンごとに異なるロック型。\`Mutex<Option<Arc<Mutex<Book>>>>\` 一発なら全 read が 1 つのボトルネックを通る。

3. **\`install_clob\` は置き換え、エラーにしない。** 異なる CLOB で 2 回呼ぶと黙って 1 つ目を置き換える。検知して panic させてもよいが、production パスは 1 回しか呼ばない。テストは install/uninstall を繰り返す。**置き換えはテストにとってバグでなく機能。** ドキュメントコメントで明示。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

L4 終了時点ではあなたのコードは Stage 9b に**部分的に**一致：新メソッド、static、3 関数、ブリッジのフィールド変更まで。残る差分は：
- \`read_best_bid\` がまだハードコード（L5 で差し替え）。
- L3 の unit tests がまだハードコード値を期待（L5 で更新）。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`CLOB_STATE\` は \`&'static\` で、ヒープ割り当てではない？**
Static storage は最もシンプルなライフタイム — プログラム開始から終了まで。ヒープ割り当て（\`Box::leak\` など）でも動くがランタイム allocation コストと複雑度が増える。「プログラム開始から終了まで存在」が欲しい場合 — まさに我々のケース — \`static\` が正しい道具。

**Q: \`LiveRethEvmBridge\` が並行テストなどで 2 個作られたら？**
2 つ目の \`install_clob\` 呼び出しが 1 つ目を置き換える。**両ブリッジが global 経由で 2 つ目の CLOB を共有することになる。** だからテストは serialization が必要（L5 で導入）。Production deployment はブリッジを 1 つだけ作る — 問題にならない。

**Q: \`current_best_bid\` は \`Option<...>\` でなく \`Result<...>\` でもいい？**
できる — \`Err(NoClobInstalled)\` を \`None\` の代わりに返してもよい。だが precompile は「CLOB 未インストール」と「CLOB インストール済みだが空」を区別する必要がない — 両方ともゼロを返すべき。\`Option\` は両ケースを \`None\` に潰す。\`Result\` だと precompile が分岐処理を強いられる — 利得なし。

**Q: \`current_best_bid\` 内で \`book.lock()\` が panic したら？**
\`.expect("clob mutex poisoned")\` が panic し、\`current_best_bid\` → \`read_best_bid\` → REVM の dispatch まで伝播。REVM はこれを fatal precompile error として扱い EVM を halt（おそらく transaction 全体を revert）。**これが正しい挙動** — poisoned Mutex は別スレッドがロック保持中に crash したことを意味し、不整合な state で走り続けるより abort のほうがマシ。

## 次のレッスン（L5）

配管は通したが precompile はまだ無視している。L5 は \`read_best_bid\` の本体を \`current_best_bid()\` 呼び出しに差し替え。L3 のテストを CLOB 未 install 時に zero output を期待するように更新。並行テストが global state を競合しないよう \`TEST_SERIALIZER\` を追加。L5 後、\`read_best_bid\` は live state を読む — ただしラウンドトリップを実行するテストは、あなたがインラインで書く smoke test だけ。L6 でラウンドトリップテストを正式化する。`,
                },
                {
                  title: "レッスン 5 — read_best_bid が配線を読む — current_best_bid() に差し替え",
                  slug: "openhl-precompiles-swap-to-live-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン 5 — \`read_best_bid\` が配線を読む — \`current_best_bid()\` に差し替え

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…が引き続き通る（42 tests）。ただし内部では、precompile はもう**live state を読む** — ハードコード値ではなく：

- **\`read_best_bid\` 本体を差し替え** — \`let mut out = vec![0, 0, ..., 100, 0, 0, ..., 10]\` のハードコードを捨て、\`if let Some((price, qty)) = current_best_bid() { ... out に書き込む ... }\` に。CLOB 未インストール → 64-byte の zero（「未初期化 perp market」セマンティクスに一致）。
- **L3 の \`read_best_bid_returns_hardcoded_price_and_qty\` テストを rename** → \`read_best_bid_returns_zero_when_no_clob_installed\`。形は同じ、100/10 でなく zero をアサート。
- **L3 の \`registered_precompile_is_invokable_via_registry\` を更新** — 同じロジック。ただしまず CLOB を uninstall して zero output を期待。
- **新規 \`static TEST_SERIALIZER: Mutex<()>\` をテストモジュール先頭に追加** — \`CLOB_STATE\` を触るテストはまずこのロックを取る。並列 \`cargo test\` だと global が競合するため。

course-7 + L3 の callability テストは引き続き通る。アサーションだけ変わる。**大きな証明 — 「live CLOB データが EVM 出力までラウンドトリップする」 — は L6 の仕事。** L5 は差し替え。L6 が end-to-end の動作を実証。

## おさらい

L4 終了時点：

- \`Book\` に \`best_bid_with_qty\` / \`best_ask_with_qty\`。
- \`precompiles/mod.rs\` に \`CLOB_STATE\` static + 3 つのモジュール関数。
- \`LiveRethEvmBridge::new\` が \`install_clob(Arc::clone(&clob))\` を呼ぶ。
- **だが \`read_best_bid\` はまだハードコードの \`(100, 10)\` を返す** — 配管は誰も使っていない。

L5 でついに使う。

## プラン

\`crates/evm/src/precompiles/mod.rs\` に 4 つの編集：

1. **\`read_best_bid\` 本体を差し替え** — \`current_best_bid()\` を呼んで、\`Some\` のときだけ非ゼロ byte を書き込む。
2. **関数のドキュメントコメントを更新** — ハードコード文言を消し、「no bid または CLOB 未インストールなら 0」セマンティクスに置き換え。
3. **テストモジュールに \`static TEST_SERIALIZER: Mutex<()>\` を追加。**
4. **L3 最初のテストを rename + 書き換え** + **L3 最後のテストを更新** — 両方 \`CLOB_STATE\` を触るので両方 serializer ロックを取り、まず \`uninstall_clob()\` を呼ぶ。

モジュールレベルのシグネチャは変わらない。registry テスト（\`openhl_precompiles_registers_clob_address\`）は \`CLOB_STATE\` を触らないのでそのまま。

> 🛑 **考えてみよう。** スクロール前に — \`cargo test\` はデフォルトで**並列実行**（典型的には logical CPU 1 つにつき 1 スレッド）。我々のテスト 2 つが \`CLOB_STATE\` を read or write する。**serialize しないとどんな failure mode が出る？** ヒント：「あるテストが \`None\` を期待しているときに、瞬間的に \`Some(clob_A)\` になりうる」状況を想像してみる。

（答え：**flaky test**。テスト A が CLOB を install、テスト B は「CLOB なし → zero output」を assert したい — でも B が A の \`install_clob\` と \`uninstall_clob\` の間に走ったら、B は A の CLOB を見て間違った値を assert する。失敗率はテストスケジューリング次第 — 時々 0%、時々 30%。CI がランダムに flake する。\`TEST_SERIALIZER\` mutex パターンはこれらのテストを 1 つずつ走らせて race を排除。**コスト：0.0 秒（これらのテストはマイクロ秒で終わる）。便益：deterministic な CI。**）

## 手順

### Step 1: \`read_best_bid\` 本体を差し替え

\`crates/evm/src/precompiles/mod.rs\` を開く。現在の L2/L3 の本体を探す：

\`\`\`rust
#[allow(clippy::unnecessary_wraps)]
fn read_best_bid(_input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    // Hardcoded: price=100, qty=10, both as big-endian u256 (32 bytes each).
    let mut out = vec![0u8; 64];
    out[31] = 100;  // price (last byte of first 32-byte word)
    out[63] = 10;   // qty   (last byte of second 32-byte word)
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
\`\`\`

これに置き換え：

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

3 つの変化：

- **\`let mut out = vec![0u8; 64]\`** — 同じ出発点、全 zero。
- **\`if let Some((price, qty)) = current_best_bid()\`** — global を read。\`None\` なら body を short-circuit、\`out\` は zero のまま。
- **\`out[24..32].copy_from_slice(&price.0.to_be_bytes())\`** — \`Price\` は \`u64\` をラップ。\`to_be_bytes()\` は \`[u8; 8]\` を返す。その 8 bytes を 32-byte word の**最後の 8 bytes** (position 24..32) にコピー。先頭 24 bytes は zero — それが u64 値の big-endian u256 エンコーディング。
- **qty も同じく \`out[56..64]\`** — 2 つ目の 32-byte word、最後の 8 bytes。
- **ハードコードの \`out[31] = 100\` と \`out[63] = 10\` は消える。**

> 🛑 **やりがちな勘違い。** 「明快さのために \`U256::from(price.0).to_be_bytes::<32>().copy_from_slice(...)\` でいい？」 **一時的な \`[u8; 32]\` を allocate してから byte-by-byte でコピー**する。直接 \`out[24..32].copy_from_slice(&price.0.to_be_bytes())\` なら output buffer に直接書き込んで中間 allocation なし。**同じ結果、半分の仕事。** Precompile は hot path — マイクロ秒が積み重なる。

### Step 2: ドキュメントコメントを更新

L2 のドキュメントコメントはハードコード中心：

\`\`\`rust
/// Returns hardcoded best-bid data as two big-endian u256s (64 bytes total).
/// Stage 9a's purpose is to prove the precompile is reachable from EVM execution;
/// Stage 9b will swap in live CLOB state.
///
/// Encoding:
///   bytes  0..32  big-endian u256 = 100 (price)
///   bytes 32..64  big-endian u256 = 10  (qty)
\`\`\`

live state 版に置き換え：

\`\`\`rust
/// Reads the best bid (highest-priced buy order's price + total qty at that
/// level) from the currently-installed CLOB and returns it as two
/// big-endian u256s (64 bytes total).
///
/// Encoding:
///   bytes  0..32  big-endian u256 price (0 if no bid or no CLOB installed)
///   bytes 32..64  big-endian u256 qty   (0 if no bid or no CLOB installed)
///
/// \`PrecompileFn\` signature is \`fn(&[u8], u64, u64) -> PrecompileResult\`;
/// the third arg is a \`reservoir\` value (extra gas budget) that we ignore
/// at v0. The Result wrapper is required by the signature even though we
/// never error — gas accounting is the EVM's responsibility.
\`\`\`

「0 if no bid or no CLOB installed」が肝 — メインネットコントラクトが対応せねばならない API 契約を明文化。**スマートコントラクトは「未インストール」と「empty book」を見分けられない** — 両方とも zero。これは意図的。区別したいなら別経路で liveness を check すべし。

### Step 3: テストモジュールに \`TEST_SERIALIZER\` を追加

\`#[cfg(test)] mod tests\` ブロック（L3 で追加した）を開く。\`use\` 文の後、テスト関数の前に：

\`\`\`rust
/// Tests in this module touch process-global \`CLOB_STATE\`. This mutex
/// serializes them so parallel test execution can't observe a torn state.
static TEST_SERIALIZER: Mutex<()> = Mutex::new(());
\`\`\`

1 行。素の \`Mutex<()>\`（payload が unit 型 — 値は見ない、ロックだけ）。\`CLOB_STATE\` を触る各テストは冒頭で：

\`\`\`rust
let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
\`\`\`

\`unwrap_or_else(PoisonError::into_inner)\` パターンが**死活** — これがないと panic したテスト 1 つで mutex が poison し、以降の全テストが \`PoisonError\` で落ちる。poison から復旧することで「このテストは 1 回 panic した」を「このテストは 1 回 panic したが後続は走る」に変える。復旧したガードも排他アクセスを与える。Poison は signal であって permanent disability ではない。

> 🛑 **やりがちな勘違い。** 「\`serial_test\` crate の \`#[serial]\` でいいんじゃ？」 **使えるが、1 個の mutex で済む話に対して dev-dep を増やす。** \`serial_test\` は proc-macro、属性パース、hash-keyed lock map に手を出す。1 つの global を触る 4 つのテストには、1 行の \`static Mutex<()>\` がちょうどよい。**複数 global を異なるロック partition で管理したくなったら crate に手を出せばよい — それ以前にはやらない。**

### Step 4: L3 最初のテストを更新（rename + 書き換え）

L3 ではこうだった：

\`\`\`rust
/// Direct unit test — the function should produce the L2 hardcoded
/// values. This is the lowest-level check before integrating into the registry.
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
\`\`\`

これに置き換え：

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

L3 との 5 つの差分：

1. **Rename** — 関数名が新セマンティクスを記述。
2. **Doc コメント書き換え** — 「uninstalled = zero」セマンティクスを説明。
3. **1 行目: \`TEST_SERIALIZER\` を取得。**
4. **2 行目: \`uninstall_clob()\`。** なぜ？ 前のテストが CLOB を install して clean up し忘れた、もしくは前回の test run が state を残した可能性があるから。\`uninstall_clob()\` は idempotent — 常に呼んで安全 — そして既知の出発状態を保証する。
5. **アサーション変更** — \`U256::from(100u64)\` / \`U256::from(10u64)\` でなく \`U256::ZERO\`。gas check はそのまま（何を返すかに関わらず precompile は同じ gas を課金）。

> 🛑 **やりがちな勘違い。** 「\`uninstall_clob()\` を毎テスト先頭で呼ぶのは、既に未インストールなら無駄では？」 **\`uninstall_clob\` は \`*CLOB_STATE.write().expect(...) = None\`** — 1 つの取得→解放、マイクロ秒。代替は共有 init 順を持つ global「test setup」関数 — はるかに大きな労力でわずかな節約。**Global state を扱うときの Rust テストの定石は「明示的な per-test reset」。**

### Step 5: L3 最後のテストを更新

L3 の \`registered_precompile_is_invokable_via_registry\`：

\`\`\`rust
#[test]
fn registered_precompile_is_invokable_via_registry() {
    let extended = openhl_precompiles(Precompiles::cancun());
    let precompile = extended
        .get(&CLOB_READ_BEST_BID)
        .expect("CLOB precompile must be registered");

    let result = precompile
        .execute(&[], 100_000, 0)
        .expect("call must not error");
    assert_eq!(result.bytes.len(), 64);
    let price = U256::from_be_slice(&result.bytes[0..32]);
    assert_eq!(price, U256::from(100u64));  // L3 hardcoded expectation
}
\`\`\`

これに置き換え：

\`\`\`rust
/// Invoke the registered precompile end-to-end through the registry
/// (rather than calling \`read_best_bid\` directly). This proves the
/// registration is wired such that an EVM dispatch to the address hits
/// our function — the same path Reth's EVM uses on \`staticcall\` to
/// \`CLOB_READ_BEST_BID\`.
#[test]
fn registered_precompile_is_invokable_via_registry() {
    let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
    uninstall_clob();

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
    // No CLOB → zero output, matching read_best_bid_returns_zero_when_no_clob_installed.
    let price = U256::from_be_slice(&result.bytes[0..32]);
    assert_eq!(price, U256::ZERO);
}
\`\`\`

L3 との 3 つの差分：

1. **\`TEST_SERIALIZER\` + \`uninstall_clob\` で開始** — テスト 1 と同じパターン。
2. **Doc コメント** — 追加（L3 にはなかった）。なぜ unit test と並べてこのテストが存在するのか説明。
3. **\`assert_eq!(price, U256::ZERO)\`** — \`U256::from(100u64)\` から変更。

真ん中のテスト（\`openhl_precompiles_registers_clob_address\`）は \`CLOB_STATE\` を触らない — registry membership だけチェック。**serializer + uninstall を追加してはいけない** — 不要な serialization で微妙な slowdown。

## テスト

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

30 秒ほどで：

\`\`\`
running 42 tests
... 42 pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

L4 と同じ test 数（42）。違うのは：
- precompile を触る 4 つのテストのうち 2 つが \`TEST_SERIALIZER\` 経由で **serialize** される。
- 修正済みの 2 つのテストは \`(100, 10)\` でなく **zero output** を assert。

serializer が何を防いでいるか直感したいなら：

\`\`\`bash
# 一時的に両テストから \`let _g = TEST_SERIALIZER.lock()...\` の行を削除。
cargo test -p openhl-evm read_best_bid -- --test-threads=8
# 20 回ぐらい走らせる。
for i in $(seq 1 20); do
  cargo test -p openhl-evm read_best_bid -- --test-threads=8 --quiet 2>&1 | grep "test result"
done
\`\`\`

時々失敗するはず — スケジューリング次第。終わったら戻す。

よくあるエラーと対処：

- **\`unused import: Order, OrderId, OrderType, Side\`** — L3 のハードコードテストでは使われていた（L5 の zero-output テストでは不要）。**残しておく** — L6 で live-state テストが使う。1 レッスンの unused warning は無害。
  - もし \`#[cfg(test)] mod tests\` に \`use openhl_clob::{...};\` が網羅して入っていれば、残しておく。L6 で必要。
- **\`error[E0599]: no method named 'lock' found for struct 'Mutex<()>'\`** — \`Mutex\` を別の場所（例：\`tokio::sync::Mutex\`）から import している。テストモジュールの \`use super::*;\` で親モジュールから \`std::sync::Mutex\` が入ってくるはず。
- **1 回通ったあと失敗 — \`PoisonError\`** — 1 つのテストが \`TEST_SERIALIZER\` 保持中に panic した。\`unwrap_or_else(PoisonError::into_inner)\` パターンがこれを復旧する。両テストで正確にこの形になっているか確認。
- **個別に走らせると通る、並列だと落ちる** — \`TEST_SERIALIZER\` が実際には適用されていない。\`let _g = TEST_SERIALIZER.lock().unwrap_or_else(...)\` が**最初の文**（\`uninstall_clob()\` の前）であることを確認。\`_g\` が途中で drop されると（例：shadow される）テストの途中でロックが解放される。

## 設計の振り返り

ここに焼き込んだ重要な決定 3 つ：

1. **未インストール CLOB は zero を返し、エラーにしない。** メインネット相当は「未初期化 storage slot は zero を返す」 — Solidity コントラクトが自然に処理する。エラーにすると、bootstrap 中（ブリッジが CLOB を install する前）に precompile が呼ばれたら transaction が revert する。Zero を返せば gracefully に degrade — コントラクトは「流動性なし」と見て trade を控える。それが正しい挙動。

2. **\`TEST_SERIALIZER\` はモジュール単位、global ではない。** \`CLOB_STATE\` を触らない \`live_node.rs\` のテストはこれと serialize すべきでない。モジュールローカル mutex で partition を狭く保つ。

3. **テストは末尾でなく先頭で \`uninstall_clob()\` を呼ぶ。** なぜ対称的でない？ **Panic したテストは cleanup コードを走らせない**から。テスト中 panic すれば CLOB が install されたまま残る。次のテストの「start-of-test reset」が拾う。Live-state テスト（L6）では末尾でも uninstall するが、それは明快さのため — safety net は start-of-test reset。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

L5 終了時点であなたのコードは Stage 9b に**かなり近い** — 同じ \`read_best_bid\` 本体、同じ \`TEST_SERIALIZER\`、同じ 2 つの更新テスト。残る差分：Stage 9b には \`read_best_bid_returns_live_state_when_clob_installed\` もある — L6 で追加。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`read_best_bid\` は CLOB 未インストール時に gas を減らさない？**
条件付きで \`current_best_bid()\` が \`None\` なら少ない gas を返す、にできる。が、それは実装詳細を露出する — 攻撃者は gas を測ってあなたの validator が CLOB を install したかを検出できる。一律の \`CLOB_BASE_GAS_COST\` 課金が標準的「constant-time precompile」パターン。**Gas 課金は state を leak すべきでない。**

**Q: \`u64::to_be_bytes()\` と \`U256::to_be_bytes::<32>()\` の違い？**
\`u64::to_be_bytes()\` は \`[u8; 8]\` — 8 bytes。\`U256::to_be_bytes::<32>()\` は \`[u8; 32]\` — 左 zero-padding した 32 bytes。**我々のケース（8-byte source 値、32-byte destination）では、source 形状の 8 bytes を destination の右端 8 bytes にコピーしたい。** それが \`out[24..32].copy_from_slice(&u64_bytes)\`。U256 版だと 32 bytes 全部コピー（うち 24 bytes は zero） — 同じ結果、4 倍の仕事。

**Q: \`TEST_SERIALIZER\` があっても flake する？**
通常の \`cargo test\` 実行では、しない。Mutex が 2 つの test スレッドが \`CLOB_STATE\` の修正途中を観測することを防ぐ。それでも flake する edge case：(a) \`current_best_bid\` 内で panic して mutex が poison（\`into_inner\` で復旧）、(b) テストモジュール外のコードが \`CLOB_STATE\` に書き込む（\`reth_node.rs\` の integration test がいずれ触り始めたら問題 — まだ触っていない）。

**Q: 単に precompile の input bytes を通して CLOB を渡せばいいんじゃ？**
Smart contract は \`staticcall(gas, addr, input, output)\` で precompile を呼ぶ。Input は contract が組み立てた calldata — **node operator が** CLOB pointer を挿し込む方法はない。Precompile の input bytes は user-controlled であって node-controlled ではない。Process-global state こそが node operator が持つ唯一の注入点。

## 次のレッスン（L6）

配線は通ったが、ラウンドトリップを exercise する test がまだない。L6 で \`read_best_bid_returns_live_state_when_clob_installed\` を追加：既知の bid を持つ CLOB を install、precompile を呼ぶ、その bid が output bytes にラウンドトリップすることを検証。証明 — \`Solidity contract → STATICCALL → EVM dispatch → REVM precompile registry → 我々の関数 → live Book lock → encoded を返す → contract が real data を見る\` — ついに end-to-end で実証。これが **Module 2 のマイルストーン**。`,
                },
                {
                  title: "レッスン 6 — Module 2 マイルストーン — ラウンドトリップを証明する",
                  slug: "openhl-precompiles-live-state-proof-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 6 — Module 2 マイルストーン — ラウンドトリップを証明する

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…が 43 tests を通る（1 新規）。新規テストは \`read_best_bid_returns_live_state_when_clob_installed\`。これまで全テストが寸前で止まっていたことをやる：**既知の bid を持つ CLOB を install、precompile を呼ぶ、precompile の出力 bytes がその bid の price と qty を encode していることを観測する。**

これがマイルストーン。フルチェーン — \`CLOB に bid 発注 → bridge が Mutex 経由で書き込み → precompile が global 経由で read → 64-byte ABI encode → 呼び出し元に返す\` — がついに end-to-end で exercise される。L6 後：

- Module 2 (Read precompile) **完了**：\`STATICCALL(0x...0c1b)\` を発行する Solidity コントラクトは live CLOB state を受け取る。
- パターン（precompile が global Arc から read する）が証明済み — 将来 stage で追加 read precompile（best_ask、depth、mid-price 等）に複製できる。
- Module 3 (Write precompile、L7-L9) は同じインフラの上に逆方向で構築：precompile が CLOB state に**書く**。

## おさらい

L5 終了時点：

- \`read_best_bid\` が \`current_best_bid()\` を呼ぶ（live パス）。
- L3 の 2 テストが**未インストール**セマンティクスを assert — CLOB なしで zero output。
- \`TEST_SERIALIZER\` 配置済み。
- **だが、空でない CLOB を install して値がラウンドトリップで流れるのを観測するテストが 1 つもない。** 配線は通ったが計測されていない。

L6 で配線を計測する。

## プラン

\`crates/evm/src/precompiles/mod.rs\` の \`#[cfg(test)] mod tests\` ブロック内に 1 つの編集：新しい test 関数を追加。

以上。プロダクションコードは無変更。**L6 は純粋なテスト追加** — そしてコース中最も重要なテスト。

テストの構造：

1. **Setup** — \`TEST_SERIALIZER\` を取得。（最初に \`uninstall_clob()\` は呼ばない。すぐ自分の CLOB を install するため。）
2. **Book を構築** — \`Arc::new(Mutex::new(Book::new()))\`。
3. **2 つの bid を rest** — 1 つは price 250 qty 7（best になる）、1 つは price 240 qty 99（価格が低いので qty が大きくても**選ばれてはいけない**）。
4. **CLOB を install** — \`install_clob(book)\`。
5. **precompile を直接呼ぶ** — \`read_best_bid(&[], 100_000, 0)\`。
6. **Decode + assert** — price=250 (not 240)、qty=7 (not 99 — wrong level での大きな qty が罠)。
7. **Cleanup** — \`uninstall_clob()\` を末尾で呼ぶ（明快さのため、安全のためではない）。

> 🛑 **考えてみよう。** スクロール前に — 2 つの bid を持つ Book を install する。\`(price=250, qty=7)\` と \`(price=240, qty=99)\`。**\`read_best_bid\` は何を返す？** 正しく答えられたらマッチングエンジンの「最良価格優先」不変条件を掴んでいる。間違えたらテストがあなたの誤解を捕まえる。

（答え：\`price=250, qty=7\`。**「Best bid」 = 最高価格、最大数量ではない。** qty=99 の order はより悪い価格 (240) に置かれており、best-bid response の候補にすら入らない。これはクラシックな order-book 不変条件：価格レベル内では price-time priority、レベル間では price priority。初心者は「best = most liquidity」と思いがち — それは間違い。**Best bid とは market sell が最初に当たる先。** Market sell は 250-bid に最初に当たる — 最高価格を提示するから。250 レベルを使い切ってから 240 に下りる。）

## 手順

\`crates/evm/src/precompiles/mod.rs\` を開く。既存の \`#[cfg(test)] mod tests\` ブロックを探す。

テストモジュール先頭の imports に \`Order, OrderId, AccountId, OrderType, Price, Qty, Side\` が含まれていることを確認（L5 を通してまさにこのレッスンのために残しておいた）：

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use alloy_primitives::U256;
    use openhl_clob::{AccountId, Order, OrderId, OrderType, Price, Qty, Side};

    static TEST_SERIALIZER: Mutex<()> = Mutex::new(());

    // ... read_best_bid_returns_zero_when_no_clob_installed (L5)
    // ... openhl_precompiles_registers_clob_address (L3)
    // ... registered_precompile_is_invokable_via_registry (L5)
}
\`\`\`

もし \`Order\` / \`OrderId\` / \`AccountId\` / \`OrderType\` / \`Price\` / \`Qty\` / \`Side\` のどれかが欠けていたら追加。

ではこのテストを追加。場所のベスト：L5 の \`read_best_bid_returns_zero_when_no_clob_installed\` テストと \`openhl_precompiles_registers_clob_address\` テストの間：

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

7 つの部品を歩いていく。

### Step 1: ドキュメントコメント

\`\`\`rust
    /// **Stage 9b end-to-end**: install a CLOB with a known bid, call the
    /// precompile, observe the live data flow through to the EVM-visible
    /// response. This is the moment custom EVM execution reads real
    /// orderbook state.
\`\`\`

太字の「Stage 9b end-to-end」は意図的なフラグ。マイルストーンテストを grep で探す人がこれを見つける。コードベースを読む将来のエンジニアには「これは feature 全体の証明」が見えるべき — 「ただの unit test」ではなく。

### Step 2: serializer を取得

\`\`\`rust
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
\`\`\`

L5 の 2 テストと同じパターン。**ここでは \`uninstall_clob()\` を呼ばない** — どうせ自分の CLOB を install する。何が現在 install されていようと \`install_clob\` で原子的に置き換わる。Serializer だけで十分。

### Step 3: Book を構築

\`\`\`rust
        let book = Arc::new(Mutex::new(Book::new()));
\`\`\`

\`Arc::new(Mutex::new(Book::new()))\` がまさに \`install_clob\` が期待する形。我々が 1 Arc 保持、\`install_clob\` 後は global がもう 1 つ持つ。

### Step 4: 2 つの bid を意図的に敵対的に rest

\`\`\`rust
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
\`\`\`

1 つでなく 2 つの order。2 つ目（\`240, qty=99\`）は**間違った実装に対する罠**：

- 「最大 qty の order を返す」素朴な実装は \`(240, 99)\` を返す。Fail。
- 「最初に submit された order を返す」素朴な実装は \`(250, 7)\` を返す。Pass — ただし偶然。
- 「最後に submit された order を返す」素朴な実装は \`(240, 99)\` を返す。Fail。
- 「最高価格の price level、その level の合計 qty を返す」正しい実装は \`(250, 7)\` を返す。Pass。

\`(250, 7)\` の order だけなら、すべての素朴な実装が pass する。\`(240, 99)\` の order が**正しさを偶然から分離**する。**「Best = 最高価格、最大数量ではない」を証明する最小の order 数は 2 つ。**

> 🛑 **やりがちな勘違い。** 「Order ID と account ID が違うのはなぜ？ 再利用したほうがクリーンじゃない？」 **違わねばならない理由：\`submit()\` は \`OrderId\` でインデックスする。** 2 つ目の order に \`OrderId(1)\` を再利用すると失敗するか、最初を黙って上書きする。Different ID は重要。Account ID はこのテストでは cosmetic だが、実世界パターン（異なる trader、異なる order）を示唆している。

> 🛑 **やりがちな勘違い。** 「\`book.lock().unwrap().submit(...)\` を \`let mut book = book.lock().unwrap();\` + \`submit\` 2 回呼び出しに分けたほうが明快じゃ？」 **そうなる、そしてロックを 2 回でなく 1 回取得する。** だがテストコードは run より read される回数が多い。各 \`submit\` を自己完結 + 明白に保ちたい。**2 マイクロ秒のコストは見えない。読みやすさの利得は大きい。** Hot-path のプロダクションコードでは違うルール（1 回取得、1 回解放）。

### Step 5: Install + invoke

\`\`\`rust
        install_clob(book);

        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
\`\`\`

\`install_clob(book)\` — \`book\` をムーブしていることに注目。**\`Arc::clone(&book)\` ではない** — install 後 \`book\` を使わないから。\`install_clob(Arc::clone(&book))\` と書いて \`book\` を以後使わないと clippy が \`unused_variable\` を出す。Move が正しい。

\`read_best_bid(&[], 100_000, 0)\` — 直接 unit-style 呼び出し。Registry 経由（\`registered_precompile_is_invokable_via_registry\` のように）でも呼べるが、registry path は L5 で証明済み。**L6 の仕事は「live CLOB が install されたときに関数がそこから read することを証明する」。** 直接呼び出しがそれを最もクリーンに assert する。

\`&[]\` 空 calldata は意味がある：\`read_best_bid\` は input を無視する（「best bid は？」にパラメータは不要）。100_000 gas は十分以上 — \`CLOB_BASE_GAS_COST = 500\` を測定済み。

### Step 6: Decode + assert

\`\`\`rust
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(250u64), "best bid is the 250 order, not 240");
        assert_eq!(qty, U256::from(7u64), "qty at the best level is 7");
\`\`\`

\`from_be_slice\` デコーダは L5 Step 1 の \`to_be_bytes\` の逆。\`out[24..32]\` に 8 bytes 書き、デコーダは \`result.bytes[0..32]\` から 32 bytes 読む — 先頭 24 zero bytes + 8 value bytes が同じ u64 にラウンドトリップする。

アサーションメッセージは**装飾ではない**。素の \`assert_eq!(price, U256::from(250u64))\` の failure は \`left != right\` と報告 — テストの意図は読者に推測させる。「best bid is the 250 order, not 240」というメッセージは**即座に**どの概念的前提が間違っているかを伝える。**マイルストーンテスト特には、アサーションメッセージはドキュメンテーションとしても機能する。**

### Step 7: Cleanup

\`\`\`rust
        uninstall_clob();
    }
\`\`\`

**モジュール中で末尾で明示的に uninstall するのはこのテストだけ。** なぜこれだけ？

- L5 の 2 つの zero-output テストは不要：開始時に \`uninstall_clob()\` を呼ぶので、何の state を残すかを気にしない。
- このテストは空でない CLOB を install したまま終わる。次のテスト（同じ \`cargo test\` 実行内、\`TEST_SERIALIZER\` 解放後）が「CLOB なし → zero」を assert する目的で走ったら、我々の install した book を見て fail する。

他のテストは**先頭でも** \`uninstall_clob\` を呼ぶので、技術的にはこの cleanup は冗長。**だが空でない state を実際に install するテストで cleanup を明示するのは衛生的に良い。** Test framework の支援なしで「Setup / Exercise / Verify / Teardown」テスト規約をミラーリング。

## テスト

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

30 秒ほどで：

\`\`\`
running 43 tests
... 43 tests pass ...

test result: ok. 43 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

L5 より 1 多い。新規が \`read_best_bid_returns_live_state_when_clob_installed\`。それだけ見るには：

\`\`\`bash
cargo test -p openhl-evm --release returns_live_state
\`\`\`

出力：

\`\`\`
running 1 test
test precompiles::tests::read_best_bid_returns_live_state_when_clob_installed ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 42 filtered out
\`\`\`

**この \`ok\` 行が Module 2 のマイルストーン。** カスタム EVM precompile が live マッチングエンジン state から read し、データが EVM-visible 出力 bytes にラウンドトリップしている。

よくあるエラーと対処：

- **\`assertion failed: left=240, right=250\`** — \`best_bid_with_qty()\` 実装が間違った level を返している。原因は十中八九、\`self.bids\` を価格優先順序ではなく挿入順序で iterate している。L4 の実装を確認 — bids \`BTreeMap\` は \`RevPrice\`（reverse-sorted price）でキー付けされているので \`.iter().next()\` で最高価格が得られる。\`.iter().next_back()\` を書いた、もしくは別のデータ構造を使った場合は修正。
- **\`assertion failed: left=99, right=7\`** — \`best_bid_with_qty()\` が正しい価格を返したが qty が違う。原因は十中八九、best level だけでなく全価格レベルにわたって sum している。L4 コードを再確認：\`.map(|(rev_price, queue)| ...)\` 内のクロージャは**\`queue.iter()\` のみ**（その 1 つの価格レベルの order）を sum すべき — \`self.bids.values().flatten()\`（全 order 全所）ではない。
- **\`error[E0382]: borrow of moved value: 'book'\`** — \`install_clob(book)\` の後 \`book\` を再使用しようとした。後の使用を消すか（不要）、\`install_clob(Arc::clone(&book))\` にする（理由があれば — このテストでは不要）。
- **\`error[E0599]: no method named 'submit' found for...\`** — \`book.lock()\` は \`LockResult<MutexGuard<Book>>\` を返すので \`book.lock().unwrap().submit(...)\` が必要。\`.unwrap()\` 抜けが典型原因。
- **個別なら通る、並列で落ちる** — \`TEST_SERIALIZER\` ロックが実際には保持されていない。\`let _g = TEST_SERIALIZER.lock()...\` が最初の文か確認。

## 設計の振り返り

4 つの一時停止ポイント：

1. **正しさを偶然から分離する最小データ形は 2 つの order。** 敵対的テストデータ — 間違った実装を露出させるために特別に設計された order — は 50 のランダム order より価値がある。各敵対的値は 1 クラスのバグの対価を支払う。

2. **直接関数呼び出し vs registry dispatch は意図的なテスト分割。** L5 の \`registered_precompile_is_invokable_via_registry\` は dispatch table 経由で関数が到達可能であることを証明。L6 は関数が live state を read することを証明。分割することで、片方の failure が他方を mask しない。**dispatch + behavior + state を 1 つのアサーションに束ねたテストは failure 時にデバッグが難しい。**

3. **アサーションメッセージは将来のメンテナへのドキュメンテーション。** 「best bid is the 250 order, not 240」は failure を読む次のエンジニアにどの概念的前提が違反されているかを正確に伝える。素の \`assert_eq!(price, U256::from(250u64))\` は \`left=240 right=250\` と言う — 真ではあるが、テストの意図を再構築する必要がある。

4. **1 度に 1 つ。** L6 はプロダクションコード変更ゼロ。Module 2 (L4-L6) フルプログレッションは：plumbing（挙動変化なし）→ swap（挙動変化、新挙動のテストなし）→ exercise（新挙動をテスト）。各レッスンに*1 つ*学ぶこと、*1 つ*検証することがある。混ぜれば — 例：swap + テストを同じレッスンで — 中間ステージで何かが必然的に壊れたときデバッグが遥かに難しくなる。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

L6 終了時点で \`precompiles/mod.rs\` は Stage 9b と**バイト同一**（自分でドキュメントコメントの言い回しを変えていない限り）。これが Stage 9b の終わり — \`git diff b635ef7 -- crates/evm\` は空。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`Precompile::execute\` 経由でなく \`read_best_bid\` を直接呼ぶ？**
両パス動く。直接呼び出し（\`read_best_bid(...)\`）は関数を isolation でテスト。Registry path（\`precompile.execute(...)\`）は dispatch をテスト。**L5 の 3 つ目テストが dispatch を既に証明している**。L6 では挙動が global から read することを証明したい。直接 path がテストを 1 つの assertion に絞り込む。

**Q: \`submit\` が失敗したら（例：duplicate \`OrderId\`）？**
\`Book::submit\`（course 7 から）は \`()\` を返す — 失敗しない。内部的には同じ OrderId を 2 回 submit すると 2 つ目が黙って最初を上書き。**これはマッチングエンジンの設計**だがテストでは罠。我々が \`OrderId(1)\` / \`OrderId(2)\` を意図的に使う理由。

**Q: このテストは Cancun / Prague / 仮想的な未来 fork でも動く？**
動く — \`read_best_bid\` は fork に関わらず同じ関数。Precompile registry は fork ごとに*どの* precompile が有効かを選ぶ（L1/L2 で \`openhl_precompiles_for(spec)\` を hardfork ごとの \`OnceLock\` で追加）、しかし CLOB 読み出し関数自体は fork agnostic。

**Q: Solidity コントラクトはこの同じ値をどう見る？**
\`\`\`solidity
(uint256 price, uint256 qty) = abi.decode(
    staticcall(gas, 0x...0c1b, "", 64),
    (uint256, uint256)
);
\`\`\`
我々の Book を install して precompile を register した状態で、その staticcall は 64 bytes を返し (250, 7) を encode する。Solidity ABI decoder が 2 つの uint256 に再結合。**コントラクトはテストと同じデータを、同じコードパスで見る。** これがカスタム precompile の存在意義そのもの。

## Module 2 マイルストーン — あなたが作ったもの

今あるもの：
- アドレス \`0x...0c1b\` に登録されたカスタム EVM precompile。
- プロセスグローバルな Arc 共有 CLOB state。
- live マッチングエンジンの best bid を read し ABI uint256 pair として encode する precompile。
- 証明済みテスト：(a) precompile が registry から到達可能、(b) CLOB 未インストール時は zero を read、(c) CLOB インストール時は live state を read。

スマートコントラクトが直接 CLOB state をクエリできるようになりました。Course 7 L12 の「fills が並行リスト、smart contracts に見えない」のギャップが**read 方向**で部分的に閉じた。Writes（コントラクトから order を発注）は Module 3。

## 次のレッスン（L7）

L7 で Module 3（Write precompile）開始。L2 をミラー：新しい precompile アドレス（\`CLOB_PLACE_ORDER\` を \`0x...0c1c\`）、order パラメータの Solidity calldata デコード、ハードコードプレースホルダー本体。教育の焦点は出力 encoding から**入力**デコードへシフト — 可変長 calldata、構造体 unpacking、不正入力のエラーハンドリング。`,
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
                  title: "レッスン 7 — clob_place_order — calldata デコード scaffold",
                  slug: "openhl-precompiles-place-order-scaffold-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン 7 — \`clob_place_order\` — calldata デコード scaffold

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…が 46 tests を通る（3 新規）。CLOB の**書き込みパス**は precompile が登録され、calldata パースが実装され、rejection path が検証された状態：

- **新規 precompile \`0x...0c1c\`** — \`CLOB_PLACE_ORDER\`、\`CLOB_READ_BEST_BID\` と並んで登録。
- **128-byte ABI-aligned 入力レイアウト**をデコード：\`account_id\` / \`side\` / \`price\` / \`qty\`。
- **原子的な order-ID カウンタ**（\`NEXT_ORDER_ID\`）— プロセスグローバル、1 から開始 — sentinel \`0\` が「rejected」と明確に区別される。
- **4 つの rejection path** がすべて zero を返す：入力長不足、無効な \`side\` byte、\`qty == 0\`、CLOB 未インストール。
- **Happy path** は order ID を allocate して返す — **だがまだ book には submit しない。** L8 がそれを足す。

L7 は Module 3 にとっての L2：関数は到達可能で入力を正しく解析するが、state 変更の挙動は L8 まで先送り。L8 で本当に book に書き込む 1 行を追加。L9 で発生した fill を bridge に route。

## おさらい

Module 2 終了時点：
- \`CLOB_READ_BEST_BID\` precompile が \`0x...0c1b\` に登録済み。
- スマートコントラクトは \`STATICCALL\` で live best-bid データを read 可能。
- bridge と precompile が \`Arc<Mutex<Book>>\` を \`CLOB_STATE\` global で共有。

だがコントラクトはまだ order を **place** できない。読めるが、書けない。L7 でその修正を始める。

## プラン

\`crates/evm/src/precompiles/mod.rs\` に 6 つの編集：

1. **Imports を拡張** — マッチングエンジンの型（\`AccountId\` / \`Order\` / \`OrderId\` / \`OrderType\` / \`Price\` / \`Qty\` / \`Side\`）と \`atomic::{AtomicU64, Ordering}\` を引き込む。
2. **\`CLOB_PLACE_ORDER\` アドレス定数** + **\`NEXT_ORDER_ID\` 原子カウンタ**を追加。
3. **\`place_order\` precompile 関数を追加** — 128-byte 入力をパース、検証、ID 割り当て、エンコードした ID を返す。**まだ \`book.submit(...)\` は呼ばない**（それは L8）。
4. **\`u64_from_be_chunk\` ヘルパー**を追加 — \`place_order\` で 32-byte ABI ワードから u64 値を取り出すのに 3 回使う。
5. **\`openhl_precompiles\` を更新** — 2 つの precompile を \`extend\`（要素 2 つの配列、1 つではなく）。
6. **3 つの新テスト** + 1 つのヘルパー（\`place_order_calldata\`）でテスト入力を組み立てる。

\`read_best_bid\` 関数と Module 2 のテストは変更なし。**L7 は純粋に追加のみ。**

> 🛑 **考えてみよう。** スクロール前に — \`read_best_bid\` precompile は*空*入力（\`&[]\`）を取り 64 bytes を返した。\`place_order\` は **128 bytes 入力**を取り 32 bytes を返す。**なぜ Solidity は各 u64 フィールドを 32 bytes にパディングする？** ヒント：precompile が通常のコントラクト関数と共有している呼び出し規約を考える。

（答え：**Solidity の ABI は固定幅 32 bytes/slot。** \`function f(uint64 a, uint8 b, uint64 c, uint64 d)\` はパックしない — 4 × 32 = 128 bytes の calldata を割り当て、各値はその 32-byte slot 内で右寄せ。Precompile は同じ EVM call opcode で呼び出されるので同じ規約に従う。**無駄は意図的** — EVM がすべての call を一様に扱えるようにする。我々のパーサは各 slot の意味ある 8 byte / 1 byte を読み、残りは無視する。）

## 手順

### Step 1: Imports を拡張

現在の imports（L6 終了時点）：

\`\`\`rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
use openhl_clob::Book;
use std::sync::{Arc, Mutex, RwLock};
\`\`\`

\`openhl_clob\` の import を拡張してマッチングエンジンの型を引き込み、\`std::sync\` に atomic を追加：

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

\`AccountId\` / \`Order\` / \`OrderId\` / \`OrderType\` / \`Price\` / \`Qty\` / \`Side\` はすべて L8 で **\`Order\` を組み立てる**ために必要 — だが import は今入れておく（diff を L7 の関心に絞り、L8 でそのまま関数 signature に使うため）。\`AtomicU64\` と \`Ordering\` は \`NEXT_ORDER_ID\` カウンタ用。

### Step 2: アドレス定数 + 原子カウンタを追加

\`CLOB_READ_BEST_BID\` の後ろに：

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

アドレス \`0x...0c1c\` — mnemonic \`0c1c\` = 「CL[ob] [pla]C[e]」。\`0x...0c1b\`（「CL[ob] [Rea]B[id]」）のすぐ隣。両方とも標準 precompile \`0x01..0x09\` よりずっと上。

次に \`CLOB_BASE_GAS_COST\` の後ろ：

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

**この static に焼き込まれた決定 2 つ：**

1. **0 でなく 1 から開始。** \`0\` は我々の「rejected」sentinel 値（入力が malformed か CLOB 未インストールのとき precompile が返す）。カウンタが 0 から始まると、最初に成功した order も 0 を返してしまい、rejection と区別不能。1 から開始することで、**割り当てられた ID はすべて \`> 0\`、EVM caller に返る \`0\` はすべて明確に rejection**。
2. **\`AtomicU64\`、\`Mutex<u64>\` でない。** \`fetch_add(1, Relaxed)\` は wait-free、\`Mutex::lock\` は block する。Order ID の割り当ては order 発注の hot path に乗る。Mutex だと全 order 発注を 1 つのクリティカルセクションに直列化する。**Atomic increment が正しい道具。**

> 🛑 **やりがちな勘違い。** 「なぜ \`Ordering::Relaxed\` で \`SeqCst\` ではない？」 **ID は他の state と ordering 依存を持たないから。** \`Relaxed\` は atomicity（2 スレッドが同じ ID を得ない）を保証するが、他のメモリ操作との同期は提供しない。我々は ID を book への書き込みと順序付ける必要がない — book は自分の mutex を持ち、それが state 可視性の順序を提供する。\`SeqCst\` だと毎 increment にメモリフェンスを足すが利得なし。**必要な ordering の中で一番弱いものを選ぶ。**

> 🛑 **やりがちな勘違い。** 「Multi-validator caveat は将来の問題っぽい — 今書く意味は？」 **失敗モードが silent chain divergence だから。** 2 つの validator が同じ EVM call に対して異なる ID を割り当てると、その時点から book が分岐する — そして分岐は read で異なる値が返るずっと後まで見えない。**Static の定義場所で問題に名前を付けることで、このコードを拡張する将来のエンジニアは「マルチバリデータで出荷不可」を refactor 方針決定前に読む。** 「この物には隠れた制約がある」警告の正規の場所は doc コメント。

### Step 3: \`u64_from_be_chunk\` ヘルパーを追加

\`read_best_bid\` の下、\`openhl_precompiles\` の上に：

\`\`\`rust
/// Read a big-endian u64 from the last 8 bytes of a 32-byte ABI chunk.
fn u64_from_be_chunk(chunk: &[u8]) -> u64 {
    debug_assert!(chunk.len() == 32);
    let mut buf = [0u8; 8];
    buf.copy_from_slice(&chunk[24..32]);
    u64::from_be_bytes(buf)
}
\`\`\`

3 点：
1. **長さの \`debug_assert!\`** — debug ビルドでは「間違った量を slice した」を捕まえる。Release ビルドでは何にもコンパイルされない。開発時無料の安全。
2. **\`u64::from_be_bytes\` は \`[u8; 8]\` を受け取る** — 固定サイズ配列、slice ではない。なので \`chunk[24..32]\` の 8 bytes をまずスタック \`[u8; 8]\` バッファにコピー。
3. **\`pub fn\` でなく \`fn\`。** モジュール private。\`precompiles/mod.rs\` の外には誰も必要ない。

> 🛑 **やりがちな勘違い。** 「\`u64::from_be_bytes(chunk[24..32].try_into().unwrap())\` でいいんじゃ？」 **同じ — release では同じ生成コード。** 名前付きヘルパーは**呼び出し側での明快さ**のため：\`u64_from_be_chunk(&input[0..32])\` は「最初の ABI slot を u64 としてデコード」と読める。\`u64::from_be_bytes(input[0..32][24..32].try_into().unwrap())\` は bytes-and-indices パズル。**ヘルパーは同一の命令にコンパイルされ、節約は認知負荷で発生。**

### Step 4: \`place_order\` precompile 関数を追加

\`read_best_bid\` の下、\`u64_from_be_chunk\` の上：

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
/// L7 NOTE: this scaffold parses + validates + allocates an order_id, but
/// does NOT actually submit the order to the book. L8 adds the
/// \`book.submit(...)\` call that completes the write path.
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
    drop(state); // L8 will re-acquire as write-side-friendly

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

    // L7 stops here. L8 will add: clob.lock().submit(Order { ... }).

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
\`\`\`

5 つの逐次ステップ。各 rejection は**早期 return**、nested \`if\` ではない — happy path を線形に保つ。

**\`_account_id\` / \`_price_value\` / \`_side\` の \`_\` 接頭辞**は「パースしたがまだ使わない」を示す。L8 でアンダースコアを外して \`Order { ... }\` に渡す。それまで clippy と rustc は underscore 慣習でこの unused binding を受け入れる。

**先頭の長さチェックは guard。** \`input[N]\` の byte index は N > input.len() なら panic する。先頭で \`>= 128\` を 1 回検証すれば、以降の \`input[X]\` アクセスは provably safe — per-access bounds-check のオーバーヘッドなし、ランタイム panic のリスクなし。

**side match の \`_ =>\` 腕。** \`Side\` は 2-variant enum。Match は exhaustive 必須だが、EVM caller は side slot に 0..=255 のどの byte でも渡せる。0 や 1 でないものは rejection、panic ではない。

**Increment の \`Ordering::Relaxed\`。** Step 2 で確立済み。

**\`out\` バッファ。** Success path が最後の 8 bytes を上書きするまで全 zero。各 rejection path はバッファを変更せず返す — \`out[24..32]\` は zero のまま — caller は \`order_id = 0\` = rejected としてデコード。

> 🛑 **やりがちな勘違い。** 「\`account_id\` や \`price\` をまだ使わないのにパースするのはなぜ？」 **L7 の仕事は calldata schema を確定すること。** Schema が一度公開されればコントラクトはそれに対してビルドし始める。すべてのフィールドをパースする（まだ使わないものも）ことで、**パースの形 = 契約**。L8 でどのフィールドをパースするかを変えると、L7 と L8 の間にビルドされた全コントラクトが壊れる。**フルスキーマを L7 でパースする — 使わない binding があっても。挙動の変更は L8。**

> 🛑 **考えてみよう。** \`drop(state)\` 行を見る。なぜ order ID を allocate する前に明示的に read-lock を drop する？ ヒント：L8 で**同じ Arc に write 側のロックを取りに行く**ときに何が起きるかを考える。

（答え：**Read ロックは write ロックを block する。** 関数全体を通して \`state\` を保持すると — L8 future の \`clob.lock()\` を含む — \`CLOB_STATE\` の read lock を持ったまま、それが指す Book の独立 Mutex を取りに行く形になる。動くが（デッドロックしない）、read lock が他者の \`install_clob\` を precompile 実行中ずっとブロックする。早めに drop することで lock 保持窓を縮める。**良い市民になれ：各ロックを取れるだけ短く保つ。**）

### Step 5: \`openhl_precompiles\` を両方登録するように更新

現在（L6 終了時点）：

\`\`\`rust
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

これに置き換え：

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

1 つの \`extend\` 呼び出しに 2 つの precompile — \`extend\` を 2 回呼ぶのと同じ。配列形状のほうが precompile が増えてもクリーンに保てる。

\`openhl_precompiles\` の doc コメントも「CLOB-reading additions」から「CLOB-reading + CLOB-writing additions」へ更新 — 小さい編集だが、今しないと時間とともに乖離する種類のもの。

### Step 6: 3 テスト + 1 テストヘルパーを追加

\`#[cfg(test)] mod tests\` ブロック内、L6 のラウンドトリップテストの後に追加：

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
    /// L7 NOTE: this test only checks the return value. L8 will add
    /// \`book.depth_bid() == 0\` assertions once submit is wired in.
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
    /// L7 NOTE: this test only proves we **return** a non-zero ID; L8 will
    /// extend coverage to prove the order is actually visible on the book
    /// (the L8 round-trip test).
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

ヘルパーは 128-byte バッファを 4 つの論理値から組み立て、各テストから ABI パディングの詳細を隠す。これがないと毎テストで byte indexing を繰り返す — エラー prone、ノイジー。

**3 テスト、3 つの関心事：**

1. **CLOB 未インストール → zero。** \`read_best_bid_returns_zero_when_no_clob_installed\` をミラー。同じパターン（serializer / \`uninstall_clob()\` / assert）、同じセマンティクス（precompile は未インストール state で gracefully degrade）。
2. **Malformed input → zero、3 つの rejection path 全部。** 3 つの sub-assertion が 1 つのテストにまとまっているのは概念的に同じシナリオ（「悪い入力は refuse」）だから。**L7 NOTE で先送りした check（\`depth_bid == 0\`）を明示** — L8 で追加。
3. **Valid input → nonzero ID。** これが「happy path acknowledgment」。ID を allocate した。**まだ order が book に乗ったかは check しない** — それは L8 の仕事。

> 🛑 **やりがちな勘違い。** 「3 テストでなく 1 つの大きいテストでいいんじゃ？」 **失敗メッセージが原因を指し示すべきだから。** 「place_order path 全体」を 1 テストにすると、fail したら assertion メッセージとスタックトレースを読んで*どの* sub シナリオが壊れたか割り出す必要がある。3 テストなら、fail したテスト名*そのもの*が原因：\`place_order_rejects_malformed_input\` fail → rejection path を check、\`place_order_returns_nonzero_id_on_valid_input\` fail → happy path を check。**1 テスト 1 関心事で fail が self-describing になる。**

## テスト

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

30 秒ほどで：

\`\`\`
running 46 tests
... 46 tests pass ...

test result: ok. 46 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

L6 より 3 多い（43 → 46）。新規は 3 つの \`place_order_*\` テスト。Module 1+2 の 43 はそのまま通る — L7 は純粋に追加のみ。

L7 関連だけ見たいなら：

\`\`\`bash
cargo test -p openhl-evm --release place_order
\`\`\`

出力：

\`\`\`
running 3 tests
test precompiles::tests::place_order_returns_zero_when_no_clob_installed ... ok
test precompiles::tests::place_order_rejects_malformed_input ... ok
test precompiles::tests::place_order_returns_nonzero_id_on_valid_input ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 43 filtered out
\`\`\`

よくあるエラーと対処：

- **\`unused import: AccountId, Order, OrderId, OrderType, Price, Qty, Side\`** — L7 で import したがまだどれも使わない。**\`#[allow(unused_imports)]\` を use 文に付ける、もしくは warning を受け入れる** — L8 で全部使う。消すな。
- **match 腕の \`unused variable: _side\`** — これが \`_side\` の目的。アンダースコア接頭辞が rustc に「使っていないのは知っているから warn しないで」と伝える。\`let side = match ...\`（アンダースコアなし）と書くと unused-variable warning が出る。アンダースコアを戻す。
- **\`u64_from_be_chunk\` で \`error[E0061]: this function takes 0 arguments but 1 was supplied\`** — 関数名を間違えたか複数の slice で呼んでいる。Signature は \`u64_from_be_chunk(chunk: &[u8])\`、引数 1 つ。
- **ヘルパーの \`buf[63] = side\` で \`error[E0277]: 'u64' is not 'u8'\`** — \`side: u64\` 等と書いた。Helper の引数は \`side: u8\`、byte 位置 63 はちょうど 1 byte。
- **個別なら通る、suite で fail** — \`TEST_SERIALIZER\` lock が最初の文でない。各テストで \`let _g = TEST_SERIALIZER.lock()...\` が他のどのコードよりも前にくるよう並び替え。

## 設計の振り返り

4 つの一時停止ポイント：

1. **Schema が契約、挙動は後で。** L7 は precompile アドレス、128-byte calldata レイアウト、32-byte 戻り形を出荷。**一度公開されればコントラクトがそれに対して呼び出し始める。** L8 で calldata レイアウトを変えると間に書かれた全コントラクトが壊れる。L7 で schema を確定する（挙動が不完全でも）ことで、公開した日から契約が安定する。

2. **Happy path が完全に配線される前に rejection path がテストされる。** 各 rejection は public API の保証：「malformed input を送ったら sentinel 0 が返る、panic も partial state mutation も決してない」。これらの保証は happy path が何か面白いことをする*前に*テストできる — そして早めに固めることで、L8 で本物の submit を追加するとき validation logic が後付けにならない。

3. **Order ID に \`AtomicU64\`、\`Mutex<u64>\` でない。** アクセスパターンに基づく選択：ID 割り当てが毎 order 発注で起き、book state に論理依存しない。Atomic increment は wait-free、mutex 取得は block しうる。**データが他の state と同期不変条件を持たない場合は軽いプリミティブを選ぶ。**

4. **\`Ordering::Relaxed\` が十分なのは book が自分の mutex を持つから。** Book の \`Mutex\` が「order が book に乗っている」可視性の同期を提供する。Atomic カウンタは ID の一意性を提供するが、ID は他の write と同期不変条件を持たない。**メモリ ordering は「必要な不変条件」から選ぶ — 「安全側のほうが良い」からではない。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

L7 終了時点であなたのコードは Stage 9c に**近い**が**特定の地点で止まる**：Stage 9c の \`place_order\` は order_id allocation と encoding の間に \`book.submit(...)\` を呼ぶ。あなたの L7 版は呼ばない。Stage 9c の \`place_order_rejects_malformed_input\` は \`depth_bid() == 0\` アサーションも持つ。あなたの L7 版は持たない。Stage 9c には \`place_order_then_read_best_bid_round_trips\` テストもある。あなたの L7 版にはない。**それらはすべて L8。**

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: malformed input で \`place_order\` を panic させればいいんじゃ？**
Precompile は Solidity から呼ばれ、panic は precompile error として伝播して transaction 全体を revert する。\`0\` を返すと呼び出し側コントラクトが選べる：ログ、修正入力でリトライ、ユーザに surface。**Caller のバグによる失敗の場合、precompile は soft fail すべき。**

**Q: \`AtomicU64::fetch_add(1, Relaxed)\` と \`fetch_add(1, SeqCst)\` の違い？**
両方とも「2 スレッドが同じ戻り値を得ない」という atomicity の意味で atomic。違いは**メモリ ordering**：\`SeqCst\` は他のすべての \`SeqCst\` 操作と program-wide に同期するメモリフェンスを追加。\`Relaxed\` は increment 自体が atomic であることだけ保証し、他のメモリ操作との同期は提供しない。我々のケース（他 state に論理依存しないカウンタ）では \`Relaxed\` で十分、かつ速い。

**Q: malformed input に \`EnumValueError\` 的なものを返せないの？**
\`PrecompileFn\` signature は \`fn(...) -> PrecompileResult\` で \`PrecompileResult = Result<PrecompileOutput, PrecompileError>\`。Malformed input で \`Err(...)\` を返すことは*できる*が、それは EVM レベルのエラー（transaction revert）として伝播する。\`Ok\` + sentinel 0 なら呼び出し側コントラクトが rejection を gracefully に扱える。**これは設計選択：precompile エラーは EVM fatal か caller-visible か？** 我々のケース（ユーザ提供 calldata を検証）では caller-visible がデフォルトとして良い。

**Q: 誰かが \`u64::MAX\` ちょうどで order を submit したら？**
最終的に \`NEXT_ORDER_ID.fetch_add(1, Relaxed)\` が 0 にラップ（u64 を返すので）。その時点で次の allocation が sentinel 0 を返す — caller は「rejected」として扱う。\`u64\` overflow は ~1.8e19 orders で、約 1800 京 order — v0 では問題なし。Production はもっと広いカウンタを使うか overflow 近くで panic すべき。

## 次のレッスン（L8）

L8 は 1 行 + テスト。その 1 行：order_id 割り当てと encoding の間に \`clob.lock().expect("...").submit(Order { id, account, side, qty, order_type });\`。テスト：\`place_order_rejects_malformed_input\` を拡張して各 rejection 後に \`book.depth_bid() == 0\` を assert（submit が配線されたので意味ある side-effect check に）、\`place_order_returns_nonzero_id_on_valid_input\` を \`place_order_then_read_best_bid_round_trips\` に置換 — 2 precompile ラウンドトリップが \`0x...0c1c\` 経由の writes が \`0x...0c1b\` 経由の reads から見えることを証明。**そのラウンドトリップが Module 3 の mid-stage マイルストーン。**`,
                },
                {
                  title: "レッスン 8 — book.submit(...) — 書き込みパスが live になる",
                  slug: "openhl-precompiles-place-order-write-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 8 — \`book.submit(...)\` — 書き込みパスが live になる

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…が 46 tests を通る — L7 と同じテスト数 — だが \`place_order\` に 1 行追加と 2 つのテスト変更で、precompile が**本当に book に書く**：

- **\`place_order\` に 1 行追加** — order_id 割り当てと encoding の間に \`clob.lock().submit(Order { ... })\`。
- **L7 の \`_\` 接頭辞を外す** — \`_account_id\` / \`_price_value\` / \`_side\` が使われるようになる。
- **L7 の \`place_order_rejects_malformed_input\` を拡張** — 各 rejection sub-assertion で \`book.depth_bid() == 0\` も check（rejection で partial mutation がないことを証明）。
- **L7 の \`place_order_returns_nonzero_id_on_valid_input\` を置換** — \`place_order_then_read_best_bid_round_trips\` へ。\`0x...0c1c\` 経由の書き込みが \`0x...0c1b\` 経由の読み込みから見えることを証明する 2-precompile ラウンドトリップ。

このラウンドトリップが **Module 3 の中盤マイルストーン**：EVM ↔ CLOB サーフェスは双方向になる。スマートコントラクトが片方の precompile で order を発注し、もう片方で best bid を即座に読む — 両方が同じ \`Arc<Mutex<Book>>\` を見ている。

## おさらい

L7 終了時点：
- \`place_order\` が 128-byte calldata を \`(account, side, price, qty)\` にパース、検証、\`order_id\` 割り当て — **その後 ID を返すだけで書かない。**
- 3 つの unit test は全部通るが、\`place_order_rejects_malformed_input\` は戻り値のみ check（side-effect check なし）。
- Happy-path テスト（\`place_order_returns_nonzero_id_on_valid_input\`）は ID を*返す*ことだけ検証 — book に乗ったかは検証しない。

関数は書き込みパスの半分。L8 で完全にする。

## プラン

\`crates/evm/src/precompiles/mod.rs\` に 3 つの編集：

1. **\`place_order\` 内で** — order ID 割り当てと出力 encoding の間で Book をロックし \`submit\` を呼ぶ。Bindings の underscore を外す（今使うので）。
2. **\`place_order_rejects_malformed_input\` テスト内で** — 各 3 つの rejection アサーションの後、\`book.lock().unwrap().depth_bid() == 0\` も assert。これにはテストが \`book\`（\`Arc<Mutex<Book>>\`）を保持して rejection 後に book を inspect できる必要がある。
3. **\`place_order_returns_nonzero_id_on_valid_input\` を置換** — 新テスト \`place_order_then_read_best_bid_round_trips\`（2-precompile ラウンドトリップ）。

Import は変更なし。新関数なし。新 precompile なし。**L8 はコース中もっとも小さい content レッスン** — 価値は「1 行のコードが双方向サーフェスを閉じる」を証明すること。

> 🛑 **考えてみよう。** スクロール前に — L6 で read precompile が global Arc から live データを見ることはすでに証明した。L8 で変わるのはそのデータの*ソース*だけ — テスト setup が直接 \`book.lock().submit(...)\` で Arc に書き込む（L6 がそうしたように）のでなく、**\`place_order\` precompile** が書き込む。**なぜこの変化が重要？** ヒント：precompile がどんな種類の caller を表しているかを考える。

（答え：**Precompile はスマートコントラクト caller を表す。** L6 でテストコードが book に直接書き込んだとき、それは*bridge*（オフチェーンコード）が book に書き込むのと等価。\`place_order\` が book に書き込むと、それは **EVM transaction が book に書き込む**のと等価 — スマートコントラクトの呼び出しが EVM dispatch を通って precompile に伝わり book state を生む。**Stage 9c は EVM 実行が CLOB state を mutate し始める瞬間。** L8 までオフチェーンコードだけが book に書けた。L8 後オンチェーンコードも書ける。）

## 手順

### Step 1: \`place_order\` に \`submit\` 呼び出しを追加

L7 の本体を探す。該当部分は order ID 割り当てと出力 encoding の間：

\`\`\`rust
    drop(state); // L8 will re-acquire as write-side-friendly

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

    // L7 stops here. L8 will add: clob.lock().submit(Order { ... }).

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
\`\`\`

この領域をこう変更：

\`\`\`rust
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
\`\`\`

注目すべき点：

- **\`drop(state)\` が消えた。** L7 ではまだ \`book.lock()\` を呼ばないので read ロックを早めに drop していた。L8 では同じ read を後まで保持して \`clob\`（\`Arc\` の中身）に bind したまま使う。L7 の \`is_none\` チェックを \`let-else\` に再形成する必要がある。

実際の lock パターンを明示するため、\`place_order\` 全更新版を示す。qty チェックの後の lock セクションをこう置き換え：

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

L7 からの変更：
- \`if state.as_ref().is_none() { ... }; drop(state);\` が \`let Some(clob) = state.as_ref() else { ... };\` に — \`let-else\` binding が \`None\` の早期 return 後も \`clob\` を使えるようにする。
- \`Some\` bind 後、**\`state\` を drop しない** — \`clob\`（\`state\` への参照）が \`clob.lock()\` 呼び出しを通して有効なまま、\`state\` が生きている必要がある。
- \`let _result = book.submit(...)\` — \`submit\` は \`Vec<Fill>\`（マッチングエンジンの fill）を返す。L8 では無視。**L9 でこれらの fill を bridge に route する** — が今は \`let _result\` で clippy の unused return value 警告を黙らせる。
- \`drop(book)\` — Book mutex guard の明示的 drop。\`out[24..32]\` のコピーと \`Ok(...)\` return は Book lock を保持せずに起きる。Hot path 用の小さな最適化。

**Bindings の \`_\` 接頭辞も外す**（今使うので）：

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

3 つの識別子が意味を得る：\`account_id\` が order の account に、\`price_value\` が limit price に、\`side\` が order の side に。**L8 の submit 内で構築する Order 構造体全体は、L7 でパースしたデータそのもの。** これが「L7 で schema を固め、L8 で挙動を追加」の実態。

doc コメントも更新 — L7 の「submit をまだ呼ばない」と書いた L7 NOTE 行を削除：

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
/// Side note: the fills returned by \`Book::submit\` are discarded here.
/// Production-shape integration would route them through the bridge's
/// \`pending_fills\` so they reach the next \`build_payload\`. At v0 the
/// precompile and the bridge are write-side independent.
\`\`\`

末尾の「Side note」は次のギャップを明示 — \`submit\` が返す fill は discard。**そのギャップが L9。** Doc コメントで名指しすることで「これがギャップとわかっている」と将来の読者に伝わる — 見落としかどうかを悩ませない。

> 🛑 **やりがちな勘違い。** 「unused 警告を抑えたいなら \`_result\` のアンダースコアの意味は？」 **\`let _result = ...\` と \`let _ = ...\` は両方とも警告を抑える。** 違い：\`let _result\` は値を bind してスコープ末で drop。\`let _ = ...\` は値を**即座に**drop（後続の文より前）。\`submit\` の場合、後で \`_result\` を read しないので両方動く。だが \`let _result\` は値に意味ある名前があって将来使う予定があるときの慣習 — L9 のように、本物の名前に bind して route するとき。**\`_result\` は「将来の意図」マーカー。**

> 🛑 **やりがちな勘違い。** 「スコープ末でどうせ release されるなら \`drop(book)\` を明示する意味は？」 **encoding と Ok() return がまだ pending だから。** \`drop(book)\` しないと \`out[24..32].copy_from_slice(...)\` と \`Ok(PrecompileOutput::new(...))\` の構築の間ずっと Book lock を保持する。どちらも lock を必要としない。保持し続けると並行 reader や他の precompile の並列アクセスにコストがかかる。**明示的 drop = 「このロックは終わり、関数の残りでは要らない」。** Compiler 上は optional だが、hot path で lock 保持窓を目に見えて縮める。

### Step 2: \`place_order_rejects_malformed_input\` を \`depth_bid\` check で拡張

現在の L7 テスト：

\`\`\`rust
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
\`\`\`

このテストは Book を install するが Arc を捨てているので book state を check できない。これに置換：

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

L7 からの 3 つの変更：

1. **\`let book = Arc::new(...); install_clob(book.clone());\`** — Arc をローカル束縛。Arc の \`.clone()\` は refcount bump だけ。両方の名前が同じ Book を指す。
2. **3 つの新アサーション：\`book.lock().unwrap().depth_bid() == 0\`** — 各 rejection 後、book には何も乗っていない。**\`depth_bid()\` は全価格レベルにわたる bid order の count**（course 7 の Book で定義）。Zero = 空。
3. **Doc コメント** — 追加（L7 では「L7 NOTE」版で先送り check を説明していた — 今は消える）。

**3 つの新アサーションが side-effect 証明。** L7 の \`assert_eq!(... U256::ZERO)\` は precompile が sentinel を*返す*ことだけ check した。L8 は precompile が**何も書き込まない**ことも check。両方合わせて：malformed input → 0 を返す*かつ*state を触らない、を証明。

> 🛑 **やりがちな勘違い。** 「\`book\` をそのまま渡せばいいのに、なぜ \`book.clone()\`？」 **\`install_clob\` が引数を消費（move）した後も inspect できる handle を保持したいから。** \`install_clob(Arc<Mutex<Book>>)\` は Arc を値で取る。\`install_clob(book.clone())\` の後、global が 1 つの Arc、\`book\`（このスコープ）がもう 1 つ持つ。両方とも同じ Book を指す。\`install_clob(book)\` と書いたら、\`.lock().unwrap().depth_bid()\` を呼ぶローカル handle を失う。**Arc::clone は関数呼び出しを跨いで所有権を共有する安価な方法。**

### Step 3: Happy-path テストをラウンドトリップに置換

L7 のこれを削除：

\`\`\`rust
    #[test]
    fn place_order_returns_nonzero_id_on_valid_input() {
        // ...
    }
\`\`\`

その場所にこれを追加：

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

なぜ L7 テストを置換（追加でなく）するか：

- L7 の \`place_order_returns_nonzero_id_on_valid_input\` は \`place_order\` が nonzero ID を返すことだけ assert。そのアサーションはこのテストの \`assert!(returned_id > U256::ZERO, ...)\` に**包含**される。
- 新テストはさらに進む：\`read_best_bid\` で読んで、置いた order が見えることを検証。**L7 アサーションは L8 アサーションの厳密な部分集合。**

両方残すと冗長。**包含されるテストは死荷重** — coverage は増えず、メンテナンス負荷だけ増える。

2 つの precompile call は独立 — \`read_best_bid\` は \`place_order\` が起きたことを知らない。両方とも \`CLOB_STATE\` 経由で同じ \`Arc<Mutex<Book>>\` を read/write。**それがラウンドトリップ：片方の precompile で書き、もう片方で観測。** Solidity コントラクトの視点では：

\`\`\`solidity
uint256 order_id = call(0x...0c1c, abi.encode(0xABCD, 0, 175, 12));   // ~ id > 0
(uint256 price, uint256 qty) = staticcall(0x...0c1b, "");             // ~ (175, 12)
\`\`\`

2 つの別々の EVM call、2 つの別々の precompile、しかし global を共有するので state を共有する。**Bridge がその global を install。Bridge の submit_order がそれに書く。Bridge の pending_fills はまだ何も得ていない（L9 で修正）。**

> 🛑 **考えてみよう。** スクロール前に — このテストは \`Book\` を install、\`place_order\` で Buy を発注、\`read_best_bid\` で読む。**もし read precompile と write precompile が*それぞれ独自の* \`Arc<Mutex<Book>>\`（別々の Book）を持っていたら何が起きる？** ヒント：共有 state が何を意味するかを考える。

（答え：**テストは失敗する。** \`read_best_bid\` は空の book を見て zero を返す。このラウンドトリップが動く唯一の理由は **両 precompile が同じ \`CLOB_STATE\` global から read し、その global が 1 つの Arc を保持し、その Arc が 1 つの Book を指している**から。Arc 共有パターンこそがラウンドトリップを意味あるものにする。各 precompile が自分の private state を持っていたら、機能的に隔離 — 同じ CLOB に話しかける役に立たない。）

## テスト

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

30 秒ほどで：

\`\`\`
running 46 tests
... 46 tests pass ...

test result: ok. 46 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

L7 と同じカウント（46）。何が変わったか：1 テスト置換（\`place_order_returns_nonzero_id_on_valid_input\` → \`place_order_then_read_best_bid_round_trips\`）、1 テスト拡張（\`place_order_rejects_malformed_input\` が book state も check）。

マイルストーンテストだけ見るなら：

\`\`\`bash
cargo test -p openhl-evm --release round_trips
\`\`\`

出力：

\`\`\`
running 1 test
test precompiles::tests::place_order_then_read_best_bid_round_trips ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 45 filtered out
\`\`\`

**この \`ok\` 行が Module 3 の中盤マイルストーン。** 2 つのカスタム precompile、1 つの共有 state、EVM 実行内での完全な write→read ラウンドトリップ。

よくあるエラーと対処：

- **\`place_order\` 内の \`error[E0382]: borrow of moved value: 'state'\`** — \`let Some(clob) = state.as_ref() else { ... };\` を書いたが後続コードが \`state\` を使っている。\`let-else\` パターンは \`clob\`（\`state\` への参照）を bind するので \`state\` が生きていないといけない。あとで \`drop(state)\` を追加しないこと。
- **\`error: cannot find value 'account_id' in this scope\`** — 内側の \`Order { ... }\` リテラルで \`_\` 接頭辞を外したがパース行がまだ \`let _account_id = ...\` のまま。*両方*で接頭辞を外す。
- **\`place_order_rejects_malformed_input\` での \`assertion failed: book.lock().unwrap().depth_bid() == 0\`** — rejection path が綺麗に reject していない。何かが早期 return を通り抜けて \`book.submit(...)\` を呼んでいる。Rejection sequence を再確認：短い input → side byte → qty → no CLOB。各々が \`return Ok(...)\` であって body が落ちる \`if ... { ... }\` でないこと。
- **Round-trip テストでの \`assertion failed: left=200 right=175\`** — \`submit\` が間違ったフィールドを bind している。Order の \`price\` は \`input[64..96]\` でパースしたもの（u64）。\`Price(price_value)\` を渡しているか確認（\`Price(qty_value)\` などになっていないか）。
- **\`error[E0599]: no method 'depth_bid' found for struct 'Book'\`** — そのメソッドは course 7 の Book 設計で追加された。\`crates/clob/src/book.rs\` に存在することを確認。

## 設計の振り返り

4 つの一時停止ポイント：

1. **Schema first だから behavior second は小さい。** L7 は ~70 行（定数、原子、パーサ、登録、テスト）。L8 は ~7 行（submit + binding rename + テスト拡張）追加。**この小さな差分こそが要点**：実装の前に契約を固めることで、実装は広がる変更でなく集中した変更になる。将来の precompile 追加も同じパターンで進められる。

2. **2 つの precompile、1 つの Arc、共有 state = ラウンドトリップが動く。** L4 のアーキテクチャ（\`static\` 内の \`Arc<Mutex<Book>>\`、bridge が install、各 precompile が read）はまさにこの瞬間のために設計された。**両 precompile が同じ Book を見るのは両方が \`CLOB_STATE\` を通るから。** 別のアーキテクチャ（precompile ごとに global 1 つ）なら初期構築は簡単だっただろうが、ラウンドトリップそのものが不可能だっただろう。

3. **Side-effect テストには handle 保持が必要。** L7 の malformed-input テストは参照を保持しなかったので book を check できなかった。L8 はそれを \`let book = Arc::new(...); install_clob(book.clone());\` で修正。**Clone が「返り値テスト」と「state テスト」の差。** 安価（atomic increment 1 つ）で価値あり（partial write がないことを証明）。

4. **\`_result\` は将来意図のマーカー。** L8 は \`submit\` が返す fill を \`_result\` に bind して無視。L9 は \`fills\`（アンダースコアなし）に bind して route する。命名規約：\`_name\` = 「この値は見えていて acknowledge するがまだ使わない、将来使う予定」。\`_\`（むき出し）= 「明示的に使わない、使う予定もない」。状況に応じて選ぶ。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

L8 終了時点であなたのコードは Stage 9c に一致。Diff は**空**のはず（自分で書いた doc コメントの言い回しを除く）。**Stage 9c はこれで閉じる。**

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`Book::submit\` の戻り値は何で、なぜ捨てる？**
\`Book::submit(order)\` は \`Vec<Fill>\` を返す — 新 order を反対側の resting order とマッチさせて生じた fill。Marketable Buy を submit すると 1 つ以上の Sell order を消費し、マッチごとに 1 つの Fill を生む。L8 ではこれらの fill を捨てる — bridge の \`pending_fills\`（次の payload に attach される）がまだ precompile に繋がっていないから。**L9 で \`install_clob\` をミラーした \`install_fill_sink\` パターンで繋ぐ。**

**Q: \`place_order\` を \`staticcall\` から呼ぶと？**
Staticcall は read-only call — 対象が state mutation を試みると Solidity が revert する。**Precompile については EVM は precompile 境界でこれを強制しない** — precompile が STATICCALL で呼ばれたとき書き込みを拒否するのは precompile 側の責任。V0 では check しない — 十分に決意の固いコントラクトは \`0x...0c1c\` を STATICCALL でき、我々は喜んで book に書いてしまう。**これは既知の soundness gap。** Production は call context（\`is_static\`）を通して reject すべき。V0 では範囲外。

**Q: 1 つの EVM call で *write と read 両方* 起こせる？**
イエス — 1 つの Solidity 関数が \`call(0x...0c1c, ...)\` の後に \`staticcall(0x...0c1b, ...)\` を順に呼べる。それが事実上 \`place_order_then_read_best_bid_round_trips\` が Rust レベルでシミュレートしているもの。両 call は 1 つの EVM transaction の call stack 内で実行され、両方が \`CLOB_STATE\` global を触る。**EVM transaction が後で revert しても book state は roll back されない** — もう 1 つの soundness gap。Production は transaction-scoped state shadowing が必要。

**Q: なぜ \`place_order\` は \`0x...0c1a\` でなく \`0x...0c1c\` に登録？**
アドレス名前空間の慣習：\`0c1b\` = 「Read Best [b]id」、\`0c1c\` = 「[c]lob [c]reate」。数字的には \`0c1a\` も誘惑的だったが（\`0c1a < 0c1b\`）、\`0c1c\` は声に出して読みやすく、read/write アドレスが隣接する — \`0c1b\` が read、\`0c1c\` が write — 両方使うコントラクトを scan する人に役立つ。コントラクトを人間が書くなら、アドレス慣習は重要。

## 次のレッスン（L9）

L9 は L8 の doc コメントの「fill が discard」ギャップを閉じる。\`CLOB_STATE\` と並行な \`FILL_SINK\` static を追加 — process-global \`Option<Arc<Mutex<Vec<Fill>>>>\`。\`place_order\` が fill を sink に push するようになる。Bridge の \`pending_fills\` フィールドが \`Arc<Mutex<Vec<Fill>>>\` に（前は \`Mutex<...>\` だけ）。Bridge の \`new()\` がそれを FILL_SINK として install。L9 後、**EVM 経由で発注された order が生む fill が bridge の payload-attached fill stream に流れる** — precompile と bridge はもう書き込み側で独立ではない。`,
                },
              ],
            },
          },
          {
            title: "Bridge 統合",
            sortOrder: 4,
            lessons: {
              create: [
                {
                  title: "レッスン 9 — install_fill_sink — fill を bridge に戻す",
                  slug: "openhl-precompiles-fill-sink-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン 9 — \`install_fill_sink\` — fill を bridge に戻す

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…が 47 tests を通る（1 新規）。L8 の doc コメントで述べた「fill が discard される」ギャップが閉じる：

- **\`FILL_SINK\` static を追加** — \`CLOB_STATE\` と並行、\`Option<Arc<Mutex<Vec<Fill>>>>\` を保持。
- **\`install_fill_sink\` / \`uninstall_fill_sink\` モジュール関数** — public、\`install_clob\` / \`uninstall_clob\` パターンをミラー。
- **\`place_order\` を拡張** — \`let submit_result = book.submit(...)\`（前は \`_result\`）。\`drop(book)\` の後、sink が install されていれば**生まれた fill を push** する。
- **\`LiveRethEvmBridge::pending_fills\`** が \`Mutex<Vec<Fill>>\` から \`Arc<Mutex<Vec<Fill>>>\` に変わる。Bridge の \`new()\` が \`install_fill_sink(Arc::clone(&pending_fills))\` を \`install_clob\` と並んで呼ぶ。
- **新しい unit test** \`place_order_routes_fills_to_installed_sink\` — maker/taker のクロスを実行、sink が fill を受け取ることを検証。

L9 の後、precompile と bridge はもはや**書き込み側で独立**ではない。EVM 経由で発注された order が生む fill は、bridge 側の \`submit_order\` が書く同じ \`pending_fills\` キューに流れる。次の \`build_payload\` がそれを見る。

## おさらい

L8 で Stage 9c proper を閉じた：\`place_order\` が book に書くようになり、\`place_order → read_best_bid\` ラウンドトリップが証明された。だが L8 の doc コメントはギャップを名指した：

> Side note: the fills returned by \`Book::submit\` are discarded here. Production-shape integration would route them through the bridge's \`pending_fills\` so they reach the next \`build_payload\`.

そのギャップは意図的 — Stage 9c は diff を集中させるためそれなしで出した。Stage 9c+ がそれを閉じる。

## プラン

\`crates/evm/src/precompiles/mod.rs\` に 5 つの編集 + \`crates/evm/src/live_node.rs\` に 2 つの編集：

1. **\`Fill\` を import**（\`precompiles/mod.rs\` で。\`live_node.rs\` ではすでにある）。
2. **\`FILL_SINK\` static と 2 つの install/uninstall 関数を追加。**
3. **\`place_order\` の中で** — \`_result\` を \`submit_result\` にリネーム、Book lock を drop した後、sink が install されていれば \`submit_result.fills\` を sink に push。
4. **\`place_order\` doc コメントを更新** — 「fills are discarded」の side note を消し、Stage 9c+ の挙動に置き換え。
5. **Unit test を追加** \`place_order_routes_fills_to_installed_sink\`。

\`live_node.rs\` には：

6. **\`pending_fills\` フィールド型を変更** — \`Mutex<Vec<Fill>>\` から \`Arc<Mutex<Vec<Fill>>>\` へ。
7. **\`new()\` を更新** — \`pending_fills\` を Arc として bind、既存の \`install_clob\` の隣で \`install_fill_sink(Arc::clone(&pending_fills))\` を呼ぶ。

> 🛑 **考えてみよう。** スクロール前に — \`book.submit(...)\` を呼んで返り値の fill を*捨てる* precompile（\`place_order\`）はすでにある。それらの fill が bridge に届くようにするために：(a) precompile が bridge を直接*呼ぶ*、(b) bridge が fill を*ポーリング*しに来る、(c) precompile が push する共有バッファを install する、の 3 つが考えられる。**なぜ (c) — 共有バッファパターン — がこれまで作ってきたアーキテクチャからほぼ強制されるか？** ヒント：(a) と (b) が何を「知っている」必要があるかを考える。

（答え：**Precompile は \`fn\` pointer であり、bridge への参照をキャプチャできない。** (a) は precompile に \`&Bridge\` を何らかの方法で渡す必要があり、これは \`CLOB_STATE\` global で解決したのと同じ「関数ポインタはキャプチャできない」問題。(b) は bridge が「ポーリングすべきだ」と知る必要 — 関心の分離違反。(c) は同じパターン：bridge がバッファを所有、precompile が global 経由で見る。**共有 CLOB state のアーキテクチャが整えば、共有 fill state は自然な拡張。**）

## 手順

### Step 1: \`Fill\` を import

\`crates/evm/src/precompiles/mod.rs\` の現在の import：

\`\`\`rust
use openhl_clob::{AccountId, Book, Order, OrderId, OrderType, Price, Qty, Side};
\`\`\`

\`Fill\` を追加：

\`\`\`rust
use openhl_clob::{AccountId, Book, Fill, Order, OrderId, OrderType, Price, Qty, Side};
\`\`\`

\`Fill\` は course 7 の \`crates/clob/src/lib.rs\` で定義された value 型。\`price: Price\` と \`qty: Qty\` のフィールドを持つ（その他 \`maker_order_id\`、\`taker_order_id\` 等もあるかもしれないが、下のテストで inspect するのは \`price\` と \`qty\` だけ）。Copy 可能なので、受け渡しは安価。

\`crates/evm/src/live_node.rs\` では \`Fill\` は既に import 済み（既存の \`pending_fills\` フィールドで使われている）。ここではまだ変更なし。

### Step 2: \`FILL_SINK\` + install/uninstall 関数を追加

\`uninstall_clob\` の後ろに：

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

Static は \`CLOB_STATE\` の正確な構造的並行：
- \`CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>>\` — 外側の install/uninstall ロック、内側の Book ロック。
- \`FILL_SINK: RwLock<Option<Arc<Mutex<Vec<Fill>>>>>\` — 外側の install/uninstall ロック、内側のバッファロック。

同じライフサイクル、同じロック層化の理由（L4 §設計の振り返り 2）：稀な install/uninstall write には \`RwLock\`、頻繁なバッファ write には \`Mutex\`。

\`install_fill_sink\` と \`uninstall_fill_sink\` は CLOB 版をミラー：1 行の body、両方 \`pub fn\`。Doc コメントがライフサイクル（「\`LiveRethEvmBridge::new\` による」）を名指すので、コードを辿る読者は誰が呼ぶ予定かを知る。

> 🛑 **やりがちな勘違い。** 「CLOB と fill-sink を 1 つの global に束ねたら？例：\`CLOB_STATE: Option<(Arc<Mutex<Book>>, Arc<Mutex<Vec<Fill>>>)>\`」 **インストールのタイミング要件が違うから。** \`read_best_bid\` だけ exercise するテストは fill sink を install する必要がない。束ねると毎テストで両方を提供する羽目になる。**Global を直交に保てば、各テストが触るものだけ install できる。** 2 つの static のコストは記号的（uninstalled なら zero-runtime-cost）。利得は per-test 合成可能性。

### Step 3: \`place_order\` を fill push まで拡張

L8 の body：

\`\`\`rust
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
\`\`\`

これに変更：

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

3 つの変化：

1. **\`_result\` → \`submit_result\`。** L8 の設計振り返り（「\`_result\` は将来意図のマーカー」）の通り、今がその将来。アンダースコアが消える、binding が使われる。
2. **\`if !submit_result.fills.is_empty()\` 早期回避。** Order が cross せず rest したとき（fill 生まず）、lock 取得をスキップ。Resting limit の一般ケース → fill-sink トラフィックなし。
3. **\`sink_state.as_ref().map(|sink| sink.lock()...extend(...))\` パターン。** \`current_best_bid\` の read パターン（L4 Step 4）と同じ形：外側の read ロックを短く保持して内側の Arc にアクセス、次に内側の Mutex を取得。

**\`submit_result.fills.iter().copied()\`** — \`Fill\` は \`Copy\` なので \`.iter().copied()\` で所有 fill のイテレータが得られる。\`.into_iter()\` より安価 — \`submit_result\` の他のフィールドを消費したくないから。**Copy で iterate するとソースが intact のまま。**

> 🛑 **考えてみよう。** \`if !submit_result.fills.is_empty()\` の guard を見る。これを外したら（無条件に FILL_SINK の read ロックを取って \`as_ref()\` を check）、挙動は変わる？

（答え：**挙動は同じだが、fill なしのケースで性能が落ちる。** 限り注文を rest した毎 \`place_order\` 呼び出し — 一般ケース — が FILL_SINK の read ロックを取って何も push しないことを確認するだけになる。Guard はそれを短絡。**一般ケースの早期回避はタダで得られる勝利。** これは hot path — 不要な lock 取得のコストは積み重なる。）

### Step 4: \`place_order\` doc コメントを更新

L8 の末尾段落：

\`\`\`rust
/// Side note: the fills returned by \`Book::submit\` are discarded here.
/// Production-shape integration would route them through the bridge's
/// \`pending_fills\` so they reach the next \`build_payload\`. At v0 the
/// precompile and the bridge are write-side independent.
\`\`\`

これに置き換え：

\`\`\`rust
/// Stage 9c+ (this commit): any fills produced by the submit are pushed into
/// the \`FILL_SINK\` global if installed. This is what makes EVM-placed orders
/// flow into the bridge's \`pending_fills\` and out via \`build_payload\`,
/// matching the bridge-side \`submit_order\` semantics. If no sink is
/// installed the fills are still produced (visible via subsequent
/// \`read_best_bid\`) but won't reach a payload.
\`\`\`

2 つ名指したこと：

1. **「何が変わったか」の行** — 「Stage 9c+ (this commit)」。6 ヶ月後に読者がこの doc を読むと、どのバージョンのコードが何をしているか分かる。
2. **Fallback セマンティクス** — 「sink が install されていなくても fill は生み出される」。テスト隔離に決定的：L8 のラウンドトリップテスト（sink を install しない）でも \`place_order_then_read_best_bid_round_trips\` が動くのは、sink の有無に関わらず fill が Book に届くから。**Fallback を doc に名指せば、fill を気にしないテストが sink を install せずに \`place_order\` を満たせる。**

### Step 5: Unit test を追加

\`#[cfg(test)] mod tests\` ブロック内、\`place_order_then_read_best_bid_round_trips\` の後に：

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

テストの形：

1. **Setup** — \`TEST_SERIALIZER\` + CLOB と sink の両方を install。\`sink\`（Arc クローン）を inspect 用に保持。
2. **Resting maker** — Buy @ 100、何もクロスしない（book は空）。**Zero fills**。Sink は空のまま。
3. **Crossing taker** — Sell @ 100、resting Buy にクロス。Maker が book を出て、taker が full match → **ちょうど 1 つの Fill**。
4. **Sink を inspect** — \`clone()\` で Vec を出してから assert（Mutex を保持しないで assert する）。Length、price、qty を検証。
5. **Cleanup** — install 順の逆で両方 uninstall。

**なぜ maker + taker のペア、単一 submit ではない？** \`Book::submit\` は新 order が既存 order と*クロス*したときのみ fill を生む。空 book への単独 submit は zero fill を生む。Routing logic をテストするには**少なくとも 1 つの fill が実際 route される必要**。Maker が rest、taker がクロス → 1 fill — 最小テストデータ。

> 🛑 **やりがちな勘違い。** 「Marketable Buy を、resting Sell がある book に submit するのでテストできないの？」 **できる、等価。Maker-Buy/Taker-Sell を選ぶのはそれが標準的な order-book 例だから。** 2 つ目が 1 つ目に対して marketable ならどっち向きでも動く。Pedagogical な要点は「クロスする 2 つの order が 1 つの fill を生む」 — 価格方向は incidental。

> 🛑 **考えてみよう。** CLOB は install するが sink は install せずクロスする order を発注したらどうなる？ ヒント：L8 の既存 \`place_order_then_read_best_bid_round_trips\` テストを見る。

（答え：**Book 内で fill は生み出されるが、どこにも push されない — precompile の \`if !submit_result.fills.is_empty()\` guard は当たるが、\`FILL_SINK.read()\` は \`None\` を返すので内側ブロックが実行されない。** Order の book への on/off は正しく起きる。bridge への*流れ*だけが欠ける。これが doc コメントで名指した「単独テストでまだ動く」性質。L8 のラウンドトリップテストは sink を install しないが正しい best-bid 挙動を観測 — これに依存している。）

### Step 6: \`live_node.rs\` — pending_fills を Arc に

\`crates/evm/src/live_node.rs\` を開く。現在の struct（L4 から）：

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Arc<Mutex<Book>>,
    pending_fills: Mutex<Vec<Fill>>,
    state: Mutex<State>,
}
\`\`\`

\`pending_fills\` を変更：

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Arc<Mutex<Book>>,
    /// Same shared-Arc pattern as \`clob\`: the precompile module's \`FILL_SINK\`
    /// global points at this buffer too, so fills produced by EVM-placed
    /// orders (via \`clob_place_order\`) flow into the same queue the bridge's
    /// own \`submit_order\` writes to (Stage 9c+).
    pending_fills: Arc<Mutex<Vec<Fill>>>,
    state: Mutex<State>,
}
\`\`\`

Doc コメントがアーキテクチャの対称性を説明 — \`pending_fills\` と \`clob\` は両方とも shared-Arc パターン。型を辿って \`Arc\` を見た人は global がそこを指していることも知る。

### Step 7: \`LiveRethEvmBridge::new\` を更新

現在の \`new\`（L4 後）：

\`\`\`rust
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

これに変更：

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

3 つの変化：

1. **\`let pending_fills = Arc::new(Mutex::new(Vec::new()));\`** — Arc をローカル束縛、上の \`let clob = ...\` と同じ形。
2. **\`crate::precompiles::install_fill_sink(Arc::clone(&pending_fills));\`** — precompile モジュールと Arc を共有。\`install_clob\` をミラー。
3. **Struct literal の \`pending_fills,\`**（\`Mutex::new(Vec::new())\` をインラインで書かない） — ローカルを使うだけ。

\`self.pending_fills\` を使う他の call site（例：\`pending_fill_count()\`、\`build_payload\` での drain）は引き続き動く — \`Arc<Mutex<T>>\` は \`&Mutex<T>\` に deref するので \`self.pending_fills.lock()\` は変更不要。L4 で \`clob\` を Arc 化したとき \`submit_order\` を動かし続けたのと同じ coercion。

## テスト

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

30 秒ほどで：

\`\`\`
running 47 tests
... 47 tests pass ...

test result: ok. 47 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

L8 より 1 多い（46 → 47）。新規は \`place_order_routes_fills_to_installed_sink\`。それだけ見るには：

\`\`\`bash
cargo test -p openhl-evm --release routes_fills
\`\`\`

出力：

\`\`\`
running 1 test
test precompiles::tests::place_order_routes_fills_to_installed_sink ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 46 filtered out
\`\`\`

よくあるエラーと対処：

- **\`live_node.rs\` での \`error[E0277]: 'Vec<Fill>' is not 'Arc<Mutex<Vec<Fill>>>'\`** — \`pending_fills\` を Arc::new + Mutex::new でラップし忘れ。\`new()\` で \`let pending_fills = Arc::new(Mutex::new(Vec::new()));\` を構築する必要。
- **Struct literal が \`Mutex::new(...)\` を直接使っているときの \`error[E0277]: 'Mutex<Vec<Fill>>' is not 'Arc<Mutex<Vec<Fill>>>'\`** — L4 形の残骸。ローカル \`pending_fills,\` binding に置き換え。
- **\`precompiles/mod.rs\` での \`unused import: Fill\`** — Fill を import に追加したが使っていない。\`Vec<Fill>\` と \`FILL_SINK: ...Fill...\` 参照で使うはず。これが見えるなら static が配置されているか確認。
- **新テストでの \`assertion failed: fills.len() == 1\`** — \`book.submit\` が 1 つでなく 0 fill を生んだ。十中八九、2 つ目の order が 1 つ目とクロスしていない。Maker が Buy @ 100、taker が Sell @ 100（同価格 = クロス）を確認。
- **永久にハング** — \`place_order\` が FILL_SINK を取りに行くとき Book ロックを保持している。\`drop(book)\` 行が \`if !submit_result.fills.is_empty()\` ブロックの*前*にあることを確認。

## 設計の振り返り

4 点：

1. **共有バッファパターンは一般化する。** L4 で CLOB に \`Arc<Mutex<T>>\` + プロセスグローバルパターンを導入。L9 がそれを fill に再利用。**アーキテクチャの primitive が整えば、bridge と precompile の間で共有する追加の state はバッファあたり ~20 行のコード。** L4 の抽象化への投資が複利で回る。

2. **異なる state はインストールライフタイムが異なる — 別々に保つ。** CLOB と FILL_SINK を 1 つの global に束ねると毎テストで両方を install しなければならない。直交な global = 直交な test setup。**テストが主な consumer のとき、関連 state の凝集度より直交なライフサイクル合成可能性のほうが重要。**

3. **一般ケースの早期回避はタダ。** \`if !submit_result.fills.is_empty()\` がクロスせず rest した order の lock 取得をスキップ — 最も一般的なケース。Guard が hot path に分岐 1 つを足し、fill が空のとき RwLock 取得を節約。**Hot path で最も安価な最適化はしばしば支配的なケースの早期回避。**

4. **フラグは doc コメントの中。** L8 の doc の「Side note: fills are discarded」は load-bearing — 将来の読者に「これは意図的なギャップで、見落としではない」と伝えた。L9 がギャップを閉じて doc を更新。**Doc 化されたギャップは半分修正、無 doc のギャップは見えない技術負債。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

L9 終了時点で \`precompiles/mod.rs\` の diff は空、\`live_node.rs\` の diff も *L9 でカバーされた変更については*空のはず。Stage 9c+ commit は bridge integration test も拡張する（まだ存在しない — L10 が追加）ので、\`live_node.rs\` のテスト region で非空 diff が出るのは想定通り — それは L10 の領分。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`place_order\` が同時に呼ばれて両方とも fill を生むとどうなる？**
両スレッドが FILL_SINK の read ロックを取得（非排他、OK）。両方とも同じ Arc 包みのバッファへの参照を得る。各々が内側 Mutex を \`.lock()\` — その取得がシリアライズ。**1 スレッドの fill が先に着く、次にもう 1 つ。順序は \`submit\` 呼び出し順に一致。何も失われない。** 標準 Mutex セマンティクス。

**Q: \`place_order_routes_fills_to_installed_sink\` がもっとシンプルなシナリオでなく maker-taker クロスをテストするのは？**
Routing をテストするには fill が要るから。\`Book::submit\` は order が何もクロスしないとき 0 fill を返す — routing block を全く exercise しない。**Maker-taker のペアが fill を生む最小テストデータ。** よりシンプルなシナリオは routing logic を完全にスキップする。

**Q: \`submit_result\` って厳密には何？ \`Vec<Fill>\` だけ？**
\`Book::submit\` が返す struct（course 7 の CLOB crate で定義）。少なくとも \`.fills: Vec<Fill>\` フィールドがあり、その他もあるかも（\`order_id_assigned\`、\`resting_qty\` 等）。L9 では \`.fills\` だけ必要。残りは v0 では未使用。

**Q: Bridge の \`build_payload\` が \`pending_fills\` を drain するとき、両ソースの fill を原子的に drain する？**
イエス。\`pending_fills\` は 1 つのバッファ（1 つの Mutex）— fill が \`bridge.submit_order\`（bridge 内の呼び出し）から来ても \`place_order\`（FILL_SINK 経由）から来ても変わらない。\`build_payload\` が \`self.pending_fills.lock().unwrap().drain(..)\` を呼ぶと、前回の drain 以降に push された全 fill を得る — EVM 発注も bridge 発注も、時系列で交互。**統一されたキュー = 統一された drain。**

## 次のレッスン（L10）

L10 は**コースレベルのマイルストーン**：Stage 9d integration test \`bridge_against_custom_evm_node_shares_clob_with_precompile\`。\`OpenHlExecutorBuilder\` で Reth ノードを bootstrap、そのノードの provider に対して \`LiveRethEvmBridge\` を構築、\`bridge.submit_order\` で order を発注、\`current_best_bid\` で観測、次に **precompile 経由で \`place_order\` を呼んで** \`bridge.pending_fill_count()\` がインクリメントすることを検証。これが**すべて** — Module 1 の EVM bootstrap、Module 2 の read precompile、Module 3 の write precompile、Module 4 の FILL_SINK — が実際の Reth プロセス内で噛み合う証明。L10 後、openhl リファレンス実装は Stage 9d を閉じる。`,
                },
                {
                  title: "レッスン 10 — コースマイルストーン — 実際の Reth ノード内でフルスタック",
                  slug: "openhl-precompiles-bridge-integration-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 45,
                  xpReward: 90,
                  content: `# レッスン 10 — コースマイルストーン — 実際の Reth ノード内でフルスタック

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-evm --release bridge_against_custom_evm
\`\`\`

…1 つの新しい integration test \`bridge_against_custom_evm_node_shares_clob_with_precompile\` を通る。テストは Stage 9a-9c+ で触ったすべてを 1 箇所で行う：

1. **Reth を bootstrap** — \`OpenHlExecutorBuilder\` 付きで（両 CLOB precompile を登録したカスタム EVM）。
2. **\`LiveRethEvmBridge\` を構築** — そのノードの provider に対して。Bridge の \`new()\` が \`install_clob\` と \`install_fill_sink\` を呼ぶ。
3. **Bridge が book に書く** — \`bridge.submit_order(Buy @ 200 qty 33)\`。
4. **Precompile がそれを見る** — \`current_best_bid()\` が \`Some((Price(200), Qty(33)))\` を返す。
5. **Precompile が book に書く** — \`place_order(Sell @ 200 qty 33)\` を直接呼ぶ（EVM dispatch をシミュレート）。
6. **Bridge が fill を見る** — \`bridge.pending_fill_count() == 1\`。

これが**コースマイルストーン**。L10 後、47 unit test が証明したアーキテクチャは、1 つの integration test でも証明される — 実際の Reth ノード + 実際の bridge + 両 precompile + 両 global + マッチングエンジンを end-to-end、in-process で exercise。

これを動かすには**プロダクションコード変更が 1 つ必要**：\`place_order\` を \`pub(crate)\` に。integration test（\`live_node.rs\` 内、sibling モジュール）が直接呼べるように。

## おさらい

L9 後：
- Precompile モジュールに \`CLOB_STATE\` + \`FILL_SINK\`、両方とも \`Option<Arc<Mutex<T>>>\` global。
- Bridge の \`new()\` が両 global にインストール。
- Unit test が証明済み：read 動く（L6）、write 動く（L8）、fill が route される（L9）。
- **未テスト**：実際の Reth ノードでの*組み合わせ*。Unit test は Reth の \`NodeBuilder\`、\`EvmFactory\` dispatch、\`EthereumNode::components()\` 配線を bypass する。

L10 が 1 つの integration test でそのギャップを閉じる。

## プラン

2 つのファイルに 2 つの編集：

1. **\`crates/evm/src/precompiles/mod.rs\`** — \`fn place_order\` を \`pub(crate) fn place_order\` に。Integration test が直接呼ぶ。1 単語追加。
2. **\`crates/evm/src/live_node.rs\`** — 既存の \`#[cfg(test)] mod tests\` ブロック内に \`bridge_against_custom_evm_node_shares_clob_with_precompile\` テストを追加。~70 行、ほぼ setup + 7 つの assertion。

可視性変更以外の新プロダクションコードなし。**L10 の価値は新挙動でなく証明にある。**

> 🛑 **考えてみよう。** スクロール前に — unit test（L3、L6、L9）でピースが動くことを既に証明した。**なぜ Reth の \`NodeBuilder\` を通って同じコードパスを exercise する integration test がわざわざ必要？** ヒント：unit test が観測できないものを考える。

（答え：**Unit test は bridge と Reth の executor の間の配線ミスを観測できない。** 各 unit test は precompile を独立に、もしくは bridge を独立に構築する。\`NodeBuilder::launch()\` flow が \`OpenHlEvmFactory\` instance を構築して、bridge が*その*EVM に登録された precompile 経由で*同じ*CLOB を見るパスを exercise したものは 1 つもない。\`with_components(...executor(OpenHlExecutorBuilder))\` チェーンのタイポ、もしくは \`EthereumAddOns\` の適用が止まる regression — unit test を green にしたまま実際のプロダクションパスを壊す。**Integration test = 配線アサーション。**）

## 手順

### Step 1: \`place_order\` を \`pub(crate)\` に

\`crates/evm/src/precompiles/mod.rs\` で \`fn place_order\` 行を見つける：

\`\`\`rust
#[allow(clippy::unnecessary_wraps)]
fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
\`\`\`

これに変更：

\`\`\`rust
#[allow(clippy::unnecessary_wraps)]
pub(crate) fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
\`\`\`

これだけ。\`pub(crate)\` = \`openhl-evm\` crate の他の部分から見える、外には見えない。\`pub\` にしない 3 つの理由：

1. **Precompile は \`openhl_precompiles\` が registry に登録する。** 外部 caller は名前でなく registry 経由で \`Precompile::execute(...)\` を使うべき。\`pub(crate)\` で bypass を抑制。
2. **関数 signature は REVM 特有**（\`PrecompileFn = fn(&[u8], u64, u64) -> PrecompileResult\`）。広く露出すると downstream caller を REVM の呼び出し規約に結合する。
3. **Integration test がこの crate 内にある**ので、\`pub(crate)\` がそのテストが必要とする可視性ちょうど — それ以上でない。

**\`read_best_bid\` は private のまま。** モジュール外のテストはこれを直接呼ばない。可視性は最小に保つ。

> 🛑 **やりがちな勘違い。** 「test build でだけ見えるよう \`#[cfg(test)] pub(crate)\` にしないの？」 **\`pub(crate)\` はプロダクションバイナリの surface を広げない。** 可視性注釈は compile-time のみ。\`place_order\` が \`fn\` でも \`pub(crate) fn\` でも生成コードは同一。**ここでの \`#[cfg(test)]\` は利得ゼロの余計な ceremony。**

### Step 2: Integration test を追加

\`crates/evm/src/live_node.rs\` を開く。ファイル末尾の \`#[cfg(test)] mod tests\` ブロックを見つける。末尾にこのテストを追加：

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

テストは長いが各セクションに役割がある。4 フェーズに分けて歩く。

### Phase A — Setup（\`uninstall\` + \`NodeBuilder\`）

\`\`\`rust
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
\`\`\`

**なぜ先頭で \`uninstall_clob\` AND \`uninstall_fill_sink\` 両方？** 他のテストが片方または両方を install したまま終わっているかもしれない。たとえば同じ \`cargo test\` 実行で L9 の \`place_order_routes_fills_to_installed_sink\` の後に走ったら、sink がまだ stray Arc に設定されている可能性。前の state は信用できない。

**なぜ \`tokio::test(flavor = "multi_thread", worker_threads = 4)\`？** Reth の \`NodeBuilder.launch()\` は async — バックグラウンドタスク（executor、RPC、mining 等）を spawn する。Single-threaded tokio はこれらでブロック。**Multi-thread + 4 worker が Reth integration-test の標準セットアップ。** 少ない = テストが stall、多い = CI で無駄。

**\`NodeBuilder\` チェーンは L3 の \`reth_dev_node_with_openhl_executor\` テストと同一。** 同じ builder method、同じ順、同じ \`OpenHlExecutorBuilder\` plug-in。証明済みの sequence を再利用すれば、新テストの failure surface を *L10* が導入するもの — bridge + precompile composition、Node bootstrap 自体ではない — に集中できる。

> 🛑 **やりがちな勘違い。** 「このチェーンを書くのが 2 回目だから \`spawn_custom_evm_test_node()\` ヘルパーに抽出すべき？」 **No、意図的にやらない。** Reth の \`NodeAdapter\`（\`launch().await\` が返す型）は ~5 個の phantom パラメータでジェネリック。ヘルパーの戻り型でそれを名指せばどの caller もそのジェネリクスに絡む。**インライン合成は 1 回書くのが醜いが、毎呼び出し site で読むのが綺麗。** 3 つ目の caller が現れて型複雑度が安定したらヘルパーを追加すればよい。

### Phase B — Bridge 構築 + bridge → precompile read

\`\`\`rust
        let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);

        assert_eq!(current_best_bid(), None);

        bridge.submit_order(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(33),
            order_type: OrderType::Limit { price: Price(200) },
        });

        let best = current_best_bid().expect("CLOB has bids after submit_order");
        assert_eq!(best.0, Price(200));
        assert_eq!(best.1, Qty(33));
\`\`\`

\`LiveRethEvmBridge::new(...)\` は内部で 5 つのことをやる：
1. \`Arc<Mutex<Book>>\`（CLOB）を作る。
2. \`Arc<Mutex<Vec<Fill>>>\`（fills バッファ）を作る。
3. **\`install_clob\` を呼ぶ** — precompile モジュールの \`CLOB_STATE\` global が bridge の Book を指す。
4. **\`install_fill_sink\` を呼ぶ** — \`FILL_SINK\` global が bridge の fills バッファを指す。
5. \`Self { clob, pending_fills, ... }\` を返す。

この 1 つの呼び出しの後、bridge と precompile モジュールは 2 つの global で繋がっている。

事前条件 \`current_best_bid() == None\` は綺麗な state から始まっていることを証明する — Phase A の uninstall が効いた証。次に submit_order が bridge の Book に resting bid を生む。事後条件 \`current_best_bid() == Some(...)\` は precompile が bridge の書き込みを見ることを証明 — 同じ Arc を共有している。

**これが Stage 9d の証明。** このノードを通して \`STATICCALL(0x...0c1b)\` を呼ぶスマートコントラクトは、登録された precompile → \`current_best_bid()\` → \`CLOB_STATE\` → bridge の Book → このビッドを見る、という経路を辿る。

### Phase C — Stage 9c+ 拡張：precompile → bridge fills

\`\`\`rust
        assert_eq!(
            bridge.pending_fill_count(),
            0,
            "fills empty before crossing taker via precompile"
        );

        let mut calldata = [0u8; 128];
        calldata[24..32].copy_from_slice(&7u64.to_be_bytes());
        calldata[63] = 1;
        calldata[88..96].copy_from_slice(&200u64.to_be_bytes());
        calldata[120..128].copy_from_slice(&33u64.to_be_bytes());

        let r = crate::precompiles::place_order(&calldata, 100_000, 0)
            .expect("place_order must not error");
        let order_id_bytes = &r.bytes[24..32];
        let order_id = u64::from_be_bytes(order_id_bytes.try_into().unwrap());
        assert!(order_id > 0, "successful place_order returns nonzero id");

        assert_eq!(
            bridge.pending_fill_count(),
            1,
            "precompile-placed cross must populate bridge.pending_fills (Stage 9c+)"
        );
\`\`\`

このフェーズが Stage 9c+（commit \`d19ba1b\`）が追加したもの。最初の \`place_order\` 呼び出しが書き込み precompile を呼ぶスマートコントラクトをシミュレート。Sell @ 200 qty 33 が resting Buy @ 200 qty 33 にクロス — ちょうど 1 つの Fill が生まれる。

**手で組み立てた calldata は \`place_order_calldata\` が生成するものと同一。** ここでは明示性のためインライン — 各バイト位置に注釈、読者はヘルパーへ jump せず ABI レイアウトを追える。**End-to-end の正しさを証明する integration test では、calldata の明示性が DRY より重要。**

\`pending_fill_count()\` が 0 → 1 にジャンプ。**Fill は 5 段の間接を経てそこに辿り着いた：**

\`\`\`
place_order
  → submit_result.fills (Vec<Fill>)
  → FILL_SINK.read() → Some(sink: Arc<Mutex<Vec<Fill>>>)
  → sink.lock().extend(...)
  → bridge.pending_fills と同じ Arc
  → bridge.pending_fill_count() が increment を見る
\`\`\`

これが Stage 9c+ のテーゼ、end-to-end。

> 🛑 **考えてみよう。** \`crate::precompiles::place_order(&calldata, ...)\` の呼び出しを見る。**なぜ \`Precompiles::get(...).execute(...)\` 経由でなく関数を直接呼ぶ？** ヒント：L3 の unit test で両方やった。

（答え：**2 つの理由。** (1) Stage 9c+ commit の設計は \`place_order\` を直接呼ぶ — まさにそのために \`pub(crate)\`。Registry 経由なら \`Precompiles\` set を構築、どの hardfork にいるかを知る、等の余計な配線 — 追加の証明ゼロ。(2) L3 で registry path が動くことは既に証明済み。**L10 の仕事は bridge ↔ precompile module 配線の証明、registry path ではない。** 直接呼び出しがテストの scope を絞る。）

### Phase D — Cleanup

\`\`\`rust
        let _ = CLOB_PLACE_ORDER;

        uninstall_fill_sink();
        uninstall_clob();

        drop(handle);
\`\`\`

3 つの小さなこと：

1. **\`let _ = CLOB_PLACE_ORDER;\`** — アドレス定数に touch して load-bearing であることを示す。**なぜ？** テストが \`CLOB_PLACE_ORDER\` を import するが他で使わないから（calldata は precompile アドレス経由でなく手書き）。この行なしだと clippy が \`unused_imports\` を出す。\`let _ = ...\` はリンタを満たし「この定数が存在する、消すな」と示すドキュメント化された使い方。
2. **逆順 uninstall。** Install 順は clob → fill_sink。Uninstall は fill_sink → clob。**逆順クリーンアップが Rust の標準パターン**（RAII の drop 順をミラー）。慣用的、低コスト。
3. **\`drop(handle)\` 明示。** Rust はスコープ末で handle を drop する。だが名指せばノードのライフサイクルがテストのトレースで見える — 読者は「ここでノード終了」を見る。Reth を bootstrap する integration test なら、ライフサイクル時点はフラグを立てる価値がある。

## テスト

\`\`\`bash
cargo test -p openhl-evm --release bridge_against_custom_evm
\`\`\`

出力（Reth bootstrap + テスト実行で ~5 秒後）：

\`\`\`
running 1 test
test live_node::tests::bridge_against_custom_evm_node_shares_clob_with_precompile ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 47 filtered out
\`\`\`

Crate 全テスト：

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

\`\`\`
running 48 tests
... 48 tests pass ...

test result: ok. 48 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

L9 より 1 多い（47 → 48）。**47 unit test + 1 integration test、全 green。**

よくあるエラーと対処：

- **\`error[E0603]: function 'place_order' is private\`** — Step 1 を忘れた。\`fn place_order\` signature に \`pub(crate)\` を追加。
- **\`error[E0277]: 'NodeBuilder<...>' does not satisfy the trait...\`** — NodeBuilder チェーンのタイポ。L3 の \`reth_dev_node_with_openhl_executor\` テストと比較 — 同じチェーン、同じメソッド順。
- **テストが永久にハング** — \`worker_threads = 1\` もしくは single-threaded tokio。\`flavor = "multi_thread", worker_threads = 4\` を使う。
- **\`submit_order\` の後 \`current_best_bid()\` が \`None\`** — \`bridge.new()\` 内で \`install_clob\` が実際に呼ばれていない。L4 の bridge 変更を再確認。もしくは：別のテストが並列で \`uninstall_clob()\` を実行中に呼んだ。Global を触る全テストで TEST_SERIALIZER パターンを確認（ほとんどは L5 から持っているはず）。
- **\`place_order\` の後 \`pending_fill_count\` が 0** — おそらく \`bridge.new()\` 内で \`install_fill_sink\` が呼ばれていない（L9 Step 7）、もしくは \`place_order\` の fill-routing block にバグ（L9 Step 3 — \`drop(book)\` が sink lock の前にあることを確認）。
- **\`assertion failed: bridge.pending_fill_count() == 1\` で count = 0** — \`place_order\` の submit が 0 fill を返したので何も push されていない。手書き calldata を確認：account=7、side=1（Sell）、price=200、qty=33。特に \`calldata[63] = 1\` を Sell に — 0 だと Buy になり cross しない。

## 設計の振り返り

5 点：

1. **Integration test は unit test が捕まえられない配線バグを捕まえる。** 全ピースが isolation で動くという unit test がある。L10 は初めて*合成*で動くことを証明するテスト。L3 の NodeBuilder、L4 の install_clob、L9 の install_fill_sink、走っている Reth プロセス間の配線 — その配線に unit test がない。**End-to-end のための 1 integration test + ピース正しさのための多くの unit test が標準的な mix。**

2. **\`pub(crate)\` がクロスモジュールテストの正しい可視性。** \`pub\` 追加は API surface を広げる。\`#[cfg(test)] pub(crate)\` 追加は利得ゼロの ceremony（可視性は compile-time のみ）。**\`pub(crate)\` は「この crate 内なら誰でも呼べる、外には not」と言う。** クロスモジュールテストが欲しいのは正にそれ。

3. **テスト calldata：明示 > DRY。** Phase C の手書き \`[u8; 128]\` calldata は \`place_order_calldata\` が生成するものだが、バイト位置注釈付きでインラインにすると ABI レイアウトが呼び出し site で見える。**システムレベルの正しさを証明するテストでは、各バイト位置が学べる artifact であるべき。** ヘルパーは隠す、integration test は露わにする。

4. **「spawn-bridge-with-custom-EVM-node」のヘルパーなし。** Reth の \`NodeAdapter\` ジェネリック複雑度が return-type-naming を痛める。インライン合成は 1 回書くのが醜いが読むのが簡単。**テストコードでの早すぎる抽象化のコストはプロダクションと同じ：デバッグするコードパスが増える。** 3 つ目の caller を待ってから抽象化。

5. **正直に先送り：RPC \`eth_call\` ラウンドトリップ。** このテストは Reth の RPC サーバーを通らない。JSON-RPC 経由で \`clob_read_best_bid\` を呼ぶ実際の Solidity コントラクトは、追加の配線（RPC サーバー、transaction simulation、等）を exercise する — 我々はそれを証明していない。**我々は Reth が動くことを証明しているのでなく、openhl が Reth に正しく plug-in することを証明している。** RPC レイヤーは Reth の責任。再テストすれば openhl でなく Reth を validate することになる。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

L10 後、両方の diff が**空**のはず。あなたのコードは Stage 9c+ の HEAD（9c+ 拡張で延長された Stage 9d test）と一致。**Stage 9 はこれで閉じる。** openhl Stage 9 の全マイルストーン — 9a（カスタム EVM bootstrap）、9b（live CLOB read）、9c（write path）、9c+（fill が bridge に route）、9d（bridge integration） — がこのコースで再現された。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: このテストは RPC path をカバーする？例：web3.js で \`clob_read_best_bid\` を呼ぶ Solidity コントラクト。**
No。テストは Rust 経由で precompile を直接呼ぶ — \`crate::precompiles::place_order(...)\` と \`current_best_bid()\`。RPC path（JSON-RPC server → eth_call → revm dispatch → 我々の precompile）は追加の配線で Reth の責任。**RPC レイヤーを Reth が正しく扱うことを信頼する。** テストすれば openhl でなく Reth をテストすることになる。範囲外。

**Q: 複数 \`NodeBuilder.launch()\` 呼び出しが並列で起きたら（例：並列テスト）？**
各 \`launch()\` は別々の Reth プロセス state を生むが、すべて**プロセスグローバル**な \`CLOB_STATE\` と \`FILL_SINK\` を共有する。**だからこのテストは先頭と末尾で \`uninstall_clob\` + \`uninstall_fill_sink\` を呼ぶ** — 並列テストは global で race できる。L5 の \`TEST_SERIALIZER\` パターンはこのテストに届かない — \`live_node.rs\` のテストモジュール内、precompile のではないから。**完全な安全のためにはクロスモジュール serializer が必要、だが v0 ではこのテストがたまたまそのモジュール内で両 global を触る唯一のテスト。**

**Q: なぜ \`chain_spec.clone()\` が必要？**
\`NodeConfig::dev().with_chain(chain_spec.clone())\` がノード config 用に 1 clone を消費。\`LiveRethEvmBridge::new(provider, chain_spec)\` がオリジナルを消費（bridge は Arc として保持）。**\`ChainSpec\` の clone は安価**（内部で Arc 包みが一般的） — 代替は所有権の wrangling でテストに認知負荷が増す。Clone がここでは正しい道具。

**Q: Phase C で precompile でなく bridge 経由で marketable order を submit すればよくない？**
できる — \`bridge.submit_order(Sell @ 200 qty 33)\` も 1 fill を生む。だがそれは**bridge 側**の書き込みパスをテスト — course 7 の領域。**L10 は具体的に precompile 側の書き込みパス**を FILL_SINK 経由で bridge の pending_fills までテストしたい。\`place_order\` を直接呼ぶことで Stage 9c+ の配線が証明される。

## コースマイルストーン — 今証明されたもの

L10 後：

- **Module 1**：\`OpenHlEvmFactory\` + \`OpenHlExecutorBuilder\` が \`NodeBuilder\` 経由で Reth に plug-in。カスタム EVM が precompile 登録済みで boot。
- **Module 2**：\`read_best_bid\` が \`CLOB_STATE\` global 経由で live CLOB state を read。スマートコントラクトが real orderbook データを見る。
- **Module 3**：\`place_order\` が live CLOB state に書く。EVM↔CLOB サーフェスは \`0x...0c1b\`（read）と \`0x...0c1c\`（write）で双方向。
- **Module 4**：Precompile 発注 order からの fill が \`FILL_SINK\` global 経由で bridge の \`pending_fills\` に流れる。EVM 側 trade が payload fill になる。

47 unit test が各ピースを証明。**1 integration test が合成を証明。** このノードを通して各 precompile を呼ぶスマートコントラクトは、bridge がオーケストレートする同じ Book を見る・書く。

## 次のレッスン（L11）

L11 は capstone — **新コードなし**。築いたものを振り返り、先送り項目を名指す（RPC ラウンドトリップ、マルチバリデータ OrderId、transaction-scoped state shadowing、staticcall mutation 拒否）、次ステージの拡張をリストする（best_ask/depth/mid-price の追加 read precompile、\`clob_cancel_order\` precompile、EVM event としての fill）。L11 レッスンはメンタルモデルを固め、アーキテクチャを全体として見るためのもの。`,
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
                  title: "レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの",
                  slug: "openhl-precompiles-capstone-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 40,
                  content: `# レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの

## ゴール

このレッスンが終わると：

- EVM ↔ CLOB アーキテクチャを記憶からホワイトボードに描ける。
- v0 で先送りした 4 項目を名指し、それぞれが範囲外の理由を説明できる（RPC ラウンドトリップ、マルチバリデータ OrderIds、transaction-scoped ロールバック、staticcall mutation 拒否）。
- 4 つの拡張がどこに来るかを描ける（best_ask precompile、depth precompile、clob_cancel_order、fill を EVM event として）。
- 自分の Reth ベース L1 でカスタム precompile を出荷する準備ができる。

**このレッスンにコードなし。** メンタルモデルだけ。

## アーキテクチャ、1 枚の図で

\`\`\`
                ┌─────────────────────────────────────────────┐
                │           LiveRethEvmBridge                  │
                │                                              │
                │  clob: Arc<Mutex<Book>>                      │
                │  pending_fills: Arc<Mutex<Vec<Fill>>>        │
                └──────┬───────────────┬───────────────────────┘
                       │               │
            install_   │               │ install_
            clob       │               │ fill_sink
                       ▼               ▼
              ┌─────────────────────────────────────┐
              │  precompiles module (process-global) │
              │                                     │
              │  CLOB_STATE: RwLock<Option<…>>      │
              │  FILL_SINK:  RwLock<Option<…>>      │
              └──────┬───────────────┬──────────────┘
                     │               │
        read_best_   │               │ place_order
        bid          │               │
                     ▼               ▼
              ┌─────────────────────────────────────┐
              │  Reth EVM (via OpenHlEvmFactory)    │
              │                                     │
              │  Precompile registry:               │
              │    0x...0c1b → read_best_bid        │
              │    0x...0c1c → place_order          │
              └──────┬──────────────────────────────┘
                     │
                     ▼
              ┌─────────────────────────────────────┐
              │  Solidity contracts                 │
              │                                     │
              │  staticcall(0x...0c1b, "")          │
              │  call(0x...0c1c, abi.encode(...))   │
              └─────────────────────────────────────┘
\`\`\`

上から下：bridge がデータを所有、precompile モジュールがプロセスグローバル handle で露出、EVM が precompile に call を dispatch、Solidity コントラクトが \`ecrecover\` を叩くように同じアドレスを叩く。

下から上：スマートコントラクトが \`STATICCALL(0x...0c1b)\` を発行。Reth EVM が precompile registry でアドレスを検索 → \`read_best_bid\` に dispatch → \`CLOB_STATE\` から read → これが bridge の \`submit_order\` が書く同じ \`Arc<Mutex<Book>>\`。**翻訳レイヤーなし。シリアライゼーション往復なし。メモリだけ。**

## 各モジュールが届けたもの

**Module 1 (Custom EVM bootstrap, L1-L3)** — プラガブルなシーム：

- \`OpenHlEvmFactory\` が \`alloy_evm::EvmFactory\` を実装 — Reth の「スロットを 1 つ swap」カスタム EVM インターフェース。
- \`OpenHlExecutorBuilder\` が \`reth_node_builder::ExecutorBuilder\` を実装 — NodeBuilder plug-in の形。
- \`openhl_precompiles(base)\` が Reth の標準 precompile set を hardfork ごとにカスタムアドレスで拡張（\`OnceLock\` キャッシュ）。
- Reth が \`.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))\` で我々の EVM で boot。

**Module 2 (Read precompile, L4-L6)** — スマートコントラクトが live CLOB state を read：

- \`CLOB_READ_BEST_BID\` を \`0x...0c1b\` に — empty calldata、64-byte ABI-encoded \`(price, qty)\` を返す。
- \`CLOB_STATE\` global：\`RwLock<Option<Arc<Mutex<Book>>>>\` — bridge の Book へのプロセスグローバル handle。
- \`install_clob\` / \`uninstall_clob\` / \`current_best_bid\` — ライフサイクルと read プリミティブ。
- テスト証明済み：uninstalled で zero output、installed で live values、registry 経由で dispatch 呼び出し可能。

**Module 3 (Write precompile, L7-L8)** — スマートコントラクトが CLOB に write：

- \`CLOB_PLACE_ORDER\` を \`0x...0c1c\` に — 128-byte ABI-aligned calldata \`(account, side, price, qty)\`、32-byte \`(order_id)\` を返す。
- \`NEXT_ORDER_ID: AtomicU64\` — wait-free ID 割り当て、1 から開始で \`0\` = rejected sentinel。
- Rejection path：短い input、無効 side byte、qty=0、CLOB 未インストール。
- テスト証明済み：rejection で book は touch されない、有効 input は正しく cross、2-precompile ラウンドトリップが動く。

**Module 4 (Bridge integration, L9-L10)** — Fill が bridge に戻る：

- \`FILL_SINK\` global：\`RwLock<Option<Arc<Mutex<Vec<Fill>>>>>\` — \`CLOB_STATE\` と並行構造。
- \`LiveRethEvmBridge::new()\` が所有する Arc から両 global にインストール。
- \`place_order\` が fill を sink に push（installed なら） — bridge 側の \`submit_order\` と同じ drain で次の \`build_payload\` に届く。
- Integration test が実際の Reth プロセスでフルチェーンを証明：合計 48 tests（47 unit + 1 integration）。

## 正直に先送り

V0 がやらない 4 つ。それぞれ実際のプロダクションギャップ。それぞれコードでドキュメント化された上で*意図的に*先送りした。

### 1. RPC \`eth_call\` ラウンドトリップ

**証明したこと**：Rust から直接 \`place_order(...)\` と \`current_best_bid()\` を呼ぶ動作、precompile が \`openhl_precompiles()\` で Reth EVM に登録されること。

**証明していないこと**：JSON-RPC 経由で \`staticcall(0x...0c1b, "")\` を呼ぶ Solidity コントラクトが実際に我々の関数に届くこと。そのパスは Reth の RPC server、transaction simulation、EVM dispatch を含む — Reth が正しく扱うと信頼する配線。

**先送りの理由**：このテストは主に Reth を validate するもので openhl ではない。我々の crate と Reth の統合境界は \`openhl_precompiles()\` — それが正しければ残りは Reth の責任。

**いつ見直す**：Reth を大幅に fork する、もしくは precompile registry インターフェースが変わるメジャーバージョン境界をアップグレードするとき。

### 2. マルチバリデータ deterministic OrderIds

**現状**：\`NEXT_ORDER_ID: AtomicU64\`、1 から開始するプロセスグローバルカウンタ。

**問題**：このコードを 2 つの validator で走らせると各自のカウンタを持つ。Validator A が\`OrderId(5)\` をある EVM call に、validator B が*同じ* call に \`OrderId(11)\` を割り当てる。**Book が silent に分岐。** エラーなし、crash なし — read が異なる値を返すまでネットワーク全体で不整合 state。

**先送りの理由**：openhl v0 は single-validator。OrderIds のマルチバリデータコンセンサスは (a) EVM call 自体から deterministic な ID 導出（例：\`keccak(tx_hash, call_index)\`）、もしくは (b) block-scoped 共有 state から ID を読む、のどちらか。

**いつ見直す**：マルチバリデータ deployment 前。**これはネットワーク分岐バグが起きるのを待っているだけ。** \`NEXT_ORDER_ID\` の doc コメントが static の定義場所でこれを名指すので、将来のコード読者は制約を見る。

### 3. Transaction-scoped state shadowing（revert ロールバック）

**現状**：\`place_order\` が precompile 実行中*即座に* Book を mutate。

**問題**：EVM transaction が後で revert した場合（\`place_order\` 成功後）、book mutation はロールバックされない。EVM の通常の storage セマンティクスは transaction と一緒に revert する — だが我々の Book は EVM storage の外、プロセスグローバル Arc に住む。

**先送りの理由**：Storage shadowing は (a) Book mutation を journal して revert で replay する、もしくは (b) EVM 実行中はマッチングエンジンを「virtual」モードで走らせ transaction 成功で commit する、のどちらかが必要。両方とも non-trivial。openhl v0 は punt。

**いつ見直す**：プロダクショントラフィックに「order を発注した後に途中で fail しうるコントラクト」が含まれるとき。**Single-actor シナリオ（1 つのマッチングコントラクト、外部コンポーザビリティなし）なら問題なし。DeFi コンポーザビリティシナリオなら絶対に問題。**

### 4. \`staticcall\` mutation 拒否

**現状**：\`place_order\` は呼ばれ方に関わらず Book に書く。

**問題**：Solidity の \`staticcall\` は read-only アクセスを enforce するはず — だが EVM は static-call フラグを我々の precompile に渡さない。コントラクトは \`STATICCALL(0x...0c1c, ...)\` でき、我々は喜んで book を mutate、コントラクトの read-only セマンティクスへの期待を破る。

**先送りの理由**：REVM の \`PrecompileFn\` signature は \`fn(&[u8], u64, u64) -> PrecompileResult\`。「これは staticcall か？」フラグは第 3 引数にない（それは gas reservoir）。追加のコンテキストを通す必要があり、REVM 修正（fork）か上流 API 待ち。

**いつ見直す**：セキュリティ監査がこれを実際の攻撃 vector としてフラグするとき。**攻撃シナリオは contrived** — ほとんどのコントラクトは既知の write precompile を \`STATICCALL\` しない — だが慎重な監査者は名指す。

## 次に来るもの

このコース後に出荷できる 4 つの拡張、複雑度順。

### Extension 1: \`best_ask\` precompile（1 日）

\`read_best_bid\` を sell 側にミラー。同じ形、逆方向。新アドレス（\`0x...0c1d\`？）、新関数 1 つ、テストコード ~30 行。**\`read_best_bid\` への構造的並行で、ほぼ機械的に作れる。**

### Extension 2: \`clob_depth_at_price\` precompile（2-3 日）

\`(side, price)\` calldata を取り、その価格レベルで rest する合計 qty を返す。Market order 発注前にスリッページを推定したいコントラクトに有用。\`Book::depth_at_price()\` メソッドと新 precompile を追加。**概念的に似ているが calldata layout に input parameter を含む拡張。**

### Extension 3: \`clob_cancel_order\` precompile（1 週間）

\`(order_id, account)\` calldata を取り、order が caller のものなら book から削除。成功/失敗を返す。**認可問題が追加** — caller が order を発注したアカウントだとどう検証する？ EVM call の \`msg.sender\` は precompile を呼んだコントラクト、元アカウントではない。**\`keccak(account_id, signature)\` スキーム、もしくは事前登録された認可マッピングが必要。** アカウントモデルを決めるまで認可設計は先送り。

### Extension 4: Fill を EVM event として（2 週間）

現在 fill は \`bridge.pending_fills\` に届き、payload-built block に attach される。**スマートコントラクトはそれを観測できない。** Fill を EVM event として emit すれば、下流コントラクトが \`eth_getLogs\` / event filter で subscribe できる — ERC-20 transfer の subscribe と同じ。

**メカニズム**：\`place_order\` 末尾で各 fill を Solidity-ABI-encoded event として encode、\`revm::interpreter::Interpreter::add_log(...)\` を呼ぶ（もしくは EVM バージョンの相当物）。Event を emit するコントラクトは precompile 自身（アドレス \`0x...0c1c\`）。

**複雑度**：Precompile は通常 event を emit しない。この revm API は awkward — \`PrecompileFn\` signature の拡張が必要かも、つまり小さな revm fork。**High-impact、high-friction。** 明確なプロダクト需要があるまで先送り。

## コース完了 — 内在化したこと

このコースで練習したスキルは CLOB precompile を超えて一般化する：

1. **カスタム EVM の「スロットを 1 つ swap」パターン。** Reth の EVM に自分の dispatch を plug-in したいとき — カスタム opcode、カスタム transaction 検証、カスタム gas pricing — パスは同じ：\`EvmFactory\` + \`ExecutorBuilder\` + \`.with_components(...)\`。

2. **Precompile state のプロセスグローバル Arc パターン。** REVM の関数ポインタ signature ではクロージャは使えない。プロセスグローバル storage が唯一の選択肢。**パターンは複利**：1 つの共有 state（CLOB）があれば、追加（fill sink）は機械的。

3. **Schema-first プロトコル設計。** 実装（L8）の前に calldata layout（L7）を固めれば、schema に対してビルドされたコントラクトは実装の進化で壊れない。**契約は schema、関数 body ではない。**

4. **敵対的テストデータ。** 「best = 最高価格、最大数量ではない」を証明する 2 つの異なる価格 order。Fill を流す maker + taker。各テスト値が正しさを偶然から分離すべき。

5. **Documentation での正直な scoping。** 各先送り項目を関連コード site の doc コメントで名指す。**将来の読者がギャップと理由を 1 箇所で見る。** Documented でないギャップは見えない技術負債。

## このコースが L1 Architect track のどこに位置するか

**Course 1-5**（Reth internals）：Reth の pipeline、payload building、NodeBuilder、evm crate、RPC。

**Course 6-7**（consensus + CLOB）：openhl 特有の機構 — Malachite コンセンサス統合、次にマッチングエンジン。

**Course 8（このコース）**：カスタム precompile で EVM ↔ CLOB を橋渡し。**Reth のプラガブル EVM シームに触れる最初のコース。**

**Course 9**（funding state machine）：Perpetuals 特有 — CLOB を perp DEX にする funding rate 機構。Course 8 の precompile パターンの上に構築。

**Course 10**（capstone — フル openhl deployment）：1-9 のすべてを取り、実行可能な openhl node + サンプルトレーディングコントラクトを出荷。

L1 Architect track の 80% を踏破した。**ここで学んだパターンが残りすべての基礎。**

## 最終答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/ ./crates/evm/ --recursive
\`\`\`

L11 後、**\`crates/evm/\` ディレクトリ全体が byte-identical** に openhl の Stage 9c+ HEAD と一致するはず。5 commit（9a、9b、9c、9c+、9d）を手で再現した — 各行がなぜそこにあるかを完全に理解した上で。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## あなたがこれを出荷した

47 unit test。1 integration test。2 つのカスタム precompile。2 つのプロセスグローバル。1 つの EvmFactory。1 つの ExecutorBuilder。~600 行のプロダクション Rust コード。スマートコントラクトが同じノードで動くマッチングエンジンを read/write できる — \`ecrecover\` と BLS12-381 を扱うのと同じ EVM dispatch を通して。

**それが Reth の上に構築されたカスタム L1 トレーディングプリミティブ。** さあ出荷を。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
