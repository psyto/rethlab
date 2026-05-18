# Building OpenHL — L0 draft (JA)

> openhl SHA `0844d58` (Stage 7c) に対してドラフト。Orientation レッスン — 他のレッスンが前提とする地図。レッスン 1〜13 を draft 後に追加 — preview で「本コースの 3am hook は openhl の前提知識なしには刺さらない」ことが判明したため。
> EN ミラー: `drafts/openhl_l0_en.md`。
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10)。

---

## L0 — `openhl-orientation-ja`

- **Module:** 0 (Orientation)、module 内 sortOrder 0
- **Course-level sortOrder:** -1 (14 レッスン中の 0 番目 — L1 の前に置かれる)
- **Duration:** 15 分
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# OpenHL の全体像 — repo、subsystem、Build arc

Hyperliquid は 2025 年に $300B+ の perp 取引量を完全クローズドソースのスタック — HyperBFT consensus、HyperCore matching engine、HyperEVM execution — の上で処理した。公開された Rust 実装はどこにも存在しない。**`openhl` は、そのスタックをオープンソースで実装するとどうなるかを示すリファレンスだ。**

このレッスンに続く 13 レッスンは、すでに `openhl` が何か、コードがどこに配置されているか、各レッスンが数ヶ月にわたる build のどの位置にあるかを把握している前提で書かれている。**本レッスンはその地図だ。** ここでしっかり読んでおけば、後のレッスンが格段に読みやすくなる。

> 🛑 **スクロール前に予測。** これから Hyperliquid 形の L1 を読み解いていく。先に進む前に、このクラスの L1 のアーキテクチャを 5 つの箱で紙に sketch してみよ。ヒント: 小さな contract を介して通信する 2 つの層 + I/O 側の層が compose する 3 つの pure subsystem。

## 1. OpenHL とは何か

`psyto/openhl` の `README.md` より:

> An open-source reference implementation of a Hyperliquid-shape L1: BFT consensus + EVM execution + a CLOB matching engine, with first-class vault primitives.

訳すと「Hyperliquid 形 L1 のオープンソース・リファレンス実装。BFT consensus、EVM execution、CLOB matching engine の 3 本柱に加えて、first-class な vault primitive を備える」。

この 1 文には押さえるべき要点が 3 つある:

| フレーズ | 何を commit しているか |
| :--- | :--- |
| 「Open-source reference implementation」 | すべてが GitHub の `psyto/openhl` に存在、MIT + Apache-2.0 dual-license。Private repo も内部 fork もない。 |
| 「Hyperliquid-shape L1」 | Hyperliquid のクローンではない。同じ *アーキテクチャの形* — 同じ 5 サブシステムが同じ関係で並ぶ — だが、HL のプロプライエタリコードの port ではなく、Reth + Malachite の上に書かれた clean-room な Rust 実装だ。 |
| 「First-class vault primitives」 | Vault はアプリ層の後付けではない。チェーンのプリミティブとして組み込まれている — auto-compounding、delta-neutral、funding-rate-capture 等の戦略が、custody や会計をゼロから実装するスマートコントラクトを書く代わりに、直接 vault primitive に対して compose できる。 |

`openhl` は rethlab L1 Architect tier の worked example が実装される場所でもある。本コースで扱うすべての概念が、`file:line@SHA` 形式で pin できる commit の実 Rust コードに対応する — そして cite が壊れていないかを CI が確認する。

> 🛑 **反流暢性。** 「OpenHL は Hyperliquid の fork だ。」 **違う。** Fork なら Hyperliquid のソースを import して上から patch することになる。`openhl` は *clean-room* 実装だ: 同じアーキテクチャと同じ外部挙動を、Reth と Malachite という公開ライブラリと、Hyperliquid が公開しているドキュメントだけを参照して組み上げたもの。この区別はライセンス上 (HL の IP に触れない) と教育上 (clean-room とは、説明可能な first principles から構築されたコードだということ) の両方で重要だ。

## 2. なぜ存在するか

理由は 2 つ、どちらも本質的だ:

1. **エコシステムのためのオープンな substrate。** HL 形のアプリ (vault プロダクト、market-maker bot、structured-product DEX) はどれも、HL のクローズドスタックを信用するか、自分で substrate を作り直すかの二択を強いられている。`openhl` がその substrate にあたる — 公開済みで fork 可能。

2. **教材として読めるコードベース。** BFT-L1 の教材の多くはアルゴリズム解説で止まる (ホワイトボード上の Tendermint、prevote/precommit の矢印)。`openhl` はその先まで踏み込む: `cargo build` でコンパイルされる実 Rust workspace で、本質的な piece はすべて `file:line` で cite でき、`cargo test` で実行できる。rethlab L1 Architect tier は、このコードベースを worked example として題材化したコース群だ。

