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
        "L1 Architect トラックの 10 コース中 7 番目。openhl ベースの build-along アークを `building-openhl-consensus` から続ける: consensus substrate (live Reth + Malachite、0.02 秒で block を produce する single-validator BFT) を持つ workspace から始め、reader が CLOB matching engine を追加して、その fill を committed block に配線する。終了状態: `cargo test clob_fills_flow_into_payload` が pass する — price-time-priority matching engine が produce した real fill が `LiveRethEvmBridge::build_payload` を通って consensus-committed payload に着地する。openhl Stage 8a (701 LOC、pure state machine) + Stage 8d (171 LOC、bridge integration) をカバー。範囲外: custom EVM precompile (course 8)、funding state machine (course 9)。",
      difficulty: "EXPERT",
      duration: 180,
      xpReward: 410,
      track: "reth-l1-architect",
      tags,
      isPublished: false,
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

前コース (\`building-openhl-consensus\`) は、real Reth EVM を通じて 0.02 秒で block を decide する single-validator BFT chain で終わった。**ただし decide していたのは空の block。** トランザクションなし、マッチングなし、価格発見なし。

本コースで **CLOB matching engine** を追加する — 「HYPE を $25 で 10 個買いたい」と「HYPE を $25 で 5 個売りたい」を real fill に変換する Hyperliquid の核。Stage 8a (701 行) が pure state machine を build、Stage 8d (171 行) が bridge に配線して、commit された block が matching engine の produce した fill を運ぶようになる。

本コース終了時、\`cargo test clob_fills_flow_into_payload\` が pass する — real fill が matching engine から \`LiveRethEvmBridge::build_payload\` を通って payload に流れ、それを consensus が commit する。

## 1. 終了時に手にするもの

新規 \`crates/clob/\` crate:

- **マイクロ秒で走る price-time-priority matching engine** — pure state machine、I/O なし、完全に deterministic。
- **\`Book\` + \`Order\` + \`Fill\` 型** — CEX が「order book」と呼ぶものに対応。
- **テスト 12 個合格**: hand-trace されたシナリオ 9 個 (空の book、FIFO 優先、market order の流動性枯渇、partial fill、cancel、マッチ後の no-crossed-book) + proptest invariant 3 個 (256 ケース × 3 = 768 ランダムシナリオ — quantity conservation、no-crossed-book always、determinism = replayability)。

そして \`crates/evm/\` に新規 integration test:

- **\`clob_fills_flow_into_payload\`** — real Reth node を bootstrap、bridge の CLOB に maker bid + crossing taker sell を submit、結果の fill が次の \`build_payload\` 出力に現れることを assert、そして **過去の payload は遡って fill されない** ことを assert (drain semantics は forward-only)。

終了時には次ができるようになる:

- なぜ price-time-priority CLOB が on-chain 永久 (perp) 取引所の canonical な構造なのか説明できる
- fill を buffer する matching engine (本コースで作るもの) vs 同期的に emit する matching engine のトレードオフを推論できる
- matching logic をゼロから再現できる — そしてコードのどこに手を入れれば stop order、post-only order、pro-rata matching 等が追加できるか分かる状態で改変できる

## 2. 終了時にも手にしないもの

本コースが扱うのは **Stage 8a + 8d のみ**。以下は扱わない:

- Stage 9: CLOB state を read/write する custom EVM precompile (= course 8)
- Stage 8b: funding rate state machine (= course 9)
- fill を EVM-executable トランザクションとして encode (= openhl 自体の Stage 9 より先の future work)
- Liquidation、mark-vs-index pricing、レバレッジ上限

本コース終了時、**fill を produce して committed block に運ぶ動く matching engine** は手に入るが、その fill はまだ parallel list — スマートコントラクトから読める Ethereum トランザクションとしては実行できない。それを足すのが course 8 (custom EVM precompile)。

これは honest scoping。実行配線なしの CLOB engine は半分の物語、残り半分 (precompile) は course 8。

## 3. 前提

必要なもの:

- **\`building-openhl-consensus\` 完了** — または同等の course 6 end state の workspace。\`crates/evm/src/live_node.rs\` に \`LiveRethEvmBridge<P>\` が \`provider\`、\`chain_spec\`、\`validator\`、optional な \`engine_handle\` フィールド付きで存在すること。なければまず course 6 を完了させる。
- **Rust 1.95+**、course 6 と同じ。
- **\`BTreeMap\`、\`VecDeque\`、\`Reverse<T>\`、proptest に慣れていること。** 「natural ordering」「最高値から walk するための reverse-ordering trick」が初耳なら、まず \`std::collections::BTreeMap\` のドキュメントを軽く読む。

不要なもの:

- 過去の matching-engine 経験 (データ構造はゼロから build する)
- 過去の order book 読解スキル (テストシナリオが各ステップを walk する)
- Multi-validator セットアップ (依然 single-validator)

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

それらが pass すれば start point として正しい。pass しなければまず course 6 を完了させる。

> 🛑 **やりがちな勘違い。** 「\`git clone psyto/openhl\` してそのコードベースに対して course 7 を進めればいい」。 **やれるが、摩擦を逃すことになる。** 本コースは build-along: matching engine を \`my-openhl/\` でゼロから書き、reference に対して diff する。\`openhl-reference\` で start すると course 6 §7 で論じた「答え合わせから type する」モードに逆戻りする。

## 5. 12 レッスンの全体マップ

| # | モジュール | 何を build するか | レッスン終了時のテスト |
| - | - | - | - |
| **L0** | Orientation | (本レッスン) | セットアップ確認 |
| **L1** | CLOB 型 | newtype 群 — \`AccountId\`, \`OrderId\`, \`Price\`, \`Qty\`, \`Side\`, \`OrderType\` | \`cargo check -p openhl-clob\` |
| **L2** | CLOB 型 | \`Order\`, \`Fill\`, \`FillResult\` | 型がコンパイル |
| **L3** | Matching engine | \`Book\` struct + \`Reverse<Price>\` trick + accessor | \`cargo check -p openhl-clob\` |
| **L4** | Matching engine | \`submit_order\` — Limit order、in-book matching | resting order とマッチする |
| **L5** | Matching engine | \`submit_order\` — Market order + crossing + partial fill | エッジケースの挙動 |
| **L6** | Matching engine | \`cancel\` + 空 level の cleanup | cancel-by-id が動く |
| **L7** | テスト | hand-trace された unit test 9 個 | 9 個全部 pass |
| **L8** | テスト | proptest invariant 3 個 (qty conservation、no-crossed-book、determinism) | 768 ランダムシナリオ pass |
| **L9** | Bridge 統合 | \`LiveRethEvmBridge\` に \`clob\` + \`pending_fills\` 追加、\`submit_order\` メソッド | bridge がコンパイル |
| **L10** | Bridge 統合 | \`build_payload\` が pending fill を drain、\`payload_fills(id)\` インスペクタ | fill が payload に現れる |
| **L11** | Bridge 統合 | \`clob_fills_flow_into_payload\` integration test | **フルパイプラインテスト pass** |
| **L12** | Capstone | 振り返り、次は何か (course 8 で precompile) | (テストなし — 振り返り) |

**L11 がマイルストーン。** L11 を終えると、matching engine が produce した fill が BFT engine を通って real block に流れる。L12 は「まだ何が足りないか」を named する (fill がスマートコントラクトから読めない — それは course 8)。

## 6. 答え合わせの規律 (course 6 と同じ)

各レッスン L1-L11 は SHA \`55a9dff\` (Stage 8a) または \`428cc26\` (Stage 8d) を cite する。レッスンのテストが pass した後:

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff    # または L9-L11 では 428cc26
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
# (など)
\`\`\`

meaningfully にマッチする — 同じ型、同じ制御フロー。空白と命名は違ってよい。

> 🛑 **やりがちな勘違い。** 「CLOB の仕組みはもう知っているから L9 まで飛ばして bridge 統合だけ学べばいい」。 **やれるが、L1-L8 はエンジンを後で改変するときに効く設計判断を encode している。** 逆順 bid、price level 内の FIFO、cancel-then-cleanup invariant — どれも自分で build しないと明らかにならない。L1-L8 をスキップするとコードは読めるが安全に変更できない。

## 7. セットアップ確認 — 実際の L0 演習

L1 に進む前に、以下を全部走らせて pass を確認:

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

3 つ全部 pass すれば L1 に進む準備 OK。

> **最終チェック。** 本コースが course 6 になかった何を追加するのか、1 文で言える? もし答えに「committed block に流れる fill を produce する matching engine」が入っていなければ §1 を読み直す。`,
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

このレッスンの終わりに:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…がクリーンにコンパイルする。新規 crate (\`crates/clob/\`) が workspace に登録され、\`src/types.rs\` 1 ファイルに matching engine が使う **atomic な field-level 型** が入る:

- **\`u64\` を wrap する newtype を 4 個** — \`AccountId\`、\`OrderId\`、\`Price\`、\`Qty\` — 偶発的な swap に対する型安全性のため。
- **\`Side\` enum** (\`Buy\` | \`Sell\`) と \`opposite()\` ヘルパー。
- **\`OrderType\` enum** — \`Limit { price }\` または \`Market\`。
- **\`OrderId\`、\`Price\`、\`Qty\` への \`Display\` impl** — debug 出力が自然に読めるように (\`"#42"\`、\`"1000000"\` 等)。

Record 型はまだなし (L2)。Book もまだなし (L3 以降)。本レッスンは土台 — 以降の全レッスンがここで build する型を使う。

## おさらい

Course 6 完了時点で、workspace には:

\`\`\`
crates/types/             — BlockHash, PayloadId, PayloadAttrs, ExecutedBlock, PayloadStatus
crates/evm/               — InMemoryEvmBridge, RethEvmBridge, LiveRethEvmBridge
crates/consensus/         — フル BFT engine (Context, signing, codec, node, engine_app)
bin/openhl/               — stub バイナリ
\`\`\`

\`cargo test\` で workspace 全体 ~38 個合格。\`LiveRethEvmBridge::commit\` が \`ForkchoiceUpdated\` を Reth に送る。**ただし \`build_payload\` は空 block を produce する** — 中に入れるものがない。

## 計画

5 つやる:

1. **\`crates/clob/\` ディレクトリを作成** — \`Cargo.toml\` と \`src/\`。
2. **\`crates/clob/\` を workspace に登録** — ルート \`Cargo.toml\` の \`[workspace.members]\` に追加。
3. **\`openhl-clob\` を workspace dependency に追加** — ルート \`Cargo.toml\` で、他 crate が依存できるように。
4. **\`src/types.rs\` を書く** — newtype 4 個、\`Side\`、\`OrderType\`、\`Display\` impl。**Record 型はまだなし** (L2)。
5. **\`pub mod types;\` + re-export を \`src/lib.rs\` に配線** — crate の public API を型に。

このレッスンが短いのは型が短いから。重要なのはコードではなく **設計判断** (なぜ raw \`u64\` でなく newtype か、なぜ \`Limit\` が価格を struct field として運ぶか、\`Qty\` の単位は何か)。

> 🛑 **考えてみよう。** スクロールする前に: 同じ \`u64\` を wrap する newtype が 4 個 (\`AccountId(u64)\`、\`OrderId(u64)\`、\`Price(u64)\`、\`Qty(u64)\`) 並んでいるとき、各 newtype が防ぐ **1 つのバグ** は何か — raw \`u64\` を使うと通り抜けるバグ? ヒント: \`(u64, u64, u64)\` を取る関数を考える。誰かがその引数を間違った順序で呼ぶ場面を想像する。**newtype パターンの主な役割は、argument-swap バグを compile error に変えること。**

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

依存なし。CLOB matching engine は純粋データ + 純粋ロジックで、この段階では \`serde\` も要らない (Stage 8b が funding 用に追加するが、今は不要)。

### Step 2: Workspace に登録

ルート \`Cargo.toml\` を開く。\`[workspace] members = [...]\` を見つけ、リストに \`"crates/clob"\` を追加。既存の順序を保つ (アルファベット順または挿入順どちらでもよい):

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

同じルート \`Cargo.toml\` で、\`[workspace.dependencies]\` を見つけ、\`openhl-clob\` のパスエントリを追加:

\`\`\`toml
[workspace.dependencies]
# --- Internal crates ---
openhl-types     = { path = "crates/types" }
openhl-clob      = { path = "crates/clob" }     # NEW
openhl-evm       = { path = "crates/evm" }
openhl-consensus = { path = "crates/consensus" }
\`\`\`

これで \`openhl-clob\` が欲しい crate は自分の \`Cargo.toml\` で \`openhl-clob = { workspace = true }\` と宣言できる。L9 で bridge が CLOB を consume するときに使う。

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

4 つの構造体、各 1 行、すべて \`u64\` を wrap。**7 個の derive は 4 型すべてで同一** — 意図的。newtype パターンが効くのは、型が \`u64\` と **同じ操作** を持つが、型システムが両者の混在を **拒否する** から。

doc コメントで 3 つ注目する点:

- **\`AccountId\` は opaque** — CLOB は chain が EVM address、ed25519 pubkey、sequential integer のどれを使うか知らない。ただ equality で比較するだけ。Chain 統合 (course 8 の precompile、最終的に production node コード) が \`AccountId(...)\` を chain が欲しい何かにマップする。
- **\`OrderId\` は caller-allocated** — book が ID を生成しない、caller が生成する。これで book が pure-stateless に保たれる: \`submit_order\` は (book, order) の関数で、(book, order, generator-state) ではない。
- **\`Price\`/\`Qty\` は minor unit** — USDC のような 6-decimal token では \`Price(1_000_000)\` が $1.00 を表す。Matching engine に \`f64\` は **存在しない**。**お金の計算で float は禁止。**

> 🛑 **やりがちな勘違い。** 「便利のために \`pub fn from_dollars(d: f64) -> Price\` メソッドを追加しよう。」 **ダメ、f64 の精度の罠を engine に持ち込むことになる。** \`Price(1_000_000)\` が wire format。User 向けツールが \`from_dollars\` をやりたければ、自分の境界で integer 乗算をして bridge に integer-typed Price を渡す。Matching engine は float を見ない。

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

variant 2 個。\`opposite()\` メソッドは今 1 行だが、後で load-bearing になる: taker order が来たとき book の **反対側** を walk して流動性を探す。Buy taker は ask を walk; Sell taker は bid を walk。**ルールを \`opposite()\` に 1 回 encode することで、book コードを読むときどっち側を walk するか忘れない。**

\`#[derive(PartialOrd, Ord)]\` が **ない** のは意図的。「Buy は Sell より小さい?」は無意味。trait を抜くことで、caller が \`if side < Side::Sell\` を偶発的に書いて意図しない順序 (declaration 順なので \`Buy < Sell\`) を得るのを防ぐ。

> 🛑 **やりがちな勘違い。** 「bool でいいんじゃない? \`is_buy: bool\` でバイト節約。」 **call site で意味が失われる。** \`submit_order(order, true)\` は読み手にゴミに見える; \`submit_order(order, Side::Buy)\` は明らか。enum vs bool の 1 バイトのコストは、bool の可読性コストに比べたら無視できる。**名前を持つものは enum、on/off 以上の名前を持たないものだけ bool。**

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

\`Limit { price: Price }\` を tuple スタイル \`Limit(Price)\` でなく struct スタイルにしたのは意図的。コードが \`order.order_type\` をパターンマッチするとき、\`Limit { price }\` で field 名 \`price\` がパターンに入る。tuple は \`Limit(p)\` と書かせて \`p\` の意味を覚えさせる。**Named field が型を self-documenting にする。**

> 🛑 **やりがちな勘違い。** 「\`Stop\`、\`StopLimit\`、\`Iceberg\`、\`Post-Only\` も足しておけば?」 **engine がまだ必要としていないし、未使用 variant は技術負債。** Limit + Market が L7-L8 の spot-trading テストシナリオをカバーする最小セット。openhl が Stop order を必要とするとき (おそらく perp 領域、course 9 以降)、メンテナがそのとき variant を追加し、その時点でマッチングロジック、book ロジック、テストシナリオがすべて同時に更新される。**使う直前に型を追加し、それ以前にしない。**

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

\`Display\` impl 3 個。**\`AccountId\` に Display がない** のは意図的。AccountId は opaque な ID; print したいなら、生の \`u64\` ではなく chain 統合のマッピングが返す real address を print したいはず。\`Display\` を抜くと caller が明示的にせざるを得なくなる (例: \`format!("{}", a.0)\` または「chain の address renderer 経由で render」)。

\`OrderId\` は \`"#42"\` として format するのでテスト出力が自然 (\`fill from #1 to #2\`)。Price と Qty は単なる数値値 — だが \`Display\` impl があれば \`.0\` を書かずに \`format!\` / \`println!\` で使える。

### Step 7: 型を \`lib.rs\` に配線

\`crates/clob/src/lib.rs\` を開く:

\`\`\`rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [\`book::Book\`] for the matching state machine (L3+).

pub mod types;

pub use types::*;
\`\`\`

body 3 行 + doc コメント。\`pub use types::*\` で型を crate ルートで re-export するので、caller は \`use openhl_clob::types::{Order, Side}\` ではなく \`use openhl_clob::{Order, Side}\` と書ける — 短い形をどこでも使う。

\`book\` モジュールは L3 で来る; 今は \`pub mod types;\` 1 行。

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

クリーンに完了するはず。新規 crate に依存する物がまだないので何にも影響しない。

よくあるエラーと対処:

- **\`error: failed to read 'crates/clob/Cargo.toml'\`** — workspace \`members\` リストの typo、またはファイルが存在しない。Step 2 を再確認。
- **\`error[E0432]: unresolved import 'fmt'\`** — \`types.rs\` 冒頭の \`use core::fmt;\` を忘れている。Step 3 を再確認。
- **\`error[E0277]: 'Price' doesn't implement \`Display\`** — \`OrderId\` には \`Display\` を追加したが \`Price\`/\`Qty\` にしていない。Step 6 を再確認。
- **\`warning: unused import: 'types'\`** — \`lib.rs\` が \`pub mod types;\` ではなく \`mod types;\` (private)。Step 7 を再確認。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Newtype が argument-swap バグを compile time に防ぐ。** \`submit(book, account: u64, price: u64, qty: u64)\` のコードは、3 個の \`u64\` を任意の順序で渡してもコンパイルが通る。\`submit(book, AccountId, Price, Qty)\` のコードは間違った型を compile time に拒否する。コストは余分な \`.0\` deref 2 個、利益は書けないバグ。

2. **お金の計算は integer、float ではない。** \`Price\` と \`Qty\` は \`u64\` ベース。\`Price::from_f64\` は存在しない。価格を "$1.00" として表示したい人は、engine の **外** の rendering 境界で integer-to-decimal 変換をする。Matching engine の invariant (例: 「fill 合計は数量を常に保存する」) は exact-integer invariant。float 中間値を導入したら壊れる。

3. **\`OrderType::Limit { price }\` で \`Limit(Price)\` ではない。** 後で \`match order.order_type { Limit { price } => ..., Market => ... }\` と書くとき、\`price\` binding が役割を明らかにする。tuple スタイル enum variant が正しいのは variant が「ある 1 物の wrapper」のとき; struct スタイルが正しいのは field に **名前** があるとき。ここでは名前がある (\`price\`) ので struct スタイルが勝つ。

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
中身は \`u64\` — 8 バイト、heap なし。\`Copy\` をマークすると、engine が \`.clone()\` を書かずに value で自由に渡せる。Trait bound は runtime ではゼロコスト。

**Q: なぜこれら型に \`Hash\`?**
将来の用途: O(1) cancel-by-id (レッスン L6) のための \`HashMap<OrderId, RestingOrder>\`。今 \`Hash\` を足しておけば、後で derive cascade の churn が起こらない。

**Q: なぜ \`Side: PartialOrd + Ord\` でない?**
「Buy は Sell より小さい?」が無意味な質問だから。\`Ord\` を derive すると、caller が \`if side < Side::Sell { ... }\` を書いて、Rust が最初に列挙した variant (ここでは Buy) を取る — だがこれは declaration 順の artifact で、semantically な意味ではない。trait を抜くと caller は \`match\` か \`==\` を強制される。

**Q: なぜ \`opposite()\` に \`#[must_use]\`?**
\`side.opposite();\` (結果を assign しない) がほぼ確実にバグだから — \`opposite()\` は新しい \`Side\` を返す、mutate しない。\`#[must_use]\` でそれを warning にする。返り値が唯一の目的の関数すべてで良いプラクティス。

## 次のレッスン (L2)

Field-level 型 — atomic な部品 — がそろった。L2 ではそれらを組み合わせる **record-level 型** を build する: \`Order\` (matching engine への入力)、\`Fill\` (出力)、\`FillResult\` (fills と remaining-quantity 情報を bundle する wrapper)。L2 完了後、型の語彙が完成する; L3 以降がこれらの型を使って実際の matching state machine を build する。`,
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

このレッスンの終わりに:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…依然コンパイルする。\`crates/clob/src/types.rs\` に L1 の newtype から build した **record 型 3 個** が入る:

- **\`Order\`** — matching engine への入力 (id、account、side、qty、order_type)。
- **\`Fill\`** — maker と taker の間の 1 match の出力 (maker_order_id、taker_order_id、maker_account、taker_account、price、qty)。
- **\`FillResult\`** — submit の return ラッパー: \`fills: Vec<Fill>\` + \`remaining_qty: Qty\` + \`total_filled()\` ヘルパー。

これで **型の語彙** が完成する。L3 以降はこれらの型を使って matching state machine を build する。

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

約 65 行。\`cargo check -p openhl-clob\` が pass。**足りないもの**: これらを組み合わせる型 — order がどう見えるか、fill がどう見えるか、engine が submit 後に何を返すか。L2 がちょうどそのギャップを埋める。

## 計画

同じ \`types.rs\` に record を 3 個追加:

1. **\`Order\`** — 5 field、すべて L1 の型から。Matching engine が 1 つの \`Order\` を取り、1 つの \`FillResult\` を返す。
2. **\`Fill\`** — 6 field、maker + taker を明示的に名付ける。**両方** maker_order_id と maker_account を保存するのは、chain 統合 (course 8) が account を credit/debit するから。
3. **\`FillResult\`** — fill 群 + マッチも rest もしなかった残りを集める。\`total_filled()\` ヘルパー付きで、caller が iterate せずに「いくらマッチしたか?」を尋ねられる。

新規依存なし。\`types.rs\` の外でのコード変更なし。コード ~35 行。

> 🛑 **考えてみよう。** スクロールする前に: \`Fill\` は **両方** \`maker_order_id\` と \`maker_account\` を運ぶ。なぜ重複? Maker の \`OrderId\` で account を lookup できれば十分なのでは? ヒント: \`Fill\` を consume する側は誰か。Chain の \`clob_place_order\` precompile (course 8) は balance を credit する — account が直接必要。\`OrderId → AccountId\` の lookup は precompile に order book の内部 index への参照を持たせる必要がある。**両方を Fill 自体に持たせると consumer が engine の内部 state から decouple される。** Message passing vs. shared state の発想。

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

5 field。**全部 \`Copy\`** — Order は 8 (OrderId) + 8 (AccountId) + 1 (Side) + 8 (Qty) + 16 (OrderType — discriminant + Price) = 41 バイト。padding 込みで約 48 バイト。値渡しで自由に渡せる小ささ。通常コードで \`Box<Order>\` や \`&Order\` は不要。

field 順序には意味がある:
- **\`id\` 最初** — 最も使われる field (lookup、equality、debug)。
- **\`account\`** — 誰が発注したか。
- **\`side\`** — Buy か Sell か。
- **\`qty\`** — いくら。
- **\`order_type\` 最後** — 最も複雑な field (enum)、dispatch を制御する field (Limit vs Market が L4-L5 で別の matching ロジックを起こす)。

> 🛑 **やりがちな勘違い。** 「\`order_type\` は冗長 — \`OrderType::Limit { price }\` が price を運ぶなら、\`price: Price\` を直接 \`Order\` に置けばいいのでは?」 **Market order に price がないから。** \`price: Price\` を Order に置くと、すべての Market order に意味のない placeholder price を運ばせる羽目になり、それを至るところで ignore しなければならない。enum は「price があるか、ないか」をちょうど 1 回 encode する。**\`Option<Price>\` でも動くが「Market」タグを失う** — \`OrderType\` が正しい形なのは、区別に **名前** があるから (presence/absence ではない)。

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

6 field。Maker-vs-taker の区別が matching engine コードで最重要の概念:

- **Maker** = 既に book に rest していた order。流動性を「作った (made)」側; 経済的により良い deal を得る (real exchange では通常 rebate)。
- **Taker** = 流動性を消費して入ってきた order。Spread を払う; real exchange では fee を払う。

各 \`Fill\` は 1 つの match ペアを表す。1 つの taker order が **複数の Fill** を produce することがある (例: market buy が ask 側を上に walk して resting ask を順に食べる)。

**\`price\` は maker の価格** — taker が book を hit するとき、taker の limit ではなく maker の resting 価格でマッチする。$101 の limit-buyer が $100 の resting limit-seller とマッチすると $100 で fill する (maker の価格); buyer が勝つ。これが「price-time priority」の動作。

> 🛑 **やりがちな勘違い。** 「account ID を両方保存するのは冗長に見える — 各 \`Fill\` は consumer 時に \`OrderId\` から account を lookup できる」。 **ダメ — そのためには consumer が book の \`HashMap<OrderId, RestingOrder>\` への参照を保持し、book が先に進んだ後も生かさなければならない。** Fill は match 時に emit され非同期に consume される (我々の場合、後で commit される payload に drain される)。Book がその間に maker order を cancel していたら、\`OrderId → AccountId\` lookup は \`None\` を返し、consumer は詰む。**Self-contained な Fill ならその問題はない。**

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

**\`FillResult\` は \`Copy\` でない** — heap 割り当て される \`Vec<Fill>\` を所有する。test とデバッグパスのために \`Clone\`、engine は値で return する (happy path で clone 不要)。

doc コメント中の 3 つ、L3+ のコードが依存する:

1. **\`fills\` は execution 順序**。Market buy が ask level を 3 個 walk すると、fills[0] が最安マッチ、fills[1] が次、fills[2] が最高。Replay determinism にこの順序が重要 (L8 の proptest が assert する)。
2. **\`remaining_qty\` は rest しなかった taker quantity のみ**。Market order の remainder 100 = 100 unit がどの価格でもマッチできなかった (book が流動性切れ) を意味する。Limit order の remainder 0 でも fill しなかった残りがあり得る — だがその残りは **今 book にある** (resting order として)、return 値の中ではない。
3. **\`total_filled\` はヘルパー、stored field ではない**。fill に対する O(N) sum。cache しないのは、(a) caller が「fill したか?」を聞くだけなら通常 \`Vec::len()\` が必要、(b) 実際の quantity total は test/inspection コードでしか必要なく、そこでは O(N) は問題にならないから。

> 🛑 **やりがちな勘違い。** 「\`remaining_qty\` を別 field ではなく per-fill data の一部にしたら?」 **submit ごとに remainder は最大 1 個で、どの fill にも紐付かない** — それは **fill されなかった** 部分。\`Fill\` に入れると、すべての fill に無意味な 0 を運ばせるか、それを保持するためだけの「phantom fill」エントリが必要になる。\`FillResult\` に別 field として置くのが正しい形。

### Step 4: \`lib.rs\` がまだすべて re-export していることを確認

L1 の \`lib.rs\` で \`pub use types::*;\` と書いた。その \`*\` が今追加した 3 つの新規型を自動的に拾う — edit 不要。簡単に確認:

\`\`\`rust
// crates/clob/src/lib.rs (変更不要)
pub mod types;
pub use types::*;
\`\`\`

もし \`lib.rs\` が \`pub use types::{AccountId, OrderId, ...};\` のような個別 re-export なら、新規 3 個を追加する必要がある。**だが \`*\` を L1 で setup したので不要。**

## テスト

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

依然コンパイル。出力は L1 と同じ (新規 warning や error なし、check されるコードが少し増えただけ)。

将来 \`crates/evm/Cargo.toml\` の視点で型が visible であることを軽くサニティテストできる。まだ dep 追加はしない (それは L9)、だが型が public であることは証明できる:

\`\`\`bash
cargo doc -p openhl-clob --no-deps --open
\`\`\`

レンダリングされた doc を browse する。"Structs" の下に \`AccountId\`/\`OrderId\`/\`Price\`/\`Qty\` と並んで \`Order\`、\`Fill\`、\`FillResult\` が見えるはず。\`total_filled\` は \`FillResult\` のメソッドの下に。

よくあるエラーと対処:

- **\`error[E0277]: 'FillResult' doesn't implement 'Copy'\`** — \`FillResult\` に \`#[derive(Copy)]\` をつけた。**Copy にできない** のは内部の \`Vec<Fill>\` のため。derive から \`Copy\` を外し、\`Clone\` だけ残す。
- **\`error[E0599]: no method named 'total_filled' for ...\`** — ヘルパーを \`impl FillResult { ... }\` の外に書いた。関数は impl ブロック内が必要。
- **\`warning: field 'X' is never read\`** — field を書いたが test/usage が参照していない。**今は無視** — L3+ が全部使う。Matching engine にまだ consumer がない。

## 設計の振り返り

3 つの load-bearing な決定:

1. **\`Fill\` は self-contained。** Order book の内部 index があれば片方からもう片方を導出できるのに、maker_order_id と maker_account を両方保存する。これが Fill の consumer (precompile、payload assembly、chain 統合) を engine の内部データ構造から decouple する。**self-contained メッセージは live state への参照より module 境界を越えやすい。**

2. **\`FillResult\` は「fills」と「remainder」を分ける。** Submit は 0 個以上の fill と 0 か 1 個の remainder を produce する。1 つの \`Vec<Fill>\` でモデルすると、remainder のために「phantom fill」が必要になるか、それを検出する特殊ケースロジックが必要になる。2-field record が型に仕事をさせる。

3. **\`total_filled()\` は computed、cached ではない。** Cache するとすべての fill-list 変更がカウンタを update する羽目になる — error-prone。On-demand 計算で \`FillResult\` を derived state のない純粋データ record に保つ。O(N) コストは N が通常 1-3 (single fill が最頻、market order が 10 level 食べるのは稀) なので無視可能。

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

**Q: なぜ \`Order\` は \`Copy\` だが \`FillResult\` は違う?**
\`Order\` は 5 field、全部 \`Copy\` (\`u64\` の newtype + 小さい enum)。合計 ~48 バイト — memcpy が安価。\`FillResult\` は heap 割り当て される \`Vec<Fill>\` を所有; コピーには allocator 呼び出しが必要。\`Copy\` は \`=\` が single bit-blit な型のみ。Trait が意味を反映する。

**Q: なぜ \`Fill\` に \`qty: Qty\` で、ただの \`u64\` ではない?**
Engine の残りとの一貫性。すべての quantity は \`Qty\` 型; ここで \`u64\` を混ぜると境界で変換が強制される (そして忘れるリスク)。Newtype の規律は engine 単位、struct 単位ではない。

**Q: \`FillResult\` で \`Box<[Fill]>\` を使ったら?**
できる、「これ以上 push しない」ケースではメモリ効率が少し良い。だが \`Vec<Fill>\` は \`submit_order\` がインクリメンタルに build するもの (match ごとに push); 最後に \`Box<[Fill]>\` に変換すると 1 個余分な allocation。Profile で重要と分かるまで \`Vec\` がシンプルな選択。

**Q: Fill の \`qty\` が 0 だったら? それは valid Fill か?**
違う — L4-L5 の matching engine は zero-qty Fill を決して produce しない (「0 unit マッチした」= 「マッチしなかった」と同じ意味になる)。型システムはこれを強制しない; engine の invariant が強制する。L7-L8 の test が regression を catch する。

## 次のレッスン (L3)

型の語彙が完成した。L3 では **matching state machine** を導入する — resting bid/ask order を保持する \`Book\` 構造体、book を inspect するヘルパーメソッド (\`best_bid\`、\`best_ask\`、accessor)。\`submit\` ロジックはまだなし (L4)、データ構造と bid を最高値から walk するための \`Reverse<Price>\` トリックのみ。`,
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

このレッスンの終わりに:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…依然コンパイルする。新規ファイル \`crates/clob/src/book.rs\` に以下が入る:

- **\`Book\` struct** — 2 つの \`BTreeMap\` (bids + asks)、それぞれ price level を resting order の \`VecDeque\` にマップ。
- **\`RestingOrder\` struct** — book に rest している order の形 (\`Order\` から trim)。
- **\`new()\` コンストラクタ** + read-only accessor 4 個 (\`best_bid\`, \`best_ask\`, \`depth_bid\`, \`depth_ask\`)。

**まだ matching ロジックなし** — \`submit\` は L4 + L5、\`cancel\` は L6。本レッスンは、後続の matching ロジックが少ない行数で済むようにデータ構造を正しく build することが目的。

唯一の load-bearing なアイデア: **\`Reverse<Price>\` を \`BTreeMap\` の key にする** ことで natural-order iterator が bid を highest-first で walk する。これが見えれば、残りの matching コードは自明になる。

## おさらい

L2 完了時点で \`crates/clob/src/types.rs\` は完成 (~109 行): newtype 4 個、\`Side\`、\`OrderType\`、\`Order\`、\`Fill\`、\`FillResult\`、\`Display\` impl。

\`crates/clob/src/lib.rs\` は \`pub use types::*\` でそれらすべてを re-export している。**\`book\` モジュールはまだない** — 本レッスンで作る。

## 計画

5 つやる:

1. **\`crates/clob/src/book.rs\` を作成。**
2. **\`Book\` struct を書く** — \`bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>\` と \`asks: BTreeMap<Price, VecDeque<RestingOrder>>\`。
3. **\`RestingOrder\` struct を書く** — \`Order\` から trim (side なし、order_type なし、qty は縮む)。
4. **\`Book::new()\`** + accessor メソッド 4 個を追加。
5. **\`pub mod book;\`** を \`lib.rs\` に配線。

Accessor は \`Option<Price>\` または \`usize\` を返す — BTreeMap の形に対する純粋な read 操作。興味深い設計判断は **map key 型** と \`RestingOrder\` が \`Order\` から何を残し何を落とすか。

> 🛑 **考えてみよう。** スクロールする前に: \`BTreeMap\` は key を **natural order** (小さい順) で iterate する。**ask** (最安価格を最初に欲しい) には \`BTreeMap<Price, _>\` が完璧 — natural order がそのまま最安先に walk する。**bid** には **最高価格を最初に** 欲しい — だが natural order は最安先に walk する。**カスタム comparator を書かずに BTreeMap を最高先に walk させる最も安価な方法は?** ヒント: 「u64 の ordering を反転する」を型として考える。

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

注目するべき点:

- **\`core::cmp::Reverse\`** — 任意の \`Ord\` 型の ordering を反転する wrapper。\`Reverse(Price(100))\` は \`Reverse(Price(200))\` **より大きい** と比較される (Reverse が underlying な比較を反転するため)。
- **\`BTreeMap\`** — sorted map。Iteration は key を昇順 (= **natural order** = \`Ord::cmp\` が「小さい順」と言う順) で walk する。Insert/remove/lookup はすべて O(log n)。
- **\`VecDeque\`** — 両端 queue。価格 level 内の「time priority」に使う: 新規 order は \`push_back\` (列の最後尾)、マッチした order は \`pop_front\` (列の先頭から fill)。
- **L1 + L2 のすべての型** — 本レッスンで直接使わないもの (\`Fill\`、\`FillResult\`、\`Side\` 等) も含む。最終的な import リストに合わせて今 import する; L4-L6 の matching コードで全部使う。

> 🛑 **やりがちな勘違い。** 「\`BTreeMap\` ではなく \`HashMap\` を使えばいい? Hash lookup は O(1) で BTreeMap の O(log n) より速い」。 **lookup だけでなく、価格順に iterate する。** 「best bid」を見つける = 「最高価格の bid」。HashMap には「次のソート済み key」概念がない; 全 key を scan (O(n)) して最大を見つける必要がある。BTreeMap の sorted iteration は best を O(1) lookup (\`keys().next()\`) でくれる — それが matching を安くする。

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

Matching engine の状態全体が **2 つの BTreeMap**。それだけ。Order-id index なし、別の「best price」cache なし (BTreeMap が既に best を O(1) でくれる)、tick-size table なし。

Bids と asks の非対称性 — \`Reverse<Price>\` vs. \`Price\` — は奇妙に見えるが、これが load-bearing なトリック:

- **Asks: \`BTreeMap<Price, _>\`。** Natural-order key で iteration が \`Price(99)\`, \`Price(100)\`, \`Price(101)\`, ... と進む。最安 ask を欲しい buy-taker は \`asks.keys().next()\` → \`Price(99)\` を読む。Best-first。
- **Bids: \`BTreeMap<Reverse<Price>, _>\`。** \`Reverse<Price>(p)\` の natural order は **p の降順**: \`Reverse(Price(101))\` が \`Reverse(Price(100))\` より前、\`Reverse(Price(100))\` が \`Reverse(Price(99))\` より前。最高 bid を欲しい sell-taker は \`bids.keys().next()\` → \`Reverse(Price(101))\` を読む。Best-first。

**両側ともに \`keys().next()\` で best price を取る。** これが型非対称性を正当化する API 対称性。\`Reverse\` なしだと bid lookup が \`keys().next_back()\` (BTreeMap iterator の逆方向) になり、matching コードが side 間で非対称になる — 混乱しやすく、間違えやすい。

\`#[derive(Default)]\` は \`Book::new()\` (次のステップ) が単に \`Self::default()\` で済むため — コンストラクタで \`BTreeMap::new()\` を 4 回書く必要なし。\`BTreeMap\` の Default は空 map; \`Book\` 全体の \`Default\` も同様。

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

field 3 個、**pub ではない** (内部型 — caller が \`RestingOrder\` を直接触らない)。

\`Order\` から落としたもの:

- **\`side\`** — 削除。RestingOrder の側はどちらの map に入っているか (bids vs. asks) で分かる。2 回保存するのは冗長で error-prone。
- **\`order_type\`** — 削除。Resting order は定義上常に Limit order (Market order は決して rest しない — 取れる分だけ取って残りは破棄)。\`order_type\` を保存すると \`OrderType::Market\` の \`RestingOrder\` を作れてしまうが、それは無意味。
- **\`qty\` は残る** — だが **時間と共に縮む**、部分 fill される度に。L4 の submit コードが、maker が taker の qty の 100% 未満を食ったときに \`RestingOrder.qty\` を直接 mutate する。

> 🛑 **やりがちな勘違い。** 「Original の \`Order\` を book に保存して \`qty\` を modify すればいい?」 **\`Order\` は \`Copy\` (field 5 個、すべて stack-safe) で、Copy field を mutate するのは注意深い reviewer にバグに見える。** 具体的には、\`Order\` が queue 内に保存されていると、matching コードが \`*order_in_queue.qty.0 -= fill_qty.0\` のように書く — だがこれは \`Copy\` で安く clone できるはずのデータを mutate している。\`RestingOrder\` を別型にすることで「これが mutate される」という性質を明示する: caller は \`RestingOrder.qty\` が縮むことを知っている、\`RestingOrder\` がそのために **ある** から。

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

- **\`new()\`** — \`Self::default()\`。\`Book { bids: BTreeMap::new(), asks: BTreeMap::new() }\` と書けるが、\`#[derive(Default)]\` が均一に処理する。
- **\`best_bid()\`** — \`keys().next()\` が natural-order の最小 key を返す。Bids は \`Reverse<Price>\` を使うので、その key は最高 price を wrap する。\`.map(|rp| rp.0)\` で unwrap — \`rp.0\` が \`Reverse\` wrapper を剥がす。
- **\`best_ask()\`** — 同じパターン、ただし key が \`Price\` 直接。\`keys().next()\` が最小 \`Price\` を返し、\`.copied()\` で値として取り出す (なしだと \`Option<&Price>\` になる)。
- **\`depth_bid()\` / \`depth_ask()\`** — 全 price level にわたる queue 長の合計。Inspection 用、テストとデバッグで使う。

**なぜ best が \`Option<Price>\`?** Book が空のとき、best price は存在しない。\`Option::None\` が正しい答え; \`Price(0)\` や \`Price(u64::MAX)\` を返すと caller が偶発的に real price として扱う可能性がある。型が空ケースのハンドリングを強制する。

> 🛑 **やりがちな勘違い。** 「\`depth_bid\` は O(n) — 遅い」。 **テストと inspection でしか呼ばれず、そこでは O(n) は問題ない。** Matching engine 本体は \`depth_bid\` を決して呼ばない — \`keys().next()\` と \`front()\` を O(1)/O(log n) で walk する。\`depth_bid\` が hot path にあるなら counter を追加して push/pop ごとに bump するだろう; だがそうではないので、しない。

### Step 5: \`lib.rs\` に配線

\`crates/clob/src/lib.rs\` を開く。L1 + L2 の内容:

\`\`\`rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [\`book::Book\`] for the matching state machine (L3+).

pub mod types;

pub use types::*;
\`\`\`

新規モジュールに **1 行**、public な \`Book\` 型に **1 re-export** を追加:

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

順序は意図的: \`book\` がアルファベット順で先、\`types\` が次。Rust crate の import は通常 crate-level module をアルファベット順にすると読みやすい。

**\`Book\` のみ re-export、\`RestingOrder\` はしない。** \`RestingOrder\` は内部 queue 要素; matching engine の外から誰も construct したり read したりすべきでない。\`book.rs\` 内で \`pub struct\` でなく \`struct\` のまま保つことでそれを明示する。Compiler が「このモジュールの外で誰も RestingOrder を触らない」を強制する。

## テスト

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

期待: clean compile、warning なし。

**unused import** の warning が出るかもしれない — L3 では \`book.rs\` が \`Fill\`, \`FillResult\`, \`Order\`, \`OrderType\`, \`Qty\`, \`Side\` を import するがまだ使わないから:

\`\`\`
warning: unused import: \`Fill, FillResult, Order, OrderType, Qty, Side\`
 --> crates/clob/src/book.rs:11:5
\`\`\`

**ハンドリングの 2 つの選択肢:**

1. **今は warning を抑制** — use 文の上に \`#[allow(unused_imports)]\` を追加。L4 が全部使い始めたら削除。
2. **今は未使用 import をコメントアウト** — L4-L6 で必要に応じて uncomment。

SHA \`55a9dff\` の参照は import を全部保つ (ファイルがその SHA で完成しているから)。Build-along では選択 1 が参照に近い; 選択 2 は warning が気になるなら綺麗。どちらでも fine。

構造がコンパイルできることのクイックサニティテスト:

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

走らせる必要はない; 型がコンパイルできるだけでよい。\`cargo check -p openhl-clob\` が clean なら OK。

よくあるエラーと対処:

- **\`error[E0277]: 'BTreeMap<Reverse<Price>, ...>' is not 'Default'\`** — \`BTreeMap<K, V>\` は \`K: Ord\` を要求し、\`Reverse<T>\` は \`T: Ord\` を要求する。L1 で \`Price: Ord\` derive 済みなので動く。L1 で \`Price\` に \`Ord\` を derive し忘れていれば derive chain がここで壊れる。
- **\`error[E0599]: no method named 'len' for \`VecDeque<RestingOrder>\`** — \`depth_bid\`/\`depth_ask\` の typo。メソッドは \`VecDeque::len\`、\`.len()\` 直接または \`VecDeque::len(deque_ref)\` でアクセス。
- **\`error[E0382]: borrow of moved value: \`rp\`** in \`best_bid\` — \`&Reverse<Price>\` 参照に対する \`.map(|rp| rp.0)\` で、closure が \`rp: &Reverse<Price>\` を受け取り、\`rp.0\` は \`Price\` を値で返す (\`Reverse<Price>: Copy\` のため、\`Price: Copy\` だから)。これが error なら \`Price\` が \`Copy\` ではない — L1 の derive リストを確認。
- **\`error: cannot find type 'RestingOrder' in module 'book'\`** 外側から — \`RestingOrder\` は private。意図的。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Matching engine の状態は 2 つの BTreeMap。** Order-id index なし、best-price cache なし、side ごとの counter なし。他はすべてその 2 map から導出される。将来の最適化 (例: O(1) cancel のための \`HashMap<OrderId, (Side, Price)>\`) は core data model を変えずに追加できる。**操作をサポートする最も単純な表現で始め、profile が要求したら最適化する。**

2. **Bids に \`Reverse<Price>\` を使うのは、matching コードの複雑さを節約する型レベルトリック。** これなしだと、book を walk するすべての場所で分岐が必要: 「ask なら \`next\`、bid なら \`next_back\`」。Bids に \`Reverse<Price>\` を使うことで、両側が \`next\` で uniform。**呼び出し側で 1 つの対称 API は、データ定義の 1 つの型非対称性に値する。**

3. **\`RestingOrder\` を \`Order\` から trim することで invariant を encode する。** Resting order は side を持たない (どの map にあるかで分かる) し \`order_type\` を持たない (Market order は決して rest しない)。これらの field を \`RestingOrder\` から取り除くと、不可能な状態が表現不可能になる。**型設計 = 制約エンジニアリング。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/clob/src/lib.rs ./crates/clob/src/lib.rs
\`\`\`

L3 後、自分の \`book.rs\` は参照の **最初の ~45 行** (struct 定義 + \`new()\` + accessor 4 個)。この SHA の参照には \`submit\` (~100 LOC、L4 + L5)、\`cancel\` (~25 LOC、L6)、\`match_at_level\` ヘルパー (~30 LOC、L4) もある。これらは後続レッスンで追加。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`Vec\` ではなく \`VecDeque\`?**
高速な push-back **と** 高速な pop-front の両方が必要だから。\`Vec::remove(0)\` は全要素を左にシフト — O(n)。\`VecDeque::pop_front()\` は O(1)。FIFO queue は常に \`VecDeque\` (または real ringbuffer) を使う — \`Vec\` を front から shift しない。

**Q: \`Reverse\` は内部で実際何をしている?**
\`Ord::cmp\` の方向を反転する。\`Reverse(a).cmp(&Reverse(b)) == b.cmp(&a)\`。それだけ。\`BTreeMap\` は sort 時に key の \`Ord\` impl を query する; key を \`Reverse\` でラップすると、\`BTreeMap\` は \`Reverse(higher)\` を \`Reverse(lower)\` より「小さい」と思い、それに従って walk する。

**Q: \`RestingOrder\` を単に \`Order\` にしたら?**
できる — だが \`side\` と \`order_type\` を無駄に運ぶ (side は既に map で分かる、resting Market order は矛盾)。Trim は小さいが、「resting Market order を construct できない」という **型レベル保証** が無料で手に入る。

**Q: なぜ BTreeMap field が private?**
caller が map を直接 modify すべきでなく、\`submit\` / \`cancel\` (L4+ / L6) を通すべきだから — それらが「空 queue を map に残さない」のような invariant を維持する。\`book.asks.insert(price, VecDeque::new())\` を呼べてしまうと、\`best_ask()\` が返す phantom な空 price level が作れる。Encapsulation がそれを防ぐ。

## 次のレッスン (L4)

データ構造が揃った。L4 はその上に最初の matching ロジックを乗せる — Limit Buy order の \`submit\`。Reader は ask を最安から walk し、limit 以下で match し、fill しなかった残りを rest する \`Buy\` ブランチを書く。Body ~60 LOC + L4-L5 両方で使う \`match_at_level\` ヘルパー。L4 後、最も一般的なシナリオ (limit buy が resting ask を cross する) で matching engine が real \`Fill\` を produce する。`,
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

このレッスンの終わりに:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…依然コンパイルする。\`Book\` が **Limit order** (Buy + Sell) を受け付け、real \`Fill\` を produce できる。Market order はまだ \`todo!()\` — L5。

書くもの:

- **\`submit()\`** — \`order.order_type\` に基づいて \`submit_limit\` または \`submit_market\` にルーティングする dispatch メソッド。
- **\`submit_limit()\`** — 本体: book の反対側を walk し、limit price に対して at-or-better でマッチし、fill しなかった残りを book に rest させる。
- **\`match_at_level()\`** — \`submit_limit\` (および L5 の \`submit_market\`) から呼ばれる private ヘルパー。単一 price level で実際の fill を行い、maker queue と taker の remaining quantity の両方を mutate する。

L4 後、\`book.rs\` は **~150 行**。Buy + Sell の Limit order が両方動く; Market はまだ \`todo!\` で panic する。

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

**order を入れる方法がない。** L4 がそこを直す。

## 計画

すべて \`crates/clob/src/book.rs\` に追加する 3 つ:

1. **\`submit()\` dispatcher** — \`OrderType\` に対する 1 つの \`match\`。Limit → \`submit_limit\`; Market → 今は \`todo!()\`。
2. **\`submit_limit()\` 本体** — 約 60 行。Buy は ask を昇順 walk、\`ask_price <= limit\` の間マッチ。Sell は bid を降順 walk、\`bid_price >= limit\` の間マッチ。Fill しなかった残りが book に rest する (\`RestingOrder\` として entry)。
3. **\`match_at_level()\` ヘルパー** — 約 25 行。Queue 先頭の maker を pop または shrink、1 つの \`Fill\` を返す、taker の \`remaining\` を mutate する。

これが **matching engine の大部分**。L5 で Market を追加する (Market は \`submit_limit\` から price check を除き、resting step を除いたもの)。L6 で cancel を追加。**Matching engine の core が本レッスン。**

> 🛑 **考えてみよう。** スクロールする前に: price 100 の Limit Buy order が ask を最安から walk する。Ask が \`{ Price(98): [O_a], Price(99): [O_b, O_c], Price(101): [O_d] }\` のようなとき。Buyer は 50 unit 買いたく、各 resting order は 30 unit。**Fill はどの順序で発生する? Trade 後の book の最終状態は?** ヒント: \`keys().next()\` から ask を walk し、満たされるか next level が limit を超えるまで各 level でマッチする。

(答え: fill は \`[Fill@98 で 30、Fill@99 で 20]\`。Trade 後、\`O_a\` は消える、\`O_b\` は 10 unit 残る、\`O_c\` は 30 unit のまま、\`O_d\` は 30 unit のまま。Buyer は limit より少なく払った (98 + 99 vs 100) — それが「at-or-better」ルール。)

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

本体 3 行。Dispatcher は意図的に小さい — matching ロジックはすべて \`submit_limit\` と (将来) \`submit_market\` に住む。**Dispatcher の唯一の仕事は型駆動のルーティング**、matching ではない。

\`todo!()\` がここでは正しい placeholder: Market order が submit されたら runtime で clear なメッセージで panic するが、コンパイルは clean。L5 で real な \`self.submit_market(order)\` 呼び出しに置き換える。

> 🛑 **やりがちな勘違い。** 「Submit() を 1 つの大きな match に matching ロジックを各 arm に入れてインラインで書けばいい?」 **そうすると \`submit_limit\` と \`submit_market\` が dispatcher の match arm の中に隠れる。** 2 つの効果: (1) public method \`submit\` が 100+ 行になり一目で読みづらい; (2) 各パスのテストが難しくなる (test は \`Book::submit\` を import するが、特定パスを exercise するために \`order_type\` を正しく設定した \`Order\` を construct する必要)。\`submit_limit\` / \`submit_market\` を named function として外に出すと addressable で testable になる。

### Step 2: \`submit_limit\` 本体を書き始める

\`submit()\` の下、依然 \`impl Book\` 内:

\`\`\`rust
    fn submit_limit(&mut self, order: Order, limit_price: Price) -> FillResult {
        let mut remaining = order.qty;
        let mut fills = Vec::new();

        match order.side {
            Side::Buy => {
                // Buy walks asks from cheapest; matches while ask <= limit.
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
                // Sell walks bids from highest; matches while bid >= limit.
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

1. **無限ループ、条件で break。** Exit は 3 つ: (a) taker が完全に fill、(b) この side で book が空、(c) 最安 ask が limit より高い。
2. **\`self.asks.keys().next().copied()\`** — 最安 ask 価格。\`&Price\` ではなく \`Price\` 値が欲しいので \`.copied()\`。
3. **\`if best_price > limit_price { break }\`** — at-or-better ルール。Ask に \`limit_price\` 以上は払わない。
4. **\`self.asks.get_mut(&best_price).expect(...)\`** — その価格の queue。**\`.expect\` は安全** — \`best_price\` を \`keys().next()\` から取ったばかりで、level は確実に存在する。Expect message が invariant を文書化する。
5. **\`match_at_level(&order, best_price, queue, &mut remaining)\`** — 実際のマッチを行う。次にこのヘルパーを書く; 今は \`Fill\` を返し、\`queue\` (maker が完全 fill なら pop) と \`remaining\` (fill 数量を引く) の両方を mutate することを知っておく。
6. **\`if queue.is_empty() { self.asks.remove(&best_price) }\`** — \`match_at_level\` が queue を空にしたなら、level を drop して \`best_ask()\` が \`depth_ask()\` と整合性を保つ。(空 queue を map に残すと、\`best_ask()\` がその level の価格を返すが order はそこにない。)

Sell ブランチは **構造的に同一** だが反転:
- \`asks\` ではなく \`bids\` を walk。
- key が \`Reverse<Price>\` なので \`best_rev.0\` で unwrap。
- 比較は \`best_price < limit_price\` (sell at-or-better = limit 以上で sell)。

**「構造的同一性」が load-bearing な観察。** Buy と Sell は互いの mirror image。両者とも反対側を best-first で walk; 両者とも price が limit をクリアする間マッチ; 両者とも空になった level を pop。違いは触る BTreeMap と比較の方向だけ。Buy ブランチが分かれば Sell ブランチも分かる。

> 🛑 **やりがちな勘違い。** 「Buy/Sell を parameterize して 1 度だけループを書けないか?」 **できる — だがコストに見合わない。** 完全 generic 版は BTreeMap (\`Reverse<Price>\` vs \`Price\`)、比較演算子 (\`>\` vs \`<\`)、key (\`bids\` vs \`asks\`) を抽象化する必要がある。節約は ~30 行の duplication、コストは Rust で最も敵対的な generic-bound パズルの 1 つ。**Duplication は安く、abstraction-budget は貴重。実際に勝つところに使う。**

### Step 3: rest-the-remainder ロジックを追加

上の matching loop は \`FillResult { fills, remaining_qty: Qty(0) }\` で終わる — これは placeholder。real な「remainder を rest させる」ロジックに置き換える:

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

1. **\`if remaining.0 > 0\`** — taker にまだ fill されていない quantity がある。Limit order ではその quantity が book に乗る (Market order は L5 で代わりに破棄する)。
2. **\`RestingOrder\` を construct** — side と order_type は落とす (どの map に push するかで encode される)、id + account + remaining qty を残す。
3. **\`self.bids.entry(Reverse(limit_price)).or_default().push_back(resting)\`** — Buy order の fill しなかった残り。\`entry\` + \`or_default\` は BTreeMap の「なければ insert、いずれにせよ mutable ref を取る」イディオム。\`Reverse(limit_price)\` が L3 で bids に選んだ key の形。
4. **\`self.asks.entry(limit_price).or_default().push_back(resting)\`** — Sell の対称形。
5. **\`FillResult { fills, remaining_qty: Qty(0) }\`** — caller にゼロ \`remaining_qty\` を返す。**これが L2 の \`FillResult\` doc が約束した load-bearing な意味論**: rest する Limit order は **ゼロ remaining と言う**。Remainder は book にあり、return 値の中ではない。
6. **両方のブランチ** (\`if\` と \`else\`) が \`Qty(0)\` remaining を返す。\`else\` ブランチは完全 fill ケース (taker が 100% マッチ; rest なし、remaining なし)。2 つのブランチは異なる理由で同じ return 値を produce する。

> 🛑 **やりがちな勘違い。** 「rest する Limit order がなぜ resting amount ではなく \`remaining_qty: Qty(0)\` を返す? Caller は book にいくら乗ったか知りたいかも」。 **\`FillResult\` は **matching** の結果で、book の状態ではないから。** Resting amount を知りたい caller は call 後に \`best_bid()\` や \`depth_bid()\` を query できる。「book が新しい resting liquidity をこれだけ受け取った」と「matcher が place できなかった taker quantity がこれだけ残った」を混同すると意味論が曖昧になる。**Return は何が起きたかを描く、book 状態は何があるかを描く。Separate concerns。**

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

これが **実際のマッチ** — real work を行う最小の関数。読む:

1. **\`queue.front_mut().expect(...)\`** — queue 先頭の maker。Time priority は最初に置かれた order が最初にマッチすることを意味する。\`submit_limit\` が level の存在を確認した後にしか \`match_at_level\` を呼ばないので \`expect\` は安全。
2. **\`fill_qty = min(maker.qty, remaining)\`** — 2 つの小さい方をマッチ。Maker が 30 unit で taker がまだ 50 必要なら fill は 30 (maker は完全消費)。Maker が 30 で taker が 10 だけ必要なら fill は 10 (maker は 20 残る)。
3. **\`Fill\` を build** — order ID 両方と account ID 両方を保存 (L2 の設計判断: self-contained Fills)。
4. **\`maker.qty.0 -= fill_qty.0\`** — maker を縮める。**これは RestingOrder 内なら安全だが Order 内ではおかしい mutation** (L3 の anti-fluency callout — RestingOrder はちょうどこの種の mutation を明示するために存在する)。
5. **\`remaining.0 -= fill_qty.0\`** — taker の outstanding quantity を縮める。Caller (\`submit_limit\`) が \`&mut Qty\` 引数経由でこれを見る。
6. **\`if maker.qty.0 == 0 { queue.pop_front() }\`** — maker が完全消費されたら pop する。\`submit_limit\` の outer loop の次の iteration がこの queue を再度 check する — 今空なら level 自体が drop される。

**なぜ Book のメソッドではなく free function?** \`self\` へのアクセスが不要だから。単一 queue (\`submit_limit\` が既に mutable ref を持っている) と単一 \`remaining\` counter にしか触らない。Free function にすることでその scope を反映: \`Book\` 全体は関与しない。

> 🛑 **やりがちな勘違い。** 「\`expect("empty queue")\` panic はリスキーに見える。Queue が **実際に** 空だったら?」 **関数は空 queue で呼ばれないはず — それが \`submit_limit\` の invariant。** 具体的には、\`submit_limit\` は \`keys().next()\` が \`Some(price)\` を返した後にしか \`match_at_level\` を呼ばない、それが level (そして queue) に少なくとも 1 要素あることを保証する。空 queue で \`match_at_level\` が呼ばれたなら、それは \`submit_limit\` のバグ、\`match_at_level\` のバグではない — そして \`expect\` がバグを clear なメッセージ付きの panic として surface する、\`Option::None\` のサイレント伝播ではなく。**内部 invariant を信頼する; \`expect\` で assert する。**

## テスト

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

クリーンにコンパイルするはず。L3 の unused-import warning (\`Fill\`、\`FillResult\`、\`Order\`、\`OrderType\`、\`Qty\`、\`Side\`) は今消えるはず — \`submit_limit\` と \`match_at_level\` がすべてを使う。

Matching ロジックをサニティチェックするためのテストはまだない (L7-L8)、\`src/lib.rs\` に一時的に書ける:

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

**L5 に進む前にこの smoke test を削除する** — real なテストスイートは L7-L8 で proper な hand-trace シナリオ + proptest と共に来る。上の smoke test は L4 がコンパイルして **走る** ことを verify するためだけ。L5 のために \`src/lib.rs\` を clean に保つ。

よくあるエラーと対処:

- **\`error: 'Buy' branch panics with 'todo!()' but I selected Limit not Market\`** — \`submit\` dispatcher の \`OrderType::Limit\` arm に draft 状態の \`todo!()\` が残っている。Step 1 を再確認; Limit arm は \`self.submit_limit(order, price)\` を呼ぶべき。
- **\`error[E0596]: cannot borrow 'maker' as mutable... requires Copy\`** — \`front_mut()\` は \`Option<&mut T>\` を返す、\`Option<T>\` ではない。\`let maker = queue.front_mut().expect(...).clone()\` と書くと、maker の \`Copy\` で作業して mutation が persist しない。参照を直接使う: \`let maker = queue.front_mut().expect(...)\`。
- **\`error: cannot find value 'asks' in scope\`** in match_at_level — \`match_at_level\` は free function で Book メソッドではない。\`self\` がない。代わりにパラメータ (\`queue\`、\`remaining\`) を使う。
- **Smoke test が \`depth_bid: 0\` を報告** — rest-the-remainder ロジックが bids に push しなかった。Step 3 を再確認、特に \`Reverse(limit_price)\` key wrap (\`Reverse\` を忘れると unwrapped-Price entry に push され、\`best_bid\` の \`Reverse\`-keyed lookup で見つからない)。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Buy と Sell は構造的 mirror。** Buy ブランチは ask を昇順 walk; Sell ブランチは bid を降順 walk。Generics で abstract しようとしなかった — duplication が abstraction tax より安かった。**構造的に同一な 2 関数は 1 つの完全 generic 関数より読みやすい。**

2. **\`match_at_level\` は free function、method ではない。** \`self\` 不要。Free function にすることで、book 全体ではなく caller が既に extract したデータ (queue + remaining) に対して動作することを文書化する。**関数 signature が文書: scope を name する。**

3. **Resting Limit order の \`remaining_qty: Qty(0)\` は意図的。** Caller は「これだけマッチした; 私には残りなし」と見る。Resting remainder について知りたければ \`best_bid\` / \`depth_bid\` で book に query する — book-state メソッド。**Return 値は call で起きたことを描く; book 状態は何があるかを描く。混ぜない。**

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

**Q: なぜ \`match_at_level\` の \`taker\` は \`&Order\` 参照だが \`queue\` は \`&mut VecDeque<RestingOrder>\`?**
\`match_at_level\` は \`taker\` から read する (\`Fill\` に field を copy するだけ) が \`queue\` に write する (先頭要素を pop または shrink) から。関数 signature が使用法を反映: read-only に \`&\`、mutating に \`&mut\`。Compiler が強制する — 参照型が許さないので \`taker\` を偶発的に mutate できない。

**Q: 価格 level が存在するが queue が空だったらどうなる?**
それはバグ。Invariant は「map の各 key は非空 queue に対応する」。\`submit_limit\` がこれを各 match 後に \`if queue.is_empty() { self.asks.remove(&best_price) }\` で強制する — なので空 queue が残ることはない。空 queue を見たら、queue を mutate した後で空 check しなかった場所を探す。

**Q: \`BTreeMap::pop_first()\` を使って best level を 1 回の呼び出しで取得 + 削除しないのは?**
2 つの理由。(1) \`pop_first\` は無条件で level を削除するが、いつもそうしたいわけではない — マッチ後に level に order が残ることがある (maker が部分 fill、他が後ろに並ぶ)。(2) \`pop_first\` は Rust 1.66 で stabilize されたが、\`get_mut\` + 条件付き \`remove\` のマッチパターンが「いくらか消費、もしかしたら level drop」のフローには自然に読める。

**Q: 「taker が maker をぴったりマッチ」のための fast path はある?**
ない、必要もない。General path (\`min(maker.qty, remaining)\` + shrink-or-pop) が「exact match」を general の特殊ケースとして扱う。Special-case branch を追加すると test 対象のコードパスが増え、性能向上は marginal; 性能が重要なら profile が先。

## 次のレッスン (L5)

Limit order が動く。**Market order はまだ \`todo!()\`。** L5 で matching engine を完成させる:
- \`submit()\` 内の \`todo!()\` を \`self.submit_market(order)\` に置き換え
- \`submit_market()\` を書く — \`submit_limit\` から **price check なし** (Market は任意の価格を取る) かつ **remainder を rest させない** (Market は残りを破棄)。

L5 は L4 より短い、大部分の作業 (\`match_at_level\`、dispatcher) が済んでいる。L5 終了時に両方の order type で動く完全な matching engine がある。`,
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

このレッスンの終わりに:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…依然コンパイルし、\`submit()\` dispatcher が Market order で panic しない。書くもの:

- **\`submit_market()\`** — Market order の matcher。L4 の \`submit_limit\` と構造的に同じだが、**2 つの key な差**:
  1. **Price check なし** — Market order は任意の価格で取る。
  2. **rest-the-remainder なし** — Market order はマッチしなかった quantity を破棄; 残りは \`FillResult::remaining_qty\` で返る。
- **\`submit()\` dispatcher を更新** — L4 の \`todo!("Market orders land in L5")\` を \`self.submit_market(order)\` に置き換える。

L5 後、matching engine は **完成**。Limit と Market の両方が real fill を produce する。L6 で \`cancel\` を追加; L7-L8 で engine の invariant が成り立つことを証明するテストスイートを追加。

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
    // ~60 行: 反対側を walk、at-or-better でマッチ、remainder を rest
}

fn match_at_level(taker: &Order, price: Price, ...) -> Fill { ... }
\`\`\`

\`book.submit(market_order)\` を呼ぶと \`todo!\` で panic する。L5 がそれを直す。

## 計画

\`crates/clob/src/book.rs\` への 2 つの変更:

1. **\`submit_market()\` を追加** — \`submit_limit()\` の下に。Buy/Sell の 2 ブランチ、それぞれ \`submit_limit\` のループとほぼ同じだが limit-price 比較 **なし**。
2. **\`submit()\` を編集** — panic ではなく \`submit_market\` に dispatch する。

新規型なし、新規ヘルパーなし。L4 の \`match_at_level\` をそのまま再利用。

レッスンが短いのは **L5 が L4 の大部分の作業の後に残ったもの** だから。構造パターンは同じ; 違いが「market order」が「limit order」と semantic にどう違うかを作る。

> 🛑 **考えてみよう。** スクロールする前に: ask が \`{ Price(100): [O_a (30 units)] }\` で、50 unit の Market buy が arrive したとする。Fill は何で、\`FillResult::remaining_qty\` には何が入る? 対比: 同じ開始 book、ただし price 100 で 50 unit の Limit buy。**残り 20 unit は各ケースでどこに行く?**

(答え: Market ケース → fill \`[30 @ 100]\`、\`remaining_qty = 20\` (fill しなかった部分は破棄 — caller には見えるが book に乗らない)。Limit ケース → fill \`[30 @ 100]\`、\`remaining_qty = 0\` (20 unit が price 100 の新規 bid として book に rest)。**同じ fill、leftover の運命が違う。**)

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

| 何 | \`submit_limit\` | \`submit_market\` |
| - | - | - |
| Loop 内の price check | \`if best_price > limit_price { break }\` (Buy) | **なし** — 任意の価格で取る |
| Loop 内の price check | \`if best_price < limit_price { break }\` (Sell) | **なし** — 任意の価格で取る |
| Loop 後の rest-the-remainder | \`if remaining.0 > 0 { ... push_back(resting) ... }\` | **なし** — leftover は破棄 |
| Return の \`remaining_qty\` | 常に \`Qty(0)\` (rested または完全 fill) | \`remaining\` (matching 後に残ったもの) |

差分の全部。**Loop の形は同じ、check 2 個削除、return 値 1 個変更。**

> 🛑 **やりがちな勘違い。** 「Market Buy に \`limit_price = Price(u64::MAX)\`、Market Sell に \`Price(0)\` で \`submit_limit\` を呼べば?」 **price-check elimination には効くが、rest-the-remainder ロジックを排除しない。** \`u64::MAX\` limit の Market order は依然として fill しなかった qty を \`u64::MAX\` で rest しようとする — 最高可能価格で phantom resting bid を作る。挙動が間違う: 完全 fill しなかった Market buy が \`u64::MAX\` 価格の bid を book に置き、それが入ってくる sell を即座にマッチする。**2 つの関数、2 つの意味論、別々に保つ。**

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

\`todo!\` を real call に置き換える:

\`\`\`rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => self.submit_market(order),
    }
}
\`\`\`

1 行変更。Dispatcher の役割は広がっていない — 依然「型駆動のルーティング、arm ごとに 1 行」。実装は専用 method に住む。

## テスト

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

Clean。Unused function の warning なし (\`book.rs\` で宣言された全関数に少なくとも 1 caller がいる — \`submit_market\` は \`submit\` から呼ばれ、private \`submit_*\` methods は \`Book\` 内から呼ばれ、\`match_at_level\` は両 submit から呼ばれる)。

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

\`cargo test -p openhl-clob smoke\` で走らせる。両方 pass するはず。**それから smoke module を削除する** — L7-L8 に real なテストスイート。

2 つの smoke test の対比は L5 のレッスン本質の minicapsule: **matching 後に残ったものは fill が produce されたかどうかに関わらず破棄される**。Market order 後の book 状態は、消費された liquidity を引いた book 状態そのもの — resting order が追加されない。

よくあるエラーと対処:

- **Smoke test が \`Qty(20)\` でなく \`result.remaining_qty == Qty(0)\` を報告** — \`submit_market\` の final \`FillResult\` が \`remaining_qty: Qty(0)\` (\`submit_limit\` から copy-paste した可能性)。\`remaining_qty: remaining\` — 実際の leftover quantity であるべき。
- **Market Buy 後に \`book.best_bid()\` が \`Some(price)\` を返す** — \`submit_market\` が \`submit_limit\` の rest-the-remainder ブランチに当たっている。Loop が共有コードに fall through した。\`submit_market\` が自分の final \`FillResult\` を持つ自分の関数であることを確認 — 共有「rest」ロジックなし。
- **\`error: cannot find function 'submit_market' in '&mut Book'\`** — \`submit()\` dispatcher の typo。Method は \`self\` に対して \`self.submit_market(order)\`。
- **間違ったパスでの \`warning: unused variable: remaining\`** — \`FillResult\` で \`remaining: remaining,\` ではなく \`let remaining_qty = ...\` と書いた可能性。Field 名が \`remaining_qty\`、local 変数が \`remaining\` (\`FillResult { fills, remaining_qty: remaining }\`)。

## 設計の振り返り

3 つの load-bearing な決定:

1. **\`submit_limit\` と \`submit_market\` は別々の関数、parameterize しない。** Loop が 80% 同一でも、semantic な差 (leftover が rest するか破棄されるか?) は **欠けている** コードにある、そこにある コードではない。Parameterize すると \`rest_remainder: bool\` や \`enforce_price: bool\` のような boolean flag が必要 — 関数本体が branchy なパズルになる。**明確な分離が 2 つの意味論を独立に読みやすくする。**

2. **\`FillResult::remaining_qty\` は order type で意味が違う。** Limit には常に \`Qty(0)\` (rested または完全 match)。Market には実際の unfilled 残り。**型は同じ、契約は違う。** これが OK なのは \`FillResult\` の field doc (L2) が両方の解釈を明示的に named するから。

3. **空 book の Market order はエラーではなく clean に返る。** 空 asks book に対する Market buy は \`FillResult { fills: vec![], remaining_qty: order.qty }\` を返す。エラーなし。これが正しいデフォルト: caller がマッチを依頼、できるだけ (0) マッチ、leftover を報告。**「何も起きなかった」は valid な結果であるべき、エラーではなく。**

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
本番 matching engine ではよくある: thin な market が open し、fill 間で orderbook が一時的に空になり、Market order が arrive する。正しい挙動は「0 fill を produce、full remainder を報告、caller が何をするか決める」。Caller が後で retry、Limit に切り替え、ユーザーにエラーを surface — だが matching engine 自体は決めない。

**Q: Market に自分の price がないのに、なぜ maker の resting price を使う?**
Fill 価格は常に **resting** order の価格 (maker の)。Market order は price を supply しない; book がオファーするものを受け入れる。**「価格発見」が market を market にする** — buyer が price を決めるのではなく、best bid と best ask のスプレッドが決める。

**Q: Market order がゼロ quantity の Fill を produce できる?**
できない。\`match_at_level\` は \`fill_qty = min(maker.qty, remaining)\` を計算する。これがゼロになるには、\`maker.qty\` か \`remaining\` のどちらかがゼロでなければならない。両方の invariant が維持される: \`submit_market\` は \`remaining == 0\` の瞬間 loop を抜ける、maker queue は zero-qty resting order を持たない (matching コードが qty を縮め、ゼロに当たったら maker を pop する)。なので \`match_at_level\` は両方がゼロで呼ばれない。

**Q: 複数 price level に対する partial fill は?**
Market order はこれを自然に扱う。Ask \`{99: [30 units], 100: [30 units], 101: [50 units]}\` に対する 100-unit Market buy は 3 つの fill を produce する (30 @ 99、30 @ 100、40 @ 101)。Loop の各 iteration が next-best level の front に対して \`match_at_level\` を呼ぶ; \`remaining == 0\` または book が枯渇するまで loop が続く。**multiple-level を walk する挙動は crossing Limit order と同じ。**

## 次のレッスン (L6)

Matching engine は **submit** を扱う。まだ **cancel** を扱えない — fill される前に自分の resting order を削除したいユーザーが何もできない。L6 で \`cancel(order_id) -> bool\` を追加する:

- bids と asks の両方を linear scan して order を見つける。
- 今は O(n)、n は総 resting order 数。O(1) index 追加の議論は openhl の later stage で。
- 重要: cancel が level を空にしたら drop する (\`submit\` が \`if queue.is_empty() { self.asks.remove(...) }\` で維持する同じ invariant)。`,
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

このレッスンの終わりに:

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

…依然コンパイルする。\`Book\` に新規メソッド 1 個:

- **\`cancel(&mut self, order_id: OrderId) -> bool\`** — bid と ask の両側で指定 id の order を検索、見つかれば削除、cancellation で level が空になれば level を drop。削除したら \`true\`、見つからなければ \`false\` を返す。

約 25 LOC。興味深いイディオムは **\`BTreeMap::retain\`** — map の全 queue を 1 回 traverse し、条件付きで mutate し、closure が \`false\` を返した entry を drop する単一呼び出し。「order 削除」と「空 level drop」の両ステップを 1 pass で扱う。

L6 後、matching engine は **機能的に完成**。Submit (Limit + Market) + cancel = v0 のフル表面。L7 がテストスイートを開始する。

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

足りないもの: resting order を **削除** する方法。ユーザーが Limit Buy at 100 を submit して book に rest した場合、今のところそれを取り外す方法がない。L6 でそれを追加する。

## 計画

1 method、1 file。\`crates/clob/src/book.rs\` で、既存の \`impl Book\` block に \`cancel\` を追加:

1. **bid から検索** — \`BTreeMap::retain\` の closure が queue から該当 order を削除し、queue が空でないか報告。
2. **bid で見つかれば** 即座に \`true\` を返す。
3. **そうでなければ ask を同じ方法で検索**。
4. **\`found\` を返す** (ask で見つかれば true、どこにも見つからなければ false)。

トリックは \`retain\`。同じ closure で **2 つの仕事** をする:

- **Queue を mutate** (id が一致する order を削除)。
- **BTreeMap entry を drop するか signal** (\`!queue.is_empty()\` を返す)。

\`retain\` は各 (key, value) pair で closure を呼び、closure が \`false\` を返したら pair を削除する。Queue-mutation と空 check return を組み合わせることで、「削除 + 空 level cleanup」invariant が無料で得られる。

> 🛑 **考えてみよう。** スクロールする前に: ユーザーが price 100 で 50 unit の Limit Buy を submit (完全 rest)、それからその order id で Cancel を submit。Cancel 後、**\`best_bid()\` は何を返すべきか?** ヒント: cancellation 後にその price level が map にまだ存在するかを考える。

(答え: \`None\`。order が price 100 の唯一だったので、cancel すると queue が空になり、\`retain\` が level を map から drop し、\`bids.keys().next()\` が \`None\` を返し、\`best_bid()\` が \`None\` を返す。**空 level cleanup が \`best_bid\` を「実際に liquidity が存在するか」について正直に保つ。**)

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
2. **\`self.bids.retain(|_, queue| { ... })\`** — \`retain\` がすべての (\`Reverse<Price>\`, \`VecDeque<RestingOrder>\`) pair を walk する。Closure が \`queue\` を mutate して \`bool\` を返す: \`false\` なら entry を drop、\`true\` なら保持。
3. **\`if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id)\`** — まだ見つけていない場合のみ検索。\`iter().position()\` は \`Option<usize>\` を返す — 述語に一致する最初の要素の index。\`if let\` と組み合わせるのが「index が存在すれば何かする」の Rust 慣用イディオム。
4. **\`queue.remove(pos)\`** — \`VecDeque::remove(index)\` がその index の要素を取り出す。\`Option<T>\` (削除された要素) を返すが、ここでは無視。**\`VecDeque::remove\` は O(n)** — 後続要素を 1 slot 左にシフトする。数百 order の queue ならマイクロ秒オーダー。
5. **\`found = true\`** — flag を立てて以降の level がスキャンされないようにする。**これが load-bearing な最適化** — order が見つかった後も、残りの level を walk する (以前の cancellation で残った空 queue を check するため) が、残りの各 queue 内の linear scan はスキップ。
6. **\`!queue.is_empty()\`** — return 値。Queue が今空 (最後の order を削除したばかり、または他の理由で空) なら \`false\` を返して \`retain\` に entry を drop させる。そうでなければ \`true\` を返して保持。
7. **\`if found { return true }\`** — short-circuit。bid で既に見つけて削除したら、ask を検索する必要なし。
8. **\`self.asks.retain(...)\`** — ask に対する同じロジック。Closure 本体は同一 (key の違いなし — 両 map とも \`VecDeque<RestingOrder>\` を value にする)。
9. **\`found\`** — 最終 return。bid で見つかれば既に \`true\` を return 済み、ask で見つかれば \`found\` が \`true\` になりそれを返す、どちらでもなければ \`found\` は \`false\` のまま。

> 🛑 **やりがちな勘違い。** 「BTreeMap を iterate して entry を見つけて order を削除、それからもう一度 iterate して空 level を drop すればいい」。 **2 pass は無駄、さらに悪いことに invariant が 2 箇所に分かれる。** \`retain\` なら「order 削除」と「空 level drop」の決定が両方 1 closure に encode される。「order を削除した」と「level が空かを check した」の間にデータ構造が inconsistent な状態の窓がない。**1 closure、2 仕事、1 invariant。**

### Step 2: 新規 method が両 branch を通ることを verify

\`cargo check -p openhl-clob\` がクリーンにコンパイルするはず。警告なし。

以前のレッスンからの unused-import warning は全部消えるはず — \`cancel\` は新規 import を導入しない (使うもの全部、\`OrderId\` + \`VecDeque::remove\` + BTreeMap 表面、既に scope 内)。

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

同じ挙動、2 行余分、\`let && let\` chain なし。

## テスト

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

Clean。Matching engine が機能的に完成 — \`book.rs\` に \`new\`、4 つの accessor、\`submit\` (Limit と Market 両 path)、\`cancel\`。\`todo!()\` が残らない。

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

\`cargo test -p openhl-clob smoke\`。3 つすべて pass するはず。**それから smoke module を削除する** — L7 が real なテストスイートを持つ。

よくあるエラーと対処:

- **\`error: 'retain' has no method named 'retain' on BTreeMap<...>\`** — typo か wrong version。\`BTreeMap::retain\` は Rust 1.53 から stable。\`rustc --version\` を check。
- **\`error: 'position' has no method named 'position'\`** — \`iter().position()\` は \`Iterator\` trait のメソッド、\`std\` で default scope 内。\`queue.position(|o| ...)\` (\`iter()\` なし) と書いたなら compile しない。\`queue.iter().position(...)\` を使う。
- **Cancel が true を返すが \`best_bid()\` がまだ cancel された order の price を見せる** — \`retain\` closure が \`!queue.is_empty()\` を正しく返していない。多分 \`true\` を無条件で返している。Closure 本体の最後の式を check。
- **\`cancel\` が間違った order を削除** — \`position\` 述語が間違った field を check している。比較は \`o.id == order_id\` (OrderId でマッチ) であるべき、\`o.account == order_id\` などではない。

## 設計の振り返り

3 つの load-bearing な決定:

1. **「削除 + cleanup」を \`retain\` で組み合わせる。** 2 つの別操作が 1 closure pass で完了: queue を mutate し、entry を drop するか決める。これが \`retain\` の正確なユースケース。代替 (iterate-then-cleanup、または \`BTreeMap::iter_mut\` + 手動で空 key 収集) は invariant をより多くのコードに分散させる。**自分の操作に正確に一致するメソッドが存在すれば、それを使う。**

2. **O(n) linear scan は v0 で fine。** 本番取引所は何千、何万の resting order を持つ。v0 openhl で数百なら scan はマイクロ秒。\`HashMap<OrderId, (Side, Price)>\` index を追加すれば cancel は O(1) になるが、加わるもの: BTreeMap と同期を保つ second data structure、追加メモリ、追加 cache pressure。**Profile に出てこないものは最適化しない。** openhl が v0 scale を超えたら index を追加; それまでは scan が正しい形。

3. **Cancel は \`bool\` を返す、\`Option<RestingOrder>\` や \`Result<(), CancelError>\` ではない。** 削除した order を返すと \`RestingOrder\` を expose する (L3 で意図的に private 型にした)。\`Result\` を返すと caller に「見つからない」ケースを error として handle させる — が cancellation の冪等性は機能でありバグではない (cancel を 2 回呼ぶのは安全であるべき)。\`bool\` が「仕事をしたかしなかったか」をクリーンに言う、内部を漏らさず error-handling を強制せず。**何が起きたかについて正直な最小の return 形を選ぶ。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
\`\`\`

L6 後、\`book.rs\` は \`55a9dff\` の参照と **機能的に同一**。残る違いは doc コメント / 空白と末尾のテストモジュール — L7-L8 で参照が持つ 9 unit test + 3 proptest invariant を追加する。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`retain\` で空 level を cleanup しないコストは?**
最終的に \`best_bid()\` が、その level に order が存在しないのに価格を返す。それから「best」をわずかに下回る Sell limit が phantom 価格でマッチし、ゼロ quantity に対して fill し (\`match_at_level\` が奇妙に handle する)、engine の invariant が drift する。空 level cleanup は \`submit\` が既に維持している invariant; \`cancel\` も維持する必要がある。

**Q: closure 内の \`if !found &&\` ガードが必要なのはなぜ?**
これがないと、\`retain\` が見つけて以前の level から削除した後も全 level をスキャンする。マッチは最大 1 回 (order は \`OrderId\` で unique)、なので \`found\` flag は correctness fix というより最適化。だが: 最初のマッチで \`found = true\` を設定すると、以降の level が \`iter().position()\` 呼び出しをスキップ、それが各 level の O(k) 仕事。**Early-out による最適化。**

**Q: 2 つの異なる order が同じ \`OrderId\` を持っていたら?**
\`cancel\` は最初に見つけた方を削除する (probably bid から、先に scan されるから)。Matching engine は book 内で \`OrderId\` が unique と仮定する — caller の責任。L1 の newtype + \`pub u64\` field 設計が caller の仕事にしている: caller が ID を構築し、unique 性を owns する。

**Q: 各 VecDeque で \`position\` を使い、\`(Reverse<Price>, position)\` を得て、\`retain\` の外で削除すれば?**
Position を見つけるために BTreeMap を immutably borrow し、削除するために mutably borrow する必要がある。Rust の borrow checker は position の \`clone()\` なしでそれを拒否する。\`retain\` アプローチが mutable borrow を全期間保持する — シンプル。

## 次のレッスン (L7)

Matching engine がコンパイルする。**できないこと**: 動くことを証明する。L7 がテストモジュールを開始する — 期待するシナリオをカバーする hand-trace された unit test 9 個: 空 book マッチング、price level 内の FIFO time priority、market order の liquidity 枯渇、複数 price level にわたる partial fill、cancel + 再 submit、マッチ後の no-crossed-book invariant。各 test が engine の 1 つの specific path を walk する; 合わせて、これまで build した matching ロジックの regression suite になる。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
