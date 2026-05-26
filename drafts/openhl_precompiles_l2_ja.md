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
# レッスン 2 — `clob_read_best_bid` — 最初の本物の precompile

## ゴール

このレッスンで掴む概念:

- **REVM の `PrecompileFn` シグネチャ `fn(&[u8], u64, u64) -> PrecompileResult`。** 関数ポインタ (クロージャではない) で、3 つの引数 (input、gas_limit、reservoir) は固定。registry は関数ポインタを保持するため、precompile はこの形に正確に従う必要がある。
- **Solidity ABI の 32-byte slot レイアウト。** `(uint256, uint256)` は合計 64 バイト、big-endian、低位バイトは index 31/63。wire format をこれに合わせれば Solidity コントラクトがそのまま `abi.decode` できる。
- **ハードコードした stub が「接続テスト」と「内容テスト」を分割する道具。** `(100, 10)` を返す (`unimplemented!()` ではなく) ことで、L3 は precompile の **到達可能性** だけを単独で検証できる。「正しい値を返すか」(L4-L6 の責務) とは分離される。
- **`base.clone()` による extend-not-replace。** 標準の precompile セットをラップすることで ECDSA recovery / SHA-256 などが登録された状態を保てる。新規に `Precompiles::default()` を作ってしまうと、これらが暗黙のうちに消えてしまう。
- **address は `pub` const、gas cost は private const。** 呼び出し側は precompile を *call* する必要がある (address が必要)。gas は EVM が内部で処理する (caller はコストを知る必要がない)。可視性は API surface に対応する。

検証：

```bash
cargo check -p openhl-evm
```

…も引き続きコンパイルが通る。

具体的な変更:

`precompiles/mod.rs` がついに **Stage 9a の完成版** になる:

- 定数 `CLOB_READ_BEST_BID: Address = 0x...0c1b` — precompile の address。
- 定数 `CLOB_BASE_GAS_COST: u64 = 500` — precompile call ごとの最小 gas 料金。
- 関数 `read_best_bid(input, gas_limit, reservoir) -> PrecompileResult` — 64 バイトで hardcoded な `(price=100, qty=10)` を返す。
- `openhl_precompiles` 関数 (もう passthrough ではない) が、base set を新しい precompile で extend する。

追加は ~40 LOC。precompile は **登録されたが、まだ live な CLOB state には接続されていない** — hardcoded な値を返すだけだ。これは意図的。L3 で「precompile が EVM 実行から **到達可能** であること」をテストし、L4-L5 で hardcoded 値を live な CLOB read に差し替える。**関数を先に、中身は後で** — L1 の passthrough と同じ段階的パターンだ。

## おさらい

L1 後の状態:

```rust
// crates/evm/src/precompiles/mod.rs (passthrough stub)
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    base.clone()
}
```

関数のシグネチャは固定 (L1 で契約を確定済み)、body は入力を clone するだけ。L2 で body を変更する — 同じシグネチャ、中身を増やす形になる。

## 計画

`crates/evm/src/precompiles/mod.rs` の中で 4 つやる:

1. **import を拡張** — `alloy_evm::revm::precompile` から `Precompile` / `PrecompileId` / `PrecompileOutput` / `PrecompileResult` を、`alloy_primitives` から `address` / `Address` / `Bytes` を追加。
2. **address 定数を追加** — `CLOB_READ_BEST_BID: Address = 0x000...0c1b`。consumer (とテスト) が名前で precompile を call できるよう public にする。
3. **gas-cost 定数 + `read_best_bid` 関数を追加** — どちらも private。関数は hardcoded な `(price=100, qty=10)` を 64 バイトの ABI encoding で返す。
4. **passthrough を置き換え** — `openhl_precompiles` が base set を clone し、新しい precompile 登録で `extend` するようにする。

このレッスン後の precompile は **callable** だが **dumb** だ — book の状態に関わらず同じ答えを返す。callable であることを証明するのが L3、smart にするのが L4-L5。

> 🛑 **考えてみよう。** スクロールする前に: Solidity からの EVM call は `staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)` の形になる。precompile は 64 バイト (u256 が 2 個) を返す。**なぜ 64 バイトなのか? price も quantity も u32 に収まるのだから 8 バイト (u32 が 2 個) で十分なはずだ。** ヒント: Solidity がネイティブに返す型を考えてみる。

