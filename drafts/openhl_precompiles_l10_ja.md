# Building OpenHL Precompiles — L10 draft (JA) — build-along

> openhl SHAs `2f796c3`（Stage 9d）+ `d19ba1b`（Stage 9c+ 拡張）に対するドラフト。
> コース: `building-openhl-precompiles-ja`（track: `reth-l1-architect`）。

---

## L10 — `openhl-precompiles-bridge-integration-ja`

- **Module:** 4 (Bridge integration), sortOrder 1 within module
- **Course-level sortOrder:** 9 (lesson 10 of 12)
- **Duration:** 45 min
- **XP reward:** 90
- **Type:** CONTENT
- **Milestone:** コースレベルマイルストーン — フルスタック証明

### Content

````markdown
# レッスン 10 — コースマイルストーン — 実際の Reth ノード内でフルスタック

## ゴール

このレッスンで掴む概念:

- **integration test は unit test では捕まえられない接続バグを捕まえる。** unit test は各部品を単独で構築するため、`with_components(...executor(OpenHlExecutorBuilder))` のタイポや `EthereumAddOns` の適用漏れといった regression は、unit test を green に保ったまま production を壊しうる。integration test 1 つ = 接続全体の assertion。
- **cross-module test には `pub(crate)` が適切な可視性。** `place_order` を `pub` にすると API が漏れる、`#[cfg(test) pub(crate)]` は無意味な ceremony。`pub(crate)` は「crate 内なら誰でも、外からは不可」を表現する。
- **inline なテスト calldata > DRY なヘルパー。** 手書きの `[u8; 128]` にバイト位置のコメントを添えれば、ABI レイアウトが callsite から見える。システムレベルの正しさを示すテストでは、すべてのバイト位置が learnable な artifact であるべき (helper は隠してしまう)。
- **正典的な構成: integration test 1 つ + unit test 多数。** 各部品には narrow なテスト、合成には wide なテストを 1 つ。失敗の局所化は unit test が担い、組み込み全体の保証は integration test が担う。
- **正直な deferred: RPC roundtrip は openhl ではなく Reth の責務。** JSON-RPC → eth_call → revm dispatch のテストは openhl ではなく Reth の検証になる。「openhl が Reth に正しく接続される」のスコープには「Reth の RPC サーバが動く」は含まれない。

検証：

```bash
cargo test -p openhl-evm --release bridge_against_custom_evm
```

…新しい integration test `bridge_against_custom_evm_node_shares_clob_with_precompile` を 1 つ通る。

具体的な変更：

このテストは Stage 9a-9c+ で触ったすべてを 1 箇所でやる：

1. **Reth を bootstrap する** — `OpenHlExecutorBuilder` 付きで（CLOB precompile 2 つを登録したカスタム EVM 込み）。
2. **`LiveRethEvmBridge` を構築する** — そのノードの provider に対して。bridge の `new()` が `install_clob` と `install_fill_sink` を呼ぶ。
3. **bridge が book に書く** — `bridge.submit_order(Buy @ 200 qty 33)`。
4. **precompile がそれを見る** — `current_best_bid()` が `Some((Price(200), Qty(33)))` を返す。
5. **precompile が book に書く** — `place_order(Sell @ 200 qty 33)` を直接呼ぶ（EVM dispatch をシミュレートする）。
6. **bridge が約定を見る** — `bridge.pending_fill_count() == 1`。

### フルスタック結合トポロジー: Reth プロセス内に Module 1-4 のすべてが同居する

L10 で初めて、これまでの 4 モジュールの配管が**本物の Reth プロセス**と**本物の `LiveRethEvmBridge`** という両端を、process-global statics で結ぶ：

