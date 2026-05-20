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

上記の実行結果が 46 tests を通る（3 つ新規）。CLOB の **書き込みパス** は、precompile が登録され、calldata のパースが実装され、rejection path が検証された状態になる：

- **新規 precompile `0x...0c1c`** — `CLOB_PLACE_ORDER` を `CLOB_READ_BEST_BID` と並べて登録する。
- **128-byte ABI-aligned な入力レイアウト** を decode する：`account_id` / `side` / `price` / `qty`。
- **アトミックな order-ID カウンタ**（`NEXT_ORDER_ID`）— プロセスグローバル、1 から開始 — sentinel の `0` が「rejected」と明確に区別される。
- **4 つの rejection path** がすべて zero を返す：入力長不足、無効な `side` byte、`qty == 0`、CLOB 未インストール。
- **Happy path** では order ID を allocate して返す — **ただし、まだ book には submit しない。** これは L8 で足す。

L7 は Module 3 における L2 に相当する：関数は到達可能で、入力も正しく解析するが、state を変更する挙動は L8 まで先送り。L8 で「book に実際に書き込む」1 行を加え、L9 で発生した fill を bridge に route する。

## おさらい

Module 2 終了時点の状態：
- `CLOB_READ_BEST_BID` precompile が `0x...0c1b` に登録されている。
- スマートコントラクトは `STATICCALL` で live な best-bid データを read できる。
- bridge と precompile が、`CLOB_STATE` global を介して `Arc<Mutex<Book>>` を共有している。

ただしコントラクトはまだ order を **発注** できない。読めるが、書けない。L7 でその修正を始める。

## プラン

`crates/evm/src/precompiles/mod.rs` に 6 つの編集：

1. **Imports を拡張** — マッチングエンジンの型（`AccountId` / `Order` / `OrderId` / `OrderType` / `Price` / `Qty` / `Side`）と `atomic::{AtomicU64, Ordering}` を引き込む。
2. **`CLOB_PLACE_ORDER` アドレス定数** + **`NEXT_ORDER_ID` 原子カウンタ**を追加。
3. **`place_order` precompile 関数を追加** — 128-byte 入力をパース、検証、ID 割り当て、エンコードした ID を返す。**まだ `book.submit(...)` は呼ばない**（それは L8）。
4. **`u64_from_be_chunk` ヘルパー**を追加 — `place_order` で 32-byte ABI ワードから u64 値を取り出すのに 3 回使う。
5. **`openhl_precompiles` を更新** — 2 つの precompile を `extend`（要素 2 つの配列、1 つではなく）。
6. **3 つの新テスト** + 1 つのヘルパー（`place_order_calldata`）でテスト入力を組み立てる。

`read_best_bid` 関数と Module 2 のテストには変更を加えない。**L7 は純粋に追加だけのレッスン。**

> 🛑 **考えてみよう。** スクロールする前に — `read_best_bid` precompile は *空* の入力（`&[]`）を受け取って 64 bytes を返した。`place_order` は **128 bytes の入力** を受け取って 32 bytes を返す。**なぜ Solidity は u64 フィールドそれぞれを 32 bytes に pad するのか?** ヒント：precompile が通常のコントラクト関数と共有している呼び出し規約を考える。

（答え：**Solidity の ABI は 1 slot = 固定 32 bytes だから。** `function f(uint64 a, uint8 b, uint64 c, uint64 d)` はパックしない — 4 × 32 = 128 bytes ぶんの calldata を割り当て、各値はその 32-byte slot 内で右寄せされる。precompile は通常の関数呼び出しと同じ EVM call opcode で呼ばれるので、同じ規約に従う。**この無駄は意図的なもの** で、EVM が呼び出しを一律に扱えるようにするためだ。こちらのパーサは、各 slot のうち意味のある 8 byte ないし 1 byte だけを読み、残りは無視する。）

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

