// AUTO-GENERATED from drafts/openhl_*_ja.md by .github/scripts/build-openhl-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlConsensusJA(prisma: PrismaClient) {
  const tags = ["reth","malachite","bft","evm","clob","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "reth-openhl-consensus-ja",
      title: "Step 1. Consensus：`cargo init` から始める single-validator devnet 構築",
      description:
        "Hyperliquid シェイプの レッスン 1 コンセンサス層をスクラッチで構築する。プロダクションクオリティの Reth (EVM) と Malachite (BFT) を単一の Rust workspace へ統合し、end-to-end でのブロック生成機構を実装。リファレンス実装（psyto/openhl）をベースに手を動かしながら学ぶ、「DIY Perp シリーズ」の記念すべきファーストステップである。",
      difficulty: "EXPERT",
      duration: 660,
      xpReward: 1270,
      track: "diy-perp",
      tags,
      isPublished: true,
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

## 30秒要約

- 対象: Hyperliquid系アーキテクチャを Rust で実装したい人。
- 得られるもの: Reth + Malachite を接続した最小のコンセンサス基盤。
- このあと: CLOB / Precompiles / Funding へ安全に進める土台ができる。

## 完了条件

- \`cargo test first_block_via_engine_actors\` を通せる。
- Consensus Layer（CL: 合意形成層）と Execution Layer（EL: 実行層）の接続点（bridge contract）を説明できる。

これは「読む」コースではない。自分で組み上げる「**作る**」コースだ。

最初に、やることを短く整理する。

- 空ディレクトリから \`cargo init\` で開始する。
- 実際の Reth と Malachite を接続し、1 ブロックを end-to-end で動かす workspace まで到達する。
- コードは自分で 1 行ずつ実装する。
- 最終構造は \`psyto/openhl\` の対応 Stage とほぼ一致する。

\`psyto/openhl\` は、実装途中の答え合わせに使うリファレンスである。

背景は 2 点だけ押さえればよい。

- Hyperliquid は 2025 年に $300B 超の perp 取引量を、クローズドソースのスタック（HyperBFT / HyperCore / HyperEVM）で処理した。
- OpenHL はその設計をオープンソースで再構成する試みであり、本コースでは最初の実装ステップとしてコンセンサス基盤を自分で構築する。

**なぜ CLOB なのか。** Hyperliquid の対象市場では、price-time-priority の板で価格発見が成立するだけの継続フローがある。RFQ は long tail を取りやすく、AMM は cold-start に強いが、それぞれ別のトレードオフを持つ。本コースで作るのは、CLOB が機能する市場セグメント向けの engine である。詳細な比較は、後続の CLOB コースで扱う。

## 1. コース終了時点で手元にあるもの

**先に 30 秒 BFT primer。** BFT consensus は *round* の繰り返しで動き、各 round は 3 phase からなる: **propose**（選ばれた validator が 1 人、ブロック提案を broadcast する）、**prevote**（全 validator が yes/no/nil の投票を broadcast する）、**precommit**（validator が投票を lock する）。≥ 2/3 の validator が precommit した時点でそのブロックは **decided**（= 最終確定）となる。各 round の **proposer** は validator set から決定論的に選ばれ、quorum が取れず round が失敗すると、別の proposer で次の round に進む。Malachite はこの state machine を駆動する Rust BFT engine で、本コースでの自分の仕事は、自分のアプリケーション（header 構築、EVM 実行）を \`Context\` trait 経由で Malachite に配線することだ。**propose / prevote / precommit / decided / proposer** — この 5 つを頭に入れておけば、以降のレッスンの語彙がクリーンに着地する。

レッスン 15 を終える頃には、自分のマシンで \`cargo test first_block_via_engine_actors\` を走らせると、single-validator BFT consensus のラウンドが約 0.02 秒で pass する状態になる。EVM 層は実際の Reth、BFT 層は実際の Malachite。chain は **Consensus Layer (CL)** と **Execution Layer (EL)** の 2 層に分かれていて、本コースで両側を接続していく。コードのパスは次のようになる:

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

このパスの各行はすべて自分で書いたコードだ。マジックは一切なく、全部公開されている。コースを終える頃には次のことができるようになる:

- \`psyto/openhl\` の本コース対応範囲（コンセンサス基盤）の任意のコードを読み、なぜそこにそのコードがあるのかを説明する
- Bridge contract の任意の部分を変更してテストを走らせ、何が壊れるかを観察する
- 基盤実装 を fork して自分の Hyperliquid 型 chain を始める — \`psyto/openhl\` は依存先ではなく、自分の側のリファレンス実装になる

## 2. コース終了時点で手元に **ない** もの

本コースが扱うのは **OpenHL 実装のステップ 1（コンセンサス基盤）** のみである。以下は扱わない:

- ステップ 2: CLOB matching engine
- ステップ 3: CLOB state を読むカスタム EVM precompile
- ステップ 4: funding、oracle、liquidation
- ステップ 5: protocol-native vault primitive

これらは本コースの後続コースとして、それぞれ独立に提供する。本コースを終えた時点で手に入るのは **コンセンサス基盤**（BFT と EVM の接続、actor 配線、live Reth 連携）である。**動く perp DEX はまだ完成しない。** Perp DEX はステップ 2〜5 を積み上げて初めて成立する。

これはスコープを正直に区切るためである。「Hyperliquid を自作する」を 16 レッスンですべて約束するのは現実的ではない。

## 3. 本コースの進め方

すべてのレッスンが同じ形をしている:

1. **ゴール。** 「本レッスン終了時、\`cargo test <name>\` が pass する」。そのテストは今は pass しない。pass させるのが本レッスンの仕事。
2. **おさらい。** workspace の現状。前のレッスンで build した部分。今の時点で通っているテスト一覧。
3. **計画。** 何を足すか。openhl メンテナがオリジナルで実装したときに下した設計判断。
4. **手を動かす walk-through。** ステップごとのコード。書いて、保存して、各ステップ後に \`cargo check\` を走らせる。
5. **テスト。** \`cargo test <name>\` を走らせる。pass するはず。pass しない場合の典型的なミス。
6. **設計を振り返る。** このレッスンで encode した load-bearing な判断のうち、後で参照する重要なもの 1-2 個。
7. **答え合わせ。** \`psyto/openhl\` の対応 SHA — そこに同じコードが live で置かれている。自分のコードと diff で照合できる。
8. **次のレッスン。** 次に何を足すか、なぜ今それなのか、を 1-2 文で。

レッスンが **指示書**、書くコードが **成果物**、\`psyto/openhl\` の対応 SHA が **答え合わせ** という構造だ。

## 4. 前提知識

必要なもの:

- **Rust 1.95+。** \`rustup default 1.95.0\` 以降。
- **Git。** \`psyto/openhl\` を 1 回 clone する (答え合わせ用)。
- **Cargo workspace、async/await、trait impl の基本的な扱い。** \`#[async_trait]\` や \`impl Trait for Foo { ... }\` がまだ馴染みのない語彙なら、本コースは速すぎる。先に rethlab Fundamentals または Advanced を受講してほしい。
- **Rust 対応のエディタ。** VS Code + rust-analyzer で十分。Vim/Helix/Emacs でも問題ない。
- **約 4 GB の空きディスク容量。** Reth のコンパイルグラフは大きい。

必要 **ない** もの:

- consensus protocol の事前知識 (BFT は進めながら説明する)
- Reth の詳細な事前知識（本コース内で利用しながら学ぶ）
- Malachite の詳細な事前知識（本コース内で利用しながら学ぶ）
- マルチマシン環境 (すべて 1 プロセスで自分のラップトップで完結する)

## 5. セットアップ (いま実行する)

マシン上に **2 つ** のディレクトリを置く:

- \`~/code/my-openhl/\` — 自分の workspace。ここにコードを書く。**自分のもの**。
- \`~/code/openhl-reference/\` — \`psyto/openhl\` の clone。比較したいときに読む場所。**read-only** として扱う。

\`\`\`bash
# 自分の workspace
mkdir -p ~/code/my-openhl && cd ~/code/my-openhl
cargo init --lib
# (パッケージ名はディレクトリ名から \`my-openhl\` になる。レッスン 1 で workspace に作り変えて
#  内部の crate を \`openhl-types\` / \`openhl-consensus\` / … として並べていくので、
#  root パッケージ名はその時点で消える。lib.rs も レッスン 1 で外す — ここで作るのは workspace
#  stub を取りに行くためだけの初期 commit)

# 自分の workspace でもリファレンスと同じ Rust toolchain を強制しておく
echo -e '[toolchain]\\nchannel = "1.95.0"' > rust-toolchain.toml

# 答え合わせ用リファレンス
mkdir -p ~/code && cd ~/code
git clone https://github.com/psyto/openhl.git openhl-reference
cd openhl-reference
cargo check  # 初回は時間がかかる — Reth は大きい
\`\`\`

\`openhl-reference\` 側で \`cargo check\` が pass すれば toolchain は正しい。次に進んでよい。pass しない場合はまず toolchain version を直す — リファレンスの \`rust-toolchain.toml\` が Rust 1.95.0 を pin しており、\`my-openhl/\` 側でも同じ pin を置いたので、\`rustup\` が必要な toolchain を自動 install してくれるはずだ。

> 🛑 **やりがちな勘違い。** 「\`openhl-reference\` を直接編集すればよい。」  
> **違う。** \`openhl-reference\` は答え合わせ専用で、編集対象ではない。  
> 編集は必ず \`my-openhl/\` 側で行う。境界を曖昧にすると、どこまでが自分の実装か追えなくなる。

## 6. 16 レッスンの地図

各行が 1 レッスン。各レッスンは pass する \`cargo test\` で終わる。

| # | レッスン | 何を build する | レッスン終了時のテスト |
| - | - | - | - |
| **レッスン 0** | Orientation | (本レッスン) | setup 確認 |
| **レッスン 1** | Foundations | workspace + Reth と Malachite を pinned で揃える | \`cargo check --workspace\` clean |
| **レッスン 2** | Contract types | \`openhl-types\` の primitives (BlockHash、PayloadId、…) | \`cargo test -p openhl-types\` |
| **レッスン 3** | Contract trait | \`ConsensusBridge\` trait — 4 メッセージを async fn として | \`cargo check -p openhl-consensus\` |
| **レッスン 4** | EL test double | \`InMemoryEvmBridge\` — テスト用の偽 EVM | InMemoryEvmBridge tests pass |
| **レッスン 5** | Reth-typed bridge | \`RethEvmBridge\` — 同じ contract、Reth 型を使う | RethEvmBridge tests pass |
| **レッスン 6** | CL types | \`OpenHlContext\` + Context の 10 sub-types | context compiles |
| **レッスン 7** | Signing | \`OpenHlSigningProvider\` — Ed25519 sign/verify | sign/verify round-trip |
| **レッスン 8** | Codec | \`OpenHlCodec\` — engine が要求する codec スロット | codec round-trip |
| **レッスン 9** | Node | \`OpenHlNode\` と最初の \`start_engine\` 呼び出し | engine start/stop smoke |
| **レッスン 10** | App loop | \`run_engine_app\` — 全部を繋ぐ actor pipeline | **\`first_block_via_engine_actors\`** — 本コース前半の最大マイルストーン、BFT round が閉じる |
| **レッスン 11** | Live Reth | テストで実 Reth dev-node を起動する | \`reth_dev_node_bootstraps\` |
| **レッスン 12** | Live bridge — build path | \`LiveRethEvmBridge\` (build_payload 側) が live provider から parent を読む | \`live_bridge_builds_on_real_genesis\` |
| **レッスン 13** | Live bridge — validate path | \`LiveRethEvmBridge\` (validate_payload 側) に \`EthBeaconConsensus\` を接続して実 header validation | validate-path tests |
| **レッスン 14** | Live bridge — commit path | \`LiveRethEvmBridge\` (commit 側) を Reth の in-process Engine API に \`forkchoice_updated\` で接続 | \`commit_sends_forkchoice_to_engine\` |
| **レッスン 15** | Capstone | 作ったものの総復習、未実装スコープ、次の実装ステップを整理する | (コード追加なし) |

**レッスン 10 がコース最大の milestone だ。** レッスン 10 を終えた時点で、actor system 経由で BFT consensus が end-to-end でブロックを 1 つ生成するようになる。レッスン 11〜14 で stub Reth を実際の Reth に差し替え、最終的に commit を Engine API へ接続する。レッスン 15 は capstone として全体を統合し、次の実装ステップを明確化する。

## 7. 答え合わせの作法

各レッスンは \`psyto/openhl\` の特定の commit SHA を基準にしている — 同じコードがその commit で最初に登場した時点だ。レッスンを終えてテストが pass したら、その revision と自分のコードを \`git diff\` で見比べて答え合わせをする:

\`\`\`bash
cd ~/code/openhl-reference
git checkout <レッスンが引用する SHA>
# 比較する。~/code/my-openhl/ のコードとほぼ同等なはず。
diff -ru ~/code/my-openhl/crates/types ./crates/types
\`\`\`

自分のコードは細かい点 (空白、変数名、コメントの言い回し) で違って当然だ。重要なのは型、シグネチャ、制御フローが等価であること。そこが大きく食い違うなら、レッスン内容がまだ定着していない。設計を振り返るセクションを読み直して調整する。

> 🛑 **やりがちな勘違い。** 「答えを直接写せば早い。」  
> **違う。** コピーは速いが、設計判断が身につかない。  
> レッスンどおりに自分で実装し、最後に diff で一致を確認する。一致は目的ではなく、理解の結果である。

## 8. セットアップ確認 — 本レッスンの実際の演習

次のレッスン（レッスン 1）に進む前に、以下を全部走らせて pass することを確認する:

\`\`\`bash
# 1. Rust version
rustc --version    # 期待値: rustc 1.95.x または以降

# 2. 自分の workspace が存在する
ls ~/code/my-openhl    # 期待値: Cargo.toml、src/

# 3. リファレンスが存在してコンパイルが通る
cd ~/code/openhl-reference && cargo check    # 期待値: 最終的に "Finished"
\`\`\`

3 つすべて pass すればセットアップ完了。次のレッスン（レッスン 1）へ進む。

> 💡 **次へ進む前のセルフチェック**
>
> 1 文で、\`~/code/my-openhl\` と \`~/code/openhl-reference\` の役割の違いを説明できるか？
>
> 自分の言葉で「**片方は自分が 1 行ずつ書く本番の workspace、もう片方は迷ったときだけ覗く答え合わせの鏡だ**」と言えなければ、上の「5. セットアップ」を読み直してから次のレッスンへ進むこと。この区別を曖昧にしたまま走り出すと、レッスン後半で \`openhl-reference\` 側にうっかりコードを書いてしまい、自分が書いたコードと借りてきたコードの境界が消える事故が起きる。**境界を体に染み込ませてから進む。**`,
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

このレッスンで掴む概念:

- **依存グラフ先行のワークフロー。** アプリケーションコードを書き始める *前* に Reth と Malachite を共存させておく。transitive な衝突がコース途中で噴き出して巻き戻すリスクを、最初に潰しておくため。
- **workspace レベルでの依存宣言。** 外部依存を root の \`Cargo.toml\` に一度だけ書き、各 crate 側は \`{ workspace = true }\` で継承する。Reth のバージョン bump が 11 crate スイープではなく 1 行修正で済む。
- **Git SHA pin と crates.io の違い。** 本番L1チェーンでは、Reth と Malachite を「semver 範囲指定（例: \`^0.5\`）」ではなく commit SHA で固定する。バリデータ同士でバイト単位の一致が必要なため、利便性より再現性を優先する。
- **10 crate + 1 bin のレイアウト。** OpenHL の 5 つのサブシステム (types、codec、clob、consensus、evm、…) が flat な \`crates/\` と単一の \`bin/openhl\` にどう対応するか。

検証:

\`\`\`bash
cargo check --workspace
\`\`\`

\`~/code/my-openhl/\` ディレクトリで上記の実行結果が "unused dependency" 警告以外は warning なしで \`Finished\` と表示される。**アプリケーションロジックは 1 行も書かない** — それは レッスン 2 以降だ。

Reth のコンパイルグラフだけで ~600 crates ある。最初の \`cargo check\` はマシンによって 5-15 分かかる。そのつもりで進める。以降の check は incremental が効いて速くなる。

具体的な変更:

- 空のライブラリ crate を 10 個、binary crate を 1 個、\`crates/\` と \`bin/openhl/\` 配下に scaffold する。
- root \`Cargo.toml\` に \`members\`、workspace defaults、\`[workspace.dependencies]\` を宣言する。
- Reth を workspace レベルで SHA pin の git 依存として宣言する。
- Malachite を同じやり方で pin する。

## おさらい

レッスン 0 のセットアップを済ませている前提だ。手元には:

- \`~/code/my-openhl/\` — 自分の workspace、現状は \`cargo init --lib\` の default 出力
- \`~/code/openhl-reference/\` — \`psyto/openhl\` を clone 済み、\`cargo check\` が通っている

本レッスンの編集は **すべて** \`~/code/my-openhl/\` 内で行う。\`openhl-reference/\` には絶対に触れない。

## 計画

Rust workspace で最も摩擦が多いのは依存解決だ。Reth も Malachite も巨大で、transitive な依存ツリーが深く、クリーンに同居させるのは非自明だ。**「あとでやる」と決めると、アプリケーションコードを書いている最中に衝突に気付いて巻き戻すことになる。** 先に依存を確定させておけば、その後のレッスンはレッスン本来の主題に集中できる。*それが、以下の stage 順序がアプリケーションコードより前に依存セットアップを front-load している理由だ。*

> 🛑 **考えてみよう。** スクロールする前に、workspace の Cargo.toml に書く \`members\` が何個で、それぞれ何かを手元で書き出す。ヒントはライブラリ crate 10 個 + binary crate 1 個。必要なら、このレッスン内の「3. 本コースの進め方」「4. 前提知識」を見返す。

そのため、3 つの段階をこの順で進める:

1. **Stage 1** — \`cargo init --lib\` の default 出力を消し、real workspace に置き換える: 空のライブラリ crate を 10 個、binary crate を 1 個、workspace 全体のデフォルトを定義する top-level \`Cargo.toml\`。**テスト**: 外部依存なしで \`cargo check --workspace\` が通る。
2. **Stage 2** — Reth を workspace レベルで SHA pin の git 依存として宣言する。**テスト**: \`cargo check --workspace\` が引き続き通る (まだどの crate も Reth を使っていない — 依存が解決可能なことを確認するだけ)。
3. **Stage 3** — Malachite を同じやり方で pin する。**テスト**: \`cargo check --workspace\` が引き続き通る。

各 stage は \`psyto/openhl\` の実際の commit に対応する: \`75be9de\`、続いて \`5fc7ca1\`。

## 手を動かす walk-through

### Step 1: \`~/code/my-openhl/\` をリセット

レッスン 0 のセットアップで default の cargo プロジェクトが残っている。これを消して、まっさらの状態から始める:

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

ルートに \`Cargo.toml\` を作り、次の内容を入れる。コピーではなく、各セクションに注目しながら自分でタイプする。

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

1. **\`resolver = "3"\`**。Cargo の dep resolver のバージョン。Resolver 3 (Rust 2024 edition のデフォルト) は feature unification をより厳格に扱う。Reth も Malachite も複雑な feature flag を持っており、resolver 3 が微妙な衝突を避けてくれる。
2. **workspace レベルでの \`unsafe_code = "forbid"\`**。これで member crate すべてで \`unsafe\` が禁止される。Reth は内部で \`unsafe\` を使っているが、こちらのアプリケーション層では使わない。アプリケーション層で禁止することが、このコースの deterministic 設計ルールである。pure state-machine crate が \`unsafe\` を欲しがった瞬間、それは code review の警告サインになる。
3. **\`pedantic = "warn"\` (clippy)**。Pedantic な clippy lint は subtle な問題を多数捕まえる。ノイズになるルールもあるので、\`module_name_repetitions\` などを末尾で \`allow\` している。最初から pedantic を warn にしておけば、すべての commit が clippy clean で land する。

### Step 3: \`rust-toolchain.toml\` をルートに追加

\`rust-toolchain.toml\` を作る:

\`\`\`toml
[toolchain]
channel    = "1.95.0"
components = ["clippy", "rustfmt"]
profile    = "minimal"
\`\`\`

Rust のバージョンを pin する。読者 (および CI) が \`cargo\` を呼ぶと、自動的にこの toolchain が fetch されて使われる。これがないとマシンごとに違う rustc バージョンでビルドされ、別々のアーティファクトを生んでしまう — 避けたい determinism risk だ。

### Step 4: 最初のライブラリ crate (\`crates/types\`) をテンプレートとして作る

まず 1 つの crate を end-to-end で作り、そのパターンを残りの 9 つに展開する。

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

これだけだ。module doc comment 以外、crate は空。中身は後続レッスンで埋めていく。

**なぜ \`version = { workspace = true }\` などを使うのか?** これでルート Cargo.toml の \`[workspace.package]\` から継承される。すべての member crate が同じメタデータ (version、edition、license) を持つ。\`workspace = true\` 経由で継承すれば、workspace を 1 行 bump するだけで全 crate に波及する。代わりに crate ごとに \`version = "0.1.0"\` を書くと、6 行 × 11 crate で重複が増え、drift しやすくなる。

### Step 5: 残りの 9 個のライブラリ crate を作る

パターンは \`crates/types\` と同じ。各 crate について次を作る:

- \`crates/<name>/Cargo.toml\` (形は同じ、\`name\` フィールドだけ変える)
- \`crates/<name>/src/lib.rs\` (doc comment のみ)

例えば \`codec\` であれば、まずディレクトリを作り:

\`\`\`bash
mkdir -p crates/codec/src
\`\`\`

そのあと \`crates/codec/Cargo.toml\` と \`crates/codec/src/lib.rs\` を、下の表の \`name\` と doc comment に差し替えて配置する。残りの 8 crate も同じ手順 (\`mkdir -p crates/<name>/src\` → 2 ファイル配置) を繰り返すだけだ。

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

\`clob\`、\`oracle\`、\`funding\`、\`liquidation\`、\`vault\`、\`node\` については \`[dependencies]\` セクションは空でよい (\`[dependencies]\` 行のあとに空行、続いて \`[lints]\` ブロック)。\`codec\`、\`evm\`、\`consensus\` も最初は空 — 実際の依存は、それを使うコードが定着する後続レッスンで足す。

> 🛑 **やりがちな勘違い。** 「最初に全部の依存を書いておけば後で編集しなくて済むのでは?」 **違う。** Unused dependency を持つ crate は技術的負債だ: ビルドを遅くし、reader を混乱させ、version conflict を招く。依存は **それを使うコードが定着するタイミングで** 足す。workspace の \`Cargo.toml\` で *使える* 依存を宣言し、各 crate の \`Cargo.toml\` で *実際に使う* 依存を宣言する、という階層構造になっている。

### Step 6: \`bin/openhl\` を作る

Binary crate。まだ何もしない — workspace がコンパイル可能であることを確かめるだけ。

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

\`[[bin]]\` セクションで binary 名を \`openhl\`、エントリポイントを \`src/main.rs\` と宣言する。\`env!("CARGO_PKG_VERSION")\` マクロは Cargo.toml の version をコンパイル時に inline する — 後で \`openhl --version\` を実装するときに役立つ。

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

いくつかの「依存として宣言したがコード内で使っていない」系の警告 (\`unused_crate_dependencies\` 相当) が出るが、これは完全に正常だ — \`serde\` を workspace 依存として宣言済みなのに、ほとんどの crate の \`src/lib.rs\` がまだ doc comment しかないため、実際の \`use serde::...\` が現れていない。後続レッスンで実コードが定着した瞬間に消える。Hard error は許容できない — 出た場合に多い原因:

- **\`workspace.members\` または crate Cargo.toml の crate 名にタイプミス。** Cargo が見つからない crate 名を教えてくれるので、タイプミスを直す。
- **library crate に \`src/lib.rs\` が無い。** \`workspace.members\` にリストされた crate はそれぞれ \`src/lib.rs\` か \`src/main.rs\` のどちらかが必要。
- **\`[lints]\` ブロックはあるが中に \`workspace = true\` が無い。** 各 crate の \`[lints]\` は \`workspace = true\` と書かないと継承されない。

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

**なぜこんなに多くの Reth crate を?** Reth は multi-crate codebase だ。Node builder、EVM、storage API、consensus hook など、それぞれが別 crate に住んでいる。後続レッスンで使う予定のものを workspace レベルで宣言しておけば、各消費側 crate は \`reth-xxx = { workspace = true }\` と書くだけで済む。

**なぜ SHA で pin するのか?** Reth は breaking change が頻繁にある。release tag の SHA (ここでは \`88505c7f...\` = v2.2.0) に pin すれば安定したターゲットになる。\`version = "2.2"\` や branch に pin すると、Reth が無関係な変更をリリースしたときにビルドが壊れる可能性がある。

**なぜ main HEAD ではなく release-tag SHA に pin するのか?** Main HEAD はいつでも壊れる可能性がある。Release tag はテストされた安定版だ。ファイル中のコメント (\`# Bump は専用 PR で行う。release-tag SHA を必ず pin、main HEAD には絶対 pin しない。\`) は将来 bump するときの process discipline メモになる。

> 🛑 **考えてみよう。** いまの状態で \`cargo check --workspace\` を実行すると何が起こるか? スクロール前に 1 つ選べ:
> - (a) 何も変わらない — まだどの crate も Reth の依存を使っていないから
> - (b) 初回は劇的に遅くなる — Reth の transitive な ~600 crate を fetch + compile する
> - (c) エラー — Reth は明示的な configuration が必要で、まだ与えていない

答えは (b) だ。Cargo の \`workspace.dependencies\` 宣言は **resolution** を起こすが、未使用 deps の **compilation** は起こさない。しかし \`cargo check\` は依存グラフを順に辿って git source を fetch する。それが 5-15 分の初回コストだ。良いニュース: 以降は cache が効く。

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

エラーが出た場合、よくある原因:

- **alloy のバージョン衝突。** 上の workspace.deps ブロックをコピーする前に古い \`alloy-primitives = "0.x"\` を別途宣言していると、Cargo が unify できない。解決: 全 alloy バージョンを上記の \`1.5\` / \`2.0\` に揃える。
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

**Crate 名の特殊事情。** Malachite のリポ (\`informalsystems/malachite\`) は crate を \`informalsystems-malachitebft-*\` という prefix 付きで publish している。Cargo.toml では full prefix の名前を使う。Rust ソースコードでは snake_case に rename された形 (\`informalsystems_malachitebft_core_types::Context\`) で参照する。ファイル中のコメントがこれを document している。

**core-driver の \`features = ["std"]\`。** Driver crate には \`std\` という feature gate がある。標準ライブラリの facility (BTreeMap、HashMap など) が必要なので、明示的に有効化する。他の Malachite crate はデフォルトで \`std\` 込みなので、feature 指定は不要。

再度 cargo check を実行する:

\`\`\`bash
cargo check --workspace
\`\`\`

今回は Reth の incremental cache が効いて、Malachite だけが fetch/compile される。だいたい 2-5 分。

## テスト

Step 9 が成功した後に:

\`\`\`bash
cargo check --workspace
\`\`\`

期待値 (Step 7-9 のキャッシュが効いているので、2 回目以降は 1-2 秒で終わる):

\`\`\`
    Finished \`dev\` profile [optimized + debuginfo] target(s) in 0.23s
\`\`\`

> ⚠️ \`| tail -5\` で出力をカットしないこと。万が一エラーが出た場合、肝心の error 本体はコンパイルパイプラインの**上部**に流れているので、\`tail\` で削るとデバッグ可能な手がかりが消える。warning が多くて煩いと感じても、フルログを残したまま見るのが安全だ。

binary も試せる:

\`\`\`bash
cargo build --bin openhl
./target/debug/openhl
\`\`\`

期待値:

\`\`\`
openhl v0.1.0
\`\`\`

レッスン 1 完了。

## 設計を振り返る

このレッスンで encode した本質的な決定が 2 つ:

1. **すべての外部依存は crate ごとではなく workspace レベルで宣言する。** 各 crate の Cargo.toml は \`reth-storage-api = { workspace = true }\` と書き、バージョンは workspace から継承する。これで Reth のバージョン bump は workspace を 1 行変えるだけで済む。代わりに各 crate が独自にバージョンを宣言する形にすると、11 crate の Cargo.toml がすべて drift するリスクが出る。

2. **Reth と Malachite は git 依存、crates.io 依存ではない。** 両プロジェクトとも crates.io に publish しているが、バージョニングの cadence が大きく違う。Workspace で specific な commit SHA に pin するのは意図的な trade-off だ: bump の摩擦は大きいが、再現性が絶対になる。本番L1チェーンではこのやり方を取る — 2 つの validator が偶然違う "0.5.x" patch を fetch して desync する事態を絶対に避けたいからだ。

この 2 つの決定は後続レッスンすべてに伝播する。レッスン 11 で crate の \`[dependencies]\` に \`reth-storage-api = { workspace = true }\` を追加するとき、Cargo は workspace レベルの pin を見つけて正しく解決する — そこを意識しなくてよい状態になっている。

## 答え合わせ

自分の workspace を \`psyto/openhl\` の Stage 2+3 時点と比較する:

\`\`\`bash
cd ~/code/openhl-reference
git checkout 5fc7ca1
diff -ru ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -ru ~/code/my-openhl/crates/types ./crates/types
diff -ru ~/code/my-openhl/bin/openhl ./bin/openhl
\`\`\`

\`authors\`、\`repository\`、コメントの文言は違っていて OK。\`members\`、\`workspace.dependencies\` の pin SHA、\`[workspace.lints]\`、profile が違うのは NG — 該当する Step を読み返す。

確認が終わったら main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: 自分の作業を git に commit すべき?** Yes。\`~/code/my-openhl/\` で git を init し、各 step または各レッスンごとに commit する。Commit log が自分用の Stage 履歴として残る。

\`\`\`bash
cd ~/code/my-openhl
git init  # まだしていなければ
git add .
git commit -m "レッスン 1 — workspace + Reth + Malachite を pin"
\`\`\`

**Q: "unused dependency" の warning が多いのはなぜ?** 各 member crate の \`[dependencies]\` セクションがほぼ空だから。Workspace レベルで依存を *利用可能* な状態にしたが、どの crate もまだ \`[dependencies]\` を埋めていない。レッスンが進み、各 crate が必要な依存を pull してくれば warning は減っていく。

**Q: ディスクが足りなくなった。** Reth と Malachite の source tree + target/ cache で 10-15 GB に達することもある。ディスクを足すか、\`.cargo/config.toml\` で \`[build] target-dir = ...\` を別ドライブに向ける。

**Q: 依存の fetch を並列化できる?** Cargo は自動的に並列化する。"Updating git repository" のステップは git cache に書き込むので順次実行だが、"Compiling" のステップはコアをまたいで並列化される。遅いと感じたら \`cargo build -j $(nproc)\` を確認する。

## 次のレッスン (レッスン 2)

Workspace がコンパイルされる状態になった。アプリケーションロジックはまだない。レッスン 2 では最初のアプリケーションコードを書く — \`openhl-types\` の \`BlockHash\`、\`PayloadId\`、\`PayloadAttrs\`、\`ExecutedBlock\`、\`PayloadStatus\`。これらは consensus↔EVM contract の **共通語彙** だ。レッスン 2 を終えると contract type がコンパイルされ、基本的なテストが pass する状態になる。続く レッスン 3 では、その type を使う trait を書く。`,
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

このレッスンで掴む概念:

- **共通語彙 crate (shared vocabulary crate)。** \`BlockHash\`、\`PayloadId\` などが \`openhl-consensus\` でも \`openhl-evm\` でもなく \`openhl-types\` に住む理由。Rust は依存ループを許さないので、CL↔EL split は両側が import する中立な第三 crate を強制する。
- **Newtype パターン。** type alias ではなく \`BlockHash([u8; 32])\` で wrap する意味。compiler が「ただの 32 byte 配列」を \`BlockHash\` の場所に代入することを拒否してくれる。
- **三状態の payload status（\`Valid\` / \`Invalid\` / \`Syncing\`）。** \`PayloadStatus\` が \`bool\` ではなく三値である理由。\`Syncing\` を \`Invalid\` として扱うと、本来追いつけたはずの peer から永続的に fork する。
- **デフォルト \`Debug\` ではなく custom \`Display\` を使う理由。** ログに出る contract 型には \`0xab12…\` 形式の人間可読な表示が要る。ログはデバッガの主戦場であり、可読性は optional ではない。

検証:

\`\`\`bash
cargo test -p openhl-types
\`\`\`

上記の実行結果が 5 つの contract primitive をカバーする 4 つのテストで pass する。アプリケーションロジックはまだない。レッスン 3 で contract trait が参照するデータ定義を、ここで整えておく。

具体的な変更:

- \`crates/types/src/lib.rs\` に 5 つの type を追加 — \`BlockHash\`、\`PayloadId\`、\`PayloadAttrs\`、\`PayloadStatus\`、\`ExecutedBlock\` — および \`BlockHash\` への \`Display\` impl。
- 4 つの unit test を追加: hex display、status equality、executed-block clone、serde round-trip。
- \`openhl-types\` crate が consensus と EVM の両方が依存する **共通語彙** になる。

## おさらい

レッスン 1 が終わって、workspace は次の状態にある:

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

加えて \`BlockHash\` に \`Display\` impl を 1 つ (ログに \`BlockHash([171, 18, ...])\` ではなく \`0xab12...\` が出るように)。

さらに unit test を 4 つ: BlockHash の hex display、PayloadStatus の equality、ExecutedBlock の cloneability、BlockHash の serde round-trip。

この 5 つの type が CL↔EL contract の **共通語彙** だ。consensus crate と evm crate の両方がこれらを import する。3 番目の crate \`openhl-types\` に置く理由 — \`openhl-consensus\` でも \`openhl-evm\` でもないところに置く理由 — は §設計を振り返る で説明する。

> 🛑 **考えてみよう。** 上の表の 5 type を見る。**なぜ \`PayloadStatus\` は \`bool\` ではなく 3 variant の enum なのか?** ヒント: EL が各回答を返したとき、consensus node は何をすべきかを考える。取りうる action は 2 つではなく 3 つある。

## 手を動かす walk-through

### Step 1: \`crates/types/src/lib.rs\` を開く

現在の内容 (レッスン 1 から):

\`\`\`rust
//! Shared primitives and CL/EL contract types.
\`\`\`

このコメントの下に type 定義を足していく。

### Step 2: \`Cargo.toml\` に \`serde\` があることを確認

レッスン 1 で \`crates/types/Cargo.toml\` を次のように設定済みのはず:

\`\`\`toml
[dependencies]
serde = { workspace = true }
\`\`\`

これでよい。\`#[derive(Serialize, Deserialize)]\` 行で使う。編集不要。

### Step 3: import を足す

\`crates/types/src/lib.rs\` を編集する。doc comment の後に:

\`\`\`rust
//! Shared primitives and CL/EL contract types.

use std::fmt;

use serde::{Deserialize, Serialize};
\`\`\`

\`std::fmt\` は \`BlockHash\` の \`Display\` impl で使う。\`serde::{Deserialize, Serialize}\` は全 type の derive 用 — どの contract type も最終的に wire format で round-trip する必要があるからだ。

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

**Newtype パターン。** \`BlockHash\` は \`[u8; 32]\` のラッパーで、type alias ではない。これが重要だ: ラッパーなら compiler が \`let h: BlockHash = [0u8; 32];\` を reject する (明示的にラップする必要がある)。Type alias (\`type BlockHash = [u8; 32];\`) ならどちらも通り、\`BlockHash\` が期待される場所に無関係な \`[u8; 32]\` を渡してもエラーにならない。**Newtype は「これはただの 32 bytes ではなく、特定的に block hash である」と Rust の型システムに強制させる方法だ。**

**32 bytes なのになぜ \`Copy\`?** Copy semantics なら \`.clone()\` なしに \`BlockHash\` を value で渡せる。コストは小さく (32 bytes の memcpy)、得るものは大きい — block hash は頻繁にやり取りするからだ。代替 (\`Clone\` のみ) では call site すべてで \`.clone()\` が必要になり、ノイズが増える。

**なぜ 10 個も trait derive するのか?** \`Debug\` は \`{:?}\` フォーマット用、\`Clone, Copy\` で value semantics、\`PartialEq, Eq\` で equality test、\`PartialOrd, Ord\` でソート (validator が block を sort する場面が出てくる)、\`Hash\` で \`HashMap\` の key、\`Serialize, Deserialize\` で wire format。Contract type はどれも大体この同じセットを必要とする。

**なぜ custom \`Display\` impl?** デフォルトの \`Debug\` は \`BlockHash([171, 18, 240, ...])\` を print してしまい、ログが読めない。Custom \`Display\` なら \`0xab12f0...\` を print し、Ethereum convention に合わせられる。ログは debugger の primary tool だ。人間に読める形にすることは optional ではない。

\`cargo check -p openhl-types\` を走らせる。pass するはず。

### Step 5: \`PayloadId\` を追加

\`\`\`rust
/// Identifier returned by \`build_payload\`; used to retrieve the assembled block via \`payload_ready\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PayloadId(pub u64);
\`\`\`

同じ newtype パターンで、backing type がより小さい。\`Display\` impl は不要 — \`Debug\` (\`PayloadId(42)\`) でログには十分だ。

ここには \`PartialOrd, Ord\` がない。Block hash は順序付けが必要だ (ソート用) が、payload ID は不要だ (\`build_payload\` と \`payload_ready\` の間で受け渡す不透明 token に過ぎないため)。

> 🛑 **やりがちな勘違い。** 「\`u64\` をそのまま使えばいいのでは? PayloadId はただの数字だ。」 **Newtype が footgun を防ぐからだ。** \`u64\` を直接使うと \`build_payload(..., some_random_u64)\` と書けてしまい、Cargo は捕まえてくれない。\`PayloadId(u64)\` なら compiler が \`PayloadId(some_random_u64)\` と明示的に書くことを強制し、意図が見えるようになる。コストは construction ごとに余分な \`(...)\` が 1 個増えるだけ。利益はコード中のすべての payload ID が「証明可能に payload ID である」状態になり、誰かのタイプミスの integer が紛れ込まないことだ。

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

newtype ではなく real struct — 複数フィールドを持つ。3 つの中身:

- \`timestamp\` — Unix 秒、proposer が選ぶ
- \`fee_recipient\` — 20-byte Ethereum address、gas fee の送り先
- \`prev_randao\` — 32-byte beacon-chain randomness (前ブロック由来)

この 3 つが、Reth が payload を assemble するのに **最小限** 必要なものだ。Ethereum Engine API 仕様にはもっとフィールドがある (\`suggestedFeeRecipient\`、\`parentBeaconBlockRoot\`、\`withdrawals\` など)。v0 では省略する — openhl は single-validator で、withdrawal flow を持たないからだ。

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

- **\`Valid\`** — EL が block を適用し、期待された state に到達した。投票する。
- **\`Invalid\`** — EL が block を適用したが結果が間違っていた (state-root mismatch、gas-limit 違反など)。Nil 投票し、この proposer を faulty として扱う。
- **\`Syncing\`** — EL がまだ答えるための state を持っていない (chain が遅れている)。まだ投票せず、待つか timeout に falling する。

**3 つの variant は互換ではない。** \`Syncing\` を \`Invalid\` のように扱うと、本来答えられたはずの peer から永久に fork する。\`Invalid\` を \`Syncing\` のように扱うと、bad proposal が通ってしまう。レッスン 3 (trait のレッスン) でこの話を深掘りする。今は 3 つの区別された verdict を encode したという段階。

### Step 8: \`ExecutedBlock\` を追加

\`\`\`rust
/// An executed block — the artifact a consensus round commits to. Minimal v0 shape; txs and receipts land per ステップ 2.
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

- transaction list — ステップ 2 (CLOB) で transaction が定着する。v0 は空ブロックを 生成する
- receipts list — 同様
- logs bloom — 同様
- difficulty / mix hash — post-merge のデフォルト

これが consensus round が閉じるのに必要な最小形だ。ステップ 2-5 が定着するにつれて \`ExecutedBlock\` にフィールドが増えていく。今は最小形にしておけば、ステップ 2 を設計する前に ステップ 2 の design を encode してしまう事態を避けられる。

\`cargo check -p openhl-types\` を走らせる — 引き続き pass するはず。

### Step 9: Unit test を追加

テスト内で \`serde\` の round-trip を実際に走らせるので、**先に**dev-dependency に \`serde_json\` を入れてから test code を書く。\`crates/types/Cargo.toml\` の末尾に追加:

\`\`\`toml
[dev-dependencies]
serde_json = { workspace = true }
\`\`\`

(IDE / rust-analyzer に \`serde_json::to_string\` を「未解決」とフラグされる前に依存を入れておくことで、無用な赤波線とリビルド時間を回避できる。)

そのうえで \`crates/types/src/lib.rs\` の末尾に追加:

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

テストが失敗する場合、よくあるミス:

- **\`#[derive(Clone)]\` や \`#[derive(PartialEq)]\` を type に書き忘れた。** Compiler error が欠けている trait 名を教えてくれる。
- **\`BlockHash\` に \`Display\` impl が無い。** \`format!("{h}")\` は \`Debug\` ではなく \`Display\` を要求する。
- **\`[dev-dependencies]\` に \`serde_json\` を追加し忘れた。** \`serde_json::to_string\` が解決しない。

## 設計を振り返る

このレッスンで encode した本質的な決定が 2 つ:

1. **Contract type は別 crate (\`openhl-types\`) に置く** — \`openhl-consensus\` でも \`openhl-evm\` でもない場所に。理由は Rust の crate-graph の制約だ: \`BlockHash\` を \`openhl-consensus\` に置くと、\`openhl-evm\` はその type を使うために \`openhl-consensus\` に依存する。だが \`openhl-consensus\` も \`openhl-evm\` が impl するメソッドを呼ぶ必要があり、\`openhl-consensus\` が \`openhl-evm\` に依存する。**A→B と B→A は循環依存で、Rust は許可しない。** 解決策は **shared vocabulary crate** だ: \`openhl-consensus\` と \`openhl-evm\` の両方が \`openhl-types\` に依存し、両者は type 定義のために互いに依存しなくなる。これは CL↔EL split を持つあらゆる Rust workspace の標準パターンで、Reth も同じ目的で \`alloy-primitives\` と \`reth-primitives-traits\` を使っている。

2. **PayloadStatus は bool ではなく enum。** レッスン 0 と上の予測で flag した話。3 つの状態は互換ではない: EL が *どの* not-Valid 状態にいるかで consensus 側の応答が変わる。\`bool { is_valid }\` に collapse すると、chain の liveness にとって load-bearing な情報を失う — Syncing node を Invalid として扱えば、本来助けてくれたはずの peer から永久に fork してしまう。

CL ↔ EL 間で \`PayloadStatus\` がどう流れ、各 verdict がそれぞれ違う action を引き起こすかを 1 枚で見ると、なぜ 3 状態が必要なのかが一目で見える:

\`\`\`
┌────────────────────────────────────────────────────────────────────────────┐
│                       Consensus Layer (CL)                                  │
│                                                                             │
│         validate_payload(block) を Execution Layer に問い合わせ              │
│                                  │                                          │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │ ▲
                                   ▼ │ PayloadStatus
┌────────────────────────────────────┼──────────────────────────────────────┐
│                Execution Layer (EL)│                                       │
│                                    │                                       │
│   ┌────────────────────────────────┴──────────────────────────────────┐    │
│   │  block を実行 → 結果を 3 つに分類:                                  │    │
│   │                                                                    │    │
│   │  ✅ Valid   : state-root が一致、gas-limit OK、全ルール pass        │    │
│   │  ❌ Invalid : 実行はできたが結果が間違い (state-root mismatch 等)   │    │
│   │  ⏳ Syncing : そもそも実行に必要な state をまだ持っていない          │    │
│   └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

CL 側の応答 (これが 3 つに分かれる理由):
  ✅ Valid   → block に投票 (consensus に乗せる)
  ❌ Invalid → Nil 投票、proposer を faulty 扱い (slash 対象)
  ⏳ Syncing → 投票しない、待つか timeout に falling、peer から sync を再試行

3 状態を bool に潰したときの事故:
  Syncing を Invalid 扱い → 自分が遅れているだけの正当な proposer を Nil 投票
                            → peer 群と「自分だけが invalid と判定した」状態で永続的に fork
  Invalid を Syncing 扱い → 本当に間違った block を「待てば直る」と誤認
                            → bad proposal が timeout 経由で素通り、chain が腐る
\`\`\`

つまり \`Valid\` / \`Invalid\` / \`Syncing\` は「投票する / 否決する / 棄権する」という consensus 上の 3 つの action と 1:1 対応している。bool に潰すと「棄権」が消えて、\`Syncing\` の正しい挙動が表現できなくなる。レッスン 3 (\`ConsensusBridge\` trait) でこの 3 状態の handling を実際の関数シグネチャに落としていく。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 13113db
diff -u ~/code/my-openhl/crates/types/src/lib.rs ./crates/types/src/lib.rs
\`\`\`

自分のコードは、空白とテスト名以外は実質的に同一になるはず。重要な一致ポイント: type 定義 (各フィールド、各 derive)、\`BlockHash::Display\` impl のロジック、\`PayloadStatus\` enum の variant 順序。

main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`BlockHash::Display\` のテストが失敗する — 「2+64 文字期待、X 文字」。**
おそらく \`write!(f, "{b:02x}")\` (2 hex digits、zero-padded) ではなく \`write!(f, "{b:x}")\` (single hex digit) を書いている。Byte value 0x05 の場合、\`{b:x}\` は \`"5"\` を 生成するが \`{b:02x}\` は \`"05"\` を 生成する。テストは 1 byte あたり 2 文字を期待している。

**Q: \`ExecutedBlock\` を \`Copy\` にできるか?**
今の形ではできない — production では \`Vec<...>\` (transaction list) を含むようになり、\`Vec\` は \`Copy\` ではないからだ。v0 では fixed-size フィールドだけなので *理論的には* Copy にできるが、後で外す手間を避けるために意図的に derive しない。フィールドが byte 列だけならクローンも安いので、必要な call site で明示的に \`.clone()\` すればよい。

**Q: なぜ \`prev_randao\` は「ランダム性」なのに 32 bytes?**
前ブロック時点での **RANDAO mix** (Ethereum の beacon chain が各スロットで validator の reveal を XOR 累積していくミキシング値) だからだ。厳密には「単発の hash」ではないが、結果として常に 32 バイト固定長のランダムに見えるバイト列 (\`[u8; 32]\`) に収まるよう設計されている。実際のエントロピー source は beacon chain 側にあり、execution layer の \`PayloadAttrs\` はその 32 バイト値を入力として受け取るだけ。したがって openhl 側の type も \`[u8; 32]\` で受ける。

**Q: \`BlockHash\` に \`Default\` を derive すべき?**
できる (\`[u8; 32]\` の \`Default\` は all-zeros) が、**ここでは derive しない**。openhl の convention は「block hash は real data から compute されるもの」だ。Default-construct された \`BlockHash([0u8; 32])\` は code smell。Sentinel が必要な test code は \`BlockHash([0u8; 32])\` を明示的に書く。

## 次のレッスン (レッスン 3)

\`openhl-types\` に 5 つの contract type が揃った。レッスン 3 は \`ConsensusBridge\` trait — consensus が呼ぶ 4 メソッドの API surface。Trait は今書いた type を参照する: \`build_payload(BlockHash, PayloadAttrs) -> PayloadId\`、\`payload_ready(PayloadId) -> ExecutedBlock\` など。レッスン 3 を終えると、contract が型レベルで完全に specified された状態になる。レッスン 4 でその impl を始める。`,
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

このレッスンで掴む概念:

- **メソッドがちょうど 4 つになる理由。** \`build_payload / payload_ready / validate_payload / commit\` の 4 つは BFT round 構造 (propose → vote → decide) によって決まる。ここで \`build_payload\` と \`payload_ready\` を 1 つにまとめると「投票中に裏で次ブロックを組み立てる」動きができなくなる。逆に 5 つ目（例: \`notify_view_change\`）を足すと、consensus 内部事情を EL API に公開することになり、層の分離が崩れる。
- **\`#[async_trait]\` と \`Send + Sync\` bound。** ここでいう *desugar* は「マクロ展開で低レベルな形に変換する」意味。\`async_trait\` は \`async fn\` を内部的に boxed future へ展開し、\`dyn\` で扱えるようにする。*soundness* は「型安全性が壊れないこと」。\`: Send + Sync\` を付けることで、\`Arc<dyn ConsensusBridge>\` を actor 間で共有しても安全だとコンパイラが検証できる。
- **3 つの error 分類。** \`Rejected / NotReady / Internal\` が 3 種類の consensus 応答 (反対 vote / 待つ / 停止) に対応する。これを 1 つの string エラーにすると、consensus 側が文字列判定（parse）しないと分岐できない。逆に細かい variant を増やしすぎると EL 実装の内部事情が API に漏れる。
- **Trait-as-contract プログラミング。** このファイルがコンパイルされた瞬間、以降のレッスンはすべて「この method を実装する」か「この method を呼ぶ」のどちらかになる。レッスン 4〜5 は impl、レッスン 10〜14 は caller。ここから先の codebase の形が決まる。

検証:

\`\`\`bash
cargo check -p openhl-consensus
\`\`\`

上記の実行結果が pass する。\`openhl-consensus\` crate に 4 メッセージの \`ConsensusBridge\` trait — consensus が呼び、execution が実装する型付き API surface — が入る。**impl はまだない** (レッスン 4 から始まる)。trait とそれに紐づく error type だけだ。

具体的な変更:

- \`crates/consensus/Cargo.toml\` に 4 つの依存追加: \`openhl-types\`、\`async-trait\`、\`thiserror\`、\`eyre\`。
- \`crates/consensus/src/bridge.rs\` — 新規ファイル、\`ConsensusBridge\` trait (4 つの async method) と \`BridgeError\` enum (3 variant) を含む。
- \`crates/consensus/src/lib.rs\` — \`pub mod bridge;\` を組み込む。

## おさらい

レッスン 2 を終えた時点:

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

1. **\`crates/consensus/Cargo.toml\` に 4 つの依存を追加する**: \`openhl-types\` (レッスン 2 の type を使うため)、\`async-trait\` (trait メソッドで \`async fn\` を合法化するマクロ)、\`thiserror\` (きれいな error type を derive する macro)、\`eyre\` (\`thiserror\` と相性のよい \`Result\` ライブラリ)。
2. **\`crates/consensus/src/bridge.rs\` を作成する** — \`ConsensusBridge\` trait (4 つの async メソッド) と \`BridgeError\` enum (3 variant)。
3. **\`crates/consensus/src/lib.rs\` に \`pub mod bridge;\` を追加して** bridge module を crate に組み込む。

この trait は **コース全体で最も参照されるアーティファクト** だ。レッスン 4 で impl する (\`InMemoryEvmBridge\`)。レッスン 5 でもう一度 impl する (\`RethEvmBridge\`)。レッスン 9 で actor pipeline から呼ぶ。レッスン 11〜13 で 3 度目の impl (\`LiveRethEvmBridge\`)。**今書く signature が下流すべてに伝播する。**

> 🛑 **考えてみよう。** もう一度 4 つのメソッド名を見る: \`build_payload\`、\`payload_ready\`、\`validate_payload\`、\`commit\`。**3 つは CL → EL (consensus が execution を呼ぶ)、1 つは EL → CL (execution が応答する)。どれが EL → CL 方向か、そしてなぜか?** ヒント: そのメソッドの *戻り値* を consensus 側がどう待っているかを考える。

## 手を動かす walk-through

### Step 1: \`crates/consensus/Cargo.toml\` に依存を追加

\`crates/consensus/Cargo.toml\` を開く。\`[dependencies]\` セクションは現状 header だけで空のはずだ。次に置き換える:

\`\`\`toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }
\`\`\`

4 つ。それぞれ \`workspace = true\` でルート \`Cargo.toml\` の pinned version を継承する。保存して:

\`\`\`bash
cargo check -p openhl-consensus
\`\`\`

これでも pass するはず — まだ使っていない依存を宣言しただけだからだ。Cargo は lock file に無いものを fetch する。\`async-trait\` と \`thiserror\` は小さいので、~5 秒で終わる。

**なぜこの 4 つか?**

- **\`openhl-types\`** — trait の signature が レッスン 2 の 5 つの type (\`BlockHash\`、\`PayloadAttrs\`、\`PayloadId\`、\`ExecutedBlock\`、\`PayloadStatus\`) を参照するため。
- **\`async-trait\`** — Rust の native な「trait 内の \`async fn\`」はいくつかの caveat (Send bound、\`dyn\` 互換性) が残っており、まだ完全には解決していない。\`#[async_trait]\` macro はそれを \`Pin<Box<dyn Future<...>>>\` へ desugar して処理する。冗長だが安定していて \`dyn\` 互換だ。
- **\`thiserror\`** — \`impl Display\`/\`impl Error\` を手書きせずに custom error enum を derive するため。
- **\`eyre\`** — catch-all な \`Internal\` variant 用。\`eyre::Report\` は任意の error をバックトレース付きでラップする。「予期せぬ何かがおかしくなった」を、internal failure mode をすべて列挙せずに表現するのに使う。

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

各部分の役割を順に辿る — このファイルはコース内で最も重要なファイルだ。

### Step 3: Trait 宣言を理解する

\`\`\`rust
#[async_trait]
pub trait ConsensusBridge: Send + Sync {
\`\`\`

**\`#[async_trait]\`** は attribute macro で、trait を書き換えて各 \`async fn\` を \`Pin<Box<dyn Future<Output = ...> + Send + 'a>>\` を返す形にする。このマクロが無いと、\`dyn ConsensusBridge\` (後で必ず使う) として trait を呼びたいときに Rust がエラーを出す。

**\`pub trait ConsensusBridge\`** で trait を public API にする — \`openhl-consensus\` 自身も、後続の \`openhl-evm\` impl のような downstream crate も、この名前を使える。

**\`: Send + Sync\`** は super-trait bound。\`ConsensusBridge\` を impl するすべての type は \`Send\` (thread 境界をまたいで move 可能) かつ \`Sync\` (複数 thread から参照可能) でなければならない、と宣言している。bridge は \`Arc<dyn ConsensusBridge>\` として actor task 間で共有されるので、これが必要だ — actor は別 thread に住み得る。

> 🛑 **やりがちな勘違い。** 「macro なしで \`async fn\` を直接書けないのか?」 **Rust 1.75 以降なら書けるが caveat がある。** Native な async-fn-in-trait は返される future に自動で \`Send\` bound を付けてくれず、native async fn を持つ trait の \`dyn Trait\` にはまだ粗い部分が残る。\`#[async_trait]\` は退屈だが確実に動く解決策だ。Native feature が成熟したら (おそらく 1.95-2025 以降) 見直せる。今は macro で行く。

### Step 4: 4 つの method signature を理解する

シグネチャを 1 つずつ読む前に、4 つのメソッドが BFT round のどのタイミングで、どちらの方向にデータを流すのかをタイムラインで掴んでおくと、各 signature の必然性が直感で押さえられる:

\`\`\`
【 CL / EL インタラクションフロー — BFT round の時間軸 】

──[ 前 round の投票が進行中、proposer は自分のターンを準備 ]─────────────────────
   CL ──────( build_payload(parent, attrs) )──────►  EL
                                                     │
                                                     └─ 裏でブロック構築を開始
                                                        (前 round 投票と並走)

──[ 自分が proposer になった瞬間 — hot path、ここで microseconds が効く ]─────
   CL ──────( payload_ready(id) )─────────────────►  EL
   CL ◄────( ExecutedBlock を返す ) ────────────────── EL
   CL ─► (ネットワークへ Proposal を broadcast)

──[ 他 peer から Proposal を受信 — validator はすべてここを通る ]──────────
   CL ──────( validate_payload(&ExecutedBlock) )───►  EL
   CL ◄────( PayloadStatus: Valid / Invalid / Syncing ) ── EL
   CL ─► 結果に応じて vote (賛成 / Nil / 棄権)

──[ 2/3+ Quorum に達した — block が finalized になる ]──────────────────
   CL ──────( commit(hash) )──────────────────────►  EL
                                                     │
                                                     └─ そのブロックを永続化、
                                                        new head として確定
\`\`\`

ポイントは 2 つ: (a) **\`build_payload\` と \`payload_ready\` は別の round 局面で呼ばれる** — 前者は前 round 投票中、後者は自分が proposer になった hot path。これがレッスン後半で見る「最も重要な latency trick」の正体だ。(b) **call の主導権は常に CL 側にある** が、\`payload_ready\` だけはデータが EL → CL に逆流する seam になっている（上の「計画」セクションのクイズの答え）。それでは各 signature を読んでいく。

\`\`\`rust
async fn build_payload(
    &self,
    parent: BlockHash,
    attrs: PayloadAttrs,
) -> Result<PayloadId, BridgeError>;
\`\`\`

入力: parent block hash と payload attribute。出力: \`PayloadId\` — 不透明 handle で、bridge は build を開始したがブロックはまだ ready ではないことを表す。即座に return する。

\`\`\`rust
async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError>;
\`\`\`

その companion。\`build_payload\` から返ってきた \`PayloadId\` を渡し、\`ExecutedBlock\` を受け取る。in-flight な build が完了するまで block するので async になっている。

*(これが上の「計画」セクションのクイズの答えだ。call の主導権は CL 側にあるが、EL 側の構築スレッドから完成済みの \`ExecutedBlock\` が CL へと逆流して同期する **seam** になっている — データの流れだけ見ると 4 メソッドの中で唯一 EL → CL 方向を持つ。)*

**なぜ \`build_payload\` + \`payload_ready\` に分けて、1 つの \`build_payload -> ExecutedBlock\` にしないのか?** EL が *前 round の投票中に* build する必要があるからだ。\`build_payload\` が同期的にブロックを返すなら、proposer は build を待ってから broadcast する。分けると build が裏で走りつつ投票が進み、proposer の hot path は「準備済みブロックを fetch」(microsecond) に縮む。これが設計上 **最も重要な latency trick** で、sub-second block time はこれに依存する。

\`\`\`rust
async fn validate_payload(
    &self,
    block: &ExecutedBlock,
) -> Result<PayloadStatus, BridgeError>;
\`\`\`

形が違う: \`&ExecutedBlock\` (borrowed、own ではない)。Bridge はブロックを *調べる* だけで、consume しない。\`PayloadStatus\` (レッスン 2 の enum) を返す — Valid / Invalid / Syncing のいずれか。

**なぜ borrowed か?** Consensus は同じブロックを複数回 inspect する必要があるかもしれないからだ (broadcast、persist、それから validate)。Ownership を取ると call site で値が consume され、呼び出し側が clone を強いられる。Borrow なら呼び出し側がそのまま保持できる。

\`\`\`rust
async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError>;
\`\`\`

最も小さい signature: 入力は hash、出力は unit。**Fire-and-forget。** Consensus がブロックを確定させた時点でこのメソッドが EL に「finalize しろ」と告げる。EL は state に適用し、fork-choice を更新し、それ以降この hash を unset することは無い。\`Result<()>\` を返すことで hard failure を signal できる (**chain を halt させる** — レッスン 9 で扱う) が、成功 commit は何も返さない。

**\`&ExecutedBlock\` 引数が無い** ことに注意。commit が呼ばれる時点で、bridge は \`payload_ready\` か \`validate_payload\` でこのブロックをすでに見ている。hash だけを引数に取ることで、consensus は何も覚えなくて済む — EL が state を持ち、CL は stateless のままだ。

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

3 variant — \`PayloadStatus\` と同じ数だが、**1:1 対応ではない**。区別は次のとおり:

- **\`Rejected(String)\`** — EL がブロックにロジックを適用して「no、これは bad」と言った。String が human-readable な理由を持つ。Consensus はブロックを invalid として扱うべきだ: nil 投票（= その提案には賛成しない票）を出して次 round へ進む。
- **\`Syncing\`** — EL がまだ答えるための state を持っていない。Rejection とは違う: ブロックが bad かどうかはまだ分からない、答えられないだけだ。Consensus は後でリトライすべきで、nil 投票（反対票）にはしない。
- **\`Internal(eyre::Report)\`** — 予期せぬ何かが壊れた。Disk full、mutex poisoned、panic caught など。Consensus は **halt** すべきだ — chain レベルでは回復不能。

**\`PayloadStatus::Syncing\` も status として存在するのに、なぜ \`Syncing\` が error variant なのか?** Contract に 2 層があるからだ:

- \`validate_payload\` からの \`PayloadStatus::Syncing\` は「EL が request を処理し、自分の sync state を report した」という意味だ。
- 任意のメソッドからの \`BridgeError::Syncing\` は「call そのものが完了できなかった」という意味だ。\`build_payload\` (parent state が無いと build できない) と \`commit\` (適用できないものは finalize できない) でよく出る。

**\`#[from] eyre::Report\`** で \`From<eyre::Report> for BridgeError::Internal\` を自動 derive する。Bridge 実装側は \`let foo = some_call()?;\` と書けて、\`some_call()\` が \`Result<_, eyre::Report>\` を返すとき \`?\` が自動で \`BridgeError::Internal\` にラップしてくれる。「予期せぬ」エラーを bubble up する canonical な方法だ。

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

\`pub mod bridge;\` が Rust に「この crate には \`bridge\` という public module があり、source は \`src/bridge.rs\`」と教える。この行が無いと \`bridge.rs\` は crate 外から見えない。

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

unused imports の warning (例: method signature をタイプミスして \`ExecutedBlock\` が未使用になる) や unused trait の warning が出るかもしれない。**Hard error は許容できないが**、warning は今のところ OK。

よくあるエラーと対処:

- **\`use of undeclared crate or module 'async_trait'\`** — \`async-trait\` が \`[dependencies]\` に無い。Step 1 を再確認。
- **\`cannot find type 'BlockHash' in this scope\`** — \`openhl-types\` が import されていない。\`bridge.rs\` の \`use\` 行を再確認。
- **\`expected type parameter 'Send + Sync', found...\`** — \`pub trait ConsensusBridge\` の後に \`: Send + Sync\` を書き忘れている。戻す。
- **\`#[from] is only allowed on a single field\`** — variant に \`#[from]\` を 2 個以上書いたか、tuple field のない variant に \`#[from]\` を付けている。

workspace 全体もコンパイルしてみる:

\`\`\`bash
cargo check --workspace
\`\`\`

引き続き pass するはず。

## 設計を振り返る

このレッスンで encode した本質的な決定が 3 つ:

1. **メソッドは 4 つ。3 でも 5 でもない。** すべての BFT-レッスン1 実装がきっかりこの 4 つに収束する。\`build_payload\` + \`payload_ready\` を 1 つにすると、投票中の先行ビルドができなくなる。5 つ目 (例: \`notify_view_change\`) を足すと、consensus 内部イベントを EL 側 API が知る設計になってしまい、責務分離が崩れる。数は BFT round 構造 (propose → vote → decide) で決まり、言語の好みでは決まらない。

2. **trait に \`Send + Sync\` bound。** すべての impl が thread-safe であることを強制する。これが無いと、actor 間で共有される \`Arc<dyn ConsensusBridge>\` がコンパイルできない。これがあれば、実装者は「mutable state は Mutex か atomic の裏に置く必要がある」と最初から分かる。Runtime バグへの discipline を compiler が enforce してくれる形だ。

3. **Error variant は 3 つ。1 つでも多くでもない。** 3 つは consensus 側の 3 つの distinct な action (vote-against、wait、halt) に対応する。\`BridgeError(String)\` 1 つだと consensus 側で文字列パースをする。5 つ以上 (例: \`Rejected.Hash\`、\`Rejected.Number\`、\`Rejected.BaseFee\`) にすると、EL 内部を consensus 側に leak するか、EL が変わると急速に drift する。3 つは **consensus が error に対して取る応答** の cardinality であり、EL の internal taxonomy は \`Rejected\` の String の裏に隠したままだ。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 13113db
diff -u ~/code/my-openhl/crates/consensus/src/bridge.rs ./crates/consensus/src/bridge.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
\`\`\`

期待値: doc-comment の言い回しは多少違って OK。4 つの method signature、3 つの error variant、\`#[async_trait]\` attribute、\`: Send + Sync\` bound は完全に一致する必要がある。

main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`cargo check\` が \`pub mod bridge\` と \`bridge.rs not found\` で文句を言う。**
ファイルは \`crates/consensus/src/bridge.rs\` であって \`crates/consensus/bridge.rs\` ではない。convention は「\`lib.rs\` で宣言された module は \`lib.rs\` の隣に住む」だ。

**Q: \`validate_payload\` が bytes を inspect するだけなら、なぜ async?**
v0 では sync でもよい — \`BlockHash\` を \`parent_hash\` と比較するのは microsecond の話だ。だが production の validate_payload は parent state に対して EVM を走らせるので、async DB access が必要になる。今 async にしておけば、後で trait を破る必要が無い。コストはほぼゼロ (immediate-ready future は実質タダ)。

**Q: メソッド名は変えていい? \`build_payload\` は冗長だ。**
自分のコードでは変えられるが、openhl からは divergence する。名前は Ethereum Engine API に合わせてある (\`engine_forkchoiceUpdated\` が \`PayloadId\` を返し、\`engine_getPayload\` で fetch する)。これで openhl ↔ Ethereum のマッピングが、後者を知っている人にとって分かりやすくなる。

**Q: \`eyre::Report\` とは何か? なぜ \`String\` ではいけないのか?**
\`eyre::Report\` は cause chain と source-location info を持つ。Chain halt をデバッグするときに見たいのは「DB write failed: disk full: at io.rs:142」であって、「internal error」だけでは困る。\`Report\` はこれをやってくれる、\`String\` はやってくれない。catch-all variant に使う。

## 次のレッスン (レッスン 4)

Contract は型レベルで完全に specified された。レッスン 4 で impl を開始する。\`InMemoryEvmBridge\` を書く — fake ブロックを \`Mutex<HashMap>\` に保存して synthesize した hash を返す test double だ。Real EVM も real state も無い — trait を満たして consensus 側をテスト可能にするための最小限の実装。**重要なのは、同じ trait \`ConsensusBridge\` が \`InMemoryEvmBridge\` (レッスン 4) と \`LiveRethEvmBridge\` (レッスン 11+) の両方をカバーすること — \`Send + Sync\` bound と \`async_trait\` macro のコストを払うことで得られる polymorphism の win だ。**`,
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

このレッスンで掴む概念:

- **テストダブル先行の実装戦略。** Reth に触れる前に fake EVM を書く理由。trait を end-to-end で exercise するのに 600 個の transitive dep を待つ必要がなく、下流の consensus test (レッスン 9/レッスン 10) を 2.7s ではなく 0.02s で回せる。
- **内部可変性のための \`Mutex<State>\`。** レッスン 3 で要求された \`Send + Sync\` bound を満たすため、private \`State\` struct を単一の \`Mutex\` で包む。method ごとに 1 回 lock するパターンはテストコードでは十分で、レッスン 12 以降の \`LiveRethEvmBridge\` にも構造的に伝播する。
- **\`pending\` と \`chain\` map の分離。** 投機的な build と canonical な commit はライフサイクルが異なる。ここで分離を encode しておくと、以降の impl すべてが同じデータフローを尊重する (build は投機、commit は確定)。
- **\`async_trait\` の impl ergonomics。** \`#[async_trait]\` を \`impl\` block に付けたとき何が要求されるか (lifetime、\`Self: Send + Sync\`)、stable Rust で trait の \`async fn\` がいまだに macro 経由で desugar される理由。

検証:

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

上記の実行結果が in-memory bridge の build → ready → commit フローをカバーする 5 つのテストで pass する。レッスン 3 の \`ConsensusBridge\` の **最初の具象 implementation** が手元にある状態になる — EVM のふりをして fake block を保存し、Reth を立ち上げずに trait を exercise する test double だ。

具体的な変更:

- \`crates/evm/Cargo.toml\` に 3 dependency + 1 dev-dependency 追加: \`openhl-consensus\`、\`openhl-types\`、\`async-trait\`、\`tokio\` (dev)。
- \`crates/evm/src/in_memory.rs\` — 新規ファイル、\`InMemoryEvmBridge\` struct、private \`State\`、\`Mutex<State>\`、4 method の \`impl ConsensusBridge\`、\`hex_short\` helper、5 unit test を含む。
- \`crates/evm/src/lib.rs\` — \`pub mod in_memory; pub use InMemoryEvmBridge;\` を組み込む。

## おさらい

レッスン 3 を終えた時点:

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

1. **\`crates/evm/Cargo.toml\` に依存を 3 つと dev-dependency を 1 つ追加する**: \`openhl-consensus\` (trait と error type 用)、\`openhl-types\` (contract type 用)、\`async-trait\` (\`#[async_trait]\` macro 用)、dev-dep に \`tokio\` (テスト関数を \`#[tokio::test]\` にするため)。
2. **\`crates/evm/src/in_memory.rs\` を作成する** — \`InMemoryEvmBridge\` struct、\`Mutex\` に持たせる private な \`State\` struct、4 つの async method すべてを提供する \`impl ConsensusBridge for InMemoryEvmBridge\` block、\`hex_short\` ヘルパー、\`#[cfg(test)] mod tests\` (5 テスト)。
3. **\`in_memory\` を crate に組み込む** — \`crates/evm/src/lib.rs\` に \`pub mod in_memory; pub use in_memory::InMemoryEvmBridge;\` を追加。
4. **\`cargo test -p openhl-evm\` を実行** — 5 つのテストが pass するのを見届ける。

これが Rust の impl を初めて書く場面だ。ここで encode するパターンは繰り返される: レッスン 5 の \`RethEvmBridge\` も同じスケルトンを使い、レッスン 11+ の \`LiveRethEvmBridge\` も同様だ。**State 管理パターン (Mutex<State> + pending vs chain map) もそれらの impl に伝播する。**

> 🛑 **考えてみよう。** スクロールする前に: test double の \`build_payload\` が **fake する** ものは何で、**実際にできる** ものは何か? ヒント: EVM は走らせられないが、できることはある — \`PayloadId\` を割り当てる、block number をインクリメントする、hash を synthesize する、pending block を覚える。Fake vs real の区別は レッスン 5 と レッスン 11 で意味を持つ。

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
- **\`openhl-types\`** — \`BlockHash\`、\`PayloadId\` などを使うため
- **\`async-trait\`** — impl block の \`#[async_trait]\` attribute 用
- **\`tokio\` (dev)** — async test 関数の \`#[tokio::test]\` 用

\`cargo check -p openhl-evm\` は引き続き pass する — まだ使っていない依存を宣言しただけだからだ。

### Step 2: ファイルを作成

\`\`\`bash
touch crates/evm/src/in_memory.rs
\`\`\`

module-level doc を追加:

\`\`\`rust
//! In-memory \`ConsensusBridge\` — a test double for the EL side.
//!
//! Useful for unit-testing the consensus crate without spinning up Reth. The
//! real Reth-backed implementation lives in \`engine.rs\` (lands in レッスン 5).
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

各フィールドの役割を順に見ていく:

**\`InMemoryEvmBridge\`** — public struct。フィールドは 1 つ: \`state: Mutex<State>\`。Mutex が type を \`Send + Sync\` にし (thread 間で safely 共有可能)、これは trait が要求する性質だ。Mutable なものはすべて mutex の内側に置く。

**\`State\`** (private) — 3 つの bookkeeping:

- \`next_payload_id: u64\` — 単調カウンタ。\`build_payload\` のたびにインクリメントし、その前の値を返り値の \`PayloadId\` に使う。
- \`pending: HashMap<u64, ExecutedBlock>\` — \`build_payload\` が 生成したが \`commit\` がまだ accept していない block。\`PayloadId\` を key にする。
- \`chain: HashMap<[u8; 32], ExecutedBlock>\` — commit 済み block。生の 32-byte hash を key にする (\`BlockHash\` newtype ではなく — lookup 時に \`.0\` accessor を省ける)。
- \`head: Option<BlockHash>\` — 最も最近 commit された hash。何も commit していなければ \`None\`。

\`pending\` と \`chain\` を分けるのが重要だ: \`commit(hash)\` が呼ばれた時点で、その block は (前の \`build_payload\` から) すでに \`pending\` にある。\`commit\` は pending → chain に移し、\`head\` を更新する。real EL が in-flight payload buffer と finalized chain の両方を持つ構造と同じだ。

\`State\` の 4 フィールド (\`next_payload_id\` / \`pending\` / \`chain\` / \`head\`) を、\`build_payload\` → \`payload_ready\` → \`commit\` のライフサイクルに沿ってどう動くかを 1 枚で見ると、レッスン 5 や レッスン 11+ の本物の bridge でも同じ形が再利用されることが直感で押さえられる:

\`\`\`
【 InMemoryEvmBridge 内のブロックライフサイクル 】

1. build_payload(parent, attrs)
                       │
                       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ chain.get(&parent.0) で parent の number を引く              │
   │ next_payload_id を 1 増やして PayloadId を発行               │
   │ 新しい ExecutedBlock を合成 (number = parent + 1、hash 等)   │
   │ pending.insert(PayloadId, ExecutedBlock)  ◄── 投機的に格納   │
   └────────────────────────────────────────────────────────────┘
                       │
                       ▼  (CL に PayloadId だけ返す)

2. payload_ready(id)
                       │
                       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ pending.get(&id).cloned()  ◄── 未確定ブロックを CL に貸し出す │
   │ (pending には残しておく — まだ commit されていない)            │
   └────────────────────────────────────────────────────────────┘
                       │
                       ▼  (ExecutedBlock を返す)

3. commit(hash)                  ※ CL が 2/3+ Quorum 達成後に呼ぶ
                       │
                       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ pending から該当ブロックを検索 → remove                       │
   │ chain.insert(hash.0, ExecutedBlock)  ◄── canonical 領域へ移す │
   │ head = Some(hash)                    ◄── new head を更新     │
   └────────────────────────────────────────────────────────────┘
                       │
                       ▼  (Ok(()) を返す、ブロックは finalized)
\`\`\`

ポイントは「**pending = 投機的 (未確定) / chain = 確定済み**」という 2 つの寿命がマップレベルで分離していることだ。\`build_payload\` は楽観的に積み上げ、\`commit\` だけが「pending から chain へ昇格させる」唯一の権限を持つ。これは本物の Reth EL でも \`pending blocks\` と \`canonical chain\` という名前で同じ形が存在しており、レッスン 5 / レッスン 11+ で本物の bridge に差し替えても**データの流れ方は レッスン 4 と同じ**になる。

**\`impl InMemoryEvmBridge::new\`** — constructor。\`#[must_use]\` は clippy へのヒント: caller が \`InMemoryEvmBridge::new();\` を bind せずに書いたら、ほぼ間違いなくバグだ。

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

順を追って見ていく:

1. **\`self.state.lock().expect("state mutex poisoned")\`** — mutex を取得する。\`.expect\` は \`PoisonError\` ケースをカバーする: 前の holder が lock を持ったまま panic し、state が indeterminate なまま残っている状態だ。正しい動作は自分も panic すること (poisoned な state machine から続けるのは unsafe)。文字列は debug 出力で lock を識別するためのもの。
2. **\`id = s.next_payload_id; s.next_payload_id += 1;\`** — fresh な payload ID を割り当てる。単調で、再利用はしない。DB の sequence と同じだ。
3. **\`s.chain.get(&parent.0).map_or(0, |b| b.number)\`** — parent block の number を見つける。その parent を commit したことがなければ (例: テストの genesis hash)、デフォルトで 0 を返す (子は block 1 になる)。\`.0\` は \`BlockHash\` newtype を unwrap して内側の \`[u8; 32]\` を取り出す。
4. **\`(id, number)\` から hash を synthesize** — 最初の 8 byte が \`id.to_le_bytes()\`、次の 8 byte が \`number.to_le_bytes()\`、残りはゼロ。なぜ real hashing でないのか? test double だからだ。hash は build ごとに unique でありさえすればよい。\`(id, number)\` は構造上 unique なので、synthesize された hash もそうなる。
5. **\`ExecutedBlock\` を build して** \`pending\` に stash する。block は parent_hash、number、hash、そしてゼロの state_root を持つ (EVM を走らせていないため)。
6. **\`Ok(PayloadId(id))\` を返す。**

> 🛑 **やりがちな勘違い。** 「\`BlockHash\` に real cryptographic hash を使うべきでは。」 **違う** — これは test double だ。Real hashing は EVM を走らせて post-state root を compute する必要があり、それを避けるために test double を使っている。Synthesize した hash は \`BlockHash\` の *uniqueness* 要求を満たすが、*cryptographic-commitment* 要求は満たさない — unit test としてはそれでよい。ステップ 1 レッスン 11+ (LiveRethEvmBridge) では real hashing をするが、それは Reth が仕事をするからだ。

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

\`pending\` を ID で lookup する。見つかれば clone する (caller は ownership を欲しがるが、block がまだ commit されていなくて caller が再度問い合わせる場合に備えて、pending には copy を残しておく)。見つからなければ、descriptive な message とともに \`Rejected\` error を返す。

注意: \`payload_ready\` は impl 内で唯一の read-only メソッドだ (mutation なし)。\`let s = self.state.lock()\` に \`mut\` は要らない — \`.get()\` を呼ぶだけで、insert も remove もしないからだ。

### Step 6: \`validate_payload\` を impl

\`\`\`rust
    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        Ok(PayloadStatus::Valid)
    }
\`\`\`

この impl の中で一番単純なもの。test double なので、どんな block も valid と assert する。Real validation (レッスン 12) では \`EthBeaconConsensus::validate_header_against_parent\` を actual parent に対して走らせる。今は \`Valid\` を返すことで consensus tests を動かせる。

**重要: \`_block\` (leading underscore)。** compiler に「この引数を意図的に使わない」と伝える。Underscore 無しだと \`unused_variables\` warning が出る。付けると抑制される。

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

1. State を write 用に lock する。
2. \`pending.values()\` の中から \`block_hash\` に一致する block を探す。value 経由で iterate する理由: \`pending\` は \`PayloadId\` を key にしているので、hash で block を探すには scan が必要だからだ。(real impl で O(1) の hash→block lookup が欲しければ、2 番目の index を持つ。test double では O(n) scan で OK。)
3. 見つからなければ short hex hash 付きで \`Rejected\` error を返す。
4. 見つかれば \`chain\` (key は hash bytes) に insert して \`head\` を更新する。

\`pending\` から remove しない点に注意 — commit 後、block は両方の map に残り続ける。Real impl は \`pending.remove(&id)\` するかもしれないが、test では関係ない。

\`hex_short\` ヘルパーは次のセクション:

> 📍 **配置のナビゲーション。** \`hex_short\` は \`impl ConsensusBridge for InMemoryEvmBridge { ... }\` ブロックの**外側**に、ファイル末尾の独立した非公開関数として置く (\`&self\` を取らず、struct 状態にも依存しない単なる byte → string 変換ユーティリティだから)。\`impl\` ブロック内に書いてしまうと「method の追加」になり、trait 定義側 (\`ConsensusBridge\`) にもこの形が必要だと誤解させてしまう。

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

最初の 8 byte を 0x prefix 付きの hex 文字列にする — ログ 1 行に収まる短さだ。\`write!(&mut s, ...)\` 呼び出しには file 先頭の \`use std::fmt::Write as _;\` が必要 (Step 3 で追加済み)。\`as _\` rename は trait を *method 用に* import しつつ、\`Write\` という名前で namespace を汚染しない。

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

\`pub mod in_memory;\` で module を expose する。\`pub use in_memory::InMemoryEvmBridge;\` で struct を crate root に re-export し、downstream crate が \`use openhl_evm::InMemoryEvmBridge;\` と書けるようにする (\`use openhl_evm::in_memory::InMemoryEvmBridge;\` ではなく)。

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

\`#[tokio::test]\` は \`#[test]\` の async 対応版だ。test 用に tokio runtime をセットアップし、async 本体を await する。

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

よくあるエラーと対処:

- **\`Mutex<HashMap<u64, ExecutedBlock>>\` が \`Default\` を auto-derive しない。** 実際にはする — \`Mutex<T>\` も \`HashMap<K, V>\` も \`Default\` を derive する。これが出るなら、別の Default なしの type (例えば \`BTreeMap\` 以外) を書いたかもしれない。\`HashMap\` に戻す。
- **\`use std::fmt::Write as _;\` が実際は使われていない、と clippy が warning する。** \`Write\` trait は \`hex_short\` 内で \`write!\` macro 経由で使われている。warning は macro 展開が import を見ていない可能性を示す。\`use\` が module 先頭 (関数内ではない) にあるか確認する。
- **\`#[tokio::test]\` not found** — \`tokio\` が \`[dev-dependencies]\` に無い。Step 1 を再確認。
- **\`block.number == 1\` を assert するテストで \`0\` が返る。** \`let number = parent_number + 1;\` の \`+ 1\` を書き忘れている。

## 設計を振り返る

このレッスンで encode した本質的な決定が 2 つ:

1. **State は \`Mutex<State>\` の裏に置く。** これが \`InMemoryEvmBridge\` を thread-safe にし、\`Send + Sync\` を満たさせる。代替 (lock-free、atomic-only mutation) は test double としては遥かに複雑だ。Lock は contention が低い (test code) か critical section が短い (real code) なら問題ない。このパターンは レッスン 11+ の \`LiveRethEvmBridge\` にも伝播する — 同じ \`Mutex<State>\` の形をしている。

2. **\`pending\` と \`chain\` を別の map にする。** Real EL でも同じ split がある — 現在 build 中の payload と、canonical chain に commit された block。Test double にこれを encode することで、**データフローの形** が production impl に carry over する。1 つの combined map にすると「build = commit」を含意してしまうが、これは違う。Build は speculative、commit が final だ。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 3b43586
diff -u ~/code/my-openhl/crates/evm/src/in_memory.rs ./crates/evm/src/in_memory.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
\`\`\`

テスト順、doc-comment の言い回し、exact な debug message format は違っていて OK。struct の形、\`Mutex<State>\` パターン、4 つの method impl のロジックはほぼ一致するはず。

main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`commit_advances_head_and_records_block\` が "mutex poisoned" で panic する。**
まず最初の panic 行を確認する。  
このコースのテストは \`InMemoryEvmBridge::new()\` を各テストで作るため、テスト間で \`Mutex<State>\` を共有しない。原因の多くは「同じテスト内で lock 保持中に先に panic し、その後もう一度 lock を取りに行く」パターンだ。

確認手順:
1. \`cargo test\` 出力の先頭にある最初の \`thread 'tests::...' panicked at ...\` を特定する。  
2. その panic を直してから poison エラーの再現を確認する。  
3. 並列実行の切り分けが必要なときだけ \`cargo test -p openhl-evm -- --test-threads=1\` を使う。  

**Q: \`pending\` を \`HashMap<u64, _>\` ではなく \`HashMap<PayloadId, _>\` にすべき?**
どちらでも動く。openhl の convention は、storage layer で内側の type (\`u64\`) を使い、lookup 内での wrap/unwrap を避けることだ。Public API では依然 \`PayloadId\` を使う。trade-off は次のとおり: \`HashMap<PayloadId, _>\` で type safety を得る代わりに、lookup ごとに \`.0\` accessor が必要になる。\`HashMap<u64, _>\` なら storage layer の type safety は諦めるが、noise は避けられる。好みの問題で、こちらは \`u64\` を選んだ。

**Q: \`hex_short\` はなぜ最初の 8 byte だけで、全部ではないのか?**
ログを短く保つ必要があるからだ。Full 32-byte hex は 64 文字 — ログ行を食う。最初の 8 byte (16 hex 文字 + "0x") で、dev/test シナリオでは block を identify するのに十分。Production ログでは full hash を使えばよい。ヘルパーを差し替える。

**Q: テストは pass するが \`unused_imports\` で clippy warning が出る。**
import が実際にコード中で使われているか確認する。Boilerplate に \`std::fmt::Write as _\` がある — \`hex_short\` 内でだけ使われる。\`hex_short\` を書いていなければ unused になる。ヘルパーを追加するか、import を消す。

## 次のレッスン (レッスン 5)

動作する \`ConsensusBridge\` impl は手元にあるが、Reth はまだ一切使っていない。レッスン 5 で次の impl を書く: \`RethEvmBridge\`。同じ trait だが、\`ExecutedBlock\` は 実際の \`alloy_consensus::Header\` から build され (合成ではなく)、\`BlockHash\` は Reth の \`Header::hash_slow\` で hash された 実際の \`B256\` になる。State はまだ in-memory (live Reth provider なし) だが、**型は real だ。** これが toy 型 (レッスン 4) と live 統合 (レッスン 11+) を橋渡しする。`,
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

このレッスンで掴む概念:

- **Contract surface の裏側に置く production grade な内部型。** 内部では \`(B256, Header)\` を保存しつつ、trait は \`ExecutedBlock\` を返す。変換は trait 境界でだけ行うので、alloy が進化しても contract は壊れない。レッスン 12 以降の \`LiveRethEvmBridge\` はまさにこれを再利用する。
- **\`Header::hash_slow()\` による実際の RLP hashing。** \`hash_slow\` という名前の意味 (毎回再計算、cache なし)、RLP encoding がバイトレベルで何をしているか、Ethereum node が計算するのと同じ hash になることを alloy がどう強制するか。
- **タプルで保持することで hash と header を不可分にする。** \`(B256, Header)\` を 1 つの単位として保存する理由。別フィールドに分けると header の変更で cache 済み hash と desync するバグを招く。
- **1 つの trait に対する 2 つの impl。** \`InMemoryEvmBridge\` と \`RethEvmBridge\` は trait surface を共有し、fidelity (型の本物度合い) だけが違う。trait が正しければ Rust が自動的にくれる多相性で、レッスン 12 ではこの形がそのまま 3 つ目の impl に広がる。

検証:

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

上記の実行結果が **9 つのテスト** (レッスン 4 の \`InMemoryEvmBridge\` の 5 つ + 新規 4 つ) で pass する。**自分のコードが alloy / Reth 型に初めて触れるレッスン** だ。「テスト用は合成、production grade は本物の型」というパターンはコース全体を通して繰り返される。ここできれいに身につけておくと レッスン 11 以降で時間を節約できる。

具体的な変更:

- \`crates/evm/Cargo.toml\` に alloy 依存を 2 つ追加: \`alloy-primitives\` (\`B256\`、\`Address\` 用) と \`alloy-consensus\` (\`Header\` 用)。
- \`crates/evm/src/engine.rs\` — 新規ファイル、\`RethEvmBridge\` struct、\`Header\` を保存する private \`State\`、4 method を持つ \`impl ConsensusBridge for RethEvmBridge\` + 4 つの unit test。
- 3 つの小さな変換 helper — \`to_b256\`、\`from_b256\`、\`to_executed_block\` — が alloy 型と contract 型を trait 境界でだけ橋渡しする。
- \`crates/evm/src/lib.rs\` — \`pub mod engine; pub use engine::RethEvmBridge;\` を組み込む。

## おさらい

レッスン 4 を終えた時点:

\`\`\`
crates/evm/src/in_memory.rs — InMemoryEvmBridge (合成 block、5 テスト pass)
crates/evm/src/lib.rs       — pub mod in_memory; pub use InMemoryEvmBridge;
crates/evm/Cargo.toml       — 3 deps (openhl-consensus、openhl-types、async-trait)、tokio dev-dep
\`\`\`

\`cargo test -p openhl-evm\` が 5/5 pass。

## 計画

6 つのことをする:

1. **\`crates/evm/Cargo.toml\` に alloy 依存を 2 つ追加する**: \`alloy-primitives\` (\`B256\`、\`Address\` 用) と \`alloy-consensus\` (\`Header\` 用)。レッスン 1 ですでに workspace deps に pin 済みだ。
2. **\`crates/evm/src/engine.rs\` を作成する** — \`RethEvmBridge\` struct、private な \`State\` struct (合成した \`ExecutedBlock\` ではなく \`Header\` を保存する)、\`impl ConsensusBridge for RethEvmBridge\` block。
3. **型変換ヘルパーを 3 つ** (\`to_b256\`、\`from_b256\`、\`to_executed_block\`) — trait の \`BlockHash\` と内部の \`B256\` + \`Header\` を橋渡しする。
4. **Unit test を 4 つ** — うち 1 つは「real hashing が動く」を証明する (header のフィールドを変えると hash が変わる)。
5. **\`engine\` を crate に組み込む** — \`lib.rs\` に \`pub mod engine;\` と re-export を追加。
6. **\`cargo test -p openhl-evm\` を実行** — 9 つのテストすべてが pass する。

鍵となる step は #2 — **内部 state の形が変わる。** レッスン 4 は \`ExecutedBlock\` を直接保存していた。レッスン 5 は \`(B256, Header)\` を保存する: alloy-native な型で、\`ExecutedBlock\` への変換は trait boundary でだけ行う。**alloy 型が source of truth で、\`ExecutedBlock\` は contract の serialization に過ぎない。** この分離が レッスン 11+ で拡張される — \`LiveRethEvmBridge\` は同じ「内部 vs 境界」split を保ったまま、その後ろに 実際の Reth provider を追加する。

> 🛑 **考えてみよう。** レッスン 4 の \`InMemoryEvmBridge\` は hash を \`(id, number)\` から合成していた。レッスン 5 の \`RethEvmBridge\` は \`header.hash_slow()\` を呼ぶ — 本物の RLP encoding + Keccak-256 だ。**この違いによって testable になる挙動は何か?** ヒント: header の 1 フィールドを変えたとき hash がどうなるかを考えよ。

## 手を動かす walk-through

### Step 1: \`crates/evm/Cargo.toml\` に alloy 依存を追加

\`crates/evm/Cargo.toml\` を開く。レッスン 4 時点の \`[dependencies]\`:

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

両方とも \`workspace.dependencies\` から継承する (レッスン 1 でセットアップ済み)。\`alloy-primitives\` が \`B256\` (32-byte hash の newtype) と \`Address\` (20-byte address の newtype) を提供する。\`alloy-consensus\` が \`Header\` (Ethereum block header struct、全フィールド入り) を提供する。

実行:

\`\`\`bash
cargo check -p openhl-evm
\`\`\`

pass するはず — 依存は available になっているが、まだ何も使っていない。

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
//! The live-node bootstrap lands in later lessons (レッスン 10〜13); the type
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

レッスン 4 と比べて新しい import:

- \`alloy_consensus::Header\` — Ethereum の canonical な block header struct (~20 フィールド: parent_hash、number、timestamp、beneficiary、gas_limit、base_fee、state_root など)
- \`alloy_primitives::{Address, B256}\` — address 型 (20 byte) と hash 型 (32 byte)。どちらも byte 配列の newtype で、レッスン 2 の \`BlockHash\` と同じ形をしている — ただし alloy 側から来ており、Ethereum Rust エコシステム全体の convention になっている。

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

レッスン 4 の \`InMemoryEvmBridge\` と同じ shape だが、**\`State\` 内の型が違う**:

| フィールド | レッスン 4 (InMemory) | レッスン 5 (Reth) |
| - | - | - |
| \`pending\` | \`HashMap<u64, ExecutedBlock>\` | \`HashMap<u64, (B256, Header)>\` |
| \`chain\` | \`HashMap<[u8; 32], ExecutedBlock>\` | \`HashMap<B256, Header>\` |
| \`head\` | \`Option<BlockHash>\` | \`Option<B256>\` |

**なぜ \`Header\` 単体ではなく \`(B256, Header)\` を保存するのか?** \`Header::hash_slow()\` が expensive だからだ — header 全体を RLP encode して Keccak-256 を走らせる。Insert 時に 1 度 hash を計算してタプルに cache しておけば、\`pending.get(id)\` で再 hashing なしに両方を返せる。Hash は \`chain\` の lookup key (および \`commit\` の lookup criterion) にもなるので、用意しておきたい。

**なぜ \`chain\` の key と \`head\` に \`[u8; 32]\` ではなく \`B256\` を使うのか?** alloy-native な空間にいるからだ — \`Header\` を持っている時点で自然な hash 型は \`B256\` になる。\`[u8; 32]\` を使うとあちこちで \`.0\` accessor が必要になる。\`BlockHash\` への変換は trait boundary を越えるときだけ、ヘルパー関数で行う (Step 6)。

レッスン 5 の核は「外側に見せる contract 型」と「内側に持つ alloy 型」の二重構造だ。この境界がどう走っているかを 1 枚で見ると、Step 6 で書く変換ヘルパー (\`to_b256\` / \`from_b256\` / \`to_executed_block\`) が果たす役割と、なぜ \`State\` 内の型だけ刷新できるのかが直感で押さえられる:

\`\`\`
【 RethEvmBridge における型境界のレイアウト 】

   [ 外側: CL (consensus 層) の空間 ]
   ──────────────────────────────────────────────────────────────────────────
       openhl-types / contract primitives (このコースで自前定義した型):
         BlockHash       PayloadId        ExecutedBlock
   ──────────────────────────────────────────────────────────────────────────
                                  ▲    │
                                  │    ▼
                  trait boundary 上だけで変換 (Step 6 のヘルパー):
                      to_b256 / from_b256 / to_executed_block
                                  ▲    │
                                  │    ▼
   ──────────────────────────────────────────────────────────────────────────
       alloy-primitives / alloy-consensus (Ethereum エコシステム標準):
         B256             u64              Header
   ──────────────────────────────────────────────────────────────────────────
   [ 内側: EL (実行層) / RethEvmBridge の本体空間 ]
   ※ State の中身は本物の (B256, Header) タプル — タプルに hash を抱き込ませることで
      Header と hash が常に同期する。Header だけ変えて hash 更新を忘れる事故を型で塞ぐ。
\`\`\`

ポイントは 2 つ: (a) **contract 型 (\`BlockHash\` 等) は 4 つの trait method のシグネチャと戻り値にしか登場しない** — \`impl\` 内部はすべて alloy 型で書ける。(b) **alloy が source of truth、\`ExecutedBlock\` は trait boundary 用の serialization** にすぎない。だから alloy がバージョンを上げて \`Header\` の形が変わっても、変換ヘルパー 3 つを直すだけで CL 側からは一切見えない。レッスン 11+ の \`LiveRethEvmBridge\` でも State の中身が live provider に変わるだけで、この境界線そのものは動かない。

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

順を追って見ていく:

1. **\`to_b256(parent)\`** — trait の \`BlockHash\` を alloy の \`B256\` に変換する (どちらも 32 byte、byte 単位の reinterpretation のみ)。ヘルパーは Step 6 で書く。
2. **Parent number を \`chain\` から lookup** — key は今や \`B256\` であって \`[u8; 32]\` ではない。Map の lookup 型が \`B256\` なので、\`&parent_hash\` (a \`&B256\`) をそのまま渡せばよい。unwrap は要らない。
3. **Payload ID を割り当てる** — レッスン 4 と同じ。
4. **\`Header\` を build する** — 設定するフィールド以外はデフォルト:
   - \`parent_hash\` — trait input の alloy \`B256\`
   - \`number\` — parent + 1
   - \`timestamp\` — \`PayloadAttrs\` から
   - \`beneficiary: Address::from(attrs.fee_recipient)\` — \`[u8; 20]\` を alloy の \`Address\` newtype に変換
   - \`mix_hash: B256::from(attrs.prev_randao)\` — \`[u8; 32]\` を \`B256\` に変換
   - \`..Default::default()\` — 残りの全フィールドを zero/default で埋める (state_root、gas_limit など)
5. **\`header.hash_slow()\`** — **本物の hash 計算**。\`Header\` 全体 (defaulted フィールド込みで約 20 個) を RLP encode し、Keccak-256 を走らせて \`B256\` を 生成する。"slow" は convention の名前 — \`hash_fast\` は header struct に hash が pre-cache されている場合に存在するが、ここでは該当しない。
6. **\`(hash, header)\` を payload ID を key に pending に insert** し、ID を return する。

**この block hash は real だ。** header のどのフィールドであれ、call 間で 1 byte でも変われば、結果の hash は異なる。レッスン 4 の合成 hash にはこの性質がなかった。レッスン 5 の hash にはある。Step 9 のテストでこれを証明する。

> 🛑 **やりがちな勘違い。** 「\`hash\` を \`header\` とは別に保存した方がきれい — タプルではなく。」 **やろうと思えばできる、\`State\` のフィールドが 1 つ増えるだけだ。だが、タプルは「この hash はちょうどこの header の hash だ」という関係を捉える。** 別々に持つと、header を変更したのに hash の recompute を忘れるというバグを招く。タプルにすれば両者が不可分になる。

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
        // Real validation requires a live Reth provider + EVM (lessons レッスン 11+).
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

**\`validate_payload\`** はまだ stub だ。Live Reth provider に対する real validation は レッスン 12 で land する。今は structural に accept しておく。

**\`commit\`** は レッスン 4 と同じ流れだが、型が置き換わっている:
- \`to_b256(block_hash)\` で trait の \`BlockHash\` を \`B256\` に変換
- \`pending.values()\` の中で hash が一致するタプルを探す
- header を \`chain\` に insert (key は \`B256\`)
- \`head\` を更新

closure パターン \`find(|(h, _)| *h == hash)\` に注目 — タプルを destructure して 1 番目の要素を比較する。\`*h\` は \`&B256\` を deref して \`B256\` にし、\`hash\` (こちらも \`B256\`) と比較できるようにする。**\`B256\` は \`Copy\` を実装している**ので、\`*h\` でデリファレンスしても値の memcpy が走るだけで、\`pending\` から所有権が move されることはない — \`B256\` を持つフィールドへの安全なアクセスパターンとして覚えておくとよい。

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
- **\`to_executed_block\`** — 内部の \`(B256, Header)\` から trait の \`ExecutedBlock\` を materialize する。header からフィールド (\`parent_hash\`、\`number\`) を引いて、cache した hash を使う。

**なぜ 1 つの大きな変換関数ではなく 3 つに分けるのか?** 各々が 1 つのことだけをするからだ。\`to_b256\` と \`from_b256\` は pure な型変換 (ロジックなし)。\`to_executed_block\` は \`Header\` のどのフィールドが \`ExecutedBlock\` のどのフィールドに mapping するかを知っている。分けておけば、各ヘルパーが明らかに正しい形になる。

> 🛑 **やりがちな勘違い。** 「\`B256\` も \`BlockHash\` も \`[u8; 32]\` を wrap している。\`transmute\` で変換できないか?」 **やめてくれ。** Byte layout は同一だが、型システム上は別物 — それが point だ。変換関数が境界の場所を document する。将来 \`BlockHash\` が追加の metadata (例: checksum) を持つようになったら、\`transmute\` はバグになる。一方 \`to_b256\` は更新すべき場所として残る。

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

\`pub mod engine;\` で module を expose する。\`pub use engine::RethEvmBridge;\` で型を crate root に re-export する。

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
| \`build_then_ready_returns_alloy_hashed_block\` | Real hashing — 同じ \`parent\` でも \`timestamp\` を変えると \`hash\` が変わる。レッスン 4 が書けなかったテスト (合成 hash は timestamp を区別しなかった)。 |
| \`commit_advances_head\` | Commit 後、head が新ブロック (内部表現で \`B256\`) を指す。 |
| \`build_on_committed_parent_increments_number\` | Number 単調性、レッスン 4 と同じ。 |
| \`commit_unknown_hash_errors\` | 未知 hash の commit は \`BridgeError::Rejected\` を返す。 |

**鍵となる新テストは最初のものだ。** \`Header\` の 1 フィールド (\`timestamp\`) を変えて、結果の hash が異なることを assert する。これが hashing が real であることを証明する — alloy が実際に RLP encode + Keccak-256 をしている。レッスン 4 の \`(id, number)\` ベースの合成 hash はこのテストには通らなかった (same parent + same number → same synthesized hash、timestamp は無視される)。

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

レッスン 5 の 4 テストが レッスン 4 の 5 テストと並んで pass する — **両 impl が同じ trait を満たしている。** レッスン 8/レッスン 9 で書く同じ \`ConsensusBridge\` consumer コードが、どちらに対しても動く。

よくあるエラーと対処:

- **\`Header::hash_slow()\` の return type 違い** — \`let hash: BlockHash = header.hash_slow();\` と書くと落ちる。\`hash_slow()\` は \`B256\` を返す。\`from_b256\` で変換する。
- **\`assert_ne!(block.hash, block2.hash)\` が落ちる** — \`..Default::default()\` まわりの問題かもしれない。\`Header\` を \`..Default::default()\` で終えているか? それが無いと、all-zeros + same-timestamp で hash が等しくなる可能性がある。
- **\`B256::from(attrs.fee_recipient)\` がエラー** — \`fee_recipient\` は \`[u8; 20]\`、\`B256\` は \`[u8; 32]\`。正しい変換は \`Address::from(attrs.fee_recipient)\` だ。

## 設計を振り返る

このレッスンで encode した本質的な決定が 3 つ:

1. **内部型は alloy-native、trait 型は contract の serialization。** State は \`(B256, Header)\` を保存する。Trait は \`ExecutedBlock\` を返す。変換は trait boundary でだけ起こる (\`to_executed_block\`)。これにより alloy が型を進化させても trait は壊れず、変換ヘルパーだけを更新すればよくなる。**production grade な内部型を contract から decouple したことが、レッスン 11 以降で \`LiveRethEvmBridge\` が同じ trait を再利用できる理由だ。**

2. **別フィールドではなく \`(B256, Header)\` のタプルで保持する。** hash は *ちょうどこの header の hash* だ。別々に保存すると、header の変更で cache hash が desync するバグを招く。タプルが両者を不可分にする。

3. **1 つの大きな関数ではなく、小さな変換ヘルパー 3 つに分ける。** \`to_b256\` と \`from_b256\` は pure な型橋渡しで、\`to_executed_block\` がフィールド mapping を知る。分けておけば、各ヘルパーが明らかに正しい形になり、将来の変更も局所化する。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout c938321
diff -u ~/code/my-openhl/crates/evm/src/engine.rs ./crates/evm/src/engine.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
\`\`\`

doc comment や error message の variation は OK。struct 型、helper signature、4 つの method impl のロジックはほぼ一致するはず。

リファレンスの \`c938321\` 時点の Cargo.toml には \`reth-ethereum-primitives\` も列挙されている (\`engine.rs\` 内では使われない)。後のレッスン用に forward-declared された dep だ。レッスン 5 では省略する。どちらも正しい。

main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: 同じロジックなのに、なぜ bridge impl が *2 つ* (InMemoryEvmBridge と RethEvmBridge) 必要なのか?**
ロジックは同じだが **型が違う**。\`InMemoryEvmBridge\` は合成型 (高速 unit test 用)。\`RethEvmBridge\` は alloy 型 (alloy interop を validate するテスト用)。後の \`LiveRethEvmBridge\` は alloy 型 と live Reth provider の両方を使う。Step ごとに production fidelity が上がりつつ、trait surface は安定したままだ。

**Q: \`Header\` は約 20 フィールドあるのに、なぜ 4 つしか set しないのか?**
未設定フィールドは \`Default::default()\` で埋まる: \`state_root = B256::ZERO\`、\`gas_limit = 0\`、\`base_fee_per_gas = None\` など。v0 では EVM が走っていないので 実際の \`state_root\` は計算できない。zero を受け入れる。Production コード (レッスン 11+) ではこれらを live Reth provider から計算する。

**Q: alloy の \`hash_slow\` と \`hash_fast\` の違いは?**
\`Header\` に \`hash_fast\` メソッドは無い。命名 convention は次のとおりだ: 値を再計算するメソッドは "slow"、pre-cache された値を返すメソッドは "fast"。\`Header\` には pre-cache された hash が無いので \`hash_slow\` のみ。alloy の一部の型 (例: \`SealedHeader\`) は hash を持ち、\`.hash()\` を "fast" 版として提供する。

**Q: \`cargo update\` で最新の alloy を取るべきか?**
不要 — workspace が alloy を specific バージョンに pin している (\`alloy-primitives = "1.5"\`、\`alloy-consensus = "2.0"\`)。\`cargo update\` はそれらが解決可能かを verify するだけで、bump はしない。alloy を bump するには、root \`Cargo.toml\` の \`workspace.dependencies\` を編集し、そのあと \`cargo update\` で lock file を refresh する。

## 次のレッスン (レッスン 6)

\`ConsensusBridge\` impl を 2 つ書いた — 合成版と real alloy 型版。両方とも consensus 側の test コードから使える（レッスン 8 から書き始める）。

次は レッスン 6 で consensus 側に進む。実装するのは Malachite の \`Context\` trait だ。  
これは「Malachite を使うチェーンが満たすべき型レベル API surface」で、Associated type 10 個と factory method 4 個を持つ。

レッスン 6 を終えると、自分の chain は「\`Address\` 型は何か」「\`Height\` 型は何か」「\`Value\` 型は何か」を Malachite に答えられるようになる。これが contract の**もう半分**だ。

ここが重要な対比になる:
1. レッスン 3 の \`ConsensusBridge\` は openhl 側が**所有する trait**。  
2. レッスン 6 の \`Context\` は Malachite 側が**所有する trait**。

自分で定義した契約に impl を書くのと、外部ライブラリが定義した契約に自分の型をはめるのとでは、設計の力学が逆向きになる。次レッスンはその違いを体で覚える回だ。`,
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

このレッスンで掴む概念:

- **両側の trait contract。** レッスン 3 の \`ConsensusBridge\` は *自分が所有* し execution が実装する trait だった。Malachite の \`Context\` は *Malachite が所有* し自分が実装する trait だ。インターフェイスの両方向が型レベルでそろう。
- **Context associated-type パターン。** 単一の \`OpenHlContext;\` 空 struct が 10 個の sub-type (\`Address\`、\`Height\`、\`Value\`、\`Validator\`、\`Vote\`、…) に名前を付ける仕組み。state を一切持たない type-family idiom が、Malachite を chain-generic にしている。
- **型システムが強制する不変条件。** \`OpenHlValidatorSet::new()\` が構築時に sort することで、「未 sort な set」が表現不能になる。下流の method はすべて sort 済みを前提にしてよい。compiler が見張ってくれる。
- **決定的な proposer 選択。** stake で sort 済みの set に対する \`(height + round) % count\`。全 validator が同一に検証できる最も単純な決定的アルゴリズム。洗練 (random beacon、rotation rule) は同じ trait surface の裏に隠せる。
- **signing key の \`PartialOrd / Ord\`。** Malachite 内部のコレクションのために \`OpenHlValidator\` が total order を持つ必要がある理由、Ed25519 公開鍵がその ordering を無料で与えてくれる仕組み。

検証:

\`\`\`bash
# レッスン 6 で書いた 5 テストだけに集中したいとき (他 crate の noise を排除):
cargo test -p openhl-consensus context::tests

# crate 全体を走らせる:
cargo test -p openhl-consensus
\`\`\`

上記の実行結果が **5 つのテスト** で pass する: validator-set のソート順、決定的な proposer 選択、proposal のフィールド round-trip、vote-type の区別 (prevote vs precommit)、height の算術。Chain が Malachite の \`Context\` trait を満たす状態になる — これは Malachite がブロックの上で consensus を駆動するために必要な、型レベルの API surface だ。

これは **コースで最も長いレッスン** だ — 新規ファイル 8 個、約 330 行。各ファイルは小さいが数が多い。必要なら 2 回に分けるつもりで進めてよい。

具体的な変更:

- \`crates/consensus/Cargo.toml\` に Malachite 依存 2 つ + dev-dep 1 つ追加: \`informalsystems-malachitebft-core-types\`、\`informalsystems-malachitebft-signing-ed25519\`、\`rand\` (dev)。
- \`crates/consensus/src/types/\` — 7 つの type ファイル (\`address.rs\`、\`height.rs\`、\`value.rs\`、\`validator.rs\`、\`proposal.rs\`、\`proposal_part.rs\`、\`vote.rs\`) と \`mod.rs\`。
- \`crates/consensus/src/context.rs\` — \`OpenHlContext\` 空 struct と \`impl Context for OpenHlContext\` (4 つの factory method)。
- \`crates/consensus/src/lib.rs\` — \`pub mod context; pub mod types;\` を組み込む。

## おさらい

レッスン 5 を終えた時点で、workspace には \`ConsensusBridge\` impl が両方そろっているが、consensus crate 自体には レッスン 3 の trait しかない。Malachite 統合はまだだ:

\`\`\`
crates/consensus/src/lib.rs:
  pub mod bridge;
crates/consensus/Cargo.toml:
  [dependencies]
  openhl-types, async-trait, thiserror, eyre
\`\`\`

ここに Malachite を組み込んでいく。

## 計画

以下の順で build する:

1. **Cargo.toml の更新** — Malachite の依存 2 つ (\`-core-types\` (trait 用)、\`-signing-ed25519\` (暗号用))、dev-dep として \`rand 0.8\` (テストでの keypair 生成用)。
2. **\`crates/consensus/src/types/\` ディレクトリ** に \`mod.rs\` (module index) と 7 つの type ファイルを置く:
   - \`address.rs\` — \`OpenHlAddress([u8; 20])\`
   - \`height.rs\` — 単調増加の算術付きの \`OpenHlHeight(u64)\`
   - \`value.rs\` — \`OpenHlValue(BlockHash)\` — consensus が合意する対象
   - \`validator.rs\` — \`OpenHlValidator\` + \`OpenHlValidatorSet\` (**canonical なソート順** 付き)
   - \`proposal.rs\` — \`OpenHlProposal\` — ブロック提案メッセージ
   - \`proposal_part.rs\` — \`OpenHlProposalPart\` (unit struct — stream しない)
   - \`vote.rs\` — \`OpenHlVote\` — prevote または precommit
3. **\`crates/consensus/src/context.rs\`** — \`OpenHlContext\` impl と、10 の type association に加えて **proposer-election アルゴリズム** を含む 4 つの factory method。
4. **\`crates/consensus/src/lib.rs\`** — \`pub mod types; pub mod context; pub use context::OpenHlContext;\` で組み込む。
5. **\`context.rs\` 内に unit test を 5 つ追加する。**
6. **\`cargo test -p openhl-consensus\` を実行** — 5 つすべてが pass する。

ここで決める型の shape は **すべての後続レッスンに伝播する**。レッスン 7 (SigningProvider) が \`OpenHlVote\` と \`OpenHlProposal\` に署名する。レッスン 8 (Codec) がそれらを encode する。レッスン 9 (run_engine_app) が \`OpenHlContext\` で parameterize された AppMsg を処理する。**ここで encode する設計判断は、以降の 8 レッスンすべてに伝播する。**

> 🛑 **考えてみよう。** 上の型リストを見る。10 個のうち、特に注目すべき型が 2 つある — load-bearing な決定を encode しているからだ:
> - \`OpenHlValidatorSet\` の **specific なソート順** — 全 validator が同じソートに合意する必要がある
> - \`OpenHlContext::select_proposer\` の **specific なアルゴリズム**
>
> **なぜこの 2 つは validator 間で一致しなければならないのか?** ヒント: 同じ (height, round) で validator が違う proposer を選んだら、chain はどうなるか?

本レッスンで触る \`crates/consensus/src/\` 配下の最終的なファイル構造はこうなる。8 個の新規ファイルがどの step で生まれるか、\`types/\` サブディレクトリにどう並ぶかを 1 枚で押さえておくと、step を進めながら現在地を見失わずに済む:

\`\`\`
crates/consensus/src/
├── lib.rs               (Step 7: 全モジュールを束ねる)
├── bridge.rs            (レッスン 3 で書いた ConsensusBridge trait、変更なし)
├── context.rs           (Step 6: OpenHlContext + 4 factory + テスト) ★中央
└── types/               (Step 2: ディレクトリ + mod.rs を作成)
    ├── mod.rs           (Step 2: サブモジュールの index / re-export)
    ├── address.rs       (Step 3: 20-byte validator アドレス)
    ├── height.rs        (Step 3: モノトニックな u64 height カウンタ)
    ├── value.rs         (Step 3: BlockHash の薄いラッパー)
    ├── validator.rs     (Step 4: バリデータ + canonical ソート済み set) ★最重要
    ├── proposal.rs      (Step 5: Proposal メッセージ)
    ├── proposal_part.rs (Step 5: dummy ProposalPart、v0 は full-block)
    └── vote.rs          (Step 5: Vote メッセージ、prevote/precommit)
\`\`\`

「8 つの新規ファイル」と聞くと多く感じるが、実態は **types/ 配下が 8 個 (\`mod.rs\` + 7 つの型ファイル) + 1 個 (\`context.rs\`) = 9 個**、しかも各ファイルが 1 つの設計判断を 1 個ずつ抱えているため、独立してレビュー・テスト可能になっている。**Step 3 (シンプル 3 型) → Step 4 (難関: validator) → Step 5 (3 メッセージ型) → Step 6 (中央 binding)** という順序は、依存方向に沿った最短経路だ。

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

- **\`informalsystems-malachitebft-core-types\`** — \`Context\` trait と 10 個の sub-trait (\`Address\`、\`Height\`、\`Value\`、\`Validator\`、\`ValidatorSet\`、\`Proposal\`、\`ProposalPart\`、\`Vote\`、\`Extension\`、\`SigningScheme\`) を定義する。これから impl する API surface だ。
- **\`informalsystems-malachitebft-signing-ed25519\`** に \`features = ["rand"]\` — Malachite の Ed25519 実装。\`rand\` feature を有効にすると \`PrivateKey::generate(OsRng)\` がテストで使えるようになる (そうしないと事前構築の keypair を供給する必要がある)。
- **\`rand 0.8\` (dev-dep)** — test code 内の \`OsRng\` 用。

依存解決を確認:

\`\`\`bash
cargo check -p openhl-consensus
\`\`\`

この更新後の初回 check で Malachite が fetch される。数分かかる。

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

module index だ。\`pub mod X;\` の行がサブモジュール (ファイル \`types/X.rs\`) を宣言する。\`pub use\` で主要な型を re-export しておけば、呼び出し側は \`crate::types::OpenHlAddress\` (not \`crate::types::address::OpenHlAddress\`) と書ける。

**なぜ 1 つの大きな \`types.rs\` ではなく、型 1 つにつき 1 ファイルにするのか?** 各型の impl は短い (10-40 行) が、設計判断は型ごとに distinct だからだ。型ごとにファイルを分ければ、レッスン (本レッスン) は 1 型ずつ walk でき、code review も 1 型の変更に集中できる (関係ないコードをスクロールしなくて済む)。

### Step 3: 3 つの「シンプル」型を書く — \`address.rs\`、\`height.rs\`、\`value.rs\`

各 ~20 行。順に見ていく。

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

パターンに注目: \`[u8; 20]\` の newtype、標準的な derive 一通り、ログ用の hex Display、それから **空の \`impl Address\`**。\`Address\` trait はメソッドを持たない — 必要な derive を *要求する* だけだ。\`Clone + Copy + Debug + Display + PartialEq + Eq + PartialOrd + Ord + Hash\` を満たすことで impl が成立する。

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

定数 3 つ + メソッド 3 つ。\`ZERO\` は絶対的なゼロ。\`INITIAL\` は最初の有効な block height で、0 ではなく 1 だ (genesis は block 0 だが、consensus が "produce" するものではないので、consensus round は 1 から始まる)。\`increment_by\` は overflow panic を避けるため \`saturating_add\` を使う。\`decrement_by\` は 0 を下回るのが invalid なので \`Option\` を返す。\`checked_sub\` は panic ではなく \`None\` を返す。

**\`crates/consensus/src/types/value.rs\`:**

\`\`\`rust
use informalsystems_malachitebft_core_types::Value;
use openhl_types::BlockHash;

/// The value consensus agrees on: an EVM block, identified by its block hash.
///
/// For v0 we store only the hash since the EVM bridge is the source of truth
/// for block contents. ステップ 2 will extend this to carry the full block once
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

\`OpenHlValue\` は レッスン 2 の \`BlockHash\` をラップする。\`Value::Id\` associated type は vote に乗るもの — consensus は full value に投票せず、value の *identifier* (hash) に投票する。ここでは \`Id = BlockHash\` なので、value と ID が同じデータになっている。

> 🛑 **やりがちな勘違い。** 「\`Value\` を直接 \`BlockHash\` にすればいいのでは — なぜラップする?」 **\`Value\` trait に独自の bound があるからだ。** 具体的には \`Value: Clone + Debug + Eq + Ord + Send + Sync\` と \`Value::Id\` associated type の bound。\`OpenHlValue\` をラッパーにしておけば、\`BlockHash\` を変えずに「value とは何か」を独立に進化させられる。ステップ 2 (CLOB) で、\`BlockHash\` には無いフィールド (例: off-EVM な約定 (fill) のリスト) を足す可能性が高い。

3 つ書いたら \`cargo check -p openhl-consensus\` を走らせる。pass するはずだ。

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

**このレッスンで最も load-bearing なファイルだ。**

\`OpenHlValidator\` は素直だ: address + public_key + voting_power を、\`Validator\` trait の 3 つの accessor で expose する。興味深い仕事は \`OpenHlValidatorSet::new\` の側にある:

\`\`\`rust
validators.sort_by(|a, b| {
    b.voting_power.cmp(&a.voting_power)         // 主: power 降順
        .then_with(|| a.address.cmp(&b.address)) // tiebreak: address 昇順
});
\`\`\`

ここで 2 つの保証が重なる。\`Vec::sort_by\` 自体は stable sort なので、比較結果が \`Equal\` の要素同士は元の相対順序を保つ。一方でこの comparator は \`then_with(|| a.address.cmp(&b.address))\` まで含めて **total ordering** を与えるため、実際には \`Equal\` が残らず、入力順に依存しない一意な並びに収束する。つまり「stable sort の性質」+「完全なタイブレイカー」の組み合わせで、validator-set の順序は決定的になる。

これが **canonical な CometBFT validator-set ソート順** だ: voting power 降順、tiebreaker は address 昇順。**全 validator がこの同じソートを同じ入力 set に適用する必要がある。** なぜか?

\`OpenHlContext::select_proposer\` (Step 6 で書く) が \`validator_set.get_by_index((height + round) % count)\` をするからだ。Validator A がある順にソートし、validator B が違う順にソートすると、同じ \`(height, round)\` に対して別の proposer を選ぶ。**最初の round で chain が fork する。** ソート順 *が* proposer-election protocol そのものだ。

他の BFT chain (CometBFT、すべての Cosmos chain) も全く同じソートを使う。convention に従うのは便利のためだけではない — chain を BFT canon と同じ入力 set に対して *同一に挙動* させるためだ。

> 🛑 **やりがちな勘違い。** 「power 降順 + address 昇順、なぜ両方昇順ではダメ?」 **stake が高い validator は比例して多く propose すべきだからだ。** \`(height + round) % count\` は index 全体で uniform なので、power の高い validator が低い index に並んで proposer に選ばれる回数が多くなる、というのがソートの性質になっている。Tiebreaker (address 昇順) は安定で deterministic な選択を与える。任意の total ordering でよいが、CometBFT が address 昇順を選んだので合わせる。

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

\`OpenHlProposal\` は型付きメッセージだ: 「validator X が (height, round) において proof-of-lock-on-round Z 付きで value Y を propose する」。\`Proposal\` trait は 6 個のアクセサを要求し、\`self\` のフィールドを読むだけで満たせる。

\`pol_round\` (Proof of Lock Round) は Tendermint の概念だ: round Z でこの value に lock したのでこの value を propose する、というときの round Z が \`pol_round\` になる。初回の proposal では \`Round::Nil\` だ。

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

unit struct — 最小の型。**なぜか?** Malachite には大きな value を propose するモードが 2 つある:

- **\`ValuePayload::ProposalOnly\`** (こちらが使う) — value 全体が \`Proposal\` メッセージに乗る
- **\`ValuePayload::ProposalAndParts\`** — proposal が part を参照し、part は別個に送られる

ProposalOnly を使う理由は、\`OpenHlValue\` がただの \`BlockHash\` (32 byte) だからだ。Streaming は不要。だが \`Context\` trait はそれでも \`ProposalPart\` 型の関連付けを要求するので、実体化しない unit struct で満たす。\`is_first\` と \`is_last\` を両方 \`true\` にしておけば、もし check するコードが走っても一貫した結果を返せる。

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

\`OpenHlVote\` は **prevote** と **precommit** の両方を表すメッセージ型だ。\`vote_type\` フィールドでどちらかを区別する。それ以外は構造同一。フィールドセットも同じ: validator address、投票対象の height と round、value (または "この round の任意の value に反対" を意味する \`Nil\`)。

3 つの extension メソッドは \`None\` / no-op だ。**Vote extensions** は Malachite の機能で、validator が precommit に extra data (例: light-client state) を attach できる。v0 では使わない — Context impl で \`Extension = ()\` にする (Step 6)。なのでこのメソッドは stub になる。

**なぜ \`Option<BlockHash>\` ではなく \`NilOrVal<BlockHash>\` か?** どちらも本質的には「value があるかもしれない」を表す。だが \`NilOrVal\` は Malachite の BFT 固有概念で、\`Nil\` は「この round の任意の value に反対する」という意味になる (「意見が無い」とは違う)。\`Option\` だとそのニュアンスが失われる。

### Step 6: \`context.rs\` を書く — 結束

このファイルで 10 個の型を \`Context\` impl に結びつける。最も長いファイル (テスト含めて ~185 行) なので、区切って見ていく。

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

\`OpenHlContext\` は **unit struct** だ — フィールドなし。state は持たず、型の関連付けを保持するだけのマーカーだ。多くの BFT chain の Context 型も stateless になっている。

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

10 個の型 binding — \`Context\` の sub-trait 1 つにつき 1 つ。今書いた 8 つに加えて:

- **\`Extension = ()\`** — vote extension 無し。unit 型が trait の bound を満たすので、実際の extension 型を書く必要がない。
- **\`SigningScheme = Ed25519\`** — Malachite の Ed25519 実装を直接使う。多くの BFT chain は Ed25519 を、BLS (署名集約のため) を使う chain もある。Malachite が実装を ship していて簡潔なので Ed25519 を選ぶ。

それから 4 つの factory method。**\`select_proposer\`** が最も重要:

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

proposer-election アルゴリズムだ。**\`(height + round) % count\`** がソート済み validator set の index を選ぶ。その根拠は:

1. Validator set は \`OpenHlValidatorSet::new\` (Step 4) で canonical にソート済みなので、全 validator が同じ indexing を持つ。
2. 同じ \`(height, round)\` を与えれば、全 validator が同じ \`index\` を計算する。
3. したがって全 validator が同じ proposer を選ぶ。

算術は注意深い: \`u64\` での \`wrapping_add\` で overflow を回避し、\`% count\` で valid な index になる。\`.expect\` は証明可能だ: \`... % count\` で計算したのだから \`index < count\` が成り立つ。

\`(height + round) % count\` が実際にどう validator を回転させるか、3 validator (A: 300 stake / B: 200 / C: 100) の小さな例で追うと一目で見える:

\`\`\`
ソート済みセット (voting_power 降順、tiebreak は address 昇順):
   Index 0 ──► Validator A (stake 300)
   Index 1 ──► Validator B (stake 200)
   Index 2 ──► Validator C (stake 100)

決定的な proposer 選択:
   Height 1, Round 0 ──► (1 + 0) % 3 = 1 ──► Proposer: B
   Height 1, Round 1 ──► (1 + 1) % 3 = 2 ──► Proposer: C  (round が進むと rotation)
   Height 1, Round 2 ──► (1 + 2) % 3 = 0 ──► Proposer: A
   Height 2, Round 0 ──► (2 + 0) % 3 = 2 ──► Proposer: C  (height が進んでも rotation)
   Height 2, Round 1 ──► (2 + 1) % 3 = 0 ──► Proposer: A
   ...
\`\`\`

ここで効いてくるのが Step 4 で見た「canonical sort order」だ。**もし validator A 側で \`[A, B, C]\`、validator B 側で \`[B, A, C]\` の順にソートされていたら**、同じ \`(height=1, round=0)\` を投げても A は「Index 1 = B」を、B は「Index 1 = A」を proposer として認識する。**最初の round で誰を proposer と認めるかが食い違い、chain は即座に fork する。** ソート順 = proposer-election protocol の本体、というのはこういう意味だ。

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

これらは短い。全部フィールド代入だからだ。興味深いのは、\`new_prevote\` と \`new_precommit\` が同じ struct (\`OpenHlVote\`) を作るが \`vote_type\` の値が違う点だ — 型システムが construction の時点で区別を強制する。

### Step 7: \`lib.rs\` に組み込む

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

\`pub mod\` 宣言で module を expose する。\`pub use context::OpenHlContext;\` で中央型を re-export しておけば、downstream crate は \`use openhl_consensus::OpenHlContext;\` と書ける (\`use openhl_consensus::context::OpenHlContext;\` よりきれいだ)。

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

1. **\`validator_set_is_sorted_by_power_then_address\`** — Power がシャッフルされた 3-validator set (100, 300, 200) を作り、出力が [300, 200, 100] であることを verify する。Step 4 の canonical なソート順が動くことを証明する。
2. **\`select_proposer_round_robins_deterministically\`** — 同じ height + round → 同じ proposer (determinism)。違う height → 違う proposer (rotation)。
3. **\`new_proposal_round_trips_fields\`** — \`new_proposal\` で構築し、\`Proposal\` trait メソッドで読み返す。factory ↔ accessor のペアを verify する。
4. **\`new_prevote_and_precommit_have_distinct_types\`** — 同じ引数を渡しても、\`new_prevote\` は \`VoteType::Prevote\` を、\`new_precommit\` は \`VoteType::Precommit\` を 生成する。factory が仕事をしていることを証明する。
5. **\`height_increment_and_decrement\`** — \`INITIAL.increment() == 2\`、\`ZERO.decrement() == None\`、\`5.decrement() == Some(4)\`。算術メソッドを verify する。

Note: \`h.increment()\` であって \`h.increment_by(1)\` ではない — \`increment\` は \`Height\` trait のデフォルトメソッドで、内部で \`increment_by(1)\` を呼ぶ。\`decrement\` も同様。

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

よくあるエラーと対処:

- **\`cannot find trait 'Address' in scope\`** — \`address.rs\` に \`use informalsystems_malachitebft_core_types::Address;\` が抜けている。
- **\`expected struct 'OpenHlContext', found ...\`** — 型ファイルに \`crate::context::OpenHlContext\` を import しているが、\`context.rs\` がまだ存在しない。\`context.rs\` を先に書くか、型ファイルを \`crate::OpenHlContext\` (placeholder) で書いて、後で \`context.rs\` を埋める。
- **\`method 'increment' not found\`** — Malachite の \`Height\` trait は \`increment()\` をデフォルトメソッド (\`increment_by(1)\` を呼ぶ) として提供する。\`increment\` ではなく \`increment_by\` を impl しているか確認する。
- **\`first_validator_set sort produces a different order\`** — sort comparator は \`b.voting_power.cmp(&a.voting_power)\` (note: \`b\` が先で降順) であって、\`a.voting_power.cmp(&b.voting_power)\` ではない。

## 設計を振り返る

このレッスンで encode した本質的な決定が 3 つ:

1. **Context sub-type 1 つにつき 1 ファイル。** 大きな \`context.rs\` に 10 個の型をインラインで定義することもできた。分けることで、(本レッスンや、後で個別の型を引用するレッスンの) walk-through が focused になる。1 ファイルで済むものが 8 ファイルになる、その代わりだ。分割を選んだ理由は **trait surface が独立に load-bearing だから** — \`Validator\` の決定は \`Vote\` の決定と別物だし、code review は変更が局所化されているほうが容易だ。

2. **\`OpenHlValidatorSet\` は別の \`sort()\` メソッドではなく \`new()\` でソートする。** unsorted な set を construct できない、を意味する。型システムが「この set は常にソートされている」を encode し、unsorted な set を 生成する API path が存在しない。これが伝播する: set の全メソッドがソート済み順序を仮定でき、それが compiler の enforce する不変量になる。

3. **\`select_proposer = (height + round) % count\`** — 最も単純なアルゴリズム。Malachite はもっと洗練された proposer selection (stake で weighted、同一 validator が連続しない rotation など) をサポートする。それでも最も単純なものを選ぶ理由は:
   - 決定的だ
   - 全 validator が verify できる
   - 「公平な stake-weighted rotation」の複雑さは \`OpenHlValidatorSet::new\` のソート側に住み、\`select_proposer\` 自体には住まない
   - stake の高い validator が低 index に来るので、modulo で自然に多く proposer に選ばれる

   これは CometBFT と同じアプローチだ。洗練された rotation (例: random beacon ベースの proposer selection) が必要になったら、このメソッドの body を変えればよい — trait surface は変わらない。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 784785b
diff -ur ~/code/my-openhl/crates/consensus/src/types ./crates/consensus/src/types
diff -u ~/code/my-openhl/crates/consensus/src/context.rs ./crates/consensus/src/context.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

Doc comment やテスト順序の variation は OK。各型の shape、\`OpenHlValidatorSet::new\` の sort comparator、\`select_proposer\` の body はほぼ一致するはず。

main に戻す:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: validator set のソートが (300, 200, 100) ではなく (100, 200, 300) になる。何が間違っているのか?**
\`a.voting_power.cmp(&b.voting_power)\`（昇順）になっている。正しくは \`b.voting_power.cmp(&a.voting_power)\`（降順）だ。高い stake の validator を低い index に置く必要がある。

**Q: \`select_proposer\` が "validator set is empty." で panic する。なぜか?**
テストが空の \`OpenHlValidatorSet\` を作っている。Real chain は最低 1 validator (single-validator devnet) か 4 以上 (byzantine tolerance 付きの multi-validator) を持つ。この assert は malformed config を modulo-by-zero になる前に catch するためにある。Unit test で出るなら test setup が間違っている。production で出るなら config loader が間違っている。

**Q: \`OpenHlContext\` に state (例: chain config) を持たせられるか?**
持たせられる — \`pub struct OpenHlContext;\` を \`pub struct OpenHlContext { chain_id: u64 }\` などに変えればよい。Context trait は state を禁止していない。だが多くの BFT chain の Context 型は stateless だ。context の仕事は *型を関連付ける* ことであって *runtime config を保持する* ことではないからだ。Runtime config は \`OpenHlConfig\` (レッスン 8 で扱う) に住む。

**Q: なぜ \`Extension\` が \`()\` で、メソッドが \`None\` でスタブ化されているのか?**
openhl v0 では vote extension を使わないからだ。Production BFT chain では precommit に light-client snapshot などを attach するために使う。実装するなら、何のデータを attach するか、どう serialize するか、もう一方の端でどう verify するか、を決める必要がある。具体的なユースケースが出るまで意図的に scope 外とした。

## 次のレッスン (レッスン 7)

10 個の Context sub-type と 4 つの factory method が揃った。Malachite はこちらの chain の address、height、value、validator、message を知っている状態だ。だが **まだ何も署名されていない。** レッスン 7 では \`OpenHlSigningProvider\` を impl する — \`OpenHlVote\` と \`OpenHlProposal\` メッセージに対して Ed25519 署名を 生成する trait だ。これが Context surface の **もう半分** だ — Context が「これが私の型だ」と言い、SigningProvider が「これがその署名の作り方だ」と言う。`,
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

このレッスンで掴む概念:

- **canonical encoding は consensus-critical。** 署名対象になるバイトレイアウトが *chain の spec の一部* であり、\`serde::Serialize\` から derive してはいけない理由。serde のバージョンが異なる validator 同士は、同じ vote から異なるバイト列を作って別物に署名し、結果として fork する。
- **stateful provider で wrap された純粋関数。** \`sign_vote(vote, &sk)\` は free function (テストはこれを直接呼ぶ)、\`OpenHlSigningProvider\` は key を保持して \`sp.sign_vote(vote)\` を Malachite に提供する。1 つのロジックを 2 通りの呼び出し方で使い分ける。
- **署名検証失敗による改ざん検出。** Ed25519 は「何が」改ざんされたかを知らない。単に verify が失敗するだけだ。vote の 1 バイトを flip して verification が失敗することを確認するテストは、canonical encoding が consensus-relevant なフィールドを漏れなくカバーしている証明になる。
- **型システムによる公開鍵 / 秘密鍵の分離。** Ed25519 は \`sign\` を \`PrivateKey\` にしか持たせない。公開鍵で署名しようとしたら compiler が拒否してくれる。
- **未使用機能への空バイト署名。** trait surface が要求するが chain が使わない機能 (vote extension、proposal part) については、確定的な空データに署名することで contract を honor しつつ、持っていないデータをでっちあげずに済む。

検証:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

上記の実行結果が **14 個のテストすべてに合格する** (レッスン 6 の Context impl から 5 個 + 署名と SigningProvider の新規 9 個)。9 個の新規テストがカバーするもの: 4 種類すべての署名対象型 (vote、proposal、proposal_part、vote_extension) についての sign/verify ラウンドトリップ、vote と proposal の改ざん検出、別 provider が作った署名の検証拒否。

具体的な変更:

- \`crates/consensus/src/signing.rs\` — \`OpenHlVote\` と \`OpenHlProposal\` の canonical byte encoding、低レベルの \`sign_vote / sign_proposal / verify_vote\` 関数、\`VerifierLike\` shim、unit test 2 個。
- \`crates/consensus/src/signing_provider.rs\` — \`PrivateKey\` を保持する \`OpenHlSigningProvider\`、8 method (4 sign/verify pair) の \`impl SigningProvider<OpenHlContext>\`、unit test 7 個。
- \`crates/consensus/src/lib.rs\` — \`pub mod signing; pub mod signing_provider;\` を組み込む。
- Cargo.toml 変更なし (\`informalsystems-malachitebft-signing-ed25519\` 依存は レッスン 6 で入った)。

## おさらい

レッスン 6 完了時点で \`openhl-consensus\` crate には以下がある:

\`\`\`
crates/consensus/src/lib.rs   — pub mod bridge, context, types
crates/consensus/src/types/   — 7 個の型ファイル + mod.rs
crates/consensus/src/context.rs — OpenHlContext + Context impl + テスト 5 個
\`\`\`

\`cargo test -p openhl-consensus\` でテスト 5 個が合格する。**署名はまだ一切存在しない** — vote と proposal は構築できるが、コードベース中のどこにも、それらに対して署名を生成したり検証したりする処理がない。

## 計画

5 つやる:

1. **\`crates/consensus/src/signing.rs\` を作成する** — \`OpenHlVote\` と \`OpenHlProposal\` の canonical byte encoding 関数、低レベルの \`sign_vote\` / \`sign_proposal\` / \`verify_vote\` 関数、\`VerifierLike\` trait shim、ユニットテスト 2 個。
2. **\`crates/consensus/src/signing_provider.rs\` を作成する** — \`PrivateKey\` を保持する \`OpenHlSigningProvider\` 構造体、8 メソッドの \`impl SigningProvider<OpenHlContext>\` (4 つの sign/verify ペア)、ユニットテスト 7 個。
3. **両モジュールを \`lib.rs\` に組み込む** — \`pub mod signing; pub mod signing_provider;\` を追加。
4. **Cargo.toml の変更なし** — \`informalsystems-malachitebft-signing-ed25519\` は レッスン 6 で \`rand\` feature 付きで追加済み。追加要件はない。
5. **実行** — \`cargo test -p openhl-consensus\` で 14 個全部合格する。

このレッスンが教えるのは **2 つのパターン** だ:

- **Canonical encoding** — 型付きメッセージを、すべての validator が同一に計算できる確定的なバイト列に変換する。署名は **構造体** ではなく **バイト列** にコミットする。フィールドの encoding が変わると、署名が検証できなくなる。
- **Trait 同士の接続** — Malachite の \`SigningProvider\` は、\`signing.rs\` の低レベル署名ロジックを **ラップする** trait だ。Provider は実行時状態 (鍵) を持ち、処理を状態を持たない純粋関数に委譲する。これは \`ConsensusBridge\` (trait) と \`InMemoryEvmBridge\` (それを impl する構造体) と同じ分離パターンだ。

> 🛑 **考えてみよう。** スクロールする前に: \`Vote\` の canonical encoding はどのフィールドを含む必要があるか? ヒント: 署名が何にコミットしているかを考える。コンセンサスにとって意味のある違いがある 2 つの vote について、もし signing bytes が同一になっていれば、片方に対する有効な署名がもう片方にも通ってしまう。攻撃者は vote を replay したり swap したりできる。

## 手順

### Step 1: \`crates/consensus/src/signing.rs\` を作成

モジュール docstring と import から:

\`\`\`rust
//! Canonical encoding + signing for proposals and votes.
//!
//! v0 uses a simple length-prefixed concatenation rather than Protobuf/SSZ.
//! Real production validators will want a stable serialization format
//! (ステップ 2's \`openhl-codec\` crate is the natural home for that).

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

この関数は \`OpenHlVote\` をバイト列に変換する。**署名はこのバイト列にコミットする。** 悪意ある actor が \`Vote\` のどのフィールドを変えても signing bytes が変わり、署名検証が失敗し、改ざんされた vote はすべての validator に拒否される。

バイトレイアウトを確認:

| バイト | フィールド | エンコード |
| - | - | - |
| 0..8 | \`height\` | u64 little-endian |
| 8..16 | \`round\` | i64 little-endian (round は "round 無し" を表す -1 もありうる) |
| 16 | \`vote_type\` | 0 = Prevote, 1 = Precommit |
| 17 | \`value_id\` tag | 0 = Nil, 1 = Val |
| 18..50 (Val の場合) | \`value_id\` 本体 | BlockHash の 32 バイト |
| 18..38 OR 50..70 | \`address\` | 20 バイト |

\`value_id = Val(...)\` のときの 70 バイトの並びをメモリ図にすると、署名対象になるバイト列の正体が 1 枚で見える:

\`\`\`
【 Vote (Val ケース) の canonical signing-bytes — 全 70 バイト 】

┌────────────────┬────────────────┬───┬───┬───────────────────────────────┬─────────────────────────┐
│   Height (8B)  │   Round (8B)   │Typ│Tag│      Value ID  (32B / hash)    │ Validator Address (20B) │
└────────────────┴────────────────┴───┴───┴───────────────────────────────┴─────────────────────────┘
 0              8               16  17  18                              50                         70  (offset / bytes)
 [── u64 LE ──] [── i64 LE ──]   │   │   [─────── BlockHash 本体 ───────] [───── 20-byte Eth addr ──]
                                 │   │
                                 │   └── 0 = Nil  /  1 = Val            (※ Nil なら本体 32B は省略され、addr が 18..38 に来る)
                                 └────── 0 = Prevote  /  1 = Precommit

  どの validator が、どの host (x86 / ARM / RISC-V / …) でこの関数を走らせても、
  上の 70 バイトは **完全に同一** に生成される ─ 1 バイトのズレも許されない。
  この 70 バイトが「Ed25519 が署名するメッセージ」そのものになる。
\`\`\`

**なぜ little-endian?** x86 / ARM ホストでの慣習だからだ。**なぜ tag バイトを付ける?** \`NilOrVal::Nil\` は 1 バイト (tag 0)、\`NilOrVal::Val\` は 33 バイト (tag 1 + 32 バイトのハッシュ) になる。Tag があるので、パーサがどちらか判別できる。**なぜ validator address を含めるのか?** Vote は **どの** vote かだけでなく **誰の** vote かも表すからだ。同じ proposal に対して 100 人の validator が vote すれば、それぞれ別の signing-bytes 文字列が生成される。

> 🛑 **やりがちな勘違い。** 「\`bincode::serialize(v)\` の結果に署名するだけではダメか?」 **ダメだ。** 既製のシリアライゼーション形式は、ライブラリのバージョンが上がると変わりうる — 今日署名するものと明日署名するものが、struct は同一でも違ってしまう可能性がある。**canonical** encoding は自分で 1 バイト単位までコントロールするものだ。本番 chain では encoding を protobuf スキーマで定義するか、ここのように手書きで定義する。どちらにせよ encoding は chain の wire format spec の一部になる。

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

**\`vote_signing_bytes\` との違いに注目。** Proposal の value は \`NilOrVal\` でラップされず、無条件で \`BlockHash\` だ。Proposal は必ず value を運ぶので、Nil を propose することはない。

**\`p.value.0.0\` は奇妙に見える。** \`.0\` アクセスを 2 段重ねている。最初は \`OpenHlValue(BlockHash)\` から \`BlockHash\` を取り出し、次に \`BlockHash([u8; 32])\` から \`[u8; 32]\` を取り出す。newtype の層ごとに \`.0\` が必要だ。煩わしいが明示的になる。

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

どちらもメッセージの所有権を取り (通常、呼び出し側は渡したら以降は使わないので)、canonical bytes を生成し、Ed25519 で署名し、\`SignedMessage\` でラップする。\`SignedMessage::new(msg, sig)\` は Malachite の標準ペアリングで、署名されたものはすべて \`SignedMessage\` としてエンジン内を流れる。

\`crate::OpenHlContext\` は レッスン 6 で作った \`OpenHlContext\` だ。Malachite の \`SignedMessage\` は context 型と inner message 型に対してジェネリックになっている。

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

- **\`verify_vote\`** — \`sign_vote\` の逆だ。Canonical bytes を再計算し、public key の verify メソッドを呼び、true/false を返す。
- **\`VerifierLike\` trait** — 「Ed25519 署名を検証できる何か」に対する小さな抽象だ。理由は次のとおり: Malachite の \`PublicKey\` は \`signature::Verifier\` trait 経由で検証を提供しているが、こちらの API の利用者にその trait を import させたくない。\`VerifierLike\` は自前の trait で、\`signature::Verifier\` への橋渡し impl を 1 つだけ提供する。**呼び出し側からは 1 つの trait に見え、裏で canonical な方に委譲する。**
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

2 つ目は **load-bearing** なテストだ。**canonical encoding が意味のあるすべてのフィールドに対して敏感である** ことを証明する。encoding が壊れていた (例: \`value_id\` をバイト列に含め忘れた) 場合、tampered.value_id は異なるが signing bytes は同じになるので、「改ざんされた vote が検証を通った」とテストは失敗する。

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

構造体は \`PrivateKey\` を保持する。コンストラクタは外から鍵を受け取る (通常はディスクや環境変数から)。\`public_key()\` は対応する public key をオンデマンドで導出する — Ed25519 では private key からスカラー乗算で public key を導出でき、ミリ秒オーダーで済む。

\`use\` ブロックは \`signing.rs\` から低レベル関数を **\`_with\` サフィックスを付けたリネーム形式** (\`sign_vote as sign_vote_with\`、\`sign_proposal as sign_proposal_with\`) で import する。**なぜリネームするのか?** \`SigningProvider\` trait 側に \`sign_vote\` と \`sign_proposal\` という名前のメソッドがあり、自前ヘルパーを名前衝突なしで呼びたいからだ。\`_with\` サフィックスは「これは trait メソッドが委譲する先の実装関数」を表すローカル慣習で、特別なマクロや言語機能ではない (上のコードの \`as ...\` がそのまま新しい名前を作っているだけ)。

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

- **\`sign_vote\` / \`verify_signed_vote\`** — \`signing::sign_vote\` に委譲 / public key の \`verify\` を \`vote_signing_bytes\` 付きで呼ぶ。標準的な形だ。
- **\`sign_proposal\` / \`verify_signed_proposal\`** — 同じパターン。
- **\`sign_proposal_part\` / \`verify_signed_proposal_part\`** — **空バイトに署名する。** なぜか? \`OpenHlProposalPart\` は unit struct で、コミットすべきデータが存在しないからだ。空ペイロードに署名しても valid な Ed25519 署名は生成される (private key だけで確定的)。検証は「はい、この provider がこの署名を作った」を確認する。署名に情報量はないが、trait 表面は満たされる。
- **\`sign_vote_extension\` / \`verify_signed_vote_extension\`** — proposal_part と同じ。Vote extension は \`()\` (v0 では未使用) なので、空バイトに署名する。

> 🛑 **やりがちな勘違い。** 「空バイトに署名するのは何か違う気がする — 意味があるのか?」 **意味は、持っていないデータにコミットすることなく trait 表面を満たすことだ。** Malachite エンジンは実行時にこれらのメソッドを呼ぶ。panic したり Error を返したらエンジンがクラッシュする。空バイトに署名して valid な署名を返すことで、「はい、これはこちらからの本物の署名だ。ただし、メッセージの残りの部分以上に追加でコミットしているデータはない」と言えるわけだ。これらの機能を使う本番 chain は実データを入れる。こちらは入れないが、trait 表面はそのまま保たれる。

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

最後のテストは **load-bearing なセキュリティ保証** だ: 署名は特定の鍵に紐付く。これがなければ、誰でも別の validator の有効な署名を再利用して偽造できてしまう。

### Step 10: 両モジュールを \`lib.rs\` に組み込む

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

\`pub mod signing;\` と \`pub mod signing_provider;\` でモジュールを公開する。この層では再エクスポートは不要だ — 呼び出し側はフルパスで import する。

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
- **\`error: trait 'SigningProvider' not implemented for 'OpenHlSigningProvider' — missing method 'sign_vote_extension'\`** — 8 つのメソッド (sign 4 + verify 4) すべてが必須だ。一部しか実装していないと trait を満たせない。不足分を追加する。
- **\`error: type alias 'Extension' is \`()\` so methods take \`ext: ()\`** — impl が \`ext: ()\` (verify では \`_ext: &()\`) を使っているか確認する。\`Extension\` のような placeholder ではない。
- **\`vote_tamper_detected\` テストが逆に失敗する** — Canonical encoding が \`value_id\` (または別フィールド) をバイト列に含めていない可能性がある。Step 2 を再確認 — 構造体の意味のあるフィールドはすべてバイト列に寄与しなければならない。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Canonical encoding は \`signing.rs\` 側に置き、\`serde::Serialize\` からは導出しない。** \`signing.rs\` で自分がコントロールするバイトレベルレイアウトを定義する。なぜか? \`serde\` のバージョンは Rust edition 更新やライブラリアップグレードで変わりうるが、署名されたメッセージは、異なるバイナリバージョンを走らせている可能性のある validator 間でラウンドトリップしなければならない。Encoding をライブラリの詳細ではなく自分のコードに固定しておけば、wire format は chain の spec の一部になる。

2. **\`SigningProvider\` は純粋関数 \`sign_vote\` をラップし、鍵を状態として持つ。** \`sign_vote\` を \`OpenHlSigningProvider\` のメソッドにすることもできた。分離することで、**テスト** や **内部コード** は \`sign_vote(vote, &sk)\` を直接呼び (鍵を引数で渡す)、**Malachite エンジン** は trait メソッド \`sp.sign_vote(vote)\` を使える (provider が保持する鍵にバインドされている)。**同じロジックを、重複なく両方のユースケースに提供できる。**

3. **ProposalPart と Extension の空バイト署名。** Trait 表面がメソッドを要求するが、chain がその機能を使わない場合は、空データに対する確定的で検証可能な署名を提供する。これで、持っていないデータにコミットすることなく trait を honor できる。これらの機能を使う本番 chain は実データを入れる。こちらは入れないが、どちらの場合もエンジンはクラッシュしない。

4. **\`VerifierLike\` shim で依存の漏れを遮断する。** 目的は 1 つだけで、公開 API から外部 crate 依存を隠すことだ。\`verify_vote\` が \`signature::Verifier\` を直接呼ぶと、こちらの crate 利用者まで \`signature\` trait を意識することになる。上流が別ライブラリへ差し替わった瞬間、下流にも breaking change が波及する。  
\`VerifierLike\` を 1 枚かませれば、外部依存は \`signing.rs\` の \`impl VerifierLike for PublicKey\` に閉じ込められる。将来の変更点はそこ 1 箇所で済む。**原則は「自分の公開 API に他人の trait を直接出さない」。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 9e810a7
diff -u ~/code/my-openhl/crates/consensus/src/signing.rs ./crates/consensus/src/signing.rs
diff -u ~/code/my-openhl/crates/consensus/src/signing_provider.rs ./crates/consensus/src/signing_provider.rs
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

Doc コメントの文言には個人差が出てよい。Canonical encoding のバイト順、SigningProvider trait impl (特に何に委譲しているか)、テストパターンは厳密に一致するはず。

\`9e810a7\` の参照には、後のレッスンで追加するファイル (\`runner.rs\` の変更) も含まれる。このレッスンでは signing 関連ファイルだけを diff する。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: Nil vote の場合、\`vote_signing_bytes\` は \`vote_type\` を含めないのか?**
含める — \`vote_type\` は \`value_id\` が Nil でも Val でも常に 1 バイト (0 または 1) になる。条件分岐は \`value_id\` のためだけにある (Nil なら tag 1 バイト、Val なら tag 1 バイト + ハッシュ 32 バイト)。

**Q: 誤って public key で署名してしまうことはあるか?**
ない — Ed25519 は型で分離されている: \`PrivateKey::sign(&[u8]) -> Signature\` は存在するが、\`PublicKey::sign\` は存在しない。型システムが取り違えを防いでくれる。

**Q: ある validator の vote_signing_bytes が別の validator のものと食い違うと何が起きるか?**
両者が同じ proposal に vote する最初の round で chain が fork する。Validator A の署名は A 自身の encoding で検証成功する。Validator B が同じ vote を別の encoding で読むと、署名検証に失敗して vote を拒否する。同じ選挙について別々の集計結果が生まれ、別々の決定 value につながる。**だからこそ encoding は spec の一部であって、実装の詳細ではない。**

**Q: なぜ \`OpenHlSigningProvider\` は \`Clone\` を impl しないのか?**
Private key のコピーは明示的に行いたいからだ — \`let sp_copy = sp.clone();\` は事故的に書きやすい。本当にコピーが必要なら \`OpenHlSigningProvider::new(self.private_key.clone())\` を使う。\`Clone\` を切っておけば、private key の複製はまれで可視な操作になる。

## 次のレッスン (レッスン 8)

署名の表面が完成した。Malachite から provider にメッセージへの署名を依頼でき、検証はラウンドトリップする。しかし **Malachite はまだネットワーク越しの会話の仕方を知らない** — validator 間で vote を送るには encoding/decoding が必要だ。レッスン 8 では \`OpenHlCodec\` を実装する: ネットワーク転送、write-ahead logging、state sync のために、メモリ内型とバイト列を相互変換する trait だ。レッスン 8 終了後にはエンジン起動に必要なものがすべて揃う (codec + signing + context + node config)。同じレッスンで \`OpenHlNode\` を接続し、\`start_engine\` が動くことを証明する。`,
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

このレッスンで掴む概念:

- **stub による trait 充足。** 型レベルの incremental development。Malachite が呼ばないコードパスに 50 行の protobuf encoder を書くより、未実装を名乗る 4 行の stub のほうが正しい。万一呼ばれたら大きな声でエラーになる。
- **sub-trait の blanket impl。** \`WalCodec / ConsensusCodec / SyncCodec\` は適切な \`Codec<T>\` 構成要素を実装すれば自動でついてくる。\`static_assertions::assert_impl_all!\` テストが blanket impl の発火とコンパイル時 bound の実在を検証する。
- **codec が crate graph 上どこに住むか。** codec は \`openhl-types\` ではなく \`openhl-consensus\` に置く。Malachite の \`informalsystems-malachitebft-app\` (libp2p、ractor) に依存するからだ。\`types/\` に置くと、\`BlockHash\` だけ欲しい下流 crate まで libp2p を引きずってしまう。
- **wire format と canonical signing format の違い。** レッスン 7 の canonical encoding は *署名される対象*、レッスン 8 の codec は *ネットワークに流れるもの*。重なる部分はあるが同じではない。wire format には framing、versioning、length prefix が乗り、それらに署名は及ばない。
- **レッスン 8 で 1 個の本物の codec で足りる理由。** 単一 validator devnet では \`ProposalPart\` しか round-trip しない。残り 7 つは peer を増やすか crash recovery しない限り発火しない gossip / sync / WAL のパスだ。

検証:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

上記の実行結果が **16 個のテストすべてに合格する** (レッスン 7 から 14 個 + codec の新規 2 個)。新規テストは 2 個: \`OpenHlCodec\` が 3 つの super-trait を満たすことを示すコンパイル時アサーション、および \`ProposalPart\` の runtime ラウンドトリップテスト。

ここでもうひとつ unblock されるものがある: \`informalsystems-malachitebft-app\` が libp2p、ractor、その他エンジン表面のすべてを引き込んでくる。これ以降の**初回コンパイルは非常に重い** (近代的なマルチコア環境で ~38 秒以上、シングルコア寄りやリソース制限のある環境では数分単位)。投資の見返りは レッスン 9 で spawn する actor system だ。

具体的な変更:

- \`crates/consensus/Cargo.toml\` に \`informalsystems-malachitebft-app\` + \`static_assertions\` (dev) を追加。
- \`crates/consensus/src/codec.rs\` — 新規ファイル、\`OpenHlCodec\` 構造体、\`CodecStub\` エラー型、8 個の \`Codec<T>\` impl (1 個は \`ProposalPart\` 用 real、7 個は stub)、unit test 2 個。
- \`crates/consensus/src/lib.rs\` — \`pub mod codec;\` を組み込む。

## おさらい

レッスン 7 完了時点で \`openhl-consensus\` crate には以下がある:

\`\`\`
crates/consensus/src/lib.rs   — pub mod bridge, context, signing, signing_provider, types
crates/consensus/src/signing.rs            — canonical encoding + 低レベル sign/verify
crates/consensus/src/signing_provider.rs   — OpenHlSigningProvider が SigningProvider<OpenHlContext> を impl
crates/consensus/src/types/                — 7 つの型ファイル + mod.rs
crates/consensus/src/context.rs            — OpenHlContext + Context impl
\`\`\`

\`cargo test -p openhl-consensus\` でテスト 14 個が合格する。**エンジンはまだコンパイルできない** — \`start_engine\` は codec に対してジェネリックだが、まだ codec を提供していないからだ。

## 計画

5 つやる:

1. **\`crates/consensus/Cargo.toml\` に \`informalsystems-malachitebft-app\` を追加する。** これが重量級だ — libp2p、ractor、フルな app 表面を推移的に引き込んでくる。これ以降の初回コンパイルは**非常に重い** (近代的マルチコア環境で ~38 秒以上、リソース制限環境では数分単位)。
2. **\`crates/consensus/src/codec.rs\` を作成する** — \`OpenHlCodec\` unit struct、\`CodecStub\` エラー、8 個の \`Codec<T>\` impl。
3. **\`pub mod codec;\`** を \`lib.rs\` に組み込む。
4. **実行** — \`cargo test -p openhl-consensus\` で 16 個合格する。
5. **観察** — コンパイル時アサーションがコンパイルを通る。これがエンジンの codec trait bound を満たしたシグナルだ。

このレッスンが教えるのは、**個別の impl の詳細を超えて効いてくる 1 つのパターン** だ: **明確な失敗モードを持たせて trait メソッドを stub する**。大きな trait bound を満たす必要があるが、対象メソッドが hot path にない場合、stub にしてしまえる。stub のエラーメッセージには「何が呼ばれたか」を載せ、読み手が次に何を実装すべきか分かるようにする。これが **型レベルのインクリメンタル開発** だ — codec を全部一度に実装する必要はない。コンパイルが通るだけのものを提供しておき、実際に呼ばれたところで大きな声でエラーを返す。

> 🛑 **考えてみよう。** スクロールする前に: なぜ Malachite は、single-validator devnet では送るネットワークが無いのに、エンジンがネットワーク・メッセージのエンコード方法を知っていることを強制するのか? ヒント: trait bound は **型** に関するもので、**runtime 挙動** に関するものではないからだ。エンジンが自分の codec に対してジェネリックなのは、devnet では gossip しない validator も multi-validator デプロイでは gossip するからだ。Codec スロットが要求されるのは、エンジンがピアの有無を知らないからだ。impl が完全である必要がないのは、テストでは gossip のコードパスがそもそも実行されないからだ。

## 手順

### Step 1: app 依存を Cargo.toml に追加

\`crates/consensus/Cargo.toml\` を開く。\`[dependencies]\` セクションに 1 行追加:

\`\`\`toml
informalsystems-malachitebft-app             = { workspace = true }
\`\`\`

他の malachite 依存の隣に配置する。\`app\` crate はメタ crate で、エンジンの各所から型を re-export している — \`Codec\`、\`ConsensusCodec\`、\`SyncCodec\`、\`WalCodec\`、\`SignedConsensusMsg\`、\`StreamMessage\`、\`ProposedValue\`、\`sync::{Status, Request, Response}\` はすべてここに集まる。

簡易サニティチェック:

\`\`\`bash
cargo check -p openhl-consensus 2>&1 | tail -5
\`\`\`

初回ビルドは非常に重い (libp2p + ractor と大量の推移的依存が初めてコンパイルされるため、近代的なマルチコア環境でも **~38 秒以上**、シングルコア寄りやリソース制限のある環境では数分かかることもある)。途中で進行ログが止まって見えてもフリーズではない — コーヒーをもう一杯淹れて待つ。以降はキャッシュが効き、差分ビルドは秒単位に縮む。

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
//! When レッスン 9 spins up actors and one of these stubs IS hit, the error
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

\`OpenHlCodec\` は unit struct で、状態は持たない。Malachite の codec は純粋関数で、レシーバが存在するのは trait dispatch のためだけだ。\`CodecStub\` は 8 個の Codec impl で共有するエラー型。\`&'static str\` フィールドは、codec が未実装の型の名前を保持する。未実装パスが **実際に** fire したとき、エラーメッセージが何を書くべきかを教えてくれる。

> 🛑 **やりがちな勘違い。** 「なぜ \`CodecStub\` は enum (stub ごとに variant) ではなく、\`&'static str\` を持つ struct なのか?」 **新しい stub を追加するたびに 2 箇所 (enum 定義と各呼び出し側) を編集する必要が出るからだ。** \`&'static str\` 引数なら拡張可能で、新しい \`Codec<T>\` impl の stub も型名リテラルを渡すだけで作れる。enum 変更は不要だ。トレードオフは、型安全性が下がる (任意の文字列を渡せる) ことだが、\`T\` 自体は trait 表面が縛っているので、文字列は人間向けラベル扱いで十分だ。

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

これは **本物** だ。\`OpenHlProposalPart\` は unit struct (フィールド 0 個) なので:

- **Encode** は空の \`Bytes\` を返す — unit struct の wire 表現は空文字列だ。
- **Decode** は入力バイトを無視し、\`OpenHlProposalPart\` を返す — その型の唯一の取りうる値だからだ。誰かがゴミバイトを渡しても、unit 型へのデコードは失敗しようがない。

これは **stub ではない** — 完全で正しい実装で、たまたま自明なだけだ。Unit 型は退化的な wire format を持つ。この空バイト encoding は、\`signing_provider.rs\` の \`proposal_part_round_trips\` をはじめ「\`ProposalPart\` を encode/decode して」と尋ねる箇所で exercise される。

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

7 個の Codec impl、すべて同じパターン: \`decode\` も \`encode\` も \`Err(CodecStub(...))\` を返す。型名はリテラルで渡すので、stub error が自分自身の名前を名乗る。

3 つのカテゴリ:

- **Consensus メッセージ (gossip)** — \`SignedConsensusMsg\`、\`LivenessMsg\`、\`StreamMessage\`。Validator 間で libp2p 越しに流れる。Single-validator devnet には peer がいないので、これらは呼ばれない。
- **WAL (crash recovery)** — \`ProposedValue\`。エンジンは proposal を crash recovery のためにディスクに書く。こちらはインプロセステストで動かすので fire しない。
- **Sync (peer catch-up)** — \`Status\`、\`Request\`、\`Response\`。Validator が遅れたとき、peer に過去 block を送ってもらうために尋ねる。Peer がいなければ遅れることもなく、sync することもない。

> 🛑 **やりがちな勘違い。** 「\`#[derive(Serialize, Deserialize)]\` を付けて bincode で済ませばよいのでは?」 **一部はそうできる。** だが、これらの型の多くはジェネリック、\`Box<dyn Trait>\` フィールド、あるいは serde が簡単には扱えない要素を含む。Malachite の \`test\` crate のリファレンス実装は、~400 行の手書き Protobuf encoding でこれらを全部捌いている。Stub アプローチは、その作業を今は省くためのものだ。実ネットワークや永続 WAL が必要になったときに、ここで protobuf や borsh 実装に 1 メソッドずつ差し替えていく。

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

- **\`openhl_codec_satisfies_all_three_super_traits\`** — テストの体裁をした **コンパイル時** アサーションだ。\`WalCodec<Ctx>\`、\`ConsensusCodec<Ctx>\`、\`SyncCodec<Ctx>\` は Malachite の super-trait で、適切な \`Codec<T>\` 構成 impl をすべて持っていれば自動的に満たされる。3 つの \`assert_*\` 関数は、bound を強制的にコンパイラにチェックさせるためだけに存在する。1 個でも \`Codec<T>\` impl が抜けていれば **コンパイルが通らず**、runtime ではなくコンパイル時に失敗する。Runtime のテスト本体は no-op。検証は型チェック時に発生する。
- **\`proposal_part_round_trips\`** — 1 つだけの **本物** の codec impl を exercise する。空の \`ProposalPart\` を encode し、結果バイトを decode して、等価性を assert する。これで本物 impl が動くことを証明する。7 個の stub を runtime でテストしないのは、誰かが呼んだらエラーを返して panic-via-error する設計だからだ。

> 🛑 **やりがちな勘違い。** 「なぜテストは空なのに pass するのか?」 **アサーションが型チェッカー側にあり、runtime にはないからだ。** \`assert_wal_codec::<OpenHlCodec>()\` と書くと、Rust はコンパイル時に \`OpenHlCodec: WalCodec<OpenHlContext>\` をチェックしなければならない。Bound が失敗すればファイルがコンパイルできず、\`cargo test\` はテスト失敗ではなく **コンパイルエラー** を報告する。これは Rust の一般的なパターンだ: 検証したい bound を持つ関数を呼ぶことで、runtime チェックをコンパイルチェックに変換する。

### Step 6: codec を \`lib.rs\` に組み込む

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
test bridge::tests::... ... ok            # (consensus に レッスン 3 由来の bridge テストがある場合 — workspace 構成による)
test codec::tests::openhl_codec_satisfies_all_three_super_traits ... ok
test codec::tests::proposal_part_round_trips ... ok
test context::tests::... (5 tests) ... ok
test signing::tests::... (2 tests) ... ok
test signing_provider::tests::... (7 tests) ... ok

test result: ok. 16 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

よくあるエラーと対処:

- **\`error[E0277]: the trait bound 'OpenHlCodec: WalCodec<OpenHlContext>' is not satisfied\`** — 8 個の \`Codec<T>\` impl のうちどれかが抜けている。Step 3 と Step 4 を再確認 — 8 つの構成型すべてに \`impl Codec<T> for OpenHlCodec\` が必要だ。
- **\`error[E0061]: this function takes 1 argument but 0 arguments were supplied\`** (または \`error[E0308]: mismatched types\`) — \`CodecStub\` は \`pub &'static str\` を 1 個取るタプル構造体だから、引数なしで \`CodecStub\` と書いたり、波括弧で \`CodecStub { ... }\` と書いたりすると弾かれる。\`Err(CodecStub("SignedConsensusMsg<OpenHlContext>"))\` のように、対象の型名リテラルを正しく 1 個渡す。
- **\`error[E0432]: unresolved import 'informalsystems_malachitebft_app::types::codec::ConsensusCodec'\`** — Cargo.toml に \`informalsystems-malachitebft-app\` を追加し忘れている。Step 1 を再確認。
- **再ビルドでも 60 秒以上かかる** — \`cargo build\` (\`--release\` なし) を試す。それでも遅ければ原因は libp2p なので、そのままにしておく。

## 設計の振り返り

3 つの load-bearing な決定:

1. **明確な失敗名を持つ stub は、まだ必要のない完全な impl に勝る。** **本物** の \`SignedConsensusMsg\` codec は protobuf encoding 約 50 行になる。必要ないから書かない。代わりに 4 行の stub を書き、もし fire したら何が未実装かを名乗らせる。**型レベルのインクリメンタル開発。**

2. **blanket impl のおかげで、1 つの trait impl で複数の super-trait を満たせる。** \`WalCodec<Ctx>\` は自動的に \`impl<C> WalCodec<Ctx> for C where C: Codec<ProposedValue<Ctx>>\` で満たされる (Consensus/Sync も同様)。適切な **構成要素** \`Codec<T>\` impl を提供すれば、\`impl WalCodec\` は書かなくていい — Malachite が blanket impl を無料でくれる。コンパイル時アサーションテストが、これが本物であることを検証する。

3. **codec は \`types/\` ではなく \`consensus/\` に置く。** Codec はエンジン側の「何が wire 上を流れるか」という概念 (\`SignedConsensusMsg\`、\`ProposedValue\`、\`sync::Status\`) に依存する。これは consensus 層の関心事で、base 型の関心事ではない。Codec を \`types/\` に置くと、\`types/\` が \`informalsystems-malachitebft-app\` に依存することになり、エンジンを必要としない下流 crate にとって \`openhl-types\` が重い依存になってしまう。

この「\`types/\` に Codec を入れない」という規律は、依存グラフを 2 通り並べると違いが一目で見える:

\`\`\`
🟢 採用した設計 (clean dependency graph)
   ┌─────────────────────────┐                  ┌──────────────────────────────────┐
   │   openhl-evm            │ ─┐               │  openhl-consensus (Codec を保持)   │
   ├─────────────────────────┤   ▼               │   - bridge.rs / types/ / codec.rs │
   │   openhl-node           │ ─► openhl-types  │   - signing*.rs / context.rs       │
   ├─────────────────────────┤   ▲   (軽量、 ────►─── informalsystems-malachitebft-app
   │   (他の下流 crate)      │ ─┘   依存ゼロ)            (libp2p / ractor / 重量級)
   └─────────────────────────┘                  └──────────────────────────────────┘
       ※ EVM 側を直すたびに consensus / libp2p / ractor は触らない → 高速イテレーション

🔴 アンチパターン (codec を types/ に同居させた場合)
   ┌─────────────────────────┐
   │   openhl-evm            │ ─┐
   ├─────────────────────────┤   ▼
   │   openhl-node           │ ─► openhl-types (Codec も同居) ─► informalsystems-malachitebft-app
   ├─────────────────────────┤   ▲                                  (libp2p / ractor / 重量級)
   │   (他の下流 crate)      │ ─┘
   └─────────────────────────┘
       ※ EVM 側のロジックを 1 行直すだけでも、無関係な libp2p や actor system まで
         巻き添えでビルドが走り、初回 ~38 秒の依存解決を何度も払う羽目になる
\`\`\`

採用した形 (左) では、\`openhl-types\` は「皆が共通語彙として参照する軽量な辞書」のままで、重量級な consensus / libp2p / ractor の依存は \`openhl-consensus\` の中だけに閉じる。逆に右側のアンチパターンを取ると、\`openhl-types\` を引いている下流 crate 全部が libp2p までビルドする義務を負う。**「型は軽く保ち、重量級の依存は持ち込むべきレイヤーで持ち込む」** が \`crates/\` 構成の血肉になっている討議だ。

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

**Q: \`_msg\` や \`_bytes\` のアンダースコア接頭辞はなぜ必要なのか?**
Rust は未使用引数に \`_\` 接頭辞を要求する (unused-variable 警告を抑制するため)。\`&self\` は trait dispatch のために必要だが読まない。\`_msg\` / \`_bytes\` も同様に無視する。一部 stub では実際に **使う** こともあるが (ここでは使わない)、アンダースコアは「存在するのは認識しているが、使わない」を表す慣用句だ。

**Q: \`WalCodec\`、\`ConsensusCodec\`、\`SyncCodec\` の違いは?**
関連する codec impl をグループ化する sub-trait だ。\`WalCodec\` は \`ProposedValue\` の encoding を要求する。\`ConsensusCodec\` は \`SignedConsensusMsg\` + \`LivenessMsg\` + \`StreamMessage<ProposalPart>\` + \`ProposalPart\` を要求する。\`SyncCodec\` は \`Status\` + \`Request\` + \`Response\` を要求する。個別の \`Codec<T>\` trait を impl すれば、3 つの super-trait すべてが無料で手に入る。

**Q: stub が fire しないなら、そもそもなぜ存在するのか?**
Rust の trait システムは、runtime 構成に応じて impl を条件付きで含めたり除外したりできないからだ。エンジンの \`start_engine\` には \`C: ConsensusCodec<Ctx> + WalCodec<Ctx> + SyncCodec<Ctx>\` という trait bound があり、これは codec メソッドが実行されるかどうかに関係なくコンパイル時にチェックされる。**stub は型システムを満たすために存在するのであって、runtime を満たすためではない。**

**Q: stub を本物の impl に置き換えるのはいつか?**
エンジンが実際に呼んだときだ。レッスン 9 の smoke test は actor system を spawn していくつかのパスを exercise する。Stub が fire すれば、エラーメッセージがどれかを教えてくれる。最初に呼ばれる可能性が高いのは \`Codec<ProposedValue<OpenHlContext>>\` (WAL) だ — エンジンは peer gossip の前に、最初の proposal を crash recovery のためにディスクに書くからだ。そこを protobuf-backed encoder に差し替える。

## 次のレッスン (レッスン 9)

Codec trait bound を満たした — \`start_engine\` の signature を満たせる状態になった。だが、codec の **値**、node config、validator set のいずれも、\`start_engine\` が要求する形ではまだ持っていない。レッスン 9 では \`OpenHlNode\` に \`Node\` trait を実装する: \`OpenHlConfig\` (NodeConfig impl)、\`OpenHlGenesis\`、\`OpenHlPrivateKeyFile\`、\`OpenHlNodeHandle\`、そして 5 つの関連型と 12 メソッドを持つ \`Node\` impl 本体、合計 ~300 行だ。レッスン 9 の capstone は \`start_engine_smoke_spawns_and_kills\` — \`start_engine\` を呼び、actor system が ~0.02 秒で spawn / tear down することを証明するテストだ。レッスン 9 完了でエンジンは boot する。レッスン 10〜15 では AppMsg loop と Live Reth 統合を接続していく。`,
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

このレッスンで掴む概念:

- **runtime ではなく handshake 用 interface としての \`Node\`。** \`OpenHlNode\` は長命な設定 (key、validator set、home dir、moniker) を保持し、engine を *構築* する。実際に走っている actor system は \`start()\` が返す \`OpenHlNodeHandle\` の中にある。構築と実行は別ライフサイクルで、別の型に住む。
- **actor system spawn の surface。** \`start_engine\` が実際に何をするか (ractor cell の spawn、libp2p バインド、\`Channels<OpenHlContext>\` 確保)、なぜ \`EngineHandle\` を返すか、\`OpenHlNodeHandle\` がそれを \`NodeHandle<OpenHlContext>\` trait のためにどう wrap するか。
- **\`Mutex<Option<Channels>>\` の take-once セマンティクス。** channel handle がちょうど 1 回しか取り出せない理由。レッスン 10 の app loop がそれを消費し、以降の呼び出しは \`None\` を返す。所有権が移動した、というクリーンなシグナルになる。
- **address 導出の集中管理。** \`SHA-256(pubkey)[12..32]\` を *1 箇所* (\`get_address\`) にだけ書き、レッスン 6 runner の helper と一致することをテストで assert する。集中化 + 検証テストの組み合わせが、ファイル間の silent な drift を防ぐ。
- **\`todo!()\` ではなく型安全な placeholder。** \`run()\` は panic ではなく \`Err("not yet implemented (レッスン 10)")\` を返す。これを呼んだコードは graceful に失敗し、次のレッスンへの pointer 付きで止まる。PR や stale な tab を跨いでも生き延びるタイプのパンくずだ。
- **smoke test が必要な理由。** レッスン 8 のコンパイル時 \`assert_impl_all!\` は codec が trait を満たすことを証明した。Smoke test は *runtime* path — spawn、channel allocation、libp2p バインド、kill 伝播 — が end-to-end で動くことを証明する。型レベルは必要だが十分ではない。

検証:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

上記の実行結果が **20 個のテストすべてに合格する** (レッスン 8 から 16 個 + Node impl の新規 4 個)。Capstone テスト:

\`\`\`
test node::tests::start_engine_smoke_spawns_and_kills ... ok
\`\`\`

上記の実行結果が、自分のコードに対してフルな Malachite actor system を spawn し、チャンネルハンドルが 1 回だけ利用可能であることを assert し、actor system をクリーンに tear down する — **約 0.02 秒で**。本レッスン後、エンジンは起動する。残るは \`Channels<OpenHlContext>\` から消費して bridge を駆動する application loop だけだ。

具体的な変更:

- \`crates/consensus/Cargo.toml\` に 1 dep 追加: \`informalsystems-malachitebft-app-channel\`。
- \`crates/consensus/src/node.rs\` — 新規ファイル (~310 行)、\`OpenHlNode\`、\`OpenHlConfig\`、\`OpenHlGenesis\`、\`OpenHlPrivateKeyFile\`、\`OpenHlNodeHandle\`、\`impl Node for OpenHlNode\` (5 associated type、12 method)、unit test 4 個 (private-key 往復、config defaults、address 導出、\`start_engine\` smoke) を含む。
- \`crates/consensus/src/lib.rs\` — \`pub mod node;\` を組み込む。

## おさらい

レッスン 8 完了時点で \`openhl-consensus\` crate には以下がある:

\`\`\`
crates/consensus/src/lib.rs               — pub mod bridge, codec, context, signing, signing_provider, types
crates/consensus/src/codec.rs             — OpenHlCodec (1 個本物 + 7 個 stub Codec impl, テスト 2 個)
crates/consensus/src/signing_provider.rs  — SigningProvider<OpenHlContext>
crates/consensus/src/context.rs           — Context<OpenHlContext>
crates/consensus/src/types/               — 型ファイル 7 個
\`\`\`

\`cargo test -p openhl-consensus\` でテスト 16 個が合格する。\`start_engine\` が要求する trait bound は **型レベルでは** すべて満たしているが、まだ呼べない — \`Node\` impl も、config も、genesis も、private key file も、node handle も無いからだ。

## 計画

6 つやる:

1. **\`crates/consensus/Cargo.toml\` に 5 個の依存を追加する** — \`informalsystems-malachitebft-app-channel\` と \`informalsystems-malachitebft-config\`、signing-ed25519 に \`serde\` feature を有効化、\`serde\` と \`tokio\` をランタイム dep (dev だけでなく) に追加、\`tempfile\` を dev-dep に追加。
2. **\`crates/consensus/src/node.rs\` を作成する** — \`OpenHlConfig\` (impl \`NodeConfig\`)、\`OpenHlGenesis\` (unit struct)、\`OpenHlPrivateKeyFile\` (wire wrapper)、\`OpenHlNodeHandle\` (\`start()\` の戻り値)、\`OpenHlNode\` (メイン struct)、そして 5 個の関連型と 12 個のメソッドを持つ \`impl Node for OpenHlNode\`。
3. **\`pub mod node;\`** を \`lib.rs\` に組み込む。
4. **ユニットテストを 4 個** \`node.rs\` に追加する。
5. **実行** — \`cargo test -p openhl-consensus\` で 20 個合格する。
6. **じっくり見届ける** — \`start_engine_smoke_spawns_and_kills\` が 0.02 秒で合格するところを。**自分のコードが動く BFT エンジンになる瞬間だ。**

このレッスンが教えるのは **自分のコードと Malachite を結ぶブリッジパターン** だ。エンジンは他人が書いたもので、\`Context\` と \`Codec\` に対してジェネリックだ。spawn するには 5 つが必要だ: context インスタンス、node インスタンス (config、署名、address 導出を取るため)、config 値、codec 値、初期 height、validator set。\`Node\` trait は、Malachite が自分のコードからそれらを統一的に取り出すための **handshake インターフェース** だ。一度 impl してしまえば、同じハンドシェイクに従う任意の chain で \`start_engine\` が動くようになる。

> 🛑 **考えてみよう。** スクロールする前に: なぜ Malachite は \`OpenHlNode\` 自身に config フィールドを持たせず、別途 \`OpenHlConfig\` を要求するのか? ヒント: config の **所有者** と、いつ変わりうるかを考えてみる。Node はプロセス起動時に 1 回作成されるが、設定 (listen address、value payload mode、value sync 設定) はシグナルを受けてディスクから再ロードされうる。\`OpenHlConfig\` を \`OpenHlNode\` から分離しておけば、config は \`Node::load_config()\` 経由でロードでき — 再呼び出し可能で毎回新しい値を返せる — node を再インスタンス化せずに済む。

## 手順

### Step 1: \`crates/consensus/Cargo.toml\` を更新

\`crates/consensus/Cargo.toml\` を開く。レッスン 8 後の \`[dependencies]\` セクションは:

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

- **\`informalsystems-malachitebft-app-channel\`** — このあと呼ぶ \`start_engine()\` 関数と、エンジン通信用に返される \`Channels<Ctx>\` 型を提供する。
- **\`informalsystems-malachitebft-config\`** — \`OpenHlConfig\` に埋め込む \`ConsensusConfig\`、\`ValueSyncConfig\`、\`ValuePayload\` 型を提供する。
- **\`signing-ed25519\` の \`serde\` feature** — \`OpenHlPrivateKeyFile\` に \`Serialize\`/\`Deserialize\` を derive できるようにするためだ (\`PrivateKey\` newtype が serializable である必要がある)。
- **\`serde\`** (runtime dep) — \`OpenHlConfig\`、\`OpenHlGenesis\`、\`OpenHlPrivateKeyFile\` の \`#[derive(Serialize, Deserialize)]\` で使う。
- **\`tokio\`** を dev-dep から dep へ移動 — \`OpenHlNodeHandle\` が \`tokio::sync::Mutex\` を持つからだ。
- **\`tempfile\`** dev-dep — smoke test が node の home dir 用に temp ディレクトリを作るためだ。

これが 2 回目の重いコンパイルになる。初回の \`app-channel\` + \`config\` 取得でさらに ~20 秒かかる。

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

このファイルに必要な全表面だ。一度眺める価値がある: \`Node\`、\`NodeConfig\`、\`NodeHandle\` がこれから impl する 3 つの Malachite trait。\`EngineHandle\` + \`Channels\` が \`start_engine\` の戻り値。\`ConsensusConfig\` + \`ValueSyncConfig\` + \`ValuePayload\` が \`OpenHlConfig\` に埋め込む config 型。\`Keypair\` は libp2p の keypair 型。\`PrivateKey\`/\`PublicKey\` は レッスン 7 以来使っている Ed25519 型。\`Sha256\` は address 導出用だ。

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

- struct は \`ConsensusConfig\` と \`ValueSyncConfig\` をラップし、\`moniker\` (ログ用の validator ニックネーム) を追加する。\`consensus\` の \`#[serde(flatten)]\` は consensus フィールドを親に inline する — ディスクへシリアライズしたとき、ユーザーには \`[consensus]\` セクションのキーが top level に見え、\`consensus.\` の下にネストされなくなる。
- \`new()\` は重要な選択を 1 つ強制する: \`value_payload: ValuePayload::ProposalOnly\`。これは \`Context::ProposalPart = OpenHlProposalPart\` (unit struct) と **必ず** 合致しなければならない。誤って \`ValuePayload::PartsOnly\` を設定すると、エンジンはストリームされる proposal parts を期待するが、unit-struct の \`ProposalPart\` ではエンジンが送るものを満たせない。これは、後でデバッグするより構築時に強制するほうが簡単な種類の不変条件だ。
- \`NodeConfig\` impl は 3 個の自明な accessor。trait は、Malachite が親のレイアウトを知らずに sub-config を取り出せるようにするためだけに存在する。

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

- **\`OpenHlGenesis\`** — unit struct。v0 では genesis に乗せるコンテンツがない (allocation なし、ブート時の precompile 登録なし — それらは ステップ 6 で扱う)。Validator set は genesis ではなく \`start_engine\` 経由で直接渡す。OpenHL が 実際の genesis format を持つようになったら、これが \`load_genesis()\` がデシリアライズする型になる。
- **\`OpenHlPrivateKeyFile\`** — 32 バイトの private key の wire-friendly wrapper だ。\`PrivateKey\` 自体 (\`malachitebft_signing_ed25519\` 由来) はデフォルトで \`Serialize\`/\`Deserialize\` を impl していない。wrapper が impl し、\`from_private_key\` / \`into_private_key\` での変換は明示的に行う。**手書きの \`Debug\` impl** はバイトを redact する — \`{:?}\` で実 private key がログに出てしまうのは重大なセキュリティバグだ。\`[redacted]\` トークンが慣習になっている。

> 🛑 **やりがちな勘違い。** 「なぜ \`#[derive(Debug)]\` ではダメなのか?」 **デフォルトで derive される \`Debug\` は \`[u8; 32]\` の 32 バイト全部を print するからだ。** 誰かが \`OpenHlPrivateKeyFile\` を別の \`Debug\`-derive 構造体でラップしてログに出すと、key が stderr / log file / Sentry にリークする。\`[redacted]\` 付きの手書き \`Debug\` なら、意図的に変更しない限りこれは起こりえない。**Private key はパスワードと同等に扱い、絶対に print させない。**

ここから先で扱う \`OpenHlNode\` と \`OpenHlNodeHandle\` の関係を 1 枚で見ると、本レッスンの設計判断 — 「**構築 (静的な設定) と実行 (動的な actor system) を別の型に住み分けさせる**」 — が直感で押さえられる:

\`\`\`
┌─────────────────────────────────────────────────────────────────────────┐
│ ◆ ライフサイクル 1: 静的な設定・構築 (Node)                              │
│                                                                          │
│   OpenHlNode {                                                            │
│       private_key, validator_set,                                         │
│       home_dir, moniker, …                                                │
│   }                                                                       │
│                                                                          │
│   ・プロセス起動時に 1 回 new、長命                                       │
│   ・engine は**まだ走っていない** (config を保持しているだけ)             │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │  .start().await   ◄── handshake (Node trait)
                             │                        の実行 (Step 5)
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ ◆ ライフサイクル 2: 動的な実行・actor system (Handle)                    │
│                                                                          │
│   OpenHlNodeHandle {                                                      │
│       engine   : EngineHandle           ──► ractor cell + libp2p が起動中 │
│       channels : Mutex<Option<Channels<OpenHlContext>>>                   │
│                                         ──► レッスン 10 の app loop が \`take()\`  │
│                                            で 1 回だけ引き抜く            │
│   }                                                                       │
│                                                                          │
│   ・\`start()\` の戻り値、\`.kill().await\` するまで生存                      │
│   ・所有権の流れは Node → Handle → app loop の一方通行                    │
└─────────────────────────────────────────────────────────────────────────┘
\`\`\`

ポイントは 3 つ: (a) **\`OpenHlNode\` は config を抱えるだけで、actor system を所有しない** — \`start()\` を呼ぶまで何のスレッドも立たない。(b) **\`OpenHlNodeHandle\` は実行中の actor system + 通信チャネルを所有** — engine と libp2p のライフタイムはこの handle に bind されている。(c) **\`Mutex<Option<Channels<...>>>\` は所有権の一方通行ゲート** — \`take()\` で レッスン 10 の app loop に渡したら二度と取り戻せず、「もう消費済み」を \`None\` という値で型レベルに表明する。レッスン 9 の \`run()\` メソッドが「未実装」エラーを返すのは、この (c) の **app loop 側 (レッスン 10)** がまだ書かれていないからだ。

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
    /// the second call. レッスン 10 will consume from this to drive the bridge.
    pub async fn take_channels(&self) -> Option<Channels<OpenHlContext>> {
        self.channels.lock().await.take()
    }
}

#[async_trait]
impl NodeHandle<OpenHlContext> for OpenHlNodeHandle {
    fn subscribe(&self) -> informalsystems_malachitebft_app::events::RxEvent<OpenHlContext> {
        // No event subscription in Stage 6c — caller can't yet observe engine
        // events. レッスン 10 wires the TxEvent from the engine to here.
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
- **\`channels: Mutex<Option<Channels<OpenHlContext>>>\`** — アプリケーション側のエンドポイント。エンジンが \`AppMsg<OpenHlContext>\` を送ってきて、こちらが \`AppReply<OpenHlContext>\` を返す。\`Mutex<Option<...>>\` にしているのは、\`take_channels()\` で app loop に 1 回だけ渡せるようにするためだ — 2 回目の呼び出しは \`None\` を返して「もう消費済み」と知らせる。

**なぜ \`std::sync::Mutex\` ではなく \`tokio::sync::Mutex\` を使うのか?** \`take_channels()\` が \`async\` で、ロックが \`.await\` 境界をまたいで保持されるからだ。\`std::sync::Mutex\` だと executor スレッド全体をブロックしてしまう。\`tokio::sync::Mutex\` は協調的に yield する。

\`NodeHandle\` impl はこの段階ではほぼ placeholder だ:
- \`subscribe()\` は **新規** の \`TxEvent::subscribe()\` を返す — producer が attach されていない空のイベントストリームだ。レッスン 10 で本物を組み込む。
- \`kill()\` は本物だ — actor cell を kill し、tokio task を abort する。これが \`start_engine_smoke_spawns_and_kills\` で exercise される。

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
        // レッスン 10 will consume from channels here and run the app loop.
        Err(eyre!("OpenHlNode::run is not yet implemented (レッスン 10)"))
    }
}
\`\`\`

これが load-bearing なブロックだ。順に見ていく:

**struct** は 4 つを持つ: private key、validator set、home dir、moniker。これらは config-reload では変わらない長命なフィールドだ。

**6 個の関連型** は、各ハンドシェイクスロットの具象型を宣言する:
- \`Context = OpenHlContext\` — Malachite が他をすべて typecheck するのに使う
- \`Config = OpenHlConfig\` — \`load_config()\` の戻り値
- \`Genesis = OpenHlGenesis\` — \`load_genesis()\` の戻り値
- \`PrivateKeyFile = OpenHlPrivateKeyFile\` — \`load_private_key_file()\` の戻り値
- \`SigningProvider = OpenHlSigningProvider\` — \`get_signing_provider()\` の戻り値
- \`NodeHandle = OpenHlNodeHandle\` — \`start()\` の戻り値

**12 個のメソッド**:

| メソッド | 目的 | 本体 |
| :--- | :--- | :--- |
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
| \`run\` | App loop を回す | **レッスン 9 では未実装** — レッスン 10 を指すエラーを返す |

**\`start()\` メソッドがハイライトだ。** \`start_engine\` を以下で呼ぶ:
- context (\`OpenHlContext\` — unit struct)
- node 自身 (\`self.clone()\`)
- config (\`cfg\`)
- 2 個の codec 値 (WAL 用と Network 用 — 両方 \`OpenHlCodec\`)
- 初期 height (\`Some(OpenHlHeight::INITIAL)\`)
- validator set (\`validator_set\`)

\`start_engine\` の戻り値は \`(Channels<OpenHlContext>, EngineHandle)\` だ。これらを \`OpenHlNodeHandle\` にラップして返す。

**なぜ \`run()\` は未実装なのか?** Malachite の \`Node::run\` は \`start()\` と app loop を 1 個の async future にまとめる想定だからだ。App loop は レッスン 10 まで存在しないので、レッスン 10 を指すエラーを返しておく。レッスン 10 完了後の \`run()\` は、\`start()\` を呼び、channels を取り、app loop を回して終了を await する、という形になる。

> 🛑 **やりがちな勘違い。** 「なぜ \`start()\` は codec を 2 回取るのか?」 **エンジンが WAL 用と Network gossip 用に別々の codec スロットを持つからだ。** 別の型でも構わない — 例えば WAL は bincode、Network は protobuf でもよい。こちらのケースでは両方 \`OpenHlCodec\` だが、API は同一だと仮定しない。別々に渡すことで、一方だけを差し替えられる。

### Step 6: \`node.rs\` を \`lib.rs\` に組み込む

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
    /// Does NOT drive consensus — that's レッスン 10.
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

1. **\`private_key_file_round_trips\`** — key を generate し、\`OpenHlPrivateKeyFile\` にラップ、unwrap し、byte 等価を assert する。Wire format が lossless であることを証明する。
2. **\`load_config_sets_proposal_only_payload_and_ephemeral_listen_addr\`** — node を構築し、\`load_config()\` を呼び、2 つを検証する: \`value_payload == ProposalOnly\` (構築時に強制した不変条件) と、\`listen_addr\` がエフェメラルな local socket であること。Config drift を catch する。
3. **\`get_address_matches_runner_derivation\`** — 同じ address を 2 通りで導出する (1 度は trait method 経由、1 度は SHA-256 ロジックを inline で書く)。両者が一致することを assert する。誰かが片方だけ変えたら検知できる。
4. **\`start_engine_smoke_spawns_and_kills\`** — capstone だ。\`#[tokio::test(flavor = "multi_thread", worker_threads = 2)]\` を使うのは、エンジンが multi-threaded runtime を要求する (複数 actor を spawn する) からだ。手順は次のとおり: single-validator node を構築し、\`node.start().await\` を呼び、channels handle を poke (1 度目で \`Some\`、2 度目で \`None\`)、\`kill()\` を呼ぶ。**これが pass すれば、自分のコードが動く BFT エンジンになっている。**

Smoke test の wall-clock はおおよそ **0.02 秒**。大部分は libp2p がローカル listener を立ち上げる時間だ — tcp/0 のエフェメラルポートでも、libp2p のネゴシエーションには固定コストがある。

> 🛑 **やりがちな勘違い。** 「なぜ \`flavor = 'multi_thread'\` なのか?」 **エンジンが複数 actor をそれぞれの task として spawn するからだ。** Single-threaded runtime でも 1 スレッドに全部回せる — だが、エンジン内部に single-thread だと deadlock する \`block_on\` パターンがある。Multi-thread runtime で回避する。**API レベルでは見えないが、テスト失敗レベルでは致命的な詳細だ。**
> \`current_thread\` では \`block_on(...)\` が唯一のワーカーを占有し、内側 future を進める実行者が消えるため、初期化が永久ハングしうる。\`multi_thread\` なら別ワーカーが残りの future を進められる。Malachite / ractor / libp2p の組み合わせではこのパターンを踏むので、テスト側で multi-thread を強制する。

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

Smoke test は multi-thread runtime のセットアップが入るので、最後に走る。

よくあるエラーと対処:

- **\`error[E0432]: unresolved import 'informalsystems_malachitebft_app_channel'\`** — Cargo.toml に \`app-channel\` が無い。Step 1 を再確認。
- **\`error[E0277]: PrivateKey: Deserialize is not satisfied\`** — \`signing-ed25519\` の \`serde\` feature が抜けている。Step 1 (\`features = ["rand", "serde"]\`) を再確認。
- **smoke test が永久にハングする** — 普通は \`flavor = "current_thread"\` (\`#[tokio::test]\` のデフォルト) が原因だ。Step 7 を再確認: 属性は \`#[tokio::test(flavor = "multi_thread", worker_threads = 2)]\` でなければならない。
- **\`error: Keypair::ed25519_from_bytes expected mutable bytes\`** — バージョン不一致だ。libp2p の \`Keypair::ed25519_from_bytes\` のシグネチャはバージョンによって変わる。workspace pin は \`informalsystems-malachitebft-app\` の re-export と揃える必要がある。
- **\`Address derivation does not match\`** — \`get_address\` がテストの helper と一致していない。両方とも \`SHA-256(pubkey)\` の最後の 20 バイト (slice \`[12..32]\`) を使う必要がある。

## 設計の振り返り

3 つの load-bearing な決定:

1. **\`OpenHlNode\` はハンドシェイクインターフェースであって、ランタイムではない。** struct は長命なフィールド (key、validator set、home dir、moniker) を持つ。chain を **走らせ** たりはしない。ランタイムは \`OpenHlNodeHandle\` (engine + channels) にあり、\`start()\` から返る。**構築と実行は別のライフサイクルステージ** なので、別の型に住まわせる。

2. **Address 導出は \`get_address\` に集約する。** レッスン 6 のセットアップコードで runner が \`SHA-256(pubkey)[12..32]\` を使ったときと **同じ導出** だ。テスト \`get_address_matches_runner_derivation\` が両者の同一性を assert するので、将来のリファクタで一方だけがサイレントに drift することはない。**集約 + 検証テスト は重複に毎回勝つ。**

3. **\`run()\` は次のレッスンを指すエラーを返す。** \`unimplemented!()\` (panic) や \`todo!()\` (これも panic) ではなく、\`eyre::Result::Err("not yet implemented (レッスン 10)")\` を返すのは **型安全な placeholder** だ。\`run()\` を呼ぶコードは、「どこを見るべきか」を指すメッセージ付きで graceful に失敗する。**これはプルリク、コードレビュー、放置されたタブを越えて生き残るタイプの目印だ。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout d59d6cf
diff -u ~/code/my-openhl/crates/consensus/src/node.rs ./crates/consensus/src/node.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
\`\`\`

\`d59d6cf\` の参照には 310 行の \`node.rs\` が含まれる。\`Node\` impl のメソッド (合計 12)、struct レイアウト、smoke test は厳密に一致するはず。Doc コメントと細かい言い回しは個人差があってよい。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: validator set が node の中にあるのに、なぜ \`start_engine\` は node と validator set の両方を要求するのか?**
エンジンが node の内部に手を伸ばさないようにしているからだ。Node は多くのフィールド (path、moniker、key など) を持つが、validator-set election にはそれらは関係ない。\`start_engine\` が validator set を明示的に受け取れば、エンジンは node の具体的なフィールドレイアウトを知らずに済む。\`Node::load_config()\` と同じ関心の分離の原則だ。

**Q: コンパイル時アサーションが証明しないことを、smoke test は何を証明するのか?**
レッスン 8 のコンパイル時アサーションは \`OpenHlCodec: WalCodec + ConsensusCodec + SyncCodec\` を証明した。Smoke test は **runtime** パス — actor spawning、channel allocation、libp2p binding、kill propagation — が end-to-end で実際に動くことを証明する。型安全性は必要条件だが十分条件ではない。テストは「spawn deadlock」や「最初のメッセージでエンジンが panic する」など、型では catch できないことを catch する。

**Q: \`EngineHandle\` と \`NodeHandle\` の違いは?**
\`EngineHandle\` (Malachite 由来) は、spawn された actor system への低レベルハンドルだ — actor cell と tokio task handle を持つ。\`NodeHandle\` (自前の trait) は、Malachite が「これはまだ生きているか? イベントを subscribe してくれ。kill しろ」と尋ねるための高レベル抽象だ。自前の \`OpenHlNodeHandle\` は \`NodeHandle<OpenHlContext>\` を impl し、内部に \`EngineHandle\` を持つ。2 層あるが、扱うのは 1 つだけだ。

**Q: なぜ \`take_channels\` は単に channels を削除せず、\`Option<Channels<...>>\` を使うのか?**
\`take_channels\` は **外側から** 呼ばれるからだ — app loop が消費したい。完全に削除するには mutable 参照かハンドル自体の move が必要になる。\`Mutex<Option<...>>\` なら app loop は共有参照 (\`&self\`) 経由で呼べ、channels を 1 度取得し、以降の呼び出しは \`None\` を見る — 「もう取った」というクリーンなシグナルになる。

## 次のレッスン (レッスン 10)

エンジンは動く状態になった。だが — 致命的に — **エンジンがメッセージを送ってきているのに、こちらは無視している。** Actor system は parked 状態で、app loop が \`Channels<OpenHlContext>\` から消費し、\`AppMsg::ProposeValue\` や \`AppMsg::Decided\` などに応答するのを待っている。レッスン 10 で app loop を実装する: channel に対する \`tokio::select\` + state struct + エンジンメッセージを \`InMemoryEvmBridge\` にルートするハンドラ。レッスン 10 完了で、\`cargo test first_block_via_engine_actors\` がフルな engine pipeline 経由で実 block を 生成する。`,
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

このレッスンで掴む概念:

- **\`AppMsg\` のルーティングループ。** Malachite engine が単一の channel に \`ConsensusReady / GetValidatorSet / StartedRound / GetValue / Decided / …\` を流してくる。app loop は \`while let Some(msg) = recv().await\` で各 variant に match し、\`oneshot::Sender\` に reply するか bridge を駆動するかのどちらかをやる。これが Malachite と EL を繋ぐ *唯一* の接着剤だ。
- **bridge に対する generic な多相性。** \`run_engine_app<B: ConsensusBridge>\` は \`StubBridge\`、\`InMemoryEvmBridge\`、\`RethEvmBridge\`、そしてやがて \`LiveRethEvmBridge\` でも動く。ルーティング関数 1 つに対して backend 4 つ。レッスン 3 の trait surface がここで効いてくる。
- **test ergonomics としての \`stop_after_decisions\`。** production の validator は \`usize::MAX\` を渡し、テストは \`1\` を渡す。「関数が有限状態でテスト可能であるためにだけ」存在する引数も正当な API 設計だ。test ergonomics は API 表面に値する。
- **reply channel が途中で閉じうる。** こちらが reply する前に engine actor が死ぬと \`oneshot::Sender::send()\` が err を返す。propagate ではなく \`tracing::warn!\` でログを残すのが正解 — propagate は本物のエラーをノイズで隠してしまう。operator はログから調査できる。
- **channel と event-stream のメッセージフローの違い。** \`channels.consensus.recv()\` は *命令的* メッセージ (reply 必須)、\`subscribe()\` は *broadcast* な通知 (reply 不要)。レッスン 10 の app loop は前者だけを扱う。
- **この層で integration > unit になる理由。** engine の \`AppMsg\` arm は決まった順序で届く。その順序を fake するより、実際の engine を 1 block 分だけ回すほうが安い。integration test のほうが書くコストが低く、証明できる範囲も広い。

検証:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

上記の実行結果が **21 個のテストすべてに合格する** (レッスン 9 から 20 個 + 新規 integration test 1 個)。新規テスト:

\`\`\`
test engine_app::tests::first_block_via_engine_actors ... ok
\`\`\`

上記の実行結果が Malachite actor system を spawn し、そこに実際の consensus round を駆動し、engine が確定させた hash を bridge が正確に commit したことを assert する。**Wall-clock: 0.02 秒。** これが「engine が boot する」から「engine が block を生成する」へ移るマイルストーンだ。

具体的な変更:

- \`crates/consensus/src/engine_app.rs\` — 新規ファイル (~282 行)。\`run_engine_app<B: ConsensusBridge + 'static>\` が \`Channels<OpenHlContext>::consensus\` から \`AppMsg<OpenHlContext>\` を読み、12 個の message arm (substantive 5 + trivial 7) を dispatch し、decided hash のリストを返す。
- 同ファイル内に \`StubBridge\` test fixture と \`first_block_via_engine_actors\` integration test。
- \`crates/consensus/src/lib.rs\` — \`pub mod engine_app;\` を組み込む。

## おさらい

レッスン 9 完了時点で \`openhl-consensus\` crate には以下がある:

\`\`\`
crates/consensus/src/lib.rs               — pub mod bridge, codec, context, node, signing, signing_provider, types
crates/consensus/src/node.rs              — OpenHlNode + start_engine works (smoke test 合格)
crates/consensus/src/codec.rs             — OpenHlCodec
crates/consensus/src/signing_provider.rs  — SigningProvider impl
crates/consensus/src/context.rs           — Context impl
crates/consensus/src/types/               — 型ファイル 7 個
crates/consensus/src/bridge.rs            — ConsensusBridge trait + InMemoryEvmBridge
\`\`\`

\`cargo test -p openhl-consensus\` でテスト 20 個が合格する。Engine は起動も終了もするが、**silent だ。** \`start_engine\` が返ると同時に engine の actor は \`AppMsg::ConsensusReady\` を送り、reply を待つ。誰も reply しない。Actor は parked になる。**レッスン 10 がそこを修正する。**

## 計画

5 つやる:

1. **\`crates/consensus/Cargo.toml\` に \`tracing\` を追加する** — loop の「channel-closed」パスで \`tracing::warn!\` を使う。
2. **\`crates/consensus/src/engine_app.rs\` を作成する** — \`B: ConsensusBridge\` に対してジェネリックな async 関数 \`run_engine_app<B>\` と \`default_attrs()\` ヘルパー。ルーティングロジックは約 130 行。
3. **\`pub mod engine_app;\`** を \`lib.rs\` に組み込む。
4. **integration test \`first_block_via_engine_actors\`** と \`StubBridge\` test fixture (\`ConsensusBridge\` を同期的にインメモリで impl したもの) を追加する。
5. **実行** — \`cargo test -p openhl-consensus first_block_via_engine_actors\` が約 0.02 秒で合格する。**じっくり見届けよう。**

このレッスンが教えるのは **actor-message-loop パターン** だ。ほとんどの consensus engine (CometBFT、Hotstuff、Aura) は **何らかの** 「application interface」を持つが、形は様々だ: callback、gRPC service、FFI バインディングなど。Malachite のアプローチは型付きメッセージの \`tokio::mpsc\` チャネル — 強型、async-native、チャネルごとに single-threaded だ。\`run_engine_app\` はそれらメッセージの **consumer**、engine actor は **producer** になる。**このパターンを理解すれば、どの chain フレームワークの「application interface」もそのバリアントに帰着する。**

> 🛑 **考えてみよう。** スクロールする前に: engine が \`AppMsg::GetValue\` (「次の block を propose しろ」) を送ってきたとき、app はなぜ \`BlockHash\` だけでなく \`LocallyProposedValue(height, round, value)\` で reply するのか? ヒント: engine が rest-of-consensus を通じて wire する value は、commit する value だ。hash だけ送ったら、engine は他の validator に proposal の内容を gossip したり certificate に含めたりする手段がない。**ラップすることで value が BFT machine 内で first-class になる。** (こちらの single-validator devnet では他の validator が gossip を受け取らないが、engine は自分が solo で走っていることを **知らない**。)

## 手順

### Step 1: Cargo.toml に \`tracing\` を追加

\`crates/consensus/Cargo.toml\` を開く。レッスン 9 後、\`[dependencies]\` セクションは次で終わっている:

\`\`\`toml
sha2                                          = "0.10"
serde                                         = { workspace = true }
tokio                                         = { workspace = true }
\`\`\`

1 行追加:

\`\`\`toml
tracing                                       = { workspace = true }
\`\`\`

\`tracing\` は workspace 標準の logging crate だ。ここでは \`tracing::warn!\` を 1 ケースだけ使う: reply channel が、engine が会話途中で終了したために閉じている場合だ。\`tokio::mpsc::oneshot\` の closed reply channel はこちらのコードのバグではない — 上流が諦めたサインだ。ログするが伝播はしない。

### Step 2: \`crates/consensus/src/engine_app.rs\` を作成 — import と signature

モジュール doc + import から:

\`\`\`rust
//! Engine app loop — consumes \`AppMsg\` from the Malachite engine and routes
//! every consensus-relevant event through a [\`ConsensusBridge\`].
//!
//! This is the missing half of レッスン 9: with \`OpenHlNode::start()\` spinning
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

注目すべき import:

- **\`AppMsg, Channels\`** (\`app_channel\` から) — メッセージ enum と channel-bundle 型。\`Channels::consensus\` が \`AppMsg<Ctx>\` の mpsc receiver だ。
- **\`Next\`** (\`app::engine::host\` から) — \`Decided\` の reply で engine に「次は何か?」を伝える enum (次の height を start、停止、など)。
- **\`Height as _\`** — trait \`Height\` を import するが (\`.increment()\` メソッドを使うため)、名前を scope に入れない (自前の \`OpenHlHeight\` newtype を使うため)。
- **\`Arc\`** — \`run_engine_app\` は bridge を \`Arc<B>\` で取り、long-running task に参照を clone できるようにする。

次に関数 signature:

\`\`\`rust
/// Drive the engine app loop until \`stop_after_decisions\` decisions have been
/// committed through the bridge, or the consensus channel closes.
///
/// Returns the \`BlockHash\`es that were decided, in order. Single-validator mode
/// uses this with \`stop_after_decisions = 1\` to exit after the first block.
#[allow(clippy::too_many_lines)] // 12 AppMsg arms — laid out flat for lesson レッスン 11's match-by-match walk
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

- **\`bridge: Arc<B>\`** — \`build_payload\`、\`payload_ready\`、\`commit\` で app loop が呼ぶ \`ConsensusBridge\` 実装だ。後で share したいので \`Arc\` にしている。\`B\` がジェネリックなので、同じ loop が \`InMemoryEvmBridge\`、\`RethEvmBridge\`、\`LiveRethEvmBridge\` (レッスン 12) で動く。
- **\`channels: Channels<OpenHlContext>\`** — value で取る (そのあと \`mut\` にして \`recv\` を呼ぶ)。呼び出し側で \`take_channels()\` した後の channels を所有する。
- **\`validator_set: OpenHlValidatorSet\`** — \`ConsensusReady\` と \`GetValidatorSet\` で echo back する single-validator set だ。
- **\`stop_after_decisions: usize\`** — test 用エルゴノミクス。Single-validator devnet では \`1\`、multi-validator デプロイでは \`usize::MAX\` を渡す。

3 個の loop 状態:

- **\`decided: Vec<BlockHash>\`** — アキュムレータ。終了時に返す。
- **\`current_parent: BlockHash\`** — **次の** block が積み上がる先。全ゼロ (genesis) から始まり、commit ごとに just-decided hash になる。
- **\`current_height: OpenHlHeight\`** — engine が今いる height。\`INITIAL\` から始まり、\`StartedRound\` と \`Decided\` で bump される。

\`while let Some(msg) = channels.consensus.recv().await\` loop が actor-message app の心臓だ: message を receive、variant で dispatch、(該当するなら) reply、continue。\`recv()\` が \`None\` を返したら channel が閉じている — それが error path だ。

12 個のアームを 1 つずつ書く前に、この loop が何と何を繋いでいる中継地点なのかを 1 枚で見ておくと、各アームの「誰から来て、誰に返すか」を迷わず追える:

\`\`\`
   [ Malachite Engine actors ]  (producer 側 — proposal / vote / Decided 等を生成)
              │
              │ AppMsg::ConsensusReady { reply, validator_set }
              │ AppMsg::GetValue       { reply, height, round, ... }
              │ AppMsg::Decided        { reply, certificate, ... }
              │ … (合計 12 variant、\`tokio::mpsc\` で 1 本のチャネルに流れてくる)
              ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ ◆ app_task: run_engine_app loop  (consumer 側、本レッスンで書く中央指令塔) │
   │                                                                            │
   │  while let Some(msg) = channels.consensus.recv().await { match msg { … } } │
   │                                                                            │
   │  各 arm がやることは 2 種類だけ:                                            │
   │   1. reply.send(...)  ──► engine に値を返してアンブロックする               │
   │   2. bridge.<method>().await ──► EL 側を駆動して結果を受け取る              │
   └──────────────────────────────────────────────────────────────────────────┘
              │                                                  ▲
              │ bridge.build_payload / payload_ready / commit    │ FillResult /
              ▼                                                  │ ExecutedBlock / Ok
   [ ConsensusBridge impl ]  (StubBridge / InMemoryEvmBridge / RethEvmBridge / LiveRethEvmBridge)


   ── 代表的な 1 サイクル ──────────────────────────────────────────────────

   ① ConsensusReady    ── engine ──► app: 「準備できた、validator set を寄越せ」
                          app ──► engine: reply.send(validator_set)

   ② GetValue          ── engine ──► app: 「次の block を propose しろ (height, round)」
                          app ──► bridge.build_payload + payload_ready
                          app ──► engine: reply.send(LocallyProposedValue(value))

   ③ Decided           ── engine ──► app: 「2/3+ で commit が成立した、certificate 入り」
                          app ──► bridge.commit(hash)
                          app ──► engine: reply.send(Next::Start)  または  Next::Stop
                          decided.push(hash)
                          if decided.len() >= stop_after_decisions { return Ok(decided) }
\`\`\`

3 つの focal point: (a) **メッセージは engine → app の **片方向**だが、各メッセージに \`oneshot::Sender\` (reply) が同梱されている** ので、app が reply を返すまで engine 側の処理は parked になる (reply を忘れるとそこで永久に止まる)。(b) **app は engine と bridge の中継地点**であり、ロジック本体ではない — 重い計算 (build/commit) は bridge 側、合意の駆動は engine 側に閉じている。(c) **bridge が \`B: ConsensusBridge\` の generic なので、同じ loop で \`StubBridge\` / \`InMemoryEvmBridge\` / \`RethEvmBridge\` / \`LiveRethEvmBridge\` が全部走る** — レッスン 3 で trait surface を綺麗に定義した投資が、ここで多態性として効いてくる。

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

**\`ConsensusReady\`** は engine からの「consensus を start していいか? どの height でどの validator set で?」という問いだ。Reply は tuple \`(current_height, validator_set.clone())\`。各 \`reply\` は \`oneshot::Sender<...>\` で、\`send()\` はそれを consume して \`Result<(), T>\` を返す (\`T\` は送ろうとしたもので、エラー時に返却される)。Closed reply channel からは回復しない — 単にログするだけだ。

**\`StartedRound\`** は engine からの「ある height で new round が始まった」という通知だ。\`current_height\` を更新し、空の \`Vec\` で reply する (この height で格納済みの proposed value のリスト。何も cache していない)。\`round: _\` で round 値を unbind しているのは、single-validator mode では不要だからだ — peer がない場合、engine は round 間で value を gossip-restream しない。

### Step 4: \`GetValue\` arm — proposal を build

これが load-bearing な arm だ。追加する:

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

Engine からの問いは「height H、round R で value を propose しろ、timeout T」だ。こちらは:

1. **payload attrs を build する** — 今のところデフォルト値だ (\`timestamp: 0\`、\`fee_recipient: zero\`、\`prev_randao: zero\`)。レッスン 12 ではこれらが engine の時刻概念や validator の address から来るようになる。
2. **\`bridge.build_payload(current_parent, attrs).await\`** — EL を蹴る: 「\`current_parent\` の上に、これらの attrs で block を build しろ」。\`PayloadId\` を返す — in-flight build を track するために EL が使うハンドルだ。
3. **\`bridge.payload_ready(id).await\`** — 完了した block を fetch する。レッスン 4〜5 の in-memory bridge は即座に 生成する。live Reth (レッスン 12+) では 10-50ms かかるかもしれない。
4. **\`block.hash\` を \`OpenHlValue\` でラップし、さらに \`LocallyProposedValue::new(height, round, value)\` でラップする。**
5. **engine に \`LocallyProposedValue\` で reply する。**

\`build_payload\` と \`payload_ready\` の \`?\` 演算子は \`BridgeError\` を \`eyre::Result\` に伝播する。EL が build 途中で crash したら、app loop はエラーを返し、テストは大きな声で失敗する。

> 🛑 **やりがちな勘違い。** 「\`GetValue\` はなぜ \`OpenHlValue\` だけでなく \`LocallyProposedValue\` で reply するのか?」 **Engine がこちらの propose したものを、ローカルで使うだけでなく **gossip** する必要があるからだ。** \`LocallyProposedValue\` は「この value を **こちらが** height H round R で propose した」と言う型付きラッパーだ。Multi-validator モードでは engine がこれを \`Proposal\` として peer に送る。Single-validator モードでは peer はいないが、API は分岐しないので、ラッパーを honor する。

### Step 5: \`Decided\` arm — block が final になる瞬間

もう一つの load-bearing な arm だ。追加する:

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

Engine は「height H で value が decide された — certificate はこれだ」と告げる。こちらは:

1. **\`certificate.value_id\` から** decided hash を抽出する。
2. **\`bridge.commit(hash).await\`** — この block を EL でカノニカルチェインの head として durably mark する。In-memory bridge では単に記録し、live Reth では forkchoice update を実行する。
3. **\`decided\` に append し**、\`current_parent\` を更新する。これで **次の** \`GetValue\` がこの hash の上に build するようになる。
4. **exit 条件をチェック** — \`stop_after_decisions\` に達したら \`Next::Start(next_height, ...)\` で reply してから (engine が hang しないように) return する。**これによってテストが 0.02 秒でクリーンに exit する。**
5. **そうでなければ**、\`Next::Start(next_height, validator_set)\` で reply して — 「はい、次の height で続けてください、validator set はこれです」 — loop する。

> 🛑 **考えてみよう。** exit path なのになぜ reply を送るのか? **\`oneshot::Sender::send\` が、reply を待っている engine actor を unblock する唯一の方法だからだ。** 単に \`return Ok(decided)\` すると、engine actor は drop された sender を \`await\` し続けて stuck になり、tear-down が遅くなる (やがて \`kill_and_wait\` がクリーンアップする)。先に reply しておけば engine actor は自然に終了し、\`handle.kill(None)\` は inevitable を確認するだけになる。

### Step 6: その他 7 arm — stub と no-op

残りの arm は短い。追加する:

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

- **Vote extension** (\`ExtendVote\`、\`VerifyVoteExtension\`) — \`None\` / \`Ok(())\` で reply する。Vote extension は v0 では未使用だ (\`OpenHlSigningProvider::sign_vote_extension\` が空バイトに署名するのと対応する)。
- **No-op** (\`RestreamProposal\`) — single-validator では proposal を re-stream しないので、何もしない。Reply は期待されない。
- **History/sync** (\`GetHistoryMinHeight\`、\`GetValidatorSet\`、\`GetDecidedValue\`、\`ProcessSyncedValue\`) — peer catch-up 中に使う。デフォルトで reply する: \`INITIAL\` height (history なし)、現在の validator set、「過去 block をくれ」には \`None\`。Peer がなければ catch-up は exercise されないが、engine は問い合わせてくる。
- **ProposalOnly モード** (\`ReceivedProposalPart\`) — \`OpenHlConfig\` が \`ValuePayload::ProposalOnly\` を設定しているので、proposal part は来ない。それでも variant は handle する必要があり、\`None\` で reply する。

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

3 フィールドすべてゼロでも、bridge は受け入れる。レッスン 12 ではこれらが real になる:
- \`timestamp\` は engine から来る (テストでは wall clock から)。
- \`fee_recipient\` は validator が configure した payout address から来る。
- \`prev_randao\` は前 block の hash から BLS 経由で導出される。

今は全部ゼロでも、テストは気にしないし、in-memory bridge も検証しない。

### Step 8: \`engine_app.rs\` を \`lib.rs\` に組み込む

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

- **\`StubBridge\`** — すべてに \`BlockHash([0x42; 32])\` を返す \`ConsensusBridge\` だ。Production-grade な test fixture のパターン: インメモリ状態 (\`Mutex<Option<...>>\` と \`Mutex<Vec<...>>\`)、Arc-able、async-friendly。Loop が走った後、テストは \`last_built\` と \`committed\` を読んで bridge が何を見たかチェックできる。
- **\`make_test_node\`** — レッスン 9 と同じ single-validator 構築 (\`OpenHlNode::new\` を 1 validator で呼ぶ) だ。
- **\`first_block_via_engine_actors\`** — integration test。手順:
  1. \`node.start().await\` で engine を spawn する。
  2. \`handle.take_channels().await\` で channels を取る。
  3. \`tokio::spawn\` task として、app loop を bridge + channels + validator set + \`stop_after_decisions = 1\` で spawn する。
  4. \`tokio::time::timeout(Duration::from_secs(15), app_task)\` でテスト時間に bound をかける — 何かが hang したら 15 秒で fail させる (永久ではない)。
  5. ネストした \`Result\` を unwrap する。3 段の \`.expect(...)\` で剥がす: timeout → panic → loop error。
  6. **3 つを assert する**: decisions がちょうど 1 個、bridge がその hash を commit している、bridge がその hash を build している。これらが揃って完全なパイプライン (engine → app → bridge → engine → app) を証明する。
  7. クリーンアップに \`handle.kill(None)\` を呼ぶ。

> 🛑 **やりがちな勘違い。** 「レッスン 9 の smoke test は 2 だったのに、ここで \`worker_threads = 4\` なのはなぜか?」 **Integration test の方がより多くの actor を並行に回すからだ。** Smoke test は spawn + kill だけで、メッセージを生成しなかった。Integration test は \`run_engine_app\` task (consume + reply) + bridge の async fn 呼び出し + 複数の内部 engine actor を走らせる。4 スレッドあれば全員に余裕がある。少ないと contention (遅い) や deadlock (hang) が起きる。4 で十分余裕がある。
>
> *(背景: actor モデル + 非同期チャネルを組み合わせた結合テストでは、複数の task が **互いのリプライをブロッキングに待ち合う** パターンが頻発する (engine actor は app の \`reply.send(...)\` を待ち、app は bridge の \`.await\` を待ち、bridge は engine から次の指示を待つ、という鎖)。ワーカースレッド数が足りないと、**全ワーカーが「リプライを待つタスク」で埋まり、肝心のリプライを送信する側のタスクにスケジューラが時間を割り当てられない**という「スレッド枯渇型デッドロック」が起きる。一見正しいコードがハングして見えるが、これは設計バグではなく runtime のサイジング不足だ。4 ワーカーあればパイプライン全体 (engine 内部の少なくとも 2-3 actor + app loop + bridge async) を同時に物理コアに散らせるので、このクラスのデッドロックは構造的に発生しない。)*

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

Test 本体は ~0.02 秒で走る。5 秒は \`cargo test\` のオーバーヘッドだ。

全件確認:

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

…21 個合格するはず。

よくあるエラーと対処:

- **テストが 15 秒以上 hang する** — \`tokio::time::timeout\` が発火している。原因は常に同じクラスで、**\`ConsensusReady\` / \`GetValue\` / \`Decided\` のいずれかの arm で \`reply.send(...)\` を忘れているか、途中で \`oneshot::Sender\` を drop してしまっていること**だ。Engine actor は受け取り側 (こちらの app loop) が応答するまで永久に parked になる — タイムアウトも panic もなく、ひたすら待ち続ける。特に **\`Decided\` の exit path** (\`if decided.len() >= stop_after_decisions { return Ok(decided) }\` の分岐内) は油断しやすい: 早期 return を書くと reply を入れ忘れがちだ。**return 前に必ず reply する**。Step 3-5 の 3 arm 全てで、\`reply.send(...)\` の行が match arm の制御フローのどのパスからも到達できることを確認しよう。
- **\`error[E0277]: ConsensusBridge is not Send\`** — bridge に \`+ Send + Sync\` bound が必要だ。または impl で \`std::sync::Mutex\` を使っている (Send) のに trait の \`Send\` 注釈を忘れている。\`bridge.rs\` を確認する。
- **\`bridge.committed.lock().expect("poisoned")\` panic** — task が mutex 保持中に panic したときだけ起きる。普通は bridge impl 側の panic が原因だ。bridge の \`build_payload\` / \`commit\` の panic を確認する。
- **\`assert_eq!(decisions.len(), 1)\` が落ちる** — \`decisions\` が空だ。Loop が \`Decided\` に到達していない。最有力原因は \`GetValue\` の handle を忘れていることだ (engine は \`LocallyProposedValue\` reply を待ち、reply なしでは進まない)。Step 4 を再確認。

## 設計の振り返り

3 つの load-bearing な決定:

1. **\`run_engine_app\` は \`B: ConsensusBridge + 'static\` に対してジェネリックだ。** 同じ loop が \`StubBridge\` (test)、\`InMemoryEvmBridge\` (レッスン 4)、\`RethEvmBridge\` (レッスン 5)、\`LiveRethEvmBridge\` (レッスン 12) で動く。Bridge の責任は **実行**、app loop の責任は **ルーティング** だ。**1 つの実装で 4 つの bridge variant を扱える。**

2. **\`stop_after_decisions\` は test エルゴノミクスで、production 機能ではない。** Real validator は \`usize::MAX\` を使い、テストは \`1\` を使う。このパラメータが存在することが、関数が **テスト可能に設計されている** シグナルになる — 既知の finite state まで駆動し、graceful shutdown のインフラなしで assert できる。**Test エルゴノミクスは API 表面に値する。**

3. **Closed reply channel はログし、伝播しない。** Closed \`oneshot::Sender\` は engine が reply 前に諦めたことを意味する — 通常は actor が外部から kill されたケースだ。これをエラーとして伝播すると、本物の問題がノイズで隠れてしまう。\`tracing::warn!\` 経由のログなら、頻発時に operator が調査でき、loop は壊れない。**正しいエラーハンドリング方針は、呼び出し側がその失敗で何かできるかどうかに依存する。**

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
\`recv()\` channel (\`channels.consensus\`) は reply が要求される **命令的** メッセージ用だ: 「value を build しろ」「これを validate しろ」「H で decided」。\`subscribe()\` event stream は reply 不要の **broadcast** 通知用だ: 「round が始まった」「peer がダイヤルインした」。2 つは異なる方向に flow する: channel が engine→app (問い)、events が engine→all-subscribers (告知) だ。レッスン 9 の \`OpenHlNodeHandle::subscribe\` は placeholder で、レッスン 12 まで event を実際には消費しない。

**Q: 個別の AppMsg arm をテストせず、integration test だけにするのはなぜか?**
Arm が独立していないからだ。Engine は特定の順序で送ってくる: \`ConsensusReady\` → \`GetValidatorSet\` → \`StartedRound\` → \`GetValue\` → \`Decided\`。これを孤立してテストするには、その順序で送るフェイク engine を build する必要があるが、real engine を 1 block 回す方が簡単だ。**Integration test の方が書くコストが低く、証明できることが多い。** レッスン 11 で multi-validator のテストを追加するときには、個別 arm テスト (peer sync、vote extension) が意味を持つ。

**Q: なぜ \`validator_set: OpenHlValidatorSet\` を \`Arc<...>\` ではなく value で取るのか?**
\`OpenHlValidatorSet\` が小さく (v0 で 1 validator)、かつ \`Clone\` だからだ。Clone コストは struct 分のバイト数で、set 分のバイト数ではない。Validator set が 100 件以上に育ったら、\`Arc\` への移行を考える価値が出てくる。

**Q: \`bridge.commit(hash)\` が fail するとどうなるのか?**
\`?\` 演算子が \`BridgeError\` を \`eyre::Result::Err(...)\` として上に伝播する。テストの \`app_task\` は \`Err(...)\` を受け取り、3 段 unwrap の内側の expect で失敗して、テストは bridge エラーで panic する。**これが意図された挙動だ — commit 失敗は回復不能だ。** Production コードなら、transient なら retry、persistent なら shut down + alert する。

## 次のレッスン (レッスン 11)

Stage 6 はこれで完了だ。Stage 7 開始: \`InMemoryEvmBridge\` を 実際の Reth EthereumNode に置き換える。レッスン 11 では **dev node bootstrap** をカバーする — consensus actor と同じ tokio runtime 上で Reth を tokio task として spawn する。レッスン 12 では \`LiveRethEvmBridge\` (レッスン 5 の \`RethEvmBridge\` の live 版) を組み込む。レッスン 12 完了後には、書いた \`run_engine_app\` が処理する **同じ** \`AppMsg\` loop を回す Reth-backed devnet ができあがる — \`run_engine_app\` は同じまま、trait impl を 1 つ差し替えるだけで、実際の EVM execution layer が手に入る。`,
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

このレッスンで掴む概念:

- **bootstrap-only test も一級の成果物。** このレッスンのテストは Reth を spin up して chain ID を読む以外何もしない。ビジネスロジックが何もない段階で、依存解決と runtime bootstrap の regression を捕まえる。これが失敗したら レッスン 12〜15 は何ひとつ動かない。
- **Reth と Malachite の共存を証明する。** Rust レッスン 1 エコシステム最大級の 2 つの crate tree が、同一の tokio runtime を共有して 1 つの workspace に同居する。ここで追加する dev-dep は単一の SHA-coherent な依存閉包に解決する。
- **production-dep は薄く、dev-dep は厚く。** \`crates/evm/Cargo.toml\` は production dep を 6 個 (レッスン 5 から変わらず) に保ちつつ、dev-dep を 11 個に増やす。\`openhl-evm\` を使う下流 crate は libp2p / MDBX / rpc を引き込まず、テストバイナリだけが引き込む。
- **\`NodeConfig::test().dev()\` のセマンティクス。** \`test()\` = ephemeral tempdir + ephemeral port + peer discovery 無し。\`dev()\` = 単一 block producer モード、mempool gossip 無し。組み合わせると、CI 上で再現可能な完全に isolated な dev/test 環境になる。
- **なぜ chain ID は 2600 なのか。** Reth の upstream \`custom-dev-node\` example と一致し、public chain とも衝突しない。数字自体に OpenHL 的な意味はなく、diff を取れるよう example と合わせるための調整値だ。

検証:

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_bootstraps --release
\`\`\`

上記の実行結果が新規テスト 1 個に合格する:

\`\`\`
test reth_node::tests::reth_dev_node_bootstraps ... ok
\`\`\`

上記の実行結果が、フルな Reth \`EthereumNode\` v2.2.0 (MDBX ストレージ、payload builder、mempool、RPC stub、フルスタック) を ~2.7 秒で **spin up し**、provider に chain ID を query して結果を assert する。**これは、Reth と Malachite — レッスン 1 リファレンス実装で最大級のインフラ 2 つ — が 1 つの workspace で衝突なく共存することの証明だ。**

具体的な変更:

- root \`Cargo.toml\` に workspace 依存を 4 個追加: \`reth-node-core\`、\`reth-tasks\`、\`reth-provider\`、\`alloy-genesis\`。
- \`crates/evm/Cargo.toml\` に dev-dependency を 8 個追加 (Reth の node-builder/ethereum の test-utils variant + サポート crate) — test-only、production scope は変わらない。
- \`crates/evm/src/reth_node.rs\` — 新規ファイル (~100 行)、test module のみ。dev chain spec を組み、\`NodeBuilder::testing_node\` 経由で \`EthereumNode\` を launch し、provider が応答することを確認する。
- \`crates/evm/src/lib.rs\` — \`mod reth_node;\` を test-cfg のみで組み込む。

Production コードは無し。Bridge への変更も無し。レッスン 12 で live-bridge コードを書き始める前に、**dependency tree が resolve することを検証する** だけだ。

## おさらい

レッスン 10 完了時点で workspace には以下がある:

\`\`\`
crates/types/           — BlockHash, PayloadId, PayloadAttrs, ExecutedBlock, PayloadStatus
crates/evm/             — InMemoryEvmBridge, RethEvmBridge (alloy types)
crates/consensus/       — フル BFT engine: Context, signing, codec, node, engine_app
bin/openhl/             — 空のバイナリ stub
\`\`\`

\`cargo test\` で workspace 全体が 35 個合格する (consensus 21 + evm 14)。Engine は \`InMemoryEvmBridge\` 経由で real block を 生成する。**ただし EL はまだ placeholder だ。** \`RethEvmBridge\` は存在する (レッスン 5) が、実際には Reth を呼ばない — alloy 型を使って hash を計算するだけだ。

## 計画

4 つやる:

1. **workspace レベルで依存を 4 個追加する** — \`Cargo.toml\` に \`reth-node-core\`、\`reth-tasks\`、\`reth-provider\`、\`alloy-genesis\` を追加。すべて レッスン 1 以来使ってきたのと同じ Reth SHA に pin する。
2. **\`crates/evm/Cargo.toml\` に dev-dependency を 8 個追加する** (Reth の node-builder/ethereum の test-utils variant とサポート crate)。
3. **\`crates/evm/src/reth_node.rs\` を作成する** — dev chain spec を build し、\`NodeBuilder::testing_node\` で \`EthereumNode\` を launch し、provider が応答することを検証する test モジュール。
4. **\`mod reth_node;\`** を \`crates/evm/src/lib.rs\` に組み込む (test-cfg のみ — production scope をクリーンに保つ)。

このレッスンが教えるのは **依存共存の検証パターン** だ。大きなインフラ crate を 2 つ (今回は Reth と Malachite) に依存する場合、衝突は integration コードを書いて初めて判明する — その時点では、**動くはずなのに** コンパイルできないコードに大量投資済みになっている。**検証パターンは、integration を書く前に、両方を同時に exercise する最小のテストを書くことだ。** Test が pass すれば両方の dep が resolve・link される。失敗すれば失敗が即座に visible になり、blast radius が小さくて済む。

> 🛑 **考えてみよう。** スクロールする前に: なぜゴールコマンドで bootstrap test を \`--release\` で走らせるのか? ヒント: compile time とその支配要因を考える。Reth の MDBX bindings + libp2p + alloy + rocksdb 系ストレージスタックは **巨大** だ — 初回コンパイルはマシンパワーを使い切るレベルで、**高速なマルチコアワークステーションでも debug mode ~2:34、ラップトップ環境やリソース制限のあるマシンでは 5-10 分かかることも珍しくない** (Reth 単体だけで ~600 crate のツリー)。Release も同程度の時間を食うが、結果バイナリは大幅に高速になる。Test 自体は bootstrap と chain-ID チェックだけなので、**初回コンパイル後** は fast compile よりも fast runtime のほうが欲しい。初回 cold ビルド後は \`--release\` で走らせる。途中で進行ログが止まって見えてもフリーズではない — 別のことをしながら待つ。

## 手順

### Step 1: workspace レベルで Reth 依存を追加

ルート \`Cargo.toml\` を開く。\`# --- Reth (pinned to v2.2.0 release tag) ---\` ブロックを探す。レッスン 10 後はこう終わっている:

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

- **\`reth-node-core\`** — \`NodeConfig\` 関連の型 (node の config 構造: chain spec、datadir、JSON-RPC エンドポイントなどを定義する)。
- **\`reth-tasks\`** — Reth のバックグラウンドタスク (block validation、mempool gossip、payload builder) を spawn するための \`Runtime\` と \`TaskExecutor\`。
- **\`reth-provider\`** — 履歴 / canonical chain クエリを提供する \`BlockchainProvider\`。レッスン 12 の \`LiveRethEvmBridge::with_live_node()\` がこれを 1 個保持する。
- **\`alloy-genesis\`** — Genesis JSON のデシリアライズ。Reth の \`ChainSpec\` は \`Genesis\` から \`genesis.into()\` で構築する。

**Reth SHA \`88505c7f...\` は v2.2.0 release tag** — レッスン 1 で \`reth-evm\` や \`reth-evm-ethereum\` などに使ったのと同じ SHA だ。**main HEAD ではなく release-tag SHA に pin することが不変条件だ。** Reth のバンプは専用 PR で行う。

> 🛑 **やりがちな勘違い。** 「crates.io に v2.2.0 が publish されているのに、なぜ SHA pin するのか?」 **Reth の crates.io への release cadence が GitHub より数週間から数ヶ月遅れているからだ。** v2.2.0 git tag が最新の test 済みバイナリで、Publish された crate はそれより古いことが多い。Git + SHA pin なら、maintainer が v2.2.0 と stamp した正確な commit が得られ、stale な crates.io upload からのサプライズもない。これは高速進化するインフラ crate の標準プラクティスだ。

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
- **\`reth-node-core\` + \`reth-tasks\` + \`reth-chainspec\` + \`reth-provider\`** — test が直接使う runtime サポート crate (\`NodeConfig\`、\`Runtime\`、\`ChainSpec\`、provider アクセス)。
- **\`alloy-genesis\` + \`serde_json\` + \`eyre\` + \`tempfile\`** — test サポート用だ: dev genesis 用の JSON parsing、error handling、temp directory 作成。

**すべて \`[dev-dependencies]\` だ** — production scope は変わらない。\`lib.rs\` の \`#[cfg(test)]\` 外のコードで誤ってこれらを使うと compile が失敗する。**Test-only dep がガードレールになる。**

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

ASCII ロードマップは意図的に置いている。**ステップ 6 はレッスン 5 個 (レッスン 11〜15) から成り、それぞれが bridge の stubbed body を 1 個ずつ置き換えていく。** ロードマップが mental scaffold を提供し、現在のレッスンが大きな弧のどこに位置するかを示してくれる。

ファイルには **non-test コードがない**。以下はすべて \`#[cfg(test)] mod tests\` 内だ:

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

Import は密だが、それぞれ単一の役割を持つ:
- \`Genesis\` — dev genesis JSON のデシリアライズ
- \`ChainSpec\` — Reth の chain configuration (\`Genesis::into()\` で取得する)
- \`NodeBuilder\`、\`NodeHandle\` — node を構築・launch する builder パターン
- \`NodeConfig\` — node レベルの configuration (datadir、RPC エンドポイントなど)
- \`EthereumNode\` — spin up する具体的な node 型 (mainnet Ethereum 挙動)
- \`Runtime\` — tokio runtime に対する \`reth-tasks\` のラッパー
- \`Arc\` — \`ChainSpec\` は \`Arc<ChainSpec>\` として渡す

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

- **\`chainId: 2600\`** — Reth の上流 \`custom-dev-node\` 例と一致するので、デバッグ時に行ごとに挙動を比較できる。**2600 は OpenHL のマジックナンバーではない** — Reth のドキュメントで使われている数字に過ぎない。
- **EIP の block number はすべて 0** — Ethereum の全 hardfork が height 0 から有効になる。これは「post-merge dev」設定で、fork の歴史的順序はシミュレートしない。
- **\`terminalTotalDifficulty: 0\` + \`terminalTotalDifficultyPassed: true\`** — chain は post-merge から始まる。Pre-merge PoW block は存在しない。
- **\`shanghaiTime: 0\`** — Shanghai (withdrawals) が genesis から active になる。
- **\`alloc: {}\`** — pre-funded アカウントなし。残高が必要なテストでは、ここにエントリを追加する。

JSON は \`serde_json::from_str(...)\` で \`Genesis\` に parse され、\`genesis.into()\` で \`ChainSpec\` に変換される (alloy-genesis が impl を提供している)。\`Arc::new(...)\` にしているのは、node が \`Arc<ChainSpec>\` として保持し、複数のサブシステムで共有するからだ。

> 🛑 **やりがちな勘違い。** 「なぜ Rust で \`ChainSpec\` を直接構築せず、raw JSON 文字列を使うのか?」 **Reth の \`ChainSpec\` builder には 50 以上のフィールドと複雑な内部 invariant があるからだ。** プログラマチックに構築するということは、最近のフォークごとに必要なフィールドに自分で追いついていくことを意味する。\`Genesis\` deserializer 経由で JSON から構築すれば、Reth 自身の型システムにデフォルトと validity を強制させられる。**JSON フォーマットはどのみち chain の外部インターフェースだ** — production chain はすべて同じ JSON 形を使う (\`reth-chainspec/res/genesis/mainnet.json\` を見よ)。

レッスン 11 のテストが実際に何をブートさせているのか、Tokio runtime 上の task 配置で 1 枚にまとめると見える。レッスン 9〜10 までは左半分 (Malachite 側) だけが動いていたが、レッスン 11 以降は **同じ runtime 上に右半分 (Reth 側) が同居する**:

\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◆ 共有の単一 multi-thread Tokio Runtime (worker_threads = 4)                 │
│                                                                              │
│  ┌────────────────────────────────────┐  ┌─────────────────────────────────┐│
│  │ [側 A: Malachite Consensus 世界]    │  │ [側 B: Live Reth EL 世界]        ││
│  │  (レッスン 9〜10 で立ち上げ済み)             │  │  (レッスン 11 でブート、レッスン 12 以降で連結)  ││
│  │                                     │  │                                 ││
│  │ ├─ Engine Driver Actor Tasks        │  │ ├─ TaskExecutor                 ││
│  │ │   (BFT 状態遷移、proposer 選択)    │  │ │   (Reth バックグラウンド管理) ││
│  │ ├─ libp2p Network Task              │  │ ├─ MDBX Storage Engine Task     ││
│  │ │   (P2P gossip、CI では isolated)   │  │ │   (tempdir 上の state DB)     ││
│  │ ├─ WAL / Storage Tasks              │  │ ├─ Payload Builder Task         ││
│  │ └─ run_engine_app Loop Task         │  │ ├─ Mempool Task                 ││
│  │     (レッスン 10 で書いた message router)    │  │ └─ Engine API / RPC Stub Tasks  ││
│  └────────────────────────────────────┘  └─────────────────────────────────┘│
│                                                                              │
│  レッスン 11 のテストは、これら 2 つの世界が同一プロセス・同一 runtime で                │
│  リソース (スレッド / ポート / Cargo の feature) を衝突させずに共存できるかの    │
│  「ハンドシェイク」を検証している (まだ A と B の間に直接の通信線は無い)。       │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

ポイントは「**この時点で A と B はまだ直接話していない**」ことだ。レッスン 11 が証明するのは「両者が同じ Tokio runtime 上で衝突せずに立ち上がる」だけで、\`run_engine_app\` ↔ \`LiveRethEvmBridge\` 経由のメッセージ往来は レッスン 12〜15 で接続される。それでも、Reth v2.2.0 と Malachite v0.5.0 という 2 つの大規模クレートツリーが Cargo の feature unification と version 制約をすり抜けて 1 workspace に同居できることが、ここで初めて build と test の両方で証明される。

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

順を追って見ていく:

1. **\`Runtime::test()\`** — \`reth-tasks\` の canonical「test runtime」だ。現在の tokio runtime をラップして、Reth の \`TaskExecutor\` がそこに spawn できるようにする。
2. **\`dev_chain_spec()\`** — さっき build した genesis 由来の chain spec。
3. **\`NodeConfig::test().dev().with_chain(chain_spec)\`** — builder chain:
   - \`test()\` — sane な test default (エフェメラルポートなど)
   - \`.dev()\` — single-validator dev mode (peer discovery なし、MEV なし)
   - \`.with_chain(...)\` — dev chain spec に bind
4. **\`NodeBuilder::new(config).testing_node(runtime).node(EthereumNode::default())\`** — 4 段の builder:
   - \`new(config)\` — config を取り込む
   - \`.testing_node(runtime)\` — test だと宣言する (tempdir ストレージ、debug RPC など)
   - \`.node(EthereumNode::default())\` — 「Ethereum mainnet 挙動が欲しい」と指定する (Optimism や custom などと区別する)
5. **\`.launch_with_debug_capabilities()\`** — node のサービス (MDBX、payload builder、RPC、test mode の mempool gossip など) をすべて spawn する。\`NodeHandle { node, node_exit_future }\` を返す。
6. **\`node.chain_spec().chain.id()\` の assertion** — 最もシンプルな「node が正しく起動したか?」のチェック。Live \`BlockchainProvider\` から chain ID を fetch できれば、node は boot している。
7. **\`node_exit_future: _\`** — この future は await **しない**。Await すると node のシャットダウンを待ってブロックしてしまう (kill されるまで永遠に発生しない)。代わりに関数末で \`NodeHandle\` を drop して、runtime にバックグラウンドタスクを tear down させる。

> 🛑 **やりがちな勘違い。** 「\`NodeConfig::test().dev()\` は実際には何を disable しているのか?」 **重要なのは libp2p Kademlia 経由の peer discovery と、フルな mempool gossip プロトコルだ。** Non-test、non-dev node は peer に dial を試み、chain を sync し、libp2p リクエストに応答する。こちらのテストではそのいずれも実行しない — node は完全に isolated だ。これが essential なのは、chain ID (2600) がどの public network とも一致しないので、peer への dial は timeout するか拒否されるからだ。

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

本体は 2 行だ。**検証は \`launch_and_check\` 内で行う** — test はそれを呼んで、内部 error を保持した panic として失敗を surface させるだけだ。

\`flavor = "multi_thread", worker_threads = 4\` は レッスン 10 の integration test と同じセットアップだ。Reth の内部タスク (MDBX commit、payload builder、RPC handler、network service) はすべて自分のスレッドを欲しがる。4 つあれば contention なく余裕がある。

### Step 7: \`reth_node.rs\` を \`crates/evm/src/lib.rs\` に組み込む

\`crates/evm/src/lib.rs\` を開く。レッスン 4〜5 の in-memory + Reth bridge とその re-export がある。**test cfg でゲートした 1 行追加:**

\`\`\`rust
//! ... existing docs ...

pub mod bridges; // existing

#[cfg(test)]
mod reth_node;

// ... existing re-exports ...
\`\`\`

\`#[cfg(test)]\` がキーだ。**Reth bootstrap モジュールは test-only** — \`openhl-evm\` の consumer からは見えず、non-test ビルドではコンパイルされない。すべての dep が \`[dev-dependencies]\` であることと整合する — レッスン 11 は production scope に何も影響を与えない。

## テスト

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_bootstraps --release
\`\`\`

**初回 run:** ~2:34 のコールドコンパイル (Reth の MDBX、libp2p、payload builder、RPC スタックが初めてビルドされる)、そのあと ~3 秒で run する。

以降の run: ~30 秒 (Cargo のインクリメンタルコンパイル)、そのあと ~3 秒で run する。

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

…workspace 全体 36 個合格するはず (consensus 21 + evm 15、新規テストを 1 個追加した)。

よくあるエラーと対処:

- **\`error[E0432]: unresolved import 'reth_node_builder'\`** — \`crates/evm/Cargo.toml\` で \`test-utils\` feature が抜けている。Step 2 を再確認: \`features = ["test-utils"]\` であること。
- **\`error: failed to resolve: use of undeclared crate or module 'reth_provider'\`** — workspace レベルで \`reth-provider = ...\` が抜けている。Step 1 を再確認。
- **\`error: feature 'test-utils' on 'reth-node-builder' requires feature 'X'\`** — version skew だ。Pin している Reth SHA が \`reth-node-builder\` の peer crate の期待と一致する必要がある。すべての reth-* dep (12 個) が同じ SHA を使っているか、Step 1 を再確認。
- **\`Reth dev node bootstrap failed: Failed to bind...\`** — \`NodeConfig::test()\` は内部で **\`:0\` (カーネル自動割り当ての ephemeral port)** を要求しているので、本来は物理的なポート衝突は起きない設計だ。それでもこのエラーが出るときは、**直前のテスト run が panic や Ctrl+C で異常終了し、Tokio runtime の drop が遅延して、Reth が掴んでいた socket / MDBX lock がプロセス側にゾンビとして残っている** ことがほぼ唯一の原因だ。対処は \`cargo clean\` ではなく (clean しても OS レベルのポート占有は解放されない): (1) **数秒〜十数秒待ってから再実行** (大半はこれで通る)、それでもダメなら (2) \`pgrep -f openhl-evm\` / \`pgrep -f reth\` で生き残ったテストプロセスを探して \`kill\`、最終手段として (3) シェルを開き直して新しいプロセス空間にする。
- **Test はコンパイルできるが 30 秒以上 hang する** — \`Runtime::test()\` が正しく動いていない。Single-thread default ではなく \`#[tokio::test(flavor = "multi_thread", worker_threads = 4)]\` を使っているか確認する。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Production dep は最小に保ち、test-only dep でスタック全体を検証する。** \`crates/evm/Cargo.toml\` の production dep は 6 個 (レッスン 5 から変わらず) + dev-dep が 11 個。11 個の dev-dep が、Reth のフルな node-builder + provider スタックが **今動く** ことを検証する — それでいて \`openhl-evm\` を使う下流 crate はそれらを pull しない。**これで \`openhl-evm\` を slim に保ちつつ、integration が動くことを証明できる。**

2. **Bootstrap-only test は意味のある artifact だ。** このレッスンの test は、node を spin up して chain ID を check するだけだ。Block を build せず、トランザクションを実行せず、過去の state も query しない。**それでも ステップ 6 の残りが依存するレッスンになっている。** Bootstrap が失敗すれば レッスン 12〜15 は何も動かない。**Bootstrap-only test が、ビジネスロジックに到達する前にインフラ regression を catch してくれる。**

3. **モジュール doc の ASCII ロードマップが レッスン 12〜15 のトレイルマーカーになる。** 残りの各レッスンは bridge の stubbed body を 1 個ずつ置き換える — \`build_payload\`、\`payload_ready\`、\`validate_payload\`、\`commit\`。ロードマップが、各レッスンが大きな弧のどこに位置するかを示してくれる。**この doc は導線確認用であり、実装詳細そのものではない。**

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

**Q: chain ID はなぜ 1 (mainnet) でもランダム数字でもなく 2600 なのか?**
2 つの理由がある: (1) どの public network とも衝突しないので、peer discovery が偶然 real chain に接続することがない、(2) Reth の上流 \`custom-dev-node\` 例と一致するので、canonical reference と挙動を \`diff\` できる。後で自由に変えられる — OpenHL 内で 2600 に意味的な特別性はない。

**Q: \`NodeConfig::test().dev()\` は \`NodeConfig::default()\` と何が違うのか?**
\`test()\` は、MDBX 用のエフェメラル tempdir、\`:0\` (kernel-allocated) port への bind、peer discovery なし、sane な test logging を設定する。\`dev()\` は、single-validator mode (複数 validator 間の actual consensus なし)、local node を唯一の block producer とみなす、mempool gossip なし、を設定する。組み合わせれば完全に isolated な dev/test 環境になる。

**Q: \`launch_with_debug_capabilities\` は通常より遅くなるのか?**
ならない — 通常はゲートされている追加 RPC エンドポイント (\`debug_*\` namespace) を有効化するだけだ。パフォーマンスオーバーヘッドは無視できる。コストとしては、prod ではセキュリティリスクになる余分な surface を晒すこと、それだけだ。テスト用には問題ない。

**Q: なぜ レッスン 9 の \`OpenHlNodeHandle\` のように node を \`kill()\` しないのか?**
Reth が返す \`NodeHandle\` には、こちらで使うパスでの \`kill()\` メソッドが無いからだ。Handle を drop して runtime に tear down を任せるのが期待される使い方になる。明示的なクリーンアップが必要な長時間テストでは \`node.task_executor.shutdown(...)\` を呼ぶが、3 秒の smoke test なら drop で十分だ。

## 次のレッスン (レッスン 12)

Reth と Malachite はこれで共存する。**ただし bridge はまだ Reth と話していない。** レッスン 12 では \`LiveRethEvmBridge::with_live_node()\` を build する — さっき bootstrap した \`node\` を受け取り、\`BlockchainProvider\` を expose するコンストラクタだ。これによって \`build_payload\` (レッスン 4〜5 の stubbed bridge メソッド) が live な MDBX state に対して **実際の** 親ブロック lookup を行えるようになる。これが「Reth が workspace にいる」から「Reth が consensus engine の読むデータを 生成している」へ移行する瞬間だ。`,
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

このレッスンで掴む概念:

- **\`BlockchainProvider\` の具象型ではなく \`P: BlockNumReader\` に generic にする。** bridge が必要とする Reth の capability を *ちょうど 1 つ* に宣言する。具象 provider は 30 個以上の trait bound を背負っていて、それを全 caller に流すのは負担。Generic は surface を絞り、mock test も自明にしてくれる。
- **honest な validation の最小単位としての happy/negative ペア。** happy だけだと in-memory への silent fallback を見逃す。negative だけだと「常に reject する bridge」を見逃す。「bridge は Reth と対話している」を真の主張にするには両方が load-bearing でなければならない。
- **\`Result<Option<u64>>\` が運用エラーとプロトコルエラーを区別する。** DB call の失敗 → \`BridgeError::Internal\` (アラート)、未知の hash → \`BridgeError::Rejected\` (nil に投票して進む)。エラーはメッセージだけでなく意味も運ぶ。
- **未知の親の拒否は安全性プロパティ。** consensus engine が live chain の見たことない hash の上に build しろと言ってきたら、bridge は拒否しなければならない。これが、悪意ある proposer や壊れた proposer が EL を fork subtree に誘導することを防ぐルールだ。
- **integration の段階を示す 2 つの bridge。** \`RethEvmBridge\` (レッスン 5、alloy のみ) と \`LiveRethEvmBridge\` (レッスン 12、live provider) は両方とも codebase に残る。重複実装ではなく、integration の 2 段階を表している。

検証:

\`\`\`bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
\`\`\`

上記の実行結果が **happy path と negative path の両方** を exercise する新規テスト 1 個に合格する:

\`\`\`
test live_node::tests::live_bridge_builds_on_real_genesis ... ok
\`\`\`

Happy path: \`EthereumNode\` を boot し、その \`BlockchainProvider\` に実際の genesis hash を query し、provider を \`LiveRethEvmBridge\` に渡し、\`build_payload(genesis_hash, attrs)\` を呼ぶ。結果の child block は \`number = 1\` と \`parent_hash = genesis\` を持つ — どちらも **live provider 由来** であって、メモリ内の合成ではない。

Negative path: \`build_payload(BlockHash([0xee; 32]), attrs)\` を呼ぶ。Provider はその hash を知らないので、bridge は \`BridgeError::Rejected\` を返す。**Live chain が見たことのない parent に対して build を拒否することで、bridge を consensus に接続しても安全になる。**

具体的な変更:

- \`crates/evm/src/live_node.rs\` — 新規ファイル (~227 行)。\`LiveRethEvmBridge<P>\` は \`P: BlockNumReader + Clone + Sync + 'static\` に generic。\`build_payload\` は real (live provider を query する)。\`payload_ready\` はインメモリの pending 状態を読む。\`validate_payload\` と \`commit\` は レッスン 13〜14 まで stub のままだ。
- \`crates/evm/Cargo.toml\` に generic bound が要求する production dep を追加。
- \`crates/evm/src/lib.rs\` — \`pub mod live_node;\` を組み込む。

## おさらい

レッスン 11 完了時点で workspace には以下がある:

\`\`\`
Cargo.toml                       — 13 個の reth-* workspace dep + alloy-genesis
crates/evm/Cargo.toml            — production dep 6 個 + dev-dep 11 個
crates/evm/src/bridges/          — InMemoryEvmBridge (レッスン 4) + RethEvmBridge (レッスン 5)
crates/evm/src/reth_node.rs      — bootstrap-only smoke test
crates/consensus/                — フル BFT engine + run_engine_app
\`\`\`

\`cargo test\` で workspace 全体 36 個が合格する。**Reth は boot し、Malachite は block を 生成するが、互いに会話していない。** \`RethEvmBridge\` は parent lookup にインプロセス state を使う。\`LiveRethEvmBridge\` はまだ存在しない。

## 計画

6 つやる:

1. **\`reth-storage-api\` を workspace レベルで追加する** — \`BlockNumReader\` trait surface を提供する crate だ。これに対してジェネリックにする。
2. **\`crates/evm/Cargo.toml\` を更新する** — \`eyre\` を dev-dep から production dep へ昇格させ (\`BridgeError::Internal\` のメッセージ構築で使う)、\`reth-storage-api\` を production dep として追加する。
3. **\`crates/evm/src/live_node.rs\` を作成する** — \`LiveRethEvmBridge<P>\` struct と \`ConsensusBridge\` impl (\`build_payload\` は live、他は stub)。
4. **\`pub mod live_node;\`** を \`crates/evm/src/lib.rs\` に組み込む (今回は production-visible で、**\`#[cfg(test)]\` ではない**)。
5. **integration test \`live_bridge_builds_on_real_genesis\`** を追加する — real node を bootstrap して、happy と negative の両方の path を assert する。
6. **実行** — \`cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release\` が ~2.4 秒で合格する。

このレッスンが教えるのは **provider に対してジェネリックなパターン** だ。これによって bridge を isolation でテスト可能にする。\`LiveRethEvmBridge<P>\` は \`P: BlockNumReader + Clone + Sync + 'static\` に対してジェネリックだ。Production では \`P\` は live node の \`BlockchainProvider\` になる。テストでは \`P\` を、決定的な \`(hash → number)\` マッピングを返す \`MockProvider\` にしてもよい。**Bridge 自体はどちらかを気にしない** — ただ \`provider.block_number(...)\` を呼ぶだけだ。これは レッスン 10 の \`run_engine_app<B: ConsensusBridge>\` と同じパターンで、具象型ではなく trait に依存する。

> 🛑 **考えてみよう。** スクロールする前に: \`build_payload\` が live provider から読むのに、なぜ \`LiveRethEvmBridge\` は依然として \`pending\`、\`chain\`、\`head\` フィールドを持つ内部の \`Mutex<State>\` を保持しているのか? ヒント: \`build_payload\` は \`PayloadId\` を返し、engine は後で \`payload_ready(id)\` を呼んで実際の block を fetch する。Pending 状態がこの 2 つの呼び出しの橋渡しをする — Reth の payload-builder は block を組み立てるのに 10-50ms かかるので、engine が待っている間、bridge は **結果** をどこかに保持しておく必要がある。**レッスン 13 でこのインメモリの pending 状態を Reth の実 payload-builder に置き換える。** 今のところは build-then-fetch の形が動くことを証明する placeholder だ。
>
> *(より具体的には: consensus 側のアクタータスクは \`build_payload\` を叩いて即座に \`PayloadId\` だけ回収し、いったん proposal broadcast や他の作業に進む。そのあと別のアクタータスク (場合によっては別のワーカースレッド) が \`payload_ready(id)\` を非同期に呼び出す。Reth が裏で block を組み立てている時間も、Malachite が他の round を進めている時間も、両者は**独立した寿命の async task** だ。\`Mutex<State>::pending\` という 1 枚のマップは、この「\`build_payload\` が返した瞬間」と「\`payload_ready\` が呼ばれた瞬間」という 2 つの独立した protocol moment を、型レベルで安全に糊付け (同期) する **seam** として機能している。レッスン 13 で実 payload-builder に差し替えても、この seam の **必要性** 自体は消えず、\`pending\` を真の async channel / oneshot に置き換える形に進化するだけだ。)*

## 手順

### Step 1: workspace に \`reth-storage-api\` を追加

ルート \`Cargo.toml\` を開く。レッスン 11 後、reth ブロックは次で終わる:

\`\`\`toml
reth-payload-builder      = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider             = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-genesis             = { version = "2.0", default-features = false }
\`\`\`

\`reth-provider\` と \`alloy-genesis\` の間に 1 行追加:

\`\`\`toml
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
\`\`\`

\`reth-storage-api\` は \`BlockNumReader\` や \`BlockHashReader\` といった reader trait が住む場所だ。**他の reth-* dep と同じ pinned SHA を使う** — ここで version skew があると、\`BlockNumReader\` のバージョンが違うために \`LiveRethEvmBridge\` が \`node.provider\` を受け入れられなくなる。

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

**\`eyre\` が今 production な理由**: \`BridgeError::Internal(eyre::eyre!(...))\` は \`build_payload\` (production コード) で構築するからで、テストだけではない。レッスン 11 では dev-dep が正しかった (\`eyre::Result\` を import するのはテストだけだった)。今は production コード側が必要としている。

### Step 3: \`crates/evm/src/live_node.rs\` を作成 — モジュール doc + import

ファイル冒頭。役割を明示し、残りの stub を call out して、何が本レッスンで load-bearing で何が後に来るのかを読者に明確に示す:

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

\`BlockNumReader\` が live read を駆動する唯一の trait だ。他はすべて レッスン 4 以来使っている bridge 型だ。

この crate の境界レイアウトを 1 枚で見ると、レッスン 5 の \`RethEvmBridge\` で確立した「外側 = contract 型 / 内側 = alloy 型」の構造に、今回新しく **trait による provider 抽象境界** が 1 段挟まることがわかる:

\`\`\`
   [ 外側: CL (consensus 層) の空間 ]
   ──────────────────────────────────────────────────────────────────────
       openhl-types / contract primitives (自前定義):
         BlockHash       PayloadId        ExecutedBlock
   ──────────────────────────────────────────────────────────────────────
                                  ▲    │
                                  │    ▼  trait boundary の変換 (レッスン 5 と同じヘルパー)
                                  │       to_b256 / from_b256 / to_executed_block
                                  │    │
   ──────────────────────────────────────────────────────────────────────
       alloy-primitives / alloy-consensus (Ethereum エコシステム標準):
         B256             u64              Header
   ──────────────────────────────────────────────────────────────────────
                                       │
                                       │  self.provider.block_number(parent_b256)
                                       ▼
   ────────── ★ レッスン 12 で追加: trait による provider 抽象境界 ★ ──────────────
       reth-storage-api / 抽象 trait:
         BlockNumReader   (← bridge が必要とする capability、ちょうど 1 個)
   ──────────────────────────────────────────────────────────────────────
                                       │
                                       │ 型システムが具象プロバイダを隠蔽
                                       ▼
   ──────────────────────────────────────────────────────────────────────
       reth-provider / 具象実装 (production の \`P\` がここを satisfy):
         BlockchainProvider  ──►  MDBX storage engine ──► 実際の block number
   ──────────────────────────────────────────────────────────────────────
   [ 内側: EL (実行層) / 実際のディスク上の state ]
\`\`\`

3 つの focal point: (a) **\`LiveRethEvmBridge<P>\` は \`P: BlockNumReader\` に対してジェネリック** — bridge 本体は具象 provider 型 (\`BlockchainProvider\` の 30+ trait bound) を一切知らない。(b) **trait 抽象境界 (★ の段) が「mock test 用の \`P\`」と「production の live provider」を同じインターフェースで差し替え可能にする** — \`BlockNumReader\` を満たす任意の型ならどれでも入る。(c) **データの流れは外側 → 内側に向かって型が「狭く」なる**: \`BlockHash\` (32 byte の意味付き newtype) → \`B256\` (alloy primitives) → trait 経由の query → MDBX が返す \`u64\` 一個。レッスン 5 の trait boundary discipline がここで「provider 抽象境界」として 1 段拡張された形だ。

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

- **\`LiveRethEvmBridge<P>\`** は provider を value で保持し、build/commit の bookkeeping のために \`Mutex<State>\` を持つ。**\`P\` に対してジェネリック** で、具象 provider 型は焼き付けない。
- **\`State\`** は \`InMemoryEvmBridge\` (レッスン 4) が持っていたものを反映したものだ — \`next_payload_id\` カウンタ、\`pending\` マップ (payload_id → fetch 待ちの built header)、\`chain\` マップ (commit 履歴)、\`head\` ポインタ。レッスン 13〜15 でこれらをそれぞれ live Reth 構造で置き換えていく。

> 🛑 **やりがちな勘違い。** 「なぜ \`provider\` を \`State\` の中に入れて mutex を 1 つにまとめないのか?」 **\`BlockNumReader\` 実装は普通 \`Sync + Clone\` — 多数の async task で同時に共有されることを前提に作られているからだ。** Provider を mutex の中に入れると、すべての \`block_number\` lookup が直列化されてしまう。外に置けば、\`build_payload\` への並行呼び出しが (安価な) state lock を奪い合うことはあっても、互いの (高コストになりうる) provider read を block することはない。**Lock は変更されるものを守るためにあり、読まれるものを守るためではない。**

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

Trait bound \`P: BlockNumReader + Clone + Sync + 'static\` が契約だ: hash→number lookup ができる、clone が安価、スレッド間で共有しても安全、任意の async task より長生きする — そのような provider なら何でもよい、という。

\`build_payload\` の body は 3 フェーズだ:

1. **Live read** (load-bearing な行)。\`self.provider.block_number(parent_b256)\` は \`Result<Option<u64>, _>\` を返す:
   - \`Ok(Some(n))\` — provider は parent を知っており、number は \`n\`。続行する。
   - \`Ok(None)\` — provider は parent を知らない。\`BridgeError::Rejected\` を返す。**これが、bridge を consensus に接続しても安全にする要因だ** — live chain が見たことのない parent に対しては build しない。
   - \`Err(e)\` — provider が失敗した (DB 破損、deadlock、何でも)。\`BridgeError::Internal\` を返す。

2. **State allocation**。Mutex を lock し、next ID を取って increment する。高速で、lock 下に I/O は無い。

3. **Header 合成**。\`number = parent_number + 1\` (live read 由来)、\`parent_hash = parent_b256\`、engine が渡した attrs で child \`Header\` を build する。\`header.hash_slow()\` で hash を計算し、\`(id → (hash, header))\` マッピングを \`pending\` に格納する。

> 🛑 **やりがちな勘違い。** 「なぜ parent lookup は \`Result<u64, _>\` ではなく \`Result<Option<u64>, _>\` なのか?」 **「provider がこの hash を見つけられなかった」と「provider が crash した」は別の failure mode で、consumer は別扱いすべきだからだ。** 欠けている hash は **プロトコル** の問題 (「知らないものに対して build を要求された」 — 悪意ある peer か stale なメッセージ) を意味する。Provider error は **運用** の問題 (「DB が壊れた」 — 運用アラート) を意味する。2 層の \`Result<Option<...>>\` にすれば caller が両者を区別でき、それぞれを別の \`BridgeError\` variant (\`Rejected\` vs \`Internal\`) にマップできる。

### Step 6: \`payload_ready\` + \`commit\` の stub

この 2 つは レッスン 4 のインメモリ bridge とほぼ同じだ — live-Reth 統合は レッスン 13 (\`payload_ready\` を Reth の実 payload-builder に対して) と レッスン 15 (\`commit\` を Engine API に対して) で行う:

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

- **\`payload_ready\`** は \`pending\` から payload を ID で lookup し、格納された header から \`ExecutedBlock\` を build する。レッスン 4 と同じ shape だ。
- **\`validate_payload\`** は \`Ok(PayloadStatus::Valid)\` を返す — 文字通り「常に valid」な stub だ。コメントが、real execution が入る場所として レッスン 14 (Stage 7c) を名指ししている。**Visible な stub は技術負債ではなく、進捗マーカーだ。**
- **\`commit\`** は block を \`chain\` に記録して \`head\` を更新する。レッスン 4 と同じ shape。コメントが、forkchoice が入る場所として レッスン 15 (Stage 7d) を名指ししている。

### Step 7: \`live_node.rs\` を \`lib.rs\` に組み込む

\`crates/evm/src/lib.rs\` を開く。レッスン 11 ではこうだった:

\`\`\`rust
pub mod bridges;

#[cfg(test)]
mod reth_node;
\`\`\`

\`live_node\` を追加する — **今回は production-visible だ:**

\`\`\`rust
pub mod bridges;
pub mod live_node;

#[cfg(test)]
mod reth_node;
\`\`\`

なぜ \`#[cfg(test)]\` にしないのか? レッスン 13〜15 で \`LiveRethEvmBridge\` を production コードから使う (最終的には \`bin/openhl/src/main.rs\` から) からだ。レッスン 11 の bootstrap モジュールは genuine に test-only で、dep tree を検証するためだけに存在していた。レッスン 12 の bridge は production API だ。

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

テストの順を追って見ていく:

1. **実際の \`EthereumNode\` を bootstrap する** — レッスン 11 と同じセットアップ。
2. **\`node.provider.block_hash(0)\`** — live provider に genesis block hash を尋ねる。これは \`BlockHashReader\` の API だ (\`BlockNumReader\` とは別 trait で、ペアになっている)。
3. **\`LiveRethEvmBridge::new(node.provider.clone())\`** — bridge を構築する。\`BlockchainProvider\` は内部的に \`Arc\` ベースなので、clone は安価だ。
4. **Happy path**: 実際の genesis hash の上に payload を build し、\`payload_ready\` 経由で fetch して、\`parent_hash == genesis_hash\` と \`number == 1\` を assert する。**これが live read が起きたことの証明だ。** もしインメモリ合成だったら、parent_hash は渡したもの (これは正しい) になるが、\`number\` は任意の値でありえた。\`1\` が出るのは、\`provider.block_number(genesis_hash)\` が \`Some(0)\` を返したときだけだ。
5. **Negative path**: \`BlockHash([0xee; 32])\` は chain が見たことのない fabricated hash だ。\`build_payload\` は \`BridgeError::Rejected\` を返さなければならない。\`matches!(err, BridgeError::Rejected(_))\` が exhaustive な check になる — 他の error variant が来たらテスト失敗だ。

> 🛑 **やりがちな勘違い。** 「なぜ negative path までテストするのか?」 **Rejection をテストしないテストは、happy path が動くことしか証明できない — bridge が偶然インメモリ state に fallback して任意の parent に対して child block を 生成するバグを catch できない。** ガベージな parent の上にサイレントに build する bridge は、コンパイルが通り、happy path は pass し、consensus は破損した高さの block を嬉々として commit してしまう。Negative path こそが、live read が実際に load-bearing であることを証明する。

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

…workspace 全体 37 個が合格するはず。

よくあるエラーと対処:

- **\`error[E0277]: P: BlockNumReader is not satisfied for ...\`** — workspace の \`reth-storage-api\` SHA が他の reth-* SHA と一致していない。Step 1 を再確認。
- **\`error[E0433]: failed to resolve: use of undeclared crate or module 'reth_provider'\`** — \`crates/evm/Cargo.toml\` の \`[dev-dependencies]\` に \`reth-provider = { workspace = true }\` を書き忘れている (\`reth-storage-api\` ではなく \`reth-provider\` のほう — 後者が test で必要になる concrete provider 型を提供する)。\`test-utils\` feature ではなく **依存自体の追加忘れ**が原因なので、Step 2 の依存リストをそのまま再点検する。
- **Happy path テストで \`provider has no block with hash 0x000...\`** — \`block_hash(0)\` を query しているのに \`None\` を返している。\`NodeConfig\` で \`.dev()\` mode を使っているか確認する (\`.dev()\` なしの test mode では genesis が事前 seed されないことがある)。
- **Test が \`matches!(err, BridgeError::Rejected(_))\` で失敗する** — \`build_payload\` が \`BridgeError::Internal\` を伝播している。\`.ok_or_else(|| BridgeError::Rejected(...))\` の行を確認する。代わりに \`.expect(...)\` や \`.unwrap_or(0)\` を使うと error path が発火しない。
- **Test はコンパイルできるが「P is private」と言われる** — \`LiveRethEvmBridge<P>\` には \`pub struct ... { provider: P, ... }\` が必要だ。\`provider\` が \`pub\` でも、ジェネリックパラメータが \`pub\` であるのは暗黙的になる。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Bridge は \`P: BlockNumReader\` に対してジェネリックにし、\`BlockchainProvider\` の具象型に対して書かない。** Production では live provider を渡す。テストでは mock を渡せる。将来 module 7 では、別の Reth プロセスに JSON-RPC で話す \`RemoteProvider\` を渡せる。**Bridge コードは変わらない** — 型パラメータだけが変わる。

2. **\`Result<Option<u64>, _>\` が運用エラーとプロトコルエラーを区別する。** 失敗した DB call と「この hash を知らない」は別の問題だ。それぞれを \`BridgeError::Internal\` と \`BridgeError::Rejected\` にマップすることで、consumer が適切に応答できる — 前者にはアラート、後者は ignore-and-vote-nil。**Error は単なるメッセージではなく、意味論を運ぶ。**

3. **happy / negative の 2 テストペアが **最小** の誠実な検証になる。** どちらか片方では不十分だ: happy 単独ではインメモリ state へのサイレント fallback を catch できないし、negative 単独では常に reject する bridge を catch できない。**Live integration では両方が load-bearing でなければならない。**

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

**Q: なぜ \`BlockchainProvider\` を直接取らず、\`P\` に対してジェネリックにするのか?**
理由は 2 つある。1 つ目、\`BlockchainProvider\` は定義に 30 以上の trait bound を持つ重い具象型だ — 直接使うと、\`LiveRethEvmBridge\` のすべての consumer がそれらの bound を糸通ししなければならない。Generic な \`P: BlockNumReader\` は、bridge が必要とする **唯一の能力** に surface を絞ってくれる。2 つ目、generic-over-trait は mock テストを容易にする — \`MockProvider\` impl を書いて \`LiveRethEvmBridge::new(...)\` に渡せば、実際の node bootstrap なしで unit-testable な bridge を得られる。

**Q: \`BlockNumReader::block_number\` と \`BlockHashReader::block_hash\` の違いは?**
方向だ。\`block_number(hash) → Option<u64>\` は「この hash の number は?」に答える。\`block_hash(n) → Option<B256>\` は「この number の hash は?」に答える。テストは両方を使う: \`block_hash(0)\` で genesis hash を pull し、そのあと \`LiveRethEvmBridge\` が内部で \`block_number(hash)\` を使って parent の number を lookup する。同じ chain index に対する 2 つのアクセスパターンだ。

**Q: なぜ \`parking_lot::Mutex<State>\` ではなく \`Mutex<State>\` を使うのか?**
\`std::sync::Mutex\` は低 contention のシナリオでは問題ない。Bridge の state は \`build_payload\` / \`payload_ready\` / \`commit\` でしか触られず、各 block あたり最大 1 回、数十から数千ミリ秒の間隔で触れるだけだ。\`parking_lot\` は contention が多いときに意味がある — ここではほぼゼロだ。理由なしに dep を追加しないようにする。

**Q: この bridge は \`RethEvmBridge\` を実際にいつ置き換えるのか?**
すでに置き換わっている — \`RethEvmBridge\` (レッスン 5) は production 用途では \`LiveRethEvmBridge\` に取って代わられた。\`RethEvmBridge\` は、教育的な waypoint および engine テストの \`StubBridge\` で使うインメモリ variant として codebase に残る。**Codebase 内の 2 つの bridge は重複実装ではなく、統合の 2 段階を表している。**

## 次のレッスン (レッスン 13)

Bridge は \`build_payload\` で Reth から読むようになった。だが \`pending\` HashMap はまだインプロセス合成のままだ — engine が「propose する次の block」を尋ねてきたら、こちらは自分で作った header を返している。**レッスン 13 で \`pending\` を Reth の実 \`PayloadBuilder\` に置き換える** — Reth が JSON-RPC \`engine_getPayloadV4\` call で block を組み立てるのと同じ機構だ。レッスン 13 完了で、bridge は実際の Ethereum tooling が受け入れる block を 生成するようになる (フルな transaction list、receipt、gas usage、state root)。これが「bridge が Reth のストレージと会話する」から「bridge が Reth の実行パイプラインと完全に統合される」への移行だ。`,
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

このレッスンで掴む概念:

- **builder と validator が単一の真実を共有する。** \`ChainSpec::next_block_base_fee\` は builder が base fee を埋めるのに使うヘルパーで、\`EthBeaconConsensus\` が検証に使うのも同じヘルパーだ。算数の重複なし、hardfork を越えた drift リスクなし。consensus-critical な build/validate ペアでは必ずこれを真似る。
- **validator が builder に誠実さを強制する。** validator が走り出したら builder は手抜きできない。parent から gas_limit をコピー (1/1024 drift bound)、正しい EIP-1559 base fee、difficulty ゼロ (post-merge)、単調増加 timestamp。すべて機械的にチェックされる。
- **validator の reject は crash ではなく通常動作。** validator が「malformed だ」と答えるのは \`PayloadStatus::Invalid\` であって \`Err\` ではない。error を status に map することで engine は走り続け、次の proposal を選べる。DB エラーだけが \`BridgeError::Internal\` に escalate する。
- **trait bound は段階的に広がる。** レッスン 12 は \`BlockNumReader\` を、レッスン 13 は \`BlockNumReader + HeaderProvider\` を要求する。レッスンごとに新しい capability surface を露出する。trait bound は spec — bridge が Reth surface のどこを要求するかをそのまま文書化する。
- **\`SealedHeader\` は hash を cache する。** \`Header\` + 事前計算した \`B256\` を wrap することで、\`.hash()\` のたびに 500 byte を Keccak し直すコストを避ける。validator throughput では効いてくるパターンだ。本コースのテストでは μs オーダーの差だが、形として正しい。

検証:

\`\`\`bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
\`\`\`

…依然合格する — ただしテストは **3 つの追加結果** を assert する (happy + invalid block の \`validate_payload\` チェック追加):

\`\`\`
test live_node::tests::live_bridge_builds_on_real_genesis ... ok
\`\`\`

今 build したばかりの block に対する \`bridge.validate_payload(block)\` は \`PayloadStatus::Valid\` を返す — Reth の **real** validator (\`EthBeaconConsensus::validate_header_against_parent\`) が承認したからだ。\`bridge.validate_payload(block_with_unknown_hash)\` は \`PayloadStatus::Invalid\` を返す — validate する header が無いからだ。

具体的な変更:

- 新規 workspace dep 3 個 + 新規 evm production dep 4 個 (\`reth-consensus\`、\`reth-ethereum-consensus\`、\`reth-chainspec\`、\`alloy-eips\`)。
- \`crates/evm/src/live_node.rs\` — 約 141 行変更。新規 struct field \`chain_spec: Arc<ChainSpec>\` と \`validator: EthBeaconConsensus<ChainSpec>\`。\`build_payload\` は production grade の header を生成するようになる (parent 由来 gas_limit、\`next_block_base_fee\`、\`difficulty: U256::ZERO\`、snap した timestamp)。\`validate_payload\` は \`EthBeaconConsensus::validate_header_against_parent\` を呼ぶように書き直される。
- **ファイルの shape は変わらない** — 同じ struct、同じ \`ConsensusBridge\` impl だ。変わるのは \`validate_payload\` が **何をするか** だ。

## おさらい

レッスン 12 完了時点で \`crates/evm/src/live_node.rs\` には:

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    state: Mutex<State>,
}
\`\`\`

\`build_payload\` は parent number を live provider から読むものの、ほとんどデフォルトフィールドの header を合成している。\`validate_payload\` は stub で \`Ok(PayloadStatus::Valid)\` を返す。Integration test は build/fetch を happy/negative path で exercise するだけで、validation は一度も走らない。

\`cargo test\` で workspace 全体 37 個が合格する。**Bridge は自分自身と合意しているが、Reth の「valid block」の概念とまだ合意することを強制されていない。**

## 計画

7 つやる:

1. **3 個の workspace dep を追加する**: \`reth-consensus\` (\`HeaderValidator\` trait)、\`reth-ethereum-consensus\` (具象 \`EthBeaconConsensus\`)、\`reth-primitives-traits\` (\`SealedHeader\`)。
2. **\`crates/evm/Cargo.toml\` を更新する** — \`reth-chainspec\` を dev-dep から production dep へ昇格させ、3 個の新規 production dep を追加する。
3. **\`LiveRethEvmBridge\` に新規フィールドを 2 個** 追加する: \`chain_spec: Arc<ChainSpec>\` と \`validator: EthBeaconConsensus<ChainSpec>\`。\`new()\` を chain spec を受け取る形に更新する。
4. **\`P\` の trait bound を拡張する** — 今は \`HeaderProvider<Header = Header>\` も要求する (parent の full な sealed header を fetch するため)。
5. **\`build_payload\` をアップグレードする** — parent の full な \`SealedHeader\` を pull し、next_block_base_fee を計算し、gas_limit をコピーし、difficulty をゼロにし、timestamp monotonicity を強制する。
6. **\`validate_payload\` を rewrite する** — pending/chain から自分の header を見つけ、provider から parent sealed を fetch し、\`validator.validate_header_against_parent\` を走らせる。
7. **テストに新規 assertion を 2 個追加する** — 今 build した block で \`Valid\`、unknown hash で \`Invalid\`。

このレッスンが教えるのは **producer-consumer の自己整合性パターン** だ。同じ artifact の builder と validator がいる場合、**両者は同じルールを使わなければならない**。\`build_payload\` が 1 つの base-fee 公式を使い、\`validate_payload\` が別の公式を使うと、すべての block が validation に失敗する。これを保証する方法は、**両方を同じソースから導出すること** — ここでは \`ChainSpec\` だ。\`ChainSpec::next_block_base_fee()\` が build に使われ、\`EthBeaconConsensus::validate_against_parent_eip1559_base_fee\` の中で同じヘルパーが check に使われる。**Source-of-truth の共有が、システムを自己整合にする。**

このコースで作る \`LiveRethEvmBridge\` の **build 側と validate 側がどう ChainSpec を共有しているか** を 1 枚に落とすと、なぜ自分の build したブロックが自分の validator に拒否されない (= 自己整合) のかが直感で見える:

\`\`\`
                       ┌──────────────────────────────────────────┐
                       │   共通の真実のソース (Source of truth)     │
                       │   Arc<ChainSpec>                          │
                       │   ├─ chainId = 2600                       │
                       │   ├─ hardforks (Cancun / Shanghai / …)    │
                       │   ├─ genesis (base_fee_per_gas、gas_limit) │
                       │   └─ EIP-1559 parameters (elasticity 等)    │
                       └────────────────────┬─────────────────────┘
                                            │
                ┌───────────────────────────┼───────────────────────────┐
                ▼                           │                           ▼
   chain_spec.next_block_base_fee(...)      │       EthBeaconConsensus<ChainSpec>
   chain_spec.genesis.gas_limit             │       .validate_header_against_parent(...)
   …                                        │           ├─ base_fee_per_gas check
                ▼                           │           ├─ gas_limit drift check (±1/1024)
   ┌───────────────────────────┐            │           ├─ timestamp monotonicity check
   │  build_payload(parent)    │            │           └─ post-merge invariants
   │   ├─ parent_header を引く │ ─[Block]──►│
   │   ├─ base_fee を計算      │            │       ┌───────────────────────────┐
   │   ├─ gas_limit をコピー   │            ▼       │  validate_payload(block)  │
   │   ├─ difficulty = ZERO    │     ──────────────►│   pending/chain から       │
   │   └─ timestamp 単調化     │                    │   header を引き、         │
   └───────────────────────────┘                    │   provider から parent    │
                                                    │   sealed を fetch、       │
                                                    │   validator を走らせる    │
                                                    └─────────────┬─────────────┘
                                                                  │
                                                                  ▼
                                                       PayloadStatus::Valid ✅
                                                       (validator が承認した)
\`\`\`

両側が **同じ \`Arc<ChainSpec>\` インスタンス** を握っているので、hardfork のたびに変わる base_fee 公式や、ネットワーク固有の gas_limit / elasticity が変わっても、**build と validate のロジックが片方だけ古いまま取り残される** という事故が物理的に起きない。逆に、もし build 側がインラインに base_fee を計算し、validate 側が \`ChainSpec\` を経由するという非対称な実装にしていたら、Cancun 以降のフォークでひっそりと「自分の生成したブロックを自分の validator が拒否する」という silent fork が量産される。**「自己整合性は API で買うのではなく、共有 source-of-truth で買う」**が、この crate の血肉になっている discipline だ。

> 🛑 **考えてみよう。** スクロールする前に: なぜ \`EthBeaconConsensus::validate_header_against_parent\` は parent の **full** な sealed header (gas_limit、timestamp、base_fee_per_gas、すべて) を必要とするのに、\`BlockNumReader::block_number\` は \`u64\` しか返さないのか? ヒント: Reth の validator が走らせる 4 つの sub-check を考える。Number monotonicity は parent.number だけで足りる。Timestamp monotonicity には parent.timestamp が必要だ。Gas-limit drift には parent.gas_limit が必要。EIP-1559 base fee には parent.base_fee_per_gas + parent.gas_used + parent.gas_limit が必要だ。**Validate する瞬間には header 全体が必要で、number だけでは足りない。** だからこそ レッスン 13 で trait bound を \`BlockNumReader\` から **加えて** \`HeaderProvider<Header = Header>\` まで拡張する。

## 手順

### Step 1: 3 個の workspace dep を追加

ルート \`Cargo.toml\` を開く。レッスン 12 の reth ブロックは次で終わる:

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

- **\`reth-consensus\`** — \`HeaderValidator\` trait を定義する。\`EthBeaconConsensus\` がこれを impl する。この trait 経由で \`.validate_header_against_parent(...)\` を呼ぶ。
- **\`reth-ethereum-consensus\`** — \`EthBeaconConsensus<ChainSpec>\` を提供する — Reth の post-merge Ethereum 用 production header validator だ。
- **\`reth-primitives-traits\` (crates.io \`0.3\` から)** — \`SealedHeader\` を提供する。\`Header\` とその hash をペアにするラッパーだ。**これは crates.io 由来であって、git ではない** — stable foundation crate として spin out された。

> 🛑 **やりがちな勘違い。** 「なぜ \`reth-primitives-traits\` だけ crates.io で、他は git-pin なのか?」 **\`reth-primitives-traits\` が、Reth の中で public Rust エコシステム crate として **stabilize** された部分だからだ。** 他の crate (alloy、foundry、custom レッスン 2) もすべてこれに依存している。Git SHA で pin すると、crates.io から import している全員とバージョン衝突する — そして皆 crates.io から import している。**Git-pin reth-* dep は主に Reth の「内部」表面で、\`reth-primitives-traits\` は **外部** 表面だ。**
>
> *(背景にあるのは Cargo の厳格な制約だ: **crates.io に publish されたパッケージは、Git の特定 revision を \`git = "...", rev = "..."\` で直接指している crate を依存ツリーに含められない** (publish-time に弾かれる)。エコシステム全体で共有される共通トレイト (\`SealedHeader\` / \`BlockHeader\` 等) が Git 依存のままだと、crates.io 上の他のあらゆるライブラリから事実上利用できなくなる。だから「外部表面」になるこのレイヤーだけが Reth から早期に切り出され、crates.io 上に独立して publish (stabilize) されている。型レイアウトの mismatch を防ぐため、こちら側でも workspace で pin したバージョンを継承する。)*

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

**\`reth-chainspec\` が今 production な理由**: bridge が struct 内に \`Arc<ChainSpec>\` を保持するからだ。production-visible なフィールドなので、その型も production-visible な dep でなければならない。

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

新規の型 5 個:
- \`ChainSpec\` — Reth の chain configuration。構築時に渡す。
- \`EthChainSpec\` — \`ChainSpec\` に \`next_block_base_fee\` メソッドを与える trait。
- \`HeaderValidator\` — \`validate_header_against_parent\` を持つ trait。\`EthBeaconConsensus\` がこれを impl する。
- \`EthBeaconConsensus\` — Reth の production な post-merge header validator。
- \`SealedHeader\` — \`(Header, hash)\` のペア。

変更された import が 2 つ: \`HeaderProvider\` (\`sealed_header_by_hash\` 用) と \`Arc\` (chain spec を共有するため)。

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

\`State\` は変わらない — 同じ \`next_payload_id\`、\`pending\`、\`chain\`、\`head\` だ。

\`chain_spec()\` accessor を追加するのは、テストや将来の production caller が欲しがるからだ (例: ある高さで active な hardfork を chain spec に尋ねたい場合)。\`&Arc<ChainSpec>\` 経由で expose しておけば、caller は自分の参照が欲しいときに clone できる。

### Step 4: \`P\` の trait bound を拡張

\`impl\` ブロックの \`where\` 句がもう 1 個 bound を増やす:

\`\`\`rust
#[async_trait]
impl<P> ConsensusBridge for LiveRethEvmBridge<P>
where
    P: BlockNumReader + HeaderProvider<Header = Header> + Clone + Sync + 'static,
{
\`\`\`

\`HeaderProvider<Header = Header>\` — provider は number だけでなく full な \`Header\` オブジェクトを serve しなければならない。Associated-type binding \`Header = Header\` は「provider の Header 型は **こちらの** alloy Header 型だ」と宣言する。別の Reth バージョンは \`HeaderProvider\` を別の header 型でパラメータ化することがある (例: Optimism)。こちらは mainnet Ethereum のものに制約する。

**\`BlockNumReader\` は今や冗長** だが (full header をくれる物は number もくれる)、明示的に残す理由は:
- レッスン 12 でちょうど \`BlockNumReader\` 用に書いた — 残しておくことで レッスン 12→レッスン 13 の進行を文書化できる
- 将来の caller は、number だけ必要なコードパスにより狭い bound を望むかもしれない

### Step 5: \`build_payload\` をアップグレード — production grade な header

これが load-bearing な変更だ。新しい \`build_payload\`:

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

レッスン 12 からの 3 つの変更:

1. **\`block_number\` ではなく \`sealed_header_by_hash\` を使う。** 今は full parent header が必要で、number だけでは足りない。Error マッピングは同じだ: \`Err(provider_err)\` → \`Internal\`、\`Ok(None)\` → \`Rejected\`。

2. **\`our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1)\`。** Timestamp は厳密に monotonic でなければならない。Engine が \`attrs.timestamp = 5\` と \`parent.timestamp = 100\` を渡してきたら、\`101\` (parent + 1) を使う。これで古い clock データが \`validate_payload\` を即座に fail させるのを防げる。

3. **Header 構築に慎重に選んだフィールドが 4 つ** 増えた (レッスン 12 から):
   - \`gas_limit = parent_header.gas_limit\` — コピーすることで 1/1024 drift check が自明に満たされる。
   - \`difficulty = U256::ZERO\` — post-merge invariant。非ゼロ値はすべて validator を fail させる。
   - \`base_fee_per_gas = next_base_fee\` — \`chain_spec.next_block_base_fee(...)\` で計算する。validator が使うのと **同じヘルパー** だ。
   - \`..Default::default()\` — 他すべて (gas_used、transactions_root など) はゼロのまま。将来の stage でフル実行検証をするときには意味があるが、header-against-parent では意味を持たない。

> 🛑 **やりがちな勘違い。** 「なぜ build 側で EIP-1559 数式を inline でやらず、\`chain_spec.next_block_base_fee(parent, timestamp)\` を呼ぶのか?」 **Validator が **同じ** call をするからだ。** 数式を手書きすると、公式が変わるたびに自前 impl を Reth のものと sync しなければならない (実際に変わる — Cancun は \`BASE_FEE_MAX_CHANGE_DENOMINATOR\` を変えた。将来の fork も微調整するだろう)。**Chain spec のヘルパーを呼べば、自分の builder が永遠に validator と合意することが保証される — chain spec が知っていて自分の builder が知らない hardfork も含めて。**

### Step 6: \`validate_payload\` を rewrite

もう一つの load-bearing な変更だ。Stub を次で置き換える:

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

1. **Header lookup** — \`block.hash\` 用の自分の header を \`pending\` (just-built) または \`chain\` (already-committed) から見つける。見つからなければ → \`Invalid\`。Single-validator モードでは、validate するすべての block は **こちらが** build したものなので、その 2 つの map のどちらかにあるはずだ。
2. **Parent lookup via live provider** — \`sealed_header_by_hash(parent_hash)\`。見つからなければ → \`Invalid\`。Provider が error なら → \`BridgeError::Internal\`。
3. **\`SealedHeader\` で wrap する** — \`SealedHeader::new(header, block_hash)\` が header と hash を再計算なしでペアにする。
4. **Validator を走らせる** — \`validator.validate_header_against_parent(&our_sealed, &parent_sealed)\` は \`Result<(), ConsensusError>\` を返す。\`Ok(())\` を \`PayloadStatus::Valid\` に、任意の \`Err(_)\` を \`PayloadStatus::Invalid\` にマップする。

**Reth が内部で走らせる 4 つの sub-check** (自分で書く必要はないが、知っておく価値はある):
- \`validate_against_parent_hash_number\` — block.number == parent.number + 1
- \`validate_against_parent_timestamp\` — header.timestamp > parent.timestamp
- \`validate_against_parent_gas_limit\` — gas_limit が parent から 1/1024 以内
- \`validate_against_parent_eip1559_base_fee\` — base_fee_per_gas が EIP-1559 公式に一致

どれかが fail すると validator は \`Err(...)\` を返す。具体的な error は伝播しない — この層では engine は「valid か否か」だけ分かればよい。将来のデバッグでは error 型をログできる。

> 🛑 **やりがちな勘違い。** 「なぜ \`Err(_)\` を \`BridgeError::Internal\` ではなく \`PayloadStatus::Invalid\` にマップするのか?」 **Validation 失敗は protocol レベルのシグナルで、運用失敗ではないからだ。** 「この block はルールを満たさない」は、validator が **そのために存在する** こと — 答えであって、crash ではない。\`BridgeError::Internal\` は上に伝播して engine app loop を kill する。\`PayloadStatus::Invalid\` は engine を継続させ、block を拒否された proposal として扱わせる。**Error の型を会話レベルに合わせる。**

### Step 7: テスト更新 — 2 個の新規 assertion

テストには、新しい bridge constructor の呼び出し (今は chain_spec を取る) と、\`validate_payload\` の assertion が 2 つ追加される:

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

        // (レッスン 12 からの negative case は変わらず。)
        let fake_parent = BlockHash([0xeeu8; 32]);
        let err = bridge.build_payload(fake_parent, attrs).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
\`\`\`

2 個の新規ブロック:

- **\`build_payload\` 後の \`validate_payload(&block)\`** — 今 build した block は validate されなければならない。**これが load-bearing な assertion** で、build と validate がルールに合意していることを証明する。EIP-1559 公式を間違えたら、difficulty が非ゼロだったら、gas_limit が drift したら、これは fail する。
- **\`validate_payload(&unknown_block)\`** — hash が pending/chain に無い block は \`Invalid\` を返す。Lookup の fallthrough をテストする。

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

Test runtime: 依然 ~2.4 秒 — Reth bootstrap が支配的で、\`validate_payload\` は 1ms 未満しか追加されない。

Full suite:

\`\`\`bash
cargo test
\`\`\`

…workspace 全体 37 個が合格するはず (テスト数は変わらず — 既存テストに assertion を増やしただけだ)。

よくあるエラーと対処:

- **\`assert_eq!(status, PayloadStatus::Valid)\` が fail する** — 最も多い問題だ。\`build_payload\` が \`EthBeaconConsensus\` の拒否する header を生成している。可能性のある原因:
  - \`difficulty: U256::ZERO\` を忘れている — デフォルトは非ゼロで、post-merge check が fail する。
  - \`gas_limit: parent_header.gas_limit\` を忘れている — デフォルトはゼロで、parent から 1/1024 以上 drift する。
  - base_fee の計算間違い — \`chain_spec.next_block_base_fee(parent, timestamp)\` を使うべきだ。
  - Timestamp が parent より厳密に大きくない — \`our_timestamp = attrs.timestamp.max(parent_header.timestamp + 1)\` を強制する必要がある。
- **\`error[E0277]: HeaderProvider not satisfied\`** — workspace の \`reth-storage-api\` SHA が \`reth-provider\` と一致していない。すべての reth-* git-pin dep が同じ SHA を共有しなければならない。
- **\`error[E0277]: HeaderValidator is not in scope\`** — \`use reth_consensus::HeaderValidator\` を忘れている。Trait はメソッドを呼ぶために scope に入っている必要がある。
- **\`error: 'next_block_base_fee' not found on ChainSpec\`** — **拡張トレイト \`reth_chainspec::EthChainSpec\` を \`use\` し忘れている**。\`next_block_base_fee\` は \`ChainSpec\` の inherent メソッドではなく、\`EthChainSpec\` trait に定義された extension method なので、Rust のルール上**そのトレイト自体を明示的に \`use\` して scope に入れない限りメソッド解決が走らない** (IDE の auto-import 機能でも、\`EthChainSpec\` トレイトをサジェスト候補に入れて選ぶこと)。修正: \`use reth_chainspec::{ChainSpec, EthChainSpec};\` のように \`ChainSpec\` 型と並べて trait もインポートする。

## 設計の振り返り

3 つの load-bearing な決定:

1. **builder と validator が source of truth を共有する。** \`ChainSpec::next_block_base_fee\` が次 block の base fee を build する側、\`EthBeaconConsensus::validate_against_parent_eip1559_base_fee\` が同じヘルパーを呼んで check する側だ。**重複した数式が無く、hardfork 間の drift リスクも無い。** これは build/validate ペアがあるたびに使うべきパターンだ。

2. **validator の error は \`Invalid\` になり、伝播しない。** Validator が「いいえ、これは malformed だ」と答えるのは crash ではなく **通常の** パスだ。その \`Err(_)\` を \`PayloadStatus::Invalid\` にマップすれば、engine は走り続け、次の proposal を選べる。運用失敗 (DB error) は依然 \`BridgeError::Internal\` 経由でエスカレートする。

3. **\`P\` の trait bound は段階的に広がる。** レッスン 12 では \`BlockNumReader\` が必要で、レッスン 13 では \`BlockNumReader + HeaderProvider\` が必要だ。各レッスンが新しい capability surface を露出していく。**Trait bound は spec だ — 自分の実装が何を要求するかを consumer に正確に伝える。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 0844d58
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

\`0844d58\` の参照には、\`live_node.rs\` に対する レッスン 12 からの ~141 行の変更が含まれる。新しい struct フィールド、アップグレードされた \`build_payload\`、rewrite された \`validate_payload\`、新しい test assertion は厳密に一致するはずだ。Doc コメントの言い回しは個人差があってよい。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: なぜ 4 つの sub-check (\`validate_against_parent_hash_number\` など) を手動で走らせないのか?**
できる — すべて \`EthBeaconConsensus\` 上で \`pub\` だ。だが \`validate_header_against_parent\` は 4 つを順序通りに走らせ、正しい引数形と適切な short-circuiting を提供してくれる。**Orchestration を再実装することは、trait メソッドが防ぐためにある error-prone な仕事だ。** おまけ: 将来の Reth バージョンが 5 つ目の check を追加するかもしれない。orchestrating method を呼んでおけば、無料で拾える。

**Q: \`SealedHeader::new(header, hash)\` は tuple として保持するのと何が違うのか?**
キャッシュだ。\`SealedHeader\` は hash を保存するので、後続の \`.hash()\` 呼び出しで再計算しない (Keccak over ~500 bytes — 高い block rate では意味がある)。Tuple なら再計算を強いられる。**ネットワーク端でしばらく重要になる最適化だ** — 毎秒数千 block を処理する場所では効いてくる。こちらの test ではマイクロ秒の節約程度。

**Q: なぜテストは \`dev_chain_spec()\` が \`Arc<ChainSpec>\` を返しているのに \`chain_spec.clone()\` を呼ぶのか?**
\`Arc<T>\` を clone すると refcount を increment するだけで、下位の \`ChainSpec\` データはコピーしないからだ。3 つの参照が必要になる: 1 つは \`NodeConfig\` 内、1 つは \`LiveRethEvmBridge::new\` に渡す、1 つは将来の用途用。各 \`.clone()\` は atomic increment だけ — ナノ秒単位だ。

**Q: \`dev_chain_spec()\` ではなく \`chain_spec: Arc::new(ChainSpec::default())\` を渡すと何が起きるのか?**
Validator と chain が、どの hardfork が active かについて合意しなくなる。\`ChainSpec::default()\` は最小限の Ethereum mainnet shape だが、live node は \`dev_chain_spec()\` (chainId 2600、すべての fork が 0) で構築されている。Validator が内部で走らせる \`EthChainSpec::is_fork_active_at_timestamp(...)\` check で発散する。**同じ chain_spec を node と bridge の両方に渡す** — それが contract だ。

## 次のレッスン (レッスン 14)

4 つの \`ConsensusBridge\` メソッドのうち 2 つは live な Reth に到達するようになった。**3 つ目 — \`commit\` — はまだ in-process な \`chain: HashMap\` に hash を記録するだけだ。** レッスン 14 (最後の大きなレッスン) で、これを 実際の **Engine API forkchoice update** に置き換える — Reth が production で block を commit するときに使う JSON-RPC call だ。レッスン 14 完了後、こちらの bridge は、他のどの Ethereum CL client (Lighthouse、Prysm、Teku) も生成するのと同じ wire-format アクションを生成するようになる。**レッスン 15 はそれを受けた capstone** だ — 1 ページの再キャップ、「構築したすべて」図、optional な production-readiness チェックリスト (block bodies、gossip codec、real WAL)。`,
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

このレッスンで掴む概念:

- **local-first、engine-second の commit 順序。** bridge の \`chain: HashMap\` が consensus layer の真実の source だ。local を先に commit して engine への通知を後にすることで、engine 呼び出しが失敗しても consensus commit を rollback する羽目にはならない (rollback は safety 違反だ)。一般化すると「primary store が先、secondary index/replica は後」というパターン。
- **test ergonomics のための \`Option<EngineHandle>\`。** optional にしておかないと、すべての unit test が実 node を bootstrap して engine handle を作る羽目になる。\`Option\` にすることで、テストは \`None\` を渡してローカル path だけを、integration test は \`Some(handle)\` を渡して両方の path を exercise できる。型レベルの optionality が、インフラを全テストに強制することを防いでくれる。
- **engine 応答は意図的に破棄する。** マッチする \`engine_newPayload\` を先に送っていない以上、現時点では \`SYNCING\` が正解応答だ。これをエラー扱いすると、すべての caller が「レッスン 14 は部分統合」であることを知らなければならなくなる。破棄しておけば API は正直なまま: 「ローカル commit は完了、下流通知は best-effort」と言える。
- **3 フィールドの \`ForkchoiceState\` の崩し方。** mainnet は head / safe / finalized を区別する (即時 / 32-slot / 64+-slot checkpoint)。v0 single-validator OpenHL には区別がない — 全 commit が final なので、3 つとも同じ hash を入れる。形は multi-validator OpenHL への forward-compat のために保っておく。
- **\`add_ons_handle.beacon_engine_handle\` が in-process Engine API。** 外部 CL client (Lighthouse、Prysm) が JSON-RPC で叩く \`engine_*\` メソッドを backing しているのと同じ handle だ。こちらは in-process でショートカットしているが、surface は同一。
- **4 つの \`ConsensusBridge\` メソッドすべてが実際の Reth に到達する。** このレッスンでループが閉じる。\`build_payload\` / \`payload_ready\` / \`validate_payload\` / \`commit\` すべてが実際の Reth コードパスに到達する。

検証:

\`\`\`bash
cargo test -p openhl-evm commit_sends_forkchoice_to_engine_when_handle_installed --release
\`\`\`

上記の実行結果が新規 integration test 1 個に合格する。レッスン 11〜13 の既存テストと合わせて、bridge は **4 つの \`ConsensusBridge\` メソッドすべてが 実際の Reth コードパスに到達する** 状態になる:

| メソッド | やること | 走る real Reth コード |
| - | - | - |
| \`build_payload\` | Child block を build | \`HeaderProvider::sealed_header_by_hash\`, \`ChainSpec::next_block_base_fee\` |
| \`payload_ready\` | Build された block を fetch | (ローカル — bridge の pending map) |
| \`validate_payload\` | Block を check | \`EthBeaconConsensus::validate_header_against_parent\` |
| **\`commit\`** | Block を canonical にする | **\`ConsensusEngineHandle::fork_choice_updated\`** |

**Engine は今のところ \`SYNCING\` を返す — そしてこの段階ではそれが正しい。** まだマッチする \`engine_newPayload\` 呼び出しを送っていないからだ (それには EVM-executable なトランザクション body が必要で、本コースの範囲外だ)。Wire は接続される。payload-execution の alignment は、約定 (fill) が EVM トランザクションになってからの作業になる。

具体的な変更:

- \`LiveRethEvmBridge\` に新規 optional フィールド \`engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>\` を追加する。
- 新規 builder メソッド \`with_engine_handle()\` (\`#[must_use]\`) と introspection 用の \`has_engine_handle()\` を追加する。
- \`commit()\` が **2 つのこと** をするようになる: (1) ローカル bookkeeping (レッスン 13 から変わらず)、続いて (2) engine handle がインストールされていれば Reth の in-process Engine API に \`ForkchoiceUpdated\` を fire し応答は破棄する。
- 新規 integration test が \`EthereumNode\` を bootstrap し、\`add_ons_handle.beacon_engine_handle\` を bridge にインストールし、local commit と forkchoice 経路の両方が fire することを assert する。

## おさらい

レッスン 13 完了時点で \`crates/evm/src/live_node.rs\` には:

\`\`\`rust
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,
    validator: EthBeaconConsensus<ChainSpec>,
    state: Mutex<State>,
}
\`\`\`

\`build_payload\`、\`payload_ready\`、\`validate_payload\` はすべて live な Reth に対して走る。\`commit\` は依然として、新しい head を \`state.chain\` (in-process な \`HashMap\`) に記録し、\`state.head\` を更新するだけだ。**ローカルのみ** だ。Live な Reth node に query する RPC クライアントから見ると、head は依然 genesis に見える — consensus engine は、こちらが何を確定させたかを知らない。

\`cargo test\` で workspace 全体 37 個が合格する。**Bridge は canonical chain を知っているが、Reth は知らない。**

## 計画

6 つやる:

1. **2 個の workspace dep を追加する**: \`reth-ethereum-engine-primitives\` (\`EthEngineTypes\` 用) と \`alloy-rpc-types-engine\` (\`ForkchoiceState\` 用)。
2. **\`crates/evm/Cargo.toml\` を更新する** — 3 個の新規 production dep を追加する (上記 2 個 + \`ConsensusEngineHandle\` を提供する \`reth-engine-primitives\`)。
3. **\`live_node.rs\` の import と struct を更新する** — 新規フィールド \`engine_handle: Option<ConsensusEngineHandle<EthEngineTypes>>\` を加える。
4. **Builder メソッドを追加する** — \`with_engine_handle()\` は self を consume して handle をインストールする。\`has_engine_handle()\` は \`const fn\` accessor。
5. **\`commit()\` を rewrite する** — まずローカル bookkeeping (変わらず) を行い、engine handle がインストールされていれば best-effort で \`ForkchoiceUpdated\` を送る。
6. **integration test を追加する** — \`EthereumNode\` を bootstrap し、\`add_ons_handle.beacon_engine_handle\` を pull し、\`with_engine_handle()\` 経由で接続し、commit パスを exercise する。

このレッスンが教えるのは **成功後の副作用パターン** だ。Bridge のローカル bookkeeping が consensus 層の **source of truth** で、他の何かが起こる前に成功しなければならない。Engine API 呼び出しは **副作用** だ: 有用ではある (下流の RPC クライアントが新しい head を見られる) が、その失敗で commit を roll back すべきではない。パターンは:

\`\`\`text
1. 成功しなければならないこと (ローカル state mutation) をする。
2. Best-effort 副作用 (fire-and-mostly-forget)。
3. 成功を返す。
\`\`\`

Step 2 が失敗してもログするが伝播はしない — Step 1 がすでに起きており、roll back すると不整合な状態に陥るからだ。**成功の **後** に続く副作用は、成功を **gate する** 副作用とは別物だ。**

\`commit\` が呼ばれた瞬間に何が起こるか、Phase 1 (絶対成功) と Phase 2 (best-effort 副作用) の時間順を 1 枚に落とすと、なぜ Step 2 の失敗で Step 1 を巻き戻してはいけないのかが直感で押さえられる:

\`\`\`
   [ openhl-consensus ] (Malachite アクター)
              │
              │ bridge.commit(block_hash).await
              ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │ ◆ LiveRethEvmBridge::commit()                                     │
  │                                                                    │
  │  [ Phase 1: カノニカル確定 (絶対成功する必要がある) ]                │
  │   ├── state.lock() で Mutex<State> を獲得                            │
  │   ├── pending から header を lookup (None なら Rejected)             │
  │   ├── state.chain.insert(hash, header)  ◄── new canonical entry    │
  │   └── state.head = Some(hash)           ◄── source of truth 更新   │
  │                                                                    │
  │   ※ ここを抜けた瞬間、consensus 上は「commit 済み」が確定する。       │
  │      下流の \`payload_ready\` や次の \`build_payload\` がこの値を読む。   │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │ (ローカル確定が成功 — もう引き返せない)
                                 ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  [ Phase 2: ベストエフォートの副作用 (下流通知、fire-and-mostly-forget) ]│
  │   ├── ForkchoiceState { head_block_hash, safe = head, finalized = head } │
  │   └── if let Some(handle) = &self.engine_handle {                      │
  │           let _ = handle.fork_choice_updated(state, None).await;       │
  │       }                                                                │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼ in-process Engine API
                       ┌──────────────────────────────┐
                       │ Reth Engine actor              │
                       │ (現状は body を持たないので    │
                       │  PayloadStatus::SYNCING で応答)│
                       └──────────────┬───────────────┘
                                      │ レスポンスは \`let _ =\` で破棄
                                      ▼
                              \`commit\` は Ok(()) を返す
                              CL 側は何事もなかったかのように次の round へ
\`\`\`

ポイントは 3 つ: (a) **Phase 1 の \`state.chain.insert\` + \`state.head\` 更新は consensus の "commit 済み" を表す source of truth** であり、ここを抜けたら下流 (\`payload_ready\`、次の \`build_payload\`) が即座にこの値を読みに来る。(b) **Phase 2 の \`fork_choice_updated\` は下流通知の副作用にすぎず、\`SYNCING\` / 接続失敗 / panic が起きてもログに残すだけで \`Err\` には変換しない** — もし Phase 2 失敗で \`Err\` を返したら、consensus は「commit 失敗」と誤認して既に確定した state を巻き戻そうとし、安全性が壊れる。(c) **\`engine_handle: Option<...>\` が \`None\` の場合は Phase 2 自体をスキップ** する — unit test では「Phase 1 だけ走らせて、Reth bootstrap なしに検証」ができる。レッスン 14 の integration test は \`Some(handle)\` を渡して両 phase が fire することを assert する。

> 🛑 **考えてみよう。** スクロールする前に: なぜテストは \`commit().await.expect(...)\` が成功することだけを assert し、Reth の canonical chain head が動いたことは assert しないのか? ヒント: \`build_payload\` の出力に何が欠けているかを考える。Engine に渡す \`ExecutedBlock\` は header だけで、トランザクションも receipt も state root も無い。Reth の engine は canonical chain を advance させるために **実際の block body** が必要だ。\`engine_newPayload\` を先に送らない限り、\`fork_choice_updated\` は \`SYNCING\` (「この block をまだ知らない、body を fetch しろ」) を返す。Wire は接続されているが、データが違う。**レッスン 14 で証明するのは接続だ。payload execution は将来コースに先送りする。**

## 手順

### Step 1: 2 個の workspace dep を追加

ルート \`Cargo.toml\` を開く。Reth ブロック (レッスン 13 後) は次で終わる:

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

- **\`reth-ethereum-engine-primitives\`** — \`EthEngineTypes\` を提供する。「Ethereum mainnet の engine surface」を表す type bundle だ (Optimism や custom レッスン 2 との対比で)。こちらの \`ConsensusEngineHandle<EthEngineTypes>\` はこれに対してパラメータ化される。
- **\`alloy-rpc-types-engine\`** — \`ForkchoiceState { head_block_hash, safe_block_hash, finalized_block_hash }\` を提供する。\`engine_forkchoiceUpdatedV4\` 呼び出しの canonical な wire-format payload だ。同じ struct を CL クライアント (Lighthouse、Prysm) が EL クライアントに JSON-RPC 越しに送る — こちらは in-process で使う。

**\`alloy-rpc-types-engine\` のバージョンに注意**: \`2.0\` に pin して、Reth v2.2.0 自身が pin している \`alloy-rpc-types-engine\` \`2.0.4\` と一致させる。ここでバージョン不一致があると \`ForkchoiceState\` が 2 つの異なる型になり、engine handle が呼び出しを拒否する。

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

\`reth-engine-primitives\` は レッスン 1 から workspace dep だった (中間 stage で \`PayloadAttributesBuilder\` が住む場所として)。ここで「workspace で利用可能」から「この crate で import する」へ昇格させる。

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

新規の型 3 個:
- \`ForkchoiceState\` — engine に送る payload (head/safe/finalized block hash)。
- \`ConsensusEngineHandle\` — Reth が engine actor にメッセージを送るためにくれる handle。
- \`EthEngineTypes\` — handle を Ethereum mainnet の engine surface に bind する type parameter。

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

> 🛑 **やりがちな勘違い。** 「なぜ \`engine_handle\` が \`Option<...>\` で、常に必須ではないのか?」 **\`LiveRethEvmBridge\` のすべての consumer が Reth を bootstrap する production node ではないからだ。** Unit test (レッスン 12、レッスン 13) は provider に対する bridge だけが欲しい — 動く engine は要らない。Engine handle を全 caller に強制すると、(a) 全 test でフルな node を bootstrap するか、(b) 構築が難しい no-op の「fake handle」型を用意するか、のどちらかが必要になる。\`Option\` なら同じ struct が両方の世界に仕える: test は \`None\` を渡し、production は \`Some(handle)\` を渡せる。**型レベルの optionality が、漏れる API surface を避ける手段になる。**

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

- **\`with_engine_handle()\`** — consume-and-return-self builder だ。\`mut self\` パラメータが所有権を取り、mutate して return する。canonical な Rust の「builder method」パターン。**\`#[must_use]\`** にしているのは、返り値を bind し忘れる (例: \`bridge.with_engine_handle(h);\`) と、修正された bridge がサイレントに drop されてしまうからだ。**注: これは \`&mut self\` ではなく \`self\` (所有権を消費) なので、\`let bridge = ...; bridge.with_engine_handle(h);\` のように 2 行に分けると \`bridge\` が move out されてしまい、以降の行で \`bridge\` を使えなくなる。**\`let bridge = LiveRethEvmBridge::new(p, c).with_engine_handle(h);\` のようにコンストラクタからチェーンして 1 つの式で書き切るのが idiomatic だ (Step 6 の integration test もまさにこの形)。後から条件付きで engine handle を差し込みたい場合は \`let bridge = if want_engine { LiveRethEvmBridge::new(p, c).with_engine_handle(h) } else { LiveRethEvmBridge::new(p, c) };\` のように、構築 → 設定 → 束縛を 1 つの式に閉じ込める。
- **\`has_engine_handle()\`** — \`const fn\` accessor。Test と assertion 用だ (「接続が実際に効いたか?」)。\`const\` にしているのは、\`Option::is_some()\` チェックが runtime 計算を必要としないからだ。
- **\`new()\` 初期化** — 唯一の変更は \`engine_handle: None\` だ。Handle が欲しい caller は \`LiveRethEvmBridge::new(p, c).with_engine_handle(h)\` を使う。

### Step 5: \`commit()\` を rewrite — ローカル先、engine は best-effort

Load-bearing な変更だ。レッスン 13 の \`commit\` を置き換える:

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

1. **ローカル bookkeeping** — レッスン 13 と同じ shape。Pending header を hash で lookup し、\`chain\` に insert し、\`head\` を更新する。Header が欠けていれば → \`BridgeError::Rejected\`。Header binding は今 \`let _header\` だ — この関数で後から使わないからだ。binding は明瞭さと将来の telemetry のために残してある。

2. **Best-effort な engine 通知** — \`engine_handle.is_some()\` のときだけ行う。3 スロット (head、safe、finalized) すべてを新しい hash に向けた \`ForkchoiceState\` を build する。**なぜ 3 つすべて同じ hash なのか?** v0 では separate な finalization layer が無く、こちらのモデルではコミットされた block はすべて safe で finalized だからだ。Production の multi-validator chain は別々に track する (block は head になれるが、その descendant に 2/3 の validator が vote するまでは finalized にならない)。

3. **\`let _ = ...await\` は意図的だ** — engine のレスポンスを discard する。Engine の返す値は:
   - \`VALID\` — マッチする \`engine_newPayload\` をマッチする block body と共に先に送っていれば、これが happy case になる。
   - \`SYNCING\` — **今** 得るもの。\`newPayload\` を送っていないからだ。Engine は peer から block を fetch したいが、peer がいない。
   - \`INVALID\` — engine が拒否した block を canonical にせよと頼んだ、という意味だ。自分で build した block には実際には起きないはずだ。

**レッスン 14 では、3 つのレスポンスすべてが同じコードパス、continue に導く。** ローカル bookkeeping はすでに起きている。

> 🛑 **やりがちな勘違い。** 「\`INVALID\` で error を返さず、engine のレスポンスを discard するのはなぜか?」 **Bridge のローカル state が consensus 層の source of truth であって、Reth ではないからだ。** Reth が \`INVALID\` と言ったからといってローカル state を roll back すると、Malachite に「実はその decided block は存在しない」と告げることになり、chain が壊れる。この層での不一致に対する正しい応答は **大きな声でログする** こと、**operator にアラートする** ことであって、consensus commit を roll back することではない。**Reth の chain の view は consensus の下流であり、逆ではない。**

### Step 6: テスト更新 (rename + engine 接続を追加)

レッスン 13 の既存テスト \`live_bridge_builds_on_real_genesis\` を開く。既存テストを修正するのではなく、新規テストを **追加** する — レッスン 12/レッスン 13 のテストは依然として証明していることを証明し続け、別テストを追加することで新しい挙動を isolated に保つ。

\`crates/evm/src/live_node.rs\` の \`tests\` モジュールに append:

\`\`\`rust
    /// **Stage 7d**: with a Reth \`ConsensusEngineHandle\` installed, \`commit\`
    /// sends a \`ForkchoiceUpdated\` to the in-process Engine API. The bridge's
    /// own bookkeeping still happens (so existing callers don't regress), but
    /// now Reth is told about the new head too.
    ///
    /// At this stage the engine will respond SYNCING because we haven't sent
    /// a matching \`newPayload\` (\`build_payload\` doesn't yet produce a real
    /// \`ExecutionPayload\`). That's intentional: レッスン 14 proves the wire is
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

新規部分を順に見ていく:

1. **\`with_types::<EthereumNode>()\` + \`with_components(...)\` + \`with_add_ons(EthereumAddOns::default())\`** — 明示的な builder パスだ。\`launch_with_debug_capabilities\` (レッスン 11〜13) は \`add_ons_handle\` を expose しないショートカット。Beacon engine handle を pull するには、この明示的な形が必要だ。
2. **\`handle.node.add_ons_handle.beacon_engine_handle.clone()\`** — Engine handle は add_ons の中にある。内部的には \`Arc\` ベースの handle で、clone は安価だ。
3. **\`.with_engine_handle(engine_handle)\`** — 新規 builder メソッド。これが無いと \`commit\` はローカル bookkeeping だけを行う。あると \`commit\` が forkchoice も fire する。
4. **\`assert!(bridge.has_engine_handle())\`** — 接続の guard。\`with_engine_handle()\` にバグがあれば、テストの残りが走る前に catch できる。
5. **\`commit(block.hash).await.expect("commit failed")\`** — メインの assertion。**engine が返したものは check しない** — \`commit\` が \`Ok(())\` を返すかどうかだけを見る。Engine の SYNCING レスポンスは Step 5 で \`commit\` 内で discard される。
6. **Negative case を維持する** — unknown hash は依然として \`BridgeError::Rejected\` を返す。Bridge が engine パスに到達する前に bail するので、engine パスは fire しない。

> 🛑 **やりがちな勘違い。** 「\`launch_with_debug_capabilities\` を使って、add_ons_handle がそこにあると願えばいいのでは?」 **ダメだ — launch パスが違えば handle の shape も違ってくる。** \`launch_with_debug_capabilities\` は debug RPC 付きの \`NodeHandle\` を返すが、add_ons を expose しない。\`add_ons_handle\` をくれるのは明示的な builder chain (\`.with_types().with_components().with_add_ons().launch()\`) の方だ。**どの launch パスがどの handle shape を生成するかという知識は、特定のフィールドが必要になるまでは見えない詳細だ。**

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

…workspace 全体 38 個が合格するはず (レッスン 13 の 37 + 新規テスト)。

よくあるエラーと対処:

- **\`error[E0282]: type annotations needed for \`Option<ConsensusEngineHandle<_>>\`** — \`new()\` の \`engine_handle: None\` は型パラメータが推論される必要がある。Struct フィールドの型注釈が欠けているか間違っているか、\`EthEngineTypes\` import を忘れているかだ。Step 3 を再確認。
- **\`error: cannot find struct \`EthereumAddOns\` in module \`reth_node_ethereum::node\`** — \`reth-node-ethereum\` と他の \`reth-*\` の version drift だ。すべての git-pinned reth dep は同じ SHA を共有しなければならない。
- **テストが 30 秒以上 hang する** — 最有力原因は **\`EthereumNode\` のバックグラウンドタスク (engine actor、payload builder、libp2p、RPC stub 等) のクリーンアップが遅れ、Tokio runtime の解体がブロックされている**ことだ。テスト末尾で \`EthereumNode\` の所有権が drop される瞬間に、各 actor が \`JoinHandle\` の終了待ちに入るが、未処理の oneshot や残った socket が drop されないと runtime 全体が止まる。テストの最後に \`drop(handle);\` や明示的な \`node.task_executor().graceful_shutdown_with_timeout(...)\` などのクリーンアップが正しく走っているか確認しよう。
  - 補足: \`let _ = handle.fork_choice_updated(state, None).await\` から **\`.await\` を落とすと** これは **hang ではなく silent skip** になる (\`warning: unused implementor of 'Future'\` が出て、future はその場で drop され、engine への通知そのものがスキップされる)。\`.await\` 忘れは「Reth への通知が走らない」バグなので、テストは hang せずに通り抜けてしまう。挙動が hang か silent skip かで原因の場所が全く違うので、症状を切り分けてからデバッグする。
- **\`assert!(bridge.has_engine_handle())\` が fail する** — \`with_engine_handle\` は \`#[must_use]\` だが、return を bind し忘れている: \`let bridge = ...new(...); bridge.with_engine_handle(h);\` ではなく、\`let bridge = ...new(...).with_engine_handle(h);\` でなければならない。
- **Commit が \`Ok\` を返すが、unknown hash テストでも \`Ok\` が返る (rejection なし)** — commit ロジックが local lookup の前に engine パスに到達している。Step 5 を再確認 — \`?\` が \`BridgeError::Rejected\` を伝播し、engine ブロックの前に exit するはずだ。

## 設計の振り返り

3 つの load-bearing な決定:

1. **ローカル state を先に、engine を後に。** Bridge の \`chain: HashMap\` が consensus 層の source of truth だ。Engine に **先に** 送って失敗すると、ローカル state を roll back するかどうかを判断しなければならない — そして consensus commit を roll back するのは safety 違反だ。**順序が正しさを強制する: ローカルで成功してから下流に通知する。** このパターンは、primary store + secondary index/replica があるシステム全般に一般化する。

2. **\`Option<EngineHandle>\` がテスト surface をクリーンに保つ。** Optionality が無いと、すべての unit test が non-test な engine handle を得るためにフル node を bootstrap しなければならない。Optionality があれば、test は \`None\` を渡してローカルパスを exercise でき、integration test は \`Some(handle)\` を渡して両方を exercise できる。**型レベルの optionality が、全テストにインフラを強制せずに済ませる手段になる。**

3. **Engine レスポンスは意図的に discard する。** \`SYNCING\` が今期待されるレスポンスだ (\`newPayload\` を送っていないので)。これに error を返すと、すべての consumer に レッスン 14 が partial integration であることを知らせることを強制してしまう。Discard することで API contract をクリーンに保つ: 「commit はローカルで完了、下流通知は best-effort」だ。**クライアントが知る必要があることだけを知らせる — それ以上は不要だ。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 0cac571
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
\`\`\`

\`0cac571\` の参照には、本コースで導入していない追加コード (Stage 8 由来の CLOB integration) が含まれることがある。Stage 7d 固有の変更 — \`engine_handle\` フィールド、\`with_engine_handle()\` builder、\`commit\` body の再構成、\`add_ons_handle.beacon_engine_handle\` を使う integration test — は厳密に一致するはず。Doc コメントの言い回しは個人差があってよい。

戻る:

\`\`\`bash
git checkout main
\`\`\`

## よくある質問

**Q: \`add_ons_handle\` とは何で、なぜ engine handle がその中にあるのか?**
\`add_ons_handle\` は、launched node に attach された「追加 capability」 — RPC server、engine API endpoint、payload builder hook — の Reth bundle だ。Beacon engine handle がそれらの 1 つなのは、engine API が **外部の** CL クライアント (Lighthouse、Prysm) が JSON-RPC で使うものだからだ。こちらは handle を直接 pull することで in-process ショートカットを取っているが、同じ handle がネットワーク向け API も支えている。

**Q: なぜ \`ForkchoiceState\` には 3 フィールド (head/safe/finalized) があるのに、すべて同じ値に設定するのか?**
Engine API が、separate な finalization layer を持つ chain 用に設計されたからだ。Ethereum mainnet では head は slot ごとに (12 秒で) 進められるが、block が「safe」になるのは 32 slot 後 (Casper checkpoint)、「finalized」になるのは 64 slot 以降だ。こちらの v0 single-validator chain にはそんな区別はない — どのコミットも final だ。3 つすべてを同じ hash に設定するのが v0 の簡略化で、multi-validator OpenHL になれば区別する。

**Q: マッチする \`newPayload\` なしで \`ForkchoiceUpdated\` を受け取ると、engine は実際には **何を** するのか?**
\`PayloadStatusEnum::Syncing\` で応答し、内部的には peer から block を sync しようとし始める。こちらの isolated な dev node には peer がいないので、sync リクエストはどこにも届かない。Engine はその hash 用の「block 待ち」状態にただ座っているだけになる。**それで構わない** — レッスン 14 の目的で、engine に canonical chain を advance させる必要は実は無い。\`newPayload\` 経由で実 block body を導入する将来コースの教材が、このギャップを埋める。

**Q: Await ではなく、\`ForkchoiceUpdated\` を非同期に送って即座に return できるか?**
できる — \`tokio::spawn(handle.fork_choice_updated(...))\` で fire-and-forget にできる。だが await は fast (SYNCING で sub-millisecond) で、レスポンスをログするオプションも与えてくれる。Async-spawn アプローチはテストの順序も難しくする (テスト exit 前に engine が update を見るか?)。**Await が安全なデフォルトだ。**

## 次のレッスン (レッスン 15 — capstone)

完全な consensus↔EVM bridge ができた。**4 つの \`ConsensusBridge\` メソッドすべてが 実際の Reth コードパスに到達している。** レッスン 15 は capstone だ: フルシステムを示す 1 ページの recap、production には必要だが skip したもの (\`newPayload\` 経由の実 block body、stub の代わりに 実際の Codec impl、gossip codec、persistent WAL)、自然な次コース。新規コードは無く、victory lap と roadmap だけだ。`,
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

16 レッスンを通じて、空ディレクトリの \`cargo init\` から、実際の Reth EL を通じて実際の block を ~0.02 秒で確定させる single-validator BFT chain までたどり着いた。Workspace は今こう見える:

\`\`\`
~/code/my-openhl/
├── Cargo.toml                          ← reth-* 16 個、malachite 8 個、すべて SHA pin
├── bin/openhl/                         ← (stub バイナリ — production 接続は将来コース)
├── crates/
│   ├── types/                          レッスン 2:  CL↔EL 共通 contract 型
│   │   └── src/lib.rs                  BlockHash, PayloadId, PayloadAttrs,
│   │                                   ExecutedBlock, PayloadStatus
│   ├── evm/                            EL 側 (test double → live Reth)
│   │   ├── src/bridges/
│   │   │   ├── in_memory.rs            レッスン 4:  InMemoryEvmBridge (HashMap state)
│   │   │   └── reth.rs                 レッスン 5:  RethEvmBridge (alloy 型, real hash_slow)
│   │   ├── src/reth_node.rs            レッスン 11: bootstrap 証明 (test-only)
│   │   └── src/live_node.rs            レッスン 12〜14: LiveRethEvmBridge<P>
│   │                                   - レッスン 12: BlockNumReader 経由の parent lookup
│   │                                   - レッスン 13: EthBeaconConsensus validate
│   │                                   - レッスン 14: ConsensusEngineHandle forkchoice
│   └── consensus/                      CL 側 (フル BFT engine)
│       ├── src/bridge.rs               レッスン 3:  ConsensusBridge trait
│       ├── src/types/                  レッスン 6:  10 個の Malachite Context sub-type
│       ├── src/context.rs              レッスン 6:  Context<OpenHlContext> impl
│       ├── src/signing.rs              レッスン 7:  vote/proposal の canonical encoding
│       ├── src/signing_provider.rs     レッスン 7:  SigningProvider<OpenHlContext>
│       ├── src/codec.rs                レッスン 8:  OpenHlCodec (real 1 個 + stub 7 個 Codec impl)
│       ├── src/node.rs                 レッスン 9:  OpenHlNode + start_engine
│       └── src/engine_app.rs           レッスン 10: run_engine_app (AppMsg ルーティング)
\`\`\`

合計で **40-50 個のソースファイル**。Workspace テスト: 38 個合格。

このコース全体で開通させた **CL ↔ EL 結合の全体像** を 1 枚に落とすと、自分の手で繋ぎ切った境界線がどこを走っているかが一望できる:

\`\`\`
   [ CL: openhl-consensus ]                          [ EL: openhl-evm ]
  ┌──────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
  │  Malachite BFT Engine (actor system)      │    │   LiveRethEvmBridge<P>                    │
  │                                            │    │                                            │
  │   ├── OpenHlContext                         │    │    ├── provider: P (BlockNumReader        │
  │   │   (10 associated types — レッスン 6)            │    │    │             + HeaderProvider)         │
  │   ├── OpenHlSigningProvider                 │    │    ├── chain_spec: Arc<ChainSpec>          │
  │   │   (Ed25519 + canonical encoding — レッスン 7)   │    │    │   (共有 source of truth — レッスン 13)         │
  │   ├── OpenHlCodec                           │    │    ├── validator:                          │
  │   │   (1 Real + 7 Stub — レッスン 8)                │    │    │   EthBeaconConsensus<ChainSpec> (レッスン 13) │
  │   ├── OpenHlNode / OpenHlNodeHandle (レッスン 9)    │    │    ├── engine_handle:                      │
  │   └── run_engine_app loop                   │    │    │   Option<ConsensusEngineHandle> (レッスン 14) │
  │       (12 AppMsg arms — レッスン 10)                │    │    └── state: Mutex<{ pending, chain,      │
  │                                              │    │                       head, … }>          │
  └──────────────────┬──────────────────────────┘    └──────────────────┬──────────────────────┘
                     │                                                  ▲
                     │ ── 4 つの ConsensusBridge メソッド契約越しに対話 ─┘
                     │   (レッスン 3 で定義した trait surface)
                     │
                     ├── ① build_payload(parent, attrs)
                     │     CL ──► EL : 「次の block を組み立てろ」
                     │     EL ──► CL : PayloadId (即返却、Reth が裏で構築)
                     │     裏側: provider から parent_header 取得 →
                     │           ChainSpec::next_block_base_fee + gas_limit copy
                     │           + timestamp 単調化 → header 合成 → pending に格納
                     │
                     ├── ② payload_ready(id)
                     │     CL ──► EL : 「さっきの PayloadId、ブロック寄越せ」
                     │     EL ──► CL : ExecutedBlock (pending から回収)
                     │     ※ 4 method の中で唯一データが EL → CL 方向の seam
                     │
                     ├── ③ validate_payload(&block)
                     │     CL ──► EL : 「peer から来た proposal、検証してくれ」
                     │     EL ──► CL : PayloadStatus { Valid / Invalid / Syncing }
                     │     裏側: EthBeaconConsensus::validate_header_against_parent
                     │           (4 sub-check: number / timestamp / gas-limit / EIP-1559)
                     │
                     └── ④ commit(hash)
                           CL ──► EL : 「2/3+ で合意成立、確定させろ」
                           EL ──► CL : Ok(())
                           裏側 Phase 1 (絶対成功): state.chain.insert + head 更新
                           裏側 Phase 2 (best-effort): ConsensusEngineHandle::
                               fork_choice_updated → Reth の in-process Engine API
                               (現状 body 無しなので SYNCING 応答、レスポンスは破棄)
\`\`\`

ポイントは 3 つ: (a) **左右の世界は レッスン 3 で定義した \`ConsensusBridge\` trait の 4 メソッドだけで会話する** — 巨大なインフラ 2 つを繋ぐ唯一の接着面がここに収まっている。(b) **\`run_engine_app\` (レッスン 10) が \`B: ConsensusBridge\` ジェネリックなので、StubBridge / InMemoryEvmBridge / RethEvmBridge / LiveRethEvmBridge の 4 種類の bridge が同じ loop で走る** — 多態性の payoff。(c) **\`LiveRethEvmBridge\` 内部の \`chain_spec: Arc<ChainSpec>\` が build_payload と validate_payload の両方で参照される共有 source of truth** で、ここが分かれた瞬間に self-fork が発生する。設計判断はすべて、この 1 枚の図のどこかに焼き込まれている。

## 4 つの \`ConsensusBridge\` メソッド — 全部 live

各行はコース後のメソッドの最終状態:

| メソッド | 最初の impl | Live impl | 今到達する real Reth コード |
| - | - | - | - |
| \`build_payload\` | レッスン 4 (in-memory) | レッスン 13 | \`HeaderProvider::sealed_header_by_hash\`, \`ChainSpec::next_block_base_fee\` (validator と同じヘルパー) |
| \`payload_ready\` | レッスン 4 (in-memory) | レッスン 13 | (Reth call なし — 設計上 bridge の pending map) |
| \`validate_payload\` | レッスン 4 (stub Valid) | レッスン 13 | \`EthBeaconConsensus::validate_header_against_parent\` (4 sub-check: number / timestamp / gas-limit / EIP-1559 base fee) |
| \`commit\` | レッスン 4 (HashMap insert) | レッスン 14 | \`ConsensusEngineHandle::fork_choice_updated\` via in-process Engine API |

Bridge は Reth のストレージ層 (\`HeaderProvider\`)、Reth の chain config (\`ChainSpec\`)、Reth の consensus validator (\`EthBeaconConsensus\`)、Reth の engine actor (\`ConsensusEngineHandle\`) と会話する。これは CL クライアントが触る Reth の public surface のほとんどに相当する。

## まだ placeholder のもの

このコースは **動く single-validator chain** を ship した。まだないものを正直に call out しておく。以下の各項目は意図的な scope cut であって、偶然ではない:

### 1. Engine \`newPayload\` 統合

**ステータス**: 欠落。

\`commit\` は \`ForkchoiceUpdated\` を送るが、Reth の engine はマッチする block body が無いので \`SYNCING\` で応答する。\`VALID\` まで進めるには:

- \`build_payload\` の出力を、実際の \`ExecutionPayload\` として (トランザクションリスト付きで、空でも) encode する。
- \`fork_choice_updated\` 呼び出しの **前に**、\`handle.new_payload(payload).await\` 経由で送る。
- レスポンスチェーンを合わせる: \`newPayload → VALID\` → \`forkchoice → VALID\` → canonical head が advance する。

ブロッカーは、payload に入れる EVM-executable なトランザクションをまだ持っていないことだ。OpenHL の matching engine (CLOB) が生成するのは **約定 (fill)** であって、ユーザーが ECDSA で署名する通常の EVM トランザクションではない。仮にユーザー署名トランザクションとして mempool 経由で流す形にすると、ガスコストと mempool レイテンシが price-time-priority CLOB のパフォーマンスを殺してしまう (HL 系チェーンの存在意義そのものが消える)。代わりに本物の Hyperliquid 型チェーンは、**コンセンサスが合意した約定データを \`build_payload\` / \`newPayload\` のタイミングで「protocol-initiated なシステムトランザクション」あるいは「専用 precompile への直接ステートインジェクション」として、ユーザー署名なしで \`ExecutionPayload\` に差し込む** — \`Vec<Fill>\` を EVM ステートに反映させるルートをコンセンサス側から開通させる、というアプローチを採る。この「約定 → 特権的な system tx / precompile injection としての payload 編入」を組むのが、本コースの次の大きな作業になる — おそらく OpenHL実装のステップ 2 全体に相当する作業だ。

### 2. Real \`Codec\` impl

**ステータス**: real 1 個 (\`OpenHlProposalPart\` — 空バイト)、stub 7 個 (\`CodecStub\` error を返す)。

Single-validator モードでは、gossip メッセージ (\`SignedConsensusMsg\`、\`LivenessMsg\`、\`StreamMessage\`)、WAL writes (\`ProposedValue\`)、peer sync (\`Status\`、\`Request\`、\`Response\`) の codec は **決して fire しない**。2 番目の validator を追加した瞬間、すべての cross-validator メッセージがこれらの stub のいずれかに当たる。

拡張するには、wire format (protobuf、borsh、JSON) を選び、各型の encode/decode を書く。Malachite の \`code/crates/test/src/codec/\` にある ~400 行の手書き protobuf が canonical な reference になる。

### 3. Multi-validator gossip

**ステータス**: 一度も exercise していない。

\`OpenHlNode\` はすでに libp2p (\`/ip4/127.0.0.1/tcp/0\`) を configure している。未テストなのは:
- 2 個の \`OpenHlNode\` instance が互いを discover すること。
- ネットワーク partition 下での vote propagation。
- Vote-extension exchange。
- 遅れた validator の sync。

Codec stub (#2) が real になり、N=2 の node が共有 chain spec に対して立ち上がれば、multi-validator integration test が次の自然なステップになる。

### 4. 永続 WAL

**ステータス**: エフェメラル tempdir。

すべてのテストが \`tempfile::tempdir()\` を使うので、MDBX state は各 run の後に消えてしまう。Production には、再起動を生き残る configurable な \`home_dir\` が必要だ。追加は機械的だが (path を \`OpenHlNode::new\` 経由で route するだけ)、**crash recovery** の検証 (commit 途中で node を kill し、再起動し、chain head が正しいことを assert する) には、実際の WAL codec impl と、特に chaos-engineering 形式の Test Plan が必要になる。

### 5. Slashing + double-sign detection

**ステータス**: なし。

Production BFT chain は、validator の不正挙動 (同じ高さで異なる block 2 個を sign、同じ round で 2 回 vote) を track する。Malachite は \`LivenessMsg\` にそのためのフックを持っているが、OpenHL では接続していない。**Slashing 無しの multi-validator chain は testnet には問題ないが、value を扱うネットワークには危険だ。**

### 6. Custom な Hyperliquid 型挙動

**ステータス**: vanilla Ethereum。

「Hyperliquid 型」chain の要点は、Hyperliquid を generic な EVM と区別する precompile と、CLOB 駆動の payload assembly にある。Stage 8 (CLOB matching engine、約定を payload に取り込む処理) と Stage 9 (custom precompile、\`clob_place_order\` write path) は \`psyto/openhl\` に住んでいるが、ここではカバーしない。将来コースの自然な ステップ 2 だ。

## Production-readiness チェックリスト

「テストが pass する」から「real value を任せていい」までの作業:

- [ ] 7 個の Codec stub すべてを real protobuf/borsh/JSON impl で置き換え。
- [ ] \`engine_newPayload\` 統合で engine が bridge の canonical chain view にマッチするように。
- [ ] N=2+ node 共有 chainspec に対する multi-validator integration test が合格。
- [ ] WAL crash-recovery test (commit 途中で kill、再起動、chain head 検証)。
- [ ] Production デプロイ用に永続 \`home_dir\` (tempdir ではない) を configure。
- [ ] Engine \`SYNCING\`/\`VALID\`/\`INVALID\` レスポンスを \`tracing::warn\` / structured field でログ、discard しない。
- [ ] Slashing/double-sign フックを接続して unit test を書く。
- [ ] Key rotation 手順 (chain restart 時の Ed25519 key swap、runtime ではなく)。
- [ ] 運用テレメトリ: round duration、payload build latency、validate failure の Prometheus metric。
- [ ] パフォーマンスベースライン: 連続負荷下の blocks-per-second (smoke test だけではなく)。
- [ ] Canonical encoding format の独立セキュリティレビュー (レッスン 7 のバイトレイアウトは **wire spec の一部**)。
- [ ] 部分的ネットワーク partition 下の proposer manipulation の脅威モデル。

このコースのコードを production chain に fork するなら、このリストを long-pole 作業として扱うこと — ほとんどはコース自体より難しい作業だ。

## 16 レッスン前にはできなかった、今できること

- **実際の EL に対してフルな Rust BFT engine を bootstrap できる。** 「mocked EL で」でも「Go への FFI で」でもなく、同じ Rust workspace で \`EthereumNode\` を実際に走らせられる。
- **producer/validator の自己整合性について推論できる。** 同じ artifact の builder と validator があるときは、source of truth を共有しなければならない。\`chain_spec.next_block_base_fee\` が \`build_payload\` と \`validate_payload\` の両方を駆動するパターンを見た。
- **incremental-stub パターンを適用できる。** Trait bound が surface area を強制してくる。一度に全部埋められないなら、明確な failure mode で stub する。レッスン 8 の \`CodecStub("SignedConsensusMsg<OpenHlContext>")\` がそのモデルだ。
- **2 つの汎用インフラを接続できる。** Reth と Malachite は別のチームが別の sensibility で書いている。Handshake interface (\`Node\` trait、\`ConsensusBridge\` trait) がそれらを composable にした。将来コースは別のインフラで同じパターンを使う。
- **プロトコルエラーと運用エラーを区別できる。** \`BridgeError::Rejected\` と \`BridgeError::Internal\`、\`PayloadStatus::Invalid\` と伝播。会話レベルが重要だ。
- **live read が起きたことを証明するテストを書ける。** レッスン 12 の \`assert_eq!(block.number, 1)\` が load-bearing なチェックだった — 他のものだと in-memory fallback がすり抜けてしまう。

## 次に行く先

rethlab 内:
- **Reth Expert** (track \`reth-l1-architect\`、Step 2 (CLOB)+) — \`BlockExecutor\`、state-root verification、MDBX 内部の deep dive。\`validate_payload\` に実際にトランザクションを実行させたくなったら自然に次に来るコースだ。
- **Reth Consensus Engineering** — slashing、vote extension、fault tolerance を深くカバーする。Multi-validator gossip が動くようになった後に行く場所だ。

rethlab 外:
- **\`psyto/openhl\` Stages 8-9** — CLOB と custom precompile。Source code は public repo にあるが、walkthrough コースはまだ無い。
- **Malachite spec docs** (\`informalsystems/malachite\`) — \`core-types\` crate の doc を読み通す。半分はすでに馴染みがあり、残り半分が multi-validator に必要なものになる。
- **Real Reth full node** — \`paradigmxyz/reth\` を clone し、\`cargo run --bin reth -- node --chain dev\` を走らせる。レッスン 11 の \`EthereumNode::default()\` と同じものから consensus 層を引いた形だ。Surface を比較してみる。
- **\`category-labs/monad-bft\`** — もう 1 つの成熟した Rust 製 BFT consensus 実装、現在も活発開発中（2026 年中頃時点で 672★、GPLv3 ライセンス）。本コースが使う Malachite は consensus を「embedding chain が plug できる context type 付きの汎用 state-machine library」として扱う。一方 Monad-BFT は単一の execution layer のために purpose-built で、block proposal と execution を pipeline して finality latency を amortize する。両者は正直に対立する設計トレードオフだ: **Malachite は *embeddability* に最適化** (どこにでも wire しやすい — 本コースの レッスン 0〜7 でやったように)、**Monad-BFT は *single-chain throughput* に最適化** (速いが reuse は難しい)。本コース後に読むと「Rust BFT は単一の shape ではない」と腹落ちする。**ライセンス注意:** GPLv3 のため citation や読解は OK だが、code を openhl tree に copy するのは NG — openhl は permissive license で、copyleft が伝染する。

## クロージングノート

Consensus と EVM crate を合わせて約 1,400 行の Rust、それに加えて ~250 行の integration test を書いた。そのコードは **動く single-validator な Hyperliquid 型 レッスン1** だ。Production-ready ではないが、そうである必要もない。**手にあるのは、scope について正直で、すべての load-bearing な決定が visible で、次の capability への extensible なインターフェースが 1 つ離れたところにある基盤だ。**

レッスン 1 の最も難しい部分は engine を書くことではない — Malachite がほとんどやってくれて、こちらは接続しただけだ。最も難しい部分は、自分のコードに何ができて何ができないかについて正直であること、そして「できる」側を証明するテストを書くことだ。本コースのすべてのレッスンが happy-path の assertion と negative-path の assertion を持っていた。「テストが pass する」から「システムが動く」への鍛錬は、そこにある。

これを使って、何か作りに行こう。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