```
┌──────────────────────── 単一プロセス (cargo test バイナリ / 本番 Reth) ─────────────────────────┐
│                                                                                                  │
│  ╔════════════ Reth node (NodeBuilder.launch() で boot) ═════════════════╗                       │
│  ║                                                                         ║                       │
│  ║  Executor / RPC server / mining / consensus  ──┐                       ║                       │
│  ║                                                 │  OpenHlExecutorBuilder ║                       │
│  ║                                                 │  で plug-in されたカスタム ║                   │
│  ║                                                 ▼  EVM (L1 + L3 の成果物)  ║                   │
│  ║  ┌─── OpenHlEvmFactory → Custom EVM (revm) ────────────────────────────┐ ║                       │
│  ║  │   fork registry → openhl_precompiles_for(spec):                     │ ║                       │
│  ║  │     0x...0c1b → read_best_bid    [Module 2: L2 + L5]                │ ║                       │
│  ║  │     0x...0c1c → place_order      [Module 3+4: L7+L8+L9]             │ ║                       │
│  ║  └──────────────────┬──────────────────────┬─────────────────────────────┘ ║                       │
│  ║                     │ CLOB_STATE.read()    │ FILL_SINK.read()             ║                       │
│  ╚═════════════════════│══════════════════════│═════════════════════════════╝                       │
│  ──────────────────────│──────────────────────│──────────────────────────────────────────────────  │
│   process-global statics (同一プロセス内、ロックフリーで参照可能)                                   │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────────────────────────┐         │
│  │ static CLOB_STATE                │  │ static FILL_SINK                                  │         │
│  │   RwLock<Option<Arc<Mutex<Book>>>>│  │   RwLock<Option<Arc<Mutex<Vec<Fill>>>>>           │         │
│  │   ▲                              │  │   ▲                                               │         │
│  │   │ bridge::new() が             │  │   │ bridge::new() が                              │         │
│  │   │ install_clob(Arc::clone)     │  │   │ install_fill_sink(Arc::clone) を L9 で追加     │         │
│  │   │ を L4 で配管                  │  │                                                   │         │
│  └───┼──────────────────────────────┘  └────┼──────────────────────────────────────────────┘         │
│  ────│──────────────────────────────────────│──────────────────────────────────────────────────────  │
│  ╔═══│════════════ LiveRethEvmBridge (同一プロセス内のオブジェクト) ════════════════════════╗      │
│  ║   ▼ (precompile と同じ Arc を握る)     ▼ (precompile と同じ Arc を握る)                   ║      │
│  ║  bridge.clob                          bridge.pending_fills                                 ║      │
│  ║    : Arc<Mutex<Book>>                   : Arc<Mutex<Vec<Fill>>>                            ║      │
│  ║                                                                                            ║      │
│  ║  bridge.submit_order(Order{…})  ─► self.clob.submit() → self.pending_fills へ約定 push    ║      │
│  ║  bridge.build_payload()          ─► self.pending_fills.drain() → 次の block に attach     ║      │
│  ║                                                                                            ║      │
│  ║  provider = handle.node.provider  (NodeBuilder が返した node handle 経由で結合)             ║      │
│  ╚════════════════════════════════════════════════════════════════════════════════════════╝      │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

 L10 integration test がこのトポロジー上で走るパス:

  Phase A  uninstall_{clob,fill_sink}() で global を空に
           → NodeBuilder.launch() で Reth プロセスを起動 (上図の Reth node 部分が立ち上がる)
           → LiveRethEvmBridge::new(handle.node.provider, ...) が両 global に install
           → 結果: 上図の 4 本の Arc 矢印が「全部繋がる」状態に揃う

  Phase B  bridge.submit_order(Buy@200 q33)
           → bridge.clob.submit() が Book に bid を載せる
           → 同じ Arc を CLOB_STATE 経由で precompile も見る
           → current_best_bid() == Some((Price(200), Qty(33)))            ◄ 接続証明 #1

  Phase C  crate::precompiles::place_order(Sell@200 q33 calldata) を直接呼ぶ
           → 上図 Custom EVM 側の place_order body が exercise される
           → CLOB_STATE.read() → clob.lock().submit() がクロス → SubmitResult.fills
           → FILL_SINK.read() で sink Arc を取り、extend(fills)
           → bridge.pending_fills が同じ Arc を握っているので increment が見える
           → bridge.pending_fill_count() == 1                              ◄ 接続証明 #2

  Phase D  uninstall_{fill_sink,clob}() で global を空に戻す → drop(handle) で Reth プロセス終了
```

**4 つの観測ポイント:**

- **Module 1 (L1+L3) の成果**: `OpenHlExecutorBuilder` が `NodeBuilder` を通って実際に Reth に plug-in され、Custom EVM が boot している (= 上図の Reth node 内 EVM ブロック)
- **Module 2 (L2+L5) の成果**: `read_best_bid` が live state を読み、Phase B の接続証明 #1 を成立させる
- **Module 3 (L7+L8) の成果**: `place_order` が live state に書き込み、Phase C の前半 (Order が book に乗る) が成立
- **Module 4 (L9) の成果**: 生まれた fills が FILL_SINK 経由で bridge に届き、接続証明 #2 を成立させる

**L10 が証明するのは「これら 4 つが同時に成立する」こと** — どれか 1 つでも配管が外れていたら、`current_best_bid()` か `pending_fill_count()` のどちらかで失敗する。**unit test を全部 green に保ったまま、`NodeBuilder` チェーンのタイポ 1 つで production が壊れる** という現実的な regression を、この test が 1 本で塞ぐ。

これが **コースのマイルストーン** だ。L10 を終えれば、47 個の unit test で証明したアーキテクチャが、たった 1 つの integration test でも証明される — 上の結合図が示すように、実際の Reth ノードプロセス、実際の bridge オブジェクト、両方の precompile、両方の global、そしてマッチングエンジンが**単一のインプロセス空間で完全に噛み合い**、end-to-end で駆動 (exercise) される。

