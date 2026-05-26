# Building OpenHL Precompiles — L5 draft (JA) — build-along

> openhl SHA `b635ef7`（Stage 9b — CLOB read precompile に live CLOB state を接続）に対するドラフト。
> コース: `building-openhl-precompiles-ja`（track: `reth-l1-architect`）。

---

## L5 — `openhl-precompiles-swap-to-live-ja`

- **Module:** 2 (Read precompile), sortOrder 1 within module
- **Course-level sortOrder:** 4 (lesson 5 of 12)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# レッスン 5 — `read_best_bid` がライブ状態を読む — `current_best_bid()` に差し替え

## ゴール

このレッスンで掴む概念:

- **未インストール時に zero を返す = 「未初期化な storage slot」のセマンティクス。** Solidity コントラクトは `STATICCALL` の zero を「liquidity なし」と自然に解釈し、trade を控える。error にすると boot 中のすべての transaction が revert する。
- **constant-time な precompile = gas 課金で state を漏らさない。** CLOB が未インストールのときだけ gas 課金を減らすと、attacker が gas を測って validator の state を推測できる。`CLOB_BASE_GAS_COST` を一定に保ち、precompile の振る舞いの見え方を一様にする。
- **`cargo test` は並列実行 → プロセスグローバルで競合 → serializer が必要。** `CLOB_STATE` を触るテストが 2 個になった瞬間、並列実行下で global が `Some(clob_A)` と `None` の間を flap する。`Mutex<()>` を `TEST_SERIALIZER` として置くのが解決策。
- **`TEST_SERIALIZER` は crate ではなくモジュールごと。** 直列化のスコープは、実際に必要なテストだけに狭める。`CLOB_STATE` を触らないテストにコストを払わせない。
- **uninstall はテストの *先頭*、終わりではない。** panic したテストは cleanup を走らせない。次のテストの先頭で reset するのが safety net になる。テスト末尾の uninstall は飾り。

検証：

```bash
cargo test -p openhl-evm --release
```

上記の実行結果が引き続き通る（42 tests）。

具体的な変更：

ただし内部では、precompile が **live state を読む** ようになっている — ハードコード値ではなく：

- **`read_best_bid` の本体を差し替える** — `let mut out = vec![0, 0, ..., 100, 0, 0, ..., 10]` のハードコードを捨て、`if let Some((price, qty)) = current_best_bid() { ... out に書き込む ... }` に変える。CLOB 未インストールなら 64-byte の zero を返す（「未初期化 perp market」のセマンティクスに合わせる）。
- **L3 の `read_best_bid_returns_hardcoded_price_and_qty` テストを rename** して `read_best_bid_returns_zero_when_no_clob_installed` に。形は同じだが、100/10 ではなく zero を assert する。
- **L3 の `registered_precompile_is_invokable_via_registry` を更新** — ロジックは同じだが、まず CLOB を uninstall してから zero output を期待する形にする。
- **テストモジュールの先頭に `static TEST_SERIALIZER: Mutex<()>` を新規追加** — `CLOB_STATE` を触るテストは、まずこのロックを取る。並列 `cargo test` だと global で競合するからだ。

course 7 と L3 の callability テストは引き続き通る。assertion だけが変わる。**大きな証明 — 「live な CLOB データが EVM の出力までラウンドトリップする」 — は L6 の仕事。** L5 は差し替えにとどめ、L6 で end-to-end の挙動を実証する。

## おさらい

L4 終了時点の状態：

- `Book` に `best_bid_with_qty` / `best_ask_with_qty` を追加済み。
- `precompiles/mod.rs` に `CLOB_STATE` static とモジュール関数 3 つがある。
- `LiveRethEvmBridge::new` が `install_clob(Arc::clone(&clob))` を呼ぶ。
- **にもかかわらず `read_best_bid` はまだハードコードの `(100, 10)` を返している** — 配管は誰も使っていない。

L5 でようやくその配管を使う。

## プラン

`crates/evm/src/precompiles/mod.rs` に対する編集が 4 つ：

