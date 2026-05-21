# Building OpenHL Liquidation — L6 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) に対するドラフト。

````markdown
## L6 — `openhl-liquidation-margin-health-ja`

**Stage**: Stage 10a — `22eedf9`

**Title**: レッスン 6 — `margin_health` — 分類カスケードと境界セマンティクス

**Duration**: 30 分 · **XP**: 60

---

# レッスン 6 — `margin_health` — 分類カスケードと境界セマンティクス

## ゴール

このレッスンで掴む概念:

- **なぜ分類カスケードは `Underwater` を最初に check するか** — 負の margin ratio は maintenance より *も* 小さいので、順序を反転すると underwater アカウントが静かに Liquidatable に reclassify され、insurance-fund signal が失われる。最も極端な state を最初に check する — カスケードは内側に narrow する。
- **すべての境界で strict-less-than** — `ratio < maintenance_bps`、`≤` ではない。ratio が *ちょうど* maintenance のアカウントは `AtRisk` であって `Liquidatable` ではない。境界線そのものは *より良い* state に属する。strict に下回って初めて悪い state に落ちる。
- **Params 比較のための型 widening** — `i64::from(params.initial_margin_bps)` が境界で u32 を i64 に upcast し、その後 2 つの i64 値を比較する。各比較サイトでの暗黙キャストを避ける。
- **Flat-as-Safe は無償、code しない** — `margin_ratio` は flat ポジションに対して `MarginRatio(i64::MAX)` を返し、その値は妥当な `initial_margin_bps` のどれよりも大きいので、`margin_health` は special-case 分岐なしに `Safe` を返す。Composition が処理する。

確認:

```bash
cargo test -p openhl-liquidation
```

…が 21 テスト pass する（L4-L5 から 16 + 新規境界テスト 5）。

具体的な変更:

- **`src/compute.rs`** — `margin_ratio` の後に `margin_health` を追記 + 既存のテストモジュール内に unit test 5 個。
- **`src/lib.rs`** — compute の re-export を `margin_health` で拡張。

L6 は応用: ここまでに i128 / saturate / proptest の規律は内面化されている。分類カスケードは短い — だが design hill（カスケード順 + strict-less-than）が、不注意な実装でほとんどのバグが潜む場所。

## おさらい

L5 の後:
- `compute.rs` には `notional_value`、`unrealized_pnl`、`account_equity`、`margin_ratio`、`saturate_i128_to_i64` ヘルパー、加えて 13 unit test と 3 proptest がある。
- 非単調エッジケースは `long_ratio_monotonic_in_mark_when_levered` に `prop_assume!` で表現済み。
- `cargo test` が 16 テストを走らせ、すべて green。

L6 では `MarginRatio` 値を `MarginHealth` variants にマップする。関数は短い。決定は短くない。

## 計画

3 つの編集:

1. **`crates/liquidation/src/compute.rs` に `margin_health` を追記** — 13 行 + doc コメント。`margin_ratio` の下に置き、それを使う。
2. **既存のテストモジュールに unit test 5 個追加** — `MarginHealth` variant ごとに 1 つ（4 テスト）+ ちょうど maintenance しきい値での境界テスト 1 つ。
3. **`crates/liquidation/src/lib.rs` を更新** — `pub use compute::{...}` 行を拡張。

> 🛑 **予測。** スクロール前に: カスケードは 4 状態（`Underwater`、`Liquidatable`、`AtRisk`、`Safe`）を check する必要がある。条件は: `ratio < 0`、`ratio < maintenance_bps`、`ratio < initial_bps`、それ以外。**カスケードを `Liquidatable → Underwater → AtRisk → Safe` の順に書く（Liquidatable を最初に check）と何が起きるか?**

