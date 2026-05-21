# Building OpenHL Liquidation — L5 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) に対するドラフト。

## L5 — `openhl-liquidation-equity-ratio-ja`

**Stage**: Stage 10a — `22eedf9`

**Title**: レッスン 5 — `account_equity` + `margin_ratio` — そして最初のメンタルモデルを壊す proptest

**Duration**: 60 分 · **XP**: 100

---

````markdown
# レッスン 5 — `account_equity` + `margin_ratio` — そして最初のメンタルモデルを壊す proptest

## ゴール

このレッスンで掴む概念:

- **なぜ `account_equity` は `i64` を返し、負になりうるか** — equity は `collateral + unrealized_pnl`。PnL の項は預けた collateral を突き抜けて不足を生みうる。エンジンはその不足を *測れる* 必要がある — そうしないと liquidation は正しいレバーを引けない。
- **なぜ `margin_ratio` は `notional == 0` を `MarginRatio(i64::MAX)` でガードするか** — flat なポジションは exposure ゼロ → margin 要件なし。表現可能な最大の ratio を返すことは「無限に safe」を signal し、下流のすべての分類器がそれを自然に short-circuit できる。
- **`equity × MARGIN_SCALE / notional` の i128 スケーリング規律** — 演算順序が重要: 先に i128 で乗算しておくと、高精度の numerator が割り算を生き残る。`i64` で先に割り算すると、小さい ratio で精度が落ちる。
- **`margin_ratio` の levered-regime での非単調性** — 最初の直感（「long に対して mark が上がれば margin_ratio も上がる」）は、`collateral > entry × size` の cash-heavy regime では **間違い**。Proptest がこれを捕まえる — そして直しは「関数を patch する」ではなく「不変量の表現を refine する」。
- **`prop_assume!` が条件付き不変量を表現する正しい方法** — 不変量が入力空間のサブセットでのみ成り立つとき、`prop_assume!` は assertion を弱めるのではなく、proptest の入力をそのサブセットにフィルタする。
- **Short vs long の monotonicity 非対称** — short ポジションは mark に対して *無条件に* monotonic。Long は levered condition の下でのみ。数学の微分がなぜかを説明する。

確認:

```bash
cargo test -p openhl-liquidation
```

…が 16 テストを pass する（L4 から 8 + 新規 unit test 5 + proptest 3、それぞれデフォルトの 256 ケース）。

具体的な変更:

- **`src/compute.rs`** — L4 の内容の下に `account_equity`、`margin_ratio`、unit test 5 個、proptest 3 個を追記。
- **`src/lib.rs`** — `pub use compute::{...}` re-export に `account_equity` と `margin_ratio` を拡張。

L5 は Stage 10a の教育的中心。急がない。Proptest の discovery ループ — 書く、失敗する、トレースする、refine する — がレッスンが教えるために存在する load-bearing なスキル。

## おさらい

L4 の後:
- Compute モジュールが存在し、`notional_value` と `unrealized_pnl` + private な `saturate_i128_to_i64` ヘルパーがある。
- 8 つの unit test が PnL の 4 つの符号の組み合わせと notional の 3 ケース（long、short、flat）をカバーする。
- `cargo test` が 8 テスト全部 green。

L5 では次のレイヤーを build する: PnL を account equity に変換（collateral を足す）、それから equity を notional で割って margin ratio を得る。それから最初の proptest を書き、本ステージを定義するサプライズに出会う。

## 計画

3 つのフェーズ:

1. **`account_equity` を追記** — 1 行関数、happy-path の unit test 1 個、「equity が負になる」unit test 1 個。
2. **`margin_ratio` を追記** — i128 スケールの除算 + flat-position ガード、unit test 3 個（flat は max を返す、ちょうど 10% の ratio、ratio が負になりうる）。
3. **Proptest ブロックを追加** — long-monotonicity proptest を素朴な形で書く、特定の入力で失敗するのを見る、なぜかをトレースする、`prop_assume!` で refine する、それから short-monotonicity（前提条件なし）と determinism の proptest を追加する。最終状態: 3 proptest、すべて green。

