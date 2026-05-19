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

このレッスンが終わると：

```bash
cargo test -p openhl-evm --release bridge_against_custom_evm
```

…1 つの新しい integration test `bridge_against_custom_evm_node_shares_clob_with_precompile` を通る。テストは Stage 9a-9c+ で触ったすべてを 1 箇所で行う：

1. **Reth を bootstrap** — `OpenHlExecutorBuilder` 付きで（両 CLOB precompile を登録したカスタム EVM）。
2. **`LiveRethEvmBridge` を構築** — そのノードの provider に対して。Bridge の `new()` が `install_clob` と `install_fill_sink` を呼ぶ。
3. **Bridge が book に書く** — `bridge.submit_order(Buy @ 200 qty 33)`。
4. **Precompile がそれを見る** — `current_best_bid()` が `Some((Price(200), Qty(33)))` を返す。
5. **Precompile が book に書く** — `place_order(Sell @ 200 qty 33)` を直接呼ぶ（EVM dispatch をシミュレート）。
6. **Bridge が fill を見る** — `bridge.pending_fill_count() == 1`。

これが**コースマイルストーン**。L10 後、47 unit test が証明したアーキテクチャは、1 つの integration test でも証明される — 実際の Reth ノード + 実際の bridge + 両 precompile + 両 global + マッチングエンジンを end-to-end、in-process で exercise。

これを動かすには**プロダクションコード変更が 1 つ必要**：`place_order` を `pub(crate)` に。integration test（`live_node.rs` 内、sibling モジュール）が直接呼べるように。

## おさらい

L9 後：
- Precompile モジュールに `CLOB_STATE` + `FILL_SINK`、両方とも `Option<Arc<Mutex<T>>>` global。
- Bridge の `new()` が両 global にインストール。
- Unit test が証明済み：read 動く（L6）、write 動く（L8）、fill が route される（L9）。
- **未テスト**：実際の Reth ノードでの*組み合わせ*。Unit test は Reth の `NodeBuilder`、`EvmFactory` dispatch、`EthereumNode::components()` 配線を bypass する。

L10 が 1 つの integration test でそのギャップを閉じる。

## プラン

2 つのファイルに 2 つの編集：

1. **`crates/evm/src/precompiles/mod.rs`** — `fn place_order` を `pub(crate) fn place_order` に。Integration test が直接呼ぶ。1 単語追加。
2. **`crates/evm/src/live_node.rs`** — 既存の `#[cfg(test)] mod tests` ブロック内に `bridge_against_custom_evm_node_shares_clob_with_precompile` テストを追加。~70 行、ほぼ setup + 7 つの assertion。

可視性変更以外の新プロダクションコードなし。**L10 の価値は新挙動でなく証明にある。**

> 🛑 **考えてみよう。** スクロール前に — unit test（L3、L6、L9）でピースが動くことを既に証明した。**なぜ Reth の `NodeBuilder` を通って同じコードパスを exercise する integration test がわざわざ必要？** ヒント：unit test が観測できないものを考える。

（答え：**Unit test は bridge と Reth の executor の間の配線ミスを観測できない。** 各 unit test は precompile を独立に、もしくは bridge を独立に構築する。`NodeBuilder::launch()` flow が `OpenHlEvmFactory` instance を構築して、bridge が*その*EVM に登録された precompile 経由で*同じ*CLOB を見るパスを exercise したものは 1 つもない。`with_components(...executor(OpenHlExecutorBuilder))` チェーンのタイポ、もしくは `EthereumAddOns` の適用が止まる regression — unit test を green にしたまま実際のプロダクションパスを壊す。**Integration test = 配線アサーション。**）

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

これだけ。`pub(crate)` = `openhl-evm` crate の他の部分から見える、外には見えない。`pub` にしない 3 つの理由：

1. **Precompile は `openhl_precompiles` が registry に登録する。** 外部 caller は名前でなく registry 経由で `Precompile::execute(...)` を使うべき。`pub(crate)` で bypass を抑制。
2. **関数 signature は REVM 特有**（`PrecompileFn = fn(&[u8], u64, u64) -> PrecompileResult`）。広く露出すると downstream caller を REVM の呼び出し規約に結合する。
3. **Integration test がこの crate 内にある**ので、`pub(crate)` がそのテストが必要とする可視性ちょうど — それ以上でない。

**`read_best_bid` は private のまま。** モジュール外のテストはこれを直接呼ばない。可視性は最小に保つ。

> 🛑 **やりがちな勘違い。** 「test build でだけ見えるよう `#[cfg(test)] pub(crate)` にしないの？」 **`pub(crate)` はプロダクションバイナリの surface を広げない。** 可視性注釈は compile-time のみ。`place_order` が `fn` でも `pub(crate) fn` でも生成コードは同一。**ここでの `#[cfg(test)]` は利得ゼロの余計な ceremony。**

