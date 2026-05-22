# Building OpenHL Liquidation — L4 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) に対するドラフト。

## L4 — `openhl-liquidation-notional-pnl-ja`

**Stage**: Stage 10a — `22eedf9`

**Title**: レッスン 4 — `notional_value` + `unrealized_pnl` — signed-multiplication のトリック

**Duration**: 45 分 · **XP**: 80

---

````markdown
# レッスン 4 — `notional_value` + `unrealized_pnl` — signed-multiplication のトリック

## ゴール

このレッスンで掴む概念:

- **`notional_value` は `u64`、`unrealized_pnl` は `i64`。** Notional exposure は `|size| × mark` で、常に非負。PnL は `mark − entry` が両側に振れるので signed。この差を返り型で示しておけば、呼び出し側で符号を取り違えるバグはコンパイラが捕まえてくれる。
- **`i64` から magnitude が欲しいなら `abs()` ではなく `unsigned_abs()` を使う。** `i64::MIN.abs()` はオーバーフローする（正の `i64::MIN` は表現できないため）。`unsigned_abs()` は `u64` を返すので panic しない。Signed integer から magnitude を取り出すときは、迷わずこちらを選ぶ。
- **分岐なしで long / short 両方を捌く signed-multiplication のトリック。** `size` を signed のまま保ち `(mark − entry) × size` を計算すれば、4 通りの符号の組み合わせがすべて正しい PnL に自然に着地する。`if side == Long` は一度も書かない。
- **i128 中間値の規律。** まず符号を保ったまま減算（`i128::from(mark.0) − i128::from(entry.0)`）、次にオーバーフローしない積、最後に `i64` へ saturate して戻す。Funding の `compute_premium` と同じ形だ。
- **`saturate_i128_to_i64` という load-bearing なヘルパー。** Network-pathological な入力で積が `i64::MAX` を超えうる場面は、いつか必ず訪れる。そのとき panic ではなく saturate する、という選択がここで効いてくる。

確認:

```bash
cargo test -p openhl-liquidation
```

…で 8 テストが pass する（`notional_value` 用 3 つ + `unrealized_pnl` 用 5 つ）。

具体的な変更:

- **`crates/liquidation/src/compute.rs` を新規作成。** このファイルはまだ存在しない。モジュール doc、import、公開関数 2 つ、private ヘルパー 1 つ、unit test 8 個を載せた `#[cfg(test)]` ブロックを、一気に流し込む。
- **`src/lib.rs` を更新。** `pub mod compute;` を追加し、re-export に `notional_value` と `unrealized_pnl` を足す。

L4 は本クレートで初めてテストが走るレッスンだ。ここから L8（`close_order_spec`、Stage 10a の挙動の最後）まで、各レッスンがテストを積み増していく。

## おさらい

L3 の後:
- Types モジュールは Stage 10a に対して byte-for-byte 完成している — `MARGIN_SCALE`、`LiquidationParams`、`MarginRatio`、`MarginHealth`、`AccountSnapshot`、`CloseOrderSpec`。
- Compute モジュールはまだ存在しない。
- `cargo build` は通る。`cargo test` は走るテストがゼロ件だ。

L4 で compute モジュールを作る。最初の 2 関数が答えるのは「このアカウントは *いま* どう見えるか」 — notional exposure と unrealized PnL の 2 つだ。L5 ではその上に equity と margin ratio を積み上げる。

## 計画

編集は 2 つ:

1. **`crates/liquidation/src/compute.rs` を新規作成。** モジュール doc、L1-L3 から `AccountSnapshot` と `MarkPrice` を import する `use` 文、`notional_value`、`unrealized_pnl`、private な `saturate_i128_to_i64` ヘルパー、`#[cfg(test)]` テストブロック（notional 3 個 + PnL 5 個）まで。
2. **`src/lib.rs` を更新。** `pub mod compute;` を追加し、公開 re-export に新関数 2 つを足す。

> 🛑 **予測。** スクロール前に考えてほしい。`unrealized_pnl` は long が利益を出しているときも short が利益を出しているときも *正* の値を返してほしい。素朴に書くとこうなる:
>
> ```rust
> if size > 0 {  // long
>     (mark - entry) * size.abs()
> } else {       // short
>     (entry - mark) * size.abs()
> }
> ```
>
> これでも動くが、分岐がある。**実は、4 通りの符号の組み合わせをすべて `if` なしで正しく捌く単一の式がある。** 何か。ヒント: `(mark - entry) * size` の中で `size` 自身が long/short の符号を運んでいたら、計算がどう転ぶか考えてみる。

