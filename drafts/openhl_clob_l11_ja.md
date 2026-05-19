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

このレッスンの終わりに:

```bash
cargo test -p openhl-evm clob_fills_flow_into_payload --release
```

…が pass する。**これが Course 7 のマイルストーン。** L1-L8 で build した matching engine が produce する real fill が、`LiveRethEvmBridge::submit_order` → `pending_fills` buffer → `LiveRethEvmBridge::build_payload` drain → consensus が commit する payload に流れる。テストは L9-L10 の統合の **すべての piece** を **live Reth node** に対して exercise する。

書く新規テスト 1 個:

- **`clob_fills_flow_into_payload`** — ~100 LOC。Real `EthereumNode` を bootstrap、8 step シナリオで 8 assertion を exercise する。

テストシナリオ:

1. order なしで空 payload を build → fill が attach されていないことを verify。
2. maker bid @ 100 を submit → rest する (即座の fill なし) ことを verify。
3. crossing taker sell @ 100 を submit → ちょうど 1 fill produce、buffered されることを verify。
4. 次の payload を build → fill が drain されることを verify。
5. `pending_fill_count` が 0 にリセットされることを verify。
6. 以前の (空) payload を再 check → drain が **forward-only** だったことを verify (retroactive fill なし)。

L11 後、Course 7 の mainline は完成。L12 で capstone でラップアップする。

## おさらい

L10 完了時点、`LiveRethEvmBridge` は:

- `clob: Mutex<Book>` と `pending_fills: Mutex<Vec<Fill>>` フィールドを持つ (L9)。
- `submit_order`、`payload_fills`、`pending_fill_count` メソッドを持つ (L9)。
- `build_payload` が `pending_fills` を新 payload の 3 番目 tuple 要素に drain する (L10)。

**まだ end-to-end で動くことを証明していない。** L11 がその証明を書く。

## 計画

`crates/evm/src/live_node.rs` の既存 `#[cfg(test)] mod tests` block に 1 テスト追加。テスト:

1. **Reth node を bootstrap** — course 6 の `live_bridge_builds_on_real_genesis` test と同じパターン。Parent lookup に provider が必要。
2. **`LiveRethEvmBridge::new(provider, chain_spec)` を construct** — 注: 今回は `with_engine_handle` なし。Forkchoice を駆動する必要なし; matching pipeline は engine_handle に依存しない。
3. **空の初期状態を assert** — `pending_fill_count() == 0`。
4. **空 payload を build** (order まだ submit していない) — `payload_fills(id)` が `Some(vec![])` を返すことを verify。
5. **maker を submit** — `Order { id: 1, side: Buy, qty: 10, OrderType::Limit { price: 100 } }`。Rest する、即座の fill なしを verify。
6. **crossing taker を submit** — `Order { id: 2, side: Sell, qty: 10, OrderType::Limit { price: 100 } }`。1 fill produce を verify。
7. **次の payload を build** — `payload_fills(next_id) == Some([the_fill])` を verify。
8. **drain 意味論を verify** — `pending_fill_count() == 0`、そして **以前の** payload の fill が依然空 (retroactive update なし)。

これが Course 7 が build したすべての integration test。

> 🛑 **考えてみよう。** スクロールする前に: maker bid が price 100、qty 10。Taker が Sell @ price 100、qty 10。**結果の fill price は 100? 違うかも?** 2 つの order が exact 同じ価格で cross するとき、fill price を決めるルールは何?

(答え: fill は **maker の** 価格で起きる — このケースでは `Price(100)`。L4 から: 「fill 価格は常に **resting** order の価格 (maker の)。$101 の limit-buyer が $100 の resting limit-seller とマッチすると $100 で fill する (maker の価格); buyer が勝つ」。両 order が同じ価格でも同じルールが適用 — maker が 100 で rest、taker が 100 でマッチ。**「price-time priority」ルールは: maker 価格 (price priority) + price level 内で first-come (time priority)。ここでは time priority disambiguation 不要、maker が 100 で唯一の order だから。**)

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

