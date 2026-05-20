# Building OpenHL Funding — L4 draft (JA) — build-along

> openhl SHA `cd94137`（Stage 8b — funding state machine）に対するドラフト。
> コース: `building-openhl-funding-ja`（track: `reth-l1-architect`）。

---

## L4 — `openhl-funding-compute-premium-ja`

- **Module:** 2 (純粋な compute), sortOrder 0
- **Course-level sortOrder:** 4 (lesson 5 of 12)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# レッスン 4 — `compute_premium` — 最初の数学、最初のテスト

## ゴール

このレッスンが終わると：

```bash
cargo test -p openhl-funding
```

…が 4 unit test を通る。`openhl-funding` crate が「全型定義」から「型定義 + 最初の数学のピース」に：

- **`crates/funding/src/compute.rs`** — 新ファイル、module doc + 2 関数：
  - `compute_premium(mark, index) -> Premium` — `(mark - index) / index` を導出、`RATE_SCALE` スケール。
  - `saturate_i128_to_i64(v) -> i64` — clamp helper（private）。3 行。
- **`compute.rs` の `#[cfg(test)] mod tests` ブロックに 4 つの手書きトレース unit test**：
  - `premium_zero_when_mark_equals_index`
  - `premium_positive_when_mark_above_index`
  - `premium_negative_when_mark_below_index`
  - `premium_saturates_to_zero_when_index_is_zero`
- **`crates/funding/src/lib.rs`** — `pub mod compute;` 追加 + `compute_premium` を re-export。

これが**実際の数学**を持つ最初のレッスン。今後、すべてのコード変更がアカウント間で静かに wealth を shift させる可能性がある。手書きトレーステストが期待出力を、紙の数学で検証できる特定の入力値に pin する。

## おさらい

L3 後：
- 9 型 + `RATE_SCALE` が `types.rs` に — Stage 8b の完全な型 roster。
- まだ挙動ゼロ。Crate はコンパイルするが何もしない。

L4 で最初の関数を導入。関数は短い（body ~10 行）が 3 つの設計決定を encode：`index == 0` の grace ful 扱い、overflow safety のための `i128` 中間値、wrap/panic でなく saturation。

## プラン

3 つの編集：

1. **`crates/funding/src/compute.rs` を作成** — module doc + imports + `compute_premium` + private `saturate_i128_to_i64` helper。
2. **`#[cfg(test)] mod tests` を `compute.rs` に追加**、4 つの手書きトレース unit test 付き。
3. **`crates/funding/src/lib.rs` を更新** — `pub mod compute;` 宣言追加 + クレートルートで `compute_premium` を re-export。

> 🛑 **考えてみよう。** スクロール前に — `(mark - index) * RATE_SCALE / index` を計算する。`mark` と `index` は両方 `u64`、最大 ~1.8e19 まで。`RATE_SCALE` は `1e9`。*中間*積 `(mark - index) * RATE_SCALE` の最大サイズは？ どの型に収まる必要がある？

（答え：**`u64::MAX * 1e9` が `i64` を 10 桁オーバーフロー。** 最悪ケース `mark = u64::MAX`、`index = 0`（これは別に扱う）、もしくは `mark = u64::MAX`、`index = 1` → `(u64::MAX - 1) * 1e9 ≈ 1.8e28`。`i64::MAX` は ~9.2e18、中間値に `i128` が必要。`index` で割った後は i64 範囲に戻る — だが除算は乗算の*後*でなければならないので、中間値は i128 に収まる必要がある。**積には i128 が必須。Saturation は最終結果が i64 を超える稀なケースを扱う。**）

## 手順

### Step 1: module doc 付きで `compute.rs` を作成

`crates/funding/src/compute.rs` を作成。初期内容：

```rust
//! Pure funding-rate math.
//!
//! Three building blocks, each stateless:
//!   - [`compute_premium`] derives the mark/index gap as a signed fraction
//!   - [`compute_rate`] divides + caps to produce a per-interval rate
//!   - [`apply_funding`] turns a rate + position snapshot into settlements
//!
//! Each function is deterministic and saturates on overflow rather than
//! wrapping. Validators that disagree about funding fork the chain, so the
//! cost of an unexpected overflow has to be bounded behavior, not panic.

use crate::types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, Premium, Settlement,
    RATE_SCALE,
};
```