1. **`read_best_bid` の本体を差し替え** — `current_best_bid()` を呼び、`Some` のときだけ非ゼロのバイトを書き込む。
2. **関数のドキュメントコメントを更新** — ハードコード前提の記述を消し、「bid なし、または CLOB 未インストールなら 0」というセマンティクスに置き換える。
3. **テストモジュールに `static TEST_SERIALIZER: Mutex<()>` を追加する。**
4. **L3 の最初のテストを rename + 書き換え** し、**L3 の最後のテストを更新** する — どちらも `CLOB_STATE` を触るので、両方とも serializer ロックを取り、まず `uninstall_clob()` を呼ぶようにする。

モジュールレベルのシグネチャは変わらない。registry テスト（`openhl_precompiles_registers_clob_address`）は `CLOB_STATE` を触らないので、そのままにしておく。

> 🛑 **考えてみよう。** スクロールする前に — `cargo test` はデフォルトで **並列実行** される（典型的には論理 CPU 1 つにつき 1 スレッド）。今あるテストのうち 2 つが `CLOB_STATE` を read/write する。**直列化しなかった場合、どんな失敗モードが出るか?** ヒント：あるテストが `None` を期待している瞬間に、`Some(clob_A)` が一瞬だけ見えてしまう、という状況を想像してみる。

（答え：**flaky test になる**。テスト A が CLOB を install し、テスト B が「CLOB なし → zero output」を assert したい — だが B が、A の `install_clob` と `uninstall_clob` の間に走ってしまえば、B は A の CLOB を見て間違った値を assert する。失敗率はテストのスケジューリング次第で、0% のこともあれば 30% のこともある。CI がランダムに flake する。`TEST_SERIALIZER` の mutex パターンは、これらのテストを 1 つずつ走らせて race を排除する。**コストは 0.0 秒（これらのテストはマイクロ秒で終わる）、利得は deterministic な CI。**）

## 手順

### Step 1: `read_best_bid` 本体を差し替え

`crates/evm/src/precompiles/mod.rs` を開く。現在の L2/L3 の本体を探す：

```rust
#[allow(clippy::unnecessary_wraps)]
fn read_best_bid(_input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    // Hardcoded: price=100, qty=10, both as big-endian u256 (32 bytes each).
    let mut out = vec![0u8; 64];
    out[31] = 100;  // price (last byte of first 32-byte word)
    out[63] = 10;   // qty   (last byte of second 32-byte word)
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
```

これに置き換え：

```rust
#[allow(clippy::unnecessary_wraps)]
fn read_best_bid(_input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    let mut out = vec![0u8; 64];

    if let Some((price, qty)) = current_best_bid() {
        // Big-endian u256: rightmost bytes carry the value.
        out[24..32].copy_from_slice(&price.0.to_be_bytes());
        out[56..64].copy_from_slice(&qty.0.to_be_bytes());
    }
    // If no CLOB is installed or there are no bids, `out` stays all zeros —
    // matches what an uninitialised perp market would return on mainnet.

    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
```

変化は次のとおり：

- **`let mut out = vec![0u8; 64]`** — 出発点は同じく全ゼロ。
- **`if let Some((price, qty)) = current_best_bid()`** — global を read する。`None` ならボディを short-circuit し、`out` は zero のままにする。
- **`out[24..32].copy_from_slice(&price.0.to_be_bytes())`** — `Price` は `u64` のラップ型。`to_be_bytes()` は `[u8; 8]` を返す。その 8 バイトを 32-byte word の **最後の 8 バイト**（position 24..32）にコピーする。先頭 24 バイトはゼロ — これが u64 値の big-endian u256 エンコーディング。
- **qty も同様に `out[56..64]` へ** — 2 つ目の 32-byte word の最後の 8 バイト。
- **ハードコードの `out[31] = 100` と `out[63] = 10` は消える。**

なぜ `out[24..32]` という「マジックナンバー」が正しいのかを、64 バイト buffer 全体のメモリレイアウトで見ると一目で押さえられる:

```
                       ┌──── 第 1 スロット: price (u256 BE, 32 byte) ────┐ ┌──── 第 2 スロット: qty (u256 BE, 32 byte) ────┐
   byte index:          0    ...    23   24    25    ...    30    31     32    ...    55   56    57    ...    62    63
                       ┌────────────┬────┬────┬─────────────┬────┬────┐  ┌────────────┬────┬────┬─────────────┬────┬────┐
   memory:             │ 00 ... 00  │ p7 │ p6 │ ........... │ p1 │ p0 │  │ 00 ... 00  │ q7 │ q6 │ ........... │ q1 │ q0 │
                       └────────────┴────┴────┴─────────────┴────┴────┘  └────────────┴────┴────┴─────────────┴────┴────┘
                        ↑           ↑                            ↑       ↑           ↑                            ↑
                        │           │                            │       │           │                            │
                       高位 24 byte  └─── price.0.to_be_bytes() ───┘    高位 24 byte  └─── qty.0.to_be_bytes() ─────┘
                       (zero pad)            [u8; 8] が ぴったり収まる    (zero pad)            [u8; 8] が ぴったり収まる
                                             ┃                                                  ┃
                                             ▼                                                  ▼
                                    out[24..32] (8 byte の slice)                       out[56..64] (8 byte の slice)
                                    .copy_from_slice(&price.0.to_be_bytes())            .copy_from_slice(&qty.0.to_be_bytes())


   数で押さえると:
     ・slot 1 全体は byte 0..32 の 32 byte (= u256 BE 1 個分)
     ・上位 24 byte (0..24) は zero pad のまま (vec![0u8; 64] で既に確保済み)
     ・下位 8 byte (24..32) に u64 を big-endian で直接書き込む → slot 全体が「u64 を u256 に zero-extend したもの」になる
     ・slot 2 も同じ構造を 32 byte 平行移動 (byte index に +32)

   結論: 24..32 と 56..64 は「u64 (8 byte) が u256 (32 byte) の右端に滑り込む位置」。
        マジックではなく、(32 − 8 = 24) と (64 − 8 = 56) という算数の結果にすぎない。
```

ここで効いているのは「**u64 BE bytes → u256 BE word の右端 8 byte に直接コピー、中間で `[u8; 32]` を確保しない**」というホットパス最適化だ。`U256::from(price.0).to_be_bytes::<32>().copy_from_slice(...)` のように 32 byte の一時配列を経由するルートは結果こそ同じだが、(a) スタック上に余分な 32 byte の zero-init、(b) その配列から output への 32 byte memcpy、の二重コストが乗る。直接書き込みなら 8 byte memcpy のみ — しかも上位 zero pad は `vec![0u8; 64]` の初期化時点で既に確保済みなので、追加コスト 0 で zero-extend が成立している。

> 🛑 **やりがちな勘違い。** 「明快さのために `U256::from(price.0).to_be_bytes::<32>().copy_from_slice(...)` でいいのでは?」 — それだと **一時的な `[u8; 32]` を allocate してから byte-by-byte でコピー** する。直接 `out[24..32].copy_from_slice(&price.0.to_be_bytes())` と書けば、output buffer に直接書き込んで中間 allocation を挟まない。**結果は同じだが、仕事は半分。** precompile は hot path で、マイクロ秒の積み重ねが効いてくる。

### Step 2: ドキュメントコメントを更新

L2 のドキュメントコメントはハードコード中心：

```rust
/// Returns hardcoded best-bid data as two big-endian u256s (64 bytes total).
/// Stage 9a's purpose is to prove the precompile is reachable from EVM execution;
/// Stage 9b will swap in live CLOB state.
///
/// Encoding:
///   bytes  0..32  big-endian u256 = 100 (price)
///   bytes 32..64  big-endian u256 = 10  (qty)
```

live state 版に置き換え：