（答え: **`(mark − entry) × size`、ただし `size` は signed の `i64`。** 4 ケースを順に追ってみる:
- Long（`size = +10`）、mark > entry: 正 × 正 = 正の profit ✓
- Long（`size = +10`）、mark < entry: 負 × 正 = 負の loss ✓
- Short（`size = −10`）、mark > entry: 正 × 負 = 負の loss ✓
- Short（`size = −10`）、mark < entry: 負 × 負 = 正の profit ✓

どのケースでも符号が正しく着地する。**分岐がない。コードパスが 2 本に分かれて別々にテストを要求することもない。片方の分岐だけ「直して」もう一方を放置するリスクもない。** `PositionSize` を signed にしたのは、まさにこのためだ — 型が long/short の区別を運んでくれれば、演算側がそれを運ぶ必要はなくなる。）

`(mark − entry) × size` の 4 象限を 1 枚のマトリクスに落とすと、なぜこの 1 行が `if` 分岐 4 本ぶんの仕事を吸収しているのかが視覚で見える:

```
                          mark > entry              mark < entry
                       (上昇 → diff = 正値)        (下落 → diff = 負値)
                       ────────────────────       ────────────────────
   Long  (size = +)     (+) × (+) = +              (−) × (+) = −
                       ◤ profit ✓                  ◤ loss ✓
                       例: (110−100) × +10 = +100  例: (90−100) × +10 = −100
   ─────────────────────────────────────────────────────────────────────
   Short (size = −)     (+) × (−) = −              (−) × (−) = +
                       ◤ loss ✓                    ◤ profit ✓
                       例: (110−100) × −10 = −100  例: (90−100) × −10 = +100
```

ポイントは「**`size` の符号が long/short の方向情報を運び、`(mark − entry)` の符号が値動きの方向情報を運ぶ → 積を取った瞬間に 2 つの方向情報が掛け合わさり、正しい profit/loss の符号が機械的に出てくる**」こと。`if size > 0 { ... } else { ... }` の分岐版では、開発者が両方の case を頭の中で再構築しながら書くため、片側だけバグが残るパターンが頻発する。signed multiplication は **その再構築を型システム + 算術ルールに完全に外注している**。

## 手を動かす walk-through

### Step 1: `src/compute.rs` を作成

`crates/liquidation/src/compute.rs` を新規作成する。初期内容:

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

モジュール doc に挙げているのは 6 関数だが、L4 で着地するのはそのうちの 2 つ。残り 4 つ（`account_equity`、`margin_ratio`、`margin_health`、`close_order_spec`）は L5–L7 で順に追加していく。6 つ全部をいま列挙しておけば、レッスンごとにモジュール doc を編集し直さなくて済む。文脈なしでここに辿り着いた読者にとっても、ロードマップとして機能する。

> 🛑 **やりがちな勘違い。** 「L4 で使うのは `AccountSnapshot` と `MarkPrice` だけだ。なぜ `CloseOrderSpec`、`Side`、`Qty`、`LiquidationParams`、`MarginHealth`、`MarginRatio` まで import するのか?」 **後のレッスンが全部使うからだ。** L4 でまとめて import を入れておけば、各レッスンの diff は「今回追加する関数」だけに絞れる。L5 以降に到達するまで Rust は unused import の warning を出し続けるが、Funding L1 で後から来る型の rustdoc warning を許容したのと同じ理屈で、ここでも許容する。代わりに `use` 行を L4–L7 で 6 回いじる選択肢は busywork でしかなく、各レッスンが実際に追加している部分を見えにくくしてしまう。

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

この 7 行の関数で押さえておく点が 3 つ:

1. **返り型は `u64`、`i64` ではない。** Notional は exposure の *magnitude* なので、常に非負だ。`u64` を返せば、呼び出し側が abs を取り忘れる可能性を型レベルで潰せる。Notional を signed な計算に流したい呼び出し側（L5 の `margin_ratio` の割り算など）は、呼び出しサイトで明示的に `i64::from(notional_value(...))` を書く。**変換は 1 行で済む。代わりに防げるのは、production まで生き残る silent な符号バグの群れだ。**

2. **`snapshot.position_size.0.unsigned_abs()` を使う。`.abs()` ではない。** `i64::abs` は `i64` を返すが、`i64::MIN.abs()` は safe Rust では未定義動作だ（debug では panic、release では wrap）。一方 `unsigned_abs` は `u64` を返し、`i64::MIN` を含むあらゆる入力に対してきちんと定義されている（`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808`）。**Signed integer の magnitude が必要なら、迷わず `unsigned_abs`。`abs` を使ってよいのは、値が `MIN` を取り得ないと確信できるときに限る。**

