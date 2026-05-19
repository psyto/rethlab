# Building OpenHL Precompiles — L11 draft (JA) — build-along

> Capstone レッスン。新コードなし。Stage 9a-9d を統合し、先送り作業を名指す。
> コース: `building-openhl-precompiles-ja`（track: `reth-l1-architect`）。

---

## L11 — `openhl-precompiles-capstone-ja`

- **Module:** 5 (Capstone), sortOrder 0 within module
- **Course-level sortOrder:** 10 (lesson 12 of 12)
- **Duration:** 20 min
- **XP reward:** 40
- **Type:** CONTENT
- **Milestone:** コース完了

### Content

````markdown
# レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの

## ゴール

このレッスンが終わると：

- EVM ↔ CLOB アーキテクチャを記憶からホワイトボードに描ける。
- v0 で先送りした 4 項目を名指し、それぞれが範囲外の理由を説明できる（RPC ラウンドトリップ、マルチバリデータ OrderIds、transaction-scoped ロールバック、staticcall mutation 拒否）。
- 4 つの拡張がどこに来るかを描ける（best_ask precompile、depth precompile、clob_cancel_order、fill を EVM event として）。
- 自分の Reth ベース L1 でカスタム precompile を出荷する準備ができる。

**このレッスンにコードなし。** メンタルモデルだけ。

## アーキテクチャ、1 枚の図で

```
                ┌─────────────────────────────────────────────┐
                │           LiveRethEvmBridge                  │
                │                                              │
                │  clob: Arc<Mutex<Book>>                      │
                │  pending_fills: Arc<Mutex<Vec<Fill>>>        │
                └──────┬───────────────┬───────────────────────┘
                       │               │
            install_   │               │ install_
            clob       │               │ fill_sink
                       ▼               ▼
              ┌─────────────────────────────────────┐
              │  precompiles module (process-global) │
              │                                     │
              │  CLOB_STATE: RwLock<Option<…>>      │
              │  FILL_SINK:  RwLock<Option<…>>      │
              └──────┬───────────────┬──────────────┘
                     │               │
        read_best_   │               │ place_order
        bid          │               │
                     ▼               ▼
              ┌─────────────────────────────────────┐
              │  Reth EVM (via OpenHlEvmFactory)    │
              │                                     │
              │  Precompile registry:               │
              │    0x...0c1b → read_best_bid        │
              │    0x...0c1c → place_order          │
              └──────┬──────────────────────────────┘
                     │
                     ▼
              ┌─────────────────────────────────────┐
              │  Solidity contracts                 │
              │                                     │
              │  staticcall(0x...0c1b, "")          │
              │  call(0x...0c1c, abi.encode(...))   │
              └─────────────────────────────────────┘
```

上から下：bridge がデータを所有、precompile モジュールがプロセスグローバル handle で露出、EVM が precompile に call を dispatch、Solidity コントラクトが `ecrecover` を叩くように同じアドレスを叩く。

下から上：スマートコントラクトが `STATICCALL(0x...0c1b)` を発行。Reth EVM が precompile registry でアドレスを検索 → `read_best_bid` に dispatch → `CLOB_STATE` から read → これが bridge の `submit_order` が書く同じ `Arc<Mutex<Book>>`。**翻訳レイヤーなし。シリアライゼーション往復なし。メモリだけ。**

## 各モジュールが届けたもの

**Module 1 (Custom EVM bootstrap, L1-L3)** — プラガブルなシーム：

- `OpenHlEvmFactory` が `alloy_evm::EvmFactory` を実装 — Reth の「スロットを 1 つ swap」カスタム EVM インターフェース。
- `OpenHlExecutorBuilder` が `reth_node_builder::ExecutorBuilder` を実装 — NodeBuilder plug-in の形。
- `openhl_precompiles(base)` が Reth の標準 precompile set を hardfork ごとにカスタムアドレスで拡張（`OnceLock` キャッシュ）。
- Reth が `.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))` で我々の EVM で boot。

**Module 2 (Read precompile, L4-L6)** — スマートコントラクトが live CLOB state を read：

