# Building OpenHL Funding — L2 draft (JA) — build-along

> openhl SHA `cd94137`（Stage 8b — funding state machine）に対するドラフト。
> コース: `building-openhl-funding-ja`（track: `reth-l1-architect`）。

---

## L2 — `openhl-funding-money-types-ja`

- **Module:** 1 (Determinism + 型), sortOrder 1
- **Course-level sortOrder:** 2 (lesson 3 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# レッスン 2 — Money 型 — price、premium、notional の newtype

## ゴール

このレッスンで掴む概念:

- **Newtype による引数順バグ防止** — `u64` を `MarkPrice` と `IndexPrice` という別型でラップすると、`compute_premium(index, mark)` が production まで届く invisible bug ではなくコンパイルエラーになる。
- **型エイリアスは「型」ではない** — `type MarkPrice = u64` はドキュメントであって安全性ではない。引数を入れ替えてもコンパイルは通る。別アイデンティティが必要なら `struct MarkPrice(pub u64)` を選ぶ。
- **内部フィールドを `pub` にする理由** — このレッスンの newtype はクロスフィード防止が目的で、値の検証が目的ではない。`pub` にしておけば `compute.rs` の演算が `mark.0` のままで書ける（`mark.value()` 経由にならない）。検証はこの crate の仕事ではない。
- **符号の有無はドメインの意味で決める** — `MarkPrice` / `IndexPrice` が `u64` なのは「負の価格 = 上流の不変条件違反」だから。`Premium` / `Notional` が `i64` なのは方向もデータの一部だから。
- **符号規約は型定義の doc コメントに pin する** — `Premium` の定義に「正 = mark > index、longs が shorts に支払う」と書いてあることが、下流のすべての consumer にとっての single point of truth になる。

検証：

```bash
cargo build -p openhl-funding
```

上記の実行結果が引き続きコンパイルを通る。

具体的な変更:

`types.rs` は `RATE_SCALE` だけだった状態から、`RATE_SCALE` + 4 つの newtype を持つ状態へと育つ：

- **`MarkPrice(pub u64)`** — 永久先物の mark price を最小単位で持つ。価格は負になりえないので unsigned。
- **`IndexPrice(pub u64)`** — オフチェーン oracle の参照価格。形は同じだが*意味*は別。
- **`Premium(pub i64)`** — 符号付き `(mark - index) / index` を `RATE_SCALE` スケールで持つ。Longs が overpay のとき正。
- **`Notional(pub i64)`** — 符号付き quote-currency delta。正 = アカウントの受取、負 = 支払い。

それぞれに `Copy + Default + PartialEq + Eq + PartialOrd + Ord + Hash + Debug` を付ける。テストはまだない — ラッパー以上の挙動を持たないからだ。**L4 の `compute_premium` が、これらの型がバグを含みうるコードで exercise される最初のレッスンになる。**

このレッスンの教育上の要点は数学ではない — **newtype パターン**だ。なぜ `u64` を直接使わずにラップするのか。L2 ではその答えを、4 つの具体的な型で実演する。

## おさらい

L1 後の状態：
- `RATE_SCALE = 1_000_000_000` が load-bearing な定数として置かれている。
- `types.rs` には module doc と `RATE_SCALE` がある。
- `lib.rs` がクレートルートで `RATE_SCALE` を re-export している。

L2 では `types.rs` を、実際の型の前半（「money」側の半分）で埋めていく。後半（position、settlement、params）は L3 で埋める。

## プラン

編集は 2 つ：

1. **`crates/funding/src/types.rs`** — `RATE_SCALE` の後ろに 4 つの newtype を追加する。Doc コメントで各型の役割と encode する不変条件を説明する。
2. **`crates/funding/src/lib.rs`** — `pub use types::{...}` 行を、新しい 4 型も re-export するよう拡張する。

これだけ。`compute.rs` も `clock.rs` もテストもない。**純粋な型定義のみだ。**

> 🛑 **考えてみよう。** スクロール前に — これから `pub struct MarkPrice(pub u64);` を定義する。内部フィールドを `pub` にしている理由は何か。private にして `#[must_use] pub fn new(v: u64) -> Self` コンストラクタを置いたらどうなるか。ヒント：`compute.rs` の呼び出し側が何を必要とするかを考えよ。

（答え：**`compute.rs` の呼び出し側が生値で演算する必要があるからだ** — `i128::from(mark.0) - i128::from(index.0)` のように。フィールドを private にして `.value()` getter を置くと、どこでも `mark.0` の代わりに `mark.value()` を書く羽目になる。**`pub` な内部フィールドは、クロスフィード防止のためだけに存在する newtype に対する openhl の慣習だ** — 検証なし、型システム以上の不変条件なし。`clob::Price(pub u64)` や `clob::Qty(pub u64)` と比べてみてほしい — 同じ形、同じ理由だ。**Newtype の仕事は `compute_premium(index, mark)` を型エラーにすることであって、値を検証することではない。**）

## 手順

### Step 1: 4 つの newtype を `types.rs` に append

`crates/funding/src/types.rs` を開く。既存の `RATE_SCALE` 定数の後ろに追加：

```rust
/// Mark price in minor units. Same scale convention as `clob::Price`, but a
/// distinct type so callers can't accidentally feed an orderbook price into
/// the funding math where an index/oracle price is expected.
///
/// `MarkPrice` is a single u64 not a signed-fixed-point, because prices are
/// always positive (zero or negative price would be a system invariant
/// violation handled upstream, not here).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MarkPrice(pub u64);

/// Index price (off-chain oracle reference). Same scale as `MarkPrice`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct IndexPrice(pub u64);

/// Premium = `(mark - index) / index`, scaled by [`RATE_SCALE`].
///
/// Sign convention: positive when mark > index (longs are overpaying,
/// funding will be positive → longs pay shorts).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Premium(pub i64);

/// Signed quote-currency delta. Positive = account receives, negative =
/// account pays. Funding settlement produces one [`Notional`] per non-flat
/// position per tick.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Notional(pub i64);
```

4 つの型、それぞれ ~5 行。1 つずつ、何が焼き込まれているかを見ていく：

#### `MarkPrice(pub u64)` — 符号付き価格を採らない立場

なぜ `i64` ではなく `u64` なのか。Funding の数学において*負の価格*は意味を持たないからだ。Spot や perp の価格がゼロを下回るのは、funding crate に到達してはならないシステム不変条件違反だ — もし到達したら、正しい対応は「上流レイヤーが壊れている、停止して調査」であって、「負の価格に対して funding を計算する」ではない。

Doc にもこれを明記してある：*「zero or negative price would be a system invariant violation handled upstream, not here」*。ここに線を引くのが正しい。**Funding crate は入力が well-formed であることを信頼し、再検証はしない。** どこでも再検証するのは典型的な over-engineering だ。Funding crate の仕事は数学であって、入力のサニタイズではない。

> 🛑 **やりがちな勘違い。** 「せめて `MarkPrice(0)` ではエラーを返すべきでは？」 **不要だ。** `MarkPrice(0)` は「本当にゼロの spot price を持つアセット」（極端な tail、稀だが現実にはある）か、「oracle がまだ価格を配信していない」（boot state）かのどちらかでありうる。後者は `compute_premium` が明示的に扱う（`index == 0` のときは `Premium(0)` を返す）。前者は十分稀で、正しい挙動は zero funding を settle することだ — それは `compute_premium` が自然に生む結果でもある。**エラーパスは要らない。**

#### `IndexPrice(pub u64)` — 同じ形、別の*意味*

`IndexPrice` は構造的には `MarkPrice` と同一だ。同じフィールド、同じ derive、同じ範囲。**違いは純粋に型システム上のものでしかない。** 関数シグネチャ `compute_premium(mark: MarkPrice, index: IndexPrice) -> Premium` は、`compute_premium(IndexPrice(100), MarkPrice(100))` をコンパイル時に拒否する。Newtype なしだと両引数とも `u64` で、引数順のバグが静かに反転した premium を生んでしまう。

**これこそが newtype パターンの存在意義そのものだ。** 型あたり ~5 行のコストで、*production に出るまで見えなかったはずのバグクラス*を防げる。

> 🛑 **やりがちな勘違い。** 「型エイリアスでよくない？ `type MarkPrice = u64; type IndexPrice = u64;`」 **だめだ — 型エイリアスは新しい型を作らない**、既存の型をリネームするだけだ。`type MarkPrice = u64` と `type IndexPrice = u64` はどちらも `u64` のままで、`compute_premium(some_index, some_mark)` は静かにコンパイルが通る。**型エイリアスは documentation のためのものであって、安全性のためのものではない。** 可読性が落ちる長いジェネリック型（`type FillSink = Arc<Mutex<Vec<Fill>>>` など）に使うもので、意味的に異なる値を区別するためのものではない。

#### `Premium(pub i64)` — なぜ符号付きか

Mark < index のとき premium は負になりうる（shorts が overpay している状態）。符号付き表現にしておけば、残りの数学を明示的な符号処理なしで流せる：`compute_premium` が符号付きの値を返し、`compute_rate` がそれを割って clamp し、`apply_funding` が settlement に掛ける。**どの段階でも「これはどっち向きか？」をチェックする必要はない** — 符号が答えを運んでくれる。

Doc にはこう書いてある：*「Sign convention: positive when mark > index (longs are overpaying, funding will be positive → longs pay shorts)」*。これは load-bearing な一文だ。下流のコードを読む人は、この規約を覚えておく必要がある。**符号規約を明示する doc コメントが、「正しい数学」と「毎回導出し直す必要のある数学」を分ける。**

#### `Notional(pub i64)` — *アカウント*視点で符号付きの quote-currency delta

`Notional` は、ある settlement における単一アカウントの quote balance の変化量を表す。符号規約は*正 = アカウントの受取、負 = アカウントの支払い*。だから正の funding rate のもとでは、long position は `Notional(負)` を、short position は `Notional(正)` を生む。

**符号はアカウント視点**であって、市場視点ではない。これは bridge integration レイヤー（course 10）で効いてくる — `Notional(-12)` がそのまま「このアカウントの quote balance から 12 を引く」になる。市場中心の符号にしていたら、bridge が適用前に符号を反転させる必要が出てくる。

### Step 2: `lib.rs` re-export を更新

`crates/funding/src/lib.rs` を開く。現在の `pub use` 行：

```rust
pub use types::RATE_SCALE;
```

これに変更：

```rust
pub use types::{IndexPrice, MarkPrice, Notional, Premium, RATE_SCALE};
```

import はアルファベット順にする — Stage 8b の lib.rs に揃える形だ。これで呼び出し側は：

```rust
use openhl_funding::{MarkPrice, IndexPrice};
```

と書ける。次のように書く必要はない：

```rust
use openhl_funding::types::{MarkPrice, IndexPrice};
```

**呼び出し側が実際に使うものは、すべてクレートルートで re-export する。** モジュールパスは内部用だ。

> 🛑 **やりがちな勘違い。** 「`pub use types::*` で全部まとめて re-export すれば？」 **可能だが、内部型のリストがそのまま public API の surface に漏れる。** 今 `types.rs` には 4 型しかない。将来 `internal_FillSinkCachedView` のような private helper を追加して `pub` を付け忘れた瞬間、`pub use types::*` が静かにそれを公開してしまう。**Explicit な re-export は public API のチェックリストでもある。** re-export する名前 1 つ 1 つが意図的な決定になる。

### Step 3: コンパイル

```bash
cargo build -p openhl-funding
```

期待出力：

```
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to `FundingRate`
warning: unresolved link to `FundingClock`
    Finished `dev` profile [unoptimized + debuginfo] in 0.4s
```

Rustdoc warning は 2 つに減る（L1 では 3 つだった）。`RATE_SCALE` の doc にある `[Premium]` リンクが解決し、`[FundingRate]` と `[FundingClock]` のリンクはまだ未解決のままだ。**進捗としては期待通り** — L3 で `FundingRate` を追加すれば 2 つ目の warning も消える。

よくあるエラー：

- **`error[E0381]: missing field 'value' in initializer of MarkPrice`** — 内部フィールドに `pub` を付け忘れた、もしくは `MarkPrice(pub u64)` ではなく `MarkPrice { value: u64 }` と書いた場合。openhl の慣習通り tuple-struct 形式を使うこと。
- **`error[E0277]: 'i64' is not 'u64'`** — `Premium(pub i64)` ではなく `Premium(pub u64)` と書いてしまった場合。Premium は符号付き、内部型を確認すること。
- **derive が足りない** — derive のどれかを書き忘れた場合。完全な集合は `Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash`。`Default` は L4 の fixture builder の一部が `MarkPrice::default()` を使うために必要だ。

## 設計の振り返り

このレッスンに焼き込んだ決定は 3 つ：

1. **生プリミティブや型エイリアスではなく newtype パターンを採る。** 型あたり ~5 行のコストで、見えない引数順バグをコンパイル時に防げる。**高コストなバグクラスに対する安価な保険だ。**

2. **内部フィールドを公開する（`pub u64`）。** 検証はこの crate の仕事ではなく、クロスフィード防止が仕事だからだ。内部フィールドを `pub` にしてあるのは、`compute.rs` での演算を ergonomic に保つためだ。**Newtype が守るのは型の取り違えからであって、値の不正からではない。**

3. **符号規約は型定義の doc コメントに置く。** 「Mark > index で正、longs が shorts に支払う」 — `Premium` の doc にあるこの一文が、符号規約の単一情報源だ。すべての consumer がここに依存する。**符号規約は数値型の中で最も記憶違いが起きやすい部分 — 定義場所の doc に pin しておく。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

L2 後の状態：
- **types.rs** が Stage 8b の `Notional` までと一致する（最初の 4 newtype）。次の型 — `FundingRate`、`PositionSize`、`Position`、`Settlement`、`FundingParams` — は L3 で追加する。
- **lib.rs** には 4 型の re-export が入る。Stage 8b の完全な re-export はあと 5 つの名前を追加することになる（`FundingParams`、`FundingRate` は新規、`Notional` は既にある、`Position`、`PositionSize`、`Settlement` も新規）。すべて L3 で追加する。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: なぜ `MarkPrice` / `IndexPrice` は `u64` で、`Premium` / `Notional` は `i64` なのか？**
価格は常に正だからだ（負の価格はシステム不変条件違反になる）。**一方で premium と notional は負になりうる。** Mark < index のとき premium は負になり、アカウントが（受け取るのでなく）支払うとき notional delta は負になる。符号付き整数は両方向を自然に表現できる。符号なしだと、別途「方向」フィールドや型のペアが必要になってしまう。

**Q: これらの型に `Default` を付ける理由は？ デフォルト値がいつ役に立つのか？**
`Default::default()` は `MarkPrice(0)` や `Premium(0)` などを返す。テストの fixture で便利だ：`let mark: MarkPrice = Default::default();` は `MarkPrice(0)` より短く書ける。これらの型を内部に持つ struct で `#[derive(Default)]` も可能になる。**安価な derive で、挙動上のコストはない。**

**Q: `Premium` と `Notional` に `Add` / `Sub` / `Mul` を実装すべきでは？**
誘惑的ではある — `Premium(5) + Premium(3) == Premium(8)` は綺麗だ。だが Stage 8b では実装しないことを選んだ：`compute.rs` の数学演算は overflow 対策で `i128` への upcast を要求する。`Premium` に `Add` を実装すると、呼び出し側が i128 ダンスなしで使ってしまう誘惑が生まれてしまう。**この crate の API 契約は「内部フィールドを取り出して明示的に i128 へ upcast してから演算する」だ。** 型に演算オペレータがないほうが、その契約を強制しやすい。

**Q: なぜこれらの型のテストがないのか？**
何を assert すればいい？ `assert_eq!(MarkPrice(100), MarkPrice(100))` は `PartialEq`（derive）のテストにしかならない。`assert_eq!(MarkPrice(100).0, 100)` は pub フィールド（言語機能そのもの）のテストにしかならない。**プリミティブをラップしただけの newtype には、テスト可能な挙動が存在しない。** L4 の `compute_premium` から、これらの型がバグを含みうるコードに登場し始める。

## 次のレッスン（L3）

L3 では型 roster を完成させる：`FundingRate(i64)`、`PositionSize(i64)`、`Position { account, size }`、`Settlement { account, delta }`、`FundingParams { interval_secs, rate_cap, divisor }`。教育の焦点は「newtype パターン」から「パラメータオブジェクトパターン」（`FundingParams`）と **HL スタイルのデフォルト** — 1 日 8 settlement の理由、4% cap の理由 — へとシフトする。`Position` 構造体は、L1 の Cargo.toml で設定した `openhl_clob` の `AccountId` 依存を実際に使い始める箇所でもある。
````

---

## Seed-file slot

L2 は Module 1 (Determinism + 型) の sortOrder 1 に入る：

```typescript
{
  title: 'レッスン 2 — Money 型 — price、premium、notional の newtype',
  slug: 'openhl-funding-money-types-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 2 — Money 型 — price、premium、notional の newtype\n\n...`
},
```

## SHA pinning discipline

L2 は `cd94137`（Stage 8b）を引用。L2 後、types.rs は Stage 8b の `Notional` まで一致。残り 5 型は L3。

## Style review notes (self-critique before paste)

- **§ゴールが L2 を「newtype パターンが教育要点」とフレーミング** — 読者が数学以外でレッスンが何を教えるかを見る。
- **§考えてみよう（`pub u64`）**が可視性選択を正当化 — private field がデフォルトの読者が arithmetic ergonomic な理由を見る。
- **§Step 1 walkthrough に 4 つの名前付きサブセクション** — 型ごと — 型ごとの理由付けを型定義の近くに保つ。
- **§やりがちな勘違い（型エイリアス）** が高価値な明確化 — Rust newcomer がこの正確なユースケースで型エイリアスを掴みがち。
- **§やりがちな勘違い（`pub use types::*`）**が便利 import 誘惑を先回り。
- **§やりがちな勘違い（`MarkPrice(0)` error path）**が over-validation 反射を先回り。
- **§設計の振り返り 1（"安価な保険"）**が「なぜ newtype」理由付けを結ぶ。
- **§よくある質問のテスト不要**が「すべてにテストを」反射を明示処理 — L1 の RATE_SCALE 質問と同じ形。
- **L3 プレビュー**がパラメータオブジェクトパターン + HL デフォルトの会話をセットアップ。
