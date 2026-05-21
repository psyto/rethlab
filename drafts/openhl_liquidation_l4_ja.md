# Building OpenHL Liquidation — L4 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) に対するドラフト。

````markdown
## L4 — `openhl-liquidation-notional-pnl-ja`

**Stage**: Stage 10a — `22eedf9`

**Title**: レッスン 4 — `notional_value` + `unrealized_pnl` — signed-multiplication のトリック

**Duration**: 45 分 · **XP**: 80

---

# レッスン 4 — `notional_value` + `unrealized_pnl` — signed-multiplication のトリック

## ゴール

このレッスンで掴む概念:

- **なぜ `notional_value` は `u64` を返し、`unrealized_pnl` は `i64` を返すか** — notional exposure は常に非負（`|size| × mark`）。PnL は signed（`mark − entry` は両側に振れる）。それぞれを return type で示すことで、呼び出しサイトでの sign-confusion バグをコンパイラが捕まえられる。
- **`i64` には `abs()` ではなく `unsigned_abs()`** — `i64::MIN.abs()` はオーバーフローする（正の `i64::MIN` は存在しない）。`unsigned_abs()` は `u64` を返し、panic しない。signed integer の magnitude が欲しいときは常にこれを使う。
- **分岐なしでロングとショートを処理する signed-multiplication のトリック** — `(mark − entry) × size`、`size` は signed。4 つの符号の組み合わせがすべて自然に正しい PnL に解決する。`if side == Long` はどこにもいらない。
- **i128 中間値の規律** — sign-preserving な減算（`i128::from(mark.0) − i128::from(entry.0)`）の後、overflow-safe な積、最後に `i64` に saturate して戻す。Funding の `compute_premium` と同じ形状。
- **`saturate_i128_to_i64` が load-bearing ヘルパー** — network-pathological な入力で `i64::MAX` を *超えうる* 積は、いつかは超える。Saturate であって panic ではない。

確認:

```bash
cargo test -p openhl-liquidation
```

…が 8 つのテストを pass する（`notional_value` 用 3 つ + `unrealized_pnl` 用 5 つ）。

具体的な変更:

- **`crates/liquidation/src/compute.rs` を作成** — このファイルはまだ存在しない。モジュール docs + imports + 2 つの公開関数 + 1 つの private ヘルパー + 8 つの unit test を入れた `#[cfg(test)]` ブロック。
- **`src/lib.rs`** — `pub mod compute;` を追加し、re-export に `notional_value` と `unrealized_pnl` を加える。

L4 はテストが走る最初のレッスンだ。ここから各レッスンが L8（`close_order_spec`、Stage 10a 挙動の最後）までテストを追加していく。

## おさらい

L3 の後:
- Types モジュールは Stage 10a に対して byte-for-byte 完成 — `MARGIN_SCALE`、`LiquidationParams`、`MarginRatio`、`MarginHealth`、`AccountSnapshot`、`CloseOrderSpec`。
- Compute モジュールはまだ存在しない。
- `cargo build` は pass する。`cargo test` はゼロ件走る。

L4 で compute モジュールを作成する。最初の 2 関数が「このアカウントは *現在* どう見えるか?」 — その notional exposure と unrealized PnL — に答える。L5 ではその上に equity と margin ratio を build する。

## 計画

2 つの編集:

1. **`crates/liquidation/src/compute.rs` を作成** — モジュール docs + L1-L3 から `AccountSnapshot`、`MarkPrice` を import する `use` 文 + `notional_value` + `unrealized_pnl` + private な `saturate_i128_to_i64` ヘルパー + `#[cfg(test)]` テストブロック（notional 3 個 + PnL 5 個）。
2. **`src/lib.rs` を更新** — `pub mod compute;` を追加し、公開 re-export を 2 つの新関数名で拡張する。

> 🛑 **予測。** スクロール前に: `unrealized_pnl` は long が profit のときも short が profit のときも *正* を返す必要がある。素朴な形は:
>
> ```rust
> if size > 0 {  // long
>     (mark - entry) * size.abs()
> } else {       // short
>     (entry - mark) * size.abs()
> }
> ```
>
> これは動くが分岐する。**4 つの符号の組み合わせをすべて `if` なしで正しく扱う single-expression の式がある。** 何か? ヒント: `(mark - entry) * size` という式で、`size` 自体が long/short の符号を運んでいたら何が起きるか考える。

