# Building OpenHL Funding — L5 draft (JA) — build-along

> openhl SHA `cd94137`（Stage 8b — funding state machine）に対するドラフト。
> コース: `building-openhl-funding-ja`（track: `reth-l1-architect`）。

---

## L5 — `openhl-funding-overflow-proptest-ja`

- **Module:** 2 (純粋な compute), sortOrder 1
- **Course-level sortOrder:** 5 (lesson 6 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# レッスン 5 — Overflow 哲学 + 最初の proptest

## ゴール

このレッスンが終わると：

```bash
cargo test -p openhl-funding
```

…が 5 テストを通る（L4 から 4 + 新規 proptest 1）。Crate が得るもの：

- **コードベース初の proptest** — `premium_is_antisymmetric_in_mark_index`。`mark` と `index` を swap すると premium の符号が反転する（mark = index のときは両方ゼロ）。Test run あたり 256 ランダム入力。

だがこのレッスンのより大きな積荷は **conceptual、コードではない**。歩く内容：

1. **なぜ panic = チェーン fork。** Panic した validator は halt、残りの validator はそれなしで前進。State が divergent。
2. **なぜ wrap = チェーン fork。** 異なるコンパイラバージョンや build flag を持つ 2 validator が同じ overflow ポイントで*異なって*wrap しうる。Wrong value が correct value から divergent。
3. **なぜ saturate は bounded behavior。** 全 validator が同じ input で同じ saturated value に合意。Fork なし。
4. **`saturate_i128_to_i64` 境界ケース。** `i128::MAX → i64::MAX`、`i128::MIN → i64::MIN`。なぜ `unwrap_or` の closure が符号に依存するか、`i64::MAX` だけでなく。

新関数なし。新テストコード ~5 行。**メンタルモデルがレッスン。**

## おさらい

L4 後：
- `compute_premium` が `i128` 中間値で符号付き premium を計算。
- `saturate_i128_to_i64` が overflow を i64 境界に clamp。
- 4 手書きトレーステストが関数の挙動を normal input で pin。

L4 のテストは pathological 入力（例：`MarkPrice(u64::MAX)`）を exercise せず、saturate helper を境界で exercise しない。L5 は両ギャップを哲学 + proptest で探る。

## プラン

2 つの編集：

1. **`use proptest::prelude::*;` import を追加** — `compute.rs` のテストモジュールに。
2. **`proptest! { ... }` ブロックを append** — antisymmetry property 付き。

プロダクションコード変更なし。

> 🛑 **考えてみよう。** スクロール前に — `compute_premium` の panic は validator を halt する。**なぜこれが単一ノード障害でなくチェーン fork？** ヒント：1 つが halt したとき他の validator が何をしているか考える。

（答え：**他の validator は halt したものなしで前進する。** Funding tick はすべての validator で deterministic な state update を生む。1 つが halt すると、network の quorum（典型的に 2/3+）が継続する。Halt した validator が reboot するまでに、chain head は何ブロックも先。Halt した validator は sync できない — halt block での local state が network の view と disagree。**Halt が history の 2 バージョンを生む：「panic 入力で」と「network の進んだ state で」。Validator は実質自分を network から fork off した。** Saturate は対照的に validator を lockstep のまま保つ。）

## 手順

### Step 1: Overflow の taxonomy

「整数が収まらなかった」の失敗モード 3 つ：

#### Panic（debug build の `*`）

```rust
let scaled = diff * i128::from(RATE_SCALE);  // debug で overflow に panic
```

Debug build で整数 overflow は panic。Panic を踏むスレッドは halt、validator の funding tick なら、validator の state machine は前進を止める。**ネットワークの残りは気づかず継続。** Halt した validator が restart するとき、panic block での world-view が network のものと一致しない。その時点以降、追加ブロックを検証できない — 計算したことのない state を参照していると見える。

実質：**1 validator が gone、だが不在は自分だけを破壊、ネットワークではない。** チェーンは 2 つの valid history を生むことで fork するのでなく、panic した validator が consensus から永久に落ちることで fork する。

#### Wrap（release build の `*`）

```rust
let scaled = diff * i128::from(RATE_SCALE);  // release で silent に wrap
```

Release build で `*` は panic せず wrap。結果は `(diff * RATE_SCALE).wrapping_rem(2^128)` — *定義された*値だが、数学的に正しくない。

**ハザード**：異なるコンパイラ最適化を持つ 2 validator が*異なって* wrap しうる。Compiler は associativity rule で operation を re-order できる、`(a * b) * c` と `a * (b * c)` は中間 overflow が異なるとき異なる wrap 結果を生みうる。両 validator が偶然同じに wrap しても、*wrong* value がこの tick で settle されるすべてのアカウントに伝播する。**全 validator が間違った答えに合意。** その後 raw input から funding を再計算する下流 client が disagree する。チェーンがレイヤー間の不整合で fork する。

*Release build* で wrap は silent — log なし、warning なし、event なし。**検出が最も難しいバグクラス：間違っているが consistent。**

#### Saturate（我々が選んだ挙動）

```rust
let scaled = diff.saturating_mul(i128::from(RATE_SCALE));  // i128::MAX/MIN に clamp
```

Saturation は型境界で定義された値を生む：正 overflow で `i128::MAX`、負で `i128::MIN`。**`saturating_mul` を持つ全 validator が同じ値を生む。** Fork なし。

Saturation での*funding rate* は実質 cap（`saturate_i128_to_i64` がさらに i64 に clamp した後）。経済的帰結：極端な oracle dislocation が premium を saturation ポイント越しに押すと、最大 rate での支払いを生む、panic でも wrap でもなく。**挙動が gracefully degrade する。**

> 🛑 **やりがちな勘違い。** 「`checked_mul` を使って error を返せばいい？」 **Yes、だが問題を caller に押し付ける。** `Result<Premium, OverflowError>` が `compute_rate`、`apply_funding`、clock を通って上に伝播する — 最終的に bridge へ、bridge は何をするか決めなければならない。Bridge の選択肢は (a) block を revert（チェーン fork）、(b) funding tick をスキップ（silent state 不整合）、(c) cap で settle する。**「cap で settle する」結果は saturation が直接実現する、error を伝播せずに。**

### Step 2: `saturate_i128_to_i64` 境界ケース

L4 の helper を思い出す：

```rust
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
```

3 つの入力 regime：

| 入力 | `try_from` 結果 | `unwrap_or` が生む |
|---|---|---|
| `v` が i64 に収まる | `Ok(v as i64)` | `v as i64`（override しない） |
| `v > i64::MAX` | `Err(...)` | `i64::MAX`（`v > 0` なので） |
| `v < i64::MIN` | `Err(...)` | `i64::MIN`（`v ≤ 0` なので） |

**なぜ `unwrap_or` の中で符号チェック？** `try_from` は overflow がどの方向に行ったかを教えない — ただ「収まらない」と言う。Overflow ごとに固定値（例：`i64::MAX`）を返したら、`i128::MIN` が `i64::MIN` でなく `i64::MAX` に saturate する — 符号が反転する。`if v > 0` テストが方向を回復する。

> 🛑 **考えてみよう。** `saturate_i128_to_i64(0)` は何を返す？

（答え：**`0`。** `i64::try_from(0_i128)` は `Ok(0)` を返す。`unwrap_or` 分岐は発火しない。**Saturation は in-range 値に対して no-op。** これは下の proptest に重要 — ランダム `(mark, index)` ペアのほとんどは i64 に快適に収まる premium を生み、saturate helper はそれらに対して invisible。）

> 🛑 **やりがちな勘違い。** 「境界を明示的にテストする — property-based test がそれをカバーしないの？」 **ランダムサンプリングではおそらくしない。** Proptest のデフォルト戦略は入力空間にわたって uniform に値を生成。`i128::MAX` は 2^129 値中の単一ポイント、ランダムに当たる確率は実質ゼロ。**境界テストは手書きトレースが必要** — generator が random walk で届かない特定の値を target するから。

### Step 3: テストモジュールに proptest サポートを追加

`crates/funding/src/compute.rs` を開く。現在のテストモジュールの開始：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // ... L4 の 4 unit test ...
}
```

Proptest prelude import を追加。テストモジュールがこれに：

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use openhl_clob::AccountId;
    use proptest::prelude::*;

    fn pos(account: u64, size: i64) -> Position {
        Position {
            account: AccountId(account),
            size: crate::types::PositionSize(size),
        }
    }

    // ... L4 の 4 unit test ...
}
```