- `CLOB_READ_BEST_BID` を `0x...0c1b` に — empty calldata、64-byte ABI-encoded `(price, qty)` を返す。
- `CLOB_STATE` global：`RwLock<Option<Arc<Mutex<Book>>>>` — bridge の Book へのプロセスグローバル handle。
- `install_clob` / `uninstall_clob` / `current_best_bid` — ライフサイクルと read プリミティブ。
- テスト証明済み：uninstalled で zero output、installed で live values、registry 経由で dispatch 呼び出し可能。

**Module 3 (Write precompile, L7-L8)** — スマートコントラクトが CLOB に write：

- `CLOB_PLACE_ORDER` を `0x...0c1c` に — 128-byte ABI-aligned calldata `(account, side, price, qty)`、32-byte `(order_id)` を返す。
- `NEXT_ORDER_ID: AtomicU64` — wait-free ID 割り当て、1 から開始で `0` = rejected sentinel。
- Rejection path：短い input、無効 side byte、qty=0、CLOB 未インストール。
- テスト証明済み：rejection で book は touch されない、有効 input は正しく cross、2-precompile ラウンドトリップが動く。

**Module 4 (Bridge integration, L9-L10)** — Fill が bridge に戻る：

- `FILL_SINK` global：`RwLock<Option<Arc<Mutex<Vec<Fill>>>>>` — `CLOB_STATE` と並行構造。
- `LiveRethEvmBridge::new()` が所有する Arc から両 global にインストール。
- `place_order` が fill を sink に push（installed なら） — bridge 側の `submit_order` と同じ drain で次の `build_payload` に届く。
- Integration test が実際の Reth プロセスでフルチェーンを証明：合計 48 tests（47 unit + 1 integration）。

## 正直に先送り

V0 がやらない 4 つ。それぞれ実際のプロダクションギャップ。それぞれコードでドキュメント化された上で*意図的に*先送りした。

### 1. RPC `eth_call` ラウンドトリップ

**証明したこと**：Rust から直接 `place_order(...)` と `current_best_bid()` を呼ぶ動作、precompile が `openhl_precompiles()` で Reth EVM に登録されること。

**証明していないこと**：JSON-RPC 経由で `staticcall(0x...0c1b, "")` を呼ぶ Solidity コントラクトが実際に我々の関数に届くこと。そのパスは Reth の RPC server、transaction simulation、EVM dispatch を含む — Reth が正しく扱うと信頼する配線。

**先送りの理由**：このテストは主に Reth を validate するもので openhl ではない。我々の crate と Reth の統合境界は `openhl_precompiles()` — それが正しければ残りは Reth の責任。

**いつ見直す**：Reth を大幅に fork する、もしくは precompile registry インターフェースが変わるメジャーバージョン境界をアップグレードするとき。

### 2. マルチバリデータ deterministic OrderIds

**現状**：`NEXT_ORDER_ID: AtomicU64`、1 から開始するプロセスグローバルカウンタ。

**問題**：このコードを 2 つの validator で走らせると各自のカウンタを持つ。Validator A が`OrderId(5)` をある EVM call に、validator B が*同じ* call に `OrderId(11)` を割り当てる。**Book が silent に分岐。** エラーなし、crash なし — read が異なる値を返すまでネットワーク全体で不整合 state。

**先送りの理由**：openhl v0 は single-validator。OrderIds のマルチバリデータコンセンサスは (a) EVM call 自体から deterministic な ID 導出（例：`keccak(tx_hash, call_index)`）、もしくは (b) block-scoped 共有 state から ID を読む、のどちらか。

**いつ見直す**：マルチバリデータ deployment 前。**これはネットワーク分岐バグが起きるのを待っているだけ。** `NEXT_ORDER_ID` の doc コメントが static の定義場所でこれを名指すので、将来のコード読者は制約を見る。

### 3. Transaction-scoped state shadowing（revert ロールバック）

**現状**：`place_order` が precompile 実行中*即座に* Book を mutate。

**問題**：EVM transaction が後で revert した場合（`place_order` 成功後）、book mutation はロールバックされない。EVM の通常の storage セマンティクスは transaction と一緒に revert する — だが我々の Book は EVM storage の外、プロセスグローバル Arc に住む。

