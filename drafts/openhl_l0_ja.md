# Building OpenHL — L0 draft (JA) — C2 build-along rewrite

> openhl SHA `0844d58` (Stage 7c) に対してドラフト。本コースは **build-along 版**で、読者がレッスンごとにコードを書き、最終的に動く single-validator devnet を手元に得る。以前の reading-focused 版は git tag `pre-c2-rewrite-2026-05-18` で保存されている。
> EN ミラー: `drafts/openhl_l0_en.md`。
> Course: `building-openhl-consensus-ja` (track: `reth-l1-architect`, course #6 of 10)。

---

## L0 — `openhl-orientation-ja`

- **Module:** 0 (Orientation)、module 内 sortOrder 0
- **Course-level sortOrder:** -1 (15 レッスン中の 0 番目)
- **Duration:** 20 分
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# OpenHL を自作する — `cargo init` から動く single-validator devnet まで

これは「読む」コースではない。自分で組み上げる「**作る**」コースだ。

最初に、やることを短く整理する。

- 空ディレクトリから `cargo init` で開始する。
- 実際の Reth と Malachite を接続し、1 ブロックを end-to-end で動かす workspace まで到達する。
- コードは自分で 1 行ずつ実装する。
- 最終構造は `psyto/openhl` の対応 Stage とほぼ一致する。

`psyto/openhl` は、実装途中の答え合わせに使うリファレンスである。

背景は 2 点だけ押さえればよい。

- Hyperliquid は 2025 年に $300B 超の perp 取引量を、クローズドソースのスタック（HyperBFT / HyperCore / HyperEVM）で処理した。
- OpenHL はその設計をオープンソースで再構成する試みであり、本コースでは Module 1 の substrate を自分で構築する。

**なぜ CLOB なのか。** Hyperliquid の対象市場では、price-time-priority の板で価格発見が成立するだけの継続フローがある。RFQ は long tail を取りやすく、AMM は cold-start に強いが、それぞれ別のトレードオフを持つ。本コースで作るのは、CLOB が機能する市場セグメント向けの engine である。詳細な比較は Course 7（CLOB）で扱う。

## 1. コース終了時点で手元にあるもの

レッスン 14 を終える頃には、自分のマシンで `cargo test first_block_via_engine_actors` を走らせると、single-validator BFT consensus のラウンドが約 0.02 秒で pass する状態になる。EVM 層は実際の Reth、BFT 層は実際の Malachite。chain は **Consensus Layer (CL)** と **Execution Layer (EL)** の 2 層に分かれていて、本コースで両側を接続していく。コードのパスは次のようになる:

```
自分のコード →
  Malachite Driver →
    proposer election →
      build_payload (自分が書いた bridge) →
        Reth dev-node provider →
          header 構築 →
            EthBeaconConsensus validator →
              validate_payload →
                forkchoice_updated →
                  decided block
```

このパスの各行はすべて自分で書いたコードだ。マジックは一切なく、全部公開されている。コースを終える頃には次のことができるようになる:

- `psyto/openhl` Module 1 の任意のコードを読み、なぜそこにそのコードがあるのかを説明する
- Bridge contract の任意の部分を変更してテストを走らせ、何が壊れるかを観察する
- substrate を fork して自分の Hyperliquid 型 chain を始める — `psyto/openhl` は依存先ではなく、自分の側のリファレンス実装になる

## 2. コース終了時点で手元に **ない** もの

本コースが扱うのは **openhl Build arc Module 1 のみ** — consensus substrate だ。以下は扱わない:

- Module 2: CLOB matching engine
- Module 3: CLOB state を読むカスタム EVM precompile
- Module 4: funding、oracle、liquidation
- Module 5: protocol-native vault primitive

これらは L1 Architect tier の後続コースとして、それぞれ独立に提供する予定だ。本コースを終えた時点で手に入るのは **substrate** — BFT-EVM contract、actor wiring、live-Reth integration。**動く perp DEX は手に入らない。** Perp DEX は Module 2 〜 5 を積み上げて初めて成立する。

これは honest scoping だ。「Hyperliquid を自作する」を 15 レッスンですべて約束するコースは嘘をついている。

## 3. 本コースの進め方

すべてのレッスンが同じ形をしている:

1. **ゴール。** 「本レッスン終了時、`cargo test <name>` が pass する」。そのテストは今は pass しない。pass させるのが本レッスンの仕事。
2. **おさらい。** workspace の現状。前のレッスンで build した部分。今の時点で通っているテスト一覧。
3. **計画。** 何を足すか。openhl メンテナがオリジナルで実装したときに下した設計判断。
4. **手を動かす walk-through。** ステップごとのコード。書いて、保存して、各ステップ後に `cargo check` を走らせる。
5. **テスト。** `cargo test <name>` を走らせる。pass するはず。pass しない場合の典型的なミス。
6. **設計を振り返る。** このレッスンで encode した load-bearing な判断のうち、後で参照する重要なもの 1-2 個。
7. **答え合わせ。** `psyto/openhl` の対応 SHA — そこに同じコードが live で置かれている。自分のコードと diff で照合できる。
8. **次のレッスン。** 次に何を足すか、なぜ今それなのか、を 1-2 文で。

レッスンが **指示書**、書くコードが **成果物**、`psyto/openhl` の対応 SHA が **答え合わせ** という構造だ。

## 4. 前提知識

必要なもの:

- **Rust 1.95+。** `rustup default 1.95.0` 以降。
- **Git。** `psyto/openhl` を 1 回 clone する (答え合わせ用)。
- **Cargo workspace、async/await、trait impl の基本的な扱い。** `#[async_trait]` や `impl Trait for Foo { ... }` がまだ馴染みのない語彙なら、本コースは速すぎる。先に rethlab Fundamentals または Advanced を受講してほしい。
- **Rust 対応のエディタ。** VS Code + rust-analyzer で十分。Vim/Helix/Emacs でも問題ない。
- **約 4 GB の空きディスク容量。** Reth のコンパイルグラフは大きい。

必要 **ない** もの:

- consensus protocol の事前知識 (BFT は進めながら説明する)
- Reth の事前知識 (レッスン 1 で導入する)
- Malachite の事前知識 (こちらもレッスン 1)
- マルチマシン環境 (すべて 1 プロセスで自分のラップトップで完結する)

## 5. セットアップ (いま実行する)

マシン上に **2 つ** のディレクトリを置く:

- `~/code/my-openhl/` — 自分の workspace。ここにコードを書く。**自分のもの**。
- `~/code/openhl-reference/` — `psyto/openhl` の clone。比較したいときに読む場所。**read-only** として扱う。

```bash
# 自分の workspace
mkdir -p ~/code/my-openhl && cd ~/code/my-openhl
cargo init --lib
# (パッケージ名はディレクトリ名から `my-openhl` になる。L1 で workspace に作り変えて
#  内部の crate を `openhl-types` / `openhl-consensus` / … として並べていくので、
#  root パッケージ名はその時点で消える。lib.rs も L1 で外す — ここで作るのは workspace
#  stub を取りに行くためだけの初期 commit)

# 自分の workspace でもリファレンスと同じ Rust toolchain を強制しておく
echo -e '[toolchain]\nchannel = "1.95.0"' > rust-toolchain.toml

# 答え合わせ用リファレンス
mkdir -p ~/code && cd ~/code
git clone https://github.com/psyto/openhl.git openhl-reference
cd openhl-reference
cargo check  # 初回は時間がかかる — Reth は大きい
```

`openhl-reference` 側で `cargo check` が pass すれば toolchain は正しい。次に進んでよい。pass しない場合はまず toolchain version を直す — リファレンスの `rust-toolchain.toml` が Rust 1.95.0 を pin しており、`my-openhl/` 側でも同じ pin を置いたので、`rustup` が必要な toolchain を自動 install してくれるはずだ。

> 🛑 **やりがちな勘違い。** 「`openhl-reference` を直接編集すればよい。」  
> **違う。** `openhl-reference` は答え合わせ専用で、編集対象ではない。  
> 編集は必ず `my-openhl/` 側で行う。境界を曖昧にすると、どこまでが自分の実装か追えなくなる。

## 6. 15 レッスンの地図

各行が 1 レッスン。各レッスンは pass する `cargo test` で終わる。

| # | Module | 何を build する | レッスン終了時のテスト |
| - | - | - | - |
| **L0** | Orientation | (本レッスン) | setup 確認 |
| **L1** | Foundations | workspace + Reth と Malachite を pinned で揃える | `cargo check --workspace` clean |
| **L2** | Contract types | `openhl-types` の primitives (BlockHash、PayloadId、…) | `cargo test -p openhl-types` |
| **L3** | Contract trait | `ConsensusBridge` trait — 4 メッセージを async fn として | `cargo check -p openhl-consensus` |
| **L4** | EL test double | `InMemoryEvmBridge` — テスト用の偽 EVM | InMemoryEvmBridge tests pass |
| **L5** | Reth-typed bridge | `RethEvmBridge` — 同じ contract、Reth 型を使う | RethEvmBridge tests pass |
| **L6** | CL types | `OpenHlContext` + Context の 10 sub-types | context compiles |
| **L7** | Signing | `OpenHlSigningProvider` — Ed25519 sign/verify | sign/verify round-trip |
| **L8** | Codec + Node | `OpenHlCodec` + `Node` trait impl | engine start/stop smoke |
| **L9** | App loop | `run_engine_app` — 全部を繋ぐ actor pipeline | **`first_block_via_engine_actors`** — Module 1 milestone、BFT round が閉じる |
| **L10** | Live Reth | テストで実 Reth dev-node を起動する | `reth_dev_node_bootstraps` |
| **L11** | Live bridge — build path | `LiveRethEvmBridge` (build_payload 側) が live provider から parent を読む | `live_bridge_builds_on_real_genesis` |
| **L12** | Live bridge — validate path | `LiveRethEvmBridge` (validate_payload 側) に `EthBeaconConsensus` を接続して実 header validation | validate-path tests |
| **L13** | Live bridge — commit path | `LiveRethEvmBridge` (commit 側) を Reth の in-process Engine API に `forkchoice_updated` で接続 | `commit_sends_forkchoice_to_engine` |
| **L14** | Capstone | openhl にまだ無い end-to-end テストを自分で書く — `run_engine_app` + `LiveRethEvmBridge` を組み合わせる | 自分の integration test |

**L9 がコース最大の milestone だ。** L9 を終えた時点で、actor system 経由で BFT consensus が end-to-end でブロックを 1 つ生成するようになる。L10-L13 で stub Reth を実際の Reth に差し替える。L14 では openhl 本体 (SHA `0844d58` 時点) にまだ無い integration test を自分で書く — コース終了時点でリファレンスより **1 歩先** に進んだ状態になる。

## 7. 答え合わせの作法

各レッスンは `psyto/openhl` の特定の commit SHA を基準にしている — 同じコードがその commit で最初に登場した時点だ。レッスンを終えてテストが pass したら、その revision と自分のコードを `git diff` で見比べて答え合わせをする:

```bash
cd ~/code/openhl-reference
git checkout <レッスンが引用する SHA>
# 比較する。~/code/my-openhl/ のコードとほぼ同等なはず。
diff -ru ~/code/my-openhl/crates/types ./crates/types
```

自分のコードは細かい点 (空白、変数名、コメントの言い回し) で違って当然だ。重要なのは型、シグネチャ、制御フローが等価であること。そこが大きく食い違うなら、レッスンが land していない — 設計を振り返るセクションを読み直して調整する。

> 🛑 **やりがちな勘違い。** 「答えを直接写せば早い。」  
> **違う。** コピーは速いが、設計判断が身につかない。  
> レッスンどおりに自分で実装し、最後に diff で一致を確認する。一致は目的ではなく、理解の結果である。

## 8. セットアップ確認 — 本レッスンの実際の演習

L1 に進む前に、以下を全部走らせて pass することを確認する:

```bash
# 1. Rust version
rustc --version    # 期待値: rustc 1.95.x または以降

# 2. 自分の workspace が存在する
ls ~/code/my-openhl    # 期待値: Cargo.toml、src/

# 3. リファレンスが存在してコンパイルが通る
cd ~/code/openhl-reference && cargo check    # 期待値: 最終的に "Finished"
```

3 つすべて pass すればセットアップ完了。L1 に進む。

> 💡 **次へ進む前のセルフチェック**
>
> 1 文で、`~/code/my-openhl` と `~/code/openhl-reference` の役割の違いを説明できるか？
>
> 自分の言葉で「**片方は自分が 1 行ずつ書く本番の workspace、もう片方は迷ったときだけ覗く答え合わせの鏡だ**」と言えなければ、§5 を読み直してから L1 へ進むこと。この区別を曖昧にしたまま走り出すと、レッスン後半で `openhl-reference` 側にうっかりコードを書いてしまい、自分が書いたコードと借りてきたコードの境界が消える事故が起きる。**境界を体に染み込ませてから L1 へ。**
````

---

## Seed-file slot

L0 は Module 0 (Orientation) の sortOrder 0 に landing する:

```typescript
{
  title: 'OpenHL を自作する — cargo init から動く single-validator devnet まで',
  slug: 'openhl-orientation-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 20,
  xpReward: 60,
  content: `# OpenHL を自作する — \`cargo init\` から動く single-validator devnet まで\n\n...`
},
```

## SHA pinning discipline

L0 自体には `file:line@SHA` cite はない — pure orientation なので。L1-L14 の各レッスンは stage commit を pin する (詳細は EN ミラーを参照)。

## Style review notes (self-critique before paste)

- **L0 は 20 分 (旧版より長い)** だが、build-along では setup + 15 レッスンの地図 + 答え合わせ作法 + 練習として実際のコマンド実行があるため、reading 版より練習要素が増える。XP 60 はその反映。
- **3am hook ではなく、行動志向の hook で開く** — 「14 レッスンで build する」と冒頭で約束する形に変更。3am hook は L1-L14 で読者が自分のコードをデバッグするときに復活する。
- **§5 (セットアップ) が最初の action**。L1 に進む前に setup を済ませてもらわないと、L1 で詰まる。L0 の最終演習は「3 つのコマンドを走らせて pass を確認」。
- **§7 のやりがちな勘違い callout** (「答え合わせから copy するな」) が最も重要な行動規範。これがないと読者は copy して何も学ばない。**強調を維持**。
- **§6 の 15 レッスンの地図** は読者が最も頻繁に参照するアーティファクト。レッスンタイトルや test 名を後で変更したら、ここも sync させる必要がある。
- **以前の reading-focused 内容は git history に保存済み** — タグ `pre-c2-rewrite-2026-05-18` で復元可能。需要があれば後で「Companion guide」として復活させられる。
- **翻訳 policy は他の JA レッスンと同一**:
  - Rust/Cargo 用語、Reth/Malachite 識別子は英語のまま
  - 🛑 callout: やりがちな勘違い (anti-fluency) で統一
  - File paths、function names、types は英語のまま
- **「自作する」を採用** (「構築する」ではなく) — build-along のニュアンスを直接伝えるため。レッスンタイトルでも統一。
- **「reading-focused」「build-along」「pure state machine」等は英語のまま** — 直訳が tech reader にとって不自然になるため。
