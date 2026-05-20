# Building OpenHL Funding — L0 draft (JA) — build-along

> openhl SHA `cd94137`（Stage 8b — funding state machine）に対するドラフト。
> コース: `building-openhl-funding-ja`（track: `reth-l1-architect`）。

---

## L0 — `openhl-funding-orientation-ja`

- **Module:** 0 (Orientation), sortOrder 0
- **Course-level sortOrder:** 0 (lesson 1 of 12)
- **Duration:** 15 min
- **XP reward:** 50
- **Type:** CONTENT

### Content

````markdown
# OpenHL Funding を作る — 永久先物 funding state machine

## 何を作るか

前コース（`building-openhl-precompiles`）ではカスタム EVM precompile を Reth に plug-in し、スマートコントラクトから live CLOB を read/write できるようにした。このコースで作るのは openhl の次のプリミティブ — 永久先物の **funding 支払いを駆動する state machine** だ。

コース終了時に出荷するもの：

- 新しい `openhl-funding` crate に **3 ソースファイル / ~635 LOC**。
- **22 テストが通る**：手書き 20 + proptest 2（premium antisymmetry と balanced-book zero-sum）。
- **3 つの building block**：固定小数点の types モジュール、純粋な compute モジュール（premium / rate / settlement）、tick gating を担う clock state machine。
- **clock の不変条件 2 つを強制**：interval ごとに settlement は最多 1 回、長時間ギャップ後の catch-up なし。

理解するもの：

- 浮動小数点演算が consensus システムでチェーン分岐を招く理由。
- Hyperliquid funding-rate の形：divisor + cap 付きで premium → rate → settlement。
- `RATE_SCALE = 1_000_000_000`（parts-per-billion）でスケールした固定小数点整数を使えば、consensus リスクなしに 9 桁の精度が得られる仕組み。
- 純粋な state machine + saturating arithmetic が consensus 中核の数学に対して正しい形である理由。
- clock が（`last_settled + interval` でなく）`now` まで進む理由 — そしてそこに焼き込まれた設計トレードオフ。

## なぜ funding が重要か（perp 1 段落）

永久先物には期限がない。では mark price はどうやって spot/index price にアンカーされるのか。答えが funding 支払いだ。Mark > index のとき（つまり longs が spot 比で overpay しているとき）、longs が shorts に固定サイクルで支払う — 典型的には interval ごと（HL では 1 時間）。Mark < index のときは shorts が longs に支払う。Premium `(mark - index) / index` を `divisor`（HL では 8）で割って per-interval rate を出し、ネットワーク設定の絶対上限（HL では ±4%/interval）で**キャップ**することで最悪ケースの支払いを bound する。各 tick で、非ゼロ position を持つ各アカウントが `size × mark × rate` の quote currency を決済する。Premium の符号によって longs が支払うのか shorts が受け取るのかが決まる。

## なぜ funding に float を使えないのか

Consensus L1 では、各 validator が他の validator と*完全に同じ* funding rate を計算しなければならない。2 つの validator が rate の最下位ビット 1 つでも食い違えば、チェーンは fork する。

浮動小数点演算は以下の軸で異なるビットパターンを生む：
- **コンパイラ** — LLVM が FMA（fused multiply-add）を、ある CPU では emit し別の CPU では split に分解することがある。
- **CPU** — 丸めモードが異なる、denormal の扱いも異なる。
- **演算順** — `(a * b) + c` と `a * b + c` は同じに見える IR にコンパイルされても、最適化後の LSB が異なることがある。

Funding rate で 1 LSB の不一致が生じたときのコストは**チェーン fork** だ。Fork の別側にいる validator が異なる delta を決済し、balance が乖離し、次のブロックがどちらのチェーンに対しても検証されない。

対処は単純で、float は一切使わない。すべての計算を `RATE_SCALE = 1_000_000_000`（parts-per-billion）でスケールした符号付き整数で行う。`0.04`（4%）は `40_000_000`、`0.001`（0.1%）は `1_000_000`。乗算では overflow 回避のため `i128` 中間値が要る、除算はその後だ。

これは Solana の compute budget、Ethereum の EVM、その他あらゆる consensus システムが課す制約と同じ話だ。**Determinism がすべてを決める。**

## 12 レッスン

### Module 0 — Orientation
- **L0**（このレッスン）— なぜ funding、なぜ固定小数点、なぜ state machine。

### Module 1 — Determinism + 型 (L1-L3)
- **L1** — `RATE_SCALE = 1e9`：固定小数点方式、なぜ整数か、9 桁の精度で何が手に入るか。
- **L2** — 金額型：`MarkPrice` / `IndexPrice` / `Premium` / `Notional`。それぞれが単なる `i64` でなく newtype である理由。
- **L3** — Position 型：`PositionSize` / `Position` / `Settlement` / `FundingParams`。HL デフォルトと各パラメータが encode する内容。

### Module 2 — 純粋な compute (L4-L7)
- **L4** — `compute_premium`：`(mark - index) / index` の導出。符号対称性のテスト。
- **L5** — `saturate_i128_to_i64` と overflow 哲学。なぜ saturate するのか、なぜ panic でないのか。
- **L6** — `compute_rate`：divisor、cap、HL スタイルのデフォルト、clamp 挙動。
- **L7** — `apply_funding`：longs-pay-shorts の符号規約。Balanced-book zero-sum 不変条件。

