# Building OpenHL — L0 draft (JA)

> openhl SHA `0844d58` (Stage 7c) に対してドラフト。Orientation レッスン — 他のレッスンが前提とする地図。L1-L13 を draft 後に追加 — preview で「本コースの 3am hook は openhl の前提知識なしには刺さらない」ことが判明したため。
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

Hyperliquid は 2025 年に $300B+ の perp 取引量を完全クローズドソースのスタックで処理した — HyperBFT consensus、HyperCore matching engine、HyperEVM execution。Rust の public reference はどこにも存在しない。**`openhl` は、そのスタックのオープンソース版がどう見えるかを示すものだ。**

このレッスンに続く 13 レッスンは、すでに `openhl` が何か、コードがどこに住むか、各レッスンが数ヶ月にわたる build のどこに座るかを知っている前提で書かれている。**本レッスンはその地図だ。** 一度しっかり読んでおけば、後のレッスンの理解速度が上がる。

> 🛑 **スクロール前に予測。** Hyperliquid 形の L1 について読み進めることになる。スクロールせずに、このクラスの L1 に対して 5 ボックスのアーキテクチャ図を sketch してみよ。ヒント: 小さな contract を介して話す 2 つの半分 + I/O 側の半分が compose する 3 つの pure subsystem。

## 1. OpenHL とは何か

`psyto/openhl` の `README.md` より:

> An open-source reference implementation of a Hyperliquid-shape L1: BFT consensus + EVM execution + a CLOB matching engine, with first-class vault primitives.

(Hyperliquid 形の L1 — BFT consensus + EVM execution + CLOB matching engine、first-class な vault primitive 付き — のオープンソース・リファレンス実装)

この 1 文に load-bearing な要素が 3 つある:

| フレーズ | 何を commit しているか |
| :--- | :--- |
| 「Open-source reference implementation」 | すべてが GitHub の `psyto/openhl` に存在、MIT + Apache-2.0 dual-license。Private repo も内部 fork もない。 |
| 「Hyperliquid-shape L1」 | Hyperliquid のクローンではない。同じ *アーキテクチャの形* — 同じ 5 サブシステムが同じ関係で並ぶ — だが、HL のプロプライエタリコードの port ではなく、Reth + Malachite の上に書かれた clean-room な Rust 実装だ。 |
| 「First-class vault primitives」 | Vault はアプリ層の後付けではない。チェーンプリミティブだ — Kodiak / Yogi のような strategy は直接これに対して compose する。 |

`openhl` は rethlab L1 Architect tier の worked example の住処でもある。本コースのすべての概念が、`file:line@SHA` cite で pin できる commit の実 Rust コードに対応する — そして cite は CI が確認する。

> 🛑 **反流暢性。** 「OpenHL は Hyperliquid の fork だ。」 **違う。** Fork なら Hyperliquid のソースを import して上から patch することになる。`openhl` は *clean-room* 実装だ: 同じアーキテクチャと同じ外部挙動を、public ライブラリ (Reth、Malachite) と Hyperliquid の public ドキュメントを読んだ人間によって組み上げたもの。この区別はライセンス的にも (HL の IP に触れない)、教育的にも (clean-room とは、説明可能な first principles から構築されたコードだということ) 重要だ。

## 2. なぜ存在するか

理由は 2 つ、どちらも load-bearing だ:

1. **エコシステム向けのオープンな substrate。** HL 形の app (vault product、market-maker bot、structured-product DEX) はすべて、HL のクローズドスタックを信用するか、自分で substrate を再構築するかを強いられている。`openhl` がその substrate だ — public で fork 可能。

2. **教えられる codebase。** BFT-L1 の教材のほとんどはアルゴリズムで止まる (ホワイトボード上の Tendermint、prevote/precommit の矢印)。`openhl` はその先に行く: `cargo build` でコンパイルされる real Rust workspace で、load-bearing なすべての piece が `file:line` で cite でき、`cargo test` で実行できる。rethlab L1 Architect tier が、この codebase をコースに変える worked-example surface だ。

Dual-use が compound する。コード投資が 2 つの output を生む: 動く L1 substrate **と** 13 レッスンの教材アーティファクト。OSS のサイドプロジェクトはたいてい片方しか選ばない。

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

2 つの半分、3 つの pure state machine、半分同士の間に 1 つの contract。**これがアーキテクチャの全部だ。** Codebase の他のすべては、この 5 つの箱のどれかの実装詳細だ。

CL/EL split は Ethereum の形 (Lighthouse / Reth split、Engine API contract) を意図的に借りたものだ。3 つの pure state machine は HL 固有: Ethereum のような汎用 L1 には存在しないが、HL 形の L1 が perp DEX であるためにはこの 3 つすべてが必要になる。

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

Pure state machine の crate (`types`、`codec`、`clob`、`oracle`、`funding`、`liquidation`、`vault`) は I/O を持たない。`proptest` でテスト、ケースあたりマイクロ秒、構築によって deterministic。I/O crate (`evm`、`consensus`、`node`) は外界と話す。

