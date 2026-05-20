# Building OpenHL Funding — L7 draft (JA) — build-along

> openhl SHA `cd94137`（Stage 8b — funding state machine）に対するドラフト。
> コース: `building-openhl-funding-ja`（track: `reth-l1-architect`）。

---

## L7 — `openhl-funding-apply-funding-ja`

- **Module:** 2 (純粋な compute), sortOrder 3
- **Course-level sortOrder:** 7 (lesson 8 of 12)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT
- **Milestone:** Module 2 完了 — 純粋 compute すべて完成

### Content

````markdown
# レッスン 7 — `apply_funding` — 符号規約 + zero-sum proptest

## ゴール

このレッスンが終わると：

```bash
cargo test -p openhl-funding
```

…が 15 テストを通る（L4-L6 から 10 + 新規 5）。`compute.rs` が最後の pure 関数を得る：

- **`apply_funding(positions, mark, rate) -> Vec<Settlement>`** — rate を全 non-flat position に適用、マッチごとに settlement を生む。~25 行。
- **4 手書きトレース unit test**：
  - `apply_funding_skips_flat_positions`
  - `apply_funding_longs_pay_shorts_when_rate_positive`
  - `apply_funding_shorts_pay_longs_when_rate_negative`
  - `apply_funding_returns_empty_on_zero_rate`
- **1 proptest** — `balanced_book_settlements_sum_to_zero` — 任意の equal-and-opposite position pair で settlement の合計はゼロ。**Funding の根本保存則：再配分する、生成も破壊もしない。**

このレッスンで **Module 2 が閉じる**。3 つの pure 関数（`compute_premium`、`compute_rate`、`apply_funding`）すべて配置済み。Module 3（clock state machine）が L8 で開始。

教育の焦点は**符号規約**（longs-pay-shorts）、特にコードが*どう*表現するか：`delta_unscaled` の前の `-` 1 つ。1 文字が符号契約全体を担う。

## おさらい

L6 後：
- `compute_premium` → `Premium`
- `compute_rate` → `FundingRate`
- 10 テスト pass、proptest 1 pass
- `saturate_i128_to_i64` のユーザは 1 つ（`compute_premium`）

L7 で pipeline の最終段を配線 — rate を per-account settlement にする — saturate helper の 2 つ目のユーザを追加。

## プラン

3 つの編集：

1. **`compute.rs` に `apply_funding` を append** — `compute_rate` の後、`saturate_i128_to_i64` の前。
2. **既存の `mod tests` ブロックに 4 unit test + 1 proptest を append**。
3. **`lib.rs` を更新** — `apply_funding` を re-export に追加。

> 🛑 **考えてみよう。** スクロール前に — `size: PositionSize(i64)`（正 = long、負 = short）と `rate: FundingRate(i64)`（正 = longs pay shorts）がある。素朴な積 `size × rate` は long が正 rate ワールドにいると正。**だが long の settlement delta は*負*であるべき（longs pays）。** 符号 flip を encode する最もクリーンな方法は？

（答え：**積の前に `-` 1 つ。** `delta = -(size × mark × rate / RATE_SCALE)`。積 `size × rate` は「magnitude × payment-flow の方向」を自然に encode するが、`Notional` の符号規約は「アカウント中心」（正 = 受取、負 = 支払）。`-` が market 中心から account 中心へ flip する。**単項マイナス 1 つが規約全体を担う。** コードを読む誰もが `-` を見て規約がその時点で意図的に逆転されたと知る。）

## 手順

### Step 1: `apply_funding` を追加

`crates/funding/src/compute.rs` を開く。`compute_rate` の後、`saturate_i128_to_i64` の前に：

