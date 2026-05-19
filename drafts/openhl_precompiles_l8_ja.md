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

…が 46 tests を通る — L7 と同じテスト数 — だが `place_order` に 1 行追加と 2 つのテスト変更で、precompile が**本当に book に書く**：

- **`place_order` に 1 行追加** — order_id 割り当てと encoding の間に `clob.lock().submit(Order { ... })`。
- **L7 の `_` 接頭辞を外す** — `_account_id` / `_price_value` / `_side` が使われるようになる。
- **L7 の `place_order_rejects_malformed_input` を拡張** — 各 rejection sub-assertion で `book.depth_bid() == 0` も check（rejection で partial mutation がないことを証明）。
- **L7 の `place_order_returns_nonzero_id_on_valid_input` を置換** — `place_order_then_read_best_bid_round_trips` へ。`0x...0c1c` 経由の書き込みが `0x...0c1b` 経由の読み込みから見えることを証明する 2-precompile ラウンドトリップ。

このラウンドトリップが **Module 3 の中盤マイルストーン**：EVM ↔ CLOB サーフェスは双方向になる。スマートコントラクトが片方の precompile で order を発注し、もう片方で best bid を即座に読む — 両方が同じ `Arc<Mutex<Book>>` を見ている。

## おさらい

L7 終了時点：
- `place_order` が 128-byte calldata を `(account, side, price, qty)` にパース、検証、`order_id` 割り当て — **その後 ID を返すだけで書かない。**
- 3 つの unit test は全部通るが、`place_order_rejects_malformed_input` は戻り値のみ check（side-effect check なし）。
- Happy-path テスト（`place_order_returns_nonzero_id_on_valid_input`）は ID を*返す*ことだけ検証 — book に乗ったかは検証しない。

関数は書き込みパスの半分。L8 で完全にする。

## プラン

`crates/evm/src/precompiles/mod.rs` に 3 つの編集：

1. **`place_order` 内で** — order ID 割り当てと出力 encoding の間で Book をロックし `submit` を呼ぶ。Bindings の underscore を外す（今使うので）。
2. **`place_order_rejects_malformed_input` テスト内で** — 各 3 つの rejection アサーションの後、`book.lock().unwrap().depth_bid() == 0` も assert。これにはテストが `book`（`Arc<Mutex<Book>>`）を保持して rejection 後に book を inspect できる必要がある。
3. **`place_order_returns_nonzero_id_on_valid_input` を置換** — 新テスト `place_order_then_read_best_bid_round_trips`（2-precompile ラウンドトリップ）。

Import は変更なし。新関数なし。新 precompile なし。**L8 はコース中もっとも小さい content レッスン** — 価値は「1 行のコードが双方向サーフェスを閉じる」を証明すること。

> 🛑 **考えてみよう。** スクロール前に — L6 で read precompile が global Arc から live データを見ることはすでに証明した。L8 で変わるのはそのデータの*ソース*だけ — テスト setup が直接 `book.lock().submit(...)` で Arc に書き込む（L6 がそうしたように）のでなく、**`place_order` precompile** が書き込む。**なぜこの変化が重要？** ヒント：precompile がどんな種類の caller を表しているかを考える。

（答え：**Precompile はスマートコントラクト caller を表す。** L6 でテストコードが book に直接書き込んだとき、それは*bridge*（オフチェーンコード）が book に書き込むのと等価。`place_order` が book に書き込むと、それは **EVM transaction が book に書き込む**のと等価 — スマートコントラクトの呼び出しが EVM dispatch を通って precompile に伝わり book state を生む。**Stage 9c は EVM 実行が CLOB state を mutate し始める瞬間。** L8 までオフチェーンコードだけが book に書けた。L8 後オンチェーンコードも書ける。）

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

- **`drop(state)` が消えた。** L7 ではまだ `book.lock()` を呼ばないので read ロックを早めに drop していた。L8 では同じ read を後まで保持して `clob`（`Arc` の中身）に bind したまま使う。L7 の `is_none` チェックを `let-else` に再形成する必要がある。

実際の lock パターンを明示するため、`place_order` 全更新版を示す。qty チェックの後の lock セクションをこう置き換え：

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

