# Building OpenHL Precompiles — L7 draft (JA) — build-along

> openhl SHA `a8823a1`（Stage 9c — clob_place_order precompile / write path）に対するドラフト。
> コース: `building-openhl-precompiles-ja`（track: `reth-l1-architect`）。

---

## L7 — `openhl-precompiles-place-order-scaffold-ja`

- **Module:** 3 (Write precompile), sortOrder 0 within module
- **Course-level sortOrder:** 6 (lesson 7 of 12)
- **Duration:** 40 min
- **XP reward:** 80
- **Type:** CONTENT

### Content

````markdown
# レッスン 7 — `clob_place_order` — calldata デコード scaffold

## ゴール

このレッスンが終わると：

```bash
cargo test -p openhl-evm --release
```

…が 46 tests を通る（3 新規）。CLOB の**書き込みパス**は precompile が登録され、calldata パースが実装され、rejection path が検証された状態：

- **新規 precompile `0x...0c1c`** — `CLOB_PLACE_ORDER`、`CLOB_READ_BEST_BID` と並んで登録。
- **128-byte ABI-aligned 入力レイアウト**をデコード：`account_id` / `side` / `price` / `qty`。
- **原子的な order-ID カウンタ**（`NEXT_ORDER_ID`）— プロセスグローバル、1 から開始 — sentinel `0` が「rejected」と明確に区別される。
- **4 つの rejection path** がすべて zero を返す：入力長不足、無効な `side` byte、`qty == 0`、CLOB 未インストール。
- **Happy path** は order ID を allocate して返す — **だがまだ book には submit しない。** L8 がそれを足す。

L7 は Module 3 にとっての L2：関数は到達可能で入力を正しく解析するが、state 変更の挙動は L8 まで先送り。L8 で本当に book に書き込む 1 行を追加。L9 で発生した fill を bridge に route。

## おさらい

Module 2 終了時点：
- `CLOB_READ_BEST_BID` precompile が `0x...0c1b` に登録済み。
- スマートコントラクトは `STATICCALL` で live best-bid データを read 可能。
- bridge と precompile が `Arc<Mutex<Book>>` を `CLOB_STATE` global で共有。

だがコントラクトはまだ order を **place** できない。読めるが、書けない。L7 でその修正を始める。

## プラン

`crates/evm/src/precompiles/mod.rs` に 6 つの編集：

1. **Imports を拡張** — マッチングエンジンの型（`AccountId` / `Order` / `OrderId` / `OrderType` / `Price` / `Qty` / `Side`）と `atomic::{AtomicU64, Ordering}` を引き込む。
2. **`CLOB_PLACE_ORDER` アドレス定数** + **`NEXT_ORDER_ID` 原子カウンタ**を追加。
3. **`place_order` precompile 関数を追加** — 128-byte 入力をパース、検証、ID 割り当て、エンコードした ID を返す。**まだ `book.submit(...)` は呼ばない**（それは L8）。
4. **`u64_from_be_chunk` ヘルパー**を追加 — `place_order` で 32-byte ABI ワードから u64 値を取り出すのに 3 回使う。
5. **`openhl_precompiles` を更新** — 2 つの precompile を `extend`（要素 2 つの配列、1 つではなく）。
6. **3 つの新テスト** + 1 つのヘルパー（`place_order_calldata`）でテスト入力を組み立てる。

`read_best_bid` 関数と Module 2 のテストは変更なし。**L7 は純粋に追加のみ。**

> 🛑 **考えてみよう。** スクロール前に — `read_best_bid` precompile は*空*入力（`&[]`）を取り 64 bytes を返した。`place_order` は **128 bytes 入力**を取り 32 bytes を返す。**なぜ Solidity は各 u64 フィールドを 32 bytes にパディングする？** ヒント：precompile が通常のコントラクト関数と共有している呼び出し規約を考える。

