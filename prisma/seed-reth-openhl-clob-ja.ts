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
      duration: 40,
      xpReward: 110,
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
              ],
            },
          },
        ],
      },
    },
  });
}
