# Building OpenHL Precompiles — L9 draft (JA) — build-along

> openhl SHA `d19ba1b`（Stage 9c+ — precompile が発注した order の約定 (fill) を bridge に route）に対するドラフト。
> コース: `building-openhl-precompiles-ja`（track: `reth-l1-architect`）。

---

## L9 — `openhl-precompiles-fill-sink-ja`

- **Module:** 4 (Bridge integration), sortOrder 0 within module
- **Course-level sortOrder:** 8 (lesson 9 of 12)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# レッスン 9 — `install_fill_sink` — 約定を bridge に戻す

## ゴール

このレッスンで掴む概念:

- **shared-buffer パターンは一般化する。** L4 で導入した「`Arc<Mutex<T>>` + プロセスグローバル」パターンを約定にそのまま再利用する。一度プリミティブが置かれれば、追加の共有 state は 1 バッファあたり ~20 行で済む。L4 の抽象化が複利で効いてくる。
- **直交した global = 直交したテスト setup。** `CLOB_STATE` と `FILL_SINK` を 1 つの global にまとめると、すべてのテストが両方を install する必要が出る。global を分けておけば、テストが exercise する分だけ install すれば良い (composable)。
- **common case の early-out は free。** `if !submit_result.fills.is_empty()` で、order が交差せず resting に回る場合 (主流のケース) のロック取得をスキップする。hot path に分岐 1 つ追加するだけで `RwLock` の取得を節約できる。
- **sink に push する前に `drop(book)` — 外側のロックを取る前に内側のロックを離す。** Book と sink の両方を同時に保持すると、ロック順序の hazard が生じる。明示的に Book guard を drop することで、ロック取得を厳密に逐次化する。
- **doc コメント = 借金トラッカー。** L8 の「fills are discarded」doc コメントは load-bearing だった: 未来の読者に「意図的なギャップで oversight ではない」ことを伝えていた。L9 はそのギャップを閉じ、doc も更新する。ドキュメント化されたギャップは半分修正済み、未文書化のギャップは invisible debt。

検証：

```bash
cargo test -p openhl-evm --release
```

上記の実行結果が 47 tests を通る（1 つ新規）。

具体的な変更：

L8 の doc コメントで述べた「約定を捨てている」というギャップが閉じる：

- **`FILL_SINK` static を追加** — `CLOB_STATE` と対になる位置に置き、`Option<Arc<Mutex<Vec<Fill>>>>` を保持する。
- **モジュール関数 `install_fill_sink` / `uninstall_fill_sink`** を追加 — どちらも public で、`install_clob` / `uninstall_clob` パターンをそのまま鏡写しにする。
- **`place_order` を拡張** — `let submit_result = book.submit(...)`（以前は `_result`）に変え、`drop(book)` のあとで、sink が install されていれば **生まれた約定を push する**。
- **`LiveRethEvmBridge::pending_fills`** を `Mutex<Vec<Fill>>` から `Arc<Mutex<Vec<Fill>>>` に変更する。bridge の `new()` が `install_clob` と並んで `install_fill_sink(Arc::clone(&pending_fills))` を呼ぶ。
- **新しい unit test** `place_order_routes_fills_to_installed_sink` を追加 — maker/taker のクロスを実行し、sink が約定を受け取ることを検証する。

### E2E 環状データルーティング・トポロジー (Stage 9c+ で閉じる)

L9 で初めて、order → Book → Fill → payload の loop が完全に閉じる。on-chain (EVM precompile) と off-chain (bridge) の 2 つの writer が、**同じ Book** と **同じ pending_fills** に合流する全景:

```
 ── 入力経路 1: on-chain (Solidity → EVM) ──────────────────────────────────
   Solidity contract → call(0x...0c1c, abi.encode(account, side, price, qty))
                                       │
                                       ▼
   Reth EVM dispatch → place_order  [L7 parse + L8 submit + L9 fill routing]
                                       │
                                       │ clob.lock().submit(Order{…})
                                       │     → SubmitResult { fills: Vec<Fill>, … }
                                       │
                                       ▼ (1) Book を mutate    (2) fills を sink へ
 ── 入力経路 2: off-chain (App / RPC → bridge) ─────────────────────────────
   App / RPC → bridge.submit_order(…)              [Course 7 既存ルート]
                                       │
                                       │ self.clob.lock().submit(…)
                                       │     → fills を self.pending_fills に直書き
                                       ▼
 ── 共有 Book (双方向 writer の合流点 ①) ──────────────────────────────────
   ┌─────────────────────────────────────────────────────────────────────┐
   │ Arc<Mutex<Book>>                                                    │
   │   ▲ static CLOB_STATE が参照 (L4 で install)                         │
   │   ▲ bridge.clob と Arc を共有 → 同じ Book を on/off 双方から書ける    │
   └─────────────────────────────────────────────────────────────────────┘

 ── 共有 Fill バッファ (双方向 writer の合流点 ②) ──────────────────────────
   ┌─────────────────────────────────────────────────────────────────────┐
   │ Arc<Mutex<Vec<Fill>>>                                               │
   │   ▲ static FILL_SINK が参照 (L9 で install — 新規)                   │
   │   ▲ bridge.pending_fills と Arc を共有 (L9 で Mutex → Arc<Mutex> 化) │
   │                                                                     │
   │   write 経路 A: place_order が FILL_SINK 経由で extend(fills)        │
   │   write 経路 B: bridge.submit_order が pending_fills へ直接 push     │
   │   (どちらも同じ Vec<Fill> — Arc が 1 つしかない)                     │
   └────────────────────────────────┬────────────────────────────────────┘
                                    │ self.pending_fills.lock().drain(..)
                                    ▼
 ── 出口: ブロックペイロード ──────────────────────────────────────────────
   bridge.build_payload()  →  drain した fills を block に attach
                                    │
                                    ▼
                            次の Reth ブロック
```

**環状性 (loop closure) の本質:**

- writer は 2 つ (on-chain `place_order` / off-chain `bridge.submit_order`)、reader (= drain) は 1 つ (`build_payload`)
- 2 つの writer は **物理的に同じ `Arc<Mutex<Vec<Fill>>>`** を見る — global (`FILL_SINK`) と bridge フィールド (`pending_fills`) が、L4 と完全に対称な「同じ Arc を 2 か所が握る」パターンで結合
- 「on-chain で発注された order の約定が、off-chain で発注された約定と区別なく block に乗る」という Module 4 の中核プロパティが、ここで初めて成立する
- **L4 で `Arc<Mutex<Book>>` を分散させた設計が、L9 で `Arc<Mutex<Vec<Fill>>>` 側にも完全ミラー** — `install_clob` と `install_fill_sink`、`bridge.clob` と `bridge.pending_fills`、すべてが対称形

L9 を終えると、precompile と bridge はもはや **書き込み側でも独立ではない**。EVM 経由で発注された order が生んだ約定は、bridge 側の `submit_order` が書き込むのと同じ `pending_fills` キューに流れる。上の構造図が示すように、この合流によってオンチェーンで発生した流動性の変化が、次の `build_payload`（ブロックペイロード構築）へ途切れることなく完全に循環・伝播するようになる。

## おさらい

L8 で Stage 9c 本体を閉じた：`place_order` が book に書き込むようになり、`place_order → read_best_bid` のラウンドトリップが証明された。だが L8 の doc コメントは、残されたギャップを次のように明示している：

> Side note: the fills returned by `Book::submit` are discarded here. Production-shape integration would route them through the bridge's `pending_fills` so they reach the next `build_payload`.

このギャップは意図的なものだ — Stage 9c は diff を集中させるために、あえてこれを伴わずに出荷した。それを閉じるのが Stage 9c+ だ。

## プラン

`crates/evm/src/precompiles/mod.rs` に 5 つの編集 + `crates/evm/src/live_node.rs` に 2 つの編集：

1. **`Fill` を import**（`precompiles/mod.rs` で。`live_node.rs` ではすでにある）。
2. **`FILL_SINK` static と 2 つの install/uninstall 関数を追加。**
3. **`place_order` の中で** — `_result` を `submit_result` にリネーム、Book lock を drop した後、sink が install されていれば `submit_result.fills` を sink に push。
4. **`place_order` doc コメントを更新** — 「fills are discarded」の side note を消し、Stage 9c+ の挙動に置き換え。
5. **Unit test を追加** `place_order_routes_fills_to_installed_sink`。

`live_node.rs` には：

