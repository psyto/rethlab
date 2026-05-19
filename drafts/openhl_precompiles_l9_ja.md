# Building OpenHL Precompiles — L9 draft (JA) — build-along

> openhl SHA `d19ba1b`（Stage 9c+ — precompile が発注した order の fill を bridge に route）に対するドラフト。
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
# レッスン 9 — `install_fill_sink` — fill を bridge に戻す

## ゴール

このレッスンが終わると：

```bash
cargo test -p openhl-evm --release
```

…が 47 tests を通る（1 新規）。L8 の doc コメントで述べた「fill が discard される」ギャップが閉じる：

- **`FILL_SINK` static を追加** — `CLOB_STATE` と並行、`Option<Arc<Mutex<Vec<Fill>>>>` を保持。
- **`install_fill_sink` / `uninstall_fill_sink` モジュール関数** — public、`install_clob` / `uninstall_clob` パターンをミラー。
- **`place_order` を拡張** — `let submit_result = book.submit(...)`（前は `_result`）。`drop(book)` の後、sink が install されていれば**生まれた fill を push** する。
- **`LiveRethEvmBridge::pending_fills`** が `Mutex<Vec<Fill>>` から `Arc<Mutex<Vec<Fill>>>` に変わる。Bridge の `new()` が `install_fill_sink(Arc::clone(&pending_fills))` を `install_clob` と並んで呼ぶ。
- **新しい unit test** `place_order_routes_fills_to_installed_sink` — maker/taker のクロスを実行、sink が fill を受け取ることを検証。

L9 の後、precompile と bridge はもはや**書き込み側で独立**ではない。EVM 経由で発注された order が生む fill は、bridge 側の `submit_order` が書く同じ `pending_fills` キューに流れる。次の `build_payload` がそれを見る。

## おさらい

L8 で Stage 9c proper を閉じた：`place_order` が book に書くようになり、`place_order → read_best_bid` ラウンドトリップが証明された。だが L8 の doc コメントはギャップを名指した：

> Side note: the fills returned by `Book::submit` are discarded here. Production-shape integration would route them through the bridge's `pending_fills` so they reach the next `build_payload`.

そのギャップは意図的 — Stage 9c は diff を集中させるためそれなしで出した。Stage 9c+ がそれを閉じる。

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

> 🛑 **考えてみよう。** スクロール前に — `book.submit(...)` を呼んで返り値の fill を*捨てる* precompile（`place_order`）はすでにある。それらの fill が bridge に届くようにするために：(a) precompile が bridge を直接*呼ぶ*、(b) bridge が fill を*ポーリング*しに来る、(c) precompile が push する共有バッファを install する、の 3 つが考えられる。**なぜ (c) — 共有バッファパターン — がこれまで作ってきたアーキテクチャからほぼ強制されるか？** ヒント：(a) と (b) が何を「知っている」必要があるかを考える。

（答え：**Precompile は `fn` pointer であり、bridge への参照をキャプチャできない。** (a) は precompile に `&Bridge` を何らかの方法で渡す必要があり、これは `CLOB_STATE` global で解決したのと同じ「関数ポインタはキャプチャできない」問題。(b) は bridge が「ポーリングすべきだ」と知る必要 — 関心の分離違反。(c) は同じパターン：bridge がバッファを所有、precompile が global 経由で見る。**共有 CLOB state のアーキテクチャが整えば、共有 fill state は自然な拡張。**）

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

`Fill` は course 7 の `crates/clob/src/lib.rs` で定義された value 型。`price: Price` と `qty: Qty` のフィールドを持つ（その他 `maker_order_id`、`taker_order_id` 等もあるかもしれないが、下のテストで inspect するのは `price` と `qty` だけ）。Copy 可能なので、受け渡しは安価。

`crates/evm/src/live_node.rs` では `Fill` は既に import 済み（既存の `pending_fills` フィールドで使われている）。ここではまだ変更なし。

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

