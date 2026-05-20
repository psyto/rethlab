# Building OpenHL Precompiles — L8 draft (JA) — build-along

> openhl SHA `a8823a1`（Stage 9c — clob_place_order precompile / write path）に対するドラフト。
> コース: `building-openhl-precompiles-ja`（track: `reth-l1-architect`）。

---

## L8 — `openhl-precompiles-place-order-write-ja`

- **Module:** 3 (Write precompile), sortOrder 1 within module
- **Course-level sortOrder:** 7 (lesson 8 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT
- **Milestone:** Module 3 中盤マイルストーン（write-read ラウンドトリップ）

### Content

````markdown
# レッスン 8 — `book.submit(...)` — 書き込みパスが live になる

## ゴール

このレッスンが終わると：

```bash
cargo test -p openhl-evm --release
```

上記の実行結果が 46 tests を通る — L7 と同じテスト数だ。だが `place_order` に 1 行を加え、テスト 2 つを変更することで、precompile が **本当に book に書く** ようになる：

- **`place_order` に 1 行追加** — order_id の割り当てと encoding の間に `clob.lock().submit(Order { ... })` を挟む。
- **L7 で付けた `_` 接頭辞を外す** — `_account_id` / `_price_value` / `_side` を実際に使うようになる。
- **L7 の `place_order_rejects_malformed_input` を拡張** — 各 rejection の sub-assertion の後に `book.depth_bid() == 0` も assert する（rejection 時に部分的な mutation がないことを示す）。
- **L7 の `place_order_returns_nonzero_id_on_valid_input` を置き換え** — `place_order_then_read_best_bid_round_trips` へ。`0x...0c1c` 経由の書き込みが `0x...0c1b` 経由の読み込みから見えることを示す、precompile 2 つのラウンドトリップだ。

このラウンドトリップが **Module 3 の中盤マイルストーン** — EVM ↔ CLOB のサーフェスが双方向になる瞬間だ。スマートコントラクトは片方の precompile で order を発注し、もう片方で即座に best bid を読める — 両方が同じ `Arc<Mutex<Book>>` を見ているからだ。

## おさらい

L7 終了時点の状態：
- `place_order` は、128-byte の calldata を `(account, side, price, qty)` に parse し、検証し、`order_id` を割り当てる — **その後は ID を返すだけで、書き込みはしない。**
- unit test は 3 つともすべて通る。ただし `place_order_rejects_malformed_input` は戻り値しかチェックしておらず、side-effect は見ていない。
- happy-path テスト（`place_order_returns_nonzero_id_on_valid_input`）も、ID が *返る* ことだけを検証していて、book に乗ったかどうかは検証していない。

関数としては書き込みパスの半分まで来ている。L8 で残り半分を完成させる。

## プラン

`crates/evm/src/precompiles/mod.rs` への編集は 3 つ：

1. **`place_order` の中で** — order ID の割り当てと出力 encoding の間で、Book をロックして `submit` を呼ぶ。binding の underscore を外す（今度こそ使うから）。
2. **`place_order_rejects_malformed_input` テストの中で** — 3 つの rejection assertion それぞれの後に、`book.lock().unwrap().depth_bid() == 0` も assert する。これには、テストが `book`（`Arc<Mutex<Book>>`）を保持して、rejection 後にも book を inspect できる必要がある。
3. **`place_order_returns_nonzero_id_on_valid_input` を置き換え** — 新テスト `place_order_then_read_best_bid_round_trips`（precompile 2 つのラウンドトリップ）へ。

import の変更はなし。新しい関数も precompile もなし。**L8 はコース中で最も中身の少ない content レッスン** だ — 価値は「コード 1 行で双方向のサーフェスが閉じる」ことを証明する点にある。

> 🛑 **考えてみよう。** スクロールする前に — read precompile が global の Arc から live なデータを見られることは、すでに L6 で証明済みだ。L8 で変わるのは、そのデータの *ソース* だけ — テスト setup が直接 `book.lock().submit(...)` で Arc に書き込む（L6 がやっていた形）のではなく、**`place_order` precompile** が書き込むようになる。**この変化のどこが重要なのか?** ヒント：precompile がどんな種類の caller を代表しているのかを考える。

（答え：**precompile はスマートコントラクトの caller を代表している。** L6 でテストコードが book に直接書き込んでいたのは、*ブリッジ*（オフチェーンコード）が book に書き込むのと等価だった。`place_order` が book に書き込むことは、**EVM transaction が book に書き込む** ことと等価だ — スマートコントラクトの呼び出しが EVM dispatch を通って precompile に届き、その結果として book state が生まれる。**Stage 9c は、EVM 実行が CLOB state を mutate し始める瞬間そのものだ。** L8 まではオフチェーンコードしか book に書けなかったが、L8 以降はオンチェーンコードも書ける。）

## 手順

### Step 1: `place_order` に `submit` 呼び出しを追加

L7 の本体を探す。該当部分は order ID 割り当てと出力 encoding の間：

```rust
    drop(state); // L8 will re-acquire as write-side-friendly

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

    // L7 stops here. L8 will add: clob.lock().submit(Order { ... }).

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
```

この領域をこう変更：

```rust
    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

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

注目すべき点：

- **`drop(state)` が消える。** L7 ではまだ `book.lock()` を呼ばないので read ロックを早めに drop していた。L8 では同じ read を後段まで保持し、`clob`（`Arc` の中身への参照）に bind したまま使う。L7 の `is_none` チェックは `let-else` に書き換える必要がある。

実際のロックパターンを明示するため、`place_order` の更新版を全体で示す。qty チェックの後ろのロックセクションを次のように置き換える：

```rust
    let state = CLOB_STATE.read().expect("CLOB_STATE rwlock poisoned");
    let Some(clob) = state.as_ref() else {
        // No CLOB installed → 0 sentinel.
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    };

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

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
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
```

L7 からの変更点：
- `if state.as_ref().is_none() { ... }; drop(state);` を `let Some(clob) = state.as_ref() else { ... };` に置き換える — `let-else` binding なら、`None` の早期 return 後も `clob` を使い続けられる。
- `Some` で bind したあと、**`state` を drop してはいけない** — `clob`（`state` への参照）を `clob.lock()` 呼び出しまで有効に保ちたいので、`state` が生きている必要がある。
- `let _result = book.submit(...)` — `submit` は `Vec<Fill>`（マッチングエンジンが生んだ fill）を返す。L8 ではこれを無視する。**L9 でこの fill を bridge に route する** が、今は `let _result` で clippy の unused return value 警告を黙らせる。
- `drop(book)` — Book の mutex ガードを明示的に drop する。`out[24..32]` のコピーと `Ok(...)` の return は、Book のロックを保持せずに行う。hot path 向けのちょっとした最適化だ。

**binding の `_` 接頭辞も外す**（今度は実際に使うので）：

```rust
    let account_id = u64_from_be_chunk(&input[0..32]);   // was _account_id
    let side_byte = input[63];
    let price_value = u64_from_be_chunk(&input[64..96]); // was _price_value
    let qty_value = u64_from_be_chunk(&input[96..128]);

    let side = match side_byte {                          // was _side
        0 => Side::Buy,
        1 => Side::Sell,
        _ => return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)),
    };
