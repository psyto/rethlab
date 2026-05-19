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

このレッスンの終わりに:

```bash
cargo test -p openhl-evm reth_dev_node_with_openhl_executor --release
cargo test -p openhl-evm --lib precompiles
```

…両方 pass。**新規テスト 4 個** を書く:

- **integration test 1 個** を `crates/evm/src/reth_node.rs` に — `reth_dev_node_with_openhl_executor`。デフォルト executor の代わりに `OpenHlExecutorBuilder` を swap した Reth node を bootstrap する。`EvmFactory` + `ExecutorBuilder` 合成が clean に spawn することを validate。
- **unit test 3 個** を `crates/evm/src/precompiles/mod.rs` に:
  - `read_best_bid_returns_hardcoded_price_and_qty` — 直接関数 call test。
  - `openhl_precompiles_registers_clob_address` — **extend-not-replace** invariant。
  - `registered_precompile_is_invokable_via_registry` — full registry-dispatch test (REVM が内部で使うパス)。

**これが Module 1 のマイルストーンレッスン。** L3 後、custom EVM + precompile は compile-clean なだけでなく、EVM 実行から到達可能であることが証明された。Module 2-4 が **content** (live state、write path、bridge 統合) を build する; Module 1 は **配管** を set up した。

## おさらい

L2 後:

- `openhl_evm.rs` に `OpenHlEvmFactory` + `OpenHlExecutorBuilder` (L1)。
- `precompiles/mod.rs` に `CLOB_READ_BEST_BID` + `read_best_bid` + `openhl_precompiles` (L2)。
- `cargo check -p openhl-evm` が pass。

**まだ何もこのコードを invoke していない。** L3 で配管が動くことを証明する 4 つのテストを書く。

## 計画

5 つやる:

1. **`reth_node.rs` の import を更新** — `EthereumAddOns` (`with_add_ons(...)` に必要) と `crate::OpenHlExecutorBuilder` (配線する型) を追加。
2. **`reth_dev_node_with_openhl_executor` integration test を追加** — course 6 の `reth_dev_node_bootstraps` と同じ shape、だが explicit-builder path で `.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))` を使う。
3. **`#[cfg(test)] mod tests` を `precompiles/mod.rs` に追加** — unit test 3 個。
4. **両 test path を run** — integration test が pass、unit test 3 個が pass。
5. **他に何も壊れていないことを verify** — `cargo test -p openhl-evm --release` で course 6 + course 7 のすべての先行テストが green。

3 個の unit test が 3 つの異なる concern をカバー:

| Test | Concern | 失敗したらバグの場所 |
| - | - | - |
| `read_best_bid_returns_hardcoded_price_and_qty` | 関数 body が正しい (正しいバイトを書く) | L2 の `read_best_bid` 実装 |
| `openhl_precompiles_registers_clob_address` | Extend-not-replace invariant | L2 の `openhl_precompiles` body — おそらく間違った `clone()` または `extend(...)` semantics |
| `registered_precompile_is_invokable_via_registry` | Registry 経由の EVM dispatch path が動く | `Precompile::new(...)` call shape、`PrecompileId`、または registration ordering |

> 🛑 **考えてみよう。** スクロールする前に: なぜ `openhl_precompiles_registers_clob_address` が **両方** `CLOB_READ_BEST_BID` AND `0x...01` の ECDSA recover が extended set に存在することを assert する? 最初の assertion だけで十分に見える — 我々が register した、なぜ ECDSA がまだあることを check?

(答え: テストが **extend-not-replace** invariant を強制するから。`openhl_precompiles` が誤って base を clone して extend する代わりに fresh な `Precompiles` set を作ったら、`CLOB_READ_BEST_BID` は依然存在するが、標準 Ethereum precompile (ECDSA recover、SHA-256 等) は **消える**。Base set は wrapper が preserve しなければならない load-bearing なものの 1 つ。ECDSA recover なしでは、signature を verify するコントラクトが revert する。**Dual assertion が silent-replace バグを catch する。**)

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

`OpenHlExecutorBuilder` の import も追加。`use` block の直後、`dev_chain_spec()` の前:

```rust
use crate::OpenHlExecutorBuilder;
```

2 つの import が必要なのは、`EthereumAddOns` が `.with_add_ons(...)` に必要 (explicit-builder path が `add_ons` 引数を要求、customize しなくても)、`OpenHlExecutorBuilder` が swap する型だから。

### Step 2: `reth_dev_node_with_openhl_executor` integration test を追加

`reth_node.rs` の `mod tests` block に、既存 `reth_dev_node_bootstraps` test の後に append:

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

