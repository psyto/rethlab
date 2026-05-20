# Building OpenHL Funding — L11 draft (JA) — build-along

> Capstone レッスン。新コードなし。Stage 8b を統合し先送り作業を名指す。
> コース: `building-openhl-funding-ja`（track: `reth-l1-architect`）。

---

## L11 — `openhl-funding-capstone-ja`

- **Module:** 4 (Capstone), sortOrder 0
- **Course-level sortOrder:** 11 (lesson 12 of 12)
- **Duration:** 20 min
- **XP reward:** 40
- **Type:** CONTENT
- **Milestone:** コース完了

### Content

````markdown
# レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの

## ゴール

このレッスンが終わると：

- Funding pipeline を記憶からホワイトボードに描ける：`(mark, index)` → premium → rate → settlements、clock で gate される。
- 5 つの先送り項目を名指し（oracle 統合、balance 更新、liquidation、multi-market funding、funding-as-EVM-event）、それぞれが `crates/funding/` の範囲外の理由を説明できる。
- 4 つの拡張が将来コースのどこに来るかを描ける。
- この state machine を永久先物 DEX に配線する準備ができる。

**このレッスンにコードなし。** メンタルモデルだけ。

## Pipeline、1 枚の図で

```
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
   ║    yes → 上の pipeline 実行、`now` に advance           ║
   ╚═══════════════════════════════════════════════════════╝
```

上から下：価格 in、settlement out。Clock が pipeline 全体を「十分時間経過したか？」gate でラップ。

## 各モジュールが届けたもの

**Module 1 (Determinism + 型、L1-L3)** — 固定小数点語彙：

- `RATE_SCALE = 1_000_000_000`（ppb）：load-bearing 定数。
- 9 newtype：`MarkPrice`、`IndexPrice`、`Premium`、`FundingRate`、`Notional`、`PositionSize`、`Position`、`Settlement`、`FundingParams`。
- `hyperliquid_default()`：3600s interval、±4% cap、divisor 8。
- **学び**：Newtype が引数順バグをコンパイル時に防ぐ、符号規約が定義場所の doc コメントに住む。

**Module 2 (純粋な compute、L4-L7)** — Stateless 数学：

- `compute_premium(mark, index) → Premium` — `index == 0` で graceful、i128 中間値、saturate。
- `compute_rate(premium, params) → FundingRate` — divide-then-clamp、cap に defensive `.abs()`。
- `apply_funding(positions, mark, rate) → Vec<Settlement>` — 単項マイナスで longs-pay-shorts、flat position フィルタ。
- `saturate_i128_to_i64`：3 行 private helper、型境界での唯一の safety net。
- **15 テスト**：13 手書きトレース + 2 proptest（antisymmetry、balanced-book zero-sum）。
- **学び**：panic-vs-wrap-vs-saturate の 3 方向設計テンション、saturation が唯一の consensus-safe 選択。

**Module 3 (Clock state machine、L8-L10)** — Discrete event loop：

- `FundingClock` + `FundingTick` + `tick()`。
- 7 テストでカバー：guard semantics、境界ケース、interval 持続、no-catch-up。
- **学び**：Composition テストが配線エラーを捕まえる、state machine が multi-call テストを必要とする、設計哲学が doc コメント + テスト + レッスン散文に住む、決して 1 箇所だけにではない。

## 正直に先送り

`crates/funding/` がやらない 5 つ。それぞれ実際のプロダクションギャップ、この crate を pure state machine に保つため*意図的に先送り*。

### 1. Oracle 統合

**現状**：`compute_premium` が `mark: MarkPrice, index: IndexPrice` を入力として取る。

**ないもの**：それらの価格を*取得する*方法。呼び出し側が CLOB から mark を取得（`clob.best_bid_with_qty()` mid-price のような何か経由）、外部 oracle から index を取得（Pyth、Chainlink、validator-attested feed）。

**先送りの理由**：Oracle plumbing は独自の discipline — staleness チェック、deviation circuit breaker、multi-source aggregation、validator-set サインオフ。Funding crate にバンドルすると 2 つの無関係な関心を結合。**Bridge layer（将来コース）が oracle を `tick()` に配線。**

**いつ見直す**：Funding crate を `LiveRethEvmBridge` に配線するとき。Bridge の payload-building コードが `clock.tick(...)` 呼び出しの*直前に*最新の mark/index を read する。

### 2. Balance 更新

**現状**：`tick()` が `Vec<Settlement>` を返す — `(account, delta)` ペアのリスト。