Static は `CLOB_STATE` の正確な構造的並行：
- `CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>>` — 外側の install/uninstall ロック、内側の Book ロック。
- `FILL_SINK: RwLock<Option<Arc<Mutex<Vec<Fill>>>>>` — 外側の install/uninstall ロック、内側のバッファロック。

同じライフサイクル、同じロック層化の理由（L4 §設計の振り返り 2）：稀な install/uninstall write には `RwLock`、頻繁なバッファ write には `Mutex`。

`install_fill_sink` と `uninstall_fill_sink` は CLOB 版をミラー：1 行の body、両方 `pub fn`。Doc コメントがライフサイクル（「`LiveRethEvmBridge::new` による」）を名指すので、コードを辿る読者は誰が呼ぶ予定かを知る。

> 🛑 **やりがちな勘違い。** 「CLOB と fill-sink を 1 つの global に束ねたら？例：`CLOB_STATE: Option<(Arc<Mutex<Book>>, Arc<Mutex<Vec<Fill>>>)>`」 **インストールのタイミング要件が違うから。** `read_best_bid` だけ exercise するテストは fill sink を install する必要がない。束ねると毎テストで両方を提供する羽目になる。**Global を直交に保てば、各テストが触るものだけ install できる。** 2 つの static のコストは記号的（uninstalled なら zero-runtime-cost）。利得は per-test 合成可能性。

### Step 3: `place_order` を fill push まで拡張

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

3 つの変化：

1. **`_result` → `submit_result`。** L8 の設計振り返り（「`_result` は将来意図のマーカー」）の通り、今がその将来。アンダースコアが消える、binding が使われる。
2. **`if !submit_result.fills.is_empty()` 早期回避。** Order が cross せず rest したとき（fill 生まず）、lock 取得をスキップ。Resting limit の一般ケース → fill-sink トラフィックなし。
3. **`sink_state.as_ref().map(|sink| sink.lock()...extend(...))` パターン。** `current_best_bid` の read パターン（L4 Step 4）と同じ形：外側の read ロックを短く保持して内側の Arc にアクセス、次に内側の Mutex を取得。

**`submit_result.fills.iter().copied()`** — `Fill` は `Copy` なので `.iter().copied()` で所有 fill のイテレータが得られる。`.into_iter()` より安価 — `submit_result` の他のフィールドを消費したくないから。**Copy で iterate するとソースが intact のまま。**

> 🛑 **考えてみよう。** `if !submit_result.fills.is_empty()` の guard を見る。これを外したら（無条件に FILL_SINK の read ロックを取って `as_ref()` を check）、挙動は変わる？

（答え：**挙動は同じだが、fill なしのケースで性能が落ちる。** 限り注文を rest した毎 `place_order` 呼び出し — 一般ケース — が FILL_SINK の read ロックを取って何も push しないことを確認するだけになる。Guard はそれを短絡。**一般ケースの早期回避はタダで得られる勝利。** これは hot path — 不要な lock 取得のコストは積み重なる。）

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

2 つ名指したこと：

1. **「何が変わったか」の行** — 「Stage 9c+ (this commit)」。6 ヶ月後に読者がこの doc を読むと、どのバージョンのコードが何をしているか分かる。
2. **Fallback セマンティクス** — 「sink が install されていなくても fill は生み出される」。テスト隔離に決定的：L8 のラウンドトリップテスト（sink を install しない）でも `place_order_then_read_best_bid_round_trips` が動くのは、sink の有無に関わらず fill が Book に届くから。**Fallback を doc に名指せば、fill を気にしないテストが sink を install せずに `place_order` を満たせる。**

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

テストの形：

