# OpenHL CLOB を作る — L12 draft (JA) — build-along

> openhl SHA は cite しない — このレッスンは recap と roadmap、新規コードではない。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。
> Course 7 の最終レッスン。

---

## L12 — `openhl-clob-capstone-ja`

- **モジュール:** 5 (Capstone), モジュール内 sortOrder 0
- **コース全体 sortOrder:** 11 (12 レッスン中 12 番目)
- **所要時間:** 15 分
- **XP:** 50
- **type:** CONTENT

### Content

````markdown
# レッスン 12 — 作ったもの、まだ stub のもの、次に行く先

## 作ったシステム

11 レッスンを通じて、Course 6 で build した substrate に **CLOB matching engine** を追加し、その約定を commit された payload に接続した。Workspace は今こうなっている:

```
~/code/my-openhl/
├── Cargo.toml                          ← +1 workspace dep (openhl-clob path)
├── crates/
│   ├── clob/                           ← NEW crate (course 7 で作成)
│   │   ├── Cargo.toml                  L1: package + proptest dev-dep (L8)
│   │   └── src/
│   │       ├── lib.rs                  L1: pub mod types, pub mod book, re-export
│   │       ├── types.rs                L1 + L2: newtype + record (~109 LOC)
│   │       └── book.rs                 L3-L8: Book + matching + cancel + tests
│   └── evm/
│       └── src/live_node.rs            L9-L11: bridge が CLOB を持ち、build で drain
└── ... course 6 から変わらず ...
```

合計で約 **新規テスト 15 個**: hand-trace 済み unit test 9 個 (L7) + proptest invariant 3 個 (L8、768 ランダムシナリオ) + integration test 1 個 (L11)。Workspace のテスト数は 39 個 (course 6 の 38 + L11 の `clob_fills_flow_into_payload`)。

## Matching engine が何をするか

Price-time priority CLOB。**操作は 2 つ**: submit (新規 order が take するか rest する) と cancel (resting order を消す)。**観察可能な結果は 1 つ**: 各 `submit` が `FillResult` をマッチした fill リストと共に返す。

| 操作 | Public method | 内部で何が変わるか |
| - | - | - |
| Limit order を submit | `Book::submit(order)` (`OrderType::Limit` 経由) | 反対側を price 以下/以上で順に辿り、resting order とマッチし、未 fill な残りを rest させる |
| Market order を submit | `Book::submit(order)` (`OrderType::Market` 経由) | 反対側を任意の価格で順に辿り、マッチし、未 fill な残りを破棄する |
| Resting order を cancel | `Book::cancel(order_id)` | 両 side を linear scan し、order を削除し、level が空なら drop する |
| Inspect | `best_bid`, `best_ask`, `depth_bid`, `depth_ask` | read-only |

Matching は **構築上 deterministic**。Submit ごとに、同じ input と同じ事前 book 状態に対して同じ約定を生成する — これを L8 の proptest invariant (`determinism`) が 256 個のランダムシーケンスで exercise している。

## Bridge 統合

Course 6 の `LiveRethEvmBridge` が **フィールド 2 個** (`clob`、`pending_fills`) と **メソッド 3 個** (`submit_order`、`payload_fills`、`pending_fill_count`) を獲得した。データフロー:

```
submit_order(order)              build_payload(parent, attrs)
       │                                    │
       ▼                                    ▼
  clob.submit                       drain pending_fills
       │                                    │
       ▼                                    ▼
  pending_fills.push                  attach to payload
       │                                    │
       │                                    ▼
       │                              payload_fills(id) が返す
       ▼
  caller に FillResult を return
```

Submit が push、build が drain する。Drain は **forward-only**: 各 payload は build 時点の fill snapshot を所有し、以前の payload に retroactively fill が attach されることはない。**L11 の integration test がこれを実 Reth node に対して end-to-end で証明している。**

## 11 レッスン前にはできなかった、今できること

