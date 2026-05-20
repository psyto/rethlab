# OpenHL CLOB を作る — L0 draft (JA) — build-along

> openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine) + `428cc26` (Stage 8d — fills flow into bridge payloads) 基準。本コースは L1 Architect トラックの **course 7 of 10**、openhl ベースの build-along コースの 2 つ目。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。

---

## L0 — `openhl-clob-orientation-ja`

- **モジュール:** 0 (Orientation), モジュール内 sortOrder 0
- **コース全体 sortOrder:** -1 (~12 レッスン中の 0 番目)
- **所要時間:** 15 分
- **XP:** 50
- **type:** CONTENT

### Content

````markdown
# OpenHL CLOB を作る — substrate の上に matching engine を載せる

前コース (`building-openhl-consensus`) は、real Reth EVM を通じて 0.02 秒で block を decide する single-validator BFT chain で終わった。**ただし decide していたのは空の block。** トランザクションもマッチングも価格発見もない。

本コースで **CLOB matching engine** を追加する — 「HYPE を $25 で 10 個買いたい」と「HYPE を $25 で 5 個売りたい」を real fill に変換する Hyperliquid の核。Stage 8a (701 行) で pure state machine を build し、Stage 8d (171 行) で bridge に配線する。これで commit された block が matching engine の produce した fill を運ぶようになる。

本コース終了時には `cargo test clob_fills_flow_into_payload` が pass する — real fill が matching engine から `LiveRethEvmBridge::build_payload` を通って payload に流れ、それを consensus が commit する。

## 1. 終了時に手にするもの

新規 `crates/clob/` crate:

- **マイクロ秒で走る price-time-priority matching engine** — pure state machine、I/O なし、完全に deterministic。
- **`Book` + `Order` + `Fill` 型** — CEX が「order book」と呼ぶものに対応。
- **テスト 12 個合格**: hand-trace されたシナリオ 9 個 (空の book、FIFO 優先、market order の流動性枯渇、partial fill、cancel、マッチ後の no-crossed-book) + proptest invariant 3 個 (256 ケース × 3 = 768 ランダムシナリオ — quantity conservation、no-crossed-book always、determinism = replayability)。

加えて `crates/evm/` に新規 integration test:

- **`clob_fills_flow_into_payload`** — real Reth node を bootstrap し、bridge の CLOB に maker bid + crossing taker sell を submit し、結果の fill が次の `build_payload` 出力に現れることを assert、さらに **過去の payload に遡って fill が attach されない** ことを assert (drain semantics は forward-only)。

終了時には次ができるようになる:

- price-time-priority CLOB が on-chain 永久 (perp) 取引所の canonical な構造である理由を説明できる
- fill を buffer する matching engine (本コースで作るもの) と同期的に emit する matching engine のトレードオフを推論できる
- matching logic をゼロから再現でき、stop order、post-only order、pro-rata matching 等を追加したい場合にコードのどこに手を入れればよいか把握した上で改変できる

## 2. 終了時にも手にしないもの

本コースが扱うのは **Stage 8a + 8d のみ**。以下は扱わない:

- Stage 9: CLOB state を read/write する custom EVM precompile (= course 8)
- Stage 8b: funding rate state machine (= course 9)
- fill を EVM-executable トランザクションとして encode (= openhl 自体の Stage 9 より先の future work)
- Liquidation、mark-vs-index pricing、レバレッジ上限

本コース終了時には **fill を produce して committed block に運ぶ動く matching engine** が手に入るが、その fill はまだ parallel list — スマートコントラクトから読める Ethereum トランザクションとしては実行できない。これを足すのが course 8 (custom EVM precompile)。

これは honest scoping。実行配線なしの CLOB engine は物語の半分でしかなく、残り半分 (precompile) は course 8 で扱う。

## 3. 前提

必要なもの:

- **`building-openhl-consensus` 完了** — または同等の course 6 end state の workspace。`crates/evm/src/live_node.rs` に `LiveRethEvmBridge<P>` が `provider`、`chain_spec`、`validator`、optional な `engine_handle` フィールド付きで存在すること。なければまず course 6 を完了させる。
- **Rust 1.95+** — course 6 と同じ。
- **`BTreeMap`、`VecDeque`、`Reverse<T>`、proptest に慣れていること。** 「natural ordering」や「最高値から walk するための reverse-ordering trick」が初耳なら、まず `std::collections::BTreeMap` のドキュメントを軽く読んでおく。

不要なもの:

- 過去の matching-engine 経験 (データ構造はゼロから build する)
- 過去の order book 読解スキル (テストシナリオが各ステップを walk する)
- Multi-validator セットアップ (引き続き single-validator)

## 4. セットアップ確認 (今やる)

Course 6 から 2 ディレクトリのワークフローがあるはず:

- `~/code/my-openhl/` — workspace
- `~/code/openhl-reference/` — read-only な `psyto/openhl` clone

Stage 8 commit が clone より新しい場合に備えて、reference repo を最新化する:

```bash
cd ~/code/openhl-reference
git fetch origin
git log --oneline | head -15
# SHA 0cac571 (Stage 7d) と 428cc26 (Stage 8d) までの commit が見えるはず。
```

それから workspace が course 6 end state にあることを確認:

```bash
cd ~/code/my-openhl
cargo test -p openhl-evm --release 2>&1 | tail -10
# 期待: workspace 全体で ~38 個合格、特に:
# - reth_dev_node_bootstraps (course 6 L11)
# - live_bridge_builds_on_real_genesis (course 6 L12-L13)
# - commit_sends_forkchoice_to_engine_when_handle_installed (course 6 L14)
```

これらが pass すれば start point として正しい。pass しなければ、まず course 6 を完了させる。

> 🛑 **やりがちな勘違い。** 「`git clone psyto/openhl` してそのコードベースに対して course 7 を進めればいい」。 **やれなくはないが、摩擦から得られるはずの学びを取りこぼす。** 本コースは build-along — matching engine を `my-openhl/` でゼロから書き、reference に対して diff する。`openhl-reference` から start すると course 6 §7 で論じた「答え合わせを写経する」モードに逆戻りする。

## 5. 12 レッスンの全体マップ

| # | モジュール | 何を build するか | レッスン終了時のテスト |
| - | - | - | - |
| **L0** | Orientation | (本レッスン) | セットアップ確認 |
| **L1** | CLOB 型 | newtype 群 — `AccountId`, `OrderId`, `Price`, `Qty`, `Side`, `OrderType` | `cargo check -p openhl-clob` |
| **L2** | CLOB 型 | `Order`, `Fill`, `FillResult` | 型がコンパイル |
| **L3** | Matching engine | `Book` struct + `Reverse<Price>` trick + accessor | `cargo check -p openhl-clob` |
| **L4** | Matching engine | `submit_order` — Limit order、in-book matching | resting order とマッチする |
| **L5** | Matching engine | `submit_order` — Market order + crossing + partial fill | エッジケースの挙動 |
| **L6** | Matching engine | `cancel` + 空 level の cleanup | cancel-by-id が動く |
| **L7** | テスト | hand-trace された unit test 9 個 | 9 個全部 pass |
| **L8** | テスト | proptest invariant 3 個 (qty conservation、no-crossed-book、determinism) | 768 ランダムシナリオ pass |
| **L9** | Bridge 統合 | `LiveRethEvmBridge` に `clob` + `pending_fills` 追加、`submit_order` メソッド | bridge がコンパイル |
| **L10** | Bridge 統合 | `build_payload` が pending fill を drain、`payload_fills(id)` インスペクタ | fill が payload に現れる |
| **L11** | Bridge 統合 | `clob_fills_flow_into_payload` integration test | **フルパイプラインテスト pass** |
| **L12** | Capstone | 振り返り、次は何か (course 8 で precompile) | (テストなし — 振り返り) |

**L11 がマイルストーン。** L11 を終えると、matching engine が produce した fill が BFT engine を通って real block に流れる。L12 は「まだ何が足りないか」を明示する (fill がスマートコントラクトから読めない — それは course 8)。

## 6. 答え合わせの規律 (course 6 と同じ)

各レッスン L1-L11 は SHA `55a9dff` (Stage 8a) または `428cc26` (Stage 8d) を cite する。レッスンのテストが pass した後:

```bash
cd ~/code/openhl-reference
git checkout 55a9dff    # または L9-L11 では 428cc26
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
# (など)
```

本質的な部分が一致していればよい — 同じ型、同じ制御フロー。空白や命名は違ってよい。

> 🛑 **やりがちな勘違い。** 「CLOB の仕組みはもう知っているから L9 まで飛ばして bridge 統合だけ学べばいい」。 **やれなくはないが、L1-L8 で encode される設計判断は、エンジンを後で改変するときに効いてくる。** 逆順 bid、price level 内の FIFO、cancel-then-cleanup invariant — どれも自分で build しなければ腹落ちしない。L1-L8 をスキップするとコードは読めても安全に変更できなくなる。

## 7. セットアップ確認 — 実際の L0 演習

L1 に進む前に、以下をすべて走らせて pass することを確認:

```bash
# 1. Rust バージョン
rustc --version    # 期待: rustc 1.95.x 以降

# 2. Course 6 end state
cd ~/code/my-openhl && cargo test -p openhl-evm --release 2>&1 | grep -E "^test result"
# 期待: openhl-evm で少なくとも 3 個合格

# 3. Reference repo に Stage 8 commit がある
cd ~/code/openhl-reference && git log --oneline | grep -E "(55a9dff|428cc26)"
# 期待: 両 SHA が現れる
```

3 つすべて pass すれば L1 に進む準備 OK。

> **最終チェック。** 本コースが course 6 になかった何を追加するのか、1 文で言えるか? 答えに「fill を produce する matching engine、その fill が committed block に流れる」といった要素が入っていなければ §1 を読み直す。
````

---

## Seed ファイルスロット

L0 は Module 0 (Orientation) sortOrder 0 に入る:

```typescript
{
  title: 'OpenHL CLOB を作る — substrate の上に matching engine を載せる',
  slug: 'openhl-clob-orientation-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# OpenHL CLOB を作る — substrate の上に matching engine を載せる\n\n...`
},
```

## SHA pinning 表 (course 7)

| Lesson | openhl Stage | SHA |
| - | - | - |
| L1-L8 | Stage 8a (8 レッスンに split) | `55a9dff` |
| L9-L11 | Stage 8d (3 レッスンに split) | `428cc26` |
| L12 | (capstone) | n/a |
