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

前コース（`building-openhl-precompiles`）はカスタム EVM precompile を Reth に plug-in して、スマートコントラクトが live CLOB を read/write できるようにした。このコースでは openhl の次のプリミティブを作る：永久先物の **funding 支払いを駆動する state machine**。

このコースの終わりに出荷するもの：

- **3 ソースファイル / ~635 LOC**、新しい `openhl-funding` crate に。
- **22 tests 通る**：20 手書き + 2 proptest（premium antisymmetry + balanced-book zero-sum）。
- **3 つの building block**：固定小数点の types モジュール、純粋な compute モジュール（premium / rate / settlement）、tick gating の clock state machine。
- **clock の 2 つの不変条件を強制**：interval ごとに settlement は最多 1 回、長時間ギャップ後の catch-up なし。

理解するもの：

- なぜ浮動小数点演算が consensus システムでチェーン分岐ハザードになるか。
- Hyperliquid funding-rate の形：premium → rate → settlement、divisor + cap 付き。
- `RATE_SCALE = 1_000_000_000`（parts-per-billion）でスケールした固定小数点整数で、consensus リスクなしに 9 桁の精度を得るやり方。
- なぜ純粋な state machine + saturating arithmetic が consensus 中核の数学の正しい形か。
- なぜ clock が `now` まで進むか（`last_settled + interval` でなく） — そしてそこに焼き込まれた設計トレードオフ。

## なぜ funding が重要か（perp 1 段落）

永久先物は期限がない。じゃあ mark price はどうやって spot/index price にアンカーされる？ Funding 支払い。Mark > index のとき（longs が spot 比で overpay している）、longs が shorts に固定のサイクルで支払う — 典型的には interval ごと（HL: 1 時間）。Mark < index のときは shorts が longs に支払う。Premium `(mark - index) / index` は `divisor`（HL: 8）で割って per-interval rate を出し、network 設定の絶対上限（HL: ±4%/interval）で**キャップ**して、最悪ケースの支払いを bound する。各 tick で、ゼロでない position を持つ各アカウントが `size × mark × rate` の quote currency を決済。Premium の符号によって longs が支払うか shorts が受け取るかが決まる。

## なぜ funding は float を使えないか

Consensus L1 の validator は他の validator と*完全に同じ* funding rate を計算しなければならない。2 つの validator が rate の最下位ビット 1 つでも一致しないと、チェーンが fork する。

Float 演算は以下にまたがって異なるビットパターンを生む：
- **コンパイラ** — LLVM が FMA（fused multiply-add）を ある CPU で emit して別の CPU で split することがある。
- **CPU** — 丸めモードが異なる、denormal の扱いが異なる。
- **演算順** — `(a * b) + c` と `a * b + c` は同じに見える IR にコンパイルされても、最適化後の LSB が異なることがある。

Funding rate での 1 LSB の不一致のコストは**チェーン分岐**。Fork の異なる側にいる validator が異なる delta を決済、balance が divergent、次のブロックがどちらのチェーンに対しても検証しない。

修正：float を一切使わない。すべて `RATE_SCALE = 1_000_000_000`（parts-per-billion）でスケールした符号付き整数で計算する。`0.04`（4%）は `40_000_000`。`0.001`（0.1%）は `1_000_000`。乗算では overflow 回避のため `i128` 中間値が必要、除算は後。

これは Solana の compute budget、Ethereum の EVM、そして他のすべての consensus システムが課す制約と同じ。**Determinism がゲーム全体。**

## 12 レッスン

### Module 0 — Orientation
- **L0**（このレッスン）— なぜ funding、なぜ固定小数点、なぜ state machine。

### Module 1 — Determinism + 型 (L1-L3)
- **L1** — `RATE_SCALE = 1e9`：固定小数点の方式、なぜ整数、9 桁の精度が何を買うか。
- **L2** — 金額型：`MarkPrice` / `IndexPrice` / `Premium` / `Notional`。なぜそれぞれが newtype で、ただの `i64` でないか。
- **L3** — Position 型：`PositionSize` / `Position` / `Settlement` / `FundingParams`。HL デフォルトと各パラメータが encode するもの。

