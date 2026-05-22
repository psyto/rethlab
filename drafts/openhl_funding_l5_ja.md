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

このレッスンで掴む概念:

- **Saturate でも panic でも wrap でもない、consensus で許される overflow は saturate だけ** — panic すると validator が halt し、ネットワークから fork off する。Wrap はコンパイラバージョン次第で挙動が変わり、「定義されているが間違った」値を生む。Saturate ならすべての validator が同じ bounded value に到達する。Consensus の liveness を保てる選択肢は他にない。
- **符号を意識した saturation の override** — `i64::try_from` は失敗を報告してくれるが方向までは教えてくれない。`unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })` の closure が方向を復元する。固定で `i64::MAX` を返すようにすると、`i128::MIN` が正に flip して符号が静かに壊れる。
- **手書きトレースと proptest は補完関係であって冗長ではない** — proptest のランダムサンプリングは `i128::MAX`（2^129 通りのうちの 1 点）にまず当たらない。境界は手書きでしか pin できない。Proptest は interior の property に強く、手書きは corner に強い。
- **テストすべきは「実際に成立する不変条件」であって「願望の property」ではない** — 素朴な antisymmetry は magnitude も等しくあれと書きたくなるが、整数除算がそれを壊す。だから「符号が逆」という weaker な property をテストし、丸めの caveat はテストコメントに残す。
- **`checked_mul` + `Result` で本当に解決するわけではない理由** — エラーは最終的に bridge に届くが、bridge が取れる現実的な選択肢は「revert（fork）」「skip（silent inconsistency）」「cap で settle」の 3 つしかない。最後のものは saturate がそのまま実現してくれる挙動だ。

新規関数なし、新規テストコードは ~5 行。**メンタルモデルこそがレッスンの本体だ。**

検証：

```bash
cargo test -p openhl-funding
```

上記の実行結果が 5 テストを通る（L4 で書いた 4 つ + 新規 proptest 1 つ）。

具体的な変更:

- **コードベース初の proptest** — `premium_is_antisymmetric_in_mark_index`。`mark` と `index` を入れ替えると premium の符号が反転する（mark = index のときは両方ともゼロ）という property だ。テスト実行 1 回あたり 256 のランダム入力を投げる。

ただしこのレッスンの本丸は**コードではなく概念**の方だ。歩いていくのは：

1. **panic = チェーン fork である理由。** Panic した validator は halt し、残りの validator はそれなしで前進する。State が乖離する。
2. **wrap = チェーン fork である理由。** コンパイラバージョンや build flag が異なる 2 つの validator は、同じ overflow 地点で*別々に* wrap しうる。誤った値が正しい値から乖離する。
3. **saturate が bounded behavior である理由。** すべての validator が同じ入力に対して同じ saturated 値に合意する。Fork は起きない。
4. **`saturate_i128_to_i64` の境界ケース。** `i128::MAX → i64::MAX`、`i128::MIN → i64::MIN`。`unwrap_or` の closure が `i64::MAX` 固定ではなく、なぜ符号に依存する必要があるか。

## おさらい

L4 後の状態：
- `compute_premium` が `i128` 中間値を使って符号付き premium を計算する。
- `saturate_i128_to_i64` が overflow を i64 境界に clamp する。
- 手書きトレーステスト 4 つが、normal な入力に対する関数の挙動を pin している。

L4 のテストでは pathological な入力（例：`MarkPrice(u64::MAX)`）を exercise していないし、saturate helper を境界で exercise してもいない。L5 では、その両ギャップを哲学と proptest で埋めにいく。

## プラン

編集は 2 つ：

1. **`compute.rs` のテストモジュールに `use proptest::prelude::*;` を追加**する。
2. **antisymmetry property を持つ `proptest! { ... }` ブロックを追加**する。

プロダクションコードの変更はない。

> 🛑 **考えてみよう。** スクロール前に — `compute_premium` で panic が起きれば validator は halt する。**なぜそれが単一ノード障害ではなく chain fork になるのか？** ヒント：1 つが halt したとき、他の validator が何をしているかを考えよ。

（答え：**他の validator は、halt したノードを置き去りに前進していくからだ。** Funding tick はすべての validator で deterministic な state update を生む。1 つが halt しても、network の quorum（典型的には 2/3 以上）はそのまま動き続ける。Halt した validator が再起動する頃には、chain head は何ブロックも先に進んでいる。Halt した validator は sync できない — halt したブロックでの local state が network 側の view と食い違うからだ。**Halt によって history が 2 つに分かれる：「panic を踏んだ入力での history」と「network が進めた state での history」だ。Validator は事実上、自ら network から fork off したことになる。** これに対して saturate は、validator 同士を lockstep のまま保ってくれる。）

