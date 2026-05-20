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

このレッスンで掴む概念:

- **整数幅は入力ではなく*中間値*のレンジで選ぶ** — `mark` も `index` も `u64` だが、`(mark - index) * RATE_SCALE` は最悪 ~1.8e28 になりうる。i128 中間値は選択肢ではなく必須で、しかも upcast を引き算の*前に*入れることで符号が保たれる。
- **割る前に掛ければ精度が残る** — `(mark - index) / index` を整数で先に計算すると、100% 未満の premium はすべてゼロに丸められる。先に `RATE_SCALE` を掛けて分数を i128 マグニチュードに変換し、その後で割れば意味のある整数が残る。
- **`u64` での引き算が王道の符号バグ** — `MarkPrice(99) - IndexPrice(100)` は `u64` で `u64::MAX` に wrap し、本来「小さな負」であるべき premium が「巨大な正」になる。`i128::from(...)` upcast がこの引き算を代数的に正しくする。
- **Oracle 欠損時の graceful degradation** — `index == 0` のときは `Premium(0)` を返し、エラーにしない。Funding は bridge 経由で balance update として流れる。`Err` を返すと無関係な payload も含めて transaction failure として表面化してしまう。信号がないなら「ゼロを返す」が正解。
- **テストコメントは紙の上の数学** — assertion の隣に `// (101-100) * 1e9 / 100 = 10_000_000` と書いておけば、将来このコードを debug する人は「テストの著者を信じる」のではなく「数式に対して assertion を検証する」ことができる。

検証：

```bash
cargo test -p openhl-funding
```

上記の実行結果が unit test 4 つを通る。

具体的な変更:

`openhl-funding` crate は「型定義だけ」の状態から「型定義 + 最初の数学のピース」へと進む：

- **`crates/funding/src/compute.rs`** — 新規ファイル。module doc と関数 2 つを置く：
  - `compute_premium(mark, index) -> Premium` — `(mark - index) / index` を導出し、`RATE_SCALE` スケールで返す。
  - `saturate_i128_to_i64(v) -> i64` — clamp helper（private）、3 行。
- **`compute.rs` の `#[cfg(test)] mod tests` ブロックに、手書きトレース unit test を 4 つ追加**する：
  - `premium_zero_when_mark_equals_index`
  - `premium_positive_when_mark_above_index`
  - `premium_negative_when_mark_below_index`
  - `premium_saturates_to_zero_when_index_is_zero`
- **`crates/funding/src/lib.rs`** — `pub mod compute;` の追加と、`compute_premium` の re-export を行う。

これが**実際の数学**を持つ最初のレッスンだ。これ以降、コード変更のたびにアカウント間で wealth が静かに移ってしまう可能性が出てくる。手書きトレースのテストは、期待出力を「紙の上の数学で検証できる特定の入力値」に pin する役割を果たす。

## おさらい

L3 後の状態：
- 9 型と `RATE_SCALE` が `types.rs` に揃っている — Stage 8b の完全な型 roster だ。
- 挙動はまだゼロ。Crate はコンパイルが通るだけで、何もしない。

L4 で最初の関数を導入する。関数は短い（body は ~10 行）が、設計判断を 3 つ encode する：`index == 0` の graceful な扱い、overflow safety のための `i128` 中間値、wrap や panic ではなく saturation を選ぶこと、の 3 点だ。

## プラン

編集は 3 つ：

1. **`crates/funding/src/compute.rs` を作成**する — module doc、imports、`compute_premium`、private な `saturate_i128_to_i64` helper を入れる。
2. **`compute.rs` に `#[cfg(test)] mod tests` を追加**し、手書きトレース unit test を 4 つ入れる。
3. **`crates/funding/src/lib.rs` を更新**する — `pub mod compute;` 宣言を追加し、クレートルートで `compute_premium` を re-export する。

> 🛑 **考えてみよう。** スクロール前に — `(mark - index) * RATE_SCALE / index` を計算する場合を考える。`mark` と `index` はどちらも `u64` で、最大 ~1.8e19 まで取りうる。`RATE_SCALE` は `1e9` だ。*中間*積 `(mark - index) * RATE_SCALE` の最大サイズはいくらか。どの型に収まる必要があるか。

