# Building OpenHL Precompiles — L5 draft (JA) — build-along

> openhl SHA `b635ef7`（Stage 9b — CLOB read precompile に live CLOB state を配線）に対するドラフト。
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
# レッスン 5 — `read_best_bid` が配線を読む — `current_best_bid()` に差し替え

## ゴール

このレッスンが終わると：

```bash
cargo test -p openhl-evm --release
```

…が引き続き通る（42 tests）。ただし内部では、precompile はもう**live state を読む** — ハードコード値ではなく：

- **`read_best_bid` 本体を差し替え** — `let mut out = vec![0, 0, ..., 100, 0, 0, ..., 10]` のハードコードを捨て、`if let Some((price, qty)) = current_best_bid() { ... out に書き込む ... }` に。CLOB 未インストール → 64-byte の zero（「未初期化 perp market」セマンティクスに一致）。
- **L3 の `read_best_bid_returns_hardcoded_price_and_qty` テストを rename** → `read_best_bid_returns_zero_when_no_clob_installed`。形は同じ、100/10 でなく zero をアサート。
- **L3 の `registered_precompile_is_invokable_via_registry` を更新** — 同じロジック。ただしまず CLOB を uninstall して zero output を期待。
- **新規 `static TEST_SERIALIZER: Mutex<()>` をテストモジュール先頭に追加** — `CLOB_STATE` を触るテストはまずこのロックを取る。並列 `cargo test` だと global が競合するため。

course-7 + L3 の callability テストは引き続き通る。アサーションだけ変わる。**大きな証明 — 「live CLOB データが EVM 出力までラウンドトリップする」 — は L6 の仕事。** L5 は差し替え。L6 が end-to-end の動作を実証。

## おさらい

L4 終了時点：

- `Book` に `best_bid_with_qty` / `best_ask_with_qty`。
- `precompiles/mod.rs` に `CLOB_STATE` static + 3 つのモジュール関数。
- `LiveRethEvmBridge::new` が `install_clob(Arc::clone(&clob))` を呼ぶ。
- **だが `read_best_bid` はまだハードコードの `(100, 10)` を返す** — 配管は誰も使っていない。

L5 でついに使う。

## プラン

`crates/evm/src/precompiles/mod.rs` に 4 つの編集：

1. **`read_best_bid` 本体を差し替え** — `current_best_bid()` を呼んで、`Some` のときだけ非ゼロ byte を書き込む。
2. **関数のドキュメントコメントを更新** — ハードコード文言を消し、「no bid または CLOB 未インストールなら 0」セマンティクスに置き換え。
3. **テストモジュールに `static TEST_SERIALIZER: Mutex<()>` を追加。**
4. **L3 最初のテストを rename + 書き換え** + **L3 最後のテストを更新** — 両方 `CLOB_STATE` を触るので両方 serializer ロックを取り、まず `uninstall_clob()` を呼ぶ。

モジュールレベルのシグネチャは変わらない。registry テスト（`openhl_precompiles_registers_clob_address`）は `CLOB_STATE` を触らないのでそのまま。

> 🛑 **考えてみよう。** スクロール前に — `cargo test` はデフォルトで**並列実行**（典型的には logical CPU 1 つにつき 1 スレッド）。我々のテスト 2 つが `CLOB_STATE` を read or write する。**serialize しないとどんな failure mode が出る？** ヒント：「あるテストが `None` を期待しているときに、瞬間的に `Some(clob_A)` になりうる」状況を想像してみる。

（答え：**flaky test**。テスト A が CLOB を install、テスト B は「CLOB なし → zero output」を assert したい — でも B が A の `install_clob` と `uninstall_clob` の間に走ったら、B は A の CLOB を見て間違った値を assert する。失敗率はテストスケジューリング次第 — 時々 0%、時々 30%。CI がランダムに flake する。`TEST_SERIALIZER` mutex パターンはこれらのテストを 1 つずつ走らせて race を排除。**コスト：0.0 秒（これらのテストはマイクロ秒で終わる）。便益：deterministic な CI。**）

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

3 つの変化：