2 点：

**Module doc が 3 関数をプレビューするが、L4 では 1 つだけ出荷する。** クロス参照 `[compute_rate]` と `[apply_funding]` は L6 と L7 まで壊れている。**Warning を許容** — L1/L2 で `[FundingRate]` クロス参照を増分解決させたのと同じ。

**`use` 文が L4 ではまだ全部使わない型を import する。** `FundingParams`、`FundingRate`、`Notional`、`Position`、`Settlement` は L6/L7 の関数に必要。今 import しておけば L4 後 import block が安定 — L1 の `[dev-dependencies] proptest` と同じロジック。**Boilerplate は早期に安定化、ロジックを iterate する。**

> 🛑 **やりがちな勘違い。** 「L4-L6 の間 unused-import warning を抑えるべき？」 **Unused-import warning は*コンパイラ*が unused と見るアイテムで発火、rustdoc が参照するアイテムではない。** L7 までに `FundingRate`、`Notional` 等を使うので、コンパイラは文句を言わない — 同じモジュール内で後で使われる `use` 宣言を見ている。Warning を出すのは rustdoc クロス参照 `[compute_rate]` と `[apply_funding]` のみで、L6/L7 で解決される。

### Step 2: `compute_premium` を追加

`use` ブロックの後ろに：

```rust
/// Compute the premium `(mark - index) / index`, scaled by [`RATE_SCALE`].
///
/// Returns `Premium(0)` if `index == 0` — the safest behavior, since with no
/// reliable reference price the funding rate should not push capital around.
/// Real deployments should guard upstream (e.g., refuse to tick when the
/// oracle is missing); the saturation here is the second line of defense.
#[must_use]
pub fn compute_premium(mark: MarkPrice, index: IndexPrice) -> Premium {
    if index.0 == 0 {
        return Premium(0);
    }
    // (mark - index) as i128 so we can't lose sign on subtraction; multiply
    // by RATE_SCALE in i128 to avoid overflow before the divide.
    let diff = i128::from(mark.0) - i128::from(index.0);
    let scaled = diff.saturating_mul(i128::from(RATE_SCALE));
    let premium = scaled / i128::from(index.0);
    // Saturate back to i64 — at i64 range with index prices in u64::MAX
    // territory, this only clips at network-pathological inputs.
    Premium(saturate_i128_to_i64(premium))
}
```

Body 10 行。4 つの動く部分：

1. **`index == 0` での早期 return。** Zero index は「oracle がまだ price を配信していない」（boot state）または「アセットに spot reference がない」を意味する。**どちらのケースも zero funding を生むべき** — index がないとき計算する意味ある (mark - index) がない。`Premium(0)` を返すのは graceful degradation、error なら bridge を通って transaction レベルの失敗として伝播 — 一時的な oracle 問題への wrong response。

2. **`i128::from(mark.0) - i128::from(index.0)`。** 両 operand が引き算の*前*に `i128` に upcast。**`u64` 2 つの引き算は `mark < index` で underflow** — 結果が負数でなく `u64::MAX` 近くにラップする。符号付き i128 への upcast で引き算を代数的に正しくする。

3. **`diff.saturating_mul(i128::from(RATE_SCALE))`。** 乗算は普通の `*` でなく `saturating_mul`。最悪ケース（`mark` が `u64::MAX` 近く、`index` が非常に小さい）、積が `i128::MAX` に近づく — 普通の乗算なら overflow する。`saturating_mul` は panic でなく `i128::MAX` / `i128::MIN` に clamp。

4. **`scaled / i128::from(index.0)`。** 除算は乗算の*後*。**先に割ると precision を失う** — `(mark - index) / index` の整数数学は 1.0 未満の premium 全部（使える範囲全部！）に対して 0 を生む。先に `RATE_SCALE` を掛けることで小数桁を整数 magnitude として保持、それから割って scale 済み premium が生まれる。

それから `saturate_i128_to_i64` で `Premium` の i64 範囲に clip して戻す。

> 🛑 **やりがちな勘違い。** 「`(mark - index).saturating_mul(RATE_SCALE) / index` を u64 で計算すればいいのでは？」 **No — 引き算が問題。** `MarkPrice(99) - IndexPrice(100)` を `u64` で計算すると underflow → `u64::MAX - 0` にラップ。それは小さな*負*の数でなく巨大な*正*の数。結果は小さな*負*の premium が真実のときに巨大な*正*の premium になる。**符号が重要、符号付き演算が必須。**