## 手順

### Step 1: Overflow の taxonomy

「整数が収まらなかった」の失敗モード 3 つを、validator から見た**最終的な帰結**で並べると、なぜ選択肢が 1 つしかないのかが一目で分かる:

| モード | Rust 上の挙動 | validator/network への影響 | 判定 |
| --- | --- | --- | --- |
| **Panic** (`*` in debug) | スレッドが halt | validator 1 台が consensus から永久脱落、network は気づかず前進 | ❌ 自ら **fork off** する最悪ケース (liveness 喪失) |
| **Wrap** (`*` in release) | silent に modulo wrap | コンパイラ最適化次第で**各 validator が別々の誤値**、または全員一致で**誤った値に合意** | ❌ 検出不可能な **chain fork** または検出不能な silent corruption |
| **Saturate** (`saturating_mul`) | 型境界 (`i128::MAX` / `MIN`) に clamp | 全 validator が**同じ bounded 値**で合意し前進、経済的には capped settlement に降りる | ⭕ **liveness 維持** — consensus が許す唯一の選択肢 |

下に各モードの細部を順に展開する。

「整数が収まらなかった」の失敗モード 3 つ：

#### Panic（debug build の `*`）

```rust
let scaled = diff * i128::from(RATE_SCALE);  // debug で overflow に panic
```

Debug build では整数 overflow が panic する。panic を踏んだスレッドは halt し、それが validator の funding tick だった場合、validator の state machine は前進を止める。**ネットワークの残りはそれに気づかずに進み続ける。** halt した validator を再起動した時点で、panic を踏んだブロックでの world-view は network 側のものと一致しない。それ以降、新しいブロックを検証できなくなる — 自分が計算した覚えのない state を参照しているように見えるからだ。

要するに：**validator 1 台がいなくなった、しかし不在によって壊れるのは自分自身だけで、ネットワーク側ではない。** チェーンが「2 つの valid な history を生む」形で fork するのではなく、panic した validator が consensus から永久に脱落するという形で fork する。

#### Wrap（release build の `*`）

```rust
let scaled = diff * i128::from(RATE_SCALE);  // release で silent に wrap
```

Release build では `*` は panic せず wrap する。結果は `(diff * RATE_SCALE).wrapping_rem(2^128)` — 値としては*定義済み*だが、数学的には正しくない。

**ここでのハザード**：コンパイラの最適化が異なる 2 つの validator が、同じ overflow 地点で*別々の wrap 結果*を出しうる。コンパイラは結合則のもとで演算を並べ替えられるので、`(a * b) * c` と `a * (b * c)` が「中間で overflow が起きるか否か」次第で異なる wrap 結果になりうる。仮に両 validator が偶然同じように wrap したとしても、*誤った*値がその tick で settle されるすべてのアカウントに伝播する。**全 validator が間違った答えに合意してしまう。** さらに後段で raw input から funding を再計算する下流クライアントは、結果が一致しないと指摘する。レイヤー間の不整合でチェーンが fork する。

しかも *release build* での wrap は silent だ — log もなければ warning もない、イベントすら出ない。**検出が最も難しいクラスのバグ — 間違っているが consistent な結果が出る、というやつだ。**

#### Saturate（我々が選んだ挙動）

```rust
let scaled = diff.saturating_mul(i128::from(RATE_SCALE));  // i128::MAX/MIN に clamp
```

Saturation は型境界で定義された値を生む：正方向に overflow すれば `i128::MAX`、負方向なら `i128::MIN` だ。**`saturating_mul` を持つすべての validator が、入力に対して同じ値を出す。** Fork は起きない。

Saturation のもとでは*funding rate* が事実上 cap される（`saturate_i128_to_i64` がさらに i64 へ clamp した後の値だ）。経済的な帰結としては、極端な oracle dislocation で premium が saturation の閾値を超えるような場面でも、panic や wrap ではなく最大 rate での支払いが発生する形になる。**挙動が gracefully degrade する。**

> 🛑 **やりがちな勘違い。** 「`checked_mul` を使ってエラーを返せばよくないか？」 **可能だが、問題を呼び出し側に押し付けるだけだ。** `Result<Premium, OverflowError>` が `compute_rate`、`apply_funding`、clock を経由して上へ伝播し、最終的に bridge にまで届く。そして bridge は何をするか決める必要に迫られる。Bridge の選択肢は (a) ブロックを revert する（chain fork）、(b) funding tick をスキップする（silent な state 不整合）、(c) cap で settle する、のいずれかだ。**「cap で settle する」結果は saturation が直接実現できる — エラーを伝播させる必要すらない。**

