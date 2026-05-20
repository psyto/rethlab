# OpenHL Precompile を作る — L3 draft (JA) — build-along

> openhl SHA `1761d4d` (Stage 9a — NodeBuilder integration test) + `2ba97c6` (Stage 9e — precompile callability tests) 基準。
> コース: `building-openhl-precompiles-ja` (track: `reth-l1-architect`)。

---

## L3 — `openhl-precompiles-node-wiring-ja`

- **モジュール:** 1 (Custom EVM bootstrap), モジュール内 sortOrder 2
- **コース全体 sortOrder:** 2 (12 レッスン中 3 番目)
- **所要時間:** 35 分
- **XP:** 70
- **type:** CONTENT

### Content

````markdown
# レッスン 3 — NodeBuilder 配線 + registry callability test

## ゴール

このレッスンで掴む概念:

- **テストのスコープ = バグの局所化** — unit test 3 つを段階的なスコープで構成 (関数本体 → registry 登録 → registry dispatch) するので、失敗するとどの層が壊れているかが直接わかる。
- **extend-not-replace の dual assertion** — `CLOB_READ_BEST_BID` が登録されていることと、`0x...01` の ECDSA recover が **同時に** 残っていることの両方を check することで、単一 assertion なら見逃す silent-replace バグを捕まえる。
- **`NodeBuilder.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))`** — explicit-builder の経路。スロット 1 つだけ差し替えて、他の Reth default は全部継承する。「fork しない、configure する」という性質をコードに落とした形。
- **`Precompile::execute` 経由の dispatch と直接呼び出しの違い** — dispatch test は `Precompile::new(...)` の配線 (関数ポインタ、id、address) が正しいことを証明する — 関数本体の挙動とは別の関心事だ。
- **integration test は配線の assertion であって、挙動の assertion ではない** — 「`NodeBuilder` + `OpenHlExecutorBuilder` + `EthereumAddOns` がクリーンに合成される」と「precompile が正しいバイトを返す」は別の関心事 (後者は unit test の責務)。

検証：

```bash
cargo test -p openhl-evm reth_dev_node_with_openhl_executor --release
cargo test -p openhl-evm --lib precompiles
```

…どちらも pass する。

具体的な変更:

**新規テストを 4 個** 書く:

- **`crates/evm/src/reth_node.rs` に integration test を 1 つ** — `reth_dev_node_with_openhl_executor`。デフォルト executor の代わりに `OpenHlExecutorBuilder` を差し込んだ Reth node を bootstrap する。`EvmFactory` + `ExecutorBuilder` の合成が clean に spawn することを検証する。
- **`crates/evm/src/precompiles/mod.rs` に unit test を 3 つ**:
  - `read_best_bid_returns_hardcoded_price_and_qty` — 関数を直接呼ぶテスト。
  - `openhl_precompiles_registers_clob_address` — **extend-not-replace** の不変条件を確認。
  - `registered_precompile_is_invokable_via_registry` — registry 経由の dispatch をフルに通すテスト (REVM が内部で使うパスと同じ)。

**これが Module 1 のマイルストーンレッスン。** L3 を終えれば、custom EVM + precompile がコンパイル可能であるだけでなく、EVM 実行から到達可能であることまで証明される。Module 2-4 で **中身** (live state、write path、bridge 統合) を組み立てる — Module 1 は **配管** を整えるところまでだ。

## おさらい

L2 後の状態:

- `openhl_evm.rs` に `OpenHlEvmFactory` + `OpenHlExecutorBuilder` (L1)。
- `precompiles/mod.rs` に `CLOB_READ_BEST_BID` + `read_best_bid` + `openhl_precompiles` (L2)。
- `cargo check -p openhl-evm` が pass する。

**だが、まだこのコードを呼び出しているものがない。** L3 では「配管が動くこと」を証明する 4 つのテストを書く。

## 計画

やることは 5 つ:

1. **`reth_node.rs` の import を更新** — `EthereumAddOns` (`with_add_ons(...)` で必要) と `crate::OpenHlExecutorBuilder` (配線対象の型) を追加する。
2. **integration test `reth_dev_node_with_openhl_executor` を追加** — course 6 の `reth_dev_node_bootstraps` と同じ形だが、explicit-builder の経路で `.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))` を使う。
3. **`precompiles/mod.rs` に `#[cfg(test)] mod tests` を追加** — unit test 3 個。
4. **両方のテストパスを走らせる** — integration test と unit test 3 個が pass する。
5. **他に壊れていないことを検証** — `cargo test -p openhl-evm --release` で course 6 + course 7 の既存テストが全部 green であること。

