# OpenHL CLOB を作る — L11 draft (JA) — build-along

> openhl SHA `428cc26` (Stage 8d — CLOB fill が bridge payload に流れる) 基準。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。

---

## L11 — `openhl-clob-integration-test-ja`

- **モジュール:** 4 (Bridge 統合), モジュール内 sortOrder 2
- **コース全体 sortOrder:** 10 (12 レッスン中 11 番目)
- **所要時間:** 30 分
- **XP:** 70
- **type:** CONTENT

### Content

````markdown
# レッスン 11 — `clob_fills_flow_into_payload` — マイルストーンテスト

## ゴール

このレッスンで掴む概念:

- **実 Reth node に対する end-to-end な統合テスト** — `EthereumNode` を bootstrap し、`LiveRethEvmBridge` を組み、submit→buffer→drain の全パイプラインを exercise する。L1-L10 の連鎖が個別コンポーネントを越えて end-to-end で成立することを証明するテスト。
- **Bootstrap が高価なときは、1 本の徹底した統合テストが 3 本の narrow なテストに勝る** — 実 Reth node を起動するのに数秒かかる。Bootstrap を 3 回繰り返せばコストも 3 倍。1 シナリオで submit、drain、forward-only の 3 不変条件をまとめて検証するほうが安い。
- **Forward-only assertion こそがこれを *本物の* 統合テストにする** — 「submit が約定を生成する」「build が drain する」は unit test でも自明。以前の (空) payload が遡って更新されていないことを check するからこそ、bridge の payload ごと snapshot メカニズムを真に検証していると言える。これがないと unit test の偽装でしかない。
- **Fill 価格 = maker の価格を end-to-end で示す** — maker bid @ 100、taker sell @ 100、fill @ 100。L4-L5 で確立した price-time priority の規則が、統合境界を越えても成立する。Sell を先に submit して buy で crossing しても同じ fill が出る — submit 順序は同一 level 内の time priority であって、どちらが rest するかを決めるものではない。
- **`launch_with_debug_capabilities()` と add-on 付き `launch()` の使い分け** — Debug-capabilities setup は短く、provider は得られるが engine-API は接続しない。本テストでは engine handle は不要 (forkchoice を駆動しない)、parent lookup 用の provider だけが要る。

検証:

```bash
cargo test -p openhl-evm clob_fills_flow_into_payload --release
```

上記の実行結果が pass する。**これが Course 7 のマイルストーン。** L1-L8 で build した matching engine が生成する実約定が、`LiveRethEvmBridge::submit_order` → `pending_fills` buffer → `LiveRethEvmBridge::build_payload` drain → consensus が commit する payload、という流れで流れていく。テストでは L9-L10 の統合の **すべての piece** を **live Reth node** に対して exercise する。

具体的な変更:

書く新規テストは 1 個:

- **`clob_fills_flow_into_payload`** — ~100 LOC。Real `EthereumNode` を bootstrap し、8 step のシナリオで 8 個の assertion を exercise する。

テストシナリオ:

1. order なしで空 payload を build → fill が attach されていないことを verify する。
2. maker bid @ 100 を submit → rest する (即座の fill なし) ことを verify する。
3. crossing taker sell @ 100 を submit → ちょうど 1 個の約定が生成されて buffer されることを verify する。
4. 次の payload を build → fill が drain されることを verify する。
5. `pending_fill_count` が 0 にリセットされることを verify する。
6. 以前の (空) payload を再 check → drain が **forward-only** だったことを verify する (retroactive な fill がない)。

L11 後、Course 7 の mainline は完成する。L12 で capstone としてラップアップする。

## おさらい

L10 完了時点、`LiveRethEvmBridge` は:

- `clob: Mutex<Book>` と `pending_fills: Mutex<Vec<Fill>>` フィールドを持つ (L9)。
- `submit_order`、`payload_fills`、`pending_fill_count` メソッドを持つ (L9)。
- `build_payload` が `pending_fills` を新 payload の 3 番目 tuple 要素に drain する (L10)。

**ただし end-to-end で動くことはまだ証明していない。** L11 でその証明を書く。

## 計画

`crates/evm/src/live_node.rs` の既存 `#[cfg(test)] mod tests` block にテストを 1 個追加する。テストの内容:

1. **Reth node を bootstrap する** — course 6 の `live_bridge_builds_on_real_genesis` test と同じパターン。Parent lookup のために provider が必要。
2. **`LiveRethEvmBridge::new(provider, chain_spec)` を construct する** — 注: 今回は `with_engine_handle` を付けない。Forkchoice を駆動する必要がないし、matching pipeline は engine_handle に依存しないから。
3. **空の初期状態を assert する** — `pending_fill_count() == 0`。
4. **空 payload を build する** (まだ order を submit していない) — 返ってきた `PayloadId` を `empty_id` に bind し、`payload_fills(empty_id)` が `Some(vec![])` を返すことを verify する。`empty_id` は Step 7 で再 query するために手元に残す。
5. **maker を submit する** — `Order { id: 1, side: Buy, qty: 10, OrderType::Limit { price: 100 } }`。rest し、即座の fill がないことを verify する。
6. **crossing taker を submit する** — `Order { id: 2, side: Sell, qty: 10, OrderType::Limit { price: 100 } }`。1 個の約定が生成されることを verify する。
7. **次の payload を build する** — `payload_fills(next_id) == Some([the_fill])` を verify する。
8. **drain 意味論を verify する** — `pending_fill_count() == 0`、そして **以前の** payload の fill が依然空のまま (retroactive な update がない)。

これが Course 7 で build するすべての integration test。

各 step が時間軸でどう assertion を並べるかを図にすると:

```
time →

  Step 3                  Step 5                Step 6                       Step 7
  bridge::new          build_payload         submit(maker)                build_payload
  (空の初期状態)        (empty_id)            submit(taker)                (next_id)
        ↓                   ↓                     ↓                            ↓
  pending_fill_count   pending_fill_count    pending_fill_count           pending_fill_count
   == 0 ✅              == 0 ✅               == 1 ✅                       == 0 ✅
                                                                          (drain 後にゼロ)

  pending HashMap:    {empty_id: ([], hdr)} {empty_id: ([], hdr)}    {empty_id: ([], hdr),
   (empty)                                                            next_id:  ([fill], hdr)}

  payload_fills:                            ┌───────────────────────────────────────────┐
                       empty_id → Some([])  │   ① next_id  → Some([the_fill])           │
                                            │   ② empty_id → Some([])  ← forward-only!  │
                                            │      (next が drain した後でも空のまま)    │
                                            └───────────────────────────────────────────┘

                                                                        ↑ assertion の順序
                                                                          が time-invariance
                                                                          を証明する load-bearing
                                                                          ポイント
```

`empty_id` を Step 5 で bind して保持し続けるのは、Step 7 で「2 番目の payload を drain したあとに 1 番目の payload を re-read しても fill は空のまま」を verify するため。assertion を `next_id` → `empty_id` の順で並べることで、retroactive 更新がないことを能動的に証明する。逆順だと「最初の payload が空」しか言えず、L10 の forward-only な意味論は exercise されない。

> 🛑 **考えてみよう。** スクロールする前に: maker bid が price 100、qty 10。Taker が Sell @ price 100、qty 10 で来る。**結果の fill price は 100? それとも違うのか?** 2 つの order が同じ価格で cross するとき、fill price を決めるルールは何か?

(答え: fill は **maker の** 価格で起きる — このケースでは `Price(100)`。L4 から: 「fill 価格は常に **resting** order の価格 (maker の)。$101 の limit-buyer が $100 の resting limit-seller とマッチすると $100 で fill する (maker の価格)。buyer が勝つ」。両 order が同じ価格でも同じルールが適用される — maker が 100 で rest し、taker が 100 でマッチする。**「price-time priority」ルールは「maker の価格 (price priority) + 同じ price level 内では first-come (time priority)」。ここでは time priority の disambiguation は不要 — maker が 100 で唯一の order だから。**

仮にこの統合テストの Taker Sell が **`Price(95)`** を提示して突っ込んできても、板に `Price(100)` の Maker Buy が rest している以上、約定は **`100` で発生する** — Taker は提示価格より良い 100 で sell できることになる (price improvement)。これは「price-time priority は resting 側に決定権がある」という L4 の規律が、Reth node + bridge + matching engine の統合境界を越えても揺るがない証拠だ。この統合テストの背後では、まさにそのエンジン挙動が走っている。)

## 手順

### Step 1: テストヘッダーを追加

`crates/evm/src/live_node.rs` で `#[cfg(test)] mod tests { ... }` block にスクロール。Block は既に `live_bridge_builds_on_real_genesis` (course 6 の L12-L14 から) と `commit_sends_forkchoice_to_engine_when_handle_installed` (L14 から) を持つ。