この dual-use 構造の効果は複利で効いてくる。1 つのコード投資が 2 つの output を生む: 動く L1 substrate と、13 レッスンの教材アーティファクト。OSS のサイドプロジェクトはたいてい片方しか選ばない。

## 3. 5 つのサブシステム

`docs/architecture.md` より:

```
┌─────────────────────────────────────────────────────────┐
│                       openhl                             │
├───────────────────────────────┬─────────────────────────┤
│ Consensus Layer (CL)          │ Execution Layer (EL)    │
│ Malachite BFT                  │ Reth (ライブラリ mode)   │
│ leader election、voting、       │ EVM execution、state、   │
│ view change、finality          │ payload building、RPC   │
└───────────┬───────────────────┴──────────┬──────────────┘
            │                              │
            └──────── 4 メッセージ contract ─┘
                   (ConsensusBridge trait)

              EL が compose する 3 つの pure state machine:

      ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
      │   CLOB      │  │  Settlement  │  │    Vault    │
      │ orderbook   │  │  funding/    │  │  strategy   │
      │ matching    │  │  oracle/     │  │  primitive  │
      │             │  │  liquidation │  │             │
      └─────────────┘  └──────────────┘  └─────────────┘
```

2 つの層、3 つの pure state machine、層と層を繋ぐ 1 つの contract。**これがアーキテクチャの全体像だ。** コードベースの他のすべては、この 5 つの箱のいずれかに属する実装詳細にすぎない。

CL/EL の二層構造は Ethereum (Lighthouse / Reth split、Engine API contract) の形を意図的に借りたものだ。一方、3 つの pure state machine は HL 固有: Ethereum のような汎用 L1 には存在しないが、HL 形の L1 が perp DEX として機能するためにはこの 3 つすべてが必要になる。

## 4. 10 個の crate

上のアーキテクチャは、10 個の library crate + node バイナリの Rust workspace にマップされる。Split は意図的だ:

```
bin/openhl/                        薄いバイナリ、crates/node を呼ぶ

crates/
├── types/         shared primitives (BlockHash、PayloadId 等) — Module 1
├── codec/         consensus メッセージの canonical encoding
├── clob/          orderbook state machine — Module 2
├── oracle/        mark price aggregation — Module 4
├── funding/       funding-rate 計算 + 決済 — Module 4
├── liquidation/   liquidation エンジン — Module 4
├── vault/         protocol-native vault primitive — Module 5
├── evm/           Reth 統合 + core↔EVM precompile — Module 1 + 3
├── consensus/     Malachite BFT アプリ側の配線 — Module 1
└── node/          consensus + evm + clob を Node::run() に組み立て — Module 1
```

Pure state machine の crate (`types`、`codec`、`clob`、`oracle`、`funding`、`liquidation`、`vault`) は I/O を一切持たない。`proptest` でテストし、ケースあたりマイクロ秒で回り、構造上 deterministic だ。I/O 側の crate (`evm`、`consensus`、`node`) が外界とのやり取りを引き受ける。

| Crate グループ | I/O? | テスト方法 |
| :--- | :--- | :--- |
| Pure state machine (7 crate) | なし | unit + proptest、ケースあたりマイクロ秒 |
| I/O 境界 (3 crate) | あり | 統合テスト、devnet replay |

> 🛑 **反流暢性。** 「Pure / I-O split はコードスタイルの好みだ。」 **違う。** マルチバリデータの state が分岐するのを防ぐための determinism レールだ。Pure crate は `SystemTime::now`、`HashMap` の iteration 順序、`rand`、その他ホスト依存の挙動を絶対に呼ばない — 1 LSB でも 2 validator の結果がずれれば、その瞬間チェーンが fork する。Split は code review と `unsafe_code = "forbid"` で強制されている。スタイルの選択として扱った場合、最初の hardfork-sensitive な処理が走った瞬間に fork するチェーンを ship することになる。

## 5. Build arc

`openhl` は 5 つの module に分けて出荷される。各 module で動くコードが ship され、それに対応する rethlab コースもセットで公開される。README より:

| # | Module | 触れる crate | Land するもの |
| - | --- | --- | --- |
| **1** | **Consensus substrate** (Malachite + Reth) | `consensus`、`evm`、`node`、`types`、`codec` | **Single-validator devnet が end-to-end でブロックを produce する。** *← 本コースはこの module をカバーする。* |
| 2 | CLOB matching engine | `clob`、`types`、`codec` | Real transaction がチェーンに入る。EVM block に実際の fill が含まれる。 |
| 3 | Core ↔ EVM precompile | `evm`、`clob` | スマートコントラクトが live な orderbook state を読める。 |
| 4 | Funding、oracle、liquidation | `funding`、`oracle`、`liquidation` | Perp の決済ループ。チェーンが perp DEX に見える。 |
| 5 | Protocol-native vault primitive | `vault` | auto-compounding、delta-neutral 等の vault 戦略が、アプリ層のコントラクトではなくチェーンのプリミティブになる。 |