```rust
/// Reads the best bid (highest-priced buy order's price + total qty at that
/// level) from the currently-installed CLOB and returns it as two
/// big-endian u256s (64 bytes total).
///
/// Encoding:
///   bytes  0..32  big-endian u256 price (0 if no bid or no CLOB installed)
///   bytes 32..64  big-endian u256 qty   (0 if no bid or no CLOB installed)
///
/// `PrecompileFn` signature is `fn(&[u8], u64, u64) -> PrecompileResult`;
/// the third arg is a `reservoir` value (extra gas budget) that we ignore
/// at v0. The Result wrapper is required by the signature even though we
/// never error — gas accounting is the EVM's responsibility.
```

「0 if no bid or no CLOB installed」が肝 — メインネットのコントラクトが対応しなければならない API 契約を明文化している。**スマートコントラクトからは「未インストール」と「empty book」を見分けられない** — どちらも zero を返す。これは意図的だ。区別したい場合は、別の経路で liveness をチェックすればよい。

### Step 3: テストモジュールに `TEST_SERIALIZER` を追加

`#[cfg(test)] mod tests` ブロック（L3 で追加した）を開く。`use` 文の後、テスト関数の前に：

```rust
/// Tests in this module touch process-global `CLOB_STATE`. This mutex
/// serializes them so parallel test execution can't observe a torn state.
static TEST_SERIALIZER: Mutex<()> = Mutex::new(());
```

1 行で済む。素の `Mutex<()>` だ（payload は unit 型 — 中身の値は見ず、ロックだけが目的）。`CLOB_STATE` を触る各テストは、冒頭で次のように書く：

```rust
let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
```

`unwrap_or_else(PoisonError::into_inner)` パターンが **死活問題** だ — これがないと、テストが 1 つ panic しただけで mutex が poison し、以降の全テストが `PoisonError` で落ちる。poison から復旧することで「このテストは 1 度 panic した」を「このテストは 1 度 panic したが、後続は走る」に変える。復旧したガードもちゃんと排他アクセスを与えてくれる。poison はシグナルであって、永久の障害ではない。なお、コンパイラの型推論が詰まる環境では `unwrap_or_else(std::sync::PoisonError::into_inner)` より、`unwrap_or_else(|e| e.into_inner())` の明示クロージャ形のほうが安定する。

> 🛑 **やりがちな勘違い。** 「`serial_test` crate の `#[serial]` でいいのでは?」 — **使えるが、mutex 1 つで済む話に対して dev-dep を増やす。** `serial_test` は proc-macro、属性のパース、hash-keyed な lock map に手を出す。global を 1 つ触るテスト 4 つに対しては、1 行の `static Mutex<()>` がちょうどよい。**複数の global を別々のロック partition で管理したくなったら crate を導入すればよい — それ以前にやる必要はない。**

### Step 4: L3 最初のテストを更新（rename + 書き換え）

L3 ではこうだった：

```rust
/// Direct unit test — the function should produce the L2 hardcoded
/// values. This is the lowest-level check before integrating into the registry.
#[test]
fn read_best_bid_returns_hardcoded_price_and_qty() {
    let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
    assert_eq!(result.bytes.len(), 64);
    let price = U256::from_be_slice(&result.bytes[0..32]);
    let qty = U256::from_be_slice(&result.bytes[32..64]);
    assert_eq!(price, U256::from(100u64));
    assert_eq!(qty, U256::from(10u64));
    assert_eq!(result.gas_used, CLOB_BASE_GAS_COST);
}
```

これに置き換え：

```rust
/// With no CLOB installed, the precompile returns 64 zero bytes —
/// matching what an uninitialised perp market would report on mainnet.
#[test]
fn read_best_bid_returns_zero_when_no_clob_installed() {
    let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
    uninstall_clob();

    let result = read_best_bid(&[], 100_000, 0).expect("precompile must not error");
    assert_eq!(result.bytes.len(), 64);
    let price = U256::from_be_slice(&result.bytes[0..32]);
    let qty = U256::from_be_slice(&result.bytes[32..64]);
    assert_eq!(price, U256::ZERO);
    assert_eq!(qty, U256::ZERO);
    assert_eq!(result.gas_used, CLOB_BASE_GAS_COST);
}
```

L3 との差分は 5 つ：