### Step 2: Integration test を追加

`crates/evm/src/live_node.rs` を開く。ファイル末尾の `#[cfg(test)] mod tests` ブロックを見つける。末尾にこのテストを追加：

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

テストは長いが各セクションに役割がある。4 フェーズに分けて歩く。

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

**なぜ先頭で `uninstall_clob` AND `uninstall_fill_sink` 両方？** 他のテストが片方または両方を install したまま終わっているかもしれない。たとえば同じ `cargo test` 実行で L9 の `place_order_routes_fills_to_installed_sink` の後に走ったら、sink がまだ stray Arc に設定されている可能性。前の state は信用できない。

**なぜ `tokio::test(flavor = "multi_thread", worker_threads = 4)`？** Reth の `NodeBuilder.launch()` は async — バックグラウンドタスク（executor、RPC、mining 等）を spawn する。Single-threaded tokio はこれらでブロック。**Multi-thread + 4 worker が Reth integration-test の標準セットアップ。** 少ない = テストが stall、多い = CI で無駄。

**`NodeBuilder` チェーンは L3 の `reth_dev_node_with_openhl_executor` テストと同一。** 同じ builder method、同じ順、同じ `OpenHlExecutorBuilder` plug-in。証明済みの sequence を再利用すれば、新テストの failure surface を *L10* が導入するもの — bridge + precompile composition、Node bootstrap 自体ではない — に集中できる。

> 🛑 **やりがちな勘違い。** 「このチェーンを書くのが 2 回目だから `spawn_custom_evm_test_node()` ヘルパーに抽出すべき？」 **No、意図的にやらない。** Reth の `NodeAdapter`（`launch().await` が返す型）は ~5 個の phantom パラメータでジェネリック。ヘルパーの戻り型でそれを名指せばどの caller もそのジェネリクスに絡む。**インライン合成は 1 回書くのが醜いが、毎呼び出し site で読むのが綺麗。** 3 つ目の caller が現れて型複雑度が安定したらヘルパーを追加すればよい。

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

`LiveRethEvmBridge::new(...)` は内部で 5 つのことをやる：
1. `Arc<Mutex<Book>>`（CLOB）を作る。
2. `Arc<Mutex<Vec<Fill>>>`（fills バッファ）を作る。
3. **`install_clob` を呼ぶ** — precompile モジュールの `CLOB_STATE` global が bridge の Book を指す。
4. **`install_fill_sink` を呼ぶ** — `FILL_SINK` global が bridge の fills バッファを指す。
5. `Self { clob, pending_fills, ... }` を返す。

この 1 つの呼び出しの後、bridge と precompile モジュールは 2 つの global で繋がっている。

事前条件 `current_best_bid() == None` は綺麗な state から始まっていることを証明する — Phase A の uninstall が効いた証。次に submit_order が bridge の Book に resting bid を生む。事後条件 `current_best_bid() == Some(...)` は precompile が bridge の書き込みを見ることを証明 — 同じ Arc を共有している。

**これが Stage 9d の証明。** このノードを通して `STATICCALL(0x...0c1b)` を呼ぶスマートコントラクトは、登録された precompile → `current_best_bid()` → `CLOB_STATE` → bridge の Book → このビッドを見る、という経路を辿る。

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

このフェーズが Stage 9c+（commit `d19ba1b`）が追加したもの。最初の `place_order` 呼び出しが書き込み precompile を呼ぶスマートコントラクトをシミュレート。Sell @ 200 qty 33 が resting Buy @ 200 qty 33 にクロス — ちょうど 1 つの Fill が生まれる。

**手で組み立てた calldata は `place_order_calldata` が生成するものと同一。** ここでは明示性のためインライン — 各バイト位置に注釈、読者はヘルパーへ jump せず ABI レイアウトを追える。**End-to-end の正しさを証明する integration test では、calldata の明示性が DRY より重要。**

`pending_fill_count()` が 0 → 1 にジャンプ。**Fill は 5 段の間接を経てそこに辿り着いた：**

```
place_order
  → submit_result.fills (Vec<Fill>)
  → FILL_SINK.read() → Some(sink: Arc<Mutex<Vec<Fill>>>)
  → sink.lock().extend(...)
  → bridge.pending_fills と同じ Arc
  → bridge.pending_fill_count() が increment を見る
```

これが Stage 9c+ のテーゼ、end-to-end。

> 🛑 **考えてみよう。** `crate::precompiles::place_order(&calldata, ...)` の呼び出しを見る。**なぜ `Precompiles::get(...).execute(...)` 経由でなく関数を直接呼ぶ？** ヒント：L3 の unit test で両方やった。