### Step 2: `saturate_i128_to_i64` 境界ケース

L4 の helper を思い出す：

```rust
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
```

入力の regime は 3 つ：

| 入力 | `try_from` の結果 | `unwrap_or` が返す値 |
|---|---|---|
| `v` が i64 に収まる | `Ok(v as i64)` | `v as i64`（override されない） |
| `v > i64::MAX` | `Err(...)` | `i64::MAX`（`v > 0` だから） |
| `v < i64::MIN` | `Err(...)` | `i64::MIN`（`v ≤ 0` だから） |

**`unwrap_or` の中で符号チェックを行う理由は？** `try_from` は overflow がどちらの方向に起きたかを教えてくれず、「収まりません」としか言わないからだ。もし overflow に対して固定値（例：`i64::MAX`）を返すと、`i128::MIN` も `i64::MIN` ではなく `i64::MAX` に saturate されてしまい、符号が反転する。`if v > 0` のテストが、その方向情報を回復してくれる。

ここで重要なのは、**`try_from` の `Err` は方向の情報を捨てているが、引数の `v` (i128) はクロージャから依然読めるまま生きている**という点だ。データフローで書くと:

```
                     ┌──── Ok(value)  ─────────────────────┐
                     │     (v が i64 に収まる)              │
[入力] v: i128 ──► try_from(v)                              │
                     │     収まらない → 方向情報は潰される   │
                     └──── Err(_)                           │
                              │                             │
                              │  ★ ここで unwrap_or の closure 内から   │
                              │     v (元の i128) を再度参照できる    │
                              ▼                             │
                       if v > 0  ──► i64::MAX  ─────────────┤
                       else      ──► i64::MIN  ─────────────┤
                                                            ▼
                                                       [出力] i64 (符号が保たれた)

例:  v = i128::MAX  → try_from = Err → v > 0 で true  → i64::MAX  ✅
     v = i128::MIN  → try_from = Err → v > 0 で false → i64::MIN  ✅ (固定値だと符号が flip して大事故)
     v = 0          → try_from = Ok(0) → closure 不発火    → 0
```

「`Err` は値の中身を捨てるが、元の引数は scope に残っている」が `unwrap_or` という API の存在意義そのものだ。これを `unwrap_or(i64::MAX)` のような単純な fallback にすると、`i128::MIN` のような「絶対値が最大の負の数」が**正の `i64::MAX` に化ける** — premium の符号反転バグが consensus に乗ってしまう。クロージャ版は「`v` を覗き見して方向を復元する 1 行」を挟むことで、その事故を物理的に塞いでいる。

> 🛑 **考えてみよう。** `saturate_i128_to_i64(0)` は何を返すか。

（答え：**`0`。** `i64::try_from(0_i128)` は `Ok(0)` を返す。`unwrap_or` 側の分岐は発火しない。**Saturation は in-range の値に対しては no-op だ。** これは下に出てくる proptest にとって重要なポイントになる — ランダムな `(mark, index)` ペアのほとんどは i64 に余裕で収まる premium を生むので、saturate helper はそれらに対して invisible になる。）

> 🛑 **やりがちな勘違い。** 「境界を明示的にテストする必要があるのか — property-based テストでカバーされないのか？」 **ランダムサンプリングではまずカバーされない。** Proptest のデフォルト戦略は入力空間に対して uniform に値を生成する。`i128::MAX` は 2^129 通りの値のうちのただ 1 点なので、ランダムに当たる確率は実質ゼロだ。**境界テストには手書きトレースが要る** — generator のランダムウォークでは届かない特定の値を狙い撃ちする必要があるからだ。

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

注目点は 3 つ：

1. **`use openhl_clob::AccountId;`** — `pos` helper に必要だ。L4 のテストでは使わない。L5 の proptest 自体でも実は不要だが、L7 の apply_funding テストで必要になるので、テストモジュールの import を安定化させるために今のうちに入れておく。
2. **`use proptest::prelude::*;`** — `proptest!`、`prop_assert_eq!`、`prop_assert!`、strategy combinator（`1u64..1_000_000`）を scope に持ち込む。
3. **`fn pos(account: u64, size: i64) -> Position`** — `Position` を構築する小さな helper。L7 で使う。import / helper セクションを安定化させるため、今のうちに追加する。

**Boilerplate を先に安定化させ、テストを iterate する。** L1 の dep と L4 の `use` ブロックでも同じ理屈だった — 後で必要になるものを先に入れて、レッスンごとの diff を本当に新しい部分に集中させる、という方針だ。

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

