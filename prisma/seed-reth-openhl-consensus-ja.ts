// AUTO-GENERATED from drafts/openhl_*_ja.md by .github/scripts/build-openhl-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlConsensusJA(prisma: PrismaClient) {
  const tags = ["reth","malachite","bft","evm","clob","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "reth-openhl-consensus-ja",
      title: "OpenHL を自作する — `cargo init` から動く single-validator devnet まで",
      description:
        "OpenHL は Hyperliquid (HyperBFT consensus、HyperCore matching engine、HyperEVM execution、すべてクローズドソース) のオープンソース・リファレンス実装である。本コースは openhl Module 1 (consensus substrate) を自分で build するための build-along コース: 空ディレクトリで `cargo init` するところから始め、レッスンごとにコードを書き、最終的には実 Reth と実 Malachite の上で BFT consensus を end-to-end で 1 ラウンド走らせる Rust workspace を手にする。最終レッスンを終える頃には、自分で書いたコードに対して `cargo test first_block_via_engine_actors` が約 0.02 秒で pass する。答え合わせ用のリファレンスは `psyto/openhl`。本コースが扱うのは openhl Build arc Module 1 (substrate) のみで、Module 2-5 (CLOB、precompile、settlement、vault) は後続の rethlab コースに分けて扱う。",
      difficulty: "EXPERT",
      duration: 125,
      xpReward: 260,
      track: "reth-l1-architect",
      tags,
      isPublished: false,
      sortOrder: 600,
      locale: "ja",
      instructorName: "RethLab",
      modules: {
        create: [
          {
            title: "Orientation",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "OpenHL を自作する — cargo init から動く single-validator devnet まで",
                  slug: "openhl-orientation-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 60,
                  content: `# OpenHL を自作する — \`cargo init\` から動く single-validator devnet まで

これは「読む」コースではない。これは「**作る**」コースだ。

これからの 14 レッスンで、空のディレクトリで \`cargo init\` するところから始め、最終的には実 Reth と実 Malachite を通じて 1 ブロックを end-to-end で駆動する Rust workspace を手にする。コードベースはあなた自身が 1 行ずつ書いたもので、出来上がる形は \`psyto/openhl\` の対応 Stage とほぼ同じになる。そのリポジトリが **答え合わせ用のリファレンス** だ。

Hyperliquid は 2025 年に $300B+ の perp 取引量を完全クローズドソースのスタック — HyperBFT consensus、HyperCore matching engine、HyperEVM execution — の上で処理した。公開された Rust 実装はどこにもない。**OpenHL は、そのスタックをオープンソースで実装した姿** であり、本コースは openhl Module 1 の substrate を自分で組み上げるためのコースだ。

## 1. コース終了時点で手元にあるもの

レッスン 14 を終える頃には、自分のマシンで \`cargo test first_block_via_engine_actors\` を走らせると、約 0.02 秒で single-validator BFT consensus のラウンドが pass する状態になる。EVM 層は実 Reth、BFT 層は実 Malachite。コードのパスはこうだ:

\`\`\`
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
\`\`\`

このパスのすべての行は、あなた自身が書いたコードだ。マジックは一切なく、全部公開されている。コースを終える頃には:

- \`psyto/openhl\` Module 1 の任意のコードを読んで、なぜそこにそのコードがあるのかを説明できる
- Bridge contract の任意の部分を変更してテストを走らせ、何が壊れるかを観察できる
- substrate を fork して自分の Hyperliquid 形 chain を始められる — \`psyto/openhl\` は依存先ではなく、自分のリファレンス実装になる

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

1. **ゴール。** 「本レッスン終了時、\`cargo test <name>\` が pass する」。そのテストは今は pass しない。それを pass させるのが本レッスンの仕事。
2. **これまでの状態。** workspace の現状。前のレッスンで build した部分。今時点で通っているテスト一覧。
3. **これから build するもの。** 何を足すか。openhl メンテナがオリジナルで実装したときに下した設計判断。
4. **手を動かす walk-through。** ステップごとのコード。書く、保存する、各ステップ後に \`cargo check\` を走らせる。
5. **テスト。** \`cargo test <name>\` を走らせる。pass するはず。pass しない場合の典型的なミス。
6. **設計を振り返る。** このレッスンで encode した load-bearing な判断のうち、後で参照する重要なもの 1-2 個。
7. **答え合わせ。** \`psyto/openhl\` の対応 SHA — そこに同じコードが live で置かれている。自分のコードを diff で照合できる。
8. **次のレッスン。** 次は何を足すか、なぜ今それなのか、を 1-2 文で。

レッスンが **指示書** で、書くコードが **成果物**、\`psyto/openhl\` の対応 SHA が **答え合わせ** という構造だ。

## 4. 前提知識

必要なもの:

- **Rust 1.95+。** \`rustup default 1.95.0\` 以降。
- **Git。** \`psyto/openhl\` を 1 回 clone する (答え合わせ用)。
- **Cargo workspace、async/await、trait impl の基本的な扱い。** \`#[async_trait]\` や \`impl Trait for Foo { ... }\` がまだ馴染みのない語彙なら、本コースは速すぎる。先に rethlab Fundamentals または Advanced を受講してほしい。
- **Rust 対応のエディタ。** VS Code + rust-analyzer で十分。Vim/Helix/Emacs でも問題ない。
- **約 4 GB の空きディスク容量。** Reth のコンパイルグラフは大きい。

必要 **ない** もの:

- consensus protocol の事前知識 (BFT は進めながら説明する)
- Reth の事前知識 (レッスン 1 で導入する)
- Malachite の事前知識 (こちらもレッスン 1)
- マルチマシン環境 (すべて 1 プロセスで自分のラップトップで完結する)

## 5. セットアップ (いま実行する)

マシン上に **2 つ** のディレクトリを置く:

- \`~/code/my-openhl/\` — 自分の workspace。ここにコードを書く。これは **自分のもの**。
- \`~/code/openhl-reference/\` — \`psyto/openhl\` の clone。比較したいときに読む場所。これは **read-only**。

\`\`\`bash
# 自分の workspace
mkdir -p ~/code/my-openhl && cd ~/code/my-openhl
cargo init --name openhl --lib
# (lib.rs はレッスン 1 で削除する。これは workspace stub を作るためだけのコマンド)

# 答え合わせ用リファレンス
mkdir -p ~/code && cd ~/code
git clone https://github.com/psyto/openhl.git openhl-reference
cd openhl-reference
cargo check  # 初回は時間がかかる — Reth は大きい
\`\`\`

\`openhl-reference\` 側で \`cargo check\` が pass すれば toolchain は正しい。次に進める。pass しない場合は toolchain version をまず直す — そのリポの \`rust-toolchain.toml\` が Rust 1.95.0 を pin している。

> 🛑 **反流暢性。** 「\`openhl-reference\` を直接編集すればいい。」 **違う。** あのリポは答え合わせであって自分の workspace ではない。read-only として扱うこと。\`my-openhl/\` への編集は自分のコード; \`openhl-reference/\` への編集は混乱の元 — どれが自分が書いたコードでどれが元からあったコードか分からなくなる。

## 6. 15 レッスンの地図

各行が 1 レッスン。各レッスンは pass する \`cargo test\` で終わる。

| # | Module | 何を build する | レッスン終了時のテスト |
| - | - | - | - |
| **L0** | Orientation | (本レッスン) | setup 確認 |
| **L1** | Foundations | workspace + Reth と Malachite を pinned で揃える | \`cargo check --workspace\` clean |
| **L2** | Contract types | \`openhl-types\` の primitives (BlockHash、PayloadId、…) | \`cargo test -p openhl-types\` |
| **L3** | Contract trait | \`ConsensusBridge\` trait — 4 メッセージを async fn として | \`cargo check -p openhl-consensus\` |
| **L4** | EL test double | \`InMemoryEvmBridge\` — テスト用の偽 EVM | InMemoryEvmBridge tests pass |
| **L5** | Reth-typed bridge | \`RethEvmBridge\` — 同じ contract、Reth 型を使う | RethEvmBridge tests pass |
| **L6** | CL types | \`OpenHlContext\` + Context の 10 sub-types | context compiles |
| **L7** | Signing | \`OpenHlSigningProvider\` — Ed25519 sign/verify | sign/verify round-trip |
| **L8** | Codec + Node | \`OpenHlCodec\` + \`Node\` trait impl | engine start/stop smoke |
| **L9** | App loop | \`run_engine_app\` — 全部を繋ぐ actor pipeline | **\`first_block_via_engine_actors\`** — Module 1 milestone、BFT round が閉じる |
| **L10** | Live Reth | テストで実 Reth dev-node を起動する | \`reth_dev_node_bootstraps\` |
| **L11** | Live build_payload | \`LiveRethEvmBridge\` が live provider から parent を読む | \`live_bridge_builds_on_real_genesis\` |
| **L12** | Live validate_payload | \`EthBeaconConsensus\` を配線して実 header validation | validate-path tests |
| **L13** | Live commit | \`forkchoice_updated\` を Reth の in-process Engine API で配線 | \`commit_sends_forkchoice_to_engine\` |
| **L14** | Capstone | openhl にまだ無い end-to-end テストを自分で書く — \`run_engine_app\` + \`LiveRethEvmBridge\` を組み合わせる | 自分の integration test |

**L9 がコース最大の milestone だ。** L9 を終えた時点で、actor system 経由で BFT consensus が end-to-end でブロックを 1 つ produce する状態になる。L10-L13 で stub Reth を実 Reth に差し替える。L14 では openhl 本体 (SHA \`0844d58\` 時点) にまだ無い integration test を自分で書く — そのコース終了時点でリファレンスより **1 歩先** に進む状態になる。

## 7. 答え合わせの作法

各レッスンは \`psyto/openhl\` の SHA を引用する — その commit で同じコードが最初に登場した時点だ。レッスンを終えてテストが pass したら:

\`\`\`bash
cd ~/code/openhl-reference
git checkout <レッスンが引用する SHA>
# 比較する。~/code/my-openhl/ のコードとほぼ同等なはず。
diff -ru ~/code/my-openhl/crates/types ./crates/types
\`\`\`

自分のコードは細かい点 (空白、変数名、コメントの言い回し) で違って当然だ。重要なのは型、シグネチャ、制御フローが等価であること。そこが大きく食い違うようなら、レッスンが land していない — 設計を振り返るセクションを再読して調整する。

> 🛑 **反流暢性。** 「答え合わせから直接 type した方が早い。」 **違う、それが一番悪い道だ。** \`openhl-reference\` から copy すれば 30 分で終わるが、学べることは何もない。レッスンの説明に従って自分で type し、レッスンが描写している摩擦に当たり、結果として答え合わせのコードと一致する状態に着地する — それが本来の道だ。一致するのは **証拠** であり、目的ではない。

## 8. セットアップ確認 — 本レッスンの実際の演習

L1 に進む前に、以下を全部走らせて pass することを確認する:

\`\`\`bash
# 1. Rust version
rustc --version    # 期待値: rustc 1.95.x または以降

# 2. 自分の workspace が存在する
ls ~/code/my-openhl    # 期待値: Cargo.toml、src/

# 3. リファレンスが存在してコンパイルが通る
cd ~/code/openhl-reference && cargo check    # 期待値: 最終的に "Finished"
\`\`\`

3 つすべて pass すればセットアップ完了。L1 に進む。

> **最終チェック。** 1 文で、\`~/code/my-openhl\` と \`~/code/openhl-reference\` の役割の違いは何か? 答えに「片方は自分のもので、片方は答え合わせ、最初に書いて 2 番目を読んで照合する」が含まれていなければ §5 を再読。`,
                },
              ],
            },
          },
          {
            title: "Foundations",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "レッスン 1 — Workspace + Reth + Malachite (Stages 1-3)",
                  slug: "openhl-workspace-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 45,
                  xpReward: 80,
                  content: `# レッスン 1 — Workspace + Reth + Malachite (Stages 1-3)

## ゴール

このレッスンの終わりに、\`~/code/my-openhl/\` ディレクトリで次を実行する:

\`\`\`bash
cargo check --workspace
\`\`\`

…そして "unused dependency" の警告以外は warning なしで \`Finished\` を見られる状態にする。手元には、空のライブラリ crate が 10 個、binary crate が 1 個、Reth が SHA で pin された git 依存、Malachite が同じく SHA で pin された git 依存を持つ Rust workspace が出来上がっている。**アプリケーションロジックは 1 行も書いていない** — それは L2 以降だ。本レッスンは「依存グラフを正しく組む」ことに専念する。

Reth のコンパイルグラフだけで ~600 crates ある。最初の \`cargo check\` はマシンによって 5-15 分かかる。そのつもりで進める。その後の check は incremental になって速い。

## これまでの状態

L0 のセットアップを済ませている前提だ。手元には:

- \`~/code/my-openhl/\` — 自分の workspace、現状は \`cargo init --lib\` の default 出力
- \`~/code/openhl-reference/\` — \`psyto/openhl\` を clone 済み、\`cargo check\` が通っている

このレッスンの編集は **すべて** \`~/code/my-openhl/\` の中で行う。\`openhl-reference/\` には絶対に触れない。

## これから build するもの

3 つの段階を順に進める:

1. **Stage 1** — \`cargo init --lib\` の default 出力を消し、real workspace に置き換える: 10 個の空ライブラリ crate、1 個の binary crate、workspace 全体のデフォルトを定義する top-level \`Cargo.toml\`。**テスト**: 外部依存なしで \`cargo check --workspace\` が通る。
2. **Stage 2** — Reth を workspace レベルで SHA pin の git 依存として宣言する。**テスト**: \`cargo check --workspace\` が引き続き通る (どの crate も Reth をまだ使っていない — 依存が解決可能なことを確認するだけ)。
3. **Stage 3** — Malachite を同じやり方で pin する。**テスト**: \`cargo check --workspace\` が引き続き通る。

各 stage は \`psyto/openhl\` の実際の commit に対応する: \`75be9de\`、続いて \`5fc7ca1\`。

**先にアプリケーションコードではなく依存グラフを組む理由**: Rust workspace で最も摩擦が多いのは依存解決だ。Reth と Malachite はどちらも巨大で transitive な依存ツリーが深い。**「あとでやる」にすると、アプリケーションコードを書いている最中に衝突を発見して巻き戻すことになる。** 先に依存を確定させておけば、その後のレッスンはレッスンの本題に集中できる。

> 🛑 **予測。** スクロール前に sketch せよ: workspace の Cargo.toml に書く \`members\` は何個で、それぞれ何か? ヒント: 10 個のライブラリ crate + 1 個の binary crate。L0 §3 で 5 つのサブシステムを学んだ; それを実装するのは具体的に 10 個のうちのどの crate か? (必要なら L0 §4 を見返す。)

## 手を動かす walk-through

### Step 1: \`~/code/my-openhl/\` をリセット

L0 のセットアップで default の cargo プロジェクトが残っている。これを消してまっさらから始める:

\`\`\`bash
cd ~/code/my-openhl
rm Cargo.toml Cargo.lock src/lib.rs
rmdir src
\`\`\`

これで \`.git/\` (初回 cargo init の名残) 以外には何も残っていない状態になる:

\`\`\`bash
ls -la
# .  ..  .git
\`\`\`

### Step 2: Top-level workspace の Cargo.toml を書く

ルートに \`Cargo.toml\` を作り、次の内容を入れる。コピーではなく、自分でタイプする。各セクションに注目しながら。

\`\`\`toml
[workspace]
resolver = "3"
members = [
    "bin/openhl",
    "crates/types",
    "crates/codec",
    "crates/clob",
    "crates/oracle",
    "crates/funding",
    "crates/liquidation",
    "crates/vault",
    "crates/evm",
    "crates/consensus",
    "crates/node",
]

[workspace.package]
version      = "0.1.0"
edition      = "2024"
rust-version = "1.95"
license      = "MIT OR Apache-2.0"
repository   = "https://github.com/yourusername/my-openhl"
authors      = ["Your Name <you@example.com>"]

[workspace.dependencies]
# --- 内部 crate ---
openhl-types       = { path = "crates/types" }
openhl-codec       = { path = "crates/codec" }
openhl-clob        = { path = "crates/clob" }
openhl-oracle      = { path = "crates/oracle" }
openhl-funding     = { path = "crates/funding" }
openhl-liquidation = { path = "crates/liquidation" }
openhl-vault       = { path = "crates/vault" }
openhl-evm         = { path = "crates/evm" }
openhl-consensus   = { path = "crates/consensus" }
openhl-node        = { path = "crates/node" }

# --- Reth と Malachite — 下の Step 8 と Step 9 で追加 ---

# --- 共通ユーティリティ ---
tokio              = { version = "1", features = ["full"] }
async-trait        = "0.1"
serde              = { version = "1", features = ["derive"] }
serde_json         = "1"
thiserror          = "1"
eyre               = "0.6"
tracing            = "0.1"
proptest           = "1"

[workspace.lints.rust]
unsafe_code                   = "forbid"
missing_debug_implementations = "warn"
unreachable_pub               = "warn"
rust_2018_idioms              = { level = "warn", priority = -1 }

[workspace.lints.clippy]
all      = { level = "warn", priority = -1 }
pedantic = { level = "warn", priority = -1 }
module_name_repetitions = "allow"
must_use_candidate      = "allow"
missing_errors_doc      = "allow"
missing_panics_doc      = "allow"

[profile.release]
opt-level     = 3
lto           = "fat"
codegen-units = 1
strip         = "symbols"
debug         = false
panic         = "abort"

[profile.dev]
opt-level = 1
debug     = true

[profile.dev.package."*"]
opt-level = 3
\`\`\`

**このファイルで本質的な選択が 3 つある:**

1. **\`resolver = "3"\`**。Cargo の dep resolver のバージョン。Resolver 3 (Rust 2024 edition のデフォルト) は feature unification をより厳格に扱う。Reth と Malachite はどちらも複雑な feature flag を持っており、resolver 3 がそれらの微妙な衝突を避けてくれる。
2. **workspace レベルでの \`unsafe_code = "forbid"\`**。これにより member crate すべてで \`unsafe\` が禁止される。Reth は内部で \`unsafe\` を使っているが、我々のアプリケーション層は使わない。アプリケーション層で禁止することが L0 §4 の determinism レールだ — pure state-machine crate が \`unsafe\` を欲しがった瞬間、それは code review の警告サインになる。
3. **\`pedantic = "warn"\` (clippy)**。Pedantic な clippy lint は subtle な問題を多数キャッチする。ノイズになるルールもあるので、\`module_name_repetitions\` などを末尾で \`allow\` している。最初から pedantic を warn 設定にしておくと、すべての commit が clippy clean で land する。

### Step 3: \`rust-toolchain.toml\` をルートに追加

\`rust-toolchain.toml\` を作る:

\`\`\`toml
[toolchain]
channel    = "1.95.0"
components = ["clippy", "rustfmt"]
profile    = "minimal"
\`\`\`

Rust のバージョンを pin する。読者 (および CI) が \`cargo\` を呼ぶと、自動的にこの toolchain が fetch されて使われる。これがないとマシンごとに違う rustc バージョンでビルドされて異なるアーティファクトを生む — 我々が望まない determinism risk だ。

### Step 4: 最初のライブラリ crate (\`crates/types\`) をテンプレートとして作る

1 つの crate を end-to-end で作り、そのパターンを残り 9 つに replicate する。

\`\`\`bash
mkdir -p crates/types/src
\`\`\`

\`crates/types/Cargo.toml\` を作る:

\`\`\`toml
[package]
name         = "openhl-types"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]
serde = { workspace = true }

[lints]
workspace = true
\`\`\`

\`crates/types/src/lib.rs\` を作る:

\`\`\`rust
//! Shared primitives and CL/EL contract types.
\`\`\`

それだけだ。module doc comment 以外、crate は空。後続レッスンで中身を埋めていく。

**なぜ \`version = { workspace = true }\` 等?** これでルート Cargo.toml の \`[workspace.package]\` から継承される。すべての member crate が同じメタデータ (version、edition、license) を持つ。\`workspace = true\` 経由で継承すれば、workspace を 1 行 bump するだけで全 crate に波及する。代わりに crate ごとに \`version = "0.1.0"\` を書くと、6 行 × 11 crate で重複が増え、drift しやすくなる。

### Step 5: 残りの 9 個のライブラリ crate を作る

パターンは \`crates/types\` と同じ。各 crate について次を作る:

- \`crates/<name>/Cargo.toml\` (形は同じ、\`name\` フィールドだけ変える)
- \`crates/<name>/src/lib.rs\` (doc comment だけ)

残り 9 crate と doc comment:

| Crate | \`name\` | \`lib.rs\` の doc comment |
| - | - | - |
| codec | \`openhl-codec\` | \`//! Canonical encoding for consensus messages.\` |
| clob | \`openhl-clob\` | \`//! CLOB matching engine — pure state machine.\` |
| oracle | \`openhl-oracle\` | \`//! Mark price aggregation.\` |
| funding | \`openhl-funding\` | \`//! Funding-rate calculation and settlement.\` |
| liquidation | \`openhl-liquidation\` | \`//! Liquidation engine.\` |
| vault | \`openhl-vault\` | \`//! Protocol-native vault primitive.\` |
| evm | \`openhl-evm\` | \`//! EVM execution layer — Reth integration.\` |
| consensus | \`openhl-consensus\` | \`//! Consensus layer — Malachite BFT.\` |
| node | \`openhl-node\` | \`//! Node assembly: consensus + evm + clob.\` |

\`clob\`、\`oracle\`、\`funding\`、\`liquidation\`、\`vault\`、\`node\` については \`[dependencies]\` セクションは空でよい (\`[dependencies]\` 行のあとに空行、\`[lints]\` ブロック)。\`codec\`、\`evm\`、\`consensus\` も最初は空 — 実際の依存はそれを使うコードが land する後続レッスンで足す。

> 🛑 **反流暢性。** 「最初に全部の依存を書いておけば後で編集しなくて済むのでは?」 **違う。** Unused dependency を持つ crate は技術的負債だ: ビルドを遅くし、reader を混乱させ、version conflict を招く。依存は **それを使うコードが land するタイミングで** 足す。workspace の \`Cargo.toml\` が *使える* 依存を宣言し、各 crate の \`Cargo.toml\` が *使う* 依存を宣言する、という階層構造。

### Step 6: \`bin/openhl\` を作る

Binary crate。まだ何もしない — workspace がコンパイル可能なことを確かめるだけ。

\`\`\`bash
mkdir -p bin/openhl/src
\`\`\`

\`bin/openhl/Cargo.toml\` を作る:

\`\`\`toml
[package]
name         = "openhl"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[[bin]]
name = "openhl"
path = "src/main.rs"

[dependencies]

[lints]
workspace = true
\`\`\`

\`bin/openhl/src/main.rs\` を作る:

\`\`\`rust
fn main() {
    println!("openhl v{}", env!("CARGO_PKG_VERSION"));
}
\`\`\`

\`[[bin]]\` セクションで binary 名を \`openhl\`、エントリポイントを \`src/main.rs\` と宣言する。\`env!("CARGO_PKG_VERSION")\` マクロは Cargo.toml の version をコンパイル時に inline する — 後で \`openhl --version\` を実装するときに使える。

### Step 7: 最初の \`cargo check\`

\`\`\`bash
cd ~/code/my-openhl
cargo check --workspace
\`\`\`

期待する出力:

\`\`\`
   Compiling openhl-types v0.1.0
   Compiling openhl-codec v0.1.0
   ...(10 crate + openhl bin すべて)...
    Finished \`dev\` profile
\`\`\`

いくつかの \`unused_imports\` 警告は OK (\`serde\` を workspace の依存として宣言したが、ほとんどの crate がまだ使っていないため)。Hard error は OK ではない — 出た場合に多い原因:

- **\`workspace.members\` または crate Cargo.toml の crate 名のタイプミス。** Cargo が見つからない crate 名を教えてくれるので、タイプミスを直す。
- **library crate に \`src/lib.rs\` が無い。** \`workspace.members\` にリストされた crate はそれぞれ \`src/lib.rs\` か \`src/main.rs\` のどちらかが必要。
- **\`[lints]\` ブロックがあるが中に \`workspace = true\` が無い。** 各 crate の \`[lints]\` は \`workspace = true\` と書かないと継承されない。

エラーをすべて潰してから Step 8 に進む。

### Step 8: Reth を workspace の依存として pin する

Workspace の \`Cargo.toml\` を編集する。次の行を見つけて:

\`\`\`toml
# --- Reth と Malachite — 下の Step 8 と Step 9 で追加 ---
\`\`\`

これを次に置き換える:

\`\`\`toml
# --- Reth (v2.2.0 release tag に pin) ---
# Bump は専用 PR で行う。release-tag SHA を必ず pin、main HEAD には絶対 pin しない。
reth-node-builder         = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-ethereum        = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-core            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-tasks                = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-chainspec            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-evm                  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-primitives  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-engine-primitives    = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-primitives   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-consensus            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-consensus   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-primitives-traits    = "0.3"
alloy-primitives          = { version = "1.5", default-features = false }
alloy-consensus           = { version = "2.0", default-features = false }
alloy-genesis             = { version = "2.0", default-features = false }
alloy-evm                 = { version = "0.34", default-features = false }
alloy-rlp                 = { version = "0.3", default-features = false }
\`\`\`

**なぜこんなに多くの Reth crate を?** Reth は multi-crate codebase だ。Node builder、EVM、storage API、consensus hook など、それぞれが別 crate に住む。後続レッスンが使う予定のものを workspace レベルで宣言しておくと、各消費 crate は \`reth-xxx = { workspace = true }\` と書くだけで済む。

**なぜ SHA で pin するのか?** Reth は breaking change が頻繁にある。release tag の SHA (ここでは \`88505c7f...\` = v2.2.0) に pin することで安定したターゲットになる。\`version = "2.2"\` や branch に pin すると、Reth が無関係な変更をリリースしたときにビルドが壊れる可能性がある。

**なぜ main HEAD ではなく release-tag SHA に pin するのか?** Main HEAD はいつでも壊れる可能性がある。Release tag はテストされた安定版だ。ファイル中のコメント (\`# Bump は専用 PR で行う。release-tag SHA を必ず pin、main HEAD には絶対 pin しない。\`) は将来 bump するときの process discipline メモだ。

> 🛑 **予測。** いまの状態で \`cargo check --workspace\` を実行すると何が起こるか? スクロール前に 1 つ選べ:
> - (a) 何も変わらない — まだどの crate も Reth の依存を使っていないから
> - (b) 初回は劇的に遅くなる — Reth の transitive な ~600 crate を fetch + compile する
> - (c) エラー — Reth は明示的な configuration が必要で、まだ与えていない

答えは (b) だ。Cargo の \`workspace.dependencies\` 宣言は **resolution** を起こすが、未使用 deps の **compilation** は起こさない。しかし \`cargo check\` は依存グラフを walk して git source を fetch する。それが 5-15 分の初回コストだ。良いニュース: 以後の実行は cache が効く。

実行する:

\`\`\`bash
cargo check --workspace
\`\`\`

コーヒーを淹れてくる。戻ってきたら次のように見えるはず:

\`\`\`
    Updating git repository \`https://github.com/paradigmxyz/reth\`
    Updating crates.io index
...(大量の "Downloading" と "Compiling" 行)...
    Finished \`dev\` profile [optimized + debuginfo] target(s) in 14m 23s
\`\`\`

エラーが出た場合、多い原因:

- **alloy のバージョン衝突。** 上の workspace.deps ブロックをコピーする前に、古い \`alloy-primitives = "0.x"\` を別途宣言している場合、Cargo が unify できない。解決: 全 alloy バージョンを上記の \`1.5\` / \`2.0\` に揃える。
- **rustc バージョンが古い。** Reth v2.2.0 は rustc 1.93+ を要求する。\`rust-toolchain.toml\` が \`1.95.0\` を pin している。\`rustc --version\` で確認する。
- **Git fetch のネットワーク失敗。** 再実行する。Cargo の git fetch はたまに flaky だ。

### Step 9: Malachite を workspace の依存として pin する

\`[workspace.dependencies]\` の末尾に追加する:

\`\`\`toml
# --- Malachite BFT (v0.5.0 release tag に pin) ---
# 注意: malachite repo の crate 名には \`informalsystems-malachitebft-*\` という prefix がついている。
informalsystems-malachitebft-core-types      = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-core-consensus  = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-core-driver     = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55", features = ["std"] }
informalsystems-malachitebft-engine          = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-app             = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-app-channel     = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-config          = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-codec           = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-signing-ed25519 = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
\`\`\`

**Crate 名の特殊事情。** Malachite のリポ (\`informalsystems/malachite\`) は crate を \`informalsystems-malachitebft-*\` という prefix で publish している。Cargo.toml では full prefix の名前を使う。Rust ソースコードでは snake_case rename された形 (\`informalsystems_malachitebft_core_types::Context\`) で参照する。ファイルのコメントがこれを document している。

**core-driver の \`features = ["std"]\`。** Driver crate には \`std\` という feature gate がある。標準ライブラリの facility (BTreeMap、HashMap 等) が必要なので、明示的に有効化する。他の Malachite crate はデフォルトで \`std\` 込みなので、feature 指定不要。

再度 cargo check を実行する:

\`\`\`bash
cargo check --workspace
\`\`\`

今回は Reth の incremental cache が効いて、Malachite だけが fetch/compile される。典型的に 2-5 分。

## テスト

Step 9 が成功した後に:

\`\`\`bash
cargo check --workspace 2>&1 | tail -5
\`\`\`

期待値 (正確な warning 数や時間は環境次第):

\`\`\`
    Finished \`dev\` profile [optimized + debuginfo] target(s) in 23.45s
\`\`\`

binary も試せる:

\`\`\`bash
cargo build --bin openhl
./target/debug/openhl
\`\`\`

期待値:

\`\`\`
openhl v0.1.0
\`\`\`

L1 完了。

## 設計を振り返る

このレッスンで encode した本質的な決定が 2 つ:

1. **すべての外部依存は workspace レベルで宣言する**、crate ごとではなく。各 crate の Cargo.toml は \`reth-storage-api = { workspace = true }\` と書き、バージョンは workspace から継承する。Reth のバージョン bump は workspace を 1 行変えるだけで済む。代わりに各 crate が独自にバージョンを宣言する形にすると、11 crate の Cargo.toml がすべて drift するリスクが出る。

2. **Reth と Malachite は git 依存、crates.io 依存ではない。** 両プロジェクトとも crates.io に publish しているが、バージョニングの cadence が大きく違う。Workspace で specific な commit SHA に pin することは意図的な trade-off: bump の摩擦は大きいが、再現性が絶対になる。Production の L1 はこのやり方を取る — 2 validator が偶然違う "0.5.x" patch を fetch したことが原因で desync する事態を絶対に避けたいからだ。

この 2 つの決定は後続レッスンすべてに伝播する。L11 で crate の \`[dependencies]\` に \`reth-storage-api = { workspace = true }\` を追加するとき、Cargo は workspace レベルの pin を見つけて正しく解決する — そこを考えなくてよい状態になっている。

## 答え合わせ

自分の workspace を \`psyto/openhl\` の Stage 2+3 時点と比較する:

\`\`\`bash
cd ~/code/openhl-reference
git checkout 5fc7ca1
diff -ru ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -ru ~/code/my-openhl/crates/types ./crates/types
diff -ru ~/code/my-openhl/bin/openhl ./bin/openhl
\`\`\`

\`authors\`、\`repository\`、コメントの文言の違いは OK。\`members\`、\`workspace.dependencies\` の pin SHA、\`[workspace.lints]\`、profile の違いは NG — 該当する Step を読み返す。

確認が終わったら main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: 自分の作業を git に commit すべき?** Yes。\`~/code/my-openhl/\` で git を init し、各 step または各レッスンごとに commit する。Commit log が自分用の Stage 履歴になる。

\`\`\`bash
cd ~/code/my-openhl
git init  # まだしていなければ
git add .
git commit -m "L1 — workspace + Reth + Malachite を pin"
\`\`\`

**Q: "unused dependency" の warning が多いのはなぜ?** 各 member crate の \`[dependencies]\` セクションがほぼ空だから。Workspace レベルで依存を *利用可能* な状態にしたが、どの crate もまだ \`[dependencies]\` を埋めていない。レッスンが進んで各 crate が必要な依存を pull してくると、warning は減る。

**Q: ディスクが足りなくなった。** Reth と Malachite の source tree + target/ cache で 10-15 GB に達することもある。ディスクを足すか、\`.cargo/config.toml\` で \`[build] target-dir = ...\` を別ドライブに向ける。

**Q: 依存の fetch を並列化できる?** Cargo は自動的に並列化する。"Updating git repository" steps は git cache に書き込むので順次実行だが、"Compiling" steps はコアにまたがって並列化される。遅いと感じたら \`cargo build -j $(nproc)\` を確認する。

## 次のレッスン (L2)

Workspace がコンパイルされる状態になった。アプリケーションロジックはまだない。L2 では最初のアプリケーションコードを書く — \`openhl-types\` の \`BlockHash\`、\`PayloadId\`、\`PayloadAttrs\`、\`ExecutedBlock\`、\`PayloadStatus\`。これらは consensus↔EVM contract の **共通語彙** だ。L2 を終えると、contract type がコンパイルされ、基本的なテストが pass する状態になる。続く L3 でその type を使う trait を書く。`,
                },
              ],
            },
          },
          {
            title: "Contract types",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "レッスン 2 — openhl-types の共通 contract type",
                  slug: "openhl-contract-types-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 2 — \`openhl-types\` の共通 contract type

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-types
\`\`\`

…が 5 つの contract primitive をカバーする 4 テストで pass する。\`openhl-types\` crate が consensus と EVM の両方が依存する **共通語彙** になる — これらの type のために両側が import する唯一の crate だ。アプリケーションロジックはまだない; L3 で contract trait が参照するデータ定義を整える段階。

## これまでの状態

L1 が終わって、workspace は次の状態にある:

\`\`\`
~/code/my-openhl/
├── Cargo.toml          # Reth と Malachite を pin した workspace root
├── Cargo.lock          # full lock file (Reth/Malachite 解決済み)
├── rust-toolchain.toml # rustc 1.95.0
├── bin/openhl/         # "openhl v0.1.0" を print する binary
├── crates/
│   ├── types/          # 空 — \`//! Shared primitives...\` の doc comment のみ
│   ├── codec/
│   ├── clob/
│   ├── consensus/      # 空
│   ├── evm/            # 空
│   ... (6 個の空 crate がもう) ...
└── target/             # キャッシュされたコンパイル結果
\`\`\`

\`cargo check --workspace\` が通る。\`cargo test -p openhl-types\` は 0 テストを実行して成功する。

## これから build するもの

\`crates/types/src/lib.rs\` に 5 つの contract type を追加する:

| Type | 形 | contract での役割 |
| - | - | - |
| \`BlockHash\` | \`pub struct BlockHash(pub [u8; 32])\` | 32-byte hash、Ethereum convention。ブロックを参照するあらゆる場所で使う。 |
| \`PayloadId\` | \`pub struct PayloadId(pub u64)\` | \`build_payload\` が返し、\`payload_ready\` に渡す。 |
| \`PayloadAttrs\` | \`pub struct PayloadAttrs { timestamp, fee_recipient, prev_randao }\` | payload build job の入力。 |
| \`PayloadStatus\` | \`pub enum PayloadStatus { Valid, Invalid, Syncing }\` | \`validate_payload\` の verdict。 |
| \`ExecutedBlock\` | \`pub struct ExecutedBlock { hash, parent_hash, number, state_root }\` | consensus round が commit する対象。 |

加えて \`BlockHash\` に \`Display\` impl を 1 つ (ログが \`BlockHash([171, 18, ...])\` ではなく \`0xab12...\` を print するように)。

加えて 4 つの unit test: BlockHash の hex display、PayloadStatus の equality、ExecutedBlock の cloneability、BlockHash の serde round-trip。

この 5 つの type が CL↔EL contract の **共通語彙** だ。consensus crate と evm crate の両方がこれらを import する。3 番目の crate \`openhl-types\` に置く — \`openhl-consensus\` でも \`openhl-evm\` でもない場所に — 理由は §設計を振り返る で説明する。

> 🛑 **予測。** 上の表の 5 type を見る。**なぜ \`PayloadStatus\` が enum (3 variant) であって \`bool\` ではないのか?** ヒント: EL が各 answer を返したとき consensus node は何をすべきかを考える。3 つの違う action があり、2 つではない。

## 手を動かす walk-through

### Step 1: \`crates/types/src/lib.rs\` を開く

現在の内容 (L1 から):

\`\`\`rust
//! Shared primitives and CL/EL contract types.
\`\`\`

このコメントの下に type 定義を足していく。

### Step 2: \`Cargo.toml\` に \`serde\` があることを確認

L1 で \`crates/types/Cargo.toml\` を次のように設定済みのはず:

\`\`\`toml
[dependencies]
serde = { workspace = true }
\`\`\`

これでよい; \`#[derive(Serialize, Deserialize)]\` 行で使う。編集不要。

### Step 3: import を足す

\`crates/types/src/lib.rs\` を編集する。doc comment の後に:

\`\`\`rust
//! Shared primitives and CL/EL contract types.

use std::fmt;

use serde::{Deserialize, Serialize};
\`\`\`

\`std::fmt\` は \`BlockHash\` の \`Display\` impl 用。\`serde::{Deserialize, Serialize}\` は全 type の derive 用 — どの contract type も最終的に wire format で round-trip する必要があるので。

### Step 4: \`BlockHash\` を追加

\`\`\`rust
/// 32-byte block hash, Ethereum convention.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct BlockHash(pub [u8; 32]);

impl fmt::Display for BlockHash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("0x")?;
        for b in &self.0 {
            write!(f, "{b:02x}")?;
        }
        Ok(())
    }
}
\`\`\`

**Newtype パターン。** \`BlockHash\` は \`[u8; 32]\` のラッパーで、type alias ではない。これが重要: ラッパーなら compiler は \`let h: BlockHash = [0u8; 32];\` を reject する (明示的にラップが必要)。Type alias (\`type BlockHash = [u8; 32];\`) ならどちらでも通り、\`BlockHash\` が期待される場所に無関係な \`[u8; 32]\` を渡してもエラーにならない。**Newtype は「これは特定的に block hash である、ただの 32 bytes ではない」と Rust の型システムにチェックさせる方法だ。**

**32 bytes なのになぜ \`Copy\`?** Copy semantics で \`BlockHash\` を \`.clone()\` なしに value で渡せる。コストは小さい (32 bytes の memcpy)、得るものは大きい — block hash を頻繁にやり取りするので。代替 (\`Clone\` のみ) では call site すべてで \`.clone()\` が必要で、ノイズになる。

**なぜ 10 個も trait derive するのか?** \`Debug\` は \`{:?}\` フォーマット用; \`Clone, Copy\` で value semantics; \`PartialEq, Eq\` で equality test; \`PartialOrd, Ord\` でソート (validator が block を sort する場面が出てくる); \`Hash\` で \`HashMap\` の key に; \`Serialize, Deserialize\` で wire format。Contract type はどれも大体この同じセットを必要とする。

**なぜ custom \`Display\` impl?** デフォルトの \`Debug\` は \`BlockHash([171, 18, 240, ...])\` を print し、ログが読めない。Custom \`Display\` は \`0xab12f0...\` を print し、Ethereum convention に合わせる。ログは debugger の primary tool だ; 人間に読める形にすることは optional ではない。

\`cargo check -p openhl-types\` を走らせる。pass するはず。

### Step 5: \`PayloadId\` を追加

\`\`\`rust
/// Identifier returned by \`build_payload\`; used to retrieve the assembled block via \`payload_ready\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PayloadId(pub u64);
\`\`\`

同じ newtype パターン、より小さな backing type。\`Display\` impl は不要 — \`Debug\` (\`PayloadId(42)\`) でログには十分。

ここに \`PartialOrd, Ord\` は無い。Block hash は順序付けが必要 (ソート用); payload ID は不要 (\`build_payload\` と \`payload_ready\` の間で受け渡す不透明 token に過ぎない)。

> 🛑 **反流暢性。** 「なぜ \`u64\` をそのまま使わないのか? PayloadId はただの数字だ。」 **Newtype が footgun を防ぐから。** \`u64\` を直接使うと \`build_payload(..., some_random_u64)\` と書けてしまい、Cargo は捕捉しない。\`PayloadId(u64)\` なら compiler が \`PayloadId(some_random_u64)\` と明示的に書くことを強制し、意図が見えるようになる。コストは construction ごとに余分な \`(...)\` 1 個; 利益はコード中のすべての payload ID が「証明可能に payload ID である」状態になること、誰かのタイプミスの integer が紛れ込まない。

### Step 6: \`PayloadAttrs\` を追加

\`\`\`rust
/// Inputs to a payload-build job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayloadAttrs {
    pub timestamp: u64,
    pub fee_recipient: [u8; 20],
    pub prev_randao: [u8; 32],
}
\`\`\`

Newtype ではない real struct — 複数フィールド。3 つの中身:

- \`timestamp\` — Unix 秒、proposer が選ぶ
- \`fee_recipient\` — 20-byte Ethereum address、gas fee の送り先
- \`prev_randao\` — 32-byte beacon-chain randomness (前ブロックから)

この 3 つが Reth が payload を assemble するのに **最小限** 必要なものだ。Ethereum Engine API 仕様にはもっとフィールドがある (\`suggestedFeeRecipient\`、\`parentBeaconBlockRoot\`、\`withdrawals\` 等)。v0 では省略する — openhl は single-validator で、withdrawal flow を持たないので。

ここでは \`Copy\` は derive しない — 60 bytes は Copy の comfortable な閾値を超える。Caller が渡すときに明示的に \`clone()\` する。

### Step 7: \`PayloadStatus\` を追加

\`\`\`rust
/// Verdict from \`validate_payload\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PayloadStatus {
    Valid,
    Invalid,
    Syncing,
}
\`\`\`

3 つの variant、それぞれ specific な consensus 側応答に対応する:

- **\`Valid\`** — EL が block を適用し、期待された state を得た。投票する。
- **\`Invalid\`** — EL が block を適用したが結果が間違っていた (state-root mismatch、gas-limit 違反等)。Nil 投票; この proposer を faulty として扱う。
- **\`Syncing\`** — EL がまだ答えるための state を持っていない (chain が遅れている)。まだ投票しない; 待つか timeout に falling する。

**3 variant は互換ではない**。\`Syncing\` を \`Invalid\` のように扱うと、答えられたはずの peer から永久に fork する。\`Invalid\` を \`Syncing\` のように扱うと、bad proposal が通ってしまう。L3 (trait のレッスン) でこの話を深掘りする; 今は 3 つの区別された verdict を encode したという状態。

### Step 8: \`ExecutedBlock\` を追加

\`\`\`rust
/// An executed block — the artifact a consensus round commits to. Minimal v0 shape; txs and receipts land per Module 2.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutedBlock {
    pub hash: BlockHash,
    pub parent_hash: BlockHash,
    pub number: u64,
    pub state_root: [u8; 32],
}
\`\`\`

フィールド:

- \`hash\` — このブロックの hash
- \`parent_hash\` — 前ブロックの hash、chain を構成する
- \`number\` — block height (parent.number + 1、単調)
- \`state_root\` — execution 後の state の Merkle root (32 bytes)

ここに **無い** もの (意図的):

- transaction list — Module 2 (CLOB) で transaction が landing する; v0 は空ブロックを produce する
- receipts list — 同様
- logs bloom — 同様
- difficulty / mix hash — post-merge のデフォルト

これが consensus round が閉じるのに必要な最小形だ。Module 2-5 が landing するにつれて \`ExecutedBlock\` にフィールドが増えていく。いま最小形にしておけば、Module 2 を設計する前に Module 2 の design を encode してしまう事態を避けられる。

\`cargo check -p openhl-types\` を走らせる — 引き続き pass するはず。

### Step 9: Unit test を追加

\`crates/types/src/lib.rs\` の末尾に追加:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn block_hash_display_is_hex() {
        let h = BlockHash([0xab; 32]);
        let s = format!("{h}");
        assert!(s.starts_with("0x"));
        assert_eq!(s.len(), 2 + 64); // "0x" + 64 hex chars
        assert!(s.ends_with("ab"));
    }

    #[test]
    fn payload_status_equality() {
        assert_eq!(PayloadStatus::Valid, PayloadStatus::Valid);
        assert_ne!(PayloadStatus::Valid, PayloadStatus::Invalid);
        assert_ne!(PayloadStatus::Syncing, PayloadStatus::Valid);
    }

    #[test]
    fn executed_block_is_cloneable() {
        let original = ExecutedBlock {
            hash: BlockHash([1u8; 32]),
            parent_hash: BlockHash([0u8; 32]),
            number: 1,
            state_root: [2u8; 32],
        };
        let cloned = original.clone();
        assert_eq!(cloned.number, original.number);
        assert_eq!(cloned.hash, original.hash);
    }

    #[test]
    fn block_hash_serde_round_trips() {
        let original = BlockHash([0x42; 32]);
        let json = serde_json::to_string(&original).unwrap();
        let round_tripped: BlockHash = serde_json::from_str(&json).unwrap();
        assert_eq!(original, round_tripped);
    }
}
\`\`\`

最後のテストには dev-dependency として \`serde_json\` が必要。\`crates/types/Cargo.toml\` に追加:

\`\`\`toml
[dev-dependencies]
serde_json = { workspace = true }
\`\`\`

## テスト

\`\`\`bash
cargo test -p openhl-types
\`\`\`

期待値:

\`\`\`
running 4 tests
test tests::block_hash_display_is_hex ... ok
test tests::executed_block_is_cloneable ... ok
test tests::payload_status_equality ... ok
test tests::block_hash_serde_round_trips ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

テストが失敗する場合、典型的なミス:

- **\`#[derive(Clone)]\` や \`#[derive(PartialEq)]\` を type に書き忘れた。** Compiler error が欠けている trait 名を教えてくれる。
- **\`BlockHash\` に \`Display\` impl が無い**。\`format!("{h}")\` は \`Display\` を要求する、\`Debug\` ではない。
- **\`[dev-dependencies]\` に \`serde_json\` を追加し忘れた**。\`serde_json::to_string\` が解決しない。

## 設計を振り返る

このレッスンで encode した本質的な決定が 2 つ:

1. **Contract type は別 crate (\`openhl-types\`) に置く。** \`openhl-consensus\` でも \`openhl-evm\` でもない。理由は Rust の crate-graph の制約: もし \`BlockHash\` を \`openhl-consensus\` に置くと、\`openhl-evm\` はその type を使うために \`openhl-consensus\` に依存する必要がある。でも \`openhl-consensus\` も \`openhl-evm\` が impl するメソッドを call する必要がある — \`openhl-consensus\` が \`openhl-evm\` に依存することになる。**A→B と B→A は循環依存で、Rust は許可しない。** Fix は **shared vocabulary crate**: \`openhl-consensus\` と \`openhl-evm\` の両方が \`openhl-types\` に依存し、両者は type 定義のために互いに依存しない。これは CL↔EL split を持つあらゆる Rust workspace の standard なパターン — Reth も同じ目的で \`alloy-primitives\` と \`reth-primitives-traits\` を使っている。

2. **PayloadStatus は enum、bool ではない。** L0 / 上の予測で flag した話。3 状態は互換ではない: EL が *どの* not-Valid 状態にいるかで consensus 側応答が変わる。\`bool { is_valid }\` に collapse すると chain の liveness にとって load-bearing な情報を失う — Syncing node を Invalid として扱うと、助けてくれたはずの peer から永久に fork する。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 13113db
diff -u ~/code/my-openhl/crates/types/src/lib.rs ./crates/types/src/lib.rs
\`\`\`

自分のコードは実質的に同一になっているはず、空白とテスト名以外は。重要な一致ポイント: type 定義 (各フィールド、各 derive)、\`BlockHash::Display\` impl のロジック、\`PayloadStatus\` enum の variant 順序。

main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`BlockHash::Display\` のテストが失敗する — 「2+64 文字期待、X 文字」。**
おそらく \`write!(f, "{b:x}")\` (single hex digit) を書いた、\`write!(f, "{b:02x}")\` (2 hex digits、zero-padded) ではなく。Byte value 0x05 の場合、\`{b:x}\` は \`"5"\` を produce するが \`{b:02x}\` は \`"05"\` を produce する。テストは 1 byte あたり 2 文字を期待している。

**Q: \`ExecutedBlock\` を \`Copy\` にできるか?**
今の形式ではできない — production では \`Vec<...>\` (transaction list) を含み、\`Vec\` は \`Copy\` ではない。v0 では fixed-size フィールドだけなので *理論的には* Copy にできるが、後で外す手間を避けるために意図的に derive しない。フィールドが byte 列だけだとクローンも安いので、必要な call site で明示的に \`.clone()\` すればよい。

**Q: なぜ \`prev_randao\` が 32 bytes? 「ランダム性」なのに?**
前ブロックの RANDAO mix の hash (Ethereum の beacon-chain randomness beacon) だ。32 bytes = SHA-256 output。実際のエントロピー source は beacon chain だが、我々は hash として受け取る、したがって type は \`[u8; 32]\`。

**Q: \`BlockHash\` に \`Default\` を derive すべき?**
できる (\`[u8; 32]\` の \`Default\` は all-zeros) が、**ここでは derive しない** — openhl convention は「block hash は real data から compute されるもの」。Default-construct された \`BlockHash([0u8; 32])\` は code smell。Sentinel が必要な test code は \`BlockHash([0u8; 32])\` を明示的に書く。

## 次のレッスン (L3)

\`openhl-types\` には 5 つの contract type が揃った。L3 は \`ConsensusBridge\` trait — consensus が call する 4 メソッド API surface。Trait は今書いた type を参照する: \`build_payload(BlockHash, PayloadAttrs) -> PayloadId\`、\`payload_ready(PayloadId) -> ExecutedBlock\` 等。L3 を終えると contract が type レベルで完全に specified された状態になる; L4 でその impl を始める。`,
                },
                {
                  title: "レッスン 3 — ConsensusBridge trait",
                  slug: "openhl-bridge-trait-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 3 — \`ConsensusBridge\` trait

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo check -p openhl-consensus
\`\`\`

…が pass する。\`openhl-consensus\` crate に 4 メッセージ \`ConsensusBridge\` trait — consensus が call する型付き API surface、執行 (execution) が impl する — が入った状態になる。**Impl はまだない** (L4 から始まる); trait とそれに紐づく error type だけ。これがコンパイルされた時点で contract が型レベルで完全に定義され、後続レッスンはすべて「この trait method の中身を書く」「この trait の method を call する」のどちらかになる。

## これまでの状態

L2 を終えた時点:

\`\`\`
crates/types/src/lib.rs:
  - BlockHash、PayloadId、PayloadAttrs、PayloadStatus、ExecutedBlock
  - + BlockHash の Display impl
  - + 4 unit test pass
\`\`\`

\`openhl-consensus\` を含むほかの crate はまだ空の stub:

\`\`\`
crates/consensus/src/lib.rs:
  //! Consensus layer — Malachite BFT.
crates/consensus/Cargo.toml:
  [dependencies]   ← 空
\`\`\`

## これから build するもの

3 つのことをする:

1. **\`crates/consensus/Cargo.toml\` に 4 つの依存を追加**: \`openhl-types\` (L2 の type を使うため)、\`async-trait\` (trait メソッドで \`async fn\` を合法化するマクロ)、\`thiserror\` (きれいな error type を derive する macro)、\`eyre\` (\`thiserror\` と相性のよい \`Result\` ライブラリ)。
2. **\`crates/consensus/src/bridge.rs\` を作成** — \`ConsensusBridge\` trait (4 async メソッド) と \`BridgeError\` enum (3 variant)。
3. **\`crates/consensus/src/lib.rs\` に \`pub mod bridge;\` を追加** して bridge module を crate に組み込む。

この trait は **コース全体で最も参照されるアーティファクト** だ。L4 で impl する (\`InMemoryEvmBridge\`)。L5 でもう一度 impl する (\`RethEvmBridge\`)。L9 で actor pipeline から call する。L11-L13 で 3 度目の impl (\`LiveRethEvmBridge\`)。**いま書く signature が下流すべてに伝播する。**

> 🛑 **予測。** もう一度 4 つのメソッド名を見る: \`build_payload\`、\`payload_ready\`、\`validate_payload\`、\`commit\`。**3 つは CL → EL (consensus が execution を呼ぶ); 1 つは EL → CL (execution が応答する)。どれが EL → CL 方向で、なぜか?** ヒント: そのメソッドの *戻り値* を consensus 側がどう待っているかを考える。

## 手を動かす walk-through

### Step 1: \`crates/consensus/Cargo.toml\` に依存を追加

\`crates/consensus/Cargo.toml\` を開く。\`[dependencies]\` セクションは現状 header だけで空のはず。次に置き換える:

\`\`\`toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }
\`\`\`

4 つ。各々 \`workspace = true\` でルート \`Cargo.toml\` の pinned version を継承する。保存して:

\`\`\`bash
cargo check -p openhl-consensus
\`\`\`

これでも pass するはず — まだ使っていない依存を宣言しただけだから。Cargo は lock file に無いものを fetch する。\`async-trait\` と \`thiserror\` は小さいので、~5 秒で終わる。

**なぜこの 4 つか?**

- **\`openhl-types\`** — trait の signature が L2 の 5 つの type (\`BlockHash\`、\`PayloadAttrs\`、\`PayloadId\`、\`ExecutedBlock\`、\`PayloadStatus\`) を参照するから。
- **\`async-trait\`** — Rust の native な \`async fn\` in trait は複数の caveat (Send bound、\`dyn\` 互換性) があってまだ全部解決していない。\`#[async_trait]\` macro はそれを \`Pin<Box<dyn Future<...>>>\` へ desugar することで処理する。冗長だが安定していて \`dyn\` 互換。
- **\`thiserror\`** — \`impl Display\`/\`impl Error\` を手書きせずに custom error enum を derive するため。
- **\`eyre\`** — catch-all な \`Internal\` variant 用。\`eyre::Report\` は任意の error をバックトレース付きでラップする; 「予期せぬ何かがおかしくなった」を全 internal failure mode を列挙せずに表現するのに使う。

### Step 2: \`crates/consensus/src/bridge.rs\` を作成

新しいファイル。全体の内容:

\`\`\`rust
//! The CL/EL contract: four messages between consensus and execution.

use async_trait::async_trait;
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use thiserror::Error;

/// The four-message contract between BFT consensus and EVM execution.
///
/// Every interaction between \`openhl-consensus\` and \`openhl-evm\` flows through one of these methods. Anything else is a contract leak.
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
    /// CL → EL: build a candidate block on \`parent\`. Returns immediately; await the block via [\`Self::payload_ready\`].
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError>;

    /// EL → CL: wait for an in-flight build to complete.
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError>;

    /// CL → EL: would this peer-proposed block execute cleanly?
    async fn validate_payload(
        &self,
        block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError>;

    /// CL → EL: finalize this block. Fire-and-forget; failure halts the chain.
    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError>;
}

#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("execution layer rejected payload: {0}")]
    Rejected(String),

    #[error("execution layer is syncing")]
    Syncing,

    #[error("internal: {0}")]
    Internal(#[from] eyre::Report),
}
\`\`\`

各部分の役割を walk する — このファイルがコース内で最も重要なファイルだ。

### Step 3: Trait 宣言を理解する

\`\`\`rust
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
\`\`\`

**\`#[async_trait]\`** は attribute macro。trait を rewrite して各 \`async fn\` を \`Pin<Box<dyn Future<Output = ...> + Send + 'a>>\` を返す形にする。このマクロ無しだと、\`dyn ConsensusBridge\` (後で必ず使う) として trait を呼びたいときに Rust がエラーを出す。

**\`pub trait ConsensusBridge\`** で trait を public API にする — \`openhl-consensus\` も、後続の \`openhl-evm\` impl のような downstream crate も、この名前を使える。

**\`: Send + Sync\`** は super-trait bound。\`ConsensusBridge\` を impl するすべての type は \`Send\` (thread 境界をまたいで move 可能) かつ \`Sync\` (複数 thread から参照可能) でなければならない、と宣言している。bridge は \`Arc<dyn ConsensusBridge>\` で actor task 間で共有されるからこれが必要 — actor は別 thread に住み得る。

> 🛑 **反流暢性。** 「macro なしで \`async fn\` を直接書けないのか?」 **Rust 1.75 以降は書けるが caveat がある。** Native な async-fn-in-trait は返される future に自動で \`Send\` bound を付けてくれず、native async fn を持つ trait の \`dyn Trait\` には粗い部分が残る。\`#[async_trait]\` は退屈だが動く解決策。Native feature が成熟したら (おそらく 1.95-2025+)、見直せる。今は macro で行く。

### Step 4: 4 つの method signature を理解する

\`\`\`rust
async fn build_payload(
    &self,
    parent: BlockHash,
    attrs: PayloadAttrs,
) -> Result<PayloadId, BridgeError>;
\`\`\`

入力: parent block hash と payload attribute。出力: \`PayloadId\`、不透明 handle — bridge は build を開始したがブロックはまだ ready ではない。即座に return する。

\`\`\`rust
async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError>;
\`\`\`

その companion。\`build_payload\` から返ってきた \`PayloadId\` を渡し、\`ExecutedBlock\` を受け取る。in-flight な build が完了するまで block するので async。

**なぜ \`build_payload\` + \`payload_ready\` に分けて、1 つの \`build_payload -> ExecutedBlock\` にしないのか?** EL が *前 round の投票中* に build する必要があるから。\`build_payload\` が同期的にブロックを返すと、proposer は build を待ってから broadcast することになる; 分けると build が裏で走りつつ投票が進み、proposer の hot path は「準備済みブロックを fetch」(microsecond) に縮む。これが設計上 **最も重要な latency trick**。sub-second block time はこれに依存する。

\`\`\`rust
async fn validate_payload(
    &self,
    block: &ExecutedBlock,
) -> Result<PayloadStatus, BridgeError>;
\`\`\`

形が違う: \`&ExecutedBlock\` (borrowed、own ではない)。Bridge はブロックを *調べる* だけで、consume しない。\`PayloadStatus\` (L2 の enum) を返す: Valid / Invalid / Syncing。

**なぜ borrowed か?** Consensus は同じブロックを複数回 inspect する必要があるかもしれないから (broadcast する、persist する、それから validate する)。Ownership を取ると call site で値が consume され、呼び出し側が clone を強いられる。Borrow なら呼び出し側がそのまま保持できる。

\`\`\`rust
async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError>;
\`\`\`

最も小さい signature: hash 入力、unit 出力。**Fire-and-forget。** Consensus がブロックを decide した時点でこのメソッドが EL に「finalize しろ」と告げる。EL は state に適用、fork-choice を更新、その後 この hash を unset することは無い。\`Result<()>\` を返すことで hard failure を signal できる (**chain を halt させる** — L9 で扱う) が、成功 commit は何も返さない。

**\`&ExecutedBlock\` 引数が無い** ことに注意。commit が呼ばれる時点で、bridge は \`payload_ready\` か \`validate_payload\` でこのブロックをすでに見ている。hash だけを引数に取ることで、consensus は何も覚えない — EL が state を持ち、CL は stateless のままになる。

### Step 5: \`BridgeError\` enum を理解する

\`\`\`rust
#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("execution layer rejected payload: {0}")]
    Rejected(String),

    #[error("execution layer is syncing")]
    Syncing,

    #[error("internal: {0}")]
    Internal(#[from] eyre::Report),
}
\`\`\`

3 variant — \`PayloadStatus\` と同じ数だが、**1:1 対応ではない**。区別:

- **\`Rejected(String)\`** — EL がブロックにロジックを適用して「no、これは bad」と言った。String が human-readable な理由を持つ。Consensus はブロックを invalid として扱うべき: nil 投票、次 round へ。
- **\`Syncing\`** — EL がまだ答えるための state を持っていない。Rejection とは違う: ブロックが bad かは分からない、まだ答えられないだけ。Consensus は後でリトライすべき、nil 投票しない。
- **\`Internal(eyre::Report)\`** — 予期せぬ何かが壊れた。Disk full、mutex poisoned、panic caught。Consensus は **halt** すべき — chain レベルでは recover 不能。

**なぜ \`Syncing\` が error variant なのか、\`PayloadStatus::Syncing\` も status として存在するのに?** Contract に 2 層があるから:

- \`validate_payload\` からの \`PayloadStatus::Syncing\` は「EL が request を処理し、自分の sync state を report した」を意味する。
- 任意のメソッドからの \`BridgeError::Syncing\` は「call そのものが完了できなかった」を意味する。\`build_payload\` (parent state が無いと build できない) と \`commit\` (適用できないものは finalize できない) に多く該当する。

**\`#[from] eyre::Report\`** で \`From<eyre::Report> for BridgeError::Internal\` を自動 derive する。Bridge 実装側は \`let foo = some_call()?;\` と書けて、\`some_call()\` が \`Result<_, eyre::Report>\` を返すとき \`?\` が自動で \`BridgeError::Internal\` でラップしてくれる。「予期せぬ」エラーを bubble up する canonical な方法だ。

### Step 6: \`bridge\` を crate に組み込む

\`crates/consensus/src/lib.rs\` を開く。現状:

\`\`\`rust
//! Consensus layer — Malachite BFT.
\`\`\`

次に置き換える:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
\`\`\`

\`pub mod bridge;\` が Rust に「この crate に \`bridge\` という public module があり、source は \`src/bridge.rs\`」と教える。この行が無いと \`bridge.rs\` は crate 外から見えない。

## テスト

実行:

\`\`\`bash
cargo check -p openhl-consensus
\`\`\`

期待値:

\`\`\`
   Compiling openhl-consensus v0.1.0
    Finished \`dev\` profile [optimized + debuginfo] target(s) in 0.45s
\`\`\`

unused imports の warning (例: method signature をタイプミスして \`ExecutedBlock\` が未使用になる) や unused trait の warning が出るかもしれない。**Hard error は OK ではない**; warning は今のところ OK。

よくあるエラーと修正:

- **\`use of undeclared crate or module 'async_trait'\`** — \`async-trait\` が \`[dependencies]\` に無い。Step 1 を再確認。
- **\`cannot find type 'BlockHash' in this scope\`** — \`openhl-types\` が import されていない。\`bridge.rs\` の \`use\` 行を再確認。
- **\`expected type parameter 'Send + Sync', found...\`** — \`pub trait ConsensusBridge\` の後に \`: Send + Sync\` を書き忘れた。戻す。
- **\`#[from] is only allowed on a single field\`** — variant に \`#[from]\` を 2 個以上書いたか、tuple field のない variant に \`#[from]\` を付けた。

workspace 全体もコンパイルしてみる:

\`\`\`bash
cargo check --workspace
\`\`\`

引き続き pass するはず。

## 設計を振り返る

このレッスンで encode した本質的な決定が 3 つ:

1. **メソッドは 4 つ、3 でも 5 でもない。** すべての BFT-L1 実装がこの正確に 4 つに converge する。\`build_payload\` + \`payload_ready\` を 1 つに collapse すると build-during-voting が死ぬ。5 つ目 (例: \`notify_view_change\`) を足すと consensus 内部を execution に leak させる。数は BFT round 構造 (propose → vote → decide) によって決まるもので、言語の好みではない。

2. **trait に \`Send + Sync\` bound。** すべての impl が thread-safe であることを強制する。これが無いと actor 間で共有される \`Arc<dyn ConsensusBridge>\` がコンパイルできない。これがあれば、実装者は「mutable state は Mutex か atomic の裏に置く必要がある」と最初から分かる。Runtime バグの discipline を compiler が enforce する形だ。

3. **Error variant は 3 つ、1 つでも多くでもない。** 3 つは consensus 側の 3 つの distinct な action (vote-against、wait、halt) に対応する。\`BridgeError(String)\` 1 つだと consensus 側が文字列パースをすることになる。5 つ以上 (例: \`Rejected.Hash\`、\`Rejected.Number\`、\`Rejected.BaseFee\`) にすると EL 内部を consensus 側に leak するか、EL が変わると急速に drift する。3 つは **consensus が error に対して取る応答** の cardinality であり、EL の internal taxonomy は \`Rejected\` の String の裏に隠したまま。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 13113db
diff -u ~/code/my-openhl/crates/consensus/src/bridge.rs ./crates/consensus/src/bridge.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
\`\`\`

期待値: doc-comment の言い回しは少し違っても OK。4 method signature、3 error variant、\`#[async_trait]\` attribute、\`: Send + Sync\` bound は完全に一致する必要がある。

main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`cargo check\` が \`pub mod bridge\` と \`bridge.rs not found\` で文句を言う。**
ファイルは \`crates/consensus/src/bridge.rs\` であって \`crates/consensus/bridge.rs\` ではない。convention は「\`lib.rs\` で宣言された module は \`lib.rs\` の隣に住む」。

**Q: \`validate_payload\` が bytes を inspect するだけなら、なぜ async?**
v0 では sync でもよい — \`BlockHash\` を \`parent_hash\` と比較するのは microsecond の話。だが production の validate_payload は EVM を parent state に対して走らせ、async DB access が必要になる。今 async にしておけば後で trait を破る必要が無い。コストは ~0 (immediate-ready future は実質タダ)。

**Q: メソッド名は変えていい? \`build_payload\` は冗長。**
自分のコードでは変えられるが、openhl から divergence する。名前は Ethereum Engine API に合わせてある (\`engine_forkchoiceUpdated\` が \`PayloadId\` を返し、\`engine_getPayload\` で fetch する)。openhl ↔ Ethereum のマッピングが後者を知っている人に分かりやすくなる。

**Q: \`eyre::Report\` とは? なぜ \`String\` ではいけないのか?**
\`eyre::Report\` は cause chain と source-location info を持つ。Chain halt をデバッグするとき「DB write failed: disk full: at io.rs:142」と見たいのであって、「internal error」だけでは困る。\`Report\` はこれをやってくれる; \`String\` はやらない。catch-all variant に使う。

## 次のレッスン (L4)

Contract は型レベルで完全に specified された。L4 で impl を開始する。\`InMemoryEvmBridge\` を書く — fake ブロックを \`Mutex<HashMap>\` に保存して synthesize した hash を返す test double。Real EVM も real state も無い — trait を満たして consensus 側をテスト可能にするための最小限。**重要なのは、同じ trait \`ConsensusBridge\` が \`InMemoryEvmBridge\` (L4) と \`LiveRethEvmBridge\` (L11+) の両方をカバーすること — \`Send + Sync\` bound と \`async_trait\` macro のコストを払うことで得ている polymorphism の win だ。**`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
