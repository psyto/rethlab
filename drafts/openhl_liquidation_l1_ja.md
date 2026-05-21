# Building OpenHL Liquidation — L1 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) に対するドラフト。

````markdown
## L1 — `openhl-liquidation-margin-scale-ja`

**Stage**: Stage 10a — `22eedf9`

**Title**: レッスン 1 — `MARGIN_SCALE` + `LiquidationParams` — リスクエンジンのダイヤル

**Duration**: 30 分 · **XP**: 60

---

# レッスン 1 — `MARGIN_SCALE` + `LiquidationParams` — リスクエンジンのダイヤル

## ゴール

このレッスンで掴む概念:

- **なぜ margin の固定小数点単位として basis points が正しいか** — bps は 4 decimal digits の精度を与え、それは実際の取引所（HL、Binance、Drift）が margin 要件を表現する解像度そのもの。`RATE_SCALE` と同じ i64-saturating の規律、スケールだけが異なる。
- **なぜ margin と rate は異なる scale を必要とするか** — Funding rate は 1 区間で notional の `0.0001` から `0.04` を動かすので parts-per-billion が必要。Margin 要件は notional の `0.02` から `0.10` を動かす。2 桁の違い → スケールも 2 桁の違い。
- **`LiquidationParams` はユーザー状態ではなくネットワーク状態** — 10% / 2% / 1.5% のデフォルトは *consensus パラメータ*であり、ネットワーク genesis 時に 1 回だけ設定され、governance によってのみ変更される。構造体の役割は、`compute.rs` に散らばる magic constant ではなく、パラメータを first-class かつ明示的にすること。
- **`hyperliquid_default()` という const constructor** — `const fn` なのでデフォルト値は `static` コンテキスト、test fixture、コンパイル時 assertion でも使える。**`#[must_use]` で構築後の暗黙の破棄を禁じる。**

確認:

```bash
cargo build -p openhl-liquidation
```

…がコンパイルされる。

具体的な変更:

- **Cargo.toml** に `openhl-clob` と `openhl-funding` の依存を追加（`AccountId`、`Side`、`Qty` は clob から、`MarkPrice`、`PositionSize`、`Notional` は funding から — どちらも production の型シグネチャの一部であって test 専用ではない）。
- **`src/types.rs`** — 新規作成、モジュール docs + `MARGIN_SCALE` 定数 + `LiquidationParams` 構造体 + impl ブロック（デフォルトと accessor）。
- **`src/lib.rs`** — 空だったものに、クレート docs + `pub mod types;` + `MARGIN_SCALE` と `LiquidationParams` のクレートルートからの re-export を追加。

L1 にテストはない — `MARGIN_SCALE` は値であり、`LiquidationParams` は受動的な構造体だ。L2 の最初の挙動を持つ型（`MarginHealth` enum）が最初の unit test を稼ぐ。

## おさらい

L0 の後:
- perp DEX がなぜ liquidation をオフチェーンではなく consensus 内で実行するかを理解している。
- なぜ float が chain-fork hazard かを理解している（funding と同じ）。
- Liquidation クレートのスキャフォールド（Cargo.toml + 空の `src/lib.rs`）は Stage 10a 前から workspace にある — funding crate がそうだったのと同じ。

L1 では、この空の crate を、1 つの publicly-visible な scale + エンジン全体を支配するパラメータを持つ real な crate に変える。

## 計画

3 つの編集。Funding L1 と同じ形状だが依存が 1 つではなく 2 つ:

1. **`crates/liquidation/Cargo.toml`** — `[dependencies]` に `openhl-clob = { path = "../clob" }` と `openhl-funding = { path = "../funding" }` を追加。L5 / L6 で使う `proptest` を入れた `[dev-dependencies]` ブロックも追加。
2. **`crates/liquidation/src/types.rs` を作成** — bps の根拠を説明するモジュール docs + `MARGIN_SCALE` 定数 + `LiquidationParams` 構造体 + impl ブロック。
3. **`crates/liquidation/src/lib.rs`** — 空だったものに、クレート docs + `pub mod types;` + `pub use types::{LiquidationParams, MARGIN_SCALE};`。

