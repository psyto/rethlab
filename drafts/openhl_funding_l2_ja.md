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

このレッスンが終わると：

```bash
cargo build -p openhl-funding
```

…が引き続きコンパイルされる。`types.rs` が `RATE_SCALE` だけから `RATE_SCALE` + 4 つの newtype に成長：

- **`MarkPrice(pub u64)`** — 永久先物の mark price、最小単位。価格は負になりえないので unsigned。
- **`IndexPrice(pub u64)`** — オフチェーンオラクル参照価格。同じ形、違う*意味*。
- **`Premium(pub i64)`** — 符号付き `(mark - index) / index`、`RATE_SCALE` スケール。Longs が overpay のとき正。
- **`Notional(pub i64)`** — 符号付き quote-currency delta。正 = アカウント受取、負 = 支払い。

それぞれ `Copy + Default + PartialEq + Eq + PartialOrd + Ord + Hash + Debug`。まだテストなし — これらの型はラッパー以上の挙動を持たない。**L4 の `compute_premium` がこれらの型をバグを含みうるコードで初めて exercise するレッスン。**

このレッスンの教育要点は数学ではない — **newtype パターン**。なぜ `u64` を直接使わずラップするか？ L2 がその答えを 4 つの具体型で実演する。

## おさらい

L1 後：
- `RATE_SCALE = 1_000_000_000` が load-bearing 定数。
- `types.rs` が module doc + `RATE_SCALE` で存在。
- `lib.rs` がクレートルートで `RATE_SCALE` を re-export。

L2 で `types.rs` を実際の型の最初の半分（「money」の半分）で埋める。L3 が後半（position、settlement、params）を埋める。

## プラン

2 つの編集：

1. **`crates/funding/src/types.rs`** — `RATE_SCALE` の後ろに 4 つの newtype を append。Doc コメントが各型の役割 + encode する不変条件を説明。
2. **`crates/funding/src/lib.rs`** — `pub use types::{...}` 行を 4 つの新型を re-export するよう拡張。

それだけ。`compute.rs` なし、`clock.rs` なし、テストなし。**純粋な型定義。**

> 🛑 **考えてみよう。** スクロール前に — 今から `pub struct MarkPrice(pub u64);` を定義する。なぜ内部フィールドが `pub`？ Private にして `#[must_use] pub fn new(v: u64) -> Self` コンストラクタにしたらどうなる？ ヒント：`compute.rs` の呼び出し側が何を必要とするかを考える。

（答え：**`compute.rs` の呼び出し側が生値で演算する必要がある** — `i128::from(mark.0) - i128::from(index.0)`。フィールドを private + `.value()` getter にすると、どこでも `mark.0` でなく `mark.value()` を要求する。**`pub` 内部フィールドは、純粋にクロスフィードを防ぐためだけに存在する newtype に対する openhl 慣習** — 検証なし、型システム以上の不変条件なし。`clob::Price(pub u64)` と `clob::Qty(pub u64)` を比較 — 同じ形、同じ理由。**Newtype の仕事は `compute_premium(index, mark)` を型エラーにすること、値を検証することではない。**）

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

4 つの型、各 ~5 行。各々に焼き込まれたものを順に：

#### `MarkPrice(pub u64)` — 符号付き価格に反対する立場

なぜ `i64` でなく `u64`？ Funding 数学に*負の価格*は意味を持たないから。Spot や perp 価格がゼロを下回るのは、funding crate に到達してはいけないシステム不変条件違反 — もし到達したら、正しい対応は「上流レイヤーが壊れている、停止して調査」、「負の価格に対して funding を計算する」ではない。

Doc がそれを明示：*「zero or negative price would be a system invariant violation handled upstream, not here」*。ここに線を引くのが正しい。**Funding crate は入力が well-formed と信頼する、再検証しない。** どこでも再検証はよくある over-engineering の間違い。Funding crate の仕事は数学であって入力サニタイゼーションではない。

> 🛑 **やりがちな勘違い。** 「せめて `MarkPrice(0)` でエラーを返すべきでは？」 **No。** `MarkPrice(0)` は「genuinely zero spot price を持つアセット」（極端 tail、稀だが現実）か「オラクルがまだ価格を配信していない」（boot state）のどちらかでありえる。Compute_premium が後者を明示的に扱う（`index == 0` のとき `Premium(0)` を返す）。前者は十分稀で、正しい行動は zero funding を settle すること — それが `compute_premium` が自然に生むもの。**Error path 不要。**