3 点：

1. **`use openhl_clob::AccountId;`** — `pos` helper に必要。L4 のテストでは使わないが、L5 の proptest に使う（実はこの proptest 自身は不要だが、L7 の apply_funding テストが必要、テストモジュールの import を安定化するために今追加）。
2. **`use proptest::prelude::*;`** — `proptest!`、`prop_assert_eq!`、`prop_assert!`、strategy combinator（`1u64..1_000_000`）を scope に持ち込む。
3. **`fn pos(account: u64, size: i64) -> Position`** — `Position` を構築する小さな helper。L7 で使う。Imports/helper セクションを安定化するため今追加。

**Boilerplate を安定化、テストを iterate。** L1 の dep と L4 の `use` ブロックと同じロジック — 後で必要なものを今追加して、per-lesson diff を実際の新規部分に集中させる。

### Step 4: Antisymmetry proptest を追加

4 unit test の後、テストモジュールの閉じ `}` の前に追加：

```rust
    proptest! {
        /// Premium symmetry: swapping mark and index flips the sign.
        /// (Up to integer division rounding, the magnitude is the same — we
        /// allow off-by-one to absorb the rounding-toward-zero asymmetry.)
        #[test]
        fn premium_is_antisymmetric_in_mark_index(
            mark in 1u64..1_000_000,
            index in 1u64..1_000_000,
        ) {
            let a = compute_premium(MarkPrice(mark), IndexPrice(index));
            let b = compute_premium(MarkPrice(index), IndexPrice(mark));
            // Cross-multiplied magnitudes must be equal: |a| / mark == |b| / index
            // (i.e., the proportional dislocation is the same both ways).
            // We test the weaker property that the signs are opposite (or both zero).
            if mark == index {
                prop_assert_eq!(a, Premium(0));
                prop_assert_eq!(b, Premium(0));
            } else {
                prop_assert!(a.0.signum() == -b.0.signum());
            }
        }
    }
```