`AccountId` / `Order` / `OrderId` / `OrderType` / `Price` / `Qty` / `Side` は、すべて L8 で **`Order` を組み立てる** ために必要になる — ただし import は今のうちに入れておく（こうしておけば diff を L7 の関心事に絞れ、L8 ではそのまま関数シグネチャ部分に使えるからだ）。`AtomicU64` と `Ordering` は `NEXT_ORDER_ID` カウンタで使う。

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

アドレスは `0x...0c1c` — ニーモニックは `0c1c` = 「CL[ob] [pla]C[e]」だ。`0x...0c1b`（「CL[ob] [Rea]B[id]」）のすぐ隣に配置される。どちらも標準 precompile `0x01..0x09` よりずっと上の領域にある。

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

**この static に焼き込まれた決定が 2 つ：**

1. **0 ではなく 1 から開始する。** `0` はこちらの「rejected」sentinel 値（入力が malformed か、CLOB 未インストールのときに precompile が返す）として使う。仮にカウンタを 0 から始めると、最初に成功した order も 0 を返してしまい、rejection と区別できなくなる。1 から始めることで、**割り当てられた ID は必ず `> 0` になり、EVM caller に返る `0` は明確に rejection を意味する** ようになる。
2. **`Mutex<u64>` ではなく `AtomicU64` を使う。** `fetch_add(1, Relaxed)` は wait-free だが、`Mutex::lock` はブロックする。order ID の割り当ては order 発注の hot path に乗っており、mutex を使うと order 発注がすべて 1 つのクリティカルセクションに直列化されてしまう。**正しい道具は atomic increment だ。**

> 🛑 **やりがちな勘違い。** 「なぜ `Ordering::Relaxed` で、`SeqCst` ではないのか?」 — **ID は他の state と ordering の依存関係を持たないからだ。** `Relaxed` は atomicity（2 つのスレッドが同じ ID を得ない、という保証）は提供するが、他のメモリ操作との同期は提供しない。こちらとしては ID を book への書き込みと順序付ける必要がない — book は自分の mutex を持っていて、それが state の可視性順序を提供してくれる。`SeqCst` にすると increment ごとにメモリフェンスが足される一方、得るものはない。**必要な ordering の中で、最も弱いものを選ぶ。**

> 🛑 **やりがちな勘違い。** 「Multi-validator caveat は将来の問題に見える — 今からドキュメントに書く意味は?」 — **失敗モードが silent な chain divergence だからだ。** 2 つの validator が同じ EVM call に対して異なる ID を割り当てた瞬間から book が分岐し始める — そしてその分岐は、read で違う値が返ってくるまでずっと見えない。**static の定義場所で問題に名前を付けておけば、このコードを拡張する将来のエンジニアが、refactor の方針を決める前に「マルチバリデータでは出荷不可」だと気づける。** 「この物には隠れた制約がある」という警告を置くべき正規の場所は doc コメントだ。

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

注目点が 3 つ：
1. **長さの `debug_assert!`** — debug ビルドでは「間違った長さを slice した」を捕まえる。release ビルドでは何にもコンパイルされない。開発時にタダで得られる安全策だ。
2. **`u64::from_be_bytes` は `[u8; 8]` を受け取る** — slice ではなく固定サイズの配列を要求する。なので `chunk[24..32]` の 8 バイトを、まずスタック上の `[u8; 8]` バッファにコピーする。
3. **`pub fn` ではなく `fn`** — モジュール内 private にする。`precompiles/mod.rs` の外からは誰も使わないからだ。

> 🛑 **やりがちな勘違い。** 「`u64::from_be_bytes(chunk[24..32].try_into().unwrap())` で済むのでは?」 — **動作は同じ。release では同じ命令列にコンパイルされる。** 名前付きヘルパーは **呼び出し側での明快さ** のために存在する：`u64_from_be_chunk(&input[0..32])` は「最初の ABI slot を u64 として decode する」と読める。`u64::from_be_bytes(input[0..32][24..32].try_into().unwrap())` だと bytes と indices のパズルになる。**ヘルパーは同一の命令にコンパイルされる — 節約されるのは認知負荷のほうだ。**

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

