# OpenHL Precompile を作る — L0 draft (JA) — build-along

> openhl SHA `1761d4d` (Stage 9a — custom EVM with CLOB precompile boots via NodeBuilder) 基準。
> 本コースは L1 Architect トラックの **course 8 of 10**、openhl ベースの build-along コースの 3 つ目。
> コース: `building-openhl-precompiles-ja` (track: `reth-l1-architect`)。

---

## L0 — `openhl-precompiles-orientation-ja`

- **モジュール:** 0 (Orientation), モジュール内 sortOrder 0
- **コース全体 sortOrder:** -1 (~12 レッスン中の 0 番目)
- **所要時間:** 15 分
- **XP:** 50
- **type:** CONTENT

### Content

````markdown
# OpenHL Precompile を作る — CLOB state をスマートコントラクトに接続する

前コース (`building-openhl-clob`) は bridge が CLOB matching engine を所有する状態で終わった。Order が submit され、fill が payload に流れ、integration test が real Reth node に対して pipeline 全体を exercise する。**だが fill はまだ並行リスト。** 同じ Reth node で走るスマートコントラクトはそれを見られない。CLOB state と EVM state が別々の世界に住む。

本コースがそのギャップを閉じる。**Custom EVM precompile** を追加する — Solidity (または任意の EVM caller) から call されると、CLOB を read/write する Rust コードを実行する特殊な address。Course 8 後:

- スマートコントラクトが `0x...0c1b` を call すると、現在の **best bid を読める**。
- スマートコントラクトが `0x...0c1c` を call すると、matching engine が処理する **order を発注できる**。

これら 2 つのパスが存在すると、CLOB が EVM の横にある並行構造から、EVM が対話できる **state 拡張** になる。これが chain を「Hyperliquid-shape」にする — Hyperliquid の本質的な新規性は、perp matching engine が同じ chain で走るスマートコントラクトから call 可能であること。

本コース終了時、`cargo test clob_precompile_round_trip` が pass する — スマートコントラクト call が precompile 経由で order を発注、既存 book state とマッチ、結果の fill が bridge に流れる。

## 1. 終了時に手にするもの

新規 `crates/evm/src/precompiles/` モジュール:

- **既知 EVM address に登録された custom precompile 2 個**:
  - `clob_read_best_bid` (read): 64-byte response として best bid の `(price, qty)` を返す。
  - `clob_place_order` (write): calldata から order を decode、CLOB に submit、fill 要約を返す。
- **Custom EVM machinery** (`openhl_evm.rs`) — Reth の executor に precompile を配線する `EvmFactory` + `ExecutorBuilder`。
- **Bridge 統合** — `LiveRethEvmBridge` が custom EVM 付きの Reth node を spawn するので、precompile への smart contract call が bridge が所有する同じ CLOB instance に触れる。

openhl では **6 commit 分** の作業 (~860 LOC)、11 レッスン + capstone に分割。End-to-end テストは ~3 秒: Reth bootstrap、thin Solidity wrapper deploy (またはエンジン経由で直接 call)、precompile trigger、fill を assert。

## 2. 終了時にも手にしないもの

本コースは **openhl Stage 9 (9a-9e) のみ** をカバー。以下は扱わない:

- **Fill → 実 EVM transaction を block body にエンコード**。Fill は依然 payload に attach された並行リスト (course 7 L12 の状況)。Course 8 はそれらを *EVM 実行から accessible に* するが、*block body の一部に* はしない。それは将来コース。
- **Funding state machine**。それは Stage 8b / course 9。
- **Liquidation、oracle、perp-specific math**。Stage 9 にない。
- **Multi-market precompile**。Stage 9 は 1 つの CLOB; production では market ごとに 1 precompile、または market-id calldata 付きの 1 つ。

本コース終了時、スマートコントラクトが CLOB を read/write できる chain がある。これは **大きな** capability ジャンプ — 「chain に orderbook がどこかにある」と「chain が orderbook + EVM **そのもの**」の違い。だがループを完全に閉じる (fill を tx として block body に戻す) のは下流の作業。