unit test 3 個は、それぞれ別の関心事をカバーする:

| Test | カバーする関心事 | 失敗したらバグはどこか |
| - | - | - |
| `read_best_bid_returns_hardcoded_price_and_qty` | 関数 body が正しい (正しいバイトを書く) | L2 の `read_best_bid` 実装 |
| `openhl_precompiles_registers_clob_address` | extend-not-replace の不変条件 | L2 の `openhl_precompiles` の body — 多分 `clone()` か `extend(...)` の意味取り違え |
| `registered_precompile_is_invokable_via_registry` | registry 経由の EVM dispatch パスが動く | `Precompile::new(...)` の呼び方、`PrecompileId`、もしくは登録順 |

> 🛑 **考えてみよう。** スクロールする前に: なぜ `openhl_precompiles_registers_clob_address` は、`CLOB_READ_BEST_BID` だけでなく `0x...01` の ECDSA recover **も** extended set に存在することを assert するのか? 最初の assertion だけで十分に見える — 自分で登録したのだから、ECDSA がまだあることまでチェックする必要があるのか?

(答え: このテストは **extend-not-replace** の不変条件を強制したいからだ。仮に `openhl_precompiles` が、base を clone して extend するのではなく、誤って新規の `Precompiles` セットを作ってしまった場合、`CLOB_READ_BEST_BID` は依然として存在するが、標準の Ethereum precompile (ECDSA recover、SHA-256 など) は **消える**。base set は wrapper が必ず保持しなければならない load-bearing な部分の 1 つだ。ECDSA recover がなければ、署名検証をするコントラクトは revert してしまう。**dual assertion が silent-replace バグを捕まえる。**)

## 手順

### Step 1: `reth_node.rs` の import を更新

`crates/evm/src/reth_node.rs` を開く。既存 test モジュール (course 6 の `mod tests`) の import:

```rust
use reth_node_ethereum::EthereumNode;
```

次に変更:

```rust
use reth_node_ethereum::{node::EthereumAddOns, EthereumNode};
```

`OpenHlExecutorBuilder` の import も追加する。`use` ブロックの直後、`dev_chain_spec()` の前に:

```rust
use crate::OpenHlExecutorBuilder;
```

import が 2 つ必要なのは、`EthereumAddOns` が `.with_add_ons(...)` で必要 (explicit-builder の経路では、カスタマイズしない場合でも `add_ons` 引数が要求される) で、`OpenHlExecutorBuilder` が差し込み対象の型だから。

### Step 2: integration test `reth_dev_node_with_openhl_executor` を追加

`reth_node.rs` の `mod tests` ブロックの末尾、既存の `reth_dev_node_bootstraps` test の後ろに追記する:

```rust
    /// Stage 9a: prove that `NodeBuilder` accepts `OpenHlExecutorBuilder` in
    /// place of Reth's default executor, and that the resulting node still
    /// spawns cleanly with our custom precompile registered.
    ///
    /// Doesn't yet invoke the precompile (that requires deploying a
    /// Solidity contract); just validates the `EvmFactory` + `ExecutorBuilder`
    /// composition compiles, spawns, and tears down.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn reth_dev_node_with_openhl_executor() {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let expected_chain_id = chain_spec.chain.id();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec);

        let result: Result<()> = async {
            let _handle = NodeBuilder::new(node_config)
                .testing_node(runtime)
                .with_types::<EthereumNode>()
                .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
                .with_add_ons(EthereumAddOns::default())
                .launch()
                .await?;
            // The node spawned with our custom EVM. We don't need to inspect
            // further — if the EvmFactory or ExecutorBuilder were broken,
            // launch() would have failed.
            let _ = expected_chain_id;
            Ok(())
        }
        .await;
        if let Err(e) = result {
            panic!("Reth dev node bootstrap with OpenHl EVM failed: {e:?}");
        }
    }
```

course 6 の `reth_dev_node_bootstraps` テストと見比べてみる — セットアップパターンは同じだが、肝心の 1 行が違う:

```rust
// course 6:
.node(EthereumNode::default())
.launch_with_debug_capabilities()

// course 8:
.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
.with_add_ons(EthereumAddOns::default())
.launch()
```

course 6 の経路は `.node(...)` を使う — これは shorthand で、事前構築済みの node spec を受け取る。course 8 の経路は explicit な builder を使う: **`OpenHlExecutorBuilder` だけを差し替え、他のコンポーネント (network、payload pool、RPC handler) はデフォルトに保つ。** これが「Reth を fork せずに configure できる」という性質そのもの。

load-bearing なのは `.executor(OpenHlExecutorBuilder)` のチェーン。`EthereumNode::components()` がデフォルトの `ComponentsBuilder` を返し、`.executor(...)` でそのうち 1 スロットだけを上書きする。残りのスロット (network、payload、pool など) はデフォルトのまま。**1 スロットを差し替え、残りはすべて継承。**

> 🛑 **やりがちな勘違い。** 「`OpenHlExecutorBuilder` の struct を作らなくても、`.executor(my_closure)` で executor を inline に書けばいいのでは?」 — **Reth の `ComponentsBuilder` が受け入れる契約は `ExecutorBuilder` trait の方だ。** closure も同じ trait (`impl ExecutorBuilder<Node>`) を満たさなければならず、これを inline で書くのは扱いづらい。struct が存在するのは trait が API surface だから — このフックには closure は合わない。

### Step 3: `precompiles/mod.rs` に `mod tests` ブロックを追加

`crates/evm/src/precompiles/mod.rs` を開いて、ファイル末尾 (`openhl_precompiles` の後ろ) に追記する:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use alloy_primitives::U256;

    /// Direct unit test of the precompile function: invoked with empty input,
    /// it returns the hardcoded (price=100, qty=10) as 64 big-endian u256 bytes.
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

    /// Registry test: `openhl_precompiles()` extends a base precompile set
    /// with our CLOB precompile at the well-known address. This is what the
    /// Stage 9a `EvmFactory` plugs into every EVM instance Reth constructs.
    #[test]
    fn openhl_precompiles_registers_clob_address() {
        let base = Precompiles::cancun();
        let extended = openhl_precompiles(base);

        // The CLOB address must be in the extended set.
        assert!(
            extended.contains(&CLOB_READ_BEST_BID),
            "openhl_precompiles must register the CLOB_READ_BEST_BID address"
        );

        // The base Ethereum precompiles (e.g. ECDSA recover at 0x...01) must
        // still be present — we EXTEND, not replace.
        let ecrecover: Address = alloy_primitives::address!("0x0000000000000000000000000000000000000001");
        assert!(
            extended.contains(&ecrecover),
            "extended set must retain base Ethereum precompiles"
        );
    }

    /// Invoke the registered precompile end-to-end through the registry
    /// (rather than calling `read_best_bid` directly). This proves the
    /// registration is wired such that an EVM dispatch to the address hits
    /// our function — the same path Reth's EVM uses on `staticcall` to
    /// `CLOB_READ_BEST_BID`.
    #[test]
    fn registered_precompile_is_invokable_via_registry() {
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
        let price = U256::from_be_slice(&result.bytes[0..32]);
        let qty = U256::from_be_slice(&result.bytes[32..64]);
        assert_eq!(price, U256::from(100u64));
        assert_eq!(qty, U256::from(10u64));
    }
}
```

**scope を少しずつ広げていく** 3 つのテストだ:

- **`read_best_bid_returns_hardcoded_price_and_qty`** — 関数を `(empty_input, gas_limit=100_000, reservoir=0)` で直接呼ぶ。バイト長、decode された price、decode された qty、消費 gas を assert する。**最も狭い scope** — 関数だけ、registry も EVM もなし。
- **`openhl_precompiles_registers_clob_address`** — `openhl_precompiles(Precompiles::cancun())` を呼び、自前の address と標準 ECDSA recover address の **両方** が extended set にあることを確認する。load-bearing な assertion は **extend-not-replace の不変条件** だ: バグった wrapper は base set を extend する代わりに replace してしまう可能性がある。
- **`registered_precompile_is_invokable_via_registry`** — `.get(&CLOB_READ_BEST_BID)` で registry から precompile を取り出し、その `.execute(...)` メソッドを呼ぶ。**dispatch パスのフル版** で、REVM が `STATICCALL` で内部的に使うのと同じコード。

`alloy_primitives::U256` の import は、64-byte の response を decode するために必要。`U256::from_be_slice(&bytes[..])` が 32-byte の big-endian slice を U256 に decode する。

> 🛑 **やりがちな勘違い。** 「3 つ目のテストは冗長では? 関数が動き (test 1)、address が登録され (test 2) ているなら、registry 経由の invocation も動くはずでは?」 — **そうとは限らない。** test 2 は `address.contains(&...)` が true を返すことしかチェックしていない。registry から関数を引いて dispatch する経路は別物で、REVM は内部で `.get(&address)` してから `.execute(...)` を呼ぶ。**`Precompile::new(...)` の配線にバグがある場合 (関数ポインタが間違っている、型が合わないなど)、test 1 と 2 は通っても test 3 は落ちる。** dispatch テストが実在するバグのクラスを捕まえる。

### Step 4: テストを実行

```bash
cargo test -p openhl-evm reth_dev_node_with_openhl_executor --release
```

~30 秒ほど (新テスト導入後の初回 incremental build):

```
running 1 test
test reth_node::tests::reth_dev_node_with_openhl_executor ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