（答え：**`u64::MAX * 1e9` は `i64` を 10 桁オーバーフローする。** 最悪ケースは `mark = u64::MAX`、`index = 0`（これは別途処理する）か、`mark = u64::MAX`、`index = 1` のとき → `(u64::MAX - 1) * 1e9 ≈ 1.8e28`。`i64::MAX` は ~9.2e18 なので、中間値には `i128` が必要だ。`index` で割った後は i64 範囲に戻る — だが除算は乗算の*後*に行う必要があるので、中間値が i128 に収まることが必須となる。**積には i128 が必須。Saturation は、最終結果が i64 を超える稀なケースを扱う。**）

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

注目点は 2 つ：

**Module doc では 3 関数をプレビューしているが、L4 で出荷するのはそのうち 1 つだけだ。** クロス参照 `[compute_rate]` と `[apply_funding]` は L6 / L7 までリンク切れのままだ。**warning は許容する** — L1 / L2 で `[FundingRate]` クロス参照を増分的に解決させていったのと同じ方針だ。

**`use` 文では、L4 ではまだ使わない型も import する。** `FundingParams`、`FundingRate`、`Notional`、`Position`、`Settlement` は L6 / L7 の関数で必要になる。今 import しておけば、L4 以降は import ブロックが安定する — L1 で `[dev-dependencies]` に proptest を先に入れたのと同じ理屈だ。**Boilerplate は早めに安定化させ、ロジックを iterate する。**

> 🛑 **やりがちな勘違い。** 「L4-L6 の間、unused-import の warning を抑えるべきでは？」 **Unused-import warning は*コンパイラ*が unused と判断したアイテムで発火するもので、rustdoc が参照するアイテムでは発火しない。** L7 までに `FundingRate` や `Notional` などはすべて使うので、コンパイラは文句を言わない — 同じモジュール内で後ろの方で使われている `use` 宣言を見ているからだ。warning を出すのは rustdoc のクロス参照 `[compute_rate]` と `[apply_funding]` だけで、これらは L6 / L7 で解決される。

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

Body は 10 行、動く部分は 4 つ：

1. **`index == 0` での早期 return。** Zero index は「oracle がまだ価格を配信していない」（boot state）か、「アセットに spot reference がない」のどちらかを意味する。**どちらのケースでも zero funding を返すべきだ** — index がない以上、意味のある `(mark - index)` を計算する余地がない。`Premium(0)` を返すのは graceful degradation だ。エラーにしてしまうと bridge を経由してトランザクションレベルの失敗として伝播し、無関係な処理までブロックしてしまう — 一時的な oracle 問題への対応としては誤りだ。

2. **`i128::from(mark.0) - i128::from(index.0)`。** 両 operand を引き算の*前*に `i128` に upcast する。**`u64` 同士の引き算は `mark < index` で underflow する** — 結果が負数になるのではなく、`u64::MAX` 近くまでラップしてしまう。符号付き i128 に upcast することで、引き算が代数的に正しく振る舞うようになる。

3. **`diff.saturating_mul(i128::from(RATE_SCALE))`。** 乗算には普通の `*` ではなく `saturating_mul` を使う。最悪ケース（`mark` が `u64::MAX` に近く、`index` が非常に小さい場合）では、積が `i128::MAX` に近づく — 普通の乗算では overflow する。`saturating_mul` なら panic せず `i128::MAX` / `i128::MIN` に clamp する。

4. **`scaled / i128::from(index.0)`。** 除算は乗算の*後*に行う。**先に割ると精度を失う** — `(mark - index) / index` を整数演算で素直に計算すると、1.0 未満の premium はすべて（つまり実用範囲のすべてが！）0 になってしまう。先に `RATE_SCALE` を掛けることで、小数桁を整数の magnitude として保持できる。その上で割ることで、スケール済みの premium が得られる。

最後に `saturate_i128_to_i64` を使い、`Premium` の i64 範囲に clip して戻す。

> 🛑 **やりがちな勘違い。** 「`(mark - index).saturating_mul(RATE_SCALE) / index` を u64 で計算すればいいのでは？」 **だめだ — 引き算が問題になる。** `MarkPrice(99) - IndexPrice(100)` を `u64` で計算すると underflow し、`u64::MAX - 0` 近くにラップしてしまう。それは小さな*負*の数ではなく巨大な*正*の数だ。結果として、本来は小さな*負*の premium であるべきところに巨大な*正*の premium が出る。**符号が肝心であり、符号付き演算が必須だ。**

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

Body は 3 行。**`i64::try_from(v)` は `Result` を返す** — `v` が i64 に収まれば `Ok(value)`、収まらなければ `Err` だ。`unwrap_or(...)` が `Err` ケースの default を提供する：overflow が正方向なら `i64::MAX`、負方向なら `i64::MIN` に clamp する。