#### `IndexPrice(pub u64)` — 同じ形、違う*意味*

`IndexPrice` は構造的に `MarkPrice` と同一。同じフィールド、同じ derive、同じ範囲。**違いは純粋に型システム上のもの。** 関数シグネチャ `compute_premium(mark: MarkPrice, index: IndexPrice) -> Premium` は `compute_premium(IndexPrice(100), MarkPrice(100))` をコンパイル時に拒否する。Newtype なしだと両引数が `u64`、引数順バグは静かに反転した premium を生む。

**これが newtype パターンの存在意義そのもの。** 型あたり ~5 行のコストで、*production まで invisible だったはずのバグクラス*を防ぐ。

> 🛑 **やりがちな勘違い。** 「型エイリアスでよくない？ `type MarkPrice = u64; type IndexPrice = u64;`」 **No — 型エイリアスは新しい型を作らない**、既存の型をリネームするだけ。`type MarkPrice = u64` と `type IndexPrice = u64` は両方 `u64`、`compute_premium(some_index, some_mark)` が静かにコンパイルする。**型エイリアスは documentation、安全性ではない。** 可読性が落ちる長いジェネリック型に使う（`type FillSink = Arc<Mutex<Vec<Fill>>>`） — 意味的に異なる値を区別するためではない。

#### `Premium(pub i64)` — なぜ符号付きか

Mark < index のとき premium は負になりうる（shorts が overpay）。符号付き表現は残りの数学を明示的な符号処理なしで流れさせる：`compute_premium` が符号付き数を返す、`compute_rate` がそれを除算 + clamp、`apply_funding` が settlement に乗算。**どこの時点でも「これはどっち向き？」をチェックする必要がない** — 符号が答えを運ぶ。

Doc が言う：*「Sign convention: positive when mark > index (longs are overpaying, funding will be positive → longs pay shorts)」*。これは load-bearing な行。下流コードを読む人はこの規約を覚える必要がある。**符号規約を名指す doc コメントが、「正しい数学」と「毎回再導出する必要のある数学」を分ける。**

#### `Notional(pub i64)` — *アカウント*視点で符号付きの quote-currency delta

`Notional` は単一の settlement での単一アカウントの quote balance への変化を表す。符号規約：*正 = アカウント受取、負 = アカウント支払い*。だから正の funding rate でロングポジションは `Notional(負)`、ショートポジションは `Notional(正)` を生む。

**符号はアカウント視点**、市場視点ではない。これは bridge integration レイヤー（course 10）で重要になる — `Notional(-12)` が「このアカウントの quote balance から 12 を引く」になる。Market 中心の符号なら bridge が適用前にフリップする必要がある。

### Step 2: `lib.rs` re-export を更新

`crates/funding/src/lib.rs` を開く。現在の `pub use` 行：

```rust
pub use types::RATE_SCALE;
```

これに変更：

```rust
pub use types::{IndexPrice, MarkPrice, Notional, Premium, RATE_SCALE};
```

import はアルファベット順 — Stage 8b の lib.rs と同じ。呼び出し側は：

```rust
use openhl_funding::{MarkPrice, IndexPrice};
```

と書ける。これでなく：

```rust
use openhl_funding::types::{MarkPrice, IndexPrice};
```

**呼び出し側が実際に使うものはすべてクレートルートで re-export。** モジュールパスは内部。

> 🛑 **やりがちな勘違い。** 「`pub use types::*` で全部 re-export すれば？」 **できる、だが内部型リストが public API surface に漏れる。** 今 `types.rs` に 4 つの型がある。将来 `internal_FillSinkCachedView` のような private helper を追加して `pub` 修飾を忘れたら、`pub use types::*` が静かにそれを露出させる。**Explicit re-export が public API のチェックリスト。** 各 re-export 名が意図的な決定。

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

Rustdoc warning が 2 つに（L1 の 3 つから減少）。`RATE_SCALE` の doc の `[Premium]` リンクが解決、`[FundingRate]` と `[FundingClock]` リンクはまだ未解決。**期待通りの進捗** — L3 が `FundingRate` を追加して 2 つ目の warning を解消する。

よくあるエラー：

