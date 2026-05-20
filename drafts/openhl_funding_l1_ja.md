# Building OpenHL Funding — L1 draft (JA) — build-along

> openhl SHA `cd94137`（Stage 8b — funding state machine）に対するドラフト。
> コース: `building-openhl-funding-ja`（track: `reth-l1-architect`）。

---

## L1 — `openhl-funding-rate-scale-ja`

- **Module:** 1 (Determinism + 型), sortOrder 0
- **Course-level sortOrder:** 1 (lesson 2 of 12)
- **Duration:** 25 min
- **XP reward:** 50
- **Type:** CONTENT

### Content

````markdown
# レッスン 1 — `RATE_SCALE` — consensus を守る定数

## ゴール

このレッスンが終わると：

```bash
cargo build -p openhl-funding
```

…がコンパイルされる。`openhl-funding` crate に以下：

- **Cargo.toml** が `openhl-clob` 依存を配線（後で `AccountId` が必要だが今入れておけば L3 で驚かない）+ `[dev-dependencies]` ブロックに `proptest` 準備（L4 / L7 で使う）。
- **`src/types.rs`** — 新規作成、module doc + `pub const RATE_SCALE: i64 = 1_000_000_000`。それだけ。
- **`src/lib.rs`** — 空だったのを `pub mod types;` + クレートルートに `RATE_SCALE` re-export。

それだけ。**定数 1 つ、crate 全体で最も重要な定数。** 残り 10 レッスンの全 rate、全 premium、全 settlement は `RATE_SCALE` を基準に表現される。これを正しく設定すれば残りの数学は素直、間違えれば validator が fork する。

L1 にテストはない — `RATE_SCALE` は値であって挙動ではない。L2 で最初の money type が最初のテストを得る。

## おさらい

L0 後：
- Funding 支払いがなぜ存在するか理解した（mark/index ドリフトの補正）。
- Float がなぜ consensus 分岐ハザードか理解した。
- Funding crate scaffold（Cargo.toml + 空の `src/lib.rs`）が Stage 8b 前から workspace にあった。

L1 で空の crate を 1 つの public な値を持つ実 crate にする。

## プラン

3 つの編集：

1. **`crates/funding/Cargo.toml`** — `openhl-clob = { path = "../clob" }` を `[dependencies]` に追加、新規 `[dev-dependencies]` ブロックを `proptest` 付きで追加。
2. **`crates/funding/src/types.rs` を作成** — determinism の理由を説明する module doc + `RATE_SCALE` 定数。
3. **`crates/funding/src/lib.rs`** — 空だった。crate doc + `pub mod types;` + `pub use types::RATE_SCALE;` re-export を追加。

以上。コンパイル、グリーン、次へ。

> 🛑 **考えてみよう。** スクロール前に — `RATE_SCALE` は `1_000_000_000` = `1e9` = parts-per-billion。なぜ `1_000_000`（parts-per-million、6 桁）でなく、なぜ `1_000_000_000_000`（parts-per-trillion、12 桁）でないか？ ヒント：どんな範囲の rate を表現する必要があり、i64 がどれだけ保持できるかを考える。

（答え：**i64 max は ~9.2e18。** `RATE_SCALE = 1e9` で、`1e18` の raw 値は `1e9`（10 億）を表す。Funding rate は 10 億のレンジは不要 — 典型的に interval ごとに `0.0001` から `0.04` 程度。**`RATE_SCALE = 1e9` で 9 桁の精度 + 巨大なヘッドルーム**：`40_000_000`（`0.04`、HL のキャップ）は `i64::MAX` から 11 桁下。`1e12`（parts-per-trillion）にすれば精度は得るがヘッドルームを失う — `1e12` スケールの値 2 つの積に `i256` が要る。`1e6` だと実質的なヘッドルームを節約せず、funding rate が `0.0001%` = `10` ppb のとき意味ある精度を失う。**`1e9` が i64 での固定小数点 rate のスイートスポット。**）

## 手順

### Step 1: Cargo.toml を更新

`crates/funding/Cargo.toml` を開く。現状：

