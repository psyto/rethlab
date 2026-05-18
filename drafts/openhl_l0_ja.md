# Building OpenHL — L0 draft (JA) — C2 build-along rewrite

> openhl SHA `0844d58` (Stage 7c) に対してドラフト。本コースは **build-along 版**で、読者がレッスンごとにコードを書き、最終的に動く single-validator devnet を手元に得る。以前の reading-focused 版は git tag `pre-c2-rewrite-2026-05-18` で保存されている。
> EN ミラー: `drafts/openhl_l0_en.md`。
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10)。

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

これは「読む」コースではない。これは「**作る**」コースだ。

これからの 14 レッスンで、空のディレクトリで `cargo init` するところから始め、最終的には実 Reth と実 Malachite を通じて 1 ブロックを end-to-end で駆動する Rust workspace を手にする。コードベースはあなた自身が 1 行ずつ書いたもので、出来上がる形は `psyto/openhl` の対応 Stage とほぼ同じになる。そのリポジトリが **答え合わせ用のリファレンス** だ。

Hyperliquid は 2025 年に $300B+ の perp 取引量を完全クローズドソースのスタック — HyperBFT consensus、HyperCore matching engine、HyperEVM execution — の上で処理した。公開された Rust 実装はどこにもない。**OpenHL は、そのスタックをオープンソースで実装した姿** であり、本コースは openhl Module 1 の substrate を自分で組み上げるためのコースだ。

## 1. コース終了時点で手元にあるもの

レッスン 14 を終える頃には、自分のマシンで `cargo test first_block_via_engine_actors` を走らせると、約 0.02 秒で single-validator BFT consensus のラウンドが pass する状態になる。EVM 層は実 Reth、BFT 層は実 Malachite。コードのパスはこうだ:

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

このパスのすべての行は、あなた自身が書いたコードだ。マジックは一切なく、全部公開されている。コースを終える頃には:

- `psyto/openhl` Module 1 の任意のコードを読んで、なぜそこにそのコードがあるのかを説明できる
- Bridge contract の任意の部分を変更してテストを走らせ、何が壊れるかを観察できる
- substrate を fork して自分の Hyperliquid 形 chain を始められる — `psyto/openhl` は依存先ではなく、自分のリファレンス実装になる

## 2. コース終了時点で手元に **ない** もの

本コースが扱うのは **openhl Build arc Module 1 のみ** — consensus substrate だ。次のものは扱わない:

- Module 2: CLOB matching engine
- Module 3: CLOB state を読むカスタム EVM precompile
- Module 4: funding、oracle、liquidation
- Module 5: protocol-native vault primitive

これらは L1 Architect tier の後続コースとしてそれぞれ独立に提供される (予定)。本コースを終えた時点で手にするのは **substrate** — BFT-EVM contract、actor wiring、live-Reth integration。**動く perp DEX は手に入らない。** Perp DEX は Module 2 〜 5 を上に積んで初めて成立する。

これは honest scoping だ。「Hyperliquid を自作する」を 15 レッスンですべて約束するコースは嘘をついている。

## 3. 本コースの進め方

すべてのレッスンが同じ形をしている:

1. **ゴール。** 「本レッスン終了時、`cargo test <name>` が pass する」。そのテストは今は pass しない。それを pass させるのが本レッスンの仕事。
2. **これまでの状態。** workspace の現状。前のレッスンで build した部分。今時点で通っているテスト一覧。
3. **これから build するもの。** 何を足すか。openhl メンテナがオリジナルで実装したときに下した設計判断。
4. **手を動かす walk-through。** ステップごとのコード。書く、保存する、各ステップ後に `cargo check` を走らせる。
5. **テスト。** `cargo test <name>` を走らせる。pass するはず。pass しない場合の典型的なミス。
6. **設計を振り返る。** このレッスンで encode した load-bearing な判断のうち、後で参照する重要なもの 1-2 個。
7. **答え合わせ。** `psyto/openhl` の対応 SHA — そこに同じコードが live で置かれている。自分のコードを diff で照合できる。
8. **次のレッスン。** 次は何を足すか、なぜ今それなのか、を 1-2 文で。

レッスンが **指示書** で、書くコードが **成果物**、`psyto/openhl` の対応 SHA が **答え合わせ** という構造だ。

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

- `~/code/my-openhl/` — 自分の workspace。ここにコードを書く。これは **自分のもの**。
- `~/code/openhl-reference/` — `psyto/openhl` の clone。比較したいときに読む場所。これは **read-only**。