最後に `lib.rs` を更新。

> 🛑 **予測。** スクロール前に: long ポジションで `collateral = 100`、`size = 1`、`entry = 100` は mark = 100 で `notional = 100`、`equity = 100`（PnL ゼロ）。**mark = 100 での margin_ratio はいくらか?** そして mark = 110、mark = 50 では? 続きを読む前に、`equity × MARGIN_SCALE / notional` の式を各ケースについて辿る。

（ウォークスルー:
- **mark = 100**: notional = 1 × 100 = 100、pnl = (100 − 100) × 1 = 0、equity = 100 + 0 = 100、ratio = 100 × 10_000 / 100 = **10_000 bps = 100%**。
- **mark = 110**: notional = 110、pnl = 10、equity = 110、ratio = 110 × 10_000 / 110 = **10_000 bps = 100%**。
- **mark = 50**: notional = 50、pnl = −50、equity = 50、ratio = 50 × 10_000 / 50 = **10_000 bps = 100%**。

**Margin ratio が動かない!** Collateral がちょうど notional_at_entry に等しいので、どの mark でも PnL の動きを collateral が相殺する。このポジションは unlevered — exposure $1 ごとに collateral $1 を持っている。**ここが素朴な monotonicity の直感が壊れる regime** — `collateral ≥ notional_at_entry` の「cash-funded」ポジションは、mark が動くと margin ratio はどちらの方向にも動きうる。これを proptest でこの後すぐ目にする。）

## 手を動かす walk-through

### Step 1: `account_equity` を追記

`crates/liquidation/src/compute.rs` を開く。`saturate_i128_to_i64` ヘルパーの後（`#[cfg(test)]` ブロックの上）に追加:

```rust
/// Account equity = `collateral + unrealized_pnl`. Can be negative.
///
/// A negative equity means losses have exceeded deposited collateral —
/// the account is underwater. The liquidation engine still attempts to
/// close the position; any residual deficit falls to the insurance fund
/// (Stage 10b).
#[must_use]
pub fn account_equity(snapshot: &AccountSnapshot, mark: MarkPrice) -> i64 {
    snapshot
        .collateral
        .0
        .saturating_add(unrealized_pnl(snapshot, mark))
}
```

この 6 行の関数で気づくべき 3 点:

1. **`i64` を返す、`u64` ではない。** Doc が「negative になりうる」と言い、型がそれを本物にする。これを下流で margin 計算に流す呼び出し側は、サプライズなしに signed 演算が使える。**値の実際の範囲に型を合わせる。**

2. **`saturating_add`、`+` や `checked_add` ではない。** 2 つの `i64` 値の足し算は極端で overflow しうる。`saturating_add` は overflow 時に `i64::MAX` か `i64::MIN` を返す。エンジンはどちらも明確な health state として分類でき、`Option` を扱う必要がない。`i128 → i64` の saturation と同じパターン。

3. **テストはまだなし — Step 2 の後に来る。** これで関数の定義群を視覚的に連続させたまま、テストブロックを別途に置ける。多くのレッスンが交互配置するが、我々はしない。

### Step 2: `margin_ratio` を追記

`account_equity` の後に追記:

```rust
/// Margin ratio = `equity / notional`, scaled by [`MARGIN_SCALE`].
///
/// Returns `MarginRatio(i64::MAX)` for a flat position — no notional
/// exposure means the margin requirement is irrelevant, and we report the
/// healthiest possible ratio.
///
/// Returns a negative ratio when equity < 0 (the underwater case).
#[must_use]
pub fn margin_ratio(snapshot: &AccountSnapshot, mark: MarkPrice) -> MarginRatio {
    let notional = notional_value(snapshot, mark);
    if notional == 0 {
        return MarginRatio(i64::MAX);
    }
    let equity = account_equity(snapshot, mark);
    // ratio = equity × MARGIN_SCALE / notional, in i128 to avoid overflow
    // before the divide.
    let scaled = i128::from(equity).saturating_mul(i128::from(MARGIN_SCALE));
    let ratio = scaled / i128::from(notional);
    MarginRatio(saturate_i128_to_i64(ratio))
}
```