これを動かすために必要な **プロダクションコードの変更は 1 つだけ**：`place_order` を `pub(crate)` にすること。`live_node.rs` 内、sibling モジュールにいる integration test から直接呼べるようにするためだ。

## おさらい

L9 後の状態：
- precompile モジュールに `CLOB_STATE` と `FILL_SINK` がある。どちらも `Option<Arc<Mutex<T>>>` 型の global だ。
- bridge の `new()` が両方の global に install する。
- unit test 側では、read が動くこと（L6）、write が動くこと（L8）、約定が route されること（L9）まで証明済み。
- **まだテストしていない** のは、実際の Reth ノード上での *組み合わせ*。unit test では Reth の `NodeBuilder`、`EvmFactory` の dispatch、`EthereumNode::components()` の組み込みを bypass している。

L10 で、その隙間を integration test 1 つで埋める。

## プラン

2 つのファイルに対して、編集を 2 つ：

1. **`crates/evm/src/precompiles/mod.rs`** — `fn place_order` を `pub(crate) fn place_order` に変える。integration test が直接呼べるようにするためで、追加するのは単語 1 つだけ。
2. **`crates/evm/src/live_node.rs`** — 既存の `#[cfg(test)] mod tests` ブロックに `bridge_against_custom_evm_node_shares_clob_with_precompile` テストを追加する。~70 行ぶんで、その多くは setup と 7 つの assertion で占められる。

可視性の変更以外、新しいプロダクションコードはない。**L10 の価値は、新しい挙動ではなく証明にある。**

> 🛑 **考えてみよう。** スクロールする前に — unit test（L3、L6、L9）で個々の部品が動くことはすでに証明した。**なのに、Reth の `NodeBuilder` を通る同じコードパスを exercise する integration test がわざわざ必要なのはなぜか?** ヒント：unit test では観測できないものを考える。

（答え：**unit test は、bridge と Reth の executor の間の接続ミスを観測できない。** 各 unit test は precompile を単独で構築するか、bridge を単独で構築するかのどちらかだ。`NodeBuilder::launch()` のフローが `OpenHlEvmFactory` インスタンスを構築し、bridge が *その* EVM に登録された precompile 経由で *同じ* CLOB を見る、というパスを exercise したものは 1 つもない。`with_components(...executor(OpenHlExecutorBuilder))` チェーンのタイポや、`EthereumAddOns` の適用が外れてしまう regression は、unit test を green に保ったまま、実際の production パスを壊しうる。**integration test は接続全体の assertion だ。**）

## 手順

### Step 1: `place_order` を `pub(crate)` に

`crates/evm/src/precompiles/mod.rs` で `fn place_order` 行を見つける：

```rust
#[allow(clippy::unnecessary_wraps)]
fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
```

これに変更：

```rust
#[allow(clippy::unnecessary_wraps)]
pub(crate) fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
```

これだけだ。`pub(crate)` は「`openhl-evm` crate 内なら見えるが、外からは見えない」を意味する。`pub` にしない理由は 3 つ：

1. **precompile は `openhl_precompiles` が registry に登録するもの。** 外部の caller は名前で直接呼ぶのではなく、registry 経由で `Precompile::execute(...)` を使うべきだ。`pub(crate)` にしておくことで、その bypass を抑止できる。
2. **関数のシグネチャは REVM 固有のもの**（`PrecompileFn = fn(&[u8], u64, u64) -> PrecompileResult`）。広く露出させると、downstream の caller を REVM の呼び出し規約に縛り付けてしまう。
3. **integration test はこの crate 内にある** ので、`pub(crate)` はそのテストが必要とする可視性ちょうど — それ以上ではない。

**`read_best_bid` は private のままにしておく。** モジュール外のテストから直接呼ぶ予定はないので、可視性は最小に保つ。

> 🛑 **やりがちな勘違い。** 「test ビルドのときだけ見えるよう、`#[cfg(test)] pub(crate)` にしなくていいのか?」 — **`pub(crate)` はプロダクションバイナリの API surface を広げない。** 可視性アノテーションはコンパイル時のみの情報だ。`place_order` が `fn` でも `pub(crate) fn` でも、生成されるコードは同一になる。**ここで `#[cfg(test)]` を加えるのは、利得ゼロの余計な ceremony だ。**

### Step 2: integration test を追加

`crates/evm/src/live_node.rs` を開き、ファイル末尾の `#[cfg(test)] mod tests` ブロックを探す。その末尾に次のテストを追加する：

