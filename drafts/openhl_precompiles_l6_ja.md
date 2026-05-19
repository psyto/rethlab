# Building OpenHL Precompiles — L6 draft (JA) — build-along

> openhl SHA `b635ef7`（Stage 9b — CLOB read precompile に live CLOB state を配線）に対するドラフト。
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

このレッスンが終わると：

```bash
cargo test -p openhl-evm --release
```

…が 43 tests を通る（1 新規）。新規テストは `read_best_bid_returns_live_state_when_clob_installed`。これまで全テストが寸前で止まっていたことをやる：**既知の bid を持つ CLOB を install、precompile を呼ぶ、precompile の出力 bytes がその bid の price と qty を encode していることを観測する。**

これがマイルストーン。フルチェーン — `CLOB に bid 発注 → bridge が Mutex 経由で書き込み → precompile が global 経由で read → 64-byte ABI encode → 呼び出し元に返す` — がついに end-to-end で exercise される。L6 後：

- Module 2 (Read precompile) **完了**：`STATICCALL(0x...0c1b)` を発行する Solidity コントラクトは live CLOB state を受け取る。
- パターン（precompile が global Arc から read する）が証明済み — 将来 stage で追加 read precompile（best_ask、depth、mid-price 等）に複製できる。
- Module 3 (Write precompile、L7-L9) は同じインフラの上に逆方向で構築：precompile が CLOB state に**書く**。

## おさらい

L5 終了時点：

- `read_best_bid` が `current_best_bid()` を呼ぶ（live パス）。
- L3 の 2 テストが**未インストール**セマンティクスを assert — CLOB なしで zero output。
- `TEST_SERIALIZER` 配置済み。
- **だが、空でない CLOB を install して値がラウンドトリップで流れるのを観測するテストが 1 つもない。** 配線は通ったが計測されていない。

L6 で配線を計測する。

## プラン

`crates/evm/src/precompiles/mod.rs` の `#[cfg(test)] mod tests` ブロック内に 1 つの編集：新しい test 関数を追加。

以上。プロダクションコードは無変更。**L6 は純粋なテスト追加** — そしてコース中最も重要なテスト。

テストの構造：

1. **Setup** — `TEST_SERIALIZER` を取得。（最初に `uninstall_clob()` は呼ばない。すぐ自分の CLOB を install するため。）
2. **Book を構築** — `Arc::new(Mutex::new(Book::new()))`。
3. **2 つの bid を rest** — 1 つは price 250 qty 7（best になる）、1 つは price 240 qty 99（価格が低いので qty が大きくても**選ばれてはいけない**）。
4. **CLOB を install** — `install_clob(book)`。
5. **precompile を直接呼ぶ** — `read_best_bid(&[], 100_000, 0)`。
6. **Decode + assert** — price=250 (not 240)、qty=7 (not 99 — wrong level での大きな qty が罠)。
7. **Cleanup** — `uninstall_clob()` を末尾で呼ぶ（明快さのため、安全のためではない）。

> 🛑 **考えてみよう。** スクロール前に — 2 つの bid を持つ Book を install する。`(price=250, qty=7)` と `(price=240, qty=99)`。**`read_best_bid` は何を返す？** 正しく答えられたらマッチングエンジンの「最良価格優先」不変条件を掴んでいる。間違えたらテストがあなたの誤解を捕まえる。

（答え：`price=250, qty=7`。**「Best bid」 = 最高価格、最大数量ではない。** qty=99 の order はより悪い価格 (240) に置かれており、best-bid response の候補にすら入らない。これはクラシックな order-book 不変条件：価格レベル内では price-time priority、レベル間では price priority。初心者は「best = most liquidity」と思いがち — それは間違い。**Best bid とは market sell が最初に当たる先。** Market sell は 250-bid に最初に当たる — 最高価格を提示するから。250 レベルを使い切ってから 240 に下りる。）

## 手順

`crates/evm/src/precompiles/mod.rs` を開く。既存の `#[cfg(test)] mod tests` ブロックを探す。

テストモジュール先頭の imports に `Order, OrderId, AccountId, OrderType, Price, Qty, Side` が含まれていることを確認（L5 を通してまさにこのレッスンのために残しておいた）：

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

