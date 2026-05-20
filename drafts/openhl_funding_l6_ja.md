# Building OpenHL Funding — L6 draft (JA) — build-along

> openhl SHA `cd94137`（Stage 8b — funding state machine）に対するドラフト。
> コース: `building-openhl-funding-ja`（track: `reth-l1-architect`）。

---

## L6 — `openhl-funding-compute-rate-ja`

- **Module:** 2 (純粋な compute), sortOrder 2
- **Course-level sortOrder:** 6 (lesson 7 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# レッスン 6 — `compute_rate` — divisor + cap

## ゴール

このレッスンが終わると：

```bash
cargo test -p openhl-funding
```

…が 10 テストを通る（L4-L5 から 5 + 新規 5）。`compute.rs` が得るもの：

- **`compute_rate(premium, params) -> FundingRate`** — 生 premium を `params.divisor` で割り、`±params.rate_cap` に clamp して per-interval rate にする。
- **5 unit test** — divisor 効果、正 cap clamp、負 cap clamp、divisor=0 で無効化、cap=0 で無効化をカバー。

L6 後、`compute.rs` の 3 つの pure 関数のうち 2 つが完了。**残るは `apply_funding` のみ** — L7。

教育の焦点は**演算順**：divide *してから* clamp。順を逆にすると rate cap の意味が完全に変わる — 入れやすく検出が難しい off-by-one 設計バグの一種。

## おさらい

L5 後：
- `compute_premium` が mark/index から符号付き premium を生む。
- Antisymmetry proptest が 256 ランダムペアを exercise。
- `saturate_i128_to_i64` 配置済み、だが今まで `compute_premium` だけが使用。

L6 で 2 つ目の pure 関数を追加。`compute_rate` は `compute_premium` より短い（overflow 体操なし — 処理する値が既に i64 に収まる）が独自の設計決定セットを encode。

## プラン

3 つの編集：

1. **`compute.rs` に `compute_rate` を append** — body 10 行、`compute_premium` の後ろ（`saturate_i128_to_i64` の前）。
2. **既存の `mod tests` ブロックに 5 unit test を append**。
3. **`lib.rs` を更新** — `compute_rate` を `pub use compute::{...}` re-export に追加。

> 🛑 **考えてみよう。** スクロール前に — `raw_rate = premium / divisor` を計算してから `±cap` に clamp する。**先に clamp してから割ったらどう変わる？** ヒント：cap がどの単位かを考える。

（答え：**先に clamp すると cap が「最大 premium」を意味するようになる、「最大 rate」ではなく。** `cap = 4%/interval`、`divisor = 8` で、premium を `±4%` に clamp してから割ると最大 *rate* は `0.5%/interval` になる。我々のアプローチ（先に割って rate レベルで clamp）だと cap が真に `4%/interval` で bind する。**Cap の単位は出力の単位に合わせる必要がある。** Premium と rate は両方 `RATE_SCALE` でスケール、数値的に似て見える — だが意味は違う。Divisor がどちらを cap しているかを変える。）

## 手順

### Step 1: `compute_rate` を追加

`crates/funding/src/compute.rs` を開く。`compute_premium` の後ろ、`saturate_i128_to_i64` の前に：

```rust
/// Divide the premium by `params.divisor` and clamp to ±`params.rate_cap`.
///
/// `divisor == 0` is treated as "funding disabled" → returns `FundingRate(0)`,
/// which causes `apply_funding` to produce zero-delta settlements for every
/// position (or none, by the filter inside `apply_funding`).
#[must_use]
pub fn compute_rate(premium: Premium, params: FundingParams) -> FundingRate {
    if params.divisor == 0 {
        return FundingRate(0);
    }
    let raw = premium.0 / i64::from(params.divisor);
    let cap = params.rate_cap.0.abs();
    let capped = raw.clamp(-cap, cap);
    FundingRate(capped)
}
```

Body 10 行。4 つの動く部分：

1. **`if params.divisor == 0 { return FundingRate(0); }`** — funding-disabled 早期 exit。これなしだと `premium.0 / i64::from(params.divisor)` 行が panic（ゼロ除算）。**Divisor がゼロのときの唯一の安全な対応は guard。**

2. **`premium.0 / i64::from(params.divisor)`** — 除算。`premium.0` は `i64`、`divisor` は `u32`。`i64::from(u32)` がロスレスに widen（任意の u32 値が i64 に収まる）。`i64 / i64` が i64 商を生む。**結果は clamp 前の「生」per-interval rate。**

3. **`let cap = params.rate_cap.0.abs();`** — cap を絶対値として抽出。`params.rate_cap` は `FundingRate(i64)`、ユーザが負の値を渡した*かもしれない*。Cap の符号は気にしない — 規模を気にする。**Cap は幅、位置ではない。**

4. **`raw.clamp(-cap, cap)`** — symmetric clamp。`i64::clamp(min, max)` は `raw < min` なら `min`、`raw > max` なら `max`、それ以外なら `raw` を返す。**Rust 組み込み API、manual `if/else` チェーン不要。**

> 🛑 **やりがちな勘違い。** 「Cap に `.abs()` を付ける意味は？ ユーザに正の cap を渡すよう要求すれば？」 **できるが、defensive abs はランタイム検証より安価。** 「負の cap」もしくは「絶対 cap、どちらの符号も許す」と思って `FundingRate(-40_000_000)` を渡したユーザは `FundingRate(40_000_000)` と同じ挙動を得る。コストは `.abs()` 呼び出し 1 つ（~1ns）、メリットは footgun 1 つ削減。**`.abs()` は API での「cap にはどちらの符号も受ける、magnitude として解釈する」と言うのと等価。**

> 🛑 **やりがちな勘違い。** 「`params.rate_cap == 0` も特殊ケースとして扱うべきでは？」 **不要 — 自然に落ちる。** `cap == 0` のとき `clamp(-0, 0)` は任意の入力に対して `0` を生む。結果は `FundingRate(0)`、これが我々が望む disabled-funding セマンティクス。**Edge case が自然に処理されるコードは、明示的 edge-case 分岐を持つコードより良い。**

### Step 2: なぜ先に割るか

順序が重要。2 つの代替：

**A) 我々のアプローチ：割ってから clamp**

