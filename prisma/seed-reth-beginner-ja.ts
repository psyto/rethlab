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
                  sortOrder: 2,
                  duration: 10,
                  xpReward: 20,
                  content: `# なぜReth・Revm・Alloyを学ぶのか

> 🧭 **このレッスンの位置づけ:** Rust × Ethereum スタック全体を一望する地図 — どのプロジェクト（Reth・Revm・Alloy・Foundry）がどの層を担当しているかを掴むことで、以降のレッスンが頭の中で居場所を持って収まる。

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
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 20,
                  content: `# Reth・Revm・Alloyの三つ巴

> 🧭 **このレッスンの位置づけ:** Rust EVM スタックの 3 本柱とそれぞれの役割分担を導入する。ネットワーク層・VM 層・ツール層に分かれる以降のレッスンが、ここで引いた線を前提に進む。

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
                  sortOrder: 4,
                  duration: 8,
                  xpReward: 15,
                  content: `# なぜSolanaではなくEthereum（Rust）なのか

> 🧭 **このレッスンの位置づけ:** Solana との対比で、*Ethereum がどんな種類のシステムか* をはっきりさせる。以降に出てくる「なぜ X はこういう作りなのか?」という問いすべての暗黙の前提を、ここで整える。

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
                  sortOrder: 5,
                  duration: 12,
                  xpReward: 20,
                  content: `# Solana / Anchor から Reth へ — 持ち越せるもの (Solana 経験が無ければスキップ)

> 🧭 **このレッスンの位置づけ:** Solana / Anchor の経験から、何が引き継げて何が引き継げないかを概観する。分散システムの勘を別の場所で積んできた読者向けの、通り抜け用ガイド。