（答え：**Solidity の ABI は固定幅 32 bytes/slot。** `function f(uint64 a, uint8 b, uint64 c, uint64 d)` はパックしない — 4 × 32 = 128 bytes の calldata を割り当て、各値はその 32-byte slot 内で右寄せ。Precompile は同じ EVM call opcode で呼び出されるので同じ規約に従う。**無駄は意図的** — EVM がすべての call を一様に扱えるようにする。我々のパーサは各 slot の意味ある 8 byte / 1 byte を読み、残りは無視する。）

## 手順

### Step 1: Imports を拡張

現在の imports（L6 終了時点）：

```rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
use openhl_clob::Book;
use std::sync::{Arc, Mutex, RwLock};
```

`openhl_clob` の import を拡張してマッチングエンジンの型を引き込み、`std::sync` に atomic を追加：

```rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
use openhl_clob::{AccountId, Book, Order, OrderId, OrderType, Price, Qty, Side};
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc, Mutex, RwLock,
};
```

`AccountId` / `Order` / `OrderId` / `OrderType` / `Price` / `Qty` / `Side` はすべて L8 で **`Order` を組み立てる**ために必要 — だが import は今入れておく（diff を L7 の関心に絞り、L8 でそのまま関数 signature に使うため）。`AtomicU64` と `Ordering` は `NEXT_ORDER_ID` カウンタ用。

### Step 2: アドレス定数 + 原子カウンタを追加

`CLOB_READ_BEST_BID` の後ろに：

```rust
/// Address of the "place order" precompile (write path — Stage 9c).
///
/// Solidity call shape (ABI-aligned 128-byte input):
/// `call(gas, 0x...0c1c, calldata=(uint64 account, uint8 side, uint64 price, uint64 qty), ...) → uint256 order_id`
///
/// `side` encoding: 0 = Buy, 1 = Sell. Any other value → call returns 0
/// (rejected, no state change). Order type is hardcoded to Limit at v0.
///
/// Return: 32 bytes; the last 8 are a big-endian u64 `order_id`. A return
/// of 0 means the order was rejected (no CLOB installed, malformed input,
/// or invalid side byte) — distinguishable from "placed" because allocated
/// IDs start at 1.
pub const CLOB_PLACE_ORDER: Address = address!("0x0000000000000000000000000000000000000c1c");
```

アドレス `0x...0c1c` — mnemonic `0c1c` = 「CL[ob] [pla]C[e]」。`0x...0c1b`（「CL[ob] [Rea]B[id]」）のすぐ隣。両方とも標準 precompile `0x01..0x09` よりずっと上。

次に `CLOB_BASE_GAS_COST` の後ろ：

```rust
/// Monotonic order-ID counter for orders placed via the EVM. Starts at 1
/// so the sentinel value 0 (returned on rejection) is distinguishable from
/// a successfully placed order.
///
/// **Single-validator caveat:** This is a process-global counter. For
/// multi-validator deployments, order IDs must come from consensus —
/// each validator's precompile must allocate the same ID for the same
/// EVM-side call, which means the counter has to be either deterministic
/// from input or read from a shared block-scoped state. Out of scope at v0.
static NEXT_ORDER_ID: AtomicU64 = AtomicU64::new(1);
```

**この static に焼き込まれた決定 2 つ：**

1. **0 でなく 1 から開始。** `0` は我々の「rejected」sentinel 値（入力が malformed か CLOB 未インストールのとき precompile が返す）。カウンタが 0 から始まると、最初に成功した order も 0 を返してしまい、rejection と区別不能。1 から開始することで、**割り当てられた ID はすべて `> 0`、EVM caller に返る `0` はすべて明確に rejection**。
2. **`AtomicU64`、`Mutex<u64>` でない。** `fetch_add(1, Relaxed)` は wait-free、`Mutex::lock` は block する。Order ID の割り当ては order 発注の hot path に乗る。Mutex だと全 order 発注を 1 つのクリティカルセクションに直列化する。**Atomic increment が正しい道具。**