### Module 3 — Clock state machine (L8-L10)
- **L8** — `FundingClock` 構造体と `tick()` インターフェース。
- **L9** — Interval gating 不変条件：interval ごとに settlement は最多 1 回。境界でのテスト。
- **L10** — No-catch-up 不変条件：10-interval のギャップでも settle は 1 回、10 回ではない。その理由。

### Module 4 — Capstone (L11)
- **L11** — 統合。Bridge integration のプレビュー（funding が `LiveRethEvmBridge` のどこに plug-in されるか）。正直に先送りする項目：oracle、liquidation、basis-vs-fixed funding。

## モジュールごとの SHA pinning

各レッスンには build 対象となる openhl commit を引用する。このコースでは 12 レッスンすべてが **Stage 8b `cd94137`** を引用する — funding が 1 つの self-contained な commit に収まっているからだ（course 8 が Stage 9a-9d の 5 commit にまたがったのとは対照的）。綺麗な SHA マッピングのおかげで、L11 終了時点の answer-key diff は `crates/funding/` 配下で `cd94137` と byte-identical になる。

| Module | Lessons | SHA |
|---|---|---|
| 0 | L0 | `cd94137` |
| 1 | L1-L3 | `cd94137` |
| 2 | L4-L7 | `cd94137` |
| 3 | L8-L10 | `cd94137` |
| 4 | L11 | `cd94137` |

## 前提

このコースから最大限を引き出すには：

- **Course 6 (openhl-consensus) と course 7 (openhl-clob)** をコンセプト背景として頭に入れていること — funding state machine は `AccountId`（course 7）を受け取り、courses 6+7 で構築した bridge にプラグインされる。**Course 8（precompiles）はスキップしても本コースは追える** — funding は純粋な state-machine 数学であり、EVM 側の配線ではないからだ。
- **Rust の i128 演算に慣れていること** — overflow 回避のための `as i128` upcast を 1 回以上経験していればよい。
- **永久先物 funding メカニクスに最低限の馴染みがあること**。Perp 取引経験がなくても、上の 1 段落のおさらいで十分。Hyperliquid で perp を取引した経験があれば準備完了。
- **EVM 固有の知識は不要**。このコースは precompile、コントラクト、RPC に触れない。

不要なもの：
- 動作中の openhl ノード（funding crate は I/O ゼロ）。
- Solana やその他 L1 の経験。
- 定量金融のバックグラウンド — ここでの数学は素直な固定小数点演算に過ぎない。

## セットアップ

```bash
# openhl workspace root で：
cd ~/code/my-openhl
git checkout main
cargo build --workspace  # baseline — L1 前に通るべき
```

リファレンスチェックアウト（各レッスン末尾の answer-key diff 用）：

```bash
cd ~/code/openhl-reference  # 作業ツリーと別チェックアウト
git checkout cd94137
```

（同じ workspace で lookup の間に `git stash` でも動く。）

## コーススタイル

各レッスンは courses 6-8 で確立した build-along フォーマットに従う：
- **ゴール** — 終了時点で何が通り、何ができあがるか。
- **おさらい** — 前レッスンの終了地点。
- **プラン** — 具体的な編集を番号付きで列挙。
- **考えてみよう** callout（🛑 + 「スクロール前に...」）— 答えの前に問いを出すことで答えが定着する。
- **やりがちな勘違い** callout（🛑 + よくある誤解を名指し）— 「ただ〜できないの？」という反射を先回り。
- **手順** — コード編集をステップごとに、変更ごとの説明付きで。
- **テスト** — `cargo test` コマンドと期待出力。
- **設計の振り返り** — このレッスンのコードに焼き込まれた load-bearing な決定を 3〜5 個。
- **答え合わせ** — openhl リファレンス SHA との `git diff`。
- **よくある質問** — 3〜5 個の質問と、根拠のある回答。

数学的なコンテンツ（特に modules 2-3）は course 8 に比べてコンセプト重心、コード重心が薄い。**公式が出てくる箇所ではペースを落とす**つもりで進めてほしい — 短いコードでも、考えうるあらゆる入力で正しい値を計算する必要がある。**Perp funding のバグはクラッシュしない。静かに wealth を移してしまう。**

## 準備完了

それでは L1 へ。L1 では `RATE_SCALE` 定数と、その後のすべてが乗る固定小数点方式を設定する。
````

---

## Seed-file slot

L0 は Module 0 (Orientation) の sortOrder 0 に入る：

```typescript
{
  title: 'OpenHL Funding を作る — 永久先物 funding state machine',
  slug: 'openhl-funding-orientation-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# OpenHL Funding を作る — 永久先物 funding state machine\n\n...`
},
```

## SHA pinning discipline

L0 は `cd94137`（Stage 8b）を引用。コース全体がこの 1 SHA に pin — funding は 1 つの self-contained commit として出荷された。

## Style review notes (self-critique before paste)

- **§なぜ float が使えないか** が determinism フレーミングを正当化 — consensus 背景がない読者にチェーン分岐の説明が前提として要る。
- **§12 レッスン**が構造を 1 行ずつ map — 読者が L1 前にパスを見える。
- **§前提**が course 8 がスキップ可能であることを明示。Precompiles をスキップした人もこのコースを追える。
- **§コーススタイル**が数学重心モジュールへの読者期待をセット — 「公式のところでペースを落とす」が鍵のヒューリスティック。
- **§セットアップ**が最小限 — ノード bootstrap なし、まだ integration test なし。純粋な crate 作業。