6. **`pending_fills` フィールド型を変更** — `Mutex<Vec<Fill>>` から `Arc<Mutex<Vec<Fill>>>` へ。
7. **`new()` を更新** — `pending_fills` を Arc として bind、既存の `install_clob` の隣で `install_fill_sink(Arc::clone(&pending_fills))` を呼ぶ。

> 🛑 **考えてみよう。** スクロールする前に — `book.submit(...)` を呼んで、その戻り値の約定を *捨てる* precompile（`place_order`）はすでにある。これらの約定を bridge に届けるためのアプローチは、ざっと 3 つ考えられる：(a) precompile が bridge を直接 *呼ぶ*、(b) bridge が約定を *ポーリング* しに来る、(c) precompile が push する共有バッファを install する。**なぜ (c) — 共有バッファのパターン — が、これまで組んできたアーキテクチャからほぼ強制されるのか?** ヒント：(a) と (b) がそれぞれ何を「知っている」必要があるかを考える。

（答え：**precompile は `fn` ポインタで、bridge への参照をキャプチャできない。** (a) は precompile に何らかの方法で `&Bridge` を渡す必要があるが、これは `CLOB_STATE` global で解決したのと同じ「関数ポインタはクロージャをキャプチャできない」問題だ。(b) は bridge が「ポーリングすべき」と知っている必要があり、関心の分離に反する。(c) は同じパターンになる：bridge がバッファを所有し、precompile は global 経由でそれを見る。**共有 CLOB state のアーキテクチャができている以上、共有 fill state はその自然な拡張だ。**）

## 手順

### Step 1: `Fill` を import

`crates/evm/src/precompiles/mod.rs` の現在の import：

```rust
use openhl_clob::{AccountId, Book, Order, OrderId, OrderType, Price, Qty, Side};
```

`Fill` を追加：

```rust
use openhl_clob::{AccountId, Book, Fill, Order, OrderId, OrderType, Price, Qty, Side};
```

`Fill` は course 7 の `crates/clob/src/lib.rs` で定義した値型だ。`price: Price` と `qty: Qty` のフィールドを持つ（他にも `maker_order_id` / `taker_order_id` などがあるかもしれないが、後のテストで参照するのは `price` と `qty` だけ）。Copy 可能なので、受け渡しは安価だ。

`crates/evm/src/live_node.rs` ではすでに `Fill` を import 済み（既存の `pending_fills` フィールドで使っている）なので、こちらは今は変更しない。

### Step 2: `FILL_SINK` + install/uninstall 関数を追加

`uninstall_clob` の後ろに：

```rust
/// Process-global handle to the buffer where the precompile pushes fills.
///
/// Same lifecycle rules as `CLOB_STATE`: installed by `LiveRethEvmBridge::new`,
/// none until set. When set, `place_order` extends this buffer with any fills
/// produced by the matched order, so production-shape EVM-placed orders flow
/// into the next `build_payload`'s drained fills exactly like bridge-side
/// `submit_order` does.
static FILL_SINK: RwLock<Option<Arc<Mutex<Vec<Fill>>>>> = RwLock::new(None);

/// Install the `pending_fills` buffer the precompile should write to.
/// Companion to `install_clob`. Calling this replaces any previously-installed
/// sink.
pub fn install_fill_sink(sink: Arc<Mutex<Vec<Fill>>>) {
    *FILL_SINK.write().expect("FILL_SINK rwlock poisoned") = Some(sink);
}

/// Clear the installed fill sink. Test-only typical use; idempotent.
pub fn uninstall_fill_sink() {
    *FILL_SINK.write().expect("FILL_SINK rwlock poisoned") = None;
}
```

この static は `CLOB_STATE` と構造的に正確な並びになっている：
- `CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>>` — 外側が install/uninstall 用のロック、内側が Book のロック。
- `FILL_SINK: RwLock<Option<Arc<Mutex<Vec<Fill>>>>>` — 外側が install/uninstall 用のロック、内側がバッファのロック。

ライフサイクルもロックの階層化の理由（L4 の「設計の振り返り 2」）も同じだ：install/uninstall は稀な write なので `RwLock`、バッファへの書き込みは頻繁な write なので `Mutex`、という構成。