**本コースが扱うのは Module 1 だけだ。** Module 2-5 はそれぞれ L1 Architect tier 内の別コースとして提供される。本コースを終えれば substrate が手に入る。Module 1+2+3 まで終えれば動く perp DEX、5 つすべてを終えれば openhl 全体が組み上がる。

> 🛑 **予測。** 「openhl を面白くしている」のは orderbook なのに、なぜ Module 1 が Module 2 (CLOB) より先に ship するのか? **ヒント: その下に consensus substrate がなければ、`validate_payload` は validate する対象を何も持たない。**

答え: CLOB は pure state machine で、output として fill を produce する。しかしその fill が意味を持つのは、fill を順序付ける consensus と、fill を transaction として適用する EVM が下に揃っていてこそだ。Module 1 で CLOB が後から plug in する substrate を build する。それがない段階の CLOB は `cargo test` のアーティファクトでしかなく、まだチェーンではない。Build 順序は依存順序に従う — Module 1 が先頭に来るのは、Module 2-5 がすべて Module 1 の `ConsensusBridge` に依存するからだ。

## 6. 本コースの構成 — 13 レッスンを 5 つに分けて

本コースの 13 レッスンは、Module 1 (「Consensus substrate」) を 5 つの内部チャンクに分けて扱う。各チャンクはあくまで *本コース内* のサブモジュールであり、上の openhl Build arc 全体の Module 1-5 とは別物なので混同しないこと。

| 本コースのサブモジュール | レッスン | 読み終えて分かること |
| :--- | :--- | :--- |
| **1. execution/consensus split** | レッスン 1、2 | なぜすべての BFT-L1 が CL と EL の間に 4 メッセージの contract を置くのか。なぜ HL/Tempo/CometBFT が同じ形に収束するのか。 |
| **2. ライブラリとしての Malachite** | レッスン 3、4、レッスン 5 | Malachite が提供するもの (`Context` trait)、自分で実装すべきもの (10 個の sub-type と `SigningProvider`)、プロトコルの state machine を実稼働可能なエンジンに変える actor model。 |
| **3. ライブラリとしての Reth** | レッスン 6、7、レッスン 8 | なぜ Reth を fork するのではなく configure するのか (`NodeBuilder` の slot)。Consensus と execution がやり取りする Engine API の surface。Reth の `PayloadBuilderService` がブロックを組み立てる仕組み。 |
| **4. 配線** | レッスン 9、10、レッスン 11 | `ConsensusBridge` trait の設計判断。Malachite の `Decided` から Reth の `forkchoice_updated` への流れ。`engine_app.rs` における proposer の hot path。 |
| **5. Single-validator devnet** | レッスン 12、13 | Bootstrap (genesis、鍵、single-node config)。actor system を通じて 1 ブロック分の合意を 0.02 秒で走らせる統合テスト — v0 milestone。 |

レッスン 13 を読み終える頃には、`first_block_via_engine_actors` 統合テスト (`crates/consensus/src/engine_app.rs:246@0844d58`) が real Reth と real Malachite を end-to-end で駆動し、decided block を 1 つ produce する状態に到達する。**これが openhl Module 1 の v0 milestone** であり、本コースが連れていく最終地点だ。

## 7. 残りのコースの読み方

最初に押さえておくべきパターンが 3 つある:

1. **3am hook。** すべてのレッスンが debug シナリオで始まる (page された、何かが壊れた、原因を N 秒で特定しろ)。シナリオは、読者の頭の中で `openhl` がすでに動いていることを前提にする; 本レッスンはその前提を成立させるための準備だ。Hook で迷子になったら §3 (アーキテクチャ図) に戻ること。

2. **`🛑` callout。** 2 種類ある: **予測** (答えを読む前に sketch する一時停止) と **反流暢性** (よくある誤った直感を名指しで指摘する)。どちらも、立ち止まって考える価値がある。

3. **`file:line@SHA` cite。** すべてのコード参照は特定の openhl commit に pin されている。`git checkout 0844d58` (またはレッスンが cite する SHA) すれば、レッスンが説明しているのとまったく同じコードが手元で読める。push のたびに CI が cite を verify する。

これで残りのコースに進む準備ができた。

## 8. 練習