1. **Rename** — 関数名が新しいセマンティクスを表すように変える。
2. **doc コメントの書き換え** — 「uninstalled = zero」のセマンティクスを説明する。
3. **1 行目で `TEST_SERIALIZER` を取得する。**
4. **2 行目で `uninstall_clob()` を呼ぶ。** なぜか? 前のテストが CLOB を install したまま clean up し忘れている、あるいは前回の test run の state が残っている、という可能性があるからだ。`uninstall_clob()` は idempotent なので常に呼んで安全で、既知の出発状態を保証してくれる。
5. **assertion の変更** — `U256::from(100u64)` / `U256::from(10u64)` ではなく `U256::ZERO`。gas check はそのまま（何を返そうと precompile は同じ gas を課金する）。

> 🛑 **やりがちな勘違い。** 「すでに未インストールなら、毎回 `uninstall_clob()` を呼ぶのは無駄なのでは?」 — **`uninstall_clob` の実体は `*CLOB_STATE.write().expect(...) = None`** だ。lock を 1 回取って戻すだけ、マイクロ秒の話だ。代替案は、初期化順を共有する global な「test setup」関数を作ること — 労力ばかり大きく、節約はわずかだ。**global state を扱うときの Rust テストの定石は「test ごとに明示的にリセットする」こと。**

### Step 5: L3 最後のテストを更新

L3 の `registered_precompile_is_invokable_via_registry`：

```rust
#[test]
fn registered_precompile_is_invokable_via_registry() {
    let extended = openhl_precompiles(Precompiles::cancun());
    let precompile = extended
        .get(&CLOB_READ_BEST_BID)
        .expect("CLOB precompile must be registered");

    let result = precompile
        .execute(&[], 100_000, 0)
        .expect("call must not error");
    assert_eq!(result.bytes.len(), 64);
    let price = U256::from_be_slice(&result.bytes[0..32]);
    assert_eq!(price, U256::from(100u64));  // L3 hardcoded expectation
}
```

これに置き換え：

```rust
/// Invoke the registered precompile end-to-end through the registry
/// (rather than calling `read_best_bid` directly). This proves the
/// registration is wired such that an EVM dispatch to the address hits
/// our function — the same path Reth's EVM uses on `staticcall` to
/// `CLOB_READ_BEST_BID`.
#[test]
fn registered_precompile_is_invokable_via_registry() {
    let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
    uninstall_clob();

    let extended = openhl_precompiles(Precompiles::cancun());
    let precompile = extended
        .get(&CLOB_READ_BEST_BID)
        .expect("CLOB precompile must be registered");

    // Precompile::execute is the public dispatch method — same as what
    // the EVM calls internally when a contract STATICCALLs the address.
    let result = precompile
        .execute(&[], 100_000, 0)
        .expect("call must not error");
    assert_eq!(result.bytes.len(), 64);
    // No CLOB → zero output, matching read_best_bid_returns_zero_when_no_clob_installed.
    let price = U256::from_be_slice(&result.bytes[0..32]);
    assert_eq!(price, U256::ZERO);
}
```

L3 との差分は 3 つ：

1. **冒頭で `TEST_SERIALIZER` を取って `uninstall_clob` を呼ぶ** — 1 つ目のテストと同じパターン。
2. **doc コメントを追加**（L3 にはなかった）。なぜこのテストが unit test と並んで存在するのかを説明する。
3. **`assert_eq!(price, U256::ZERO)`** — `U256::from(100u64)` から変更する。

真ん中のテスト（`openhl_precompiles_registers_clob_address`）は `CLOB_STATE` を触らない — registry membership をチェックするだけだ。**serializer や uninstall を加えてはいけない** — 不要な直列化で、地味に遅くなるだけだ。

## テスト

```bash
cargo test -p openhl-evm --release
```

30 秒ほどで：

