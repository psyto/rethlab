import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlConsensusJA(prisma: PrismaClient) {
  const tags = ['reth', 'malachite', 'bft', 'evm', 'openhl', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-openhl-consensus-ja',
      title: 'Step 1. Consensus — cargo init から single-validator devnet 構築',
      description:
        'Hyperliquid シェイプの L1 コンセンサス層をスクラッチで構築する。プロダクションクオリティの Reth (EVM) と Malachite (BFT) を単一の Rust workspace へ統合し、end-to-end でのブロック生成機構を実装。リファレンス実装（psyto/openhl）をベースに手を動かしながら学ぶ、「DIY Perp シリーズ」の記念すべきファーストステップである。',
      difficulty: 'EXPERT',
      duration: 660,
      xpReward: 1340,
      track: 'diy-perp',
      tags,
      isPublished: true,
      sortOrder: 602,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Orientation',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'レッスン0 — OpenHL を自作する（cargo init → single-validator devnet）',
                  slug: 'openhl-orientation-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 20,
                  xpReward: 60,
                  content: `# レッスン0 — OpenHL を自作する（\`cargo init\` → single-validator devnet）

## 問い

Hyperliquid 型の chain を Rust でゼロから作るとき、最初に到達すべき「動く核」はどこか？ そして、それを **読んで理解する** のではなく **自分で組み上げる** には何が要るか？

> 注: OpenHL コースのコードブロックは原則として手元で実行可能な形で示す。ただし \`<file>\` などのプレースホルダや答え合わせ用コマンドは、各レッスンの指示に従って置換してから実行すること。

## 原理（最小モデル）

これは「読む」コースではなく「**作る**」コースだ。3 つだけ掴めばいい。

- **2 つのディレクトリ。** \`~/code/my-openhl/\`（自分で 1 行ずつ書く本番 workspace）と \`~/code/openhl-reference/\`（\`psyto/openhl\` の clone = 答え合わせの鏡、read-only）。編集は必ず my-openhl 側。
- **30秒 BFT primer。** BFT consensus は *round* の繰り返し。各 round は **propose**（proposer がブロック提案を broadcast）→ **prevote**（全 validator が投票）→ **precommit**（投票を lock）。≥ 2/3 が precommit したら **decided**（確定）。proposer は validator set から決定論的に選ばれる。Malachite がこの state machine を Rust で駆動する。
- **到達点は 1 つのテスト。** レッスン15 まで来ると \`cargo test first_block_via_engine_actors\` が ~0.02 秒で pass する。EVM 層は実 Reth、BFT 層は実 Malachite。chain は **CL（Consensus Layer）** と **EL（Execution Layer）** の 2 層で、本コースで両側を bridge contract で接続する。

**propose / prevote / precommit / decided / proposer** — この 5 語を頭に入れれば以降の語彙がクリーンに着地する。

## 具体例

レッスン15 時点のコードパス。各行すべて自分が書いたコードで、マジックはない。

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

## 失敗例（誤解）

「\`openhl-reference\` を直接編集すれば早い」は誤り。reference は答え合わせ専用。ここに書くと、**どこまでが自分の実装か追えなくなり**、自分のコードと借り物の境界が消える。編集は必ず \`my-openhl/\` 側で行う。

---

ここまでで「2 ディレクトリ・BFT の骨格・到達点」は着地した。ここから先はセットアップ実行・スコープ・16レッスンの地図に入る。

> 🛑 **セルフチェック。** 次に進む前に 1 文で言えるか：\`~/code/my-openhl\` と \`~/code/openhl-reference\` の役割の違い。言えなければ下の「セットアップ」を読み直す。曖昧なまま走ると、後半で reference 側にうっかり書いて境界が消える事故が起きる。

## セットアップ（いま実行する）

\`\`\`bash
# 自分の workspace
mkdir -p ~/code/my-openhl && cd ~/code/my-openhl
cargo init --lib
# (root パッケージ名はレッスン1 で workspace 化する際に消える。ここでは初期 commit を取るだけ)

# reference と同じ toolchain を強制
echo -e '[toolchain]\\nchannel = "1.95.0"' > rust-toolchain.toml

# 答え合わせ用リファレンス
mkdir -p ~/code && cd ~/code
git clone https://github.com/psyto/openhl.git openhl-reference
cd openhl-reference
cargo check  # 初回は時間がかかる — Reth は大きい
\`\`\`

reference 側で \`cargo check\` が pass すれば toolchain は正しい。

## スコープ — 作るもの / まだ作らないもの

本コースは **OpenHL 実装のステップ1（コンセンサス基盤）のみ**。扱わない: ステップ2 CLOB / ステップ3 EVM precompile / ステップ4 funding・oracle・liquidation / ステップ5 vault。これらは後続コース。本コース修了時に手に入るのは **BFT と EVM を接続した最小コンセンサス基盤** で、**動く perp DEX はまだ完成しない**（ステップ2〜5 を積んで成立する）。スコープを正直に区切るための線引きだ。

## 16 レッスンの地図

各レッスンは pass する \`cargo test\` で終わる。

| # | build するもの | 終了時テスト |
| - | - | - |
| 0 | Orientation（本レッスン） | setup 確認 |
| 1 | workspace + Reth/Malachite pin | \`cargo check --workspace\` |
| 2 | \`openhl-types\` primitives | \`cargo test -p openhl-types\` |
| 3 | \`ConsensusBridge\` trait | \`cargo check -p openhl-consensus\` |
| 4 | \`InMemoryEvmBridge\`（fake EVM） | InMemoryEvmBridge tests |
| 5 | \`RethEvmBridge\`（Reth 型） | RethEvmBridge tests |
| 6 | \`OpenHlContext\` + 10 sub-types | context compiles |
| 7 | \`OpenHlSigningProvider\`（Ed25519） | sign/verify round-trip |
| 8 | \`OpenHlCodec\` | codec round-trip |
| 9 | \`OpenHlNode\` + \`start_engine\` | engine start/stop smoke |
| 10 | \`run_engine_app\`（actor pipeline） | **\`first_block_via_engine_actors\`** ← 前半最大の milestone |
| 11 | 実 Reth dev-node 起動 | \`reth_dev_node_bootstraps\` |
| 12 | \`LiveRethEvmBridge\`（build path） | \`live_bridge_builds_on_real_genesis\` |
| 13 | \`LiveRethEvmBridge\`（validate path） | validate-path tests |
| 14 | \`LiveRethEvmBridge\`（commit path） | \`commit_sends_forkchoice_to_engine\` |
| 15 | Capstone | （コード追加なし） |

**レッスン10 が最大の milestone** — actor system 経由で BFT が end-to-end でブロックを 1 つ生成する。11〜14 で stub Reth を実 Reth に差し替え、commit を Engine API へ接続する。

## 前提知識

必要: Rust 1.95+ / Git / Cargo workspace・async/await・trait impl の基本（\`#[async_trait]\` や \`impl Trait for Foo\` が未知なら本コースは速すぎる — 先に Fundamentals/Advanced へ）/ Rust 対応エディタ / ~4GB の空きディスク。不要: consensus・Reth・Malachite の事前知識（進めながら学ぶ）/ マルチマシン環境（全て 1 プロセス）。

## 合格基準

\`\`\`bash
rustc --version                                   # 1.95.x 以降
ls ~/code/my-openhl                               # Cargo.toml, src/
cd ~/code/openhl-reference && cargo check         # Finished
\`\`\`

3 つ pass すればセットアップ完了。

## まとめ（3行）

- これは「作る」コース。my-openhl に自分で書き、openhl-reference で答え合わせする（reference は編集しない）。
- BFT round = propose → prevote → precommit → decided。Malachite が駆動、自分は \`Context\` 経由で配線する。
- ゴールは \`first_block_via_engine_actors\`（CL=Malachite / EL=実 Reth）。本コースはステップ1 のみ、perp DEX はまだ完成しない。`,
                },
              ],
            },
          },
          {
            title: 'Foundations',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'レッスン1 — Workspace + Reth + Malachite',
                  slug: 'openhl-workspace-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 45,
                  xpReward: 150,
                  content: `# レッスン1 — Workspace + Reth + Malachite

## 問い

なぜ OpenHL の最初の1手は「機能実装」ではなく「依存固定」なのか？

## 原理（最小モデル）

OpenHL 初期構築の本質は、**コードを書く前に再現性を固定する**こと。

- 再現性の単位は「crate 単体」ではなく **workspace 全体**
- Reth / Malachite は巨大依存なので、途中でぶつかると手戻りが大きい
- 本番系 L1 では semver 範囲指定より **release-tag の commit SHA pin** が優先される（バリデータ間でバイト単位の一致が要るため）

つまり最初のゴールは「機能」ではなく、**依存グラフが安定して解決できる土台**を作ること。

## 具体例

このレッスンで通すべき最小の完了条件は 1 つだけ。

\`\`\`bash
cargo check --workspace
\`\`\`

これが通る状態を先に作ると、後続レッスンは「依存調整」ではなく「設計そのもの」に集中できる。**アプリケーションロジックは 1 行も書かない** — それはレッスン 2 以降だ。

## 失敗例（誤解）

「まず actor や bridge を書き始めれば速い」は誤り。依存固定を後回しにすると、途中で Reth 系の transitive 衝突が出て、**実装と環境調整が混ざり、原因の切り分けが難しくなる**。

---

ここまでで「なぜ依存固定が初手か」は着地した。ここから先は、その原理を**実際の workspace で組み立てる**深掘りに入る。手を動かすパートは copy-paste で通る完全形にしてある。

> 🛑 **考えてみよう。** スクロールする前に、root の \`Cargo.toml\` に書く \`members\` が何個になるか手元で書き出す。ヒント: ライブラリ crate 10 個 + binary crate 1 個。

## ステップで組み立てる

### 前提

レッスン 0 の続き。手元には \`~/code/my-openhl/\`（自分の workspace）と \`~/code/openhl-reference/\`（\`psyto/openhl\` clone、答え合わせ専用）がある。編集は **すべて my-openhl 側**。各 stage は openhl の実 commit \`75be9de\` → \`5fc7ca1\` に対応する（これは *openhl 側* の commit で、下の Reth/Malachite の git rev とは別物）。

### Step 1: workspace をリセット

\`\`\`bash
cd ~/code/my-openhl
rm Cargo.toml Cargo.lock src/lib.rs
rmdir src
ls -la            # .git だけが残る
\`\`\`

### Step 2: root \`Cargo.toml\`（依存はまだ Reth/Malachite 抜き）

\`\`\`toml
[workspace]
resolver = "3"
members = [
    "bin/openhl",
    "crates/types", "crates/codec", "crates/clob", "crates/oracle",
    "crates/funding", "crates/liquidation", "crates/vault",
    "crates/evm", "crates/consensus", "crates/node",
]

[workspace.package]
version      = "0.1.0"
edition      = "2024"
rust-version = "1.95"
license      = "MIT OR Apache-2.0"

[workspace.dependencies]
# 内部 crate（path 依存）— 後続レッスンで相互参照する
openhl-types = { path = "crates/types" }
openhl-codec = { path = "crates/codec" }
openhl-clob  = { path = "crates/clob" }
openhl-evm   = { path = "crates/evm" }
openhl-consensus = { path = "crates/consensus" }
# （oracle/funding/liquidation/vault/node も同様に path 宣言）
# 共通ユーティリティ
serde       = { version = "1", features = ["derive"] }
tokio       = { version = "1", features = ["full"] }
async-trait = "0.1"
thiserror   = "1"
eyre        = "0.6"
tracing     = "0.1"
# --- Reth / Malachite は Step 7 / Step 8 でここに追加 ---

[workspace.lints.rust]
unsafe_code = "forbid"
\`\`\`

**本質的な選択が 3 つ（深掘りはここ。理由は 1 行ずつ）:**

1. **\`resolver = "3"\`** — feature unification を厳格化。Reth/Malachite の複雑な feature flag が後で衝突するのを防ぐ。
2. **\`unsafe_code = "forbid"\`（workspace 全体）** — アプリ層で \`unsafe\` を禁止。pure state-machine が \`unsafe\` を欲しがった瞬間が review の警告サイン。これが本コースの determinism ルール。
3. **\`[workspace.dependencies]\` に一元宣言** — 各 crate は \`{ workspace = true }\` で継承する。Reth の version bump が 11 crate スイープではなく **root 1 行**で済む。（このブロックを省くと、Step 4 の crate 側 \`{ workspace = true }\` が継承先を失い \`cargo check\` が落ちる。）

### Step 3: \`rust-toolchain.toml\`（root に置く）

\`\`\`toml
[toolchain]
channel    = "1.95.0"
components = ["clippy", "rustfmt"]
profile    = "minimal"
\`\`\`

これがないとマシンごとに違う rustc で別アーティファクトが出る（determinism risk）。

### Step 4: crate テンプレートを 1 つ作る → 残り 9 つに展開

まず \`crates/types\` を完全な形で作る:

\`\`\`bash
mkdir -p crates/types/src
\`\`\`

\`crates/types/Cargo.toml\`:

\`\`\`toml
[package]
name         = "openhl-types"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }

[dependencies]
serde = { workspace = true }

[lints]
workspace = true
\`\`\`

\`crates/types/src/lib.rs\`:

\`\`\`rust
//! Shared primitives and CL/EL contract types.
\`\`\`

**残り 9 crate は \`name\` と doc comment を変えるだけ**（\`mkdir -p crates/<name>/src\` → 上の 2 ファイルを配置）。\`[dependencies]\` は最初は空でよい（実依存は使うレッスンで足す）。

| crate | \`name\` | \`lib.rs\` doc |
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

### Step 5: \`bin/openhl\`

\`\`\`bash
mkdir -p bin/openhl/src
\`\`\`

\`bin/openhl/Cargo.toml\`:

\`\`\`toml
[package]
name         = "openhl"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }

[[bin]]
name = "openhl"
path = "src/main.rs"

[dependencies]

[lints]
workspace = true
\`\`\`

\`bin/openhl/src/main.rs\`:

\`\`\`rust
fn main() {
    println!("openhl v{}", env!("CARGO_PKG_VERSION"));
}
\`\`\`

### Step 6: 依存ゼロで最初の \`cargo check\`

\`\`\`bash
cargo check --workspace      # 期待: "Finished"（unused-dep 警告は正常）
\`\`\`

落ちる主因: \`members\` の crate 名タイプミス / \`src/lib.rs\` 欠落 / \`[lints]\` に \`workspace = true\` 抜け。全部潰してから次へ。

### Step 7: Reth を pin（v2.2.0 release-tag SHA — Stage \`75be9de\`）

root の \`[workspace.dependencies]\` の \`# --- Reth / Malachite ...\` 行を、次で置き換える（rev は実 SHA、copy-paste 可）:

\`\`\`toml
# --- Reth (v2.2.0 release tag に pin。main HEAD には絶対 pin しない) ---
reth-node-builder        = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-node-ethereum       = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-provider            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-evm                 = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-consensus           = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-consensus  = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
# 後続レッスンで使う reth-* はここに追記していく（全て同一 rev で揃える）
reth-primitives-traits   = "0.3"
alloy-primitives         = { version = "1.5", default-features = false }
alloy-consensus          = { version = "2.0", default-features = false }
\`\`\`

なぜ release-tag SHA か: \`version = "2.2"\` や branch pin は Reth が無関係な変更を出した瞬間に壊れうる。テスト済みの tag SHA に固定すれば安定ターゲットになる。**全 reth-* を同一 rev で揃える**のが鉄則（混在は transitive 衝突の元）。

\`\`\`bash
cargo check --workspace      # 初回は Reth の transitive ~600 crate fetch で 5-15 分
\`\`\`

ここはまだ resolution だけ（どの crate も Reth を *use* していない）。Finished になれば OK。

### Step 8: Malachite を pin（v0.5.0 — Stage \`5fc7ca1\`）

\`[workspace.dependencies]\` の末尾に追加（crate 名は \`informalsystems-malachitebft-*\` prefix、rev は実 SHA）:

\`\`\`toml
# --- Malachite BFT (v0.5.0 release tag に pin) ---
informalsystems-malachitebft-core-types     = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-core-consensus = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-engine         = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-app-channel    = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-codec          = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
informalsystems-malachitebft-signing-ed25519 = { git = "https://github.com/informalsystems/malachite", rev = "9ef02b33c4ded5fe3e072631d86448658680fe55" }
\`\`\`

Rust ソースでは snake_case 化（\`informalsystems_malachitebft_core_types::Context\`）で参照する。

### Step 9: 最終検証

\`\`\`bash
cargo check --workspace      # 期待: "Finished"
cargo run --bin openhl       # 期待: "openhl v0.1.0"
\`\`\`

## 答え合わせ（reference SHA との照合）

\`\`\`bash
cd ~/code/openhl-reference && git checkout 5fc7ca1
diff -ru ~/code/my-openhl/Cargo.toml ./Cargo.toml
\`\`\`

差分が whitespace / コメント程度なら OK。\`members\` の集合・両 rev pin・resolver が一致していれば依存グラフは正しい。**意味のある差分が出たら設計判断のどこかがズレている** — Step 2/7/8 を読み直す。

## 合格基準

- \`cargo check --workspace\` が \`Finished\`
- \`cargo run --bin openhl\` が \`openhl v0.1.0\`
- \`members\` が 10 crate + 1 bin、Reth/Malachite が同一 rev pin（semver 範囲ではない）
- reference の \`5fc7ca1\` と \`Cargo.toml\` が構造的に一致

## まとめ（3行）

- OpenHL の初手は「機能追加」ではなく「再現性固定」。
- 依存は workspace で一元管理し、release-tag SHA pin で揺れを止める。
- 概念が着地してから実 workspace を組み立て、reference SHA で答え合わせする。`,
                },
              ],
            },
          },
          {
            title: 'Contract types',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'レッスン2 — openhl-types の共通 contract type',
                  slug: 'openhl-contract-types-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン2 — \`openhl-types\` の共通 contract type

## 問い

CL と EL が共有する語彙（\`BlockHash\`、\`PayloadId\` など）は、どの crate に置くべきか？ そして \`validate_payload\` の verdict は、なぜ \`bool\` ではダメなのか？

## 原理（最小モデル）

4 つの設計判断がこのレッスンの核だ。

- **共通語彙 crate（shared vocabulary crate）。** \`BlockHash\` を \`openhl-consensus\` に置くと evm がそこに依存し、consensus も evm のメソッドを呼ぶ → A→B かつ B→A の循環依存。Rust は許さない。解決は中立な第三 crate \`openhl-types\` に両者が依存すること。Reth も \`alloy-primitives\` で同じことをやる。
- **Newtype パターン。** \`type BlockHash = [u8;32]\`（alias）ではなく \`struct BlockHash([u8;32])\`（wrap）。alias だと無関係な \`[u8;32]\` を \`BlockHash\` の場所に渡せてしまう。newtype は compiler に「これはただの32 byte ではなく block hash だ」と強制させる。
- **三状態の \`PayloadStatus\`（Valid / Invalid / Syncing）。** EL の応答に対する consensus の action は 2 つでなく **3 つ**（投票 / 否決 / 棄権）。\`bool\` に潰すと「棄権」が消える。
- **custom \`Display\`。** default の \`Debug\` は \`BlockHash([171, 18, ...])\` を出してログが読めない。\`0xab12...\` を出す \`Display\` を書く。ログは debugger の主戦場で、可読性は optional ではない。

## 具体例

newtype の効き目:

\`\`\`rust
let h: BlockHash = [0u8; 32];   // ❌ compile error（明示的に BlockHash(...) で包む必要）
let h = BlockHash([0u8; 32]);   // ✅
\`\`\`

## 失敗例（誤解）

「\`PayloadStatus\` は \`bool { is_valid }\` で十分」は誤り。\`Syncing\` を \`Invalid\` 扱いすると、本来追いつけたはずの peer から **永続的に fork** する。\`Invalid\` を \`Syncing\` 扱いすると bad proposal が timeout 経由で素通りし chain が腐る。3 状態は consensus の 3 action（投票 / Nil 投票 / 棄権）と 1:1。

---

ここまでで「どこに置くか・なぜ newtype・なぜ三状態」は着地した。ここから \`crates/types/src/lib.rs\` に 5 type を組み立てる。コードは完全形。

> 🛑 **予測。** 下のコードを読む前に：**なぜ \`PayloadStatus\` は \`bool\` でなく 3 variant の enum か？** ヒント：EL が各回答を返したとき consensus が取れる action は 2 つでなく 3 つある。

## ステップで組み立てる

### Step 1: import（doc comment の下に）

\`\`\`rust
//! Shared primitives and CL/EL contract types.

use std::fmt;

use serde::{Deserialize, Serialize};
\`\`\`

\`std::fmt\` は \`BlockHash\` の \`Display\` 用、\`serde\` は全 type の derive 用（contract type は最終的に wire format で round-trip する）。

### Step 2: \`BlockHash\` + \`Display\`

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

要点: 32 bytes でも \`Copy\`（memcpy は安く、block hash は頻繁に渡す）。10 個の derive は contract type の標準セット（\`Ord\` はソート用、\`Hash\` は HashMap key、\`Serialize\` は wire）。\`{b:02x}\`（zero-pad 2桁）であって \`{b:x}\` ではない — 0x05 が \`"05"\` になる。

### Step 3: \`PayloadId\`

\`\`\`rust
/// Identifier returned by \`build_payload\`; used to retrieve the assembled block via \`payload_ready\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PayloadId(pub u64);
\`\`\`

同じ newtype。\`Display\` 不要（\`Debug\` で十分）、\`Ord\` 不要（build と ready の間で受け渡す不透明 token で順序付け不要）。素の \`u64\` を使うと \`build_payload(..., 任意のu64)\` と書けてしまう footgun を newtype が防ぐ。

### Step 4: \`PayloadAttrs\`

\`\`\`rust
/// Inputs to a payload-build job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayloadAttrs {
    pub timestamp: u64,
    pub fee_recipient: [u8; 20],
    pub prev_randao: [u8; 32],
}
\`\`\`

複数フィールドなので real struct。Reth が payload を assemble する最小入力（timestamp / fee 送り先 / beacon randomness）。Engine API 仕様の他フィールド（withdrawals 等）は v0 では省略（single-validator で withdrawal flow なし）。60 bytes なので \`Copy\` は付けない。

### Step 5: \`PayloadStatus\`（予測の答え）

\`\`\`rust
/// Verdict from \`validate_payload\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PayloadStatus {
    Valid,
    Invalid,
    Syncing,
}
\`\`\`

- **Valid** → block に投票
- **Invalid** → Nil 投票、proposer を faulty 扱い
- **Syncing** → 投票せず待つ／timeout に falling、sync 再試行

3 variant は互換でない。bool に潰すと \`Syncing\` の正しい挙動（棄権）が表現できない。

### Step 6: \`ExecutedBlock\`

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

consensus round が閉じる最小形。意図的に **無い** もの: transaction list / receipts / logs bloom（ステップ2 CLOB で定着）/ difficulty（post-merge default）。今最小にしておけば、ステップ2 を設計する前にステップ2 の design を encode してしまう事故を避けられる。

### Step 7: dev-dep + 4 unit test

\`crates/types/Cargo.toml\` 末尾に先に dev-dep を入れてから test を書く（rust-analyzer の赤波線回避）:

\`\`\`toml
[dev-dependencies]
serde_json = { workspace = true }
\`\`\`

\`crates/types/src/lib.rs\` 末尾に:

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

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 13113db
diff -u ~/code/my-openhl/crates/types/src/lib.rs ./crates/types/src/lib.rs
git checkout main
\`\`\`

空白・テスト名以外は実質同一になるはず。一致ポイント: type 定義（各フィールド・各 derive）、\`BlockHash::Display\` のロジック、\`PayloadStatus\` の variant 順序。

## 合格基準

\`\`\`bash
cargo test -p openhl-types
\`\`\`

→ **4 テスト pass**（hex display / status equality / executed-block clone / serde round-trip）。よくあるミス: derive 書き忘れ / \`Display\` impl 欠落 / \`serde_json\` を dev-dep に入れ忘れ / \`{b:x}\` と書いて hex 長が合わない。

## まとめ（3行）

- CL↔EL の共通語彙は中立な第三 crate \`openhl-types\` に置く（循環依存を避ける）。
- newtype（\`BlockHash([u8;32])\`）で「ただの byte 列」と block hash を型レベルで区別する。
- \`PayloadStatus\` は 3 状態 — bool に潰すと \`Syncing\` の「棄権」が消えて永続 fork を招く。`,
                },
                {
                  title: 'レッスン3 — ConsensusBridge trait',
                  slug: 'openhl-bridge-trait-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン3 — \`ConsensusBridge\` trait

## 問い

BFT consensus と EVM execution の間の契約を、いくつのメソッドで表すべきか？ なぜ **ちょうど 4 つ** で、3 でも 5 でもないのか？

## 原理（最小モデル）

- **メソッドは 4 つ: \`build_payload / payload_ready / validate_payload / commit\`。** 数は BFT round 構造（propose → vote → decide）で決まる。\`build_payload\` と \`payload_ready\` を 1 つにすると「投票中の先行ビルド」ができない。5 つ目（例 \`notify_view_change\`）を足すと consensus 内部事情を EL API に漏らし層分離が崩れる。
- **\`#[async_trait]\` + \`: Send + Sync\`。** \`async_trait\` は \`async fn\` を boxed future へ desugar し \`dyn\` 互換にする。\`Send + Sync\` super-trait bound で \`Arc<dyn ConsensusBridge>\` を actor 間で共有しても安全だと compiler が検証できる。
- **error は 3 variant: \`Rejected / Syncing / Internal\`。** consensus の 3 応答（反対 vote / 待つ / 停止）に対応。1 つの String error にすると consensus が文字列 parse して分岐する羽目になる。

## 具体例

\`build_payload\`（前 round 投票中に裏で開始）と \`payload_ready\`（自分が proposer の hot path で fetch）を分けることが、**最も重要な latency trick** だ。同期的に 1 メソッドでブロックを返すと、proposer は build を待ってから broadcast する。分けると build が裏で走り、hot path は「準備済みブロックを fetch」（microsecond）に縮む。sub-second block time はこれに依存する。

## 失敗例（誤解）

「メソッドは少ない方が良いから build と payload_ready を 1 つに」は誤り（先行ビルド不能）。「状態通知も足そうと \`notify_view_change\` を追加」も誤り（consensus 内部を EL に leak）。数は API デザインの好みでなく BFT round 構造が決める。

---

ここまでで「なぜ 4 メソッド・なぜ Send+Sync・なぜ 3 error」は着地した。ここから \`bridge.rs\` を組み立てる。コードは完全形。

> 🛑 **予測。** 4 メソッドのうち **3 つは CL → EL、1 つは EL → CL**。どれが EL → CL 方向か？ ヒント：その戻り値を consensus 側がどう待っているか。

## ステップで組み立てる

### Step 1: \`crates/consensus/Cargo.toml\` に依存を追加

\`\`\`toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }
\`\`\`

- **openhl-types** — trait signature がレッスン2 の 5 type を参照する。
- **async-trait** — trait 内 \`async fn\` を \`Pin<Box<dyn Future>>\` へ desugar（native async-fn-in-trait はまだ Send bound / dyn 互換に粗さがある）。
- **thiserror** — \`Display\`/\`Error\` を手書きせず error enum を derive。
- **eyre** — catch-all な \`Internal\` 用。任意 error をバックトレース付きでラップ。

### Step 2: \`crates/consensus/src/bridge.rs\`（新規ファイル全体）

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

### Step 3: signature の必然性（BFT round のタイムライン）

\`\`\`
──[ 前 round 投票中、proposer は自分のターンを準備 ]──────────────
   CL ──( build_payload(parent, attrs) )──► EL ─ 裏でブロック構築開始（投票と並走）

──[ 自分が proposer になった瞬間 — hot path ]──────────────────
   CL ──( payload_ready(id) )──► EL
   CL ◄─( ExecutedBlock を返す )── EL          ← 唯一 EL→CL にデータ逆流（予測の答え）
   CL ─► Proposal を broadcast

──[ 他 peer から Proposal 受信 ]───────────────────────────────
   CL ──( validate_payload(&ExecutedBlock) )──► EL
   CL ◄─( PayloadStatus: Valid/Invalid/Syncing )── EL
   CL ─► vote（賛成 / Nil / 棄権）

──[ 2/3+ Quorum → finalized ]──────────────────────────────────
   CL ──( commit(hash) )──► EL ─ 永続化、new head 確定
\`\`\`

各 signature の要点:
- \`build_payload(parent, attrs) -> PayloadId\` — 即 return、不透明 handle を返す。
- \`payload_ready(id) -> ExecutedBlock\` — in-flight build 完了まで block するので async。**唯一 EL → CL 方向にデータが逆流する seam**（予測の答え）。
- \`validate_payload(&ExecutedBlock) -> PayloadStatus\` — \`&\`（borrowed）。inspect するだけで consume しない（consensus は同じブロックを複数回 inspect する）。
- \`commit(BlockHash) -> Result<()>\` — 最小 signature、fire-and-forget。\`&ExecutedBlock\` を取らない（commit 時点で EL は既にブロックを見ており、hash だけで CL は stateless を保てる）。失敗は chain halt（レッスン9）。

### Step 4: \`BridgeError\` の 3 variant

- **Rejected(String)** — EL が「bad」と判定。consensus は nil 投票して次 round へ。String が human-readable な理由。
- **Syncing** — EL がまだ state を持たず答えられない（bad とは別）。後でリトライ、nil 投票にはしない。
- **Internal(eyre::Report)** — 予期せぬ破綻（disk full 等）。consensus は **halt**。\`#[from]\` で \`?\` が \`eyre::Report\` を自動ラップ。

\`PayloadStatus::Syncing\`（status）と \`BridgeError::Syncing\`（error）の二層: 前者は「call は完了し sync state を report した」、後者は「call そのものが完了できなかった」（\`build_payload\` / \`commit\` でよく出る）。

### Step 5: crate に組み込む

\`crates/consensus/src/lib.rs\`:

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
\`\`\`

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 13113db
diff -u ~/code/my-openhl/crates/consensus/src/bridge.rs ./crates/consensus/src/bridge.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
git checkout main
\`\`\`

doc-comment の言い回しは違って OK。4 method signature・3 error variant・\`#[async_trait]\`・\`: Send + Sync\` は完全一致が必要。

## 合格基準

\`\`\`bash
cargo check -p openhl-consensus
cargo check --workspace
\`\`\`

→ Finished（unused 警告は OK、hard error は不可）。impl はまだない（レッスン4 から）。trait と error type だけ。

## まとめ（3行）

- 契約はちょうど 4 メソッド — BFT round 構造（propose → vote → decide）が数を決める。
- \`build_payload\` と \`payload_ready\` の分離が sub-second block time を支える latency trick。
- error は 3 variant（Rejected / Syncing / Internal）= consensus の 3 応答（否決 / 待つ / 停止）。`,
                },
              ],
            },
          },
          {
            title: 'EL test double',
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: 'レッスン4 — InMemoryEvmBridge — trait の最初の impl',
                  slug: 'openhl-in-memory-bridge-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 70,
                  content: `# レッスン4 — \`InMemoryEvmBridge\` — trait の最初の impl

## 問い

レッスン3 で \`ConsensusBridge\` trait を型レベルで完成させた。では Reth（600 個の transitive dep）を立ち上げる前に、この契約を end-to-end で動かして consensus 側をテスト可能にするには、何があればいいか？

## 原理（最小モデル）

- **テストダブル先行。** Reth に触れず fake EVM を書く。trait を exercise するのに大依存を待たず、下流の consensus test（レッスン9/10）を 2.7s でなく **0.02s** で回せる。
- **\`Mutex<State>\` で内部可変性。** レッスン3 の \`Send + Sync\` bound を満たすため、private \`State\` を 1 つの \`Mutex\` に包む。method ごとに 1 回 lock。このパターンはレッスン11+ の \`LiveRethEvmBridge\` にも構造的に伝播する。
- **\`pending\` と \`chain\` の分離。** 投機的な build と確定した commit はライフサイクルが違う。\`build\` は pending に積み、\`commit\` だけが pending → chain に昇格させる唯一の権限を持つ。real Reth でも同じ split（pending blocks / canonical chain）。

## 具体例

ブロックのライフサイクル:

\`\`\`
build_payload(parent, attrs)
  → parent number を chain から引く / PayloadId 発行 / hash 合成
  → pending.insert(id, block)         ◄ 投機的に格納、CL には PayloadId だけ返す
payload_ready(id)
  → pending.get(&id).cloned()         ◄ 未確定ブロックを CL に貸し出す（pending に残す）
commit(hash)                          ※ 2/3+ Quorum 達成後
  → pending から検索 → chain.insert(hash, block) / head = Some(hash)  ◄ canonical へ昇格
\`\`\`

## 失敗例（誤解）

「\`BlockHash\` に real な cryptographic hash を使うべき」は誤り。real hashing は EVM を走らせ post-state root を計算する必要があり、それを避けるのが test double の目的。合成 hash は \`(id, number)\` で **uniqueness** だけ満たせばよい（cryptographic-commitment はレッスン11+ の実 Reth で）。

---

ここまでで「なぜ test double・Mutex・pending/chain 分離か」は着地した。ここから \`in_memory.rs\` を組み立てる。コードは完全形。

> 🛑 **予測。** 下を読む前に: test double の \`build_payload\` が **fake する** ものと **実際にできる** ものは何か？ ヒント: EVM は走らせられないが、PayloadId 割り当て・number インクリメント・hash 合成・pending 記憶はできる。

## ステップで組み立てる

### Step 1: \`crates/evm/Cargo.toml\`

\`\`\`toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }

[dev-dependencies]
tokio = { workspace = true }
\`\`\`

\`openhl-consensus\`（trait/error）、\`openhl-types\`（contract 型）、\`async-trait\`（impl の \`#[async_trait]\`）、dev に \`tokio\`（\`#[tokio::test]\`）。

### Step 2: \`crates/evm/src/in_memory.rs\` — doc + imports + struct

\`\`\`rust
//! In-memory \`ConsensusBridge\` — a test double for the EL side.
//!
//! Useful for unit-testing the consensus crate without spinning up Reth. The
//! real Reth-backed implementation lives in \`engine.rs\` (lands in レッスン 5).

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

\`State\` の 4 フィールド: \`next_payload_id\`（単調カウンタ）/ \`pending\`（build 済み・未 commit、PayloadId が key）/ \`chain\`（commit 済み、生の \`[u8;32]\` が key で \`.0\` を省ける）/ \`head\`（最新 commit hash）。

### Step 3: \`build_payload\`

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
\`\`\`

要点: \`.expect("state mutex poisoned")\` は前の holder が panic して poisoned な state を残したケースをカバー（poisoned な state machine から続けるのは unsafe なので自分も panic）。hash は \`(id, number)\` から合成 — test double では uniqueness だけ満たせばよい（予測の答え: fake = post-state root、できる = id/number/hash 記憶）。

### Step 4: \`payload_ready\` / \`validate_payload\` / \`commit\`

\`\`\`rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        s.pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))
    }

    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        Ok(PayloadStatus::Valid)
    }

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

\`payload_ready\` は唯一 read-only（\`mut\` 不要）、clone して貸し出す（commit 前に再問い合わせがあるかも）。\`validate_payload\` は test double なので常に \`Valid\`（real validation はレッスン12）。\`_block\` の leading underscore で unused 警告を抑制。\`commit\` は \`pending.values()\` を scan（pending は PayloadId が key なので hash 検索には scan が要る — test では O(n) で OK）。

### Step 5: \`hex_short\` ヘルパー（impl ブロックの外、ファイル末尾の非公開関数）

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

impl ブロックの外に置く（\`&self\` を取らない純粋な変換ユーティリティ。impl 内に書くと trait 側にもこの method が必要だと誤解させる）。\`write!\` には Step 2 の \`use std::fmt::Write as _;\` が要る（\`as _\` で method だけ import し名前で namespace を汚さない）。

### Step 6: crate に組み込む

\`crates/evm/src/lib.rs\`:

\`\`\`rust
//! EVM execution layer — Reth integration.

pub mod in_memory;

pub use in_memory::InMemoryEvmBridge;
\`\`\`

### Step 7: 5 unit test（ファイル末尾）

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

\`#[tokio::test]\` は \`#[test]\` の async 版（tokio runtime をセットアップして async 本体を await）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 3b43586
diff -u ~/code/my-openhl/crates/evm/src/in_memory.rs ./crates/evm/src/in_memory.rs
git checkout main
\`\`\`

テスト順・doc・debug message は違って OK。struct の形、\`Mutex<State>\` パターン、4 method のロジックはほぼ一致。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

→ **5 テスト pass**。よくあるミス: \`+ 1\` 忘れで number=0 / \`tokio\` を dev-dep に入れ忘れ / \`use std::fmt::Write as _\` が関数内にあって macro から見えない。

## まとめ（3行）

- Reth に触れず fake EVM（test double）で trait を exercise し、consensus test を 0.02s で回す。
- \`Mutex<State>\` で \`Send + Sync\` を満たす（レッスン11+ の実 bridge にも伝播）。
- \`pending\`（投機）と \`chain\`（確定）を分離 — commit だけが pending → chain に昇格させる。`,
                },
                {
                  title: 'レッスン5 — real alloy 型を使う RethEvmBridge',
                  slug: 'openhl-reth-bridge-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 70,
                  content: `# レッスン5 — real alloy 型を使う \`RethEvmBridge\`

## 問い

レッスン4 と同じ \`ConsensusBridge\` を、合成型ではなく **本物の alloy / Reth 型**（\`B256\`, \`Header\`）で満たすには？ そして合成 hash と real hash の違いは、どんな挙動を testable にするか？

## 原理（最小モデル）

- **内部は alloy-native、trait 型は contract の serialization。** State は \`(B256, Header)\` を保存し、trait は \`ExecutedBlock\` を返す。変換は trait 境界でだけ。alloy が進化しても変換ヘルパーを直すだけで contract は壊れない。
- **\`Header::hash_slow()\` で real RLP hashing。** header 全体を RLP encode + Keccak-256。"slow" は「cache なし、毎回再計算」の命名 convention。Ethereum node が計算するのと同じ hash になる。
- **\`(B256, Header)\` タプルで保持。** hash は *ちょうどこの header の hash*。別フィールドに分けると header 変更で cache hash が desync する。タプルが両者を不可分にする。
- **1 trait・2 impl。** \`InMemoryEvmBridge\` と \`RethEvmBridge\` は trait surface を共有し fidelity だけ違う。レッスン11+ で 3 つ目（\`LiveRethEvmBridge\`）に広がる。

## 具体例

型境界のレイアウト:

\`\`\`
[ 外側: CL 空間 ]  openhl-types: BlockHash / PayloadId / ExecutedBlock
        ▲ │   trait boundary でだけ変換（to_b256 / from_b256 / to_executed_block）
        │ ▼
[ 内側: EL 空間 ]  alloy: B256 / u64 / Header
   ※ State は (B256, Header) タプル — hash と Header を常に同期させる
\`\`\`

contract 型は 4 method の signature/戻り値にしか現れず、impl 内部は全て alloy 型。

## 失敗例（誤解）

「\`B256\` も \`BlockHash\` も \`[u8;32]\` を wrap している。\`transmute\` で変換できる」は誤り。byte layout は同一でも型は別物 — それが point。変換関数が境界の場所を document する。将来 \`BlockHash\` が checksum 等の metadata を持てば \`transmute\` はバグになるが、\`to_b256\` は更新すべき場所として残る。

---

ここまでで「内部 alloy / 境界変換・real hashing・タプル保持」は着地した。ここから \`engine.rs\` を組み立てる。コードは完全形。

> 🛑 **予測。** レッスン4 は hash を \`(id, number)\` から合成した。レッスン5 は \`header.hash_slow()\` を呼ぶ。**この違いで testable になる挙動は何か？** ヒント: header の 1 フィールド（timestamp）を変えると hash はどうなるか。

## ステップで組み立てる

### Step 1: \`crates/evm/Cargo.toml\` に alloy 依存を追加

\`\`\`toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }
alloy-primitives = { workspace = true }
alloy-consensus  = { workspace = true }
\`\`\`

\`alloy-primitives\` が \`B256\`（32-byte hash）/ \`Address\`（20-byte）、\`alloy-consensus\` が \`Header\`（Ethereum block header 全フィールド）。

### Step 2: \`crates/evm/src/engine.rs\` — doc + imports + struct

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

レッスン4 と同じ shape だが \`State\` 内の型が違う: \`pending\` が \`(B256, Header)\`、\`chain\`/\`head\` の key が \`B256\`。\`(B256, Header)\` で保持するのは \`hash_slow()\` が expensive だから — insert 時に 1 度 hash を計算して cache する。

### Step 3: \`build_payload\` — 初めての real hashing

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
\`\`\`

4 フィールドだけ set し \`..Default::default()\` で残り（state_root, gas_limit 等）を埋める。\`header.hash_slow()\` が本物の hash — header の 1 byte でも変われば hash が変わる（予測の答え: timestamp を変えると hash が変わる、合成 hash にはなかった性質）。

### Step 4: \`payload_ready\` / \`validate_payload\` / \`commit\`

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

\`find(|(h, _)| *h == hash)\` はタプルを destructure して 1 番目を比較。\`*h\` は \`B256\` が \`Copy\` なので memcpy が走るだけで所有権 move しない。

### Step 5: 変換ヘルパー 3 つ（impl ブロックの後）

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

3 つに分けるのは各々が 1 つのことだけをするから（\`to_b256\`/\`from_b256\` は pure な型橋渡し、\`to_executed_block\` がフィールド mapping を知る）。

### Step 6: crate に組み込む

\`crates/evm/src/lib.rs\`:

\`\`\`rust
//! EVM execution layer — Reth integration.

pub mod engine;
pub mod in_memory;

pub use engine::RethEvmBridge;
pub use in_memory::InMemoryEvmBridge;
\`\`\`

### Step 7: 4 unit test（ファイル末尾）

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

鍵は最初のテスト: 同じ \`parent\` でも \`timestamp\` を変えると \`hash\` が変わる — レッスン4 の合成 hash には書けなかったテスト（same parent + same number → same synthesized hash で timestamp を無視した）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout c938321
diff -u ~/code/my-openhl/crates/evm/src/engine.rs ./crates/evm/src/engine.rs
git checkout main
\`\`\`

doc/error message の variation は OK。struct 型・helper signature・4 method のロジックはほぼ一致。reference の \`c938321\` の Cargo.toml には後のレッスン用に \`reth-ethereum-primitives\` も列挙されている（engine.rs では未使用、省略して OK）。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm
\`\`\`

→ **9 テスト pass**（レッスン4 の 5 + レッスン5 の 4）。両 impl が同じ trait を満たし、レッスン8/9 の同じ consumer コードがどちらにも動く。よくあるミス: \`hash_slow()\` の戻りを \`BlockHash\` に直代入（\`B256\` なので \`from_b256\`）/ \`..Default::default()\` 忘れ / \`fee_recipient\`（\`[u8;20]\`）に \`B256::from\`（正しくは \`Address::from\`）。

## まとめ（3行）

- 内部は alloy-native（\`B256\`/\`Header\`）、trait 型は境界での serialization — alloy 進化に強い。
- \`header.hash_slow()\` で real RLP hashing（header 1 フィールド変更で hash が変わるのを test で証明）。
- 1 trait・2 impl の多相性が、レッスン11+ の 3 つ目 \`LiveRethEvmBridge\` へそのまま広がる。`,
                },
              ],
            },
          },
          {
            title: 'CL types',
            sortOrder: 4,
            lessons: {
              create: [
                {
                  title: 'レッスン6 — OpenHlContext と Malachite の 10 sub-type',
                  slug: 'openhl-malachite-context-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 50,
                  xpReward: 90,
                  content: `# レッスン6 — \`OpenHlContext\` と Malachite の 10 sub-type

## 問い

レッスン3 の \`ConsensusBridge\` は *自分が所有* する trait だった。Malachite の \`Context\` は逆で、*Malachite が所有* する trait に自分の型をはめる。10 個の型をどう束ね、全 validator が同じ proposer を選ぶことをどう保証するか？

## 原理（最小モデル）

- **両側の trait contract。** 自分が定義した契約に impl を書く（レッスン3）のと、外部ライブラリの契約に自分の型をはめる（本レッスン）のは、設計の力学が逆向き。
- **Context associated-type パターン。** state を持たない空 struct \`OpenHlContext;\` が 10 個の sub-type（\`Address\`/\`Height\`/\`Value\`/\`Validator\`/…）に名前を付ける。この type-family idiom が Malachite を chain-generic にしている。
- **型システムが不変条件を強制。** \`OpenHlValidatorSet::new()\` が構築時に sort する → 「未 sort な set」が表現不能になる。下流 method はすべて sort 済みを前提にしてよい。
- **決定的 proposer 選択。** sort 済み set に \`(height + round) % count\`。全 validator が同一に検証できる最も単純な決定的アルゴリズム。

## 具体例

3 validator（A:300 / B:200 / C:100 stake）。sort 済みセット（power 降順）に \`(height+round)%count\`:

\`\`\`
Index 0→A(300)  Index 1→B(200)  Index 2→C(100)
H1 R0 → (1+0)%3 = 1 → B
H1 R1 → (1+1)%3 = 2 → C   (round で rotation)
H1 R2 → (1+2)%3 = 0 → A
H2 R0 → (2+0)%3 = 2 → C   (height で rotation)
\`\`\`

## 失敗例（誤解）

「validator ごとに好きな順で sort してよい」は誤り。A が \`[A,B,C]\`、B が \`[B,A,C]\` で sort すると、同じ \`(H1,R0)\` で A は「Index1=B」、B は「Index1=A」を proposer と認識 → **最初の round で chain が fork**。**sort 順 = proposer-election protocol の本体**。また「\`Value\` を直接 \`BlockHash\` に」も誤り（\`Value\` trait は独自 bound + \`Id\` associated type を要求するのでラップする）。

---

ここまでで「Context は外部所有の trait・sort 順が proposer protocol」は着地した。ここから 8 ファイル（types/ 7 + context.rs）を組み立てる。コードは完全形。

> 🛑 **予測。** なぜ \`OpenHlValidatorSet\` の sort 順 と \`select_proposer\` のアルゴリズムは、全 validator で一致しなければならないか？ ヒント: 同じ \`(height, round)\` で validator が違う proposer を選んだら chain はどうなる？

## ステップで組み立てる

最終的なファイル構造:

\`\`\`
crates/consensus/src/
├── lib.rs        (Step 7)
├── bridge.rs     (レッスン3、変更なし)
├── context.rs    (Step 6: OpenHlContext + 4 factory + テスト) ★中央
└── types/        (Step 2)
    ├── mod.rs / address.rs / height.rs / value.rs       (Step 2-3)
    ├── validator.rs                                     (Step 4) ★最重要
    └── proposal.rs / proposal_part.rs / vote.rs         (Step 5)
\`\`\`

### Step 1: \`crates/consensus/Cargo.toml\`

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

\`-core-types\` が \`Context\` trait + 10 sub-trait を定義。\`-signing-ed25519\` の \`rand\` feature で \`PrivateKey::generate(OsRng)\` がテストで使える。

### Step 2: \`types/mod.rs\`（module index）

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

型 1 つにつき 1 ファイルにするのは、各型の設計判断が distinct で、walk・review を局所化できるから。

### Step 3: シンプル 3 型 — \`address.rs\` / \`height.rs\` / \`value.rs\`

\`\`\`rust
// address.rs
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

\`Address\` trait はメソッドを持たず、derive 一式（\`Clone+Copy+Debug+Display+PartialEq+Eq+PartialOrd+Ord+Hash\`）を *要求する* だけ。

\`\`\`rust
// height.rs
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

\`INITIAL = 1\`（genesis は block 0 だが consensus が produce するものではない）。\`increment_by\` は \`saturating_add\`（overflow panic 回避）、\`decrement_by\` は \`checked_sub\` で 0 未満を \`None\`。

\`\`\`rust
// value.rs
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

\`Value::Id\` は vote に乗るもの — consensus は full value でなく *identifier*（hash）に投票する。

### Step 4: \`validator.rs\` — canonical sort（最重要）

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

sort comparator が **canonical CometBFT 順**（power 降順 → tiebreak address 昇順）。\`then_with\` で total ordering になるので入力順に依存せず一意な並びに収束する。全 validator が同じ sort を適用しないと \`select_proposer\` が割れて fork する（予測の答え）。power 降順なのは高 stake ほど低 index に来て modulo で多く選ばれるべきだから。

### Step 5: メッセージ型 — \`proposal.rs\` / \`proposal_part.rs\` / \`vote.rs\`

\`\`\`rust
// proposal.rs
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

\`pol_round\`（Proof of Lock Round）は Tendermint の概念 — lock した round。初回 proposal では \`Round::Nil\`。

\`\`\`rust
// proposal_part.rs
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

unit struct。\`OpenHlValue\` がただの \`BlockHash\`（32 byte）なので streaming 不要 → \`ValuePayload::ProposalOnly\` で value 全体が \`Proposal\` に乗る。だが \`Context\` は \`ProposalPart\` 型を要求するので実体化しない unit で満たす。

\`\`\`rust
// vote.rs
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

\`OpenHlVote\` が prevote/precommit 両方を表し \`vote_type\` で区別。extension 3 メソッドは \`None\`/no-op（v0 では vote extension 未使用、Context で \`Extension = ()\`）。\`NilOrVal\`（\`Option\` でない）は BFT 固有で \`Nil\` =「この round の任意の value に反対」。

### Step 6: \`context.rs\` — 結束

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

\`OpenHlContext\` は unit struct（state なし、型を関連付けるマーカー）。\`Extension = ()\`（vote extension なし）、\`SigningScheme = Ed25519\`（Malachite 同梱）。\`select_proposer = (height+round)%count\` が決定的 — sort 済み set + 同じ \`(height,round)\` → 全 validator が同じ proposer。\`wrapping_add\` で overflow 回避、\`% count\` で \`index < count\` を保証。

### Step 7: \`lib.rs\`

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

### Step 8: 5 unit test（\`context.rs\` 末尾）

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

\`h.increment()\` は \`Height\` trait の default method（内部で \`increment_by(1)\`）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 784785b
diff -ur ~/code/my-openhl/crates/consensus/src/types ./crates/consensus/src/types
diff -u ~/code/my-openhl/crates/consensus/src/context.rs ./crates/consensus/src/context.rs
git checkout main
\`\`\`

doc/テスト順は違って OK。各型の shape、\`OpenHlValidatorSet::new\` の sort comparator、\`select_proposer\` の body はほぼ一致。

## 合格基準

\`\`\`bash
cargo test -p openhl-consensus context::tests
\`\`\`

→ **5 テスト pass**（validator-set sort / 決定的 proposer / proposal round-trip / prevote≠precommit / height 算術）。よくあるミス: sort が \`a.cmp(&b)\`（昇順）で順が逆 / \`increment_by\` でなく \`increment\` を impl / 型ファイルが \`context.rs\` 不在で参照エラー。

## まとめ（3行）

- \`Context\` は Malachite 所有の trait — 空 struct \`OpenHlContext\` が 10 sub-type に名前を付ける type-family。
- \`OpenHlValidatorSet::new()\` が構築時 sort で「未 sort」を表現不能にする — canonical 順（power 降順→address 昇順）。
- \`select_proposer = (height+round)%count\` が決定的 — sort 順 *が* proposer-election protocol で、ズレると即 fork。`,
                },
                {
                  title: 'レッスン7 — OpenHlSigningProvider と canonical encoding',
                  slug: 'openhl-signing-provider-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン7 — \`OpenHlSigningProvider\` と canonical encoding

## 問い

vote / proposal に署名するとき、*何のバイト列* に署名するのか？ そして、なぜ \`serde::Serialize\` から derive したバイト列に署名してはいけないのか？

## 原理（最小モデル）

- **canonical encoding は consensus-critical。** 署名対象のバイトレイアウトは *chain の spec の一部*。serde 由来だと、serde バージョンが違う validator が同じ vote から違うバイト列を作って別物に署名 → fork。自分で 1 バイト単位を制御する。
- **stateful provider が純粋関数を wrap。** \`sign_vote(vote, &sk)\` は free function（テストが直接呼ぶ）、\`OpenHlSigningProvider\` は鍵を保持して \`sp.sign_vote(vote)\` を Malachite に提供する。1 ロジックを 2 通りの呼び方で使う（\`ConsensusBridge\` trait / impl 分離と同じ）。
- **Ed25519 が鍵を型分離。** \`PrivateKey::sign\` は存在し \`PublicKey::sign\` は存在しない — 公開鍵で署名する事故を compiler が拒否。
- **未使用機能には空バイト署名。** trait surface が要求するが chain が使わない機能（proposal part / vote extension）は、確定的な空データに署名して contract を honor しつつ偽データを作らない。

## 具体例

vote の signing-bytes（\`value_id=Val\` ケース、全 70 バイト）:

\`\`\`
┌── Height 8B ──┬── Round 8B ──┬Typ┬Tag┬── Value ID 32B ──┬── Address 20B ──┐
0              8              16  17  18                 50                70
  u64 LE         i64 LE        │   │   BlockHash 本体       20-byte Eth addr
                               │   └ 0=Nil / 1=Val
                               └── 0=Prevote / 1=Precommit
\`\`\`

どの validator がどの host で走らせても、この 70 バイトは完全に同一に生成される — それが Ed25519 が署名するメッセージ。

## 失敗例（誤解）

「\`bincode::serialize(v)\` の結果に署名すればいい」は誤り。既製シリアライズはライブラリ更新でバイトが変わりうる — 同じ struct でも今日と明日で違う。canonical encoding は自分で制御し、chain の wire format spec の一部にする。

---

ここまでで「何に署名するか・なぜ canonical か」は着地した。ここから \`signing.rs\` と \`signing_provider.rs\` を組み立てる。コードは完全形。

> 🛑 **予測。** \`OpenHlVote\` の canonical encoding はどのフィールドを含むべきか？ ヒント: 含め忘れたフィールドがあると、意味の違う 2 つの vote が同じ signing-bytes になり、片方の署名がもう片方に通って replay/swap 攻撃が成立する。

## ステップで組み立てる

### Step 1-3: \`signing.rs\` — canonical encoding

\`\`\`rust
//! Canonical encoding + signing for proposals and votes.
//!
//! v0 uses a simple length-prefixed concatenation rather than Protobuf/SSZ.
//! Real production validators will want a stable serialization format
//! (ステップ 2's \`openhl-codec\` crate is the natural home for that).

use informalsystems_malachitebft_core_types::{NilOrVal, Round, SignedMessage, VoteType};
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, Signature};

use crate::types::{OpenHlProposal, OpenHlVote};

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

要点: little-endian は x86/ARM 慣習。\`NilOrVal\` に tag バイト（0=Nil 1B / 1=Val 33B）を付けてパーサが判別可能に。address を含めるのは「誰の vote か」も署名対象だから。proposal の value は \`NilOrVal\` でなく無条件 \`BlockHash\`（proposal は必ず value を運ぶ）。\`p.value.0.0\` は 2 段 newtype（\`OpenHlValue(BlockHash([u8;32]))\`）の unwrap。

### Step 4-5: sign / verify + VerifierLike shim

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

sign は所有権を取り canonical bytes に Ed25519 署名 → \`SignedMessage\` で wrap。\`VerifierLike\` は外部 crate（\`signature::Verifier\`）依存を公開 API から隠す shim — 上流差し替え時の breaking change を \`signing.rs\` 1 箇所に閉じ込める。

### Step 6: \`signing.rs\` の 2 テスト

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

2 つ目が load-bearing — canonical encoding が意味あるフィールドすべてに敏感であることを証明（含め忘れがあれば tampered でも検証が通ってしまい、このテストが落ちる）。

### Step 7-8: \`signing_provider.rs\` — struct + 8-method impl

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

8 method = 4 sign/verify ペア。\`signing.rs\` の低レベル関数を \`as sign_vote_with\` でリネーム import するのは trait メソッド名（\`sign_vote\`）との衝突回避。proposal_part / vote_extension は空バイト署名（unit 型でコミットすべきデータがない、だが valid な署名は出るので trait surface を満たしエンジンが crash しない）。

### Step 9: \`signing_provider.rs\` の 7 テスト

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

最後の \`signature_from_one_provider_does_not_verify_under_another\` が load-bearing なセキュリティ保証 — 署名は特定の鍵に紐付き、別の鍵の署名は交換不可能。

### Step 10: \`lib.rs\`

\`\`\`rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
\`\`\`

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 9e810a7
diff -u ~/code/my-openhl/crates/consensus/src/signing.rs ./crates/consensus/src/signing.rs
diff -u ~/code/my-openhl/crates/consensus/src/signing_provider.rs ./crates/consensus/src/signing_provider.rs
git checkout main
\`\`\`

doc の文言は違って OK。canonical encoding のバイト順、SigningProvider impl の委譲先、テストパターンは厳密一致が必要。\`9e810a7\` には後のレッスンの変更も含まれるので signing 関連ファイルだけ diff する。

## 合格基準

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

→ **14 テスト pass**（レッスン6 の 5 + signing 2 + signing_provider 7）。よくあるミス: \`lib.rs\` に \`pub mod signing;\` 追加忘れ / 8 method すべて未実装 / canonical encoding が \`value_id\` 等を含めず tamper テストが逆に落ちる。

## まとめ（3行）

- canonical encoding は自分で 1 バイト単位を制御し chain の spec の一部にする（serde derive はバージョン差で fork する）。
- \`OpenHlSigningProvider\` は鍵を状態に持ち、純粋関数 \`sign_vote\` に委譲 — テストは関数を直接、エンジンは trait メソッドを使う。
- 未使用機能（proposal part / vote extension）は空バイト署名で trait surface を満たす。`,
                },
                {
                  title: 'レッスン8 — OpenHlCodec — エンジンが要求する codec スロット',
                  slug: 'openhl-codec-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン8 — \`OpenHlCodec\` — エンジンが要求する codec スロット

## 問い

single-validator devnet では vote を送る相手（peer）がいない。なのに、なぜ Malachite エンジンはネットワーク・メッセージの encode/decode 方法を **型で要求** するのか？ そして 8 つの codec スロットのうち、本当に実装が要るのは何個か？

## 原理（最小モデル）

- **stub による trait 充足（型レベル incremental dev）。** Malachite が呼ばないパスに 50 行の protobuf encoder を書くより、未実装を名乗る 4 行の stub が正しい。万一呼ばれたら大声でエラーを返す。
- **blanket impl。** \`WalCodec / ConsensusCodec / SyncCodec\` は適切な構成 \`Codec<T>\` を実装すれば自動で付く。\`impl WalCodec\` は書かない — Malachite の blanket impl が無料でくれる。
- **codec は \`consensus/\` に住む（\`types/\` ではない）。** \`informalsystems-malachitebft-app\`（libp2p / ractor）に依存するから。\`types/\` に置くと \`BlockHash\` だけ欲しい下流 crate まで libp2p を引きずる。
- **wire format ≠ canonical signing format。** レッスン7 の canonical encoding は *署名される対象*、本レッスンの codec は *ネットワークに流れるもの*。wire には framing/versioning/length-prefix が乗り、署名は及ばない。

## 具体例

8 つの \`Codec<T>\` impl のうち、実際に発火するのは 1 つだけ:

\`\`\`
ProposalPart            → real（unit struct → 空 bytes、退化的だが完全な実装）
SignedConsensusMsg      ┐
LivenessMsg             │ gossip — peer がいない single-validator では発火しない
StreamMessage           ┘
ProposedValue           → WAL（crash recovery）— in-process test では発火しない
sync::{Status,Request,Response} → peer catch-up — peer がいないので発火しない
\`\`\`

## 失敗例（誤解）

「\`#[derive(Serialize,Deserialize)]\` + bincode で全部済ませる」は誤り（多くの型が generic / \`Box<dyn Trait>\` を含み serde で簡単に扱えない。reference は ~400 行の手書き protobuf）。「codec を \`types/\` に置く」も誤り — \`types/\` が \`malachitebft-app\`(libp2p) に依存し、EVM 側を 1 行直すだけで libp2p までビルドが走る。

---

ここまでで「stub・blanket impl・配置」は着地した。ここから \`codec.rs\` を組み立てる。コードは完全形。

> 🛑 **予測。** なぜエンジンは、送る相手がいない single-validator でも codec の実装を強制するのか？ ヒント: trait bound は **型** に関するもので **runtime 挙動** ではない。エンジンは codec に対して generic で、peer の有無を知らないから codec スロットを要求する。だが impl が完全でなくてよいのは、テストで gossip パスが実行されないから。

## ステップで組み立てる

### Step 1: \`crates/consensus/Cargo.toml\`

\`\`\`toml
informalsystems-malachitebft-app             = { workspace = true }
\`\`\`

\`app\` はメタ crate で \`Codec\`/\`ConsensusCodec\`/\`SyncCodec\`/\`WalCodec\`/\`SignedConsensusMsg\`/\`StreamMessage\`/\`ProposedValue\`/\`sync::{Status,Request,Response}\` を re-export。**初回ビルドは非常に重い**（libp2p + ractor、近代マルチコアで ~38 秒以上）。dev に \`static_assertions\` は不要（下のテストは関数 bound で代用）。

### Step 2: \`crates/consensus/src/codec.rs\` — doc + struct + error

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

\`CodecStub\` が \`&'static str\` を持つ struct（enum でない）なのは、新 stub 追加時に enum 定義を編集せず型名リテラルを渡すだけで済むから。

### Step 3: 唯一の real impl — \`ProposalPart\`

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

unit struct なので encode は空 \`Bytes\`、decode は入力を無視して唯一の値を返す（ゴミバイトでも失敗しようがない）。stub ではなく完全に正しい実装で、たまたま自明なだけ。

### Step 4: 7 つの stub impl

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

3 カテゴリ: gossip（\`SignedConsensusMsg\`/\`LivenessMsg\`/\`StreamMessage\`、peer 間 libp2p）/ WAL（\`ProposedValue\`、crash recovery）/ sync（\`Status\`/\`Request\`/\`Response\`、peer catch-up）。single-validator では peer も crash recovery もないので全て未発火。

### Step 5: 2 テスト（\`codec.rs\` 末尾）

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

\`openhl_codec_satisfies_all_three_super_traits\` は **コンパイル時** アサーション — bound チェックを関数呼び出しに変換。1 つでも \`Codec<T>\` impl が欠けると test 失敗でなく **コンパイルエラー**。本体は no-op で検証は型チェック時に起こる。\`proposal_part_round_trips\` が唯一の real impl を exercise。

### Step 6: \`lib.rs\`

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

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 4229502
diff -u ~/code/my-openhl/crates/consensus/src/codec.rs ./crates/consensus/src/codec.rs
git checkout main
\`\`\`

\`4229502\` には Cargo.lock 変更（libp2p ツリー）と 166 行の codec.rs。stub を繰り返す実装パターンは厳密一致するべき。

## 合格基準

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

→ **16 テスト pass**（レッスン7 の 14 + codec 2）。初回 ~30-40 秒。よくあるミス: 8 impl のどれか欠落 → \`OpenHlCodec: WalCodec\` 未充足 / \`CodecStub\` を引数なしや波括弧で書く / Cargo.toml に app 依存追加忘れ。

## まとめ（3行）

- エンジンは codec を **型** で要求する（runtime 挙動でなく trait bound）— peer の有無を知らないから。
- 構成 \`Codec<T>\` を実装すれば \`WalCodec/ConsensusCodec/SyncCodec\` が blanket impl で自動充足。発火しないパスは stub。
- codec は libp2p 依存ゆえ \`consensus/\` に置く — \`types/\` を軽量に保ち下流に重依存を漏らさない。`,
                },
                {
                  title: 'レッスン9 — OpenHlNode と初の start_engine 呼び出し',
                  slug: 'openhl-node-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 55,
                  xpReward: 100,
                  content: `# レッスン9 — \`OpenHlNode\` と初の \`start_engine\` 呼び出し

## 問い

Malachite エンジンを実際に起動するには何を渡せばいいか？ そして「**構築**（config を保持するだけ）」と「**実行**（actor system が走る）」を、なぜ別の型に住み分けさせるのか？

## 原理（最小モデル）

- **\`Node\` は handshake interface（runtime ではない）。** \`OpenHlNode\` は長命な設定（key / validator set / home dir / moniker）を保持し engine を *構築* する。走っている actor system は \`start()\` が返す \`OpenHlNodeHandle\` の中。構築と実行は別ライフサイクル → 別の型。
- **\`Mutex<Option<Channels>>\` の take-once。** channel handle はちょうど 1 回だけ取り出せる。レッスン10 の app loop が消費し、2 回目は \`None\` — 所有権が移った clean なシグナル。
- **address 導出を 1 箇所に集約。** \`SHA-256(pubkey)[12..32]\` を \`get_address\` にだけ書き、テストで runner helper との一致を assert。集約 + 検証テストで silent な drift を防ぐ。
- **\`todo!()\` でなく型安全 placeholder。** \`run()\` は panic でなく \`Err("...(レッスン10)")\` を返す。呼んだコードは graceful に失敗し次レッスンへの pointer 付きで止まる。

## 具体例

ライフサイクルの分離:

\`\`\`
OpenHlNode { private_key, validator_set, home_dir, moniker }   ← 静的 config、長命、engine 未起動
      │  .start().await   (Node trait の handshake)
      ▼
OpenHlNodeHandle {
    engine:   EngineHandle                          ← ractor cell + libp2p 起動中
    channels: Mutex<Option<Channels<OpenHlContext>>> ← レッスン10 が take() で 1 回引き抜く
}                                                    ← .kill().await まで生存
\`\`\`

## 失敗例（誤解）

「\`#[derive(Debug)]\` でいい」は誤り — private key の 32 バイトがログ/Sentry に漏れる。手書き \`Debug\` で \`[redacted]\` する。「smoke test は \`#[tokio::test]\` でいい」も誤り — default の \`current_thread\` だと engine 内部の \`block_on\` が唯一のワーカーを占有して永久ハング。\`multi_thread\` を強制する。

---

ここまでで「Node は handshake・構築と実行を分離」は着地した。ここから \`node.rs\`（~310 行）を組み立てる。コードは完全形。

> 🛑 **予測。** なぜ Malachite は \`OpenHlNode\` 自身に config フィールドを持たせず、別途 \`OpenHlConfig\` を要求するのか？ ヒント: config の所有者といつ変わりうるか。node はプロセス起動時に 1 回作るが、config はシグナルでディスクから再ロードされうる。

## ステップで組み立てる

### Step 1: \`crates/consensus/Cargo.toml\`（依存追加）

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

新規: \`app-channel\`（\`start_engine\` + \`Channels<Ctx>\`）/ \`config\`（\`ConsensusConfig\` 等）/ signing-ed25519 に \`serde\`（\`OpenHlPrivateKeyFile\` の derive）/ \`serde\`・\`tokio\` を runtime dep へ（handle が \`tokio::sync::Mutex\` を持つ）/ \`tempfile\`(dev、smoke test の home dir)。

### Step 2: \`node.rs\` — imports + \`OpenHlConfig\`

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

\`#[serde(flatten)]\` で consensus フィールドを親に inline。\`new()\` が \`value_payload: ProposalOnly\` を強制 — \`Context::ProposalPart = OpenHlProposalPart\`(unit) と必ず合致させる（後でデバッグするより構築時に強制）。

### Step 3: \`OpenHlGenesis\` + \`OpenHlPrivateKeyFile\`

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

\`PrivateKey\`(malachite 由来)は default で serde を impl しないので wrapper が担う。手書き \`Debug\` がバイトを redact — \`#[derive(Debug)]\` だと 32 バイトが print されて key リーク（予測の失敗例）。

### Step 4: \`OpenHlNodeHandle\` — \`start()\` の戻り値

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

\`tokio::sync::Mutex\`（\`std\` でない）を使うのは \`take_channels\` が async で lock が \`.await\` 境界をまたぐから（\`std::sync::Mutex\` だと executor スレッドをブロック）。\`subscribe\` は placeholder（producer 未 attach の空ストリーム、レッスン10 で本物）、\`kill\` は本物で smoke test が exercise する。

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

6 関連型がハンドシェイクの各スロットの具象型を宣言。\`start()\` がハイライト — \`start_engine\` を context / node(\`self.clone()\`) / config / codec ×2（WAL 用と Network 用、別々に渡すので一方だけ差し替え可能）/ 初期 height / validator set の 7 引数で呼び、戻り値 \`(Channels, EngineHandle)\` を handle に wrap。\`run()\` は app loop（レッスン10）未実装なので型安全エラーを返す。\`get_address\` は \`SHA-256(pubkey)[12..32]\`。

### Step 6: \`lib.rs\`

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

### Step 7: 4 unit test（\`node.rs\` 末尾）

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

capstone は \`start_engine_smoke_spawns_and_kills\` — \`#[tokio::test(flavor = "multi_thread", worker_threads = 2)]\`（engine が複数 actor を spawn、current_thread だと deadlock）。node 構築 → \`start()\` → channels を 1 回 \`Some\`/2 回目 \`None\` で poke → \`kill()\`。~0.02 秒。**pass すれば自分のコードが動く BFT エンジンになっている。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout d59d6cf
diff -u ~/code/my-openhl/crates/consensus/src/node.rs ./crates/consensus/src/node.rs
git checkout main
\`\`\`

\`d59d6cf\` に 310 行の node.rs。12 method・struct レイアウト・smoke test は厳密一致するはず。doc は個人差可。

## 合格基準

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

→ **20 テスト pass**（レッスン8 の 16 + node 4）。smoke test が最後に走る。よくあるミス: \`app-channel\` 依存忘れ / signing-ed25519 の \`serde\` feature 忘れ（\`PrivateKey: Deserialize\` 不充足）/ smoke test が \`current_thread\` で永久ハング / \`get_address\` が helper と不一致。

## まとめ（3行）

- \`OpenHlNode\`(静的 config) と \`OpenHlNodeHandle\`(実行中 actor system) を分離 — 構築と実行は別ライフサイクル。
- \`start()\` が \`start_engine\` を 7 引数（context/node/config/codec×2/初期 height/validator set）で呼び engine を spawn。
- smoke test（multi_thread 必須）が spawn→channel take-once→kill を end-to-end で証明 — ここで動く BFT エンジンが立つ。`,
                },
              ],
            },
          },
          {
            title: 'Engine integration',
            sortOrder: 5,
            lessons: {
              create: [
                {
                  title: 'レッスン10 — run_engine_app と actor pipeline 経由の最初のブロック',
                  slug: 'openhl-engine-app-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 55,
                  xpReward: 100,
                  content: `# レッスン10 — \`run_engine_app\` と actor pipeline 経由の最初のブロック

## 問い

L9 でエンジンは起動するようになった。だが **silent** だ — \`start_engine\` が返ると actor は \`AppMsg::ConsensusReady\` を送って reply を待ち、誰も応えないので parked になる。どうやって engine と EL を繋ぎ、実際に block を 1 つ生成させるか？

## 原理（最小モデル）

- **\`AppMsg\` のルーティングループ。** engine が 1 本の channel に \`ConsensusReady / GetValue / Decided / …\` を流す。app loop は \`while let Some(msg) = recv().await\` で各 variant に match し、\`reply\` に応えるか bridge を駆動する。これが Malachite ↔ EL の唯一の接着剤。
- **bridge に generic な多相性。** \`run_engine_app<B: ConsensusBridge>\` は \`StubBridge\` / \`InMemoryEvmBridge\` / \`RethEvmBridge\` / \`LiveRethEvmBridge\` 全てで動く。ルーティング 1 つに backend 4 つ — L3 の trait surface がここで効く。
- **\`stop_after_decisions\` は test ergonomics。** production は \`usize::MAX\`、テストは \`1\`。「テスト可能であるためだけ」の引数も正当な API 設計。
- **closed reply channel はログして伝播しない。** reply 前に engine が死ぬと \`oneshot::Sender::send()\` が err。伝播すると本物のエラーがノイズに埋もれる → \`tracing::warn!\` でログ。

## 具体例

中継ループの 1 サイクル:

\`\`\`
[Malachite engine actors] ──AppMsg(+oneshot reply)──► [run_engine_app loop] ──► [ConsensusBridge]

① ConsensusReady → app: reply.send((height, validator_set))
② GetValue       → app: bridge.build_payload + payload_ready → reply.send(LocallyProposedValue)
③ Decided        → app: bridge.commit(hash) → reply.send(Next::Start) / decided.push(hash)
                        if decided.len() >= stop_after_decisions { return Ok(decided) }
\`\`\`

app は engine と bridge の **中継地点**（ロジック本体でない）。重い計算は bridge、合意駆動は engine。

## 失敗例（誤解）

「\`Decided\` の早期 return で reply は省略していい」は誤り — engine actor が drop された sender を await し続けて parked になり tear-down が遅れる。**return 前に必ず reply**。また「各 arm を個別 unit test する」も誤り — arm は決まった順序で届くので、fake engine を作るより real engine を 1 block 回す方が安い（integration > unit）。

---

ここまでで「AppMsg ルーティング・generic bridge・reply 必須」は着地した。ここから \`engine_app.rs\`（~282 行）を組み立てる。コードは完全形。

> 🛑 **予測。** engine が \`GetValue\` を送ったとき、app はなぜ \`BlockHash\` でなく \`LocallyProposedValue(height, round, value)\` で reply するのか？ ヒント: engine は propose した value を peer に gossip / certificate に含める必要がある。hash だけでは BFT machine 内で value が first-class にならない（solo で走っていることを engine は知らない）。

## ステップで組み立てる

### Step 1: \`crates/consensus/Cargo.toml\` に \`tracing\`

\`\`\`toml
tracing                                       = { workspace = true }
\`\`\`

closed reply channel のケースで \`tracing::warn!\` を 1 箇所だけ使う（これはバグでなく上流が諦めたサイン — ログするが伝播しない）。

### Step 2: \`engine_app.rs\` — imports + signature

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
        }
    }

    Err(eyre!(
        "consensus channel closed after {n} decisions (wanted {stop_after_decisions})",
        n = decided.len()
    ))
}

fn default_attrs() -> PayloadAttrs {
    PayloadAttrs {
        timestamp: 0,
        fee_recipient: [0u8; 20],
        prev_randao: [0u8; 32],
    }
}
\`\`\`

12 arm = substantive 5 + trivial 7。要点:
- **GetValue**（load-bearing）: \`build_payload(current_parent, attrs)\` → \`payload_ready(id)\` → \`OpenHlValue\` → \`LocallyProposedValue::new(height,round,value)\` で reply（予測の答え: engine が gossip/certificate に使う）。
- **Decided**（load-bearing）: \`certificate.value_id\` を \`commit\` → \`decided.push\` → \`current_parent\` 更新（次の GetValue がこの hash の上に build）→ exit 条件チェック（**return 前に reply**）→ なければ \`Next::Start(next_height)\`。
- trivial 7: vote extension（\`None\`/\`Ok(())\`、v0 未使用）、\`RestreamProposal\`(no-op)、history/sync（peer catch-up）、\`ReceivedProposalPart\`（ProposalOnly なので来ない、\`None\`）。
- \`default_attrs\` は全ゼロ（レッスン12 で real になる）。

### Step 3: \`lib.rs\`

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

### Step 4: \`StubBridge\` + integration test（\`engine_app.rs\` 末尾）

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

\`StubBridge\` は全てに \`BlockHash([0x42;32])\` を返す in-memory fixture。integration test は spawn → take_channels → \`run_engine_app(..., stop_after_decisions=1)\` を \`tokio::spawn\` → \`timeout(15s)\` で bound → 3 段 unwrap（timeout/panic/loop-error）→ 3 assert（decisions=1 / commit が decided hash / built が decided hash）→ kill。\`worker_threads = 4\` は engine 内部 actor + app loop + bridge async を同時に物理コアに散らし、スレッド枯渇型 deadlock を構造的に防ぐため。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 708472c
diff -u ~/code/my-openhl/crates/consensus/src/engine_app.rs ./crates/consensus/src/engine_app.rs
git checkout main
\`\`\`

\`708472c\` に 282 行の engine_app.rs。12 arm・StubBridge・integration test は厳密一致するべき。

## 合格基準

\`\`\`bash
cargo test -p openhl-consensus
\`\`\`

→ **21 テスト pass**（レッスン9 の 20 + \`first_block_via_engine_actors\`）。test 本体 ~0.02 秒。よくあるミス（多くは 15 秒 hang = timeout 発火）: \`reply.send\` 忘れ / **Decided の早期 return で reply 忘れ** / \`GetValue\` 未 handle で engine が進まず decisions が空。

## まとめ（3行）

- app loop は engine の \`AppMsg\` を \`while let recv()\` で受け、reply するか bridge を駆動する中継地点。
- \`run_engine_app<B>\` は generic — 同じループが Stub/InMemory/Reth/LiveReth で動く（L3 trait surface の配当）。
- \`first_block_via_engine_actors\` が engine→app→bridge→engine の完全パイプラインを 0.02 秒で証明 — block 生成の milestone。`,
                },
              ],
            },
          },
          {
            title: 'Live Reth',
            sortOrder: 6,
            lessons: {
              create: [
                {
                  title: 'レッスン11 — workspace で live Reth EthereumNode を boot する',
                  slug: 'openhl-reth-bootstrap-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン11 — workspace で live Reth \`EthereumNode\` を boot する

## 問い

Reth（~600 crate のツリー）と Malachite を同じ workspace に同居させたとき、依存が衝突せず両方が同じ tokio runtime で boot するか？ そして、integration コードを書く *前* にそれをどう検証するか？

## 原理（最小モデル）

- **bootstrap-only test も一級の成果物。** node を spin up して chain ID を読むだけ。ビジネスロジックゼロの段階で依存解決と runtime bootstrap の regression を捕まえる。これが落ちたら L12–15 は何も動かない。
- **production-dep は薄く、dev-dep は厚く。** \`crates/evm/Cargo.toml\` の production dep は 6 個のまま、dev-dep を 11 個に増やす。\`openhl-evm\` を使う下流 crate は libp2p/MDBX/rpc を引かず、テストバイナリだけが引く。
- **\`NodeConfig::test().dev()\`。** \`test()\` = ephemeral tempdir + \`:0\` port + peer discovery なし。\`dev()\` = single block producer、mempool gossip なし。組合せで CI 上で再現可能な完全 isolated 環境。
- **chain ID 2600。** Reth 上流 \`custom-dev-node\` example と一致（diff 用）、public chain と衝突しない。OpenHL 的な意味はない。

## 具体例

共有 tokio runtime（worker_threads=4）上の task 配置:

\`\`\`
[側A: Malachite] Engine actors / libp2p / WAL / run_engine_app loop
[側B: Live Reth]  TaskExecutor / MDBX / Payload Builder / Mempool / RPC stub
   ↑ L11 はこの 2 世界が同一 runtime で衝突せず立ち上がる「ハンドシェイク」だけを検証
     （A↔B の直接通信線は L12–15 で接続）
\`\`\`

## 失敗例（誤解）

「integration コードを先に書けばいい」は誤り。大インフラ crate 2 つの衝突は integration を書いて初めて判明し、その時点で「動くはずなのにコンパイルできない」コードに大量投資済みになる。**両方を同時に exercise する最小 test を先に書く** — 失敗の blast radius が小さい。

---

ここまでで「共存検証パターン・薄い prod / 厚い dev」は着地した。ここから \`reth_node.rs\`（test module のみ）を組み立てる。コードは完全形。

> 🛑 **予測。** なぜ bootstrap test を \`--release\` で走らせるのか？ ヒント: compile time の支配要因と、test 自体が何をするか。Reth の MDBX/libp2p/alloy スタックは巨大（~600 crate、debug 初回 ~2:34〜）。test は bootstrap + chain-ID チェックだけ → 初回コンパイル後は fast compile より fast runtime が欲しい。

## ステップで組み立てる

### Step 1: root \`Cargo.toml\` に Reth 依存を追加（全て v2.2.0 SHA \`88505c7f...\` に pin）

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

新規 4 個の用途: \`reth-node-core\`（\`NodeConfig\` 型）/ \`reth-tasks\`（\`Runtime\`/\`TaskExecutor\`）/ \`reth-provider\`（L12 が保持する \`BlockchainProvider\`）/ \`alloy-genesis\`（Genesis JSON → ChainSpec）。**main HEAD でなく release-tag SHA に pin** が不変条件（crates.io は GitHub tag より数週〜数ヶ月遅れる）。

### Step 2: \`crates/evm/Cargo.toml\` の \`[dev-dependencies]\`（production scope 不変）

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

\`test-utils\` feature が \`NodeBuilder::testing_node(runtime)\`（tempdir MDBX + debug + ephemeral port）を提供する。全て dev-dep なので、\`#[cfg(test)]\` 外で使うと compile が落ちる（test-only dep がガードレール）。

### Step 3: \`crates/evm/src/reth_node.rs\` — doc + imports

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

    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn reth_dev_node_bootstraps() {
        if let Err(e) = launch_and_check().await {
            panic!("Reth dev node bootstrap failed: {e:?}");
        }
    }
}
\`\`\`

要点:
- **chain spec は raw JSON → \`Genesis\` → \`genesis.into()\`**。\`ChainSpec\` builder は 50+ フィールドで複雑なので、Reth 自身の deserializer に default/validity を強制させる（JSON は chain の外部 IF でもある）。EIP block は全て 0、\`terminalTotalDifficultyPassed: true\`（post-merge から開始）。
- **\`NodeConfig::test().dev().with_chain(spec)\`** → \`NodeBuilder::new(config).testing_node(runtime).node(EthereumNode::default()).launch_with_debug_capabilities()\`。
- **\`node_exit_future: _\`** は await しない（await すると shutdown を待ってブロック）。\`NodeHandle\` を drop して runtime に tear down させる。
- \`worker_threads = 4\` は Reth 内部 task（MDBX/payload builder/RPC/network）に余裕を持たせる。

### Step 4: \`crates/evm/src/lib.rs\` に test-cfg で組み込む

\`\`\`rust
#[cfg(test)]
mod reth_node;
\`\`\`

\`#[cfg(test)]\` がキー — bootstrap モジュールは test-only で consumer から見えず non-test ビルドでコンパイルされない。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout e6b4ebb
diff -u ~/code/my-openhl/Cargo.toml ./Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/reth_node.rs ./crates/evm/src/reth_node.rs
git checkout main
\`\`\`

\`e6b4ebb\` に workspace dep update + 11 dev-dep + 105 行の reth_node.rs。genesis JSON / builder chain / test 属性は厳密一致するべき。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm reth_dev_node_bootstraps --release
\`\`\`

→ **\`reth_dev_node_bootstraps\` 1 個 pass**（フル Reth \`EthereumNode\` v2.2.0 を ~2.7 秒で spin up、provider に chain ID query）。初回コールド ~2:34。よくあるミス: \`test-utils\` feature 忘れ / reth-* 12 個の SHA 不一致（version skew）/ \`current_thread\` で hang / 直前 run のゾンビプロセスが socket/MDBX lock 占有（数秒待つ→\`pgrep\`→kill）。

## まとめ（3行）

- bootstrap-only test（spin up + chain ID 確認）が、ビジネスロジック前にインフラ regression を捕まえる一級成果物。
- production dep は 6 個のまま、test-utils 付き dev-dep 11 個でフル Reth スタックを検証 — \`openhl-evm\` は slim を保つ。
- Reth v2.2.0 と Malachite v0.5.0 が同一 workspace・同一 runtime で衝突なく共存することを build と test の両方で証明。`,
                },
                {
                  title: 'レッスン12 — LiveRethEvmBridge が real chain から parent を読む',
                  slug: 'openhl-live-bridge-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 50,
                  xpReward: 100,
                  content: `# レッスン12 — \`LiveRethEvmBridge\` が real chain から parent を読む

## 問い

bridge を live Reth provider に接続して、parent block を **real chain** から読むには？ そして bridge が「インメモリ合成に fallback せず本当に Reth と対話している」ことをどう証明するか？

## 原理（最小モデル）

- **\`P: BlockNumReader\` に generic にする（具象 \`BlockchainProvider\` でなく）。** bridge が必要とする capability をちょうど 1 つだけ宣言。具象 provider は 30+ trait bound を背負い、それを全 caller に流すのは負担。generic は surface を絞り mock test も自明にする。
- **\`Result<Option<u64>>\` が運用エラーとプロトコルエラーを区別。** DB call 失敗 → \`BridgeError::Internal\`（アラート）、未知 hash → \`BridgeError::Rejected\`（nil 投票して進む）。
- **未知の親の拒否は安全性プロパティ。** live chain が見たことない hash の上に build しろと言われたら拒否 — 悪意ある proposer が EL を fork subtree に誘導するのを防ぐ。
- **2 bridge は integration の 2 段階。** \`RethEvmBridge\`（L5、alloy のみ）と \`LiveRethEvmBridge\`（L12、live provider）は重複でなく統合の段階を表す。

## 具体例

provider 抽象境界（L5 の trait boundary に 1 段追加）:

\`\`\`
BlockHash (contract) ──変換──► B256 (alloy) ──► [★ BlockNumReader trait 境界 ★]
                                                       │ 具象を隠蔽
                                                       ▼
                                            BlockchainProvider ──► MDBX ──► u64
\`\`\`

\`LiveRethEvmBridge<P>\` 本体は具象 provider 型を一切知らない。production は live provider、test は mock を同じ IF で差し替え可能。

## 失敗例（誤解）

「happy path だけテストすればいい」は誤り — bridge が偶然インメモリ state に fallback して任意の親に child を作るバグを見逃す（コンパイル通る・happy pass・consensus が壊れた高さを commit）。「具象 \`BlockchainProvider\` を直接取る」も誤り — 全 consumer が 30+ bound を糸通しする羽目に。

---

ここまでで「provider generic・2 段 Result・親拒否」は着地した。ここから \`live_node.rs\` を組み立てる。コードは完全形。

> 🛑 **予測。** \`build_payload\` が live provider から読むのに、なぜ \`LiveRethEvmBridge\` は依然 \`pending\`/\`chain\`/\`head\` を持つ \`Mutex<State>\` を保持するのか？ ヒント: \`build_payload\` は \`PayloadId\` を即返し、engine は後で別 task（別スレッドかも）で \`payload_ready(id)\` を呼ぶ。この 2 つの独立した protocol moment を糊付けする seam が必要。

## ステップで組み立てる

### Step 1: root \`Cargo.toml\` に \`reth-storage-api\`

\`\`\`toml
reth-storage-api          = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
\`\`\`

\`BlockNumReader\` / \`BlockHashReader\` reader trait が住む。他の reth-* と同じ pinned SHA（version skew があると \`node.provider\` を受け入れられない）。

### Step 2: \`crates/evm/Cargo.toml\`（\`eyre\` を dev → production へ昇格 + \`reth-storage-api\`）

\`\`\`toml
[dependencies]
openhl-consensus         = { workspace = true }
openhl-types             = { workspace = true }
async-trait              = { workspace = true }
eyre                     = { workspace = true }      # dev → production（BridgeError::Internal を build_payload で構築）
alloy-primitives         = { workspace = true }
alloy-consensus          = { workspace = true }
reth-ethereum-primitives = { workspace = true }
reth-storage-api         = { workspace = true }      # NEW
\`\`\`

\`eyre\` が production になるのは \`BridgeError::Internal(eyre::eyre!(...))\` を \`build_payload\`（production コード）で構築するから。

### Step 3: \`crates/evm/src/live_node.rs\` — doc + imports + struct

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

provider を \`State\` の外に置くのは、\`BlockNumReader\` 実装が \`Sync + Clone\` で多数の async task が同時共有する前提だから（mutex に入れると全 \`block_number\` lookup が直列化）。**lock は変更されるものを守り、読まれるものは守らない。**

### Step 4: \`build_payload\` が live read

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

trait bound \`P: BlockNumReader + Clone + Sync + 'static\` が契約。3 フェーズ: ① live read（\`block_number\` → \`Ok(Some(n))\` 続行 / \`Ok(None)\` → \`Rejected\`（**親拒否で consensus 接続が安全に**）/ \`Err\` → \`Internal\`）② state allocation（lock 下に I/O なし）③ header 合成（\`number = parent_number + 1\` は live read 由来）。2 段 \`Result<Option<u64>>\` は「hash 欠落=プロトコル問題」と「provider crash=運用問題」を別 variant に分ける。

### Step 5: \`payload_ready\` / \`validate_payload\` / \`commit\`（後者 2 つは stub）

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

\`validate_payload\` / \`commit\` は L4 と同じ shape の stub。コメントが real execution（L13 / Stage 7c）と forkchoice（L14 / Stage 7d）の場所を名指し — **visible な stub は技術負債でなく進捗マーカー**。

### Step 6: \`lib.rs\`（**production-visible**、\`#[cfg(test)]\` でない）

\`\`\`rust
pub mod bridges;
pub mod live_node;

#[cfg(test)]
mod reth_node;
\`\`\`

L11 の bootstrap は genuine に test-only だったが、L12 の bridge は production API（L13–15 で main から使う）。

### Step 7: integration test（happy + negative）

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

happy path: live genesis hash の上に build → \`parent_hash == genesis\` かつ \`number == 1\`（インメモリ合成なら number は任意になりえた。1 が出るのは \`block_number(genesis_hash)\` が \`Some(0)\` を返したときだけ = live read の証明）。negative path: \`[0xee;32]\` は chain が知らない → \`BridgeError::Rejected\`。両方が load-bearing（片方では fallback バグ / 常時 reject バグを見逃す）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 8d211b8
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
git checkout main
\`\`\`

\`8d211b8\` に ~227 行の live_node.rs。trait bound・\`build_payload\` 本体・2 パステストは厳密一致するべき。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
\`\`\`

→ **\`live_bridge_builds_on_real_genesis\` 1 個 pass**（happy + negative、~2.4 秒）。よくあるミス: \`reth-storage-api\` の SHA 不一致 / test の \`[dev-dependencies]\` に \`reth-provider\` 追加忘れ / \`.ok_or_else(|| Rejected)\` を \`.expect\` にして negative path が発火しない。

## まとめ（3行）

- bridge は \`P: BlockNumReader\` に generic — 具象 provider の 30+ bound を避け、production live / test mock を同じ IF で差し替え。
- \`build_payload\` の live read（\`block_number\`）が child の number/parent を real chain から得る。未知の親は \`Rejected\`。
- happy + negative の 2 テストが「live read が load-bearing」を誠実に証明する（片方では不十分）。`,
                },
                {
                  title: 'レッスン13 — validate_payload が Reth の EthBeaconConsensus を走らせる',
                  slug: 'openhl-validate-payload-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 55,
                  xpReward: 100,
                  content: `# レッスン13 — \`validate_payload\` が Reth の \`EthBeaconConsensus\` を走らせる

## 問い

自分が \`build_payload\` で作った block を、自分の \`validate_payload\` が拒否しないことをどう保証するか？ つまり build と validate が **同じルール** を使うことをどう担保するか？

## 原理（最小モデル）

- **builder と validator が source of truth を共有する。** \`ChainSpec::next_block_base_fee\` を builder が base fee 計算に使い、\`EthBeaconConsensus\` が検証に使うのも同じヘルパー。数式の重複なし、hardfork 越しの drift リスクなし。
- **validator の reject は通常動作（crash でない）。** 「malformed だ」は \`PayloadStatus::Invalid\` であって \`Err\` ではない。error→status の map で engine は走り続け次の proposal を選べる。DB エラーだけ \`BridgeError::Internal\` にエスカレート。
- **trait bound は段階的に広がる。** L12 は \`BlockNumReader\`、L13 は \`+ HeaderProvider\`。trait bound は spec — bridge が Reth surface のどこを要求するかをそのまま文書化する。
- **\`SealedHeader\` は hash を cache する。** \`Header\` + 事前計算 \`B256\` を wrap し、\`.hash()\` のたびに 500 byte を Keccak し直すのを避ける。

## 具体例

build 側と validate 側が同じ \`Arc<ChainSpec>\` を握る:

\`\`\`
            Arc<ChainSpec>（chainId / hardforks / EIP-1559 params）
           ┌──────────────┴──────────────┐
           ▼                              ▼
build_payload                    EthBeaconConsensus.validate_header_against_parent
  next_block_base_fee()            ├─ base_fee check（同じ next_block_base_fee）
  gas_limit = parent.gas_limit     ├─ gas_limit drift ±1/1024
  difficulty = ZERO                ├─ timestamp monotonicity
  timestamp 単調化                 └─ post-merge invariants  →  Valid ✅
\`\`\`

両側が同じ instance を握るので、Cancun 以降の base_fee 公式変更でも「片方だけ古い」が物理的に起きない。

## 失敗例（誤解）

「build 側で EIP-1559 数式を inline 実装すればいい」は誤り — hardfork（Cancun は \`BASE_FEE_MAX_CHANGE_DENOMINATOR\` 変更）で公式がずれ、自分の生成した block を自分の validator が拒否する silent fork が量産される。「validator の \`Err\` を \`Internal\` にマップ」も誤り — engine app loop を kill してしまう。

---

ここまでで「共有 source-of-truth・reject は通常動作」は着地した。ここから \`live_node.rs\` を改修する。コードは完全形。

> 🛑 **予測。** \`validate_header_against_parent\` は parent の **full** sealed header（gas_limit/timestamp/base_fee 全部）を要求するのに、なぜ \`block_number\` は \`u64\` だけ返すのか？ ヒント: validator の 4 sub-check（number/timestamp/gas-limit drift/EIP-1559 base fee）はそれぞれ parent の何を要るか。だから L13 で bound を \`BlockNumReader\` に **加えて** \`HeaderProvider\` まで拡張する。

## ステップで組み立てる

### Step 1: root \`Cargo.toml\` に 3 dep

\`\`\`toml
reth-consensus            = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-ethereum-consensus   = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
reth-primitives-traits    = "0.3"
\`\`\`

\`reth-consensus\`（\`HeaderValidator\` trait）/ \`reth-ethereum-consensus\`（具象 \`EthBeaconConsensus\`）/ \`reth-primitives-traits\`（\`SealedHeader\`）。**後者だけ crates.io（git でない）** — Reth の中で外部エコシステムに stabilize された部分で、crates.io publish パッケージは git-rev 依存を含められない（Cargo の制約）。

### Step 2: \`crates/evm/Cargo.toml\`（\`reth-chainspec\` を dev→production 昇格 + 3 dep）

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
reth-chainspec           = { workspace = true }    # NEW（dev → production）
\`\`\`

\`reth-chainspec\` が production になるのは bridge が \`Arc<ChainSpec>\` を struct に保持するから。

### Step 3: \`live_node.rs\` imports + struct（+2 フィールド）+ new()

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

#[derive(Debug)]
pub struct LiveRethEvmBridge<P> {
    provider: P,
    chain_spec: Arc<ChainSpec>,                          // NEW
    validator: EthBeaconConsensus<ChainSpec>,            // NEW
    state: Mutex<State>,
}

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

\`State\` は L12 のまま不変。\`EthChainSpec\` は \`ChainSpec\` に \`next_block_base_fee\` を与える拡張 trait。

### Step 4: trait bound を拡張

\`\`\`rust
#[async_trait]
impl<P> ConsensusBridge for LiveRethEvmBridge<P>
where
    P: BlockNumReader + HeaderProvider<Header = Header> + Clone + Sync + 'static,
{
\`\`\`

\`HeaderProvider<Header = Header>\` で provider が full \`Header\` を serve する（associated type binding で「provider の Header はこちらの alloy Header」と固定）。\`BlockNumReader\` は今や冗長だが L12→L13 の進行を文書化するため残す。

### Step 5: \`build_payload\` を production grade に

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

L12 からの変更: \`sealed_header_by_hash\`（full header が要る）/ \`our_timestamp = attrs.timestamp.max(parent.timestamp + 1)\`（厳密単調）/ 慎重な 4 フィールド（gas_limit コピー=drift 自明 / difficulty ZERO=post-merge / base_fee は **validator と同じ** \`next_block_base_fee\` / 残り default）。

### Step 6: \`validate_payload\` を rewrite

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

4 フェーズ: ① header lookup（pending/chain、なければ \`Invalid\`）② parent を live provider から fetch（なければ \`Invalid\`、provider error は \`Internal\`）③ \`SealedHeader::new\` で wrap ④ \`validate_header_against_parent\` を走らせ \`Ok(())\`→\`Valid\` / \`Err(_)\`→\`Invalid\`。Reth 内部の 4 sub-check（hash_number / timestamp / gas_limit drift / eip1559 base_fee）。**\`Err\` を \`Invalid\` にマップするのは validation 失敗が protocol シグナルで運用失敗でないから**（\`Internal\` は engine を kill する）。\`commit\` は L12 のまま stub（L14 で forkchoice に置換）。

### Step 7: テストに 2 assertion 追加

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

load-bearing は \`validate_payload(&block)\` → \`Valid\` — build と validate がルールに合意している証明（difficulty 非ゼロ / gas_limit drift / base_fee 間違いなら fail）。\`dev_chain_spec()\` は L11/L12 と同じ genesis JSON（\`Arc<ChainSpec>\`、\`.clone()\` は refcount increment のみ）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 0844d58
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
git checkout main
\`\`\`

\`0844d58\` に L12 からの ~141 行変更。新 struct フィールド・upgrade した \`build_payload\`・rewrite した \`validate_payload\`・新 assertion は厳密一致するべき。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm live_bridge_builds_on_real_genesis --release
\`\`\`

→ **1 個 pass**（\`Valid\` + \`Invalid\` assertion 込み、~2.4 秒）。\`Valid\` が落ちる主因: \`difficulty: U256::ZERO\` 忘れ / \`gas_limit = parent.gas_limit\` 忘れ / base_fee を \`next_block_base_fee\` 以外で計算 / timestamp が parent より大きくない / 拡張 trait \`EthChainSpec\` の \`use\` 忘れ（\`next_block_base_fee\` が解決しない）。

## まとめ（3行）

- builder と validator が同じ \`Arc<ChainSpec>\` を共有 — \`next_block_base_fee\` を両者が使い、hardfork 越しの drift を物理的に防ぐ。
- \`validate_payload\` は \`EthBeaconConsensus::validate_header_against_parent\` を走らせ、\`Err\`→\`Invalid\`（crash でなく protocol シグナル）。
- trait bound が \`+ HeaderProvider\` に拡張 — bound は bridge が要求する Reth surface の spec。`,
                },
                {
                  title: 'レッスン14 — commit が Reth の Engine API forkchoice を駆動する',
                  slug: 'openhl-commit-forkchoice-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 50,
                  xpReward: 90,
                  content: `# レッスン14 — \`commit\` が Reth の Engine API forkchoice を駆動する

## 問い

\`commit\` で「ローカル bookkeeping」と「Reth engine への通知」のどちらを先にやるべきか？ そして engine 呼び出しが失敗したら、確定済みの commit を rollback すべきか？

## 原理（最小モデル）

- **local-first、engine-second。** bridge の \`chain: HashMap\` が consensus 層の source of truth。local を先に commit すれば、engine 呼び出しが失敗しても rollback 不要（consensus commit の rollback は safety 違反）。一般化: primary store 先、secondary index/replica 後。
- **\`Option<EngineHandle>\` は test ergonomics。** 必須にすると全 unit test が実 node を bootstrap する羽目に。\`Option\` なら test は \`None\`（local path のみ）、integration は \`Some(handle)\`（両 path）。
- **engine 応答は意図的に破棄。** マッチする \`engine_newPayload\` を先に送っていないので \`SYNCING\` が正解応答。これを error 扱いすると全 caller が「L14 は部分統合」を知る羽目に。破棄すれば API が正直：「local commit 完了、下流通知は best-effort」。
- **3-field \`ForkchoiceState\` を v0 では同一 hash。** mainnet は head/safe/finalized を区別するが、v0 single-validator は全 commit が final → 3 つとも同じ hash（multi-validator への forward-compat で形は保つ）。

## 具体例

commit の 2 phase の時間順:

\`\`\`
Phase 1（絶対成功）: lock → pending から header lookup → chain.insert(hash) → head = Some(hash)
   ※ ここを抜けた瞬間 consensus 上「commit 済み」確定。下流が即この値を読む。
        │ (もう引き返せない)
Phase 2（best-effort）: if let Some(handle) { ForkchoiceState{head=safe=finalized=hash}
                          → let _ = handle.fork_choice_updated(state, None).await }  ← 応答は破棄
        ▼
Reth engine（body 未送なので SYNCING 応答）→ commit は Ok(()) を返す
\`\`\`

これで 4 method 全て（build/payload_ready/validate/commit）が real Reth コードパスに到達 — ループが閉じる。

## 失敗例（誤解）

「engine を先に送って成功を確認してから local commit」は誤り — engine 失敗時に確定済み consensus commit を rollback する判断を迫られ、safety 違反になる。「engine が \`INVALID\` を返したら \`Err\` を返す」も誤り — Malachite に「その decided block は存在しない」と告げ chain が壊れる（Reth の chain view は consensus の **下流**、逆ではない）。

---

ここまでで「local-first・best-effort 副作用」は着地した。ここから \`live_node.rs\` を改修する。コードは完全形。

> 🛑 **予測。** なぜテストは \`commit().await\` が \`Ok\` を返すことだけ assert し、Reth の canonical head が動いたことは assert しないのか？ ヒント: \`build_payload\` の出力（header だけ、tx/receipt/state-root なし）に何が欠けているか。\`engine_newPayload\` を先に送らない限り \`fork_choice_updated\` は \`SYNCING\`（body を知らない）を返す。**L14 が証明するのは wire 接続。payload execution は将来コース。**

## ステップで組み立てる

### Step 1: root \`Cargo.toml\` に 2 dep

\`\`\`toml
reth-ethereum-engine-primitives = { git = "https://github.com/paradigmxyz/reth", rev = "88505c7fcbfdebfd3b56d88c86b62e950043c6c4" }
alloy-rpc-types-engine = { version = "2.0", default-features = false }
\`\`\`

\`reth-ethereum-engine-primitives\`（\`EthEngineTypes\` = Ethereum mainnet engine surface の type bundle）/ \`alloy-rpc-types-engine\`（\`ForkchoiceState\`、CL→EL の canonical wire payload）。**\`alloy-rpc-types-engine\` を \`2.0\` に pin** して Reth v2.2.0 の \`2.0.4\` と一致させる（不一致だと \`ForkchoiceState\` が別型になり handle が拒否）。

### Step 2: \`crates/evm/Cargo.toml\`（3 dep 追加）

\`\`\`toml
reth-engine-primitives          = { workspace = true }    # NEW: ConsensusEngineHandle
reth-ethereum-engine-primitives = { workspace = true }    # NEW: EthEngineTypes
alloy-rpc-types-engine          = { workspace = true }    # NEW: ForkchoiceState
\`\`\`

\`reth-engine-primitives\` は L1 から workspace dep だった（\`ConsensusEngineHandle\` が住む）— ここで「利用可能」から「import する」へ昇格。

### Step 3: \`live_node.rs\` imports + struct（+engine_handle）

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

\`engine_handle\` を \`Option\` にするのは、全 consumer が Reth を bootstrap する production node ではないから — unit test は provider 相手の bridge だけ欲しい。型レベルの optionality が漏れる API surface を避ける。

### Step 4: \`new()\` + builder メソッド

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

\`with_engine_handle\` は consume-and-return-self builder（\`mut self\`、所有権を取り return）。\`#[must_use]\` — return を bind し忘れると修正済み bridge が drop される。**\`self\` を消費するので \`let bridge = ...new(...).with_engine_handle(h);\` と 1 式でチェーンする**（2 行に分けると move out される）。\`has_engine_handle\` は \`const fn\` accessor。

### Step 5: \`commit\` を rewrite — local 先、engine best-effort

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

Phase 1: local bookkeeping（L13 と同じ shape、header 欠落で \`Rejected\`、\`?\` が engine 前に exit）。Phase 2: \`engine_handle.is_some()\` のときだけ 3 スロット同一 hash の \`ForkchoiceState\` を fire。\`let _ = ...await\` で engine 応答（\`VALID\`/\`SYNCING\`/\`INVALID\`）を破棄 — **\`INVALID\` で rollback しない**（local state が source of truth、Reth はその下流）。

### Step 6: integration test を追加（既存テストは変えず別テストで isolate）

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

要点: \`with_types().with_components().with_add_ons().launch()\` の明示的 builder で \`add_ons_handle\` を expose（\`launch_with_debug_capabilities\` は expose しない）。\`add_ons_handle.beacon_engine_handle\`（外部 CL が JSON-RPC で叩く engine API の in-process ショートカット、Arc ベースで clone 安価）。メインの assertion は \`commit().await\` が \`Ok\` を返すこと（engine の SYNCING 応答は破棄）。unknown hash は engine path 前に bail して \`Rejected\` を維持。末尾 \`drop(handle)\` で background task を tear down。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 0cac571
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
git checkout main
\`\`\`

\`0cac571\` には Stage 8（CLOB integration）由来の追加コードが含まれることがある。Stage 7d 固有の変更（\`engine_handle\` フィールド / \`with_engine_handle()\` / \`commit\` body 再構成 / engine test）は厳密一致するべき。

## 合格基準

\`\`\`bash
cargo test -p openhl-evm commit_sends_forkchoice_to_engine_when_handle_installed --release
\`\`\`

→ **1 個 pass**（~3 秒）。これで 4 method 全てが real Reth に到達。よくあるミス: \`with_engine_handle\` の return を bind し忘れ（\`has_engine_handle\` が false）/ \`.await\` を落として silent skip（hang でなく通知スキップ）/ reth-* の SHA drift で \`EthereumAddOns\` が見つからない / commit の \`?\` が engine 前に exit せず unknown hash で \`Ok\` を返す。

## まとめ（3行）

- commit は local bookkeeping を先に確定（source of truth）し、engine 通知は best-effort の副作用 — Phase 2 失敗で Phase 1 を rollback しない（safety）。
- \`Option<EngineHandle>\` で同じ struct が test（\`None\`）と production（\`Some\`）に仕える。engine 応答（今は \`SYNCING\`）は意図的に破棄。
- 4 つの \`ConsensusBridge\` method 全てが real Reth コードパスに到達 — bridge のループが閉じた。`,
                },
              ],
            },
          },
          {
            title: 'Capstone',
            sortOrder: 7,
            lessons: {
              create: [
                {
                  title: 'レッスン15 — 作ったもの、まだ stub のもの、次に行く先',
                  slug: 'openhl-capstone-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 60,
                  content: `# レッスン15 — 作ったもの、まだ stub のもの、次に行く先

## 問い

16 レッスンで何を作り、何を **まだ** 作っていないか？ そして「テストが pass する」から「real value を任せていい」まで、正直に何が残っているか？

## 原理（最小モデル）

- **空ディレクトリ → 動く single-validator BFT chain。** \`cargo init\` から、実 Reth EL を通じて実 block を ~0.02 秒で確定させる chain まで到達した。Consensus + EVM crate で約 1,400 行 + ~250 行の integration test。
- **4 つの \`ConsensusBridge\` method が全て live。** build_payload / payload_ready / validate_payload / commit が real Reth コードパスに到達。CL クライアントが触る Reth public surface のほとんどに相当。
- **L1 構築の最難関は engine を書くことではない。** Malachite がほとんどやってくれて、こちらは接続しただけ。最難関は **自分のコードに何ができて何ができないかに正直であること** と、「できる」側を証明するテストを書くこと。全レッスンが happy-path + negative-path の assertion を持っていた。

## 具体例

4 method の最終状態:

| メソッド | 最初の impl | live impl | 到達する real Reth コード |
|---|---|---|---|
| \`build_payload\` | L4 (in-memory) | L13 | \`HeaderProvider::sealed_header_by_hash\`, \`ChainSpec::next_block_base_fee\` |
| \`payload_ready\` | L4 | L13 | (Reth call なし — bridge の pending map) |
| \`validate_payload\` | L4 (stub Valid) | L13 | \`EthBeaconConsensus::validate_header_against_parent\`（4 sub-check） |
| \`commit\` | L4 (HashMap) | L14 | \`ConsensusEngineHandle::fork_choice_updated\`（in-process Engine API） |

## 失敗例（誤解）

「workspace テスト 38 個 pass = production ready」は誤り。意図的に skip した scope が 6 つある（後述）。特に **engine \`newPayload\` 統合が欠落** で、\`commit\` の forkchoice は今 \`SYNCING\` 応答を受ける。「テストが pass」と「real value を任せられる」の間には、コース本体より難しい long-pole 作業が並ぶ。

---

ここまでで「何を作り・最難関は scope への正直さ」は着地した。ここから全体像・残った placeholder・production checklist を振り返る。

> 🛑 **セルフチェック。** 次に進む前に：4 つの \`ConsensusBridge\` メソッドのうち、唯一データが **EL → CL 方向** に流れる seam はどれか？ そして \`build_payload\` と \`validate_payload\` が同じ block ルールに合意できるのは、何を共有しているからか？（答え: \`payload_ready\` / \`Arc<ChainSpec>\`。即答できなければ L3・L13 を読み直す。）

## 作ったシステム（全体像）

\`\`\`
~/code/my-openhl/
├── Cargo.toml                  reth-* 16 + malachite 8、すべて SHA pin
├── crates/types/               L2:  CL↔EL 共通 contract 型（BlockHash, PayloadId, …）
├── crates/evm/                 EL 側
│   ├── bridges/in_memory.rs     L4:  InMemoryEvmBridge（HashMap state）
│   ├── bridges/reth.rs          L5:  RethEvmBridge（alloy 型, real hash_slow）
│   ├── reth_node.rs             L11: bootstrap 証明（test-only）
│   └── live_node.rs             L12-14: LiveRethEvmBridge<P>
│                                  - L12: BlockNumReader 経由 parent lookup
│                                  - L13: EthBeaconConsensus validate
│                                  - L14: ConsensusEngineHandle forkchoice
└── crates/consensus/           CL 側（フル BFT engine）
    ├── bridge.rs                L3:  ConsensusBridge trait
    ├── types/ + context.rs      L6:  10 Malachite Context sub-type + impl
    ├── signing*.rs              L7:  canonical encoding + SigningProvider
    ├── codec.rs                 L8:  OpenHlCodec（real 1 + stub 7）
    ├── node.rs                  L9:  OpenHlNode + start_engine
    └── engine_app.rs            L10: run_engine_app（12 AppMsg arm）
\`\`\`

左右 2 世界は L3 の \`ConsensusBridge\` 4 メソッドだけで会話する。\`run_engine_app\`（L10）が \`B: ConsensusBridge\` generic なので Stub/InMemory/Reth/LiveReth の 4 bridge が同じ loop で走る。\`LiveRethEvmBridge\` 内の \`chain_spec: Arc<ChainSpec>\` が build/validate 両方で参照される共有 source of truth — ここが分かれた瞬間に self-fork する。

## まだ placeholder のもの（意図的な scope cut）

1. **Engine \`newPayload\` 統合** — 欠落。\`commit\` の forkchoice に対し engine は body がないので \`SYNCING\`。\`VALID\` まで進めるには build_payload 出力を \`ExecutionPayload\` として encode し forkchoice の前に \`new_payload\` で送る。ブロッカーは EVM-executable な tx がまだないこと — Hyperliquid 型は約定(fill)を **protocol-initiated system tx / precompile injection** としてユーザー署名なしで payload に差し込む（ステップ2 全体に相当）。
2. **Real \`Codec\` impl** — real 1（ProposalPart）+ stub 7。2 番目の validator を足した瞬間に gossip/WAL/sync codec が発火する。wire format（protobuf 等）を選んで各型を実装。
3. **Multi-validator gossip** — 未 exercise。libp2p は configure 済みだが peer discovery / vote propagation / sync は未テスト。
4. **永続 WAL** — エフェメラル tempdir。crash recovery 検証には real WAL codec + chaos test が要る。
5. **Slashing + double-sign 検知** — なし。value を扱うネットワークには危険。
6. **Custom Hyperliquid 型挙動** — vanilla Ethereum。precompile / CLOB 駆動 payload assembly は将来コース（ステップ2-3）。

## Production-readiness チェックリスト

- [ ] 7 Codec stub を real impl に置換
- [ ] \`engine_newPayload\` 統合（engine の canonical view を bridge に合わせる）
- [ ] N=2+ node 共有 chainspec の multi-validator integration test
- [ ] WAL crash-recovery test（commit 途中 kill → 再起動 → head 検証）
- [ ] 永続 \`home_dir\`（tempdir でない）
- [ ] engine 応答を log（discard でなく）
- [ ] slashing/double-sign フック接続
- [ ] key rotation 手順
- [ ] 運用テレメトリ（round duration / build latency / validate failure）
- [ ] canonical encoding format の独立セキュリティレビュー（L7 のバイトレイアウトは wire spec の一部）
- [ ] 部分 partition 下の proposer manipulation の脅威モデル

## 16 レッスン前にはできなかった、今できること

- 実 EL に対してフル Rust BFT engine を bootstrap できる（mock でも FFI でもなく、同じ workspace で \`EthereumNode\` を走らせる）。
- producer/validator の自己整合性を推論できる（\`chain_spec.next_block_base_fee\` が build/validate 両方を駆動）。
- incremental-stub パターン（trait bound が surface を強制、埋められない所は明確な failure mode で stub）。
- 2 つの汎用インフラ（Reth / Malachite）を handshake interface（\`Node\`/\`ConsensusBridge\` trait）で接続できる。
- プロトコルエラーと運用エラーを区別できる（\`Rejected\` / \`Internal\`、\`Invalid\` と伝播）。
- live read が起きたことを証明するテストを書ける（L12 の \`assert_eq!(block.number, 1)\` が load-bearing）。

## 次に行く先

- **rethlab 内**: Reth Expert（\`reth-l1-architect\`、ステップ2 CLOB+ — \`BlockExecutor\` / state-root / MDBX 深掘り）/ [Reth Expert L11 — Running a Reth fork in production](/courses/reth-expert-ja/lessons/reth-fork-production-ja)（devnet が動いたら次に来る、まさにこれ — build flag / monitoring / diff testing / upgrade 規律を fork に適用）/ Reth Consensus Engineering（slashing / vote extension / fault tolerance）。
- **rethlab 外**: \`psyto/openhl\` Stages 8-9（CLOB + custom precompile）/ Malachite spec docs / 実 Reth full node（\`cargo run --bin reth -- node --chain dev\`）/ \`category-labs/monad-bft\`（もう 1 つの成熟 Rust BFT。Malachite は *embeddability* 最適、Monad-BFT は *single-chain throughput* 最適 — Rust BFT は単一の shape でないと腹落ちする。**GPLv3 なので citation/読解 OK、code copy は NG**）。

## まとめ（3行）

- \`cargo init\` から実 Reth EL で実 block を確定させる single-validator BFT chain を、約 1,400 行で作った（4 method 全て live）。
- L1 構築の最難関は engine を書くことでなく、scope に正直であることと「できる」側を証明するテストを書くこと。
- production まではコース本体より難しい long-pole（newPayload / real codec / multi-validator / WAL / slashing）が残る — これを使って何か作りに行こう。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