気づくべき 5 点:

1. **`notional == 0` の early return で `i64::MAX`。** Flat ポジションは exposure ゼロ → 下回るべき margin 要件もない。表現可能な最大の ratio を返すことで「無限に safe」を signal し、下流の `margin_health` の比較すべてを自然に short-circuit させる（`margin_health` 側に special-case 不要）。代替案 — `Option<MarginRatio>` または `Result<MarginRatio>` — は呼び出し側すべてに flat ケースを明示的に扱わせてしまう。**「制約なし」のケースを、最も safe な値として表現する。**

2. **乗算が除算より *先* に来る。** `equity × MARGIN_SCALE / notional` を i128 でやると、小さい ratio（例えば 1% margin = 100 bps）が割り算を生き残る。先に除算する（`equity / notional × MARGIN_SCALE` を i64 で）と、スケーリングの前に整数パーセントに切り捨てられ、精度が失われる。**整数除算が混ざるとき、演算順序が重要。**

3. **Scaled product のために i128。** `equity` は i64、`MARGIN_SCALE` は 10⁴。i64 での積は `|equity| > i64::MAX / 10_000 ≈ 9.2e14` で overflow しうる。現実的な取引所スケールではこれは $920 兆 — 妥当な範囲をはるかに超えるが、i128 乗算は第二の防衛線。`unrealized_pnl` と同じ規律。

4. **割り算用の `i128::from(notional)` キャスト。** `scaled` が i128 になった後、i128 で割り続けると結果も i128 のまま。`notional`（u64）の i128 へのキャストは無償。i128 と u64 を割り算で直接混ぜることはできない。**チェーン全体を 1 つの広い型で通し、境界で 1 度だけキャストする。**

5. **末尾の `saturate_i128_to_i64(ratio)`。** 割り算後でも極端な i128 値は i64 範囲を超えうる（例: 巨大な equity と小さな notional）。Saturation は答えの符号を保ちつつ magnitude を clip する。

### Step 3: unit test を 5 個追加

既存の `#[cfg(test)] mod tests { ... }` ブロックの中、L4 の PnL テストの後に追加:

```rust
    // ─── account_equity ────────────────────────────────────────────

    #[test]
    fn equity_collateral_plus_pnl() {
        // Long 10 @ 100, collateral 1_000, mark 120 → equity = 1_000 + 200 = 1_200
        let s = snapshot(10, 100, 1_000);
        assert_eq!(account_equity(&s, MarkPrice(120)), 1_200);
    }

    #[test]
    fn equity_can_go_negative() {
        // Long 10 @ 100, collateral 100, mark 50 → pnl = −500, equity = −400
        let s = snapshot(10, 100, 100);
        assert_eq!(account_equity(&s, MarkPrice(50)), -400);
    }

    // ─── margin_ratio ──────────────────────────────────────────────

    #[test]
    fn ratio_flat_returns_max() {
        let s = snapshot(0, 100, 1_000);
        assert_eq!(margin_ratio(&s, MarkPrice(100)), MarginRatio(i64::MAX));
    }

    #[test]
    fn ratio_exactly_ten_percent() {
        // Notional = 10 × 100 = 1_000; equity = 100 (collateral only, pnl = 0).
        // ratio = 100 × 10_000 / 1_000 = 1_000 bps = 10%.
        let s = snapshot(10, 100, 100);
        assert_eq!(margin_ratio(&s, MarkPrice(100)), MarginRatio(1_000));
    }

    #[test]
    fn ratio_can_be_negative() {
        // Underwater: equity = −400, notional = 500 → ratio = −8_000 bps
        let s = snapshot(10, 100, 100);
        let r = margin_ratio(&s, MarkPrice(50));
        assert!(r.0 < 0, "expected negative ratio, got {:?}", r);
    }
```