proptest 固有の要素は以下：

- **`signum()` について(初出メモ):** `i64::signum()` は値の符号を `-1` / `0` / `+1` のいずれかで返す標準ライブラリのメソッド。負値で `-1`、ゼロで `0`、正値で `+1`。`a.0.signum() == -b.0.signum()` は「a と b の符号が正負で逆 (`+1` と `-1` のペアになる)」という命題に変換される — 整数除算の丸めで magnitude がぶれても、符号だけは厳密に antisymmetric であることを property にしている。
- **`proptest! { ... }`** — テスト関数をラップするマクロ。このブロック内では、`#[test]` 関数が generator 付きの property test として扱われる。
- **`mark in 1u64..1_000_000`** — **戦略**だ。`mark` は `[1, 1_000_000)` の範囲からサンプルされる。デフォルトは test run あたり 256 ケース（つまり ~256 個のランダムな `(mark, index)` ペア）。
- **`prop_assert_eq!` と `prop_assert!`** — proptest のアサーションマクロだ。単一ケースとして見れば `assert_eq!` / `assert!` と同等だが、proptest は失敗時に入力を shrink して*最小*の失敗ケースを探すため、専用のマクロが必要になる。

なぜこの property を選ぶのか。

「antisymmetry」の素朴版はこうだ：`compute_premium(MarkPrice(M), IndexPrice(I))` と `compute_premium(MarkPrice(I), IndexPrice(M))` は**同じ規模で反対の符号**の結果を返すべきだ。だが整数除算はゼロに向かって丸めるので、`|a| / M == |b| / I` の cross-comparison は厳密には成り立たない — rounding 由来の off-by-one な非対称性があるからだ。

**そこで proptest では弱めた property をテストする：符号が反対（または両方ゼロ）であること。** Mark = index のときは両方の premium がゼロ、Mark ≠ index のときは一方が正、もう一方が負になる。

**コメントには、なぜ property を弱めたかも書いてある。** 将来この property を読んで「規模も等しいべきでは？」と思った読者は、rounding 由来の caveat がその場で documentation されているのを見つけられる。**整数算術のもとで実際には成り立たない aspirational な property は、テスト失敗を呼び込むだけだ。** 実際に invariant な property をテストすること。

> 🛑 **やりがちな勘違い。** 「テスト fixture で `f64` を使って期待規模を厳密に計算すればよいのでは？」 **それは `f64` 計算の期待値を `i64` 計算の実測値に対して assert することになる — 両者は LSB レベルで一致しない。** 決定的な整数コードを非決定的な float の期待値と比較するテストは、信頼できない。**テスト側の算術も、本番側の算術と同じドメインに留める。**

> 🛑 **考えてみよう。** 戦略で `0u64..1_000_000` ではなく `1u64..1_000_000` を使い、ゼロを除外しているのはなぜか。

（答え：**`index == 0` は `Premium(0)` の早期 return ケースで、L4 の手書きトレース unit test で既にカバー済みだからだ。** Proptest に 0 を含めると、(a) 両方ゼロのときに「符号が反対」を assert して property が破れる、もしくは (b) proptest 内でゼロを特別扱いしてテストを複雑にする、のいずれかになる。ゼロを除外すれば property がクリーンに保てる。**Proptest は interesting な範囲を exercise すべきで、trivial か既にテスト済みの範囲ではない。**）

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

5 テストすべてが green になる。proptest は 256 個のランダムな `(mark, index)` ペアを実行し、全 256 ケースで antisymmetry property が満たされる。

proptest の出力を詳しく見たい場合は環境変数を設定する：

```bash
PROPTEST_VERBOSE=1 cargo test -p openhl-funding premium_is_antisymmetric
```

「passed 256 cases」のメッセージや、失敗時の「shrunk to mark=X index=Y」 — 最小の counterexample — などのログが確認できる。

よくあるエラー：

- **`error: macro 'proptest' is not used`** — `use proptest::prelude::*` ではなく `use proptest::*` を import した場合だ。マクロは `prelude` に置かれている。
- **`prop_assert_eq!` を `assert_eq!` と typo** — 通常の関数なら動くが、`proptest!` の中では適切な shrinking のために `prop_*` 系を使う必要がある。テスト自体は pass するものの、失敗時に最小例まで shrink されない。
- **「signs are opposite」が失敗する** — 通常、proptest が `mark == index` を誤って else 分岐に流してしまっている。if / else の分割を確認すること：`if mark == index { both zero } else { opposite signs }`。
- **`signum() == -b.0.signum()` で `b.0 == 0` のときに proptest が panic** — mark と index が異なるのに compute_premium がゼロを返す状況で起きる（例：整数数学でゼロに丸まる非常に小さな入力）。`1u64..1_000_000` の range ならこれを避けられる。range をもっと狭めると当たる場合がある。