**ないもの**：それらの delta をアカウント balance に*適用する*メカニズム。

**先送りの理由**：Balance state は EVM storage（または bridge が維持する別の store）に住む。Funding crate は意図的に storage-free — 計算する、永続化しない。**Bridge が `Vec<Settlement>` を取り、balance-update transaction を emit するか直接 state mutation する。**

**いつ見直す**：Oracle 統合と同じ。Bridge layer が settlement が balance に出会う場所。

### 3. Liquidation

**現状**：アカウントの balance を任意に負に押せる settlement。

**ないもの**：アカウントが funding 支払いを吸収する*能力*があるかのチェック、もしくはそうでないときの処理ロジック。

**先送りの理由**：Liquidation は独自の不変条件（insurance fund、ADL waterfall、mark-price trigger）を持つ別の state machine。Funding と結ぶと 2 つの cadence を conflate（funding は hourly、liquidation は per-block）。**Liquidation は独自の crate であるべき。**

**いつ見直す**：Balance 更新の後。Bridge が balance が負になるのを見る、*それから* liquidation engine が kick in。

### 4. Multi-market funding

**現状**：単一マーケットに対する単一 `FundingClock`。

**ないもの**：複数の永久先物マーケット（BTC-USD、ETH-USD、SOL-USD 等、潜在的に異なる interval や cap）にわたる funding を管理する方法。

**先送りの理由**：Multi-market 設計は素直 — マーケットあたり 1 つの `FundingClock`、すべて bridge layer の `HashMap<MarketId, FundingClock>` で管理。Crate がマーケット多重性を知る必要なし、ただ*1 つ*に対して正しい必要。

**いつ見直す**：openhl が 2 つ目のマーケットを追加するとき。**おそらくこの crate の一部としては決して** — 多重化は上の責任。

### 5. EVM event としての funding

**現状**：`tick()` から返される `Vec<Settlement>` としての settlement。

**ないもの**：スマートコントラクトが funding tick を*観測*する方法。Funding に反応したいコントラクト（例：「funding が X% を超えたら auto-deleverage」）が event として subscribe できない。

**先送りの理由**：非 EVM コードから EVM event を emit するには plumbing が必要 — bridge が各 `Settlement` を `EvmLog` に変換して次のブロックに inject する必要。**Bridge-layer 関心、state-machine 関心ではない。**

**いつ見直す**：Event ベースの funding 観測を要求する具体的なコントラクトユースケースがあるとき。**それまで、telemetry は bridge layer でできる。**

## 次に来るもの

このコース後に出荷できる 4 つの拡張：

### Extension 1: Oracle adapter（2-3 日）

1 つ以上の source（Pyth、Chainlink、validator-signed）から index 価格を pull、staleness チェック付きで aggregate、`fn current_index_price() -> Option<IndexPrice>` を露出する小さな `crates/oracle/`。Bridge が `clock.tick(...)` の直前にこれを呼ぶ。**難しい部分は staleness threshold の選択、コードは素直。**

### Extension 2: Bridge 側 funding tick（1 週間）

`FundingClock` を `LiveRethEvmBridge` に配線。Bridge が clock インスタンスを所有、mark を CLOB から read、index を oracle から read、永久先物 position store から position を取得、`tick()` を呼ぶ、結果の settlement を balance に適用。**ほとんどが plumbing 作業、funding crate は self-contained。**

### Extension 3: Liquidation engine（3-4 週間）

Funding-tick 後の balance を監視、under-margined アカウントを識別、insurance fund / ADL waterfall を通して route する別の `crates/liquidation/`。**大きな設計議論：insurance fund サイジング、partial liquidation、MEV protection。** これは独自のコース。

### Extension 4: Multi-market manager（1 週間）

`HashMap<MarketId, FundingClock>` + per-market position store を維持する `crates/markets/`。Bridge が正しい cadence でマーケットあたり funding tick を dispatch。**概念的に simple、価値はマーケットごとの isolation。**

## コース完了 — 内在化したこと

永久先物 funding を超えて一般化する 5 つのスキル：

1. **Consensus システムの固定小数点演算。** Validator 間で数値 state を共有する必要がある任意の時 — funding、fee、oracle 価格、vesting schedule — 符号付き整数 + scale 定数を使う。**`RATE_SCALE = 1e9` がパターン、定数値が variable。**