```rust
let raw = premium / divisor;
let capped = raw.clamp(-cap, cap);
```

- Cap が*rate*レベルで bind。
- `cap = 4%/interval` は「単一 interval で 4% 以上支払わない」を意味。
- Premium 100% / divisor 8 → raw 12.5%、4% に clamp。

**B) 逆：clamp してから割る**

```rust
let capped_premium = premium.clamp(-cap, cap);
let raw = capped_premium / divisor;
```

- Cap が*premium*レベルで bind。
- `cap = 4%` は「単一 premium reading が 4% を超えない」を意味。
- Premium 100% が 4% に clamp、その後 8 で割って最終 rate 0.5%。

**アプローチ A が我々が欲しいもの。** アプローチ B だと cap が事実上 `0.5%/interval`（rate_cap を divisor で割ったもの）になり、docstring が約束しているものではない。

> 🛑 **考えてみよう。** `params.hyperliquid_default()`（divisor=8、cap=4%）で premium `RATE_SCALE`（100% dislocation）から生まれる最大 rate は？

（答え：**`FundingRate(40_000_000)` = 4%/interval。** 歩いていく：premium.0 = 1_000_000_000（RATE_SCALE）。raw = 1_000_000_000 / 8 = 125_000_000（12.5%/interval）。cap = 40_000_000（4%）。125_000_000 に対する clamp(-40_000_000, 40_000_000) → 40_000_000。**Cap が仕事をする。** アプローチ B と比較：clamped_premium = cap 40_000_000 で clamp(1_000_000_000) → 40_000_000。raw = 40_000_000 / 8 = 5_000_000（0.5%）。Spec を大きく下回る。）