```toml
[package]
name         = "openhl-funding"
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

これに更新：

```toml
[package]
name         = "openhl-funding"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]
openhl-clob = { path = "../clob" }

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
```

2 つの変更：

1. **`openhl-clob = { path = "../clob" }`** を `[dependencies]` に。Funding crate は `openhl-clob` の `AccountId` が必要（L3 の `Position` で登場）。今 dep を入れておけば L3 で diff が集中する。**コスト：~0** — path dep の宣言は最初の `use` まで何も recompile しない。
2. **`[dev-dependencies]` ブロック** に `proptest`。L4（premium antisymmetry test）と L7（balanced-book zero-sum）で使う。同じロジック：今宣言、後で使う。Production build は proptest を含まない。

> 🛑 **やりがちな勘違い。** 「テストでも使うから `openhl-clob` を dev-dependency にしてもよくない？」 **production code が `openhl_clob::AccountId` を `Position` で使うから、test だけじゃない。** `AccountId` が test only なら dev-dep。Production 型シグネチャの一部なので普通の dep にする必要がある。Dev-deps は「テストが pull するが production が全く触らない」もののみ。

### Step 2: `src/types.rs` を作成

`crates/funding/src/types.rs` を作成。このファイルはまだ存在しない — このレッスンで新規。初期内容：

```rust
//! Core types for the funding state machine.
//!
//! Pure data — no I/O, no allocation beyond what's needed for settlements.
//! Every type is `Copy`-friendly (or, in the case of `Position`, `Clone +
//! Copy`) so callers can pass snapshots without lifetime gymnastics.
//!
//! ### Why fixed-point integers, not floats
//!
//! Consensus determinism — every validator must compute the *same* funding
//! rate from the *same* inputs. Float arithmetic gives different bit patterns
//! across compilers and CPUs (FMA, rounding mode, denormal handling); the
//! moment two validators disagree on a single LSB they fork. We use signed
//! integers scaled by [`RATE_SCALE`] (parts-per-billion) for rates and
//! premiums, and a separate `Notional` type for quote-currency deltas.

/// Scale factor for [`FundingRate`] and [`Premium`]. A raw value of
/// `RATE_SCALE` represents `1.0` (i.e., 100%). With `1e9` we get 9 decimal
/// digits of precision — more than enough for funding rates that typically
/// sit in the ±0.01% to ±0.05% per interval band.
pub const RATE_SCALE: i64 = 1_000_000_000;
```

この 15 行のファイルで注目する 4 点：

1. **Module doc に「Why fixed-point integers, not floats」セクション。** これが crate 全体の load-bearing な理由付け。6 ヶ月後に `types.rs` を読む次のエンジニアは、この説明を最上部で見る必要がある — コミットメッセージに埋もれているのでなく。
2. **`[`FundingRate`]` と `[`Premium`]` のクロス参照。** これらの型はまだ存在しない（L2 / L3）。L1 ビルド中 rustdoc がリンク切れ warning を出す。**Warning を許容する** — L2/L3 で型を追加すれば解決する。Warning ゼロにしたいなら `[`FundingRate`]` でなく `[FundingRate]`（バックティックなし）でプレーンに書く — だがクロス参照スタイルがソースの慣習。
3. **`pub const RATE_SCALE: i64 = 1_000_000_000`** — `u64` でなく `i64`。Rate と premium は*符号付き*（longs 支払い = 正の premium、shorts 支払い = 負）。符号付き整数なら `compute.rs` の演算で符号チェック不要、`i128` 中間値が積を自然に吸収する。
4. **Doc が `1.0` = `100%` と言う。** これは会計単位の決定。`RATE_SCALE` 生値（1e9）は interval ごとに 100% の funding rate を意味する。`40_000_000` は 4%。`1_000_000` は 0.1%。**「1 単位 notional の parts-per-billion」として読む。**

> 🛑 **やりがちな勘違い。** 「`f64` を使って validator 間で共有する前に結果を丸めればよくない？」 **No が 2 つの理由。** (1) 中間計算が最終の丸めより先に divergent。その時点で被害は出ている。(2) 「N 桁に丸める」自体が float ops で、丸め挙動が異なる。**Float 非決定性からの脱出ハッチで整数より単純なものはない。**

### Step 3: `src/lib.rs` を更新

`crates/funding/src/lib.rs` を開く。現在は空（`e69de29` blob）。これに置き換え：

```rust
//! `openhl-funding` — funding-rate state machine.
//!
//! Pure state machine: no I/O, no async, no networking. Funding is applied
//! deterministically on a fixed cadence (see [`FundingClock`]); every tick is
//! a pure function over `(now, mark, index, positions)` → settlements.
//!
//! ### Hyperliquid-shape funding, in one paragraph
//!
//! Perpetual contracts don't expire, so the mark price can drift arbitrarily
//! from the spot ("index") price. Funding payments push it back: when mark >
//! index (longs are overpaying), longs pay shorts; when mark < index, shorts
//! pay longs. The premium `(mark - index) / index` is divided by a
//! per-day-interval count (HL: 8 — one settlement every 3 hours) to derive a
//! per-interval rate, capped at a network-set absolute max. At each tick
//! every account with an open position settles `position_size * mark * rate`
//! in quote currency.
//!
//! Integration with the rest of openhl happens at the EVM bridge: settlement
//! deltas become balance updates that the bridge bundles into payloads. That
//! integration lives in `crates/evm/`; the rate math and tick gating are here.

