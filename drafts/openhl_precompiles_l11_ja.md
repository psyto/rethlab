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

- EVM ↔ CLOB のアーキテクチャを、記憶からホワイトボードに描ける。
- v0 で先送りした 4 項目（RPC ラウンドトリップ、マルチバリデータでの OrderId、transaction-scoped なロールバック、staticcall での mutation 拒否）を名指し、それぞれが範囲外である理由を説明できる。
- 拡張がどこに足されるかを 4 つ描ける（best_ask precompile、depth precompile、clob_cancel_order、fill を EVM event として出す機構）。
- 自分の Reth ベースの L1 でカスタム precompile を出荷する準備ができている。

**このレッスンにコードはなし。** メンタルモデルだけだ。

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

上から下：bridge がデータを所有し、precompile モジュールがプロセスグローバルな handle で公開し、EVM が precompile への call を dispatch する。Solidity コントラクトは、`ecrecover` を叩くのと同じ感覚で同じアドレスを叩く。

下から上：スマートコントラクトが `STATICCALL(0x...0c1b)` を発行する。Reth の EVM が precompile registry でアドレスを引き、`read_best_bid` に dispatch し、`CLOB_STATE` から read する — そしてそれは、bridge の `submit_order` が書き込んでいるのと同じ `Arc<Mutex<Book>>` だ。**翻訳レイヤなし。シリアライゼーションの往復なし。メモリだけ。**

## 各モジュールが届けたもの

**Module 1（Custom EVM bootstrap, L1-L3）** — プラガブルなシーム：

- `OpenHlEvmFactory` が `alloy_evm::EvmFactory` を実装 — Reth の「1 スロットだけ差し替える」カスタム EVM インターフェース。
- `OpenHlExecutorBuilder` が `reth_node_builder::ExecutorBuilder` を実装 — NodeBuilder の plug-in 形式。
- `openhl_precompiles(base)` が Reth の標準 precompile セットを、hardfork ごとに自分のアドレスを足して拡張する（`OnceLock` でキャッシュ）。
- Reth が `.with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))` で、こちらの EVM 付きで boot する。

**Module 2（Read precompile, L4-L6）** — スマートコントラクトが live な CLOB state を read できる：

- `CLOB_READ_BEST_BID` を `0x...0c1b` に登録 — 空 calldata を受け取り、64-byte ABI-encoded な `(price, qty)` を返す。
- `CLOB_STATE` global：`RwLock<Option<Arc<Mutex<Book>>>>`、bridge の Book へのプロセスグローバルな handle。
- `install_clob` / `uninstall_clob` / `current_best_bid` — ライフサイクルと read プリミティブを提供する。
- テストで証明済み：uninstalled なら zero output、installed なら live な値、registry 経由の dispatch でも呼び出し可能。

**Module 3（Write precompile, L7-L8）** — スマートコントラクトが CLOB に write できる：

- `CLOB_PLACE_ORDER` を `0x...0c1c` に登録 — 128-byte の ABI-aligned な calldata `(account, side, price, qty)` を受け取り、32-byte の `(order_id)` を返す。
- `NEXT_ORDER_ID: AtomicU64` — wait-free な ID 割り当て。1 から開始し、`0` は rejected sentinel として使う。
- rejection path：入力長不足、無効な side byte、qty=0、CLOB 未インストール。
- テストで証明済み：rejection 時に book は触られない、有効な入力は正しくクロスする、precompile 2 つでのラウンドトリップが成立する。

**Module 4（Bridge integration, L9-L10）** — fill が bridge に戻る：

- `FILL_SINK` global：`RwLock<Option<Arc<Mutex<Vec<Fill>>>>>` — `CLOB_STATE` と並ぶ構造。
- `LiveRethEvmBridge::new()` が自身が所有する Arc を、両方の global に install する。
- `place_order` は（sink が install されていれば）fill を sink に push し、bridge 側の `submit_order` と同じ drain を通って次の `build_payload` に届く。
- integration test が、実際の Reth プロセス内でフルチェーンを証明する：合計 48 tests（unit 47 + integration 1）。

## 正直に先送り

v0 でやっていない 4 項目だ。どれも実際のプロダクションギャップにあたる。いずれもコード側でドキュメント化した上で *意図的に* 先送りした。

### 1. RPC `eth_call` のラウンドトリップ

**証明したこと**：Rust から直接 `place_order(...)` や `current_best_bid()` を呼んで動くこと、そして precompile が `openhl_precompiles()` で Reth の EVM に登録されること。

**証明していないこと**：JSON-RPC 経由で `staticcall(0x...0c1b, "")` を呼ぶ Solidity コントラクトが、実際にこちらの関数まで届くこと。そのパスは Reth の RPC サーバ、transaction simulation、EVM dispatch を含む — そこは Reth が正しく扱ってくれることを信用して任せる部分だ。