> 🛑 **予測。** スクロール前に: funding は `RATE_SCALE = 1_000_000_000`（parts-per-billion、9 decimal digits の精度）を使う。なぜ liquidation は `MARGIN_SCALE = 10_000`（basis points、4 decimal digits）を使うのか? ヒント: 表現すべきマグニチュードを考える — funding rate は 1 区間で `0.0001` から `0.04`、margin 要件は notional の `0.02` から `0.10`。

（答え: **必要な解像度は意味のある最小ステップに従う。** 1 区間 `0.0001%` の funding rate は高ボリュームトレーダーにとって意味のある差 — ppb が正しい解像度。Maintenance margin が `0.02%` か `0.05%` かは engine 層では意味のある差では **ない** — 本番のデプロイは bps の整数（`200 bps`、`500 bps`）で maintenance を設定する。Bps は慣例単位。ppb を使えば、システムが実際に使えない精度を買うことになる。**実際のレンジをカバーする最小のスケールを使う。**）

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

1. **`openhl-clob = { path = "../clob" }`** — `AccountId`、`Side`、`Qty` のため（bridge レイヤーが liquidation order でこれらを再利用し、`AccountSnapshot` が `AccountId` を運ぶ）。
2. **`openhl-funding = { path = "../funding" }`** — `MarkPrice`、`PositionSize`、`Notional` のため。これらの型は funding と liquidation の接点 — どちらの crate も同じ通貨を喋る。
3. **`[dev-dependencies]` ブロック** に `proptest`。L5（margin-ratio の単調性テスト）と L6（margin-health の determinism テスト）で使う。いま宣言、あとで使用。

> 🛑 **やりがちな勘違い。** 「L5 / L6 がテストなんだから、両方とも dev-dep にすればよいのでは?」 **production コードが `MarkPrice`、`AccountId` を `compute.rs` の関数シグネチャで使う、テストだけではない。** Funding も L1 で同じ判断をした。ルール: 任意の `pub fn` シグネチャに現れる型は dev-only ではなく通常の dep でなければならない。

### Step 2: `src/types.rs` を作成

`crates/liquidation/src/types.rs` を作成。このファイルはまだ存在しない — このレッスンで新規作成。初期内容:

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

このファイルで気づくべき 5 点:

1. **`MARGIN_SCALE: i64 = 10_000`** — `u32` でも `i32` でもなく `i64`。スケールそのものは i32 に収まるが、margin ratio を出す乗算はすべて i128 中間値を経由して i64 に saturate して戻る — `MARGIN_SCALE` を i64 にしておけば、各演算サイトで余計な `as i64` キャストが発生しない。

2. **`#[derive(Clone, Copy, Debug, PartialEq, Eq)]` を `LiquidationParams` に。** 3 フィールドはすべて `u32`、構造体は 12 byte、自明に `Copy`。Engine は `LiquidationParams` を参照渡し（`&LiquidationParams`）で `margin_health` に渡すが、型が `Copy` なので呼び出し側が誤って値渡ししても怒られない。

3. **`pub` フィールド *かつ* `const fn` ゲッター。** フィールドが public なのは `MarkPrice.0` と同じ理由 — これらは透明な newtype / params で、カプセル化の境界ではない。`const fn` ゲッターが public フィールドと並存するのは、定数コンテキスト（例: `maintenance_bps < initial_bps` のコンパイル時 assertion）で有用だから。両スタイル、両方 OK。

4. **`hyperliquid_default()` は `const fn`。** これによりデフォルト値は `static` アイテムに乗せられる: `static PARAMS: LiquidationParams = LiquidationParams::hyperliquid_default();` が任意のコンテキスト（テスト、fixture、protobuf encoded genesis state への埋め込み等）で機能する。**`const fn` constructor は「欲しい値」と「どこでも宣言できる値」を橋渡しする。**