```

識別子 3 つにようやく意味が宿る：`account_id` は order の account、`price_value` は limit price、`side` は order の side だ。**L8 の submit 内で組み立てる Order 構造体まるごとが、L7 で parse 済みのデータそのもの。** これが「L7 で schema を固め、L8 で挙動を追加する」ことの実体だ。

doc コメントも更新する — L7 で書いた「submit はまだ呼ばない」という L7 NOTE 行を削除する：

```rust
/// Place a limit order on the installed CLOB. The write counterpart to
/// `read_best_bid` — completes the EVM ↔ CLOB bidirectional surface.
///
/// Calldata layout (ABI-aligned, 128 bytes):
/// ```text
///   [  0.. 32]  account_id  (u64 in last 8 bytes)
///   [ 32.. 64]  side        (u8 in last byte: 0 = Buy, 1 = Sell)
///   [ 64.. 96]  price       (u64 in last 8 bytes)
///   [ 96..128]  qty         (u64 in last 8 bytes)
/// ```
///
/// Returns 32 bytes: the allocated `order_id` in the last 8 bytes, or zero
/// on rejection (no CLOB installed, malformed input, invalid side byte).
/// Allocated IDs start at 1, so zero is unambiguously "rejected".
///
/// Side note: the fills returned by `Book::submit` are discarded here.
/// Production-shape integration would route them through the bridge's
/// `pending_fills` so they reach the next `build_payload`. At v0 the
/// precompile and the bridge are write-side independent.
```

末尾の「Side note」は次のギャップを明示している — `submit` が返した fill を捨てている、という点だ。**そのギャップを埋めるのが L9。** doc コメントに書いておくことで、将来の読者にも「これは認識済みのギャップで、見落としではない」と伝わり、悩む時間を節約できる。

> 🛑 **やりがちな勘違い。** 「unused 警告を抑えるだけなら、`_result` の underscore に意味はあるのか?」 — **`let _result = ...` と `let _ = ...` はどちらも警告は抑える。** 違いは：`let _result` は値を bind してスコープの終わりで drop する一方、`let _ = ...` は値を **即座に** drop する（次の文より前に）。`submit` のケースでは、`_result` を後で読むわけではないのでどちらでも動く。だが `let _result` は「値に意味のある名前があり、将来使う予定がある」ときの慣習だ — L9 で本来の名前に bind して route するように。**`_result` は「将来の意図」のマーカーだ。**

> 🛑 **やりがちな勘違い。** 「どうせスコープの終わりで release されるのに、なぜ `drop(book)` を明示するのか?」 — **encoding と `Ok()` の return がまだ残っているからだ。** `drop(book)` しないと、`out[24..32].copy_from_slice(...)` と `Ok(PrecompileOutput::new(...))` の構築の間も Book ロックを握り続けることになる。どちらの操作もロックを必要としない。握り続けていると、並行 reader や他の precompile の並列アクセスにコストがかかる。**明示的な drop は「このロックは用済み、関数の残りでは要らない」という宣言だ。** コンパイラ上は省略可能だが、hot path ではロック保持の窓を目に見えて縮められる。

### Step 2: `place_order_rejects_malformed_input` を `depth_bid` check で拡張

現在の L7 テスト：

```rust
    #[test]
    fn place_order_rejects_malformed_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        install_clob(Arc::new(Mutex::new(Book::new())));

        // Too short.
        let r = place_order(&[0u8; 64], 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "short input rejects");

        // Invalid side byte.
        let bad_side = place_order_calldata(42, 7, 100, 5);
        let r = place_order(&bad_side, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "bad side byte rejects");

        // Zero qty.
        let zero_qty = place_order_calldata(42, 0, 100, 0);
        let r = place_order(&zero_qty, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO, "zero qty rejects");

        uninstall_clob();
    }
