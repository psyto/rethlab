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

このレッスンを終えると：

- Funding pipeline を記憶からホワイトボードに描けるようになる：`(mark, index)` → premium → rate → settlements、それを clock で gate する、という形だ。
- 先送りした 5 項目（oracle 統合、balance 更新、liquidation、multi-market funding、funding-as-EVM-event）を名指しでき、それぞれがなぜ `crates/funding/` の守備範囲外なのかを説明できるようになる。
- 4 つの拡張が将来のどのコースに位置づけられるかを描けるようになる。
- この state machine を永久先物 DEX に組み込む準備が整う。

**このレッスンにコードはない。** メンタルモデルだけだ。

## Pipeline、1 枚の図で

```
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
   ║    yes → 上の pipeline 実行、`now` に advance           ║
   ╚═══════════════════════════════════════════════════════╝
```

上から下へ：価格を入力、settlement を出力。pipeline 全体を、clock が「十分な時間が経過したか？」の gate でラップする。

## 各モジュールが届けたもの

**Module 1（Determinism + 型、L1-L3）** — 固定小数点の語彙：

- `RATE_SCALE = 1_000_000_000`（ppb）：load-bearing な定数。
- 9 つの newtype：`MarkPrice`、`IndexPrice`、`Premium`、`FundingRate`、`Notional`、`PositionSize`、`Position`、`Settlement`、`FundingParams`。
- `hyperliquid_default()`：3600 秒 interval、±4% cap、divisor 8。
- **学び**：Newtype のおかげで引数順バグをコンパイル時に防げる。符号規約は、その型の定義場所の doc コメントに置く。

**Module 2（純粋な compute、L4-L7）** — Stateless な数学：

- `compute_premium(mark, index) → Premium` — `index == 0` で graceful、i128 中間値、saturate する。
- `compute_rate(premium, params) → FundingRate` — divide してから clamp、cap には defensive な `.abs()`。
- `apply_funding(positions, mark, rate) → Vec<Settlement>` — 単項マイナスで longs-pay-shorts を表現、flat position はフィルタする。
- `saturate_i128_to_i64`：3 行の private helper。型境界での唯一の safety net。
- **テスト 15 個**：手書きトレース 13 + proptest 2（antisymmetry、balanced-book zero-sum）。
- **学び**：panic / wrap / saturate という 3 方向の設計テンション、その中で saturation だけが consensus-safe な選択。

**Module 3（Clock state machine、L8-L10）** — Discrete event loop：

- `FundingClock` と `FundingTick`、`tick()`。
- 7 つのテストでカバー：guard の semantics、境界ケース、interval 持続、no-catch-up。
- **学び**：Composition テストが接続ミスを捕まえる。state machine は multi-call のテストを必要とする。設計哲学は doc コメント、テスト、レッスンの散文の 3 箇所に置く — 1 箇所だけに留めてはいけない。

## 正直に先送り

`crates/funding/` がやらないことが 5 つある。いずれも現実のプロダクションギャップだが、この crate を pure な state machine に保つために*意図的に先送り*している。

### 1. Oracle 統合

**現状**：`compute_premium` は `mark: MarkPrice, index: IndexPrice` を入力として受け取る。

**ないもの**：これらの価格を*取得する*方法。呼び出し側は mark を CLOB から（`clob.best_bid_with_qty()` の mid-price のような形で）、index を外部 oracle から（Pyth、Chainlink、validator-attested な feed など）取得する必要がある。

**先送りの理由**：Oracle の plumbing には独自のディシプリンが要る — staleness チェック、deviation circuit breaker、複数ソースの aggregation、validator-set 側のサインオフなどだ。これを funding crate にバンドルすると、無関係な 2 つの関心事を結合してしまう。**Bridge レイヤー（将来のコース）が oracle を `tick()` に接続する。**

**いつ見直すか**：Funding crate を `LiveRethEvmBridge` に組み込むときだ。Bridge の payload 構築コードが、`clock.tick(...)` の呼び出しの*直前に*最新の mark / index を読み込む形になる。

### 2. Balance 更新

**現状**：`tick()` は `Vec<Settlement>` を返す — `(account, delta)` ペアのリストだ。

**ないもの**：その delta をアカウント balance に*適用する*メカニズム。