> 🛑 **やりがちな勘違い。** 「なぜ `Ordering::Relaxed` で `SeqCst` ではない？」 **ID は他の state と ordering 依存を持たないから。** `Relaxed` は atomicity（2 スレッドが同じ ID を得ない）を保証するが、他のメモリ操作との同期は提供しない。我々は ID を book への書き込みと順序付ける必要がない — book は自分の mutex を持ち、それが state 可視性の順序を提供する。`SeqCst` だと毎 increment にメモリフェンスを足すが利得なし。**必要な ordering の中で一番弱いものを選ぶ。**

> 🛑 **やりがちな勘違い。** 「Multi-validator caveat は将来の問題っぽい — 今書く意味は？」 **失敗モードが silent chain divergence だから。** 2 つの validator が同じ EVM call に対して異なる ID を割り当てると、その時点から book が分岐する — そして分岐は read で異なる値が返るずっと後まで見えない。**Static の定義場所で問題に名前を付けることで、このコードを拡張する将来のエンジニアは「マルチバリデータで出荷不可」を refactor 方針決定前に読む。** 「この物には隠れた制約がある」警告の正規の場所は doc コメント。

### Step 3: `u64_from_be_chunk` ヘルパーを追加

`read_best_bid` の下、`openhl_precompiles` の上に：

```rust
/// Read a big-endian u64 from the last 8 bytes of a 32-byte ABI chunk.
fn u64_from_be_chunk(chunk: &[u8]) -> u64 {
    debug_assert!(chunk.len() == 32);
    let mut buf = [0u8; 8];
    buf.copy_from_slice(&chunk[24..32]);
    u64::from_be_bytes(buf)
}
```

3 点：
1. **長さの `debug_assert!`** — debug ビルドでは「間違った量を slice した」を捕まえる。Release ビルドでは何にもコンパイルされない。開発時無料の安全。
2. **`u64::from_be_bytes` は `[u8; 8]` を受け取る** — 固定サイズ配列、slice ではない。なので `chunk[24..32]` の 8 bytes をまずスタック `[u8; 8]` バッファにコピー。
3. **`pub fn` でなく `fn`。** モジュール private。`precompiles/mod.rs` の外には誰も必要ない。

> 🛑 **やりがちな勘違い。** 「`u64::from_be_bytes(chunk[24..32].try_into().unwrap())` でいいんじゃ？」 **同じ — release では同じ生成コード。** 名前付きヘルパーは**呼び出し側での明快さ**のため：`u64_from_be_chunk(&input[0..32])` は「最初の ABI slot を u64 としてデコード」と読める。`u64::from_be_bytes(input[0..32][24..32].try_into().unwrap())` は bytes-and-indices パズル。**ヘルパーは同一の命令にコンパイルされ、節約は認知負荷で発生。**

### Step 4: `place_order` precompile 関数を追加

`read_best_bid` の下、`u64_from_be_chunk` の上：

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
/// L7 NOTE: this scaffold parses + validates + allocates an order_id, but
/// does NOT actually submit the order to the book. L8 adds the
/// `book.submit(...)` call that completes the write path.
#[allow(clippy::unnecessary_wraps)]
fn place_order(input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    let mut out = vec![0u8; 32];

    // Need exactly 128 bytes of input (4 × ABI-padded fields).
    if input.len() < 128 {
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    }

    let _account_id = u64_from_be_chunk(&input[0..32]);
    let side_byte = input[63];
    let _price_value = u64_from_be_chunk(&input[64..96]);
    let qty_value = u64_from_be_chunk(&input[96..128]);

    let _side = match side_byte {
        0 => Side::Buy,
        1 => Side::Sell,
        _ => return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)),
    };

    // Reject orders with zero quantity outright — the book accepts them
    // technically, but a zero-qty order is always a bug from the caller.
    if qty_value == 0 {
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    }

    let state = CLOB_STATE.read().expect("CLOB_STATE rwlock poisoned");
    if state.as_ref().is_none() {
        // No CLOB installed → 0 sentinel.
        return Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0));
    }
    drop(state); // L8 will re-acquire as write-side-friendly

    let order_id_val = NEXT_ORDER_ID.fetch_add(1, Ordering::Relaxed);

    // L7 stops here. L8 will add: clob.lock().submit(Order { ... }).

    out[24..32].copy_from_slice(&order_id_val.to_be_bytes());
    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