5 つの逐次ステップ。rejection はそれぞれ **早期 return** で書く — ネストした `if` にはしない。happy path を線形に保つためだ。

**`_account_id` / `_price_value` / `_side` の `_` 接頭辞** は、「parse はしたが、まだ使わない」ことを示すマーカーだ。L8 で underscore を外して `Order { ... }` に渡す。それまでは、clippy と rustc は unused な binding を underscore 慣習として受け入れてくれる。

**冒頭の長さチェックは guard だ。** `input[N]` のバイトインデックスは N > input.len() で panic する。先頭で `>= 128` を 1 回検証しておけば、以降の `input[X]` アクセスは provably safe になる — アクセスごとの bounds-check のオーバーヘッドはなく、ランタイム panic のリスクもない。

**side の match にある `_ =>` の腕。** `Side` は 2 種類の variant を持つ enum だ。match は exhaustive である必要があるが、EVM caller は side slot に 0..=255 のどのバイトでも渡しうる。0 でも 1 でもない値は rejection に倒す — panic ではない。

**increment 側の `Ordering::Relaxed`。** これは Step 2 で確立済み。

**`out` バッファ。** success path で最後の 8 バイトを上書きするまでは、全部ゼロのままだ。各 rejection path はバッファを変えずに return する — `out[24..32]` がゼロのままなので、caller は `order_id = 0` を rejected として decode することになる。

> 🛑 **やりがちな勘違い。** 「まだ使わない `account_id` や `price` を、なぜ parse するのか?」 — **L7 の仕事は calldata の schema を確定させることだ。** schema さえ公開すれば、コントラクトはその schema を前提にビルドし始める。すべてのフィールドを parse する（まだ使わないものも含めて）ことで、**parse の形がそのまま契約になる**。仮に L8 で parse 対象のフィールドを変えると、L7 と L8 の間にビルドされた全コントラクトが壊れる。**フルの schema は L7 で parse する — 未使用 binding があってもよい。挙動の変更は L8 でやる。**

> 🛑 **考えてみよう。** `drop(state)` の行に注目してほしい。なぜ order ID を allocate する *前に* read lock を明示的に drop するのか? ヒント：L8 で **同じ Arc に対して write 側のロックを取りに行く** ときに何が起きるかを考える。

（答え：**read lock は write lock をブロックする。** 関数全体を通して `state` を保持すると — L8 で追加する `clob.lock()` まで含めて — `CLOB_STATE` の read lock を持ったまま、その先にある Book 独自の Mutex を取りに行く形になる。動作はする（デッドロックはしない）が、read lock を握っている間ずっと、他の主体による `install_clob` を precompile 実行中ブロックしてしまう。早めに drop することで、ロック保持の窓を縮められる。**良き市民であれ：それぞれのロックは可能なかぎり短く保つ。**）

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

1 つの `extend` 呼び出しに precompile を 2 つ渡している — 結果としては `extend` を 2 回呼ぶのと同じだ。配列の形にしておくほうが、precompile が増えても綺麗に保てる。

`openhl_precompiles` の doc コメントも「CLOB-reading additions」から「CLOB-reading + CLOB-writing additions」に更新する — 些細な変更だが、今やらないと時間とともにコードと乖離していくたぐいのものだ。

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

このヘルパーは、4 つの論理値から 128-byte のバッファを組み立て、ABI パディングの詳細を各テストから隠してくれる。これがないとテストごとに byte indexing を書き直すことになり、エラーが入りやすく、ノイズも増える。

**テスト 3 つ、関心事も 3 つ：**

1. **CLOB 未インストール → zero。** `read_best_bid_returns_zero_when_no_clob_installed` をミラーする形だ。パターン（serializer / `uninstall_clob()` / assert）も、セマンティクス（precompile が未インストール状態で gracefully に degrade すること）も同じ。
2. **Malformed input → zero、3 つの rejection path すべて。** 3 つの sub-assertion を 1 つのテストにまとめているのは、概念的にどれも同じシナリオ（「悪い入力は拒否する」）だからだ。**L7 NOTE で先送りしているチェック（`depth_bid == 0`）はここでは明示しておく** — 追加は L8。
3. **Valid input → nonzero ID。** これが「happy path の acknowledgment」だ。ID は allocate された。**ただし order が book に乗ったかどうかはまだチェックしない** — それは L8 の仕事。

