# Building OpenHL Precompiles — L6 draft (JA) — build-along

> openhl SHA `b635ef7`（Stage 9b — CLOB read precompile に live CLOB state を接続）に対するドラフト。
> コース: `building-openhl-precompiles-ja`（track: `reth-l1-architect`）。

---

## L6 — `openhl-precompiles-live-state-proof-ja`

- **Module:** 2 (Read precompile), sortOrder 2 within module
- **Course-level sortOrder:** 5 (lesson 6 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT
- **Milestone:** Module 2 完了

### Content

````markdown
# レッスン 6 — Module 2 マイルストーン — ラウンドトリップを証明する

## ゴール

このレッスンで掴む概念:

- **read チェーンを end-to-end で繋ぐ。** `CLOB に bid を発注 → bridge が Mutex 経由で書き込み → precompile が global 経由で read → 64-byte ABI にエンコード → 呼び出し元に返す`。チェーン全体を一度に走査する最初のテスト。
- **敵対的 (adversarial) なテストデータ > ランダムなテストデータ。** 「best bid 実装が正しい」ことと「たまたま正しく動いている」ことを区別するために、order 2 個を意図的に選ぶ — 250 価格 qty 7 (*正しい*答え) と、240 価格 qty 99 (反復順序を間違えたら取ってしまう、larger-qty の罠)。50 個のランダム order より価値が高い。
- **dispatch test と behavior test を分割する。** L5 では `Precompile::execute` 経由で関数が到達可能なことを示した。L6 では `read_best_bid` を直接呼び、関数が live state を読むことを示す。dispatch と behavior をひとつのテストに混ぜると、失敗時のデバッグが難しくなる。
- **assertion メッセージは未来の保守者のためのドキュメント。** `"best bid is the 250 order, not 240"` は次のエンジニアに「どの概念的不変条件が壊れているか」を伝える。素の `left=240 right=250` は値しか伝えない。
- **L4-L6 を貫く one-thing-at-a-time。** 配管 (L4) → 差し替え (L5) → 通電 (L6)。各レッスンに検証可能な変更が 1 つだけ。混ぜると、中間段階で何か壊れたときのデバッグが格段に難しくなる。

検証：

```bash
cargo test -p openhl-evm --release
```

上記の実行結果が 43 tests を通る（1 つ新規）。

具体的な変更：

新しいテストは `read_best_bid_returns_live_state_when_clob_installed`。ここまで全テストが寸止めにしてきたことを、ついにやる：**既知の bid を持つ CLOB を install し、precompile を呼び、出力 bytes がその bid の price と qty を encode していることを観測する。**

これがマイルストーンだ。フルチェーン — `CLOB に bid を発注 → ブリッジが Mutex 経由で書き込み → precompile が global 経由で read → 64-byte の ABI に encode → 呼び出し元に返す` — がついに end-to-end で exercise される。L6 後：

- Module 2 (Read precompile) **完了**：`STATICCALL(0x...0c1b)` を発行する Solidity コントラクトが、live な CLOB state を受け取れる。
- パターン（precompile が global Arc から read する）が証明されたので、今後の stage で別の read precompile（best_ask、depth、mid-price など）に複製できる。
- Module 3 (Write precompile、L7-L9) は同じインフラの上に、逆方向で構築する：precompile が CLOB state に **書く** ようにする。

### E2E ラウンドトリップ: Solidity → CLOB → Solidity

L6 で点灯する full path をひと目で:

```
 Solidity contract                                                  .sol
   (uint256 price, uint256 qty) = abi.decode(
       staticcall(gas, 0x...0c1b, "", 64), (uint256, uint256)
   );
        │                                                            ▲
        │ STATICCALL (read-only)                                     │ 64-byte response
        ▼                                                            │
 ┌───────────────────────────────────────────────────────────────────┴───┐
 │ Reth EVM dispatch                                         [L1/L2/L3]  │
 │   spec → openhl_precompiles_for(spec) → registry table                │
 │   0x...0c1b ➜ Precompile { execute: read_best_bid, base_gas: 500 }    │
 └─────────────────────────────────┬─────────────────────────────────────┘
                                   │ fn pointer call
                                   ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │ read_best_bid(input, gas_limit, _env)              [L2 body + L5 swap]│
 │   1. let mut out = vec![0u8; 64];                                     │
 │   2. match current_best_bid() {                                       │
 │        Some((p, q)) ➜ encode into out  ──┐                            │
 │        None         ➜ zero buffer        │ (encoding 経路は ↑ へ)     │
 │      }                                   │                            │
 │   3. PrecompileOutput { gas_used: 500, bytes: out }                   │
 └─────────────────────────────────┬────────┼────────────────────────────┘
                                   │        │
                                   ▼        │
 ┌────────────────────────────────────────  ┴────────────────────────────┐
 │ static CLOB_STATE: RwLock<Option<Arc<Mutex<Book>>>>     [L4 plumbing] │
 │   ① RwLock.read()        ─ install されているか? (read-mostly)        │
 │   ② Option.as_ref()      ─ 未 install なら None → zero で即帰る       │
 │   ③ Arc::clone(arc)      ─ bridge と所有権を分け合う                  │
 │   ④ inner Mutex.lock()   ─ マッチングエンジンを排他保護               │
 └─────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │ Book::best_bid_with_qty()              [Course 7 — マッチングエンジン]│
 │   bids: BTreeMap<RevPrice, OrderQueue>.iter().next()                  │
 │   → (Price, Qty)  または  None                                        │
 └───────────────────────────────────────────────────────────────────────┘

 戻り経路 (encoding 側):
   out[24..32].copy_from_slice(&price.0.to_be_bytes());  // slot 1 の右端 8 byte
   out[56..64].copy_from_slice(&qty.0.to_be_bytes());    // slot 2 の右端 8 byte
   // 上位 24 byte は vec![0u8; 64] の zero-init のまま → u64 を u256 に zero-extend
```

「Module 2 完了」とは、この縦線が**端から端まで実線で書ける状態**になったということ。L6 のテストは、まさにこの線が途中で断線していないことを 1 本の `assert_eq!` で証明する — `(250, 7)` という値が、Book → Mutex → RwLock → registry → EVM → 呼び出し元、というすべての関門を通り抜けてきたという観測そのものだ。L4 の配管、L5 の通電、L6 の計測がここで合流する。

## おさらい

L5 終了時点の状態：

- `read_best_bid` が `current_best_bid()` を呼ぶようになっている（live パス）。
- L3 の 2 テストが **未インストール時のセマンティクス** を assert している — CLOB なしなら zero output。
- `TEST_SERIALIZER` も配置済み。
- **だが、空でない CLOB を install して、値がラウンドトリップで流れてくることを観測するテストが 1 つもない。** 配管は通したが、まだ計測していない。

L6 でその配管を計測する。

## プラン

`crates/evm/src/precompiles/mod.rs` の `#[cfg(test)] mod tests` ブロック内に 1 つの編集：新しい test 関数を追加。

以上。プロダクションコードへの変更はゼロ。**L6 は純粋にテストを追加するだけ** — そしてそれがこのコースで最も重要なテストになる。

テストの構造：

1. **セットアップ** — `TEST_SERIALIZER` を取得する（最初に `uninstall_clob()` は呼ばない。すぐ自分の CLOB を install するからだ）。
2. **Book を構築** — `Arc::new(Mutex::new(Book::new()))`。
3. **bid を 2 つ rest させる** — 1 つは price 250 qty 7（こちらが best になる）、もう 1 つは price 240 qty 99（価格が低いので、いくら qty が大きくても **選ばれてはならない**）。
4. **CLOB を install** — `install_clob(book)`。
5. **precompile を直接呼ぶ** — `read_best_bid(&[], 100_000, 0)`。
6. **decode + assert** — price=250（240 ではなく）、qty=7（99 ではなく — wrong level の大きな qty が罠）。
7. **後始末** — 末尾で `uninstall_clob()` を呼ぶ（安全のためというより、明快さのため）。

> 🛑 **考えてみよう。** スクロールする前に — 2 つの bid を持つ Book を install する。`(price=250, qty=7)` と `(price=240, qty=99)` だ。**`read_best_bid` は何を返すか?** 正しく答えられれば、マッチングエンジンの「最良価格優先」の不変条件をつかんでいる。間違えれば、テストがその誤解を捕まえる。

（答え：`price=250, qty=7`。**「Best bid」 = 最高価格、であって最大数量ではない。** qty=99 の order はより悪い価格（240）に置かれており、best-bid 応答の候補にすら入らない。これは古典的な order-book の不変条件だ：価格レベル内では price-time priority、レベル間では price priority。初心者ほど「best = most liquidity」と勘違いしがちだが、それは間違い。**Best bid とは、market sell が最初にぶつかる先のこと。** market sell は最高価格を提示している 250-bid に最初にぶつかり、250 レベルを使い切ってから 240 に下りる。）

## 手順

`crates/evm/src/precompiles/mod.rs` を開く。既存の `#[cfg(test)] mod tests` ブロックを探す。

テストモジュールの先頭の import に `Order, OrderId, AccountId, OrderType, Price, Qty, Side` が含まれていることを確認する（L5 を通して、まさにこのレッスンのために残しておいたものだ）：

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use alloy_primitives::U256;
    use openhl_clob::{AccountId, Order, OrderId, OrderType, Price, Qty, Side};

    static TEST_SERIALIZER: Mutex<()> = Mutex::new(());

    // ... read_best_bid_returns_zero_when_no_clob_installed (L5)
    // ... openhl_precompiles_registers_clob_address (L3)
    // ... registered_precompile_is_invokable_via_registry (L5)
}
```

`Order` / `OrderId` / `AccountId` / `OrderType` / `Price` / `Qty` / `Side` のどれかが欠けていれば追加する。

ではテスト本体を追加する。配置場所のベストは、L5 の `read_best_bid_returns_zero_when_no_clob_installed` テストと `openhl_precompiles_registers_clob_address` テストの間：

```rust
    /// **Stage 9b end-to-end**: install a CLOB with a known bid, call the
    /// precompile, observe the live data flow through to the EVM-visible
    /// response. This is the moment custom EVM execution reads real
    /// orderbook state.
    #[test]
    fn read_best_bid_returns_live_state_when_clob_installed() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);

        let book = Arc::new(Mutex::new(Book::new()));
        // Rest a buy @ 250 with qty 7
        book.lock().unwrap().submit(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(7),
            order_type: OrderType::Limit { price: Price(250) },
        });
        // Rest another buy @ 240 (lower; shouldn't be picked as best bid)
        book.lock().unwrap().submit(Order {
            id: OrderId(2),
            account: AccountId(43),
            side: Side::Buy,
            qty: Qty(99),
            order_type: OrderType::Limit { price: Price(240) },
        });

        install_clob(book);

        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(250u64), "best bid is the 250 order, not 240");
        assert_eq!(qty, U256::from(7u64), "qty at the best level is 7");

        uninstall_clob();
    }
