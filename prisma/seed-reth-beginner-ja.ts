import { PrismaClient } from '@prisma/client';

export async function seedRethBeginnerJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'beginner'];

  await prisma.course.create({
    data: {
      slug: 'reth-beginner-ja',
      title: 'Reth入門 — Rust Ethereumの世界へ',
      description:
        'Reth・Revm・Alloyとは何かを俯瞰し、なぜいま注目されているのかを理解します。Rust環境を構築し、最初の小さなRustプログラムを動かすところまで。',
      difficulty: 'BEGINNER',
      duration: 75,
      xpReward: 150,
      track: 'reth-beginner',
      tags,
      isPublished: true,
      sortOrder: 100,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'なぜRust Ethereumスタックなのか',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'なぜReth・Revm・Alloyを学ぶのか',
                  slug: 'why-rust-ethereum-stack-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 20,
                  content: `# なぜReth・Revm・Alloyを学ぶのか

近年、HyperliquidやTempoのような高性能チェーンが共通して採用しているのが、**Ethereum系のRust実装** — つまり **Reth / Revm / Alloy** です。

## 何が「面白い」のか？

| 観点 | EVM（Geth） | Rust EVMスタック（Reth + Revm） |
| :--- | :--- | :--- |
| **言語** | Go | **Rust（メモリ安全＋高速）** |
| **設計** | 一体型（モノリシック） | **モジュラー（部品として使える）** |
| **採用** | 既存の大半 | **新興のApp-chain・L2・MEVインフラ** |

最大のポイントは「**モジュラー**」であること。Rethは「ノード」として動かすだけでなく、**ブロックチェーンを作るためのSDK**として使えます。

## なぜ、いま注目されているのか

- **HyperliquidのHyperEVM** や **Tempo** は、内部でRevmを採用
- **Foundry**（Solidity開発の事実上の標準）の実行エンジンもRevm
- **OP-Reth**（Optimism）や zkVM の多くもRevmベース

つまりRust Ethereumスタックは、**「次世代Ethereum開発の共通言語」** になりつつあります。

## このコースのゴール

- Reth / Revm / Alloy の役割の違いを正確に理解する
- なぜこのスタックが注目されているか、自分の言葉で説明できるようになる
- Rustの開発環境を整え、最初のプログラムを動かす

このコースは「Rustが少し書ける」状態を目指すまでをカバーします。次のFundamentalsで実際にAlloyを使ってEthereumノードに接続していきます。`,
                },
                {
                  title: 'Reth・Revm・Alloyの三つ巴',
                  slug: 'three-pillars-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 20,
                  content: `# Reth・Revm・Alloyの三つ巴

3つの名前は混同されがちですが、役割はまったく違います。**「自動車を作る」** に例えるとシンプルです。

| プロジェクト | 役割 | 例え |
| :--- | :--- | :--- |
| **Alloy** | ライブラリ群（型、署名、RPC） | エンジン、タイヤ、ネジ |
| **Revm** | EVM実行エンジン | 燃焼室（命令を実行する場所） |
| **Reth** | フルノード実装 | 完成した自動車 |

## 依存の方向

- **Reth** は内部で **Alloy** と **Revm** を全面的に採用しています。
- つまり「Rethを学ぶ＝Alloy／Revmにも触れる」ということになります。

\`\`\`mermaid
graph TD
    Reth["Reth — フルノード"]
    Revm["Revm — EVM 実行エンジン"]
    Alloy["Alloy — プリミティブ・署名・RPC"]
    Reth -->|uses| Revm
    Reth -->|uses| Alloy
    Revm -->|uses| Alloy
\`\`\`

## それぞれの「使い道」

### Alloy（最も触れる機会が多い）
- **Address**、**U256** などEthereumの基本データ型
- **PrivateKeySigner** によるEIP-712などの署名
- **Provider** によるJSON-RPC通信
- ETHers-rs の事実上の後継

### Revm
- スマートコントラクトの **シミュレーション**（取引前に結果を計算）
- カスタムOpcodeを追加した **専用実行エンジン** の構築
- バックテストや高速トレース

### Reth
- 標準的なEthereumフルノードとして動かす
- **ExEx (Execution Extensions)** で実行ループにフックして拡張
- 独自のApp-chainの基盤として使う

## EVM クライアント市場での Reth の位置

Reth は **唯一の Ethereum execution client ではなく**、まだ支配的でもありません。[clientdiversity.org](https://clientdiversity.org/)（2026年5月時点）から:

| クライアント | 概算シェア | 言語 |
| :--- | :--- | :--- |
| **Geth** | ~50% | Go |
| **Nethermind** | ~25% | C# |
| **Besu** | ~9% | Java |
| **Reth** | **~7-12%** | **Rust** |
| **Erigon** | ~7% | Go |

ここから2つの結論が出ます:

1. **Rethは新興であり、支配的ではない。** 2023年リリース時の<1%から3年で~7-12%まで成長したのは早い軌道ですが、mainnetのRPCコール大半を捌いているのは依然としてGethです。**本番であなたが書くAlloyコードの大半は、Gethが応答するチェーンと通信することになる**。これ自体は問題ありません — AlloyはJSON-RPC経由ならどのexecution clientとも話せます。
2. **Revmベースのシミュレーションは、本番クライアントの挙動と一致している必要がある。** ローカルのRevm forkでトランザクションを実行する（中級 + Building tierで使うパターン）とき、その結果は同じトランザクションをGethやNethermindで処理した場合と一致しているはずです。普通はそうなります — RevmはEVM仕様に従っているので — ただし **Revmの結果を非Revmなproviderに対して検証する** 規律は、本番運用では必須です。Building tierのcapstoneで扱います。

つまり「Rust EVMスタック」は **新興かつ拡張可能** と捉えるべきで、「勝者総取り」ではありません。Paradigm・Hyperliquid・TempoがReth/Revmの上に積み上げているのは、市場シェアではなく、それが可能にすること（モジュラリティ、組み込みやすさ、性能）が理由です。

## 学習の順番

> **Alloy → Revm → Reth**
>
> 理由：「ミクロ（型）→ ミドル（実行）→ マクロ（ノード全体）」と進むのが最も挫折しにくいから。

このコースの次のティアであるFundamentalsで、まずはAlloyから手を動かし始めます。ただし Rust 環境を整える前に、よく出る疑問を一つだけ片付けておきましょう — *「Solanaも Rust なのに、なぜわざわざ EVM？」* 次のレッスンで扱います。`,
                },
                {
                  title: 'なぜSolanaではなくEthereum（Rust）なのか',
                  slug: 'why-not-solana-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 8,
                  xpReward: 15,
                  content: `# なぜSolanaではなくEthereum（Rust）なのか

「Solanaも高速で、しかもRustだから、わざわざRust EVMを学ぶ意味は？」とよく聞かれます。結論は **「目指す方向性次第」** ですが、判断軸を整理しておきましょう。

## 比較

| 項目 | **Reth系（Rust EVM）** | **Solana（SVM）** |
| :--- | :--- | :--- |
| **言語** | Rust（基盤）＋ Solidity | Rust（基盤＋コントラクト） |
| **実行モデル** | 直列／部分並列（ParallelEVM） | **完全並列（Sealevel）** |
| **学習コスト** | 中〜高 | **非常に高い**（独自モデル） |
| **将来の柔軟性** | **EVM全体に応用可** | Solana特化 |
| **対象プロジェクト** | Hyperliquid, Tempo, Monad, Berachain | Solana, Pyth, Jito, Jupiter |

## Rust EVM が選ばれる「実利」

1. **EVMエコシステムの流動性**: 既存のウォレット、ツール、開発者の知見をそのまま流用可能
2. **モジュール性**: 「インフラを自分のアプリに最適化する」ができる（HyperliquidがHyperBFT＋HyperEVMでやっていること）
3. **垂直統合**: アプリ層と実行層を一気に最適化できる

## どちらを「優先すべきか」

「**現在のトレンドと汎用性**」を重視するなら、**Reth系（このコース）** が答えです。Solanaは依然として強いですが、Rust EVMは「EVMの開発体験 × Rustの性能」という両取りができる稀有なポジションにあります。

## 2026年の現実 — 「どちらか」ではなく「交差点」

最近の構図はもう少し複雑です。Stripe（fiat側の流通網）とSolana（crypto側の流通網）を **Tempo** というRethベースの決済抽象化レイヤーがつなぐ、という形が現れつつあります。MetaがUSDC決済を始めたとき、選んだのは「自前チェーン」ではなく、Solana + Stripeという既存ネットワークの組み合わせでした。StripeはTempoの中心プレイヤーなので、構造的には Meta — Stripe — Tempo — Solana という接続が形成されつつあります。

つまり「SolanaかRust EVMか」よりも、**「自分はどちらの流通網に賭けるか」** のほうが実際の判断軸になりつつあります。Rust EVM側（このコース）のフィールドは、app-chain（Hyperliquid）、stablecoin決済（Tempo）、L2（Base / OP-Reth）— Rethは「Stripe of crypto」型インフラの基盤になりつつあります。

> **要点**: stablecoinはDeFiの基軸通貨。stablecoinの決済rail（流通路）を押さえることは、将来のDeFiオンボーディングの道を拓くことでもあります。いまはStripe / Tempoが「ユーザーにcryptoを意識させない」抽象化でTradFiを取り込んでいますが、そのrailの上にlending・swap・perpsが乗ってくる構造が、これから数年の勝負どころ。Reth/Revmエンジニアは、その **rail側とprotocol側の両方を読み書きできる希少人材** です。

## 次の一歩

役割と相対的な価値が見えたところで、いよいよ **Rust環境を構築** していきましょう。`,
                },
                {
                  title: 'Solana / Anchor から Reth へ — 持ち越せるもの (Solana 経験が無ければスキップ)',
                  slug: 'solana-to-reth-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 20,
                  content: `# Solana / Anchor から Reth へ — 持ち越せるもの (Solana 経験が無ければスキップ)

> 📌 **対象。** 本レッスンは **Solana で ship した経験がある人向け** — Anchor プログラム、Jito MEV bot、Solana プログラムのテスト、Firedancer コントリビュータ、\`solana-program\` か \`anchor-lang\` を触ったことがある人。Solana を触ったことが無いなら、*Rust 環境を整える* に飛んでください。本レッスンに依存する後続レッスンはありません。

多くのカリキュラムは Solidity からの移行を前提にする。あなたはそうではなく、**根本的に違うランタイムモデル上の Rust** から来ている。本レッスンはその翻訳レイヤー。

## 1. 持ち越せるもの（実は多い）

Solana 側で築いた苦労した技は、**Rust EVM スタックでもすべて価値を保つ**:

| Solana 由来のスキル | こちらでの着地 |
| :--- | :--- |
| **Rust ownership / lifetimes / async** | 同じ。Solidity 移行者が必要とする「Rust オンボーディングの 3 週間」を skip できる |
| **低レベルシステムコードを読む力** | Reth と Revm は \`solana-program\` より密だが、*読む規律* は同じ — 外から内へ、trait の形を信じ、テストで検証する |
| **「自分が所有しないエンジン」のメンタルモデル** | Firedancer をパッチしたか Jito relayer のソースを読んだことがあるなら、Reth fork モデルは即座に読める |
| **並列実行への慣れ** | Sealevel が並行ステート操作を考えさせた。Reth の stage パイプラインは異なる関心事を並行で走らせる; 筋肉は移植可能 |
| **\`cargo\` ツールチェイン熟達** | 同じ。workspace、feature、macro デバッグの \`cargo expand\` — すべて |

率直な構図: **あなたの Rust スキルは大半の EVM 側エンジニアが持っていない資産**。本カリキュラムの厳しいセクション — *中級への橋渡し* の Rust モジュール — はあなたにとってほぼ復習。

## 2. 構造的に違うもの

実際に重要なモデルのギャップ:

| 概念 | Solana | Reth / EVM |
| :--- | :--- | :--- |
| **状態** | アカウント単位、事前宣言（account モデル） | コントラクト単位の storage、動的（slot キーの \`SLOAD\` / \`SSTORE\`） |
| **並列性** | アカウント単位、ランタイムスケジュール（Sealevel） | ブロック内は逐次; ExEx / Reth SDK で並列コンポーネントを追加可能 |
| **プログラム** | グローバルな 1 プログラム、アカウントを渡す | 各コントラクトが自分の bytecode と storage を持つ |
| **計算単位** | tx あたり線形のガス類似予算 | EVM ガス、opcode ごとに非自明なコストカーブ |
| **検証** | カスタム syscall 付き BPF VM | EOF + spec-tests 付き EVM |
| **ウォレット / 署名者** | 終始 Ed25519 | 主に secp256k1、最終的には account abstraction で post-quantum へ |

最大のメンタル反転: **storage はコントラクト単位、アカウント単位ではない**。Solana では状態を保持するアカウントを渡す; EVM では **コントラクトそのものが状態**。Inside Revm の \`Database\` トレイトに到達したら丁寧に読む — そのトレイトが「どの AccountInfo に触れるか」の EVM 側の答え。

> 🛑 **予測。** Solana プログラムでユーザごとのカウンタを更新するものを書いた。EVM での等価ストレージはどう見える? データはどこに住む?

コントラクト内部の \`mapping(address => uint256) counter\`。コントラクトが slot キーを所有する; 各ユーザのカウンタは \`keccak256(user_address . slot)\` にある。Solana ならユーザごとに 1 アカウント; EVM では全部 1 コントラクトの storage trie に詰める。同じ問題、違うモデル。

## 3. 2 つのスタックが交わる場所: HyperEVM、Tempo

これらのチェーンは **Solana スタイルのパフォーマンスを EVM セマンティクスに持ち込むため** に作られた。Solana 移行者にとって自然な着地点:

- **HyperEVM (Hyperliquid)**: HyperBFT コンセンサスの Reth fork。EVM bytecode を Solana エンジニアが期待するパフォーマンスレベルで execution layer が走らせる。HyperEVM を読むことは、Solana のパフォーマンス直感を EVM 領域に持ち込むこと — これが Inside Reth + L1 Architect tier が準備する内容そのもの。
- **Tempo**: Stripe バックの Reth ベース決済チェーン。高スループット stablecoin 送金向け設計。Solana の決済 rail 経験（Stripe の以前の Solana 統合が先行例）が直接翻訳できる。
- **MegaETH**: 別の Reth ベース高性能チェーン、Solana 風 UX を追求。

**Solana → Reth は格下げではない。** チェーン固有ランタイムから、次世代の高性能 L1 / L2 が build している実行エンジンへの移行。Rust EVM スタックはあなたのスキルが複利で効く場所。

## 4. 具体的な文化の違い: source-first vs abstraction-first

Solana エンジニアから一番多く聞く論点:

- **Anchor**: 重い抽象。フレームワークが SVM を隠し、シリアライズを隠し、account 検証を隠す。\`#[derive(Accounts)]\` を書いて信じる。何かが壊れたとき、実際の SVM 挙動への道のりは長い。
- **Firedancer / Jito**: source-first。C を読み、relayer を読み、パッチして再ビルドする。優れた文化、狭いアクセス（Firedancer のコントリビューション窓口は事実上閉じている; Jito はオープンだが Solana 固有）。
- **Reth / Revm / Foundry**: 設計上 source-first、かつ **広い** コントリビューションアクセス。メンテナが「これを読んでカスタムノードを ship」のパターンを明示的に公開している。これが RethLab が build されている規律。

Anchor の抽象が不透明に感じたなら、RethLab は home に感じる。Firedancer / Jito を楽しめたが応用範囲がもっと欲しかったなら、Rust EVM スタックがその拡大版。

## 5. あなた向けにマップしたカリキュラム

Rust 背景を踏まえて、skip / 加速できるレッスンの率直な推奨:

| セクション | 推奨 |
| :--- | :--- |
| **Beginner — *Rust 環境を整える*** | 流し読み。\`rustup\` は持っている |
| **Fundamentals — Rust async / traits / generics** | 流し読み。持っている |
| **Fundamentals — EVM 概念** | **丁寧に読む。** Solana モデルとの違いが現れる場所 |
| **中級への橋渡し — EVM をバイト単位で** | **丁寧に読む。** Dispatch loop、ガス、コールフレーム — 全部新しい |
| **中級への橋渡し — ソース読みのための Rust** | 流し読み。Generics、Arc、unsafe、macros — あなたにとっては復習 |
| **Inside Revm / Inside Reth / Inside Alloy** | **丁寧に読む。** ご褒美 |
| **L1 Architecture (Advanced) tier** | **来た理由。** 特に Consensus + Cross-Chain Bridges |
| **Expert + Building** | アウトプット。読んだことを応用 |

## 6. あなたが賭けているもの

Solana のランタイムは良いが Solana 固有。Reth は **多くのチェーンの基板** — Hyperliquid、Tempo、OP-Reth、MegaETH、Berachain — その数は増え続けている。Rust EVM スタックはあなたのスキルがより広い L1 / L2 表面で複利になる場所、1 つのチェーンだけではなく。

これは Solana への takedown ではない。**Reth を読めるエンジニアは Solana プログラムを読めるエンジニアより希少で、Reth に賭けているチェーンは急速に成長している** という観察。あなたの Solana 育ちの Rust 直感は、Solidity からの移行者の誰よりも早くその希少人材ニッチに着地させる。

## 次へ

*Rust 環境を整える* を skip して直接 *Fundamentals* に向かう（Rust ツールチェインは既に持っている）か、Foundry / Anvil をまだ見ていないなら *Rust 環境を整える* を流し読みするか、どちらでも先に進めます。
`,
                },
                {
                  title: 'Reth vs Geth / Alloy vs ethers-rs — 置き換えの根拠',
                  slug: 'substitution-case-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 10,
                  xpReward: 20,
                  content: `# Reth vs Geth / Alloy vs ethers-rs — 置き換えの根拠

プロジェクトを map に置いた。次に多い質問: **なぜチームは古い代替から能動的に移行しているのか?** Geth は 10 年間 Ethereum を走らせてきた。ethers-rs は何年もの間 Rust Ethereum ライブラリだった。それでも新インフラは Reth と Alloy 上に build されている。本レッスンはその理由を置き換えごとに示す。

## 1. Reth vs Geth

Geth (Go-Ethereum) は元祖 execution client。2015 年から mainnet を走らせ、execution client シェアの ~40〜50% を保ち、背後のチームは優秀。**Reth は「より良い Geth」ではない。** Geth が構造的にできないことで居場所を稼ぐ、異なる設計。

| 性質 | Geth | Reth | なぜ重要か |
| :--- | :--- | :--- | :--- |
| **言語** | Go | Rust | Cargo workspace で revm をライブラリとしてインポートして単独使用できる — Geth の execution engine はノードに溶接されていて再利用不可 |
| **アーキテクチャ** | 強結合 | モジュラ crate (revm、alloy、reth-stages、reth-network、reth-rpc など) | ノード全体を fork せず *1 つの* crate（例: カスタム executor）を fork できる — App-chain / L1 fork パターンの中核 |
| **State storage** | LevelDB ベース、進化中 | MDBX (memory-mapped B+tree) | 重い compaction 下でも読み取りレイテンシが安定。Geth は歴史的に archive node の compaction stall に苦戦 |
| **Execution engine** | go-ethereum のインタープリター | revm (Rust、ライブラリ first) | revm は Foundry、Hyperliquid の HyperEVM、全 Rust ベース MEV stack に再利用されている — Geth のインタープリターは Geth 自身以外に消費者がない |
| **同期戦略** | Snap sync | Staged sync (10 ステージパイプライン) | Staged sync は I/O をバッチ全体で償却; 初期同期が速く、カスタムステージで拡張しやすい |
| **拡張 API** | 公的にメンテされた仕組み無し | ExEx (Execution Extensions) — インプロセス Rust hook | ノード *内側で* ノード速度のインデクサ・MEV ボット・リスクエンジンを build、RPC ラウンドトリップなし。Geth に等価なし |
| **Chain fork** | 困難 (Geth 全体の fork) | 容易 (Reth SDK: 1 コンポーネント差し替え、残り保持) | Hyperliquid の HyperEVM、Tempo、MegaETH、Base (OP-Reth)、Berachain は全部このパターンを使う |
| **再利用フットプリント** | Geth のコードは Geth が使う | Reth のコンポーネント (revm、alloy、reth-* crate) は 100+ プロジェクトに再利用されている | 触れる全 Rust EVM ツールはこれらの crate の上に build されている |

> 🛑 **予測。** あるチームが独自トランザクション順序付けの payments-priority L1 を ship したい。どのクライアントを fork するか?

Reth を fork する — しかも全体は fork すらしない。Reth の crate に依存して \`Pool\` と \`Payload\` コンポーネントだけ差し替える。Geth なら全コードベースを fork し、永遠の rebase 税を受け入れ、メンテしたくない 200K 行表面を継承する。これがまさに Tempo がやっていることで、前レッスンの表の他の全 Reth ベース L1 がやっていること。

**Reth は Geth を退位させるために build されたのではない。** 次世代のチェーンが build する *substrate* になるために build された。それは別カテゴリ。

## 2. Alloy vs ethers-rs

ethers-rs は ~2020 から 2024 にかけて *the* Rust Ethereum ライブラリだった。そして 2024 年半ばに ethers-rs のメンテナ (Georgios Konstantopoulos / Paradigm) が **Alloy 移行に伴い deprecate**。移行は段階的でも美的理由でもなく — ethers-rs が構造的に届かない特定の性質を狙った意図的な再設計。

| 性質 | ethers-rs | Alloy | なぜ重要か |
| :--- | :--- | :--- | :--- |
| **モジュラリティ** | モノリシック crate | 多くの小 crate (alloy-provider、alloy-network、alloy-primitives、alloy-signer、alloy-rpc-types、...) | 必要なものだけ pull-in; Cargo 膨張が劇的に縮む |
| **Async スタイル** | \`async-trait\`（呼び出しごとに Box 確保） | ネイティブ async trait + ProviderCall (zero-cost) | Hot path (MEV、RPC サーバ) は呼び出しごとの確保なしから測定可能に恩恵 |
| **マルチチェーン** | Ethereum 専用型 | \`Network\` トレイトがチェーンプリミティブを抽象化 | 同じ Provider コードが Ethereum、Optimism、カスタム L2 で動く — Inside Alloy で歩く |
| **型エルゴノミクス** | 独自型、revm と分離 | revm の \`Address\`、\`U256\`、\`B256\` を直接使う | alloy + revm + reth で 1 セットの型。変換ボイラープレート無し |
| **Wallet / signer 合成性** | 1 つの Provider 設計に結合 | \`Signer\` + \`Filler\` トレイトが \`ProviderBuilder\` 経由で合成 | カスタム署名、nonce 管理、ガス推定をクリーンに重ねる。Inside Alloy の Signer チェーンで教える |
| **手続きマクロ (\`sol!\`)** | 外部 crate、結合は緩い | first-class、alloy 全体で使われる | Solidity 型を Rust でコンパイル時に定義; 手書き ABI struct 無し。全 Rust Solidity 連携プロジェクトで使われる |
| **メンテナンス** | Paradigm の 1 人、時間制限あり | 出資を受けた Paradigm プロジェクト + コミュニティ | 活発な開発、速い PR turnaround、明確な roadmap |

> 🛑 **予測。** 2026 年に新 MEV searcher を書く。なぜ ethers-rs ではなく Alloy を選ぶか?

Alloy を選ぶ理由は (a) revm と型を共有する（fork simulation は revm に住む）、(b) クラウド KMS かハードウェアで独自 \`Signer\` を Provider 書き換えなしで合成できる、(c) 1 つの型パラメータ変更でコードが Optimism / Base / 任意の Reth ベース L2 で動く、(d) ethers-rs はもう Paradigm からバグ修正を受けない。**惰性が ethers-rs に居続ける唯一の理由**、そして惰性は四半期ごとに弱くなる。

## 3. 両置き換えに共通するパターン

Geth と ethers-rs は悪くない。「N の下流プロジェクトをまたいで合成可能にする」より「動くようにする」が優先だった、Rust EVM エコシステムの早期の瞬間の産物。

**Reth と Alloy は意図的設計の選択を共有: 完全性より合成性。** どちらも内部ピースをライブラリ crate として露出し、下流プロジェクトが混ぜ、合わせ、置き換えできる。Geth と ethers-rs は消費される製品として設計された; Reth と Alloy は拡張される基盤として設計された。

これがこのカリキュラム残りが存在する構造的理由。**次に来るレッスン — Inside Revm、Inside Reth、Inside Alloy — は基盤を読むスキルを教える。** 読めれば build できる。それが Geth と ethers-rs が構造的に提供できなかった leverage。

> 🛑 **リコールチェック。** 各々を一文で:
> - なぜ payments-priority L1 チームは Reth を fork し、Geth ではないのか?
> - 2026 年の新 MEV searcher はなぜ Alloy を ethers-rs より選ぶのか?

スクロールせずに両方答えられたら、置き換えモデルを持っている。できなければ該当の表を読み直す。

## 次へ

次のレッスンは stack 全体をもう 1 度 reframe する — チェーン単位ではなく **systems engineering** として: データベース、分散システム、コンパイラ、ネットワーキング、OS スタイルの並行性。それを終えるとオリエンテーションモジュールが完了、Rust をセットアップしてソース読みを始める準備が整う。
`,
                },
                {
                  title: 'Ethereum を systems engineering として読む — 必要なメンタルモデル',
                  slug: 'ethereum-as-systems-engineering-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 12,
                  xpReward: 25,
                  content: `# Ethereum を systems engineering として読む — 必要なメンタルモデル

ほとんどの Ethereum 入門は Ethereum を **それ自身のもの** として扱う: ブロックチェーンの魔法、特別なプリミティブ、crypto 固有用語の並行宇宙。その枠は dapp チュートリアルには役立つ。Reth、Revm、Alloy のソースを読むには貧弱な枠。

**このカリキュラムを実際に通せる枠**: Ethereum は **データベース + 分散システム + コンパイラ + ネットワーキングスタック + OS スタイル並行ランタイム**、コンセンサスで接着されたもの。各ピースは数十年の文献を持つ既知の systems-engineering 問題。「ブロックチェーン」部分は接着剤であって実質ではない。

本レッスンは持って歩く必要のあるメンタルモデル。1 度読めば、続く全 Reth / Revm / Alloy レッスンが既知のものに着地する。

## 1. 5 つのサブシステム

Reth のソースツリーは 5 つの systems-engineering 分野にきれいに分解できる:

| サブシステム | 何か | Reth でどこに | Ethereum 外の類推 |
| :--- | :--- | :--- | :--- |
| **データベース** | スナップショット、MVCC、クラッシュリカバリ付き永続 key-value store | \`reth-mdbx\` + \`reth-db\` (MDBX、メモリマップド B+tree) | PostgreSQL のストレージ層、RocksDB、LMDB |
| **分散システム** | 部分故障下で合意に達する多ノード state machine | Consensus 統合、P2P state 同期、gossip | Raft、Paxos、Bitcoin の最長 chain、Cassandra |
| **コンパイラ / VM** | バイトコードインタープリター; やがて JIT/AOT コンパイラ | revm (インタープリター)、revmc (JIT/AOT) | JVM、V8、CPython、LuaJIT |
| **ネットワーキングスタック** | peer スコアリングと DoS 耐性付きの独自 TCP ベース gossip プロトコル | \`reth-network\` (devp2p)、代替チェーンでは libp2p | BGP、BitTorrent の tracker 層、IRC |
| **並行ランタイム** | Async I/O オーケストレーション; 数千の in-flight task | Tokio (協調スケジュールされる future) | Node.js のイベントループ、Go の goroutine、Erlang の BEAM |

> 🛑 **スクロール前に予測。** 任意の会社で本番で見たバグクラスを 1 つ選ぶ: 競合状態、データベースデッドロック、TCP backpressure、JIT mis-compile。**それはどの Ethereum サブシステムで起こりうるか?**

全部起こりうるし、実際に全部起きてきた。Reth の CI はデータベース compaction stall（データベース問題）、reorg 処理の race（分散システム問題）、opcode 価格バグ（コンパイラ問題）、peer-eclipse 攻撃（ネットワーキング問題）、負荷下での task starvation（並行ランタイム問題）を捕まえる。**バグクラスは Ethereum 固有ではない。** 見つけて直す技法も Ethereum 固有ではない。

## 2. なぜソース読みでこれが重要か

\`reth-mdbx\` を開いて「copy-on-write ページと MVCC スナップショット付き B+tree」を見たとき、**50 年の文献を背後に持つデータベース設計選択** として認識すべき。「Ethereum が state を奇妙な方法で保存している」ではない。MDBX が Reth にいるのは、SQLite が類似設計を使うのと同じ理由をエンジニアリングチームが選んだから: 重い書き込み負荷下での安定読み取りレイテンシ、クラッシュ安全性、組み込み用途。

revm を開いて 256 スロット関数ポインタテーブル経由でディスパッチするスタックベースインタープリターを見たとき、**1980 年代 CPython と 1990 年代 JVM 文献由来の仮想マシン設計選択** として認識すべき。「EVM の奇妙さ」ではない。ディスパッチループが素朴 \`match\` より速いのは、1990 年以降に build された全インタープリターが何らかの形の computed-goto または関数ポインタテーブルを使うのと同じ理由。

\`reth-network\` を開いて「悪い挙動で eviction する peer scoring」を見たとき、**BGP 時代の分散システムパターン** として認識すべき。「Ethereum 固有の anti-DoS」ではない。

reframe はあちこちで報われる。続くレッスンは「これは reorg に適用された OS スケジューリング理論」と声に出して言わない — だがあなたがこの枠を持っている前提で書かれている。

## 3. 複利で増えるスキル

Ethereum がよく研究されたシステムの合成だからこそ、ここで build するスキルは **業界横断で複利**:

| Reth を読んで build するスキル | 他にどこで効くか |
| :--- | :--- |
| MDBX / B+tree ストレージ設計 | 任意のデータベースエンジニアリング職 (Snowflake、PlanetScale、Neon、MongoDB) |
| Tokio async + backpressure | 全 Rust ネットワーキングプロジェクト (Cloudflare、Discord、AWS 内部サービス、Linkerd) |
| revm インタープリターループ | 任意の VM / 言語ランタイム作業 (TigerBeetle、独自 DSL、EVM 以外のスマートコントラクト VM) |
| Reorg 周りの分散システム推論 | データベースレプリケーション、コンセンサスエンジニアリング、payment-rail 設計 |
| プロファイリング、flamegraph、cache locality | 任意の高スループット企業の性能エンジニアリング |

Solidity しか読めない「Ethereum エンジニア」は狭い市場を持つ。Ethereum に専門化することになった systems エンジニアは *systems エンジニアリングの全求人市場* を fallback として持ち — その上に Ethereum 専門家プレミアムが乗る。

> 🛑 **予測。** 友人が「Ethereum が伸びなかった場合、Reth を学ぶことは何を買ってくれるのか?」と聞く。30 秒の答えをスケッチする。

おおよそ: 「MDBX、Tokio、本物の分散システムに対して ship した Rust 流暢な systems エンジニアは、広い業界の全インフラエンジニアリング職を fallback として持つ — TigerBeetle、Cloudflare、Discord、PlanetScale、Neon、全クラウドデータベースチーム。Ethereum 固有知識は upside; 基礎スキルが floor。」

これが Reth への賭けが本当は Ethereum への賭けではない理由。**systems engineering を分野として** の賭け — Ethereum は特に面白く儲かる応用表面。

## 4. 拒否すべき「魔法」

遭遇したら能動的に *押し戻す* べき枠:

- **「スマートコントラクトは特別」** — 違う。VM 上で走るプログラム。VM がたまたま決定的でガス計測される。頭の中で「スマートコントラクト」を「プログラム」に置き換える; レッスンがより clear に読める
- **「state は特別」** — 違う。スナップショット付き key-value store。頭の中で「state」を「データベース」に置き換える
- **「コンセンサスは特別」** — 違う。40 年以上研究されたよく知られたトレードオフ（latency vs liveness vs throughput）のアルゴリズム。頭の中で「コンセンサス」を「ノードが合意するために使うプロトコル」に置き換える
- **「ガスは特別」** — 違う。計測付きリソース予算。頭の中で「ガス」を「CPU とメモリ計測」に置き換える

続くレッスンはこれら置換を済ませた前提で書かれている。「EVM」「state」「コンセンサス」を使うのは文献がそうしているから — だがそれらを **一般的 systems-engineering 問題のインスタンス** として扱い、魔法的 Ethereum 固有現象としては扱わない。

## オリエンテーション完了

Module 0 — *Why the Rust Ethereum Stack* — はこれで完了。Reth、Revm、Alloy を map に置き、なぜチームが Geth と ethers-rs から置き換えるかを理解し、Solidity / Solana スキルがどう持ち越せるかを考え、最後に stack 全体を systems engineering として reframe した。

次のモジュールは Rust をインストールしハンズオン部分を始める。続いて Fundamentals、中級への橋渡し、ソース読み tier — そこでこのレッスンの枠は抽象でなくなり、読む全ファイルで報われ始める。
`,
                },
              ],
            },
          },
          {
            title: 'Rust環境を整える',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'rustupとVS Codeの準備',
                  slug: 'setup-rust-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 15,
                  content: `# rustupとVS Codeの準備

Rustの開発環境は、実は **rustup と VS Code 拡張だけ** で完結します。

## 1. rustupでRustを入れる

公式ツールチェーン管理ツール **rustup** からインストールします。

\`\`\`bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 動作確認
rustc --version
cargo --version
\`\`\`

\`cargo\` は **Rustのパッケージマネージャー＋ビルドツール** です。npmやcargoという名前から「ライブラリを管理するもの」と思いがちですが、実際は **ビルドもテストも実行もすべてcargoでやる** ので、毎日触ることになります。

## 2. VS Codeに rust-analyzer を入れる

VS Code拡張機能の検索で \`rust-analyzer\` をインストールしてください。これがないとRust開発は事実上不可能です。

- リアルタイムで型エラーを表示
- 自動補完・「ジャンプ・トゥ・デファイン」
- インライン型注釈（変数の上に型が表示される）

> **コツ**: \`Cargo.toml\` を持つフォルダを開かないと rust-analyzer は起動しません。次のステップで作ります。

## 3. はじめてのプロジェクトを作る

\`\`\`bash
cargo new hello_reth
cd hello_reth
cargo run
\`\`\`

\`cargo run\` で「\`Hello, world!\`」が表示されれば準備完了です。

## 4. ブラウザですぐ試したい時

何かインストールせずに試したいときは [Rust Playground](https://play.rust-lang.org/) を使えます。コピペで実行できる便利な環境です。

次のレッスンでは、Rust構文の最小限を駆け足で押さえてから、宿題に挑戦します。`,
                },
                {
                  title: 'Rustクイックリファレンス',
                  slug: 'rust-quick-reference-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 20,
                  content: `# Rustクイックリファレンス

これから書くコードに登場するRust構文を一気に押さえます。「Rustを学ぶ」ためのコースは別にありますが、**Reth/Revm/Alloyを学ぶうちにRustも自然と身につく** ように、必要なところで都度説明します。

## 1. 変数：\`let\` と \`let mut\`

Rustの変数はデフォルトで **不変（immutable）** です。書き換えたいときは \`mut\` を付けます。

\`\`\`rust
let x = 10;        // 不変
// x = 11;        // コンパイルエラー！

let mut y = 10;    // 可変
y = 11;            // OK
\`\`\`

## 2. 基本データ型

| 型 | 意味 |
| :--- | :--- |
| \`i32\`, \`i64\` | 符号付き整数 |
| \`u32\`, \`u64\`, \`u128\` | 符号なし整数 |
| \`bool\` | true / false |
| \`&str\` | **借用された文字列**（読み取り専用、軽い） |
| \`String\` | **所有された文字列**（書き換え可能、ヒープ） |

> 「\`&str\` と \`String\` の違い」は最初みんな混乱します。今は **「\`&str\` は他人の家を覗く感じ、\`String\` は自分の家を持つ感じ」** とだけ覚えておけば十分です。所有権は次のティアで詳しく扱います。

## 3. 関数

\`\`\`rust
fn add(a: i64, b: i64) -> i64 {
    a + b   // 末尾にセミコロンを付けないと「式」として返り値になる
}
\`\`\`

- 引数は \`名前: 型\`
- 返り値は \`-> 型\`
- 最後の式（セミコロンなし）が暗黙の return

## 4. メソッドの呼び方

Rustの値はメソッドを持っています。例：

\`\`\`rust
let s = "0x123";
s.starts_with("0x");  // true / false
s.len();              // 5
"hello".to_uppercase(); // "HELLO"
\`\`\`

## 5. 条件分岐：\`if\` / \`else\`

\`\`\`rust
let n = 7;
if n % 2 == 0 {
    println!("even");
} else {
    println!("odd");
}
\`\`\`

\`if\` 自体が「式」なので、値を返すこともできます：

\`\`\`rust
let parity = if n % 2 == 0 { "even" } else { "odd" };
\`\`\`

## 6. 表示：\`println!\`

\`!\` が付いているのは **マクロ** だからです（関数ではない）。\`{}\` がプレースホルダー。

\`\`\`rust
let name = "Alloy";
println!("Hello, {}!", name);          // Hello, Alloy!
println!("{} + {} = {}", 1, 2, 1 + 2); // 1 + 2 = 3
\`\`\`

## 7. コレクション：\`Vec\`

可変長の配列です。スマートコントラクトのスタックや、トランザクションのリストなど、Rust EVMコードで頻出します。

\`\`\`rust
let mut v: Vec<i64> = Vec::new();
v.push(10);
v.push(20);
let last = v.pop();   // Some(20)
println!("{:?}", v);  // [10]
\`\`\`

\`{:?}\` は **デバッグ表示** 用のプレースホルダーです。

## 8. これだけ覚えればOK

ここまでが Reth/Revm/Alloy の最初のコードを読み解くのに必要な「最小限の Rust」です。次の宿題でこれらをすべて使います。

| 構文 | 一言 |
| :--- | :--- |
| \`let x = ...\` | 不変な変数 |
| \`let mut x = ...\` | 可変な変数 |
| \`fn name(arg: T) -> R {}\` | 関数定義 |
| \`x.method()\` | メソッド呼び出し |
| \`if .. else ..\` | 条件分岐（式としても使える） |
| \`println!("{}", x)\` | 表示 |
| \`Vec<T>\` | 可変長配列 |

> 完璧に覚えなくて大丈夫です。**書きながら少しずつ思い出す** のが正解。`,
                },
                {
                  title: '小さな宿題：0xチェック',
                  slug: 'first-homework-ja',
                  type: 'QUIZ',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 25,
                  content: `# 小さな宿題：0xチェック

最初の課題はとてもシンプルです。

> 文字列として与えられたEthereumアドレスが、\`0x\` から始まっているかをチェックして、正しい／不正のメッセージを表示する。発展：長さも 42 文字かを確認する。

## 必要な要素

これがあなたの「Rust EVMスタック流」初のRustプログラムになります。Rustプログラム全般で使う3つの基本要素：

1. **変数** — \`let\` と \`let mut\`（前回扱いました）
2. **メソッド** — Rust の文字列には組み込みメソッドがあり、ある文字列が別の文字列で始まるかをチェックするものもあります。**stdドキュメントから探してみてください**：[\`&str\` ドキュメント](https://doc.rust-lang.org/std/primitive.str.html)
3. **条件分岐** — \`if\` / \`else\`

Ethereum アドレスの **長さ** も把握しておく必要があります。分からなければ調べてみてください（ヒント：40 hex 文字 + \`0x\` プレフィックス）。

## 自分で書いてみる

[Rust Playground](https://play.rust-lang.org/) を開き、次のシグネチャで関数を書いてください：

\`\`\`rust
fn is_valid_address(addr: &str) -> bool {
    // ここを書く
}
\`\`\`

下記でテスト：

\`\`\`rust
fn main() {
    println!("{}", is_valid_address("0x1234567890abcdef1234567890abcdef12345678")); // true
    println!("{}", is_valid_address("1234567890abcdef1234567890abcdef12345678"));   // false
}
\`\`\`

詰まったときの軽いヒント：

- \`addr.\`〜 — \`&str\` のメソッドの中に、名前のとおりに動くものがあります
- \`addr.len()\` で文字列のバイト長が取れる
- 2つの条件は \`&&\` でつなぐ

**自分で書いてみる前に答えを見ないでください**。Rust の真価は「コンパイラが教えてくれる」こと。コンパイラに教わってください。

## クイズ

自分なりのコードを書いて動かしたら、下のクイズへ。各問は具体的なRustの慣用表現を問います — 自分で書いた経験があれば全問解けるはずです。`,
                  quizQuestions: [
                    {
                      question: '文字列 `address` が `"0x"` で始まっているかをチェックする Rust の式として正しいのは？',
                      options: [
                        '`address.has_prefix("0x")`',
                        '`address.starts_with("0x")`',
                        '`address.contains("0x")`',
                        '`address[0..2] == "0x"`',
                      ],
                      correctIndex: 1,
                      explanation: '`starts_with` が標準の `&str` メソッドです。`has_prefix` は存在しません。`contains` は文字列のどこかに含まれていれば true を返すので、「先頭」かどうかのチェックにはなりません。`&str` を直接スライスする方法は、UTF-8 の文字境界でないとパニックするため、汎用的なチェックには危険です。',
                    },
                    {
                      question: 'Ethereum アドレス文字列の完全な妥当性チェックに必要なのは？',
                      options: [
                        '`0x` プレフィックスの確認だけ',
                        '`0x` プレフィックス + 文字数 42 + プレフィックス以降がすべて hex 数字',
                        '40 文字 + すべて hex 数字',
                        '不要 — `&str` ではなく `Address` 型で受ければよい',
                      ],
                      correctIndex: 1,
                      explanation: 'Ethereum アドレスは 40 hex 桁（20 バイト）+ `0x` プレフィックスで合計 42 文字。3 つすべてを確認することで、不正な入力を弾けます。本番の Rust EVM コードでは `address.parse::<Address>()` で Alloy にパースを任せるのが一般的です。',
                    },
                    {
                      question: 'Rust で `if condition { a } else { b }` を「式」として使えるのはなぜ重要？',
                      options: [
                        'Rust には三項演算子（`?:`）が無いので、これが条件付きの値を表現する標準手段だから',
                        '`match` より速いから',
                        'セミコロンを書かずに済むから',
                        'borrow checker のために必須だから',
                      ],
                      correctIndex: 0,
                      explanation: 'Rust は意図的に三項演算子を持たせていません。代わりに `if/else` 自体が値を返す式なので、`let x = if cond { a } else { b };` と書けます。言語を小さく、文法を一様に保つための設計判断です。',
                    },
                    {
                      question: 'Alloy の `address!("0x...")` マクロが、ランタイムでパースする方法より優れている点は？',
                      options: [
                        'ランタイムで高速になる',
                        'コンパイル時にアドレスリテラルを検証するため、不正なアドレスはコンパイルが通らない',
                        'Solidity ABI 互換性のために必須',
                        'ABI バイト列を自動でエンコードする',
                      ],
                      correctIndex: 1,
                      explanation: '`address!` はコンパイラ内で動くマクロで、コンパイル時に hex 数字と長さを検証します。1 桁でもタイポがあればビルドが通りません — ユーザーがボタンを押した瞬間にランタイムエラーが出るより、はるかに安全です。',
                    },
                    {
                      question: '`let mut x = 5;` と `let x = 5;` の違いは？',
                      options: [
                        '`mut` の方がアクセスが速い',
                        '`mut` が無いと再代入できない（`x = 6` はコンパイルエラー）',
                        '`mut` が無いと `let x = ...` でのシャドーイングができない',
                        '機能的な違いはない',
                      ],
                      correctIndex: 1,
                      explanation: 'Rust の変数はデフォルトで不変で、`mut` が再代入を許可します。シャドーイング（別の `let` で同名変数を再宣言）は `mut` とは独立した仕組みで、不変変数でもシャドーイングできます。',
                    },
                  ],
                },
                {
                  title: '初級まとめクイズ',
                  slug: 'beginner-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 25,
                  content: `# 初級まとめクイズ

Reth・Revm・Alloyの役割と立ち位置を理解できたかチェックします。`,
                  quizQuestions: [
                    {
                      question: 'Reth、Revm、Alloyの役割の組み合わせとして正しいものは？',
                      options: [
                        'Reth=ライブラリ群、Revm=ノード、Alloy=実行エンジン',
                        'Reth=ノード、Revm=実行エンジン、Alloy=ライブラリ群（型・RPC・署名）',
                        'Reth=実行エンジン、Revm=ノード、Alloy=ウォレット',
                        '3つは全て同じプロジェクトの別名',
                      ],
                      correctIndex: 1,
                      explanation: 'Rethは完成品（フルノード）、Revmは実行エンジン（EVM本体）、Alloyは型やRPC、署名などの基盤ライブラリ群です。',
                    },
                    {
                      question: 'なぜRevmが Foundry や Hyperliquid に選ばれているのでしょうか？',
                      options: [
                        '世界唯一のRust製EVMだから',
                        'モジュラーなライブラリとして設計され、カスタマイズしやすく性能が高いから',
                        'Solidityがコンパイル不要で動くから',
                        '無料で使えるEVMはRevmだけだから',
                      ],
                      correctIndex: 1,
                      explanation: 'Revmは「部品として使える」設計と、Rustによる高速さと安全性を兼ね備えているため、Foundry・OP-Reth・zkVM・Hyperliquidなど幅広く採用されています。',
                    },
                    {
                      question: 'このコースで推奨される学習の順番は？',
                      options: [
                        'Reth → Revm → Alloy（マクロからミクロへ）',
                        'Alloy → Revm → Reth（ミクロからマクロへ）',
                        'Revm → Alloy → Reth',
                        '好きなところから自由に',
                      ],
                      correctIndex: 1,
                      explanation: 'まず型とRPC（Alloy）→ 実行エンジン（Revm）→ ノード全体（Reth）と進むのが、最も挫折しにくい順番です。',
                    },
                    {
                      question: 'Rustの開発環境で「これがないと事実上書けない」と紹介されたVS Code拡張は？',
                      options: [
                        'Rust Helper',
                        'rust-analyzer',
                        'cargo-vscode',
                        'Rustacean',
                      ],
                      correctIndex: 1,
                      explanation: 'rust-analyzerは公式の言語サーバーで、エラー表示・補完・型情報・ジャンプ等を提供します。',
                    },
                    {
                      question: 'Solanaと比較したとき、Reth系（Rust EVM）の主な「実利」として正しくないものは？',
                      options: [
                        'EVMエコシステムの既存資産（ウォレット、ツール）をそのまま流用できる',
                        'インフラ層をアプリ向けに最適化（カスタマイズ）できる',
                        'コンセンサスを書かずに済むので、Solanaより常に高速になる',
                        'EVM互換チェーン全体に知識を応用しやすい',
                      ],
                      correctIndex: 2,
                      explanation: '「常に高速」は誤りです。純粋なTPSではSolanaが優位な場面が多く、Reth系の利点は「カスタマイズ性」「既存資産」「Rustによる安全性」です。',
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  });
}
