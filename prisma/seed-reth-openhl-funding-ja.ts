// AUTO-GENERATED from drafts/openhl_funding_*_ja.md by .github/scripts/build-openhl-funding-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlFundingJA(prisma: PrismaClient) {
  const tags = ["reth","evm","funding","perpetual","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-funding-ja",
      title: "Step 4. Funding：決定論的数学パイプラインと Funding ステートマシンの構築",
      description:
        "Perpetual DEX の命脈である funding メカニズムのステートマシンをスクラッチで実装する。固定小数点演算による、再現可能で deterministic な数学パイプライン (premium → rate → settlement) を構築。これを no-catch-up セマンティクスを厳格に強制する interval clock によって制御する。本コースでは外部 I/O を一切排除した Pure state machine として完結させ、ブリッジへの統合は次章へと繋ぐ。「DIY Perp シリーズ」の第4ステップ。数理ロジックをコードに落とし込む真髄を学ぶ。",
      difficulty: "EXPERT",
      duration: 355,
      xpReward: 730,
      track: "diy-perp",
      tags,
      isPublished: true,
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

前コース（\`building-openhl-precompiles\`）ではカスタム EVM precompile を Reth に plug-in し、スマートコントラクトから live CLOB を read/write できるようにした。このコースで作るのは openhl の次のプリミティブ — 永久先物の **funding 支払いを駆動する state machine** だ。

コース終了時に出荷するもの：

- 新しい \`openhl-funding\` crate に **3 ソースファイル / 約 635 行のコード (LOC: Lines of Code)**。
- **22 テストが通る**：手書き 20 + proptest 2（premium antisymmetry と balanced-book zero-sum）。
- **3 つの building block**：固定小数点の types モジュール、純粋な compute モジュール（premium / rate / settlement）、tick gating を担う clock state machine。
- **clock の不変条件 2 つを強制**：interval ごとに settlement は最多 1 回、長時間ギャップ後の catch-up なし。

理解するもの：

- 浮動小数点演算が consensus システムでチェーン分岐を招く理由。
- Hyperliquid funding-rate の形：divisor + cap 付きで premium → rate → settlement。
- \`RATE_SCALE = 1_000_000_000\`（parts-per-billion）でスケールした固定小数点整数を使えば、consensus リスクなしに 9 桁の精度が得られる仕組み。
- 純粋な state machine + 飽和演算 (saturating arithmetic — オーバーフロー時にパニックさせず最大値/最小値に張り付かせる挙動、Rust では \`saturating_add\` / \`saturating_mul\`) が consensus 中核の数学に対して正しい形である理由。
- clock が（\`last_settled + interval\` でなく）\`now\` まで進む理由 — そしてそこに焼き込まれた設計トレードオフ。

## なぜ funding が重要か（perp 1 段落）

永久先物には期限がない。では mark price はどうやって spot/index price にアンカーされるのか。答えが funding 支払いだ。Mark > index のとき（つまり longs が spot 比で overpay しているとき）、longs が shorts に固定サイクルで支払う — 典型的には interval ごと（HL では 1 時間）。Mark < index のときは shorts が longs に支払う。

funding rate の組み立てを段階で見ると:

\`\`\`
1. Premium    = (mark - index) / index               ← この段階ではまだ「比率」(無次元の生値)
2. Rate       = Premium / divisor                    ← divisor = 8 (HL の場合)
3. Capped     = clamp(Rate, -4%/interval, +4%/interval)   ← ネットワーク設定の絶対上限
4. Settlement = size × mark × Capped                 ← 各 tick で非ゼロ position が決済する quote 額
\`\`\`

ここで導入する Premium \`(mark - index) / index\` は**生の比率 (raw ratio)** にすぎず、本コースが \`f64\` でこれを実装することは一切ない。レッスン1で \`RATE_SCALE = 1_000_000_000\` (parts-per-billion) でスケールされた符号付き整数表現に橋渡しされ、以降の Premium / Rate / Capped / Settlement のすべての計算は固定小数点整数の上で deterministic に行われる。Premium の符号によって longs が支払うのか shorts が受け取るのかが決まる。

## なぜ funding に float を使えないのか

Consensus レッスン1 では、各 validator が他の validator と*完全に同じ* funding rate を計算しなければならない。2 つの validator が rate の最下位ビット (LSB: Least Significant Bit) 1 つでも食い違えば、チェーンは fork する。

浮動小数点演算は以下の軸で異なるビットパターンを生む：
- **コンパイラ** — LLVM が FMA（fused multiply-add）を、ある CPU では emit し別の CPU では split に分解することがある。
- **CPU** — 丸めモードが異なる、denormal の扱いも異なる。
- **演算順** — \`(a * b) + c\` と \`a * b + c\` は同じに見える IR にコンパイルされても、最適化後の LSB が異なることがある。

Funding rate で 1 LSB の不一致が生じたときのコストは**チェーン fork** だ。Fork の別側にいる validator が異なる delta を決済し、balance が乖離し、次のブロックがどちらのチェーンに対しても検証されない。

対処は単純で、float は一切使わない。すべての計算を \`RATE_SCALE = 1_000_000_000\`（parts-per-billion）でスケールした符号付き整数で行う。\`0.04\`（4%）は \`40_000_000\`、\`0.001\`（0.1%）は \`1_000_000\`。乗算では overflow 回避のため \`i128\` 中間値が要る、除算はその後だ。

これは Solana の compute budget、Ethereum の EVM、その他あらゆる consensus システムが課す制約と同じ話だ。**Determinism がすべてを決める。**

## 12 レッスン

### セクション0 — Orientation
- **L0**（このレッスン）— なぜ funding、なぜ固定小数点、なぜ state machine。

### セクション1 — Determinism + 型 (レッスン1〜3)
- **レッスン1** — \`RATE_SCALE = 1e9\`：固定小数点方式、なぜ整数か、9 桁の精度で何が手に入るか。
- **レッスン2** — 金額型：\`MarkPrice\` / \`IndexPrice\` / \`Premium\` / \`Notional\`。それぞれが単なる \`i64\` でなく newtype である理由。
- **レッスン3** — Position 型：\`PositionSize\` / \`Position\` / \`Settlement\` / \`FundingParams\`。HL デフォルトと各パラメータが encode する内容。

### セクション2 — 純粋な compute (レッスン4〜7)
- **レッスン4** — \`compute_premium\`：\`(mark - index) / index\` の導出。符号対称性のテスト。
- **レッスン5** — \`saturate_i128_to_i64\` と overflow 哲学。なぜ saturate するのか、なぜ panic でないのか。
- **レッスン6** — \`compute_rate\`：divisor、cap、HL スタイルのデフォルト、clamp 挙動。
- **レッスン7** — \`apply_funding\`：longs-pay-shorts の符号規約。Balanced-book zero-sum 不変条件。

### セクション3 — Clock state machine (レッスン8〜10)
- **レッスン8** — \`FundingClock\` 構造体と \`tick()\` インターフェース。
- **レッスン9** — Interval gating 不変条件：interval ごとに settlement は最多 1 回。境界でのテスト。
- **レッスン10** — No-catch-up 不変条件：10-interval のギャップでも settle は 1 回、10 回ではない。その理由。

### セクション4 — Capstone (レッスン11)
- **レッスン11** — 統合。Bridge integration のプレビュー（funding が \`LiveRethEvmBridge\` のどこに plug-in されるか）。正直に先送りする項目：oracle、liquidation、basis-vs-fixed funding。

## モジュールごとの SHA pinning

各レッスンには build 対象となる openhl commit を引用する。このコースでは 12 レッスンすべてが **Funding参照実装コミット \`cd94137\`** を引用する — funding 実装が 1 コミットにまとまっているためだ（Precompiles コースが複数コミットにまたがるのとは対照的）。綺麗な SHA マッピングのおかげで、レッスン11 終了時点の answer-key diff は \`crates/funding/\` 配下で \`cd94137\` に一致する。

| Module | Lessons | SHA |
|---|---|---|
| 0 | L0 | \`cd94137\` |
| 1 | レッスン1〜3 | \`cd94137\` |
| 2 | レッスン4〜7 | \`cd94137\` |
| 3 | レッスン8〜10 | \`cd94137\` |
| 4 | レッスン11 | \`cd94137\` |

## 前提

このコースから最大限を引き出すには：

- **Step 1（Consensus）と Step 2（CLOB）** をコンセプト背景として頭に入れていること — funding state machine は \`AccountId\` (Step 2 (CLOB)) を受け取り、Step 1（Consensus）と Step 2（CLOB） で構築した bridge に接続される。**Step 3（Precompiles） はスキップしても本コースは追える** — funding は純粋な state-machine 数学であり、EVM 側の接続作業ではないからだ。
- **Rust の i128 演算に慣れていること** — overflow 回避のための \`as i128\` upcast を 1 回以上経験していればよい。
- **永久先物 funding メカニクスに最低限の馴染みがあること**。Perp 取引経験がなくても、上の 1 段落のおさらいで十分。Hyperliquid で perp を取引した経験があれば準備完了。
- **EVM 固有の知識は不要**。このコースは precompile、コントラクト、RPC に触れない。

不要なもの：
- 動作中の openhl ノード（funding crate は I/O ゼロ）。
- Solana やその他L1チェーンの経験。
- 定量金融のバックグラウンド — ここでの数学は素直な固定小数点演算に過ぎない。

## セットアップ

\`\`\`bash
# openhl workspace root で：
cd ~/code/my-openhl
git checkout main
cargo build --workspace  # baseline — レッスン1 前に通るべき
\`\`\`

リファレンスチェックアウト（各レッスン末尾の answer-key diff 用）：

\`\`\`bash
cd ~/code/openhl-reference  # 作業ツリーと別チェックアウト
git checkout cd94137
\`\`\`

（同じ workspace で lookup の間に \`git stash\` でも動く。）

## コーススタイル

各レッスンは Step 1（Consensus）〜 Step 3（Precompiles） で確立した build-along フォーマットに従う：
- **ゴール** — 終了時点で何が通り、何ができあがるか。
- **おさらい** — 前レッスンの終了地点。
- **プラン** — 具体的な編集を番号付きで列挙。
- **考えてみよう** callout（🛑 + 「スクロール前に...」）— 答えの前に問いを出すことで答えが定着する。
- **やりがちな勘違い** callout（🛑 + よくある誤解を名指し）— 「ただ〜できないの？」という反射を先回り。
- **手順** — コード編集をステップごとに、変更ごとの説明付きで。
- **テスト** — \`cargo test\` コマンドと期待出力。
- **設計の振り返り** — このレッスンのコードに焼き込まれた load-bearing な決定を 3〜5 個。
- **答え合わせ** — openhl リファレンス SHA との \`git diff\`。
- **よくある質問** — 3〜5 個の質問と、根拠のある回答。

数学的なコンテンツ（特に セクション2〜3）は Step 3（Precompiles） に比べてコンセプト重心、コード重心が薄い。**公式が出てくる箇所ではペースを落とす**つもりで進めてほしい — 短いコードでも、考えうるあらゆる入力で正しい値を計算する必要がある。**Perp funding のバグはクラッシュしない。静かに wealth を移してしまう。**

## 準備完了

それでは レッスン1 へ。レッスン1 では \`RATE_SCALE\` 定数と、その後のすべてが乗る固定小数点方式を設定する。`,
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

このレッスンで掴む概念:

- **Float が consensus で動かない理由** — FMA、丸めモード、denormal の扱いはコンパイラと CPU ごとに振る舞いが異なり、rate の LSB 1 bit のズレがそのまま chain fork に直結する。
- **\`RATE_SCALE = 1e9\` が i64 のスイートスポットである理由** — parts-per-billion なら 9 桁の精度を保ちながら、積の中間値でも i64 まで 11 桁のヘッドルームが残る。\`1e6\` では精度不足、\`1e12\` ではヘッドルーム不足。
- **Crate scaffold の出発点** — 空の \`lib.rs\` を \`pub mod\` 宣言 1 つと re-export 1 つで「実 crate」へ変える手順。そして \`pub mod\` 宣言は対応するファイルを作るタイミングで足す、という原則。
- **「一度決めたら変えない」定数の置き方** — \`RATE_SCALE\` は consensus state であって調整パラメータではない。Doc コメントを置く場所と、デプロイ後を immutable として扱う理由。

検証：

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

上記の実行結果がコンパイルを通る。

具体的な変更:

- **Cargo.toml** に \`openhl-clob\` 依存を追加（後で \`AccountId\` が必要になるが、今入れておけば レッスン3 で驚かずに済む）。加えて \`[dev-dependencies]\` ブロックで \`proptest\` を準備（レッスン4 / レッスン7 で使う）。
- **\`src/types.rs\`** — 新規作成。module doc と \`pub const RATE_SCALE: i64 = 1_000_000_000\` のみ。
- **\`src/lib.rs\`** — 空だったところに \`pub mod types;\` と、クレートルートでの \`RATE_SCALE\` re-export を追加。

これだけだ。**定数 1 つ、しかも crate 全体で最も重要な定数。** 残り 10 レッスンの rate も premium も settlement も、すべて \`RATE_SCALE\` を基準に表現される。ここを正しく設定すれば残りの数学は素直に進む。間違えれば validator が fork する。

レッスン1 にテストはない — \`RATE_SCALE\` は値であって挙動ではないからだ。レッスン2 で最初の money type に最初のテストが付く。

## おさらい

レッスン0後の状態：
- Funding 支払いがなぜ存在するか理解した（mark/index ドリフトの補正）。
- Float がなぜ consensus fork ハザードになるか理解した。
- Funding crate の scaffold（Cargo.toml と空の \`src/lib.rs\`）は Funding参照実装コミット 以前から workspace に存在していた。

レッスン1 では、空だったこの crate を「public な値を 1 つ持つ実 crate」へと変える。

## プラン

編集は 3 つ：

1. **\`crates/funding/Cargo.toml\`** — \`[dependencies]\` に \`openhl-clob = { path = "../clob" }\` を追加し、\`proptest\` 入りの新規 \`[dev-dependencies]\` ブロックを追加。
2. **\`crates/funding/src/types.rs\` を作成** — determinism の理由を説明する module doc と \`RATE_SCALE\` 定数。
3. **\`crates/funding/src/lib.rs\`** — 空だったので、crate doc、\`pub mod types;\`、\`pub use types::RATE_SCALE;\` の re-export を追加。

以上。コンパイル、グリーン、次へ。

> 🛑 **考えてみよう。** スクロール前に — \`RATE_SCALE\` は \`1_000_000_000\` = \`1e9\` = parts-per-billion だ。なぜ \`1_000_000\`（parts-per-million、6 桁）でも、\`1_000_000_000_000\`（parts-per-trillion、12 桁）でもないのか。ヒント：表現すべき rate の範囲と、i64 にどれだけの値が収まるかを考えよ。

（答え：**i64 max は ~9.2e18。** \`RATE_SCALE = 1e9\` のとき、raw 値 \`1e18\` は \`1e9\`（10 億）を表す。Funding rate に 10 億のレンジは要らない — 典型的には interval ごとに \`0.0001\` から \`0.04\` 程度だ。**\`RATE_SCALE = 1e9\` なら 9 桁の精度に加えて巨大なヘッドルームが手に入る**：\`40_000_000\`（\`0.04\`、HL のキャップ）は \`i64::MAX\` から 11 桁下にある。\`1e12\`（parts-per-trillion）にすれば精度は上がるがヘッドルームを失う — \`1e12\` スケールの値 2 つの積を扱うには \`i256\` が必要になる。一方 \`1e6\` では実質的なヘッドルームの節約にならない上、funding rate が \`0.0001%\` = \`10\` ppb のときに意味のある精度を失う。**\`1e9\` こそが i64 での固定小数点 rate のスイートスポットだ。**）

この「ヘッドルーム」を桁の物差しに並べると、なぜ \`1e9\` が安全圏なのかが一目で見える:

\`\`\`
桁                                     値                                     何が住んでいるか
─────────────────────────────────────────────────────────────────────────────
1e18  ────────  9_223_372_036_854_775_807  ───────  i64::MAX (約 920 京)
1e18                                                ↑ 中間値の天井
                                                    │
1e15  ────────  1_600_000_000_000_000     ───────  4% × 4% (キャップ²) = 1.6e15
                                                    │  ← i128 中間で楽勝に吸収
                                                    │
1e9   ────────  1_000_000_000             ───────  RATE_SCALE = 100% (10 億)
                                                    │
1e7   ────────       40_000_000           ───────  HL Funding Cap 4% (4 千万)
                                                    │
1e6   ────────        1_000_000           ───────  0.1%
                                                    │
1e1   ────────               10           ───────  0.0001% = 10 ppb (現実的な最小粒度)
\`\`\`

ポイントは 3 つ:
1. **キャップ値 (\`4e7\`) と RATE_SCALE (\`1e9\`) の間にはまだ 1 桁以上**ある — \`0.04\` 程度の rate を \`40_000_000\` として表現してもまだ余裕。
2. **キャップ²でも \`1.6e15\`** — i64 の天井 (\`9.2e18\`) まで 3 桁以上残っている。つまり「rate × rate」「rate × notional」程度の積は \`i128\` にアップキャストすれば余裕で吸収でき、最後に \`RATE_SCALE\` で割れば安全に \`i64\` に戻せる。セクション2 で \`compute_premium\` / \`apply_funding\` の中身を書くときに、まさにこの 3 桁分のマージンを食って計算する。
3. **最小粒度 (\`10\` ppb = \`0.0001%\`) を表現できる** — \`1e6\` (parts-per-million) ではこの値が「\`0\`」に丸まって精度ゼロになる。\`1e9\` は funding rate のリアルな下限と上限の両方を 1 つの整数空間に閉じ込めるサイズだ。

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

変更は 2 点：

1. **\`openhl-clob = { path = "../clob" }\`** を \`[dependencies]\` に追加する。Funding crate は \`openhl-clob\` の \`AccountId\` を必要とする（レッスン3 の \`Position\` で登場）。今ここで dep を入れておけば、レッスン3 での diff が集中する。**コストはほぼゼロ** — path dep を宣言しただけでは、最初の \`use\` が現れるまで recompile は走らない。
2. **\`[dev-dependencies]\` ブロック**に \`proptest\` を追加する。レッスン4（premium antisymmetry test）と レッスン7（balanced-book zero-sum）で使う。同じ理屈で「今宣言、後で使う」とする。Production build には proptest は含まれない。

> 🛑 **やりがちな勘違い。** 「テストでしか使わないなら \`openhl-clob\` も dev-dependency でよくない？」 **テストだけではない — production コードが \`Position\` で \`openhl_clob::AccountId\` を使う。** もし \`AccountId\` がテスト専用なら dev-dep でよかった。だが production の型シグネチャの一部なので、通常の dep にする必要がある。Dev-deps は「テストが pull するが production は一切触らない」ものに限定するべきだ。

### Step 2: \`src/types.rs\` を作成

\`crates/funding/src/types.rs\` を作成する。このファイルはまだ存在しない — このレッスンで新規に作る。初期内容は以下：

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

この 15 行のファイルで注目すべきは 4 点：

1. **Module doc に「Why fixed-point integers, not floats」セクションを置いている。** これが crate 全体の load-bearing な理由付けだ。6 ヶ月後に \`types.rs\` を読む次のエンジニアにとって、この説明はファイル最上部にあるべきもの — コミットメッセージの中に埋もれていてはいけない。なお module doc 末尾の "**callers can pass snapshots without lifetime gymnastics**" の意図はこうだ: 「**snapshot** = ある時点の値そのものを value で持ち回らせる (参照ではなく \`Copy\`)、**lifetime gymnastics** = \`&'a T\` が連鎖して関数シグネチャに \`'a\`/\`'b\` が増殖していく Rust 特有の煩雑さ」。次のレッスン以降に出てくる money type 群 (\`MarkPrice\` / \`Premium\` 等) を全部 \`Copy\` な newtype で作るのは、この「呼び出し側が値のコピーを自由に渡せて、ライフタイムの曲芸をしなくて済む」設計判断を一貫させるためだ。
2. **\`[\`FundingRate\`]\` と \`[\`Premium\`]\` へのクロス参照。** これらの型はまだ存在しない（レッスン2 / レッスン3 で追加する）。レッスン1 のビルド中、rustdoc はリンク切れ warning を出す。**warning は受け入れる** — レッスン2/レッスン3 で型を追加すれば解決する。Warning をゼロにしたければ \`[\`FundingRate\`]\` でなく \`[FundingRate]\`（バックティックなし）と書いてもよいが、クロス参照スタイルがソースの慣習だ。
3. **\`pub const RATE_SCALE: i64 = 1_000_000_000\`** — \`u64\` でなく \`i64\` を使う。Rate と premium は*符号付き*だからだ（longs 支払い = 正の premium、shorts 支払い = 負）。符号付き整数を使えば \`compute.rs\` の演算で符号チェックは不要になり、\`i128\` 中間値が積を自然に吸収してくれる。
4. **Doc が \`1.0\` = \`100%\` と明記している。** これは会計単位の決定だ。\`RATE_SCALE\` の生値（1e9）は interval ごとに 100% の funding rate を意味する。\`40_000_000\` は 4%、\`1_000_000\` は 0.1%。**「1 単位 notional に対する parts-per-billion」として読めばよい。**

> 🛑 **やりがちな勘違い。** 「\`f64\` を使って、validator 間で共有する前に結果を丸めればよくない？」 **だめだ、理由は 2 つある。** (1) 中間計算は最終の丸めより先に発散する。その時点で被害は出ている。(2) 「N 桁に丸める」自体が float 演算で、丸め挙動が処理系ごとに異なる。**Float の非決定性からの脱出口として、整数より単純なものはない。**

### Step 3: \`src/lib.rs\` を更新

\`crates/funding/src/lib.rs\` を開く。現状は空（\`e69de29\` blob）だ。以下に置き換える：

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

レッスン11 終了時点の版と比べて欠けているもの：\`pub mod clock\`、\`pub mod compute\`、そして残りの \`pub use types::{...}\` re-export。これらは レッスン4-レッスン10 でモジュールを追加するたびに足していく。**レッスン1 の lib.rs はコンパイルが通る最小限の形だ。**

クレートレベル doc（\`//! ...\`）が伝えるのは：
- これは純粋な state machine であり、I/O は持たない。
- 1 段落の HL funding おさらい — 文脈なしに crate root にたどり着いた読者向け。
- 統合がどこで起きるか（ここではなく bridge 側）。

クロス参照 \`[\`FundingClock\`]\` は レッスン8 で追加するまでリンク切れのままだ。types.rs のクロス参照と同じ扱いでよい。

> 🛑 **考えてみよう。** ここに \`pub mod compute;\` と書いたのに \`compute.rs\` を作らなかったらどうなるか。ヒント：\`pub mod foo;\` が実際に何をするかを考えよ。

（答え：**コンパイルエラーになる。** \`pub mod compute;\` はコンパイラに「同じディレクトリの \`compute.rs\` または \`compute/mod.rs\` を探せ」と告げる宣言だ。どちらもなければ \`error[E0583]: file not found for module 'compute'\` が出る。だから \`pub mod\` 宣言は*該当ファイルを作るタイミングで*追加する — 一度にまとめて追加するのではなく。）

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

rustdoc の warning が 3 つ（unresolved link）出る。これは期待通り — リンク先の型は レッスン2/レッスン3（types.rs）と レッスン8（clock.rs）で順次追加される。**レッスン11 までに 3 つすべて解決する。** \`#[allow(rustdoc::broken_intra_doc_links)]\` で抑制してはいけない — 「まだ X を足す必要がある」というインジケータとして有用だからだ。

よくあるエラー：

- **\`error[E0463]: can't find crate for 'openhl_clob'\`** — Cargo.toml の \`openhl-clob = { path = "../clob" }\` 行を忘れた場合。レッスン1 のコード自体は \`openhl_clob\` を使わないが、レッスン3 を先取りして \`use openhl_clob::AccountId\` を dep なしで types.rs に入れるとこのエラーが出る。
- **\`error[E0583]: file not found for module 'clock'\`** や \`'compute'\` — \`pub mod clock;\` を先取りして lib.rs に追加した場合。削除して、レッスン8 で改めて戻せばよい。
- **\`error: failed to parse manifest\`** — Cargo.toml の syntax エラー。\`[dev-dependencies]\` ブロックを \`[dev-dependences]\` と typo していないか確認すること。

## 設計の振り返り

このレッスンに焼き込んだ決定は 3 つ：

1. **\`RATE_SCALE = 1e9\` は u64 ではなく i64 にした。** Rate が符号付きだから符号付きにしている。\`compute.rs\` の演算は \`i128\` 中間値で積を吸収する。\`u64\` にしても何の利点もなく、符号処理を複雑にするだけだ。

2. **Module doc コメントは理由付けであって、チュートリアルではない。** 「Why fixed-point integers, not floats」の段落で、この設計が*なぜ*存在するのかを説明している。6 ヶ月後に \`types.rs\` にたどり着いた読者に必要なのは*なぜ*の部分だ — *どう*はコード自体に書いてある。**Doc コメントは、将来の読者が問うであろう質問を先回りしたときに初めて価値を生む。**

3. **\`pub use types::RATE_SCALE\` をクレートルートに置く。** 呼び出し側は \`use openhl_funding::types::RATE_SCALE;\` ではなく \`use openhl_funding::RATE_SCALE;\` と書ける。短いパスが canonical、モジュールパスは内部用だ。**呼び出し側が実際に使うものは、すべてクレートルートで re-export する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/Cargo.toml ./crates/funding/Cargo.toml
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

レッスン1 後の状態：
- **Cargo.toml** が Funding参照実装コミット と完全一致する。
- **types.rs** が Funding参照実装コミット の types.rs の*最初の ~30 行*と一致する — module doc と \`RATE_SCALE\` まで。それ以降の型定義は レッスン2/レッスン3 で追加する。
- **lib.rs** は Funding参照実装コミット の lib.rs より短い — \`pub mod types;\` と \`pub use\` 1 つだけ。他のモジュール宣言と re-export は後のレッスンで追加する。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: レッスン1 にテストがないのに \`[dev-dependencies] proptest\` を今宣言するのはなぜ？**
Cargo.toml の diff を 1 箇所に集中させたいからだ。レッスン4 で proptest を追加すると Cargo.toml を 2 回触る。レッスン1 でまとめて済ませれば、このレッスン以降このファイルは変わらない。**Cargo.toml の安定性は、小さな unused dep 宣言を抱える価値がある。**

**Q: 「parts-per-billion」解釈は実際どう読むのか？**
Funding rate の生値 \`1_250_000\` は \`0.00125\`（interval ごとに 0.125%）を意味する。つまり「1,000,000,000 分の 1,250,000」 = 0.125% だ。HL の 1 日 8 回 settlement と 4% cap のもとでは、実際に見る値の範囲は \`±40_000_000\` raw = \`±4%/interval\` = 最悪ケースで \`±32%/day\`。**すべて i64 で余裕を持って表現できる。**

**Q: 後から \`RATE_SCALE\` を変えて、consumer を壊さずに済むか？**
**無理だ。** \`RATE_SCALE\` はチェーンの consensus 定数だ。永続化済みのすべての balance、過去すべての settlement、すべてのテストフィクスチャが \`RATE_SCALE = 1e9\` を前提に calibrate されている。変更には coordinated な network upgrade が必要になる。**デプロイ後は immutable として扱うべきだ。** だからこそクレート開始時に一度だけ、\`const\` として設定する。

**Q: \`RATE_SCALE\` のテストがないのはなぜ？**
何を assert すればいい？ \`assert_eq!(RATE_SCALE, 1_000_000_000)\` は同義反復にすぎない — 定数を自分自身と比較しているだけだ。定数の意味は*他の*コードでの使われ方を通じて生きる。**最初の意味あるテストは、レッスン2 で最初の money type に付く。**

## 次のレッスン（レッスン2）

レッスン2 では「money type」を 4 つ追加する — \`MarkPrice\`、\`IndexPrice\`、\`Premium\`、\`Notional\`。それぞれプリミティブをラップする newtype だ。教育の焦点は「なぜ固定小数点か」から「なぜ newtype か」へとシフトする：偶発的なクロスフィードを防ぐためだ（例：\`MarkPrice\` を期待している箇所に \`IndexPrice\` を渡してしまうケース）。この 4 型が \`types.rs\` に ~30 行を追加し、残りの型（レッスン3）が踏襲する newtype パターンの実例となる。`,
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

このレッスンで掴む概念:

- **Newtype による引数順バグの防止** — \`u64\` を \`MarkPrice\` と \`IndexPrice\` という別の型でラップすれば、\`compute_premium(index, mark)\` は production まで届く invisible bug ではなくコンパイルエラーになる。
- **型エイリアスは「型」ではない** — \`type MarkPrice = u64\` はドキュメントであって安全性ではない。引数を入れ替えてもコンパイルは通ってしまう。別のアイデンティティが欲しいなら \`struct MarkPrice(pub u64)\` を選ぶ。
- **内部フィールドを \`pub\` にする理由** — このレッスンの newtype はクロスフィード防止が目的で、値の検証が目的ではない。\`pub\` にしておけば \`compute.rs\` の演算は \`mark.0\` のままで書ける（\`mark.value()\` 経由にならない）。検証はこの crate の仕事ではない。
- **符号の有無はドメインの意味で決める** — \`MarkPrice\` / \`IndexPrice\` が \`u64\` なのは「負の価格 = 上流の不変条件違反」だからで、\`Premium\` / \`Notional\` が \`i64\` なのは方向そのものがデータの一部だからだ。
- **符号規約は型定義の doc コメントに pin する** — \`Premium\` の定義に「正 = mark > index、longs が shorts に支払う」と書いておけば、下流のすべての consumer にとってそこが single point of truth になる。

検証：

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

上記の実行結果が引き続きコンパイルを通る。

具体的な変更:

\`types.rs\` は \`RATE_SCALE\` だけだった状態から、\`RATE_SCALE\` + 4 つの newtype を持つ状態へと育つ：

- **\`MarkPrice(pub u64)\`** — 永久先物の mark price を最小単位で持つ。価格は負になりえないので unsigned。
- **\`IndexPrice(pub u64)\`** — オフチェーン oracle の参照価格。形は同じだが*意味*は別。
- **\`Premium(pub i64)\`** — 符号付き \`(mark - index) / index\` を \`RATE_SCALE\` スケールで持つ。Longs が overpay のとき正。
- **\`Notional(pub i64)\`** — 符号付き quote-currency delta。正 = アカウントの受取、負 = 支払い。

それぞれに \`Copy + Default + PartialEq + Eq + PartialOrd + Ord + Hash + Debug\` を付ける。テストはまだない — ラッパー以上の挙動を持たないからだ。**レッスン4 の \`compute_premium\` が、これらの型がバグを含みうるコードで exercise される最初のレッスンになる。**

このレッスンの教育上の要点は数学ではない — **newtype パターン**だ。なぜ \`u64\` を直接使わずにラップするのか。レッスン2 ではその答えを、4 つの具体的な型で実演する。

## おさらい

レッスン1 後の状態：
- \`RATE_SCALE = 1_000_000_000\` が load-bearing な定数として置かれている。
- \`types.rs\` には module doc と \`RATE_SCALE\` がある。
- \`lib.rs\` がクレートルートで \`RATE_SCALE\` を re-export している。

レッスン2 では \`types.rs\` を、実際の型の前半（「money」側の半分）で埋めていく。後半（position、settlement、params）は レッスン3 で埋める。

## プラン

編集は 2 つ：

1. **\`crates/funding/src/types.rs\`** — \`RATE_SCALE\` の後ろに 4 つの newtype を追加する。Doc コメントで各型の役割と encode する不変条件を説明する。
2. **\`crates/funding/src/lib.rs\`** — \`pub use types::{...}\` 行を、新しい 4 型も re-export するよう拡張する。

これだけ。\`compute.rs\` も \`clock.rs\` もテストもない。**純粋な型定義のみだ。**

> 🛑 **考えてみよう。** スクロール前に — これから \`pub struct MarkPrice(pub u64);\` を定義する。内部フィールドを \`pub\` にしている理由は何か。private にして \`#[must_use] pub fn new(v: u64) -> Self\` コンストラクタを置いたらどうなるか。ヒント：\`compute.rs\` の呼び出し側が何を必要とするかを考えよ。

（答え：**\`compute.rs\` の呼び出し側が生値で演算する必要があるからだ** — \`i128::from(mark.0) - i128::from(index.0)\` のように。フィールドを private にして \`.value()\` getter を置くと、どこでも \`mark.0\` の代わりに \`mark.value()\` を書く羽目になる。**\`pub\` な内部フィールドは、クロスフィード防止のためだけに存在する newtype に対する openhl の慣習だ** — 検証なし、型システム以上の不変条件なし。\`clob::Price(pub u64)\` や \`clob::Qty(pub u64)\` と比べてみてほしい — 同じ形、同じ理由だ。**Newtype の仕事は \`compute_premium(index, mark)\` を型エラーにすることであって、値を検証することではない。**）

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

4 つの型、それぞれ ~5 行。1 つずつ、何が焼き込まれているかを見ていく：

#### \`MarkPrice(pub u64)\` — 符号付き価格を採らない立場

なぜ \`i64\` ではなく \`u64\` なのか。Funding の数学において*負の価格*は意味を持たないからだ。Spot や perp の価格がゼロを下回るのは、funding crate に到達してはならないシステム不変条件違反だ — もし到達したら、正しい対応は「上流レイヤーが壊れている、停止して調査」であって、「負の価格に対して funding を計算する」ではない。

Doc にもこれを明記してある：*「zero or negative price would be a system invariant violation handled upstream, not here」*。ここに線を引くのが正しい。**Funding crate は入力が well-formed であることを信頼し、再検証はしない。** どこでも再検証するのは典型的な over-engineering だ。Funding crate の仕事は数学であって、入力のサニタイズではない。

> 🛑 **やりがちな勘違い。** 「せめて \`MarkPrice(0)\` ではエラーを返すべきでは？」 **不要だ。** \`MarkPrice(0)\` は「本当にゼロの spot price を持つアセット」（極端な tail、稀だが現実にはある）か、「oracle がまだ価格を配信していない」（boot state）かのどちらかでありうる。後者は \`compute_premium\` が明示的に扱う（\`index == 0\` のときは \`Premium(0)\` を返す）。前者は十分稀で、正しい挙動は zero funding を settle することだ — それは \`compute_premium\` が自然に生む結果でもある。**エラーパスは要らない。**

#### \`IndexPrice(pub u64)\` — 同じ形、別の*意味*

\`IndexPrice\` は構造的には \`MarkPrice\` と同一だ。同じフィールド、同じ derive、同じ範囲。**違いは純粋に型システム上のものでしかない。** 関数シグネチャ \`compute_premium(mark: MarkPrice, index: IndexPrice) -> Premium\` は、\`compute_premium(IndexPrice(100), MarkPrice(100))\` をコンパイル時に拒否する。Newtype なしだと両引数とも \`u64\` で、引数順のバグが静かに反転した premium を生んでしまう。

\`u64\` (raw) と newtype で起きる挙動の差を並べると違いが鮮明になる:

\`\`\`rust
// 🔴 raw u64 の場合 — 「signature 上は両方 u64」
fn compute_premium(mark: u64, index: u64) -> i64 { /* ... */ }

let mark  = 100_u64;
let index = 105_u64;

compute_premium(mark, index);   // ✨ 意図通り (mark, index)
compute_premium(index, mark);   // 🔴 引数を取り違えても COMPILE OK
                                //    Premium の符号が反転して production まで届く
                                //    → 全 long が受け取るべきタイミングで支払う

// 🟢 newtype の場合 — 「型システムが意図を覚えている」
fn compute_premium(mark: MarkPrice, index: IndexPrice) -> Premium { /* ... */ }

let mark  = MarkPrice(100);
let index = IndexPrice(105);

compute_premium(mark, index);   // ✨ OK
compute_premium(index, mark);   // ❌ COMPILE ERROR:
                                //    expected \`MarkPrice\`, found \`IndexPrice\`
                                //    ↑ Rust が手元で即座に拒否する
\`\`\`

差は「実行時の挙動」ではなく「ビルドが通るかどうか」。\`u64\` 版は production に届くまで気付けないバグを、newtype はキーボードを叩いている数秒のうちに見つけてしまう。**これこそが newtype パターンの存在意義そのものだ。** 型あたり ~5 行のコストで、*production に出るまで見えなかったはずのバグクラス*を防げる。

> 🛑 **やりがちな勘違い。** 「型エイリアスでよくない？ \`type MarkPrice = u64; type IndexPrice = u64;\`」 **だめだ — 型エイリアスは新しい型を作らない**、既存の型をリネームするだけだ。\`type MarkPrice = u64\` と \`type IndexPrice = u64\` はどちらも \`u64\` のままで、\`compute_premium(some_index, some_mark)\` は静かにコンパイルが通る。**型エイリアスは documentation のためのものであって、安全性のためのものではない。** 可読性が落ちる長いジェネリック型（\`type FillSink = Arc<Mutex<Vec<Fill>>>\` など）に使うもので、意味的に異なる値を区別するためのものではない。

#### \`Premium(pub i64)\` — なぜ符号付きか

Mark < index のとき premium は負になりうる（shorts が overpay している状態）。符号付き表現にしておけば、残りの数学を明示的な符号処理なしで流せる：\`compute_premium\` が符号付きの値を返し、\`compute_rate\` がそれを割って clamp し、\`apply_funding\` が settlement に掛ける。**どの段階でも「これはどっち向きか？」をチェックする必要はない** — 符号が答えを運んでくれる。

Doc にはこう書いてある：*「Sign convention: positive when mark > index (longs are overpaying, funding will be positive → longs pay shorts)」*。これは load-bearing な一文だ。下流のコードを読む人は、この規約を覚えておく必要がある。**符号規約を明示する doc コメントが、「正しい数学」と「毎回導出し直す必要のある数学」を分ける。**

#### \`Notional(pub i64)\` — *アカウント*視点で符号付きの quote-currency delta

\`Notional\` は、ある settlement における単一アカウントの quote balance の変化量を表す。符号規約は*正 = アカウントの受取、負 = アカウントの支払い*。だから正の funding rate のもとでは、long position は \`Notional(負)\` を、short position は \`Notional(正)\` を生む。

**符号はアカウント視点**であって、市場視点ではない。これは bridge integration レイヤー（Step 5 (Liquidation)）で効いてくる — \`Notional(-12)\` がそのまま「このアカウントの quote balance から 12 を引く」になる。市場中心の符号にしていたら、bridge が適用前に符号を反転させる必要が出てくる。

(Premium の符号) × (ポジションの向き) → どちらのアカウントが Notional のどの符号を持つかの対応を表で見ると:

\`\`\`
┌─────────────────────────────┬───────────────────┬───────────────────┐
│ 市場の状態                  │ Long ポジション   │ Short ポジション  │
├─────────────────────────────┼───────────────────┼───────────────────┤
│ Mark > Index                │ Notional(負)      │ Notional(正)      │
│ (Premium が正、              │ → 支払う          │ → 受け取る        │
│  longs が overpay 中)        │                   │                   │
├─────────────────────────────┼───────────────────┼───────────────────┤
│ Mark < Index                │ Notional(正)      │ Notional(負)      │
│ (Premium が負、              │ → 受け取る        │ → 支払う          │
│  shorts が overpay 中)       │                   │                   │
└─────────────────────────────┴───────────────────┴───────────────────┘
\`\`\`

読み方は単純: **\`Notional\` の符号 = 「そのアカウントの quote balance に足すべき差分」**。market の方向ではなく、bridge がそのまま \`balance += notional.0\` で適用できる視点で符号を決めている。レッスン7 の \`apply_funding\` が、まさにこの表の 4 つのセルを 4 行のコードで実装する。

### Step 2: \`lib.rs\` re-export を更新

\`crates/funding/src/lib.rs\` を開く。現在の \`pub use\` 行：

\`\`\`rust
pub use types::RATE_SCALE;
\`\`\`

これに変更：

\`\`\`rust
pub use types::{IndexPrice, MarkPrice, Notional, Premium, RATE_SCALE};
\`\`\`

import はアルファベット順にする — Funding参照実装コミット の lib.rs に揃える形だ。これで呼び出し側は：

\`\`\`rust
use openhl_funding::{MarkPrice, IndexPrice};
\`\`\`

と書ける。次のように書く必要はない：

\`\`\`rust
use openhl_funding::types::{MarkPrice, IndexPrice};
\`\`\`

**呼び出し側が実際に使うものは、すべてクレートルートで re-export する。** モジュールパスは内部用だ。

> 🛑 **やりがちな勘違い。** 「\`pub use types::*\` で全部まとめて re-export すれば？」 **可能だが、内部型のリストがそのまま public API の surface に漏れる。** 今 \`types.rs\` には 4 型しかない。将来 \`internal_FillSinkCachedView\` のような private helper を追加して \`pub\` を付け忘れた瞬間、\`pub use types::*\` が静かにそれを公開してしまう。**Explicit な re-export は public API のチェックリストでもある。** re-export する名前 1 つ 1 つが意図的な決定になる。

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

Rustdoc warning は 2 つに減る（レッスン1 では 3 つだった）。\`RATE_SCALE\` の doc にある \`[Premium]\` リンクが解決し、\`[FundingRate]\` と \`[FundingClock]\` のリンクはまだ未解決のままだ。**進捗としては期待通り** — レッスン3 で \`FundingRate\` を追加すれば 2 つ目の warning も消える。

よくあるエラー：

- **\`error[E0381]: missing field 'value' in initializer of MarkPrice\`** — 内部フィールドに \`pub\` を付け忘れた、もしくは \`MarkPrice(pub u64)\` ではなく \`MarkPrice { value: u64 }\` と書いた場合。openhl の慣習通り tuple-struct 形式を使うこと。
- **\`error[E0277]: 'i64' is not 'u64'\`** — \`Premium(pub i64)\` ではなく \`Premium(pub u64)\` と書いてしまった場合。Premium は符号付き、内部型を確認すること。
- **derive が足りない** — derive のどれかを書き忘れた場合。完全な集合は \`Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash\`。\`Default\` は レッスン4 の fixture builder の一部が \`MarkPrice::default()\` を使うために必要だ。

## 設計の振り返り

このレッスンに焼き込んだ決定は 3 つ：

1. **生プリミティブや型エイリアスではなく newtype パターンを採る。** 型あたり ~5 行のコストで、見えない引数順バグをコンパイル時に防げる。**高コストなバグクラスに対する安価な保険だ。**

2. **内部フィールドを公開する（\`pub u64\`）。** 検証はこの crate の仕事ではなく、クロスフィード防止が仕事だからだ。内部フィールドを \`pub\` にしてあるのは、\`compute.rs\` での演算を ergonomic に保つためだ。**Newtype が守るのは型の取り違えからであって、値の不正からではない。**

3. **符号規約は型定義の doc コメントに置く。** 「Mark > index で正、longs が shorts に支払う」 — \`Premium\` の doc にあるこの一文が、符号規約の単一情報源だ。すべての consumer がここに依存する。**符号規約は数値型の中で最も記憶違いが起きやすい部分 — 定義場所の doc に pin しておく。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

レッスン2 後の状態：
- **types.rs** が Funding参照実装コミット の \`Notional\` までと一致する（最初の 4 newtype）。次の型 — \`FundingRate\`、\`PositionSize\`、\`Position\`、\`Settlement\`、\`FundingParams\` — は レッスン3 で追加する。
- **lib.rs** には 4 型の re-export が入る。Funding参照実装コミット の完全な re-export はあと 5 つの名前を追加することになる（\`FundingParams\`、\`FundingRate\` は新規、\`Notional\` は既にある、\`Position\`、\`PositionSize\`、\`Settlement\` も新規）。すべて レッスン3 で追加する。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`MarkPrice\` / \`IndexPrice\` は \`u64\` で、\`Premium\` / \`Notional\` は \`i64\` なのか？**
価格は常に正だからだ（負の価格はシステム不変条件違反になる）。**一方で premium と notional は負になりうる。** Mark < index のとき premium は負になり、アカウントが（受け取るのでなく）支払うとき notional delta は負になる。符号付き整数は両方向を自然に表現できる。符号なしだと、別途「方向」フィールドや型のペアが必要になってしまう。

**Q: これらの型に \`Default\` を付ける理由は？ デフォルト値がいつ役に立つのか？**
\`Default::default()\` は \`MarkPrice(0)\` や \`Premium(0)\` などを返す。テストの fixture で便利だ：\`let mark: MarkPrice = Default::default();\` は \`MarkPrice(0)\` より短く書ける。これらの型を内部に持つ struct で \`#[derive(Default)]\` も可能になる。**安価な derive で、挙動上のコストはない。**

**Q: \`Hash\` / \`Ord\` / \`PartialOrd\` まで全部 derive している理由は？**
将来これらの型がコレクションのキーやソートキーとして登場する場面を、あらかじめ解禁しておくためだ。レッスン3 で導入する \`Position { account, size }\` や、レッスン7 で \`apply_funding\` が返す settlements の Vec — どこかで \`HashMap<AccountId, MarkPrice>\` (snapshot 用) や \`BTreeMap<Premium, Vec<Settlement>>\` (bucket 用) や \`settlements.sort_by_key(|s| s.delta)\` (test の決定的ソート用) が登場した瞬間に必要になる trait をすべて先に貼っておくと、後から追加する手間がゼロになる。**プリミティブをラップする newtype の trait derive は副作用がない (内部の \`i64\`/\`u64\` の振る舞いを継承するだけ) ので、\`Copy + Default + PartialEq + Eq + PartialOrd + Ord + Hash + Debug\` の 1 行を全 newtype に貼っておくのが慣習だ。** 後から \`#[derive(Hash)]\` を追加するために型定義を 1 個ずつ書き換える未来を、いま 1 行で買っている。

**Q: \`Premium\` と \`Notional\` に \`Add\` / \`Sub\` / \`Mul\` を実装すべきでは？**
誘惑的ではある — \`Premium(5) + Premium(3) == Premium(8)\` は綺麗だ。だが Funding参照実装コミット では実装しないことを選んだ：\`compute.rs\` の数学演算は overflow 対策で \`i128\` への upcast を要求する。\`Premium\` に \`Add\` を実装すると、呼び出し側が i128 ダンスなしで使ってしまう誘惑が生まれてしまう。**この crate の API 契約は「内部フィールドを取り出して明示的に i128 へ upcast してから演算する」だ。** 型に演算オペレータがないほうが、その契約を強制しやすい。

**Q: なぜこれらの型のテストがないのか？**
何を assert すればいい？ \`assert_eq!(MarkPrice(100), MarkPrice(100))\` は \`PartialEq\`（derive）のテストにしかならない。\`assert_eq!(MarkPrice(100).0, 100)\` は pub フィールド（言語機能そのもの）のテストにしかならない。**プリミティブをラップしただけの newtype には、テスト可能な挙動が存在しない。** レッスン4 の \`compute_premium\` から、これらの型がバグを含みうるコードに登場し始める。

## 次のレッスン（レッスン3）

レッスン3 では型 roster を完成させる：\`FundingRate(i64)\`、\`PositionSize(i64)\`、\`Position { account, size }\`、\`Settlement { account, delta }\`、\`FundingParams { interval_secs, rate_cap, divisor }\`。教育の焦点は「newtype パターン」から「パラメータオブジェクトパターン」（\`FundingParams\`）と **HL スタイルのデフォルト** — 1 日 8 settlement の理由、4% cap の理由 — へとシフトする。\`Position\` 構造体は、レッスン1 の Cargo.toml で設定した \`openhl_clob\` の \`AccountId\` 依存を実際に使い始める箇所でもある。`,
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

このレッスンで掴む概念:

- **同じ形、別の役割 = 別の型** — \`FundingRate\` も \`Premium\` もどちらも \`RATE_SCALE\` スケールの \`i64\` だが、premium は「生の dislocation」、rate は「divisor + clamp を通した後の出力」だ。別の型にしておけば pipeline を型レベルで強制できる — \`compute_rate\` を通っていない premium を \`apply_funding\` に渡せない。
- **方向 + 大きさを 1 つの符号付き整数で表す** — \`PositionSize(i64)\` で long / short / flat を 1 フィールドにまとめ、enum + magnitude のペアにはしない。サイズも小さく、演算も速く、形もシンプルになる。符号規約は doc コメントに残す。
- **スナップショット型 vs stateful なエンティティ** — \`Position\` は \`(account, size)\` だけを持ち、entry price も PnL も履歴も意図的に持たない。広い state を抱えるのは **owning layer (= position の所有・更新を担う上位レイヤー、典型的には vault や clearing layer)** の仕事で、funding crate は狭いスナップショットを処理するだけだ。doc コメントが ownership 契約を明示する。以降このレッスンでは「owning layer」をその意味で一貫して使う。
- **Parameter-object パターン** — \`interval_secs\` / \`rate_cap\` / \`divisor\` を \`FundingParams\` にまとめておけば、config が拡張されても呼び出し箇所は安定する。positional 引数だと新パラメータが増えるたびに全呼び出し箇所が壊れる。struct ならフィールドを足すだけでシグネチャは変わらない。
- **Hyperliquid デフォルトの算術を解きほぐす** — \`divisor: 8\` は「tick ごとに premium / 8」を意味する。1 時間 interval × 24 回 / 日と 4% cap のもとで、最悪日次支払いを縛るのは divisor ではなく cap だ。Cap は oracle dislocation に対する保険ポリシーとして効く。

検証：

\`\`\`bash
cargo build -p openhl-funding
\`\`\`

上記の実行結果が引き続きコンパイルを通り、rustdoc warning もゼロになる。

具体的な変更:

\`types.rs\` が**完成**する — Funding参照実装コミット の roster 9 型すべてが揃う：

- **\`FundingRate(pub i64)\`** — divisor と cap を適用した後の per-interval rate。\`Premium\` と同じスケール。
- **\`PositionSize(pub i64)\`** — 符号付き：正 = long、負 = short、ゼロ = flat。
- **\`Position { account, size }\`** — アカウントごとのスナップショット。ここで \`openhl_clob::AccountId\` 依存が初めて発火する。
- **\`Settlement { account, delta }\`** — \`apply_funding\` の出力：誰がいくら支払うか / 受け取るか。
- **\`FundingParams { interval_secs, rate_cap, divisor }\`** と \`hyperliquid_default()\` — Hyperliquid 型のデフォルトを伴うネットワークレベル設定。

これで **セクション1** が閉じる。レッスン3 後の状態：
- すべての型が定義済み、挙動はまだない。
- Rustdoc のクロス参照が解決済み（「unresolved link」warning なし）。
- Crate は純粋な data-types ライブラリ — ドキュメントとしては有用だが、まだ数学は何もしない。

**セクション2 (レッスン4〜7) では純粋な compute を始める** — \`compute_premium\`、\`compute_rate\`、\`apply_funding\`。最初のテストもそこで登場する。

このレッスンの教育的な要点は、**parameter-object パターン**と HL デフォルトの根拠だ。なぜ 3 つのパラメータを \`FundingParams\` 構造体にまとめるのか、なぜ positional 引数で渡さないのか。そしてなぜ 1 時間間隔、なぜ 4% cap、なぜ divisor 8 なのか。

## おさらい

レッスン2 後の状態：
- 4 つの money newtype（\`MarkPrice\`、\`IndexPrice\`、\`Premium\`、\`Notional\`）が定義済み。
- \`types.rs\` には module doc、\`RATE_SCALE\`、4 型が入っている。
- \`lib.rs\` が 5 つの名前を re-export している（定数 + 4 型）。
- rustdoc warning が 2 つ残っている（\`FundingRate\`、\`FundingClock\`）。

レッスン3 では 5 型を追加して型 roster を閉じ、\`openhl_clob::AccountId\` の import も入れる。

## プラン

編集は 3 つ：

1. **\`crates/funding/src/types.rs\`** — 先頭に \`openhl_clob::AccountId\` の import を追加し、5 つの型定義（\`FundingRate\`、\`PositionSize\`、\`Position\`、\`Settlement\`、\`FundingParams\` と \`hyperliquid_default\`）を追加する。
2. **\`crates/funding/src/lib.rs\`** — re-export を 9 つの名前すべてを含むよう拡張する。
3. **検証**：\`cargo build -p openhl-funding\` が **warning ゼロ**でコンパイルを通る。

> 🛑 **考えてみよう。** スクロール前に — これから \`FundingParams { interval_secs: u64, rate_cap: FundingRate, divisor: u32 }\` を定義する。\`compute_rate(premium, interval_secs, rate_cap, divisor)\` ではない。**なぜこの 3 値を struct にまとめるのか？** ヒント：\`compute_rate\` の呼び出し箇所がいくつあるか、そして後から 4 つ目のパラメータを追加したらどうなるかを考えよ。

（答え：**Parameter-object パターンが、config の進化をまたいで呼び出し箇所の安定性を保つからだ。** \`compute_rate(premium, params)\` は positional 引数 1 つ + struct 1 つの形になる。後から \`min_settlement_threshold\` を funding config に追加するときも、関数シグネチャは \`compute_rate(premium, params)\` のままだ — 成長するのは \`FundingParams\` 構造体だけ。一方 positional 版の \`compute_rate(premium, interval, cap, divisor)\` だと、新しいパラメータを追加するたびにすべての呼び出し箇所が壊れる。呼び出し箇所が 5 未満（clock とテスト）なら今のコストは控えめだが、成熟したコードベースで 50 を超えるようになると parameter object は必須だ。**安定したグループ値はまとめてバンドルする — そのグループ自体がドメイン概念のときに**。「funding 設定」はまさにそういう概念の一つだ。）

## 手順

### Step 1: \`AccountId\` import を追加

\`crates/funding/src/types.rs\` の先頭、module doc の後、\`pub const RATE_SCALE\` の前に：

\`\`\`rust
use openhl_clob::AccountId;
\`\`\`

この import は レッスン1 で Cargo.toml に dep（\`openhl-clob = { path = "../clob" }\`）を設定した時点で準備済みだ。\`Position\` と \`Settlement\` が \`AccountId\` を struct のフィールド型として参照するので、ここで初めて使われる。

> 🛑 **やりがちな勘違い。** 「呼び出し側が \`openhl-clob\` から import せずに済むよう、\`openhl-funding\` から \`AccountId\` を re-export すべきでは？」 **だめだ — \`AccountId\` は我々の型ではない。** \`AccountId\` は \`openhl-clob\` 側の型なので、呼び出し側は定義元から import すべきだ。\`openhl-funding\` 経由で re-export してしまうと、同じ型に対して 2 つの import path（\`openhl_clob::AccountId\` と \`openhl_funding::AccountId\`）ができてしまい、依存関係が不透明になる。**自前の型は re-export する、依存先の型は呼び出し側に直接 import させる。**

### Step 2: \`Premium\` の後ろに \`FundingRate\` を append

既存の \`Premium\` 定義の後ろに：

\`\`\`rust
/// Per-interval funding rate. Same scale as [\`Premium\`]; positive means
/// longs pay shorts. A rate of \`RATE_SCALE / 100\` = 1% per interval.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct FundingRate(pub i64);
\`\`\`

\`FundingRate\` は構造的には \`Premium\` と同一だ — 同じ \`i64\`、同じ derive。**型エイリアスではなく別の型にしているのは、funding pipeline 上で異なる概念を表すからだ。** Premium は*生*の mark/index dislocation、rate は divisor と clamp を適用した後に position へ*適用される*もの。Premium を消費するコード（\`compute_rate\`）は rate（post-processed なもの）を受け取るべきではないし、rate を消費するコード（\`apply_funding\`）は premium（まだ clamp されていないもの）を受け取るべきではない。

**同じ形、違う役割、別の型。** newtype パターンが \`MarkPrice\` と \`IndexPrice\` でやっているのと、まったく同じ話だ。

### Step 3: \`PositionSize\` を append

\`FundingRate\` の後ろに：

\`\`\`rust
/// Signed position size in base units. Positive = long, negative = short,
/// zero = flat. Accounts with zero size aren't included in settlement
/// snapshots — see [\`Position\`].
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct PositionSize(pub i64);
\`\`\`

符号付き整数 1 つで 3 状態を運ぶ：long（\`> 0\`）、short（\`< 0\`）、flat（\`== 0\`）。2 フィールド表現と比べてみよう：

\`\`\`rust
// 採用しない冗長な代替案：
pub struct PositionSize {
    pub direction: Direction,  // Long, Short, Flat
    pub magnitude: u64,
}
\`\`\`

符号付き整数表現のほうが**小さく**（8 バイト対 ~16 バイト以上）、**速く**（hot path で enum dispatch が要らない）、**数学レイヤーが単純**になる（\`size.0\` を乗算に使うだけで符号が自然に伝播する）。トレードオフは、内部値の符号が implicit になることだ。それは doc コメントで明示する：*「正 = long、負 = short、ゼロ = flat」*。

**「Accounts with zero size aren't included in settlement snapshots」のノートは load-bearing だ。** \`apply_funding\` はゼロサイズの position をフィルタする — 経済的エクスポージャがないので、settle してもゼロ delta が出力にノイズを増やすだけだ。このフィルタは レッスン7 で実物を見る。

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

フィールドは 2 つ、両方とも public。\`account\` のおかげで settlement 出力がどの balance を credit / debit すべきかが分かる。\`size\` のおかげで rate を適用する数学が delta を計算できる。

**重要なのは、\`entry_price\` も \`realized_pnl\` も \`unrealized_pnl\` も持たないこと。** Funding state machine は position がどう open されたか、PnL がどうなっているかを知る必要がない — *現在のサイズ*に*現在の rate* を掛けるだけだからだ。**スナップショットがシンプルなほど、上流でスナップショットを作るのも楽になる。**

> 🛑 **やりがちな勘違い。** 「先物の損益計算のため \`Position\` も entry price を持つべきでは？」 **だめだ — それは owning layer の仕事だ。** Vault や clearing layer が entry price を追跡し、unrealized PnL を計算する。Funding crate はその下流にいる：*現在*の position のスナップショットを受け取って、*現在*の funding を適用する。**スナップショット型は narrow に保てばよい。owning layer が全部を含む wider な型を持っていればそれでいい。**

Doc コメントで ownership 境界も明示している：*「never owns or mutates them. The owning layer is responsible...」* — これが funding crate と呼び出し側の契約だ。

\`Position\` に \`Default\` は付けない — \`AccountId::default()\` は \`AccountId(0)\` になるが、これは多くのアカウントシステムで reserved / sentinel として使われる。**entity の identity を担う struct には、偶発的なデフォルト構築を許してはいけない。**

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

\`Settlement\` は \`apply_funding\` の出力型で、非 flat な position 1 つにつき 1 つ生成する。アカウント ID（bridge が誰の分かを知るため）と delta（bridge がいくらかを知るため）を運ぶ。

**\`Settlement\` が position の順序インデックスではなく \`account\` を再度持つのはなぜか？** \`apply_funding\` がゼロサイズの position をフィルタするため、入力 position リストと出力 settlement リストでは*長さが異なる*からだ。位置インデックスを使うと、どの position が非ゼロだったかを呼び出し側が覚えておかねばならなくなる。出力にアカウント ID を持たせれば、その依存を切り離せる。

**これは parallel-array と struct-array のトレードオフ**で、Funding参照実装コミット では struct-array を選んだ。コストは settlement あたり冗長な \`AccountId\` が 1 つ増えること、メリットは呼び出し側がインデックスの対応関係を管理せずに済むことだ。

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

フィールドは 3 つ、すべて \`pub\` — newtype と同じ理由だ（\`compute_rate\` がすべて直接必要とする）。

#### 各 HL デフォルトの理由

- **\`interval_secs: 3600\`** — 1 時間。HL は毎時 settle、Binance Futures は 8 時間ごとだ。1 時間という cadence は、basis が dislocate したときにトレーダーが funding 圧力をすばやく感じ取れる程度に短く、block time noise に支配されない程度に長い。
- **\`rate_cap: FundingRate(40_000_000)\`** — 4%/interval。1 日 24 interval なので最悪 \`±96%/day\`、ただし下にある divisor の効果で実効最悪値はずっと低くなる。Cap は oracle 異常への*保険*として効く：index を一時的に 50% 動かせる攻撃者でも、1 tick で longs から 50% を抜くことはできない。
- **\`divisor: 8\`** — 1 日 8 settlement（HL の spec）、ただし **24** 個の 1 時間 interval にまたがって適用される。Doc コメントの算術に load-bearing な含意がある：\`(premium / 8) × 24 hours = 3 × premium/day\`。**HL の cap は divisor 単体から導かれる値より厳しい** — divisor が cadence を、cap が最悪ケースの支払いを bind する。

ここで「**divisor = 8**」と「**24 回/日 適用**」のアシンメトリーがどうして焼き込まれているのか、計算で並べると見える:

\`\`\`
              セマンティクス上の意図           実際の挙動
              ─────────────────────           ───────────────
divisor = 8 = 「1 日を 8 分割」                でも settle/適用は毎時 (24 回/日)
                ↓                                ↓
仮にこの 2 つが揃っていれば                    実際の per-day 累積:
  premium / 8 × 8 = premium                    premium / 8 × 24 = 3 × premium
  → 1 日分の premium がそのまま支払われる         → 「狙った daily 量」より 3 倍出る

そこで cap (4%/interval) が登場する:
  普通の市場では post-divisor の per-interval rate は ≪ 4% なので cap に当たらず、
  実効 daily ≒ 3 × premium で済む。
  異常時 (oracle outage 等) でも 毎時 4% で clamp されるので、
  最悪 daily = 4% × 24 = 96%/day で必ず止まる。
\`\`\`

つまり HL は「**divisor で typical daily を 3 × premium に持ち上げ、cap で worst daily を 96% に切る**」という非対称な 2 段構えを採っている。Divisor 単体（= 1 日 8 回 settlement）から素直に出る値より、cap のほうが*より厳しい*絶対上限を提供する設計だ。

> 🛑 **考えてみよう。** HL デフォルトでの実効最悪日次支払いはいくらか。ヒント：\`rate_cap = 4%/hour\`、1 日の interval = 24、ただし divisor は 8 だ。

（答え：**毎 interval が cap に当たる場合 \`±96%/day\` になる。** 4%/*interval* の cap は divisor に依らず適用される。Divisor が影響するのは clamp の*前*の per-interval rate だけだ。だから premium が大きすぎて post-divisor rate が 4% を超えるときは毎時 4% に clamp され、24 回 × 4% = 1 日 96% となる。実際には、4%/interval で持続的に clamp し続けるほどの premium は pathological だ — HL の歴史でも oracle outage の最中にしか観測されていない。**Cap は保険コストの floor を定めるもので、典型的な funding 規模を示すものではない。**）

#### \`hyperliquid_default\` に \`const fn\` を使う理由

\`const fn\` にしておけば、コンパイル時定数が欲しい場面で \`static DEFAULT: FundingParams = FundingParams::hyperliquid_default();\` と書ける。コストはゼロ（引数なしの定数コンストラクタ）、メリットは選択肢を残せること。

#### \`#[must_use]\` を付ける理由

\`#[must_use]\` を付けておけば、呼び出し側が \`hyperliquid_default()\` を呼んで結果を捨てたときに warning が出る。**そもそも値を生むこと自体が目的の関数で、結果を捨てるのは常にバグだ** — この warning が「代入し忘れ」クラスのミスを捕まえてくれる。

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

アルファベット順を維持する。合計 10 名前（9 型と \`RATE_SCALE\`）。呼び出し側は \`use openhl_funding::{FundingParams, Position};\` のように、\`types\` モジュールを経由せずに書ける。

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

**Rustdoc warning は 1 つに減る**（レッスン0で 3、レッスン1 でも 3、レッスン2 で 2、レッスン3 で 1）。残る未解決リンクは \`FundingClock\` だけだ — レッスン8 で解決する。

実際のところ、rustdoc のリンク解決挙動次第では、各 doc コメントの \`[FundingRate]\` や \`[Premium]\` クロス参照は今すべて解決するかもしれない（これらの型は今存在するからだ）。\`cargo doc -p openhl-funding --no-deps\` で確認できる。正確な warning 数は環境によって異なる場合がある。

よくあるエラー：

- **\`error[E0432]: unresolved import 'openhl_clob::AccountId'\`** — Cargo.toml に dep が入っていない場合。レッスン1 の \`[dependencies]\` ブロックに \`openhl-clob = { path = "../clob" }\` があるか再確認すること。
- **\`Settlement\` で \`error: cannot find type 'Notional' in this scope\`** — ローカル型の名前を間違えた場合。\`Notional\` は同じモジュール内なので \`use\` は不要だが、型名を正確に綴る必要がある。
- **\`hyperliquid_default\` で \`error: function calls are not allowed in const fn\`** — \`FundingRate::from(40_000_000)\` のような書き方をした場合。tuple-struct リテラル \`FundingRate(40_000_000)\` をそのまま使うこと。

## 設計の振り返り

このレッスンに焼き込んだ決定は 4 つ：

1. **\`FundingRate\` は \`Premium\` と形が同じでも別の型にする。** Newtype パターンが pipeline のステージを強制してくれる — premium が \`compute_rate\` を通らずに position に適用されることはありえない。**「形は同じだが役割が違う」は newtype の canonical なユースケースだ。**

2. **\`PositionSize\` は direction + magnitude ではなく、符号付き整数 1 つにする。** より小さく、より速く、数学が単純になる — そして符号規約の契約は doc コメントが担う。**どうせ数学が使うことになる、最も dense な表現を選べばよい。**

3. **\`Position\` はスナップショット型であり、stateful entity ではない。** Entry price も PnL も history もない — \`(account, size)\` だけだ。State を追跡するのは owning layer、スナップショットを処理するのが funding crate だ。**下流の型は narrow に、上流の型は wide に。**

4. **\`FundingParams\` は単位として変化する config をまとめてバンドルする。** 常に一緒に動く 3 値であり、後でバンドルを拡張しても呼び出し箇所は壊れない。**グループ自体がドメイン概念であるときに parameter object を使う。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

レッスン3 後の状態：
- **types.rs** が Funding参照実装コミット と**完全に**一致する — 9 型すべてと \`RATE_SCALE\`、\`hyperliquid_default\` まで。
- **lib.rs** には完全な型の re-export が入る。欠けているのは \`compute\` / \`clock\` の re-export だけだ。

**セクション1 完了。** レッスン4 からは \`compute.rs\` へとシフトする — これらの型の上に乗る純粋関数とそのテストだ。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`FundingParams::divisor\` がなぜ \`u64\` でなく \`u32\` なのか？**
HL の divisor は 8 だ。他の設定でも 24（毎時 settle で divisor として 1 回扱う）や 1（1 日 1 回の settlement）あたりに収まる。pathological な値でも \`u32::MAX\`（~40 億）よりずっと下にある。**\`u32\` で「十二分」、しかも \`u64\` の半分のビットコストで済む** — そもそも \`compute_rate\` の除算ではどうせ \`i64\` に widen する。小さな最適化ではあるが、\`Copy\` 型では効いてくる。

**Q: \`FundingParams\` のコンストラクタでフィールド検証をすべきか？**
誘惑にかられる — \`interval_secs == 0\`（ゼロ除算や permanent gating の原因）を拒否するか？ \`divisor == 0\` も拒否するか？ Funding参照実装コミット ではどちらも採らなかった：コンストラクタでの検証は、呼び出し側の input 検証とは*別の*検証ポイントを作ることになり、両者の食い違いがバグの温床になる。**入力検証の単一情報源は呼び出し側に置く。** ただし \`compute_rate\` は \`divisor == 0\` を「funding 無効化」として扱う — これは defensive default であって、validation ではない。

**Q: \`Position\` が \`Eq\` を derive するのに \`Default\` を derive しないのはなぜか？**
\`Eq\` はテストで position を比較するため（場合によっては上流の dedup ロジックでも）必要だ。一方 \`Default\` を付けると \`Position { account: AccountId(0), size: PositionSize(0) }\` という意味不明な値が生まれる（\`AccountId(0)\` は典型的に sentinel として使われる）。**Default は意味のある値を生むべきで、それができないなら derive しない。**

**Q: \`Position\` と \`Settlement\` は冗長では — 両方とも \`account\` + 値フィールドを持っている？**
似て見えるが、ライフサイクル上のステージが違う。\`Position\` は \`apply_funding\` の*入力*、\`Settlement\` はその*出力*だ。Owning layer が \`Position\` を渡し、\`Settlement\` を受け取る。**型レベルで区別しておくことで、settlement を position として誤って再適用してしまう事故を防げる。**

## セクション1 を貫くデータパイプライン

ここまでで定義した 9 型は、セクション2 (レッスン4〜7) で組み立てる純粋計算パイプラインに対する**語彙**そのものだ。レッスン4 以降に何を作るかを 1 枚で見ると:

\`\`\`
[インプット (snapshots)]            [純粋計算 (セクション2)]                 [アウトプット]

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

3 つのポイントを型レベルで強制している:
1. **\`Premium\` と \`FundingRate\` は同じ \`i64\` だが別の型** — \`compute_rate\` を通さずに \`apply_funding\` に渡すと**コンパイルエラー**。pipeline の順序が型システム側で守られている。
2. **入力 (\`Position\`) と出力 (\`Settlement\`) を別の型に分けている** — owning layer が \`Settlement\` を再び position として誤適用するパスを型で塞いでいる。
3. **\`FundingParams\` は枝として並走する** — 各 settlement 計算で参照される config 引数であって、pipeline 本流の値ではない。後から \`min_settlement_threshold\` 等が追加されても、矢印の本数は増えない。

セクション2 ではこの図の関数 3 つを順番に肉付けする。すべての引数と返り値は、レッスン1〜3 で定義した型だけで構成される。

## セクション1 マイルストーン — 築き上げたもの

レッスン3 後の状態：
- 9 newtype と、メソッド付き struct が 1 つ（\`FundingParams\`）。
- Funding参照実装コミット と完全一致する \`types.rs\`、~110 行。
- Funding を語るための完全な語彙 — 数学 pipeline 上のすべての値（premium、rate、settlement、position）に型が付いた。
- 挙動はまだゼロ。**Modules 2-3 で挙動を追加していく。**

## 次のレッスン（レッスン4）

レッスン4 では \`compute.rs\` を始める。ファイルを作って、module doc と \`compute_premium\` 関数を入れる — crate 最初の数学だ。関数は 8 行だが、設計判断を 3 つ encode する：(a) \`index == 0\` をエラーにせず \`Premium(0)\` を返す形で扱う、(b) 引き算 × scale の overflow を避けるため \`i128\` 中間値を使う、(c) wrap させずに \`i64\` へ saturate して戻す。最初の unit test も 4 つ追加する — premium-zero-when-equal、premium-positive / negative ケース、\`index == 0\` での saturation テスト。**Crate 最初のテストだ。**`,
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

このレッスンで掴む概念:

- **整数幅は入力ではなく*中間値*のレンジで選ぶ** — \`mark\` も \`index\` も \`u64\` だが、\`(mark - index) * RATE_SCALE\` は最悪 ~1.8e28 に達する。i128 の中間値は選択肢ではなく必須で、しかも upcast を引き算の*前に*入れることで初めて符号が保たれる。
- **割る前に掛ければ精度が残る** — \`(mark - index) / index\` を整数で先に計算してしまうと、100% 未満の premium はすべてゼロに丸められる。先に \`RATE_SCALE\` を掛けて分数を i128 のマグニチュードへと変換し、その後で割れば意味のある整数が残る。
- **\`u64\` での引き算が王道の符号バグ** — \`MarkPrice(99) - IndexPrice(100)\` は \`u64\` で計算すると \`u64::MAX\` 近くに wrap し、本来「小さな負」であるべき premium が「巨大な正」になる。\`i128::from(...)\` の upcast でこの引き算が代数的に正しくなる。
- **Oracle 欠損時の graceful degradation** — \`index == 0\` のときは \`Premium(0)\` を返し、エラーにはしない。Funding は bridge を経由して balance update として流れる仕組みなので、\`Err\` を返すと無関係な payload までトランザクション失敗として表面化してしまう。信号がないなら「ゼロを返す」が正解だ。
- **テストコメントは紙の上の数学そのもの** — assertion の隣に \`// (101-100) * 1e9 / 100 = 10_000_000\` と書いておけば、将来このコードを debug する人は「テストの著者を信じる」のではなく「数式に対して assertion を検証する」できる。

検証：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

上記の実行結果が unit test 4 つを通る。

具体的な変更:

\`openhl-funding\` crate は「型定義だけ」の状態から「型定義 + 最初の数学のピース」へと進む：

- **\`crates/funding/src/compute.rs\`** — 新規ファイル。module doc と関数 2 つを置く：
  - \`compute_premium(mark, index) -> Premium\` — \`(mark - index) / index\` を導出し、\`RATE_SCALE\` スケールで返す。
  - \`saturate_i128_to_i64(v) -> i64\` — clamp helper（private）、3 行。
- **\`compute.rs\` の \`#[cfg(test)] mod tests\` ブロックに、手書きトレース unit test を 4 つ追加**する：
  - \`premium_zero_when_mark_equals_index\`
  - \`premium_positive_when_mark_above_index\`
  - \`premium_negative_when_mark_below_index\`
  - \`premium_saturates_to_zero_when_index_is_zero\`
- **\`crates/funding/src/lib.rs\`** — \`pub mod compute;\` の追加と、\`compute_premium\` の re-export を行う。

これが**実際の数学**を持つ最初のレッスンだ。これ以降、コード変更のたびにアカウント間で wealth が静かに移ってしまう可能性が出てくる。手書きトレースのテストは、期待出力を「紙の上の数学で検証できる特定の入力値」に pin する役割を果たす。

## おさらい

レッスン3 後の状態：
- 9 型と \`RATE_SCALE\` が \`types.rs\` に揃っている — Funding参照実装コミット の完全な型 roster だ。
- 挙動はまだゼロ。Crate はコンパイルが通るだけで、何もしない。

レッスン4 で最初の関数を導入する。関数は短い（body は ~10 行）が、設計判断を 3 つ encode する：\`index == 0\` の graceful な扱い、overflow safety のための \`i128\` 中間値、wrap や panic ではなく saturation を選ぶこと、の 3 点だ。

## プラン

編集は 3 つ：

1. **\`crates/funding/src/compute.rs\` を作成**する — module doc、imports、\`compute_premium\`、private な \`saturate_i128_to_i64\` helper を入れる。
2. **\`compute.rs\` に \`#[cfg(test)] mod tests\` を追加**し、手書きトレース unit test を 4 つ入れる。
3. **\`crates/funding/src/lib.rs\` を更新**する — \`pub mod compute;\` 宣言を追加し、クレートルートで \`compute_premium\` を re-export する。

> 🛑 **考えてみよう。** スクロール前に — \`(mark - index) * RATE_SCALE / index\` を計算する場合を考える。\`mark\` と \`index\` はどちらも \`u64\` で、最大 ~1.8e19 まで取りうる。\`RATE_SCALE\` は \`1e9\` だ。*中間*積 \`(mark - index) * RATE_SCALE\` の最大サイズはいくらか。どの型に収まる必要があるか。

（答え：**\`u64::MAX * 1e9\` は \`i64\` を 10 桁オーバーフローする。** 最悪ケースは \`mark = u64::MAX\`、\`index = 0\`（これは別途処理する）か、\`mark = u64::MAX\`、\`index = 1\` のとき → \`(u64::MAX - 1) * 1e9 ≈ 1.8e28\`。\`i64::MAX\` は ~9.2e18 なので、中間値には \`i128\` が必要だ。\`index\` で割った後は i64 範囲に戻る — だが除算は乗算の*後*に行う必要があるので、中間値が i128 に収まることが必須となる。**積には i128 が必須。Saturation は、最終結果が i64 を超える稀なケースを扱う。**）

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

注目点は 2 つ：

**Module doc では 3 関数をプレビューしているが、レッスン4 で出荷するのはそのうち 1 つだけだ。** クロス参照 \`[compute_rate]\` と \`[apply_funding]\` は レッスン6 / レッスン7 までリンク切れのままだ。**warning は許容する** — レッスン1 / レッスン2 で \`[FundingRate]\` クロス参照を増分的に解決させていったのと同じ方針だ。

**\`use\` 文では、レッスン4 ではまだ使わない型も import する。** \`FundingParams\`、\`FundingRate\`、\`Notional\`、\`Position\`、\`Settlement\` は レッスン6 / レッスン7 の関数で必要になる。今 import しておけば、レッスン4 以降は import ブロックが安定する — レッスン1 で \`[dev-dependencies]\` に proptest を先に入れたのと同じ理屈だ。**Boilerplate は早めに安定化させ、ロジックを iterate する。**

> 🛑 **やりがちな勘違い。** 「レッスン4-レッスン6 の間、unused-import の warning を抑えるべきでは？」 **Unused-import warning は*コンパイラ*が unused と判断したアイテムで発火するもので、rustdoc が参照するアイテムでは発火しない。** レッスン7 までに \`FundingRate\` や \`Notional\` などはすべて使うので、コンパイラは文句を言わない — 同じモジュール内で後ろの方で使われている \`use\` 宣言を見ているからだ。warning を出すのは rustdoc のクロス参照 \`[compute_rate]\` と \`[apply_funding]\` だけで、これらは レッスン6 / レッスン7 で解決される。

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

この関数の中で「型がどこで widen し、どこで saturate し、どこで narrow に戻るか」を 1 枚で見ると、ロジックの幹がそのまま追える:

\`\`\`
  MarkPrice(u64) ──► i128 ──┐
                            ▼
  IndexPrice(u64) ──► i128 ─► [ - 引き算 ] ──► diff (i128: 符号が安全に残る)
                                                  │
                                                  ▼
  RATE_SCALE(i64) ──► i128 ────────────────► [ saturating_mul ] ──► scaled (i128, overflow を clamp)
                                                                       │
                                                                       ▼
  IndexPrice(u64) ──► i128 ──────────────────────────────────────► [ / 除算 ]  (※ index == 0 は事前に弾く)
                                                                       │
                                                                       ▼
                                                                    premium (i128)
                                                                       │
                                                                       ▼
  Premium(pub i64) ◄──────────────────────────────────── [ saturate_i128_to_i64 ]
\`\`\`

3 つの面白さがこの図には焼き込まれている: (a) 入力 (\`MarkPrice\` / \`IndexPrice\` / \`RATE_SCALE\`) と出力 (\`Premium\`) は narrow な型なのに、中間値だけ意図的に \`i128\` に widen している、(b) overflow は \`saturating_mul\` と最後の \`saturate_i128_to_i64\` の **2 箇所**で吸収していて、間の \`diff\` には saturation が不要 (\`i128\` の幅は引き算には十分すぎる)、(c) 「掛けてから割る」の順序が、\`scaled\` というラベルの位置として現れている。

Body は 10 行、動く部分は 4 つ：

1. **\`index == 0\` での早期 return。** Zero index は「oracle がまだ価格を配信していない」（boot state）か、「アセットに spot reference がない」のどちらかを意味する。**どちらのケースでも zero funding を返すべきだ** — index がない以上、意味のある \`(mark - index)\` を計算する余地がない。\`Premium(0)\` を返すのは graceful degradation だ。エラーにしてしまうと bridge を経由してトランザクションレベルの失敗として伝播し、無関係な処理までブロックしてしまう — 一時的な oracle 問題への対応としては誤りだ。**この早期 return は同時に「ゼロ除算 panic」も未然に防いでいる**: 直後の \`scaled / i128::from(index.0)\` で分母 \`0\` を踏むパスを物理的に閉じる役割を兼ねていて、graceful degradation と「絶対に panic させない」が同じ 2 行で両立している。

2. **\`i128::from(mark.0) - i128::from(index.0)\`。** 両 operand を引き算の*前*に \`i128\` に upcast する。**\`u64\` 同士の引き算は \`mark < index\` で underflow する** — 結果が負数になるのではなく、\`u64::MAX\` 近くまでラップしてしまう。符号付き i128 に upcast することで、引き算が代数的に正しく振る舞うようになる。

3. **\`diff.saturating_mul(i128::from(RATE_SCALE))\`。** 乗算には普通の \`*\` ではなく \`saturating_mul\` を使う。最悪ケース（\`mark\` が \`u64::MAX\` に近く、\`index\` が非常に小さい場合）では、積が \`i128::MAX\` に近づく — 普通の乗算では overflow する。\`saturating_mul\` なら panic せず \`i128::MAX\` / \`i128::MIN\` に clamp する。

4. **\`scaled / i128::from(index.0)\`。** 除算は乗算の*後*に行う。**先に割ると精度を失う** — \`(mark - index) / index\` を整数演算で素直に計算すると、1.0 未満の premium はすべて（つまり実用範囲のすべてが！）0 になってしまう。先に \`RATE_SCALE\` を掛けることで、小数桁を整数の magnitude として保持できる。その上で割ることで、スケール済みの premium が得られる。

最後に \`saturate_i128_to_i64\` を使い、\`Premium\` の i64 範囲に clip して戻す。

> 🛑 **やりがちな勘違い。** 「\`(mark - index).saturating_mul(RATE_SCALE) / index\` を u64 で計算すればいいのでは？」 **だめだ — 引き算が問題になる。** \`MarkPrice(99) - IndexPrice(100)\` を \`u64\` で計算すると underflow し、\`u64::MAX - 0\` 近くにラップしてしまう。それは小さな*負*の数ではなく巨大な*正*の数だ。結果として、本来は小さな*負*の premium であるべきところに巨大な*正*の premium が出る。**符号が肝心であり、符号付き演算が必須だ。**

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

Body は 3 行。**\`i64::try_from(v)\` は \`Result\` を返す** — \`v\` が i64 に収まれば \`Ok(value)\`、収まらなければ \`Err\` だ。\`unwrap_or(...)\` が \`Err\` ケースの default を提供する：overflow が正方向なら \`i64::MAX\`、負方向なら \`i64::MIN\` に clamp する。

この関数は**モジュール private**（\`pub fn\` ではなく \`fn\`）にする。呼び出し側からは見せる必要がない — 呼び出し側は \`MarkPrice\` / \`IndexPrice\` を渡して \`Premium\` を受け取るだけで、saturation は裏で勝手に行われる。private にしておけば偶発的な誤用を防ぎつつ、public surface もクリーンに保てる。

レッスン7 の \`apply_funding\` がこの helper の 2 番目の caller になる。だからこそ \`compute_premium\` 内に inline せず、helper として独立させている。

> 🛑 **考えてみよう。** テスト \`assert_eq!(saturate_i128_to_i64(i128::MAX), ???)\` は何を期待するか。

（答え：**\`i64::MAX\`。** \`i128::MAX\` は ~1.7e38 で、\`i64::MAX\`（~9.2e18）を遥かに超える。\`i64::try_from(i128::MAX)\` は失敗し、\`unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })\` の closure が評価される。\`v > 0\` なので \`i64::MAX\` が返る。負側も対称的で、\`i128::MIN\` は \`i64::MIN\` に clamp される。）

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

手書きトレースのテストが 4 つ。それぞれ短いが、特定の*意味*を pin する：

1. **\`premium_zero_when_mark_equals_index\`** — 対称ケース。Mark = index は dislocation がないことを意味する。数学は素直で \`(100 - 100) * 1e9 / 100 = 0\`。式の off-by-one や符号反転を捕まえる。

2. **\`premium_positive_when_mark_above_index\`** — longs が overpay するケース。Mark 101 > Index 100 → 正の premium。期待値 \`10_000_000\` は紙の上の数学から導ける：\`(101-100) * 1e9 / 100 = 1e9 / 100 = 1e7 = 10_000_000\`。**ppb で表現すれば 1% premium。** 符号規約が反転していると、ここで引っかかる。

3. **\`premium_negative_when_mark_below_index\`** — shorts が overpay するケース。Mark 99 < Index 100 → 負の premium。テスト 2 と同じ規模で符号だけ反対。**「u64 で引き算して underflow する」バグをピンポイントで捕まえる。**

4. **\`premium_saturates_to_zero_when_index_is_zero\`** — graceful-degradation ケース。期待出力は \`Premium(0)\` — panic でもエラーでもない。**「単純化のため」と称して早期 return の guard を削った人を捕まえる。**

テスト 2 のコメント \`// mark 101, index 100 → premium = 1/100 = 0.01 → 10_000_000 ppb\` は、**紙の上の数学をそのままテストに書き写したもの**だ。将来このテストをデバッグする人は誰でも、テスト作者が正しく書いたと信じる必要なく、アサーションを手で検証できる。

> 🛑 **やりがちな勘違い。** 「\`MarkPrice(u64::MAX)\` や \`IndexPrice(1)\` のような edge case もテストすべきでは？」 **やるべきだ、ただし レッスン5 で。** これらは saturation の境界テスト — \`saturate_i128_to_i64\` helper を境界で exercise するもので、レッスン5 のメインの教育的フォーカスだ。**レッスン4 のテストは normal-input の semantics を pin し、レッスン5 は pathological-input の挙動を pin する。** どちらのテストクラスも重要だが、レッスンで分けておけばレッスン単位のスコープを引き締められる。

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

変更は 2 点：
- \`pub mod compute;\` — 新モジュールを宣言する。
- \`pub use compute::compute_premium;\` — 関数をクレートルートで re-export する。これで呼び出し側は \`use openhl_funding::compute::compute_premium;\` ではなく \`use openhl_funding::compute_premium;\` と書ける。

**モジュール宣言はアルファベット順**にする（\`compute\` が \`types\` の前）。\`pub use\` も同じ順序だ。長い re-export ブロックでは整合性が効いてくる。

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

**4 テストが通る。** Crate 初の green run だ。rustdoc warning が 3 つ出るのは期待通り（\`compute_rate\` / \`apply_funding\` / \`FundingClock\` — それぞれ レッスン6 / レッスン7 / レッスン8 で解決される）。

よくあるエラー：

- **positive テストで \`assertion failed: left=0 right=10_000_000\`** — \`compute_premium\` の \`* RATE_SCALE\` ステップが抜けている場合だ。スケーリングなしの整数除算 \`(101 - 100) / 100\` は 0 に丸まる。
- **negative テストで \`assertion failed: left=18446744073709541616 right=-10_000_000\`** — 引き算を \`i128\` への upcast なしに \`u64\` で行った場合だ。巨大な正の数は \`u64::MAX + (99 - 100)\` という underflow ラップの結果だ。**両 operand に \`i128::from(...)\` の upcast を追加すること。**
- **テストで panic** — \`saturating_mul\` ではなく普通の \`*\` を使った場合だ。Debug build では普通の乗算が overflow で panic する。\`saturating_mul\` に切り替えること。
- **\`error: cannot find function 'saturate_i128_to_i64'\`** — helper が同じファイルの \`compute_premium\` の下にある場合だ。呼び出し元の上に動かしてもいいし、下のままにしてもいい — Rust はモジュール内の宣言順を気にしない。

## 設計の振り返り

このレッスンに焼き込んだ決定は 4 つ：

1. **\`index == 0\` のときは \`Premium(0)\` を返す、エラーにはしない。** Oracle が使えないときの graceful degradation だ。エラーにすると bridge を経由してトランザクション失敗として伝播し、無関係な payload の処理までブロックしてしまう。「rate を駆動する情報がない」状態への正しい答えはゼロだ。

2. **中間値は \`i128\` を使い、\`u64\` は絶対に使わない。** 引き算は負になりうるし、乗算は \`u64::MAX\` を超えうる。どちらの演算でも符号付きかつより wide な算術が必要だ。**整数幅は入力の範囲ではなく、*中間値*の範囲を見て選ぶ。**

3. **乗算は \`*\` ではなく \`saturating_mul\` を使う。** 乗算中の overflow は panic（debug）か wrap（release）になる。どちらも saturation より悪い：panic = halt 経由の chain fork、wrap = 誤った値経由の chain fork だ。**Consensus 中核の数学で bounded behavior を得る唯一の選択肢が saturation だ。**

4. **テストコメントは紙の上の数学そのもの。** アサーション横の \`// (101-100) * 1e9 / 100 = 10_000_000\` のおかげで、将来のデバッガがアサーションを*式に照らして*検証できる — テスト作者の約束を信じる必要はない。**テストはドキュメンテーションでもあり、そのコメントがドキュメンテーションの本文だ。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

レッスン4 後：
- **compute.rs** が Funding参照実装コミット の \`compute_premium\` + \`saturate_i128_to_i64\` + 4 手書きトレース premium テストまで一致。\`compute_rate\`、\`apply_funding\`、rate テスト、proptest は レッスン5-レッスン7。
- **lib.rs** が \`pub mod compute;\` と \`compute_premium\` re-export を持つ。\`apply_funding\`、\`compute_rate\`、clock モジュールは レッスン5-レッスン8。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`compute_premium\` で危ないステップだけでなく、なぜどこでも \`i128\` を使うのか？**
\`i128::from(u64)\` 変換はタダだからだ（ただの zero-extend）。全計算を \`i128\` で行えば「この関数は i128 算術を使う」という統一されたメンタルモデルになる — 「ここは u64、そこは i128」と混在させるよりずっと素直だ。**統一された width はコストゼロで、可読性は得しかない。** semantic な重みを持つ変換は、最終的に i64 へ saturate する箇所だけだ。

**Q: \`RATE_SCALE\` の upcast に \`RATE_SCALE as i128\` ではなく \`i128::from(RATE_SCALE)\` を使うのはなぜか？**
\`from\` が idiomatic かつ non-truncating な変換だからだ。ここでは \`as i128\` でも動く（\`i64 → i128\` で truncate は起きない）が、\`from\` を使うことで「これは widening であって reinterpretation ではない」と意図を documentation できる。**Widening には \`from\` を使う。truncation が起きないことを検証済みのときだけ \`as\` を使う。** \`as i128\` を読んだ将来のエンジニアは safety を自分で検証する必要があるが、\`from\` を読めば変換が safe だと一目で分かる。

**Q: なぜ helper の名前が \`clamp_to_i64\` ではなく \`saturate_i128_to_i64\` なのか？**
「Saturate」は「型境界で clamp する」を表す確立した用語だからだ — \`u64::saturating_mul\`、\`i128::saturating_sub\` と同じ単語だ。**標準語彙を使えば、関数の挙動がどの Rust 開発者にも一目で伝わる。** 「Clamp」だとユーザー定義の境界も含む任意の clamping を意味しうるが、「saturate」は型境界での clamping を特定的に指す。

**Q: \`compute_premium\` は \`pub\` ではなく \`pub(crate)\` にすべきでは？**
\`pub\` でないと外部の caller（Step 5 (Liquidation) の bridge integration や、funding state を telemetry のために問い合わせる外部 observer）が呼べないからだ。\`pub(crate)\` ではそれが禁じられる。**この関数は public API の一部だ。** \`saturate_i128_to_i64\` が実装の詳細、\`compute_premium\` が契約だ。

## 次のレッスン（レッスン5）

レッスン5 では新しい関数は追加しない。代わりに overflow 哲学を深掘りする：consensus 中核の数学に対して saturation だけが唯一許容される挙動である理由、代替案がどう見えるか、それらがなぜチェーンを fork させるか、そして \`saturate_i128_to_i64\` が pathological 入力で境界においてどう振る舞うか。レッスンには proptest を 1 つ追加する（\`premium_is_antisymmetric_in_mark_index\`） — mark と index を入れ替えると premium の符号が反転するという property だ。**Crate 初の proptest だ。**`,
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

このレッスンで掴む概念:

- **Saturate でも panic でも wrap でもない、consensus で許される overflow は saturate だけ** — panic すると validator が halt し、ネットワークから fork off する。Wrap はコンパイラバージョン次第で挙動が変わり、「定義されているが間違った」値を生む。Saturate ならすべての validator が同じ bounded value に到達する。Consensus の liveness を保てる選択肢は他にない。
- **符号を意識した saturation の override** — \`i64::try_from\` は失敗を報告してくれるが方向までは教えてくれない。\`unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })\` の**インライン条件式**が方向を復元する。固定で \`i64::MAX\` を返すようにすると、\`i128::MIN\` が正に flip して符号が静かに壊れる。(\`unwrap_or\` は eager 評価だが、ここで渡しているのは軽い即時式なので実コストは無視できる。)
- **手書きトレースと proptest は補完関係であって冗長ではない** — proptest のランダムサンプリングは \`i128::MAX\`（2^129 通りのうちの 1 点）にまず当たらない。境界は手書きでしか pin できない。Proptest は interior の property に強く、手書きは corner に強い。
- **テストすべきは「実際に成立する不変条件」であって「願望の property」ではない** — 素朴な antisymmetry は magnitude も等しくあれと書きたくなるが、整数除算がそれを壊す。だから「符号が逆」という weaker な property をテストし、丸めの caveat はテストコメントに残す。
- **\`checked_mul\` + \`Result\` で本当に解決するわけではない理由** — エラーは最終的に bridge に届くが、bridge が取れる現実的な選択肢は「revert（fork）」「skip（silent inconsistency）」「cap で settle」の 3 つしかない。最後のものは saturate がそのまま実現してくれる挙動だ。

新規関数なし、新規テストコードは ~5 行。**メンタルモデルこそがレッスンの本体だ。**

検証：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

上記の実行結果が 5 テストを通る（レッスン4 で書いた 4 つ + 新規 proptest 1 つ）。

具体的な変更:

- **コードベース初の proptest** — \`premium_is_antisymmetric_in_mark_index\`。\`mark\` と \`index\` を入れ替えると premium の符号が反転する（mark = index のときは両方ともゼロ）という property だ。テスト実行 1 回あたり 256 のランダム入力を投げる。

ただしこのレッスンの本丸は**コードではなく概念**の方だ。歩いていくのは：

1. **panic = チェーン fork である理由。** Panic した validator は halt し、残りの validator はそれなしで前進する。State が乖離する。
2. **wrap = チェーン fork である理由。** コンパイラバージョンや build flag が異なる 2 つの validator は、同じ overflow 地点で*別々に* wrap しうる。誤った値が正しい値から乖離する。
3. **saturate が bounded behavior である理由。** すべての validator が同じ入力に対して同じ saturated 値に合意する。Fork は起きない。
4. **\`saturate_i128_to_i64\` の境界ケース。** \`i128::MAX → i64::MAX\`、\`i128::MIN → i64::MIN\`。\`unwrap_or\` の closure が \`i64::MAX\` 固定ではなく、なぜ符号に依存する必要があるか。

## おさらい

レッスン4 後の状態：
- \`compute_premium\` が \`i128\` 中間値を使って符号付き premium を計算する。
- \`saturate_i128_to_i64\` が overflow を i64 境界に clamp する。
- 手書きトレーステスト 4 つが、normal な入力に対する関数の挙動を pin している。

レッスン4 のテストでは pathological な入力（例：\`MarkPrice(u64::MAX)\`）を exercise していないし、saturate helper を境界で exercise してもいない。レッスン5 では、その両ギャップを哲学と proptest で埋めにいく。

## プラン

編集は 2 つ：

1. **\`compute.rs\` のテストモジュールに \`use proptest::prelude::*;\` を追加**する。
2. **antisymmetry property を持つ \`proptest! { ... }\` ブロックを追加**する。

プロダクションコードの変更はない。

> 🛑 **考えてみよう。** スクロール前に — \`compute_premium\` で panic が起きれば validator は halt する。**なぜそれが単一ノード障害ではなく chain fork になるのか？** ヒント：1 つが halt したとき、他の validator が何をしているかを考えよ。

（答え：**他の validator は、halt したノードを置き去りに前進していくからだ。** Funding tick はすべての validator で deterministic な state update を生む。1 つが halt しても、network の quorum（典型的には 2/3 以上）はそのまま動き続ける。Halt した validator が再起動する頃には、chain head は何ブロックも先に進んでいる。Halt した validator は sync できない — halt したブロックでの local state が network 側の view と食い違うからだ。**Halt によって history が 2 つに分かれる：「panic を踏んだ入力での history」と「network が進めた state での history」だ。Validator は事実上、自ら network から fork off した。** これに対して saturate は、validator 同士を lockstep のまま保ってくれる。）

## 手順

### Step 1: Overflow の taxonomy

「整数が収まらなかった」の失敗モード 3 つを、validator から見た**最終的な帰結**で並べると、なぜ選択肢が 1 つしかないのかが一目で分かる:

| モード | Rust 上の挙動 | validator/network への影響 | 判定 |
| --- | --- | --- | --- |
| **Panic** (\`*\` in debug) | スレッドが halt | validator 1 台が consensus から永久脱落、network は気づかず前進 | ❌ 自ら **fork off** する最悪ケース (liveness 喪失) |
| **Wrap** (\`*\` in release) | silent に modulo wrap | コンパイラ最適化次第で**各 validator が別々の誤値**、または全員一致で**誤った値に合意** | ❌ 検出不可能な **chain fork** または検出不能な silent corruption |
| **Saturate** (\`saturating_mul\`) | 型境界 (\`i128::MAX\` / \`MIN\`) に clamp | 全 validator が**同じ bounded 値**で合意し前進、経済的には capped settlement に降りる | ⭕ **liveness 維持** — consensus が許す唯一の選択肢 |

下に各モードの細部を順に展開する。

「整数が収まらなかった」の失敗モード 3 つ：

#### Panic（debug build の \`*\`）

\`\`\`rust
let scaled = diff * i128::from(RATE_SCALE);  // debug で overflow に panic
\`\`\`

Debug build では整数 overflow が panic する。panic を踏んだスレッドは halt し、それが validator の funding tick だった場合、validator の state machine は前進を止める。**ネットワークの残りはそれに気づかずに進み続ける。** halt した validator を再起動した時点で、panic を踏んだブロックでの world-view は network 側のものと一致しない。それ以降、新しいブロックを検証できなくなる — 自分が計算した覚えのない state を参照しているように見えるからだ。

要するに：**validator 1 台がいなくなった、しかし不在によって壊れるのは自分自身だけで、ネットワーク側ではない。** チェーンが「2 つの valid な history を生む」形で fork するのではなく、panic した validator が consensus から永久に脱落するという形で fork する。

#### Wrap（release build の \`*\`）

\`\`\`rust
let scaled = diff * i128::from(RATE_SCALE);  // release で silent に wrap
\`\`\`

Release build では \`*\` は panic せず wrap する。結果は \`(diff * RATE_SCALE).wrapping_rem(2^128)\` — 値としては*定義済み*だが、数学的には正しくない。

**ここでのハザード**：コンパイラの最適化が異なる 2 つの validator が、同じ overflow 地点で*別々の wrap 結果*を出しうる。コンパイラは結合則のもとで演算を並べ替えられるので、\`(a * b) * c\` と \`a * (b * c)\` が「中間で overflow が起きるか否か」次第で異なる wrap 結果になりうる。仮に両 validator が偶然同じように wrap したとしても、*誤った*値がその tick で settle されるすべてのアカウントに伝播する。**全 validator が間違った答えに合意してしまう。** さらに後段で raw input から funding を再計算する下流クライアントは、結果が一致しないと指摘する。レイヤー間の不整合でチェーンが fork する。

しかも *release build* での wrap は silent だ — log もなければ warning もない、イベントすら出ない。**検出が最も難しいクラスのバグ — 間違っているが consistent な結果が出る、というやつだ。**

#### Saturate（我々が選んだ挙動）

\`\`\`rust
let scaled = diff.saturating_mul(i128::from(RATE_SCALE));  // i128::MAX/MIN に clamp
\`\`\`

Saturation は型境界で定義された値を生む：正方向に overflow すれば \`i128::MAX\`、負方向なら \`i128::MIN\` だ。**\`saturating_mul\` を持つすべての validator が、入力に対して同じ値を出す。** Fork は起きない。

Saturation のもとでは*funding rate* が事実上 cap される（\`saturate_i128_to_i64\` がさらに i64 へ clamp した後の値だ）。経済的な帰結としては、極端な oracle dislocation で premium が saturation の閾値を超えるような場面でも、panic や wrap ではなく最大 rate での支払いが発生する形になる。**挙動が gracefully degrade する。**

> 🛑 **やりがちな勘違い。** 「\`checked_mul\` を使ってエラーを返せばよくないか？」 **可能だが、問題を呼び出し側に押し付けるだけだ。** \`Result<Premium, OverflowError>\` が \`compute_rate\`、\`apply_funding\`、clock を経由して上へ伝播し、最終的に bridge にまで届く。そして bridge は何をするか決める必要に迫られる。Bridge の選択肢は (a) ブロックを revert する（chain fork）、(b) funding tick をスキップする（silent な state 不整合）、(c) cap で settle する、のいずれかだ。**「cap で settle する」結果は saturation が直接実現できる — エラーを伝播させる必要すらない。**

### Step 2: \`saturate_i128_to_i64\` 境界ケース

レッスン4 の helper を思い出す：

\`\`\`rust
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
\`\`\`

入力の regime は 3 つ：

| 入力 | \`try_from\` の結果 | \`unwrap_or\` が返す値 |
|---|---|---|
| \`v\` が i64 に収まる | \`Ok(v as i64)\` | \`v as i64\`（override されない） |
| \`v > i64::MAX\` | \`Err(...)\` | \`i64::MAX\`（\`v > 0\` だから） |
| \`v < i64::MIN\` | \`Err(...)\` | \`i64::MIN\`（\`v ≤ 0\` だから） |

**\`unwrap_or\` の中で符号チェックを行う理由は？** \`try_from\` は overflow がどちらの方向に起きたかを教えてくれず、「収まりません」としか言わないからだ。もし overflow に対して固定値（例：\`i64::MAX\`）を返すと、\`i128::MIN\` も \`i64::MIN\` ではなく \`i64::MAX\` に saturate されてしまい、符号が反転する。\`if v > 0\` のテストが、その方向情報を回復してくれる。

ここで重要なのは、**\`try_from\` の \`Err\` は方向の情報を捨てているが、引数の \`v\` (i128) はクロージャから依然読めるまま生きている**という点だ。データフローで書くと:

\`\`\`
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
\`\`\`

「\`Err\` は値の中身を捨てるが、元の引数は scope に残っている」が \`unwrap_or\` という API の存在意義そのものだ。これを \`unwrap_or(i64::MAX)\` のような単純な fallback にすると、\`i128::MIN\` のような「絶対値が最大の負の数」が**正の \`i64::MAX\` に化ける** — premium の符号反転バグが consensus に乗ってしまう。クロージャ版は「\`v\` を覗き見して方向を復元する 1 行」を挟むことで、その事故を物理的に塞いでいる。

> 🛑 **考えてみよう。** \`saturate_i128_to_i64(0)\` は何を返すか。

（答え：**\`0\`。** \`i64::try_from(0_i128)\` は \`Ok(0)\` を返す。\`unwrap_or\` 側の分岐は発火しない。**Saturation は in-range の値に対しては no-op だ。** これは下に出てくる proptest にとって重要なポイントになる — ランダムな \`(mark, index)\` ペアのほとんどは i64 に余裕で収まる premium を生むので、saturate helper はそれらに対して invisible になる。）

> 🛑 **やりがちな勘違い。** 「境界を明示的にテストする必要があるのか — property-based テストでカバーされないのか？」 **ランダムサンプリングではまずカバーされない。** Proptest のデフォルト戦略は入力空間に対して uniform に値を生成する。\`i128::MAX\` は 2^129 通りの値のうちのただ 1 点なので、ランダムに当たる確率は実質ゼロだ。**境界テストには手書きトレースが要る** — generator のランダムウォークでは届かない特定の値を狙い撃ちする必要があるからだ。

### Step 3: テストモジュールに proptest サポートを追加

\`crates/funding/src/compute.rs\` を開く。現在のテストモジュールの開始：

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    // ... レッスン4 の 4 unit test ...
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

    // ... レッスン4 の 4 unit test ...
}
\`\`\`

注目点は 3 つ：

1. **\`use openhl_clob::AccountId;\`** — \`pos\` helper に必要だ。レッスン4 のテストでは使わない。レッスン5 の proptest 自体でも実は不要だが、レッスン7 の apply_funding テストで必要になるので、テストモジュールの import を安定化させるために今のうちに入れておく。
2. **\`use proptest::prelude::*;\`** — \`proptest!\`、\`prop_assert_eq!\`、\`prop_assert!\`、strategy combinator（\`1u64..1_000_000\`）を scope に持ち込む。
3. **\`fn pos(account: u64, size: i64) -> Position\`** — \`Position\` を構築する小さな helper。レッスン7 で使う。import / helper セクションを安定化させるため、今のうちに追加する。

**Boilerplate を先に安定化させ、テストを iterate する。** レッスン1 の dep と レッスン4 の \`use\` ブロックでも同じ理屈だった — 後で必要になるものを先に入れて、レッスンごとの diff を本当に新しい部分に集中させる、という方針だ。

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

proptest 固有の要素は以下：

- **\`signum()\` について(初出メモ):** \`i64::signum()\` は値の符号を \`-1\` / \`0\` / \`+1\` のいずれかで返す標準ライブラリのメソッド。負値で \`-1\`、ゼロで \`0\`、正値で \`+1\`。\`a.0.signum() == -b.0.signum()\` は「a と b の符号が正負で逆 (\`+1\` と \`-1\` のペアになる)」という命題に変換される — 整数除算の丸めで magnitude がぶれても、符号だけは厳密に antisymmetric であることを property にしている。
- **\`proptest! { ... }\`** — テスト関数をラップするマクロ。このブロック内では、\`#[test]\` 関数が generator 付きの property test として扱われる。
- **\`mark in 1u64..1_000_000\`** — **戦略**だ。\`mark\` は \`[1, 1_000_000)\` の範囲からサンプルされる。デフォルトは test run あたり 256 ケース（つまり ~256 個のランダムな \`(mark, index)\` ペア）。
- **\`prop_assert_eq!\` と \`prop_assert!\`** — proptest のアサーションマクロだ。単一ケースとして見れば \`assert_eq!\` / \`assert!\` と同等だが、proptest は失敗時に入力を shrink して*最小*の失敗ケースを探すため、専用のマクロが必要になる。

なぜこの property を選ぶのか。

「antisymmetry」の素朴版はこうだ：\`compute_premium(MarkPrice(M), IndexPrice(I))\` と \`compute_premium(MarkPrice(I), IndexPrice(M))\` は**同じ規模で反対の符号**の結果を返すべきだ。だが整数除算はゼロに向かって丸めるので、\`|a| / M == |b| / I\` の cross-comparison は厳密には成り立たない — rounding 由来の off-by-one な非対称性があるからだ。

**そこで proptest では弱めた property をテストする：符号が反対（または両方ゼロ）であること。** Mark = index のときは両方の premium がゼロ、Mark ≠ index のときは一方が正、もう一方が負になる。

**コメントには、なぜ property を弱めたかも書いてある。** 将来この property を読んで「規模も等しいべきでは？」と思った読者は、rounding 由来の caveat がその場で documentation されているのを見つけられる。**整数算術のもとで実際には成り立たない aspirational な property は、テスト失敗を呼び込むだけだ。** 実際に invariant な property をテストすること。

> 🛑 **やりがちな勘違い。** 「テスト fixture で \`f64\` を使って期待規模を厳密に計算すればよいのでは？」 **それは \`f64\` 計算の期待値を \`i64\` 計算の実測値に対して assert する— 両者は LSB レベルで一致しない。** 決定的な整数コードを非決定的な float の期待値と比較するテストは、信頼できない。**テスト側の算術も、本番側の算術と同じドメインに留める。**

> 🛑 **考えてみよう。** 戦略で \`0u64..1_000_000\` ではなく \`1u64..1_000_000\` を使い、ゼロを除外しているのはなぜか。

（答え：**\`index == 0\` は \`Premium(0)\` の早期 return ケースで、レッスン4 の手書きトレース unit test で既にカバー済みだからだ。** Proptest に 0 を含めると、(a) 両方ゼロのときに「符号が反対」を assert して property が破れる、もしくは (b) proptest 内でゼロを特別扱いしてテストを複雑にする、のいずれかになる。ゼロを除外すれば property がクリーンに保てる。**Proptest は interesting な範囲を exercise すべきで、trivial か既にテスト済みの範囲ではない。**）

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

5 テストすべてが green になる。proptest は 256 個のランダムな \`(mark, index)\` ペアを実行し、全 256 ケースで antisymmetry property が満たされる。

proptest の出力を詳しく見たい場合は環境変数を設定する：

\`\`\`bash
PROPTEST_VERBOSE=1 cargo test -p openhl-funding premium_is_antisymmetric
\`\`\`

「passed 256 cases」のメッセージや、失敗時の「shrunk to mark=X index=Y」 — 最小の counterexample — などのログが確認できる。

よくあるエラー：

- **\`error: macro 'proptest' is not used\`** — \`use proptest::prelude::*\` ではなく \`use proptest::*\` を import した場合だ。マクロは \`prelude\` に置かれている。
- **\`prop_assert_eq!\` を \`assert_eq!\` と typo** — 通常の関数なら動くが、\`proptest!\` の中では適切な shrinking のために \`prop_*\` 系を使う必要がある。テスト自体は pass するものの、失敗時に最小例まで shrink されない。
- **「signs are opposite」が失敗する** — 通常、proptest が \`mark == index\` を誤って else 分岐に流してしまっている。if / else の分割を確認すること：\`if mark == index { both zero } else { opposite signs }\`。
- **\`signum() == -b.0.signum()\` で \`b.0 == 0\` のときに proptest が panic** — mark と index が異なるのに compute_premium がゼロを返す状況で起きる（例：整数数学でゼロに丸まる非常に小さな入力）。\`1u64..1_000_000\` の range ならこれを避けられる。range をもっと狭めると当たる場合がある。

## 設計の振り返り

このレッスンに焼き込んだ決定は 5 つ：

1. **Consensus 上で bounded behavior を提供する overflow オプションは saturate だけ。** Panic は halt 経由の chain fork、wrap は「間違っているが consistent」な値による chain fork を生む。Saturate なら全 validator が同じ値を出し、gracefully degrade する。**Consensus の liveness を保つ選択肢は他にない。**

2. **テストするのは aspirational な property ではなく、実際に invariant な property。** 素朴な antisymmetry は規模が一致することを要求するが、整数の rounding でそれは破れる。だから弱めた property（符号が反対）をテストし、rounding 由来の caveat はテストコメントで documentation する。**Aspirational なテストは production で失敗し、invariant なテストは開発で失敗する。**

3. **テストモジュールの boilerplate は早めに安定化させる。** \`use proptest::prelude::*\`、\`use openhl_clob::AccountId\`、\`pos\` helper を今のうちに足しておけば、テストモジュールの import は レッスン6 / レッスン7 まで安定する。**Boilerplate の churn は、レッスンごとの diff の本質を覆い隠してしまう。**

4. **\`saturate_i128_to_i64\` の \`unwrap_or\` のインライン条件式は符号に依存させる。** 固定値の override では、負方向の overflow を正に flip してしまう。Saturate helper を丁寧に読めば、この条件分岐が*念のため*ではなく*必要だから*そうなっていると分かる。

5. **proptest の範囲からゼロを除外する** — ゼロのケースは既に手書きトレースの unit test でカバー済みであり、proptest に含めると property を余計に複雑化する。**手書きトレースは境界ケースを pin し、proptest は内部の property を pin する。** 互いに補完的であって、冗長ではない。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
\`\`\`

レッスン5 後：
- **compute.rs** が Funding参照実装コミット の \`compute_premium\` + \`saturate_i128_to_i64\` + 4 手書きトレース premium テスト + antisymmetry proptest + テストモジュール imports/helper まで一致。\`compute_rate\`、\`apply_funding\`、残りの proptest は レッスン6/レッスン7。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: proptest は実際に何ケース実行するのか？**
デフォルトはテスト実行 1 回あたり 256 ケース。\`PROPTEST_CASES=N cargo test\` で変更できる。Shrinker が failure 発見後に counterexample を最小化するため、追加のケースを実行することもある。**256 個のランダムペアで、antisymmetry property は CI を重くせずに input 空間の意味あるサンプルに対して exercise される。**

**Q: もっと強いカバレッジのために 10,000 ケースに増やせるか？**
できる。だが closed form を持つ property に関しては、ケース数を増やしたところで limit利得はすぐに頭打ちになる。Antisymmetry は確率的な property ではなく、成り立つか成り立たないかのどちらかだ。256 ケースもあれば、実装がテスト範囲で正しいという高い信頼が得られる。**Adversarial な入力が絡む property（例：crypto）ならケース数を増やす価値があるが、純粋数学的な property には 256 で十分だ。**

**Q: \`proptest\` ではなく \`quickcheck\` を使えばよいのでは？**
どちらも Rust の property-testing crate であり、どちらでも動く。\`proptest\` は shrinking が強く（より小さい counterexample を見つける）、strategy の合成（range に対する \`in\` 構文）も書きやすい。openhl workspace は consensus crate のテストで既に proptest を引いているので、限界コストはゼロだ。**一つに決めたら貫く。コードベースの途中で乗り換えるコストは、最初に違う方を選ぶより高い。**

**Q: \`saturating_mul\` と \`saturate_i128_to_i64\` の関係は？**
\`saturating_mul\` は \`i128\`（や他の整数型）の組み込みメソッドで、その型自身の範囲内で saturated な積を生む。\`saturate_i128_to_i64\` はユーザー定義の helper で、\`i128\` を \`i64\` の範囲に clamp する。対応している境界が違う：\`saturating_mul\` は型内 overflow を防ぐもの、\`saturate_i128_to_i64\` は型をまたいだ narrowing を防ぐものだ。**両方とも必要だ — 数学が積のために i128 を、保存のために i64 を、どちらも使うからだ。**

## 次のレッスン（レッスン6）

レッスン6 では \`compute_rate\` を追加する — \`Premium\` と \`FundingParams\` を受け取って \`FundingRate\` を返す関数だ。関数は ~10 行だが、設計判断を 3 つ encode する：(a) \`divisor == 0\` のとき \`FundingRate(0)\` を返す（funding 無効化）、(b) divisor が clamp の*前*に premium を縮める、(c) \`rate_cap\` が絶対値で clamp する（負 cap と正 cap が同じ \`params.rate_cap\` を共有する）。レッスンには divisor、両側 cap、funding 無効化ケースをカバーする unit test 4 つも加える。レッスン6 を終えた時点で、3 つの pure-compute 関数のうち 2 つが完成する。`,
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

このレッスンで掴む概念:

- **演算順が単位を決める** — 先に割って、*それから* clamp する。Cap は \`4%/interval\` なので rate レベルで bind する必要がある。Clamp してから divide すると、cap の実効値が \`cap/divisor\`（Hyperliquid デフォルトなら \`0.5%/interval\`）にすり替わり、仕様が静かに弱められてしまう。
- **\`.clamp(-cap, cap)\` で対称的にクランプする** — 標準の \`i64::clamp\` が両側を一度に処理してくれる。よくあるバグは \`min(raw, cap)\` のように正側だけ clamp して負側を見落とすパターンだ。\`.clamp\` を使えばそれが構造的に防げる。
- **API 境界での defensive な \`.abs()\`** — \`FundingRate(-40_000_000)\` を「絶対値」として受け入れれば、呼び出し側のフットガンを 1 つ減らせる。コストは ~1 ns、効果は実質的だ。
- **自然に成立する edge case は明示的な分岐より強い** — \`cap == 0\` は \`clamp(0, 0) = 0\` から自動的に \`FundingRate(0)\` を生む。特例コードを書かない = テストすべきコードパスも増えない。
- **Property のない場所に proptest を強引に当てない** — \`compute_rate\` は「割って clamp」だけで、proptest が活きる代数的不変条件がない。手書きトレースで入力領域をカバーすれば十分だ。Property がない場所に無理に proptest を書く必要はない。

検証：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

上記の実行結果が 10 テストを通る（レッスン4-レッスン5 で書いた 5 つ + 新規 5 つ）。

具体的な変更:

\`compute.rs\` に加わるのは：

- **\`compute_rate(premium, params) -> FundingRate\`** — 生 premium を \`params.divisor\` で割り、\`±params.rate_cap\` に clamp して per-interval rate を生む関数。
- **unit test 5 つ** — divisor の効果、正側 cap での clamp、負側 cap での clamp、divisor=0 での無効化、cap=0 での無効化をカバーする。

レッスン6 が終われば、\`compute.rs\` の 3 つの pure 関数のうち 2 つが揃う。**残るは \`apply_funding\` だけ** — レッスン7 で扱う。

教育上の焦点は**演算順**だ：割って*から* clamp する。順序を逆にすると rate cap の意味が完全に変わってしまう — 紛れ込みやすく見つけにくい、off-by-one 系の設計バグだ。

## おさらい

レッスン5 後の状態：
- \`compute_premium\` が mark/index から符号付き premium を生む。
- Antisymmetry proptest が 256 個のランダムペアを exercise している。
- \`saturate_i128_to_i64\` は配置済みだが、これまで使っているのは \`compute_premium\` だけ。

レッスン6 では 2 つ目の pure 関数を追加する。\`compute_rate\` は \`compute_premium\` より短い（overflow 対策の体操がない — 扱う値が既に i64 に収まっているからだ）が、独自の設計判断セットを encode する。

## プラン

編集は 3 つ：

1. **\`compute.rs\` に \`compute_rate\` を追加**する — body は 10 行、\`compute_premium\` の後ろ（\`saturate_i128_to_i64\` の前）に置く。
2. **既存の \`mod tests\` ブロックに unit test を 5 つ追加**する。
3. **\`lib.rs\` を更新**する — \`compute_rate\` を \`pub use compute::{...}\` の re-export に加える。

> 🛑 **考えてみよう。** スクロール前に — まず \`raw_rate = premium / divisor\` を計算し、それから \`±cap\` に clamp するのが今回の方針だ。**順序を逆にして、先に clamp してから割るとどう変わるか？** ヒント：cap の単位を考えよ。

（答え：**先に clamp すると、cap が「最大 rate」ではなく「最大 premium」を意味するようになってしまう。** \`cap = 4%/interval\`、\`divisor = 8\` のとき、premium を \`±4%\` に clamp してから割ると最大 *rate* は \`0.5%/interval\` になる。今回のアプローチ（先に割って rate レベルで clamp）なら、cap がそのまま \`4%/interval\` で bind する。**Cap の単位は出力の単位に合わせる必要がある。** Premium と rate はどちらも \`RATE_SCALE\` でスケーリングされているので数値的には似て見えるが、意味は別物だ。Divisor が、cap が何を縛っているのかを変えてしまう。）

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

Body は 10 行、動く部分は 4 つ：

1. **\`if params.divisor == 0 { return FundingRate(0); }\`** — funding 無効化のための早期 return。これがないと \`premium.0 / i64::from(params.divisor)\` の行でゼロ除算 panic が起きる。**divisor がゼロのときに安全な対応は guard 一択だ。**

2. **\`premium.0 / i64::from(params.divisor)\`** — 除算。\`premium.0\` は \`i64\`、\`divisor\` は \`u32\` だ。\`i64::from(u32)\` がロスレスに widen する（u32 のあらゆる値が i64 に収まる）。\`i64 / i64\` で i64 の商が得られる。**結果が clamp 前の「生」per-interval rate になる。**

3. **\`let cap = params.rate_cap.0.abs();\`** — cap を絶対値として取り出す。\`params.rate_cap\` は \`FundingRate(i64)\` なので、ユーザが負の値を渡してくる*可能性がある*。Cap の符号は気にしない — 気にするのは規模だ。**Cap は「幅」であって「位置」ではない。**

4. **\`raw.clamp(-cap, cap)\`** — 対称的に clamp する。\`i64::clamp(min, max)\` は \`raw < min\` なら \`min\`、\`raw > max\` なら \`max\`、それ以外なら \`raw\` を返す。**Rust 組み込みの API なので、手書きの \`if/else\` チェーンは要らない。**

> 🛑 **やりがちな勘違い。** 「Cap に \`.abs()\` を付ける意味は？ ユーザに正の cap を渡せと要求すれば済まないか？」 **できるが、defensive な abs のほうが実行時バリデーションより安く済む。** 「負の cap」あるいは「絶対 cap、符号はどちらでも可」のつもりで \`FundingRate(-40_000_000)\` を渡したユーザは、\`FundingRate(40_000_000)\` と同じ挙動を得る。コストは \`.abs()\` の呼び出し 1 回（~1ns）、得られるのは footgun を 1 つ減らせることだ。**\`.abs()\` を入れることは、API 上で「cap はどちらの符号も受け入れる、magnitude として解釈する」と表明しているのと等価だ。**

> 🛑 **やりがちな勘違い。** 「\`params.rate_cap == 0\` も特殊ケースとして扱うべきでは？」 **不要だ — 自然に処理される。** \`cap == 0\` のとき \`clamp(-0, 0)\` は入力に関わらず \`0\` を返す。結果は \`FundingRate(0)\` で、これがまさに我々が望む funding 無効化のセマンティクスだ。**Edge case が自然に処理されるコードのほうが、明示的に edge case 分岐を書くコードより良い。**

### Step 2: なぜ先に割るのか

順序が重要だ。代替案は 2 つ：

**A) 今回のアプローチ：割ってから clamp**

\`\`\`rust
let raw = premium / divisor;
let capped = raw.clamp(-cap, cap);
\`\`\`

- Cap は*rate*レベルで bind する。
- \`cap = 4%/interval\` の意味は「1 つの interval で 4% を超えて支払わない」となる。
- Premium 100% / divisor 8 → raw 12.5%、それを 4% に clamp。

**B) 逆：clamp してから割る**

\`\`\`rust
let capped_premium = premium.clamp(-cap, cap);
let raw = capped_premium / divisor;
\`\`\`

- Cap は*premium*レベルで bind する。
- \`cap = 4%\` の意味は「1 つの premium 観測値が 4% を超えない」となる。
- Premium 100% を 4% に clamp してから 8 で割り、最終 rate は 0.5% になる。

**欲しいのはアプローチ A だ。** アプローチ B だと cap は事実上 \`0.5%/interval\`（rate_cap を divisor で割った値）になってしまい、docstring が約束している内容と合わない。

**Premium が 100% (= \`RATE_SCALE\` ppb) のとき**、両アプローチが同じ入力からどれだけ異なる出力に着地するか、データフローで並べると差が極端に見える:

\`\`\`
HL デフォルト: divisor = 8, cap = ±4%

🟢 アプローチA (今回の実装) — divide → clamp
   ┌─ Premium: 100% (1_000_000_000 ppb) ─┐
   │                                      │
   │            ┌─ / divisor 8 ──► raw rate: 12.5% (125_000_000 ppb)
   │            │                                    │
   │            │                                    ▼
   │            │                      ┌─ clamp(-4%, +4%) ─► 4% (40_000_000 ppb)  ✨ 正解
   │            ▼                      │                          │
   └────────────┴──────────────────────┘                          ▼
                                                           [FundingRate: 4%/interval]
                                                            = spec 通りの上限を bind

🔴 アプローチB (順序逆転、間違い) — clamp → divide
   ┌─ Premium: 100% (1_000_000_000 ppb) ─┐
   │                                      │
   │            ┌─ clamp(-4%, +4%) ──► clamped premium: 4% (40_000_000 ppb)
   │            │                              │
   │            │                              ▼
   │            │              ┌─ / divisor 8 ──► 0.5% (5_000_000 ppb)  ❌ spec の 1/8
   │            ▼              │                       │
   └────────────┴──────────────┘                       ▼
                                                [FundingRate: 0.5%/interval]
                                                 = cap が「premium 上限」にすり替わり、
                                                   実効上限が spec の 1/divisor になる
\`\`\`

同じ \`premium\` / \`divisor\` / \`cap\` を渡しても、関数内部の 2 行を入れ替えるだけで最終 rate が **4%** と **0.5%** という 8 倍違う値に着地する。コンパイラもテストも警告を出さない、純粋に semantics 上のバグだ。「cap の単位は出力の単位 (rate) に合わせる必要がある」が、その差を 1 文に圧縮した規律になっている。

> 🛑 **考えてみよう。** \`params.hyperliquid_default()\`（divisor=8、cap=4%）のもとで、premium が \`RATE_SCALE\`（100% の dislocation）のときに生まれる最大 rate はいくらか。

（答え：**\`FundingRate(40_000_000)\` = 4%/interval。** 順に計算する：premium.0 = 1_000_000_000（RATE_SCALE）、raw = 1_000_000_000 / 8 = 125_000_000（12.5%/interval）、cap = 40_000_000（4%）。125_000_000 に対する clamp(-40_000_000, 40_000_000) は 40_000_000 を返す。**cap がきちんと仕事をする。** アプローチ B と比較してみよう：clamped_premium = clamp(1_000_000_000, -40_000_000, 40_000_000) = 40_000_000、raw = 40_000_000 / 8 = 5_000_000（0.5%）。spec を大きく下回ってしまう。）

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

テストは 5 つ、それぞれが特定の挙動を pin する：

1. **\`rate_divides_premium_by_divisor\`** — normal なケース。Premium 1%（10_000_000 ppb）、divisor 8 → rate 0.125%（1_250_000 ppb）。期待値は紙の上の数学 \`10_000_000 / 8 = 1_250_000\` から導ける。除算の off-by-one を捕まえる。

2. **\`rate_clamps_at_positive_cap\`** — clamp が起きるのは、premium が cap を超える生 rate を生むときだ。Premium 100% → raw 12.5% → 4% に clamp。**「clamp を書き忘れた」バグを捕まえる。**

3. **\`rate_clamps_at_negative_cap\`** — #2 の負側対称版。Premium -100% → raw -12.5% → -4% に clamp。**「正側だけ clamp した」バグを捕まえる。** これは現実によくあるバグパターンで、\`raw.clamp(-cap, cap)\` の代わりに \`min(raw, cap)\` を書いて負側を見落とすケースだ。

4. **\`rate_zero_when_divisor_is_zero\`** — divisor 経由で funding 無効化するケース。premium が非ゼロでも、\`divisor = 0\` のとき関数はゼロを返す。**ゼロ除算 guard を書き忘れたケースを捕まえる。** Guard がないと、debug モードではこのテストが panic する。

5. **\`rate_zero_when_cap_is_zero_funding_disabled\`** — cap 経由で funding 無効化するケース。\`rate_cap = 0\` のとき clamp が \`[0, 0]\` になり、任意の生 rate が 0 に clamp される。**「clamp(0, 0) は 0 以外を返す」と勘違いするケースを捕まえる。** 「cap == 0 を特殊ケースとして扱わない」というアプローチが動くことも確認している。

> 🛑 **考えてみよう。** \`params.rate_cap = FundingRate(-40_000_000)\`（負の cap）にしてテスト 2 を実行したら何が起きるか。

（答え：**結果は同じ — \`FundingRate(40_000_000)\` になる。** \`.abs()\` が magnitude を取り出すからだ。絶対値が同じ負 cap と正 cap は、同じ挙動を生む。**「負の cap」は silent に受け入れられる。** これが defensive な abs のご利益だ — どちらを渡されてもユーザは合理的な挙動を得られる。）

### Step 4: \`lib.rs\` を更新

現在の re-export 行：

\`\`\`rust
pub use compute::compute_premium;
\`\`\`

これに：

\`\`\`rust
pub use compute::{compute_premium, compute_rate};
\`\`\`

これで public API に関数が 2 つ並ぶ。**アルファベット順を維持する** — \`compute_premium\` が \`compute_rate\` の前だ。レッスン7 で \`apply_funding\` が加わってもパターンは同じだ。

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

10 テストすべてが green になる。rate テスト、premium テスト、proptest すべてが通る。

よくあるエラー：

- **\`rate_zero_when_divisor_is_zero\` で panic** — 早期 return の guard を書き忘れた場合だ。\`premium.0 / 0\` は Rust では算術 panic になる。関数の先頭に \`if params.divisor == 0 { return FundingRate(0); }\` を追加すること。
- **\`rate_clamps_at_negative_cap\` で \`assertion failed: left=-125000000 right=-40000000\`** — \`raw.clamp(-cap, cap)\` の代わりに \`raw.min(cap).max(-cap)\` と書いて min / max の順序を間違えた場合だ。canonical な Rust の書き方は \`.clamp(min, max)\` — これを使うこと。
- **\`rate_divides_premium_by_divisor\` で \`assertion failed: left=0 right=1_250_000\`** — \`premium.0 / i64::from(params.divisor)\` ではなく \`premium.0 / params.divisor\`（型混在）と書いた場合だ。本来はコンパイルエラー（\`u32 vs i64\` の不一致）になるが、\`as i64\` と typo するとコンパイルは通って truncate しうる。\`i64::from(...)\` を使うこと。
- **\`lib.rs\` の re-export で \`error: cannot find function 'compute_rate'\`** — \`compute_rate\` を re-export に加えたものの、関数本体を書き忘れた場合だ。\`compute.rs\` に関数 body を実際に追加したか確認すること。

## 設計の振り返り

このレッスンに焼き込んだ決定は 4 つ：

1. **先に割って、その後 clamp する。** Cap を bind するのは*rate*レベル（出力側）で、*premium*レベル（入力側）ではない。順序を逆にすると cap を実質的に divisor で割ったのと同じことになり、silent に弱まる。**単位が違うときは演算順が決定的に重要だ。**

2. **Cap には \`.abs()\` を付ける。** ユーザが負の cap を渡してきても対応できる defensive な処理で、コストは安く（~1ns）footgun を 1 つ減らせる。**API 境界での defensive idiom は、そのコストに見合う価値がある。**

3. **手書きの min/max ではなく \`clamp(-cap, cap)\` を使う。** Rust 組み込みの \`.clamp\` は \`raw.max(-cap).min(cap)\` より短く、idiomatic で、間違えにくい。**stdlib の API でまかなえるなら使う、まかなえないときだけカスタムコードに手を出す。**

4. **\`cap == 0\` を特殊ケースとして扱わない。** Clamp から自然に正しい結果が落ちる：\`clamp(-0, 0)\` は \`0\` を返す。**Edge case が自然に処理されるコードのほうが、明示的な分岐を持つ edge case のコードより良い。** 明示的な分岐はテストすべきコードパスを増やすが、自然な処理ならそれが自動的にカバーされる。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

レッスン6 後：
- **compute.rs** が Funding参照実装コミット の \`compute_premium\` + \`compute_rate\` + \`saturate_i128_to_i64\` + 4 premium テスト + 5 rate テスト + 1 proptest まで一致。残るギャップは \`apply_funding\` と balanced-book proptest のみ（レッスン7）。
- **lib.rs** が \`compute_premium\` と \`compute_rate\` を re-export。\`apply_funding\` は レッスン7 の追加。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: どうせ \`i64\` に widen するのに、\`params.divisor\` がなぜ \`u32\` なのか？**
Widening は \`i64::from(u32)\` の呼び出し 1 つで済むからだ — マシンコード上は no-op だ。\`u32\` で保存することのメリットは、ビットコストの節約（\`FundingParams\` は \`Copy\` で、小さい方がよい）と意味的な明快さ（divisor が \`-1\` や \`u64::MAX\` では意味不明だが、\`u32::MAX\` は ~40 億で十分なヘッドルームがある）にある。**\`u32\` を選ぶこと自体が「これは小さな正のカウントだ」という意図の documentation になる。**

**Q: \`compute_rate\` で overflow しうるか？**
しない。除算 \`premium / divisor\` は値を大きくしない — 正の整数除算は magnitude を小さくするだけだ。\`clamp(-cap, cap)\` も \`cap\` の i64 値を超えて成長することはない。**\`compute_rate\` 内で overflow は起こらない。** \`compute_premium\` と違って i128 中間値も不要だ。

**Q: \`rate_cap > i64::MAX / 2\` のときはどうなるか？ 対称な clamp は機能するのか？**
\`i64::MIN\` に対する \`.abs()\` は panic する。理由は**2 の補数表現の非対称性**だ: 符号付き 64 bit には負の数が正の数より 1 個多く詰め込まれている (負側は \`i64::MIN = -2^63\` まで、正側は \`i64::MAX = 2^63 - 1\` まで) ので、\`|i64::MIN| = 2^63\` という値は正の \`i64\` で表現できる範囲を 1 だけ超えてしまう。つまり \`i64::MIN.abs()\` は overflow し、debug build では panic / release build では wrap となる。だから \`rate_cap.0 == i64::MIN\` のときは \`.abs()\` が踏み抜く。Funding参照実装コミット ではこれを guard していない — ユーザ提供の \`FundingParams\` 側の問題として扱う。現実のデプロイでは \`40_000_000\`（\`i64::MAX / 2\` よりはるかに小さい）のような値を使うため、このエッジには届かない。**defensive な \`saturating_abs()\`（\`i64::MIN\` を \`i64::MAX\` に丸める）を入れれば対応できるが、Funding参照実装コミット では採用していない。**
加えて実運用では、ガバナンス経由のパラメータ更新や設定ロード時に \`rate_cap\` の境界（例: \`0..=40_000_000\`）を先に検証するのが通常で、\`i64::MIN\` のような爆弾値は pure 計算層まで到達させない。ここでも Defense in Depth を使う。

**Q: \`compute_rate\` の proptest がないのはなぜか？**
明らかな代数的 property が見当たらないからだ。「Divide and clamp」には proptest が輝くような antisymmetry や可換性、その他の不変条件がない。代わりに手書きトレーステスト 5 つで入力領域（通常の除算、正側 clamp、負側 clamp、divisor 0、cap 0）をきれいにカバーしている。**proptest は property に向き、手書きトレースは個別の入力領域に向く。** property がない場所に無理に proptest を当てる必要はない。

## 次のレッスン（レッスン7）

レッスン7 では \`apply_funding\` を追加する — 3 つ目で最後の pure 関数だ。\`Position\` のスライスと \`MarkPrice\`、\`FundingRate\` を受け取り、\`Vec<Settlement>\`（非 flat な position 1 つにつき 1 つ）を返す。関数は ~25 行だが、*longs-pay-shorts* の符号規約を encode し、**balanced-book zero-sum** の proptest を伴う — 等しく逆向きの position の集合に対して、settlement delta の合計はゼロになる（funding は再配分するだけで、quote currency を生成も破壊もしない）。Crate 2 つ目の proptest であり、これで セクション2 が閉じる。`,
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

このレッスンで掴む概念:

- **単項マイナス 1 つが符号規約全体を担う** — \`-delta_unscaled\` で「市場中心（longs が支払う）」から「アカウント中心（\`Notional\` 正 = 受取）」へと flip する。符号反転点が 2 箇所あれば、バグの表面積も 2 倍になる。1 箇所に集約することが契約だ。
- **保存則を proptest で pin する** — balanced book の settlement の合計は、saturation を踏まない範囲では「ちょうど」ゼロだ。正の \`d\` のもとで \`-x/d = -(x/d)\` が整数除算でも成立するからだ。Funding は再配分するだけで、quote currency を生成も破壊もしない。
- **Flat position はフィルタする、エラーにはしない** — \`size == 0\` は黙ってドロップする。\`Result<Vec<Settlement>, FlatPositionError>\` を返してしまうと、呼び出し側に「異常ではない条件」まで扱わせる。Flat position は*想定内*の状態であって例外ではない。
- **最も制約の弱い引数型を受け取る** — \`positions: &[Position]\`（スライスの借用）なら呼び出し側が所有権を保持し、tick をまたいで再利用できる。\`Vec<Position>\` を要求してしまうと毎回 clone を強制する。
- **Proptest のレンジは property が*厳密に*成立するように選ぶ** — \`size in 1..1M\` であれば i128 の積が \`saturating_mul\` の clamp 閾値を踏まずに済む。レンジを広げると「合計 == 0」を「\`sum.abs() < epsilon\`」へと弱める必要が出てくる — それは不変条件ではなく願望の property になってしまう。

検証：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

上記の実行結果が 15 テストを通る（レッスン4-レッスン6 で書いた 10 + 新規 5）。

具体的な変更:

\`compute.rs\` には最後の pure 関数が加わる：

- **\`apply_funding(positions, mark, rate) -> Vec<Settlement>\`** — rate をすべての non-flat な position に適用し、マッチごとに settlement を生む。~25 行。
- **手書きトレース unit test 4 つ**：
  - \`apply_funding_skips_flat_positions\`
  - \`apply_funding_longs_pay_shorts_when_rate_positive\`
  - \`apply_funding_shorts_pay_longs_when_rate_negative\`
  - \`apply_funding_returns_empty_on_zero_rate\`
- **proptest 1 つ** — \`balanced_book_settlements_sum_to_zero\` — 等しく逆向きの position ペアであれば、settlement の合計は常にゼロになる、というもの。**Funding の根本的な保存則だ：再配分するだけで、生成も破壊もしない。**

このレッスンで **セクション2 が閉じる**。3 つの pure 関数（\`compute_premium\`、\`compute_rate\`、\`apply_funding\`）がすべて揃う。セクション3（clock state machine）は レッスン8 で始まる。

教育上の焦点は**符号規約**（longs-pay-shorts）、特にコードが*どう*それを表現するかにある：\`delta_unscaled\` の前に置く \`-\` 1 文字。たった 1 文字が符号契約全体を担う。

## おさらい

レッスン6 後の状態：
- \`compute_premium\` → \`Premium\`
- \`compute_rate\` → \`FundingRate\`
- 10 テスト pass、proptest 1 つも pass。
- \`saturate_i128_to_i64\` のユーザは 1 つだけ（\`compute_premium\`）。

レッスン7 では pipeline の最終段を組み立てる — rate をアカウントごとの settlement に落とし込む段だ。同時に、saturate helper の 2 番目のユーザも追加する。

## プラン

編集は 3 つ：

1. **\`compute.rs\` に \`apply_funding\` を追加**する — \`compute_rate\` の後、\`saturate_i128_to_i64\` の前に置く。
2. **既存の \`mod tests\` ブロックに、unit test 4 つと proptest 1 つを追加**する。
3. **\`lib.rs\` を更新**する — \`apply_funding\` を re-export に加える。

> 🛑 **考えてみよう。** スクロール前に — \`size: PositionSize(i64)\`（正 = long、負 = short）と \`rate: FundingRate(i64)\`（正 = longs が shorts に支払う）がある。素朴に \`size × rate\` を計算すると、long が正の rate の世界にいるときに値は正になる。**だが long の settlement delta は*負*であるべきだ（longs が支払う側だからだ）。** 符号反転を一番きれいに encode する方法は何か。

（答え：**積の前に \`-\` を 1 つ付ければよい。** \`delta = -(size × mark × rate / RATE_SCALE)\`。積 \`size × rate\` は「magnitude × payment-flow の方向」を自然に encode するが、\`Notional\` の符号規約は「アカウント中心」（正 = 受取、負 = 支払い）だ。\`-\` がそれを市場中心からアカウント中心へとフリップしてくれる。**単項マイナス 1 つが規約全体を担う。** コードを読む人は、その \`-\` を見て「ここで規約が意図的に反転されている」と分かる。）

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

~25 行、動く部分は 6 つ：

1. **\`if rate.0 == 0 { return Vec::new(); }\`** — zero-rate のファストパス。allocation も作業もなし。契約をそのまま反映する：rate がゼロ = 適用すべき funding なし。boot 中や oracle 故障時に典型的な状況だ。

2. **\`Vec::with_capacity(positions.len())\`** — 出力の capacity を事前確保する。Flat position は後でフィルタされうるが、input の長さは良い上限になる。**push しながら再アロケートが走るのを防ぐ。** 小さな最適化だが、hot path では効いてくる。

3. **\`if pos.size.0 == 0 { continue; }\`** — Flat な position をスキップする。経済的エクスポージャがないので、settle してもゼロ delta が出力を汚すだけだ。**Flat position があると、output の長さと input の長さは一致しない、というのが契約だ。**

4. **\`i128::from(pos.size.0).saturating_mul(i128::from(mark.0))\`** — notional の積。\`size * mark\` は、position が大きく mark も大きい場合に \`i64::MAX\` を超えうる（例：position \`1e18\` × mark \`1e10\` = \`1e28\` で、i64 をはるかに超える）。**i128 + saturating_mul：\`compute_premium\` と同じ defensive なレシピだ。**

5. **\`notional.saturating_mul(i128::from(rate.0))\`** — 次の積。これで \`size × mark × rate\` をすべて i128 で持てる。この段階でも pathological な入力に対しては i128 が saturate しうる。

6. **\`-delta_unscaled / i128::from(RATE_SCALE)\`** — 最終的なスケーリングと符号反転。\`RATE_SCALE\` での除算が rate に施した per-billion スケーリングを打ち消す。**先頭の \`-\` が符号規約を担う。**

その後 \`saturate_i128_to_i64(delta_scaled)\` で i64（Notional の内部型）に clip し、\`Settlement\` を push する。

> 🛑 **考えてみよう。** この関数が \`positions: Vec<Position>\`（owned vec）ではなく \`positions: &[Position]\`（スライス）を受け取る理由は何か。

（答え：**呼び出し側が position リストを所有していて、tick をまたいで再利用するからだ。** 所有権を奪う形にすると、呼び出し側は毎回呼び出す前に clone する必要が出てくる。Slice の借用はコストゼロで、呼び出し側は所有権を保持できる。**関数が使える型のうち、最も制約の弱いものを受け取る** — iteration だけで足りるなら、Vec ではなく slice にする。）

> 🛑 **やりがちな勘違い。** 「ループでなく \`positions.iter().filter(...).map(...).collect()\` を使えばよくないか？」 **動くし、Rust としてはより idiomatic だ。** Funding参照実装コミット で imperative なループを採っているのは、中間計算を別々の \`let\` binding として置く方が追いやすいからだ。関数チェーン \`positions.iter().filter(|p| p.size.0 != 0).map(|pos| { let notional = ...; Settlement { ... } }).collect()\` も同じく動く。**idiom より可読性を優先する** — チームがデバッグしやすい形を選ぶ。

### Step 2: 符号規約を歩く

符号反転は関数中もっとも微妙な部分だ。4 つの regime (Long/Short × 正/負 rate) で、先頭の単項マイナス \`-\` がどう最終出力を制御するかをマトリクスで眺めると、たった 1 文字に符号契約全体が乗っていることが見える:

\`\`\`
【 正 rate (rate > 0)：longs が支払う局面 】
  Long  (+size) × (+rate) ──► (+ 積) ──► [ - ] ──► Notional(負)  ──► 支払い ⭕
  Short (-size) × (+rate) ──► (- 積) ──► [ - ] ──► Notional(正)  ──► 受取   ⭕

【 負 rate (rate < 0)：shorts が支払う局面 】
  Long  (+size) × (-rate) ──► (- 積) ──► [ - ] ──► Notional(正)  ──► 受取   ⭕
  Short (-size) × (-rate) ──► (+ 積) ──► [ - ] ──► Notional(負)  ──► 支払い ⭕
\`\`\`

\`size × rate\` の生の積が市場中心 (longs pay = 正) でどんな符号を取ろうとも、先頭の \`-\` を 1 度通すだけで、4 ケースすべてが \`Notional\` 規約 (正 = アカウントの受取、負 = アカウントの支払い) に完璧にアラインする。**「1 文字に 1 つの設計判断を込める」とはこのことだ。** 以下で 4 ケースを具体的な数値で追う:

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

**負 rate、short position：**
- \`size.0 = -50\`、\`mark.0 = 100\`、\`rate.0 = -1_000_000\`
- \`notional = -50 × 100 = -5_000\`
- \`delta_unscaled = -5_000 × -1_000_000 = 5_000_000_000\`（正 i128）
- \`delta_scaled = -5_000_000_000 / 1_000_000_000 = -5\`
- \`Notional(-5)\` → 「short が 5 支払う」 ✓

**\`delta_unscaled\` の前の \`-\` 1 つが、4 ケースすべてで符号規約を一貫して担う。** これがないと、longs が支払うべき場面で受け取ってしまい、逆も然りだ。**1 文字に 1 つの設計判断を込めている。**

> 🛑 **やりがちな勘違い。** 「\`-\` を付けずに「市場 delta」として計算しておき、ストレージ層で反転すればよくない？」 **符号反転ポイントを 2 つ持つと、バグの可能性が 2 倍になる。** 数学レイヤーで一度だけ「アカウント中心」を encode しておけば、下流（bridge、balance、telemetry）はすべて統一された規約で \`Notional\` を読める。**変換ポイントを 1 つに絞れば、テストすべき surface area が半分になる。**

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

テストは 4 つ、それぞれ挙動を pin する：

1. **\`apply_funding_skips_flat_positions\`** — 入力 position 3 つ、うち 2 つが flat。出力は 1 つ。フィルタの semantics を確認する。**生き残った settlement のアカウントが、non-flat な入力 position と一致することも確認している。**

2. **\`apply_funding_longs_pay_shorts_when_rate_positive\`** — 標準的なシナリオ。Mark 100 で long position 100、rate 0.1% → delta -10（long が支払う）。Short position -50 → delta +5（short が受け取る、サイズが半分なので magnitude も半分）。**非対称な magnitude を使うことで、delta が \`|size|\` でスケールすること（符号だけでなく）も証明している。**

3. **\`apply_funding_shorts_pay_longs_when_rate_negative\`** — 同じ position に対して rate を反転させたケース。今度は long が +10 受け取り、short が -5 支払う。**符号規約が対称であることを確認している。**

4. **\`apply_funding_returns_empty_on_zero_rate\`** — fast-path のケース。position は空ではないがゼロ rate → 空の出力。**早期 return が position ごとの処理より前に走ることを確認している。**

\`pos(account, size)\` helper は レッスン5 のテストモジュール setup で追加済みなので、ここで自由に使える。

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

**Zero-sum property は funding の根本的な保存則だ。** Balanced book — 同じサイズの short 1 つにつき long 1 つ — では、ちょうど再配分が起きるはずだ。Shorts が集合として受け取る量と longs が集合として支払う量が等しく、quote currency は生成も破壊もされない。

ここで重要なのは、整数除算の切り捨てがあっても \`(+P, -P)\` の対称ペアでは恒等式 \`(-P) / d == -(P / d)\`（\`d > 0\`）が保たれる点だ。つまり long と short を厳密に反対符号・同一絶対値で組んだこのテストでは、端数も対称に相殺され、tolerance なしで和が厳密に 0 に揃う。

proptest はこれを exercise する：
- \`size\`（1 から 1M）、\`mark\`（1 から 1M）、\`rate\`（-10M から +10M ppb、つまり -1% から +1%）をランダムに**生成**する。
- Balanced book を**構築**する：account 1 が long \`size\`、account 2 が short \`size\`。
- **Funding を適用**する。Rate がゼロなら出力は空（settlement なし）、そうでなければ settlement が 2 つ生まれる。
- delta の合計が 0 であることを **assert** する。

> 🛑 **考えてみよう。** \`size\` を full i64 範囲ではなく \`1i64..1_000_000\` に絞っているのはなぜか。

（答え：**\`size\` や \`mark\` が極端に大きいと、i128 中間値が saturate しうるからだ。** \`i128::saturating_mul\` が clip すると、ラウンドトリップの計算 \`(size * mark * rate / RATE_SCALE)\` が情報を失う — long 側の saturate 後の値が short 側の saturate 後の値のちょうど負にならず、zero-sum property が壊れる。**1M の上限を置けば、入力を saturation の起きない領域に留められる。** 現実の production proptest はもっと広い範囲を取れるが、その場合は saturation のための tolerance を加える必要がある。今回はもっと単純な「saturation の起きない領域だけ」のアプローチを選んだ。）

> 🛑 **やりがちな勘違い。** 「整数除算の rounding に備えて \`== 0\` ではなく \`sum.abs() < 1\` をテストすればよくないか？」 **選んだ入力範囲のもとでは、property は厳密に成り立つ。** \`size_long == -size_short\` なので、除算前の i128 の積は互いに厳密な負、\`RATE_SCALE\` で割っても関係は維持される（整数除算はゼロに向かって丸めるので、任意の符号付き \`x\` と正の \`d\` に対して \`-x / d == -(x / d)\` が成り立つからだ）。**範囲内では厳密に zero-sum であり、tolerance は不要だ。**
>
> 「整数除算は端数を切り捨てるのに、合計が \`+1\` や \`-1\` にズレないのはなぜか？」 — long と short の \`i128\` 積が \`(P, -P)\` のように**絶対値が完全に同じで符号だけ反転したペア**になっているからだ。たとえば積が \`(12_345, -12_345)\` のとき、\`12_345 / 1_000_000_000 = 0\` 余り \`12_345\`、\`-12_345 / 1_000_000_000 = 0\` 余り \`-12_345\`。商は両方 \`0\` で、切り捨てられる端数も**絶対値が完全に一致して符号だけ逆向き**なので、合計すると端数も商もそれぞれ \`0\` に揃う。長辺と短辺の入力が厳密に対称である限り、\`-x / d == -(x / d)\` の恒等式が個別に成立し、合計の zero-sum が tolerance なしで守られる仕組みだ。

### Step 5: \`lib.rs\` を更新

現在の re-export：

\`\`\`rust
pub use compute::{compute_premium, compute_rate};
\`\`\`

これに：

\`\`\`rust
pub use compute::{apply_funding, compute_premium, compute_rate};
\`\`\`

アルファベット順だ。**これで セクション2 の 3 つの pure 関数がすべてクレートルートで re-export された。** 呼び出し側は \`compute::\` を経由せずに使える。

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
... (レッスン4-レッスン6 テストの残り)

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**15 テストすべてが green。** rustdoc warning は 1 つだけだ（\`FundingClock\` — レッスン8 で解決する）。**これで セクション2 が閉じる。**

よくあるエラー：

- **どこでも \`delta == 0\` になる** — \`delta_unscaled\` の前の \`-\` を忘れた場合。符号反転がないと、longs と shorts が同じ符号の delta を得てしまう（\`pos.size\` 自体が既に符号を担っているからだ）。longs と shorts が両方とも支払い、あるいは両方とも受け取る形になってしまい、相殺しなくなる。Unit test がすぐ捕まえてくれる。
- **long も short も支払う**（両方が負の delta） — \`pos.size\` が signed であることを見落とした場合。素朴な \`size * mark * rate\`（upcast なし）でも動くことはあるが、符号追跡が脆い。\`i128::from(pos.size.0)\` を経由して、乗算の中で符号を保ち続ける必要がある。
- **\`size = 100_000, mark = 100_000\` で proptest が失敗** — \`size * mark = 1e10\`、その後 \`× rate = 1e16\` — i128 の範囲内だ。Property は成立するはずなので、失敗するなら符号反転を確認すること：long と short が反対符号 + 等しい規模の delta を生む必要がある。
- **\`assertion failed: s[0].delta == Notional(-10)\` だが \`Notional(10)\` が出る** — \`delta_unscaled\` の式は正しいが、先頭の \`-\` を忘れた場合。「longs pay = 負の delta」という規約が、その反転を要求する。

## 設計の振り返り

このレッスンに焼き込んだ決定は 4 つ：

1. **単項マイナス 1 つが符号規約全体を担う。** \`-delta_unscaled\` で「longs pay」を encode することで、規約は市場中心とアカウント中心の semantics 境界の 1 箇所だけに集約される。**符号反転ポイントを 2 つに増やすと、バグの surface area が 2 倍になる。**

2. **エラーにせず、フィルタする。** Flat position は silent にフィルタする。\`Result<Vec<Settlement>, FlatPositionError>\` のような形は返さない — flat position は*想定された状態*（この tick より前に閉じられたアカウント）だからだ。**「flat position が混じっていない」という property は、気になる呼び出し側が事前に検証すれば済む。こちら側は単に drop する。**

3. **入力は slice、出力は owned。** \`&[Position]\` を取ることで呼び出し側に所有権を残し、\`Vec<Settlement>\` を返すことで呼び出し側がそれまで持っていなかった owned data を渡せる。**関数が参照を消費して値を生む、pure な変換だ。**

4. **proptest の範囲を saturation regime から避ける。** \`size in 1..1M\` のように絞ることで、i128 の積を \`saturating_mul\` の clamp 閾値より下に保つ。この範囲では property が*厳密に*成り立つ。範囲を広げると property を弱める必要が出てくる。**proptest の範囲は、property を近似でなく厳密に真にできるように選ぶ。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/compute.rs ./crates/funding/src/compute.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

レッスン7 後の状態：
- **compute.rs** が Funding参照実装コミット と**完全に**一致する。3 つの pure 関数すべて、helper すべて、テストすべて、proptest すべてが揃う。
- **lib.rs** が \`apply_funding\`、\`compute_premium\`、\`compute_rate\` を re-export している。残るギャップは \`pub mod clock;\` とその re-export — レッスン8 で埋める。

**セクション2 完了。** セクション3 は レッスン8 で始まる。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: 出力をアカウント順にソートせず、入力順を保つのはなぜか？**
Determinism のためだ。ソートはソート順の選択を強要するが、入力順を保つほうが、関数の挙動が入力から自明に予測可能になる。**ソートされた出力が必要な呼び出し側は自分でソートすればよく、不要な呼び出し側はコストを払わずに済む。** デフォルトとして最も安価な挙動を採る。

**Q: 現実的な入力では \`notional × rate\` の桁数はどれくらいになるか？**
\`size = 1M\`、\`mark = 1M\`、\`rate = 1e7\`（RATE_SCALE の 1% = interval あたり 1%）で計算すると \`notional = 1e12\`、\`delta_unscaled = 1e19\` になる。これは \`i64::MAX\`（~9.2e18）のすぐ近くで、「合理的」と言える入力ですら saturation regime に届きうる。**現実のデプロイで i128 中間値は optional ではない。**

**Q: \`apply_funding\` の saturation 挙動のテストがないのはなぜか？**
Saturation ケースは*helper を通じて*すでにテスト済みだからだ（\`saturate_i128_to_i64\` の境界挙動は レッスン5 で探っている）。同じ境界を関数呼び出し越しに再テストするのは冗長になる。**Helper を 1 度テストしたら、あとはそれを信用する。** 念のため composition test（\`size = u64::MAX, mark = u64::MAX, rate = i64::MAX\` のような）を足す価値はあるかもしれないが、Funding参照実装コミット では採用していない — saturation の保証は helper から来ており、その helper はテスト済みだ。

**Q: 巨大な position リストに対して \`apply_funding\` を \`parallel_iter\` 化できるか？**
できる、\`rayon\` を使えばよい。ただし V0 では position リストはせいぜい数千アカウント（HL の現実のユーザ数、1 マーケットあたり）規模で、並列化のオーバーヘッドが処理量を上回る。**tick あたり 10K+ position まで増えれば rayon が payoff してくる。** Production のトラフィックが要求するまで、これは先送りでよい。

## セクション2 マイルストーン — 築き上げたもの

レッスン7 後の状態：
- **pure 関数 3 つ**：\`compute_premium\`、\`compute_rate\`、\`apply_funding\`。
- **private helper 1 つ**：\`saturate_i128_to_i64\`。
- **テスト 15 個**：手書きトレース 13 個 + proptest 2 個（antisymmetry、zero-sum）。
- **\`compute.rs\` は ~150 行**（テストを除く）。
- セクション2 で書いた部分は、clock 以外のすべてが **Funding参照実装コミット と 一致** だ。

Crate は今や \`(positions, mark, index, params)\` のタプルから、完全に決定論的に \`Vec<Settlement>\` を生む。**数学は完成した。** セクション3 では、これを tick-gating の state でラップする — いつ計算し、いつスキップし、いつ settle するか、を担う部分だ。

## 次のレッスン（レッスン8）

レッスン8 では \`crates/funding/src/clock.rs\` を作成する — 新モジュールで、\`FundingClock\` 構造体と \`FundingTick\` 出力型を持つ。最初のバージョンの \`tick()\` も追加する：「十分な時間が経過したか？」の guard の背後で、\`compute_premium\`、\`compute_rate\`、\`apply_funding\` を組み合わせる関数だ。**Clock は pure な数学を正しい cadence で呼び出す discrete event loop だ。** レッスン8 のテストは単純な sanity テストだけで、*不変条件*（interval ごとに最多 1 回、no-catch-up）は レッスン9 と レッスン10 でそれぞれ独立したレッスンを受け持つ。`,
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

このレッスンで掴む概念:

- **Pure 関数の上に discrete event loop を載せる** — Clock の仕事は「正しいタイミングで数学を呼ぶ」「間違ったタイミングでは呼ばない」の 2 つだけだ。セクション2 の数学はそのままで、Clock は*いつ*を足すレイヤーであって、*何を*計算するかには手を入れない。
- **常に値を返すのではなく \`Option<FundingTick>\` を返す** — \`None\` だけで「state は変化していない」を安価に伝えられる。呼び出し側は \`if let Some(tick) = clock.tick(...)\` と書けばよい。常に何かを返す形にすると \`if !tick.settlements.is_empty()\` のような曖昧なチェックを書く羽目になる（settlements が空でも「fire したが position がなかった」のか「そもそも fire していない」のか区別できない）。
- **レイヤード composition、再実装はしない** — \`tick()\` は \`compute_premium → compute_rate → apply_funding\` を順に呼ぶだけで、それぞれの中身は知らない。「数学が計算する、clock が gate する」という責任分離を、ファイルレベルでそのまま体現している。
- **テレメトリのために中間値を出力に出す** — \`FundingTick\` には \`settlements\` だけでなく \`premium\` と \`rate\` も載せる。「tick 12345 の rate は 0.125% だった」とログに残したい observer はこれを直接読めばよい。再計算は乖離の温床だ。
- **Module doc で契約を約束し、コードとテストでそれを守る** — \`clock.rs\` の冒頭で 2 つの不変条件（at-most-one-per-interval、no-catch-up）をコードより先に宣言する。レッスン8 が構造を作り、レッスン9 と レッスン10 がテスト側で不変条件を強制する。理由を確認できる場所は doc、コード、テストの 3 箇所だ。
- **契約上シングルスレッドにする** — 並行性は呼び出し側の責任であって、データ構造の責任ではない。\`last_settled_at\` を \`AtomicU64\` にしても、このレイヤーで存在しない直列化問題のために複雑性を足すだけだ。

検証：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

上記の実行結果が 18 テストを通る（レッスン4〜7 で書いた 15 + 新規 3）。

具体的な変更:

Crate には**3 つ目で最後のモジュール**が加わる：

- **\`crates/funding/src/clock.rs\`** — 新規ファイル。module doc、構造体 2 つ、impl ブロック 1 つを置く：
  - **\`FundingClock\`** — \`params: FundingParams\` と \`last_settled_at: u64\` を保持する。funding tick の間で持ち越す state だ。
  - **\`FundingTick\`** — \`settled_at\`、\`premium\`、\`rate\`、\`settlements\` を運ぶ出力型。\`tick()\` が成功したときに返す。
  - **\`impl FundingClock\`** — \`new\`、\`params\` / \`last_settled_at\` の accessor、\`tick(...)\` 関数。
- **サニティテスト 3 つ**：
  - \`first_tick_before_interval_returns_none\`
  - \`first_tick_at_exact_interval_fires\`
  - \`empty_positions_yield_empty_settlements_but_still_advance_clock\`
- **\`crates/funding/src/lib.rs\`** — \`pub mod clock;\` の宣言と、\`FundingClock\` / \`FundingTick\` の re-export を追加する。**これで最後の rustdoc warning も解消する。**

レッスン8 は**モジュールのオープナー**だ。この clock を微妙にしている不変条件 — *interval ごとに settlement は最多 1 回*、*長いギャップ後の no catch-up* — は、それぞれ専用のレッスン（レッスン9 と レッスン10）で扱う。レッスン8 では、その土台となる構造を確立する。

教育上の焦点は **discrete event loop を伴う state machine** だ：pure な関数（数学）を、stateful なオブジェクト（clock）でゲートしつつ、determinism を失わないようにする、というやり方だ。

## おさらい

レッスン7 後の状態：
- 3 つの pure 関数（\`compute_premium\`、\`compute_rate\`、\`apply_funding\`）がすべて green。
- 15 テスト pass、proptest を 2 つ含む。
- \`compute.rs\` が Funding参照実装コミット と 一致。
- Crate は funding の*数学*を計算できるが、まだ*いつ*それを適用するかは知らない。

レッスン8 ではその「いつ」を組み立てる。Clock は数学を正しいタイミングで呼ぶ薄いレイヤーだ — そして決定的に重要なのは、*間違った*タイミングでは呼ば*ない*ことだ。

## プラン

ファイル編集は 3 つ：

1. **\`crates/funding/src/clock.rs\` を作成**する — module doc、imports、\`FundingClock\`、\`FundingTick\`、\`impl FundingClock { new, params, last_settled_at, tick }\` を入れる。
2. **\`clock.rs\` に \`#[cfg(test)] mod tests\` を追加**し、サニティテストを 3 つ入れる。
3. **\`crates/funding/src/lib.rs\` を更新**する — \`pub mod clock;\` の追加と、\`FundingClock\` / \`FundingTick\` の re-export を行う。

> 🛑 **考えてみよう。** スクロール前に — \`tick()\` は \`Option<FundingTick>\` を返す（settlement があれば \`Some\`、なければ \`None\`）。**なぜ \`Option\` を返すのか。\`FundingTick\` を常に返す（settlement がないときは空の \`settlements\` を持つ形）形にしないのはなぜか？** ヒント：呼び出し側が結果をどう扱うかを考えよ。

（答え：**\`None\` だけで「state 変化なし」を通知でき、呼び出し側が結果を inspect するまでもないからだ。** Funding tick をブロック生成ループに繋ぐ呼び出し側は、\`FundingApplied\` イベントを発火するか、settlement をログするか、といった判断を安く済ませたい。\`Option\` なら \`if let Some(tick) = clock.tick(...)\` という自然な形が書ける。常に何かを返す形にすると、呼び出し側に \`if !tick.settlements.is_empty()\` のようなチェックを書かせる— それは正しい意味すら表せない（空の settlement リストは「tick が fire したが position がなかった」かもしれないし、「そもそも tick が fire していない」かもしれない）。**\`Option\` は、この二分を型レベルで明示してくれる。**）

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

注目点は 2 つ：

**Module doc が両方の不変条件を冒頭で明示している。** 実際に強制するのは \`tick()\`（interval guard）と レッスン9 / レッスン10 のテストだが、*契約*はここ、ファイル最上部に置いてある — モジュールを読む人は、コードを見る前に両不変条件を見る。**契約を約束し、下のコードとテストで守る。**

**Imports は必要なものを一通り引っ張ってくる。** \`apply_funding\`、\`compute_premium\`、\`compute_rate\`（セクション2）、\`FundingParams\`、\`FundingRate\`、\`IndexPrice\`、\`MarkPrice\`、\`Position\`、\`Premium\`、\`Settlement\`（セクション1）。**レッスン4 の compute.rs の import と同じ理屈で、boilerplate を早めに安定化させる。**

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

フィールドは 2 つで、いずれも*private*：

1. **\`params: FundingParams\`** — ネットワーク単位の config（interval_secs、rate_cap、divisor）。construction で set し、\`params()\` 経由で読めるが mutate はできない。**construction 後は immutable だ — production の deployment が動作中に funding params を変えることはない。**

2. **\`last_settled_at: u64\`** — 直近の成功した tick のタイムスタンプ。成功 tick のたびに更新する。**可変 state はこれだけだ。**

derive するのは \`#[derive(Clone, Debug)]\` のみ。**\`Copy\` は付けない** — \`Clone\` で十分に安価だし、clock を気軽に複製できてしまうと「どのコピーが advance しているのか」を見失う事故が起きやすい。**\`Eq\` / \`Hash\` / \`PartialOrd\` も付けない** — clock は意味のある等価比較ができない、運用上の state machine だからだ。

> 🛑 **やりがちな勘違い。** 「並行 tick をサポートするために \`last_settled_at\` を \`AtomicU64\` にすべきでは？」 **だめだ — funding crate は契約として single-threaded だ。** 並行に funding tick が走ると、\`last_settled_at\` だけでなく、\`CLOB_STATE\` や bridge が下流で使う balance store でも race が起きる。正解は「呼び出し側で tick を直列化する」であって、「clock 側で並行性を扱う」ではない。**並行性をデータ構造側に押し込むと、本来存在すべきでない問題に複雑さを足してしまう。**

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

フィールドは 4 つで、すべて \`pub\` だ。**出力 struct は典型的に全フィールドを public にする** — 呼び出し側がそのまま消費する plain なデータであって、encapsulate された state ではないからだ。

各フィールドが運ぶ意味：

- **\`settled_at: u64\`** — tick が適用されたタイムスタンプ（= \`tick()\` への \`now\` 引数）。
- **\`premium: Premium\`** — この tick で計算した premium（telemetry / event emission 用）。
- **\`rate: FundingRate\`** — divisor と cap を適用した後の per-interval rate（同じく telemetry 用）。
- **\`settlements: Vec<Settlement>\`** — \`apply_funding\` が生んだもの。実際に適用される delta だ。

**Bridge が必要としているのは \`settlements\` だけなのに、なぜ \`premium\` と \`rate\` も含めるのか？** Telemetry のためだ。「tick 12345 の funding rate は 0.125% だった」とログに残したい observer は、\`tick.rate\` を直接読みたい。これらのフィールドがないと telemetry は rate を再計算する羽目になる — 二重の作業になるし、どちらかが変わったときに実際の rate と食い違うリスクが生まれる。**下流の consumer が欲しがる中間値は、出力 struct で素直に surface する — 再計算は乖離を呼び込む。**

\`PartialEq, Eq\` を derive しているのはテスト容易性のためだ — テストで \`assert_eq!(tick, expected)\` と書ける。**安価で有用な選択だ。**

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

メソッドは 4 つ：

#### \`new(params, genesis_time)\`

Clock を construct する。**\`const fn\`** なので、コンパイル時に \`static DEFAULT_CLOCK: FundingClock = FundingClock::new(...)\` と書ける。**\`#[must_use]\`** を付けてあるのは、clock を構築してそのまま捨てるのは常にバグだからだ。

Doc にはタイミングの semantics も書いてある：「\`genesis_time + interval_secs\` 以降の最初の tick で fire する」。\`genesis_time = 1_000_000\`、\`interval_secs = 3600\` を渡した呼び出し側は、最初の tick が \`1_003_600\` 以降で fire することを把握できる。**驚きはない。** ここでの timestamp は Unix time の**秒単位**であり、ミリ秒ではない点を固定しておく（\`+3600\` はちょうど 1 時間）。

#### \`params()\` と \`last_settled_at()\` アクセサ

Private フィールドへの read-only アクセスだ。両方とも **\`const fn\`** + **\`#[must_use]\`** にしている。\`&FundingParams\` ではなく値で返す — \`FundingParams: Copy\` だからだ。**Copy なら安価で、呼び出し側にライフタイムの面倒も持ち込まない。**

#### \`tick(&mut self, now, mark, index, positions)\`

Clock の核心となるメソッド。論理的には 3 つの phase が時間制御 → 純粋計算 → state 更新の順に重なっていて、これがこの crate のレイヤード composition そのものだ:

\`\`\`
【 FundingClock::tick(&mut self, now, mark, index, positions) 】

  1. Guard (時間制御レイヤー)
     ┌────────────────────────────────────────────────────────────────────┐
     │ if now < last_settled_at + interval_secs                           │
     │     return None     ◄── 静かに終了。state は変化していない          │
     └────────────────────────────────────────────────────────────────────┘
              │ (条件を満たす場合のみ下へ)
              ▼

  2. Compute (ステートレス計算レイヤー — セクション2 の関数の合成)
     ┌────────────────────────────────────────────────────────────────────┐
     │   (mark, index)        ──► compute_premium  ──► Premium             │
     │                                                    │                │
     │   (premium, params)    ──► compute_rate     ──► FundingRate         │
     │                                                    │                │
     │   (positions, mark, rate) ──► apply_funding ──► Vec<Settlement>     │
     │                                                                     │
     │   ※ どの関数も clock の state を読まない / 書かない。pure。           │
     └────────────────────────────────────────────────────────────────────┘
              │
              ▼

  3. State 更新 + Return (出力レイヤー)
     ┌────────────────────────────────────────────────────────────────────┐
     │ self.last_settled_at = now;     ◄── 次の deadline をリセット          │
     │ return Some(FundingTick {                                           │
     │     settled_at: now, premium, rate, settlements,                    │
     │ });                                                                 │
     └────────────────────────────────────────────────────────────────────┘
\`\`\`

「**clock が時間を gate し、セクション2 の数学が値を計算し、出力レイヤーが state を進めて返す**」という責任分離が、\`tick\` のボディの上から下にそのまま並んでいる。論理的には 3 つの phase だ：

1. **Guard**：\`if now < self.last_settled_at.saturating_add(self.params.interval_secs) { return None; }\`。\`saturating_add\` のおかげで、\`last_settled_at\` が \`u64::MAX\` 近くのときに \`u64\` の overflow を防げる（pathological なケースだが、defense は無料だ）。

2. **Compute**：セクション2 の関数を 3 つ繋ぐ。\`compute_premium(mark, index)\` → \`compute_rate(premium, params)\` → \`apply_funding(positions, mark, rate)\`。**Clock はそれらを compose するだけで、再実装はしない。**

3. **state 更新 + return**：\`last_settled_at\` を \`now\` に進め、\`Some(FundingTick { ... })\` を返す。

**決定的に重要なのは、clock を \`now\` に進めること** — \`last_settled_at + interval_secs\` ではない、という点だ。これが「no catch-up」不変条件の実装で、tick が遅れて fire したときに deadline を後ろにリセットする catch-up にはしない。なぜそれが重要なのかは レッスン10 のレッスンで説明する。

> 🛑 **考えてみよう。** \`last_settled_at = 1_000_000\`、\`interval_secs = 3600\`、\`now = 1_010_000\`（= +10000 秒、~2.8 interval）で \`tick()\` を呼んだ後の \`last_settled_at\` はいくらになるか。

（答え：**\`1_010_000\` になる。** \`1_003_600\`（genesis から 1 interval 後）でも \`1_007_200\`（genesis から 2 interval 後）でもない。Clock は \`now\` に進む — \`tick()\` の doc コメントを見直すこと。次の tick は \`now ≥ 1_010_000 + 3600 = 1_013_600\` になるまで fire しない。**これが設計判断であり、その理由は レッスン10 で説明する。**）

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

テストの setup で注目しておきたい点が 3 つ：

**テストモジュールで \`Notional\` と \`PositionSize\` を import している** — このファイルで実際に使うのは \`PositionSize\` だけだ（\`Notional\` は レッスン9 で使う）。レッスン5 のテストモジュールと同じ「boilerplate を先に安定化させる」パターンだ。

**helper を 2 つ用意する：\`pos(account, size)\` と \`balanced_book()\`。** 最初は レッスン5 の helper のエコー。2 つ目は レッスン8 / レッスン9 のテストが繰り返し使う、標準的な 2-position book を生む。**Helper が価値を生むのはテストが 3 つ以上で使うとき** — どちらもその条件を満たしている。

**テスト 3 つ、関心事 3 つ：**

1. **\`first_tick_before_interval_returns_none\`** — guard が機能していること。Interval 経過前に tick を呼ぶ → \`None\`、clock の state にも変化なし。**「guard を書き忘れた」「常に Some を返してしまった」というバグを捕まえる。**

2. **\`first_tick_at_exact_interval_fires\`** — 境界を inclusive にしていること。\`genesis + interval_secs\` ちょうどで tick が fire する。Guard 条件の off-by-one（\`<\` と \`<=\` の取り違え）を捕まえる。Body 側では数学の composition も検証する：\`mark == index\` → \`Premium(0)\` → \`FundingRate(0)\` → 空の settlement、という連鎖だ。

3. **\`empty_positions_yield_empty_settlements_but_still_advance_clock\`** — position が 0 個でも composition が機能すること。\`apply_funding(&[])\` が empty を返し、それでも clock は advance する。**「\`tick()\` を position の有無で gate してしまった」あるいは空入力を mishandle するショートカットを捕まえる。**

> 🛑 **やりがちな勘違い。** 「\`mark\` や \`index\` がゼロのケースもテストすべきでは？」 **レッスン4 の premium テストですでにカバー済みだ。** Clock は入力を \`compute_premium\` に通すだけだ。\`compute_premium\` を信頼しないなら、追加テストは \`compute.rs\` 側に書くべきで、ここで重複させない。**同じ挙動を 2 つの抽象レベルで二重にテストしない。**

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

モジュール宣言はアルファベット順だ（\`clock\` が \`compute\` の前、\`compute\` が \`types\` の前）。Re-export も同じ並び。**レッスン8 時点の lib.rs が最終形だ** — レッスン9 と レッスン10 では新しいモジュールレベルの名前は追加しない。

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
test compute::tests::... (レッスン4〜7 から 15 つ全て)

test result: ok. 18 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**18 テストすべて green、rustdoc warning も無し。** Crate のドキュメンテーションが完成した。

よくあるエラー：

- **\`now == last_settled_at + interval - 1\` で \`tick\` が fire してしまう** — guard で \`<\` のところを \`<=\` にしてしまった、もしくは反転形で \`>\` ではなく \`>=\` にしてしまった場合だ。意図する semantics は「\`now >= last_settled_at + interval\` のとき fire」で、guard 側に否定するなら \`if now < last_settled_at + interval { return None; }\` になる。
- **\`tick\` の後で \`last_settled_at\` が進まない** — \`Some(FundingTick { ... })\` の手前にある \`self.last_settled_at = now;\` の行を書き忘れた場合だ。次の tick が即座に再 fire してしまう。
- **\`empty_positions...\` テストで \`out.settlements\` が non-empty** — \`apply_funding(&[])\` は empty を返すべきだ。トレースしてみる：\`rate.0 == 0\` の早期 return も empty vec を返すし、空の positions スライスはループを完全にスキップする。どちらのパスからも empty が出る。
- **\`clock.tick(...).expect(...)\` の直後の \`clock.last_settled_at()\` で borrow checker エラー** — \`tick\` は \`&mut self\` を取り、その借用は式が終わるまで続く。結果を変数に束縛してその束縛を drop する前に \`clock.last_settled_at()\` を呼ぶと、借用がまだ生きている状態になる。対処は \`let out = clock.tick(...); assert_eq!(clock.last_settled_at(), ...);\` の形に分けること — \`let\` の末尾で借用が終わる。具体的にはこの 2 つの書き方が代表的:

  \`\`\`rust
  // ❌ メソッドチェーンの戻り値からフィールドを 1 行で取り出すパターン
  //    一時オブジェクトの寿命が statement 末尾まで延び、その間 clock は
  //    可変借用されたまま → 直後の clock.last_settled_at() が衝突。
  let settlements = clock
      .tick(now, mark, index, &positions)
      .expect("tick fired")
      .settlements;
  let last = clock.last_settled_at(); // error[E0502]: cannot borrow \`clock\` as immutable
                                       //               because it is also borrowed as mutable

  // 🟢 戻り値をまず let で束縛 → mutable 借用はこの statement の \`;\` で終わる
  //    → 次行で immutable 借用を取り直して OK
  let out = clock
      .tick(now, mark, index, &positions)
      .expect("tick fired");
  assert_eq!(clock.last_settled_at(), now); // OK: 借用がすでに切れている
  let settlements = out.settlements;        // out は所有しているので自由に分解できる
  \`\`\`

  ポイントは「\`&mut self\` 借用は式の終了 (\`;\`) まで生き続ける」という Rust の規則だ。中間結果をフィールド抽出まで一気にチェーンすると、\`expect()\` が返す \`FundingTick\` がメソッドチェーンの一時オブジェクトとして statement 末尾まで生存し、その間ずっと \`clock\` の mutable 借用が残る。\`let out = ...;\` で一度切ることで、mutable 借用がそこで release され、続く \`clock\` の読み取りが許される。

## 設計の振り返り

このレッスンに焼き込んだ決定は 5 つ：

1. **常に値を返すのではなく \`Option<FundingTick>\` を返す。** \`None\` だけで「state は変化していない」を安価に通知できる。呼び出し側は \`FundingTick\` を中身まで見にいく必要がない。**「fire したか否か」の二分を型システムで encode する。**

2. **Clock は \`last_settled + interval\` ではなく \`now\` に advance する。** これが「完全に周期的」な動作からの最初の大きな逸脱だ — 何秒経過していようと、fire するたびに deadline がリセットされる。**この理由は レッスン10 で defend する。ここでは事実として記録するだけだ。**

3. **セクション2 の関数を再実装せずに compose する。** \`tick()\` は \`compute_premium\`、\`compute_rate\`、\`apply_funding\` を順に呼ぶだけだ。Clock はどれの動作も知らず、知っているのは順序だけだ。**層を分けている：数学が計算を、clock が gating を担う。**

4. **\`FundingTick\` は telemetry のために中間値を expose する。** Premium と rate を、最終的な settlement だけでなく出力に surface する。下流の observer が再計算しなくて済む。**有用な中間値は surface する — 再計算は divergence を呼び込む。**

5. **Module doc で両不変条件を先頭に明示する。** 実際に強制するコードは段階的に積み上がる（レッスン8 で guard、レッスン9 で境界テスト、レッスン10 で advancement の選択）が、*契約*そのものはコードに先立って documentation してある。**ドキュメンテーションが設計意図の保管庫になる。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/clock.rs ./crates/funding/src/clock.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
\`\`\`

レッスン8 後：
- **clock.rs** が Funding参照実装コミット の \`FundingClock\` + \`FundingTick\` + \`impl FundingClock { ... }\` + 7 テスト中 3 つまで一致。残り 4 テストは レッスン9（interval-gating + premium-driving の 3 テスト）と レッスン10（no-catch-up の 1 マイルストーンテスト）に分かれる。
- **lib.rs** が Funding参照実装コミット と**完全**一致。最終形。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`tick\` が \`&mut self\` を取って、\`self\` を消費する形で \`(Self, Option<FundingTick>)\` を返さないのはなぜか？**
実用主義による選択だ。\`&mut self\` は in-place な変更を表す Rust の標準パターンだ。消費して返す形にすると、呼び出し側に \`clock = clock.tick(...)\` のような再代入を強いる— semantic な利得もなく、ただ verbose になるだけだ。**state machine が mutate するなら \`&mut self\`、本当に変換するなら consuming にする。** Funding clock は前者にあたる。

**Q: \`FundingClock\` は tick の*回数*も追跡すべきでは（telemetry 用に）？**
\`ticks_fired: u64\` のカウンタを足すこともできる。Funding参照実装コミット ではやらない — 呼び出し側が気にするなら外部でカウントすればよい。**具体的な consumer がいないうちは、最小限の struct に state を足さない。** 後から足すのは struct のフィールドを 1 つ変更するだけで済むが、未使用な state を削除するのは breaking な API 変更になる。

**Q: \`tick\` が \`mark\`、\`index\`、\`positions\` を引数で取り、clock に持たせないのはなぜか？**
これらは tick ごとに変わるからだ。\`mark\` と \`index\` は tick 時点の oracle / orderbook の read から来るし、\`positions\` は fresh なスナップショットだ。これらを clock に保存すると、\`tick\` を呼ぶ前に呼び出し側がそれらを更新する必要が生まれる — やることは同じなのに手順が増える。**呼び出しごとに変わる入力は引数に、永続化したい入力は receiver に持たせる。**

**Q: Clock の proptest がないのはなぜか？**
Clock の property はほぼすべて*interval semantics*（interval ごとに 1 settlement、no catch-up）に関するもので、手書きトレースのテストで表現しやすいからだ。セクション2 の antisymmetry や zero-sum のような代数的な property は存在しない。**Clock は event loop であり、event loop は代数ではなくシナリオでテストする。**

## 次のレッスン（レッスン9）

レッスン9 では \`clock.rs\` にテストを 3 つ追加し、**interval-gating 不変条件**を段階的に深掘りしていく：

- \`premium_drives_settlement_signs\` — mark > index のとき、settlement が long → short の方向に流れる（数学の composition を full に検証するテスト）。
- \`second_tick_requires_another_full_interval\` — 成功した tick の後、次の tick には別途 \`interval_secs\` 分の経過が必要だ。interval のチェックは 1 度きりではない。
- \`capped_rate_when_premium_extreme\` — saturate するほど大きな premium のときに、rate が cap で clamp される。\`compute_rate\` の cap 挙動が clock 経由でも正しく surface することを確認する。

レッスンの中身はほぼすべて、*テスト*と *interval-gating* 不変条件についてのものになる。**レッスン10 では セクション3 を no-catch-up 不変条件で閉じる。**`,
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

このレッスンで掴む概念:

- **単一呼び出しテストは挙動を、複数呼び出しテストは state machine を検証する** — レッスン8 で確認したのは guard が一度だけ \`Some\` を返せることだ。レッスン9 の \`second_tick_requires_another_full_interval\` で確認するのは、guard が fire した*後にも再び engage する*ことだ。1 度 fire したきり以降は gate しなくなる buggy 実装を捕まえるには、3 連続の呼び出しが要る。
- **Composition テストが接続ミスを捕まえる** — 各ステップが unit test 済みでも、ステップ間の接続は別の関心事だ。\`tick()\` が \`apply_funding\` を \`compute_rate\` より先に呼ぶかもしれないし、\`mark\` を期待している場所に \`index\` を渡すかもしれない。\`premium_drives_settlement_signs\` のような full composition test が、unit test では捕まえられないバグを拾い上げる。
- **不変条件は通過する各レイヤーで再検証する** — \`compute_rate\` の cap は レッスン6 で unit test 済みだが、\`capped_rate_when_premium_extreme\` で \`tick()\` 経由でも再検証する。呼び出しの途中で \`params.rate_cap\` を上書きするような接続バグは、下層のテストをすり抜けてしまう。
- **境界テストはペアで：just-before と exactly-at** — \`now == last_settled_at + interval - 1\`（None）と \`now == last_settled_at + interval\`（fire）が標準のペアだ。両方向から guard 条件の off-by-one を捕まえる。\`+1\` を追加しても、別のクラスのバグが捕まるわけではない。
- **失敗は state を変えない** — \`tick()\` が \`None\` を返したとき \`last_settled_at\` は不変のままだ。3 連続呼び出し（fire / gated / fire）の 3 回目の成功時刻から、この副不変条件が読み取れる。

検証：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

上記の実行結果が 21 テストを通る（レッスン4-レッスン8 で書いた 18 + 新規 3）。

具体的な変更:

**新しいプロダクションコードはない。** 新規テスト 3 つで、複数 operation にわたる clock の semantics カバレッジを深掘りする：

- **\`premium_drives_settlement_signs\`** — 数学の full composition が clock を流れる。mark > index → 正の premium → settlement の符号が一致する。
- **\`second_tick_requires_another_full_interval\`** — Interval-gating が tick 間でも持続する。成功した tick が、clock を永久に unlock してしまうわけではない。
- **\`capped_rate_when_premium_extreme\`** — \`compute_rate\` の cap 挙動が \`tick()\` 経由でも正しく surface する。レイヤーを重ねても semantics が失われない。

教育上の焦点は、**1 度きりではなく複数 operation にわたって成り立つ不変条件**だ。レッスン8 のテストでは guard が*1 度*機能することを検証した。レッスン9 のテストでは、それが*tick 間*でも機能すること、そしてレイヤーを重ねた composition が微妙なバグを持ち込まないことを検証する。

## おさらい

レッスン8 後の状態：
- \`FundingClock\` が存在し、\`tick()\` は \`Option<FundingTick>\` を返す。
- サニティテスト 3 つで、guard の動作、境界での fire、空の positions でも advance すること、を確認済み。
- セクション2 の関数 3 つすべてが \`tick()\` 経由で compose されている。

レッスン8 のテストはどれも clock を*高々 1 回*しか走らせない。レッスン9 では clock を複数回呼び出し、非自明な入力で exercise しながら、**不変条件が単一 operation を超えて成立する**ことを検証する。

## プラン

ファイル編集は 1 つ：

1. **\`crates/funding/src/clock.rs\` にテストを 3 つ追加**する — 既存の \`#[cfg(test)] mod tests\` ブロック内、レッスン8 のサニティテスト 3 つの後ろに置く。

プロダクションコードの変更はなし、\`lib.rs\` の変更もなし、レッスン8 で既に追加した以上の import も要らない。

> 🛑 **考えてみよう。** スクロール前に — レッスン8 の \`first_tick_at_exact_interval_fires\` テストでは、\`tick(1_003_600, ...)\` を 1 度呼んで \`Some\` が返ることを assert している。**それだけでは、なぜ interval-gating 不変条件の検証として不十分なのか？**

（答え：**1 度の成功 tick が示すのは、guard が \`Some\` を*返しうる*ということだけだ。その guard が後で*再び engage* するかどうかは何も示さない。** バグのある実装では、最初の interval 境界で fire してから二度と gate しなくなるかもしれない — \`1_003_600\` 以降のすべての \`tick()\` が、時間に関係なく \`Some\` を返してしまう、というケースだ。「interval ごとに最多 1 settlement」の不変条件を検証するには、別の full interval が経過するまで second tick が拒否されることを確認する必要がある。**単一 operation のテストは挙動を、複数 operation のテストは state machine を検証する。**）

## 手順

### Step 1: \`premium_drives_settlement_signs\` を追加

\`mod tests\` の レッスン8 テストの後に：

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

これが clock の**完全な数学 composition テスト**だ。セクション2 の関数がすべて順番に exercise される：

1. \`compute_premium(MarkPrice(101), IndexPrice(100))\` → \`Premium(10_000_000)\`（1% premium）。
2. \`compute_rate(Premium(10_000_000), hyperliquid_default)\` → \`FundingRate(1_250_000)\`（divisor 8 のあと 0.125%）。
3. \`apply_funding(&[Pos(1, 100), Pos(2, -100)], MarkPrice(101), FundingRate(1_250_000))\` → \`[Settlement(-12), Settlement(+12)]\`。

**5 行のブロックコメントは、そのまま紙の上の数学だ。** このテストをデバッグする人は誰でも、手で算術を検証できる：\`100 × 101 × 1_250_000 = 12_625_000_000\`。これを \`RATE_SCALE = 1_000_000_000\` で割る（整数除算なのでゼロ方向に丸まる）と \`12\`。\`apply_funding\` の符号反転で、long は \`-12\`、short は \`+12\` になる。**コメントが documentation、テストが spec として働く。**

**各ステップが既に個別にテストされているのに、なぜこのテストが必要なのか？** Composition 自体が独立した関心事だからだ。\`tick()\` が間違った順序で間違った関数を呼ぶ可能性がある — 例えば \`compute_rate\` の前に \`apply_funding\` を呼んでしまったり、\`mark\` を期待している箇所に \`index\` を渡してしまったり、といったことが起こりうる。**Composition テストは、unit テストでは見逃される接続ミスを捕まえてくれる。**

> 🛑 **やりがちな勘違い。** 「このテストは \`apply_funding\` のテストと重複している。アカウントごとのアサーションは落として、\`out.rate\` だけ確認すべきでは？」 **だめだ。** このテストの要点は*composition*にある。\`apply_funding\` のテストは pass するのに \`premium_drives_settlement_signs\` だけ fail するなら、バグは \`tick()\` が呼び出しを組み立てるやり方にあって、\`apply_funding\` の中にはない。**レイヤーごとに独自の composition テストが必要だ。** 3 レイヤー深ければ、最低 3 つの composition テストが必要になる。

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

**tick 呼び出し 3 回、アサーション 3 つ。** 構造そのものが story を語っている：

1. **\`1_003_600\` での最初の tick** — fire する（レッスン8 の境界ケース）。これ以降 \`last_settled_at = 1_003_600\`。
2. **\`1_007_199\` での 2 つ目の tick** — \`1_007_199 - 1_003_600 = 3599\`、interval に 1 秒足りない。\`None\` を返す。
3. **\`1_007_200\` での 3 つ目の tick** — \`1_007_200 - 1_003_600 = 3600\`、ちょうど interval。\`Some\` を返す。

**ここで検証している不変条件**：「Interval guard は、成功した tick ごとに再 engage する」。\`last_settled_at\` ではなく \`genesis_time\` に対してだけチェックするような素朴な実装だと、\`1_003_600\` 以降のすべての tick で fire してしまう — このテストでそれを捕まえる。

**最小の counterexample**：レッスン8 の \`first_tick_at_exact_interval_fires\` と レッスン9 の \`second_tick_requires_another_full_interval\` を組み合わせて初めて、「gating の基準は \`last_settled_at\` であって \`genesis_time\` ではない」ことが検証される。**state machine の持続性を確かめるには、3 回の呼び出しが最小構成だ。**

> 🛑 **考えてみよう。** 上の各 tick の後で \`clock.last_settled_at()\` はそれぞれどうなるか。

（答え：
- Tick 1（成功）後：\`1_003_600\`。
- Tick 2（None — gated）後：変化なし、まだ \`1_003_600\`。
- Tick 3（成功）後：\`1_007_200\`。

**Clock は gated な呼び出しでは advance しない。** これが interval-gating 不変条件のもう 1 つの側面で、失敗時には state を変化させない。テスト自体は tick 2 後の \`last_settled_at\` を明示的には assert していないが、tick 3 がちょうど \`1_003_600 + 3600\` で成功することがそれを暗黙に保証している。）

3 連続呼び出しを時間軸で並べると、何が動いて何が動かないか (= ゲートの再エンゲージ) が一望できる:

\`\`\`
タイムライン (秒)
1_000_000 ── Genesis (FundingClock::new、last_settled_at = 1_000_000)
    │
    │   +3,600 秒 (= 1 interval ちょうど)
    ▼
1_003_600 ── Tick 1: 成功 ✨
              now ≥ last_settled_at + interval を満たす → fire
              Some(FundingTick { settled_at: 1_003_600, ... }) を返す
              ──► last_settled_at = 1_003_600 にリセット
    │
    │   +3,599 秒 (まだ 1 秒足りない)
    ▼
1_007_199 ── Tick 2: 拒否 🛑
              now < last_settled_at + interval (1_007_200) → guard で None
              ──► last_settled_at = 1_003_600 のまま (state は汚さない)
    │
    │   さらに +1 秒 (ちょうど 1 interval 達成)
    ▼
1_007_200 ── Tick 3: 成功 ✨
              now ≥ last_settled_at + interval を再び満たす → fire
              ──► last_settled_at = 1_007_200 にリセット
\`\`\`

このタイムラインの timestamp はすべて Unix 時間の**秒単位**として読む。したがって \`+3600\` は 1 時間、\`+3599\` は「1 秒不足」を意味する（ミリ秒系の \`+3_600_000\` ではない）。

このテストの load-bearing なポイントは **Tick 1 の成功が clock を恒久的に unlock してしまわないこと** — つまり Tick 3 を fire させるには、Tick 1 を起点に新たに 1 interval を待つ必要がある、という再エンゲージの不変条件だ。3 つ並べないとこの「ゲートが閉じ直す」挙動は観測できない。

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

**\`tick()\` 経由で呼ばれたときも、\`compute_rate\` の cap が正しく clamp として効くことを検証する。** 数学：

1. \`compute_premium(MarkPrice(200), IndexPrice(100))\` → \`Premium(1_000_000_000)\`（100% premium）。
2. \`compute_rate(Premium(1_000_000_000), {divisor=8, cap=40M})\` → raw = \`1_000_000_000 / 8 = 125_000_000\`。\`±40_000_000\` に clamp → \`FundingRate(40_000_000)\`。

**\`compute_rate\` のテストが既に clamping をカバーしているのに、なぜこのテストが必要なのか？** \`tick()\` 側で rate を unwrap したり、いじったり、bypass したりしないことを確認する必要があるからだ。**Cap が clock を経由しても変化せずに surface することを示す。**

このテストが本当に守っているのは、レッスン4〜レッスン6 で組んだ「型安全なリレー」が \`tick()\` の中でも一切値を歪めずに繋がっている、という不変条件だ。データの通り道を図で書くと:

\`\`\`
[MarkPrice(200), IndexPrice(100)] ──► compute_premium ──► Premium(1_000_000_000)
                                                                │
                                                                ▼
            FundingParams { divisor: 8, cap: 4e7 } ──► compute_rate ──► FundingRate(40_000_000)
                                                                              │
                                                                  ※ ここが lossless に
                                                                    通り抜けているか？
                                                                              ▼
                                            FundingTick { rate: FundingRate(40_000_000), .. }
                                                                              │
                                                                              ▼
                                                       out.rate == FundingRate(40_000_000) ✨
\`\`\`

assert している実体は「\`compute_rate\` の戻り値が \`FundingTick\` の \`rate\` フィールドにそのまま代入されて表面化していること」だ。例えば \`tick()\` が誤って \`compute_rate\` の結果を \`.0\` で剥がしたまま代入したり、別の \`FundingParams\` で再計算したりしていれば、ここで値が \`40_000_000\` 以外に変質して即座に検出される。**型のリレー (Pipeline) が壊れていないことを、実際にデータを通して証明している。**

微妙な接続バグ — 例：\`compute_rate(premium, FundingParams { rate_cap: FundingRate(0), ..params })\` のようなもの — は、このテストで壊れる（cap ゼロ → rate ゼロ → settlement なし）。**Composition テストは、unit テストでは拾えないものを捕まえる。**

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
... (レッスン4〜7 compute.rs から 15 テスト)

test result: ok. 21 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**21 テストすべて green。** うち 6 つが \`clock::tests\` に置かれている（レッスン8 で 3 つ + レッスン9 で 3 つ）。

よくあるエラー：

- **\`premium_drives_settlement_signs\` が \`Notional(-13)\` あるいは \`Notional(-11)\` で失敗する** — rounding の off-by-one だ。数学を再確認しよう：\`100 × 101 × 1_250_000 = 12_625_000_000\`。\`1_000_000_000\` で割ると \`12.625\`、整数除算はゼロ方向に truncate するので \`12\`、符号反転で \`-12\` だ。これと違う数値が出るなら、\`*\`（debug で overflow すると panic）、\`saturating_mul\`、\`wrapping_mul\` のどれを使っているかを確認すること。
- **\`second_tick_requires_another_full_interval\` が second tick で失敗する** — guard が \`last_settled_at\` ではなく \`genesis_time\` と比較している場合だ。レッスン8 のコードを読み直そう：guard は \`now < self.last_settled_at.saturating_add(...)\` であって、*\`now < self.params.genesis_time + ...\` ではない*。
- **\`capped_rate_when_premium_extreme\` が \`FundingRate(125_000_000)\` を返す** — \`compute_rate\` で clamp が効いていない場合だ。レッスン6 を再確認すること：\`raw.clamp(-cap, cap)\` の行があるはずだ。

## 設計の振り返り

このレッスンに焼き込んだ決定は 4 つ：

1. **Composition テストが接続ミスを捕まえる。** 各ステップが unit-test されていても、ステップ間の接続は別の関心事だ。**3 ステップの pipeline には、最低でも composition テストが必要だ — 各ステップの配置に 1 つずつ、加えてマルチステップの composition テストを 1 つ。** \`premium_drives_settlement_signs\` が後者にあたる。

2. **State machine には multi-call テストが必要。** 単一 operation で偶然に不変条件を満たしてしまうことがあり、それを排除して「state machine が一貫して強制しているか」を確認できるのは複数 operation だけだ。**\`first_tick_at_exact_interval_fires\` だけでは足りないからこそ \`second_tick_requires_another_full_interval\` が存在する。**

3. **各 gate で境界テストを行う。** inclusive な境界（\`now == last_settled_at + interval\`）と exclusive な境界（\`now == last_settled_at + interval - 1\`）の両方をテストする必要がある。**1 秒手前と 1 秒後の組が標準ペアだ。**

4. **各レイヤーの不変条件には、それぞれ surface テストを置く。** \`compute_rate\` のテストは cap clamp を証明する。\`tick\` のテストは、その cap が composition のもとでも*生き残る*ことを証明する。**Composition は semantics を失わせうるので、不変条件が経由する各レイヤーで検証する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/clock.rs ./crates/funding/src/clock.rs
\`\`\`

レッスン9 後：
- **clock.rs** が Funding参照実装コミット の 7 テスト中 6 つまで一致。\`no_catchup_after_long_gap\` のみ残る — それが レッスン10 のマイルストーンテスト。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`second_tick_requires_another_full_interval\` は \`+3601\` をテストしないのか？**
\`+3600\` ちょうど*と* \`+3599\` を組み合わせれば境界の両側を pin できるからだ。\`+3601\` は \`+3600\` より少し多いだけで、同じ方向の話でしかない。**境界の 2 ケース（直前とちょうど）で十分**で、追加ケースが別のバグクラスを捕まえてくれるわけではない。

**Q: 「genesis vs last_settled_at」のバグを proptest で捕まえられないか？**
捕まえられる — \`t2 < t1 + interval\` を満たすランダムな \`(t1, t2)\` ペアで second tick が \`None\` を返すべき、という形にすればよい。ただし、手書きトレースのテストの方が意図がはっきりする：「\`t1\` で tick が成功した後、\`t1 + 3599\` の次の tick は gate される」。Proptest は property に強く、手書きトレースは名前付きのシナリオに強い。**state machine の挙動は通常シナリオ寄りだ。**

**Q: なぜ 3 つ目の tick として、例えば +7200（最初から 2 interval 後）を含めないのか？**
情報量が増えないからだ。\`+3600\` での 2 つ目の tick で「clock が正しい cadence で fire する」ことは既に立証している。3 つ目は同じことを繰り返すだけだ。**テストは検証するもので区別をつけるべきで**、繰り返しを足すべきではない。

**Q: テスト作者が \`genesis_time = 0\`（\`1_000_000\` ではなく）を使っていたらどうなる？**
数学は同じだが、テストの読みやすさが落ちる。\`1_000_000\`（とそれに対応する \`1_003_600\` 等）を使うと、すべてのアサーションから「clock が 3600 秒 advance する」パターンが視認できる。**テストデータは正しいだけでなく、読みやすくあるべきだ。**

## 次のレッスン（レッスン10）

レッスン10 では セクション3 を **no-catch-up 不変条件**で閉じる：マイルストーンテストの \`no_catchup_after_long_gap\` を扱う。シナリオは「validator が 10 時間のダウンタイムを経て reboot し、\`now - last_settled_at = 36000\`（10 interval）になっている」状態だ。素朴には「10 tick を replay して追いつく」と考えがちだが、今回の設計判断は **1 度だけ settle して \`now\` まで advance する**だ。レッスンでは「catch-up がなぜ tick スキップより悪いのか」を説明し、テストでその設計判断が enforce されていることを確認する。**テスト 1 つ、不変条件 1 つ、設計哲学を行動で示す。**`,
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

このレッスンで掴む概念:

- **No-catch-up は公平性の不変条件** — 10 interval 分のギャップが空いた後は、1 度だけ settle して \`now\` まで advance する。10 tick を replay してはいけない。現在のスナップショットで 10 回 replay すると、ギャップ中に position を閉じられなかった負け側に 10 倍の懲罰が集中してしまう。Funding の目的は equilibration であって、遡及的な強制ではない。
- **\`now\` へ advance する、\`last_settled + interval\` ではなく** — deadline は実際の settlement 時刻にリセットされ、数学的な「次の整列点」にはならない。Clock は見逃した interval を完全に忘れる。これが、このテストで pin する設計判断だ。
- **同じ \`now\` での second tick は state machine の最も厳しいテスト** — 2 つの呼び出しの間で時間は 1 ミリ秒も経過しておらず、変わったのは clock の内部 state だけだ。遅れた tick で \`last_settled_at\` を更新し忘れる実装を、すべて捕まえてくれる。
- **Catch-up ポリシーは clock の外側に置く** — Catch-up が必要な呼び出し側は、中間時点のスナップショットを伴って \`tick()\` を繰り返し呼ぶ wrapper を書けばよい。Clock 自身は過去の state にアクセスできないからこれはできない。プリミティブはミニマルに、ポリシーは呼び出し側に。
- **設計哲学はドキュメント、コード、テストの 3 箇所に住む** — Module doc が不変条件を約束し、\`tick()\` の \`self.last_settled_at = now\` の行がそれを強制し、\`no_catchup_after_long_gap\` がそれを証明する。それぞれが別の読者に対応する。

検証：

\`\`\`bash
cargo test -p openhl-funding
\`\`\`

上記の実行結果が 22 テストを通る（レッスン4-レッスン9 で書いた 21 + 新規 1）。

具体的な変更:

新規テストは **\`no_catchup_after_long_gap\`** — validator が複数 interval を見逃したときの挙動について、openhl の設計判断を pin するマイルストーンテストだ。

レッスン10 後の状態：
- \`crates/funding/\` が **Funding参照実装コミット（\`cd94137\`）と 一致**。
- 22 テストすべて pass：手書きトレース 20 + proptest 2。
- セクション3（Clock state machine）が**完了**。
- Funding state machine が、独立した crate として **production grade** に達する。

教育上の焦点は、**失敗モード下での設計哲学**だ：clock が遅れたとき、何が正しい semantics なのか。素朴な答え（「tick を replay して追いつけばよい」）は間違いで、レッスン10 ではその理由を説明する。

## おさらい

レッスン9 後の状態：
- 7 つの clock テストのうち 6 つが pass している。
- Interval-gating の副不変条件（境界、持続性）が両方とも検証済み。
- 数学 composition が \`tick()\` 経由で正しく surface している。

レッスン9 が「normal operation」の不変条件をカバーした。レッスン10 では「abnormal operation」の不変条件 — clock が*遅れた*ときの挙動 — をカバーする。

## シナリオ

openhl チェーンが通常通り稼働し、毎時 funding を settle してきたとしよう。そこに何かが起きる：

- Validator reboot（プロセス再起動で 5 分）。
- ネットワーク分割（validator が再接続するまで 8 時間チェーンが停止）。
- Leader のハードウェア障害、fallback validator が 30 分後に引き継ぐ。

原因が何であれ、次の \`tick()\` 呼び出しで \`now - last_settled_at\` が \`interval_secs\` を大きく超える状態になる。**このとき clock は何をすべきか。**

設計判断は 2 つに分かれる：

### Choice A: Catch up する

10 interval 分の funding を replay する。各 replay は*現在*の mark / index / positions のスナップショットを使う。settlement を 10 回連続で適用する。

**Pro**：各 interval が settlement を得て、チェーンが「遅れない」。

**Con**：
- **stale-snapshot 問題**：10 個の settlement すべてが*同じ*現在スナップショットを使うことになり、各歴史的 interval 境界時点のスナップショットではない。Gap 中に勝っていた trader が、いまの有利な rate で計算された 10 個の settlement を支払う羽目になる。Gap 中に負け続けていた側は 10 倍の打撃を受け、しかも途中で position を閉じて逃げる機会は一度もなかった。
- **集中リスク**：1 度に 10 倍の funding がかかれば、毎時 1 回ずつ別々に支払っていれば耐えられたはずのアカウントが liquidate されうる。
- **path dependency**：funding の履歴が、gap が*いつ*発生したかに依存する— 累積時間だけでなく。

### Choice B: 1 度 settle して \`now\` に advance する

現在のスナップショットで*1 度だけ* funding を適用し、\`last_settled_at\` を \`now\` に進める。見逃した 10 個の interval は*スキップ*し、replay はしない。

**Pro**：
- **集中的な懲罰がない**：障害 1 回あたり、最大でも cap 上限の settlement が 1 つだけ。
- **path-independent**：結果が現在のスナップショットだけに依存し、gap のタイミングには依らない。
- **外部での catch-up が可能**：catch-up ロジックが欲しい呼び出し側は、中間タイムスタンプでの fresh なスナップショットを使って \`tick()\` を繰り返し呼ぶことで、自前で実装できる。

**Con**：
- **失われる revenue**：funding は永久先物価格の equilibration メカニズムなので、interval をスキップすれば basis にかかる圧力もその分減る。

**openhl では Choice B を採る。** Catch-up ロジックが必要な人は、clock の*外側*でそれを構築する — 正しい歴史時刻のスナップショットを伴って \`tick()\` を繰り返し呼ぶ形だ。

時間が大きく飛んだ直後に state machine がどう振る舞うか、Choice A と Choice B を 1 枚の障害シナリオで並べると差が一目で見える:

\`\`\`
1_000_000 (Genesis、last_settled_at = 1_000_000)
   │
   ▼  +3,600 秒 (正常に 1 interval 経過)
1_003_600 ── 【正常 Tick】成功 ──► last_settled_at = 1_003_600
   │
   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
   ░░  障害発生! 10 時間チェーンが停止             ░░
   ░░  trader は position を閉じられない          ░░
   ░░  mark が index 上に乖離し続けたとする        ░░
   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
   │
   ▼  +36,000 秒 (再起動後の最初のブロック)
1_039_600 ── 【遅れてきた Tick】
                  │
                  ├─► ❌ Choice A (catch-up replay):
                  │     現在のスナップショットを使って 10 回連続で settle を replay
                  │     負けていた側 (longs) に毎時 cap 上限が 10 連発で襲いかかる
                  │     trader は gap 中に position を閉じる手段がなかった
                  │     →「動けなかった時間に対する retroactive な強制」になる
                  │     last_settled_at の遷移は 1,003,600 → 1,007,200 → ... → 1,039,600
                  │
                  └─► 🟢 Choice B (openhl の採用、本実装):
                        現在のスナップショットで 1 度だけ settle
                        見逃した 9 interval 分の settlement は完全にスキップ
                        clock は一気に \`now = 1_039_600\` まで advance
                        →「funding revenue は失うが、trader にはフェア」
                        last_settled_at = 1_003_600 ──► 1_039_600 ✨ (1 ステップ)
\`\`\`

ポイントは「Choice B では \`last_settled_at\` の遷移が常に 1 ステップで完結する」。10 時間の gap だろうが 10 秒の gap だろうが、\`tick()\` は 1 回呼ばれて 1 回 advance するだけ。これが path-independence (gap のタイミングに結果が依存しないこと) の正体であり、テスト 1 本でこの不変条件全体を pin できる理由でもある。

> 🛑 **考えてみよう。** スクロール前に — ノード再起動で 10 時間の funding を取り逃がした validator が、*現在*のスナップショットから 10 tick を replay して埋め合わせようとする場面を考える。**このアプローチで一番痛い目に遭うのはどの trader か？** ヒント：gap 中に負けていたのは誰か、を考えよ。

（答え：**負けていた側が 10 倍の打撃を食らう。** 10 時間の gap の間、mark が index に対して上振れし続けたとしよう — 「現実」世界では longs が overpay していた状態だ。Choice A は*現在*の rate で settlement を 10 回 replay する、すべて longs から charge する形だ。Basis の負け側にすでに居た trader は、毎時 funding が適用されていたなら払っていたはずの 10 倍を支払う羽目になる。さらに悪いことに、gap 中は position を閉じることもできなかった（チェーン自体が止まっていたからだ）。catch-up は、trader が動けなかった時間に対して retroactive に charge しているように見える。**Choice B はこう言う：見逃した 10 回の支払いはスキップして、今から fresh に始めよう、と。Funding revenue には悪いが、trader にはフェアだ。**）

## プラン

ファイル編集は 1 つ：

1. **\`crates/funding/src/clock.rs\` に \`no_catchup_after_long_gap\` を追加**する — 既存の \`#[cfg(test)] mod tests\` ブロック内、レッスン9 のテストの後ろに置く。

プロダクションコードの変更も \`lib.rs\` の変更もなし。

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

**2 つのパートで構成する。** それぞれが no-catch-up 不変条件の別の副 property を pin する。

#### Part 1: 長い gap の後でも settle は 1 度だけ

\`\`\`rust
        let way_later = 1_000_000 + 10 * 3600;
        let out = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(out.is_some(), "elapsed >> interval → tick fires");
        assert_eq!(clock.last_settled_at(), way_later);
\`\`\`

セットアップ：genesis を \`1_000_000\` にしておき、\`1_036_000\`（= \`1_000_000 + 10 × 3600\`）で tick を呼ぶ。10 個の interval を full に経過した状態だ。

**アサーションは 2 つ**：

1. **\`out.is_some()\`** — tick が*fire する*。遅れているからといってスキップはしない。**Choice B は「全部スキップ」ではなく、「1 度だけ settle する」だ。**

2. **\`clock.last_settled_at() == way_later\`** — そして*決定的に重要*なのは、clock が \`now\` に advance するという点だ — \`1_000_000 + 3600\`（genesis から 1 interval 後）でもなければ、\`1_000_000 + 10*3600\`（genesis から 10 interval 後 — 数値は偶然同じだが理由は別）でもない。**Clock は見逃した interval を完全に忘れる。**

> 🛑 **やりがちな勘違い。** 「テストでは \`out.settlements\` のエントリが 1 つだけかどうかも確かめるべきでは？」 **Settlement の個数は positions に依存するもので、gap には依存しない。** \`balanced_book()\`（long 100、short -100）なら、gap の長さに関わらず settlement は 2 つ得られる。このテストの仕事は*tick が 1 回*fire することを検証することであって、その tick がいくつの settlement を生むかを問うことではない。**tick の回数をテストする — settlement の個数は別の関心事だ。**

#### Part 2: 同じ \`now\` では再 fire しない

\`\`\`rust
        let again = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(again.is_none(), "no duplicate settlement at same now");
\`\`\`

長い gap の tick の直後、*同じ* \`now\` で \`tick\` をもう一度呼ぶ。**\`None\` を返す必要がある。** 遅れた tick の後でも interval-gating 不変条件が依然として成り立つこと — 続けて tick を 2 回呼んで double settlement を得ることはできない、ということ — を示すテストだ。

**なぜこのアサーションが重要なのか？** バグのある実装が、以下のような挙動を取りうるからだ：
- 「経過時間 >> interval」を検知して「追いつくまで連続的に fire する」と判断する（catch-up のバグ版）。
- 長い gap の tick で \`last_settled_at\` を更新し忘れ、同じ \`now\` の後続 tick が fire し続ける。

**同じ \`now\` というのは、可能な限り最も厳しいテスト**だ。2 回の tick の間で時間は 1 ミリ秒も経過せず、変化するのは clock の内部 state だけだ。\`last_settled_at == way_later\`（Part 1 の結果）なら、guard 条件 \`now < last_settled_at + interval\` は \`way_later < way_later + 3600\`、すなわち \`0 < 3600\` で true となり、\`tick\` は正しく \`None\` を返す。

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
... (レッスン4〜7 から 15 テスト)

test result: ok. 22 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**22 テストすべて green。** セクション3 が閉じる。\`crates/funding/\` が Funding参照実装コミット に一致する。

よくあるエラー：

- **Part 1 が失敗：\`out.is_none()\`** — guard の比較方向を間違えた場合だ。確認しよう：\`if now < last_settled_at + interval { return None; }\`。\`now = 1_036_000\`、\`last_settled_at = 1_000_000\` のもとで \`now < 1_003_600\` は false、guard は return せず、tick が fire するはずだ。
- **Part 1 が失敗：\`last_settled_at() != way_later\`** — clock を \`now\` 以外の値に advance させてしまった場合だ。\`tick()\` 末尾付近の \`self.last_settled_at = now;\` の行を再確認すること。よくある typo は \`self.last_settled_at = self.last_settled_at + self.params.interval_secs;\`（catch-up 版）や \`self.last_settled_at += self.params.interval_secs;\`（こちらも同じく誤り）だ。
- **Part 2 が失敗：\`again.is_some()\`** — Part 1 の tick で \`last_settled_at\` が更新されていない場合だ。同じ \`now\` での Part 2 の tick が \`genesis + interval\` の gate（まだ満たされている）を見つけて、誤って fire してしまう。Part 1 の代入を再確認すること。

## 設計の振り返り

このレッスンに焼き込んだ決定は 4 つ：

1. **長い gap が起きても settle は 1 度、advance 先は \`now\`。** 代替案（interval を replay して catch up する）では、負けていた側に集中的な懲罰を、position を閉じる機会も与えずに課す。Funding の目的は*equilibration* であって、retroactive な enforcement ではない。**Choice B は funding revenue を多少犠牲にしてでも、数学を公平性と揃える。**

2. **同じ \`now\` での second tick テストは、可能な限り最も厳しい。** 時間は経過せず、変化するのは state だけだ。遅れた tick で \`last_settled_at\` を更新し忘れる実装を、すべて捕まえてくれる。**state machine では「同じ入力で連続呼び出し」が、state 更新のバグを最も鋭くあぶり出す。**

3. **Catch-up ロジックは clock の外に置く。** Catch-up を必要とする呼び出し側は、歴史的な中間タイムスタンプでのスナップショットを伴って \`tick()\` を繰り返し呼べる。**Clock は primitive、ポリシーは呼び出し側の責任だ。**

4. **設計哲学は documentation とテストに置く。** Clock の module doc で不変条件を名指し、このテストでそれを強制し、テストコメントとこのレッスンが*なぜ*を説明する。**根拠を 3 箇所（doc、コード、テスト）から見つけられる。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
\`\`\`

レッスン10 後、\`crates/funding/\` は **Funding参照実装コミット と 一致** になる。Diff は空だ。

**セクション3 が閉じる。** セクション4（capstone）は レッスン11 で扱う。

戻す：

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: catch-up の semantics が欲しい。configurable にできるか？**
Clock 内部では設定できない。wrapper を書いて、歴史的な中間タイムスタンプのスナップショットを伴った \`tick()\` を繰り返し呼ぶ必要がある：

\`\`\`rust
// 外部 catch-up wrapper の擬似コード：
while clock.last_settled_at() + interval < now {
    let next_target = clock.last_settled_at() + interval;
    let historical_snapshot = fetch_snapshot_at(next_target);  // !!! complex !!!
    clock.tick(next_target, historical_snapshot.mark, ...);
}
clock.tick(now, current_snapshot.mark, ...);
\`\`\`

難しいのは \`fetch_snapshot_at(historical_timestamp)\` の部分だ — 呼び出し側が過去時点での mark / index / positions の姿を知っている必要がある。**だからこそ catch-up は clock の内側にはない：clock が持っていない歴史 state を要求するからだ。** Application 層（chain database を持つ層）ならそれが可能だ。

この \`// !!! complex !!!\` が指している「複雑さ」を clock の内側に取り込もうとすると、こういう破滅が起きる: clock 自身が **過去 N interval 分の (mark, index, position snapshot) をオンチェーンに永続化** しておく必要が出てくる。HL のように 1 時間 interval で 1 ヶ月分でも保持しようとすれば、\`24 × 30 = 720\` 個のスナップショットを **すべての market 分** だけ抱える state バルーンになる — おまけにそのストレージ自体が consensus state に組み込まれるので、ストレージレイアウトを変えるたびに network upgrade が必要になる。**「pure かつ軽量な state machine」という \`openhl-funding\` クレートの美点が一瞬で蒸発する。** 一方、application 層なら chain database をすでに持っているので、\`fetch_snapshot_at(t)\` は「block T の state root を引いて position を読む」程度のコストで済む。「primitive はミニマルに、policy は外側に」という責任分離が、ここでは具体的にストレージサイズの 720 倍差として現れている。

**Q: \`way_later\` が overflow する前に、gap はどれだけ長くできるのか？**
\`u64::MAX\` 秒はおよそ \`5.8 × 10^11\` 年 — 宇宙の熱的死のはるか先だ。Guard の \`saturating_add\` は \`last_settled_at\` が \`u64::MAX\` 近くでも安全に扱うが、実用上はその領域に届かない。**pathological なケースは guard の責任、現実のケースは設計の責任だ。**

**Q: \`way_later\` の時点で \`mark\` と \`index\` は合理的な値だが、gap の原因がそもそも mark / index oracle の停止だったらどうなるか？**
Clock は oracle が stale かどうかを知らない。stale な mark で \`tick()\` を呼べば、stale なデータに基づいた funding が出る。**Oracle の鮮度は呼び出し側の責任だ。** 本番デプロイでは \`tick()\` を呼ぶ前に oracle-staleness チェックを足す — oracle が古すぎる場合は呼び出しをスキップする。スキップは clock の上位で起きるべきで、clock 側は入力を信頼するだけだ。

**Q: 長い gap での tick が起きたときに warning ログを足すべきか？**
ログ出力は side effect だ。Clock は pure（I/O なし）に保つ。気になる場合は wrapper 側で gap をログに残せばよい：\`if elapsed > 2*interval { log!("late tick: {} hours behind", elapsed/3600); }\`。**primitive を pure に保ち、観測は wrapper に任せる。**

## セクション3 マイルストーン — 築き上げたもの

レッスン10 後の状態：
- **セクション3 完了。** Clock state machine と 7 つのテストが、interval-gating、no-catch-up、数学の composition、cap の surfacing をカバーしている。
- **Crate 全体が Funding参照実装コミット と 一致**。types.rs / compute.rs / clock.rs を合わせて ~635 LOC。
- **テスト合計 22 個**：手書きトレース 20 + proptest 2。
- **Rustdoc warning ゼロ。**

Funding state machine は今や、**完成し、テスト済みで、production grade** の crate になっている。Funding を deterministic に計算し、正しい cadence で gate し、gap 後に path-dependent な settlement を持ち込むことを拒む。

残っているもの：
- **セクション4（Capstone、レッスン11）** — 統合、先送り項目、bridge integration のプレビュー。コードはなし。
- **将来のコース** — この crate を bridge に組み込んでいく（oracle 統合、balance 更新、liquidation トリガーなど）。

## 次のレッスン（レッスン11）

レッスン11 は capstone だ — 新規コードはない。アーキテクチャをスケッチし、このコースで先送りした項目を名指し（oracle 統合、balance 更新、liquidation、マルチマーケット funding、EVM event としての funding）、それぞれが将来どこに置かれるかをたどる。Funding state machine を、より大きな openhl アーキテクチャの中の一部として捉えるメンタルモデルを固めるレッスンだ。`,
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

このレッスンを終えると：

- Funding pipeline を記憶からホワイトボードに描けるようになる：\`(mark, index)\` → premium → rate → settlements、それを clock で gate する、という形だ。
- 先送りした 5 項目（oracle 統合、balance 更新、liquidation、multi-market funding、funding-as-EVM-event）を名指しでき、それぞれがなぜ \`crates/funding/\` の守備範囲外なのかを説明できるようになる。
- 4 つの拡張が将来のどのコースに位置づけられるかを描けるようになる。
- この state machine を永久先物 DEX に組み込む準備が整う。

**このレッスンにコードはない。** メンタルモデルだけだ。

## Pipeline、1 枚の図で

\`\`\`
   ┌────────────┐   ┌─────────────┐
   │ MarkPrice  │   │ IndexPrice  │     (raw u64、上流の oracle 価格、オフチェーン)
   └─────┬──────┘   └──────┬──────┘
         │                 │
         ▼                 ▼
       ┌─────────────────────┐
       │   compute_premium    │  →  Premium       (i64、RATE_SCALE = 1e9 スケール)
       └──────────┬───────────┘
                  │
                  ▼
       ┌─────────────────────┐
       │    compute_rate      │  ←  FundingParams (divisor: u32、rate_cap: FundingRate、…)
       └──────────┬───────────┘
                  │
                  ▼  FundingRate (i64、RATE_SCALE = 1e9 スケール、±rate_cap に clamp 済)
                  │
            ┌─────┴─────┐
            │           │
            ▼           ▼
       ┌──────────────────────┐
       │   apply_funding      │  ←  &[Position] (アカウントのスナップショット)、MarkPrice
       └──────────┬───────────┘
                  │
                  ▼
              Vec<Settlement>  →  各要素 = { account: AccountId, delta: Notional }
                                   Notional は i64、quote currency の生額 (1 ユニット = 1 単位)
                                   bridge → balance 更新 (将来)


   ╔═══════════════════════════════════════════════════════╗
   ║                  FundingClock::tick                    ║
   ║                                                        ║
   ║  guard: now ≥ last_settled_at + interval_secs?         ║
   ║    no  → return None                                   ║
   ║    yes → 上の pipeline 実行、\`now\` に advance           ║
   ╚═══════════════════════════════════════════════════════╝
\`\`\`

上から下へ：価格を入力、settlement を出力。pipeline 全体を、clock が「十分な時間が経過したか？」の gate でラップする。

トラック全体の現在地として見ると、この \`Vec<Settlement>\` レーンは Step 2 (CLOB) の \`Vec<Fill>\` と同じく、まだ EVM 本流 (\`BlockExecutor\`) の外側を並走している。つまり現時点では「約定（Fill）も資金調達決済（Settlement）も、まずは bridge 側の補助レーンで運び、後段で payload / state 適用へ合流させる」形だ。どちらも直交レーンとして先に独立実装し、統合点を後で合わせるのが openhl の一貫した設計規律になる。

## 各モジュールが届けたもの

**セクション1（Determinism + 型、レッスン1〜3）** — 固定小数点の語彙：

- \`RATE_SCALE = 1_000_000_000\`（ppb）：load-bearing な定数。
- 9 つの newtype：\`MarkPrice\`、\`IndexPrice\`、\`Premium\`、\`FundingRate\`、\`Notional\`、\`PositionSize\`、\`Position\`、\`Settlement\`、\`FundingParams\`。
- \`hyperliquid_default()\`：3600 秒 interval、±4% cap、divisor 8。
- **学び**：Newtype のおかげで引数順バグをコンパイル時に防げる。符号規約は、その型の定義場所の doc コメントに置く。

**セクション2（純粋な compute、レッスン4〜7）** — Stateless な数学：

- \`compute_premium(mark, index) → Premium\` — \`index == 0\` で graceful、i128 中間値、saturate する。
- \`compute_rate(premium, params) → FundingRate\` — divide してから clamp、cap には defensive な \`.abs()\`。
- \`apply_funding(positions, mark, rate) → Vec<Settlement>\` — 単項マイナスで longs-pay-shorts を表現、flat position はフィルタする。
- \`saturate_i128_to_i64\`：3 行の private helper。型境界での唯一の safety net。
- **テスト 15 個**：手書きトレース 13 + proptest 2（antisymmetry、balanced-book zero-sum）。
- **学び**：panic / wrap / saturate という 3 方向の設計テンション、その中で saturation だけが consensus-safe な選択。

**セクション3（Clock state machine、レッスン8〜10）** — Discrete event loop：

- \`FundingClock\` と \`FundingTick\`、\`tick()\`。
- 7 つのテストでカバー：guard の semantics、境界ケース、interval 持続、no-catch-up。
- **学び**：Composition テストが接続ミスを捕まえる。state machine は multi-call のテストを必要とする。設計哲学は doc コメント、テスト、レッスンの散文の 3 箇所に置く — 1 箇所だけに留めてはいけない。

## 正直に先送り

\`crates/funding/\` がやらないことが 5 つある。いずれも現実のプロダクションギャップだが、この crate を pure な state machine に保つために*意図的に先送り*している。

### 1. Oracle 統合

**現状**：\`compute_premium\` は \`mark: MarkPrice, index: IndexPrice\` を入力として受け取る。

**ないもの**：これらの価格を*取得する*方法。呼び出し側は mark を CLOB から（\`clob.best_bid_with_qty()\` の mid-price のような形で）、index を外部 oracle から（Pyth、Chainlink、validator-attested な feed など）取得する必要がある。

**先送りの理由**：Oracle の plumbing には独自のディシプリンが要る — staleness チェック、deviation circuit breaker、複数ソースの aggregation、validator-set 側のサインオフなどだ。これを funding crate にバンドルすると、無関係な 2 つの関心事を結合してしまう。**Bridge レイヤー（将来のコース）が oracle を \`tick()\` に接続する。**

**いつ見直すか**：Funding crate を \`LiveRethEvmBridge\` に組み込むときだ。Bridge の payload 構築コードが、\`clock.tick(...)\` の呼び出しの*直前に*最新の mark / index を読み込む形になる。

### 2. Balance 更新

**現状**：\`tick()\` は \`Vec<Settlement>\` を返す — \`(account, delta)\` ペアのリストだ。

**ないもの**：その delta をアカウント balance に*適用する*メカニズム。

**先送りの理由**：Balance の state は EVM storage（あるいは bridge が維持する別ストア）に置かれる。Funding crate は意図的に storage-free だ — 計算するだけで、永続化はしない。**Bridge が \`Vec<Settlement>\` を受け取り、balance を更新するトランザクションを emit するか、state を直接 mutate する。**

**いつ見直すか**：Oracle 統合と同じタイミングだ。Bridge レイヤーが settlement と balance が出会う場所になる。

### 3. Liquidation

**現状**：Settlement は、アカウントの balance を任意に負まで押し込みうる。

**ないもの**：アカウントが funding の支払いを吸収*できる*かのチェックや、できないときの処理ロジック。

**先送りの理由**：Liquidation は独自の不変条件（insurance fund、ADL waterfall、mark-price トリガー）を持つ別の state machine だ。Funding と結びつけると、2 つの cadence を conflate してしまう（funding は時間単位、liquidation はブロック単位だ）。**Liquidation は独立した crate にすべきだ。**

**いつ見直すか**：Balance 更新の後だ。Bridge が balance の負転を観測し、*そこで*はじめて liquidation エンジンが起動する。

### 4. Multi-market funding

**現状**：単一マーケットに対する \`FundingClock\` が 1 つ。

**ないもの**：複数の永久先物マーケット（BTC-USD、ETH-USD、SOL-USD、さらには interval や cap が異なる可能性もある）にまたがって funding を管理する方法。

**先送りの理由**：Multi-market な設計は素直だ — マーケット 1 つにつき \`FundingClock\` 1 つを置き、bridge レイヤーの \`HashMap<MarketId, FundingClock>\` でまとめて管理すればよい。Crate 側がマーケットの多重性を知る必要はなく、*1 つ*のマーケットに対して正しければそれで十分だ。

**いつ見直すか**：openhl が 2 つ目のマーケットを追加するときだ。**おそらく、この crate の一部としてではない** — 多重化は上位レイヤーの責任だ。

### 5. EVM event としての funding

**現状**：Settlement は \`tick()\` から \`Vec<Settlement>\` として返ってくる。

**ないもの**：スマートコントラクトが funding tick を*観測する*方法。Funding に反応したいコントラクト（例：「funding が X% を超えたら auto-deleverage する」）が、イベントとして購読する手段がない。

**先送りの理由**：非 EVM コードから EVM event を emit するには plumbing が必要だ — bridge が各 \`Settlement\` を \`EvmLog\` に変換して次のブロックに inject する処理を担う。**bridge レイヤーの関心事であって、state-machine の関心事ではない。**

**いつ見直すか**：Event ベースで funding を観測したい具体的なコントラクトユースケースが出てきたときだ。**それまでは telemetry を bridge レイヤーで行えばよい。**

## 次に来るもの

このコースの後に出荷できる拡張が 4 つある：

### Extension 1: Oracle adapter（2-3 日）

1 つ以上のソース（Pyth、Chainlink、validator-signed なフィードなど）から index 価格を pull し、staleness チェック付きで aggregate し、\`fn current_index_price() -> Option<IndexPrice>\` を公開する小さな \`crates/oracle/\`。Bridge は \`clock.tick(...)\` の直前にこれを呼ぶ。**難しいのは staleness threshold をどう決めるかであって、コード自体は素直だ。**

### Extension 2: Bridge 側の funding tick（1 週間）

\`FundingClock\` を \`LiveRethEvmBridge\` に組み込む。Bridge が clock インスタンスを保持し、mark を CLOB から、index を oracle から読み、永久先物 position ストアから position を取得し、\`tick()\` を呼び出して、得られた settlement を balance に適用する。**作業のほとんどは plumbing で、funding crate 自体は 自己完結 のままだ。**

### Extension 3: Liquidation エンジン（3-4 週間）

Funding-tick 後の balance を監視し、under-margined なアカウントを識別し、insurance fund / ADL waterfall を通じて処理を route する独立した \`crates/liquidation/\`。**大きな設計論点が並ぶ：insurance fund のサイジング、partial liquidation、MEV protection など。** これは独立した 1 コースになる規模だ。

### Extension 4: Multi-market manager（1 週間）

\`HashMap<MarketId, FundingClock>\` とマーケットごとの position ストアを抱える \`crates/markets/\`。Bridge が正しい cadence でマーケットごとの funding tick を dispatch する。**コンセプトとしては単純で、価値はマーケットごとの isolation を得られる点にある。**

## コース完了 — 内面化したこと

永久先物 funding を超えて一般化できるスキルが 5 つある：

1. **Consensus システムにおける固定小数点演算。** Validator 間で数値 state を共有する必要があるあらゆる場面 — funding、fee、oracle 価格、vesting schedule など — で、符号付き整数 + スケール定数を使う。一般式で書くと、実数 \`x\`、\`y\` をスケール因子 \`S\` でエンコードして \`X = x × S\` / \`Y = y × S\` を持ち回り、乗算では中間値を一段広い整数型に上げてから最後に \`S\` で割って戻す:

\`\`\`
                          (S = スケール因子、本コースでは S = RATE_SCALE = 1e9)

   実数空間:               x  ·  y                    ──►   x × y
                            │       │                              │
                            ▼       ▼                              ▼
   固定小数点空間:        X = x·S   Y = y·S       X × Y = (x × y) × S²
                                                              │
                                                              ▼  (i128 等の wider 型で受ける)
                                                       (x × y) × S²
                                                              │
                                                              ▼  ÷ S
                                                       (x × y) × S       ◄── 結果の表現
                                                                              (元の固定小数点スケールに戻る)
\`\`\`

セクション2 で何度も格闘した「中間積が \`S\` の分だけ余分に拡大するので \`i128\` で受け、最後に \`RATE_SCALE\` で割って打ち消す」の正体がこの 1 式だ。**\`RATE_SCALE = 1e9\` はパターンで、定数の具体値はケースごとに変わる。** Fee 計算なら \`S = 10_000\` (basis-point スケール) で同じパターンが当てはまるし、vesting schedule なら \`S = 86_400\` (日単位) で時間方向の固定小数点を組める。

2. **Consensus-safe な overflow 戦略としての saturation。** Panic は halt 経由の chain fork、wrap は誤った値経由の chain fork を生む。Saturate は bounded で、しかも validator 間で consistent だ。**Consensus-critical な数学に対しては、saturate が唯一の選択肢だ。**

3. **意味的な区別を入れるための newtype パターン。** \`MarkPrice\` も \`IndexPrice\` も \`u64\` をラップしているが、別の概念だ。Newtype のおかげで引数順バグはコンパイル時に防げ、符号規約は doc コメントが運ぶ。**newtype 1 つあたり 5 行で、バグクラス全体を防げる。**

4. **レイヤー化されたコードのための composition テスト。** 各レイヤー（\`compute_premium\`、\`compute_rate\`、\`apply_funding\`）は個別にテストされるが、レイヤー化そのものは別の関心事だ。**\`tick()\` のテストが composition を検証し、unit テストが個々のピースを検証する。両方が必要だ。**

5. **設計哲学はコードと doc とテストと散文に分散させる。** No-catch-up 不変条件は \`clock.rs\` の module doc で名指され、\`tick()\` の実装で強制され、\`no_catchup_after_long_gap\` で検証され、このコースで説明された。**理由付けを 4 箇所で見つけられる。個々のピースが変わっても、理由付け自体は生き残る。**

## このコースが レッスン1 Architect track のどこに位置するか

**Course 1-5**（Reth internals）：pipeline、payload building、NodeBuilder、evm crate、RPC。

**Step 1 (Consensus)**（openhl-consensus）：Malachite 統合。

**Step 2 (CLOB)**（openhl-clob）：マッチングエンジン。

**Step 3（Precompiles）**（openhl-precompiles）：カスタム precompile 経由の EVM ↔ CLOB ブリッジ。

**Step 4 (Funding)（このコース）**：Funding state machine。**pure な state、I/O なし — Step 3（Precompiles） の bridge plumbing と対をなす位置づけだ。**

**Step 5 (Liquidation)**（openhl-bridge-integration — 将来）：funding、oracle、liquidation を \`LiveRethEvmBridge\` に組み込む。ここで courses 6-9 のすべてが、動作する perp DEX として組み上がる。

レッスン1 Architect track の 90% を踏破した。**このコースで身につけたパターン（固定小数点、saturation、composition テスト）は、残りの作業すべてに当てはまる。**

## 最終答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
\`\`\`

レッスン11 後、**\`crates/funding/\` ディレクトリ全体が Funding参照実装コミット と 一致** に一致するはずだ。3 ファイルにまたがる ~635 LOC の 1 commit を、各行が*なぜ*そこにあるのかを完全に理解した上で手で再現した。**Crate は standalone でコンパイルが通り、テストも standalone で pass する。外部依存は \`openhl-clob\`（\`AccountId\` 用）以外にない。**

戻す：

\`\`\`bash
git checkout main
\`\`\`

## あなたがこれを出荷した

22 テスト pass、ソースファイル 3 つ、プロダクション Rust ~635 LOC。Funding state machine ができることは：
- 符号付き固定小数点の精度で、deterministic な premium / rate / settlement の数学を計算する。
- Pathological な入力に対しては panic ではなく saturate する。
- Configurable な interval で settlement を gate する。
- 長い gap の後の catch-up は拒否する（数学を公平性に揃えるための哲学的な選択だ）。

**これで、Hyperliquid 型の永久先物 funding メカニズム一式が手に入った。しかも、任意の Rust トレーディングシステムに drop in できる crate という形でだ。** 次に誰かから「永久先物 funding はどう動くの？」と聞かれたら — この crate を見せればいい。

それでは、永久先物を作りに行こう。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