### Module 2 — 純粋な compute (L4-L7)
- **L4** — `compute_premium`：`(mark - index) / index` の導出。Sign symmetry のテスト。
- **L5** — `saturate_i128_to_i64` + overflow 哲学。なぜ saturate、なぜ panic でない。
- **L6** — `compute_rate`：divisor、cap、HL スタイルのデフォルト。Clamp 挙動。
- **L7** — `apply_funding`：longs-pay-shorts の符号規約。Balanced-book zero-sum 不変条件。

### Module 3 — Clock state machine (L8-L10)
- **L8** — `FundingClock` 構造体 + `tick()` インターフェース。
- **L9** — Interval gating 不変条件：interval ごとに settlement は最多 1 回。境界でのテスト。
- **L10** — No-catch-up 不変条件：10-interval ギャップは 1 回 settle、10 回でなく。なぜ。

### Module 4 — Capstone (L11)
- **L11** — 統合。Bridge integration プレビュー（funding が `LiveRethEvmBridge` のどこに plug-in されるか）。正直に先送り：oracle、liquidation、basis-vs-fixed funding。

## モジュールごとの SHA pinning

各レッスンが build 対象の openhl commit を引用する。このコースでは 12 レッスンすべてが **Stage 8b `cd94137`** を引用 — funding は 1 つの self-contained commit。（course 8 が Stage 9a-9d の 5 commit にまたがったのと対照的。）綺麗な SHA マッピングは、L11 終了時点の answer-key diff が `crates/funding/` で `cd94137` と byte-identical になることを意味する。

| Module | Lessons | SHA |
|---|---|---|
| 0 | L0 | `cd94137` |
| 1 | L1-L3 | `cd94137` |
| 2 | L4-L7 | `cd94137` |
| 3 | L8-L10 | `cd94137` |
| 4 | L11 | `cd94137` |

## 前提

このコースから最大限を得るには：

- **Course 6 (openhl-consensus) と course 7 (openhl-clob)** をコンセプト背景として頭に入れていること — funding state machine は `AccountId`（course 7）を消費し、courses 6+7 で構築した bridge にプラグインされる予定。**Course 8（precompiles）はスキップしても、このコースは追えます** — funding は純粋な state-machine 数学、EVM 側配線ではない。
- **Rust の i128 演算に慣れていること** — overflow 回避のための `as i128` upcast を 1 回以上やったことがある。
- **永久先物 funding メカニクスに最低限の馴染み**。Perp を取引したことがなければ、上の 1 段落の recap で十分。Hyperliquid で perp を取引したことがあるなら準備完了。
- **EVM 固有の知識は不要**。このコースは precompile、コントラクト、RPC に触れない。

不要なもの：
- 動いている openhl ノード（funding crate は I/O ゼロ）。
- Solana や他の L1 経験。
- 定量金融の背景 — ここでの数学は素直な固定小数点演算。

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
- **ゴール** — 終わりに何が通る/何が作られる。
- **おさらい** — 前レッスンの終了地点。
- **プラン** — 具体的な編集を番号付きで。
- **考えてみよう** callout（🛑 + "スクロール前に..."）— 答えの前に問い。答えが定着する。
- **やりがちな勘違い** callout（🛑 + よくある誤解を名指し）— 「ただ〜できないの？」反射を先回り。
- **手順** — コード編集をステップごとに、変更ごとの説明付き。
- **テスト** — `cargo test` コマンドと期待される出力。
- **設計の振り返り** — このレッスンのコードに焼き込まれた load-bearing 決定 3-5 個。
- **答え合わせ** — openhl リファレンス SHA との `git diff`。
- **よくある質問** — 3-5 個の質問と grounded な回答。

数学コンテンツ（特に modules 2-3）は course 8 と比べてコンセプト重心、コード重心が薄い。**公式のところでペースを落とす**プランで進めて — 短いが、想像しうる全入力で正しいものを計算する必要がある。**Perp funding バグはクラッシュしない。静かに wealth を shift させる。**

## 準備完了

L1 へ。そこで `RATE_SCALE` 定数とこの後のすべてが乗る固定小数点方式を設定する。
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