末尾に新テストを append (`mod tests` の閉じ `}` の直前):

```rust
    /// Stage 8d end-to-end: CLOB → bridge → payload.
    /// A maker rests, a taker crosses it, the fill flows into the next
    /// `build_payload`'s stored fills. The empty-fill `build_payload` that
    /// preceded the orders proves the drain semantics — fills accumulate
    /// AFTER they're built, not retroactively included.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn clob_fills_flow_into_payload() {
        use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};

        // ... body は Step 2-7 ...
    }
```

テストヘッダーで注目すべきポイントが 2 つ:

- **`#[tokio::test(flavor = "multi_thread", worker_threads = 4)]`** — course 6 の integration test と同じ。Reth の `EthereumNode` はバックグラウンドで task をいくつか spawn する (RPC、payload builder 等) ので、multi-threaded tokio runtime が必要になる。4 worker のセットアップで余裕を持たせている。
- **`use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};`** — L1 の newtype セットから必要な型を import する。`Order` と `Fill` は `mod tests` 冒頭の `super::*` で既に scope に入っている。

> 🛑 **やりがちな勘違い。** 「これらの型を `mod tests` のトップではなくテスト関数内で import するのはなぜか?」 **テストの依存をテストサイトで visible に保つため。** 将来の reader がこのテストをデバッグするとき、関連型を一目で見られる。コストはこれらが必要な test ごとに `use` statement が 1 個増えること、利益は各テストが self-contained なシナリオとして読めること。実際のソースコード (`mod tests` の外) のテストではトップに import を置くが、test は特別 — システムが何をするかのドキュメントなので、inline import がそのドキュメント性を引き締める。

> 💡 **インライン import の思想。** プロダクションコードでは import をトップに集約するのが規範だが、統合テストは「**システムが満たすべき仕様のドキュメント**」としての性格が強い。テストサイト (関数内部) に `AccountId / OrderId / OrderType / Price / Qty / Side` を明示的に閉じ込めることで、**この 1 本のテスト単体でドメイン知識 (どの newtype が何を表しているか) のマッピングが完結する**。L11 を初めて読む reader は、ファイル冒頭の import 群を遡らずに、テストの 5 行目で `Side` と `Price` が登場することの意味を即座に再構築できる。これは「inline import = テストを semantic snapshot として封じ込めるための道具」という設計判断だ。

### Step 2: Reth node を bootstrap

テスト関数 body 内:

```rust
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        let NodeHandle {
            node,
            node_exit_future: _,
        } = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .node(EthereumNode::default())
            .launch_with_debug_capabilities()
            .await
            .expect("launch failed");
```

これは course 6 の `live_bridge_builds_on_real_genesis` テストと **同じパターン**。`launch_with_debug_capabilities()` を使う (`.with_add_ons(EthereumAddOns::default()).launch()` ではない) のは、今回 engine handle が不要だから — テストしているのは CLOB-to-payload のデータフローであって、commit-to-forkchoice ではない。

`Runtime::test()`、`dev_chain_spec()`、`NodeConfig::test().dev()`、builder chain はすべて course 6 L11/L12 で扱ったもの。リフレッシュが必要なら test モジュール内を上にスクロールする。

### Step 3: genesis hash を pull + bridge を construct

```rust
        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no genesis");

        let bridge = LiveRethEvmBridge::new(node.provider.clone(), chain_spec);
```

2 行。最初は provider から live genesis block hash を pull する (course 6 L12 と同じ)。2 番目は bridge を construct する — **末尾に `.with_engine_handle(...)` の chain がない** 点に注意。今回気にするフィールド (`clob`、`pending_fills`) は `engine_handle` から独立しているから。

`node.provider.clone()` は安価。`node.provider` が内部で `Arc`-backed だから。

### Step 4: 空の初期状態を assert

```rust
        // Empty initial state — no orders submitted, no fills pending.
        assert_eq!(bridge.pending_fill_count(), 0);
```

最もシンプルな check。`new()` の直後、`pending_fills: Mutex::new(Vec::new())` は空。`pending_fill_count()` がその length を読む。**この assertion が失敗するなら**、L9 の `new()` が `pending_fills` を正しく初期化していない。

### Step 5: 空 payload を build (まだ order なし)

