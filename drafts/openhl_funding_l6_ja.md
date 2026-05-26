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

このレッスンで掴む概念:

- **演算順が単位を決める** — 先に割って、*それから* clamp する。Cap は `4%/interval` なので rate レベルで bind する必要がある。Clamp してから divide すると、cap の実効値が `cap/divisor`（Hyperliquid デフォルトなら `0.5%/interval`）にすり替わり、仕様が静かに弱められてしまう。
- **`.clamp(-cap, cap)` で対称的にクランプする** — 標準の `i64::clamp` が両側を一度に処理してくれる。よくあるバグは `min(raw, cap)` のように正側だけ clamp して負側を見落とすパターンだ。`.clamp` を使えばそれが構造的に防げる。
- **API 境界での defensive な `.abs()`** — `FundingRate(-40_000_000)` を「絶対値」として受け入れれば、呼び出し側のフットガンを 1 つ減らせる。コストは ~1 ns、効果は実質的だ。
- **自然に成立する edge case は明示的な分岐より強い** — `cap == 0` は `clamp(0, 0) = 0` から自動的に `FundingRate(0)` を生む。特例コードを書かない = テストすべきコードパスも増えない。
- **Property のない場所に proptest を強引に当てない** — `compute_rate` は「割って clamp」だけで、proptest が活きる代数的不変条件がない。手書きトレースで入力領域をカバーすれば十分だ。Property がない場所に無理に proptest を書く必要はない。

検証：

```bash
cargo test -p openhl-funding
```

上記の実行結果が 10 テストを通る（L4-L5 で書いた 5 つ + 新規 5 つ）。

具体的な変更:

`compute.rs` に加わるのは：

- **`compute_rate(premium, params) -> FundingRate`** — 生 premium を `params.divisor` で割り、`±params.rate_cap` に clamp して per-interval rate を生む関数。
- **unit test 5 つ** — divisor の効果、正側 cap での clamp、負側 cap での clamp、divisor=0 での無効化、cap=0 での無効化をカバーする。

L6 が終われば、`compute.rs` の 3 つの pure 関数のうち 2 つが揃う。**残るは `apply_funding` だけ** — L7 で扱う。

教育上の焦点は**演算順**だ：割って*から* clamp する。順序を逆にすると rate cap の意味が完全に変わってしまう — 紛れ込みやすく見つけにくい、off-by-one 系の設計バグだ。

## おさらい

L5 後の状態：
- `compute_premium` が mark/index から符号付き premium を生む。
- Antisymmetry proptest が 256 個のランダムペアを exercise している。
- `saturate_i128_to_i64` は配置済みだが、これまで使っているのは `compute_premium` だけ。

L6 では 2 つ目の pure 関数を追加する。`compute_rate` は `compute_premium` より短い（overflow 対策の体操がない — 扱う値が既に i64 に収まっているからだ）が、独自の設計判断セットを encode する。

## プラン

編集は 3 つ：

1. **`compute.rs` に `compute_rate` を追加**する — body は 10 行、`compute_premium` の後ろ（`saturate_i128_to_i64` の前）に置く。
2. **既存の `mod tests` ブロックに unit test を 5 つ追加**する。
3. **`lib.rs` を更新**する — `compute_rate` を `pub use compute::{...}` の re-export に加える。

> 🛑 **考えてみよう。** スクロール前に — まず `raw_rate = premium / divisor` を計算し、それから `±cap` に clamp するのが今回の方針だ。**順序を逆にして、先に clamp してから割るとどう変わるか？** ヒント：cap の単位を考えよ。

（答え：**先に clamp すると、cap が「最大 rate」ではなく「最大 premium」を意味するようになってしまう。** `cap = 4%/interval`、`divisor = 8` のとき、premium を `±4%` に clamp してから割ると最大 *rate* は `0.5%/interval` になる。今回のアプローチ（先に割って rate レベルで clamp）なら、cap がそのまま `4%/interval` で bind する。**Cap の単位は出力の単位に合わせる必要がある。** Premium と rate はどちらも `RATE_SCALE` でスケーリングされているので数値的には似て見えるが、意味は別物だ。Divisor が、cap が何を縛っているのかを変えてしまう。）

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

Body は 10 行、動く部分は 4 つ：

1. **`if params.divisor == 0 { return FundingRate(0); }`** — funding 無効化のための早期 return。これがないと `premium.0 / i64::from(params.divisor)` の行でゼロ除算 panic が起きる。**divisor がゼロのときに安全な対応は guard 一択だ。**

2. **`premium.0 / i64::from(params.divisor)`** — 除算。`premium.0` は `i64`、`divisor` は `u32` だ。`i64::from(u32)` がロスレスに widen する（u32 のあらゆる値が i64 に収まる）。`i64 / i64` で i64 の商が得られる。**結果が clamp 前の「生」per-interval rate になる。**