```

7 つの部品を順に見ていく。

### Step 1: ドキュメントコメント

```rust
    /// **Stage 9b end-to-end**: install a CLOB with a known bid, call the
    /// precompile, observe the live data flow through to the EVM-visible
    /// response. This is the moment custom EVM execution reads real
    /// orderbook state.
```

太字の「Stage 9b end-to-end」は意図的なフラグだ。マイルストーンテストを grep で探す人が、これを見つけられる。コードベースを読む将来のエンジニアには、「これは feature 全体の証明だ」と見えてほしい — 「ただの unit test」ではなく。

### Step 2: serializer を取得

```rust
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
```

L5 の 2 つのテストと同じパターン。**ここでは `uninstall_clob()` を呼ばない** — どうせ自分の CLOB を install するからだ。現在何が install されていようと、`install_clob` で原子的に置き換わる。serializer さえあれば十分。

### Step 3: Book を構築

```rust
        let book = Arc::new(Mutex::new(Book::new()));
```

`Arc::new(Mutex::new(Book::new()))` こそが `install_clob` の期待する形。Arc はこちらが 1 つ保持し、`install_clob` 後は global がもう 1 つ保持する形になる。

### Step 4: 2 つの bid を意図的に敵対的に rest

```rust
        // Rest a buy @ 250 with qty 7
        book.lock().unwrap().submit(Order {
            id: OrderId(1),
            account: AccountId(42),
            side: Side::Buy,
            qty: Qty(7),
            order_type: OrderType::Limit { price: Price(250) },
        });
        // Rest another buy @ 240 (lower; shouldn't be picked as best bid)
        book.lock().unwrap().submit(Order {
            id: OrderId(2),
            account: AccountId(43),
            side: Side::Buy,
            qty: Qty(99),
            order_type: OrderType::Limit { price: Price(240) },
        });
