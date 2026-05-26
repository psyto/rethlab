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

- **`account_equity` が `i64` を返し、負にもなりうる理由。** Equity は `collateral + unrealized_pnl` だ。PnL の項は、預けた collateral を突き抜けて不足を生みうる。エンジンはその不足を *測れる* 必要がある — そうでなければ、liquidation は正しいレバーを引けない。
- **`margin_ratio` が `notional == 0` を `MarginRatio(i64::MAX)` でガードする理由。** Flat ポジションは exposure ゼロなので、margin 要件もない。表現可能な最大の ratio を返すことが「無限に safe」を意味し、下流のあらゆる分類器がそれを自然に short-circuit できるようになる。
- **`equity × MARGIN_SCALE / notional` の i128 スケーリング規律。** 演算順序が効く。先に i128 で掛けておけば、高精度の分子のまま割り算を通過できる。`i64` で先に割ってしまうと、小さい ratio で精度が落ちる。
- **levered regime での `margin_ratio` の非単調性。** 最初の直感 — 「long に対して mark が上がれば margin_ratio も上がる」 — は `collateral > entry × size` の cash-heavy regime では **成り立たない**。Proptest がこれを捕まえる。対処は「関数をパッチする」ことではなく「不変量の表現を refine する」ことだ。
- **条件付き不変量を正しく書くための道具としての `prop_assume!`。** 不変量が入力空間の一部でしか成り立たないとき、`prop_assume!` は assertion を弱めるのではなく、proptest の入力をそのサブセットへフィルタする。
- **short と long で monotonicity の対称性が崩れる。** Short ポジションは mark に対して *無条件に* monotonic だが、long のほうはレバレッジが効いている条件下でしか monotonic にならない。微分の計算がその理由を説明してくれる。

確認:

```bash
cargo test -p openhl-liquidation
```

…で 16 テストが pass する（L4 の 8 + 新規 unit test 5 + proptest 3、proptest は各デフォルトの 256 ケース）。

具体的な変更:

- **`src/compute.rs`。** L4 の内容の下に、`account_equity`、`margin_ratio`、unit test 5 個、proptest 3 個を追記する。
- **`src/lib.rs`。** `pub use compute::{...}` の re-export に `account_equity` と `margin_ratio` を足す。

L5 は Stage 10a の教育的な中心だ。急がないこと。「書く → 失敗する → トレースする → refine する」という proptest の discovery loop こそ、本レッスンが教えるために存在する load-bearing なスキルだ。

## おさらい

L4 の後:
- Compute モジュールが存在し、`notional_value`、`unrealized_pnl`、private な `saturate_i128_to_i64` ヘルパーがある。
- 8 個の unit test が、PnL の 4 つの符号の組み合わせと notional の 3 ケース（long、short、flat）をカバーする。
- `cargo test` が 8 テスト全部 green。

L5 では次のレイヤーを積む: PnL を account equity に変換し（collateral を足す）、その equity を notional で割って margin ratio を得る。それから最初の proptest を書き、本ステージを定義するサプライズに出会う。

## 計画

3 フェーズで進める:

1. **`account_equity` を追記。** 1 行の関数、happy-path 用の unit test 1 個、「equity が負になる」unit test 1 個。
2. **`margin_ratio` を追記。** i128 スケールの除算 + flat-position ガード、unit test 3 個（flat は max を返す / ちょうど 10% の ratio / ratio が負になりうる）。
3. **Proptest ブロックを追加。** Long-monotonicity proptest を素朴な形で書き、特定の入力で失敗するのを見て、その理由をトレースし、`prop_assume!` で refine する。続いて short-monotonicity（前提条件なし）と determinism の proptest を足す。最終状態: 3 proptest、すべて green。

最後に `lib.rs` を更新。

> 🛑 **予測。** スクロール前に考えてほしい。Long ポジションで `collateral = 100`、`size = 1`、`entry = 100` の状態は、mark = 100 のとき `notional = 100`、`equity = 100`（PnL ゼロ）になる。**mark = 100 での margin_ratio はいくつか?** mark = 110 では? mark = 50 では? 続きを読む前に、`equity × MARGIN_SCALE / notional` の式を各ケースについて手で辿ってみる。