| Crate グループ | I/O? | テスト方法 |
| :--- | :--- | :--- |
| Pure state machine (7 crate) | なし | unit + proptest、ケースあたりマイクロ秒 |
| I/O 境界 (3 crate) | あり | 統合テスト、devnet replay |

> 🛑 **反流暢性。** 「Pure / I-O split はコードスタイルの好みだ。」 **違う。** マルチバリデータの state が divergence するのを防ぐ determinism レールだ。Pure crate は `SystemTime::now`、`HashMap` の iteration order、`rand`、その他のホスト依存挙動を絶対に call しない — 1 LSB でも 2 validator が disagree すればチェーンが fork するからだ。Split は code review + `unsafe_code = "forbid"` で強制される; スタイルの選択として扱うと、最初の hardfork-sensitive 操作で fork するチェーンを ship することになる。

## 5. Build arc

`openhl` は 5 つの module で ship する、それぞれ動くコードと **対応する rethlab コース** の両方を ship する。README より:

| # | Module | 触れる crate | Land するもの |
| - | --- | --- | --- |
| **1** | **Consensus substrate** (Malachite + Reth) | `consensus`、`evm`、`node`、`types`、`codec` | **Single-validator devnet が end-to-end でブロックを produce する。** *← 本コースはこの module をカバーする。* |
| 2 | CLOB matching engine | `clob`、`types`、`codec` | Real transaction がチェーンに入る。EVM block に実際の fill が含まれる。 |
| 3 | Core ↔ EVM precompile | `evm`、`clob` | スマートコントラクトが live な orderbook state を読める。 |
| 4 | Funding、oracle、liquidation | `funding`、`oracle`、`liquidation` | Perp の決済ループ。チェーンが perp DEX に見える。 |
| 5 | Protocol-native vault primitive | `vault` | Kodiak/Yogi 系の strategy がチェーンプリミティブになる。 |

**本コースは Module 1 のみをカバーする。** Module 2-5 はそれぞれ L1 Architect tier 内の独立したコースになる。本コースを終えれば substrate が手に入る; Module 1+2+3 を終えれば動く perp DEX が、5 つすべてを終えれば openhl 全体が build できる。

> 🛑 **予測。** なぜ Module 1 が Module 2 (CLOB) より先に ship するのか? 「openhl を面白くしている」のは orderbook なのに。**ヒント: その下に consensus substrate がないと `validate_payload` は何も validate するものがない。**

答え: CLOB は pure state machine だ; output として fill を produce する。しかし fill が意味を持つのは、それを順序付ける consensus と、それを transaction として適用する EVM があってこそだ。Module 1 が CLOB の plug-in 先になる substrate を build する; それがなければ CLOB は `cargo test` のアーティファクトでしかなく、チェーンではない。Build 順序が dependency 順序に従う — Module 1 が先なのは、Module 2-5 がすべてその `ConsensusBridge` に依存するからだ。

## 6. 本コースの行き先 — 13 レッスンを 5 つに分けて

本コースの 13 レッスンは Module 1 (「Consensus substrate」) を 5 つの内部チャンクに分けてカバーする。各チャンクは *本コースの* サブモジュールであり、上の openhl Build arc の Module 1-5 と混同しないこと。

| 本コースのサブモジュール | レッスン | 終えると分かること |
| :--- | :--- | :--- |
| **1. execution/consensus split** | L1、L2 | なぜすべての BFT-L1 が CL と EL の間に 4 メッセージ contract を持つのか。なぜ HL/Tempo/CometBFT が全部同じ形に converge するのか。 |
| **2. ライブラリとしての Malachite** | L3、L4、L5 | Malachite が与えるもの (`Context` trait)、自分が実装するもの (10 sub-type + `SigningProvider`)、protocol state machine を running engine に変える actor model。 |
| **3. ライブラリとしての Reth** | L6、L7、L8 | なぜ Reth を fork しないか — configure する (`NodeBuilder` slot)。Consensus と execution がやり取りする Engine API surface。Reth の `PayloadBuilderService` がブロックを assemble する仕組み。 |
| **4. 配線** | L9、L10、L11 | `ConsensusBridge` trait の設計。Malachite `Decided` から Reth `forkchoice_updated` へ。`engine_app.rs` の proposer hot path。 |
| **5. Single-validator devnet** | L12、L13 | Bootstrap (genesis、key、single-node config)。Actor system 経由で完全なブロックを 0.02 秒で駆動する統合テスト — v0 milestone。 |

L13 を終える頃には、`first_block_via_engine_actors` 統合テスト (`crates/consensus/src/engine_app.rs:246@0844d58`) が real Reth + real Malachite を end-to-end で駆動し、1 つの decided block を produce する。**これが openhl Module 1 の v0 milestone**、そして本コースが連れていく最終地点だ。