### Step 3: 5 unit test を追加

`#[cfg(test)] mod tests` ブロック内、既存の premium テストの後（proptest ブロックの前）に：

```rust
    #[test]
    fn rate_divides_premium_by_divisor() {
        let params = FundingParams::hyperliquid_default();
        // premium = 0.01 (10_000_000 ppb), divisor = 8 → rate = 1_250_000
        let r = compute_rate(Premium(10_000_000), params);
        assert_eq!(r, FundingRate(1_250_000));
    }

    #[test]
    fn rate_clamps_at_positive_cap() {
        let params = FundingParams::hyperliquid_default();
        // premium = 1.0 (RATE_SCALE), divisor = 8 → raw = 125_000_000
        // cap is 40_000_000 → clamps to 40_000_000.
        let r = compute_rate(Premium(RATE_SCALE), params);
        assert_eq!(r, FundingRate(40_000_000));
    }

    #[test]
    fn rate_clamps_at_negative_cap() {
        let params = FundingParams::hyperliquid_default();
        let r = compute_rate(Premium(-RATE_SCALE), params);
        assert_eq!(r, FundingRate(-40_000_000));
    }

    #[test]
    fn rate_zero_when_divisor_is_zero() {
        let mut params = FundingParams::hyperliquid_default();
        params.divisor = 0;
        let r = compute_rate(Premium(RATE_SCALE), params);
        assert_eq!(r, FundingRate(0));
    }

    #[test]
    fn rate_zero_when_cap_is_zero_funding_disabled() {
        let mut params = FundingParams::hyperliquid_default();
        params.rate_cap = FundingRate(0);
        let r = compute_rate(Premium(10_000_000), params);
        assert_eq!(r, FundingRate(0));
    }
```

5 テスト、それぞれ特定の挙動を pin：

1. **`rate_divides_premium_by_divisor`** — normal ケース。Premium 1%（10_000_000 ppb）、divisor 8 → rate 0.125%（1_250_000 ppb）。期待値は紙の数学 `10_000_000 / 8 = 1_250_000`。除算の off-by-one を捕まえる。

2. **`rate_clamps_at_positive_cap`** — Clamp が起きるのは premium が cap 超えの生 rate を生むとき。Premium 100% → raw 12.5% → 4% に clamp。**Catches：「clamp を忘れた」バグ。**

3. **`rate_clamps_at_negative_cap`** — #2 の負側 symmetric。Premium -100% → raw -12.5% → -4% に clamp。**Catches：「正側だけ clamp した」バグ。** これは現実のバグパターン — `raw.clamp(-cap, cap)` でなく `min(raw, cap)` を書いて負側を見逃す。

4. **`rate_zero_when_divisor_is_zero`** — divisor 経由の disabled-funding ケース。非ゼロ premium でも `divisor = 0` で関数が zero を返す。**Catches：ゼロ除算 guard を忘れた。** Guard なしだと debug モードでこのテストが panic する。

5. **`rate_zero_when_cap_is_zero_funding_disabled`** — cap 経由の disabled-funding ケース。`rate_cap = 0` で clamp が `[0, 0]`、任意の生 rate が 0 に clamp。**Catches：clamp(0, 0) が 0 を返す以外の何かをすると仮定。** 「cap == 0 に特殊ケースなし」アプローチが動くことも確認。

> 🛑 **考えてみよう。** `params.rate_cap = FundingRate(-40_000_000)`（負 cap）にしてテスト 2 を run したら何が起きる？

（答え：**同じ結果 — `FundingRate(40_000_000)`。** `.abs()` が magnitude を抽出するから。同じ絶対値の負 cap と正 cap が同じ挙動を生む。**「負 cap」は silent に受け入れられる。** これが defensive abs の効能 — ユーザはどちらでも合理的な挙動を得る。）

### Step 4: `lib.rs` を更新

現在の re-export 行：