```rust
/// Apply `rate` to each position, producing one [`Settlement`] per non-flat
/// position. Flat positions (`size == 0`) are dropped — there's no settlement
/// to record. Order of input positions is preserved in the output.
///
/// Sign convention: with positive `rate`, longs (positive size) pay; shorts
/// (negative size) receive. The product `size * mark * rate / RATE_SCALE`
/// is the quote-currency delta; long pays → delta is negative for longs.
#[must_use]
pub fn apply_funding(
    positions: &[Position],
    mark: MarkPrice,
    rate: FundingRate,
) -> Vec<Settlement> {
    if rate.0 == 0 {
        return Vec::new();
    }

    let mut out = Vec::with_capacity(positions.len());
    for pos in positions {
        if pos.size.0 == 0 {
            continue;
        }
        // notional = size * mark, in i128 to absorb the product's full range.
        let notional = i128::from(pos.size.0).saturating_mul(i128::from(mark.0));
        // delta_unscaled = notional * rate; still i128.
        let delta_unscaled = notional.saturating_mul(i128::from(rate.0));
        // Sign convention: longs PAY when rate > 0. The product above is
        // positive (long size * positive rate) — we flip its sign so the
        // resulting delta is negative for longs and positive for shorts.
        let delta_scaled = -delta_unscaled / i128::from(RATE_SCALE);
        out.push(Settlement {
            account: pos.account,
            delta: Notional(saturate_i128_to_i64(delta_scaled)),
        });
    }
    out
}
```

~25 行。6 つの動く部分：

1. **`if rate.0 == 0 { return Vec::new(); }`** — zero-rate ファストパス。Allocation なし、作業なし。契約を反映：rate ゼロは「適用する funding なし」を意味する。Boot 中や oracle 故障で典型。

2. **`Vec::with_capacity(positions.len())`** — output capacity を事前 allocate。Flat position をフィルタしうるが、input length が良い上限。**Push しながら re-allocate を回避。** 小さな最適化、hot path で重要。

3. **`if pos.size.0 == 0 { continue; }`** — Flat position をスキップ。経済的エクスポージャなし、settle するとゼロ delta が出力を汚染。**Flat position があるとき output 長と input 長が異なる、と契約。**

4. **`i128::from(pos.size.0).saturating_mul(i128::from(mark.0))`** — notional の積。`size * mark` は大きな position と大きな mark で `i64::MAX` を超えうる（例：position `1e18` × mark `1e10` = `1e28`、i64 を遥かに超える）。**i128 + saturating_mul：`compute_premium` と同じ defensive レシピ。**

5. **`notional.saturating_mul(i128::from(rate.0))`** — 次の積。今 `size × mark × rate` を全部 i128 で持つ。この段階でも i128 が pathological 入力で saturate しうる。

6. **`-delta_unscaled / i128::from(RATE_SCALE)`** — 最終 scaling + 符号 flip。`RATE_SCALE` での除算が rate の per-billion scaling を undo。**先頭の `-` が符号規約。**

その後 `saturate_i128_to_i64(delta_scaled)` で i64（Notional の内部型）に clip、`Settlement` を push。

> 🛑 **考えてみよう。** なぜ関数は `positions: Vec<Position>`（owned vec）でなく `positions: &[Position]`（スライス）を取る？

（答え：**呼び出し側が position リストを所有して tick 間で再利用する。** 所有権を取ると呼び出し側が毎呼び出し前に clone する必要がある。Slice 借用はゼロコスト、呼び出し側が所有権を保持。**関数が使える最小制限の型を受ける** — iteration だけ要るなら Vec でなく slice。）

> 🛑 **やりがちな勘違い。** 「ループでなく `positions.iter().filter(...).map(...).collect()` を使えば？」 **動く、より idiomatic Rust。** Stage 8b が imperative ループを使うのは中間計算が別々の `let` binding のとき追いやすいから。関数チェーン `positions.iter().filter(|p| p.size.0 != 0).map(|pos| { let notional = ...; Settlement { ... } }).collect()` も同様に動く。**Idiom より可読性 — チームがデバッグしやすい形を選ぶ。**

### Step 2: 符号規約を歩く

符号 flip が関数中最も微妙な部分。両方向に追っていく。

**正 rate、long position：**
- `size.0 = +100`、`mark.0 = 100`、`rate.0 = 1_000_000`（0.1%）
- `notional = 100 × 100 = 10_000`（i128）
- `delta_unscaled = 10_000 × 1_000_000 = 10_000_000_000`（正 i128）
- `delta_scaled = -10_000_000_000 / 1_000_000_000 = -10`
- `Notional(-10)` → 「long が 10 支払う」