この関数は**モジュール private**（`pub fn` ではなく `fn`）にする。呼び出し側からは見せる必要がない — 呼び出し側は `MarkPrice` / `IndexPrice` を渡して `Premium` を受け取るだけで、saturation は裏で勝手に行われる。private にしておけば偶発的な誤用を防ぎつつ、public surface もクリーンに保てる。

L7 の `apply_funding` がこの helper の 2 番目の caller になる。だからこそ `compute_premium` 内に inline せず、helper として独立させている。

> 🛑 **考えてみよう。** テスト `assert_eq!(saturate_i128_to_i64(i128::MAX), ???)` は何を期待するか。

（答え：**`i64::MAX`。** `i128::MAX` は ~1.7e38 で、`i64::MAX`（~9.2e18）を遥かに超える。`i64::try_from(i128::MAX)` は失敗し、`unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })` の closure が評価される。`v > 0` なので `i64::MAX` が返る。負側も対称的で、`i128::MIN` は `i64::MIN` に clamp される。）

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

手書きトレースのテストが 4 つ。それぞれ短いが、特定の*意味*を pin する：

1. **`premium_zero_when_mark_equals_index`** — 対称ケース。Mark = index は dislocation がないことを意味する。数学は素直で `(100 - 100) * 1e9 / 100 = 0`。式の off-by-one や符号反転を捕まえる。

2. **`premium_positive_when_mark_above_index`** — longs が overpay するケース。Mark 101 > Index 100 → 正の premium。期待値 `10_000_000` は紙の上の数学から導ける：`(101-100) * 1e9 / 100 = 1e9 / 100 = 1e7 = 10_000_000`。**ppb で表現すれば 1% premium。** 符号規約が反転していると、ここで引っかかる。

3. **`premium_negative_when_mark_below_index`** — shorts が overpay するケース。Mark 99 < Index 100 → 負の premium。テスト 2 と同じ規模で符号だけ反対。**「u64 で引き算して underflow する」バグをピンポイントで捕まえる。**

4. **`premium_saturates_to_zero_when_index_is_zero`** — graceful-degradation ケース。期待出力は `Premium(0)` — panic でもエラーでもない。**「単純化のため」と称して早期 return の guard を削った人を捕まえる。**

テスト 2 のコメント `// mark 101, index 100 → premium = 1/100 = 0.01 → 10_000_000 ppb` は、**紙の上の数学をそのままテストに書き写したもの**だ。将来このテストをデバッグする人は誰でも、テスト作者が正しく書いたと信じる必要なく、アサーションを手で検証できる。

> 🛑 **やりがちな勘違い。** 「`MarkPrice(u64::MAX)` や `IndexPrice(1)` のような edge case もテストすべきでは？」 **やるべきだ、ただし L5 で。** これらは saturation の境界テスト — `saturate_i128_to_i64` helper を境界で exercise するもので、L5 のメインの教育的フォーカスだ。**L4 のテストは normal-input の semantics を pin し、L5 は pathological-input の挙動を pin する。** どちらのテストクラスも重要だが、レッスンで分けておけばレッスン単位のスコープを引き締められる。

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

変更は 2 点：
- `pub mod compute;` — 新モジュールを宣言する。
- `pub use compute::compute_premium;` — 関数をクレートルートで re-export する。これで呼び出し側は `use openhl_funding::compute::compute_premium;` ではなく `use openhl_funding::compute_premium;` と書ける。

**モジュール宣言はアルファベット順**にする（`compute` が `types` の前）。`pub use` も同じ順序だ。長い re-export ブロックでは整合性が効いてくる。

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

**4 テストが通る。** Crate 初の green run だ。rustdoc warning が 3 つ出るのは期待通り（`compute_rate` / `apply_funding` / `FundingClock` — それぞれ L6 / L7 / L8 で解決される）。

よくあるエラー：

- **positive テストで `assertion failed: left=0 right=10_000_000`** — `compute_premium` の `* RATE_SCALE` ステップが抜けている場合だ。スケーリングなしの整数除算 `(101 - 100) / 100` は 0 に丸まる。
- **negative テストで `assertion failed: left=18446744073709541616 right=-10_000_000`** — 引き算を `i128` への upcast なしに `u64` で行った場合だ。巨大な正の数は `u64::MAX + (99 - 100)` という underflow ラップの結果だ。**両 operand に `i128::from(...)` の upcast を追加すること。**
- **テストで panic** — `saturating_mul` ではなく普通の `*` を使った場合だ。Debug build では普通の乗算が overflow で panic する。`saturating_mul` に切り替えること。
- **`error: cannot find function 'saturate_i128_to_i64'`** — helper が同じファイルの `compute_premium` の下にある場合だ。呼び出し元の上に動かしてもいいし、下のままにしてもいい — Rust はモジュール内の宣言順を気にしない。