- **`let mut out = vec![0u8; 64]`** — 同じ出発点、全 zero。
- **`if let Some((price, qty)) = current_best_bid()`** — global を read。`None` なら body を short-circuit、`out` は zero のまま。
- **`out[24..32].copy_from_slice(&price.0.to_be_bytes())`** — `Price` は `u64` をラップ。`to_be_bytes()` は `[u8; 8]` を返す。その 8 bytes を 32-byte word の**最後の 8 bytes** (position 24..32) にコピー。先頭 24 bytes は zero — それが u64 値の big-endian u256 エンコーディング。
- **qty も同じく `out[56..64]`** — 2 つ目の 32-byte word、最後の 8 bytes。
- **ハードコードの `out[31] = 100` と `out[63] = 10` は消える。**

> 🛑 **やりがちな勘違い。** 「明快さのために `U256::from(price.0).to_be_bytes::<32>().copy_from_slice(...)` でいい？」 **一時的な `[u8; 32]` を allocate してから byte-by-byte でコピー**する。直接 `out[24..32].copy_from_slice(&price.0.to_be_bytes())` なら output buffer に直接書き込んで中間 allocation なし。**同じ結果、半分の仕事。** Precompile は hot path — マイクロ秒が積み重なる。

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

「0 if no bid or no CLOB installed」が肝 — メインネットコントラクトが対応せねばならない API 契約を明文化。**スマートコントラクトは「未インストール」と「empty book」を見分けられない** — 両方とも zero。これは意図的。区別したいなら別経路で liveness を check すべし。

### Step 3: テストモジュールに `TEST_SERIALIZER` を追加

`#[cfg(test)] mod tests` ブロック（L3 で追加した）を開く。`use` 文の後、テスト関数の前に：

```rust
/// Tests in this module touch process-global `CLOB_STATE`. This mutex
/// serializes them so parallel test execution can't observe a torn state.
static TEST_SERIALIZER: Mutex<()> = Mutex::new(());
```

1 行。素の `Mutex<()>`（payload が unit 型 — 値は見ない、ロックだけ）。`CLOB_STATE` を触る各テストは冒頭で：

```rust
let _g = TEST_SERIALIZER.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
```

`unwrap_or_else(PoisonError::into_inner)` パターンが**死活** — これがないと panic したテスト 1 つで mutex が poison し、以降の全テストが `PoisonError` で落ちる。poison から復旧することで「このテストは 1 回 panic した」を「このテストは 1 回 panic したが後続は走る」に変える。復旧したガードも排他アクセスを与える。Poison は signal であって permanent disability ではない。

> 🛑 **やりがちな勘違い。** 「`serial_test` crate の `#[serial]` でいいんじゃ？」 **使えるが、1 個の mutex で済む話に対して dev-dep を増やす。** `serial_test` は proc-macro、属性パース、hash-keyed lock map に手を出す。1 つの global を触る 4 つのテストには、1 行の `static Mutex<()>` がちょうどよい。**複数 global を異なるロック partition で管理したくなったら crate に手を出せばよい — それ以前にはやらない。**

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

L3 との 5 つの差分：

1. **Rename** — 関数名が新セマンティクスを記述。
2. **Doc コメント書き換え** — 「uninstalled = zero」セマンティクスを説明。
3. **1 行目: `TEST_SERIALIZER` を取得。**
4. **2 行目: `uninstall_clob()`。** なぜ？ 前のテストが CLOB を install して clean up し忘れた、もしくは前回の test run が state を残した可能性があるから。`uninstall_clob()` は idempotent — 常に呼んで安全 — そして既知の出発状態を保証する。
5. **アサーション変更** — `U256::from(100u64)` / `U256::from(10u64)` でなく `U256::ZERO`。gas check はそのまま（何を返すかに関わらず precompile は同じ gas を課金）。

> 🛑 **やりがちな勘違い。** 「`uninstall_clob()` を毎テスト先頭で呼ぶのは、既に未インストールなら無駄では？」 **`uninstall_clob` は `*CLOB_STATE.write().expect(...) = None`** — 1 つの取得→解放、マイクロ秒。代替は共有 init 順を持つ global「test setup」関数 — はるかに大きな労力でわずかな節約。**Global state を扱うときの Rust テストの定石は「明示的な per-test reset」。**

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