```rust
    /// **Stage 9d**: bootstrap a Reth node WITH `OpenHlExecutorBuilder` (so its
    /// EVM has our CLOB precompiles registered), construct a `LiveRethEvmBridge`
    /// against that node's provider, submit an order via the bridge — verify
    /// that the precompile module's process-global `CLOB_STATE` now reflects
    /// the order. This proves the full bridge ↔ custom-EVM-node integration:
    /// the same `Arc<Mutex<Book>>` that the bridge's `submit_order` writes to
    /// is the one any smart contract calling `clob_read_best_bid` through this
    /// node's EVM would see.
    ///
    /// Doesn't yet invoke the precompile via RPC `eth_call` — that's deferred
    /// indefinitely (validates Reth's plumbing rather than openhl behavior).
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn bridge_against_custom_evm_node_shares_clob_with_precompile() {
        use crate::OpenHlExecutorBuilder;
        use crate::precompiles::{
            CLOB_PLACE_ORDER, current_best_bid, uninstall_clob, uninstall_fill_sink,
        };
        use openhl_clob::{AccountId, OrderId, OrderType, Price, Qty, Side};
        use reth_node_ethereum::node::EthereumAddOns;

        // Start from a clean global state — other tests may have left a CLOB
        // or fill sink installed; that's fine for those tests but would mask
        // bugs here (especially the "sink was wired by bridge::new" assertion).
        uninstall_clob();
        uninstall_fill_sink();

        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        let handle = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .with_types::<EthereumNode>()
            .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
            .with_add_ons(EthereumAddOns::default())
            .launch()
            .await
            .expect("launch of custom-EVM node failed");

        // Build the bridge against the live custom-EVM node's provider.
        // The bridge installs its CLOB as the precompile's global state
        // (per the install_clob call inside LiveRethEvmBridge::new).
        let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);

        // Pre-condition: precompile sees an empty book.
        assert_eq!(current_best_bid(), None);

        // Submit a resting bid via the bridge. This goes through Book::submit
        // under the same Arc<Mutex<Book>> the precompile reads from.
        bridge.submit_order(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(33),
            order_type: OrderType::Limit { price: Price(200) },
        });

        // Post-condition: the precompile's view (which is what a smart
        // contract calling `clob_read_best_bid` through this node would see)
        // now reflects the order.
        let best = current_best_bid().expect("CLOB has bids after submit_order");
        assert_eq!(best.0, Price(200));
        assert_eq!(best.1, Qty(33));

        // === Stage 9c+ ===
        // Now hit the WRITE precompile: place a crossing Sell @ 200 qty 33
        // via `place_order`. The bridge's pending_fills should see the fill
        // even though we never went through bridge.submit_order. This proves
        // the FILL_SINK that LiveRethEvmBridge::new installed is the same
        // Arc<Mutex<Vec<Fill>>> the bridge later drains in build_payload.
        assert_eq!(
            bridge.pending_fill_count(),
            0,
            "fills empty before crossing taker via precompile"
        );

        let mut calldata = [0u8; 128];
        // account_id = 7 (last 8 bytes of slot 0)
        calldata[24..32].copy_from_slice(&7u64.to_be_bytes());
        // side = Sell (1) at byte 63
        calldata[63] = 1;
        // price = 200 (last 8 bytes of slot 2)
        calldata[88..96].copy_from_slice(&200u64.to_be_bytes());
        // qty = 33 (last 8 bytes of slot 3)
        calldata[120..128].copy_from_slice(&33u64.to_be_bytes());

        let r = crate::precompiles::place_order(&calldata, 100_000, 0)
            .expect("place_order must not error");
        let order_id_bytes = &r.bytes[24..32];
        let order_id = u64::from_be_bytes(order_id_bytes.try_into().unwrap());
        assert!(order_id > 0, "successful place_order returns nonzero id");

        // The fill from the cross should have landed in bridge's pending_fills
        // via the FILL_SINK install_fill_sink path inside LiveRethEvmBridge::new.
        assert_eq!(
            bridge.pending_fill_count(),
            1,
            "precompile-placed cross must populate bridge.pending_fills (Stage 9c+)"
        );

        // CLOB_PLACE_ORDER's address constant is part of the public surface
        // (and registered into the precompiles set by `openhl_precompiles`);
        // touch it here so the import resolves and the constant stays load-bearing.
        let _ = CLOB_PLACE_ORDER;

        // Clean up the globals so other tests can start clean.
        uninstall_fill_sink();
        uninstall_clob();

        // Drop the node handle explicitly to make the lifecycle visible
        // in the trace.
        drop(handle);
    }
```

テストは長いが、各セクションに役割がある。4 つのフェーズに分けて見ていく。

### Phase A — Setup（`uninstall` + `NodeBuilder`）

```rust
        uninstall_clob();
        uninstall_fill_sink();

        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        let handle = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .with_types::<EthereumNode>()
            .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
            .with_add_ons(EthereumAddOns::default())
            .launch()
            .await
            .expect("launch of custom-EVM node failed");
```