### Step 3: `saturate_i128_to_i64` helper を追加

`compute_premium` の後ろに：

```rust
/// Clamp an `i128` into the `i64` range. Used wherever an intermediate
/// product can exceed `i64::MAX` at network-pathological inputs (e.g., a
/// `u64::MAX` index price). Saturation, not wrapping — see the module-doc
/// comment on why panicking would be a worse failure mode.
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
```

Body 3 行。**`i64::try_from(v)` は `Result` を返す** — `v` が i64 に収まれば `Ok(value)`、そうでなければ `Err`。`unwrap_or(...)` が `Err` ケースの default を提供：overflow が正なら `i64::MAX`、負なら `i64::MIN` に clamp。

この関数は**モジュール private**（`pub fn` でなく `fn`）。呼び出し側は不要 — `MarkPrice` / `IndexPrice` を入れ、`Premium` を受け取り、saturation は裏で起きる。Private にすることで偶発的誤用を防ぎ、public surface をクリーンに保つ。

L7 の `apply_funding` がこの helper の 2 つ目の caller になる。だから helper であって `compute_premium` 内に inline されない。

> 🛑 **考えてみよう。** テスト `assert_eq!(saturate_i128_to_i64(i128::MAX), ???)` は何を期待する？

（答え：**`i64::MAX`。** `i128::MAX` は ~1.7e38、`i64::MAX`（~9.2e18）を遥かに超える。`i64::try_from(i128::MAX)` は失敗、`unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })` が `v > 0` なので closure を評価、`i64::MAX` を返す。負側も対称：`i128::MIN` は `i64::MIN` に clamp。）

### Step 4: テストモジュール + 4 unit test を追加

`compute.rs` の末尾に：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn premium_zero_when_mark_equals_index() {
        let p = compute_premium(MarkPrice(100), IndexPrice(100));
        assert_eq!(p, Premium(0));
    }

    #[test]
    fn premium_positive_when_mark_above_index() {
        // mark 101, index 100 → premium = 1/100 = 0.01 → 10_000_000 ppb
        let p = compute_premium(MarkPrice(101), IndexPrice(100));
        assert_eq!(p, Premium(10_000_000));
    }

    #[test]
    fn premium_negative_when_mark_below_index() {
        let p = compute_premium(MarkPrice(99), IndexPrice(100));
        assert_eq!(p, Premium(-10_000_000));
    }

    #[test]
    fn premium_saturates_to_zero_when_index_is_zero() {
        let p = compute_premium(MarkPrice(1_000_000), IndexPrice(0));
        assert_eq!(p, Premium(0));
    }
}
```

4 つの手書きトレーステスト。各々短いが、それぞれ特定の*意味*を pin する：

1. **`premium_zero_when_mark_equals_index`** — symmetry ケース。Mark = index は dislocation なしを意味する。数学は素直：`(100 - 100) * 1e9 / 100 = 0`。これは formula の off-by-one や sign-flip を捕まえる。

2. **`premium_positive_when_mark_above_index`** — longs-overpaying ケース。Mark 101 > Index 100 → 正の premium。期待値 `10_000_000` は紙の数学：`(101-100) * 1e9 / 100 = 1e9 / 100 = 1e7 = 10_000_000`。**Ppb で：1% premium。** これは反転した符号規約を捕まえる。

3. **`premium_negative_when_mark_below_index`** — shorts-overpaying ケース。Mark 99 < Index 100 → 負の premium。テスト 2 と同じ規模、反対の符号。**「u64 で引き算 → underflow」バグを特に捕まえる。**

4. **`premium_saturates_to_zero_when_index_is_zero`** — graceful-degradation ケース。期待出力は `Premium(0)`、panic や error ではない。**早期 return guard を「単純化のため」削除した人を捕まえる。**

テスト 2 のコメント `// mark 101, index 100 → premium = 1/100 = 0.01 → 10_000_000 ppb` は **紙の数学をテストに書いたもの**。これを将来デバッグする誰でも、アサーションが正しいかを手で検証できる — テスト作者が正しくやったと信じる必要なし。

