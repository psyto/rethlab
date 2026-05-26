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

このレッスンで掴む概念:

- **単項マイナス 1 つが符号規約全体を担う** — `-delta_unscaled` で「市場中心（longs が支払う）」から「アカウント中心（`Notional` 正 = 受取）」へと flip する。符号反転点が 2 箇所あれば、バグの表面積も 2 倍になる。1 箇所に集約することが契約だ。
- **保存則を proptest で pin する** — balanced book の settlement の合計は、saturation を踏まない範囲では「ちょうど」ゼロだ。正の `d` のもとで `-x/d = -(x/d)` が整数除算でも成立するからだ。Funding は再配分するだけで、quote currency を生成も破壊もしない。
- **Flat position はフィルタする、エラーにはしない** — `size == 0` は黙ってドロップする。`Result<Vec<Settlement>, FlatPositionError>` を返してしまうと、呼び出し側に「異常ではない条件」まで扱わせる。Flat position は*想定内*の状態であって例外ではない。
- **最も制約の弱い引数型を受け取る** — `positions: &[Position]`（スライスの借用）なら呼び出し側が所有権を保持し、tick をまたいで再利用できる。`Vec<Position>` を要求してしまうと毎回 clone を強制する。
- **Proptest のレンジは property が*厳密に*成立するように選ぶ** — `size in 1..1M` であれば i128 の積が `saturating_mul` の clamp 閾値を踏まずに済む。レンジを広げると「合計 == 0」を「`sum.abs() < epsilon`」へと弱める必要が出てくる — それは不変条件ではなく願望の property になってしまう。

検証：

```bash
cargo test -p openhl-funding
```

上記の実行結果が 15 テストを通る（L4-L6 で書いた 10 + 新規 5）。

具体的な変更:

`compute.rs` には最後の pure 関数が加わる：

- **`apply_funding(positions, mark, rate) -> Vec<Settlement>`** — rate をすべての non-flat な position に適用し、マッチごとに settlement を生む。~25 行。
- **手書きトレース unit test 4 つ**：
  - `apply_funding_skips_flat_positions`
  - `apply_funding_longs_pay_shorts_when_rate_positive`
  - `apply_funding_shorts_pay_longs_when_rate_negative`
  - `apply_funding_returns_empty_on_zero_rate`
- **proptest 1 つ** — `balanced_book_settlements_sum_to_zero` — 等しく逆向きの position ペアであれば、settlement の合計は常にゼロになる、というもの。**Funding の根本的な保存則だ：再配分するだけで、生成も破壊もしない。**

このレッスンで **Module 2 が閉じる**。3 つの pure 関数（`compute_premium`、`compute_rate`、`apply_funding`）がすべて揃う。Module 3（clock state machine）は L8 で始まる。

教育上の焦点は**符号規約**（longs-pay-shorts）、特にコードが*どう*それを表現するかにある：`delta_unscaled` の前に置く `-` 1 文字。たった 1 文字が符号契約全体を担う。

## おさらい

L6 後の状態：
- `compute_premium` → `Premium`
- `compute_rate` → `FundingRate`
- 10 テスト pass、proptest 1 つも pass。
- `saturate_i128_to_i64` のユーザは 1 つだけ（`compute_premium`）。

L7 では pipeline の最終段を組み立てる — rate をアカウントごとの settlement に落とし込む段だ。同時に、saturate helper の 2 番目のユーザも追加する。

## プラン

編集は 3 つ：

1. **`compute.rs` に `apply_funding` を追加**する — `compute_rate` の後、`saturate_i128_to_i64` の前に置く。
2. **既存の `mod tests` ブロックに、unit test 4 つと proptest 1 つを追加**する。
3. **`lib.rs` を更新**する — `apply_funding` を re-export に加える。

> 🛑 **考えてみよう。** スクロール前に — `size: PositionSize(i64)`（正 = long、負 = short）と `rate: FundingRate(i64)`（正 = longs が shorts に支払う）がある。素朴に `size × rate` を計算すると、long が正の rate の世界にいるときに値は正になる。**だが long の settlement delta は*負*であるべきだ（longs が支払う側だからだ）。** 符号反転を一番きれいに encode する方法は何か。