**なぜ冒頭で `uninstall_clob` と `uninstall_fill_sink` の両方を呼ぶのか?** 他のテストが、片方または両方を install したまま終わっている可能性があるからだ。たとえば同じ `cargo test` 実行で、L9 の `place_order_routes_fills_to_installed_sink` の後にこのテストが走った場合、sink にまだ古い Arc が刺さったままかもしれない。直前の state は信用できない。

**なぜ `tokio::test(flavor = "multi_thread", worker_threads = 4)` なのか?** Reth の `NodeBuilder.launch()` は async で、バックグラウンドタスク（executor、RPC、mining など）を spawn する。single-threaded な tokio だと、これらでブロックしてしまう。**multi-thread + worker 4 個が、Reth integration-test の標準セットアップだ。** これより少ないとテストが stall するし、多すぎると CI でリソースの無駄になる。

**`NodeBuilder` チェーンは、L3 の `reth_dev_node_with_openhl_executor` テストと同一だ。** builder メソッドも順序も `OpenHlExecutorBuilder` の plug-in 方法も同じ。証明済みのシーケンスを再利用することで、新テストの失敗面を「*L10* で導入する部分 — bridge と precompile の合成」に絞り込める。ノード bootstrap 自体に問題があるわけではない、という前提を再利用できる。

> 🛑 **やりがちな勘違い。** 「このチェーンを書くのは 2 回目なのだから、`spawn_custom_evm_test_node()` ヘルパーに切り出すべきでは?」 — **意図的に切り出さない。** Reth の `NodeAdapter`（`launch().await` が返す型）はおよそ 5 個の phantom パラメータでジェネリック化されている。ヘルパーの戻り型でそれを名指そうとすると、すべての caller がそのジェネリクスに絡め取られる。**インラインの合成は書くのは 1 回ぶん不格好でも、呼び出し site ごとに読むときは綺麗だ。** 3 つ目の caller が現れて型の複雑度が安定してから、ヘルパーを足せばよい。

### Phase B — Bridge 構築 + bridge → precompile read

```rust
        let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec);

        assert_eq!(current_best_bid(), None);

        bridge.submit_order(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(33),
            order_type: OrderType::Limit { price: Price(200) },
        });

        let best = current_best_bid().expect("CLOB has bids after submit_order");
        assert_eq!(best.0, Price(200));
        assert_eq!(best.1, Qty(33));
```

`LiveRethEvmBridge::new(...)` の内部では、次の 5 つのことが起きる：
1. `Arc<Mutex<Book>>`（CLOB）を作る。
2. `Arc<Mutex<Vec<Fill>>>`（fills バッファ）を作る。
3. **`install_clob` を呼ぶ** — precompile モジュールの `CLOB_STATE` global が、bridge の Book を指すようになる。
4. **`install_fill_sink` を呼ぶ** — `FILL_SINK` global が、bridge の fills バッファを指すようになる。
5. `Self { clob, pending_fills, ... }` を返す。

この 1 回の呼び出しの後、bridge と precompile モジュールは 2 つの global を介して繋がる。

事前条件の `current_best_bid() == None` は、クリーンな state から始まっていることを示す — Phase A の uninstall が効いた証拠だ。次に submit_order が bridge の Book に resting bid を生む。事後条件 `current_best_bid() == Some(...)` は、precompile が bridge 側の書き込みを見ていることを示す — 同じ Arc を共有しているからだ。

**これが Stage 9d の証明だ。** このノードを通して `STATICCALL(0x...0c1b)` を呼ぶスマートコントラクトは、「登録済みの precompile → `current_best_bid()` → `CLOB_STATE` → bridge の Book → この bid」という経路を辿る。

### Phase C — Stage 9c+ 拡張：precompile → bridge fills

```rust
        assert_eq!(
            bridge.pending_fill_count(),
            0,
            "fills empty before crossing taker via precompile"
        );

        let mut calldata = [0u8; 128];
        calldata[24..32].copy_from_slice(&7u64.to_be_bytes());
        calldata[63] = 1;
        calldata[88..96].copy_from_slice(&200u64.to_be_bytes());
        calldata[120..128].copy_from_slice(&33u64.to_be_bytes());

        let r = crate::precompiles::place_order(&calldata, 100_000, 0)
            .expect("place_order must not error");
        let order_id_bytes = &r.bytes[24..32];
        let order_id = u64::from_be_bytes(order_id_bytes.try_into().unwrap());
        assert!(order_id > 0, "successful place_order returns nonzero id");

        assert_eq!(
            bridge.pending_fill_count(),
            1,
            "precompile-placed cross must populate bridge.pending_fills (Stage 9c+)"
        );
```

このフェーズが、Stage 9c+（commit `d19ba1b`）で追加した部分だ。最初の `place_order` 呼び出しが「書き込み precompile を呼ぶスマートコントラクト」をシミュレートする。Sell @ 200 qty 33 が、resting している Buy @ 200 qty 33 にクロスし、Fill がちょうど 1 つ生まれる。