3. **`u64::saturating_mul` であって、`u64::checked_mul` ではない。** どちらもオーバーフローを検知するが、`saturating_mul` はオーバーフロー時に `u64::MAX` を返し、`checked_mul` は `None` を返す。`Option<u64>` を返してしまうと、L5 の `margin_ratio` を含むすべての呼び出し側が、*network-pathological な入力でしか起きない* `None` を扱うハメになる。Saturating なら、極端な入力に対しても — 数学的には間違っていても — 使える値を返す。どのみちその極端な入力では margin engine はそのアカウントを `Liquidatable` と分類するので、上流的な意味でも整合が取れる。**「値は極端だが境界内に収まっている」という保証が、「すべての呼び出しサイトに `Option` 型の伝播とボイラープレート (`?` / `unwrap_or` / 早期 return) を強いるコスト」を上回るとき、正しい failure mode は saturation だ。**

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

押さえておく点が 4 つ:

1. **`i128::from(mark.0) − i128::from(snapshot.avg_entry.0)` を使う。`(mark.0 as i64) − (snapshot.avg_entry.0 as i64)` ではない。** `mark` も `entry` も `u64` だ。Rust では `u64 − u64` の結果が負になると panic する。先に `i64` にキャストしても、どちらかが `i64::MAX` を超えていれば最上位ビットが落ちてしまう。先に `i128` までアップキャストしてしまえば、フルレンジが保たれ、サプライズなしに signed の結果が得られる（負にもなれる）。**必要だと思うより一段広くアップキャストする — コストはゼロ、得られる安全性は大きい。**

2. **`saturating_mul` は `i128` 上で行う。** `diff` が `u64::MAX`（≈ 2⁶⁴）に近く、`position_size` が `i64::MAX`（≈ 2⁶³）に近ければ、積は ≈ 2¹²⁷ になる。これは `i128` の `±2¹²⁷` 範囲内には収まるが、極端な入力に対して `saturating_mul` を使うのは安価な保険だ。Funding と同じパターン。

3. **末尾で `saturate_i128_to_i64(pnl)` を呼ぶ。** 積を取った直後の PnL は i128 領域に居る可能性があるが、下流のエンジンは `i64` を使う。変換が失敗したとき panic ではなく saturate するためのヘルパーだ — funding と同じ規律。（ヘルパー定義は Step 4 で書く。）

4. **符号ルールを doc に明文化してある。** 4 ケースの列挙（「Long は mark > entry のとき profit」）は、レビュアーから「待って、これ short でも動くの?」と聞かれたときの正典的な参照になる。コードは construction で正しいが、doc は *なぜ* 正しいかを書く — 読者が毎回頭の中で辿り直さなくて済むように。

> 🛑 **やりがちな勘違い。** 「いっそ `(mark.0 as i64 − entry.0 as i64) × size` を直接書けばよいのでは?」 **問題が 3 つある。** (1) `mark` か `entry` が `i64::MAX` を超えると、キャストが silent に wrap する — 最上位ビットが符号ビットに化けてしまう。(2) 両方が i64 に収まっていても、片方が `i64::MIN` 近く、他方が正なら、i64 での減算がオーバーフローする。(3) 各オペランドが収まっていても、積 `(mark − entry) × size` が i64 を超えうる — `i64::MAX` サイズのポジションなら、わずか 1% の値動きでオーバーフローする。**`as` による暗黙的な型キャストは、Rust において最も代表的なバグの温床 (footgun) の 1 つであり、本レッスンが武装解除しに行く対象でもある。**

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

この 3 行のヘルパーで押さえておく点が 3 つ:

1. **`pub` を付けない。** これは `compute.rs` 内部の実装上の選択だ。公開 API はモジュール doc に挙げた 6 関数で、ヘルパーは本体をクリーンに保つために置いてある。**他モジュールの呼び出し側が本当に必要としない限り、ヘルパーは private のままにする。**