（答え：**積の前に `-` を 1 つ付ければよい。** `delta = -(size × mark × rate / RATE_SCALE)`。積 `size × rate` は「magnitude × payment-flow の方向」を自然に encode するが、`Notional` の符号規約は「アカウント中心」（正 = 受取、負 = 支払い）だ。`-` がそれを市場中心からアカウント中心へとフリップしてくれる。**単項マイナス 1 つが規約全体を担う。** コードを読む人は、その `-` を見て「ここで規約が意図的に反転されている」と分かる。）

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

~25 行、動く部分は 6 つ：

1. **`if rate.0 == 0 { return Vec::new(); }`** — zero-rate のファストパス。allocation も作業もなし。契約をそのまま反映する：rate がゼロ = 適用すべき funding なし。boot 中や oracle 故障時に典型的な状況だ。

2. **`Vec::with_capacity(positions.len())`** — 出力の capacity を事前確保する。Flat position は後でフィルタされうるが、input の長さは良い上限になる。**push しながら再アロケートが走るのを防ぐ。** 小さな最適化だが、hot path では効いてくる。

3. **`if pos.size.0 == 0 { continue; }`** — Flat な position をスキップする。経済的エクスポージャがないので、settle してもゼロ delta が出力を汚すだけだ。**Flat position があると、output の長さと input の長さは一致しない、というのが契約だ。**

4. **`i128::from(pos.size.0).saturating_mul(i128::from(mark.0))`** — notional の積。`size * mark` は、position が大きく mark も大きい場合に `i64::MAX` を超えうる（例：position `1e18` × mark `1e10` = `1e28` で、i64 をはるかに超える）。**i128 + saturating_mul：`compute_premium` と同じ defensive なレシピだ。**

5. **`notional.saturating_mul(i128::from(rate.0))`** — 次の積。これで `size × mark × rate` をすべて i128 で持てる。この段階でも pathological な入力に対しては i128 が saturate しうる。

6. **`-delta_unscaled / i128::from(RATE_SCALE)`** — 最終的なスケーリングと符号反転。`RATE_SCALE` での除算が rate に施した per-billion スケーリングを打ち消す。**先頭の `-` が符号規約を担う。**

その後 `saturate_i128_to_i64(delta_scaled)` で i64（Notional の内部型）に clip し、`Settlement` を push する。

> 🛑 **考えてみよう。** この関数が `positions: Vec<Position>`（owned vec）ではなく `positions: &[Position]`（スライス）を受け取る理由は何か。

（答え：**呼び出し側が position リストを所有していて、tick をまたいで再利用するからだ。** 所有権を奪う形にすると、呼び出し側は毎回呼び出す前に clone する必要が出てくる。Slice の借用はコストゼロで、呼び出し側は所有権を保持できる。**関数が使える型のうち、最も制約の弱いものを受け取る** — iteration だけで足りるなら、Vec ではなく slice にする。）

> 🛑 **やりがちな勘違い。** 「ループでなく `positions.iter().filter(...).map(...).collect()` を使えばよくないか？」 **動くし、Rust としてはより idiomatic だ。** Stage 8b で imperative なループを採っているのは、中間計算を別々の `let` binding として置く方が追いやすいからだ。関数チェーン `positions.iter().filter(|p| p.size.0 != 0).map(|pos| { let notional = ...; Settlement { ... } }).collect()` も同じく動く。**idiom より可読性を優先する** — チームがデバッグしやすい形を選ぶ。

### Step 2: 符号規約を歩く

符号反転は関数中もっとも微妙な部分だ。4 つの regime (Long/Short × 正/負 rate) で、先頭の単項マイナス `-` がどう最終出力を制御するかをマトリクスで眺めると、たった 1 文字に符号契約全体が乗っていることが見える:

```
【 正 rate (rate > 0)：longs が支払う局面 】
  Long  (+size) × (+rate) ──► (+ 積) ──► [ - ] ──► Notional(負)  ──► 支払い ⭕
  Short (-size) × (+rate) ──► (- 積) ──► [ - ] ──► Notional(正)  ──► 受取   ⭕

【 負 rate (rate < 0)：shorts が支払う局面 】
  Long  (+size) × (-rate) ──► (- 積) ──► [ - ] ──► Notional(正)  ──► 受取   ⭕
  Short (-size) × (-rate) ──► (+ 積) ──► [ - ] ──► Notional(負)  ──► 支払い ⭕
```