テストヘッダーで注目する 2 つ:

- **`#[tokio::test(flavor = "multi_thread", worker_threads = 4)]`** — course 6 の integration test と同じ。Reth の `EthereumNode` がバックグラウンド task をいくつか spawn する (RPC、payload builder 等) ので multi-threaded tokio runtime が必要。4 worker setup でそれらに余裕を与える。
- **`use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};`** — L1 の newtype セットから必要な型を import。`Order` と `Fill` 型は `mod tests` の冒頭の `super::*` で既に scope にある。

> 🛑 **やりがちな勘違い。** 「これらの型を `mod tests` のトップではなくテスト関数内で import するのは?」 **テストの依存をテストサイトで visible に保つため。** 将来の reader がこのテストをデバッグしているとき、関連型を一目で見られる。コストはこれらが必要な test ごとに 1 `use` statement; 利益は各テストが self-contained なシナリオとして読めること。Real source コード (`mod tests` の外) のテストでは、トップに import を置く — だが test は特別: システムが何をするかのドキュメンテーション、inline import がドキュメンテーションをタイトにする。

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

これは course 6 の `live_bridge_builds_on_real_genesis` テストと **同じパターン**。`launch_with_debug_capabilities()` を使う (`.with_add_ons(EthereumAddOns::default()).launch()` ではなく) のは、今回 engine handle が不要だから — CLOB-to-payload データフローをテストしている、commit-to-forkchoice ではない。

`Runtime::test()`、`dev_chain_spec()`、`NodeConfig::test().dev()`、builder chain はすべて course 6 L11/L12 から。リフレッシュが必要なら test モジュール内を上にスクロール。

### Step 3: genesis hash を pull + bridge を construct

```rust
        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no genesis");

        let bridge = LiveRethEvmBridge::new(node.provider.clone(), chain_spec);
```

2 行。最初は provider から live genesis block hash を pull (course 6 L12 と同じ)。2 番目は bridge を construct — **末尾に `.with_engine_handle(...)` chain なし** に注意。気にするフィールド (`clob`、`pending_fills`) は `engine_handle` から独立。

`node.provider.clone()` は安価、`node.provider` が内部で `Arc`-backed だから。

### Step 4: 空の初期状態を assert

```rust
        // Empty initial state — no orders submitted, no fills pending.
        assert_eq!(bridge.pending_fill_count(), 0);
```

最もシンプルな check。`new()` 後、`pending_fills: Mutex::new(Vec::new())` が空。`pending_fill_count()` がその length を読む。**この assertion が失敗するなら**、L9 の `new()` が `pending_fills` を正しく初期化していない。

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

Genesis を parent として `build_payload` を呼ぶ。Bridge が L10 の `std::mem::take` を `pending_fills` に対して call — 空なので、drain が `Vec::new()` を返す。結果の payload に空 fill。

返された `PayloadId` を `empty_id` に bind するのは、**Step 7 で この payload の fill を後で re-check** して drain が forward-only であることを証明するため。

`attrs.clone()` は下の 2 番目の `build_payload` 呼び出しで `attrs` を再利用するから。両 payload が同じ attrs (timestamp 1、ゼロ fee_recipient、ゼロ prev_randao) を使う、シンプルにするため — production code では各 payload が fresh timestamp を持つ。

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

2 order、2 submit、4 assertion。

**1 番目 submit (maker)**:
- `submit_order(maker)` が `book.submit(maker)` を call。Book が空なので、maker が price 100 の bid として rest する。
- `maker_result.fills.is_empty()` — 即座の fill なし (book に cross する ask なし)。
- `pending_fill_count() == 0` — buffered なし、マッチなし。

**2 番目 submit (taker)**:
- `submit_order(taker)` が 100 の resting bid に対してマッチ。マッチが 1 fill を produce (10 unit @ 100、order 1 から order 2 へ)。
- `taker_result.fills.len() == 1` — matcher が fill を返した。
- `pending_fill_count() == 1` — fill が `submit_order` の post-match append (L9 Step 6 の `if !result.fills.is_empty() { ... }` block) で `pending_fills` に push された。