- **`error[E0381]: missing field 'value' in initializer of MarkPrice`** — 内部フィールドの `pub` を忘れて `MarkPrice(pub u64)` でなく `MarkPrice { value: u64 }` と書いた。openhl 慣習通り tuple-struct 形式を使う。
- **`error[E0277]: 'i64' is not 'u64'`** — `Premium(pub i64)` でなく `Premium(pub u64)` と書いた。Premium は符号付き、内部型をチェック。
- **Derive が欠ける** — derive の 1 つを忘れた。完全な集合は `Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash`。`Default` は L4 fixture builder の一部が `MarkPrice::default()` を使うので必要。

## 設計の振り返り

このレッスンに焼き込まれた決定 3 つ：

1. **生プリミティブや型エイリアスでなく newtype パターン。** 型あたり ~5 行のコストで、見えない引数順バグを compile time で防ぐ。**高コストバグクラスへの安価な保険。**

2. **公開内部フィールド（`pub u64`）。** 検証はこの crate の仕事ではない、クロスフィード防止が仕事。内部フィールドが `pub` なのは `compute.rs` で演算を ergonomic に保つため。**Newtype は型混乱から守る、悪い値からではない。**

3. **符号規約は型定義の doc コメントに住む。** 「Mark > index で正、longs が shorts に支払う」 — `Premium` の doc のこの文が符号規約の単一情報源。すべての consumer がそれに依存。**符号規約は数値型のうち最も誤記憶されやすい部分 — 定義場所の doc に pin する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

L2 後：
- **types.rs** が Stage 8b の `Notional` まで一致（最初の 4 newtype）。次の型 — `FundingRate`、`PositionSize`、`Position`、`Settlement`、`FundingParams` — は L3。
- **lib.rs** に 4 型の re-export。Stage 8b の完全な re-export はあと 5 つの名前を加える（`FundingParams`、`FundingRate`、`Notional` は既にある、`Position`、`PositionSize`、`Settlement`）。全部 L3。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: なぜ `MarkPrice` / `IndexPrice` は `u64` だが `Premium` / `Notional` は `i64`？**
価格は常に正だから（負の価格はシステム不変条件違反）、**だが premium と notional は負になりうる**。Mark < index のとき premium は負。アカウントが支払うとき（vs 受け取る）notional delta は負。符号付き整数が両方向を自然に表現する、符号なしだと別の「方向」フィールドか型のペアが必要。

**Q: これらの型に `Default` がある理由は？ デフォルト値がいつ有用？**
`Default::default()` は `MarkPrice(0)`、`Premium(0)` 等を返す。Test fixture で有用：`let mark: MarkPrice = Default::default();` は `MarkPrice(0)` より短い。これらの型を使う containing struct に `#[derive(Default)]` を可能にする。**安価な derive、挙動コストなし。**

**Q: `Premium` と `Notional` は `Add` / `Sub` / `Mul` を実装すべき？**
誘惑的 — `Premium(5) + Premium(3) == Premium(8)` は綺麗。だが Stage 8b は実装しないことを選んだ：`compute.rs` の数学演算は overflow safety のため `i128` に upcast する必要がある、`Premium` に `Add` を提供すると呼び出し側がそれを i128 ダンスなしで使う誘惑が出る。**Crate の API 契約は：内部フィールドで明示的な i128 upcast 付きで演算する。** 型に演算 op がないほうがその契約を強制しやすい。

**Q: なぜこれらの型のテストがない？**
何を assert する？ `assert_eq!(MarkPrice(100), MarkPrice(100))` は `PartialEq`（derive）をテストする。`assert_eq!(MarkPrice(100).0, 100)` は pub フィールド（言語機能）をテストする。**プリミティブをラップするだけの newtype に testable な挙動はない。** L4 の `compute_premium` でこれらの型がバグを含みうるコードに参加し始める。

## 次のレッスン（L3）

L3 で型の roster を完成：`FundingRate(i64)`、`PositionSize(i64)`、`Position { account, size }`、`Settlement { account, delta }`、`FundingParams { interval_secs, rate_cap, divisor }`。教育の焦点が「newtype パターン」から「パラメータオブジェクトパターン」（`FundingParams`）と **HL スタイルのデフォルト** — なぜ 1 日 8 settlement、なぜ 4% cap — にシフト。`Position` 構造体が L1 の Cargo.toml で設定した `openhl_clob` の `AccountId` 依存を導入する。
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