`install_fill_sink` と `uninstall_fill_sink` は CLOB 版のミラーだ：body は 1 行、いずれも `pub fn`。doc コメントでライフサイクル（「`LiveRethEvmBridge::new` から呼ばれる」）を明示してあるので、コードを追う読者は呼び出し側の予定を把握できる。

> 🛑 **やりがちな勘違い。** 「CLOB と fill-sink を 1 つの global にまとめてはどうか? たとえば `CLOB_STATE: Option<(Arc<Mutex<Book>>, Arc<Mutex<Vec<Fill>>>)>` のように」 — **install のタイミング要件が異なるからだ。** `read_best_bid` だけを exercise するテストは fill sink を install する必要がない。束ねると、毎テストで両方を準備しないといけなくなる。**global を直交に保てば、各テストは触るものだけを install できる。** static が 2 つあるコストは名前空間上のものだけで、uninstalled なら実行時コストはゼロだ。利得はテストごとの合成可能性。

### Step 3: `place_order` を約定 push まで拡張

L8 の body：

```rust
    let mut book = clob.lock().expect("clob mutex poisoned");
    let _result = book.submit(Order {
        id: OrderId(order_id_val),
        account: AccountId(account_id),
        side,
        qty: Qty(qty_value),
        order_type: OrderType::Limit {
            price: Price(price_value),
        },
    });
    drop(book);

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
```

これに変更：

```rust
    let mut book = clob.lock().expect("clob mutex poisoned");
    let submit_result = book.submit(Order {
        id: OrderId(order_id_val),
        account: AccountId(account_id),
        side,
        qty: Qty(qty_value),
        order_type: OrderType::Limit {
            price: Price(price_value),
        },
    });
    drop(book);

    // Stage 9c+: route any fills produced by this order through the bridge's
    // pending_fills buffer so they reach the next `build_payload`. Drops
    // silently if no sink is installed (consistent with no-CLOB → return 0).
    if !submit_result.fills.is_empty() {
        let sink_state = FILL_SINK.read().expect("FILL_SINK rwlock poisoned");
        if let Some(sink) = sink_state.as_ref() {
            sink.lock()
                .expect("fill_sink mutex poisoned")
                .extend(submit_result.fills.iter().copied());
        }
    }

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
```

変化は 3 つ：

1. **`_result` から `submit_result` へ。** L8 の設計振り返り（「`_result` は将来の意図を示すマーカー」）で予告したとおり、いまがその「将来」だ。underscore が外れ、binding が実際に使われる。
2. **`if !submit_result.fills.is_empty()` による早期回避。** order が cross せず rest しただけのとき（約定を生まないとき）、ロック取得をスキップする。limit を rest させる一般ケース → fill-sink トラフィックなし、となる。
3. **`sink_state.as_ref().map(|sink| sink.lock()...extend(...))` パターン。** `current_best_bid` の read パターン（L4 の Step 4）と同じ形だ：外側の read ロックは短く保持して内側の Arc にアクセスし、続いて内側の Mutex を取得する。

**`submit_result.fills.iter().copied()`** — `Fill` は `Copy` なので、`.iter().copied()` で所有権付き約定の iterator が得られる。`.into_iter()` より安価 — `submit_result` の他のフィールドを消費したくないからだ。**Copy 経由で iterate すれば、ソースは無傷のまま保てる。**

> 🛑 **考えてみよう。** `if !submit_result.fills.is_empty()` の guard に注目してほしい。これを外して、無条件に FILL_SINK の read ロックを取って `as_ref()` をチェックする形にしたら、挙動は変わるか?

（答え：**挙動は同じだが、約定なしのケースで性能が落ちる。** 一般ケース — limit を rest させただけの `place_order` 呼び出し — のたびに、FILL_SINK の read ロックを取り、結局何も push しないことを確認するだけ、という処理を毎回繰り返すことになる。guard はそれを短絡してくれる。**一般ケースを早期に回避できるなら、それはタダで得られる勝利だ。** ここは hot path — 不要なロック取得のコストはじわじわ積み上がる。）

### Step 4: `place_order` doc コメントを更新

L8 の末尾段落：

```rust
/// Side note: the fills returned by `Book::submit` are discarded here.
/// Production-shape integration would route them through the bridge's
/// `pending_fills` so they reach the next `build_payload`. At v0 the
/// precompile and the bridge are write-side independent.
```

