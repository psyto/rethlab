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

11 レッスンで、Course 6 で build した substrate に **CLOB matching engine** を追加し、その fill を commit された payload に配線した。Workspace は今:

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

合計約 **15 新規 test**: hand-trace された unit test 9 個 (L7) + proptest invariant 3 個 (L8、768 ランダムシナリオ) + integration test 1 個 (L11)。Workspace テスト数: 39 (course 6 の 38 + L11 の `clob_fills_flow_into_payload`)。

## Matching engine が何をするか

Price-time priority CLOB。**操作 2 つ**: submit (新規 order が take または rest) と cancel (resting order を消す)。**1 つの観察可能な結果**: 各 `submit` が `FillResult` をマッチした fill リストと共に返す。

| 操作 | Public method | 内部で何が変わる |
| - | - | - |
| Limit order を submit | `Book::submit(order)` (`OrderType::Limit` 経由) | 反対側を price 以下/以上で walk、resting order とマッチ、未 fill 残りを rest |
| Market order を submit | `Book::submit(order)` (`OrderType::Market` 経由) | 反対側を任意の価格で walk、マッチ、未 fill 残りを破棄 |
| Resting order を cancel | `Book::cancel(order_id)` | 両 side を linear scan、order 削除、level が空なら drop |
| Inspect | `best_bid`, `best_ask`, `depth_bid`, `depth_ask` | read-only |

Matching は **構築上 deterministic**。Submit ごとに、同じ input と同じ事前 book 状態に対して同じ fill を produce する — それが L8 proptest invariant (`determinism`) で 256 ランダムシーケンスが exercise する。

## Bridge 統合

Course 6 の `LiveRethEvmBridge` が **2 フィールド** (`clob`、`pending_fills`) と **3 メソッド** (`submit_order`、`payload_fills`、`pending_fill_count`) を獲得した。データフロー:

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

Submit が push、build が drain。Drain は **forward-only**: 各 payload が build 時の fill snapshot を所有; 以前の payload が retroactively fill されない。**L11 の integration test がこれを real Reth node に対して end-to-end で証明する**。

## 11 レッスン前にはできなかった、今できること

- **Rust でゼロから price-time priority matching engine を build する** — そしてなぜ `BTreeMap<Reverse<Price>, ...>` が bid の正しい shape か、なぜ `VecDeque` が level ごとの queue の正しい shape か、cancel の O(n) scan が O(1) index に対してどんなトレードオフを持つかを理解する。
- **Pure-state-machine determinism について推論する** — `determinism` proptest が chain が依存する種類の invariant で、それを encode した。
- **既存の async-shared bridge にサブシステムを統合する** — `Mutex<T>` による interior mutability と `&self` メソッドが async task 下の共有 state に対する idiomatic な Rust パターン。それを適用した。
- **openhl Stage 8a + 8d ソースを読み**、`book.rs` + bridge の CLOB 関連コードのすべての行を説明できる。
- **Matching engine を変更する** — 新しい order type (Stop、Iceberg、Post-Only) を追加し、`submit_limit`/`submit_market` のどこに着地するか知っている。

## まだ placeholder のもの

このコースは bridge に統合された動く matching engine を ship した。Honest scoping — ここにないもの:

### 1. EVM-executable transaction encoding

**ステータス**: 未着手。

Payload に attach された fill は依然並行 `Vec<Fill>`、block body のトランザクションではない。Reth の `BlockExecutor` がそれを見ない。進めるには: 各 `Fill` を EVM トランザクションとして encode (おそらく state を update する custom precompile を call)。それが Module 3 領域 — **course 8** の領域。

### 2. Custom EVM precompile

**ステータス**: 未着手。

スマートコントラクトが CLOB state を **読む** (例: 「best bid は?」) には precompile が必要。外部アカウントが **オンチェーントランザクション経由で order を発注する** にはもう 1 つの precompile が必要。openhl Stage 9 が両方を持つ (`clob_read_best_bid`、`clob_place_order`)。**Course 8** がこれを build。

### 3. Funding rate state machine

**ステータス**: 未着手。

Perp DEX は funding rate 計算 (mark vs. index、定期 rebalancing) が必要。openhl Stage 8b が state machine を持つ。**Course 9** がこれを build。