**先送りの理由**：Balance の state は EVM storage（あるいは bridge が維持する別ストア）に置かれる。Funding crate は意図的に storage-free だ — 計算するだけで、永続化はしない。**Bridge が `Vec<Settlement>` を受け取り、balance を更新するトランザクションを emit するか、state を直接 mutate する。**

**いつ見直すか**：Oracle 統合と同じタイミングだ。Bridge レイヤーが settlement と balance が出会う場所になる。

### 3. Liquidation

**現状**：Settlement は、アカウントの balance を任意に負まで押し込みうる。

**ないもの**：アカウントが funding の支払いを吸収*できる*かのチェックや、できないときの処理ロジック。

**先送りの理由**：Liquidation は独自の不変条件（insurance fund、ADL waterfall、mark-price トリガー）を持つ別の state machine だ。Funding と結びつけると、2 つの cadence を conflate してしまう（funding は時間単位、liquidation はブロック単位だ）。**Liquidation は独立した crate にすべきだ。**

**いつ見直すか**：Balance 更新の後だ。Bridge が balance の負転を観測し、*そこで*はじめて liquidation エンジンが起動する。

### 4. Multi-market funding

**現状**：単一マーケットに対する `FundingClock` が 1 つ。

**ないもの**：複数の永久先物マーケット（BTC-USD、ETH-USD、SOL-USD、さらには interval や cap が異なる可能性もある）にまたがって funding を管理する方法。

**先送りの理由**：Multi-market な設計は素直だ — マーケット 1 つにつき `FundingClock` 1 つを置き、bridge レイヤーの `HashMap<MarketId, FundingClock>` でまとめて管理すればよい。Crate 側がマーケットの多重性を知る必要はなく、*1 つ*のマーケットに対して正しければそれで十分だ。

**いつ見直すか**：openhl が 2 つ目のマーケットを追加するときだ。**おそらく、この crate の一部としてではない** — 多重化は上位レイヤーの責任だ。

### 5. EVM event としての funding

**現状**：Settlement は `tick()` から `Vec<Settlement>` として返ってくる。

**ないもの**：スマートコントラクトが funding tick を*観測する*方法。Funding に反応したいコントラクト（例：「funding が X% を超えたら auto-deleverage する」）が、イベントとして購読する手段がない。

**先送りの理由**：非 EVM コードから EVM event を emit するには plumbing が必要だ — bridge が各 `Settlement` を `EvmLog` に変換して次のブロックに inject する処理を担うことになる。**bridge レイヤーの関心事であって、state-machine の関心事ではない。**

**いつ見直すか**：Event ベースで funding を観測したい具体的なコントラクトユースケースが出てきたときだ。**それまでは telemetry を bridge レイヤーで行えばよい。**

## 次に来るもの

このコースの後に出荷できる拡張が 4 つある：

### Extension 1: Oracle adapter（2-3 日）

1 つ以上のソース（Pyth、Chainlink、validator-signed なフィードなど）から index 価格を pull し、staleness チェック付きで aggregate し、`fn current_index_price() -> Option<IndexPrice>` を公開する小さな `crates/oracle/`。Bridge は `clock.tick(...)` の直前にこれを呼ぶ。**難しいのは staleness threshold をどう決めるかであって、コード自体は素直だ。**

### Extension 2: Bridge 側の funding tick（1 週間）

`FundingClock` を `LiveRethEvmBridge` に組み込む。Bridge が clock インスタンスを保持し、mark を CLOB から、index を oracle から読み、永久先物 position ストアから position を取得し、`tick()` を呼び出して、得られた settlement を balance に適用する。**作業のほとんどは plumbing で、funding crate 自体は self-contained のままだ。**

### Extension 3: Liquidation エンジン（3-4 週間）

Funding-tick 後の balance を監視し、under-margined なアカウントを識別し、insurance fund / ADL waterfall を通じて処理を route する独立した `crates/liquidation/`。**大きな設計論点が並ぶ：insurance fund のサイジング、partial liquidation、MEV protection など。** これは独立した 1 コースになる規模だ。

### Extension 4: Multi-market manager（1 週間）

`HashMap<MarketId, FundingClock>` とマーケットごとの position ストアを抱える `crates/markets/`。Bridge が正しい cadence でマーケットごとの funding tick を dispatch する。**コンセプトとしては単純で、価値はマーケットごとの isolation を得られる点にある。**

## コース完了 — 内面化したこと

永久先物 funding を超えて一般化できるスキルが 5 つある：

