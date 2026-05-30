// hand-written (NOT auto-generated): building-openhl-clob の概念ファースト版コース。
// 散文（WHY）は圧縮し、学習者が copy-paste して走らせる実行物（型定義・関数本体・全テスト）は完全に保つ。

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlClobV3JA(prisma: PrismaClient) {
  const tags = ["reth", "malachite", "clob", "matching-engine", "evm", "l1", "openhl", "expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-clob-v3-ja",
      title: "Step 2. CLOB — マッチングエンジンの追加とステートマシンの統合",
      description:
        "前層で組み上げたコンセンサス・サブストレート上に、Price-Time Priority 準拠のマッチングエンジンを実装する。CLOB を決定論的な純粋ステートマシン（Pure State Machine）として設計し、その約定イベント（fill）をブリッジを介してコンセンサス側でコミットされたブロックへと結合する。「DIY Perp シリーズ」の第2ステップ。コアとなる取引実行レーンを自作する。",
      difficulty: "EXPERT",
      duration: 365,
      xpReward: 800,
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
                  title: "レッスン0 — OpenHL CLOB を作る（Reth 基盤の上に matching engine を載せる）",
                  slug: "openhl-clob-orientation-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# レッスン0 — OpenHL CLOB を作る（Reth 基盤の上に matching engine を載せる）

## 問い

前コース（Consensus）は実 Reth EVM を通じて 0.02 秒で block を確定する chain で終わった。だが確定していたのは **空の block** — トランザクションもマッチングも価格発見もない。どうやって約定（取引）を生成し、それを committed block に流すか？

## 原理（最小モデル）

- **CLOB（Central Limit Order Book）= price-time-priority の matching engine。** 価格優先・時間優先で板を管理し、「HYPE を 25 USD で 10 buy」と「25 USD で 5 sell」を実際の約定（fill）に変換する。Hyperliquid の核となる仕組み。
- **pure state machine — I/O なし、完全に deterministic。** マイクロ秒で走り、同じ入力列から必ず同じ約定列を生む。これが consensus に載せられる前提。
- **約定は bridge 経由で payload に流す。** matching engine が生成した fill を \`LiveRethEvmBridge::build_payload\` が拾い、consensus が commit する block に運ぶ。
- **スコープは 2 段（openhl の Stage 名）。** Stage 8a = CLOB 本体（pure state machine）、Stage 8d = それを bridge に接続し payload へ約定を流す段。本コースはこの 2 つを再現する。

## 具体例

\`\`\`
maker: HYPE 25 USD で 5 sell（先に book に置かれた resting order）
taker: HYPE 25 USD で 10 buy（その流動性を消費する incoming order）
   ↓ matching engine
Fill { price: 25, qty: 5 }（taker の残り 5 は book に resting）
\`\`\`

ゴールは \`cargo test clob_fills_flow_into_payload\` — 実際の約定が matching engine → \`build_payload\` → payload に流れ、consensus が commit する。

## 失敗例（誤解）

「\`psyto/openhl\` を clone してそのコードベースで進めればいい」は誤り。本コースは build-along — matching engine を \`my-openhl/\` でゼロから書き、reference に diff する。reference から start すると「答え合わせを写経する」モードに逆戻りし、摩擦から得られる学び（逆順 bid / FIFO / cancel-then-cleanup invariant）を取りこぼす。

---

ここまでで「CLOB は何で、なぜ pure state machine か」は着地した。ここから先はスコープ・前提・13レッスンのロードマップに入る。L1 以降は実際に Rust を書く。

> 🛑 **セルフチェック。** 次に進む前に 1 文で言えるか：本コースが Consensus になかった何を追加するのか？ 答えに「約定を生成する matching engine、その約定が committed block に流れる」が入らなければ、下の「終了時に手にするもの」を読み直す。

## 終了時に手にするもの

新規 \`crates/clob/\` crate:
- マイクロ秒で走る price-time-priority matching engine（pure state machine、I/O なし、deterministic）
- \`Book\` + \`Order\` + \`Fill\` 型（CEX が「order book」と呼ぶものに対応）
- テスト 12 個合格: hand-trace シナリオ 9 個（空 book / FIFO 優先 / market order の流動性枯渇 / partial 約定 / cancel / マッチ後の no-crossed-book）+ proptest invariant 3 個（256 ケース × 3 = 768 ランダムシナリオ — quantity conservation / no-crossed-book always / determinism = replayability）

加えて \`crates/evm/\` に integration test \`clob_fills_flow_into_payload\` — 実 Reth node を bootstrap し、bridge の CLOB に maker bid + crossing taker sell を submit、結果の約定が次の \`build_payload\` 出力に現れることを assert、かつ **過去の payload に遡って約定が attach されない**（drain は forward-only）ことを assert。

## 終了時にも手にしないもの（意図的な scope cut）

- custom EVM precompile（CLOB state を read/write、= Step 3）
- funding rate state machine（= Step 4）
- 約定を EVM-executable トランザクションとして encode（openhl の Stage 9 より先）
- liquidation / mark-vs-index pricing / レバレッジ上限

約定は生成され committed block に運ばれるが、まだ parallel list — スマートコントラクトから読める Ethereum トランザクションではない。それを足すのが Step 3。

## 前提

- **Consensus（Step 1）完了** — \`crates/evm/src/live_node.rs\` に \`LiveRethEvmBridge<P>\`（\`provider\` / \`chain_spec\` / \`validator\` / optional \`engine_handle\`）が存在すること。
- Rust 1.95+（\`rust-toolchain.toml\` で pin 済み）。
- \`BTreeMap\` / \`VecDeque\` / \`Reverse<T>\` / proptest に慣れていること（「最高値から辿る reverse-ordering trick」が初耳なら \`std::collections::BTreeMap\` の doc を一読）。

不要: matching-engine 経験 / order book 読解スキル / multi-validator（引き続き single-validator）。

## セットアップ確認（今やる）

\`\`\`bash
cd ~/code/openhl-reference
git fetch origin
git log --oneline | grep -E "(55a9dff|428cc26)"   # Stage 8a / 8d の SHA が見えるはず

cd ~/code/my-openhl
cargo test -p openhl-evm --release 2>&1 | tail -10
# 期待: reth_dev_node_bootstraps / live_bridge_builds_on_real_genesis /
#       commit_sends_forkchoice_to_engine_when_handle_installed が pass
\`\`\`

これらが pass すれば start point として正しい。pass しなければ先に Consensus（Step 1）を完了させる。

## 13レッスンのロードマップ

| # | build するもの | 終了時テスト |
| - | - | - |
| 0 | Orientation（本レッスン） | セットアップ確認 |
| 1 | CLOB newtype（\`AccountId\`/\`OrderId\`/\`Price\`/\`Qty\`/\`Side\`/\`OrderType\`） | \`cargo check -p openhl-clob\` |
| 2 | \`Order\` / \`Fill\` / \`FillResult\` | 型がコンパイル |
| 3 | \`Book\` struct + \`Reverse<Price>\` trick | \`cargo check -p openhl-clob\` |
| 4 | \`submit_order\` — Limit order、in-book matching | resting order とマッチ |
| 5 | \`submit_order\` — Market order + crossing + partial | エッジケース挙動 |
| 6 | \`cancel\` + 空 level の cleanup | cancel-by-id が動く |
| 7 | hand-trace unit test 9 個 | 9 個 pass |
| 8 | proptest invariant 3 個 | 768 ランダムシナリオ pass |
| 9 | \`LiveRethEvmBridge\` に \`clob\` + \`pending_fills\` + \`submit_order\` | bridge がコンパイル |
| 10 | \`build_payload\` が pending fill を drain | 約定が payload に現れる |
| 11 | \`clob_fills_flow_into_payload\` integration test | **フルパイプライン pass** |
| 12 | Capstone | （振り返り） |

**レッスン11 がマイルストーン** — matching engine の約定が BFT engine を通って実 block に流れる。レッスン12 で「まだ何が足りないか（約定がスマートコントラクトから読めない = Step 3）」を明示する。

## 答え合わせの規律

各レッスン（1〜11）は SHA \`55a9dff\`（Stage 8a）または \`428cc26\`（Stage 8d）を cite する。テストが pass した後:

\`\`\`bash
cd ~/code/openhl-reference
git checkout 55a9dff    # レッスン 9〜11 では 428cc26
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
\`\`\`

本質（型・制御フロー）が一致していればよい。空白・命名は違って OK。

## 合格基準

- \`cargo test clob_fills_flow_into_payload\` を通せる（コース完走時）。
- CLOB の price-time-priority を説明できる。
- maker / taker と、約定を buffer する matching engine と同期 emit する engine のトレードオフを推論できる。

## まとめ（3行）

- CLOB は price-time-priority の pure state machine — deterministic だから consensus に載せられる。
- 約定（fill）を生成し、bridge 経由で \`build_payload\` から committed block に流す。
- 本コースは Stage 8a（CLOB 本体）+ 8d（bridge 接続）。約定の EVM 実行可能化（precompile）は Step 3。`,
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
                  title: "レッスン1 — CLOB の newtype、Side、OrderType",
                  slug: "openhl-clob-types-newtype-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 60,
                  content: `# レッスン1 — CLOB の newtype、\`Side\`、\`OrderType\`

## 問い

CLOB の基本型をどう設計すれば、引数の取り違えバグを「実行時に静かに誤計上される問題」から「コンパイルエラー」へ格上げできるか？ そして金銭計算をどう厳密整数に保つか？

## 原理（最小モデル）

- **型安全性としての newtype。** \`u64\` を \`AccountId\` / \`OrderId\` / \`Price\` / \`Qty\` で包む。\`(u64, u64, u64)\` を取る関数は引数を間違った順序で呼んでもコンパイルが通るが、newtype なら compiler が拒否する。
- **金銭は整数のみ。** \`Price\` / \`Qty\` は \`u64\` ベース、\`f64\` 禁止。float 中間値が紛れ込めば engine の厳密整数 invariant（例「約定は数量を保存する」）が一発で壊れる。
- **struct スタイルの enum variant。** \`OrderType::Limit { price }\` は \`Limit(Price)\` より、全 pattern match 箇所で意図が読める（位置でなく field に名前がある）。
- **field-level 型を先に確定。** atomic な型はここで固め、record 型（\`Order\` / \`Fill\`）はレッスン2 でその上に積む。

## 具体例

\`\`\`rust
submit(book, account: u64, price: u64, qty: u64)   // 引数を取り違えても compile が通る ✗
submit(book, AccountId, Price, Qty)                // 間違った型は compile error ✓
\`\`\`

## 失敗例（誤解）

「便利だから \`Price::from_dollars(f64)\` を足す」は誤り — f64 の精度問題を engine に持ち込む。表示用の dollar 変換はツール側の境界でやり、engine には integer-typed Price を渡す。「side を \`bool\` で」も誤り — \`submit_order(order, true)\` は call site で意味が消える（\`Side::Buy\` なら一目瞭然）。

---

ここまでで「なぜ newtype + integer + struct enum か」は着地した。ここから \`crates/clob/\` を作る。コードは完全形。

> 🛑 **予測。** 同じ \`u64\` を wrap する newtype 4 個（\`AccountId\`/\`OrderId\`/\`Price\`/\`Qty\`）が各々防ぐ **1 つのバグ** は何か？ ヒント: \`(u64, u64, u64)\` を取る関数を、誰かが引数を間違った順序で呼ぶ場面。

## ステップで組み立てる

### Step 1: crate ディレクトリ + Cargo.toml

\`\`\`bash
mkdir -p crates/clob/src
touch crates/clob/Cargo.toml crates/clob/src/lib.rs crates/clob/src/types.rs
\`\`\`

\`crates/clob/Cargo.toml\`:

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

依存なし（pure data + pure logic、この段階では \`serde\` も不要）。

### Step 2: workspace に登録

root \`Cargo.toml\` の \`[workspace] members\` に追加し、\`[workspace.dependencies]\` に path エントリを追加:

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

[workspace.dependencies]
# --- Internal crates ---
openhl-types     = { path = "crates/types" }
openhl-clob      = { path = "crates/clob" }     # NEW
openhl-evm       = { path = "crates/evm" }
openhl-consensus = { path = "crates/consensus" }
\`\`\`

これで bridge（レッスン9）が \`openhl-clob = { workspace = true }\` で consume できる。

### Step 3: newtype 4 個

\`crates/clob/src/types.rs\`:

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

7 個の derive は 4 型で同一（意図的）— newtype は \`u64\` と同じ操作を持ちつつ型システムが混在を拒否する。要点: \`AccountId\` は opaque（CLOB は chain が何を使うか知らず equality 比較のみ）、\`OrderId\` は caller-allocated（book を pure-stateless に保つ）、\`Price\`/\`Qty\` は minor unit（engine 内に \`f64\` は存在しない）。

### Step 4: \`Side\` + \`opposite()\`

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

\`opposite()\` は後で load-bearing — taker は book の **反対側** を辿って流動性を探す（Buy taker は ask、Sell taker は bid）。ルールをここに 1 度だけ encode。\`PartialOrd/Ord\` を **付けない** のは意図的（「Buy < Sell」は無意味で、declaration 順の偶発的順序付けを防ぐ）。

### Step 5: \`OrderType\`

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

\`Limit { price }\` は at-or-better でマッチし残りは book に rest。\`Market\` は価格なし、残りは破棄。struct スタイルにするのは、match 時に field 名 \`price\` がパターンに入って self-documenting になるから。未使用 variant（\`Stop\` 等）は型を使う直前まで追加しない。

### Step 6: \`Display\`（user-facing な 3 型）

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

\`AccountId\` に Display を **付けない**（opaque ID なので、生 \`u64\` でなく chain 統合のマッピングが返す実アドレスを print したいはず → caller に明示的扱いを強制）。

### Step 7: \`lib.rs\`

\`\`\`rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [\`book::Book\`] for the matching state machine (レッスン 3+).

pub mod types;

pub use types::*;
\`\`\`

\`pub use types::*\` で crate ルート re-export → caller は \`use openhl_clob::{Order, Side}\` と短く書ける。\`book\` モジュールはレッスン3 で追加。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
git checkout main
\`\`\`

参照の types.rs は全型で ~109 行。本レッスン後は newtype + Side + OrderType + Display のみ（~65 行）。残り ~45 行（Order/Fill/FillResult）はレッスン2。

## 合格基準

\`\`\`bash
cargo check -p openhl-clob
cargo check --workspace
\`\`\`

→ 警告・エラーなし。public API は \`AccountId\`/\`OrderId\`/\`Price\`/\`Qty\`/\`Side\`/\`OrderType\`。よくあるミス: \`use core::fmt;\` 忘れ / \`Price\`/\`Qty\` に Display 付け忘れ / \`lib.rs\` が \`mod types;\`(private)。

## まとめ（3行）

- newtype で argument-swap バグを compile time に潰す（コストは \`.0\` deref 数個）。
- 金銭は integer のみ（\`Price\`/\`Qty\` は \`u64\`、\`f64\` を engine に持ち込まない）。
- \`OrderType::Limit { price }\` の struct スタイルが、match を self-documenting にする。`,
                },
                {
                  title: "レッスン2 — Order、Fill、FillResult",
                  slug: "openhl-clob-types-records-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 20,
                  xpReward: 50,
                  content: `# レッスン2 — \`Order\`、\`Fill\`、\`FillResult\`

## 問い

order（入力）/ fill（出力）/ submit の結果をどう型で表すと、約定の消費者（precompile・payload 組み立て）を matching engine の内部 index から切り離せるか？

## 原理（最小モデル）

- **self-contained な message は module 境界をきれいに越える。** \`Fill\` は \`maker_order_id\` と \`maker_account\` の **両方** を持つ。一方は他方から導出できるが、この冗長性で consumer が engine 内部 index から decouple される。
- **「約定の集合」と「残量」を型で分ける。** \`FillResult { fills, remaining_qty }\` は submit の 2 出力を明示（\`Vec<Fill>\` に残量を擬似 entry で埋め込むより明瞭）。
- **派生値はキャッシュせず算出。** \`total_filled()\` は method であって field でない（キャッシュすると約定変更ごとに counter 同期が要る）。
- **\`Copy\` は意味論を反映。** \`Order\`（~48 byte、small field のみ）は \`Copy\`。\`FillResult\` は \`Vec<Fill>\` を所有するので非 \`Copy\`。

## 具体例

\`\`\`mermaid
flowchart LR
    Order["Order<br/>(taker)"] -->|submit| Engine["matching engine"]
    Engine -->|returns| Result["FillResult"]
    Result --> Fills["fills: Vec&lt;Fill&gt;"]
    Result --> Rem["remaining_qty: Qty"]
\`\`\`

\`Order\` が engine の入力、\`FillResult\` が出力。出力は「マッチした分」（複数の \`Fill\`）と「マッチしなかった分」（\`remaining_qty\`）に分かれる。

## 失敗例（誤解）

「\`Fill\` は \`OrderId\` だけ持てば、consume 時に account を lookup できる」は誤り — その lookup には consumer が book の \`HashMap<OrderId, RestingOrder>\` を生かし続ける必要があり、book が先に進んで maker order を cancel すると \`None\` で詰む。**self-contained な Fill ならその問題は起きない。** 「remainder を per-fill data に」も誤り（submit ごとに remainder は最大 1 つで、どの約定にも紐付かない）。

---

ここまでで「self-contained・fills/remainder 分離」は着地した。ここから record 3 型を \`types.rs\` に追加する。コードは完全形。

> 🛑 **予測。** \`Fill\` はなぜ \`maker_order_id\` と \`maker_account\` の **両方** を運ぶのか？ ヒント: Fill を consume する側（Step 3 の \`clob_place_order\` precompile は balance を credit する）が、engine の内部 index を保持せずに済むには何が要るか。

## ステップで組み立てる

### Step 1: \`Order\`（\`OrderType\` の下、\`Display\` の前）

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

5 field、全部 \`Copy\`（~48 byte、値渡しで自由に引き回せる）。\`order_type\` を enum にするのは、Market order には price がないから — \`price: Price\` を直接置くと全 Market order に意味のない placeholder を持たせる羽目になる。enum なら「price があるか/ないか」を 1 回 encode できる（\`Option<Price>\` でも動くが「Market」のタグを失う）。

### Step 2: \`Fill\`

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

**maker** = 既に book に rest していた order（流動性を作った側、実取引所では rebate）。**taker** = 流動性を消費して入ってきた order（spread/fee を払う側）。1 taker order が複数 Fill を生むこともある（market buy が ask を上に走査）。**\`price\` は maker の価格** — $101 limit-buyer が $100 resting seller とマッチすると $100 で約定（buyer が勝つ = price-time priority）。両 account を持つのは予測の答え（consumer を engine state から decouple）。

### Step 3: \`FillResult\` + \`total_filled()\`

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

\`FillResult\` は \`Vec<Fill>\` を所有するので **非 \`Copy\`**（\`Clone\` のみ）。3 つの load-bearing な点: ① \`fills\` は execution 順（replay determinism、レッスン8 proptest で assert）② \`remaining_qty\` は rest しなかった taker 量のみ（Limit が partial-fill して残りを book に rest した場合もここは 0 — 残りは book にある）③ \`total_filled\` は computed（cache しない。N は通常 1-3 で O(N) は無視できる）。

### Step 4: \`lib.rs\` は変更不要

レッスン1 で \`pub use types::*;\` にしたので、新規 3 型は \`*\` が自動で拾う（個別 re-export なら追加が要るが、\`*\` なので不要）。

\`\`\`rust
// crates/clob/src/lib.rs (変更不要)
pub mod types;
pub use types::*;
\`\`\`

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
git checkout main
\`\`\`

レッスン1 + レッスン2 で types.rs 完成（参照 ~109 行に一致、diff は doc/空白のみ）。

## 合格基準

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

→ 引き続きコンパイル。よくあるミス: \`FillResult\` に \`Copy\` を derive（\`Vec\` を持つので不可、\`Clone\` だけ）/ \`total_filled\` を impl ブロック外に書く / field-unused 警告（レッスン3+ で全て使うので今は無視）。

## まとめ（3行）

- \`Fill\` は maker/taker の order_id + account を両方持つ self-contained message — consumer を engine 内部 index から decouple する。
- \`FillResult\` は fills（マッチ分）と remaining_qty（非マッチ分）を型で分離する。
- \`total_filled()\` は cache せず算出 — \`FillResult\` を派生 state のない純粋データに保つ。`,
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
                  title: "レッスン3 — Book struct と Reverse<Price> トリック",
                  slug: "openhl-clob-book-struct-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン3 — \`Book\` struct と \`Reverse<Price>\` トリック

## 問い

best bid / best ask を O(1) で取れる order book を、custom comparator を書かずにどう組むか？ そして resting order の「不可能な状態」をどう表現不能にするか？

## 原理（最小モデル）

- **\`BTreeMap\` 2 個が matching engine の状態のすべて。** order-id index も best-price cache も side ごとの counter も持たない。それ以外は派生値で、最適化はコアモデルを変えず後から重ねられる。
- **\`Reverse<Price>\` で bid を高値から走査。** *key 型* の \`Ord::cmp\` を反転させると、両 side が \`BTreeMap::keys().next()\` という同じ形で best を返す。型側の非対称性 1 つで matching コードの対称性が手に入る。
- **\`RestingOrder\` は \`Order\` を trim する。** resting order に \`side\` は不要（どちらの map にあるかで分かる）、\`order_type\` も不要（Market は rest しない）。不可能な状態を表現不能にする = 型設計は制約エンジニアリング。
- **FIFO queue は \`VecDeque\`（\`Vec\` でない）。** \`Vec::remove(0)\` は O(n)、\`VecDeque::pop_front()\` は O(1)。price-time priority は push-back と pop-front の両方が速くないと成立しない。

## 具体例

\`\`\`
bids (BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>) — 高値から:
  Reverse(Price(102)) → [O3]              ← best bid: keys().next()
  Reverse(Price(100)) → [O1, O2]
asks (BTreeMap<Price, VecDeque<RestingOrder>>) — 安値から:
  Price(103) → [O7, O8]                   ← best ask: keys().next()
  Price(105) → [O9]
\`\`\`

外側 \`BTreeMap\` が **価格優先**（sorted key）、内側 \`VecDeque\` が **時間優先**（FIFO）。bid 側の \`Reverse<Price>\` だけが非対称で、両 side の \`keys().next()\` を「最良気配」に揃える。

## 失敗例（誤解）

「\`HashMap\` の方が lookup が O(1) で速い」は誤り — 価格順に iterate する必要がある。「best bid」=「最高価格の bid」で、HashMap には「次の sorted key」がなく全 key を O(n) scan するしかない。BTreeMap の sorted iteration なら best は \`keys().next()\` で取れる。「\`Order\` をそのまま book に保存して qty を mutate」も誤り（\`Copy\` 型を mutate するのはバグに見えるし、resting Market order が作れてしまう）。

---

ここまでで「BTreeMap×2・Reverse トリック・trim」は着地した。ここから \`book.rs\` を組み立てる（matching ロジックはレッスン4-6）。コードは完全形。

> 🛑 **予測。** \`BTreeMap\` は key を natural order（小さい順）で iterate する。ask（最安が先）は \`BTreeMap<Price, _>\` でぴったり。bid は最高が先に欲しい。**custom comparator を書かずに BTreeMap を最高先に辿らせる最安の方法は？** ヒント:「u64 の ordering を反転する」を型として考える。

## ステップで組み立てる

### Step 1: \`book.rs\` — doc + imports

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

\`Reverse\` は任意の \`Ord\` 型の ordering を反転（\`Reverse(Price(100))\` は \`Reverse(Price(200))\` より **大きい**）。\`VecDeque\` は両端 queue（新規は \`push_back\`、マッチは \`pop_front\`）。レッスン4-6 で使う型も含め import をここで揃える（レッスン3 では一部 unused 警告が出て、後で消える）。

### Step 2: \`Book\` struct

\`\`\`rust
#[derive(Debug, Default)]
pub struct Book {
    /// Bids: \`Reverse<Price>\` key gives best-first iteration (highest first).
    bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>,
    /// Asks: \`Price\` key gives best-first iteration (lowest first).
    asks: BTreeMap<Price, VecDeque<RestingOrder>>,
}
\`\`\`

状態全体が BTreeMap 2 個。asks は \`Price\` 直接（natural order で \`Price(99)\`→\`Price(100)\`→…、最安 ask は \`asks.keys().next()\`）。bids は \`Reverse<Price>\`（natural order が price 降順、最高 bid は \`bids.keys().next()\`）。**どちらも \`keys().next()\` で best** — これが型の非対称性を正当化する API 対称性（予測の答え）。\`Reverse\` なしだと bid が \`keys().next_back()\` になり side 間で非対称になる。

### Step 3: \`RestingOrder\` struct

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

3 field、**非 pub**（内部型）。\`side\` を落とす（どの map にあるかで分かる）、\`order_type\` を落とす（resting は常に Limit。Market は rest しない）、\`qty\` は残すが部分 fill で縮む。別型にすることで「これは mutate される」性質を明示する（\`Order\` は \`Copy\` で mutate がバグに見える）。

### Step 4: \`new()\` + accessor 4 個

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

\`best_bid\` は \`keys().next()\`（最小 key = 最高 price を wrap）→ \`.map(|rp| rp.0)\` で \`Reverse\` を剥がす。\`best_ask\` は key が \`Price\` 直接で \`.copied()\`。best を \`Option<Price>\` にするのは空 book で best が存在しないから（\`Price(0)\` を返すと caller が実価格と誤認する）。\`depth_*\` は inspection 用（hot path では呼ばない）。

### Step 5: \`lib.rs\`

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

**\`Book\` のみ re-export、\`RestingOrder\` はしない**（内部 queue 要素、外から construct/read すべきでない）。\`book.rs\` で \`pub struct\` でなく \`struct\` のままにして compiler に強制させる。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
git checkout main
\`\`\`

本レッスン後は book.rs の最初の ~45 行（struct + new() + accessor）に相当。\`submit\`（レッスン4-5）/ \`cancel\`（レッスン6）/ \`match_at_level\`（レッスン4）は後続。

## 合格基準

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

→ clean compile（\`Fill\`/\`FillResult\`/\`Order\`/\`OrderType\`/\`Qty\`/\`Side\` の unused import 警告は OK、レッスン4-6 で消える。参照 SHA がこれら import を残しているので build-along を byte-identical に保つには残す）。よくあるミス: レッスン1 で \`Price\` に \`Ord\` derive 忘れ（\`BTreeMap<Reverse<Price>>\` が壊れる）/ \`RestingOrder\` を外から触ろうとする（private）。

## まとめ（3行）

- matching engine の状態は BTreeMap 2 個 — index/cache なし、他は派生。最適化は後から重ねる。
- bid に \`Reverse<Price>\` を使うと両 side が \`keys().next()\` で best を返す（型の非対称性 → API の対称性）。
- \`RestingOrder\` を \`Order\` から trim して不可能な状態（resting Market order 等）を表現不能にする。`,
                },
                {
                  title: "レッスン4 — Limit order 用 submit + match_at_level",
                  slug: "openhl-clob-submit-limit-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 45,
                  xpReward: 80,
                  content: `# レッスン4 — Limit order 用 \`submit\` + \`match_at_level\`

## 問い

Limit order の matching loop をどう書くか？ Buy と Sell はほぼ同形だが、generic で 1 つにまとめるべきか、ミラーの 2 本に分けるべきか？

## 原理（最小モデル）

- **Buy と Sell は構造的ミラー（generic 抽象でない）。** Buy は ask を昇順、Sell は bid を降順に辿る。ほぼ同形の関数 2 本のほうが、boolean フラグでパズル化した generic helper より読みやすい。
- **core loop =「クロスする限り辿る」。** \`while remaining > 0 && 反対側 best 価格が limit をクロス { match_at_level; level を進める/外す }\`。これが見えればレッスン5 の market order は「同じ loop から price check を抜いただけ」と分かる。
- **空 queue 不変条件を変更のたびに維持。** 各 match 後に \`if queue.is_empty() { remove(price) }\`。空 queue を残すと \`best_bid()\` が嘘をつく。
- **戻り値（何が起きたか）と book 状態（今どうあるか）を分離。** Limit の \`remaining_qty\` は常に \`Qty(0)\`（約定しなかった分は rest した）。rest 量は \`best_bid\`/\`depth_bid\` で別途問う。

## 具体例

Limit Buy @ 100, qty 50。ask = \`{98:[O_a(30)], 99:[O_b(30),O_c(30)], 101:[O_d(30)]}\`:

\`\`\`
walk asks while ask_price ≤ 100 and remaining > 0:
  98  ≤ 100 → O_a 完全消費  → Fill(O_a, taker, 98, 30); remaining = 20
  99  ≤ 100 → O_b 部分消費  → Fill(O_b, taker, 99, 20); remaining = 0
  101 > 100 → STOP
AFTER: asks = {99:[O_b(10),O_c(30)], 101:[O_d(30)]}; FillResult{fills:[F1,F2], remaining_qty:0}
\`\`\`

buyer は limit(100)より安く払った（98+99）= at-or-better ルール。

## 失敗例（誤解）

「\`submit\` を 1 つの巨大 match にして matching を各 arm に inline」は誤り — public method が 100+ 行になり、特定 path の test が難しくなる。named function（\`submit_limit\`/\`submit_market\`）に出して addressable に。「Buy/Sell を generic 化して 1 関数に」も誤り — BTreeMap 型 / 比較演算子 / key を全て抽象化する generic-bound パズルのコストが、~30 行の duplication 削減に見合わない。**duplication は安く、abstraction の予算は貴重。**

---

ここまでで「ミラー構造・core loop・関心分離」は着地した。ここから matching engine の core を組み立てる。コードは完全形。

> 🛑 **予測。** 上の「ask 98/99/101、Limit Buy @100 qty50」シナリオで、約定はどの順序で起き、trade 後の book はどうなるか？（答え: Fill@98×30, Fill@99×20。O_a 消滅、O_b は 10 残、O_c/O_d は 30 のまま。buyer は limit より安く約定。）

## ステップで組み立てる

### Step 1: \`submit()\` dispatcher（\`impl Book\` 内、\`new()\` の後）

\`\`\`rust
    /// Submit a taker order. Limit orders rest any unfilled remainder on the
    /// book; Market orders discard it (returned via \`remaining_qty\`).
    pub fn submit(&mut self, order: Order) -> FillResult {
        match order.order_type {
            OrderType::Limit { price } => self.submit_limit(order, price),
            OrderType::Market => todo!("Market orders land in レッスン 5"),
        }
    }
\`\`\`

dispatcher の唯一の仕事は型駆動ルーティング（matching そのものでない）。\`todo!()\` は clean な placeholder（Market submit で clear なメッセージ panic、compile は通る）。レッスン5 で \`self.submit_market(order)\` に置換。

### Step 2: \`submit_limit\` — matching loop（Buy/Sell ミラー）

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
        }
        // Limit orders report zero remaining — the remainder is in the book,
        // not in the return value.
        FillResult {
            fills,
            remaining_qty: Qty(0),
        }
    }
\`\`\`

Buy ブランチの 3 exit: taker 完全約定 / book が空 / 最安 ask が limit 超。\`get_mut(...).expect(...)\` は安全（\`keys().next()\` 直後なので level 確実に存在、expect が invariant を文書化）。各 match 後 \`if queue.is_empty() { remove }\` で best を depth と整合させる。Sell は **構造的同一**（bids を辿る / \`best_rev.0\` で unwrap / 比較は \`<\`）。rest-the-remainder: 残量を \`RestingOrder\` にして Buy は \`bids.entry(Reverse(limit_price))\`、Sell は \`asks.entry(limit_price)\` に push。**rest しても \`remaining_qty: Qty(0)\` を返す**（remainder は book にある、return 値でない）。

### Step 3: \`match_at_level()\`（module scope、\`impl Book\` の外）

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

\`front_mut()\` = 先頭 maker（time priority）。\`fill_qty = min(maker.qty, remaining)\`。\`Fill\` に order_id × 2 + account × 2 を保存（レッスン2 の self-contained 設計）。maker と remaining を縮め、maker が 0 になれば \`pop_front\`。**free function なのは \`self\` 不要だから**（単一 queue + 単一 remaining にしか触らない）。\`expect("empty queue")\` は \`submit_limit\` の invariant を明示する防衛境界（空 queue で呼ばれない設計）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
git checkout main
\`\`\`

本レッスン後は book.rs の最初の ~145 行（struct + accessor + submit + submit_limit + match_at_level）。\`submit_market\`（レッスン5）/ \`cancel\`（レッスン6）は後続。

## 合格基準

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

レッスン3 の unused-import 警告はここで消える（submit_limit と match_at_level が全て使う）。動作確認は \`book.rs\` 末尾に一時 smoke test を貼る:

\`\`\`rust
#[cfg(test)]
mod smoke {
    use super::*;
    use crate::types::{AccountId, OrderId, OrderType, Price, Qty, Side};

    #[test]
    fn buy_crosses_resting_ask() {
        let mut book = Book::new();
        book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
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
        assert_eq!(result.remaining_qty, Qty(0)); // rested, not returned
        assert_eq!(book.best_bid(), Some(Price(100)));
        assert_eq!(book.depth_bid(), 1);
        assert_eq!(book.depth_ask(), 0); // ask was fully consumed
    }
}
\`\`\`

\`cargo test -p openhl-clob smoke::buy_crosses_resting_ask\` で確認 → pass。**レッスン5 に進む前にこの \`mod smoke\` は削除する**（本格テストはレッスン7-8）。よくあるミス: rest が \`Reverse(limit_price)\` で wrap されず \`best_bid\` が見つからない / \`front_mut()\` の戻りを \`.clone()\` して mutation が persist しない。

## まとめ（3行）

- Buy/Sell は構造的ミラー — generic 化せず 2 本に分ける（duplication は abstraction tax より安い）。
- core loop は「クロスする限り反対側を best-first で辿り match_at_level」、各 match 後に空 level を外す。
- 戻り値は call で起きたこと（Limit は \`remaining_qty: Qty(0)\`）、book 状態は別メソッドで問う — 関心を分離する。`,
                },
                {
                  title: "レッスン5 — submit_market — 任意の価格を取る order",
                  slug: "openhl-clob-submit-market-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 25,
                  xpReward: 60,
                  content: `# レッスン5 — \`submit_market\` — 任意の価格を取る order

## 問い

Market order（価格を持たず、book が提示する価格を受け入れる）をどう実装するか？ Limit との差分はコードのどこに宿るか？

## 原理（最小モデル）

- **Market = Limit から price check と rest 処理を抜いたもの。** レッスン4 と同じ「クロスする限り辿る」ループだが \`price <= limit\` ガードがなく、rest-the-remainder もない。**意味の差は *存在しないコード* に宿る** — boolean フラグでパラメタ化すると両方の本体が読めなくなる。
- **約定価格は常に maker の価格。** Market は価格を持たず book の提示を受ける。価格発見 = best bid と best ask のスプレッドが価格を決める規則。
- **同じ戻り型、異なる契約。** \`remaining_qty\` は Limit では「rest した分」（常に \`Qty(0)\`）、Market では「破棄した分」（実際の残量）。型は同じ、\`FillResult\` の doc が両解釈を明示。
- **「何も起きなかった」はエラーでなく有効な結果。** 空 book への Market buy は \`FillResult { fills: vec![], remaining_qty: order.qty }\` を返す（\`Result::Err\` を投げない）。

## 具体例

ask = \`{100:[O_a(30)]}\`、Buy qty 50:

\`\`\`
MARKET（leftover を破棄）              LIMIT @100（leftover を rest）
walk asks（price guard なし）          walk asks while ask_price ≤ 100
  100: O_a 完全消費 → Fill(30)          100: O_a 完全消費 → Fill(30)
  remaining = 20                       remaining = 20
leftover: DISCARD                      leftover: REST as bid @100
AFTER bids: empty（20 が消えた）        AFTER bids: {100:[new(20)]}
remaining_qty: Qty(20)                 remaining_qty: Qty(0)
\`\`\`

同じ約定、leftover の運命だけが違う。差分は「rest-the-remainder ブロックの有無」。

## 失敗例（誤解）

「Market Buy に \`limit_price = u64::MAX\`、Sell に \`Price(0)\` を渡して \`submit_limit\` を呼べばいい」は誤り — price-check 除去には効くが rest-the-remainder は残る。約定しなかった qty を \`u64::MAX\` で rest しようとし、最高価格の phantom resting bid を作り、入ってくる sell を即マッチしてしまう。**2 関数・2 意味論、別々に保つ。**

---

ここまでで「Market は Limit のサブセット・leftover の運命」は着地した。ここから組み立てる（matching engine がこれで完成）。コードは完全形。

> 🛑 **予測。** ask = \`{100:[O_a(30)]}\` に 50 unit の Market buy。約定と \`remaining_qty\` は？ 同じ book で Limit buy @100 なら？（答え: Market → Fill(30 @100), \`remaining_qty=20\`（破棄、book に乗らない）。Limit → Fill(30 @100), \`remaining_qty=0\`（20 が bid @100 に rest）。）

## ステップで組み立てる

### Step 1: \`submit_market()\`（\`impl Book\` 内、\`submit_limit\` の後）

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

\`submit_limit\` との差分は 3 つだけ: ループ内の price check **なし**（任意価格で取る）/ ループ後の rest-the-remainder **なし**（leftover 破棄）/ return の \`remaining_qty\` が \`Qty(0)\` でなく \`remaining\`（実際の残量）。ループの形は同じ、check を 2 個削り return 値を 1 個変えるだけ。

### Step 2: \`submit()\` dispatcher 更新（\`todo!\` を置換）

\`\`\`rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => self.submit_market(order),
    }
}
\`\`\`

1 行変更。dispatcher は「型駆動ルーティング、arm ごと 1 行」のまま。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
git checkout main
\`\`\`

本レッスン後は book.rs の最初の ~190 行。残り ~25 行は \`cancel()\`（レッスン6）。

## 合格基準

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

clean（全関数に caller がいて unused 警告なし）。一時 smoke test（後で削除）:

\`\`\`rust
#[cfg(test)]
mod smoke {
    use super::*;

    #[test]
    fn market_buy_takes_what_it_can_then_discards() {
        let mut book = Book::new();
        book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
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
        assert_eq!(result.remaining_qty, Qty(20)); // DISCARDED, not rested
        assert_eq!(book.best_bid(), None);
        assert_eq!(book.best_ask(), None);
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
    }
}
\`\`\`

\`cargo test -p openhl-clob smoke\` で確認 → pass、**その後 smoke を削除**。よくあるミス: final \`FillResult\` を \`remaining_qty: Qty(0)\`（submit_limit から copy-paste）にする / Market 後に \`best_bid()\` が \`Some\`（rest-the-remainder に fall through）。

## まとめ（3行）

- Market = Limit から price check + rest を抜いたもの。差は存在しないコードに宿るので、別関数に保つ（フラグ化しない）。
- \`remaining_qty\` は同じ型で契約が違う（Limit=常に0、Market=破棄量）。約定価格は常に maker の価格。
- 空 book への Market は \`Result::Err\` でなく fills 空 + full remainder を返す — total + side-effect-free が consensus state machine の規律。`,
                },
                {
                  title: "レッスン6 — cancel — order を book から引き抜く",
                  slug: "openhl-clob-cancel-ja",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 20,
                  xpReward: 50,
                  content: `# レッスン6 — \`cancel\` — order を book から引き抜く

## 問い

fill される前に resting order を削除したい。削除と同時に空になった price level を残さない（\`best_bid\` が嘘をつかない）ようにするには？

## 原理（最小モデル）

- **\`BTreeMap::retain\` が「mutate + 空 entry drop」を 1 closure でこなす。** 同じ callback が queue から該当 order を削除し、level を残すか（\`!queue.is_empty()\`）を返す。1 pass で済み、\`submit\` 由来の空 level 不変条件が自動維持される。
- **O(n) 線形 scan が v0 で正しい。** O(1) cancel のための \`HashMap<OrderId, (Side, Price)>\` index は、BTreeMap と同期する 2 つ目の構造・追加メモリ・cache 圧を生む。profile に出ないものを最適化しない。
- **\`bool\` 戻り値が最小の正直な形。** \`Option<RestingOrder>\` は private にした \`RestingOrder\` を漏らす。\`Result<(), CancelError>\` は「見つからない」をエラーに強制するが、cancel の冪等性（2 回呼んでも安全）はバグでなく機能。
- **空 level の掃除が \`best_bid\` の正直さを保つ。** 空 queue を残すと流動性ゼロなのに \`best_bid()\` が価格を返し、次の sell が幻の価格でマッチする。

## 具体例

retain closure は各 (price, queue) で 2 段判断:

\`\`\`
Case A — 同一 level に他の order あり:
  BEFORE 100 → [O_3, O_5, O_4] → O_5 remove → AFTER 100 → [O_3, O_4]（queue 非空 → KEEP）
Case B — その level に他がない:
  BEFORE 100 → [O_7] → O_7 remove → AFTER（100 の entry 消滅）（queue 空 → DROP）
\`\`\`

Case B が「空 level cleanup」を自動で守る — \`submit\` の「空 queue を即 drop」と同じ規律を retain の return 値が代行する。

## 失敗例（誤解）

「BTreeMap を iterate して order を削除し、もう一度 iterate して空 level を drop」は誤り — 2 pass は無駄で、invariant が 2 箇所に分散し、「削除した」と「空か check した」の間に inconsistent な窓ができる。**1 closure、2 つの仕事、1 つの invariant。**

---

ここまでで「retain の二役・O(n) で十分・bool 戻り値」は着地した。ここから組み立てる（matching engine がこれで機能的に完成）。コードは完全形。

> 🛑 **予測。** price 100 で 50 unit の Limit Buy を rest させ、その order id で cancel する。cancel 後 \`best_bid()\` は何を返すべきか？（答え: \`None\`。100 で唯一の order だったので cancel で queue が空 → retain が level を drop → \`bids.keys().next()\` が \`None\`。**空 level cleanup が \`best_bid\` を「実際に liquidity があるか」について正直に保つ。**）

## ステップで組み立てる

### Step 1: \`cancel\`（\`impl Book\` 内、\`submit_market\` の後）

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

\`retain\` が全 (key, queue) を辿り、closure が queue を mutate して \`bool\` を返す（\`false\`→entry drop、\`true\`→保持）。\`if !found && let Some(pos) = ...position(|o| o.id == order_id)\` で未発見時のみ検索（\`found = true\` 後は以降の level で queue 内探索を省く最適化）。\`!queue.is_empty()\` の return が空 level を drop。\`if found { return true }\` で bid で見つかれば ask scan を skip。\`OrderId\` は caller が unique 性を所有する前提。let-chain（\`if let && ...\`）は Rust 1.65+ stable（古い環境なら \`if !found { if let Some(pos) = ... }\` にネスト）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
git checkout main
\`\`\`

本レッスン後、book.rs は \`55a9dff\` の参照と **機能的に同一**（残る違いは doc/空白とテストモジュール — レッスン7-8 で追加）。

## 合格基準

\`\`\`bash
cargo check -p openhl-clob
\`\`\`

clean。一時 smoke test（後で削除）:

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
        book.submit(limit_buy(1, 1, 30, 100));
        book.submit(limit_buy(2, 2, 30, 99));
        assert_eq!(book.best_bid(), Some(Price(100)));
        assert_eq!(book.depth_bid(), 2);

        assert!(book.cancel(OrderId(1)));
        assert_eq!(book.best_bid(), Some(Price(99))); // 99 is now the best
        assert_eq!(book.depth_bid(), 1);

        assert!(!book.cancel(OrderId(1))); // already removed
    }

    #[test]
    fn cancel_searches_both_sides() {
        let mut book = Book::new();
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
        assert!(!book.cancel(OrderId(99)));
        assert_eq!(book.depth_bid(), 1);
    }
}
\`\`\`

\`cargo test -p openhl-clob smoke\` → 3 つ pass、**その後 smoke を削除**（本格テストはレッスン7）。よくあるミス: closure が \`!queue.is_empty()\` でなく無条件 \`true\` を返す（cancel 後も best_bid が幻価格）/ \`position\` 述語が \`o.id\` でなく \`o.account\` を比較。

## まとめ（3行）

- \`BTreeMap::retain\` が「該当 order 削除」と「空 level drop」を 1 closure・1 pass でこなす（invariant が分散しない）。
- O(n) 線形 scan は v0 で正しい — index は profile が要求してから（連続配置の \`VecDeque\` は cache 効率も良い）。
- \`bool\` 戻り値が最小の正直な形 — 内部型を漏らさず、cancel の冪等性を保つ。`,
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
                  title: "レッスン7 — hand-trace された unit test 9 個",
                  slug: "openhl-clob-unit-tests-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン7 — hand-trace された unit test 9 個

## 問い

matching engine がコンパイルは通るが「正しく動く」証明はまだない。どんなテストを **何本** 書けば、レッスン4-6 のロジックが実際に動くことを load-bearing に証明できるか？

## 原理（最小モデル）

- **網羅は本数でなく invariant 単位。** 9 個のテストは「9 個の任意シナリオ」でなく、別個の invariant に 1:1 対応（empty-book / resting / walks-levels / respects-limit / FIFO / partial-market / cancel-found / cancel-not-found / no-cross）。invariant の一覧が短く明確だから 9 が正当化できる。
- **hand-trace が proptest（レッスン8）の oracle。** proptest が 25-action 乱数列で fail したら、invariant を 1 つ切り出した hand-trace でデバッグする。proptest は増幅器、unit test は土台。
- **helper 関数 > builder pattern。** 位置引数の \`limit(...)\`/\`market(...)\` が重複を取る最安の抽象（~5 行のテストに builder は儀式的すぎる）。
- **ソース順序が優先度を表す / \`assert_eq!\` > \`assert!\`。** no-cross を最後に置くのは「これが load-bearing な safety property」のシグナル。\`assert_eq!\` は失敗時に両辺を出す。

## 具体例

9 テスト = 9 invariant: ① empty-book に price なし ② resting が bid/ask を作る ③ market が best-ask を best-first ④ limit が price 内で walk ⑤ level 内 FIFO time priority ⑥ partial-market が remainder 破棄 ⑦ cancel-found ⑧ cancel-not-found ⑨ no-crossed-book（最強の safety property、最後）。

## 失敗例（誤解）

「9 個でなく 100 個書けばカバレッジが増える」は誤り — 多くが同じ path を exercise するなら冗長。「buy crosses ask」を 100 回 exercise しても 99 個は無駄。**異なる invariant を exercise するテストだけが価値を足す。**

---

ここまでで「invariant 単位の網羅」は着地した。ここから \`book.rs\` 末尾に \`#[cfg(test)] mod tests\` を組み立てる。コードは完全形。

> 🛑 **予測。** 9 個のうちどれが、\`submit_limit::Buy\` が ask を **降順**（最高値先）に辿るバグで失敗するか？ ヒント:「best ask 先」を明示 assert しているテスト。（答え: \`buy_market_takes_best_ask\`（約定順逆転として）と \`limit_buy_walks_asks_within_price\`（早期 stop バグとして — 降順だと最初に 105 に当たり limit 103 で即 stop し、本来マッチすべき 100 を素通り）。違う症状で 2 つが catch。）

## ステップで組み立てる

### Step 1: helper + テストモジュール（\`fn match_at_level\` の後、\`impl Book\` の外）

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

    #[test]
    fn empty_book_has_no_best_prices() {
        let book = Book::new();
        assert_eq!(book.best_bid(), None);
        assert_eq!(book.best_ask(), None);
        assert_eq!(book.depth_bid(), 0);
        assert_eq!(book.depth_ask(), 0);
    }

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
}
\`\`\`

helper は raw \`u64\` を newtype で wrap するだけ（\`limit(1,100,Side::Sell,100,5)\` が 1 行で済む。positional は 5-field struct より速い）。テストは複雑さ順: empty-book → resting → market-walks → limit-respects → FIFO → partial → cancel × 2 → no-cross。**\`book_does_not_cross_after_match\` が最強**（crossed book = matching engine の根本的失敗）で、ソース末尾に置いて優先度を示す（実行はアルファベット順）。Test 7+8 のペアが cancel の成功/失敗 path を両方カバー。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
git checkout main
\`\`\`

本レッスン後、book.rs 末尾に test モジュール（9 tests + 2 helper）。参照には \`mod prop_tests\` もある（レッスン8）。

## 合格基準

\`\`\`bash
cargo test -p openhl-clob
\`\`\`

→ **9 テスト pass**（アルファベット順で実行）。よくあるミス: \`fn limit\` を mod 外に書く / 約定順が逆（\`keys().next()\` の方向）/ FIFO でなく LIFO（\`push_back\` でなく \`push_front\`）/ 空 level cleanup 漏れ。

## まとめ（3行）

- 9 テストは 9 個の別個 invariant に 1:1 対応 — 網羅は本数でなく invariant 単位で測る。
- hand-trace unit test が基礎、proptest（次レッスン）が増幅器。proptest fail 時はこれで isolate する。
- no-crossed-book を最後に置き、ソース順序で「最強の safety property」を示す。`,
                },
                {
                  title: "レッスン8 — proptest invariant 3 個: 768 ランダムシナリオ",
                  slug: "openhl-clob-proptests-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン8 — proptest invariant 3 個: 768 ランダムシナリオ

## 問い

hand-trace 9 個は思いついたシナリオを覆う。だが「limit を 17 個 submit してから空 side に market」のような、自分が思いつかない sequence のバグはどう見つけるか？ そして consensus に載せる engine の最重要 property は何か？

## 原理（最小モデル）

- **determinism は consensus の load-bearing property。** 正しいが非決定的な engine は consensus を壊す（validator が同じ action を replay して異なる約定を見て合意できない）。決定的だが間違った engine は修正可能、非決定的な engine は修復不能。
- **property test が裾野を覆う + shrink。** 256 case × 3 property = 768 乱数列が、hand-trace の予想外を覆う。fail した 25-action 列を最小反例まで自動 shrink する。
- **3 直交 invariant: conservation / safety / replayability。** \`qty_conservation\`（量が生まれず消えない）/ \`no_crossed_book\`（常に best_bid < best_ask）/ \`determinism\`（同じ入力→同じ出力）。
- **\`proptest\` は dev-dep、\`Action\` enum は simplified intermediate。** test 時のみ走る（[dependencies] に入れると全 consumer に強制）。strategy は raw \`u64\` を吐き、test body が \`submit\` 前に newtype で wrap（newtype は API 境界で効かせる）。

## 具体例

256 case × 3 invariant = **768 ランダムシナリオ**。各 case は小さな in-memory matching simulation で、合計 10 秒未満。

## 失敗例（誤解）

「広い range（\`0..=u64::MAX\`）= カバレッジが多い」は誤り — 99.99% が overflow 境界（\`qty = u64::MAX-1\`）を exercise し normal な matching path を覆わない。range を plausible（account 1-200、price 50-150、qty 1-20）に絞り、予算を production traffic が exercise する path に使う。「proptest を [dependencies] に」も誤り（全 consumer に proptest コンパイルを強制）。

---

ここまでで「property test の役割・3 直交 invariant」は着地した。ここから組み立てる。コードは完全形。

> 🛑 **予測。** \`submit_limit::Buy\` が時折 ask を best-first でなく **random** 順に辿るバグを、3 invariant のどれが最も速く / informative に catch するか？（答え: \`no_crossed_book\` は直接（cheaper ask を残して次の bid で cross）、\`qty_conservation\` は間接、\`determinism\` は **毎回**（各 run が違う「random」順を選ぶ）。**determinism こそ consensus の load-bearing** — なければ validator が合意できない。）

## ステップで組み立てる

### Step 1: \`crates/clob/Cargo.toml\` に dev-dep

\`\`\`toml
[dependencies]

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
\`\`\`

\`proptest\` は既に workspace dep（consensus の proposer-election test で使用済み）。\`[dev-dependencies]\` に置けば test build 時のみ。

### Step 2: \`mod prop_tests\` — Action enum + strategies

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

\`Action\` は raw \`u64\` を持つ（newtype は test body で wrap）。\`arb_action\` の \`prop_oneof![3 => limit, 1 => market]\` で Limit を 3 倍頻度に（現実的 usage）。\`arb_actions\` の \`prop::collection::vec(0u64..1000, 1..30)\` は **長さ 1..30 を決めるためだけ**で、中の u64 は \`.enumerate()\` の index で上書きされる（strictly-increasing な order ID で collision 回避）。range を plausible に絞るのは、normal-looking な sequence にバグが最も隠れるから。

### Step 3: 3 つの invariant（同じ \`proptest!\` block）

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

            // Each fill consumes one unit from a maker AND one unit from a taker,
            // so a matched unit appears in total_in twice.
            let resting: u64 = book.bids.values()
                .flat_map(|q| q.iter())
                .chain(book.asks.values().flat_map(|q| q.iter()))
                .map(|o| o.qty.0)
                .sum();
            prop_assert_eq!(total_in, 2 * total_filled + total_market_unfilled + resting);
        }

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

        /// Determinism: applying the same action sequence produces the same
        /// book + fill history every time. (Required for consensus determinism.)
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

**qty_conservation**: \`total_in = 2 × total_filled + total_market_unfilled + resting\`。\`2 ×\` は約定が maker と taker から 1 unit ずつ消費するため（matched unit が \`total_in\` に 2 回現れる）。**no_crossed_book**: レッスン7 の no-cross を 256 乱数列で。**determinism**（最重要）: 同じ列を 2 run して 5-tuple equality。HashMap iteration / \`Instant::now()\` / tokio task / f64 bit などの non-determinism を catch — どれもコンパイルが通り no_crossed_book も pass するが、ここで catch される。\`#![proptest_config(cases: 256)]\` で各 256 回。\`prop_assert_eq!\`/\`prop_assert!\`（\`assert\` でない）が shrinking に報告。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
git checkout main
\`\`\`

本レッスン後、book.rs が \`55a9dff\` を mirror（doc 以外）。\`Cargo.toml\` に \`[dev-dependencies] proptest\`。fail 入力は \`proptest-regressions/\` に cache される（git に add）。

## 合格基準

\`\`\`bash
cargo test -p openhl-clob
\`\`\`

→ **12 テスト pass**（unit 9 + proptest 3、各 256 case = 768 シナリオ、数秒）。よくあるミス: \`use proptest::prelude::*;\` 漏れ / \`total_in\` に約定量を足す（submit 時の order qty を足すのが正）/ determinism 失敗（HashMap や \`Instant\` 等の non-deterministic primitive 混入）。

## まとめ（3行）

- proptest（256×3=768 乱数列）が hand-trace の予想外を覆い、fail 列を最小反例に shrink する。
- 3 直交 invariant: qty_conservation（保存）/ no_crossed_book（安全）/ determinism（再現性）。
- determinism が consensus の load-bearing property — 非決定的 engine は validator の合意を壊す。proptest は dev-dep に閉じる。`,
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
                  title: "レッスン9 — LiveRethEvmBridge に CLOB + submit_order を持たせる",
                  slug: "openhl-clob-bridge-fields-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 70,
                  content: `# レッスン9 — \`LiveRethEvmBridge\` に CLOB + \`submit_order\` を持たせる

## 問い

完成した matching engine を consensus 側の \`LiveRethEvmBridge\` にどう接続するか？ CLOB は Reth EVM の **中** に置くのか、**横** に置くのか？

## 原理（最小モデル）

- **CLOB は EVM の *横* に置く。** \`clob: Mutex<Book>\` は \`provider\`/\`state\` と並ぶ bridge のフィールド。約定は payload に併走する parallel データレーンで、まだ EVM transaction ではない（それは Step 3 の precompile）。
- **Mutex は 1 つでなく 2 つ。** \`clob\` と \`pending_fills\` は別タイミングで別 caller が変更する。lock を分ければ \`pending_fill_count\` を読むスレッドが book を触る submitter を block しない。
- **interior mutability + \`&self\` が async 共有 state の idiom。** \`submit_order(&self, ...)\` だから bridge を \`Arc\` で共有できる。\`RwLock<Bridge>\` を上に載せると全アクセスが直列化する。
- **lock を取る API は lock 越しに参照を返さない。** \`payload_fills\` は \`&[Fill]\` でなく \`Vec<Fill>\`(clone) を返す（borrow を返すと caller が lock guard を抱え続けて deadlock）。

## 具体例

bridge 内部トポロジー（3 レーン）:

\`\`\`
order in → submit_order → [Mutex<Book>] match → fills → [Mutex<Vec<Fill>>] append
                                                              ↓ build_payload が drain（レッスン10）
                          [Mutex<State> pending: HashMap<id, (hash, header, Vec<Fill>)>]
                                                              ↓ build_payload → PayloadId
                                                          EVM レーン（state/header/forkchoice）
\`\`\`

\`clob\` と \`pending_fills\` を別 Mutex にするのが load-bearing — 2 レーンが直列化しない。

## 失敗例（誤解）

「\`Mutex<(Book, Vec<Fill>)>\` 1 個でいい」は誤り — submit ごとに matching と fill-buffer mutation の両方で lock を保持し、submit せず count を読むだけのコードが block される。「\`submit_order\` を \`&mut self\` に」も誤り — \`Arc<RwLock<Bridge>>\` が必要になり全 access を 1 グローバル lock で直列化する。

---

ここまでで「横に置く・Mutex 2 個・&self」は着地した。ここから組み立てる。コードは完全形（\`build_payload\` の drain はレッスン10）。

> 🛑 **予測。** 本レッスン後、order を submit して fill が蓄積したあと \`build_payload\` を呼ぶと、その payload への \`payload_fills(id)\` は何を返すか？（答え: \`Some(vec![])\` — 空。本レッスンはデータフローを接続するが \`build_payload\` はまだ drain せず空 Vec を挿入。レッスン10 でこれが \`Some(vec![fill...])\` になる。）

## ステップで組み立てる

### Step 1: \`crates/evm/Cargo.toml\` に dep

\`\`\`toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
openhl-clob              = { workspace = true }      # NEW
async-trait              = { workspace = true }
# ... rest unchanged ...
\`\`\`

### Step 2: \`live_node.rs\` に import

\`\`\`rust
use openhl_clob::{Book, Fill, FillResult, Order};                     // NEW
\`\`\`

\`Book\`（matching engine）/ \`Fill\`（output）/ \`FillResult\`（\`Book::submit\` の wrapper）/ \`Order\`（input）を pull in。

### Step 3: struct にフィールド 2 個（\`validator\` と \`state\` の間）

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

\`clob\` は matching engine（\`Book\` は内部 thread-safe でないので Mutex で包む）。\`pending_fills\` は \`submit_order\` が push しレッスン10 の \`build_payload\` が drain する buffer。別 Mutex にするのは lock 粒度（submit は matching で \`clob\` を、append で \`pending_fills\` を短く保持。分ければ 2 submit が全 chain を直列化しない）。

### Step 4: \`State\` の \`pending\` を 3-tuple に

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

3 番目要素が payload ごとの約定リスト。\`chain\` は据え置き（commit 後の fill track は本コース範囲外）。

### Step 5: \`new()\` を更新

\`\`\`rust
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

### Step 6: メソッド 3 個

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

3 つとも \`&self\`（interior mutability）。\`submit_order\` は write path — Rust の NLL により \`book.submit(order)\` 直後に \`clob\` guard が drop され、\`pending_fills.lock()\` 時点で \`clob\` は解放済み（**2 lock は同時に保持しない、deadlock なし**）。\`payload_fills\` は \`&[Fill]\` でなく \`Vec\` を clone して返す（lock 越しに参照を返さない）。

### Step 7: destructuring の波及更新（5 サイト）

\`build_payload\`/\`payload_ready\`/\`validate_payload\`/\`commit\`/\`payload_fills\` の pending tuple pattern を 3 要素に揃える:

\`\`\`rust
// build_payload: s.pending.insert(id, (hash, header, Vec::new()));  // 今は空 Vec; レッスン10 で drain
// payload_ready: let (hash, header, _fills) = s.pending.get(&n).cloned()...
// validate_payload / commit: .find(|(h, _, _)| *h == ...).map(|(_, h, _)| h.clone())
\`\`\`

\`cargo check\` が「pattern length 2 but expected 3」で見逃しを教える。\`build_payload\` の \`Vec::new()\` は placeholder（レッスン10 で \`std::mem::take\` に置換）— TODO コメントより discoverable。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
git checkout main
\`\`\`

本レッスン後、フィールド/メソッド/3-tuple は参照と一致。\`build_payload\` の drain（参照は \`std::mem::take\`）と integration test はレッスン10/11。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm --release
\`\`\`

→ **38 テスト pass**（Consensus 由来、新規テストなし — 構造変更のみ）。\`bridge.pending_fill_count() == 0\`（fresh bridge）を smoke check できる。よくあるミス: dep 追加忘れ / 波及 site 見逃し（compiler が name する）/ \`Book\` を \`.await\` 跨ぎで保持（Send エラー）。

## まとめ（3行）

- CLOB は EVM の横の parallel レーン（\`clob: Mutex<Book>\` + \`pending_fills: Mutex<Vec<Fill>>\`、別 Mutex で lock 粒度を確保）。
- \`submit_order\` は \`&self\` + interior mutability で Arc 共有可能、lock 越しに参照を返さない。
- \`build_payload\` は今は空 Vec placeholder — drain はレッスン10、証明はレッスン11。`,
                },
                {
                  title: "レッスン10 — build_payload が pending fill を drain する",
                  slug: "openhl-clob-bridge-drain-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン10 — \`build_payload\` が pending fill を drain する

## 問い

\`pending_fills\` に溜まった約定を、いつ・どう payload に移すか？ submit 時か、build 時か？

## 原理（最小モデル）

- **\`std::mem::take\` は O(1)** — 1000 個の \`Vec<Fill>\` でも (ptr, len, cap) を 1 代入で swap。\`drain(..).collect()\` は O(N) + iterator オーバーヘッド。
- **drain は \`submit\` でなく \`build_payload\` で。** Fill は「どの payload に乗るか」でグループ化する（submit 順でない）。submit 時に drain すると payload 割り当てを別チャネルで追う羽目に。
- **forward-only drain は block の不変性を反映。** payload N は「前回 build から今まで」の fill を受け取り、以前の payload は遡って更新されない（commit 済み block と同じ — 一度組んだら凍結）。
- **fill loss 失敗モードは現実だが v0 許容。** drain 後に build_payload が error で戻ると fill が消える（buffer からも payload からも）。production は recovery queue で保護、v0 single-validator は許容。

## 具体例

\`\`\`
submit(o_a) submit(o_b)  build_payload(id=1)      submit(o_c)  build_payload(id=2)
pending:[F_a] [F_a,F_b]   mem::take → id=1 が       [F_c]        mem::take → id=2 が
                          [F_a,F_b] を所有、                     [F_c] を所有、
                          buffer 空に                            buffer 空に
pending HashMap: {id=1: (.., [F_a,F_b])}  →  {id=1: (.., [F_a,F_b]), id=2: (.., [F_c])}  ← 遡及書き込みなし
\`\`\`

## 失敗例（誤解）

「\`guard.iter().copied().collect()\` してから \`guard.clear()\`」は誤り — (a) O(N) copy + O(N) clear（mem::take の O(1) swap に対し）、(b) 2 step 版は \`pending_fill_count\` を読む誰かが半 drain 状態を見る窓ができる。**mem::take は外側から atomic。**

---

ここまでで「mem::take・build 時 drain・forward-only」は着地した。ここから 1 箇所を変更する。コードは完全形。

> 🛑 **予測。** \`std::mem::take(&mut v)\` は \`v\` の中身を奪い \`v\` を \`Default\` に置く。\`v.drain(..).collect::<Vec<_>>()\` で同じ効果は出せるが、実用上の違いは？（答え: \`drain\` は要素ごとに取り除く iterator で O(N) + オーバーヘッド。\`mem::take\` は Vec 全体を pointer swap で O(1)。「全部取って default」なら mem::take が速く意図も明確。）

## ステップで組み立てる

### Step 1: \`build_payload\` の placeholder を置換

レッスン9 の \`s.pending.insert(id, (hash, header, Vec::new()));\` を次に変える:

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

\`.lock().expect(...)\` が \`MutexGuard<Vec<Fill>>\`（\`DerefMut\` を持つ）→ \`&mut *guard\` で \`&mut Vec<Fill>\` → \`std::mem::take\` が Vec を \`drained_fills\` に move し guard 側を \`Vec::default()\`（空）に置換。一時 MutexGuard は statement の \`;\` で drop → 次行の \`s.pending.insert\` 時点で \`pending_fills\` lock は解放済み（**lock ordering 安全**）。\`mem::take\` は lock 下で atomic（半 drain 状態は他から見えない）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
git checkout main
\`\`\`

本レッスン後、bridge は \`428cc26\` と機能的に等価（doc 以外）。唯一の差は integration test（\`clob_fills_flow_into_payload\`、レッスン11）。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm --release
grep -n "std::mem::take" crates/evm/src/live_node.rs   # build_payload で 1 行
grep -n "Vec::new()" crates/evm/src/live_node.rs       # build_payload の行は消えている
\`\`\`

→ **38 テスト pass**。よくあるミス: \`&*guard\`（\`&mut *guard\` が必要、DerefMut）/ \`mem::take(guard)\` を \`&mut *\` なしで（\`take\` は \`&mut T\` を取る）。

## まとめ（3行）

- \`build_payload\` で \`std::mem::take\` を使い、前回 build 以降に溜まった fill を O(1) で drain して payload に attach する。
- drain は build 時に行い payload 単位でグループ化、forward-only（以前の payload を遡及更新しない）。
- \`mem::take\` は lock 下で atomic — 半 drain 状態を他に見せない（collect+clear より速く correct）。`,
                },
                {
                  title: "レッスン11 — clob_fills_flow_into_payload — マイルストーンテスト",
                  slug: "openhl-clob-integration-test-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 70,
                  content: `# レッスン11 — \`clob_fills_flow_into_payload\` — マイルストーンテスト

## 問い

submit → buffer → drain の全パイプラインが、**実 Reth node** に対して end-to-end で動くことをどう証明するか？

## 原理（最小モデル）

- **実 Reth node に対する e2e。** \`EthereumNode\` を bootstrap し \`LiveRethEvmBridge\` を組み、submit→buffer→drain の全 pipeline を exercise。レッスン1-10 の連鎖が個別コンポーネントを越えて成立する証明。
- **bootstrap が高価なら 1 本の徹底テスト > 3 本の narrow テスト。** 実 node 起動に数秒。3 回 bootstrap すればコスト 3 倍。1 シナリオで submit/drain/forward-only の 3 不変条件をまとめて検証。
- **forward-only assertion が *本物の* integration test にする。**「submit が約定を生成」「build が drain」は unit でも自明。以前の payload が遡及更新されないことを check するから bridge の payload ごと snapshot を真に検証できる。
- **fill 価格 = maker の価格、統合境界を越えても。** maker bid@100、taker sell@100、fill@100。\`launch_with_debug_capabilities()\`（provider のみ）を使う（engine handle は不要、forkchoice を駆動しない）。

## 具体例

8 step の時系列（assertion 順序が time-invariance を証明）:

\`\`\`
bridge::new      build_payload(empty_id)   submit(maker)+submit(taker)   build_payload(next_id)
count==0         count==0                  count==1                      count==0（drain 後）
                 empty_id→Some([])                                       ① next_id →Some([fill])
                                                                         ② empty_id→Some([]) ← forward-only!
\`\`\`

\`empty_id\` を保持し、next_id の drain 後に re-read して「遡及更新なし」を能動的に証明する。

## 失敗例（誤解）

「\`empty_id\` を \`next_id\` より先に check すればいい」は誤り — それでは「空 payload に fill がない」（Step 5 で既知）しか言えない。**drain の後に** empty_id を check するから「以前の payload は後の drain が起きても空のまま」= time-invariance を証明できる。

---

ここまでで「e2e・徹底テスト・forward-only」は着地した。ここから test を組み立てる。コードは完全形。

> 🛑 **予測。** maker bid@100 qty10、taker sell@100 qty10。fill 価格は 100? 違う?（答え: **maker の価格 = 100**。fill は常に resting order の価格。仮に taker が sell@95 で来ても、板に bid@100 が rest していれば約定は 100 で起きる（price improvement）— price-time priority は resting 側に決定権がある、という規律が統合境界を越えても揺るがない。）

## ステップで組み立てる

### \`#[cfg(test)] mod tests\` に追加（既存テストの後）

\`\`\`rust
    /// Stage 8d end-to-end: CLOB → bridge → payload.
    /// A maker rests, a taker crosses it, the fill flows into the next
    /// \`build_payload\`'s stored fills. The empty-fill \`build_payload\` that
    /// preceded the orders proves the drain semantics — fills accumulate
    /// AFTER they're built, not retroactively included.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn clob_fills_flow_into_payload() {
        use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};

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

        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no genesis");

        let bridge = LiveRethEvmBridge::new(node.provider.clone(), chain_spec);

        // Empty initial state — no orders submitted, no fills pending.
        assert_eq!(bridge.pending_fill_count(), 0);

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

\`launch_with_debug_capabilities()\` を使うのは engine handle が不要だから（CLOB→payload を test、commit→forkchoice でない）。bridge は \`.with_engine_handle(...)\` なしで construct。fill 価格 = 100（maker、予測の答え）、maker_order_id=1 / taker_order_id=2。**3 番目の assertion セット（\`empty_id\` を \`next_id\` の drain 後に re-read）が load-bearing** — drain が forward-only で以前の payload を遡及更新しないことを証明（assertion の時間順序が time-invariance を証明する）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
git checkout main
\`\`\`

本レッスン後、\`live_node.rs\` は \`428cc26\` と **機能的に完全一致**（doc 以外）。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm clob_fills_flow_into_payload --release
cargo test -p openhl-evm --release   # 39 個（Consensus 38 + 本レッスン 1）
\`\`\`

→ pass（~2.5 秒、大半は Reth bootstrap）。**これが Step 2 のマイルストーン** — matching engine の実約定が submit_order → pending_fills → build_payload drain → payload に流れる。よくあるミス: 両 order が \`Side::Buy\`（cross しない、fills.len()==0）/ drain 未実装（next_fills 0）/ \`pending_fills.clone()\` で original を mutate（forward-only assertion が落ちる）。

## まとめ（3行）

- 実 Reth node を bootstrap し、submit→buffer→drain の全 pipeline を 1 本の徹底テストで e2e 検証する。
- fill 価格 = maker の価格（price-time priority が統合境界を越えても成立）。
- forward-only assertion（drain 後に以前の payload を re-read）が、bridge の payload ごと snapshot を真に検証する load-bearing なポイント。`,
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
                  title: "レッスン12 — 作ったもの、まだ stub のもの、次に行く先",
                  slug: "openhl-clob-capstone-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# レッスン12 — 作ったもの、まだ stub のもの、次に行く先

## 問い

11 レッスンで何を作り、何がまだ stub か？ そして「price-time-priority CLOB を作った」という選択は、perp DEX 設計の広い landscape のどこに位置するのか？

## 原理（最小モデル）

- **CLOB は pure crate。** \`openhl-clob\` は EVM/consensus/async runtime に何も依存しない（レッスン1-8 でその境界を引いた）。約 800 行の Rust で、実 Reth-backed bridge に組み込まれた動く matching engine。
- **bridge が 2 つの非対称世界を仲介。** pure な matching engine と、Reth が回す async + I/O ヘビーな EVM 基盤を \`Mutex<...>\` 越しに繋ぐ（レッスン9-11）。
- **fill はまだ EVM 本流を横切らない parallel レーン。** \`pending\` HashMap に座り payload に attach されるだけで、\`BlockExecutor\` は fill を知らない。この破線が **Step 3（precompile）** で実線になる。
- **最難関は matching でなく determinism。** submit の任意順序で同じ答えを生む保証。レッスン8 の proptest がテストしようと思わないバグを catch し、それが consensus に plug して safe な理由になる。

## 具体例

操作は 2 つ・観察可能な結果は 1 つ:

| 操作 | method | 内部 |
|---|---|---|
| Limit submit | \`Book::submit\`(Limit) | 反対側を price 以下/以上で辿りマッチ、残りを rest |
| Market submit | \`Book::submit\`(Market) | 反対側を任意価格で辿りマッチ、残りを破棄 |
| cancel | \`Book::cancel(id)\` | 両 side を scan、削除、空 level を drop |
| inspect | \`best_bid\`/\`best_ask\`/\`depth_*\` | read-only |

データフロー: \`submit_order → clob.submit → pending_fills.push\`（caller に FillResult）／ \`build_payload → drain pending_fills → payload に attach → payload_fills(id)\`。drain は forward-only。

## 失敗例（誤解）

「動く matching engine = 製品」は誤り。EVM-encoded fill / precompile / multi-market / 永続 state / cancel index / pre-trade risk / multi-validator agreement / liquidation — どれも未着手。**動く matching engine は基礎であって製品ではない。**

---

ここまでで「pure crate・bridge 仲介・determinism」は着地した。ここから全体像・市場構造・残った placeholder を振り返る。

> 🛑 **セルフチェック。** 次に進む前に 1 文で言えるか：maker bid@100 と taker sell@95 が cross したとき、約定価格はいくらで、それはなぜか？（答え: 100。fill は常に resting=maker の価格。price-time priority は resting 側に決定権がある。即答できなければ レッスン4・11 を読み直す。）

## 作ったシステム（全体像）

\`\`\`
~/code/my-openhl/crates/
├── clob/                          ← NEW crate（EVM/consensus/async 非依存の pure state machine）
│   └── src/
│       ├── types.rs               L1-L2: newtype + record（~109 LOC）
│       └── book.rs                L3-L8: Book + submit/cancel + unit×9 + proptest×3
└── evm/src/live_node.rs           L9-L11: bridge が clob/pending_fills を持ち build で drain

[Reth EthereumNode]  Engine API / Payload Builder / BlockExecutor(EVM 本流レーン)
        ▲（まだ未接続 — Step 3 で precompile 接続）
[LiveRethEvmBridge]  submit_order → Mutex<Book> → Mutex<Vec<Fill>> → pending HashMap → payload_fills(id)
        ▲
[openhl-clob]  Side/Price/Qty/Order/Fill + Book(BTreeMap<Reverse<Price>,VecDeque>) — pure
\`\`\`

新規テスト 15 個（hand-trace 9 + proptest 3=768 シナリオ + integration 1）。workspace 計 39 テスト。fill は EVM 本流の **隣を並走するレーン**で、\`BlockExecutor\` は \`Vec<Fill>\` を知らない（同じ \`PayloadId\` で identifier 紐づけのみ）。Step 3 がこの並走レーンを EVM execution path に交差させる。

## まだ placeholder のもの（意図的な scope cut）

1. **EVM-executable transaction encoding** — fill は parallel \`Vec<Fill>\` のまま、block body の tx でない（= Step 3）。
2. **Custom EVM precompile** — contract が CLOB state を read（\`clob_read_best_bid\`）/ on-chain submit（\`clob_place_order\`）（= Step 3）。
3. **Funding rate state machine** — mark vs index、定期 rebalancing（= Step 4）。
4. **複数 market** — 現状 orderbook 1 個。\`HashMap<MarketId, Book>\` で機械的に拡張可。
5. **永続 CLOB state** — in-memory のみ。再起動で resting order 消失（snapshot/event-sourcing 要）。
6. **Cancel-by-id index** — O(n) scan（レッスン6 で明示的に simplicity を選択）。~10k order 超で \`HashMap<OrderId,(Side,Price)>\` を入れる。

## 市場構造 — あなたが本当に作ったもの

price-time-priority CLOB は perp DEX の 3 モデルの 1 つ:

- **CLOB（作ったもの）**: MM が resting order を置き taker が約定。価格はこの venue 上の需給で決まる。銘柄ごとに継続 quoting が要る → retail flow がある銘柄で機能。
- **RFQ（Variational, Paradigm）**: taker が quote request、dealer が JIT 応答し primary venue（CME/NYSE/別 CLOB）で hedge。価格を source venue から *持ってくる*。idle 時の quoting コストがないので long tail でも economics が成立。
- **AMM（GMX, 旧 dYdX vAMM）**: 流動性を curve に集約。cold-start に強いが tail で破綻。

**CLOB が勝つのはローカルな需給が存在する場合に限る。** BTC/ETH/SOL/HYPE のような TradFi 的 primary venue を持たない資産では HL の CLOB が真に価格を決める。WTI/NVDA/SPY perp は取引時間中 primary 市場の arbitrage shadow にすぎない（RFQ も同様、両者とも CME/NYSE order book の downstream）。cold-start 非対称は構造的 — 200 RWA 銘柄のうち 10 銘柄にしか flow がなければ残り 190 は薄い板になる。RFQ は dealer が需要時だけ quote するのでこれを回避する。

**「last look」**: 「RFQ には last look があり CLOB にはない」は半分正しい。CLOB でも MM は taker が hit するより速く quote を cancel できる（HL docs の **cancel prioritization**）。あなたの CLOB はこれを実装していない（\`submit\`/\`cancel\` は first-come-first-served）。追加したいなら変更箇所は **BFT engine の ordering rule であって matching engine でない**。

**位置づけ**: あなたが作ったのは HL が **crypto-native の top tier 銘柄** を pricing する engine — 現実に存在し経済的に重要な slice。RWA perp の long tail 用ではない（そちらは RFQ が構造的に向く）。問いは「CLOB か RFQ か」でなく「どの asset class のどの slice を、どの liquidity source で」。

## Production-readiness チェックリスト

- [ ] 各 \`Fill\` を EVM tx として encode し BlockExecutor に route
- [ ] custom precompile（\`clob_read_best_bid\` / \`clob_place_order\`）
- [ ] multi-market（\`HashMap<MarketId, Book>\`）
- [ ] 永続 state（snapshot + replay）
- [ ] cancel index（\`HashMap<OrderId,(Side,Price)>\` で O(1)）
- [ ] order-id 衝突チェック（現状 caller の unique 性を信頼）
- [ ] pre-trade risk チェック（margin 以下に追い込む order を matching 前に拒否）
- [ ] telemetry（throughput / fill latency / depth-of-book）
- [ ] multi-validator agreement（proptest determinism はローカル証明、ネット上は integration test が要る）
- [ ] liquidation engine（= Step 4 領域）

## 次に行く先

- **rethlab 内**: Step 3（precompile — \`clob_read_best_bid\`+\`clob_place_order\`）/ Step 4（funding state machine）。
- **rethlab 外**: \`psyto/openhl\` Stage 9 ソース（\`crates/evm/src/precompiles/mod.rs\`）/ 参考 production engine（Project Serum, dYdX v4）/ proptest + QuickCheck 文献。

## まとめ（3行）

- 約 800 行で、実 Reth-backed bridge に組み込まれた pure な price-time-priority CLOB を作った（EVM/consensus 非依存）。
- 最難関は matching でなく determinism — proptest がそれを守り、consensus に plug して safe な理由になる。
- fill はまだ EVM 本流を並走する parallel レーン。precompile で交差させるのが Step 3 — 動く matching engine は基礎であって製品ではない。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