### 4. 複数 market

**ステータス**: 暗黙の単一 market。

現在の `Book` は 1 orderbook。Real perp exchange は多数を持つ (HYPE/USDC、BTC/USDC、ETH/USDC 等)。拡張するには: bridge で `HashMap<MarketId, Book>`。機械的変更; openhl Stage 8 にまだない。

### 5. 永続 CLOB state

**ステータス**: in-memory のみ。

Bridge を再起動するとすべての resting order が消える。Production は snapshot/load (または chain state からの完全 event-sourcing) が必要。現在の openhl stage では扱われていない; 最終的な hardening 作業。

### 6. Cancel-by-id index

**ステータス**: O(n) linear scan。

L6 が明示的に O(1) index ではなくシンプルさを選んだ。openhl が book あたり ~10k order を超えてスケールすると、cancel scan が意味を持つようになる。`HashMap<OrderId, (Side, Price)>` を追加すれば cancel が O(1) になる — 小さな機械的変更、profile が要求するまで deferred。

## Production-readiness チェックリスト

この matching engine + bridge を real testnet に持っていきたければ:

- [ ] **EVM-encoded fill** — 各 `Fill` をトランザクションとしてラップ、BlockExecutor に route して state 実行 + state-root 計算。
- [ ] **Custom EVM precompile** — コントラクト読み取り用 `clob_read_best_bid`、chain-driven submit 用 `clob_place_order`。
- [ ] **Multi-market サポート** — `HashMap<MarketId, Book>` と market ごとの submit/cancel path。
- [ ] **永続 state** — Book を disk に snapshot + 再起動時に replay、または chain history から完全再構築。
- [ ] **Cancel index** — `HashMap<OrderId, (Side, Price)>` を追加して cancel を O(1) に。
- [ ] **Order-id 衝突チェック** — `submit` は今 caller が unique OrderId を割り当てると信頼。Production は duplicate を検出 + 拒否する必要がある。
- [ ] **Pre-trade リスクチェック** — アカウントを maintenance margin 以下に置く order は matching 前に拒否すべき。
- [ ] **Telemetry** — order スループット、fill latency、depth-of-book メトリクスのカウンター。
- [ ] **Multi-validator agreement** — single-validator devnet は 2 validator が異なる fill 順序を produce するケースを隠す。Proptest の `determinism` がローカル証明; multi-validator integration test がネットワーク証明。
- [ ] **Liquidation engine** — アカウントのマージンが maintenance を下回ったとき、ポジションを強制 close。Course 9 領域。

このリストは意図的に matching engine 自体より長い。**動く matching engine は基礎であり、製品ではない。**

## 次に行く先

**rethlab 内**:
- **Course 8 — Custom EVM precompile** (ship 時) — openhl Stage 9 の `clob_read_best_bid` + `clob_place_order`。
- **Course 9 — Funding state machine** — openhl Stage 8b。

**rethlab 外**:
- **`psyto/openhl` Stage 9 ソース** — full custom-EVM build が public repo にある。Bridge を理解したら `crates/evm/src/precompiles.rs` を読む。
- **参考用 production matching engine** — Project Serum (Solana CLOB、archived だが public)、dYdX v4 (Cosmos-based perp DEX、public)。Data structure を比較。
- **Property-based testing 文献** — proptest の doc + Hughes/Claessen の QuickCheck 論文。L8 の invariant は保守的; もっと多くできる。

## クロージングノート

5 ソースファイル (`types.rs` + `book.rs` + bridge 追加) にわたって約 **800 行の Rust** を書いた。そのコードは *real Reth-backed bridge に配線された動く CLOB matching engine*。Production-ready ではない; である必要もない。

最も難しい部分は matching ロジックを書くことではなかった — L4 の submit_limit は構造を理解すれば 60 行。**最も難しい部分は determinism property** — 可能な submit のすべての順序付けにわたって engine が同じ答えを produce することを確実にすること。L8 proptest がテストしようと思わなかったバグを catch し、それが build した engine が consensus に plug して safe である理由。

Correct だが non-deterministic な matching engine は consensus を壊す。Deterministic なものこそ、devnet から mainnet への移行を生き残れるコード。

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