> 🛑 **やりがちな勘違い。** 「3 つのテストではなく、1 つの大きいテストでいいのでは?」 — **失敗メッセージが原因を指し示せるようにしたいからだ。** 「place_order の全体パス」を 1 つのテストにまとめてしまうと、fail したときに assertion メッセージとスタックトレースを読み解いて *どの* サブシナリオが壊れたかを推定する必要がある。3 つに分けておけば、fail したテスト名 *そのもの* が原因を指す：`place_order_rejects_malformed_input` が fail なら rejection path を確認、`place_order_returns_nonzero_id_on_valid_input` が fail なら happy path を確認、という具合だ。**1 テスト 1 関心事を守ることで、失敗自体がそれ自身を説明してくれる。**

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

L6 より 3 つ多い（43 → 46）。新規は `place_order_*` の 3 テスト。Module 1+2 の 43 個はそのまま通る — L7 は純粋に追加だけだ。

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

- **`unused import: AccountId, Order, OrderId, OrderType, Price, Qty, Side`** — L7 で import したが、まだどれも使っていない。**`#[allow(unused_imports)]` を use 文に付けるか、warning を許容するかのどちらか** にする — L8 ですべて使うので、消してはいけない。
- **match の腕の `unused variable: _side`** — これがまさに `_side` の目的だ。underscore 接頭辞が rustc に「使っていないのは承知しているから warn しないでくれ」と伝えている。`let side = match ...`（underscore なし）と書くと unused-variable warning が出る。underscore を戻す。
- **`u64_from_be_chunk` で `error[E0061]: this function takes 0 arguments but 1 was supplied`** — 関数名を間違えたか、複数の slice で呼んでいる。シグネチャは `u64_from_be_chunk(chunk: &[u8])` で、引数は 1 つだけ。
- **ヘルパーの `buf[63] = side` のところで `error[E0277]: 'u64' is not 'u8'`** — `side: u64` などと書いてしまっている。ヘルパーの引数は `side: u8`。byte 位置 63 はちょうど 1 バイトだ。
- **個別なら通るのに、スイートでは fail する** — `TEST_SERIALIZER` の lock が最初の文になっていない。各テストで `let _g = TEST_SERIALIZER.lock()...` が他のどのコードよりも前に来るよう並び替える。

## 設計の振り返り

立ち止まりたいポイントが 4 つ：

1. **schema が契約、挙動は後回し。** L7 で出荷するのは、precompile アドレス、128-byte の calldata レイアウト、32-byte の戻り値形式だ。**一度公開すれば、コントラクトはそれを前提に call し始める。** L8 で calldata レイアウトを変えると、間に書かれたコントラクトがすべて壊れる。L7 で schema を確定させる（挙動が未完成でも）ことで、公開した日から契約が安定する。

2. **happy path がフルに配線される前に、rejection path をテストする。** 各 rejection は public API としての保証だ：「malformed input を送れば sentinel 0 が返り、panic も部分的な state 変更も決して起きない」。この保証は、happy path が何か面白いことをするより *前に* テストできる — そして早めに固めておくことで、L8 で本物の submit を追加するときに validation ロジックが後付けにならずに済む。

3. **order ID には `AtomicU64` を使い、`Mutex<u64>` は使わない。** アクセスパターンに基づく選択だ：ID の割り当ては order 発注のたびに発生し、book state とは論理的に独立している。atomic increment は wait-free、mutex の取得はブロックしうる。**データが他の state と同期の不変条件を持たないなら、軽いプリミティブを選ぶ。**