**正 rate、short position：**
- `size.0 = -50`、`mark.0 = 100`、`rate.0 = 1_000_000`
- `notional = -50 × 100 = -5_000`（負 i128）
- `delta_unscaled = -5_000 × 1_000_000 = -5_000_000_000`
- `delta_scaled = -(-5_000_000_000) / 1_000_000_000 = 5`
- `Notional(+5)` → 「short が 5 受け取る」

**負 rate、long position：**
- `size.0 = +100`、`mark.0 = 100`、`rate.0 = -1_000_000`
- `notional = 10_000`
- `delta_unscaled = 10_000 × -1_000_000 = -10_000_000_000`
- `delta_scaled = -(-10_000_000_000) / 1_000_000_000 = 10`
- `Notional(+10)` → 「long が 10 受け取る」 ✓

**`delta_unscaled` の前の `-` 1 つが 4 ケースすべての符号規約を一貫に担う。** これなしだと longs が支払うべきところで受け取り、逆も同様。**1 文字、1 設計決定。**

> 🛑 **やりがちな勘違い。** 「`-` なしで delta を計算して「市場 delta」と呼び、ストレージ層で flip すれば？」 **符号 flip ポイント 2 つはバグの可能性を 2 倍にする。** 数学層で「アカウント中心」を 1 度 encode すれば、下流のすべて（bridge、balance、telemetry）が一貫した規約で `Notional` を読む。**単一変換ポイントはテストする surface area の半分。**

### Step 3: 4 unit test を追加

既存の rate テストの後（proptest ブロックの前 — 新 proptest は既存の `proptest! { ... }` ブロックに Step 4 で追加）に：

```rust
    #[test]
    fn apply_funding_skips_flat_positions() {
        let positions = vec![pos(1, 0), pos(2, 100), pos(3, 0)];
        let settlements = apply_funding(&positions, MarkPrice(100), FundingRate(1_000_000));
        assert_eq!(settlements.len(), 1);
        assert_eq!(settlements[0].account, AccountId(2));
    }

    #[test]
    fn apply_funding_longs_pay_shorts_when_rate_positive() {
        // size 100 (long), mark 100, rate 0.001 (1_000_000 ppb)
        // delta = -(100 * 100 * 1_000_000 / 1_000_000_000) = -10
        let positions = vec![pos(1, 100), pos(2, -50)];
        let s = apply_funding(&positions, MarkPrice(100), FundingRate(1_000_000));
        assert_eq!(s[0].account, AccountId(1));
        assert_eq!(s[0].delta, Notional(-10), "long pays");
        assert_eq!(s[1].account, AccountId(2));
        assert_eq!(s[1].delta, Notional(5), "short receives, half size");
    }

    #[test]
    fn apply_funding_shorts_pay_longs_when_rate_negative() {
        let positions = vec![pos(1, 100), pos(2, -50)];
        let s = apply_funding(&positions, MarkPrice(100), FundingRate(-1_000_000));
        assert_eq!(s[0].delta, Notional(10), "long receives");
        assert_eq!(s[1].delta, Notional(-5), "short pays");
    }

    #[test]
    fn apply_funding_returns_empty_on_zero_rate() {
        let positions = vec![pos(1, 100), pos(2, -50)];
        let s = apply_funding(&positions, MarkPrice(100), FundingRate(0));
        assert!(s.is_empty());
    }
```

4 テスト、各々挙動を pin：

1. **`apply_funding_skips_flat_positions`** — 入力 3 position、2 つ flat。出力 1。フィルタセマンティクス確認。**生存 settlement のアカウントが non-flat 入力 position と一致することも確認。**

2. **`apply_funding_longs_pay_shorts_when_rate_positive`** — 標準シナリオ。Mark 100 で long position 100、rate 0.1% → delta -10（long が支払う）。Short position -50 → delta +5（short が受け取る、サイズ半分なので magnitude 半分）。**非対称 magnitude が delta が `|size|` でスケールすることを証明、ただ符号でなく。**