(答え: Solidity の ABI encoding では、`returns(uint256, uint256)` は 64 バイトだ — 各値は、実際に必要な bit 数に関わらず **常に** 32 バイトを占める。u64 の price は実体としては 8 バイトに収まるが、ABI は 32 バイトに pad する。仮に 8 バイトを返したら、Solidity 側は malformed な `uint256` として解釈して revert するだろう。**wire format は内部表現ではなく Solidity の ABI に合わせる。**)

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

新しく入る型・マクロは 6 個:

- **`Precompile`** — `Address` と `PrecompileFn` をペアにする wrapper。Precompiles set はこの形で保存している。
- **`PrecompileId`** — 識別子 (主にデバッグ / tracing 用)。`PrecompileId::custom("clob_read_best_bid")` の形で使う。
- **`PrecompileOutput`** — precompile から返る成功型。消費 gas、出力バイト、残 gas reserve を運ぶ。
- **`PrecompileResult`** — `Result<PrecompileOutput, PrecompileError>`。v0 ではエラーを返さないので常に `Ok(...)` を返す。
- **`address` マクロ** — `address!("0x...")` でコンパイル時に const な `Address` を作る。
- **`Address` / `Bytes`** — EVM コードで頻出する 2 つの byte-array 型。

> 🛑 **やりがちな勘違い。** 「address なんて `[u8; 20]` で済むのでは? `alloy_primitives::Address` を経由しなくていいのでは?」 — **ダメ。EVM エコシステムは `Address` で標準化されていて、`Precompile::new` もそれを要求する。** `[u8; 20]` を渡そうとすると型チェックで弾かれるか、どこかに `.into()` 変換を挟む羽目になる。EVM-address の canonical な型は `Address` だ。これを使う。

### Step 2: Precompile address の定数を追加

import の後、関数定義の前に追加する:

```rust
/// Address of the "read best bid" precompile.
///
/// Solidity call shape: `staticcall(gas, 0x...0c1b, calldata=empty, ...) → (price: u256, qty: u256)`
pub const CLOB_READ_BEST_BID: Address = address!("0x0000000000000000000000000000000000000c1b");

/// The minimum gas charge for invoking a CLOB precompile. Tuned later.
const CLOB_BASE_GAS_COST: u64 = 500;
```

定数は 2 つ:

- **`CLOB_READ_BEST_BID`** — **`pub`**。テスト (L3) と下流の caller がこの address を call する必要があるから公開する。`0x...0c1b` は「CLB」(CLOB) のニーモニック。慣習はこう:
  - address `1-9` は Ethereum 標準 precompile (ECDSA recovery、SHA-256 など) が占有
  - 衝突を避けるため `0x0c1b` 以降に固める
- **`CLOB_BASE_GAS_COST`** — **private**、内部用のコスト値。500 gas は CLOB precompile への呼び出しごとの最低料金で、実際の EVM 計算では memory expansion や per-byte コストもチャージされるが、これはあくまでベース部分だけだ。

`pub` と private を分けるのは意図的。外部 caller は address を気にする必要があるが (precompile を **call する** ため)、gas cost は気にしなくていい (EVM が dispatch 中に処理する)。

### Step 3: `read_best_bid` 関数を書く

定数の下に書く:

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

body を上から見ていく:

1. **`vec![0u8; 64]`** — 64 個のゼロバイト。`(uint256, uint256)` の ABI shape は 32 バイトのブロック 2 つ。
2. **`out[31] = 100`** — 最初の 32 バイトブロックの最右バイトに price (100) を書く。big-endian の u256 は、上位バイトがゼロで、下位バイト (index 31) に実値が来る形だ。qty も同様に index 63 に書く。

   64 バイトバッファ全体を 1 枚に展開すると、なぜ index 31 と 63 が「実値の書き込み点」になるのかが視覚で押さえられる:

   ```
                       ┌───── 第 1 スロット: price (u256, big-endian) ─────┐ ┌───── 第 2 スロット: qty (u256, big-endian) ─────┐
   byte index:          0    1    2    ...   29   30   31     32   33   ...   60   61   62   63
                       ┌────┬────┬────┬───┬────┬────┬────┐  ┌────┬────┬───┬────┬────┬────┬────┐
   value (hex):        │ 00 │ 00 │ 00 │...│ 00 │ 00 │ 64 │  │ 00 │ 00 │...│ 00 │ 00 │ 00 │ 0a │
                       └────┴────┴────┴───┴────┴────┴────┘  └────┴────┴───┴────┴────┴────┴────┘
                        ↑    ↑    ↑                   ↑     ↑                              ↑
                        │    │    │                   │     │                              │
                        高位 ← (ゼロパディング) ←   低位    高位 ← (ゼロパディング) ←       低位
                                                100 = 0x64                              10 = 0x0a
                                            (price はここに着地)                   (qty はここに着地)
   ```

   ポイントは「**u256 は 32 バイト固定幅で big-endian。実値が `u64` (8 バイト) や `u32` (4 バイト) に収まる小さい数でも、左側 (高位) はゼロパディングで埋まり、右端 (低位、index 31 と 63) に実値が来る**」。Solidity の `(uint256, uint256)` のレイアウトに wire format を合わせる、というのはこの 1 枚を踏襲しているに過ぎない。