4. **`Ordering::Relaxed` で十分なのは、book が自前の mutex を持っているから。** Book の `Mutex` が「order が book に乗っている」という可視性の同期を提供する。atomic カウンタが提供するのは ID の一意性だけで、ID は他の write と同期の不変条件を共有しない。**メモリ ordering は「必要な不変条件」を起点に選ぶ — 「強いほうが安全だから」で選ぶものではない。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout a8823a1
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

L7 を終えた時点で、あなたのコードは Stage 9c に **近い** が、**特定の地点で止まっている**：Stage 9c の `place_order` は、order_id の allocation と encoding の間に `book.submit(...)` を呼ぶ — L7 版はまだ呼ばない。Stage 9c の `place_order_rejects_malformed_input` は `depth_bid() == 0` の assertion を持つ — L7 版にはまだない。Stage 9c には `place_order_then_read_best_bid_round_trips` テストもある — L7 版にはまだない。**これらはすべて L8 でやる。**

戻す：

```bash
git checkout main
```

## よくある質問

**Q: malformed input で `place_order` を panic させてしまうのはダメか?**
precompile は Solidity から呼ばれ、panic は precompile エラーとして伝播して transaction 全体を revert させる。一方 `0` を返すなら、呼び出し側のコントラクトに選択肢を渡せる — ログを取る、入力を直してリトライする、ユーザに見せる、など。**caller 側のバグに起因する失敗では、precompile は soft fail すべきだ。**

**Q: `AtomicU64::fetch_add(1, Relaxed)` と `fetch_add(1, SeqCst)` の違いは?**
どちらも「2 つのスレッドが同じ戻り値を得ない」という意味では atomic だ。違いは **メモリ ordering** にある：`SeqCst` は、他のすべての `SeqCst` 操作とプログラム全体で同期するメモリフェンスを追加する。`Relaxed` は increment 自体の atomicity しか保証せず、他のメモリ操作との同期は提供しない。今回（他の state と論理的に独立したカウンタ）は `Relaxed` で十分、かつ速い。

**Q: malformed input に対して、`EnumValueError` のようなものを返すことはできないか?**
`PrecompileFn` のシグネチャは `fn(...) -> PrecompileResult` で、`PrecompileResult = Result<PrecompileOutput, PrecompileError>` だ。malformed input で `Err(...)` を返すこと自体は *できる* が、それは EVM レベルのエラー（transaction の revert）として伝播する。`Ok` + sentinel 0 にしておけば、呼び出し側のコントラクトが rejection を gracefully にハンドリングできる。**これは設計上の選択だ：precompile のエラーは EVM 致命的にするか、それとも caller から見える形にするか?** 今回のように「ユーザが渡した calldata を validate する」用途では、caller から見える形をデフォルトにするのが良い。

**Q: ちょうど `u64::MAX` のあたりで誰かが order を submit したら?**
そのうち `NEXT_ORDER_ID.fetch_add(1, Relaxed)` が 0 にラップする（u64 を返すので）。その瞬間、次の allocation は sentinel 0 を返してしまい、caller は「rejected」として扱うことになる。`u64` の overflow までは ~1.8e19 orders で、およそ 1800 京 order ぶん — v0 では問題にならない。production ではもっと幅のあるカウンタを使うか、overflow 直前で panic させるべきだ。

## 次のレッスン（L8）

L8 は 1 行のコードと、テスト数個ぶんの作業だ。その 1 行とは：order_id の割り当てと encoding の間に `clob.lock().expect("...").submit(Order { id, account, side, qty, order_type });` を挟むこと。テスト側では、`place_order_rejects_malformed_input` を拡張して、各 rejection の後に `book.depth_bid() == 0` を assert する（submit が配線されたので、ようやく意味のある side-effect チェックになる）。`place_order_returns_nonzero_id_on_valid_input` は `place_order_then_read_best_bid_round_trips` に置き換える — 2 つの precompile でラウンドトリップを行い、`0x...0c1c` 経由の write が `0x...0c1b` 経由の read から見えることを証明する。**そのラウンドトリップが Module 3 の中盤マイルストーンだ。**
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