```bash
# 自分の workspace
mkdir -p ~/code/my-openhl && cd ~/code/my-openhl
cargo init --name openhl --lib
# (lib.rs はレッスン 1 で削除する。これは workspace stub を作るためだけのコマンド)

# 答え合わせ用リファレンス
mkdir -p ~/code && cd ~/code
git clone https://github.com/psyto/openhl.git openhl-reference
cd openhl-reference
cargo check  # 初回は時間がかかる — Reth は大きい
```

`openhl-reference` 側で `cargo check` が pass すれば toolchain は正しい。次に進める。pass しない場合は toolchain version をまず直す — そのリポの `rust-toolchain.toml` が Rust 1.95.0 を pin している。

> 🛑 **反流暢性。** 「`openhl-reference` を直接編集すればいい。」 **違う。** あのリポは答え合わせであって自分の workspace ではない。read-only として扱うこと。`my-openhl/` への編集は自分のコード; `openhl-reference/` への編集は混乱の元 — どれが自分が書いたコードでどれが元からあったコードか分からなくなる。

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
| **L11** | Live build_payload | `LiveRethEvmBridge` が live provider から parent を読む | `live_bridge_builds_on_real_genesis` |
| **L12** | Live validate_payload | `EthBeaconConsensus` を配線して実 header validation | validate-path tests |
| **L13** | Live commit | `forkchoice_updated` を Reth の in-process Engine API で配線 | `commit_sends_forkchoice_to_engine` |
| **L14** | Capstone | openhl にまだ無い end-to-end テストを自分で書く — `run_engine_app` + `LiveRethEvmBridge` を組み合わせる | 自分の integration test |

**L9 がコース最大の milestone だ。** L9 を終えた時点で、actor system 経由で BFT consensus が end-to-end でブロックを 1 つ produce する状態になる。L10-L13 で stub Reth を実 Reth に差し替える。L14 では openhl 本体 (SHA `0844d58` 時点) にまだ無い integration test を自分で書く — そのコース終了時点でリファレンスより **1 歩先** に進む状態になる。

## 7. 答え合わせの作法

各レッスンは `psyto/openhl` の SHA を引用する — その commit で同じコードが最初に登場した時点だ。レッスンを終えてテストが pass したら:

```bash
cd ~/code/openhl-reference
git checkout <レッスンが引用する SHA>
# 比較する。~/code/my-openhl/ のコードとほぼ同等なはず。
diff -ru ~/code/my-openhl/crates/types ./crates/types
```

自分のコードは細かい点 (空白、変数名、コメントの言い回し) で違って当然だ。重要なのは型、シグネチャ、制御フローが等価であること。そこが大きく食い違うようなら、レッスンが land していない — 設計を振り返るセクションを再読して調整する。

> 🛑 **反流暢性。** 「答え合わせから直接 type した方が早い。」 **違う、それが一番悪い道だ。** `openhl-reference` から copy すれば 30 分で終わるが、学べることは何もない。レッスンの説明に従って自分で type し、レッスンが描写している摩擦に当たり、結果として答え合わせのコードと一致する状態に着地する — それが本来の道だ。一致するのは **証拠** であり、目的ではない。

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

> **最終チェック。** 1 文で、`~/code/my-openhl` と `~/code/openhl-reference` の役割の違いは何か? 答えに「片方は自分のもので、片方は答え合わせ、最初に書いて 2 番目を読んで照合する」が含まれていなければ §5 を再読。
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
- **§7 の反流暢性 callout** (「答え合わせから copy するな」) が最も重要な行動規範。これがないと読者は copy して何も学ばない。**強調を維持**。
- **§6 の 15 レッスンの地図** は読者が最も頻繁に参照するアーティファクト。レッスンタイトルや test 名を後で変更したら、ここも sync させる必要がある。
- **以前の reading-focused 内容は git history に保存済み** — タグ `pre-c2-rewrite-2026-05-18` で復元可能。需要があれば後で「Companion guide」として復活させられる。
- **翻訳 policy は他の JA レッスンと同一**:
  - Rust/Cargo 用語、Reth/Malachite 識別子は英語のまま
  - 🛑 callout: 反流暢性 (anti-fluency) で統一
  - File paths、function names、types は英語のまま
- **「自作する」を採用** (「構築する」ではなく) — build-along のニュアンスを直接伝えるため。レッスンタイトルでも統一。
- **「reading-focused」「build-along」「pure state machine」等は英語のまま** — 直訳が tech reader にとって不自然になるため。