（ウォークスルー:
- **mark = 100**: notional = 1 × 100 = 100、pnl = (100 − 100) × 1 = 0、equity = 100 + 0 = 100、ratio = 100 × 10_000 / 100 = **10_000 bps = 100%**。
- **mark = 110**: notional = 110、pnl = 10、equity = 110、ratio = 110 × 10_000 / 110 = **10_000 bps = 100%**。
- **mark = 50**: notional = 50、pnl = −50、equity = 50、ratio = 50 × 10_000 / 50 = **10_000 bps = 100%**。

**Margin ratio がまったく動かない。** Collateral がちょうど notional_at_entry に等しいので、どの mark でも PnL の動きを collateral が相殺してしまう。このポジションは unlevered だ — exposure $1 に対して collateral $1 を持っている。**ここが素朴な monotonicity の直感が壊れる regime だ。** `collateral ≥ notional_at_entry` の「cash-funded」ポジションでは、mark が動いたとき margin ratio はどちらの方向にも動きうる。これを proptest でこの後すぐ目にする。）

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

この 6 行の関数で押さえておく点が 3 つ:

1. **返り型は `i64`、`u64` ではない。** Doc が「負になりうる」と書き、型がそれを本物にする。これを下流で margin 計算に流す呼び出し側は、サプライズなしに signed 演算を使える。**値の実際の範囲に型を合わせる。**

2. **`saturating_add` を使う。`+` でも `checked_add` でもない。** 2 つの `i64` 値の足し算は極端な値でオーバーフローしうる。`saturating_add` はオーバーフロー時に `i64::MAX` か `i64::MIN` を返す。エンジンはどちらも明確な health state として分類でき、`Option` を扱う必要がない。`i128 → i64` の saturation と同じパターンだ。

3. **テストはまだ書かない — Step 2 の後にまとめて置く。** こうすれば関数定義群を視覚的に連続させたまま、テストブロックを別途まとまった形で置ける。多くのレッスンが関数とテストを交互に配置するが、ここではそうしない。

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

この関数で押さえておく点が 5 つ:

1. **`notional == 0` の early return で `i64::MAX` を返す。** Flat ポジションは exposure ゼロ → 下回るべき margin 要件もない。表現可能な最大の ratio を返すことが「無限に safe」のシグナルになり、下流の `margin_health` の比較すべてを自然に short-circuit させる（`margin_health` 側に special-case はいらない）。**具体的には、次レッスン (L6) で実装する `if ratio >= params.initial_margin_bps { Safe } else { ... }` という一方向の比較式が、flat なアカウントに対しても追加の特例分岐なしでそのまま機能し、`i64::MAX >= initial_margin_bps` が常に真なので自動的に `Safe` と判定される**。つまり `i64::MAX` は **「下流の比較演算が短絡的に通り抜けるための magic boundary」** として効いている。代替案 — `Option<MarginRatio>` や `Result<MarginRatio>` — はすべての呼び出し側に flat ケースを明示的に扱わせる。**「制約なし」のケースを、システム上最も safe な上限値で表現する設計規律だ。**

2. **乗算を除算より *先* に置く。** `equity × MARGIN_SCALE / notional` を i128 で計算すれば、小さい ratio（例えば 1% margin = 100 bps）も割り算を生き残る。先に除算する（`equity / notional × MARGIN_SCALE` を i64 で）と、スケーリングの前に整数パーセントに切り捨てられ、精度が失われる。**整数除算が混じるとき、演算順序が効く。**

3. **Scaled product を i128 で受ける。** `equity` は i64、`MARGIN_SCALE` は 10⁴。i64 での積は `|equity| > i64::MAX / 10_000 ≈ 9.2e14` でオーバーフローしうる。現実的な取引所スケールに直すと $920 兆 — 妥当な範囲を遥かに超えるが、i128 乗算は第二の防衛線として置いておく。`unrealized_pnl` と同じ規律だ。

