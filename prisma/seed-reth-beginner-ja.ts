import { PrismaClient } from '@prisma/client';

export async function seedRethBeginnerJA(prisma: PrismaClient) {
  const tags = ['rust', 'ethereum', 'beginner', 'reth', 'revm', 'alloy'];

  await prisma.course.create({
    data: {
      slug: 'reth-beginner-ja',
      title: 'Reth 入門 — Rust Ethereum の世界へ',
      description:
        'Rust Ethereum スタック（Reth / Revm / Alloy）の世界への入口を 11 レッスンで開く — Ethereum を systems engineering として読む / 4 つの adversarial 力 / 3 つ巴の役割分担 / Solana との比較 / 既存 (Geth, ethers-rs) との置き換え根拠 / Rust 環境準備 / クイックリファレンス / 最初の宿題 + 初級まとめクイズ。BEGINNER 向け、修了時に Fundamentals → Bridge to Advanced → 3 中級コース（Inside Revm / Inside Reth / Inside Alloy）へ進む準備が整う。',
      difficulty: 'BEGINNER',
      duration: 125,
      xpReward: 230,
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
                  title: 'レッスン0 — Ethereum を systems engineering として読む — 必要なメンタルモデル',
                  slug: 'ethereum-as-systems-engineering-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン0 — Ethereum を systems engineering として読む — 必要なメンタルモデル

## 問い

多くの Ethereum 入門は Ethereum を **独立した特別世界** として扱う。dapp チュートリアルにはこれで十分だが、**Reth・Revm・Alloy のソース読解には弱い**。このカリキュラムが必要とする捉え方は: Ethereum = データベース + 分散システム + コンパイラ + ネットワーク + 並行処理ランタイム を **コンセンサスで束ねた合成物**。

## 原理（最小モデル）

- **5 サブシステム.** データベース（MDBX = B+tree、\`reth-mdbx\`）/ 分散システム（コンセンサス + P2P 同期）/ コンパイラ・VM（revm / revmc）/ ネットワーク（\`reth-network\` devp2p）/ 並行処理ランタイム（Tokio）。
- **各分野は数十年の文献を持つ.** バグクラス（競合状態 / DB デッドロック / TCP バックプレッシャー / JIT 誤り）は Ethereum 固有でない、見つけ方と直し方も同じ。
- **スキルは複利で効く.** MDBX → Snowflake / PlanetScale / Neon、Tokio → Cloudflare / Discord / AWS、revm インタープリタ → TigerBeetle / 言語ランタイム全般。Ethereum 固有知識は **上乗せ**、systems 基礎が土台という順序。
- **退けるべき「魔法」.** 「スマートコントラクトは特別」（違う、VM 上のプログラム）/ 「state は特別」（違う、スナップショット付き KV）/ 「コンセンサスは特別」（違う、既知 trade-off アルゴリズム）/ 「ガスは特別」（違う、計測付きリソース予算）。
- **ソース読解への効き方.** \`reth-mdbx\` の B+tree → SQLite 系設計、revm の 256 関数ポインタテーブル → CPython / JVM 設計、ピア評価 → BGP 由来、Ethereum 固有の奇妙さでなく **既知 systems パターンの応用** として読む。

## 具体例 + ステップで組み立てる

# Ethereum を systems engineering として読む — 必要なメンタルモデル

多くの Ethereum 入門は、Ethereum を **独立した特別世界** として扱う。ブロックチェーンの魔法や業界固有語彙を並べるこの捉え方は dapp チュートリアルには有効だが、Reth・Revm・Alloy のソース読解には弱い。

このカリキュラムに必要な捉え方は次である。**Ethereum は、データベース + 分散システム + コンパイラ + ネットワーク + 並行処理ランタイムを、コンセンサスで束ねたもの。** 各部品は数十年の文献を持つ systems engineering の問題であり、「ブロックチェーン」は接着剤であって本質ではない。

この一枚の絵を持ち歩く。続く Reth / Revm / Alloy のレッスンは、既知の何かの上に着地する。

## 1. 5 つのサブシステム

Reth のソースツリーは、5つの systems engineering 分野にきれいに分解できる。

| サブシステム | 中身 | Reth のどこに住むか | Ethereum 外の類例 |
| :--- | :--- | :--- | :--- |
| **データベース** | スナップショット・MVCC・クラッシュ復旧を備えた永続キー・バリュー・ストア | \`reth-mdbx\` + \`reth-db\` (MDBX、メモリマップ B+tree) | PostgreSQL のストレージ層、RocksDB、LMDB |
| **分散システム** | 部分故障下で合意に達する多ノード状態機械 | コンセンサス統合、P2P 状態同期、ゴシップ | Raft、Paxos、Bitcoin の最長チェーン、Cassandra |
| **コンパイラ / VM** | バイトコードインタープリター、やがて JIT/AOT コンパイラへ | revm (インタープリター)、revmc (JIT/AOT) | JVM、V8、CPython、LuaJIT |
| **ネットワーク** | ピア評価と DoS 耐性を備えた独自 TCP ゴシッププロトコル | \`reth-network\` (devp2p)、代替チェーンでは libp2p | BGP、BitTorrent のトラッカー層、IRC |
| **並行処理ランタイム** | 非同期 I/O のオーケストレーション、数千の同時実行タスク | Tokio (協調スケジュールの future) | Node.js のイベントループ、Go の goroutine、Erlang の BEAM |

過去の現場で見たバグクラス（競合状態、DBデッドロック、TCPバックプレッシャー、JIT誤り）は、Ethereumでもそのまま起きる。Reth CI が捕まえるのも、コンパクション停滞、reorg競合、opcode価格付けバグ、ピア排除攻撃、高負荷時タスク餓死である。**バグ種別は Ethereum 固有ではない。** 見つけ方と直し方も同じである。

## 2. なぜソース読みでこの捉え方が効くか

\`reth-mdbx\` で「コピーオンライトページ + MVCC スナップショットの B+tree」を見たら、それは **50年級文献を背負ったDB設計** と認識するべきである。「Ethereum が奇妙に状態保存している」のではない。Reth が MDBX を選ぶ理由は SQLite が類似設計を選ぶ理由と同じで、重書き込み下の読み取り安定性、耐クラッシュ性、組み込みやすさにある。

revm で「スタックベースインタープリターが 256 関数ポインタテーブルでディスパッチする」設計を見ても、それは **1980年代CPython / 1990年代JVM から続くVM設計** であり、EVM固有の奇妙さではない。素朴な \`match\` より速い理由も、他インタープリターが計算gotoや関数ポインタテーブルを使う理由と同じである。

\`reth-network\` で「悪い振る舞いで切断するピア評価」を見たら、それは **BGP 時代から続く分散システムパターン** である。「Ethereum 固有のアンチDoS」ではない。

この捉え直しは広く効く。続くレッスンで逐一「OSスケジューリング理論の応用」とは書かないが、読み手がこの前提を持つことを想定して書かれている。

## 3. スキルが複利で効く

Ethereum は、よく研究されたシステムの合成である。だからこそ、ここで身につけるスキルは **業界をまたいで複利で効く**。

| Reth を読んで身につくスキル | 他のどこで活きるか |
| :--- | :--- |
| MDBX / B+tree のストレージ設計 | データベース・エンジニアリング全般 (Snowflake、PlanetScale、Neon、MongoDB) |
| Tokio 非同期 + バックプレッシャー | Rust ネットワーキングのすべて (Cloudflare、Discord、AWS 内部サービス、Linkerd) |
| revm のインタープリターループ | VM・言語ランタイム全般 (TigerBeetle、独自 DSL、EVM 以外のスマートコントラクト VM) |
| リオーグまわりの分散システム推論 | データベースレプリケーション、コンセンサス設計、決済 rail 設計 |
| プロファイリング、フレームグラフ、キャッシュ局所性 | 高スループット企業の性能エンジニアリング全般 |

Solidity しか読めない「Ethereumエンジニア」は市場が狭い。一方、Ethereum を専門にした systems エンジニアは、systems engineering 求人市場全体を退路として確保しつつ、Ethereum 専門家としての上乗せも取れる。

仮に Ethereum 業界が伸びなくても、MDBX・Tokio・本物の分散システムで ship した経験を持つ Rust エンジニアは、TigerBeetle、Cloudflare、Discord、PlanetScale、Neon などインフラ職への選択肢が広い。Ethereum 固有知識は上乗せで、systems 基礎スキルが土台という順序が成立する点が強い。

つまり Reth への賭けは、本当は Ethereum への賭けではありません。**systems engineering という分野への賭け** で、Ethereum はその応用先のうち特に面白く、特に報酬の大きい一例にすぎません。

## 4. 退けるべき「魔法」の言い回し

以下の枠付けに出会ったら、能動的に押し返す。

- **「スマートコントラクトは特別」** — 違う。VM上で走るプログラムであり、VMが決定的でガス計測付きなだけである。
- **「状態 (state) は特別」** — 違う。スナップショット付きキー・バリュー・ストアである。
- **「コンセンサスは特別」** — 違う。レイテンシ・ライブネス・スループットの既知トレードオフを持つアルゴリズムである。
- **「ガスは特別」** — 違う。計測付きリソース予算である。

続くレッスンは、この置き換えを済ませた前提で書かれる。「EVM」「state」「コンセンサス」という語は文献準拠で使うが、**一般的 systems engineering 問題の具体例** として扱い、Ethereum 固有の魔法としては扱わない。

## 次に来るもの

これがレッスン0、全体の捉え方である。レッスン1では、Ethereum を一般的 systems engineering から区別する4つの力を名指しして、この枠を鋭くする。Module 0 残りでは、各プロジェクト（Reth・Revm・Alloy）がどのサブシステムを実装するか、なぜ Geth / ethers-rs / Solana ではなくこのスタックを選ぶか、Solidity / Solana 経験をどう持ち越すかを埋める。Module 0 後は Rust をセットアップし、ソースを読み始める。

ひとつだけ持って歩く。「ブロックチェーン」「state」「コンセンサス」「ガス」という語が出たら、頭の中で systems engineering の等価物に置き換える。レッスンはその前提で書かれる。**この捉え方こそがソース読解の鍵である。**

## まとめ（3行）

- Ethereum = DB + 分散システム + コンパイラ + ネットワーク + 並行処理 をコンセンサスで束ねた合成物、5 サブシステム + 既知 systems 文献 + 共通バグクラス。
- Reth への賭けは Ethereum でなく **systems engineering 分野** への賭け、MDBX / Tokio / 分散システム / プロファイリングが業界横断で複利。
- 「ブロックチェーン特別世界」枠を退け、既知 systems パターンの応用として読む準備、次レッスンで Ethereum を Ethereum たらしめる 4 つの力。
`,
                },
                {
                  title: 'レッスン1 — 5 サブシステムの先へ — Ethereum を Ethereum たらしめる 4 つの力',
                  slug: 'ethereum-adversarial-forces-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 25,
                  content: `# レッスン1 — 5 サブシステムの先へ — Ethereum を Ethereum たらしめる 4 つの力

## 問い

前レッスンで Ethereum を 5 サブシステムの合成物として枠付けた。**ではそれを Ethereum たらしめている力は何か？** 一般的 systems と区別する 4 つの力 — adversarial environment / consensus determinism / immutability / open membership — を名指しする。

## 原理（最小モデル）

- **Adversarial environment.** 攻撃者は常に存在 + 経済インセンティブ駆動、レイテンシ攻撃 / front-run / MEV / sandwich、設計は最悪ケース前提。
- **Consensus determinism.** 全ノードが同じ入力で **byte-for-byte 同じ結果**、\`wrapping_add\` / 浮動小数禁止 / 列挙順固定、これがコンセンサス契約。
- **Immutability.** デプロイ後変更不可、\`SELFDESTRUCT\` 除き永久 / 緊急パッチ不可、設計時に「永久化される」を意識。
- **Open membership.** 誰でも validator / ノード / コントラクト書ける、許可制でない = sybil 耐性 + DoS 対策 + 経済ステーキング必須。
- **4 力 × 5 サブシステムで設計判断が決まる.** MDBX の選択は I/O 性能 + crash safety、revm の wrapping は consensus determinism、\`reth-network\` のピア評価は adversarial、Tokio タスク予算は DoS 対策。

## 具体例 + ステップで組み立てる

# 5 サブシステムの先へ — Ethereum を Ethereum たらしめる 4 つの力

前のレッスンでは入り口としての捉え方を入れた: **Ethereum はデータベース + 分散システム + コンパイラ + ネットワーク + 並行ランタイムが、コンセンサスでひとつに束ねられたもの。** どの部品も systems engineering で長く研究された問題。「ブロックチェーン」は接着剤であって本質ではない。

この捉え方は正しい出発点。Reth のソースを「魔法」と感じずに読めるようになるための入口。ただし意図的な単純化でもあって、これだけ持って Inside REVM / Inside Reth に進むと、Ethereum の設計選択が *なぜ* そう見えるのかを取り逃がす。

Ethereum の *固有の* インスタンスを、一般的な systems engineering のインスタンス（例: PostgreSQL + Tokio + 自前 VM で動く web2 バックエンド）から区別する **4 つの力** がある。ここでロードしておく。それぞれは後のカリキュラムで具体的なレッスンとして出てくる; 本レッスンはその地図。

## 力 1: 敵対的環境

Paxos と Raft — 古典的な分散システムアルゴリズム — は、ノードが故障する（クラッシュ、遅延、ネットワーク分断）ことは想定するが、**悪意を持つことは想定しない**。これを Crash Fault Tolerance (CFT) と呼ぶ。本番の分散システム（Spanner、Kafka、etcd）の大半はこの世界で生きている: ノードは同じ会社が運用し、同じコードを走らせ、嘘をつくインセンティブがない。

Ethereum はそうした前提を置けない。ノードは互いに信頼しない当事者が運用し、その一部は積極的に利益のためにシステムを破ろうとする。この前提を扱う文献は Byzantine Fault Tolerance (BFT) と呼ばれる — そして BFT は CFT よりも *質的に* 難しい。PBFT (1999) が学術上のマイルストーンになったのは、まさに非同期ネットワーク下の BFT がほぼ不可能だと考えられていたから。

敵対的環境こそが、Ethereum の設計が場所によって奇妙に見える、単一の中核的な理由:

- **ガスは単なる「CPU + メモリの計測」ではない。** DoS 防止機構そのもの。ガスが無料か計測されていなければ、攻撃者は無限ループする 1 トランザクションを投入してすべてのノードを止められる。Opcode ごとのガス価格は制御理論のフィードバックループ — 各操作の価格は、それを敵対的に実行するコストに対して校正される。
- **Slashing は単なる懲罰ではない。** 信頼された権威なしにコンセンサスを成立させるための、経済的なセーフティネット。Double-sign したバリデータはステークした資本を失う — その損失は攻撃の利益を上回らなければ、システムは安全にならない。プロトコルに埋め込まれたゲーム理論であって、コードレベルのチェックではない。
- **コンセンサスは「ハッシュ付きの Paxos」ではない。** Casper FFG + LMD-GHOST、HotStuff、Tendermint — モダンな BFT コンセンサスはどれも、古典的 Paxos が置かない経済的・タイミング上の前提を明示的に持っている。

**crypto 外のアナロジー:** Visa のような決済ネットワークは標準的な分散システム基盤の上に乗っているが、加盟店とカード保有者が敵対的になりうると想定して、不正検知の層を上に追加する。Ethereum も同じ形 — ただし、不正検知の層がコンセンサスプロトコル *そのもの* で、別システムを上に乗せたわけではない。

**カリキュラムでの出会い場所:** Consensus Engineering ティア（BFT、slashing、バリデータ経済）、Validator Operations ティア（slashing 検知、鍵管理）。

## 力 2: 暗号学的検証可能性

Ethereum の「データベース」は技術的には MDBX（MVCC 付きの B+tree）。しかし MDBX だけならただのキー・バリュー・ストア。Ethereum のデータベースを PostgreSQL のデプロイから根本的に分けているのは、ひとつの構造的な追加 — 暗号アキュムレータである Merkle Patricia Trie (MPT)。

MPT のおかげで、すべてのアカウント、すべてのストレージスロット、すべてのコントラクトコード — 状態のすべての断片 — が、**state root** と呼ばれるたった 32 バイトのハッシュにひとつに束ねられる。その 32 バイトのハッシュと小さな Merkle proof があれば、第三者は **proof を渡した相手を信頼することなく、かつ自分でデータベースを持つことなく**、任意の単一の状態断片を検証できる。

これが PostgreSQL との根本的な違い。PostgreSQL のデプロイは「Alice の残高は 100 だ」と告げてくれる — がそれを信じるには、データベース（あるいはその運用者）を信頼する必要がある。Ethereum は「Alice の残高は 100、1KB の proof を渡す、既に信頼している state root に照らして検証してくれ」と告げてくれる。信頼の置き場が運用者から暗号へ移る。

ここで入れておく価値のある実務的な帰結:

- **状態を変える操作は、同等の PostgreSQL の更新より高くつく。** MPT は変更のたびにルートまで再ハッシュが必要だ。これが \`SSTORE\` に 20,000 ガスかかる一方、\`MLOAD\` は 3 で済む理由。
- **ライトクライアントが可能になる。** フルデータベースを持たないスマホサイズのクライアントでも、state root と proof さえあれば chain の状態を検証できる。MPT の構造的な性質によるもの。
- **ステートレス検証が可能になる。** バリデータは全状態を抱える必要がなく、検証する各トランザクションの proof にアクセスできればよい。プロトコル研究の活発な領域。

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

5 つの独立したコンポーネント、それぞれが固有の性能特性、信頼前提、失敗モードを持つ。どれも 2015 年には存在しなかった。これらが生まれた理由は、敵対的環境（力 1）+ 公開された mempool + ブロックごとの希少リソース、によってトランザクション順序付けが経済的価値を持ったから。

**crypto 外のアナロジー:** HFT のオーダールーティング（どの取引所にいつ送るか）、取引所のマッチングエンジン設計、広告オークションパイプライン（header bidding、プログラマティック広告交換所）。すべて *順序付けが意味を持ち、順序付ける者に力があり、順序付けが独自の最適化された層になる* という形。

**カリキュラムでの出会い場所:** Building ティア（MEV searcher アプリ、frontrun-resistant order router の capstone）、Expert MEV in production。

## 力 4: 無停止のシステム移行

標準的な分散システムでは、スキーマ移行とルール変更はシステム全体を止め、移行を走らせ、再起動して扱う。Kafka クラスタは 2 分の degraded スループットを伴うローリングアップグレード。PostgreSQL はメンテナンスウィンドウ。厳格な 24/7 システムである Visa でさえ、ロールバックプランとともに数時間かけてアップグレードを協調する。

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

Reth を読んでいて、一般的な systems engineering のパターンに収まらないコード — 奇妙なガス価格定数、ストレージ書き込みのたびに走る Merkle 再ハッシュ、private orderflow を扱うペイロードビルダー、14 分岐の \`match spec_id\` — に出会ったとき、この 4 つの力のどれかが理由になっている。

**両方のモデルを持つと、Ethereum の固有性を「ブロックチェーンの魔法」として扱う必要がなくなる。** 5 サブシステムは systems engineering の基盤を、4 つの力はそれを形作る制約を与える。両方そろえば、Reth/Revm/Alloy を — 「これは魔法だ」とも「ただのハッシュ付き Paxos」とも転ばずに — 読めるようになる。

## 各力に再会する場所

| 力 | カリキュラム上の具体的な接点 |
| --- | --- |
| **敵対的環境** | Consensus Engineering（BFT、バリデータ経済、slashing）、Validator Operations（slashing 検知、MPC 鍵） |
| **暗号学的検証可能性** | Expert MPT のレッスン、Cross-chain Bridges の light client、Stateless Ethereum |
| **トランザクション順序付けが市場になる** | Building ティア（MEV searcher、frontrun-resistant router の capstone）、Expert MEV in production |
| **無停止のシステム移行** | Expert Custom ChainSpec、Expert Reth フォーク運用、Inside Revm / Inside Reth のハードフォーク関連コードパス |

入り口の捉え方だけでも読み始めることはできる。この 4 つの力は、その捉え方を鋭くするためのもの。両レッスンとも意図的に短い — 中身の大半は、それぞれが指すコース側に住んでいる。

## まとめ（3行）

- 4 つの力 = adversarial environment + consensus determinism + immutability + open membership、これが Ethereum を一般 systems から区別。
- 4 力 × 5 サブシステムの掛け算で全設計判断が決まる、wrapping arithmetic / ピア評価 / タスク予算 / MDBX 選択すべてこの組み合わせから。
- 次は 3 つ巴（Reth / Revm / Alloy）の役割分担と関係性、なぜこのスタックを学ぶか。
`,
                },
                {
                  title: 'レッスン2 — なぜ Reth・Revm・Alloy を学ぶのか',
                  slug: 'why-rust-ethereum-stack-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 10,
                  xpReward: 20,
                  content: `# レッスン2 — なぜ Reth・Revm・Alloy を学ぶのか

## 問い

**Reth・Revm・Alloy = Rust 製の Ethereum スタック**。Geth（Go）/ ethers-rs より新しく、まだエコシステムに浸透途中。**なぜ今この 3 つを学ぶ価値があるか？**

## 原理（最小モデル）

- **業界トレンド.** 主要 perp DEX（Hyperliquid、$300B+ /year）/ rollup（OP / Tempo / Berachain）/ MEV インフラ（Flashbots）が Rust EVM 採用、求人市場がこちらに動いている。
- **性能と安全性.** Rust の所有権 + ゼロコスト抽象化 + 並列化容易 = Geth より明らかに速いベンチマーク + メモリ安全性で whole class of bug 排除。
- **モジュラー設計.** Reth は SDK で書き換え可能、Revm はライブラリで埋め込み可能、Alloy は dapp / インデクサで使う型基盤、3 つともコンポーネント化されている。
- **コミュニティと文書.** Paradigm 中心の活発な開発、source は読みやすい、コミット履歴は学習リソース、Discord / GitHub で質問しやすい。
- **キャリア複利.** Rust + Ethereum + systems = 求人市場で稀少、退路（TigerBeetle / Cloudflare / Discord 等）もあるリスク低い賭け。

## 具体例 + ステップで組み立てる

# なぜReth・Revm・Alloyを学ぶのか


近年、HyperliquidやTempoのような高性能チェーンが共通して採用しているのが、**Ethereum系のRust実装**、つまり **Reth / Revm / Alloy** である。

## 何が「面白い」のか？

| 観点 | EVM（Geth） | Rust EVMスタック（Reth + Revm） |
| :--- | :--- | :--- |
| **言語** | Go | **Rust（メモリ安全＋高速）** |
| **設計** | 一体型（モノリシック） | **モジュラー（部品として使える）** |
| **採用** | 既存の大半 | **新興のApp-chain・L2・MEVインフラ** |

最大のポイントは「**モジュラー**」であること。Rethはノードとして動かすだけでなく、**ブロックチェーンを作るためのSDK**として使える。

## なぜ、いま注目されているのか

- **HyperliquidのHyperEVM** や **Tempo** は、内部でRevmを採用
- **Foundry**（Solidity開発の事実上の標準）の実行エンジンもRevm
- **OP-Reth**（Optimism）や zkVM の多くもRevmベース

つまりRust Ethereumスタックは、**「次世代Ethereum開発の共通言語」** になりつつある。

## このコースのゴール

- Reth / Revm / Alloy の役割の違いを正確に理解する
- なぜこのスタックが注目されているか、自分の言葉で説明できるようになる
- Rustの開発環境を整え、最初のプログラムを動かす

このコースは「Rustが少し書ける」状態を目指すところまでをカバーする。次のFundamentalsで実際にAlloyを使ってEthereumノードへ接続する。

## まとめ（3行）

- 業界が Rust EVM スタックに動いている（Hyperliquid / OP / Tempo / Berachain / Flashbots）、Geth / ethers-rs より新しい + 求人市場拡大中。
- 性能 + 安全性 + モジュラー設計 + 活発コミュニティ = 学習価値、Rust + Ethereum + systems の組み合わせはキャリア複利。
- 次は 3 つ巴（Reth フルノード / Revm 実行エンジン / Alloy 型基盤）の役割分担を見る。
`,
                },
                {
                  title: 'レッスン3 — Reth・Revm・Alloy の三つ巴',
                  slug: 'three-pillars-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 20,
                  content: `# レッスン3 — Reth・Revm・Alloy の三つ巴

## 問い

**3 プロジェクトの役割分担を整理する**。Reth = フルノード、Revm = 実行エンジン、Alloy = 型 + RPC + 署名のライブラリ群。**それぞれが Ethereum スタックのどの層を担い、どこで他に依存するか？**

## 原理（最小モデル）

- **Reth = フルノード（最上層）.** P2P + DB + コンセンサス統合 + EVM 実行 + RPC server、完成品、ユーザーは binary を動かす。
- **Revm = 実行エンジン（中間層）.** EVM bytecode インタープリター、状態は持たず Database トレイトで外部供給、Reth / Foundry / Hyperliquid / Tempo が組み込み。
- **Alloy = 型基盤（最下層）.** \`Address\` / \`U256\` / \`B256\` 等の primitive、\`Provider\` で RPC、\`Signer\` で署名、dapp / インデクサ / MEV ボットの土台、Reth と Revm も alloy 型に依存。
- **依存方向.** Alloy ← Revm ← Reth、Alloy が一番下、Reth が一番上、各々独立に使える。
- **学習順.** Beginner で 3 つ同時に薄く触れる → 中級 3 コース（Inside Revm / Inside Reth / Inside Alloy）で深掘り、順序自由（依存的には Alloy → Revm → Reth が推奨）。

## 具体例 + ステップで組み立てる

# Reth・Revm・Alloyの三つ巴


3つの名前は混同されがちだが、役割はまったく違う。**「自動車を作る」** で例えるとシンプルである。

| プロジェクト | 役割 | 例え |
| :--- | :--- | :--- |
| **Alloy** | ライブラリ群（型、署名、RPC） | エンジン、タイヤ、ネジ |
| **Revm** | EVM実行エンジン | 燃焼室（命令を実行する場所） |
| **Reth** | フルノード実装 | 完成した自動車 |

## 依存の方向

- **Reth** は内部で **Alloy** と **Revm** を全面的に採用している。
- つまり「Rethを学ぶ＝Alloy／Revmにも触れる」となる。

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

1. **Rethは新興であり、支配的ではない。** 2023年リリース時の<1%から3年で~7-12%へ成長したのは速いが、mainnetのRPCコール大半を捌くのは依然Gethである。**本番で書くAlloyコードの大半は、Gethが応答するチェーンと通信する。** これは問題ではなく、AlloyはJSON-RPC経由でどのexecution clientとも話せる。
2. **Revmベースのシミュレーションは本番クライアント挙動と一致する必要がある。** ローカルRevm forkでtxを実行する場合（中級 + Building tierのパターン）、結果はGethやNethermindで同じtxを処理した結果と一致すべきである。通常はそうなるが、**Revm結果を非Revm providerに対して検証する** 規律は本番運用で必須である。Building tierのcapstoneで扱う。

つまり「Rust EVMスタック」は **新興かつ拡張可能** と捉えるべきで、「勝者総取り」ではない。Paradigm・Hyperliquid・TempoがReth/Revm上に積む理由は市場シェアではなく、モジュラリティ・組み込みやすさ・性能にある。

## 学習の順番

> **Alloy → Revm → Reth**
>
> 理由：「ミクロ（型）→ ミドル（実行）→ マクロ（ノード全体）」と進むのが最も挫折しにくいから。

このコースの次のティアであるFundamentalsで、まずAlloyから手を動かす。ただしRust環境を整える前に、よく出る疑問を1つ片付ける。*「SolanaもRustなのに、なぜEVMか？」* を次のレッスンで扱う。

## まとめ（3行）

- 3 プロジェクト = Reth フルノード（最上層、binary）+ Revm 実行エンジン（中間層、ライブラリ）+ Alloy 型基盤（最下層、primitive + RPC + Signer）。
- 依存方向 = Alloy ← Revm ← Reth、各々独立に使える、Hyperliquid / Foundry が Revm を組み込み、dapp / インデクサが Alloy を使う。
- 中級 3 コース（Inside Revm / Inside Reth / Inside Alloy）で深掘り、推奨順は Alloy → Revm → Reth、次はなぜ Solana でなく Ethereum (Rust)。
`,
                },
                {
                  title: 'レッスン4 — なぜ Solana ではなく Ethereum (Rust) なのか',
                  slug: 'why-not-solana-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 8,
                  xpReward: 15,
                  content: `# レッスン4 — なぜ Solana ではなく Ethereum (Rust) なのか

## 問い

**Solana も Rust 製の高性能チェーン**。「Rust + チェーン」で考えるなら Solana が選択肢として浮かぶ。**なぜ Reth スタックを選ぶか？** 4 つの実利。

## 原理（最小モデル）

- **EVM エコシステム継承.** ウォレット（MetaMask / Rabby）/ ツール（Foundry / Hardhat）/ DEX / ブリッジ / インデクサ / オラクルが全部 EVM 互換、ゼロから作り直し不要。
- **インフラ層カスタマイズ可能.** Reth SDK で precompile / state machine / consensus 差し替え可能、Hyperliquid が perp 専用 L1 を構築した実例、Solana は monolithic で改造範囲限定。
- **EVM 知識の業界横断.** EVM 互換チェーン（OP / Base / Arbitrum / Polygon / BSC / Avalanche / Berachain / Tempo 等）全部に応用、Solana 知識は Solana 限定。
- **Rust 安全性 + 性能.** 両方とも Rust = 同じ強み（メモリ安全 / 高速 / 並列）、Ethereum の wrapping arithmetic + 256-bit 整数 + コンセンサス決定論への対応も Rust が向く。
- **注意点.** 純粋 TPS では Solana 優位な場面あり、Reth 系利点は **カスタマイズ性 + 既存資産 + Rust 安全性**、「常に高速」とは言えない。

## 具体例 + ステップで組み立てる

# なぜSolanaではなくEthereum（Rust）なのか


「Solanaも高速で、しかもRustだから、わざわざRust EVMを学ぶ意味は？」とよく聞かれる。結論は **「目指す方向性次第」** であり、判断軸を整理する。

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

「**現在のトレンドと汎用性**」を重視するなら、**Reth系（このコース）** が答えになる。Solanaは依然強いが、Rust EVMは「EVM開発体験 × Rust性能」の両取りができる稀有なポジションにある。

## 2026年の現実 — 「どちらか」ではなく「交差点」

最近の構図は単純な二択ではない。要点は次の3つである。

- Stripe（fiat側）とSolana（crypto側）を、Rethベースの決済抽象化レイヤー **Tempo** がつなぐ構図が現れつつある。
- MetaのUSDC決済でも、「自前チェーン」ではなく既存ネットワーク（Solana + Stripe）が選ばれた。
- そのため実務上の判断軸は「SolanaかRust EVMか」より、**どの流通網に賭けるか** へ移っている。

Rust EVM側（このコース）の主戦場は、app-chain（Hyperliquid）、stablecoin決済（Tempo）、L2（Base / OP-Reth）である。Rethは「Stripe of crypto」型インフラの基盤になりつつある。

> **要点**: stablecoinはDeFiの基軸通貨である。stablecoinの決済rail（流通路）を押さえることは、将来のDeFiオンボーディングの道を拓くことでもある。いまはStripe / Tempoが「ユーザーにcryptoを意識させない」抽象化でTradFiを取り込むが、そのrail上にlending・swap・perpsが乗る構造が今後数年の勝負どころになる。Reth/Revmエンジニアは、その **rail側とprotocol側の両方を読み書きできる希少人材** である。

## 次の一歩

役割と相対的な価値が見えたところで、いよいよ **Rust環境を構築** していきましょう。

## まとめ（3行）

- 4 実利 = EVM エコシステム継承 + インフラ層カスタマイズ可能 + EVM 知識業界横断 + Rust 共通の安全性 / 性能。
- Hyperliquid 等が Reth SDK で perp 専用 L1 構築、Solana は monolithic で改造範囲限定、EVM 知識は OP / Base / Arbitrum 等全体に応用。
- 純粋 TPS は Solana 優位な場面あり、Reth 系利点は **カスタマイズ性 + 既存資産 + Rust 安全性**、次は Solana / Anchor からの持ち越し（Solana 経験者向け）。
`,
                },
                {
                  title: 'レッスン5 — Solana / Anchor から Reth へ — 持ち越せるもの',
                  slug: 'solana-to-reth-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 12,
                  xpReward: 20,
                  content: `# レッスン5 — Solana / Anchor から Reth へ — 持ち越せるもの

## 問い

Solana / Anchor 開発経験者向け（経験なければスキップ可）。**Rust の文法と Solana の Anchor フレームワークから、Reth スタックへ持ち越せるもの・できないもの**。アカウントモデルが根本的に違うので頭の切り替えが必要。

## 原理（最小モデル）

- **Rust 言語スキル全部持ち越し.** 所有権 / 借用 / Result / async / trait / マクロ — どちらも Rust なので、言語レベルでは同じ。
- **アカウントモデルが根本違い.** Solana = アカウントごとフラットマップ + tx が事前に読み書きアカウント宣言、Ethereum = コントラクトごとに storage trie + 任意 SLOAD/SSTORE。
- **Anchor の \`#[account]\` macro → Solidity の storage layout.** どちらも「アカウントの構造を宣言」する意図、表現は違うが概念は対応。
- **Solana CPI（Cross-Program Invocation）→ Ethereum CALL/DELEGATECALL.** どちらもコントラクト間呼び出し、Solana は account list 明示 / Ethereum は msg.sender + 借用パターン。
- **並列実行のメンタルモデル.** Solana は静的並列（tx が read/write 集合を事前宣言）、Ethereum block-stm（楽観的並列、衝突検出 + 再実行）。両方とも Rust 並行性スキルが効く。
- **Programs / Smart contracts の違い.** Solana プログラムは upgrade 可能（authority 経由）、Solidity コントラクトは immutable（proxy パターンで擬似 upgrade）、設計時の前提が違う。

## 具体例 + ステップで組み立てる

# Solana / Anchor から Reth へ — 持ち越せるもの (Solana 経験が無ければスキップ)


> 📌 **対象。** 本レッスンは **Solana で ship した経験がある人向け** — Anchor プログラム、Jito MEV bot、Solana プログラムのテスト、Firedancer コントリビュータ、\`solana-program\` か \`anchor-lang\` を触ったことがある人。Solana を触ったことが無いなら、*Rust 環境を整える* に飛んでください。本レッスンに依存する後続レッスンはありません。

多くのカリキュラムは Solidity からの移行を前提にするが、あなたは **異なるランタイムモデル上で Rust を書いてきた** 立場である。本レッスンは、その経験を Reth 側へ翻訳するレイヤーである。

## 1. 持ち越せるもの（実はかなり多い）

Solana で苦労して身につけたスキルは、**Rust EVM スタックでも価値をそのまま保ちます**。

| Solana で身についたスキル | こちらでの着地 |
| :--- | :--- |
| **Rust の所有権 / ライフタイム / 非同期** | 同じである。Solidity から来た人が必要とする「Rust への 3 週間」を飛ばせる。 |
| **低レベルシステムコードを読む筋力** | Reth と Revm は \`solana-program\` より密ですが、*読み方の作法* は同じ — 外から内へ、トレイトの形を信じて、テストで答え合わせ。 |
| **「自分が所有しないエンジン」を扱う感覚** | Firedancer へのパッチや Jito relayer 読解経験があれば、Reth の fork モデルはすぐ読める。 |
| **並列実行への馴染み** | Sealevel で並行状態操作を考えた経験は、Reth の stage パイプラインで関心事を並行実行する場面にそのまま効く。 |
| **\`cargo\` 周辺の手の速さ** | 同じである。workspace、feature、マクロデバッグの \`cargo expand\` までそのまま使える。 |

率直に言えば、**あなたの Rust スキルは EVM 側エンジニアの多くが持っていない資産** である。このカリキュラムで最も重い *中級への橋渡し* の Rust モジュールも、ほぼ復習になる。

## 2. 構造的に違うところ

逆に、ここはモデルが本当に違う点だ。

| 概念 | Solana | Reth / EVM |
| :--- | :--- | :--- |
| **状態** | アカウント単位で事前宣言 (account モデル) | コントラクト単位のストレージ、slot キーの \`SLOAD\` / \`SSTORE\` で動的に |
| **並列性** | アカウント単位、ランタイムがスケジュール (Sealevel) | ブロック内は逐次。ExEx / Reth SDK で並列コンポーネントを後付けできる |
| **プログラム** | グローバルな 1 つのプログラムにアカウントを渡す | 各コントラクトが自分のバイトコードとストレージを持つ |
| **計算予算** | tx あたり線形なガス類似の予算 | EVM ガス、opcode ごとに非自明なコストカーブ |
| **検証** | カスタム syscall を持つ BPF VM | EOF + execution spec tests を持つ EVM |
| **署名者** | 最初から最後まで Ed25519 | 基本は secp256k1、将来は account abstraction で耐量子へ |

いちばん大きな発想転換は、**ストレージがコントラクト単位であり、アカウント単位ではない** 点である。Solana では状態を持つアカウントを渡すが、EVM では **コントラクト自身が状態** になる。Inside Revm の \`Database\` トレイトは丁寧に読む価値があり、「どの AccountInfo に触れるか」への EVM 側の答えになっている。

たとえば、ユーザごとにカウンタを更新する Solana プログラムの等価形は、EVM では \`mapping(address => uint256) counter\` になる。コントラクトがslotキーを所有し、各ユーザのカウンタは \`keccak256(user_address . slot)\` に置かれる。Solana はユーザごとに1アカウント、EVMは全員分を1コントラクトのストレージ trie に詰める、という違いである。

## 3. 2 つのスタックが交わる場所 — HyperEVM、Tempo

次のチェーンは **Solana 流の性能を EVM セマンティクスへ持ち込むため** に作られている。Solana から移る読者にとって自然な着地点である。

- **HyperEVM (Hyperliquid)**: HyperBFT コンセンサスを持つ Reth fork。EVM バイトコードを、Solana 出身者が期待する性能水準で execution layer が走らせる。HyperEVM を読むことは、Solana由来の性能感覚を EVM 側へ持ち込む訓練になる。
- **Tempo**: Stripe が支える Reth ベース決済チェーン。高スループットのステーブルコイン送金向けに設計され、Solana の決済rail経験がほぼ翻訳なしで活きる。
- **MegaETH**: もう1つの Reth ベース高性能チェーンで、Solana 風UXを狙う。

**Solana → Reth は格下げではない。** チェーン専用ランタイムから、次世代高性能 レッスン1/レッスン2 が乗ろうとしている実行エンジンへの移籍である。Rust EVM スタックは、スキルが複利で効く場所である。

## 4. 具体的な文化の違い — source-first か abstraction-first か

Solana 出身者からよく出る論点はここである。

- **Anchor**: 抽象が厚い。フレームワークが SVM、シリアライズ、アカウント検証を隠す。\`#[derive(Accounts)]\` を信じる場面が増え、障害時に本物のSVM挙動へ辿るまで時間がかかる。
- **Firedancer / Jito**: source-first。C を読み、relayer を読み、パッチを当てて再ビルドする。文化は素晴らしいけれど、参加できる範囲が狭い（Firedancer のコントリビューション窓口は事実上閉じていて、Jito はオープンだが Solana 専用）。
- **Reth / Revm / Foundry**: 設計段階から source-first で、しかも **開かれた** コントリビューション窓口を持つ。メンテナ自身が「ここを読んでカスタムノードをshipせよ」という流れを明示し、RethLab もこの文化上に組まれている。

Anchor 抽象が不透明に感じていた人にとって、RethLab はホームに近い。Firedancer / Jito を楽しめたが応用範囲を広げたい人にとって、Rust EVM スタックはその拡大版になる。

## 5. あなた向けに地図を引き直すと

Rust の素地を踏まえた、流し読み・じっくり読みの目安は以下の通りである。

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

Solana のランタイムは優れているが、Solana専用である。Reth は **多くのチェーンが乗る基盤** であり、Hyperliquid、Tempo、OP-Reth、MegaETH、Berachain へ広がり続ける。Rust EVM スタックは、1チェーンではなく広い レッスン1/レッスン2 全体でスキルが複利で効く場所である。

これは Solana を貶す話ではなく、**Reth を読めるエンジニアが希少で、しかも Reth に賭けるチェーンが急増している** という観察である。Solana で鍛えた Rust の直感は、Solidity から移る人より早く、その希少ニッチへ到達させる。

## 次へ

*Rust 環境を整える* を飛ばして直接 *Fundamentals* に向かってもよい（Rustツールチェーンは既にあるはずである）。Foundry / Anvil をまだ触っていなければ、*Rust 環境を整える* を流し読みする手もある。どちらでも先へ進める。

## まとめ（3行）

- 言語レベル（Rust）は全持ち越し、アカウントモデル（フラット vs storage trie）は頭の切り替え必須、CPI ↔ CALL / Anchor → Solidity layout 等の対応関係。
- 並列実行は Solana 静的 vs Ethereum block-stm 楽観的、両方とも Rust 並行性スキル活用、upgrade モデルも違う（Solana 可 / Solidity 擬似）。
- Solana 経験は Rust 力で 8 割持ち越し、次は Reth vs Geth / Alloy vs ethers-rs の置き換え根拠。
`,
                },
                {
                  title: 'レッスン6 — Reth vs Geth / Alloy vs ethers-rs — 置き換えの根拠',
                  slug: 'substitution-case-ja',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 20,
                  content: `# レッスン6 — Reth vs Geth / Alloy vs ethers-rs — 置き換えの根拠

## 問い

Reth は Geth（Go）の置き換えを狙う、Alloy は ethers-rs（先行 Rust ライブラリ）の置き換えを狙う。**なぜ既存があるのに置き換えるか？** 性能 + 設計 + メンテナンスの 3 軸で根拠を整理。

## 原理（最小モデル）

- **Reth vs Geth — 性能差.** Reth の sync は Geth より 2-3 倍速い（実測ベンチ）、Rust の所有権 + ゼロコスト抽象化 + 並列化容易が原因、メモリ使用も少ない。
- **Reth vs Geth — モジュラリティ.** Reth SDK でフルノードを SDK 化、precompile / state machine / consensus を差し替え可能 → Hyperliquid が perp 専用 L1、Tempo が決済 L1 構築、Geth は monolithic で改造範囲限定。
- **Alloy vs ethers-rs — 設計.** Alloy は Network ジェネリック（Ethereum / Optimism / カスタム L2 横断）+ Provider trait + Filler 層状合成、ethers-rs は Ethereum 固定 + 内部ハードコード、拡張性で根本差。
- **Alloy vs ethers-rs — メンテナンス.** ethers-rs は元メンテナが Foundry チーム抜けて停滞、Alloy は Paradigm 中心の活発開発（commit 頻度 + issue 応答）、エコシステムが移行中。
- **置き換えタイミング.** 新規プロジェクトは Reth + Alloy 推奨、既存 Geth / ethers-rs プロジェクトは移行コスト見合いで段階的に、Foundry / Hyperliquid / 主要 rollup は移行済み。

## 具体例 + ステップで組み立てる

# Reth vs Geth / Alloy vs ethers-rs — 置き換えの根拠


プロジェクトの地図は前レッスンで描いた。次の問いはこれである。**なぜチームは古い選択肢から積極的に移行するのか。** Geth は 10 年間 Ethereum を走らせ、ethers-rs は長らく Rust Ethereum ライブラリの定番だった。それでも新しいインフラは Reth と Alloy 上に作られる。その理由を、置き換え1件ずつ見る。

## 1. Reth vs Geth

Geth (Go-Ethereum) は元祖の execution client である。2015 年から mainnet を走らせ続け、現在も execution client シェア 40〜50% を握り、開発チームも強い。**Reth は「より良い Geth」ではない。** Geth が構造的にできないことで価値を出す、別種の設計である。

| 性質 | Geth | Reth | なぜ重要か |
| :--- | :--- | :--- | :--- |
| **言語** | Go | Rust | Cargo workspace で revm をライブラリとして単独利用できる。Geth の execution engine はノードに溶接され再利用しにくい。 |
| **アーキテクチャ** | 強結合 | モジュラな crate (revm、alloy、reth-stages、reth-network、reth-rpc など) | ノード全体ではなく *1つの* crate（例: カスタム executor）だけを fork できる。App-chain / L1 fork パターンの中核である。 |
| **状態ストレージ** | LevelDB ベース、進化中 | MDBX (メモリマップ B+tree) | コンパクション負荷下でも読み取りレイテンシが安定する。Geth は archive node のコンパクション停滞に長く苦戦してきた。 |
| **実行エンジン** | go-ethereum のインタープリター | revm (Rust、ライブラリ志向) | revm は Foundry、Hyperliquid の HyperEVM、Rustベース MEV スタックで再利用される。Geth のインタープリターは Geth 外での消費がほぼない。 |
| **同期戦略** | Snap sync | Staged sync (10 段パイプライン) | バッチ全体で I/O を償却するため、初期同期が速く、カスタムステージで拡張もしやすい。 |
| **拡張 API** | 公式にメンテされた仕組みなし | ExEx (Execution Extensions) — インプロセスの Rust フック | ノード *内側で* ノード速度のインデクサ・MEV ボット・リスクエンジンを動かせ、RPC を経由しません。Geth には等価物がありません。 |
| **チェーン fork** | 困難 (Geth 全体を fork する必要) | 容易 (Reth SDK で 1 コンポーネントだけ差し替え) | Hyperliquid の HyperEVM、Tempo、MegaETH、Base (OP-Reth)、Berachain がこのパターンで作られる。 |
| **再利用範囲** | Geth のコードは Geth が使う | revm、alloy、reth-* crate は 100 超のプロジェクトで再利用 | 触れる Rust EVM ツールの多くは、これら crate のいずれかの上に乗る。 |

決済優先の独自トランザクション順序付けを持つL1を ship する場面を想像してほしい。fork するのはRethで、しかも全体ではない。Reth crate に依存したまま \`Pool\` と \`Payload\` だけを差し替える。Geth なら全コードベースをforkし、長期リベース税と巨大コード保守を抱える。これを Tempo が実践し、前レッスンで挙げた Reth ベース L1 も同型を採る。

**Reth は Geth を退位させるために作られたのではない。** 次世代チェーンが上に乗る *基盤* として作られた。Reth と Geth はそもそも別カテゴリである。

## 2. Alloy vs ethers-rs

ethers-rs は 2020〜2024 年に Rust Ethereum ライブラリの定番だった。2024 年半ば、メンテナ（Georgios Konstantopoulos / Paradigm）が **Alloy 移行を進めるため ethers-rs を deprecate** した。これは美的判断ではなく、ethers-rs が構造的に届かない性質を狙った再設計である。

| 性質 | ethers-rs | Alloy | なぜ重要か |
| :--- | :--- | :--- | :--- |
| **モジュラ性** | モノリシックな crate | 細かい crate 群 | 必要分だけ依存に加えられ、Cargo依存ツリーが縮む。 |
| **非同期スタイル** | \`async-trait\`（呼び出しごとに Box 確保） | ネイティブ async trait + ProviderCall (確保なし) | ホットパス（MEV、RPC）で呼び出しごとの確保が減り体感差が出る。 |
| **マルチチェーン** | Ethereum 専用型 | \`Network\` トレイトで抽象化 | 同じ Provider コードが Ethereum / Optimism / 独自L2で動く。 |
| **型のエルゴノミクス** | 独自型、revmと別系列 | revm の \`Address\`、\`U256\`、\`B256\` をそのまま使用 | alloy + revm + reth で型がそろい、変換ボイラープレートが減る。 |
| **ウォレット / 署名者の合成** | 単一Provider設計に密結合 | \`Signer\` + \`Filler\` を \`ProviderBuilder\` で重ねる | 署名・nonce管理・ガス推定を分離して合成できる。 |
| **手続きマクロ (\`sol!\`)** | 外部 crate、結合は緩い | 第一級、alloy 全体で使われる | Solidity 型を Rust 側でコンパイル時に定義でき、手書きの ABI struct が要りません。 |
| **メンテナンス** | Paradigm 内の 1 人、時間も限定 | Paradigm が予算をつけ、コミュニティも参加 | 開発が活発で、PR の回りが速く、ロードマップも明確。 |

2026年に新しい MEV searcher を書く立場を想像すると、Alloy を選ぶ理由は明確である。(a) revm と型共有できる、(b) クラウドKMSやHWウォレットを独自 \`Signer\` として差し込める、(c) 型パラメータ1つで Optimism / Base / 任意Reth系L2へ展開できる、(d) ethers-rs に Paradigm 由来の新規修正が来ない。**ethers-rs に残る理由は惰性が中心** である。

## 3. 2 つの置き換えに共通するパターン

Geth と ethers-rs が悪いわけではない。Rust EVM エコシステムが若かった時代に、「合成可能性」より「まず動かす」を優先した設計の産物である。

**Reth と Alloy は同じ設計判断を共有する。完全性より合成性である。** どちらも内部を crate として切り出し、下流プロジェクトが混ぜて差し替えられる。Geth と ethers-rs は完成品利用前提、Reth と Alloy は拡張基盤前提で設計される。

これが、このカリキュラム後半が存在する構造的理由である。**続く Inside Revm / Reth / Alloy は、その基盤を読むスキルを教える。** 読めれば作れる。それが Geth と ethers-rs が構造的に提供しにくかったレバレッジである。

このレッスン後に残すべき答えは2つである。決済優先L1チームが Geth ではなく Reth を fork する理由、そして 2026 年の新規 MEV searcher が ethers-rs ではなく Alloy を選ぶ理由である。どちらも上表に答えがある。

## 次へ

本レッスンで Module 0 は完了: レッスン 0 の systems-engineering 枠、プロジェクト map（Reth / Revm / Alloy）、Solana / Solidity onramp、そして本レッスンの substitution case。**Module 1 で Rust をマシンにセットアップ**、ソース読みを始められる状態にする。最初の \`alloy-rs/alloy\` ファイルを開いた瞬間から、レッスン 0 の枠が報われ始める。

## まとめ（3行）

- Reth vs Geth = 2-3 倍速い + SDK モジュラリティ（Hyperliquid / Tempo 等で実例）、Alloy vs ethers-rs = Network ジェネリック + 活発メンテナンス。
- 新規は Reth + Alloy 推奨、既存は移行コスト見合い、Foundry / Hyperliquid / 主要 rollup は移行済み = エコシステムが Rust スタックに動いている。
- なぜ学ぶか（業界トレンド + キャリア複利 + 性能 + 設計）が固まった、次モジュールで Rust 環境セットアップ。
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
                  title: 'レッスン7 — rustup と VS Code の準備',
                  slug: 'setup-rust-ja',
                  type: 'CONTENT',
                  sortOrder: 7,
                  duration: 10,
                  xpReward: 15,
                  content: `# レッスン7 — rustup と VS Code の準備

## 問い

Rust スタックを動かす **最小限の環境準備** — rustup（toolchain manager）+ VS Code + rust-analyzer 拡張機能。「これがないと事実上書けない」3 つだけ揃える。

## 原理（最小モデル）

- **rustup.** Rust の toolchain manager、\`curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh\` の 1 行、\`cargo\` / \`rustc\` / \`rustup\` が \`$PATH\` に。
- **Stable channel.** 標準は stable、Reth は MSRV（最小サポートバージョン）に合わせる、\`rustup update\` で最新化。
- **VS Code + rust-analyzer 拡張.** rust-analyzer = 公式 language server、エラー表示 / 補完 / 型情報 / ジャンプ、これなしでは事実上書けない。
- **便利な追加.** \`Even Better TOML\`（\`Cargo.toml\` 用）、\`CodeLLDB\`（debugger）、\`Error Lens\`（インラインエラー表示）。
- **動作確認.** \`cargo new hello && cd hello && cargo run\` で "Hello, world!" 表示。

## 具体例 + ステップで組み立てる

# rustupとVS Codeの準備

Rustの開発環境は、実は **rustup と VS Code 拡張だけ** で完結する。

## 1. rustupでRustを入れる

公式ツールチェーン管理ツール **rustup** からインストールする。

\`\`\`bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 動作確認
rustc --version
cargo --version
\`\`\`

\`cargo\` は **Rustのパッケージマネージャー＋ビルドツール** である。名前から「ライブラリ管理用」と思われがちだが、実際は **ビルド・テスト・実行をすべてcargoで行う** ため、毎日触ることになる。

## 2. VS Codeに rust-analyzer を入れる

VS Code拡張機能の検索で \`rust-analyzer\` をインストールする。これがないとRust開発は事実上難しい。

- リアルタイムで型エラーを表示
- 自動補完・「ジャンプ・トゥ・デファイン」
- インライン型注釈（変数の上に型が表示される）

> **コツ**: \`Cargo.toml\` を持つフォルダを開かないと rust-analyzer は起動しない。次のステップで作る。

## 3. はじめてのプロジェクトを作る

\`\`\`bash
cargo new hello_reth
cd hello_reth
cargo run
\`\`\`

\`cargo run\` で「\`Hello, world!\`」が表示されれば準備完了である。

## 4. ブラウザですぐ試したい時

何もインストールせずに試したいときは [Rust Playground](https://play.rust-lang.org/) を使える。コピペで実行できる。

次のレッスンでは、Rust構文の最小限を駆け足で押さえてから宿題に挑戦する。

## まとめ（3行）

- 3 つ揃える = rustup + VS Code + rust-analyzer 拡張、\`curl\` 1 行で rustup インストール、\`cargo new hello\` で動作確認。
- 便利追加 = \`Even Better TOML\` + \`CodeLLDB\` + \`Error Lens\`、\`rustup update\` で最新 stable に。
- 環境準備完了、次は Rust クイックリファレンスで頻出文法を一気に。
`,
                },
                {
                  title: 'レッスン8 — Rust クイックリファレンス',
                  slug: 'rust-quick-reference-ja',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 12,
                  xpReward: 20,
                  content: `# レッスン8 — Rust クイックリファレンス

## 問い

Reth / Revm / Alloy のコードを読むのに頻出する Rust 文法を **1 レッスンで一気に**。網羅的でなく「これだけ知っていれば 80% 読める」最小セット。

## 原理（最小モデル）

- **変数.** \`let x = 5;\`（不変、デフォルト）/ \`let mut y = 10;\`（可変）/ \`const PI: f64 = 3.14;\`（コンパイル時定数）。
- **関数.** \`fn add(a: i32, b: i32) -> i32 { a + b }\`、最後の式が戻り値（\`;\` なし）、\`return\` も使えるが慣用的でない。
- **所有権.** \`let s1 = String::from("hello"); let s2 = s1;\` で s1 ムーブ（使用不可）、\`&s1\` で借用、\`&mut s1\` で可変借用。
- **Result / Option / \`?\`.** \`Result<T, E>\`（成功 / 失敗）+ \`Option<T>\`（あり / なし）+ \`?\` でエラー早期 return。
- **\`if\` は式.** \`let x = if cond { a } else { b };\` 三項演算子なし、\`if\` 自体が値を返す。
- **\`match\`.** パターンマッチ、全パターン網羅必須、\`_\` でデフォルト。
- **struct / enum.** \`struct Point { x: f64, y: f64 }\` / \`enum Color { Red, Green, Blue }\`、\`impl Point { fn new(...) -> Self { ... } }\` でメソッド。
- **trait.** 共有インターフェース、\`impl Display for Point { ... }\` で実装、\`<T: Trait>\` でジェネリック境界。
- **async / await.** \`async fn fetch() -> Result<...>\`、\`.await\` で完了待ち、Tokio ランタイム上。
- **マクロ.** \`println!\` / \`vec!\` / \`format!\` / \`assert_eq!\` 等、\`!\` 付き、コンパイル時展開、関数より柔軟。

## 具体例 + ステップで組み立てる

# Rustクイックリファレンス

これから書くコードに登場するRust構文を一気に押さえる。「Rustを学ぶ」専用コースは別にあるが、**Reth/Revm/Alloyを学ぶ中でRustも自然に身につく** よう、必要箇所で都度説明する。

## 1. 変数：\`let\` と \`let mut\`

Rustの変数はデフォルトで **不変（immutable）** である。書き換えるときは \`mut\` を付ける。

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

> 「\`&str\` と \`String\` の違い」は最初に混乱しやすい。今は **「\`&str\` は他人の家を覗く感じ、\`String\` は自分の家を持つ感じ」** だけ覚えれば十分である。所有権は次のティアで詳しく扱う。

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

Rustの値はメソッドを持つ。例:

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

可変長の配列である。スマートコントラクトのスタックやトランザクションリストなど、Rust EVMコードで頻出する。

\`\`\`rust
let mut v: Vec<i64> = Vec::new();
v.push(10);
v.push(20);
let last = v.pop();   // Some(20)
println!("{:?}", v);  // [10]
\`\`\`

\`{:?}\` は **デバッグ表示** 用のプレースホルダーである。

## 8. これだけ覚えればOK

ここまでが Reth/Revm/Alloy の最初のコード読解に必要な「最小限の Rust」である。次の宿題でこれらをすべて使う。

| 構文 | 一言 |
| :--- | :--- |
| \`let x = ...\` | 不変な変数 |
| \`let mut x = ...\` | 可変な変数 |
| \`fn name(arg: T) -> R {}\` | 関数定義 |
| \`x.method()\` | メソッド呼び出し |
| \`if .. else ..\` | 条件分岐（式としても使える） |
| \`println!("{}", x)\` | 表示 |
| \`Vec<T>\` | 可変長配列 |

> 完璧に覚える必要はない。**書きながら少しずつ思い出す** のが正解である。

## まとめ（3行）

- 頻出文法 = 変数 / 関数 / 所有権 / Result / \`?\` / \`if\` 式 / \`match\` / struct / enum / trait / async / マクロ。
- 「これだけ知っていれば 80% 読める」最小セット、網羅的でなく即実用、不明箇所は doc.rust-lang.org で都度確認。
- 次は最初の宿題「0x チェック」、Rust Playground で実際に書いてみる。
`,
                },
                {
                  title: 'クイズ — 小さな宿題：0xチェック',
                  slug: 'first-homework-ja',
                  type: 'QUIZ',
                  sortOrder: 9,
                  duration: 15,
                  xpReward: 25,
                  content: `# クイズ — 小さな宿題：0xチェック

## 問い

**最初の Rust プログラム**を書く。文字列として与えられた Ethereum アドレスが \`0x\` で始まっているかを判定。\`&str.starts_with\` + \`.len()\` + \`if/else\` + \`&&\` の組み合わせ。

## 原理（最小モデル）

- **関数シグネチャ.** \`fn is_valid_address(addr: &str) -> bool\`、\`&str\` で借用受け取り、\`bool\` で結果返却。
- **\`addr.starts_with("0x")\`.** \`&str\` の標準メソッド、\`has_prefix\` は存在しない、\`contains\` は部分一致で先頭判定にならない。
- **長さチェック.** \`addr.len() == 42\`、Ethereum アドレス = 40 hex 桁 + \`0x\` プレフィックスで合計 42 文字。
- **慣用句.** \`addr.starts_with("0x") && addr.len() == 42 && addr[2..].chars().all(|c| c.is_ascii_hexdigit())\` で 3 条件 AND。
- **Alloy なら.** \`addr.parse::<Address>()\` で全部 Alloy に任せる、本番コードはこれ。
- **Rust Playground.** https://play.rust-lang.org/ で Alloy なしでも Rust 試せる、URL シェアでスニペット共有。

## 具体例 + ステップで組み立てる

# 小さな宿題：0xチェック

最初の課題はとてもシンプルである。

> 文字列として与えられたEthereumアドレスが、\`0x\` から始まっているかをチェックして、正しい／不正のメッセージを表示する。発展：長さも 42 文字かを確認する。

## 必要な要素

これが「Rust EVMスタック流」で最初のRustプログラムになる。Rustプログラム全般で使う3つの基本要素:

1. **変数** — \`let\` と \`let mut\`（前回扱いました）
2. **メソッド** — Rust の文字列には組み込みメソッドがあり、先頭一致をチェックするものもある。**stdドキュメントで確認する**: [\`&str\` ドキュメント](https://doc.rust-lang.org/std/primitive.str.html)
3. **条件分岐** — \`if\` / \`else\`

Ethereum アドレスの **長さ** も把握しておく必要がある。分からなければ調べてみてください（ヒント：40 hex 文字 + \`0x\` プレフィックス）。

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

自分なりのコードを書いて動かしたら、下のクイズへ進む。各問は具体的なRust慣用表現を問うため、自分で書いた経験があれば解けるはずである。

## まとめ（3行）

- 関数 \`is_valid_address(addr: &str) -> bool\` = \`starts_with("0x") && len == 42 && all hex digits\`、3 条件 AND。
- Alloy 本番は \`addr.parse::<Address>()\` で全部任せる、Rust Playground で Alloy なし試行可能。
- 5 問でこの宿題と Rust 基本文法を確認、次は初級まとめクイズ。
`,
                  quizQuestions: [
                    {
                      "question": "文字列 `address` が `\"0x\"` で始まっているかをチェックする Rust の式として正しいのは？",
                      "options": [
                        "`address.has_prefix(\"0x\")`",
                        "`address.starts_with(\"0x\")`",
                        "`address.contains(\"0x\")`",
                        "`address[0..2] == \"0x\"`"
                      ],
                      "correctIndex": 1,
                      "explanation": "`starts_with` が標準の `&str` メソッドである。`has_prefix` は存在しない。`contains` は部分一致であり、先頭判定にはならない。`&str` の直接スライスはUTF-8文字境界でないとパニックしうるため、汎用チェックには危険である。"
                    },
                    {
                      "question": "Ethereum アドレス文字列の完全な妥当性チェックに必要なのは？",
                      "options": [
                        "`0x` プレフィックスの確認だけ",
                        "`0x` プレフィックス + 文字数 42 + プレフィックス以降がすべて hex 数字",
                        "40 文字 + すべて hex 数字",
                        "不要 — `&str` ではなく `Address` 型で受ければよい"
                      ],
                      "correctIndex": 1,
                      "explanation": "Ethereum アドレスは 40 hex 桁（20 バイト）+ `0x` プレフィックスで合計 42 文字である。3 点すべてを確認することで不正入力を弾ける。本番Rust EVMコードでは `address.parse::<Address>()` でAlloyにパースを任せるのが一般的である。"
                    },
                    {
                      "question": "Rust で `if condition { a } else { b }` を「式」として使えるのはなぜ重要？",
                      "options": [
                        "Rust には三項演算子（`?:`）が無いので、これが条件付きの値を表現する標準手段だから",
                        "`match` より速いから",
                        "セミコロンを書かずに済むから",
                        "borrow checker のために必須だから"
                      ],
                      "correctIndex": 0,
                      "explanation": "Rust は意図的に三項演算子を持たない。代わりに `if/else` 自体が値を返す式なので、`let x = if cond { a } else { b };` と書ける。言語を小さく、文法を一様に保つ設計判断である。"
                    },
                    {
                      "question": "Alloy の `address!(\"0x...\")` マクロが、ランタイムでパースする方法より優れている点は？",
                      "options": [
                        "ランタイムで高速になる",
                        "コンパイル時にアドレスリテラルを検証するため、不正なアドレスはコンパイルが通らない",
                        "Solidity ABI 互換性のために必須",
                        "ABI バイト列を自動でエンコードする"
                      ],
                      "correctIndex": 1,
                      "explanation": "`address!` はコンパイラ内で動くマクロで、コンパイル時にhex数字と長さを検証する。1桁でもタイポがあればビルドが通らず、送信時のランタイムエラーより安全である。"
                    },
                    {
                      "question": "`let mut x = 5;` と `let x = 5;` の違いは？",
                      "options": [
                        "`mut` の方がアクセスが速い",
                        "`mut` が無いと再代入できない（`x = 6` はコンパイルエラー）",
                        "`mut` が無いと `let x = ...` でのシャドーイングができない",
                        "機能的な違いはない"
                      ],
                      "correctIndex": 1,
                      "explanation": "Rust の変数はデフォルトで不変であり、`mut` が再代入を許可する。シャドーイング（別の `let` で同名変数を再宣言）は `mut` と独立しており、不変変数でも可能である。"
                    }
                  ],
                },
                {
                  title: 'クイズ — 初級まとめ',
                  slug: 'beginner-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 10,
                  duration: 10,
                  xpReward: 25,
                  content: `# クイズ — 初級まとめ

## 問い

Reth・Revm・Alloy の役割と立ち位置を理解できたか確認する。**5 問で 11 レッスンの基礎を定着**。Reth = ノード、Revm = 実行エンジン、Alloy = 型基盤、学習順は Alloy → Revm → Reth。

## 原理（最小モデル）

- **3 プロジェクト復習.** Reth = フルノード（最上層、binary）/ Revm = 実行エンジン（中間層、ライブラリ）/ Alloy = 型 + RPC + 署名（最下層、primitive）。
- **Revm 採用理由.** モジュラー設計 + Rust 性能 + 安全性 = Foundry / Reth / OP-Reth / zkVM / MEV ボット / Hyperliquid が共通基盤。
- **学習順.** Alloy → Revm → Reth（ミクロからマクロ）、依存的にも教育的にもこの順序が挫折しにくい。
- **VS Code 拡張.** rust-analyzer（公式 LSP）、これなしでは事実上書けない。
- **Reth vs Solana.** EVM 系の利点はカスタマイズ性 + 既存資産 + Rust 安全性、**「常に高速」は誤り**（純粋 TPS では Solana 優位場面あり）。

## 具体例 + ステップで組み立てる

# 初級まとめクイズ

Reth・Revm・Alloyの役割と立ち位置を理解できたか確認する。

## まとめ（3行）

- 11 レッスン完走、3 プロジェクト役割 + Revm 採用理由 + 学習順 + 環境準備 + Solana 比較の基礎定着、次は Bridge to Advanced で中級への橋渡し。
- Bridge to Advanced 後は 3 中級コース（Inside Revm / Inside Reth / Inside Alloy）+ 各 Advanced + Expert で深掘り、Foundry も Solidity 側の入口。
- 初級完走、コードを書く動機と語彙が揃った、次は手を動かす段階へ。
`,
                  quizQuestions: [
                    {
                      "question": "Reth、Revm、Alloyの役割の組み合わせとして正しいものは？",
                      "options": [
                        "Reth=ライブラリ群、Revm=ノード、Alloy=実行エンジン",
                        "Reth=ノード、Revm=実行エンジン、Alloy=ライブラリ群（型・RPC・署名）",
                        "Reth=実行エンジン、Revm=ノード、Alloy=ウォレット",
                        "3つは全て同じプロジェクトの別名"
                      ],
                      "correctIndex": 1,
                      "explanation": "Rethは完成品（フルノード）、Revmは実行エンジン（EVM本体）、Alloyは型やRPC、署名などの基盤ライブラリ群である。"
                    },
                    {
                      "question": "なぜRevmが Foundry や Hyperliquid に選ばれているのでしょうか？",
                      "options": [
                        "世界唯一のRust製EVMだから",
                        "モジュラーなライブラリとして設計され、カスタマイズしやすく性能が高いから",
                        "Solidityがコンパイル不要で動くから",
                        "Ethereum Foundation が公式に開発しているから"
                      ],
                      "correctIndex": 1,
                      "explanation": "Revmは「部品として使える」設計と、Rustによる高速さ・安全性を兼ね備えるため、Foundry・OP-Reth・zkVM・Hyperliquidなどで幅広く採用される。"
                    },
                    {
                      "question": "このコースで推奨される学習の順番は？",
                      "options": [
                        "Reth → Revm → Alloy（マクロからミクロへ）",
                        "Alloy → Revm → Reth（ミクロからマクロへ）",
                        "Revm → Alloy → Reth",
                        "好きなところから自由に"
                      ],
                      "correctIndex": 1,
                      "explanation": "まず型とRPC（Alloy）→ 実行エンジン（Revm）→ ノード全体（Reth）と進むのが、最も挫折しにくい順番である。"
                    },
                    {
                      "question": "Rustの開発環境で「これがないと事実上書けない」と紹介されたVS Code拡張は？",
                      "options": [
                        "Rust Helper",
                        "rust-analyzer",
                        "cargo-vscode",
                        "Rustacean"
                      ],
                      "correctIndex": 1,
                      "explanation": "rust-analyzerは公式の言語サーバーであり、エラー表示・補完・型情報・ジャンプ等を提供する。"
                    },
                    {
                      "question": "Solanaと比較したとき、Reth系（Rust EVM）の主な「実利」として正しくないものは？",
                      "options": [
                        "EVMエコシステムの既存資産（ウォレット、ツール）をそのまま流用できる",
                        "インフラ層をアプリ向けに最適化（カスタマイズ）できる",
                        "コンセンサスを書かずに済むので、Solanaより常に高速になる",
                        "EVM互換チェーン全体に知識を応用しやすい"
                      ],
                      "correctIndex": 2,
                      "explanation": "「常に高速」は誤りである。純粋TPSではSolanaが優位な場面も多く、Reth系の利点は「カスタマイズ性」「既存資産」「Rustによる安全性」にある。"
                    }
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