## 設計の振り返り

このレッスンに焼き込んだ決定は 5 つ：

1. **Consensus 上で bounded behavior を提供する overflow オプションは saturate だけ。** Panic は halt 経由の chain fork、wrap は「間違っているが consistent」な値による chain fork を生む。Saturate なら全 validator が同じ値を出し、gracefully degrade する。**Consensus の liveness を保つ選択肢は他にない。**

2. **テストするのは aspirational な property ではなく、実際に invariant な property。** 素朴な antisymmetry は規模が一致することを要求するが、整数の rounding でそれは破れる。だから弱めた property（符号が反対）をテストし、rounding 由来の caveat はテストコメントで documentation する。**Aspirational なテストは production で失敗し、invariant なテストは開発で失敗する。**

3. **テストモジュールの boilerplate は早めに安定化させる。** `use proptest::prelude::*`、`use openhl_clob::AccountId`、`pos` helper を今のうちに足しておけば、テストモジュールの import は L6 / L7 まで安定する。**Boilerplate の churn は、レッスンごとの diff の本質を覆い隠してしまう。**

4. **`saturate_i128_to_i64` の `unwrap_or` の closure は符号に依存させる。** 固定値の override では、負方向の overflow を正に flip してしまう。Saturate helper を丁寧に読めば、closure が*念のため*ではなく*必要だから*そうなっていると分かる。

5. **proptest の範囲からゼロを除外する** — ゼロのケースは既に手書きトレースの unit test でカバー済みであり、proptest に含めると property を余計に複雑化することになる。**手書きトレースは境界ケースを pin し、proptest は内部の property を pin する。** 互いに補完的であって、冗長ではない。

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

**Q: proptest は実際に何ケース実行するのか？**
デフォルトはテスト実行 1 回あたり 256 ケース。`PROPTEST_CASES=N cargo test` で変更できる。Shrinker が failure 発見後に counterexample を最小化するため、追加のケースを実行することもある。**256 個のランダムペアで、antisymmetry property は CI を重くせずに input 空間の意味あるサンプルに対して exercise される。**

**Q: もっと強いカバレッジのために 10,000 ケースに増やせるか？**
できる。だが closed form を持つ property に関しては、ケース数を増やしたところで limit利得はすぐに頭打ちになる。Antisymmetry は確率的な property ではなく、成り立つか成り立たないかのどちらかだ。256 ケースもあれば、実装がテスト範囲で正しいという高い信頼が得られる。**Adversarial な入力が絡む property（例：crypto）ならケース数を増やす価値があるが、純粋数学的な property には 256 で十分だ。**

**Q: `proptest` ではなく `quickcheck` を使えばよいのでは？**
どちらも Rust の property-testing crate であり、どちらでも動く。`proptest` は shrinking が強く（より小さい counterexample を見つける）、strategy の合成（range に対する `in` 構文）も書きやすい。openhl workspace は consensus crate のテストで既に proptest を引いているので、限界コストはゼロだ。**一つに決めたら貫く。コードベースの途中で乗り換えるコストは、最初に違う方を選ぶより高い。**

**Q: `saturating_mul` と `saturate_i128_to_i64` の関係は？**
`saturating_mul` は `i128`（や他の整数型）の組み込みメソッドで、その型自身の範囲内で saturated な積を生む。`saturate_i128_to_i64` はユーザ定義の helper で、`i128` を `i64` の範囲に clamp する。対応している境界が違う：`saturating_mul` は型内 overflow を防ぐもの、`saturate_i128_to_i64` は型をまたいだ narrowing を防ぐものだ。**両方とも必要だ — 数学が積のために i128 を、保存のために i64 を、どちらも使うからだ。**

## 次のレッスン（L6）

L6 では `compute_rate` を追加する — `Premium` と `FundingParams` を受け取って `FundingRate` を返す関数だ。関数は ~10 行だが、設計判断を 3 つ encode する：(a) `divisor == 0` のとき `FundingRate(0)` を返す（funding 無効化）、(b) divisor が clamp の*前*に premium を縮める、(c) `rate_cap` が絶対値で clamp する（負 cap と正 cap が同じ `params.rate_cap` を共有する）。レッスンには divisor、両側 cap、funding 無効化ケースをカバーする unit test 4 つも加える。L6 を終えた時点で、3 つの pure-compute 関数のうち 2 つが完成する。
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
