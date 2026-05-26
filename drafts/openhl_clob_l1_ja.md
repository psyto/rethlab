# OpenHL CLOB を作る — L1 draft (JA) — build-along

> openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine) 基準。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。

---

## L1 — `openhl-clob-types-newtype-ja`

- **モジュール:** 1 (CLOB 型), モジュール内 sortOrder 0
- **コース全体 sortOrder:** 0 (12 レッスン中 1 番目)
- **所要時間:** 25 分
- **XP:** 60
- **type:** CONTENT

### Content

````markdown
# レッスン 1 — CLOB の newtype、`Side`、`OrderType`

## ゴール

このレッスンで掴む概念:

- **型安全性としての newtype** — `u64` を `AccountId` / `OrderId` / `Price` / `Qty` で包むことで、引数を取り違えるバグを「実行時に静かに誤計上される問題」から「コンパイルエラー」へと格上げできる。
- **金銭計算は整数のみで完結させる** — `Price` と `Qty` は `u64` ベース、`f64` は使わない。float の中間値が境界に紛れ込めば、engine の厳密整数 invariant (例:「約定は数量を保存する」) は一発で壊れる。
- **役割を名前で示す struct スタイルの enum variant** — `OrderType::Limit { price }` は `Limit(Price)` よりも、すべての pattern match 箇所で意図が読み取れる。位置ではなく field に *名前* が付いているため。
- **field-level 型と record-level 型を階層化する** — atomic な型は L1 で確定させ、以降のすべてのレッスンで再利用する。record 型 (`Order`、`Fill`) は L2 でその上に積み上げる。

検証:

```bash
cargo check -p openhl-clob
```

上記の実行結果がクリーンにコンパイルする。

具体的な変更:

新規 crate (`crates/clob/`) が workspace に登録され、`src/types.rs` 1 ファイルに matching engine が使う **atomic な field-level 型** が入る:

- **`u64` を wrap する newtype 4 個** — `AccountId`、`OrderId`、`Price`、`Qty`。偶発的な swap を型レベルで防ぐため。
- **`Side` enum** (`Buy` | `Sell`) と `opposite()` ヘルパー。
- **`OrderType` enum** — `Limit { price }` または `Market`。
- **`OrderId`、`Price`、`Qty` への `Display` impl** — debug 出力が自然に読めるように (`"#42"`、`"1000000"` 等)。

Record 型はまだ作らない (L2)。Book もまだ作らない (L3 以降)。本レッスンは土台 — 以降の全レッスンがここで build する型を使う。

## おさらい

Course 6 完了時点で、workspace には:

```
crates/types/             — BlockHash, PayloadId, PayloadAttrs, ExecutedBlock, PayloadStatus
crates/evm/               — InMemoryEvmBridge, RethEvmBridge, LiveRethEvmBridge
crates/consensus/         — フル BFT engine (Context, signing, codec, node, engine_app)
bin/openhl/               — stub バイナリ
```

`cargo test` で workspace 全体 ~38 個合格。`LiveRethEvmBridge::commit` が `ForkchoiceUpdated` を Reth に送る。**ただし `build_payload` が生成するのは空 block** — 中身に入れるものがない。

## 計画

5 つやる:

1. **`crates/clob/` ディレクトリを作成** — `Cargo.toml` と `src/`。
2. **`crates/clob/` を workspace に登録** — ルート `Cargo.toml` の `[workspace.members]` に追加。
3. **`openhl-clob` を workspace dependency に追加** — 他 crate が依存できるようにルート `Cargo.toml` に書く。
4. **`src/types.rs` を書く** — newtype 4 個、`Side`、`OrderType`、`Display` impl。**Record 型はまだ書かない** (L2)。
5. **`pub mod types;` と re-export を `src/lib.rs` に組み込む** — crate の public API を型として公開。

このレッスンが短いのは型が短いから。重要なのはコードではなく **設計判断** (なぜ raw `u64` ではなく newtype か、なぜ `Limit` が価格を struct field として運ぶのか、`Qty` の単位は何か)。

> 🛑 **考えてみよう。** スクロールする前に: 同じ `u64` を wrap する newtype が 4 個 (`AccountId(u64)`、`OrderId(u64)`、`Price(u64)`、`Qty(u64)`) 並んでいるとき、各 newtype が防ぐ **1 つのバグ** は何か — raw `u64` を使うと通り抜けるバグ。ヒント: `(u64, u64, u64)` を取る関数を考えて、誰かがその引数を間違った順序で呼ぶ場面を想像する。**newtype パターンの主な役割は、argument-swap バグを compile error に変えること。**

## 手順

