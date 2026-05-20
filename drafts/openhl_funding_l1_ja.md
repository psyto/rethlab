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

このレッスンを終えると：

```bash
cargo build -p openhl-funding
```

上記の実行結果がコンパイルを通る。`openhl-funding` crate には以下が入る：

- **Cargo.toml** に `openhl-clob` 依存を配線（後で `AccountId` が必要になるが、今入れておけば L3 で驚かずに済む）。加えて `[dev-dependencies]` ブロックで `proptest` を準備（L4 / L7 で使う）。
- **`src/types.rs`** — 新規作成。module doc と `pub const RATE_SCALE: i64 = 1_000_000_000` のみ。
- **`src/lib.rs`** — 空だったところに `pub mod types;` と、クレートルートでの `RATE_SCALE` re-export を追加。

これだけだ。**定数 1 つ、しかも crate 全体で最も重要な定数。** 残り 10 レッスンの rate も premium も settlement も、すべて `RATE_SCALE` を基準に表現される。ここを正しく設定すれば残りの数学は素直に進む。間違えれば validator が fork する。

L1 にテストはない — `RATE_SCALE` は値であって挙動ではないからだ。L2 で最初の money type に最初のテストが付く。

## おさらい

L0 後の状態：
- Funding 支払いがなぜ存在するか理解した（mark/index ドリフトの補正）。
- Float がなぜ consensus fork ハザードになるか理解した。
- Funding crate の scaffold（Cargo.toml と空の `src/lib.rs`）は Stage 8b 以前から workspace に存在していた。

L1 では、空だったこの crate を「public な値を 1 つ持つ実 crate」へと変える。

## プラン

編集は 3 つ：

1. **`crates/funding/Cargo.toml`** — `[dependencies]` に `openhl-clob = { path = "../clob" }` を追加し、`proptest` 入りの新規 `[dev-dependencies]` ブロックを追加。
2. **`crates/funding/src/types.rs` を作成** — determinism の理由を説明する module doc と `RATE_SCALE` 定数。
3. **`crates/funding/src/lib.rs`** — 空だったので、crate doc、`pub mod types;`、`pub use types::RATE_SCALE;` の re-export を追加。

以上。コンパイル、グリーン、次へ。

> 🛑 **考えてみよう。** スクロール前に — `RATE_SCALE` は `1_000_000_000` = `1e9` = parts-per-billion だ。なぜ `1_000_000`（parts-per-million、6 桁）でも、`1_000_000_000_000`（parts-per-trillion、12 桁）でもないのか。ヒント：表現すべき rate の範囲と、i64 にどれだけの値が収まるかを考えよ。

（答え：**i64 max は ~9.2e18。** `RATE_SCALE = 1e9` のとき、raw 値 `1e18` は `1e9`（10 億）を表す。Funding rate に 10 億のレンジは要らない — 典型的には interval ごとに `0.0001` から `0.04` 程度だ。**`RATE_SCALE = 1e9` なら 9 桁の精度に加えて巨大なヘッドルームが手に入る**：`40_000_000`（`0.04`、HL のキャップ）は `i64::MAX` から 11 桁下にある。`1e12`（parts-per-trillion）にすれば精度は上がるがヘッドルームを失う — `1e12` スケールの値 2 つの積を扱うには `i256` が必要になる。一方 `1e6` では実質的なヘッドルームの節約にならない上、funding rate が `0.0001%` = `10` ppb のときに意味のある精度を失う。**`1e9` こそが i64 での固定小数点 rate のスイートスポットだ。**）

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

変更は 2 点：

1. **`openhl-clob = { path = "../clob" }`** を `[dependencies]` に追加する。Funding crate は `openhl-clob` の `AccountId` を必要とする（L3 の `Position` で登場）。今ここで dep を入れておけば、L3 での diff が集中する。**コストはほぼゼロ** — path dep を宣言しただけでは、最初の `use` が現れるまで recompile は走らない。
2. **`[dev-dependencies]` ブロック**に `proptest` を追加する。L4（premium antisymmetry test）と L7（balanced-book zero-sum）で使う。同じ理屈で「今宣言、後で使う」とする。Production build には proptest は含まれない。

> 🛑 **やりがちな勘違い。** 「テストでしか使わないなら `openhl-clob` も dev-dependency でよくない？」 **テストだけではない — production コードが `Position` で `openhl_clob::AccountId` を使う。** もし `AccountId` がテスト専用なら dev-dep でよかった。だが production の型シグネチャの一部なので、通常の dep にする必要がある。Dev-deps は「テストが pull するが production は一切触らない」ものに限定するべきだ。