## 設計の振り返り

このレッスンに焼き込んだ決定は 4 つ：

1. **`index == 0` のときは `Premium(0)` を返す、エラーにはしない。** Oracle が使えないときの graceful degradation だ。エラーにすると bridge を経由してトランザクション失敗として伝播し、無関係な payload の処理までブロックしてしまう。「rate を駆動する情報がない」状態への正しい答えはゼロだ。

2. **中間値は `i128` を使い、`u64` は絶対に使わない。** 引き算は負になりうるし、乗算は `u64::MAX` を超えうる。どちらの演算でも符号付き かつ より wide な算術が必要だ。**整数幅は入力の範囲ではなく、*中間値*の範囲を見て選ぶ。**

3. **乗算は `*` ではなく `saturating_mul` を使う。** 乗算中の overflow は panic（debug）か wrap（release）になる。どちらも saturation より悪い：panic = halt 経由の chain fork、wrap = 誤った値経由の chain fork だ。**Consensus 中核の数学で bounded behavior を得る唯一の選択肢が saturation だ。**

4. **テストコメントは紙の上の数学そのもの。** アサーション横の `// (101-100) * 1e9 / 100 = 10_000_000` のおかげで、将来のデバッガがアサーションを*式に照らして*検証できる — テスト作者の約束を信じる必要はない。**テストはドキュメンテーションでもあり、そのコメントがドキュメンテーションの本文だ。**

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

**Q: `compute_premium` で危ないステップだけでなく、なぜどこでも `i128` を使うのか？**
`i128::from(u64)` 変換はタダだからだ（ただの zero-extend）。全計算を `i128` で行えば「この関数は i128 算術を使う」という統一されたメンタルモデルになる — 「ここは u64、そこは i128」と混在させるよりずっと素直だ。**統一された width はコストゼロで、可読性は得しかない。** semantic な重みを持つ変換は、最終的に i64 へ saturate する箇所だけだ。

**Q: `RATE_SCALE` の upcast に `RATE_SCALE as i128` ではなく `i128::from(RATE_SCALE)` を使うのはなぜか？**
`from` が idiomatic かつ non-truncating な変換だからだ。ここでは `as i128` でも動く（`i64 → i128` で truncate は起きない）が、`from` を使うことで「これは widening であって reinterpretation ではない」と意図を documentation できる。**Widening には `from` を使う。truncation が起きないことを検証済みのときだけ `as` を使う。** `as i128` を読んだ将来のエンジニアは safety を自分で検証する必要があるが、`from` を読めば変換が safe だと一目で分かる。

**Q: なぜ helper の名前が `clamp_to_i64` ではなく `saturate_i128_to_i64` なのか？**
「Saturate」は「型境界で clamp する」を表す確立した用語だからだ — `u64::saturating_mul`、`i128::saturating_sub` と同じ単語だ。**標準語彙を使えば、関数の挙動がどの Rust 開発者にも一目で伝わる。** 「Clamp」だとユーザ定義の境界も含む任意の clamping を意味しうるが、「saturate」は型境界での clamping を特定的に指す。

**Q: `compute_premium` は `pub` ではなく `pub(crate)` にすべきでは？**
`pub` でないと外部の caller（course 10 の bridge integration や、funding state を telemetry のために問い合わせる外部 observer）が呼べないからだ。`pub(crate)` ではそれが禁じられる。**この関数は public API の一部だ。** `saturate_i128_to_i64` が実装の詳細、`compute_premium` が契約だ。

## 次のレッスン（L5）

L5 では新しい関数は追加しない。代わりに overflow 哲学を深掘りする：consensus 中核の数学に対して saturation だけが唯一許容される挙動である理由、代替案がどう見えるか、それらがなぜチェーンを fork させるか、そして `saturate_i128_to_i64` が pathological 入力で境界においてどう振る舞うか。レッスンには proptest を 1 つ追加する（`premium_is_antisymmetric_in_mark_index`） — mark と index を入れ替えると premium の符号が反転するという property だ。**Crate 初の proptest だ。**
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