```

5 つの逐次ステップ。各 rejection は**早期 return**、nested `if` ではない — happy path を線形に保つ。

**`_account_id` / `_price_value` / `_side` の `_` 接頭辞**は「パースしたがまだ使わない」を示す。L8 でアンダースコアを外して `Order { ... }` に渡す。それまで clippy と rustc は underscore 慣習でこの unused binding を受け入れる。

**先頭の長さチェックは guard。** `input[N]` の byte index は N > input.len() なら panic する。先頭で `>= 128` を 1 回検証すれば、以降の `input[X]` アクセスは provably safe — per-access bounds-check のオーバーヘッドなし、ランタイム panic のリスクなし。

**side match の `_ =>` 腕。** `Side` は 2-variant enum。Match は exhaustive 必須だが、EVM caller は side slot に 0..=255 のどの byte でも渡せる。0 や 1 でないものは rejection、panic ではない。

**Increment の `Ordering::Relaxed`。** Step 2 で確立済み。

**`out` バッファ。** Success path が最後の 8 bytes を上書きするまで全 zero。各 rejection path はバッファを変更せず返す — `out[24..32]` は zero のまま — caller は `order_id = 0` = rejected としてデコード。

> 🛑 **やりがちな勘違い。** 「`account_id` や `price` をまだ使わないのにパースするのはなぜ？」 **L7 の仕事は calldata schema を確定すること。** Schema が一度公開されればコントラクトはそれに対してビルドし始める。すべてのフィールドをパースする（まだ使わないものも）ことで、**パースの形 = 契約**。L8 でどのフィールドをパースするかを変えると、L7 と L8 の間にビルドされた全コントラクトが壊れる。**フルスキーマを L7 でパースする — 使わない binding があっても。挙動の変更は L8。**

> 🛑 **考えてみよう。** `drop(state)` 行を見る。なぜ order ID を allocate する前に明示的に read-lock を drop する？ ヒント：L8 で**同じ Arc に write 側のロックを取りに行く**ときに何が起きるかを考える。

（答え：**Read ロックは write ロックを block する。** 関数全体を通して `state` を保持すると — L8 future の `clob.lock()` を含む — `CLOB_STATE` の read lock を持ったまま、それが指す Book の独立 Mutex を取りに行く形になる。動くが（デッドロックしない）、read lock が他者の `install_clob` を precompile 実行中ずっとブロックする。早めに drop することで lock 保持窓を縮める。**良い市民になれ：各ロックを取れるだけ短く保つ。**）

### Step 5: `openhl_precompiles` を両方登録するように更新

現在（L6 終了時点）：

```rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    let mut precompiles = base.clone();
    precompiles.extend([Precompile::new(
        PrecompileId::custom("clob_read_best_bid"),
        CLOB_READ_BEST_BID,
        read_best_bid,
    )]);
    precompiles
}
```

これに置き換え：

```rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    let mut precompiles = base.clone();
    precompiles.extend([
        Precompile::new(
            PrecompileId::custom("clob_read_best_bid"),
            CLOB_READ_BEST_BID,
            read_best_bid,
        ),
        Precompile::new(
            PrecompileId::custom("clob_place_order"),
            CLOB_PLACE_ORDER,
            place_order,
        ),
    ]);
    precompiles
}
```

1 つの `extend` 呼び出しに 2 つの precompile — `extend` を 2 回呼ぶのと同じ。配列形状のほうが precompile が増えてもクリーンに保てる。

`openhl_precompiles` の doc コメントも「CLOB-reading additions」から「CLOB-reading + CLOB-writing additions」へ更新 — 小さい編集だが、今しないと時間とともに乖離する種類のもの。

### Step 6: 3 テスト + 1 テストヘルパーを追加

`#[cfg(test)] mod tests` ブロック内、L6 のラウンドトリップテストの後に追加：