（答え：**2 つの理由。** (1) Stage 9c+ commit の設計は `place_order` を直接呼ぶ — まさにそのために `pub(crate)`。Registry 経由なら `Precompiles` set を構築、どの hardfork にいるかを知る、等の余計な配線 — 追加の証明ゼロ。(2) L3 で registry path が動くことは既に証明済み。**L10 の仕事は bridge ↔ precompile module 配線の証明、registry path ではない。** 直接呼び出しがテストの scope を絞る。）

### Phase D — Cleanup

```rust
        let _ = CLOB_PLACE_ORDER;

        uninstall_fill_sink();
        uninstall_clob();

        drop(handle);
```

3 つの小さなこと：

1. **`let _ = CLOB_PLACE_ORDER;`** — アドレス定数に touch して load-bearing であることを示す。**なぜ？** テストが `CLOB_PLACE_ORDER` を import するが他で使わないから（calldata は precompile アドレス経由でなく手書き）。この行なしだと clippy が `unused_imports` を出す。`let _ = ...` はリンタを満たし「この定数が存在する、消すな」と示すドキュメント化された使い方。
2. **逆順 uninstall。** Install 順は clob → fill_sink。Uninstall は fill_sink → clob。**逆順クリーンアップが Rust の標準パターン**（RAII の drop 順をミラー）。慣用的、低コスト。
3. **`drop(handle)` 明示。** Rust はスコープ末で handle を drop する。だが名指せばノードのライフサイクルがテストのトレースで見える — 読者は「ここでノード終了」を見る。Reth を bootstrap する integration test なら、ライフサイクル時点はフラグを立てる価値がある。

## テスト

```bash
cargo test -p openhl-evm --release bridge_against_custom_evm
```

出力（Reth bootstrap + テスト実行で ~5 秒後）：

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

L9 より 1 多い（47 → 48）。**47 unit test + 1 integration test、全 green。**

よくあるエラーと対処：

- **`error[E0603]: function 'place_order' is private`** — Step 1 を忘れた。`fn place_order` signature に `pub(crate)` を追加。
- **`error[E0277]: 'NodeBuilder<...>' does not satisfy the trait...`** — NodeBuilder チェーンのタイポ。L3 の `reth_dev_node_with_openhl_executor` テストと比較 — 同じチェーン、同じメソッド順。
- **テストが永久にハング** — `worker_threads = 1` もしくは single-threaded tokio。`flavor = "multi_thread", worker_threads = 4` を使う。
- **`submit_order` の後 `current_best_bid()` が `None`** — `bridge.new()` 内で `install_clob` が実際に呼ばれていない。L4 の bridge 変更を再確認。もしくは：別のテストが並列で `uninstall_clob()` を実行中に呼んだ。Global を触る全テストで TEST_SERIALIZER パターンを確認（ほとんどは L5 から持っているはず）。
- **`place_order` の後 `pending_fill_count` が 0** — おそらく `bridge.new()` 内で `install_fill_sink` が呼ばれていない（L9 Step 7）、もしくは `place_order` の fill-routing block にバグ（L9 Step 3 — `drop(book)` が sink lock の前にあることを確認）。
- **`assertion failed: bridge.pending_fill_count() == 1` で count = 0** — `place_order` の submit が 0 fill を返したので何も push されていない。手書き calldata を確認：account=7、side=1（Sell）、price=200、qty=33。特に `calldata[63] = 1` を Sell に — 0 だと Buy になり cross しない。

## 設計の振り返り

5 点：

1. **Integration test は unit test が捕まえられない配線バグを捕まえる。** 全ピースが isolation で動くという unit test がある。L10 は初めて*合成*で動くことを証明するテスト。L3 の NodeBuilder、L4 の install_clob、L9 の install_fill_sink、走っている Reth プロセス間の配線 — その配線に unit test がない。**End-to-end のための 1 integration test + ピース正しさのための多くの unit test が標準的な mix。**

2. **`pub(crate)` がクロスモジュールテストの正しい可視性。** `pub` 追加は API surface を広げる。`#[cfg(test)] pub(crate)` 追加は利得ゼロの ceremony（可視性は compile-time のみ）。**`pub(crate)` は「この crate 内なら誰でも呼べる、外には not」と言う。** クロスモジュールテストが欲しいのは正にそれ。

3. **テスト calldata：明示 > DRY。** Phase C の手書き `[u8; 128]` calldata は `place_order_calldata` が生成するものだが、バイト位置注釈付きでインラインにすると ABI レイアウトが呼び出し site で見える。**システムレベルの正しさを証明するテストでは、各バイト位置が学べる artifact であるべき。** ヘルパーは隠す、integration test は露わにする。

4. **「spawn-bridge-with-custom-EVM-node」のヘルパーなし。** Reth の `NodeAdapter` ジェネリック複雑度が return-type-naming を痛める。インライン合成は 1 回書くのが醜いが読むのが簡単。**テストコードでの早すぎる抽象化のコストはプロダクションと同じ：デバッグするコードパスが増える。** 3 つ目の caller を待ってから抽象化。