気づくべき点:

1. **各 ratio テストがコメントで厳密な算術を名指しする。** "`ratio = 100 × 10_000 / 1_000 = 1_000 bps = 10%`" — 読者（およびリグレッションをデバッグする将来の自分）は、計算を再実行しなくてもテストの expected 値を検証できる。**テストは説明もするコード。**

2. **`ratio_can_be_negative` は `assert_eq!(r, MarginRatio(-8000))` ではなく `assert!(r.0 < 0)` を使う。** 厳密な ratio 値は割り算の i64 rounding に依存する。bps を厳密に固定すると、唯一正典的な答えのない演算をロックインしてしまう（rounding mode が違えば LSB が違う）。*符号* だけを assert することで、equity-negative-implies-ratio-negative という load-bearing な性質をテストし、rounding artifact をテストしない。**Property をテスト、artifact ではない。**

3. **`ratio_flat_returns_max` は `MarginRatio(i64::MAX)` を直接使う。** Sentinel 値は契約の一部で、L6 の `margin_health` がそれに依存する。

### Step 4: Proptest を書く — 素朴な初版

Unit test の下（依然 `mod tests` の中）に `proptest!` ブロックを開く。`prop_assume!` *なしで* long-position の monotonicity 不変量から書き始める:

```rust
    proptest! {
        /// For a long position, as mark increases (price moves in the
        /// long's favor), margin_ratio should monotonically increase.
        /// If it ever moved the other way, an account could pass from
        /// "safe" to "liquidatable" without a single adverse price move,
        /// which would be a soundness bug.
        #[test]
        fn long_ratio_monotonic_in_mark(
            size in 1_i64..1_000,
            entry in 100_u64..10_000,
            collateral in 1_i64..1_000_000,
            mark_a in 1_u64..50_000,
            mark_b in 1_u64..50_000,
        ) {
            prop_assume!(mark_a < mark_b);
            let s = snapshot(size, entry, collateral);
            let r_low  = margin_ratio(&s, MarkPrice(mark_a));
            let r_high = margin_ratio(&s, MarkPrice(mark_b));
            prop_assert!(
                r_low.0 <= r_high.0,
                "long ratio not monotonic: mark_a={} → r={}; mark_b={} → r={}",
                mark_a, r_low.0, mark_b, r_high.0
            );
        }
    }
```

テストを走らせる:

```bash
cargo test -p openhl-liquidation
```

minimal counterexample で **失敗** する:

```
thread 'compute::tests::long_ratio_monotonic_in_mark' panicked:
Test failed: long ratio not monotonic: mark_a=1 → r=40000; mark_b=2 → r=25000
minimal failing input: size = 1, entry = 100, collateral = 103, mark_a = 1, mark_b = 2
```

**ここで止まる。関数を直さない。失敗を手でトレースする。**

### Step 5: 失敗をトレースする

minimal failing input を `margin_ratio` に段階的に通す:

**mark = 1 で:**
- `notional = |1| × 1 = 1`
- `pnl = (1 − 100) × 1 = −99`
- `equity = 103 + (−99) = 4`
- `ratio = 4 × 10_000 / 1 = 40_000 bps`（= 400%）

**mark = 2 で:**
- `notional = |1| × 2 = 2`
- `pnl = (2 − 100) × 1 = −98`
- `equity = 103 + (−98) = 5`
- `ratio = 5 × 10_000 / 2 = 25_000 bps`（= 250%）

mark が上がると margin ratio は 400% から 250% に下がった。Equity は上がった（4 → 5）が、notional *も* 上がった（1 → 2）。Notional のほうが equity の回復より速く成長した。

一般式:

> `margin_ratio = (collateral + (mark − entry) × size) × MARGIN_SCALE / (|size| × mark)`
>
> = `MARGIN_SCALE × (collateral/notional + (1 − entry/mark))`

mark に関して微分する（long について、size、entry、collateral を固定）:

> `d(margin_ratio)/d(mark) = MARGIN_SCALE × (entry / mark² − collateral / (size × mark²))`
>
> = `MARGIN_SCALE / mark² × (entry − collateral / size)`

この微分の符号は `entry − collateral / size` の符号と同じ。だから:

- `entry × size > collateral` なら: 微分は正 → ratio は mark とともに **増加**（levered regime、素朴な直感が正しい場所）。
- `entry × size < collateral` なら: 微分は負 → ratio は mark とともに **減少**（cash-heavy regime、素朴な直感が間違いの場所）。
- `entry × size = collateral` なら: 微分はゼロ → ratio は mark に対して定数（「ちょうど資金化された」境界）。

失敗した入力は `entry × size = 100 × 1 = 100`、`collateral = 103`。`collateral > entry × size` なので、mark が上がると ratio が下がる cash-heavy regime にいる。

**これは `margin_ratio` のバグではない。関数は正しい。バグは proptest の不変量の表現の中にある — monotonicity が成り立たない regime で monotonicity を主張している。**

### Step 6: `prop_assume!` で proptest を refine する

Long-monotonicity proptest を、monotonicity が実際に成り立つ regime の内側だけで主張するバージョンに置き換える:

```rust
    proptest! {
        /// For a *levered* long position (entry × size > collateral), as
        /// mark increases, margin_ratio monotonically increases.
        ///
        /// The leverage condition is load-bearing: when collateral exceeds
        /// position notional at entry (effectively cash + tiny exposure),
        /// the ratio is dominated by `collateral / notional`, which
        /// *decreases* as mark grows — so monotonicity fails. That
        /// regime is uninteresting for liquidation (the account can
        /// never be liquidated), so we exclude it via `prop_assume!`.
        #[test]
        fn long_ratio_monotonic_in_mark_when_levered(
            size in 1_i64..1_000,
            entry in 100_u64..10_000,
            collateral in 1_i64..1_000_000,
            mark_a in 1_u64..50_000,
            mark_b in 1_u64..50_000,
        ) {
            prop_assume!(mark_a < mark_b);
            // Levered regime: notional at entry strictly exceeds collateral.
            prop_assume!(
                i128::from(entry) * i128::from(size) > i128::from(collateral)
            );
            let s = snapshot(size, entry, collateral);
            let r_low  = margin_ratio(&s, MarkPrice(mark_a));
            let r_high = margin_ratio(&s, MarkPrice(mark_b));
            prop_assert!(
                r_low.0 <= r_high.0,
                "long ratio not monotonic: mark_a={} → r={}; mark_b={} → r={}",
                mark_a, r_low.0, mark_b, r_high.0
            );
        }
```

refine について気づくべき 3 点:

1. **テスト名が `_when_levered` で終わるようになった。** 名前が前提条件を運ぶ。このテストの失敗に飛び込んだ将来の読者は、本体を読まずに前提条件を知る。

2. **Doc コメントが前提条件 *なぜ* が重要かを名指しする。** "*That regime is uninteresting for liquidation*" — 読者はこれが見落としではなく、意図的なスコープ選択だと分かる。

3. **入力レンジを制限するのではなく `prop_assume!`。** `collateral` を `0..(entry × size)` で生成して leverage 条件を構造的に強制することも *できる*。しかし proptest の input strategy は inter-parameter 制約を組むのが難しく、`prop_assume!` は「この前提条件に違反するケースをスキップ」と自然に読める。Proptest のカウンター（`successes: 8, rejects: ~`）が何ケースフィルタされたかを教えてくれる — rejects が successes の ~10 倍を超えるなら、*そのとき* strategy を refine する。

### Step 7: Short-monotonicity proptest を追加（前提条件なし）

同じ `proptest!` ブロック内に追加:

```rust
        /// Symmetric invariant for shorts: as mark increases, the short's
        /// margin_ratio always decreases. Unlike the long case, this holds
        /// for *any* collateral level — the math derivative is uniformly
        /// negative in mark (every term either decreases or stays flat).
        #[test]
        fn short_ratio_monotonic_in_mark(
            size in 1_i64..1_000,
            entry in 100_u64..10_000,
            collateral in 1_i64..1_000_000,
            mark_a in 1_u64..50_000,
            mark_b in 1_u64..50_000,
        ) {
            prop_assume!(mark_a < mark_b);
            let s = snapshot(-size, entry, collateral);
            let r_low  = margin_ratio(&s, MarkPrice(mark_a));
            let r_high = margin_ratio(&s, MarkPrice(mark_b));
            prop_assert!(
                r_low.0 >= r_high.0,
                "short ratio not monotonic: mark_a={} → r={}; mark_b={} → r={}",
                mark_a, r_low.0, mark_b, r_high.0
            );
        }
```

気づくべき 2 点:

1. **Leverage 条件のための `prop_assume!` なし。** Short monotonicity は *無条件に* 成り立つ。微分を辿る: `size < 0` の場合、式は `margin_ratio = MARGIN_SCALE × (collateral / notional + entry / mark − 1)` になる。微分: `d/d(mark) = MARGIN_SCALE / mark² × (−collateral / |size| − entry)`。パレンの内側の両項とも非正（collateral と entry は非負、`|size|` は正）。微分は一様に負またはゼロ。**非対称性は本物の数学的事実であって、表記の選択ではない。**

2. **Snapshot 構築での `-size`。** strategy generator には正の `size` を渡し（> 0 のままにし）、snapshot 構築前に negate する。これで `size = 0` の生成を避ける（`ratio_flat_returns_max` がカバーする flat ケース）。

### Step 8: Determinism proptest を追加

同じ `proptest!` ブロック内に追加:

```rust
        /// Determinism: the same inputs always produce the same MarginRatio.
        /// Trivially true for pure functions, but the proptest catches
        /// accidental non-determinism (e.g., if a future refactor introduces
        /// HashMap iteration or float arithmetic).
        #[test]
        fn margin_ratio_deterministic(
            size in -1_000_i64..1_000,
            entry in 1_u64..10_000,
            collateral in -1_000_000_i64..1_000_000,
            mark in 1_u64..50_000,
        ) {
            let s = snapshot(size, entry, collateral);
            let r1 = margin_ratio(&s, MarkPrice(mark));
            let r2 = margin_ratio(&s, MarkPrice(mark));
            prop_assert_eq!(r1, r2);
        }
    }
```

気づくべき点:

1. **Pure 関数にとって assertion は自明。** 同じ入力での 2 つの呼び出しは同じ出力を返さなければならない。**このテストは *将来* のリグレッションを捕まえる** — 将来のリファクタリングが margin 計算に `HashMap` iteration 順、`SystemTime::now`、float 演算を誤って導入したら、production で chain を fork させる前にこの proptest が失敗する。

2. **広い入力レンジには負とゼロが含まれる。** 他の 2 proptest は特定の regime を切り出した。Determinism は *どこでも* 成り立つので、strategy は寛大。値の特定の性質をテストしているのではなく、*関数の性質*（決定論的 dispatch）をテストしている。

3. **これは維持コストが最も低く、違反の発見コストも最も低い不変量。** エンジン内のすべての pure 関数は determinism proptest を持つべき。**5 行の proptest が、consensus-fork バグの一群を防ぐガード。**

### Step 9: `lib.rs` を更新

`crates/liquidation/src/lib.rs` を開く。Compute の re-export を拡張する。元:

```rust
pub use compute::{notional_value, unrealized_pnl};
```

更新後:

```rust
pub use compute::{account_equity, margin_ratio, notional_value, unrealized_pnl};
```

新規 2 名、アルファベット順に挿入。

### Step 10: テストを走らせる

```bash
cargo test -p openhl-liquidation
```

期待される出力:

```
running 16 tests
test compute::tests::equity_can_go_negative ... ok
test compute::tests::equity_collateral_plus_pnl ... ok
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok
test compute::tests::ratio_can_be_negative ... ok
test compute::tests::ratio_exactly_ten_percent ... ok
test compute::tests::ratio_flat_returns_max ... ok
test compute::tests::long_ratio_monotonic_in_mark_when_levered ... ok
test compute::tests::short_ratio_monotonic_in_mark ... ok
test compute::tests::margin_ratio_deterministic ... ok

test result: ok. 16 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**16 テストすべて pass。** 3 つの proptest はデフォルトでそれぞれ 256 ケース走る — 合計 ~768 のランダムに生成された入力の組み合わせがチェックされる。

エラーが出た場合に多い原因 / サプライズ:

- **proptest 出力での `successes: 220, rejects: 36`** — 完全に問題なし。`prop_assume!` フィルタが一部ケースを捨てた。Successes がケースの大半を占めている限り、proptest は本当の仕事をしている。
- **Proptest が予想より時間がかかる** — `cargo test` フラグで timeout を増やすか、辛抱する。3 proptest × 256 ケース × pure な算術の速度は実用上速い。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **Flat ポジションに `MarginRatio(i64::MAX)`、`Option` でも `Result` でもなく。** 「制約なし」のケースは *最も safe な* state。表現可能な最大の ratio に対応させることで、下流のすべての分類器が special-case 分岐なしに自然に short-circuit できる。**「情報なし」を最も safe な値として表現する、情報の欠如としてではなく。**

2. **Proptest の失敗がレッスンそのもの。** Proptest が最初の試みで pass していたら、読者は「margin_ratio は mark に対して monotonic」を学んだだろう。失敗とトレースのステップを通じて、読者は「**margin_ratio は mark に対して *levered regime で* monotonic、境界は collateral が notional-at-entry に等しい場所**」を学ぶ。読者自身が微分を歩いたから、深い事実が生き残る。

3. **条件付き不変量のための `prop_assume!`。** 不変量が入力のサブセット上でしか成り立たないとき、正しい道具は `prop_assume!` — より強い関数の事後条件でも、より弱い assertion でも、手で制限した strategy でもない。**不変量とは *どの条件下で* 真なのか。両方を表現する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L5 の後:
- **compute.rs** は Stage 10a を `margin_ratio` + 最初の 13 unit test + 3 proptest すべてまで一致する。次の 2 関数（L6 の `margin_health`、L7 の `close_order_spec`）とそのテストはまだ pending。
- **lib.rs** は compute の re-export を 6 個中 4 個持つ — `notional_value`、`unrealized_pnl`、`account_equity`、`margin_ratio`。残りの 2 つは L6/L7 で来る。

## よくある質問

**Q1: なぜ flat ポジションが `MarginRatio(i64::MAX)` を返し、`MarginRatio(0)` や `Option::None` ではないのか?**

`MarginRatio(0)` は flat アカウントを *最悪* の margin state に分類してしまい、margin_ratio の各 consumer に「これは本当にゼロか、それとも flat か?」の special-case を強制する。`Option::None` は honest だが、special case を呼び出しサイトすべてに押し出す。`MarginRatio(i64::MAX)` は flat ケースを「無限に safe」と同一に見せ — liquidation の目的にとってそれは *実際そう* — margin_health が special-case 分岐なしに `Safe` に分類できる。**3 つの選択肢、その 1 つが自然に compose する。**

**Q2: なぜ `collateral` が margin_ratio を 100% 超に押し上げて良いのか?**

Margin ratio は `equity / notional` のスケール。数学的に 100% の上限はない — $1,000 の collateral と $100 の notional を持つポジションは 1,000% margin ratio。実際の取引所はこれを「10× collateralized」と報告する。エンジンは initial-margin しきい値を超える ratio の値を気にしない。上はすべて `Safe`。**上限は UI の関心事、エンジンの関心事ではない。**

**Q3: Flat ガードなしで `margin_ratio` を常に i128 で計算して単純化できないか?**

Rust では整数のゼロ除算は debug でも release でも panic する。Flat ガードはその panic を防ぐ。削除するなら `try_div`（i128 は built-in を持たない）か、branchless なアプローチ（rounding ノイズを足して除算前に notional を定数で乗算する）が必要。2 行のガードが最もクリーン。**条件分岐 1 つは branchless な dance より安価。**

**Q4: 入力 strategy を `collateral in 1..(entry × size)` に制限するのではなく、なぜ `prop_assume!` なのか?**

2 つの理由。(1) Proptest strategy はパラメータごとに独立。Inter-parameter 制約を表現するには `(entry, size, collateral).prop_filter(...)` または `flat_map` で組み立てる必要があり、どちらも `prop_assume!` より noisy。(2) `prop_assume!` は前提条件をテスト本体内に inline で見えるようにする — 読者は assertion のすぐ隣で「collateral ≥ notional-at-entry のケースをスキップする」を見られる。入力 strategy に埋もれない。**前提条件は assertion がある場所で表現する、データ生成器の中ではなく。**

**Q5: Long monotonicity 不変量が成り立たないのはいつか、それは問題なのか?**

`collateral ≥ entry × size` のとき — cash-heavy regime で、ポジションが over-collateralized すぎて liquidation できない場所。その regime では mark の動きが margin ratio を上下させるが、maintenance を下回ることは決してない。エンジンは行動する必要がない。**Monotonicity が破れるケースは、ちょうどエンジンが気にしないケース — だから `prop_assume!` で除外するのが workaround ではなく正しい動き。**

## 次のレッスン (L6)

L6 では `margin_health` を追加する — params に対して `MarginRatio` を比較して 4 つの `MarginHealth` variants の 1 つに変換する関数だ。境界での unit test 5 個（Safe / AtRisk / Liquidatable / Underwater / ちょうど maintenance の端）と、なぜ各しきい値で strict-less-than を使うかの議論。L5 より短い — L6 までに規律は内面化される。L6 は応用。

````

---

## Seed-file slot

L5 は Module 2 の sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 5 — account_equity + margin_ratio — そして最初のメンタルモデルを壊す proptest',
  slug: 'openhl-liquidation-equity-ratio-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 60,
  xpReward: 100,
  content: `# レッスン 5 — account_equity + margin_ratio — そして最初のメンタルモデルを壊す proptest\n\n...`
},
```

## SHA pinning discipline

L5 は `22eedf9`（Stage 10a）を引用する。L5 後の答え合わせ diff は `compute.rs` の 2 番目の ~半分を `margin_ratio` + 3 proptest すべてまでカバーする。最後の 2 関数は L6/L7 で着地する。

## 翻訳セルフレビュー（paste 前）

- **§計画の「cash-funded ケースを予測」コールアウト** は読者をこれから見る失敗に備えさせる。数値ウォークスルー（「ratio が動かない!」）が、proptest を走らせる前に素朴な直感が明示的に否定される瞬間。
- **Step 5 の手によるトレースが load-bearing な payoff。** これがないと読者は proptest が失敗するのを見て fix を得る。あると、なぜ fix が正しいかを理解する。その違いが Stage 10a の残りで累積する — L6 が境界を strict-less-than に設定するとき、読者は「その決定がどの regime で意味を持つか」を尋ねる準備ができている。
- **微分の計算は避けられない。** これに従わない学習者は手を振る扱いを得る。従う学習者は本物のモデルを持って去る。レッスンは数学を教えることに commit する — 代替案（「信じて、monotonicity は条件付き」）は本コースが避けるよう設計された正典的な知的パターン。
- **L5 は Stage 10a で最長のレッスン。** これは意図的。ここの教育的密度が単一の深いセッションを正当化する。「L5a unit test + L5b proptest」に分けると、discovery loop が片方も完全な payoff を持たない 2 つに断片化する。
- **§設計の「『情報なし』を最も safe な値として表現する」振り返り** は本クレートを超えて一般化する — `Option` に手を伸ばしたくなる場所はどこでも現れる Rust API design 原則。ここで述べることで、読者に移植可能なルールを与える。
