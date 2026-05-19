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
      duration: 660,
      xpReward: 1270,
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
2. **おさらい。** workspace の現状。前のレッスンで build した部分。今時点で通っているテスト一覧。
3. **計画。** 何を足すか。openhl メンテナがオリジナルで実装したときに下した設計判断。
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

> 🛑 **やりがちな勘違い。** 「\`openhl-reference\` を直接編集すればいい。」 **違う。** あのリポは答え合わせであって自分の workspace ではない。read-only として扱うこと。\`my-openhl/\` への編集は自分のコード; \`openhl-reference/\` への編集は混乱の元 — どれが自分が書いたコードでどれが元からあったコードか分からなくなる。

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

> 🛑 **やりがちな勘違い。** 「答え合わせから直接 type した方が早い。」 **違う、それが一番悪い道だ。** \`openhl-reference\` から copy すれば 30 分で終わるが、学べることは何もない。レッスンの説明に従って自分で type し、レッスンが描写している摩擦に当たり、結果として答え合わせのコードと一致する状態に着地する — それが本来の道だ。一致するのは **証拠** であり、目的ではない。

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

## おさらい

L0 のセットアップを済ませている前提だ。手元には:

- \`~/code/my-openhl/\` — 自分の workspace、現状は \`cargo init --lib\` の default 出力
- \`~/code/openhl-reference/\` — \`psyto/openhl\` を clone 済み、\`cargo check\` が通っている

このレッスンの編集は **すべて** \`~/code/my-openhl/\` の中で行う。\`openhl-reference/\` には絶対に触れない。

## 計画

3 つの段階を順に進める:

1. **Stage 1** — \`cargo init --lib\` の default 出力を消し、real workspace に置き換える: 10 個の空ライブラリ crate、1 個の binary crate、workspace 全体のデフォルトを定義する top-level \`Cargo.toml\`。**テスト**: 外部依存なしで \`cargo check --workspace\` が通る。
2. **Stage 2** — Reth を workspace レベルで SHA pin の git 依存として宣言する。**テスト**: \`cargo check --workspace\` が引き続き通る (どの crate も Reth をまだ使っていない — 依存が解決可能なことを確認するだけ)。
3. **Stage 3** — Malachite を同じやり方で pin する。**テスト**: \`cargo check --workspace\` が引き続き通る。

各 stage は \`psyto/openhl\` の実際の commit に対応する: \`75be9de\`、続いて \`5fc7ca1\`。

**先にアプリケーションコードではなく依存グラフを組む理由**: Rust workspace で最も摩擦が多いのは依存解決だ。Reth と Malachite はどちらも巨大で transitive な依存ツリーが深い。**「あとでやる」にすると、アプリケーションコードを書いている最中に衝突を発見して巻き戻すことになる。** 先に依存を確定させておけば、その後のレッスンはレッスンの本題に集中できる。

> 🛑 **考えてみよう。** スクロール前に sketch せよ: workspace の Cargo.toml に書く \`members\` は何個で、それぞれ何か? ヒント: 10 個のライブラリ crate + 1 個の binary crate。L0 §3 で 5 つのサブシステムを学んだ; それを実装するのは具体的に 10 個のうちのどの crate か? (必要なら L0 §4 を見返す。)

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

> 🛑 **やりがちな勘違い。** 「最初に全部の依存を書いておけば後で編集しなくて済むのでは?」 **違う。** Unused dependency を持つ crate は技術的負債だ: ビルドを遅くし、reader を混乱させ、version conflict を招く。依存は **それを使うコードが land するタイミングで** 足す。workspace の \`Cargo.toml\` が *使える* 依存を宣言し、各 crate の \`Cargo.toml\` が *使う* 依存を宣言する、という階層構造。

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

> 🛑 **考えてみよう。** いまの状態で \`cargo check --workspace\` を実行すると何が起こるか? スクロール前に 1 つ選べ:
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

## おさらい

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

## 計画

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

> 🛑 **考えてみよう。** 上の表の 5 type を見る。**なぜ \`PayloadStatus\` が enum (3 variant) であって \`bool\` ではないのか?** ヒント: EL が各 answer を返したとき consensus node は何をすべきかを考える。3 つの違う action があり、2 つではない。

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

> 🛑 **やりがちな勘違い。** 「なぜ \`u64\` をそのまま使わないのか? PayloadId はただの数字だ。」 **Newtype が footgun を防ぐから。** \`u64\` を直接使うと \`build_payload(..., some_random_u64)\` と書けてしまい、Cargo は捕捉しない。\`PayloadId(u64)\` なら compiler が \`PayloadId(some_random_u64)\` と明示的に書くことを強制し、意図が見えるようになる。コストは construction ごとに余分な \`(...)\` 1 個; 利益はコード中のすべての payload ID が「証明可能に payload ID である」状態になること、誰かのタイプミスの integer が紛れ込まない。

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

## おさらい

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

## 計画

3 つのことをする:

1. **\`crates/consensus/Cargo.toml\` に 4 つの依存を追加**: \`openhl-types\` (L2 の type を使うため)、\`async-trait\` (trait メソッドで \`async fn\` を合法化するマクロ)、\`thiserror\` (きれいな error type を derive する macro)、\`eyre\` (\`thiserror\` と相性のよい \`Result\` ライブラリ)。
2. **\`crates/consensus/src/bridge.rs\` を作成** — \`ConsensusBridge\` trait (4 async メソッド) と \`BridgeError\` enum (3 variant)。
3. **\`crates/consensus/src/lib.rs\` に \`pub mod bridge;\` を追加** して bridge module を crate に組み込む。

この trait は **コース全体で最も参照されるアーティファクト** だ。L4 で impl する (\`InMemoryEvmBridge\`)。L5 でもう一度 impl する (\`RethEvmBridge\`)。L9 で actor pipeline から call する。L11-L13 で 3 度目の impl (\`LiveRethEvmBridge\`)。**いま書く signature が下流すべてに伝播する。**

> 🛑 **考えてみよう。** もう一度 4 つのメソッド名を見る: \`build_payload\`、\`payload_ready\`、\`validate_payload\`、\`commit\`。**3 つは CL → EL (consensus が execution を呼ぶ); 1 つは EL → CL (execution が応答する)。どれが EL → CL 方向で、なぜか?** ヒント: そのメソッドの *戻り値* を consensus 側がどう待っているかを考える。

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

> 🛑 **やりがちな勘違い。** 「macro なしで \`async fn\` を直接書けないのか?」 **Rust 1.75 以降は書けるが caveat がある。** Native な async-fn-in-trait は返される future に自動で \`Send\` bound を付けてくれず、native async fn を持つ trait の \`dyn Trait\` には粗い部分が残る。\`#[async_trait]\` は退屈だが動く解決策。Native feature が成熟したら (おそらく 1.95-2025+)、見直せる。今は macro で行く。

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
          {
            title: "EL test double",
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: "レッスン 4 — InMemoryEvmBridge — trait の最初の impl",
                  slug: "openhl-in-memory-bridge-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 70,
                  content: `# レッスン 4 — \`InMemoryEvmBridge\` — trait の最初の impl

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