3. **`apply_funding_shorts_pay_longs_when_rate_negative`** — 同じ position、逆 rate。Long が今度は +10 受け取る、short が -5 支払う。**符号規約が symmetric であることを確認。**

4. **`apply_funding_returns_empty_on_zero_rate`** — fast-path。非空 position、ゼロ rate → 空出力。**早期 return が per-position 作業の前に走ることを確認。**

`pos(account, size)` helper は L5 のテストモジュール setup で追加済み。ここで自由に使う。

### Step 4: Balanced-book zero-sum proptest を追加

既存の `proptest! { ... }` ブロック（現在 `premium_is_antisymmetric_in_mark_index` のみ）に 2 つ目のテストを追加：

```rust
        /// Sum of all settlement deltas is zero (or exactly the negation of
        /// itself with saturation tolerance) when the population is balanced.
        /// Equivalently: funding redistributes between longs and shorts —
        /// it doesn't create or destroy quote currency.
        ///
        /// We test the property by constructing equal-and-opposite long/short
        /// pairs and asserting their settlements sum to zero exactly.
        #[test]
        fn balanced_book_settlements_sum_to_zero(
            size in 1i64..1_000_000,
            mark in 1u64..1_000_000,
            rate in -10_000_000i64..10_000_000,
        ) {
            let positions = vec![
                pos(1, size),
                pos(2, -size),
            ];
            let s = apply_funding(&positions, MarkPrice(mark), FundingRate(rate));
            if rate == 0 {
                prop_assert!(s.is_empty());
            } else {
                prop_assert_eq!(s.len(), 2);
                prop_assert_eq!(s[0].delta.0 + s[1].delta.0, 0);
            }
        }
```

**Zero-sum property が funding の根本保存則。** Balanced book — equal size の short ごとに long 1 つ — はちょうど再配分すべき。Shorts が集合的に receive する量と longs が集合的に pay する量が等しい、quote currency は生成も破壊もされない。

Proptest がこれを exercise：
- ランダムに `size`（1 から 1M）、`mark`（1 から 1M）、`rate`（-10M から +10M ppb、つまり -1% から +1%）**生成**。
- Balanced book を**構築**：account 1 が long `size`、account 2 が short `size`。
- **Funding を適用**。Rate がゼロなら出力空（settlement なし）。それ以外なら 2 settlement。
- Delta の合計が 0 であることを **assert**。

> 🛑 **考えてみよう。** なぜ `size` を full i64 範囲でなく `1i64..1_000_000` に bound？

（答え：**非常に大きな `size` や `mark` で i128 中間値が saturate しうる。** `i128::saturating_mul` が clip すると、ラウンドトリップ計算 `(size * mark * rate / RATE_SCALE)` が情報を失う — long の saturated 値が short の saturated 値の正確な負にならず、zero-sum property が破れる。**1M bound が saturation の起こらない regime に入力を保つ。** 現実 production proptest はもっと wide にできるが saturation 用 tolerance を加える必要、我々は単純な「no saturation regime」アプローチを選んだ。）

> 🛑 **やりがちな勘違い。** 「整数除算 rounding 用に `== 0` でなく `sum.abs() < 1` をテストすればよくない？」 **選んだ入力範囲内で property は厳密に成り立つ。** `size_long == -size_short` だから、i128 積が除算前に互いの厳密な負、`RATE_SCALE` で割っても変わらない（整数除算はゼロに向けて丸める、`-x / d == -(x / d)` が任意の符号付き `x` と正 `d` に成り立つ）。**範囲内で厳密 zero-sum、tolerance 不要。**

### Step 5: `lib.rs` を更新

現在の re-export：

```rust
pub use compute::{compute_premium, compute_rate};
```

これに：

```rust
pub use compute::{apply_funding, compute_premium, compute_rate};
```

アルファベット順。**Module 2 の 3 つの pure 関数すべてがクレートルートで re-export 済み。** 呼び出し側は `compute::` 経由なしで使える。

### Step 6: テストを実行

```bash
cargo test -p openhl-funding
```

期待：