L3 との 3 つの差分：

1. **`TEST_SERIALIZER` + `uninstall_clob` で開始** — テスト 1 と同じパターン。
2. **Doc コメント** — 追加（L3 にはなかった）。なぜ unit test と並べてこのテストが存在するのか説明。
3. **`assert_eq!(price, U256::ZERO)`** — `U256::from(100u64)` から変更。

真ん中のテスト（`openhl_precompiles_registers_clob_address`）は `CLOB_STATE` を触らない — registry membership だけチェック。**serializer + uninstall を追加してはいけない** — 不要な serialization で微妙な slowdown。

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

L4 と同じ test 数（42）。違うのは：
- precompile を触る 4 つのテストのうち 2 つが `TEST_SERIALIZER` 経由で **serialize** される。
- 修正済みの 2 つのテストは `(100, 10)` でなく **zero output** を assert。

serializer が何を防いでいるか直感したいなら：

```bash
# 一時的に両テストから `let _g = TEST_SERIALIZER.lock()...` の行を削除。
cargo test -p openhl-evm read_best_bid -- --test-threads=8
# 20 回ぐらい走らせる。
for i in $(seq 1 20); do
  cargo test -p openhl-evm read_best_bid -- --test-threads=8 --quiet 2>&1 | grep "test result"
done
```

時々失敗するはず — スケジューリング次第。終わったら戻す。

よくあるエラーと対処：

- **`unused import: Order, OrderId, OrderType, Side`** — L3 のハードコードテストでは使われていた（L5 の zero-output テストでは不要）。**残しておく** — L6 で live-state テストが使う。1 レッスンの unused warning は無害。
  - もし `#[cfg(test)] mod tests` に `use openhl_clob::{...};` が網羅して入っていれば、残しておく。L6 で必要。
- **`error[E0599]: no method named 'lock' found for struct 'Mutex<()>'`** — `Mutex` を別の場所（例：`tokio::sync::Mutex`）から import している。テストモジュールの `use super::*;` で親モジュールから `std::sync::Mutex` が入ってくるはず。
- **1 回通ったあと失敗 — `PoisonError`** — 1 つのテストが `TEST_SERIALIZER` 保持中に panic した。`unwrap_or_else(PoisonError::into_inner)` パターンがこれを復旧する。両テストで正確にこの形になっているか確認。
- **個別に走らせると通る、並列だと落ちる** — `TEST_SERIALIZER` が実際には適用されていない。`let _g = TEST_SERIALIZER.lock().unwrap_or_else(...)` が**最初の文**（`uninstall_clob()` の前）であることを確認。`_g` が途中で drop されると（例：shadow される）テストの途中でロックが解放される。

## 設計の振り返り

ここに焼き込んだ重要な決定 3 つ：

1. **未インストール CLOB は zero を返し、エラーにしない。** メインネット相当は「未初期化 storage slot は zero を返す」 — Solidity コントラクトが自然に処理する。エラーにすると、bootstrap 中（ブリッジが CLOB を install する前）に precompile が呼ばれたら transaction が revert する。Zero を返せば gracefully に degrade — コントラクトは「流動性なし」と見て trade を控える。それが正しい挙動。

2. **`TEST_SERIALIZER` はモジュール単位、global ではない。** `CLOB_STATE` を触らない `live_node.rs` のテストはこれと serialize すべきでない。モジュールローカル mutex で partition を狭く保つ。

3. **テストは末尾でなく先頭で `uninstall_clob()` を呼ぶ。** なぜ対称的でない？ **Panic したテストは cleanup コードを走らせない**から。テスト中 panic すれば CLOB が install されたまま残る。次のテストの「start-of-test reset」が拾う。Live-state テスト（L6）では末尾でも uninstall するが、それは明快さのため — safety net は start-of-test reset。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout b635ef7
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