いくつかの proptest 固有要素：

- **`proptest! { ... }`** — テスト関数をラップするマクロ。このブロック内で、`#[test]` 関数が generator 付きの property test として扱われる。
- **`mark in 1u64..1_000_000`** — **戦略**。`mark` は `[1, 1_000_000)` の値からサンプルされる。デフォルトは test run あたり 256 ケース（~256 ランダム `(mark, index)` ペア）。
- **`prop_assert_eq!` と `prop_assert!`** — proptest のアサーションマクロ。単一ケースで `assert_eq!` / `assert!` と同じ効果だが、proptest は失敗で input を shrink するために独自のマクロが必要（*最小*の failing ケースを見つける）。

なぜこの property？

「Antisymmetry」の素朴版は：`compute_premium(MarkPrice(M), IndexPrice(I))` と `compute_premium(MarkPrice(I), IndexPrice(M))` が**同じ規模、反対符号**の結果を持つべき。だが整数除算はゼロに向けて丸めるので、cross-comparison `|a| / M == |b| / I` は厳密に成り立たない — off-by-one の rounding asymmetry がある。

**Proptest は弱い property をテストする：符号が反対（または両方ゼロ）。** Mark = index のとき両 premium がゼロ。Mark ≠ index のとき、1 つが正、1 つが負。

**コメントがなぜ弱めたかを説明する。** この property を見て「規模も等しいべきでは？」と思う将来の読者は、rounding caveat が場所に documented されているのを見る。**整数算術下で実際に成り立たない aspirational property は、testing failure を待っている。** 実際に invariant な property をテスト。

> 🛑 **やりがちな勘違い。** 「テスト fixture で `f64` を使って期待規模を厳密計算すれば？」 **テストが `f64` 計算の expectation を `i64` 計算の actual に対して assert することになる — 2 つは LSB で disagree する。** 決定的整数コードを非決定的 float expectation と比較するテストは信頼できない。**プロダクション算術と同じドメインでテスト算術を保つ。**

