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

前コース (`building-openhl-clob`) は、bridge が CLOB matching engine を所有する地点で終わった。Order が submit され、fill が payload に流れ、integration test が実際の Reth node に対して pipeline 全体を exercise する。**ただし fill はまだ並行リストにすぎない。** 同じ Reth node 上で動くスマートコントラクトからは見えない。CLOB state と EVM state は別世界に存在している。

本コースではこのギャップを閉じる。**Custom EVM precompile** を追加する — Solidity (あるいは任意の EVM caller) から呼ばれると CLOB を read/write する Rust コードが走る、特殊な address のことだ。Course 8 を終えた時点で:

- スマートコントラクトは `0x...0c1b` を call して現在の **best bid を読める**。
- スマートコントラクトは `0x...0c1c` を call して matching engine が処理する **order を発注できる**。

この 2 つのパスが揃うと、CLOB は EVM の横に並ぶ並行構造から、EVM が対話できる **state 拡張** に変わる。これがチェーンを「Hyperliquid-shape」にする — Hyperliquid の本質的な新規性は、perp matching engine が同じチェーン上のスマートコントラクトから呼び出せる点にある。

本コース終了時、`cargo test clob_precompile_round_trip` が pass する。スマートコントラクトの call が precompile 経由で order を発注し、既存の book state とマッチし、生じた fill が bridge へ流れる、というラウンドトリップが通る。

## 1. 終了時に手にするもの

新規 `crates/evm/src/precompiles/` モジュール:

- **既知の EVM address に登録された custom precompile 2 個**:
  - `clob_read_best_bid` (read): best bid の `(price, qty)` を 64-byte response として返す。
  - `clob_place_order` (write): calldata から order を decode し、CLOB に submit、fill 要約を返す。
- **Custom EVM machinery** (`openhl_evm.rs`) — Reth の executor に precompile を配線する `EvmFactory` + `ExecutorBuilder`。
- **Bridge 統合** — `LiveRethEvmBridge` が custom EVM 付きの Reth node を spawn するため、precompile へのスマートコントラクト call は bridge が所有するのと同じ CLOB instance に触れる。

openhl では **6 commit 分** の作業 (~860 LOC)、11 レッスン + capstone に分割。End-to-end テストは ~3 秒: Reth を bootstrap し、薄い Solidity wrapper を deploy する (もしくはエンジン経由で直接 call)、precompile を trigger、fill を assert する。

## 2. 終了時にも手にしないもの

本コースが扱うのは **openhl Stage 9 (9a-9e) のみ**。以下は扱わない:

- **Fill を実 EVM transaction として block body にエンコードすること**。Fill は依然 payload に attach された並行リスト (course 7 L12 の状況) のまま。Course 8 では fill を *EVM 実行から見える* ようにするが、*block body の一部に* はしない。それは将来のコースの仕事。
- **Funding state machine**。Stage 8b / course 9 の領分。
- **Liquidation、oracle、perp 固有の math**。Stage 9 には含まれない。
- **Multi-market precompile**。Stage 9 は CLOB ひとつだけ。production では market ごとに 1 precompile を置くか、market-id calldata 付きで 1 つにまとめる。

本コースを終えると、スマートコントラクトが CLOB を read/write できるチェーンが手に入る。これは **大きな** capability ジャンプだ — 「チェーンのどこかに orderbook がある」と「チェーンそのものが orderbook + EVM である」の違い。ただしループを完全に閉じる (fill を tx として block body に戻す) のは下流の仕事。

## 3. 前提

必要なもの:

- **`building-openhl-clob` を完了済み** — もしくは course 7 end state と同等の workspace。`LiveRethEvmBridge<P>` に L9-L11 の `clob`、`pending_fills`、`submit_order`、`payload_fills`、`pending_fill_count` が揃っていること。なければ先に course 7 を終わらせる。
- **Rust 1.95+** (前コースと同じ)。
- **REVM に trait レベルで慣れていること。** Precompile を書いた経験は必要ない (パターンは L1 で説明する) — ただし REVM の `Precompile` / `PrecompileFn` / `Precompiles` 型を一度も見たことがないなら、まず [revm precompile docs](https://docs.rs/revm-precompile) に目を通しておく。
- **スレッド境界を越えた共有 state に `Arc<Mutex<T>>` を使うことに慣れていること。** Precompile は EVM の実行コンテキストから CLOB を read する必要があり、これは bridge の通常の call site とは異なる async/sync 境界をまたぐ。

不要なもの:

- `EvmFactory` や `ExecutorBuilder` の予備知識 (L1-L2 で説明する)。
- Solidity (本コースで Solidity は書かない — raw calldata 経由で precompile を exercise するだけ)。
- Course 6 で扱った範囲を超える Reth の block 実行 pipeline 内部の知識。

## 4. セットアップ確認 (今やる)

Course 6 と 7 から引き継ぐ 2 ディレクトリのワークフロー:

- `~/code/my-openhl/` — workspace
- `~/code/openhl-reference/` — read-only な `psyto/openhl` の clone

clone より新しい Stage 9 commit が来ている場合に備えて reference repo を更新:

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

続いて、workspace が course 7 の end state にあることを確認:

```bash
cd ~/code/my-openhl
cargo test -p openhl-evm clob_fills_flow_into_payload --release 2>&1 | tail -5
# 期待: test pass (course 7 のマイルストーンテスト)。
```

これが pass すれば、出発点としては正しい。

> 🛑 **やりがちな勘違い。** 「Custom EVM precompile は要するに fancy なコントラクト call で、Solidity 関数のように考えればいい」 — **違う、もっと根本的だ。** Precompile は EVM 内の既知 address で Rust を直接実行する。間に挟まる Solidity bytecode はない。Caller のコントラクトからは固定 address への external call に見えるが、実装側はこちらが選んだ state にフルアクセスできる native Rust だ。正しいメンタルモデルは「EVM から呼べる native 関数」であって、「もうひとつのスマートコントラクト」ではない。

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

**マイルストーンは L10。** L10 を終えると、live な Reth node 上で EVM から呼べる CLOB が手に入る: スマートコントラクトが precompile を call し、matching engine が走り、fill が bridge を経由して payload に現れる。L11 では「それでも何が足りないか」を名指す (fill はまだ EVM tx になっていない — それは Stage 9 の範囲を超える)。

## 6. 答え合わせの規律 (前と同じ)

L1-L10 の各レッスンは、6 個ある Stage 9 commit のいずれかを引用する:

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

意味のあるレベルで一致していれば OK — 同じ型、同じ制御フロー。空白や命名は違ってかまわない。

> 🛑 **やりがちな勘違い。** 「Precompile は何か特別なもので、openhl の参照実装は自分で書くものより高度なはず」 — **参照実装は素直で、本コースが教えるのは canonical な Reth + REVM パターンそのものだ。** Reth はまさにこの種のユースケースのために `EvmFactory` + `ExecutorBuilder` パターンを用意している (上流の例は `paradigmxyz/reth/examples/custom-evm`)。openhl がやっているのは *そのパターンに従い、read precompile を 1 つと write precompile を 1 つ登録する* こと、それだけだ。パターンさえ理解すれば、既存のものを copy-modify するだけで precompile を追加できる。

## 7. セットアップ確認 — L0 の実演習

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

3 つすべて pass すれば、L1 に進む準備が整っている。

> **最終チェック。** 本コースが course 7 にはなかった何を追加するのか、1 文で言えるか? 答えに「スマートコントラクトが CLOB を read/write できる」が入っていなければ §1 を読み直す。
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