- **Rust でゼロから price-time priority matching engine を build する** — そして、なぜ `BTreeMap<Reverse<Price>, ...>` が bid の正しい shape なのか、なぜ `VecDeque` が level ごとの queue の正しい shape なのか、cancel の O(n) scan が O(1) index に対してどんなトレードオフを持つのかを理解する。
- **Pure-state-machine の determinism について推論する** — `determinism` proptest は chain が依存する種類の invariant であり、それを自分で encode した。
- **既存の async-shared bridge にサブシステムを統合する** — `Mutex<T>` による interior mutability と `&self` メソッドが、async task 下の共有 state に対する idiomatic な Rust パターン。それを適用した。
- **openhl Stage 8a + 8d のソースを読み**、`book.rs` と bridge の CLOB 関連コードのすべての行を説明できる。
- **Matching engine を変更する** — 新しい order type (Stop、Iceberg、Post-Only) を追加するとき、`submit_limit`/`submit_market` のどこに着地させればよいか把握できる。

## まだ placeholder のもの

本コースでは bridge に統合された動く matching engine を ship した。Honest scoping として、本コースに **含まれていない** ものは以下:

### 1. EVM-executable transaction encoding

**ステータス**: 未着手。

Payload に attach された fill は依然として parallel な `Vec<Fill>` であり、block body のトランザクションではない。Reth の `BlockExecutor` はそれを見ない。進めるには、各 `Fill` を EVM トランザクションとして encode する必要がある (おそらく state を update する custom precompile を call する形で)。それは Module 3 の領域 — つまり **course 8** の領域。

### 2. Custom EVM precompile

**ステータス**: 未着手。

スマートコントラクトが CLOB state を **読む** (たとえば「best bid は?」) には precompile が必要。外部アカウントが **on-chain トランザクション経由で order を発注する** には、もう 1 つの precompile が必要。openhl Stage 9 はその両方を持つ (`clob_read_best_bid`、`clob_place_order`)。これを build するのが **course 8**。

### 3. Funding rate state machine

**ステータス**: 未着手。

Perp DEX には funding rate 計算 (mark vs. index、定期 rebalancing) が必要。openhl Stage 8b が state machine を持っている。これを build するのが **course 9**。

### 4. 複数 market

**ステータス**: 暗黙の単一 market。

現在の `Book` は orderbook 1 個。Real な perp exchange は多数の orderbook を持つ (HYPE/USDC、BTC/USDC、ETH/USDC 等)。拡張するなら bridge で `HashMap<MarketId, Book>` を持てばよい。機械的な変更だが、openhl Stage 8 にはまだない。

### 5. 永続 CLOB state

**ステータス**: in-memory のみ。

Bridge を再起動するとすべての resting order が消える。Production では snapshot/load (または chain state からの完全な event-sourcing) が必要。現在の openhl stage では扱われておらず、最終的な hardening 作業として残っている。

### 6. Cancel-by-id index

**ステータス**: O(n) linear scan。

L6 では明示的に、O(1) index ではなくシンプルさを選んだ。openhl が book あたり ~10k order を超えてスケールするようになれば、cancel scan が意味を持ち始める。`HashMap<OrderId, (Side, Price)>` を追加すれば cancel が O(1) になる — 小さな機械的変更だが、profile が要求するまでは deferred。

## Production-readiness チェックリスト

この matching engine + bridge を実際の testnet に持っていきたいなら:

- [ ] **EVM-encoded fill** — 各 `Fill` をトランザクションとしてラップし、BlockExecutor に route して state 実行と state-root 計算を行う。
- [ ] **Custom EVM precompile** — コントラクト読み取り用の `clob_read_best_bid`、chain-driven な submit 用の `clob_place_order`。
- [ ] **Multi-market サポート** — `HashMap<MarketId, Book>` と、market ごとの submit/cancel path。
- [ ] **永続 state** — Book を disk に snapshot + 再起動時に replay する、もしくは chain history から完全に再構築する。
- [ ] **Cancel index** — `HashMap<OrderId, (Side, Price)>` を追加して cancel を O(1) にする。
- [ ] **Order-id 衝突チェック** — `submit` は現状、caller が unique な OrderId を割り当てることを信頼している。Production では duplicate を検出して拒否する必要がある。
- [ ] **Pre-trade リスクチェック** — アカウントを maintenance margin 以下に追い込む order は matching 前に拒否すべき。
- [ ] **Telemetry** — order スループット、fill latency、depth-of-book メトリクスのカウンター。
- [ ] **Multi-validator agreement** — single-validator devnet では、2 validator が異なる fill 順序を生成するケースが見えない。Proptest の `determinism` はローカルでの証明にすぎず、multi-validator integration test がネットワーク上での証明になる。
- [ ] **Liquidation engine** — アカウントのマージンが maintenance を下回ったときに、ポジションを強制 close する。Course 9 の領域。

このリストは意図的に matching engine 自体より長い。**動く matching engine は基礎であって、製品ではない。**

## 市場構造: あなたが本当に作ったもの

11 レッスンを費やして **price-time-priority CLOB** を作った。次に進む前に、その選択を perp DEX 設計の広い landscape に位置づけておく価値がある — CLOB は 3 つある選択肢のうちの 1 つにすぎず、最近の RWA perps 論争がトレードオフをとりわけクリアにしてくれている。

**3 つのモデル。**

- **CLOB (作ったもの)**: market maker が resting order を置き、taker がそれと約定する。価格はこの venue 上で需給が出会うことによって決まる。Per-market な MM 経済性: どの銘柄も、在庫リスクを引き受けてくれる誰かによる継続的な quoting が必要。Retail flow が銘柄ごとの quoting を採算化できるほど存在する場合に機能する。
- **RFQ (Variational、Paradigm)**: taker が quote を request し、dealer が just-in-time に応じ、dealer は primary venue (CME、NYSE、または別の CLOB) で hedge する。価格は source venue から *持ってくる* — そこに hedging cost と dealer margin が乗る。Dealer が 24 時間継続的に quote を維持しなくてよい (request されたときだけ quote すればよい) ので、long tail でも unit economics が成立する。
- **AMM (GMX、dYdX v3 vAMM 時代)**: 流動性を curve に集約し、トレーダーが curve に沿って取引する。最初は資本効率が良いが、tail では破綻する。Perp での重要性は今では低下しているが、設計ポイントとして押さえておく価値はある。

**CLOB が勝つ場所と勝たない場所。**

CLOB が price discovery venue になるのは、*そこにローカルな需給が存在する場合に限る*。BTC、ETH、SOL、HYPE — TradFi の意味での「primary venue」を持たない資産 — については、Hyperliquid 上の CLOB が真に価格を決めている。一方で WTI、NVDA、SPY の perp は、NYSE/NYMEX 取引時間中は CLOB であっても primary 市場の arbitrage shadow にすぎない。RFQ も同じ。RWA については、両モデルとも primary 時間中に真の price discovery をしているわけではない — どちらも CME や NYSE order book の downstream consumer だ。

Cold-start の非対称性は構造的なものだ。CLOB は銘柄ごとに継続的に quoting してくれる market maker を必要とする。200 銘柄の RWA があり、そのうち 10 銘柄にしか retail flow が無いとすれば、残り 190 銘柄は quote が無いか、厚く補助された quote しか得られず、ニュース 1 本で吹き飛ぶ薄い板になる。RFQ はこれを回避する — dealer は需要があるときだけ quote するので、銘柄ごとに idle 時の quoting コストが発生しない。

**「Last look」の話。**

よくある主張に「RFQ には last look (dealer が quote request を reject できる) があるが CLOB には無い」というのがある。半分正しい。CLOB では、market maker は taker が hit するより速く quote を cancel できる — HL の matching docs で **cancel prioritization** と呼ばれている挙動だ。自分にとって不利な taker を見た MM は、cross が commit される前に quote を引っ込められる。形は違うが、経済的な意味は同じ。