```rust
    /// Helper: build a 128-byte ABI-aligned `place_order` calldata buffer.
    fn place_order_calldata(account: u64, side: u8, price: u64, qty: u64) -> Vec<u8> {
        let mut buf = vec![0u8; 128];
        buf[24..32].copy_from_slice(&account.to_be_bytes());
        buf[63] = side;
        buf[88..96].copy_from_slice(&price.to_be_bytes());
        buf[120..128].copy_from_slice(&qty.to_be_bytes());
        buf
    }

    /// With no CLOB installed, `place_order` rejects (returns sentinel 0).
    #[test]
    fn place_order_returns_zero_when_no_clob_installed() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        uninstall_clob();

        let calldata = place_order_calldata(42, 0, 100, 5);
        let result = place_order(&calldata, 100_000, 0).expect("precompile must not error");
        let order_id = U256::from_be_slice(&result.bytes[0..32]);
        assert_eq!(order_id, U256::ZERO);
    }

    /// `place_order` with bad input (too short, invalid side byte, zero qty)
    /// rejects — returns the sentinel 0.
    ///
    /// L7 NOTE: this test only checks the return value. L8 will add
    /// `book.depth_bid() == 0` assertions once submit is wired in.
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

    /// `place_order` on the happy path returns a non-zero order ID.
    ///
    /// L7 NOTE: this test only proves we **return** a non-zero ID; L8 will
    /// extend coverage to prove the order is actually visible on the book
    /// (the L8 round-trip test).
    #[test]
    fn place_order_returns_nonzero_id_on_valid_input() {
        let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        install_clob(Arc::new(Mutex::new(Book::new())));

        let calldata = place_order_calldata(0xABCD, 0, 175, 12);
        let result = place_order(&calldata, 100_000, 0).expect("precompile must not error");
        let order_id = U256::from_be_slice(&result.bytes[0..32]);
        assert!(order_id > U256::ZERO, "allocated id must be > 0 sentinel");

        uninstall_clob();
    }
```

ヘルパーは 128-byte バッファを 4 つの論理値から組み立て、各テストから ABI パディングの詳細を隠す。これがないと毎テストで byte indexing を繰り返す — エラー prone、ノイジー。

**3 テスト、3 つの関心事：**

1. **CLOB 未インストール → zero。** `read_best_bid_returns_zero_when_no_clob_installed` をミラー。同じパターン（serializer / `uninstall_clob()` / assert）、同じセマンティクス（precompile は未インストール state で gracefully degrade）。
2. **Malformed input → zero、3 つの rejection path 全部。** 3 つの sub-assertion が 1 つのテストにまとまっているのは概念的に同じシナリオ（「悪い入力は refuse」）だから。**L7 NOTE で先送りした check（`depth_bid == 0`）を明示** — L8 で追加。
3. **Valid input → nonzero ID。** これが「happy path acknowledgment」。ID を allocate した。**まだ order が book に乗ったかは check しない** — それは L8 の仕事。

> 🛑 **やりがちな勘違い。** 「3 テストでなく 1 つの大きいテストでいいんじゃ？」 **失敗メッセージが原因を指し示すべきだから。** 「place_order path 全体」を 1 テストにすると、fail したら assertion メッセージとスタックトレースを読んで*どの* sub シナリオが壊れたか割り出す必要がある。3 テストなら、fail したテスト名*そのもの*が原因：`place_order_rejects_malformed_input` fail → rejection path を check、`place_order_returns_nonzero_id_on_valid_input` fail → happy path を check。**1 テスト 1 関心事で fail が self-describing になる。**

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

L6 より 3 多い（43 → 46）。新規は 3 つの `place_order_*` テスト。Module 1+2 の 43 はそのまま通る — L7 は純粋に追加のみ。

L7 関連だけ見たいなら：

```bash
cargo test -p openhl-evm --release place_order
```

出力：