```

このテストは Book を install しているが、Arc を捨ててしまっているので book の state を確認できない。次のように置き換える：

```rust
    /// `place_order` with bad input (too short, invalid side byte, zero qty)
    /// rejects without mutating state.
    #[test]
    fn place_order_rejects_malformed_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let book = Arc::new(Mutex::new(Book::new()));
        install_clob(book.clone());

        // Too short.
        let r = place_order(&[0u8; 64], 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO);
        assert_eq!(book.lock().unwrap().depth_bid(), 0, "no order on book after short input");

        // Invalid side byte.
        let bad_side = place_order_calldata(42, 7, 100, 5);
        let r = place_order(&bad_side, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO);
        assert_eq!(book.lock().unwrap().depth_bid(), 0, "no order on book after bad side");

        // Zero qty.
        let zero_qty = place_order_calldata(42, 0, 100, 0);
        let r = place_order(&zero_qty, 100_000, 0).unwrap();
        assert_eq!(U256::from_be_slice(&r.bytes[0..32]), U256::ZERO);
        assert_eq!(book.lock().unwrap().depth_bid(), 0, "no order on book after zero qty");

        uninstall_clob();
    }
```

L7 からの変更点は 3 つ：

1. **`let book = Arc::new(...); install_clob(book.clone());`** — Arc をローカルに束縛する。Arc の `.clone()` は refcount をインクリメントするだけ。両方の名前が同じ Book を指す形になる。
2. **新規 assertion を 3 つ：`book.lock().unwrap().depth_bid() == 0`** — 各 rejection の後、book には何も乗っていないことを確かめる。**`depth_bid()` は全価格レベルにわたる bid order の本数を返す**（course 7 の Book で定義した）。Zero なら空、ということだ。
3. **doc コメント** を追加（L7 では「L7 NOTE」で先送りチェックを説明していたが、ここで消える）。

**追加した 3 つの assertion が side-effect 側の証明だ。** L7 の `assert_eq!(... U256::ZERO)` は precompile が sentinel を *返す* ことしかチェックしていなかった。L8 では、precompile が **何も書き込んでいない** ことも合わせて確認する。両方を合わせて、「malformed input → 0 を返し、かつ state には触れない」が証明できる。

> 🛑 **やりがちな勘違い。** 「`book` をそのまま渡せばよいのに、なぜ `book.clone()` するのか?」 — **`install_clob` が引数を消費（move）した後でも、inspect できる handle を残しておきたいからだ。** `install_clob(Arc<Mutex<Book>>)` は Arc を値で受け取る。`install_clob(book.clone())` のあとには、global が 1 つの Arc、このスコープの `book` がもう 1 つの Arc を保持する形になる — どちらも同じ Book を指す。仮に `install_clob(book)` と書いてしまうと、`.lock().unwrap().depth_bid()` を呼ぶためのローカル handle を失う。**Arc::clone は、関数呼び出しをまたいで所有権を共有するための安価な手段だ。**

### Step 3: Happy-path テストをラウンドトリップに置換

L7 のこれを削除：

```rust
    #[test]
    fn place_order_returns_nonzero_id_on_valid_input() {
        // ...
    }