L7 からの変更：
- `if state.as_ref().is_none() { ... }; drop(state);` が `let Some(clob) = state.as_ref() else { ... };` に — `let-else` binding が `None` の早期 return 後も `clob` を使えるようにする。
- `Some` bind 後、**`state` を drop しない** — `clob`（`state` への参照）が `clob.lock()` 呼び出しを通して有効なまま、`state` が生きている必要がある。
- `let _result = book.submit(...)` — `submit` は `Vec<Fill>`（マッチングエンジンの fill）を返す。L8 では無視。**L9 でこれらの fill を bridge に route する** — が今は `let _result` で clippy の unused return value 警告を黙らせる。
- `drop(book)` — Book mutex guard の明示的 drop。`out[24..32]` のコピーと `Ok(...)` return は Book lock を保持せずに起きる。Hot path 用の小さな最適化。

**Bindings の `_` 接頭辞も外す**（今使うので）：

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

3 つの識別子が意味を得る：`account_id` が order の account に、`price_value` が limit price に、`side` が order の side に。**L8 の submit 内で構築する Order 構造体全体は、L7 でパースしたデータそのもの。** これが「L7 で schema を固め、L8 で挙動を追加」の実態。

doc コメントも更新 — L7 の「submit をまだ呼ばない」と書いた L7 NOTE 行を削除：

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

末尾の「Side note」は次のギャップを明示 — `submit` が返す fill は discard。**そのギャップが L9。** Doc コメントで名指しすることで「これがギャップとわかっている」と将来の読者に伝わる — 見落としかどうかを悩ませない。

> 🛑 **やりがちな勘違い。** 「unused 警告を抑えたいなら `_result` のアンダースコアの意味は？」 **`let _result = ...` と `let _ = ...` は両方とも警告を抑える。** 違い：`let _result` は値を bind してスコープ末で drop。`let _ = ...` は値を**即座に**drop（後続の文より前）。`submit` の場合、後で `_result` を read しないので両方動く。だが `let _result` は値に意味ある名前があって将来使う予定があるときの慣習 — L9 のように、本物の名前に bind して route するとき。**`_result` は「将来の意図」マーカー。**

> 🛑 **やりがちな勘違い。** 「スコープ末でどうせ release されるなら `drop(book)` を明示する意味は？」 **encoding と Ok() return がまだ pending だから。** `drop(book)` しないと `out[24..32].copy_from_slice(...)` と `Ok(PrecompileOutput::new(...))` の構築の間ずっと Book lock を保持する。どちらも lock を必要としない。保持し続けると並行 reader や他の precompile の並列アクセスにコストがかかる。**明示的 drop = 「このロックは終わり、関数の残りでは要らない」。** Compiler 上は optional だが、hot path で lock 保持窓を目に見えて縮める。

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

このテストは Book を install するが Arc を捨てているので book state を check できない。これに置換：

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

L7 からの 3 つの変更：

1. **`let book = Arc::new(...); install_clob(book.clone());`** — Arc をローカル束縛。Arc の `.clone()` は refcount bump だけ。両方の名前が同じ Book を指す。
2. **3 つの新アサーション：`book.lock().unwrap().depth_bid() == 0`** — 各 rejection 後、book には何も乗っていない。**`depth_bid()` は全価格レベルにわたる bid order の count**（course 7 の Book で定義）。Zero = 空。
3. **Doc コメント** — 追加（L7 では「L7 NOTE」版で先送り check を説明していた — 今は消える）。

**3 つの新アサーションが side-effect 証明。** L7 の `assert_eq!(... U256::ZERO)` は precompile が sentinel を*返す*ことだけ check した。L8 は precompile が**何も書き込まない**ことも check。両方合わせて：malformed input → 0 を返す*かつ*state を触らない、を証明。

> 🛑 **やりがちな勘違い。** 「`book` をそのまま渡せばいいのに、なぜ `book.clone()`？」 **`install_clob` が引数を消費（move）した後も inspect できる handle を保持したいから。** `install_clob(Arc<Mutex<Book>>)` は Arc を値で取る。`install_clob(book.clone())` の後、global が 1 つの Arc、`book`（このスコープ）がもう 1 つ持つ。両方とも同じ Book を指す。`install_clob(book)` と書いたら、`.lock().unwrap().depth_bid()` を呼ぶローカル handle を失う。**Arc::clone は関数呼び出しを跨いで所有権を共有する安価な方法。**

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

なぜ L7 テストを置換（追加でなく）するか：