5. **`#[must_use]` を constructor とゲッターに。** 構築されてから破棄される `LiquidationParams` はほぼ確実にバグ — デフォルト値を計算しておいて捨てている。Accessor も同じ論理: `initial_margin_bps()` を読んで結果を無視するのはほぼ常に間違い。`#[must_use]` がコンパイラに読者へ確認を求めさせる。

> 🛑 **やりがちな勘違い。** 「3 つの独立した `u32` フィールドではなく、`(u32, u32, u32)` タプルをラップする `LiquidationParams` newtype ではダメか?」 **3 つの値は意味が違う。** タプルの順序は位置依存で壊れやすい — `initial` と `maintenance` を入れ替えるリファクタリングが静かに意味のバグを生む。名前付きフィールドは呼び出し側を明示的にさせる: `LiquidationParams { initial_margin_bps: 1000, ... }`。**名前は実行時コストがゼロ、位置タプルは実行時利益がゼロ。**

### Step 3: `src/lib.rs` を更新

`crates/liquidation/src/lib.rs` を開く。現状空。次に置き換え:

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

L11 終了時バージョンと比較して欠けているもの: `pub mod compute`、`MarginHealth`、`MarginRatio`、`AccountSnapshot`、`CloseOrderSpec` の `pub use types::{...}` re-export。これらは L2-L7 で型と compute 関数を追加するときに来る。**L1 の lib.rs はコンパイルが通る最小限。**

クロスリファレンスの `[`MarginHealth`]` は L2 で enum が追加されるまで壊れている。Rustdoc は warning を吐くが許容する（funding L1 と同じ扱い）。

> 🛑 **予測。** 明示的な 2-name 再エクスポートではなく `pub use types::*;` を書いたら何が起きるか? ヒント: L1 後と L7 後で `types.rs` にどんな型が存在するか、どの API surface に commit しようとしているかを考える。

（答え: **`pub use types::*` は将来 `types.rs` に住むすべて、誤って `pub` を付けた helper や private support type まで再エクスポートしてしまう。** 明示的 `pub use types::{LiquidationParams, MARGIN_SCALE}` はクレートの public surface を意図的な決定にする — `types.rs` に public 型を追加するたびに lib.rs の re-export にも追加することになり、「これは public API の一部か?」という瞬間を強制する。Glob re-export は保守のハザード: 将来 `pub(crate)` の代わりに `pub` で helper を追加すると、知らない間に public API の一部になる。**明示的 re-export は public API surface のチェックリスト。**）

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

`MarginHealth` への未解決リンクの rustdoc warning が 1 つ（L2 で追加される）。**抑制しないこと** — まだ何が欠けているかを build が教えてくれている。

エラーが出た場合に多い原因:

- **`error[E0463]: can't find crate for 'openhl_clob'` または `'openhl_funding'`** — Cargo.toml のどちらかの `path = "..."` dep を入れ忘れた。L1 のコードはまだ使っていないが、L3 の import を先取りしていれば fire する。
- **`error[E0583]: file not found for module 'compute'`** — lib.rs に `pub mod compute;` を先取りして書いた。削除する。L4 で戻ってくる。
- **`error: failed to parse manifest`** — Cargo.toml の syntax。よくあるミス: `[dev-dependences]` の typo。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **`MARGIN_SCALE = 10_000`、`1_000_000_000` ではない。** Funding の `RATE_SCALE` より 2 桁細かいのは間違い — 本番の margin パラメータは ppb で設定されない。2 桁粗い（`100`、percent）と意味のある解像度を失う。**Bps は世界が margin に対して落ち着いた単位。我々もそれに合わせる。**

2. **Default constructor は `const fn`、`Default` impl ではない。** なぜ両スタイルが正しくないか: `Default::default()` は多くの型で「妥当な zero っぽい」デフォルトを返す。`LiquidationParams::default()` は「margin ゼロ、fee ゼロ」を示唆してしまい **危険** — `default()` 値で動くネットワークは liquidation がまったく起きない。**`hyperliquid_default()` は名前付き、意図的なデフォルト** — 呼び出し側は名前で要求しなければならず、安全性が重要な性質が見える状態に保たれる。