`size × rate` の生の積が市場中心 (longs pay = 正) でどんな符号を取ろうとも、先頭の `-` を 1 度通すだけで、4 ケースすべてが `Notional` 規約 (正 = アカウントの受取、負 = アカウントの支払い) に完璧にアラインする。**「1 文字に 1 つの設計判断を込める」とはこのことだ。** 以下で 4 ケースを具体的な数値で追う:

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

**負 rate、short position：**
- `size.0 = -50`、`mark.0 = 100`、`rate.0 = -1_000_000`
- `notional = -50 × 100 = -5_000`
- `delta_unscaled = -5_000 × -1_000_000 = 5_000_000_000`（正 i128）
- `delta_scaled = -5_000_000_000 / 1_000_000_000 = -5`
- `Notional(-5)` → 「short が 5 支払う」 ✓

**`delta_unscaled` の前の `-` 1 つが、4 ケースすべてで符号規約を一貫して担う。** これがないと、longs が支払うべき場面で受け取ってしまい、逆も然りだ。**1 文字に 1 つの設計判断を込めている。**

> 🛑 **やりがちな勘違い。** 「`-` を付けずに「市場 delta」として計算しておき、ストレージ層で反転すればよくない？」 **符号反転ポイントを 2 つ持つと、バグの可能性が 2 倍になる。** 数学レイヤーで一度だけ「アカウント中心」を encode しておけば、下流（bridge、balance、telemetry）はすべて統一された規約で `Notional` を読める。**変換ポイントを 1 つに絞れば、テストすべき surface area が半分になる。**

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

テストは 4 つ、それぞれ挙動を pin する：

1. **`apply_funding_skips_flat_positions`** — 入力 position 3 つ、うち 2 つが flat。出力は 1 つ。フィルタの semantics を確認する。**生き残った settlement のアカウントが、non-flat な入力 position と一致することも確認している。**

2. **`apply_funding_longs_pay_shorts_when_rate_positive`** — 標準的なシナリオ。Mark 100 で long position 100、rate 0.1% → delta -10（long が支払う）。Short position -50 → delta +5（short が受け取る、サイズが半分なので magnitude も半分）。**非対称な magnitude を使うことで、delta が `|size|` でスケールすること（符号だけでなく）も証明している。**

3. **`apply_funding_shorts_pay_longs_when_rate_negative`** — 同じ position に対して rate を反転させたケース。今度は long が +10 受け取り、short が -5 支払う。**符号規約が対称であることを確認している。**

4. **`apply_funding_returns_empty_on_zero_rate`** — fast-path のケース。position は空ではないがゼロ rate → 空の出力。**早期 return が position ごとの処理より前に走ることを確認している。**

`pos(account, size)` helper は L5 のテストモジュール setup で追加済みなので、ここで自由に使える。

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

**Zero-sum property は funding の根本的な保存則だ。** Balanced book — 同じサイズの short 1 つにつき long 1 つ — では、ちょうど再配分が起きるはずだ。Shorts が集合として受け取る量と longs が集合として支払う量が等しく、quote currency は生成も破壊もされない。

ここで重要なのは、整数除算の切り捨てがあっても `(+P, -P)` の対称ペアでは恒等式 `(-P) / d == -(P / d)`（`d > 0`）が保たれる点だ。つまり long と short を厳密に反対符号・同一絶対値で組んだこのテストでは、端数も対称に相殺され、tolerance なしで和が厳密に 0 に揃う。

proptest はこれを exercise する：
- `size`（1 から 1M）、`mark`（1 から 1M）、`rate`（-10M から +10M ppb、つまり -1% から +1%）をランダムに**生成**する。
- Balanced book を**構築**する：account 1 が long `size`、account 2 が short `size`。
- **Funding を適用**する。Rate がゼロなら出力は空（settlement なし）、そうでなければ settlement が 2 つ生まれる。
- delta の合計が 0 であることを **assert** する。

> 🛑 **考えてみよう。** `size` を full i64 範囲ではなく `1i64..1_000_000` に絞っているのはなぜか。

（答え：**`size` や `mark` が極端に大きいと、i128 中間値が saturate しうるからだ。** `i128::saturating_mul` が clip すると、ラウンドトリップの計算 `(size * mark * rate / RATE_SCALE)` が情報を失う — long 側の saturate 後の値が short 側の saturate 後の値のちょうど負にならず、zero-sum property が壊れる。**1M の上限を置けば、入力を saturation の起きない領域に留められる。** 現実の production proptest はもっと広い範囲を取れるが、その場合は saturation のための tolerance を加える必要がある。今回はもっと単純な「saturation の起きない領域だけ」のアプローチを選んだ。）