**先送りの理由**：このテストは主に Reth を validate するものになり、openhl を validate するものにはならないからだ。こちらの crate と Reth の統合境界は `openhl_precompiles()` — そこさえ正しければ、残りは Reth の責任だ。

**いつ見直すか**：Reth を大幅に fork するとき、または precompile registry インターフェースが変わるメジャーバージョンをアップグレードするとき。

### 2. マルチバリデータでの deterministic な OrderId

**現状**：`NEXT_ORDER_ID: AtomicU64`、1 から始まるプロセスグローバルなカウンタ。

**問題**：このコードを 2 つの validator で走らせると、それぞれが自分のカウンタを持つ。Validator A が `OrderId(5)` をある EVM call に割り当て、Validator B は *同じ* call に `OrderId(11)` を割り当てる、ということが起こる。**book が静かに分岐する。** エラーも crash も出ない — read が異なる値を返すまで、ネットワーク全体で state が食い違ったままになる。

**先送りの理由**：openhl v0 は single-validator 前提だからだ。OrderId のマルチバリデータコンセンサスを取るには、(a) EVM call 自体から deterministic に ID を導出する（例：`keccak(tx_hash, call_index)`）か、(b) block-scoped な共有 state から ID を読む、のどちらかが必要になる。

**いつ見直すか**：マルチバリデータ deployment の前。**これはネットワーク分岐バグの種そのもの。** `NEXT_ORDER_ID` の doc コメントで static の定義場所からこれを名指してあるので、将来コードを読む人もこの制約に気づける。

### 3. Transaction-scoped な state shadowing（revert によるロールバック）

**現状**：`place_order` は precompile 実行中に *即座に* Book を mutate する。

**問題**：`place_order` 成功後に EVM transaction が revert すると、book 側の mutation はロールバックされない。EVM の通常の storage セマンティクスでは transaction と一緒に revert するが、こちらの Book は EVM storage の外、プロセスグローバルな Arc の中に住んでいるためだ。

**先送りの理由**：storage shadowing を実現するには、(a) Book の mutation を journal しておいて revert 時に replay する、もしくは (b) EVM 実行中はマッチングエンジンを「virtual」モードで動かし、transaction が成功したら commit する、のどちらかが必要だ。どちらも non-trivial。openhl v0 では punt する。

**いつ見直すか**：プロダクションのトラフィックに「order 発注後に途中で fail しうるコントラクト」が混ざってきたとき。**single-actor のシナリオ（マッチングコントラクトが 1 つ、外部とのコンポーザビリティなし）なら問題はない。DeFi のコンポーザビリティシナリオなら絶対に問題になる。**

### 4. `staticcall` での mutation 拒否

**現状**：`place_order` は、呼ばれ方を問わず Book に書き込む。

**問題**：Solidity の `staticcall` は read-only なアクセスを強制するはずだが、EVM は static-call フラグをこちらの precompile には渡してこない。コントラクトが `STATICCALL(0x...0c1c, ...)` を発行することは可能で、こちらは何の抵抗もなく book を mutate してしまう — コントラクト側の read-only 期待を裏切る形だ。

**先送りの理由**：REVM の `PrecompileFn` シグネチャは `fn(&[u8], u64, u64) -> PrecompileResult` で、「これは staticcall か?」のフラグは第 3 引数には入っていない（そこは gas reservoir）。追加のコンテキストを通す必要があり、REVM の修正（fork）か上流 API の対応待ちになる。

**いつ見直すか**：セキュリティ監査が、これを実際の攻撃 vector としてフラグしたとき。**攻撃シナリオは多少作為的** — write precompile として知られているものをわざわざ `STATICCALL` するコントラクトはまずない — だが、慎重な監査者なら必ず指摘する。

## 次に来るもの

このコースの後で出荷できる拡張を、複雑度順に 4 つ挙げる。

### Extension 1: `best_ask` precompile（1 日）

`read_best_bid` を sell 側に鏡写しにするだけ。形は同じ、方向だけ逆。新しいアドレス（`0x...0c1d` あたり?）、新しい関数 1 つ、テストコード ~30 行で済む。**`read_best_bid` と構造的に並ぶので、ほぼ機械的に作れる。**

### Extension 2: `clob_depth_at_price` precompile（2-3 日）

`(side, price)` の calldata を受け取り、その価格レベルで rest している qty の合計を返す。market order を発注する前にスリッページを見積もりたいコントラクトに便利だ。`Book::depth_at_price()` メソッドと、対応する新しい precompile を足す。**概念的には類似だが、calldata レイアウトに入力パラメータを含む点が新しい拡張ポイント。**

### Extension 3: `clob_cancel_order` precompile（1 週間）