**先送りの理由**：Storage shadowing は (a) Book mutation を journal して revert で replay する、もしくは (b) EVM 実行中はマッチングエンジンを「virtual」モードで走らせ transaction 成功で commit する、のどちらかが必要。両方とも non-trivial。openhl v0 は punt。

**いつ見直す**：プロダクショントラフィックに「order を発注した後に途中で fail しうるコントラクト」が含まれるとき。**Single-actor シナリオ（1 つのマッチングコントラクト、外部コンポーザビリティなし）なら問題なし。DeFi コンポーザビリティシナリオなら絶対に問題。**

### 4. `staticcall` mutation 拒否

**現状**：`place_order` は呼ばれ方に関わらず Book に書く。

**問題**：Solidity の `staticcall` は read-only アクセスを enforce するはず — だが EVM は static-call フラグを我々の precompile に渡さない。コントラクトは `STATICCALL(0x...0c1c, ...)` でき、我々は喜んで book を mutate、コントラクトの read-only セマンティクスへの期待を破る。

**先送りの理由**：REVM の `PrecompileFn` signature は `fn(&[u8], u64, u64) -> PrecompileResult`。「これは staticcall か？」フラグは第 3 引数にない（それは gas reservoir）。追加のコンテキストを通す必要があり、REVM 修正（fork）か上流 API 待ち。

**いつ見直す**：セキュリティ監査がこれを実際の攻撃 vector としてフラグするとき。**攻撃シナリオは contrived** — ほとんどのコントラクトは既知の write precompile を `STATICCALL` しない — だが慎重な監査者は名指す。

## 次に来るもの

このコース後に出荷できる 4 つの拡張、複雑度順。

### Extension 1: `best_ask` precompile（1 日）

`read_best_bid` を sell 側にミラー。同じ形、逆方向。新アドレス（`0x...0c1d`？）、新関数 1 つ、テストコード ~30 行。**`read_best_bid` への構造的並行で、ほぼ機械的に作れる。**

### Extension 2: `clob_depth_at_price` precompile（2-3 日）

`(side, price)` calldata を取り、その価格レベルで rest する合計 qty を返す。Market order 発注前にスリッページを推定したいコントラクトに有用。`Book::depth_at_price()` メソッドと新 precompile を追加。**概念的に似ているが calldata layout に input parameter を含む拡張。**

### Extension 3: `clob_cancel_order` precompile（1 週間）

`(order_id, account)` calldata を取り、order が caller のものなら book から削除。成功/失敗を返す。**認可問題が追加** — caller が order を発注したアカウントだとどう検証する？ EVM call の `msg.sender` は precompile を呼んだコントラクト、元アカウントではない。**`keccak(account_id, signature)` スキーム、もしくは事前登録された認可マッピングが必要。** アカウントモデルを決めるまで認可設計は先送り。

### Extension 4: Fill を EVM event として（2 週間）

現在 fill は `bridge.pending_fills` に届き、payload-built block に attach される。**スマートコントラクトはそれを観測できない。** Fill を EVM event として emit すれば、下流コントラクトが `eth_getLogs` / event filter で subscribe できる — ERC-20 transfer の subscribe と同じ。

**メカニズム**：`place_order` 末尾で各 fill を Solidity-ABI-encoded event として encode、`revm::interpreter::Interpreter::add_log(...)` を呼ぶ（もしくは EVM バージョンの相当物）。Event を emit するコントラクトは precompile 自身（アドレス `0x...0c1c`）。

**複雑度**：Precompile は通常 event を emit しない。この revm API は awkward — `PrecompileFn` signature の拡張が必要かも、つまり小さな revm fork。**High-impact、high-friction。** 明確なプロダクト需要があるまで先送り。

## コース完了 — 内在化したこと

このコースで練習したスキルは CLOB precompile を超えて一般化する：

1. **カスタム EVM の「スロットを 1 つ swap」パターン。** Reth の EVM に自分の dispatch を plug-in したいとき — カスタム opcode、カスタム transaction 検証、カスタム gas pricing — パスは同じ：`EvmFactory` + `ExecutorBuilder` + `.with_components(...)`。

2. **Precompile state のプロセスグローバル Arc パターン。** REVM の関数ポインタ signature ではクロージャは使えない。プロセスグローバル storage が唯一の選択肢。**パターンは複利**：1 つの共有 state（CLOB）があれば、追加（fill sink）は機械的。