これに置き換え：

```rust
/// Stage 9c+ (this commit): any fills produced by the submit are pushed into
/// the `FILL_SINK` global if installed. This is what makes EVM-placed orders
/// flow into the bridge's `pending_fills` and out via `build_payload`,
/// matching the bridge-side `submit_order` semantics. If no sink is
/// installed the fills are still produced (visible via subsequent
/// `read_best_bid`) but won't reach a payload.
```

明示したのは 2 点：

1. **「何が変わったか」を示す行** — 「Stage 9c+ (this commit)」。半年後にこの doc を読む人にも、どのバージョンのコードが何をしているかが分かる。
2. **fallback セマンティクス** — 「sink が install されていなくても約定自体は生まれる」。テスト分離の観点で決定的に重要だ。L8 のラウンドトリップテスト（sink を install しない）でも `place_order_then_read_best_bid_round_trips` が動くのは、sink の有無に関わらず約定が Book に届くからだ。**この fallback を doc で明示しておけば、約定を気にしないテストは sink を install せずに `place_order` だけで済ませられる。**

### Step 5: Unit test を追加

`#[cfg(test)] mod tests` ブロック内、`place_order_then_read_best_bid_round_trips` の後に：

```rust
    /// **Stage 9c+**: when a `FILL_SINK` is installed alongside the CLOB,
    /// fills produced by a `place_order` call flow into the sink. This is the
    /// hook the bridge relies on to surface EVM-placed fills in the next
    /// `build_payload`. With no sink installed, fills are still produced but
    /// silently dropped — verified by the round-trip test above (which never
    /// installs a sink yet still observes book state changes).
    #[test]
    fn place_order_routes_fills_to_installed_sink() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let book = Arc::new(Mutex::new(Book::new()));
        let sink: Arc<Mutex<Vec<Fill>>> = Arc::new(Mutex::new(Vec::new()));
        install_clob(book);
        install_fill_sink(Arc::clone(&sink));

        // Maker: Buy @ 100, qty 10. Rests, no fill.
        let maker = place_order_calldata(1, 0, 100, 10);
        let r = place_order(&maker, 100_000, 0).unwrap();
        assert!(U256::from_be_slice(&r.bytes[0..32]) > U256::ZERO);
        assert!(sink.lock().unwrap().is_empty(), "no fills after resting maker");

        // Taker: Sell @ 100, qty 10. Crosses the maker → exactly one fill.
        let taker = place_order_calldata(2, 1, 100, 10);
        let r = place_order(&taker, 100_000, 0).unwrap();
        assert!(U256::from_be_slice(&r.bytes[0..32]) > U256::ZERO);

        let fills = sink.lock().unwrap().clone();
        assert_eq!(fills.len(), 1, "exactly one fill from the crossing taker");
        assert_eq!(fills[0].price, Price(100));
        assert_eq!(fills[0].qty, Qty(10));

        uninstall_fill_sink();
        uninstall_clob();
    }
```

テストの形は次のとおり：

1. **Setup** — `TEST_SERIALIZER` を取得し、CLOB と sink の両方を install する。`sink`（Arc クローン）は inspect 用に保持しておく。
2. **resting maker** — Buy @ 100。何ともクロスしない（book は空）。**約定は 0 個**で、sink は空のまま。
3. **crossing taker** — Sell @ 100。resting Buy にクロスする。maker が book から消え、taker は完全にマッチ → **約定がちょうど 1 つ** 生まれる。
4. **sink を inspect** — `clone()` で Vec を取り出してから assert する（Mutex を握ったまま assert しない）。長さ、price、qty を検証する。
5. **後始末** — install したのと逆の順で両方を uninstall する。

**なぜ単一の submit ではなく、maker + taker のペアにするのか?** `Book::submit` は、新規 order が既存 order と *クロス* したときにしか約定を生まない。空の book への単独 submit は約定を 0 個しか生まない。routing logic をテストするためには、**少なくとも 1 つの約定が実際に routing されている必要がある**。maker が rest し、taker がクロスする → 約定 1 つ、というのが最小テストデータだ。