（答え: **`(mark − entry) × size`、`size` は signed `i64`。** 4 ケースを辿る:
- Long（`size = +10`）、mark > entry: 正 × 正 = 正の profit ✓
- Long（`size = +10`）、mark < entry: 負 × 正 = 負の loss ✓
- Short（`size = −10`）、mark > entry: 正 × 負 = 負の loss ✓
- Short（`size = −10`）、mark < entry: 負 × 負 = 正の profit ✓

すべてのケースで符号が正しく着地する。**分岐なし、2 つのコードパスを別々にテストする必要なし、誰かが片方の分岐だけ「直して」もう片方を放置するリスクなし。** これが `PositionSize` を signed にした load-bearing な理由 — 型が long/short の区別を運ぶので、演算が運ぶ必要がない。）

## 手を動かす walk-through

### Step 1: `src/compute.rs` を作成

`crates/liquidation/src/compute.rs` を作成する。このファイルはまだ存在しない。初期内容:

```rust
//! Pure liquidation math.
//!
//! Six building blocks, all stateless:
//!   - [`notional_value`] — `|size| × mark`, the exposure in quote units
//!   - [`unrealized_pnl`] — `(mark − avg_entry) × size`, signed
//!   - [`account_equity`] — `collateral + unrealized_pnl`, can be negative
//!   - [`margin_ratio`] — `equity / notional`, scaled by [`MARGIN_SCALE`]
//!   - [`margin_health`] — classify the account against the params
//!   - [`close_order_spec`] — generate the close order for a liquidatable
//!     account
//!
//! Each function is deterministic and saturates on overflow rather than
//! wrapping or panicking. Validators that disagree about a margin
//! classification fork the chain, so the failure mode at network-
//! pathological inputs has to be bounded behavior.

use crate::types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
use openhl_clob::{Qty, Side};
use openhl_funding::MarkPrice;
```

モジュール doc には 6 つの関数を挙げているが、L4 で着地するのはその 2 つだけ。次の 4 つ（`account_equity`、`margin_ratio`、`margin_health`、`close_order_spec`）は L5–L7 で来る。6 つすべてを前もって挙げておけば、レッスンごとにモジュール doc を編集し直さずに済む。文脈なしでここに辿り着いた読者にとってのロードマップにもなる。

> 🛑 **やりがちな勘違い。** 「L4 は `AccountSnapshot` と `MarkPrice` しか使わないのに、なぜ `CloseOrderSpec`、`Side`、`Qty`、`LiquidationParams`、`MarginHealth`、`MarginRatio` を import するのか?」 **次のすべてのレッスンが使うから — まとめて L4 で import を追加しておけば、各レッスンの diff が追加される関数だけにフォーカスされる。** Rust は L5+ まで unused import warning を出す。Funding L1 が後から来る型の rustdoc warning を許容したのと同じ要領でそれを許容する。代替案 — `use` 行を L4–L7 で 6 回編集する — は busywork で、各レッスンが実際に何を加えているのかを曖昧にする。

### Step 2: `notional_value` を追加

import の下に追加:

```rust
/// Notional exposure of the account = `|position_size| × mark`, in quote
/// units. Returns `0` for a flat position (no exposure regardless of mark).
///
/// `u64::saturating_mul` clips at `u64::MAX` for network-pathological
/// `position_size × mark` products. Real deployments are bounded by upstream
/// position-size limits; the saturation here is the second line of defense.
#[must_use]
pub fn notional_value(snapshot: &AccountSnapshot, mark: MarkPrice) -> u64 {
    let abs_size = snapshot.position_size.0.unsigned_abs();
    abs_size.saturating_mul(mark.0)
}
```

この 7 行の関数で気づくべき 3 点:

1. **Return type は `u64`、`i64` ではない。** Notional は exposure の *magnitude* — 常に非負。`u64` を返すことで「呼び出し側が abs を取り忘れた?」を不可能にする: 型システムがそれを強制する。Notional を signed な計算（L5 の `margin_ratio` の割り算など）に流したい呼び出し側は、呼び出しサイトで明示的な `i64::from(notional_value(...))` を行う。**変換は 1 行。それで防げるのは production まで生き残る silent な sign error の一群。**

2. **`snapshot.position_size.0.unsigned_abs()`、`.abs()` ではない。** `i64::abs` は `i64` を返す — そして `i64::MIN.abs()` は safe Rust で未定義（debug で panic、release で wrap）。`unsigned_abs` は `u64` を返し、`i64::MIN` を含むあらゆる入力に対して定義されている（`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808`）。**Signed integer の magnitude が必要なら常に `unsigned_abs` を使う。`abs` は値が `MIN` になりえないと確信できるときだけにする。**