```

order は 1 つではなく 2 つ。2 つ目（`240, qty=99`）は **間違った実装をあぶり出す罠** だ：

- 「最大 qty の order を返す」素朴な実装は `(240, 99)` を返す。Fail。
- 「最初に submit された order を返す」素朴な実装は `(250, 7)` を返す。Pass する — ただし偶然。
- 「最後に submit された order を返す」素朴な実装は `(240, 99)` を返す。Fail。
- 「最高価格の price level の、合計 qty を返す」正しい実装は `(250, 7)` を返す。Pass。

`(250, 7)` の order 1 つだけなら、素朴な実装でもすべて pass してしまう。`(240, 99)` を加えることで、**正しさと偶然を切り分けられる**。**「Best は最高価格であって最大数量ではない」を証明するのに必要な最小の order 数は 2 つだ。**

> 🛑 **やりがちな勘違い。** 「Order ID と account ID を別々にする必要は? 使い回したほうが綺麗では?」 — **別の ID にしなければならない理由：`submit()` は `OrderId` をキーにインデックスする。** 2 つ目の order に `OrderId(1)` を使い回すと、submit が失敗するか、最初の order を黙って上書きする。ID を変えることが重要だ。account ID はこのテストでは飾りに近いが、現実のパターン（異なる trader、異なる order）を示唆している。

> 🛑 **やりがちな勘違い。** 「`book.lock().unwrap().submit(...)` を `let mut book = book.lock().unwrap();` と `submit` 2 回呼び出しに分けたほうが分かりやすいのでは?」 — **確かに分かりやすくなるし、ロックを 2 回ではなく 1 回しか取らない。** だがテストコードは「実行回数より読まれる回数のほうが多い」もの。各 `submit` を自己完結で明示的に保ちたい。**2 マイクロ秒のコストは目に見えないが、読みやすさの利得は大きい。** Hot path の production コードでは別のルール（1 回取得、1 回解放）が支配的になる。

### Step 5: Install + invoke

```rust
        install_clob(book);

        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