### Step 1: Crate ディレクトリ + Cargo.toml を作成

Workspace ルート (`~/code/my-openhl/`) から:

```bash
mkdir -p crates/clob/src
touch crates/clob/Cargo.toml crates/clob/src/lib.rs crates/clob/src/types.rs
```

`crates/clob/Cargo.toml` を開いて書く:

```toml
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
```

依存なし。CLOB matching engine は純粋データ + 純粋ロジックなので、この段階では `serde` も要らない (Stage 8b が funding 用に追加するが、今は不要)。

### Step 2: Workspace に登録

ルート `Cargo.toml` を開く。`[workspace] members = [...]` を見つけ、リストに `"crates/clob"` を追加。既存の順序は保つ (アルファベット順でも挿入順でもよい):

```toml
[workspace]
resolver = "3"
members = [
    "bin/openhl",
    "crates/types",
    "crates/clob",      # NEW
    "crates/evm",
    "crates/consensus",
]
```

同じルート `Cargo.toml` で `[workspace.dependencies]` を見つけ、`openhl-clob` のパスエントリを追加:

```toml
[workspace.dependencies]
# --- Internal crates ---
openhl-types     = { path = "crates/types" }
openhl-clob      = { path = "crates/clob" }     # NEW
openhl-evm       = { path = "crates/evm" }
openhl-consensus = { path = "crates/consensus" }
```

これで `openhl-clob` を欲しい crate は自分の `Cargo.toml` で `openhl-clob = { workspace = true }` と宣言できるようになる。L9 で bridge が CLOB を consume するときに使う。

### Step 3: Newtype を書く

`crates/clob/src/types.rs` を開く。モジュール doc と newtype 4 個から:

```rust
//! Core types for the CLOB matching engine.
//!
//! Pure data — no I/O, no allocation beyond what's needed for fills. The
//! whole module is deterministic by construction: every type's `PartialEq`
//! and `Ord` impl derives from byte-equal field comparison.

use core::fmt;

/// Account identifier. Opaque to the CLOB; chain integration maps these to
/// EVM addresses, validator addresses, or whatever the chain uses.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct AccountId(pub u64);

/// Sequential order identifier. Caller allocates; the book doesn't generate.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OrderId(pub u64);

/// Price in minor units. For a USDC market, `Price(1_000_000) = $1.00`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Price(pub u64);

/// Quantity in minor units.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Qty(pub u64);
```

4 つの構造体、各 1 行、すべて `u64` を wrap。**7 個の derive は 4 型すべてで同一** — 意図的。newtype パターンが効くのは、型が `u64` と **同じ操作** を持ちつつ、型システムが両者の混在を **拒否する** から。

doc コメントで注目する点が 3 つ:

- **`AccountId` は opaque** — CLOB は chain が EVM address、ed25519 pubkey、sequential integer のどれを使うかを知らない。equality で比較するだけ。chain 統合 (course 8 の precompile、最終的には production node コード) が `AccountId(...)` を chain が欲しい何かにマップする。
- **`OrderId` は caller-allocated** — book は ID を生成せず、caller が生成する。これで book が pure-stateless に保たれる: `submit_order` は (book, order) の関数であり、(book, order, generator-state) ではない。
- **`Price`/`Qty` は minor unit** — USDC のような 6-decimal token では `Price(1_000_000)` が $1.00 を表す。Matching engine の中に `f64` は **存在しない**。**お金の計算に float は持ち込まない。**

> 🛑 **やりがちな勘違い。** 「便利のために `pub fn from_dollars(d: f64) -> Price` メソッドを追加しよう。」 **ダメ、f64 の精度問題を engine に持ち込む。** `Price(1_000_000)` が wire format。User 向けツールで `from_dollars` をやりたければ、ツール側の境界で integer 乗算をして bridge には integer-typed Price を渡す。Matching engine は float に触れない。

### Step 4: `Side` enum と `opposite()` ヘルパー

`types.rs` の続き:

```rust
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
```

variant 2 個。`opposite()` メソッドは今のところ 1 行だが、後で load-bearing になる: taker order が来たとき、book の **反対側** を順に辿って流動性を探すから。Buy taker は ask を上から順に辿り、Sell taker は bid を上から順に辿る。**ルールを `opposite()` に 1 度だけ encode しておけば、book コードを読むときどちらの side を辿るか忘れない。**

`#[derive(PartialOrd, Ord)]` を **付けない** のは意図的。「Buy は Sell より小さい?」は無意味な問いだから。trait を抜くことで、caller が `if side < Side::Sell` を偶発的に書いて declaration 順 (`Buy < Sell`) という意図しない順序付けが効いてしまうのを防ぐ。