もし `Order` / `OrderId` / `AccountId` / `OrderType` / `Price` / `Qty` / `Side` のどれかが欠けていたら追加。

ではこのテストを追加。場所のベスト：L5 の `read_best_bid_returns_zero_when_no_clob_installed` テストと `openhl_precompiles_registers_clob_address` テストの間：

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

7 つの部品を歩いていく。

### Step 1: ドキュメントコメント

```rust
    /// **Stage 9b end-to-end**: install a CLOB with a known bid, call the
    /// precompile, observe the live data flow through to the EVM-visible
    /// response. This is the moment custom EVM execution reads real
    /// orderbook state.
```

太字の「Stage 9b end-to-end」は意図的なフラグ。マイルストーンテストを grep で探す人がこれを見つける。コードベースを読む将来のエンジニアには「これは feature 全体の証明」が見えるべき — 「ただの unit test」ではなく。

### Step 2: serializer を取得

```rust
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
```

L5 の 2 テストと同じパターン。**ここでは `uninstall_clob()` を呼ばない** — どうせ自分の CLOB を install する。何が現在 install されていようと `install_clob` で原子的に置き換わる。Serializer だけで十分。

### Step 3: Book を構築

```rust
        let book = Arc::new(Mutex::new(Book::new()));
```

`Arc::new(Mutex::new(Book::new()))` がまさに `install_clob` が期待する形。我々が 1 Arc 保持、`install_clob` 後は global がもう 1 つ持つ。

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

1 つでなく 2 つの order。2 つ目（`240, qty=99`）は**間違った実装に対する罠**：

- 「最大 qty の order を返す」素朴な実装は `(240, 99)` を返す。Fail。
- 「最初に submit された order を返す」素朴な実装は `(250, 7)` を返す。Pass — ただし偶然。
- 「最後に submit された order を返す」素朴な実装は `(240, 99)` を返す。Fail。
- 「最高価格の price level、その level の合計 qty を返す」正しい実装は `(250, 7)` を返す。Pass。

`(250, 7)` の order だけなら、すべての素朴な実装が pass する。`(240, 99)` の order が**正しさを偶然から分離**する。**「Best = 最高価格、最大数量ではない」を証明する最小の order 数は 2 つ。**

> 🛑 **やりがちな勘違い。** 「Order ID と account ID が違うのはなぜ？ 再利用したほうがクリーンじゃない？」 **違わねばならない理由：`submit()` は `OrderId` でインデックスする。** 2 つ目の order に `OrderId(1)` を再利用すると失敗するか、最初を黙って上書きする。Different ID は重要。Account ID はこのテストでは cosmetic だが、実世界パターン（異なる trader、異なる order）を示唆している。

> 🛑 **やりがちな勘違い。** 「`book.lock().unwrap().submit(...)` を `let mut book = book.lock().unwrap();` + `submit` 2 回呼び出しに分けたほうが明快じゃ？」 **そうなる、そしてロックを 2 回でなく 1 回取得する。** だがテストコードは run より read される回数が多い。各 `submit` を自己完結 + 明白に保ちたい。**2 マイクロ秒のコストは見えない。読みやすさの利得は大きい。** Hot-path のプロダクションコードでは違うルール（1 回取得、1 回解放）。

### Step 5: Install + invoke

```rust
        install_clob(book);

        let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
```

`install_clob(book)` — `book` をムーブしていることに注目。**`Arc::clone(&book)` ではない** — install 後 `book` を使わないから。`install_clob(Arc::clone(&book))` と書いて `book` を以後使わないと clippy が `unused_variable` を出す。Move が正しい。

`read_best_bid(&[], 100_000, 0)` — 直接 unit-style 呼び出し。Registry 経由（`registered_precompile_is_invokable_via_registry` のように）でも呼べるが、registry path は L5 で証明済み。**L6 の仕事は「live CLOB が install されたときに関数がそこから read することを証明する」。** 直接呼び出しがそれを最もクリーンに assert する。

`&[]` 空 calldata は意味がある：`read_best_bid` は input を無視する（「best bid は？」にパラメータは不要）。100_000 gas は十分以上 — `CLOB_BASE_GAS_COST = 500` を測定済み。