1. **ソースを読め。** `https://github.com/psyto/openhl` を開き、`README.md` を最初から最後まで読み、続けて `docs/architecture.md` を読む。両方とも 1 画面に収まる短さだ。
2. **アーキテクチャを sketch せよ。** 読み返さずに、§3 の 5 サブシステム図を紙に描き起こせ。各箱を実装している crate のラベルも付けること。終わったら §4 のツリーと突き合わせる。
3. **Build-arc の依存を 1 つ trace せよ。** Module 2 (CLOB) を取り上げ、Module 1 から何を受け取り、Module 3 に何を渡すかを書き出せ。(ヒント: §5 のテーブルが部分的に答えている。残りはアーキテクチャを丁寧に見ていけば分かる。)

> **最終チェック。** 1 文で、なぜ「Hyperliquid 形」が openhl にとって正しい framing で、「Hyperliquid クローン」や「Hyperliquid fork」が正しくないのか? 答えに「同じアーキテクチャ、clean-room 実装、プロプライエタリコードに触れていない」が含まれていなければ、§1 を再読。
````

---

## Seed-file slot

レッスン 0 は新規の Module 0 (「Orientation」、sortOrder 0) に landing する。他の全 module の sortOrder は +1 される:

```typescript
// Course.modules.create array:
{
  title: 'Orientation',
  sortOrder: 0,
  lessons: { create: [
    {
      title: 'OpenHL の全体像 — repo、subsystem、Build arc',
      slug: 'openhl-orientation-ja',
      type: 'CONTENT',
      sortOrder: 0,
      duration: 15,
      xpReward: 40,
      content: `# OpenHL の全体像 — repo、subsystem、Build arc\n\n...`  // L0 markdown
    },
  ]}
},
{
  title: 'Execution/consensus split',
  sortOrder: 1,  // was 0
  lessons: { create: [
    // L1, L2
  ]}
},
// Module 2 → sortOrder 2 (was 1)
// Module 3 → sortOrder 3 (was 2)
// Module 4 → sortOrder 4 (was 3)
// Module 5 → sortOrder 5 (was 4)
```

コース合計は更新される: 13 → 14 レッスン、195 → 210 分、560 → 600 XP。

## SHA pinning discipline

レッスン 0 は EN ミラー同様 `openhl@0844d58` を pin する。Cite される surface:
- `README.md` (§1 の「Open-source reference implementation...」文)
- `docs/architecture.md` (§3 の 5 サブシステム分解、§4 の pure/I-O テーブル)
- `crates/consensus/src/engine_app.rs:246@0844d58` (§6 の v0 milestone テスト)

`README.md` / `docs/architecture.md` の形が変われば レッスン 0 の §1-§5 も追随が必要。`engine_app.rs:246` cite は CI cite-check が line-number drift をキャッチする; prose の引用はゆるい。

## Style review notes (self-critique before paste)

- **レッスン 0 は他レッスンと違って `3am` シナリオで始まらない** — マーケットファクト hook (「Hyperliquid が 2025 年に $300B を処理した」) で始まる。意図的だ: `3am` hook は読者が何が走っているかを知って初めて land する。レッスン 0 はそれを可能にするためのレッスンであり、ここで `3am` を使うと循環する。
- **§3 の ASCII 図** は load-bearing なリファレンスアーティファクトだ。後続のすべてのレッスンがこの図上に位置づけられる。Reviewer が引き締めを望むなら、**図はカットせず**、周りの prose を削れ。
- **§5 の「本コースは Module 1 のみをカバーする」行** は レッスン 13 の「Module 2 は次のコース」framing を成立させる orientation だ。これがないと レッスン 13 で読者は文脈で「Module 2」が何を意味するか分からない。
- **§6 のテーブルは §5 の openhl Build arc テーブルとネーミング上 conflict する。** 両方とも「Module 1-5」を使うが意味が違う (openhl 全体 vs 本コース内)。§6 で明示的に区別している; reviewer が混乱と感じれば、本コースのサブモジュールを「Part 1-5」または「Section 1-5」にリネームする — course-wide rename で 13 既存レッスンすべてに触れる。Reviewer の flag があるまで保留。
- **翻訳 policy は他の JA レッスンと同一**:
  - 「Hyperliquid-shape」「load-bearing」「Build arc」「subsystem」「primitive」「substrate」「fork」「clean-room」「dual-use」「compound」「first-class」等は英語のまま。
  - 「OSS」「IP」「LSB」「hardfork-sensitive」等の業界用語も英語のまま。
  - 🛑 callout: Predict → 予測、Anti-fluency → 反流暢性。
  - File paths、crate names、function names、code は英語のまま。
- **「リファレンス実装」と「reference implementation」の併用**: §1 のテーブル行は英語フレーズの後にカッコで日本語訳を添えた、Reth README の用語と JA エンジニアの直感の両方をつなげるため。
- **未公開**: `course.isPublished: false` のまま。全 14 レッスンの最終レビューが終わってから一斉公開予定。