2. **`i64::try_from(v).unwrap_or(...)` の形。** `try_from` は値が収まらなければ `Err` を返す。`unwrap_or` の分岐が、符号によって saturation の行き先を選ぶ。`v > 0` なら大きすぎたので `i64::MAX` へ、`v ≤ 0` なら小さすぎたので `i64::MIN` へ。**演算は 3 行、判断は 1 つ、typo の余地もない。** **(※ `v == 0` のときは `try_from` が必ず `Ok(0)` を返すため、`unwrap_or` の `else` 分岐 (`i64::MIN`) は実行されない — つまりこの `else` は実質的に「`v < 0` かつ収まらなかったときの負方向 saturation」だけを拾っている。コードを読む人が `v == 0 → i64::MIN` の経路を一瞬気にしないよう、明示的に書いておく。)**

3. **ヘルパー自体には専用のテストを置かない。** その挙動は `unrealized_pnl` のテスト群（happy-path と境界の両方を突く）を通じて十分カバーされる。ヘルパー単体のテストを足してもただの重複になる。

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

テストブロックで押さえておく点が 4 つ:

1. **冒頭の `snapshot()` ヘルパー。** 整数引数を 3 つ取る（`size`、`entry`、`collateral`） — `account` は `AccountId(42)` にハードコード。8 個以上のテストにまたがって記述量を節約しつつ、各テストの *意味のある* 入力（size の符号、entry と mark の関係）は読み手の目に晒したまま保てる。**テスト fixture では、変化するものを表に出し、定数は隠す。**

2. **PnL 4 ケースが、予測コールアウトの 4 通りの符号の組み合わせと一対一に対応している。** `pnl_long_profit`、`pnl_long_loss`、`pnl_short_profit`、`pnl_short_loss`。加えて size がゼロのパスをカバーする `pnl_flat_is_zero`。これで到達可能な符号の組み合わせはすべてテスト下に入る。**符号の組み合わせの網羅性が load-bearing で、1 つでも漏らすと、将来のリファクタリングで side が silent に反転する余地が残る。**

3. **L4 ではまだ proptest を使わないのに `use proptest::prelude::*;` を書いておく。** L5 / L8 で proptest を足すとき、import はすでにここにある状態になる。`compute.rs` 本体の bulk import と同じ理屈で、境界で一度だけ書き、それまでの数レッスンは unused import の warning を許容する。

4. **テスト名は文として読める形にする。** `pnl_long_profit` は「PnL when long is in profit」と読める。テストが失敗したとき、出力で最初に目に入るのはテスト名だ — 本体を読まなくても何が壊れたか分かる程度には説明的にしておく。**`fn test_1` / `fn test_2` は CI のノイズだが、文の断片で名付けるなら CI のシグナルになる。**

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

変更は 2 箇所:

1. **`pub mod compute;`** を `pub mod types;` の上に置く — アルファベット順、既存の慣例どおり。
2. **`pub use compute::{notional_value, unrealized_pnl};`** — 新しい re-export 行で、`types` の re-export とは別の行に分ける。モジュールごとに自分の行を持たせる方針だ。L5–L7 で関数が増えたら、この compute 側のリストを伸ばしていく。

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

**この 8 テストが、signed-multiplication のトリックが各符号の組み合わせで実際に動くことの証拠になる。** 将来あなた（あるいは別の貢献者）が `unrealized_pnl` をリファクタするとき、ここのテストが符号ルールを正直に保ってくれる。

よくあるエラー:

- **`warning: unused import: ...`** — まとめて入れた import に対する warning だ。想定どおりで、L7 までには消える。
- **`error[E0599]: no method named 'unsigned_abs' found for type 'i64'`** — Rust のバージョンが古い。`unsigned_abs` は Rust 1.51（2021）で安定化された。プロジェクトの `rust-toolchain.toml` で十分新しいバージョンが pin されているはずだ。
- **テストが `attempt to multiply with overflow` で落ちる。** debug ビルドで `saturating_mul` の代わりに `*` を書いてしまっている。置き換える。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **`notional_value: u64`、`unrealized_pnl: i64`。** 返り型が不変量を表現している。Notional は決して負にならない、PnL は両側に振れる。両者を混ぜたい呼び出し側のコードは、明示的に変換する（`i64::from(notional)`）。**呼び出しサイトでの 1 行の変換は、production まで生き残る silent な符号バグの群れより、はるかに安い。**

2. **分岐ではなく signed-multiplication の対称性で書く。** `(mark − entry) × size` は `size` が long/short の符号を運んでくれるので、4 通りの符号の組み合わせすべてが自然に解決する。分岐版（`if size > 0 { ... } else { ... }`）はコードパスを 2 本に分け、テスト予算を倍に増やし、「long 側を直して short 側を直し忘れる」というリファクタ時のバグリスクを残す。**演算が自然に扱えるケースは、型システムに運ばせる。**