> 🛑 **考えてみよう。** 戦略が `0u64..1_000_000` でなく `1u64..1_000_000` を使う（ゼロを除外）のはなぜ？

（答え：**`index == 0` が `Premium(0)` 早期 return ケースで、L4 で手書きトレース unit test 済み。** Proptest に 0 を含めると：(a) 両方ゼロのときに「符号が反対」を assert して property を破る、もしくは (b) proptest 内でゼロを特殊扱いしてテストを複雑化する。ゼロを除外すれば property がクリーン。**Proptest は interesting range を exercise すべき、trivial-or-already-tested 範囲ではない。**）

### Step 5: テストを実行

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

running 5 tests
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

5 テスト全 green。Proptest が 256 ランダム `(mark, index)` ペアを run、全 256 が antisymmetry property を満たす。

Proptest の verbosity を見たいなら env var をセット：

```bash
PROPTEST_VERBOSE=1 cargo test -p openhl-funding premium_is_antisymmetric
```

「passed 256 cases」や failure 時の「shrunk to mark=X index=Y」 — 最小 counterexample — などのログが見える。

よくあるエラー：

- **`error: macro 'proptest' is not used`** — `use proptest::prelude::*` でなく `use proptest::*` を import した。マクロは `prelude` に住む。
- **`prop_assert_eq!` を `assert_eq!` に typo** — 通常関数では動くが `proptest!` 内では適切な shrinking のため prop_* variant が必要。テストは pass するが failure 時に最小例まで shrink しない。
- **`signs are opposite` が fail** — 通常 proptest が `mark == index` を else 分岐に偶発的に含めた。if/else 分割を verify：`if mark == index { both zero } else { opposite signs }`。
- **`signum() == -b.0.signum()` で `b.0 == 0` のとき proptest が panic** — 等しくない mark/index で compute_premium がゼロを生むときに起きる（例：整数数学がゼロに丸める非常に小さい input）。`1u64..1_000_000` range がこれを避ける、tighter range は当たる。

## 設計の振り返り

このレッスンに焼き込まれた決定 5 つ：

1. **Saturate が consensus で唯一の bounded-behavior overflow オプション。** Panic = halt 経由のチェーン fork。Wrap = 間違っているが consistent な値経由のチェーン fork。Saturate = 全 validator で同じ値、gracefully degrade。**Consensus の liveness を保つ他のオプションはない。**

2. **実際に invariant な property をテスト、aspirational なものではない。** 素朴 antisymmetry は規模が等しいことを要求する、整数 rounding がそれを壊す。弱い property（反対符号）をテストし、rounding caveat をテストコメントで documentation する。**Aspirational テストは production で fail、invariant テストは開発で fail。**

3. **Test モジュール boilerplate を早期に安定化。** `use proptest::prelude::*`、`use openhl_clob::AccountId`、`pos` helper を今追加すると、テストモジュールの imports が L6 / L7 まで stable に。**Boilerplate の churn は per-lesson diff の実態を obscure する。**

4. **`saturate_i128_to_i64` の `unwrap_or` closure が符号に依存。** 固定 override は負 overflow を正に flip する。Saturate helper を慎重に読むと closure が*defensive* でなく*必要*な理由が明らかになる。

