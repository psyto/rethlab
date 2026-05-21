# Building OpenHL Liquidation — L1 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) に対するドラフト。

## L1 — `openhl-liquidation-margin-scale-ja`

**Stage**: Stage 10a — `22eedf9`

**Title**: レッスン 1 — `MARGIN_SCALE` + `LiquidationParams` — リスクエンジンのダイヤル

**Duration**: 30 分 · **XP**: 60

---

````markdown
# レッスン 1 — `MARGIN_SCALE` + `LiquidationParams` — リスクエンジンのダイヤル

## ゴール

このレッスンで掴む概念:

- **margin の固定小数点単位として basis points が正しい理由。** bps は 4 decimal digits の精度を与える — それはちょうど、実際の取引所（HL、Binance、Drift）が margin 要件を表現するときの解像度だ。`RATE_SCALE` と同じ i64-saturating の規律で、違うのはスケールだけ。
- **margin と rate に異なる scale が必要な理由。** Funding rate は 1 区間で notional の `0.0001` から `0.04` までを動かすので parts-per-billion が必要だった。一方 margin 要件は notional の `0.02` から `0.10` を動かす。マグニチュードの差が 2 桁あれば、スケールも 2 桁ずらす。
- **`LiquidationParams` はユーザー状態ではなく、ネットワーク状態である。** 10% / 2% / 1.5% のデフォルトは *consensus パラメータ*であり、ネットワーク genesis 時に 1 回だけ設定され、governance を経なければ変更されない。構造体としてまとめる狙いは、`compute.rs` に magic constant を散らすかわりに、パラメータを first-class かつ明示的な存在に格上げすることにある。
- **`hyperliquid_default()` という const constructor。** `const fn` なので、デフォルト値は `static` コンテキスト、テスト fixture、コンパイル時 assertion でも素直に使える。**`#[must_use]` を添えて、構築したまま捨てる事故を禁じる。**

確認:

```bash
cargo build -p openhl-liquidation
```

…がコンパイルされる。

具体的な変更:

- **Cargo.toml** に `openhl-clob` と `openhl-funding` の依存を追加する（`AccountId`、`Side`、`Qty` は clob から、`MarkPrice`、`PositionSize`、`Notional` は funding から借りる — いずれも production の型シグネチャに乗る型で、test 専用ではない）。
- **`src/types.rs`** を新規作成。モジュール docs、`MARGIN_SCALE` 定数、`LiquidationParams` 構造体、デフォルトと accessor を載せた impl ブロックを置く。
- **`src/lib.rs`** を空のままから書き起こす。クレート docs、`pub mod types;`、そして `MARGIN_SCALE` と `LiquidationParams` をクレートルートに re-export する行を加える。

L1 にテストはない。`MARGIN_SCALE` は値、`LiquidationParams` は受動的な構造体だからだ。L2 で初めて挙動を持つ型（`MarginHealth` enum）が登場し、最初の unit test もそこで生まれる。

## おさらい

L0 の後:
- perp DEX が liquidation をオフチェーンではなく consensus 内で実行する理由を理解している。
- float が chain-fork hazard になる理由を理解している（funding と同じ論理）。
- Liquidation クレートのスキャフォールド（Cargo.toml + 空の `src/lib.rs`）は Stage 10a 前から workspace に置かれている — funding crate のときと同じ流儀だ。

L1 では、この空の crate を、公開された scale 定数 1 つと、エンジン全体を支配するパラメータを持つ実体ある crate に育てていく。

## 計画

編集は 3 つ。Funding L1 と同じ形だが、依存が 1 つではなく 2 つになる:

1. **`crates/liquidation/Cargo.toml`** — `[dependencies]` に `openhl-clob = { path = "../clob" }` と `openhl-funding = { path = "../funding" }` を追加する。L5 / L6 で使う `proptest` を含めた `[dev-dependencies]` ブロックも併せて足す。
2. **`crates/liquidation/src/types.rs` を作成。** bps の根拠を説明するモジュール docs、`MARGIN_SCALE` 定数、`LiquidationParams` 構造体、impl ブロックを置く。
3. **`crates/liquidation/src/lib.rs`** を空のままから書き起こし、クレート docs、`pub mod types;`、`pub use types::{LiquidationParams, MARGIN_SCALE};` を加える。