L5 終了時点であなたのコードは Stage 9b に**かなり近い** — 同じ `read_best_bid` 本体、同じ `TEST_SERIALIZER`、同じ 2 つの更新テスト。残る差分：Stage 9b には `read_best_bid_returns_live_state_when_clob_installed` もある — L6 で追加。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: なぜ `read_best_bid` は CLOB 未インストール時に gas を減らさない？**
条件付きで `current_best_bid()` が `None` なら少ない gas を返す、にできる。が、それは実装詳細を露出する — 攻撃者は gas を測ってあなたの validator が CLOB を install したかを検出できる。一律の `CLOB_BASE_GAS_COST` 課金が標準的「constant-time precompile」パターン。**Gas 課金は state を leak すべきでない。**

**Q: `u64::to_be_bytes()` と `U256::to_be_bytes::<32>()` の違い？**
`u64::to_be_bytes()` は `[u8; 8]` — 8 bytes。`U256::to_be_bytes::<32>()` は `[u8; 32]` — 左 zero-padding した 32 bytes。**我々のケース（8-byte source 値、32-byte destination）では、source 形状の 8 bytes を destination の右端 8 bytes にコピーしたい。** それが `out[24..32].copy_from_slice(&u64_bytes)`。U256 版だと 32 bytes 全部コピー（うち 24 bytes は zero） — 同じ結果、4 倍の仕事。

**Q: `TEST_SERIALIZER` があっても flake する？**
通常の `cargo test` 実行では、しない。Mutex が 2 つの test スレッドが `CLOB_STATE` の修正途中を観測することを防ぐ。それでも flake する edge case：(a) `current_best_bid` 内で panic して mutex が poison（`into_inner` で復旧）、(b) テストモジュール外のコードが `CLOB_STATE` に書き込む（`reth_node.rs` の integration test がいずれ触り始めたら問題 — まだ触っていない）。

**Q: 単に precompile の input bytes を通して CLOB を渡せばいいんじゃ？**
Smart contract は `staticcall(gas, addr, input, output)` で precompile を呼ぶ。Input は contract が組み立てた calldata — **node operator が** CLOB pointer を挿し込む方法はない。Precompile の input bytes は user-controlled であって node-controlled ではない。Process-global state こそが node operator が持つ唯一の注入点。

## 次のレッスン（L6）

配線は通ったが、ラウンドトリップを exercise する test がまだない。L6 で `read_best_bid_returns_live_state_when_clob_installed` を追加：既知の bid を持つ CLOB を install、precompile を呼ぶ、その bid が output bytes にラウンドトリップすることを検証。証明 — `Solidity contract → STATICCALL → EVM dispatch → REVM precompile registry → 我々の関数 → live Book lock → encoded を返す → contract が real data を見る` — ついに end-to-end で実証。これが **Module 2 のマイルストーン**。
````

---

## Seed-file slot

L5 は Module 2 (Read precompile) の sortOrder 1 に入る：

```typescript
{
  title: 'レッスン 5 — read_best_bid が配線を読む — current_best_bid() に差し替え',
  slug: 'openhl-precompiles-swap-to-live-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 40,
  xpReward: 80,
  content: `# レッスン 5 — \`read_best_bid\` が配線を読む — \`current_best_bid()\` に差し替え\n\n...`
},
```

## SHA pinning discipline

L5 は `b635ef7`（Stage 9b）を引用。L5 終了時点であなたのコードは Stage 9b にかなり近い — 残るのは live-state proof テスト（L6 で追加）。

## Style review notes (self-critique before paste)

- **§プランの「配線は通ったがラウンドトリップを exercise する test がない」** が L5/L6 を分けた理由をフレーミング — L5 は差し替えと test 機構、L6 は証明。
- **§考えてみよう（並列テスト race）** が `TEST_SERIALIZER` パターンを正当化。test 隔離経験がない読者には具体的な failure mode が要る。
- **§Step 1 の `out[24..32]` vs `U256::to_be_bytes::<32>()`** が「hot path に正しい」と「明快さに正しい」を区別。
- **§Step 3 の `unwrap_or_else(PoisonError::into_inner)`** が poisoned mutex で `unwrap()` という典型ミスを先回り。
- **§やりがちな勘違い（`serial_test` crate）** が手書き mutex を正当化。
- **§設計の振り返り 3 (start-of-test reset)** がなぜ末尾 cleanup を主 safety net にしないか説明。
- **L6 プレビュー**でマイルストーンを名付け — Module 2 はラウンドトリップが証明されたら閉じる。