続いて unit test:

```bash
cargo test -p openhl-evm --lib precompiles
```

```
running 3 tests
test precompiles::tests::openhl_precompiles_registers_clob_address ... ok
test precompiles::tests::read_best_bid_returns_hardcoded_price_and_qty ... ok
test precompiles::tests::registered_precompile_is_invokable_via_registry ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

`--lib` は library 内の unit test を走らせるフラグ (`tests/` 配下の integration test ではなく)。これがないと `cargo test precompiles` が integration test の名前パターンともマッチしようとする。

### Step 5: 他に壊れていないことを確認

フルスイート:

```bash
cargo test -p openhl-evm --release
```

~30 秒後:

```
running 42 tests
... 42 tests pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**`openhl-evm` で 42 個 pass** する (course 6+7 の 39 個 + 新規 unit test 3 個 + 新規 integration test 1 個 — `--lib` と integration test で名前パターンが被るので、実際のカウントは多少ずれる)。既存テストはすべて green のままだ。

よくあるエラーと対処:

- **integration test が「`with_components` not found」で落ちる** — 新テストでは shorthand の `.node(...)` ではなく `with_components` を使う。shorthand を完全に差し替えたか確認する (追加しただけの状態になっていないか)。
- **`error[E0277]: 'EthereumAddOns' is not a 'NodeAddOns'`** — import パスが間違っている。`reth_node_ethereum::EthereumAddOns` ではなく、`reth_node_ethereum::node::EthereumAddOns` (パスに `node::` を含む) を使う。
- **`assert!(extended.contains(&ecrecover))` が落ちる** — `openhl_precompiles` の body が base を clone するのではなく、新規の `Precompiles` セットを作ってしまっている。L2 の Step 4 を見直す。`let mut precompiles = base.clone(); precompiles.extend(...); precompiles` の形であるべきで、**`let precompiles = Precompiles::default(); precompiles.extend(...)` ではない。**
- **`result.gas_used` が `CLOB_BASE_GAS_COST` と一致しない** — 定数の値が、`read_best_bid` が課金する値と食い違っている。L2 の Step 3 を見直す: `PrecompileOutput::new(CLOB_BASE_GAS_COST, ...)` の形で、両方が同じ定数を参照している必要がある。
- **`registered_precompile_is_invokable_via_registry` が panic** — L2 の `openhl_precompiles` における `Precompile::new(...)` の呼び方が間違っている (関数ポインタや引数の並び順が違うなど)。3 引数の形 `(PrecompileId, Address, fn)` を再確認する。

## 設計の振り返り

要となる決定が 3 つ:

1. **scope を広げながらテストする。** unit test 3 つは最も狭いところ (関数 body) から始めて、外側 (registry の登録 → registry 経由 dispatch) へ広げていく。どれか 1 つが落ちたとき、どの層が壊れているかを正確に特定できる。**テストの scope = バグの局在化。**