**手で組み立てた calldata は `place_order_calldata` が生成するものと同一だ。** ここでは明示性のためにインラインで書いている — 各バイト位置に注釈が付いているので、読み手はヘルパーへジャンプせずに ABI レイアウトを追える。**end-to-end の正しさを証明する integration test では、calldata を明示することのほうが DRY より重要だ。**

`pending_fill_count()` が 0 から 1 にジャンプする。**この約定は 5 段の間接を経て、ようやくここに辿り着く：**

```
place_order
  → submit_result.fills (Vec<Fill>)
  → FILL_SINK.read() → Some(sink: Arc<Mutex<Vec<Fill>>>)
  → sink.lock().extend(...)
  → bridge.pending_fills と同じ Arc
  → bridge.pending_fill_count() が increment を見る
```

これが Stage 9c+ のテーゼを end-to-end で示すパスだ。

> 🛑 **考えてみよう。** `crate::precompiles::place_order(&calldata, ...)` の呼び出しに注目してほしい。**なぜ `Precompiles::get(...).execute(...)` 経由ではなく、関数を直接呼ぶのか?** ヒント：L3 の unit test では両方やっている。

（答え：**理由は 2 つ。** (1) Stage 9c+ commit の設計上、`place_order` は直接呼ばれることを想定している — `pub(crate)` にしたのもまさにそのため。registry 経由にすると、`Precompiles` セットを構築する、今どの hardfork にいるかを把握する、といった余計な準備が必要になる — そのぶん証明できることが増えるわけでもない。(2) registry のパスが動くこと自体は、すでに L3 で証明済み。**L10 の仕事は「bridge ↔ precompile モジュールの接続」を証明することであって、registry のパスを再証明することではない。** 直接呼び出しのほうがテストの scope を絞り込める。）

### Phase D — Cleanup

```rust
        let _ = CLOB_PLACE_ORDER;

        uninstall_fill_sink();
        uninstall_clob();

        drop(handle);
```

細かいことが 3 つ：

1. **`let _ = CLOB_PLACE_ORDER;`** — address 定数に触れて、load-bearing であることを示す。**なぜか?** テストは `CLOB_PLACE_ORDER` を import するが、それ以外では使わないからだ（calldata は precompile address を経由せず、手で組み立てている）。この行がないと clippy が `unused_imports` を出す。`let _ = ...` はリンタを黙らせつつ「この定数は存在する、消すな」というドキュメント化された使い方として機能する。
2. **逆順で uninstall する。** install 順は clob → fill_sink、uninstall 順は fill_sink → clob だ。**逆順での後始末は Rust の定石**（RAII の drop 順を鏡写しにする）であり、慣用的でコストも低い。
3. **`drop(handle)` を明示する。** Rust はスコープ末で handle を drop してくれる。だが名指して書くと、テストのトレース上でもノードのライフサイクルが見える — 読み手に「ここでノード終了」が伝わる。Reth を bootstrap する integration test では、ライフサイクルの節目を旗印として残す価値がある。

## テスト

```bash
cargo test -p openhl-evm --release bridge_against_custom_evm
```

出力（Reth の bootstrap とテスト実行で ~5 秒後）：

```
running 1 test
test live_node::tests::bridge_against_custom_evm_node_shares_clob_with_precompile ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 47 filtered out
```

Crate 全テスト：

```bash
cargo test -p openhl-evm --release
```

