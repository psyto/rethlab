# Building OpenHL Liquidation — L6 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) に対するドラフト。

## L6 — `openhl-liquidation-margin-health-ja`

**Stage**: Stage 10a — `22eedf9`

**Title**: レッスン 6 — `margin_health` — 分類カスケードと境界セマンティクス

**Duration**: 30 分 · **XP**: 60

---

````markdown
# レッスン 6 — `margin_health` — 分類カスケードと境界セマンティクス

## ゴール

このレッスンで掴む概念:

- **分類カスケードが `Underwater` を最初に check する理由。** 負の margin ratio は maintenance より *も* 小さいので、順序を逆にすると underwater アカウントが静かに Liquidatable に再分類されてしまい、insurance-fund 向けのシグナルが失われる。最も極端な state から先に check する — カスケードは内側に narrow していく。
- **すべての境界で strict-less-than を使う。** `ratio < maintenance_bps` であって、`≤` ではない。Ratio が *ちょうど* maintenance のアカウントは `AtRisk` であって `Liquidatable` ではない。境界線そのものは *より良い* state に属する。Strict に下回って初めて、悪い state に落ちる。
- **Params 比較のための型 widening。** `i64::from(params.initial_margin_bps)` が境界で u32 を i64 にアップキャストし、その後は 2 つの i64 値の比較になる。各比較サイトでの暗黙キャストを避けるための一手だ。
- **Flat-as-Safe は無償、明示的に書かない。** `margin_ratio` は flat ポジションに対して `MarginRatio(i64::MAX)` を返し、その値は妥当な `initial_margin_bps` のどれよりも大きい。したがって `margin_health` は special-case 分岐なしに自然と `Safe` を返す。Composition が片付けてくれる。

確認:

```bash
cargo test -p openhl-liquidation
```

…で 21 テストが pass する（L4-L5 の 16 + 新規境界テスト 5）。

具体的な変更:

- **`src/compute.rs`。** `margin_ratio` の後に `margin_health` を追記し、既存のテストモジュールに unit test 5 個を加える。
- **`src/lib.rs`。** Compute の re-export を `margin_health` で拡張する。

L6 は応用編だ。ここまでに i128 / saturate / proptest の規律は内面化されている。分類カスケードは短い — だが design hill（カスケード順 + strict-less-than）こそが、不注意な実装でバグが潜みやすい場所だ。

## おさらい

L5 の後:
- `compute.rs` には `notional_value`、`unrealized_pnl`、`account_equity`、`margin_ratio`、`saturate_i128_to_i64` ヘルパー、加えて 13 unit test と 3 proptest が揃っている。
- 非単調エッジケースは `long_ratio_monotonic_in_mark_when_levered` の `prop_assume!` で表現済み。
- `cargo test` は 16 テストを走らせ、すべて green。

L6 では `MarginRatio` の値を `MarginHealth` の variant にマップする。関数は短い。決定は短くない。

## 計画

編集は 3 つ:

1. **`crates/liquidation/src/compute.rs` に `margin_health` を追記。** 13 行 + doc コメント。`margin_ratio` の直下に置き、それを利用する。
2. **既存のテストモジュールに unit test 5 個を追加。** `MarginHealth` variant ごとに 1 つ（4 テスト）+ ちょうど maintenance しきい値での境界テスト 1 つ。
3. **`crates/liquidation/src/lib.rs` を更新。** `pub use compute::{...}` 行を拡張する。

> 🛑 **予測。** スクロール前に考えてほしい。カスケードは 4 状態（`Underwater`、`Liquidatable`、`AtRisk`、`Safe`）を見分ける必要がある。条件は `ratio < 0`、`ratio < maintenance_bps`、`ratio < initial_bps`、それ以外。**カスケードを `Liquidatable → Underwater → AtRisk → Safe` の順（Liquidatable を最初に check）に書いたら、何が起きるか?**

（答え: **Underwater アカウントが Liquidatable に分類されてしまう。** Ratio `−5_000` は `< maintenance_bps`（= 200）でもあるので、Liquidatable 分岐が先に発火し、カスケードは Underwater check に到達しない。結果として、bridge は insurance-fund-needed のシグナルを受け取らず、underwater な不足が静かに通常の liquidation path を通る。数学が「不足を解消できなかった」と言っているのに、帳簿の上ではポジションが solvent に close されてしまう。**カスケード順は load-bearing だ — 最も極端な state から先に check する。内側に進む各ステップが、残りの範囲を narrow させる。**）