あなたが作った CLOB は cancel prioritization を実装していない — `submit_limit` と `cancel` は `pending_actions` で first-come-first-served になる。Production の HL ではそうではない: cancel が衝突する submit より前に並び替えられ、MM に実質的な last look が与えられる。**もし追加したくなったら、変更箇所は BFT engine の ordering rule であって、matching engine ではない。**

**あなたが作ったもの、その位置づけ。**

あなたが作ったのは、HL が **crypto-native の top tier 銘柄** を pricing するために使っている engine だ。これは現実に存在し、経済的に重要な market slice。RWA perp の long tail を pricing する engine *ではない* — その flow は RFQ の方が構造的に向いている。Dealer が銘柄ごとに板を bootstrapping せずに CME と NYSE の depth に直接アクセスできるからだ。

Builder にとって興味深い問いは「CLOB か RFQ か」ではなく、「どの asset class のどの slice を、どの liquidity source で」だ。HyperBFT の上に乗った CLOB に、smart contract から板にルーティングできる custom precompile を組み合わせる — これは crypto-native perp の top tier には正しいアーキテクチャ。それ以外には、設計余地はまだ広く残っている。

## 次に行く先

**rethlab 内**:
- **Course 8 — Custom EVM precompile** — openhl Stage 9 の `clob_read_best_bid` + `clob_place_order`。
- **Course 9 — Funding state machine** — openhl Stage 8b。

**rethlab 外**:
- **`psyto/openhl` Stage 9 ソース** — full custom-EVM build が public repo にある。Bridge を理解したら `crates/evm/src/precompiles.rs` を読むとよい。
- **参考用の production matching engine** — Project Serum (Solana CLOB、archived だが public)、dYdX v4 (Cosmos-based perp DEX、public)。データ構造を比較してみる価値がある。
- **Property-based testing の文献** — proptest の doc と Hughes/Claessen の QuickCheck 論文。L8 の invariant は保守的に絞ってあるので、もっと多く追加できる。

## クロージングノート

ソースファイル 5 個 (`types.rs` + `book.rs` + bridge への追加) にわたって約 **800 行の Rust** を書いた。そのコードは *実 Reth-backed bridge に組み込まれた動く CLOB matching engine* だ。Production-ready ではないし、本コースで production-ready にする必要もない。

最も難しい部分は matching ロジックを書くこと自体ではなかった — L4 の submit_limit は構造が理解できれば 60 行で済む。**最も難しいのは determinism property** — 可能な submit の任意の順序付けに対して engine が同じ答えを生成することを保証すること。L8 の proptest が、テストしようと思わなかったバグを catch してくれる。そして、それこそが build した engine を consensus に plug しても safe である理由になる。

Correct だが non-deterministic な matching engine は consensus を壊す。Deterministic なものこそが、devnet から mainnet への移行を生き残るコードになる。

これを使って何か作りに行こう。
````

---

## Seed ファイルスロット

L12 は新規 Module 5 (Capstone) sortOrder 0 に入る:

```typescript
modules: {
  0: { title: 'Orientation', sortOrder: 0 },
  1: { title: 'CLOB 型', sortOrder: 1 },
  2: { title: 'Matching engine', sortOrder: 2 },
  3: { title: 'テスト', sortOrder: 3 },
  4: { title: 'Bridge 統合', sortOrder: 4 },
  5: { title: 'Capstone', sortOrder: 5 },  // 新規
},
```

```typescript
{
  title: 'レッスン 12 — 作ったもの、まだ stub のもの、次に行く先',
  slug: 'openhl-clob-capstone-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# レッスン 12 — 作ったもの、まだ stub のもの、次に行く先\n\n...`
},
```

## SHA pinning 規律

L12 は特定の openhl SHA を cite しない — Stage 8a (`55a9dff`) + Stage 8d (`428cc26`) を要約する。主要 artifact は概念的 (system map、production checklist、roadmap)、コードではない。