```
running 3 tests
test precompiles::tests::place_order_returns_zero_when_no_clob_installed ... ok
test precompiles::tests::place_order_rejects_malformed_input ... ok
test precompiles::tests::place_order_returns_nonzero_id_on_valid_input ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 43 filtered out
```

よくあるエラーと対処：

- **`unused import: AccountId, Order, OrderId, OrderType, Price, Qty, Side`** — L7 で import したがまだどれも使わない。**`#[allow(unused_imports)]` を use 文に付ける、もしくは warning を受け入れる** — L8 で全部使う。消すな。
- **match 腕の `unused variable: _side`** — これが `_side` の目的。アンダースコア接頭辞が rustc に「使っていないのは知っているから warn しないで」と伝える。`let side = match ...`（アンダースコアなし）と書くと unused-variable warning が出る。アンダースコアを戻す。
- **`u64_from_be_chunk` で `error[E0061]: this function takes 0 arguments but 1 was supplied`** — 関数名を間違えたか複数の slice で呼んでいる。Signature は `u64_from_be_chunk(chunk: &[u8])`、引数 1 つ。
- **ヘルパーの `buf[63] = side` で `error[E0277]: 'u64' is not 'u8'`** — `side: u64` 等と書いた。Helper の引数は `side: u8`、byte 位置 63 はちょうど 1 byte。
- **個別なら通る、suite で fail** — `TEST_SERIALIZER` lock が最初の文でない。各テストで `let _g = TEST_SERIALIZER.lock()...` が他のどのコードよりも前にくるよう並び替え。

## 設計の振り返り

4 つの一時停止ポイント：

1. **Schema が契約、挙動は後で。** L7 は precompile アドレス、128-byte calldata レイアウト、32-byte 戻り形を出荷。**一度公開されればコントラクトがそれに対して呼び出し始める。** L8 で calldata レイアウトを変えると間に書かれた全コントラクトが壊れる。L7 で schema を確定する（挙動が不完全でも）ことで、公開した日から契約が安定する。

2. **Happy path が完全に配線される前に rejection path がテストされる。** 各 rejection は public API の保証：「malformed input を送ったら sentinel 0 が返る、panic も partial state mutation も決してない」。これらの保証は happy path が何か面白いことをする*前に*テストできる — そして早めに固めることで、L8 で本物の submit を追加するとき validation logic が後付けにならない。

3. **Order ID に `AtomicU64`、`Mutex<u64>` でない。** アクセスパターンに基づく選択：ID 割り当てが毎 order 発注で起き、book state に論理依存しない。Atomic increment は wait-free、mutex 取得は block しうる。**データが他の state と同期不変条件を持たない場合は軽いプリミティブを選ぶ。**

4. **`Ordering::Relaxed` が十分なのは book が自分の mutex を持つから。** Book の `Mutex` が「order が book に乗っている」可視性の同期を提供する。Atomic カウンタは ID の一意性を提供するが、ID は他の write と同期不変条件を持たない。**メモリ ordering は「必要な不変条件」から選ぶ — 「安全側のほうが良い」からではない。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

L7 終了時点であなたのコードは Stage 9c に**近い**が**特定の地点で止まる**：Stage 9c の `place_order` は order_id allocation と encoding の間に `book.submit(...)` を呼ぶ。あなたの L7 版は呼ばない。Stage 9c の `place_order_rejects_malformed_input` は `depth_bid() == 0` アサーションも持つ。あなたの L7 版は持たない。Stage 9c には `place_order_then_read_best_bid_round_trips` テストもある。あなたの L7 版にはない。**それらはすべて L8。**

戻す：

```bash
git checkout main
```

## よくある質問

**Q: malformed input で `place_order` を panic させればいいんじゃ？**
Precompile は Solidity から呼ばれ、panic は precompile error として伝播して transaction 全体を revert する。`0` を返すと呼び出し側コントラクトが選べる：ログ、修正入力でリトライ、ユーザに surface。**Caller のバグによる失敗の場合、precompile は soft fail すべき。**

