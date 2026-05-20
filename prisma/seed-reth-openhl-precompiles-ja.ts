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

前コース (\`building-openhl-clob\`) は、bridge が CLOB matching engine を所有する地点で終わった。Order が submit され、fill が payload に流れ、integration test が実際の Reth node に対して pipeline 全体を exercise する。**ただし fill はまだ並行リストにすぎない。** 同じ Reth node 上で動くスマートコントラクトからは見えない。CLOB state と EVM state は別世界に存在している。

本コースではこのギャップを閉じる。**Custom EVM precompile** を追加する — Solidity (あるいは任意の EVM caller) から呼ばれると CLOB を read/write する Rust コードが走る、特殊な address のことだ。Course 8 を終えた時点で:

- スマートコントラクトは \`0x...0c1b\` を call して現在の **best bid を読める**。
- スマートコントラクトは \`0x...0c1c\` を call して matching engine が処理する **order を発注できる**。

この 2 つのパスが揃うと、CLOB は EVM の横に並ぶ並行構造から、EVM が対話できる **state 拡張** に変わる。これがチェーンを「Hyperliquid-shape」にする — Hyperliquid の本質的な新規性は、perp matching engine が同じチェーン上のスマートコントラクトから呼び出せる点にある。

本コース終了時、\`cargo test clob_precompile_round_trip\` が pass する。スマートコントラクトの call が precompile 経由で order を発注し、既存の book state とマッチし、生じた fill が bridge へ流れる、というラウンドトリップが通る。

## 1. 終了時に手にするもの

新規 \`crates/evm/src/precompiles/\` モジュール:

- **既知の EVM address に登録された custom precompile 2 個**:
  - \`clob_read_best_bid\` (read): best bid の \`(price, qty)\` を 64-byte response として返す。
  - \`clob_place_order\` (write): calldata から order を decode し、CLOB に submit、fill 要約を返す。
- **Custom EVM machinery** (\`openhl_evm.rs\`) — Reth の executor に precompile を配線する \`EvmFactory\` + \`ExecutorBuilder\`。
- **Bridge 統合** — \`LiveRethEvmBridge\` が custom EVM 付きの Reth node を spawn するため、precompile へのスマートコントラクト call は bridge が所有するのと同じ CLOB instance に触れる。

openhl では **6 commit 分** の作業 (~860 LOC)、11 レッスン + capstone に分割。End-to-end テストは ~3 秒: Reth を bootstrap し、薄い Solidity wrapper を deploy する (もしくはエンジン経由で直接 call)、precompile を trigger、fill を assert する。

## 2. 終了時にも手にしないもの

本コースが扱うのは **openhl Stage 9 (9a-9e) のみ**。以下は扱わない:

- **Fill を実 EVM transaction として block body にエンコードすること**。Fill は依然 payload に attach された並行リスト (course 7 L12 の状況) のまま。Course 8 では fill を *EVM 実行から見える* ようにするが、*block body の一部に* はしない。それは将来のコースの仕事。
- **Funding state machine**。Stage 8b / course 9 の領分。
- **Liquidation、oracle、perp 固有の math**。Stage 9 には含まれない。
- **Multi-market precompile**。Stage 9 は CLOB ひとつだけ。production では market ごとに 1 precompile を置くか、market-id calldata 付きで 1 つにまとめる。

本コースを終えると、スマートコントラクトが CLOB を read/write できるチェーンが手に入る。これは **大きな** capability ジャンプだ — 「チェーンのどこかに orderbook がある」と「チェーンそのものが orderbook + EVM である」の違い。ただしループを完全に閉じる (fill を tx として block body に戻す) のは下流の仕事。

## 3. 前提

必要なもの:

- **\`building-openhl-clob\` を完了済み** — もしくは course 7 end state と同等の workspace。\`LiveRethEvmBridge<P>\` に L9-L11 の \`clob\`、\`pending_fills\`、\`submit_order\`、\`payload_fills\`、\`pending_fill_count\` が揃っていること。なければ先に course 7 を終わらせる。
- **Rust 1.95+** (前コースと同じ)。
- **REVM に trait レベルで慣れていること。** Precompile を書いた経験は必要ない (パターンは L1 で説明する) — ただし REVM の \`Precompile\` / \`PrecompileFn\` / \`Precompiles\` 型を一度も見たことがないなら、まず [revm precompile docs](https://docs.rs/revm-precompile) に目を通しておく。
- **スレッド境界を越えた共有 state に \`Arc<Mutex<T>>\` を使うことに慣れていること。** Precompile は EVM の実行コンテキストから CLOB を read する必要があり、これは bridge の通常の call site とは異なる async/sync 境界をまたぐ。

不要なもの:

- \`EvmFactory\` や \`ExecutorBuilder\` の予備知識 (L1-L2 で説明する)。
- Solidity (本コースで Solidity は書かない — raw calldata 経由で precompile を exercise するだけ)。
- Course 6 で扱った範囲を超える Reth の block 実行 pipeline 内部の知識。

## 4. セットアップ確認 (今やる)

Course 6 と 7 から引き継ぐ 2 ディレクトリのワークフロー:

- \`~/code/my-openhl/\` — workspace
- \`~/code/openhl-reference/\` — read-only な \`psyto/openhl\` の clone

clone より新しい Stage 9 commit が来ている場合に備えて reference repo を更新:

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

続いて、workspace が course 7 の end state にあることを確認:

\`\`\`bash
cd ~/code/my-openhl
cargo test -p openhl-evm clob_fills_flow_into_payload --release 2>&1 | tail -5
# 期待: test pass (course 7 のマイルストーンテスト)。
\`\`\`

これが pass すれば、出発点としては正しい。

> 🛑 **やりがちな勘違い。** 「Custom EVM precompile は要するに fancy なコントラクト call で、Solidity 関数のように考えればいい」 — **違う、もっと根本的だ。** Precompile は EVM 内の既知 address で Rust を直接実行する。間に挟まる Solidity bytecode はない。Caller のコントラクトからは固定 address への external call に見えるが、実装側はこちらが選んだ state にフルアクセスできる native Rust だ。正しいメンタルモデルは「EVM から呼べる native 関数」であって、「もうひとつのスマートコントラクト」ではない。

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

**マイルストーンは L10。** L10 を終えると、live な Reth node 上で EVM から呼べる CLOB が手に入る: スマートコントラクトが precompile を call し、matching engine が走り、fill が bridge を経由して payload に現れる。L11 では「それでも何が足りないか」を名指す (fill はまだ EVM tx になっていない — それは Stage 9 の範囲を超える)。

## 6. 答え合わせの規律 (前と同じ)

L1-L10 の各レッスンは、6 個ある Stage 9 commit のいずれかを引用する:

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

意味のあるレベルで一致していれば OK — 同じ型、同じ制御フロー。空白や命名は違ってかまわない。

> 🛑 **やりがちな勘違い。** 「Precompile は何か特別なもので、openhl の参照実装は自分で書くものより高度なはず」 — **参照実装は素直で、本コースが教えるのは canonical な Reth + REVM パターンそのものだ。** Reth はまさにこの種のユースケースのために \`EvmFactory\` + \`ExecutorBuilder\` パターンを用意している (上流の例は \`paradigmxyz/reth/examples/custom-evm\`)。openhl がやっているのは *そのパターンに従い、read precompile を 1 つと write precompile を 1 つ登録する* こと、それだけだ。パターンさえ理解すれば、既存のものを copy-modify するだけで precompile を追加できる。

## 7. セットアップ確認 — L0 の実演習

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

3 つすべて pass すれば、L1 に進む準備が整っている。

> **最終チェック。** 本コースが course 7 にはなかった何を追加するのか、1 文で言えるか? 答えに「スマートコントラクトが CLOB を read/write できる」が入っていなければ §1 を読み直す。`,
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

上記の実行結果がクリーンにコンパイル。\`crates/evm/src/\` 配下に **新規モジュールが 2 個** 増える:

- **\`openhl_evm.rs\`** — \`OpenHlEvmFactory\` (Reth の \`EvmFactory\` スロット) + \`OpenHlExecutorBuilder\` (Reth の \`ExecutorBuilder\` スロット)、加えて \`OnceLock\` 経由の hardfork ごとの precompile dispatch。約 80 LOC。
- **\`precompiles/mod.rs\`** — \`openhl_precompiles(base) -> Precompiles\` の **stub**、ひとまずただの passthrough。L2 で本物の read precompile を埋める。

加えて **依存も 5 個追加** (workspace 1 + crate 4 — このうち \`reth-node-api\` は新規の git-pin 依存)。

L1 が終わると、custom EVM の **構造** が end-to-end で存在することになる。Reth は factory 経由で EVM instance を construct でき、factory 自体の仕事 (custom precompile の登録) はまだ何もしない — それら precompile を定義するのは L2 だから。

## おさらい

Course 7 完了時点の \`crates/evm/src/\`:

\`\`\`
crates/evm/src/
├── bridges/                    L4-L5: InMemoryEvmBridge, RethEvmBridge
├── reth_node.rs                L11 (c6): bootstrap proof (test-only)
└── live_node.rs                L12-L14 (c6) + L9-L11 (c7): LiveRethEvmBridge<P>
\`\`\`

\`cargo test -p openhl-evm clob_fills_flow_into_payload --release\` は pass する。Bridge が CLOB を所有し、\`build_payload\` 経由で fill を route する。**しかし bridge の Reth node 内で動くスマートコントラクトからは CLOB が見えない** — L1 はそのギャップを閉じ始めるレッスンだ。

## 計画

やることは 7 つ:

1. **\`alloy-evm = "0.34"\`** を workspace の \`Cargo.toml\` に追加。これは public な \`alloy-evm\` crate (Reth に git-pin されていない) で、\`EvmFactory\` / \`Database\` / \`EvmEnv\` 等を提供する。
2. **\`crates/evm/Cargo.toml\` に依存を 4 つ追加**: \`reth-evm\`、\`reth-evm-ethereum\`、\`reth-node-api\` (新規 git dep — 同じ SHA)、そして \`reth-node-builder\` を \`[dev-dependencies]\` から \`[dependencies]\` へ昇格。
3. **\`crates/evm/src/openhl_evm.rs\` を作成** — \`OpenHlEvmFactory\` + \`OpenHlExecutorBuilder\` + \`precompiles_for(spec)\`。
4. **\`crates/evm/src/precompiles/mod.rs\` を作成** — passthrough の stub。
5. **\`pub mod openhl_evm; mod precompiles;\`** を \`crates/evm/src/lib.rs\` に配線。
6. **\`OpenHlEvmFactory\` と \`OpenHlExecutorBuilder\` を crate root に re-export** — L3 の NodeBuilder 統合で使うため。
7. **\`cargo check -p openhl-evm\`** が clean に通ること。

これが course 8 で **依存追加が最も重い** レッスン。scaffold がコンパイルしたら、L2 で本物の precompile を埋め、L3 で NodeBuilder に配線して precompile が EVM 実行から到達可能かをテストする。

> 🛑 **考えてみよう。** スクロールする前に — Reth の \`EvmFactory\` は trait だ。なぜ Reth は 1 つの EVM instance を construct して使い回すのではなく、factory を必要とするのか? ヒント: チェーンで EVM transaction を **実行する** コードパスを思い浮かべる。Block validation (validate_payload)、payload assembly (build_payload)、eth_call RPC、debug RPC — どれも自分の database snapshot で新しい EVM instance を作る。**Factory がある理由は、Reth が EVM を 1 つではなく多数作るからだ。**

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

\`alloy-evm\` は public な alloy crate で、REVM の抽象を trait レベル (\`EvmFactory\` / \`Database\` / \`EvmEnv\`) で提供する。crates.io の stable 依存であり、Reth に git-pin されていない — \`alloy-genesis\` や \`alloy-rpc-types-engine\` と同じ扱いだ。

> 🛑 **やりがちな勘違い。** 「\`alloy-evm\` と \`reth-evm\` は同じもので、どちらかを選べばいい」 — **違う、別の層だ。** \`alloy-evm\` は任意の EVM 実装が満たせる **抽象** trait (\`EvmFactory\`、\`Database\` など) を提供する。\`reth-evm\` は Reth の **具体** 実装で、それらの trait を block-executor pipeline に配線する。今回は両方 import する: factory 定義には抽象を、executor 配線には具体を使う。

### Step 2: \`crates/evm/Cargo.toml\` を更新

\`crates/evm/Cargo.toml\` を開く。Course 7 L9 + course 6 L12 後の \`[dependencies]\` セクションには 12 個のエントリがある。ここに 4 つ追加する (新規 3 つ + 昇格 1 つ):

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

\`reth-node-builder\` は \`[dev-dependencies]\` から \`[dependencies]\` に昇格する — production コード (\`OpenHlExecutorBuilder\`) がこれを使い始めるため。\`[dev-dependencies]\` 側の行は削除:

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

**\`reth-node-api\` だけは workspace 経由ではなく、1 回限りの直接 git dep として宣言する。** workspace の \`Cargo.toml\` には宣言を置かず、git+rev を inline で書く。これは意図的だ — \`reth-node-api\` を使う crate は \`openhl-evm\` だけで、workspace の他の部分には不要。workspace dep に昇格させると、すべての crate の build graph がこれを把握する羽目になる。

> 🛑 **やりがちな勘違い。** 「Reth 関連の依存はすべて workspace dep にすべき、それがパターンだ」 — **必ずしもそうではない。** workspace dep が有用なのは、複数の crate が同じ依存を同じバージョンで必要とする場合。1 つの crate でしか必要としないなら、inline 宣言のほうがクリーンだ — workspace-level の Cargo.toml にエントリが増えず、読み手にとって間接参照も減る。\`reth-node-api\` は openhl-evm でしか使わないので、それに合わせて扱う。

### Step 3: \`crates/evm/src/precompiles/mod.rs\` (stub) を作成

\`openhl_evm.rs\` を書く前に、precompile モジュールが存在している必要がある (\`openhl_evm.rs\` がそこから import するため)。ディレクトリとファイルを作る:

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

body は 3 行。関数は \`Precompiles\` set (現在の hardfork に対する Reth のデフォルト) を受け取って、そのまま返す。**L2 でこの \`base\` と \`return\` の間に本物の \`clob_read_best_bid\` を挿入する。**

この関数のシグネチャは EVM factory が依存する **安定した契約**。L2-L11 でこの関数の **中身** は変わっていくが、\`openhl_precompiles(base: Precompiles) -> Precompiles\` という shape はずっと変わらない。

> 🛑 **やりがちな勘違い。** 「空の関数なんて無駄なコードだから、L1 と L2 は統合してしまえばいい」 — **passthrough は precompile ロジックを足す前に「構造がコンパイルすること」を証明するために存在する。** L1 と L2 を 1 レッスンにまとめて書いてしまうと、precompile 登録が壊れたときに、読み手は factory の配線が原因か precompile 登録が原因か切り分けられない。レッスンを分けることで、失敗モードが別々に診断できるようになる。

### Step 4: \`crates/evm/src/openhl_evm.rs\` を作成

これがメインファイル。冒頭:

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

import は 20 個ほど。多くは \`alloy-evm\` の re-export 経由で来る REVM 内部の型だ。一通り眺める価値はあるが、暗記する必要はない:

- **\`EvmFactory\`** — 実装する trait。Reth は EVM instance が必要になるたびに、factory の \`create_evm\` を呼ぶ。
- **\`ExecutorBuilder\`** — \`OpenHlExecutorBuilder\` に実装する trait。Reth の \`NodeBuilder\` がこれを使って EVM config を construct する。
- **\`Precompiles\`** — REVM の precompiled contract コレクション。ここに追加する形になる。
- **\`OnceLock\`** — std の once-init primitive。spec ごとの precompile セットをキャッシュするのに使う。

次は factory の struct:

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

8 個の associated type は scaffold だ — どの \`EvmFactory\` 実装にも必要で、多くは Reth のデフォルトと同じ。**面白いのは \`create_evm\` のほう。** 5 ステップ:

1. **\`Context::mainnet()\`** — REVM の「Ethereum mainnet」プリセット (gas 定数など) を取る。
2. **\`.with_db(db)\` + \`.with_cfg(input.cfg_env)\` + \`.with_block(input.block_env)\`** — 渡された database、config、block env を差し込む。
3. **\`.build_mainnet_with_inspector(NoOpInspector {})\`** — no-op inspector (tracing なし) で EVM を construct。
4. **\`.with_precompiles(PrecompilesMap::from_static(precompiles_for(spec)))\`** — **precompile をインストール**。\`precompiles_for(spec)\` が現在の Ethereum hardfork に対する正しい precompile セットを返す。
5. **\`EthEvm::new(evm, false)\`** — Reth の EthEvm 型でラップ。

\`create_evm_with_inspector\` は同じパスを、no-op の代わりに custom inspector でたどる。ほとんどの caller は \`create_evm\` を使い、inspector 版は debug RPC 用だ。

> 🛑 **やりがちな勘違い。** 「factory が \`db: DB\` を generic で取っているのはなぜ? 具体型の \`RevmDatabase\` のほうがシンプルだ」 — **Reth はコンテキストごとに別々の database snapshot 型を使うからだ。** Block validation は live な MDBX state を使い、eth_call RPC は履歴 snapshot を使い、debug RPC は in-memory overlay を使うこともある。Factory はそれら全部で動かなければならない。\`DB: Database\` で generic にすることが、具体型にコミットせずにそれを表現する手段だ。

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

各 Ethereum hardfork ごとに標準 precompile セットが異なる (ECDSA recovery、SHA-256、ModExp、EC-pairing など)。Cancun では blob 用の point evaluation precompile が追加され、Prague でさらに追加される予定だ。**この wrapper の \`openhl_precompiles\` が、現在 active な base set にカスタム precompile を差し込む。**

\`OnceLock\` は hardfork 階層ごとに 3 つ用意する:

- **\`PRAGUE\`** — Prague + Osaka をカバー (Osaka は当面 Prague の precompile を継承する)。
- **\`CANCUN\`** — Cancun。
- **\`FALLBACK\`** — Berlin/London/Paris/Shanghai。\`EthPrecompiles::new(spec)\` を使って、Reth がその spec に対して正しいと判断するセットを取得する。

**\`OnceLock\` を使い、call ごとに計算しないのはなぜか?** \`Precompiles\` は HashMap ベースの構造で、construct コストが高い (precompile address を全部 hashing する)。spec ごとに 1 回だけ計算してキャッシュする — これは Reth の custom-evm 例にも示されている定石の最適化だ。キャッシュが効くのは \`create_evm\` が **非常に** 頻繁に呼ばれるからで、毎 RPC eth_call、毎 block validation、毎 block build で走る。

### Step 6: \`OpenHlExecutorBuilder\` を追加

\`openhl_evm.rs\` の末尾に:

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

10 行。\`ExecutorBuilder\` trait は Reth が用意した hook で、\`EthereumNode\` が使う EVM config を差し替えるためのもの。associated type の \`EVM = EthEvmConfig<ChainSpec, OpenHlEvmFactory>\` は「Reth 標準の EthEvmConfig を使うが、こちらの factory でパラメータ化する」という意味だ。\`build_evm\` がその config を construct する。

trait bound \`Node: FullNodeTypes<Types: NodeTypes<ChainSpec = ChainSpec, Primitives = EthPrimitives>>\` は、この builder が動作する node の種類を制約する — Ethereum mainnet primitive、こちらの \`ChainSpec\`。Optimism や OP Stack のような exotic なものはこの bound を満たさない。意図的にそうしている。

**両 struct に付けた \`#[non_exhaustive]\`** は、後でフィールドを追加しても破壊的な API 変更にならないようにするためのもの。今は unit struct だが、いずれ openhl が configuration を持たせる必要が出ても、この属性のおかげで consumer は \`OpenHlExecutorBuilder {}\` リテラルで construct できない。

### Step 7: \`crates/evm/src/lib.rs\` に配線

\`crates/evm/src/lib.rs\` を開く。現状は前コースの bridges + reth_node + live_node モジュールが並んでいる。ここに 2 行追加する:

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

変更は 2 点:
- **\`pub mod openhl_evm\`** — consumer から見えるようにする。
- **\`mod precompiles\`** — 内部用にとどめ、外部には公開しない。スマートコントラクトは precompile を **address で** 呼ぶので、\`openhl-evm\` の consumer が \`openhl_precompiles\` を直接 import する必要はない。

末尾の re-export (\`pub use openhl_evm::{OpenHlEvmFactory, OpenHlExecutorBuilder}\`) は、これら 2 つの型を consumer 側から \`openhl_evm::OpenHlEvmFactory\` としてアクセスできるようにするためのもの。L3 の NodeBuilder 統合で使う。

## テスト

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

初回ビルドは遅い — \`alloy-evm\` と新しい Reth crate がそれなりの量のコードを引き込むため、30-60 秒は見ておく。2 回目以降はキャッシュが効く。

期待される出力:

\`\`\`
   Compiling openhl-evm v0.1.0 (.../crates/evm)
    Finished \`dev\` profile [unoptimized + debuginfo] target(s) in 32.45s
\`\`\`

警告は出ない (import 一覧は長いが、すべて使われている)。エラーもない。

既存のテストスイートが他に壊れていないことも確認する:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

39 個は引き続き pass する。新モジュールにはまだテストがない — 最初のテストは L3 で追加する。

よくあるエラーと対処:

- **\`error[E0432]: unresolved import 'reth_node_api'\`** — inline git dep の追加忘れ。Step 2 を確認する。
- **\`error[E0277]: 'EvmFactory' is not implemented for 'OpenHlEvmFactory'\` (associated type のどれかで発生)** — 8 個の associated type のどこかにタイポがある。\`1761d4d\` の参照と突き合わせる。よくあるのは \`type Spec = SpecId\` を \`type Spec = u64\` と書いてしまうケースなど。
- **\`error[E0282]: type annotations needed for 'PrecompilesMap'\`** — \`PrecompilesMap::from_static\` が generic を返すので、call site が型を知っている必要がある。ここでは \`with_precompiles(...)\` 呼び出しが推論材料を提供する。compiler が文句を言うなら import を見直す。
- **\`unused import: 'openhl_precompiles'\`** — この関数は \`precompiles_for\` の closure 内で参照する。この warning が出るなら、\`openhl_precompiles(Precompiles::prague())\` の代わりに \`Precompiles::prague()\` を直接書いてしまっている可能性がある。各 base set を \`openhl_precompiles(...)\` で包むこと。

## 設計の振り返り

要となる決定が 3 つ:

1. **Factory パターンが「Reth は EVM instance を多数作る」という現実に噛み合う。** Reth は 1 つの EVM を construct して使い回すわけではなく、RPC call ごと、block validation ごと、payload build ごとに新しい EVM を作る。\`EvmFactory\` trait は「すべての EVM 生成」を 1 箇所でフックする手段だ。**factory は 1 つ、EVM は多数、precompile 登録はどこでも一貫。**

2. **Spec ごとの \`OnceLock\` がキャッシュとして正しい形。** \`Precompiles\` セットの構築は軽くない (address の hashing、関数の insertion)。これを \`create_evm\` 呼び出しのたびにやるのは無駄。spec ごとにキャッシュすれば、hardfork 階層 (Prague、Cancun、fallback) ごとに 1 回だけ construct すれば済む。\`OnceLock\` がスレッドセーフな lazy 初期化を保証してくれる。

3. **\`openhl_precompiles\` の passthrough stub が L1 を孤立させる。** 関数は正しいシグネチャで存在するが、まだ何もしない。本体は L2 で埋める。**正しいシグネチャを持つ stub は契約として機能する**: caller (factory) は今すぐ配線でき、実装は call site を変えずに後で着地できる。これが書き直しを伴わない incremental な構築のやり方だ。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/openhl_evm.rs ./crates/evm/src/openhl_evm.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
\`\`\`

\`1761d4d\` の参照には **完全版** の \`precompiles/mod.rs\` (Stage 9a の read precompile) が入っている。stub 版とは差が出る:

\`\`\`bash
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
# 期待: stub は参照より大幅に短い; 参照に大きな追加として差が見える。L2 が欠けている content を追加。
\`\`\`

\`openhl_evm.rs\` は厳密に一致するはず (factory の構造は同一; doc コメントの言い回しが違う程度)。

main に戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: precompile モジュールを \`mod precompiles\` (private) にして、\`pub mod openhl_evm\` だけにしているのはなぜ?**
\`OpenHlEvmFactory\` は consumer が必要とする public API (L3 の NodeBuilder 統合で使う) だが、\`openhl_precompiles\` は \`openhl_evm.rs\` の内部でだけ消費される実装詳細だ。precompile モジュールを private に保つことで API の漏出を防ぐ — caller が自分で precompile セットを construct したり改変したりすべきではない。

**Q: \`Precompiles::from_static\` と \`Precompiles::default\` の違いは?**
\`from_static\` は \`&'static Precompiles\` の参照を取る — つまり precompile セットは「キャッシュして使い回すもの」という前提だ。\`default\` は新規の (空の) \`Precompiles\` インスタンスを作る。\`create_evm\` が \`from_static\` を使うのは、\`OnceLock\` でキャッシュされたセットが \`'static\` だから。キャッシュ + static 参照 = EVM 生成ごとの allocation がゼロ、ということになる。

**Q: なぜ \`PRAGUE\` が \`OSAKA\` もカバーするのか?**
Osaka (Prague の次に予定されている hardfork) は、参照 SHA 時点では新たな標準 precompile を導入しない。Osaka で新規 precompile が追加されたタイミングで、この match arm を \`OSAKA\` と \`PRAGUE\` の別ブランチに分割すればよい。それまでは同じ \`OnceLock\` を共有するのが正しい。

**Q: \`OpenHlExecutorBuilder\` に \`Clone\` は必要?**
trait は \`Clone\` を要求しないが、\`#[derive(Clone, Copy)]\` は安価 (中身のない unit struct なので zero-sized) で、Reth のパターンともマッチする。後で struct にフィールドを足すことになっても、API の使い勝手のために \`Clone\` は維持しておくのがよい。

## 次のレッスン (L2)

factory は配線できたが、precompile モジュールは passthrough のまま — Reth 標準の precompile だけがインストールされ、追加分はゼロ。L2 で最初の **本物の** precompile を追加する: address \`0x...0c1b\` の \`clob_read_best_bid\` だ。当面は hardcoded 値を返す (openhl Stage 9a と同じやり方)。live な CLOB state に配線するのは L4-L5。L2 では関数を定義し、登録し、registry 経由で到達可能にするところまでをやる。`,
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

…も引き続きコンパイルが通る。\`precompiles/mod.rs\` がついに **Stage 9a の完成版** になる:

- 定数 \`CLOB_READ_BEST_BID: Address = 0x...0c1b\` — precompile の address。
- 定数 \`CLOB_BASE_GAS_COST: u64 = 500\` — precompile call ごとの最小 gas 料金。
- 関数 \`read_best_bid(input, gas_limit, reservoir) -> PrecompileResult\` — 64 バイトで hardcoded な \`(price=100, qty=10)\` を返す。
- \`openhl_precompiles\` 関数 (もう passthrough ではない) が、base set を新しい precompile で extend する。

追加は ~40 LOC。precompile は **登録されたが、まだ live な CLOB state には配線されていない** — hardcoded な値を返すだけだ。これは意図的。L3 で「precompile が EVM 実行から **到達可能** であること」をテストし、L4-L5 で hardcoded 値を live な CLOB read に差し替える。**関数を先に、中身は後で** — L1 の passthrough と同じ incremental パターンだ。

## おさらい

L1 後の状態:

\`\`\`rust
// crates/evm/src/precompiles/mod.rs (passthrough stub)
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    base.clone()
}
\`\`\`

関数のシグネチャは固定 (L1 で契約を確定済み)、body は入力を clone するだけ。L2 で body を変更する — 同じシグネチャ、中身を増やす形になる。

## 計画

\`crates/evm/src/precompiles/mod.rs\` の中で 4 つやる:

1. **import を拡張** — \`alloy_evm::revm::precompile\` から \`Precompile\` / \`PrecompileId\` / \`PrecompileOutput\` / \`PrecompileResult\` を、\`alloy_primitives\` から \`address\` / \`Address\` / \`Bytes\` を追加。
2. **address 定数を追加** — \`CLOB_READ_BEST_BID: Address = 0x000...0c1b\`。consumer (とテスト) が名前で precompile を call できるよう public にする。
3. **gas-cost 定数 + \`read_best_bid\` 関数を追加** — どちらも private。関数は hardcoded な \`(price=100, qty=10)\` を 64 バイトの ABI encoding で返す。
4. **passthrough を置き換え** — \`openhl_precompiles\` が base set を clone し、新しい precompile 登録で \`extend\` するようにする。

このレッスン後の precompile は **callable** だが **dumb** だ — book の状態に関わらず同じ答えを返す。callable であることを証明するのが L3、smart にするのが L4-L5 だ。

> 🛑 **考えてみよう。** スクロールする前に: Solidity からの EVM call は \`staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)\` の形になる。precompile は 64 バイト (u256 が 2 個) を返す。**なぜ 64 バイトなのか? price も quantity も u32 に収まるのだから 8 バイト (u32 が 2 個) で十分なはずだ。** ヒント: Solidity がネイティブに返す型を考えてみる。

(答え: Solidity の ABI encoding では、\`returns(uint256, uint256)\` は 64 バイトだ — 各値は、実際に必要な bit 数に関わらず **常に** 32 バイトを占める。u64 の price は実体としては 8 バイトに収まるが、ABI は 32 バイトに pad する。仮に 8 バイトを返したら、Solidity 側は malformed な \`uint256\` として解釈して revert するだろう。**wire format は内部表現ではなく Solidity の ABI に合わせる。**)

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

新しく入る型・マクロは 6 個:

- **\`Precompile\`** — \`Address\` と \`PrecompileFn\` をペアにする wrapper。Precompiles set はこの形で保存している。
- **\`PrecompileId\`** — 識別子 (主にデバッグ / tracing 用)。\`PrecompileId::custom("clob_read_best_bid")\` の形で使う。
- **\`PrecompileOutput\`** — precompile から返る成功型。消費 gas、出力バイト、残 gas reserve を運ぶ。
- **\`PrecompileResult\`** — \`Result<PrecompileOutput, PrecompileError>\`。v0 ではエラーを返さないので常に \`Ok(...)\` を返す。
- **\`address\` マクロ** — \`address!("0x...")\` でコンパイル時に const な \`Address\` を作る。
- **\`Address\` / \`Bytes\`** — EVM コードで頻出する 2 つの byte-array 型。

> 🛑 **やりがちな勘違い。** 「address なんて \`[u8; 20]\` で済むのでは? \`alloy_primitives::Address\` を経由しなくていいのでは?」 — **ダメ。EVM エコシステムは \`Address\` で標準化されていて、\`Precompile::new\` もそれを要求する。** \`[u8; 20]\` を渡そうとすると型チェックで弾かれるか、どこかに \`.into()\` 変換を挟む羽目になる。EVM-address の canonical な型は \`Address\` だ。これを使う。

### Step 2: Precompile address の定数を追加

import の後、関数定義の前に追加する:

\`\`\`rust
/// Address of the "read best bid" precompile.
///
/// Solidity call shape: \`staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)\`
pub const CLOB_READ_BEST_BID: Address = address!("0x0000000000000000000000000000000000000c1b");

/// The minimum gas charge for invoking a CLOB precompile. Tuned later.
const CLOB_BASE_GAS_COST: u64 = 500;
\`\`\`

定数は 2 つ:

- **\`CLOB_READ_BEST_BID\`** — **\`pub\`**。テスト (L3) と下流の caller がこの address を call する必要があるから公開する。\`0x...0c1b\` は「CLB」(CLOB) のニーモニック。慣習はこう:
  - address \`1-9\` は Ethereum 標準 precompile (ECDSA recovery、SHA-256 など) が占有
  - 衝突を避けるため \`0x0c1b\` 以降に固める
- **\`CLOB_BASE_GAS_COST\`** — **private**、内部用のコスト値。500 gas は CLOB precompile への呼び出しごとの最低料金で、実際の EVM 計算では memory expansion や per-byte コストもチャージされるが、これはあくまでベース部分だけだ。

\`pub\` と private を分けるのは意図的。外部 caller は address を気にする必要があるが (precompile を **call する** ため)、gas cost は気にしなくていい (EVM が dispatch 中に処理する)。

### Step 3: \`read_best_bid\` 関数を書く

定数の下に書く:

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

body を上から見ていく:

1. **\`vec![0u8; 64]\`** — 64 個のゼロバイト。\`(uint256, uint256)\` の ABI shape は 32 バイトのブロック 2 つ。
2. **\`out[31] = 100\`** — 最初の 32 バイトブロックの最右バイトに price (100) を書く。big-endian の u256 は、上位バイトがゼロで、下位バイト (index 31) に実値が来る形だ。qty も同様に index 63 に書く。
3. **\`PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)\`** — output を組み立てる:
   - 第 1 引数: 消費 gas (500 をチャージ)。
   - 第 2 引数: output バイト (64 バイトの buffer)。
   - 第 3 引数: reservoir (追加 budget)。今は 0 を渡す。

関数の 3 引数はすべて \`_\` 接頭辞 (未使用) を付けてある。v0 の stub は:
- input を読まない (call は empty calldata で来る)。
- gas_limit を見ない (overflow チェックは EVM 側がやる)。
- reservoir を無視する (今は不要な advanced 機能)。

\`#[allow(clippy::unnecessary_wraps)]\` は「この関数は常に \`Ok(...)\` を返すのだから、unwrap した型を直接返せ」という lint を黙らせる。**unwrap した型にはできない** — \`PrecompileFn\` trait のシグネチャが \`PrecompileResult\` を **要求する** からだ。ここでは lint のほうが間違っていて、この属性がそれに対する正しい応答。

> 🛑 **やりがちな勘違い。** 「hardcoded な \`100, 10\` は TODO 臭がする。L4 で本物のデータが入るまでは \`unimplemented!()\` にしておくべきでは?」 — **その hardcoded 値こそが Stage 9a の本質だ。** これがあるからこそ、**次の** レッスン (L3) で「CLOB state の注入がまだ動いていなくても、precompile が EVM 実行から **到達可能** であること」を証明できる。\`unimplemented!()\` のまま放置すると、L3 のテストが panic してしまい、「precompile は呼べるのか?」と「正しい値を返すのか?」が切り分けられなくなる。**hardcoded な stub があるおかげで、中身をテストする前に配線をテストできる。**

### Step 4: passthrough の \`openhl_precompiles\` を置き換え

現在の passthrough 関数を探す:

\`\`\`rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    // L2 will replace this with \`let mut precompiles = base.clone();
    // precompiles.extend([...]); precompiles\`.
    base.clone()
}
\`\`\`

完全版の実装に置き換える:

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

body は 3 行:

1. **\`let mut precompiles = base.clone()\`** — base set から始める。\`base\` は \`&Precompiles\` なので直接 mutate できない。clone することで、所有権付きで mutable なコピーを得るのが唯一の手段。
2. **\`precompiles.extend([Precompile::new(...)])\`** — 自前の precompile を set に追加する。\`extend\` は \`Precompile\` の iterator を受け取り、長さ 1 の array を渡せば array が \`IntoIterator\` を実装しているので動く。
3. **\`precompiles\` を return** — 追加分込みの所有権付き \`Precompiles\`。

\`Precompile::new(...)\` の呼び出しは、3 つの部品から新規エントリを作る:
- \`PrecompileId\` (human-readable な名前、デバッグ/tracing 用)。
- 登録先となる \`Address\`。
- 呼び出す関数。

L7 以降では \`clob_place_order\` 用に 2 つ目の \`Precompile::new(...)\` を追加する。パターンは同じ: clone、extend、return だ。

## テスト

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

引き続き clean に通る。precompile の登録はできたが、これを exercise するテストはまだない — それは L3 の仕事。

任意で、precompile address が正しく export されているか確認してもよい:

\`\`\`bash
grep -r "CLOB_READ_BEST_BID" crates/evm/src/
# 報告するはず: precompiles/mod.rs が const を宣言
\`\`\`

よくあるエラーと対処:

- **\`error[E0432]: unresolved import 'alloy_evm::revm::precompile::Precompile'\`** — import 一覧のタイポ。正しいパスは \`alloy_evm::revm::precompile::{Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles}\`。
- **\`error: expected struct, found macro 'address'\`** — \`address\` を間違った場所から import している。これは \`alloy_primitives\` の \`address!\` マクロなので、import 一覧に \`address\` (小文字、マクロ側) を含めること。
- **\`out[31] = 100u8\` の overflow lint** — \`100\` はすでに \`i32\` で、\`u8\` への変換は問題ない。clippy が文句を言うなら \`out[31] = 100;\` (型注釈なし) でよい。
- **\`out[63] = 10\` が assertion に出てこない** — \`read_best_bid\` が間違った index を読んでいる。index 31 が price (最初の 32 バイト)、index 63 が qty (2 つ目の 32 バイト) であることを再確認する。
- **\`#[allow(clippy::unnecessary_wraps)]\` を書いても clippy が文句を言う** — 属性は外側のブロックではなく関数自体に付ける必要がある。\`fn read_best_bid(...)\` の直上に置く。

## 設計の振り返り

要となる決定が 3 つ:

1. **address 定数は \`pub\`、gas-cost 定数は private。** 外部の caller (テストやスマートコントラクト) は precompile を **どこに** call するかは知る必要があるが、**いくらコストがかかるか** は知る必要がない — それは EVM が内部で処理する。public と private の分け方は API の表面そのものを反映している。

2. **関数は \`(&[u8], u64, u64)\` を受け取るが、v0 ではどれも使わない。** \`PrecompileFn\` trait がシグネチャを固定しているので、使わなくてもこれらの引数を受け取るしかない。underscore-prefix の慣習 (\`_input\`、\`_gas_limit\`、\`_reservoir\`) で、コンパイラに「存在は認識しているが今は使わない」と伝える。L7 以降では \`_input\` を order データの decode に使う。

3. **64-byte の output は ABI の shape であって、内部表現の shape ではない。** 64-bit の price は 8 バイトに収まるが、Solidity は \`(uint256, uint256)\` を合計 64 バイトとして期待する。wire format を Solidity の ABI に合わせておけば、\`read_best_bid()\` は Solidity 側で直接書ける形になる。内部の \`Qty(u64)\` 型は実装詳細にすぎない。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

L2 を終えると、\`precompiles/mod.rs\` は \`1761d4d\` の参照と **機能的に同一**になる。違いは doc コメントの言い回しくらいのはず。

main に戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ enum variant ではなく \`PrecompileId::custom("clob_read_best_bid")\` を使う?**
\`PrecompileId\` は不透明な識別子で、主に REVM の logging/tracing 層で使われるものだから。custom precompile は標準セットの外にあるので、文字列名で識別する。文字列は human-readable なので、precompile call が trace に現れたときに numeric variant ではなく「clob_read_best_bid」が見える。

**Q: エラーハンドリングを追加したくなったら?**
return パスを \`Ok(...)\` から \`Err(PrecompileError::Other(...))\` に変えればよい。trait 自体はすでに対応している — v0 では失敗するモードがないだけだ。L4-L5 で read precompile が live state にアクセスするようになると、ありうるエラーの 1 つは「CLOB の lock が poisoned」になる — それを \`PrecompileError\` にマップすることになる。

**Q: なぜ \`Bytes::from(out)\` が必要なのか — \`Vec<u8>\` を直接 return してはだめなのか?**
ダメ。trait が \`Bytes\` (alloy の reference-counted な byte buffer。Rust 標準の \`Vec<u8>\` ではない) を要求する。\`Bytes::from(vec)\` で変換できる。wrapper 型を使う理由は、\`Bytes\` は安く clone でき、再 allocation なしに EVM 内部のあちこちで共有できるからだ。

**Q: スマートコントラクトは calldata で read_best_bid に引数を渡せる?**
Yes — calldata が \`_input\` パラメータに入る。v0 では precompile がそれを無視している (どんな入力でも best bid を返す) が、production コードでは calldata を使って **どの market の** best bid を読むかを指定する。現状は single-market のセットアップで、multi-market 対応には \`_input\` の decode を足すことになる。

## 次のレッスン (L3)

precompile は登録されたが、まだ **テストされていない**。L3 では executor builder を NodeBuilder に配線し、Reth node を custom EVM で boot し、precompile が \`CLOB_READ_BEST_BID\` で callable であることを verify する smoke test を書く。テストは小さい (~60 LOC) が、全体のツールチェーンを exercise する — custom EVM、executor builder、NodeBuilder 統合、EVM call dispatch、precompile registry の lookup。L3 を終えれば、スマートコントラクトが \`0x...0c1b\` を call すると \`(100, 10)\` を返す Reth node が手に入る。`,
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

…どちらも pass する。**新規テストを 4 個** 書く:

- **\`crates/evm/src/reth_node.rs\` に integration test を 1 つ** — \`reth_dev_node_with_openhl_executor\`。デフォルト executor の代わりに \`OpenHlExecutorBuilder\` を差し込んだ Reth node を bootstrap する。\`EvmFactory\` + \`ExecutorBuilder\` の合成が clean に spawn することを検証する。
- **\`crates/evm/src/precompiles/mod.rs\` に unit test を 3 つ**:
  - \`read_best_bid_returns_hardcoded_price_and_qty\` — 関数を直接呼ぶテスト。
  - \`openhl_precompiles_registers_clob_address\` — **extend-not-replace** の不変条件を確認。
  - \`registered_precompile_is_invokable_via_registry\` — registry 経由の dispatch をフルに通すテスト (REVM が内部で使うパスと同じ)。

**これが Module 1 のマイルストーンレッスン。** L3 を終えれば、custom EVM + precompile がコンパイル可能であるだけでなく、EVM 実行から到達可能であることまで証明される。Module 2-4 で **中身** (live state、write path、bridge 統合) を組み立てる — Module 1 は **配管** を整えるところまでだ。

## おさらい

L2 後の状態:

- \`openhl_evm.rs\` に \`OpenHlEvmFactory\` + \`OpenHlExecutorBuilder\` (L1)。
- \`precompiles/mod.rs\` に \`CLOB_READ_BEST_BID\` + \`read_best_bid\` + \`openhl_precompiles\` (L2)。
- \`cargo check -p openhl-evm\` が pass する。

**だが、まだこのコードを呼び出しているものがない。** L3 では「配管が動くこと」を証明する 4 つのテストを書く。

## 計画

やることは 5 つ:

1. **\`reth_node.rs\` の import を更新** — \`EthereumAddOns\` (\`with_add_ons(...)\` で必要) と \`crate::OpenHlExecutorBuilder\` (配線対象の型) を追加する。
2. **integration test \`reth_dev_node_with_openhl_executor\` を追加** — course 6 の \`reth_dev_node_bootstraps\` と同じ形だが、explicit-builder の経路で \`.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))\` を使う。
3. **\`precompiles/mod.rs\` に \`#[cfg(test)] mod tests\` を追加** — unit test 3 個。
4. **両方のテストパスを走らせる** — integration test と unit test 3 個が pass する。
5. **他に壊れていないことを検証** — \`cargo test -p openhl-evm --release\` で course 6 + course 7 の既存テストが全部 green であること。

unit test 3 個は、それぞれ別の関心事をカバーする:

| Test | カバーする関心事 | 失敗したらバグはどこか |
| - | - | - |
| \`read_best_bid_returns_hardcoded_price_and_qty\` | 関数 body が正しい (正しいバイトを書く) | L2 の \`read_best_bid\` 実装 |
| \`openhl_precompiles_registers_clob_address\` | extend-not-replace の不変条件 | L2 の \`openhl_precompiles\` の body — 多分 \`clone()\` か \`extend(...)\` の意味取り違え |
| \`registered_precompile_is_invokable_via_registry\` | registry 経由の EVM dispatch パスが動く | \`Precompile::new(...)\` の呼び方、\`PrecompileId\`、もしくは登録順 |

> 🛑 **考えてみよう。** スクロールする前に: なぜ \`openhl_precompiles_registers_clob_address\` は、\`CLOB_READ_BEST_BID\` だけでなく \`0x...01\` の ECDSA recover **も** extended set に存在することを assert するのか? 最初の assertion だけで十分に見える — 自分で登録したのだから、ECDSA がまだあることまでチェックする必要があるのか?

(答え: このテストは **extend-not-replace** の不変条件を強制したいからだ。仮に \`openhl_precompiles\` が、base を clone して extend するのではなく、誤って新規の \`Precompiles\` セットを作ってしまった場合、\`CLOB_READ_BEST_BID\` は依然として存在するが、標準の Ethereum precompile (ECDSA recover、SHA-256 など) は **消える**。base set は wrapper が必ず保持しなければならない load-bearing な部分の 1 つだ。ECDSA recover がなければ、署名検証をするコントラクトは revert してしまう。**dual assertion が silent-replace バグを捕まえる。**)

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

\`OpenHlExecutorBuilder\` の import も追加する。\`use\` ブロックの直後、\`dev_chain_spec()\` の前に:

\`\`\`rust
use crate::OpenHlExecutorBuilder;
\`\`\`

import が 2 つ必要なのは、\`EthereumAddOns\` が \`.with_add_ons(...)\` で必要 (explicit-builder の経路では、カスタマイズしない場合でも \`add_ons\` 引数が要求される) で、\`OpenHlExecutorBuilder\` が差し込み対象の型だから。

### Step 2: integration test \`reth_dev_node_with_openhl_executor\` を追加

\`reth_node.rs\` の \`mod tests\` ブロックの末尾、既存の \`reth_dev_node_bootstraps\` test の後ろに追記する:

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

course 6 の \`reth_dev_node_bootstraps\` テストと見比べてみる — セットアップパターンは同じだが、肝心の 1 行が違う:

\`\`\`rust
// course 6:
.node(EthereumNode::default())
.launch_with_debug_capabilities()

// course 8:
.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
.with_add_ons(EthereumAddOns::default())
.launch()
\`\`\`

course 6 の経路は \`.node(...)\` を使う — これは shorthand で、事前構築済みの node spec を受け取る。course 8 の経路は explicit な builder を使う: **\`OpenHlExecutorBuilder\` だけを差し替え、他のコンポーネント (network、payload pool、RPC handler) はデフォルトに保つ。** これが「Reth を fork せずに configure できる」という性質そのもの。

load-bearing なのは \`.executor(OpenHlExecutorBuilder)\` のチェーン。\`EthereumNode::components()\` がデフォルトの \`ComponentsBuilder\` を返し、\`.executor(...)\` でそのうち 1 スロットだけを上書きする。残りのスロット (network、payload、pool など) はデフォルトのまま。**1 スロットを差し替え、残りはすべて継承。**

> 🛑 **やりがちな勘違い。** 「\`OpenHlExecutorBuilder\` の struct を作らなくても、\`.executor(my_closure)\` で executor を inline に書けばいいのでは?」 — **Reth の \`ComponentsBuilder\` が受け入れる契約は \`ExecutorBuilder\` trait の方だ。** closure も同じ trait (\`impl ExecutorBuilder<Node>\`) を満たさなければならず、これを inline で書くのは扱いづらい。struct が存在するのは trait が API surface だから — このフックには closure は合わない。

### Step 3: \`precompiles/mod.rs\` に \`mod tests\` ブロックを追加

\`crates/evm/src/precompiles/mod.rs\` を開いて、ファイル末尾 (\`openhl_precompiles\` の後ろ) に追記する:

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

**scope を少しずつ広げていく** 3 つのテストだ:

- **\`read_best_bid_returns_hardcoded_price_and_qty\`** — 関数を \`(empty_input, gas_limit=100_000, reservoir=0)\` で直接呼ぶ。バイト長、decode された price、decode された qty、消費 gas を assert する。**最も狭い scope** — 関数だけ、registry も EVM もなし。
- **\`openhl_precompiles_registers_clob_address\`** — \`openhl_precompiles(Precompiles::cancun())\` を呼び、自前の address と標準 ECDSA recover address の **両方** が extended set にあることを確認する。load-bearing な assertion は **extend-not-replace の不変条件** だ: バグった wrapper は base set を extend する代わりに replace してしまう可能性がある。
- **\`registered_precompile_is_invokable_via_registry\`** — \`.get(&CLOB_READ_BEST_BID)\` で registry から precompile を取り出し、その \`.execute(...)\` メソッドを呼ぶ。**dispatch パスのフル版** で、REVM が \`STATICCALL\` で内部的に使うのと同じコード。

\`alloy_primitives::U256\` の import は、64-byte の response を decode するために必要。\`U256::from_be_slice(&bytes[..])\` が 32-byte の big-endian slice を U256 に decode する。

> 🛑 **やりがちな勘違い。** 「3 つ目のテストは冗長では? 関数が動き (test 1)、address が登録され (test 2) ているなら、registry 経由の invocation も動くはずでは?」 — **そうとは限らない。** test 2 は \`address.contains(&...)\` が true を返すことしかチェックしていない。registry から関数を引いて dispatch する経路は別物で、REVM は内部で \`.get(&address)\` してから \`.execute(...)\` を呼ぶ。**\`Precompile::new(...)\` の配線にバグがある場合 (関数ポインタが間違っている、型が合わないなど)、test 1 と 2 は通っても test 3 は落ちる。** dispatch テストが実在するバグのクラスを捕まえる。

### Step 4: テストを実行

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_with_openhl_executor --release
\`\`\`

~30 秒ほど (新テスト導入後の初回 incremental build):

\`\`\`
running 1 test
test reth_node::tests::reth_dev_node_with_openhl_executor ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

続いて unit test:

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

\`--lib\` は library 内の unit test を走らせるフラグ (\`tests/\` 配下の integration test ではなく)。これがないと \`cargo test precompiles\` が integration test の名前パターンともマッチしようとする。

### Step 5: 他に壊れていないことを確認

フルスイート:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

~30 秒後:

\`\`\`
running 42 tests
... 42 tests pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**\`openhl-evm\` で 42 個 pass** する (course 6+7 の 39 個 + 新規 unit test 3 個 + 新規 integration test 1 個 — \`--lib\` と integration test で名前パターンが被るので、実際のカウントは多少ずれる)。既存テストはすべて green のままだ。

よくあるエラーと対処:

- **integration test が「\`with_components\` not found」で落ちる** — 新テストでは shorthand の \`.node(...)\` ではなく \`with_components\` を使う。shorthand を完全に差し替えたか確認する (追加しただけの状態になっていないか)。
- **\`error[E0277]: 'EthereumAddOns' is not a 'NodeAddOns'\`** — import パスが間違っている。\`reth_node_ethereum::EthereumAddOns\` ではなく、\`reth_node_ethereum::node::EthereumAddOns\` (パスに \`node::\` を含む) を使う。
- **\`assert!(extended.contains(&ecrecover))\` が落ちる** — \`openhl_precompiles\` の body が base を clone するのではなく、新規の \`Precompiles\` セットを作ってしまっている。L2 の Step 4 を見直す。\`let mut precompiles = base.clone(); precompiles.extend(...); precompiles\` の形であるべきで、**\`let precompiles = Precompiles::default(); precompiles.extend(...)\` ではない。**
- **\`result.gas_used\` が \`CLOB_BASE_GAS_COST\` と一致しない** — 定数の値が、\`read_best_bid\` が課金する値と食い違っている。L2 の Step 3 を見直す: \`PrecompileOutput::new(CLOB_BASE_GAS_COST, ...)\` の形で、両方が同じ定数を参照している必要がある。
- **\`registered_precompile_is_invokable_via_registry\` が panic** — L2 の \`openhl_precompiles\` における \`Precompile::new(...)\` の呼び方が間違っている (関数ポインタや引数の並び順が違うなど)。3 引数の形 \`(PrecompileId, Address, fn)\` を再確認する。

## 設計の振り返り

要となる決定が 3 つ:

1. **scope を広げながらテストする。** unit test 3 つは最も狭いところ (関数 body) から始めて、外側 (registry の登録 → registry 経由 dispatch) へ広げていく。どれか 1 つが落ちたとき、どの層が壊れているかを正確に特定できる。**テストの scope = バグの局在化。**

2. **extend-not-replace のチェックは dual assertion で行う。** \`extended.contains(CLOB_READ_BEST_BID)\` だけが通っても、wrapper が壊滅的に間違っていないことの証明にはならない — base set を **replace してしまう** バグ wrapper でも通ってしまう。ECDSA recover **も** 残っていることを assert することで、silent-replace バグを捕まえられる。**1 つの assertion は間違った理由で pass し得るが、2 つの dual はそうはいかない。**

3. **integration test は precompile を invoke しない。** RPC でフルにラウンドトリップさせるには Solidity コントラクトの deploy が必要になる — それは Reth-RPC のテスト範囲であって、precompile のテストではない。Module 1 のマイルストーンは「EvmFactory + ExecutorBuilder が clean に spawn する」こと。precompile の挙動は unit test (Step 3) で、組み立て側は integration test で押さえる。**2 つのテスト、それぞれの scope、別々に対処する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 2ba97c6
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/reth_node.rs ./crates/evm/src/reth_node.rs
\`\`\`

L3 後、コードは \`2ba97c6\` の参照と一致する — Stage 9a の NodeBuilder 配線と Stage 9e の unit test 3 個が両方揃っている状態。違いは doc コメントの言い回し程度。

main に戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`EthereumNode::default()\` ではなく \`EthereumNode::components()\` を使うのはなぜ?**
\`default()\` は事前構築済みの node spec を返すもので、個別のコンポーネントは差し替えられない。\`components()\` は \`ComponentsBuilder\` を返し、\`.executor(...)\` / \`.network(...)\` / \`.payload(...)\` などを chainable なメソッドとして提供する。**スロットを 1 つでも差し替えたいなら \`components()\`、すべてそのままでよいなら \`default()\`。**

**Q: \`Precompile::execute(&[], 100_000, 0)\` は内部で実際に何をしている?**
\`Precompile\` 型の public な dispatch メソッドだ。内部で保持している関数ポインタ (今回は \`read_best_bid\`) を、与えられた引数で呼ぶ。スマートコントラクトが precompile の address を \`STATICCALL\` するとき、REVM はこれと同じメソッドを使う — EVM が precompile registry で address を引いて \`&Precompile\` を取得し、\`.execute(input, gas_limit, reservoir)\` を呼ぶ。

**Q: なぜ integration test に \`--release\` が必要?**
速度のため。\`--release\` で最適化を有効にすると、テストの実行時間が debug の ~5 秒から ~1 秒程度に縮む。他の unit test は十分小さいので、debug のオーバーヘッドは無視できる。

**Q: \`.with_add_ons(EthereumAddOns::default())\` は省略できる?**
できない — \`NodeBuilder\` の build チェーンは、デフォルトでよくても全 "slot" を埋めることを要求する。省略すると compile 時に失敗する。\`EthereumAddOns::default()\` を明示することで、曖昧さなく「デフォルトを使う」と言える。

**Q: integration test で \`unwrap()\` のチェーンではなく \`Result<()>\` と \`async\` ブロックを使っているのはなぜ?**
エラー報告の質を上げるため。\`NodeBuilder\` チェーン中で何かが失敗したら、\`?\` がエラーを外側の \`result\` に伝播し、末尾の \`panic!\` が \`{e:?}\` で原因を表示してくれるので、何が落ちたかが見える。\`.unwrap()\` 直書きだと、元のエラーチェーンを失った generic な panic になる。

## 次のレッスン (L4)

precompile が登録され、callable であることまで証明できた。だが返しているのは **hardcoded な値** だ。L4 では precompile に **live な CLOB state** を配線し始める — \`install_clob()\` を追加して bridge から \`Arc<Mutex<Book>>\` を precompile モジュールに inject できるようにし、\`openhl_precompiles\` が shared state を受け取れるよう更新する。L4 を終えると、precompile は本物のデータを返す **能力を持つ** ようになる。実際に shared book から read するのは L5。`,
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

上記の実行結果が引き続き通る（L3 で追加した 4 つを含む 42 tests）。**\`read_best_bid\` が返す値はまだ変えずに**、live CLOB state を流すための**配管だけ**を仕込みます：

- **\`Book\` に新メソッドを 2 つ**（\`crates/clob/src/book.rs\`）：\`best_bid_with_qty()\` / \`best_ask_with_qty()\`。それぞれ \`Option<(Price, Qty)>\` を返す。
- **\`precompiles/mod.rs\` にモジュールレベルの \`static CLOB_STATE\`**：\`Option<Arc<Mutex<Book>>>\` を保持する。
- **\`precompiles/mod.rs\` に新しいモジュール関数を 3 つ**：\`install_clob\` / \`uninstall_clob\` / \`current_best_bid\`。
- **\`LiveRethEvmBridge\` のフィールド型を変更**：\`clob: Mutex<Book>\` を \`clob: Arc<Mutex<Book>>\` へ。\`new()\` の中で \`install_clob(clob.clone())\` を呼ぶ。

**\`read_best_bid\` の本体には手を加えない** — 引き続きハードコードの \`(100, 10)\` を返す。live state への差し替えは L5。L4 の仕事は、配管を**通せる状態にする**こと（実際に通すのはまだ先）。

## おさらい

L3 終了時点（Module 1 完了時点）：

- カスタム EVM precompile は登録済みで、呼び出しも検証済み。
- 全テスト（course 6 + 7 + L3 の新 4 件）が green。
- \`LiveRethEvmBridge::new()\` は \`clob: Mutex::new(Book::new())\` を作る — 誰とも共有していない所有。
- \`read_best_bid\` はハードコード。

**ブリッジと precompile はお互いの存在を知らない。** precompile はハードコード値を返し、ブリッジの CLOB は EVM 実行からは見えない。L4 ではこの 2 つを、プロセスグローバルなハンドルで繋ぐ。

## プラン

6 ステップ：

1. **\`Book\` に \`best_bid_with_qty\` と \`best_ask_with_qty\` を追加**。既存の \`best_bid()\` は価格だけを返すが、新メソッドは \`(price, summed_qty_at_that_level)\` — その価格レベルの FIFO キュー内にある数量の合計 — を返す。precompile が 2 値レスポンスを返すために必要だ。
2. **\`precompiles/mod.rs\` の import を更新** — \`openhl_clob::Book\` と \`std::sync::{Arc, Mutex, RwLock}\` を追加する。
3. **モジュールレベルの \`static CLOB_STATE\` を追加** — \`RwLock<Option<Arc<Mutex<Book>>>>\`。\`Mutex\` ではなく \`RwLock\` にするのは、precompile からの read が install からの write より圧倒的に多いから。
4. **モジュール関数を 3 つ追加** — \`pub fn install_clob(...)\` / \`pub fn uninstall_clob()\` / \`pub fn current_best_bid() -> Option<...>\`。ブリッジから呼べるよう public にする。
5. **ブリッジの \`clob\` フィールド型を \`Mutex<Book>\` から \`Arc<Mutex<Book>>\` に変更**。\`new()\` で \`install_clob(clob.clone())\` を呼び、precompile がブリッジと同じ \`Book\` を見るようにする。
6. **\`read_best_bid\` には触らない** — 引き続きハードコード値を返す。\`current_best_bid()\` への差し替えは L5。

L4 を終えた時点で、ブリッジと precompile の間の**配線は存在する**が、**まだ電流は流れていない**。precompile は live な CLOB を無視したままだ。実際に読みに行くのは L5。

> 🛑 **考えてみよう。** スクロールする前に考えてみてほしい — REVM の \`PrecompileFn\` は \`fn(&[u8], u64, u64) -> PrecompileResult\` で、**関数ポインタ**であって \`Fn\` クロージャではない。つまり環境をキャプチャできない（\`move |...| { ... }\` が書けない）。**だとすれば、precompile にインスタンスごとの state を渡す唯一の方法は何か?** ヒント：「引数として渡せない関数間で、可変な共有 state を扱う」ための Rust の定石パターンを 2 つ思い浮かべる。

（答え：プロセスグローバルな storage。\`Arc<Mutex<Book>>\` を precompile 関数に**引数として渡す**ことはできない — 関数ポインタのシグネチャは固定だから。なので precompile は \`static\` 変数からその共有 state を読む。ブリッジが \`install_clob\` で static に書き込み、precompile が \`current_best_bid()\` で読む。これは関数ポインタのシグネチャがクロージャキャプチャを許さないときの定石だ。**トレードオフ：プロセスあたり CLOB は 1 つに固定される。** 単一バリデータの openhl ではこれで十分受け入れられる。将来 REVM 側で関数ポインタの制約が緩めば、別の手も取れるようになるかもしれない。）

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

既存の \`best_bid()\` は \`Option<Price>\` だけを返す。新メソッドはその価格に加えて **そのレベルに rest している数量の合計** — best price の FIFO キュー内にある全注文の数量を足し上げたもの — を返す。

これが precompile が必要とする形だ。Solidity 側の戻り値シグネチャは \`(price: u256, qty: u256)\`。precompile は 64-byte レスポンスを埋めるために両方の値を必要とする。

> 🛑 **やりがちな勘違い。** 「\`best_bid()\` と \`depth_bid()\` を precompile から別々に呼べば済むのでは?」 — **\`depth_bid()\` が返すのは全 bid にわたる注文の本数で、best level の qty ではない。** 別のメトリクスだ。\`best_bid_with_qty()\` こそが precompile の契約 — 「最良価格はいくらで、その価格にどれだけ流動性があるか」 — に合致した形になる。

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

新しく入ってくる型は次のとおり：
- **\`Book\`** — 共有するマッチングエンジンの state。
- **\`Arc\`** — atomic な参照カウント付きハンドル。ブリッジと precompile が 1 つずつ保持する。
- **\`Mutex\`** — \`Book\` 本体を守る（course 7 のブリッジパターン）。
- **\`RwLock\`** — \`Option<...>\`（共有する \`Arc<Mutex<Book>>\` のラッパ）を守る。**read（precompile 呼び出しのたび）は write（プロセスあたり 1 回の install）より圧倒的に多い** ので、\`RwLock\` で並行 read を許容する。

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

1 行に多くが詰まっている：

- **\`static CLOB_STATE\`** — プロセスグローバル。プログラムのライフタイム全体にわたって生きる。
- **\`RwLock<...>\`** — 外側のロック。「CLOB がインストールされているか?」と「CLOB の中身は?」を分離する。
- **\`Option<...>\`** — ブリッジが CLOB を install する前は \`None\`、install 後は \`Some(Arc<Mutex<Book>>)\`。
- **\`Arc<Mutex<Book>>\`** — 共有ハンドル。Arc はブリッジが 1 つ、この static が 1 つ持つ。ブリッジが \`Book\` を変更すれば（\`clob.lock().submit(...)\`）、その変更は precompile からも見える（\`clob.lock().best_bid_with_qty()\`）。
- **\`RwLock::new(None)\`** — \`const fn\` なのでコンパイル時に評価される。実行時の初期化レースはそもそも発生し得ない。

ドキュメントコメントが本レッスンの肝 — \`None\` は「未インストール」状態を表し、エラーではなく zero bytes を返すことを明示している。メインネットで未初期化の perp market を読む契約はゼロ値を見る — その挙動と揃える。

> 🛑 **やりがちな勘違い。** 「\`lazy_static!\` や \`OnceLock\` を使えばいいのでは?」 — **使えるが、制約が強すぎる。** \`OnceLock\` は 1 回しか set できない — だがこちらでは、テスト分離のために \`install_clob\` を何度も呼び直せるようにしたい。\`lazy_static!\` は unsafe な初期化トリックが必要 — Rust 1.63 以降の \`static RwLock<...> = RwLock::new(None)\` ならそれが不要になる。素の \`static RwLock<...>\` が 2024 年時点で最もクリーンなイディオムだ。

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

- **\`install_clob\`** — ブリッジが \`new()\` から呼ぶ。直前の install を**置き換える** — 同じ Arc で 2 回呼んでも idempotent。\`*CLOB_STATE.write().expect(...) = Some(clob)\` は「write lock を取る → 値を set → release」の典型イディオム。
- **\`uninstall_clob\`** — 主にテスト用。テストの setup で install、teardown で uninstall。production で呼ぶことは稀。
- **\`current_best_bid\`** — EVM を経由せず直接テストできるよう露出させる。流れは write lock → read lock → option を deref → mutex を lock → \`best_bid_with_qty()\`。**ロックを 3 段**通って 1 つの値を読む — コストが高そうに見えるが各々マイクロ秒単位で、しかも read は \`RwLock\` の下で並行に走れる。

> 🛑 **やりがちな勘違い。** 「1 回の read に 3 つもロックを取るのは無駄では?」 — **3 つのロックはそれぞれ別の目的を持っている。** \`RwLock\` は installed か uninstalled かを分離する（write 競合は稀）。\`Mutex<Book>\` はマッチングエンジンの state を守る（write 競合は頻繁だがミリ秒単位）。1 つのロックに統合してしまうと、全 read と write がそのロックで一様に直列化される — 並行性は遥かに悪化する。**多層のロックは多層の関心事を反映している。**

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

変更は 3 点：

1. **\`let clob = Arc::new(...)\`** — Arc をローカルに束縛する。\`install_clob\` 用と struct 内用で 2 回使うため。
2. **\`crate::precompiles::install_clob(Arc::clone(&clob))\`** — precompile モジュールと Arc を共有する。**\`Arc::clone(&clob)\` で refcount がインクリメントされる** — ブリッジと static の両方が強参照を保持する形になる。
3. **struct リテラル内では \`clob,\` のみ** — フィールド名とローカル名が同じなので shorthand が効く。

\`precompiles\` は \`crates/evm/\` の private モジュールだが、\`install_clob\` は \`pub fn\` なので、crate 内からなら \`crate::precompiles::install_clob\` で呼べる。

### Step 6: 他に壊れた箇所がないか確認

\`live_node.rs\` の他のコードが \`clob: Mutex<Book>\` を前提に書かれていないかを確認する — どこも \`Arc<Mutex<Book>>\` 前提で問題ないはず。\`self.clob.lock()\` の呼び出しを探してみる。問題なく動く — \`Arc<Mutex<Book>>\` は \`Mutex<Book>\` への deref coercion が効くので、\`self.clob.lock()\` のままで構わない。

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

L3 のテストはすべて green のまま。注意：**L3 の unit test は依然としてハードコード値**（\`U256::from(100u64)\` / \`U256::from(10u64)\`）**を期待している**。まだ \`read_best_bid\` を変更していないからだ。配管は通したが、\`read_best_bid\` を流れる値はまだハードコードのまま。

配管が実際に効いているか sanity check したい場合は（L5 で本体を差し替える前に）、使い捨てのテストを書いてもよい：

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

実行：\`cargo test -p openhl-evm current_best_bid_reflects_installed_clob\`。通るはずだ。**確認できたら消す** — L5 以降で本物のテストセットを揃える。

よくあるエラーと対処：

- **\`error[E0277]: 'Arc<Mutex<Book>>' is not 'Mutex'\`** — \`submit_order\` の \`self.clob.lock()\` がコンパイラに弾かれている。実は動くはず — \`Arc<Mutex<Book>>\` は \`&Mutex<Book>\` に deref する。このエラーが出るなら、どこかで \`self.clob.deref().lock()\` を書いている可能性 — それは間違った形。\`self.clob.lock()\` だけが正しい。
- **\`error[E0277]: 'PoisonError<RwLockWriteGuard<Option<Arc<Mutex<Book>>>>>' is not 'Send'\`** — テストや呼び出し側で poisoned lock が panic している。\`.expect(...)\` は標準パターン。これが見えるならどこかでロック保持中の panic が起きている。
- **Static initialization warning** — Rust 1.63+ は \`static RwLock<T> = RwLock::new(...)\` を直接サポート。「calls in static contexts are unstable」が見えるなら toolchain が古い — L0 の前提を確認。
- **\`unused variable: clob\` in \`new()\`** — struct リテラル内で \`clob\` を使い忘れている。\`let clob = Arc::new(...)\` で束縛した変数は struct 内に \`clob,\` として登場する必要がある。

## 設計の振り返り

ここに焼き込んだ重要な決定が 3 つ：

1. **関数ポインタのシグネチャ制約に対する定石は process-global な state。** REVM の \`PrecompileFn = fn(...) -> PrecompileResult\` は関数ポインタであってクロージャではないので、state をキャプチャできない。選択肢は (a) 関数引数として受け取る（REVM API の変更が必要）、(b) process-global から読む — のどちらか。今回は (b) を取った。**コストはプロセスあたり CLOB が 1 つになること。** 単一バリデータの deployment なら問題ないが、マルチテナントには REVM API の変更が必要だ。

2. **外側の Option には \`RwLock\`、内側の \`Book\` には \`Mutex\`。** 外側のロックは installed か uninstalled かを分離する（write は稀）。内側のロックはマッチングエンジンの state を守る（write は submit のたびに発生して頻繁）。アクセスパターンが違えばロックの型も変える。1 つの \`Mutex<Option<Arc<Mutex<Book>>>>\` に統合してしまうと、すべての read が 1 つのボトルネックを通ることになる。

3. **\`install_clob\` は黙って置き換える設計で、エラーにはしない。** 別の CLOB で 2 回呼ばれた場合、最初のものを黙って置き換える。検知して panic させる手もあるが、production パスでは 1 回しか呼ばれない一方で、テストは install/uninstall を繰り返す。**置き換え挙動はテストにとってバグではなく機能だ。** ドキュメントコメントで明示してある。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

L4 を終えた時点では、あなたのコードは Stage 9b に**部分的に**一致する：新メソッド、static、関数 3 つ、ブリッジのフィールド変更まで。残る差分は：
- \`read_best_bid\` がまだハードコードのまま（差し替えは L5）。
- L3 の unit test がまだハードコード値を期待している（更新は L5）。

main に戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`CLOB_STATE\` は \`&'static\` なのか? ヒープ割り当てではダメか?**
static storage はもっともシンプルなライフタイム — プログラム開始から終了まで生きる。ヒープ割り当て（\`Box::leak\` など）でも動くが、ランタイムの allocation コストと複雑さが増える。「プログラム開始から終了までずっと存在してほしい」というケース — まさに今回 — では \`static\` が正しい道具だ。

**Q: 並行テストなどで \`LiveRethEvmBridge\` が 2 個作られたら?**
2 回目の \`install_clob\` が 1 回目を置き換える。**結果として両方のブリッジが、global 経由で 2 つ目の CLOB を共有することになる。** だからテストでは直列化が必要だ（L5 で導入する）。production deployment ではブリッジを 1 つしか作らないので、問題にはならない。

**Q: \`current_best_bid\` は \`Option<...>\` ではなく \`Result<...>\` を返してもいい?**
できる — \`None\` の代わりに \`Err(NoClobInstalled)\` を返すこともできる。だが precompile としては「CLOB 未インストール」と「CLOB はあるが空」を区別する必要がない — どちらの場合もゼロを返すべきだからだ。\`Option\` ならその 2 ケースを \`None\` に潰せる。\`Result\` にすると precompile に余計な分岐を強いることになり、利得はない。

**Q: \`current_best_bid\` の中で \`book.lock()\` が panic したら?**
\`.expect("clob mutex poisoned")\` が panic し、\`current_best_bid\` → \`read_best_bid\` → REVM の dispatch まで伝播する。REVM はこれを致命的な precompile エラーとして扱い、EVM を halt させる（おそらく transaction 全体を revert する）。**これが正しい挙動だ** — poisoned な Mutex は、別のスレッドがロックを保持したまま crash したことを意味する。不整合な state で走り続けるくらいなら abort するほうがましだ。

## 次のレッスン（L5）

配線は通したが、precompile はまだそれを無視している。L5 では \`read_best_bid\` の本体を \`current_best_bid()\` 呼び出しに差し替える。L3 のテストは、CLOB 未インストール時に zero output を期待する形に更新する。並行テストが global state で競合しないよう、\`TEST_SERIALIZER\` を導入する。L5 を終えると \`read_best_bid\` は live な state を読むようになる — ただし、ラウンドトリップを実行するテストは、自分でインラインに書く smoke test だけだ。L6 でラウンドトリップテストを正式に追加する。`,
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

上記の実行結果が引き続き通る（42 tests）。ただし内部では、precompile が **live state を読む** ようになっている — ハードコード値ではなく：

- **\`read_best_bid\` の本体を差し替える** — \`let mut out = vec![0, 0, ..., 100, 0, 0, ..., 10]\` のハードコードを捨て、\`if let Some((price, qty)) = current_best_bid() { ... out に書き込む ... }\` に変える。CLOB 未インストールなら 64-byte の zero を返す（「未初期化 perp market」のセマンティクスに合わせる）。
- **L3 の \`read_best_bid_returns_hardcoded_price_and_qty\` テストを rename** して \`read_best_bid_returns_zero_when_no_clob_installed\` に。形は同じだが、100/10 ではなく zero を assert する。
- **L3 の \`registered_precompile_is_invokable_via_registry\` を更新** — ロジックは同じだが、まず CLOB を uninstall してから zero output を期待する形にする。
- **テストモジュールの先頭に \`static TEST_SERIALIZER: Mutex<()>\` を新規追加** — \`CLOB_STATE\` を触るテストは、まずこのロックを取る。並列 \`cargo test\` だと global で競合するからだ。

course 7 と L3 の callability テストは引き続き通る。assertion だけが変わる。**大きな証明 — 「live な CLOB データが EVM の出力までラウンドトリップする」 — は L6 の仕事。** L5 は差し替えにとどめ、L6 で end-to-end の挙動を実証する。

## おさらい

L4 終了時点の状態：

- \`Book\` に \`best_bid_with_qty\` / \`best_ask_with_qty\` を追加済み。
- \`precompiles/mod.rs\` に \`CLOB_STATE\` static とモジュール関数 3 つがある。
- \`LiveRethEvmBridge::new\` が \`install_clob(Arc::clone(&clob))\` を呼ぶ。
- **にもかかわらず \`read_best_bid\` はまだハードコードの \`(100, 10)\` を返している** — 配管は誰も使っていない。

L5 でようやくその配管を使う。

## プラン

\`crates/evm/src/precompiles/mod.rs\` に対する編集が 4 つ：

1. **\`read_best_bid\` の本体を差し替え** — \`current_best_bid()\` を呼び、\`Some\` のときだけ非ゼロのバイトを書き込む。
2. **関数のドキュメントコメントを更新** — ハードコード前提の記述を消し、「bid なし、または CLOB 未インストールなら 0」というセマンティクスに置き換える。
3. **テストモジュールに \`static TEST_SERIALIZER: Mutex<()>\` を追加する。**
4. **L3 の最初のテストを rename + 書き換え** し、**L3 の最後のテストを更新** する — どちらも \`CLOB_STATE\` を触るので、両方とも serializer ロックを取り、まず \`uninstall_clob()\` を呼ぶようにする。

モジュールレベルのシグネチャは変わらない。registry テスト（\`openhl_precompiles_registers_clob_address\`）は \`CLOB_STATE\` を触らないので、そのままにしておく。

> 🛑 **考えてみよう。** スクロールする前に — \`cargo test\` はデフォルトで **並列実行** される（典型的には論理 CPU 1 つにつき 1 スレッド）。今あるテストのうち 2 つが \`CLOB_STATE\` を read/write する。**直列化しなかった場合、どんな失敗モードが出るか?** ヒント：あるテストが \`None\` を期待している瞬間に、\`Some(clob_A)\` が一瞬だけ見えてしまう、という状況を想像してみる。

（答え：**flaky test になる**。テスト A が CLOB を install し、テスト B が「CLOB なし → zero output」を assert したい — だが B が、A の \`install_clob\` と \`uninstall_clob\` の間に走ってしまえば、B は A の CLOB を見て間違った値を assert することになる。失敗率はテストのスケジューリング次第で、0% のこともあれば 30% のこともある。CI がランダムに flake する。\`TEST_SERIALIZER\` の mutex パターンは、これらのテストを 1 つずつ走らせて race を排除する。**コストは 0.0 秒（これらのテストはマイクロ秒で終わる）、利得は deterministic な CI。**）

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

変化は次のとおり：

- **\`let mut out = vec![0u8; 64]\`** — 出発点は同じく全ゼロ。
- **\`if let Some((price, qty)) = current_best_bid()\`** — global を read する。\`None\` ならボディを short-circuit し、\`out\` は zero のままにする。
- **\`out[24..32].copy_from_slice(&price.0.to_be_bytes())\`** — \`Price\` は \`u64\` のラップ型。\`to_be_bytes()\` は \`[u8; 8]\` を返す。その 8 バイトを 32-byte word の **最後の 8 バイト**（position 24..32）にコピーする。先頭 24 バイトはゼロ — これが u64 値の big-endian u256 エンコーディング。
- **qty も同様に \`out[56..64]\` へ** — 2 つ目の 32-byte word の最後の 8 バイト。
- **ハードコードの \`out[31] = 100\` と \`out[63] = 10\` は消える。**

> 🛑 **やりがちな勘違い。** 「明快さのために \`U256::from(price.0).to_be_bytes::<32>().copy_from_slice(...)\` でいいのでは?」 — それだと **一時的な \`[u8; 32]\` を allocate してから byte-by-byte でコピー** することになる。直接 \`out[24..32].copy_from_slice(&price.0.to_be_bytes())\` と書けば、output buffer に直接書き込んで中間 allocation を挟まない。**結果は同じだが、仕事は半分。** precompile は hot path で、マイクロ秒の積み重ねが効いてくる。

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

「0 if no bid or no CLOB installed」が肝 — メインネットのコントラクトが対応しなければならない API 契約を明文化している。**スマートコントラクトからは「未インストール」と「empty book」を見分けられない** — どちらも zero を返す。これは意図的だ。区別したい場合は、別の経路で liveness をチェックすればよい。

### Step 3: テストモジュールに \`TEST_SERIALIZER\` を追加

\`#[cfg(test)] mod tests\` ブロック（L3 で追加した）を開く。\`use\` 文の後、テスト関数の前に：

\`\`\`rust
/// Tests in this module touch process-global \`CLOB_STATE\`. This mutex
/// serializes them so parallel test execution can't observe a torn state.
static TEST_SERIALIZER: Mutex<()> = Mutex::new(());
\`\`\`

1 行で済む。素の \`Mutex<()>\` だ（payload は unit 型 — 中身の値は見ず、ロックだけが目的）。\`CLOB_STATE\` を触る各テストは、冒頭で次のように書く：

\`\`\`rust
let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
\`\`\`

\`unwrap_or_else(PoisonError::into_inner)\` パターンが **死活問題** だ — これがないと、テストが 1 つ panic しただけで mutex が poison し、以降の全テストが \`PoisonError\` で落ちる。poison から復旧することで「このテストは 1 度 panic した」を「このテストは 1 度 panic したが、後続は走る」に変える。復旧したガードもちゃんと排他アクセスを与えてくれる。poison はシグナルであって、永久の障害ではない。

> 🛑 **やりがちな勘違い。** 「\`serial_test\` crate の \`#[serial]\` でいいのでは?」 — **使えるが、mutex 1 つで済む話に対して dev-dep を増やすことになる。** \`serial_test\` は proc-macro、属性のパース、hash-keyed な lock map に手を出す。global を 1 つ触るテスト 4 つに対しては、1 行の \`static Mutex<()>\` がちょうどよい。**複数の global を別々のロック partition で管理したくなったら crate を導入すればよい — それ以前にやる必要はない。**

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

L3 との差分は 5 つ：

1. **Rename** — 関数名が新しいセマンティクスを表すように変える。
2. **doc コメントの書き換え** — 「uninstalled = zero」のセマンティクスを説明する。
3. **1 行目で \`TEST_SERIALIZER\` を取得する。**
4. **2 行目で \`uninstall_clob()\` を呼ぶ。** なぜか? 前のテストが CLOB を install したまま clean up し忘れている、あるいは前回の test run の state が残っている、という可能性があるからだ。\`uninstall_clob()\` は idempotent なので常に呼んで安全で、既知の出発状態を保証してくれる。
5. **assertion の変更** — \`U256::from(100u64)\` / \`U256::from(10u64)\` ではなく \`U256::ZERO\`。gas check はそのまま（何を返そうと precompile は同じ gas を課金する）。

> 🛑 **やりがちな勘違い。** 「すでに未インストールなら、毎回 \`uninstall_clob()\` を呼ぶのは無駄なのでは?」 — **\`uninstall_clob\` の実体は \`*CLOB_STATE.write().expect(...) = None\`** だ。lock を 1 回取って戻すだけ、マイクロ秒の話だ。代替案は、初期化順を共有する global な「test setup」関数を作ること — 労力ばかり大きく、節約はわずかだ。**global state を扱うときの Rust テストの定石は「test ごとに明示的にリセットする」こと。**

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

L3 との差分は 3 つ：

1. **冒頭で \`TEST_SERIALIZER\` を取って \`uninstall_clob\` を呼ぶ** — 1 つ目のテストと同じパターン。
2. **doc コメントを追加**（L3 にはなかった）。なぜこのテストが unit test と並んで存在するのかを説明する。
3. **\`assert_eq!(price, U256::ZERO)\`** — \`U256::from(100u64)\` から変更する。

真ん中のテスト（\`openhl_precompiles_registers_clob_address\`）は \`CLOB_STATE\` を触らない — registry membership をチェックするだけだ。**serializer や uninstall を加えてはいけない** — 不要な直列化で、地味に遅くなるだけだ。

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

テスト数は L4 と同じ 42 個。違いは次のとおり：
- precompile を触る 4 つのテストのうち 2 つが、\`TEST_SERIALIZER\` 経由で **直列化** される。
- 修正済みの 2 つのテストは \`(100, 10)\` ではなく **zero output** を assert する。

serializer が何を防いでいるかを体感したいなら：

\`\`\`bash
# 一時的に両テストから \`let _g = TEST_SERIALIZER.lock()...\` の行を削除。
cargo test -p openhl-evm read_best_bid -- --test-threads=8
# 20 回ぐらい走らせる。
for i in $(seq 1 20); do
  cargo test -p openhl-evm read_best_bid -- --test-threads=8 --quiet 2>&1 | grep "test result"
done
\`\`\`

スケジューリング次第で、時々失敗するはず。確認できたら元に戻す。

よくあるエラーと対処：

- **\`unused import: Order, OrderId, OrderType, Side\`** — L3 のハードコードテストでは使っていたが、L5 の zero-output テストでは要らない。**残しておくこと** — L6 の live-state テストで使う。1 レッスンぶんの unused warning は無害だ。
  - \`#[cfg(test)] mod tests\` に \`use openhl_clob::{...};\` がまとめて入っていれば、そのまま残す。L6 で必要になる。
- **\`error[E0599]: no method named 'lock' found for struct 'Mutex<()>'\`** — \`Mutex\` を別の場所（たとえば \`tokio::sync::Mutex\`）から import している。テストモジュールの \`use super::*;\` で、親モジュールから \`std::sync::Mutex\` が入ってくるはずだ。
- **1 回通ったあとに \`PoisonError\` で失敗** — どこかのテストが \`TEST_SERIALIZER\` を保持したまま panic した。\`unwrap_or_else(PoisonError::into_inner)\` パターンが復旧してくれる。両テストでこの形になっているか確認する。
- **個別なら通るが、並列だと落ちる** — \`TEST_SERIALIZER\` が実際には効いていない。\`let _g = TEST_SERIALIZER.lock().unwrap_or_else(...)\` が **最初の文** （\`uninstall_clob()\` の前）にあることを確認する。\`_g\` が途中で drop されてしまうと（たとえば shadow されると）、テストの途中でロックが解放されてしまう。

## 設計の振り返り

ここに焼き込んだ重要な決定が 3 つ：

1. **CLOB 未インストール時は zero を返し、エラーにはしない。** メインネット相当の挙動は「未初期化 storage slot は zero を返す」だ — Solidity コントラクトはこれを自然に処理してくれる。エラーにしてしまうと、bootstrap 中（ブリッジが CLOB を install する前）に precompile が呼ばれたときに transaction が revert してしまう。zero を返せば gracefully に degrade する — コントラクトは「流動性なし」と判断して trade を控える。これが正しい挙動だ。

2. **\`TEST_SERIALIZER\` はモジュール単位にとどめ、global にはしない。** \`CLOB_STATE\` を触らない \`live_node.rs\` のテストは、これと直列化すべきではない。モジュールローカルな mutex で、partition を狭く保つ。

3. **テストの先頭で \`uninstall_clob()\` を呼ぶ — 末尾ではなく。** 対称的にしないのはなぜか? **panic したテストは cleanup コードを走らせないから** だ。テスト中に panic すると、CLOB は install されたまま残る。次のテストの「テスト開始時のリセット」がそれを拾う。L6 の live-state テストでは末尾でも uninstall するが、それは明快さのためであって、安全網は「テスト開始時のリセット」のほうだ。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

L5 を終えた時点で、あなたのコードは Stage 9b に **かなり近い** — \`read_best_bid\` の本体も、\`TEST_SERIALIZER\` も、更新済みの 2 つのテストも揃っている。残る差分は、Stage 9b にある \`read_best_bid_returns_live_state_when_clob_installed\` だ — これは L6 で追加する。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: CLOB 未インストール時に \`read_best_bid\` の gas を減らさないのはなぜ?**
条件分岐で \`current_best_bid()\` が \`None\` のときに少ない gas を返す、という設計もありうる。だがそれは実装詳細を漏らす — 攻撃者は gas 消費量を計測することで、validator が CLOB を install したかどうかを判別できてしまう。一律で \`CLOB_BASE_GAS_COST\` を課金するのが、定石の「constant-time precompile」パターンだ。**gas 課金から state を漏らしてはいけない。**

**Q: \`u64::to_be_bytes()\` と \`U256::to_be_bytes::<32>()\` の違いは?**
\`u64::to_be_bytes()\` は \`[u8; 8]\` — 8 バイトを返す。\`U256::to_be_bytes::<32>()\` は \`[u8; 32]\` — 左を zero パディングした 32 バイトを返す。**今回のように、source が 8 バイトの値で destination が 32 バイトの場合、source の 8 バイトを destination の右端 8 バイトにコピーしたい。** それを実現するのが \`out[24..32].copy_from_slice(&u64_bytes)\` だ。U256 版を使うと 32 バイトすべて（うち 24 バイトは zero）をコピーすることになる — 同じ結果に 4 倍の仕事をかけている。

**Q: \`TEST_SERIALIZER\` があっても flake することはあるか?**
通常の \`cargo test\` 実行ではしない。Mutex が、2 つのテストスレッドから \`CLOB_STATE\` の途中状態を観測することを防いでくれる。それでも flake しうるエッジケース：(a) \`current_best_bid\` の中で panic して mutex が poison する（\`into_inner\` で復旧する）、(b) テストモジュール外のコードが \`CLOB_STATE\` に書き込む（\`reth_node.rs\` の integration test がいずれそれをやり始めたら問題になるが、今はやっていない）。

**Q: precompile の input bytes を経由して CLOB を渡せばいいだけでは?**
スマートコントラクトは \`staticcall(gas, addr, input, output)\` で precompile を呼ぶ。input はコントラクト側が組み立てた calldata だ — **ノードオペレータが** CLOB のポインタを差し込む手段はない。precompile の input bytes は user-controlled であって node-controlled ではないからだ。process-global な state こそが、ノードオペレータに残された唯一の注入点になる。

## 次のレッスン（L6）

配線は通ったが、ラウンドトリップを exercise するテストはまだない。L6 で \`read_best_bid_returns_live_state_when_clob_installed\` を追加する：既知の bid を持つ CLOB を install し、precompile を呼び、その bid が output bytes までラウンドトリップしてくることを検証する。これにより \`Solidity contract → STATICCALL → EVM dispatch → REVM precompile registry → 自分の関数 → live な Book lock → エンコードして返す → コントラクトが本物のデータを見る\` というチェーンが、ついに end-to-end で実証される。これが **Module 2 のマイルストーン** だ。`,
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

上記の実行結果が 43 tests を通る（1 つ新規）。新しいテストは \`read_best_bid_returns_live_state_when_clob_installed\`。ここまで全テストが寸止めにしてきたことを、ついにやる：**既知の bid を持つ CLOB を install し、precompile を呼び、出力 bytes がその bid の price と qty を encode していることを観測する。**

これがマイルストーンだ。フルチェーン — \`CLOB に bid を発注 → ブリッジが Mutex 経由で書き込み → precompile が global 経由で read → 64-byte の ABI に encode → 呼び出し元に返す\` — がついに end-to-end で exercise される。L6 後：

- Module 2 (Read precompile) **完了**：\`STATICCALL(0x...0c1b)\` を発行する Solidity コントラクトが、live な CLOB state を受け取れる。
- パターン（precompile が global Arc から read する）が証明されたので、今後の stage で別の read precompile（best_ask、depth、mid-price など）に複製できる。
- Module 3 (Write precompile、L7-L9) は同じインフラの上に、逆方向で構築する：precompile が CLOB state に **書く** ようにする。

## おさらい

L5 終了時点の状態：

- \`read_best_bid\` が \`current_best_bid()\` を呼ぶようになっている（live パス）。
- L3 の 2 テストが **未インストール時のセマンティクス** を assert している — CLOB なしなら zero output。
- \`TEST_SERIALIZER\` も配置済み。
- **だが、空でない CLOB を install して、値がラウンドトリップで流れてくることを観測するテストが 1 つもない。** 配線は通したが、まだ計測していない。

L6 でその配線を計測する。

## プラン

\`crates/evm/src/precompiles/mod.rs\` の \`#[cfg(test)] mod tests\` ブロック内に 1 つの編集：新しい test 関数を追加。

以上。プロダクションコードへの変更はゼロ。**L6 は純粋にテストを追加するだけ** — そしてそれがこのコースで最も重要なテストになる。

テストの構造：

1. **セットアップ** — \`TEST_SERIALIZER\` を取得する（最初に \`uninstall_clob()\` は呼ばない。すぐ自分の CLOB を install するからだ）。
2. **Book を構築** — \`Arc::new(Mutex::new(Book::new()))\`。
3. **bid を 2 つ rest させる** — 1 つは price 250 qty 7（こちらが best になる）、もう 1 つは price 240 qty 99（価格が低いので、いくら qty が大きくても **選ばれてはならない**）。
4. **CLOB を install** — \`install_clob(book)\`。
5. **precompile を直接呼ぶ** — \`read_best_bid(&[], 100_000, 0)\`。
6. **decode + assert** — price=250（240 ではなく）、qty=7（99 ではなく — wrong level の大きな qty が罠）。
7. **後始末** — 末尾で \`uninstall_clob()\` を呼ぶ（安全のためというより、明快さのため）。

> 🛑 **考えてみよう。** スクロールする前に — 2 つの bid を持つ Book を install する。\`(price=250, qty=7)\` と \`(price=240, qty=99)\` だ。**\`read_best_bid\` は何を返すか?** 正しく答えられれば、マッチングエンジンの「最良価格優先」の不変条件をつかんでいる。間違えれば、テストがその誤解を捕まえる。

（答え：\`price=250, qty=7\`。**「Best bid」 = 最高価格、であって最大数量ではない。** qty=99 の order はより悪い価格（240）に置かれており、best-bid 応答の候補にすら入らない。これは古典的な order-book の不変条件だ：価格レベル内では price-time priority、レベル間では price priority。初心者ほど「best = most liquidity」と勘違いしがちだが、それは間違い。**Best bid とは、market sell が最初にぶつかる先のこと。** market sell は最高価格を提示している 250-bid に最初にぶつかり、250 レベルを使い切ってから 240 に下りる。）

## 手順

\`crates/evm/src/precompiles/mod.rs\` を開く。既存の \`#[cfg(test)] mod tests\` ブロックを探す。

テストモジュールの先頭の import に \`Order, OrderId, AccountId, OrderType, Price, Qty, Side\` が含まれていることを確認する（L5 を通して、まさにこのレッスンのために残しておいたものだ）：

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

\`Order\` / \`OrderId\` / \`AccountId\` / \`OrderType\` / \`Price\` / \`Qty\` / \`Side\` のどれかが欠けていれば追加する。

ではテスト本体を追加する。配置場所のベストは、L5 の \`read_best_bid_returns_zero_when_no_clob_installed\` テストと \`openhl_precompiles_registers_clob_address\` テストの間：

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

7 つの部品を順に見ていく。

### Step 1: ドキュメントコメント

\`\`\`rust
    /// **Stage 9b end-to-end**: install a CLOB with a known bid, call the
    /// precompile, observe the live data flow through to the EVM-visible
    /// response. This is the moment custom EVM execution reads real
    /// orderbook state.
\`\`\`

太字の「Stage 9b end-to-end」は意図的なフラグだ。マイルストーンテストを grep で探す人が、これを見つけられる。コードベースを読む将来のエンジニアには、「これは feature 全体の証明だ」と見えてほしい — 「ただの unit test」ではなく。

### Step 2: serializer を取得

\`\`\`rust
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
\`\`\`

L5 の 2 つのテストと同じパターン。**ここでは \`uninstall_clob()\` を呼ばない** — どうせ自分の CLOB を install するからだ。現在何が install されていようと、\`install_clob\` で原子的に置き換わる。serializer さえあれば十分。

### Step 3: Book を構築

\`\`\`rust
        let book = Arc::new(Mutex::new(Book::new()));
\`\`\`

\`Arc::new(Mutex::new(Book::new()))\` こそが \`install_clob\` の期待する形。Arc はこちらが 1 つ保持し、\`install_clob\` 後は global がもう 1 つ保持する形になる。

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

order は 1 つではなく 2 つ。2 つ目（\`240, qty=99\`）は **間違った実装をあぶり出す罠** だ：

- 「最大 qty の order を返す」素朴な実装は \`(240, 99)\` を返す。Fail。
- 「最初に submit された order を返す」素朴な実装は \`(250, 7)\` を返す。Pass する — ただし偶然。
- 「最後に submit された order を返す」素朴な実装は \`(240, 99)\` を返す。Fail。
- 「最高価格の price level の、合計 qty を返す」正しい実装は \`(250, 7)\` を返す。Pass。

\`(250, 7)\` の order 1 つだけなら、素朴な実装でもすべて pass してしまう。\`(240, 99)\` を加えることで、**正しさと偶然を切り分けられる**。**「Best は最高価格であって最大数量ではない」を証明するのに必要な最小の order 数は 2 つだ。**

> 🛑 **やりがちな勘違い。** 「Order ID と account ID を別々にする必要は? 使い回したほうが綺麗では?」 — **別の ID にしなければならない理由：\`submit()\` は \`OrderId\` をキーにインデックスする。** 2 つ目の order に \`OrderId(1)\` を使い回すと、submit が失敗するか、最初の order を黙って上書きする。ID を変えることが重要だ。account ID はこのテストでは飾りに近いが、現実のパターン（異なる trader、異なる order）を示唆している。

> 🛑 **やりがちな勘違い。** 「\`book.lock().unwrap().submit(...)\` を \`let mut book = book.lock().unwrap();\` と \`submit\` 2 回呼び出しに分けたほうが分かりやすいのでは?」 — **確かに分かりやすくなるし、ロックを 2 回ではなく 1 回しか取らない。** だがテストコードは「実行回数より読まれる回数のほうが多い」もの。各 \`submit\` を自己完結で明示的に保ちたい。**2 マイクロ秒のコストは目に見えないが、読みやすさの利得は大きい。** Hot path の production コードでは別のルール（1 回取得、1 回解放）が支配的になる。

### Step 5: Install + invoke

\`\`\`rust
        install_clob(book);

        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
\`\`\`

\`install_clob(book)\` のところで \`book\` を move していることに注目してほしい。**\`Arc::clone(&book)\` ではない** — install 後に \`book\` を使わないからだ。\`install_clob(Arc::clone(&book))\` と書いて \`book\` をその後使わないと、clippy が \`unused_variable\` を出す。move が正しい。

\`read_best_bid(&[], 100_000, 0)\` は直接呼び出すスタイル。registry 経由（\`registered_precompile_is_invokable_via_registry\` のように）でも呼べるが、registry のパスはすでに L5 で証明済みだ。**L6 の仕事は「live な CLOB が install されているとき、関数がそこから read することを証明する」こと。** 直接呼び出しのほうが、それをもっともクリーンに assert できる。

\`&[]\` の空 calldata にも意味がある：\`read_best_bid\` は input を無視する（「best bid は?」という問いにパラメータは不要）。100_000 gas は十分すぎる — \`CLOB_BASE_GAS_COST = 500\` であることは測定済み。

### Step 6: Decode + assert

\`\`\`rust
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(250u64), "best bid is the 250 order, not 240");
        assert_eq!(qty, U256::from(7u64), "qty at the best level is 7");
\`\`\`

\`from_be_slice\` デコーダは、L5 の Step 1 で使った \`to_be_bytes\` の逆だ。\`out[24..32]\` に 8 バイト書き込んでおき、デコーダ側は \`result.bytes[0..32]\` から 32 バイトを読む — 先頭 24 バイトはゼロ、続く 8 バイトが値、という形が同じ u64 にラウンドトリップしてくる。

assertion メッセージは **飾りではない**。素の \`assert_eq!(price, U256::from(250u64))\` だと、失敗時は \`left != right\` としか出ない — テストの意図は読み手に推測させることになる。「best bid is the 250 order, not 240」というメッセージなら、**どの概念的前提が違反されているかを即座に伝えられる**。**特にマイルストーンテストでは、assertion メッセージはドキュメントとしても機能する。**

### Step 7: Cleanup

\`\`\`rust
        uninstall_clob();
    }
\`\`\`

**このモジュール内で、末尾で明示的に uninstall するのはこのテストだけだ。** なぜか?

- L5 の 2 つの zero-output テストでは不要だった：開始時に \`uninstall_clob()\` を呼ぶので、どんな state が残っていても気にしないからだ。
- だがこのテストは、空でない CLOB を install したまま終わる。次のテストが同じ \`cargo test\` 実行内で（\`TEST_SERIALIZER\` の解放後に）「CLOB なし → zero」を assert する目的で走った場合、こちらが install した book を拾ってしまい fail する。

他のテストは **冒頭でも** \`uninstall_clob\` を呼んでいるので、技術的にはこの cleanup は冗長だ。**だが、空でない state を実際に install するテストで cleanup を明示しておくのは衛生的によい。** テストフレームワークの支援なしに、「Setup / Exercise / Verify / Teardown」というテスト規約をミラーリングしていることになる。

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

**この \`ok\` 行が Module 2 のマイルストーンだ。** カスタム EVM precompile が live なマッチングエンジンの state から read し、そのデータが EVM から見える出力 bytes までラウンドトリップしている。

よくあるエラーと対処：

- **\`assertion failed: left=240, right=250\`** — \`best_bid_with_qty()\` の実装が間違った level を返している。原因はおそらく、\`self.bids\` を価格優先順ではなく挿入順で iterate していることだ。L4 の実装を確認する — bids の \`BTreeMap\` は \`RevPrice\`（逆順ソートされた price）でキー付けされているので、\`.iter().next()\` で最高価格が得られる。\`.iter().next_back()\` と書いてしまっていたり、別のデータ構造を使っていたりした場合は修正する。
- **\`assertion failed: left=99, right=7\`** — \`best_bid_with_qty()\` は正しい価格を返したが、qty が違う。おそらく原因は、best level だけでなく全価格レベルにわたって sum していることだ。L4 のコードを再確認する：\`.map(|(rev_price, queue)| ...)\` のクロージャの中では、**\`queue.iter()\` だけ**（その 1 つの価格レベル内の order）を sum すべきで、\`self.bids.values().flatten()\`（全価格・全 order）ではない。
- **\`error[E0382]: borrow of moved value: 'book'\`** — \`install_clob(book)\` の後で \`book\` を使い直そうとしている。後続の使用を削除するか（不要なら）、\`install_clob(Arc::clone(&book))\` にする（理由があるとき — このテストでは不要）。
- **\`error[E0599]: no method named 'submit' found for...\`** — \`book.lock()\` は \`LockResult<MutexGuard<Book>>\` を返すので、\`book.lock().unwrap().submit(...)\` の形にする必要がある。典型的な原因は \`.unwrap()\` 忘れ。
- **個別なら通るが、並列で落ちる** — \`TEST_SERIALIZER\` ロックが実際には保持されていない。\`let _g = TEST_SERIALIZER.lock()...\` が最初の文になっているかを確認する。

## 設計の振り返り

立ち止まりたいポイントが 4 つ：

1. **正しさを偶然から切り分けるための最小データ形は order 2 つ。** 敵対的テストデータ — 間違った実装をあぶり出すために特別に設計された order — は、ランダムな 50 個の order より価値がある。敵対的な値はそれぞれ 1 クラスのバグの対価を払う。

2. **「関数を直接呼ぶ」と「registry 経由で dispatch する」を分けるのは意図的なテスト分割。** L5 の \`registered_precompile_is_invokable_via_registry\` は、dispatch テーブル経由で関数に到達可能なことを証明する。L6 は、その関数が live な state を読むことを証明する。分けておくと、片方の失敗がもう片方を覆い隠さない。**dispatch + behavior + state を 1 つの assertion に束ねたテストは、失敗したときデバッグが格段に難しくなる。**

3. **assertion メッセージは将来のメンテナ宛のドキュメント。** 「best bid is the 250 order, not 240」というメッセージは、失敗を読んだ次のエンジニアに「どの概念的前提が破られたか」を正確に伝える。素の \`assert_eq!(price, U256::from(250u64))\` だと出力は \`left=240 right=250\` 止まり — 真ではあるが、テストの意図を読み解き直す必要がある。

4. **1 度に 1 つだけ変える。** L6 ではプロダクションコードの変更はゼロ。Module 2 (L4-L6) の全体の流れは「配管（挙動変化なし）→ 差し替え（挙動は変わるが新挙動のテストはなし）→ exercise（新挙動をテスト）」だ。各レッスンには *1 つだけ* 学ぶことと、*1 つだけ* 検証することがある。混ぜると — たとえば「差し替え + テスト」を 1 つのレッスンに詰めると — 途中で何かが壊れたときに、デバッグが遥かに難しくなる。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

L6 を終えた時点で、\`precompiles/mod.rs\` は Stage 9b と **バイト単位で同一** になるはず（自分でドキュメントコメントの言い回しを変えていない限り）。これが Stage 9b の終わり — \`git diff b635ef7 -- crates/evm\` は空になる。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`Precompile::execute\` 経由ではなく、\`read_best_bid\` を直接呼ぶのはなぜ?**
どちらのパスでも動く。直接呼ぶ（\`read_best_bid(...)\`）と関数を単独でテストすることになり、registry のパス（\`precompile.execute(...)\`）だと dispatch をテストすることになる。**dispatch はすでに L5 の 3 つ目のテストで証明済み** だ。L6 で証明したいのは「挙動が global から read していること」なので、直接呼び出しでテストを 1 つの assertion に絞り込む。

**Q: \`submit\` が失敗したら（たとえば \`OrderId\` の重複）どうなる?**
\`Book::submit\`（course 7 由来）は \`()\` を返す — 失敗しない。内部的には、同じ OrderId で 2 回 submit すると 2 回目が黙って 1 回目を上書きする。**これはマッチングエンジンの仕様** だが、テストでは罠になる。\`OrderId(1)\` と \`OrderId(2)\` を意図的に使い分けるのはこのためだ。

**Q: このテストは Cancun / Prague / 将来の仮想的な fork でも動く?**
動く — \`read_best_bid\` は fork に関わらず同じ関数だ。precompile registry は fork ごとに *どの* precompile を有効にするかを選ぶ（L1/L2 で \`openhl_precompiles_for(spec)\` を hardfork ごとの \`OnceLock\` で追加した）が、CLOB の読み出し関数自体は fork に依存しない。

**Q: Solidity コントラクトからは、この同じ値はどう見える?**
\`\`\`solidity
(uint256 price, uint256 qty) = abi.decode(
    staticcall(gas, 0x...0c1b, "", 64),
    (uint256, uint256)
);
\`\`\`
こちらの Book を install して precompile を登録した状態なら、この staticcall は 64 bytes を返し、それが (250, 7) を encode している。Solidity の ABI decoder が 2 つの uint256 に組み直す。**コントラクトはテストと同じデータを、同じコードパス経由で見る。** これがカスタム precompile の存在意義そのものだ。

## Module 2 マイルストーン — あなたが作ったもの

今あるもの：
- アドレス \`0x...0c1b\` に登録されたカスタム EVM precompile。
- プロセスグローバルに共有された Arc ベースの CLOB state。
- live なマッチングエンジンの best bid を read し、ABI の uint256 pair として encode する precompile。
- 証明済みのテスト：(a) precompile が registry から到達可能、(b) CLOB 未インストール時には zero を read、(c) CLOB インストール時には live な state を read。

スマートコントラクトから直接 CLOB state をクエリできるようになった。Course 7 L12 で残っていた「fill が並行リストにあるだけで、スマートコントラクトからは見えない」というギャップが、**read 方向については** 部分的に閉じたことになる。Write 側（コントラクトから order を発注する）は Module 3 の領分。

## 次のレッスン（L7）

L7 で Module 3（Write precompile）が始まる。L2 と対になる形だ：新しい precompile アドレス（\`CLOB_PLACE_ORDER\` は \`0x...0c1c\`）、order パラメータの Solidity calldata の decode、ハードコードのプレースホルダー本体。教育上の焦点は、出力 encoding から **入力** の decode へとシフトする — 可変長 calldata、構造体の unpack、不正入力のエラーハンドリングなど。`,
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

上記の実行結果が 46 tests を通る（3 つ新規）。CLOB の **書き込みパス** は、precompile が登録され、calldata のパースが実装され、rejection path が検証された状態になる：

- **新規 precompile \`0x...0c1c\`** — \`CLOB_PLACE_ORDER\` を \`CLOB_READ_BEST_BID\` と並べて登録する。
- **128-byte ABI-aligned な入力レイアウト** を decode する：\`account_id\` / \`side\` / \`price\` / \`qty\`。
- **アトミックな order-ID カウンタ**（\`NEXT_ORDER_ID\`）— プロセスグローバル、1 から開始 — sentinel の \`0\` が「rejected」と明確に区別される。
- **4 つの rejection path** がすべて zero を返す：入力長不足、無効な \`side\` byte、\`qty == 0\`、CLOB 未インストール。
- **Happy path** では order ID を allocate して返す — **ただし、まだ book には submit しない。** これは L8 で足す。

L7 は Module 3 における L2 に相当する：関数は到達可能で、入力も正しく解析するが、state を変更する挙動は L8 まで先送り。L8 で「book に実際に書き込む」1 行を加え、L9 で発生した fill を bridge に route する。

## おさらい

Module 2 終了時点の状態：
- \`CLOB_READ_BEST_BID\` precompile が \`0x...0c1b\` に登録されている。
- スマートコントラクトは \`STATICCALL\` で live な best-bid データを read できる。
- bridge と precompile が、\`CLOB_STATE\` global を介して \`Arc<Mutex<Book>>\` を共有している。

ただしコントラクトはまだ order を **発注** できない。読めるが、書けない。L7 でその修正を始める。

## プラン

\`crates/evm/src/precompiles/mod.rs\` に 6 つの編集：

1. **Imports を拡張** — マッチングエンジンの型（\`AccountId\` / \`Order\` / \`OrderId\` / \`OrderType\` / \`Price\` / \`Qty\` / \`Side\`）と \`atomic::{AtomicU64, Ordering}\` を引き込む。
2. **\`CLOB_PLACE_ORDER\` アドレス定数** + **\`NEXT_ORDER_ID\` 原子カウンタ**を追加。
3. **\`place_order\` precompile 関数を追加** — 128-byte 入力をパース、検証、ID 割り当て、エンコードした ID を返す。**まだ \`book.submit(...)\` は呼ばない**（それは L8）。
4. **\`u64_from_be_chunk\` ヘルパー**を追加 — \`place_order\` で 32-byte ABI ワードから u64 値を取り出すのに 3 回使う。
5. **\`openhl_precompiles\` を更新** — 2 つの precompile を \`extend\`（要素 2 つの配列、1 つではなく）。
6. **3 つの新テスト** + 1 つのヘルパー（\`place_order_calldata\`）でテスト入力を組み立てる。

\`read_best_bid\` 関数と Module 2 のテストには変更を加えない。**L7 は純粋に追加だけのレッスン。**

> 🛑 **考えてみよう。** スクロールする前に — \`read_best_bid\` precompile は *空* の入力（\`&[]\`）を受け取って 64 bytes を返した。\`place_order\` は **128 bytes の入力** を受け取って 32 bytes を返す。**なぜ Solidity は u64 フィールドそれぞれを 32 bytes に pad するのか?** ヒント：precompile が通常のコントラクト関数と共有している呼び出し規約を考える。

（答え：**Solidity の ABI は 1 slot = 固定 32 bytes だから。** \`function f(uint64 a, uint8 b, uint64 c, uint64 d)\` はパックしない — 4 × 32 = 128 bytes ぶんの calldata を割り当て、各値はその 32-byte slot 内で右寄せされる。precompile は通常の関数呼び出しと同じ EVM call opcode で呼ばれるので、同じ規約に従う。**この無駄は意図的なもの** で、EVM が呼び出しを一律に扱えるようにするためだ。こちらのパーサは、各 slot のうち意味のある 8 byte ないし 1 byte だけを読み、残りは無視する。）

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

\`AccountId\` / \`Order\` / \`OrderId\` / \`OrderType\` / \`Price\` / \`Qty\` / \`Side\` は、すべて L8 で **\`Order\` を組み立てる** ために必要になる — ただし import は今のうちに入れておく（こうしておけば diff を L7 の関心事に絞れ、L8 ではそのまま関数シグネチャ部分に使えるからだ）。\`AtomicU64\` と \`Ordering\` は \`NEXT_ORDER_ID\` カウンタで使う。

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

アドレスは \`0x...0c1c\` — ニーモニックは \`0c1c\` = 「CL[ob] [pla]C[e]」だ。\`0x...0c1b\`（「CL[ob] [Rea]B[id]」）のすぐ隣に配置される。どちらも標準 precompile \`0x01..0x09\` よりずっと上の領域にある。

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

**この static に焼き込まれた決定が 2 つ：**

1. **0 ではなく 1 から開始する。** \`0\` はこちらの「rejected」sentinel 値（入力が malformed か、CLOB 未インストールのときに precompile が返す）として使う。仮にカウンタを 0 から始めると、最初に成功した order も 0 を返してしまい、rejection と区別できなくなる。1 から始めることで、**割り当てられた ID は必ず \`> 0\` になり、EVM caller に返る \`0\` は明確に rejection を意味する** ようになる。
2. **\`Mutex<u64>\` ではなく \`AtomicU64\` を使う。** \`fetch_add(1, Relaxed)\` は wait-free だが、\`Mutex::lock\` はブロックする。order ID の割り当ては order 発注の hot path に乗っており、mutex を使うと order 発注がすべて 1 つのクリティカルセクションに直列化されてしまう。**正しい道具は atomic increment だ。**

> 🛑 **やりがちな勘違い。** 「なぜ \`Ordering::Relaxed\` で、\`SeqCst\` ではないのか?」 — **ID は他の state と ordering の依存関係を持たないからだ。** \`Relaxed\` は atomicity（2 つのスレッドが同じ ID を得ない、という保証）は提供するが、他のメモリ操作との同期は提供しない。こちらとしては ID を book への書き込みと順序付ける必要がない — book は自分の mutex を持っていて、それが state の可視性順序を提供してくれる。\`SeqCst\` にすると increment ごとにメモリフェンスが足される一方、得るものはない。**必要な ordering の中で、最も弱いものを選ぶ。**

> 🛑 **やりがちな勘違い。** 「Multi-validator caveat は将来の問題に見える — 今からドキュメントに書く意味は?」 — **失敗モードが silent な chain divergence だからだ。** 2 つの validator が同じ EVM call に対して異なる ID を割り当てた瞬間から book が分岐し始める — そしてその分岐は、read で違う値が返ってくるまでずっと見えない。**static の定義場所で問題に名前を付けておけば、このコードを拡張する将来のエンジニアが、refactor の方針を決める前に「マルチバリデータでは出荷不可」だと気づける。** 「この物には隠れた制約がある」という警告を置くべき正規の場所は doc コメントだ。

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

注目点が 3 つ：
1. **長さの \`debug_assert!\`** — debug ビルドでは「間違った長さを slice した」を捕まえる。release ビルドでは何にもコンパイルされない。開発時にタダで得られる安全策だ。
2. **\`u64::from_be_bytes\` は \`[u8; 8]\` を受け取る** — slice ではなく固定サイズの配列を要求する。なので \`chunk[24..32]\` の 8 バイトを、まずスタック上の \`[u8; 8]\` バッファにコピーする。
3. **\`pub fn\` ではなく \`fn\`** — モジュール内 private にする。\`precompiles/mod.rs\` の外からは誰も使わないからだ。

> 🛑 **やりがちな勘違い。** 「\`u64::from_be_bytes(chunk[24..32].try_into().unwrap())\` で済むのでは?」 — **動作は同じ。release では同じ命令列にコンパイルされる。** 名前付きヘルパーは **呼び出し側での明快さ** のために存在する：\`u64_from_be_chunk(&input[0..32])\` は「最初の ABI slot を u64 として decode する」と読める。\`u64::from_be_bytes(input[0..32][24..32].try_into().unwrap())\` だと bytes と indices のパズルになる。**ヘルパーは同一の命令にコンパイルされる — 節約されるのは認知負荷のほうだ。**

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

5 つの逐次ステップ。rejection はそれぞれ **早期 return** で書く — ネストした \`if\` にはしない。happy path を線形に保つためだ。

**\`_account_id\` / \`_price_value\` / \`_side\` の \`_\` 接頭辞** は、「parse はしたが、まだ使わない」ことを示すマーカーだ。L8 で underscore を外して \`Order { ... }\` に渡す。それまでは、clippy と rustc は unused な binding を underscore 慣習として受け入れてくれる。

**冒頭の長さチェックは guard だ。** \`input[N]\` のバイトインデックスは N > input.len() で panic する。先頭で \`>= 128\` を 1 回検証しておけば、以降の \`input[X]\` アクセスは provably safe になる — アクセスごとの bounds-check のオーバーヘッドはなく、ランタイム panic のリスクもない。

**side の match にある \`_ =>\` の腕。** \`Side\` は 2 種類の variant を持つ enum だ。match は exhaustive である必要があるが、EVM caller は side slot に 0..=255 のどのバイトでも渡しうる。0 でも 1 でもない値は rejection に倒す — panic ではない。

**increment 側の \`Ordering::Relaxed\`。** これは Step 2 で確立済み。

**\`out\` バッファ。** success path で最後の 8 バイトを上書きするまでは、全部ゼロのままだ。各 rejection path はバッファを変えずに return する — \`out[24..32]\` がゼロのままなので、caller は \`order_id = 0\` を rejected として decode することになる。

> 🛑 **やりがちな勘違い。** 「まだ使わない \`account_id\` や \`price\` を、なぜ parse するのか?」 — **L7 の仕事は calldata の schema を確定させることだ。** schema さえ公開すれば、コントラクトはその schema を前提にビルドし始める。すべてのフィールドを parse する（まだ使わないものも含めて）ことで、**parse の形がそのまま契約になる**。仮に L8 で parse 対象のフィールドを変えると、L7 と L8 の間にビルドされた全コントラクトが壊れる。**フルの schema は L7 で parse する — 未使用 binding があってもよい。挙動の変更は L8 でやる。**

> 🛑 **考えてみよう。** \`drop(state)\` の行に注目してほしい。なぜ order ID を allocate する *前に* read lock を明示的に drop するのか? ヒント：L8 で **同じ Arc に対して write 側のロックを取りに行く** ときに何が起きるかを考える。

（答え：**read lock は write lock をブロックする。** 関数全体を通して \`state\` を保持すると — L8 で追加する \`clob.lock()\` まで含めて — \`CLOB_STATE\` の read lock を持ったまま、その先にある Book 独自の Mutex を取りに行く形になる。動作はする（デッドロックはしない）が、read lock を握っている間ずっと、他の主体による \`install_clob\` を precompile 実行中ブロックしてしまう。早めに drop することで、ロック保持の窓を縮められる。**良き市民であれ：それぞれのロックは可能なかぎり短く保つ。**）

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

1 つの \`extend\` 呼び出しに precompile を 2 つ渡している — 結果としては \`extend\` を 2 回呼ぶのと同じだ。配列の形にしておくほうが、precompile が増えても綺麗に保てる。

\`openhl_precompiles\` の doc コメントも「CLOB-reading additions」から「CLOB-reading + CLOB-writing additions」に更新する — 些細な変更だが、今やらないと時間とともにコードと乖離していくたぐいのものだ。

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

このヘルパーは、4 つの論理値から 128-byte のバッファを組み立て、ABI パディングの詳細を各テストから隠してくれる。これがないとテストごとに byte indexing を書き直すことになり、エラーが入りやすく、ノイズも増える。

**テスト 3 つ、関心事も 3 つ：**

1. **CLOB 未インストール → zero。** \`read_best_bid_returns_zero_when_no_clob_installed\` をミラーする形だ。パターン（serializer / \`uninstall_clob()\` / assert）も、セマンティクス（precompile が未インストール状態で gracefully に degrade すること）も同じ。
2. **Malformed input → zero、3 つの rejection path すべて。** 3 つの sub-assertion を 1 つのテストにまとめているのは、概念的にどれも同じシナリオ（「悪い入力は拒否する」）だからだ。**L7 NOTE で先送りしているチェック（\`depth_bid == 0\`）はここでは明示しておく** — 追加は L8。
3. **Valid input → nonzero ID。** これが「happy path の acknowledgment」だ。ID は allocate された。**ただし order が book に乗ったかどうかはまだチェックしない** — それは L8 の仕事。

> 🛑 **やりがちな勘違い。** 「3 つのテストではなく、1 つの大きいテストでいいのでは?」 — **失敗メッセージが原因を指し示せるようにしたいからだ。** 「place_order の全体パス」を 1 つのテストにまとめてしまうと、fail したときに assertion メッセージとスタックトレースを読み解いて *どの* サブシナリオが壊れたかを推定する必要がある。3 つに分けておけば、fail したテスト名 *そのもの* が原因を指す：\`place_order_rejects_malformed_input\` が fail なら rejection path を確認、\`place_order_returns_nonzero_id_on_valid_input\` が fail なら happy path を確認、という具合だ。**1 テスト 1 関心事を守ることで、失敗自体がそれ自身を説明してくれる。**

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

L6 より 3 つ多い（43 → 46）。新規は \`place_order_*\` の 3 テスト。Module 1+2 の 43 個はそのまま通る — L7 は純粋に追加だけだ。

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

- **\`unused import: AccountId, Order, OrderId, OrderType, Price, Qty, Side\`** — L7 で import したが、まだどれも使っていない。**\`#[allow(unused_imports)]\` を use 文に付けるか、warning を許容するかのどちらか** にする — L8 ですべて使うので、消してはいけない。
- **match の腕の \`unused variable: _side\`** — これがまさに \`_side\` の目的だ。underscore 接頭辞が rustc に「使っていないのは承知しているから warn しないでくれ」と伝えている。\`let side = match ...\`（underscore なし）と書くと unused-variable warning が出る。underscore を戻す。
- **\`u64_from_be_chunk\` で \`error[E0061]: this function takes 0 arguments but 1 was supplied\`** — 関数名を間違えたか、複数の slice で呼んでいる。シグネチャは \`u64_from_be_chunk(chunk: &[u8])\` で、引数は 1 つだけ。
- **ヘルパーの \`buf[63] = side\` のところで \`error[E0277]: 'u64' is not 'u8'\`** — \`side: u64\` などと書いてしまっている。ヘルパーの引数は \`side: u8\`。byte 位置 63 はちょうど 1 バイトだ。
- **個別なら通るのに、スイートでは fail する** — \`TEST_SERIALIZER\` の lock が最初の文になっていない。各テストで \`let _g = TEST_SERIALIZER.lock()...\` が他のどのコードよりも前に来るよう並び替える。

## 設計の振り返り

立ち止まりたいポイントが 4 つ：

1. **schema が契約、挙動は後回し。** L7 で出荷するのは、precompile アドレス、128-byte の calldata レイアウト、32-byte の戻り値形式だ。**一度公開すれば、コントラクトはそれを前提に call し始める。** L8 で calldata レイアウトを変えると、間に書かれたコントラクトがすべて壊れる。L7 で schema を確定させる（挙動が未完成でも）ことで、公開した日から契約が安定する。

2. **happy path がフルに配線される前に、rejection path をテストする。** 各 rejection は public API としての保証だ：「malformed input を送れば sentinel 0 が返り、panic も部分的な state 変更も決して起きない」。この保証は、happy path が何か面白いことをするより *前に* テストできる — そして早めに固めておくことで、L8 で本物の submit を追加するときに validation ロジックが後付けにならずに済む。

3. **order ID には \`AtomicU64\` を使い、\`Mutex<u64>\` は使わない。** アクセスパターンに基づく選択だ：ID の割り当ては order 発注のたびに発生し、book state とは論理的に独立している。atomic increment は wait-free、mutex の取得はブロックしうる。**データが他の state と同期の不変条件を持たないなら、軽いプリミティブを選ぶ。**

4. **\`Ordering::Relaxed\` で十分なのは、book が自前の mutex を持っているから。** Book の \`Mutex\` が「order が book に乗っている」という可視性の同期を提供する。atomic カウンタが提供するのは ID の一意性だけで、ID は他の write と同期の不変条件を共有しない。**メモリ ordering は「必要な不変条件」を起点に選ぶ — 「強いほうが安全だから」で選ぶものではない。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

L7 を終えた時点で、あなたのコードは Stage 9c に **近い** が、**特定の地点で止まっている**：Stage 9c の \`place_order\` は、order_id の allocation と encoding の間に \`book.submit(...)\` を呼ぶ — L7 版はまだ呼ばない。Stage 9c の \`place_order_rejects_malformed_input\` は \`depth_bid() == 0\` の assertion を持つ — L7 版にはまだない。Stage 9c には \`place_order_then_read_best_bid_round_trips\` テストもある — L7 版にはまだない。**これらはすべて L8 でやる。**

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: malformed input で \`place_order\` を panic させてしまうのはダメか?**
precompile は Solidity から呼ばれ、panic は precompile エラーとして伝播して transaction 全体を revert させる。一方 \`0\` を返すなら、呼び出し側のコントラクトに選択肢を渡せる — ログを取る、入力を直してリトライする、ユーザに見せる、など。**caller 側のバグに起因する失敗では、precompile は soft fail すべきだ。**

**Q: \`AtomicU64::fetch_add(1, Relaxed)\` と \`fetch_add(1, SeqCst)\` の違いは?**
どちらも「2 つのスレッドが同じ戻り値を得ない」という意味では atomic だ。違いは **メモリ ordering** にある：\`SeqCst\` は、他のすべての \`SeqCst\` 操作とプログラム全体で同期するメモリフェンスを追加する。\`Relaxed\` は increment 自体の atomicity しか保証せず、他のメモリ操作との同期は提供しない。今回（他の state と論理的に独立したカウンタ）は \`Relaxed\` で十分、かつ速い。

**Q: malformed input に対して、\`EnumValueError\` のようなものを返すことはできないか?**
\`PrecompileFn\` のシグネチャは \`fn(...) -> PrecompileResult\` で、\`PrecompileResult = Result<PrecompileOutput, PrecompileError>\` だ。malformed input で \`Err(...)\` を返すこと自体は *できる* が、それは EVM レベルのエラー（transaction の revert）として伝播する。\`Ok\` + sentinel 0 にしておけば、呼び出し側のコントラクトが rejection を gracefully にハンドリングできる。**これは設計上の選択だ：precompile のエラーは EVM 致命的にするか、それとも caller から見える形にするか?** 今回のように「ユーザが渡した calldata を validate する」用途では、caller から見える形をデフォルトにするのが良い。

**Q: ちょうど \`u64::MAX\` のあたりで誰かが order を submit したら?**
そのうち \`NEXT_ORDER_ID.fetch_add(1, Relaxed)\` が 0 にラップする（u64 を返すので）。その瞬間、次の allocation は sentinel 0 を返してしまい、caller は「rejected」として扱うことになる。\`u64\` の overflow までは ~1.8e19 orders で、およそ 1800 京 order ぶん — v0 では問題にならない。production ではもっと幅のあるカウンタを使うか、overflow 直前で panic させるべきだ。

## 次のレッスン（L8）

L8 は 1 行のコードと、テスト数個ぶんの作業だ。その 1 行とは：order_id の割り当てと encoding の間に \`clob.lock().expect("...").submit(Order { id, account, side, qty, order_type });\` を挟むこと。テスト側では、\`place_order_rejects_malformed_input\` を拡張して、各 rejection の後に \`book.depth_bid() == 0\` を assert する（submit が配線されたので、ようやく意味のある side-effect チェックになる）。\`place_order_returns_nonzero_id_on_valid_input\` は \`place_order_then_read_best_bid_round_trips\` に置き換える — 2 つの precompile でラウンドトリップを行い、\`0x...0c1c\` 経由の write が \`0x...0c1b\` 経由の read から見えることを証明する。**そのラウンドトリップが Module 3 の中盤マイルストーンだ。**`,
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

上記の実行結果が 46 tests を通る — L7 と同じテスト数だ。だが \`place_order\` に 1 行を加え、テスト 2 つを変更することで、precompile が **本当に book に書く** ようになる：

- **\`place_order\` に 1 行追加** — order_id の割り当てと encoding の間に \`clob.lock().submit(Order { ... })\` を挟む。
- **L7 で付けた \`_\` 接頭辞を外す** — \`_account_id\` / \`_price_value\` / \`_side\` を実際に使うようになる。
- **L7 の \`place_order_rejects_malformed_input\` を拡張** — 各 rejection の sub-assertion の後に \`book.depth_bid() == 0\` も assert する（rejection 時に部分的な mutation がないことを示す）。
- **L7 の \`place_order_returns_nonzero_id_on_valid_input\` を置き換え** — \`place_order_then_read_best_bid_round_trips\` へ。\`0x...0c1c\` 経由の書き込みが \`0x...0c1b\` 経由の読み込みから見えることを示す、precompile 2 つのラウンドトリップだ。

このラウンドトリップが **Module 3 の中盤マイルストーン** — EVM ↔ CLOB のサーフェスが双方向になる瞬間だ。スマートコントラクトは片方の precompile で order を発注し、もう片方で即座に best bid を読める — 両方が同じ \`Arc<Mutex<Book>>\` を見ているからだ。

## おさらい

L7 終了時点の状態：
- \`place_order\` は、128-byte の calldata を \`(account, side, price, qty)\` に parse し、検証し、\`order_id\` を割り当てる — **その後は ID を返すだけで、書き込みはしない。**
- unit test は 3 つともすべて通る。ただし \`place_order_rejects_malformed_input\` は戻り値しかチェックしておらず、side-effect は見ていない。
- happy-path テスト（\`place_order_returns_nonzero_id_on_valid_input\`）も、ID が *返る* ことだけを検証していて、book に乗ったかどうかは検証していない。

関数としては書き込みパスの半分まで来ている。L8 で残り半分を完成させる。

## プラン

\`crates/evm/src/precompiles/mod.rs\` への編集は 3 つ：

1. **\`place_order\` の中で** — order ID の割り当てと出力 encoding の間で、Book をロックして \`submit\` を呼ぶ。binding の underscore を外す（今度こそ使うから）。
2. **\`place_order_rejects_malformed_input\` テストの中で** — 3 つの rejection assertion それぞれの後に、\`book.lock().unwrap().depth_bid() == 0\` も assert する。これには、テストが \`book\`（\`Arc<Mutex<Book>>\`）を保持して、rejection 後にも book を inspect できる必要がある。
3. **\`place_order_returns_nonzero_id_on_valid_input\` を置き換え** — 新テスト \`place_order_then_read_best_bid_round_trips\`（precompile 2 つのラウンドトリップ）へ。

import の変更はなし。新しい関数も precompile もなし。**L8 はコース中で最も中身の少ない content レッスン** だ — 価値は「コード 1 行で双方向のサーフェスが閉じる」ことを証明する点にある。

> 🛑 **考えてみよう。** スクロールする前に — read precompile が global の Arc から live なデータを見られることは、すでに L6 で証明済みだ。L8 で変わるのは、そのデータの *ソース* だけ — テスト setup が直接 \`book.lock().submit(...)\` で Arc に書き込む（L6 がやっていた形）のではなく、**\`place_order\` precompile** が書き込むようになる。**この変化のどこが重要なのか?** ヒント：precompile がどんな種類の caller を代表しているのかを考える。

（答え：**precompile はスマートコントラクトの caller を代表している。** L6 でテストコードが book に直接書き込んでいたのは、*ブリッジ*（オフチェーンコード）が book に書き込むのと等価だった。\`place_order\` が book に書き込むことは、**EVM transaction が book に書き込む** ことと等価だ — スマートコントラクトの呼び出しが EVM dispatch を通って precompile に届き、その結果として book state が生まれる。**Stage 9c は、EVM 実行が CLOB state を mutate し始める瞬間そのものだ。** L8 まではオフチェーンコードしか book に書けなかったが、L8 以降はオンチェーンコードも書ける。）

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

- **\`drop(state)\` が消える。** L7 ではまだ \`book.lock()\` を呼ばないので read ロックを早めに drop していた。L8 では同じ read を後段まで保持し、\`clob\`（\`Arc\` の中身への参照）に bind したまま使う。L7 の \`is_none\` チェックは \`let-else\` に書き換える必要がある。

実際のロックパターンを明示するため、\`place_order\` の更新版を全体で示す。qty チェックの後ろのロックセクションを次のように置き換える：

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

L7 からの変更点：
- \`if state.as_ref().is_none() { ... }; drop(state);\` を \`let Some(clob) = state.as_ref() else { ... };\` に置き換える — \`let-else\` binding なら、\`None\` の早期 return 後も \`clob\` を使い続けられる。
- \`Some\` で bind したあと、**\`state\` を drop してはいけない** — \`clob\`（\`state\` への参照）を \`clob.lock()\` 呼び出しまで有効に保ちたいので、\`state\` が生きている必要がある。
- \`let _result = book.submit(...)\` — \`submit\` は \`Vec<Fill>\`（マッチングエンジンが生んだ fill）を返す。L8 ではこれを無視する。**L9 でこの fill を bridge に route する** が、今は \`let _result\` で clippy の unused return value 警告を黙らせる。
- \`drop(book)\` — Book の mutex ガードを明示的に drop する。\`out[24..32]\` のコピーと \`Ok(...)\` の return は、Book のロックを保持せずに行う。hot path 向けのちょっとした最適化だ。

**binding の \`_\` 接頭辞も外す**（今度は実際に使うので）：

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

識別子 3 つにようやく意味が宿る：\`account_id\` は order の account、\`price_value\` は limit price、\`side\` は order の side だ。**L8 の submit 内で組み立てる Order 構造体まるごとが、L7 で parse 済みのデータそのもの。** これが「L7 で schema を固め、L8 で挙動を追加する」ことの実体だ。

doc コメントも更新する — L7 で書いた「submit はまだ呼ばない」という L7 NOTE 行を削除する：

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

末尾の「Side note」は次のギャップを明示している — \`submit\` が返した fill を捨てている、という点だ。**そのギャップを埋めるのが L9。** doc コメントに書いておくことで、将来の読者にも「これは認識済みのギャップで、見落としではない」と伝わり、悩む時間を節約できる。

> 🛑 **やりがちな勘違い。** 「unused 警告を抑えるだけなら、\`_result\` の underscore に意味はあるのか?」 — **\`let _result = ...\` と \`let _ = ...\` はどちらも警告は抑える。** 違いは：\`let _result\` は値を bind してスコープの終わりで drop する一方、\`let _ = ...\` は値を **即座に** drop する（次の文より前に）。\`submit\` のケースでは、\`_result\` を後で読むわけではないのでどちらでも動く。だが \`let _result\` は「値に意味のある名前があり、将来使う予定がある」ときの慣習だ — L9 で本来の名前に bind して route するように。**\`_result\` は「将来の意図」のマーカーだ。**

> 🛑 **やりがちな勘違い。** 「どうせスコープの終わりで release されるのに、なぜ \`drop(book)\` を明示するのか?」 — **encoding と \`Ok()\` の return がまだ残っているからだ。** \`drop(book)\` しないと、\`out[24..32].copy_from_slice(...)\` と \`Ok(PrecompileOutput::new(...))\` の構築の間も Book ロックを握り続けることになる。どちらの操作もロックを必要としない。握り続けていると、並行 reader や他の precompile の並列アクセスにコストがかかる。**明示的な drop は「このロックは用済み、関数の残りでは要らない」という宣言だ。** コンパイラ上は省略可能だが、hot path ではロック保持の窓を目に見えて縮められる。

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

このテストは Book を install しているが、Arc を捨ててしまっているので book の state を確認できない。次のように置き換える：

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

L7 からの変更点は 3 つ：

1. **\`let book = Arc::new(...); install_clob(book.clone());\`** — Arc をローカルに束縛する。Arc の \`.clone()\` は refcount をインクリメントするだけ。両方の名前が同じ Book を指す形になる。
2. **新規 assertion を 3 つ：\`book.lock().unwrap().depth_bid() == 0\`** — 各 rejection の後、book には何も乗っていないことを確かめる。**\`depth_bid()\` は全価格レベルにわたる bid order の本数を返す**（course 7 の Book で定義した）。Zero なら空、ということだ。
3. **doc コメント** を追加（L7 では「L7 NOTE」で先送りチェックを説明していたが、ここで消える）。

**追加した 3 つの assertion が side-effect 側の証明だ。** L7 の \`assert_eq!(... U256::ZERO)\` は precompile が sentinel を *返す* ことしかチェックしていなかった。L8 では、precompile が **何も書き込んでいない** ことも合わせて確認する。両方を合わせて、「malformed input → 0 を返し、かつ state には触れない」が証明できる。

> 🛑 **やりがちな勘違い。** 「\`book\` をそのまま渡せばよいのに、なぜ \`book.clone()\` するのか?」 — **\`install_clob\` が引数を消費（move）した後でも、inspect できる handle を残しておきたいからだ。** \`install_clob(Arc<Mutex<Book>>)\` は Arc を値で受け取る。\`install_clob(book.clone())\` のあとには、global が 1 つの Arc、このスコープの \`book\` がもう 1 つの Arc を保持する形になる — どちらも同じ Book を指す。仮に \`install_clob(book)\` と書いてしまうと、\`.lock().unwrap().depth_bid()\` を呼ぶためのローカル handle を失う。**Arc::clone は、関数呼び出しをまたいで所有権を共有するための安価な手段だ。**

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

L7 のテストを「追加」ではなく「置き換え」にする理由：

- L7 の \`place_order_returns_nonzero_id_on_valid_input\` は \`place_order\` が nonzero な ID を返すことしか assert していない。その assertion は、こちらのテストの \`assert!(returned_id > U256::ZERO, ...)\` に **包含されている**。
- 新テストはさらに進む：\`read_best_bid\` で読んで、発注した order が実際に見えることまで検証する。**L7 の assertion は、L8 の assertion の厳密な部分集合だ。**

両方残すのは冗長になる。**包含されるテストは死荷重だ** — coverage は増えず、メンテナンスコストだけが増える。

2 つの precompile call は独立している — \`read_best_bid\` は \`place_order\` が起きたことを知らない。どちらも \`CLOB_STATE\` 経由で同じ \`Arc<Mutex<Book>>\` を read/write する。**それがラウンドトリップだ — 片方の precompile で書き、もう片方で観測する。** Solidity コントラクトの視点ではこうなる：

\`\`\`solidity
uint256 order_id = call(0x...0c1c, abi.encode(0xABCD, 0, 175, 12));   // ~ id > 0
(uint256 price, uint256 qty) = staticcall(0x...0c1b, "");             // ~ (175, 12)
\`\`\`

EVM call は別々、precompile も別々だが、global を共有しているので state も共有される。**そのグローバルを install するのが bridge で、bridge 自身の submit_order もそこに書き込む。bridge の pending_fills はまだ何も受け取っていない（これは L9 で直す）。**

> 🛑 **考えてみよう。** スクロールする前に — このテストは \`Book\` を install し、\`place_order\` で Buy を発注し、\`read_best_bid\` で読む。**もし read precompile と write precompile が *それぞれ別の* \`Arc<Mutex<Book>>\` を（つまり別々の Book を）持っていたらどうなるか?** ヒント：共有 state が何を意味するかを考える。

（答え：**テストは fail する。** \`read_best_bid\` は空の book を見て zero を返す。このラウンドトリップが成立する唯一の理由は、**両方の precompile が同じ \`CLOB_STATE\` global から読み、その global が 1 つの Arc を保持していて、その Arc が 1 つの Book を指しているから** だ。Arc を共有するパターンこそが、ラウンドトリップに意味を与えている。各 precompile が自前の private な state を持っていたら、機能的に切り離されてしまい、同じ CLOB に話しかける用途には使えない。）

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

テスト数は L7 と同じ 46 個。変わったのは、テスト 1 つを置き換えたこと（\`place_order_returns_nonzero_id_on_valid_input\` → \`place_order_then_read_best_bid_round_trips\`）と、テスト 1 つを拡張したこと（\`place_order_rejects_malformed_input\` で book state もチェックするようにしたこと）。

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

**この \`ok\` 行が Module 3 の中盤マイルストーンだ。** カスタム precompile 2 つ、共有 state 1 つ、そして EVM 実行内で完結する write → read のフルラウンドトリップが揃った。

よくあるエラーと対処：

- **\`place_order\` 内で \`error[E0382]: borrow of moved value: 'state'\`** — \`let Some(clob) = state.as_ref() else { ... };\` を書いたあと、後続コードで \`state\` をまだ使っている。\`let-else\` パターンは \`clob\`（\`state\` への参照）を bind するので、\`state\` は生きていなければならない。後から \`drop(state)\` を足してはいけない。
- **\`error: cannot find value 'account_id' in this scope\`** — \`Order { ... }\` リテラル側の \`_\` 接頭辞は外したが、parse 行が \`let _account_id = ...\` のまま残っている。*両側で* 接頭辞を外す必要がある。
- **\`place_order_rejects_malformed_input\` で \`assertion failed: book.lock().unwrap().depth_bid() == 0\`** — rejection path がきれいに弾けていない。どこかで早期 return をすり抜けて、\`book.submit(...)\` まで到達している。rejection の順序を再確認する：短い input → side byte → qty → CLOB なし、の順だ。それぞれが \`return Ok(...)\` になっていて、本体に落ちる \`if ... { ... }\` になっていないかを見直す。
- **ラウンドトリップテストで \`assertion failed: left=200 right=175\`** — \`submit\` が間違ったフィールドに bind している。Order の \`price\` は \`input[64..96]\` から parse した値（u64）。\`Price(price_value)\` を渡しているか確認する（\`Price(qty_value)\` などになっていないか）。
- **\`error[E0599]: no method 'depth_bid' found for struct 'Book'\`** — このメソッドは course 7 の Book 設計で追加した。\`crates/clob/src/book.rs\` に存在することを確認する。

## 設計の振り返り

立ち止まりたいポイントが 4 つ：

1. **schema を先に固めるので、挙動側は小さく済む。** L7 は ~70 行ぶん（定数、atomic、パーサ、登録、テスト）。L8 はその上に ~7 行（submit + binding のリネーム + テスト拡張）追加するだけ。**この差分の小ささこそが要点**：実装の前に契約を固めることで、実装は広範な変更ではなく集中した変更で済む。将来 precompile を増やすときも同じパターンで進められる。

2. **precompile 2 つ、Arc 1 つ、state を共有 — だからラウンドトリップが動く。** L4 で組んだアーキテクチャ（\`static\` 内の \`Arc<Mutex<Book>>\`、bridge が install、各 precompile が read）は、まさにこの瞬間のために設計したものだ。**両方の precompile が同じ Book を見られるのは、どちらも \`CLOB_STATE\` を経由しているから。** 別の設計（precompile ごとに global を 1 つずつ）にしていれば、初期の構築は楽だったかもしれないが、ラウンドトリップ自体が不可能になっていた。

3. **side-effect をテストするには handle を保持しておく必要がある。** L7 の malformed-input テストは参照を保持していなかったので、book を確認できなかった。L8 では \`let book = Arc::new(...); install_clob(book.clone());\` でこれを直す。**clone のあるなしが「戻り値テスト」と「state テスト」の差だ。** clone のコストは atomic increment 1 回ぶんで安価、効用は「部分的な write が起きていない」ことを証明できる点にある。

4. **\`_result\` は将来の意図を示すマーカー。** L8 では \`submit\` が返す fill を \`_result\` に bind して無視する。L9 では \`fills\`（underscore なし）に bind して route する。命名規約は次のとおり：\`_name\` は「値の存在は認識しており、今は使わないが将来使う予定」、\`_\`（むき出し）は「明示的に使わない、将来も使う予定はない」。状況に応じて選ぶ。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
\`\`\`

L8 を終えた時点で、あなたのコードは Stage 9c と一致する。diff は **空** になるはずだ（自分で書き換えた doc コメントの言い回しを除けば）。**これで Stage 9c が閉じる。**

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`Book::submit\` の戻り値は何で、なぜ捨てるのか?**
\`Book::submit(order)\` は \`Vec<Fill>\` を返す — 新しい order が反対側の resting order とマッチして生じた fill のリストだ。marketable な Buy を submit すれば 1 つ以上の Sell order を消費し、マッチごとに 1 つの Fill が生まれる。L8 ではこれを捨てる — bridge の \`pending_fills\`（次の payload に attach される）にはまだ precompile が繋がっていないからだ。**L9 で、\`install_clob\` を鏡写しにした \`install_fill_sink\` パターンで繋ぎ込む。**

**Q: \`place_order\` を \`staticcall\` から呼んだらどうなる?**
staticcall は read-only な呼び出しで、呼び先が state を mutate しようとすると Solidity 側が revert する。**ただし precompile については、EVM は precompile 境界でこれを強制しない** — \`STATICCALL\` で呼ばれたときに書き込みを拒否するのは precompile 側の責任になる。v0 ではチェックしていない — 強い意志を持ったコントラクトは \`0x...0c1c\` を STATICCALL でき、こちらは何の抵抗もなく book に書き込んでしまう。**これは既知の soundness gap だ。** production では call context（\`is_static\`）を見て reject すべきだが、v0 のスコープ外とする。

**Q: 1 つの EVM call で *write と read の両方* を起こせるか?**
できる — 1 つの Solidity 関数が \`call(0x...0c1c, ...)\` の後に \`staticcall(0x...0c1b, ...)\` を順に呼べばよい。\`place_order_then_read_best_bid_round_trips\` が Rust レベルでシミュレートしているのは事実上これだ。両方の call は同じ EVM transaction の call stack 内で実行され、どちらも \`CLOB_STATE\` global を触る。**ただし EVM transaction が後で revert しても、book の state はロールバックされない** — これも soundness gap の 1 つ。production では transaction-scoped な state shadowing が必要になる。

**Q: なぜ \`place_order\` を \`0x...0c1a\` ではなく \`0x...0c1c\` に登録するのか?**
アドレス名前空間の慣習だ：\`0c1b\` = 「Read Best [b]id」、\`0c1c\` = 「[c]lob [c]reate」。数字的には \`0c1a\` も魅力的（\`0c1a < 0c1b\`）だったが、\`0c1c\` のほうが声に出して読みやすく、read/write のアドレスが隣り合う — \`0c1b\` が read、\`0c1c\` が write — ので、両方を使うコントラクトを目で追う人にとって助けになる。コントラクトを人間が書く以上、アドレスの命名慣習は重要だ。

## 次のレッスン（L9）

L9 では、L8 の doc コメントに残した「fill を捨てている」というギャップを閉じる。\`CLOB_STATE\` と対になる \`FILL_SINK\` static を追加する — プロセスグローバルな \`Option<Arc<Mutex<Vec<Fill>>>>\` だ。\`place_order\` は fill を sink に push するようになる。bridge の \`pending_fills\` フィールドは \`Mutex<...>\` から \`Arc<Mutex<Vec<Fill>>>\` に変える。bridge の \`new()\` がそれを FILL_SINK として install する。L9 を終えると、**EVM 経由で発注された order が生んだ fill が、bridge の payload-attached な fill stream に流れ込むようになる** — precompile と bridge は書き込み側でも独立ではなくなる。`,
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

上記の実行結果が 47 tests を通る（1 つ新規）。L8 の doc コメントで述べた「fill を捨てている」というギャップが閉じる：

- **\`FILL_SINK\` static を追加** — \`CLOB_STATE\` と対になる位置に置き、\`Option<Arc<Mutex<Vec<Fill>>>>\` を保持する。
- **モジュール関数 \`install_fill_sink\` / \`uninstall_fill_sink\`** を追加 — どちらも public で、\`install_clob\` / \`uninstall_clob\` パターンをそのまま鏡写しにする。
- **\`place_order\` を拡張** — \`let submit_result = book.submit(...)\`（以前は \`_result\`）に変え、\`drop(book)\` のあとで、sink が install されていれば **生まれた fill を push する**。
- **\`LiveRethEvmBridge::pending_fills\`** を \`Mutex<Vec<Fill>>\` から \`Arc<Mutex<Vec<Fill>>>\` に変更する。bridge の \`new()\` が \`install_clob\` と並んで \`install_fill_sink(Arc::clone(&pending_fills))\` を呼ぶ。
- **新しい unit test** \`place_order_routes_fills_to_installed_sink\` を追加 — maker/taker のクロスを実行し、sink が fill を受け取ることを検証する。

L9 を終えると、precompile と bridge はもはや **書き込み側でも独立ではない**。EVM 経由で発注された order が生んだ fill は、bridge 側の \`submit_order\` が書き込むのと同じ \`pending_fills\` キューに流れる。次の \`build_payload\` がそれを拾う。

## おさらい

L8 で Stage 9c 本体を閉じた：\`place_order\` が book に書き込むようになり、\`place_order → read_best_bid\` のラウンドトリップが証明された。だが L8 の doc コメントは、残されたギャップを次のように明示している：

> Side note: the fills returned by \`Book::submit\` are discarded here. Production-shape integration would route them through the bridge's \`pending_fills\` so they reach the next \`build_payload\`.

このギャップは意図的なものだ — Stage 9c は diff を集中させるために、あえてこれを伴わずに出荷した。それを閉じるのが Stage 9c+ だ。

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

> 🛑 **考えてみよう。** スクロールする前に — \`book.submit(...)\` を呼んで、その戻り値の fill を *捨てる* precompile（\`place_order\`）はすでにある。これらの fill を bridge に届けるためのアプローチは、ざっと 3 つ考えられる：(a) precompile が bridge を直接 *呼ぶ*、(b) bridge が fill を *ポーリング* しに来る、(c) precompile が push する共有バッファを install する。**なぜ (c) — 共有バッファのパターン — が、これまで組んできたアーキテクチャからほぼ強制されるのか?** ヒント：(a) と (b) がそれぞれ何を「知っている」必要があるかを考える。

（答え：**precompile は \`fn\` ポインタで、bridge への参照をキャプチャできない。** (a) は precompile に何らかの方法で \`&Bridge\` を渡す必要があるが、これは \`CLOB_STATE\` global で解決したのと同じ「関数ポインタはクロージャをキャプチャできない」問題だ。(b) は bridge が「ポーリングすべき」と知っている必要があり、関心の分離に反する。(c) は同じパターンになる：bridge がバッファを所有し、precompile は global 経由でそれを見る。**共有 CLOB state のアーキテクチャができている以上、共有 fill state はその自然な拡張だ。**）

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

\`Fill\` は course 7 の \`crates/clob/src/lib.rs\` で定義した値型だ。\`price: Price\` と \`qty: Qty\` のフィールドを持つ（他にも \`maker_order_id\` / \`taker_order_id\` などがあるかもしれないが、後のテストで参照するのは \`price\` と \`qty\` だけ）。Copy 可能なので、受け渡しは安価だ。

\`crates/evm/src/live_node.rs\` ではすでに \`Fill\` を import 済み（既存の \`pending_fills\` フィールドで使っている）なので、こちらは今は変更しない。

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

この static は \`CLOB_STATE\` と構造的に正確な並びになっている：
- \`CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>>\` — 外側が install/uninstall 用のロック、内側が Book のロック。
- \`FILL_SINK: RwLock<Option<Arc<Mutex<Vec<Fill>>>>>\` — 外側が install/uninstall 用のロック、内側がバッファのロック。

ライフサイクルもロックの階層化の理由（L4 の「設計の振り返り 2」）も同じだ：install/uninstall は稀な write なので \`RwLock\`、バッファへの書き込みは頻繁な write なので \`Mutex\`、という構成。

\`install_fill_sink\` と \`uninstall_fill_sink\` は CLOB 版のミラーだ：body は 1 行、いずれも \`pub fn\`。doc コメントでライフサイクル（「\`LiveRethEvmBridge::new\` から呼ばれる」）を明示してあるので、コードを追う読者は呼び出し側の予定を把握できる。

> 🛑 **やりがちな勘違い。** 「CLOB と fill-sink を 1 つの global にまとめてはどうか? たとえば \`CLOB_STATE: Option<(Arc<Mutex<Book>>, Arc<Mutex<Vec<Fill>>>)>\` のように」 — **install のタイミング要件が異なるからだ。** \`read_best_bid\` だけを exercise するテストは fill sink を install する必要がない。束ねると、毎テストで両方を準備しないといけなくなる。**global を直交に保てば、各テストは触るものだけを install できる。** static が 2 つあるコストは名前空間上のものだけで、uninstalled なら実行時コストはゼロだ。利得はテストごとの合成可能性。

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

変化は 3 つ：

1. **\`_result\` から \`submit_result\` へ。** L8 の設計振り返り（「\`_result\` は将来の意図を示すマーカー」）で予告したとおり、いまがその「将来」だ。underscore が外れ、binding が実際に使われる。
2. **\`if !submit_result.fills.is_empty()\` による早期回避。** order が cross せず rest しただけのとき（fill を生まないとき）、ロック取得をスキップする。limit を rest させる一般ケース → fill-sink トラフィックなし、となる。
3. **\`sink_state.as_ref().map(|sink| sink.lock()...extend(...))\` パターン。** \`current_best_bid\` の read パターン（L4 の Step 4）と同じ形だ：外側の read ロックは短く保持して内側の Arc にアクセスし、続いて内側の Mutex を取得する。

**\`submit_result.fills.iter().copied()\`** — \`Fill\` は \`Copy\` なので、\`.iter().copied()\` で所有権付き fill の iterator が得られる。\`.into_iter()\` より安価 — \`submit_result\` の他のフィールドを消費したくないからだ。**Copy 経由で iterate すれば、ソースは無傷のまま保てる。**

> 🛑 **考えてみよう。** \`if !submit_result.fills.is_empty()\` の guard に注目してほしい。これを外して、無条件に FILL_SINK の read ロックを取って \`as_ref()\` をチェックする形にしたら、挙動は変わるか?

（答え：**挙動は同じだが、fill なしのケースで性能が落ちる。** 一般ケース — limit を rest させただけの \`place_order\` 呼び出し — のたびに、FILL_SINK の read ロックを取り、結局何も push しないことを確認するだけ、という処理を毎回繰り返すことになる。guard はそれを短絡してくれる。**一般ケースを早期に回避できるなら、それはタダで得られる勝利だ。** ここは hot path — 不要なロック取得のコストはじわじわ積み上がる。）

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

明示したのは 2 点：

1. **「何が変わったか」を示す行** — 「Stage 9c+ (this commit)」。半年後にこの doc を読む人にも、どのバージョンのコードが何をしているかが分かる。
2. **fallback セマンティクス** — 「sink が install されていなくても fill 自体は生まれる」。テスト分離の観点で決定的に重要だ。L8 のラウンドトリップテスト（sink を install しない）でも \`place_order_then_read_best_bid_round_trips\` が動くのは、sink の有無に関わらず fill が Book に届くからだ。**この fallback を doc で明示しておけば、fill を気にしないテストは sink を install せずに \`place_order\` だけで済ませられる。**

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

テストの形は次のとおり：

1. **Setup** — \`TEST_SERIALIZER\` を取得し、CLOB と sink の両方を install する。\`sink\`（Arc クローン）は inspect 用に保持しておく。
2. **resting maker** — Buy @ 100。何ともクロスしない（book は空）。**fill は 0 個**で、sink は空のまま。
3. **crossing taker** — Sell @ 100。resting Buy にクロスする。maker が book から消え、taker は完全にマッチ → **fill がちょうど 1 つ** 生まれる。
4. **sink を inspect** — \`clone()\` で Vec を取り出してから assert する（Mutex を握ったまま assert しない）。長さ、price、qty を検証する。
5. **後始末** — install したのと逆の順で両方を uninstall する。

**なぜ単一の submit ではなく、maker + taker のペアにするのか?** \`Book::submit\` は、新規 order が既存 order と *クロス* したときにしか fill を生まない。空の book への単独 submit は fill を 0 個しか生まない。routing logic をテストするためには、**少なくとも 1 つの fill が実際に routing されている必要がある**。maker が rest し、taker がクロスする → fill 1 つ、というのが最小テストデータだ。

> 🛑 **やりがちな勘違い。** 「marketable な Buy を、resting Sell のある book に submit してテストすればよいのでは?」 — **できる、等価だ。Maker-Buy / Taker-Sell を選んでいるのは、それが order-book の標準的な例だから。** 2 つ目の order が 1 つ目に対して marketable であれば、向きはどちらでも構わない。教育上のポイントは「クロスする 2 つの order が fill を 1 つ生む」ことで、価格方向は副次的だ。

> 🛑 **考えてみよう。** CLOB は install するが sink は install せずに、クロスする order を発注したらどうなるか? ヒント：L8 の既存テスト \`place_order_then_read_best_bid_round_trips\` を見てみる。

（答え：**Book 内では fill が生まれるが、どこにも push されない** — precompile の \`if !submit_result.fills.is_empty()\` guard は当たる一方、\`FILL_SINK.read()\` は \`None\` を返すので、内側のブロックが実行されない。order が book に乗ったり外れたりする挙動は正しく起きる。欠けるのは bridge への *流れ* だけだ。これが doc コメントで明示した「単独テストでもなお動く」という性質だ。L8 のラウンドトリップテストは sink を install しないが、正しい best-bid 挙動を観測できる — その挙動はこの性質に依存している。）

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

doc コメントでアーキテクチャの対称性を説明している — \`pending_fills\` も \`clob\` もどちらも shared-Arc パターンに従う。型を辿って \`Arc\` を見た人は、global がそこを指していることも併せて把握できる。

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

変化は 3 つ：

1. **\`let pending_fills = Arc::new(Mutex::new(Vec::new()));\`** — Arc をローカルに束縛する。上の \`let clob = ...\` と同じ形だ。
2. **\`crate::precompiles::install_fill_sink(Arc::clone(&pending_fills));\`** — precompile モジュールと Arc を共有する。\`install_clob\` のミラー。
3. **struct literal は \`pending_fills,\`** で済む（\`Mutex::new(Vec::new())\` をインラインで書かない） — ローカル変数をそのまま使えばよい。

\`self.pending_fills\` を使う他の call site（\`pending_fill_count()\` や、\`build_payload\` での drain など）は引き続き動く — \`Arc<Mutex<T>>\` は \`&Mutex<T>\` に deref されるので、\`self.pending_fills.lock()\` のままで構わない。L4 で \`clob\` を Arc にしたときに \`submit_order\` がそのまま動き続けたのと同じ coercion だ。

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

立ち止まりたいポイントが 4 つ：

1. **共有バッファのパターンは一般化する。** L4 で CLOB に対して「\`Arc<Mutex<T>>\` + プロセスグローバル」のパターンを導入し、L9 ではそれを fill に再利用した。**アーキテクチャの primitive がいったん揃えば、bridge と precompile の間で共有する追加 state は、バッファあたり ~20 行で済む。** L4 で抽象化に投資した分が複利で効いてくる。

2. **state ごとに install のライフタイムが違うなら、別々に分けておく。** CLOB と FILL_SINK を 1 つの global にまとめてしまうと、テストごとに両方を install しなければならなくなる。直交な global は、直交なテスト setup を可能にする。**テストが主な consumer になる場面では、関連 state の凝集度より、ライフサイクルを直交に合成できることのほうが重要だ。**

3. **一般ケースの早期回避はタダで効く。** \`if !submit_result.fills.is_empty()\` のおかげで、クロスせずに rest しただけの order — 最も多いケース — ではロック取得をスキップできる。guard は hot path に分岐を 1 つ足すだけだが、fill が空のときに RwLock の取得を節約できる。**hot path でもっとも安価な最適化は、たいていの場合「支配的なケースの早期回避」だ。**

4. **フラグは doc コメントの中に置く。** L8 の doc の「Side note: fills are discarded」は load-bearing だった — 将来の読者に「これは意図的なギャップで、見落としではない」と伝えるための行だ。L9 でそのギャップを閉じ、doc も更新する。**ドキュメント化されたギャップは半分直したも同然、ドキュメント化されていないギャップは見えない技術負債になる。**

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

**Q: \`place_order\` が同時に呼ばれて、両方とも fill を生んだらどうなる?**
両方のスレッドが FILL_SINK の read ロックを取る（非排他なので OK）。どちらも同じ Arc に包まれたバッファへの参照を得る。それぞれが内側の Mutex を \`.lock()\` — そこで取得がシリアライズされる。**先に到着したスレッドの fill が入り、次にもう一方の fill が入る。順序は \`submit\` の呼び出し順と一致し、何も失われない。** 標準的な Mutex のセマンティクスのとおりだ。

**Q: なぜ \`place_order_routes_fills_to_installed_sink\` は、もっと単純なシナリオではなく maker-taker のクロスでテストするのか?**
routing をテストするには fill が必要だからだ。\`Book::submit\` は、order が何ともクロスしないときには fill を 0 個しか返さない — その場合、routing のブロックを exercise できない。**maker-taker のペアが、fill を生む最小のテストデータだ。** これより単純なシナリオでは、routing のロジックをまるごとスキップしてしまう。

**Q: \`submit_result\` の正体は何か? \`Vec<Fill>\` だけ?**
\`Book::submit\` が返す struct だ（course 7 の CLOB crate で定義した）。少なくとも \`.fills: Vec<Fill>\` というフィールドを持ち、他にもフィールド（\`order_id_assigned\` や \`resting_qty\` など）があるかもしれない。L9 で必要なのは \`.fills\` だけで、残りは v0 では未使用だ。

**Q: bridge の \`build_payload\` が \`pending_fills\` を drain するとき、両ソースの fill を原子的に drain するのか?**
イエス。\`pending_fills\` は単一のバッファ（Mutex も 1 つ）だ — fill が \`bridge.submit_order\`（bridge 内部の呼び出し）由来か \`place_order\`（FILL_SINK 経由）由来かは関係ない。\`build_payload\` が \`self.pending_fills.lock().unwrap().drain(..)\` を呼ぶと、前回の drain 以降に push されたすべての fill が得られる — EVM 経由の発注も bridge 経由の発注も、時系列で交互に並ぶ形で含まれる。**統一されたキューには統一された drain で十分。**

## 次のレッスン（L10）

L10 はいよいよ **コースレベルのマイルストーン** だ：Stage 9d の integration test \`bridge_against_custom_evm_node_shares_clob_with_precompile\`。\`OpenHlExecutorBuilder\` で Reth ノードを bootstrap し、そのノードの provider に対して \`LiveRethEvmBridge\` を構築する。\`bridge.submit_order\` で order を発注し、\`current_best_bid\` で観測する。続いて **precompile 経由で \`place_order\` を呼び**、\`bridge.pending_fill_count()\` がインクリメントすることを検証する。これが **すべての要素** — Module 1 の EVM bootstrap、Module 2 の read precompile、Module 3 の write precompile、Module 4 の FILL_SINK — が、実際の Reth プロセス内で噛み合うことの証明になる。L10 を終えれば、openhl のリファレンス実装は Stage 9d を閉じる。`,
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

…新しい integration test \`bridge_against_custom_evm_node_shares_clob_with_precompile\` を 1 つ通る。このテストは Stage 9a-9c+ で触ったすべてを 1 箇所でやる：

1. **Reth を bootstrap する** — \`OpenHlExecutorBuilder\` 付きで（CLOB precompile 2 つを登録したカスタム EVM 込み）。
2. **\`LiveRethEvmBridge\` を構築する** — そのノードの provider に対して。bridge の \`new()\` が \`install_clob\` と \`install_fill_sink\` を呼ぶ。
3. **bridge が book に書く** — \`bridge.submit_order(Buy @ 200 qty 33)\`。
4. **precompile がそれを見る** — \`current_best_bid()\` が \`Some((Price(200), Qty(33)))\` を返す。
5. **precompile が book に書く** — \`place_order(Sell @ 200 qty 33)\` を直接呼ぶ（EVM dispatch をシミュレートする）。
6. **bridge が fill を見る** — \`bridge.pending_fill_count() == 1\`。

これが **コースのマイルストーン** だ。L10 を終えれば、47 個の unit test で証明したアーキテクチャが、たった 1 つの integration test でも証明される — 実際の Reth ノード + 実際の bridge + 両方の precompile + 両方の global + マッチングエンジンを、end-to-end かつ in-process で exercise することになる。

これを動かすために必要な **プロダクションコードの変更は 1 つだけ**：\`place_order\` を \`pub(crate)\` にすること。\`live_node.rs\` 内、sibling モジュールにいる integration test から直接呼べるようにするためだ。

## おさらい

L9 後の状態：
- precompile モジュールに \`CLOB_STATE\` と \`FILL_SINK\` がある。どちらも \`Option<Arc<Mutex<T>>>\` 型の global だ。
- bridge の \`new()\` が両方の global に install する。
- unit test 側では、read が動くこと（L6）、write が動くこと（L8）、fill が route されること（L9）まで証明済み。
- **まだテストしていない** のは、実際の Reth ノード上での *組み合わせ*。unit test では Reth の \`NodeBuilder\`、\`EvmFactory\` の dispatch、\`EthereumNode::components()\` の配線を bypass している。

L10 で、その隙間を integration test 1 つで埋める。

## プラン

2 つのファイルに対して、編集を 2 つ：

1. **\`crates/evm/src/precompiles/mod.rs\`** — \`fn place_order\` を \`pub(crate) fn place_order\` に変える。integration test が直接呼べるようにするためで、追加するのは単語 1 つだけ。
2. **\`crates/evm/src/live_node.rs\`** — 既存の \`#[cfg(test)] mod tests\` ブロックに \`bridge_against_custom_evm_node_shares_clob_with_precompile\` テストを追加する。~70 行ぶんで、その多くは setup と 7 つの assertion で占められる。

可視性の変更以外、新しいプロダクションコードはない。**L10 の価値は、新しい挙動ではなく証明にある。**

> 🛑 **考えてみよう。** スクロールする前に — unit test（L3、L6、L9）で個々の部品が動くことはすでに証明した。**なのに、Reth の \`NodeBuilder\` を通る同じコードパスを exercise する integration test がわざわざ必要なのはなぜか?** ヒント：unit test では観測できないものを考える。

（答え：**unit test は、bridge と Reth の executor の間の配線ミスを観測できない。** 各 unit test は precompile を単独で構築するか、bridge を単独で構築するかのどちらかだ。\`NodeBuilder::launch()\` のフローが \`OpenHlEvmFactory\` インスタンスを構築し、bridge が *その* EVM に登録された precompile 経由で *同じ* CLOB を見る、というパスを exercise したものは 1 つもない。\`with_components(...executor(OpenHlExecutorBuilder))\` チェーンのタイポや、\`EthereumAddOns\` の適用が外れてしまう regression は、unit test を green に保ったまま、実際の production パスを壊しうる。**integration test は配線の assertion だ。**）

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

これだけだ。\`pub(crate)\` は「\`openhl-evm\` crate 内なら見えるが、外からは見えない」を意味する。\`pub\` にしない理由は 3 つ：

1. **precompile は \`openhl_precompiles\` が registry に登録するもの。** 外部の caller は名前で直接呼ぶのではなく、registry 経由で \`Precompile::execute(...)\` を使うべきだ。\`pub(crate)\` にしておくことで、その bypass を抑止できる。
2. **関数のシグネチャは REVM 固有のもの**（\`PrecompileFn = fn(&[u8], u64, u64) -> PrecompileResult\`）。広く露出させると、downstream の caller を REVM の呼び出し規約に縛り付けてしまう。
3. **integration test はこの crate 内にある** ので、\`pub(crate)\` はそのテストが必要とする可視性ちょうど — それ以上ではない。

**\`read_best_bid\` は private のままにしておく。** モジュール外のテストから直接呼ぶ予定はないので、可視性は最小に保つ。

> 🛑 **やりがちな勘違い。** 「test ビルドのときだけ見えるよう、\`#[cfg(test)] pub(crate)\` にしなくていいのか?」 — **\`pub(crate)\` はプロダクションバイナリの API surface を広げない。** 可視性アノテーションはコンパイル時のみの情報だ。\`place_order\` が \`fn\` でも \`pub(crate) fn\` でも、生成されるコードは同一になる。**ここで \`#[cfg(test)]\` を加えるのは、利得ゼロの余計な ceremony だ。**

### Step 2: integration test を追加

\`crates/evm/src/live_node.rs\` を開き、ファイル末尾の \`#[cfg(test)] mod tests\` ブロックを探す。その末尾に次のテストを追加する：

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

テストは長いが、各セクションに役割がある。4 つのフェーズに分けて見ていく。

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

**なぜ冒頭で \`uninstall_clob\` と \`uninstall_fill_sink\` の両方を呼ぶのか?** 他のテストが、片方または両方を install したまま終わっている可能性があるからだ。たとえば同じ \`cargo test\` 実行で、L9 の \`place_order_routes_fills_to_installed_sink\` の後にこのテストが走った場合、sink にまだ古い Arc が刺さったままかもしれない。直前の state は信用できない。

**なぜ \`tokio::test(flavor = "multi_thread", worker_threads = 4)\` なのか?** Reth の \`NodeBuilder.launch()\` は async で、バックグラウンドタスク（executor、RPC、mining など）を spawn する。single-threaded な tokio だと、これらでブロックしてしまう。**multi-thread + worker 4 個が、Reth integration-test の標準セットアップだ。** これより少ないとテストが stall するし、多すぎると CI でリソースの無駄になる。

**\`NodeBuilder\` チェーンは、L3 の \`reth_dev_node_with_openhl_executor\` テストと同一だ。** builder メソッドも順序も \`OpenHlExecutorBuilder\` の plug-in 方法も同じ。証明済みのシーケンスを再利用することで、新テストの失敗面を「*L10* で導入する部分 — bridge と precompile の合成」に絞り込める。ノード bootstrap 自体に問題があるわけではない、という前提を再利用できる。

> 🛑 **やりがちな勘違い。** 「このチェーンを書くのは 2 回目なのだから、\`spawn_custom_evm_test_node()\` ヘルパーに切り出すべきでは?」 — **意図的に切り出さない。** Reth の \`NodeAdapter\`（\`launch().await\` が返す型）はおよそ 5 個の phantom パラメータでジェネリック化されている。ヘルパーの戻り型でそれを名指そうとすると、すべての caller がそのジェネリクスに絡め取られる。**インラインの合成は書くのは 1 回ぶん不格好でも、呼び出し site ごとに読むときは綺麗だ。** 3 つ目の caller が現れて型の複雑度が安定してから、ヘルパーを足せばよい。

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

\`LiveRethEvmBridge::new(...)\` の内部では、次の 5 つのことが起きる：
1. \`Arc<Mutex<Book>>\`（CLOB）を作る。
2. \`Arc<Mutex<Vec<Fill>>>\`（fills バッファ）を作る。
3. **\`install_clob\` を呼ぶ** — precompile モジュールの \`CLOB_STATE\` global が、bridge の Book を指すようになる。
4. **\`install_fill_sink\` を呼ぶ** — \`FILL_SINK\` global が、bridge の fills バッファを指すようになる。
5. \`Self { clob, pending_fills, ... }\` を返す。

この 1 回の呼び出しの後、bridge と precompile モジュールは 2 つの global を介して繋がる。

事前条件の \`current_best_bid() == None\` は、クリーンな state から始まっていることを示す — Phase A の uninstall が効いた証拠だ。次に submit_order が bridge の Book に resting bid を生む。事後条件 \`current_best_bid() == Some(...)\` は、precompile が bridge 側の書き込みを見ていることを示す — 同じ Arc を共有しているからだ。

**これが Stage 9d の証明だ。** このノードを通して \`STATICCALL(0x...0c1b)\` を呼ぶスマートコントラクトは、「登録済みの precompile → \`current_best_bid()\` → \`CLOB_STATE\` → bridge の Book → この bid」という経路を辿る。

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

このフェーズが、Stage 9c+（commit \`d19ba1b\`）で追加した部分だ。最初の \`place_order\` 呼び出しが「書き込み precompile を呼ぶスマートコントラクト」をシミュレートする。Sell @ 200 qty 33 が、resting している Buy @ 200 qty 33 にクロスし、Fill がちょうど 1 つ生まれる。

**手で組み立てた calldata は \`place_order_calldata\` が生成するものと同一だ。** ここでは明示性のためにインラインで書いている — 各バイト位置に注釈が付いているので、読み手はヘルパーへジャンプせずに ABI レイアウトを追える。**end-to-end の正しさを証明する integration test では、calldata を明示することのほうが DRY より重要だ。**

\`pending_fill_count()\` が 0 から 1 にジャンプする。**この fill は 5 段の間接を経て、ようやくここに辿り着く：**

\`\`\`
place_order
  → submit_result.fills (Vec<Fill>)
  → FILL_SINK.read() → Some(sink: Arc<Mutex<Vec<Fill>>>)
  → sink.lock().extend(...)
  → bridge.pending_fills と同じ Arc
  → bridge.pending_fill_count() が increment を見る
\`\`\`

これが Stage 9c+ のテーゼを end-to-end で示すパスだ。

> 🛑 **考えてみよう。** \`crate::precompiles::place_order(&calldata, ...)\` の呼び出しに注目してほしい。**なぜ \`Precompiles::get(...).execute(...)\` 経由ではなく、関数を直接呼ぶのか?** ヒント：L3 の unit test では両方やっている。

（答え：**理由は 2 つ。** (1) Stage 9c+ commit の設計上、\`place_order\` は直接呼ばれることを想定している — \`pub(crate)\` にしたのもまさにそのため。registry 経由にすると、\`Precompiles\` セットを構築する、今どの hardfork にいるかを把握する、といった余計な配線が必要になる — そのぶん証明できることが増えるわけでもない。(2) registry のパスが動くこと自体は、すでに L3 で証明済み。**L10 の仕事は「bridge ↔ precompile モジュールの配線」を証明することであって、registry のパスを再証明することではない。** 直接呼び出しのほうがテストの scope を絞り込める。）

### Phase D — Cleanup

\`\`\`rust
        let _ = CLOB_PLACE_ORDER;

        uninstall_fill_sink();
        uninstall_clob();

        drop(handle);
\`\`\`

細かいことが 3 つ：

1. **\`let _ = CLOB_PLACE_ORDER;\`** — address 定数に触れて、load-bearing であることを示す。**なぜか?** テストは \`CLOB_PLACE_ORDER\` を import するが、それ以外では使わないからだ（calldata は precompile address を経由せず、手で組み立てている）。この行がないと clippy が \`unused_imports\` を出す。\`let _ = ...\` はリンタを黙らせつつ「この定数は存在する、消すな」というドキュメント化された使い方として機能する。
2. **逆順で uninstall する。** install 順は clob → fill_sink、uninstall 順は fill_sink → clob だ。**逆順での後始末は Rust の定石**（RAII の drop 順を鏡写しにする）であり、慣用的でコストも低い。
3. **\`drop(handle)\` を明示する。** Rust はスコープ末で handle を drop してくれる。だが名指して書くと、テストのトレース上でもノードのライフサイクルが見える — 読み手に「ここでノード終了」が伝わる。Reth を bootstrap する integration test では、ライフサイクルの節目を旗印として残す価値がある。

## テスト

\`\`\`bash
cargo test -p openhl-evm --release bridge_against_custom_evm
\`\`\`

出力（Reth の bootstrap とテスト実行で ~5 秒後）：

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

L9 より 1 個多い（47 → 48）。**unit test 47 個 + integration test 1 個、すべて green だ。**

よくあるエラーと対処：

- **\`error[E0603]: function 'place_order' is private\`** — Step 1 を忘れている。\`fn place_order\` のシグネチャに \`pub(crate)\` を追加する。
- **\`error[E0277]: 'NodeBuilder<...>' does not satisfy the trait...\`** — NodeBuilder チェーンのタイポ。L3 の \`reth_dev_node_with_openhl_executor\` テストと比べる — 同じチェーン、同じメソッド順だ。
- **テストが永久にハングする** — \`worker_threads = 1\` か single-threaded な tokio を使っている。\`flavor = "multi_thread", worker_threads = 4\` に変える。
- **\`submit_order\` の後で \`current_best_bid()\` が \`None\`** — \`bridge.new()\` 内で \`install_clob\` が実際には呼ばれていない。L4 の bridge 変更を再確認する。もしくは、別のテストが並行で \`uninstall_clob()\` を呼んでいる可能性もある。global を触る全テストで TEST_SERIALIZER パターンを使っているか確認する（ほとんどは L5 で導入済みのはず）。
- **\`place_order\` の後で \`pending_fill_count\` が 0** — おそらく \`bridge.new()\` 内で \`install_fill_sink\` が呼ばれていない（L9 の Step 7）か、\`place_order\` の fill-routing ブロックにバグがある（L9 の Step 3 — \`drop(book)\` が sink lock の前にあることを確認する）。
- **\`assertion failed: bridge.pending_fill_count() == 1\`（実際は 0）** — \`place_order\` の submit が fill を 0 個しか返していないので、何も push されていない。手書きの calldata を確認する：account=7、side=1（Sell）、price=200、qty=33。とくに \`calldata[63] = 1\` を Sell にしているか — 0 だと Buy になり、クロスしない。

## 設計の振り返り

立ち止まりたいポイントが 5 つ：

1. **integration test は、unit test では捕まえられない配線バグを捕まえる。** 各部品が単独で動くことは unit test で証明できる。L10 は初めて *組み合わせで* 動くことを証明するテストだ。L3 の NodeBuilder、L4 の install_clob、L9 の install_fill_sink、稼働中の Reth プロセス間の配線 — そこには unit test が存在しない。**end-to-end のための integration test を 1 本と、部品の正しさのための unit test を多数、というのが標準的な組み合わせ方だ。**

2. **クロスモジュールテストには \`pub(crate)\` がちょうどよい可視性。** \`pub\` を加えると API surface が広がる。\`#[cfg(test)] pub(crate)\` を加えるのは、利得ゼロの ceremony だ（可視性はコンパイル時のみの話）。**\`pub(crate)\` は「この crate 内からなら誰でも呼べるが、外からは呼べない」と宣言する。** クロスモジュールテストに欲しいのは、まさにこれだ。

3. **テストの calldata は「明示 > DRY」。** Phase C の手書き \`[u8; 128]\` calldata は \`place_order_calldata\` が生成するものと同じだが、各バイト位置に注釈を付けてインラインに書くことで、呼び出し site から ABI レイアウトが見える。**システムレベルの正しさを証明するテストでは、各バイト位置がそれ自体「学べる artifact」であるべきだ。** ヘルパーは詳細を隠すためにあり、integration test は詳細を露出させるためにある。

4. **「カスタム EVM ノードと bridge を一緒に spawn する」ヘルパーは作らない。** Reth の \`NodeAdapter\` のジェネリック複雑度が、戻り型の命名を厄介にする。インライン合成は 1 回書くぶんは不格好だが、読むのは簡単だ。**テストコードで早すぎる抽象化を行うコストは、プロダクションコードと同じ — デバッグすべきコードパスが増える。** 3 つ目の caller が現れるのを待ってから抽象化すればよい。

5. **正直に先送りする：RPC の \`eth_call\` ラウンドトリップ。** このテストは Reth の RPC サーバを通らない。JSON-RPC 経由で \`clob_read_best_bid\` を呼ぶ実際の Solidity コントラクトは、追加の配線（RPC サーバ、transaction simulation など）を exercise することになる — そこまでは証明していない。**こちらが証明しているのは「Reth が動くこと」ではなく、「openhl が Reth に正しく plug-in できること」だ。** RPC レイヤは Reth の責任なので、そこまで再テストすると、openhl ではなく Reth を validate することになってしまう。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

L10 を終えると、どちらの diff も **空** になるはず。あなたのコードは Stage 9c+ の HEAD（9c+ の拡張で延長された Stage 9d test 込み）と一致する。**これで Stage 9 が閉じる。** openhl の Stage 9 のすべてのマイルストーン — 9a（カスタム EVM bootstrap）、9b（live な CLOB read）、9c（write path）、9c+（fill を bridge に route）、9d（bridge integration） — を、このコースで一通り再現したことになる。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: このテストは RPC パスをカバーするのか? たとえば web3.js から \`clob_read_best_bid\` を呼ぶ Solidity コントラクト、といったケース。**
No。このテストは Rust から precompile を直接呼んでいる — \`crate::precompiles::place_order(...)\` や \`current_best_bid()\` のように。RPC パス（JSON-RPC サーバ → eth_call → revm dispatch → こちらの precompile）は追加の配線で、しかも Reth 側の責任範囲だ。**RPC レイヤを正しく扱うことは Reth に任せる。** ここまでテストすると、openhl ではなく Reth をテストすることになってしまう — スコープ外。

**Q: \`NodeBuilder.launch()\` が並列で複数回呼ばれたらどうなる（たとえば並列テスト）?**
それぞれの \`launch()\` が別々の Reth プロセスの state を生むが、すべて **プロセスグローバル** な \`CLOB_STATE\` と \`FILL_SINK\` を共有する。**だからこのテストは先頭と末尾で \`uninstall_clob\` と \`uninstall_fill_sink\` を呼んでいる** — 並列テストは global を奪い合いうるからだ。L5 の \`TEST_SERIALIZER\` パターンはこのテストには届かない — \`TEST_SERIALIZER\` は \`live_node.rs\` ではなく、precompile のテストモジュール内にあるからだ。**完全な安全を期すならクロスモジュールな serializer が必要だが、v0 ではこのテストが、たまたまそのモジュール内で両方の global を触る唯一のテストになっている。**

**Q: なぜ \`chain_spec.clone()\` が必要なのか?**
\`NodeConfig::dev().with_chain(chain_spec.clone())\` が、ノードの config 用に clone を 1 つ消費する。\`LiveRethEvmBridge::new(provider, chain_spec)\` がオリジナルを消費する（bridge 側では Arc として保持する）。**\`ChainSpec\` の clone は安価だ**（内部で Arc に包まれているのが普通）。代替案は所有権をやりくりすることになり、テストの認知負荷が増す。ここでは clone が正しい道具だ。

**Q: Phase C は、precompile ではなく bridge 経由で marketable order を submit すれば済むのでは?**
それでも動く — \`bridge.submit_order(Sell @ 200 qty 33)\` でも fill を 1 つ生む。だが、それでは **bridge 側** の書き込みパスをテストすることになり、それは course 7 の領域だ。**L10 でテストしたいのは、precompile 側の書き込みパスが FILL_SINK 経由で bridge の pending_fills まで届くこと** だ。\`place_order\` を直接呼ぶことで、Stage 9c+ の配線そのものが証明される。

## コースマイルストーン — ここで証明されたもの

L10 後の状態：

- **Module 1**：\`OpenHlEvmFactory\` + \`OpenHlExecutorBuilder\` が \`NodeBuilder\` 経由で Reth に plug-in されている。precompile を登録済みのカスタム EVM が boot する。
- **Module 2**：\`read_best_bid\` が \`CLOB_STATE\` global 経由で live な CLOB state を read する。スマートコントラクトから本物の orderbook データが見える。
- **Module 3**：\`place_order\` が live な CLOB state に書き込む。EVM ↔ CLOB のサーフェスが、\`0x...0c1b\`（read）と \`0x...0c1c\`（write）の 2 方向で双方向になる。
- **Module 4**：precompile 経由で発注された order の fill が、\`FILL_SINK\` global を介して bridge の \`pending_fills\` に流れる。EVM 側の trade が payload の fill になる。

47 個の unit test が各部品を証明し、**1 つの integration test が組み合わせを証明する。** このノード越しに各 precompile を呼ぶスマートコントラクトは、bridge がオーケストレートするのと同じ Book を読み書きする。

## 次のレッスン（L11）

L11 は capstone で、**新しいコードはなし**。築いたものを振り返り、先送り項目（RPC ラウンドトリップ、マルチバリデータでの OrderId、transaction-scoped な state shadowing、staticcall での mutation 拒否）を名指し、次のステージで追加する拡張（best_ask / depth / mid-price といった read precompile の追加、\`clob_cancel_order\` precompile、fill を EVM event として出す機構）を一覧する。L11 はメンタルモデルを固め、アーキテクチャを全体として見渡すためのレッスンだ。`,
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

- EVM ↔ CLOB のアーキテクチャを、記憶からホワイトボードに描ける。
- v0 で先送りした 4 項目（RPC ラウンドトリップ、マルチバリデータでの OrderId、transaction-scoped なロールバック、staticcall での mutation 拒否）を名指し、それぞれが範囲外である理由を説明できる。
- 拡張がどこに足されるかを 4 つ描ける（best_ask precompile、depth precompile、clob_cancel_order、fill を EVM event として出す機構）。
- 自分の Reth ベースの L1 でカスタム precompile を出荷する準備ができている。

**このレッスンにコードはなし。** メンタルモデルだけだ。

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

上から下：bridge がデータを所有し、precompile モジュールがプロセスグローバルな handle で公開し、EVM が precompile への call を dispatch する。Solidity コントラクトは、\`ecrecover\` を叩くのと同じ感覚で同じアドレスを叩く。

下から上：スマートコントラクトが \`STATICCALL(0x...0c1b)\` を発行する。Reth の EVM が precompile registry でアドレスを引き、\`read_best_bid\` に dispatch し、\`CLOB_STATE\` から read する — そしてそれは、bridge の \`submit_order\` が書き込んでいるのと同じ \`Arc<Mutex<Book>>\` だ。**翻訳レイヤなし。シリアライゼーションの往復なし。メモリだけ。**

## 各モジュールが届けたもの

**Module 1（Custom EVM bootstrap, L1-L3）** — プラガブルなシーム：

- \`OpenHlEvmFactory\` が \`alloy_evm::EvmFactory\` を実装 — Reth の「1 スロットだけ差し替える」カスタム EVM インターフェース。
- \`OpenHlExecutorBuilder\` が \`reth_node_builder::ExecutorBuilder\` を実装 — NodeBuilder の plug-in 形式。
- \`openhl_precompiles(base)\` が Reth の標準 precompile セットを、hardfork ごとに自分のアドレスを足して拡張する（\`OnceLock\` でキャッシュ）。
- Reth が \`.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))\` で、こちらの EVM 付きで boot する。

**Module 2（Read precompile, L4-L6）** — スマートコントラクトが live な CLOB state を read できる：

- \`CLOB_READ_BEST_BID\` を \`0x...0c1b\` に登録 — 空 calldata を受け取り、64-byte ABI-encoded な \`(price, qty)\` を返す。
- \`CLOB_STATE\` global：\`RwLock<Option<Arc<Mutex<Book>>>>\`、bridge の Book へのプロセスグローバルな handle。
- \`install_clob\` / \`uninstall_clob\` / \`current_best_bid\` — ライフサイクルと read プリミティブを提供する。
- テストで証明済み：uninstalled なら zero output、installed なら live な値、registry 経由の dispatch でも呼び出し可能。

**Module 3（Write precompile, L7-L8）** — スマートコントラクトが CLOB に write できる：

- \`CLOB_PLACE_ORDER\` を \`0x...0c1c\` に登録 — 128-byte の ABI-aligned な calldata \`(account, side, price, qty)\` を受け取り、32-byte の \`(order_id)\` を返す。
- \`NEXT_ORDER_ID: AtomicU64\` — wait-free な ID 割り当て。1 から開始し、\`0\` は rejected sentinel として使う。
- rejection path：入力長不足、無効な side byte、qty=0、CLOB 未インストール。
- テストで証明済み：rejection 時に book は触られない、有効な入力は正しくクロスする、precompile 2 つでのラウンドトリップが成立する。

**Module 4（Bridge integration, L9-L10）** — fill が bridge に戻る：

- \`FILL_SINK\` global：\`RwLock<Option<Arc<Mutex<Vec<Fill>>>>>\` — \`CLOB_STATE\` と並ぶ構造。
- \`LiveRethEvmBridge::new()\` が自身が所有する Arc を、両方の global に install する。
- \`place_order\` は（sink が install されていれば）fill を sink に push し、bridge 側の \`submit_order\` と同じ drain を通って次の \`build_payload\` に届く。
- integration test が、実際の Reth プロセス内でフルチェーンを証明する：合計 48 tests（unit 47 + integration 1）。

## 正直に先送り

v0 でやっていない 4 項目だ。どれも実際のプロダクションギャップにあたる。いずれもコード側でドキュメント化した上で *意図的に* 先送りした。

### 1. RPC \`eth_call\` のラウンドトリップ

**証明したこと**：Rust から直接 \`place_order(...)\` や \`current_best_bid()\` を呼んで動くこと、そして precompile が \`openhl_precompiles()\` で Reth の EVM に登録されること。

**証明していないこと**：JSON-RPC 経由で \`staticcall(0x...0c1b, "")\` を呼ぶ Solidity コントラクトが、実際にこちらの関数まで届くこと。そのパスは Reth の RPC サーバ、transaction simulation、EVM dispatch を含む — そこは Reth が正しく扱ってくれることを信用して任せる部分だ。

**先送りの理由**：このテストは主に Reth を validate するものになり、openhl を validate するものにはならないからだ。こちらの crate と Reth の統合境界は \`openhl_precompiles()\` — そこさえ正しければ、残りは Reth の責任だ。

**いつ見直すか**：Reth を大幅に fork するとき、または precompile registry インターフェースが変わるメジャーバージョンをアップグレードするとき。

### 2. マルチバリデータでの deterministic な OrderId

**現状**：\`NEXT_ORDER_ID: AtomicU64\`、1 から始まるプロセスグローバルなカウンタ。

**問題**：このコードを 2 つの validator で走らせると、それぞれが自分のカウンタを持つ。Validator A が \`OrderId(5)\` をある EVM call に割り当て、Validator B は *同じ* call に \`OrderId(11)\` を割り当てる、ということが起こる。**book が静かに分岐する。** エラーも crash も出ない — read が異なる値を返すまで、ネットワーク全体で state が食い違ったままになる。

**先送りの理由**：openhl v0 は single-validator 前提だからだ。OrderId のマルチバリデータコンセンサスを取るには、(a) EVM call 自体から deterministic に ID を導出する（例：\`keccak(tx_hash, call_index)\`）か、(b) block-scoped な共有 state から ID を読む、のどちらかが必要になる。

**いつ見直すか**：マルチバリデータ deployment の前。**これはネットワーク分岐バグの種そのもの。** \`NEXT_ORDER_ID\` の doc コメントで static の定義場所からこれを名指してあるので、将来コードを読む人もこの制約に気づける。

### 3. Transaction-scoped な state shadowing（revert によるロールバック）

**現状**：\`place_order\` は precompile 実行中に *即座に* Book を mutate する。

**問題**：\`place_order\` 成功後に EVM transaction が revert すると、book 側の mutation はロールバックされない。EVM の通常の storage セマンティクスでは transaction と一緒に revert するが、こちらの Book は EVM storage の外、プロセスグローバルな Arc の中に住んでいるためだ。

**先送りの理由**：storage shadowing を実現するには、(a) Book の mutation を journal しておいて revert 時に replay する、もしくは (b) EVM 実行中はマッチングエンジンを「virtual」モードで動かし、transaction が成功したら commit する、のどちらかが必要だ。どちらも non-trivial。openhl v0 では punt する。

**いつ見直すか**：プロダクションのトラフィックに「order 発注後に途中で fail しうるコントラクト」が混ざってきたとき。**single-actor のシナリオ（マッチングコントラクトが 1 つ、外部とのコンポーザビリティなし）なら問題はない。DeFi のコンポーザビリティシナリオなら絶対に問題になる。**

### 4. \`staticcall\` での mutation 拒否

**現状**：\`place_order\` は、呼ばれ方を問わず Book に書き込む。

**問題**：Solidity の \`staticcall\` は read-only なアクセスを強制するはずだが、EVM は static-call フラグをこちらの precompile には渡してこない。コントラクトが \`STATICCALL(0x...0c1c, ...)\` を発行することは可能で、こちらは何の抵抗もなく book を mutate してしまう — コントラクト側の read-only 期待を裏切る形だ。

**先送りの理由**：REVM の \`PrecompileFn\` シグネチャは \`fn(&[u8], u64, u64) -> PrecompileResult\` で、「これは staticcall か?」のフラグは第 3 引数には入っていない（そこは gas reservoir）。追加のコンテキストを通す必要があり、REVM の修正（fork）か上流 API の対応待ちになる。

**いつ見直すか**：セキュリティ監査が、これを実際の攻撃 vector としてフラグしたとき。**攻撃シナリオは多少作為的** — write precompile として知られているものをわざわざ \`STATICCALL\` するコントラクトはまずない — だが、慎重な監査者なら必ず指摘する。

## 次に来るもの

このコースの後で出荷できる拡張を、複雑度順に 4 つ挙げる。

### Extension 1: \`best_ask\` precompile（1 日）

\`read_best_bid\` を sell 側に鏡写しにするだけ。形は同じ、方向だけ逆。新しいアドレス（\`0x...0c1d\` あたり?）、新しい関数 1 つ、テストコード ~30 行で済む。**\`read_best_bid\` と構造的に並ぶので、ほぼ機械的に作れる。**

### Extension 2: \`clob_depth_at_price\` precompile（2-3 日）

\`(side, price)\` の calldata を受け取り、その価格レベルで rest している qty の合計を返す。market order を発注する前にスリッページを見積もりたいコントラクトに便利だ。\`Book::depth_at_price()\` メソッドと、対応する新しい precompile を足す。**概念的には類似だが、calldata レイアウトに入力パラメータを含む点が新しい拡張ポイント。**

### Extension 3: \`clob_cancel_order\` precompile（1 週間）

\`(order_id, account)\` の calldata を受け取り、その order が caller のものなら book から削除する。成功/失敗を返す。**ここで認可の問題が出てくる** — caller がその order を発注したアカウント本人だと、どう検証するか? EVM call の \`msg.sender\` は precompile を呼び出したコントラクトであって、元のアカウントではない。**\`keccak(account_id, signature)\` のスキーム、または事前登録された認可マッピングのどちらかが必要。** アカウントモデルが固まるまでは、認可設計を先送りする。

### Extension 4: fill を EVM event として出す（2 週間）

現状、fill は \`bridge.pending_fills\` に届き、payload に積まれて block に attach される。**スマートコントラクトからは観測できない。** fill を EVM event として emit すれば、下流のコントラクトが \`eth_getLogs\` や event filter で subscribe できる — ERC-20 transfer を subscribe するのと同じ要領で。

**仕組み**：\`place_order\` の末尾で各 fill を Solidity ABI-encoded な event として encode し、\`revm::interpreter::Interpreter::add_log(...)\` を呼ぶ（あるいは現在の EVM バージョンの相当 API を）。event を emit するコントラクトとしては precompile 自身（アドレス \`0x...0c1c\`）が振る舞う。

**複雑度**：precompile は通常 event を emit しない。この revm API は扱いづらい — \`PrecompileFn\` のシグネチャを拡張する必要があり、結果として revm の小さな fork が必要になる可能性がある。**インパクトは大きい一方、摩擦も大きい。** 明確なプロダクト需要が出るまで先送りする。

## コース完了 — 内在化したこと

このコースで練習したスキルは、CLOB precompile を超えて一般化する：

1. **カスタム EVM の「スロットを 1 つ差し替える」パターン。** Reth の EVM に独自の dispatch を plug-in したいとき — カスタム opcode、カスタムな transaction 検証、カスタム gas pricing など — 道筋は同じだ：\`EvmFactory\` + \`ExecutorBuilder\` + \`.with_components(...)\`。

2. **precompile state のための「プロセスグローバル Arc」パターン。** REVM の関数ポインタシグネチャではクロージャが使えないので、プロセスグローバルな storage が唯一の選択肢になる。**このパターンは複利で効く** — 共有 state を 1 つ（CLOB）作っておけば、もう 1 つ（fill sink）を足すのはほぼ機械的だ。

3. **schema-first なプロトコル設計。** 実装（L8）より先に calldata layout（L7）を固めれば、schema を前提にビルドされたコントラクトは実装の進化で壊れない。**契約は schema にあり、関数 body にはない。**

4. **敵対的テストデータ。** 「best = 最高価格であって最大数量ではない」を証明するための、価格の異なる 2 つの order。fill を流すための maker + taker。各テスト値は「正しさを偶然から切り分ける」役割を果たすべきだ。

5. **ドキュメント上で正直に scope を切ること。** 先送りした項目を、関連するコード site の doc コメントで名指す。**将来の読者は、ギャップとその理由を 1 箇所で読める。** ドキュメント化されていないギャップは、見えない技術負債になる。

## このコースが L1 Architect トラックのどこに位置するか

**Course 1-5**（Reth internals）：Reth の pipeline、payload building、NodeBuilder、evm crate、RPC。

**Course 6-7**（consensus + CLOB）：openhl 固有の機構 — Malachite コンセンサス統合に続いて、マッチングエンジン。

**Course 8（このコース）**：カスタム precompile で EVM ↔ CLOB を橋渡しする。**Reth のプラガブルな EVM シームに触れる最初のコース。**

**Course 9**（funding state machine）：perpetual 固有の機構 — CLOB を perp DEX に変える funding rate 機構。Course 8 の precompile パターンの上に積み上がる。

**Course 10**（capstone — openhl のフル deployment）：1-9 すべてを総動員し、実行可能な openhl ノードとサンプルトレーディングコントラクトを出荷する。

L1 Architect トラックの 80% を踏破した。**ここで学んだパターンが、残りすべての基礎になる。**

## 最終答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/ ./crates/evm/ --recursive
\`\`\`

L11 を終えると、**\`crates/evm/\` ディレクトリ全体が、openhl の Stage 9c+ HEAD と byte-identical** に一致するはずだ。5 つの commit（9a、9b、9c、9c+、9d）を手で再現したことになる — しかも、各行がなぜそこにあるかを完全に理解した上で。

main に戻す：

\`\`\`bash
git checkout main
\`\`\`

## あなたが出荷したもの

unit test 47 個。integration test 1 個。カスタム precompile 2 つ。プロセスグローバル 2 つ。EvmFactory 1 つ、ExecutorBuilder 1 つ。プロダクション Rust コード ~600 行。スマートコントラクトは、同じノード上で動くマッチングエンジンを read/write できるようになった — \`ecrecover\` や BLS12-381 を扱うのと同じ EVM dispatch を通して。

**これが Reth の上に構築したカスタム L1 トレーディングプリミティブだ。** さあ出荷していこう。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