> 🛑 **やりがちな勘違い。** 「`MarkPrice(u64::MAX)` や `IndexPrice(1)` のような edge case をテストすべき？」 **Yes、だが L5 で。** それらは saturation-edge テスト — `saturate_i128_to_i64` helper を境界で exercise する、L5 のメイン pedagogical focus。**L4 のテストは normal-input semantics を pin する、L5 が pathological-input 挙動を pin する。** 両方のテストクラスが重要、レッスンで分離すれば per-lesson scope がタイト。

### Step 5: `lib.rs` を更新

`crates/funding/src/lib.rs` を開く。現状：

```rust
//! `openhl-funding` — funding-rate state machine.
//! ...

pub mod types;

pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
```

Compute モジュール宣言 + re-export を追加：

```rust
//! `openhl-funding` — funding-rate state machine.
//! ...

pub mod compute;
pub mod types;

pub use compute::compute_premium;
pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
```

2 つの変更：
- `pub mod compute;` — 新モジュールを宣言。
- `pub use compute::compute_premium;` — 関数をクレートルートで re-export。呼び出し側は `use openhl_funding::compute::compute_premium;` でなく `use openhl_funding::compute_premium;` と書ける。

**モジュール宣言はアルファベット順**（`compute` が `types` の前）。`pub use` も同じ順序。長い re-export ブロックでは consistency が重要。

### Step 6: テストを実行

```bash
cargo test -p openhl-funding
```

期待出力：

```
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to `compute_rate`
warning: unresolved link to `apply_funding`
warning: unresolved link to `FundingClock`
    Finished `test` profile [unoptimized + debuginfo] in 0.6s
     Running unittests src/lib.rs

running 4 tests
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**4 テストが通る。** Crate 初の green run。3 つの rustdoc warning は期待通り（`compute_rate`/`apply_funding`/`FundingClock` — L6/L7/L8 で解決）。

よくあるエラー：

- **Positive テストでの `assertion failed: left=0 right=10_000_000`** — `compute_premium` の `* RATE_SCALE` ステップが欠けている。Scaling なしの整数除算 `(101 - 100) / 100` は 0 に丸まる。
- **Negative テストでの `assertion failed: left=18446744073709541616 right=-10_000_000`** — 引き算を `i128` に upcast でなく `u64` でやった。巨大な正数は `u64::MAX + (99 - 100)` の underflow ラップ。**両 operand に `i128::from(...)` upcast を追加。**
- **テストで panic** — `saturating_mul` でなく普通の `*` を使った。Debug build で普通の乗算は overflow で panic。`saturating_mul` に切り替え。
- **`error: cannot find function 'saturate_i128_to_i64'`** — helper が `compute_premium` の下に同じファイルで定義されている。Caller の上に動かすか、下のまま残す — Rust はモジュール内の宣言順を気にしない。

## 設計の振り返り

このレッスンに焼き込まれた決定 4 つ：

1. **`index == 0` は `Premium(0)` を返す、error ではない。** Oracle が利用不可のときの graceful degradation。Error は bridge を通って transaction 失敗として伝播し、無関係の payload 作業をブロックする。Zero が「rate を駆動する情報がない」への正しい答え。

2. **`i128` 中間値、`u64` を絶対使わない。** 引き算は負になりうる、乗算は `u64::MAX` を超えうる。両演算とも符号付きでより wide な算術が必要。**Input 範囲でなく*中間値*範囲で整数 width を選ぶ。**

3. **`saturating_mul`、`*` ではない。** 乗算中の overflow は panic（debug）か wrap（release）。両方とも saturation より悪い：panic = halt 経由のチェーン fork、wrap = wrong value 経由のチェーン fork。**Consensus 中核の数学に対して saturation は唯一の bounded-behavior オプション。**

4. **テストコメントが紙の数学。** アサーションの隣の `// (101-100) * 1e9 / 100 = 10_000_000` が、将来のデバッガがアサーションを*formula に対して*検証できるようにする — テスト作者の約束に対してでなく。**テストはドキュメンテーション、そのコメントがドキュメント body。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