4 状態の判定カスケードを margin ratio の数直線上に並べると、なぜこの順序でしか正しく動かないのか、そしてなぜ逆順だと Underwater が Liquidatable に「吸い込まれる」のかが視覚で見える:

```
                       (悪化方向 ◄────────────────── 値の大きさ ──────────────────► 改善方向)

   margin ratio:   ── −∞ ── 0 ─────── maintenance_bps ─────── initial_bps ─────── i64::MAX ──
                       ↑    ↑                    ↑                      ↑                    ↑
                       │    │ (例: 200)          │ (例: 1000)            │                    │
                       │    │                    │                      │                    │
                       └────┴──┐  ┌──────────────┴──┐  ┌─────────────────┴──┐  ┌──────────────┘
                              ▼  ▼                 ▼  ▼                    ▼  ▼
                          🔴 Underwater       🟠 Liquidatable          🟡 AtRisk            🟢 Safe
                          (ratio < 0)         (0 ≤ ratio                (maint ≤ ratio       (initial ≤ ratio、
                                              < maintenance)            < initial)            flat なら i64::MAX も
                                                                                              ここに着地)


   🟢 正しいカスケード順 (内側に narrow していく):
      ① if ratio < 0                ──► Underwater     (最も極端な領域を最初に切り出す)
      ② else if ratio < maintenance ──► Liquidatable   (Underwater は ① で除外済み)
      ③ else if ratio < initial     ──► AtRisk         (Liquidatable は ② で除外済み)
      ④ else                        ──► Safe           (残りの全域)
      ※ 各分岐の条件は「前の分岐が拾ったすべての値を排除した残り」を相手にする。

   🔴 逆順 (広い領域から先に check) にすると:
      ① if ratio < maintenance     ──► Liquidatable   ← ratio = -5_000 (Underwater) も
                                                         < 200 を満たすので Liquidatable に
                                                         「吸い込まれる」
      ② if ratio < 0               ──► Underwater     ← ここに来ることはない (到達不能)
      ③ ...
      結果: insurance-fund シグナルが消え、Underwater アカウントの不足が通常の close path で
            silent に流される。数学が解けていない不足を、帳簿は solvent な close として記録する。
```

ポイント: **カスケードを「最も極端な領域から先に切り出していく narrowing」として書くと、各分岐の条件は自然に上の分岐の補集合の中だけで成立する**。逆に「広い領域から先に check」にすると、より極端な領域 (Underwater) が広い領域 (Liquidatable) に吸収されてしまい、本来 4 つあるはずの分類が 3 つに退化する。L7 で `close_order_spec` がこの 4 状態を見て発火するかどうかを決めるので、この narrowing が崩れると下流の挙動全体が壊れる。

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

この 18 行の関数で押さえておく点が 5 つ:

1. **カスケード順が `Underwater` を最初に check する。** 負の ratio は `< maintenance_bps` も満たすので、Liquidatable を最初に check すると、すべての Underwater アカウントが Liquidatable に誤分類されてしまう。**不変量: 各分岐の条件は、前の分岐が捕まえたものをすべて排除している。** Underwater（`< 0`）が最も厳しく、そこから Liquidatable（`< maintenance`）、AtRisk（`< initial`）、最後に Safe（残り）へと内側に narrow していく。

2. **しきい値はすべて `<`、`≤` ではない。** Ratio が `maintenance_bps` に等しいアカウントは *まだ* Liquidatable ではなく、AtRisk だ。慣例的な読み方は「maintenance margin は *上にとどまる* べき線で、strict に超えてから liquidation 対象になる」。Doc がこれを明示し、Step 2 のテストが強制する。**Strict inequality は、しきい値そのものがより良い health state に属する、を意味している。**

3. **`i64::from(params.initial_margin_bps)` が u32 → i64 を widen する。** フィールドは `u32`（メモリ節約。bps 値は ~40 億まで十分な範囲だ）。Ratio は `i64`（`margin_ratio` の signed 除算によって型がそうなっている）。Rust では異なる integer 型同士の比較はコンパイルエラーになる。境界で widening しておけば、本体の比較はクリーンに保てる。**Params ごとに 1 回キャストする。カスケード本体は純粋な i64 < i64 として読める。**