（答え: **Underwater アカウントが Liquidatable に分類される。** Ratio `−5_000` は `< maintenance_bps`（= 200）でもあるので、Liquidatable 分岐が最初に発火し、カスケードは Underwater check に到達しない。結果: bridge が insurance-fund-needed signal を受け取らず、underwater な不足が静かに通常の liquidation path を通り、数学が「不足を解消できなかった」と言っているのに帳簿上はポジションが solvent に close される。**カスケード順は load-bearing — 最も極端な state を最初に check する。内側に進む各ステップが残りの範囲を narrow する。**）

## 手を動かす walk-through

### Step 1: `src/compute.rs` に `margin_health` を追記

`crates/liquidation/src/compute.rs` を開く。`margin_ratio` の後、`#[cfg(test)]` ブロックの前に追記:

```rust
/// Classify margin health against the given params.
///
/// Returns one of four states in decreasing health order:
/// `Safe → AtRisk → Liquidatable → Underwater`. The boundaries use strict
/// inequality below the threshold (`<`), so an account at exactly the
/// maintenance ratio is `AtRisk`, not `Liquidatable`. This matches the
/// conventional "you start liquidating when you fall below the line"
/// reading.
#[must_use]
pub fn margin_health(
    snapshot: &AccountSnapshot,
    mark: MarkPrice,
    params: &LiquidationParams,
) -> MarginHealth {
    let ratio = margin_ratio(snapshot, mark);
    let initial_bps = i64::from(params.initial_margin_bps);
    let maintenance_bps = i64::from(params.maintenance_margin_bps);

    if ratio.0 < 0 {
        MarginHealth::Underwater
    } else if ratio.0 < maintenance_bps {
        MarginHealth::Liquidatable
    } else if ratio.0 < initial_bps {
        MarginHealth::AtRisk
    } else {
        MarginHealth::Safe
    }
}
```

この 18 行の関数で気づくべき 5 点:

1. **カスケード順が `Underwater` を最初に check する。** 負の ratio も `< maintenance_bps` を満たすので、Liquidatable を最初に check すると、すべての Underwater アカウントが Liquidatable に誤分類される。**不変量: 各分岐の条件は、前の分岐が捕まえたものすべてを排除する。** Underwater（`< 0`）が最も厳しく、Liquidatable（`< maintenance`）、AtRisk（`< initial`）、そして最後に Safe（残り）へと内側に narrow する。

2. **すべてのしきい値で `<`、`≤` ではない。** Ratio が `maintenance_bps` に等しいアカウントは *まだ* Liquidatable ではない — AtRisk。慣例的な読み方: maintenance margin は *上に* とどまるべき線。strict に超えてから liquidation 対象になる。Doc がこれを明示し、Step 2 のテストが強制する。**Strict inequality はしきい値そのものがより良い health state に属することを意味する。**

3. **`i64::from(params.initial_margin_bps)` が u32 → i64 を widen する。** フィールドは `u32`（メモリ節約、bps 値は ~40 億まで十分な範囲）。Ratio は `i64`（`margin_ratio` の signed 除算によって強制された型）。Rust では異なる integer 型の比較はコンパイルエラー。境界で widening することで比較がクリーンに保たれる。**Params ごとに 1 回キャスト。カスケード本体は純粋な i64 < i64 として読める。**

4. **Flat ポジション用の special case なし。** `margin_ratio` は flat アカウントに対して `MarginRatio(i64::MAX)` を返す。`i64::MAX` は妥当な `initial_margin_bps` のどれよりはるかに大きいので、カスケードは `Safe` に fall through する。**Flat-as-Safe の性質は `margin_ratio` の flat-position ガードに反映されている — `margin_health` はそれを知る必要がない。** Flat-position セマンティクスへの将来の微調整は *1 箇所* （`margin_ratio`）で起きる、2 つの同期した分岐ではなく。

5. **関数は `&LiquidationParams` を受け取る、値の `LiquidationParams` ではない。** `LiquidationParams` は `Copy`（12 byte）だが、参照シグネチャは「これは読むだけで consume しない」を signal する。Bridge は同じ `params` をスキャン全体のあらゆる `margin_health` 呼び出しに渡す。参照は呼び出しごとの（技術的には無償の）move を回避する。