```

その場所にこれを追加：

```rust
    /// **Stage 9c end-to-end (write side)**: place a Buy via the precompile,
    /// then read the best bid via the read precompile. The two-precompile
    /// round-trip is the moment the EVM ↔ CLOB surface becomes bidirectional.
    #[test]
    fn place_order_then_read_best_bid_round_trips() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let book = Arc::new(Mutex::new(Book::new()));
        install_clob(book);

        // EVM call: place Buy @ 175 with qty 12, account 0xABCD.
        let calldata = place_order_calldata(0xABCD, 0, 175, 12);
        let result = place_order(&calldata, 100_000, 0).expect("precompile must not error");
        let returned_id = U256::from_be_slice(&result.bytes[0..32]);
        assert!(
            returned_id > U256::ZERO,
            "place_order must return a non-zero order id on success"
        );

        // Now read the best bid via the read precompile. Should see our order.
        let read_result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
        let price = U256::from_be_slice(&read_result.bytes[0..32]);
        let qty = U256::from_be_slice(&read_result.bytes[32..64]);
        assert_eq!(price, U256::from(175u64), "best bid is the placed order's price");
        assert_eq!(qty, U256::from(12u64), "qty at best level matches placed qty");

        uninstall_clob();
    }
```

L7 のテストを「追加」ではなく「置き換え」にする理由：

- L7 の `place_order_returns_nonzero_id_on_valid_input` は `place_order` が nonzero な ID を返すことしか assert していない。その assertion は、こちらのテストの `assert!(returned_id > U256::ZERO, ...)` に **包含されている**。
- 新テストはさらに進む：`read_best_bid` で読んで、発注した order が実際に見えることまで検証する。**L7 の assertion は、L8 の assertion の厳密な部分集合だ。**

両方残すのは冗長になる。**包含されるテストは死荷重だ** — coverage は増えず、メンテナンスコストだけが増える。

2 つの precompile call は独立している — `read_best_bid` は `place_order` が起きたことを知らない。どちらも `CLOB_STATE` 経由で同じ `Arc<Mutex<Book>>` を read/write する。**それがラウンドトリップだ — 片方の precompile で書き、もう片方で観測する。** Solidity コントラクトの視点ではこうなる：

```solidity
uint256 order_id = call(0x...0c1c, abi.encode(0xABCD, 0, 175, 12));   // ~ id > 0
(uint256 price, uint256 qty) = staticcall(0x...0c1b, "");             // ~ (175, 12)
```

EVM call は別々、precompile も別々だが、global を共有しているので state も共有される。**そのグローバルを install するのが bridge で、bridge 自身の submit_order もそこに書き込む。bridge の pending_fills はまだ何も受け取っていない（これは L9 で直す）。**

> 🛑 **考えてみよう。** スクロールする前に — このテストは `Book` を install し、`place_order` で Buy を発注し、`read_best_bid` で読む。**もし read precompile と write precompile が *それぞれ別の* `Arc<Mutex<Book>>` を（つまり別々の Book を）持っていたらどうなるか?** ヒント：共有 state が何を意味するかを考える。

（答え：**テストは fail する。** `read_best_bid` は空の book を見て zero を返す。このラウンドトリップが成立する唯一の理由は、**両方の precompile が同じ `CLOB_STATE` global から読み、その global が 1 つの Arc を保持していて、その Arc が 1 つの Book を指しているから** だ。Arc を共有するパターンこそが、ラウンドトリップに意味を与えている。各 precompile が自前の private な state を持っていたら、機能的に切り離されてしまい、同じ CLOB に話しかける用途には使えない。）

## テスト

```bash
cargo test -p openhl-evm --release
```

30 秒ほどで：

```
running 46 tests
... 46 tests pass ...