```rust
        // First payload built with no orders → no fills attached.
        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let empty_id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs.clone())
            .await
            .expect("build_payload failed");
        let empty_fills = bridge
            .payload_fills(empty_id)
            .expect("payload exists");
        assert!(empty_fills.is_empty(), "no orders submitted yet, fills must be empty");
```

Genesis を parent として `build_payload` を呼ぶ。Bridge が L10 の `std::mem::take` を `pending_fills` に対して call するが、buffer は空なので drain は `Vec::new()` を返す。結果の payload に attach される fill も空になる。

返された `PayloadId` を `empty_id` に bind しておくのは、**Step 7 でこの payload の fill を後から re-check** し、drain が forward-only であることを証明するため。

`attrs.clone()` を使うのは、後で 2 番目の `build_payload` 呼び出しで `attrs` を再利用するから。両 payload が同じ attrs (timestamp 1、ゼロ fee_recipient、ゼロ prev_randao) を使うのはシンプルさのため — production code では各 payload が fresh な timestamp を持つことになる。

### Step 6: maker + taker を submit、fill を verify

```rust
        // Submit a resting limit BID @ 100 from account 1, then a crossing
        // SELL @ 100 from account 2. This produces exactly one fill.
        let maker = Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Buy,
            qty: Qty(10),
            order_type: OrderType::Limit { price: Price(100) },
        };
        let taker = Order {
            id: OrderId(2),
            account: AccountId(2),
            side: Side::Sell,
            qty: Qty(10),
            order_type: OrderType::Limit { price: Price(100) },
        };

        let maker_result = bridge.submit_order(maker);
        assert!(maker_result.fills.is_empty(), "maker rests, no immediate fill");
        assert_eq!(bridge.pending_fill_count(), 0);

        let taker_result = bridge.submit_order(taker);
        assert_eq!(taker_result.fills.len(), 1, "taker should cross the maker");
        assert_eq!(bridge.pending_fill_count(), 1, "fill buffered in pending");
```

order 2 個、submit 2 回、assertion 4 個。

**1 番目の submit (maker)**:
- `submit_order(maker)` が `book.submit(maker)` を call する。Book は空なので、maker は price 100 の bid として rest する。
- `maker_result.fills.is_empty()` — 即座の fill はない (cross できる ask が book にない)。
- `pending_fill_count() == 0` — buffer もマッチもなし。

**2 番目の submit (taker)**:
- `submit_order(taker)` が 100 の resting bid に対してマッチする。マッチで 1 個の約定が生成される (10 unit @ 100、order 1 から order 2 へ)。
- `taker_result.fills.len() == 1` — matcher が fill を返してきた。
- `pending_fill_count() == 1` — `submit_order` の post-match append (L9 Step 6 の `if !result.fills.is_empty() { ... }` block) で fill が `pending_fills` に push されている。

**maker_result と taker_result のペアがテストの instrumentation の役割を果たす**。両方を check することで verify できる: (a) maker が本当に rest したこと (何かに偶発的に cross しなかった)、(b) taker が本当に cross したこと (偶発的に rest しなかった)。

### Step 7: 次の payload を build、drain + drain 意味論を verify

```rust
        // Build the NEXT payload — it should drain the buffered fill.
        let next_id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs)
            .await
            .expect("build_payload failed");
        let next_fills = bridge
            .payload_fills(next_id)
            .expect("payload exists");
        assert_eq!(next_fills.len(), 1, "fill must be attached to the payload");
        assert_eq!(next_fills[0].price, Price(100));
        assert_eq!(next_fills[0].qty, Qty(10));
        assert_eq!(next_fills[0].maker_order_id, OrderId(1));
        assert_eq!(next_fills[0].taker_order_id, OrderId(2));

        // After draining, pending fills must be empty.
        assert_eq!(bridge.pending_fill_count(), 0);

        // The earlier (empty) payload's fills must still be empty —
        // draining is forward-only, never retroactive.
        let empty_fills_again = bridge
            .payload_fills(empty_id)
            .expect("earlier payload exists");
        assert!(empty_fills_again.is_empty(), "earlier payload not retroactively filled");
    }
```

assertion のセットが 3 つ:

**1 番目のセット (drain 自体)**: `build_payload` を再度 call する — 同じ parent (genesis) + 同じ attrs で。L10 の `std::mem::take` が走り、`pending_fills` の fill を取り出す。Fill は新 payload の 3 番目 tuple 要素に保存される。`payload_fills(next_id)` が `Some(vec![the_fill])` を返す。確認内容:
- `next_fills.len() == 1` — fill がちょうど 1 個。0 ではなく (drain が走らなかった証拠)、2 でもなく (spurious な fill がない)。
- `next_fills[0].price == Price(100)` — maker の価格 (price priority)。
- `next_fills[0].qty == Qty(10)` — 両 side が完全 fill。
- `next_fills[0].maker_order_id == OrderId(1)` — maker は order 1 (resting bid)。
- `next_fills[0].taker_order_id == OrderId(2)` — taker は order 2 (cross する sell)。

**2 番目のセット (drain が buffer を空にした)**: `pending_fill_count() == 0` — drain が buffer を `Vec::default()` に置き換えた。これが `mem::take` の atomicity の後半部分。

**3 番目のセット (forward-only)**: `payload_fills(empty_id)` — **最初の** payload の fill を見る。**2 番目の payload に drain したにもかかわらず**、最初の payload に保存された fill は build されたときから *unchanged* のまま。これが L11 の load-bearing assertion: **drain は以前の payload を retroactively modify しない**。

各 payload は build された瞬間の fill snapshot を持つ。Retroactively に最初の payload を drain してしまったら (これがバグになる)、テストはここで失敗する。

> 🛑 **やりがちな勘違い。** 「テストが `payload_fills(empty_id)` を `payload_fills(next_id)` の **後** に check しているのはなぜか? `empty_id` を先に check できるのでは?」 **順序が重要なのは、time-invariance をテストしているから。** `next_id` を先に check するのは、まず `next_id` が 1 fill を持ち、`pending_fill_count` が 0 であることを **確立** するため。そのあとで `empty_id` を check し、`next_id` の drain が `empty_id` に波及しなかったことを **証明** する。`empty_id` を先に check してしまうと、「空 payload に fill がない」しか証明できない — それは Step 5 から既に分かっている。Drain の後に check することで、「以前の payload は **後の drain が起きた後でも** 依然 fill がない」を証明できる。**time-invariance を証明するときには、assertion の時間順序が重要になる。**

## テスト

```bash
cargo test -p openhl-evm clob_fills_flow_into_payload --release
```

~30 秒後 (incremental compile + node bootstrap):