1. **Setup** — `TEST_SERIALIZER` + CLOB と sink の両方を install。`sink`（Arc クローン）を inspect 用に保持。
2. **Resting maker** — Buy @ 100、何もクロスしない（book は空）。**Zero fills**。Sink は空のまま。
3. **Crossing taker** — Sell @ 100、resting Buy にクロス。Maker が book を出て、taker が full match → **ちょうど 1 つの Fill**。
4. **Sink を inspect** — `clone()` で Vec を出してから assert（Mutex を保持しないで assert する）。Length、price、qty を検証。
5. **Cleanup** — install 順の逆で両方 uninstall。

**なぜ maker + taker のペア、単一 submit ではない？** `Book::submit` は新 order が既存 order と*クロス*したときのみ fill を生む。空 book への単独 submit は zero fill を生む。Routing logic をテストするには**少なくとも 1 つの fill が実際 route される必要**。Maker が rest、taker がクロス → 1 fill — 最小テストデータ。

> 🛑 **やりがちな勘違い。** 「Marketable Buy を、resting Sell がある book に submit するのでテストできないの？」 **できる、等価。Maker-Buy/Taker-Sell を選ぶのはそれが標準的な order-book 例だから。** 2 つ目が 1 つ目に対して marketable ならどっち向きでも動く。Pedagogical な要点は「クロスする 2 つの order が 1 つの fill を生む」 — 価格方向は incidental。

> 🛑 **考えてみよう。** CLOB は install するが sink は install せずクロスする order を発注したらどうなる？ ヒント：L8 の既存 `place_order_then_read_best_bid_round_trips` テストを見る。

（答え：**Book 内で fill は生み出されるが、どこにも push されない — precompile の `if !submit_result.fills.is_empty()` guard は当たるが、`FILL_SINK.read()` は `None` を返すので内側ブロックが実行されない。** Order の book への on/off は正しく起きる。bridge への*流れ*だけが欠ける。これが doc コメントで名指した「単独テストでまだ動く」性質。L8 のラウンドトリップテストは sink を install しないが正しい best-bid 挙動を観測 — これに依存している。）

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

Doc コメントがアーキテクチャの対称性を説明 — `pending_fills` と `clob` は両方とも shared-Arc パターン。型を辿って `Arc` を見た人は global がそこを指していることも知る。

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

3 つの変化：

1. **`let pending_fills = Arc::new(Mutex::new(Vec::new()));`** — Arc をローカル束縛、上の `let clob = ...` と同じ形。
2. **`crate::precompiles::install_fill_sink(Arc::clone(&pending_fills));`** — precompile モジュールと Arc を共有。`install_clob` をミラー。
3. **Struct literal の `pending_fills,`**（`Mutex::new(Vec::new())` をインラインで書かない） — ローカルを使うだけ。

`self.pending_fills` を使う他の call site（例：`pending_fill_count()`、`build_payload` での drain）は引き続き動く — `Arc<Mutex<T>>` は `&Mutex<T>` に deref するので `self.pending_fills.lock()` は変更不要。L4 で `clob` を Arc 化したとき `submit_order` を動かし続けたのと同じ coercion。

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
- **新テストでの `assertion failed: fills.len() == 1`** — `book.submit` が 1 つでなく 0 fill を生んだ。十中八九、2 つ目の order が 1 つ目とクロスしていない。Maker が Buy @ 100、taker が Sell @ 100（同価格 = クロス）を確認。
- **永久にハング** — `place_order` が FILL_SINK を取りに行くとき Book ロックを保持している。`drop(book)` 行が `if !submit_result.fills.is_empty()` ブロックの*前*にあることを確認。

## 設計の振り返り

4 点：

1. **共有バッファパターンは一般化する。** L4 で CLOB に `Arc<Mutex<T>>` + プロセスグローバルパターンを導入。L9 がそれを fill に再利用。**アーキテクチャの primitive が整えば、bridge と precompile の間で共有する追加の state はバッファあたり ~20 行のコード。** L4 の抽象化への投資が複利で回る。