**maker_result + taker_result ペアがテストの instrumentation**。両方を check することで verify する: (a) maker が本当に rest した (何かに偶発的に cross しなかった)、(b) taker が本当に cross した (偶発的に rest しなかった)。

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

3 セットの assertion:

**1 番目セット (drain 自体)**: `build_payload` が再度 call される — 同じ parent (genesis) + 同じ attrs。L10 の `std::mem::take` が走り、`pending_fills` の fill を取る。Fill が新 payload の 3 番目 tuple 要素に保存される。`payload_fills(next_id)` が `Some(vec![the_fill])` を返す。Check:
- `next_fills.len() == 1` — ちょうど 1 fill、0 でなく (drain が fire しなかった)、2 でもなく (spurious fill なし)。
- `next_fills[0].price == Price(100)` — maker の価格 (price priority)。
- `next_fills[0].qty == Qty(10)` — 両 side の完全 fill。
- `next_fills[0].maker_order_id == OrderId(1)` — maker が order 1 (resting bid)。
- `next_fills[0].taker_order_id == OrderId(2)` — taker が order 2 (cross する sell)。

**2 番目セット (drain が buffer を空にした)**: `pending_fill_count() == 0` — drain が buffer を `Vec::default()` に置き換えた。`mem::take` の atomicity の後半。

**3 番目セット (forward-only)**: `payload_fills(empty_id)` — **最初の** payload の fill。**2 番目の payload に drain したにもかかわらず**、最初の payload の保存 fill は build されたときから *unchanged*。これが L11 の load-bearing assertion: **drain が以前の payload を retroactively modify しない**。

各 payload が build の瞬間の fill snapshot。Retroactively 最初の payload を drain したら (これがバグになる)、テストはここで失敗する。

> 🛑 **やりがちな勘違い。** 「テストが `payload_fills(empty_id)` を `payload_fills(next_id)` の **後** に check するのは? `empty_id` を先に check できる?」 **順序が重要、time-invariance をテストしているから。** `next_id` を先に check するのは、`next_id` が 1 fill を持ち `pending_fill_count` が 0 であることを **確立** するため。それから `empty_id` を check して、`next_id` の drain が `empty_id` に届かなかったことを **証明** する。`empty_id` を先に check すると、「空 payload に fill なし」だけ証明する — Step 5 から既に知っている。Drain の後 check することで、「以前の payload が **後の drain が起きた後も** 依然 fill なし」を証明する。**time-invariance を証明するとき、assertion の時間順序が重要。**

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

39 個 pass (course 6 の 38 + L11 の 1)。

テストは wall-clock 約 2.5 秒 (Reth node bootstrap + 2 個の小さい `build_payload` + 数個の CLOB submit)。ほとんどが Reth bootstrap; 実際の matching + drain はマイクロ秒。

よくあるエラーと対処:

- **`assert!(empty_fills.is_empty())` 失敗** — bridge が `pending_fills` を空に初期化していない。L9 Step 5 を check: `pending_fills: Mutex::new(Vec::new())`。
- **`assert_eq!(taker_result.fills.len(), 1)` が 0 で失敗** — order が実際 cross していない。Maker が `Side::Buy` で taker が `Side::Sell` (またはその逆) を確認、両方とも price 100。よくあるバグ: 両 order が `Side::Buy`、その場合 2 番目 order がマッチしない — それも rest する。
- **`assert_eq!(next_fills.len(), 1)` が 0 で失敗** — L10 の drain が動いていない。`build_payload` が `std::mem::take(&mut *self.pending_fills.lock()...)` を call し、result を insert することを check — `Vec::new()` ではなく。
- **`assert!(empty_fills_again.is_empty())` 失敗** — drain が retroactively 以前の payload を modify している。`std::mem::take` (新 payload にしか書かない) ではあまりないが、誤って `pending_fills.clone()` を使い original を mutate したら起こりうる。
- **テストが「provider has no genesis」で panic** — テストロジックに到達する前に node bootstrap が失敗。`dev_chain_spec()` が valid な genesis を produce していることを check。`cargo test -p openhl-evm live_bridge_builds_on_real_genesis` を先に走らせて Reth setup が動くことを verify。