```

`install_clob(book)` のところで `book` を move していることに注目してほしい。**`Arc::clone(&book)` ではない** — install 後に `book` を使わないからだ。`install_clob(Arc::clone(&book))` と書いて `book` をその後使わないと、clippy が `unused_variable` を出す。move が正しい。

`read_best_bid(&[], 100_000, 0)` は直接呼び出すスタイル。registry 経由（`registered_precompile_is_invokable_via_registry` のように）でも呼べるが、registry のパスはすでに L5 で証明済みだ。**L6 の仕事は「live な CLOB が install されているとき、関数がそこから read することを証明する」こと。** 直接呼び出しのほうが、それをもっともクリーンに assert できる。

`&[]` の空 calldata にも意味がある：`read_best_bid` は input を無視する（「best bid は?」という問いにパラメータは不要）。100_000 gas は十分すぎる — `CLOB_BASE_GAS_COST = 500` であることは測定済み。

### Step 6: Decode + assert

```rust
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(250u64), "best bid is the 250 order, not 240");
        assert_eq!(qty, U256::from(7u64), "qty at the best level is 7");
```

`from_be_slice` デコーダは、L5 の Step 1 で使った `to_be_bytes` の逆だ。`out[24..32]` に 8 バイト書き込んでおき、デコーダ側は `result.bytes[0..32]` から 32 バイトを読む — 先頭 24 バイトはゼロ、続く 8 バイトが値、という形が同じ u64 にラウンドトリップしてくる。

assertion メッセージは **飾りではない**。素の `assert_eq!(price, U256::from(250u64))` だと、失敗時は `left != right` としか出ない — テストの意図は読み手に推測させる。「best bid is the 250 order, not 240」というメッセージなら、**どの概念的前提が違反されているかを即座に伝えられる**。**特にマイルストーンテストでは、assertion メッセージはドキュメントとしても機能する。**

### Step 7: Cleanup

```rust
        uninstall_clob();
    }