Course 6 の `reth_dev_node_bootstraps` テストと比較 — 同じセットアップパターンだが、1 つ重要な行が違う:

```rust
// course 6:
.node(EthereumNode::default())
.launch_with_debug_capabilities()

// course 8:
.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
.with_add_ons(EthereumAddOns::default())
.launch()
```

Course-6 path は `.node(...)` を使う、これは shorthand — 事前構築された node spec を取る。Course-8 path は explicit builder を使う: **`OpenHlExecutorBuilder` を swap、他のすべての component (network、payload pool、RPC handler) をデフォルトに保つ。** これが「Reth を fork せず configure する」property。

`.executor(OpenHlExecutorBuilder)` chain が load-bearing な部分。`EthereumNode::components()` がデフォルト `ComponentsBuilder` を返す; `.executor(...)` が 1 つの slot を override。残りの slot (network、payload、pool 等) はデフォルトから来る。**1 slot を swap、他はすべて inherit。**

> 🛑 **やりがちな勘違い。** 「executor を inline で書ける — `.executor(my_closure)` で `OpenHlExecutorBuilder` struct を全部 build しなくても」。 **`ExecutorBuilder` trait が Reth の `ComponentsBuilder` が受け入れる契約。** Closure も同じ trait (`impl ExecutorBuilder<Node>`) を満たさなければならず、それを inline で書くのは厄介。Struct が存在するのは trait が API surface だから; この特定の hook には closure が悪い fit。

### Step 3: `mod tests` block を `precompiles/mod.rs` に追加

`crates/evm/src/precompiles/mod.rs` を開く。ファイル末尾 (`openhl_precompiles` の後) に append:

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

**Scope を増しながら** 3 つの test:

- **`read_best_bid_returns_hardcoded_price_and_qty`** — 関数を直接 `(empty_input, gas_limit=100_000, reservoir=0)` で call。バイト長、decoded price、decoded qty、消費 gas を assert。**最も狭い scope** — 関数のみ、registry なし、EVM なし。
- **`openhl_precompiles_registers_clob_address`** — `openhl_precompiles(Precompiles::cancun())` を call、我々の address AND 標準 ECDSA recover address の両方が extended set にあることを check。**Extend-not-replace invariant** が load-bearing な assertion: buggy wrapper が base set を extend する代わりに replace するかもしれない。
- **`registered_precompile_is_invokable_via_registry`** — `.get(&CLOB_READ_BEST_BID)` で registry から precompile を extract、その `.execute(...)` メソッドを call。**Full dispatch path** — REVM が `STATICCALL` で内部使用するのと同じコード。

`alloy_primitives::U256` import が 64-byte response の decode に必要。`U256::from_be_slice(&bytes[..])` が 32-byte big-endian slice を U256 値に decode する。

> 🛑 **やりがちな勘違い。** 「3 番目のテストは redundant — 関数が動く (test 1) し address が register された (test 2) なら、registry 経由 invocation は動くはず」。 **そうとは限らない。** Test 2 は `address.contains(&...)` が true を返すことだけを check。Registry から関数 lookup への dispatch は別 — REVM は内部で `.get(&address)` をして `.execute(...)` を呼ぶ。**`Precompile::new(...)` の配線のバグ (間違った関数ポインタ、型ミスマッチ) が test 1 と 2 を pass し test 3 を fail する。** Dispatch test が real なバグクラスを catch する。

### Step 4: テストを実行

```bash
cargo test -p openhl-evm reth_dev_node_with_openhl_executor --release
```

~30 秒後 (新テストでの初回 incremental build):

```
running 1 test
test reth_node::tests::reth_dev_node_with_openhl_executor ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

それから unit test:

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

`--lib` が unit test を library 内で走らせる (`tests/` 内の integration test ではなく)。`--lib` なしだと `cargo test precompiles` が integration test 名パターンともマッチしようとする。

### Step 5: 他に何も壊れていないことを verify

Full suite:

```bash
cargo test -p openhl-evm --release
```

~30 秒後:

```
running 42 tests
... 42 tests pass ...

test result: ok. 42 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**`openhl-evm` で 42 個 pass** (course 6+7 から 39 + 新 unit test 3 + 新 integration test 1 — `--lib` と integration test が名前パターンを share するので exact count は変わる)。All prior tests still green。

よくあるエラーと対処:

- **Integration test が `with_components` not found で失敗** — 新テストが shorthand `.node(...)` の代わりに `with_components` を使う。Shorthand を完全に置き換えたか確認、追加しただけではないこと。
- **`error[E0277]: 'EthereumAddOns' is not a 'NodeAddOns'`** — import path が間違い。`reth_node_ethereum::EthereumAddOns` だけでなく `reth_node_ethereum::node::EthereumAddOns` (path に `node::`) を使う。
- **`assert!(extended.contains(&ecrecover))` が失敗** — `openhl_precompiles` body が base を clone する代わりに fresh な `Precompiles` set を作った。L2 Step 4 を再確認: `let mut precompiles = base.clone(); precompiles.extend(...); precompiles` であるべき。**`let precompiles = Precompiles::default(); precompiles.extend(...)` ではない。**
- **`result.gas_used` が `CLOB_BASE_GAS_COST` とマッチしない** — 定数が `read_best_bid` が charge する値と違う。L2 Step 3 を再確認: `PrecompileOutput::new(CLOB_BASE_GAS_COST, ...)` — 両方が同じ定数を参照する必要。
- **Test `registered_precompile_is_invokable_via_registry` が panic** — L2 の `openhl_precompiles` での `Precompile::new(...)` call が間違い (例: 間違った関数ポインタや引数順)。3 引数 shape を再確認: `(PrecompileId, Address, fn)`。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Scope を増しながらのテスト。** 3 unit test が最も狭い (関数 body) から expand outward (registry registration → registry dispatch) で開始する。1 つが失敗すると、どの層が壊れているか正確に分かる。**Test scope = バグ localization。**

2. **Extend-not-replace check が dual assertion。** `extended.contains(CLOB_READ_BEST_BID)` 単独の passing test では wrapper が catastrophically wrong でないことを証明しない — base set を **replace する** buggy wrapper も pass する。ECDSA recover **も** ある assertion が silent-replace バグを catch する。**1 つの assertion は間違った理由で pass しうる; 2 つの dual はそうできない。**

3. **Integration test は precompile を invoke しない。** Full RPC roundtrip は Solidity コントラクトのデプロイが必要 — それは Reth-RPC のテスト surface、precompile のテストではない。Module-1 マイルストーンは「EvmFactory + ExecutorBuilder が clean に spawn」。Unit test (Step 3) が precompile 挙動をカバー; integration test が assembly をカバー。**2 つの test、異なる scope、別々に対処。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 2ba97c6
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
diff -u ~/code/my-openhl/crates/evm/src/reth_node.rs ./crates/evm/src/reth_node.rs
```

L3 後、コードが `2ba97c6` の参照とマッチ — Stage 9a の NodeBuilder 配線と Stage 9e の 3 unit test が両方ある。Doc コメントの言い回しのみ異なるかも。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜ `EthereumNode::default()` ではなく `EthereumNode::components()` を使う?**
`default()` は事前構築された node spec を返す、個別 component を swap できない。`components()` は `ComponentsBuilder` を返し、`.executor(...)`、`.network(...)`、`.payload(...)` 等を chainable methods として expose する。**1 つ以上の slot を swap する必要があるとき `components()` を使う; すべてを as-is で受け入れるなら `default()`。**

**Q: `Precompile::execute(&[], 100_000, 0)` は内部で実際何をする?**
`Precompile` 型の public dispatch メソッド。内部で stored function pointer (我々の `read_best_bid`) を提供された引数で call する。Smart contract が precompile の address を `STATICCALL` するとき REVM がこの同じメソッドを使う — EVM が precompile registry で address を lookup、`&Precompile` を取得、`.execute(input, gas_limit, reservoir)` を call。

**Q: なぜ integration test に `--release` が必要?**
速度のため。`--release` がテスト runtime を ~5 秒 (debug) から ~1 秒に削減する、optimization を有効にすることで。他の unit test は小さすぎて debug オーバーヘッドが無視できる。

**Q: `.with_add_ons(EthereumAddOns::default())` をスキップできる?**
できない — `NodeBuilder` の build chain が全 "slot" を埋めることを要求、デフォルトでも。スキップすると compile time に失敗。Explicit な `EthereumAddOns::default()` が曖昧さなく「デフォルトを使う」と言う。

**Q: なぜ integration test が `unwrap()` chain ではなく `Result<()>` と `async` block を使う?**
より良い error reporting のため。`NodeBuilder` chain 内で何かが失敗すれば、`?` 演算子が error を outer `result` に伝播し、末尾の `panic!` が `{e:?}` を print するので失敗原因が visible。`.unwrap()` だと original error chain なしの generic panic を得る。

## 次のレッスン (L4)

Precompile が register され callable と証明されたが、**hardcoded 値** を返す。L4 で **live CLOB state** を precompile に配線開始 — bridge が `Arc<Mutex<Book>>` を precompile モジュールに inject できるよう `install_clob()` を追加、`openhl_precompiles` が shared state を受け取るよう更新。L4 後、precompile は real データを返す **能力がある**; L5 で実際に shared book から read する。
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