5. **Proptest range からゼロを除外** — ゼロケースは既に手書きトレース unit test、proptest に含めると property の複雑化が必要。**手書きトレーステストが境界ケースを pin、proptest が interior の property を pin。** 補完的、冗長ではない。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
```

L5 後：
- **compute.rs** が Stage 8b の `compute_premium` + `saturate_i128_to_i64` + 4 手書きトレース premium テスト + antisymmetry proptest + テストモジュール imports/helper まで一致。`compute_rate`、`apply_funding`、残りの proptest は L6/L7。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: Proptest は実際に何ケース実行する？**
デフォルトは test invocation あたり 256。`PROPTEST_CASES=N cargo test` で configurable。Shrinker が failure 発見後に counterexample を最小化するため追加ケースを実行することがある。**256 ランダムペアで、antisymmetry property が CI を遅くせずに input 空間の意味あるサンプルに対して exercise される。**

**Q: より強いカバレッジのため 10,000 ケースに増やせる？**
できるが、closed form を持つ property には marginal benefit がすぐ落ちる。Antisymmetry は probabilistic property ではない — 成り立つか成り立たないか。256 ケースが実装がテスト範囲で正しいことの高い confidence を提供。**Adversarial input を持つ property（例：crypto）にはより多くのケースが欲しい、純粋数学 property には 256 で十分。**

**Q: `proptest` でなく `quickcheck` を使えば？**
両方とも Rust の property-testing crate、両方とも動く。`proptest` はより強い shrinking（より小さい counterexample を見つける）と better strategy composition（range の `in` 構文）を持つ。openhl workspace は consensus crate のテストで既に proptest を引いているので、marginal cost はゼロ。**1 つ選んで stick する、コードベース中盤での切り替えは違うものを最初に選ぶより高コスト。**

**Q: `saturating_mul` と `saturate_i128_to_i64` の関係は？**
`saturating_mul` は `i128`（と他の整数）の built-in メソッドで、型自身の範囲内で saturated 積を生む。`saturate_i128_to_i64` は user-defined helper で、`i128` を `i64` 範囲に clamp する。異なる境界に対応：`saturating_mul` は in-type overflow を防ぐ、`saturate_i128_to_i64` は cross-type narrowing を防ぐ。**両方必要、数学が i128（積用）と i64（保存用）両方を使うから。**

## 次のレッスン（L6）

L6 で `compute_rate` を追加 — `Premium` と `FundingParams` を取って `FundingRate` を生む関数。関数は ~10 行だが 3 つの決定を encode：(a) `divisor == 0` で `FundingRate(0)` を返す（funding 無効化）、(b) divisor が clamp 前に premium を減らす、(c) `rate_cap` が絶対値を clamp（負 cap と正 cap が同じ `params.rate_cap` を共有）。レッスンは divisor、両側 cap、無効化-funding ケースをカバーする 4 unit test も追加。L6 後、3 つの pure-compute 関数のうち 2 つが完了。
````

---

## Seed-file slot

L5 は Module 2 (純粋な compute) の sortOrder 1 に入る：

```typescript
{
  title: 'レッスン 5 — Overflow 哲学 + 最初の proptest',
  slug: 'openhl-funding-overflow-proptest-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 5 — Overflow 哲学 + 最初の proptest\n\n...`
},
```

## SHA pinning discipline

L5 は `cd94137`（Stage 8b）を引用。L5 後、compute.rs が Stage 8b の `compute_premium` + saturate helper + 4 premium テスト + proptest 1 + テストモジュール imports/helper まで一致。

## Style review notes (self-critique before paste)

- **§ゴールが L5 を「conceptual、コードではない」とフレーミング** — 読者がコンパイル急ぎでなく哲学にペースを落とす。
- **§考えてみよう（panic 経由の chain-fork）**が哲学フレーミングを正当化 — 読者が単一ノード halt が実際にネットワークレベル問題である理由を推論。
- **§Overflow taxonomy テーブル**が 3 失敗モード（panic / wrap / saturate）を具体コード例で解く。
- **§やりがちな勘違い（`checked_mul` + Result）**が error 伝播が問題を実際に解決しない理由を説明。
- **§Step 2 の境界ケーステーブル**が 3 入力 regime を scannable に。
- **§考えてみよう（`saturate_i128_to_i64(0)`）**が「saturation は in-range で no-op」洞察を正当化。
- **§Step 4 が proptest マクロ、戦略構文、prop_assert マクロに名前付きサブセクション** — proptest 初心者が場所で primer を得る。
- **§「なぜ property を弱めたか」**が再利用可能な property-testing 知恵。
- **§やりがちな勘違い（テストの `f64`）**が「正確な規模が欲しい」反射を先回り。
- **§考えてみよう（range からゼロ除外）**が設計選択（interior vs 境界）を正当化。
- **§設計の振り返り 1-5** が distinct 一般化可能レッスンを名指す（saturate-or-fork、invariant-over-aspirational、stabilize-boilerplate、sign-aware-override、hand-traced-vs-proptest-complementarity）。
- **§よくある質問**が proptest mechanics（ケース数、ライブラリ選択、built-in `saturating_*` との関係）を扱う。
- **L6 プレビュー**が具体的：10 行関数、3 決定、4 unit test。