### Step 2: `src/types.rs` を作成

`crates/funding/src/types.rs` を作成する。このファイルはまだ存在しない — このレッスンで新規に作る。初期内容は以下：

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

この 15 行のファイルで注目すべきは 4 点：

1. **Module doc に「Why fixed-point integers, not floats」セクションを置いている。** これが crate 全体の load-bearing な理由付けだ。6 ヶ月後に `types.rs` を読む次のエンジニアにとって、この説明はファイル最上部にあるべきもの — コミットメッセージの中に埋もれていてはいけない。
2. **`[`FundingRate`]` と `[`Premium`]` へのクロス参照。** これらの型はまだ存在しない（L2 / L3 で追加する）。L1 のビルド中、rustdoc はリンク切れ warning を出す。**warning は受け入れる** — L2/L3 で型を追加すれば解決する。Warning をゼロにしたければ `[`FundingRate`]` でなく `[FundingRate]`（バックティックなし）と書いてもよいが、クロス参照スタイルがソースの慣習だ。
3. **`pub const RATE_SCALE: i64 = 1_000_000_000`** — `u64` でなく `i64` を使う。Rate と premium は*符号付き*だからだ（longs 支払い = 正の premium、shorts 支払い = 負）。符号付き整数を使えば `compute.rs` の演算で符号チェックは不要になり、`i128` 中間値が積を自然に吸収してくれる。
4. **Doc が `1.0` = `100%` と明記している。** これは会計単位の決定だ。`RATE_SCALE` の生値（1e9）は interval ごとに 100% の funding rate を意味する。`40_000_000` は 4%、`1_000_000` は 0.1%。**「1 単位 notional に対する parts-per-billion」として読めばよい。**

> 🛑 **やりがちな勘違い。** 「`f64` を使って、validator 間で共有する前に結果を丸めればよくない？」 **だめだ、理由は 2 つある。** (1) 中間計算は最終の丸めより先に発散する。その時点で被害は出ている。(2) 「N 桁に丸める」自体が float 演算で、丸め挙動が処理系ごとに異なる。**Float の非決定性からの脱出口として、整数より単純なものはない。**

### Step 3: `src/lib.rs` を更新

`crates/funding/src/lib.rs` を開く。現状は空（`e69de29` blob）だ。以下に置き換える：

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

L11 終了時点の版と比べて欠けているもの：`pub mod clock`、`pub mod compute`、そして残りの `pub use types::{...}` re-export。これらは L4-L10 でモジュールを追加するたびに足していく。**L1 の lib.rs はコンパイルが通る最小限の形だ。**

クレートレベル doc（`//! ...`）が伝えるのは：
- これは純粋な state machine であり、I/O は持たない。
- 1 段落の HL funding おさらい — 文脈なしに crate root にたどり着いた読者向け。
- 統合がどこで起きるか（ここではなく bridge 側）。

クロス参照 `[`FundingClock`]` は L8 で追加するまでリンク切れのままだ。types.rs のクロス参照と同じ扱いでよい。

> 🛑 **考えてみよう。** ここに `pub mod compute;` と書いたのに `compute.rs` を作らなかったらどうなるか。ヒント：`pub mod foo;` が実際に何をするかを考えよ。

（答え：**コンパイルエラーになる。** `pub mod compute;` はコンパイラに「同じディレクトリの `compute.rs` または `compute/mod.rs` を探せ」と告げる宣言だ。どちらもなければ `error[E0583]: file not found for module 'compute'` が出る。だから `pub mod` 宣言は*該当ファイルを作るタイミングで*追加する — 一度にまとめて追加するのではなく。）

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

rustdoc の warning が 3 つ（unresolved link）出る。これは期待通り — リンク先の型は L2/L3（types.rs）と L8（clock.rs）で順次追加される。**L11 までに 3 つすべて解決する。** `#[allow(rustdoc::broken_intra_doc_links)]` で抑制してはいけない — 「まだ X を足す必要がある」というインジケータとして有用だからだ。

よくあるエラー：