4. **割り算用の `i128::from(notional)` キャスト。** `scaled` が i128 になった後、i128 で割り続ければ結果も i128 のまま。`notional`（u64）の i128 へのキャストは無償だ。i128 と u64 を割り算で直接混ぜることはできない。**チェーン全体を 1 つの広い型で通し、境界で 1 度だけキャストする。**

5. **末尾の `saturate_i128_to_i64(ratio)`。** 割り算後でも、極端な i128 値は i64 範囲を超えうる（例: 巨大な equity と小さな notional の組み合わせ）。Saturation は答えの符号を保ちつつ、magnitude を clip する。

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

押さえておく点:

1. **各 ratio テストが、コメントで厳密な算術を名指ししている。** "`ratio = 100 × 10_000 / 1_000 = 1_000 bps = 10%`" — 読者（およびリグレッションをデバッグする未来の自分）は、計算をやり直さなくてもテストの期待値を検証できる。**テストは説明もするコードだ。**

2. **`ratio_can_be_negative` は `assert_eq!(r, MarginRatio(-8000))` ではなく `assert!(r.0 < 0)` を使う。** 厳密な ratio 値は割り算の i64 rounding に依存する。bps を厳密に固定すると、唯一正典的な答えのない演算をロックインしてしまう（rounding mode が違えば LSB が変わる）。*符号* だけを assert することで、「equity が負なら ratio も負」という load-bearing な性質をテストし、rounding artifact はテストしない形になる。**Property をテストする、artifact をテストしない。**

3. **`ratio_flat_returns_max` は `MarginRatio(i64::MAX)` を直接使う。** Sentinel 値は契約の一部で、L6 の `margin_health` がそれに依存する。

### Step 4: Proptest を書く — 素朴な初版

Unit test の下（まだ `mod tests` の中）に `proptest!` ブロックを開く。`prop_assume!` *なしで*、long ポジションの monotonicity 不変量から書き始める:

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

最小の counterexample で **失敗** する:

```
thread 'compute::tests::long_ratio_monotonic_in_mark' panicked:
Test failed: long ratio not monotonic: mark_a=1 → r=40000; mark_b=2 → r=25000
minimal failing input: size = 1, entry = 100, collateral = 103, mark_a = 1, mark_b = 2
```

**ここで一度止まる。関数を直さない。失敗を手でトレースする。**

### Step 5: 失敗を手で辿る

最小の失敗入力を `margin_ratio` に段階的に流してみる:

**mark = 1 のとき:**
- `notional = |1| × 1 = 1`
- `pnl = (1 − 100) × 1 = −99`
- `equity = 103 + (−99) = 4`
- `ratio = 4 × 10_000 / 1 = 40_000 bps`（= 400%）

**mark = 2 のとき:**
- `notional = |1| × 2 = 2`
- `pnl = (2 − 100) × 1 = −98`
- `equity = 103 + (−98) = 5`
- `ratio = 5 × 10_000 / 2 = 25_000 bps`（= 250%）

mark が上がるにつれて margin ratio は 400% から 250% に下がった。Equity も上がっている（4 → 5）が、notional *も* 上がっている（1 → 2）。Notional のほうが equity の回復より速く成長したのだ。

一般式で書き直すとこうなる:

> `margin_ratio = (collateral + (mark − entry) × size) × MARGIN_SCALE / (|size| × mark)`
>
> = `MARGIN_SCALE × (collateral/notional + (1 − entry/mark))`

これを mark で微分する（long、つまり size、entry、collateral を固定して考える）:

> `d(margin_ratio)/d(mark) = MARGIN_SCALE × (entry / mark² − collateral / (size × mark²))`
>
> = `MARGIN_SCALE / mark² × (entry − collateral / size)`

この微分の符号は `entry − collateral / size` の符号と一致する。つまり:

- `entry × size > collateral` のとき: 微分は正 → ratio は mark とともに **増加** する（levered regime、素朴な直感が正しい領域）。
- `entry × size < collateral` のとき: 微分は負 → ratio は mark とともに **減少** する（cash-heavy regime、素朴な直感が外れる領域）。
- `entry × size = collateral` のとき: 微分はゼロ → ratio は mark に対して一定（「ちょうど資金化された」境界）。

3 つの regime と margin_ratio の挙動を 1 枚に並べると、なぜ素朴な直感が破綻するのか、どこに「特異な境界」が走っているのかが視覚で見える:

```
                         margin_ratio (Long ポジション、collateral と size を固定したまま mark を動かす)
                         ▲
                         │     🔴 Cash-heavy regime
                         │        (collateral > entry × size)
                         │        ratio は mark の上昇とともに ↘ 減少
                         │        ※ 素朴な直感「mark が上がれば ratio も上がる」が破綻するゾーン
                         │     ──────────────────────────────────
                         │
                         │     ◆ 特異な境界: collateral = entry × size
                         │        (= ちょうど 1x レバレッジ、cash-funded ぎりぎり)
                         │        ratio は mark に対して水平 (微分 = 0)
                         │     ──────────────────────────────────
                         │
                         │     🟢 Levered regime
                         │        (collateral < entry × size)
                         │        ratio は mark の上昇とともに ↗ 増加
                         │        ※ 素朴な直感どおりに動く、現実の perp で 99% のケース
                         │
                         └─────────────────────────────────────►  mark

  ポイント:
    - 境界の位置は **collateral と entry × size の大小関係** だけで決まる (mark には依存しない)。
    - 預け入れ担保 (collateral) がエントリー時の想定元本 (notional at entry = entry × size) を
      超える瞬間、margin_ratio の傾きが反転する。
    - 現実の取引所では trader はほぼ常に levered regime にいるので、この反転は本番では稀な
      コーナーケース。だが proptest はランダム入力なので、容赦なくこのコーナーを踏み抜く。
    - 「素朴な monotonicity の直感」は本質的には間違っていない — **「levered regime に居る」
      という暗黙の前提**の下では正しい。proptest はその前提を可視化させる装置だ。
```

この図は L6 / L7 で classifier やリクイデーション規律を書くときにも参照する: 健康な trader はほぼ levered 領域に居るが、極端に over-collateralize した「擬似ロング」のアカウントが cash-heavy 領域に紛れ込む可能性は常にあるので、エンジンは両 regime で正しく動かなければならない。

失敗した入力では `entry × size = 100 × 1 = 100`、`collateral = 103`。`collateral > entry × size` なので、mark が上がると ratio が下がる cash-heavy regime に居る。

**これは `margin_ratio` のバグではない。関数は正しい。バグは proptest の不変量の書き方にある — monotonicity が成り立たない regime に対しても monotonicity を主張してしまっているのだ。**

### Step 6: `prop_assume!` で proptest を refine する

Long-monotonicity proptest を、monotonicity が実際に成り立つ regime の内側だけで主張するバージョンへ置き換える:

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

refine 後のテストで押さえておく点が 3 つ:

1. **テスト名の末尾が `_when_levered` になった。** 名前が前提条件を運ぶ。失敗時にこのテストへ飛び込んだ将来の読者は、本体を読まずに前提条件を把握できる。

2. **Doc コメントが、前提条件が *なぜ* 重要かを名指ししている。** "*That regime is uninteresting for liquidation*" — これが見落としではなく意図的なスコープ選択だと、読者にちゃんと伝わる。

3. **入力レンジを制限せず、`prop_assume!` を使う。** `collateral` を `0..(entry × size)` で生成して leverage 条件を構造的に強制することも *できる*。だが proptest の input strategy は inter-parameter 制約を組むのが難しい。一方 `prop_assume!` は「この前提条件に違反するケースはスキップする」と自然に読める。Proptest のカウンター（`successes: 8, rejects: ~`）が、何ケースがフィルタされたかを教えてくれる。`rejects` が `successes` の ~10 倍を超えるようなら、*そのとき* に strategy を refine すればよい。

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