3. **Schema-first プロトコル設計。** 実装（L8）の前に calldata layout（L7）を固めれば、schema に対してビルドされたコントラクトは実装の進化で壊れない。**契約は schema、関数 body ではない。**

4. **敵対的テストデータ。** 「best = 最高価格、最大数量ではない」を証明する 2 つの異なる価格 order。Fill を流す maker + taker。各テスト値が正しさを偶然から分離すべき。

5. **Documentation での正直な scoping。** 各先送り項目を関連コード site の doc コメントで名指す。**将来の読者がギャップと理由を 1 箇所で見る。** Documented でないギャップは見えない技術負債。

## このコースが L1 Architect track のどこに位置するか

**Course 1-5**（Reth internals）：Reth の pipeline、payload building、NodeBuilder、evm crate、RPC。

**Course 6-7**（consensus + CLOB）：openhl 特有の機構 — Malachite コンセンサス統合、次にマッチングエンジン。

**Course 8（このコース）**：カスタム precompile で EVM ↔ CLOB を橋渡し。**Reth のプラガブル EVM シームに触れる最初のコース。**

**Course 9**（funding state machine）：Perpetuals 特有 — CLOB を perp DEX にする funding rate 機構。Course 8 の precompile パターンの上に構築。

**Course 10**（capstone — フル openhl deployment）：1-9 のすべてを取り、実行可能な openhl node + サンプルトレーディングコントラクトを出荷。

L1 Architect track の 80% を踏破した。**ここで学んだパターンが残りすべての基礎。**

## 最終答え合わせ

```bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/ ./crates/evm/ --recursive
```

L11 後、**`crates/evm/` ディレクトリ全体が byte-identical** に openhl の Stage 9c+ HEAD と一致するはず。5 commit（9a、9b、9c、9c+、9d）を手で再現した — 各行がなぜそこにあるかを完全に理解した上で。

戻す：

```bash
git checkout main
```

## あなたがこれを出荷した

47 unit test。1 integration test。2 つのカスタム precompile。2 つのプロセスグローバル。1 つの EvmFactory。1 つの ExecutorBuilder。~600 行のプロダクション Rust コード。スマートコントラクトが同じノードで動くマッチングエンジンを read/write できる — `ecrecover` と BLS12-381 を扱うのと同じ EVM dispatch を通して。

**それが Reth の上に構築されたカスタム L1 トレーディングプリミティブ。** さあ出荷を。
````

---

## Seed-file slot

L11 は新規 Module 5 (Capstone) の sortOrder 0 に入る：

```typescript
{
  title: 'レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの',
  slug: 'openhl-precompiles-capstone-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 20,
  xpReward: 40,
  content: `# レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの\n\n...`
},
```

新規モジュールエントリ：

```typescript
5: { title: 'Capstone', sortOrder: 5 },
```

## SHA pinning discipline

L11 はコード変更を導入しない。累積答え合わせチェック（`diff -u crates/evm/ -r`）は L10 と同じ HEAD `d19ba1b` に対して。

## Style review notes (self-critique before paste)

- **§ゴールが L11 をメンタルモデルレッスンとしてフレーミング** — コードなし、統合だけを明示。
- **§アーキテクチャ図**が centerpiece — 読者がいつでも構造を思い出すために戻れる。
- **§モジュールごとの分解**が各モジュールを 3-4 bullet に凝縮 — レビュー用に有用。
- **§正直に先送り**が 4 つのプロダクションギャップを **先送り理由** と **いつ見直す** とともに名指す。「いつ見直す」フレーミングが action-oriented — 読者がトリガー条件を認識できる。
- **§次に来るもの**が 4 つの拡張を複雑度順で sketch — 読者に自分の次ステップへのロードマップ。
- **§内在化したスキル**が 5 つの一般化可能パターンをコース内容から持ち上げる。**これがコース固有の詳細を超えて生き残る takeaway。**
- **§コースの位置づけ**が L11 をより広い L1 Architect track に anchor。
- **§あなたがこれを出荷した**がお祝いの段落 — 具体的な数字（47 + 1 テスト、2 precompile 等）が達成を tangible にする。