pub mod types;

pub use types::RATE_SCALE;
```

L11 終了時点版と比べて欠けているもの：`pub mod clock`、`pub mod compute`、残りの `pub use types::{...}` re-export。それらは L4-L10 でモジュールを追加するたびに来る。**L1 lib.rs はコンパイルする最小限。**

クレートレベル doc（`//! ...`）が説明：
- これは純粋な state machine。I/O なし。
- 1 段落の HL funding recap — context なしに crate root に landing した読者向け。
- 統合がどこで起きるか（ここでなく bridge）。

クロス参照 `[`FundingClock`]` は L8 が追加するまで壊れている。types.rs のクロス参照と同じ扱い。

> 🛑 **考えてみよう。** ここに `pub mod compute;` を書いたが `compute.rs` を作らなかったらどうなる？ ヒント：`pub mod foo;` が実際に何をするか考える。

（答え：**コンパイルエラー。** `pub mod compute;` はコンパイラに「同じディレクトリの `compute.rs` または `compute/mod.rs` を探せ」と告げる。どちらもなければ `error[E0583]: file not found for module 'compute'`。だから `pub mod` 宣言は*各ファイルを作るタイミングで*追加する — 一度にすべてではなく。）

### Step 4: コンパイル

```bash
cargo build -p openhl-funding
```

期待出力：

```
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to `FundingRate`
warning: unresolved link to `Premium`
warning: unresolved link to `FundingClock`
    Finished `dev` profile [unoptimized + debuginfo] in 0.5s
```

3 つの rustdoc warning（unresolved link）。期待通り — リンクされた型は L2/L3（types.rs）と L8（clock.rs）で来る。**3 つすべて L11 までに解決する。** `#[allow(rustdoc::broken_intra_doc_links)]` で抑制しないこと — 「まだ X が要る」というインジケータとして有用。

よくあるエラー：

- **`error[E0463]: can't find crate for 'openhl_clob'`** — Cargo.toml の `openhl-clob = { path = "../clob" }` 行を忘れた。L1 コードで `openhl_clob` を使わないが、L3 を先取りして `use openhl_clob::AccountId` を types.rs に dep なしで入れたらこれが出る。
- **`error[E0583]: file not found for module 'clock'`** または `'compute'` — `pub mod clock;` を lib.rs に先取り追加。削除する。L8 で戻す。
- **`error: failed to parse manifest`** — Cargo.toml の syntax。`[dev-dependencies]` ブロックを `[dev-dependences]` と typo していないかチェック。

## 設計の振り返り

このレッスンに焼き込まれた決定 3 つ：

1. **`RATE_SCALE = 1e9` は u64 でなく i64。** Rate が signed なので signed。`compute.rs` の演算は `i128` 中間値で積を吸収する。`u64` は何の利得もなく符号処理を複雑化する。

2. **Module doc コメントは理由付け、チュートリアルではない。** 「Why fixed-point integers, not floats」段落がこの設計が*なぜ*存在するかを説明。6 ヶ月後に `types.rs` に landing する読者には*なぜ*が必要 — *どう*はコード自体にある。**Doc コメントは将来の読者が問う質問を先回りしたとき価値を生む。**

3. **`pub use types::RATE_SCALE` をクレートルートに。** 呼び出し側は `use openhl_funding::types::RATE_SCALE;` でなく `use openhl_funding::RATE_SCALE;` と書ける。短いパスが canonical、モジュールパスは内部。**呼び出し側が実際に使うものはクレートルートで re-export。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/Cargo.toml ./crates/funding/Cargo.toml
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