```rust
pub use compute::compute_premium;
```

これに：

```rust
pub use compute::{compute_premium, compute_rate};
```

Public API に 2 つの関数。**アルファベット順維持** — `compute_premium` が `compute_rate` の前。L7 で `apply_funding` が来てパターンが続く。

### Step 5: テストを実行

```bash
cargo test -p openhl-funding
```

期待出力：

```
running 10 tests
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok
test compute::tests::rate_clamps_at_negative_cap ... ok
test compute::tests::rate_clamps_at_positive_cap ... ok
test compute::tests::rate_divides_premium_by_divisor ... ok
test compute::tests::rate_zero_when_cap_is_zero_funding_disabled ... ok
test compute::tests::rate_zero_when_divisor_is_zero ... ok

test result: ok. 10 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

10 テスト全 green。Rate テスト + premium テスト + proptest。

よくあるエラー：

- **`rate_zero_when_divisor_is_zero` で panic** — 早期 return guard を忘れた。`premium.0 / 0` は Rust で算術 panic。関数先頭に `if params.divisor == 0 { return FundingRate(0); }` を追加。
- **`rate_clamps_at_negative_cap` で `assertion failed: left=-125000000 right=-40000000`** — `raw.clamp(-cap, cap)` でなく `raw.min(cap).max(-cap)` を書いて min/max 順を間違えた。`.clamp(min, max)` が canonical Rust idiom、それを使う。
- **`rate_divides_premium_by_divisor` で `assertion failed: left=0 right=1_250_000`** — `premium.0 / i64::from(params.divisor)` でなく `premium.0 / params.divisor`（mixed type）を書いた。エラーは実はコンパイルエラー（`u32 vs i64` mismatch）、`as i64` と typo するとコンパイルするが truncate しうる。`i64::from(...)` を使う。
- **`lib.rs` re-export で `error: cannot find function 'compute_rate'`** — `compute_rate` を re-export に追加したが関数定義していない。`compute.rs` に関数 body を実際に追加したか確認。

## 設計の振り返り

このレッスンに焼き込まれた決定 4 つ：

1. **先に割って、それから clamp。** Cap が*rate*レベル（出力）で bind する、*premium*レベル（入力）ではない。順を逆にすると cap を divisor で実質的に割って、silent に弱める。**単位が異なるとき演算順が重要。**

2. **Cap に `.abs()`。** ユーザが負の cap を渡すことへの defensive、安価（~1ns）で footgun を削除。**API 境界での defensive idiom はコスト分の価値がある。**

3. **明示的 min/max でなく `clamp(-cap, cap)`。** Rust 組み込み `.clamp` が `raw.max(-cap).min(cap)` より短く idiomatic でエラー prone でない。**Stdlib API が合えば使う、合わないときだけカスタムコードに手を出す。**

4. **`cap == 0` に特殊ケースなし。** Clamp から自然に落ちる：`clamp(-0, 0)` は `0` を返す。**自然に処理される edge case は明示的分岐の edge case より良い。** 明示的分岐はテストするコードパスを増やす、自然な処理は自動的にカバーされる。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

L6 後：
- **compute.rs** が Stage 8b の `compute_premium` + `compute_rate` + `saturate_i128_to_i64` + 4 premium テスト + 5 rate テスト + 1 proptest まで一致。残るギャップは `apply_funding` と balanced-book proptest のみ（L7）。
- **lib.rs** が `compute_premium` と `compute_rate` を re-export。`apply_funding` は L7 の追加。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: どうせ `i64` に widen するなら `params.divisor` がなぜ `u32`？**
Widening は単一の `i64::from(u32)` 呼び出し — マシンコードで no-op コスト。`u32` ストレージの利点は bit コスト（`FundingParams` は `Copy`、小さいほうが良い）と semantic 明快さ（divisor が `-1` や `u64::MAX` は意味不明、`u32::MAX` は ~40 億、十分なヘッドルーム）。**`u32` が意図を documentation：「これは小さい正カウント」。**

**Q: `compute_rate` で overflow しうる？**
除算 `premium / divisor` は値を成長させない — 正整数除算が小さい magnitude を生む。`clamp(-cap, cap)` が `cap` の i64 値を超えて成長しない。**`compute_rate` 内で overflow 不可能。** `compute_premium` と違って i128 中間値不要。

**Q: `rate_cap > i64::MAX / 2` ならどう？ Symmetric clamp は動く？**
`i64::MIN` への `.abs()` は panic する（`i64::MIN` の magnitude に正の `i64` なし）。`rate_cap.0 == i64::MIN` で `.abs()` が panic する。Stage 8b はこれを guard しない — ユーザ提供 `FundingParams` の問題。現実 deployment は `40_000_000`（`i64::MAX / 2` を遥かに下回る）のような値を使う、実際にエッジに届かない。**Defensive `saturating_abs()` はこれを扱う、Stage 8b はやらない。**

**Q: `compute_rate` の proptest がない理由は？**
明らかな代数的 property がない。「Divide and clamp」には proptest が輝く antisymmetry、可換性、その他の不変条件がない。5 手書きトレーステストが入力領域（normal divide、正 clamp、負 clamp、divisor 0、cap 0）をうまくカバー。**Proptest は property に最適、手書きトレーステストは distinct な入力領域に最適。** Property がないところに proptest を強制しない。

## 次のレッスン（L7）

L7 で `apply_funding` を追加 — 3 つ目で最後の pure 関数。`Position` のスライス、`MarkPrice`、`FundingRate` を取り、`Vec<Settlement>`（非 flat position あたり 1 つ）を返す。関数は ~25 行だが*longs-pay-shorts*符号規約を encode、**balanced-book zero-sum** proptest を含む — equal-and-opposite position のセットに対して、settlement delta の合計はゼロ（funding は再配分、quote currency を生成も破壊もしない）。Crate 2 つ目の proptest、Module 2 を閉じる。
````

---

## Seed-file slot

L6 は Module 2 (純粋な compute) の sortOrder 2 に入る：

```typescript
{
  title: 'レッスン 6 — compute_rate — divisor + cap',
  slug: 'openhl-funding-compute-rate-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 6 — \`compute_rate\` — divisor + cap\n\n...`
},
```

## SHA pinning discipline

L6 は `cd94137`（Stage 8b）を引用。L6 後、compute.rs に欠けるのは `apply_funding` と balanced-book proptest のみ（L7）。lib.rs は `compute_premium` と `compute_rate` 両方を re-export。

## Style review notes (self-critique before paste)

- **§ゴールが「演算順」フォーカスをフレーミング** — 読者が divide-then-clamp 論を見るよう。
- **§考えてみよう（clamp-first vs divide-first）**が設計選択を正当化 — 読者が cap の単位を推論。
- **§Step 1 が関数 body に 4 つの名前付き動く部分**。
- **§やりがちな勘違い（`.abs()` defensive）**が「ユーザに任せる」反射を先回り。
- **§やりがちな勘違い（`cap == 0`）**が過剰検証反射を先回り（L4 の `MarkPrice(0)` 議論と同じ）。
- **§Step 2 のアプローチ A/B 比較表**が違いを具体的に示す。
- **§考えてみよう（hyperliquid_default + premium=RATE_SCALE）**が数学を 1 ステップずつ歩く。
- **§Step 3 各テストが何を捕まえるかの説明**が特定のバグパターンを名指す。
- **§考えてみよう（負 cap）**が `.abs()` 挙動を確認。
- **§設計の振り返り 1-4** が distinct 一般化可能パターンを名指す。
- **§よくある質問**が u32-vs-i64 ストレージ、overflow 解析、`i64::MIN` エッジ、proptest 適用可能性を扱う。
- **L7 プレビュー**が具体的：25 行関数、符号規約、balanced-book proptest、Module 2 完了。