> 🛑 **予測。** スクロール前に: funding は `RATE_SCALE = 1_000_000_000`（parts-per-billion、9 decimal digits の精度）を使う。それなのに liquidation は `MARGIN_SCALE = 10_000`（basis points、4 decimal digits）にする — なぜか? ヒント: 表現すべきマグニチュードを思い出す。funding rate は 1 区間で `0.0001` から `0.04`、margin 要件は notional の `0.02` から `0.10`。

（答え: **必要な解像度は、意味のある最小ステップに従って決める。** 1 区間 `0.0001%` の funding rate は高ボリュームトレーダーにとって意味のある差だから、ppb が正しい解像度になる。一方で maintenance margin が `0.02%` か `0.05%` かは engine 層で意味のある差には **ならない** — 本番のデプロイは bps の整数（`200 bps`、`500 bps`）で maintenance を設定する。Bps は慣例単位だ。ppb を採用してしまうと、システムが実際には使わない精度を買い込むことになる。**実際のレンジをカバーする最小のスケールを選ぶ。**）

## 手を動かす walk-through

### Step 1: Cargo.toml を更新

`crates/liquidation/Cargo.toml` を開く。現状:

```toml
[package]
name         = "openhl-liquidation"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]

[lints]
workspace = true
```

次のように更新:

```toml
[package]
name         = "openhl-liquidation"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]
openhl-clob    = { path = "../clob" }
openhl-funding = { path = "../funding" }

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
```

3 つの変更:

1. **`openhl-clob = { path = "../clob" }`** — `AccountId`、`Side`、`Qty` を取り込むため。bridge レイヤーは liquidation order でこれらを再利用するし、`AccountSnapshot` は `AccountId` を持ち回る。
2. **`openhl-funding = { path = "../funding" }`** — `MarkPrice`、`PositionSize`、`Notional` を取り込むため。これらは funding と liquidation の接点に立つ型で、両方の crate が同じ通貨で会話するための語彙だ。
3. **`[dev-dependencies]` ブロック** に `proptest` を入れる。L5（margin-ratio の単調性テスト）と L6（margin-health の determinism テスト）で使うので、宣言だけ先に済ませておく。

> 🛑 **やりがちな勘違い。** 「L5 / L6 で使うならテスト用、両方 dev-dep でよいのでは?」 **そうではない。production コードのほうも `MarkPrice` や `AccountId` を `compute.rs` の関数シグネチャで使う — テスト専用ではない。** Funding でも L1 で同じ判断をした。ルールは単純で、`pub fn` シグネチャに現れる型は dev-only ではなく通常の dep に置く必要がある。

### Step 2: `src/types.rs` を作成

`crates/liquidation/src/types.rs` を作る。このファイルはまだ存在しないので、このレッスンで新規作成する。初期内容は以下:

```rust
//! Core types for the liquidation engine.
//!
//! Pure data — no I/O, no allocation. Every type is `Copy`-friendly so the
//! engine can be invoked on snapshots taken at the bridge layer without
//! lifetime gymnastics. The convention follows `openhl-funding`: the
//! liquidation crate never owns mutable state in Stage 10a; it computes
//! over snapshots that the caller assembled.
//!
//! ### Why fixed-point integers, not floats
//!
//! Same answer as `openhl-funding`: consensus determinism. Every validator
//! must reach the same `MarginHealth` from the same inputs, and float
//! arithmetic varies bit-for-bit across compilers and CPUs. We use signed
//! integers scaled by [`MARGIN_SCALE`] (basis points, 10⁴) for margin
//! ratios.

/// Scale factor for `MarginRatio` — basis points (1 bp = 0.01%).
///
/// A raw value of `MARGIN_SCALE` represents `100%`; `MARGIN_SCALE / 10`
/// (= 1_000) represents `10%`. Bps is the conventional unit for margin
/// in TradFi and in crypto perp venues (Hyperliquid, Binance, Drift all
/// express margin requirements in bps).
pub const MARGIN_SCALE: i64 = 10_000;

/// Network parameters governing the margin model.
///
/// Bps convention: `initial_margin_bps = 1000` means a 10% initial margin
/// requirement. Maintenance must be ≤ initial; if a misconfigured network
/// sets them equal, every position at exactly that threshold classifies as
/// `Liquidatable` (the conservative default).
///
/// `liquidation_fee_bps` is charged on the notional being closed, paid
/// out of the account's collateral, and credited to the insurance fund
/// (Stage 10b). A typical HL-style value is 1–2% (100–200 bps).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LiquidationParams {
    /// Initial margin requirement in bps (e.g., 1000 = 10%).
    pub initial_margin_bps: u32,
    /// Maintenance margin requirement in bps (e.g., 200 = 2%).
    pub maintenance_margin_bps: u32,
    /// Liquidation fee in bps, charged on closed notional.
    pub liquidation_fee_bps: u32,
}

impl LiquidationParams {
    /// Hyperliquid-style defaults: 10% initial, 2% maintenance, 1.5% fee.
    /// Real production deployments use tiered maintenance (higher margin
    /// for larger position sizes) — out of scope for Stage 10a.
    #[must_use]
    pub const fn hyperliquid_default() -> Self {
        Self {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: 150,
        }
    }

    #[must_use]
    pub const fn initial_margin_bps(&self) -> u32 {
        self.initial_margin_bps
    }

    #[must_use]
    pub const fn maintenance_margin_bps(&self) -> u32 {
        self.maintenance_margin_bps
    }

    #[must_use]
    pub const fn liquidation_fee_bps(&self) -> u32 {
        self.liquidation_fee_bps
    }
}
```

このファイルで気づきたい点が 5 つある:

1. **`MARGIN_SCALE: i64 = 10_000`。** `u32` でも `i32` でもなく `i64` にしている。スケールの値自体は i32 に収まるのだが、margin ratio を出す乗算はすべて i128 中間値を経由してから i64 に saturate して戻ってくる。最初から `MARGIN_SCALE` を i64 にしておけば、各演算サイトで `as i64` キャストを散らかさずに済む。

2. **`LiquidationParams` に `#[derive(Clone, Copy, Debug, PartialEq, Eq)]`。** 3 フィールドはすべて `u32`、構造体サイズは 12 byte、自明に `Copy` に乗る。Engine は `LiquidationParams` を `margin_health` へ参照渡し（`&LiquidationParams`）するのが基本だが、型が `Copy` なので呼び出し側が誤って値渡ししても borrow checker に怒られない。

3. **`pub` フィールド *かつ* `const fn` ゲッター。** フィールドを public にしたのは `MarkPrice.0` と同じ理由で、これらは透明な newtype / params にすぎず、カプセル化の境界はない。`const fn` ゲッターが public フィールドと並んでいるのは、定数コンテキスト（例えば `maintenance_bps < initial_bps` のコンパイル時 assertion）で便利になるから。両スタイルが並存していて構わない。

4. **`hyperliquid_default()` を `const fn` にする。** これでデフォルト値を `static` アイテムに乗せられる: `static PARAMS: LiquidationParams = LiquidationParams::hyperliquid_default();` のような書き方が、テスト、fixture、protobuf encoded genesis state への埋め込みなど、あらゆるコンテキストで通る。**`const fn` constructor は、「欲しい値」と「どこでも宣言できる値」を橋渡しする道具だ。**

5. **constructor とゲッターに `#[must_use]`。** `LiquidationParams` を組み立ててから捨てる動作はほぼ間違いなくバグだ — デフォルト値を計算しておいて捨てている。Accessor も同じで、`initial_margin_bps()` を読んだ結果を無視するのはたいてい誤り。`#[must_use]` を付けておけば、コンパイラが読者に「本当にそれでいいのか」と問い返してくれる。