2. **Consensus-safe overflow 戦略としての saturation。** Panic = halt 経由のチェーン fork。Wrap = wrong value 経由のチェーン fork。Saturate = bounded、validator 間で consistent。**任意の consensus-critical 数学に対して saturate が唯一の選択。**

3. **意味的区別のための Newtype パターン。** `MarkPrice` と `IndexPrice` は両方 `u64` をラップするが、異なる概念。Newtype が引数順バグをコンパイル時に防ぐ、doc コメントが符号規約を運ぶ。**Newtype あたり 5 行、バグクラス全体を防ぐ。**

4. **層化コードのための Composition テスト。** 各 layer（`compute_premium`、`compute_rate`、`apply_funding`）が個別にテストされるが、層化自体が別の関心。**`tick()` テストが composition を verify、unit テストが piece を verify。両方が必要。**

5. **設計哲学がコード + doc + テスト + 散文に住む。** No-catch-up 不変条件が `clock.rs` の module doc で名指され、`tick()` の実装で強制され、`no_catchup_after_long_gap` で verify され、このコースで説明された。**理由付けを 4 箇所で見つけられる、理由付けが個別ピースが変わっても survive する。**

## このコースが L1 Architect track のどこに位置するか

**Course 1-5**（Reth internals）：pipeline、payload building、NodeBuilder、evm crate、RPC。

**Course 6**（openhl-consensus）：Malachite 統合。

**Course 7**（openhl-clob）：マッチングエンジン。

**Course 8**（openhl-precompiles）：カスタム precompile 経由の EVM ↔ CLOB ブリッジ。

**Course 9（このコース）**：Funding state machine。**Pure state、I/O なし — course 8 の bridge plumbing への対比。**

**Course 10**（openhl-bridge-integration — 将来）：funding + oracle + liquidation を `LiveRethEvmBridge` に配線。これが courses 6-9 のすべてが runnable perp DEX に compose する場所。

L1 Architect track の 90% を踏破した。**このコースのパターン（固定小数点、saturation、composition テスト）が残り作業全体に applied。**

## 最終答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
```

L11 後、**`crates/funding/` ディレクトリ全体が Stage 8b と byte-identical** に一致するはず。1 commit（3 ファイルにわたって ~635 LOC）を手で再現した — 各行がなぜそこにあるかを完全に理解した上で。**Crate が standalone でコンパイル、テストが standalone で pass、`openhl-clob`（`AccountId` 用）以外の外部依存なし。**

戻す：

```bash
git checkout main
```

## あなたがこれを出荷した

22 テスト pass。3 ソースファイル。プロダクション Rust ~635 LOC。Funding state machine が：
- 符号付き固定小数点精度で deterministic な premium/rate/settlement 数学を計算する；
- Pathological 入力で panic でなく saturate する；
- Configurable interval で settlement を gate する；
- 長 gap 後の catch-up を拒否する（数学を公平性と整合させる哲学的選択）。

**それが HL シェイプ永久先物 funding メカニズム全体、任意の Rust トレーディングシステムに drop in できる crate で。** 次に誰かに「永久先物 funding はどう動く？」と聞かれたら — この crate を見せて。

永久先物を作りに行こう。
````

---

## Seed-file slot

L11 は新規 Module 4 (Capstone) の sortOrder 0 に入る：

```typescript
{
  title: 'レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの',
  slug: 'openhl-funding-capstone-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 20,
  xpReward: 40,
  content: `# レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの\n\n...`
},
```

## SHA pinning discipline

L11 はコード変更を導入しない。累積答え合わせチェック（`diff -u crates/funding/ -r`）は `cd94137` に対して — このコースの全レッスンが引用する同じ SHA。

## Style review notes (self-critique before paste)

- **§ゴールが L11 をメンタルモデルレッスンとしてフレーミング** — 明示的にコードなし。
- **§Pipeline 図**が centerpiece — 読者が形を思い出すために戻れる。
- **§モジュールごとの分解**が各モジュールを 3-4 bullet + 「学び」に凝縮。
- **§正直に先送り**が 5 プロダクションギャップを **先送り理由** と **いつ見直す** で名指す — action-oriented。
- **§次に来るもの**が 4 拡張を複雑度順で sketch。
- **§内在化したスキル**が 5 一般化可能パターンをコース内容から持ち上げる。
- **§コースの位置づけ**が L11 をより広い L1 Architect track に anchor。
- **§あなたがこれを出荷した**が具体的数字付きのお祝い段落。
- スタイルが course 8 の L11 と並行（同構造、異具体性） — トラック全体で一貫。