- L7 の `place_order_returns_nonzero_id_on_valid_input` は `place_order` が nonzero ID を返すことだけ assert。そのアサーションはこのテストの `assert!(returned_id > U256::ZERO, ...)` に**包含**される。
- 新テストはさらに進む：`read_best_bid` で読んで、置いた order が見えることを検証。**L7 アサーションは L8 アサーションの厳密な部分集合。**

両方残すと冗長。**包含されるテストは死荷重** — coverage は増えず、メンテナンス負荷だけ増える。

2 つの precompile call は独立 — `read_best_bid` は `place_order` が起きたことを知らない。両方とも `CLOB_STATE` 経由で同じ `Arc<Mutex<Book>>` を read/write。**それがラウンドトリップ：片方の precompile で書き、もう片方で観測。** Solidity コントラクトの視点では：

```solidity
uint256 order_id = call(0x...0c1c, abi.encode(0xABCD, 0, 175, 12));   // ~ id > 0
(uint256 price, uint256 qty) = staticcall(0x...0c1b, "");             // ~ (175, 12)
```

2 つの別々の EVM call、2 つの別々の precompile、しかし global を共有するので state を共有する。**Bridge がその global を install。Bridge の submit_order がそれに書く。Bridge の pending_fills はまだ何も得ていない（L9 で修正）。**

> 🛑 **考えてみよう。** スクロール前に — このテストは `Book` を install、`place_order` で Buy を発注、`read_best_bid` で読む。**もし read precompile と write precompile が*それぞれ独自の* `Arc<Mutex<Book>>`（別々の Book）を持っていたら何が起きる？** ヒント：共有 state が何を意味するかを考える。

（答え：**テストは失敗する。** `read_best_bid` は空の book を見て zero を返す。このラウンドトリップが動く唯一の理由は **両 precompile が同じ `CLOB_STATE` global から read し、その global が 1 つの Arc を保持し、その Arc が 1 つの Book を指している**から。Arc 共有パターンこそがラウンドトリップを意味あるものにする。各 precompile が自分の private state を持っていたら、機能的に隔離 — 同じ CLOB に話しかける役に立たない。）

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

L7 と同じカウント（46）。何が変わったか：1 テスト置換（`place_order_returns_nonzero_id_on_valid_input` → `place_order_then_read_best_bid_round_trips`）、1 テスト拡張（`place_order_rejects_malformed_input` が book state も check）。

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

**この `ok` 行が Module 3 の中盤マイルストーン。** 2 つのカスタム precompile、1 つの共有 state、EVM 実行内での完全な write→read ラウンドトリップ。

よくあるエラーと対処：

- **`place_order` 内の `error[E0382]: borrow of moved value: 'state'`** — `let Some(clob) = state.as_ref() else { ... };` を書いたが後続コードが `state` を使っている。`let-else` パターンは `clob`（`state` への参照）を bind するので `state` が生きていないといけない。あとで `drop(state)` を追加しないこと。
- **`error: cannot find value 'account_id' in this scope`** — 内側の `Order { ... }` リテラルで `_` 接頭辞を外したがパース行がまだ `let _account_id = ...` のまま。*両方*で接頭辞を外す。
- **`place_order_rejects_malformed_input` での `assertion failed: book.lock().unwrap().depth_bid() == 0`** — rejection path が綺麗に reject していない。何かが早期 return を通り抜けて `book.submit(...)` を呼んでいる。Rejection sequence を再確認：短い input → side byte → qty → no CLOB。各々が `return Ok(...)` であって body が落ちる `if ... { ... }` でないこと。
- **Round-trip テストでの `assertion failed: left=200 right=175`** — `submit` が間違ったフィールドを bind している。Order の `price` は `input[64..96]` でパースしたもの（u64）。`Price(price_value)` を渡しているか確認（`Price(qty_value)` などになっていないか）。
- **`error[E0599]: no method 'depth_bid' found for struct 'Book'`** — そのメソッドは course 7 の Book 設計で追加された。`crates/clob/src/book.rs` に存在することを確認。

## 設計の振り返り

4 つの一時停止ポイント：

1. **Schema first だから behavior second は小さい。** L7 は ~70 行（定数、原子、パーサ、登録、テスト）。L8 は ~7 行（submit + binding rename + テスト拡張）追加。**この小さな差分こそが要点**：実装の前に契約を固めることで、実装は広がる変更でなく集中した変更になる。将来の precompile 追加も同じパターンで進められる。