3. **`PrecompileOutput::new(CLOB_BASE_GAS_COST, Bytes::from(out), 0)`** — output を組み立てる:
   - 第 1 引数: 消費 gas (500 をチャージ)。
   - 第 2 引数: output バイト (64 バイトの buffer)。
   - 第 3 引数: reservoir (追加 budget)。今は 0 を渡す。

関数の 3 引数はすべて `_` 接頭辞 (未使用) を付けてある。v0 の stub は:
- input を読まない (call は empty calldata で来る)。
- gas_limit を見ない (overflow チェックは EVM 側がやる)。
- reservoir を無視する (今は不要な advanced 機能)。

`#[allow(clippy::unnecessary_wraps)]` は「この関数は常に `Ok(...)` を返すのだから、unwrap した型を直接返せ」という lint を黙らせる。**unwrap した型にはできない** — `PrecompileFn` trait のシグネチャが `PrecompileResult` を **要求する** からだ。ここでは lint のほうが間違っていて、この属性がそれに対する正しい応答。

> 🛑 **やりがちな勘違い。** 「hardcoded な `100, 10` は TODO 臭がする。L4 で本物のデータが入るまでは `unimplemented!()` にしておくべきでは?」 — **その hardcoded 値こそが Stage 9a の本質だ。** これがあるからこそ、**次の** レッスン (L3) で「CLOB state の注入がまだ動いていなくても、precompile が EVM 実行から **到達可能** であること」を証明できる。`unimplemented!()` のまま放置すると、L3 のテストが panic してしまい、「precompile は呼べるのか?」と「正しい値を返すのか?」が切り分けられなくなる。**hardcoded な stub があるおかげで、中身をテストする前に接続をテストできる。**

### Step 4: passthrough の `openhl_precompiles` を置き換え

現在の passthrough 関数を探す:

```rust
#[must_use]
pub fn openhl_precompiles(base: &Precompiles) -> Precompiles {
    // L2 will replace this with `let mut precompiles = base.clone();
    // precompiles.extend([...]); precompiles`.
    base.clone()
}
```

完全版の実装に置き換える:

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

body は 3 行:

1. **`let mut precompiles = base.clone()`** — base set から始める。`base` は `&Precompiles` なので直接 mutate できない。clone することで、所有権付きで mutable なコピーを得るのが唯一の手段。
2. **`precompiles.extend([Precompile::new(...)])`** — 自前の precompile を set に追加する。`extend` は `Precompile` の iterator を受け取り、長さ 1 の array を渡せば array が `IntoIterator` を実装しているので動く。
3. **`precompiles` を return** — 追加分込みの所有権付き `Precompiles`。

`Precompile::new(...)` の呼び出しは、3 つの部品から新規エントリを作る:
- `PrecompileId` (human-readable な名前、デバッグ/tracing 用)。
- 登録先となる `Address`。
- 呼び出す関数。

L7 以降では `clob_place_order` 用に 2 つ目の `Precompile::new(...)` を追加する。パターンは同じ: clone、extend、return だ。

## テスト

```bash
cargo check -p openhl-evm
```

引き続き clean に通る。precompile の登録はできたが、これを exercise するテストはまだない — それは L3 の仕事。

任意で、precompile address が正しく export されているか確認してもよい:

```bash
grep -r "CLOB_READ_BEST_BID" crates/evm/src/
# 報告するはず: precompiles/mod.rs が const を宣言
```

よくあるエラーと対処:

- **`error[E0432]: unresolved import 'alloy_evm::revm::precompile::Precompile'`** — import 一覧のタイポ。正しいパスは `alloy_evm::revm::precompile::{Precompile, PrecompileId, PrecompileOutput, PrecompileResult, Precompiles}`。
- **`error: expected struct, found macro 'address'`** — `address` を間違った場所から import している。これは `alloy_primitives` の `address!` マクロなので、import 一覧に `address` (小文字、マクロ側) を含めること。
- **`out[31] = 100u8` の overflow lint** — `100` はすでに `i32` で、`u8` への変換は問題ない。clippy が文句を言うなら `out[31] = 100;` (型注釈なし) でよい。
- **`out[63] = 10` が assertion に出てこない** — `read_best_bid` が間違った index を読んでいる。index 31 が price (最初の 32 バイト)、index 63 が qty (2 つ目の 32 バイト) であることを再確認する。
- **`#[allow(clippy::unnecessary_wraps)]` を書いても clippy が文句を言う** — 属性は外側のブロックではなく関数自体に付ける必要がある。`fn read_best_bid(...)` の直上に置く。