1. **Consensus システムにおける固定小数点演算。** Validator 間で数値 state を共有する必要があるあらゆる場面 — funding、fee、oracle 価格、vesting schedule など — で、符号付き整数 + スケール定数を使う。一般式で書くと、実数 `x`、`y` をスケール因子 `S` でエンコードして `X = x × S` / `Y = y × S` を持ち回り、乗算では中間値を一段広い整数型に上げてから最後に `S` で割って戻す:

```
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
```

Module 2 で何度も格闘した「中間積が `S` の分だけ余分に拡大するので `i128` で受け、最後に `RATE_SCALE` で割って打ち消す」の正体がこの 1 式だ。**`RATE_SCALE = 1e9` はパターンで、定数の具体値はケースごとに変わる、ということだ。** Fee 計算なら `S = 10_000` (basis-point スケール) で同じパターンが当てはまるし、vesting schedule なら `S = 86_400` (日単位) で時間方向の固定小数点を組める。

2. **Consensus-safe な overflow 戦略としての saturation。** Panic は halt 経由の chain fork、wrap は誤った値経由の chain fork を生む。Saturate は bounded で、しかも validator 間で consistent だ。**Consensus-critical な数学に対しては、saturate が唯一の選択肢だ。**

3. **意味的な区別を入れるための newtype パターン。** `MarkPrice` も `IndexPrice` も `u64` をラップしているが、別の概念だ。Newtype のおかげで引数順バグはコンパイル時に防げ、符号規約は doc コメントが運ぶ。**newtype 1 つあたり 5 行で、バグクラス全体を防げる。**

4. **レイヤー化されたコードのための composition テスト。** 各レイヤー（`compute_premium`、`compute_rate`、`apply_funding`）は個別にテストされるが、レイヤー化そのものは別の関心事だ。**`tick()` のテストが composition を検証し、unit テストが個々のピースを検証する。両方が必要だ。**

5. **設計哲学はコードと doc とテストと散文に分散させる。** No-catch-up 不変条件は `clock.rs` の module doc で名指され、`tick()` の実装で強制され、`no_catchup_after_long_gap` で検証され、このコースで説明された。**理由付けを 4 箇所で見つけられる。個々のピースが変わっても、理由付け自体は生き残る。**

## このコースが L1 Architect track のどこに位置するか

**Course 1-5**（Reth internals）：pipeline、payload building、NodeBuilder、evm crate、RPC。

**Course 6**（openhl-consensus）：Malachite 統合。

**Course 7**（openhl-clob）：マッチングエンジン。

**Course 8**（openhl-precompiles）：カスタム precompile 経由の EVM ↔ CLOB ブリッジ。

**Course 9（このコース）**：Funding state machine。**pure な state、I/O なし — course 8 の bridge plumbing と対をなす位置づけだ。**

**Course 10**（openhl-bridge-integration — 将来）：funding、oracle、liquidation を `LiveRethEvmBridge` に組み込む。ここで courses 6-9 のすべてが、動作する perp DEX として組み上がる。

L1 Architect track の 90% を踏破したことになる。**このコースで身につけたパターン（固定小数点、saturation、composition テスト）は、残りの作業すべてに当てはまる。**

## 最終答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
```

L11 後、**`crates/funding/` ディレクトリ全体が Stage 8b と byte-identical** に一致するはずだ。3 ファイルにまたがる ~635 LOC の 1 commit を、各行が*なぜ*そこにあるのかを完全に理解した上で手で再現した、ということだ。**Crate は standalone でコンパイルが通り、テストも standalone で pass する。外部依存は `openhl-clob`（`AccountId` 用）以外にない。**

戻す：

```bash
git checkout main
```

## あなたがこれを出荷した

22 テスト pass、ソースファイル 3 つ、プロダクション Rust ~635 LOC。Funding state machine ができることは：
- 符号付き固定小数点の精度で、deterministic な premium / rate / settlement の数学を計算する。
- Pathological な入力に対しては panic ではなく saturate する。
- Configurable な interval で settlement を gate する。
- 長い gap の後の catch-up は拒否する（数学を公平性に揃えるための哲学的な選択だ）。

**これで、Hyperliquid 型の永久先物 funding メカニズム一式が手に入った。しかも、任意の Rust トレーディングシステムに drop in できる crate という形でだ。** 次に誰かから「永久先物 funding はどう動くの？」と聞かれたら — この crate を見せればいい。

それでは、永久先物を作りに行こう。
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