## 7. 残りのコースの読み方

最初に flag しておくべきパターン 3 つ:

1. **3am hook。** すべてのレッスンが debug シナリオで始まる (page された、何かが壊れた、N 秒で原因を見つけろ)。シナリオは読者がすでに `openhl` をメンタル上で running させていることを前提とする; 本レッスンがそれらの hook を land させるための準備だ。Hook が disorienting に感じたら §3 (アーキテクチャ図) に戻れ。

2. **`🛑` callout。** 2 種類: **予測** (答えを読む前に sketch する pause) と **反流暢性** (よくある間違った直感を名指しで callout する)。両方とも、止まって engage する価値がある。

3. **`file:line@SHA` cite。** すべてのコード参照は特定の openhl commit に pin されている、`git checkout 0844d58` (またはレッスンが cite する SHA) でレッスンが描写するのと exact 同じコードを読める。CI が push ごとにこの cite を確認する。

これで残りのコースに入る準備ができた。

## 8. 練習

1. **ソースを読め。** `https://github.com/psyto/openhl` を開き、`README.md` を end-to-end で読め、続いて `docs/architecture.md`。両方とも 1 画面に収まる。
2. **アーキテクチャを sketch せよ。** 読み返さずに、§3 の 5 サブシステム図を紙に描け。各箱を実装する crate にラベルを付けよ。§4 のツリーと比較せよ。
3. **Build-arc の edge を 1 つ trace せよ。** Module 2 (CLOB) を選べ。Module 1 から何を依存し、Module 3 に何を deliver するか? (ヒント: §5 のテーブルが部分的な答え、残りはアーキテクチャに暗黙にある。)

> **最終チェック。** 1 文で、なぜ「Hyperliquid 形」が openhl にとって正しい framing で、「Hyperliquid クローン」や「Hyperliquid fork」が正しくないのか? 答えに「同じアーキテクチャ、clean-room 実装、プロプライエタリコードに触れていない」が含まれていなければ、§1 を再読。
````

---

## Seed-file slot

L0 は新規の Module 0 (「Orientation」、sortOrder 0) に landing する。他の全 module の sortOrder は +1 される:

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

L0 は EN ミラー同様 `openhl@0844d58` を pin する。Cite される surface:
- `README.md` (§1 の「Open-source reference implementation...」文)
- `docs/architecture.md` (§3 の 5 サブシステム分解、§4 の pure/I-O テーブル)
- `crates/consensus/src/engine_app.rs:246@0844d58` (§6 の v0 milestone テスト)

`README.md` / `docs/architecture.md` の形が変われば L0 の §1-§5 も追随が必要。`engine_app.rs:246` cite は CI cite-check が line-number drift をキャッチする; prose の引用はゆるい。

## Style review notes (self-critique before paste)

- **L0 は他レッスンと違って `3am` シナリオで始まらない** — マーケットファクト hook (「Hyperliquid が 2025 年に $300B を処理した」) で始まる。意図的だ: `3am` hook は読者が何が走っているかを知って初めて land する。L0 はそれを可能にするためのレッスンであり、ここで `3am` を使うと循環する。
- **§3 の ASCII 図** は load-bearing なリファレンスアーティファクトだ。後続のすべてのレッスンがこの図上に位置づけられる。Reviewer が引き締めを望むなら、**図はカットせず**、周りの prose を削れ。
- **§5 の「本コースは Module 1 のみをカバーする」行** は L13 の「Module 2 は次のコース」framing を成立させる orientation だ。これがないと L13 で読者は文脈で「Module 2」が何を意味するか分からない。
- **§6 のテーブルは §5 の openhl Build arc テーブルとネーミング上 conflict する。** 両方とも「Module 1-5」を使うが意味が違う (openhl 全体 vs 本コース内)。§6 で明示的に区別している; reviewer が混乱と感じれば、本コースのサブモジュールを「Part 1-5」または「Section 1-5」にリネームする — course-wide rename で 13 既存レッスンすべてに触れる。Reviewer の flag があるまで保留。
- **翻訳 policy は他の JA レッスンと同一**:
  - 「Hyperliquid-shape」「load-bearing」「Build arc」「subsystem」「primitive」「substrate」「fork」「clean-room」「dual-use」「compound」「first-class」等は英語のまま。
  - 「OSS」「IP」「LSB」「hardfork-sensitive」等の業界用語も英語のまま。
  - 🛑 callout: Predict → 予測、Anti-fluency → 反流暢性。
  - File paths、crate names、function names、code は英語のまま。
- **「リファレンス実装」と「reference implementation」の併用**: §1 のテーブル行は英語フレーズの後にカッコで日本語訳を添えた、Reth README の用語と JA エンジニアの直感の両方をつなげるため。
- **未公開**: `course.isPublished: false` のまま。全 14 レッスンの最終レビューが終わってから一斉公開予定。