## 設計の振り返り

要となる決定が 3 つ:

1. **address 定数は `pub`、gas-cost 定数は private。** 外部の caller (テストやスマートコントラクト) は precompile を **どこに** call するかは知る必要があるが、**いくらコストがかかるか** は知る必要がない — それは EVM が内部で処理する。public と private の分け方は API の表面そのものを反映している。

2. **関数は `(&[u8], u64, u64)` を受け取るが、v0 ではどれも使わない。** `PrecompileFn` trait がシグネチャを固定しているので、使わなくてもこれらの引数を受け取るしかない。underscore-prefix の慣習 (`_input`、`_gas_limit`、`_reservoir`) で、コンパイラに「存在は認識しているが今は使わない」と伝える。L7 以降では `_input` を order データの decode に使う。

3. **64-byte の output は ABI の shape であって、内部表現の shape ではない。** 64-bit の price は 8 バイトに収まるが、Solidity は `(uint256, uint256)` を合計 64 バイトとして期待する。wire format を Solidity の ABI に合わせておけば、`read_best_bid()` は Solidity 側で直接書ける形になる。内部の `Qty(u64)` 型は実装詳細にすぎない。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 1761d4d
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

L2 を終えると、`precompiles/mod.rs` は `1761d4d` の参照と **機能的に同一**になる。違いは doc コメントの言い回しくらいのはず。

main に戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜ enum variant ではなく `PrecompileId::custom("clob_read_best_bid")` を使う?**
`PrecompileId` は不透明な識別子で、主に REVM の logging/tracing 層で使われるものだから。custom precompile は標準セットの外にあるので、文字列名で識別する。文字列は human-readable なので、precompile call が trace に現れたときに numeric variant ではなく「clob_read_best_bid」が見える。

**Q: エラーハンドリングを追加したくなったら?**
return パスを `Ok(...)` から `Err(PrecompileError::Other(...))` に変えればよい。trait 自体はすでに対応している — v0 では失敗するモードがないだけだ。L4-L5 で read precompile が live state にアクセスするようになると、ありうるエラーの 1 つは「CLOB の lock が poisoned」になる — それを `PrecompileError` にマップする。

**Q: なぜ `Bytes::from(out)` が必要なのか — `Vec<u8>` を直接 return してはだめなのか?**
ダメ。trait が `Bytes` (alloy の reference-counted な byte buffer。Rust 標準の `Vec<u8>` ではない) を要求する。`Bytes::from(vec)` で変換できる。wrapper 型を使う理由は、`Bytes` は安く clone でき、再 allocation なしに EVM 内部のあちこちで共有できるからだ。

**Q: スマートコントラクトは calldata で read_best_bid に引数を渡せる?**
Yes — calldata が `_input` パラメータに入る。v0 では precompile がそれを無視している (どんな入力でも best bid を返す) が、production コードでは calldata を使って **どの market の** best bid を読むかを指定する。現状は single-market のセットアップで、multi-market 対応には `_input` の decode を足す。

## 次のレッスン (L3)

precompile は登録されたが、まだ **テストされていない**。L3 では executor builder を NodeBuilder に組み込み、Reth node を custom EVM で boot し、precompile が `CLOB_READ_BEST_BID` で callable であることを verify する smoke test を書く。テストは小さい (~60 LOC) が、全体のツールチェーンを exercise する — custom EVM、executor builder、NodeBuilder 統合、EVM call dispatch、precompile registry の lookup。L3 を終えれば、スマートコントラクトが `0x...0c1b` を call すると `(100, 10)` を返す Reth node が手に入る。
````

---

## Seed ファイルスロット

L2 は Module 1 (Custom EVM bootstrap) sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 2 — clob_read_best_bid — 最初の本物の precompile',
  slug: 'openhl-precompiles-read-hardcoded-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 2 — \`clob_read_best_bid\` — 最初の本物の precompile\n\n...`
},
```

## SHA pinning 規律

同じ SHA `1761d4d` (Stage 9a)。L2 後、`precompiles/mod.rs` が参照と doc コメント以外機能的に同一。