## 3. 前提

必要なもの:

- **`building-openhl-clob` 完了** — または同等の course 7 end state の workspace。`LiveRethEvmBridge<P>` に L9-L11 の `clob`、`pending_fills`、`submit_order`、`payload_fills`、`pending_fill_count` がある。なければまず course 7 を完了させる。
- **Rust 1.95+**、前と同じ。
- **Trait レベルで REVM に慣れていること。** Precompile を書いたことがある必要はない — L1 がパターンを説明する — だが REVM の `Precompile`、`PrecompileFn`、`Precompiles` 型を見たことがないなら、まず [revm precompile docs](https://docs.rs/revm-precompile) を skim する。
- **スレッド境界を超える共有 state に `Arc<Mutex<T>>` を使うことに慣れていること。** Precompile は EVM の実行コンテキストから CLOB を read する必要があり、それは bridge の通常 call site とは異なる async/sync 境界。

不要なもの:

- 過去の `EvmFactory` や `ExecutorBuilder` 知識 (L1-L2 で説明)。
- Solidity (Solidity は書かない — raw calldata 経由で precompile を exercise するだけ)。
- Course 6 がカバーしたものを超える Reth の内部 block 実行 pipeline 知識。

## 4. セットアップ確認 (今やる)

Course 6 と 7 から 2 ディレクトリのワークフロー:

- `~/code/my-openhl/` — workspace
- `~/code/openhl-reference/` — read-only な `psyto/openhl` clone

Stage 9 commit が clone より新しい場合に備えて reference repo を更新:

```bash
cd ~/code/openhl-reference
git fetch origin
git log --oneline | head -25
# SHA d19ba1b (Stage 9c+) までの commit が見えるはず。
# Stage 9 commit を chronological 順で:
#   1761d4d — Stage 9a
#   2ba97c6 — Stage 9e
#   b635ef7 — Stage 9b
#   a8823a1 — Stage 9c
#   2f796c3 — Stage 9d
#   d19ba1b — Stage 9c+
```

それから workspace が course 7 end state にあることを確認:

```bash
cd ~/code/my-openhl
cargo test -p openhl-evm clob_fills_flow_into_payload --release 2>&1 | tail -5
# 期待: test pass (course 7 のマイルストーンテスト)。
```

それが pass すれば start point として正しい。

> 🛑 **やりがちな勘違い。** 「Custom EVM precompile は単に fancy なコントラクト call — Solidity 関数のように考える」。 **違う、もっと根本的。** Precompile は EVM 内で既知 address で Rust を直接実行する、間に Solidity bytecode がない。Caller のコントラクト視点では固定 address への external call に見えるが、実装は我々が選んだ state にフルアクセスできる native Rust。メンタルモデルは「EVM から call 可能な native 関数」 — 「別のスマートコントラクト」ではない。

## 5. 12 レッスンの全体マップ

| # | モジュール | 何を build するか | レッスン終了時のテスト |
| - | - | - | - |
| **L0** | Orientation | (本レッスン) | セットアップ確認 |
| **L1** | Custom EVM bootstrap | `openhl_evm.rs` — EvmFactory パターン + 依存 | `cargo check -p openhl-evm` |
| **L2** | Custom EVM bootstrap | `precompiles/mod.rs` — Stage 9a の hardcoded read precompile + registry | precompile がコンパイル |
| **L3** | Custom EVM bootstrap | `OpenHlExecutorBuilder` + NodeBuilder 配線; precompile を call する smoke test (Stage 9e) | `precompile_is_callable_via_registry` が pass |
| **L4** | Read precompile | install_clob() — Arc-shared CLOB state、precompile 注入用 | bridge が shared state でコンパイル |
| **L5** | Read precompile | read precompile を live CLOB state に配線 (Stage 9b 本体) | precompile が real best_bid を返す |
| **L6** | Read precompile | end-to-end test: read precompile が bridge.submit_order の結果を反映 | integration test pass |
| **L7** | Write precompile | `clob_place_order` signature + calldata decoding (Stage 9c part 1) | precompile が正しく decode する |
| **L8** | Write precompile | 実装: CLOB に submit + fill 要約を返す (Stage 9c part 2) | precompile が正しく write する |
| **L9** | Bridge 統合 | `install_fill_sink()` — precompile が produce した fill が bridge の pending_fills に流れる (Stage 9c+) | precompile-placed fill が bridge に届く |
| **L10** | Bridge 統合 | bridge が custom-EVM Reth node に対して spawn (Stage 9d) | full pipeline test pass |
| **L11** | Capstone | recap、次は何か (funding via course 9、fill-as-EVM-tx として future course) | (テストなし — recap) |

**L10 がマイルストーン。** L10 を終えると、live Reth node 上で EVM-callable CLOB がある: スマートコントラクトが precompile を call、matching engine が走り、fill が bridge を通じて payload に出現する。L11 が「まだ何が足りないか」を named する (fill がまだ EVM tx ではない — それは Stage 9 を超える)。

## 6. 答え合わせの規律 (前と同じ)

各レッスン L1-L10 は 6 個の Stage 9 commit のどれかを cite:

| Lessons | Stage | SHA |
| - | - | - |
| L1-L3 | 9a + 9e | `1761d4d`、`2ba97c6` |
| L4-L6 | 9b | `b635ef7` |
| L7-L8 | 9c | `a8823a1` |
| L9 | 9c+ | `d19ba1b` |
| L10 | 9d | `2f796c3` |

各レッスンのテストが pass した後:

```bash
cd ~/code/openhl-reference
git checkout <SHA>
diff -u ~/code/my-openhl/crates/evm/src/precompiles/mod.rs ./crates/evm/src/precompiles/mod.rs
```

意味のあるレベルで一致 — 同じ型、同じ制御フロー。空白と命名は違ってよい。

> 🛑 **やりがちな勘違い。** 「Precompile は custom なものに見える — openhl の参照は自分で書くものより advanced なはず」。 **参照は素直で、本コースが canonical な Reth + REVM パターンを教える。** Reth はちょうどこういうケース用に `EvmFactory` + `ExecutorBuilder` パターンを提供する (上流の例は `paradigmxyz/reth/examples/custom-evm`)。openhl がやるのは *そのパターンに従い、1 read precompile と 1 write precompile を登録する* こと。パターンを理解すれば、既存のものを copy-modify することで precompile を追加できる。

## 7. セットアップ確認 — 実際の L0 演習

L1 に進む前に、以下を全部走らせて pass を確認:

```bash
# 1. Rust バージョン
rustc --version    # 期待: rustc 1.95.x 以降

# 2. Course 7 end state
cd ~/code/my-openhl && cargo test -p openhl-evm clob_fills_flow_into_payload --release 2>&1 | tail -3
# 期待: 1 test pass

# 3. Reference repo に Stage 9 commit がある
cd ~/code/openhl-reference && git log --oneline | grep -E "(1761d4d|b635ef7|a8823a1)"
# 期待: 3 つの SHA すべて現れる
```

3 つ全部 pass すれば L1 に進む準備 OK。

> **最終チェック。** 本コースが course 7 になかった何を追加するのか、1 文で言える? もし答えに「スマートコントラクトが CLOB を read/write できる」が入っていなければ §1 を読み直す。
````

---

## Seed ファイルスロット

L0 は Module 0 (Orientation) sortOrder 0 に入る:

```typescript
{
  title: 'OpenHL Precompile を作る — CLOB state をスマートコントラクトに接続する',
  slug: 'openhl-precompiles-orientation-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# OpenHL Precompile を作る — CLOB state をスマートコントラクトに接続する\n\n...`
},
```

## SHA pinning 表 (course 8)

| Lessons | openhl Stage | SHA |
| - | - | - |
| L1-L3 | 9a + 9e | `1761d4d`、`2ba97c6` |
| L4-L6 | 9b | `b635ef7` |
| L7-L8 | 9c | `a8823a1` |
| L9 | 9c+ | `d19ba1b` |
| L10 | 9d | `2f796c3` |
| L11 | (capstone) | — |