- **`error[E0463]: can't find crate for 'openhl_clob'`** — Cargo.toml の `openhl-clob = { path = "../clob" }` 行を忘れた場合。L1 のコード自体は `openhl_clob` を使わないが、L3 を先取りして `use openhl_clob::AccountId` を dep なしで types.rs に入れるとこのエラーが出る。
- **`error[E0583]: file not found for module 'clock'`** や `'compute'` — `pub mod clock;` を先取りして lib.rs に追加した場合。削除して、L8 で改めて戻せばよい。
- **`error: failed to parse manifest`** — Cargo.toml の syntax エラー。`[dev-dependencies]` ブロックを `[dev-dependences]` と typo していないか確認すること。

## 設計の振り返り

このレッスンに焼き込んだ決定は 3 つ：

1. **`RATE_SCALE = 1e9` は u64 ではなく i64 にした。** Rate が符号付きだから符号付きにしている。`compute.rs` の演算は `i128` 中間値で積を吸収する。`u64` にしても何の利点もなく、符号処理を複雑にするだけだ。

2. **Module doc コメントは理由付けであって、チュートリアルではない。** 「Why fixed-point integers, not floats」の段落で、この設計が*なぜ*存在するのかを説明している。6 ヶ月後に `types.rs` にたどり着いた読者に必要なのは*なぜ*の部分だ — *どう*はコード自体に書いてある。**Doc コメントは、将来の読者が問うであろう質問を先回りしたときに初めて価値を生む。**

3. **`pub use types::RATE_SCALE` をクレートルートに置く。** 呼び出し側は `use openhl_funding::types::RATE_SCALE;` ではなく `use openhl_funding::RATE_SCALE;` と書ける。短いパスが canonical、モジュールパスは内部用だ。**呼び出し側が実際に使うものは、すべてクレートルートで re-export する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/Cargo.toml ./crates/funding/Cargo.toml
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

L1 後の状態：
- **Cargo.toml** が Stage 8b と完全一致する。
- **types.rs** が Stage 8b の types.rs の*最初の ~30 行*と一致する — module doc と `RATE_SCALE` まで。それ以降の型定義は L2/L3 で追加する。
- **lib.rs** は Stage 8b の lib.rs より短い — `pub mod types;` と `pub use` 1 つだけ。他のモジュール宣言と re-export は後のレッスンで追加する。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: L1 にテストがないのに `[dev-dependencies] proptest` を今宣言するのはなぜ？**
Cargo.toml の diff を 1 箇所に集中させたいからだ。L4 で proptest を追加すると Cargo.toml を 2 回触ることになる。L1 でまとめて済ませれば、このレッスン以降このファイルは変わらない。**Cargo.toml の安定性は、小さな unused dep 宣言を抱える価値がある。**

**Q: 「parts-per-billion」解釈は実際どう読むのか？**
Funding rate の生値 `1_250_000` は `0.00125`（interval ごとに 0.125%）を意味する。つまり「1,000,000,000 分の 1,250,000」 = 0.125% だ。HL の 1 日 8 回 settlement と 4% cap のもとでは、実際に見る値の範囲は `±40_000_000` raw = `±4%/interval` = 最悪ケースで `±32%/day`。**すべて i64 で余裕を持って表現できる。**

**Q: 後から `RATE_SCALE` を変えて、consumer を壊さずに済むか？**
**無理だ。** `RATE_SCALE` はチェーンの consensus 定数だ。永続化済みのすべての balance、過去すべての settlement、すべてのテストフィクスチャが `RATE_SCALE = 1e9` を前提に calibrate されている。変更には coordinated な network upgrade が必要になる。**デプロイ後は immutable として扱うべきだ。** だからこそクレート開始時に一度だけ、`const` として設定する。

**Q: `RATE_SCALE` のテストがないのはなぜ？**
何を assert すればいい？ `assert_eq!(RATE_SCALE, 1_000_000_000)` は同義反復にすぎない — 定数を自分自身と比較しているだけだ。定数の意味は*他の*コードでの使われ方を通じて生きる。**最初の意味あるテストは、L2 で最初の money type に付くことになる。**

## 次のレッスン（L2）

L2 では「money type」を 4 つ追加する — `MarkPrice`、`IndexPrice`、`Premium`、`Notional`。それぞれプリミティブをラップする newtype だ。教育の焦点は「なぜ固定小数点か」から「なぜ newtype か」へとシフトする：偶発的なクロスフィードを防ぐためだ（例：`MarkPrice` を期待している箇所に `IndexPrice` を渡してしまうケース）。この 4 型が `types.rs` に ~30 行を追加し、残りの型（L3）が踏襲する newtype パターンの実例となる。
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