```
running 42 tests
... 42 pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

テスト数は L4 と同じ 42 個。違いは次のとおり：
- precompile を触る 4 つのテストのうち 2 つが、`TEST_SERIALIZER` 経由で **直列化** される。
- 修正済みの 2 つのテストは `(100, 10)` ではなく **zero output** を assert する。

serializer が何を防いでいるかを体感したいなら：

```bash
# 一時的に両テストから `let _g = TEST_SERIALIZER.lock()...` の行を削除。
cargo test -p openhl-evm read_best_bid -- --test-threads=8
# 20 回ぐらい走らせる。
for i in $(seq 1 20); do
  cargo test -p openhl-evm read_best_bid -- --test-threads=8 --quiet 2>&1 | grep "test result"
done
```

スケジューリング次第で、時々失敗するはず。確認できたら元に戻す。

よくあるエラーと対処：

- **`unused import: Order, OrderId, OrderType, Side`** — L3 のハードコードテストでは使っていたが、L5 の zero-output テストでは要らない。**残しておくこと** — L6 の live-state テストで使う。1 レッスンぶんの unused warning は無害だ。
  - `#[cfg(test)] mod tests` に `use openhl_clob::{...};` がまとめて入っていれば、そのまま残す。L6 で必要になる。
- **`error[E0599]: no method named 'lock' found for struct 'Mutex<()>'`** — `Mutex` を別の場所（たとえば `tokio::sync::Mutex`）から import している。テストモジュールの `use super::*;` で、親モジュールから `std::sync::Mutex` が入ってくるはずだ。
- **1 回通ったあとに `PoisonError` で失敗** — どこかのテストが `TEST_SERIALIZER` を保持したまま panic した。`unwrap_or_else(PoisonError::into_inner)` パターンが復旧してくれる。両テストでこの形になっているか確認する。
- **個別なら通るが、並列だと落ちる** — `TEST_SERIALIZER` が実際には効いていない。`let _g = TEST_SERIALIZER.lock().unwrap_or_else(...)` が **最初の文** （`uninstall_clob()` の前）にあることを確認する。`_g` が途中で drop されてしまうと（たとえば shadow されると）、テストの途中でロックが解放されてしまう。

## 設計の振り返り

ここに焼き込んだ重要な決定が 3 つ：

1. **CLOB 未インストール時は zero を返し、エラーにはしない。** メインネット相当の挙動は「未初期化 storage slot は zero を返す」だ — Solidity コントラクトはこれを自然に処理してくれる。エラーにしてしまうと、bootstrap 中（ブリッジが CLOB を install する前）に precompile が呼ばれたときに transaction が revert してしまう。zero を返せば gracefully に degrade する — コントラクトは「流動性なし」と判断して trade を控える。これが正しい挙動だ。

2. **`TEST_SERIALIZER` はモジュール単位にとどめ、global にはしない。** `CLOB_STATE` を触らない `live_node.rs` のテストは、これと直列化すべきではない。モジュールローカルな mutex で、partition を狭く保つ。

3. **テストの先頭で `uninstall_clob()` を呼ぶ — 末尾ではなく。** 対称的にしないのはなぜか? **panic したテストは cleanup コードを走らせないから** だ。テスト中に panic すると、CLOB は install されたまま残る。次のテストの「テスト開始時のリセット」がそれを拾う。L6 の live-state テストでは末尾でも uninstall するが、それは明快さのためであって、安全網は「テスト開始時のリセット」のほうだ。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

L5 を終えた時点で、あなたのコードは Stage 9b に **かなり近い** — `read_best_bid` の本体も、`TEST_SERIALIZER` も、更新済みの 2 つのテストも揃っている。残る差分は、Stage 9b にある `read_best_bid_returns_live_state_when_clob_installed` だ — これは L6 で追加する。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: CLOB 未インストール時に `read_best_bid` の gas を減らさないのはなぜ?**
条件分岐で `current_best_bid()` が `None` のときに少ない gas を返す、という設計もありうる。だがそれは実装詳細を漏らす — 攻撃者は gas 消費量を計測することで、validator が CLOB を install したかどうかを判別できてしまう。一律で `CLOB_BASE_GAS_COST` を課金するのが、定石の「constant-time precompile」パターンだ。**gas 課金から state を漏らしてはいけない。**