2. **異なる state はインストールライフタイムが異なる — 別々に保つ。** CLOB と FILL_SINK を 1 つの global に束ねると毎テストで両方を install しなければならない。直交な global = 直交な test setup。**テストが主な consumer のとき、関連 state の凝集度より直交なライフサイクル合成可能性のほうが重要。**

3. **一般ケースの早期回避はタダ。** `if !submit_result.fills.is_empty()` がクロスせず rest した order の lock 取得をスキップ — 最も一般的なケース。Guard が hot path に分岐 1 つを足し、fill が空のとき RwLock 取得を節約。**Hot path で最も安価な最適化はしばしば支配的なケースの早期回避。**

4. **フラグは doc コメントの中。** L8 の doc の「Side note: fills are discarded」は load-bearing — 将来の読者に「これは意図的なギャップで、見落としではない」と伝えた。L9 がギャップを閉じて doc を更新。**Doc 化されたギャップは半分修正、無 doc のギャップは見えない技術負債。**

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

**Q: `place_order` が同時に呼ばれて両方とも fill を生むとどうなる？**
両スレッドが FILL_SINK の read ロックを取得（非排他、OK）。両方とも同じ Arc 包みのバッファへの参照を得る。各々が内側 Mutex を `.lock()` — その取得がシリアライズ。**1 スレッドの fill が先に着く、次にもう 1 つ。順序は `submit` 呼び出し順に一致。何も失われない。** 標準 Mutex セマンティクス。

**Q: `place_order_routes_fills_to_installed_sink` がもっとシンプルなシナリオでなく maker-taker クロスをテストするのは？**
Routing をテストするには fill が要るから。`Book::submit` は order が何もクロスしないとき 0 fill を返す — routing block を全く exercise しない。**Maker-taker のペアが fill を生む最小テストデータ。** よりシンプルなシナリオは routing logic を完全にスキップする。

**Q: `submit_result` って厳密には何？ `Vec<Fill>` だけ？**
`Book::submit` が返す struct（course 7 の CLOB crate で定義）。少なくとも `.fills: Vec<Fill>` フィールドがあり、その他もあるかも（`order_id_assigned`、`resting_qty` 等）。L9 では `.fills` だけ必要。残りは v0 では未使用。

**Q: Bridge の `build_payload` が `pending_fills` を drain するとき、両ソースの fill を原子的に drain する？**
イエス。`pending_fills` は 1 つのバッファ（1 つの Mutex）— fill が `bridge.submit_order`（bridge 内の呼び出し）から来ても `place_order`（FILL_SINK 経由）から来ても変わらない。`build_payload` が `self.pending_fills.lock().unwrap().drain(..)` を呼ぶと、前回の drain 以降に push された全 fill を得る — EVM 発注も bridge 発注も、時系列で交互。**統一されたキュー = 統一された drain。**

## 次のレッスン（L10）

L10 は**コースレベルのマイルストーン**：Stage 9d integration test `bridge_against_custom_evm_node_shares_clob_with_precompile`。`OpenHlExecutorBuilder` で Reth ノードを bootstrap、そのノードの provider に対して `LiveRethEvmBridge` を構築、`bridge.submit_order` で order を発注、`current_best_bid` で観測、次に **precompile 経由で `place_order` を呼んで** `bridge.pending_fill_count()` がインクリメントすることを検証。これが**すべて** — Module 1 の EVM bootstrap、Module 2 の read precompile、Module 3 の write precompile、Module 4 の FILL_SINK — が実際の Reth プロセス内で噛み合う証明。L10 後、openhl リファレンス実装は Stage 9d を閉じる。
````

---

## Seed-file slot

L9 は Module 4 (Bridge integration) の sortOrder 0 に入る：

```typescript
{
  title: 'レッスン 9 — install_fill_sink — fill を bridge に戻す',
  slug: 'openhl-precompiles-fill-sink-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 80,
  content: `# レッスン 9 — \`install_fill_sink\` — fill を bridge に戻す\n\n...`
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