…が in-memory bridge の build → ready → commit フローをカバーする 5 テストで pass する。L3 の \`ConsensusBridge\` の **最初の具象 implementation** が手元にある状態 — EVM のふりをして fake block を \`Mutex<HashMap>\` に保存し、Reth を立ち上げずに trait を exercise させる test double。Consensus crate の後続テストでこれを使う; L8/L9 の runner と engine_app も同様。

## おさらい

L3 を終えた時点:

\`\`\`
crates/types/src/lib.rs        — 5 type + Display + 4 test pass
crates/consensus/src/bridge.rs — ConsensusBridge trait + BridgeError
crates/consensus/src/lib.rs    — pub mod bridge;
crates/evm/src/lib.rs          — //! EVM execution layer の doc のみ、コードなし
crates/evm/Cargo.toml          — 空 [dependencies]
\`\`\`

\`cargo check --workspace\` が pass; \`cargo test -p openhl-evm\` は 0 テスト実行。

## 計画

4 つのことをする:

1. **\`crates/evm/Cargo.toml\` に 3 つの依存と 1 つの dev-dependency を追加**: \`openhl-consensus\` (trait と error type 用)、\`openhl-types\` (contract type 用)、\`async-trait\` (\`#[async_trait]\` macro 用)、dev-dep に \`tokio\` (テスト関数を \`#[tokio::test]\` にするため)。
2. **\`crates/evm/src/in_memory.rs\` を作成** — \`InMemoryEvmBridge\` struct、\`Mutex\` に持たせる private な \`State\` struct、4 つの async method すべてを提供する \`impl ConsensusBridge for InMemoryEvmBridge\` block、\`hex_short\` ヘルパー、\`#[cfg(test)] mod tests\` (5 テスト)。
3. **\`in_memory\` を crate に組み込む** — \`crates/evm/src/lib.rs\` に \`pub mod in_memory; pub use in_memory::InMemoryEvmBridge;\` を追加。
4. **\`cargo test -p openhl-evm\` を実行** — 5 テストが pass するのを見届ける。

これが初めて書く Rust の impl だ。ここで encode するパターンは繰り返される: L5 の \`RethEvmBridge\` も同じスケルトンを使い、L11+ の \`LiveRethEvmBridge\` もそうだ。**State 管理パターン (Mutex<State> + pending vs chain map) もそれらの impl に伝播する。**

> 🛑 **考えてみよう。** スクロール前に: test double の \`build_payload\` が **fake する** ものは何で、**実際にできる** ものは何か? ヒント: EVM は走らせられないが、できること: \`PayloadId\` を割り当てる、block number をインクリメントする、hash を synthesize する、pending block を覚える。Fake vs real の区別は L5 + L11 で意味を持つ。

## 手を動かす walk-through

### Step 1: \`crates/evm/Cargo.toml\` に依存を追加

\`crates/evm/Cargo.toml\` を開く。空の \`[dependencies]\` を置き換える:

\`\`\`toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }

[dev-dependencies]
tokio = { workspace = true }
\`\`\`

4 つ:

- **\`openhl-consensus\`** — impl から \`bridge::{ConsensusBridge, BridgeError}\` を参照するため
- **\`openhl-types\`** — \`BlockHash\`、\`PayloadId\` 等を使うため
- **\`async-trait\`** — impl block の \`#[async_trait]\` attribute 用
- **\`tokio\` (dev)** — async test 関数の \`#[tokio::test]\` 用

\`cargo check -p openhl-evm\` は引き続き pass する — まだ使っていない依存を宣言しただけ。

### Step 2: ファイルを作成

\`\`\`bash
touch crates/evm/src/in_memory.rs
\`\`\`

module-level doc を追加:

\`\`\`rust
//! In-memory \`ConsensusBridge\` — a test double for the EL side.
//!
//! Useful for unit-testing the consensus crate without spinning up Reth. The
//! real Reth-backed implementation lives in \`engine.rs\` (lands in L5).
\`\`\`

### Step 3: imports と struct を追加

\`\`\`rust
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use std::collections::HashMap;
use std::fmt::Write as _;
use std::sync::Mutex;

#[derive(Debug, Default)]
pub struct InMemoryEvmBridge {
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, ExecutedBlock>,
    chain: HashMap<[u8; 32], ExecutedBlock>,
    head: Option<BlockHash>,
}

impl InMemoryEvmBridge {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
}
\`\`\`

各フィールドの役割を walk:

**\`InMemoryEvmBridge\`** — public struct。フィールド 1 つ: \`state: Mutex<State>\`。Mutex が type を \`Send + Sync\` にする (thread 間で safely 共有可能)、これは trait が要求する。Mutable なものはすべて mutex の内側に置く。

**\`State\`** (private) — 3 つの bookkeeping:

- \`next_payload_id: u64\` — 単調カウンタ。\`build_payload\` のたびにインクリメントして、その前の値を返り値の \`PayloadId\` に使う。
- \`pending: HashMap<u64, ExecutedBlock>\` — \`build_payload\` が produce したが \`commit\` が accept していない block。\`PayloadId\` で key する。
- \`chain: HashMap<[u8; 32], ExecutedBlock>\` — commit 済み block。生の 32-byte hash で key する (\`BlockHash\` newtype ではなく — lookup 時に \`.0\` accessor を省ける)。
- \`head: Option<BlockHash>\` — 最も最近 commit された hash。何も commit していなければ \`None\`。

\`pending\` と \`chain\` を分けるのが重要: \`commit(hash)\` が呼ばれた時点で、その block は (前の \`build_payload\` から) すでに \`pending\` にある。\`commit\` は pending → chain に移し、\`head\` を更新する。real EL が in-flight payload buffer と finalized chain の両方を持つ構造と同じだ。

**\`impl InMemoryEvmBridge::new\`** — constructor。\`#[must_use]\` は clippy へのヒント: caller が \`InMemoryEvmBridge::new();\` を bind せずに書いたら、ほぼ間違いなくバグ。

### Step 4: \`ConsensusBridge\` を impl — \`build_payload\`

\`\`\`rust
#[async_trait]
impl ConsensusBridge for InMemoryEvmBridge {
    async fn build_payload(
        &self,
        parent: BlockHash,
        _attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let mut s = self.state.lock().expect("state mutex poisoned");
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let parent_number = s.chain.get(&parent.0).map_or(0, |b| b.number);
        let number = parent_number + 1;

        let mut hash_bytes = [0u8; 32];
        hash_bytes[..8].copy_from_slice(&id.to_le_bytes());
        hash_bytes[8..16].copy_from_slice(&number.to_le_bytes());

        let block = ExecutedBlock {
            hash: BlockHash(hash_bytes),
            parent_hash: parent,
            number,
            state_root: [0u8; 32],
        };
        s.pending.insert(id, block);
        Ok(PayloadId(id))
    }
    // ...続く
\`\`\`

順を追って:

1. **\`self.state.lock().expect("state mutex poisoned")\`** — mutex を取得する。\`.expect\` は \`PoisonError\` ケースをカバー: 前の holder が lock を持ったまま panic して、state が indeterminate なまま残った状態。正しい動作は自分も panic すること (poisoned な state machine から続けるのは unsafe)。文字列は debug 出力で lock を識別するためのもの。
2. **\`id = s.next_payload_id; s.next_payload_id += 1;\`** — fresh な payload ID を割り当てる。単調、再利用なし。DB の sequence と同じ。
3. **\`s.chain.get(&parent.0).map_or(0, |b| b.number)\`** — parent block の number を見つける。その parent を commit したことがなければ (例: テストの genesis hash)、0 にデフォルト (子は block 1 になる)。\`.0\` は \`BlockHash\` newtype を unwrap して内側の \`[u8; 32]\` を取り出す。
4. **\`(id, number)\` から hash を synthesize** — 最初の 8 byte が \`id.to_le_bytes()\`、次の 8 byte が \`number.to_le_bytes()\`、残りはゼロ。なぜ real hashing でないか? test double だから; hash は build ごとに unique であればよい。\`(id, number)\` は構造上 unique なので、synthesize された hash もそう。
5. **\`ExecutedBlock\` を build** し \`pending\` に stash する。block は parent_hash、number、hash、ゼロ state_root を持つ (EVM を走らせていない)。
6. **\`Ok(PayloadId(id))\` を返す**。

> 🛑 **やりがちな勘違い。** 「\`BlockHash\` に real cryptographic hash を使うべきでは。」 **違う** — これは test double。Real hashing は EVM を走らせて post-state root を compute する必要があり、それを避けるために test double を使っている。Synthesize した hash は \`BlockHash\` の *uniqueness* 要求を満たすが、*cryptographic-commitment* 要求は満たさない、これでよい — unit test として。Module 1 L11+ (LiveRethEvmBridge) が real hashing をするが、それは Reth が仕事をするから。

### Step 5: \`payload_ready\` を impl

同じ \`impl\` block を続ける:

\`\`\`rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        s.pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))
    }
\`\`\`

\`pending\` を ID で lookup する。見つかったら clone (caller が ownership を欲しがる; pending は block がまだ commit されていなくて caller が再度問い合わせる場合に備えて copy を残す)。見つからなければ descriptive な message で \`Rejected\` error を返す。

注意: \`payload_ready\` が impl 内で唯一の read-only — そう書きかけたが、これは read-only だ (mutation なし)。\`let s = self.state.lock()\` には \`mut\` 不要 — \`.get()\` を呼ぶだけで、insert や remove は無いから。

### Step 6: \`validate_payload\` を impl

\`\`\`rust
    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        Ok(PayloadStatus::Valid)
    }
\`\`\`

この impl で一番単純なもの。Test double なので — どんな block も valid と assert する。Real validation (L12) で \`EthBeaconConsensus::validate_header_against_parent\` を actual parent に対して走らせる。今は \`Valid\` を返すことで consensus tests が動く。

**重要: \`_block\` (leading underscore)。** compiler に「この引数を意図的に使わない」と伝える。Underscore 無しだと \`unused_variables\` warning が出る; あれば抑制される。

### Step 7: \`commit\` を impl

\`\`\`rust
    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        let mut s = self.state.lock().expect("state mutex poisoned");
        let block = s
            .pending
            .values()
            .find(|b| b.hash == block_hash)
            .cloned()
            .ok_or_else(|| {
                let hex = hex_short(&block_hash.0);
                BridgeError::Rejected(format!("commit for unknown hash {hex}"))
            })?;
        s.chain.insert(block_hash.0, block);
        s.head = Some(block_hash);
        Ok(())
    }
}
\`\`\`

流れ:

1. State を write 用に lock。
2. \`pending.values()\` の中から \`block_hash\` に一致する block を探す。value 経由で iterate する理由: \`pending\` は \`PayloadId\` で key しているので、hash で block を探すには scan が必要。(real impl で O(1) の hash→block lookup を持つなら、2 番目の index を持つ。test double では O(n) scan で OK。)
3. 見つからなければ short hex hash で \`Rejected\` error を返す。
4. 見つかれば \`chain\` (hash bytes で key) に insert して \`head\` を更新。

\`pending\` から remove しないことに注意 — commit 後、block は両方の map に居続ける。Real impl は \`pending.remove(&id)\` するかもしれないが、test では関係ない。

\`hex_short\` ヘルパーが次のセクション:

\`\`\`rust
fn hex_short(bytes: &[u8; 32]) -> String {
    let mut s = String::with_capacity(18);
    s.push_str("0x");
    for b in &bytes[..8] {
        write!(&mut s, "{b:02x}").expect("write to String never fails");
    }
    s
}
\`\`\`

最初の 8 byte を 0x prefix 付きの hex 文字列に — ログ 1 行に収まる短さ。\`write!(&mut s, ...)\` 呼び出しには file 先頭の \`use std::fmt::Write as _;\` が必要 (Step 3 で追加済み)。\`as _\` rename は trait を *method 用に* import しつつ、\`Write\` という名前で namespace を汚染しない。

### Step 8: \`in_memory\` を crate に組み込む

\`crates/evm/src/lib.rs\` を開く。現状:

\`\`\`rust
//! EVM execution layer — Reth integration.
\`\`\`

置き換える:

\`\`\`rust
//! EVM execution layer — Reth integration.

pub mod in_memory;

pub use in_memory::InMemoryEvmBridge;
\`\`\`

\`pub mod in_memory;\` で module を expose。\`pub use in_memory::InMemoryEvmBridge;\` で struct を crate root に re-export し、downstream crate が \`use openhl_evm::InMemoryEvmBridge;\` と書ける (\`use openhl_evm::in_memory::InMemoryEvmBridge;\` ではなく)。

### Step 9: Unit test を追加

\`crates/evm/src/in_memory.rs\` の末尾に追加:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    fn attrs() -> PayloadAttrs {
        PayloadAttrs {
            timestamp: 0,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        }
    }

    #[tokio::test]
    async fn build_then_ready_returns_same_block() {
        let bridge = InMemoryEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        assert_eq!(block.parent_hash, parent);
        assert_eq!(block.number, 1);
    }

    #[tokio::test]
    async fn validate_returns_valid() {
        let bridge = InMemoryEvmBridge::new();
        let block = ExecutedBlock {
            hash: BlockHash([2u8; 32]),
            parent_hash: BlockHash([1u8; 32]),
            number: 1,
            state_root: [0u8; 32],
        };
        let status = bridge.validate_payload(&block).await.unwrap();
        assert_eq!(status, PayloadStatus::Valid);
    }

    #[tokio::test]
    async fn commit_advances_head_and_records_block() {
        let bridge = InMemoryEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        bridge.commit(block.hash).await.unwrap();
        let s = bridge.state.lock().unwrap();
        assert_eq!(s.head, Some(block.hash));
        assert!(s.chain.contains_key(&block.hash.0));
    }

    #[tokio::test]
    async fn build_on_committed_parent_increments_number() {
        let bridge = InMemoryEvmBridge::new();
        let genesis = BlockHash([1u8; 32]);
        let id1 = bridge.build_payload(genesis, attrs()).await.unwrap();
        let block1 = bridge.payload_ready(id1).await.unwrap();
        bridge.commit(block1.hash).await.unwrap();

        let id2 = bridge.build_payload(block1.hash, attrs()).await.unwrap();
        let block2 = bridge.payload_ready(id2).await.unwrap();
        assert_eq!(block2.number, 2);
        assert_eq!(block2.parent_hash, block1.hash);
    }

    #[tokio::test]
    async fn commit_unknown_hash_errors() {
        let bridge = InMemoryEvmBridge::new();
        let err = bridge.commit(BlockHash([9u8; 32])).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
}
\`\`\`

各 test が何を証明するか:

| テスト | 何を証明するか |
| - | - |
| \`build_then_ready_returns_same_block\` | \`build_payload\` + \`payload_ready\` の round-trip が動く。fake genesis の上で number = 1。 |
| \`validate_returns_valid\` | \`validate_payload\` が常に \`Valid\` を返す (test double の挙動)。 |
| \`commit_advances_head_and_records_block\` | Commit 後、head が新ブロックを指し、chain map にも含まれる。 |
| \`build_on_committed_parent_increments_number\` | Number の単調性: parent block 1 の上に build → block 2。 |
| \`commit_unknown_hash_errors\` | Pending に無い hash の commit は \`BridgeError::Rejected\` を返す。 |

\`#[tokio::test]\` は \`#[test]\` の async 対応版。test 用に tokio runtime をセットアップし、async 本体を await する。

## テスト

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

期待値:

\`\`\`
running 5 tests
test in_memory::tests::build_on_committed_parent_increments_number ... ok
test in_memory::tests::build_then_ready_returns_same_block ... ok
test in_memory::tests::commit_advances_head_and_records_block ... ok
test in_memory::tests::commit_unknown_hash_errors ... ok
test in_memory::tests::validate_returns_valid ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

よくあるエラーと修正:

- **\`Mutex<HashMap<u64, ExecutedBlock>>\` が \`Default\` を auto-derive しない。** 待って、する — \`Mutex<T>\` も \`HashMap<K, V>\` も \`Default\` を derive する。これが出るなら、\`BTreeMap\` (これも Default あり) か別の Default なしの type を書いたかも。\`HashMap\` に戻す。
- **\`use std::fmt::Write as _;\` が実際は使われていない** — clippy が warning する。\`Write\` trait は \`hex_short\` 内で \`write!\` macro 経由で使われる; warning は macro 展開が import を見ていないことを意味する。\`use\` が module 先頭にあるか確認 (関数内ではなく)。
- **\`#[tokio::test]\` not found** — \`tokio\` が \`[dev-dependencies]\` に無い。Step 1 を再確認。
- **\`block.number == 1\` を assert するテストで \`0\` が返る。** \`let number = parent_number + 1;\` の \`+ 1\` を書き忘れた。

## 設計を振り返る

このレッスンで encode した本質的な決定が 2 つ:

1. **State は \`Mutex<State>\` の裏に置く。** これが \`InMemoryEvmBridge\` を thread-safe にする — そして \`Send + Sync\` にする。代替 (lock-free、atomic-only mutation) は test double にしては遥かに複雑。Lock は contention が低いとき (test code) や critical section が短いとき (real code) なら fine。このパターンは L11+ の \`LiveRethEvmBridge\` にも伝播する — 同じ \`Mutex<State>\` の形をしている。

2. **\`pending\` と \`chain\` を分けた map にする。** Real EL でも同じ split がある — 現在 build 中の payload と canonical chain に commit された block。Test double にこれを encode することで、**データフローの形** が production impl に carry over する。1 つの combined map にすると「build = commit」を含意してしまう — 違う。Build は speculative、commit が final。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 3b43586
diff -u ~/code/my-openhl/crates/evm/src/in_memory.rs ./crates/evm/src/in_memory.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
\`\`\`

テスト順、doc-comment の言い回し、exact な debug message format に違いがあっても OK。struct の形、\`Mutex<State>\` パターン、4 method impl のロジックは近く一致するはず。

main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`commit_advances_head_and_records_block\` が "mutex poisoned" で panic する。**
最もよくある原因は、別のテストが同じ impl 内で lock を持ったまま panic し、state が poisoned のままになったこと。Cargo はデフォルトで test を並列実行する; 本当の問題と確信したら \`cargo test -p openhl-evm -- --test-threads=1\` で逐次実行する。(我々のケースではほぼ test コードのバグだ — 各テストが \`InMemoryEvmBridge::new()\` を作るので shared state は無い。)

**Q: \`pending\` を \`HashMap<u64, _>\` ではなく \`HashMap<PayloadId, _>\` にすべき?**
どちらでも動く。openhl convention は storage layer で内側の type (\`u64\`) を使い、lookup 内での wrap/unwrap を避ける。Public API はまだ \`PayloadId\` を使う。trade-off: \`HashMap<PayloadId, _>\` で type safety を得る代わりに lookup ごとに \`.0\` accessor が必要。\`HashMap<u64, _>\` で storage layer の type safety を諦めるが noise を避ける。好み; \`u64\` を選んだ。

**Q: \`hex_short\` がなぜ最初の 8 byte だけ? 全部じゃない理由は?**
ログを短くする必要があるから。Full 32-byte hex は 64 文字 — ログ行を食う。最初の 8 byte (16 hex 文字 + "0x") で dev/test シナリオでは block を identify するのに十分。Production ログでは full hash を使う; ヘルパーを変える。

**Q: テストは pass するが \`unused_imports\` で clippy warning が出る。**
import が実際にコード中で使われているか確認する。Boilerplate に \`std::fmt::Write as _\` がある — \`hex_short\` 内でだけ使われる。\`hex_short\` を書いていなければ unused。ヘルパーを追加するか import を消す。

## 次のレッスン (L5)

動作する \`ConsensusBridge\` impl が手元にあるが、Reth を一切使っていない。L5 で次の impl を書く: \`RethEvmBridge\`。Same trait、しかし \`ExecutedBlock\` は real \`alloy_consensus::Header\` から build される (synthesize ではなく)、\`BlockHash\` は Reth の \`Header::hash_slow\` で hash された real \`B256\`。State はまだ in-memory (live Reth provider なし) だが、**型は real**。これが toy 型 (L4) と live 統合 (L11+) の間の bridge だ。`,
                },
                {
                  title: "レッスン 5 — real alloy 型を使う RethEvmBridge",
                  slug: "openhl-reth-bridge-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 70,
                  content: `# レッスン 5 — real alloy 型を使う \`RethEvmBridge\`

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

…が **9 テスト** (L4 の \`InMemoryEvmBridge\` の 5 つ + 新規 4 つ) で pass する。新 bridge は L4 と構造的には同じだが、合成した block ではなく \`alloy_consensus::Header\` (Ethereum の real な header struct) を保存し、block hash を \`Header::hash_slow()\` (本物の RLP encoding + Keccak-256) で計算する — fabricate した byte ではなく。

**自分のコードが alloy / Reth 型に初めて触れるレッスン**だ。「テスト用は合成、production-shape は real 型」というパターンはコースを通して繰り返される; ここできれいに学ぶと L11+ で時間を節約できる。

## おさらい

L4 を終えた時点:

\`\`\`
crates/evm/src/in_memory.rs — InMemoryEvmBridge (合成 block、5 テスト pass)
crates/evm/src/lib.rs       — pub mod in_memory; pub use InMemoryEvmBridge;
crates/evm/Cargo.toml       — 3 deps (openhl-consensus、openhl-types、async-trait)、tokio dev-dep
\`\`\`

\`cargo test -p openhl-evm\` が 5/5 pass。

## 計画

6 つのことをする:

1. **\`crates/evm/Cargo.toml\` に alloy 依存を 2 つ追加**: \`alloy-primitives\` (\`B256\`、\`Address\` 用) と \`alloy-consensus\` (\`Header\` 用)。L1 で workspace deps にすでに pin 済み。
2. **\`crates/evm/src/engine.rs\` を作成** — \`RethEvmBridge\` struct、private な \`State\` struct (合成 \`ExecutedBlock\` ではなく \`Header\` を保存)、\`impl ConsensusBridge for RethEvmBridge\` block。
3. **型変換ヘルパー 3 つ** (\`to_b256\`、\`from_b256\`、\`to_executed_block\`) — trait の \`BlockHash\` と内部の \`B256\` + \`Header\` の橋渡し。
4. **Unit test 4 つ** — そのうち 1 つは「real hashing が動く」を証明 (header のフィールドを変えると hash が変わる)。
5. **\`engine\` を crate に組み込む** — \`lib.rs\` に \`pub mod engine;\` + re-export を追加。
6. **\`cargo test -p openhl-evm\` を実行** — 9 テストすべて pass する。

key step は #2 — **内部 state の形が変わる**。L4 は \`ExecutedBlock\` を直接保存していた。L5 は \`(B256, Header)\` を保存する: alloy-native な型で、\`ExecutedBlock\` への変換は trait boundary でだけ行う。**alloy 型が source of truth、\`ExecutedBlock\` は contract の serialization に過ぎない。** この分離が L11+ で拡張される — \`LiveRethEvmBridge\` は同じ「内部 vs 境界」split を保ったまま、その後ろに real Reth provider を追加する。

> 🛑 **考えてみよう。** L4 の \`InMemoryEvmBridge\` は hash を \`(id, number)\` から合成した。L5 の \`RethEvmBridge\` は \`header.hash_slow()\` を呼ぶ — real RLP encoding + Keccak-256。**この違いで testable になる挙動は何か?** ヒント: header の 1 フィールドを変えたとき hash がどうなるかを考えよ。

## 手を動かす walk-through

### Step 1: \`crates/evm/Cargo.toml\` に alloy 依存を追加

\`crates/evm/Cargo.toml\` を開く。L4 時点の \`[dependencies]\`:

\`\`\`toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }
\`\`\`

2 行追加する:

\`\`\`toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }
alloy-primitives = { workspace = true }
alloy-consensus  = { workspace = true }
\`\`\`

両方とも \`workspace.dependencies\` から継承する (L1 でセットアップ済み)。\`alloy-primitives\` が \`B256\` (32-byte hash の newtype) と \`Address\` (20-byte address の newtype) を提供。\`alloy-consensus\` が \`Header\` (Ethereum block header struct、全フィールド入り) を提供。

実行:

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

pass するはず — 依存は available、まだ何も使っていない。

### Step 2: \`crates/evm/src/engine.rs\` を作成

\`\`\`bash
touch crates/evm/src/engine.rs
\`\`\`

module doc と imports から始める:

\`\`\`rust
//! Reth-backed \`ConsensusBridge\` — uses alloy / Reth types throughout.
//!
//! At v0 this maintains state in-process for the parts that would normally
//! require a running Reth node (\`PayloadBuilder\` service, \`BlockchainProvider\`).
//! The live-node bootstrap lands in later lessons (L10-L13); the type
//! conversions and state-machine shape here are the contract that bootstrap
//! will satisfy.

use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use std::collections::HashMap;
use std::sync::Mutex;
\`\`\`

L4 と比べて新しい import:

- \`alloy_consensus::Header\` — Ethereum の canonical な block header struct (~20 フィールド: parent_hash、number、timestamp、beneficiary、gas_limit、base_fee、state_root 等)
- \`alloy_primitives::{Address, B256}\` — address 型 (20 byte) と hash 型 (32 byte)。両方とも byte 配列の newtype で L2 の \`BlockHash\` と同じ形 — だが alloy 側から来ていて、Ethereum Rust エコシステム全体の convention になっている。

### Step 3: struct を追加

\`\`\`rust
#[derive(Debug, Default)]
pub struct RethEvmBridge {
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, (B256, Header)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}

impl RethEvmBridge {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
}
\`\`\`

L4 の \`InMemoryEvmBridge\` と同じ shape だが、**\`State\` 内の型が違う**:

| フィールド | L4 (InMemory) | L5 (Reth) |
| - | - | - |
| \`pending\` | \`HashMap<u64, ExecutedBlock>\` | \`HashMap<u64, (B256, Header)>\` |
| \`chain\` | \`HashMap<[u8; 32], ExecutedBlock>\` | \`HashMap<B256, Header>\` |
| \`head\` | \`Option<BlockHash>\` | \`Option<B256>\` |

**なぜ \`Header\` 単体ではなく \`(B256, Header)\` を保存するのか?** \`Header::hash_slow()\` が expensive だから — header 全体を RLP encode して Keccak-256 を走らせる。Insert 時に 1 度 hash を計算してタプルに cache すれば、\`pending.get(id)\` は再 hashing なしで両方返せる。Hash は \`chain\` の lookup key (および \`commit\` の lookup criterion) になるので、用意しておきたい。

**なぜ \`chain\` の key と \`head\` に \`[u8; 32]\` ではなく \`B256\` を使うのか?** alloy-native な空間にいるから — \`Header\` を持つ時点で自然な hash 型は \`B256\`。\`[u8; 32]\` を使うとあちこちで \`.0\` accessor が必要になる。\`BlockHash\` への変換は trait boundary を越えるときだけ、ヘルパー関数で行う (Step 6)。

### Step 4: \`build_payload\` を impl — 初めての real hashing

\`\`\`rust
#[async_trait]
impl ConsensusBridge for RethEvmBridge {
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let parent_hash = to_b256(parent);
        let mut s = self.state.lock().expect("state mutex poisoned");

        let parent_number = s.chain.get(&parent_hash).map_or(0, |h| h.number);
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let header = Header {
            parent_hash,
            number: parent_number + 1,
            timestamp: attrs.timestamp,
            beneficiary: Address::from(attrs.fee_recipient),
            mix_hash: B256::from(attrs.prev_randao),
            ..Default::default()
        };
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header));
        Ok(PayloadId(id))
    }
    // ...続く
\`\`\`

順を追って:

1. **\`to_b256(parent)\`** — trait の \`BlockHash\` を alloy の \`B256\` に変換 (どちらも 32 byte、byte 単位の reinterpretation のみ)。ヘルパーは Step 6。
2. **Parent number を \`chain\` から lookup** — key は今や \`B256\`、\`[u8; 32]\` ではない。Map の lookup 型は \`B256\`; \`&parent_hash\` (a \`&B256\`) をそのまま渡す、unwrap 不要。
3. **Payload ID 割り当て** — L4 と同じ。
4. **\`Header\` を build** — フィールドのうち設定するもの以外はデフォルト:
   - \`parent_hash\` — trait input の alloy \`B256\`
   - \`number\` — parent + 1
   - \`timestamp\` — \`PayloadAttrs\` から
   - \`beneficiary: Address::from(attrs.fee_recipient)\` — \`[u8; 20]\` を alloy の \`Address\` newtype に変換
   - \`mix_hash: B256::from(attrs.prev_randao)\` — \`[u8; 32]\` を \`B256\` に変換
   - \`..Default::default()\` — 残りの全フィールドを zero/default で埋める (state_root、gas_limit 等)
5. **\`header.hash_slow()\`** — **本物の hash 計算**。\`Header\` 全体 (defaulted フィールド込み ~20 個) を RLP encode し、Keccak-256 を走らせて \`B256\` を produce する。"slow" は convention の名前 — \`hash_fast\` は header struct に hash が pre-cache されている場合に存在するが、今は該当しない。
6. **\`(hash, header)\` を pending に insert** (payload ID を key に)。ID を return。

**この block hash は real だ。** header のどのフィールドが call 間で 1 byte でも変われば、結果の hash が異なる。L4 の合成 hash にはこの性質がなかった; L5 の hash にはある。Step 9 のテストがこれを証明する。

> 🛑 **やりがちな勘違い。** 「\`hash\` を \`header\` とは別に保存した方がきれい — タプルじゃなくて。」 **やろうと思えばできる、\`State\` にフィールドが 1 つ増えるだけ。だがタプルは関係を捉える — この hash は、ちょうどこの header の hash だ、と。** 別々に持つと、header を変更したのに hash の recompute を忘れるバグを招く。タプルにすることで両者が不可分になる。

### Step 5: \`payload_ready\`、\`validate_payload\`、\`commit\` を impl

\`\`\`rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        let (hash, header) = s
            .pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
        Ok(to_executed_block(hash, &header))
    }

    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        // Real validation requires a live Reth provider + EVM (lessons L11+).
        // For now, defer to the CL's voting layer for actual block validity
        // and accept structurally.
        Ok(PayloadStatus::Valid)
    }

    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        let hash = to_b256(block_hash);
        let mut s = self.state.lock().expect("state mutex poisoned");
        let header = s
            .pending
            .values()
            .find(|(h, _)| *h == hash)
            .map(|(_, header)| header.clone())
            .ok_or_else(|| BridgeError::Rejected(format!("commit for unknown hash {hash}")))?;
        s.chain.insert(hash, header);
        s.head = Some(hash);
        Ok(())
    }
}
\`\`\`

**\`payload_ready\`** はタプルを pending から clone して取り出し、\`to_executed_block\` (Step 6) を呼んで trait の return type を内部の \`(B256, Header)\` から materialize する。

**\`validate_payload\`** はまだ stub。Live Reth provider に対する real validation は L12 で land する; いまは structural に accept。

**\`commit\`** は L4 と同じ流れだが型置換:
- \`to_b256(block_hash)\` で trait の \`BlockHash\` を \`B256\` に変換
- \`pending.values()\` の中で hash が一致するタプルを探す
- header を \`chain\` に insert (key は \`B256\`)
- \`head\` を更新

closure パターン \`find(|(h, _)| *h == hash)\` に注目 — タプルを destructure して 1 番目の要素を比較する。\`*h\` は \`&B256\` を deref して \`B256\` にし、\`hash\` (こちらも \`B256\`) と比較できるようにする。

### Step 6: 変換ヘルパーを追加

\`impl ConsensusBridge\` block の後に:

\`\`\`rust
fn to_b256(h: BlockHash) -> B256 {
    B256::from(h.0)
}

fn from_b256(b: B256) -> BlockHash {
    BlockHash(b.0)
}

fn to_executed_block(hash: B256, header: &Header) -> ExecutedBlock {
    ExecutedBlock {
        hash: from_b256(hash),
        parent_hash: from_b256(header.parent_hash),
        number: header.number,
        state_root: header.state_root.0,
    }
}
\`\`\`

小さなヘルパー 3 つ:

- **\`to_b256\`** — \`BlockHash → B256\`。\`.0\` で内側の \`[u8; 32]\` を取り出し、\`B256::from\` に渡す。
- **\`from_b256\`** — \`B256 → BlockHash\`。内側の bytes を newtype で wrap する。
- **\`to_executed_block\`** — trait の \`ExecutedBlock\` を内部の \`(B256, Header)\` から materialize。header からフィールドを引いて (\`parent_hash\`、\`number\`)、cache した hash を使う。

**なぜ 1 つの大きな変換関数ではなく 3 つに分けるのか?** 各々が 1 つのことをするから。\`to_b256\` と \`from_b256\` は pure な型変換 (ロジックなし)。\`to_executed_block\` は \`Header\` のどのフィールドが \`ExecutedBlock\` のどのフィールドに mapping するかを知っている。分けることで各ヘルパーが明らかに正しい形になる。

> 🛑 **やりがちな勘違い。** 「\`B256\` も \`BlockHash\` も \`[u8; 32]\` を wrap している。\`transmute\` で変換できないか?」 **やめてくれ。** Byte layout は同一だが、型は型システム上は別物 — それが point だ。変換関数が境界の場所を document する。将来 \`BlockHash\` が追加の metadata (例: checksum) を持つようになったら、\`transmute\` はバグになる; \`to_b256\` は更新すべき場所になる。

### Step 7: \`engine\` を crate に組み込む

\`crates/evm/src/lib.rs\` を開く。現状:

\`\`\`rust
//! EVM execution layer — Reth integration.

pub mod in_memory;

pub use in_memory::InMemoryEvmBridge;
\`\`\`

2 行追加:

\`\`\`rust
//! EVM execution layer — Reth integration.

pub mod engine;
pub mod in_memory;

pub use engine::RethEvmBridge;
pub use in_memory::InMemoryEvmBridge;
\`\`\`

\`pub mod engine;\` で module を expose。\`pub use engine::RethEvmBridge;\` で型を crate root に re-export。

### Step 8: コンパイル確認

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

pass するはず。エラーが出た場合:

- **\`use of undeclared crate or module 'alloy_consensus'\`** — \`[dependencies]\` に \`alloy-consensus = { workspace = true }\` が抜けている。Step 1 を再確認。
- **\`cannot find type 'B256' in this scope\`** — import block の \`use alloy_primitives::B256;\` が抜けている。
- **\`method 'hash_slow' not found on Header\`** — alloy version の mismatch (古い alloy になっている可能性)。\`cargo update\` で workspace pin を refresh。

### Step 9: Unit test を追加

\`crates/evm/src/engine.rs\` の末尾に:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    fn attrs() -> PayloadAttrs {
        PayloadAttrs {
            timestamp: 42,
            fee_recipient: [0xaa; 20],
            prev_randao: [0xbb; 32],
        }
    }

    #[tokio::test]
    async fn build_then_ready_returns_alloy_hashed_block() {
        let bridge = RethEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        assert_eq!(block.parent_hash, parent);
        assert_eq!(block.number, 1);
        // Hash is computed by alloy_consensus::Header::hash_slow, not synthesized:
        // it changes if any header field changes.
        let mut alt_attrs = attrs();
        alt_attrs.timestamp += 1;
        let id2 = bridge.build_payload(parent, alt_attrs).await.unwrap();
        let block2 = bridge.payload_ready(id2).await.unwrap();
        assert_ne!(block.hash, block2.hash);
    }

    #[tokio::test]
    async fn commit_advances_head() {
        let bridge = RethEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        bridge.commit(block.hash).await.unwrap();
        let s = bridge.state.lock().unwrap();
        assert_eq!(s.head, Some(to_b256(block.hash)));
    }

    #[tokio::test]
    async fn build_on_committed_parent_increments_number() {
        let bridge = RethEvmBridge::new();
        let genesis = BlockHash([1u8; 32]);
        let id1 = bridge.build_payload(genesis, attrs()).await.unwrap();
        let block1 = bridge.payload_ready(id1).await.unwrap();
        bridge.commit(block1.hash).await.unwrap();

        let id2 = bridge.build_payload(block1.hash, attrs()).await.unwrap();
        let block2 = bridge.payload_ready(id2).await.unwrap();
        assert_eq!(block2.number, 2);
        assert_eq!(block2.parent_hash, block1.hash);
    }

    #[tokio::test]
    async fn commit_unknown_hash_errors() {
        let bridge = RethEvmBridge::new();
        let err = bridge.commit(BlockHash([9u8; 32])).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
}
\`\`\`

各 test が何をカバーするか:

| テスト | 何を証明するか |
| - | - |
| \`build_then_ready_returns_alloy_hashed_block\` | Real hashing — 同じ \`parent\` でも \`timestamp\` を変えると \`hash\` が変わる。L4 が書けなかったテスト (合成 hash は timestamp を区別しなかった)。 |
| \`commit_advances_head\` | Commit 後、head が新ブロック (内部表現で \`B256\`) を指す。 |
| \`build_on_committed_parent_increments_number\` | Number 単調性、L4 と同じ。 |
| \`commit_unknown_hash_errors\` | 未知 hash の commit は \`BridgeError::Rejected\` を返す。 |

**key となる新テストは最初のもの**。\`Header\` の 1 フィールド (\`timestamp\`) を変えて、結果の hash が異なることを assert する。これが hashing が real であることを証明する — alloy が実際に RLP encode + Keccak-256 する。L4 の \`(id, number)\` ベースの合成 hash はこのテストに落ちた (same parent + same number → same synthesized hash regardless of timestamp)。

## テスト

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

期待値:

\`\`\`
running 9 tests
test engine::tests::build_on_committed_parent_increments_number ... ok
test engine::tests::build_then_ready_returns_alloy_hashed_block ... ok
test engine::tests::commit_advances_head ... ok
test engine::tests::commit_unknown_hash_errors ... ok
test in_memory::tests::build_on_committed_parent_increments_number ... ok
test in_memory::tests::build_then_ready_returns_same_block ... ok
test in_memory::tests::commit_advances_head_and_records_block ... ok
test in_memory::tests::commit_unknown_hash_errors ... ok
test in_memory::tests::validate_returns_valid ... ok

test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

L5 の 4 テストが L4 の 5 テストと並んで pass する — **両 impl が同じ trait を満たしている**。L8/L9 で書く同じ \`ConsensusBridge\` consumer コードがどちらに対しても動く。

よくあるエラーと修正:

- **\`Header::hash_slow()\` の return type 違い** — \`let hash: BlockHash = header.hash_slow();\` と書くと落ちる。\`hash_slow()\` は \`B256\` を返す; \`from_b256\` で変換する。
- **\`assert_ne!(block.hash, block2.hash)\` が落ちる** — \`..Default::default()\` まわりの問題かもしれない。\`Header\` を \`..Default::default()\` で終えているか? それが無いと all-zeros + same-timestamp で hash が等しくなる可能性。
- **\`B256::from(attrs.fee_recipient)\` がエラー** — \`fee_recipient\` は \`[u8; 20]\`、\`B256\` は \`[u8; 32]\`。正しい変換は \`Address::from(attrs.fee_recipient)\`。

## 設計を振り返る

このレッスンで encode した本質的な決定が 3 つ:

1. **内部型は alloy-native、trait 型は contract の serialization。** State は \`(B256, Header)\` を保存。Trait は \`ExecutedBlock\` を返す。変換はちょうど trait boundary でだけ起こる (\`to_executed_block\`)。これにより alloy が型を進化させても trait を壊さず — 変換ヘルパーだけが更新される。**production-shape の内部型を contract から decouple することが、L11+ で \`LiveRethEvmBridge\` に同じ trait を再利用させる。**

2. **\`(B256, Header)\` のタプルで、別フィールドではなく。** hash は *ちょうどこの header の hash* だ。別々に保存すると header の変更が cache hash と desync するバグを招く。タプルが両者を bind する。

3. **小さな変換ヘルパー 3 つ、1 つの大きな関数ではなく。** \`to_b256\` と \`from_b256\` は pure な型橋渡し; \`to_executed_block\` がフィールド mapping を知る。分けることで各ヘルパーが明らかに正しく、将来の変更も局所化する。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout c938321
diff -u ~/code/my-openhl/crates/evm/src/engine.rs ./crates/evm/src/engine.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
\`\`\`

doc comment や error message の variation は OK。struct 型、helper signature、4 method impl の logic は近く一致するはず。

リファレンスの \`c938321\` 時点の Cargo.toml には \`reth-ethereum-primitives\` も列挙されている (\`engine.rs\` 内では使われない)。後のレッスンのための forward-declared dep; L5 では省略する。両方とも正しい。

main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ bridge impl が *2 つ* — InMemoryEvmBridge と RethEvmBridge — 同じロジックなのに?**
ロジックは同じだが **型が違う**。\`InMemoryEvmBridge\` は合成型 (高速 unit test 用)。\`RethEvmBridge\` は alloy 型 (alloy interop を validate するテスト用)。後で \`LiveRethEvmBridge\` は alloy 型 AND live Reth provider を使う。Step ごとに production fidelity が上がりつつ、trait surface は安定。

**Q: \`Header\` が ~20 フィールドあるのに、なぜ 4 つしか set しないのか?**
未設定フィールドは \`Default::default()\` で埋まる: \`state_root = B256::ZERO\`、\`gas_limit = 0\`、\`base_fee_per_gas = None\` 等。v0 では EVM が走っていないので real な \`state_root\` は計算できない; zero を受け入れる。Production コード (L11+) はこれらを live Reth provider から計算する。

**Q: alloy の \`hash_slow\` と \`hash_fast\` の違いは?**
\`Header\` に \`hash_fast\` メソッドは無い。命名 convention: 値を再計算するメソッドは "slow"、pre-cache された値を返すメソッドは "fast"。\`Header\` には pre-cache された hash が無いので \`hash_slow\` のみ。alloy の一部の型 (例: \`SealedHeader\`) は hash を持ち、\`.hash()\` を "fast" 版として offer する。

**Q: \`cargo update\` で最新の alloy を取るべき?**
不要 — workspace が alloy を specific バージョンに pin している (\`alloy-primitives = "1.5"\`、\`alloy-consensus = "2.0"\`)。\`cargo update\` は単にそれらが解決可能か verify するだけ; bump はしない。alloy を bump するには: root \`Cargo.toml\` の \`workspace.dependencies\` を編集し、それから \`cargo update\` で lock file を refresh。

## 次のレッスン (L6)

\`ConsensusBridge\` impl を 2 つ書いた — 合成版と real alloy 型版。両方とも consensus 側 test コードから使える (L8 から書き始める)。だがその前に L6 で consensus 側に進む: Malachite の \`Context\` trait — Malachite を使う任意の chain に Malachite が要求する型レベル API surface — を実装する。Associated type 10 個、factory method 4 個。L6 を終えると、自分の chain が「\`Address\` 型は何、\`Height\` 型は何、\`Value\` 型は何」を Malachite に答えられるようになる。これが contract の **もう半分**: L3 が自分の所有する trait だったのに対し、L6 は Malachite が所有する trait。`,
                },
              ],
            },
          },
          {
            title: "CL types",
            sortOrder: 4,
            lessons: {
              create: [
                {
                  title: "レッスン 6 — OpenHlContext と Malachite の 10 sub-type",
                  slug: "openhl-malachite-context-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 50,
                  xpReward: 90,
                  content: `# レッスン 6 — \`OpenHlContext\` と Malachite の 10 sub-type

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

…が **5 テスト** で pass する: validator-set のソート順、決定的な proposer 選択、proposal のフィールド round-trip、vote-type の区別 (prevote vs precommit)、height の算術。Chain が Malachite の \`Context\` trait を満たす状態になる — Malachite がブロック上で consensus を駆動するために必要な型レベル API surface。

**L3 は自分が所有する trait** (\`ConsensusBridge\`、consensus から呼ばれ、execution が実装) だった。**L6 は Malachite が所有する trait** — 自分が impl して Malachite の \`Driver\` から call される。両者を合わせて consensus crate の bidirectional な surface が完成する。

これは **コースで最も長いレッスン** — 8 新規ファイル、~330 行。各ファイルは小さいが数が多い。必要なら 2 回に分ける前提で。

## おさらい

L5 を終えた時点で workspace に両方の \`ConsensusBridge\` impl があるが、consensus crate 自体には L3 の trait しかない。Malachite 統合はまだない:

\`\`\`
crates/consensus/src/lib.rs:
  pub mod bridge;
crates/consensus/Cargo.toml:
  [dependencies]
  openhl-types, async-trait, thiserror, eyre
\`\`\`

ここに Malachite を配線していく。

## 計画

(以下の順で) build する:

1. **Cargo.toml の更新** — Malachite の依存 2 つ (\`-core-types\` (trait 用)、\`-signing-ed25519\` (暗号用))、dev-dep として \`rand 0.8\` (テストでの keypair 生成用)。
2. **\`crates/consensus/src/types/\` ディレクトリ** に \`mod.rs\` (module index) と 7 つの type ファイル:
   - \`address.rs\` — \`OpenHlAddress([u8; 20])\`
   - \`height.rs\` — \`OpenHlHeight(u64)\` 単調増加の算術付き
   - \`value.rs\` — \`OpenHlValue(BlockHash)\` — consensus が合意する対象
   - \`validator.rs\` — \`OpenHlValidator\` + \`OpenHlValidatorSet\` (**canonical なソート順** 付き)
   - \`proposal.rs\` — \`OpenHlProposal\` — ブロック提案メッセージ
   - \`proposal_part.rs\` — \`OpenHlProposalPart\` (unit struct — stream しない)
   - \`vote.rs\` — \`OpenHlVote\` — prevote または precommit
3. **\`crates/consensus/src/context.rs\`** — \`OpenHlContext\` impl、10 の type association + **proposer-election アルゴリズム** を含む 4 つの factory method。
4. **\`crates/consensus/src/lib.rs\`** — \`pub mod types; pub mod context; pub use context::OpenHlContext;\` で配線。
5. **5 つの unit test** を \`context.rs\` 内に。
6. **\`cargo test -p openhl-consensus\` を実行** — 5 つすべて pass。

これらの型の shape が **すべての後続レッスンに伝播する**。L7 (SigningProvider) が \`OpenHlVote\` と \`OpenHlProposal\` に署名。L8 (Codec) がそれらを encode。L9 (run_engine_app) が \`OpenHlContext\` で parameterize された AppMsg を処理。**ここで encode する設計判断は後 8 つのレッスンに伝播する。**

> 🛑 **考えてみよう。** 上の型リストを見る。10 個の型のうち 2 つは特別に注目すべき — load-bearing な決定を encode しているから:
> - \`OpenHlValidatorSet\` の **specific なソート順** — 全 validator が同じソートに合意する必要がある
> - \`OpenHlContext::select_proposer\` の **specific なアルゴリズム**
>
> **なぜこの 2 つが validator 間で一致しなければならないのか?** ヒント: 同じ (height, round) で validator が違う proposer を選んだら chain がどうなるか?

## 手を動かす walk-through

### Step 1: \`crates/consensus/Cargo.toml\` を更新

\`[dependencies]\` に追加:

\`\`\`toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }

informalsystems-malachitebft-core-types      = { workspace = true }
informalsystems-malachitebft-signing-ed25519 = { workspace = true, features = ["rand"] }

[dev-dependencies]
rand = "0.8"
\`\`\`

新しい依存:

- **\`informalsystems-malachitebft-core-types\`** — \`Context\` trait と 10 個の sub-trait (\`Address\`、\`Height\`、\`Value\`、\`Validator\`、\`ValidatorSet\`、\`Proposal\`、\`ProposalPart\`、\`Vote\`、\`Extension\`、\`SigningScheme\`) を定義する。今から impl する API surface。
- **\`informalsystems-malachitebft-signing-ed25519\`** に \`features = ["rand"]\` — Malachite の Ed25519 実装。\`rand\` feature を有効にすると \`PrivateKey::generate(OsRng)\` がテストで使える (そうしないと事前構築の keypair を供給する必要がある)。
- **\`rand 0.8\` (dev-dep)** — test code 内の \`OsRng\` 用。

依存解決を確認:

\`\`\`bash
cargo check -p openhl-consensus
\`\`\`

この更新後の初回 check で Malachite が fetch される — 数分かかる。

### Step 2: \`types/\` ディレクトリと \`mod.rs\` を作成

\`\`\`bash
mkdir crates/consensus/src/types
\`\`\`

\`crates/consensus/src/types/mod.rs\` を作成:

\`\`\`rust
//! Concrete implementations of Malachite's \`Context\` sub-traits.

pub mod address;
pub mod height;
pub mod proposal;
pub mod proposal_part;
pub mod validator;
pub mod value;
pub mod vote;

pub use address::OpenHlAddress;
pub use height::OpenHlHeight;
pub use proposal::OpenHlProposal;
pub use proposal_part::OpenHlProposalPart;
pub use validator::{OpenHlValidator, OpenHlValidatorSet};
pub use value::OpenHlValue;
pub use vote::OpenHlVote;
\`\`\`

module index。\`pub mod X;\` 行がサブモジュール (ファイル \`types/X.rs\`) を宣言。\`pub use\` で主要な型を re-export して、呼び出し側が \`crate::types::OpenHlAddress\` (not \`crate::types::address::OpenHlAddress\`) と書ける。

**なぜ 1 つの大きな \`types.rs\` ではなく型 1 つにつき 1 ファイル?** 各型の impl は短い (10-40 行) だが、設計判断は型ごとに distinct だ。型ごとにファイルを分けると、レッスン (本レッスン) が 1 型ずつ walk でき、code review も 1 型の変更に集中できる (関連しないコードをスクロールする必要なし)。

### Step 3: 3 つの「シンプル」型を書く — \`address.rs\`、\`height.rs\`、\`value.rs\`

各 ~20 行。順に walk する。

**\`crates/consensus/src/types/address.rs\`:**

\`\`\`rust
use core::fmt;

use informalsystems_malachitebft_core_types::Address;

/// A 20-byte validator address, Ethereum convention.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlAddress(pub [u8; 20]);

impl fmt::Display for OpenHlAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("0x")?;
        for b in &self.0 {
            write!(f, "{b:02x}")?;
        }
        Ok(())
    }
}

impl Address for OpenHlAddress {}
\`\`\`

パターンに注目: \`[u8; 20]\` の newtype、標準的な derive 一通り、ログ用の hex Display、それから **空の \`impl Address\`**。\`Address\` trait はメソッドを持たない — 必要な derive を *要求する* だけ。我々が \`Clone + Copy + Debug + Display + PartialEq + Eq + PartialOrd + Ord + Hash\` を満たすことで impl が成立する。

**\`crates/consensus/src/types/height.rs\`:**

\`\`\`rust
use core::fmt;

use informalsystems_malachitebft_core_types::Height;

/// Block height — a monotonic u64 counter.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlHeight(pub u64);

impl fmt::Display for OpenHlHeight {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Height for OpenHlHeight {
    const ZERO: Self = OpenHlHeight(0);
    const INITIAL: Self = OpenHlHeight(1);

    fn increment_by(&self, n: u64) -> Self {
        OpenHlHeight(self.0.saturating_add(n))
    }

    fn decrement_by(&self, n: u64) -> Option<Self> {
        self.0.checked_sub(n).map(OpenHlHeight)
    }

    fn as_u64(&self) -> u64 {
        self.0
    }
}
\`\`\`

定数 3 つ + メソッド 3 つ。\`ZERO\` は絶対的なゼロ; \`INITIAL\` は最初の有効な block height (1、0 ではない — genesis は block 0 だが consensus が "produce" するものではないので、consensus round は 1 から始まる)。\`increment_by\` は overflow panic を避けるため \`saturating_add\` を使う。\`decrement_by\` は 0 を下回ることが invalid なので \`Option\` を返す; \`checked_sub\` は panic ではなく \`None\` を返す。

**\`crates/consensus/src/types/value.rs\`:**

\`\`\`rust
use informalsystems_malachitebft_core_types::Value;
use openhl_types::BlockHash;

/// The value consensus agrees on: an EVM block, identified by its block hash.
///
/// For v0 we store only the hash since the EVM bridge is the source of truth
/// for block contents. Module 2 will extend this to carry the full block once
/// the CLOB starts producing fills that need to be ordered alongside EVM txs.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlValue(pub BlockHash);

impl Value for OpenHlValue {
    type Id = BlockHash;

    fn id(&self) -> Self::Id {
        self.0
    }
}
\`\`\`

\`OpenHlValue\` は \`BlockHash\` (L2 から) をラップ。\`Value::Id\` associated type は vote に乗るもの — consensus は full value に投票せず、value の *identifier* (hash) に投票する。ここでは \`Id = BlockHash\` なので、value と ID が同じデータになっている。

> 🛑 **やりがちな勘違い。** 「\`Value\` を直接 \`BlockHash\` にすればいいのでは — なぜラップ?」 **\`Value\` trait に独自の bound があるから**。Specifically \`Value: Clone + Debug + Eq + Ord + Send + Sync\` + \`Value::Id\` associated type の bound。\`OpenHlValue\` をラッパーにすることで、\`BlockHash\` を変えずに「value とは何か」を独立に進化させられる。Module 2 (CLOB) で \`BlockHash\` に無いフィールド (例: off-EVM fills のリスト) を足す可能性が高い。

3 つ書いたら \`cargo check -p openhl-consensus\` を走らせる。pass するはず。

### Step 4: \`validator.rs\` を書く — canonical なソート順

最も長い type ファイル。~75 行。

\`\`\`rust
use informalsystems_malachitebft_core_types::{Validator, ValidatorSet, VotingPower};
use informalsystems_malachitebft_signing_ed25519::PublicKey;

use crate::context::OpenHlContext;
use crate::types::OpenHlAddress;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlValidator {
    pub address: OpenHlAddress,
    pub public_key: PublicKey,
    pub voting_power: VotingPower,
}

impl OpenHlValidator {
    #[must_use]
    pub const fn new(address: OpenHlAddress, public_key: PublicKey, voting_power: VotingPower) -> Self {
        Self { address, public_key, voting_power }
    }
}

impl Validator<OpenHlContext> for OpenHlValidator {
    fn address(&self) -> &OpenHlAddress {
        &self.address
    }

    fn public_key(&self) -> &PublicKey {
        &self.public_key
    }

    fn voting_power(&self) -> VotingPower {
        self.voting_power
    }
}

/// A validator set, kept sorted by (\`voting_power\` desc, address asc).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlValidatorSet(Vec<OpenHlValidator>);

impl OpenHlValidatorSet {
    /// Construct a validator set and enforce the canonical sort order.
    #[must_use]
    pub fn new(mut validators: Vec<OpenHlValidator>) -> Self {
        validators.sort_by(|a, b| {
            b.voting_power
                .cmp(&a.voting_power)
                .then_with(|| a.address.cmp(&b.address))
        });
        Self(validators)
    }

    #[must_use]
    pub fn validators(&self) -> &[OpenHlValidator] {
        &self.0
    }
}

impl ValidatorSet<OpenHlContext> for OpenHlValidatorSet {
    fn count(&self) -> usize {
        self.0.len()
    }

    fn total_voting_power(&self) -> VotingPower {
        self.0.iter().map(|v| v.voting_power).sum()
    }

    fn get_by_address(&self, address: &OpenHlAddress) -> Option<&OpenHlValidator> {
        self.0.iter().find(|v| &v.address == address)
    }

    fn get_by_index(&self, index: usize) -> Option<&OpenHlValidator> {
        self.0.get(index)
    }
}
\`\`\`

**このレッスンで最も load-bearing なファイル。**

\`OpenHlValidator\` は素直: address + public_key + voting_power、\`Validator\` trait の 3 accessor で expose。興味深い仕事は \`OpenHlValidatorSet::new\` にある:

\`\`\`rust
validators.sort_by(|a, b| {
    b.voting_power.cmp(&a.voting_power)         // 主: power 降順
        .then_with(|| a.address.cmp(&b.address)) // tiebreak: address 昇順
});
\`\`\`

これが **canonical な CometBFT validator-set ソート順**: voting power 降順、tiebreaker は address 昇順。**全 validator がこの同じソートを同じ入力 set に適用する必要がある**。なぜか?

\`OpenHlContext::select_proposer\` (Step 6 で書く) が \`validator_set.get_by_index((height + round) % count)\` するから。Validator A がある順にソートし、validator B が違う順にソートすると、同じ \`(height, round)\` に対して別の proposer を選ぶ。**最初の round で chain が fork する。** ソート順 *が* proposer-election protocol だ。

他の BFT chain (CometBFT、すべての Cosmos chain) も全く同じソートを使う。convention に従うのは便利のためだけでなく — chain を BFT canon と同じ入力 set に対して *同一に挙動* させるためだ。

> 🛑 **やりがちな勘違い。** 「power 降順 + address 昇順、なぜ両方昇順ではダメ?」 **stake が高い validator は proportionally に多く propose すべきだから** — \`(height + round) % count\` は index 全体で uniform なので、power が高い validator が低い index に来て多く proposer-elect されるのはソートの性質だ。Tiebreaker (address 昇順) は安定 deterministic な選択; 任意の total ordering でよいが、CometBFT が address 昇順を選んだので合わせる。

### Step 5: メッセージ型を書く — \`proposal.rs\`、\`proposal_part.rs\`、\`vote.rs\`

3 ファイル、各々 1 つのメッセージ型 trait を impl する。

**\`crates/consensus/src/types/proposal.rs\`:**

\`\`\`rust
use informalsystems_malachitebft_core_types::{Proposal, Round};

use crate::context::OpenHlContext;
use crate::types::{OpenHlAddress, OpenHlHeight, OpenHlValue};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlProposal {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value: OpenHlValue,
    pub pol_round: Round,
    pub address: OpenHlAddress,
}

impl Proposal<OpenHlContext> for OpenHlProposal {
    fn height(&self) -> OpenHlHeight {
        self.height
    }

    fn round(&self) -> Round {
        self.round
    }

    fn value(&self) -> &OpenHlValue {
        &self.value
    }

    fn take_value(self) -> OpenHlValue {
        self.value
    }

    fn pol_round(&self) -> Round {
        self.pol_round
    }

    fn validator_address(&self) -> &OpenHlAddress {
        &self.address
    }
}
\`\`\`

\`OpenHlProposal\` は型付きメッセージ: 「validator X が (height, round) で proof-of-lock-on-round Z で value Y を propose する」。\`Proposal\` trait は 6 個のアクセサで、\`self\` のフィールドを読むだけで満たす。

\`pol_round\` (Proof of Lock Round) は Tendermint の概念: round Z でこの value に lock したからこの value を propose する場合、それが \`pol_round\`。初回の proposal では \`Round::Nil\`。

**\`crates/consensus/src/types/proposal_part.rs\`:**

\`\`\`rust
use informalsystems_malachitebft_core_types::ProposalPart;

use crate::context::OpenHlContext;

/// Unit proposal part — \`OpenHL\` runs in \`ValuePayload::ProposalOnly\` mode, so
/// the entire value ships in the \`Proposal\` message and parts are unused.
/// The type is required by the \`Context\` trait surface anyway.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OpenHlProposalPart;

impl ProposalPart<OpenHlContext> for OpenHlProposalPart {
    fn is_first(&self) -> bool {
        true
    }

    fn is_last(&self) -> bool {
        true
    }
}
\`\`\`

unit struct — 最小の型。**なぜ?** Malachite には大きな value を propose するモードが 2 つある:

- **\`ValuePayload::ProposalOnly\`** (我々が使う) — value 全体が \`Proposal\` メッセージに乗る
- **\`ValuePayload::ProposalAndParts\`** — proposal が part を参照、part が別個に送られる

ProposalOnly を使う理由: \`OpenHlValue\` がただの \`BlockHash\` (32 byte) だから。Streaming 不要。だが \`Context\` trait はそれでも \`ProposalPart\` 型の関連付けを要求する — 我々は実体化しない unit struct で満たす。\`is_first\` と \`is_last\` を両方 \`true\` にして、もし check するコードが走っても一貫した結果を返す。

**\`crates/consensus/src/types/vote.rs\`:**

\`\`\`rust
use informalsystems_malachitebft_core_types::{
    NilOrVal, Round, SignedExtension, VoteType, Vote as VoteTrait,
};
use openhl_types::BlockHash;

use crate::context::OpenHlContext;
use crate::types::{OpenHlAddress, OpenHlHeight};

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct OpenHlVote {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value_id: NilOrVal<BlockHash>,
    pub vote_type: VoteType,
    pub address: OpenHlAddress,
}

impl VoteTrait<OpenHlContext> for OpenHlVote {
    fn height(&self) -> OpenHlHeight {
        self.height
    }

    fn round(&self) -> Round {
        self.round
    }

    fn value(&self) -> &NilOrVal<BlockHash> {
        &self.value_id
    }

    fn take_value(self) -> NilOrVal<BlockHash> {
        self.value_id
    }

    fn vote_type(&self) -> VoteType {
        self.vote_type
    }

    fn validator_address(&self) -> &OpenHlAddress {
        &self.address
    }

    fn extension(&self) -> Option<&SignedExtension<OpenHlContext>> {
        None
    }

    fn take_extension(&mut self) -> Option<SignedExtension<OpenHlContext>> {
        None
    }

    fn extend(self, _extension: SignedExtension<OpenHlContext>) -> Self {
        self
    }
}
\`\`\`

\`OpenHlVote\` は **prevote** と **precommit** の両方を表すメッセージ型。\`vote_type\` フィールドがどちらかを区別する; それ以外は構造同一。フィールドセットも同じ: validator address、投票対象の height と round、value (または "この round の任意の value に反対" を意味する \`Nil\`)。

3 つの extension メソッドは \`None\` / no-op。**Vote extensions** は Malachite の機能: validator が precommit に extra data (例: light-client state) を attach できる。v0 では使わない — Context impl で \`Extension = ()\` (Step 6)、このメソッドは stub。

**なぜ \`Option<BlockHash>\` ではなく \`NilOrVal<BlockHash>\`?** どちらも本質的に「value があるかもしれない」を表す。だが \`NilOrVal\` は Malachite の BFT 固有概念: \`Nil\` は「この round の任意の value に反対する」を意味する (「意見が無い」とは異なる)。\`Option\` だとそのニュアンスを失う。

### Step 6: \`context.rs\` を書く — 結束

このファイルが 10 個の型を \`Context\` impl に結びつける。最も長いファイル (テスト含めて ~185 行)。区切って見る。

\`crates/consensus/src/context.rs\` の冒頭:

\`\`\`rust
//! \`OpenHlContext\` — the central abstraction Malachite uses to know about our chain.
//!
//! Once this trait is implemented, the entire \`malachitebft-core-consensus\` and
//! \`malachitebft-engine\` machinery can drive consensus over our types.

use informalsystems_malachitebft_core_types::{
    Context, NilOrVal, Round, ValidatorSet as _, ValueId, VoteType,
};
use informalsystems_malachitebft_signing_ed25519::Ed25519;

use crate::types::{
    OpenHlAddress, OpenHlHeight, OpenHlProposal, OpenHlProposalPart, OpenHlValidator,
    OpenHlValidatorSet, OpenHlValue, OpenHlVote,
};

#[derive(Clone, Debug, Default)]
pub struct OpenHlContext;
\`\`\`

\`OpenHlContext\` は **unit struct** — フィールドなし。state を持たず、型の関連付けを保持するだけのマーカーだ。多くの BFT chain の Context 型も stateless。

続いて \`impl Context for OpenHlContext\`。10 個の型関連付け:

\`\`\`rust
impl Context for OpenHlContext {
    type Address = OpenHlAddress;
    type Height = OpenHlHeight;
    type ProposalPart = OpenHlProposalPart;
    type Proposal = OpenHlProposal;
    type Validator = OpenHlValidator;
    type ValidatorSet = OpenHlValidatorSet;
    type Value = OpenHlValue;
    type Vote = OpenHlVote;
    type Extension = ();
    type SigningScheme = Ed25519;
    // ...続く
\`\`\`

10 個の型 binding — \`Context\` の sub-trait 1 つにつき 1 つ。今書いた 8 つ + 以下:

- **\`Extension = ()\`** — vote extension 無し。unit 型が trait の bound を満たし、real な extension 型を書く必要がない。
- **\`SigningScheme = Ed25519\`** — Malachite の Ed25519 実装を直接使う。多くの BFT chain は Ed25519、BLS (署名集約のため) を使う chain もある。Malachite が実装を ship していて簡潔なので Ed25519 を選ぶ。

それから 4 つの factory method。**\`select_proposer\`** が最重要:

\`\`\`rust
    fn select_proposer<'a>(
        &self,
        validator_set: &'a Self::ValidatorSet,
        height: Self::Height,
        round: Round,
    ) -> &'a Self::Validator {
        let count = validator_set.count();
        assert!(count > 0, "validator set is empty");
        let round_u64 = u64::try_from(round.as_i64().max(0)).unwrap_or(0);
        let index_u64 = height.0.wrapping_add(round_u64);
        let index = usize::try_from(index_u64).unwrap_or(usize::MAX) % count;
        validator_set
            .get_by_index(index)
            .expect("index < count by construction")
    }
\`\`\`

proposer-election アルゴリズム。**\`(height + round) % count\`** がソート済み validator set の index を選ぶ。理由:

1. Validator set は \`OpenHlValidatorSet::new\` (Step 4) で canonical にソート済み、全 validator が同じ indexing を持つ。
2. 同じ \`(height, round)\` を与えれば、全 validator が同じ \`index\` を計算する。
3. したがって全 validator が同じ proposer を選ぶ。

算術が注意深い: \`u64\` での \`wrapping_add\` が overflow を回避; \`% count\` で valid な index になる。\`.expect\` は証明可能: \`... % count\` で計算したから \`index < count\` が成り立つ。

続いて \`new_proposal\`、\`new_prevote\`、\`new_precommit\` — 型付きメッセージを構築する 3 つの factory method:

\`\`\`rust
    fn new_proposal(
        &self,
        height: Self::Height,
        round: Round,
        value: Self::Value,
        pol_round: Round,
        address: Self::Address,
    ) -> Self::Proposal {
        OpenHlProposal { height, round, value, pol_round, address }
    }

    fn new_prevote(
        &self,
        height: Self::Height,
        round: Round,
        value_id: NilOrVal<ValueId<Self>>,
        address: Self::Address,
    ) -> Self::Vote {
        OpenHlVote {
            height,
            round,
            value_id,
            vote_type: VoteType::Prevote,
            address,
        }
    }

    fn new_precommit(
        &self,
        height: Self::Height,
        round: Round,
        value_id: NilOrVal<ValueId<Self>>,
        address: Self::Address,
    ) -> Self::Vote {
        OpenHlVote {
            height,
            round,
            value_id,
            vote_type: VoteType::Precommit,
            address,
        }
    }
}
\`\`\`

これらは短い、全部フィールド代入だから。興味深いのは \`new_prevote\` と \`new_precommit\` が同じ struct (\`OpenHlVote\`) を作るが \`vote_type\` 値が違うこと — 型システムが construction の時点で区別を強制する。

### Step 7: \`lib.rs\` に配線

\`crates/consensus/src/lib.rs\` を開く。現状:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
\`\`\`

次に変更:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

\`pub mod\` 宣言で module を expose。\`pub use context::OpenHlContext;\` で中央型を re-export し、downstream crate は \`use openhl_consensus::OpenHlContext;\` と書ける (\`use openhl_consensus::context::OpenHlContext;\` よりきれい)。

### Step 8: 5 つの unit test を追加

\`crates/consensus/src/context.rs\` の末尾に:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use informalsystems_malachitebft_core_types::{
        Height as HeightTrait, Proposal as ProposalTrait, Validator, ValidatorSet,
        Vote as VoteTrait,
    };
    use informalsystems_malachitebft_signing_ed25519::PrivateKey;
    use openhl_types::BlockHash;
    use rand::rngs::OsRng;

    fn validator(addr_byte: u8, power: u64) -> OpenHlValidator {
        let private = PrivateKey::generate(OsRng);
        let public = private.public_key();
        OpenHlValidator::new(OpenHlAddress([addr_byte; 20]), public, power)
    }

    #[test]
    fn validator_set_is_sorted_by_power_then_address() {
        let set = OpenHlValidatorSet::new(vec![
            validator(0x01, 100),
            validator(0x02, 300),
            validator(0x03, 200),
        ]);
        let powers: Vec<u64> = set
            .validators()
            .iter()
            .map(Validator::voting_power)
            .collect();
        assert_eq!(powers, vec![300, 200, 100]);
        assert_eq!(set.total_voting_power(), 600);
        assert_eq!(set.count(), 3);
    }

    #[test]
    fn select_proposer_round_robins_deterministically() {
        let ctx = OpenHlContext;
        let set = OpenHlValidatorSet::new(vec![
            validator(0x01, 100),
            validator(0x02, 100),
            validator(0x03, 100),
        ]);
        let h = OpenHlHeight(7);
        let p1 = ctx.select_proposer(&set, h, Round::new(0)).address;
        let p2 = ctx.select_proposer(&set, h, Round::new(0)).address;
        assert_eq!(p1, p2);

        let p3 = ctx.select_proposer(&set, h.increment(), Round::new(0)).address;
        assert_ne!(p1, p3);
    }

    #[test]
    fn new_proposal_round_trips_fields() {
        let ctx = OpenHlContext;
        let addr = OpenHlAddress([0xaa; 20]);
        let value = OpenHlValue(BlockHash([0xbb; 32]));
        let proposal = ctx.new_proposal(
            OpenHlHeight(5),
            Round::new(1),
            value,
            Round::Nil,
            addr,
        );
        assert_eq!(ProposalTrait::height(&proposal), OpenHlHeight(5));
        assert_eq!(*ProposalTrait::value(&proposal), value);
        assert_eq!(*ProposalTrait::validator_address(&proposal), addr);
    }

    #[test]
    fn new_prevote_and_precommit_have_distinct_types() {
        let ctx = OpenHlContext;
        let addr = OpenHlAddress([0xaa; 20]);
        let vid: NilOrVal<BlockHash> = NilOrVal::Val(BlockHash([0xbb; 32]));
        let prevote = ctx.new_prevote(OpenHlHeight(5), Round::new(0), vid, addr);
        let precommit = ctx.new_precommit(OpenHlHeight(5), Round::new(0), vid, addr);
        assert_eq!(VoteTrait::vote_type(&prevote), VoteType::Prevote);
        assert_eq!(VoteTrait::vote_type(&precommit), VoteType::Precommit);
    }

    #[test]
    fn height_increment_and_decrement() {
        let h = OpenHlHeight::INITIAL;
        assert_eq!(h.as_u64(), 1);
        assert_eq!(h.increment().as_u64(), 2);
        assert_eq!(OpenHlHeight::ZERO.decrement(), None);
        assert_eq!(OpenHlHeight(5).decrement().unwrap().as_u64(), 4);
    }
}
\`\`\`

5 つのテスト:

1. **\`validator_set_is_sorted_by_power_then_address\`** — Power がシャッフルされた 3-validator set (100, 300, 200) を作り、出力が [300, 200, 100] であることを verify。Step 4 の canonical なソート順が動くことを証明。
2. **\`select_proposer_round_robins_deterministically\`** — 同じ height + round → 同じ proposer (determinism)。違う height → 違う proposer (rotation)。
3. **\`new_proposal_round_trips_fields\`** — \`new_proposal\` で構築、\`Proposal\` trait メソッドで読み返す。factory ↔ accessor のペアを verify。
4. **\`new_prevote_and_precommit_have_distinct_types\`** — 同じ引数、だが \`new_prevote\` は \`VoteType::Prevote\`、\`new_precommit\` は \`VoteType::Precommit\` を produce。factory が仕事をすることを証明。
5. **\`height_increment_and_decrement\`** — \`INITIAL.increment() == 2\`、\`ZERO.decrement() == None\`、\`5.decrement() == Some(4)\`。算術メソッドを verify。

Note: \`h.increment()\` (not \`h.increment_by(1)\`) — \`increment\` は \`Height\` trait のデフォルトメソッドで \`increment_by(1)\` を呼ぶ。\`decrement\` も同様。

## テスト

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

期待値:

\`\`\`
running 5 tests
test context::tests::height_increment_and_decrement ... ok
test context::tests::new_prevote_and_precommit_have_distinct_types ... ok
test context::tests::new_proposal_round_trips_fields ... ok
test context::tests::select_proposer_round_robins_deterministically ... ok
test context::tests::validator_set_is_sorted_by_power_then_address ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

よくあるエラーと修正:

- **\`cannot find trait 'Address' in scope\`** — \`address.rs\` に \`use informalsystems_malachitebft_core_types::Address;\` が抜けている。
- **\`expected struct 'OpenHlContext', found ...\`** — 型ファイルに \`crate::context::OpenHlContext\` を import しているが、\`context.rs\` がまだ存在しない。\`context.rs\` を先に書くか、型ファイルを \`crate::OpenHlContext\` (placeholder) で書いて後で \`context.rs\` を埋める。
- **\`method 'increment' not found\`** — Malachite の \`Height\` trait は \`increment()\` をデフォルトメソッド (\`increment_by(1)\` を呼ぶ) として提供する。\`increment_by\` を impl していることを確認 (\`increment\` ではなく)。
- **\`first_validator_set sort produces a different order\`** — sort comparator は \`b.voting_power.cmp(&a.voting_power)\` (note: \`b\` が先で降順)、\`a.voting_power.cmp(&b.voting_power)\` ではない。

## 設計を振り返る

このレッスンで encode した本質的な決定が 3 つ:

1. **Context sub-type 1 つにつき 1 ファイル。** 大きな \`context.rs\` に 10 個の型をインラインで定義することもできた。分けることで、(本レッスンや、後で個別の型を引用するレッスンの) walk-through が focused になる。代わりに 1 ファイルで済むものが 8 ファイルになる。分割を選んだ理由: **trait surface が独立に load-bearing** だから — \`Validator\` の決定は \`Vote\` の決定と違うし、code review は変更が localized されているほうが容易。

2. **\`OpenHlValidatorSet\` が \`new()\` でソートする、別 \`sort()\` メソッドではなく。** unsorted な set を construct できない、ということを意味する。型システムが「この set は常にソートされている」を encode する — unsorted な set を produce する API path が存在しない。これが伝播する: set の全メソッドがソート済み順序を仮定し、それが今や compiler が enforce する不変量になる。

3. **\`select_proposer = (height + round) % count\`** — 最も単純なアルゴリズム。Malachite はもっと洗練された proposer selection (stake で weighted、同一 validator が連続しない rotation 等) をサポートする。最も単純なのを選ぶ理由:
   - 決定的
   - 全 validator が verify 可能
   - 「公平な stake-weighted rotation」の複雑さは \`OpenHlValidatorSet::new\` のソートに住み、\`select_proposer\` 自体には住まない
   - Stake が高い validator が低 index に来て modulo で自然に多く proposer に選ばれる
   
   これは CometBFT と同じアプローチ。洗練された rotation (例: random beacon ベースの proposer selection) が必要なら、このメソッド body が変わる — だが trait surface は変わらない。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 784785b
diff -ur ~/code/my-openhl/crates/consensus/src/types ./crates/consensus/src/types
diff -u ~/code/my-openhl/crates/consensus/src/context.rs ./crates/consensus/src/context.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

Doc comment やテスト順序の variation は OK。各型の shape、\`OpenHlValidatorSet::new\` の sort comparator、\`select_proposer\` body は近く一致するはず。

main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: validator set のソートが (100, 200, 300) になり、(300, 200, 100) にならない。何が間違いか?**
\`a.voting_power.cmp(&b.voting_power)\` (昇順) と書いた。正しい comparator は \`b.voting_power.cmp(&a.voting_power)\` (降順) — \`b.cmp(&a)\` であって \`a.cmp(&b)\` ではない。Stake が高い validator が *早い* index (低い index) にソートされるべき。

**Q: \`select_proposer\` が "validator set is empty." で panic する。なぜ?**
テストが空の \`OpenHlValidatorSet\` を作った。Real chain は最低 1 validator (single-validator devnet) か 4+ (multi-validator with byzantine tolerance) を持つ。assert が malformed config ケースを modulo-by-zero になる前に catch する。Unit test で出るなら test setup が間違い; production で出るなら config loader が間違い。

**Q: \`OpenHlContext\` に state (例: chain config) を持たせられるか?**
Yes — \`pub struct OpenHlContext;\` を \`pub struct OpenHlContext { chain_id: u64 }\` などに変える。Context trait は state を禁止しない。だが多くの BFT chain の Context 型は stateless 、context の仕事は *型を関連付ける* ことであって *runtime config を保持する* ことではないから。Runtime config は \`OpenHlConfig\` (L8 で扱う) に住む。

**Q: なぜ \`Extension\` が \`()\` でメソッドが \`None\` にスタブ化されているか?**
openhl v0 が vote extension を使わないから。Production BFT chain は precommit に light-client snapshot 等を attach するために使う。実装は: 何のデータを attach するか選ぶ、それをどう serialize するか、もう一方の端でどう verify するか、を決める必要がある。具体的なユースケースが出るまで意図的に scope 外。

## 次のレッスン (L7)

10 個の Context sub-type と 4 つの factory method が揃った。Malachite が chain の address、height、value、validator、message を知っている状態だ。だが **まだ何も署名されていない**。L7 で \`OpenHlSigningProvider\` — \`OpenHlVote\` と \`OpenHlProposal\` メッセージに対して Ed25519 署名を produce する trait — を impl する。これが Context surface の **もう半分** だ — Context が「これが私の型」と言い、SigningProvider が「これがそれらに署名する方法」と言う。`,
                },
                {
                  title: "レッスン 7 — OpenHlSigningProvider と canonical encoding",
                  slug: "openhl-signing-provider-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン 7 — \`OpenHlSigningProvider\` と canonical encoding

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

…が **14 個のテストすべてに合格する** (L6 の Context impl から 5 個 + 署名と SigningProvider の新規 9 個)。Malachite が Ed25519 署名を chain に組み込むのに必要な 2 つのファイルが揃う:

- **\`crates/consensus/src/signing.rs\`** — vote と proposal の canonical byte encoding、および低レベルの sign/verify 関数
- **\`crates/consensus/src/signing_provider.rs\`** — validator の private key を保持し、Malachite の \`SigningProvider<OpenHlContext>\` trait を実装する \`OpenHlSigningProvider\` 構造体

9 個の新規テストがカバーするもの: 4 種類すべての署名対象型 (vote, proposal, proposal_part, vote_extension) について sign/verify ラウンドトリップ、vote と proposal の改ざん検出、別 provider 間の署名検証拒否。

## おさらい

L6 完了時点で \`openhl-consensus\` crate には以下がある:

\`\`\`
crates/consensus/src/lib.rs   — pub mod bridge, context, types
crates/consensus/src/types/   — 7 個の型ファイル + mod.rs
crates/consensus/src/context.rs — OpenHlContext + Context impl + テスト 5 個
\`\`\`

\`cargo test -p openhl-consensus\` でテスト 5 個が合格する。**署名はまだ一切存在しない** — vote と proposal は構築できるが、コードベース内のどこにもそれらに対して署名を生成・検証する処理がない。

## 計画

5 つやる:

1. **\`crates/consensus/src/signing.rs\` を作成** — \`OpenHlVote\` と \`OpenHlProposal\` の canonical byte encoding 関数、低レベルの \`sign_vote\` / \`sign_proposal\` / \`verify_vote\` 関数、\`VerifierLike\` trait shim、ユニットテスト 2 個。
2. **\`crates/consensus/src/signing_provider.rs\` を作成** — \`PrivateKey\` を保持する \`OpenHlSigningProvider\` 構造体、8 メソッドの \`impl SigningProvider<OpenHlContext>\` (4 つの sign/verify ペア)、ユニットテスト 7 個。
3. **両モジュールを \`lib.rs\` に配線** — \`pub mod signing; pub mod signing_provider;\` を追加。
4. **Cargo.toml の変更なし** — \`informalsystems-malachitebft-signing-ed25519\` は L6 で \`rand\` feature 付きで追加済み、追加要件なし。
5. **実行** — \`cargo test -p openhl-consensus\` で 14 個全部合格。

このレッスンが教えるのは **2 つのパターン**:

- **Canonical encoding** — 型付きメッセージを、すべての validator が同一に計算する確定的なバイト列に変換する。署名は **構造体** ではなく **バイト列** にコミットする。フィールドの encoding が変わると署名が検証できなくなる。
- **Trait 同士の配線** — Malachite の \`SigningProvider\` は、\`signing.rs\` の低レベル署名ロジックを **ラップする** trait。Provider は実行時状態 (鍵) を持ち、状態を持たない純粋関数に処理を委譲する。これは \`ConsensusBridge\` (trait) vs \`InMemoryEvmBridge\` (それを impl する構造体) と同じ分離パターン。

> 🛑 **考えてみよう。** スクロールする前に: \`Vote\` の canonical encoding は、どのフィールドを含む必要があるか? ヒント: 署名が何にコミットしているかを考える。コンセンサスにとって意味のある違いがある 2 つの vote について、その signing bytes が異なっていなければ、片方に対する有効な署名が、もう片方に対しても検証できてしまう。攻撃者は vote を replay または swap できる。

## 手順

### Step 1: \`crates/consensus/src/signing.rs\` を作成

モジュール docstring と import から:

\`\`\`rust
//! Canonical encoding + signing for proposals and votes.
//!
//! v0 uses a simple length-prefixed concatenation rather than Protobuf/SSZ.
//! Real production validators will want a stable serialization format
//! (Module 2's \`openhl-codec\` crate is the natural home for that).

use informalsystems_malachitebft_core_types::{NilOrVal, Round, SignedMessage, VoteType};
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, Signature};

use crate::types::{OpenHlProposal, OpenHlVote};
\`\`\`

各 import の用途:
- \`NilOrVal, Round, VoteType\` — \`OpenHlVote\` / \`OpenHlProposal\` 内に現れる Malachite の型
- \`SignedMessage\` — メッセージと署名をペアにする Malachite の wrapper
- \`PrivateKey, Signature\` — Malachite の Ed25519 鍵と署名の型
- 自前の \`OpenHlProposal, OpenHlVote\` — encoding 対象のメッセージ型

### Step 2: \`OpenHlVote\` の canonical encoding を書く

これが load-bearing な関数。次に追加:

\`\`\`rust
/// Canonical bytes that a vote signature commits to.
#[must_use]
pub fn vote_signing_bytes(v: &OpenHlVote) -> Vec<u8> {
    let mut buf = Vec::with_capacity(128);
    buf.extend_from_slice(&v.height.0.to_le_bytes());
    buf.extend_from_slice(&round_to_i64(v.round).to_le_bytes());
    buf.push(match v.vote_type {
        VoteType::Prevote => 0,
        VoteType::Precommit => 1,
    });
    match v.value_id {
        NilOrVal::Nil => buf.push(0),
        NilOrVal::Val(h) => {
            buf.push(1);
            buf.extend_from_slice(&h.0);
        }
    }
    buf.extend_from_slice(&v.address.0);
    buf
}
\`\`\`

この関数は \`OpenHlVote\` をバイト列に変換する。**署名はこのバイト列にコミットする。** 悪意ある actor が \`Vote\` のどのフィールドを変えても、signing bytes が変わり、署名検証が失敗し、改ざんされた vote はすべての validator に拒否される。

バイトレイアウトを確認:

| バイト | フィールド | エンコード |
| - | - | - |
| 0..8 | \`height\` | u64 little-endian |
| 8..16 | \`round\` | i64 little-endian (round は "round 無し" を表す -1 もありうる) |
| 16 | \`vote_type\` | 0 = Prevote, 1 = Precommit |
| 17 | \`value_id\` tag | 0 = Nil, 1 = Val |
| 18..50 (Val の場合) | \`value_id\` 本体 | BlockHash の 32 バイト |
| 18..38 OR 50..70 | \`address\` | 20 バイト |

**なぜ little-endian?** x86 / ARM ホストでの慣習。**なぜ tag バイトを付ける?** \`NilOrVal::Nil\` は 1 バイト (tag 0) なのに対し、\`NilOrVal::Val\` は 33 バイト (tag 1 + 32 バイトのハッシュ) になる。Tag があるからパーサがどちらか判別できる。**なぜ validator address を含める?** Vote は **どの** vote かだけでなく **誰の** vote かも問う。同じ proposal に対して 100 人の validator が vote すれば、それぞれ別の signing-bytes 文字列が生成される。

> 🛑 **やりがちな勘違い。** 「\`bincode::serialize(v)\` で結果に署名するだけじゃダメ?」 **ダメ。** 既製のシリアライゼーション形式はライブラリのバージョンが上がると変わりうる — 今日署名するものと明日署名するものが、struct は同一でも違ってしまう可能性がある。**Canonical** encoding は自分が 1 バイト単位でコントロールするもの。本番 chain は encoding を protobuf スキーマで定義するか、ここのように手書きで定義する。どちらにせよ、encoding は chain の wire format spec の一部になる。

### Step 3: \`OpenHlProposal\` の canonical encoding を書く

次に proposal の encoding:

\`\`\`rust
/// Canonical bytes that a proposal signature commits to.
#[must_use]
pub fn proposal_signing_bytes(p: &OpenHlProposal) -> Vec<u8> {
    let mut buf = Vec::with_capacity(128);
    buf.extend_from_slice(&p.height.0.to_le_bytes());
    buf.extend_from_slice(&round_to_i64(p.round).to_le_bytes());
    buf.extend_from_slice(&p.value.0.0);
    buf.extend_from_slice(&round_to_i64(p.pol_round).to_le_bytes());
    buf.extend_from_slice(&p.address.0);
    buf
}
\`\`\`

Proposal のレイアウト:

| バイト | フィールド | エンコード |
| - | - | - |
| 0..8 | \`height\` | u64 LE |
| 8..16 | \`round\` | i64 LE |
| 16..48 | \`value.0.0\` | BlockHash の 32 バイト |
| 48..56 | \`pol_round\` | i64 LE (proof-of-lock round) |
| 56..76 | \`address\` | 20 バイト |

**\`vote_signing_bytes\` との違いに注目:** Proposal の value は \`NilOrVal\` でラップされず、無条件で \`BlockHash\`。Proposal は必ず value を運ぶ。Nil を propose することはない。

**\`p.value.0.0\` が奇妙に見える。** \`.0\` アクセスを 2 段つないでいる。最初は \`OpenHlValue(BlockHash)\` から \`BlockHash\` を取り出し、次は \`BlockHash([u8; 32])\` から \`[u8; 32]\` を取り出す。newtype の層ごとに \`.0\` が必要。煩わしいが明示的。

### Step 4: \`sign_vote\` と \`sign_proposal\` 関数を追加

\`\`\`rust
#[must_use]
pub fn sign_vote(v: OpenHlVote, sk: &PrivateKey) -> SignedMessage<crate::OpenHlContext, OpenHlVote> {
    let sig = sk.sign(&vote_signing_bytes(&v));
    SignedMessage::new(v, sig)
}

#[must_use]
pub fn sign_proposal(
    p: OpenHlProposal,
    sk: &PrivateKey,
) -> SignedMessage<crate::OpenHlContext, OpenHlProposal> {
    let sig = sk.sign(&proposal_signing_bytes(&p));
    SignedMessage::new(p, sig)
}
\`\`\`

どちらもメッセージの所有権を取り (通常の呼び出し側は渡したら以降使わないので)、canonical bytes を生成し、Ed25519 で署名し、\`SignedMessage\` でラップする。\`SignedMessage::new(msg, sig)\` は Malachite の標準ペアリング — 署名されたものはすべて \`SignedMessage\` としてエンジン内を流れる。

\`crate::OpenHlContext\` は L6 で作った \`OpenHlContext\`。Malachite の \`SignedMessage\` は context 型と inner message 型に対してジェネリック。

### Step 5: \`verify_vote\` 関数と \`VerifierLike\` trait を追加

\`\`\`rust
/// Verify a vote signature against the public key recorded for \`vote.address\`.
/// Returns false on bad signature.
#[must_use]
pub fn verify_vote(v: &OpenHlVote, sig: &Signature, public_key: &impl VerifierLike) -> bool {
    public_key.verify_msg(&vote_signing_bytes(v), sig).is_ok()
}

/// Trait shim so consumers can pass \`&malachitebft_signing_ed25519::PublicKey\`
/// without depending on the underlying \`signature\` crate's trait surface.
pub trait VerifierLike {
    fn verify_msg(&self, msg: &[u8], sig: &Signature) -> Result<(), VerifyError>;
}

#[derive(Debug)]
pub struct VerifyError;

impl VerifierLike for informalsystems_malachitebft_signing_ed25519::PublicKey {
    fn verify_msg(&self, msg: &[u8], sig: &Signature) -> Result<(), VerifyError> {
        self.verify(msg, sig).map_err(|_| VerifyError)
    }
}

fn round_to_i64(r: Round) -> i64 {
    r.as_i64()
}
\`\`\`

3 つのピース:

- **\`verify_vote\`** — \`sign_vote\` の逆。Canonical bytes を再計算し、public key の verify メソッドを呼び、true/false を返す。
- **\`VerifierLike\` trait** — 「Ed25519 署名を検証できる何か」に対する小さな抽象。理由: Malachite の \`PublicKey\` は \`signature::Verifier\` trait 経由で検証を提供しているが、自分の API の利用者にその trait を import させたくない。\`VerifierLike\` は自前の trait で、\`signature::Verifier\` への橋渡し impl を 1 つだけ提供する。**呼び出し側からは 1 つの trait に見え、裏で canonical な方に委譲する。**
- **\`round_to_i64\`** — 1 行ヘルパー。\`Round\` は Malachite の \`i64\` wrapper で、\`.as_i64()\` メソッドで中身を取れる。このヘルパーで包むと呼び出し側が読みやすくなる。

### Step 6: \`signing.rs\` にテストを 2 個追加

末尾に追加:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{OpenHlAddress, OpenHlHeight};
    use openhl_types::BlockHash;
    use rand::rngs::OsRng;

    #[test]
    fn vote_signature_round_trips() {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let vote = OpenHlVote {
            height: OpenHlHeight(7),
            round: Round::new(0),
            value_id: NilOrVal::Val(BlockHash([0x42; 32])),
            vote_type: VoteType::Prevote,
            address: OpenHlAddress([0xaa; 20]),
        };
        let signed = sign_vote(vote.clone(), &sk);
        assert!(verify_vote(&vote, &signed.signature, &pk));
    }

    #[test]
    fn vote_signature_is_field_sensitive() {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let vote = OpenHlVote {
            height: OpenHlHeight(7),
            round: Round::new(0),
            value_id: NilOrVal::Val(BlockHash([0x42; 32])),
            vote_type: VoteType::Prevote,
            address: OpenHlAddress([0xaa; 20]),
        };
        let signed = sign_vote(vote.clone(), &sk);
        // Mutate value_id; signature should no longer verify.
        let mut tampered = vote;
        tampered.value_id = NilOrVal::Val(BlockHash([0x43; 32]));
        assert!(!verify_vote(&tampered, &signed.signature, &pk));
    }
}
\`\`\`

テスト 2 つ:

- **\`vote_signature_round_trips\`** — Vote に署名し、検証する。合格。
- **\`vote_signature_is_field_sensitive\`** — Vote に署名し、コピーの 1 フィールドを変更し、変更後のコピーに対して検証する。失敗するべき。

2 つ目は **load-bearing** なテスト。**Canonical encoding が、意味のあるすべてのフィールドに対して敏感である** ことを証明する。encoding が壊れていた (例: \`value_id\` をバイト列に含め忘れた) 場合、tampered.value_id は異なるが signing bytes は同じになるため、テストは「改ざんされた vote が検証を通った」と失敗する。

### Step 7: \`crates/consensus/src/signing_provider.rs\` を作成

冒頭:

\`\`\`rust
//! \`SigningProvider\` implementation — the trait the Malachite engine plugs in.
//!
//! Holds our private key as state; delegates the actual signing to
//! [\`crate::signing\`]'s canonical encoding so the wire format and the engine
//! interface stay consistent.

use informalsystems_malachitebft_core_types::{SignedMessage, SigningProvider};
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, PublicKey, Signature};

use crate::context::OpenHlContext;
use crate::signing::{
    proposal_signing_bytes, sign_proposal as sign_proposal_with,
    sign_vote as sign_vote_with, vote_signing_bytes,
};
use crate::types::{OpenHlProposal, OpenHlProposalPart, OpenHlVote};

#[derive(Debug)]
pub struct OpenHlSigningProvider {
    private_key: PrivateKey,
}

impl OpenHlSigningProvider {
    #[must_use]
    pub const fn new(private_key: PrivateKey) -> Self {
        Self { private_key }
    }

    #[must_use]
    pub fn public_key(&self) -> PublicKey {
        self.private_key.public_key()
    }
}
\`\`\`

構造体は \`PrivateKey\` を保持する。コンストラクタは外から鍵を受け取る (通常はディスクや環境変数から)。\`public_key()\` は対応する public key をオンデマンドで導出する — Ed25519 では public key は private key からスカラー乗算で導出可能で、ミリ秒オーダー。

\`use\` ブロックは \`signing.rs\` から低レベル関数を \`as sign_X_with\` リネーム付きで import する。**なぜリネーム?** \`SigningProvider\` trait に \`sign_vote\` と \`sign_proposal\` という名前のメソッドがあり、自前ヘルパーを名前衝突なしで呼びたいから。\`_with\` サフィックスは「これは trait メソッドが委譲する先の実装関数」を表す慣習。

### Step 8: \`SigningProvider\` trait を実装 — 4 つの sign/verify ペア

\`\`\`rust
impl SigningProvider<OpenHlContext> for OpenHlSigningProvider {
    fn sign_vote(&self, vote: OpenHlVote) -> SignedMessage<OpenHlContext, OpenHlVote> {
        sign_vote_with(vote, &self.private_key)
    }

    fn verify_signed_vote(
        &self,
        vote: &OpenHlVote,
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key.verify(&vote_signing_bytes(vote), signature).is_ok()
    }

    fn sign_proposal(
        &self,
        proposal: OpenHlProposal,
    ) -> SignedMessage<OpenHlContext, OpenHlProposal> {
        sign_proposal_with(proposal, &self.private_key)
    }

    fn verify_signed_proposal(
        &self,
        proposal: &OpenHlProposal,
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key
            .verify(&proposal_signing_bytes(proposal), signature)
            .is_ok()
    }

    fn sign_proposal_part(
        &self,
        part: OpenHlProposalPart,
    ) -> SignedMessage<OpenHlContext, OpenHlProposalPart> {
        // ProposalPart is a unit struct in OpenHL (ValuePayload::ProposalOnly mode);
        // sign empty bytes so the type-level contract is honored but no extra
        // information is committed.
        let sig = self.private_key.sign(&[]);
        SignedMessage::new(part, sig)
    }

    fn verify_signed_proposal_part(
        &self,
        _part: &OpenHlProposalPart,
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key.verify(&[], signature).is_ok()
    }

    fn sign_vote_extension(&self, ext: ()) -> SignedMessage<OpenHlContext, ()> {
        // Vote extensions are unused at v0 (Context::Extension = ()).
        let sig = self.private_key.sign(&[]);
        SignedMessage::new(ext, sig)
    }

    fn verify_signed_vote_extension(
        &self,
        _ext: &(),
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key.verify(&[], signature).is_ok()
    }
}
\`\`\`

メソッド 8 個、ペア 4 つ:

- **\`sign_vote\` / \`verify_signed_vote\`** — \`signing::sign_vote\` に委譲 / public key の \`verify\` を \`vote_signing_bytes\` 付きで呼ぶ。標準。
- **\`sign_proposal\` / \`verify_signed_proposal\`** — 同じパターン。
- **\`sign_proposal_part\` / \`verify_signed_proposal_part\`** — **空バイトに署名する。** なぜか? \`OpenHlProposalPart\` は unit struct で、コミットすべきデータが存在しない。空ペイロードに署名しても valid な Ed25519 署名は生成される (private key 単独で確定的)。検証は「はい、この provider がこの署名を作った」を確認する。署名に情報量はないが、trait 表面は満たされる。
- **\`sign_vote_extension\` / \`verify_signed_vote_extension\`** — proposal_part と同じ。Vote extension は \`()\` (v0 では未使用) なので空バイトに署名する。

> 🛑 **やりがちな勘違い。** 「空バイトに署名するのは何か違う気がする — 意味あるの?」 **意味は、持っていないデータにコミットすることなく trait 表面を満たすこと。** Malachite エンジンは実行時にこれらメソッドを呼ぶ。panic したり Error を返したらエンジンがクラッシュする。空バイトに署名して valid な署名を返すことで、「はい、これは我々からの本物の署名です。ただし、メッセージの残りの部分以上に追加でコミットしているデータはありません」と言える。これら機能を使う本番 chain は実データを入れる。我々は入れないが、trait 表面はそのまま保たれる。

### Step 9: \`signing_provider.rs\` にテストを 7 個追加

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{OpenHlAddress, OpenHlHeight, OpenHlValue};
    use informalsystems_malachitebft_core_types::{NilOrVal, Round, VoteType};
    use openhl_types::BlockHash;
    use rand::rngs::OsRng;

    fn provider() -> (OpenHlSigningProvider, PublicKey) {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        (OpenHlSigningProvider::new(sk), pk)
    }

    fn sample_vote() -> OpenHlVote {
        OpenHlVote {
            height: OpenHlHeight(1),
            round: Round::new(0),
            value_id: NilOrVal::Val(BlockHash([0x42; 32])),
            vote_type: VoteType::Prevote,
            address: OpenHlAddress([0xaa; 20]),
        }
    }

    fn sample_proposal() -> OpenHlProposal {
        OpenHlProposal {
            height: OpenHlHeight(1),
            round: Round::new(0),
            value: OpenHlValue(BlockHash([0x42; 32])),
            pol_round: Round::Nil,
            address: OpenHlAddress([0xaa; 20]),
        }
    }

    #[test]
    fn vote_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let vote = sample_vote();
        let signed = sp.sign_vote(vote.clone());
        assert!(sp.verify_signed_vote(&vote, &signed.signature, &pk));
    }

    #[test]
    fn vote_tamper_detected() {
        let (sp, pk) = provider();
        let vote = sample_vote();
        let signed = sp.sign_vote(vote.clone());
        let mut tampered = vote;
        tampered.value_id = NilOrVal::Val(BlockHash([0x43; 32]));
        assert!(!sp.verify_signed_vote(&tampered, &signed.signature, &pk));
    }

    #[test]
    fn proposal_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let proposal = sample_proposal();
        let signed = sp.sign_proposal(proposal.clone());
        assert!(sp.verify_signed_proposal(&proposal, &signed.signature, &pk));
    }

    #[test]
    fn proposal_tamper_detected() {
        let (sp, pk) = provider();
        let proposal = sample_proposal();
        let signed = sp.sign_proposal(proposal.clone());
        let mut tampered = proposal;
        tampered.value = OpenHlValue(BlockHash([0x99; 32]));
        assert!(!sp.verify_signed_proposal(&tampered, &signed.signature, &pk));
    }

    #[test]
    fn proposal_part_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let part = OpenHlProposalPart;
        let signed = sp.sign_proposal_part(part);
        assert!(sp.verify_signed_proposal_part(&part, &signed.signature, &pk));
    }

    #[test]
    fn vote_extension_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let signed = sp.sign_vote_extension(());
        assert!(sp.verify_signed_vote_extension(&(), &signed.signature, &pk));
    }

    #[test]
    fn signature_from_one_provider_does_not_verify_under_another() {
        let (sp1, _pk1) = provider();
        let (_sp2, pk2) = provider();
        let vote = sample_vote();
        let signed = sp1.sign_vote(vote.clone());
        // Signed by provider 1, verified against provider 2's public key — must fail.
        assert!(!sp1.verify_signed_vote(&vote, &signed.signature, &pk2));
    }
}
\`\`\`

7 個のテストが表面をカバーする:

| テスト | 何を証明するか |
| - | - |
| \`vote_sign_verify_round_trips\` | Vote sign/verify ペアが機能する。 |
| \`vote_tamper_detected\` | 署名後に vote フィールドを変えると検証失敗。 |
| \`proposal_sign_verify_round_trips\` | Proposal で同じ。 |
| \`proposal_tamper_detected\` | Proposal で同じ。 |
| \`proposal_part_sign_verify_round_trips\` | 空バイト署名でも unit struct 型でラウンドトリップする。 |
| \`vote_extension_sign_verify_round_trips\` | vote_extension で同じ。 |
| \`signature_from_one_provider_does_not_verify_under_another\` | 暗号学的セキュリティ — 別の鍵が作る署名は交換不可能。 |

最後のテストが **load-bearing なセキュリティ保証**: 署名は特定の鍵に紐付く。これがなければ、誰でも別の validator の有効な署名を再利用して偽造できてしまう。

### Step 10: 両モジュールを \`lib.rs\` に配線

\`crates/consensus/src/lib.rs\` を開く。現在の中身:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

2 行追加:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

\`pub mod signing;\` と \`pub mod signing_provider;\` でモジュールを公開。この層では再エクスポートは不要 — 呼び出し側はフルパスで import する。

## テスト

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

期待される出力:

\`\`\`
running 14 tests
test context::tests::height_increment_and_decrement ... ok
test context::tests::new_prevote_and_precommit_have_distinct_types ... ok
test context::tests::new_proposal_round_trips_fields ... ok
test context::tests::select_proposer_round_robins_deterministically ... ok
test context::tests::validator_set_is_sorted_by_power_then_address ... ok
test signing::tests::vote_signature_is_field_sensitive ... ok
test signing::tests::vote_signature_round_trips ... ok
test signing_provider::tests::proposal_part_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_tamper_detected ... ok
test signing_provider::tests::signature_from_one_provider_does_not_verify_under_another ... ok
test signing_provider::tests::vote_extension_sign_verify_round_trips ... ok
test signing_provider::tests::vote_sign_verify_round_trips ... ok
test signing_provider::tests::vote_tamper_detected ... ok

test result: ok. 14 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

よくあるエラーと対処:

- **\`cannot find function 'sign_vote' in module 'super::signing'\`** — \`lib.rs\` に \`pub mod signing;\` を追加し忘れている。Step 10 を再確認。
- **\`error: trait 'SigningProvider' not implemented for 'OpenHlSigningProvider' — missing method 'sign_vote_extension'\`** — 8 メソッド (sign 4 + verify 4) すべてが必須。一部しか実装していないと trait が満たされない。不足分を追加。
- **\`error: type alias 'Extension' is \`()\` so methods take \`ext: ()\`** — impl が \`ext: ()\` (verify では \`_ext: &()\`) を使っていることを確認。\`Extension\` のような placeholder ではない。
- **\`vote_tamper_detected\` テストが逆に失敗する** — Canonical encoding が \`value_id\` (または別フィールド) をバイト列に含めていない可能性。Step 2 を再確認 — 構造体の意味のあるフィールドはすべてバイト列に寄与しなければならない。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Canonical encoding は \`signing.rs\` にあり、\`serde::Serialize\` から導出しない。** \`signing.rs\` が自分でコントロールするバイトレベルレイアウトを定義する。なぜか? \`serde\` のバージョンは Rust edition 更新やライブラリアップグレードで変わりうるが、署名されたメッセージは異なるバイナリバージョンを走らせている可能性のある validator 間でラウンドトリップしなければならない。Encoding をライブラリ詳細ではなくコード (ライブラリ依存ではない) に固定すると、wire format は chain の spec の一部になる。

2. **\`SigningProvider\` は純粋関数 \`sign_vote\` をラップし、鍵を状態として持つ。** \`sign_vote\` を \`OpenHlSigningProvider\` のメソッドにすることもできた。分離することで、**テスト** や **内部コード** は \`sign_vote(vote, &sk)\` を直接呼べ (鍵を引数で渡す)、**Malachite エンジン** は trait メソッド \`sp.sign_vote(vote)\` を使える (provider が保持する鍵にバインド)。**同じロジックが両方のユースケースを重複なく提供する。**

3. **ProposalPart と Extension の空バイト署名。** Trait 表面がメソッドを要求するが、chain がその機能を使わない場合、空データに対する確定的で検証可能な署名を提供する。これは、持っていないデータにコミットすることなく trait を honor する。これら機能を使う本番 chain は実データを入れる。我々は入れないが、どちらの場合もエンジンはクラッシュしない。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 9e810a7
diff -u ~/code/my-openhl/crates/consensus/src/signing.rs ./crates/consensus/src/signing.rs
diff -u ~/code/my-openhl/crates/consensus/src/signing_provider.rs ./crates/consensus/src/signing_provider.rs
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

Doc コメントの文言には個人差が出てよい。Canonical encoding のバイト順、SigningProvider trait impl (特に何に委譲しているか)、テストパターンが厳密に一致していること。

\`9e810a7\` の参照には後のレッスンで追加する追加ファイル (\`runner.rs\` の変更) も含まれる。このレッスンでは signing 関連ファイルだけ diff する。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: Nil vote の場合 \`vote_signing_bytes\` は \`vote_type\` を含めないのか?**
含める — \`vote_type\` は \`value_id\` が Nil でも Val でも常に 1 バイト (0 または 1)。条件分岐は \`value_id\` のためだけ (Nil なら tag 1 バイト、Val なら tag 1 バイト + ハッシュ 32 バイト)。

**Q: 誤って public key で署名してしまうことはあるか?**
ない — Ed25519 は型で分離している: \`PrivateKey::sign(&[u8]) -> Signature\` は存在するが、\`PublicKey::sign\` は存在しない。型システムが取り違えを防ぐ。

**Q: ある validator の vote_signing_bytes が別の validator のと食い違うと何が起きる?**
両者が同じ proposal に vote する最初の round で chain が fork する。Validator A の署名は A 自身の encoding で検証成功。Validator B が同じ vote を別 encoding で読むと、署名検証失敗で vote を拒否。同じ選挙について別々の集計結果を生み、別々の決定 value につながる。**だから encoding は spec の一部であり、実装の詳細ではない。**

**Q: なぜ \`OpenHlSigningProvider\` は \`Clone\` を impl しないのか?**
Private key のコピーは明示的に行いたい — \`let sp_copy = sp.clone();\` は事故的に書きやすい。本当にコピーが必要なら \`OpenHlSigningProvider::new(self.private_key.clone())\` を使う。\`Clone\` を切ることで private key の複製はまれで可視になる。

## 次のレッスン (L8)

署名表面が完成した。Malachite が provider にメッセージへの署名を依頼でき、検証はラウンドトリップする。しかし **Malachite はまだネットワーク越しの会話の仕方を知らない** — validator 間で vote を送るには encoding/decoding が必要。L8 では \`OpenHlCodec\` を実装する: ネットワーク転送、write-ahead logging、state sync のためにメモリ内型とバイト列を相互変換する trait。L8 終了後、エンジン起動に必要なものはすべて揃う (codec + signing + context + node config); 同じレッスンで \`OpenHlNode\` を配線し、\`start_engine\` が動くことを証明する。`,
                },
                {
                  title: "レッスン 8 — OpenHlCodec — エンジンが要求する codec スロット",
                  slug: "openhl-codec-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン 8 — \`OpenHlCodec\` — エンジンが要求する codec スロット

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

…が **16 個のテストすべてに合格する** (L7 から 14 個 + codec の新規 2 個)。新規ファイルが 1 つ:

- **\`crates/consensus/src/codec.rs\`** — \`OpenHlCodec\` 構造体と 8 個の \`Codec<T>\` impl。1 個は本物 (\`ProposalPart\` 用)、7 個は呼ばれたらクリアなエラーを返す *stub*。

ここでもうひとつ unblock されるものがある: \`informalsystems-malachitebft-app\` が libp2p、ractor、その他エンジン表面のすべてを引き込んでくる。これ以降の初回コンパイルは ~38 秒かかる。投資の見返りは、L9 で spawn する actor system。

新規テスト 2 個: \`OpenHlCodec\` が 3 つの super-trait (\`WalCodec\`, \`ConsensusCodec\`, \`SyncCodec\`) を満たすことを示すコンパイル時アサーション、および \`ProposalPart\` の runtime ラウンドトリップテスト。

## おさらい

L7 完了時点で \`openhl-consensus\` crate には以下がある:

\`\`\`
crates/consensus/src/lib.rs   — pub mod bridge, context, signing, signing_provider, types
crates/consensus/src/signing.rs            — canonical encoding + 低レベル sign/verify
crates/consensus/src/signing_provider.rs   — OpenHlSigningProvider が SigningProvider<OpenHlContext> を impl
crates/consensus/src/types/                — 7 つの型ファイル + mod.rs
crates/consensus/src/context.rs            — OpenHlContext + Context impl
\`\`\`

\`cargo test -p openhl-consensus\` でテスト 14 個が合格。**エンジンはまだコンパイルできない** — \`start_engine\` は codec に対してジェネリックで、まだそれを提供していない。

## 計画

5 つやる:

1. **\`crates/consensus/Cargo.toml\` に \`informalsystems-malachitebft-app\` を追加。** これが重量級 — libp2p、ractor、フル app 表面を transitively に引き込む。これ以降の初回コンパイルは ~38 秒。
2. **\`crates/consensus/src/codec.rs\` を作成** — \`OpenHlCodec\` unit struct、\`CodecStub\` エラー、8 個の \`Codec<T>\` impl。
3. **\`pub mod codec;\`** を \`lib.rs\` に配線。
4. **実行** — \`cargo test -p openhl-consensus\` で 16 個合格。
5. **観察** — コンパイル時アサーションがコンパイルを通る。これがエンジンの codec trait bound を満たしたシグナル。

このレッスンが教えるのは、**ある impl の詳細以上に効いてくる 1 つのパターン**: **明確な失敗モードを持たせて trait メソッドを stub する**。大きな trait bound を満たす必要があるが、対象メソッドが hot path にない場合、stub にできる。stub のエラーメッセージには「何が呼ばれたか」を載せ、読み手が次に何を実装すべきか分かるようにする。これは **型レベルのインクリメンタル開発** — codec を全部一度に実装する必要はない、コンパイルが通るだけ提供しておき、実際に呼ばれたところで loud にエラーを返す。

> 🛑 **考えてみよう。** スクロールする前に: なぜ Malachite は、single-validator devnet で送るネットワークがないのに、エンジンがネットワーク・メッセージのエンコード方法を知っていることを強制するのか? ヒント: trait bound は **型** に関するもので、**runtime 挙動** に関するものではない。エンジンは自分の codec に対してジェネリックなのは、devnet では gossip しない validator も multi-validator デプロイでは gossip するから。Codec スロットが要求されるのは、エンジンがピアがあるかどうかを知らないから。impl が完全である必要がないのは、テストでは gossip コードパスがそもそも実行されないから。

## 手順

### Step 1: app 依存を Cargo.toml に追加

\`crates/consensus/Cargo.toml\` を開く。\`[dependencies]\` セクションに 1 行追加:

\`\`\`toml
informalsystems-malachitebft-app             = { workspace = true }
\`\`\`

他の malachite 依存の隣に配置。\`app\` crate はメタ crate で、エンジンの各所から型を re-export している — \`Codec\`, \`ConsensusCodec\`, \`SyncCodec\`, \`WalCodec\`, \`SignedConsensusMsg\`, \`StreamMessage\`, \`ProposedValue\`, \`sync::{Status, Request, Response}\` はすべてここに集まる。

簡易サニティチェック:

\`\`\`bash
cargo check -p openhl-consensus 2>&1 | tail -5
\`\`\`

初回ビルドは遅い (libp2p + ractor + 依存が初めてコンパイルされる、~38 秒)。以降はキャッシュ利用。

### Step 2: \`crates/consensus/src/codec.rs\` を作成

ファイル冒頭:

\`\`\`rust
//! Stub \`Codec<T>\` impls so \`OpenHlCodec\` satisfies \`WalCodec\`, \`ConsensusCodec\`,
//! and \`SyncCodec\` via Malachite's blanket impls.
//!
//! In single-validator mode none of these codecs fire — they're for network
//! gossip (Consensus), peer sync (Sync), and crash-recovery WAL writes. The
//! engine requires them to exist by trait bound, but the methods are not
//! invoked on the happy path.
//!
//! When L9 spins up actors and one of these stubs IS hit, the error
//! message names the type that needs a real impl — that's the cue to swap
//! the stub for a Protobuf/JSON implementation.

use bytes::Bytes;
use informalsystems_malachitebft_app::types::codec::Codec;
use informalsystems_malachitebft_app::types::streaming::StreamMessage;
use informalsystems_malachitebft_app::types::sync::{Request, Response, Status};
use informalsystems_malachitebft_app::types::{ProposedValue, SignedConsensusMsg};
use informalsystems_malachitebft_core_consensus::LivenessMsg;
use thiserror::Error;

use crate::context::OpenHlContext;
use crate::types::OpenHlProposalPart;

#[derive(Copy, Clone, Debug, Default)]
pub struct OpenHlCodec;

#[derive(Debug, Error)]
#[error("codec for {0} is a Stage 6b stub; implement before this path can fire")]
pub struct CodecStub(pub &'static str);
\`\`\`

\`OpenHlCodec\` は unit struct — 状態なし。Malachite の codec は純粋関数。レシーバが存在するのは trait dispatch のためだけ。\`CodecStub\` は 8 個の Codec impl が共有するエラー型。\`&'static str\` フィールドは、codec が未実装の型の名前を保持する。未実装パスが **実際に** fire したとき、エラーメッセージが何を書くべきかを教えてくれる。

> 🛑 **やりがちな勘違い。** 「なぜ \`CodecStub\` は enum (stub ごとに variant) ではなく \`&'static str\` を持つ struct なのか?」 **新しい stub を追加するたびに 2 箇所編集する必要が出るから** — enum 定義と各呼び出し側。\`&'static str\` 引数は拡張可能で、新しい \`Codec<T>\` impl の stub も型名リテラルを渡すだけで作れる、enum 変更不要。トレードオフ: 型安全性が下がる (任意の文字列を渡せる) が、\`T\` 自体は trait 表面が縛っているので、文字列は人間向けラベル扱いで十分。

### Step 3: 唯一の本物 impl — \`ProposalPart\`

次:

\`\`\`rust
// ---- ProposalPart ---------------------------------------------------------
// ProposalPart is a unit struct in OpenHL (ValuePayload::ProposalOnly), so its
// encoding is genuinely empty — this one is real, not a stub.

impl Codec<OpenHlProposalPart> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<OpenHlProposalPart, Self::Error> {
        Ok(OpenHlProposalPart)
    }

    fn encode(&self, _msg: &OpenHlProposalPart) -> Result<Bytes, Self::Error> {
        Ok(Bytes::new())
    }
}
\`\`\`

これは **本物**。\`OpenHlProposalPart\` は unit struct (フィールド 0 個) なので:

- **Encode** は空の \`Bytes\` を返す — unit struct の wire 表現は空文字列。
- **Decode** は入力バイトを無視し、\`OpenHlProposalPart\` を返す — その型の唯一の取りうる値。誰かがゴミバイトを渡しても、unit 型へのデコードは失敗しようがない。

これは **stub ではない** — 完全で正しい実装、たまたま自明なだけ。Unit 型は退化的な wire format を持つ。空バイト encoding は \`signing_provider.rs\` の \`proposal_part_round_trips\` や、その他「\`ProposalPart\` を encode/decode して」と尋ねる箇所で exercise される。

### Step 4: 7 個の stub impl

次は本物ではない 7 個の impl:

\`\`\`rust
// ---- Consensus messages (gossip) -----------------------------------------

impl Codec<SignedConsensusMsg<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<SignedConsensusMsg<OpenHlContext>, Self::Error> {
        Err(CodecStub("SignedConsensusMsg<OpenHlContext>"))
    }

    fn encode(&self, _msg: &SignedConsensusMsg<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("SignedConsensusMsg<OpenHlContext>"))
    }
}

impl Codec<LivenessMsg<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<LivenessMsg<OpenHlContext>, Self::Error> {
        Err(CodecStub("LivenessMsg<OpenHlContext>"))
    }

    fn encode(&self, _msg: &LivenessMsg<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("LivenessMsg<OpenHlContext>"))
    }
}

impl Codec<StreamMessage<OpenHlProposalPart>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<StreamMessage<OpenHlProposalPart>, Self::Error> {
        Err(CodecStub("StreamMessage<OpenHlProposalPart>"))
    }

    fn encode(&self, _msg: &StreamMessage<OpenHlProposalPart>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("StreamMessage<OpenHlProposalPart>"))
    }
}

// ---- WAL (crash recovery) -------------------------------------------------

impl Codec<ProposedValue<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<ProposedValue<OpenHlContext>, Self::Error> {
        Err(CodecStub("ProposedValue<OpenHlContext>"))
    }

    fn encode(&self, _msg: &ProposedValue<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("ProposedValue<OpenHlContext>"))
    }
}

// ---- Sync (peer catch-up) -------------------------------------------------

impl Codec<Status<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<Status<OpenHlContext>, Self::Error> {
        Err(CodecStub("sync::Status<OpenHlContext>"))
    }

    fn encode(&self, _msg: &Status<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("sync::Status<OpenHlContext>"))
    }
}

impl Codec<Request<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<Request<OpenHlContext>, Self::Error> {
        Err(CodecStub("sync::Request<OpenHlContext>"))
    }

    fn encode(&self, _msg: &Request<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("sync::Request<OpenHlContext>"))
    }
}

impl Codec<Response<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<Response<OpenHlContext>, Self::Error> {
        Err(CodecStub("sync::Response<OpenHlContext>"))
    }

    fn encode(&self, _msg: &Response<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("sync::Response<OpenHlContext>"))
    }
}
\`\`\`

7 個の Codec impl、全部同じパターン: \`decode\` は \`Err(CodecStub(...))\` を返し、\`encode\` も \`Err(CodecStub(...))\` を返す、型名はリテラルで渡すので stub error が自分自身を名乗る。

3 つのカテゴリ:

- **Consensus メッセージ (gossip)** — \`SignedConsensusMsg\`, \`LivenessMsg\`, \`StreamMessage\`。Validator 間で libp2p 越しに流れる。Single-validator devnet には peer がいないので、これらは呼ばれない。
- **WAL (crash recovery)** — \`ProposedValue\`。エンジンは proposal を crash recovery のためにディスクに書く。我々はインプロセステストで動かすので fire しない。
- **Sync (peer catch-up)** — \`Status\`, \`Request\`, \`Response\`。Validator が遅れたとき、peer に過去 block を送ってもらうために尋ねる。Peer がいない = 遅れない = sync しない。

> 🛑 **やりがちな勘違い。** 「\`#[derive(Serialize, Deserialize)]\` を付けて bincode で済ませばよいのでは?」 **一部はそうできる。** が、これら型の多くはジェネリック、\`Box<dyn Trait>\` フィールド、または serde が簡単には扱えない要素を含む。Malachite の \`test\` crate のリファレンス実装は ~400 行の手書き Protobuf encoding でこれらを全部捌いている。Stub アプローチはその作業を今は省く。実ネットワークや永続 WAL が必要になったとき、protobuf や borsh 実装をここで 1 メソッドずつ swap する。

### Step 5: テストモジュールを追加

\`codec.rs\` の末尾:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use informalsystems_malachitebft_app::types::codec::{
        ConsensusCodec, SyncCodec, WalCodec,
    };

    // Compile-time assertions: by implementing the constituent Codec<T>
    // traits, OpenHlCodec automatically satisfies all three super-traits.
    fn assert_wal_codec<C: WalCodec<OpenHlContext>>() {}
    fn assert_consensus_codec<C: ConsensusCodec<OpenHlContext>>() {}
    fn assert_sync_codec<C: SyncCodec<OpenHlContext>>() {}

    #[test]
    fn openhl_codec_satisfies_all_three_super_traits() {
        assert_wal_codec::<OpenHlCodec>();
        assert_consensus_codec::<OpenHlCodec>();
        assert_sync_codec::<OpenHlCodec>();
    }

    #[test]
    fn proposal_part_round_trips() {
        let codec = OpenHlCodec;
        let part = OpenHlProposalPart;
        let bytes = codec.encode(&part).unwrap();
        let decoded = codec.decode(bytes).unwrap();
        assert_eq!(part, decoded);
    }
}
\`\`\`

テスト 2 つ:

- **\`openhl_codec_satisfies_all_three_super_traits\`** — これはテストの体裁の **コンパイル時** アサーション。\`WalCodec<Ctx>\`, \`ConsensusCodec<Ctx>\`, \`SyncCodec<Ctx>\` は Malachite の super-trait — 適切な \`Codec<T>\` 構成 impl をすべて持っていれば自動的に満たされる。3 つの \`assert_*\` 関数は、bound を強制的にコンパイラにチェックさせるためだけに存在する。1 個でも \`Codec<T>\` impl が抜けていれば、これは **コンパイルが通らず**、runtime ではなくコンパイル時に失敗する。Runtime テスト本体は no-op。検証は型チェック時に発生する。
- **\`proposal_part_round_trips\`** — 1 つだけの **本物** codec impl を exercise する。空の \`ProposalPart\` を encode、結果バイトを decode、等価性を assert。これが本物 impl が動くことを証明する。7 個の stub は runtime でテストしないのは、もし誰かが呼んだらエラー返して panic-via-error する設計だから。

> 🛑 **やりがちな勘違い。** 「なぜテストは空なのに pass する?」 **アサーションが型チェッカーにあり、runtime ではないから。** \`assert_wal_codec::<OpenHlCodec>()\` と書くと、Rust はコンパイル時に \`OpenHlCodec: WalCodec<OpenHlContext>\` をチェックしなければならない。Bound が失敗すればファイルがコンパイルできず、\`cargo test\` は **コンパイルエラー** を報告する、テスト失敗ではない。これは Rust の一般的なパターン: 検証したい bound を持つ関数を呼ぶことで、runtime チェックをコンパイルチェックに変換する。

### Step 6: codec を \`lib.rs\` に配線

\`crates/consensus/src/lib.rs\` を開く。現在:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

1 行追加:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod codec;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

## テスト

初回コンパイルは遅い — libp2p、ractor、~200 の transitive 依存を初取得:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

約 30-40 秒後:

\`\`\`
running 16 tests
test bridge::tests::... ... ok            # (consensus に L3 由来の bridge テストがある場合 — workspace 構成による)
test codec::tests::openhl_codec_satisfies_all_three_super_traits ... ok
test codec::tests::proposal_part_round_trips ... ok
test context::tests::... (5 tests) ... ok
test signing::tests::... (2 tests) ... ok
test signing_provider::tests::... (7 tests) ... ok

test result: ok. 16 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

よくあるエラーと対処:

- **\`error[E0277]: the trait bound 'OpenHlCodec: WalCodec<OpenHlContext>' is not satisfied\`** — 8 個の \`Codec<T>\` impl のうちどれかが抜けている。Step 3 と Step 4 を再確認 — 8 つの構成型すべてに \`impl Codec<T> for OpenHlCodec\` が必要。
- **\`error[E0282]: type annotations needed for 'CodecStub'\`** — \`&'static str\` フィールドを忘れている。\`pub &'static str\` の単一フィールドが \`CodecStub("...")\` で渡される。
- **\`error[E0432]: unresolved import 'informalsystems_malachitebft_app::types::codec::ConsensusCodec'\`** — Cargo.toml に \`informalsystems-malachitebft-app\` を追加し忘れている。Step 1 を再確認。
- **再ビルドでも 60 秒以上かかる** — \`cargo build\` (\`--release\` なし) を試す。それでも遅ければ原因は libp2p、放っておく。

## 設計の振り返り

3 つの load-bearing な決定:

1. **明確な失敗名を持つ stub は、まだ必要のない完全な impl より勝る。** **本物** の \`SignedConsensusMsg\` codec は protobuf encoding ~50 行。必要ないから書かない。代わりに 4 行の stub を書き、もし fire したら何が未実装かを名乗る。**型レベルのインクリメンタル開発。**

2. **blanket impl で 1 つの trait impl が複数 super-trait を満たせる。** \`WalCodec<Ctx>\` は自動的に \`impl<C> WalCodec<Ctx> for C where C: Codec<ProposedValue<Ctx>>\` (Consensus/Sync も同様)。適切な **構成** \`Codec<T>\` impl を提供すれば、\`impl WalCodec\` は書かなくていい — Malachite が blanket impl を無料でくれる。コンパイル時アサーションテストはこれが本物であることを検証する。

3. **codec は \`consensus/\` にあり、\`types/\` ではない。** Codec はエンジン側の「何が wire 上を流れるか」概念 (\`SignedConsensusMsg\`, \`ProposedValue\`, \`sync::Status\`) に依存する。これは consensus 層の関心事で、base 型の関心事ではない。Codec を \`types/\` に置くと \`types/\` が \`informalsystems-malachitebft-app\` に依存することになり、エンジンを必要としない下流 crate にとって \`openhl-types\` が重い依存になる。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 4229502
diff -u ~/code/my-openhl/crates/consensus/src/codec.rs ./crates/consensus/src/codec.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

\`4229502\` の参照には Cargo.lock 変更 (libp2p ツリー) と 166 行の \`codec.rs\` が含まれる。実装パターン (1 つの stub を繰り返す) は厳密に一致するべき。Doc コメントの文言は個人差可。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`_msg\` や \`_bytes\` のアンダースコア接頭辞はなぜ必要?**
Rust は未使用引数に \`_\` 接頭辞を要求する (unused-variable 警告を抑制するため)。\`&self\` は trait dispatch に必要だが読まない。\`_msg\` / \`_bytes\` も同じく無視する。一部 stub では **使う** こともあるが (ここでは使わない)、アンダースコアは「これが存在するのを認識している、使わない」を表す慣用句。

**Q: \`WalCodec\`, \`ConsensusCodec\`, \`SyncCodec\` の違いは?**
関連 codec impl をグループ化する sub-trait。\`WalCodec\` は \`ProposedValue\` の encoding を要求。\`ConsensusCodec\` は \`SignedConsensusMsg\` + \`LivenessMsg\` + \`StreamMessage<ProposalPart>\` + \`ProposalPart\` を要求。\`SyncCodec\` は \`Status\` + \`Request\` + \`Response\` を要求。個別の \`Codec<T>\` trait を impl すれば、3 つの super-trait すべてが無料で手に入る。

**Q: stub が fire しないなら、そもそもなぜ存在する?**
Rust の trait システムは runtime 構成に応じて impl を条件付きで含めたり除外したりできないから。エンジンの \`start_engine\` には \`C: ConsensusCodec<Ctx> + WalCodec<Ctx> + SyncCodec<Ctx>\` という trait bound があり、これは codec メソッドが実行されようがされまいがコンパイル時にチェックされる。**stub は型システムを満たすために存在し、runtime を満たすためではない。**

**Q: stub を本物 impl に置き換えるのはいつ?**
エンジンが実際に呼んだとき。L9 の smoke test は actor system を spawn していくつかのパスを exercise する。Stub が fire すれば、エラーメッセージがどれかを教えてくれる。最初に呼ばれる可能性が高いのは \`Codec<ProposedValue<OpenHlContext>>\` (WAL) — エンジンは peer gossip 前に、最初の proposal を crash recovery のためにディスクに書くから。そこを protobuf-backed encoder に swap することになる。

## 次のレッスン (L9)

Codec trait bound を満たした — \`start_engine\` の signature を満たせる状態になった。だが、codec の **値**、node config、validator set のいずれも、\`start_engine\` が要求する形ではまだ持っていない。L9 では \`OpenHlNode\` に \`Node\` trait を実装する: \`OpenHlConfig\` (NodeConfig impl)、\`OpenHlGenesis\`、\`OpenHlPrivateKeyFile\`、\`OpenHlNodeHandle\`、そして 5 つの関連型と 12 メソッドを持つ \`Node\` impl 本体、合計 ~300 行。L9 の capstone は \`start_engine_smoke_spawns_and_kills\` — \`start_engine\` を呼び、actor system が ~0.02 秒で spawn / tear down することを証明するテスト。L9 完了でエンジンは boot する。L10-L15 は AppMsg loop と Live Reth 統合を配線していく。`,
                },
                {
                  title: "レッスン 9 — OpenHlNode と初の start_engine 呼び出し",
                  slug: "openhl-node-ja",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 55,
                  xpReward: 100,
                  content: `# レッスン 9 — \`OpenHlNode\` と初の \`start_engine\` 呼び出し

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

…が **20 個のテストすべてに合格する** (L8 から 16 個 + Node impl の新規 4 個)。Capstone テスト:

\`\`\`
test node::tests::start_engine_smoke_spawns_and_kills ... ok
\`\`\`

…が、自分のコードに対してフル Malachite actor system を spawn し、チャンネルハンドルが 1 回だけ利用可能であることを assert し、actor system をクリーンに tear down する — **約 0.02 秒で**。本レッスン後、エンジンは起動する。残るは \`Channels<OpenHlContext>\` から消費して bridge を駆動する application loop のみ。

新規テスト 4 個がカバーするもの: private key file の往復、config が \`ProposalOnly\` payload + エフェメラルな listen address を produce すること、address 導出が L6 の runner と一致すること、\`start_engine\` を呼ぶ smoke test。

## おさらい

L8 完了時点で \`openhl-consensus\` crate には以下がある:

\`\`\`
crates/consensus/src/lib.rs               — pub mod bridge, codec, context, signing, signing_provider, types
crates/consensus/src/codec.rs             — OpenHlCodec (1 個本物 + 7 個 stub Codec impl, テスト 2 個)
crates/consensus/src/signing_provider.rs  — SigningProvider<OpenHlContext>
crates/consensus/src/context.rs           — Context<OpenHlContext>
crates/consensus/src/types/               — 型ファイル 7 個
\`\`\`

\`cargo test -p openhl-consensus\` でテスト 16 個が合格。\`start_engine\` が要求する trait bound は **型レベルでは** すべて満たしているが、まだ呼べない — \`Node\` impl も、config も、genesis も、private key file も、node handle もない。

## 計画

6 つやる:

1. **\`crates/consensus/Cargo.toml\` に 5 個の依存を追加** — \`informalsystems-malachitebft-app-channel\`、\`informalsystems-malachitebft-config\`、signing-ed25519 に \`serde\` feature を有効化、\`serde\` と \`tokio\` をランタイム dep (dev だけでなく) に追加、\`tempfile\` を dev-dep に追加。
2. **\`crates/consensus/src/node.rs\` を作成** — \`OpenHlConfig\` (impl \`NodeConfig\`)、\`OpenHlGenesis\` (unit struct)、\`OpenHlPrivateKeyFile\` (wire wrapper)、\`OpenHlNodeHandle\` (\`start()\` の戻り値)、\`OpenHlNode\` (メイン struct)、5 個の関連型と 12 個のメソッドを持つ \`impl Node for OpenHlNode\`。
3. **\`pub mod node;\`** を \`lib.rs\` に配線。
4. **ユニットテスト 4 個** を \`node.rs\` に追加。
5. **実行** — \`cargo test -p openhl-consensus\` で 20 個合格。
6. **じっくり見届ける** — \`start_engine_smoke_spawns_and_kills\` が 0.02 秒で合格するところを。**自分のコードが動く BFT エンジンになる瞬間。**

このレッスンが教えるのは **自分のコードと Malachite を結ぶブリッジパターン**。エンジンは他人が書いたもので、\`Context\` と \`Codec\` に対してジェネリック。spawn するには 5 つが必要: context インスタンス、node インスタンス (config、署名、address 導出を取るため)、config 値、codec 値、初期 height、validator set。\`Node\` trait は、Malachite が自分のコードからそれらを統一的に取れるようにする **handshake インターフェース**。一度 impl すれば、同じハンドシェイクに従う任意の chain で \`start_engine\` は動く。

> 🛑 **考えてみよう。** スクロールする前に: なぜ Malachite は \`OpenHlNode\` 自身に config フィールドを持たせず、別の \`OpenHlConfig\` を要求するのか? ヒント: config の **所有者** と、いつ変わりうるかを考える。Node はプロセス起動時に 1 回作成されるが、設定 (listen address、value payload mode、value sync 設定) はシグナルでディスクから再ロードされうる。\`OpenHlConfig\` を \`OpenHlNode\` から分離することで、config は \`Node::load_config()\` 経由でロードできる — 再呼び出し可能で毎回新しい値を返す — node を再インスタンス化することなく。

## 手順

### Step 1: \`crates/consensus/Cargo.toml\` を更新

\`crates/consensus/Cargo.toml\` を開く。L8 後の \`[dependencies]\` セクションは:

\`\`\`toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }

informalsystems-malachitebft-core-types      = { workspace = true }
informalsystems-malachitebft-core-driver     = { workspace = true }
informalsystems-malachitebft-core-consensus  = { workspace = true }
informalsystems-malachitebft-app             = { workspace = true }
informalsystems-malachitebft-signing-ed25519 = { workspace = true, features = ["rand"] }
bytes                                         = "1"
rand                                          = "0.8"
sha2                                          = "0.10"

[dev-dependencies]
tokio = { workspace = true }
\`\`\`

これを次に置き換える:

\`\`\`toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }

informalsystems-malachitebft-core-types      = { workspace = true }
informalsystems-malachitebft-core-driver     = { workspace = true }
informalsystems-malachitebft-core-consensus  = { workspace = true }
informalsystems-malachitebft-app             = { workspace = true }
informalsystems-malachitebft-app-channel     = { workspace = true }
informalsystems-malachitebft-config          = { workspace = true }
informalsystems-malachitebft-signing-ed25519 = { workspace = true, features = ["rand", "serde"] }
bytes                                         = "1"
rand                                          = "0.8"
sha2                                          = "0.10"
serde                                         = { workspace = true }
tokio                                         = { workspace = true }

[dev-dependencies]
tokio    = { workspace = true }
tempfile = "3"

[lints]
workspace = true
\`\`\`

各新規依存の用途:

- **\`informalsystems-malachitebft-app-channel\`** — 次に呼ぶ \`start_engine()\` 関数と、エンジン通信用に返される \`Channels<Ctx>\` 型を提供。
- **\`informalsystems-malachitebft-config\`** — \`OpenHlConfig\` に埋め込む \`ConsensusConfig\`, \`ValueSyncConfig\`, \`ValuePayload\` 型。
- **\`signing-ed25519\` の \`serde\` feature** — \`OpenHlPrivateKeyFile\` に \`Serialize\`/\`Deserialize\` を derive できるようにする (\`PrivateKey\` newtype が serializable である必要がある)。
- **\`serde\`** (runtime dep) — \`OpenHlConfig\`, \`OpenHlGenesis\`, \`OpenHlPrivateKeyFile\` の \`#[derive(Serialize, Deserialize)]\` で使用。
- **\`tokio\`** を dev-dep から dep へ移動 — \`OpenHlNodeHandle\` が \`tokio::sync::Mutex\` を持つ。
- **\`tempfile\`** dev-dep — smoke test が node の home dir 用に temp ディレクトリを作る。

これが 2 回目の重コンパイル。初回 \`app-channel\` + \`config\` 取得はさらに ~20 秒。

### Step 2: \`crates/consensus/src/node.rs\` を作成 — import と \`OpenHlConfig\`

Import から:

\`\`\`rust
//! \`Node\` trait implementation — describes our chain to Malachite's engine
//! and provides the [\`OpenHlNode::start\`] entry point that calls
//! \`malachitebft_app_channel::start_engine\` to spawn the actor system.

use std::path::PathBuf;

use async_trait::async_trait;
use eyre::eyre;
use informalsystems_malachitebft_app::node::{EngineHandle, Node, NodeConfig, NodeHandle};
use informalsystems_malachitebft_app::types::Keypair;
use informalsystems_malachitebft_app_channel::Channels;
use informalsystems_malachitebft_config::{ConsensusConfig, ValueSyncConfig, ValuePayload};
use informalsystems_malachitebft_core_types::Height as _;
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, PublicKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::sync::Mutex;

use crate::codec::OpenHlCodec;
use crate::context::OpenHlContext;
use crate::signing_provider::OpenHlSigningProvider;
use crate::types::{OpenHlAddress, OpenHlHeight, OpenHlValidatorSet};
\`\`\`

このファイルが必要とする全表面。一度眺める価値: \`Node\`, \`NodeConfig\`, \`NodeHandle\` がこれから impl する 3 つの Malachite trait。\`EngineHandle\` + \`Channels\` が \`start_engine\` の戻り値。\`ConsensusConfig\` + \`ValueSyncConfig\` + \`ValuePayload\` が \`OpenHlConfig\` に埋め込む config 型。\`Keypair\` は libp2p の keypair 型。\`PrivateKey\`/\`PublicKey\` は L7 以来使っている Ed25519 型。\`Sha256\` は address 導出用。

次に \`OpenHlConfig\`:

\`\`\`rust
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenHlConfig {
    pub moniker: String,
    #[serde(flatten)]
    pub consensus: ConsensusConfig,
    pub value_sync: ValueSyncConfig,
}

impl OpenHlConfig {
    #[must_use]
    pub fn new(moniker: impl Into<String>) -> Self {
        // OpenHL runs ProposalOnly (no streaming proposal parts) — must match
        // our \`Context::ProposalPart\` shape.
        let consensus = ConsensusConfig {
            value_payload: ValuePayload::ProposalOnly,
            ..ConsensusConfig::default()
        };
        Self {
            moniker: moniker.into(),
            consensus,
            value_sync: ValueSyncConfig::default(),
        }
    }
}

impl NodeConfig for OpenHlConfig {
    fn moniker(&self) -> &str {
        &self.moniker
    }
    fn consensus(&self) -> &ConsensusConfig {
        &self.consensus
    }
    fn value_sync(&self) -> &ValueSyncConfig {
        &self.value_sync
    }
}
\`\`\`

3 つのピース:

- struct は \`ConsensusConfig\` + \`ValueSyncConfig\` をラップし、\`moniker\` (ログ用 validator のニックネーム) を追加。\`consensus\` の \`#[serde(flatten)]\` は consensus フィールドを親に inline する — ディスクへシリアライズ時、ユーザーには \`[consensus]\` セクションのキーが top level に見え、\`consensus.\` の下にネストされない。
- \`new()\` は重要な選択を 1 つ強制する: \`value_payload: ValuePayload::ProposalOnly\`。これは **必ず** \`Context::ProposalPart = OpenHlProposalPart\` (unit struct) と合致しなければならない。誤って \`ValuePayload::PartsOnly\` を設定すると、エンジンはストリームされる proposal parts を期待し、unit-struct な \`ProposalPart\` はエンジンが送るものを満たせない。これは構築時に強制する方が後でデバッグするより簡単なタイプの不変条件。
- \`NodeConfig\` impl は 3 個の自明な accessor。trait は、Malachite が親のレイアウトを知らずに sub-config を取り出せるようにあるだけ。

### Step 3: \`OpenHlGenesis\` と \`OpenHlPrivateKeyFile\`

次:

\`\`\`rust
/// Genesis is a unit struct at v0 — the validator set is passed directly to
/// \`start_engine\` rather than read from disk. When \`OpenHL\` grows a real
/// on-disk genesis format this becomes the \`load_genesis()\` return.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct OpenHlGenesis;

/// Wire-friendly wrapper around the raw 32-byte Ed25519 private key.
#[derive(Clone, Serialize, Deserialize)]
pub struct OpenHlPrivateKeyFile {
    pub bytes: [u8; 32],
}

impl OpenHlPrivateKeyFile {
    #[must_use]
    pub fn from_private_key(sk: &PrivateKey) -> Self {
        Self {
            bytes: sk.inner().to_bytes(),
        }
    }

    #[must_use]
    pub fn into_private_key(self) -> PrivateKey {
        PrivateKey::from(self.bytes)
    }
}

impl std::fmt::Debug for OpenHlPrivateKeyFile {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OpenHlPrivateKeyFile")
            .field("bytes", &"[redacted]")
            .finish()
    }
}
\`\`\`

2 つの型:

- **\`OpenHlGenesis\`** — unit struct。v0 では genesis content がない (allocation なし、ブート時の precompile 登録なし — それらは Module 6 で)。Validator set は genesis ではなく \`start_engine\` 経由で直接渡す。OpenHL が real genesis format を持つようになったら、これが \`load_genesis()\` がデシリアライズする型になる。
- **\`OpenHlPrivateKeyFile\`** — 32 バイトの private key の wire-friendly wrapper。\`PrivateKey\` 自体 (from \`malachitebft_signing_ed25519\`) はデフォルトで \`Serialize\`/\`Deserialize\` を impl していない; wrapper が impl し、\`from_private_key\` / \`into_private_key\` の変換は明示的。**手書き \`Debug\` impl** はバイトを redact する — \`{:?}\` で実 private key をログに出力するのは重大なセキュリティバグ。\`[redacted]\` トークンが慣習。

> 🛑 **やりがちな勘違い。** 「なぜ \`#[derive(Debug)]\` ではダメ?」 **デフォルト derive される \`Debug\` は \`[u8; 32]\` の 32 バイト全部を print するから。** 誰かが \`OpenHlPrivateKeyFile\` を別の \`Debug\`-derive 構造体でラップしてログに出すと、key が stderr / log file / Sentry にリークする。\`[redacted]\` 付き手書き \`Debug\` なら、意図的に変更しない限りこれは起こりえない。**Private key はパスワードと同等に扱う — 絶対に print させない。**

### Step 4: \`OpenHlNodeHandle\` — \`start()\` が返すもの

\`\`\`rust
/// Handle returned by [\`OpenHlNode::start\`]. Owns the engine actor system
/// and the channel handles for the (yet-to-be-implemented) app loop.
pub struct OpenHlNodeHandle {
    engine: EngineHandle,
    channels: Mutex<Option<Channels<OpenHlContext>>>,
}

impl std::fmt::Debug for OpenHlNodeHandle {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OpenHlNodeHandle")
            .field("engine", &"<EngineHandle>")
            .field("channels", &"<Channels>")
            .finish()
    }
}

impl OpenHlNodeHandle {
    /// Take ownership of the engine→app message channels. Returns None on
    /// the second call. L10 will consume from this to drive the bridge.
    pub async fn take_channels(&self) -> Option<Channels<OpenHlContext>> {
        self.channels.lock().await.take()
    }
}

#[async_trait]
impl NodeHandle<OpenHlContext> for OpenHlNodeHandle {
    fn subscribe(&self) -> informalsystems_malachitebft_app::events::RxEvent<OpenHlContext> {
        // No event subscription in Stage 6c — caller can't yet observe engine
        // events. L10 wires the TxEvent from the engine to here.
        informalsystems_malachitebft_app::events::TxEvent::new().subscribe()
    }

    async fn kill(&self, _reason: Option<String>) -> eyre::Result<()> {
        self.engine.actor.kill_and_wait(None).await?;
        self.engine.handle.abort();
        Ok(())
    }
}
\`\`\`

ハンドルは 2 つを所有する:

- **\`engine: EngineHandle\`** — spawn された actor system に対する Malachite のハンドル。\`actor\` (ractor の \`ActorCell\`) と \`handle\` (tokio task handle) を持つ。\`kill()\` は両方をクリーンに tear down する。
- **\`channels: Mutex<Option<Channels<OpenHlContext>>>\`** — アプリケーション側のエンドポイント。エンジンが \`AppMsg<OpenHlContext>\` を我々に送り、我々が \`AppReply<OpenHlContext>\` を返す。\`Mutex<Option<...>>\` なのは、\`take_channels()\` が app loop に 1 回だけ渡せるようにするため — 2 回目の呼び出しは \`None\` を返し「もう消費済み」と知らせる。

**なぜ \`tokio::sync::Mutex\` で \`std::sync::Mutex\` ではない?** \`take_channels()\` が \`async\` で、ロックが \`.await\` 境界を跨いで保持されるから。\`std::sync::Mutex\` は executor スレッド全体をブロックしてしまう; \`tokio::sync::Mutex\` は協調的に yield する。

\`NodeHandle\` impl はこの段階ではほぼ placeholder:
- \`subscribe()\` は **新規** \`TxEvent::subscribe()\` を返す — producer が attach されていない空のイベントストリーム。L10 で本物を配線する。
- \`kill()\` は本物 — actor cell を kill し tokio task を abort する。これが \`start_engine_smoke_spawns_and_kills\` で exercise されるもの。

### Step 5: \`OpenHlNode\` struct + \`Node\` impl

\`\`\`rust
#[derive(Clone, Debug)]
pub struct OpenHlNode {
    pub private_key: PrivateKey,
    pub validator_set: OpenHlValidatorSet,
    pub home_dir: PathBuf,
    pub moniker: String,
}

impl OpenHlNode {
    #[must_use]
    pub fn new(
        private_key: PrivateKey,
        validator_set: OpenHlValidatorSet,
        home_dir: PathBuf,
        moniker: impl Into<String>,
    ) -> Self {
        Self {
            private_key,
            validator_set,
            home_dir,
            moniker: moniker.into(),
        }
    }
}

#[async_trait]
impl Node for OpenHlNode {
    type Context = OpenHlContext;
    type Config = OpenHlConfig;
    type Genesis = OpenHlGenesis;
    type PrivateKeyFile = OpenHlPrivateKeyFile;
    type SigningProvider = OpenHlSigningProvider;
    type NodeHandle = OpenHlNodeHandle;

    fn get_home_dir(&self) -> PathBuf {
        self.home_dir.clone()
    }

    fn load_config(&self) -> eyre::Result<Self::Config> {
        let mut cfg = OpenHlConfig::new(&self.moniker);
        // Bind to an ephemeral port on localhost so tests and devnets don't
        // step on each other. Real deployments override this in their config.
        cfg.consensus.p2p.listen_addr = "/ip4/127.0.0.1/tcp/0"
            .parse()
            .map_err(|e| eyre!("invalid listen_addr: {e}"))?;
        Ok(cfg)
    }

    fn get_address(&self, pk: &PublicKey) -> OpenHlAddress {
        let digest = Sha256::digest(pk.as_bytes());
        let mut addr = [0u8; 20];
        addr.copy_from_slice(&digest[12..32]);
        OpenHlAddress(addr)
    }

    fn get_public_key(&self, pk: &PrivateKey) -> PublicKey {
        pk.public_key()
    }

    fn get_keypair(&self, pk: PrivateKey) -> Keypair {
        Keypair::ed25519_from_bytes(pk.inner().to_bytes())
            .expect("ed25519 private key is always 32 bytes")
    }

    fn load_private_key(&self, file: Self::PrivateKeyFile) -> PrivateKey {
        file.into_private_key()
    }

    fn load_private_key_file(&self) -> eyre::Result<Self::PrivateKeyFile> {
        Ok(OpenHlPrivateKeyFile::from_private_key(&self.private_key))
    }

    fn load_genesis(&self) -> eyre::Result<Self::Genesis> {
        // Validator set is passed directly to start_engine; genesis carries
        // nothing else at v0.
        Ok(OpenHlGenesis)
    }

    fn get_signing_provider(&self, private_key: PrivateKey) -> Self::SigningProvider {
        OpenHlSigningProvider::new(private_key)
    }

    async fn start(&self) -> eyre::Result<Self::NodeHandle> {
        let cfg = self.load_config()?;
        let validator_set = self.validator_set.clone();

        let (channels, engine) = informalsystems_malachitebft_app_channel::start_engine(
            OpenHlContext,
            self.clone(),
            cfg,
            OpenHlCodec, // WAL
            OpenHlCodec, // Network
            Some(OpenHlHeight::INITIAL),
            validator_set,
        )
        .await?;

        Ok(OpenHlNodeHandle {
            engine,
            channels: Mutex::new(Some(channels)),
        })
    }

    async fn run(self) -> eyre::Result<()> {
        // L10 will consume from channels here and run the app loop.
        Err(eyre!("OpenHlNode::run is not yet implemented (L10)"))
    }
}
\`\`\`

これが load-bearing なブロック。walk-through:

**struct** は 4 つを持つ: private key、validator set、home dir、moniker。これらは config-reload では変わらない長命なフィールド。

**6 個の関連型** は各ハンドシェイクスロットの具象型を宣言する:
- \`Context = OpenHlContext\` — Malachite が他をすべて typecheck するのに使う
- \`Config = OpenHlConfig\` — \`load_config()\` の戻り値
- \`Genesis = OpenHlGenesis\` — \`load_genesis()\` の戻り値
- \`PrivateKeyFile = OpenHlPrivateKeyFile\` — \`load_private_key_file()\` の戻り値
- \`SigningProvider = OpenHlSigningProvider\` — \`get_signing_provider()\` の戻り値
- \`NodeHandle = OpenHlNodeHandle\` — \`start()\` の戻り値

**12 個のメソッド**:

| メソッド | 目的 | 本体 |
| - | - | - |
| \`get_home_dir\` | Node がデータを保存する場所 | 構築時に渡された path を返す |
| \`load_config\` | Config を作る (再呼出可) | \`OpenHlConfig\` を構築し、listen address をエフェメラル local にオーバーライド |
| \`get_address\` | SHA-256 ハッシュ → 20 バイト address | 32 バイト digest の最後の 20 バイト |
| \`get_public_key\` | SK から PK | \`sk.public_key()\` |
| \`get_keypair\` | Ed25519 から libp2p Keypair | \`ed25519_from_bytes\` 経由で変換 |
| \`load_private_key\` | File フォーマットを unwrap | \`file.into_private_key()\` |
| \`load_private_key_file\` | PK を file フォーマットへ | \`OpenHlPrivateKeyFile::from_private_key(...)\` |
| \`load_genesis\` | Genesis を読む | \`OpenHlGenesis\` を返す (unit struct、読むものなし) |
| \`get_signing_provider\` | SigningProvider を構築 | \`OpenHlSigningProvider::new(pk)\` |
| \`start\` | エンジン spawn | \`start_engine\` を 7 引数で呼び、戻り値を \`OpenHlNodeHandle\` にラップ |
| \`run\` | App loop を回す | **L9 では未実装** — L10 を指すエラーを返す |

**\`start()\` メソッドがハイライト。** \`start_engine\` を以下で呼ぶ:
- context (\`OpenHlContext\` — unit struct)
- node 自身 (\`self.clone()\`)
- config (\`cfg\`)
- 2 個の codec 値 (WAL 用と Network 用 — 両方 \`OpenHlCodec\`)
- 初期 height (\`Some(OpenHlHeight::INITIAL)\`)
- validator set (\`validator_set\`)

\`start_engine\` が返すもの: \`(Channels<OpenHlContext>, EngineHandle)\`。これらを \`OpenHlNodeHandle\` にラップして返す。

**なぜ \`run()\` は未実装?** Malachite の \`Node::run\` は \`start()\` と app loop を 1 個の async future にまとめる想定だから。App loop は L10 まで存在しないので、L10 を指すエラーを返す。L10 完了後、\`run()\` は: \`start()\` を呼び、channels を取り、app loop を回し、終了を await、という形になる。

> 🛑 **やりがちな勘違い。** 「なぜ \`start()\` は codec を 2 回取る?」 **エンジンが WAL 用と Network gossip 用に別々の codec スロットを持つから。** 別の型でもよい — 例えば WAL は bincode、Network は protobuf。我々のケースでは両方 \`OpenHlCodec\` だが、API は同じだと仮定しない。別々に渡すことで一方だけを swap できる。

### Step 6: \`node.rs\` を \`lib.rs\` に配線

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod codec;
pub mod context;
pub mod node;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

### Step 7: ユニットテストを 4 個追加

\`node.rs\` の末尾:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::OpenHlValidator;
    use rand::rngs::OsRng;

    fn single_validator_node(home_dir: PathBuf) -> OpenHlNode {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let digest = Sha256::digest(pk.as_bytes());
        let mut addr_bytes = [0u8; 20];
        addr_bytes.copy_from_slice(&digest[12..32]);
        let address = OpenHlAddress(addr_bytes);
        let validator_set = OpenHlValidatorSet::new(vec![OpenHlValidator::new(address, pk, 1)]);
        OpenHlNode::new(sk, validator_set, home_dir, "openhl-test")
    }

    #[test]
    fn private_key_file_round_trips() {
        let sk = PrivateKey::generate(OsRng);
        let file = OpenHlPrivateKeyFile::from_private_key(&sk);
        let restored = file.into_private_key();
        assert_eq!(restored.inner().to_bytes(), sk.inner().to_bytes());
    }

    #[test]
    fn load_config_sets_proposal_only_payload_and_ephemeral_listen_addr() {
        let tmp = tempfile::tempdir().unwrap();
        let node = single_validator_node(tmp.path().to_path_buf());
        let cfg = node.load_config().unwrap();
        assert_eq!(cfg.consensus.value_payload, ValuePayload::ProposalOnly);
        // listen_addr should be /ip4/127.0.0.1/tcp/0 (ephemeral)
        let listen_str = cfg.consensus.p2p.listen_addr.to_string();
        assert!(
            listen_str.starts_with("/ip4/127.0.0.1/tcp/0"),
            "unexpected listen_addr: {listen_str}"
        );
    }

    #[test]
    fn get_address_matches_runner_derivation() {
        let tmp = tempfile::tempdir().unwrap();
        let node = single_validator_node(tmp.path().to_path_buf());
        let pk = node.private_key.public_key();
        let addr1 = node.get_address(&pk);
        // Same derivation as runner.rs (last 20 bytes of SHA-256(pubkey)).
        let digest = Sha256::digest(pk.as_bytes());
        let mut expected = [0u8; 20];
        expected.copy_from_slice(&digest[12..32]);
        assert_eq!(addr1, OpenHlAddress(expected));
    }

    /// Smoke test: spin up the actor system, get a handle back, kill cleanly.
    /// Does NOT drive consensus — that's L10.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn start_engine_smoke_spawns_and_kills() {
        let tmp = tempfile::tempdir().unwrap();
        let node = single_validator_node(tmp.path().to_path_buf());
        let handle = match node.start().await {
            Ok(h) => h,
            Err(e) => panic!("start_engine failed: {e:?}"),
        };
        // Sanity-poke the channels handle is available exactly once.
        assert!(handle.take_channels().await.is_some());
        assert!(handle.take_channels().await.is_none());
        handle.kill(None).await.unwrap();
    }
}
\`\`\`

テスト 4 個:

1. **\`private_key_file_round_trips\`** — key を generate し、\`OpenHlPrivateKeyFile\` にラップ、unwrap、byte 等価を assert。Wire format が lossless であることを証明。
2. **\`load_config_sets_proposal_only_payload_and_ephemeral_listen_addr\`** — node を構築し、\`load_config()\` を呼び、2 つを検証: \`value_payload == ProposalOnly\` (構築時に強制する不変条件) と \`listen_addr\` がエフェメラル local socket であること。Config drift を catch する。
3. **\`get_address_matches_runner_derivation\`** — 同じ address を 2 通りで導出する (1 度は trait method 経由、1 度は SHA-256 ロジックを inline)。一致を assert。誰かが片方だけ変えたら検知する。
4. **\`start_engine_smoke_spawns_and_kills\`** — capstone。\`#[tokio::test(flavor = "multi_thread", worker_threads = 2)]\` を使うのはエンジンが multi-threaded runtime を必要とするから (複数 actor を spawn)。手順: single-validator node を構築、\`node.start().await\` を呼ぶ、channels handle を poke (1 度目 \`Some\`、2 度目 \`None\`)、\`kill()\` を呼ぶ。**これが pass すれば、自分のコードが動く BFT エンジンになっている。**

Smoke test の wall-clock はおおよそ **0.02 秒**。大部分は libp2p がローカル listener を立ち上げる時間 — tcp/0 のエフェメラルポートでも、libp2p のネゴシエーションには固定コストがある。

> 🛑 **やりがちな勘違い。** 「なぜ \`flavor = 'multi_thread'\`?」 **エンジンが複数 actor をそれぞれの task で spawn するから。** Single-threaded runtime は全部 1 スレッドで回せる — が、エンジン内部に single-thread だと deadlock する \`block_on\` パターンがある。Multi-thread runtime で回避。**API レベルでは見えないが、テスト失敗レベルでは致命的な詳細。**

## テスト

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

~20 秒後 (dep 変更後の初回コンパイル):

\`\`\`
running 20 tests
test codec::tests::openhl_codec_satisfies_all_three_super_traits ... ok
test codec::tests::proposal_part_round_trips ... ok
test context::tests::height_increment_and_decrement ... ok
test context::tests::new_prevote_and_precommit_have_distinct_types ... ok
test context::tests::new_proposal_round_trips_fields ... ok
test context::tests::select_proposer_round_robins_deterministically ... ok
test context::tests::validator_set_is_sorted_by_power_then_address ... ok
test node::tests::get_address_matches_runner_derivation ... ok
test node::tests::load_config_sets_proposal_only_payload_and_ephemeral_listen_addr ... ok
test node::tests::private_key_file_round_trips ... ok
test signing::tests::vote_signature_is_field_sensitive ... ok
test signing::tests::vote_signature_round_trips ... ok
test signing_provider::tests::proposal_part_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_tamper_detected ... ok
test signing_provider::tests::signature_from_one_provider_does_not_verify_under_another ... ok
test signing_provider::tests::vote_extension_sign_verify_round_trips ... ok
test signing_provider::tests::vote_sign_verify_round_trips ... ok
test signing_provider::tests::vote_tamper_detected ... ok
test node::tests::start_engine_smoke_spawns_and_kills ... ok

test result: ok. 20 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Smoke test は multi-thread runtime のセットアップで最後に走る。

よくあるエラーと対処:

- **\`error[E0432]: unresolved import 'informalsystems_malachitebft_app_channel'\`** — Cargo.toml に \`app-channel\` がない。Step 1 を再確認。
- **\`error[E0277]: PrivateKey: Deserialize is not satisfied\`** — \`signing-ed25519\` の \`serde\` feature が抜けている。Step 1 (\`features = ["rand", "serde"]\`) を再確認。
- **smoke test が永久にハングする** — 普通は \`flavor = "current_thread"\` (\`#[tokio::test]\` のデフォルト) が原因。Step 7 を再確認: 属性は \`#[tokio::test(flavor = "multi_thread", worker_threads = 2)]\` でなければならない。
- **\`error: Keypair::ed25519_from_bytes expected mutable bytes\`** — バージョン不一致。libp2p の \`Keypair::ed25519_from_bytes\` のシグネチャはバージョンによって変わる; workspace pin は \`informalsystems-malachitebft-app\` の re-export と揃える必要がある。
- **\`Address derivation does not match\`** — \`get_address\` がテストの helper と一致しない。両方とも \`SHA-256(pubkey)\` の最後の 20 バイト — slice \`[12..32]\` — を使う必要がある。

## 設計の振り返り

3 つの load-bearing な決定:

1. **\`OpenHlNode\` はハンドシェイクインターフェースであり、ランタイムではない。** Struct は長命なフィールド (key、validator set、home dir、moniker) を持つ。chain を **走らせ** ない。ランタイムは \`OpenHlNodeHandle\` (engine + channels) にあり、\`start()\` から返る。**構築と実行は別のライフサイクルステージ** なので、別の型に住む。

2. **Address 導出は \`get_address\` に集約。** L6 のセットアップコードの runner で \`SHA-256(pubkey)[12..32]\` を使ったとき、**同じ導出** だった。テスト \`get_address_matches_runner_derivation\` がそれらが同一であることを assert するので、将来のリファクタで一方だけがサイレントに drift できない。**集約 + 検証テスト は重複に毎回勝つ。**

3. **\`run()\` は次のレッスンを指すエラーを返す。** \`unimplemented!()\` (panic) や \`todo!()\` (これも panic) ではなく、\`eyre::Result::Err("not yet implemented (L10)")\` は **型安全な placeholder**。\`run()\` を呼ぶコードは「どこを見るべきか」を指すメッセージ付きで graceful に失敗する。**これはプルリク、コードレビュー、放置されたタブを越えて生き残るタイプの目印。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout d59d6cf
diff -u ~/code/my-openhl/crates/consensus/src/node.rs ./crates/consensus/src/node.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

\`d59d6cf\` の参照には 310 行の \`node.rs\` が含まれる。\`Node\` impl のメソッド (合計 12)、struct レイアウト、smoke test は厳密に一致するべき。Doc コメントと細かい言い回しは個人差可。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: validator set が node の中にあるのに、なぜ \`start_engine\` は node と validator set の両方を要求する?**
エンジンが node の内部に手を伸ばさないから。Node は多くのフィールド (path、moniker、key 等) を持つが、validator-set election には関係ない。\`start_engine\` が validator set を明示的に受け取るので、エンジンは自分の node の具体的なフィールドレイアウトを知らなくてもよい。\`Node::load_config()\` と同じ関心の分離の原則。

**Q: コンパイル時アサーションが証明しないものを smoke test は何を証明する?**
L8 のコンパイル時アサーションは \`OpenHlCodec: WalCodec + ConsensusCodec + SyncCodec\` を証明した。Smoke test は **runtime** パス — actor spawning、channel allocation、libp2p binding、kill propagation — が end-to-end で実際に動くことを証明する。型安全性は必要条件だが十分条件ではない; テストは「spawn deadlock」「最初のメッセージでエンジンが panic する」など型では catch できないことを catch する。

**Q: \`EngineHandle\` と \`NodeHandle\` の違いは?**
\`EngineHandle\` (Malachite から) は spawn された actor system への低レベルハンドル — actor cell、tokio task handle。\`NodeHandle\` (自分の trait) は Malachite が「これはまだ生きているか? イベントを subscribe してくれ。kill しろ。」と尋ねるための高レベル抽象。自分の \`OpenHlNodeHandle\` は \`NodeHandle<OpenHlContext>\` を impl し、内部に \`EngineHandle\` を持つ。2 層あり、扱うのは 1 つだけ。

**Q: なぜ \`take_channels\` は単に channels を削除せず \`Option<Channels<...>>\` を使う?**
\`take_channels\` は **外側から** 呼ばれるから — app loop が消費したい。完全に削除するには mutable 参照かハンドル自体の move が必要。\`Mutex<Option<...>>\` なら app loop は共有参照 (\`&self\`) 経由で呼べ、channels を 1 度取得し、以降の呼び出しは \`None\` を見る — 「もう取った」というクリーンなシグナル。

## 次のレッスン (L10)

エンジンが動く状態になった。だが — 致命的に — **エンジンが我々にメッセージを送っているのに我々は無視している**。Actor system は parked 状態で、app loop が \`Channels<OpenHlContext>\` から消費して \`AppMsg::ProposeValue\`, \`AppMsg::Decided\` などに応答するのを待っている。L10 で app loop を実装する: channel に対する \`tokio::select\` + state struct + エンジンメッセージを \`InMemoryEvmBridge\` にルートするハンドラ。L10 完了で \`cargo test first_block_via_engine_actors\` が full engine pipeline 経由で実 block を produce する。`,
                },
              ],
            },
          },
          {
            title: "Engine integration",
            sortOrder: 5,
            lessons: {
              create: [
                {
                  title: "レッスン 10 — run_engine_app と actor pipeline 経由の最初のブロック",
                  slug: "openhl-engine-app-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 55,
                  xpReward: 100,
                  content: `# レッスン 10 — \`run_engine_app\` と actor pipeline 経由の最初のブロック

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

…が **21 個のテストすべてに合格する** (L9 から 20 個 + 新規 integration test 1 個)。新規テスト:

\`\`\`
test engine_app::tests::first_block_via_engine_actors ... ok
\`\`\`

…が Malachite actor system を spawn し、real consensus round をそこに駆動し、engine が decide した hash を bridge が正確に commit したことを assert する。**Wall-clock: 0.02 秒。** これが「engine boot する」から「engine が block を produce する」へ移行するマイルストーン。

新規ファイルが 1 つ:

- **\`crates/consensus/src/engine_app.rs\`** — app loop。\`Channels<OpenHlContext>::consensus\` から \`AppMsg<OpenHlContext>\` を読み、各 variant を route する: bridge 経由で payload を build し、\`GetValue\` に \`LocallyProposedValue\` で reply し、bridge 経由で decided value を commit し、decided hash の list を返す。

## おさらい

L9 完了時点で \`openhl-consensus\` crate には以下がある:

\`\`\`
crates/consensus/src/lib.rs               — pub mod bridge, codec, context, node, signing, signing_provider, types
crates/consensus/src/node.rs              — OpenHlNode + start_engine works (smoke test 合格)
crates/consensus/src/codec.rs             — OpenHlCodec
crates/consensus/src/signing_provider.rs  — SigningProvider impl
crates/consensus/src/context.rs           — Context impl
crates/consensus/src/types/               — 型ファイル 7 個
crates/consensus/src/bridge.rs            — ConsensusBridge trait + InMemoryEvmBridge
\`\`\`

\`cargo test -p openhl-consensus\` でテスト 20 個が合格。Engine は起動・終了するが — **silent**。\`start_engine\` が返ると同時に engine の actor は \`AppMsg::ConsensusReady\` を送り reply を待つ。誰も reply しない。Actor は parked になる。**L10 がそこを修正する。**

## 計画

5 つやる:

1. **\`crates/consensus/Cargo.toml\` に \`tracing\` を追加** — loop の「channel-closed」パスで \`tracing::warn!\` を使う。
2. **\`crates/consensus/src/engine_app.rs\` を作成** — \`B: ConsensusBridge\` に対してジェネリックな async 関数 \`run_engine_app<B>\` と \`default_attrs()\` ヘルパー。routing logic 約 130 行。
3. **\`pub mod engine_app;\`** を \`lib.rs\` に配線。
4. **integration test \`first_block_via_engine_actors\`** と \`StubBridge\` test fixture (\`ConsensusBridge\` を同期的にインメモリで impl) を追加。
5. **実行** — \`cargo test -p openhl-consensus first_block_via_engine_actors\` が ~0.02 秒で合格。**じっくり見届けよう。**

このレッスンが教えるのは **actor-message-loop パターン**。ほとんどの consensus engine (CometBFT、Hotstuff、Aura) は **何らかの** 「application interface」を持つが、形は様々: callback、gRPC service、FFI バインディング。Malachite のアプローチは型付きメッセージの \`tokio::mpsc\` チャネル — 強型、async-native、チャネルごとに single-threaded。\`run_engine_app\` はそれらメッセージの **consumer**; engine actor は **producer**。**このパターンを理解すれば、どの chain フレームワークの「application interface」もそのバリアントに帰着する。**

> 🛑 **考えてみよう。** スクロールする前に: engine が \`AppMsg::GetValue\` (「次の block を propose しろ」) を送るとき、app はなぜ \`BlockHash\` だけでなく \`LocallyProposedValue(height, round, value)\` で reply するのか? ヒント: engine が rest-of-consensus を通じて wire する value は、commit する value。hash だけ送ったら、engine は他の validator に proposal の内容を gossip したり certificate に含めたりする手段がない。**ラップが value を BFT machine 内で first-class にする。**(我々の single-validator devnet では他の validator は gossip を受け取らないが — engine は自分が solo で走っていることを **知らない**。)

## 手順

### Step 1: Cargo.toml に \`tracing\` を追加

\`crates/consensus/Cargo.toml\` を開く。L9 後、\`[dependencies]\` セクションは次で終わっている:

\`\`\`toml
sha2                                          = "0.10"
serde                                         = { workspace = true }
tokio                                         = { workspace = true }
\`\`\`

1 行追加:

\`\`\`toml
tracing                                       = { workspace = true }
\`\`\`

\`tracing\` は workspace 標準の logging crate — ここでは \`tracing::warn!\` を 1 ケースだけ使う: reply channel が、engine が会話途中で終了したために閉じている場合。\`tokio::mpsc::oneshot\` の closed reply channel は我々のコードのバグではない; 上流が諦めたサイン。ログするが伝播はしない。

### Step 2: \`crates/consensus/src/engine_app.rs\` を作成 — import と signature

モジュール doc + import から:

\`\`\`rust
//! Engine app loop — consumes \`AppMsg\` from the Malachite engine and routes
//! every consensus-relevant event through a [\`ConsensusBridge\`].
//!
//! This is the missing half of L9: with \`OpenHlNode::start()\` spinning
//! up the actor system, this loop is what makes those actors do useful work.
//! Once a \`Decided\` arrives we commit through the bridge, increment height,
//! and (optionally) stop after N decisions for tests.

use std::sync::Arc;

use eyre::eyre;
use informalsystems_malachitebft_app::engine::host::Next;
use informalsystems_malachitebft_app_channel::{AppMsg, Channels};
use informalsystems_malachitebft_core_types::Height as _;
use openhl_types::{BlockHash, PayloadAttrs};

use crate::bridge::ConsensusBridge;
use crate::context::OpenHlContext;
use crate::types::{OpenHlHeight, OpenHlValidatorSet, OpenHlValue};

const APP_REPLY_WAIT_LOG: &str = "engine_app: peer replied unsuccessfully (channel closed)";
\`\`\`

注目の import:

- **\`AppMsg, Channels\`** from \`app_channel\` — メッセージ enum と channel-bundle 型。\`Channels::consensus\` が \`AppMsg<Ctx>\` の mpsc receiver。
- **\`Next\`** from \`app::engine::host\` — \`Decided\` の reply で engine に「次は何?」を伝える enum (次の height を start、停止、など)。
- **\`Height as _\`** — trait \`Height\` を import するが (\`.increment()\` メソッドを使うため)、名前を scope に入れない (自前の \`OpenHlHeight\` newtype を使うので)。
- **\`Arc\`** — \`run_engine_app\` は bridge を \`Arc<B>\` で取り、long-running task に reference を clone できるようにする。

次に関数 signature:

\`\`\`rust
/// Drive the engine app loop until \`stop_after_decisions\` decisions have been
/// committed through the bridge, or the consensus channel closes.
///
/// Returns the \`BlockHash\`es that were decided, in order. Single-validator mode
/// uses this with \`stop_after_decisions = 1\` to exit after the first block.
#[allow(clippy::too_many_lines)] // 12 AppMsg arms — laid out flat for lesson L11's match-by-match walk
pub async fn run_engine_app<B>(
    bridge: Arc<B>,
    mut channels: Channels<OpenHlContext>,
    validator_set: OpenHlValidatorSet,
    stop_after_decisions: usize,
) -> eyre::Result<Vec<BlockHash>>
where
    B: ConsensusBridge + 'static,
{
    let mut decided: Vec<BlockHash> = Vec::new();
    let mut current_parent = BlockHash([0u8; 32]);
    let mut current_height = OpenHlHeight::INITIAL;

    while let Some(msg) = channels.consensus.recv().await {
        match msg {
            // ... 12 arms come here ...
        }
    }

    Err(eyre!(
        "consensus channel closed after {n} decisions (wanted {stop_after_decisions})",
        n = decided.len()
    ))
}
\`\`\`

5 個のパラメータ/状態:

- **\`bridge: Arc<B>\`** — \`build_payload\`, \`payload_ready\`, \`commit\` で app loop が呼ぶ \`ConsensusBridge\` 実装。後で share したいので \`Arc\`。\`B\` がジェネリックなので、同じ loop が \`InMemoryEvmBridge\`, \`RethEvmBridge\`, \`LiveRethEvmBridge\` (L12) で動く。
- **\`channels: Channels<OpenHlContext>\`** — value で取る (それから \`mut\` にして \`recv\` を呼ぶ)。呼び出し側で \`take_channels()\` した後の channels を所有する。
- **\`validator_set: OpenHlValidatorSet\`** — \`ConsensusReady\` と \`GetValidatorSet\` で echo back する single-validator set。
- **\`stop_after_decisions: usize\`** — test 用エルゴノミクス。Single-validator devnet では \`1\`、multi-validator デプロイでは \`usize::MAX\`。

3 個の loop 状態:

- **\`decided: Vec<BlockHash>\`** — アキュムレータ; 終了時に返す。
- **\`current_parent: BlockHash\`** — **次の** block が積み上がる先。全ゼロ (genesis) から始まり、commit ごとに just-decided hash になる。
- **\`current_height: OpenHlHeight\`** — engine が今いる height。\`INITIAL\` から始まり、\`StartedRound\` と \`Decided\` で bumped される。

\`while let Some(msg) = channels.consensus.recv().await\` loop が actor-message app の心臓: message を receive、variant で dispatch、(applicable なら) reply、continue。\`recv()\` が \`None\` を返したら channel が閉じている — それが error path。

### Step 3: \`ConsensusReady\` と \`StartedRound\` の arm

\`match\` 内に追加:

\`\`\`rust
            AppMsg::ConsensusReady { reply, .. } => {
                if reply
                    .send((current_height, validator_set.clone()))
                    .is_err()
                {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ConsensusReady)");
                }
            }

            AppMsg::StartedRound {
                height,
                round: _,
                reply_value,
                ..
            } => {
                current_height = height;
                if reply_value.send(Vec::new()).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (StartedRound)");
                }
            }
\`\`\`

**\`ConsensusReady\`** は engine からの「consensus を start していい? どの height でどの validator set で?」という問い。Reply は tuple \`(current_height, validator_set.clone())\`。各 \`reply\` は \`oneshot::Sender<...>\` — \`send()\` はそれを consume し、\`Result<(), T>\` を返す (\`T\` は送ろうとしたもの、エラー時返却)。Closed reply channel から回復しない; 単にログする。

**\`StartedRound\`** は engine が「ある height で new round が始まった」と教えてくれるもの。\`current_height\` を更新し、空の \`Vec\` で reply する (この height で格納済みの proposed value のリスト; 何も cache していない)。\`round: _\` で round 値を unbind するのは single-validator mode では不要だから — peer がない場合、engine は round 間で value を gossip-restream しない。

### Step 4: \`GetValue\` arm — proposal を build

これが load-bearing な arm。追加:

\`\`\`rust
            AppMsg::GetValue {
                height,
                round,
                timeout: _,
                reply,
            } => {
                let attrs = default_attrs();
                let id = bridge.build_payload(current_parent, attrs).await?;
                let block = bridge.payload_ready(id).await?;
                let value = OpenHlValue(block.hash);
                let lpv =
                    informalsystems_malachitebft_app_channel::app::types::LocallyProposedValue::new(
                        height, round, value,
                    );
                if reply.send(lpv).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetValue)");
                }
            }
\`\`\`

Engine から「height H、round R で value を propose しろ、timeout T」。我々は:

1. **payload attrs を build** — 今のところデフォルト値 (\`timestamp: 0, fee_recipient: zero, prev_randao: zero\`)。L12 ではこれらが engine の時刻概念 + validator の address から来る。
2. **\`bridge.build_payload(current_parent, attrs).await\`** — EL を蹴る: 「\`current_parent\` の上に、これら attrs で block を build しろ」。\`PayloadId\` を返す — in-flight build を track するために EL が使うハンドル。
3. **\`bridge.payload_ready(id).await\`** — 完了 block を fetch。L4-L5 の in-memory bridge は即座に produce する; live Reth (L12+) は 10-50ms かかるかも。
4. **\`block.hash\` を \`OpenHlValue\` でラップし、さらに \`LocallyProposedValue::new(height, round, value)\` で**ラップ。
5. **engine に \`LocallyProposedValue\` で reply。**

\`build_payload\` と \`payload_ready\` の \`?\` 演算子は \`BridgeError\` を \`eyre::Result\` に伝播する。EL が build 途中で crash したら、app loop はエラーを返し、テストは loud に失敗する。

> 🛑 **やりがちな勘違い。** 「なぜ \`GetValue\` は \`OpenHlValue\` だけでなく \`LocallyProposedValue\` で reply するのか?」 **Engine は我々が propose したものを **gossip** する必要があるから、ローカルで使うだけでなく。** \`LocallyProposedValue\` は「この value を **我々が** height H round R で propose した」と言う型付きラッパー。Multi-validator モードでは engine はこれを \`Proposal\` として peer に送る。Single-validator モードでは peer がない — が、API は分岐しないので、ラッパーを honor する。

### Step 5: \`Decided\` arm — block が final になる瞬間

もう一つの load-bearing な arm。追加:

\`\`\`rust
            AppMsg::Decided {
                certificate, reply, ..
            } => {
                let hash = certificate.value_id;
                bridge.commit(hash).await?;
                decided.push(hash);
                current_parent = hash;

                if decided.len() >= stop_after_decisions {
                    // Send a reply so consensus doesn't hang waiting on us before
                    // we drop the channel.
                    let next_height = certificate.height.increment();
                    let _ = reply.send(Next::Start(next_height, validator_set.clone()));
                    return Ok(decided);
                }

                let next_height = certificate.height.increment();
                current_height = next_height;
                if reply
                    .send(Next::Start(next_height, validator_set.clone()))
                    .is_err()
                {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (Decided)");
                }
            }
\`\`\`

Engine は「height H で value が decide された — certificate がこれ」と言う。我々は:

1. **\`certificate.value_id\` から** decided hash を抽出。
2. **\`bridge.commit(hash).await\`** — この block を EL でカノニカルチェイン head として durably mark。In-memory bridge では単に記録、live Reth では forkchoice update を実行。
3. **\`decided\` に append し** \`current_parent\` を更新するので、**次の** \`GetValue\` がこの hash の上に build。
4. **exit 条件チェック** — \`stop_after_decisions\` に達したら \`Next::Start(next_height, ...)\` で reply (engine が hang しないように) して return。**これがテストを 0.02 秒でクリーンに exit させる。**
5. **そうでなければ** \`Next::Start(next_height, validator_set)\` で reply — 「はい、次の height で続けてください、validator set はこれ」 — して loop。

> 🛑 **考えてみよう。** Exit path なのになぜ reply を送る? **\`oneshot::Sender::send\` が、reply を待っている engine actor を unblock する唯一の方法だから。** 単に \`return Ok(decided)\` すると、engine actor は今 drop された sender に対して \`await\` で stuck になり、tear-down が遅くなる (やがて \`kill_and_wait\` がクリーンアップする)。先に reply すれば engine actor は自然に終了し、\`handle.kill(None)\` は inevitable を確認するだけ。

### Step 6: その他 7 arm — stub と no-op

残りの arm は短い。追加:

\`\`\`rust
            AppMsg::ExtendVote { reply, .. } => {
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ExtendVote)");
                }
            }

            AppMsg::VerifyVoteExtension { reply, .. } => {
                if reply.send(Ok(())).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (VerifyVoteExtension)");
                }
            }

            AppMsg::RestreamProposal { .. } => {
                // Single-validator mode never re-streams.
            }

            AppMsg::GetHistoryMinHeight { reply } => {
                if reply.send(OpenHlHeight::INITIAL).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetHistoryMinHeight)");
                }
            }

            AppMsg::ReceivedProposalPart { reply, .. } => {
                // ProposalOnly value-payload mode — proposal parts never arrive.
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ReceivedProposalPart)");
                }
            }

            AppMsg::GetValidatorSet { reply, .. } => {
                if reply.send(Some(validator_set.clone())).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetValidatorSet)");
                }
            }

            AppMsg::GetDecidedValue { reply, .. } => {
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetDecidedValue)");
                }
            }

            AppMsg::ProcessSyncedValue { reply, .. } => {
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ProcessSyncedValue)");
                }
            }
\`\`\`

8 個の arm、4 カテゴリ:

- **Vote extension** (\`ExtendVote\`, \`VerifyVoteExtension\`) — \`None\` / \`Ok(())\` で reply。Vote extension は v0 で未使用 (\`OpenHlSigningProvider::sign_vote_extension\` が空バイトに署名するのと対応)。
- **No-op** (\`RestreamProposal\`) — single-validator は proposal を re-stream しないので何もしない。Reply は期待されない。
- **History/sync** (\`GetHistoryMinHeight\`, \`GetValidatorSet\`, \`GetDecidedValue\`, \`ProcessSyncedValue\`) — peer catch-up 中に使う。デフォルトで reply: \`INITIAL\` height (history なし)、現在の validator set、「過去 block をくれ」に \`None\`。Peer がない = catch-up は exercise されない、が engine は問い合わせる。
- **ProposalOnly モード** (\`ReceivedProposalPart\`) — \`OpenHlConfig\` が \`ValuePayload::ProposalOnly\` を設定しているので proposal part は来ない。それでも variant を handle する必要がある; \`None\` で reply。

### Step 7: \`default_attrs\` ヘルパー

関数の下に:

\`\`\`rust
fn default_attrs() -> PayloadAttrs {
    PayloadAttrs {
        timestamp: 0,
        fee_recipient: [0u8; 20],
        prev_randao: [0u8; 32],
    }
}
\`\`\`

3 フィールド全部ゼロ、bridge は受け入れる。L12 ではこれらは real になる:
- \`timestamp\` は engine から (test なら wall clock から)。
- \`fee_recipient\` は validator が configure した payout address から。
- \`prev_randao\` は前 block の hash から BLS 経由で導出。

今は全部ゼロ — テストは気にしない、in-memory bridge も検証しない。

### Step 8: \`engine_app.rs\` を \`lib.rs\` に配線

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod codec;
pub mod context;
pub mod engine_app;
pub mod node;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

### Step 9: integration test + \`StubBridge\` を追加

\`engine_app.rs\` の末尾:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::bridge::BridgeError;
    use crate::node::OpenHlNode;
    use crate::types::{OpenHlAddress, OpenHlValidator};
    use async_trait::async_trait;
    use informalsystems_malachitebft_app::node::{Node as _, NodeHandle as _};
    use informalsystems_malachitebft_signing_ed25519::PrivateKey;
    use openhl_types::{ExecutedBlock, PayloadId, PayloadStatus};
    use rand::rngs::OsRng;
    use sha2::{Digest, Sha256};
    use std::sync::Mutex;
    use std::time::Duration;

    #[derive(Debug, Default)]
    struct StubBridge {
        last_built: Mutex<Option<BlockHash>>,
        committed: Mutex<Vec<BlockHash>>,
    }

    #[async_trait]
    impl ConsensusBridge for StubBridge {
        async fn build_payload(
            &self,
            _parent: BlockHash,
            _attrs: PayloadAttrs,
        ) -> Result<PayloadId, BridgeError> {
            let hash = BlockHash([0x42u8; 32]);
            *self.last_built.lock().expect("poisoned") = Some(hash);
            Ok(PayloadId(1))
        }

        async fn payload_ready(
            &self,
            _id: PayloadId,
        ) -> Result<ExecutedBlock, BridgeError> {
            Ok(ExecutedBlock {
                hash: BlockHash([0x42u8; 32]),
                parent_hash: BlockHash([0u8; 32]),
                number: 1,
                state_root: [0u8; 32],
            })
        }

        async fn validate_payload(
            &self,
            _block: &ExecutedBlock,
        ) -> Result<PayloadStatus, BridgeError> {
            Ok(PayloadStatus::Valid)
        }

        async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
            self.committed.lock().expect("poisoned").push(block_hash);
            Ok(())
        }
    }

    fn make_test_node(home_dir: std::path::PathBuf) -> OpenHlNode {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let digest = Sha256::digest(pk.as_bytes());
        let mut addr_bytes = [0u8; 20];
        addr_bytes.copy_from_slice(&digest[12..32]);
        let address = OpenHlAddress(addr_bytes);
        let validator_set = OpenHlValidatorSet::new(vec![OpenHlValidator::new(address, pk, 1)]);
        OpenHlNode::new(sk, validator_set, home_dir, "openhl-engine-test")
    }

    /// End-to-end: spawn the engine actor system, drive one block through the
    /// \`AppMsg\` loop, assert the bridge built+committed exactly the hash the
    /// engine decided on.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn first_block_via_engine_actors() {
        let tmp = tempfile::tempdir().unwrap();
        let node = make_test_node(tmp.path().to_path_buf());
        let validator_set = node.validator_set.clone();

        let handle = node.start().await.expect("start_engine failed");
        let channels = handle
            .take_channels()
            .await
            .expect("channels available exactly once");

        let bridge = Arc::new(StubBridge::default());
        let bridge_for_check = bridge.clone();

        let app_task = tokio::spawn(run_engine_app(bridge, channels, validator_set, 1));

        let decisions = tokio::time::timeout(Duration::from_secs(15), app_task)
            .await
            .expect("app loop timed out")
            .expect("app task panicked")
            .expect("app loop returned error");

        assert_eq!(decisions.len(), 1, "expected exactly one decided block");
        let decided_hash = decisions[0];

        let committed = bridge_for_check.committed.lock().unwrap().clone();
        assert_eq!(committed, vec![decided_hash], "bridge must commit decided hash");
        assert_eq!(
            *bridge_for_check.last_built.lock().unwrap(),
            Some(decided_hash),
            "decided hash must match what we built",
        );

        handle.kill(None).await.unwrap();
    }
}
\`\`\`

3 つのピース:

- **\`StubBridge\`** — すべてに \`BlockHash([0x42; 32])\` を返す \`ConsensusBridge\`。Production-grade test fixture パターン: インメモリ状態 (\`Mutex<Option<...>>\` と \`Mutex<Vec<...>>\`)、Arc-able、async-friendly。Loop 走行後、テストは \`last_built\` と \`committed\` を読んで bridge が何を見たかチェックできる。
- **\`make_test_node\`** — L9 と同じ single-validator 構築 (\`OpenHlNode::new\` を 1 validator で)。
- **\`first_block_via_engine_actors\`** — integration test。手順:
  1. \`node.start().await\` で engine を spawn。
  2. \`handle.take_channels().await\` で channels を take。
  3. \`tokio::spawn\` task で app loop を bridge + channels + validator set + \`stop_after_decisions = 1\` で spawn。
  4. \`tokio::time::timeout(Duration::from_secs(15), app_task)\` でテスト時間に bound — 何かが hang したら 15 秒で fail (永遠でなく)。
  5. ネストした \`Result\` を unwrap。3 段 \`.expect(...)\` で剥がす: timeout → panic → loop error。
  6. **3 つを assert**: decisions がちょうど 1 個、bridge がその hash を commit、bridge がその hash を build。これらが揃って完全なパイプラインを証明: engine → app → bridge → engine → app。
  7. クリーンアップに \`handle.kill(None)\`。

> 🛑 **やりがちな勘違い。** 「L9 の smoke test は 2 だったのに、なぜここで \`worker_threads = 4\`?」 **Integration test の方が並行に actor をより多く回すから。** Smoke test は spawn + kill だけ、メッセージを produce しなかった。Integration test は \`run_engine_app\` task (consume + reply) + bridge の async fn 呼び出し + 複数の内部 engine actor を走らせる。4 スレッドあれば全員に余裕がある。少ないと contention (遅い) や deadlock (hang)。4 が余裕。

## テスト

\`\`\`bash
cargo test -p openhl-consensus first_block_via_engine_actors
\`\`\`

~5 秒後 (コンパイル + 初回 run):

\`\`\`
running 1 test
test engine_app::tests::first_block_via_engine_actors ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Test 本体は ~0.02 秒で走る; 5 秒は \`cargo test\` のオーバーヘッド。

全件確認:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

…21 個合格するはず。

よくあるエラーと対処:

- **テストが 15 秒以上 hang する** — \`tokio::time::timeout\` が発火。最有力原因: \`Decided\` exit path で reply を忘れている、結果 engine actor が待ち続ける。Step 5 を再確認 — \`if decided.len() >= stop_after_decisions\` 分岐は return 前に **必ず** reply する。
- **\`error[E0277]: ConsensusBridge is not Send\`** — bridge に \`+ Send + Sync\` bound が必要。または impl で \`std::sync::Mutex\` を使っている (Send) が trait の \`Send\` 注釈を忘れている。\`bridge.rs\` を確認。
- **\`bridge.committed.lock().expect("poisoned")\` panic** — task が mutex 保持中に panic したときだけ起きる。普通は bridge impl での panic が原因。bridge の \`build_payload\` / \`commit\` の panic を確認。
- **\`assert_eq!(decisions.len(), 1)\` が fire する** — \`decisions\` が空。Loop が \`Decided\` に到達していない。最有力原因: \`GetValue\` の handle を忘れている (engine は \`LocallyProposedValue\` reply を待ち、reply なしでは進まない)。Step 4 を再確認。

## 設計の振り返り

3 つの load-bearing な決定:

1. **\`run_engine_app\` は \`B: ConsensusBridge + 'static\` に対してジェネリック。** 同じ loop が \`StubBridge\` (test)、\`InMemoryEvmBridge\` (L4)、\`RethEvmBridge\` (L5)、\`LiveRethEvmBridge\` (L12) で動く。Bridge の責任は **実行**; app loop の責任は **ルーティング**。**1 つの実装が 4 つの bridge variant を扱う。**

2. **\`stop_after_decisions\` は test エルゴノミクスで production 機能ではない。** Real validator は \`usize::MAX\` を使う。テストは \`1\` を使う。このパラメータの存在は関数が **テスト可能に設計されている** ことのシグナル — known finite state まで駆動し、graceful shutdown のインフラなしで assert できる。**Test エルゴノミクスは API 表面に値する。**

3. **Closed reply channel はログ、伝播しない。** Closed \`oneshot::Sender\` は engine が reply 前に諦めたことを意味する — 通常は actor が外部から kill された。これをエラーとして伝播すると、本物の問題がノイズで隠れる。\`tracing::warn!\` 経由のログなら、頻発時に operator が調査できる、loop は壊さない。**正しいエラーハンドリング方針は呼び出し側がその失敗で何かできるかに依存する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 708472c
diff -u ~/code/my-openhl/crates/consensus/src/engine_app.rs ./crates/consensus/src/engine_app.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

\`708472c\` の参照には 282 行の \`engine_app.rs\` が含まれる。12 個の \`AppMsg\` arm (substantive 5 + trivial 7)、\`StubBridge\` test fixture、integration test は厳密に一致するべき。Doc コメントの言い回しは個人差可。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: engine の \`recv()\` channel と \`subscribe()\` event stream の違いは?**
\`recv()\` channel (\`channels.consensus\`) は reply が要求される **命令的** メッセージ用: 「value を build しろ」「これを validate しろ」「H で decided」。\`subscribe()\` event stream は reply 不要の **broadcast** 通知用: 「round が始まった」「peer がダイヤルインした」。2 つは異なる方向に flow する: channel = engine→app (問い)、events = engine→all-subscribers (告知)。L9 の \`OpenHlNodeHandle::subscribe\` は placeholder; L12 まで event を実際には消費しない。

**Q: 個別の AppMsg arm をテストせず、integration test だけにするのはなぜ?**
Arm は独立していないから。Engine は特定の順序で送ってくる: \`ConsensusReady\` → \`GetValidatorSet\` → \`StartedRound\` → \`GetValue\` → \`Decided\`。それを孤立してテストするには、その順序で送るフェイク engine を build する必要があり、real engine を 1 block 回す方が簡単。**Integration test の方が書くのが安く、証明することが多い。** L11 で multi-validator のテストを追加し、そこでは個別 arm テスト (peer sync、vote extension) が意味を持つ。

**Q: なぜ \`validator_set: OpenHlValidatorSet\` を \`Arc<...>\` でなく value で取る?**
\`OpenHlValidatorSet\` が小さい (v0 で 1 validator) かつ \`Clone\` だから。Clone コストはバイト・オブ・ザ・struct であって、バイト・オブ・ザ・set ではない。Validator set が 100+ エントリに育ったら \`Arc\` への移行が価値あり。

**Q: \`bridge.commit(hash)\` が fail するとどうなる?**
\`?\` 演算子が \`BridgeError\` を \`eyre::Result::Err(...)\` として上に伝播する。テストの \`app_task\` は \`Err(...)\` を得て、3 段 unwrap が内側の expect で失敗し、テストは bridge エラーで panic する。**これが意図された挙動 — commit 失敗は回復不能。** Production コードなら retry (transient なら) または shut down + alert (persistent なら) する。

## 次のレッスン (L11)

Stage 6 はこれで完了。Stage 7 開始: \`InMemoryEvmBridge\` を real Reth EthereumNode に置き換える。L11 は **dev node bootstrap** をカバーする — consensus actor と同じ tokio runtime 上で Reth を tokio task として spawn させる。L12 で \`LiveRethEvmBridge\` を配線する (L5 の \`RethEvmBridge\` の live 版)。L12 完了後、書いた \`run_engine_app\` と **同じ** \`AppMsg\` loop を処理する Reth-backed devnet ができる — \`run_engine_app\` 同じ、1 つの trait impl swap、real EVM execution layer を獲得。`,
                },
              ],
            },
          },
          {
            title: "Live Reth",
            sortOrder: 6,
            lessons: {
              create: [
                {
                  title: "レッスン 11 — workspace で live Reth EthereumNode を boot する",
                  slug: "openhl-reth-bootstrap-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン 11 — workspace で live Reth \`EthereumNode\` を boot する

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_bootstraps --release
\`\`\`

…が新規テスト 1 個に合格する:

\`\`\`
test reth_node::tests::reth_dev_node_bootstraps ... ok
\`\`\`

…が、フル Reth \`EthereumNode\` v2.2.0 (MDBX ストレージ、payload builder、mempool、RPC stub、フルスタック) を ~2.7 秒で **spin up し**、provider に chain ID を query して結果を assert する。**これは Reth と Malachite — L1 リファレンス実装で最大級のインフラ 2 つ — が 1 workspace で衝突なく共存することの証明。**

やったことのまとめ:
- 4 個の新規 workspace 依存を追加 (\`reth-node-core\`, \`reth-tasks\`, \`reth-provider\`, \`alloy-genesis\`)
- \`crates/evm/Cargo.toml\` に 8 個の新規 dev-dependency を追加 (test-only — production scope は変わらず)
- \`crates/evm/src/reth_node.rs\` を作成 (~100 行、test モジュールのみ)

Production コードなし。Bridge 変更なし。L12 で live-bridge コードを書き始める前に **dependency tree が resolve することの検証** のみ。

## おさらい

L10 完了時点で workspace には以下がある:

\`\`\`
crates/types/           — BlockHash, PayloadId, PayloadAttrs, ExecutedBlock, PayloadStatus
crates/evm/             — InMemoryEvmBridge, RethEvmBridge (alloy types)
crates/consensus/       — フル BFT engine: Context, signing, codec, node, engine_app
bin/openhl/             — 空のバイナリ stub
\`\`\`

\`cargo test\` で workspace 全体 35 個合格 (consensus 21 + evm 14)。Engine は \`InMemoryEvmBridge\` 経由で real block を produce する。**ただし EL はまだ placeholder。** \`RethEvmBridge\` は存在する (L5) が、実際には Reth を呼ばない — alloy 型を使って hash を計算するだけ。

## 計画

4 つやる:

1. **workspace レベルの依存を 4 個追加** — \`Cargo.toml\` に: \`reth-node-core\`, \`reth-tasks\`, \`reth-provider\`, \`alloy-genesis\` — すべて L1 以来使ってきた同じ Reth SHA に pin。
2. **\`crates/evm/Cargo.toml\` に dev-dependency を 8 個追加** (Reth の node-builder/ethereum の test-utils variant + サポート crate)。
3. **\`crates/evm/src/reth_node.rs\` を作成** — dev chain spec を build し、\`NodeBuilder::testing_node\` で \`EthereumNode\` を launch し、provider が応答することを検証する test モジュール。
4. **\`mod reth_node;\`** を \`crates/evm/src/lib.rs\` に配線 (test-cfg のみ — production scope をクリーンに保つ)。

このレッスンが教えるのは **依存共存の検証パターン**。大きなインフラ crate 2 つに依存する (我々の場合 Reth と Malachite) 場合、衝突が判明するのは integration コードを書いてから — その時点で、**動くべき** だが compile しないコードに大量投資済み。**検証パターンは、integration を書く前に、両方を同時に exercise する最小のテストを書くこと。** Test が pass すれば両 dep が resolve・link する。失敗すれば失敗が即座に visible になり、blast radius が小さい。

> 🛑 **考えてみよう。** スクロールする前に: なぜゴールコマンドで bootstrap test を \`--release\` でマークする? ヒント: compile time とその支配要因を考える。Reth の MDBX bindings + libp2p + alloy + rocksdb 系ストレージスタックは **巨大** — debug mode の初回コンパイルは ~2:34、release も同程度だが結果バイナリが大幅に高速。Test 自体は bootstrap と chain-ID チェックだけなので、**初回コンパイル後** は fast compile より fast runtime が欲しい。初回 cold ビルド後は \`--release\` で走る。

## 手順

### Step 1: workspace レベルで Reth 依存を追加

ルート \`Cargo.toml\` を開く。\`# --- Reth (pinned to v2.2.0 release tag) ---\` ブロックを探す。L10 後はこう終わっている:

\`\`\`toml
reth-engine-primitives    = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-primitives   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
\`\`\`

4 行追加してブロックを次にする:

\`\`\`toml
reth-node-builder         = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-ethereum        = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-core            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-tasks                = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-chainspec            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-evm                  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-evm-ethereum         = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-primitives  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-engine-primitives    = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-primitives   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
\`\`\`

各依存の用途:

- **\`reth-node-core\`** — \`NodeConfig\` 関連の型 (node の config 構造: chain spec、datadir、JSON-RPC エンドポイントなどを定義)。
- **\`reth-tasks\`** — Reth のバックグラウンドタスク (block validation、mempool gossip、payload builder) を spawn するための \`Runtime\` と \`TaskExecutor\`。
- **\`reth-provider\`** — 履歴/canonical chain query を提供する \`BlockchainProvider\`。L12 の \`LiveRethEvmBridge::with_live_node()\` がこれを 1 個保持する。
- **\`alloy-genesis\`** — Genesis JSON のデシリアライズ。Reth の \`ChainSpec\` は \`Genesis\` から \`genesis.into()\` で構築。

**Reth SHA \`88505c7f...\` は v2.2.0 release tag** — L1 で \`reth-evm\`, \`reth-evm-ethereum\` などに使ったのと同じ SHA。**main HEAD ではなく release-tag SHA に pin することが不変条件。** Reth のバンプは専用 PR で行う。

> 🛑 **やりがちな勘違い。** 「crates.io に v2.2.0 が publish されているのに、なぜ SHA pin?」 **Reth の crates.io への release cadence が GitHub より数週間から数ヶ月遅れているから。** v2.2.0 git tag が最新の test 済みバイナリ。Publish された crate はしばしばより古い。Git+SHA pin なら maintainer が v2.2.0 と stamp した正確な commit が得られる、stale な crates.io upload からのサプライズなしで。これは高速進化するインフラ crate の標準プラクティス。

### Step 2: \`crates/evm/Cargo.toml\` を更新

\`crates/evm/Cargo.toml\` を開く。現在の \`[dev-dependencies]\` は \`tokio\` だけ:

\`\`\`toml
[dev-dependencies]
tokio = { workspace = true }
\`\`\`

これを次に置き換える:

\`\`\`toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-builder    = { workspace = true, features = ["test-utils"] }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
reth-chainspec       = { workspace = true }
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
eyre                 = { workspace = true }
tempfile             = "3"
\`\`\`

3 カテゴリ:

- **\`reth-node-builder\` + \`reth-node-ethereum\` (test-utils feature 付き)** — \`NodeBuilder::testing_node(runtime)\` を提供する。これは tempdir 上の MDBX、debug capabilities、エフェメラルポートで node を構築する。\`test-utils\` なしではこれらのメソッドは存在しない。
- **\`reth-node-core\` + \`reth-tasks\` + \`reth-chainspec\` + \`reth-provider\`** — test が直接使う runtime サポート crate (\`NodeConfig\`, \`Runtime\`, \`ChainSpec\`, provider アクセス)。
- **\`alloy-genesis\` + \`serde_json\` + \`eyre\` + \`tempfile\`** — test サポート: dev genesis 用 JSON parsing、error handling、temp directory 作成。

**すべて \`[dev-dependencies]\`** — production scope は変わらない。\`lib.rs\` の \`#[cfg(test)]\` 外コードで誤ってこれらを使うと compile が失敗する。**Test-only dep がガードレール。**

### Step 3: \`crates/evm/src/reth_node.rs\` を作成

ファイル冒頭 — Stage 7 でどこにいるかを示す ASCII ロードマップ付きモジュール doc:

\`\`\`rust
//! Live Reth node bootstrap — Stage 7a.
//!
//! Demonstrates that a full \`EthereumNode\` can be spun up in our workspace
//! via \`NodeBuilder::testing_node\`. Stage 7b will wire \`RethEvmBridge\` to
//! consume this node's provider + payload builder; for now this module is a
//! validated bootstrap recipe (the smoke test confirms it works) and a
//! placeholder for the future \`live_node()\` constructor.
//!
//! \`\`\`text
//! +----------------------+  Stage 7a (this commit)
//! | NodeBuilder          |--+
//! |   .testing_node      |  |  EthereumNode spins up with MDBX in tempdir,
//! |   .node(Ethereum)    |  |  payload builder, mempool, RPC stub, etc.
//! |   .launch_with_dbg() |--+
//! +----------------------+
//!
//! +----------------------+  Stage 7b (next)
//! | RethEvmBridge        |  Bridge methods (build_payload, payload_ready,
//! |   ::with_live_node() |  validate_payload, commit) route through the
//! +----------------------+  live node's services instead of in-process maps.
//! \`\`\`
\`\`\`

ASCII ロードマップは意図的。**Module 6 はレッスン 5 個 (L11-L15) を持ち、それぞれが bridge の stubbed body を 1 個ずつ置き換える。** ロードマップが mental scaffold を提供し、現在のレッスンが大きな弧のどこに位置するか分かる。

ファイルには **non-test コードがない**。以下すべて \`#[cfg(test)] mod tests\` 内:

\`\`\`rust
#[cfg(test)]
mod tests {
    use alloy_genesis::Genesis;
    use eyre::Result;
    use reth_chainspec::ChainSpec;
    use reth_node_builder::{NodeBuilder, NodeHandle};
    use reth_node_core::node_config::NodeConfig;
    use reth_node_ethereum::EthereumNode;
    use reth_tasks::Runtime;
    use std::sync::Arc;

    // ... helpers + test ...
}
\`\`\`

Import は密だが各が単一の役割:
- \`Genesis\` — dev genesis JSON のデシリアライズ
- \`ChainSpec\` — Reth の chain configuration (\`Genesis::into()\` で取得)
- \`NodeBuilder\`, \`NodeHandle\` — node を構築・launch する builder パターン
- \`NodeConfig\` — node レベル configuration (datadir、RPC エンドポイントなど)
- \`EthereumNode\` — spin up する具体的な node 型 (mainnet Ethereum 挙動)
- \`Runtime\` — tokio runtime に対する \`reth-tasks\` のラッパー
- \`Arc\` — \`ChainSpec\` は \`Arc<ChainSpec>\` で渡される

### Step 4: \`dev_chain_spec\` ヘルパー

Test モジュール内:

\`\`\`rust
    fn dev_chain_spec() -> Arc<ChainSpec> {
        // Minimal post-merge dev genesis. ChainID 2600 mirrors the upstream
        // custom-dev-node example so we can compare behaviour 1:1 if needed.
        let custom_genesis = r#"{
            "nonce": "0x42",
            "timestamp": "0x0",
            "extraData": "0x5343",
            "gasLimit": "0x5208",
            "difficulty": "0x400000000",
            "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "coinbase": "0x0000000000000000000000000000000000000000",
            "alloc": {},
            "number": "0x0",
            "gasUsed": "0x0",
            "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "config": {
                "ethash": {},
                "chainId": 2600,
                "homesteadBlock": 0,
                "eip150Block": 0,
                "eip155Block": 0,
                "eip158Block": 0,
                "byzantiumBlock": 0,
                "constantinopleBlock": 0,
                "petersburgBlock": 0,
                "istanbulBlock": 0,
                "berlinBlock": 0,
                "londonBlock": 0,
                "terminalTotalDifficulty": 0,
                "terminalTotalDifficultyPassed": true,
                "shanghaiTime": 0
            }
        }"#;
        let genesis: Genesis =
            serde_json::from_str(custom_genesis).expect("dev genesis json parses");
        Arc::new(genesis.into())
    }
\`\`\`

注目すべきポイント:

- **\`chainId: 2600\`** — Reth の上流 \`custom-dev-node\` 例と一致するので、デバッグ時に行ごとに挙動比較できる。**2600 は OpenHL のマジックナンバーではない**; Reth のドキュメントが使う数字。
- **EIP block number すべて = 0** — すべての Ethereum hardfork が height 0 から有効。これは「post-merge dev」 — fork の歴史的順序をシミュレートしない。
- **\`terminalTotalDifficulty: 0\` + \`terminalTotalDifficultyPassed: true\`** — chain は post-merge から始まる。Pre-merge PoW block は存在しない。
- **\`shanghaiTime: 0\`** — Shanghai (withdrawals) が genesis で active。
- **\`alloc: {}\`** — pre-funded アカウントなし。残高が必要なテストではエントリを追加する。

JSON は \`serde_json::from_str(...)\` で \`Genesis\` に parse され、\`genesis.into()\` で \`ChainSpec\` に変換される (alloy-genesis が impl 提供)。\`Arc::new(...)\` なのは node が \`Arc<ChainSpec>\` として保持し、複数のサブシステムで共有するから。

> 🛑 **やりがちな勘違い。** 「なぜ Rust で \`ChainSpec\` を直接構築せず raw JSON 文字列?」 **Reth の \`ChainSpec\` builder には 50+ フィールドと複雑な内部 invariant があるから。** プログラマチックに構築するということは、最近のフォークごとに必要なフィールドに追いつくこと。\`Genesis\` deserializer 経由で JSON から構築すると、Reth 自身の型システムにデフォルトと validity を強制させられる。**JSON フォーマットはどのみち chain の外部インターフェース** — production chain はすべて同じ JSON 形を使う (\`reth-chainspec/res/genesis/mainnet.json\` を見よ)。

### Step 5: \`launch_and_check\` ヘルパー

\`dev_chain_spec\` の下:

\`\`\`rust
    /// Bootstrap a real Reth \`EthereumNode\` and verify the provider responds.
    /// Returns nothing if successful; panics on launch or assertion failure.
    async fn launch_and_check() -> Result<()> {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let expected_chain_id = chain_spec.chain.id();

        let node_config = NodeConfig::test().dev().with_chain(chain_spec);

        let NodeHandle {
            node,
            node_exit_future: _,
        } = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .node(EthereumNode::default())
            .launch_with_debug_capabilities()
            .await?;

        // The provider should serve canonical chain queries off the genesis state.
        let observed_chain_id = node.chain_spec().chain.id();
        assert_eq!(observed_chain_id, expected_chain_id);

        // NOTE: not awaiting node_exit_future — drop the NodeAdapter and let
        // its background tasks tear themselves down when the runtime drops.
        Ok(())
    }
\`\`\`

Walk-through:

1. **\`Runtime::test()\`** — \`reth-tasks\` の canonical「test runtime」 — 現在の tokio runtime をラップして Reth の \`TaskExecutor\` がそこに spawn できるようにする。
2. **\`dev_chain_spec()\`** — さっき build した genesis 由来 chain spec。
3. **\`NodeConfig::test().dev().with_chain(chain_spec)\`** — builder chain:
   - \`test()\` — sane test default (エフェメラルポートなど)
   - \`.dev()\` — single-validator dev mode (peer discovery なし、MEV なし)
   - \`.with_chain(...)\` — dev chain spec に bind
4. **\`NodeBuilder::new(config).testing_node(runtime).node(EthereumNode::default())\`** — 4 段の builder:
   - \`new(config)\` — config を取り込む
   - \`.testing_node(runtime)\` — test と宣言 (tempdir ストレージ、debug RPC など)
   - \`.node(EthereumNode::default())\` — 「Ethereum mainnet 挙動が欲しい」(vs. Optimism、custom など) と言う
5. **\`.launch_with_debug_capabilities()\`** — node のサービス (MDBX、payload builder、RPC、test mode の mempool gossip など) をすべて spawn。\`NodeHandle { node, node_exit_future }\` を返す。
6. **\`node.chain_spec().chain.id()\` の assertion** — 最もシンプルな「node が正しく起動した?」チェック。Live \`BlockchainProvider\` から chain ID を fetch できれば、node は boot した。
7. **\`node_exit_future: _\`** — この future を await **しない**。Await すると node のシャットダウンを待ってブロックする (kill されるまで永遠に発生しない)。代わりに関数末で \`NodeHandle\` を drop し、runtime にバックグラウンドタスクを tear down させる。

> 🛑 **やりがちな勘違い。** 「\`NodeConfig::test().dev()\` は実際何を disable する?」 **重要なのは: libp2p Kademlia 経由の peer discovery とフル mempool gossip プロトコル。** Non-test、non-dev node は peer に dial を試み、chain を sync し、libp2p リクエストに応答する。我々のテストではそのいずれも実行しない — node は完全に isolated。これが essential なのは、chain ID (2600) がどの public network とも一致しないので、peer への dial は timeout か拒否されるから。

### Step 6: テスト本体

最後:

\`\`\`rust
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn reth_dev_node_bootstraps() {
        if let Err(e) = launch_and_check().await {
            panic!("Reth dev node bootstrap failed: {e:?}");
        }
    }
\`\`\`

Body は 2 行。**検証は \`launch_and_check\` 内**; test はそれを呼んで、内部 error を保持した panic として失敗を surface するだけ。

\`flavor = "multi_thread", worker_threads = 4\` — L10 の integration test と同じセットアップ。Reth の内部タスク (MDBX commit、payload builder、RPC handler、network service) はすべて自分のスレッドが欲しい; 4 で contention なく余裕。

### Step 7: \`reth_node.rs\` を \`crates/evm/src/lib.rs\` に配線

\`crates/evm/src/lib.rs\` を開く。L4-L5 の in-memory + Reth bridge とその re-export がある。**test cfg でゲートした 1 行追加:**

\`\`\`rust
//! ... existing docs ...

pub mod bridges; // existing

#[cfg(test)]
mod reth_node;

// ... existing re-exports ...
\`\`\`

\`#[cfg(test)]\` がキー。**Reth bootstrap モジュールは test-only** — \`openhl-evm\` の consumer に見えない、non-test ビルドではコンパイルされない。すべての dep が \`[dev-dependencies]\` であることと整合 — L11 は production scope に何も影響しない。

## テスト

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_bootstraps --release
\`\`\`

**初回 run:** ~2:34 のコールドコンパイル (Reth の MDBX、libp2p、payload builder、RPC スタックが初めてビルドされる)、その後 ~3 秒で run。

以降の run: ~30 秒 (Cargo のインクリメンタルコンパイル)、その後 ~3 秒で run。

出力:

\`\`\`
running 1 test
test reth_node::tests::reth_dev_node_bootstraps ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Full suite 確認:

\`\`\`bash
cargo test
\`\`\`

…workspace 全体 36 個合格 (consensus 21 + evm 15、新規 test 1 個追加)。

よくあるエラーと対処:

- **\`error[E0432]: unresolved import 'reth_node_builder'\`** — \`crates/evm/Cargo.toml\` で \`test-utils\` feature が抜けている。Step 2 を再確認: \`features = ["test-utils"]\` であること。
- **\`error: failed to resolve: use of undeclared crate or module 'reth_provider'\`** — workspace レベルで \`reth-provider = ...\` が抜けている。Step 1 を再確認。
- **\`error: feature 'test-utils' on 'reth-node-builder' requires feature 'X'\`** — version skew。Pin している Reth SHA が \`reth-node-builder\` の peer crate 期待と一致する必要がある。すべての reth-* dep (12 個) が同じ SHA を使うこと — Step 1 を再確認。
- **\`Reth dev node bootstrap failed: Failed to bind...\`** — 前回 test run からのポート衝突。\`NodeConfig::test()\` はエフェメラルポートを使うが、tempdir の stale 状態が衝突しうる。\`cargo clean -p openhl-evm\` で retry。
- **Test がコンパイルできるが 30 秒以上 hang** — \`Runtime::test()\` が正しく動いていない。Single-thread default ではなく \`#[tokio::test(flavor = "multi_thread", worker_threads = 4)]\` を使っていることを確認。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Production dep は最小、test-only dep がスタック全体を検証する。** \`crates/evm/Cargo.toml\` の production dep は 6 個 (L5 から変わらず) + dev-dep 11 個。Dev-dep 11 個が Reth のフル node-builder + provider スタックが **今動く** ことを検証 — が、\`openhl-evm\` を使う下流 crate はそれらを pull しない。**これが \`openhl-evm\` を slim に保ちつつ integration が動くことを証明する方法。**

2. **Bootstrap-only test は意味のある artifact。** このレッスンの test は node を spin up して chain ID を check するだけ。Block を build しない、トランザクションを実行しない、過去 state を query しない。**それでも Module 6 の残りが依存するレッスン。** Bootstrap が失敗すれば L12-L15 は何も動かない。**Bootstrap-only test がビジネスロジックが関わる前にインフラ regression を catch する。**

3. **モジュール doc の ASCII ロードマップが L12-L15 のトレイルマーカー。** 残りの各レッスンは bridge の stubbed body を 1 個ずつ置き換える — \`build_payload\`, \`payload_ready\`, \`validate_payload\`, \`commit\`。ロードマップは各レッスンが大きな弧のどこに位置するかを示す。**Module doc は orientation 用で実装詳細用ではない。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout e6b4ebb
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/reth_node.rs ./crates/evm/src/reth_node.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
\`\`\`

\`e6b4ebb\` の参照には workspace dep update、11 個の dev-dep、105 行の \`reth_node.rs\` が含まれる。JSON genesis 文字列、builder chain、test 属性は厳密に一致するべき。Doc コメントの言い回しは個人差可。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ chain ID は 1 (mainnet) でもランダム数字でもなく 2600?**
2 つの理由: (1) どの public network とも衝突しないので、peer discovery が偶然 real chain に接続することがない; (2) Reth の上流 \`custom-dev-node\` 例と一致するので、canonical reference と挙動を \`diff\` できる。後で自由に変えられる — OpenHL 内に 2600 の意味的な特別性はない。

**Q: \`NodeConfig::test().dev()\` は \`NodeConfig::default()\` と何が違う?**
\`test()\` = エフェメラル tempdir for MDBX、\`:0\` (kernel-allocated) port に bind、peer discovery なし、sane test logging。\`dev()\` = single-validator mode (複数 validator 間の actual consensus なし)、local node を唯一の block producer とみなす、mempool gossip なし。組み合わせ: 完全に isolated な dev/test 環境。

**Q: \`launch_with_debug_capabilities\` は通常より遅くなる?**
ならない — 通常 gate される追加 RPC エンドポイント (\`debug_*\` namespace) を有効化する。パフォーマンスオーバーヘッドは無視できる; コストは prod でセキュリティリスクとなる余分な surface を晒すだけ。テスト用には fine。

**Q: なぜ L9 の \`OpenHlNodeHandle\` のように node を \`kill()\` しない?**
Reth が返す \`NodeHandle\` には、我々が使うパスで \`kill()\` メソッドがないから。Handle を drop して runtime に物を tear down させるのが期待される使い方。明示的クリーンアップが必要な長時間 test では \`node.task_executor.shutdown(...)\` を呼ぶが、3 秒の smoke test なら drop で十分。

## 次のレッスン (L12)

Reth と Malachite はこれで共存する。**ただし bridge はまだ Reth と話していない。** L12 で \`LiveRethEvmBridge::with_live_node()\` を build する — さっき bootstrap した \`node\` を受け取り、\`BlockchainProvider\` を expose するコンストラクタ。これにより \`build_payload\` (L4-L5 の stubbed bridge メソッド) が live MDBX state に対して **real な** 親ブロック lookup を行える。これが「Reth が workspace にいる」から「Reth が consensus engine が読むデータを produce している」へ移行する瞬間。`,
                },
                {
                  title: "レッスン 12 — LiveRethEvmBridge が real chain から parent を読む",
                  slug: "openhl-live-bridge-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 50,
                  xpReward: 100,
                  content: `# レッスン 12 — \`LiveRethEvmBridge\` が real chain から parent を読む

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
\`\`\`

…が **happy path と negative path の両方** を exercise する新規テスト 1 個に合格する:

\`\`\`
test live_node::tests::live_bridge_builds_on_real_genesis ... ok
\`\`\`

Happy path: \`EthereumNode\` を boot し、その \`BlockchainProvider\` に real genesis hash を query し、provider を \`LiveRethEvmBridge\` に渡し、\`build_payload(genesis_hash, attrs)\` を呼ぶ。結果の child block は \`number = 1\` と \`parent_hash = genesis\` を持つ — どちらも **live provider 由来**、メモリ内合成ではない。

Negative path: \`build_payload(BlockHash([0xee; 32]), attrs)\` を呼ぶ。Provider はその hash を知らないので、bridge は \`BridgeError::Rejected\` を返す。**Live chain が見たことがない parent に対して build を拒否することが、bridge を consensus に配線して安全にする。**

新規ファイル: **\`crates/evm/src/live_node.rs\`** (~227 行) — \`LiveRethEvmBridge<P>\` は \`P: BlockNumReader\` に対してジェネリック。\`build_payload\` は real; \`payload_ready\` はインメモリ pending 状態を読む; \`validate_payload\` + \`commit\` は L14-L15 まで stub。

## おさらい

L11 完了時点で workspace には以下がある:

\`\`\`
Cargo.toml                       — 13 個の reth-* workspace dep + alloy-genesis
crates/evm/Cargo.toml            — production dep 6 個 + dev-dep 11 個
crates/evm/src/bridges/          — InMemoryEvmBridge (L4) + RethEvmBridge (L5)
crates/evm/src/reth_node.rs      — bootstrap-only smoke test
crates/consensus/                — フル BFT engine + run_engine_app
\`\`\`

\`cargo test\` で workspace 全体 36 個合格。**Reth は boot し、Malachite は block を produce するが、互いに話さない。** \`RethEvmBridge\` は parent lookup にインプロセス state を使う; \`LiveRethEvmBridge\` はまだ存在しない。

## 計画

6 つやる:

1. **\`reth-storage-api\` を workspace レベルで追加** — \`BlockNumReader\` trait surface を提供する。これに対してジェネリックになる。
2. **\`crates/evm/Cargo.toml\` を更新** — \`eyre\` を dev-dep から production dep へ昇格 (\`BridgeError::Internal\` のメッセージ構築用); \`reth-storage-api\` を production dep として追加。
3. **\`crates/evm/src/live_node.rs\` を作成** — \`LiveRethEvmBridge<P>\` struct + \`ConsensusBridge\` impl (\`build_payload\` は live、他は stub)。
4. **\`pub mod live_node;\`** を \`crates/evm/src/lib.rs\` に配線 (今回は production-visible、**\`#[cfg(test)]\` ではない**)。
5. **integration test \`live_bridge_builds_on_real_genesis\`** を追加 — real node を bootstrap、happy + negative path を assert。
6. **実行** — \`cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release\` が ~2.4 秒で合格。

このレッスンが教えるのは **provider-に対してジェネリックなパターン**、bridge を isolation で testable にする。\`LiveRethEvmBridge<P>\` は \`P: BlockNumReader + Clone + Sync + 'static\` に対してジェネリック。Production では \`P\` は live node の \`BlockchainProvider\`。テストでは \`P\` は決定的な \`(hash → number)\` マッピングを返す \`MockProvider\` でもよい。**Bridge 自体はどちらか気にしない** — ただ \`provider.block_number(...)\` を呼ぶ。これは L10 の \`run_engine_app<B: ConsensusBridge>\` と同じパターン: 具象型ではなく trait に依存する。

> 🛑 **考えてみよう。** スクロールする前に: \`build_payload\` が live provider から読むのに、なぜ \`LiveRethEvmBridge\` は依然として \`pending\`, \`chain\`, \`head\` フィールドを持つ内部 \`Mutex<State>\` を保持する? ヒント: \`build_payload\` は \`PayloadId\` を返し、engine は後で \`payload_ready(id)\` を呼んで実際の block を fetch する。Pending 状態がこれら 2 つの呼び出しを橋渡しする — Reth の payload-builder は block を組み立てるのに 10-50ms かかり、engine が待つ間 bridge は **結果** をどこかに保持する必要がある。**L13 でこのインメモリ pending 状態を Reth の実 payload-builder に置き換える。** 今のところは build-then-fetch shape が動くことを証明する placeholder。

## 手順

### Step 1: workspace に \`reth-storage-api\` を追加

ルート \`Cargo.toml\` を開く。L11 後、reth ブロックは次で終わる:

\`\`\`toml
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
\`\`\`

\`reth-provider\` と \`alloy-genesis\` の間に 1 行追加:

\`\`\`toml
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
\`\`\`

\`reth-storage-api\` は \`BlockNumReader\`, \`BlockHashReader\` などの reader trait が住む場所。**他の reth-* dep と同じ pinned SHA** — ここで version skew があると、\`LiveRethEvmBridge\` は \`node.provider\` を受け入れられない、\`BlockNumReader\` のバージョンが違うから。

### Step 2: \`crates/evm/Cargo.toml\` を更新

小さな変更 2 つ。\`[dependencies]\` セクションに 2 個追加:

\`\`\`toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }      # NEW: [dev-dependencies] にあったのを production へ
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }      # NEW
\`\`\`

そして \`eyre\` を \`[dev-dependencies]\` から削除:

\`\`\`toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-builder    = { workspace = true, features = ["test-utils"] }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
reth-chainspec       = { workspace = true }
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
# eyre 行は削除 — 今は production dep
tempfile             = "3"
\`\`\`

**なぜ \`eyre\` が今 production**: \`BridgeError::Internal(eyre::eyre!(...))\` は \`build_payload\` (production コード) で構築される、テストだけではなく。L11 では dev-dep が正しかった (\`eyre::Result\` を import するのはテストだけだった); 今は production コードが必要とする。

### Step 3: \`crates/evm/src/live_node.rs\` を作成 — モジュール doc + import

ファイル冒頭。役割を明示し、残りの stub を call out して、何が本レッスンで load-bearing で何が後に来るかを読者に明確にする:

\`\`\`rust
//! \`LiveRethEvmBridge\` — \`ConsensusBridge\` backed by a real Reth provider.
//!
//! Stage 7b: parent lookups go through the live node's provider via the
//! \`BlockNumReader\` trait, so \`build_payload\` produces a child block whose
//! \`number\` and \`parent_hash\` reflect actual chain state rather than the
//! in-process synthesis of [\`crate::engine::RethEvmBridge\`].
//!
//! Still stubbed for now (each rolls into a later stage):
//!   - \`validate_payload\` → Stage 7c: real \`BlockExecutor\` execution
//!   - \`commit\` → Stage 7d: forkchoice via in-process Engine API
//!
//! Both stubs are visible markers of "what still needs the live node."

use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use reth_storage_api::BlockNumReader;
use std::collections::HashMap;
use std::sync::Mutex;
\`\`\`

\`BlockNumReader\` が live read を駆動する唯一の trait; 他はすべて L4 以来使っている bridge 型。

### Step 4: struct を定義

\`\`\`rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, (B256, Header)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}

impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P) -> Self {
        Self {
            provider,
            state: Mutex::new(State::default()),
        }
    }
}
\`\`\`

2 つのピース:

- **\`LiveRethEvmBridge<P>\`** は provider を value で保持し、build/commit の bookkeeping のために \`Mutex<State>\` を持つ。**\`P\` に対してジェネリック** — 具象 provider 型は焼き付けない。
- **\`State\`** は \`InMemoryEvmBridge\` (L4) が持っていたものをミラー — \`next_payload_id\` カウンタ、\`pending\` マップ (payload_id → fetch 待ちの built header)、\`chain\` マップ (commit 履歴)、\`head\` ポインタ。L13-L15 でこれらの各々を live Reth 構造で置き換える。

> 🛑 **やりがちな勘違い。** 「なぜ \`provider\` を \`State\` の中に入れて mutex を 1 つにしない?」 **\`BlockNumReader\` 実装は普通 \`Sync + Clone\` — 多数の async task で同時共有されるように作られているから。** Provider を mutex の中に入れると、すべての \`block_number\` lookup が直列化される。外に置くことで、\`build_payload\` への並行呼び出しが (安価な) state lock を奪い合っても、互いの (高コストかもしれない) provider read を block しない。**Lock は変更されるものを守る、読まれるものではない。**

### Step 5: \`ConsensusBridge\` impl — \`build_payload\` が live read

\`\`\`rust
#[async_trait]
impl<P> ConsensusBridge for LiveRethEvmBridge<P>
where
    P: BlockNumReader + Clone + Sync + 'static,
{
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let parent_b256 = B256::from(parent.0);

        // LIVE READ: parent's block number comes from the real provider, not
        // an in-process HashMap. If the provider doesn't know this hash, we
        // refuse to build a child on it.
        let parent_number = self
            .provider
            .block_number(parent_b256)
            .map_err(|e| BridgeError::Internal(eyre::eyre!("provider error: {e}")))?
            .ok_or_else(|| {
                BridgeError::Rejected(format!("provider has no block with hash {parent_b256}"))
            })?;

        let mut s = self.state.lock().expect("state mutex poisoned");
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let header = Header {
            parent_hash: parent_b256,
            number: parent_number + 1,
            timestamp: attrs.timestamp,
            beneficiary: Address::from(attrs.fee_recipient),
            mix_hash: B256::from(attrs.prev_randao),
            ..Default::default()
        };
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header));
        Ok(PayloadId(id))
    }
\`\`\`

Trait bound \`P: BlockNumReader + Clone + Sync + 'static\` が契約: hash→number lookup ができる、clone が安価、スレッド間で共有しても安全、任意の async task より長生き — そのような provider なら何でも。

\`build_payload\` の body は 3 フェーズ:

1. **Live read** (load-bearing な行)。\`self.provider.block_number(parent_b256)\` は \`Result<Option<u64>, _>\` を返す:
   - \`Ok(Some(n))\` — provider は parent を知っていて、number は \`n\`。続行。
   - \`Ok(None)\` — provider は parent を知らない。\`BridgeError::Rejected\` を返す。**これが bridge を consensus に配線して安全にする** — live chain が見たことがない parent に対して build しない。
   - \`Err(e)\` — provider が失敗 (DB 破損、deadlock、何でも)。\`BridgeError::Internal\` を返す。

2. **State allocation**。Mutex を lock、next ID を取り、increment。高速 — lock 下に I/O なし。

3. **Header 合成**。\`number = parent_number + 1\` (live read 由来)、\`parent_hash = parent_b256\`、engine が渡した attrs で child \`Header\` を build。\`header.hash_slow()\` で hash 計算。\`(id → (hash, header))\` マッピングを \`pending\` に格納。

> 🛑 **やりがちな勘違い。** 「なぜ parent lookup は \`Result<u64, _>\` ではなく \`Result<Option<u64>, _>\`?」 **「provider がこの hash を見つけられなかった」と「provider が crash した」は別の failure mode で、consumer は別扱いすべきだから。** 欠けている hash は **プロトコル** 問題 (「知らないものに対して build を要求された」 — 悪意ある peer または stale message)。Provider error は **運用** 問題 (「我々の DB が壊れた」 — 運用アラート)。2 層 \`Result<Option<...>>\` で caller が区別できる — そして各を別の \`BridgeError\` variant にマップする (\`Rejected\` vs. \`Internal\`)。

### Step 6: \`payload_ready\` + \`commit\` の stub

この 2 つは L4 のインメモリ bridge と大まかに同じ — live-Reth 統合は L13 (\`payload_ready\` を Reth の実 payload-builder に対して) と L15 (\`commit\` を Engine API に対して) で来る:

\`\`\`rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        let (hash, header) = s
            .pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
        Ok(ExecutedBlock {
            hash: BlockHash(hash.0),
            parent_hash: BlockHash(header.parent_hash.0),
            number: header.number,
            state_root: header.state_root.0,
        })
    }

    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        // Stage 7c: replace with real BlockExecutor execution + state-root check.
        Ok(PayloadStatus::Valid)
    }

    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        // Stage 7d: replace with in-process Engine API forkchoice update.
        let hash = B256::from(block_hash.0);
        let mut s = self.state.lock().expect("state mutex poisoned");
        let header = s
            .pending
            .values()
            .find(|(h, _)| *h == hash)
            .map(|(_, h)| h.clone())
            .ok_or_else(|| BridgeError::Rejected(format!("commit for unknown hash {hash}")))?;
        s.chain.insert(hash, header);
        s.head = Some(hash);
        Ok(())
    }
}
\`\`\`

- **\`payload_ready\`** は \`pending\` から payload を ID で lookup、格納された header から \`ExecutedBlock\` を build。L4 と同じ shape。
- **\`validate_payload\`** は \`Ok(PayloadStatus::Valid)\` — 文字通り「常に valid」な stub。コメントが L14 (Stage 7c) を real execution が来る場所として名指し。**Visible stub は技術負債ではなく進捗マーカー。**
- **\`commit\`** は block を \`chain\` に記録し \`head\` を更新。L4 と同じ shape。コメントが L15 (Stage 7d) を forkchoice が来る場所として名指し。

### Step 7: \`live_node.rs\` を \`lib.rs\` に配線

\`crates/evm/src/lib.rs\` を開く。L11 ではこうだった:

\`\`\`rust
pub mod bridges;

#[cfg(test)]
mod reth_node;
\`\`\`

\`live_node\` を追加する — **今回は production-visible:**

\`\`\`rust
pub mod bridges;
pub mod live_node;

#[cfg(test)]
mod reth_node;
\`\`\`

なぜ \`#[cfg(test)]\` ではない? L13-L15 で \`LiveRethEvmBridge\` を production コードから使う (最終的には \`bin/openhl/src/main.rs\` から) から。L11 の bootstrap モジュールは genuine に test-only — dep tree を検証するためだけに存在する。L12 の bridge は production API。

### Step 8: integration test を追加

\`crates/evm/src/live_node.rs\` に append:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use alloy_genesis::Genesis;
    use reth_chainspec::ChainSpec;
    use reth_node_builder::{NodeBuilder, NodeHandle};
    use reth_node_core::node_config::NodeConfig;
    use reth_node_ethereum::EthereumNode;
    use reth_storage_api::BlockHashReader;
    use reth_tasks::Runtime;
    use std::sync::Arc;

    fn dev_chain_spec() -> Arc<ChainSpec> {
        let custom_genesis = r#"{
            "nonce": "0x42",
            "timestamp": "0x0",
            "extraData": "0x5343",
            "gasLimit": "0x5208",
            "difficulty": "0x400000000",
            "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "coinbase": "0x0000000000000000000000000000000000000000",
            "alloc": {},
            "number": "0x0",
            "gasUsed": "0x0",
            "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "config": {
                "ethash": {},
                "chainId": 2600,
                "homesteadBlock": 0,
                "eip150Block": 0,
                "eip155Block": 0,
                "eip158Block": 0,
                "byzantiumBlock": 0,
                "constantinopleBlock": 0,
                "petersburgBlock": 0,
                "istanbulBlock": 0,
                "berlinBlock": 0,
                "londonBlock": 0,
                "terminalTotalDifficulty": 0,
                "terminalTotalDifficultyPassed": true,
                "shanghaiTime": 0
            }
        }"#;
        let genesis: Genesis = serde_json::from_str(custom_genesis).expect("dev genesis parses");
        Arc::new(genesis.into())
    }

    /// END-TO-END Stage 7b: bootstrap a real Reth node, hand its provider to
    /// \`LiveRethEvmBridge\`, build a payload on top of the real genesis block.
    /// Asserts the \`parent_hash\` and number come from the live chain, not an
    /// in-process synthesis.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn live_bridge_builds_on_real_genesis() {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec);

        let NodeHandle {
            node,
            node_exit_future: _,
        } = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .node(EthereumNode::default())
            .launch_with_debug_capabilities()
            .await
            .expect("launch failed");

        // Pull the genesis hash from the live provider.
        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no block 0 (genesis)");

        // Construct the bridge against the live provider.
        let bridge = LiveRethEvmBridge::new(node.provider.clone());

        // Build a payload on the real genesis.
        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs.clone())
            .await
            .expect("build_payload failed");
        let block = bridge.payload_ready(id).await.expect("payload_ready failed");

        // The bridge's lookup hit the LIVE provider — assert the resulting
        // header carries genesis as its parent and is at height 1.
        assert_eq!(block.parent_hash, BlockHash(genesis_hash_b256.0));
        assert_eq!(block.number, 1);

        // Negative case: a fabricated parent hash must be rejected because
        // the live provider doesn't know it.
        let fake_parent = BlockHash([0xeeu8; 32]);
        let err = bridge.build_payload(fake_parent, attrs).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
}
\`\`\`

テストの walk-through:

1. **real \`EthereumNode\` を bootstrap** — L11 と同じセットアップ。
2. **\`node.provider.block_hash(0)\`** — live provider に genesis block hash を尋ねる。これは \`BlockHashReader\` の API (\`BlockNumReader\` と別 trait — ペア)。
3. **\`LiveRethEvmBridge::new(node.provider.clone())\`** — bridge を構築。\`BlockchainProvider\` は内部 \`Arc\` ベースなので clone は安価。
4. **Happy path**: real genesis hash 上に payload を build、\`payload_ready\` 経由で fetch、\`parent_hash == genesis_hash\` と \`number == 1\` を assert。**これが live read が起きたことの証明** — もしインメモリ合成だったら、parent_hash は渡したもの (正しい) になるが \`number\` は我々が選ぶ何でもありえた。\`1\` が出るのは \`provider.block_number(genesis_hash)\` が \`Some(0)\` を返したからのみ。
5. **Negative path**: \`BlockHash([0xee; 32])\` は chain が見たことのない fabricated hash。\`build_payload\` は \`BridgeError::Rejected\` を返さなければならない。\`matches!(err, BridgeError::Rejected(_))\` が exhaustive check — 他の error variant ならテスト失敗。

> 🛑 **やりがちな勘違い。** 「なぜ negative path をそもそもテストする?」 **Rejection をテストしないテストは happy path が動くことしか証明しない — bridge が偶然インメモリ state に fallback して任意の parent に対して child block を produce するバグを catch できない。** ガベージな parent 上にサイレントに build する bridge はコンパイルが通り、happy path は pass し、consensus は破損した高さで嬉々として block を commit する。Negative path が live read が実際に load-bearing であることを証明する。

## テスト

\`\`\`bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
\`\`\`

~30 秒後 (コンパイル + 初回 node bootstrap):

\`\`\`
running 1 test
test live_node::tests::live_bridge_builds_on_real_genesis ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Test runtime: ~2.4 秒 (Reth bootstrap が支配的)。

Full suite:

\`\`\`bash
cargo test
\`\`\`

…workspace 全体 37 個合格するはず。

よくあるエラーと対処:

- **\`error[E0277]: P: BlockNumReader is not satisfied for ...\`** — workspace の \`reth-storage-api\` SHA が他の reth-* SHA と一致していない。Step 1 を再確認。
- **Happy path テストで \`provider has no block with hash 0x000...\`** — \`block_hash(0)\` を query しているが \`None\` を返している。\`NodeConfig\` で \`.dev()\` mode を使っていることを確認 (\`.dev()\` なしの test mode は genesis を事前 seed しないことがある)。
- **Test が \`matches!(err, BridgeError::Rejected(_))\` で失敗** — \`build_payload\` が \`BridgeError::Internal\` を伝播している。\`.ok_or_else(|| BridgeError::Rejected(...))\` の行を確認; 代わりに \`.expect(...)\` や \`.unwrap_or(0)\` を使うと error path が発火しない。
- **Test はコンパイルするが「P is private」と言う** — \`LiveRethEvmBridge<P>\` には \`pub struct ... { provider: P, ... }\` が必要。\`provider\` が \`pub\` でも、ジェネリックパラメータが \`pub\` なのは implicit。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Bridge は \`P: BlockNumReader\` に対してジェネリック、\`BlockchainProvider\` に対して具象ではない。** Production では live provider を渡す; テストは mock を渡せる; 将来 module 7 では別 Reth プロセスに JSON-RPC で話す \`RemoteProvider\` を渡せる。**Bridge コードは変わらない** — 型パラメータだけが変わる。

2. **\`Result<Option<u64>, _>\` が運用 vs プロトコル failure を区別する。** 失敗した DB call と「この hash を知らない」は別の問題。それぞれを \`BridgeError::Internal\` vs. \`BridgeError::Rejected\` にマップすることで、consumer が適切に応答できる — 前者にアラート、後者は ignore-and-vote-nil。**Error は単なるメッセージではなく意味論を運ぶ。**

3. **happy/negative 2 テストペアが **最小** の誠実な検証。** どちらか片方では不十分: happy 単独はインメモリ state へのサイレント fallback を catch しない、negative 単独は常に reject する bridge を catch しない。**Live integration は両方が load-bearing でなければならない。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 8d211b8
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
\`\`\`

\`8d211b8\` の参照には ~227 行の \`live_node.rs\` が含まれる。Trait bound \`P: BlockNumReader + Clone + Sync + 'static\`、\`build_payload\` 本体、2 パステストは厳密に一致するべき。Doc コメントの言い回しは個人差可。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ \`BlockchainProvider\` を直接取らず \`P に対してジェネリック\`?**
2 つの理由。1 つ目、\`BlockchainProvider\` は定義に 30+ trait bound を持つ重い具象型 — 直接使うと、\`LiveRethEvmBridge\` のすべての consumer がそれらの bound を糸通しする必要がある。Generic \`P: BlockNumReader\` は surface を bridge が必要とする **唯一の能力** に絞る。2 つ目、generic-over-trait は mock テストを容易にする — \`MockProvider\` impl を書き、\`LiveRethEvmBridge::new(...)\` に渡し、real node bootstrap が不要な unit-testable bridge を得る。

**Q: \`BlockNumReader::block_number\` と \`BlockHashReader::block_hash\` の違いは?**
方向。\`block_number(hash) → Option<u64>\` は「この hash の number は?」に答える。\`block_hash(n) → Option<B256>\` は「この number の hash は?」に答える。テストは両方を使う: \`block_hash(0)\` で genesis hash を pull、それから \`LiveRethEvmBridge\` が内部で \`block_number(hash)\` を使って parent の number を lookup。同じ chain index、2 つのアクセスパターン。

**Q: なぜ \`parking_lot::Mutex<State>\` ではなく \`Mutex<State>\`?**
\`std::sync::Mutex\` は低 contention のシナリオでは fine。Bridge の state は \`build_payload\` / \`payload_ready\` / \`commit\` でだけ触られる — 各 block あたり最大 1 回、数十から数千ミリ秒の間隔。\`parking_lot\` は contention が多いときに意味がある; ここではほぼゼロ。理由なしに dep を追加しない。

**Q: この bridge はいつ \`RethEvmBridge\` を実際に置き換える?**
すでに置き換わった — \`RethEvmBridge\` (L5) は production 用途では \`LiveRethEvmBridge\` で superseded された。\`RethEvmBridge\` は教育的 waypoint および engine テストの \`StubBridge\` で使うインメモリ variant として codebase に残る。**Codebase 内の 2 bridge は重複実装ではなく統合の 2 段階を表す。**

## 次のレッスン (L13)

Bridge は \`build_payload\` で Reth から読む。だが \`pending\` HashMap はまだインプロセス合成のまま — engine は「propose する次の block」を尋ね、我々は我々が作った header を返す。**L13 で \`pending\` を Reth の実 \`PayloadBuilder\` に置き換える** — Reth が JSON-RPC \`engine_getPayloadV4\` call で block を組み立てるのと同じ機構。L13 完了で、bridge は real Ethereum tooling が受け入れる block を produce する (フル transaction list、receipt、gas usage、state root)。これが「bridge が Reth のストレージと話す」から「bridge が Reth の実行パイプラインと完全統合される」への transition。`,
                },
                {
                  title: "レッスン 13 — validate_payload が Reth の EthBeaconConsensus を走らせる",
                  slug: "openhl-validate-payload-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 55,
                  xpReward: 100,
                  content: `# レッスン 13 — \`validate_payload\` が Reth の \`EthBeaconConsensus\` を走らせる

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
\`\`\`

…依然合格する — ただしテストは **3 つの追加結果** を assert する (happy + invalid block の \`validate_payload\` チェック追加):

\`\`\`
test live_node::tests::live_bridge_builds_on_real_genesis ... ok
\`\`\`

中身の変化:
- 今 build した block に対する \`bridge.validate_payload(block)\` は \`PayloadStatus::Valid\` を返す — Reth の **real** validator (\`EthBeaconConsensus::validate_header_against_parent\`) が承認したから。
- \`bridge.validate_payload(block_with_unknown_hash)\` は \`PayloadStatus::Invalid\` を返す — validate する header がないから。

これを動かすために、**\`build_payload\` は production-shape header を produce し始めなければならなかった** — gas_limit を parent からコピー (1/1024 drift bound)、next_block_base_fee を chain spec 経由で計算 (validator が使うのと同じヘルパー)、difficulty をゼロに (post-merge invariant)、attrs が古かった場合 timestamp を \`parent.timestamp + 1\` に snap。**Validator が builder に誠実であることを強制する。**

3 個の新規 workspace dep + 4 個の新規 evm production dep + \`live_node.rs\` の rewrite で約 141 行の変更。**ファイルの shape は変わらない** — 同じ struct、同じ \`ConsensusBridge\` impl。変わるのは \`validate_payload\` が **何をするか**。

## おさらい

L12 完了時点で \`crates/evm/src/live_node.rs\` には:

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    state: Mutex<State>,
}
\`\`\`

\`build_payload\` は parent number を live provider から読むが、ほとんどデフォルトフィールドの header を合成する。\`validate_payload\` は stub: \`Ok(PayloadStatus::Valid)\`。Integration test は build/fetch を happy/negative path で exercise するのみ — validation は決して走らない。

\`cargo test\` で workspace 全体 37 個合格。**Bridge は自分自身と合意しているが、まだ Reth の valid block の概念と合意することを強制されていない。**

## 計画

7 つやる:

1. **3 個の workspace dep を追加**: \`reth-consensus\` (\`HeaderValidator\` trait)、\`reth-ethereum-consensus\` (具象 \`EthBeaconConsensus\`)、\`reth-primitives-traits\` (\`SealedHeader\`)。
2. **\`crates/evm/Cargo.toml\` を更新** — \`reth-chainspec\` を dev-dep から production dep へ昇格、3 個の新規 production dep を追加。
3. **\`LiveRethEvmBridge\` に 2 個の新規フィールド** を追加: \`chain_spec: Arc<ChainSpec>\` と \`validator: EthBeaconConsensus<ChainSpec>\`。\`new()\` を chain spec を受け取るように更新。
4. **\`P\` の trait bound を拡張** — 今は \`HeaderProvider<Header = Header>\` も (parent の full sealed header を fetch するため)。
5. **\`build_payload\` をアップグレード** — parent の full \`SealedHeader\` を pull、next_block_base_fee を計算、gas_limit をコピー、difficulty をゼロに、timestamp monotonicity を強制。
6. **\`validate_payload\` を rewrite** — pending/chain から自分の header を見つけ、provider から parent sealed を fetch、\`validator.validate_header_against_parent\` を走らせる。
7. **テストに 2 個の新規 assertion を追加** — 今 build した block で \`Valid\`、unknown hash で \`Invalid\`。

このレッスンが教えるのは **producer-consumer の自己整合性パターン**。同じ artifact の builder と validator がある場合、**両者は同じルールを使わなければならない**。\`build_payload\` が 1 つの base-fee 公式を使い \`validate_payload\` が別のを使うなら、すべての block が validation に失敗する。これを確保する方法は **両方を同じソースから導出すること** — ここでは \`ChainSpec\`。\`ChainSpec::next_block_base_fee()\` が build に使われ、\`EthBeaconConsensus::validate_against_parent_eip1559_base_fee\` の中で同じヘルパーが check に使われる。**Source-of-truth の共有がシステムを自己整合にする。**

> 🛑 **考えてみよう。** スクロールする前に: なぜ \`EthBeaconConsensus::validate_header_against_parent\` は parent の **full** sealed header (gas_limit、timestamp、base_fee_per_gas、すべて) を必要とするが、\`BlockNumReader::block_number\` は \`u64\` しか返さない? ヒント: Reth の validator が走らせる 4 つの sub-check を考える。Number monotonicity は parent.number だけでいい。Timestamp monotonicity は parent.timestamp が必要。Gas-limit drift は parent.gas_limit が必要。EIP-1559 base fee は parent.base_fee_per_gas + parent.gas_used + parent.gas_limit が必要。**Validate する瞬間に、header 全体が必要 — number だけではない。** だから L13 で trait bound を \`BlockNumReader\` から **加えて** \`HeaderProvider<Header = Header>\` に拡張する。

## 手順

### Step 1: 3 個の workspace dep を追加

ルート \`Cargo.toml\` を開く。L12 の reth ブロックは次で終わる:

\`\`\`toml
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
\`\`\`

\`reth-storage-api\` と \`alloy-genesis\` の間に 3 行挿入:

\`\`\`toml
reth-consensus            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-consensus   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-primitives-traits    = "0.3"
\`\`\`

3 個の dep、3 つの役割:

- **\`reth-consensus\`** — \`HeaderValidator\` trait を定義。\`EthBeaconConsensus\` がこれを impl。この trait 経由で \`.validate_header_against_parent(...)\` を呼ぶ。
- **\`reth-ethereum-consensus\`** — \`EthBeaconConsensus<ChainSpec>\` を提供 — Reth の post-merge Ethereum 用 production header validator。
- **\`reth-primitives-traits\` (crates.io \`0.3\` から)** — \`SealedHeader\` を提供、\`Header\` とその hash をペアにするラッパー。**これは crates.io から、git ではない** — stable foundation crate として spin out された。

> 🛑 **やりがちな勘違い。** 「なぜ \`reth-primitives-traits\` だけ crates.io、他は git-pin?」 **\`reth-primitives-traits\` は Reth の中で public Rust エコシステム crate として **stabilize** された部分だから。** 他の crate (alloy、foundry、custom L2) も全部これに依存している。Git SHA で pin すると、crates.io から import している人すべてとバージョン衝突する — そして皆 crates.io から import している。**Git-pin reth-* dep は主に Reth の「内部」表面; \`reth-primitives-traits\` は **外部** 表面。**

### Step 2: \`crates/evm/Cargo.toml\` を更新

\`[dependencies]\` セクションが 4 行増え、\`reth-chainspec\` が \`[dev-dependencies]\` から昇格:

\`\`\`toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }
reth-consensus           = { workspace = true }    # NEW
reth-ethereum-consensus  = { workspace = true }    # NEW
reth-primitives-traits   = { workspace = true }    # NEW
reth-chainspec           = { workspace = true }    # NEW — [dev-dependencies] にあった
\`\`\`

そして \`[dev-dependencies]\` が \`reth-chainspec\` 行を失う (今は production):

\`\`\`toml
[dev-dependencies]
tokio                = { workspace = true }
reth-node-builder    = { workspace = true, features = ["test-utils"] }
reth-node-ethereum   = { workspace = true, features = ["test-utils"] }
reth-node-core       = { workspace = true }
reth-tasks           = { workspace = true }
# reth-chainspec 行は削除 — 今は production dep
reth-provider        = { workspace = true }
alloy-genesis        = { workspace = true }
serde_json           = { workspace = true }
tempfile             = "3"
\`\`\`

**なぜ \`reth-chainspec\` が今 production**: bridge が struct 内に \`Arc<ChainSpec>\` を保持する。それは production-visible なフィールドなので、型も production-visible dep でなければならない。

### Step 3: \`live_node.rs\` の import + struct を更新

\`crates/evm/src/live_node.rs\` を開く。Import が 3 つ増える:

\`\`\`rust
use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use reth_chainspec::{ChainSpec, EthChainSpec};                      // NEW
use reth_consensus::HeaderValidator;                                // NEW
use reth_ethereum_consensus::EthBeaconConsensus;                    // NEW
use reth_primitives_traits::SealedHeader;                           // NEW
use reth_storage_api::{BlockNumReader, HeaderProvider};             // CHANGED: + HeaderProvider
use std::collections::HashMap;
use std::sync::{Arc, Mutex};                                        // CHANGED: + Arc
\`\`\`

5 個の新規型:
- \`ChainSpec\` — Reth の chain configuration、構築時に渡す。
- \`EthChainSpec\` — \`ChainSpec\` に \`next_block_base_fee\` メソッドを与える trait。
- \`HeaderValidator\` — \`validate_header_against_parent\` を持つ trait。\`EthBeaconConsensus\` がこれを impl。
- \`EthBeaconConsensus\` — Reth の production post-merge header validator。
- \`SealedHeader\` — \`(Header, hash)\` ペア。

変更された import 2 つ: \`HeaderProvider\` (\`sealed_header_by_hash\` 用)、\`Arc\` (chain spec を共有するため)。

次に struct が 2 つフィールドを増やす:

\`\`\`rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,                          // NEW
    validator: EthBeaconConsensus<ChainSpec>,            // NEW
    state: Mutex<State>,
}
\`\`\`

そして \`new()\` が chain spec を受け取るように広がる:

\`\`\`rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            state: Mutex::new(State::default()),
        }
    }

    #[must_use]
    pub fn chain_spec(&self) -> &Arc<ChainSpec> {
        &self.chain_spec
    }
}
\`\`\`

\`State\` は変わらず — 同じ \`next_payload_id\`、\`pending\`、\`chain\`、\`head\`。

\`chain_spec()\` accessor を追加するのは、テストと将来の production caller が欲しがるから (例: ある高さで active な hardfork を chain spec に尋ねる)。\`&Arc<ChainSpec>\` 経由で expose し、caller が自分の参照を持ちたければ clone できる。

### Step 4: \`P\` の trait bound を拡張

\`impl\` ブロックの \`where\` 句がもう 1 個 bound を増やす:

\`\`\`rust
#[async_trait]
impl<P> ConsensusBridge for LiveRethEvmBridge<P>
where
    P: BlockNumReader + HeaderProvider<Header = Header> + Clone + Sync + 'static,
{
\`\`\`

\`HeaderProvider<Header = Header>\` — provider は number だけでなく、full \`Header\` オブジェクトを serve しなければならない。Associated-type binding \`Header = Header\` は「provider の Header 型は **我々の** alloy Header 型」と言う。別の Reth バージョンは \`HeaderProvider\` を別の header 型でパラメータ化する可能性がある (例: Optimism); 我々のは mainnet Ethereum のに制約する。

**\`BlockNumReader\` は今ある意味冗長** (full header をくれる物は number もくれる)、が明示的に残す理由:
- L12 はちょうど \`BlockNumReader\` 用に書いた — 残すことが L12→L13 の進行を文書化する
- 将来の caller は number だけ必要なコードパスにより狭い bound を望むかも

### Step 5: \`build_payload\` をアップグレード — production-shape header

これが load-bearing な変更。新しい \`build_payload\`:

\`\`\`rust
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let parent_b256 = B256::from(parent.0);

        // LIVE READ: pull the parent's full sealed header from the real
        // provider so we can copy fields that EthBeaconConsensus will check
        // against during validate_payload (gas_limit drift, EIP-1559 base
        // fee, difficulty=0 post-merge).
        let parent_sealed = self
            .provider
            .sealed_header_by_hash(parent_b256)
            .map_err(|e| BridgeError::Internal(eyre::eyre!("provider error: {e}")))?
            .ok_or_else(|| {
                BridgeError::Rejected(format!("provider has no block with hash {parent_b256}"))
            })?;
        let parent_header = parent_sealed.header();

        let mut s = self.state.lock().expect("state mutex poisoned");
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1);

        // Compute the EIP-1559 base fee for our block via the chain spec —
        // identical math to what EthBeaconConsensus's
        // \`validate_against_parent_eip1559_base_fee\` will check against.
        let next_base_fee = self
            .chain_spec
            .next_block_base_fee(parent_header, our_timestamp);

        let header = Header {
            parent_hash: parent_b256,
            number: parent_header.number + 1,
            // Timestamp must be strictly greater than parent's; force at least
            // parent.timestamp + 1 even if attrs.timestamp came in stale.
            timestamp: our_timestamp,
            beneficiary: Address::from(attrs.fee_recipient),
            mix_hash: B256::from(attrs.prev_randao),
            // Keep gas_limit identical to parent so EthBeaconConsensus's
            // 1/1024 drift check passes trivially. A real payload builder
            // would tune this per network policy.
            gas_limit: parent_header.gas_limit,
            // Post-merge: difficulty must be 0.
            difficulty: alloy_primitives::U256::ZERO,
            base_fee_per_gas: next_base_fee,
            ..Default::default()
        };
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header));
        Ok(PayloadId(id))
    }
\`\`\`

L12 からの 3 つの変更:

1. **\`block_number\` ではなく \`sealed_header_by_hash\`。** 今 full parent header が必要、number だけではない。Error マッピングは同じ: \`Err(provider_err)\` → \`Internal\`、\`Ok(None)\` → \`Rejected\`。

2. **\`our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1)\`。** Timestamp は厳密に monotonic でなければならない。Engine が \`attrs.timestamp = 5\` と \`parent.timestamp = 100\` を渡したら、\`101\` (parent + 1) を使う。これが古い clock データが \`validate_payload\` を即座に fail させるのを防ぐ。

3. **Header 構築に 4 つの慎重に選ばれたフィールド** が増えた (L12 から):
   - \`gas_limit = parent_header.gas_limit\` — コピーすることで 1/1024 drift check が自明に満たされる。
   - \`difficulty = U256::ZERO\` — post-merge invariant。非ゼロ値はすべて validator を fail させる。
   - \`base_fee_per_gas = next_base_fee\` — \`chain_spec.next_block_base_fee(...)\` で計算、validator が使うのと **同じヘルパー**。
   - \`..Default::default()\` — 他すべて (gas_used、transactions_root など) はゼロのまま。将来 stage のフル実行検証では意味があるが、header-against-parent ではない。

> 🛑 **やりがちな勘違い。** 「なぜ build は EIP-1559 数式を inline でやらず \`chain_spec.next_block_base_fee(parent, timestamp)\` を呼ぶ?」 **Validator が **同じ** call をするから。** 数式を手書きしたら、公式が変わるたびに自分の impl を Reth のと sync しなければならない (変わる — Cancun は \`BASE_FEE_MAX_CHANGE_DENOMINATOR\` を変えた、将来の fork も微調整する)。**Chain spec のヘルパーを呼ぶことで、自分の builder は永遠に validator と合意することが保証される — chain spec が知っていて自分の builder が知らない hardfork も含めて。**

### Step 6: \`validate_payload\` を rewrite

もう一つの load-bearing な変更。Stub を次で置き換える:

\`\`\`rust
    async fn validate_payload(
        &self,
        block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        let block_hash = B256::from(block.hash.0);
        let parent_hash = B256::from(block.parent_hash.0);

        // Find our header for this block. In single-validator mode we always
        // built it, so it sits in pending (pre-commit) or chain (post-commit).
        let header = {
            let s = self.state.lock().expect("state mutex poisoned");
            s.pending
                .values()
                .find(|(h, _)| *h == block_hash)
                .map(|(_, h)| h.clone())
                .or_else(|| s.chain.get(&block_hash).cloned())
        };
        let Some(header) = header else {
            return Ok(PayloadStatus::Invalid);
        };

        // Fetch parent sealed header from the LIVE provider.
        let Some(parent_sealed) = self
            .provider
            .sealed_header_by_hash(parent_hash)
            .map_err(|e| BridgeError::Internal(eyre::eyre!("provider error: {e}")))?
        else {
            return Ok(PayloadStatus::Invalid);
        };

        // Run Reth's real header validator. EthBeaconConsensus checks number
        // monotonicity, timestamp monotonicity, gas-limit drift, base-fee.
        let our_sealed = SealedHeader::new(header, block_hash);
        match self
            .validator
            .validate_header_against_parent(&our_sealed, &parent_sealed)
        {
            Ok(()) => Ok(PayloadStatus::Valid),
            Err(_) => Ok(PayloadStatus::Invalid),
        }
    }
\`\`\`

4 フェーズ:

1. **Header lookup** — \`block.hash\` 用の自分の header を \`pending\` (just-built) または \`chain\` (already-committed) で見つける。見つからなければ → \`Invalid\`。Single-validator モードでは、validate するすべての block は **我々が** build したものなので、それら 2 つの map のどちらかにある。
2. **Parent lookup via live provider** — \`sealed_header_by_hash(parent_hash)\`。見つからなければ → \`Invalid\`。Provider が error なら → \`BridgeError::Internal\`。
3. **\`SealedHeader\` で wrap** — \`SealedHeader::new(header, block_hash)\` が header と hash を再計算なしでペアにする。
4. **Validator を走らせる** — \`validator.validate_header_against_parent(&our_sealed, &parent_sealed)\` は \`Result<(), ConsensusError>\` を返す。\`Ok(())\` → \`PayloadStatus::Valid\`、任意の \`Err(_)\` → \`PayloadStatus::Invalid\` にマップ。

**Reth が内部で走らせる 4 つの sub-check** (自分で書く必要はないが、知っておく価値あり):
- \`validate_against_parent_hash_number\` — block.number == parent.number + 1
- \`validate_against_parent_timestamp\` — header.timestamp > parent.timestamp
- \`validate_against_parent_gas_limit\` — gas_limit が parent から 1/1024 以内
- \`validate_against_parent_eip1559_base_fee\` — base_fee_per_gas が EIP-1559 公式に一致

どれかが fail すると、validator は \`Err(...)\` を返す。特定の error は伝播しない — この層では engine は「valid か否か」を知るだけでよい。将来のデバッグでは error 型をログできる。

> 🛑 **やりがちな勘違い。** 「なぜ \`Err(_)\` を \`PayloadStatus::Invalid\` にマップして \`BridgeError::Internal\` ではない?」 **Validation 失敗は protocol レベルのシグナルで、運用失敗ではないから。** 「この block はルールを満たさない」は validator が **そのために存在する** こと — 答えであって crash ではない。\`BridgeError::Internal\` は上に伝播して engine app loop を kill する。\`PayloadStatus::Invalid\` は engine を継続させ、block を拒否された proposal として扱う。**Error の型を会話レベルに合わせる。**

### Step 7: テスト更新 — 2 個の新規 assertion

テストは新しい bridge constructor 呼び出し (今は chain_spec を取る) と 2 個の \`validate_payload\` assertion を得る:

\`\`\`rust
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn live_bridge_builds_on_real_genesis() {
        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        let NodeHandle {
            node,
            node_exit_future: _,
        } = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .node(EthereumNode::default())
            .launch_with_debug_capabilities()
            .await
            .expect("launch failed");

        let genesis_hash_b256 = node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no block 0 (genesis)");

        // CHANGED: bridge takes chain_spec now (wires up EthBeaconConsensus).
        let bridge = LiveRethEvmBridge::new(node.provider.clone(), chain_spec.clone());

        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs.clone())
            .await
            .expect("build_payload failed");
        let block = bridge.payload_ready(id).await.expect("payload_ready failed");

        assert_eq!(block.parent_hash, BlockHash(genesis_hash_b256.0));
        assert_eq!(block.number, 1);

        // NEW: validate_payload runs EthBeaconConsensus against the live parent.
        let status = bridge
            .validate_payload(&block)
            .await
            .expect("validate_payload failed");
        assert_eq!(status, PayloadStatus::Valid);

        // NEW: unknown block hash → Invalid (we have no header to validate).
        let unknown_block = ExecutedBlock {
            hash: BlockHash([0xddu8; 32]),
            parent_hash: BlockHash(genesis_hash_b256.0),
            number: 1,
            state_root: [0u8; 32],
        };
        let status = bridge
            .validate_payload(&unknown_block)
            .await
            .expect("validate_payload failed");
        assert_eq!(status, PayloadStatus::Invalid);

        // (L12 からの negative case は変わらず。)
        let fake_parent = BlockHash([0xeeu8; 32]);
        let err = bridge.build_payload(fake_parent, attrs).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
\`\`\`

2 個の新規ブロック:

- **\`build_payload\` 後の \`validate_payload(&block)\`** — 今 build した block は validate されなければならない。**これが load-bearing な assertion** — build と validate がルールに合意していることを証明する。EIP-1559 公式を間違えたら、difficulty が非ゼロだったら、gas_limit が drift したら、これは fail する。
- **\`validate_payload(&unknown_block)\`** — hash が pending/chain にない block は \`Invalid\` を返す。Lookup fallthrough をテスト。

## テスト

\`\`\`bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
\`\`\`

~30 秒後 (コンパイル + test):

\`\`\`
running 1 test
test live_node::tests::live_bridge_builds_on_real_genesis ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Test runtime: 依然 ~2.4 秒 — Reth bootstrap が支配的、\`validate_payload\` は < 1ms を追加。

Full suite:

\`\`\`bash
cargo test
\`\`\`

…workspace 全体 37 個合格するはず (テスト数は変わらず — 既存テストが assertion を増やしただけ)。

よくあるエラーと対処:

- **\`assert_eq!(status, PayloadStatus::Valid)\` が fail** — 最も多い問題。\`build_payload\` が \`EthBeaconConsensus\` が拒否する header を produce している。可能性のある原因:
  - \`difficulty: U256::ZERO\` を忘れた — デフォルトは非ゼロ、post-merge check が fail。
  - \`gas_limit: parent_header.gas_limit\` を忘れた — デフォルトはゼロ、parent から 1/1024 以上 drift。
  - base_fee 計算間違い — \`chain_spec.next_block_base_fee(parent, timestamp)\` を使うべき。
  - Timestamp が parent より厳密に大きくない — \`our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1)\` を強制すべき。
- **\`error[E0277]: HeaderProvider not satisfied\`** — workspace の \`reth-storage-api\` SHA が \`reth-provider\` と一致しない。すべての reth-* git-pin dep は同じ SHA を共有しなければならない。
- **\`error[E0277]: HeaderValidator is not in scope\`** — \`use reth_consensus::HeaderValidator\` を忘れた。Trait はメソッドを呼ぶために scope に入っている必要がある。
- **\`error: 'next_block_base_fee' not found on ChainSpec\`** — \`use reth_chainspec::EthChainSpec\` を忘れた。\`next_block_base_fee\` は \`ChainSpec\` 自体ではなく \`EthChainSpec\` 拡張 trait 上にある。

## 設計の振り返り

3 つの load-bearing な決定:

1. **builder と validator が source of truth を共有する。** \`ChainSpec::next_block_base_fee\` が次 block の base fee を build するもの; \`EthBeaconConsensus::validate_against_parent_eip1559_base_fee\` が同じヘルパーを呼んで check する。**重複した数式なし、hardfork 間の drift リスクなし。** これは build/validate ペアがあるたびにコピーするパターン。

2. **validator の error は \`Invalid\` になり、伝播しない。** Validator が「いいえ、これは malformed」と答えるのは crash ではなく **通常** パス。その \`Err(_)\` を \`PayloadStatus::Invalid\` にマップすると engine は走り続け、次の proposal を選べる。運用失敗 (DB error) は依然 \`BridgeError::Internal\` 経由でエスカレート。

3. **\`P\` の trait bound は incrementally 広がる。** L12 は \`BlockNumReader\` が必要だった; L13 は \`BlockNumReader + HeaderProvider\` が必要。各レッスンが新しい capability surface を露出する。**Trait bound は spec — 自分の implementation が何を要求するかを consumer に正確に伝える。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 0844d58
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

\`0844d58\` の参照には \`live_node.rs\` に L12 から ~141 行の変更が含まれる。新しい struct フィールド、アップグレードされた \`build_payload\`、rewrite された \`validate_payload\`、新しい test assertion は厳密に一致するべき。Doc コメントの言い回しは個人差可。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ 4 つの sub-check (\`validate_against_parent_hash_number\` など) を手動で走らせない?**
できる — すべて \`EthBeaconConsensus\` 上で \`pub\`。だが \`validate_header_against_parent\` は 4 つを順序に走らせ、正しい引数形と適切な short-circuiting を提供する。**Orchestration を再実装することは、trait メソッドが防ぐためにある error-prone な仕事。** ボーナス: 将来の Reth バージョンが 5 つ目の check を追加するかもしれない; orchestrating method を呼ぶことで無料で拾える。

**Q: \`SealedHeader::new(header, hash)\` は tuple として保持するのと何が違う?**
キャッシュ。\`SealedHeader\` は hash を保存するので、後続の \`.hash()\` 呼び出しが再計算しない (Keccak over ~500 bytes — 高 block rate では意味がある)。Tuple は再計算を強制する。**ネットワーク端でしばらく重要になる最適化** — 毎秒数千 block を処理する場所; 我々の test ではマイクロ秒の節約。

**Q: なぜテストは \`dev_chain_spec()\` が \`Arc<ChainSpec>\` を返すのに \`chain_spec.clone()\` を使う?**
\`Arc<T>\` を clone すると refcount を increment する; 下位の \`ChainSpec\` データはコピーしない。3 つの参照が必要: 1 つは \`NodeConfig\` 内、1 つは \`LiveRethEvmBridge::new\` に渡す、1 つは将来の用途用。各 \`.clone()\` は atomic increment だけ — ナノ秒単位。

**Q: \`dev_chain_spec()\` ではなく \`chain_spec: Arc::new(ChainSpec::default())\` を渡すと何が起きる?**
Validator と chain がどの hardfork が active か合意しない。\`ChainSpec::default()\` は最小限の Ethereum mainnet shape; live node は \`dev_chain_spec()\` (chainId 2600、すべての fork が 0) で構築された。Validator が内部で走らせる \`EthChainSpec::is_fork_active_at_timestamp(...)\` check で発散する。**同じ chain_spec を node と bridge の両方に渡す** — それが contract。

## 次のレッスン (L14)

4 つの \`ConsensusBridge\` メソッドのうち 2 つは live Reth に当たる。**3 つ目 — \`commit\` — はまだ in-process \`chain: HashMap\` に hash を記録している。** L14 (最後の大レッスン) でこれを real **Engine API forkchoice update** に置き換える、Reth が production で block を commit するために使う JSON-RPC call。L14 完了後、我々の bridge は他のどの Ethereum CL client (Lighthouse、Prysm、Teku) も produce する同じ wire-format アクションを produce する。**L15 がそれから capstone** — 1 ページの再キャップ、「構築したすべて」図、optional な production-readiness チェックリスト (block bodies、gossip codec、real WAL)。`,
                },
                {
                  title: "レッスン 14 — commit が Reth の Engine API forkchoice を駆動する",
                  slug: "openhl-commit-forkchoice-ja",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 50,
                  xpReward: 90,
                  content: `# レッスン 14 — \`commit\` が Reth の Engine API forkchoice を駆動する

## ゴール

このレッスンの終わりに:

\`\`\`bash
cargo test -p openhl-evm commit_sends_forkchoice_to_engine_when_handle_installed --release
\`\`\`

…が新規 integration test 1 個に合格する。L11-L13 の既存テストと合わせて、bridge は **4 つの \`ConsensusBridge\` メソッドすべてが real Reth コードパスに到達** する状態に:

| メソッド | やること | 走る real Reth コード |
| - | - | - |
| \`build_payload\` | Child block を build | \`HeaderProvider::sealed_header_by_hash\`, \`ChainSpec::next_block_base_fee\` |
| \`payload_ready\` | Build された block を fetch | (ローカル — bridge の pending map) |
| \`validate_payload\` | Block を check | \`EthBeaconConsensus::validate_header_against_parent\` |
| **\`commit\`** | Block を canonical にする | **\`ConsensusEngineHandle::fork_choice_updated\`** |

中身の変化:
- \`LiveRethEvmBridge\` に新規 optional フィールド \`engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>\`。
- 新規 builder メソッド \`with_engine_handle()\` と introspection \`has_engine_handle()\`。
- \`commit()\` が **2 つのこと** をする: (1) ローカル bookkeeping (L13 から変わらず)、続いて (2) engine handle がインストールされていれば Reth の in-process Engine API に \`ForkchoiceUpdated\` を fire する。

**Engine は今のところ \`SYNCING\` を返す — そしてこの段階ではそれが正しい。** まだマッチする \`engine_newPayload\` 呼び出しを送っていないから (それは EVM-executable トランザクション body が必要で、本コースの範囲外)。Wire は接続される; payload-execution alignment は fills が EVM トランザクションになってからの作業。

## おさらい

L13 完了時点で \`crates/evm/src/live_node.rs\` には:

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    state: Mutex<State>,
}
\`\`\`

\`build_payload\`、\`payload_ready\`、\`validate_payload\` はすべて live Reth に対して走る。\`commit\` は依然新しい head を \`state.chain\` (in-process \`HashMap\`) に記録し \`state.head\` を更新する。**ローカルのみ。** Live Reth node を query する RPC クライアントには head が依然 genesis に見える — consensus engine は我々が何を decide したか知らない。

\`cargo test\` で workspace 全体 37 個合格。**Bridge は canonical chain を知っているが、Reth は知らない。**

## 計画

6 つやる:

1. **2 個の workspace dep を追加**: \`reth-ethereum-engine-primitives\` (\`EthEngineTypes\` 用) と \`alloy-rpc-types-engine\` (\`ForkchoiceState\` 用)。
2. **\`crates/evm/Cargo.toml\` を更新** — 3 個の新規 production dep を追加 (上記 2 個 + \`reth-engine-primitives\` で \`ConsensusEngineHandle\` を提供)。
3. **\`live_node.rs\` の import + struct を更新** — 新規フィールド \`engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>\`。
4. **Builder メソッドを追加** — \`with_engine_handle()\` は self を consume して handle をインストール; \`has_engine_handle()\` は \`const fn\` accessor。
5. **\`commit()\` を rewrite** — ローカル bookkeeping を先 (変わらず)、engine handle がインストールされていれば best-effort で \`ForkchoiceUpdated\`。
6. **integration test を追加** — \`EthereumNode\` を bootstrap、\`add_ons_handle.beacon_engine_handle\` を pull、\`with_engine_handle()\` 経由で配線、commit パスを exercise。

このレッスンが教えるのは **成功後の副作用パターン**。Bridge のローカル bookkeeping が consensus 層の **source of truth** — 他の何かが起こる前に成功しなければならない。Engine API 呼び出しは **副作用**: 有用 (下流 RPC クライアントが新しい head を見られる) だが、その失敗がコミットを roll back するべきではない。パターン:

\`\`\`text
1. 成功しなければならないこと (ローカル state mutation) をする。
2. Best-effort 副作用 (fire-and-mostly-forget)。
3. 成功を返す。
\`\`\`

Step 2 が失敗してもログするが伝播しない — Step 1 はすでに起きたから、roll back すると不整合状態に陥る。**成功の **後** に続く副作用は、成功を **gate する** 副作用とは異なる。**

> 🛑 **考えてみよう。** スクロールする前に: なぜテストは \`commit().await.expect(...)\` が成功することだけを assert し、Reth の canonical chain head が動いたことは assert しない? ヒント: \`build_payload\` の出力に何が欠けているか考える。Engine に渡す \`ExecutedBlock\` は header だけ — トランザクションなし、receipt なし、state root なし。Reth の engine は canonical chain を advance するために **実際の block body** が必要。\`engine_newPayload\` を先に送らないと、\`fork_choice_updated\` は \`SYNCING\` (「この block をまだ知らない、body を fetch しろ」) を返す。Wire は接続されている; データは違う。**L14 は接続を証明する; payload execution は将来コースに先送り。**

## 手順

### Step 1: 2 個の workspace dep を追加

ルート \`Cargo.toml\` を開く。Reth ブロック (L13 後) は次で終わる:

\`\`\`toml
reth-ethereum-consensus   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-primitives-traits    = "0.3"
alloy-genesis             = { version = "2.0", default-features = false }
\`\`\`

\`reth-ethereum-consensus\` の直後に 1 行追加:

\`\`\`toml
reth-ethereum-engine-primitives = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
\`\`\`

そしてもう少し下の alloy ブロック (既存の \`alloy-consensus\` workspace dep を見つける) に 1 行追加:

\`\`\`toml
alloy-rpc-types-engine = { version = "2.0", default-features = false }
\`\`\`

2 個の dep、2 つの役割:

- **\`reth-ethereum-engine-primitives\`** — \`EthEngineTypes\` を提供、「Ethereum mainnet の engine surface」と言う type bundle (vs. Optimism、custom L2)。我々の \`ConsensusEngineHandle<EthEngineTypes>\` はこれに対してパラメータ化される。
- **\`alloy-rpc-types-engine\`** — \`ForkchoiceState { head_block_hash, safe_block_hash, finalized_block_hash }\` を提供、\`engine_forkchoiceUpdatedV4\` 呼び出しの canonical wire-format payload。同じ struct を CL クライアント (Lighthouse、Prysm) が EL クライアントに JSON-RPC 越しに送る; 我々は in-process で使う。

**\`alloy-rpc-types-engine\` のバージョンに注意**: \`2.0\` に pin、Reth v2.2.0 自身の pinned \`alloy-rpc-types-engine\` \`2.0.4\` とマッチ。ここでバージョン不一致だと \`ForkchoiceState\` が 2 つの異なる型になり、engine handle が呼び出しを拒否する。

### Step 2: \`crates/evm/Cargo.toml\` を更新

\`[dependencies]\` ブロックが 3 行増える:

\`\`\`toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }
reth-consensus           = { workspace = true }
reth-ethereum-consensus  = { workspace = true }
reth-primitives-traits   = { workspace = true }
reth-chainspec           = { workspace = true }
reth-engine-primitives          = { workspace = true }    # NEW: ConsensusEngineHandle
reth-ethereum-engine-primitives = { workspace = true }    # NEW: EthEngineTypes
alloy-rpc-types-engine          = { workspace = true }    # NEW: ForkchoiceState
\`\`\`

\`reth-engine-primitives\` は L1 から workspace dep だった (中間 stage で \`PayloadAttributesBuilder\` が住む場所として)。ここで「workspace で利用可能」から「この crate で import」へ昇格。

### Step 3: \`live_node.rs\` の import + struct を更新

\`crates/evm/src/live_node.rs\` を開く。Import が 3 行増える:

\`\`\`rust
use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use alloy_rpc_types_engine::ForkchoiceState;                        // NEW
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use reth_chainspec::{ChainSpec, EthChainSpec};
use reth_consensus::HeaderValidator;
use reth_engine_primitives::ConsensusEngineHandle;                  // NEW
use reth_ethereum_consensus::EthBeaconConsensus;
use reth_ethereum_engine_primitives::EthEngineTypes;                // NEW
use reth_primitives_traits::SealedHeader;
use reth_storage_api::{BlockNumReader, HeaderProvider};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
\`\`\`

3 個の新規型:
- \`ForkchoiceState\` — engine に送る payload (head/safe/finalized block hash)。
- \`ConsensusEngineHandle\` — Reth が engine actor にメッセージを送るために我々にくれる handle。
- \`EthEngineTypes\` — Ethereum mainnet の engine surface に handle を bind する type parameter。

次に struct が 1 フィールド増える — \`engine_handle\`、optional:

\`\`\`rust
#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    /// Optional in-process Engine API handle. When installed via
    /// [\`Self::with_engine_handle\`], \`commit\` sends a \`ForkchoiceUpdated\`
    /// to Reth so its canonical chain advances in lockstep with consensus.
    /// \`None\` at v0 means commits stay local to the bridge's \`state.chain\`
    /// \`HashMap\` — fine for unit tests, but RPC clients won't see new heads.
    engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>,           // NEW
    state: Mutex<State>,
}
\`\`\`

\`State\` は変わらず。

> 🛑 **やりがちな勘違い。** 「なぜ \`engine_handle\` が \`Option<...>\` で常に必須ではない?」 **\`LiveRethEvmBridge\` のすべての consumer が Reth を bootstrap する production node ではないから。** Unit test (L12、L13) は provider に対する bridge だけが欲しい; 動く engine は要らない。Engine handle を全 caller に強制すると、(a) 全 test がフル node を bootstrap するか、(b) 構築が難しい no-op「fake handle」型が必要。\`Option\` なら同じ struct が両世界に仕える: test は \`None\` を渡す、production は \`Some(handle)\` を渡す。**型レベルの optionality が漏れる API surface を避ける方法。**

### Step 4: \`new()\` を更新し、builder メソッドを追加

\`new()\` が \`engine_handle: None\` を初期化:

\`\`\`rust
impl<P> LiveRethEvmBridge<P> {
    #[must_use]
    pub fn new(provider: P, chain_spec: Arc<ChainSpec>) -> Self {
        let validator = EthBeaconConsensus::new(Arc::clone(&chain_spec));
        Self {
            provider,
            chain_spec,
            validator,
            engine_handle: None,                                  // NEW
            state: Mutex::new(State::default()),
        }
    }

    /// Install a Reth in-process Engine API handle. After this call,
    /// \`commit\` will fire a \`ForkchoiceUpdated\` to Reth's consensus engine
    /// alongside its own local bookkeeping. Without an engine handle, the
    /// bridge still works (commits go to its internal \`HashMap\`) but Reth's
    /// canonical chain won't advance — RPC and any other Reth consumer will
    /// see only the genesis block.
    #[must_use]
    pub fn with_engine_handle(
        mut self,
        handle: ConsensusEngineHandle<EthEngineTypes>,
    ) -> Self {
        self.engine_handle = Some(handle);
        self
    }

    #[must_use]
    pub const fn has_engine_handle(&self) -> bool {
        self.engine_handle.is_some()
    }

    #[must_use]
    pub fn chain_spec(&self) -> &Arc<ChainSpec> {
        &self.chain_spec
    }
}
\`\`\`

3 個の新規メソッド:

- **\`with_engine_handle()\`** — consume-and-return-self builder。\`mut self\` パラメータが所有権を取り、mutate、return。canonical Rust「builder method」パターン。**\`#[must_use]\`** にするのは、返り値を bind し忘れる (例: \`bridge.with_engine_handle(h);\`) と modify された bridge がサイレントに drop されるから。
- **\`has_engine_handle()\`** — \`const fn\` accessor。Test と assertion 用 (「配線が実際に効いたか?」)。\`const\` なのは \`Option::is_some()\` チェックが runtime 計算を要さないから。
- **\`new()\` 初期化** — 唯一の変更は \`engine_handle: None\`。Handle が欲しい caller は \`LiveRethEvmBridge::new(p, c).with_engine_handle(h)\` を使う。

### Step 5: \`commit()\` を rewrite — ローカル先、engine は best-effort

Load-bearing な変更。L13 の \`commit\` を置き換える:

\`\`\`rust
    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        let hash = B256::from(block_hash.0);

        // Local bookkeeping first. If this fails, we never call the engine
        // — the bridge stays in a consistent state.
        let _header = {
            let mut s = self.state.lock().expect("state mutex poisoned");
            let header = s
                .pending
                .values()
                .find(|(h, _)| *h == hash)
                .map(|(_, h)| h.clone())
                .ok_or_else(|| {
                    BridgeError::Rejected(format!("commit for unknown hash {hash}"))
                })?;
            s.chain.insert(hash, header.clone());
            s.head = Some(hash);
            header
        };

        // Best-effort: if an Engine API handle has been installed, also tell
        // Reth's consensus engine about the new canonical head. We always
        // commit *locally* first (above) — sending to the engine is best-
        // effort at this stage because we haven't yet uploaded a real
        // ExecutionPayload via newPayload, so the engine will return
        // SYNCING/INVALID. The wire being connected is what 7d proves; full
        // payload-execution alignment is downstream once fills become EVM
        // transactions.
        if let Some(handle) = &self.engine_handle {
            let state = ForkchoiceState {
                head_block_hash: hash,
                safe_block_hash: hash,
                finalized_block_hash: hash,
            };
            let _ = handle.fork_choice_updated(state, None).await;
        }

        Ok(())
    }
\`\`\`

2 フェーズ:

1. **ローカル bookkeeping** — L13 と同じ shape。Pending header を hash で lookup、\`chain\` に insert、\`head\` を更新。Header が欠けていれば → \`BridgeError::Rejected\`。Header binding は今 \`let _header\` — この関数で後で使わないから; binding は明瞭さと将来の telemetry 用に存在。

2. **Best-effort engine 通知** — \`engine_handle.is_some()\` のときだけ。3 スロット (head、safe、finalized) すべてを新しい hash に向けた \`ForkchoiceState\` を build。**なぜ 3 つすべて同じ hash?** v0 では separate finalization layer がない — 我々のモデルではコミットされた block はすべて safe で finalized。Production multi-validator chain は別々に track する (block は head になれるが、その descendant に 2/3 の validator が vote するまで finalized ではない)。

3. **\`let _ = ...await\` は意図的** — engine のレスポンスを discard する。Engine は返す:
   - \`VALID\` — マッチする \`engine_newPayload\` をマッチする block body と共に先に送ると、これが happy case。
   - \`SYNCING\` — **今** 得るもの、\`newPayload\` を送っていないから。Engine は peer から block を fetch したいが peer がいない。
   - \`INVALID\` — engine が拒否した block を canonical にせよと頼んだ意味。我々が自分で build した block には実際には起きないはず。

**L14 では 3 つすべての response が同じコードパスに導く: continue。** ローカル bookkeeping はすでに起きた。

> 🛑 **やりがちな勘違い。** 「\`INVALID\` で error を返さず engine のレスポンスを discard するのはなぜ?」 **Bridge のローカル state が consensus 層の source of truth で、Reth のではないから。** Reth が \`INVALID\` と言ってローカル state を roll back すると、Malachite に「実はその decided block は存在しない」と告げることになり、chain を break する。この層での不一致への正しい応答は **大声でログする** こと **operator にアラートする** こと — だが consensus commit を decode roll back しない。**Reth の chain の view は consensus の下流であり、逆ではない。**

### Step 6: テスト更新 (rename + engine 配線追加)

L13 の既存 test \`live_bridge_builds_on_real_genesis\` を開く。既存テストを modify するのではなく、新規テストを **追加** する — L12/L13 のテストは依然証明していることを証明し、別テストを追加することで新挙動を isolated に保つ。

\`crates/evm/src/live_node.rs\` の \`tests\` モジュールに append:

\`\`\`rust
    /// **Stage 7d**: with a Reth \`ConsensusEngineHandle\` installed, \`commit\`
    /// sends a \`ForkchoiceUpdated\` to the in-process Engine API. The bridge's
    /// own bookkeeping still happens (so existing callers don't regress), but
    /// now Reth is told about the new head too.
    ///
    /// At this stage the engine will respond SYNCING because we haven't sent
    /// a matching \`newPayload\` (\`build_payload\` doesn't yet produce a real
    /// \`ExecutionPayload\`). That's intentional: L14 proves the wire is
    /// connected. Full alignment between Malachite's commit and Reth's
    /// canonical head needs \`newPayload\` integration, which is the next
    /// staging chunk after fills become EVM transactions.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn commit_sends_forkchoice_to_engine_when_handle_installed() {
        use reth_node_ethereum::node::EthereumAddOns;

        let runtime = Runtime::test();
        let chain_spec = dev_chain_spec();
        let node_config = NodeConfig::test().dev().with_chain(chain_spec.clone());

        // We need add_ons_handle for the engine handle — use the explicit
        // NodeBuilder path with EthereumAddOns rather than launch_with_dbg.
        let handle = NodeBuilder::new(node_config)
            .testing_node(runtime)
            .with_types::<EthereumNode>()
            .with_components(EthereumNode::components())
            .with_add_ons(EthereumAddOns::default())
            .launch()
            .await
            .expect("launch failed");

        // Pull the engine handle out of add_ons. This is what RPC's
        // engine_forkchoiceUpdated endpoint would dispatch to — we're
        // taking the in-process shortcut around the JSON-RPC layer.
        let engine_handle = handle.node.add_ons_handle.beacon_engine_handle.clone();

        let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec)
            .with_engine_handle(engine_handle);
        assert!(
            bridge.has_engine_handle(),
            "with_engine_handle must install the handle"
        );

        let genesis_hash_b256 = handle
            .node
            .provider
            .block_hash(0)
            .expect("provider call failed")
            .expect("provider has no genesis");

        // Build a payload on top of genesis so commit has something to find.
        let attrs = PayloadAttrs {
            timestamp: 1,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        };
        let id = bridge
            .build_payload(BlockHash(genesis_hash_b256.0), attrs)
            .await
            .expect("build_payload failed");
        let block = bridge.payload_ready(id).await.expect("payload_ready failed");

        // The actual test: commit should not panic, not block forever, not
        // surface an error from the engine-side SYNCING response. We're
        // proving the wire is connected — that fork_choice_updated reaches
        // the engine and returns *some* response (even SYNCING).
        bridge
            .commit(block.hash)
            .await
            .expect("commit failed even though local bookkeeping should succeed");

        // Negative case: a commit for an unknown hash must still be Rejected
        // (the engine-side call doesn't happen because the bridge bails out
        // before it).
        let bogus = BlockHash([0xddu8; 32]);
        let err = bridge.commit(bogus).await.unwrap_err();
        assert!(
            matches!(err, BridgeError::Rejected(_)),
            "unknown hash must yield Rejected"
        );

        drop(handle);
    }
\`\`\`

新規部分の walk-through:

1. **\`with_types::<EthereumNode>()\` + \`with_components(...)\` + \`with_add_ons(EthereumAddOns::default())\`** — 明示的 builder パス。\`launch_with_debug_capabilities\` (L11-L13) は \`add_ons_handle\` を expose しないショートカット。Beacon engine handle を pull するには明示的形が必要。
2. **\`handle.node.add_ons_handle.beacon_engine_handle.clone()\`** — Engine handle は add_ons の中。内部的に \`Arc\` ベース handle; clone は安価。
3. **\`.with_engine_handle(engine_handle)\`** — 新規 builder メソッド。なしだと \`commit\` はローカル bookkeeping だけ。ありだと \`commit\` も forkchoice を fire する。
4. **\`assert!(bridge.has_engine_handle())\`** — 配線 guard。\`with_engine_handle()\` にバグがあれば、テストの残りが走る前に catch する。
5. **\`commit(block.hash).await.expect("commit failed")\`** — メイン assertion。**engine が返したものは check しない** — \`commit\` が \`Ok(())\` を返すだけ。Engine の SYNCING レスポンスは Step 5 で \`commit\` 内で discard される。
6. **Negative case 維持** — unknown hash は依然 \`BridgeError::Rejected\`。Bridge が engine パスに到達する前に bail するので engine パスは fire しない。

> 🛑 **やりがちな勘違い。** 「\`launch_with_debug_capabilities\` を使って add_ons_handle がそこにあると願えばいいんじゃ?」 **ダメ — 異なる launch パスは異なる handle shape を produce する。** \`launch_with_debug_capabilities\` は debug RPC 付き \`NodeHandle\` を返すが add_ons を expose しない。明示的 builder chain (\`.with_types().with_components().with_add_ons().launch()\`) が \`add_ons_handle\` をくれる形。**どの launch パスがどの handle shape を produce するかを知ることは、特定のフィールドが必要になるまで invisible な詳細。**

## テスト

\`\`\`bash
cargo test -p openhl-evm commit_sends_forkchoice_to_engine_when_handle_installed --release
\`\`\`

~30 秒後 (コンパイル + node bootstrap):

\`\`\`
running 1 test
test live_node::tests::commit_sends_forkchoice_to_engine_when_handle_installed ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

Test runtime: ~3 秒 (Reth bootstrap + forkchoice ラウンドトリップ)。

Full suite:

\`\`\`bash
cargo test
\`\`\`

…workspace 全体 38 個合格するはず (L13 の 37 + 新規テスト)。

よくあるエラーと対処:

- **\`error[E0282]: type annotations needed for \`Option<ConsensusEngineHandle<_>>\`** — \`new()\` の \`engine_handle: None\` は型パラメータが推論される必要がある。Struct フィールドの型注釈が欠けているか間違っている、または \`EthEngineTypes\` import を忘れている。Step 3 を再確認。
- **\`error: cannot find struct \`EthereumAddOns\` in module \`reth_node_ethereum::node\`** — \`reth-node-ethereum\` と他の \`reth-*\` の version drift。すべての git-pinned reth dep は同じ SHA を共有しなければならない。
- **テストが 30 秒以上 hang** — \`fork_choice_updated\` 呼び出しが return していない可能性が高い。\`let _ = handle.fork_choice_updated(state, None).await\` (\`.await\` 付き!) を使ったか確認 — なしだと future が完了前に drop される。
- **\`assert!(bridge.has_engine_handle())\` が fail** — \`with_engine_handle\` が \`#[must_use]\` だが return を bind し忘れた: \`let bridge = ...new(...); bridge.with_engine_handle(h);\`。\`let bridge = ...new(...).with_engine_handle(h);\` でなければならない。
- **Commit が \`Ok\` を返すが unknown hash テストも \`Ok\` を返す (rejection なし)** — commit ロジックが local lookup の前に engine パスに到達している。Step 5 を再確認 — \`?\` が \`BridgeError::Rejected\` を伝播し engine ブロック前に exit する。

## 設計の振り返り

3 つの load-bearing な決定:

1. **ローカル state 先、engine 後。** Bridge の \`chain: HashMap\` が consensus 層の source of truth。Engine に **先に** 送って失敗すると、ローカル state を roll back するか判断しなければならない — そして consensus commit を roll back することは safety 違反。**順序が正解を強制する: ローカルで成功してから下流に通知。** このパターンは primary store + secondary index/replica があるシステムに一般化する。

2. **\`Option<EngineHandle>\` がテスト surface をクリーンに保つ。** Optionality なしだと、すべての unit test が non-test engine handle を得るためにフル node を bootstrap する必要がある。Optionality ありだと、test は \`None\` を渡してローカルパスを exercise、integration test は \`Some(handle)\` を渡して両方を exercise。**型レベル optionality がインフラを全 test に強制する回避法。**

3. **Engine レスポンスは意図的に discard される。** \`SYNCING\` が今期待されるレスポンス (\`newPayload\` を送っていない)。これに error を返すと、すべての consumer に L14 が partial integration と知らせることを強制する。Discard で API contract をクリーンに保つ: 「commit はローカルで完了、下流通知は best-effort」。**クライアントが知る必要があるのは知る必要があるだけ — それ以上は不要。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 0cac571
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

\`0cac571\` の参照には本コースで導入していない追加コード (Stage 8 由来の CLOB integration) が含まれる場合がある。Stage 7d 固有の変更 — \`engine_handle\` フィールド、\`with_engine_handle()\` builder、\`commit\` body の restructure、\`add_ons_handle.beacon_engine_handle\` を使う integration test — は厳密に一致するべき。Doc コメントの言い回しは個人差可。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`add_ons_handle\` とは何で、なぜ engine handle がその中にある?**
\`add_ons_handle\` は launched node に attach された「追加 capability」 — RPC server、engine API endpoint、payload builder hook — の Reth bundle。Beacon engine handle がこれらの 1 つなのは、engine API が **外部** CL クライアント (Lighthouse、Prysm) が JSON-RPC で使うものだから。我々は handle を直接 pull することで in-process ショートカットを取っているが、同じ handle がネットワーク向け API を支える。

**Q: なぜ \`ForkchoiceState\` には 3 フィールド (head/safe/finalized) があるのにすべて同じ値に設定する?**
Engine API は separate finalization layer を持つ chain 用に設計されたから。Ethereum mainnet では head はすべての slot (12 秒) で advance できるが、block が「safe」になるのは 32 slot 後 (Casper checkpoint)、「finalized」になるのは 64+ slot 後。我々の v0 single-validator chain にはそんな区別はない — どのコミットも final。3 つすべてを同じ hash に設定するのが v0 の簡略化; multi-validator OpenHL なら区別する。

**Q: マッチする \`newPayload\` なしで \`ForkchoiceUpdated\` を受け取ると engine は実際に **何を** する?**
\`PayloadStatusEnum::Syncing\` で応答し、内部的に peer から block を sync しようとし始める。我々の isolated dev node には peer がいないので、sync リクエストはどこにも行かない。Engine は単にその hash 用の「block 待ち」状態に座る。**それでいい** — L14 の目的で engine が canonical chain を advance させる必要は実は決してない。\`newPayload\` 経由で実 block body を導入する将来コース教材がこのギャップを埋めるだろう。

**Q: Await の代わりに \`ForkchoiceUpdated\` を非同期に送って即座に return できる?**
できる — \`tokio::spawn(handle.fork_choice_updated(...))\` で fire-and-forget。だが await は fast (SYNCING で sub-millisecond) でレスポンスをログするオプションをくれる。Async-spawn アプローチはテスト順序も難しくする (テスト exit 前に engine が update を見るか?)。**Await が安全なデフォルト。**

## 次のレッスン (L15 — capstone)

完全な consensus↔EVM bridge ができた。**4 つの \`ConsensusBridge\` メソッドすべてが real Reth コードパスに到達する。** L15 は capstone: フルシステムを示す 1 ページの recap、production が必要だが skip したもの (\`newPayload\` 経由の実 block body、stub の代わりに real Codec impl、gossip codec、persistent WAL)、自然な次コース。新規コードなし — victory lap と roadmap だけ。`,
                },
              ],
            },
          },
          {
            title: "Capstone",
            sortOrder: 7,
            lessons: {
              create: [
                {
                  title: "レッスン 15 — 作ったもの、まだ stub のもの、次に行く先",
                  slug: "openhl-capstone-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 60,
                  content: `# レッスン 15 — 作ったもの、まだ stub のもの、次に行く先

## 作ったシステム

14 レッスンで、空ディレクトリの \`cargo init\` から、real Reth EL を通じて real block を ~0.02 秒で decide する single-validator BFT chain まで来た。Workspace は今こう見える:

\`\`\`
~/code/my-openhl/
├── Cargo.toml                          ← reth-* 16 個、malachite 8 個、すべて SHA pin
├── bin/openhl/                         ← (stub バイナリ — production 配線は将来コース)
├── crates/
│   ├── types/                          L2:  CL↔EL 共通 contract 型
│   │   └── src/lib.rs                  BlockHash, PayloadId, PayloadAttrs,
│   │                                   ExecutedBlock, PayloadStatus
│   ├── evm/                            EL 側 (test double → live Reth)
│   │   ├── src/bridges/
│   │   │   ├── in_memory.rs            L4:  InMemoryEvmBridge (HashMap state)
│   │   │   └── reth.rs                 L5:  RethEvmBridge (alloy 型, real hash_slow)
│   │   ├── src/reth_node.rs            L11: bootstrap 証明 (test-only)
│   │   └── src/live_node.rs            L12-L14: LiveRethEvmBridge<P>
│   │                                   - L12: BlockNumReader 経由の parent lookup
│   │                                   - L13: EthBeaconConsensus validate
│   │                                   - L14: ConsensusEngineHandle forkchoice
│   └── consensus/                      CL 側 (フル BFT engine)
│       ├── src/bridge.rs               L3:  ConsensusBridge trait
│       ├── src/types/                  L6:  10 個の Malachite Context sub-type
│       ├── src/context.rs              L6:  Context<OpenHlContext> impl
│       ├── src/signing.rs              L7:  vote/proposal の canonical encoding
│       ├── src/signing_provider.rs     L7:  SigningProvider<OpenHlContext>
│       ├── src/codec.rs                L8:  OpenHlCodec (real 1 個 + stub 7 個 Codec impl)
│       ├── src/node.rs                 L9:  OpenHlNode + start_engine
│       └── src/engine_app.rs           L10: run_engine_app (AppMsg ルーティング)
\`\`\`

合計約 **40-50 ソースファイル**。Workspace テスト: 38 個合格。

## 4 つの \`ConsensusBridge\` メソッド — 全部 live

各行はコース後のメソッドの最終状態:

| メソッド | 最初の impl | Live impl | 今到達する real Reth コード |
| - | - | - | - |
| \`build_payload\` | L4 (in-memory) | L13 | \`HeaderProvider::sealed_header_by_hash\`, \`ChainSpec::next_block_base_fee\` (validator と同じヘルパー) |
| \`payload_ready\` | L4 (in-memory) | L13 | (Reth call なし — 設計上 bridge の pending map) |
| \`validate_payload\` | L4 (stub Valid) | L13 | \`EthBeaconConsensus::validate_header_against_parent\` (4 sub-check: number / timestamp / gas-limit / EIP-1559 base fee) |
| \`commit\` | L4 (HashMap insert) | L14 | \`ConsensusEngineHandle::fork_choice_updated\` via in-process Engine API |

Bridge は Reth のストレージ層 (\`HeaderProvider\`)、Reth の chain config (\`ChainSpec\`)、Reth の consensus validator (\`EthBeaconConsensus\`)、Reth の engine actor (\`ConsensusEngineHandle\`) と話す。これは CL クライアントが触る Reth の public surface のほとんど。

## まだ placeholder のもの

このコースは **動く single-validator chain** を ship した。まだないものを正直に call out する。以下の各項目は意図的な scope cut であって偶然ではない:

### 1. Engine \`newPayload\` 統合

**ステータス**: 欠落。

\`commit\` は \`ForkchoiceUpdated\` を送り、Reth の engine はマッチする block body がないため \`SYNCING\` で応答する。\`VALID\` に進めるには:

- \`build_payload\` の出力を real \`ExecutionPayload\` (トランザクションリスト付き、空でも) として encode する。
- \`fork_choice_updated\` 呼び出しの **前に** \`handle.new_payload(payload).await\` 経由で送る。
- レスポンスチェーンを合わせる: \`newPayload → VALID\` → \`forkchoice → VALID\` → canonical head が advance。

ブロッカーは、payload に入れる EVM-executable トランザクションをまだ持っていないこと。OpenHL の matching engine (CLOB) は **fills** を produce する、EVM トランザクションではない。Fills を EVM トランザクション (または precompile call) にラップするのが本コース後の次の大きな作業 — 多分 openhl build arc の Module 2 全部。

### 2. Real \`Codec\` impl

**ステータス**: real 1 個 (\`OpenHlProposalPart\` — 空バイト)、stub 7 個 (\`CodecStub\` error を返す)。

Single-validator モードでは、gossip メッセージ (\`SignedConsensusMsg\`, \`LivenessMsg\`, \`StreamMessage\`)、WAL writes (\`ProposedValue\`)、peer sync (\`Status\`, \`Request\`, \`Response\`) の codec は **決して fire しない**。2 番目の validator を追加した瞬間、すべての cross-validator メッセージがこれら stub のどれかに当たる。

拡張するには: wire format (protobuf, borsh, JSON) を選び、各型の encode/decode を書く。Malachite の \`code/crates/test/src/codec/\` が ~400 行の手書き protobuf で canonical reference。

### 3. Multi-validator gossip

**ステータス**: 一度も exercise していない。

\`OpenHlNode\` はすでに libp2p (\`/ip4/127.0.0.1/tcp/0\`) を configure する。Untested:
- 2 個の \`OpenHlNode\` instance が互いを discover する。
- ネットワーク partition 下での vote propagation。
- Vote-extension exchange。
- 遅れた validator の sync。

Codec stub (#2) が real になり N=2 node が共有 chain spec に対して立ち上がれば、multi-validator integration test が次の自然なステップ。

### 4. 永続 WAL

**ステータス**: エフェメラル tempdir。

すべてのテストが \`tempfile::tempdir()\` を使うので MDBX state は各 run 後に消える。Production には再起動を生き残る configurable \`home_dir\` が必要。追加は機械的 (path を \`OpenHlNode::new\` 経由で route するだけ)、だが **crash recovery** の検証 (commit 途中で node を kill、再起動、chain head が正しいことを assert) には real WAL codec impl と特に chaos-engineering 形の Test Plan が必要。

### 5. Slashing + double-sign detection

**ステータス**: なし。

Production BFT chain は validator の不正挙動 (同じ高さで異なる block 2 個を sign、同じ round で 2 回 vote) を track する。Malachite は \`LivenessMsg\` にこれ用のフックがある; OpenHL は配線していない。**Slashing なしの multi-validator chain は testnet には fine、value を扱うネットワークには危険。**

### 6. Custom Hyperliquid-shape 挙動

**ステータス**: vanilla Ethereum。

「openhl-shape」chain の要点は、Hyperliquid を generic EVM と区別する precompile と CLOB 駆動の payload assembly。Stage 8 (CLOB matching engine、fills-into-payload) と Stage 9 (custom precompile、\`clob_place_order\` write path) は \`psyto/openhl\` に住むが、ここではカバーしない。将来コースの自然な Module 2。

## Production-readiness チェックリスト

「テストが pass する」から「real value を任せていい」までの作業:

- [ ] 7 個の Codec stub すべてを real protobuf/borsh/JSON impl で置き換え。
- [ ] \`engine_newPayload\` 統合で engine が bridge の canonical chain view にマッチするように。
- [ ] N=2+ node 共有 chainspec に対する multi-validator integration test が合格。
- [ ] WAL crash-recovery test (commit 途中で kill、再起動、chain head 検証)。
- [ ] Production デプロイ用に永続 \`home_dir\` (tempdir ではない) を configure。
- [ ] Engine \`SYNCING\`/\`VALID\`/\`INVALID\` レスポンスを \`tracing::warn\` / structured field でログ、discard しない。
- [ ] Slashing/double-sign フックを配線・unit test。
- [ ] Key rotation 手順 (chain restart 時の Ed25519 key swap、runtime ではなく)。
- [ ] 運用テレメトリ: round duration、payload build latency、validate failure の Prometheus metric。
- [ ] パフォーマンスベースライン: 連続負荷下の blocks-per-second (smoke test だけではなく)。
- [ ] Canonical encoding format の独立セキュリティレビュー (L7 のバイトレイアウトは **wire spec の一部**)。
- [ ] 部分的ネットワーク partition 下の proposer manipulation の脅威モデル。

このコースのコードを production chain に fork するなら、このリストを long-pole 作業として扱うこと — ほとんどはコース自体より難しい。

## 14 レッスン前にはできなかった、今できること

- **real EL に対してフル Rust BFT engine を bootstrap する。** 「mocked EL で」ではなく、「Go への FFI で」でもない — 同じ Rust workspace で \`EthereumNode\` を実際に走らせる。
- **producer/validator の自己整合性について推論する。** 同じ artifact の builder と validator があるとき、source of truth を共有しなければならない。\`chain_spec.next_block_base_fee\` が \`build_payload\` と \`validate_payload\` の両方を駆動するパターンを見た。
- **incremental-stub パターンを適用する。** Trait bound が surface area を強制する; 一度に全部埋められないなら、明確な failure mode で stub する。L8 の \`CodecStub("SignedConsensusMsg<OpenHlContext>")\` がモデル。
- **2 つの汎用インフラを配線する。** Reth と Malachite は別チームが別の sensibility で書いた。Handshake interface (\`Node\` trait, \`ConsensusBridge\` trait) がそれらを composable にした。将来コースは他のインフラで同じパターンを使う。
- **プロトコルエラーと運用エラーを区別する。** \`BridgeError::Rejected\` vs \`BridgeError::Internal\`。\`PayloadStatus::Invalid\` vs 伝播。会話レベルが重要。
- **live read が起きたことを証明するテストを書く。** L12 の \`assert_eq!(block.number, 1)\` が load-bearing チェックだった — 他のものだと in-memory fallback がすり抜ける。

## 次に行く先

rethlab 内:
- **Reth Expert** (track \`reth-l1-architect\`, course 7+) — \`BlockExecutor\`、state-root verification、MDBX 内部の deep dive。\`validate_payload\` に実際にトランザクションを実行させたくなったら自然に次。
- **Reth Consensus Engineering** — slashing、vote extension、fault tolerance を深くカバー。Multi-validator gossip が動いた後に行く場所。

rethlab 外:
- **\`psyto/openhl\` Stages 8-9** — CLOB と custom precompile。Source code は public repo に; walkthrough コースはまだなし。
- **Malachite spec docs** (\`informalsystems/malachite\`) — \`core-types\` crate の doc を読み通す。半分は既に馴染みがある; もう半分が multi-validator に必要なもの。
- **Real Reth full node** — \`paradigmxyz/reth\` を clone、\`cargo run --bin reth -- node --chain dev\` を走らせる。L11 の \`EthereumNode::default()\` は同じもの、consensus 層を引いたもの。Surface を比較する。

## クロージングノート

Consensus と EVM crate を合わせて約 1,400 行の Rust、加えて ~250 行の integration test を書いた。そのコードは **動く single-validator Hyperliquid-shape L1**。Production-ready ではない; である必要もない。**手にあるのは、scope について正直で、すべての load-bearing 決定が visible で、次の capability への extensible interface が 1 つ離れた基盤。**

L1 の最も難しい部分は engine を書くことではない — Malachite がほとんどやってくれ、我々は配線しただけ。最も難しい部分は、自分のコードが何ができ何ができないかについて正直であること、そして「できる」側を証明するテストを書くこと。本コースのすべてのレッスンが happy-path assertion と negative-path assertion を持っていた。「テストが pass する」から「システムが動く」への鍛錬がそれ。

これを使って何か作りに行こう。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