## 設計の振り返り

3 つの load-bearing な決定:

1. **テストが 1 つのシナリオで 3 つの pipeline stage すべてを verify する。** `submit_order` が動く (Step 6)、`build_payload` が drain する (Step 7 の 1 番目 assertion セット)、forward-only invariant が成立する (Step 7 の最後の assertion)。1 シナリオ、3 property。これを 3 テストに分割すると、各々が node を bootstrap する必要がある — 遅い。**複数 invariant をカバーする 1 つの徹底した integration test が、3 つの narrow なテストより安い。**

2. **forward-only check がこれを real な integration test にする。** 最初の 2 check (submit が fill produce、build が drain) は unit test から obvious。Forward-only check は **bridge が必要** — それが bridge の per-payload snapshot 機構が honest であることをテストする。Production code が「完全性のため」古い payload に fill を書き戻したかもしれない; L11 がそのバグを catch する。

3. **2 payload が同じ parent (genesis) を使うのは意図的。** Production では、2 番目の `build_payload` が genesis ではなく最初の decided block を parent にする。このテストでは、何も commit する必要なし — drain timing をデモするのに 2 つの payload が必要なだけ。Genesis を parent として再利用するとテストがシンプルになり、verify する内容 (drain mechanism、commit flow ではない) が変わらない。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

L11 後、`live_node.rs` が `428cc26` の参照と **機能的に完成** マッチ。差異は doc コメントの言い回しのみ。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜここでは `launch_with_debug_capabilities()` で、course 6 L14 では `launch()` (`.with_add_ons(...)` 付き)?**
テスト目標が違う。Course 6 L14 が `commit → forkchoice_updated` をテスト — engine handle が必要で、それは AddOns に住む。L11 が CLOB → payload をテスト — engine handle 不要、provider のみ。`launch_with_debug_capabilities()` が provider を含むが engine API 配線をスキップする短いセットアップ。

**Q: このテストが見逃す worst-case fill シナリオは?**
1 submit あたり複数 fill (例: 一度に 3 price level を cross する Market buy)。L7 の unit test (specifically `buy_market_takes_best_ask`) がそのパスを matching-engine レベルでカバー; L11 は single-fill ケースのみを exercise してテストを focus に保つ。L11 に multi-fill ケースを追加するのは 2 行変更 (異なる qty 値) だが、証明する内容は変わらない。

**Q: テストが他のテストと並行に走れる?**
Yes — `#[tokio::test]` がテストを自分の runtime で走らせ、bridge + node インスタンスがテストにローカル。共有グローバル state なし。`worker_threads = 4` 設定はテストごと、workspace 全体ではない。

**Q: なぜ maker を先に submit、taker を 2 番目? その逆ではなく?**
典型的な matching-engine の narrative との対称性: 「maker が rest した、taker が cross した」。順序が *time priority* で意味を持つ (level 内で first-in が最初に fill)、だが *どちらの side が rest するか* では意味を持たない。SELL を先に submit すれば、それが ask として rest する; それから同じ価格で BUY を submit すれば、BUY が cross する。結果は同じ fill。**テスト名「fills flow into payload」はデータ path について、操作の順序ではない。**

## 次のレッスン (L12)

Real Reth-backed bridge に統合された動く CLOB がある。**L12 は capstone** — 新規コードなし、ただ:
- 11 レッスンの recap。
- 再現した openhl Stage 8 + 8d 機能のリスト。
- まだ scope-cut のもの (course 8 の precompile、course 9 の funding、ある future course の EVM tx encoding)。
- 続けたいなら次のステップ (psyto/openhl Stage 9 source code、Module 3+ build arc)。

リフレクションレッスン、~15 分。それで Course 7 が完成。
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