押さえておく点が 2 つ:

1. **Leverage 条件のための `prop_assume!` がない。** Short monotonicity は *無条件に* 成り立つ。微分を辿るとこうなる。`size < 0` の場合、式は `margin_ratio = MARGIN_SCALE × (collateral / notional + entry / mark − 1)` の形になる。これを mark で微分すると `d/d(mark) = MARGIN_SCALE / mark² × (−collateral / |size| − entry)`。括弧の内側の両項はいずれも非正だ（collateral と entry は非負、`|size|` は正）。よって微分は一様に負（またはゼロ）。**この非対称性は本物の数学的事実であって、表記の好みの問題ではない。**

2. **Snapshot 構築時に `-size` を渡している。** Strategy generator には正の `size` を渡し（`> 0` の範囲に保ち）、snapshot を組み立てる直前に符号を反転する。こうすれば `size = 0` の生成を避けられる（`size = 0` は flat ケースで、`ratio_flat_returns_max` がカバー済み）。

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

押さえておく点:

1. **Pure 関数にとって、この assertion は自明だ。** 同じ入力での 2 つの呼び出しは、同じ出力を返さなければならない。**このテストは *将来* のリグレッションを捕まえる。** 将来のリファクタリングが margin 計算に `HashMap` の iteration 順、`SystemTime::now`、float 演算などを誤って持ち込んでしまったとき、production で chain を fork させる前にこの proptest が失敗する。

2. **広い入力レンジには負やゼロも含まれる。** 他の 2 proptest は特定の regime を切り出していた。Determinism は *どこでも* 成り立つので、strategy は寛大にしておく。ここでテストしているのは値の特定の性質ではなく、*関数の性質*（決定論的な dispatch）だ。

3. **維持コストが最も低く、違反の発見コストも最も低い不変量。** エンジン内のすべての pure 関数は determinism proptest を持つべきだ。**5 行の proptest が、consensus-fork バグの一群を防ぐガードになる。**

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

**16 テストすべて pass。** 3 つの proptest はデフォルトでそれぞれ 256 ケースを走らせる — 合計で ~768 のランダム入力の組み合わせがチェックされた。

エラー時にありがちなパターン / サプライズ:

- **proptest 出力に `successes: 220, rejects: 36`。** まったく問題ない。`prop_assume!` フィルタが一部のケースを捨てただけだ。Successes がケースの大半を占めている限り、proptest はちゃんと仕事をしている。
- **Proptest が想定より時間がかかる。** `cargo test` のフラグで timeout を増やすか、素直に待つ。3 proptest × 256 ケース × pure な算術の速度は、実用上は十分に速い。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **Flat ポジションに `MarginRatio(i64::MAX)` を返す — `Option` でも `Result` でもなく。** 「制約なし」のケースは *最も safe な* state。これを表現可能な最大の ratio にマップしておけば、下流のすべての分類器が special-case 分岐なしに自然に short-circuit できる。**「情報なし」を「情報の欠如」としてではなく、「最も safe な値」として表現する。**

2. **Proptest の失敗そのものがレッスンだ。** Proptest が最初の試みで pass してしまっていたら、読者は「margin_ratio は mark に対して monotonic」とだけ学んで終わっていただろう。失敗とトレースのステップを経ることで、読者は「**margin_ratio は mark に対して *levered regime でのみ* monotonic であり、その特異な境界は、預け入れ担保 (collateral) がエントリー時の想定元本 (notional at entry = entry × size) とちょうど等しくなる点である**」という、より深いドメインの事実に到達する。自分で微分を歩いたからこそ、そのシステムに対する理解は揺るぎないものになる。