3. **`let cap = params.rate_cap.0.abs();`** — cap を絶対値として取り出す。`params.rate_cap` は `FundingRate(i64)` なので、ユーザが負の値を渡してくる*可能性がある*。Cap の符号は気にしない — 気にするのは規模だ。**Cap は「幅」であって「位置」ではない。**

4. **`raw.clamp(-cap, cap)`** — 対称的に clamp する。`i64::clamp(min, max)` は `raw < min` なら `min`、`raw > max` なら `max`、それ以外なら `raw` を返す。**Rust 組み込みの API なので、手書きの `if/else` チェーンは要らない。**

> 🛑 **やりがちな勘違い。** 「Cap に `.abs()` を付ける意味は？ ユーザに正の cap を渡せと要求すれば済まないか？」 **できるが、defensive な abs のほうが実行時バリデーションより安く済む。** 「負の cap」あるいは「絶対 cap、符号はどちらでも可」のつもりで `FundingRate(-40_000_000)` を渡したユーザは、`FundingRate(40_000_000)` と同じ挙動を得る。コストは `.abs()` の呼び出し 1 回（~1ns）、得られるのは footgun を 1 つ減らせることだ。**`.abs()` を入れることは、API 上で「cap はどちらの符号も受け入れる、magnitude として解釈する」と表明しているのと等価だ。**

> 🛑 **やりがちな勘違い。** 「`params.rate_cap == 0` も特殊ケースとして扱うべきでは？」 **不要だ — 自然に処理される。** `cap == 0` のとき `clamp(-0, 0)` は入力に関わらず `0` を返す。結果は `FundingRate(0)` で、これがまさに我々が望む funding 無効化のセマンティクスだ。**Edge case が自然に処理されるコードのほうが、明示的に edge case 分岐を書くコードより良い。**

### Step 2: なぜ先に割るのか

順序が重要だ。代替案は 2 つ：

**A) 今回のアプローチ：割ってから clamp**

```rust
let raw = premium / divisor;
let capped = raw.clamp(-cap, cap);
```

- Cap は*rate*レベルで bind する。
- `cap = 4%/interval` の意味は「1 つの interval で 4% を超えて支払わない」となる。
- Premium 100% / divisor 8 → raw 12.5%、それを 4% に clamp。

**B) 逆：clamp してから割る**

```rust
let capped_premium = premium.clamp(-cap, cap);
let raw = capped_premium / divisor;
```

- Cap は*premium*レベルで bind する。
- `cap = 4%` の意味は「1 つの premium 観測値が 4% を超えない」となる。
- Premium 100% を 4% に clamp してから 8 で割り、最終 rate は 0.5% になる。

**欲しいのはアプローチ A だ。** アプローチ B だと cap は事実上 `0.5%/interval`（rate_cap を divisor で割った値）になってしまい、docstring が約束している内容と合わない。

**Premium が 100% (= `RATE_SCALE` ppb) のとき**、両アプローチが同じ入力からどれだけ異なる出力に着地するか、データフローで並べると差が極端に見える:

```
HL デフォルト: divisor = 8, cap = ±4%

🟢 アプローチA (今回の実装) — divide → clamp
   ┌─ Premium: 100% (1_000_000_000 ppb) ─┐
   │                                      │
   │            ┌─ / divisor 8 ──► raw rate: 12.5% (125_000_000 ppb)
   │            │                                    │
   │            │                                    ▼
   │            │                      ┌─ clamp(-4%, +4%) ─► 4% (40_000_000 ppb)  ✨ 正解
   │            ▼                      │                          │
   └────────────┴──────────────────────┘                          ▼
                                                           [FundingRate: 4%/interval]
                                                            = spec 通りの上限を bind

🔴 アプローチB (順序逆転、間違い) — clamp → divide
   ┌─ Premium: 100% (1_000_000_000 ppb) ─┐
   │                                      │
   │            ┌─ clamp(-4%, +4%) ──► clamped premium: 4% (40_000_000 ppb)
   │            │                              │
   │            │                              ▼
   │            │              ┌─ / divisor 8 ──► 0.5% (5_000_000 ppb)  ❌ spec の 1/8
   │            ▼              │                       │
   └────────────┴──────────────┘                       ▼
                                                [FundingRate: 0.5%/interval]
                                                 = cap が「premium 上限」にすり替わり、
                                                   実効上限が spec の 1/divisor になる
```

同じ `premium` / `divisor` / `cap` を渡しても、関数内部の 2 行を入れ替えるだけで最終 rate が **4%** と **0.5%** という 8 倍違う値に着地する。コンパイラもテストも警告を出さない、純粋に semantics 上のバグだ。「cap の単位は出力の単位 (rate) に合わせる必要がある」が、その差を 1 文に圧縮した規律になっている。