> 🛑 **やりがちな勘違い。** 「bool でいいのでは? `is_buy: bool` でバイト節約。」 **call site で意味が失われる。** `submit_order(order, true)` は読み手にとってゴミに見えるが、`submit_order(order, Side::Buy)` なら一目瞭然。enum vs bool の 1 バイトのコストは、bool の可読性コストに比べれば無視できる。**名前のあるものは enum、on/off 以外の名前を持たないものだけ bool。**

### Step 5: `OrderType` enum

`Side` の impl の下:

```rust
/// Order type — describes liquidity-taking + liquidity-providing behavior.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OrderType {
    /// Take liquidity at or better than `price`; rest the remainder on the book.
    Limit { price: Price },
    /// Take whatever liquidity is available at any price; never rests.
    Market,
}
```

variant 2 個:

- **`Limit { price: Price }`** — struct スタイルの enum variant。Order に価格があり、at-or-better でマッチできなければ残りが book に rest する。
- **`Market`** — unit variant。価格なし、任意の価格で利用可能な流動性を取り、残りは破棄。

`Limit { price: Price }` を tuple スタイル `Limit(Price)` ではなく struct スタイルにしたのは意図的。コードが `order.order_type` をパターンマッチするとき、`Limit { price }` だと field 名 `price` がパターンに入る。tuple では `Limit(p)` と書いて `p` の意味を覚えておかなければならない。**Named field が型を self-documenting にする。**

> 🛑 **やりがちな勘違い。** 「`Stop`、`StopLimit`、`Iceberg`、`Post-Only` も足しておけば?」 **engine がまだ必要としていないし、未使用 variant は技術負債になる。** Limit + Market が L7-L8 の spot-trading テストシナリオをカバーする最小セット。openhl が Stop order を必要とする時点 (おそらく perp 領域、course 9 以降) でメンテナが variant を追加すれば、その時点でマッチングロジック、book ロジック、テストシナリオがすべて同時に更新される。**型は使う直前に追加する、それ以前には追加しない。**

### Step 6: User-facing な newtype 3 個に `Display` impl

`Display` を使うので `fmt` モジュールが要るが、Step 3 でファイル冒頭に `use core::fmt;` をすでに書いている — Step ごとに `use` を継ぎ足すのではなく最初にまとめておく方が、ファイル全体の構造が見通しやすいから。`types.rs` の末尾に追加:

```rust
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
```

`Display` impl 3 個。**`AccountId` に Display を付けない** のは意図的。AccountId は opaque な ID なので、print したいなら生の `u64` ではなく chain 統合のマッピングが返す実際のアドレスを print したいはず。`Display` を抜くと caller が明示的に扱わざるを得なくなる (例: `format!("{}", a.0)` または「chain の address renderer 経由で render」)。

`OrderId` は `"#42"` として format されるのでテスト出力が自然になる (`fill from #1 to #2`)。Price と Qty は単なる数値だが、`Display` impl があれば `.0` を書かずに `format!` / `println!` で使える。

### Step 7: 型を `lib.rs` に組み込む

`crates/clob/src/lib.rs` を開く:

```rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [`book::Book`] for the matching state machine (L3+).

pub mod types;

pub use types::*;
```

body 3 行 + doc コメント。`pub use types::*` で型を crate ルートで re-export するので、caller は `use openhl_clob::types::{Order, Side}` ではなく `use openhl_clob::{Order, Side}` と書ける — どこでも短い形を使う。

`book` モジュールは L3 で追加する。今は `pub mod types;` の 1 行のみ。

## テスト

```bash
cargo check -p openhl-clob
```

期待:

```
   Compiling openhl-clob v0.1.0 (.../crates/clob)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.23s
```

警告なし、エラーなし。crate の public API は `AccountId`、`OrderId`、`Price`、`Qty`、`Side`、`OrderType` (record はまだなし)。

workspace 全体に影響がないことを確認:

```bash
cargo check --workspace
```

クリーンに完了するはず。新規 crate に依存するものがまだないので、何にも影響しない。

よくあるエラーと対処:

- **`error: failed to read 'crates/clob/Cargo.toml'`** — workspace `members` リストの typo、またはファイルが存在しない。Step 2 を再確認。
- **`error[E0432]: unresolved import 'fmt'`** — `types.rs` 冒頭の `use core::fmt;` を忘れている。Step 3 を再確認。
- **`error[E0277]: 'Price' doesn't implement `Display`** — `OrderId` には `Display` を追加したが `Price`/`Qty` にしていない。Step 6 を再確認。
- **`warning: unused import: 'types'`** — `lib.rs` が `pub mod types;` ではなく `mod types;` (private)。Step 7 を再確認。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Newtype が argument-swap バグを compile time に防ぐ。** `submit(book, account: u64, price: u64, qty: u64)` の形だと、3 つの `u64` をどの順序で渡してもコンパイルが通る。`submit(book, AccountId, Price, Qty)` の形なら間違った型を compile time に拒否できる。コストは `.0` deref が数個増えるだけで、利益は書きようがないバグ。

2. **お金の計算は integer であって float ではない。** `Price` と `Qty` は `u64` ベース。`Price::from_f64` は存在しない。価格を "$1.00" として表示したいなら、engine の **外** の rendering 境界で integer-to-decimal 変換をする。Matching engine の invariant (例: 「fill 合計は常に数量を保存する」) は exact-integer invariant — float 中間値を導入した瞬間に壊れる。

3. **`OrderType::Limit { price }` であって `Limit(Price)` ではない。** 後で `match order.order_type { Limit { price } => ..., Market => ... }` と書くとき、`price` binding が役割を明らかにしてくれる。tuple スタイル enum variant が正しいのは variant が「ある 1 物の wrapper」であるとき。struct スタイルが正しいのは field に **名前** があるとき。ここでは名前がある (`price`) ので struct スタイルに分がある。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
diff -u ~/code/my-openhl/crates/clob/Cargo.toml ./crates/clob/Cargo.toml
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
```

`55a9dff` の参照の types.rs は合計 ~109 行 (全型セット)。L1 後の自分の版は newtype + Side + OrderType + Display impl のみ — 約 65 行。残り ~45 行 (Order、Fill、FillResult) が L2 の範囲。diff で差として現れるはず。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜ `AccountId`、`OrderId`、`Price`、`Qty` がすべて `Copy`?**
中身は `u64`（わずか 8 バイト）であり、heap アロケーションもない。`Copy` を実装しておくと、engine 内で `.clone()` を明示的に呼び出すことなく値セマンティクスで自由に引き回せる。`u64` のコピーは CPU レジスタ経由で行われるので、move と比較しても runtime のオーバーヘッドはゼロだ。

**Q: なぜこれらの型に `Hash`?**
将来の用途を見据えて。L6 で実装する O(1) の高速な注文キャンセル（cancel-by-id）に `HashMap<OrderId, RestingOrder>` を使う。いま `Hash` を足しておけば、後から派生（derive）の連鎖でコードを書き直す churn が起こらない。

**Q: なぜ `Side` に `PartialOrd + Ord` を付けないのか?**
「Buy は Sell より小さい?」という問いそのものが、ドメインとして無意味だから。`Ord` を derive してしまうと、caller が `if side < Side::Sell { ... }` と書けてしまう。これは enum の定義順という artifact による順序付けに過ぎず、semantic な意味は持たない — バグの温床になる。trait を外しておけば、caller は `match` か `==` の使用を型システムから強制される。

**Q: なぜ `opposite()` に `#[must_use]`?**
`side.opposite();` のように戻り値を変数に代入し忘れるコードは、ほぼ確実にバグだから。`opposite()` は自分自身を mutate せず、新しい `Side` を返す純粋関数だ。`#[must_use]` を付けておくと、戻り値が無視された場合にコンパイラが warning を出す。副作用なしで値を返すだけの関数すべてに有効なプラクティス。

## 次のレッスン (L2)

Field-level 型 — atomic な部品 — がそろった。L2 ではそれらを組み合わせる **record-level 型** を build する: `Order` (matching engine への入力)、`Fill` (出力)、`FillResult` (fills と remaining-quantity 情報を bundle する wrapper)。L2 完了後、型の語彙が完成する。L3 以降ではこれらの型を使って実際の matching state machine を build していく。
````

---

## Seed ファイルスロット

L1 は Module 1 (CLOB 型) sortOrder 0 に入る:

```typescript
{
  title: 'レッスン 1 — CLOB の newtype、Side、OrderType',
  slug: 'openhl-clob-types-newtype-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 25,
  xpReward: 60,
  content: `# レッスン 1 — CLOB の newtype、\`Side\`、\`OrderType\`\n\n...`
},
```

## SHA pinning 規律

L1 が参照する openhl コミット (§答え合わせ):
- `55a9dff` (Stage 8a — CLOB pure state machine — Stage 8a が 1 つの大きな commit なので L1-L8 全部でこれを cite)

L1 段階での `55a9dff` に対する diff は部分的になる (newtype + Side + OrderType のみ、record はまだ)。L2 が record 型を埋める。