### Step 6: Decode + assert

```rust
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(250u64), "best bid is the 250 order, not 240");
        assert_eq!(qty, U256::from(7u64), "qty at the best level is 7");
```

`from_be_slice` デコーダは L5 Step 1 の `to_be_bytes` の逆。`out[24..32]` に 8 bytes 書き、デコーダは `result.bytes[0..32]` から 32 bytes 読む — 先頭 24 zero bytes + 8 value bytes が同じ u64 にラウンドトリップする。

アサーションメッセージは**装飾ではない**。素の `assert_eq!(price, U256::from(250u64))` の failure は `left != right` と報告 — テストの意図は読者に推測させる。「best bid is the 250 order, not 240」というメッセージは**即座に**どの概念的前提が間違っているかを伝える。**マイルストーンテスト特には、アサーションメッセージはドキュメンテーションとしても機能する。**

### Step 7: Cleanup

```rust
        uninstall_clob();
    }
```

**モジュール中で末尾で明示的に uninstall するのはこのテストだけ。** なぜこれだけ？

- L5 の 2 つの zero-output テストは不要：開始時に `uninstall_clob()` を呼ぶので、何の state を残すかを気にしない。
- このテストは空でない CLOB を install したまま終わる。次のテスト（同じ `cargo test` 実行内、`TEST_SERIALIZER` 解放後）が「CLOB なし → zero」を assert する目的で走ったら、我々の install した book を見て fail する。

他のテストは**先頭でも** `uninstall_clob` を呼ぶので、技術的にはこの cleanup は冗長。**だが空でない state を実際に install するテストで cleanup を明示するのは衛生的に良い。** Test framework の支援なしで「Setup / Exercise / Verify / Teardown」テスト規約をミラーリング。

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

**この `ok` 行が Module 2 のマイルストーン。** カスタム EVM precompile が live マッチングエンジン state から read し、データが EVM-visible 出力 bytes にラウンドトリップしている。

よくあるエラーと対処：

- **`assertion failed: left=240, right=250`** — `best_bid_with_qty()` 実装が間違った level を返している。原因は十中八九、`self.bids` を価格優先順序ではなく挿入順序で iterate している。L4 の実装を確認 — bids `BTreeMap` は `RevPrice`（reverse-sorted price）でキー付けされているので `.iter().next()` で最高価格が得られる。`.iter().next_back()` を書いた、もしくは別のデータ構造を使った場合は修正。
- **`assertion failed: left=99, right=7`** — `best_bid_with_qty()` が正しい価格を返したが qty が違う。原因は十中八九、best level だけでなく全価格レベルにわたって sum している。L4 コードを再確認：`.map(|(rev_price, queue)| ...)` 内のクロージャは**`queue.iter()` のみ**（その 1 つの価格レベルの order）を sum すべき — `self.bids.values().flatten()`（全 order 全所）ではない。
- **`error[E0382]: borrow of moved value: 'book'`** — `install_clob(book)` の後 `book` を再使用しようとした。後の使用を消すか（不要）、`install_clob(Arc::clone(&book))` にする（理由があれば — このテストでは不要）。
- **`error[E0599]: no method named 'submit' found for...`** — `book.lock()` は `LockResult<MutexGuard<Book>>` を返すので `book.lock().unwrap().submit(...)` が必要。`.unwrap()` 抜けが典型原因。
- **個別なら通る、並列で落ちる** — `TEST_SERIALIZER` ロックが実際には保持されていない。`let _g = TEST_SERIALIZER.lock()...` が最初の文か確認。

## 設計の振り返り

4 つの一時停止ポイント：

1. **正しさを偶然から分離する最小データ形は 2 つの order。** 敵対的テストデータ — 間違った実装を露出させるために特別に設計された order — は 50 のランダム order より価値がある。各敵対的値は 1 クラスのバグの対価を支払う。

2. **直接関数呼び出し vs registry dispatch は意図的なテスト分割。** L5 の `registered_precompile_is_invokable_via_registry` は dispatch table 経由で関数が到達可能であることを証明。L6 は関数が live state を read することを証明。分割することで、片方の failure が他方を mask しない。**dispatch + behavior + state を 1 つのアサーションに束ねたテストは failure 時にデバッグが難しい。**