> 📌 **対象。** 本レッスンは **Solana で ship した経験がある人向け** — Anchor プログラム、Jito MEV bot、Solana プログラムのテスト、Firedancer コントリビュータ、\`solana-program\` か \`anchor-lang\` を触ったことがある人。Solana を触ったことが無いなら、*Rust 環境を整える* に飛んでください。本レッスンに依存する後続レッスンはありません。

多くのカリキュラムは Solidity からの移行を前提にしますが、あなたはそうではなく、**まったく違うランタイムモデルの上で Rust を書いてきた** 立場です。本レッスンは、その経験を Reth 側に翻訳するレイヤーです。

## 1. 持ち越せるもの（実はかなり多い）

Solana で苦労して身につけたスキルは、**Rust EVM スタックでも価値をそのまま保ちます**。

| Solana で身についたスキル | こちらでの着地 |
| :--- | :--- |
| **Rust の所有権 / ライフタイム / 非同期** | 同じです。Solidity から来た人が必要とする「Rust への 3 週間」を、あなたは飛ばせます。 |
| **低レベルシステムコードを読む筋力** | Reth と Revm は \`solana-program\` より密ですが、*読み方の作法* は同じ — 外から内へ、トレイトの形を信じて、テストで答え合わせ。 |
| **「自分が所有しないエンジン」を扱う感覚** | Firedancer にパッチを当てたり Jito の relayer を読んだ経験があれば、Reth の fork モデルはすぐ読めます。 |
| **並列実行への馴染み** | Sealevel が並行な状態操作を考えさせてくれた経験は、Reth の stage パイプラインが関心事を並行に走らせる場面でそのまま効きます。 |
| **\`cargo\` 周辺の手の速さ** | 同じです。workspace、feature、マクロデバッグの \`cargo expand\` — 全部そのまま。 |

率直に書くと、**あなたの Rust スキルは EVM 側のエンジニアの大半が持っていない資産** です。このカリキュラムでいちばん重い *中級への橋渡し* の Rust モジュールは、あなたにとってほぼ復習になります。

## 2. 構造的に違うところ

逆に、ここはモデルが本当に違う、という点です。

| 概念 | Solana | Reth / EVM |
| :--- | :--- | :--- |
| **状態** | アカウント単位で事前宣言 (account モデル) | コントラクト単位のストレージ、slot キーの \`SLOAD\` / \`SSTORE\` で動的に |
| **並列性** | アカウント単位、ランタイムがスケジュール (Sealevel) | ブロック内は逐次。ExEx / Reth SDK で並列コンポーネントを後付けできる |
| **プログラム** | グローバルな 1 つのプログラムにアカウントを渡す | 各コントラクトが自分のバイトコードとストレージを持つ |
| **計算予算** | tx あたり線形なガス類似の予算 | EVM ガス、opcode ごとに非自明なコストカーブ |
| **検証** | カスタム syscall を持つ BPF VM | EOF + execution spec tests を持つ EVM |
| **署名者** | 最初から最後まで Ed25519 | 基本は secp256k1、将来は account abstraction で耐量子へ |

いちばん大きな発想の反転は、**ストレージがコントラクト単位であって、アカウント単位ではない** こと。Solana では状態を持つアカウントを渡しますが、EVM では **コントラクト自身が状態** です。Inside Revm の \`Database\` トレイトに到達したら丁寧に読んでください — そのトレイトが「どの AccountInfo に触れるか」に対する EVM 側の答えです。

たとえば、ユーザごとにカウンタを更新する Solana プログラムを書いたことがあるなら、EVM での等価形はコントラクト内部の \`mapping(address => uint256) counter\` です。コントラクトが slot キーを所有し、各ユーザのカウンタは \`keccak256(user_address . slot)\` に置かれます。Solana ならユーザごとに 1 アカウント、EVM なら全員ぶんを 1 コントラクトのストレージ trie に詰める — 同じ問題に対して、違うモデルでの解です。

## 3. 2 つのスタックが交わる場所 — HyperEVM、Tempo

次のチェーンは **Solana 流の性能を EVM のセマンティクスに持ち込むため** に作られています。Solana から移ってきたあなたにとって、自然な着地点です。

- **HyperEVM (Hyperliquid)**: HyperBFT コンセンサスを持つ Reth fork。EVM バイトコードを、Solana 出身者が期待する性能水準で execution layer が走らせます。HyperEVM を読むことは、あなたの Solana 由来の性能感覚を EVM 側に持ち込むことです — これが Inside Reth + L1 Architect tier の準備内容です。
- **Tempo**: Stripe が支える Reth ベースの決済チェーン。高スループットのステーブルコイン送金向けに設計されています。Solana の決済 rail 経験（Stripe が以前 Solana に統合していたのが前例）が、ほぼ翻訳なしで活きます。
- **MegaETH**: もうひとつの Reth ベース高性能チェーン。Solana 風の UX を狙っています。

**Solana → Reth は格下げではありません。** チェーン専用のランタイムから、次世代の高性能 L1 / L2 が乗ろうとしている実行エンジンへの移籍です。Rust EVM スタックは、あなたのスキルが複利で効く場所です。

## 4. 具体的な文化の違い — source-first か abstraction-first か

Solana 出身者からよく聞く論点はここです。

- **Anchor**: 抽象が厚い。フレームワークが SVM を隠し、シリアライズを隠し、アカウント検証を隠します。\`#[derive(Accounts)]\` と書いて信じることが多い。何かが壊れたとき、本物の SVM 挙動までたどり着くのに時間がかかります。
- **Firedancer / Jito**: source-first。C を読み、relayer を読み、パッチを当てて再ビルドする。文化は素晴らしいけれど、参加できる範囲が狭い（Firedancer のコントリビューション窓口は事実上閉じていて、Jito はオープンだが Solana 専用）。
- **Reth / Revm / Foundry**: 設計の段階から source-first、しかも **開かれた** コントリビューション窓口を持っています。メンテナ自身が「ここを読んでカスタムノードを ship してください」というパターンを明示的に提示してきます。RethLab はこの文化の上に組まれています。

Anchor の抽象が不透明に感じていた人にとって、RethLab はホームのように感じるはずです。Firedancer / Jito が楽しかったけれど応用範囲がもっと欲しかった人にとって、Rust EVM スタックはその拡大版です。

## 5. あなた向けに地図を引き直すと

Rust の素地を踏まえて、流し読み・じっくり読みの目安は以下の通りです。

| セクション | 読み方の目安 |
| :--- | :--- |
| **Beginner — *Rust 環境を整える*** | 流し読み。\`rustup\` はすでに入っているはず。 |
| **Fundamentals — Rust 非同期 / トレイト / ジェネリクス** | 流し読み。これは持っている。 |
| **Fundamentals — EVM 概念** | **じっくり読む。** Solana モデルとの差が現れる場所。 |
| **中級への橋渡し — EVM をバイト単位で** | **じっくり読む。** dispatch loop、ガス、call frame — 全部新しい。 |
| **中級への橋渡し — ソース読みのための Rust** | 流し読み。ジェネリクス、Arc、unsafe、マクロ — あなたには復習。 |
| **Inside Revm / Inside Reth / Inside Alloy** | **じっくり読む。** ここが本題。 |
| **L1 Architecture (Advanced) tier** | **来た目的のひとつ。** 特に Consensus と Cross-Chain Bridges。 |
| **Expert + Building** | アウトプット。読んだことを実装に変える。 |

## 6. あなたが賭けているもの

Solana のランタイムは優れていますが、Solana 専用です。Reth は **多くのチェーンが乗る基盤** で、Hyperliquid、Tempo、OP-Reth、MegaETH、Berachain — その数は増え続けています。Rust EVM スタックは、あなたのスキルが 1 つのチェーンではなく、より広い L1 / L2 全体で複利で効く場所です。

これは Solana を貶しているわけではなく、**Reth を読めるエンジニアは Solana プログラムを読めるエンジニアより希少で、しかも Reth に賭けているチェーンが急速に増えている** という観察です。Solana で鍛えた Rust の直感は、Solidity から移ってくる人より早く、その希少人材のニッチにあなたを連れていってくれます。

## 次へ

*Rust 環境を整える* を飛ばして直接 *Fundamentals* に向かっても構いません（Rust ツールチェーンはあなたが持っているはずです）。Foundry / Anvil をまだ触っていなければ、*Rust 環境を整える* を流し読みするのも手です。どちらの道でも先に進めます。
`,
                },
                {
                  title: 'Reth vs Geth / Alloy vs ethers-rs — 置き換えの根拠',
                  slug: 'substitution-case-ja',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 20,
                  content: `# Reth vs Geth / Alloy vs ethers-rs — 置き換えの根拠

> 🧭 **このレッスンの位置づけ:** スタックの各層で Rust が選ばれるとき、チームが実際にたどっている推論をケース単位で追う。このスタックが存在する理由を、抽象論ではなく実例で語る。

プロジェクトの地図は前のレッスンで描きました。次に出てくる質問はこれです — **なぜチームは古い選択肢から積極的に移行しているのか?** Geth は 10 年間 Ethereum を走らせてきました。ethers-rs は長らく Rust Ethereum ライブラリの定番でした。それでも、新しいインフラは Reth と Alloy の上に作られています。その理由を、置き換え 1 件ずつ見ていきます。

## 1. Reth vs Geth

Geth (Go-Ethereum) は元祖の execution client です。2015 年から mainnet を走らせ続け、現在も execution client シェアの 40〜50% を握り、開発チームは優秀です。**Reth は「より良い Geth」ではありません。** Geth が構造的にできないことで居場所を稼ぐ、別物の設計です。

| 性質 | Geth | Reth | なぜ重要か |
| :--- | :--- | :--- | :--- |
| **言語** | Go | Rust | Cargo workspace で revm をライブラリとして単独で使えます。Geth の execution engine はノードに溶接されていて再利用できません。 |
| **アーキテクチャ** | 強結合 | モジュラな crate (revm、alloy、reth-stages、reth-network、reth-rpc など) | ノード全体ではなく *1 つの* crate（たとえばカスタム executor）だけを fork できます — App-chain / L1 fork パターンの中核です。 |
| **状態ストレージ** | LevelDB ベース、進化中 | MDBX (メモリマップ B+tree) | コンパクション負荷の下でも読み取りレイテンシが安定します。Geth は archive node のコンパクション停滞に長らく苦戦してきました。 |
| **実行エンジン** | go-ethereum のインタープリター | revm (Rust、ライブラリ志向) | revm は Foundry、Hyperliquid の HyperEVM、Rust ベースの MEV スタックすべてに使い回されています。Geth のインタープリターには Geth 自身以外の消費者がいません。 |
| **同期戦略** | Snap sync | Staged sync (10 段パイプライン) | バッチ全体で I/O を償却するため、初期同期が速く、カスタムステージで拡張もしやすい。 |
| **拡張 API** | 公式にメンテされた仕組みなし | ExEx (Execution Extensions) — インプロセスの Rust フック | ノード *内側で* ノード速度のインデクサ・MEV ボット・リスクエンジンを動かせ、RPC を経由しません。Geth には等価物がありません。 |
| **チェーン fork** | 困難 (Geth 全体を fork する必要) | 容易 (Reth SDK で 1 コンポーネントだけ差し替え) | Hyperliquid の HyperEVM、Tempo、MegaETH、Base (OP-Reth)、Berachain がこのパターンで作られています。 |
| **再利用範囲** | Geth のコードは Geth が使う | revm、alloy、reth-* crate は 100 を超えるプロジェクトで再利用されている | あなたが触れる Rust EVM ツールはすべて、これらの crate のどれかの上に乗っています。 |

決済優先の独自トランザクション順序付けを持つ L1 をチームが ship する場面を想像してみてください。fork するのは Reth で、それも全体ではありません。Reth の crate に依存したまま、\`Pool\` と \`Payload\` コンポーネントだけを差し替えます。Geth なら全コードベースを fork し、永遠に続くリベース税を払い、自分では触りたくない 20 万行のコードを抱え込むことになります。これがまさに Tempo がやっていることで、前のレッスンに並んだ Reth ベース L1 すべてが採用している形です。

**Reth は Geth を退位させるために作られたのではありません。** 次世代のチェーンが上に乗る *基盤* になるために作られました。Reth と Geth はそもそも別カテゴリです。

## 2. Alloy vs ethers-rs

ethers-rs は 2020 年から 2024 年にかけて、Rust Ethereum ライブラリの定番でした。そして 2024 年半ばに、ethers-rs のメンテナ（Georgios Konstantopoulos / Paradigm）が **Alloy への移行を進めるために ethers-rs を deprecate** しました。移行は段階的でも美的理由でもなく、ethers-rs が構造的に届かない性質を狙った意図的な再設計です。

| 性質 | ethers-rs | Alloy | なぜ重要か |
| :--- | :--- | :--- | :--- |
| **モジュラ性** | モノリシックな crate | 細かい crate (alloy-provider、alloy-network、alloy-primitives、alloy-signer、alloy-rpc-types など) | 必要なものだけ依存に加えればよく、Cargo の依存ツリーが劇的に縮みます。 |
| **非同期スタイル** | \`async-trait\`（呼び出しごとに Box を確保） | ネイティブな async trait + ProviderCall (確保なし) | ホットパス (MEV、RPC サーバ) では呼び出しごとの確保が消えるだけで体感差があります。 |
| **マルチチェーン** | Ethereum 専用の型 | \`Network\` トレイトでチェーンプリミティブを抽象化 | 同じ Provider コードが Ethereum、Optimism、独自 L2 で動きます。Inside Alloy で詳しく歩きます。 |
| **型のエルゴノミクス** | 独自型、revm とは別系列 | revm の \`Address\`、\`U256\`、\`B256\` をそのまま使う | alloy + revm + reth で型が一揃い。変換のためのボイラープレートが消えます。 |
| **ウォレット / 署名者の合成** | 単一の Provider 設計に密結合 | \`Signer\` + \`Filler\` トレイトを \`ProviderBuilder\` で重ねる | 署名、nonce 管理、ガス推定を別々に組み立てて重ねられます。Inside Alloy の Signer 章で歩きます。 |
| **手続きマクロ (\`sol!\`)** | 外部 crate、結合は緩い | 第一級、alloy 全体で使われる | Solidity 型を Rust 側でコンパイル時に定義でき、手書きの ABI struct が要りません。 |
| **メンテナンス** | Paradigm 内の 1 人、時間も限定 | Paradigm が予算をつけ、コミュニティも参加 | 開発が活発で、PR の回りが速く、ロードマップも明確。 |

2026 年に新しい MEV searcher を書く立場を想像してみてください。Alloy を選ぶ理由は次の 4 つです — (a) revm と型を共有できる（fork シミュレーションは revm で動く）、(b) クラウド KMS やハードウェアウォレットを独自 \`Signer\` として、Provider を書き換えずに差し込める、(c) 型パラメータを 1 つ変えるだけでコードが Optimism / Base / 任意の Reth ベース L2 で動く、(d) ethers-rs にはもう Paradigm からのバグ修正が来ない。**ethers-rs に残る理由は惰性だけ** で、その惰性も四半期ごとに弱まっていきます。

## 3. 2 つの置き換えに共通するパターン

Geth と ethers-rs は悪くありません。Rust EVM エコシステムがまだ若かった頃の、「下流プロジェクトをまたいで合成できる」より「まず動かす」が優先された時代の産物です。

**Reth と Alloy は同じ設計判断を共有しています — 完全性より合成性。** どちらも内部を crate として切り出し、下流のプロジェクトが混ぜて並べて差し替えられるようにしてあります。Geth と ethers-rs は完成品として使われる前提で設計され、Reth と Alloy は拡張される基盤として設計されました。

これが、このカリキュラムの残りが存在する構造的な理由です。**続く Inside Revm、Inside Reth、Inside Alloy は、その基盤を読むスキルを教えます。** 読めれば作れる。それが Geth と ethers-rs が構造的に提供できなかったレバレッジです。

このレッスンを終えたら、頭の中に 2 つの答えを残しておいてください: 決済優先の L1 チームが Geth ではなく Reth を fork する理由は何か、2026 年の新しい MEV searcher が ethers-rs ではなく Alloy を選ぶ理由は何か。どちらも上の表に答えがあります。

## 次へ

本レッスンで Module 0 は完了: レッスン 0 の systems-engineering 枠、プロジェクト map（Reth / Revm / Alloy）、Solana / Solidity onramp、そして本レッスンの substitution case。**Module 1 で Rust をマシンにセットアップ**、ソース読みを始められる状態にする。最初の \`alloy-rs/alloy\` ファイルを開いた瞬間から、レッスン 0 の枠が報われ始める。
`,
                },
                {
                  title: 'Ethereum を systems engineering として読む — 必要なメンタルモデル',
                  slug: 'ethereum-as-systems-engineering-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# Ethereum を systems engineering として読む — 必要なメンタルモデル

ほとんどの Ethereum 入門は、Ethereum を **それ自体が独立した世界** として扱います。ブロックチェーンの魔法、特別なプリミティブ、暗号資産業界固有の用語が並ぶ並行宇宙。この捉え方は dapp チュートリアルには役立ちますが、Reth・Revm・Alloy のソースを読むには弱すぎます。

このカリキュラムを通すために必要な捉え方はこちらです: **Ethereum は、データベース + 分散システム + コンパイラ + ネットワーク + 並行処理ランタイムが、コンセンサスでひとつに束ねられたもの。** どの部品も数十年の文献を持つ、よく研究された systems engineering の問題です。「ブロックチェーン」と呼ばれている部分は接着剤であって、本質ではありません。

この一枚の絵を持ち歩いてください。続く Reth / Revm / Alloy のすべてのレッスンが、すでに知っている何かの上に着地します。

## 1. 5 つのサブシステム

Reth のソースツリーは、5 つの systems engineering 分野にきれいに分解できます。

| サブシステム | 中身 | Reth のどこに住むか | Ethereum 外の類例 |
| :--- | :--- | :--- | :--- |
| **データベース** | スナップショット・MVCC・クラッシュ復旧を備えた永続キー・バリュー・ストア | \`reth-mdbx\` + \`reth-db\` (MDBX、メモリマップ B+tree) | PostgreSQL のストレージ層、RocksDB、LMDB |
| **分散システム** | 部分故障下で合意に達する多ノード状態機械 | コンセンサス統合、P2P 状態同期、ゴシップ | Raft、Paxos、Bitcoin の最長チェーン、Cassandra |
| **コンパイラ / VM** | バイトコードインタープリター、やがて JIT/AOT コンパイラへ | revm (インタープリター)、revmc (JIT/AOT) | JVM、V8、CPython、LuaJIT |
| **ネットワーク** | ピア評価と DoS 耐性を備えた独自 TCP ゴシッププロトコル | \`reth-network\` (devp2p)、代替チェーンでは libp2p | BGP、BitTorrent のトラッカー層、IRC |
| **並行処理ランタイム** | 非同期 I/O のオーケストレーション、数千の同時実行タスク | Tokio (協調スケジュールの future) | Node.js のイベントループ、Go の goroutine、Erlang の BEAM |

過去の現場で見たどんなバグクラス — 競合状態、データベースのデッドロック、TCP バックプレッシャー、JIT のコンパイル誤り — でも、Ethereum でそのまま起きます。実際に起きてきました。Reth の CI が捕まえるのは、データベースのコンパクション停滞、リオーグ処理の競合、opcode 価格付けのバグ、ピア排除攻撃、負荷下のタスク餓死。**バグの種類は Ethereum 固有ではありません。** 見つけ方も直し方も同じです。

## 2. なぜソース読みでこの捉え方が効くか

\`reth-mdbx\` を開いて「コピーオンライトのページと MVCC スナップショットを持つ B+tree」を見たら、それは **50 年の文献を背負ったデータベース設計** だと認識してください。「Ethereum が状態を奇妙に保存している」のではありません。Reth が MDBX を選んだ理由は、SQLite が類似の設計を選ぶ理由と同じ — 重い書き込み負荷下で読み取りレイテンシが安定する、クラッシュに強い、組み込みやすい、という工学的な選択です。

revm を開いて「スタックベースのインタープリターが 256 個の関数ポインタテーブルでディスパッチする」のを見たら、それは **1980 年代の CPython と 1990 年代の JVM 文献から続く仮想マシン設計** です。「EVM 特有の奇妙さ」ではありません。素朴な \`match\` 文より速い理由は、1990 年以降に作られたすべてのインタープリターが何らかの計算 goto や関数ポインタテーブルを使う理由と同じです。

\`reth-network\` を開いて「悪い振る舞いで切断するピア評価」を見たら、それは **BGP の時代から続く分散システムのパターン** です。「Ethereum 固有のアンチ DoS」ではありません。

この捉え直しはあちこちで効きます。続くレッスンは「これは OS スケジューリング理論をリオーグに当てはめたもの」とは声に出して言いません — それでも、あなたがこの捉え方を持っている前提で書かれています。

## 3. スキルが複利で効く

Ethereum はよく研究されたシステムの合成です。だからこそ、ここで身につけるスキルは **業界をまたいで複利で効きます**。

| Reth を読んで身につくスキル | 他のどこで活きるか |
| :--- | :--- |
| MDBX / B+tree のストレージ設計 | データベース・エンジニアリング全般 (Snowflake、PlanetScale、Neon、MongoDB) |
| Tokio 非同期 + バックプレッシャー | Rust ネットワーキングのすべて (Cloudflare、Discord、AWS 内部サービス、Linkerd) |
| revm のインタープリターループ | VM・言語ランタイム全般 (TigerBeetle、独自 DSL、EVM 以外のスマートコントラクト VM) |
| リオーグまわりの分散システム推論 | データベースレプリケーション、コンセンサス設計、決済 rail 設計 |
| プロファイリング、フレームグラフ、キャッシュ局所性 | 高スループット企業の性能エンジニアリング全般 |

Solidity しか読めない「Ethereum エンジニア」は市場が狭い。一方、たまたま Ethereum を専門にした systems エンジニアは、systems engineering の求人市場 *全体* を退路として確保したうえで、Ethereum 専門家としての上乗せも取れる立場にいます。

仮に Ethereum 業界が伸びなかったとしても、MDBX・Tokio・本物の分散システムに対して ship した経験を持つ Rust エンジニアは、TigerBeetle、Cloudflare、Discord、PlanetScale、Neon、クラウドデータベース各社のインフラエンジニアリング職を選び放題です。Ethereum 固有の知識は上乗せ、systems の基礎スキルが土台 — この順序が成立しているのが、ここでの賭けの強さです。

つまり Reth への賭けは、本当は Ethereum への賭けではありません。**systems engineering という分野への賭け** で、Ethereum はその応用先のうち特に面白く、特に報酬の大きい一例にすぎません。

## 4. 退けるべき「魔法」の言い回し

以下の枠付けに出会ったら、能動的に押し返してください。

- **「スマートコントラクトは特別」** — 違います。VM 上で走るプログラムです。VM がたまたま決定的で、ガスを計測するだけ。「スマートコントラクト」を頭の中で「プログラム」に置き換えるとレッスンがすっきり読めます。
- **「状態 (state) は特別」** — 違います。スナップショット付きのキー・バリュー・ストアです。「state」を頭の中で「データベース」に置き換えてください。
- **「コンセンサスは特別」** — 違います。40 年以上研究されてきた、レイテンシ・ライブネス・スループットのトレードオフが既知のアルゴリズムです。「コンセンサス」を「ノードが合意するためのプロトコル」と置き換えてください。
- **「ガスは特別」** — 違います。計測付きのリソース予算です。「ガス」を「CPU とメモリの計測」と置き換えてください。

続くレッスンはこの置き換えを済ませた前提で書かれています。「EVM」「state」「コンセンサス」という語は文献に合わせて使いますが、それらを **一般的な systems engineering の問題の具体例** として扱い、Ethereum 固有の魔法的な何かとしては扱いません。

## 次に来るもの

これがレッスン 0 — 全体の捉え方です。レッスン 1 では、Ethereum を一般的な systems engineering のインスタンスから区別する 4 つの力を名指して、この捉え方を鋭くします。Module 0 の残りはこの地図を埋めていきます。どのプロジェクト（Reth・Revm・Alloy）がどのサブシステムを実装しているか、なぜチームが Geth / ethers-rs / Solana ではなくこのスタックを選ぶのか、Solidity や Solana の経験がどう持ち越せるのか。Module 0 を終えたら、Rust をセットアップしてソースを読み始めます。

ひとつだけ持って歩いてください。続くレッスンで「ブロックチェーン」「state」「コンセンサス」「ガス」という語が出てきたら、頭の中で systems engineering の等価物に置き換えてください。レッスンはあなたがその置き換えを済ませた前提で書かれています。**この捉え方こそが、ソースを読めるようにする鍵です。**
`,
                },
                {
                  title: '5 サブシステムの先へ — Ethereum を Ethereum たらしめる 4 つの力',
                  slug: 'ethereum-adversarial-forces-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 25,
                  content: `# 5 サブシステムの先へ — Ethereum を Ethereum たらしめる 4 つの力

前のレッスンでは on-ramp の捉え方を入れた: **Ethereum はデータベース + 分散システム + コンパイラ + ネットワーク + 並行ランタイムが、コンセンサスでひとつに束ねられたもの。** どの部品も systems engineering で長く研究された問題。「ブロックチェーン」は接着剤であって本質ではない。

この捉え方は正しい出発点。Reth のソースを「魔法」と感じずに読めるようになるための入口。ただし意図的な単純化でもあって、これだけ持って Inside REVM / Inside Reth に進むと、Ethereum の設計選択が *なぜ* そう見えるのかを取り逃がす。

Ethereum の *固有の* インスタンスを、一般的な systems engineering のインスタンス（例: PostgreSQL + Tokio + 自前 VM で動く web2 バックエンド）から区別する **4 つの力** がある。ここでロードしておく。それぞれは後のカリキュラムで具体的なレッスンとして出てくる; 本レッスンはその地図。

## 力 1: 敵対的環境

Paxos と Raft — 古典的な分散システムアルゴリズム — は、ノードが故障する（クラッシュ、遅延、ネットワーク分断）ことは想定するが、**悪意を持つことは想定しない**。これを Crash Fault Tolerance (CFT) と呼ぶ。本番の分散システム（Spanner、Kafka、etcd）の大半はこの世界で生きている: ノードは同じ会社が運用し、同じコードを走らせ、嘘をつくインセンティブがない。

Ethereum はそうした前提を置けない。ノードは互いに信頼しない当事者が運用し、その一部は積極的に利益のためにシステムを破ろうとする。この世界の文献名は Byzantine Fault Tolerance (BFT) — そして BFT は CFT よりも *質的に* 難しい。PBFT (1999) が学術上のマイルストーンになったのは、まさに非同期ネットワーク下の BFT がほぼ不可能だと考えられていたから。

敵対的環境こそが、Ethereum の設計が場所によって奇妙に見える単一の load-bearing な理由:

- **ガスは単なる「CPU + メモリの計測」ではない。** DoS 防止機構そのもの。ガスが無料か計測されていなければ、攻撃者は無限ループする 1 トランザクションを投入してすべてのノードを止められる。Opcode ごとのガス価格は制御理論のフィードバックループ — 各操作の価格は、それを敵対的に実行するコストに対して校正される。
- **Slashing は単なる懲罰ではない。** 信頼された権威なしにコンセンサスを成立させるための、経済的なセーフティネット。Double-sign したバリデータはステークした資本を失う — その損失は攻撃の利益を上回らなければ、システムは安全にならない。プロトコルに埋め込まれたゲーム理論であって、コードレベルのチェックではない。
- **コンセンサスは「ハッシュ付きの Paxos」ではない。** Casper FFG + LMD-GHOST、HotStuff、Tendermint — モダンな BFT コンセンサスはどれも、古典的 Paxos が置かない経済的・タイミング上の前提を明示的に持っている。

**crypto 外のアナロジー:** Visa のような決済ネットワークは標準的な分散システム基盤の上に乗っているが、加盟店とカード保有者が敵対的になりうると想定して、不正検知の層を上に追加する。Ethereum も同じ形 — ただし、不正検知の層がコンセンサスプロトコル *そのもの* で、別システムを上に乗せたわけではない。

**カリキュラムでの出会い場所:** Consensus Engineering ティア（BFT、slashing、バリデータ経済）、Validator Operations ティア（slashing 検知、鍵管理）。

## 力 2: 暗号学的検証可能性

Ethereum の「データベース」は技術的には MDBX（MVCC 付きの B+tree）。しかし MDBX だけならただのキー・バリュー・ストア。Ethereum のデータベースを PostgreSQL のデプロイから根本的に分けているのは、ひとつの構造的な追加 — 暗号アキュムレータである Merkle Patricia Trie (MPT)。

MPT のおかげで、すべてのアカウント、すべてのストレージスロット、すべてのコントラクトコード — 状態のすべての断片 — が、**state root** と呼ばれるたった 32 バイトのハッシュにひとつに束ねられる。その 32 バイトのハッシュと小さな Merkle proof があれば、第三者は **proof を渡した相手を信頼することなく、かつ自分でデータベースを持つことなく**、任意の単一の状態断片を検証できる。

これが PostgreSQL との load-bearing な違い。PostgreSQL のデプロイは「Alice の残高は 100 だ」と告げてくれる — がそれを信じるには、データベース（あるいはその運用者）を信頼する必要がある。Ethereum は「Alice の残高は 100、1KB の proof を渡す、既に信頼している state root に照らして検証してくれ」と告げてくれる。信頼の置き場が運用者から暗号へ移る。

ここで入れておく価値のある実務的な帰結:

- **状態を変える操作は、同等の PostgreSQL の更新より高くつく。** MPT は変更のたびにルートまで再ハッシュが必要だ。これが \`SSTORE\` に 20,000 ガスかかる一方、\`MLOAD\` は 3 で済む理由。
- **ライトクライアントが可能になる。** フルデータベースを持たないスマホサイズのクライアントでも、state root と proof さえあれば chain の状態を検証できる。MPT の構造的な性質。
- **ステートレス検証が可能になる。** バリデータは全状態を抱える必要がなく、検証する各トランザクションの proof にアクセスできればよい。プロトコル研究のホットエリア。

**crypto 外のアナロジー:** Git のコンテンツアドレス型ストレージ（すべての commit がツリーをハッシュで参照する）、ZFS の Merkle ツリー完全性チェック、IPFS のコンテンツアドレッシング。すべて同じアイデアの応用 — *データベースの内容が暗号的にコミットされているので、全体を持たずに任意の部分を証明できる*。

**カリキュラムでの出会い場所:** Expert ティアの「Merkle Patricia Trie & 状態証明」、Cross-chain Bridges の light client、Stateless Ethereum。

## 力 3: トランザクション順序付けが市場になる

標準的な分散システム — Kafka、決済キュー、CDC パイプライン — では、トランザクション順序は実装の詳細。システムが順序（FIFO、partition key ベース、タイムスタンプ）を選び、それで終わり。

Ethereum はこの前提を置けない。各ブロックには数百から数千のトランザクションが同じ希少リソース（ブロックスペース、ストレージスロット、AMM の流動性）を奪い合う。ブロック内で *どの* トランザクションが先に来るかには、直接的な金銭価値がある — 大きな swap の前に走らせる front-running、価格インパクトのある注文への sandwich 攻撃、DEX プール間のアービトラージ捕捉。この価値には名前がある: **MEV (Maximal Extractable Value)**。

結果として、トランザクションの *順序付けそのもの* が独自の systems engineering の層になり、独自のパイプラインを持つ:

- **Mempool** — トランザクションがここで待つ、見ている全員に見える
- **Searcher** — mempool を走査して儲かる順序を探し、bundle を投入する
- **Builder** — searcher の bundle と公開 mempool からブロックを組み立てる、合計手数料 + MEV を最大化する
- **Relay** — builder とバリデータの間に座って、ブロックを配信する
- **Validator** — 最も儲かるブロックを選び、署名して、提案する

5 つの distinct なコンポーネント、それぞれが固有の性能特性、信頼前提、失敗モードを持つ。どれも 2015 年には存在しなかった。これらが生まれた理由は、敵対的環境（力 1）+ 公開された mempool + ブロックごとの希少リソース、によってトランザクション順序付けが経済的価値を持ったから。

**crypto 外のアナロジー:** HFT のオーダールーティング（どの取引所にいつ送るか）、取引所のマッチングエンジン設計、広告オークションパイプライン（header bidding、プログラマティック広告交換所）。すべて *順序付けが意味を持ち、順序付ける者に力があり、順序付けが独自の最適化された層になる* という形。

**カリキュラムでの出会い場所:** Building ティア（MEV searcher アプリ、frontrun-resistant order router の capstone）、Expert MEV in production。

## 力 4: 無停止のシステム移行

標準的な分散システムでは、スキーマ移行とルール変更は world を止め、移行を走らせ、再起動して扱う。Kafka クラスタは 2 分の degraded スループットを伴うローリングアップグレード。PostgreSQL はメンテナンスウィンドウ。厳格な 24/7 システムである Visa でさえ、ロールバックプランとともに数時間かけてアップグレードを協調する。

Ethereum はそれができない。メンテナンスウィンドウを宣言できる単一の運用者は存在しない。Chain は 12 秒ごとにブロックを生み続け、その間にすべてのノード — 数千の独立した当事者が運用 — が同時に、ある特定のブロック高で新しいコンセンサスルールに切り替わらなければならない。これが **ゼロダウンタイムでのホットスワップ移行、互いに信頼しない運用者群をまたいで協調される**。

仕組み: すべての Reth/Revm バージョンが、Ethereum のコンセンサスルールの全履歴を 1 つのバイナリ内に抱える。\`spec_id\`（あるいは等価物）と呼ばれるフィールドが、任意のブロック高でどのルールが適用されるかを選ぶ。Chain が新しいハードフォークの activation 高に到達すると、すべてのノードが同時にルールセットを切り替える。アップグレードしていないバリデータは canonical chain から脱落; アップグレードしたバリデータは続行する。

これが Reth/Revm のソースに \`match spec_id\` や \`if hardfork >=\` の分岐がこれほど多い理由。コンセンサスに影響する振る舞いに触れるコード行は、その振る舞いをかつて変えたすべてのハードフォークについて知っていなければならない。コードが複雑に見えるのは、完全な歴史的仕様を抱えているから。

**crypto 外のアナロジー:** 宇宙船のコンピュータファームウェアの更新（衛星に物理的に届かないので、飛行中にアップデートしなければならない）、電話網のプロトコルアップグレード（AT&T のアナログから SS7 への移行は、すべての通話がつながり続けたまま行われた）、Visa の支払いネットワークのハードフォーク（IC カード、コンタクトレス、トークン化 — すべて数百万台の加盟店端末を、ダウンタイムなしで協調的にアップグレード）。

**カリキュラムでの出会い場所:** Expert ティアの「Custom ChainSpec — fork、genesis、precompile schedule」、「本番での Reth フォーク運用」。

## 更新後のメンタルモデル

両方のレッスンを持ち歩く:

**5 サブシステム**（前のレッスン）:
- データベース、分散システム、コンパイラ/VM、ネットワーク、並行ランタイム

**4 つの力**（本レッスン）:
- 敵対的環境、暗号学的検証可能性、トランザクション順序付けが市場になる、無停止のシステム移行

5 サブシステムは *Ethereum が何でできているか* を教える。4 つの力は *なぜそれらのサブシステムがそう見えるか* を教える。

Reth を読んでいて、一般的な SE のパターンに収まらないコード — 奇妙なガス価格定数、ストレージ書き込みのたびに走る Merkle 再ハッシュ、private orderflow を扱うペイロードビルダー、14 分岐の \`match spec_id\` — に出会ったとき、この 4 つの力のどれかが理由になっている。

**両半分のモデルを持つと、Ethereum の固有性を「ブロックチェーンの魔法」として扱う必要がなくなる。** 5 サブシステムは SE の substrate を、4 つの力はそれを形作る制約を与える。両方そろえば、Reth/Revm/Alloy を — 「これは魔法だ」とも「ただのハッシュ付き Paxos」とも転ばずに — 読めるようになる。

## 各力に再会する場所

| 力 | カリキュラム上の具体的な接点 |
| --- | --- |
| **敵対的環境** | Consensus Engineering（BFT、バリデータ経済、slashing）、Validator Operations（slashing 検知、MPC 鍵） |
| **暗号学的検証可能性** | Expert MPT のレッスン、Cross-chain Bridges の light client、Stateless Ethereum |
| **トランザクション順序付けが市場になる** | Building ティア（MEV searcher、frontrun-resistant router の capstone）、Expert MEV in production |
| **無停止のシステム移行** | Expert Custom ChainSpec、Expert Reth フォーク運用、Inside Revm / Inside Reth のハードフォーク関連コードパス |

on-ramp の捉え方だけでも読み始めることはできる。この 4 つの力は、その捉え方を鋭くするためのもの。両レッスンとも意図的に短い — 中身の大半は、それぞれが指すコース側に住んでいる。`,
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