```
running 48 tests
... 48 tests pass ...

test result: ok. 48 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

L9 より 1 個多い（47 → 48）。**unit test 47 個 + integration test 1 個、すべて green だ。**

よくあるエラーと対処：

- **`error[E0603]: function 'place_order' is private`** — Step 1 を忘れている。`fn place_order` のシグネチャに `pub(crate)` を追加する。
- **`error[E0277]: 'NodeBuilder<...>' does not satisfy the trait...`** — NodeBuilder チェーンのタイポ。L3 の `reth_dev_node_with_openhl_executor` テストと比べる — 同じチェーン、同じメソッド順だ。
- **テストが永久にハングする** — `worker_threads = 1` か single-threaded な tokio を使っている。`flavor = "multi_thread", worker_threads = 4` に変える。
- **ハングせず高速で失敗する (`pending_fill_count == 0`)** — `place_order(...)` や `launch().await` などの `.await` 抜けを疑う。Future は lazy なので `.await` しない限り実行されず、その場で drop される。これはハングではなく **silent skip**。
- **`submit_order` の後で `current_best_bid()` が `None`** — `bridge.new()` 内で `install_clob` が実際には呼ばれていない。L4 の bridge 変更を再確認する。もしくは、別のテストが並行で `uninstall_clob()` を呼んでいる可能性もある。global を触る全テストで TEST_SERIALIZER パターンを使っているか確認する（ほとんどは L5 で導入済みのはず）。
- **`place_order` の後で `pending_fill_count` が 0** — おそらく `bridge.new()` 内で `install_fill_sink` が呼ばれていない（L9 の Step 7）か、`place_order` の fill-routing ブロックにバグがある（L9 の Step 3 — `drop(book)` が sink lock の前にあることを確認する）。
- **`assertion failed: bridge.pending_fill_count() == 1`（実際は 0）** — `place_order` の submit が約定を 0 個しか返していないため、何も push されていない。手書きの calldata を確認する：account=7、side=1（Sell）、price=200、qty=33。とくに `calldata[63] = 1` を Sell にしているか — 0 だと Buy になり、クロスしない。

## 設計の振り返り

立ち止まりたいポイントが 5 つ：

1. **integration test は、unit test では捕まえられない接続バグを捕まえる。** 各部品が単独で動くことは unit test で証明できる。L10 は初めて *組み合わせで* 動くことを証明するテストだ。L3 の NodeBuilder、L4 の install_clob、L9 の install_fill_sink、稼働中の Reth プロセス間の接続 — そこには unit test が存在しない。**end-to-end のための integration test を 1 本と、部品の正しさのための unit test を多数、というのが標準的な組み合わせ方だ。**

2. **クロスモジュールテストには `pub(crate)` がちょうどよい可視性。** `pub` を加えると API surface が広がる。`#[cfg(test)] pub(crate)` を加えるのは、利得ゼロの ceremony だ（可視性はコンパイル時のみの話）。**`pub(crate)` は「この crate 内からなら誰でも呼べるが、外からは呼べない」と宣言する。** クロスモジュールテストに欲しいのは、まさにこれだ。

3. **テストの calldata は「明示 > DRY」。** Phase C の手書き `[u8; 128]` calldata は `place_order_calldata` が生成するものと同じだが、各バイト位置に注釈を付けてインラインに書くことで、呼び出し site から ABI レイアウトが見える。**システムレベルの正しさを証明するテストでは、各バイト位置がそれ自体「学べる artifact」であるべきだ。** ヘルパーは詳細を隠すためにあり、integration test は詳細を露出させるためにある。

4. **「カスタム EVM ノードと bridge を一緒に spawn する」ヘルパーは作らない。** Reth の `NodeAdapter` のジェネリック複雑度が、戻り型の命名を厄介にする。インライン合成は 1 回書くぶんは不格好だが、読むのは簡単だ。**テストコードで早すぎる抽象化を行うコストは、プロダクションコードと同じ — デバッグすべきコードパスが増える。** 3 つ目の caller が現れるのを待ってから抽象化すればよい。

5. **正直に先送りする：RPC の `eth_call` ラウンドトリップ。** このテストは Reth の RPC サーバを通らない。JSON-RPC 経由で `clob_read_best_bid` を呼ぶ実際の Solidity コントラクトは、追加の経路（RPC サーバ、transaction simulation など）を exercise する— そこまでは証明していない。**こちらが証明しているのは「Reth が動くこと」ではなく、「openhl が Reth に正しく plug-in できること」だ。** RPC レイヤは Reth の責任なので、そこまで再テストすると、openhl ではなく Reth を validate することになってしまう。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

L10 を終えると、どちらの diff も **空** になるはず。あなたのコードは Stage 9c+ の HEAD（9c+ の拡張で延長された Stage 9d test 込み）と一致する。**これで Stage 9 が閉じる。** openhl の Stage 9 のすべてのマイルストーン — 9a（カスタム EVM bootstrap）、9b（live な CLOB read）、9c（write path）、9c+（約定を bridge に route）、9d（bridge integration） — を、このコースで一通り再現した。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: このテストは RPC パスをカバーするのか? たとえば web3.js から `clob_read_best_bid` を呼ぶ Solidity コントラクト、といったケース。**
No。このテストは Rust から precompile を直接呼んでいる — `crate::precompiles::place_order(...)` や `current_best_bid()` のように。RPC パス（JSON-RPC サーバ → eth_call → revm dispatch → こちらの precompile）は追加の経路で、しかも Reth 側の責任範囲だ。**RPC レイヤを正しく扱うことは Reth に任せる。** ここまでテストすると、openhl ではなく Reth をテストすることになってしまう — スコープ外。

**Q: `NodeBuilder.launch()` が並列で複数回呼ばれたらどうなる（たとえば並列テスト）?**
それぞれの `launch()` が別々の Reth プロセスの state を生むが、すべて **プロセスグローバル** な `CLOB_STATE` と `FILL_SINK` を共有する。**だからこのテストは先頭と末尾で `uninstall_clob` と `uninstall_fill_sink` を呼んでいる** — 並列テストは global を奪い合いうるからだ。L5 の `TEST_SERIALIZER` パターンはこのテストには届かない — `TEST_SERIALIZER` は `live_node.rs` ではなく、precompile のテストモジュール内にあるからだ。**完全な安全を期すならクロスモジュールな serializer が必要だが、v0 ではこのテストが、たまたまそのモジュール内で両方の global を触る唯一のテストになっている。**