4. **Flat ポジション用の special case がない。** `margin_ratio` は flat アカウントに対して `MarginRatio(i64::MAX)` を返す。`i64::MAX` は妥当な `initial_margin_bps` のどれよりも遥かに大きいので、カスケードはそのまま `Safe` まで fall through する。**Flat-as-Safe の性質は `margin_ratio` の flat-position ガードに既に反映されている。`margin_health` はそれを知らなくてよい。** これは **関数の合成 (function composition) によって、上流が確立した不変量を下流が自然に継承する** という設計の実例だ — `margin_ratio` 側で「flat なら i64::MAX」を 1 箇所だけ決めれば、それを呼ぶすべての下流関数 (この `margin_health` も、L7 の `close_order_spec` も) が「flat = 必ず Safe に着地する」を**追加コードゼロで**手にする。「関数内で何でもフラグ分岐を足す」癖を持つ開発者は、ここでパラダイムを切り替える価値がある: **不変量の責務を 1 箇所に閉じ込め、下流は信頼するだけ**。Flat-position セマンティクスを将来微調整したくなったとき、変更は *1 箇所*（`margin_ratio`）で済む — 2 つの同期した分岐を抱えずに済む。

5. **関数は `&LiquidationParams` を受け取る。値の `LiquidationParams` ではない。** `LiquidationParams` は `Copy`（12 byte）だが、参照シグネチャは「これは読むだけで consume しない」と読み手にシグナルする。Bridge は同じ `params` を、スキャン中のすべての `margin_health` 呼び出しに渡す。参照渡しなら、呼び出しごとの（技術的には無償の）move を避けられる。

> 🛑 **やりがちな勘違い。** 「3 つの `if` 分岐ではなく `match (ratio.0, maintenance_bps, initial_bps) { ... }` ではダメか?」 **条件は不等式であって、パターンマッチではないからだ。** Match パターンは値の structural な相等性のためのもので、range check のためではない。Guard 句（`x if x < 0 => ...`）付きの match に書き換えると、可読性を失うだけで得るものがない — 明示的なカスケードは、決定をそう考える通りにそのまま読める。

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

押さえておく点が 4 つ:

1. **各テストが、結果の `MarginHealth` を生む算術をコメントで名指ししている。** "*Ratio 1_500 bps (= 15%)*" のように書くと、読者（および失敗を読み返す将来の自分）にどの range を突いているかが正確に伝わる。コメントは正しいのにセットアップだけ間違っているテストは、assertion だけのテストより、ずっと気づきやすい。

2. **Variant 用に 4 テスト、境界用に 1 テスト。** 各カスケード分岐が positive テストを 1 つずつ持ち、`health_boundary_at_maintenance` が strict-less-than の慣例を裏付ける。この 5 番目のテストがないと、`<` を `≤` に flip するリファクタリングが他の 4 テストを pass したまま通ってしまい、ちょうどしきい値での挙動を静かに変えてしまう — そして本番ポジションの最も一般的な margin level は、ちょうどその辺りに集まる（アカウントは maintenance に *到達してから* 下回るからだ）。

3. **`health_boundary_at_maintenance` は `hyperliquid_default()` ではなく、独自に params を組み立てる。** Hyperliquid default は `liquidation_fee_bps = 150` を持つが、このテストには無関係だ。明示的に struct を構築することで、「このテストが *実際に* どのフィールドに依存するか」が文書化される。他のテストは fee フィールドが load-bearing でないので default を使う。

4. **`MarginHealth::Underwater` は L5 の underwater ケース**（薄い collateral の long ポジションに対する `mark = 50`）で exercise する。L5 の `ratio_can_be_negative` と同じセットアップだ — 負の ratio テストが数学を保証し、variant テストが分類を保証する、という形になる。

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

新規 1 名 — `margin_health` — を、アルファベット順で `account_equity` と `margin_ratio` の間に挿入する。リストが ~5 項目を超えたあたりで、ここの行が wrap し始める。

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

エラー時にありがちなパターン:

- **`health_boundary_at_maintenance` が `AtRisk` の代わりに `Liquidatable` で失敗。** カスケード内のどこかで `<` を `≤` と書いてしまっている。境界テストはまさにこれを捕まえるために存在する。
- **`health_underwater` が `Liquidatable` で失敗。** `Underwater` の check を `Liquidatable` の check より *後* に置いてしまっている。並び替える — 最も極端な state を最初に。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **カスケード順: 最も極端な state を最初に check する。** `Underwater` → `Liquidatable` → `AtRisk` → `Safe`。Narrowing の方向に並んでいるので、各分岐の条件は前の分岐が捕まえたものを必ず排除している。順序を逆にすると、深刻なケースが静かに緩いケースの分岐を通り抜けてしまう。**カスケードの条件が重なり合うときは、厳しいものから緩いものへ sort する。**

