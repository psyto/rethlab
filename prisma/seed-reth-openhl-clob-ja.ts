// AUTO-GENERATED from drafts/openhl_clob_*_ja.md by .github/scripts/build-openhl-clob-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlClobJA(prisma: PrismaClient) {
  const tags = ["reth","malachite","clob","matching-engine","evm","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-clob-ja",
      title: "OpenHL CLOB を作る — matching engine を追加する",
      description:
        "`building-openhl-consensus` で構築した consensus substrate に、price-time priority のマッチングエンジンを追加する。CLOB を純粋な state machine として実装し、その fill を bridge 経由で consensus にコミットされたブロックまで配線する。DIY Perp シリーズの 2 つ目のコース。",
      difficulty: "EXPERT",
      duration: 365,
      xpReward: 800,
      track: "diy-perp",
      tags,
      isPublished: true,
      sortOrder: 700,
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
                  title: "OpenHL CLOB を作る — substrate の上に matching engine を載せる",
                  slug: "openhl-clob-orientation-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# OpenHL CLOB を作る — substrate の上に matching engine を載せる

前コース (\`building-openhl-consensus\`) は、実 Reth EVM を通じて 0.02 秒で block を確定する single-validator BFT chain で終わった。**ただし確定していたのは空の block。** トランザクションもマッチングも価格発見もない。

本コースで **CLOB (Central Limit Order Book) matching engine** を追加する。CLOB は価格優先・時間優先で板を管理するマッチング方式で、「HYPE を $25 で 10 個買いたい」と「HYPE を $25 で 5 個売りたい」を実際の約定 (fill) に変換する Hyperliquid の核となる仕組み。Stage 8a (701 行) で pure state machine を build し、Stage 8d (171 行) で bridge に組み込む。これで commit された block が matching engine の生成した約定を運ぶようになる。

本コース終了時には \`cargo test clob_fills_flow_into_payload\` が pass する — 実際の約定が matching engine から \`LiveRethEvmBridge::build_payload\` を通って payload に流れ、それを consensus が commit する。

## 1. 終了時に手にするもの

新規 \`crates/clob/\` crate:

- **マイクロ秒で走る price-time-priority matching engine** — pure state machine、I/O なし、完全に deterministic。
- **\`Book\` + \`Order\` + \`Fill\` 型** — CEX が「order book」と呼ぶものに対応。
- **テスト 12 個合格**: hand-trace されたシナリオ 9 個 (空の book、FIFO 優先、market order の流動性枯渇、partial 約定、cancel、マッチ後の no-crossed-book) + proptest invariant 3 個 (256 ケース × 3 = 768 ランダムシナリオ — quantity conservation、no-crossed-book always、determinism = replayability)。

加えて \`crates/evm/\` に新規 integration test:

- **\`clob_fills_flow_into_payload\`** — 実 Reth node を bootstrap し、bridge の CLOB に maker bid + crossing taker sell を submit し、結果の約定が次の \`build_payload\` 出力に現れることを assert、さらに **過去の payload に遡って約定が attach されない** ことを assert (drain semantics は forward-only)。

終了時には次ができるようになる:

- price-time-priority CLOB が on-chain 永久 (perp) 取引所の canonical な構造である理由を説明できる
- 約定を buffer する matching engine (本コースで作るもの) と同期的に emit する matching engine のトレードオフを推論できる
- matching logic をゼロから再現でき、stop order、post-only order、pro-rata matching 等を追加したい場合にコードのどこに手を入れればよいか把握した上で改変できる

## 2. 終了時にも手にしないもの

本コースが扱うのは **Stage 8a + 8d のみ**。以下は扱わない:

- Stage 9: CLOB state を read/write する custom EVM precompile (= course 8)
- Stage 8b: funding rate state machine (= course 9)
- 約定を EVM-executable トランザクションとして encode (= openhl 自体の Stage 9 より先の future work)
- Liquidation、mark-vs-index pricing、レバレッジ上限

本コース終了時には **約定を生成して committed block に運ぶ動く matching engine** が手に入るが、その約定はまだ parallel list — スマートコントラクトから読める Ethereum トランザクションとしては実行できない。これを足すのが course 8 (custom EVM precompile)。

これは honest scoping。実行系への接続を欠いた CLOB engine は物語の半分でしかなく、残り半分 (precompile) は course 8 で扱う。

## 3. 前提

必要なもの:

- **\`building-openhl-consensus\` 完了** — または同等の course 6 end state の workspace。\`crates/evm/src/live_node.rs\` に \`LiveRethEvmBridge<P>\` が \`provider\`、\`chain_spec\`、\`validator\`、optional な \`engine_handle\` フィールド付きで存在すること。なければまず course 6 を完了させる。
- **Rust 1.95+** — course 6 と同じ。
- **\`BTreeMap\`、\`VecDeque\`、\`Reverse<T>\`、proptest に慣れていること。** 「natural ordering」や「最高値から順に辿るための reverse-ordering trick」が初耳なら、まず \`std::collections::BTreeMap\` のドキュメントを軽く読んでおく。

不要なもの:

- 過去の matching-engine 経験 (データ構造はゼロから build する)
- 過去の order book 読解スキル (テストシナリオが各ステップを順に辿る)
- Multi-validator セットアップ (引き続き single-validator)

## 4. セットアップ確認 (今やる)

Course 6 から 2 ディレクトリのワークフローがあるはず:

- \`~/code/my-openhl/\` — workspace
- \`~/code/openhl-reference/\` — read-only な \`psyto/openhl\` clone

Stage 8 commit が clone より新しい場合に備えて、reference repo を最新化する:

\`\`\`bash
cd ~/code/openhl-reference
git fetch origin
git log --oneline | head -15
# SHA 0cac571 (Stage 7d) と 428cc26 (Stage 8d) までの commit が見えるはず。
\`\`\`

それから workspace が course 6 end state にあることを確認:

\`\`\`bash
cd ~/code/my-openhl
cargo test -p openhl-evm --release 2>&1 | tail -10
# 期待: workspace 全体で ~38 個合格、特に:
# - reth_dev_node_bootstraps (course 6 L11)
# - live_bridge_builds_on_real_genesis (course 6 L12-L13)
# - commit_sends_forkchoice_to_engine_when_handle_installed (course 6 L14)
\`\`\`

これらが pass すれば start point として正しい。pass しなければ、まず course 6 を完了させる。

> 🛑 **やりがちな勘違い。** 「\`git clone psyto/openhl\` してそのコードベースに対して course 7 を進めればいい」。 **やれなくはないが、摩擦から得られるはずの学びを取りこぼす。** 本コースは build-along — matching engine を \`my-openhl/\` でゼロから書き、reference に対して diff する。\`openhl-reference\` から start すると course 6 §7 で論じた「答え合わせを写経する」モードに逆戻りする。

## 5. 12 レッスンの全体マップ

| # | モジュール | 何を build するか | レッスン終了時のテスト |
| - | - | - | - |
| **L0** | Orientation | (本レッスン) | セットアップ確認 |
| **L1** | CLOB 型 | newtype 群 — \`AccountId\`, \`OrderId\`, \`Price\`, \`Qty\`, \`Side\`, \`OrderType\` | \`cargo check -p openhl-clob\` |
| **L2** | CLOB 型 | \`Order\`, \`Fill\`, \`FillResult\` | 型がコンパイル |
| **L3** | Matching engine | \`Book\` struct + \`Reverse<Price>\` trick + accessor | \`cargo check -p openhl-clob\` |
| **L4** | Matching engine | \`submit_order\` — Limit order、in-book matching | resting order とマッチする |
| **L5** | Matching engine | \`submit_order\` — Market order + crossing + partial 約定 | エッジケースの挙動 |
| **L6** | Matching engine | \`cancel\` + 空 level の cleanup | cancel-by-id が動く |
| **L7** | テスト | hand-trace された unit test 9 個 | 9 個全部 pass |
| **L8** | テスト | proptest invariant 3 個 (qty conservation、no-crossed-book、determinism) | 768 ランダムシナリオ pass |
| **L9** | Bridge 統合 | \`LiveRethEvmBridge\` に \`clob\` + \`pending_fills\` 追加、\`submit_order\` メソッド | bridge がコンパイル |
| **L10** | Bridge 統合 | \`build_payload\` が pending な約定を drain、\`payload_fills(id)\` インスペクタ | 約定が payload に現れる |
| **L11** | Bridge 統合 | \`clob_fills_flow_into_payload\` integration test | **フルパイプラインテスト pass** |
| **L12** | Capstone | 振り返り、次は何か (course 8 で precompile) | (テストなし — 振り返り) |

**L11 がマイルストーン。** L11 を終えると、matching engine が生成した約定が BFT engine を通って実際の block に流れる。L12 は「まだ何が足りないか」を明示する (約定がスマートコントラクトから読めない — それは course 8)。

## 6. 答え合わせの規律 (course 6 と同じ)

各レッスン L1-L11 は SHA \`55a9dff\` (Stage 8a) または \`428cc26\` (Stage 8d) を cite する。レッスンのテストが pass した後:

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff    # または L9-L11 では 428cc26
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
# (など)
\`\`\`

本質的な部分が一致していればよい — 同じ型、同じ制御フロー。空白や命名は違ってよい。

> 🛑 **やりがちな勘違い。** 「CLOB の仕組みはもう知っているから L9 まで飛ばして bridge 統合だけ学べばいい」。 **やれなくはないが、L1-L8 で encode される設計判断は、エンジンを後で改変するときに効いてくる。** 逆順 bid、price level 内の FIFO、cancel-then-cleanup invariant — どれも自分で build しなければ腹落ちしない。L1-L8 をスキップするとコードは読めても安全に変更できなくなる。

## 7. セットアップ確認 — 実際の L0 演習

L1 に進む前に、以下をすべて走らせて pass することを確認:

\`\`\`bash
# 1. Rust バージョン
rustc --version    # 期待: rustc 1.95.x 以降

# 2. Course 6 end state
cd ~/code/my-openhl && cargo test -p openhl-evm --release 2>&1 | grep -E "^test result"
# 期待: openhl-evm で少なくとも 3 個合格

# 3. Reference repo に Stage 8 commit がある
cd ~/code/openhl-reference && git log --oneline | grep -E "(55a9dff|428cc26)"
# 期待: 両 SHA が現れる
\`\`\`

3 つすべて pass すれば L1 に進む準備 OK。

> **最終チェック。** 本コースが course 6 になかった何を追加するのか、1 文で言えるか? 答えに「約定を生成する matching engine、その約定が committed block に流れる」といった要素が入っていなければ §1 を読み直す。`,
                },
              ],
            },
          },
          {
            title: "CLOB 型",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "レッスン 1 — CLOB の newtype、Side、OrderType",
                  slug: "openhl-clob-types-newtype-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 60,
                  content: `# レッスン 1 — CLOB の newtype、\`Side\`、\`OrderType\`

## ゴール

このレッスンで掴む概念:

- **型安全性としての newtype** — \`u64\` を \`AccountId\` / \`OrderId\` / \`Price\` / \`Qty\` で包むことで、引数を取り違えるバグを「実行時に静かに誤計上される問題」から「コンパイルエラー」へと格上げできる。
- **金銭計算は整数のみで完結させる** — \`Price\` と \`Qty\` は \`u64\` ベース、\`f64\` は使わない。float の中間値が境界に紛れ込めば、engine の厳密整数 invariant (例:「約定は数量を保存する」) は一発で壊れる。
- **役割を名前で示す struct スタイルの enum variant** — \`OrderType::Limit { price }\` は \`Limit(Price)\` よりも、すべての pattern match 箇所で意図が読み取れる。位置ではなく field に *名前* が付いているため。
- **field-level 型と record-level 型を階層化する** — atomic な型は L1 で確定させ、以降のすべてのレッスンで再利用する。record 型 (\`Order\`、\`Fill\`) は L2 でその上に積み上げる。

検証:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

上記の実行結果がクリーンにコンパイルする。

具体的な変更:

新規 crate (\`crates/clob/\`) が workspace に登録され、\`src/types.rs\` 1 ファイルに matching engine が使う **atomic な field-level 型** が入る:

- **\`u64\` を wrap する newtype 4 個** — \`AccountId\`、\`OrderId\`、\`Price\`、\`Qty\`。偶発的な swap を型レベルで防ぐため。
- **\`Side\` enum** (\`Buy\` | \`Sell\`) と \`opposite()\` ヘルパー。
- **\`OrderType\` enum** — \`Limit { price }\` または \`Market\`。
- **\`OrderId\`、\`Price\`、\`Qty\` への \`Display\` impl** — debug 出力が自然に読めるように (\`"#42"\`、\`"1000000"\` 等)。

Record 型はまだ作らない (L2)。Book もまだ作らない (L3 以降)。本レッスンは土台 — 以降の全レッスンがここで build する型を使う。

## おさらい

Course 6 完了時点で、workspace には:

\`\`\`
crates/types/             — BlockHash, PayloadId, PayloadAttrs, ExecutedBlock, PayloadStatus
crates/evm/               — InMemoryEvmBridge, RethEvmBridge, LiveRethEvmBridge
crates/consensus/         — フル BFT engine (Context, signing, codec, node, engine_app)
bin/openhl/               — stub バイナリ
\`\`\`

\`cargo test\` で workspace 全体 ~38 個合格。\`LiveRethEvmBridge::commit\` が \`ForkchoiceUpdated\` を Reth に送る。**ただし \`build_payload\` が生成するのは空 block** — 中身に入れるものがない。

## 計画

5 つやる:

1. **\`crates/clob/\` ディレクトリを作成** — \`Cargo.toml\` と \`src/\`。
2. **\`crates/clob/\` を workspace に登録** — ルート \`Cargo.toml\` の \`[workspace.members]\` に追加。
3. **\`openhl-clob\` を workspace dependency に追加** — 他 crate が依存できるようにルート \`Cargo.toml\` に書く。
4. **\`src/types.rs\` を書く** — newtype 4 個、\`Side\`、\`OrderType\`、\`Display\` impl。**Record 型はまだ書かない** (L2)。
5. **\`pub mod types;\` と re-export を \`src/lib.rs\` に組み込む** — crate の public API を型として公開。

このレッスンが短いのは型が短いから。重要なのはコードではなく **設計判断** (なぜ raw \`u64\` ではなく newtype か、なぜ \`Limit\` が価格を struct field として運ぶのか、\`Qty\` の単位は何か)。

> 🛑 **考えてみよう。** スクロールする前に: 同じ \`u64\` を wrap する newtype が 4 個 (\`AccountId(u64)\`、\`OrderId(u64)\`、\`Price(u64)\`、\`Qty(u64)\`) 並んでいるとき、各 newtype が防ぐ **1 つのバグ** は何か — raw \`u64\` を使うと通り抜けるバグ。ヒント: \`(u64, u64, u64)\` を取る関数を考えて、誰かがその引数を間違った順序で呼ぶ場面を想像する。**newtype パターンの主な役割は、argument-swap バグを compile error に変えること。**

## 手順

### Step 1: Crate ディレクトリ + Cargo.toml を作成

Workspace ルート (\`~/code/my-openhl/\`) から:

\`\`\`bash
mkdir -p crates/clob/src
touch crates/clob/Cargo.toml crates/clob/src/lib.rs crates/clob/src/types.rs
\`\`\`

\`crates/clob/Cargo.toml\` を開いて書く:

\`\`\`toml
[package]
name         = "openhl-clob"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[lints]
workspace = true
\`\`\`

依存なし。CLOB matching engine は純粋データ + 純粋ロジックなので、この段階では \`serde\` も要らない (Stage 8b が funding 用に追加するが、今は不要)。

### Step 2: Workspace に登録

ルート \`Cargo.toml\` を開く。\`[workspace] members = [...]\` を見つけ、リストに \`"crates/clob"\` を追加。既存の順序は保つ (アルファベット順でも挿入順でもよい):

\`\`\`toml
[workspace]
resolver = "3"
members = [
    "bin/openhl",
    "crates/types",
    "crates/clob",      # NEW
    "crates/evm",
    "crates/consensus",
]
\`\`\`

同じルート \`Cargo.toml\` で \`[workspace.dependencies]\` を見つけ、\`openhl-clob\` のパスエントリを追加:

\`\`\`toml
[workspace.dependencies]
# --- Internal crates ---
openhl-types     = { path = "crates/types" }
openhl-clob      = { path = "crates/clob" }     # NEW
openhl-evm       = { path = "crates/evm" }
openhl-consensus = { path = "crates/consensus" }
\`\`\`

これで \`openhl-clob\` を欲しい crate は自分の \`Cargo.toml\` で \`openhl-clob = { workspace = true }\` と宣言できるようになる。L9 で bridge が CLOB を consume するときに使う。

### Step 3: Newtype を書く

\`crates/clob/src/types.rs\` を開く。モジュール doc と newtype 4 個から:

\`\`\`rust
//! Core types for the CLOB matching engine.
//!
//! Pure data — no I/O, no allocation beyond what's needed for fills. The
//! whole module is deterministic by construction: every type's \`PartialEq\`
//! and \`Ord\` impl derives from byte-equal field comparison.

use core::fmt;

/// Account identifier. Opaque to the CLOB; chain integration maps these to
/// EVM addresses, validator addresses, or whatever the chain uses.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct AccountId(pub u64);

/// Sequential order identifier. Caller allocates; the book doesn't generate.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OrderId(pub u64);

/// Price in minor units. For a USDC market, \`Price(1_000_000) = $1.00\`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Price(pub u64);

/// Quantity in minor units.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Qty(pub u64);
\`\`\`

4 つの構造体、各 1 行、すべて \`u64\` を wrap。**7 個の derive は 4 型すべてで同一** — 意図的。newtype パターンが効くのは、型が \`u64\` と **同じ操作** を持ちつつ、型システムが両者の混在を **拒否する** から。

doc コメントで注目する点が 3 つ:

- **\`AccountId\` は opaque** — CLOB は chain が EVM address、ed25519 pubkey、sequential integer のどれを使うかを知らない。equality で比較するだけ。chain 統合 (course 8 の precompile、最終的には production node コード) が \`AccountId(...)\` を chain が欲しい何かにマップする。
- **\`OrderId\` は caller-allocated** — book は ID を生成せず、caller が生成する。これで book が pure-stateless に保たれる: \`submit_order\` は (book, order) の関数であり、(book, order, generator-state) ではない。
- **\`Price\`/\`Qty\` は minor unit** — USDC のような 6-decimal token では \`Price(1_000_000)\` が $1.00 を表す。Matching engine の中に \`f64\` は **存在しない**。**お金の計算に float は持ち込まない。**

> 🛑 **やりがちな勘違い。** 「便利のために \`pub fn from_dollars(d: f64) -> Price\` メソッドを追加しよう。」 **ダメ、f64 の精度問題を engine に持ち込むことになる。** \`Price(1_000_000)\` が wire format。User 向けツールで \`from_dollars\` をやりたければ、ツール側の境界で integer 乗算をして bridge には integer-typed Price を渡す。Matching engine は float に触れない。

### Step 4: \`Side\` enum と \`opposite()\` ヘルパー

\`types.rs\` の続き:

\`\`\`rust
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Side {
    Buy,
    Sell,
}

impl Side {
    #[must_use]
    pub const fn opposite(self) -> Self {
        match self {
            Self::Buy => Self::Sell,
            Self::Sell => Self::Buy,
        }
    }
}
\`\`\`

variant 2 個。\`opposite()\` メソッドは今のところ 1 行だが、後で load-bearing になる: taker order が来たとき、book の **反対側** を順に辿って流動性を探すから。Buy taker は ask を上から順に辿り、Sell taker は bid を上から順に辿る。**ルールを \`opposite()\` に 1 度だけ encode しておけば、book コードを読むときどちらの side を辿るか忘れない。**

\`#[derive(PartialOrd, Ord)]\` を **付けない** のは意図的。「Buy は Sell より小さい?」は無意味な問いだから。trait を抜くことで、caller が \`if side < Side::Sell\` を偶発的に書いて declaration 順 (\`Buy < Sell\`) という意図しない順序付けが効いてしまうのを防ぐ。

> 🛑 **やりがちな勘違い。** 「bool でいいのでは? \`is_buy: bool\` でバイト節約。」 **call site で意味が失われる。** \`submit_order(order, true)\` は読み手にとってゴミに見えるが、\`submit_order(order, Side::Buy)\` なら一目瞭然。enum vs bool の 1 バイトのコストは、bool の可読性コストに比べれば無視できる。**名前のあるものは enum、on/off 以外の名前を持たないものだけ bool。**

### Step 5: \`OrderType\` enum

\`Side\` の impl の下:

\`\`\`rust
/// Order type — describes liquidity-taking + liquidity-providing behavior.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OrderType {
    /// Take liquidity at or better than \`price\`; rest the remainder on the book.
    Limit { price: Price },
    /// Take whatever liquidity is available at any price; never rests.
    Market,
}
\`\`\`

variant 2 個:

- **\`Limit { price: Price }\`** — struct スタイルの enum variant。Order に価格があり、at-or-better でマッチできなければ残りが book に rest する。
- **\`Market\`** — unit variant。価格なし、任意の価格で利用可能な流動性を取り、残りは破棄。

\`Limit { price: Price }\` を tuple スタイル \`Limit(Price)\` ではなく struct スタイルにしたのは意図的。コードが \`order.order_type\` をパターンマッチするとき、\`Limit { price }\` だと field 名 \`price\` がパターンに入る。tuple では \`Limit(p)\` と書いて \`p\` の意味を覚えておかなければならない。**Named field が型を self-documenting にする。**

> 🛑 **やりがちな勘違い。** 「\`Stop\`、\`StopLimit\`、\`Iceberg\`、\`Post-Only\` も足しておけば?」 **engine がまだ必要としていないし、未使用 variant は技術負債になる。** Limit + Market が L7-L8 の spot-trading テストシナリオをカバーする最小セット。openhl が Stop order を必要とする時点 (おそらく perp 領域、course 9 以降) でメンテナが variant を追加すれば、その時点でマッチングロジック、book ロジック、テストシナリオがすべて同時に更新される。**型は使う直前に追加する、それ以前には追加しない。**

### Step 6: User-facing な newtype 3 個に \`Display\` impl

末尾に追加:

\`\`\`rust
impl fmt::Display for OrderId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "#{}", self.0)
    }
}

impl fmt::Display for Price {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl fmt::Display for Qty {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}
\`\`\`

\`Display\` impl 3 個。**\`AccountId\` に Display を付けない** のは意図的。AccountId は opaque な ID なので、print したいなら生の \`u64\` ではなく chain 統合のマッピングが返す実際のアドレスを print したいはず。\`Display\` を抜くと caller が明示的に扱わざるを得なくなる (例: \`format!("{}", a.0)\` または「chain の address renderer 経由で render」)。

\`OrderId\` は \`"#42"\` として format されるのでテスト出力が自然になる (\`fill from #1 to #2\`)。Price と Qty は単なる数値だが、\`Display\` impl があれば \`.0\` を書かずに \`format!\` / \`println!\` で使える。

### Step 7: 型を \`lib.rs\` に組み込む

\`crates/clob/src/lib.rs\` を開く:

\`\`\`rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [\`book::Book\`] for the matching state machine (L3+).

pub mod types;

pub use types::*;
\`\`\`

body 3 行 + doc コメント。\`pub use types::*\` で型を crate ルートで re-export するので、caller は \`use openhl_clob::types::{Order, Side}\` ではなく \`use openhl_clob::{Order, Side}\` と書ける — どこでも短い形を使う。

\`book\` モジュールは L3 で追加する。今は \`pub mod types;\` の 1 行のみ。

## テスト

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

期待:

\`\`\`
   Compiling openhl-clob v0.1.0 (.../crates/clob)
    Finished \`dev\` profile [unoptimized + debuginfo] target(s) in 1.23s
\`\`\`

警告なし、エラーなし。crate の public API は \`AccountId\`、\`OrderId\`、\`Price\`、\`Qty\`、\`Side\`、\`OrderType\` (record はまだなし)。

workspace 全体に影響がないことを確認:

\`\`\`bash
cargo check --workspace
\`\`\`

クリーンに完了するはず。新規 crate に依存するものがまだないので、何にも影響しない。

よくあるエラーと対処:

- **\`error: failed to read 'crates/clob/Cargo.toml'\`** — workspace \`members\` リストの typo、またはファイルが存在しない。Step 2 を再確認。
- **\`error[E0432]: unresolved import 'fmt'\`** — \`types.rs\` 冒頭の \`use core::fmt;\` を忘れている。Step 3 を再確認。
- **\`error[E0277]: 'Price' doesn't implement \`Display\`** — \`OrderId\` には \`Display\` を追加したが \`Price\`/\`Qty\` にしていない。Step 6 を再確認。
- **\`warning: unused import: 'types'\`** — \`lib.rs\` が \`pub mod types;\` ではなく \`mod types;\` (private)。Step 7 を再確認。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Newtype が argument-swap バグを compile time に防ぐ。** \`submit(book, account: u64, price: u64, qty: u64)\` の形だと、3 つの \`u64\` をどの順序で渡してもコンパイルが通る。\`submit(book, AccountId, Price, Qty)\` の形なら間違った型を compile time に拒否できる。コストは \`.0\` deref が数個増えるだけで、利益は書きようがないバグ。

2. **お金の計算は integer であって float ではない。** \`Price\` と \`Qty\` は \`u64\` ベース。\`Price::from_f64\` は存在しない。価格を "$1.00" として表示したいなら、engine の **外** の rendering 境界で integer-to-decimal 変換をする。Matching engine の invariant (例: 「fill 合計は常に数量を保存する」) は exact-integer invariant — float 中間値を導入した瞬間に壊れる。

3. **\`OrderType::Limit { price }\` であって \`Limit(Price)\` ではない。** 後で \`match order.order_type { Limit { price } => ..., Market => ... }\` と書くとき、\`price\` binding が役割を明らかにしてくれる。tuple スタイル enum variant が正しいのは variant が「ある 1 物の wrapper」であるとき。struct スタイルが正しいのは field に **名前** があるとき。ここでは名前がある (\`price\`) ので struct スタイルに分がある。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
diff -u ~/code/my-openhl/crates/clob/Cargo.toml ./crates/clob/Cargo.toml
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
\`\`\`

\`55a9dff\` の参照の types.rs は合計 ~109 行 (全型セット)。L1 後の自分の版は newtype + Side + OrderType + Display impl のみ — 約 65 行。残り ~45 行 (Order、Fill、FillResult) が L2 の範囲。diff で差として現れるはず。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`AccountId\`、\`OrderId\`、\`Price\`、\`Qty\` がすべて \`Copy\`?**
中身は \`u64\` — 8 バイト、heap なし。\`Copy\` をマークすると、engine が \`.clone()\` を書かずに value で自由に渡せるようになる。Trait bound は runtime ではゼロコスト。

**Q: なぜこれらの型に \`Hash\`?**
将来の用途を見据えて: O(1) cancel-by-id (レッスン L6) のための \`HashMap<OrderId, RestingOrder>\`。今 \`Hash\` を足しておけば、後で derive cascade の churn が起こらない。

**Q: なぜ \`Side\` に \`PartialOrd + Ord\` を付けないのか?**
「Buy は Sell より小さい?」が無意味な質問だから。\`Ord\` を derive すると、caller が \`if side < Side::Sell { ... }\` を書けるようになり、Rust が最初に列挙した variant (ここでは Buy) を採用する — だがこれは declaration 順の artifact であって semantic な意味ではない。trait を抜けば caller は \`match\` か \`==\` の使用を強制される。

**Q: なぜ \`opposite()\` に \`#[must_use]\`?**
\`side.opposite();\` (結果を assign しない) がほぼ確実にバグだから — \`opposite()\` は新しい \`Side\` を返すだけで mutate しない。\`#[must_use]\` でそれを warning として浮き上がらせる。返り値が唯一の目的の関数すべてで良いプラクティス。

## 次のレッスン (L2)

Field-level 型 — atomic な部品 — がそろった。L2 ではそれらを組み合わせる **record-level 型** を build する: \`Order\` (matching engine への入力)、\`Fill\` (出力)、\`FillResult\` (fills と remaining-quantity 情報を bundle する wrapper)。L2 完了後、型の語彙が完成する。L3 以降ではこれらの型を使って実際の matching state machine を build していく。`,
                },
                {
                  title: "レッスン 2 — Order、Fill、FillResult",
                  slug: "openhl-clob-types-records-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 20,
                  xpReward: 50,
                  content: `# レッスン 2 — \`Order\`、\`Fill\`、\`FillResult\`

## ゴール

このレッスンで掴む概念:

- **自己完結した message は module 境界をきれいに越える** — \`Fill\` は \`maker_order_id\` と \`maker_account\` の両方を持つ。一方は他方から導出できるが、この冗長性のおかげで Fill の消費者 (precompile、payload 組み立て) を engine 内部の index から切り離せる。
- **「約定の集合」と「残量」を分けるのは型レベルの判断** — \`FillResult { fills, remaining_qty }\` は submit の異なる 2 つの出力を明示する。\`Vec<Fill>\` に残量を擬似 entry として埋め込むより明瞭。
- **派生値はキャッシュせず算出する** — \`total_filled()\` は method であって field ではない。キャッシュすると約定集合を変更するたびに counter の同期が必要になるが、都度計算すれば \`FillResult\` を pure data record のまま保てる。
- **\`Copy\` は便利さではなく意味論を反映する** — \`Order\` (5 つの小 field、約 48 バイト) は \`Copy\`。\`FillResult\` は \`Vec<Fill>\` を所有するので非 \`Copy\`。\`Copy\` を付けるのは \`=\` が 1 回の bit-blit で済む型のみ。

検証:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

上記の実行結果が引き続きコンパイルする。

具体的な変更:

\`crates/clob/src/types.rs\` に L1 の newtype から build した **record 型 3 個** が入る:

- **\`Order\`** — matching engine への入力 (id、account、side、qty、order_type)。
- **\`Fill\`** — maker と taker の間で発生した 1 match の出力 (maker_order_id、taker_order_id、maker_account、taker_account、price、qty)。
- **\`FillResult\`** — submit の return ラッパー: \`fills: Vec<Fill>\` + \`remaining_qty: Qty\` + \`total_filled()\` ヘルパー。

これで **型の語彙** が完成する。L3 以降はこれらの型を使って matching state machine を build していく。

## おさらい

L1 完了時点で \`crates/clob/src/types.rs\` には:

\`\`\`rust
// L1 — field-level 型
pub struct AccountId(pub u64);
pub struct OrderId(pub u64);
pub struct Price(pub u64);
pub struct Qty(pub u64);
pub enum Side { Buy, Sell }
pub enum OrderType { Limit { price: Price }, Market }
// + OrderId, Price, Qty への Display impl
\`\`\`

約 65 行。\`cargo check -p openhl-clob\` が pass する。**足りないもの**: これらを組み合わせる型 — order がどう見えるか、fill がどう見えるか、engine が submit 後に何を返すか。L2 でちょうどそのギャップを埋める。

## 計画

同じ \`types.rs\` に record を 3 個追加する:

1. **\`Order\`** — 5 field、すべて L1 の型を使う。Matching engine が 1 つの \`Order\` を取り、1 つの \`FillResult\` を返す。
2. **\`Fill\`** — 6 field、maker と taker を明示的に名付ける。maker_order_id と maker_account の **両方** を保存するのは、chain 統合 (course 8) が account を credit/debit するため。
3. **\`FillResult\`** — fill 群と、マッチも rest もしなかった残りを集める。\`total_filled()\` ヘルパー付きで、caller が iterate せずに「いくらマッチしたか?」を尋ねられる。

新規依存なし。\`types.rs\` の外でのコード変更なし。コード ~35 行。

> 🛑 **考えてみよう。** スクロールする前に: \`Fill\` は \`maker_order_id\` と \`maker_account\` の **両方** を運ぶ。なぜ重複させるのか? Maker の \`OrderId\` で account を lookup できれば十分なのでは? ヒント: \`Fill\` を consume する側は誰か。Chain の \`clob_place_order\` precompile (course 8) は balance を credit する — account が直接必要。\`OrderId → AccountId\` の lookup を許すと、precompile が order book の内部 index への参照を保持しなければならない。**両方を Fill 自体に持たせることで consumer が engine の内部 state から decouple される。** Message passing と shared state の発想の違い。

## 手順

### Step 1: \`OrderType\` の下に \`Order\` を追加

\`crates/clob/src/types.rs\` を開く。\`OrderType\` enum の後、\`Display\` impl の前に追加:

\`\`\`rust
/// A new order entering the book or arriving as a taker.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Order {
    pub id: OrderId,
    pub account: AccountId,
    pub side: Side,
    pub qty: Qty,
    pub order_type: OrderType,
}
\`\`\`

5 field。**全部 \`Copy\`** — Order は 8 (OrderId) + 8 (AccountId) + 1 (Side) + 8 (Qty) + 16 (OrderType — discriminant + Price) = 41 バイト。padding 込みで約 48 バイト。値渡しで自由に渡せる小ささだ。通常コードで \`Box<Order>\` や \`&Order\` を使う必要はない。

field 順序には意味がある:
- **\`id\` を最初に** — 最も使われる field (lookup、equality、debug)。
- **\`account\`** — 誰が発注したか。
- **\`side\`** — Buy か Sell か。
- **\`qty\`** — いくら。
- **\`order_type\` を最後に** — 最も複雑な field (enum) で、dispatch を制御する field (Limit と Market が L4-L5 で別の matching ロジックを起動する)。

> 🛑 **やりがちな勘違い。** 「\`order_type\` は冗長では — \`OrderType::Limit { price }\` が price を運ぶなら、\`price: Price\` を直接 \`Order\` に置けばいいのでは?」 **Market order には price がないから。** \`price: Price\` を Order に置くと、すべての Market order に意味のない placeholder price を持たせる羽目になり、それを至るところで ignore しなければならない。enum なら「price があるか、ないか」をちょうど 1 回 encode できる。**\`Option<Price>\` でも動くが「Market」というタグを失う** — \`OrderType\` が正しい形なのは、区別に **名前** がある (presence/absence ではない) から。

### Step 2: \`Fill\` を追加

\`Order\` の下:

\`\`\`rust
/// A fill between a maker (resting order) and a taker (incoming order).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Fill {
    pub maker_order_id: OrderId,
    pub taker_order_id: OrderId,
    pub maker_account: AccountId,
    pub taker_account: AccountId,
    pub price: Price,
    pub qty: Qty,
}
\`\`\`

6 field。Maker-vs-taker の区別は matching engine コードで最も重要な概念:

- **Maker** = 既に book に rest していた order。流動性を「作った (made)」側で、経済的に良い deal を得る (実際の取引所では通常 rebate)。
- **Taker** = 流動性を消費して入ってきた order。Spread を払う側で、実際の取引所では fee を払う。

各 \`Fill\` は 1 つの match ペアを表す。1 つの taker order が **複数の Fill** を生成することもある (例: market buy が ask 側を上に向かって走査し、resting ask を順に食べる)。

**\`price\` は maker の価格** — taker が book を hit するとき、taker の limit ではなく maker の resting 価格でマッチする。$101 の limit-buyer が $100 の resting limit-seller とマッチすると $100 で約定する (maker の価格)。buyer が勝つわけだ。これが「price-time priority」の挙動。

> 🛑 **やりがちな勘違い。** 「両方の account ID を保存するのは冗長に見える — 各 \`Fill\` は consume 時に \`OrderId\` から account を lookup できる」。 **ダメ — そのためには consumer が book の \`HashMap<OrderId, RestingOrder>\` への参照を保持し、book が先に進んだ後も生かしておかなければならない。** Fill は match 時に emit され非同期に consume される (本コースでは後で commit される payload に drain される)。Book がその間に maker order を cancel していたら、\`OrderId → AccountId\` lookup は \`None\` を返し、consumer は詰む。**Self-contained な Fill ならその問題は起きない。**

### Step 3: \`FillResult\` + \`total_filled()\` ヘルパー

\`Fill\` の下:

\`\`\`rust
/// Result of submitting a taker order.
///
/// \`fills\` is the list of matched fills, in order of execution. \`remaining_qty\`
/// is the leftover taker quantity that was *not* rested on the book (Market
/// orders discard their remainder; fully-filled Limit orders return zero).
/// A partially-filled Limit order that rested on the book also returns zero
/// here — the remainder is in the book, not in the return value.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FillResult {
    pub fills: Vec<Fill>,
    pub remaining_qty: Qty,
}

impl FillResult {
    /// Total quantity matched across all fills.
    #[must_use]
    pub fn total_filled(&self) -> Qty {
        Qty(self.fills.iter().map(|f| f.qty.0).sum())
    }
}
\`\`\`

**\`FillResult\` は \`Copy\` ではない** — heap 割り当てされる \`Vec<Fill>\` を所有するから。test とデバッグパスのために \`Clone\` を付け、engine は値で return する (happy path で clone は不要)。

doc コメント中の 3 点に L3+ のコードが依存する:

1. **\`fills\` は execution 順序**。Market buy が ask level を 3 個走査すると、fills[0] が最安マッチ、fills[1] が次、fills[2] が最高となる。Replay determinism にこの順序が重要 (L8 の proptest で assert する)。
2. **\`remaining_qty\` は rest しなかった taker quantity のみ**。Market order の remainder 100 は「100 unit がどの価格でもマッチできなかった (book が流動性切れ)」を意味する。Limit order でも remainder が 0 だが約定しなかった残りがあり得る — ただしその残りは **今 book にある** (resting order として) のであって、return 値の中にあるわけではない。
3. **\`total_filled\` はヘルパーであって stored field ではない**。約定全体に対する O(N) 合計。cache しない理由は、(a) caller が「約定したか?」を聞くだけなら通常 \`Vec::len()\` で済む、(b) 実際の quantity total は test/inspection コードでしか必要にならず、そこでは O(N) が問題にならない、から。

> 🛑 **やりがちな勘違い。** 「\`remaining_qty\` を別 field ではなく per-fill data の一部にしたら?」 **submit ごとに remainder は最大 1 つで、どの約定にも紐付かない** — **約定しなかった** 部分そのものだから。\`Fill\` に入れると、すべての約定に無意味な 0 を運ばせるか、保持するためだけの「phantom fill」エントリを作る羽目になる。\`FillResult\` に別 field として置くのが正しい形。

### Step 4: \`lib.rs\` がまだすべて re-export していることを確認

L1 の \`lib.rs\` で \`pub use types::*;\` と書いた。その \`*\` が今追加した 3 つの新規型を自動的に拾う — edit は不要。一応確認しておく:

\`\`\`rust
// crates/clob/src/lib.rs (変更不要)
pub mod types;
pub use types::*;
\`\`\`

もし \`lib.rs\` が \`pub use types::{AccountId, OrderId, ...};\` のような個別 re-export であれば、新規 3 個を追加する必要がある。**だが L1 で \`*\` を setup したので不要。**

## テスト

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

引き続きコンパイルが通る。出力は L1 と同じ (新規 warning も error もなく、check されるコードが少し増えただけ)。

将来 \`crates/evm/Cargo.toml\` の視点で型が見えていることを軽くサニティテストできる。まだ dep は追加しない (それは L9 で行う) が、型が public であることは確認できる:

\`\`\`bash
cargo doc -p openhl-clob --no-deps --open
\`\`\`

レンダリングされた doc を browse する。"Structs" の下に \`AccountId\`/\`OrderId\`/\`Price\`/\`Qty\` と並んで \`Order\`、\`Fill\`、\`FillResult\` が見えるはず。\`total_filled\` は \`FillResult\` のメソッドの下に出てくる。

よくあるエラーと対処:

- **\`error[E0277]: 'FillResult' doesn't implement 'Copy'\`** — \`FillResult\` に \`#[derive(Copy)]\` をつけた。**Copy にできない** のは内部の \`Vec<Fill>\` のため。derive から \`Copy\` を外し、\`Clone\` だけ残す。
- **\`error[E0599]: no method named 'total_filled' for ...\`** — ヘルパーを \`impl FillResult { ... }\` の外に書いた。関数は impl ブロック内が必要。
- **\`warning: field 'X' is never read\`** — field を書いたが test/usage が参照していない。**今は無視** — L3+ がすべて使う。Matching engine にまだ consumer がない。

## 設計の振り返り

3 つの load-bearing な決定:

1. **\`Fill\` は self-contained。** Order book の内部 index があれば片方からもう片方を導出できるのに、maker_order_id と maker_account を両方保存している。これにより Fill の consumer (precompile、payload assembly、chain 統合) が engine の内部データ構造から decouple される。**self-contained なメッセージは、live state への参照よりも module 境界を越えやすい。**

2. **\`FillResult\` は「fills」と「remainder」を分ける。** Submit は 0 個以上の fill と 0 か 1 個の remainder を生成する。1 つの \`Vec<Fill>\` でモデル化すると、remainder のために「phantom fill」を作るか、それを検出する特殊ケースロジックが必要になる。2-field record にすることで型に仕事をさせている。

3. **\`total_filled()\` は computed であって cached ではない。** Cache するとすべての約定リスト変更でカウンタを update する羽目になり、error-prone になる。On-demand 計算なら \`FillResult\` を derived state のない純粋データ record に保てる。O(N) コストは N が通常 1-3 (single 約定が最頻で、market order が 10 level 食べるのは稀) なので無視できる。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
\`\`\`

L2 後、自分の types.rs は参照の ~109 行に近づくはず。diff は doc コメントの言い回し / 空白だけになるべき。**L1 + L2 で types.rs 完成**。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`Order\` は \`Copy\` で \`FillResult\` はそうでないのか?**
\`Order\` は 5 field すべてが \`Copy\` (\`u64\` の newtype + 小さい enum)。合計 ~48 バイトで memcpy が安価。\`FillResult\` は heap 割り当てされる \`Vec<Fill>\` を所有するので、コピーには allocator 呼び出しが必要。\`Copy\` は \`=\` が single bit-blit になる型にのみ付ける。Trait が意味を反映するわけだ。

**Q: なぜ \`Fill\` の \`qty\` は \`Qty\` で、ただの \`u64\` ではないのか?**
Engine の他の部分と一貫させるため。すべての quantity は \`Qty\` 型なので、ここで \`u64\` を混ぜると境界で変換が強制される (そして忘れるリスクが出る)。Newtype の規律は engine 単位で適用するもので、struct 単位ではない。

**Q: \`FillResult\` で \`Box<[Fill]>\` を使ったらどうか?**
できる。「これ以上 push しない」ケースでは少しメモリ効率が良い。ただし \`Vec<Fill>\` は \`submit_order\` がインクリメンタルに build するもの (match ごとに push) なので、最後に \`Box<[Fill]>\` に変換すると余分な allocation が 1 つ増える。Profile で問題と分かるまでは \`Vec\` がシンプルな選択。

**Q: Fill の \`qty\` が 0 だったら? それは valid Fill か?**
valid ではない — L4-L5 の matching engine は zero-qty Fill を決して生成しない (「0 unit マッチした」=「マッチしなかった」と意味的に同じ)。型システムはこれを強制しないが、engine の invariant が強制する。L7-L8 のテストが regression を catch する。

## 次のレッスン (L3)

型の語彙が完成した。L3 では **matching state machine** を導入する — resting bid/ask order を保持する \`Book\` 構造体と、book を inspect するヘルパーメソッド (\`best_bid\`、\`best_ask\`、accessor)。\`submit\` ロジックはまだ書かない (L4 で扱う)。データ構造と、bid を最高値から順に辿るための \`Reverse<Price>\` トリックだけを導入する。`,
                },
              ],
            },
          },
          {
            title: "Matching engine",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "レッスン 3 — Book struct と Reverse<Price> トリック",
                  slug: "openhl-clob-book-struct-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 3 — \`Book\` struct と \`Reverse<Price>\` トリック

## ゴール

このレッスンで掴む概念:

- **\`BTreeMap\` 2 個が matching engine の状態のすべて** — order-id の index も、best-price のキャッシュも、片 side ごとの counter も持たせない。それ以外はすべて派生値。最適化はコアモデルを変えずに後から重ねられる。
- **\`Reverse<Price>\` によって iterator は bid を高値から順に走査できる** — *key 型* の \`Ord::cmp\` を反転させることで、両 side が \`BTreeMap::iter().next()\` という同じ形で動く。型側に非対称性を 1 つ仕込むだけで、matching コードの対称性が手に入る。
- **\`RestingOrder\` は \`Order\` を trim して「不可能な状態」を表現不能にする** — resting order に \`side\` は不要 (どちらの map にあるかで分かる)、\`order_type\` も不要 (Market は rest しない)。型設計とは制約のエンジニアリングそのもの。
- **FIFO queue は \`Vec\` ではなく \`VecDeque\`** — \`Vec::remove(0)\` は全要素を shift するため O(n)。\`VecDeque::pop_front()\` は O(1)。price-time priority は push-back と pop-front の両方が速くないと成立しない。

検証:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

上記の実行結果が引き続きコンパイルする。

具体的な変更:

新規ファイル \`crates/clob/src/book.rs\` に以下が入る:

- **\`Book\` struct** — \`BTreeMap\` 2 個 (bids + asks)。それぞれ price level を resting order の \`VecDeque\` にマップする。
- **\`RestingOrder\` struct** — book に rest している order の形 (\`Order\` から trim したもの)。
- **\`new()\` コンストラクタ** と read-only accessor 4 個 (\`best_bid\`, \`best_ask\`, \`depth_bid\`, \`depth_ask\`)。

**matching ロジックはまだ書かない** — \`submit\` は L4 + L5、\`cancel\` は L6 で扱う。本レッスンの目的は、後続の matching ロジックが少ない行数で済むようにデータ構造を正しく組むこと。

## おさらい

L2 完了時点で \`crates/clob/src/types.rs\` は完成している (~109 行): newtype 4 個、\`Side\`、\`OrderType\`、\`Order\`、\`Fill\`、\`FillResult\`、\`Display\` impl。

\`crates/clob/src/lib.rs\` は \`pub use types::*\` でそれらすべてを re-export している。**\`book\` モジュールはまだ存在しない** — 本レッスンで作る。

## 計画

5 つやる:

1. **\`crates/clob/src/book.rs\` を作成。**
2. **\`Book\` struct を書く** — \`bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>\` と \`asks: BTreeMap<Price, VecDeque<RestingOrder>>\`。
3. **\`RestingOrder\` struct を書く** — \`Order\` から trim したもの (side なし、order_type なし、qty は縮む)。
4. **\`Book::new()\`** と accessor メソッド 4 個を追加。
5. **\`pub mod book;\`** を \`lib.rs\` に組み込む。

Accessor は \`Option<Price>\` または \`usize\` を返す — BTreeMap の形に対する純粋な read 操作。興味深い設計判断は **map key 型** と、\`RestingOrder\` が \`Order\` から何を残し何を落とすか、の 2 点。

> 🛑 **考えてみよう。** スクロールする前に: \`BTreeMap\` は key を **natural order** (小さい順) で iterate する。**ask** (最安価格を最初に欲しい) には \`BTreeMap<Price, _>\` がぴったり — natural order がそのまま最安先に辿ってくれる。**bid** は **最高価格を最初に** 欲しいが、natural order は最安先に辿る。**カスタム comparator を書かずに BTreeMap を最高先に辿らせる最も安価な方法は?** ヒント: 「u64 の ordering を反転する」を型として考える。

## 手順

### Step 1: モジュール doc と import で \`book.rs\` を作成

\`touch crates/clob/src/book.rs\` (またはエディタで作成)。ファイル先頭:

\`\`\`rust
//! Price-time priority orderbook + matching engine.
//!
//! Bids are stored with a \`Reverse<Price>\` key so \`BTreeMap\` natural-order
//! iteration walks them best-first (highest price first). Asks are stored
//! with \`Price\` directly so they also walk best-first (lowest price first).
//! Within each price level, orders are queued FIFO — that's the "time
//! priority" half of price-time priority.

use core::cmp::Reverse;
use std::collections::{BTreeMap, VecDeque};

use crate::types::{
    AccountId, Fill, FillResult, Order, OrderId, OrderType, Price, Qty, Side,
};
\`\`\`

注目すべき点:

- **\`core::cmp::Reverse\`** — 任意の \`Ord\` 型の ordering を反転する wrapper。\`Reverse(Price(100))\` は \`Reverse(Price(200))\` **より大きい** と比較される (Reverse が underlying な比較を反転するため)。
- **\`BTreeMap\`** — sorted map。Iteration は key を昇順 (= **natural order** = \`Ord::cmp\` が「小さい順」と言う順) に走査する。Insert/remove/lookup はすべて O(log n)。
- **\`VecDeque\`** — 両端 queue。価格 level 内の「time priority」に使う: 新規 order は \`push_back\` (列の末尾) し、マッチした order は \`pop_front\` (列の先頭から fill) する。
- **L1 + L2 のすべての型** — 本レッスンで直接使わないもの (\`Fill\`、\`FillResult\`、\`Side\` 等) も含む。最終的な import リストに合わせて今のうちに import しておく。L4-L6 の matching コードですべて使う。

> 🛑 **やりがちな勘違い。** 「\`BTreeMap\` ではなく \`HashMap\` を使えばいいのでは? Hash lookup は O(1) で BTreeMap の O(log n) より速い」。 **lookup だけでなく、価格順に iterate する必要がある。** 「best bid」を見つけるとは「最高価格の bid」を見つけること。HashMap には「次のソート済み key」という概念がなく、全 key を scan (O(n)) して最大を見つけるしかない。BTreeMap の sorted iteration なら best を O(1) lookup (\`keys().next()\`) で得られる — これが matching のコストを安く抑える鍵。

### Step 2: \`Book\` struct を書く

続けて:

\`\`\`rust
#[derive(Debug, Default)]
pub struct Book {
    /// Bids: \`Reverse<Price>\` key gives best-first iteration (highest first).
    bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>,
    /// Asks: \`Price\` key gives best-first iteration (lowest first).
    asks: BTreeMap<Price, VecDeque<RestingOrder>>,
}
\`\`\`

Matching engine の状態全体が **BTreeMap 2 個** に収まる。それだけだ。Order-id index も、別の「best price」cache も (BTreeMap が既に best を O(1) で返してくれる)、tick-size table もない。

Bids と asks の非対称性 — \`Reverse<Price>\` vs. \`Price\` — は奇妙に見えるが、これこそが load-bearing なトリック:

- **Asks: \`BTreeMap<Price, _>\`。** Natural-order key で iteration が \`Price(99)\`, \`Price(100)\`, \`Price(101)\`, ... と進む。最安 ask が欲しい buy-taker は \`asks.keys().next()\` → \`Price(99)\` を読む。Best-first。
- **Bids: \`BTreeMap<Reverse<Price>, _>\`。** \`Reverse<Price>(p)\` の natural order は **p の降順** になる: \`Reverse(Price(101))\` が \`Reverse(Price(100))\` より前、\`Reverse(Price(100))\` が \`Reverse(Price(99))\` より前。最高 bid が欲しい sell-taker は \`bids.keys().next()\` → \`Reverse(Price(101))\` を読む。Best-first。

**どちらの side も \`keys().next()\` で best price を取れる。** これが型の非対称性を正当化する API の対称性だ。\`Reverse\` なしだと bid lookup が \`keys().next_back()\` (BTreeMap iterator の逆方向走査) になり、matching コードが side 間で非対称になる — 混乱しやすく、間違えやすい。

\`#[derive(Default)]\` を付けるのは \`Book::new()\` (次のステップ) を \`Self::default()\` だけで済ませるため。コンストラクタで \`BTreeMap::new()\` を 4 回書かなくてよい。\`BTreeMap\` の Default は空 map なので、\`Book\` 全体の \`Default\` も同様になる。

### Step 3: \`RestingOrder\` struct を書く

\`Book\` の下:

\`\`\`rust
/// An order resting on the book. Trimmed from \`Order\` — side and \`order_type\`
/// are implicit from which side of the book it's resting on, and \`qty\` shrinks
/// as fills consume it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct RestingOrder {
    id: OrderId,
    account: AccountId,
    qty: Qty,
}
\`\`\`

field 3 個、**pub ではない** (内部型なので、caller が \`RestingOrder\` を直接触らない)。

\`Order\` から落としたもの:

- **\`side\`** — 削除。RestingOrder の side はどちらの map に入っているか (bids か asks か) で分かる。2 回保存するのは冗長で error-prone。
- **\`order_type\`** — 削除。Resting order は定義上常に Limit order になる (Market order は決して rest しない — 取れる分だけ取って残りは破棄するから)。\`order_type\` を保存すると \`OrderType::Market\` の \`RestingOrder\` を作れてしまうが、それは無意味。
- **\`qty\` は残す** — ただし **部分 fill される度に時間と共に縮む**。L4 の submit コードは、maker が taker の qty の 100% 未満しか食わなかったときに \`RestingOrder.qty\` を直接 mutate する。

> 🛑 **やりがちな勘違い。** 「元の \`Order\` を book に保存して \`qty\` を modify すればよいのでは?」 **\`Order\` は \`Copy\` (field 5 個、すべて stack-safe) であり、Copy field を mutate するのは注意深い reviewer の目にバグとして映る。** 具体的には、\`Order\` が queue 内に保存されていると、matching コードが \`*order_in_queue.qty.0 -= fill_qty.0\` のように書くことになる — だがこれは \`Copy\` で安く clone できるはずのデータを mutate していることになる。\`RestingOrder\` を別型にすることで「これは mutate される」という性質を明示する: \`RestingOrder\` がそのために **ある** 以上、caller は \`RestingOrder.qty\` が縮むことを当然と思う。

### Step 4: \`new()\` と accessor 4 個を追加

\`book.rs\` に append:

\`\`\`rust
impl Book {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    #[must_use]
    pub fn best_bid(&self) -> Option<Price> {
        self.bids.keys().next().map(|rp| rp.0)
    }

    #[must_use]
    pub fn best_ask(&self) -> Option<Price> {
        self.asks.keys().next().copied()
    }

    #[must_use]
    pub fn depth_bid(&self) -> usize {
        self.bids.values().map(VecDeque::len).sum()
    }

    #[must_use]
    pub fn depth_ask(&self) -> usize {
        self.asks.values().map(VecDeque::len).sum()
    }
}
\`\`\`

メソッド 5 個、すべて \`#[must_use]\`:

- **\`new()\`** — \`Self::default()\`。\`Book { bids: BTreeMap::new(), asks: BTreeMap::new() }\` と書いてもいいが、\`#[derive(Default)]\` が均一に処理してくれる。
- **\`best_bid()\`** — \`keys().next()\` が natural-order の最小 key を返す。Bids は \`Reverse<Price>\` を使うので、その key は最高 price を wrap する。\`.map(|rp| rp.0)\` で unwrap する — \`rp.0\` が \`Reverse\` wrapper を剥がす。
- **\`best_ask()\`** — 同じパターン。ただし key が \`Price\` そのもの。\`keys().next()\` が最小 \`Price\` を返し、\`.copied()\` で値として取り出す (これがないと \`Option<&Price>\` になる)。
- **\`depth_bid()\` / \`depth_ask()\`** — 全 price level にわたる queue 長の合計。Inspection 用で、テストとデバッグで使う。

**なぜ best を \`Option<Price>\` にするのか?** Book が空のとき、best price は存在しないから。\`Option::None\` が正しい答え。\`Price(0)\` や \`Price(u64::MAX)\` を返すと、caller が誤って実際の価格として扱う恐れがある。型が空ケースのハンドリングを強制してくれる。

> 🛑 **やりがちな勘違い。** 「\`depth_bid\` は O(n) — 遅い」。 **テストと inspection でしか呼ばないので、そこでは O(n) は問題にならない。** Matching engine 本体は \`depth_bid\` を決して呼ばない — \`keys().next()\` と \`front()\` を O(1)/O(log n) で順に辿るだけだ。\`depth_bid\` が hot path にあるなら counter を追加して push/pop ごとに bump するが、そうではないのでやらない。

### Step 5: \`lib.rs\` に組み込む

\`crates/clob/src/lib.rs\` を開く。L1 + L2 の内容:

\`\`\`rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [\`book::Book\`] for the matching state machine (L3+).

pub mod types;

pub use types::*;
\`\`\`

新規モジュールに **1 行**、public な \`Book\` 型に **re-export 1 個** を追加:

\`\`\`rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [\`book::Book\`] for the matching state machine.

pub mod book;
pub mod types;

pub use book::Book;
pub use types::*;
\`\`\`

順序は意図的: \`book\` がアルファベット順で先、\`types\` が次。Rust crate の import は、通常 crate-level module をアルファベット順に並べると読みやすい。

**\`Book\` のみ re-export し、\`RestingOrder\` はしない。** \`RestingOrder\` は内部 queue 要素であり、matching engine の外から誰も construct したり read したりすべきではない。\`book.rs\` 内で \`pub struct\` ではなく \`struct\` のままにしておけば、その意図が明示される。Compiler が「このモジュールの外で誰も RestingOrder を触らない」を強制してくれる。

## テスト

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

期待: clean compile、warning なし。

**unused import** の warning が出るかもしれない — L3 では \`book.rs\` が \`Fill\`, \`FillResult\`, \`Order\`, \`OrderType\`, \`Qty\`, \`Side\` を import するが、まだ使っていないため:

\`\`\`
warning: unused import: \`Fill, FillResult, Order, OrderType, Qty, Side\`
 --> crates/clob/src/book.rs:11:5
\`\`\`

**対処の選択肢が 2 つ:**

1. **今は warning を抑制する** — use 文の上に \`#[allow(unused_imports)]\` を追加。L4 ですべて使い始めたら削除。
2. **今は未使用 import をコメントアウトする** — L4-L6 で必要に応じて uncomment。

SHA \`55a9dff\` の参照は import をすべて残している (ファイルがその SHA で完成しているため)。Build-along では選択 1 のほうが参照に近いが、warning が気になるなら選択 2 のほうが綺麗。どちらでも問題ない。

構造がコンパイルできることをクイックにサニティチェックする:

\`\`\`bash
cat > /tmp/book_test.rs <<'EOF'
use openhl_clob::Book;
use openhl_clob::Price;

fn main() {
    let b = Book::new();
    assert_eq!(b.best_bid(), None);
    assert_eq!(b.best_ask(), None);
    assert_eq!(b.depth_bid(), 0);
    assert_eq!(b.depth_ask(), 0);
    let _: Option<Price> = b.best_bid();
}
EOF
\`\`\`

走らせる必要はない。型がコンパイルできさえすればよい。\`cargo check -p openhl-clob\` が clean なら OK。

よくあるエラーと対処:

- **\`error[E0277]: 'BTreeMap<Reverse<Price>, ...>' is not 'Default'\`** — \`BTreeMap<K, V>\` は \`K: Ord\` を要求し、\`Reverse<T>\` は \`T: Ord\` を要求する。L1 で \`Price: Ord\` derive 済みなので動く。L1 で \`Price\` に \`Ord\` を derive し忘れていれば derive chain がここで壊れる。
- **\`error[E0599]: no method named 'len' for \`VecDeque<RestingOrder>\`** — \`depth_bid\`/\`depth_ask\` の typo。メソッドは \`VecDeque::len\`、\`.len()\` 直接または \`VecDeque::len(deque_ref)\` でアクセス。
- **\`error[E0382]: borrow of moved value: \`rp\`** in \`best_bid\` — \`&Reverse<Price>\` 参照に対する \`.map(|rp| rp.0)\` で、closure が \`rp: &Reverse<Price>\` を受け取り、\`rp.0\` は \`Price\` を値で返す (\`Reverse<Price>: Copy\` だから — それは \`Price: Copy\` だから)。これが error なら \`Price\` が \`Copy\` ではない — L1 の derive リストを確認。
- **\`error: cannot find type 'RestingOrder' in module 'book'\`** 外側から — \`RestingOrder\` は private。意図的。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Matching engine の状態は BTreeMap 2 個。** Order-id index も、best-price cache も、side ごとの counter もない。他のものはすべてその 2 map から導出される。将来の最適化 (例: O(1) cancel のための \`HashMap<OrderId, (Side, Price)>\`) は core data model を変えずに追加できる。**操作をサポートする最も単純な表現から始め、profile が要求したら最適化する。**

2. **Bids に \`Reverse<Price>\` を使うのは、matching コードの複雑さを節約する型レベルトリック。** これがないと、book を走査するすべての場所で「ask なら \`next\`、bid なら \`next_back\`」という分岐が必要になる。Bids に \`Reverse<Price>\` を使えば、両 side とも \`next\` で同じ形で辿れる。**呼び出し側で対称的な API を 1 つ得られるなら、データ定義側の型の非対称性は十分払う価値がある。**

3. **\`RestingOrder\` を \`Order\` から trim することで invariant を encode する。** Resting order は side を持たないし (どの map にあるかで分かる)、\`order_type\` も持たない (Market order は決して rest しないから)。これらの field を \`RestingOrder\` から取り除けば、不可能な状態が表現不可能になる。**型設計とは制約エンジニアリングのこと。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/clob/src/lib.rs ./crates/clob/src/lib.rs
\`\`\`

L3 後、自分の \`book.rs\` は参照の **最初の ~45 行** (struct 定義 + \`new()\` + accessor 4 個) に相当する。この SHA の参照には \`submit\` (~100 LOC、L4 + L5)、\`cancel\` (~25 LOC、L6)、\`match_at_level\` ヘルパー (~30 LOC、L4) もあるが、これらは後続レッスンで追加する。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`Vec\` ではなく \`VecDeque\`?**
高速な push-back **と** 高速な pop-front の両方が必要だから。\`Vec::remove(0)\` は全要素を左にシフトするので O(n) だが、\`VecDeque::pop_front()\` は O(1)。FIFO queue には常に \`VecDeque\` (または真の ringbuffer) を使う — \`Vec\` を front から shift してはいけない。

**Q: \`Reverse\` は内部で実際に何をしている?**
\`Ord::cmp\` の方向を反転する。\`Reverse(a).cmp(&Reverse(b)) == b.cmp(&a)\`。それだけだ。\`BTreeMap\` は sort 時に key の \`Ord\` impl を query する。key を \`Reverse\` でラップすると、\`BTreeMap\` は \`Reverse(higher)\` を \`Reverse(lower)\` より「小さい」と判断し、それに従って key を辿る。

**Q: \`RestingOrder\` をただの \`Order\` にしたらどうか?**
できる — ただし \`side\` と \`order_type\` を無駄に運ぶことになる (side は map で既に分かるし、resting Market order は矛盾)。Trim は小さいが、「resting Market order を construct できない」という **型レベル保証** が無料で手に入る。

**Q: なぜ BTreeMap field を private にするのか?**
caller が map を直接 modify すべきではなく、必ず \`submit\` / \`cancel\` (L4+ / L6) を通すべきだから。それらが「空 queue を map に残さない」といった invariant を維持する。\`book.asks.insert(price, VecDeque::new())\` を呼べてしまうと、空の price level (phantom) が作れてしまい、\`best_ask()\` がそれを返してしまう。Encapsulation でこれを防ぐ。

## 次のレッスン (L4)

データ構造が揃った。L4 ではその上に最初の matching ロジックを乗せる — Limit Buy order の \`submit\` を書く。Reader は ask を最安から順に辿り、limit 以下で match し、約定しなかった残りを rest させる \`Buy\` ブランチを書くことになる。本体 ~60 LOC と、L4-L5 の両方で使う \`match_at_level\` ヘルパー。L4 後、最も一般的なシナリオ (limit buy が resting ask を cross する) で matching engine が実際の \`Fill\` を生成するようになる。`,
                },
                {
                  title: "レッスン 4 — Limit order 用 submit + match_at_level",
                  slug: "openhl-clob-submit-limit-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 45,
                  xpReward: 80,
                  content: `# レッスン 4 — Limit order 用 \`submit\` + \`match_at_level\`

## ゴール

このレッスンで掴む概念:

- **Buy と Sell は構造的なミラーであり、generic 抽象ではない** — Buy 分岐は ask を昇順に辿り、Sell 分岐は bid を降順に辿る。ほぼ同形の関数 2 本のほうが、boolean フラグでパズル化した generic helper より読みやすい。
- **「クロスする限り辿る」が matching engine の core loop** — \`while remaining > 0 && 反対側の best 価格が limit をクロス { match_at_level; level を進める / 外す }\`。この形が見えれば、L5 の market order は「同じ loop から price check を抜いただけ」だと分かる。
- **空 queue 不変条件は変更のたびに維持する** — 各 match の後で \`if queue.is_empty() { remove(price) }\`。空 queue を map に残すと \`best_bid()\` が嘘をつき、no-crossed-book 不変条件が壊れる。
- **戻り値は「呼び出しで何が起きたか」、book 状態は「今どうあるか」を表す** — Limit の \`FillResult::remaining_qty\` は常に \`Qty(0)\` (約定しなかった分は rest した)。rest した残量を知りたければ \`best_bid\` / \`depth_bid\` を別途問い合わせる。2 つの契約を混ぜない。
- **\`match_at_level\` は free function として scope を名指す** — \`self\` を取らない。caller が既に取り出したデータ (queue + remaining) を操作する。関数 signature がドキュメントを兼ねる。

検証:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

上記の実行結果が引き続きコンパイルする。

具体的な変更:

\`Book\` が **Limit order** (Buy + Sell) を受け付け、実際の \`Fill\` を生成できるようになる。Market order はまだ \`todo!()\` のまま — それは L5 で扱う。

書くもの:

- **\`submit()\`** — \`order.order_type\` に基づいて \`submit_limit\` または \`submit_market\` にルーティングする dispatch メソッド。
- **\`submit_limit()\`** — 本体: book の反対側を順に辿り、limit price に対して at-or-better でマッチさせ、約定しなかった残りを book に rest させる。
- **\`match_at_level()\`** — \`submit_limit\` (および L5 の \`submit_market\`) から呼ばれる private ヘルパー。単一 price level で実際の約定を行い、maker queue と taker の remaining quantity の両方を mutate する。

L4 後、\`book.rs\` は **~150 行** になる。Buy + Sell の Limit order がどちらも動く。Market はまだ \`todo!\` で panic する。

## おさらい

L3 完了時点で \`book.rs\` は:

\`\`\`rust
pub struct Book {
    bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>,
    asks: BTreeMap<Price, VecDeque<RestingOrder>>,
}

struct RestingOrder { id: OrderId, account: AccountId, qty: Qty }

impl Book {
    pub fn new() -> Self { ... }
    pub fn best_bid(&self) -> Option<Price> { ... }
    pub fn best_ask(&self) -> Option<Price> { ... }
    pub fn depth_bid(&self) -> usize { ... }
    pub fn depth_ask(&self) -> usize { ... }
}
\`\`\`

**order を入れる方法がない。** L4 でそこを直す。

## 計画

すべて \`crates/clob/src/book.rs\` に追加する 3 つ:

1. **\`submit()\` dispatcher** — \`OrderType\` に対する 1 つの \`match\`。Limit → \`submit_limit\`、Market → 今は \`todo!()\`。
2. **\`submit_limit()\` 本体** — 約 60 行。Buy は ask を昇順に辿り、\`ask_price <= limit\` の間マッチする。Sell は bid を降順に辿り、\`bid_price >= limit\` の間マッチする。約定しなかった残りは book に rest させる (\`RestingOrder\` として entry)。
3. **\`match_at_level()\` ヘルパー** — 約 25 行。Queue 先頭の maker を pop または shrink し、1 つの \`Fill\` を返し、taker の \`remaining\` を mutate する。

これが **matching engine の大部分**。L5 で Market を追加する (Market は \`submit_limit\` から price check と resting step を除いたもの)。L6 で cancel を追加する。**Matching engine の core が本レッスンの中身。**

> 🛑 **考えてみよう。** スクロールする前に: price 100 の Limit Buy order が ask を最安から順に辿るとする。Ask が \`{ Price(98): [O_a], Price(99): [O_b, O_c], Price(101): [O_d] }\` のような状態で、buyer は 50 unit 買いたく、各 resting order は 30 unit。**約定はどの順序で発生するか? Trade 後の book の最終状態は?** ヒント: \`keys().next()\` から ask を順に辿り、満たされるか next level が limit を超えるまで各 level でマッチする。

(答え: 約定は \`[Fill@98 で 30、Fill@99 で 20]\`。Trade 後、\`O_a\` は消え、\`O_b\` は 10 unit 残り、\`O_c\` は 30 unit のまま、\`O_d\` も 30 unit のまま。Buyer は limit より少なく払った (98 + 99 vs 100) — これが「at-or-better」ルール。)

## 手順

### Step 1: \`submit()\` dispatcher を追加

\`crates/clob/src/book.rs\` で、既存の \`impl Book { ... }\` ブロック内 (\`new()\` の直後) に追加:

\`\`\`rust
    /// Submit a taker order. Limit orders rest any unfilled remainder on the
    /// book; Market orders discard it (returned via \`remaining_qty\`).
    pub fn submit(&mut self, order: Order) -> FillResult {
        match order.order_type {
            OrderType::Limit { price } => self.submit_limit(order, price),
            OrderType::Market => todo!("Market orders land in L5"),
        }
    }
\`\`\`

本体 3 行。Dispatcher は意図的に小さくしてある — matching ロジックはすべて \`submit_limit\` と (将来の) \`submit_market\` に置く。**Dispatcher の唯一の仕事は型駆動のルーティング**であって、matching そのものではない。

\`todo!()\` はここでは正しい placeholder。Market order が submit されると runtime で clear なメッセージで panic するが、コンパイルは clean に通る。L5 で実際の \`self.submit_market(order)\` 呼び出しに置き換える。

> 🛑 **やりがちな勘違い。** 「Submit() を 1 つの大きな match にして、matching ロジックを各 arm にインラインで書けばいいのでは?」 **そうすると \`submit_limit\` と \`submit_market\` が dispatcher の match arm の中に隠れる。** 効果は 2 つ: (1) public method \`submit\` が 100+ 行になり一目で読みづらい、(2) 各 path のテストが難しくなる (test は \`Book::submit\` を import するが、特定 path を exercise するために \`order_type\` を正しく設定した \`Order\` を construct する必要がある)。\`submit_limit\` / \`submit_market\` を named function として外に出すと、addressable で testable になる。

### Step 2: \`submit_limit\` 本体を書き始める

\`submit()\` の下、依然 \`impl Book\` 内:

\`\`\`rust
    fn submit_limit(&mut self, order: Order, limit_price: Price) -> FillResult {
        let mut remaining = order.qty;
        let mut fills = Vec::new();

        match order.side {
            Side::Buy => {
                // Buy は ask を最安から順に辿り、ask <= limit の間マッチする。
                loop {
                    if remaining.0 == 0 {
                        break;
                    }
                    let Some(best_price) = self.asks.keys().next().copied() else {
                        break;
                    };
                    if best_price > limit_price {
                        break;
                    }
                    let queue = self
                        .asks
                        .get_mut(&best_price)
                        .expect("price level exists by construction");
                    fills.push(match_at_level(&order, best_price, queue, &mut remaining));
                    if queue.is_empty() {
                        self.asks.remove(&best_price);
                    }
                }
            }
            Side::Sell => {
                // Sell は bid を最高値から順に辿り、bid >= limit の間マッチする。
                loop {
                    if remaining.0 == 0 {
                        break;
                    }
                    let Some(best_rev) = self.bids.keys().next().copied() else {
                        break;
                    };
                    let best_price = best_rev.0;
                    if best_price < limit_price {
                        break;
                    }
                    let queue = self
                        .bids
                        .get_mut(&best_rev)
                        .expect("price level exists by construction");
                    fills.push(match_at_level(&order, best_price, queue, &mut remaining));
                    if queue.is_empty() {
                        self.bids.remove(&best_rev);
                    }
                }
            }
        }

        // (rest-the-remainder ロジックは次)
        FillResult { fills, remaining_qty: Qty(0) }
    }
\`\`\`

これが matching loop。注意深く読む。Buy ブランチ:

1. **無限ループを条件付き break で抜ける。** Exit は 3 つ: (a) taker が完全に約定した、(b) この side で book が空、(c) 最安 ask が limit より高い。
2. **\`self.asks.keys().next().copied()\`** — 最安 ask 価格。\`&Price\` ではなく \`Price\` 値が欲しいので \`.copied()\` する。
3. **\`if best_price > limit_price { break }\`** — at-or-better ルール。Ask に \`limit_price\` 以上は払わない。
4. **\`self.asks.get_mut(&best_price).expect(...)\`** — その価格の queue。**\`.expect\` は安全** — \`best_price\` を \`keys().next()\` から取ったばかりなので、level は確実に存在する。Expect message が invariant を文書化する。
5. **\`match_at_level(&order, best_price, queue, &mut remaining)\`** — 実際のマッチを行う。このヘルパーは次に書く。今のところは、\`Fill\` を返し、\`queue\` (maker が完全に約定すれば pop する) と \`remaining\` (約定数量を引く) の両方を mutate することを覚えておけばよい。
6. **\`if queue.is_empty() { self.asks.remove(&best_price) }\`** — \`match_at_level\` が queue を空にしたなら、level を drop して \`best_ask()\` を \`depth_ask()\` と整合させる。(空 queue を map に残すと、\`best_ask()\` がその level の価格を返すが、order はそこにない。)

Sell ブランチは **構造的に同一** だが反転している:
- \`asks\` ではなく \`bids\` を辿る。
- key が \`Reverse<Price>\` なので \`best_rev.0\` で unwrap する。
- 比較は \`best_price < limit_price\` (sell の at-or-better は limit 以上で売る)。

**「構造的同一性」が load-bearing な観察。** Buy と Sell は互いの mirror image。どちらも反対側を best-first で辿り、どちらも price が limit をクリアする間マッチし、どちらも空になった level を pop する。違いは触る BTreeMap と比較の方向だけ。Buy ブランチが分かれば Sell ブランチも分かる。

> 🛑 **やりがちな勘違い。** 「Buy/Sell を parameterize して、ループを 1 度だけ書けないか?」 **できる — だがコストに見合わない。** 完全 generic 版は BTreeMap (\`Reverse<Price>\` vs \`Price\`)、比較演算子 (\`>\` vs \`<\`)、key (\`bids\` vs \`asks\`) を抽象化する必要がある。節約できるのは ~30 行の duplication、払うコストは Rust で最も手強い generic-bound パズルの 1 つ。**Duplication は安く、abstraction の予算は貴重。実際に効くところに使う。**

### Step 3: rest-the-remainder ロジックを追加

上の matching loop は \`FillResult { fills, remaining_qty: Qty(0) }\` で終わる — これは placeholder。実際の「remainder を rest させる」ロジックに置き換える:

\`\`\`rust
        // Any unfilled limit qty rests on the book.
        if remaining.0 > 0 {
            let resting = RestingOrder {
                id: order.id,
                account: order.account,
                qty: remaining,
            };
            match order.side {
                Side::Buy => self
                    .bids
                    .entry(Reverse(limit_price))
                    .or_default()
                    .push_back(resting),
                Side::Sell => self.asks.entry(limit_price).or_default().push_back(resting),
            }
            // Limit orders that rest report zero remaining to the caller —
            // the remainder isn't in the return value, it's in the book.
            FillResult {
                fills,
                remaining_qty: Qty(0),
            }
        } else {
            FillResult {
                fills,
                remaining_qty: Qty(0),
            }
        }
    }
\`\`\`

注意深く読む:

1. **\`if remaining.0 > 0\`** — taker にまだ約定していない quantity がある。Limit order ではその quantity が book に乗る (Market order は L5 で代わりに破棄する)。
2. **\`RestingOrder\` を construct する** — side と order_type は落とす (どの map に push するかで encode される) — id + account + remaining qty だけを残す。
3. **\`self.bids.entry(Reverse(limit_price)).or_default().push_back(resting)\`** — Buy order の約定しなかった残り。\`entry\` + \`or_default\` は BTreeMap の「なければ insert、いずれにせよ mutable ref を取る」イディオム。\`Reverse(limit_price)\` は L3 で bids に選んだ key の形。
4. **\`self.asks.entry(limit_price).or_default().push_back(resting)\`** — Sell の対称形。
5. **\`FillResult { fills, remaining_qty: Qty(0) }\`** — caller にゼロ \`remaining_qty\` を返す。**これが L2 の \`FillResult\` doc が約束した load-bearing な意味論**: rest する Limit order は **ゼロ remaining と申告する**。Remainder は book にあって、return 値の中にはない。
6. **両方のブランチ** (\`if\` と \`else\`) が \`Qty(0)\` remaining を返す。\`else\` ブランチは完全に約定したケース (taker が 100% マッチし、rest も remaining もない)。2 つのブランチは異なる理由で同じ return 値を生成する。

> 🛑 **やりがちな勘違い。** 「rest する Limit order が、resting amount ではなく \`remaining_qty: Qty(0)\` を返すのはなぜか? Caller は book にいくら乗ったか知りたいかも」。 **\`FillResult\` は **matching** の結果であって、book の状態ではないから。** Resting amount を知りたい caller は call 後に \`best_bid()\` や \`depth_bid()\` を query すればよい。「book が新しい resting liquidity をこれだけ受け取った」と「matcher が place できなかった taker quantity がこれだけ残った」を混ぜると意味論が曖昧になる。**Return value は何が起きたかを表し、book 状態は何があるかを表す。関心事を分離する。**

### Step 4: \`match_at_level()\` ヘルパーを書く

\`impl Book { ... }\` ブロックの下 (impl 内ではなく module scope) に追加:

\`\`\`rust
/// Match a taker against the front of a single price level.
/// Mutates \`queue\` (pops the maker if fully filled) and \`remaining\`.
fn match_at_level(
    taker: &Order,
    price: Price,
    queue: &mut VecDeque<RestingOrder>,
    remaining: &mut Qty,
) -> Fill {
    let maker = queue
        .front_mut()
        .expect("match_at_level called with empty queue");
    let fill_qty = Qty(maker.qty.0.min(remaining.0));

    let fill = Fill {
        maker_order_id: maker.id,
        taker_order_id: taker.id,
        maker_account: maker.account,
        taker_account: taker.account,
        price,
        qty: fill_qty,
    };

    maker.qty.0 -= fill_qty.0;
    remaining.0 -= fill_qty.0;

    if maker.qty.0 == 0 {
        queue.pop_front();
    }

    fill
}
\`\`\`

これが **実際のマッチ** — 本来の仕事を行う最小の関数。順に読む:

1. **\`queue.front_mut().expect(...)\`** — queue 先頭の maker。Time priority とは「最初に置かれた order が最初にマッチする」ことなので、これでよい。\`submit_limit\` は level の存在を確認した後にしか \`match_at_level\` を呼ばないので \`expect\` は安全。
2. **\`fill_qty = min(maker.qty, remaining)\`** — 2 つの小さい方をマッチさせる。Maker が 30 unit で taker がまだ 50 必要なら約定は 30 (maker は完全消費)。Maker が 30 で taker が 10 だけ必要なら約定は 10 (maker は 20 残る)。
3. **\`Fill\` を build** — order ID 両方と account ID 両方を保存する (L2 の設計判断: self-contained Fills)。
4. **\`maker.qty.0 -= fill_qty.0\`** — maker を縮める。**これは RestingOrder 内なら安全だが、Order 内では違和感のある mutation** (L3 の anti-fluency callout — RestingOrder はちょうどこの種の mutation を明示するために存在する)。
5. **\`remaining.0 -= fill_qty.0\`** — taker の outstanding quantity を縮める。Caller (\`submit_limit\`) が \`&mut Qty\` 引数経由でこれを観測する。
6. **\`if maker.qty.0 == 0 { queue.pop_front() }\`** — maker が完全消費されたら pop する。\`submit_limit\` の outer loop の次の iteration でこの queue を再度 check し、空になっていれば level 自体が drop される。

**なぜ Book のメソッドではなく free function なのか?** \`self\` へのアクセスが不要だから。単一 queue (\`submit_limit\` が既に mutable ref を持っている) と単一 \`remaining\` カウンタにしか触らない。Free function にすることで scope の狭さを反映している: \`Book\` 全体は関与しない。

> 🛑 **やりがちな勘違い。** 「\`expect("empty queue")\` の panic はリスキーに見える。Queue が **実際に** 空だったら?」 **この関数は空 queue で呼ばれないことが \`submit_limit\` の invariant。** 具体的には、\`submit_limit\` は \`keys().next()\` が \`Some(price)\` を返した後にしか \`match_at_level\` を呼ばず、それが level (そして queue) に少なくとも 1 要素あることを保証する。空 queue で \`match_at_level\` が呼ばれたとしたら、それは \`submit_limit\` のバグであって \`match_at_level\` のバグではない — そして \`expect\` が \`Option::None\` のサイレント伝播ではなく、clear なメッセージ付きの panic としてバグを surface する。**内部 invariant は信頼し、\`expect\` で assert する。**

## テスト

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

クリーンにコンパイルするはず。L3 の unused-import warning (\`Fill\`、\`FillResult\`、\`Order\`、\`OrderType\`、\`Qty\`、\`Side\`) はここで消えるはず — \`submit_limit\` と \`match_at_level\` がすべてを使うから。

Matching ロジックをサニティチェックするためのテストはまだない (それは L7-L8)。\`src/lib.rs\` に一時的に書ける:

\`\`\`rust
#[cfg(test)]
mod smoke {
    use super::*;

    #[test]
    fn buy_crosses_resting_ask() {
        let mut book = Book::new();
        // Place a resting sell at 100 for 30 units.
        book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
        // Cross with a buy at 100 for 50 units.
        let result = book.submit(Order {
            id: OrderId(2),
            account: AccountId(2),
            side: Side::Buy,
            qty: Qty(50),
            order_type: OrderType::Limit { price: Price(100) },
        });
        assert_eq!(result.fills.len(), 1);
        assert_eq!(result.fills[0].qty, Qty(30));
        assert_eq!(result.fills[0].price, Price(100));
        assert_eq!(result.fills[0].maker_order_id, OrderId(1));
        assert_eq!(result.fills[0].taker_order_id, OrderId(2));
        // 50 - 30 = 20 unfilled, rests as a new bid at 100.
        assert_eq!(result.remaining_qty, Qty(0)); // rested, not returned
        assert_eq!(book.best_bid(), Some(Price(100)));
        assert_eq!(book.depth_bid(), 1);
        assert_eq!(book.depth_ask(), 0); // ask was fully consumed
    }
}
\`\`\`

\`cargo test -p openhl-clob buy_crosses_resting_ask\` で走らせる。Pass すれば Limit Buy + Limit Sell ロジックは正しい。

**L5 に進む前にこの smoke test は削除する** — 本格的なテストスイートは L7-L8 で proper な hand-trace シナリオと proptest を伴って入る。上の smoke test は L4 がコンパイルして **走る** ことを verify するためだけのもの。L5 のために \`src/lib.rs\` を clean に保っておく。

よくあるエラーと対処:

- **\`error: 'Buy' branch panics with 'todo!()' but I selected Limit not Market\`** — \`submit\` dispatcher の \`OrderType::Limit\` arm に draft 状態の \`todo!()\` が残っている。Step 1 を再確認; Limit arm は \`self.submit_limit(order, price)\` を呼ぶべき。
- **\`error[E0596]: cannot borrow 'maker' as mutable... requires Copy\`** — \`front_mut()\` は \`Option<&mut T>\` を返す、\`Option<T>\` ではない。\`let maker = queue.front_mut().expect(...).clone()\` と書くと、maker の \`Copy\` で作業して mutation が persist しない。参照を直接使う: \`let maker = queue.front_mut().expect(...)\`。
- **\`error: cannot find value 'asks' in scope\`** in match_at_level — \`match_at_level\` は free function で Book メソッドではない。\`self\` がない。代わりにパラメータ (\`queue\`、\`remaining\`) を使う。
- **Smoke test が \`depth_bid: 0\` を報告** — rest-the-remainder ロジックが bids に push しなかった。Step 3 を再確認、特に \`Reverse(limit_price)\` key wrap (\`Reverse\` を忘れると unwrapped-Price entry に push され、\`best_bid\` の \`Reverse\`-keyed lookup で見つからない)。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Buy と Sell は構造的に mirror。** Buy ブランチは ask を昇順に辿り、Sell ブランチは bid を降順に辿る。Generics で abstract する選択はしなかった — duplication のほうが abstraction tax より安いから。**構造的に同一な関数 2 つのほうが、完全 generic な 1 関数より読みやすい。**

2. **\`match_at_level\` は free function であって method ではない。** \`self\` は要らない。Free function にすることで、book 全体ではなく caller が既に extract したデータ (queue + remaining) に対して動作することを文書化している。**関数 signature が文書として scope を名指す。**

3. **Resting Limit order の \`remaining_qty: Qty(0)\` は意図的。** Caller には「これだけマッチした、こちらに残りはない」と見える。Resting remainder を知りたければ \`best_bid\` / \`depth_bid\` で book に query すればよい — そちらは book-state メソッド。**Return 値は call で起きたことを描き、book 状態は何があるかを描く。混ぜない。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
\`\`\`

L4 後、自分の \`book.rs\` は参照の **最初の ~145 行** (L3 の struct + accessor + submit dispatcher + submit_limit + match_at_level)。参照には \`submit_market\` (~40 LOC、L5) と \`cancel\` (~25 LOC、L6) もあるが、まだ書いていない。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`match_at_level\` の \`taker\` は \`&Order\` 参照で、\`queue\` は \`&mut VecDeque<RestingOrder>\` なのか?**
\`match_at_level\` は \`taker\` から read するだけ (\`Fill\` に field を copy する) だが、\`queue\` に write する (先頭要素を pop または shrink する) から。関数 signature が使い方を反映する: read-only には \`&\`、mutating には \`&mut\`。Compiler が強制してくれる — 参照型が許さないので \`taker\` を偶発的に mutate することはできない。

**Q: 価格 level が存在するのに queue が空だったらどうなる?**
それはバグ。「map の各 key は非空 queue に対応する」が invariant。\`submit_limit\` が各 match 後に \`if queue.is_empty() { self.asks.remove(&best_price) }\` でこれを強制するので、空 queue が残ることはない。もし空 queue を見たら、queue を mutate した後に空チェックしなかった場所を探す。

**Q: \`BTreeMap::pop_first()\` で best level を 1 回の呼び出しで取得+削除しないのはなぜか?**
理由は 2 つ。(1) \`pop_first\` は無条件で level を削除するが、必ずしもそうしたいわけではない — マッチ後に level に order が残ることがある (maker が部分的に約定し、後ろに他の order が並んでいる場合)。(2) \`pop_first\` は Rust 1.66 で stabilize したが、「いくらか消費し、必要なら level を drop する」というフローには \`get_mut\` + 条件付き \`remove\` のマッチパターンが自然に読める。

**Q: 「taker が maker をぴったりマッチ」のための fast path はあるか?**
ない、必要もない。General path (\`min(maker.qty, remaining)\` + shrink-or-pop) が「exact match」を general の特殊ケースとして扱ってくれる。Special-case branch を追加すると test 対象のコードパスが増え、性能向上は marginal。性能が重要なら profile が先。

## 次のレッスン (L5)

Limit order が動くようになった。**Market order はまだ \`todo!()\` のまま。** L5 で matching engine を完成させる:
- \`submit()\` 内の \`todo!()\` を \`self.submit_market(order)\` に置き換える。
- \`submit_market()\` を書く — \`submit_limit\` から **price check を抜き** (Market は任意の価格を取る)、**remainder を rest させない** (Market は残りを破棄する) 形のもの。

L5 は L4 より短い。大部分の作業 (\`match_at_level\`、dispatcher) は済んでいるから。L5 終了時には両方の order type で動く完全な matching engine が手に入る。`,
                },
                {
                  title: "レッスン 5 — submit_market — 任意の価格を取る order",
                  slug: "openhl-clob-submit-market-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 25,
                  xpReward: 60,
                  content: `# レッスン 5 — \`submit_market\` — 任意の価格を取る order

## ゴール

このレッスンで掴む概念:

- **Market = Limit から price check と rest 処理を抜いたもの** — L4 と同じ「クロスする限り辿る」ループだが、\`price <= limit\` ガードがなく、\`rest_unfilled_remainder()\` もない。意味の差分は *存在しないコード* に宿るため、boolean フラグでパラメタ化すると両方の本体が読めなくなる。
- **約定価格は常に maker の価格** — Market order は価格を持たず、book が提示する価格を受け入れる。「価格発見」とは、taker の要求ではなく best bid と best ask のスプレッドが価格を決めるという規則そのもの。
- **同じ戻り型、異なる契約** — \`FillResult::remaining_qty\` は Limit では「rest した分」(常に \`Qty(0)\`)、Market では「破棄した分」(実際の残量) を意味する。型は同じだが、\`FillResult\` の doc が両方の解釈を明示している。
- **「何も起きなかった」はエラーではなく有効な結果** — 空 ask book に対する Market buy は \`FillResult { fills: vec![], remaining_qty: order.qty }\` を返す。残量をどう扱うかは caller の判断であり、engine 側は \`Result\` を投げない。
- **L4 の \`match_at_level\` helper をそのまま再利用する** — 「maker が部分的に約定」と「maker が完全消費」を 1 本の汎用パスで扱う。L5 では fast path も special case も足さない。

検証:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

上記の実行結果が引き続きコンパイルし、\`submit()\` dispatcher が Market order で panic しないようになる。

具体的な変更:

- **\`submit_market()\`** — Market order の matcher。L4 の \`submit_limit\` と構造的に同じだが、**鍵となる差が 2 つ**:
  1. **Price check なし** — Market order は任意の価格で取る。
  2. **rest-the-remainder なし** — Market order はマッチしなかった quantity を破棄する。残りは \`FillResult::remaining_qty\` で返す。
- **\`submit()\` dispatcher を更新する** — L4 の \`todo!("Market orders land in L5")\` を \`self.submit_market(order)\` に置き換える。

L5 後、matching engine は **完成** する。Limit と Market の両方が実際の約定を生成するようになる。L6 で \`cancel\` を追加し、L7-L8 で engine の invariant が成り立つことを証明するテストスイートを追加する。

## おさらい

L4 完了時点で \`book.rs\` は:

\`\`\`rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => todo!("Market orders land in L5"),
    }
}

fn submit_limit(&mut self, order: Order, limit_price: Price) -> FillResult {
    // ~60 行: 反対側を順に辿り、at-or-better でマッチ、remainder を rest
}

fn match_at_level(taker: &Order, price: Price, ...) -> Fill { ... }
\`\`\`

\`book.submit(market_order)\` を呼ぶと \`todo!\` で panic する。L5 でそれを直す。

## 計画

\`crates/clob/src/book.rs\` への変更 2 つ:

1. **\`submit_market()\` を追加する** — \`submit_limit()\` の下に書く。Buy/Sell の 2 ブランチで、それぞれ \`submit_limit\` のループとほぼ同じだが limit-price 比較が **ない**。
2. **\`submit()\` を編集する** — panic ではなく \`submit_market\` に dispatch するように変える。

新規型なし、新規ヘルパーなし。L4 の \`match_at_level\` をそのまま再利用する。

レッスンが短いのは、**L4 の大部分の作業を終えた後に L5 として残ったもの** だから。構造パターンは同じで、違うのは「market order」と「limit order」の意味の差分。

> 🛑 **考えてみよう。** スクロールする前に: ask が \`{ Price(100): [O_a (30 units)] }\` で、50 unit の Market buy が arrive したとする。約定はどうなり、\`FillResult::remaining_qty\` には何が入るか? 対比: 同じ開始 book で price 100、50 unit の Limit buy が来た場合は? **残り 20 unit は各ケースでどこに行くか?**

(答え: Market ケース → 約定 \`[30 @ 100]\`、\`remaining_qty = 20\` (約定しなかった部分は破棄され、caller には見えるが book には乗らない)。Limit ケース → 約定 \`[30 @ 100]\`、\`remaining_qty = 0\` (20 unit が price 100 の新規 bid として book に rest する)。**同じ約定、だが leftover の運命が違う。**)

## 手順

### Step 1: \`submit_market()\` を \`impl Book\` に追加

\`crates/clob/src/book.rs\` で、既存の \`impl Book { ... }\` ブロック内 (\`submit_limit\` の直後) に追加:

\`\`\`rust
    fn submit_market(&mut self, order: Order) -> FillResult {
        let mut remaining = order.qty;
        let mut fills = Vec::new();

        match order.side {
            Side::Buy => loop {
                if remaining.0 == 0 {
                    break;
                }
                let Some(best_price) = self.asks.keys().next().copied() else {
                    break;
                };
                let queue = self
                    .asks
                    .get_mut(&best_price)
                    .expect("price level exists by construction");
                fills.push(match_at_level(&order, best_price, queue, &mut remaining));
                if queue.is_empty() {
                    self.asks.remove(&best_price);
                }
            },
            Side::Sell => loop {
                if remaining.0 == 0 {
                    break;
                }
                let Some(best_rev) = self.bids.keys().next().copied() else {
                    break;
                };
                let queue = self
                    .bids
                    .get_mut(&best_rev)
                    .expect("price level exists by construction");
                fills.push(match_at_level(&order, best_rev.0, queue, &mut remaining));
                if queue.is_empty() {
                    self.bids.remove(&best_rev);
                }
            },
        }

        FillResult {
            fills,
            remaining_qty: remaining,
        }
    }
\`\`\`

\`submit_limit\` と side-by-side で比較する。差分:

| 項目 | \`submit_limit\` | \`submit_market\` |
| - | - | - |
| Loop 内の price check | \`if best_price > limit_price { break }\` (Buy) | **なし** — 任意の価格で取る |
| Loop 内の price check | \`if best_price < limit_price { break }\` (Sell) | **なし** — 任意の価格で取る |
| Loop 後の rest-the-remainder | \`if remaining.0 > 0 { ... push_back(resting) ... }\` | **なし** — leftover は破棄 |
| Return の \`remaining_qty\` | 常に \`Qty(0)\` (rest 済みまたは完全に約定) | \`remaining\` (matching 後に残ったもの) |

差分はこれで全部。**Loop の形は同じで、check を 2 個削り、return 値を 1 個変えるだけ。**

> 🛑 **やりがちな勘違い。** 「Market Buy に \`limit_price = Price(u64::MAX)\`、Market Sell に \`Price(0)\` を渡して \`submit_limit\` を呼べばよいのでは?」 **price-check の除去には効くが、rest-the-remainder ロジックを排除しない。** \`u64::MAX\` limit の Market order は、約定しなかった qty を \`u64::MAX\` で rest しようとする — つまり最高可能価格で phantom resting bid を作ってしまう。挙動が間違う: 完全に約定しなかった Market buy が \`u64::MAX\` 価格の bid を book に置き、それが入ってきた sell を即座にマッチしてしまう。**2 つの関数、2 つの意味論、別々に保つ。**

### Step 2: \`submit()\` dispatcher を更新

L4 で書いた dispatcher を見つける:

\`\`\`rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => todo!("Market orders land in L5"),
    }
}
\`\`\`

\`todo!\` を実際の呼び出しに置き換える:

\`\`\`rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => self.submit_market(order),
    }
}
\`\`\`

1 行変更。Dispatcher の役割は広がっていない — 依然「型駆動のルーティング、arm ごとに 1 行」のまま。実装は専用 method に置く。

## テスト

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

Clean。Unused function の warning も出ない (\`book.rs\` で宣言された全関数に少なくとも 1 つの caller がいる — \`submit_market\` は \`submit\` から呼ばれ、private な \`submit_*\` methods は \`Book\` 内から呼ばれ、\`match_at_level\` は両 submit から呼ばれる)。

Smoke test (L4 と同じく、後で削除):

\`\`\`rust
#[cfg(test)]
mod smoke {
    use super::*;

    #[test]
    fn market_buy_takes_what_it_can_then_discards() {
        let mut book = Book::new();
        // Place a single resting sell at 100 for 30 units.
        book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
        // Market buy for 50 — should match 30 at 100, leave 20 unfilled.
        let result = book.submit(Order {
            id: OrderId(2),
            account: AccountId(2),
            side: Side::Buy,
            qty: Qty(50),
            order_type: OrderType::Market,
        });
        assert_eq!(result.fills.len(), 1);
        assert_eq!(result.fills[0].qty, Qty(30));
        assert_eq!(result.fills[0].price, Price(100));
        // The 20 unfilled units are DISCARDED, not rested.
        assert_eq!(result.remaining_qty, Qty(20));
        assert_eq!(book.best_bid(), None); // no resting bid created
        assert_eq!(book.best_ask(), None); // ask was consumed
    }

    #[test]
    fn market_buy_against_empty_book_returns_full_remainder() {
        let mut book = Book::new();
        let result = book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Buy,
            qty: Qty(50),
            order_type: OrderType::Market,
        });
        assert_eq!(result.fills.len(), 0);
        assert_eq!(result.remaining_qty, Qty(50));
        assert_eq!(book.best_bid(), None);
        assert_eq!(book.best_ask(), None);
    }
}
\`\`\`

\`cargo test -p openhl-clob smoke\` で走らせる。両方 pass するはず。**そのあと smoke module は削除する** — 本格的なテストスイートは L7-L8 で作る。

2 つの smoke test の対比は L5 のレッスン本質の要約 (ミニ版) になっている: **matching 後に残ったものは、約定が生成されたかどうかに関わらず破棄される**。Market order 後の book 状態は、消費された liquidity を引いた book 状態そのもの — resting order は追加されない。

よくあるエラーと対処:

- **Smoke test が \`Qty(20)\` でなく \`result.remaining_qty == Qty(0)\` を報告** — \`submit_market\` の final \`FillResult\` が \`remaining_qty: Qty(0)\` (\`submit_limit\` から copy-paste した可能性)。\`remaining_qty: remaining\` — 実際の leftover quantity であるべき。
- **Market Buy 後に \`book.best_bid()\` が \`Some(price)\` を返す** — \`submit_market\` が \`submit_limit\` の rest-the-remainder ブランチに当たっている。Loop が共有コードに fall through した。\`submit_market\` が自分の final \`FillResult\` を持つ自分の関数であることを確認 — 共有「rest」ロジックなし。
- **\`error: cannot find function 'submit_market' in '&mut Book'\`** — \`submit()\` dispatcher の typo。Method は \`self\` に対して \`self.submit_market(order)\`。
- **間違ったパスでの \`warning: unused variable: remaining\`** — \`FillResult\` で \`remaining: remaining,\` ではなく \`let remaining_qty = ...\` と書いた可能性。Field 名が \`remaining_qty\`、local 変数が \`remaining\` (\`FillResult { fills, remaining_qty: remaining }\`)。

## 設計の振り返り

3 つの load-bearing な決定:

1. **\`submit_limit\` と \`submit_market\` は別々の関数として書き、parameterize しない。** Loop が 80% 同一でも、意味の差 (leftover を rest させるか破棄するか) は **欠けている** コードにあるのであって、そこにあるコードにあるのではない。Parameterize すると \`rest_remainder: bool\` や \`enforce_price: bool\` のような boolean flag が必要になり、関数本体が branchy なパズルになる。**明確な分離があってこそ、2 つの意味論を独立に読みやすくなる。**

2. **\`FillResult::remaining_qty\` は order type で意味が変わる。** Limit では常に \`Qty(0)\` (rest 済みか完全 match)。Market では実際の unfilled 残り。**型は同じ、契約は違う。** これが許されるのは、\`FillResult\` の field doc (L2) が両方の解釈を明示的に named しているから。

3. **空 book の Market order はエラーではなく clean に返る。** 空 asks book に対する Market buy は \`FillResult { fills: vec![], remaining_qty: order.qty }\` を返す。エラーなし。これが正しいデフォルト: caller がマッチを依頼し、できるだけ (0 個でも) マッチさせ、leftover を報告する。**「何も起きなかった」はエラーではなく valid な結果であるべき。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
\`\`\`

L5 後、\`book.rs\` は参照の **最初の ~190 行**。残り ~25 行は \`cancel()\` (L6) と module export。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: 空 book の Market order が clean に返るユースケースは?**
本番 matching engine ではよくある: thin な market が open し、約定の合間に orderbook が一時的に空になり、そこに Market order が arrive する。正しい挙動は「0 約定を生成、full remainder を報告、何をするかは caller が決める」だ。Caller は後で retry したり、Limit に切り替えたり、ユーザーにエラーを surface したりする — だが matching engine 自体はそれを決めない。

**Q: Market は自分の価格を持たないのに、なぜ maker の resting price を使うのか?**
約定価格は常に **resting** order の価格 (maker の) になる。Market order は価格を supply せず、book がオファーするものを受け入れる。**「価格発見」こそが market を market たらしめる** — buyer が価格を決めるのではなく、best bid と best ask のスプレッドが決める。

**Q: Market order がゼロ quantity の Fill を生成することはあるか?**
ない。\`match_at_level\` は \`fill_qty = min(maker.qty, remaining)\` を計算する。これがゼロになるには \`maker.qty\` か \`remaining\` のどちらかがゼロでなければならない。invariant が両方を維持してくれる: \`submit_market\` は \`remaining == 0\` になった瞬間 loop を抜けるし、maker queue に zero-qty resting order が残ることもない (matching コードが qty を縮めてゼロに当たったら maker を pop するため)。そのため \`match_at_level\` が両方ゼロで呼ばれることはない。

**Q: 複数 price level にまたがる partial 約定は?**
Market order はこれを自然に扱える。Ask \`{99: [30 units], 100: [30 units], 101: [50 units]}\` に対する 100-unit Market buy は 3 つの約定を生成する (30 @ 99、30 @ 100、40 @ 101)。Loop の各 iteration が next-best level の front に対して \`match_at_level\` を呼び、\`remaining == 0\` になるか book が枯渇するまで loop が続く。**複数 level を順に辿る挙動は crossing Limit order と同じ。**

## 次のレッスン (L6)

Matching engine は **submit** を扱えるようになった。だが **cancel** はまだできない — fill される前に自分の resting order を削除したいユーザーが何もできない。L6 で \`cancel(order_id) -> bool\` を追加する:

- bids と asks の両方を linear scan して order を見つける。
- 今は O(n) (n は総 resting order 数)。O(1) index 追加の議論は openhl の後段の stage で扱う。
- 重要: cancel が level を空にしたら drop すること (\`submit\` が \`if queue.is_empty() { self.asks.remove(...) }\` で維持しているのと同じ invariant)。`,
                },
                {
                  title: "レッスン 6 — cancel — order を book から引き抜く",
                  slug: "openhl-clob-cancel-ja",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 20,
                  xpReward: 50,
                  content: `# レッスン 6 — \`cancel\` — order を book から引き抜く

## ゴール

このレッスンで掴む概念:

- **\`BTreeMap::retain\` が「mutate + 空 entry を drop」を 1 closure でこなす** — 同じ callback が queue から該当 order を削除し、かつ level を残すかどうかも返す。1 pass で済み、\`submit\` 由来の空 level 不変条件が自動で維持される。
- **O(n) 線形 scan は v0 で正しい選択** — O(1) cancel のために \`HashMap<OrderId, (Side, Price)>\` を抱えると、\`BTreeMap\` と同期させる 2 つ目のデータ構造、追加メモリ、追加 cache 圧が生まれる。プロファイルで見えていないものを最適化しない。Scan のコストが見えてきたら index を入れる。
- **\`bool\` 戻り値が「最小の正直な形」** — \`Option<RestingOrder>\` は L3 で private にした \`RestingOrder\` を漏らす。\`Result<(), CancelError>\` は「見つからない」をエラー扱いに強制するが、cancel の冪等性 (2 回呼んでも安全) はバグではなく機能。
- **空 level の掃除が \`best_bid\` の正直さを保つ** — もし \`retain\` が price 100 に空 queue を残せば、流動性がゼロなのに \`best_bid()\` が 100 を返し、次の sell が幻の価格でマッチしてしまう。\`submit\` が守るのと同じ不変条件を \`cancel\` も守らねばならない。

検証:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

上記の実行結果が引き続きコンパイルする。

具体的な変更:

\`Book\` に新規メソッド 1 個:

- **\`cancel(&mut self, order_id: OrderId) -> bool\`** — bid と ask の両 side で指定 id の order を検索し、見つかれば削除し、cancellation で level が空になれば level を drop する。削除したら \`true\`、見つからなければ \`false\` を返す。

約 25 LOC。L6 後、matching engine は **機能的に完成** する。Submit (Limit + Market) + cancel が v0 のフル表面となる。L7 でテストスイートに入る。

## おさらい

L5 完了時点で \`Book\` には:

\`\`\`rust
impl Book {
    pub fn new() -> Self { ... }                          // L3
    pub fn best_bid(&self) -> Option<Price> { ... }       // L3
    pub fn best_ask(&self) -> Option<Price> { ... }       // L3
    pub fn depth_bid(&self) -> usize { ... }              // L3
    pub fn depth_ask(&self) -> usize { ... }              // L3
    pub fn submit(&mut self, order: Order) -> FillResult { ... }  // L4 + L5
    // submit_limit, submit_market (private)
}
\`\`\`

足りないのは resting order を **削除** する手段。ユーザーが Limit Buy at 100 を submit して book に rest している状態でも、今のところそれを取り外す方法がない。L6 でこれを追加する。

## 計画

method 1 個、file 1 個。\`crates/clob/src/book.rs\` で、既存の \`impl Book\` block に \`cancel\` を追加する:

1. **bid から検索する** — \`BTreeMap::retain\` の closure が queue から該当 order を削除し、queue が空でないか報告する。
2. **bid で見つかれば** 即座に \`true\` を返す。
3. **そうでなければ ask を同じ方法で検索する**。
4. **\`found\` を返す** (ask で見つかれば true、どこにも見つからなければ false)。

トリックは \`retain\`。同じ closure で **2 つの仕事** をする:

- **Queue を mutate する** (id が一致する order を削除する)。
- **BTreeMap entry を drop するかどうかを signal する** (\`!queue.is_empty()\` を返す)。

\`retain\` は各 (key, value) pair で closure を呼び、closure が \`false\` を返した pair を削除する。Queue-mutation と空 check return を組み合わせることで、「削除 + 空 level cleanup」の invariant が無料で得られる。

> 🛑 **考えてみよう。** スクロールする前に: ユーザーが price 100 で 50 unit の Limit Buy を submit し (完全 rest し)、それからその order id で Cancel を submit するとする。Cancel 後、**\`best_bid()\` は何を返すべきか?** ヒント: cancellation 後にその price level が map にまだ残っているかを考える。

(答え: \`None\`。order が price 100 で唯一のものだったので、cancel すると queue が空になり、\`retain\` が level を map から drop し、\`bids.keys().next()\` が \`None\` を返し、\`best_bid()\` が \`None\` を返す。**空 level cleanup によって \`best_bid\` が「実際に liquidity が存在するか」について正直であり続ける。**)

## 手順

### Step 1: \`cancel\` を impl block に追加

\`crates/clob/src/book.rs\` の \`impl Book { ... }\` 内 (\`submit_market\` の後) に追加:

\`\`\`rust
    /// Cancel a resting order by id. O(n) linear scan; fine for v0 book sizes.
    /// Returns true if the order was found and removed. Empty price levels
    /// left behind by cancellation are also dropped, so \`best_bid\`/\`best_ask\`
    /// stay consistent with \`depth_bid\`/\`depth_ask\`.
    pub fn cancel(&mut self, order_id: OrderId) -> bool {
        let mut found = false;
        self.bids.retain(|_, queue| {
            if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id) {
                queue.remove(pos);
                found = true;
            }
            !queue.is_empty()
        });
        if found {
            return true;
        }
        self.asks.retain(|_, queue| {
            if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id) {
                queue.remove(pos);
                found = true;
            }
            !queue.is_empty()
        });
        found
    }
\`\`\`

注意深く読む:

1. **\`let mut found = false\`** — local flag。Order を見つけて削除した瞬間 \`true\` になる。
2. **\`self.bids.retain(|_, queue| { ... })\`** — \`retain\` がすべての (\`Reverse<Price>\`, \`VecDeque<RestingOrder>\`) pair を順に辿る。Closure が \`queue\` を mutate して \`bool\` を返す: \`false\` なら entry を drop し、\`true\` なら保持する。
3. **\`if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id)\`** — まだ見つけていない場合のみ検索する。\`iter().position()\` は \`Option<usize>\` を返す — 述語に一致する最初の要素の index。\`if let\` と組み合わせるのが「index が存在すれば何かする」の Rust 慣用イディオム。
4. **\`queue.remove(pos)\`** — \`VecDeque::remove(index)\` がその index の要素を取り出す。返り値の \`Option<T>\` (削除された要素) はここでは無視する。**\`VecDeque::remove\` は O(n)** — 後続要素を 1 slot 左にシフトする。数百 order の queue ならマイクロ秒オーダー。
5. **\`found = true\`** — flag を立てて以降の level がスキャンされないようにする。**これが load-bearing な最適化** — order が見つかった後も残りの level を順に辿る (以前の cancellation で残った空 queue を check するため) が、残り各 queue 内の linear scan はスキップする。
6. **\`!queue.is_empty()\`** — return 値。Queue が空 (最後の order を削除したばかり、または別の理由で空) なら \`false\` を返して \`retain\` に entry を drop させる。そうでなければ \`true\` を返して保持させる。
7. **\`if found { return true }\`** — short-circuit。bid で既に見つけて削除したなら、ask を検索する必要はない。
8. **\`self.asks.retain(...)\`** — ask に対する同じロジック。Closure 本体は同一 (key の違いはない — 両 map とも value は \`VecDeque<RestingOrder>\`)。
9. **\`found\`** — 最終 return。bid で見つかった場合は既に \`true\` を return 済み。ask で見つかれば \`found\` が \`true\` になりそれを返す。どちらでもなければ \`found\` は \`false\` のまま。

> 🛑 **やりがちな勘違い。** 「BTreeMap を iterate して entry を見つけて order を削除し、もう一度 iterate して空 level を drop すればよい」。 **2 pass は無駄。さらに悪いことに、invariant が 2 箇所に分散する。** \`retain\` なら「order 削除」と「空 level drop」の判断が両方 1 closure に encode される。「order を削除した」と「level が空かを check した」の間に、データ構造が inconsistent な状態になる窓がない。**1 closure、2 つの仕事、1 つの invariant。**

### Step 2: 新規 method が両 branch を通ることを verify

\`cargo check -p openhl-clob\` がクリーンにコンパイルするはず。警告なし。

以前のレッスンからの unused-import warning もすべて消えるはず — \`cancel\` は新規 import を導入せず、使うもの (\`OrderId\`、\`VecDeque::remove\`、BTreeMap の表面) はすべて既に scope 内にあるから。

\`if let && pattern\` 構文が Rust バージョンで OK か verify したい場合 (1.65+ で stable):

\`\`\`bash
rustc --version
# コース前提から 1.95.x 以降を報告するはず。
\`\`\`

古い Rust で詰まったら、let-chains なし版:

\`\`\`rust
if !found {
    if let Some(pos) = queue.iter().position(|o| o.id == order_id) {
        queue.remove(pos);
        found = true;
    }
}
\`\`\`

挙動は同じ。2 行増えるが \`let && let\` chain は使わない。

## テスト

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

Clean。Matching engine がここで機能的に完成 — \`book.rs\` には \`new\`、accessor 4 個、\`submit\` (Limit と Market 両 path)、\`cancel\` が入る。\`todo!()\` は残っていない。

Smoke test (L4/L5 と同じく、後で削除):

\`\`\`rust
#[cfg(test)]
mod smoke {
    use super::*;

    fn limit_buy(id: u64, account: u64, qty: u64, price: u64) -> Order {
        Order {
            id: OrderId(id),
            account: AccountId(account),
            side: Side::Buy,
            qty: Qty(qty),
            order_type: OrderType::Limit { price: Price(price) },
        }
    }

    #[test]
    fn cancel_removes_resting_order() {
        let mut book = Book::new();
        // Rest a buy at 100, then a buy at 99 (different price levels).
        book.submit(limit_buy(1, 1, 30, 100));
        book.submit(limit_buy(2, 2, 30, 99));
        assert_eq!(book.best_bid(), Some(Price(100)));
        assert_eq!(book.depth_bid(), 2);

        // Cancel order 1 — the 100-price level should be gone.
        assert!(book.cancel(OrderId(1)));
        assert_eq!(book.best_bid(), Some(Price(99))); // 99 is now the best
        assert_eq!(book.depth_bid(), 1);

        // Cancel again — already removed, should return false.
        assert!(!book.cancel(OrderId(1)));
    }

    #[test]
    fn cancel_searches_both_sides() {
        let mut book = Book::new();
        // Resting Sell at 100, no bids.
        book.submit(Order {
            id: OrderId(7),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
        assert!(book.cancel(OrderId(7)));
        assert_eq!(book.best_ask(), None);
    }

    #[test]
    fn cancel_nonexistent_returns_false() {
        let mut book = Book::new();
        book.submit(limit_buy(1, 1, 30, 100));
        assert!(!book.cancel(OrderId(99))); // not in the book
        assert_eq!(book.depth_bid(), 1); // resting order untouched
    }
}
\`\`\`

\`cargo test -p openhl-clob smoke\` で走らせる。3 つすべて pass するはず。**そのあと smoke module は削除する** — 本格的なテストスイートは L7 で入れる。

よくあるエラーと対処:

- **\`error: 'retain' has no method named 'retain' on BTreeMap<...>\`** — typo か Rust バージョンが古い。\`BTreeMap::retain\` は Rust 1.53 以降で stable。\`rustc --version\` を確認。
- **\`error: 'position' has no method named 'position'\`** — \`iter().position()\` は \`Iterator\` trait のメソッドで、\`std\` の default scope に入っている。\`queue.position(|o| ...)\` (\`iter()\` なし) と書くと compile しない。\`queue.iter().position(...)\` を使う。
- **Cancel が true を返すのに \`best_bid()\` がまだ cancel された order の price を見せる** — \`retain\` closure が \`!queue.is_empty()\` を正しく返していない。おそらく \`true\` を無条件で返している。Closure 本体の最後の式を確認。
- **\`cancel\` が間違った order を削除する** — \`position\` 述語が間違った field を check している。比較は \`o.id == order_id\` (OrderId でマッチ) であるべきで、\`o.account == order_id\` などではない。

## 設計の振り返り

3 つの load-bearing な決定:

1. **「削除 + cleanup」を \`retain\` で組み合わせる。** 2 つの別操作を 1 closure pass で済ませる: queue を mutate し、entry を drop するか決める。これがまさに \`retain\` のユースケース。代替 (iterate-then-cleanup や、\`BTreeMap::iter_mut\` + 手動で空 key 収集) は invariant をより多くのコードに分散させてしまう。**自分の操作にぴったり合うメソッドがあるなら、それを使う。**

2. **O(n) linear scan は v0 では fine。** 本番取引所は何千、何万の resting order を持つ。v0 の openhl で数百なら scan はマイクロ秒で済む。\`HashMap<OrderId, (Side, Price)>\` index を追加すれば cancel は O(1) になるが、その代わりに BTreeMap と同期を保つ second data structure、追加メモリ、追加 cache pressure を抱えることになる。**Profile に出てこないものは最適化しない。** openhl が v0 scale を超えたら index を追加すればよい — それまでは scan が正しい形。

3. **Cancel は \`bool\` を返す。\`Option<RestingOrder>\` や \`Result<(), CancelError>\` ではない。** 削除した order を返すと \`RestingOrder\` を expose することになる (L3 で意図的に private 型にした)。\`Result\` を返すと caller に「見つからない」ケースを error として handle させることになるが、cancellation の冪等性は機能でありバグではない (cancel を 2 回呼べることが安全であるべき)。\`bool\` なら「仕事をしたかしなかったか」をクリーンに伝えられる — 内部を漏らさず、error-handling を強制せずに済む。**何が起きたかを正直に表す、最小の return 形を選ぶ。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
\`\`\`

L6 後、\`book.rs\` は \`55a9dff\` の参照と **機能的に同一** になる。残る違いは doc コメントや空白、それと末尾のテストモジュールだけ — L7-L8 で参照が持つ unit test 9 個 + proptest invariant 3 個を追加していく。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`retain\` で空 level を cleanup しないとどんなコストがあるか?**
最終的に \`best_bid()\` が、その level に order が存在しないのに価格を返してしまう。すると「best」をわずかに下回る Sell limit が phantom 価格でマッチし、ゼロ quantity に対して fill が起き (\`match_at_level\` が奇妙な扱いをする)、engine の invariant が drift する。空 level cleanup は \`submit\` が既に維持している invariant なので、\`cancel\` も維持する必要がある。

**Q: closure 内の \`if !found &&\` ガードはなぜ必要か?**
これがないと、\`retain\` が見つけて以前の level から削除した後も全 level をスキャンしてしまう。マッチは最大 1 回 (\`OrderId\` で unique なので) なので、\`found\` flag は correctness fix というより最適化に近い。ただし、最初のマッチで \`found = true\` を設定すれば、以降の level で \`iter().position()\` 呼び出し (各 level の O(k) 仕事) をスキップできる。**Early-out のための最適化。**

**Q: 2 つの異なる order が同じ \`OrderId\` を持っていたらどうなるか?**
\`cancel\` は最初に見つけた方を削除する (おそらく bid 側 — 先に scan されるため)。Matching engine は book 内で \`OrderId\` が unique であることを仮定する — それを保証するのは caller の責任。L1 の newtype + \`pub u64\` field 設計がこれを caller の仕事にしている: caller が ID を構築し、unique 性を所有する。

**Q: 各 VecDeque で \`position\` を使って \`(Reverse<Price>, position)\` を得て、\`retain\` の外で削除するのはどうか?**
position を見つけるために BTreeMap を immutably borrow し、削除するために mutably borrow する必要があり、Rust の borrow checker は position を \`clone()\` しないとそれを拒否する。\`retain\` アプローチなら mutable borrow を全期間保持できる — シンプル。

## 次のレッスン (L7)

Matching engine がコンパイルできる。**できていないこと**: 動くことを証明する。L7 でテストモジュールを始める — 期待するシナリオをカバーする hand-trace 済み unit test 9 個: 空 book マッチング、price level 内の FIFO time priority、market order の liquidity 枯渇、複数 price level にわたる partial 約定、cancel と再 submit、マッチ後の no-crossed-book invariant。各 test が engine の specific な 1 path を順に辿り、合わせるとここまで build した matching ロジックの regression suite になる。`,
                },
              ],
            },
          },
          {
            title: "テスト",
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: "レッスン 7 — hand-trace された unit test 9 個",
                  slug: "openhl-clob-unit-tests-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン 7 — hand-trace された unit test 9 個

## ゴール

このレッスンで掴む概念:

- **網羅は本数ではなく invariant 単位** — 9 個のテストは「9 個の任意のシナリオ」ではない。それぞれが別個の invariant に対応する (empty-book、resting、walks-levels、respects-limit、FIFO time priority、partial-market、cancel-found、cancel-not-found、no-cross)。Invariant の一覧が短く明確だからこそ、9 という数が正当化できる。
- **Hand-trace された unit test が proptest (L8) の oracle になる** — proptest が乱数 25-action sequence で fail したら、invariant を 1 つだけ切り出した hand-trace テストでデバッグする。Proptest は増幅器、unit test は土台。
- **Builder pattern より helper 関数** — 位置引数の \`limit(...)\` / \`market(...)\` は重複を取り除く最安の抽象。Builder pattern は ~5 行で済むテストには儀式的すぎる。
- **ソース順序が優先度を表す** — \`book_does_not_cross_after_match\` を最後に置くのは、maintainer に対して「これが load-bearing な safety property」というシグナル。テスト実行はアルファベット順、ソース順序は人間向け。
- **\`assert!(a == b)\` より \`assert_eq!\`** — \`assert_eq!\` は失敗時に両辺を出す。実際の値が見えるかどうかがデバッグ速度を決める。

検証:

\`\`\`bash
cargo test -p openhl-clob
\`\`\`

上記の実行結果が **テスト 9 個** に合格する。

具体的な変更:

\`book.rs\` の末尾に新規 \`#[cfg(test)] mod tests\` block を置く:

- **ヘルパー関数 2 個** — \`limit(...)\` と \`market(...)\`。テスト本体で 5 field の struct リテラルを繰り返さずに済むよう、適切なデフォルトで \`Order\` を構築する。
- **hand-trace されたシナリオ 9 個** — それぞれ matching engine が維持すべき特定の invariant をテストする。

9 個のテストは **regression safety net**。誰か (あるいは自分) が \`submit_limit\`、\`submit_market\`、\`cancel\` にバグを入れた瞬間、少なくとも 1 つのテストが catch する。合わせて、L4-L6 で書いた matching ロジックが **実際に動く** ことの load-bearing な証明になる。

## おさらい

L6 完了時点で、matching engine は機能的に完成:

\`\`\`rust
// book.rs (~190 行)
pub struct Book { bids, asks }
impl Book {
    pub fn new() -> Self
    pub fn submit(&mut self, order: Order) -> FillResult
    pub fn cancel(&mut self, order_id: OrderId) -> bool
    pub fn best_bid(&self) -> Option<Price>
    pub fn best_ask(&self) -> Option<Price>
    pub fn depth_bid(&self) -> usize
    pub fn depth_ask(&self) -> usize
}
\`\`\`

\`cargo check -p openhl-clob\` がクリーン。**ただし engine が正しいことの証明はない。** すべてのマッチがサイレントに間違っているかもしれない — 今は compile が通ること以上に何も assert していない。L7 でそこを直す。

## 計画

\`crates/clob/src/book.rs\` の末尾、\`fn match_at_level\` の後、\`impl Book\` の **外** に block を 1 つ追加する:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    fn limit(...) -> Order { ... }
    fn market(...) -> Order { ... }

    #[test] fn empty_book_has_no_best_prices() { ... }
    #[test] fn resting_limit_creates_bid_or_ask() { ... }
    #[test] fn buy_market_takes_best_ask() { ... }
    #[test] fn limit_buy_walks_asks_within_price() { ... }
    #[test] fn price_time_priority_within_level() { ... }
    #[test] fn market_with_insufficient_liquidity_returns_remaining() { ... }
    #[test] fn cancel_removes_resting_order() { ... }
    #[test] fn cancel_unknown_returns_false() { ... }
    #[test] fn book_does_not_cross_after_match() { ... }
}
\`\`\`

それだけ。新規型もなし、\`Book\` の新規 method もなし。テスト 9 個 + ヘルパー 2 個。

9 個のテストは **複雑さ順** に並べる: 最もシンプルな invariant (空 book に price なし) で始まり、最も強い invariant (マッチ後に book が cross しない — 整形 orderbook をゴミから区別する **safety property**) で終わる。

> 🛑 **考えてみよう。** スクロールする前に: 9 個のうちどれが、\`submit_limit::Buy\` が ask を **降順** (最高値先) に辿るバグで失敗するか? ヒント: 「best ask 先」を明示的に assert しているテストを考える。

(答え: \`buy_market_takes_best_ask\`。\`r.fills[0].price == Price(100)\` と \`r.fills[1].price == Price(105)\` で best-first を assert している。降順に辿るバグだと \`[105, 100]\` を生成してしまう。**Directional バグは randomized テストでも catch できるが、hand-trace テストならより安く catch できる。**)

## 手順

### Step 1: テストモジュールを設定

\`crates/clob/src/book.rs\` の \`impl Book\` block の **外**、\`fn match_at_level\` の **後** に追加:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    fn limit(id: u64, account: u64, side: Side, price: u64, qty: u64) -> Order {
        Order {
            id: OrderId(id),
            account: AccountId(account),
            side,
            qty: Qty(qty),
            order_type: OrderType::Limit {
                price: Price(price),
            },
        }
    }

    fn market(id: u64, account: u64, side: Side, qty: u64) -> Order {
        Order {
            id: OrderId(id),
            account: AccountId(account),
            side,
            qty: Qty(qty),
            order_type: OrderType::Market,
        }
    }

    // テスト続く...
}
\`\`\`

ヘルパー関数 2 個。これがないと、各テスト本体で次のように書くことになる:

\`\`\`rust
let order = Order {
    id: OrderId(1),
    account: AccountId(100),
    side: Side::Sell,
    qty: Qty(5),
    order_type: OrderType::Limit { price: Price(100) },
};
\`\`\`

…order ごとに 5 行の boilerplate になる。\`limit(1, 100, Side::Sell, 100, 5)\` なら 1 行で済む。ヘルパーは raw \`u64\` を取り適切な newtype でラップするだけ。

**引数順序が重要**: \`limit\` は \`(id, account, side, price, qty)\`、\`market\` は \`(id, account, side, qty)\`。一度覚えれば、どのテストでも同じ慣習で書ける。\`id\` を先頭に置くと、テストが時間順に読める (\`limit(1, ...)\` が最初の order、\`limit(2, ...)\` が 2 番目)。

> 🛑 **やりがちな勘違い。** 「Builder パターンを使う — \`OrderBuilder::new().id(1).account(100).side(Buy).qty(10).limit_price(100).build()\`」。 **5-field struct リテラルより冗長で、本末転倒。** Builder が活きるのは field が optional だったり広く変動したりするとき。ここでは全 order が全 5 field を持ち、すべて必須。positional 引数の 5-arg 関数なら書くのも読むのも速いし、Order が何を必要とするかを reader に即座に伝えられる。

### Step 2: Test 1 — \`empty_book_has_no_best_prices\`

\`tests\` モジュール内、ヘルパーの後:

\`\`\`rust
    #[test]
    fn empty_book_has_no_best_prices() {
        let book = Book::new();
        assert_eq!(book.best_bid(), None);
        assert_eq!(book.best_ask(), None);
        assert_eq!(book.depth_bid(), 0);
        assert_eq!(book.depth_ask(), 0);
    }
\`\`\`

最もシンプルなテスト: 新しく構築された \`Book\` は price がなく、depth がゼロ。**これが失敗するなら \`Book::new()\` か accessor ロジックのどこかが壊れている。** 以降の全テストがこれに依存する — \`new()\` がゴミ状態を返すなら他のどれも意味をなさない。

\`assert_eq!(book.best_bid(), None)\` は trivial に見えるが価値のあるテスト。Accessor が \`Some(Price(0))\` を返してしまう可能性 (default-construction バグ) があるからだ。\`None\` が「liquidity が存在しない」を明示的に signal する。

### Step 3: Test 2 — \`resting_limit_creates_bid_or_ask\`

\`\`\`rust
    #[test]
    fn resting_limit_creates_bid_or_ask() {
        let mut book = Book::new();
        let r = book.submit(limit(1, 100, Side::Buy, 90, 10));
        assert!(r.fills.is_empty());
        assert_eq!(book.best_bid(), Some(Price(90)));
        assert_eq!(book.best_ask(), None);

        let r = book.submit(limit(2, 101, Side::Sell, 100, 5));
        assert!(r.fills.is_empty());
        assert_eq!(book.best_ask(), Some(Price(100)));
    }
\`\`\`

空 book に Buy Limit @ 90 が入る → 約定なし、bid として rest する。Sell Limit @ 100 が入る → 約定なし (bid 90、ask が欲しいのは 100 なので cross しない)、ask として rest する。

submit ごとに鍵となる assertion が 2 つ:
- **\`r.fills.is_empty()\`** — 反対側に何もなかったのでマッチなし。
- **\`book.best_bid() == Some(Price(90))\`** — resting order が accessor で観察可能。

これが L4 の「rest-the-remainder」パスの実証になる。

### Step 4: Test 3 — \`buy_market_takes_best_ask\`

\`\`\`rust
    #[test]
    fn buy_market_takes_best_ask() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5));
        book.submit(limit(2, 101, Side::Sell, 105, 5));

        let r = book.submit(market(99, 200, Side::Buy, 8));
        assert_eq!(r.fills.len(), 2);
        assert_eq!(r.fills[0].price, Price(100)); // best ask first
        assert_eq!(r.fills[0].qty, Qty(5));
        assert_eq!(r.fills[1].price, Price(105));
        assert_eq!(r.fills[1].qty, Qty(3));
        assert_eq!(r.remaining_qty, Qty(0));
        assert_eq!(book.depth_ask(), 1); // ask @ 105 has 2 left
    }
\`\`\`

セットアップ: resting ask 2 個、価格 100 (5 unit) と 105 (5 unit)。8 unit の Market buy が arrive する。期待マッチング:
- Price 100 (最安) から 5 取り、残り 3 unit。
- Price 105 (次に安い) から 3 取る。
- 合計 fill: 8。Remaining: 0。

Assert がこれを encode する: best-first 順で約定 2 つ、\`remaining_qty == 0\` (Market が完全に約定)、ask @ 105 は依然 2 unit depth が残る。

**このテストが catch するもの**: ask 走査の directional バグ ("best first" をテスト) と、「空 level drop」invariant (価格 100 の level が完全消費後に消え、105 level は depth が減って残る)。

### Step 5: Test 4 — \`limit_buy_walks_asks_within_price\`

\`\`\`rust
    #[test]
    fn limit_buy_walks_asks_within_price() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5));
        book.submit(limit(2, 101, Side::Sell, 105, 5));

        // Buy limit @ 103 — should only fill the 100-priced level.
        let r = book.submit(limit(99, 200, Side::Buy, 103, 10));
        assert_eq!(r.fills.len(), 1);
        assert_eq!(r.fills[0].price, Price(100));
        assert_eq!(r.fills[0].qty, Qty(5));
        // Remainder rests as a bid @ 103.
        assert_eq!(book.best_bid(), Some(Price(103)));
        assert_eq!(book.depth_bid(), 1);
    }
\`\`\`

Test 3 と同じ開始 book (ask が 100 と 105)。ただし今度は incoming order が 10 unit の **Limit Buy @ 103**。

期待:
- 価格 100 の ask は at-or-better (100 ≤ 103) — 5 unit マッチ。
- 価格 105 の ask は at-or-better **ではない** (105 > 103) — マッチ停止。
- 残り 5 unit が 103 で新しい bid として rest する。

Test 3 との違いは、**limit price check** が走査を早く止める点。Test 3 の Market buy は 100 を辿り続けた (Market は任意の価格を取る) が、test 4 の Limit buy は 103 で止まる。

この 2 つのテストを合わせると、L4 の price-check ロジックが両方向で動くことを証明できる: Market (check なし、全部辿る) と Limit (check あり、limit で止まる)。

### Step 6: Test 5 — \`price_time_priority_within_level\`

\`\`\`rust
    #[test]
    fn price_time_priority_within_level() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5)); // first
        book.submit(limit(2, 101, Side::Sell, 100, 5)); // same price, later

        let r = book.submit(market(99, 200, Side::Buy, 7));
        assert_eq!(r.fills.len(), 2);
        assert_eq!(r.fills[0].maker_order_id, OrderId(1)); // first in, first out
        assert_eq!(r.fills[0].qty, Qty(5));
        assert_eq!(r.fills[1].maker_order_id, OrderId(2));
        assert_eq!(r.fills[1].qty, Qty(2));
    }
\`\`\`

**同じ price** (100) に resting Sell が 2 個、提出順は order 1、その後 order 2。7 unit の Market buy が arrive する。

期待:
- Order 1 (最初に place された方) が最初に約定 — 5 unit。
- Order 2 (2 番目に place された方) が次に約定 — 2 unit。

これが「price-time priority」のうち **time priority** の半分。Price level 内では order が FIFO で並び、first in が first out になる。L3 で選んだ \`VecDeque<RestingOrder>\` がこれを \`push_back\` (新規 order を末尾に) と \`pop_front\` (マッチした order を先頭から) で自然に実装している。

**このテストが失敗する** のは、誤って \`Vec<RestingOrder>\` を使って \`Vec::remove(0)\` した場合 (結果は正しいが queue を shift するためマッチごとに O(n) になる) や、\`push_back\` の代わりに \`VecDeque::push_front\` を使った場合 (newest-first になり、price-anti-time-priority になる)。

### Step 7: Test 6, 7, 8 — Market with leftover, cancel, cancel-unknown

\`\`\`rust
    #[test]
    fn market_with_insufficient_liquidity_returns_remaining() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 3));

        let r = book.submit(market(99, 200, Side::Buy, 10));
        assert_eq!(r.fills.len(), 1);
        assert_eq!(r.fills[0].qty, Qty(3));
        assert_eq!(r.remaining_qty, Qty(7)); // market discards remainder
        assert_eq!(book.depth_ask(), 0);
    }

    #[test]
    fn cancel_removes_resting_order() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Buy, 90, 10));
        assert_eq!(book.depth_bid(), 1);

        assert!(book.cancel(OrderId(1)));
        assert_eq!(book.depth_bid(), 0);
        assert_eq!(book.best_bid(), None);
    }

    #[test]
    fn cancel_unknown_returns_false() {
        let mut book = Book::new();
        assert!(!book.cancel(OrderId(999)));
    }
\`\`\`

短いので 3 テストを 1 step にまとめる:

- **Test 6 (\`market_with_insufficient_liquidity_returns_remaining\`)**: 3 unit の単一 ask、10 unit の Market buy — L5 の「Market が remainder を破棄する」意味論を exercise する。\`remaining_qty == 7\` (unfilled 部分)。Book は後で空になる。
- **Test 7 (\`cancel_removes_resting_order\`)**: resting bid を作り、それを cancel する。\`cancel\` が \`true\` を返すこと、depth が 0 になること、\`best_bid()\` が \`None\` を返すこと (L6 の空 level cleanup) を verify する。
- **Test 8 (\`cancel_unknown_returns_false\`)**: 一度も submit していない OrderId を cancel する。\`false\` を返し、book は不変であることを verify (空 book には何もないので当然)。

Test 7 と 8 のペアは \`cancel\` のバグの一群を catch する: \`cancel\` が \`true\` を無差別に返したら test 8 が catch し、有効な cancel に \`false\` を返したら test 7 が catch する。**成功 path と失敗 path をセットで check するテスト** は、片方だけよりも robust。

### Step 8: Test 9 — \`book_does_not_cross_after_match\`

最重要テスト、最後:

\`\`\`rust
    #[test]
    fn book_does_not_cross_after_match() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5));
        book.submit(limit(2, 101, Side::Buy, 95, 5));
        // Spread: bid 95, ask 100. No cross.
        let bid = book.best_bid().unwrap();
        let ask = book.best_ask().unwrap();
        assert!(bid < ask);

        // Now a buy @ 100 — fully fills, no resting.
        book.submit(limit(3, 102, Side::Buy, 100, 5));
        // Best bid is still 95 (from order 2). Ask is gone.
        assert_eq!(book.best_bid(), Some(Price(95)));
        assert_eq!(book.best_ask(), None);
    }
\`\`\`

**no-crossed-book invariant**: 常に \`best_bid < best_ask\` が成り立つ (またはどちらか side が空)。Crossed book — \`best_bid >= best_ask\` — はマッチすべき buy と sell が共存している状態のこと。**Soundness 違反**: matching engine が何らかの形で衝突すべき 2 つの order を book に共存させてしまったということ。

このテストのセットアップ:
1. Sell @ 100、Buy @ 95 → spread = (95, 100)、cross なし。\`bid < ask\` を assert する。
2. Incoming Buy @ 100 → 価格 100 の ask とちょうどマッチ (5 unit ↔ 5 unit)、rest する leftover はない。
3. 最終状態: ask は消失 (消費)、bid は依然 95 (order 2 は untouched)。

最終 assert:
- \`best_bid() == Some(Price(95))\` — order 2 はまだ resting。
- \`best_ask() == None\` — order 1 の ask は完全に消費されている。

**これが最強のテストである理由**: no-crossed-book invariant こそが orderbook を **正しい** ものにしている。Cross する book は、起こるべきトレードが起こっていない取引所を見せていることになる — matching engine としての根本的失敗。これが pass すれば、engine が safety property を維持しているという **証拠** が得られる (証明ではない — それは L8 の proptest で行う)。

> 🛑 **やりがちな勘違い。** 「9 個ではなく 100 個の unit test を書けばよい? カバレッジは多い方がよい」。 **多くのテストでも同じ path を exercise しているなら、カバレッジが増えたことにはならない。** この 9 個は **異なる invariant** を exercise するように選んである: empty-book、resting、market-walks-levels、limit-respects-price、time-priority、partial-market、cancel-found、cancel-not-found、no-cross。それぞれが他 8 個ではテストできない property をテストする。**「buy crosses ask」をひたすら exercise する 100 個のテストは、99 個が冗長。**

## テスト

\`\`\`bash
cargo test -p openhl-clob
\`\`\`

期待:

\`\`\`
running 9 tests
test tests::book_does_not_cross_after_match ... ok
test tests::buy_market_takes_best_ask ... ok
test tests::cancel_removes_resting_order ... ok
test tests::cancel_unknown_returns_false ... ok
test tests::empty_book_has_no_best_prices ... ok
test tests::limit_buy_walks_asks_within_price ... ok
test tests::market_with_insufficient_liquidity_returns_remaining ... ok
test tests::price_time_priority_within_level ... ok
test tests::resting_limit_creates_bid_or_ask ... ok

test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

テストはアルファベット順で走る (Rust のデフォルト)。9 個すべて pass する。

よくあるエラーと対処:

- **test 内で \`error: cannot find function 'limit' in this scope\`** — \`fn limit(...)\` が \`mod tests\` block の外にある。\`use super::*;\` 行の後、block 内に移動する。
- **\`assertion failed: r.fills[0].price == Price(100)\`** で失敗 — \`Price(105)\` を得た。バグは \`submit_market\` か \`submit_limit\` で、間違った方向に辿っている。\`keys().next()\` 呼び出しを確認: ask は最安先、bid (\`Reverse<Price>\` 付き) は最高先が欲しい (key が \`Reverse<Price>\` なら \`keys().next()\` がそれを返してくれる)。
- **\`price_time_priority_within_level\` で \`assertion failed: r.fills[0].maker_order_id == OrderId(1)\`** — \`OrderId(2)\` が来た。つまり後で submit した order が先にマッチしている = Queue が LIFO になっている。\`submit_limit\` の rest path を確認: \`push_back\` (FIFO) すべきで、\`push_front\` (LIFO) ではない。
- **\`market_with_insufficient_liquidity_returns_remaining\` で \`assertion failed: book.depth_ask() == 0\`** — ask が cleanup されていない。\`submit_market\` の loop で \`if queue.is_empty() { self.asks.remove(&best_price) }\` step (または Sell ケースの bid 等価) が抜けている。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Builder パターンや struct リテラルよりヘルパー関数を選んだ。** \`limit(...)\` と \`market(...)\` は 5 引数 / 4 引数の関数で positional 引数。書くのも読むのも速く、ドキュメント不要 (関数名と引数位置で self-explanatory)。**正しい抽象量は「繰り返しを取り除く分だけ」。**

2. **9 個のテストは有限で defensible なセット。** 各テストが特定の invariant に対応する: empty-book、resting、walks-levels、respects-limit、FIFO、partial-market、cancel-found、cancel-not-found、no-cross。100 個書く必要はない。**Invariant のリストは短く明確であるべきで、カバレッジは invariant 単位で測るもの。テスト数ではない。**

3. **\`book_does_not_cross_after_match\` を最後に配置している。** テストはアルファベット順で走るので、このテストの **ソース順序** での位置は実行順に影響しない。だが **読む** 順序 (上から下に file を scan するメンテナの視線) では、最重要テストが最も目立つ位置に来る。**ソース上のレイアウト自体が「何が最重要か」の優先度シグナルを encode する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
\`\`\`

L7 後、\`book.rs\` には末尾にテストモジュール (9 tests + 2 helper) が入る。参照の \`55a9dff\` は doc-comment の言い回し以外同一。参照には \`mod prop_tests\` block もある — それは L8 の範囲。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: ヘルパーが \`pub limit\` / \`pub market\` ではなく \`limit\` / \`market\` なのはなぜか?**
\`mod tests\` block に private なものだから。他のモジュールがテスト用の Order を construct する必要はない。Private に保っておくのが正しい encapsulation: テストは自由に使えるが、test ヘルパーが \`openhl-clob\` の public API に漏れることはない。

**Q: テストをパラメータ化して、たとえば「任意の incoming order に対して book invariant が成り立つ」という property test にすべきか?**
L8 でまさにそれをやる — 768 ランダムシナリオを exercise する proptest invariant 3 個。ただし proptest は hand-trace テストを oracle として依存する。proptest が失敗したときに、それを isolate できる小さな hand-trace テストが欲しいから。**Hand-trace unit test が基礎、proptest がそれを amplify する役。**

**Q: Sell-side limit order のテストは?**
良い質問。9 個のテストが buy-side シナリオに focus しているのは、trace するのが直感的だから (「ask を最安先で辿る」は「bid を最高先で辿る」よりイメージしやすい)。Sell-side テストは correctness 上必須ではない — **もし** \`submit_limit::Sell\` が \`submit_limit::Buy\` の構造的 mirror なら (L4 で確立済み)。心配なら sell-side テストをいくつか追加すればよい — このセットの test 3、4、5 を mirror すればよい。

**Q: なぜ \`assert!\` ではなく \`assert_eq!\` を使うのか?**
\`assert_eq!(a, b)\` は失敗時に両方の値を print してくれるが、\`assert!(a == b)\` は値なしの「left == right」だけを print する。Test デバッグでは、engine が生成した実際の値を知ることが重要。比較が equality なら \`assert_eq!\` が厳密に優れている。

## 次のレッスン (L8)

Hand-trace されたテスト 9 個。**思いついた specific シナリオをカバーするものだ。** L8 で **proptest invariant 3 個** を追加する — 任意の submit+cancel action sequence に対して成立する property:

- **\`qty_conservation\`**: book に入る合計 quantity = 合計 filled + 合計 resting。
- **\`no_crossed_book\`**: \`best_bid < best_ask\` が常に成立する (test 9 で hand-trace した safety property を今度はランダムテストする)。
- **\`determinism\`**: 同じ action sequence が同じ約定列と同じ book state を生成する。

256 ランダムケース × 3 invariant = 768 ランダムシナリオ。どれか 1 個でも invariant に違反すれば、proptest が **失敗 sequence を最小反例に自動的に shrink する**。それが example よりも property の load-bearing な利点。`,
                },
                {
                  title: "レッスン 8 — proptest invariant 3 個: 768 ランダムシナリオ",
                  slug: "openhl-clob-proptests-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン 8 — proptest invariant 3 個: 768 ランダムシナリオ

## ゴール

このレッスンで掴む概念:

- **Determinism は consensus chain の load-bearing property** — 正しいが非決定的な matching engine は consensus を壊す (validator が同じ action を replay しても異なる約定を見て合意できない)。決定的だが間違っている engine は修正可能、非決定的な engine は修復不能。\`determinism\` invariant が chain の安全性を守る。
- **Property test は自分が思いつかなかったシナリオのバグを見つける** — 9 個の hand-trace は予想できる範囲を覆う。256 case × 3 property = 768 個の random sequence が裾野 (例:「limit を 17 個 submit してから空 side に market」) を覆う。shrink によって、fail した 25-action sequence が最小反例まで自動で縮む。
- **Conservation、safety、replayability の直交する 3 不変条件** — \`qty_conservation\` (量が生まれず消えない)、\`no_crossed_book\` (常に best_bid < best_ask)、\`determinism\` (同じ入力 → 同じ出力)。どんな matching engine も満たすべき普遍的な CLOB 不変条件。
- **\`proptest\` は \`[dev-dependencies]\` であって \`[dependencies]\` ではない** — property test は \`cargo test\` 時にのみ走り、production では使わない。\`[dependencies]\` に入れると、\`openhl-clob\` のすべての consumer に proptest のコンパイルを強制してしまう。
- **\`Action\` enum は generator 用の simplified intermediate** — proptest combinator は primitive 型で最も書きやすい。Strategy は生の \`u64\` を吐き、テスト本体が \`submit\` を呼ぶ前に newtype で wrap する。Newtype の規律は API 境界で効かせ、generator 内部には持ち込まない。

検証:

\`\`\`bash
cargo test -p openhl-clob
\`\`\`

上記の実行結果が **12 個のテスト** (unit 9 + proptest invariant 3) に合格し、各 proptest が **256 case** ずつ走る = **768 ランダムシナリオ**。

具体的な変更:

- **新規 dev-dep 1 個** — \`crates/clob/Cargo.toml\` に \`proptest = { workspace = true }\`。
- **新規 \`#[cfg(test)] mod prop_tests\` block** を \`book.rs\` の末尾に:
  - \`Action\` enum — property generator 用の simplified action 表現。
  - 3 個の generator strategy — \`arb_side\`、\`arb_action\`、\`arb_actions\` — random で valid な action sequence を生成する。
  - 3 個の \`proptest!\` block — \`qty_conservation\`、\`no_crossed_book\`、\`determinism\`。

L8 後、matching engine は **多くの random ordering** にわたって invariant が成立するという **property-level の証明** を手にする — L7 の 9 個の hand-trace シナリオだけではなく。

## おさらい

L7 完了時点:

- hand-trace unit test 9 個が pass。
- 各テストが specific なシナリオで specific な invariant をテストしている。

**L7 がテストしないもの**: random sequence。たとえば 17 個の limit を submit して 3 個を cancel し、さらに Market を submit したときだけ trigger するバグは、L7 の 9 個ではほぼ確実に見逃す。そのシナリオを自分で思いつくか (難しい — バグはテストしようと思わない場所に隠れる)、それとも **多数のシナリオ** を自動でテストするか。L8 では後者をやる。

## 計画

3 つやる:

1. **\`proptest\` を dev-dep として \`crates/clob/Cargo.toml\` に追加する**。\`proptest\` は既に workspace dep として宣言されている (既存 rethlab L1 Architect 階層の \`consensus\` の proposer-election test で使用済み) ので、使うことを宣言するだけでよい。
2. **\`book.rs\` の既存 \`mod tests\` の下に新規 \`mod prop_tests\` block を追加する**。新規モジュール内には次を入れる:
   - \`Action\` enum (property test が exercise する操作のサブセット — 今は SubmitLimit + SubmitMarket のみ。cancel は follow-up で扱う)。
   - random な \`Action\` sequence の generator strategy。
   - invariant ごとに 1 つの \`proptest!\` block — 計 3 個。
3. **\`cargo test -p openhl-clob\`** — 12 個 pass (unit 9 + prop 3)。

3 つの invariant:

- **\`qty_conservation\`**: book に入る合計 quantity = 合計 filled + 合計 resting (「お金の計算が保存される」property)。
- **\`no_crossed_book\`**: \`best_bid < best_ask\` が常に成立する — test 9 で hand-trace した safety property を、今度はランダムテストする。
- **\`determinism\`**: 同じ action sequence が毎回同じ約定列と同じ book state を生成する。**これが chain の safety が依存する replayability property。**

Proptest がどれかで反例を見つけたら、失敗 input を最小に **自動 shrink** してくれる。これが example よりも property の load-bearing な利点。

> 🛑 **考えてみよう。** スクロールする前に: \`submit_limit::Buy\` が時折 (たとえば 1% の確率で) ask を best-first ではなく **random** 順に辿ってしまうバグがあったとする。3 invariant のうち、どれが最も速く catch するか? どれが最も informative に catch するか?

(答え: \`qty_conservation\` は間接的に catch する — 十分なケースで、間違った走査順が hand math の期待と異なる matched price を生成する。\`no_crossed_book\` は直接 catch する: 最安 ask を先に取らない buy は cheaper ask を book に残してしまい、次にその ask より上の bid が来た瞬間に cross する。\`determinism\` は **毎回** catch する — 各 run が異なる「random」走査順を選ぶので、同じ input の 2 run が異なる約定を生成する。**\`determinism\` こそが consensus chain の load-bearing property** — これがなければ validator が合意できない。)

## 手順

### Step 1: \`proptest\` を \`crates/clob/Cargo.toml\` に追加

\`crates/clob/Cargo.toml\` を開く。現状:

\`\`\`toml
[package]
name         = "openhl-clob"
# ... shared package fields ...

[dependencies]

[lints]
workspace = true
\`\`\`

\`[dev-dependencies]\` セクションを追加:

\`\`\`toml
[package]
name         = "openhl-clob"
# ... shared package fields ...

[dependencies]

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
\`\`\`

\`proptest\` は workspace \`Cargo.toml\` で既に宣言されている (workspace に追加する必要はない — L1 Architect の最初のコースから workspace dep として入っている)。\`[dev-dependencies]\` block に置けば test build 時のみ利用可能になり、production build には含まれない。

> 🛑 **やりがちな勘違い。** 「\`[dependencies]\` に入れて non-test コードでも使えるようにすればよいのでは?」 **そうすると \`openhl-clob\` のすべての consumer が \`proptest\` を runtime dependency として抱えることになる。** スマートコントラクト、validator、indexer — どれも matching engine を **使う** のに property test インフラを必要としない。\`[dev-dependencies]\` の規律で、テストインフラは必要なところにしか入れないようにする。

### Step 2: \`Action\` enum で \`mod prop_tests\` をセットアップ

\`crates/clob/src/book.rs\` で、既存 \`mod tests { ... }\` block の **後** に (module scope のまま) 追加:

\`\`\`rust
#[cfg(test)]
mod prop_tests {
    use super::*;
    use proptest::prelude::*;

    /// A simplified action enum for property-based testing.
    #[derive(Clone, Debug)]
    enum Action {
        SubmitLimit {
            id: u64,
            account: u64,
            side: Side,
            price: u64,
            qty: u64,
        },
        SubmitMarket {
            id: u64,
            account: u64,
            side: Side,
            qty: u64,
        },
    }
\`\`\`

\`Action\` enum は **proptest が random に generate するものを simplified に表現したもの**。各 variant は、実際の \`Book::submit\` 呼び出しが必要とする raw \`u64\` を保持する (後で newtype でラップする)。今のところ variant は 2 個 — Limit と Market submit。Cancel action はまだ追加しない。openhl の follow-up stage で追加する。

**なぜ action を enum でモデル化するのか?** Property test は action の **sequence** を generate する必要があり、各 action は N 種類のどれかになり得るから。Enum がその variability を捉えてくれる。Proptest の strategy combinator (\`prop_oneof!\`、\`prop::collection::vec\` 等) は enum とよくなじむ。

### Step 3: Strategy を書く

\`mod prop_tests\` 内で続けて:

\`\`\`rust
    fn arb_side() -> impl Strategy<Value = Side> {
        prop_oneof![Just(Side::Buy), Just(Side::Sell)]
    }

    fn arb_action(id: u64) -> impl Strategy<Value = Action> {
        let limit_action = (1u64..=200, 1u64..=20, arb_side(), 50u64..=150)
            .prop_map(move |(account, qty, side, price)| Action::SubmitLimit {
                id,
                account,
                side,
                price,
                qty,
            });
        let market_action = (1u64..=200, 1u64..=20, arb_side()).prop_map(
            move |(account, qty, side)| Action::SubmitMarket {
                id,
                account,
                side,
                qty,
            },
        );
        prop_oneof![3 => limit_action, 1 => market_action]
    }

    fn arb_actions() -> impl Strategy<Value = Vec<Action>> {
        prop::collection::vec(0u64..1000, 1..30)
            .prop_flat_map(|ids| {
                ids.into_iter()
                    .enumerate()
                    .map(|(i, _)| arb_action(i as u64 + 1))
                    .collect::<Vec<_>>()
            })
    }
\`\`\`

3 つの strategy を build up していく:

- **\`arb_side()\`** — uniform に Buy または Sell を選ぶ。\`prop_oneof![Just(...), Just(...)]\` が proptest の「これらリテラルのどれか 1 つ」combinator。
- **\`arb_action(id)\`** — 固定 \`id\` で random な \`Action\` を生成する。Limit 分岐は \`(account, qty, side, price)\` を range で生成し、Market 分岐は \`(account, qty, side)\` を生成する。重みは \`3 => limit_action, 1 => market_action\` — Limit action を Market の 3 倍の頻度にして、現実的な order-book usage を反映している。
- **\`arb_actions()\`** — 長さ 1..30 の random \`Vec<Action>\` を生成する。\`.prop_flat_map\` パターンは少し奇妙だ: まず u64 vec を生成して **長さを決め**、それから各 position を \`arb_action(i+1)\` にマップして order ID を increment する。ポイントは、\`arb_actions\` が strictly-increasing な order ID を持つ sequence を生成すること (book での collision を避けるため)。

**range (\`1..=200\` for account、\`50..=150\` for price) を使う理由は?** Proptest を **plausible** なシナリオへバイアスするため。\`0..=u64::MAX\` の range にすると、proptest はほとんどの場合 extreme outlier (account_id = 18_446_744_073_709_551_614 等) を生成する。現実的な range にすれば、実際のトレーディングに見えるシナリオが生成される: account 1-200、price 50-150、quantity 1-20。Matching engine のバグは、normal-looking な sequence に最も隠れやすい。

> 🛑 **やりがちな勘違い。** 「広い range = カバレッジが多い = 良い」。 **広い range = 役に立たないテストが多い。** 99.99% の確率で \`qty = u64::MAX - 1\` の order を generate しても、normal な matching ロジックは exercise されず、overflow 境界ケースばかり exercise されてしまう。両方とも興味深いが、**簡単なバグを安く先に見つけたい**。Range を plausible な値に絞れば、proptest が予算を実際の production traffic が exercise する matching path に使ってくれる。

### Step 4: 1 つ目の invariant — \`qty_conservation\`

Strategy の下に append:

\`\`\`rust
    proptest! {
        #![proptest_config(ProptestConfig {
            cases: 256,
            ..ProptestConfig::default()
        })]

        /// Quantity is conserved: every fill_qty came from a resting maker;
        /// total qty in/out balances.
        #[test]
        fn qty_conservation(actions in arb_actions()) {
            let mut book = Book::new();
            let mut total_in = 0u64;
            let mut total_filled = 0u64;
            let mut total_market_unfilled = 0u64;

            for action in actions {
                match action {
                    Action::SubmitLimit { id, account, side, price, qty } => {
                        total_in += qty;
                        let r = book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Limit { price: Price(price) },
                        });
                        total_filled += r.total_filled().0;
                    }
                    Action::SubmitMarket { id, account, side, qty } => {
                        total_in += qty;
                        let r = book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Market,
                        });
                        total_filled += r.total_filled().0;
                        total_market_unfilled += r.remaining_qty.0;
                    }
                }
            }

            // Resting quantity = total_in - 2*total_filled - total_market_unfilled.
            // (Each fill consumes one unit from a maker AND one unit from a taker,
            // so total_filled counts qty, but the qty appeared in total_in twice
            // — once when the maker was submitted, once when the taker arrived.)
            let resting: u64 = book.bids.values()
                .flat_map(|q| q.iter())
                .chain(book.asks.values().flat_map(|q| q.iter()))
                .map(|o| o.qty.0)
                .sum();
            prop_assert_eq!(total_in, 2 * total_filled + total_market_unfilled + resting);
        }
\`\`\`

これが「quantity is conserved」invariant。Body に counter 3 個:

- **\`total_in\`**: 提出された全 order の \`qty\` 値の合計。
- **\`total_filled\`**: 生成された全 \`Fill\` の \`fill_qty\` の合計。
- **\`total_market_unfilled\`**: Market order の \`remaining_qty\` の合計 (破棄された leftover)。

Invariant: \`total_in = 2 * total_filled + total_market_unfilled + resting_qty\`。

\`2 *\` が付くのはなぜか? **約定は maker から 1 unit と taker から 1 unit を消費するので、fill_qty の 1 unit が \`total_in\` に 2 回現れる** — maker が submit されたとき 1 回、taker が arrive したとき 1 回。計算:

| Action | \`total_in\` | 最後に残るもの |
| - | - | - |
| Limit 10 unit を submit し、完全に rest | +10 | 10 unit resting |
| Market 10 unit を submit、liquidity なし | +10 | 10 unit 破棄 (約定なし) |
| Limit 10 unit を submit、5 unit の ask とマッチ | +10 | 5 unit 約定 (各 side から 1 つずつ)、5 unit が rest として残る |

5 unit 約定する場合を考える: maker が 5 をオファーし (既に \`total_in\` に計上済み)、taker が 5 を取る (これも \`total_in\` に計上される)。約定した 5 unit が \`total_in\` に 10 として現れる — 各 side から 1 回ずつ。**だから \`2 * total_filled\` になる。**

**\`proptest!\` block の冒頭にある \`#![proptest_config(ProptestConfig { cases: 256, .. })]\` 行** が各テストを 256 回走らせる。Invariant 3 個 × 256 case = 768 ランダムシナリオ。

**\`prop_assert_eq!\` (\`assert_eq!\` ではない) が重要** — proptest が「テスト失敗」と「システムエラーで panic」を区別する必要があるから。\`prop_assert_eq!\` なら failure を proptest の shrinking 機構に報告し、最小反例を見つけようとしてくれる。

> 🛑 **やりがちな勘違い。** 「\`total_in = 2 * total_filled + ...\` はおかしい — なぜ double-count するのか?」 **marketplace では約定が **2 つの unit** を伴う — buyer の意図 1 個と seller の意図 1 個。** Maker が 5 オファーし taker が 5 取ると、engine は 10 unit の「マッチング需要」を見ている: 各 side から 5 個。2 つが size 5 の Fill 1 つにまとまったが、entered したときには 10 個の個別の taker-or-maker-unit だった。**この invariant が数えるのは個別の taker/maker 意図であって、unique な unit ではない。**

### Step 5: 2 つ目の invariant — \`no_crossed_book\`

最初の proptest の下、同じ \`proptest! { ... }\` block 内に:

\`\`\`rust
        /// Book invariant: best bid is strictly less than best ask. The book
        /// should never be crossed after submit() completes.
        #[test]
        fn no_crossed_book(actions in arb_actions()) {
            let mut book = Book::new();
            for action in actions {
                match action {
                    Action::SubmitLimit { id, account, side, price, qty } => {
                        book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Limit { price: Price(price) },
                        });
                    }
                    Action::SubmitMarket { id, account, side, qty } => {
                        book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Market,
                        });
                    }
                }
                if let (Some(b), Some(a)) = (book.best_bid(), book.best_ask()) {
                    prop_assert!(b < a, "book crossed: bid={} ask={}", b.0, a.0);
                }
            }
        }
\`\`\`

Body の流れ:

1. **各 action ごと** に order を submit する。
2. **各 submit 後** に \`book.best_bid() < book.best_ask()\` (両方存在する場合) を check する。
3. **どこかで \`best_bid >= best_ask\`** になればテスト失敗 — book が cross したことになる。

これは **L7 の \`book_does_not_cross_after_match\` と同じ invariant** だが、random sequence に対してテストする。L7 では **1 つ** のシナリオで invariant が成立することを証明したが、L8 では **256 個の randomized** シナリオで成立することを証明する。

\`prop_assert!(b < a, "...")\` macro は format string を取れる — proptest 失敗時、cross した実際の bid/ask 値がエラーメッセージに表示される。プレーンな \`assert!(b < a)\` よりも informative。

> 🛑 **やりがちな勘違い。** 「Property test が hand-trace test の見逃した failure を見つけたらどうする?」 **まさにそれが狙い。** Hand-trace test は specific なシナリオを verify し、proptest が general な invariant を verify する。Proptest がバグを見つけたら、shrinking phase が最小 failing case を生成してくれる — それを **永続的な regression test として hand-trace suite に追加する**。**Proptest がバグを見つけ、hand-trace test がそれを二度と戻らせない。**

### Step 6: 3 つ目の invariant — \`determinism\`

最重要:

\`\`\`rust
        /// Determinism: applying the same action sequence produces the same
        /// book + fill history every time. (The "replayability" property
        /// from the architecture doc — required for consensus determinism.)
        #[test]
        fn determinism(actions in arb_actions()) {
            let run = |actions: &[Action]| {
                let mut book = Book::new();
                let mut all_fills: Vec<Fill> = Vec::new();
                for action in actions {
                    let order = match action {
                        Action::SubmitLimit { id, account, side, price, qty } => Order {
                            id: OrderId(*id),
                            account: AccountId(*account),
                            side: *side,
                            qty: Qty(*qty),
                            order_type: OrderType::Limit { price: Price(*price) },
                        },
                        Action::SubmitMarket { id, account, side, qty } => Order {
                            id: OrderId(*id),
                            account: AccountId(*account),
                            side: *side,
                            qty: Qty(*qty),
                            order_type: OrderType::Market,
                        },
                    };
                    all_fills.extend(book.submit(order).fills);
                }
                (book.best_bid(), book.best_ask(), book.depth_bid(), book.depth_ask(), all_fills)
            };
            prop_assert_eq!(run(&actions), run(&actions));
        }
    }
}
\`\`\`

この invariant は、action sequence を fresh \`Book\` に適用し end state の 5-tuple を返す helper closure \`run\` を定義する: \`(best_bid, best_ask, depth_bid, depth_ask, all_fills_in_order)\`。

そして: \`prop_assert_eq!(run(&actions), run(&actions))\`。

**同じ input の 2 run が同じ output を生成しなければならない。** Matching engine に何らかの non-determinism — randomness、HashMap iteration 順、スレッディング race — が紛れ込んでいれば、このテストが catch する。

**これが最重要 property である理由**: consensus chain は、すべての validator が同じ input から同じ約定を計算することに依存している。1 人の validator の matching engine が別の validator と異なる約定を生成すれば、validator は block について合意できず、chain が fork する。**Determinism こそが load-bearing property** — \`no_crossed_book\` は correctness の話だが、determinism は **agreement** の話。正しいが non-deterministic な engine は consensus を壊すのに対し、deterministic だが incorrect な engine は少なくとも修復可能。

**\`Action::SubmitLimit { id, account, side, price, qty }\` の destructuring で \`*id\`、\`*account\` 等を使う** のは、\`actions\` が \`&[Action]\` として borrow されていて、各 field が borrowed \`&u64\` だから。\`*\` で deref して value を取り出す。

> 🛑 **やりがちな勘違い。** 「Determinism は trivial に true に見える — ただの関数適用ではないか」。 **trivial に見えるが、小さなミスがそれを壊す。** このテストが **失敗する** non-determinism の発生源としては:
> - \`bids\`/\`asks\` に \`BTreeMap\` の代わりに \`HashMap\` を使う (HashMap iteration がランダム化される)。
> - Telemetry 用に \`submit\` 内で \`std::time::Instant::now()\` 呼び出しを追加する。
> - Sync barrier なしで order を非同期処理する \`tokio::task\` を spawn する。
> - \`f64\` field を保存し、その bit 表現に依存する。
>
> どれもコンパイルが通り、\`no_crossed_book\` を pass してしまい、未来の contributor が導入したときに初めて失敗する — それを \`determinism\` がここで catch する。**6 ヶ月後の自分から今の自分を守るテスト。**

## テスト

\`\`\`bash
cargo test -p openhl-clob
\`\`\`

期待 (12 個のテスト):

\`\`\`
running 12 tests
test prop_tests::determinism ... ok
test prop_tests::no_crossed_book ... ok
test prop_tests::qty_conservation ... ok
test tests::book_does_not_cross_after_match ... ok
test tests::buy_market_takes_best_ask ... ok
test tests::cancel_removes_resting_order ... ok
test tests::cancel_unknown_returns_false ... ok
test tests::empty_book_has_no_best_prices ... ok
test tests::limit_buy_walks_asks_within_price ... ok
test tests::market_with_insufficient_liquidity_returns_remaining ... ok
test tests::price_time_priority_within_level ... ok
test tests::resting_limit_creates_bid_or_ask ... ok

test result: ok. 12 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

総実行時間は **数秒**。Proptest がテストごとに 256 case 走らせるが、各 case は小さな in-memory matching simulation なので、合計コストは 10 秒未満で済む。

どれかの prop test が失敗すると、次のように出る:

\`\`\`
proptest: Saving this and future failures in /Users/.../proptest-regressions/...
proptest: If this test was expected to be flaky, ...
\`\`\`

Proptest は **失敗 input を file にキャッシュ** する (\`proptest-regressions/\` 配下)。以降の run は最初にキャッシュ input を再テストするので、バグを見つけて修正したら毎回同じ最小反例で verify される。Regressions file は git に add しておく (小さい)。

よくあるエラーと対処:

- **\`error: cannot find macro 'proptest' in this scope\`** — \`mod prop_tests\` で \`use proptest::prelude::*;\` が抜けている。Step 2 を再確認。
- **\`error: trait 'Strategy' not satisfied\`** — generator 関数の return type が \`impl Strategy<Value = T>\` になっていない。\`prop_oneof![Just(...)]\` は \`Just\` 内の型に対して \`impl Strategy<Value = T>\` を返すが、\`.prop_map(...)\` を chain すると value type が変わることがある。生成する値と \`Strategy<Value = ...>\` 型が一致しているか確認。
- **\`prop_assert_eq\` で合計が一致せず失敗** — \`total_in\` accumulator が間違っている。各 submit で order の \`qty\` を \`total_in\` に加える (約定 quantity ではなく)。Step 4 を再確認 — sum は submit 時のみで、約定発生時には行わない。
- **Determinism 失敗** — どこかに HashMap、\`time::Instant\`、何らかの non-deterministic primitive を導入した可能性がある。L1-L7 のコードに対する最近の diff を確認 — バグは non-deterministic primitive が追加された場所にある。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Proptest は dev-dep であって runtime dep ではない。** Property test は \`cargo test\` で走り、production では走らない。\`[dependencies]\` に置くと \`openhl-clob\` のすべての consumer が proptest をコンパイル + link する羽目になる。\`[dev-dependencies]\` の規律で production dependency graph をクリーンに保つ。

2. **Action enum は simplified な中間表現。** 各 variant は raw \`u64\` を保持し、\`OrderId(u64)\` / \`AccountId(u64)\` 風に newtype でラップしない。**Proptest strategy が raw 値を generate し、test body が \`submit\` を呼ぶ前に newtype でラップする。** 意図的 — proptest の combinator は primitive 型と最もスムーズに動くし、\`as u64\` の ergonomics で boilerplate を節約できる。Newtype の強制は test generator 内ではなく API 境界 (\`submit\` 呼び出し) で行う。

3. **\`determinism\` が consensus の load-bearing property。** 正しいが non-deterministic な matching engine は consensus を壊すのに対し、deterministic だが incorrect な engine は修復可能。Non-determinism を catch するテストが chain の safety を守る。**Property は「何をテストするか」ではなく「何を守るか」で命名・優先順位付けする — その規律が肝。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/clob/Cargo.toml ./crates/clob/Cargo.toml
\`\`\`

L8 後、\`book.rs\` が \`55a9dff\` の参照を mirror する (doc コメント以外)。\`Cargo.toml\` に \`[dev-dependencies] proptest\` 行。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`cases: 256\` なのか? \`1024\` や \`100\` ではダメか?**
バランスの問題。256 case × 3 property × ~10ms per case ≈ 8 秒 — \`cargo test\` で毎回走らせるのに十分速い。1024 case なら 30 秒超になり、dev iteration の摩擦になる。100 case では稀なバグを見逃すリスクがある。**安く走らせられて、common なバグを catch できる程度の case count を選ぶ。**

**Q: なぜ proptest action に \`cancel\` を入れていないのか?**
Cancel action は determinism と conservation property を複雑にする: cancel 後、どの order ID が生きているかを track する必要が出てくる。「submit-only sequence」に simplify することで、3 つの invariant が tractable になる。Cancel-aware property は follow-up で追加すればよい。既存の 3 invariant が最も価値の高いところなので、まずそこを正しく押さえる。

**Q: Proptest が失敗 input を見つけたらどうなるか?**
**Shrinking phase** に入る。失敗 input から始めて、proptest がまだ失敗する最小の subset / 最小値を探す。本コースのテストケース generator (\`Vec<Action>\` を生成) では、shrinking で 25-action sequence が 3-action sequence まで縮んでバグを再現することもある。デバッグ対象はその最小 sequence — original input よりはるかに扱いやすい。

**Q: \`arb_actions\` に Limit order だけを生成させられるか?**
できる — \`arb_action\` の \`prop_oneof![3 => limit_action, 1 => market_action]\` を \`prop_oneof![1 => limit_action]\` に変える (あるいは \`prop_oneof\` を外して \`limit_action\` を直接 return する)。今ある invariant では Market order が **有用** (discard-remainder path を exercise する) だが、Limit-only flow に focus したければ可能。**Proptest strategy は composable。**

## 次のレッスン (L9)

Matching engine の徹底的なテストが完了した。**まだ consensus とは統合されていない。** L9 から Module 4 (Bridge integration) に入る: \`LiveRethEvmBridge\` に \`Book\` + \`pending_fills\` field を追加し、order を CLOB にルーティングして結果の Fill を buffer に蓄積する \`submit_order\` method を追加する。L9 後、bridge が matching engine を所有するようになる。L10 では \`build_payload\` で buffer を drain する。`,
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
                  title: "レッスン 9 — LiveRethEvmBridge に CLOB + submit_order を持たせる",
                  slug: "openhl-clob-bridge-fields-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 70,
                  content: `# レッスン 9 — \`LiveRethEvmBridge\` に CLOB + \`submit_order\` を持たせる

## ゴール

このレッスンで掴む概念:

- **CLOB は Reth EVM の *中* ではなく bridge の *横* に置く** — \`clob: Mutex<Book>\` は \`LiveRethEvmBridge\` のフィールドであり、\`provider\` や \`state\` と並ぶ。約定は payload に併走する parallel データレーンであって、まだ EVM transaction ではない (それは course 8 の precompile で扱う)。これが「CLOB を EVM の上に乗せる」アーキテクチャの形。
- **Lock 粒度: \`Mutex\` は 1 つではなく 2 つ** — \`clob\` と \`pending_fills\` は別タイミングで別 caller に変更される。Lock を分けておけば、\`pending_fill_count\` を読むスレッドが book を触る submitter を block しない。Contention がホットパスに乗ると lock 粒度が効いてくる。
- **Interior mutability + \`&self\` が async 共有 state の idiomatic な形** — \`submit_order(&self, ...)\` だからこそ、bridge を \`Arc\` で wrap して task 間で共有できる。トップに \`RwLock<Bridge>\` を載せると、すべてのアクセスが直列化してしまう。
- **Lock を取る API は lock 越しに参照を返してはならない** — \`payload_fills\` は \`&[Fill]\` ではなく \`Vec<Fill>\` (clone) を返す。Borrow を返すと caller がスライスの lifetime 分 lock guard を抱え続け、同じ lock を欲しがる他者と即デッドロックする。
- **空 \`Vec\` placeholder は TODO コメントより見つけやすい** — \`build_payload\` には L10 が \`std::mem::take(...)\` に差し替えるまで \`Vec::new()\` を入れておく。読者は欠けている機能の場所を正確に見られる。コメントは腐る。

検証:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

上記の実行結果が引き続き pass する (course 6 由来の 38 テスト + L9 の new test なし、合計依然 38)。Bridge が CLOB matching engine を **所有** するようになる。

具体的な変更:

- **新規 workspace dep 1 個** — \`crates/evm/Cargo.toml\` に \`openhl-clob = { workspace = true }\` を追加。
- **\`LiveRethEvmBridge\` に新規フィールド 2 個** — \`clob: Mutex<Book>\` と \`pending_fills: Mutex<Vec<Fill>>\`。
- **pending tuple を拡張** — \`pending: HashMap<u64, (B256, Header)>\` を \`HashMap<u64, (B256, Header, Vec<Fill>)>\` に変える。3 番目の要素が payload ごとの約定リスト。
- **新規メソッド 3 個** — \`submit_order(&self, order: Order) -> FillResult\`、\`payload_fills(id) -> Option<Vec<Fill>>\` (inspection 用)、\`pending_fill_count() -> usize\` (inspection 用)。
- **波及更新** — \`build_payload\`、\`payload_ready\`、\`validate_payload\`、\`commit\` での pending tuple の destructuring をすべて 3-tuple pattern に揃える。

**\`build_payload\` はまだ \`pending_fills\` を drain しない** — 今は空の \`Vec<Fill>\` を挿入する。drain の実装は L10 で行う。L9 後、order を submit でき、約定が \`pending_fills\` に蓄積していく様子も観察できるようになるが、bridge の payload はまだ約定を運ばない。**L10 でそのギャップを閉じ、L11 でそれを証明する integration test を書く。**

## おさらい

Course 6 (L14) + course 7 L8 完了時点で workspace は:

\`\`\`
crates/clob/                            — 完成した matching engine (L1-L8)
crates/evm/src/live_node.rs             — LiveRethEvmBridge<P>
  fields: provider, chain_spec, validator, engine_handle: Option<...>, state: Mutex<State>
  pending: HashMap<u64, (B256, Header)>
crates/consensus/                       — フル BFT engine
\`\`\`

\`cargo test -p openhl-evm\` で 38 個 pass する。**CLOB も bridge もそれぞれ存在するが、互いを知らない状態。** L9 で bridge を CLOB に接続する。

## 計画

\`crates/evm/\` 内で 6 項目 (実際の手順は 7 step):

1. **\`openhl-clob = { workspace = true }\`** を \`crates/evm/Cargo.toml\` の \`[dependencies]\` に追加する。
2. **Import を追加する** — \`crates/evm/src/live_node.rs\` に \`use openhl_clob::{Book, Fill, FillResult, Order};\` を入れる。
3. **\`clob\` + \`pending_fills\` フィールドを追加する** — \`LiveRethEvmBridge<P>\` struct に。
4. **\`pending\` を 3-tuple に変更する** — \`State\` struct 側。
5. **\`new()\` を更新する** — 新フィールドを初期化する。
6. **メソッド 3 個を追加する** — \`impl<P> LiveRethEvmBridge<P>\` block に \`submit_order\`、\`payload_fills\`、\`pending_fill_count\` を追加。
7. **destructuring を波及更新する** — \`build_payload\`、\`payload_ready\`、\`validate_payload\`、\`commit\` を新しい 3-tuple shape にマッチさせる。\`build_payload\` は今のところ空の \`Vec<Fill>\` を挿入しておく。

Step 7 は退屈に聞こえるが機械的な作業: \`(hash, header)\` や \`(h, _)\` を書いた場所すべてが \`(hash, header, fills)\` または \`(h, _, _)\` になる。Compiler が各場所をクリアなエラーで教えてくれる。

> 🛑 **考えてみよう。** スクロールする前に: L9 後、\`bridge.submit_order(order)\` を呼べるようになり、\`bridge.pending_fill_count()\` で fill が蓄積していく様子が観察できる。そこで \`bridge.build_payload(parent, attrs)\` を呼ぶと、新しく build された payload に対する \`bridge.payload_fills(id)\` は何を返すか? ヒント: §Step 7 を注意深く読む。

(答え: \`Some(vec![])\` — 空の fill リスト。L9 はデータフローを接続するが、\`build_payload\` はまだ drain せず空 Vec を挿入する。L10 の「build 時に drain」変更で、これが \`Some(vec![fill_a, fill_b, ...])\` になる。)

## 手順

### Step 1: \`crates/evm/Cargo.toml\` に dep を追加

\`crates/evm/Cargo.toml\` を開く。現在の \`[dependencies]\` セクション (course 6 後) には各種 \`openhl-types\`、\`reth-*\`、\`alloy-*\` dep がある。1 行追加:

\`\`\`toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
openhl-clob              = { workspace = true }      # NEW
async-trait              = { workspace = true }
# ... rest unchanged ...
\`\`\`

\`openhl-clob\` は workspace \`Cargo.toml\` に既に宣言済み (path entry を L1 で追加した)。\`[dependencies]\` entry は「この特定 crate がそれを使う」ことを宣言する役割を果たす。

### Step 2: \`live_node.rs\` に import を追加

\`crates/evm/src/live_node.rs\` を開く。現在の import に reth 関連型がある。\`openhl_consensus\` import の上にこの行を追加:

\`\`\`rust
use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use alloy_rpc_types_engine::ForkchoiceState;
use async_trait::async_trait;
use openhl_clob::{Book, Fill, FillResult, Order};                     // NEW
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
// ... rest unchanged ...
\`\`\`

4 つの型を pull in する: \`Book\` (matching engine)、\`Fill\` (output)、\`FillResult\` (\`Book::submit\` の wrapper)、\`Order\` (submit の input)。

モジュールレベルの doc comment も新しい stage を反映するように更新する。ファイル冒頭の既存 \`//! Stage 7X\` コメントブロックを探す:

\`\`\`rust
//! Stage 7a: parent lookups go through the live node's provider via the
//! \`BlockNumReader\` trait.
//!
//! Stage 7c: \`validate_payload\` runs Reth's \`EthBeaconConsensus::
//! validate_header_against_parent\` against the live parent ...
//!
//! Stage 7d: \`commit\` now sends a \`ForkchoiceUpdated\` to Reth's in-process
//! consensus engine ...
\`\`\`

…どこか妥当な場所 (7c と 7d の間でも構わない) に新規 Stage 8d block を挿入する:

\`\`\`rust
//! Stage 8d: the bridge now owns a CLOB matching engine. \`submit_order\` routes
//! orders into the book and accumulates resulting fills in \`pending_fills\`.
//! \`build_payload\` drains the pending fills and stores them alongside the
//! synthesized header, so the payload carries real CLOB-generated content.
//! Fills are not yet encoded as EVM transactions executable by Reth's
//! \`BlockExecutor\` — that's the next stage (or Module 3). 8d proves the
//! wiring exists; encoding is downstream.
\`\`\`

これがメタドキュメントの役割を果たす — 6 ヶ月後に誰かがファイルを読んだとき、staging comment が地図になる。

### Step 3: \`LiveRethEvmBridge\` にフィールド追加

Struct 定義を見つけ、\`validator\` と \`state\` の間にフィールド 2 個を追加する:

\`\`\`rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Mutex<Book>,                                            // NEW
    pending_fills: Mutex<Vec<Fill>>,                              // NEW
    engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>,
    state: Mutex<State>,
}
\`\`\`

\`Mutex\` でラップされたフィールドが 2 個。両方を \`Mutex\` にする理由は次の通り:

- **\`clob: Mutex<Book>\`** — matching engine。\`Book\` 自体は内部的に thread-safe ではない。\`Mutex\` でラップすれば、複数の caller が同時に order を submit できる (engine app loop に統合された後、bridge は \`Arc<LiveRethEvmBridge>\` で共有される)。
- **\`pending_fills: Mutex<Vec<Fill>>\`** — \`submit_order\` が fill を push し、(L10 の) \`build_payload\` が drain する buffer。\`clob\` と別の \`Mutex\` にしているのは、2 つが異なるタイミングで mutate するから: submit は matching のために \`clob\` の lock を短時間保持し、その後 append のために \`pending_fills\` の lock を短時間保持する。lock を分けることで、2 つの submit が submit → push の全 chain を直列化しなくて済む。

> 🛑 **やりがちな勘違い。** 「\`Mutex<(Book, Vec<Fill>)>\` 1 個ではなく \`Mutex\` 2 個にする理由は?」 **Lock 粒度。** 1 個の mutex で両方を覆うと、submit ごとに matching 作業と fill-buffer mutation の両方で lock を保持することになる。submit せずに \`pending_fill_count\` を読みたい将来のコード (たとえば L10 の \`build_payload\` drain やデバッグツール) が、submit-in-progress で block されてしまう。\`Mutex\` を 2 個にすれば、read が write contention を bypass できる。**コストは余分な \`Mutex::new\` 呼び出しが数個増える程度。利益は並行スループットの改善。**

### Step 4: \`pending\` tuple を変更

\`State\` struct 定義を見つける:

\`\`\`rust
#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, (B256, Header)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}
\`\`\`

\`pending\` の value 型を 3-tuple に変更し、3 番目要素を \`Vec<Fill>\` にする:

\`\`\`rust
#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    /// Pending payloads keyed by \`PayloadId.0\`. Value is (\`block_hash\`, \`header\`,
    /// fills drained from the CLOB at \`build_payload\` time).
    pending: HashMap<u64, (B256, Header, Vec<Fill>)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}
\`\`\`

\`chain\` は \`HashMap<B256, Header>\` のまま据え置く。commit された block はここで fill を track する必要がない — fill は commit の下流に流れていく。(Production コードでは fill をどこかに persist することになるが、それは本コースの範囲外。)

**新しい doc コメント自体がレッスンの一部。** 3 番目要素が存在する **理由** を説明する — \`submit_order\` → \`pending_fills\` → \`build_payload\` drain → \`pending\` map の payload ごとの \`Vec<Fill>\` というデータフローを残しておく。

### Step 5: \`new()\` を更新

現在の \`new()\` は 4 フィールドを初期化している。変更後は 6 個になる。更新:

\`\`\`rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            clob: Mutex::new(Book::new()),                        // NEW
            pending_fills: Mutex::new(Vec::new()),                // NEW
            engine_handle: None,
            state: Mutex::new(State::default()),
        }
    }
\`\`\`

新規フィールドの初期化が 2 個。\`Book::new()\` は L3 で書いたヘルパー (workspace に接続されているので、ここで \`openhl_clob::Book::new()\` が呼べる)。空の fill buffer には \`Vec::new()\` を使う。

### Step 6: 新メソッド 3 個を追加

\`new()\` の下 (または pub メソッドをまとめたければ \`chain_spec()\` の後) に追加:

\`\`\`rust
    /// Submit an order to the CLOB. Resulting fills are buffered in
    /// \`pending_fills\` until the next \`build_payload\` drains them.
    pub fn submit_order(&self, order: Order) -> FillResult {
        let mut book = self.clob.lock().expect("clob mutex poisoned");
        let result = book.submit(order);
        if !result.fills.is_empty() {
            self.pending_fills
                .lock()
                .expect("pending_fills mutex poisoned")
                .extend(result.fills.iter().copied());
        }
        result
    }

    /// Inspect (read-only) the fills attached to a built payload. Returns
    /// \`None\` if the payload id is unknown. Production code would encode
    /// these as EVM-executable transactions before they reach the block
    /// body; v0 keeps them as a parallel list for test inspection.
    #[must_use]
    pub fn payload_fills(&self, id: PayloadId) -> Option<Vec<Fill>> {
        let s = self.state.lock().expect("state mutex poisoned");
        s.pending.get(&id.0).map(|(_, _, fills)| fills.clone())
    }

    /// Number of fills currently buffered, waiting for the next \`build_payload\`.
    #[must_use]
    pub fn pending_fill_count(&self) -> usize {
        self.pending_fills
            .lock()
            .expect("pending_fills mutex poisoned")
            .len()
    }
\`\`\`

メソッド 3 個、それぞれの意図は次の通り:

- **\`submit_order\`** — **write** path。\`&self\` を取る (\`&mut self\` ではない)。\`Mutex\` 経由の interior mutability によって、shared 参照で bridge を mutate できる。\`clob\` を lock し、\`book.submit\` を呼び、\`FillResult\` を受け取る。約定が生成されたら、\`pending_fills\` を lock して append する。\`FillResult\` を return して caller に何が起きたかを知らせる。
- **\`payload_fills\`** — **inspection** path。指定 \`PayloadId\` に対して \`Option<Vec<Fill>>\` を返す。Id が pending にない場合は \`None\`、ある場合は \`Some(vec)\` (空の可能性あり)。Doc コメントで、これが test-and-debug 用のメソッドであることを明示する — production コードは fill を transaction-encoding pipeline 経由で route する。
- **\`pending_fill_count\`** — 小さな debugging ヘルパー。Buffer で drain 待ちの fill 数を返す。「Cross する 2 order を submit、count == 1 を期待」といったテストで有用。

3 メソッドすべてが \`&self\` を取る点に注目。内部の \`Mutex\` が重い処理を担い、public API としては「shared 参照 + interior mutability」になる — まさに async コードが必要とする形 (複数の async task が \`&LiveRethEvmBridge\` を同時に保持できる)。

> 🛑 **やりがちな勘違い。** 「\`submit_order\` が \`&mut self\` ではなく \`&self\` を取るのはなぜか?」 **order を同時に submit したい async task 間で bridge を共有する必要があるから。** Matching engine (実際に mutate するコード) は \`Mutex\` の後ろにあり、Rust の borrow checker は「mutex が exclusion を強制しているから、この mutation は安全」と受け入れる。\`submit_order\` が \`&mut self\` を取るなら \`Arc<RwLock<LiveRethEvmBridge>>\` が必要になり、submit ごとに bridge 全体を lock することになる — パフォーマンスが悪化し、API の形としても適切でない。**Interior mutability は shared concurrent access が use case のときに正しいツール。**

### Step 7: destructuring を波及更新

ここからは退屈だが機械的な作業。pending tuple は 3 要素になったので、pattern match する場所すべてをそれに合わせる必要がある。合計 5 サイト:

**Site 1: \`build_payload\`** — \`s.pending.insert(id, ...)\` を検索。現在:

\`\`\`rust
let hash = header.hash_slow();
s.pending.insert(id, (hash, header));
Ok(PayloadId(id))
\`\`\`

変更:

\`\`\`rust
let hash = header.hash_slow();
s.pending.insert(id, (hash, header, Vec::new()));    // 今は空 Vec<Fill>; L10 がここで pending_fills を drain する
Ok(PayloadId(id))
\`\`\`

**\`Vec::new()\` は placeholder。** L10 で \`std::mem::take(&mut *self.pending_fills.lock()...)\` に置き換える。

**Site 2: \`payload_ready\`** — \`s.pending.get(&n).cloned()\` を検索。現在:

\`\`\`rust
let (hash, header) = s
    .pending
    .get(&n)
    .cloned()
    .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
\`\`\`

Destructuring を更新:

\`\`\`rust
let (hash, header, _fills) = s
    .pending
    .get(&n)
    .cloned()
    .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
\`\`\`

\`_fills\` binding が新しい 3 番目要素を catch するが使わない — \`payload_ready\` は \`ExecutedBlock\` を返すだけで、fill を直接必要としないからだ。\`_\` 接頭辞で compiler に「存在は認識しているが使わない」と伝える。

**Site 3: \`validate_payload\`** — \`let header = { ... }\` block 内で \`.find(|(h, _)| *h == block_hash)\` を検索する:

\`\`\`rust
.find(|(h, _)| *h == block_hash)
.map(|(_, h)| h.clone())
\`\`\`

両方の closure を 3 要素 pattern に更新する:

\`\`\`rust
.find(|(h, _, _)| *h == block_hash)
.map(|(_, h, _)| h.clone())
\`\`\`

**Site 4: \`commit\`** — 同じ \`.find(|(h, _)| *h == hash)\` パターンを検索し、同様に変更する:

\`\`\`rust
let header = s
    .pending
    .values()
    .find(|(h, _, _)| *h == hash)
    .map(|(_, h, _)| h.clone())
    .ok_or_else(|| ...)?;
\`\`\`

**Site 5: \`payload_fills\`** (Step 6 で追加したばかりの新メソッド) — 既に \`.map(|(_, _, fills)| fills.clone())\` の行で 3 要素 pattern を使っているので、変更不要。

合計 5 サイト。\`cargo check -p openhl-evm\` を走らせる — 見逃しがあれば compiler が「pattern matches against tuple of length 2 but expected 3」エラーで教えてくれる。

> 🛑 **やりがちな勘違い。** 「\`pending\` の 3 番目要素を、fill がある payload にだけ持たせる形にしたら? たとえば \`(B256, Header, Option<Vec<Fill>>)\` のように」。 **できるが、かえって悪い。** \`Vec<Fill>\` は既に「0 個以上の fill」を表現できる — 空 vec が自然な「fill なし」ケース。\`Option<Vec<Fill>>\` にすると consumer サイトごとに余分な unwrap step が増え、meaningful なメモリ節約にもならない (空 Vec が 24 バイトに対し Option は 32 バイト — 無視できる)。**内部型が自然な empty state を既に持っているなら、Option ラッパーは追加しない。**

## テスト

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

~30 秒後 (incremental compile + node bootstrap):

\`\`\`
... 38 tests ...

test result: ok. 38 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Course 6 のテストはすべて引き続き pass する。L9 では新規テストを追加しない — 新機能 (submit_order 等) は L11 の integration test で exercise する。L9 の変更は **構造的** なもの — bridge に新しいフィールドとメソッドが入るが、既存のテスト面はそれらに触れないので、そのテストはそのまま動き続ける。

新メソッドが正しく接続されたかをクイックにサニティチェックできる:

\`\`\`rust
// 既存の live_bridge_builds_on_real_genesis test または新規 smoke test 内で:
let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);
assert_eq!(bridge.pending_fill_count(), 0); // fresh bridge では空
\`\`\`

これが pass するはず。Matching path はまだテストしない (それは L11)。ここでは新メソッドがコンパイルでき、fresh bridge で 0 を返すことだけ確認する。

よくあるエラーと対処:

- **\`error[E0432]: unresolved import 'openhl_clob'\`** — Cargo.toml に dep がない。Step 1 を再確認。
- **\`error[E0277]: 'Mutex<Book>' is not 'Send'\`** — どこかで \`Book\` が \`.await\` を跨いで保持されている。\`submit_order\` と \`pending_fill_count\` が、await 前に lock + 仕事を終えることを check (synchronous な body なのでそうあるべき)。
- **\`error: pattern requires 2 fields, struct has 3\`** — 波及更新 site を見逃した。Compiler が file:line を name する。3 番目 pattern 要素 (\`_fills\` または \`_\`) を追加。
- **\`build_payload\` で \`error: cannot find value 'pending_fills'\`** — フィールドを struct または \`new()\` に追加していない。Step 3 と 5 を再確認。

## 設計の振り返り

3 つの load-bearing な決定:

1. **\`Mutex\` 1 個ではなく 2 個にした。** Bridge の CLOB 状態と fill buffer は別々の関心事で、別々のタイミングで mutate する。Lock を分割しておけば、並行 submit が不必要に互いを block し合わなくて済む。**Lock 粒度は、contention が hot path 上にあるときに重要になる。**

2. **\`submit_order\` は \`&self\` を取る。** \`Mutex\` 経由の interior mutability によって、shared 参照で bridge を mutate できる。Bridge は \`Arc\` でラップされ async task 間で共有される。メソッドが \`&mut self\` を取ると、外側に \`RwLock<Bridge>\` が必要になり、すべての access を 1 つのグローバル lock で直列化することになる。**内部 \`Mutex\` + \`&self\` API が、async-shared state に対する idiomatic な Rust パターン。**

3. **\`build_payload\` に空の \`Vec<Fill>\` placeholder を残した。** L9 では構造を組み込むに留め、L10 でそれを機能的にする。Placeholder を残すのは honest scoping — reader には欠けている機能がどこにあるかが正確に見える。**\`Vec::new()\` placeholder のほうが、将来用の TODO コメントよりも discoverable。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
\`\`\`

L9 後、コードは 428cc26 の full 変更セットの途中にある — フィールドとメソッドは入っているが、\`build_payload\` はまだ drain せず (L10 で対応)、integration test もまだない (L11 で対応)。Diff は次のような状態になるはず:
- ✅ \`clob\` + \`pending_fills\` フィールド (参照と一致)
- ✅ \`submit_order\`、\`payload_fills\`、\`pending_fill_count\` メソッド (参照と一致)
- ✅ \`pending\` の 3-tuple (参照と一致)
- ❌ \`build_payload\` が依然 \`Vec::new()\` を挿入している — 参照は \`std::mem::take(...)\` を使う
- ❌ \`clob_fills_flow_into_payload\` integration test がない — 参照には存在する

\`❌\` 項目は L10 + L11 で揃う。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`submit_order\` が \`clob\` を lock してから別途 \`pending_fills\` を lock するのはなぜか? 両方を同時に保持しないのは?**
\`pending_fills\` の append が依存しているのは matching の **結果** であって、matching の中間状態ではないから。\`book.submit(order)\` が return した時点で \`FillResult\` は所有データなので、\`clob\` の lock を release してから result を安全に処理できる。両 lock を保持してしまうと、無関係な \`pending_fills\` 操作 (たとえば別の caller が \`pending_fill_count\` を読むなど) を correctness 上の利益なしに直列化することになる。

**Q: \`payload_fills\` が \`&[Fill]\` (borrowed) ではなく \`Vec<Fill>\` (clone) を返すのはなぜか?**
\`&[Fill]\` を返すと caller が slice のライフタイム中ずっと \`state\` Mutex の lock guard を保持しなければならず、lock を欲しがる他のすべてが deadlock してしまうから。Vec を clone するのは \`payload_fills\` 呼び出しごとに allocation 1 個増えるだけで、稀にしか呼ばれない inspection メソッドなら問題ない。**Lock を取る API は、決して lock 越しの参照を返してはいけない。**

**Q: \`clob\` フィールドを \`Mutex<Book>\` ではなく \`Arc<Mutex<Book>>\` にできるか?**
できる — openhl の Stage 9 (もっと後) では実際にそうする。state を読む custom EVM precompile と CLOB を共有する必要が出てくるからだ。Stage 8d ではプレーンな \`Mutex<Book>\` で十分。\`Mutex<T>\` から \`Arc<Mutex<T>>\` への変更は機械的なもの — 1 箇所をラップし、いくつかの \`.lock()\` サイトを arc 経由の \`.lock().expect(...)\` に変えるだけ。**Arc ラップは、実際に sharing が必要になるまで遅らせる。**

**Q: \`pending_fills.lock()\` が poisoned mutex で panic したらどうなるか?**
Panic が \`submit_order\` 経由で上に伝播し、それを呼んだ task がクラッシュする。Rust では、スレッドが lock を保持したまま panic すると mutex poisoning が起きる。\`book.submit(order)\` のような synchronous body では panic は稀 (発生源としては明示的な \`unwrap()\`、OOM、stack overflow くらい)。起きた場合、bridge はどのみち inconsistent state にあるので、panic を伝播させるのが正しい動作。**\`.expect("mutex poisoned")\` は tripwire であって、recovery path ではない。**

## 次のレッスン (L10)

Bridge が CLOB を持ち、約定が蓄積するようになった。**ただし \`build_payload\` 経由で build された payload はまだ約定を運ばない** — placeholder の \`Vec::new()\` がギャップになっている。L10 で placeholder を \`std::mem::take(&mut *pending_fills.lock(...))\` に置き換え、新しい payload ごとに蓄積した約定をすべて drain する。L10 後、\`bridge.payload_fills(id)\` が最後の build 以降に生成された実際の約定を返し、\`bridge.pending_fill_count()\` が 0 にリセットされるようになる。L11 で end-to-end test を書き、この drain 意味論が forward-only である (以前の payload に遡って約定が attach されない) ことを証明する。`,
                },
                {
                  title: "レッスン 10 — build_payload が pending fill を drain する",
                  slug: "openhl-clob-bridge-drain-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン 10 — \`build_payload\` が pending fill を drain する

## ゴール

このレッスンで掴む概念:

- **\`std::mem::take\` は O(1) — 要素コピーではなくポインタの swap** — 1000 個の \`Vec<Fill>\` でも \`mem::take\` は (ptr, len, cap) を 1 代入で入れ替える。\`drain(..).collect()\` は O(N) で、iterator のオーバーヘッドもある。標準ライブラリの primitive を知っていれば、より遅い実装を自前で書かずに済む。
- **Drain は \`submit\` ではなく \`build_payload\` で行う** — Fill は「どの payload に乗るか」でグループ化する。Submit 順ではない。Submit 時に drain すると、bridge が payload 割り当てを別チャネルで追う必要が出てくる。「Buffer して drain」のパターンが、そのグループ化を無料で実現する。
- **Forward-only drain は block の不変性を反映している** — Payload N は「前回の \`build_payload\` から今まで」に蓄積した fill を受け取る。以前の payload は遡って更新されない。Commit 済みブロックと同じ意味論 — 一度組んだら凍結する。
- **独立な操作なら、長い lock 1 つより短い lock 2 つのほうがよい** — \`state\` を取って payload ID を計算し、\`pending_fills\` を *短時間* 取って swap し、その後 \`state\` lock のまま挿入を続ける。\`pending_fills\` の mutex は重い処理の間は保持しない。
- **「Fill が失われる」失敗モードは現実だが v0 では許容** — \`build_payload\` が drain 後にエラーで戻ると、fill は \`pending_fills\` から消えたが payload にも入っていない状態になる。Production では recovery queue を足して保護する。V0 の single-validator devnet ではそのリスクを許容する。

検証:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

…で引き続き 38 テストが pass する。

具体的な変更:

**\`build_payload\` への小さな変更** — 約 8 行 — で L9 の \`Vec::new()\` placeholder を \`std::mem::take(...)\` に置き換え、新しい payload ごとに前回の \`build_payload\` 呼び出し以降に CLOB が蓄積した fill をすべて drain する。

Drain は **forward-only**: fill が payload N に attach された時点で \`pending_fills\` から消え、payload N+1 には現れない。これが bridge が consumer に対して行う data-flow の約束 — 各 payload が build 時点で取られた fill snapshot を 1 つ所有する。

L10 は短い (focused な変更が 1 箇所だけ)。L11 で full pipeline を exercise する integration test を書く。

## おさらい

L9 完了時点、bridge は:

\`\`\`rust
// 新規フィールド
clob: Mutex<Book>,
pending_fills: Mutex<Vec<Fill>>,

// 新規メソッド
pub fn submit_order(&self, order: Order) -> FillResult     // fill を push
pub fn payload_fills(&self, id: PayloadId) -> Option<Vec<Fill>>  // fill を read
pub fn pending_fill_count(&self) -> usize                  // count を read
\`\`\`

Order を submit できる。Fill が \`pending_fills\` に蓄積していく。\`pending_fill_count()\` が buffer サイズを報告する。**だが \`build_payload\` は buffer を無視している** — pending tuple の 3 番目要素として \`Vec::new()\` を挿入しているからだ。そのため \`payload_fills(id)\` は、buffer に entry があっても \`Some(vec![])\` を返してしまう。

L10 でそのギャップを閉じる。

## 計画

1 箇所の 1 変更。\`crates/evm/src/live_node.rs\` の \`build_payload\` メソッド内、次の行:

\`\`\`rust
s.pending.insert(id, (hash, header, Vec::new()));
\`\`\`

上記の実行結果が:

\`\`\`rust
let drained_fills = std::mem::take(
    &mut *self
        .pending_fills
        .lock()
        .expect("pending_fills mutex poisoned"),
);
s.pending.insert(id, (hash, header, drained_fills));
\`\`\`

…に変わる。レッスン全体でコードは 8 行。興味深いのは **\`std::mem::take\` が何をするか** と、**forward-only な drain 意味論を選ぶ理由**。

> 🛑 **考えてみよう。** スクロールする前に: \`std::mem::take(&mut v)\` は \`v\` の内容の所有権を奪い、\`v\` を \`Default::default()\` に置き換える。\`Vec<Fill>\` の場合、vector の中身をまるごと取り出し、\`v\` は空の \`Vec<Fill>\` になる。**問題が 1 つ:** 代わりに \`v.drain(..).collect::<Vec<_>>()\` で同じ効果を出せるか? 実用上の違いは何か?

(答え: \`drain(..)\` は要素を 1 つずつ取り除く iterator を返す。\`mem::take\` は \`Vec<Fill>\` 全体を値で swap する — pointer swap 1 回で済み、要素ごとの仕事はない。N fill の Vec に対して \`drain\` は O(N) + iterator のオーバーヘッドだが、\`mem::take\` は O(1) constant time。**「全部取って default にリセット」をやるなら \`mem::take\` のほうが速く、意図も明確。**)

## 手順

### Step 1: 変更する行を見つける

\`crates/evm/src/live_node.rs\` を開く。\`impl<P> ConsensusBridge for LiveRethEvmBridge<P>\` 内の \`build_payload\` を見つける。Body 末尾近く (\`Ok(PayloadId(id))\` の直前) にスクロール。L9 placeholder 行が見えるはず:

\`\`\`rust
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header, Vec::new()));    // 今は空 Vec<Fill>; L10 がここで pending_fills を drain する
        Ok(PayloadId(id))
    }
\`\`\`

L9 のコメントが明示的にここを指している。これが変更場所。

### Step 2: drain で置き換え

\`let hash = header.hash_slow();\` から insert までのセクションを次に変更:

\`\`\`rust
        let hash = header.hash_slow();

        // Drain whatever fills the CLOB has accumulated since the last
        // build_payload call. The fills attach to this payload so the bridge
        // can route them downstream (encode as EVM txs, return via
        // payload_fills, etc.). 8d keeps them as a parallel list; future
        // stages encode them into the block body.
        let drained_fills = std::mem::take(
            &mut *self
                .pending_fills
                .lock()
                .expect("pending_fills mutex poisoned"),
        );

        s.pending.insert(id, (hash, header, drained_fills));
        Ok(PayloadId(id))
    }
\`\`\`

新しい statement が 2 個: \`let drained_fills\` block と修正後の insert。コメントは意図的に書いている — 将来の reader に **drain-on-build 意味論** を文書化する役目がある。

新しいコードを注意深く読む:

1. **\`self.pending_fills.lock()\`** — mutex を acquire する。\`LockResult<MutexGuard<Vec<Fill>>>\` を返す。\`.expect("pending_fills mutex poisoned")\` が結果を unwrap する (poisoned mutex に対する \`expect\` で問題ない — L9 の設計の振り返り参照)。
2. **\`.lock().expect(...)\`** が \`MutexGuard<Vec<Fill>>\` を返す。\`MutexGuard\` は \`Deref<Target = Vec<Fill>>\` だが \`DerefMut\` も持っている。Vec の所有権を取るには \`&mut Vec<Fill>\` が必要で、それを \`&mut *guard\` で得る。
3. **\`std::mem::take(&mut *guard)\`** が swap を行う: Vec の heap-pointer + len + capacity が MutexGuard から \`drained_fills\` 変数に move し、MutexGuard 側の Vec は \`Vec::default()\` (= \`Vec::new()\` — allocation なしの空 Vec) に置き換わる。
4. **MutexGuard が block 式の末尾で drop される** — lock が release される。
5. **\`s.pending.insert(id, (hash, header, drained_fills))\`** で fill の snapshot を新 payload と共に保存する。**pending_fills buffer は今は空で、次の submit ラウンドに備える。**

\`std::mem::take(...)\` 式全体が **lock 下の atomic 操作** になっている — 他の caller が「半分 drain された状態」を見ることはない。\`pending_fills\` は full か空のどちらかで、mid-drain にはならない。

> 🛑 **やりがちな勘違い。** 「\`collect\` して別途 clear すればよいのでは — \`let drained = guard.iter().copied().collect::<Vec<_>>(); guard.clear();\` のように」。 **できる — caller から見える結果は同じ。** だが: (a) \`iter().copied().collect()\` は O(N) の copy 作業 + O(N) の clear 作業がかかる (\`mem::take\` の O(1) の pointer swap と比べて) し、(b) 2 step 版では、\`pending_fill_count()\` を読んでいる誰かが既に collect 済みなのに古い count を見てしまう窓ができる。\`mem::take\` は外側から見て atomic。**One-shot の swap のほうが速く、より correct。**

### Step 3: 他に何も変わっていないことを verify

\`cargo check -p openhl-evm\` を走らせる。修正したばかりの行だけが異なる状態でコンパイルが通り、波及効果はなく、他のテストも壊れていないはず。\`build_payload\` の signature は変わらない (引き続き \`async fn ... -> Result<PayloadId, BridgeError>\`) ので、caller 側はこの変更に気づかない。

「fill が本当に動いているか」のメンタルテストが欲しいなら:

\`\`\`rust
// 概念的:
bridge.submit_order(order1);  // fill F1 → pending_fills: [F1]
bridge.submit_order(order2);  // fill F2 → pending_fills: [F1, F2]
assert_eq!(bridge.pending_fill_count(), 2);

let id1 = bridge.build_payload(...).await.unwrap();
// pending_fills は今空 (payload id1 に drain された)
assert_eq!(bridge.pending_fill_count(), 0);
// そして payload に fill が attach されている
assert_eq!(bridge.payload_fills(id1), Some(vec![F1, F2]));

let id2 = bridge.build_payload(...).await.unwrap();  // 今度は空 drain
assert_eq!(bridge.payload_fills(id2), Some(vec![]));  // retroactive fill なし
\`\`\`

これが L11 の integration test が大まかにやることだ。ただし L11 では実際の Reth node を bootstrap した上で実行する。L10 は基礎の機構を動くようにするだけ。

## テスト

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

~30 秒後 (incremental compile):

\`\`\`
... 38 tests ...

test result: ok. 38 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Course 6 の既存テストはすべて引き続き pass する。L9 + L10 の変更は構造的なもの — matching engine は既存テストで exercise されない (それは L11) が、これまで動いていたものはすべて動き続ける。

変更が効いているかを quick に \`grep\` で確認する:

\`\`\`bash
grep -n "std::mem::take" crates/evm/src/live_node.rs
# build_payload で 1 行を報告するはず — 今追加した変更。

grep -n "Vec::new()" crates/evm/src/live_node.rs
# build_payload の行はもう報告されないはず。(初期 pending_fills 初期化のような
# ファイル内の他の Vec::new() は fine。)
\`\`\`

よくあるエラーと対処:

- **\`error[E0596]: cannot borrow \`*self.pending_fills.lock()...\` as mutable\`** — lock が \`LockResult\` を返し、\`MutexGuard\` に unwrap するために \`.expect(...)\` (または \`.unwrap()\`) が必要。\`.lock().expect("...")\` chain を再確認。
- **\`error[E0277]: \`MutexGuard<'_, Vec<Fill>>\` doesn't implement \`DerefMut\`** — \`&*guard\` ではなく \`&mut *guard\` を使っていることを確認。\`*guard\` deref + \`&mut\` borrow が \`&mut Vec<Fill>\` をくれる。
- **\`error: cannot move out of borrowed content\`** — \`std::mem::take(self.pending_fills.lock().expect(...))\` のように (\`&mut *\` なしで) 試した。\`mem::take\` signature は \`fn take<T: Default>(dest: &mut T) -> T\`。引数は \`&mut\` でなければならず、MutexGuard を deref することで正しい shape を得る。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Submit 時ではなく build_payload で drain する。** Submit は \`pending_fills\` に push するだけで、buffer を空にするのは \`build_payload\` のみ。意図的だ — **fill は組み立てられた payload 単位でグループ化される** ものであって、到着順にグループ化されるものではない。下流の payload-consumer は「前回の payload と今回の payload の間に起きた fill の batch」という coherent な view を得る。Submit 時に drain してしまうと、bridge がどの fill がどの payload と一緒に行くかを track するサイドチャンネルを別途持つ必要が出てくる — 状態が増え、帳簿管理が増える。

2. **\`std::mem::take\` が正しい primitive。** O(1)、lock 下で atomic、意図 (「全部取って default を残す」) を明確に signal する。代替の \`collect::<Vec<_>>(...drain(..))\` + 明示的 clear は O(N) で、半 drain 状態の窓もできる。**標準ライブラリの primitive を知っておくことが、より遅くバグの多い自前版を再発明してしまう事故から自分を守る。**

3. **Drain は forward-only。** Payload N には、(前回の build_payload 呼び出し) と (今回の呼び出し) の間に生成された fill が attach される。以前の payload は、後で arrive した fill で更新されない。これは chain の意味論と一致している: block が build されたら、その content は frozen。**Buffer-then-drain の形が、明示的なグループ化メカニズムを使わずに「この block に何があるか」を encode する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

L10 後、bridge コードは \`428cc26\` と **機能的に等価** (doc コメント以外) になる。参照との唯一の差は integration test — \`clob_fills_flow_into_payload\` がコードにまだない。それが L11 で扱うところ。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`pending_fills\` に大量の fill (たとえば 1000 個) があったらどうなる?**
\`std::mem::take\` は依然 O(1)。Vec 自体が heap allocation を所有しており、\`mem::take\` は (pointer, length, capacity) の triple を swap するだけだから。要素ごとの仕事はない。下流の consumer が最終的に 1000 fill を iterate することになるが、それは consumer のコストであって drain のコストではない。

**Q: 2 つの \`build_payload\` 呼び出しが race して、両方とも full fill set を持つことはないのか?**
ない。\`std::mem::take\` が \`MutexGuard\` の下で実行されているから。Lock が保持されている間、他のスレッドは lock を acquire できない。最初の build_payload が full set を得て、2 番目は空 Vec を得る (最初の呼び出しが \`Vec::default()\` で置き換えているため)。**Mutex が drain を直列化する。**

**Q: \`build_payload\` が drain **後** に error したら?**
Fill は \`pending_fills\` から消えたが payload には入らなかったことになる — 実質的に失われる (submit されたが commit されていない)。**これは現実に起こりうるバグクラスで**、production コードでは handle すべき (たとえば build_payload の残処理を行う前に、drain した fill を recovery queue に保存するなど)。本コースの v0 single-validator devnet では failure path が稀なので loss を許容する。production hardening は下流の仕事。

**Q: \`drained_fills\` を \`state\` lock 内ではなく、別の lock で取るのはなぜ?**
\`pending_fills\` と \`state\` が別々の mutex だから (L9 の設計判断)。まず \`state\` を lock し (新しい payload ID を計算するため)、次に \`pending_fills\` を短く lock し (swap のためだけ)、そのまま state lock を使って \`pending\` への insert を続ける。**操作が独立しているなら、長い lock 1 つよりも短い lock 2 つのほうがよい。**

## 次のレッスン (L11)

Bridge にデータフローが通った。**ただし end-to-end で動くことはまだ証明していない。** L11 で \`clob_fills_flow_into_payload\` integration test を書く:

1. 実 Reth \`EthereumNode\` を bootstrap する (course 6 と同じパターン)。
2. Live provider で \`LiveRethEvmBridge\` を construct する。
3. 空 book で \`build_payload\` を呼ぶ — fill が attach されていないことを verify する (\`payload_fills\` が \`Some(vec![])\` を返す)。
4. Maker BID @ 100、続いて crossing taker SELL @ 100 を submit する — 約定が生成される。
5. \`pending_fill_count == 1\` を verify する。
6. 次の payload を build する — fill が drain され、なおかつ attach されることを verify する。
7. \`pending_fill_count == 0\` を verify する。
8. 以前の (pre-orders) payload が retroactively fill されなかったことを verify する (drain は forward-only)。

L11 後、Course 7 の pipeline 全体を exercise する integration test が 1 個揃う。**それが「動く CLOB-integrated bridge を build した」というマイルストーン。**`,
                },
                {
                  title: "レッスン 11 — clob_fills_flow_into_payload — マイルストーンテスト",
                  slug: "openhl-clob-integration-test-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 70,
                  content: `# レッスン 11 — \`clob_fills_flow_into_payload\` — マイルストーンテスト

## ゴール

このレッスンで掴む概念:

- **実 Reth node に対する end-to-end な統合テスト** — \`EthereumNode\` を bootstrap し、\`LiveRethEvmBridge\` を組み、submit→buffer→drain の全パイプラインを exercise する。L1-L10 の連鎖が個別コンポーネントを越えて end-to-end で成立することを証明するテスト。
- **Bootstrap が高価なときは、1 本の徹底した統合テストが 3 本の narrow なテストに勝る** — 実 Reth node を起動するのに数秒かかる。Bootstrap を 3 回繰り返せばコストも 3 倍。1 シナリオで submit、drain、forward-only の 3 不変条件をまとめて検証するほうが安い。
- **Forward-only assertion こそがこれを *本物の* 統合テストにする** — 「submit が約定を生成する」「build が drain する」は unit test でも自明。以前の (空) payload が遡って更新されていないことを check するからこそ、bridge の payload ごと snapshot メカニズムを真に検証していると言える。これがないと unit test の偽装でしかない。
- **Fill 価格 = maker の価格を end-to-end で示す** — maker bid @ 100、taker sell @ 100、fill @ 100。L4-L5 で確立した price-time priority の規則が、統合境界を越えても成立する。Sell を先に submit して buy で crossing しても同じ fill が出る — submit 順序は同一 level 内の time priority であって、どちらが rest するかを決めるものではない。
- **\`launch_with_debug_capabilities()\` と add-on 付き \`launch()\` の使い分け** — Debug-capabilities setup は短く、provider は得られるが engine-API は接続しない。本テストでは engine handle は不要 (forkchoice を駆動しない)、parent lookup 用の provider だけが要る。

検証:

\`\`\`bash
cargo test -p openhl-evm clob_fills_flow_into_payload --release
\`\`\`

上記の実行結果が pass する。**これが Course 7 のマイルストーン。** L1-L8 で build した matching engine が生成する実約定が、\`LiveRethEvmBridge::submit_order\` → \`pending_fills\` buffer → \`LiveRethEvmBridge::build_payload\` drain → consensus が commit する payload、という流れで流れていく。テストでは L9-L10 の統合の **すべての piece** を **live Reth node** に対して exercise する。

具体的な変更:

書く新規テストは 1 個:

- **\`clob_fills_flow_into_payload\`** — ~100 LOC。Real \`EthereumNode\` を bootstrap し、8 step のシナリオで 8 個の assertion を exercise する。

テストシナリオ:

1. order なしで空 payload を build → fill が attach されていないことを verify する。
2. maker bid @ 100 を submit → rest する (即座の fill なし) ことを verify する。
3. crossing taker sell @ 100 を submit → ちょうど 1 個の約定が生成されて buffer されることを verify する。
4. 次の payload を build → fill が drain されることを verify する。
5. \`pending_fill_count\` が 0 にリセットされることを verify する。
6. 以前の (空) payload を再 check → drain が **forward-only** だったことを verify する (retroactive な fill がない)。

L11 後、Course 7 の mainline は完成する。L12 で capstone としてラップアップする。

## おさらい

L10 完了時点、\`LiveRethEvmBridge\` は:

- \`clob: Mutex<Book>\` と \`pending_fills: Mutex<Vec<Fill>>\` フィールドを持つ (L9)。
- \`submit_order\`、\`payload_fills\`、\`pending_fill_count\` メソッドを持つ (L9)。
- \`build_payload\` が \`pending_fills\` を新 payload の 3 番目 tuple 要素に drain する (L10)。

**ただし end-to-end で動くことはまだ証明していない。** L11 でその証明を書く。

## 計画

\`crates/evm/src/live_node.rs\` の既存 \`#[cfg(test)] mod tests\` block にテストを 1 個追加する。テストの内容:

1. **Reth node を bootstrap する** — course 6 の \`live_bridge_builds_on_real_genesis\` test と同じパターン。Parent lookup のために provider が必要。
2. **\`LiveRethEvmBridge::new(provider, chain_spec)\` を construct する** — 注: 今回は \`with_engine_handle\` を付けない。Forkchoice を駆動する必要がないし、matching pipeline は engine_handle に依存しないから。
3. **空の初期状態を assert する** — \`pending_fill_count() == 0\`。
4. **空 payload を build する** (まだ order を submit していない) — \`payload_fills(id)\` が \`Some(vec![])\` を返すことを verify する。
5. **maker を submit する** — \`Order { id: 1, side: Buy, qty: 10, OrderType::Limit { price: 100 } }\`。rest し、即座の fill がないことを verify する。
6. **crossing taker を submit する** — \`Order { id: 2, side: Sell, qty: 10, OrderType::Limit { price: 100 } }\`。1 個の約定が生成されることを verify する。
7. **次の payload を build する** — \`payload_fills(next_id) == Some([the_fill])\` を verify する。
8. **drain 意味論を verify する** — \`pending_fill_count() == 0\`、そして **以前の** payload の fill が依然空のまま (retroactive な update がない)。

これが Course 7 で build するすべての integration test。

> 🛑 **考えてみよう。** スクロールする前に: maker bid が price 100、qty 10。Taker が Sell @ price 100、qty 10 で来る。**結果の fill price は 100? それとも違うのか?** 2 つの order が同じ価格で cross するとき、fill price を決めるルールは何か?

(答え: fill は **maker の** 価格で起きる — このケースでは \`Price(100)\`。L4 から: 「fill 価格は常に **resting** order の価格 (maker の)。$101 の limit-buyer が $100 の resting limit-seller とマッチすると $100 で fill する (maker の価格)。buyer が勝つ」。両 order が同じ価格でも同じルールが適用される — maker が 100 で rest し、taker が 100 でマッチする。**「price-time priority」ルールは「maker の価格 (price priority) + 同じ price level 内では first-come (time priority)」。ここでは time priority の disambiguation は不要 — maker が 100 で唯一の order だから。**)

## 手順

### Step 1: テストヘッダーを追加

\`crates/evm/src/live_node.rs\` で \`#[cfg(test)] mod tests { ... }\` block にスクロール。Block は既に \`live_bridge_builds_on_real_genesis\` (course 6 の L12-L14 から) と \`commit_sends_forkchoice_to_engine_when_handle_installed\` (L14 から) を持つ。

末尾に新テストを append (\`mod tests\` の閉じ \`}\` の直前):

\`\`\`rust
    /// Stage 8d end-to-end: CLOB → bridge → payload.
    /// A maker rests, a taker crosses it, the fill flows into the next
    /// \`build_payload\`'s stored fills. The empty-fill \`build_payload\` that
    /// preceded the orders proves the drain semantics — fills accumulate
    /// AFTER they're built, not retroactively included.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn clob_fills_flow_into_payload() {
        use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};

        // ... body は Step 2-7 ...
    }
\`\`\`

テストヘッダーで注目すべきポイントが 2 つ:

- **\`#[tokio::test(flavor = "multi_thread", worker_threads = 4)]\`** — course 6 の integration test と同じ。Reth の \`EthereumNode\` はバックグラウンドで task をいくつか spawn する (RPC、payload builder 等) ので、multi-threaded tokio runtime が必要になる。4 worker のセットアップで余裕を持たせている。
- **\`use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};\`** — L1 の newtype セットから必要な型を import する。\`Order\` と \`Fill\` は \`mod tests\` 冒頭の \`super::*\` で既に scope に入っている。

> 🛑 **やりがちな勘違い。** 「これらの型を \`mod tests\` のトップではなくテスト関数内で import するのはなぜか?」 **テストの依存をテストサイトで visible に保つため。** 将来の reader がこのテストをデバッグするとき、関連型を一目で見られる。コストはこれらが必要な test ごとに \`use\` statement が 1 個増えること、利益は各テストが self-contained なシナリオとして読めること。実際のソースコード (\`mod tests\` の外) のテストではトップに import を置くが、test は特別 — システムが何をするかのドキュメントなので、inline import がそのドキュメント性を引き締める。

### Step 2: Reth node を bootstrap

テスト関数 body 内:

\`\`\`rust
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
\`\`\`

これは course 6 の \`live_bridge_builds_on_real_genesis\` テストと **同じパターン**。\`launch_with_debug_capabilities()\` を使う (\`.with_add_ons(EthereumAddOns::default()).launch()\` ではない) のは、今回 engine handle が不要だから — テストしているのは CLOB-to-payload のデータフローであって、commit-to-forkchoice ではない。

\`Runtime::test()\`、\`dev_chain_spec()\`、\`NodeConfig::test().dev()\`、builder chain はすべて course 6 L11/L12 で扱ったもの。リフレッシュが必要なら test モジュール内を上にスクロールする。

### Step 3: genesis hash を pull + bridge を construct

\`\`\`rust
        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no genesis");

        let bridge = LiveRethEvmBridge::new(node.provider.clone(), chain_spec);
\`\`\`

2 行。最初は provider から live genesis block hash を pull する (course 6 L12 と同じ)。2 番目は bridge を construct する — **末尾に \`.with_engine_handle(...)\` の chain がない** 点に注意。今回気にするフィールド (\`clob\`、\`pending_fills\`) は \`engine_handle\` から独立しているから。

\`node.provider.clone()\` は安価。\`node.provider\` が内部で \`Arc\`-backed だから。

### Step 4: 空の初期状態を assert

\`\`\`rust
        // Empty initial state — no orders submitted, no fills pending.
        assert_eq!(bridge.pending_fill_count(), 0);
\`\`\`

最もシンプルな check。\`new()\` の直後、\`pending_fills: Mutex::new(Vec::new())\` は空。\`pending_fill_count()\` がその length を読む。**この assertion が失敗するなら**、L9 の \`new()\` が \`pending_fills\` を正しく初期化していない。

### Step 5: 空 payload を build (まだ order なし)

\`\`\`rust
        // First payload built with no orders → no fills attached.
        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let empty_id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs.clone())
            .await
            .expect("build_payload failed");
        let empty_fills = bridge
            .payload_fills(empty_id)
            .expect("payload exists");
        assert!(empty_fills.is_empty(), "no orders submitted yet, fills must be empty");
\`\`\`

Genesis を parent として \`build_payload\` を呼ぶ。Bridge が L10 の \`std::mem::take\` を \`pending_fills\` に対して call するが、buffer は空なので drain は \`Vec::new()\` を返す。結果の payload に attach される fill も空になる。

返された \`PayloadId\` を \`empty_id\` に bind しておくのは、**Step 7 でこの payload の fill を後から re-check** し、drain が forward-only であることを証明するため。

\`attrs.clone()\` を使うのは、後で 2 番目の \`build_payload\` 呼び出しで \`attrs\` を再利用するから。両 payload が同じ attrs (timestamp 1、ゼロ fee_recipient、ゼロ prev_randao) を使うのはシンプルさのため — production code では各 payload が fresh な timestamp を持つことになる。

### Step 6: maker + taker を submit、fill を verify

\`\`\`rust
        // Submit a resting limit BID @ 100 from account 1, then a crossing
        // SELL @ 100 from account 2. This produces exactly one fill.
        let maker = Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Buy,
            qty: Qty(10),
            order_type: OrderType::Limit { price: Price(100) },
        };
        let taker = Order {
            id: OrderId(2),
            account: AccountId(2),
            side: Side::Sell,
            qty: Qty(10),
            order_type: OrderType::Limit { price: Price(100) },
        };

        let maker_result = bridge.submit_order(maker);
        assert!(maker_result.fills.is_empty(), "maker rests, no immediate fill");
        assert_eq!(bridge.pending_fill_count(), 0);

        let taker_result = bridge.submit_order(taker);
        assert_eq!(taker_result.fills.len(), 1, "taker should cross the maker");
        assert_eq!(bridge.pending_fill_count(), 1, "fill buffered in pending");
\`\`\`

order 2 個、submit 2 回、assertion 4 個。

**1 番目の submit (maker)**:
- \`submit_order(maker)\` が \`book.submit(maker)\` を call する。Book は空なので、maker は price 100 の bid として rest する。
- \`maker_result.fills.is_empty()\` — 即座の fill はない (cross できる ask が book にない)。
- \`pending_fill_count() == 0\` — buffer もマッチもなし。

**2 番目の submit (taker)**:
- \`submit_order(taker)\` が 100 の resting bid に対してマッチする。マッチで 1 個の約定が生成される (10 unit @ 100、order 1 から order 2 へ)。
- \`taker_result.fills.len() == 1\` — matcher が fill を返してきた。
- \`pending_fill_count() == 1\` — \`submit_order\` の post-match append (L9 Step 6 の \`if !result.fills.is_empty() { ... }\` block) で fill が \`pending_fills\` に push されている。

**maker_result と taker_result のペアがテストの instrumentation の役割を果たす**。両方を check することで verify できる: (a) maker が本当に rest したこと (何かに偶発的に cross しなかった)、(b) taker が本当に cross したこと (偶発的に rest しなかった)。

### Step 7: 次の payload を build、drain + drain 意味論を verify

\`\`\`rust
        // Build the NEXT payload — it should drain the buffered fill.
        let next_id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs)
            .await
            .expect("build_payload failed");
        let next_fills = bridge
            .payload_fills(next_id)
            .expect("payload exists");
        assert_eq!(next_fills.len(), 1, "fill must be attached to the payload");
        assert_eq!(next_fills[0].price, Price(100));
        assert_eq!(next_fills[0].qty, Qty(10));
        assert_eq!(next_fills[0].maker_order_id, OrderId(1));
        assert_eq!(next_fills[0].taker_order_id, OrderId(2));

        // After draining, pending fills must be empty.
        assert_eq!(bridge.pending_fill_count(), 0);

        // The earlier (empty) payload's fills must still be empty —
        // draining is forward-only, never retroactive.
        let empty_fills_again = bridge
            .payload_fills(empty_id)
            .expect("earlier payload exists");
        assert!(empty_fills_again.is_empty(), "earlier payload not retroactively filled");
    }
\`\`\`

assertion のセットが 3 つ:

**1 番目のセット (drain 自体)**: \`build_payload\` を再度 call する — 同じ parent (genesis) + 同じ attrs で。L10 の \`std::mem::take\` が走り、\`pending_fills\` の fill を取り出す。Fill は新 payload の 3 番目 tuple 要素に保存される。\`payload_fills(next_id)\` が \`Some(vec![the_fill])\` を返す。確認内容:
- \`next_fills.len() == 1\` — fill がちょうど 1 個。0 ではなく (drain が走らなかった証拠)、2 でもなく (spurious な fill がない)。
- \`next_fills[0].price == Price(100)\` — maker の価格 (price priority)。
- \`next_fills[0].qty == Qty(10)\` — 両 side が完全 fill。
- \`next_fills[0].maker_order_id == OrderId(1)\` — maker は order 1 (resting bid)。
- \`next_fills[0].taker_order_id == OrderId(2)\` — taker は order 2 (cross する sell)。

**2 番目のセット (drain が buffer を空にした)**: \`pending_fill_count() == 0\` — drain が buffer を \`Vec::default()\` に置き換えた。これが \`mem::take\` の atomicity の後半部分。

**3 番目のセット (forward-only)**: \`payload_fills(empty_id)\` — **最初の** payload の fill を見る。**2 番目の payload に drain したにもかかわらず**、最初の payload に保存された fill は build されたときから *unchanged* のまま。これが L11 の load-bearing assertion: **drain は以前の payload を retroactively modify しない**。

各 payload は build された瞬間の fill snapshot を持つ。Retroactively に最初の payload を drain してしまったら (これがバグになる)、テストはここで失敗する。

> 🛑 **やりがちな勘違い。** 「テストが \`payload_fills(empty_id)\` を \`payload_fills(next_id)\` の **後** に check しているのはなぜか? \`empty_id\` を先に check できるのでは?」 **順序が重要なのは、time-invariance をテストしているから。** \`next_id\` を先に check するのは、まず \`next_id\` が 1 fill を持ち、\`pending_fill_count\` が 0 であることを **確立** するため。そのあとで \`empty_id\` を check し、\`next_id\` の drain が \`empty_id\` に波及しなかったことを **証明** する。\`empty_id\` を先に check してしまうと、「空 payload に fill がない」しか証明できない — それは Step 5 から既に分かっている。Drain の後に check することで、「以前の payload は **後の drain が起きた後でも** 依然 fill がない」を証明できる。**time-invariance を証明するときには、assertion の時間順序が重要になる。**

## テスト

\`\`\`bash
cargo test -p openhl-evm clob_fills_flow_into_payload --release
\`\`\`

~30 秒後 (incremental compile + node bootstrap):

\`\`\`
running 1 test
test live_node::tests::clob_fills_flow_into_payload ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

全テスト走らせるには:

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

39 個 pass する (course 6 の 38 + L11 の 1)。

テストは wall-clock で約 2.5 秒 (Reth node bootstrap + 小さな \`build_payload\` 2 個 + CLOB submit 数個)。ほとんどが Reth bootstrap の時間で、実際の matching + drain はマイクロ秒オーダー。

よくあるエラーと対処:

- **\`assert!(empty_fills.is_empty())\` が失敗** — bridge が \`pending_fills\` を空に初期化していない。L9 Step 5 を確認: \`pending_fills: Mutex::new(Vec::new())\`。
- **\`assert_eq!(taker_result.fills.len(), 1)\` が 0 で失敗** — order が実際には cross していない。Maker が \`Side::Buy\` で taker が \`Side::Sell\` (またはその逆) で、両方とも price 100 になっているか確認。よくあるバグ: 両 order が \`Side::Buy\` になっており、2 番目の order がマッチせずに rest している。
- **\`assert_eq!(next_fills.len(), 1)\` が 0 で失敗** — L10 の drain が動いていない。\`build_payload\` が \`std::mem::take(&mut *self.pending_fills.lock()...)\` を call し、その結果を insert していること (\`Vec::new()\` を直接 insert していないこと) を確認。
- **\`assert!(empty_fills_again.is_empty())\` が失敗** — drain が retroactively に以前の payload を modify している。\`std::mem::take\` (新 payload にしか書かない) では普通起きないが、誤って \`pending_fills.clone()\` を使って original を mutate していると発生し得る。
- **テストが「provider has no genesis」で panic** — テストロジックに到達する前に node bootstrap が失敗している。\`dev_chain_spec()\` が valid な genesis を生成していることを確認。\`cargo test -p openhl-evm live_bridge_builds_on_real_genesis\` を先に走らせて Reth セットアップが動くことを verify する。

## 設計の振り返り

3 つの load-bearing な決定:

1. **テスト 1 つのシナリオで 3 つの pipeline stage すべてを verify する。** \`submit_order\` が動くこと (Step 6)、\`build_payload\` が drain すること (Step 7 の 1 番目の assertion セット)、forward-only invariant が成立すること (Step 7 の最後の assertion)。1 シナリオで 3 property を見る。これを 3 つのテストに分割すると、それぞれで node を bootstrap する必要があり遅くなる。**複数の invariant をカバーする徹底した integration test 1 個のほうが、narrow な 3 つのテストより安上がり。**

2. **forward-only check があるからこそ、これが本物の integration test になる。** 最初の 2 つの check (submit が約定を生成する、build が drain する) は unit test からも明らか。Forward-only check は **bridge を必要とする** — bridge の per-payload snapshot 機構が honest であることをテストするから。Production コードが「完全性のため」と称して古い payload に fill を書き戻すバグを入れる可能性があるが、L11 がそれを catch する。

3. **2 つの payload が同じ parent (genesis) を使うのは意図的。** Production では、2 番目の \`build_payload\` は genesis ではなく最初の decided block を parent にする。このテストでは何も commit する必要がない — drain timing をデモするには payload が 2 つあれば十分だから。Genesis を parent として再利用すればテストがシンプルになり、verify する内容 (drain メカニズム、commit flow ではない) は変わらない。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

L11 後、\`live_node.rs\` は \`428cc26\` の参照と **機能的に完全に** マッチする。差は doc コメントの言い回しだけ。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜここでは \`launch_with_debug_capabilities()\` を使い、course 6 L14 では \`launch()\` (\`.with_add_ons(...)\` 付き) を使ったのか?**
テスト目標が違うから。Course 6 L14 では \`commit → forkchoice_updated\` をテストするので engine handle が必要で、engine handle は AddOns 経由で入る。L11 では CLOB → payload をテストするので engine handle は不要で、provider があればよい。\`launch_with_debug_capabilities()\` は provider を含むが engine API の接続をスキップする短いセットアップ。

**Q: このテストが見逃す worst-case な fill シナリオは?**
1 回の submit で複数 fill が出るケース (たとえば一度に 3 つの price level を cross する Market buy)。これは L7 の unit test (具体的には \`buy_market_takes_best_ask\`) が matching-engine レベルでカバーしている。L11 では single-fill ケースのみを exercise してテストを focus に保つ。L11 に multi-fill ケースを追加するのは 2 行 (qty の値を変える) で済むが、証明する内容自体は変わらない。

**Q: このテストは他のテストと並行に走らせられるか?**
走らせられる — \`#[tokio::test]\` がテストを自分の runtime で走らせ、bridge と node インスタンスはテストにローカル。共有のグローバル state はない。\`worker_threads = 4\` の設定はテスト単位であって、workspace 全体ではない。

**Q: なぜ maker を先に submit し、taker を 2 番目に? 逆ではダメか?**
典型的な matching-engine の語り口との対称性のため: 「maker が rest して、taker が cross した」。順序は *time priority* の意味では効く (level 内では first-in が最初に fill する) が、*どちらの side が rest するか* には意味を持たない。SELL を先に submit すればそれが ask として rest し、その後で同じ価格に BUY を submit すれば BUY が cross する。結果は同じ fill になる。**テスト名「fills flow into payload」が指すのはデータの path であって、操作の順序ではない。**

## 次のレッスン (L12)

Real Reth-backed bridge に統合された動く CLOB が手に入った。**L12 は capstone** — 新規コードはなく、以下を扱う:
- 11 レッスンの recap。
- 再現した openhl Stage 8 + 8d の機能リスト。
- まだ scope-cut しているもの (course 8 の precompile、course 9 の funding、ある future course での EVM tx encoding)。
- 続けたい場合の次のステップ (psyto/openhl Stage 9 のソース、Module 3 以降の build arc)。

リフレクション中心のレッスンで、~15 分。これで Course 7 が完成する。`,
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
                  title: "レッスン 12 — 作ったもの、まだ stub のもの、次に行く先",
                  slug: "openhl-clob-capstone-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# レッスン 12 — 作ったもの、まだ stub のもの、次に行く先

## 作ったシステム

11 レッスンを通じて、Course 6 で build した substrate に **CLOB matching engine** を追加し、その約定を commit された payload に接続した。Workspace は今こうなっている:

\`\`\`
~/code/my-openhl/
├── Cargo.toml                          ← +1 workspace dep (openhl-clob path)
├── crates/
│   ├── clob/                           ← NEW crate (course 7 で作成)
│   │   ├── Cargo.toml                  L1: package + proptest dev-dep (L8)
│   │   └── src/
│   │       ├── lib.rs                  L1: pub mod types, pub mod book, re-export
│   │       ├── types.rs                L1 + L2: newtype + record (~109 LOC)
│   │       └── book.rs                 L3-L8: Book + matching + cancel + tests
│   └── evm/
│       └── src/live_node.rs            L9-L11: bridge が CLOB を持ち、build で drain
└── ... course 6 から変わらず ...
\`\`\`

合計で約 **新規テスト 15 個**: hand-trace 済み unit test 9 個 (L7) + proptest invariant 3 個 (L8、768 ランダムシナリオ) + integration test 1 個 (L11)。Workspace のテスト数は 39 個 (course 6 の 38 + L11 の \`clob_fills_flow_into_payload\`)。

## Matching engine が何をするか

Price-time priority CLOB。**操作は 2 つ**: submit (新規 order が take するか rest する) と cancel (resting order を消す)。**観察可能な結果は 1 つ**: 各 \`submit\` が \`FillResult\` をマッチした fill リストと共に返す。

| 操作 | Public method | 内部で何が変わるか |
| - | - | - |
| Limit order を submit | \`Book::submit(order)\` (\`OrderType::Limit\` 経由) | 反対側を price 以下/以上で順に辿り、resting order とマッチし、未 fill な残りを rest させる |
| Market order を submit | \`Book::submit(order)\` (\`OrderType::Market\` 経由) | 反対側を任意の価格で順に辿り、マッチし、未 fill な残りを破棄する |
| Resting order を cancel | \`Book::cancel(order_id)\` | 両 side を linear scan し、order を削除し、level が空なら drop する |
| Inspect | \`best_bid\`, \`best_ask\`, \`depth_bid\`, \`depth_ask\` | read-only |

Matching は **構築上 deterministic**。Submit ごとに、同じ input と同じ事前 book 状態に対して同じ約定を生成する — これを L8 の proptest invariant (\`determinism\`) が 256 個のランダムシーケンスで exercise している。

## Bridge 統合

Course 6 の \`LiveRethEvmBridge\` が **フィールド 2 個** (\`clob\`、\`pending_fills\`) と **メソッド 3 個** (\`submit_order\`、\`payload_fills\`、\`pending_fill_count\`) を獲得した。データフロー:

\`\`\`
submit_order(order)              build_payload(parent, attrs)
       │                                    │
       ▼                                    ▼
  clob.submit                       drain pending_fills
       │                                    │
       ▼                                    ▼
  pending_fills.push                  attach to payload
       │                                    │
       │                                    ▼
       │                              payload_fills(id) が返す
       ▼
  caller に FillResult を return
\`\`\`

Submit が push、build が drain する。Drain は **forward-only**: 各 payload は build 時点の fill snapshot を所有し、以前の payload に retroactively fill が attach されることはない。**L11 の integration test がこれを実 Reth node に対して end-to-end で証明している。**

## 11 レッスン前にはできなかった、今できること

- **Rust でゼロから price-time priority matching engine を build する** — そして、なぜ \`BTreeMap<Reverse<Price>, ...>\` が bid の正しい shape なのか、なぜ \`VecDeque\` が level ごとの queue の正しい shape なのか、cancel の O(n) scan が O(1) index に対してどんなトレードオフを持つのかを理解する。
- **Pure-state-machine の determinism について推論する** — \`determinism\` proptest は chain が依存する種類の invariant であり、それを自分で encode した。
- **既存の async-shared bridge にサブシステムを統合する** — \`Mutex<T>\` による interior mutability と \`&self\` メソッドが、async task 下の共有 state に対する idiomatic な Rust パターン。それを適用した。
- **openhl Stage 8a + 8d のソースを読み**、\`book.rs\` と bridge の CLOB 関連コードのすべての行を説明できる。
- **Matching engine を変更する** — 新しい order type (Stop、Iceberg、Post-Only) を追加するとき、\`submit_limit\`/\`submit_market\` のどこに着地させればよいか把握できる。

## まだ placeholder のもの

本コースでは bridge に統合された動く matching engine を ship した。Honest scoping として、本コースに **含まれていない** ものは以下:

### 1. EVM-executable transaction encoding

**ステータス**: 未着手。

Payload に attach された fill は依然として parallel な \`Vec<Fill>\` であり、block body のトランザクションではない。Reth の \`BlockExecutor\` はそれを見ない。進めるには、各 \`Fill\` を EVM トランザクションとして encode する必要がある (おそらく state を update する custom precompile を call する形で)。それは Module 3 の領域 — つまり **course 8** の領域。

### 2. Custom EVM precompile

**ステータス**: 未着手。

スマートコントラクトが CLOB state を **読む** (たとえば「best bid は?」) には precompile が必要。外部アカウントが **on-chain トランザクション経由で order を発注する** には、もう 1 つの precompile が必要。openhl Stage 9 はその両方を持つ (\`clob_read_best_bid\`、\`clob_place_order\`)。これを build するのが **course 8**。

### 3. Funding rate state machine

**ステータス**: 未着手。

Perp DEX には funding rate 計算 (mark vs. index、定期 rebalancing) が必要。openhl Stage 8b が state machine を持っている。これを build するのが **course 9**。

### 4. 複数 market

**ステータス**: 暗黙の単一 market。

現在の \`Book\` は orderbook 1 個。現実の perp exchange は多数の orderbook を持つ (HYPE/USDC、BTC/USDC、ETH/USDC 等)。拡張するなら bridge で \`HashMap<MarketId, Book>\` を持てばよい。機械的な変更だが、openhl Stage 8 にはまだない。

### 5. 永続 CLOB state

**ステータス**: in-memory のみ。

Bridge を再起動するとすべての resting order が消える。Production では snapshot/load (または chain state からの完全な event-sourcing) が必要。現在の openhl stage では扱われておらず、最終的な hardening 作業として残っている。

### 6. Cancel-by-id index

**ステータス**: O(n) linear scan。

L6 では明示的に、O(1) index ではなくシンプルさを選んだ。openhl が book あたり ~10k order を超えてスケールするようになれば、cancel scan が意味を持ち始める。\`HashMap<OrderId, (Side, Price)>\` を追加すれば cancel が O(1) になる — 小さな機械的変更だが、profile が要求するまでは deferred。

## Production-readiness チェックリスト

この matching engine + bridge を実際の testnet に持っていきたいなら:

- [ ] **EVM-encoded fill** — 各 \`Fill\` をトランザクションとしてラップし、BlockExecutor に route して state 実行と state-root 計算を行う。
- [ ] **Custom EVM precompile** — コントラクト読み取り用の \`clob_read_best_bid\`、chain-driven な submit 用の \`clob_place_order\`。
- [ ] **Multi-market サポート** — \`HashMap<MarketId, Book>\` と、market ごとの submit/cancel path。
- [ ] **永続 state** — Book を disk に snapshot + 再起動時に replay する、もしくは chain history から完全に再構築する。
- [ ] **Cancel index** — \`HashMap<OrderId, (Side, Price)>\` を追加して cancel を O(1) にする。
- [ ] **Order-id 衝突チェック** — \`submit\` は現状、caller が unique な OrderId を割り当てることを信頼している。Production では duplicate を検出して拒否する必要がある。
- [ ] **Pre-trade リスクチェック** — アカウントを maintenance margin 以下に追い込む order は matching 前に拒否すべき。
- [ ] **Telemetry** — order スループット、fill latency、depth-of-book メトリクスのカウンター。
- [ ] **Multi-validator agreement** — single-validator devnet では、2 validator が異なる fill 順序を生成するケースが見えない。Proptest の \`determinism\` はローカルでの証明にすぎず、multi-validator integration test がネットワーク上での証明になる。
- [ ] **Liquidation engine** — アカウントのマージンが maintenance を下回ったときに、ポジションを強制 close する。Course 9 の領域。

このリストは意図的に matching engine 自体より長い。**動く matching engine は基礎であって、製品ではない。**

## 市場構造: あなたが本当に作ったもの

11 レッスンを費やして **price-time-priority CLOB** を作った。次に進む前に、その選択を perp DEX 設計の広い landscape に位置づけておく価値がある — CLOB は 3 つある選択肢のうちの 1 つにすぎず、最近の RWA perps 論争がトレードオフをとりわけクリアにしてくれている。

**3 つのモデル。**

- **CLOB (作ったもの)**: market maker が resting order を置き、taker がそれと約定する。価格はこの venue 上で需給が出会うことによって決まる。銘柄ごとの MM 経済性: どの銘柄も、在庫リスクを引き受けてくれる誰かによる継続的な quoting が必要。Retail flow が銘柄ごとの quoting を採算化できるほど存在する場合に機能する。
- **RFQ (Variational、Paradigm)**: taker が quote を request し、dealer が just-in-time に応じ、dealer は primary venue (CME、NYSE、または別の CLOB) で hedge する。価格は source venue から *持ってくる* — そこに hedging cost と dealer margin が乗る。Dealer が 24 時間継続的に quote を維持しなくてよい (request されたときだけ quote すればよい) ので、long tail でも unit economics が成立する。
- **AMM (GMX、dYdX v3 vAMM 時代)**: 流動性を curve に集約し、トレーダーが curve に沿って取引する。最初は資本効率が良いが、tail では破綻する。Perp での重要性は今では低下しているが、設計ポイントとして押さえておく価値はある。

**CLOB が勝つ場所と勝たない場所。**

CLOB が price discovery venue になるのは、*そこにローカルな需給が存在する場合に限る*。BTC、ETH、SOL、HYPE — TradFi の意味での「primary venue」を持たない資産 — については、Hyperliquid 上の CLOB が真に価格を決めている。一方で WTI、NVDA、SPY の perp は、NYSE/NYMEX 取引時間中は CLOB であっても primary 市場の arbitrage shadow にすぎない。RFQ も同じ。RWA については、両モデルとも primary 時間中に真の price discovery をしているわけではない — どちらも CME や NYSE order book の downstream consumer だ。

Cold-start の非対称性は構造的なものだ。CLOB は銘柄ごとに継続的に quoting してくれる market maker を必要とする。200 銘柄の RWA があり、そのうち 10 銘柄にしか retail flow が無いとすれば、残り 190 銘柄は quote が無いか、厚く補助された quote しか得られず、ニュース 1 本で吹き飛ぶ薄い板になる。RFQ はこれを回避する — dealer は需要があるときだけ quote するので、銘柄ごとに idle 時の quoting コストが発生しない。

**「Last look」の話。**

よくある主張に「RFQ には last look (dealer が quote request を reject できる) があるが CLOB には無い」というのがある。半分正しい。CLOB では、market maker は taker が hit するより速く quote を cancel できる — HL の matching docs で **cancel prioritization** と呼ばれている挙動だ。自分にとって不利な taker を見た MM は、cross が commit される前に quote を引っ込められる。形は違うが、経済的な意味は同じ。

あなたが作った CLOB は cancel prioritization を実装していない — \`submit_limit\` と \`cancel\` は \`pending_actions\` で first-come-first-served になる。Production の HL ではそうではない: cancel が衝突する submit より前に並び替えられ、MM に実質的な last look が与えられる。**もし追加したくなったら、変更箇所は BFT engine の ordering rule であって、matching engine ではない。**

**あなたが作ったもの、その位置づけ。**

あなたが作ったのは、HL が **crypto-native の top tier 銘柄** を pricing するために使っている engine だ。これは現実に存在し、経済的に重要な market slice。RWA perp の long tail を pricing する engine *ではない* — その flow は RFQ の方が構造的に向いている。Dealer が銘柄ごとに板を bootstrapping せずに CME と NYSE の depth に直接アクセスできるからだ。

Builder にとって興味深い問いは「CLOB か RFQ か」ではなく、「どの asset class のどの slice を、どの liquidity source で」だ。HyperBFT の上に乗った CLOB に、smart contract から板にルーティングできる custom precompile を組み合わせる — これは crypto-native perp の top tier には正しいアーキテクチャ。それ以外には、設計余地はまだ広く残っている。

## 次に行く先

**rethlab 内**:
- **Course 8 — Custom EVM precompile** — openhl Stage 9 の \`clob_read_best_bid\` + \`clob_place_order\`。
- **Course 9 — Funding state machine** — openhl Stage 8b。

**rethlab 外**:
- **\`psyto/openhl\` Stage 9 ソース** — full custom-EVM build が public repo にある。Bridge を理解したら \`crates/evm/src/precompiles.rs\` を読むとよい。
- **参考用の production matching engine** — Project Serum (Solana CLOB、archived だが public)、dYdX v4 (Cosmos-based perp DEX、public)。データ構造を比較してみる価値がある。
- **Property-based testing の文献** — proptest の doc と Hughes/Claessen の QuickCheck 論文。L8 の invariant は保守的に絞ってあるので、もっと多く追加できる。

## クロージングノート

ソースファイル 5 個 (\`types.rs\` + \`book.rs\` + bridge への追加) にわたって約 **800 行の Rust** を書いた。そのコードは *実 Reth-backed bridge に組み込まれた動く CLOB matching engine* だ。Production-ready ではないし、本コースで production-ready にする必要もない。

最も難しい部分は matching ロジックを書くこと自体ではなかった — L4 の submit_limit は構造が理解できれば 60 行で済む。**最も難しいのは determinism property** — 可能な submit の任意の順序付けに対して engine が同じ答えを生成することを保証すること。L8 の proptest が、テストしようと思わなかったバグを catch してくれる。そして、それこそが build した engine を consensus に plug しても safe である理由になる。

正しいが non-deterministic な matching engine は consensus を壊す。Deterministic なものこそが、devnet から mainnet への移行を生き残るコードになる。

これを使って何か作りに行こう。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