5. **正直に先送り：RPC `eth_call` ラウンドトリップ。** このテストは Reth の RPC サーバーを通らない。JSON-RPC 経由で `clob_read_best_bid` を呼ぶ実際の Solidity コントラクトは、追加の配線（RPC サーバー、transaction simulation、等）を exercise する — 我々はそれを証明していない。**我々は Reth が動くことを証明しているのでなく、openhl が Reth に正しく plug-in することを証明している。** RPC レイヤーは Reth の責任。再テストすれば openhl でなく Reth を validate することになる。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

L10 後、両方の diff が**空**のはず。あなたのコードは Stage 9c+ の HEAD（9c+ 拡張で延長された Stage 9d test）と一致。**Stage 9 はこれで閉じる。** openhl Stage 9 の全マイルストーン — 9a（カスタム EVM bootstrap）、9b（live CLOB read）、9c（write path）、9c+（fill が bridge に route）、9d（bridge integration） — がこのコースで再現された。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: このテストは RPC path をカバーする？例：web3.js で `clob_read_best_bid` を呼ぶ Solidity コントラクト。**
No。テストは Rust 経由で precompile を直接呼ぶ — `crate::precompiles::place_order(...)` と `current_best_bid()`。RPC path（JSON-RPC server → eth_call → revm dispatch → 我々の precompile）は追加の配線で Reth の責任。**RPC レイヤーを Reth が正しく扱うことを信頼する。** テストすれば openhl でなく Reth をテストすることになる。範囲外。

**Q: 複数 `NodeBuilder.launch()` 呼び出しが並列で起きたら（例：並列テスト）？**
各 `launch()` は別々の Reth プロセス state を生むが、すべて**プロセスグローバル**な `CLOB_STATE` と `FILL_SINK` を共有する。**だからこのテストは先頭と末尾で `uninstall_clob` + `uninstall_fill_sink` を呼ぶ** — 並列テストは global で race できる。L5 の `TEST_SERIALIZER` パターンはこのテストに届かない — `live_node.rs` のテストモジュール内、precompile のではないから。**完全な安全のためにはクロスモジュール serializer が必要、だが v0 ではこのテストがたまたまそのモジュール内で両 global を触る唯一のテスト。**

**Q: なぜ `chain_spec.clone()` が必要？**
`NodeConfig::dev().with_chain(chain_spec.clone())` がノード config 用に 1 clone を消費。`LiveRethEvmBridge::new(provider, chain_spec)` がオリジナルを消費（bridge は Arc として保持）。**`ChainSpec` の clone は安価**（内部で Arc 包みが一般的） — 代替は所有権の wrangling でテストに認知負荷が増す。Clone がここでは正しい道具。

**Q: Phase C で precompile でなく bridge 経由で marketable order を submit すればよくない？**
できる — `bridge.submit_order(Sell @ 200 qty 33)` も 1 fill を生む。だがそれは**bridge 側**の書き込みパスをテスト — course 7 の領域。**L10 は具体的に precompile 側の書き込みパス**を FILL_SINK 経由で bridge の pending_fills までテストしたい。`place_order` を直接呼ぶことで Stage 9c+ の配線が証明される。

## コースマイルストーン — 今証明されたもの

L10 後：

- **Module 1**：`OpenHlEvmFactory` + `OpenHlExecutorBuilder` が `NodeBuilder` 経由で Reth に plug-in。カスタム EVM が precompile 登録済みで boot。
- **Module 2**：`read_best_bid` が `CLOB_STATE` global 経由で live CLOB state を read。スマートコントラクトが real orderbook データを見る。
- **Module 3**：`place_order` が live CLOB state に書く。EVM↔CLOB サーフェスは `0x...0c1b`（read）と `0x...0c1c`（write）で双方向。
- **Module 4**：Precompile 発注 order からの fill が `FILL_SINK` global 経由で bridge の `pending_fills` に流れる。EVM 側 trade が payload fill になる。

47 unit test が各ピースを証明。**1 integration test が合成を証明。** このノードを通して各 precompile を呼ぶスマートコントラクトは、bridge がオーケストレートする同じ Book を見る・書く。

## 次のレッスン（L11）

L11 は capstone — **新コードなし**。築いたものを振り返り、先送り項目を名指す（RPC ラウンドトリップ、マルチバリデータ OrderId、transaction-scoped state shadowing、staticcall mutation 拒否）、次ステージの拡張をリストする（best_ask/depth/mid-price の追加 read precompile、`clob_cancel_order` precompile、EVM event としての fill）。L11 レッスンはメンタルモデルを固め、アーキテクチャを全体として見るためのもの。
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