test result: ok. 46 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

テスト数は L7 と同じ 46 個。変わったのは、テスト 1 つを置き換えたこと（`place_order_returns_nonzero_id_on_valid_input` → `place_order_then_read_best_bid_round_trips`）と、テスト 1 つを拡張したこと（`place_order_rejects_malformed_input` で book state もチェックするようにしたこと）。

マイルストーンテストだけ見るなら：

```bash
cargo test -p openhl-evm --release round_trips
```

出力：

```
running 1 test
test precompiles::tests::place_order_then_read_best_bid_round_trips ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 45 filtered out
```

**この `ok` 行が Module 3 の中盤マイルストーンだ。** カスタム precompile 2 つ、共有 state 1 つ、そして EVM 実行内で完結する write → read のフルラウンドトリップが揃った。

よくあるエラーと対処：

- **`place_order` 内で `error[E0382]: borrow of moved value: 'state'`** — `let Some(clob) = state.as_ref() else { ... };` を書いたあと、後続コードで `state` をまだ使っている。`let-else` パターンは `clob`（`state` への参照）を bind するので、`state` は生きていなければならない。後から `drop(state)` を足してはいけない。
- **`error: cannot find value 'account_id' in this scope`** — `Order { ... }` リテラル側の `_` 接頭辞は外したが、parse 行が `let _account_id = ...` のまま残っている。*両側で* 接頭辞を外す必要がある。
- **`place_order_rejects_malformed_input` で `assertion failed: book.lock().unwrap().depth_bid() == 0`** — rejection path がきれいに弾けていない。どこかで早期 return をすり抜けて、`book.submit(...)` まで到達している。rejection の順序を再確認する：短い input → side byte → qty → CLOB なし、の順だ。それぞれが `return Ok(...)` になっていて、本体に落ちる `if ... { ... }` になっていないかを見直す。
- **ラウンドトリップテストで `assertion failed: left=200 right=175`** — `submit` が間違ったフィールドに bind している。Order の `price` は `input[64..96]` から parse した値（u64）。`Price(price_value)` を渡しているか確認する（`Price(qty_value)` などになっていないか）。
- **`error[E0599]: no method 'depth_bid' found for struct 'Book'`** — このメソッドは course 7 の Book 設計で追加した。`crates/clob/src/book.rs` に存在することを確認する。