```

**このモジュール内で、末尾で明示的に uninstall するのはこのテストだけだ。** なぜか?

- L5 の 2 つの zero-output テストでは不要だった：開始時に `uninstall_clob()` を呼ぶので、どんな state が残っていても気にしないからだ。
- だがこのテストは、空でない CLOB を install したまま終わる。次のテストが同じ `cargo test` 実行内で（`TEST_SERIALIZER` の解放後に）「CLOB なし → zero」を assert する目的で走った場合、こちらが install した book を拾ってしまい fail する。

他のテストは **冒頭でも** `uninstall_clob` を呼んでいるので、技術的にはこの cleanup は冗長だ。**だが、空でない state を実際に install するテストで cleanup を明示しておくのは衛生的によい。** テストフレームワークの支援なしに、「Setup / Exercise / Verify / Teardown」というテスト規約をミラーリングしている。

## テスト

```bash
cargo test -p openhl-evm --release
```

30 秒ほどで：

```
running 43 tests
... 43 tests pass ...

test result: ok. 43 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

L5 より 1 多い。新規が `read_best_bid_returns_live_state_when_clob_installed`。それだけ見るには：

```bash
cargo test -p openhl-evm --release returns_live_state
```

出力：

```
running 1 test
test precompiles::tests::read_best_bid_returns_live_state_when_clob_installed ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 42 filtered out
```

**この `ok` 行が Module 2 のマイルストーンだ。** カスタム EVM precompile が live なマッチングエンジンの state から read し、そのデータが EVM から見える出力 bytes までラウンドトリップしている。

よくあるエラーと対処：

- **`assertion failed: left=240, right=250`** — `best_bid_with_qty()` の実装が間違った level を返している。原因はおそらく、`self.bids` を価格優先順ではなく挿入順で iterate していることだ。L4 の実装を確認する — bids の `BTreeMap` は `RevPrice`（逆順ソートされた price）でキー付けされているので、`.iter().next()` で最高価格が得られる。`.iter().next_back()` と書いてしまっていたり、別のデータ構造を使っていたりした場合は修正する。
- **`assertion failed: left=99, right=7`** — `best_bid_with_qty()` は正しい価格を返したが、qty が違う。おそらく原因は、best level だけでなく全価格レベルにわたって sum していることだ。L4 のコードを再確認する：`.map(|(rev_price, queue)| ...)` のクロージャの中では、**`queue.iter()` だけ**（その 1 つの価格レベル内の order）を sum すべきで、`self.bids.values().flatten()`（全価格・全 order）ではない。
- **`error[E0382]: borrow of moved value: 'book'`** — `install_clob(book)` の後で `book` を使い直そうとしている。後続の使用を削除するか（不要なら）、`install_clob(Arc::clone(&book))` にする（理由があるとき — このテストでは不要）。
- **`error[E0599]: no method named 'submit' found for...`** — `book.lock()` は `LockResult<MutexGuard<Book>>` を返すので、`book.lock().unwrap().submit(...)` の形にする必要がある。典型的な原因は `.unwrap()` 忘れ。
- **個別なら通るが、並列で落ちる** — `TEST_SERIALIZER` ロックが実際には保持されていない。`let _g = TEST_SERIALIZER.lock()...` が最初の文になっているかを確認する。