3. **`i64` の magnitude には `abs` ではなく `unsigned_abs`。** `i64::MIN.abs()` は Rust の代表的な footgun だ — debug で panic、release で silently wrap する。`unsigned_abs` は `u64` を返し、すべての `i64` 入力に対して定義されている。**panic パスを持たないほうの演算を選ぶ。逆を選ぶと、debug でしか顕在化しない crash になり、release ビルドがそれを喜んで隠してしまう。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L4 の後:
- **compute.rs** は Stage 10a の `compute.rs` の最初の ~80 行と一致する — モジュール doc、import、`notional_value`、`unrealized_pnl`、ヘルパー、最初の 8 テストまで。それ以降（残り 4 関数とそのテスト、proptest 3 つ）は L5–L7 で着地する。
- **lib.rs** はまだ compute 側の追加 re-export 4 つ（`account_equity`、`margin_ratio`、`margin_health`、`close_order_spec`）を持たない。これらは順次到着する。

## よくある質問

**Q1: `notional_value` は `u64` を返し、`mark` も `u64` だ。積が `u64` をオーバーフローすることはないのか?**

ありうる。Network-pathological な入力（`|size| × mark > 2⁶⁴` になるような巨大ポジション）でだ。それを防ぐのが `saturating_mul`。現実的な市場ではまず起こらない — 取引所側のポジションサイズ制限が、notional を `u64::MAX` のはるか手前に抑えてくれる。Saturation は第二の防衛線で、第一の防衛線は上流の sanity check だ。

**Q2: なぜ `saturate_i128_to_i64` ヘルパーは private で、`notional_value` と `unrealized_pnl` は public なのか?**

ヘルパーは実装上の選択（saturating cast）にすぎない。公開関数 2 つはエンジンの契約の一部 — margin を計算するすべての呼び出しサイトが必要とする。**Public は「呼び出し側がこれに依存している」、Private は「内部でたまたまこういう形でやっている」という意味だ。** 将来のリファクタリングが `saturate_i128_to_i64` を `checked_mul` + `Option` 伝播に置き換えたとしても、呼び出し側は壊れない。

**Q3: signed-multiplication のトリックは、整数の極端値で誤った符号を出すことはないのか?**

数学的にはノー — 4 通りの符号の組み合わせは初等代数から導かれる。算術的にはイエス: i64 を（さらには i128 さえも）オーバーフローするような積は、真の結果の符号情報を失う。だからすべての中間積で `i128::saturating_mul` を使い、最後のキャストでも i128 値の符号に応じて `i64::MAX` か `i64::MIN` へ saturate する。**Saturation は magnitude を失うが、答えの *符号* は保つ。**

**Q4: `unrealized_pnl` は `mark == 0` のとき panic すべきではないか?**

ノー。`mark = 0` は不自然ではあるが未定義ではない。式 `(0 − entry) × size = −entry × size` は数学的にきちんと定義されているし、その結果ポジションが deeply underwater に分類されるのも正しい挙動だ。本番環境では、そもそも mark = 0 を *公開* しないようゼロ mark が reject される。万が一漏れてきても、エンジンは graceful に処理する。**Pure 関数は方針を決めない — 与えられた入力に対して計算するだけだ。**

**Q5: なぜ `notional_value` は `&MarkPrice` ではなく `MarkPrice` を値で受け取るのか?**

`MarkPrice` は `Copy` で、サイズは 8 byte（`u64`）だ。このサイズの `Copy` 型なら、値渡しのほうが参照渡しより安い — ポインタ間接参照もなく、aliasing の懸念もない。**型のサイズが大きくコピーが高価なとき、あるいは所有権セマンティクスに意味があるときに `&` へ手を伸ばす。プリミティブをラップした `Copy` newtype については、値渡しが正しいデフォルトだ。**

## 次のレッスン (L5)

L5 では `account_equity` と `margin_ratio` を追加する。そこで **Stage 10a で最も教育的に load-bearing な発見**に出会う: levered regime での `margin_ratio` の非単調性だ。読者はまず proptest を書く（「long に対して mark が上がれば margin_ratio も上がるはず」）。それが小さな入力群で失敗するのを目にする。なぜそれが「バグではなく本物の失敗」なのかを辿り、`prop_assume!` を使って実際に成り立つ不変量を表現するように proptest を refine する。学習者が margin math について最初に持っていたメンタルモデルが、いったん壊されてから再構築されるレッスンだ。

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