3. **条件付き不変量には `prop_assume!`。** 不変量が入力のサブセット上でしか成り立たないとき、正しい道具は `prop_assume!` だ。関数の事後条件を強めることでもなく、assertion を弱めることでもなく、手で strategy を制限することでもない。**不変量とは「どの条件下で真なのか」を含めて初めて意味を持つ。両方を表現する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L5 の後:
- **compute.rs** は Stage 10a を `margin_ratio` + 最初の 13 unit test + 3 proptest すべてまで一致する。残る 2 関数（L6 の `margin_health`、L7 の `close_order_spec`）とそのテストは pending。
- **lib.rs** は compute の re-export を 6 個中 4 個持つ — `notional_value`、`unrealized_pnl`、`account_equity`、`margin_ratio`。残り 2 つは L6 / L7 で着地する。

## よくある質問

**Q1: なぜ flat ポジションは `MarginRatio(i64::MAX)` を返し、`MarginRatio(0)` や `Option::None` ではないのか?**

`MarginRatio(0)` は flat アカウントを *最悪* の margin state に分類してしまい、margin_ratio の各 consumer に「これは本当にゼロか、それとも flat か?」の special-case を強制する。`Option::None` は honest だが、その special case を呼び出しサイト全部に押し出す。`MarginRatio(i64::MAX)` は flat ケースを「無限に safe」と同義にしてくれる — liquidation の目的にとって、それは *実際そう* なのだ。これで margin_health は special-case 分岐なしに `Safe` に分類できる。**3 つの選択肢のうち、自然に compose するのは 1 つだけ。**

**Q2: なぜ collateral が margin_ratio を 100% 超に押し上げてもいいのか?**

Margin ratio は `equity / notional` のスケールにすぎない。数学的に 100% の上限はない — $1,000 の collateral と $100 の notional のポジションは 1,000% margin ratio になる。実際の取引所はこれを「10× collateralized」と報告する。エンジンは initial-margin しきい値を超えた ratio の具体値を気にしない。上方向はすべて `Safe` だ。**上限は UI の関心事であって、エンジンの関心事ではない。**

**Q3: Flat ガードなしで `margin_ratio` を常に i128 で計算して単純化できないか?**

できない。Rust では整数のゼロ除算は debug でも release でも panic する。Flat ガードはその panic を防いでいる。削除するなら `try_div`（i128 は built-in を持たない）や、branchless なアプローチ（rounding noise を足して除算前に notional を定数で乗算する）が必要になる。2 行のガードが一番クリーンだ。**条件分岐 1 つで明示的に書くほうが、トリッキーな branchless (分岐なし) の実装に逃げるよりも、コードの可読性と保守性の観点から遥かに安上がりだ。**

**Q4: 入力 strategy を `collateral in 1..(entry × size)` に制限するのではなく、なぜ `prop_assume!` なのか?**

理由は 2 つある。(1) Proptest の strategy はパラメータごとに独立しているため、inter-parameter 制約を表現するには `(entry, size, collateral).prop_filter(...)` や `flat_map` を組まなければならず、どちらも `prop_assume!` より noisy になる。(2) `prop_assume!` は前提条件をテスト本体の中に inline で見える形に置く — 読者は assertion のすぐ隣で「collateral ≥ notional-at-entry のケースはスキップ」を読み取れる。データ生成器の奥に埋もれない。**前提条件は assertion のある場所で表現する。データ生成器の中で表現するのではない。**

**Q5: Long monotonicity 不変量が成り立たないのはいつで、それは問題なのか?**

`collateral ≥ entry × size` のとき。cash-heavy regime で、ポジションが over-collateralized すぎて liquidation できない領域だ。その regime では mark が動くと margin ratio は上下するが、maintenance を下回ることはない。エンジンは何もする必要がない。**Monotonicity が破れるケースは、ちょうどエンジンが気にしないケースに重なる — だから `prop_assume!` で除外するのは workaround ではなく、正しい動きだ。**

## 次のレッスン (L6)

L6 では `margin_health` を追加する — `MarginRatio` を params と比較して、4 つの `MarginHealth` variant のどれか 1 つにマップする関数だ。境界の unit test 5 個（Safe / AtRisk / Liquidatable / Underwater / ちょうど maintenance の端）と、各しきい値で strict-less-than を使う理由の議論を載せる。L5 より短い — L6 までに規律は内面化されている。L6 は応用編だ。

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
