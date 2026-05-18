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
      duration: 65,
      xpReward: 140,
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
        ],
      },
    },
  });
}