> 🛑 **やりがちな勘違い。** 「3 つの `if` 分岐ではなく `match (ratio.0, maintenance_bps, initial_bps) { ... }` ではダメか?」 **条件は不等式であってパターンマッチではないから。** Match パターンは値の structural な相等性のためのもので、range check のためではない。Guard 句（`x if x < 0 => ...`）付きの match に書き換えると、可読性を失うだけで何も得られない — 明示的なカスケードはちょうど決定をそう考える通りに読める。

### Step 2: 境界テストを 5 個追加

既存の `#[cfg(test)] mod tests { ... }` の中、`margin_ratio` の unit test の後（そして `proptest!` ブロックの前）に追加:

```rust
    // ─── margin_health ─────────────────────────────────────────────

    #[test]
    fn health_safe() {
        // Ratio 1_500 bps (= 15%) with params (initial = 1_000, maintenance = 200) → Safe
        let s = snapshot(10, 100, 150);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(margin_health(&s, MarkPrice(100), &p), MarginHealth::Safe);
    }

    #[test]
    fn health_at_risk() {
        // Ratio 500 bps with params (initial = 1_000, maintenance = 200) → AtRisk
        let s = snapshot(10, 100, 50);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(margin_health(&s, MarkPrice(100), &p), MarginHealth::AtRisk);
    }

    #[test]
    fn health_liquidatable() {
        // Ratio 100 bps (= 1%) with params (maintenance = 200) → Liquidatable
        let s = snapshot(10, 100, 10);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(
            margin_health(&s, MarkPrice(100), &p),
            MarginHealth::Liquidatable
        );
    }

    #[test]
    fn health_underwater() {
        // Equity goes negative (mark moved hard against long): Underwater
        let s = snapshot(10, 100, 100);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(margin_health(&s, MarkPrice(50), &p), MarginHealth::Underwater);
    }

    #[test]
    fn health_boundary_at_maintenance() {
        // Ratio exactly == maintenance_bps → AtRisk (strict `<` for Liquidatable)
        let p = LiquidationParams {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: 0,
        };
        // notional = 1_000, equity = 20 → ratio = 200 bps exactly
        let s = snapshot(10, 100, 20);
        assert_eq!(margin_health(&s, MarkPrice(100), &p), MarginHealth::AtRisk);
    }
```

気づくべき 4 点:

1. **各テストがテストの `MarginHealth` を生み出す算術を名指しする。** "*Ratio 1_500 bps (= 15%)*" が読者（および失敗を読み返す将来の自分）に、テストがどの range を exercise するかを正確に伝える。コメントが正しくセットアップが間違ったテストは、assertion だけのテストより気づきやすい。

2. **4 variant 用に 4 テスト、境界用に 1 テスト。** 各カスケード分岐が positive テストを得る。`health_boundary_at_maintenance` が strict-less-than の慣例を証明する。この 5 番目のテストがないと、`<` を `≤` に flip した将来のリファクタリングが他の 4 つを pass しつつ、ちょうどしきい値での挙動を静かに変えてしまう — 本番ポジションの最も一般的な margin level がそこ（アカウントは maintenance に *到達してから* 下回る）。

3. **`health_boundary_at_maintenance` は `hyperliquid_default()` ではなく独自の params を構築する。** Hyperliquid default は `liquidation_fee_bps = 150` を持つが、このテストには無関係。明示的な struct 構築は、テストが *実際* どのフィールドに依存するかを文書化する。他のテストは fee フィールドが load-bearing でないので default を使う。

4. **`MarginHealth::Underwater` は L5 の underwater ケース** で exercise される（薄い collateral を持つ long ポジションに対する `mark = 50`）。L5 の `ratio_can_be_negative` と同じセットアップ — 負の ratio テストが数学を証明し、variant テストが分類を証明する。

### Step 3: `src/lib.rs` を更新

`crates/liquidation/src/lib.rs` を開く。Compute の re-export を拡張する。元:

```rust
pub use compute::{account_equity, margin_ratio, notional_value, unrealized_pnl};
```

更新後:

```rust
pub use compute::{
    account_equity, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
```

新規 1 名 — `margin_health` — がアルファベット順に `account_equity` と `margin_ratio` の間に挿入される。リストが ~5 項目を超えるとここで行が wrap する。

### Step 4: テストを走らせる

```bash
cargo test -p openhl-liquidation
```

期待される出力:

```
running 21 tests
test compute::tests::equity_can_go_negative ... ok
test compute::tests::equity_collateral_plus_pnl ... ok
test compute::tests::health_at_risk ... ok
test compute::tests::health_boundary_at_maintenance ... ok
test compute::tests::health_liquidatable ... ok
test compute::tests::health_safe ... ok
test compute::tests::health_underwater ... ok
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
test compute::tests::margin_ratio_deterministic ... ok
test compute::tests::short_ratio_monotonic_in_mark ... ok

test result: ok. 21 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

エラーが出た場合に多い原因:

- **`health_boundary_at_maintenance` が `AtRisk` の代わりに `Liquidatable` で失敗** — カスケード内のどこかで `<` を `≤` に間違って書いた。境界テストはまさにこれを捕まえるために存在する。
- **`health_underwater` が `Liquidatable` で失敗** — `Underwater` check を `Liquidatable` check の *後* に置いた。並び替える。最も極端な state が最初。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **カスケード順: 最も極端な state を最初に check する。** `Underwater` → `Liquidatable` → `AtRisk` → `Safe`。Narrowing の方向は、各分岐の条件が前の分岐が捕まえたものすべてを排除することを意味する。順序を反転すると、深刻なケースが静かに緩いケースを通る。**カスケード条件が重なるとき、最も厳しいものから最も緩いものへ sort する。**

2. **しきい値での strict-less-than: 線はより良い state に属する。** Maintenance ちょうどのアカウントは `AtRisk`、`Liquidatable` ではない。これは慣例の選択 — 本番の取引所では異なる — だが、システム *内* の一貫性が、しきい値がどちら側に属するかより重要。**慣例を選び、doc で名指しし、境界テストで強制する。**

3. **`margin_health` 内に flat ポジションの special case なし。** `margin_ratio`（flat に対して `i64::MAX` を返す）との composition で、性質が無料で fall out する。`if snapshot.position_size.0 == 0 { return Safe; }` を追加すれば、flat-position の挙動を 2 箇所に複製してしまい、片方が変わった瞬間にずれる。**不変量を 1 箇所に表現し、下流の関数が composition で継承するに任せる。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L6 の後:
- **compute.rs** は Stage 10a を `margin_health` + 18 unit test + 3 proptest まで一致する。最後の関数（`close_order_spec`）とその 3 テストは L7。
- **lib.rs** は compute の re-export を 6 個中 5 個持つ。最後の 1 つ（`close_order_spec`）は L7 で着地する。

## よくある質問

**Q1: なぜ misconfigured な params（maintenance ≥ initial）のようなケースのために `Result<MarginHealth, ...>` を返さないのか?**

関数は total — どの入力も定義された出力を生む。Misconfigured な params（maintenance == initial、または maintenance > initial）でも、すべてのアカウントを 4 variants のどれかに分類する、間違ったセマンティクスで。`Result` を返すと、すべての呼び出しサイトに *params を妥当に構築した bridge からは決して起きない* `MisconfiguredParams` エラーを処理させる。**Total function は compose しやすい。Params は loading 境界で validate し、下流ではすべて信頼する。**

**Q2: `margin_health` を sorted thresholds 配列と binary search でもっと「データ駆動」にできないか?**

4 状態なら、明示的なカスケードのほうがクリアで速い。Binary search は threshold の数が ~10 を超えると勝つ — その時点でリファクタリングする。先取りした一般化は、エンジンが必要としない仕組みを足す。**持っている cardinality に最適化する、いつか持つかもしれない cardinality ではなく。**

**Q3: `maintenance_bps > initial_bps`（misconfigured）のとき何が起きるか?**

カスケードは依然として定義された分類を生む: `ratio >= maintenance_bps` で、次の分岐は `ratio < initial_bps`（maintenance > initial なら ratio も ≥ initial なので false）、`Safe` に fall through する。`ratio ∈ [0, maintenance_bps)` で `Liquidatable` に着地する。AtRisk は到達不能になる。**Misconfigured params は一貫性のあるが意図しない分類スキームを生む。Validation は param 構築側の責任で、分類器の責任ではない。**

**Q4: なぜ `margin_health` は params の i64 変換をキャッシュしないのか?**

呼び出し側は通常、block ごとのスイープで `margin_health` をアカウント当たり 1 回呼ぶ。Bridge は同じ `&LiquidationParams` をすべての呼び出しに渡す。2 つの `i64::from(u32)` キャストはゼロコスト — コンパイラは最大でも `mov` 命令を 1 つ emit するだけ。**コストを測ってからキャッシュする。反射でキャッシュに手を伸ばさない。**

**Q5: カスケードを `match` の range pattern（`0..maintenance_bps => Liquidatable`）で書けるか?**

Rust の `match` は exclusive-range pattern をサポートする（1.26 から）ので、構文的にはイエス。しかしパターンは `i64::MIN..0`、`0..maintenance_bps`、`maintenance_bps..initial_bps`、`initial_bps..=i64::MAX` になる。*名前付きの* 境界（リテラルではなく変数を参照）が必要なので、各パターンに guard 句がいずれにせよ必要になる。If/else カスケードのほうがここではクリーンに読める。**Structural なケースには `match`、同じ値での不等式カスケードには `if/else`。**

## 次のレッスン (L7)

L7 で Stage 10a を `close_order_spec` で閉じる — snapshot を bridge が consume する `CloseOrderSpec` に変換する関数だ。3 unit test: long-closes-with-Sell、short-closes-with-Buy、flat-position エッジケース（qty = 0）。L6 より短い — L7 までに compute モジュール全体が背後にあり、レッスンの大半は L4 の `unsigned_abs` 規律とエンジンの外向きインターフェース間の橋渡し。

````

---

## Seed-file slot

L6 は Module 2 の sortOrder 2 に入る:

```typescript
{
  title: 'レッスン 6 — margin_health — 分類カスケードと境界セマンティクス',
  slug: 'openhl-liquidation-margin-health-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 6 — margin_health — 分類カスケードと境界セマンティクス\n\n...`
},
```

## SHA pinning discipline

L6 は `22eedf9`（Stage 10a）を引用する。L6 後の答え合わせ diff は compute.rs を `margin_health` + 18 unit test までカバーする。`close_order_spec` + 3 テストのみが L7 で残る。

## 翻訳セルフレビュー（paste 前）

- **「Liquidatable を最初に」予測コールアウト** がカスケード順の議論をアンカーする。これがないと読者は順序を信仰で受け入れる。あると、誤った順序が失敗するのを想像し *なぜ* かを見る。メンタルモデルが次のリファクタリングを生き残る。
- **境界 maintenance テストが L6 の load-bearing な部分。** これがないと、`<` → `≤` の typo が他の 4 テストを静かに pass して出荷される。あると、慣例がすべての将来のリファクタリングを通じてロックされる。これは funding の overflow proptest が教えた「真ん中ではなく境界をテストする」のと同じ規律。
- **L6 は応用、新しい規律ではない。** Pedagogy はシフトした: ここまでに読者は `i128`、`saturating_*`、proptest、固定小数点スケールを知っている。L6 はそれらを小さな分岐関数で compose するだけ。Design hill（カスケード順 + strict-less-than）は 1 読で内面化できる程度に小さい。
- **Q5 の `match` 範囲パターンの議論** は、「これを検討した、こうして採用しなかった」というタイプの詳細で、読者が著者の判断を信頼するのを助ける — 読者が自分のコードで下す難しい判断のために。