L4 後：
- **compute.rs** が Stage 8b の `compute_premium` + `saturate_i128_to_i64` + 4 手書きトレース premium テストまで一致。`compute_rate`、`apply_funding`、rate テスト、proptest は L5-L7。
- **lib.rs** が `pub mod compute;` と `compute_premium` re-export を持つ。`apply_funding`、`compute_rate`、clock モジュールは L5-L8。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: `compute_premium` がなぜ危険なステップだけでなくどこでも `i128` を使う？**
`i128::from(u64)` 変換は無料（ただの zero-extend）。全計算を `i128` でやることが 1 つのメンタルモデル — 「この関数は i128 算術を使う」 — vs 混合モデル「ここは u64、そこは i128」。**統一 width はゼロコストで可読性の勝利。** 最終の i64 への saturation だけが何らかの semantic 重みを持つ唯一の変換。

**Q: `RATE_SCALE` をなぜ `RATE_SCALE as i128` でなく `i128::from(RATE_SCALE)` で upcast する？**
`from` は idiomatic で non-truncating な変換。`as i128` でもここは動く（`i64 → i128` は truncate しない）が、`from` が意図を documentation する：「これは widening で reinterpretation ではない」。**Widening には `from` を使う、truncation が起きえないと検証済みなら `as` だけを使う。** `as i128` を読む将来のエンジニアは safety を verify する必要がある、`from` は変換が safe であることを documentation する。

**Q: Helper はなぜ `clamp_to_i64` でなく `saturate_i128_to_i64` という名前？**
「Saturate」は「型境界で clamp」の確立用語 — `u64::saturating_mul`、`i128::saturating_sub` と同じ単語。**標準語彙を使うことで関数の挙動がどの Rust 開発者にも明らか。** 「Clamp」はユーザ定義 bound のいずれも意味しうる、「saturate」は型境界 clamping を特に意味する。

**Q: `compute_premium` は `pub` でなく `pub(crate)` であるべき？**
`pub` は外部 caller（course 10 の bridge integration、もしくは funding state を telemetry のためにクエリする外部 observer）が必要。`pub(crate)` はそれを禁じる。**関数は public API の一部。** `saturate_i128_to_i64` が実装詳細、`compute_premium` が契約。

## 次のレッスン（L5）

L5 では新関数は追加しない。代わりに overflow 哲学の deep dive：なぜ saturation が consensus 中核数学に唯一受け入れられる挙動か、代替がどう見えるか、なぜそれらがチェーンを fork するか、`saturate_i128_to_i64` の境界が pathological 入力でどう振る舞うか。レッスンは proptest 1 つ（`premium_is_antisymmetric_in_mark_index`） — mark と index を入れ替えると premium の符号が反転する property — も追加。**Crate 初の proptest。**
````

---

## Seed-file slot

L4 は Module 2 (純粋な compute) の sortOrder 0 に入る：

```typescript
{
  title: 'レッスン 4 — compute_premium — 最初の数学、最初のテスト',
  slug: 'openhl-funding-compute-premium-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 80,
  content: `# レッスン 4 — \`compute_premium\` — 最初の数学、最初のテスト\n\n...`
},
```

## SHA pinning discipline

L4 は `cd94137`（Stage 8b）を引用。L4 後、compute.rs が Stage 8b の `compute_premium` + `saturate_i128_to_i64` + 4 premium テストまで一致。lib.rs に `compute` モジュール + 1 re-export。

## Style review notes (self-critique before paste)

- **§ゴールが L4 を「最初の数学、最初のテスト」とフレーミング** — 読者がペースを落とす。
- **§考えてみよう（中間値範囲）**が i128 選択を正当化 — 読者が算術して答えに着く。
- **§Step 2 が関数 body に 4 つの名前付き動く部分** — それぞれに段落。
- **§やりがちな勘違い（u64 引き算 underflow）**が最も起こりうる具体バグを先回り。
- **§Step 4 各テストの説明**が各々が何を捕まえるか名指す — 読者がテストが存在する理由を理解。
- **§やりがちな勘違い（edge-case テスト）**が L5 を境界テストの場所として明示フラグ。
- **§Step 6 期待出力**が正確 — 読者が成功の見た目を知る。
- **§設計の振り返り 1-4** が別々の一般化可能パターンを名指す。
- **§よくある質問**が idiomatic 変換（`from` vs `as`）、命名（saturate vs clamp）、可視性（pub vs pub(crate)）を扱う。
- **L5 プレビュー**が具体的：「新関数なし、哲学 + proptest 1 つ」。