`(order_id, account)` の calldata を受け取り、その order が caller のものなら book から削除する。成功/失敗を返す。**ここで認可の問題が出てくる** — caller がその order を発注したアカウント本人だと、どう検証するか? EVM call の `msg.sender` は precompile を呼び出したコントラクトであって、元のアカウントではない。**`keccak(account_id, signature)` のスキーム、または事前登録された認可マッピングのどちらかが必要。** アカウントモデルが固まるまでは、認可設計を先送りする。

### Extension 4: fill を EVM event として出す（2 週間）

現状、fill は `bridge.pending_fills` に届き、payload に積まれて block に attach される。**スマートコントラクトからは観測できない。** fill を EVM event として emit すれば、下流のコントラクトが `eth_getLogs` や event filter で subscribe できる — ERC-20 transfer を subscribe するのと同じ要領で。

**仕組み**：`place_order` の末尾で各 fill を Solidity ABI-encoded な event として encode し、`revm::interpreter::Interpreter::add_log(...)` を呼ぶ（あるいは現在の EVM バージョンの相当 API を）。event を emit するコントラクトとしては precompile 自身（アドレス `0x...0c1c`）が振る舞う。

**複雑度**：precompile は通常 event を emit しない。この revm API は扱いづらい — `PrecompileFn` のシグネチャを拡張する必要があり、結果として revm の小さな fork が必要になる可能性がある。**インパクトは大きい一方、摩擦も大きい。** 明確なプロダクト需要が出るまで先送りする。

## コース完了 — 内在化したこと

このコースで練習したスキルは、CLOB precompile を超えて一般化する：

1. **カスタム EVM の「スロットを 1 つ差し替える」パターン。** Reth の EVM に独自の dispatch を plug-in したいとき — カスタム opcode、カスタムな transaction 検証、カスタム gas pricing など — 道筋は同じだ：`EvmFactory` + `ExecutorBuilder` + `.with_components(...)`。

2. **precompile state のための「プロセスグローバル Arc」パターン。** REVM の関数ポインタシグネチャではクロージャが使えないので、プロセスグローバルな storage が唯一の選択肢になる。**このパターンは複利で効く** — 共有 state を 1 つ（CLOB）作っておけば、もう 1 つ（fill sink）を足すのはほぼ機械的だ。

3. **schema-first なプロトコル設計。** 実装（L8）より先に calldata layout（L7）を固めれば、schema を前提にビルドされたコントラクトは実装の進化で壊れない。**契約は schema にあり、関数 body にはない。**

4. **敵対的テストデータ。** 「best = 最高価格であって最大数量ではない」を証明するための、価格の異なる 2 つの order。fill を流すための maker + taker。各テスト値は「正しさを偶然から切り分ける」役割を果たすべきだ。

5. **ドキュメント上で正直に scope を切ること。** 先送りした項目を、関連するコード site の doc コメントで名指す。**将来の読者は、ギャップとその理由を 1 箇所で読める。** ドキュメント化されていないギャップは、見えない技術負債になる。

## このコースが L1 Architect トラックのどこに位置するか

**Course 1-5**（Reth internals）：Reth の pipeline、payload building、NodeBuilder、evm crate、RPC。

**Course 6-7**（consensus + CLOB）：openhl 固有の機構 — Malachite コンセンサス統合に続いて、マッチングエンジン。

**Course 8（このコース）**：カスタム precompile で EVM ↔ CLOB を橋渡しする。**Reth のプラガブルな EVM シームに触れる最初のコース。**

**Course 9**（funding state machine）：perpetual 固有の機構 — CLOB を perp DEX に変える funding rate 機構。Course 8 の precompile パターンの上に積み上がる。

**Course 10**（capstone — openhl のフル deployment）：1-9 すべてを総動員し、実行可能な openhl ノードとサンプルトレーディングコントラクトを出荷する。

L1 Architect トラックの 80% を踏破した。**ここで学んだパターンが、残りすべての基礎になる。**

## 最終答え合わせ

```bash
cd ~/code/openhl-reference
git checkout d19ba1b
diff -u ~/code/my-openhl/crates/evm/ ./crates/evm/ --recursive
```

L11 を終えると、**`crates/evm/` ディレクトリ全体が、openhl の Stage 9c+ HEAD と byte-identical** に一致するはずだ。5 つの commit（9a、9b、9c、9c+、9d）を手で再現したことになる — しかも、各行がなぜそこにあるかを完全に理解した上で。

main に戻す：

```bash
git checkout main
```

## あなたが出荷したもの

unit test 47 個。integration test 1 個。カスタム precompile 2 つ。プロセスグローバル 2 つ。EvmFactory 1 つ、ExecutorBuilder 1 つ。プロダクション Rust コード ~600 行。スマートコントラクトは、同じノード上で動くマッチングエンジンを read/write できるようになった — `ecrecover` や BLS12-381 を扱うのと同じ EVM dispatch を通して。

**これが Reth の上に構築したカスタム L1 トレーディングプリミティブだ。** さあ出荷していこう。
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