> 🛑 **考えてみよう。** `params.hyperliquid_default()`（divisor=8、cap=4%）のもとで、premium が `RATE_SCALE`（100% の dislocation）のときに生まれる最大 rate はいくらか。

（答え：**`FundingRate(40_000_000)` = 4%/interval。** 順に計算する：premium.0 = 1_000_000_000（RATE_SCALE）、raw = 1_000_000_000 / 8 = 125_000_000（12.5%/interval）、cap = 40_000_000（4%）。125_000_000 に対する clamp(-40_000_000, 40_000_000) は 40_000_000 を返す。**cap がきちんと仕事をする。** アプローチ B と比較してみよう：clamped_premium = clamp(1_000_000_000, -40_000_000, 40_000_000) = 40_000_000、raw = 40_000_000 / 8 = 5_000_000（0.5%）。spec を大きく下回ってしまう。）

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

テストは 5 つ、それぞれが特定の挙動を pin する：

1. **`rate_divides_premium_by_divisor`** — normal なケース。Premium 1%（10_000_000 ppb）、divisor 8 → rate 0.125%（1_250_000 ppb）。期待値は紙の上の数学 `10_000_000 / 8 = 1_250_000` から導ける。除算の off-by-one を捕まえる。

2. **`rate_clamps_at_positive_cap`** — clamp が起きるのは、premium が cap を超える生 rate を生むときだ。Premium 100% → raw 12.5% → 4% に clamp。**「clamp を書き忘れた」バグを捕まえる。**

3. **`rate_clamps_at_negative_cap`** — #2 の負側対称版。Premium -100% → raw -12.5% → -4% に clamp。**「正側だけ clamp した」バグを捕まえる。** これは現実によくあるバグパターンで、`raw.clamp(-cap, cap)` の代わりに `min(raw, cap)` を書いて負側を見落とすケースだ。

4. **`rate_zero_when_divisor_is_zero`** — divisor 経由で funding 無効化するケース。premium が非ゼロでも、`divisor = 0` のとき関数はゼロを返す。**ゼロ除算 guard を書き忘れたケースを捕まえる。** Guard がないと、debug モードではこのテストが panic する。

5. **`rate_zero_when_cap_is_zero_funding_disabled`** — cap 経由で funding 無効化するケース。`rate_cap = 0` のとき clamp が `[0, 0]` になり、任意の生 rate が 0 に clamp される。**「clamp(0, 0) は 0 以外を返す」と勘違いするケースを捕まえる。** 「cap == 0 を特殊ケースとして扱わない」というアプローチが動くことも確認している。

> 🛑 **考えてみよう。** `params.rate_cap = FundingRate(-40_000_000)`（負の cap）にしてテスト 2 を実行したら何が起きるか。

（答え：**結果は同じ — `FundingRate(40_000_000)` になる。** `.abs()` が magnitude を取り出すからだ。絶対値が同じ負 cap と正 cap は、同じ挙動を生む。**「負の cap」は silent に受け入れられる。** これが defensive な abs のご利益だ — どちらを渡されてもユーザは合理的な挙動を得られる。）

### Step 4: `lib.rs` を更新

現在の re-export 行：

```rust
pub use compute::compute_premium;
```

これに：

```rust
pub use compute::{compute_premium, compute_rate};
```

これで public API に関数が 2 つ並ぶ。**アルファベット順を維持する** — `compute_premium` が `compute_rate` の前だ。L7 で `apply_funding` が加わってもパターンは同じだ。

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

10 テストすべてが green になる。rate テスト、premium テスト、proptest すべてが通る。

よくあるエラー：

- **`rate_zero_when_divisor_is_zero` で panic** — 早期 return の guard を書き忘れた場合だ。`premium.0 / 0` は Rust では算術 panic になる。関数の先頭に `if params.divisor == 0 { return FundingRate(0); }` を追加すること。
- **`rate_clamps_at_negative_cap` で `assertion failed: left=-125000000 right=-40000000`** — `raw.clamp(-cap, cap)` の代わりに `raw.min(cap).max(-cap)` と書いて min / max の順序を間違えた場合だ。canonical な Rust の書き方は `.clamp(min, max)` — これを使うこと。
- **`rate_divides_premium_by_divisor` で `assertion failed: left=0 right=1_250_000`** — `premium.0 / i64::from(params.divisor)` ではなく `premium.0 / params.divisor`（型混在）と書いた場合だ。本来はコンパイルエラー（`u32 vs i64` の不一致）になるが、`as i64` と typo するとコンパイルは通って truncate しうる。`i64::from(...)` を使うこと。
- **`lib.rs` の re-export で `error: cannot find function 'compute_rate'`** — `compute_rate` を re-export に加えたものの、関数本体を書き忘れた場合だ。`compute.rs` に関数 body を実際に追加したか確認すること。