> 🛑 **やりがちな勘違い。** 「marketable な Buy を、resting Sell のある book に submit してテストすればよいのでは?」 — **できる、等価だ。Maker-Buy / Taker-Sell を選んでいるのは、それが order-book の標準的な例だから。** 2 つ目の order が 1 つ目に対して marketable であれば、向きはどちらでも構わない。教育上のポイントは「クロスする 2 つの order が約定を 1 つ生む」ことで、価格方向は副次的だ。

> 🛑 **考えてみよう。** CLOB は install するが sink は install せずに、クロスする order を発注したらどうなるか? ヒント：L8 の既存テスト `place_order_then_read_best_bid_round_trips` を見てみる。

（答え：**Book 内では約定が生まれるが、どこにも push されない** — precompile の `if !submit_result.fills.is_empty()` guard は当たる一方、`FILL_SINK.read()` は `None` を返すため、内側のブロックが実行されない。order が book に乗ったり外れたりする挙動は正しく起きる。欠けるのは bridge への *流れ* だけだ。これが doc コメントで明示した「単独テストでもなお動く」という性質だ。L8 のラウンドトリップテストは sink を install しないが、正しい best-bid 挙動を観測できる — その挙動はこの性質に依存している。）

### Step 6: `live_node.rs` — pending_fills を Arc に

`crates/evm/src/live_node.rs` を開く。現在の struct（L4 から）：

```rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Arc<Mutex<Book>>,
    pending_fills: Mutex<Vec<Fill>>,
    state: Mutex<State>,
}
```

`pending_fills` を変更：

```rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    clob: Arc<Mutex<Book>>,
    /// Same shared-Arc pattern as `clob`: the precompile module's `FILL_SINK`
    /// global points at this buffer too, so fills produced by EVM-placed
    /// orders (via `clob_place_order`) flow into the same queue the bridge's
    /// own `submit_order` writes to (Stage 9c+).
    pending_fills: Arc<Mutex<Vec<Fill>>>,
    state: Mutex<State>,
}
```

doc コメントでアーキテクチャの対称性を説明している — `pending_fills` も `clob` もどちらも shared-Arc パターンに従う。型を辿って `Arc` を見た人は、global がそこを指していることも併せて把握できる。

### Step 7: `LiveRethEvmBridge::new` を更新

現在の `new`（L4 後）：

```rust
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        let clob = Arc::new(Mutex::new(Book::new()));

        // Make our CLOB visible to the `clob_read_best_bid` precompile so
        // smart contracts can query live orderbook state. The bridge writes
        // (submit_order), the EVM reads (precompile); they share the same Arc.
        crate::precompiles::install_clob(Arc::clone(&clob));

        Self {
            provider,
            chain_spec,
            validator,
            clob,
            pending_fills: Mutex::new(Vec::new()),
            state: Mutex::new(State::default()),
        }
    }
```

これに変更：

```rust
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        let clob = Arc::new(Mutex::new(Book::new()));
        let pending_fills = Arc::new(Mutex::new(Vec::new()));

        // Make our CLOB visible to the `clob_read_best_bid` precompile so
        // smart contracts can query live orderbook state. The bridge writes
        // (submit_order), the EVM reads (precompile); they share the same Arc.
        crate::precompiles::install_clob(Arc::clone(&clob));

        // Route fills produced by the `clob_place_order` precompile into the
        // same queue `submit_order` writes to. Without this, EVM-placed orders
        // would match but their fills would be silently dropped (Stage 9c+).
        crate::precompiles::install_fill_sink(Arc::clone(&pending_fills));

        Self {
            provider,
            chain_spec,
            validator,
            clob,
            pending_fills,
            state: Mutex::new(State::default()),
        }
    }
```

変化は 3 つ：

1. **`let pending_fills = Arc::new(Mutex::new(Vec::new()));`** — Arc をローカルに束縛する。上の `let clob = ...` と同じ形だ。
2. **`crate::precompiles::install_fill_sink(Arc::clone(&pending_fills));`** — precompile モジュールと Arc を共有する。`install_clob` のミラー。
3. **struct literal は `pending_fills,`** で済む（`Mutex::new(Vec::new())` をインラインで書かない） — ローカル変数をそのまま使えばよい。

`self.pending_fills` を使う他の call site（`pending_fill_count()` や、`build_payload` での drain など）は引き続き動く — `Arc<Mutex<T>>` は `&Mutex<T>` に deref されるので、`self.pending_fills.lock()` のままで構わない。L4 で `clob` を Arc にしたときに `submit_order` がそのまま動き続けたのと同じ coercion だ。