> 🛑 **やりがちな勘違い。** 「整数除算の rounding に備えて `== 0` ではなく `sum.abs() < 1` をテストすればよくないか？」 **選んだ入力範囲のもとでは、property は厳密に成り立つ。** `size_long == -size_short` なので、除算前の i128 の積は互いに厳密な負、`RATE_SCALE` で割っても関係は維持される（整数除算はゼロに向かって丸めるので、任意の符号付き `x` と正の `d` に対して `-x / d == -(x / d)` が成り立つからだ）。**範囲内では厳密に zero-sum であり、tolerance は不要だ。**
>
> 「整数除算は端数を切り捨てるのに、合計が `+1` や `-1` にズレないのはなぜか？」 — long と short の `i128` 積が `(P, -P)` のように**絶対値が完全に同じで符号だけ反転したペア**になっているからだ。たとえば積が `(12_345, -12_345)` のとき、`12_345 / 1_000_000_000 = 0` 余り `12_345`、`-12_345 / 1_000_000_000 = 0` 余り `-12_345`。商は両方 `0` で、切り捨てられる端数も**絶対値が完全に一致して符号だけ逆向き**なので、合計すると端数も商もそれぞれ `0` に揃う。長辺と短辺の入力が厳密に対称である限り、`-x / d == -(x / d)` の恒等式が個別に成立し、合計の zero-sum が tolerance なしで守られる仕組みだ。

### Step 5: `lib.rs` を更新

現在の re-export：

```rust
pub use compute::{compute_premium, compute_rate};
```

これに：

```rust
pub use compute::{apply_funding, compute_premium, compute_rate};
```

アルファベット順だ。**これで Module 2 の 3 つの pure 関数がすべてクレートルートで re-export された。** 呼び出し側は `compute::` を経由せずに使える。

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

**15 テストすべてが green。** rustdoc warning は 1 つだけだ（`FundingClock` — L8 で解決する）。**これで Module 2 が閉じる。**

よくあるエラー：

- **どこでも `delta == 0` になる** — `delta_unscaled` の前の `-` を忘れた場合。符号反転がないと、longs と shorts が同じ符号の delta を得てしまう（`pos.size` 自体が既に符号を担っているからだ）。longs と shorts が両方とも支払い、あるいは両方とも受け取る形になってしまい、相殺しなくなる。Unit test がすぐ捕まえてくれる。
- **long も short も支払う**（両方が負の delta） — `pos.size` が signed であることを見落とした場合。素朴な `size * mark * rate`（upcast なし）でも動くことはあるが、符号追跡が脆い。`i128::from(pos.size.0)` を経由して、乗算の中で符号を保ち続ける必要がある。
- **`size = 100_000, mark = 100_000` で proptest が失敗** — `size * mark = 1e10`、その後 `× rate = 1e16` — i128 の範囲内だ。Property は成立するはずなので、失敗するなら符号反転を確認すること：long と short が反対符号 + 等しい規模の delta を生む必要がある。
- **`assertion failed: s[0].delta == Notional(-10)` だが `Notional(10)` が出る** — `delta_unscaled` の式は正しいが、先頭の `-` を忘れた場合。「longs pay = 負の delta」という規約が、その反転を要求する。

## 設計の振り返り

このレッスンに焼き込んだ決定は 4 つ：

1. **単項マイナス 1 つが符号規約全体を担う。** `-delta_unscaled` で「longs pay」を encode することで、規約は市場中心とアカウント中心の semantics 境界の 1 箇所だけに集約される。**符号反転ポイントを 2 つに増やすと、バグの surface area が 2 倍になる。**

2. **エラーにせず、フィルタする。** Flat position は silent にフィルタする。`Result<Vec<Settlement>, FlatPositionError>` のような形は返さない — flat position は*想定された状態*（この tick より前に閉じられたアカウント）だからだ。**「flat position が混じっていない」という property は、気になる呼び出し側が事前に検証すれば済む。こちら側は単に drop する。**