## 設計の振り返り

立ち止まりたいポイントが 4 つ：

1. **schema を先に固めるので、挙動側は小さく済む。** L7 は ~70 行ぶん（定数、atomic、パーサ、登録、テスト）。L8 はその上に ~7 行（submit + binding のリネーム + テスト拡張）追加するだけ。**この差分の小ささこそが要点**：実装の前に契約を固めることで、実装は広範な変更ではなく集中した変更で済む。将来 precompile を増やすときも同じパターンで進められる。

2. **precompile 2 つ、Arc 1 つ、state を共有 — だからラウンドトリップが動く。** L4 で組んだアーキテクチャ（`static` 内の `Arc<Mutex<Book>>`、bridge が install、各 precompile が read）は、まさにこの瞬間のために設計したものだ。**両方の precompile が同じ Book を見られるのは、どちらも `CLOB_STATE` を経由しているから。** 別の設計（precompile ごとに global を 1 つずつ）にしていれば、初期の構築は楽だったかもしれないが、ラウンドトリップ自体が不可能になっていた。

3. **side-effect をテストするには handle を保持しておく必要がある。** L7 の malformed-input テストは参照を保持していなかったので、book を確認できなかった。L8 では `let book = Arc::new(...); install_clob(book.clone());` でこれを直す。**clone のあるなしが「戻り値テスト」と「state テスト」の差だ。** clone のコストは atomic increment 1 回ぶんで安価、効用は「部分的な write が起きていない」ことを証明できる点にある。

4. **`_result` は将来の意図を示すマーカー。** L8 では `submit` が返す fill を `_result` に bind して無視する。L9 では `fills`（underscore なし）に bind して route する。命名規約は次のとおり：`_name` は「値の存在は認識しており、今は使わないが将来使う予定」、`_`（むき出し）は「明示的に使わない、将来も使う予定はない」。状況に応じて選ぶ。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

L8 を終えた時点で、あなたのコードは Stage 9c と一致する。diff は **空** になるはずだ（自分で書き換えた doc コメントの言い回しを除けば）。**これで Stage 9c が閉じる。**

戻す：

```bash
git checkout main
```

## よくある質問

**Q: `Book::submit` の戻り値は何で、なぜ捨てるのか?**
`Book::submit(order)` は `Vec<Fill>` を返す — 新しい order が反対側の resting order とマッチして生じた fill のリストだ。marketable な Buy を submit すれば 1 つ以上の Sell order を消費し、マッチごとに 1 つの Fill が生まれる。L8 ではこれを捨てる — bridge の `pending_fills`（次の payload に attach される）にはまだ precompile が繋がっていないからだ。**L9 で、`install_clob` を鏡写しにした `install_fill_sink` パターンで繋ぎ込む。**

**Q: `place_order` を `staticcall` から呼んだらどうなる?**
staticcall は read-only な呼び出しで、呼び先が state を mutate しようとすると Solidity 側が revert する。**ただし precompile については、EVM は precompile 境界でこれを強制しない** — `STATICCALL` で呼ばれたときに書き込みを拒否するのは precompile 側の責任になる。v0 ではチェックしていない — 強い意志を持ったコントラクトは `0x...0c1c` を STATICCALL でき、こちらは何の抵抗もなく book に書き込んでしまう。**これは既知の soundness gap だ。** production では call context（`is_static`）を見て reject すべきだが、v0 のスコープ外とする。