3. **`u64::saturating_mul`、`u64::checked_mul` ではない。** 両方ともオーバーフローを検出する。`saturating_mul` はオーバーフロー時に `u64::MAX` を返し、`checked_mul` は `None` を返す。`Option<u64>` を返すと、L5 の margin_ratio 等のすべての呼び出し側に *network-pathological な入力でのみ* 起きる `None` を処理させてしまう。Saturating は、極端な入力で数学的に間違ってはいるが使える値を返す — そしてその極端な入力では margin engine はどのみちそのアカウントを `Liquidatable` と分類する。**「間違っているが bounded」が「Option を処理しなければならない」を上回るときの正しい failure mode は saturation。**

### Step 3: `unrealized_pnl` を追加

`notional_value` の下に追加:

```rust
/// Unrealized PnL = `(mark − avg_entry) × position_size`, in quote units.
/// Positive = profit, negative = loss.
///
/// Sign convention follows the natural signed multiplication:
///   - Long position (size > 0) profits when `mark > entry` → positive
///   - Long position loses when `mark < entry` → negative
///   - Short position (size < 0) profits when `mark < entry` → negative
///     times negative is positive
///   - Flat position (size = 0) → 0
#[must_use]
pub fn unrealized_pnl(snapshot: &AccountSnapshot, mark: MarkPrice) -> i64 {
    // diff = mark − entry, in i128 to preserve sign on subtraction.
    let diff = i128::from(mark.0) - i128::from(snapshot.avg_entry.0);
    // pnl = diff × size, in i128 to absorb the product's full range.
    let pnl = diff.saturating_mul(i128::from(snapshot.position_size.0));
    saturate_i128_to_i64(pnl)
}
```

気づくべき 4 点:

1. **`i128::from(mark.0) − i128::from(snapshot.avg_entry.0)`、`(mark.0 as i64) − (snapshot.avg_entry.0 as i64)` ではない。** `mark` も `entry` も `u64`。Rust で `u64 − u64` の結果が負になると panic する。先に `i64` にキャストすると、どちらかが `i64::MAX` を超えていればトップビットが失われる。先に `i128` にアップキャストすれば full range が保たれ、サプライズなしに負になりうる signed 結果が得られる。**必要だと思うより広くアップキャストする — コストはゼロ、安全性は莫大。**

2. **`saturating_mul` は `i128` 上。** `diff` が `u64::MAX`（≈ 2⁶⁴）に近く、`position_size` が `i64::MAX`（≈ 2⁶³）に近いと積は ≈ 2¹²⁷ — `i128` の `±2¹²⁷` 範囲内だが、極端な入力での `saturating_mul` は安価な防御。Funding と同じパターン。

3. **末尾の `saturate_i128_to_i64(pnl)`。** 積の後は PnL は i128 領域にあるかもしれないが、下流のエンジンは `i64` を使う。変換失敗時に panic ではなく saturate するヘルパー — 同じ規律。（ヘルパー定義は Step 4。）

4. **Sign convention が doc に書かれている。** 4 ケース列挙（「Long は mark > entry のとき profit」）は、レビュアーが「待って、これは short でも動くの?」と聞いたときの正典的参照。数学が construction で正しいが、doc が *なぜ* かを言う — 読者がそのたびにメンタルウォークする必要がない。

> 🛑 **やりがちな勘違い。** 「`(mark.0 as i64 − entry.0 as i64) × size` を直接やってはダメか?」 **3 つの問題。** (1) `mark` か `entry` が `i64::MAX` を超えると、キャストが静かに wrap する — トップビットが符号ビットになる。(2) 両方が i64 に収まっても、片方が `i64::MIN` 近くで他方が正だと、i64 での減算がオーバーフローしうる。(3) 各オペランドが収まっていても、積 `(mark − entry) × size` が i64 を超えうる — `i64::MAX` サイズのポジションに対する 1% の値動きで overflow する。**`as` キャストは本レッスンが武装解除する Rust の footgun。**

### Step 4: `saturate_i128_to_i64` ヘルパーを追加

`unrealized_pnl` の後に、private ヘルパーを追加:

```rust
/// Saturating cast from `i128` to `i64`. Used wherever an intermediate
/// product can exceed `i64::MAX` at network-pathological inputs.
/// Saturation, not wrapping — see the module-doc note on why panicking
/// would be a worse failure mode.
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
```

この 3 行のヘルパーで気づくべき 3 点:

1. **`pub` なし。** これは `compute.rs` の実装上の選択。公開 API はモジュール doc に挙げた 6 関数。ヘルパーは本体をクリーンに保つために存在する。**他のモジュールの呼び出し側が本当に必要としない限り、ヘルパーは private に保つ。**

2. **`i64::try_from(v).unwrap_or(...)`。** `try_from` は値が収まらないときちょうど `Err` を返す。`unwrap_or` の分岐が saturation target を符号で選ぶ。`v > 0` なら値が大きすぎた（`i64::MAX` に saturate）。`v ≤ 0` なら小さすぎた（`i64::MIN` に saturate）。**3 行の演算、1 つの decision、typo 不可能。**

3. **ヘルパー自体のテストはない。** その挙動は `unrealized_pnl` のテストケース（happy-path と range の境界の両方を exercise する）を通じて網羅的にテストされる。ヘルパー専用のテストを足すのは冗長になる。

### Step 5: テストを追加

ヘルパーの下に `#[cfg(test)]` ブロックを追加:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use openhl_clob::AccountId;
    use openhl_funding::{Notional, PositionSize};
    use proptest::prelude::*;

    fn snapshot(size: i64, entry: u64, collateral: i64) -> AccountSnapshot {
        AccountSnapshot {
            account: AccountId(42),
            position_size: PositionSize(size),
            avg_entry: MarkPrice(entry),
            collateral: Notional(collateral),
        }
    }

    // ─── notional_value ───────────────────────────────────────────

    #[test]
    fn notional_long() {
        let s = snapshot(10, 100, 0);
        assert_eq!(notional_value(&s, MarkPrice(120)), 10 * 120);
    }

    #[test]
    fn notional_short_uses_abs() {
        let s = snapshot(-10, 100, 0);
        assert_eq!(notional_value(&s, MarkPrice(120)), 10 * 120);
    }

    #[test]
    fn notional_flat_is_zero() {
        let s = snapshot(0, 100, 1_000);
        assert_eq!(notional_value(&s, MarkPrice(120)), 0);
    }

    // ─── unrealized_pnl ───────────────────────────────────────────

    #[test]
    fn pnl_long_profit() {
        // Long 10 @ entry 100; mark 120 → +200
        let s = snapshot(10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(120)), 200);
    }

    #[test]
    fn pnl_long_loss() {
        // Long 10 @ entry 100; mark 80 → −200
        let s = snapshot(10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(80)), -200);
    }

    #[test]
    fn pnl_short_profit() {
        // Short −10 @ entry 100; mark 80 → +200 (price down is good for short)
        let s = snapshot(-10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(80)), 200);
    }

    #[test]
    fn pnl_short_loss() {
        // Short −10 @ entry 100; mark 120 → −200
        let s = snapshot(-10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(120)), -200);
    }

    #[test]
    fn pnl_flat_is_zero() {
        let s = snapshot(0, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(200)), 0);
    }
}
```

テストブロックで気づくべき 4 点:

1. **冒頭の `snapshot()` ヘルパー。** 3 つの整数引数（`size`、`entry`、`collateral`）— `account` は `AccountId(42)` にハードコード。8+ テストにわたってタイプ量を節約し、各テストの *意味のある* 入力（size の符号、entry と mark の関係）を見えるように保つ。**Test fixture は変動するものを露出し、定数を隠す。**

2. **4 つの PnL ケースが予測コールアウトの 4 つの符号の組み合わせと対応する。** `pnl_long_profit`、`pnl_long_loss`、`pnl_short_profit`、`pnl_short_loss`。加えて、size がゼロのパスを止める `pnl_flat_is_zero`。到達可能なすべての符号の組み合わせがテストされる。**符号の組み合わせの coverage が load-bearing — 1 つを見落とすと、将来のリファクタリングで side を静かに反転させてしまえる。**

3. **L4 に proptest はまだないのに `use proptest::prelude::*;`。** L5/L8 で proptest が追加されたとき、ここに既に import がある。`compute.rs` 本体の bulk imports と同じ推論 — 境界で 1 度書き、次の数レッスンで unused-import warning を許容する。

4. **テスト名は文。** `pnl_long_profit` は「PnL when long is in profit」と読める。テストが失敗したとき、失敗出力のテスト名が最初に目に入るもの — 本体を読まなくても何が壊れたか分かるくらい説明的にする。**`fn test_1`、`fn test_2` は CI noise。文断片の名前は CI signal。**

### Step 6: `src/lib.rs` を更新

`crates/liquidation/src/lib.rs` を開く。`pub mod compute;` を追加し、re-export を拡張する。元:

```rust
pub mod types;

pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
```

更新後:

```rust
pub mod compute;
pub mod types;

pub use compute::{notional_value, unrealized_pnl};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
```

2 つの変更:

1. **`pub mod compute;`** を `pub mod types;` の上に — アルファベット順、既存の慣例と同じ。
2. **`pub use compute::{notional_value, unrealized_pnl};`** — 新しい re-export 行で、`types` の re-export とは別。各モジュールが独自の行を持つ。L5–L7 でさらに関数が来たら compute リストを拡張する。

### Step 7: テストを走らせる

```bash
cargo test -p openhl-liquidation
```

期待される出力:

```
running 8 tests
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok

test result: ok. 8 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**この 8 つのテストが、signed-multiplication のトリックが各符号の組み合わせで動くことの証明だ。** あなた（あるいは将来の貢献者）が `unrealized_pnl` を refactor したとき、これらのテストが sign convention を honest に保つ。

エラーが出た場合に多い原因:

- **`warning: unused import: ...`** — まとめて追加した import について。期待通り、L7 までに消える。
- **`error[E0599]: no method named 'unsigned_abs' found for type 'i64'`** — Rust のバージョンが古すぎる。`unsigned_abs` は Rust 1.51（2021）で安定化された。プロジェクトの `rust-toolchain.toml` が十分新しいバージョンを pin しているはず。
- **`attempt to multiply with overflow` でテストが失敗する** — debug ビルドで `saturating_mul` ではなく `*` を書いた。置き換える。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **`notional_value: u64`、`unrealized_pnl: i64`。** Return type は不変量を signal する。Notional は決して負にならない。PnL は両側にいきうる。両者を混ぜたい呼び出し側コードは明示的な変換をする（`i64::from(notional)`）。**呼び出しサイトでの変換 1 行が、production まで生き残る silent な sign バグの一群に勝つ。**

2. **分岐ではなく signed-multiplication symmetry。** `(mark − entry) × size` は `size` が long/short の符号を運ぶので、4 つの符号の組み合わせすべてを正しく解決する。分岐する代替案（`if size > 0 { ... } else { ... }`）はコードパスを 2 つに分け、テスト予算を倍にし、将来のリファクタリングで「long branch を直すのを忘れて short branch を放置する」バグのリスクを生む。**演算が自然に扱うケースは、型システムに運ばせる。**

3. **`i64` には `abs` より `unsigned_abs`。** `i64::MIN.abs()` は Rust の正典的 footgun だ: debug で panic、release で silently wrap。`unsigned_abs` は `u64` を返し、すべての `i64` 入力に対して定義されている。**Panic path を持たない方の演算を選ぶ。代替案は debug でしか出ないクラッシュで、release ビルドが喜んで隠す。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L4 の後:
- **compute.rs** は Stage 10a の `compute.rs` の最初の ~80 行と一致する — モジュール doc + imports + `notional_value` + `unrealized_pnl` + ヘルパー + 最初の 8 テスト。下の部分（次の 4 関数とそのテスト、3 つの proptest）は L5–L7 で着地する。
- **lib.rs** は compute 側の 4 つの追加 re-export（`account_equity`、`margin_ratio`、`margin_health`、`close_order_spec`）がまだ欠けている。それらが順次到着する。

## よくある質問

**Q1: `notional_value` は `u64`、`mark` も `u64` — 積が `u64` を overflow しないか?**

しうる、network-pathological な入力で（`|size| × mark > 2⁶⁴` になるほど大きなポジション）。それを `saturating_mul` が防ぐ。現実的なマーケットではこれは起こらない — 取引所のポジションサイズ制限が notional を `u64::MAX` よりはるかに下に保つ。Saturation は第二の防衛線。第一は上流の sanity check。

**Q2: なぜ `saturate_i128_to_i64` ヘルパーは private で、`notional_value` と `unrealized_pnl` は public なのか?**