## 設計の振り返り

立ち止まりたいポイントが 4 つ：

1. **正しさを偶然から切り分けるための最小データ形は order 2 つ。** 敵対的テストデータ — 間違った実装をあぶり出すために特別に設計された order — は、ランダムな 50 個の order より価値がある。敵対的な値はそれぞれ 1 クラスのバグの対価を払う。

2. **「関数を直接呼ぶ」と「registry 経由で dispatch する」を分けるのは意図的なテスト分割。** L5 の `registered_precompile_is_invokable_via_registry` は、dispatch テーブル経由で関数に到達可能なことを証明する。L6 は、その関数が live な state を読むことを証明する。分けておくと、片方の失敗がもう片方を覆い隠さない。**dispatch + behavior + state を 1 つの assertion に束ねたテストは、失敗したときデバッグが格段に難しくなる。**

3. **assertion メッセージは将来のメンテナ宛のドキュメント。** 「best bid is the 250 order, not 240」というメッセージは、失敗を読んだ次のエンジニアに「どの概念的前提が破られたか」を正確に伝える。素の `assert_eq!(price, U256::from(250u64))` だと出力は `left=240 right=250` 止まり — 真ではあるが、テストの意図を読み解き直す必要がある。

4. **1 度に 1 つだけ変える。** L6 ではプロダクションコードの変更はゼロ。Module 2 (L4-L6) の全体の流れは「配管（挙動変化なし）→ 差し替え（挙動は変わるが新挙動のテストはなし）→ exercise（新挙動をテスト）」だ。各レッスンには *1 つだけ* 学ぶことと、*1 つだけ* 検証することがある。混ぜると — たとえば「差し替え + テスト」を 1 つのレッスンに詰めると — 途中で何かが壊れたときに、デバッグが遥かに難しくなる。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

L6 を終えた時点で、`precompiles/mod.rs` は Stage 9b と **バイト単位で同一** になるはず（自分でドキュメントコメントの言い回しを変えていない限り）。これが Stage 9b の終わり — `git diff b635ef7 -- crates/evm` は空になる。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: `Precompile::execute` 経由ではなく、`read_best_bid` を直接呼ぶのはなぜ?**
どちらのパスでも動く。直接呼ぶ（`read_best_bid(...)`）と関数を単独でテストすることになり、registry のパス（`precompile.execute(...)`）だと dispatch をテストする。**dispatch はすでに L5 の 3 つ目のテストで証明済み** だ。L6 で証明したいのは「挙動が global から read していること」なので、直接呼び出しでテストを 1 つの assertion に絞り込む。

**Q: `submit` が失敗したら（たとえば `OrderId` の重複）どうなる?**
`Book::submit`（course 7 由来）は `()` を返す — 失敗しない。内部的には、同じ OrderId で 2 回 submit すると 2 回目が黙って 1 回目を上書きする。**これはマッチングエンジンの仕様** だが、テストでは罠になる。`OrderId(1)` と `OrderId(2)` を意図的に使い分けるのはこのためだ。

