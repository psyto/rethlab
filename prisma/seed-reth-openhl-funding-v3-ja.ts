import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlFundingV3JA(prisma: PrismaClient) {
  const tags = ["reth","evm","funding","perpetual","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-funding-v3-ja",
      title: "Step 4. Funding：決定論的数学パイプラインと Funding ステートマシンの構築",
      description:
        "Perpetual DEX の命脈である funding メカニズムのステートマシンをスクラッチで実装する。固定小数点演算による、再現可能で deterministic な数学パイプライン (premium → rate → settlement) を構築。これを no-catch-up セマンティクスを厳格に強制する interval clock によって制御する。本コースでは外部 I/O を一切排除した Pure state machine として完結させ、ブリッジへの統合は次章へと繋ぐ。「DIY Perp シリーズ」の第4ステップ。数理ロジックをコードに落とし込む真髄を学ぶ。",
      difficulty: "EXPERT",
      duration: 355,
      xpReward: 730,
      track: "diy-perp",
      tags,
      isPublished: true,
      sortOrder: 1014,
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
                  title: "レッスン0 — OpenHL Funding を作る（永久先物 funding state machine）",
                  slug: "openhl-funding-orientation-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# レッスン0 — OpenHL Funding を作る（永久先物 funding state machine）

## 問い

前コース（Precompiles）は、コントラクトが同じ Reth node 上の CLOB を read/write できる地点で終わった。だが perp はまだ perp になっていない — mark price を index（spot）に anchor する仕組みがない。**永久先物には期限がないのに、価格はどうやって spot に引き寄せられるのか？**

## 原理（最小モデル）

- **funding 支払いが mark を index に anchor する。** Mark > index（longs が spot 比で overpay）なら longs→shorts、Mark < index なら shorts→longs を、固定 interval（HL は 1 時間）ごとに支払う。これが期限なしでも価格を spot に縛る力。
- **パイプラインは 4 段: premium → rate → capped → settlement。** \`(mark-index)/index\`（生の比率）→ \`/divisor\`（HL=8）→ \`clamp(±4%/interval)\`（ネットワーク上限）→ \`size × mark × capped\`（各 tick の決済額）。
- **float は一切使わない — consensus が壊れる。** 全 validator が *完全に同じ* rate を計算しなければ、1 LSB のズレでチェーンが fork する。固定小数点整数 \`RATE_SCALE = 1_000_000_000\`（parts-per-billion）で、9 桁精度を決定的に得る。
- **純粋な state machine + 飽和演算。** I/O ゼロ・外部依存ゼロ。overflow は panic でなく saturate（最大/最小に張り付く）— consensus 中核の数学に正しい形。

## 具体例

\`\`\`
1. Premium    = (mark - index) / index               ← 生の比率（無次元）
2. Rate       = Premium / divisor                     ← divisor = 8 (HL)
3. Capped     = clamp(Rate, -4%/interval, +4%/interval) ← 絶対上限
4. Settlement = size × mark × Capped                  ← 各 tick の決済 quote 額
\`\`\`

すべて \`RATE_SCALE\` でスケールした符号付き整数の上で計算する（\`0.04\`=\`40_000_000\`、\`0.001\`=\`1_000_000\`）。乗算は overflow 回避に \`i128\` 中間値、除算はその後。Premium の符号が「longs が払うか shorts が受け取るか」を決める。

## 失敗例（誤解）

「funding rate は \`f64\` で計算して最後に整数化すればいい」は誤り — float は **compiler / CPU / 演算順** で異なるビットパターンを生む（LLVM の FMA 分解、丸めモード差、\`(a*b)+c\` の最適化差）。1 LSB のズレのコストは **チェーン fork** だ：fork の別側の validator が異なる delta を決済し、balance が乖離し、次ブロックがどちらのチェーンに対しても検証されない。consensus システムでは float を一切使わず、すべて \`RATE_SCALE\` でスケールした符号付き整数で計算する。Solana の compute budget も Ethereum の EVM も同じ制約 — **Determinism がすべてを決める。**

---

ここまでで「funding が mark を anchor する」「float は consensus を壊す」は着地した。ここから先はスコープ・前提・12 レッスンのロードマップに入る。L1 以降は実際に Rust を書く。

> 🛑 **予測。** 2 つの validator が同じ funding rate を計算する。片方が \`f64\` の \`(mark-index)/index\` を、もう片方が別 CPU で同じ式を計算したら、結果は **bit 単位で一致するか？**（答え: 保証されない。丸めモード・FMA 分解・演算順で最下位ビットが食い違いうる。funding rate の 1 LSB 不一致 = チェーン fork。だから固定小数点整数で計算する — 整数演算は全プラットフォームで bit-exact。）

## 終了時に手にするもの

新規 \`crates/funding/\` crate、3 ソースファイル / 約 635 行:
- **固定小数点 types モジュール** — \`RATE_SCALE\` 定数、\`MarkPrice\`/\`IndexPrice\`/\`Premium\`/\`Notional\` の金額 newtype、\`Position\`/\`Settlement\`/\`FundingParams\`。
- **純粋な compute モジュール** — \`compute_premium\` / \`saturate_i128_to_i64\` / \`compute_rate\` / \`apply_funding\`。
- **clock state machine** — \`FundingClock\` + \`tick()\`、interval gating を担う。
- **22 テスト**：手書き 20 + proptest 2（premium 反対称性、balanced-book zero-sum）。clock 不変条件 2 つ（interval ごと settlement は最多 1 回、長時間ギャップ後の catch-up なし）を強制。

## 終了時にも手にしないもの（意図的な scope cut）

- **Oracle**（index price の供給元） — funding は index を *入力* として受け取るだけ。
- **Liquidation**（= Step 5）。
- **Basis-vs-fixed funding** — HL スタイルの fixed-interval funding のみ。
- **Bridge 統合** — funding state machine は純粋な数学として完結。\`LiveRethEvmBridge\` への plug-in は capstone でプレビューし、実装は下流。

## 前提

- **Step 1（Consensus）/ Step 2（CLOB）** をコンセプト背景として（funding は \`AccountId\` を受け取り、bridge に接続される）。**Step 3（Precompiles）はスキップ可** — funding は純粋な state-machine 数学で、EVM 接続作業ではない。
- **Rust の \`i128\` 演算に慣れていること**（overflow 回避の \`as i128\` upcast を 1 回以上経験していれば十分）。
- 永久先物 funding メカニクスに最低限の馴染み（上の 1 段落で足りる）。
- **EVM 知識は不要**（precompile / コントラクト / RPC に触れない）。

不要: 動作中の openhl ノード（I/O ゼロ）/ 他 L1 チェーン経験 / 定量金融バックグラウンド。

## セットアップ確認（今やる）

\`\`\`bash
cd ~/code/my-openhl
git checkout main
cargo build --workspace  # baseline — L1 前に通るべき

cd ~/code/openhl-reference  # answer-key 用の別チェックアウト
git checkout cd94137
\`\`\`

## 12 レッスンのロードマップ

| # | build するもの | 終了時テスト |
| - | - | - |
| 0 | Orientation（本レッスン） | セットアップ確認 |
| 1 | \`RATE_SCALE = 1e9\` — 固定小数点方式 | \`cargo check -p openhl-funding\` |
| 2 | 金額 newtype（\`MarkPrice\`/\`IndexPrice\`/\`Premium\`/\`Notional\`） | 型がコンパイル |
| 3 | \`Position\`/\`Settlement\`/\`FundingParams\` + HL デフォルト | roster 完成 |
| 4 | \`compute_premium\` + 符号対称性テスト | premium テスト pass |
| 5 | \`saturate_i128_to_i64\` + overflow 哲学 + 最初の proptest | proptest pass |
| 6 | \`compute_rate\` — divisor + cap + clamp | rate テスト pass |
| 7 | \`apply_funding\` — 符号規約 + zero-sum proptest | zero-sum proptest pass |
| 8 | \`FundingClock\` + \`tick()\` discrete event loop | clock がコンパイル |
| 9 | Interval-gating 不変条件 — 境界テスト 3 つ | gating テスト pass |
| 10 | No-catch-up 不変条件 — 1 テストで設計哲学 | **22 tests pass** |
| 11 | Capstone | （recap） |

**マイルストーンは レッスン10** — 22 tests が全部通り、deterministic な funding パイプライン（premium→rate→settlement）が no-catch-up clock で駆動する。レッスン11 で「まだ何が足りないか（oracle / liquidation / bridge 接続）」を名指す。

## 答え合わせの規律

12 レッスンすべてが **Funding 参照実装コミット \`cd94137\`** を引用する（funding 実装が 1 コミットにまとまっているため）。レッスン11 終了時点の answer-key diff は \`crates/funding/\` 配下で \`cd94137\` に一致する。

\`\`\`bash
cd ~/code/openhl-reference && git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/<file>.rs ./crates/funding/src/<file>.rs
\`\`\`

## 合格基準

- \`cargo test -p openhl-funding --release\` を 22 tests 通せる（コース完走時）。
- なぜ funding に float を使えないか（非決定性 → fork）を 1 文で言える。
- premium → rate → capped → settlement の 4 段を、固定小数点でなぞれる。

## まとめ（3行）

- funding 支払いが mark price を index に anchor する — Mark>index なら longs→shorts、Mark<index なら shorts→longs を固定 interval ごとに。
- パイプラインは premium → rate → capped → settlement の 4 段。すべて \`RATE_SCALE = 1e9\` でスケールした符号付き整数で計算 — float は 1 LSB のズレで fork を招くから使わない。
- 純粋な state machine（I/O ゼロ）+ 飽和演算。clock 不変条件 2 つ（interval ごと最多 1 回、catch-up なし）を強制する。`,
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
                  title: "レッスン1 — RATE_SCALE — consensus を守る定数",
                  slug: "openhl-funding-rate-scale-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン1 — \`RATE_SCALE\` — consensus を守る定数

## 問い

funding の全計算（premium / rate / settlement）を float なしで、全 validator が bit-exact に一致させたい。何を基準単位に選び、それを i64 のどこに置けば精度とヘッドルームを両立できるか？

## 原理（最小モデル）

- **float は consensus で動かない。** FMA・丸めモード・denormal の扱いはコンパイラ/CPU ごとに違うビットを生み、rate の 1 LSB ズレが chain fork に直結する。
- **\`RATE_SCALE = 1e9\`（parts-per-billion）が i64 のスイートスポット。** 9 桁精度 + 積の中間値でも i64 まで 11 桁ヘッドルーム。\`1e6\` は精度不足（10 ppb が 0 に丸まる）、\`1e12\` はヘッドルーム不足（積に i256 が要る）。
- **\`i64\`、\`u64\` でない。** rate/premium は符号付き（longs 支払い=正、shorts 支払い=負）。符号付きなら compute の符号チェックが不要、\`i128\` 中間値が積を吸収する。
- **\`RATE_SCALE\` は consensus 定数であって調整パラメータでない。** デプロイ後は immutable（全 balance / 全 settlement / 全 fixture がこれ前提に calibrate）。crate 開始時に一度 \`const\` で設定する。

## 具体例

ヘッドルームを桁の物差しに並べる:

\`\`\`
桁                                     値                                     何が住んでいるか
─────────────────────────────────────────────────────────────────────────────
1e18  ────────  9_223_372_036_854_775_807  ───────  i64::MAX (約 920 京)
1e18                                                ↑ 中間値の天井
1e15  ────────  1_600_000_000_000_000     ───────  4% × 4% (キャップ²) = 1.6e15
1e9   ────────  1_000_000_000             ───────  RATE_SCALE = 100% (10 億)
1e7   ────────       40_000_000           ───────  HL Funding Cap 4% (4 千万)
1e6   ────────        1_000_000           ───────  0.1%
1e1   ────────               10           ───────  0.0001% = 10 ppb (現実的な最小粒度)
\`\`\`

キャップ \`4e7\` と \`RATE_SCALE 1e9\` の間に 1 桁以上、キャップ²でも \`1.6e15\` で i64 天井 \`9.2e18\` まで 3 桁 — 「rate × notional」程度の積は \`i128\` で吸収し、最後に \`RATE_SCALE\` で割って i64 に戻せる。最小粒度 \`10\` ppb（0.0001%）も表現できる（\`1e6\` だと 0 に丸まる）。

## 失敗例（誤解）

「\`f64\` で計算して validator 間共有の前に N 桁に丸めればいい」は誤り、2 つの理由: (1) 中間計算が最終丸めより先に発散し、その時点で被害が出ている (2)「N 桁に丸める」自体が float 演算で処理系ごとに挙動が違う。float 非決定性からの脱出口は整数より単純なものはない。

---

ここまでで「なぜ 1e9 の整数か」は着地した。ここから crate を「public な値を 1 つ持つ実 crate」に変える（編集 3 つ、テストなし — \`RATE_SCALE\` は値であって挙動でない。最初のテストはレッスン2）。コードは完全形。

> 🛑 **予測。** \`RATE_SCALE\` を \`1e6\`（ppm）や \`1e12\`（ppt）でなく \`1e9\` にする理由は？（答え: i64 max ~9.2e18。\`1e9\` なら 9 桁精度 + キャップ \`4e7\` から天井まで 11 桁ヘッドルーム。\`1e12\` は精度↑だが積に i256 が要る。\`1e6\` は 10 ppb が 0 に丸まり精度不足。\`1e9\` が i64 固定小数点 rate のスイートスポット。）

## ステップで組み立てる

### Step 1: Cargo.toml を更新

\`crates/funding/Cargo.toml\` の \`[dependencies]\` 以下をこうする:

\`\`\`toml
[dependencies]
openhl-clob = { path = "../clob" }

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
\`\`\`

\`openhl-clob\`（\`AccountId\` がレッスン3 の \`Position\` で要る — **production の型シグネチャの一部なので dev-dep でなく通常 dep**）+ \`[dev-dependencies] proptest\`（レッスン4/7 で使う）。今宣言して Cargo.toml の diff を 1 箇所に集中させる（path dep は最初の \`use\` まで recompile を走らせないのでコストほぼゼロ）。

### Step 2: src/types.rs を作成

新規ファイル。module doc と \`RATE_SCALE\` のみ:

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

module doc に「Why fixed-point integers, not floats」を置く — crate 全体の load-bearing な理由付けで、コミットメッセージに埋もれさせず最上部に置く。\`[\`FundingRate\`]\`/\`[\`Premium\`]\` クロス参照はまだリンク切れ（レッスン2/3 で解決、warning は受け入れる）。\`i64\`（\`u64\` でない）— rate/premium は符号付き。

### Step 3: src/lib.rs を更新

空だった lib.rs をこう置き換える:

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
//! per-day-interval count (HL: divisor 8 — one settlement every 1 hour, scaled to a daily rate) to derive a
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

\`pub mod\` 宣言は対応ファイルを作るタイミングで足す（\`pub mod compute;\` を書いて \`compute.rs\` がないと \`error[E0583]\`）。\`pub use types::RATE_SCALE\` で呼び出し側は \`openhl_funding::RATE_SCALE\` の短いパスを使える。

### Step 4: コンパイル

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

\`\`\`
warning: unresolved link to \`FundingRate\`
warning: unresolved link to \`Premium\`
warning: unresolved link to \`FundingClock\`
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.5s
\`\`\`

rustdoc warning 3 つは期待通り（リンク先はレッスン2/3/8 で順次追加）。\`#[allow(rustdoc::broken_intra_doc_links)]\` で抑制しない — 「まだ X を足す必要がある」インジケータとして有用。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/Cargo.toml ./crates/funding/Cargo.toml
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
git checkout main
\`\`\`

Cargo.toml は \`cd94137\` と完全一致、types.rs は最初の ~30 行（module doc + \`RATE_SCALE\`）まで一致、lib.rs は短い版（\`pub mod types;\` + re-export 1 つ）。

## 合格基準

\`cargo build -p openhl-funding\` が通り、rustdoc warning 3 つ（unresolved link、期待通り、抑制しない）。よくあるエラー: \`E0463\`（\`openhl-clob\` 行を忘れ）/ \`E0583\`（\`pub mod clock/compute\` を先取り）/ manifest parse（\`[dev-dependencies]\` の typo）。

## まとめ（3行）

- \`RATE_SCALE = 1_000_000_000\`（parts-per-billion）— funding の全計算が乗る基準単位。float は 1 LSB のズレで chain fork を招くので使わず、すべて符号付き整数で bit-exact に計算する。
- \`1e9\` は i64 のスイートスポット: 9 桁精度 + キャップ \`4e7\` から天井まで 11 桁ヘッドルーム（\`i128\` 中間値で積を吸収して最後に割り戻せる）。
- consensus 定数なのでデプロイ後は immutable。\`i64\`（符号付き）で crate 開始時に一度 \`const\` 設定。テストなし（値であって挙動でない）。

## 次のレッスン（レッスン2）

money type を 4 つ追加する（\`MarkPrice\`/\`IndexPrice\`/\`Premium\`/\`Notional\`）。焦点は「なぜ固定小数点」から「なぜ newtype」へ — \`MarkPrice\` を期待する箇所に \`IndexPrice\` を渡す引数順バグをコンパイル時に潰す。`,
                },
                {
                  title: "レッスン2 — Money 型 — price / premium / notional の newtype",
                  slug: "openhl-funding-money-types-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン2 — Money 型 — price / premium / notional の newtype

## 問い

\`compute_premium(mark, index)\` の引数を取り違えて \`(index, mark)\` と呼んでも、両方 \`u64\` ならコンパイルが通り、符号が反転した premium が production まで届く（全 long が受け取るべきときに支払う）。この invisible bug をコンパイル時に潰すには？

## 原理（最小モデル）

- **newtype が引数順バグをコンパイルエラーにする。** \`u64\` を \`MarkPrice\`/\`IndexPrice\` でラップすれば、取り違えは production に届く invisible bug でなく型エラーになる。
- **型エイリアスは「型」でない。** \`type MarkPrice = u64\` はドキュメントであって安全性でない（引数を入れ替えても通る）。別アイデンティティが要るなら \`struct MarkPrice(pub u64)\`。
- **内部フィールドは \`pub\`。** 目的はクロスフィード防止であって値検証でない。\`pub\` なら \`compute.rs\` は \`mark.0\` で演算できる（\`.value()\` 経由にならない）。検証はこの crate の仕事でない。
- **符号の有無はドメインの意味で決める。** \`MarkPrice\`/\`IndexPrice\` が \`u64\`=負の価格は上流の不変条件違反。\`Premium\`/\`Notional\` が \`i64\`=方向そのものがデータ。
- **符号規約は型定義の doc に pin。** \`Premium\` の定義に「正=mark>index、longs が払う」と書けば、全 consumer の single source of truth になる。

## 具体例

\`\`\`rust
// 🔴 raw u64 — signature 上は両方 u64
fn compute_premium(mark: u64, index: u64) -> i64 { /* ... */ }
let mark = 100_u64; let index = 105_u64;
compute_premium(mark, index);   // ✨ 意図通り
compute_premium(index, mark);   // 🔴 取り違えても COMPILE OK → 符号反転が production まで届く

// 🟢 newtype — 型システムが意図を覚えている
fn compute_premium(mark: MarkPrice, index: IndexPrice) -> Premium { /* ... */ }
let mark = MarkPrice(100); let index = IndexPrice(105);
compute_premium(mark, index);   // ✨ OK
compute_premium(index, mark);   // ❌ COMPILE ERROR: expected MarkPrice, found IndexPrice
\`\`\`

差は実行時挙動でなく「ビルドが通るか」。\`u64\` 版は production まで気付けないバグを、newtype はキーボードを叩く数秒で見つける。型あたり ~5 行で *production に出るまで見えないバグクラス* を防ぐ — これが newtype パターンの存在意義だ。

## 失敗例（誤解）

「\`type MarkPrice = u64; type IndexPrice = u64;\` のエイリアスで十分」は誤り — **型エイリアスは新型を作らず、既存型をリネームするだけ**。両者とも \`u64\` のままで \`compute_premium(some_index, some_mark)\` は静かに通る。エイリアスは長いジェネリック型の可読性（\`type FillSink = Arc<Mutex<Vec<Fill>>>\`）のためで、意味的に異なる値の区別のためでない。

---

ここまでで「newtype が取り違えを潰す」は着地した。ここから 4 newtype を types.rs に足す（compute も clock もテストもなし — 純粋な型定義。最初のテストはレッスン4 の \`compute_premium\`）。コードは完全形。

> 🛑 **予測。** \`MarkPrice(pub u64)\` の内部を \`pub\` にする理由は？ private にして \`.value()\` getter を置いたら？（答え: \`compute.rs\` が生値で演算する（\`i128::from(mark.0) - ...\`）。private + getter だとどこも \`mark.value()\` を書く羽目に。pub 内部は「クロスフィード防止だけが目的、検証なし」の openhl 慣習 — \`clob::Price(pub u64)\` と同形・同理由。newtype の仕事は取り違えを型エラーにすることで、値検証でない。）

## ステップで組み立てる

### Step 1: 4 newtype を types.rs に append

\`RATE_SCALE\` の後ろに:

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

\`MarkPrice\`/\`IndexPrice\` は \`u64\`（負の価格は上流の不変条件違反、ここで再検証しない — funding crate は入力が well-formed と信頼する）。同形だが別の *意味* で、\`compute_premium(mark, index)\` が \`(IndexPrice, MarkPrice)\` をコンパイル時拒否する。\`Premium\`/\`Notional\` は \`i64\`（符号付き、方向がデータの一部）。符号規約を doc に pin（「正 = mark > index、longs が払う」）— これが下流の single source of truth。

\`Notional\` の符号と position 方向の対応:

\`\`\`
┌─────────────────────────────┬───────────────────┬───────────────────┐
│ 市場の状態                  │ Long ポジション   │ Short ポジション  │
├─────────────────────────────┼───────────────────┼───────────────────┤
│ Mark > Index (Premium 正)   │ Notional(負)→支払 │ Notional(正)→受取 │
│ Mark < Index (Premium 負)   │ Notional(正)→受取 │ Notional(負)→支払 │
└─────────────────────────────┴───────────────────┴───────────────────┘
\`\`\`

\`Notional\` の符号 = 「そのアカウントの quote balance に足す差分」（market 方向でなく、bridge が \`balance += notional.0\` でそのまま適用できるアカウント視点）。レッスン7 の \`apply_funding\` がこの 4 セルを 4 行で実装する。

### Step 2: lib.rs re-export を更新

\`\`\`rust
pub use types::{IndexPrice, MarkPrice, Notional, Premium, RATE_SCALE};
\`\`\`

アルファベット順。\`pub use types::*\` でなく explicit にする — 内部 helper の偶発公開を防ぐ（explicit re-export は public API のチェックリスト、名前 1 つ 1 つが意図的決定）。

### Step 3: コンパイル

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

\`\`\`
warning: unresolved link to \`FundingRate\`
warning: unresolved link to \`FundingClock\`
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

warning は 2 つに減る（\`[Premium]\` リンクが解決）。\`[FundingRate]\`/\`[FundingClock]\` はレッスン3/8 で解決。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
git checkout main
\`\`\`

types.rs は \`Notional\` まで（最初の 4 newtype）一致、lib.rs は 5 名前の re-export。

## 合格基準

\`cargo build -p openhl-funding\` が通り、warning 2。よくあるエラー: tuple-struct でなく \`MarkPrice { value: u64 }\`（\`E0381\`）/ \`Premium(pub u64)\` と符号間違い（\`E0277\`）/ derive 欠け（完全集合 \`Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash\` — \`Default\` はレッスン4 fixture に要る）。

## まとめ（3行）

- newtype（\`MarkPrice\`/\`IndexPrice\`/\`Premium\`/\`Notional\`）が引数順バグをコンパイルエラーにする — 型あたり ~5 行で production まで見えないバグクラスを潰す。型エイリアスは新型を作らないので不可。
- 内部フィールドは \`pub\`（クロスフィード防止だけが目的、値検証はしない）。\`MarkPrice\`/\`IndexPrice\` は \`u64\`、\`Premium\`/\`Notional\` は \`i64\`（方向がデータ）。
- 符号規約は型定義の doc に pin する（\`Premium\` 正 = longs が払う）— 数値型で最も記憶違いが起きやすい部分の single source of truth。

## 次のレッスン（レッスン3）

型 roster を完成させる（\`FundingRate\`/\`PositionSize\`/\`Position\`/\`Settlement\`/\`FundingParams\` + HL デフォルト）。焦点は newtype から **parameter-object パターン**と HL デフォルトの根拠（なぜ 1 時間、なぜ 4% cap、なぜ divisor 8）へ。`,
                },
                {
                  title: "レッスン3 — Position 型 — roster 完成 + HL デフォルト",
                  slug: "openhl-funding-position-types-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン3 — Position 型 — roster 完成 + HL デフォルト

## 問い

\`compute_rate\` は \`interval_secs\`/\`rate_cap\`/\`divisor\` の 3 値が要る。positional 引数で渡すと、後で 4 つ目を足したとき全呼び出し箇所が壊れる。config の進化をまたいで呼び出し箇所を安定させるには？ そして HL の「divisor 8 / 4% cap / 1h」は何を encode しているか？

## 原理（最小モデル）

- **同じ形・別の役割 = 別の型。** \`FundingRate\` も \`Premium\` も \`RATE_SCALE\` スケールの \`i64\` だが、premium=生の dislocation、rate=divisor+clamp 後の出力。別型なら pipeline を型で強制（\`compute_rate\` を通さない premium を \`apply_funding\` に渡せない）。
- **方向+大きさを符号付き整数 1 つで。** \`PositionSize(i64)\`：正=long / 負=short / 0=flat。enum+magnitude より小さく・速く・数学が単純。符号規約は doc に。
- **スナップショット型 vs stateful エンティティ。** \`Position\` は \`(account, size)\` だけ、entry price も PnL も履歴も持たない。広い state は owning layer（vault/clearing）の仕事、funding crate は狭い snapshot を処理する。
- **parameter-object パターン。** 3 値を \`FundingParams\` にまとめれば config 拡張で呼び出し箇所が壊れない（成長するのは struct だけ）。グループ自体がドメイン概念のときに使う。
- **HL デフォルトの非対称 2 段構え。** divisor=8 で typical daily を 3×premium に持ち上げ、cap=4%/interval で worst daily を 96% に切る。

## 具体例

\`\`\`
              セマンティクス上の意図           実際の挙動
              ─────────────────────           ───────────────
divisor = 8 = 「1 日を 8 分割」                でも settle/適用は毎時 (24 回/日)
                ↓                                ↓
  premium / 8 × 8 = premium                    premium / 8 × 24 = 3 × premium
  → 1 日分の premium がそのまま                  → 「狙った daily 量」より 3 倍

そこで cap (4%/interval):
  普通の市場では post-divisor rate ≪ 4% で cap に当たらず、実効 daily ≒ 3 × premium。
  異常時 (oracle outage 等) でも 毎時 4% で clamp → 最悪 daily = 4% × 24 = 96%/day で必ず止まる。
\`\`\`

HL は「divisor で typical daily を 3×premium に持ち上げ、cap で worst daily を 96% に切る」非対称 2 段構え。divisor 単体（1 日 8 settlement）から素直に出る値より、cap のほうが厳しい絶対上限を提供する。

## 失敗例（誤解）

「\`Position\` も先物の損益計算のため entry price を持つべき」は誤り — それは owning layer の仕事。vault/clearing が entry price を追跡し PnL を計算する。funding crate はその下流で、*現在* の position snapshot に *現在* の funding を適用するだけ。snapshot 型は narrow に保ち、owning layer が wide な型を持てばいい。

---

ここまでで「pipeline を型で強制」「parameter object」「HL デフォルト」は着地した。ここから 5 型を足して roster を閉じ、\`AccountId\` import も入れる（これで セクション1 完了、rustdoc warning もゼロへ）。コードは完全形。

> 🛑 **予測。** \`FundingParams { interval_secs, rate_cap, divisor }\` を struct にまとめる理由は（\`compute_rate(premium, interval, cap, divisor)\` でなく）？（答え: parameter-object が config 進化をまたいで呼び出し箇所を安定させる。後で \`min_settlement_threshold\` を足してもシグネチャは \`compute_rate(premium, params)\` のまま — 成長するのは struct だけ。positional 版は新パラメータごとに全呼び出し箇所が壊れる。安定して一緒に動く値で、グループ自体がドメイン概念のときにまとめる。）

## ステップで組み立てる

### Step 1: AccountId import を追加

\`types.rs\` の module doc の後、\`RATE_SCALE\` の前に:

\`\`\`rust
use openhl_clob::AccountId;
\`\`\`

レッスン1 の Cargo.toml dep で準備済み。\`AccountId\` は自前の型でないので re-export しない（依存先の型は呼び出し側に直接 import させる — re-export すると同じ型に 2 つの import path ができて依存が不透明になる）。

### Step 2: Premium の後ろに FundingRate を append

\`\`\`rust
/// Per-interval funding rate. Same scale as [\`Premium\`]; positive means
/// longs pay shorts. A rate of \`RATE_SCALE / 100\` = 1% per interval.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct FundingRate(pub i64);
\`\`\`

\`Premium\` と同形（同 \`i64\`・同 derive）だが別型 — premium=生の dislocation、rate=divisor+clamp 後に position へ適用される値。\`compute_rate\` を通さない premium を \`apply_funding\` に渡せない（型が pipeline 順序を強制）。

### Step 3: PositionSize を append

\`\`\`rust
/// Signed position size in base units. Positive = long, negative = short,
/// zero = flat. Accounts with zero size aren't included in settlement
/// snapshots — see [\`Position\`].
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct PositionSize(pub i64);
\`\`\`

符号付き整数 1 つで long(\`>0\`)/short(\`<0\`)/flat(\`==0\`)。\`{ direction: Direction, magnitude: u64 }\` の 2 フィールド表現より小さく（8 vs ~16 byte）・速く（hot path で enum dispatch 不要）・数学が単純（\`size.0\` の乗算で符号が自然に伝播）。「zero size は settlement snapshot に含めない」が load-bearing（\`apply_funding\` が filter、レッスン7）。

### Step 4: Position を append

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

\`(account, size)\` だけ — \`entry_price\`/\`realized_pnl\` なし（owning layer の仕事）。doc が ownership 契約を明示（「never owns or mutates them」）。\`Default\` を付けない — \`AccountId::default()\` = \`AccountId(0)\` は多くのアカウントシステムで sentinel。identity を担う struct に偶発的なデフォルト構築を許さない。

### Step 5: Settlement を append

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

\`apply_funding\` の出力、非 flat position 1 つにつき 1 つ。位置インデックスでなく \`account\` を再度持つのは、filter で入力 position と出力 settlement の長さが違うから（インデックス対応の管理を呼び出し側から切り離す）。struct-array vs parallel-array のトレードオフで struct-array を選択（コスト = 冗長な \`AccountId\` 1 つ、メリット = インデックス管理不要）。

### Step 6: FundingParams + hyperliquid_default を append

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

HL デフォルトの理由: \`interval_secs: 3600\`（毎時 — basis dislocation を素早く感じ取れ、block time noise に支配されない）/ \`rate_cap: FundingRate(40_000_000)\`（4%/interval、oracle 異常への保険 — index を一時的に 50% 動かせる攻撃者でも 1 tick で 50% を抜けない）/ \`divisor: 8\`（1 日 8 settlement だが 24 interval にまたがり適用）。\`const fn\`（コンパイル時定数に使える）+ \`#[must_use]\`（値生成が目的の関数で結果破棄は常にバグ）。

### Step 7: lib.rs re-export を更新

\`\`\`rust
pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
\`\`\`

アルファベット順、合計 10 名前（9 型 + \`RATE_SCALE\`）。

### Step 8: コンパイル

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

\`\`\`
warning: unresolved link to \`FundingClock\`
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

warning は 1 つに（残るは \`FundingClock\` のみ、レッスン8 で解決）。

## セクション1 のデータパイプライン

定義した 9 型は、セクション2（レッスン4〜7）で組み立てる純粋計算パイプラインの語彙だ:

\`\`\`
  MarkPrice  ──┐
               ├─► (レッスン4: compute_premium) ─► Premium ──┐
  IndexPrice ──┘                                       │
                                                       ▼
  FundingParams ───────────────────────────► (レッスン6: compute_rate)
   { rate_cap, divisor, … }                            │
                                                       ▼
                                                  FundingRate ──┐
                                                                ├─► (レッスン7: apply_funding) ──► Vec<Settlement>
  Position (snapshot)             ──────────────────────────────┘                            { account, delta: Notional }
   { account, size: PositionSize }
\`\`\`

型レベルで強制する 3 点: ① \`Premium\` と \`FundingRate\` は同 \`i64\` だが別型（\`compute_rate\` を通さず \`apply_funding\` に渡すとコンパイルエラー、pipeline 順序を型で守る）② 入力 \`Position\` と出力 \`Settlement\` を別型に（\`Settlement\` の再適用を型で塞ぐ）③ \`FundingParams\` は枝として並走（後から閾値が増えても矢印は増えない）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
git checkout main
\`\`\`

types.rs は \`cd94137\` と **完全一致**（9 型 + \`RATE_SCALE\` + \`hyperliquid_default\`、~110 行）。lib.rs は \`compute\`/\`clock\` の re-export だけ欠ける。**セクション1 完了。**

## 合格基準

\`cargo build -p openhl-funding\` が warning ≤1（\`FundingClock\` のみ、レッスン8 で解決）。よくあるエラー: \`E0432\`（\`openhl-clob\` dep 欠け）/ \`Notional\` 綴り間違い / \`const fn\` 内の関数呼び出し（\`FundingRate(40_000_000)\` の tuple-struct リテラルを使う）。

## まとめ（3行）

- 9 型で funding の語彙が完成: \`FundingRate\`（\`Premium\` と同形・別型で pipeline 順序を型強制）/ \`PositionSize\`（符号付き 1 整数で long/short/flat）/ \`Position\`（narrow な snapshot）/ \`Settlement\`（出力）/ \`FundingParams\`。
- \`FundingParams\` は parameter-object で config 進化に強い。HL デフォルトは非対称 2 段構え（divisor で typical を 3×premium に、cap で worst を 96%/day に切る）。
- \`Position\` は entry price/PnL を持たない snapshot（state 追跡は owning layer）。\`AccountId(0)\` sentinel 回避で \`Default\` を付けない。types.rs は \`cd94137\` と完全一致。

## 次のレッスン（レッスン4）

\`compute.rs\` を始める — crate 最初の数学 \`compute_premium\`（8 行）。設計判断 3 つ（\`index==0\` を \`Premium(0)\` で扱う / \`i128\` 中間値で overflow 回避 / \`i64\` へ saturate）と、crate 最初の unit test 4 つを追加する。`,
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
                  title: "レッスン4 — compute_premium — 最初の数学、最初のテスト",
                  slug: "openhl-funding-compute-premium-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン4 — \`compute_premium\` — 最初の数学、最初のテスト

## 問い

\`(mark - index) / index\` を整数で計算したい。だが \`u64\` の引き算は \`mark < index\` で underflow し、整数除算を先にすると 100% 未満の premium が全部 0 に丸まる。符号を保ちつつ精度も残すには、型と演算順をどう組むか？

## 原理（最小モデル）

- **整数幅は入力でなく *中間値* のレンジで選ぶ。** \`mark\`/\`index\` は \`u64\` だが \`(mark-index)*RATE_SCALE\` は最悪 ~1.8e28。i128 中間値は必須、しかも upcast を引き算の *前* に入れて初めて符号が保たれる。
- **割る前に掛ければ精度が残る。** \`(mark-index)/index\` を整数で先に計算すると 100% 未満の premium が全部 0 に丸まる。先に \`RATE_SCALE\` を掛けて分数を i128 マグニチュードに変換し、その後で割る。
- **\`u64\` 引き算が王道の符号バグ。** \`99 - 100\` を u64 でやると \`u64::MAX\` 近くに wrap（小さな負でなく巨大な正）。\`i128::from(...)\` upcast で代数的に正しくなる。
- **oracle 欠損は graceful degradation。** \`index==0\` は \`Premium(0)\` を返しエラーにしない（funding は bridge 経由で balance update に流れるので \`Err\` は無関係な payload まで tx 失敗にする）。早期 return がゼロ除算 panic も同時に防ぐ。
- **テストコメントは紙の上の数学そのもの。** \`// (101-100)*1e9/100 = 10_000_000\` を assertion 横に書けば、将来の debugger は「作者を信じる」でなく「数式に照らして検証」できる。

## 具体例

\`compute_premium\` 内で型がどこで widen/saturate/narrow するか:

\`\`\`
  MarkPrice(u64) ──► i128 ──┐
                            ▼
  IndexPrice(u64) ──► i128 ─► [ - 引き算 ] ──► diff (i128: 符号が安全に残る)
                                                  │
  RATE_SCALE(i64) ──► i128 ──► [ saturating_mul ] ─► scaled (i128, overflow を clamp)
                                                  │
  IndexPrice(u64) ──► i128 ──────────────► [ / 除算 ]  (※ index==0 は事前に弾く)
                                                  ▼
  Premium(pub i64) ◄──── [ saturate_i128_to_i64 ] ◄── premium (i128)
\`\`\`

入力（\`MarkPrice\`/\`IndexPrice\`/\`RATE_SCALE\`）と出力（\`Premium\`）は narrow、中間値だけ意図的に i128 に widen。overflow は \`saturating_mul\` と最後の \`saturate_i128_to_i64\` の 2 箇所で吸収（間の \`diff\` には不要）。「掛けてから割る」が \`scaled\` ラベルの位置に現れる。

## 失敗例（誤解）

「\`(mark - index).saturating_mul(RATE_SCALE) / index\` を u64 で計算」は誤り — 引き算が問題。\`MarkPrice(99) - IndexPrice(100)\` を u64 でやると underflow し \`u64::MAX\` 近くに wrap（小さな負でなく巨大な正）。本来小さな負の premium が巨大な正になる。符号が肝心、符号付き演算が必須。

---

ここまでで「i128 中間値 + 掛けてから割る」は着地した。ここから実際の数学を持つ最初のレッスンに入る（これ以降、コード変更でアカウント間に wealth が静かに移りうる — 手書きトレースのテストが期待値を紙の数学に pin する）。コードは完全形。

> 🛑 **予測。** \`(mark - index) * RATE_SCALE\` の最大サイズは（\`mark\`/\`index\` は u64、\`RATE_SCALE = 1e9\`）？ どの型に収まる必要があるか。（答え: \`(u64::MAX - 1) * 1e9 ≈ 1.8e28\`。\`i64::MAX\` ~9.2e18 なので中間値に i128 必須。index で割った後は i64 に戻るが、除算は乗算の *後* なので中間が i128 に収まることが必須。積に i128、saturation が最終結果の稀な i64 超えを扱う。）

## ステップで組み立てる

### Step 1: compute.rs を module doc 付きで作成

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

module doc が 3 関数をプレビュー（\`[compute_rate]\`/\`[apply_funding]\` はレッスン6/7 までリンク切れ、warning 許容）。\`use\` block はレッスン6/7 で使う型も今 import（boilerplate を先に安定化させ、レッスンごとの diff を本質に集中させる）。

### Step 2: compute_premium を追加

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

動く部分 4 つ: \`index==0\` 早期 return（graceful degradation + 直後の \`scaled / index\` のゼロ除算 panic も同じ 2 行で封じる）/ 引き算の前に \`i128\` upcast（u64 underflow 回避）/ \`saturating_mul\`（panic/wrap でなく \`i128::MAX/MIN\` に clamp）/ 割るのは掛けた後（精度保持）。

### Step 3: saturate_i128_to_i64 helper を追加

\`\`\`rust
/// Clamp an \`i128\` into the \`i64\` range. Used wherever an intermediate
/// product can exceed \`i64::MAX\` at network-pathological inputs (e.g., a
/// \`u64::MAX\` index price). Saturation, not wrapping — see the module-doc
/// comment on why panicking would be a worse failure mode.
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
\`\`\`

\`i64::try_from(v)\` が \`Result\`、\`unwrap_or\` が overflow 方向に応じた default を返す（正なら \`i64::MAX\`、負なら \`i64::MIN\`）。module private（\`fn\`、呼び出し側は \`MarkPrice\`→\`Premium\` を見るだけ）。レッスン7 の \`apply_funding\` が 2 番目の caller — だから inline でなく独立 helper にする。

### Step 4: テストモジュール + 4 unit test

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

手書きトレース 4 つ（equal→0 / positive→longs overpay / negative→u64 underflow バグを捕まえる / index-zero→graceful guard）。コメント \`// (101-100)*1e9/100 = 10_000_000\` が紙の数学。pathological 入力（\`u64::MAX\` 等）の境界テストはレッスン5。

### Step 5: lib.rs を更新

\`\`\`rust
pub mod compute;
pub mod types;

pub use compute::compute_premium;
pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
\`\`\`

モジュール宣言・re-export ともアルファベット順（\`compute\` が \`types\` の前）。

### Step 6: テスト実行

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

\`\`\`
warning: unresolved link to \`compute_rate\`
warning: unresolved link to \`apply_funding\`
warning: unresolved link to \`FundingClock\`
running 4 tests
test compute::tests::premium_negative_when_mark_below_index ... ok
test compute::tests::premium_positive_when_mark_above_index ... ok
test compute::tests::premium_saturates_to_zero_when_index_is_zero ... ok
test compute::tests::premium_zero_when_mark_equals_index ... ok
test result: ok. 4 passed; 0 failed; ...
\`\`\`

crate 初の green run。rustdoc warning 3 つは期待通り（レッスン6/7/8 で解決）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
git checkout main
\`\`\`

compute.rs は \`compute_premium\` + \`saturate_i128_to_i64\` + 4 premium テストまで一致（\`compute_rate\`/\`apply_funding\`/proptest はレッスン5-7）。

## 合格基準

\`cargo test -p openhl-funding\` が 4 pass。よくあるエラー: \`* RATE_SCALE\` 抜けで \`left=0\`（整数除算が先に 0 に丸める）/ i128 upcast 抜けで \`left=18446744073709541616\`（u64 underflow wrap）/ \`saturating_mul\` でなく \`*\` で panic（debug overflow）/ helper の宣言順は Rust が気にしない。

## まとめ（3行）

- \`compute_premium\` は \`(mark-index)/index\` を \`RATE_SCALE\` スケールで返す。中間値を \`i128\` に widen（入力は narrow なまま）し、引き算の前に upcast して符号を保つ。
- 「掛けてから割る」で精度を残し、overflow は \`saturating_mul\` + \`saturate_i128_to_i64\` で吸収（panic/wrap は consensus を壊すので不可）。
- \`index==0\` は \`Premium(0)\` で graceful degradation（兼ゼロ除算 panic 回避）。テストコメントが紙の数学で、debugger が assertion を数式に照らせる。

## 次のレッスン（レッスン5）

新関数なし。overflow 哲学を深掘り（consensus で許される overflow は saturate だけ — panic は halt 経由 fork、wrap は誤値 fork）し、crate 初の proptest \`premium_is_antisymmetric_in_mark_index\` を追加する。`,
                },
                {
                  title: "レッスン5 — Overflow 哲学 + 最初の proptest",
                  slug: "openhl-funding-overflow-proptest-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン5 — Overflow 哲学 + 最初の proptest

## 問い

\`compute_premium\` の積が i128 を超えたら何が起きるべきか？ panic？ wrap？ それとも別の何か？ consensus システムでは「validator ごとに違う答え」も「1 台だけ halt」も許されない。唯一許される overflow 挙動は何で、それをどうテストするか？

## 原理（最小モデル）

- **consensus で許される overflow は saturate だけ。** panic → validator が halt し network から fork off（liveness 喪失）。wrap → コンパイラ次第で「定義されているが誤った」値 → 誤値 fork or silent corruption。saturate → 全 validator が同じ bounded 値に合意。
- **符号を意識した saturation の override。** \`i64::try_from\` は失敗を報告するが方向を教えない。\`unwrap_or(if v>0 {MAX} else {MIN})\` のインライン条件式が方向を復元（固定 \`i64::MAX\` だと \`i128::MIN\` が正に flip して符号が壊れる）。
- **手書きトレースと proptest は補完。** proptest のランダムサンプリングは \`i128::MAX\`（2^129 通りの 1 点）にまず当たらない。境界は手書きでしか pin できない。proptest は interior、手書きは corner。
- **テストすべきは実際に成立する不変条件、願望でない。** 素朴な antisymmetry は magnitude も等しくと書きたくなるが整数除算が壊す。だから weaker な「符号が逆」をテストし、丸めの caveat はコメントに残す。
- **\`checked_mul\` + \`Result\` は解決にならない。** エラーは最終的に bridge に届き、bridge の選択肢は revert(fork) / skip(silent inconsistency) / cap で settle の 3 つ。最後のものは saturate がそのまま実現する。

## 具体例

「整数が収まらなかった」の失敗モードを validator から見た帰結で並べる:

| モード | Rust 上の挙動 | network への影響 | 判定 |
| --- | --- | --- | --- |
| **Panic** (\`*\` debug) | スレッド halt | validator 1 台が consensus から永久脱落、network は気づかず前進 | ❌ 自ら fork off（liveness 喪失） |
| **Wrap** (\`*\` release) | silent に modulo wrap | 最適化次第で各 validator が別々の誤値、または全員一致で誤値合意 | ❌ 検出不能な fork or silent corruption |
| **Saturate** (\`saturating_mul\`) | \`i128::MAX/MIN\` に clamp | 全 validator が同じ bounded 値で合意・前進、経済的には capped settlement | ⭕ liveness 維持 — 唯一の選択肢 |

## 失敗例（誤解）

「境界（\`i128::MAX\` 等）は proptest がカバーするから手書きテスト不要」は誤り — proptest のデフォルト戦略は入力空間に uniform にサンプルし、\`i128::MAX\` は 2^129 通りの 1 点なのでランダムに当たる確率は実質ゼロ。境界には generator のランダムウォークが届かない特定値を狙い撃つ手書きトレースが要る。

---

ここまでで「saturate が唯一の consensus-safe な overflow」は着地した。ここから新関数なしで proptest を 1 つ足す（production コード変更なし — メンタルモデルが本体）。コードは完全形。

> 🛑 **予測。** \`compute_premium\` で panic が起きれば validator は halt する。**なぜそれが単一ノード障害でなく chain fork になるか？**（答え: 他の validator は halt したノードを置き去りに前進する。再起動時には chain head が何ブロックも先で、halt したブロックでの local state が network の view と食い違い sync できない — 自ら network から fork off した形。saturate は validator を lockstep のまま保つ。）

## ステップで組み立てる

### Step 1: テストモジュールに proptest サポートを追加

\`compute.rs\` のテストモジュール冒頭をこう拡張:

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

    // ... レッスン4 の 4 unit test ...
}
\`\`\`

\`use openhl_clob::AccountId\` と \`pos\` helper はレッスン7 の apply_funding テストで使うが、テストモジュールの import を安定化させるため今入れる。\`use proptest::prelude::*\` が \`proptest!\`/\`prop_assert_eq!\`/strategy combinator を scope に持ち込む。

### Step 2: Antisymmetry proptest を追加

4 unit test の後、閉じ \`}\` の前に:

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

\`signum()\` は符号を \`-1\`/\`0\`/\`+1\` で返す。\`mark in 1u64..1_000_000\` が戦略（デフォルト 256 ケース）。素朴な antisymmetry（magnitude も等しい）は整数除算の丸めで破れるので、weaker な「符号が逆 or 両方ゼロ」をテストし、丸めの caveat をコメントに残す。\`0\` を除外するのは \`index==0\` がレッスン4 でカバー済みかつ「両方ゼロで符号反対」が破れるから。

### Step 3: テスト実行

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

\`\`\`
running 5 tests
test compute::tests::premium_is_antisymmetric_in_mark_index ... ok
... (レッスン4 の 4 つ) ...
test result: ok. 5 passed; ...
\`\`\`

256 個のランダム \`(mark, index)\` ペアで antisymmetry が満たされる。\`PROPTEST_VERBOSE=1\` で「passed 256 cases」や失敗時の「shrunk to ...」が見える。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
git checkout main
\`\`\`

compute.rs は \`compute_premium\` + helper + 4 premium テスト + antisymmetry proptest + テストモジュール imports/helper まで一致（\`compute_rate\`/\`apply_funding\` はレッスン6/7）。

## 合格基準

\`cargo test -p openhl-funding\` が 5 pass。よくあるエラー: \`use proptest::*\`（\`::prelude::*\` でない）でマクロ未解決 / \`prop_assert_eq!\` を \`assert_eq!\` と typo（shrink されない）/ \`mark==index\` を else に流して符号テスト失敗。

## まとめ（3行）

- consensus 上で bounded behavior を提供する overflow 挙動は saturate だけ（panic=halt fork、wrap=誤値 fork）。\`saturate_i128_to_i64\` の \`unwrap_or\` は符号依存にする（固定値だと \`i128::MIN\` が正に flip）。
- テストするのは実際に成立する不変条件（符号が逆）であって願望（magnitude も等しい）でない。整数除算の丸めで破れる property はコメントに caveat を残す。
- 手書きトレースは境界（generator が届かない \`i128::MAX\` 等）を pin、proptest は内部 property（antisymmetry を 256 ケース）を pin。補完的で冗長でない。

## 次のレッスン（レッスン6）

\`compute_rate\` を追加（\`Premium\` + \`FundingParams\` → \`FundingRate\`）。設計判断 3 つ（\`divisor==0\` で funding 無効化 / 割ってから clamp / \`rate_cap\` を絶対値 clamp）と unit test 5 つ。`,
                },
                {
                  title: "レッスン6 — compute_rate — divisor + cap",
                  slug: "openhl-funding-compute-rate-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン6 — \`compute_rate\` — divisor + cap

## 問い

premium を \`divisor\` で割り、\`±rate_cap\` に clamp して per-interval rate を作る。だが「割る」と「clamp する」の順序を逆にすると、cap の意味が \`4%/interval\` から \`0.5%/interval\` に静かにすり替わる。なぜ順序が cap の単位を決めるのか？

## 原理（最小モデル）

- **演算順が単位を決める。** 先に割って *それから* clamp する。cap は \`4%/interval\` なので rate レベルで bind する必要がある。clamp してから割ると実効 cap が \`cap/divisor\`（HL デフォルトで \`0.5%/interval\`）にすり替わる。
- **\`.clamp(-cap, cap)\` で対称クランプ。** 標準 \`i64::clamp\` が両側を一度に処理。\`min(raw, cap)\` で正側だけ clamp して負側を見落とすバグを構造的に防ぐ。
- **API 境界での defensive な \`.abs()\`。** \`FundingRate(-40_000_000)\` を絶対値として受け入れ、呼び出し側の footgun を減らす（コスト ~1ns）。cap は「幅」であって「位置」でない。
- **自然に成立する edge case は明示的な分岐より強い。** \`cap==0\` は \`clamp(0,0)=0\` から自動的に \`FundingRate(0)\` を生む。特例コードを書かない = テストすべきパスも増えない。
- **property のない場所に proptest を強引に当てない。** 「割って clamp」には代数的不変条件がない。手書きトレースで入力領域をカバーすれば十分。

## 具体例

premium が 100%（\`RATE_SCALE\` ppb）のとき、順序で最終 rate が 8 倍変わる（HL デフォルト divisor=8, cap=±4%）:

\`\`\`
🟢 A (今回の実装) divide → clamp
   Premium 100% ─/8─► raw 12.5% ─clamp(±4%)─► 4%  ✨ spec 通り
🔴 B (順序逆転)  clamp → divide
   Premium 100% ─clamp(±4%)─► 4% ─/8─► 0.5%  ❌ cap が「premium 上限」にすり替わり spec の 1/8
\`\`\`

同じ \`premium\`/\`divisor\`/\`cap\` でも 2 行を入れ替えるだけで **4%** と **0.5%** に着地する。コンパイラもテストも警告しない純粋な semantics バグ。「cap の単位は出力（rate）の単位に合わせる」がその規律。

## 失敗例（誤解）

「\`params.rate_cap == 0\` を特殊ケースとして扱うべき」は誤り — 自然に処理される。\`cap==0\` のとき \`clamp(-0, 0)\` は入力に関わらず \`0\` を返し、\`FundingRate(0)\`（funding 無効化）になる。edge case が自然に処理されるコードのほうが、明示的な分岐より良い（テストすべきパスが増えない）。

---

ここまでで「割ってから clamp」「cap は絶対値」は着地した。ここから 2 つ目の pure 関数を足す（\`compute_premium\` より短い — 値が既に i64 に収まるので overflow 体操がない）。コードは完全形。

> 🛑 **予測。** 先に clamp してから割るとどう変わるか？（答え: cap が「最大 rate」でなく「最大 premium」を意味するようになる。\`cap=4%\`, \`divisor=8\` で premium を ±4% に clamp してから割ると最大 *rate* は 0.5%/interval。今回（先に割って rate レベルで clamp）なら cap がそのまま 4%/interval で bind。cap の単位は出力の単位に合わせる必要がある。）

## ステップで組み立てる

### Step 1: compute_rate を追加

\`compute_premium\` の後、\`saturate_i128_to_i64\` の前に:

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

動く部分 4 つ: \`divisor==0\` 早期 return（funding 無効化 + ゼロ除算 panic 回避）/ \`i64::from(u32)\` でロスレス widen して除算（生 rate）/ \`.abs()\` で cap を magnitude に / \`.clamp(-cap, cap)\` で対称 clamp（手書き if/else 不要）。

### Step 2: 5 unit test を追加

premium テストの後（proptest ブロックの前）に:

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

5 つ: 通常除算 / 正側 clamp / 負側 clamp（\`min(raw,cap)\` の負側見落としを捕まえる）/ divisor=0 無効化（ゼロ除算 guard を捕まえる）/ cap=0 無効化（\`clamp(0,0)\` の自然処理を確認）。

### Step 3: lib.rs を更新

\`\`\`rust
pub use compute::{compute_premium, compute_rate};
\`\`\`

### Step 4: テスト実行

\`cargo test -p openhl-funding\` が 10 pass（premium 5 + rate 5）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
git checkout main
\`\`\`

compute.rs は \`compute_premium\` + \`compute_rate\` + helper + 4 premium + 5 rate + 1 proptest まで一致（\`apply_funding\` + zero-sum proptest はレッスン7）。

## 合格基準

\`cargo test -p openhl-funding\` が 10 pass。よくあるエラー: \`rate_zero_when_divisor_is_zero\` で panic（guard 忘れ）/ \`min/max\` の順序間違いで負側 clamp 失敗（\`.clamp\` を使う）/ \`premium.0 / params.divisor\` の型混在（\`i64::from(...)\` を使う、\`as i64\` の typo は truncate しうる）。

## まとめ（3行）

- \`compute_rate\` は premium を divisor で割り \`±rate_cap.abs()\` に clamp。**割ってから clamp** が肝 — 逆順は cap を実効 \`cap/divisor\` に弱める silent な semantics バグ。
- \`.clamp(-cap, cap)\` で対称クランプ（正側だけの \`min\` バグを構造的に防ぐ）、cap は \`.abs()\` で magnitude 扱い（負 cap を defensive に受け入れる）。
- \`divisor==0\`/\`cap==0\` はどちらも \`FundingRate(0)\`（funding 無効化）— cap==0 は \`clamp(0,0)\` から自然に落ちる。代数的 property がないので proptest なし。

## 次のレッスン（レッスン7）

\`apply_funding\` を追加（最後の pure 関数）。\`Position\` スライス + \`MarkPrice\` + \`FundingRate\` → \`Vec<Settlement>\`。longs-pay-shorts の符号規約（単項マイナス 1 つ）と balanced-book zero-sum proptest（funding は再配分するだけ）でセクション2 を閉じる。`,
                },
                {
                  title: "レッスン7 — apply_funding — 符号規約 + zero-sum proptest",
                  slug: "openhl-funding-apply-funding-ja",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン7 — \`apply_funding\` — 符号規約 + zero-sum proptest

## 問い

\`size: PositionSize(i64)\`（正=long）と \`rate: FundingRate(i64)\`（正=longs が払う）がある。素朴に \`size × rate\` を計算すると long × 正 rate で値は正になる。だが long の settlement delta は *負* であるべき（longs が払う側）。この符号反転を最もきれいに encode するには？

## 原理（最小モデル）

- **単項マイナス 1 つが符号規約全体を担う。** \`-delta_unscaled\` で「市場中心（longs が払う）」から「アカウント中心（\`Notional\` 正=受取）」へ flip。反転点が 2 箇所あればバグ表面積が 2 倍。1 箇所に集約が契約。
- **保存則を proptest で pin。** balanced book の settlement 合計は saturation を踏まない範囲で「ちょうど」ゼロ（正の \`d\` で \`-x/d = -(x/d)\` が整数除算でも成立）。funding は再配分するだけ、生成も破壊もしない。
- **flat position はフィルタ、エラーにしない。** \`size==0\` を黙ってドロップ。\`Result<_, FlatPositionError>\` は呼び出し側に「異常でない条件」を扱わせる。flat は想定内の状態。
- **最も制約の弱い引数型を受け取る。** \`positions: &[Position]\`（スライス借用）なら呼び出し側が所有権を保持し tick をまたいで再利用できる。\`Vec\` 要求は毎回 clone 強制。
- **proptest のレンジは property が *厳密* に成立するよう選ぶ。** \`size in 1..1M\` なら i128 積が \`saturating_mul\` の閾値を踏まない。広げると「合計==0」を「\`abs < epsilon\`」に弱める羽目に。

## 具体例

\`size × rate\` の生の積がどの符号でも、先頭の単項 \`-\` 1 つで 4 ケースすべてが \`Notional\` 規約にアラインする:

\`\`\`
【 正 rate：longs が支払う 】
  Long  (+size) × (+rate) ─►(+積)─►[ - ]─► Notional(負) ─► 支払 ⭕
  Short (-size) × (+rate) ─►(-積)─►[ - ]─► Notional(正) ─► 受取 ⭕
【 負 rate：shorts が支払う 】
  Long  (+size) × (-rate) ─►(-積)─►[ - ]─► Notional(正) ─► 受取 ⭕
  Short (-size) × (-rate) ─►(+積)─►[ - ]─► Notional(負) ─► 支払 ⭕
\`\`\`

「1 文字に 1 つの設計判断を込める」とはこのこと。

## 失敗例（誤解）

「\`-\` を付けず『市場 delta』として計算し、ストレージ層で反転すればいい」は誤り — 符号反転ポイントを 2 つ持つとバグの可能性が 2 倍。数学レイヤーで一度だけアカウント中心を encode すれば、下流（bridge/balance/telemetry）はすべて統一規約で \`Notional\` を読める。変換ポイントを 1 つに絞れば、テストすべき surface area が半分になる。

---

ここまでで「単項マイナスが符号規約を担う」は着地した。ここから pipeline の最終段（rate → アカウントごとの settlement）を組み、saturate helper の 2 番目の caller も足す。これでセクション2 が閉じる。コードは完全形。

> 🛑 **予測。** この関数が \`positions: Vec<Position>\` でなく \`positions: &[Position]\` を取る理由は？（答え: 呼び出し側が position リストを所有し tick をまたいで再利用するから。所有権を奪うと毎回 clone が要る。スライス借用はコストゼロ。関数が使える型のうち最も制約の弱いものを受け取る — iteration だけで足りるなら Vec でなく slice。）

## ステップで組み立てる

### Step 1: apply_funding を追加

\`compute_rate\` の後、\`saturate_i128_to_i64\` の前に:

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

動く部分: \`rate==0\` fast-path（allocation なし）/ \`with_capacity\`（再アロケート防止）/ \`size==0\` を \`continue\`（flat フィルタ → 入出力の長さが違う）/ \`size*mark\` を i128+\`saturating_mul\`（\`compute_premium\` と同じレシピ）/ \`× rate\` も i128 / \`-delta_unscaled / RATE_SCALE\`（先頭 \`-\` が符号規約、除算が ppb スケールを打ち消す）。

### Step 2: 4 unit test を追加

rate テストの後（proptest ブロックの前）に:

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

4 つ: flat フィルタ（3 入力→1 出力）/ longs-pay-shorts（非対称 magnitude で delta が \`|size|\` でスケールすることも証明）/ rate 反転で対称 / zero-rate fast-path。\`pos\` helper はレッスン5 で追加済み。

### Step 3: Balanced-book zero-sum proptest を追加

既存の \`proptest! { ... }\` ブロックに 2 つ目を追加:

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

zero-sum は funding の根本的保存則。\`(+P, -P)\` の対称ペアでは整数除算の切り捨てがあっても \`(-P)/d == -(P/d)\`（\`d>0\`）が保たれ、端数も対称に相殺して tolerance なしで和が厳密に 0。\`size in 1..1M\` に絞るのは i128 積が saturate しない領域に留めるため（saturate すると long 側と short 側がちょうど負にならず property が壊れる）。

### Step 4: lib.rs を更新

\`\`\`rust
pub use compute::{apply_funding, compute_premium, compute_rate};
\`\`\`

セクション2 の 3 pure 関数がすべて re-export された。

### Step 5: テスト実行

\`cargo test -p openhl-funding\` が 15 pass（手書き 13 + proptest 2）。rustdoc warning は \`FundingClock\` 1 つだけ（レッスン8 で解決）。**セクション2 が閉じる。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
git checkout main
\`\`\`

compute.rs は \`cd94137\` と **完全一致**（3 pure 関数 + helper + 全テスト + 2 proptest）。lib.rs は \`pub mod clock;\` とその re-export だけ欠ける（レッスン8）。

## 合格基準

\`cargo test -p openhl-funding\` が 15 pass。よくあるミス: \`delta_unscaled\` の前の \`-\` 忘れで long も short も同符号 delta（相殺しない）/ \`pos.size\` の signed を見落とし符号追跡が脆い / proptest 失敗時は符号反転を確認（long と short が反対符号・等規模の delta）。

## まとめ（3行）

- \`apply_funding\` は rate を各 non-flat position に適用し \`Vec<Settlement>\` を返す。先頭の単項マイナス \`-delta_unscaled\` 1 つが市場中心→アカウント中心の符号規約を 4 ケースすべてで担う。
- flat position はフィルタ（エラーにしない、想定内の状態）、入力は \`&[Position]\`（最も制約の弱い型）・出力は owned \`Vec\`。積は i128 + \`saturating_mul\`。
- balanced-book zero-sum proptest が funding の保存則を pin（再配分するだけ、生成も破壊もしない）。\`(+P,-P)\` 対称ペアで端数も相殺し tolerance なしで和が 0。これでセクション2（15 tests）完了。

## 次のレッスン（レッスン8）

\`clock.rs\` を作成 — \`FundingClock\` 構造体と \`tick()\`。「十分な時間が経過したか？」の guard の背後で \`compute_premium\`/\`compute_rate\`/\`apply_funding\` を組み合わせる discrete event loop。不変条件（interval ごと最多 1 回 / no-catch-up）はレッスン9/10 が独立して受け持つ。`,
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
                  title: "レッスン8 — FundingClock — discrete event loop",
                  slug: "openhl-funding-clock-scaffold-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン8 — \`FundingClock\` — discrete event loop

## 問い

3 つの pure 関数（premium/rate/funding）は揃ったが、*いつ* 呼ぶかを誰も決めていない。funding は固定 interval（HL は 1h）ごとに 1 回だけ settle すべき。pure な数学を、determinism を失わずに正しい cadence で gate するには？

## 原理（最小モデル）

- **pure 関数の上に discrete event loop を載せる。** clock の仕事は「正しいタイミングで数学を呼ぶ／間違ったタイミングでは呼ばない」の 2 つだけ。数学はそのまま、clock は *いつ* を足すだけで *何を* には手を入れない。
- **常に値を返さず \`Option<FundingTick>\` を返す。** \`None\` だけで「state 変化なし」を安価に伝える（\`if let Some(tick) = clock.tick(...)\`）。常に返すと「fire したが position なし」と「そもそも fire してない」が区別できない。
- **レイヤード composition、再実装しない。** \`tick()\` は \`compute_premium → compute_rate → apply_funding\` を順に呼ぶだけ。数学が計算、clock が gate。
- **テレメトリのために中間値を出力に出す。** \`FundingTick\` に \`settlements\` だけでなく \`premium\`/\`rate\` も載せる（observer が再計算せず読める — 再計算は乖離の温床）。
- **契約上シングルスレッド。** 並行性は呼び出し側の責任。\`AtomicU64\` にすると、このレイヤーに存在しない直列化問題に複雑性を足すだけ。

## 具体例

\`tick\` のボディは 3 phase が時間制御 → 純粋計算 → state 更新の順に重なる:

\`\`\`
  1. Guard (時間制御)   if now < last_settled_at + interval_secs → return None
              │ (満たす場合のみ下へ)
  2. Compute (ステートレス)  (mark,index)→compute_premium→Premium
                            (premium,params)→compute_rate→FundingRate
                            (positions,mark,rate)→apply_funding→Vec<Settlement>
              │
  3. State更新+Return  self.last_settled_at = now;  ← deadline をリセット
                       return Some(FundingTick{ settled_at:now, premium, rate, settlements })
\`\`\`

clock が時間を gate し、セクション2 の数学が値を計算し、出力レイヤーが state を進めて返す。決定的に重要なのは clock を **\`now\` に進める**こと（\`last_settled + interval\` でなく）= no-catch-up 不変条件の実装（理由はレッスン10）。

## 失敗例（誤解）

「並行 tick のため \`last_settled_at\` を \`AtomicU64\` に」は誤り — funding crate は契約として single-threaded。並行 tick は \`last_settled_at\` だけでなく \`CLOB_STATE\`/balance store でも race を起こす。正解は呼び出し側で tick を直列化すること。並行性をデータ構造に押し込むと、本来存在すべきでない問題に複雑性を足す。

---

ここまでで「clock は pure 数学を gate する薄いレイヤー」は着地した。ここから 3 つ目で最後のモジュールを作る（不変条件 interval-once / no-catch-up はレッスン9/10 が受け持つ、ここは土台）。コードは完全形。

> 🛑 **予測。** \`tick()\` は \`Option<FundingTick>\` を返す。なぜ常に \`FundingTick\`（settlement なしは空 Vec）を返さない？（答え: \`None\` だけで「state 変化なし」を通知でき呼び出し側が inspect 不要。\`if let Some(tick)\` が自然。常に返すと \`if !tick.settlements.is_empty()\` が要るが、空 settlement は「fire したが position なし」か「そもそも fire してない」か区別できない。\`Option\` がこの二分を型で明示。）

## ステップで組み立てる

### Step 1: clock.rs を作成

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

module doc が 2 不変条件をコードより先に宣言（契約を約束し、下のコードとテストで守る）。imports は必要なものを一通り（boilerplate を早めに安定化）。

### Step 2: FundingClock 構造体

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

2 private フィールド: \`params\`（construction 後 immutable — production が稼働中に funding params を変えない）/ \`last_settled_at\`（唯一の可変 state）。\`Clone, Debug\` のみ derive — \`Copy\` を付けない（気軽に複製できると「どのコピーが advance しているか」を見失う）。

### Step 3: FundingTick

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

4 pub フィールド（出力 struct は plain data なので全 public）。bridge が必要なのは \`settlements\` だけだが \`premium\`/\`rate\` も載せる（telemetry — ないと observer が再計算して乖離リスク）。\`PartialEq, Eq\` はテスト容易性。

### Step 4: impl ブロック

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

\`new\`/accessor は \`const fn\`+\`#[must_use]\`（\`FundingParams: Copy\` なので値で返す）。\`tick\` の guard は \`saturating_add\`（\`last_settled_at\` が \`u64::MAX\` 近くでも overflow 防止）。**\`last_settled_at = now\`**（\`+interval\` でなく）が no-catch-up の実装。timestamp は Unix 秒（\`+3600\` = 1 時間）。

### Step 5: 3 サニティテスト

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

\`Notional\`/\`PositionSize\` import と \`pos\`/\`balanced_book\` helper は今後のテストで使うため安定化。3 つ: guard 動作（interval 前は None・state 不変）/ 境界 inclusive（\`genesis+interval\` ちょうどで fire、math composition も検証）/ 空 positions でも advance（position の有無で gate しない）。

### Step 6: lib.rs を更新（最終形）

\`\`\`rust
pub mod clock;
pub mod compute;
pub mod types;

pub use clock::{FundingClock, FundingTick};
pub use compute::{apply_funding, compute_premium, compute_rate};
pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
\`\`\`

アルファベット順。**これが lib.rs の最終形**（レッスン9/10 で新しいモジュールレベルの名前は追加しない）。

### Step 7: テスト実行

\`cargo test -p openhl-funding\` が 18 pass（compute 15 + clock 3）、**rustdoc warning ゼロ**（\`FundingClock\` リンクが解決）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/clock.rs ./crates/funding/src/clock.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
git checkout main
\`\`\`

clock.rs は \`FundingClock\` + \`FundingTick\` + impl + 7 テスト中 3 つまで一致（残り 4 つはレッスン9/10）。lib.rs は \`cd94137\` と完全一致（最終形）。

## 合格基準

\`cargo test -p openhl-funding\` が 18 pass。よくあるエラー: guard の \`<\` を \`<=\` に（境界がずれる）/ \`self.last_settled_at = now\` 忘れで即再 fire / \`clock.tick(...).expect(...)\` の戻り値をチェーンしたまま \`last_settled_at()\` を呼ぶと borrow checker エラー（\`let out = ...;\` で一度束縛して \`&mut\` 借用を \`;\` で切る）。

## まとめ（3行）

- \`FundingClock\` は pure な数学を正しい cadence で gate する discrete event loop。\`tick()\` は guard → \`compute_premium\`/\`compute_rate\`/\`apply_funding\` の compose → state 更新の 3 phase。
- \`Option<FundingTick>\` を返す（\`None\` = state 変化なしを型で明示）。\`FundingTick\` は telemetry のため \`premium\`/\`rate\` も載せる。single-threaded 契約。
- 成功 tick で \`last_settled_at = now\`（\`+interval\` でなく）= no-catch-up。module doc が 2 不変条件を先に宣言。lib.rs はこれで最終形、warning ゼロ。

## 次のレッスン（レッスン9）

\`clock.rs\` にテスト 3 つを追加し interval-gating 不変条件を深掘り（\`premium_drives_settlement_signs\` の full composition / \`second_tick_requires_another_full_interval\` の持続性 / \`capped_rate_when_premium_extreme\` の cap surfacing）。新規 production コードなし。`,
                },
                {
                  title: "レッスン9 — Interval-gating 不変条件 — 3 つの deeper test",
                  slug: "openhl-funding-interval-invariant-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン9 — Interval-gating 不変条件 — 3 つの deeper test

## 問い

レッスン8 の \`first_tick_at_exact_interval_fires\` は tick を 1 度呼んで \`Some\` を確認した。だがそれは guard が \`Some\` を *返しうる* ことしか示さない。guard が fire した *後にも再び engage する* こと、レイヤーを重ねた composition が値を歪めないことは、どう検証するか？

## 原理（最小モデル）

- **単一呼び出しは挙動を、複数呼び出しは state machine を検証する。** 1 度 fire したきり gate しなくなる buggy 実装を捕まえるには 3 連続呼び出し（fire / gated / fire）が要る。
- **composition テストが接続ミスを捕まえる。** 各ステップが unit-test 済みでも、\`tick()\` が \`apply_funding\` を \`compute_rate\` より先に呼ぶ／\`mark\` を期待する場所に \`index\` を渡す等の接続バグは別の関心事。
- **不変条件は通過する各レイヤーで再検証。** \`compute_rate\` の cap はレッスン6 で unit-test 済みだが、\`tick()\` 経由でも再検証（途中で \`params.rate_cap\` を上書きする接続バグは下層テストをすり抜ける）。
- **境界テストはペアで: just-before と exactly-at。** \`now == last+interval-1\`（None）と \`now == last+interval\`（fire）。\`+1\` を足しても別のバグクラスは捕まらない。
- **失敗は state を変えない。** \`tick()\` が \`None\` のとき \`last_settled_at\` は不変。

## 具体例

3 連続呼び出しを時間軸で並べると、ゲートの再エンゲージが一望できる:

\`\`\`
1_000_000 ── Genesis (last_settled_at = 1_000_000)
   │ +3,600 秒 (= 1 interval)
1_003_600 ── Tick 1: 成功 ✨ ──► last_settled_at = 1_003_600 にリセット
   │ +3,599 秒 (まだ 1 秒足りない)
1_007_199 ── Tick 2: 拒否 🛑 (now < last+interval) ──► last_settled_at = 1_003_600 のまま
   │ さらに +1 秒
1_007_200 ── Tick 3: 成功 ✨ ──► last_settled_at = 1_007_200
\`\`\`

load-bearing なのは **Tick 1 の成功が clock を恒久 unlock しないこと** — Tick 3 を fire させるには Tick 1 起点で新たに 1 interval 待つ。3 つ並べないとこの「ゲートが閉じ直す」挙動は観測できない。

## 失敗例（誤解）

「\`premium_drives_settlement_signs\` は \`apply_funding\` のテストと重複、\`out.rate\` だけ確認すれば十分」は誤り — このテストの要点は *composition*。\`apply_funding\` のテストは pass するのにこれだけ fail するなら、バグは \`tick()\` の呼び出し組み立て方にあって \`apply_funding\` 内でない。3 レイヤー深ければ最低 3 つの composition テストが要る。

---

ここまでで「複数呼び出しで state machine を検証」は着地。ここから新規 production コードなしでテスト 3 つを足す。コードは完全形。

> 🛑 **予測。** レッスン8 の単一 tick 成功では、なぜ interval-gating 不変条件の検証として不十分？（答え: 1 度の成功は guard が \`Some\` を *返しうる* ことしか示さない。buggy 実装は最初の境界で fire してから二度と gate しないかもしれない（\`1_003_600\` 以降の全 tick が時間に関係なく \`Some\`）。「interval ごと最多 1 settlement」の検証には、別の full interval が経つまで second tick が拒否されることの確認が要る。）

## ステップで組み立てる

### Step 1: premium_drives_settlement_signs を追加

\`mod tests\` のレッスン8 テストの後に:

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

clock の full math composition テスト（premium→rate→settlements が順に exercise）。5 行コメントが紙の数学（\`100×101×1_250_000 = 12_625_000_000\`、\`/1e9 = 12\`、符号反転で long \`-12\`/short \`+12\`）。各ステップが unit-test 済みでも composition は別の関心事 — 間違った順序・引数取り違えを捕まえる。

### Step 2: second_tick_requires_another_full_interval を追加

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

tick 3 回・assert 3 つで story を語る。検証する不変条件: 「interval guard は成功 tick ごとに再 engage する」。\`genesis_time\` にだけ比較する素朴な実装だと \`1_003_600\` 以降の全 tick が fire する — それを捕まえる。state machine の持続性確認には 3 回呼び出しが最小構成。

### Step 3: capped_rate_when_premium_extreme を追加

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

\`compute_rate\` の cap が \`tick()\` 経由でも clamp として効くか検証（premium 100% → raw 12.5% → cap 4% に clamp）。\`tick()\` が rate を unwrap/いじる/bypass しないことを示す — 型のリレーが lossless に通り抜けることの証明。\`rate_cap: FundingRate(0)\` のような接続バグはここで壊れる。

### Step 4: テスト実行

\`cargo test -p openhl-funding\` が 21 pass（compute 15 + clock 6）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/clock.rs ./crates/funding/src/clock.rs
git checkout main
\`\`\`

clock.rs は 7 テスト中 6 つまで一致（\`no_catchup_after_long_gap\` のみ残る — レッスン10 のマイルストーン）。

## 合格基準

\`cargo test -p openhl-funding\` が 21 pass。よくあるエラー: \`premium_drives_settlement_signs\` が \`-13\`/\`-11\`（rounding off-by-one — \`*\`/\`saturating_mul\`/\`wrapping_mul\` のどれか確認）/ \`second_tick\` が second で fail（guard が \`last_settled_at\` でなく \`genesis_time\` と比較）/ \`capped_rate\` が \`125_000_000\`（clamp が効いていない）。

## まとめ（3行）

- 単一呼び出しは挙動を、複数呼び出しは state machine を検証 — \`second_tick_requires_another_full_interval\` の 3 連続呼び出し（fire/gated/fire）が「guard が成功 tick ごとに再 engage する」を pin。
- composition テスト（\`premium_drives_settlement_signs\`）が unit テストの拾えない接続ミス（順序・引数取り違え）を捕まえる。3 レイヤー深ければ最低 3 つ要る。
- 不変条件は通過する各レイヤーで再検証（\`capped_rate_when_premium_extreme\` が cap の clock 経由 surfacing を確認）。境界テストは just-before + exactly-at のペアで。

## 次のレッスン（レッスン10）

セクション3 を **no-catch-up 不変条件**で閉じる。\`no_catchup_after_long_gap\`：validator が 10 interval のダウンタイム後に reboot しても、replay でなく **1 度だけ settle して \`now\` に advance**。catch-up がなぜ tick スキップより悪いか（負け側に集中懲罰）を説明する。`,
                },
                {
                  title: "レッスン10 — No-catch-up 不変条件 — 1 テストで設計哲学",
                  slug: "openhl-funding-no-catchup-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン10 — No-catch-up 不変条件 — 1 テストで設計哲学

## 問い

validator が 10 時間ダウンして reboot し、次の \`tick()\` で \`now - last_settled_at\` が 10 interval になっている。素朴には「10 tick を replay して追いつく」と考える。だがそれは公平か？ clock が *遅れた* とき、何が正しい semantics か？

## 原理（最小モデル）

- **No-catch-up は公平性の不変条件。** 10 interval のギャップ後は **1 度だけ settle して \`now\` に advance**。現在のスナップショットで 10 回 replay すると、ギャップ中に position を閉じられなかった負け側に 10 倍の懲罰が集中する。funding の目的は equilibration であって遡及的強制でない。
- **\`now\` へ advance、\`last_settled + interval\` でない。** deadline は実際の settlement 時刻にリセット、見逃した interval を完全に忘れる。これがこのテストで pin する設計判断。
- **同じ \`now\` での second tick は最も厳しいテスト。** 2 呼び出しの間で時間が 1ms も経たず、変わったのは clock の内部 state だけ。遅れた tick で \`last_settled_at\` を更新し忘れる実装を全部捕まえる。
- **catch-up ポリシーは clock の外側に。** 必要な呼び出し側は中間時点のスナップショットで \`tick()\` を繰り返し呼ぶ wrapper を書く。clock は過去 state にアクセスできない。primitive はミニマルに、policy は呼び出し側に。
- **設計哲学は doc・コード・テストの 3 箇所に住む。** module doc が約束し、\`self.last_settled_at = now\` が強制し、\`no_catchup_after_long_gap\` が証明する。

## 具体例

時間が大きく飛んだ直後の Choice A vs B:

\`\`\`
1_003_600 ── 正常 Tick 成功 ──► last_settled_at = 1_003_600
   ░░ 障害! 10 時間チェーン停止。trader は position を閉じられない。mark が乖離し続ける ░░
1_039_600 ── 遅れてきた Tick
       ❌ Choice A (catch-up replay): 現在スナップショットで 10 回連続 settle
            負け側 (longs) に毎時 cap 上限が 10 連発、閉じる手段はなかった → retroactive 強制
       🟢 Choice B (openhl 採用): 現在スナップショットで 1 度だけ settle、見逃した 9 interval はスキップ
            last_settled_at = 1_003_600 ──► 1_039_600 ✨ (1 ステップ)
\`\`\`

Choice B では \`last_settled_at\` の遷移が常に 1 ステップ（10 時間 gap でも 10 秒 gap でも \`tick()\` は 1 回呼ばれ 1 回 advance）= path-independence。これがテスト 1 本で不変条件全体を pin できる理由。

## 失敗例（誤解）

「テストでは \`out.settlements\` のエントリが 1 つか確かめるべき」は誤り — settlement の個数は positions に依存するもので gap に依存しない。\`balanced_book()\` なら gap の長さに関わらず settlement は 2 つ。このテストの仕事は *tick が 1 回* fire することの検証であって、settlement の個数でない。

---

ここまでで「no-catch-up = 1 度 settle して \`now\` に advance」は着地。ここからマイルストーンテスト 1 つを足してセクション3 を閉じる（production コード変更なし）。コードは完全形。

> 🛑 **予測。** 10 時間 gap 後に *現在* スナップショットで 10 tick を replay すると、一番痛い目に遭うのはどの trader？（答え: 負けていた側が 10 倍の打撃。gap 中 mark が index 上に乖離し続けたなら longs が overpay の状態。Choice A は現在 rate で 10 回 replay、全部 longs から charge。基準の負け側はすでにいたのに 10 倍払い、しかも gap 中は position を閉じられなかった（チェーンが止まっていた）。catch-up は動けなかった時間への retroactive な charge。Choice B はスキップして今から fresh に — revenue には悪いが trader にフェア。）

## ステップで組み立てる

### Step 1: マイルストーンテストを追加

\`capped_rate_when_premium_extreme\` の後に:

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

2 パート: **Part 1**（長い gap でも settle は 1 度・\`now\` に advance — \`out.is_some()\` + \`last_settled_at() == way_later\`、見逃した interval を完全に忘れる）/ **Part 2**（同じ \`now\` で再 fire しない — \`again.is_none()\`、可能な限り最も厳しいテスト：時間が経たず変わるのは state だけ。\`last_settled_at == way_later\` なら guard \`way_later < way_later + 3600\` が true で正しく \`None\`）。

### Step 2: テスト実行

\`cargo test -p openhl-funding\` が **22 pass**（手書き 20 + proptest 2）。セクション3 が閉じ、\`crates/funding/\` が \`cd94137\` に一致。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
git checkout main
\`\`\`

\`crates/funding/\` 全体が \`cd94137\` と一致、diff は空。**セクション3 完了。**

## 合格基準

\`cargo test -p openhl-funding\` が 22 pass。よくあるエラー: Part 1 \`out.is_none()\`（guard の比較方向間違い）/ Part 1 \`last_settled_at() != way_later\`（\`self.last_settled_at = now\` でなく \`+= interval\` の catch-up 版 typo）/ Part 2 \`again.is_some()\`（Part 1 の tick で \`last_settled_at\` 未更新）。

## まとめ（3行）

- 長い gap でも settle は 1 度・advance 先は \`now\`（\`+interval\` でない）= no-catch-up。replay は負け側に集中懲罰を、position を閉じる機会も与えず課す。funding は equilibration であって遡及強制でない。
- 同じ \`now\` での second tick が最も厳しいテスト（時間が経たず変わるのは state だけ）— 遅れた tick で \`last_settled_at\` 更新忘れを全部捕まえる。
- catch-up ポリシーは clock の外（中間時点スナップショットで繰り返し \`tick()\`）。primitive はミニマル、policy は呼び出し側。22 tests で \`crates/funding/\` が \`cd94137\` に一致。

## 次のレッスン（レッスン11）

capstone。新規コードなし。pipeline をスケッチし、先送りした 5 項目（oracle / balance 更新 / liquidation / multi-market / funding-as-EVM-event）を名指し、それぞれが将来どこに置かれるかをたどる。`,
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
                  title: "レッスン11 — Capstone — 築いたもの、先送りしたもの、次にくるもの",
                  slug: "openhl-funding-capstone-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 40,
                  content: `# レッスン11 — Capstone — 築いたもの、先送りしたもの、次にくるもの

## 問い

Funding pipeline を記憶からホワイトボードに描けるか？ v0 で *意図的に* 先送りした項目を名指し、なぜ \`crates/funding/\` の守備範囲外かを説明できるか？ **このレッスンにコードはなし** — メンタルモデルだけだ。

## 原理（最小モデル）

pipeline は 1 本の決定論的な変換: \`(mark, index)\` → premium → rate → settlements、それを clock が「十分な時間が経過したか？」で gate する。crate は **pure な state machine**（I/O ゼロ、外部依存は \`openhl-clob\` の \`AccountId\` のみ）で、すべて \`RATE_SCALE = 1e9\` の符号付き固定小数点整数で計算し、overflow は saturate する。

## 具体例

\`\`\`
   MarkPrice ──┐
   IndexPrice ─┴─► compute_premium ─► Premium
                                        │
   FundingParams ─────────► compute_rate ─► FundingRate (±rate_cap に clamp)
                                        │
   &[Position] ──────────► apply_funding ─► Vec<Settlement> { account, delta: Notional }
                                                              → bridge → balance 更新 (将来)

   ╔══ FundingClock::tick ══════════════════════════════════╗
   ║  guard: now ≥ last_settled_at + interval_secs?          ║
   ║    no → None /  yes → 上の pipeline 実行、now に advance    ║
   ╚════════════════════════════════════════════════════════╝
\`\`\`

この \`Vec<Settlement>\` レーンは Step 2（CLOB）の \`Vec<Fill>\` と同じく、まだ EVM 本流（\`BlockExecutor\`）の外側を並走している — 直交レーンとして先に独立実装し、統合点を後で合わせるのが openhl の一貫した設計規律。

## 失敗例（誤解）

「funding crate に oracle / balance 更新 / liquidation も入れれば self-contained で便利」は誤り — それぞれが独自の関心事（oracle は staleness/aggregation、balance は storage、liquidation は別 cadence の state machine）を持ち込み、pure な state machine を汚す。これらは bridge レイヤー（将来）が \`tick()\` に接続する。crate は計算するだけ、永続化も I/O もしない。

## 各モジュールが届けたもの

- **Determinism + 型（レッスン1〜3）** — 固定小数点の語彙: \`RATE_SCALE = 1e9\`、9 newtype（\`MarkPrice\`/\`IndexPrice\`/\`Premium\`/\`FundingRate\`/\`Notional\`/\`PositionSize\`/\`Position\`/\`Settlement\`/\`FundingParams\`）、\`hyperliquid_default()\`（3600s / ±4% / divisor 8）。**学び**: newtype が引数順バグをコンパイル時に防ぐ、符号規約は型の定義 doc に。
- **純粋な compute（レッスン4〜7）** — stateless な数学: \`compute_premium\`（i128 中間値・saturate）/ \`compute_rate\`（割ってから clamp・defensive \`.abs()\`）/ \`apply_funding\`（単項マイナスで longs-pay-shorts・flat フィルタ）/ \`saturate_i128_to_i64\`。15 テスト（手書き 13 + proptest 2）。**学び**: panic/wrap/saturate のうち saturate だけが consensus-safe。
- **Clock state machine（レッスン8〜10）** — discrete event loop: \`FundingClock\`/\`FundingTick\`/\`tick()\`、7 テスト（guard / 境界 / interval 持続 / no-catch-up）。**学び**: composition テストが接続ミスを捕まえる、state machine は multi-call テストが要る、設計哲学は doc/コード/テストの 3 箇所に。

## 正直に先送り（意図的な scope cut）

5 項目、どれも実プロダクションギャップ:

1. **Oracle 統合** — \`compute_premium\` は \`mark\`/\`index\` を入力に取るだけ。価格を *取得* する方法（CLOB mid / Pyth / Chainlink、staleness チェック、aggregation）はなし。bridge レイヤーが \`tick()\` 直前に読む。
2. **Balance 更新** — \`tick()\` は \`Vec<Settlement>\` を返すだけ。delta を balance に *適用* するのは bridge（funding crate は storage-free）。
3. **Liquidation**（= Step 5） — settlement は balance を負まで押しうるが、吸収可否チェックや処理はなし。独自の不変条件（insurance fund / ADL / mark トリガー）と別 cadence（funding は時間単位、liquidation はブロック単位）を持つ別 crate。
4. **Multi-market funding** — 単一マーケットの \`FundingClock\` 1 つ。複数マーケットは bridge の \`HashMap<MarketId, FundingClock>\` で管理（crate は 1 マーケットに正しければ十分）。
5. **EVM event としての funding** — コントラクトが funding tick を *観測* する手段なし。非 EVM コードから event を emit する plumbing は bridge の関心事。

## 次に来るもの

複雑度順に 4 つ:

1. **Oracle adapter（2-3 日）** — \`crates/oracle/\`、複数ソースを staleness チェック付きで aggregate し \`current_index_price() -> Option<IndexPrice>\` を公開。難しいのは threshold 決め。
2. **Bridge 側の funding tick（1 週間）** — \`FundingClock\` を \`LiveRethEvmBridge\` に組み込む。mark を CLOB から、index を oracle から、position をストアから読み \`tick()\`、settlement を balance に適用。ほとんど plumbing、funding crate は自己完結のまま。
3. **Liquidation エンジン（3-4 週間）** — \`crates/liquidation/\`、funding-tick 後の balance を監視し under-margined を insurance fund / ADL waterfall で処理。独立した 1 コース規模。
4. **Multi-market manager（1 週間）** — \`crates/markets/\`、\`HashMap<MarketId, FundingClock>\` でマーケットごとに dispatch。価値はマーケットごとの isolation。

## このコースの位置（L1 Architect トラック）

- **コース1〜5**（Reth internals）: pipeline / payload / NodeBuilder / evm crate / RPC。
- **Step 1（Consensus）/ Step 2（CLOB）**: Malachite 統合 → マッチングエンジン。
- **Step 3（Precompiles）**: カスタム precompile 経由の EVM ↔ CLOB ブリッジ。
- **Step 4（Funding、本コース）**: funding state machine。**pure な state、I/O なし — Step 3 の bridge plumbing と対をなす位置づけ。**
- **Step 5（Liquidation）**: funding / oracle / liquidation を \`LiveRethEvmBridge\` に組み込み、動作する perp DEX として組み上がる。

ここで内面化したパターンは perp funding を超えて一般化する: consensus システムの固定小数点演算（実数 \`x\` をスケール \`S\` で \`X = x·S\` にし、積は wider 型で受けて最後に \`S\` で割り戻す — fee なら \`S=10_000\`、vesting なら \`S=86_400\`）/ saturation（consensus-safe な唯一の overflow 戦略）/ 意味的区別のための newtype / レイヤー化コードの composition テスト / 設計哲学を doc・コード・テスト・散文に分散。

## 最終答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
\`\`\`

コース完走後、\`crates/funding/\` ディレクトリ全体が openhl の \`cd94137\` HEAD と byte-identical に一致する。

main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## まとめ（3行）

- pipeline は \`(mark,index)\` → premium → rate → settlements の決定論的変換を \`FundingClock\` が interval で gate するだけ。pure な state machine（I/O ゼロ、外部依存は \`AccountId\` のみ）。
- 3 モジュールの成果: 固定小数点の語彙 → stateless な数学（saturate）→ no-catch-up な clock。22 tests（手書き 20 + proptest 2）が \`cd94137\` に一致。
- 5 つの先送り（oracle / balance 更新 / liquidation / multi-market / funding-as-EVM-event）はすべて bridge レイヤーまたは別 crate の関心事 — drop-in 可能な、Hyperliquid 型の perp funding crate が手元にある。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
