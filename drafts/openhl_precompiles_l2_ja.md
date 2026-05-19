# OpenHL Precompile を作る — L2 draft (JA) — build-along

> openhl SHA `1761d4d` (Stage 9a — custom EVM with CLOB precompile boots via NodeBuilder) 基準。
> コース: `building-openhl-precompiles-ja` (track: `reth-l1-architect`)。

---

## L2 — `openhl-precompiles-read-hardcoded-ja`

- **モジュール:** 1 (Custom EVM bootstrap), モジュール内 sortOrder 1
- **コース全体 sortOrder:** 1 (12 レッスン中 2 番目)
- **所要時間:** 30 分
- **XP:** 60
- **type:** CONTENT

### Content

````markdown
# レッスン 2 — `clob_read_best_bid` — 最初の real precompile

## ゴール

このレッスンの終わりに:

```bash
cargo check -p openhl-evm
```

…依然コンパイル。`precompiles/mod.rs` が今 **full な Stage 9a 版**:

- 定数 `CLOB_READ_BEST_BID: Address = 0x...0c1b` — precompile の address。
- 定数 `CLOB_BASE_GAS_COST: u64 = 500` — precompile call ごとの最小 gas 料金。
- 関数 `read_best_bid(input, gas_limit, reservoir) -> PrecompileResult` — 64 バイトで hardcoded `(price=100, qty=10)` を返す。
- `openhl_precompiles` 関数 (もはや passthrough ではない) が base set を新規 precompile で extend する。

約 40 LOC 追加。Precompile は **register されたが、まだ live CLOB state に配線されていない** — hardcoded 値を返す。意図的: L3 で precompile が EVM 実行から **到達可能** であることをテスト; L4-L5 で hardcoded 値を live CLOB read に swap する。**先に関数、content は後** — L1 の passthrough と同じ incremental パターン。

## おさらい

L1 後:

```rust
// crates/evm/src/precompiles/mod.rs (passthrough stub)
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    base.clone()
}
```

関数 signature は固定 (L1 が契約を設定); body は入力を clone するだけ。L2 が body を変更 — 同じ signature、中身がより多い。

## 計画

`crates/evm/src/precompiles/mod.rs` 内で 4 つ:

1. **Import を expand** — `alloy_evm::revm::precompile` から `Precompile`、`PrecompileId`、`PrecompileOutput`、`PrecompileResult` を、`alloy_primitives` から `address`、`Address`、`Bytes` を追加。
2. **Address 定数を追加** — `CLOB_READ_BEST_BID: Address = 0x000...0c1b`。Public、consumer (とテスト) が名前で precompile を call できるように。
3. **Gas-cost 定数 + `read_best_bid` 関数を追加** — private。関数が hardcoded `(price=100, qty=10)` を 64 バイト ABI-encode で返す。
4. **Passthrough を置き換え** — `openhl_precompiles` が base set を clone、新 precompile 登録で `extend`。

Precompile はこのレッスン後に **callable** だが **dumb** — book 状態に関わらず同じ答えを返す。L3 が callable を証明; L4-L5 が smart にする。

> 🛑 **考えてみよう。** スクロールする前に: Solidity からの EVM call shape は `staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)`。Precompile が 64 バイト (2 個の u256) を返す。**なぜ 64 バイトで 8 バイト (2 個の u32) ではない — price と quantity は u32 に収まるはず?** ヒント: Solidity が native に返す型を考える。

(答え: Solidity の ABI encoding `returns(uint256, uint256)` は 64 バイト — 各値は実際に必要な bit 数に関わらず **常に** 32 バイト。`u64` price は 8 バイトに収まるが ABI は 32 バイトに pad する。8 バイトを返したら、Solidity が malformed な `uint256` として解釈して多分 revert する。**Wire format は Solidity の ABI とマッチする、内部表現ではなく。**)

## 手順

### Step 1: Import を expand

`crates/evm/src/precompiles/mod.rs` を開く。L1 の現在の import:

```rust
use alloy_evm::revm::precompile::Precompiles;
```