ヘルパーは実装上の選択（saturating cast）。2 つの public 関数はエンジンの契約の一部 — margin を計算するすべてのコールサイトが必要とする。**Public は「呼び出し側がこれに依存する」。Private は「これがたまたまそれを内部でどうやっているか」を意味する。** 将来のリファクタリングが `saturate_i128_to_i64` を `checked_mul` + `Option` 伝播に置き換えても、呼び出し側は壊れない。

**Q3: Signed-multiplication のトリックは整数の極端値で誤った符号を出すか?**

数学的にはノー — 4 つの符号の組み合わせは初等代数から来る。だが算術的にはイエス: i64 を（さらに i128 も）overflow する積は、真の結果の符号の情報を失う。だからすべての中間値の積は `i128::saturating_mul` を使い、最後のキャストは i128 値の符号によって `i64::MAX` / `i64::MIN` に saturate する。**Saturation は magnitude を失うが、答えの *符号* は保つ。**

**Q4: `unrealized_pnl` は `mark == 0` のとき panic すべきか?**

No — `mark = 0` は奇妙だが未定義ではない。式 `(0 − entry) × size = −entry × size` は数学的に well-defined（そしてポジションを deeply underwater と分類するが、それは正しい挙動）。Production のデプロイはゼロ mark を *公開* するのを拒否する。もしすり抜けてきたら、エンジンはそれを graceful に扱う。**純粋関数は policy を決めない — 与えられた入力で計算する。**

**Q5: なぜ `notional_value` は `&MarkPrice` ではなく `MarkPrice` を受け取るのか?**

`MarkPrice` は `Copy` で 8 byte（`u64`）。このサイズの `Copy` 型なら、値渡しのほうが参照渡しより安価 — ポインタ間接参照なし、aliasing の懸念なし。**型が大きくてコピーが高価な場合、OR 所有権セマンティクスが意味を持つ場合に `&` に手を伸ばす。プリミティブをラップした `Copy` newtype については、値渡しが正しいデフォルト。**

## 次のレッスン (L5)

L5 では `account_equity` と `margin_ratio` を追加する — そして **Stage 10a で最も教育的に load-bearing な発見**: `margin_ratio` の levered-regime での非単調性。読者は先に proptest を書く（「long に対して mark が上がれば margin_ratio も上がるはず」）。小さな入力群でそれが失敗するのを見る。失敗が *なぜ* 本物か（バグではない）を辿る。`prop_assume!` で実際の不変量を表現するように proptest を refine する。これは学習者の margin math の最初のメンタルモデルが壊されて再構築されるレッスン。

````

---

## Seed-file slot

L4 は Module 2 の sortOrder 0 に入る:

```typescript
{
  title: 'レッスン 4 — notional_value + unrealized_pnl — signed-multiplication のトリック',
  slug: 'openhl-liquidation-notional-pnl-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 45,
  xpReward: 80,
  content: `# レッスン 4 — notional_value + unrealized_pnl — signed-multiplication のトリック\n\n...`
},
```

## SHA pinning discipline

L4 は `22eedf9`（Stage 10a）を引用する。compute.rs 答え合わせ diff は、最初の ~80 行（モジュール doc + imports + 2 関数 + ヘルパー + 8 テスト）が Stage 10a と byte-for-byte 一致することを確認する。

## 翻訳セルフレビュー（paste 前）

- **「if size > 0 ... else ...」の予測コールアウト** が load-bearing な pedagogy の瞬間。これがないと読者は signed-multiplication のトリックを信仰で受け入れる。あると、代替案を *見て* それがなぜ悪いか（2 コードパス、2 テスト予算、将来のリファクタリングで忘れられそうな分岐 1 つ）を感じる。
- **`unsigned_abs` の議論** は短いが重要 — `i64::MIN.abs()` は Rust の面接で最も失敗される footgun の 1 つ。L4 で規律を露出させることで、L8 や L9 でエンジンが実際に `i64::MIN` のポジションを扱わなければならなくなったときのサプライズから救う。
- **4 つの符号の組み合わせテストが L4 の核心。** これを内面化した読者は、「short が profit のときも動くか?」という問いに対して `unrealized_pnl` への将来の変更を防衛できる。
- **L4 はクレートがテストを獲得するレッスン。** マイルストーンをレッスン中で（次レッスン preview でも）マークする価値あり — ここから build プロセスはデフォルトで *テストファースト* になる。
- **Q5（`&MarkPrice` vs `MarkPrice`）のよくある質問** は Rust 学習者が早い段階で身につける「常に参照渡し」反射を先回りする。プリミティブの `Copy` については答えは逆。