```
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to `FundingClock`
    Finished `test` profile [unoptimized + debuginfo] in 0.7s

running 15 tests
test compute::tests::apply_funding_longs_pay_shorts_when_rate_positive ... ok
test compute::tests::apply_funding_returns_empty_on_zero_rate ... ok
test compute::tests::apply_funding_shorts_pay_longs_when_rate_negative ... ok
test compute::tests::apply_funding_skips_flat_positions ... ok
test compute::tests::balanced_book_settlements_sum_to_zero ... ok
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
... (L4-L6 テストの残り)

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**15 テスト全 green。** Rustdoc warning は 1 つだけ（`FundingClock` — L8 で解決）。**Module 2 が閉じる。**

よくあるエラー：

- **どこでも `delta == 0`** — `delta_unscaled` の前の `-` を忘れた。符号 flip なしだと longs と shorts が同じ符号 delta を得る（`pos.size` が既に符号を運ぶから）、longs と shorts が両方支払う/両方受け取る、互いに対立しない。Unit test がすぐ捕まえる。
- **Long が支払う、short が支払う**（両方負 delta） — `pos.size` が signed であることを見逃した。素朴な `size * mark * rate`（upcast なし）は動くかもしれないが符号追跡が脆弱。`i128::from(pos.size.0)` で符号を乗算を通して保つ。
- **`size = 100_000, mark = 100_000` で proptest 失敗** — `size * mark = 1e10`、その後 `× rate = 1e16` — i128 範囲内。Property は成立するはず。失敗するなら符号 flip を確認：long と short が反対符号 + 等規模 delta を生む必要。
- **`assertion failed: s[0].delta == Notional(-10)` が `Notional(10)`** — `delta_unscaled` を正しく設定したが先頭の `-` を忘れた。「longs pay = 負 delta」規約が flip を要求。

## 設計の振り返り

このレッスンに焼き込まれた決定 4 つ：

1. **単一の単項マイナスが符号規約全体を担う。** `-delta_unscaled` で「longs pay」を encode することで、規約が市場中心と account 中心セマンティクスの境界で 1 箇所に保たれる。**符号 flip ポイント 2 つはバグの surface area を 2 倍にする。**

2. **Filter する、error にしない。** Flat position は silent にフィルタされる。`Result<Vec<Settlement>, FlatPositionError>` を返さない — flat position は*想定されたもの*（この tick 前に閉じたアカウント）。**「flat position なし」property は呼び出し側が気にすれば verify できる前提条件、我々は単に drop する。**

3. **Slice 入力、owned 出力。** `&[Position]` で呼び出し側が所有権を保持、`Vec<Settlement>` で呼び出し側が以前持っていなかった owned data を返す。**関数は参照を消費し値を生む、pure transformation。**

4. **Proptest range が saturation regime を避ける。** `size in 1..1M` で i128 積を `saturating_mul` の clamp threshold 下に保つ。この範囲で property は*厳密に*成立、broaden すると property を弱める必要。**Property を厳密に真にする proptest range を選ぶ、近似でなく。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

L7 後：
- **compute.rs** が Stage 8b と**完全**一致。3 pure 関数すべて、helper すべて、テストすべて、proptest すべて。
- **lib.rs** が `apply_funding`、`compute_premium`、`compute_rate` を re-export。残るギャップは `pub mod clock;` とその re-export — L8。

**Module 2 完了。** Module 3 が L8 で開始。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: なぜ output がアカウント順ソートでなく入力順を保つ？**
Determinism。ソートは順序選択を強要、入力順保持は関数の挙動を入力から trivially predictable にする。**ソート出力が必要な呼び出し側は結果をソートできる、必要ない呼び出し側はコストを払わない。** デフォルトで最安挙動が勝つ。

**Q: 現実的入力で `notional × rate` の桁は？**
`size = 1M`、`mark = 1M`、`rate = 1e7`（RATE_SCALE の 1% = interval ごとに 1%）で：`notional = 1e12`、`delta_unscaled = 1e19`。これは `i64::MAX`（~9.2e18）の直近で、「合理的」入力で既に saturation regime にいる。**現実 deployment に i128 中間値は optional ではない。**

**Q: `apply_funding` の saturation 挙動のテストがないのは？**
Saturation ケースは*helper 経由で*テスト済み（`saturate_i128_to_i64` の境界挙動は L5 で探求）。同じ境界を関数呼び出しで再テストするのは冗長。**Helper を 1 度テスト、それ以外はそれを信頼する。** 完全性のため composition test（`size = u64::MAX, mark = u64::MAX, rate = i64::MAX`）を追加する価値があるかもしれないが、Stage 8b は選ばなかった — saturation 保証は helper から来る、helper はテスト済み。

**Q: `apply_funding` を巨大 position リストで `parallel_iter` にできる？**
`rayon` でできる。V0 では position リストは多くて数千アカウント（HL の現実のユーザ数、単一マーケットあたり）。並列化オーバーヘッドが作業を超える。**Tick ごとに 10K+ position で rayon が payoff する。** Production トラフィックが要求するまで先送り。

## Module 2 マイルストーン — 築いたもの

L7 後：
- **3 pure 関数**：`compute_premium`、`compute_rate`、`apply_funding`。
- **1 private helper**：`saturate_i128_to_i64`。
- **15 テスト**：9 手書きトレース + 2 proptest（antisymmetry、zero-sum）。
- **`compute.rs` ~150 行**（テスト除く）。
- Module 2 が clock 以外のすべてで **Stage 8b と byte-identical**。

Crate は今 `(positions, mark, index, params)` タプルから fully-determined `Vec<Settlement>` を生む。**数学は完了。** Module 3 がこれを tick-gating state でラップする — いつ計算するか、いつスキップするか、いつ settle するか。

## 次のレッスン（L8）

L8 で `crates/funding/src/clock.rs` を作成 — 新モジュール — `FundingClock` 構造体 + `FundingTick` 出力型付き。`tick()` の最初のバージョン追加：「十分時間が経過したか？」guard の後ろで `compute_premium` + `compute_rate` + `apply_funding` を組み合わせる関数。**Clock は pure 数学を正しい cadence で呼ぶ discrete event loop。** L8 のテストは単純な sanity テスト、*不変条件*（at-most-one-per-interval、no-catch-up）は L9 と L10 で独自のレッスンを得る。
````

---

## Seed-file slot

L7 は Module 2 の sortOrder 3（モジュールを閉じる）に入る：

```typescript
{
  title: 'レッスン 7 — apply_funding — 符号規約 + zero-sum proptest',
  slug: 'openhl-funding-apply-funding-ja',
  type: 'CONTENT',
  sortOrder: 3,
  duration: 40,
  xpReward: 80,
  content: `# レッスン 7 — \`apply_funding\` — 符号規約 + zero-sum proptest\n\n...`
},
```

## SHA pinning discipline

L7 は `cd94137`（Stage 8b）を引用。L7 後、`compute.rs` は Stage 8b と byte-identical。lib.rs に 3 関数すべての re-export。

## Style review notes (self-critique before paste)

- **§ゴールが L7 を Module 2 close としてフレーミング** — pure compute すべて完了。
- **§考えてみよう（符号 flip）**が設計選択を正当化 — 読者が unary minus が最もクリーンな encoding である理由を推論。
- **§Step 1 が 6 名前付き動く部分**。
- **§Step 2 が 4 符号組み合わせを明示的算術で歩く**。
- **§やりがちな勘違い（符号 flip 2 ポイント）**が「symmetric semantics が欲しい」反射を先回り。
- **§Step 3 が各テストが何を捕まえるかを説明**。
- **§Step 4 に proptest range の考えてみよう** — なぜ full i64 でなく 1M bound。
- **§やりがちな勘違い（saturation tolerance）**が「proptest が rounding を tolerate すべきでは？」反射を先回り。
- **§設計の振り返り 1-4** が distinct 一般化可能パターンを名指す。
- **§よくある質問**が順序保持、桁解析、saturation テスト、並列化を扱う。
- **§Module 2 マイルストーンまとめ**が閉じを celebrate。
- **L8 プレビュー**が具体的：新モジュール、FundingClock 構造体、tick が 3 pure 関数すべてを組み合わせ。