3. **入力は slice、出力は owned。** `&[Position]` を取ることで呼び出し側に所有権を残し、`Vec<Settlement>` を返すことで呼び出し側がそれまで持っていなかった owned data を渡せる。**関数が参照を消費して値を生む、pure な変換だ。**

4. **proptest の範囲を saturation regime から避ける。** `size in 1..1M` のように絞ることで、i128 の積を `saturating_mul` の clamp 閾値より下に保つ。この範囲では property が*厳密に*成り立つ。範囲を広げると property を弱める必要が出てくる。**proptest の範囲は、property を近似でなく厳密に真にできるように選ぶ。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

L7 後の状態：
- **compute.rs** が Stage 8b と**完全に**一致する。3 つの pure 関数すべて、helper すべて、テストすべて、proptest すべてが揃う。
- **lib.rs** が `apply_funding`、`compute_premium`、`compute_rate` を re-export している。残るギャップは `pub mod clock;` とその re-export — L8 で埋める。

**Module 2 完了。** Module 3 は L8 で始まる。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: 出力をアカウント順にソートせず、入力順を保つのはなぜか？**
Determinism のためだ。ソートはソート順の選択を強要するが、入力順を保つほうが、関数の挙動が入力から自明に予測可能になる。**ソートされた出力が必要な呼び出し側は自分でソートすればよく、不要な呼び出し側はコストを払わずに済む。** デフォルトとして最も安価な挙動を採る。

**Q: 現実的な入力では `notional × rate` の桁数はどれくらいになるか？**
`size = 1M`、`mark = 1M`、`rate = 1e7`（RATE_SCALE の 1% = interval あたり 1%）で計算すると `notional = 1e12`、`delta_unscaled = 1e19` になる。これは `i64::MAX`（~9.2e18）のすぐ近くで、「合理的」と言える入力ですら saturation regime に届きうる。**現実のデプロイで i128 中間値は optional ではない。**

**Q: `apply_funding` の saturation 挙動のテストがないのはなぜか？**
Saturation ケースは*helper を通じて*すでにテスト済みだからだ（`saturate_i128_to_i64` の境界挙動は L5 で探っている）。同じ境界を関数呼び出し越しに再テストするのは冗長になる。**Helper を 1 度テストしたら、あとはそれを信用する。** 念のため composition test（`size = u64::MAX, mark = u64::MAX, rate = i64::MAX` のような）を足す価値はあるかもしれないが、Stage 8b では採用していない — saturation の保証は helper から来ており、その helper はテスト済みだ。

**Q: 巨大な position リストに対して `apply_funding` を `parallel_iter` 化できるか？**
できる、`rayon` を使えばよい。ただし V0 では position リストはせいぜい数千アカウント（HL の現実のユーザ数、1 マーケットあたり）規模で、並列化のオーバーヘッドが処理量を上回る。**tick あたり 10K+ position まで増えれば rayon が payoff してくる。** Production のトラフィックが要求するまで、これは先送りでよい。

## Module 2 マイルストーン — 築き上げたもの

L7 後の状態：
- **pure 関数 3 つ**：`compute_premium`、`compute_rate`、`apply_funding`。
- **private helper 1 つ**：`saturate_i128_to_i64`。
- **テスト 15 個**：手書きトレース 13 個 + proptest 2 個（antisymmetry、zero-sum）。
- **`compute.rs` は ~150 行**（テストを除く）。
- Module 2 で書いた部分は、clock 以外のすべてが **Stage 8b と byte-identical** だ。

Crate は今や `(positions, mark, index, params)` のタプルから、完全に決定論的に `Vec<Settlement>` を生む。**数学は完成した。** Module 3 では、これを tick-gating の state でラップする — いつ計算し、いつスキップし、いつ settle するか、を担う部分だ。

## 次のレッスン（L8）

L8 では `crates/funding/src/clock.rs` を作成する — 新モジュールで、`FundingClock` 構造体と `FundingTick` 出力型を持つ。最初のバージョンの `tick()` も追加する：「十分な時間が経過したか？」の guard の背後で、`compute_premium`、`compute_rate`、`apply_funding` を組み合わせる関数だ。**Clock は pure な数学を正しい cadence で呼び出す discrete event loop だ。** L8 のテストは単純な sanity テストだけで、*不変条件*（interval ごとに最多 1 回、no-catch-up）は L9 と L10 でそれぞれ独立したレッスンを受け持つ。
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