3. **3 つの独立した `u32` フィールド、ネスト型 `LiquidationConfig` 構造体ではない。** Tiered maintenance margin（HL 流: 大きな position に対して高い maintenance %）への将来の移行は `Vec<MaintenanceTier>` フィールドを欲しがるかもしれない。今は追加しない — 先取りした一般化。**Stage 10a は flat margin を使う。Stage 10c+ で tiered が必要なら再検討。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/Cargo.toml ./crates/liquidation/Cargo.toml
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L1 の後:
- **Cargo.toml** は Stage 10a と完全一致。
- **types.rs** は Stage 10a の types.rs の *最初の ~50 行* と一致 — モジュール doc + `MARGIN_SCALE` + `LiquidationParams` + impl。残り（`MarginRatio`、`MarginHealth`、`AccountSnapshot`、`CloseOrderSpec`）は L2/L3。
- **lib.rs** は Stage 10a の lib.rs の *最初の ~25 行* と一致 — クレート doc + `pub mod types;` + 2 つの再エクスポート。他の再エクスポートはその型を追加したときに来る。

## よくある質問

**Q1: `MARGIN_SCALE` をクレート doc と一緒に `lib.rs` に置かないのはなぜ?**

`MARGIN_SCALE` がスケールする対象の型システムと同じ場所にあるべき。`types.rs` は unit-of-account（margin ratio、bps、分類しきい値）に関するすべてが住む場所。lib.rs は public-API surface — `MARGIN_SCALE` を types.rs からクレートルートに re-export するのは、source of truth を分けるよりクリーン。

**Q2: `LiquidationParams` の constructor で `maintenance ≤ initial` を検証すべきか?**

Stage 10a では no — 構造体は任意の組み合わせを受け入れる。Stage 10c で `validated()` constructor を追加し、genesis を読み込む側のコードから呼ばれたときに `Result<Self, ParamsError>` を返すようにする。検証なしの constructor は test と proptest generator が *病的な* 入力を食わせたい場合のために残す。

**Q3: なぜ `hyperliquid_default()` が 10% / 2% / 1.5% で、他の値ではないのか?**

HL の実際の maintenance margin tier は position size に応じて 1.25% から 6.67% の範囲。代表的な中間値として 2% を選んだ。Initial が maintenance の 10 倍 — よくある形。Fee の 1.5% は ETH/BTC の公開 HL 値。軽い資産はもっと低い。**どれも貴重ではない — あなたのネットワークが自分で設定する。**

**Q4: Margin ratio の計算で実際の i64 overflow リスクは?**

`margin_ratio = equity * MARGIN_SCALE / notional`。`MARGIN_SCALE = 10_000` と、`equity` と `notional` が `i64::MAX` で bounded されたとき、積 `equity * MARGIN_SCALE` は `equity > i64::MAX / 10_000 ≈ 9.2e14` で i64 を overflow しうる。現実的な取引所スケールでこれは 920 兆ドルの equity — 妥当な入力よりはるか上だが、L5 では依然として乗算を `i128` で行い、i64 に saturate して戻す。**反射は funding と同じ: i64 を超えうる積は、敵対的な入力で必ず超える。**

**Q5: `MARGIN_SCALE` と bps に `u32` を使って、i64 への変換ノイズを避けられないか?**

避けられる — そして `i64::from(...)` の呼び出しが数回減る。コスト: あらゆる margin-ratio 計算が `equity`（signed）と `notional`（unsigned）を含み、演算で signed/unsigned を混ぜると各サイトで明示的キャストが要る。境界で 1 回 i64 にアップキャスト（`i64::from(params.initial_margin_bps)`）して、その後の演算は signed で通すほうがよい。**境界で変換し、計算は 1 つの型で。**

## 次のレッスン (L2)

L2 では `MarginRatio` newtype + `MarginHealth` enum を追加する。`MarginHealth` は load-bearing な分類型で、次の 5 レッスンはすべてこれを return または consume する。なぜ `bool` でも `u8` でもなく 4-variant enum にしたかを見ていく。

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