**Q: なぜ `chain_spec.clone()` が必要なのか?**
`NodeConfig::dev().with_chain(chain_spec.clone())` が、ノードの config 用に clone を 1 つ消費する。`LiveRethEvmBridge::new(provider, chain_spec)` がオリジナルを消費する（bridge 側では Arc として保持する）。**`ChainSpec` の clone は安価だ**（内部で Arc に包まれているのが普通）。代替案は所有権をやりくりすることになり、テストの認知負荷が増す。ここでは clone が正しい道具だ。

**Q: Phase C は、precompile ではなく bridge 経由で marketable order を submit すれば済むのでは?**
それでも動く — `bridge.submit_order(Sell @ 200 qty 33)` でも約定を 1 つ生む。だが、それでは **bridge 側** の書き込みパスをテストすることになり、それは course 7 の領域だ。**L10 でテストしたいのは、precompile 側の書き込みパスが FILL_SINK 経由で bridge の pending_fills まで届くこと** だ。`place_order` を直接呼ぶことで、Stage 9c+ の接続そのものが証明される。

## コースマイルストーン — ここで証明されたもの

L10 後の状態：

- **Module 1**：`OpenHlEvmFactory` + `OpenHlExecutorBuilder` が `NodeBuilder` 経由で Reth に plug-in されている。precompile を登録済みのカスタム EVM が boot する。
- **Module 2**：`read_best_bid` が `CLOB_STATE` global 経由で live な CLOB state を read する。スマートコントラクトから本物の orderbook データが見える。
- **Module 3**：`place_order` が live な CLOB state に書き込む。EVM ↔ CLOB のサーフェスが、`0x...0c1b`（read）と `0x...0c1c`（write）の 2 方向で双方向になる。
- **Module 4**：precompile 経由で発注された order の約定が、`FILL_SINK` global を介して bridge の `pending_fills` に流れる。EVM 側の trade が payload の約定になる。

47 個の unit test が各部品を証明し、**1 つの integration test が組み合わせを証明する。** このノード越しに各 precompile を呼ぶスマートコントラクトは、bridge がオーケストレートするのと同じ Book を読み書きする。

## 次のレッスン（L11）

L11 は capstone で、**新しいコードはなし**。築いたものを振り返り、先送り項目（RPC ラウンドトリップ、マルチバリデータでの OrderId、transaction-scoped な state shadowing、staticcall での mutation 拒否）を名指し、次のステージで追加する拡張（best_ask / depth / mid-price といった read precompile の追加、`clob_cancel_order` precompile、約定を EVM event として出す機構）を一覧する。L11 はメンタルモデルを固め、アーキテクチャを全体として見渡すためのレッスンだ。
````

---

## Seed-file slot

L10 は Module 4 (Bridge integration) の sortOrder 1 に入る：

```typescript
{
  title: 'レッスン 10 — コースマイルストーン — 実際の Reth ノード内でフルスタック',
  slug: 'openhl-precompiles-bridge-integration-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 45,
  xpReward: 90,
  content: `# レッスン 10 — コースマイルストーン — 実際の Reth ノード内でフルスタック\n\n...`
},
```

## SHA pinning discipline

L10 は `2f796c3`（Stage 9d 初期テスト）と `d19ba1b`（Stage 9c+ 拡張）両方を引用。L10 後、`precompiles/mod.rs` と `live_node.rs` 両方が Stage 9c+ に完全一致。Stage 9 が閉じる。

## Style review notes (self-critique before paste)

- **§ゴールが L10 をコースレベルマイルストーンとしてフレーミング** — 実際の Reth プロセス内での end-to-end 合成を証明。
- **§考えてみよう「なぜ integration test」** が wiring-assertion フレーミングを正当化。
- **§Step 1 の `pub(crate)`** が可視性選択を 3 つの理由で説明。
- **§やりがちな勘違いの `#[cfg(test)] pub(crate)`** が過剰注釈反射を先回り。
- **§Phase A の `tokio multi_thread`** が標準 Reth integration-test setup を説明。
- **§やりがちな勘違い「NodeBuilder チェーンのヘルパーなし」** が Stage 9d commit message の設計決定を retrospect。
- **§Phase C の「5 段の間接」** が Stage 9c+ テーゼを具体的に解く。
- **§Phase D の `let _ = CLOB_PLACE_ORDER`** が unused-import-touch イディオムを documentation。
- **§設計の振り返り 5 の RPC path 先送り** が*証明されていない*ものに正直。
- **§コースマイルストーンまとめ** — L10 後に証明されたもの — がコース全体のお祝いの瞬間。
- **L11 プレビュー** — capstone、新コードなし — が L11 が概念的にやることを名指す。