L1 後：
- **Cargo.toml** が Stage 8b と完全一致。
- **types.rs** が Stage 8b の types.rs の*最初 ~30 行*に一致 — module doc + `RATE_SCALE`。それ以下（型定義）は L2/L3。
- **lib.rs** が Stage 8b の lib.rs より短い — `pub mod types;` + 1 つの `pub use` だけ。他の module 宣言と re-export は後のレッスン。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: L1 にテストがないのに `[dev-dependencies] proptest` を今宣言する理由は？**
Cargo.toml が単一の diff target だから。L4 で proptest を追加すると Cargo.toml を 2 回触ることになる。L1 で 1 回だけやればこのレッスン後にファイルが変わらない。**Cargo.toml の安定性は小さな unused dep 宣言の価値がある。**

**Q: 「parts-per-billion」解釈は実際どうなる？**
Funding rate の生値 `1_250_000` は `0.00125`（interval ごとに 0.125%）。「1,000,000,000 のうち 1,250,000」 — つまり 0.125%。HL の 1 日 8 回 settlement と 4% cap で、実際に見る値の範囲は `±40_000_000` raw = `±4%/interval` = 最悪ケース `±32%/day`。**すべて i64 で快適に表現可能。**

**Q: 後で `RATE_SCALE` を変えて consumer を壊さずに済むか？**
**No。** `RATE_SCALE` はチェーン consensus 定数。永続化された全 balance、全歴史的 settlement、全テストフィクスチャが `RATE_SCALE = 1e9` で calibrated。変更には coordinated network upgrade が必要。**Deployment 後は immutable と扱う。** だからクレート開始時に一度、`const` で設定する。

**Q: なぜ `RATE_SCALE` のテストがない？**
何を assert する？ `assert_eq!(RATE_SCALE, 1_000_000_000)` は同義反復 — 定数を自分自身と比較。定数の意味は*他の*コードがどう使うかで生きる。**L2 の最初の money type が最初の意味あるテストを得る。**

## 次のレッスン（L2）

L2 で 4 つの「money type」を追加 — `MarkPrice`、`IndexPrice`、`Premium`、`Notional`。それぞれがプリミティブをラップする newtype。教育の焦点が「なぜ固定小数点」から「なぜ newtype」へシフト：偶然のクロスフィード防止（例：`MarkPrice` 期待のところに `IndexPrice` を渡す）。4 つの型が `types.rs` に ~30 行を追加して、残りの型（L3）が従う newtype パターンを実証する。
````

---

## Seed-file slot

L1 は Module 1 (Determinism + 型) の sortOrder 0 に入る：

```typescript
{
  title: 'レッスン 1 — RATE_SCALE — consensus を守る定数',
  slug: 'openhl-funding-rate-scale-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 25,
  xpReward: 50,
  content: `# レッスン 1 — \`RATE_SCALE\` — consensus を守る定数\n\n...`
},
```

## SHA pinning discipline

L1 は `cd94137`（Stage 8b）を引用。L1 後、`Cargo.toml` は Stage 8b と完全一致。`types.rs` は最初 ~30 行（module doc + `RATE_SCALE`）と一致。`lib.rs` は strict subset（`pub mod types;` + 1 つの `pub use`）。残りは L2-L10。

## Style review notes (self-critique before paste)

- **§ゴールがタイト** — 定数 1 つ、3 ファイル編集、まだテストなし。読者が surface area を知る。
- **§考えてみよう（RATE_SCALE = 1e9 vs 代替）**が選択を正当化 — 固定小数点を考えたことがない読者が推論でスイートスポット論に着く。
- **§Step 1 やりがちな勘違い（dev-dep vs 普通 dep）**が Rust-Cargo の典型混乱を先回り。
- **§Step 3 考えてみよう（ファイルなしの `pub mod`）**が後レッスン先取りで読者が当たる実エラーを先回り。
- **§Step 4 が 3 つの rustdoc warning を*期待通り*とドキュメント化** — 読者がデバッグに時間を浪費しない。
- **§よくある質問の RATE_SCALE テスト不要**が「全値をテストすべきでは？」反射を明示処理。
- **L2 プレビュー**が具体的：~30 行、4 newtype、newtype パターン。