2. **しきい値での strict-less-than: 境界線はより良い state に属する。** Maintenance ちょうどのアカウントは `AtRisk` であって `Liquidatable` ではない。これは慣例の選択 — 本番の取引所では別の慣例を採るところもある — だが、システム *内* で一貫していることのほうが、しきい値がどちら側に属するかより重要だ。**慣例を選び、doc で名指しし、境界テストで強制する。**

3. **`margin_health` 内に flat ポジションの special case を置かない。** `margin_ratio`（flat に対して `i64::MAX` を返す）との composition のおかげで、その性質が無料で落ちてくる。`if snapshot.position_size.0 == 0 { return Safe; }` を追加してしまうと、flat-position の挙動を 2 箇所に複製することになり、片方が変わった瞬間にずれが生まれる。**不変量は 1 箇所で表現し、下流の関数が composition でそれを継承するに任せる。**

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

**Q1: なぜ misconfigured な params（maintenance ≥ initial）のケースに備えて `Result<MarginHealth, ...>` を返さないのか?**

関数は total（全域関数）だ — どんな入力にも、定義された出力が対応する。Misconfigured な params（maintenance == initial、あるいは maintenance > initial）でも、すべてのアカウントは 4 variant のどれかに分類される。意味的に間違った結果ではあるが、定義された結果ではある。`Result` を返してしまうと、*params を妥当に組み立てる bridge からは決して起きない* `MisconfiguredParams` エラーを、すべての呼び出しサイトに処理させる。**Total function は圧倒的に compose しやすい。パラメータの妥当性はシステムへの入力境界 (ロード時 / config パース時) で検証を完了させ、下流のドメイン計算層 (`margin_health` などの分類器) では不変量が維持されているものとして 100% 信頼する** — これは "Parse, don't validate" として知られる規律で、検証ロジックを境界に集中させ、ドメイン層を total function で構成する設計パターンだ。

**Q2: `margin_health` を sorted thresholds 配列と binary search で、もっと「データ駆動」にできないか?**

4 状態しかないなら、明示的なカスケードのほうがクリアで速い。Binary search が勝つのは threshold の数が ~10 を超えたあたりからだ — その時点でリファクタリングすればよい。先取りの一般化は、エンジンが必要としない仕組みを足してしまう。**今もっている cardinality に最適化する。いつか持つかもしれない cardinality に最適化しない。**

**Q3: `maintenance_bps > initial_bps`（misconfigured）のとき、何が起きるか?**

カスケードは依然として定義された分類を生む。`ratio >= maintenance_bps` の領域では、次の分岐 `ratio < initial_bps` が false になり（maintenance > initial なら ratio も ≥ initial だ）、そのまま `Safe` に fall through する。`ratio ∈ [0, maintenance_bps)` の領域は `Liquidatable` に着地する。結果として AtRisk が到達不能になる。**Misconfigured params は一貫性はあるが意図しない分類スキームを生む。Validation は param 構築側の責任で、分類器の責任ではない。**

**Q4: なぜ `margin_health` は params の i64 変換をキャッシュしないのか?**

呼び出し側は通常、block ごとのスイープで `margin_health` をアカウント 1 件あたり 1 回しか呼ばない。Bridge は同じ `&LiquidationParams` をすべての呼び出しに渡す。2 つの `i64::from(u32)` キャストはゼロコスト — コンパイラはせいぜい `mov` 命令を 1 つ emit するだけだ。**コストを測ってからキャッシュする。反射でキャッシュに手を伸ばさない。**

**Q5: カスケードを `match` の range pattern（`0..maintenance_bps => Liquidatable`）で書けるか?**

Rust の `match` は exclusive-range pattern をサポートする（1.26 から）ので、構文的にはイエス。だがパターンは `i64::MIN..0`、`0..maintenance_bps`、`maintenance_bps..initial_bps`、`initial_bps..=i64::MAX` になる。*名前付き* の境界（リテラルではなく変数）を参照する必要があるので、各パターンに結局 guard 句が必要だ。If/else カスケードのほうがここではクリーンに読める。**Structural なケースには `match`、同じ値に対する不等式カスケードには `if/else`。**

## 次のレッスン (L7)

L7 では `close_order_spec` で Stage 10a を閉じる — snapshot を bridge が consume する `CloseOrderSpec` に変換する関数だ。Unit test は 3 つ: long-closes-with-Sell、short-closes-with-Buy、flat-position エッジケース（qty = 0）。L6 より短い — L7 の時点で compute モジュール全体は背後に揃っていて、レッスンの大半は L4 の `unsigned_abs` 規律と、エンジンの外向きインターフェースとの間を橋渡しすることに費やされる。

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