**Q: このテストは Cancun / Prague / 将来の仮想的な fork でも動く?**
動く — `read_best_bid` は fork に関わらず同じ関数だ。precompile registry は fork ごとに *どの* precompile を有効にするかを選ぶ（L1/L2 で `openhl_precompiles_for(spec)` を hardfork ごとの `OnceLock` で追加した）が、CLOB の読み出し関数自体は fork に依存しない。

**Q: Solidity コントラクトからは、この同じ値はどう見える?**
```solidity
(uint256 price, uint256 qty) = abi.decode(
    staticcall(gas, 0x...0c1b, "", 64),
    (uint256, uint256)
);
```
こちらの Book を install して precompile を登録した状態なら、この staticcall は 64 bytes を返し、それが (250, 7) を encode している。Solidity の ABI decoder が 2 つの uint256 に組み直す。**コントラクトはテストと同じデータを、同じコードパス経由で見る。** これがカスタム precompile の存在意義そのものだ。

## Module 2 マイルストーン — あなたが作ったもの

今あるもの：
- アドレス `0x...0c1b` に登録されたカスタム EVM precompile。
- プロセスグローバルに共有された Arc ベースの CLOB state。
- live なマッチングエンジンの best bid を read し、ABI の uint256 pair として encode する precompile。
- 証明済みのテスト：(a) precompile が registry から到達可能、(b) CLOB 未インストール時には zero を read、(c) CLOB インストール時には live な state を read。

スマートコントラクトから直接 CLOB state をクエリできるようになった。Course 7 L12 で残っていた「約定が並行リストにあるだけで、スマートコントラクトからは見えない」というギャップが、**read 方向については** 部分的に閉じた。Write 側（コントラクトから order を発注する）は Module 3 の領分。

## 次のレッスン（L7）

L7 で Module 3（Write precompile）が始まる。L2 と対になる形だ：新しい precompile アドレス（`CLOB_PLACE_ORDER` は `0x...0c1c`）、order パラメータの Solidity calldata の decode、ハードコードのプレースホルダー本体。教育上の焦点は、出力 encoding から **入力** の decode へとシフトする — 可変長 calldata、構造体の unpack、不正入力のエラーハンドリングなど。
````

---

## Seed-file slot

L6 は Module 2 (Read precompile) の sortOrder 2 に入る：

```typescript
{
  title: 'レッスン 6 — Module 2 マイルストーン — ラウンドトリップを証明する',
  slug: 'openhl-precompiles-live-state-proof-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 6 — Module 2 マイルストーン — ラウンドトリップを証明する\n\n...`
},
```

## SHA pinning discipline

L6 は `b635ef7`（Stage 9b）を引用。L6 終了時点で `crates/evm/src/precompiles/mod.rs` は Stage 9b と**バイト同一** — `git diff` は空。Module 2 出荷。

## Style review notes (self-critique before paste)

- **§ゴールでマイルストーンを明示的にフレーミング** — 「Module 2 完了」で読者に「これは*閉じる*レッスン、*構築する*レッスンではない」と伝わる。
- **§プランの「L6 は純粋なテスト追加」** が「あれ、新しい挙動なし？」反応を先回り。挙動は L5 で追加、L6 はその証明。
- **§考えてみよう（250, 7 vs 240, 99）** が敵対的テストデータ設計を正当化 — トラップ order が要点全部。
- **§Step 4「正しさを偶然から分離する最小値」** がテスト可能設計の教訓。
- **§Step 5 の move vs Arc::clone(&book)** が不要 clone トラップを先回り。
- **§Step 6 のアサーションメッセージ = ドキュメンテーション** はマイルストーンテスト一般に再利用可能なアドバイス。
- **§設計の振り返り 4「1 度に 1 つ」** が L4/L5/L6 分割を pedagogical な選択として振り返る。
- **§Module 2 マイルストーンまとめ** で読者が築いたものを列挙 — お祝いの瞬間。
- **L7 プレビュー** が Module 3 = 同パターン逆方向（writes vs reads）を示す。