**Q: 1 つの EVM call で *write と read の両方* を起こせるか?**
できる — 1 つの Solidity 関数が `call(0x...0c1c, ...)` の後に `staticcall(0x...0c1b, ...)` を順に呼べばよい。`place_order_then_read_best_bid_round_trips` が Rust レベルでシミュレートしているのは事実上これだ。両方の call は同じ EVM transaction の call stack 内で実行され、どちらも `CLOB_STATE` global を触る。**ただし EVM transaction が後で revert しても、book の state はロールバックされない** — これも soundness gap の 1 つ。production では transaction-scoped な state shadowing が必要になる。

**Q: なぜ `place_order` を `0x...0c1a` ではなく `0x...0c1c` に登録するのか?**
アドレス名前空間の慣習だ：`0c1b` = 「Read Best [b]id」、`0c1c` = 「[c]lob [c]reate」。数字的には `0c1a` も魅力的（`0c1a < 0c1b`）だったが、`0c1c` のほうが声に出して読みやすく、read/write のアドレスが隣り合う — `0c1b` が read、`0c1c` が write — ので、両方を使うコントラクトを目で追う人にとって助けになる。コントラクトを人間が書く以上、アドレスの命名慣習は重要だ。

## 次のレッスン（L9）

L9 では、L8 の doc コメントに残した「fill を捨てている」というギャップを閉じる。`CLOB_STATE` と対になる `FILL_SINK` static を追加する — プロセスグローバルな `Option<Arc<Mutex<Vec<Fill>>>>` だ。`place_order` は fill を sink に push するようになる。bridge の `pending_fills` フィールドは `Mutex<...>` から `Arc<Mutex<Vec<Fill>>>` に変える。bridge の `new()` がそれを FILL_SINK として install する。L9 を終えると、**EVM 経由で発注された order が生んだ fill が、bridge の payload-attached な fill stream に流れ込むようになる** — precompile と bridge は書き込み側でも独立ではなくなる。
````

---

## Seed-file slot

L8 は Module 3 (Write precompile) の sortOrder 1 に入る：

```typescript
{
  title: 'レッスン 8 — book.submit(...) — 書き込みパスが live になる',
  slug: 'openhl-precompiles-place-order-write-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 8 — \`book.submit(...)\` — 書き込みパスが live になる\n\n...`
},
```

## SHA pinning discipline

L8 は `a8823a1`（Stage 9c）を引用。L8 終了時点で `crates/evm/src/precompiles/mod.rs` は Stage 9c と byte-identical。Diff は空。

## Style review notes (self-critique before paste)

- **§ゴールが L8 を「コース中もっとも小さい content レッスン」とフレーミング** — 1 行 + 2 テスト変更 — Module 3 中盤マイルストーンに紐付け。
- **§考えてみよう「データの*ソース*が変わる」** が「EVM 実行が state を mutate する」フレーミングを正当化。
- **§Step 1 の `let-else` パターン** が L7 の `is_none()` + `drop(state)` が単一 `let Some(clob) = ... else { ... }` になる理由を説明。
- **§やりがちな勘違い（`_result` vs `let _`）** は再利用可能な Rust スタイル指針。
- **§やりがちな勘違い（`book.clone()`）** が「なぜわざわざ」疑問を先回り。
- **§考えてみよう「precompile が別々の global を持っていたら？」** が共有 state アーキテクチャを正当化。
- **§設計の振り返り 1** — schema first だから behavior second は小さい — が L7/L8 split を retrospect。
- **§よくある質問の `staticcall` + soundness gap** が v0 制約に正直。
- **L9 プレビュー**が次のギャップ（fill ルーティング）を指す。