次に置き換え:

```rust
use alloy_evm::revm::precompile::{
    Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles,
};
use alloy_primitives::{address, Address, Bytes};
```

6 個の新規型/マクロ:

- **`Precompile`** — `Address` と `PrecompileFn` をペアにする wrapper。Precompiles set がこれらを保存する。
- **`PrecompileId`** — 識別子 (主にデバッグ / tracing 用)。`PrecompileId::custom("clob_read_best_bid")` を使う。
- **`PrecompileOutput`** — precompile から返される success 型。Gas 消費 + 出力バイト + 残 gas reserve を運ぶ。
- **`PrecompileResult`** — `Result<PrecompileOutput, PrecompileError>`。v0 は error しないので常に `Ok(...)` を返す。
- **`address` マクロ** — `address!("0x...")` がコンパイル時に const `Address` を作る。
- **`Address`、`Bytes`** — EVM コードで至るところに使われる 2 つの byte-array 型。

> 🛑 **やりがちな勘違い。** 「address に `[u8; 20]` を使い `alloy_primitives::Address` をスキップできる?」 **ダメ — EVM エコシステムが `Address` を標準化し、`Precompile::new` がそれを要求する。** `[u8; 20]` を渡そうとすると型 check が失敗するか、どこかしらに `.into()` 変換が必要。`Address` が canonical な EVM-address 型; それを使う。

### Step 2: Precompile address 定数を追加

Import の後、関数の前に追加:

```rust
/// Address of the "read best bid" precompile.
///
/// Solidity call shape: `staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)`
pub const CLOB_READ_BEST_BID: Address = address!("0x0000000000000000000000000000000000000c1b");

/// The minimum gas charge for invoking a CLOB precompile. Tuned later.
const CLOB_BASE_GAS_COST: u64 = 500;
```

2 個の定数:

- **`CLOB_READ_BEST_BID`** — **`pub`**、テスト (L3) と下流 caller がこの address を call する必要があるから。`0x...0c1b` は「CLB」(CLOB) のニーモニック。慣習:
  - address `1-9` は Ethereum 標準 precompile (ECDSA recovery、SHA-256 等)
  - 衝突を避けて 0x0c1b+ に保つ
- **`CLOB_BASE_GAS_COST`** — **private**、内部コスト数。500 gas は CLOB precompile 何でもへの per-call charge。実 EVM 計算は memory expansion + per-byte コストも charge するが、これは base だけ。

`pub` vs private split は意図的。外部 caller は address を気にする (precompile を **call する** ため); gas cost は気にしない (EVM が dispatch 中に処理する)。

### Step 3: `read_best_bid` 関数を書く

定数の下:

```rust
/// Stage 9a stub: returns a hardcoded best bid so the precompile is callable
/// without requiring live CLOB state injection. Stage 9b replaces this with
/// an `Arc<Mutex<Book>>`-aware closure captured into the precompile.
///
/// `PrecompileFn` signature is `fn(&[u8], u64, u64) -> PrecompileResult`;
/// the third arg is a `reservoir` value (extra gas budget) that we ignore
/// at v0.
///
/// Encoding: 64 bytes total
///   bytes  0..32  big-endian u256 price (hardcoded 100)
///   bytes 32..64  big-endian u256 qty   (hardcoded 10)
// `PrecompileFn` signature mandates the `PrecompileResult` (i.e. `Result`)
// return type. Our v0 stub never errors — gas accounting is the EVM's
// responsibility — but the wrapper is structurally required.
#[allow(clippy::unnecessary_wraps)]
fn read_best_bid(_input: &[u8], _gas_limit: u64, _reservoir: u64) -> PrecompileResult {
    let mut out = vec![0u8; 64];
    // price = 100 (big-endian u256, rightmost byte holds the value)
    out[31] = 100;
    // qty = 10
    out[63] = 10;

    Ok(PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0))
}
```

Body を walk:

1. **`vec![0u8; 64]`** — 64 個のゼロバイト。`(uint256, uint256)` の ABI shape は 32 バイト block 2 個。
2. **`out[31] = 100`** — 最初の 32 バイト block の最右バイトに price (100) を書く。Big-endian u256 means 上位バイトがゼロ、低位バイト (index 31) が実値を持つ。qty も index 63 で同じ。
3. **`PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)`** — output を build:
   - 第 1 引数: 消費 gas (500 charge)。
   - 第 2 引数: output バイト (64 バイト buffer)。
   - 第 3 引数: reservoir (extra budget); 0 を使う。

関数の 3 引数すべてが `_` 接頭辞 (未使用)、v0 stub は:
- input を読まない (call は empty calldata)。
- gas_limit を respect しない (EVM が overflow check を処理)。
- reservoir を無視 (必要ない advanced feature)。

`#[allow(clippy::unnecessary_wraps)]` が「この関数は常に `Ok(...)` を返す、unwrap した型を返せ」という lint を silence する。**unwrap できない** のは、`PrecompileFn` trait signature が `PrecompileResult` を **要求する** から。Lint がここでは間違い; この属性が正しい応答。

> 🛑 **やりがちな勘違い。** 「hardcoded `100, 10` は TODO に感じる — L4 が real データを持つまで `unimplemented!()` のままにすべき?」 **Hardcoded 値が Stage 9a の本質。** それが **次の** レッスン (L3) で、CLOB state 注入がまだ動かなくても precompile が **到達可能** であることを証明できるようにする。`unimplemented!()` のままにすると L3 テストが panic し、「precompile は callable か?」と「正しい値を返すか?」を分離できない。**Hardcoded stub が、内容をテストする前に配線をテストできるようにする。**

### Step 4: Passthrough `openhl_precompiles` を置き換え

現在の passthrough 関数を見つける:

```rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    // L2 will replace this with `let mut precompiles = base.clone();
    // precompiles.extend([...]); precompiles`.
    base.clone()
}
```

Full な実装に置き換え:

```rust
/// Build a `Precompiles` set that extends Reth's standard precompiles with
/// openhl's CLOB-reading additions. The base set is parameterized over the
/// hardfork's spec id so we inherit Ethereum's evolution (e.g., the
/// BLS-12-381 precompiles activated in Prague).
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

Body 3 行:

1. **`let mut precompiles = base.clone()`** — base set で開始。`base` を直接 mutate できない (`&Precompiles`); clone が owned で mutable な copy を得る唯一の方法。
2. **`precompiles.extend([Precompile::new(...)])`** — 我々の precompile を set に追加。`extend` は `Precompile` の iterator を受け取る; 長さ 1 の array を渡すと、array が `IntoIterator` を impl するので動く。
3. **`precompiles` を return** — 我々の追加を含む owned `Precompiles`。

`Precompile::new(...)` call は 3 piece から新規 entry を作る:
- `PrecompileId` (human-readable 名、デバッグ/tracing 用)。
- 登録される `Address`。
- Call する関数。

L7+ で `clob_place_order` 用に 2 つ目の `Precompile::new(...)` を追加する。パターンは続く: clone、extend、return。

## テスト

```bash
cargo check -p openhl-evm
```

依然 clean。Precompile は今 register されたが、まだそれを exercise するテストがない — それは L3。

オプションで precompile address が正しく export されているか verify:

```bash
grep -r "CLOB_READ_BEST_BID" crates/evm/src/
# 報告するはず: precompiles/mod.rs が const を宣言
```

よくあるエラーと対処:

- **`error[E0432]: unresolved import 'alloy_evm::revm::precompile::Precompile'`** — import list の typo。正しい path は `alloy_evm::revm::precompile::{Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles}`。
- **`error: expected struct, found macro 'address'`** — `address` を間違った場所から import。`alloy_primitives` の `address!` マクロ; import list に `address` (小文字、マクロ) を含めること。
- **`out[31] = 100u8` overflow lint** — `100` は既に `i32`、`u8` への変換は fine、だが clippy が文句を言ったら `out[31] = 100;` (型注釈不要)。
- **`out[63] = 10` が assertion に現れない** — `read_best_bid` が間違った index を読んでいる。Index 31 が price (最初の 32 バイト) で index 63 が qty (2 番目の 32 バイト) を再確認。
- **`#[allow(clippy::unnecessary_wraps)]` でも clippy が文句** — 属性は関数に付ける、containing block ではない。`fn read_best_bid(...)` の直上に置く。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Address 定数は `pub`; gas-cost 定数は private。** 外部 caller (test、smart contract) は precompile を **どこに** call するか知る必要がある。**どれだけのコスト** が必要かは知る必要なし — EVM が内部で処理する。Public vs private のマッピングが API 表面を反映する。

2. **関数は `(&[u8], u64, u64)` を取る — v0 では全部未使用。** `PrecompileFn` trait が signature を固定する; 使わなくてもこれら引数を受け付けるしかない。Underscore-prefix 慣習 (`_input`、`_gas_limit`、`_reservoir`) が compiler に「存在は知っている、まだ必要なし」と伝える。L7+ は `_input` を order データの decode に使う。

3. **64-byte output は ABI shape、内部 shape ではない。** 64-bit price は 8 バイトに収まるが、Solidity は `(uint256, uint256)` を合計 64 バイトとして期待する。Wire format で ABI にマッチすると `read_best_bid()` を Solidity で直接書ける。内部 `Qty(u64)` 型は実装詳細。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

L2 後、`precompiles/mod.rs` が `1761d4d` の参照と **機能的に同一**。Doc コメントの言い回しのみ異なる。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜ `PrecompileId::custom("clob_read_best_bid")` で enum variant ではない?**
`PrecompileId` が opaque な identifier で、REVM の logging/tracing layer が主に使うから。Custom precompile は文字列名を使う、標準セットの外だから。文字列は human-readable; precompile call が trace に現れたら numeric variant ではなく「clob_read_best_bid」が見える。

**Q: error handling を追加したい場合?**
Return path を `Ok(...)` から `Err(PrecompileError::Other(...))` に変える。Trait は既にこれをサポート; v0 で failure mode を持たないだけ。Read precompile が live state を得る (L4-L5) と、可能なエラー 1 つは「CLOB lock が poisoned」 — それが `PrecompileError` にマップされる。

**Q: なぜ `Bytes::from(out)` が必要 — `Vec<u8>` を直接 return できる?**
できない、trait が `Bytes` (alloy の reference-counted byte buffer、Rust の std `Vec<u8>` ではない) を欲しがる。`Bytes::from(vec)` が変換する。Wrapper 型の理由: `Bytes` は安く clone され、re-allocation せずに EVM 内部全体で共有できる。

**Q: smart contract が calldata で read_best_bid に引数を渡せる?**
Yes — calldata が `_input` パラメータ。v0 では precompile がそれを無視 (best bid を関わらず返す)、production code は calldata を使って **どの market の** best bid を読むか指定する。現在のセットアップは single-market; multi-market サポートは `_input` decoding を追加する。

## 次のレッスン (L3)

Precompile は register されたが **テストされていない**。L3 で executor builder を NodeBuilder に配線 + Reth node を custom EVM で boot し、precompile が `CLOB_READ_BEST_BID` で callable であることを verify する smoke test を書く。テストは小さい (~60 LOC) が full toolchain を exercise する: custom EVM、executor builder、NodeBuilder 統合、EVM call dispatch、precompile registry lookup。L3 後、smart contract が `0x...0c1b` を call して `(100, 10)` を返してくる Reth node がある。
````

---

## Seed ファイルスロット

L2 は Module 1 (Custom EVM bootstrap) sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 2 — clob_read_best_bid — 最初の real precompile',
  slug: 'openhl-precompiles-read-hardcoded-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 2 — \`clob_read_best_bid\` — 最初の real precompile\n\n...`
},
```

## SHA pinning 規律

同じ SHA `1761d4d` (Stage 9a)。L2 後、`precompiles/mod.rs` が参照と doc コメント以外機能的に同一。