3. **アサーションメッセージは将来のメンテナへのドキュメンテーション。** 「best bid is the 250 order, not 240」は failure を読む次のエンジニアにどの概念的前提が違反されているかを正確に伝える。素の `assert_eq!(price, U256::from(250u64))` は `left=240 right=250` と言う — 真ではあるが、テストの意図を再構築する必要がある。

4. **1 度に 1 つ。** L6 はプロダクションコード変更ゼロ。Module 2 (L4-L6) フルプログレッションは：plumbing（挙動変化なし）→ swap（挙動変化、新挙動のテストなし）→ exercise（新挙動をテスト）。各レッスンに*1 つ*学ぶこと、*1 つ*検証することがある。混ぜれば — 例：swap + テストを同じレッスンで — 中間ステージで何かが必然的に壊れたときデバッグが遥かに難しくなる。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

L6 終了時点で `precompiles/mod.rs` は Stage 9b と**バイト同一**（自分でドキュメントコメントの言い回しを変えていない限り）。これが Stage 9b の終わり — `git diff b635ef7 -- crates/evm` は空。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: なぜ `Precompile::execute` 経由でなく `read_best_bid` を直接呼ぶ？**
両パス動く。直接呼び出し（`read_best_bid(...)`）は関数を isolation でテスト。Registry path（`precompile.execute(...)`）は dispatch をテスト。**L5 の 3 つ目テストが dispatch を既に証明している**。L6 では挙動が global から read することを証明したい。直接 path がテストを 1 つの assertion に絞り込む。

**Q: `submit` が失敗したら（例：duplicate `OrderId`）？**
`Book::submit`（course 7 から）は `()` を返す — 失敗しない。内部的には同じ OrderId を 2 回 submit すると 2 つ目が黙って最初を上書き。**これはマッチングエンジンの設計**だがテストでは罠。我々が `OrderId(1)` / `OrderId(2)` を意図的に使う理由。

**Q: このテストは Cancun / Prague / 仮想的な未来 fork でも動く？**
動く — `read_best_bid` は fork に関わらず同じ関数。Precompile registry は fork ごとに*どの* precompile が有効かを選ぶ（L1/L2 で `openhl_precompiles_for(spec)` を hardfork ごとの `OnceLock` で追加）、しかし CLOB 読み出し関数自体は fork agnostic。

**Q: Solidity コントラクトはこの同じ値をどう見る？**
```solidity
(uint256 price, uint256 qty) = abi.decode(
    staticcall(gas, 0x...0c1b, "", 64),
    (uint256, uint256)
);
```
我々の Book を install して precompile を register した状態で、その staticcall は 64 bytes を返し (250, 7) を encode する。Solidity ABI decoder が 2 つの uint256 に再結合。**コントラクトはテストと同じデータを、同じコードパスで見る。** これがカスタム precompile の存在意義そのもの。

## Module 2 マイルストーン — あなたが作ったもの

今あるもの：
- アドレス `0x...0c1b` に登録されたカスタム EVM precompile。
- プロセスグローバルな Arc 共有 CLOB state。
- live マッチングエンジンの best bid を read し ABI uint256 pair として encode する precompile。
- 証明済みテスト：(a) precompile が registry から到達可能、(b) CLOB 未インストール時は zero を read、(c) CLOB インストール時は live state を read。

スマートコントラクトが直接 CLOB state をクエリできるようになりました。Course 7 L12 の「fills が並行リスト、smart contracts に見えない」のギャップが**read 方向**で部分的に閉じた。Writes（コントラクトから order を発注）は Module 3。

## 次のレッスン（L7）

L7 で Module 3（Write precompile）開始。L2 をミラー：新しい precompile アドレス（`CLOB_PLACE_ORDER` を `0x...0c1c`）、order パラメータの Solidity calldata デコード、ハードコードプレースホルダー本体。教育の焦点は出力 encoding から**入力**デコードへシフト — 可変長 calldata、構造体 unpacking、不正入力のエラーハンドリング。
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