## 設計の振り返り

このレッスンに焼き込んだ決定は 4 つ：

1. **先に割って、その後 clamp する。** Cap を bind するのは*rate*レベル（出力側）で、*premium*レベル（入力側）ではない。順序を逆にすると cap を実質的に divisor で割ったのと同じことになり、silent に弱まる。**単位が違うときは演算順が決定的に重要だ。**

2. **Cap には `.abs()` を付ける。** ユーザが負の cap を渡してきても対応できる defensive な処理で、コストは安く（~1ns）footgun を 1 つ減らせる。**API 境界での defensive idiom は、そのコストに見合う価値がある。**

3. **手書きの min/max ではなく `clamp(-cap, cap)` を使う。** Rust 組み込みの `.clamp` は `raw.max(-cap).min(cap)` より短く、idiomatic で、間違えにくい。**stdlib の API でまかなえるなら使う、まかなえないときだけカスタムコードに手を出す。**

4. **`cap == 0` を特殊ケースとして扱わない。** Clamp から自然に正しい結果が落ちる：`clamp(-0, 0)` は `0` を返す。**Edge case が自然に処理されるコードのほうが、明示的な分岐を持つ edge case のコードより良い。** 明示的な分岐はテストすべきコードパスを増やすが、自然な処理ならそれが自動的にカバーされる。

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

**Q: どうせ `i64` に widen するのに、`params.divisor` がなぜ `u32` なのか？**
Widening は `i64::from(u32)` の呼び出し 1 つで済むからだ — マシンコード上は no-op だ。`u32` で保存することのメリットは、ビットコストの節約（`FundingParams` は `Copy` で、小さい方がよい）と意味的な明快さ（divisor が `-1` や `u64::MAX` では意味不明だが、`u32::MAX` は ~40 億で十分なヘッドルームがある）にある。**`u32` を選ぶこと自体が「これは小さな正のカウントだ」という意図の documentation になる。**

**Q: `compute_rate` で overflow しうるか？**
しない。除算 `premium / divisor` は値を大きくしない — 正の整数除算は magnitude を小さくするだけだ。`clamp(-cap, cap)` も `cap` の i64 値を超えて成長することはない。**`compute_rate` 内で overflow は起こらない。** `compute_premium` と違って i128 中間値も不要だ。

**Q: `rate_cap > i64::MAX / 2` のときはどうなるか？ 対称な clamp は機能するのか？**
`i64::MIN` に対する `.abs()` は panic する。理由は**2 の補数表現の非対称性**だ: 符号付き 64 bit には負の数が正の数より 1 個多く詰め込まれている (負側は `i64::MIN = -2^63` まで、正側は `i64::MAX = 2^63 - 1` まで) ので、`|i64::MIN| = 2^63` という値は正の `i64` で表現できる範囲を 1 だけ超えてしまう。つまり `i64::MIN.abs()` は overflow し、debug build では panic / release build では wrap となる。だから `rate_cap.0 == i64::MIN` のときは `.abs()` が踏み抜く。Stage 8b ではこれを guard していない — ユーザ提供の `FundingParams` 側の問題として扱う。現実のデプロイでは `40_000_000`（`i64::MAX / 2` よりはるかに小さい）のような値を使うため、このエッジには届かない。**defensive な `saturating_abs()`（`i64::MIN` を `i64::MAX` に丸める）を入れれば対応できるが、Stage 8b では採用していない。**
加えて実運用では、ガバナンス経由のパラメータ更新や設定ロード時に `rate_cap` の境界（例: `0..=40_000_000`）を先に検証するのが通常で、`i64::MIN` のような爆弾値は pure 計算層まで到達させない。ここでも Defense in Depth を使う。

**Q: `compute_rate` の proptest がないのはなぜか？**
明らかな代数的 property が見当たらないからだ。「Divide and clamp」には proptest が輝くような antisymmetry や可換性、その他の不変条件がない。代わりに手書きトレーステスト 5 つで入力領域（通常の除算、正側 clamp、負側 clamp、divisor 0、cap 0）をきれいにカバーしている。**proptest は property に向き、手書きトレースは個別の入力領域に向く。** property がない場所に無理に proptest を当てる必要はない。

## 次のレッスン（L7）

L7 では `apply_funding` を追加する — 3 つ目で最後の pure 関数だ。`Position` のスライスと `MarkPrice`、`FundingRate` を受け取り、`Vec<Settlement>`（非 flat な position 1 つにつき 1 つ）を返す。関数は ~25 行だが、*longs-pay-shorts* の符号規約を encode し、**balanced-book zero-sum** の proptest を伴う — 等しく逆向きの position の集合に対して、settlement delta の合計はゼロになる（funding は再配分するだけで、quote currency を生成も破壊もしない）。Crate 2 つ目の proptest であり、これで Module 2 が閉じる。
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