2. **extend-not-replace のチェックは dual assertion で行う。** `extended.contains(CLOB_READ_BEST_BID)` だけが通っても、wrapper が壊滅的に間違っていないことの証明にはならない — base set を **replace してしまう** バグ wrapper でも通ってしまう。ECDSA recover **も** 残っていることを assert することで、silent-replace バグを捕まえられる。**1 つの assertion は間違った理由で pass し得るが、2 つの dual はそうはいかない。**

3. **integration test は precompile を invoke しない。** RPC でフルにラウンドトリップさせるには Solidity コントラクトの deploy が必要になる — それは Reth-RPC のテスト範囲であって、precompile のテストではない。Module 1 のマイルストーンは「EvmFactory + ExecutorBuilder が clean に spawn する」こと。precompile の挙動は unit test (Step 3) で、組み立て側は integration test で押さえる。**2 つのテスト、それぞれの scope、別々に対処する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 2ba97c6
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/reth_node.rs ./crates/evm/src/reth_node.rs
```

L3 後、コードは `2ba97c6` の参照と一致する — Stage 9a の NodeBuilder 配線と Stage 9e の unit test 3 個が両方揃っている状態。違いは doc コメントの言い回し程度。

main に戻る:

```bash
git checkout main
```

## よくある質問

**Q: `EthereumNode::default()` ではなく `EthereumNode::components()` を使うのはなぜ?**
`default()` は事前構築済みの node spec を返すもので、個別のコンポーネントは差し替えられない。`components()` は `ComponentsBuilder` を返し、`.executor(...)` / `.network(...)` / `.payload(...)` などを chainable なメソッドとして提供する。**スロットを 1 つでも差し替えたいなら `components()`、すべてそのままでよいなら `default()`。**

**Q: `Precompile::execute(&[], 100_000, 0)` は内部で実際に何をしている?**
`Precompile` 型の public な dispatch メソッドだ。内部で保持している関数ポインタ (今回は `read_best_bid`) を、与えられた引数で呼ぶ。スマートコントラクトが precompile の address を `STATICCALL` するとき、REVM はこれと同じメソッドを使う — EVM が precompile registry で address を引いて `&Precompile` を取得し、`.execute(input, gas_limit, reservoir)` を呼ぶ。

**Q: なぜ integration test に `--release` が必要?**
速度のため。`--release` で最適化を有効にすると、テストの実行時間が debug の ~5 秒から ~1 秒程度に縮む。他の unit test は十分小さいので、debug のオーバーヘッドは無視できる。

**Q: `.with_add_ons(EthereumAddOns::default())` は省略できる?**
できない — `NodeBuilder` の build チェーンは、デフォルトでよくても全 "slot" を埋めることを要求する。省略すると compile 時に失敗する。`EthereumAddOns::default()` を明示することで、曖昧さなく「デフォルトを使う」と言える。

**Q: integration test で `unwrap()` のチェーンではなく `Result<()>` と `async` ブロックを使っているのはなぜ?**
エラー報告の質を上げるため。`NodeBuilder` チェーン中で何かが失敗したら、`?` がエラーを外側の `result` に伝播し、末尾の `panic!` が `{e:?}` で原因を表示してくれるので、何が落ちたかが見える。`.unwrap()` 直書きだと、元のエラーチェーンを失った generic な panic になる。

## 次のレッスン (L4)

precompile が登録され、callable であることまで証明できた。だが返しているのは **hardcoded な値** だ。L4 では precompile に **live な CLOB state** を配線し始める — `install_clob()` を追加して bridge から `Arc<Mutex<Book>>` を precompile モジュールに inject できるようにし、`openhl_precompiles` が shared state を受け取れるよう更新する。L4 を終えると、precompile は本物のデータを返す **能力を持つ** ようになる。実際に shared book から read するのは L5。
````

---

## Seed ファイルスロット

L3 は Module 1 (Custom EVM bootstrap) sortOrder 2 に入る:

```typescript
{
  title: 'レッスン 3 — NodeBuilder 配線 + registry callability test',
  slug: 'openhl-precompiles-node-wiring-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 35,
  xpReward: 70,
  content: `# レッスン 3 — NodeBuilder 配線 + registry callability test\n\n...`
},
```

## SHA pinning 規律

L3 は `1761d4d` (Stage 9a) と `2ba97c6` (Stage 9e) 両方を cite。L3 後、コードが `2ba97c6` の参照とマッチ (時系列で後の方)。