## テスト

```bash
cargo test -p openhl-evm --release
```

30 秒ほどで：

```
running 47 tests
... 47 tests pass ...

test result: ok. 47 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

L8 より 1 多い（46 → 47）。新規は `place_order_routes_fills_to_installed_sink`。それだけ見るには：

```bash
cargo test -p openhl-evm --release routes_fills
```

出力：

```
running 1 test
test precompiles::tests::place_order_routes_fills_to_installed_sink ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 46 filtered out
```

よくあるエラーと対処：

- **`live_node.rs` での `error[E0277]: 'Vec<Fill>' is not 'Arc<Mutex<Vec<Fill>>>'`** — `pending_fills` を Arc::new + Mutex::new でラップし忘れ。`new()` で `let pending_fills = Arc::new(Mutex::new(Vec::new()));` を構築する必要。
- **Struct literal が `Mutex::new(...)` を直接使っているときの `error[E0277]: 'Mutex<Vec<Fill>>' is not 'Arc<Mutex<Vec<Fill>>>'`** — L4 形の残骸。ローカル `pending_fills,` binding に置き換え。
- **`precompiles/mod.rs` での `unused import: Fill`** — Fill を import に追加したが使っていない。`Vec<Fill>` と `FILL_SINK: ...Fill...` 参照で使うはず。これが見えるなら static が配置されているか確認。
- **新テストでの `assertion failed: fills.len() == 1`** — `book.submit` が 1 つではなく 0 個の約定しか生まなかった。十中八九、2 つ目の order が 1 つ目とクロスしていない。Maker が Buy @ 100、taker が Sell @ 100（同価格 = クロス）を確認。
- **永久にハング** — `place_order` が FILL_SINK を取りに行くとき Book ロックを保持している。`drop(book)` 行が `if !submit_result.fills.is_empty()` ブロックの*前*にあることを確認。

## 設計の振り返り

立ち止まりたいポイントが 4 つ：

1. **共有バッファのパターンは一般化する。** L4 で CLOB に対して「`Arc<Mutex<T>>` + プロセスグローバル」のパターンを導入し、L9 ではそれを約定に再利用した。**アーキテクチャの primitive がいったん揃えば、bridge と precompile の間で共有する追加 state は、バッファあたり ~20 行で済む。** L4 で抽象化に投資した分が複利で効いてくる。

2. **state ごとに install のライフタイムが違うなら、別々に分けておく。** CLOB と FILL_SINK を 1 つの global にまとめてしまうと、テストごとに両方を install しなければならなくなる。直交な global は、直交なテスト setup を可能にする。**テストが主な consumer になる場面では、関連 state の凝集度より、ライフサイクルを直交に合成できることのほうが重要だ。**

3. **一般ケースの早期回避はタダで効く。** `if !submit_result.fills.is_empty()` のおかげで、クロスせずに rest しただけの order — 最も多いケース — ではロック取得をスキップできる。guard は hot path に分岐を 1 つ足すだけだが、約定が空のときに RwLock の取得を節約できる。**hot path でもっとも安価な最適化は、たいていの場合「支配的なケースの早期回避」だ。**

4. **フラグは doc コメントの中に置く。** L8 の doc の「Side note: fills are discarded」は load-bearing だった — 将来の読者に「これは意図的なギャップで、見落としではない」と伝えるための行だ。L9 でそのギャップを閉じ、doc も更新する。**ドキュメント化されたギャップは半分直したも同然、ドキュメント化されていないギャップは見えない技術負債になる。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

L9 終了時点で `precompiles/mod.rs` の diff は空、`live_node.rs` の diff も *L9 でカバーされた変更については*空のはず。Stage 9c+ commit は bridge integration test も拡張する（まだ存在しない — L10 が追加）ので、`live_node.rs` のテスト region で非空 diff が出るのは想定通り — それは L10 の領分。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: `place_order` が同時に呼ばれて、両方とも約定を生んだらどうなる?**
両方のスレッドが FILL_SINK の read ロックを取る（非排他なので OK）。どちらも同じ Arc に包まれたバッファへの参照を得る。それぞれが内側の Mutex を `.lock()` — そこで取得がシリアライズされる。**先に到着したスレッドの約定が入り、次にもう一方の約定が入る。順序は `submit` の呼び出し順と一致し、何も失われない。** 標準的な Mutex のセマンティクスのとおりだ。

**Q: なぜ `place_order_routes_fills_to_installed_sink` は、もっと単純なシナリオではなく maker-taker のクロスでテストするのか?**
routing をテストするには約定が必要だからだ。`Book::submit` は、order が何ともクロスしないときには約定を 0 個しか返さない — その場合、routing のブロックを exercise できない。**maker-taker のペアが、約定を生む最小のテストデータだ。** これより単純なシナリオでは、routing のロジックをまるごとスキップしてしまう。

**Q: `submit_result` の正体は何か? `Vec<Fill>` だけ?**
`Book::submit` が返す struct だ（course 7 の CLOB crate で定義した）。少なくとも `.fills: Vec<Fill>` というフィールドを持ち、他にもフィールド（`order_id_assigned` や `resting_qty` など）があるかもしれない。L9 で必要なのは `.fills` だけで、残りは v0 では未使用だ。

**Q: bridge の `build_payload` が `pending_fills` を drain するとき、両ソースの約定を原子的に drain するのか?**
イエス。`pending_fills` は単一のバッファ（Mutex も 1 つ）だ — 約定が `bridge.submit_order`（bridge 内部の呼び出し）由来か `place_order`（FILL_SINK 経由）由来かは関係ない。`build_payload` が `self.pending_fills.lock().unwrap().drain(..)` を呼ぶと、前回の drain 以降に push されたすべての約定が得られる — EVM 経由の発注も bridge 経由の発注も、時系列で交互に並ぶ形で含まれる。**統一されたキューには統一された drain で十分。**

## 次のレッスン（L10）

L10 はいよいよ **コースレベルのマイルストーン** だ：Stage 9d の integration test `bridge_against_custom_evm_node_shares_clob_with_precompile`。`OpenHlExecutorBuilder` で Reth ノードを bootstrap し、そのノードの provider に対して `LiveRethEvmBridge` を構築する。`bridge.submit_order` で order を発注し、`current_best_bid` で観測する。続いて **precompile 経由で `place_order` を呼び**、`bridge.pending_fill_count()` がインクリメントすることを検証する。これが **すべての要素** — Module 1 の EVM bootstrap、Module 2 の read precompile、Module 3 の write precompile、Module 4 の FILL_SINK — が、実際の Reth プロセス内で噛み合うことの証明になる。L10 を終えれば、openhl のリファレンス実装は Stage 9d を閉じる。
````

---

## Seed-file slot

L9 は Module 4 (Bridge integration) の sortOrder 0 に入る：

```typescript
{
  title: 'レッスン 9 — install_fill_sink — 約定を bridge に戻す',
  slug: 'openhl-precompiles-fill-sink-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 80,
  content: `# レッスン 9 — \`install_fill_sink\` — 約定を bridge に戻す\n\n...`
},
```

## SHA pinning discipline

L9 は `d19ba1b`（Stage 9c+）を引用。L9 終了時点で `precompiles/mod.rs` は Stage 9c+ と一致、`live_node.rs` も integration-test region 以外は一致（L10 の領分）。

## Style review notes (self-critique before paste)

- **§ゴールが Module 4 開幕をフレーミング** — precompile と bridge は書き込み側でもう独立ではない。
- **§考えてみよう (a)(b)(c) オプション** が共有バッファパターンを消去法で正当化。
- **§Step 2 の `CLOB_STATE` と `FILL_SINK` の構造的並行**が L9 を L4 の抽象に anchor。
- **§やりがちな勘違い「なぜ束ねない」** が直交 global 設計を正当化。
- **§考えてみよう（早期回避）** が「シンプルにできない？」を先回り — hot path 最適化を説明。
- **§Step 5 maker/taker 説明**がテストデータ形を正当化。
- **§Step 6 + 7 が L4 の bridge 変更をミラー** — 読者が構造対称性を見る。
- **§設計の振り返り 1**「共有バッファパターンは一般化する」が L4 抽象の価値を retrospect。
- **L10 プレビュー**がコースマイルストーンの予告 — 「すべてが噛み合う」。