2. **2 つの precompile、1 つの Arc、共有 state = ラウンドトリップが動く。** L4 のアーキテクチャ（`static` 内の `Arc<Mutex<Book>>`、bridge が install、各 precompile が read）はまさにこの瞬間のために設計された。**両 precompile が同じ Book を見るのは両方が `CLOB_STATE` を通るから。** 別のアーキテクチャ（precompile ごとに global 1 つ）なら初期構築は簡単だっただろうが、ラウンドトリップそのものが不可能だっただろう。

3. **Side-effect テストには handle 保持が必要。** L7 の malformed-input テストは参照を保持しなかったので book を check できなかった。L8 はそれを `let book = Arc::new(...); install_clob(book.clone());` で修正。**Clone が「返り値テスト」と「state テスト」の差。** 安価（atomic increment 1 つ）で価値あり（partial write がないことを証明）。

4. **`_result` は将来意図のマーカー。** L8 は `submit` が返す fill を `_result` に bind して無視。L9 は `fills`（アンダースコアなし）に bind して route する。命名規約：`_name` = 「この値は見えていて acknowledge するがまだ使わない、将来使う予定」。`_`（むき出し）= 「明示的に使わない、使う予定もない」。状況に応じて選ぶ。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

L8 終了時点であなたのコードは Stage 9c に一致。Diff は**空**のはず（自分で書いた doc コメントの言い回しを除く）。**Stage 9c はこれで閉じる。**

戻す：

```bash
git checkout main
```

## よくある質問

**Q: `Book::submit` の戻り値は何で、なぜ捨てる？**
`Book::submit(order)` は `Vec<Fill>` を返す — 新 order を反対側の resting order とマッチさせて生じた fill。Marketable Buy を submit すると 1 つ以上の Sell order を消費し、マッチごとに 1 つの Fill を生む。L8 ではこれらの fill を捨てる — bridge の `pending_fills`（次の payload に attach される）がまだ precompile に繋がっていないから。**L9 で `install_clob` をミラーした `install_fill_sink` パターンで繋ぐ。**

**Q: `place_order` を `staticcall` から呼ぶと？**
Staticcall は read-only call — 対象が state mutation を試みると Solidity が revert する。**Precompile については EVM は precompile 境界でこれを強制しない** — precompile が STATICCALL で呼ばれたとき書き込みを拒否するのは precompile 側の責任。V0 では check しない — 十分に決意の固いコントラクトは `0x...0c1c` を STATICCALL でき、我々は喜んで book に書いてしまう。**これは既知の soundness gap。** Production は call context（`is_static`）を通して reject すべき。V0 では範囲外。

**Q: 1 つの EVM call で *write と read 両方* 起こせる？**
イエス — 1 つの Solidity 関数が `call(0x...0c1c, ...)` の後に `staticcall(0x...0c1b, ...)` を順に呼べる。それが事実上 `place_order_then_read_best_bid_round_trips` が Rust レベルでシミュレートしているもの。両 call は 1 つの EVM transaction の call stack 内で実行され、両方が `CLOB_STATE` global を触る。**EVM transaction が後で revert しても book state は roll back されない** — もう 1 つの soundness gap。Production は transaction-scoped state shadowing が必要。

**Q: なぜ `place_order` は `0x...0c1a` でなく `0x...0c1c` に登録？**
アドレス名前空間の慣習：`0c1b` = 「Read Best [b]id」、`0c1c` = 「[c]lob [c]reate」。数字的には `0c1a` も誘惑的だったが（`0c1a < 0c1b`）、`0c1c` は声に出して読みやすく、read/write アドレスが隣接する — `0c1b` が read、`0c1c` が write — 両方使うコントラクトを scan する人に役立つ。コントラクトを人間が書くなら、アドレス慣習は重要。

## 次のレッスン（L9）

L9 は L8 の doc コメントの「fill が discard」ギャップを閉じる。`CLOB_STATE` と並行な `FILL_SINK` static を追加 — process-global `Option<Arc<Mutex<Vec<Fill>>>>`。`place_order` が fill を sink に push するようになる。Bridge の `pending_fills` フィールドが `Arc<Mutex<Vec<Fill>>>` に（前は `Mutex<...>` だけ）。Bridge の `new()` がそれを FILL_SINK として install。L9 後、**EVM 経由で発注された order が生む fill が bridge の payload-attached fill stream に流れる** — precompile と bridge はもう書き込み側で独立ではない。
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