```
running 1 test
test live_node::tests::clob_fills_flow_into_payload ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

全テスト走らせるには:

```bash
cargo test -p openhl-evm --release
```

39 個 pass する (course 6 の 38 + L11 の 1)。

テストは wall-clock で約 2.5 秒 (Reth node bootstrap + 小さな `build_payload` 2 個 + CLOB submit 数個)。ほとんどが Reth bootstrap の時間で、実際の matching + drain はマイクロ秒オーダー。

よくあるエラーと対処:

- **`assert!(empty_fills.is_empty())` が失敗** — bridge が `pending_fills` を空に初期化していない。L9 Step 5 を確認: `pending_fills: Mutex::new(Vec::new())`。
- **`assert_eq!(taker_result.fills.len(), 1)` が 0 で失敗** — order が実際には cross していない。Maker が `Side::Buy` で taker が `Side::Sell` (またはその逆) で、両方とも price 100 になっているか確認。よくあるバグ: 両 order が `Side::Buy` になっており、2 番目の order がマッチせずに rest している。
- **`assert_eq!(next_fills.len(), 1)` が 0 で失敗** — L10 の drain が動いていない。`build_payload` が `std::mem::take(&mut *self.pending_fills.lock()...)` を call し、その結果を insert していること (`Vec::new()` を直接 insert していないこと) を確認。
- **`assert!(empty_fills_again.is_empty())` が失敗** — drain が retroactively に以前の payload を modify している。`std::mem::take` (新 payload にしか書かない) では普通起きないが、誤って `pending_fills.clone()` を使って original を mutate していると発生し得る。
- **テストが「provider has no genesis」で panic** — テストロジックに到達する前に node bootstrap が失敗している。`dev_chain_spec()` が valid な genesis を生成していることを確認。`cargo test -p openhl-evm live_bridge_builds_on_real_genesis` を先に走らせて Reth セットアップが動くことを verify する。

## 設計の振り返り

3 つの load-bearing な決定:

1. **テスト 1 つのシナリオで 3 つの pipeline stage すべてを verify する。** `submit_order` が動くこと (Step 6)、`build_payload` が drain すること (Step 7 の 1 番目の assertion セット)、forward-only invariant が成立すること (Step 7 の最後の assertion)。1 シナリオで 3 property を見る。これを 3 つのテストに分割すると、それぞれで node を bootstrap する必要があり遅くなる。**複数の invariant をカバーする徹底した integration test 1 個のほうが、narrow な 3 つのテストより安上がり。**

2. **forward-only check があるからこそ、これが本物の integration test になる。** 最初の 2 つの check (submit が約定を生成する、build が drain する) は unit test からも明らか。Forward-only check は **bridge を必要とする** — bridge の per-payload snapshot 機構が honest であることをテストするから。Production コードが「完全性のため」と称して古い payload に fill を書き戻すバグを入れる可能性があるが、L11 がそれを catch する。

3. **2 つの payload が同じ parent (genesis) を使うのは意図的。** Production では、2 番目の `build_payload` は genesis ではなく最初の decided block を parent にする。このテストでは何も commit する必要がない — drain timing をデモするには payload が 2 つあれば十分だから。Genesis を parent として再利用すればテストがシンプルになり、verify する内容 (drain メカニズム、commit flow ではない) は変わらない。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

L11 後、`live_node.rs` は `428cc26` の参照と **機能的に完全に** マッチする。差は doc コメントの言い回しだけ。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜここでは `launch_with_debug_capabilities()` を使い、course 6 L14 では `launch()` (`.with_add_ons(...)` 付き) を使ったのか?**
テスト目標が違うから。Course 6 L14 では `commit → forkchoice_updated` をテストするので engine handle が必要で、engine handle は AddOns 経由で入る。L11 では CLOB → payload をテストするので engine handle は不要で、provider があればよい。`launch_with_debug_capabilities()` は provider を含むが engine API の接続をスキップする短いセットアップ。

**Q: このテストが見逃す worst-case な fill シナリオは?**
1 回の submit で複数 fill が出るケース (たとえば一度に 3 つの price level を cross する Market buy)。これは L7 の unit test (具体的には `buy_market_takes_best_ask`) が matching-engine レベルでカバーしている。L11 では single-fill ケースのみを exercise してテストを focus に保つ。L11 に multi-fill ケースを追加するのは 2 行 (qty の値を変える) で済むが、証明する内容自体は変わらない。

**Q: このテストは他のテストと並行に走らせられるか?**
走らせられる — `#[tokio::test]` がテストを自分の runtime で走らせ、bridge と node インスタンスはテストにローカル。共有のグローバル state はない。`worker_threads = 4` の設定はテスト単位であって、workspace 全体ではない。

**Q: なぜ maker を先に submit し、taker を 2 番目に? 逆ではダメか?**
典型的な matching-engine の語り口との対称性のため: 「maker が rest して、taker が cross した」。順序は *time priority* の意味では効く (level 内では first-in が最初に fill する) が、*どちらの side が rest するか* には意味を持たない。SELL を先に submit すればそれが ask として rest し、その後で同じ価格に BUY を submit すれば BUY が cross する。結果は同じ fill になる。**テスト名「fills flow into payload」が指すのはデータの path であって、操作の順序ではない。**

## 次のレッスン (L12)

Real Reth-backed bridge に統合された動く CLOB が手に入った。**L12 は capstone** — 新規コードはなく、以下を扱う:
- 11 レッスンの recap。
- 再現した openhl Stage 8 + 8d の機能リスト。
- まだ scope-cut しているもの (course 8 の precompile、course 9 の funding、ある future course での EVM tx encoding)。
- 続けたい場合の次のステップ (psyto/openhl Stage 9 のソース、Module 3 以降の build arc)。

リフレクション中心のレッスンで、~15 分。これで Course 7 が完成する。
````

---

## Seed ファイルスロット

L11 は Module 4 (Bridge 統合) sortOrder 2 に入る:

```typescript
{
  title: 'レッスン 11 — clob_fills_flow_into_payload — マイルストーンテスト',
  slug: 'openhl-clob-integration-test-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 30,
  xpReward: 70,
  content: `# レッスン 11 — \`clob_fills_flow_into_payload\` — マイルストーンテスト\n\n...`
},
```

## SHA pinning 規律

同じ `428cc26`。L11 後、ファイルが参照と doc コメント以外マッチ。コースの mainline pipeline が完成。