> 🛑 **やりがちな勘違い。** 「3 つの独立した `u32` フィールドではなく、`(u32, u32, u32)` タプルをラップする `LiquidationParams` newtype ではダメか?」 **ダメだ。3 つの値は意味が違う。** タプルの順序は位置依存で壊れやすく、`initial` と `maintenance` を入れ替えるリファクタリングが静かに意味のバグを呼び込む。名前付きフィールドなら、呼び出し側を明示的に書かせられる: `LiquidationParams { initial_margin_bps: 1000, ... }`。**名前は実行時コストがゼロ、位置タプルは実行時利益がゼロ。**

### Step 3: `src/lib.rs` を更新

`crates/liquidation/src/lib.rs` を開く。現状は空のはずだ。中身を次に置き換える:

```rust
//! `openhl-liquidation` — perpetual-position liquidation engine.
//!
//! Pure compute in Stage 10a: no I/O, no async, no networking. Liquidation
//! decisions are deterministic functions over `(account_snapshot, mark,
//! params)`. Every validator on the chain must reach the same
//! [`MarginHealth`] from the same inputs; if two validators classify the
//! same account differently, the chain forks.
//!
//! ### Hyperliquid-shape liquidation, in one paragraph
//!
//! Perpetual contracts are levered positions backed by deposited
//! collateral. As the mark price moves against an open position,
//! unrealized PnL eats into the account's equity. When `equity / notional`
//! drops below the network's maintenance-margin requirement, the engine
//! force-closes the position at market — opposite side, full size, no
//! limit price. The liquidation fee is debited from collateral and
//! credited to the insurance fund. Any residual collateral, after fee
//! and PnL settlement, stays with the account. If equity went negative
//! before the close (the account is "underwater"), the insurance fund
//! absorbs the deficit instead of the position closing solvently.

pub mod types;

pub use types::{LiquidationParams, MARGIN_SCALE};
```

L11 終了時のバージョンと比べて欠けているものは、`pub mod compute`、それから `MarginHealth`、`MarginRatio`、`AccountSnapshot`、`CloseOrderSpec` の `pub use types::{...}` 再エクスポートだ。これらは L2-L7 で型と compute 関数を加える流れで揃ってくる。**L1 の lib.rs はコンパイルが通る最小構成にとどめる。**

クロスリファレンスの `[`MarginHealth`]` は L2 で enum が登場するまで未解決のままだ。Rustdoc は warning を出すが、これは受け入れる（funding L1 と同じ扱い）。

> 🛑 **予測。** 名前を明示した 2-name の再エクスポートではなく、`pub use types::*;` と書いたら何が起きるか? ヒント: L1 後と L7 後の `types.rs` にどんな型が住むか、そしてどの API surface に commit したいのかを考える。

（答え: **`pub use types::*` は将来 `types.rs` に住むものを丸ごと、つまり誤って `pub` を付けた helper や private support 型まで含めて再エクスポートしてしまう。** 一方、明示的に `pub use types::{LiquidationParams, MARGIN_SCALE}` と書けば、クレートの public surface は意図的な決定の集合になる。`types.rs` に public 型を増やすたびに lib.rs の re-export 行を直す必要が生じ、「これは本当に public API の一部か?」と立ち止まる瞬間が強制的に生まれる。Glob re-export は保守の落とし穴で、将来 `pub(crate)` の代わりに `pub` で helper を生やすと、本人の知らない間に public API の一部になっている。**明示的 re-export は public API surface のチェックリストとして働く。**）

### Step 4: コンパイル

```bash
cargo build -p openhl-liquidation
```

期待される出力:

```
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
warning: unresolved link to `MarginHealth`
    Finished `dev` profile [unoptimized + debuginfo] in 0.4s
```

`MarginHealth` への未解決リンクが残るので rustdoc warning が 1 つ出る（L2 で型が追加されれば消える）。**ここで抑制しないこと。** 何が欠けているかを build が教えてくれている合図だ。

エラーが出た場合に多い原因:

- **`error[E0463]: can't find crate for 'openhl_clob'` または `'openhl_funding'`** — Cargo.toml の `path = "..."` 依存を片方入れ忘れている。L1 のコード本体ではまだ使っていないが、L3 の import を先取りして書いていると発火する。
- **`error[E0583]: file not found for module 'compute'`** — lib.rs に `pub mod compute;` を先取りして書いてしまった。削除すれば直る。L4 で改めて戻ってくる。
- **`error: failed to parse manifest`** — Cargo.toml の syntax エラー。よくあるのは `[dev-dependences]` のような typo。

## 設計の振り返り

このレッスンの load-bearing な決定は 3 つ:

1. **`MARGIN_SCALE = 10_000` にする。`1_000_000_000` ではない。** Funding の `RATE_SCALE` より 2 桁細かくしてもズレるだけだ — 本番の margin パラメータが ppb で設定されることはない。逆に 2 桁粗くする（`100`、percent）と意味のある解像度を失う。**Bps は margin に対して世界が落ち着いた単位だ。我々もそれに合わせる。**

2. **Default constructor は `const fn` で書き、`Default` impl は使わない。** 両方とも正しくない理由を整理しよう。`Default::default()` は多くの型で「妥当な zero っぽい」デフォルトを返すが、`LiquidationParams::default()` が「margin ゼロ、fee ゼロ」を示唆するのは **危険** だ — その値で動かしたネットワークでは liquidation がそもそも起きない。**`hyperliquid_default()` は名前付きで意図的なデフォルトとして立てる。** 呼び出し側に名前で要求させることで、安全性に関わる性質を視界に残し続けられる。

3. **3 つの独立した `u32` フィールドにする。ネスト型 `LiquidationConfig` 構造体は作らない。** 将来 tiered maintenance margin（HL 流の「大きな position には高い maintenance %」）に移行する局面では `Vec<MaintenanceTier>` フィールドが欲しくなるかもしれない。だが今は加えない — 先取りした一般化になってしまう。**Stage 10a は flat margin で進める。Stage 10c+ で tiered が必要になったら、そのときに再検討する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/Cargo.toml ./crates/liquidation/Cargo.toml
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L1 の後:
- **Cargo.toml** は Stage 10a と完全一致する。
- **types.rs** は Stage 10a の types.rs の *最初の ~50 行* と一致する。モジュール doc、`MARGIN_SCALE`、`LiquidationParams`、impl までだ。残り（`MarginRatio`、`MarginHealth`、`AccountSnapshot`、`CloseOrderSpec`）は L2 / L3 で追加する。
- **lib.rs** は Stage 10a の lib.rs の *最初の ~25 行* と一致する。クレート doc、`pub mod types;`、2 つの再エクスポートまで。残りの再エクスポートはそれぞれの型を加えるタイミングで揃えていく。

## よくある質問

**Q1: `MARGIN_SCALE` をクレート doc と一緒に `lib.rs` に置かないのはなぜ?**

スケールする対象の型システムと同じ場所に置くのが筋だからだ。`types.rs` は unit-of-account（margin ratio、bps、分類しきい値）に関するものがすべて住む場所。lib.rs は public-API surface だ。`MARGIN_SCALE` を types.rs に置いてクレートルートに re-export するほうが、source of truth を分散させるよりクリーンになる。

**Q2: `LiquidationParams` の constructor で `maintenance ≤ initial` を検証すべきか?**

Stage 10a では検証しない。構造体は任意の組み合わせを受け入れる。Stage 10c で `validated()` constructor を別途追加し、genesis を読み込む側のコードから呼ばれたときに `Result<Self, ParamsError>` を返す形にする。検証なしの素の constructor は、test や proptest generator が *病的な* 入力を食わせたい場合のためにそのまま残す。

**Q3: なぜ `hyperliquid_default()` が 10% / 2% / 1.5% で、他の値ではないのか?**

HL の実際の maintenance margin tier は position size に応じて 1.25% から 6.67% の範囲に分布する。代表的な中間値として 2% を選んだ。Initial が maintenance の 10 倍というのもよく見る配分だ。Fee の 1.5% は ETH/BTC の公開 HL 値で、軽い資産ではもっと低くなる。**どの数字も特権ではない。あなたのネットワークが自分で設定すればよい。**

**Q4: Margin ratio の計算で実際の i64 overflow リスクは?**

`margin_ratio = equity * MARGIN_SCALE / notional`。`MARGIN_SCALE = 10_000` のもと、`equity` と `notional` が `i64::MAX` で bound されているとすると、積 `equity * MARGIN_SCALE` は `equity > i64::MAX / 10_000 ≈ 9.2e14` で i64 を overflow しうる。現実的な取引所スケールに直すと 920 兆ドルの equity だ — 妥当な入力からははるか上にある。ただし L5 では依然として乗算を `i128` で行い、i64 に saturate して戻す。**反射神経としては funding と同じ — i64 を超えうる積は、敵対的な入力では必ず超える。**

**Q5: `MARGIN_SCALE` と bps に `u32` を使って、i64 への変換ノイズを避けられないか?**

避けられる。`i64::from(...)` の呼び出しが数回減るのも事実だ。代償として、あらゆる margin-ratio 計算が `equity`（signed）と `notional`（unsigned）を含むので、演算で signed と unsigned を混ぜるたびに各サイトで明示的キャストが必要になる。境界で 1 回 i64 にアップキャスト（`i64::from(params.initial_margin_bps)`）してしまい、その後の演算は signed で通すほうが綺麗だ。**境界で変換し、計算は 1 つの型で揃える。**

## 次のレッスン (L2)

L2 では `MarginRatio` newtype と `MarginHealth` enum を追加する。`MarginHealth` は load-bearing な分類型で、これ以降の 5 レッスンはどれもこの型を return するか consume するかのいずれかだ。`bool` でも `u8` でもなく 4-variant enum を選んだ理由を見ていく。

````

---

## Seed-file slot

L1 は Module 1 の sortOrder 0 に入る:

```typescript
{
  title: 'レッスン 1 — MARGIN_SCALE + LiquidationParams — リスクエンジンのダイヤル',
  slug: 'openhl-liquidation-margin-scale-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 1 — MARGIN_SCALE + LiquidationParams — リスクエンジンのダイヤル\n\n...`
},
```

## SHA pinning discipline

L1 は `22eedf9`（Stage 10a）を引用する。答え合わせの Cargo.toml diff と types.rs diff はどちらもこの SHA と比較する。

## 翻訳セルフレビュー（paste 前）

- **「なぜ bps か、ppb ではないか」予測コールアウト** は L1 の教育的な背骨。これがないと読者は `MARGIN_SCALE = 10_000` を信仰で受け入れる。あると、なぜそのスケールが選ばれたかを理解し、「実際のレンジをカバーする最小のスケールを使う」原則が将来書く任意の固定小数点 crate の L1 に一般化される。
- **`hyperliquid_default()` の議論** は funding L1 の `RATE_SCALE` 議論より長い。`LiquidationParams` は 3 つのダイヤルがあり、それぞれが意味を持ち、safety 含意もある構造体だから。Funding の `RATE_SCALE` は 1 つの数字だった。ここではデフォルト値そのものの正当性も示す必要がある。
- **§設計の振り返り の `Default::default()` vs 名前付きデフォルト議論** はレッスンで最も主張の強い部分。Rust の慣用句のうちには `Default` を奨励するものもある。安全性が重要な params に対しては、名前付きデフォルトのほうがよい規律。読者の最初の本能は `Default` を derive することなので、ここで表面化する価値がある。
- **よくある質問 Q5** は Hiro がレビューで実際に受けるコメントを扱う:「なぜ `i64::from` 呼び出しがこんなに多い?」 PR で議論にならないよう、ここで先回りする。