**Q: `u64::to_be_bytes()` と `U256::to_be_bytes::<32>()` の違いは?**
`u64::to_be_bytes()` は `[u8; 8]` — 8 バイトを返す。`U256::to_be_bytes::<32>()` は `[u8; 32]` — 左を zero パディングした 32 バイトを返す。**今回のように、source が 8 バイトの値で destination が 32 バイトの場合、source の 8 バイトを destination の右端 8 バイトにコピーしたい。** それを実現するのが `out[24..32].copy_from_slice(&u64_bytes)` だ。U256 版を使うと 32 バイトすべて（うち 24 バイトは zero）をコピーする— 同じ結果に 4 倍の仕事をかけている。

**Q: `TEST_SERIALIZER` があっても flake することはあるか?**
通常の `cargo test` 実行ではしない。Mutex が、2 つのテストスレッドから `CLOB_STATE` の途中状態を観測することを防いでくれる。それでも flake しうるエッジケース：(a) `current_best_bid` の中で panic して mutex が poison する（`into_inner` で復旧する）、(b) テストモジュール外のコードが `CLOB_STATE` に書き込む（`reth_node.rs` の integration test がいずれそれをやり始めたら問題になるが、今はやっていない）。

**Q: precompile の input bytes を経由して CLOB を渡せばいいだけでは?**
スマートコントラクトは `staticcall(gas, addr, input, output)` で precompile を呼ぶ。input はコントラクト側が組み立てた calldata だ — **ノードオペレータが** CLOB のポインタを差し込む手段はない。precompile の input bytes は user-controlled であって node-controlled ではないからだ。process-global な state こそが、ノードオペレータに残された唯一の注入点になる。

## 次のレッスン（L6）

接続は通ったが、ラウンドトリップを exercise するテストはまだない。L6 で `read_best_bid_returns_live_state_when_clob_installed` を追加する：既知の bid を持つ CLOB を install し、precompile を呼び、その bid が output bytes までラウンドトリップしてくることを検証する。これにより `Solidity contract → STATICCALL → EVM dispatch → REVM precompile registry → 自分の関数 → live な Book lock → エンコードして返す → コントラクトが本物のデータを見る` というチェーンが、ついに end-to-end で実証される。これが **Module 2 のマイルストーン** だ。
````

---

## Seed-file slot

L5 は Module 2 (Read precompile) の sortOrder 1 に入る：

```typescript
{
  title: 'レッスン 5 — read_best_bid がライブ状態を読む — current_best_bid() に差し替え',
  slug: 'openhl-precompiles-swap-to-live-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 40,
  xpReward: 80,
  content: `# レッスン 5 — \`read_best_bid\` がライブ状態を読む — \`current_best_bid()\` に差し替え\n\n...`
},
```

## SHA pinning discipline

L5 は `b635ef7`（Stage 9b）を引用。L5 終了時点であなたのコードは Stage 9b にかなり近い — 残るのは live-state proof テスト（L6 で追加）。

## Style review notes (self-critique before paste)

- **§プランの「接続は通ったがラウンドトリップを exercise する test がない」** が L5/L6 を分けた理由をフレーミング — L5 は差し替えと test 機構、L6 は証明。
- **§考えてみよう（並列テスト race）** が `TEST_SERIALIZER` パターンを正当化。test 隔離経験がない読者には具体的な failure mode が要る。
- **§Step 1 の `out[24..32]` vs `U256::to_be_bytes::<32>()`** が「hot path に正しい」と「明快さに正しい」を区別。
- **§Step 3 の `unwrap_or_else(PoisonError::into_inner)`** が poisoned mutex で `unwrap()` という典型ミスを先回り。
- **§やりがちな勘違い（`serial_test` crate）** が手書き mutex を正当化。
- **§設計の振り返り 3 (start-of-test reset)** がなぜ末尾 cleanup を主 safety net にしないか説明。
- **L6 プレビュー**でマイルストーンを名付け — Module 2 はラウンドトリップが証明されたら閉じる。
