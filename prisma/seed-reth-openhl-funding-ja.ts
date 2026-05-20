// AUTO-GENERATED from drafts/openhl_funding_*_ja.md by .github/scripts/build-openhl-funding-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlFundingJA(prisma: PrismaClient) {
  const tags = ["reth","evm","funding","perpetual","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-funding-ja",
      title: "OpenHL Funding を作る — 永久先物 funding state machine",
      description:
        "L1 Architect トラックの 10 コース中 9 番目。openhl ベースの build-along コースの 4 つ目。永久先物の funding 支払いを駆動する純粋な state machine を構築：固定小数点での premium 算出、divisor+cap の rate 計算、position snapshot への適用、interval ごとに 1 回 + catch-up なしの不変条件を持つ tick gating clock。終了状態：22 tests 通る（20 手書き + 2 proptest — premium の antisymmetry と balanced-book zero-sum をカバー）。openhl Stage 8b (~635 LOC、types.rs / compute.rs / clock.rs) をカバー。Funding crate は純粋な state — まだ bridge や vault に配線されていない。その統合は次の L1 Architect コース（Funding, oracle, liquidations）。",
      difficulty: "EXPERT",
      duration: 355,
      xpReward: 730,
      track: "reth-l1-architect",
      tags,
      isPublished: false,
      sortOrder: 900,
      locale: "ja",
      instructorName: "RethLab",
      modules: {
        create: [
          {
            title: "Orientation",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "OpenHL Funding を作る — 永久先物 funding state machine",
                  slug: "openhl-funding-orientation-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# OpenHL Funding を作る — 永久先物 funding state machine

## 何を作るか

前コース（\`building-openhl-precompiles\`）はカスタム EVM precompile を Reth に plug-in して、スマートコントラクトが live CLOB を read/write できるようにした。このコースでは openhl の次のプリミティブを作る：永久先物の **funding 支払いを駆動する state machine**。

このコースの終わりに出荷するもの：

- **3 ソースファイル / ~635 LOC**、新しい \`openhl-funding\` crate に。
- **22 tests 通る**：20 手書き + 2 proptest（premium antisymmetry + balanced-book zero-sum）。
- **3 つの building block**：固定小数点の types モジュール、純粋な compute モジュール（premium / rate / settlement）、tick gating の clock state machine。
- **clock の 2 つの不変条件を強制**：interval ごとに settlement は最多 1 回、長時間ギャップ後の catch-up なし。

理解するもの：

- なぜ浮動小数点演算が consensus システムでチェーン分岐ハザードになるか。
- Hyperliquid funding-rate の形：premium → rate → settlement、divisor + cap 付き。
- \`RATE_SCALE = 1_000_000_000\`（parts-per-billion）でスケールした固定小数点整数で、consensus リスクなしに 9 桁の精度を得るやり方。
- なぜ純粋な state machine + saturating arithmetic が consensus 中核の数学の正しい形か。
- なぜ clock が \`now\` まで進むか（\`last_settled + interval\` でなく） — そしてそこに焼き込まれた設計トレードオフ。

## なぜ funding が重要か（perp 1 段落）

永久先物は期限がない。じゃあ mark price はどうやって spot/index price にアンカーされる？ Funding 支払い。Mark > index のとき（longs が spot 比で overpay している）、longs が shorts に固定のサイクルで支払う — 典型的には interval ごと（HL: 1 時間）。Mark < index のときは shorts が longs に支払う。Premium \`(mark - index) / index\` は \`divisor\`（HL: 8）で割って per-interval rate を出し、network 設定の絶対上限（HL: ±4%/interval）で**キャップ**して、最悪ケースの支払いを bound する。各 tick で、ゼロでない position を持つ各アカウントが \`size × mark × rate\` の quote currency を決済。Premium の符号によって longs が支払うか shorts が受け取るかが決まる。

## なぜ funding は float を使えないか

Consensus L1 の validator は他の validator と*完全に同じ* funding rate を計算しなければならない。2 つの validator が rate の最下位ビット 1 つでも一致しないと、チェーンが fork する。

Float 演算は以下にまたがって異なるビットパターンを生む：
- **コンパイラ** — LLVM が FMA（fused multiply-add）を ある CPU で emit して別の CPU で split することがある。
- **CPU** — 丸めモードが異なる、denormal の扱いが異なる。
- **演算順** — \`(a * b) + c\` と \`a * b + c\` は同じに見える IR にコンパイルされても、最適化後の LSB が異なることがある。

Funding rate での 1 LSB の不一致のコストは**チェーン分岐**。Fork の異なる側にいる validator が異なる delta を決済、balance が divergent、次のブロックがどちらのチェーンに対しても検証しない。

修正：float を一切使わない。すべて \`RATE_SCALE = 1_000_000_000\`（parts-per-billion）でスケールした符号付き整数で計算する。\`0.04\`（4%）は \`40_000_000\`。\`0.001\`（0.1%）は \`1_000_000\`。乗算では overflow 回避のため \`i128\` 中間値が必要、除算は後。

これは Solana の compute budget、Ethereum の EVM、そして他のすべての consensus システムが課す制約と同じ。**Determinism がゲーム全体。**

## 12 レッスン

### Module 0 — Orientation
- **L0**（このレッスン）— なぜ funding、なぜ固定小数点、なぜ state machine。

### Module 1 — Determinism + 型 (L1-L3)
- **L1** — \`RATE_SCALE = 1e9\`：固定小数点の方式、なぜ整数、9 桁の精度が何を買うか。
- **L2** — 金額型：\`MarkPrice\` / \`IndexPrice\` / \`Premium\` / \`Notional\`。なぜそれぞれが newtype で、ただの \`i64\` でないか。
- **L3** — Position 型：\`PositionSize\` / \`Position\` / \`Settlement\` / \`FundingParams\`。HL デフォルトと各パラメータが encode するもの。

### Module 2 — 純粋な compute (L4-L7)
- **L4** — \`compute_premium\`：\`(mark - index) / index\` の導出。Sign symmetry のテスト。
- **L5** — \`saturate_i128_to_i64\` + overflow 哲学。なぜ saturate、なぜ panic でない。
- **L6** — \`compute_rate\`：divisor、cap、HL スタイルのデフォルト。Clamp 挙動。
- **L7** — \`apply_funding\`：longs-pay-shorts の符号規約。Balanced-book zero-sum 不変条件。

### Module 3 — Clock state machine (L8-L10)
- **L8** — \`FundingClock\` 構造体 + \`tick()\` インターフェース。
- **L9** — Interval gating 不変条件：interval ごとに settlement は最多 1 回。境界でのテスト。
- **L10** — No-catch-up 不変条件：10-interval ギャップは 1 回 settle、10 回でなく。なぜ。

### Module 4 — Capstone (L11)
- **L11** — 統合。Bridge integration プレビュー（funding が \`LiveRethEvmBridge\` のどこに plug-in されるか）。正直に先送り：oracle、liquidation、basis-vs-fixed funding。

## モジュールごとの SHA pinning

各レッスンが build 対象の openhl commit を引用する。このコースでは 12 レッスンすべてが **Stage 8b \`cd94137\`** を引用 — funding は 1 つの self-contained commit。（course 8 が Stage 9a-9d の 5 commit にまたがったのと対照的。）綺麗な SHA マッピングは、L11 終了時点の answer-key diff が \`crates/funding/\` で \`cd94137\` と byte-identical になることを意味する。

| Module | Lessons | SHA |
|---|---|---|
| 0 | L0 | \`cd94137\` |
| 1 | L1-L3 | \`cd94137\` |
| 2 | L4-L7 | \`cd94137\` |
| 3 | L8-L10 | \`cd94137\` |
| 4 | L11 | \`cd94137\` |

## 前提

このコースから最大限を得るには：

- **Course 6 (openhl-consensus) と course 7 (openhl-clob)** をコンセプト背景として頭に入れていること — funding state machine は \`AccountId\`（course 7）を消費し、courses 6+7 で構築した bridge にプラグインされる予定。**Course 8（precompiles）はスキップしても、このコースは追えます** — funding は純粋な state-machine 数学、EVM 側配線ではない。
- **Rust の i128 演算に慣れていること** — overflow 回避のための \`as i128\` upcast を 1 回以上やったことがある。
- **永久先物 funding メカニクスに最低限の馴染み**。Perp を取引したことがなければ、上の 1 段落の recap で十分。Hyperliquid で perp を取引したことがあるなら準備完了。
- **EVM 固有の知識は不要**。このコースは precompile、コントラクト、RPC に触れない。

不要なもの：
- 動いている openhl ノード（funding crate は I/O ゼロ）。
- Solana や他の L1 経験。
- 定量金融の背景 — ここでの数学は素直な固定小数点演算。

## セットアップ

\`\`\`bash
# openhl workspace root で：
cd ~/code/my-openhl
git checkout main
cargo build --workspace  # baseline — L1 前に通るべき
\`\`\`

リファレンスチェックアウト（各レッスン末尾の answer-key diff 用）：

\`\`\`bash
cd ~/code/openhl-reference  # 作業ツリーと別チェックアウト
git checkout cd94137
\`\`\`

（同じ workspace で lookup の間に \`git stash\` でも動く。）

## コーススタイル

各レッスンは courses 6-8 で確立した build-along フォーマットに従う：
- **ゴール** — 終わりに何が通る/何が作られる。
- **おさらい** — 前レッスンの終了地点。
- **プラン** — 具体的な編集を番号付きで。
- **考えてみよう** callout（🛑 + "スクロール前に..."）— 答えの前に問い。答えが定着する。
- **やりがちな勘違い** callout（🛑 + よくある誤解を名指し）— 「ただ〜できないの？」反射を先回り。
- **手順** — コード編集をステップごとに、変更ごとの説明付き。
- **テスト** — \`cargo test\` コマンドと期待される出力。
- **設計の振り返り** — このレッスンのコードに焼き込まれた load-bearing 決定 3-5 個。
- **答え合わせ** — openhl リファレンス SHA との \`git diff\`。
- **よくある質問** — 3-5 個の質問と grounded な回答。

数学コンテンツ（特に modules 2-3）は course 8 と比べてコンセプト重心、コード重心が薄い。**公式のところでペースを落とす**プランで進めて — 短いが、想像しうる全入力で正しいものを計算する必要がある。**Perp funding バグはクラッシュしない。静かに wealth を shift させる。**

## 準備完了

L1 へ。そこで \`RATE_SCALE\` 定数とこの後のすべてが乗る固定小数点方式を設定する。`,
                },
              ],
            },
          },
          {
            title: "Determinism と型",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "レッスン 1 — RATE_SCALE — consensus を守る定数",
                  slug: "openhl-funding-rate-scale-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン 1 — \`RATE_SCALE\` — consensus を守る定数

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

…がコンパイルされる。\`openhl-funding\` crate に以下：

- **Cargo.toml** が \`openhl-clob\` 依存を配線（後で \`AccountId\` が必要だが今入れておけば L3 で驚かない）+ \`[dev-dependencies]\` ブロックに \`proptest\` 準備（L4 / L7 で使う）。
- **\`src/types.rs\`** — 新規作成、module doc + \`pub const RATE_SCALE: i64 = 1_000_000_000\`。それだけ。
- **\`src/lib.rs\`** — 空だったのを \`pub mod types;\` + クレートルートに \`RATE_SCALE\` re-export。

それだけ。**定数 1 つ、crate 全体で最も重要な定数。** 残り 10 レッスンの全 rate、全 premium、全 settlement は \`RATE_SCALE\` を基準に表現される。これを正しく設定すれば残りの数学は素直、間違えれば validator が fork する。

L1 にテストはない — \`RATE_SCALE\` は値であって挙動ではない。L2 で最初の money type が最初のテストを得る。

## おさらい

L0 後：
- Funding 支払いがなぜ存在するか理解した（mark/index ドリフトの補正）。
- Float がなぜ consensus 分岐ハザードか理解した。
- Funding crate scaffold（Cargo.toml + 空の \`src/lib.rs\`）が Stage 8b 前から workspace にあった。

L1 で空の crate を 1 つの public な値を持つ実 crate にする。

## プラン

3 つの編集：

1. **\`crates/funding/Cargo.toml\`** — \`openhl-clob = { path = "../clob" }\` を \`[dependencies]\` に追加、新規 \`[dev-dependencies]\` ブロックを \`proptest\` 付きで追加。
2. **\`crates/funding/src/types.rs\` を作成** — determinism の理由を説明する module doc + \`RATE_SCALE\` 定数。
3. **\`crates/funding/src/lib.rs\`** — 空だった。crate doc + \`pub mod types;\` + \`pub use types::RATE_SCALE;\` re-export を追加。

以上。コンパイル、グリーン、次へ。

> 🛑 **考えてみよう。** スクロール前に — \`RATE_SCALE\` は \`1_000_000_000\` = \`1e9\` = parts-per-billion。なぜ \`1_000_000\`（parts-per-million、6 桁）でなく、なぜ \`1_000_000_000_000\`（parts-per-trillion、12 桁）でないか？ ヒント：どんな範囲の rate を表現する必要があり、i64 がどれだけ保持できるかを考える。

（答え：**i64 max は ~9.2e18。** \`RATE_SCALE = 1e9\` で、\`1e18\` の raw 値は \`1e9\`（10 億）を表す。Funding rate は 10 億のレンジは不要 — 典型的に interval ごとに \`0.0001\` から \`0.04\` 程度。**\`RATE_SCALE = 1e9\` で 9 桁の精度 + 巨大なヘッドルーム**：\`40_000_000\`（\`0.04\`、HL のキャップ）は \`i64::MAX\` から 11 桁下。\`1e12\`（parts-per-trillion）にすれば精度は得るがヘッドルームを失う — \`1e12\` スケールの値 2 つの積に \`i256\` が要る。\`1e6\` だと実質的なヘッドルームを節約せず、funding rate が \`0.0001%\` = \`10\` ppb のとき意味ある精度を失う。**\`1e9\` が i64 での固定小数点 rate のスイートスポット。**）

## 手順

### Step 1: Cargo.toml を更新

\`crates/funding/Cargo.toml\` を開く。現状：

\`\`\`toml
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
\`\`\`

これに更新：

\`\`\`toml
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
\`\`\`

2 つの変更：

1. **\`openhl-clob = { path = "../clob" }\`** を \`[dependencies]\` に。Funding crate は \`openhl-clob\` の \`AccountId\` が必要（L3 の \`Position\` で登場）。今 dep を入れておけば L3 で diff が集中する。**コスト：~0** — path dep の宣言は最初の \`use\` まで何も recompile しない。
2. **\`[dev-dependencies]\` ブロック** に \`proptest\`。L4（premium antisymmetry test）と L7（balanced-book zero-sum）で使う。同じロジック：今宣言、後で使う。Production build は proptest を含まない。

> 🛑 **やりがちな勘違い。** 「テストでも使うから \`openhl-clob\` を dev-dependency にしてもよくない？」 **production code が \`openhl_clob::AccountId\` を \`Position\` で使うから、test だけじゃない。** \`AccountId\` が test only なら dev-dep。Production 型シグネチャの一部なので普通の dep にする必要がある。Dev-deps は「テストが pull するが production が全く触らない」もののみ。

### Step 2: \`src/types.rs\` を作成

\`crates/funding/src/types.rs\` を作成。このファイルはまだ存在しない — このレッスンで新規。初期内容：

\`\`\`rust
//! Core types for the funding state machine.
//!
//! Pure data — no I/O, no allocation beyond what's needed for settlements.
//! Every type is \`Copy\`-friendly (or, in the case of \`Position\`, \`Clone +
//! Copy\`) so callers can pass snapshots without lifetime gymnastics.
//!
//! ### Why fixed-point integers, not floats
//!
//! Consensus determinism — every validator must compute the *same* funding
//! rate from the *same* inputs. Float arithmetic gives different bit patterns
//! across compilers and CPUs (FMA, rounding mode, denormal handling); the
//! moment two validators disagree on a single LSB they fork. We use signed
//! integers scaled by [\`RATE_SCALE\`] (parts-per-billion) for rates and
//! premiums, and a separate \`Notional\` type for quote-currency deltas.

/// Scale factor for [\`FundingRate\`] and [\`Premium\`]. A raw value of
/// \`RATE_SCALE\` represents \`1.0\` (i.e., 100%). With \`1e9\` we get 9 decimal
/// digits of precision — more than enough for funding rates that typically
/// sit in the ±0.01% to ±0.05% per interval band.
pub const RATE_SCALE: i64 = 1_000_000_000;
\`\`\`

この 15 行のファイルで注目する 4 点：

1. **Module doc に「Why fixed-point integers, not floats」セクション。** これが crate 全体の load-bearing な理由付け。6 ヶ月後に \`types.rs\` を読む次のエンジニアは、この説明を最上部で見る必要がある — コミットメッセージに埋もれているのでなく。
2. **\`[\`FundingRate\`]\` と \`[\`Premium\`]\` のクロス参照。** これらの型はまだ存在しない（L2 / L3）。L1 ビルド中 rustdoc がリンク切れ warning を出す。**Warning を許容する** — L2/L3 で型を追加すれば解決する。Warning ゼロにしたいなら \`[\`FundingRate\`]\` でなく \`[FundingRate]\`（バックティックなし）でプレーンに書く — だがクロス参照スタイルがソースの慣習。
3. **\`pub const RATE_SCALE: i64 = 1_000_000_000\`** — \`u64\` でなく \`i64\`。Rate と premium は*符号付き*（longs 支払い = 正の premium、shorts 支払い = 負）。符号付き整数なら \`compute.rs\` の演算で符号チェック不要、\`i128\` 中間値が積を自然に吸収する。
4. **Doc が \`1.0\` = \`100%\` と言う。** これは会計単位の決定。\`RATE_SCALE\` 生値（1e9）は interval ごとに 100% の funding rate を意味する。\`40_000_000\` は 4%。\`1_000_000\` は 0.1%。**「1 単位 notional の parts-per-billion」として読む。**

> 🛑 **やりがちな勘違い。** 「\`f64\` を使って validator 間で共有する前に結果を丸めればよくない？」 **No が 2 つの理由。** (1) 中間計算が最終の丸めより先に divergent。その時点で被害は出ている。(2) 「N 桁に丸める」自体が float ops で、丸め挙動が異なる。**Float 非決定性からの脱出ハッチで整数より単純なものはない。**

### Step 3: \`src/lib.rs\` を更新

\`crates/funding/src/lib.rs\` を開く。現在は空（\`e69de29\` blob）。これに置き換え：

\`\`\`rust
//! \`openhl-funding\` — funding-rate state machine.
//!
//! Pure state machine: no I/O, no async, no networking. Funding is applied
//! deterministically on a fixed cadence (see [\`FundingClock\`]); every tick is
//! a pure function over \`(now, mark, index, positions)\` → settlements.
//!
//! ### Hyperliquid-shape funding, in one paragraph
//!
//! Perpetual contracts don't expire, so the mark price can drift arbitrarily
//! from the spot ("index") price. Funding payments push it back: when mark >
//! index (longs are overpaying), longs pay shorts; when mark < index, shorts
//! pay longs. The premium \`(mark - index) / index\` is divided by a
//! per-day-interval count (HL: 8 — one settlement every 3 hours) to derive a
//! per-interval rate, capped at a network-set absolute max. At each tick
//! every account with an open position settles \`position_size * mark * rate\`
//! in quote currency.
//!
//! Integration with the rest of openhl happens at the EVM bridge: settlement
//! deltas become balance updates that the bridge bundles into payloads. That
//! integration lives in \`crates/evm/\`; the rate math and tick gating are here.

pub mod types;

pub use types::RATE_SCALE;
\`\`\`

L11 終了時点版と比べて欠けているもの：\`pub mod clock\`、\`pub mod compute\`、残りの \`pub use types::{...}\` re-export。それらは L4-L10 でモジュールを追加するたびに来る。**L1 lib.rs はコンパイルする最小限。**

クレートレベル doc（\`//! ...\`）が説明：
- これは純粋な state machine。I/O なし。
- 1 段落の HL funding recap — context なしに crate root に landing した読者向け。
- 統合がどこで起きるか（ここでなく bridge）。

クロス参照 \`[\`FundingClock\`]\` は L8 が追加するまで壊れている。types.rs のクロス参照と同じ扱い。

> 🛑 **考えてみよう。** ここに \`pub mod compute;\` を書いたが \`compute.rs\` を作らなかったらどうなる？ ヒント：\`pub mod foo;\` が実際に何をするか考える。

（答え：**コンパイルエラー。** \`pub mod compute;\` はコンパイラに「同じディレクトリの \`compute.rs\` または \`compute/mod.rs\` を探せ」と告げる。どちらもなければ \`error[E0583]: file not found for module 'compute'\`。だから \`pub mod\` 宣言は*各ファイルを作るタイミングで*追加する — 一度にすべてではなく。）

### Step 4: コンパイル

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

期待出力：

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to \`FundingRate\`
warning: unresolved link to \`Premium\`
warning: unresolved link to \`FundingClock\`
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.5s
\`\`\`

3 つの rustdoc warning（unresolved link）。期待通り — リンクされた型は L2/L3（types.rs）と L8（clock.rs）で来る。**3 つすべて L11 までに解決する。** \`#[allow(rustdoc::broken_intra_doc_links)]\` で抑制しないこと — 「まだ X が要る」というインジケータとして有用。

よくあるエラー：

- **\`error[E0463]: can't find crate for 'openhl_clob'\`** — Cargo.toml の \`openhl-clob = { path = "../clob" }\` 行を忘れた。L1 コードで \`openhl_clob\` を使わないが、L3 を先取りして \`use openhl_clob::AccountId\` を types.rs に dep なしで入れたらこれが出る。
- **\`error[E0583]: file not found for module 'clock'\`** または \`'compute'\` — \`pub mod clock;\` を lib.rs に先取り追加。削除する。L8 で戻す。
- **\`error: failed to parse manifest\`** — Cargo.toml の syntax。\`[dev-dependencies]\` ブロックを \`[dev-dependences]\` と typo していないかチェック。

## 設計の振り返り

このレッスンに焼き込まれた決定 3 つ：

1. **\`RATE_SCALE = 1e9\` は u64 でなく i64。** Rate が signed なので signed。\`compute.rs\` の演算は \`i128\` 中間値で積を吸収する。\`u64\` は何の利得もなく符号処理を複雑化する。

2. **Module doc コメントは理由付け、チュートリアルではない。** 「Why fixed-point integers, not floats」段落がこの設計が*なぜ*存在するかを説明。6 ヶ月後に \`types.rs\` に landing する読者には*なぜ*が必要 — *どう*はコード自体にある。**Doc コメントは将来の読者が問う質問を先回りしたとき価値を生む。**

3. **\`pub use types::RATE_SCALE\` をクレートルートに。** 呼び出し側は \`use openhl_funding::types::RATE_SCALE;\` でなく \`use openhl_funding::RATE_SCALE;\` と書ける。短いパスが canonical、モジュールパスは内部。**呼び出し側が実際に使うものはクレートルートで re-export。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/Cargo.toml ./crates/funding/Cargo.toml
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

L1 後：
- **Cargo.toml** が Stage 8b と完全一致。
- **types.rs** が Stage 8b の types.rs の*最初 ~30 行*に一致 — module doc + \`RATE_SCALE\`。それ以下（型定義）は L2/L3。
- **lib.rs** が Stage 8b の lib.rs より短い — \`pub mod types;\` + 1 つの \`pub use\` だけ。他の module 宣言と re-export は後のレッスン。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: L1 にテストがないのに \`[dev-dependencies] proptest\` を今宣言する理由は？**
Cargo.toml が単一の diff target だから。L4 で proptest を追加すると Cargo.toml を 2 回触ることになる。L1 で 1 回だけやればこのレッスン後にファイルが変わらない。**Cargo.toml の安定性は小さな unused dep 宣言の価値がある。**

**Q: 「parts-per-billion」解釈は実際どうなる？**
Funding rate の生値 \`1_250_000\` は \`0.00125\`（interval ごとに 0.125%）。「1,000,000,000 のうち 1,250,000」 — つまり 0.125%。HL の 1 日 8 回 settlement と 4% cap で、実際に見る値の範囲は \`±40_000_000\` raw = \`±4%/interval\` = 最悪ケース \`±32%/day\`。**すべて i64 で快適に表現可能。**

**Q: 後で \`RATE_SCALE\` を変えて consumer を壊さずに済むか？**
**No。** \`RATE_SCALE\` はチェーン consensus 定数。永続化された全 balance、全歴史的 settlement、全テストフィクスチャが \`RATE_SCALE = 1e9\` で calibrated。変更には coordinated network upgrade が必要。**Deployment 後は immutable と扱う。** だからクレート開始時に一度、\`const\` で設定する。

**Q: なぜ \`RATE_SCALE\` のテストがない？**
何を assert する？ \`assert_eq!(RATE_SCALE, 1_000_000_000)\` は同義反復 — 定数を自分自身と比較。定数の意味は*他の*コードがどう使うかで生きる。**L2 の最初の money type が最初の意味あるテストを得る。**

## 次のレッスン（L2）

L2 で 4 つの「money type」を追加 — \`MarkPrice\`、\`IndexPrice\`、\`Premium\`、\`Notional\`。それぞれがプリミティブをラップする newtype。教育の焦点が「なぜ固定小数点」から「なぜ newtype」へシフト：偶然のクロスフィード防止（例：\`MarkPrice\` 期待のところに \`IndexPrice\` を渡す）。4 つの型が \`types.rs\` に ~30 行を追加して、残りの型（L3）が従う newtype パターンを実証する。`,
                },
                {
                  title: "レッスン 2 — Money 型 — price、premium、notional の newtype",
                  slug: "openhl-funding-money-types-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 2 — Money 型 — price、premium、notional の newtype

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

…が引き続きコンパイルされる。\`types.rs\` が \`RATE_SCALE\` だけから \`RATE_SCALE\` + 4 つの newtype に成長：

- **\`MarkPrice(pub u64)\`** — 永久先物の mark price、最小単位。価格は負になりえないので unsigned。
- **\`IndexPrice(pub u64)\`** — オフチェーンオラクル参照価格。同じ形、違う*意味*。
- **\`Premium(pub i64)\`** — 符号付き \`(mark - index) / index\`、\`RATE_SCALE\` スケール。Longs が overpay のとき正。
- **\`Notional(pub i64)\`** — 符号付き quote-currency delta。正 = アカウント受取、負 = 支払い。

それぞれ \`Copy + Default + PartialEq + Eq + PartialOrd + Ord + Hash + Debug\`。まだテストなし — これらの型はラッパー以上の挙動を持たない。**L4 の \`compute_premium\` がこれらの型をバグを含みうるコードで初めて exercise するレッスン。**

このレッスンの教育要点は数学ではない — **newtype パターン**。なぜ \`u64\` を直接使わずラップするか？ L2 がその答えを 4 つの具体型で実演する。

## おさらい

L1 後：
- \`RATE_SCALE = 1_000_000_000\` が load-bearing 定数。
- \`types.rs\` が module doc + \`RATE_SCALE\` で存在。
- \`lib.rs\` がクレートルートで \`RATE_SCALE\` を re-export。

L2 で \`types.rs\` を実際の型の最初の半分（「money」の半分）で埋める。L3 が後半（position、settlement、params）を埋める。

## プラン

2 つの編集：

1. **\`crates/funding/src/types.rs\`** — \`RATE_SCALE\` の後ろに 4 つの newtype を append。Doc コメントが各型の役割 + encode する不変条件を説明。
2. **\`crates/funding/src/lib.rs\`** — \`pub use types::{...}\` 行を 4 つの新型を re-export するよう拡張。

それだけ。\`compute.rs\` なし、\`clock.rs\` なし、テストなし。**純粋な型定義。**

> 🛑 **考えてみよう。** スクロール前に — 今から \`pub struct MarkPrice(pub u64);\` を定義する。なぜ内部フィールドが \`pub\`？ Private にして \`#[must_use] pub fn new(v: u64) -> Self\` コンストラクタにしたらどうなる？ ヒント：\`compute.rs\` の呼び出し側が何を必要とするかを考える。

（答え：**\`compute.rs\` の呼び出し側が生値で演算する必要がある** — \`i128::from(mark.0) - i128::from(index.0)\`。フィールドを private + \`.value()\` getter にすると、どこでも \`mark.0\` でなく \`mark.value()\` を要求する。**\`pub\` 内部フィールドは、純粋にクロスフィードを防ぐためだけに存在する newtype に対する openhl 慣習** — 検証なし、型システム以上の不変条件なし。\`clob::Price(pub u64)\` と \`clob::Qty(pub u64)\` を比較 — 同じ形、同じ理由。**Newtype の仕事は \`compute_premium(index, mark)\` を型エラーにすること、値を検証することではない。**）

## 手順

### Step 1: 4 つの newtype を \`types.rs\` に append

\`crates/funding/src/types.rs\` を開く。既存の \`RATE_SCALE\` 定数の後ろに追加：

\`\`\`rust
/// Mark price in minor units. Same scale convention as \`clob::Price\`, but a
/// distinct type so callers can't accidentally feed an orderbook price into
/// the funding math where an index/oracle price is expected.
///
/// \`MarkPrice\` is a single u64 not a signed-fixed-point, because prices are
/// always positive (zero or negative price would be a system invariant
/// violation handled upstream, not here).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MarkPrice(pub u64);

/// Index price (off-chain oracle reference). Same scale as \`MarkPrice\`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct IndexPrice(pub u64);

/// Premium = \`(mark - index) / index\`, scaled by [\`RATE_SCALE\`].
///
/// Sign convention: positive when mark > index (longs are overpaying,
/// funding will be positive → longs pay shorts).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Premium(pub i64);

/// Signed quote-currency delta. Positive = account receives, negative =
/// account pays. Funding settlement produces one [\`Notional\`] per non-flat
/// position per tick.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Notional(pub i64);
\`\`\`

4 つの型、各 ~5 行。各々に焼き込まれたものを順に：

#### \`MarkPrice(pub u64)\` — 符号付き価格に反対する立場

なぜ \`i64\` でなく \`u64\`？ Funding 数学に*負の価格*は意味を持たないから。Spot や perp 価格がゼロを下回るのは、funding crate に到達してはいけないシステム不変条件違反 — もし到達したら、正しい対応は「上流レイヤーが壊れている、停止して調査」、「負の価格に対して funding を計算する」ではない。

Doc がそれを明示：*「zero or negative price would be a system invariant violation handled upstream, not here」*。ここに線を引くのが正しい。**Funding crate は入力が well-formed と信頼する、再検証しない。** どこでも再検証はよくある over-engineering の間違い。Funding crate の仕事は数学であって入力サニタイゼーションではない。

> 🛑 **やりがちな勘違い。** 「せめて \`MarkPrice(0)\` でエラーを返すべきでは？」 **No。** \`MarkPrice(0)\` は「genuinely zero spot price を持つアセット」（極端 tail、稀だが現実）か「オラクルがまだ価格を配信していない」（boot state）のどちらかでありえる。Compute_premium が後者を明示的に扱う（\`index == 0\` のとき \`Premium(0)\` を返す）。前者は十分稀で、正しい行動は zero funding を settle すること — それが \`compute_premium\` が自然に生むもの。**Error path 不要。**

#### \`IndexPrice(pub u64)\` — 同じ形、違う*意味*

\`IndexPrice\` は構造的に \`MarkPrice\` と同一。同じフィールド、同じ derive、同じ範囲。**違いは純粋に型システム上のもの。** 関数シグネチャ \`compute_premium(mark: MarkPrice, index: IndexPrice) -> Premium\` は \`compute_premium(IndexPrice(100), MarkPrice(100))\` をコンパイル時に拒否する。Newtype なしだと両引数が \`u64\`、引数順バグは静かに反転した premium を生む。

**これが newtype パターンの存在意義そのもの。** 型あたり ~5 行のコストで、*production まで invisible だったはずのバグクラス*を防ぐ。

> 🛑 **やりがちな勘違い。** 「型エイリアスでよくない？ \`type MarkPrice = u64; type IndexPrice = u64;\`」 **No — 型エイリアスは新しい型を作らない**、既存の型をリネームするだけ。\`type MarkPrice = u64\` と \`type IndexPrice = u64\` は両方 \`u64\`、\`compute_premium(some_index, some_mark)\` が静かにコンパイルする。**型エイリアスは documentation、安全性ではない。** 可読性が落ちる長いジェネリック型に使う（\`type FillSink = Arc<Mutex<Vec<Fill>>>\`） — 意味的に異なる値を区別するためではない。

#### \`Premium(pub i64)\` — なぜ符号付きか

Mark < index のとき premium は負になりうる（shorts が overpay）。符号付き表現は残りの数学を明示的な符号処理なしで流れさせる：\`compute_premium\` が符号付き数を返す、\`compute_rate\` がそれを除算 + clamp、\`apply_funding\` が settlement に乗算。**どこの時点でも「これはどっち向き？」をチェックする必要がない** — 符号が答えを運ぶ。

Doc が言う：*「Sign convention: positive when mark > index (longs are overpaying, funding will be positive → longs pay shorts)」*。これは load-bearing な行。下流コードを読む人はこの規約を覚える必要がある。**符号規約を名指す doc コメントが、「正しい数学」と「毎回再導出する必要のある数学」を分ける。**

#### \`Notional(pub i64)\` — *アカウント*視点で符号付きの quote-currency delta

\`Notional\` は単一の settlement での単一アカウントの quote balance への変化を表す。符号規約：*正 = アカウント受取、負 = アカウント支払い*。だから正の funding rate でロングポジションは \`Notional(負)\`、ショートポジションは \`Notional(正)\` を生む。

**符号はアカウント視点**、市場視点ではない。これは bridge integration レイヤー（course 10）で重要になる — \`Notional(-12)\` が「このアカウントの quote balance から 12 を引く」になる。Market 中心の符号なら bridge が適用前にフリップする必要がある。

### Step 2: \`lib.rs\` re-export を更新

\`crates/funding/src/lib.rs\` を開く。現在の \`pub use\` 行：

\`\`\`rust
pub use types::RATE_SCALE;
\`\`\`

これに変更：

\`\`\`rust
pub use types::{IndexPrice, MarkPrice, Notional, Premium, RATE_SCALE};
\`\`\`

import はアルファベット順 — Stage 8b の lib.rs と同じ。呼び出し側は：

\`\`\`rust
use openhl_funding::{MarkPrice, IndexPrice};
\`\`\`

と書ける。これでなく：

\`\`\`rust
use openhl_funding::types::{MarkPrice, IndexPrice};
\`\`\`

**呼び出し側が実際に使うものはすべてクレートルートで re-export。** モジュールパスは内部。

> 🛑 **やりがちな勘違い。** 「\`pub use types::*\` で全部 re-export すれば？」 **できる、だが内部型リストが public API surface に漏れる。** 今 \`types.rs\` に 4 つの型がある。将来 \`internal_FillSinkCachedView\` のような private helper を追加して \`pub\` 修飾を忘れたら、\`pub use types::*\` が静かにそれを露出させる。**Explicit re-export が public API のチェックリスト。** 各 re-export 名が意図的な決定。

### Step 3: コンパイル

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

期待出力：

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to \`FundingRate\`
warning: unresolved link to \`FundingClock\`
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

Rustdoc warning が 2 つに（L1 の 3 つから減少）。\`RATE_SCALE\` の doc の \`[Premium]\` リンクが解決、\`[FundingRate]\` と \`[FundingClock]\` リンクはまだ未解決。**期待通りの進捗** — L3 が \`FundingRate\` を追加して 2 つ目の warning を解消する。

よくあるエラー：

- **\`error[E0381]: missing field 'value' in initializer of MarkPrice\`** — 内部フィールドの \`pub\` を忘れて \`MarkPrice(pub u64)\` でなく \`MarkPrice { value: u64 }\` と書いた。openhl 慣習通り tuple-struct 形式を使う。
- **\`error[E0277]: 'i64' is not 'u64'\`** — \`Premium(pub i64)\` でなく \`Premium(pub u64)\` と書いた。Premium は符号付き、内部型をチェック。
- **Derive が欠ける** — derive の 1 つを忘れた。完全な集合は \`Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash\`。\`Default\` は L4 fixture builder の一部が \`MarkPrice::default()\` を使うので必要。

## 設計の振り返り

このレッスンに焼き込まれた決定 3 つ：

1. **生プリミティブや型エイリアスでなく newtype パターン。** 型あたり ~5 行のコストで、見えない引数順バグを compile time で防ぐ。**高コストバグクラスへの安価な保険。**

2. **公開内部フィールド（\`pub u64\`）。** 検証はこの crate の仕事ではない、クロスフィード防止が仕事。内部フィールドが \`pub\` なのは \`compute.rs\` で演算を ergonomic に保つため。**Newtype は型混乱から守る、悪い値からではない。**

3. **符号規約は型定義の doc コメントに住む。** 「Mark > index で正、longs が shorts に支払う」 — \`Premium\` の doc のこの文が符号規約の単一情報源。すべての consumer がそれに依存。**符号規約は数値型のうち最も誤記憶されやすい部分 — 定義場所の doc に pin する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

L2 後：
- **types.rs** が Stage 8b の \`Notional\` まで一致（最初の 4 newtype）。次の型 — \`FundingRate\`、\`PositionSize\`、\`Position\`、\`Settlement\`、\`FundingParams\` — は L3。
- **lib.rs** に 4 型の re-export。Stage 8b の完全な re-export はあと 5 つの名前を加える（\`FundingParams\`、\`FundingRate\`、\`Notional\` は既にある、\`Position\`、\`PositionSize\`、\`Settlement\`）。全部 L3。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`MarkPrice\` / \`IndexPrice\` は \`u64\` だが \`Premium\` / \`Notional\` は \`i64\`？**
価格は常に正だから（負の価格はシステム不変条件違反）、**だが premium と notional は負になりうる**。Mark < index のとき premium は負。アカウントが支払うとき（vs 受け取る）notional delta は負。符号付き整数が両方向を自然に表現する、符号なしだと別の「方向」フィールドか型のペアが必要。

**Q: これらの型に \`Default\` がある理由は？ デフォルト値がいつ有用？**
\`Default::default()\` は \`MarkPrice(0)\`、\`Premium(0)\` 等を返す。Test fixture で有用：\`let mark: MarkPrice = Default::default();\` は \`MarkPrice(0)\` より短い。これらの型を使う containing struct に \`#[derive(Default)]\` を可能にする。**安価な derive、挙動コストなし。**

**Q: \`Premium\` と \`Notional\` は \`Add\` / \`Sub\` / \`Mul\` を実装すべき？**
誘惑的 — \`Premium(5) + Premium(3) == Premium(8)\` は綺麗。だが Stage 8b は実装しないことを選んだ：\`compute.rs\` の数学演算は overflow safety のため \`i128\` に upcast する必要がある、\`Premium\` に \`Add\` を提供すると呼び出し側がそれを i128 ダンスなしで使う誘惑が出る。**Crate の API 契約は：内部フィールドで明示的な i128 upcast 付きで演算する。** 型に演算 op がないほうがその契約を強制しやすい。

**Q: なぜこれらの型のテストがない？**
何を assert する？ \`assert_eq!(MarkPrice(100), MarkPrice(100))\` は \`PartialEq\`（derive）をテストする。\`assert_eq!(MarkPrice(100).0, 100)\` は pub フィールド（言語機能）をテストする。**プリミティブをラップするだけの newtype に testable な挙動はない。** L4 の \`compute_premium\` でこれらの型がバグを含みうるコードに参加し始める。

## 次のレッスン（L3）

L3 で型の roster を完成：\`FundingRate(i64)\`、\`PositionSize(i64)\`、\`Position { account, size }\`、\`Settlement { account, delta }\`、\`FundingParams { interval_secs, rate_cap, divisor }\`。教育の焦点が「newtype パターン」から「パラメータオブジェクトパターン」（\`FundingParams\`）と **HL スタイルのデフォルト** — なぜ 1 日 8 settlement、なぜ 4% cap — にシフト。\`Position\` 構造体が L1 の Cargo.toml で設定した \`openhl_clob\` の \`AccountId\` 依存を導入する。`,
                },
                {
                  title: "レッスン 3 — Position 型 — roster 完成 + HL デフォルト",
                  slug: "openhl-funding-position-types-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン 3 — Position 型 — roster 完成 + HL デフォルト

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

…が引き続きコンパイル、rustdoc warning ゼロ。\`types.rs\` が**完成** — Stage 8b の roster 9 型すべてが配置：

- **\`FundingRate(pub i64)\`** — divisor + cap 後の per-interval rate。\`Premium\` と同じスケール。
- **\`PositionSize(pub i64)\`** — 符号付き：正 = long、負 = short、ゼロ = flat。
- **\`Position { account, size }\`** — アカウントごとのスナップショット。\`openhl_clob::AccountId\` 依存を発火。
- **\`Settlement { account, delta }\`** — \`apply_funding\` の出力：誰が支払う/受け取る、いくら。
- **\`FundingParams { interval_secs, rate_cap, divisor }\`** + \`hyperliquid_default()\` — HL シェイプのデフォルト付きネットワークレベル設定。

これで **Module 1** が閉じる。L3 後：
- 全型定義済み、まだ挙動なし。
- Rustdoc クロス参照が解決（「unresolved link」warning なし）。
- Crate は純粋な data-types ライブラリ — ドキュメントとして有用、まだ数学はしない。

**Module 2 (L4-L7) で純粋な compute を開始** — \`compute_premium\`、\`compute_rate\`、\`apply_funding\`。最初のテストもそこに来る。

このレッスンの教育要点は **parameter-object パターン**と HL デフォルトの根拠。なぜ 3 つのパラメータを \`FundingParams\` 構造体にまとめる、positional 引数で渡さないか？ なぜ 1 時間間隔、なぜ 4% cap、なぜ divisor 8？

## おさらい

L2 後：
- 4 つの money newtype（\`MarkPrice\`、\`IndexPrice\`、\`Premium\`、\`Notional\`）が定義済み。
- \`types.rs\` が module doc + \`RATE_SCALE\` + 4 型。
- \`lib.rs\` が 5 つの名前を re-export（定数 + 4 型）。
- 未解決 rustdoc warning が 2 つ残る（\`FundingRate\`、\`FundingClock\`）。

L3 で 5 型を追加（型 roster を閉じる）+ \`openhl_clob::AccountId\` import。

## プラン

3 つの編集：

1. **\`crates/funding/src/types.rs\`** — 先頭に \`openhl_clob::AccountId\` import を追加、5 つの型定義（\`FundingRate\`、\`PositionSize\`、\`Position\`、\`Settlement\`、\`FundingParams\` + \`hyperliquid_default\`）を append。
2. **\`crates/funding/src/lib.rs\`** — re-export を 9 名前全部を含むよう拡張。
3. **検証**：\`cargo build -p openhl-funding\` が **warning ゼロ**でコンパイル。

> 🛑 **考えてみよう。** スクロール前に — 今から \`FundingParams { interval_secs: u64, rate_cap: FundingRate, divisor: u32 }\` を定義する、\`compute_rate(premium, interval_secs, rate_cap, divisor)\` でなく。**なぜこの 3 値を struct にまとめる？** ヒント：\`compute_rate\` の call site がいくつあり、後で 4 つ目のパラメータを追加したら何が起きるかを考える。

（答え：**Parameter-object パターンが call site の安定性を config 進化を跨いで保つ。** \`compute_rate(premium, params)\` は positional 引数 1 + struct 1。後で \`min_settlement_threshold\` を funding config に追加するとき、関数シグネチャは \`compute_rate(premium, params)\` のまま — \`FundingParams\` 構造体だけが成長。Positional 版 \`compute_rate(premium, interval, cap, divisor)\` だと新パラメータごとに全 call site が壊れる。今 < 5 call site（clock + テスト）なら cost は控えめ、成熟したコードベースの 50+ なら parameter object が必須。**安定したグループの値を一緒にバンドルする、グループ自体がドメイン概念のとき** — 「funding 設定」がそういう概念の 1 つ。）

## 手順

### Step 1: \`AccountId\` import を追加

\`crates/funding/src/types.rs\` の先頭、module doc の後、\`pub const RATE_SCALE\` の前に：

\`\`\`rust
use openhl_clob::AccountId;
\`\`\`

この import は L1 の Cargo.toml で設定済み（\`openhl-clob = { path = "../clob" }\` dep）。\`Position\` と \`Settlement\` が \`AccountId\` を struct field type として参照するのでここで発火。

> 🛑 **やりがちな勘違い。** 「呼び出し側が \`openhl-clob\` から import せずに済むよう、\`openhl-funding\` から \`AccountId\` を re-export すべき？」 **No — それは我々のものではない。** \`AccountId\` は \`openhl-clob\` の型で、呼び出し側は定義場所から import すべき。\`openhl-funding\` 経由で re-export すると同じ物に 2 つの import path（\`openhl_clob::AccountId\` vs \`openhl_funding::AccountId\`）ができ、依存関係を obscure する。**自分の型は re-export する、呼び出し側が依存物の型は直接 import させる。**

### Step 2: \`Premium\` の後ろに \`FundingRate\` を append

既存の \`Premium\` 定義の後ろに：

\`\`\`rust
/// Per-interval funding rate. Same scale as [\`Premium\`]; positive means
/// longs pay shorts. A rate of \`RATE_SCALE / 100\` = 1% per interval.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct FundingRate(pub i64);
\`\`\`

\`FundingRate\` は構造的に \`Premium\` と同一 — 同じ \`i64\`、同じ derive。**型エイリアスでなく別の型である理由は、funding pipeline で異なる概念を表すから。** Premium は*生*の mark/index dislocation、rate は divisor + clamp 後に positions に*適用*される。Premium を消費するコード（\`compute_rate\`）は rate（post-processed）を受け入れるべきでない、rate を消費するコード（\`apply_funding\`）は premium（まだ clamp されていない）を受け入れるべきでない。

**同じ形、違う役割、別の型。** これが newtype パターンが \`MarkPrice\` vs \`IndexPrice\` でやっていることそのもの。

### Step 3: \`PositionSize\` を append

\`FundingRate\` の後ろに：

\`\`\`rust
/// Signed position size in base units. Positive = long, negative = short,
/// zero = flat. Accounts with zero size aren't included in settlement
/// snapshots — see [\`Position\`].
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct PositionSize(pub i64);
\`\`\`

1 つの符号付き整数が 3 状態を運ぶ：long（\`> 0\`）、short（\`< 0\`）、flat（\`== 0\`）。2 フィールド表現と比較：

\`\`\`rust
// 冗長な代替 — 我々が使うものではない：
pub struct PositionSize {
    pub direction: Direction,  // Long, Short, Flat
    pub magnitude: u64,
}
\`\`\`

符号付き整数表現は**より小さく**（8 バイト vs ~16+）、**より速く**（hot path で enum dispatch なし）、**数学レイヤーで単純**（\`size.0\` で乗算するだけ、符号が自然に伝播）。トレードオフ：内部値の符号が implicit。Doc コメントが明示：*「正 = long、負 = short、ゼロ = flat」*。

**「Accounts with zero size aren't included in settlement snapshots」というノートは load-bearing。** \`apply_funding\` がゼロサイズ position をフィルタする — 経済的エクスポージャがないので、settle してもゼロ delta が noise を増やすだけ。L7 でそのフィルタを見る。

### Step 4: \`Position\` を append

\`\`\`rust
/// A single account's net position on the market. The funding state machine
/// treats positions as a per-tick *snapshot* — it never owns or mutates
/// them. The owning layer (vault / clearing) is responsible for tracking
/// \`Position\` over time and producing snapshots at each tick.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Position {
    pub account: AccountId,
    pub size: PositionSize,
}
\`\`\`

2 つのフィールド、両方 public。\`account\` で settlement 出力がどのバランスをクレジット/デビットすべきか分かる。\`size\` で rate-application 数学が delta を計算できる。

**重要：\`entry_price\` なし、\`realized_pnl\` なし、\`unrealized_pnl\` なし。** Funding state machine は position がどう open されたか、PnL がどうかを知る必要はない — *現在のサイズ*を*現在の rate* に対して掛けるだけ。**スナップショットが単純なほど、上流でスナップショットを作るのが楽。**

> 🛑 **やりがちな勘違い。** 「先物の損益計算のため \`Position\` は entry price も持つべきでは？」 **No — それは owning layer の仕事。** Vault や clearing layer が entry price を追跡、unrealized PnL を計算、等。Funding crate はそれの下流：*現在*の position のスナップショットを受け、*現在*の funding を適用する。**スナップショット型は narrow に保つ、owning layer がすべてを含む wider な型を持てばよい。**

Doc コメントが ownership 境界を明示：*「never owns or mutates them. The owning layer is responsible...」* — これが funding crate と呼び出し側の契約。

\`Position\` に \`Default\` なし — \`AccountId::default()\` は \`AccountId(0)\` で、ほとんどのアカウントシステムで reserved/sentinel。**Entity-identity-bearing 構造体の偶発的なデフォルト構築を許してはいけない。**

### Step 5: \`Settlement\` を append

\`\`\`rust
/// Output of applying a funding rate to one position. The bridge layer
/// translates these into balance updates against each account's quote
/// balance.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Settlement {
    pub account: AccountId,
    pub delta: Notional,
}
\`\`\`

\`Settlement\` は \`apply_funding\` の出力型：非 flat position あたり 1 つ。アカウント ID を運ぶ（bridge が誰か知るため）、delta を運ぶ（bridge がいくらか知るため）。

**なぜ \`Settlement\` が position 順インデックスでなく \`account\` を再度運ぶ？** \`apply_funding\` がゼロサイズ position をフィルタするので、入力 position リストと出力 settlement リストの*長さが異なる*。Position 順インデックスは呼び出し側がどの position が非ゼロだったか覚えるよう要求する、出力でアカウント ID を運ぶことで分離できる。

**これが parallel-array vs struct-array トレードオフ** — Stage 8b は struct-array を選んだ。コストは settlement あたり冗長な \`AccountId\` 1 つ、メリットは呼び出し側がインデックス対応を維持する必要がない。

### Step 6: \`FundingParams\` + \`hyperliquid_default\` を append

\`\`\`rust
/// Network parameters that govern funding cadence and magnitude.
///
/// \`divisor\` represents "settlements per day": HL settles 8 times per day,
/// so \`premium / 8\` is the per-interval rate. Higher divisor → smaller rate
/// per tick (and inverse: lower divisor concentrates the same daily target
/// rate into fewer payments).
///
/// \`rate_cap\` is the absolute maximum |rate| per interval. Production
/// networks set this to bound the worst-case payment an extreme oracle
/// dislocation can produce. Zero \`rate_cap\` disables funding entirely.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FundingParams {
    pub interval_secs: u64,
    pub rate_cap: FundingRate,
    pub divisor: u32,
}

impl FundingParams {
    /// Hyperliquid-style defaults: 1-hour interval, ±4%/hour cap, 8× divisor.
    /// 8× divisor with a 1-hour interval means the *target* daily premium
    /// would be applied across 24 hours' worth of ticks at 1/8 of the premium
    /// each — i.e., 24/8 = 3× the premium per day. That asymmetry is
    /// intentional: HL caps more aggressively than the divisor alone implies.
    #[must_use]
    pub const fn hyperliquid_default() -> Self {
        Self {
            interval_secs: 3600,
            // 4% per interval = 40_000_000 ppb (since 0.04 × 1e9 = 4e7).
            rate_cap: FundingRate(40_000_000),
            divisor: 8,
        }
    }
}
\`\`\`

3 フィールド、すべて \`pub\` — newtype と同じ理由（\`compute_rate\` がすべて直接必要）。

#### 各 HL デフォルトの理由

- **\`interval_secs: 3600\`** — 1 時間。HL は毎時 settle、Binance Futures は 8 時間ごと。1 時間 cadence は basis dislocate のときトレーダーが funding 圧力を素早く感じる程度に短く、block time noise が支配しない程度に長い。
- **\`rate_cap: FundingRate(40_000_000)\`** — 4%/interval。1 日 24 interval で最悪 \`±96%/day\`、下の divisor で実効最悪はずっと低い。Cap は oracle 騒動への*保険ポリシー*：indexを 50% 一時的に動かせる攻撃者は 1 tick で longs から 50% 抜けない。
- **\`divisor: 8\`** — 1 日 8 settlement（HL の spec）、だが **24** 個の 1 時間 interval にまたがって適用。Doc コメントの算術が load-bearing nuance：\`(premium / 8) × 24 hours = 3 × premium/day\`。**HL の cap は divisor 単体が意味するより厳しい** — divisor が cadence を設定、cap が最悪ケースの支払いを bind。

> 🛑 **考えてみよう。** HL デフォルトでの実効最悪日次支払いは？ ヒント：\`rate_cap = 4%/hour\`、1 日の interval = 24、だが divisor は 8。

（答え：**毎 interval が cap に当たる場合 \`±96%/day\`。** Cap の 4%/*interval* は divisor に関わらず適用される。Divisor は clamp の*前*の per-interval rate にだけ影響する。だから premium が大きすぎて post-divisor rate が 4% を超えると、毎時 4% に clamp、時給 24 回 × 4% = 1 日 96%。実際には、持続的に 4%/interval を clamp させる premium は pathological — HL は歴史的に oracle outage 中にのみそれを見た。**Cap は保険コストの floor、典型的な funding 規模ではない。**）

#### \`hyperliquid_default\` に \`const fn\` の理由

\`const fn\` で \`static DEFAULT: FundingParams = FundingParams::hyperliquid_default();\` を書ける、compile-time 定数が欲しいなら。コストはゼロ（定数の no-arg constructor）、メリットはオプションを保持。

#### \`#[must_use]\` の理由

\`#[must_use]\` は呼び出し側が \`hyperliquid_default()\` を呼んで結果を捨てたら warning を出す。**目的が値を生むこと自体である関数で、結果を捨てるのは常にバグ** — warning が「assign し忘れた」ミスのクラスを捕まえる。

### Step 7: \`lib.rs\` re-export を更新

現在の re-export：

\`\`\`rust
pub use types::{IndexPrice, MarkPrice, Notional, Premium, RATE_SCALE};
\`\`\`

完全リストに置換：

\`\`\`rust
pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
\`\`\`

アルファベット順維持。合計 10 名前（9 型 + \`RATE_SCALE\`）。呼び出し側は \`use openhl_funding::{FundingParams, Position};\` 等と \`types\` モジュール経由せずに書ける。

### Step 8: コンパイル

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

期待出力：

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to \`FundingClock\`
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

**Rustdoc warning が 1 つ残る**（L0 で 3、L1 でも 3、L2 で 2、L3 で 1）。最後の未解決リンクは \`FundingClock\` — L8 で解決。

実際 — rustdoc の link 解決挙動次第で、各 doc コメントの \`[FundingRate]\` と \`[Premium]\` クロス参照は今すべて解決するかも（それらの型は今存在する）。\`cargo doc -p openhl-funding --no-deps\` で確認。正確な warning 数は異なるかも。

よくあるエラー：

- **\`error[E0432]: unresolved import 'openhl_clob::AccountId'\`** — Cargo.toml の dep がない。L1 の \`[dependencies]\` ブロックに \`openhl-clob = { path = "../clob" }\` があるか再確認。
- **\`Settlement\` での \`error: cannot find type 'Notional' in this scope\`** — ローカル型を import していない。\`Notional\` は同じモジュール内、\`use\` 不要、だが型名は正確に綴る必要がある。
- **\`hyperliquid_default\` での \`error: function calls are not allowed in const fn\`** — \`FundingRate::from(40_000_000)\` 等を書いた。Tuple-struct リテラル \`FundingRate(40_000_000)\` を直接使う。

## 設計の振り返り

このレッスンに焼き込まれた決定 4 つ：

1. **\`FundingRate\` は \`Premium\` と同一の形でも別の型。** Newtype パターンが pipeline ステージを強制 — premium が \`compute_rate\` を通らずに positions に適用されることはありえない。**同じ形だが違う役割が newtype の canonical なユースケース。**

2. **\`PositionSize\` は単一の符号付き整数、direction + magnitude ではない。** より小さく、より速く、数学が単純 — そして doc コメントが符号規約の契約。**数学がどうせ使う最も dense な表現を選ぶ。**

3. **\`Position\` はスナップショット型、stateful entity ではない。** Entry price なし、PnL なし、history なし — \`(account, size)\` のみ。Owning layer が state を追跡、funding crate がスナップショットを処理。**下流型は narrow、上流型は wide。**

4. **\`FundingParams\` が単位で変わる config をバンドル。** 常に一緒に旅する 3 値、後でバンドルを拡張しても call site は壊れない。**グループ自体がドメイン概念のとき parameter object。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

L3 後：
- **types.rs** が Stage 8b と**完全**一致 — 9 型すべて + \`RATE_SCALE\` + \`hyperliquid_default\`。
- **lib.rs** が完全な型 re-export 持つ、\`compute\` / \`clock\` re-export だけが欠ける。

**Module 1 完了。** L4 から \`compute.rs\` へシフト — これらの型の上の純粋関数、テスト付き。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`FundingParams::divisor\` は \`u64\` でなく \`u32\`？**
HL の divisor は 8。他の設定は 24（毎時を divisor として 1 度）や 1（1 日 1 度の settlement）に行くかも。Pathological 値でも \`u32::MAX\`（~40 億）から十分下。**\`u32\` で「十分すぎ」、\`u64\` の半分のビットコスト** — そして \`compute_rate\` がどうせ除算で \`i64\` に widen する。小さな最適化、だが \`Copy\` 型は得をする。

**Q: \`FundingParams\` はコンストラクタでフィールド検証すべき？**
誘惑的 — \`interval_secs == 0\` を拒否（division-by-zero か permanent gating の原因）？ \`divisor == 0\` を拒否？ Stage 8b は選ばなかった：コンストラクタでの検証は呼び出し側の input handling とは*別の*検証ポイントを意味し、2 つの間の divergence がバグ源になる。**Input 検証の単一情報源：呼び出し側。** とはいえ \`compute_rate\` は \`divisor == 0\` を「funding 無効化」として扱う — defensive default、validation ではない。

**Q: \`Position\` が \`Eq\` を derive するが \`Default\` を derive しないのは？**
\`Eq\` はテストで position を比較するため（possibly 上流の dedup ロジックでも）。\`Default\` だと \`Position { account: AccountId(0), size: PositionSize(0) }\` で意味不明（\`AccountId(0)\` は典型的に sentinel）。**Default は sensible な値を生むべき、できないなら derive を省く。**

**Q: \`Position\` と \`Settlement\` は冗長では — 両方 \`account\` + value field を持つ？**
似て見えるが、ライフサイクルの異なるステージにある。\`Position\` は \`apply_funding\` の*入力*、\`Settlement\` はその*出力*。Owning layer が \`Position\` を渡して \`Settlement\` を受け取る。**Type レベルでの区別が settlement を position として偶発再適用するのを防ぐ。**

## Module 1 マイルストーン — 築いたもの

L3 後：
- 9 newtype + 1 struct-with-method（\`FundingParams\`）。
- Stage 8b と完全一致の \`types.rs\` ~110 行。
- Funding について語る完全な vocabulary — 数学 pipeline の全値（premium、rate、settlement、position）が型を持つ。
- まだ挙動ゼロ。**Modules 2-3 が挙動を追加。**

## 次のレッスン（L4）

L4 で \`compute.rs\` を開始。ファイルを作成、module doc + \`compute_premium\` 関数 — crate 最初の数学。関数は 8 行だが 3 つの設計決定を encode：(a) \`index == 0\` を error でなく \`Premium(0)\` を返して扱う；(b) 引き算 × scale で overflow を避けるため \`i128\` 中間値を使う；(c) wrap でなく \`i64\` に saturate して戻す。レッスンは最初の unit test 4 つも追加 — premium-zero-when-equal、premium-positive/negative ケース、\`index == 0\` saturation テスト。**Crate 最初のテスト。**`,
                },
              ],
            },
          },
          {
            title: "純粋な compute",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "レッスン 4 — compute_premium — 最初の数学、最初のテスト",
                  slug: "openhl-funding-compute-premium-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン 4 — \`compute_premium\` — 最初の数学、最初のテスト

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…が 4 unit test を通る。\`openhl-funding\` crate が「全型定義」から「型定義 + 最初の数学のピース」に：

- **\`crates/funding/src/compute.rs\`** — 新ファイル、module doc + 2 関数：
  - \`compute_premium(mark, index) -> Premium\` — \`(mark - index) / index\` を導出、\`RATE_SCALE\` スケール。
  - \`saturate_i128_to_i64(v) -> i64\` — clamp helper（private）。3 行。
- **\`compute.rs\` の \`#[cfg(test)] mod tests\` ブロックに 4 つの手書きトレース unit test**：
  - \`premium_zero_when_mark_equals_index\`
  - \`premium_positive_when_mark_above_index\`
  - \`premium_negative_when_mark_below_index\`
  - \`premium_saturates_to_zero_when_index_is_zero\`
- **\`crates/funding/src/lib.rs\`** — \`pub mod compute;\` 追加 + \`compute_premium\` を re-export。

これが**実際の数学**を持つ最初のレッスン。今後、すべてのコード変更がアカウント間で静かに wealth を shift させる可能性がある。手書きトレーステストが期待出力を、紙の数学で検証できる特定の入力値に pin する。

## おさらい

L3 後：
- 9 型 + \`RATE_SCALE\` が \`types.rs\` に — Stage 8b の完全な型 roster。
- まだ挙動ゼロ。Crate はコンパイルするが何もしない。

L4 で最初の関数を導入。関数は短い（body ~10 行）が 3 つの設計決定を encode：\`index == 0\` の grace ful 扱い、overflow safety のための \`i128\` 中間値、wrap/panic でなく saturation。

## プラン

3 つの編集：

1. **\`crates/funding/src/compute.rs\` を作成** — module doc + imports + \`compute_premium\` + private \`saturate_i128_to_i64\` helper。
2. **\`#[cfg(test)] mod tests\` を \`compute.rs\` に追加**、4 つの手書きトレース unit test 付き。
3. **\`crates/funding/src/lib.rs\` を更新** — \`pub mod compute;\` 宣言追加 + クレートルートで \`compute_premium\` を re-export。

> 🛑 **考えてみよう。** スクロール前に — \`(mark - index) * RATE_SCALE / index\` を計算する。\`mark\` と \`index\` は両方 \`u64\`、最大 ~1.8e19 まで。\`RATE_SCALE\` は \`1e9\`。*中間*積 \`(mark - index) * RATE_SCALE\` の最大サイズは？ どの型に収まる必要がある？

（答え：**\`u64::MAX * 1e9\` が \`i64\` を 10 桁オーバーフロー。** 最悪ケース \`mark = u64::MAX\`、\`index = 0\`（これは別に扱う）、もしくは \`mark = u64::MAX\`、\`index = 1\` → \`(u64::MAX - 1) * 1e9 ≈ 1.8e28\`。\`i64::MAX\` は ~9.2e18、中間値に \`i128\` が必要。\`index\` で割った後は i64 範囲に戻る — だが除算は乗算の*後*でなければならないので、中間値は i128 に収まる必要がある。**積には i128 が必須。Saturation は最終結果が i64 を超える稀なケースを扱う。**）

## 手順

### Step 1: module doc 付きで \`compute.rs\` を作成

\`crates/funding/src/compute.rs\` を作成。初期内容：

\`\`\`rust
//! Pure funding-rate math.
//!
//! Three building blocks, each stateless:
//!   - [\`compute_premium\`] derives the mark/index gap as a signed fraction
//!   - [\`compute_rate\`] divides + caps to produce a per-interval rate
//!   - [\`apply_funding\`] turns a rate + position snapshot into settlements
//!
//! Each function is deterministic and saturates on overflow rather than
//! wrapping. Validators that disagree about funding fork the chain, so the
//! cost of an unexpected overflow has to be bounded behavior, not panic.

use crate::types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, Premium, Settlement,
    RATE_SCALE,
};
\`\`\`

2 点：

**Module doc が 3 関数をプレビューするが、L4 では 1 つだけ出荷する。** クロス参照 \`[compute_rate]\` と \`[apply_funding]\` は L6 と L7 まで壊れている。**Warning を許容** — L1/L2 で \`[FundingRate]\` クロス参照を増分解決させたのと同じ。

**\`use\` 文が L4 ではまだ全部使わない型を import する。** \`FundingParams\`、\`FundingRate\`、\`Notional\`、\`Position\`、\`Settlement\` は L6/L7 の関数に必要。今 import しておけば L4 後 import block が安定 — L1 の \`[dev-dependencies] proptest\` と同じロジック。**Boilerplate は早期に安定化、ロジックを iterate する。**

> 🛑 **やりがちな勘違い。** 「L4-L6 の間 unused-import warning を抑えるべき？」 **Unused-import warning は*コンパイラ*が unused と見るアイテムで発火、rustdoc が参照するアイテムではない。** L7 までに \`FundingRate\`、\`Notional\` 等を使うので、コンパイラは文句を言わない — 同じモジュール内で後で使われる \`use\` 宣言を見ている。Warning を出すのは rustdoc クロス参照 \`[compute_rate]\` と \`[apply_funding]\` のみで、L6/L7 で解決される。

### Step 2: \`compute_premium\` を追加

\`use\` ブロックの後ろに：

\`\`\`rust
/// Compute the premium \`(mark - index) / index\`, scaled by [\`RATE_SCALE\`].
///
/// Returns \`Premium(0)\` if \`index == 0\` — the safest behavior, since with no
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
\`\`\`

Body 10 行。4 つの動く部分：

1. **\`index == 0\` での早期 return。** Zero index は「oracle がまだ price を配信していない」（boot state）または「アセットに spot reference がない」を意味する。**どちらのケースも zero funding を生むべき** — index がないとき計算する意味ある (mark - index) がない。\`Premium(0)\` を返すのは graceful degradation、error なら bridge を通って transaction レベルの失敗として伝播 — 一時的な oracle 問題への wrong response。

2. **\`i128::from(mark.0) - i128::from(index.0)\`。** 両 operand が引き算の*前*に \`i128\` に upcast。**\`u64\` 2 つの引き算は \`mark < index\` で underflow** — 結果が負数でなく \`u64::MAX\` 近くにラップする。符号付き i128 への upcast で引き算を代数的に正しくする。

3. **\`diff.saturating_mul(i128::from(RATE_SCALE))\`。** 乗算は普通の \`*\` でなく \`saturating_mul\`。最悪ケース（\`mark\` が \`u64::MAX\` 近く、\`index\` が非常に小さい）、積が \`i128::MAX\` に近づく — 普通の乗算なら overflow する。\`saturating_mul\` は panic でなく \`i128::MAX\` / \`i128::MIN\` に clamp。

4. **\`scaled / i128::from(index.0)\`。** 除算は乗算の*後*。**先に割ると precision を失う** — \`(mark - index) / index\` の整数数学は 1.0 未満の premium 全部（使える範囲全部！）に対して 0 を生む。先に \`RATE_SCALE\` を掛けることで小数桁を整数 magnitude として保持、それから割って scale 済み premium が生まれる。

それから \`saturate_i128_to_i64\` で \`Premium\` の i64 範囲に clip して戻す。

> 🛑 **やりがちな勘違い。** 「\`(mark - index).saturating_mul(RATE_SCALE) / index\` を u64 で計算すればいいのでは？」 **No — 引き算が問題。** \`MarkPrice(99) - IndexPrice(100)\` を \`u64\` で計算すると underflow → \`u64::MAX - 0\` にラップ。それは小さな*負*の数でなく巨大な*正*の数。結果は小さな*負*の premium が真実のときに巨大な*正*の premium になる。**符号が重要、符号付き演算が必須。**

### Step 3: \`saturate_i128_to_i64\` helper を追加

\`compute_premium\` の後ろに：

\`\`\`rust
/// Clamp an \`i128\` into the \`i64\` range. Used wherever an intermediate
/// product can exceed \`i64::MAX\` at network-pathological inputs (e.g., a
/// \`u64::MAX\` index price). Saturation, not wrapping — see the module-doc
/// comment on why panicking would be a worse failure mode.
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
\`\`\`

Body 3 行。**\`i64::try_from(v)\` は \`Result\` を返す** — \`v\` が i64 に収まれば \`Ok(value)\`、そうでなければ \`Err\`。\`unwrap_or(...)\` が \`Err\` ケースの default を提供：overflow が正なら \`i64::MAX\`、負なら \`i64::MIN\` に clamp。

この関数は**モジュール private**（\`pub fn\` でなく \`fn\`）。呼び出し側は不要 — \`MarkPrice\` / \`IndexPrice\` を入れ、\`Premium\` を受け取り、saturation は裏で起きる。Private にすることで偶発的誤用を防ぎ、public surface をクリーンに保つ。

L7 の \`apply_funding\` がこの helper の 2 つ目の caller になる。だから helper であって \`compute_premium\` 内に inline されない。

> 🛑 **考えてみよう。** テスト \`assert_eq!(saturate_i128_to_i64(i128::MAX), ???)\` は何を期待する？

（答え：**\`i64::MAX\`。** \`i128::MAX\` は ~1.7e38、\`i64::MAX\`（~9.2e18）を遥かに超える。\`i64::try_from(i128::MAX)\` は失敗、\`unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })\` が \`v > 0\` なので closure を評価、\`i64::MAX\` を返す。負側も対称：\`i128::MIN\` は \`i64::MIN\` に clamp。）

### Step 4: テストモジュール + 4 unit test を追加

\`compute.rs\` の末尾に：

\`\`\`rust
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
\`\`\`

4 つの手書きトレーステスト。各々短いが、それぞれ特定の*意味*を pin する：

1. **\`premium_zero_when_mark_equals_index\`** — symmetry ケース。Mark = index は dislocation なしを意味する。数学は素直：\`(100 - 100) * 1e9 / 100 = 0\`。これは formula の off-by-one や sign-flip を捕まえる。

2. **\`premium_positive_when_mark_above_index\`** — longs-overpaying ケース。Mark 101 > Index 100 → 正の premium。期待値 \`10_000_000\` は紙の数学：\`(101-100) * 1e9 / 100 = 1e9 / 100 = 1e7 = 10_000_000\`。**Ppb で：1% premium。** これは反転した符号規約を捕まえる。

3. **\`premium_negative_when_mark_below_index\`** — shorts-overpaying ケース。Mark 99 < Index 100 → 負の premium。テスト 2 と同じ規模、反対の符号。**「u64 で引き算 → underflow」バグを特に捕まえる。**

4. **\`premium_saturates_to_zero_when_index_is_zero\`** — graceful-degradation ケース。期待出力は \`Premium(0)\`、panic や error ではない。**早期 return guard を「単純化のため」削除した人を捕まえる。**

テスト 2 のコメント \`// mark 101, index 100 → premium = 1/100 = 0.01 → 10_000_000 ppb\` は **紙の数学をテストに書いたもの**。これを将来デバッグする誰でも、アサーションが正しいかを手で検証できる — テスト作者が正しくやったと信じる必要なし。

> 🛑 **やりがちな勘違い。** 「\`MarkPrice(u64::MAX)\` や \`IndexPrice(1)\` のような edge case をテストすべき？」 **Yes、だが L5 で。** それらは saturation-edge テスト — \`saturate_i128_to_i64\` helper を境界で exercise する、L5 のメイン pedagogical focus。**L4 のテストは normal-input semantics を pin する、L5 が pathological-input 挙動を pin する。** 両方のテストクラスが重要、レッスンで分離すれば per-lesson scope がタイト。

### Step 5: \`lib.rs\` を更新

\`crates/funding/src/lib.rs\` を開く。現状：

\`\`\`rust
//! \`openhl-funding\` — funding-rate state machine.
//! ...

pub mod types;

pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
\`\`\`

Compute モジュール宣言 + re-export を追加：

\`\`\`rust
//! \`openhl-funding\` — funding-rate state machine.
//! ...

pub mod compute;
pub mod types;

pub use compute::compute_premium;
pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
\`\`\`

2 つの変更：
- \`pub mod compute;\` — 新モジュールを宣言。
- \`pub use compute::compute_premium;\` — 関数をクレートルートで re-export。呼び出し側は \`use openhl_funding::compute::compute_premium;\` でなく \`use openhl_funding::compute_premium;\` と書ける。

**モジュール宣言はアルファベット順**（\`compute\` が \`types\` の前）。\`pub use\` も同じ順序。長い re-export ブロックでは consistency が重要。

### Step 6: テストを実行

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

期待出力：

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to \`compute_rate\`
warning: unresolved link to \`apply_funding\`
warning: unresolved link to \`FundingClock\`
    Finished \`test\` profile [unoptimized + debuginfo] in 0.6s
     Running unittests src/lib.rs

running 4 tests
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**4 テストが通る。** Crate 初の green run。3 つの rustdoc warning は期待通り（\`compute_rate\`/\`apply_funding\`/\`FundingClock\` — L6/L7/L8 で解決）。

よくあるエラー：

- **Positive テストでの \`assertion failed: left=0 right=10_000_000\`** — \`compute_premium\` の \`* RATE_SCALE\` ステップが欠けている。Scaling なしの整数除算 \`(101 - 100) / 100\` は 0 に丸まる。
- **Negative テストでの \`assertion failed: left=18446744073709541616 right=-10_000_000\`** — 引き算を \`i128\` に upcast でなく \`u64\` でやった。巨大な正数は \`u64::MAX + (99 - 100)\` の underflow ラップ。**両 operand に \`i128::from(...)\` upcast を追加。**
- **テストで panic** — \`saturating_mul\` でなく普通の \`*\` を使った。Debug build で普通の乗算は overflow で panic。\`saturating_mul\` に切り替え。
- **\`error: cannot find function 'saturate_i128_to_i64'\`** — helper が \`compute_premium\` の下に同じファイルで定義されている。Caller の上に動かすか、下のまま残す — Rust はモジュール内の宣言順を気にしない。

## 設計の振り返り

このレッスンに焼き込まれた決定 4 つ：

1. **\`index == 0\` は \`Premium(0)\` を返す、error ではない。** Oracle が利用不可のときの graceful degradation。Error は bridge を通って transaction 失敗として伝播し、無関係の payload 作業をブロックする。Zero が「rate を駆動する情報がない」への正しい答え。

2. **\`i128\` 中間値、\`u64\` を絶対使わない。** 引き算は負になりうる、乗算は \`u64::MAX\` を超えうる。両演算とも符号付きでより wide な算術が必要。**Input 範囲でなく*中間値*範囲で整数 width を選ぶ。**

3. **\`saturating_mul\`、\`*\` ではない。** 乗算中の overflow は panic（debug）か wrap（release）。両方とも saturation より悪い：panic = halt 経由のチェーン fork、wrap = wrong value 経由のチェーン fork。**Consensus 中核の数学に対して saturation は唯一の bounded-behavior オプション。**

4. **テストコメントが紙の数学。** アサーションの隣の \`// (101-100) * 1e9 / 100 = 10_000_000\` が、将来のデバッガがアサーションを*formula に対して*検証できるようにする — テスト作者の約束に対してでなく。**テストはドキュメンテーション、そのコメントがドキュメント body。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

L4 後：
- **compute.rs** が Stage 8b の \`compute_premium\` + \`saturate_i128_to_i64\` + 4 手書きトレース premium テストまで一致。\`compute_rate\`、\`apply_funding\`、rate テスト、proptest は L5-L7。
- **lib.rs** が \`pub mod compute;\` と \`compute_premium\` re-export を持つ。\`apply_funding\`、\`compute_rate\`、clock モジュールは L5-L8。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`compute_premium\` がなぜ危険なステップだけでなくどこでも \`i128\` を使う？**
\`i128::from(u64)\` 変換は無料（ただの zero-extend）。全計算を \`i128\` でやることが 1 つのメンタルモデル — 「この関数は i128 算術を使う」 — vs 混合モデル「ここは u64、そこは i128」。**統一 width はゼロコストで可読性の勝利。** 最終の i64 への saturation だけが何らかの semantic 重みを持つ唯一の変換。

**Q: \`RATE_SCALE\` をなぜ \`RATE_SCALE as i128\` でなく \`i128::from(RATE_SCALE)\` で upcast する？**
\`from\` は idiomatic で non-truncating な変換。\`as i128\` でもここは動く（\`i64 → i128\` は truncate しない）が、\`from\` が意図を documentation する：「これは widening で reinterpretation ではない」。**Widening には \`from\` を使う、truncation が起きえないと検証済みなら \`as\` だけを使う。** \`as i128\` を読む将来のエンジニアは safety を verify する必要がある、\`from\` は変換が safe であることを documentation する。

**Q: Helper はなぜ \`clamp_to_i64\` でなく \`saturate_i128_to_i64\` という名前？**
「Saturate」は「型境界で clamp」の確立用語 — \`u64::saturating_mul\`、\`i128::saturating_sub\` と同じ単語。**標準語彙を使うことで関数の挙動がどの Rust 開発者にも明らか。** 「Clamp」はユーザ定義 bound のいずれも意味しうる、「saturate」は型境界 clamping を特に意味する。

**Q: \`compute_premium\` は \`pub\` でなく \`pub(crate)\` であるべき？**
\`pub\` は外部 caller（course 10 の bridge integration、もしくは funding state を telemetry のためにクエリする外部 observer）が必要。\`pub(crate)\` はそれを禁じる。**関数は public API の一部。** \`saturate_i128_to_i64\` が実装詳細、\`compute_premium\` が契約。

## 次のレッスン（L5）

L5 では新関数は追加しない。代わりに overflow 哲学の deep dive：なぜ saturation が consensus 中核数学に唯一受け入れられる挙動か、代替がどう見えるか、なぜそれらがチェーンを fork するか、\`saturate_i128_to_i64\` の境界が pathological 入力でどう振る舞うか。レッスンは proptest 1 つ（\`premium_is_antisymmetric_in_mark_index\`） — mark と index を入れ替えると premium の符号が反転する property — も追加。**Crate 初の proptest。**`,
                },
                {
                  title: "レッスン 5 — Overflow 哲学 + 最初の proptest",
                  slug: "openhl-funding-overflow-proptest-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 5 — Overflow 哲学 + 最初の proptest

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…が 5 テストを通る（L4 から 4 + 新規 proptest 1）。Crate が得るもの：

- **コードベース初の proptest** — \`premium_is_antisymmetric_in_mark_index\`。\`mark\` と \`index\` を swap すると premium の符号が反転する（mark = index のときは両方ゼロ）。Test run あたり 256 ランダム入力。

だがこのレッスンのより大きな積荷は **conceptual、コードではない**。歩く内容：

1. **なぜ panic = チェーン fork。** Panic した validator は halt、残りの validator はそれなしで前進。State が divergent。
2. **なぜ wrap = チェーン fork。** 異なるコンパイラバージョンや build flag を持つ 2 validator が同じ overflow ポイントで*異なって*wrap しうる。Wrong value が correct value から divergent。
3. **なぜ saturate は bounded behavior。** 全 validator が同じ input で同じ saturated value に合意。Fork なし。
4. **\`saturate_i128_to_i64\` 境界ケース。** \`i128::MAX → i64::MAX\`、\`i128::MIN → i64::MIN\`。なぜ \`unwrap_or\` の closure が符号に依存するか、\`i64::MAX\` だけでなく。

新関数なし。新テストコード ~5 行。**メンタルモデルがレッスン。**

## おさらい

L4 後：
- \`compute_premium\` が \`i128\` 中間値で符号付き premium を計算。
- \`saturate_i128_to_i64\` が overflow を i64 境界に clamp。
- 4 手書きトレーステストが関数の挙動を normal input で pin。

L4 のテストは pathological 入力（例：\`MarkPrice(u64::MAX)\`）を exercise せず、saturate helper を境界で exercise しない。L5 は両ギャップを哲学 + proptest で探る。

## プラン

2 つの編集：

1. **\`use proptest::prelude::*;\` import を追加** — \`compute.rs\` のテストモジュールに。
2. **\`proptest! { ... }\` ブロックを append** — antisymmetry property 付き。

プロダクションコード変更なし。

> 🛑 **考えてみよう。** スクロール前に — \`compute_premium\` の panic は validator を halt する。**なぜこれが単一ノード障害でなくチェーン fork？** ヒント：1 つが halt したとき他の validator が何をしているか考える。

（答え：**他の validator は halt したものなしで前進する。** Funding tick はすべての validator で deterministic な state update を生む。1 つが halt すると、network の quorum（典型的に 2/3+）が継続する。Halt した validator が reboot するまでに、chain head は何ブロックも先。Halt した validator は sync できない — halt block での local state が network の view と disagree。**Halt が history の 2 バージョンを生む：「panic 入力で」と「network の進んだ state で」。Validator は実質自分を network から fork off した。** Saturate は対照的に validator を lockstep のまま保つ。）

## 手順

### Step 1: Overflow の taxonomy

「整数が収まらなかった」の失敗モード 3 つ：

#### Panic（debug build の \`*\`）

\`\`\`rust
let scaled = diff * i128::from(RATE_SCALE);  // debug で overflow に panic
\`\`\`

Debug build で整数 overflow は panic。Panic を踏むスレッドは halt、validator の funding tick なら、validator の state machine は前進を止める。**ネットワークの残りは気づかず継続。** Halt した validator が restart するとき、panic block での world-view が network のものと一致しない。その時点以降、追加ブロックを検証できない — 計算したことのない state を参照していると見える。

実質：**1 validator が gone、だが不在は自分だけを破壊、ネットワークではない。** チェーンは 2 つの valid history を生むことで fork するのでなく、panic した validator が consensus から永久に落ちることで fork する。

#### Wrap（release build の \`*\`）

\`\`\`rust
let scaled = diff * i128::from(RATE_SCALE);  // release で silent に wrap
\`\`\`

Release build で \`*\` は panic せず wrap。結果は \`(diff * RATE_SCALE).wrapping_rem(2^128)\` — *定義された*値だが、数学的に正しくない。

**ハザード**：異なるコンパイラ最適化を持つ 2 validator が*異なって* wrap しうる。Compiler は associativity rule で operation を re-order できる、\`(a * b) * c\` と \`a * (b * c)\` は中間 overflow が異なるとき異なる wrap 結果を生みうる。両 validator が偶然同じに wrap しても、*wrong* value がこの tick で settle されるすべてのアカウントに伝播する。**全 validator が間違った答えに合意。** その後 raw input から funding を再計算する下流 client が disagree する。チェーンがレイヤー間の不整合で fork する。

*Release build* で wrap は silent — log なし、warning なし、event なし。**検出が最も難しいバグクラス：間違っているが consistent。**

#### Saturate（我々が選んだ挙動）

\`\`\`rust
let scaled = diff.saturating_mul(i128::from(RATE_SCALE));  // i128::MAX/MIN に clamp
\`\`\`

Saturation は型境界で定義された値を生む：正 overflow で \`i128::MAX\`、負で \`i128::MIN\`。**\`saturating_mul\` を持つ全 validator が同じ値を生む。** Fork なし。

Saturation での*funding rate* は実質 cap（\`saturate_i128_to_i64\` がさらに i64 に clamp した後）。経済的帰結：極端な oracle dislocation が premium を saturation ポイント越しに押すと、最大 rate での支払いを生む、panic でも wrap でもなく。**挙動が gracefully degrade する。**

> 🛑 **やりがちな勘違い。** 「\`checked_mul\` を使って error を返せばいい？」 **Yes、だが問題を caller に押し付ける。** \`Result<Premium, OverflowError>\` が \`compute_rate\`、\`apply_funding\`、clock を通って上に伝播する — 最終的に bridge へ、bridge は何をするか決めなければならない。Bridge の選択肢は (a) block を revert（チェーン fork）、(b) funding tick をスキップ（silent state 不整合）、(c) cap で settle する。**「cap で settle する」結果は saturation が直接実現する、error を伝播せずに。**

### Step 2: \`saturate_i128_to_i64\` 境界ケース

L4 の helper を思い出す：

\`\`\`rust
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
\`\`\`

3 つの入力 regime：

| 入力 | \`try_from\` 結果 | \`unwrap_or\` が生む |
|---|---|---|
| \`v\` が i64 に収まる | \`Ok(v as i64)\` | \`v as i64\`（override しない） |
| \`v > i64::MAX\` | \`Err(...)\` | \`i64::MAX\`（\`v > 0\` なので） |
| \`v < i64::MIN\` | \`Err(...)\` | \`i64::MIN\`（\`v ≤ 0\` なので） |

**なぜ \`unwrap_or\` の中で符号チェック？** \`try_from\` は overflow がどの方向に行ったかを教えない — ただ「収まらない」と言う。Overflow ごとに固定値（例：\`i64::MAX\`）を返したら、\`i128::MIN\` が \`i64::MIN\` でなく \`i64::MAX\` に saturate する — 符号が反転する。\`if v > 0\` テストが方向を回復する。

> 🛑 **考えてみよう。** \`saturate_i128_to_i64(0)\` は何を返す？

（答え：**\`0\`。** \`i64::try_from(0_i128)\` は \`Ok(0)\` を返す。\`unwrap_or\` 分岐は発火しない。**Saturation は in-range 値に対して no-op。** これは下の proptest に重要 — ランダム \`(mark, index)\` ペアのほとんどは i64 に快適に収まる premium を生み、saturate helper はそれらに対して invisible。）

> 🛑 **やりがちな勘違い。** 「境界を明示的にテストする — property-based test がそれをカバーしないの？」 **ランダムサンプリングではおそらくしない。** Proptest のデフォルト戦略は入力空間にわたって uniform に値を生成。\`i128::MAX\` は 2^129 値中の単一ポイント、ランダムに当たる確率は実質ゼロ。**境界テストは手書きトレースが必要** — generator が random walk で届かない特定の値を target するから。

### Step 3: テストモジュールに proptest サポートを追加

\`crates/funding/src/compute.rs\` を開く。現在のテストモジュールの開始：

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    // ... L4 の 4 unit test ...
}
\`\`\`

Proptest prelude import を追加。テストモジュールがこれに：

\`\`\`rust
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
\`\`\`

3 点：

1. **\`use openhl_clob::AccountId;\`** — \`pos\` helper に必要。L4 のテストでは使わないが、L5 の proptest に使う（実はこの proptest 自身は不要だが、L7 の apply_funding テストが必要、テストモジュールの import を安定化するために今追加）。
2. **\`use proptest::prelude::*;\`** — \`proptest!\`、\`prop_assert_eq!\`、\`prop_assert!\`、strategy combinator（\`1u64..1_000_000\`）を scope に持ち込む。
3. **\`fn pos(account: u64, size: i64) -> Position\`** — \`Position\` を構築する小さな helper。L7 で使う。Imports/helper セクションを安定化するため今追加。

**Boilerplate を安定化、テストを iterate。** L1 の dep と L4 の \`use\` ブロックと同じロジック — 後で必要なものを今追加して、per-lesson diff を実際の新規部分に集中させる。

### Step 4: Antisymmetry proptest を追加

4 unit test の後、テストモジュールの閉じ \`}\` の前に追加：

\`\`\`rust
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
\`\`\`

いくつかの proptest 固有要素：

- **\`proptest! { ... }\`** — テスト関数をラップするマクロ。このブロック内で、\`#[test]\` 関数が generator 付きの property test として扱われる。
- **\`mark in 1u64..1_000_000\`** — **戦略**。\`mark\` は \`[1, 1_000_000)\` の値からサンプルされる。デフォルトは test run あたり 256 ケース（~256 ランダム \`(mark, index)\` ペア）。
- **\`prop_assert_eq!\` と \`prop_assert!\`** — proptest のアサーションマクロ。単一ケースで \`assert_eq!\` / \`assert!\` と同じ効果だが、proptest は失敗で input を shrink するために独自のマクロが必要（*最小*の failing ケースを見つける）。

なぜこの property？

「Antisymmetry」の素朴版は：\`compute_premium(MarkPrice(M), IndexPrice(I))\` と \`compute_premium(MarkPrice(I), IndexPrice(M))\` が**同じ規模、反対符号**の結果を持つべき。だが整数除算はゼロに向けて丸めるので、cross-comparison \`|a| / M == |b| / I\` は厳密に成り立たない — off-by-one の rounding asymmetry がある。

**Proptest は弱い property をテストする：符号が反対（または両方ゼロ）。** Mark = index のとき両 premium がゼロ。Mark ≠ index のとき、1 つが正、1 つが負。

**コメントがなぜ弱めたかを説明する。** この property を見て「規模も等しいべきでは？」と思う将来の読者は、rounding caveat が場所に documented されているのを見る。**整数算術下で実際に成り立たない aspirational property は、testing failure を待っている。** 実際に invariant な property をテスト。

> 🛑 **やりがちな勘違い。** 「テスト fixture で \`f64\` を使って期待規模を厳密計算すれば？」 **テストが \`f64\` 計算の expectation を \`i64\` 計算の actual に対して assert することになる — 2 つは LSB で disagree する。** 決定的整数コードを非決定的 float expectation と比較するテストは信頼できない。**プロダクション算術と同じドメインでテスト算術を保つ。**

> 🛑 **考えてみよう。** 戦略が \`0u64..1_000_000\` でなく \`1u64..1_000_000\` を使う（ゼロを除外）のはなぜ？

（答え：**\`index == 0\` が \`Premium(0)\` 早期 return ケースで、L4 で手書きトレース unit test 済み。** Proptest に 0 を含めると：(a) 両方ゼロのときに「符号が反対」を assert して property を破る、もしくは (b) proptest 内でゼロを特殊扱いしてテストを複雑化する。ゼロを除外すれば property がクリーン。**Proptest は interesting range を exercise すべき、trivial-or-already-tested 範囲ではない。**）

### Step 5: テストを実行

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

期待出力：

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to \`compute_rate\`
warning: unresolved link to \`apply_funding\`
warning: unresolved link to \`FundingClock\`
    Finished \`test\` profile [unoptimized + debuginfo] in 0.6s
     Running unittests src/lib.rs

running 5 tests
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

5 テスト全 green。Proptest が 256 ランダム \`(mark, index)\` ペアを run、全 256 が antisymmetry property を満たす。

Proptest の verbosity を見たいなら env var をセット：

\`\`\`bash
PROPTEST_VERBOSE=1 cargo test -p openhl-funding premium_is_antisymmetric
\`\`\`

「passed 256 cases」や failure 時の「shrunk to mark=X index=Y」 — 最小 counterexample — などのログが見える。

よくあるエラー：

- **\`error: macro 'proptest' is not used\`** — \`use proptest::prelude::*\` でなく \`use proptest::*\` を import した。マクロは \`prelude\` に住む。
- **\`prop_assert_eq!\` を \`assert_eq!\` に typo** — 通常関数では動くが \`proptest!\` 内では適切な shrinking のため prop_* variant が必要。テストは pass するが failure 時に最小例まで shrink しない。
- **\`signs are opposite\` が fail** — 通常 proptest が \`mark == index\` を else 分岐に偶発的に含めた。if/else 分割を verify：\`if mark == index { both zero } else { opposite signs }\`。
- **\`signum() == -b.0.signum()\` で \`b.0 == 0\` のとき proptest が panic** — 等しくない mark/index で compute_premium がゼロを生むときに起きる（例：整数数学がゼロに丸める非常に小さい input）。\`1u64..1_000_000\` range がこれを避ける、tighter range は当たる。

## 設計の振り返り

このレッスンに焼き込まれた決定 5 つ：

1. **Saturate が consensus で唯一の bounded-behavior overflow オプション。** Panic = halt 経由のチェーン fork。Wrap = 間違っているが consistent な値経由のチェーン fork。Saturate = 全 validator で同じ値、gracefully degrade。**Consensus の liveness を保つ他のオプションはない。**

2. **実際に invariant な property をテスト、aspirational なものではない。** 素朴 antisymmetry は規模が等しいことを要求する、整数 rounding がそれを壊す。弱い property（反対符号）をテストし、rounding caveat をテストコメントで documentation する。**Aspirational テストは production で fail、invariant テストは開発で fail。**

3. **Test モジュール boilerplate を早期に安定化。** \`use proptest::prelude::*\`、\`use openhl_clob::AccountId\`、\`pos\` helper を今追加すると、テストモジュールの imports が L6 / L7 まで stable に。**Boilerplate の churn は per-lesson diff の実態を obscure する。**

4. **\`saturate_i128_to_i64\` の \`unwrap_or\` closure が符号に依存。** 固定 override は負 overflow を正に flip する。Saturate helper を慎重に読むと closure が*defensive* でなく*必要*な理由が明らかになる。

5. **Proptest range からゼロを除外** — ゼロケースは既に手書きトレース unit test、proptest に含めると property の複雑化が必要。**手書きトレーステストが境界ケースを pin、proptest が interior の property を pin。** 補完的、冗長ではない。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
\`\`\`

L5 後：
- **compute.rs** が Stage 8b の \`compute_premium\` + \`saturate_i128_to_i64\` + 4 手書きトレース premium テスト + antisymmetry proptest + テストモジュール imports/helper まで一致。\`compute_rate\`、\`apply_funding\`、残りの proptest は L6/L7。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: Proptest は実際に何ケース実行する？**
デフォルトは test invocation あたり 256。\`PROPTEST_CASES=N cargo test\` で configurable。Shrinker が failure 発見後に counterexample を最小化するため追加ケースを実行することがある。**256 ランダムペアで、antisymmetry property が CI を遅くせずに input 空間の意味あるサンプルに対して exercise される。**

**Q: より強いカバレッジのため 10,000 ケースに増やせる？**
できるが、closed form を持つ property には marginal benefit がすぐ落ちる。Antisymmetry は probabilistic property ではない — 成り立つか成り立たないか。256 ケースが実装がテスト範囲で正しいことの高い confidence を提供。**Adversarial input を持つ property（例：crypto）にはより多くのケースが欲しい、純粋数学 property には 256 で十分。**

**Q: \`proptest\` でなく \`quickcheck\` を使えば？**
両方とも Rust の property-testing crate、両方とも動く。\`proptest\` はより強い shrinking（より小さい counterexample を見つける）と better strategy composition（range の \`in\` 構文）を持つ。openhl workspace は consensus crate のテストで既に proptest を引いているので、marginal cost はゼロ。**1 つ選んで stick する、コードベース中盤での切り替えは違うものを最初に選ぶより高コスト。**

**Q: \`saturating_mul\` と \`saturate_i128_to_i64\` の関係は？**
\`saturating_mul\` は \`i128\`（と他の整数）の built-in メソッドで、型自身の範囲内で saturated 積を生む。\`saturate_i128_to_i64\` は user-defined helper で、\`i128\` を \`i64\` 範囲に clamp する。異なる境界に対応：\`saturating_mul\` は in-type overflow を防ぐ、\`saturate_i128_to_i64\` は cross-type narrowing を防ぐ。**両方必要、数学が i128（積用）と i64（保存用）両方を使うから。**

## 次のレッスン（L6）

L6 で \`compute_rate\` を追加 — \`Premium\` と \`FundingParams\` を取って \`FundingRate\` を生む関数。関数は ~10 行だが 3 つの決定を encode：(a) \`divisor == 0\` で \`FundingRate(0)\` を返す（funding 無効化）、(b) divisor が clamp 前に premium を減らす、(c) \`rate_cap\` が絶対値を clamp（負 cap と正 cap が同じ \`params.rate_cap\` を共有）。レッスンは divisor、両側 cap、無効化-funding ケースをカバーする 4 unit test も追加。L6 後、3 つの pure-compute 関数のうち 2 つが完了。`,
                },
                {
                  title: "レッスン 6 — compute_rate — divisor + cap",
                  slug: "openhl-funding-compute-rate-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 6 — \`compute_rate\` — divisor + cap

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…が 10 テストを通る（L4-L5 から 5 + 新規 5）。\`compute.rs\` が得るもの：

- **\`compute_rate(premium, params) -> FundingRate\`** — 生 premium を \`params.divisor\` で割り、\`±params.rate_cap\` に clamp して per-interval rate にする。
- **5 unit test** — divisor 効果、正 cap clamp、負 cap clamp、divisor=0 で無効化、cap=0 で無効化をカバー。

L6 後、\`compute.rs\` の 3 つの pure 関数のうち 2 つが完了。**残るは \`apply_funding\` のみ** — L7。

教育の焦点は**演算順**：divide *してから* clamp。順を逆にすると rate cap の意味が完全に変わる — 入れやすく検出が難しい off-by-one 設計バグの一種。

## おさらい

L5 後：
- \`compute_premium\` が mark/index から符号付き premium を生む。
- Antisymmetry proptest が 256 ランダムペアを exercise。
- \`saturate_i128_to_i64\` 配置済み、だが今まで \`compute_premium\` だけが使用。

L6 で 2 つ目の pure 関数を追加。\`compute_rate\` は \`compute_premium\` より短い（overflow 体操なし — 処理する値が既に i64 に収まる）が独自の設計決定セットを encode。

## プラン

3 つの編集：

1. **\`compute.rs\` に \`compute_rate\` を append** — body 10 行、\`compute_premium\` の後ろ（\`saturate_i128_to_i64\` の前）。
2. **既存の \`mod tests\` ブロックに 5 unit test を append**。
3. **\`lib.rs\` を更新** — \`compute_rate\` を \`pub use compute::{...}\` re-export に追加。

> 🛑 **考えてみよう。** スクロール前に — \`raw_rate = premium / divisor\` を計算してから \`±cap\` に clamp する。**先に clamp してから割ったらどう変わる？** ヒント：cap がどの単位かを考える。

（答え：**先に clamp すると cap が「最大 premium」を意味するようになる、「最大 rate」ではなく。** \`cap = 4%/interval\`、\`divisor = 8\` で、premium を \`±4%\` に clamp してから割ると最大 *rate* は \`0.5%/interval\` になる。我々のアプローチ（先に割って rate レベルで clamp）だと cap が真に \`4%/interval\` で bind する。**Cap の単位は出力の単位に合わせる必要がある。** Premium と rate は両方 \`RATE_SCALE\` でスケール、数値的に似て見える — だが意味は違う。Divisor がどちらを cap しているかを変える。）

## 手順

### Step 1: \`compute_rate\` を追加

\`crates/funding/src/compute.rs\` を開く。\`compute_premium\` の後ろ、\`saturate_i128_to_i64\` の前に：

\`\`\`rust
/// Divide the premium by \`params.divisor\` and clamp to ±\`params.rate_cap\`.
///
/// \`divisor == 0\` is treated as "funding disabled" → returns \`FundingRate(0)\`,
/// which causes \`apply_funding\` to produce zero-delta settlements for every
/// position (or none, by the filter inside \`apply_funding\`).
#[must_use]
pub fn compute_rate(premium: Premium, params: FundingParams) -> FundingRate {
    if params.divisor == 0 {
        return FundingRate(0);
    }
    let raw = premium.0 / i64::from(params.divisor);
    let cap = params.rate_cap.0.abs();
    let capped = raw.clamp(-cap, cap);
    FundingRate(capped)
}
\`\`\`

Body 10 行。4 つの動く部分：

1. **\`if params.divisor == 0 { return FundingRate(0); }\`** — funding-disabled 早期 exit。これなしだと \`premium.0 / i64::from(params.divisor)\` 行が panic（ゼロ除算）。**Divisor がゼロのときの唯一の安全な対応は guard。**

2. **\`premium.0 / i64::from(params.divisor)\`** — 除算。\`premium.0\` は \`i64\`、\`divisor\` は \`u32\`。\`i64::from(u32)\` がロスレスに widen（任意の u32 値が i64 に収まる）。\`i64 / i64\` が i64 商を生む。**結果は clamp 前の「生」per-interval rate。**

3. **\`let cap = params.rate_cap.0.abs();\`** — cap を絶対値として抽出。\`params.rate_cap\` は \`FundingRate(i64)\`、ユーザが負の値を渡した*かもしれない*。Cap の符号は気にしない — 規模を気にする。**Cap は幅、位置ではない。**

4. **\`raw.clamp(-cap, cap)\`** — symmetric clamp。\`i64::clamp(min, max)\` は \`raw < min\` なら \`min\`、\`raw > max\` なら \`max\`、それ以外なら \`raw\` を返す。**Rust 組み込み API、manual \`if/else\` チェーン不要。**

> 🛑 **やりがちな勘違い。** 「Cap に \`.abs()\` を付ける意味は？ ユーザに正の cap を渡すよう要求すれば？」 **できるが、defensive abs はランタイム検証より安価。** 「負の cap」もしくは「絶対 cap、どちらの符号も許す」と思って \`FundingRate(-40_000_000)\` を渡したユーザは \`FundingRate(40_000_000)\` と同じ挙動を得る。コストは \`.abs()\` 呼び出し 1 つ（~1ns）、メリットは footgun 1 つ削減。**\`.abs()\` は API での「cap にはどちらの符号も受ける、magnitude として解釈する」と言うのと等価。**

> 🛑 **やりがちな勘違い。** 「\`params.rate_cap == 0\` も特殊ケースとして扱うべきでは？」 **不要 — 自然に落ちる。** \`cap == 0\` のとき \`clamp(-0, 0)\` は任意の入力に対して \`0\` を生む。結果は \`FundingRate(0)\`、これが我々が望む disabled-funding セマンティクス。**Edge case が自然に処理されるコードは、明示的 edge-case 分岐を持つコードより良い。**

### Step 2: なぜ先に割るか

順序が重要。2 つの代替：

**A) 我々のアプローチ：割ってから clamp**

\`\`\`rust
let raw = premium / divisor;
let capped = raw.clamp(-cap, cap);
\`\`\`

- Cap が*rate*レベルで bind。
- \`cap = 4%/interval\` は「単一 interval で 4% 以上支払わない」を意味。
- Premium 100% / divisor 8 → raw 12.5%、4% に clamp。

**B) 逆：clamp してから割る**

\`\`\`rust
let capped_premium = premium.clamp(-cap, cap);
let raw = capped_premium / divisor;
\`\`\`

- Cap が*premium*レベルで bind。
- \`cap = 4%\` は「単一 premium reading が 4% を超えない」を意味。
- Premium 100% が 4% に clamp、その後 8 で割って最終 rate 0.5%。

**アプローチ A が我々が欲しいもの。** アプローチ B だと cap が事実上 \`0.5%/interval\`（rate_cap を divisor で割ったもの）になり、docstring が約束しているものではない。

> 🛑 **考えてみよう。** \`params.hyperliquid_default()\`（divisor=8、cap=4%）で premium \`RATE_SCALE\`（100% dislocation）から生まれる最大 rate は？

（答え：**\`FundingRate(40_000_000)\` = 4%/interval。** 歩いていく：premium.0 = 1_000_000_000（RATE_SCALE）。raw = 1_000_000_000 / 8 = 125_000_000（12.5%/interval）。cap = 40_000_000（4%）。125_000_000 に対する clamp(-40_000_000, 40_000_000) → 40_000_000。**Cap が仕事をする。** アプローチ B と比較：clamped_premium = cap 40_000_000 で clamp(1_000_000_000) → 40_000_000。raw = 40_000_000 / 8 = 5_000_000（0.5%）。Spec を大きく下回る。）

### Step 3: 5 unit test を追加

\`#[cfg(test)] mod tests\` ブロック内、既存の premium テストの後（proptest ブロックの前）に：

\`\`\`rust
    #[test]
    fn rate_divides_premium_by_divisor() {
        let params = FundingParams::hyperliquid_default();
        // premium = 0.01 (10_000_000 ppb), divisor = 8 → rate = 1_250_000
        let r = compute_rate(Premium(10_000_000), params);
        assert_eq!(r, FundingRate(1_250_000));
    }

    #[test]
    fn rate_clamps_at_positive_cap() {
        let params = FundingParams::hyperliquid_default();
        // premium = 1.0 (RATE_SCALE), divisor = 8 → raw = 125_000_000
        // cap is 40_000_000 → clamps to 40_000_000.
        let r = compute_rate(Premium(RATE_SCALE), params);
        assert_eq!(r, FundingRate(40_000_000));
    }

    #[test]
    fn rate_clamps_at_negative_cap() {
        let params = FundingParams::hyperliquid_default();
        let r = compute_rate(Premium(-RATE_SCALE), params);
        assert_eq!(r, FundingRate(-40_000_000));
    }

    #[test]
    fn rate_zero_when_divisor_is_zero() {
        let mut params = FundingParams::hyperliquid_default();
        params.divisor = 0;
        let r = compute_rate(Premium(RATE_SCALE), params);
        assert_eq!(r, FundingRate(0));
    }

    #[test]
    fn rate_zero_when_cap_is_zero_funding_disabled() {
        let mut params = FundingParams::hyperliquid_default();
        params.rate_cap = FundingRate(0);
        let r = compute_rate(Premium(10_000_000), params);
        assert_eq!(r, FundingRate(0));
    }
\`\`\`

5 テスト、それぞれ特定の挙動を pin：

1. **\`rate_divides_premium_by_divisor\`** — normal ケース。Premium 1%（10_000_000 ppb）、divisor 8 → rate 0.125%（1_250_000 ppb）。期待値は紙の数学 \`10_000_000 / 8 = 1_250_000\`。除算の off-by-one を捕まえる。

2. **\`rate_clamps_at_positive_cap\`** — Clamp が起きるのは premium が cap 超えの生 rate を生むとき。Premium 100% → raw 12.5% → 4% に clamp。**Catches：「clamp を忘れた」バグ。**

3. **\`rate_clamps_at_negative_cap\`** — #2 の負側 symmetric。Premium -100% → raw -12.5% → -4% に clamp。**Catches：「正側だけ clamp した」バグ。** これは現実のバグパターン — \`raw.clamp(-cap, cap)\` でなく \`min(raw, cap)\` を書いて負側を見逃す。

4. **\`rate_zero_when_divisor_is_zero\`** — divisor 経由の disabled-funding ケース。非ゼロ premium でも \`divisor = 0\` で関数が zero を返す。**Catches：ゼロ除算 guard を忘れた。** Guard なしだと debug モードでこのテストが panic する。

5. **\`rate_zero_when_cap_is_zero_funding_disabled\`** — cap 経由の disabled-funding ケース。\`rate_cap = 0\` で clamp が \`[0, 0]\`、任意の生 rate が 0 に clamp。**Catches：clamp(0, 0) が 0 を返す以外の何かをすると仮定。** 「cap == 0 に特殊ケースなし」アプローチが動くことも確認。

> 🛑 **考えてみよう。** \`params.rate_cap = FundingRate(-40_000_000)\`（負 cap）にしてテスト 2 を run したら何が起きる？

（答え：**同じ結果 — \`FundingRate(40_000_000)\`。** \`.abs()\` が magnitude を抽出するから。同じ絶対値の負 cap と正 cap が同じ挙動を生む。**「負 cap」は silent に受け入れられる。** これが defensive abs の効能 — ユーザはどちらでも合理的な挙動を得る。）

### Step 4: \`lib.rs\` を更新

現在の re-export 行：

\`\`\`rust
pub use compute::compute_premium;
\`\`\`

これに：

\`\`\`rust
pub use compute::{compute_premium, compute_rate};
\`\`\`

Public API に 2 つの関数。**アルファベット順維持** — \`compute_premium\` が \`compute_rate\` の前。L7 で \`apply_funding\` が来てパターンが続く。

### Step 5: テストを実行

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

期待出力：

\`\`\`
running 10 tests
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok
test compute::tests::rate_clamps_at_negative_cap ... ok
test compute::tests::rate_clamps_at_positive_cap ... ok
test compute::tests::rate_divides_premium_by_divisor ... ok
test compute::tests::rate_zero_when_cap_is_zero_funding_disabled ... ok
test compute::tests::rate_zero_when_divisor_is_zero ... ok

test result: ok. 10 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

10 テスト全 green。Rate テスト + premium テスト + proptest。

よくあるエラー：

- **\`rate_zero_when_divisor_is_zero\` で panic** — 早期 return guard を忘れた。\`premium.0 / 0\` は Rust で算術 panic。関数先頭に \`if params.divisor == 0 { return FundingRate(0); }\` を追加。
- **\`rate_clamps_at_negative_cap\` で \`assertion failed: left=-125000000 right=-40000000\`** — \`raw.clamp(-cap, cap)\` でなく \`raw.min(cap).max(-cap)\` を書いて min/max 順を間違えた。\`.clamp(min, max)\` が canonical Rust idiom、それを使う。
- **\`rate_divides_premium_by_divisor\` で \`assertion failed: left=0 right=1_250_000\`** — \`premium.0 / i64::from(params.divisor)\` でなく \`premium.0 / params.divisor\`（mixed type）を書いた。エラーは実はコンパイルエラー（\`u32 vs i64\` mismatch）、\`as i64\` と typo するとコンパイルするが truncate しうる。\`i64::from(...)\` を使う。
- **\`lib.rs\` re-export で \`error: cannot find function 'compute_rate'\`** — \`compute_rate\` を re-export に追加したが関数定義していない。\`compute.rs\` に関数 body を実際に追加したか確認。

## 設計の振り返り

このレッスンに焼き込まれた決定 4 つ：

1. **先に割って、それから clamp。** Cap が*rate*レベル（出力）で bind する、*premium*レベル（入力）ではない。順を逆にすると cap を divisor で実質的に割って、silent に弱める。**単位が異なるとき演算順が重要。**

2. **Cap に \`.abs()\`。** ユーザが負の cap を渡すことへの defensive、安価（~1ns）で footgun を削除。**API 境界での defensive idiom はコスト分の価値がある。**

3. **明示的 min/max でなく \`clamp(-cap, cap)\`。** Rust 組み込み \`.clamp\` が \`raw.max(-cap).min(cap)\` より短く idiomatic でエラー prone でない。**Stdlib API が合えば使う、合わないときだけカスタムコードに手を出す。**

4. **\`cap == 0\` に特殊ケースなし。** Clamp から自然に落ちる：\`clamp(-0, 0)\` は \`0\` を返す。**自然に処理される edge case は明示的分岐の edge case より良い。** 明示的分岐はテストするコードパスを増やす、自然な処理は自動的にカバーされる。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

L6 後：
- **compute.rs** が Stage 8b の \`compute_premium\` + \`compute_rate\` + \`saturate_i128_to_i64\` + 4 premium テスト + 5 rate テスト + 1 proptest まで一致。残るギャップは \`apply_funding\` と balanced-book proptest のみ（L7）。
- **lib.rs** が \`compute_premium\` と \`compute_rate\` を re-export。\`apply_funding\` は L7 の追加。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: どうせ \`i64\` に widen するなら \`params.divisor\` がなぜ \`u32\`？**
Widening は単一の \`i64::from(u32)\` 呼び出し — マシンコードで no-op コスト。\`u32\` ストレージの利点は bit コスト（\`FundingParams\` は \`Copy\`、小さいほうが良い）と semantic 明快さ（divisor が \`-1\` や \`u64::MAX\` は意味不明、\`u32::MAX\` は ~40 億、十分なヘッドルーム）。**\`u32\` が意図を documentation：「これは小さい正カウント」。**

**Q: \`compute_rate\` で overflow しうる？**
除算 \`premium / divisor\` は値を成長させない — 正整数除算が小さい magnitude を生む。\`clamp(-cap, cap)\` が \`cap\` の i64 値を超えて成長しない。**\`compute_rate\` 内で overflow 不可能。** \`compute_premium\` と違って i128 中間値不要。

**Q: \`rate_cap > i64::MAX / 2\` ならどう？ Symmetric clamp は動く？**
\`i64::MIN\` への \`.abs()\` は panic する（\`i64::MIN\` の magnitude に正の \`i64\` なし）。\`rate_cap.0 == i64::MIN\` で \`.abs()\` が panic する。Stage 8b はこれを guard しない — ユーザ提供 \`FundingParams\` の問題。現実 deployment は \`40_000_000\`（\`i64::MAX / 2\` を遥かに下回る）のような値を使う、実際にエッジに届かない。**Defensive \`saturating_abs()\` はこれを扱う、Stage 8b はやらない。**

**Q: \`compute_rate\` の proptest がない理由は？**
明らかな代数的 property がない。「Divide and clamp」には proptest が輝く antisymmetry、可換性、その他の不変条件がない。5 手書きトレーステストが入力領域（normal divide、正 clamp、負 clamp、divisor 0、cap 0）をうまくカバー。**Proptest は property に最適、手書きトレーステストは distinct な入力領域に最適。** Property がないところに proptest を強制しない。

## 次のレッスン（L7）

L7 で \`apply_funding\` を追加 — 3 つ目で最後の pure 関数。\`Position\` のスライス、\`MarkPrice\`、\`FundingRate\` を取り、\`Vec<Settlement>\`（非 flat position あたり 1 つ）を返す。関数は ~25 行だが*longs-pay-shorts*符号規約を encode、**balanced-book zero-sum** proptest を含む — equal-and-opposite position のセットに対して、settlement delta の合計はゼロ（funding は再配分、quote currency を生成も破壊もしない）。Crate 2 つ目の proptest、Module 2 を閉じる。`,
                },
                {
                  title: "レッスン 7 — apply_funding — 符号規約 + zero-sum proptest",
                  slug: "openhl-funding-apply-funding-ja",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン 7 — \`apply_funding\` — 符号規約 + zero-sum proptest

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…が 15 テストを通る（L4-L6 から 10 + 新規 5）。\`compute.rs\` が最後の pure 関数を得る：

- **\`apply_funding(positions, mark, rate) -> Vec<Settlement>\`** — rate を全 non-flat position に適用、マッチごとに settlement を生む。~25 行。
- **4 手書きトレース unit test**：
  - \`apply_funding_skips_flat_positions\`
  - \`apply_funding_longs_pay_shorts_when_rate_positive\`
  - \`apply_funding_shorts_pay_longs_when_rate_negative\`
  - \`apply_funding_returns_empty_on_zero_rate\`
- **1 proptest** — \`balanced_book_settlements_sum_to_zero\` — 任意の equal-and-opposite position pair で settlement の合計はゼロ。**Funding の根本保存則：再配分する、生成も破壊もしない。**

このレッスンで **Module 2 が閉じる**。3 つの pure 関数（\`compute_premium\`、\`compute_rate\`、\`apply_funding\`）すべて配置済み。Module 3（clock state machine）が L8 で開始。

教育の焦点は**符号規約**（longs-pay-shorts）、特にコードが*どう*表現するか：\`delta_unscaled\` の前の \`-\` 1 つ。1 文字が符号契約全体を担う。

## おさらい

L6 後：
- \`compute_premium\` → \`Premium\`
- \`compute_rate\` → \`FundingRate\`
- 10 テスト pass、proptest 1 pass
- \`saturate_i128_to_i64\` のユーザは 1 つ（\`compute_premium\`）

L7 で pipeline の最終段を配線 — rate を per-account settlement にする — saturate helper の 2 つ目のユーザを追加。

## プラン

3 つの編集：

1. **\`compute.rs\` に \`apply_funding\` を append** — \`compute_rate\` の後、\`saturate_i128_to_i64\` の前。
2. **既存の \`mod tests\` ブロックに 4 unit test + 1 proptest を append**。
3. **\`lib.rs\` を更新** — \`apply_funding\` を re-export に追加。

> 🛑 **考えてみよう。** スクロール前に — \`size: PositionSize(i64)\`（正 = long、負 = short）と \`rate: FundingRate(i64)\`（正 = longs pay shorts）がある。素朴な積 \`size × rate\` は long が正 rate ワールドにいると正。**だが long の settlement delta は*負*であるべき（longs pays）。** 符号 flip を encode する最もクリーンな方法は？

（答え：**積の前に \`-\` 1 つ。** \`delta = -(size × mark × rate / RATE_SCALE)\`。積 \`size × rate\` は「magnitude × payment-flow の方向」を自然に encode するが、\`Notional\` の符号規約は「アカウント中心」（正 = 受取、負 = 支払）。\`-\` が market 中心から account 中心へ flip する。**単項マイナス 1 つが規約全体を担う。** コードを読む誰もが \`-\` を見て規約がその時点で意図的に逆転されたと知る。）

## 手順

### Step 1: \`apply_funding\` を追加

\`crates/funding/src/compute.rs\` を開く。\`compute_rate\` の後、\`saturate_i128_to_i64\` の前に：

\`\`\`rust
/// Apply \`rate\` to each position, producing one [\`Settlement\`] per non-flat
/// position. Flat positions (\`size == 0\`) are dropped — there's no settlement
/// to record. Order of input positions is preserved in the output.
///
/// Sign convention: with positive \`rate\`, longs (positive size) pay; shorts
/// (negative size) receive. The product \`size * mark * rate / RATE_SCALE\`
/// is the quote-currency delta; long pays → delta is negative for longs.
#[must_use]
pub fn apply_funding(
    positions: &[Position],
    mark: MarkPrice,
    rate: FundingRate,
) -> Vec<Settlement> {
    if rate.0 == 0 {
        return Vec::new();
    }

    let mut out = Vec::with_capacity(positions.len());
    for pos in positions {
        if pos.size.0 == 0 {
            continue;
        }
        // notional = size * mark, in i128 to absorb the product's full range.
        let notional = i128::from(pos.size.0).saturating_mul(i128::from(mark.0));
        // delta_unscaled = notional * rate; still i128.
        let delta_unscaled = notional.saturating_mul(i128::from(rate.0));
        // Sign convention: longs PAY when rate > 0. The product above is
        // positive (long size * positive rate) — we flip its sign so the
        // resulting delta is negative for longs and positive for shorts.
        let delta_scaled = -delta_unscaled / i128::from(RATE_SCALE);
        out.push(Settlement {
            account: pos.account,
            delta: Notional(saturate_i128_to_i64(delta_scaled)),
        });
    }
    out
}
\`\`\`

~25 行。6 つの動く部分：

1. **\`if rate.0 == 0 { return Vec::new(); }\`** — zero-rate ファストパス。Allocation なし、作業なし。契約を反映：rate ゼロは「適用する funding なし」を意味する。Boot 中や oracle 故障で典型。

2. **\`Vec::with_capacity(positions.len())\`** — output capacity を事前 allocate。Flat position をフィルタしうるが、input length が良い上限。**Push しながら re-allocate を回避。** 小さな最適化、hot path で重要。

3. **\`if pos.size.0 == 0 { continue; }\`** — Flat position をスキップ。経済的エクスポージャなし、settle するとゼロ delta が出力を汚染。**Flat position があるとき output 長と input 長が異なる、と契約。**

4. **\`i128::from(pos.size.0).saturating_mul(i128::from(mark.0))\`** — notional の積。\`size * mark\` は大きな position と大きな mark で \`i64::MAX\` を超えうる（例：position \`1e18\` × mark \`1e10\` = \`1e28\`、i64 を遥かに超える）。**i128 + saturating_mul：\`compute_premium\` と同じ defensive レシピ。**

5. **\`notional.saturating_mul(i128::from(rate.0))\`** — 次の積。今 \`size × mark × rate\` を全部 i128 で持つ。この段階でも i128 が pathological 入力で saturate しうる。

6. **\`-delta_unscaled / i128::from(RATE_SCALE)\`** — 最終 scaling + 符号 flip。\`RATE_SCALE\` での除算が rate の per-billion scaling を undo。**先頭の \`-\` が符号規約。**

その後 \`saturate_i128_to_i64(delta_scaled)\` で i64（Notional の内部型）に clip、\`Settlement\` を push。

> 🛑 **考えてみよう。** なぜ関数は \`positions: Vec<Position>\`（owned vec）でなく \`positions: &[Position]\`（スライス）を取る？

（答え：**呼び出し側が position リストを所有して tick 間で再利用する。** 所有権を取ると呼び出し側が毎呼び出し前に clone する必要がある。Slice 借用はゼロコスト、呼び出し側が所有権を保持。**関数が使える最小制限の型を受ける** — iteration だけ要るなら Vec でなく slice。）

> 🛑 **やりがちな勘違い。** 「ループでなく \`positions.iter().filter(...).map(...).collect()\` を使えば？」 **動く、より idiomatic Rust。** Stage 8b が imperative ループを使うのは中間計算が別々の \`let\` binding のとき追いやすいから。関数チェーン \`positions.iter().filter(|p| p.size.0 != 0).map(|pos| { let notional = ...; Settlement { ... } }).collect()\` も同様に動く。**Idiom より可読性 — チームがデバッグしやすい形を選ぶ。**

### Step 2: 符号規約を歩く

符号 flip が関数中最も微妙な部分。両方向に追っていく。

**正 rate、long position：**
- \`size.0 = +100\`、\`mark.0 = 100\`、\`rate.0 = 1_000_000\`（0.1%）
- \`notional = 100 × 100 = 10_000\`（i128）
- \`delta_unscaled = 10_000 × 1_000_000 = 10_000_000_000\`（正 i128）
- \`delta_scaled = -10_000_000_000 / 1_000_000_000 = -10\`
- \`Notional(-10)\` → 「long が 10 支払う」

**正 rate、short position：**
- \`size.0 = -50\`、\`mark.0 = 100\`、\`rate.0 = 1_000_000\`
- \`notional = -50 × 100 = -5_000\`（負 i128）
- \`delta_unscaled = -5_000 × 1_000_000 = -5_000_000_000\`
- \`delta_scaled = -(-5_000_000_000) / 1_000_000_000 = 5\`
- \`Notional(+5)\` → 「short が 5 受け取る」

**負 rate、long position：**
- \`size.0 = +100\`、\`mark.0 = 100\`、\`rate.0 = -1_000_000\`
- \`notional = 10_000\`
- \`delta_unscaled = 10_000 × -1_000_000 = -10_000_000_000\`
- \`delta_scaled = -(-10_000_000_000) / 1_000_000_000 = 10\`
- \`Notional(+10)\` → 「long が 10 受け取る」 ✓

**\`delta_unscaled\` の前の \`-\` 1 つが 4 ケースすべての符号規約を一貫に担う。** これなしだと longs が支払うべきところで受け取り、逆も同様。**1 文字、1 設計決定。**

> 🛑 **やりがちな勘違い。** 「\`-\` なしで delta を計算して「市場 delta」と呼び、ストレージ層で flip すれば？」 **符号 flip ポイント 2 つはバグの可能性を 2 倍にする。** 数学層で「アカウント中心」を 1 度 encode すれば、下流のすべて（bridge、balance、telemetry）が一貫した規約で \`Notional\` を読む。**単一変換ポイントはテストする surface area の半分。**

### Step 3: 4 unit test を追加

既存の rate テストの後（proptest ブロックの前 — 新 proptest は既存の \`proptest! { ... }\` ブロックに Step 4 で追加）に：

\`\`\`rust
    #[test]
    fn apply_funding_skips_flat_positions() {
        let positions = vec![pos(1, 0), pos(2, 100), pos(3, 0)];
        let settlements = apply_funding(&positions, MarkPrice(100), FundingRate(1_000_000));
        assert_eq!(settlements.len(), 1);
        assert_eq!(settlements[0].account, AccountId(2));
    }

    #[test]
    fn apply_funding_longs_pay_shorts_when_rate_positive() {
        // size 100 (long), mark 100, rate 0.001 (1_000_000 ppb)
        // delta = -(100 * 100 * 1_000_000 / 1_000_000_000) = -10
        let positions = vec![pos(1, 100), pos(2, -50)];
        let s = apply_funding(&positions, MarkPrice(100), FundingRate(1_000_000));
        assert_eq!(s[0].account, AccountId(1));
        assert_eq!(s[0].delta, Notional(-10), "long pays");
        assert_eq!(s[1].account, AccountId(2));
        assert_eq!(s[1].delta, Notional(5), "short receives, half size");
    }

    #[test]
    fn apply_funding_shorts_pay_longs_when_rate_negative() {
        let positions = vec![pos(1, 100), pos(2, -50)];
        let s = apply_funding(&positions, MarkPrice(100), FundingRate(-1_000_000));
        assert_eq!(s[0].delta, Notional(10), "long receives");
        assert_eq!(s[1].delta, Notional(-5), "short pays");
    }

    #[test]
    fn apply_funding_returns_empty_on_zero_rate() {
        let positions = vec![pos(1, 100), pos(2, -50)];
        let s = apply_funding(&positions, MarkPrice(100), FundingRate(0));
        assert!(s.is_empty());
    }
\`\`\`

4 テスト、各々挙動を pin：

1. **\`apply_funding_skips_flat_positions\`** — 入力 3 position、2 つ flat。出力 1。フィルタセマンティクス確認。**生存 settlement のアカウントが non-flat 入力 position と一致することも確認。**

2. **\`apply_funding_longs_pay_shorts_when_rate_positive\`** — 標準シナリオ。Mark 100 で long position 100、rate 0.1% → delta -10（long が支払う）。Short position -50 → delta +5（short が受け取る、サイズ半分なので magnitude 半分）。**非対称 magnitude が delta が \`|size|\` でスケールすることを証明、ただ符号でなく。**

3. **\`apply_funding_shorts_pay_longs_when_rate_negative\`** — 同じ position、逆 rate。Long が今度は +10 受け取る、short が -5 支払う。**符号規約が symmetric であることを確認。**

4. **\`apply_funding_returns_empty_on_zero_rate\`** — fast-path。非空 position、ゼロ rate → 空出力。**早期 return が per-position 作業の前に走ることを確認。**

\`pos(account, size)\` helper は L5 のテストモジュール setup で追加済み。ここで自由に使う。

### Step 4: Balanced-book zero-sum proptest を追加

既存の \`proptest! { ... }\` ブロック（現在 \`premium_is_antisymmetric_in_mark_index\` のみ）に 2 つ目のテストを追加：

\`\`\`rust
        /// Sum of all settlement deltas is zero (or exactly the negation of
        /// itself with saturation tolerance) when the population is balanced.
        /// Equivalently: funding redistributes between longs and shorts —
        /// it doesn't create or destroy quote currency.
        ///
        /// We test the property by constructing equal-and-opposite long/short
        /// pairs and asserting their settlements sum to zero exactly.
        #[test]
        fn balanced_book_settlements_sum_to_zero(
            size in 1i64..1_000_000,
            mark in 1u64..1_000_000,
            rate in -10_000_000i64..10_000_000,
        ) {
            let positions = vec![
                pos(1, size),
                pos(2, -size),
            ];
            let s = apply_funding(&positions, MarkPrice(mark), FundingRate(rate));
            if rate == 0 {
                prop_assert!(s.is_empty());
            } else {
                prop_assert_eq!(s.len(), 2);
                prop_assert_eq!(s[0].delta.0 + s[1].delta.0, 0);
            }
        }
\`\`\`

**Zero-sum property が funding の根本保存則。** Balanced book — equal size の short ごとに long 1 つ — はちょうど再配分すべき。Shorts が集合的に receive する量と longs が集合的に pay する量が等しい、quote currency は生成も破壊もされない。

Proptest がこれを exercise：
- ランダムに \`size\`（1 から 1M）、\`mark\`（1 から 1M）、\`rate\`（-10M から +10M ppb、つまり -1% から +1%）**生成**。
- Balanced book を**構築**：account 1 が long \`size\`、account 2 が short \`size\`。
- **Funding を適用**。Rate がゼロなら出力空（settlement なし）。それ以外なら 2 settlement。
- Delta の合計が 0 であることを **assert**。

> 🛑 **考えてみよう。** なぜ \`size\` を full i64 範囲でなく \`1i64..1_000_000\` に bound？

（答え：**非常に大きな \`size\` や \`mark\` で i128 中間値が saturate しうる。** \`i128::saturating_mul\` が clip すると、ラウンドトリップ計算 \`(size * mark * rate / RATE_SCALE)\` が情報を失う — long の saturated 値が short の saturated 値の正確な負にならず、zero-sum property が破れる。**1M bound が saturation の起こらない regime に入力を保つ。** 現実 production proptest はもっと wide にできるが saturation 用 tolerance を加える必要、我々は単純な「no saturation regime」アプローチを選んだ。）

> 🛑 **やりがちな勘違い。** 「整数除算 rounding 用に \`== 0\` でなく \`sum.abs() < 1\` をテストすればよくない？」 **選んだ入力範囲内で property は厳密に成り立つ。** \`size_long == -size_short\` だから、i128 積が除算前に互いの厳密な負、\`RATE_SCALE\` で割っても変わらない（整数除算はゼロに向けて丸める、\`-x / d == -(x / d)\` が任意の符号付き \`x\` と正 \`d\` に成り立つ）。**範囲内で厳密 zero-sum、tolerance 不要。**

### Step 5: \`lib.rs\` を更新

現在の re-export：

\`\`\`rust
pub use compute::{compute_premium, compute_rate};
\`\`\`

これに：

\`\`\`rust
pub use compute::{apply_funding, compute_premium, compute_rate};
\`\`\`

アルファベット順。**Module 2 の 3 つの pure 関数すべてがクレートルートで re-export 済み。** 呼び出し側は \`compute::\` 経由なしで使える。

### Step 6: テストを実行

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

期待：

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to \`FundingClock\`
    Finished \`test\` profile [unoptimized + debuginfo] in 0.7s

running 15 tests
test compute::tests::apply_funding_longs_pay_shorts_when_rate_positive ... ok
test compute::tests::apply_funding_returns_empty_on_zero_rate ... ok
test compute::tests::apply_funding_shorts_pay_longs_when_rate_negative ... ok
test compute::tests::apply_funding_skips_flat_positions ... ok
test compute::tests::balanced_book_settlements_sum_to_zero ... ok
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
... (L4-L6 テストの残り)

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**15 テスト全 green。** Rustdoc warning は 1 つだけ（\`FundingClock\` — L8 で解決）。**Module 2 が閉じる。**

よくあるエラー：

- **どこでも \`delta == 0\`** — \`delta_unscaled\` の前の \`-\` を忘れた。符号 flip なしだと longs と shorts が同じ符号 delta を得る（\`pos.size\` が既に符号を運ぶから）、longs と shorts が両方支払う/両方受け取る、互いに対立しない。Unit test がすぐ捕まえる。
- **Long が支払う、short が支払う**（両方負 delta） — \`pos.size\` が signed であることを見逃した。素朴な \`size * mark * rate\`（upcast なし）は動くかもしれないが符号追跡が脆弱。\`i128::from(pos.size.0)\` で符号を乗算を通して保つ。
- **\`size = 100_000, mark = 100_000\` で proptest 失敗** — \`size * mark = 1e10\`、その後 \`× rate = 1e16\` — i128 範囲内。Property は成立するはず。失敗するなら符号 flip を確認：long と short が反対符号 + 等規模 delta を生む必要。
- **\`assertion failed: s[0].delta == Notional(-10)\` が \`Notional(10)\`** — \`delta_unscaled\` を正しく設定したが先頭の \`-\` を忘れた。「longs pay = 負 delta」規約が flip を要求。

## 設計の振り返り

このレッスンに焼き込まれた決定 4 つ：

1. **単一の単項マイナスが符号規約全体を担う。** \`-delta_unscaled\` で「longs pay」を encode することで、規約が市場中心と account 中心セマンティクスの境界で 1 箇所に保たれる。**符号 flip ポイント 2 つはバグの surface area を 2 倍にする。**

2. **Filter する、error にしない。** Flat position は silent にフィルタされる。\`Result<Vec<Settlement>, FlatPositionError>\` を返さない — flat position は*想定されたもの*（この tick 前に閉じたアカウント）。**「flat position なし」property は呼び出し側が気にすれば verify できる前提条件、我々は単に drop する。**

3. **Slice 入力、owned 出力。** \`&[Position]\` で呼び出し側が所有権を保持、\`Vec<Settlement>\` で呼び出し側が以前持っていなかった owned data を返す。**関数は参照を消費し値を生む、pure transformation。**

4. **Proptest range が saturation regime を避ける。** \`size in 1..1M\` で i128 積を \`saturating_mul\` の clamp threshold 下に保つ。この範囲で property は*厳密に*成立、broaden すると property を弱める必要。**Property を厳密に真にする proptest range を選ぶ、近似でなく。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

L7 後：
- **compute.rs** が Stage 8b と**完全**一致。3 pure 関数すべて、helper すべて、テストすべて、proptest すべて。
- **lib.rs** が \`apply_funding\`、\`compute_premium\`、\`compute_rate\` を re-export。残るギャップは \`pub mod clock;\` とその re-export — L8。

**Module 2 完了。** Module 3 が L8 で開始。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ output がアカウント順ソートでなく入力順を保つ？**
Determinism。ソートは順序選択を強要、入力順保持は関数の挙動を入力から trivially predictable にする。**ソート出力が必要な呼び出し側は結果をソートできる、必要ない呼び出し側はコストを払わない。** デフォルトで最安挙動が勝つ。

**Q: 現実的入力で \`notional × rate\` の桁は？**
\`size = 1M\`、\`mark = 1M\`、\`rate = 1e7\`（RATE_SCALE の 1% = interval ごとに 1%）で：\`notional = 1e12\`、\`delta_unscaled = 1e19\`。これは \`i64::MAX\`（~9.2e18）の直近で、「合理的」入力で既に saturation regime にいる。**現実 deployment に i128 中間値は optional ではない。**

**Q: \`apply_funding\` の saturation 挙動のテストがないのは？**
Saturation ケースは*helper 経由で*テスト済み（\`saturate_i128_to_i64\` の境界挙動は L5 で探求）。同じ境界を関数呼び出しで再テストするのは冗長。**Helper を 1 度テスト、それ以外はそれを信頼する。** 完全性のため composition test（\`size = u64::MAX, mark = u64::MAX, rate = i64::MAX\`）を追加する価値があるかもしれないが、Stage 8b は選ばなかった — saturation 保証は helper から来る、helper はテスト済み。

**Q: \`apply_funding\` を巨大 position リストで \`parallel_iter\` にできる？**
\`rayon\` でできる。V0 では position リストは多くて数千アカウント（HL の現実のユーザ数、単一マーケットあたり）。並列化オーバーヘッドが作業を超える。**Tick ごとに 10K+ position で rayon が payoff する。** Production トラフィックが要求するまで先送り。

## Module 2 マイルストーン — 築いたもの

L7 後：
- **3 pure 関数**：\`compute_premium\`、\`compute_rate\`、\`apply_funding\`。
- **1 private helper**：\`saturate_i128_to_i64\`。
- **15 テスト**：9 手書きトレース + 2 proptest（antisymmetry、zero-sum）。
- **\`compute.rs\` ~150 行**（テスト除く）。
- Module 2 が clock 以外のすべてで **Stage 8b と byte-identical**。

Crate は今 \`(positions, mark, index, params)\` タプルから fully-determined \`Vec<Settlement>\` を生む。**数学は完了。** Module 3 がこれを tick-gating state でラップする — いつ計算するか、いつスキップするか、いつ settle するか。

## 次のレッスン（L8）

L8 で \`crates/funding/src/clock.rs\` を作成 — 新モジュール — \`FundingClock\` 構造体 + \`FundingTick\` 出力型付き。\`tick()\` の最初のバージョン追加：「十分時間が経過したか？」guard の後ろで \`compute_premium\` + \`compute_rate\` + \`apply_funding\` を組み合わせる関数。**Clock は pure 数学を正しい cadence で呼ぶ discrete event loop。** L8 のテストは単純な sanity テスト、*不変条件*（at-most-one-per-interval、no-catch-up）は L9 と L10 で独自のレッスンを得る。`,
                },
              ],
            },
          },
          {
            title: "Clock state machine",
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: "レッスン 8 — FundingClock — discrete event loop",
                  slug: "openhl-funding-clock-scaffold-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン 8 — \`FundingClock\` — discrete event loop

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…が 18 テストを通る（L4-L7 から 15 + 新規 3）。Crate が**3 つ目で最後のモジュール**を得る：

- **\`crates/funding/src/clock.rs\`** — 新ファイル、module doc + 2 構造体 + 1 impl ブロック：
  - **\`FundingClock\`** — \`params: FundingParams\` と \`last_settled_at: u64\` を所有。Funding tick 間の state。
  - **\`FundingTick\`** — \`settled_at\`、\`premium\`、\`rate\`、\`settlements\` を運ぶ出力型。\`tick()\` が成功時に返す。
  - **\`impl FundingClock\`** — \`new\`、\`params\`、\`last_settled_at\` accessor、\`tick(...)\` 関数。
- **3 サニティテスト**：
  - \`first_tick_before_interval_returns_none\`
  - \`first_tick_at_exact_interval_fires\`
  - \`empty_positions_yield_empty_settlements_but_still_advance_clock\`
- **\`crates/funding/src/lib.rs\`** — \`pub mod clock;\` 宣言、\`FundingClock\` + \`FundingTick\` を re-export。**最後の rustdoc warning が解決。**

L8 が**モジュール opener**。この clock を微妙にする不変条件 — *interval ごとに最多 1 settlement*、*長ギャップ後の no catch-up* — は独自の dedicated レッスン（L9 と L10）を得る。このレッスンは構造を確立する。

教育の焦点は **discrete event loop を持つ state machine**：pure 関数（数学）が stateful object（clock）で gate される、determinism を失わずに。

## おさらい

L7 後：
- 3 pure 関数（\`compute_premium\`、\`compute_rate\`、\`apply_funding\`）全 green。
- 15 テスト pass、proptest 2 含む。
- \`compute.rs\` が Stage 8b と byte-identical。
- Crate は funding *数学*を計算する、まだ*いつ*適用するかを知らない。

L8 で「いつ」を配線。Clock は数学を正しい時に呼ぶ薄い layer — そして決定的に、*間違った*時には呼ば*ない*。

## プラン

3 ファイル編集：

1. **\`crates/funding/src/clock.rs\` を作成** — module doc + imports + \`FundingClock\` + \`FundingTick\` + \`impl FundingClock { new, params, last_settled_at, tick }\`。
2. **\`#[cfg(test)] mod tests\` を \`clock.rs\` に追加**、3 サニティテスト付き。
3. **\`crates/funding/src/lib.rs\` を更新** — \`pub mod clock;\` + \`FundingClock\`、\`FundingTick\` を re-export。

> 🛑 **考えてみよう。** スクロール前に — \`tick()\` は \`Option<FundingTick>\` を返す — settlement があれば \`Some\`、なければ \`None\`。**なぜ \`Option\` を返す、常に \`FundingTick\`（settlement なしのとき空 \`settlements\` 付き）を返さない？** ヒント：呼び出し側が結果で何をするかを考える。

（答え：**\`None\` が「state 変化なし」を、呼び出し側が結果を inspect するまでもなく信号する。** Funding tick をブロック生産ループに配線する呼び出し側は、\`FundingApplied\` event を発火するか、settlement を log するか等を安価に知りたい。\`Option\` なら \`if let Some(tick) = clock.tick(...)\` が自然な形。常に return すると呼び出し側に \`if !tick.settlements.is_empty()\` 等のチェックを強要 — それは正しい意味すら捕まえない（空 settlement リストは「tick fired だが position なし」*かもしれない*、「tick fired していない」*かもしれない*）。**\`Option\` が二分を型レベルで明示。**）

## 手順

### Step 1: \`clock.rs\` を作成

\`crates/funding/src/clock.rs\` を作成。初期内容（ファイル先頭）：

\`\`\`rust
//! Funding clock — the gating state machine that decides *when* to settle.
//!
//! The rate math lives in [\`crate::compute\`]; this module is the discrete
//! event loop that calls it on the right cadence. Two invariants:
//!
//!   1. **At most one settlement per interval.** Two ticks at the same
//!      timestamp produce one settlement, not two.
//!   2. **No catch-up.** If \`now\` jumps forward by 10 intervals (validator
//!      reboot, chain pause), we settle *once*. Compounding 10 ticks of
//!      retroactive funding from a single stale snapshot would over-pay
//!      whichever side has been losing without giving the loser a chance
//!      to close. Production deployments that need catch-up logic should
//!      build it on top of repeated ticks with fresh snapshots, not here.

use crate::compute::{apply_funding, compute_premium, compute_rate};
use crate::types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Position, Premium, Settlement,
};
\`\`\`

2 部分に注目：

**Module doc が両不変条件を先頭で名指す。** 実際の強制は \`tick()\`（interval guard）と L9 / L10 のテストにある。だが*契約*はここ、最上部にある — モジュールを読む誰もがコードの前に両不変条件を見る。**契約を約束する、下のコードとテストで守る。**

**Imports が我々が必要なすべてを引っ張る。** \`apply_funding\`、\`compute_premium\`、\`compute_rate\`（Module 2）。\`FundingParams\`、\`FundingRate\`、\`IndexPrice\`、\`MarkPrice\`、\`Position\`、\`Premium\`、\`Settlement\`（Module 1）。**L4 の compute.rs imports と同じロジック：boilerplate を早期に安定化。**

### Step 2: \`FundingClock\` 構造体を追加

Imports の後に：

\`\`\`rust
/// State that persists across funding ticks. The clock is initialized with
/// the timestamp of its last settlement (often the chain's genesis time, or
/// the previous validator-set's last tick).
#[derive(Clone, Debug)]
pub struct FundingClock {
    params: FundingParams,
    last_settled_at: u64,
}
\`\`\`

2 フィールド、両方*private*：

1. **\`params: FundingParams\`** — per-network config（interval_secs、rate_cap、divisor）。Construction で set、\`params()\` 経由で読めるが mutate できない。**Post-construction で immutable — production deployment は funding params を mid-run で変えない。**

2. **\`last_settled_at: u64\`** — 最新の成功 tick のタイムスタンプ。成功 tick ごとに更新。**唯一の可変 state。**

\`#[derive(Clone, Debug)]\` のみ。**\`Copy\` なし** — \`Clone\` は十分安価で、clock を duplicate しやすくして誰かがどのコピーが advance したか忘れることを避けたい。**\`Eq\`/\`Hash\`/\`PartialOrd\` なし** — clock は意味ある等価比較ができない、運用 state machine。

> 🛑 **やりがちな勘違い。** 「並行 tick をサポートするため \`last_settled_at\` に \`AtomicU64\` を使うべきでは？」 **No — funding crate は契約で single-threaded。** 並行 funding tick は \`last_settled_at\` *かつ* \`CLOB_STATE\` *かつ* bridge が下流で使う balance store で race する。正しい答えは「呼び出し側が tick を serialize する」、「clock が並行を扱う」ではない。**並行性をデータ構造に push すると、存在すべきでない問題に複雑さを加える。**

### Step 3: \`FundingTick\` を追加

\`FundingClock\` の後に：

\`\`\`rust
/// The output of a successful tick. Returned by [\`FundingClock::tick\`] when
/// at least \`params.interval_secs\` have elapsed since the last settlement.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FundingTick {
    pub settled_at: u64,
    pub premium: Premium,
    pub rate: FundingRate,
    pub settlements: Vec<Settlement>,
}
\`\`\`

4 フィールド、すべて \`pub\`。**出力構造体は典型的に全 public フィールドを持つ** — 呼び出し側が直接消費する、plain data、encapsulated state ではない。

各フィールドが運ぶもの：

- **\`settled_at: u64\`** — tick が適用されたタイムスタンプ（= \`tick()\` への \`now\` 引数）。
- **\`premium: Premium\`** — この tick で計算した premium（telemetry / event emission 用）。
- **\`rate: FundingRate\`** — divisor + cap 後の per-interval rate（同じく telemetry 用）。
- **\`settlements: Vec<Settlement>\`** — \`apply_funding\` が生んだもの。実際に適用する delta。

**Bridge が必要なのは \`settlements\` なのに、なぜ \`premium\` と \`rate\` を含む？** Telemetry が必要だから。「tick 12345 の funding rate は 0.125% だった」と log したい observer は \`tick.rate\` を直接読む。これらのフィールドなしだと telemetry が rate を再計算する必要 — 重複作業、重複が実際の rate と disagree しうる（どちらかの変更で）。**下流 consumer が欲しいなら中間値を出力構造体で surface する。**

\`PartialEq, Eq\` derive はテスト可能性のため — テストが \`assert_eq!(tick, expected)\` できる。**安価で有用。**

### Step 4: Impl ブロックを追加

\`FundingTick\` の後に：

\`\`\`rust
impl FundingClock {
    /// Construct a clock that thinks its last settlement happened at
    /// \`genesis_time\`. The first tick after \`genesis_time + interval_secs\`
    /// will fire.
    #[must_use]
    pub const fn new(params: FundingParams, genesis_time: u64) -> Self {
        Self {
            params,
            last_settled_at: genesis_time,
        }
    }

    #[must_use]
    pub const fn params(&self) -> FundingParams {
        self.params
    }

    #[must_use]
    pub const fn last_settled_at(&self) -> u64 {
        self.last_settled_at
    }

    /// Attempt a settlement. Returns \`Some\` only if at least one full
    /// \`interval_secs\` has elapsed since \`last_settled_at\`.
    ///
    /// On success, the clock advances to \`now\` (NOT to
    /// \`last_settled_at + interval\`) — see the "no catch-up" invariant in
    /// the module docs. Production callers wanting strict interval alignment
    /// can advance externally, but openhl's default is "settle on the first
    /// block ≥ interval boundary, then reset the deadline".
    pub fn tick(
        &mut self,
        now: u64,
        mark: MarkPrice,
        index: IndexPrice,
        positions: &[Position],
    ) -> Option<FundingTick> {
        if now < self.last_settled_at.saturating_add(self.params.interval_secs) {
            return None;
        }

        let premium = compute_premium(mark, index);
        let rate = compute_rate(premium, self.params);
        let settlements = apply_funding(positions, mark, rate);

        self.last_settled_at = now;

        Some(FundingTick {
            settled_at: now,
            premium,
            rate,
            settlements,
        })
    }
}
\`\`\`

4 メソッド：

#### \`new(params, genesis_time)\`

Clock を construct。**\`const fn\`** なので \`static DEFAULT_CLOCK: FundingClock = FundingClock::new(...)\` がコンパイル時に可能。**\`#[must_use]\`** で clock を construct して discard するのは常にバグ。

Doc がタイミングセマンティクスを説明：「\`genesis_time + interval_secs\` 以降の最初の tick が fire する」。\`genesis_time = 1_000_000\`、\`interval_secs = 3600\` を set した呼び出し側は最初の tick が \`1_003_600\` 以降に fire することを知る。**驚きなし。**

#### \`params()\` と \`last_settled_at()\` accessor

Private フィールドへの read-only アクセス。**\`const fn\`** + **\`#[must_use]\`** 両方とも。値返し（\`&FundingParams\` でなく）、なぜなら \`FundingParams: Copy\`。**Copy で安価、呼び出し側に lifetime 体操なし。**

#### \`tick(&mut self, now, mark, index, positions)\`

Clock の核心。3 論理 phase：

1. **Guard**：\`if now < self.last_settled_at.saturating_add(self.params.interval_secs) { return None; }\`。\`saturating_add\` が \`last_settled_at\` が \`u64::MAX\` 近くのとき \`u64\` overflow を防ぐ（pathological、だが defense は無料）。

2. **Compute**：3 つの Module 2 関数をチェーン。\`compute_premium(mark, index)\` → \`compute_rate(premium, params)\` → \`apply_funding(positions, mark, rate)\`。**Clock がそれらを compose、reimplement しない。**

3. **State 更新 + return**：\`last_settled_at\` を \`now\` に進める、\`Some(FundingTick { ... })\` を返す。

**決定的に、clock は \`now\` に advance、\`last_settled_at + interval_secs\` ではない。** これが「no catch-up」不変条件の実装 — tick が遅れて fire したとき、deadline を後ろにリセットする catch-up でなく。L10 のレッスンがこれが重要な理由を説明する。

> 🛑 **考えてみよう。** \`last_settled_at = 1_000_000\`、\`interval_secs = 3600\`、\`now = 1_010_000\`（= +10000s、~2.8 interval）で \`tick()\` の後の \`last_settled_at\` は？

（答え：**\`1_010_000\`。** \`1_003_600\`（genesis から 1 interval 後）でも \`1_007_200\`（genesis から 2 interval 後）でもない。Clock は \`now\` に advance する — \`tick()\` の doc コメントを見る。次の tick は \`now ≥ 1_010_000 + 3600 = 1_013_600\` まで fire しない。**これが設計選択、L10 が理由を説明。**）

### Step 5: 3 サニティテストを追加

\`impl FundingClock\` ブロックの後に：

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Notional, PositionSize};
    use openhl_clob::AccountId;

    fn pos(account: u64, size: i64) -> Position {
        Position {
            account: AccountId(account),
            size: PositionSize(size),
        }
    }

    fn balanced_book() -> Vec<Position> {
        vec![pos(1, 100), pos(2, -100)]
    }

    #[test]
    fn first_tick_before_interval_returns_none() {
        let params = FundingParams::hyperliquid_default(); // 3600s interval
        let mut clock = FundingClock::new(params, 1_000_000);

        // 3599 seconds later — not enough.
        let out = clock.tick(1_003_599, MarkPrice(100), IndexPrice(100), &balanced_book());
        assert!(out.is_none());
        // Clock didn't advance.
        assert_eq!(clock.last_settled_at(), 1_000_000);
    }

    #[test]
    fn first_tick_at_exact_interval_fires() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        let out = clock
            .tick(1_003_600, MarkPrice(100), IndexPrice(100), &balanced_book())
            .expect("tick should fire at exact interval boundary");
        assert_eq!(out.settled_at, 1_003_600);
        // mark == index → zero rate → empty settlements
        assert_eq!(out.rate, FundingRate(0));
        assert!(out.settlements.is_empty());
        assert_eq!(clock.last_settled_at(), 1_003_600);
    }

    #[test]
    fn empty_positions_yield_empty_settlements_but_still_advance_clock() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        let out = clock
            .tick(1_003_600, MarkPrice(101), IndexPrice(100), &[])
            .expect("tick fires regardless of position count");
        assert!(out.settlements.is_empty());
        // But the rate was still computed — useful for telemetry.
        assert_eq!(out.rate, FundingRate(1_250_000));
        assert_eq!(clock.last_settled_at(), 1_003_600);
    }
}
\`\`\`

テスト setup について 3 つ注目：

**テストモジュールが \`Notional\` と \`PositionSize\` を import** — このファイルで使うのは \`PositionSize\` だけだが（\`Notional\` は L9 で使う）。L5 のテストモジュールと同じ boilerplate-安定化パターン。

**2 つの helper：\`pos(account, size)\` と \`balanced_book()\`。** 最初は L5 helper をエコー。2 つ目は L8/L9 テストが繰り返し使う標準的な 2-position book を生む。**Helper は 3+ テストで使うとき価値を生む** — 両方とも該当。

**3 テスト、3 関心事：**

1. **\`first_tick_before_interval_returns_none\`** — guard が動く。Interval 経過前に tick を呼ぶ → \`None\`。Clock state 変化なし。**Catches：「guard を忘れた」または「常に Some を返した」。**

2. **\`first_tick_at_exact_interval_fires\`** — 境界 inclusive。\`genesis + interval_secs\` ちょうどで tick が fire。Guard 条件の off-by-one（\`<\` vs \`<=\`）を捕まえる。Body が数学 composition を verify：\`mark == index\` → \`Premium(0)\` → \`FundingRate(0)\` → 空 settlement。

3. **\`empty_positions_yield_empty_settlements_but_still_advance_clock\`** — Zero position でも composition が動く。\`apply_funding(&[])\` が empty を返す、clock はまだ advance。**Catches：「tick() を position があることに gate した」**または空入力を mishandle する shortcut。

> 🛑 **やりがちな勘違い。** 「\`mark\` か \`index\` がゼロのときをテストすべき？」 **L4 の premium テストで既にカバー。** Clock は入力を \`compute_premium\` に通すだけ。\`compute_premium\` を信頼しないなら \`compute.rs\` に追加テストを書く、ここで重複しない。**同じ挙動を 2 つの抽象レベルでテストしない。**

### Step 6: \`lib.rs\` を更新

現状：

\`\`\`rust
//! ...

pub mod compute;
pub mod types;

pub use compute::{apply_funding, compute_premium, compute_rate};
pub use types::{ ... };
\`\`\`

Clock モジュールを追加：

\`\`\`rust
//! ...

pub mod clock;
pub mod compute;
pub mod types;

pub use clock::{FundingClock, FundingTick};
pub use compute::{apply_funding, compute_premium, compute_rate};
pub use types::{ ... };
\`\`\`

モジュール宣言はアルファベット順（\`clock\` が \`compute\` の前、\`compute\` が \`types\` の前）。Re-export も同様。**L8 の lib.rs が最終形** — L9 と L10 が新しいモジュールレベル名前を追加しない。

### Step 7: テストを実行

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

期待：

\`\`\`
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
    Finished \`test\` profile [unoptimized + debuginfo] in 0.6s

running 18 tests
test clock::tests::empty_positions_yield_empty_settlements_but_still_advance_clock ... ok
test clock::tests::first_tick_at_exact_interval_fires ... ok
test clock::tests::first_tick_before_interval_returns_none ... ok
test compute::tests::... (L4-L7 から 15 つ全て)

test result: ok. 18 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**18 テスト、rustdoc warning なし。** Crate のドキュメンテーションが完成。

よくあるエラー：

- **\`now == last_settled_at + interval - 1\` で \`tick\` が fire** — guard で \`<\` でなく \`<=\` を使った、もしくは inverted 形で \`>\` でなく \`>=\`。意図セマンティクス：「\`now >= last_settled_at + interval\` で fire」、guard 用に negate すると \`if now < last_settled_at + interval { return None; }\`。
- **\`tick\` が \`last_settled_at\` を advance しない** — \`Some(FundingTick { ... })\` の前の \`self.last_settled_at = now;\` 行を忘れた。次の tick が即座に再 fire する。
- **\`empty_positions...\` テストで \`out.settlements\` が non-empty** — \`apply_funding(&[])\` は empty を返すべき。Trace：\`rate.0 == 0\` の早期 return が empty vec を返す、*かつ*空 positions slice がループを完全にスキップする。どちらのパスも empty を生む。
- **\`clock.tick(...).expect(...)\` の後の \`clock.last_settled_at()\` で borrow checker エラー** — \`tick\` が \`&mut self\` を取る、borrow は expression 完了時に終わる。結果を変数に代入してからその結果を drop する前に \`clock.last_settled_at()\` を呼ぶと borrow が live。解決：\`let out = clock.tick(...); assert_eq!(clock.last_settled_at(), ...);\` — \`let\` が call 末尾で borrow を終わらせる。

## 設計の振り返り

このレッスンに焼き込まれた決定 5 つ：

1. **常時 return でなく \`Option<FundingTick>\`。** \`None\` が「state 変化なし」を安価に信号。呼び出し側が \`FundingTick\` を inspect する必要なし。**型システムで「fire したか？」二分を encode。**

2. **Clock は \`now\` に advance、\`last_settled + interval\` ではない。** 「完全に periodic」からの最初の大きな違い — clock の deadline が毎 fire でリセット、どれだけ経過したかに関わらず。**L10 がこれを defend する、ここでは記録するだけ。**

3. **Module 2 関数を reimplementation なしで compose。** \`tick()\` が \`compute_premium\`、\`compute_rate\`、\`apply_funding\` をチェーン。Clock はどれの動作も知らない — 順序だけ。**層化：数学が計算、clock が gate。**

4. **\`FundingTick\` が telemetry のため中間値を expose。** Premium と rate を出力で surface、最終 settlement だけでなく。下流 observer が再計算する必要なし。**有用な中間を surface、再計算は divergence を招く。**

5. **Module doc が両不変条件を先頭で名指す。** 実際に強制するコードは順番に来る（L8 guard、L9 境界テスト、L10 advancement 選択）。だが*契約*はコードの前に documented。**ドキュメンテーション as 設計意図。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/clock.rs ./crates/funding/src/clock.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

L8 後：
- **clock.rs** が Stage 8b の \`FundingClock\` + \`FundingTick\` + \`impl FundingClock { ... }\` + 7 テスト中 3 つまで一致。残り 4 テストは L9（interval-gating + premium-driving の 3 テスト）と L10（no-catch-up の 1 マイルストーンテスト）に分かれる。
- **lib.rs** が Stage 8b と**完全**一致。最終形。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`tick\` が \`&mut self\` で \`self\` を消費して \`(Self, Option<FundingTick>)\` を返さない理由は？**
実用主義。\`&mut self\` が in-place 変更の標準 Rust パターン。消費して return すると呼び出し側に re-assign を強要：\`clock = clock.tick(...)\`。Semantic 利得なしで verbose。**State machine が mutate するなら \`&mut self\`、真に変換するなら consuming。** Funding clock は前者。

**Q: \`FundingClock\` は tick の*数*を追跡すべき（例：telemetry 用）？**
\`ticks_fired: u64\` カウンタを追加できる。Stage 8b はしない — 呼び出し側が気にすれば外部でカウントできる。**具体的な consumer なしで minimal struct に state を追加しない。** 後で追加するのは struct field 変更 1 つ、unused state を削除するのは breaking API 変更。

**Q: \`tick\` が \`mark\`、\`index\`、\`positions\` を引数として取る、clock に持たせない理由は？**
毎 tick で変わるから。\`mark\` と \`index\` は tick 時の oracle/orderbook read から、\`positions\` は fresh snapshot。Clock に保存すると呼び出し側に \`tick\` 呼び出し前に更新を要求 — 同じ形でステップ多い。**毎呼び出しで変わる入力は call に、persist する入力は receiver に。**

**Q: Clock の proptest がない理由は？**
Clock の property はほぼ*interval セマンティクス*（interval ごとに 1 settlement、no catch-up）で、手書きトレーステストとして表現しやすい。Module 2 の antisymmetry や zero-sum のような代数的 property がない。**Clock は event loop、event loop は代数でなく scenario でテスト。**

## 次のレッスン（L9）

L9 で \`clock.rs\` に 3 テストを追加、**interval-gating 不変条件**を増加する深さで exercise：

- \`premium_drives_settlement_signs\` — mark > index のとき settlement が long→short に流れる（full 数学 composition テスト）。
- \`second_tick_requires_another_full_interval\` — 成功 tick の後、次は別の \`interval_secs\` が要る。Interval は 1 度だけのチェックではない。
- \`capped_rate_when_premium_extreme\` — saturation premium で rate が cap に clamp。\`compute_rate\` の cap 挙動が clock 経由で正しく surface することを確認。

レッスンはほぼ*テスト*と*interval-gating* 不変条件について。**L10 で Module 3 を no-catch-up 不変条件で閉じる。**`,
                },
                {
                  title: "レッスン 9 — Interval-gating 不変条件 — 3 つの deeper test",
                  slug: "openhl-funding-interval-invariant-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 9 — Interval-gating 不変条件 — 3 つの deeper test

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…が 21 テストを通る（L4-L8 から 18 + 新規 3）。**新プロダクションコードなし。** 3 つの新テストが複数 operation にわたる clock セマンティクスのカバレッジを深める：

- **\`premium_drives_settlement_signs\`** — full 数学 composition が clock を流れる。mark > index → 正 premium → settlement の符号が一致。
- **\`second_tick_requires_another_full_interval\`** — Interval-gating が tick 間で persistent。成功 tick が clock を永久 unlock しない。
- **\`capped_rate_when_premium_extreme\`** — \`compute_rate\` の cap 挙動が \`tick()\` 経由で正しく surface。Layer が semantics を失わず compose。

教育の焦点は**複数 operation にわたる不変条件**、1 度だけではない。L8 のテストが guard が*1 度*動くことを verify。L9 のテストが*tick 間*で動くこと、layered composition が微妙なバグを導入しないことを verify。

## おさらい

L8 後：
- \`FundingClock\` が存在、\`tick()\` が \`Option<FundingTick>\` を返す。
- 3 サニティテストが確認：guard 動作、境界 fire、空 positions でも advance。
- 3 Module 2 関数すべてが \`tick()\` 経由で compose。

L8 のテストは clock を*最多 1 度*走らせる。L9 が clock を複数呼び出しで、非自明な入力で exercise、**不変条件が単一 operation を超えて成立する**ことを validate。

## プラン

1 ファイル編集：

1. **\`crates/funding/src/clock.rs\` に 3 テストを append** — 既存の \`#[cfg(test)] mod tests\` ブロック内、L8 の 3 サニティテストの後。

プロダクションコードなし、\`lib.rs\` 変更なし、L8 が既に追加した以上の import なし。

> 🛑 **考えてみよう。** スクロール前に — L8 の \`first_tick_at_exact_interval_fires\` テストは \`tick(1_003_600, ...)\` を 1 度発火し \`Some\` を返したと assert。なぜそれだけでは interval-gating 不変条件を verify するのに不十分？

（答え：**1 度の成功 tick は guard が \`Some\` を*返しうる*と言う。Guard が後で*再 engage* するとは言わない。** バグのある実装は最初の interval boundary で fire してから二度と gate しないかも — \`1_003_600\` 以降の全 \`tick()\` が時間に関わらず \`Some\` を返す。「interval ごとに最多 1 settlement」不変条件は、別の full interval が経過するまで second tick が拒否されることをテストする必要。**単一 operation テストが挙動を verify、複数 operation テストが state machine を verify。**）

## 手順

### Step 1: \`premium_drives_settlement_signs\` を追加

\`mod tests\` の L8 テストの後に：

\`\`\`rust
    #[test]
    fn premium_drives_settlement_signs() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        // mark 101, index 100 → premium = 0.01 = 10_000_000 ppb
        // rate = 10_000_000 / 8 = 1_250_000 ppb
        // long size 100 * mark 101 * rate / RATE_SCALE = 100*101*1.25e6 / 1e9
        // = 1.2625e10 / 1e9 = 12 (floor)
        // long pays → -12; short receives → +12.
        let out = clock
            .tick(1_003_600, MarkPrice(101), IndexPrice(100), &balanced_book())
            .expect("tick should fire");

        assert_eq!(out.premium, Premium(10_000_000));
        assert_eq!(out.rate, FundingRate(1_250_000));
        assert_eq!(out.settlements.len(), 2);
        assert_eq!(out.settlements[0].delta, Notional(-12));
        assert_eq!(out.settlements[1].delta, Notional(12));
    }
\`\`\`

これが clock の**完全な数学 composition テスト**。すべての Module 2 関数が順番に exercise される：

1. \`compute_premium(MarkPrice(101), IndexPrice(100))\` → \`Premium(10_000_000)\`（1% premium）。
2. \`compute_rate(Premium(10_000_000), hyperliquid_default)\` → \`FundingRate(1_250_000)\`（divisor 8 後 0.125%）。
3. \`apply_funding(&[Pos(1, 100), Pos(2, -100)], MarkPrice(101), FundingRate(1_250_000))\` → \`[Settlement(-12), Settlement(+12)]\`。

**5 行のブロックコメントが紙の数学。** このテストをデバッグする誰でも手で算術 verify できる：\`100 × 101 × 1_250_000 = 12_625_000_000\`。\`RATE_SCALE = 1_000_000_000\` で割る（整数 rounding zero 方向）と \`12\`。\`apply_funding\` の符号 flip で long が \`-12\`、short が \`+12\`。**コメントが documentation、テストが spec。**

**各ステップが個別にテスト済みなのにこのテストが存在する理由は？** Composition が独自の関心だから。\`tick()\` が間違った順で間違った関数を呼びうる — 例：\`compute_rate\` の前に \`apply_funding\`、\`mark\` を期待しているところに \`index\` を渡す。**Composition テストが unit テストの見逃す配線エラーを捕まえる。**

> 🛑 **やりがちな勘違い。** 「このテストは \`apply_funding\` のテストを duplicate する。Per-account アサーションを落として \`out.rate\` だけチェックすべき？」 **No。** このテストの要点は*composition*。\`apply_funding\` のテストが pass するが \`premium_drives_settlement_signs\` が fail するなら、バグは \`tick()\` が呼び出しを配線する方法 — \`apply_funding\` の中ではない。**各 layer に独自の composition テストが必要。** 3 layer 深いなら最低 3 composition テスト。

### Step 2: \`second_tick_requires_another_full_interval\` を追加

\`premium_drives_settlement_signs\` の後に：

\`\`\`rust
    #[test]
    fn second_tick_requires_another_full_interval() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        // First tick at +3600.
        clock
            .tick(1_003_600, MarkPrice(101), IndexPrice(100), &balanced_book())
            .expect("first tick fires");

        // +3599 from first tick → not enough.
        let early = clock.tick(1_007_199, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(early.is_none());

        // +3600 from first tick → fires.
        let on_time = clock.tick(1_007_200, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(on_time.is_some());
    }
\`\`\`

**3 tick call、3 アサーション。** 構造が story を語る：

1. **\`1_003_600\` の最初の tick** — fire（L8 の境界ケース）。この後 \`last_settled_at = 1_003_600\`。
2. **\`1_007_199\` の 2 つ目の tick** — \`1_007_199 - 1_003_600 = 3599\`。Interval の 1 秒不足。\`None\` を返す。
3. **\`1_007_200\` の 3 つ目の tick** — \`1_007_200 - 1_003_600 = 3600\`。ちょうど interval。\`Some\` を返す。

**テストする不変条件**：「Interval guard が成功 tick ごとに再 engage する」。\`genesis_time\` に対してだけチェックする（\`last_settled_at\` でなく）素朴な実装は \`1_003_600\` 以降の全 tick で fire する — このテストがそれを捕まえる。

**最小 counterexample**：L8 の \`first_tick_at_exact_interval_fires\` と L9 の \`second_tick_requires_another_full_interval\` の間で verify されている唯一のことは、\`last_settled_at\` が*gating reference* であり、\`genesis_time\` ではないこと。**3 call が state-machine 持続性をテストする最小。**

> 🛑 **考えてみよう。** 上の 3 tick それぞれの後の \`clock.last_settled_at()\` は？

（答え：
- Tick 1（成功）後：\`1_003_600\`。
- Tick 2（None — gated）後：変化なし、まだ \`1_003_600\`。
- Tick 3（成功）後：\`1_007_200\`。

**Clock が gated call で advance しない。** これが interval-gating 不変条件の 2 つ目の部分：失敗で state は変わらない。テストは tick 2 後の \`last_settled_at\` を明示的に assert しないが、tick 3 がちょうど \`1_003_600 + 3600\` で成功することが含意する。）

### Step 3: \`capped_rate_when_premium_extreme\` を追加

\`second_tick_requires_another_full_interval\` の後に：

\`\`\`rust
    #[test]
    fn capped_rate_when_premium_extreme() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        // mark 200, index 100 → premium = 1.0 = 1e9 ppb
        // raw rate = 1e9 / 8 = 1.25e8; cap = 4e7 → clamps to 4e7.
        let out = clock
            .tick(1_003_600, MarkPrice(200), IndexPrice(100), &balanced_book())
            .unwrap();
        assert_eq!(out.rate, FundingRate(40_000_000));
    }
\`\`\`

**\`compute_rate\` の cap が \`tick()\` 経由で呼ばれたとき正しく clamp することをテスト。** 数学：

1. \`compute_premium(MarkPrice(200), IndexPrice(100))\` → \`Premium(1_000_000_000)\`（100% premium）。
2. \`compute_rate(Premium(1_000_000_000), {divisor=8, cap=40M})\` → raw = \`1_000_000_000 / 8 = 125_000_000\`。\`±40_000_000\` に clamp → \`FundingRate(40_000_000)\`。

**\`compute_rate\` のテストが既に clamping をカバーするのに、なぜこのテストが存在する？** \`tick()\` が rate を適用前に unwrap・fiddle・bypass しないことを知る必要があるから。**Cap が clock を変化なく surface する。**

微妙な配線バグ — 例：\`compute_rate(premium, FundingParams { rate_cap: FundingRate(0), ..params })\` — はこのテストを破る（cap ゼロ → rate ゼロ → settlement なし）。**Composition テストが unit テストにできないことを捕まえる。**

### Step 4: テストを実行

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

期待：

\`\`\`
running 21 tests
test clock::tests::capped_rate_when_premium_extreme ... ok
test clock::tests::empty_positions_yield_empty_settlements_but_still_advance_clock ... ok
test clock::tests::first_tick_at_exact_interval_fires ... ok
test clock::tests::first_tick_before_interval_returns_none ... ok
test clock::tests::premium_drives_settlement_signs ... ok
test clock::tests::second_tick_requires_another_full_interval ... ok
... (L4-L7 compute.rs から 15 テスト)

test result: ok. 21 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**21 テスト全 green。** うち 6 つが今 \`clock::tests\` に住む（L8 から 3 + L9 から 3）。

よくあるエラー：

- **\`premium_drives_settlement_signs\` が \`Notional(-13)\` か \`Notional(-11)\` で fail** — rounding の off-by-one。数学を再確認：\`100 × 101 × 1_250_000 = 12_625_000_000\`。\`1_000_000_000\` で割ると \`12.625\`。整数除算がゼロに向けて truncate → \`12\`。符号 flip → \`-12\`。違う数字なら \`*\`（debug overflow で panic）、\`saturating_mul\`、\`wrapping_mul\` のどれを使っているか確認。
- **\`second_tick_requires_another_full_interval\` が second tick で fail** — guard が \`last_settled_at\` でなく \`genesis_time\` と比較している。L8 のコードを再読：guard は \`now < self.last_settled_at.saturating_add(...)\`、*\`now < self.params.genesis_time + ...\` ではない*。
- **\`capped_rate_when_premium_extreme\` が \`FundingRate(125_000_000)\` を返す** — \`compute_rate\` が clamp していない。L6 を再確認：\`raw.clamp(-cap, cap)\` 行があるはず。

## 設計の振り返り

このレッスンに焼き込まれた決定 4 つ：

1. **Composition テストが配線エラーを捕まえる。** 各ステップが unit-test されていても、ステップ間の配線は別の関心。**3 ステップ pipeline は最低 3 composition テスト（各ステップの正しい配置に 1 つ）+ multi-step composition テスト 1 つが必要。** \`premium_drives_settlement_signs\` が後者。

2. **State machine は multi-call テストが必要。** 単一 operation が偶然に不変条件を満たすことがある、複数 operation だけが state machine が一貫に強制するかを確認。**\`first_tick_at_exact_interval_fires\` だけでは不十分なので \`second_tick_requires_another_full_interval\` が存在。**

3. **各 gate で境界テスト。** Inclusive 境界（\`now == last_settled_at + interval\`）と exclusive 境界（\`now == last_settled_at + interval - 1\`）両方をテスト必要。**1 秒不足と 1 秒経過後が標準ペア。**

4. **各 layer の不変条件にそれぞれ surface テスト。** \`compute_rate\` テストが cap clamp を証明。\`tick\` テストが cap が composition で*生存*することを証明。**Composition が semantics を失いうる、不変条件が trav する各 layer で verify。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/clock.rs ./crates/funding/src/clock.rs
\`\`\`

L9 後：
- **clock.rs** が Stage 8b の 7 テスト中 6 つまで一致。\`no_catchup_after_long_gap\` のみ残る — それが L10 のマイルストーンテスト。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`second_tick_requires_another_full_interval\` がなぜ \`+3601\` もテストしない？**
\`+3600\` ちょうど*と* \`+3599\` 一緒で境界両側を pin するから。\`+3601\` は \`+3600\` より少し多いだけ — 同じ方向。**境界 2 ケース（直前と ちょうど）で十分。** 追加ケースは別のバグクラスを捕まえない。

**Q: 「genesis vs last_settled_at」バグを proptest で捕まえられた？**
できる — \`t2 < t1 + interval\` のランダム \`(t1, t2)\` ペアが second tick で \`None\` を生むべき。だが手書きトレーステストが意図を明確にする：「\`t1\` の tick の後、\`t1 + 3599\` の次の tick が gated」。Proptest は property に excel、手書きトレーステストは名前付き scenario に excel。**State-machine 挙動は通常 scenario。**

**Q: テストになぜ 3 つ目の tick を、例えば +7200（first から 2 interval）に含めない？**
情報を加えないから。\`+3600\` の 2 つ目の tick が既に clock が正しい cadence で fire することを確立、3 つ目は同じことの繰り返し。**テストは verify するもので distinguish すべき**、繰り返しを足すのでなく。

**Q: テスト author が \`genesis_time = 0\`（\`1_000_000\` でなく）にしていたら？**
数学は同一、だがテストは less helpful。\`1_000_000\`（と対応する \`1_003_600\` 等）を使うと「clock が 3600 秒 advance」パターンが全アサーションで見える。**テストデータは readable であるべき、正しいだけでなく。**

## 次のレッスン（L10）

L10 で Module 3 を **no-catch-up 不変条件**で閉じる：マイルストーンテスト \`no_catchup_after_long_gap\`。シナリオ：validator が 10 時間のダウンタイム後 reboot、\`now - last_settled_at = 36000\`（10 interval）。素朴な期待は「10 tick を replay して catch up」かも、だが設計選択は **1 度 settle して \`now\` に advance**。レッスンが catch-up がなぜ tick スキップより悪いかを説明、テストが設計選択が enforced されることを確認。**1 テスト、1 不変条件、設計哲学が action で。**`,
                },
                {
                  title: "レッスン 10 — No-catch-up 不変条件 — 1 テストで設計哲学",
                  slug: "openhl-funding-no-catchup-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン 10 — No-catch-up 不変条件 — 1 テストで設計哲学

## ゴール

このレッスンが終わると：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

…が 22 テストを通る（L4-L9 から 21 + 新規 1）。新テストは **\`no_catchup_after_long_gap\`** — validator が複数 interval を見逃したときどうなるかについての openhl の設計選択を pin するマイルストーンテスト。

L10 後：
- \`crates/funding/\` が **Stage 8b と byte-identical**（\`cd94137\`）。
- 22 テストすべて pass：20 手書きトレース + 2 proptest。
- Module 3（Clock state machine）が**完了**。
- Funding state machine が standalone crate として**production-shape**。

教育の焦点は**失敗モード下の設計哲学**：clock が遅れたとき、何が正しいセマンティクス？ 素朴な答え（tick を replay して catch up）は間違いで、L10 がその理由を説明する。

## おさらい

L9 後：
- 7 つの clock テスト中 6 つが pass。
- Interval-gating 副不変条件（境界、persistence）両方が verify 済み。
- 数学 composition が \`tick()\` 経由で正しく surface。

L9 が「normal operation」不変条件をカバー。L10 が「abnormal operation」不変条件をカバー — clock が*遅れた*ときの挙動。

## シナリオ

openhl チェーンが normal に動き、毎時 funding を settle してきたと想像。それから何かが起きる：

- Validator reboot（プロセス再起動 5 分）。
- ネットワーク分割（validator が再接続するまで 8 時間 chain 停止）。
- Leader のハードウェア障害、fallback validator が 30 分後に拾う。

原因が何であれ、次の \`tick()\` 呼び出しで \`now - last_settled_at\` が \`interval_secs\` を大きく超える。**Clock は何をすべき？**

2 つの設計選択：

### Choice A: Catch up

10 interval 分の funding を replay。各 replay は*現在*の mark/index/positions snapshot を使う。10 settlement を続けて適用。

**Pro**：各 interval が settlement を得る、chain が「遅れない」。

**Con**：
- **Stale-snapshot 問題**：全 10 settlement が*同じ*現在 snapshot を使う、各歴史的 interval boundary での snapshot ではない。Gap 中勝っていた trader が今 favorable な rate で計算された 10 settlement を支払う。Gap 中負けていた側が 10x で叩かれ、ポジションを閉じて逃げる機会を一度も持たない。
- **集中リスク**：1 度に 10x funding が、別々の毎時 10 支払いなら survive したアカウントを liquidate しうる。
- **Path dependency**：Funding history が gap が*いつ*起きたかに依存、累積時間だけでなく。

### Choice B: 1 度 settle、\`now\` に advance

現在 snapshot で*1 度* funding を適用、\`last_settled_at\` を \`now\` に advance。10 ミス interval は*スキップ*、replay せず。

**Pro**：
- **集中懲罰なし**：障害あたり最多 1 cap 設定 settlement。
- **Path-independent**：結果が現在 snapshot のみに依存、gap のタイミングに依らない。
- **外部 catch-up 可能**：Catch-up logic が欲しい呼び出し側は中間タイムスタンプでの fresh snapshot 付き繰り返し tick で自前実装できる。

**Con**：
- **失った revenue**：Funding が永久先物価格の equilibration メカニズム、interval スキップが basis への圧力を取り除く。

**openhl は Choice B を選ぶ。** Catch-up logic は、必要な人がいるなら clock の*外*に住む — 正しい歴史時刻での snapshot 付き繰り返し \`tick()\` 呼び出しで構築する。

> 🛑 **考えてみよう。** スクロール前に — Node reboot で 10 時間の funding を見逃した validator が、*現在*の snapshot から 10 tick を replay して埋め合わせようとする。**このアプローチで最も痛む trader はどれ？** ヒント：gap 中誰が負けていたかを考える。

（答え：**負けていた側が 10x で叩かれる。** 10 時間 gap 中、mark が index に比して高くドリフトしたとしよう — longs が「現実」世界で overpay していた。Choice A が*現在*の rate で 10 settlement を replay、すべて longs から charge。Basis の負け側に既にいた trader は、毎時 funding が適用されていたなら払っていたものの 10x を支払う。Worse、gap 中ポジションを閉じることができなかった（chain は停止していた）、catch-up が agency を持たない時間に対して retroactive に charge する形に見える。**Choice B が言う：見逃した 10 支払いをスキップして今から fresh で始める。Funding revenue に悪い、trader に公平。**）

## プラン

1 ファイル編集：

1. **\`crates/funding/src/clock.rs\` に \`no_catchup_after_long_gap\` を append** — 既存の \`#[cfg(test)] mod tests\` ブロック内、L9 テストの後。

プロダクションコードなし、\`lib.rs\` 変更なし。

## 手順

### Step 1: マイルストーンテストを追加

\`capped_rate_when_premium_extreme\` の後に：

\`\`\`rust
    #[test]
    fn no_catchup_after_long_gap() {
        // If 10 intervals elapse before the next tick, we settle ONCE and
        // advance to \`now\`. We don't replay 10 settlements with stale state.
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        let way_later = 1_000_000 + 10 * 3600;
        let out = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(out.is_some(), "elapsed >> interval → tick fires");
        assert_eq!(clock.last_settled_at(), way_later);

        // Immediately ticking again at the same moment does NOT settle.
        let again = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(again.is_none(), "no duplicate settlement at same now");
    }
\`\`\`

**2 つの部分。** 各々が no-catch-up 不変条件の別の副 property を pin。

#### Part 1: 長 gap 後に 1 度 settle

\`\`\`rust
        let way_later = 1_000_000 + 10 * 3600;
        let out = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(out.is_some(), "elapsed >> interval → tick fires");
        assert_eq!(clock.last_settled_at(), way_later);
\`\`\`

セットアップ：genesis を \`1_000_000\`、それから \`1_036_000\`（= \`1_000_000 + 10 × 3600\`）で tick。10 full interval が経過。

**2 アサーション：**

1. **\`out.is_some()\`** — tick が*fire する*。遅れているからとスキップしない。**Choice B は「すべてをスキップ」ではない — 「1 度 settle」。**

2. **\`clock.last_settled_at() == way_later\`** — そして*決定的に*、clock は \`now\` に advance、\`1_000_000 + 3600\`（genesis から 1 interval 後）でも \`1_000_000 + 10*3600\`（genesis から 10 interval 後 — 数字は同じだが違う理由）でもない。**Clock が見逃した interval を完全に忘れる。**

> 🛑 **やりがちな勘違い。** 「テストは \`out.settlements\` のエントリが 1 つだけかもチェックすべきでは？」 **Settlement 数は positions に依存、gap には依存しない。** \`balanced_book()\`（long 100、short -100）で gap 長に関わらず 2 settlement を得る。テストの仕事は *1 tick* が fire することを verify、その tick がいくつの settlement を生むかではない。**Tick 数をテスト、settlement 数は別の関心。**

#### Part 2: 同じ \`now\` で re-fire しない

\`\`\`rust
        let again = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(again.is_none(), "no duplicate settlement at same now");
\`\`\`

長 gap tick の後、即座に*同じ* \`now\` で \`tick\` をもう一度呼ぶ。**\`None\` を返す必要。** 遅れた tick の後でも interval-gating 不変条件がまだ成り立つことを証明する — tick を 2 回続けて呼んで double settlement を得ることはできない。

**なぜこのアサーションが重要？** バグのある実装が以下をしうるから：
- 「経過時間 >> interval」を検出して「追いつくまで continuously fire する」と決める（catch-up のバグバージョン）。
- 長 gap tick で \`last_settled_at\` の更新を忘れる、同じ \`now\` での subsequent tick が fire し続ける。

**同じ \`now\` が可能な最も厳しいテスト。** 2 tick の間に時間は経過しない、clock の内部 state だけが変化。\`last_settled_at == way_later\`（Part 1 から）なら、guard \`now < last_settled_at + interval\` は \`way_later < way_later + 3600\` になり、\`0 < 3600\`、true — \`tick\` が正しく \`None\` を返す。

### Step 2: テストを実行

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

期待：

\`\`\`
running 22 tests
test clock::tests::capped_rate_when_premium_extreme ... ok
test clock::tests::empty_positions_yield_empty_settlements_but_still_advance_clock ... ok
test clock::tests::first_tick_at_exact_interval_fires ... ok
test clock::tests::first_tick_before_interval_returns_none ... ok
test clock::tests::no_catchup_after_long_gap ... ok
test clock::tests::premium_drives_settlement_signs ... ok
test clock::tests::second_tick_requires_another_full_interval ... ok
... (L4-L7 から 15 テスト)

test result: ok. 22 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**22 テスト全 green。** Module 3 が閉じる。\`crates/funding/\` が Stage 8b と byte-identical。

よくあるエラー：

- **Part 1 が fail：\`out.is_none()\`** — guard の比較方向が間違い。再確認：\`if now < last_settled_at + interval { return None; }\`。\`now = 1_036_000\`、\`last_settled_at = 1_000_000\` で、\`now < 1_003_600\` は false、guard が return しない、tick が fire。
- **Part 1 が fail：\`last_settled_at() != way_later\`** — clock を \`now\` 以外に advance させた。\`tick()\` 末尾近くの \`self.last_settled_at = now;\` 行を再確認。よくある typo：\`self.last_settled_at = self.last_settled_at + self.params.interval_secs;\`（catch-up 版）または \`self.last_settled_at += self.params.interval_secs;\`（同様に間違い）。
- **Part 2 が fail：\`again.is_some()\`** — \`last_settled_at\` が Part 1 の tick で更新されていない。同じ \`now\` の Part 2 tick が \`genesis + interval\` の gate（まだ満たされている）を見つけて誤って fire する。Part 1 の assignment を再確認。

## 設計の振り返り

このレッスンに焼き込まれた決定 4 つ：

1. **長 gap で 1 度 settle、\`now\` に advance。** 代替（interval を replay して catch up）が負け側に集中懲罰を、ポジションを閉じる機会なしに生む。Funding の目的は*equilibration*、retroactive enforcement ではない。**Choice B が数学を公平性と整合、いくらかの funding revenue を犠牲に。**

2. **同じ \`now\` での second-tick テストが可能な最も厳しい。** 時間が経過しない、state だけが変化。遅れた tick で \`last_settled_at\` 更新失敗の全実装を捕まえる。**State machine では「同じ input、繰り返し呼び出し」が state-update バグを露わにする。**

3. **Catch-up logic が clock の外に住む。** Catch-up が欲しい呼び出し側は中間歴史タイムスタンプでの snapshot 付き \`tick()\` を繰り返し呼べる。**Clock が primitive、policy は呼び出し側のもの。**

4. **設計哲学は documentation + テストに住む。** Clock の module doc が不変条件を名指す、このテストがそれを強制、テストコメント + このレッスンが*なぜ*を説明する。**理由付けを 3 箇所で見つけられる：doc、コード、テスト。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
\`\`\`

L10 後、\`crates/funding/\` が **Stage 8b と byte-identical**。Diff が空。

**Module 3 閉じる。** Module 4（capstone）が L11。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: Catch-up セマンティクスが欲しい。Configurable にできる？**
Clock 内部からはできない。Wrapper を書く必要がある、歴史中間タイムスタンプでの snapshot 付き \`tick()\` を繰り返し呼ぶ：

\`\`\`rust
// 外部 catch-up wrapper の擬似コード：
while clock.last_settled_at() + interval < now {
    let next_target = clock.last_settled_at() + interval;
    let historical_snapshot = fetch_snapshot_at(next_target);  // !!! complex !!!
    clock.tick(next_target, historical_snapshot.mark, ...);
}
clock.tick(now, current_snapshot.mark, ...);
\`\`\`

難しい部分は \`fetch_snapshot_at(historical_timestamp)\` — 呼び出し側が過去時点での mark/index/positions の姿を知る必要。**だから catch-up が clock にない：clock が持たない歴史 state を要求する。** Application layer（chain database を持つ）がそれをできる。

**Q: \`way_later\` が overflow する前に gap はどれだけ長くなりうる？**
\`u64::MAX\` 秒はおよそ \`5.8 × 10^11\` 年 — heat death の遥か後。Guard の \`saturating_add\` が \`u64::MAX\` 近くの \`last_settled_at\` を扱うが、実用上その regime に届かない。**Pathological ケースは guard の責任、現実ケースは設計のもの。**

**Q: \`way_later\` で \`mark\` と \`index\` が合理的な値だが、gap の原因が mark/index oracle が利用不可だったら？**
Clock は oracle staleness を知らない。Stale mark で \`tick()\` を呼べば stale data に基づく funding を得る。**Oracle freshness は呼び出し側の責任。** Production deployment は \`tick()\` 呼び出し前に oracle-staleness チェックを追加 — oracle が古すぎたら call をスキップ。Skip が clock の上で起きる、clock は入力を信頼するだけ。

**Q: 長 gap tick が起きたとき warning log を追加すべき？**
Logging は side effect。Clock は pure（I/O なし）。Wrapper が気にすれば gap を log できる：\`if elapsed > 2*interval { log!("late tick: {} hours behind", elapsed/3600); }\`。**Primitive を pure に保つ、wrapper に観測させる。**

## Module 3 マイルストーン — 築いたもの

L10 後：
- **Module 3 完了。** Clock state machine + 7 テスト、interval-gating、no-catch-up、数学 composition、cap surfacing をカバー。
- **Crate 全体が Stage 8b と byte-identical。** types.rs / compute.rs / clock.rs にわたって ~635 LOC。
- **22 テスト**合計：20 手書きトレース + 2 proptest。
- **Rustdoc warning ゼロ。**

Funding state machine が今**完全、テスト済み、production-shape** crate。Funding を deterministic に計算、正しい cadence で gate、gap 後の path-dependent settlement の導入を拒否する。

残るもの：
- **Module 4（Capstone、L11）** — 統合、先送り項目、bridge-integration プレビュー。コードなし。
- **将来コース** — この crate を bridge に配線（oracle 統合、balance 更新、liquidation トリガー）。

## 次のレッスン（L11）

L11 は capstone — 新コードなし。Architecture を sketch、このコースから先送りした項目を名指し（oracle 統合、balance 更新、liquidation、マルチマーケット funding、EVM event としての funding）、それぞれが出荷時にどこに住むかを trace する。Funding state machine をより大きな openhl architecture の一部として見るメンタルモデルを cementing するレッスン。`,
                },
              ],
            },
          },
          {
            title: "Capstone",
            sortOrder: 4,
            lessons: {
              create: [
                {
                  title: "レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの",
                  slug: "openhl-funding-capstone-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 40,
                  content: `# レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの

## ゴール

このレッスンが終わると：

- Funding pipeline を記憶からホワイトボードに描ける：\`(mark, index)\` → premium → rate → settlements、clock で gate される。
- 5 つの先送り項目を名指し（oracle 統合、balance 更新、liquidation、multi-market funding、funding-as-EVM-event）、それぞれが \`crates/funding/\` の範囲外の理由を説明できる。
- 4 つの拡張が将来コースのどこに来るかを描ける。
- この state machine を永久先物 DEX に配線する準備ができる。

**このレッスンにコードなし。** メンタルモデルだけ。

## Pipeline、1 枚の図で

\`\`\`
   ┌────────────┐   ┌─────────────┐
   │ MarkPrice  │   │ IndexPrice  │     (oracle、オフチェーン)
   └─────┬──────┘   └──────┬──────┘
         │                 │
         ▼                 ▼
       ┌─────────────────────┐
       │   compute_premium    │  →  Premium(i64、ppb)
       └──────────┬───────────┘
                  │
                  ▼
       ┌─────────────────────┐
       │    compute_rate      │  ← FundingParams (divisor、cap)
       └──────────┬───────────┘
                  │
                  ▼  FundingRate(i64、ppb、clamped)
                  │
            ┌─────┴─────┐
            │           │
            ▼           ▼
       ┌──────────────────────┐
       │   apply_funding      │  ← Vec<Position>、MarkPrice
       └──────────┬───────────┘
                  │
                  ▼
              Vec<Settlement>  →  bridge → balance 更新 (将来)


   ╔═══════════════════════════════════════════════════════╗
   ║                  FundingClock::tick                    ║
   ║                                                        ║
   ║  guard: now ≥ last_settled_at + interval_secs?         ║
   ║    no  → return None                                   ║
   ║    yes → 上の pipeline 実行、\`now\` に advance           ║
   ╚═══════════════════════════════════════════════════════╝
\`\`\`

上から下：価格 in、settlement out。Clock が pipeline 全体を「十分時間経過したか？」gate でラップ。

## 各モジュールが届けたもの

**Module 1 (Determinism + 型、L1-L3)** — 固定小数点語彙：

- \`RATE_SCALE = 1_000_000_000\`（ppb）：load-bearing 定数。
- 9 newtype：\`MarkPrice\`、\`IndexPrice\`、\`Premium\`、\`FundingRate\`、\`Notional\`、\`PositionSize\`、\`Position\`、\`Settlement\`、\`FundingParams\`。
- \`hyperliquid_default()\`：3600s interval、±4% cap、divisor 8。
- **学び**：Newtype が引数順バグをコンパイル時に防ぐ、符号規約が定義場所の doc コメントに住む。

**Module 2 (純粋な compute、L4-L7)** — Stateless 数学：

- \`compute_premium(mark, index) → Premium\` — \`index == 0\` で graceful、i128 中間値、saturate。
- \`compute_rate(premium, params) → FundingRate\` — divide-then-clamp、cap に defensive \`.abs()\`。
- \`apply_funding(positions, mark, rate) → Vec<Settlement>\` — 単項マイナスで longs-pay-shorts、flat position フィルタ。
- \`saturate_i128_to_i64\`：3 行 private helper、型境界での唯一の safety net。
- **15 テスト**：13 手書きトレース + 2 proptest（antisymmetry、balanced-book zero-sum）。
- **学び**：panic-vs-wrap-vs-saturate の 3 方向設計テンション、saturation が唯一の consensus-safe 選択。

**Module 3 (Clock state machine、L8-L10)** — Discrete event loop：

- \`FundingClock\` + \`FundingTick\` + \`tick()\`。
- 7 テストでカバー：guard semantics、境界ケース、interval 持続、no-catch-up。
- **学び**：Composition テストが配線エラーを捕まえる、state machine が multi-call テストを必要とする、設計哲学が doc コメント + テスト + レッスン散文に住む、決して 1 箇所だけにではない。

## 正直に先送り

\`crates/funding/\` がやらない 5 つ。それぞれ実際のプロダクションギャップ、この crate を pure state machine に保つため*意図的に先送り*。

### 1. Oracle 統合

**現状**：\`compute_premium\` が \`mark: MarkPrice, index: IndexPrice\` を入力として取る。

**ないもの**：それらの価格を*取得する*方法。呼び出し側が CLOB から mark を取得（\`clob.best_bid_with_qty()\` mid-price のような何か経由）、外部 oracle から index を取得（Pyth、Chainlink、validator-attested feed）。

**先送りの理由**：Oracle plumbing は独自の discipline — staleness チェック、deviation circuit breaker、multi-source aggregation、validator-set サインオフ。Funding crate にバンドルすると 2 つの無関係な関心を結合。**Bridge layer（将来コース）が oracle を \`tick()\` に配線。**

**いつ見直す**：Funding crate を \`LiveRethEvmBridge\` に配線するとき。Bridge の payload-building コードが \`clock.tick(...)\` 呼び出しの*直前に*最新の mark/index を read する。

### 2. Balance 更新

**現状**：\`tick()\` が \`Vec<Settlement>\` を返す — \`(account, delta)\` ペアのリスト。

**ないもの**：それらの delta をアカウント balance に*適用する*メカニズム。

**先送りの理由**：Balance state は EVM storage（または bridge が維持する別の store）に住む。Funding crate は意図的に storage-free — 計算する、永続化しない。**Bridge が \`Vec<Settlement>\` を取り、balance-update transaction を emit するか直接 state mutation する。**

**いつ見直す**：Oracle 統合と同じ。Bridge layer が settlement が balance に出会う場所。

### 3. Liquidation

**現状**：アカウントの balance を任意に負に押せる settlement。

**ないもの**：アカウントが funding 支払いを吸収する*能力*があるかのチェック、もしくはそうでないときの処理ロジック。

**先送りの理由**：Liquidation は独自の不変条件（insurance fund、ADL waterfall、mark-price trigger）を持つ別の state machine。Funding と結ぶと 2 つの cadence を conflate（funding は hourly、liquidation は per-block）。**Liquidation は独自の crate であるべき。**

**いつ見直す**：Balance 更新の後。Bridge が balance が負になるのを見る、*それから* liquidation engine が kick in。

### 4. Multi-market funding

**現状**：単一マーケットに対する単一 \`FundingClock\`。

**ないもの**：複数の永久先物マーケット（BTC-USD、ETH-USD、SOL-USD 等、潜在的に異なる interval や cap）にわたる funding を管理する方法。

**先送りの理由**：Multi-market 設計は素直 — マーケットあたり 1 つの \`FundingClock\`、すべて bridge layer の \`HashMap<MarketId, FundingClock>\` で管理。Crate がマーケット多重性を知る必要なし、ただ*1 つ*に対して正しい必要。

**いつ見直す**：openhl が 2 つ目のマーケットを追加するとき。**おそらくこの crate の一部としては決して** — 多重化は上の責任。

### 5. EVM event としての funding

**現状**：\`tick()\` から返される \`Vec<Settlement>\` としての settlement。

**ないもの**：スマートコントラクトが funding tick を*観測*する方法。Funding に反応したいコントラクト（例：「funding が X% を超えたら auto-deleverage」）が event として subscribe できない。

**先送りの理由**：非 EVM コードから EVM event を emit するには plumbing が必要 — bridge が各 \`Settlement\` を \`EvmLog\` に変換して次のブロックに inject する必要。**Bridge-layer 関心、state-machine 関心ではない。**

**いつ見直す**：Event ベースの funding 観測を要求する具体的なコントラクトユースケースがあるとき。**それまで、telemetry は bridge layer でできる。**

## 次に来るもの

このコース後に出荷できる 4 つの拡張：

### Extension 1: Oracle adapter（2-3 日）

1 つ以上の source（Pyth、Chainlink、validator-signed）から index 価格を pull、staleness チェック付きで aggregate、\`fn current_index_price() -> Option<IndexPrice>\` を露出する小さな \`crates/oracle/\`。Bridge が \`clock.tick(...)\` の直前にこれを呼ぶ。**難しい部分は staleness threshold の選択、コードは素直。**

### Extension 2: Bridge 側 funding tick（1 週間）

\`FundingClock\` を \`LiveRethEvmBridge\` に配線。Bridge が clock インスタンスを所有、mark を CLOB から read、index を oracle から read、永久先物 position store から position を取得、\`tick()\` を呼ぶ、結果の settlement を balance に適用。**ほとんどが plumbing 作業、funding crate は self-contained。**

### Extension 3: Liquidation engine（3-4 週間）

Funding-tick 後の balance を監視、under-margined アカウントを識別、insurance fund / ADL waterfall を通して route する別の \`crates/liquidation/\`。**大きな設計議論：insurance fund サイジング、partial liquidation、MEV protection。** これは独自のコース。

### Extension 4: Multi-market manager（1 週間）

\`HashMap<MarketId, FundingClock>\` + per-market position store を維持する \`crates/markets/\`。Bridge が正しい cadence でマーケットあたり funding tick を dispatch。**概念的に simple、価値はマーケットごとの isolation。**

## コース完了 — 内在化したこと

永久先物 funding を超えて一般化する 5 つのスキル：

1. **Consensus システムの固定小数点演算。** Validator 間で数値 state を共有する必要がある任意の時 — funding、fee、oracle 価格、vesting schedule — 符号付き整数 + scale 定数を使う。**\`RATE_SCALE = 1e9\` がパターン、定数値が variable。**

2. **Consensus-safe overflow 戦略としての saturation。** Panic = halt 経由のチェーン fork。Wrap = wrong value 経由のチェーン fork。Saturate = bounded、validator 間で consistent。**任意の consensus-critical 数学に対して saturate が唯一の選択。**

3. **意味的区別のための Newtype パターン。** \`MarkPrice\` と \`IndexPrice\` は両方 \`u64\` をラップするが、異なる概念。Newtype が引数順バグをコンパイル時に防ぐ、doc コメントが符号規約を運ぶ。**Newtype あたり 5 行、バグクラス全体を防ぐ。**

4. **層化コードのための Composition テスト。** 各 layer（\`compute_premium\`、\`compute_rate\`、\`apply_funding\`）が個別にテストされるが、層化自体が別の関心。**\`tick()\` テストが composition を verify、unit テストが piece を verify。両方が必要。**

5. **設計哲学がコード + doc + テスト + 散文に住む。** No-catch-up 不変条件が \`clock.rs\` の module doc で名指され、\`tick()\` の実装で強制され、\`no_catchup_after_long_gap\` で verify され、このコースで説明された。**理由付けを 4 箇所で見つけられる、理由付けが個別ピースが変わっても survive する。**

## このコースが L1 Architect track のどこに位置するか

**Course 1-5**（Reth internals）：pipeline、payload building、NodeBuilder、evm crate、RPC。

**Course 6**（openhl-consensus）：Malachite 統合。

**Course 7**（openhl-clob）：マッチングエンジン。

**Course 8**（openhl-precompiles）：カスタム precompile 経由の EVM ↔ CLOB ブリッジ。

**Course 9（このコース）**：Funding state machine。**Pure state、I/O なし — course 8 の bridge plumbing への対比。**

**Course 10**（openhl-bridge-integration — 将来）：funding + oracle + liquidation を \`LiveRethEvmBridge\` に配線。これが courses 6-9 のすべてが runnable perp DEX に compose する場所。

L1 Architect track の 90% を踏破した。**このコースのパターン（固定小数点、saturation、composition テスト）が残り作業全体に applied。**

## 最終答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
\`\`\`

L11 後、**\`crates/funding/\` ディレクトリ全体が Stage 8b と byte-identical** に一致するはず。1 commit（3 ファイルにわたって ~635 LOC）を手で再現した — 各行がなぜそこにあるかを完全に理解した上で。**Crate が standalone でコンパイル、テストが standalone で pass、\`openhl-clob\`（\`AccountId\` 用）以外の外部依存なし。**

戻す：

\`\`\`bash
git checkout main
\`\`\`

## あなたがこれを出荷した

22 テスト pass。3 ソースファイル。プロダクション Rust ~635 LOC。Funding state machine が：
- 符号付き固定小数点精度で deterministic な premium/rate/settlement 数学を計算する；
- Pathological 入力で panic でなく saturate する；
- Configurable interval で settlement を gate する；
- 長 gap 後の catch-up を拒否する（数学を公平性と整合させる哲学的選択）。

**それが HL シェイプ永久先物 funding メカニズム全体、任意の Rust トレーディングシステムに drop in できる crate で。** 次に誰かに「永久先物 funding はどう動く？」と聞かれたら — この crate を見せて。

永久先物を作りに行こう。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