**Q: `AtomicU64::fetch_add(1, Relaxed)` と `fetch_add(1, SeqCst)` の違い？**
両方とも「2 スレッドが同じ戻り値を得ない」という atomicity の意味で atomic。違いは**メモリ ordering**：`SeqCst` は他のすべての `SeqCst` 操作と program-wide に同期するメモリフェンスを追加。`Relaxed` は increment 自体が atomic であることだけ保証し、他のメモリ操作との同期は提供しない。我々のケース（他 state に論理依存しないカウンタ）では `Relaxed` で十分、かつ速い。

**Q: malformed input に `EnumValueError` 的なものを返せないの？**
`PrecompileFn` signature は `fn(...) -> PrecompileResult` で `PrecompileResult = Result<PrecompileOutput, PrecompileError>`。Malformed input で `Err(...)` を返すことは*できる*が、それは EVM レベルのエラー（transaction revert）として伝播する。`Ok` + sentinel 0 なら呼び出し側コントラクトが rejection を gracefully に扱える。**これは設計選択：precompile エラーは EVM fatal か caller-visible か？** 我々のケース（ユーザ提供 calldata を検証）では caller-visible がデフォルトとして良い。

**Q: 誰かが `u64::MAX` ちょうどで order を submit したら？**
最終的に `NEXT_ORDER_ID.fetch_add(1, Relaxed)` が 0 にラップ（u64 を返すので）。その時点で次の allocation が sentinel 0 を返す — caller は「rejected」として扱う。`u64` overflow は ~1.8e19 orders で、約 1800 京 order — v0 では問題なし。Production はもっと広いカウンタを使うか overflow 近くで panic すべき。

## 次のレッスン（L8）

L8 は 1 行 + テスト。その 1 行：order_id 割り当てと encoding の間に `clob.lock().expect("...").submit(Order { id, account, side, qty, order_type });`。テスト：`place_order_rejects_malformed_input` を拡張して各 rejection 後に `book.depth_bid() == 0` を assert（submit が配線されたので意味ある side-effect check に）、`place_order_returns_nonzero_id_on_valid_input` を `place_order_then_read_best_bid_round_trips` に置換 — 2 precompile ラウンドトリップが `0x...0c1c` 経由の writes が `0x...0c1b` 経由の reads から見えることを証明。**そのラウンドトリップが Module 3 の mid-stage マイルストーン。**
````

---

## Seed-file slot

L7 は Module 3 (Write precompile) の sortOrder 0 に入る：

```typescript
{
  title: 'レッスン 7 — clob_place_order — calldata デコード scaffold',
  slug: 'openhl-precompiles-place-order-scaffold-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 80,
  content: `# レッスン 7 — \`clob_place_order\` — calldata デコード scaffold\n\n...`
},
```

## SHA pinning discipline

L7 は `a8823a1`（Stage 9c）を引用。L7 終了時点であなたのコードは Stage 9c に近いが `book.submit(...)` とラウンドトリップテストの手前で止まる — それらは L8。

## Style review notes (self-critique before paste)

- **§ゴールが L7 を「Module 3 にとっての L2」とフレーミング** — 並列構造が読者を新モジュールに既知の Module 2 パターンで anchor。
- **§考えてみよう（ABI 32-byte パディング）** が calldata レイアウトを正当化 — JS/TS 出身者は無駄に驚きうる。
- **§Step 2「0 でなく 1 から開始」** が sentinel 設計が機能する理由を解く。
- **§やりがちな勘違い（`Relaxed` vs `SeqCst`）** が「安全側」反射を先回り。
- **§やりがちな勘違い（multi-validator caveat）** が doc コメントが重要な理由を正当化。
- **§Step 4 の `_` 接頭辞慣習** が「パースしたが unused」イディオムを説明。
- **§やりがちな勘違い（テスト分割）** はテスト設計に再利用可能なアドバイス。
- **§設計の振り返り 1** 「Schema が契約、挙動は後で」が中央の pedagogical point — 実装を固める前に契約を固める。
- **L8 プレビュー**が具体的：1 行のコード + 1 テスト変更 + 1 テスト置換。
