import { PrismaClient } from '@prisma/client';

export async function seedRethBridgeToAdvancedJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'evm', 'rust', 'bridge'];

  await prisma.course.create({
    data: {
      slug: 'reth-bridge-to-advanced-ja',
      title: 'スタックを読む — 中級への橋渡し',
      description:
        'Beginner ティアの Rust と Alloy の基礎は固まった。でも次の Alloy/Revm/Inside Reth のソース読みは依然として歯が立たない。このコースがそのギャップを埋めます。EVM をバイト単位で（ディスパッチループ・ワールドステート・コールフレーム・reorg）、そして Reth/Revm のソースが暗黙の前提とする中級 Rust（generics・dyn・Arc・unsafe・macro_rules）。',
      difficulty: 'BEGINNER',
      duration: 100,
      xpReward: 200,
      track: 'reth-bridge-to-advanced',
      tags,
      isPublished: true,
      sortOrder: 120,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'EVM をバイト単位で',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Solidityからバイトコードへ — ディスパッチループ',
                  slug: 'bytecode-dispatch-loop-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# Solidityからバイトコードへ — ディスパッチループ

> 🧭 **このレッスンの位置づけ:** **VM 層のディスパッチループ** に踏み込む — すべての EVM 実行の中心にある for ループ。Inside REVM の custom-opcodes-table 回が後ほど、同じループの「関数ポインタテーブル」設計を内側から開いていく。

Solidity を書いてきた。Foundry でデプロイとテストもした。でも、デプロイ後の EVM は **実際に何をやっているのか?** このレッスンは1段階下のレイヤー — バイトの世界 — に降りていきます。

これが 中級レッスンが暗黙の前提にしているレイヤー。これがないと \`revm/crates/interpreter\` のソースは雑音にしか読めません。

## Solidity が変身する先

Solidity コントラクトをコンパイルすると、出力は **bytecode** — 文字通りバイトの列。実際のデプロイ済みコントラクトの一部：

\`\`\`
0x60 0x80 0x60 0x40 0x52 0x34 0x80 0x15 0x60 0x10 0x57 ...
\`\`\`

各バイトは：

- **opcode**（EVM が知っている命令）
- ある種の push opcode に続く **リテラル値**

最初のバイト \`0x60\` は \`PUSH1\` opcode。2番目のバイト (\`0x80\`) は push する 1 バイトのリテラル。

次の \`0x60 0x40\` — もう一度 PUSH1、リテラル \`0x40\`。
次の \`0x52\` — \`MSTORE\` (スタックトップ 2 つをメモリへ書き込み)。

魔法ではない。これは EVM 版の x86 機械語 — フラットなバイト列で、ランタイムにとって特定の意味を持つ。

## EVM はそのバイト列で何をやるか

EVM は **program counter (PC)** — 現在のバイトを指す整数 — を持っています。コアループ：

\`\`\`
loop {
    let opcode = bytecode[pc];                 // 1 バイト fetch
    let handler = instruction_table[opcode];   // O(1) 配列参照
    handler(stack, memory, gas, ...);          // 実行
    pc = pc + 1;                               // (または jump)
    if halted { break; }
}
\`\`\`

これが EVM の全部。擬似コード 3 行。

面白い部分：

1. **\`instruction_table\`** — **256 エントリの配列**（バイト値 0x00–0xFF それぞれ 1 スロット）。各スロットは opcode ハンドラへの関数ポインタ。
2. **PC 管理** — ほとんどの opcode は PC を 1 進める。ただし：
   - \`PUSH1\` は 2 進む（リテラル 1 バイトをスキップ）。\`PUSH32\` は 33 進む。
   - \`JUMP\` と \`JUMPI\` は PC を任意の値（分岐先）に設定。
3. **Halt** — \`STOP\`、\`RETURN\`、\`REVERT\`、\`INVALID\`、**Out-Of-Gas** すべてループを break する。ただし結果（成功 / 失敗 / 状態巻き戻し / 巻き戻しなし）が異なる。

## あなたが使ったことのある opcode: ADD (\`0x01\`)

ADD はスタックトップ 2 つを取って加算、結果を push する。擬似コード：

\`\`\`
fn add(stack, gas) {
    gas.charge(3);                  // ADD は固定 3 ガス
    let a = stack.pop();
    let b = stack.pop();
    stack.push(a.wrapping_add(b));  // mod 2^256、panic しない
}
\`\`\`

3 つの重要な詳細：

- **ガス**: 各 opcode はガスを払う。ADD は固定 3。SLOAD は動的（cold = 2100, warm = 100）。実行中の Out-of-gas はフレームを halt させる。
- **\`wrapping_add\`**: EVM の演算は mod 2²⁵⁶。\`U256::MAX + 1 = 0\`。例外なし。Solidity ≥ 0.8 はオーバーフローチェックを **EVM の上に** 追加したが、根底の ADD opcode はラップする。
- **スタック規律**: pop, pop, push。スタックは 1 縮む。EVM スタックは 1024 アイテム上限、オーバーフローは halt。

## bytecode の出どころ

デプロイ済みコントラクトには 2 つの bytecode がある：

| 部分 | いつ走る | 何をする |
| :--- | :--- | :--- |
| **コンストラクタ (init code)** | デプロイ時に 1 度 | ストレージ初期化、runtime code を返す |
| **runtime code** | コントラクトへの各 call ごと | dispatch ロジック + あなたの関数群 |

Foundry のテスト出力で「creation code」が出てくる時、それが init code。runtime code が \`eth_getCode(address)\` の返り値。

## 図

\`\`\`
bytecode: 0x60 0x80 0x60 0x40 0x52 0x34 0x80 ...
                 │
                 │   PC = 0
                 ▼
            ┌────────────┐
            │ バイト fetch│  ← bytecode[PC] = 0x60
            └────────────┘
                 │
                 ▼
       ┌────────────────────┐
       │  instruction_table │  ← table[0x60] = fn push1
       │     [0x00..0xFF]   │
       └────────────────────┘
                 │
                 ▼
            ┌────────────┐
            │   push1    │  ← 実行: リテラル読んでスタックへ push
            └────────────┘
                 │
                 ▼
              PC += 2     ← (opcode 1 + リテラル 1)
\`\`\`

halt opcode に当たるか、ガス枯渇か、無効 opcode に出会うまで繰り返し。

## なぜ中級で重要か

中級コースで \`revm/crates/interpreter/src/instructions/arithmetic.rs\` を開くと、こう書いてあります：

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

このレッスン抜きだと「何かの Rust 関数」にしか見えない。本レッスンを経た目で見れば：

- これは **256 エントリ命令テーブルのスロット 0x01 にある関数ポインタ**。
- インタープリタループが **bytecode から 0x01 を取り出して、これを呼び出した**。
- 関数は 1 つ pop し (\`popn_top!([op1])\`)、新しいトップへの *可変参照* (\`op2\`) を取得し、\`op1 + op2\` を参照経由で直接書き込む。**pop-pop-push ではなくメモリ書き込み 1 回**。これは最適化だが、セマンティクスは上の擬似コードと同一。

Rust ソースは **擬似コードそのもの** をやっている — キャッシュと CPU 向けに最適化されているだけ。

## なぜ \`match\` ではなく配列なのか

妥当な代替案はこうなる：

\`\`\`rust
match opcode {
    0x01 => add(...),
    0x02 => mul(...),
    // 254 個の arm
}
\`\`\`

なぜ関数ポインタの配列が選ばれているか？

- **予測可能なパフォーマンス**: 配列アクセスは CPU 命令 1 つ。\`match\` は分岐ツリーかジャンプテーブルにコンパイルされる — 大抵速いが、配列は *常に* 速い。
- **コンパイル時構築**: 256 エントリのテーブルは \`const fn\` でコンパイル時に組める。実行時セットアップコストゼロ。
- **カスタマイズ容易**: フォークは **1 スロット** を置き換えるだけでカスタム opcode を追加できる（中級レッスン 2 で出てきます）。

## 読み物リスト — 中級前にやること

1. **[evm.codes](https://www.evm.codes) を開いて** クリックして回る。各 opcode、ガスコスト、スタック効果。ブックマーク必須。
2. **[Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf) の EVM セクション**、9–13 ページをスキム。通読しなくていい。ループと opcode の形式定義を見るだけ。見た目より読みやすい。
3. **1 行の Solidity コントラクトを \`forge build\` でコンパイル**。\`out/Contract.sol/Contract.json\` を開いて \`bytecode.object\` を見る。認識できるバイト (PUSH, MSTORE, JUMP) を探す。

## このレッスンで持ち帰るもの

- EVM は **バイト駆動の dispatch ループ**: バイトを fetch、256 スロットの関数テーブルを引く、ハンドラを実行、PC を進める。
- 各 opcode は **決まった規約** を持つ小さな Rust 関数（Revm の場合）: スタック・メモリ・ガス・必要ならストレージに触れて、制御を返す。
- 中級レッスン 1 で見るすべての詳細（\`add<IT, H>\`、命令テーブル、PC、halt）はこのモデルに直接マッピングされる。

中級を始めたら、最初のレッスンで **まったく同じ** \`add\` 関数が出てきます。驚くことは何もない — あなたがすでに理解している中身の、本番グレードの実装を読むだけです。

## 📺 関連動画

\`\`\`youtube
RxL_1AfV7N4 | EVM: From Solidity to byte code, memory, and storage
\`\`\`
`,
                },
                {
                  title: 'メモリ・ストレージ・ワールドステート',
                  slug: 'memory-storage-world-state-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# メモリ・ストレージ・ワールドステート

> 🧭 **このレッスンの位置づけ:** **VM 層と DB 層の境目** — コールフレームのメモリ、コントラクトのストレージ、world state — を導入する回。Inside REVM の \`Database\` トレイトが後で抽象化する 3 つの層を、ここで頭に入れておく。

dispatch loop で opcode が *何* かは見えました。ほとんどの opcode は 4 つのストアのうちの 1 つに触れます。本レッスンではそれらを順に見ていきます — そして Solidity が隠しているけれど 中級レッスンが前提とするワールドステートのモデルも。

## 4 つのストア

| ストア | 寿命 | コスト形状 | Solidity 表面 |
| :--- | :--- | :--- | :--- |
| **Stack** | 1 コールフレーム | 安い (3 ガス / op) | 暗黙 |
| **Memory** | 1 コールフレーム | 安いが二次曲線で増加 | \`memory\` キーワード |
| **Calldata** | 1 コールフレーム、読み取り専用 | 読み取り安い | 関数引数 |
| **Storage** | 永続 (コントラクトごと) | 高い (cold = 2100, warm = 100) | 状態変数 |

各ストアが固有の opcode を持ちます。混同するのは Solidity 開発者の最頻バグの 1 つ。

## Stack — EVM の主要スクラッチ空間

すでに会いました。最大 1024 アイテム、各 32 バイト (1 EVM word)。算術 / 比較 / 論理の各 opcode はスタックトップから読み、トップに書き戻します。

スタックオーバーフロー (深さ > 1024) とアンダーフロー (空スタックから pop) はどちらもフレームを halt させます。

## Memory — リニア、伸縮、フレームローカル

メモリは **バイトのフラット配列**。オフセット 0 からアドレス指定、必要に応じて伸びる。2 つの opcode が中心：

- \`MLOAD offset\` → memory[offset..offset+32] から 32 バイト読み込み、スタックへ push
- \`MSTORE offset value\` → スタックから 32 バイトの値を memory[offset..offset+32] へ書き込み

(\`MSTORE8\` は 1 バイト書き込み。\`MCOPY\` はメモリ間コピー。)

重要なポイントが 2 つ：

### 1. メモリは要求時に伸びる — そしてその対価を払う

オフセット 1000 に書き込もうとして現在のメモリサイズが 64 バイトなら、EVM は **書き込み前にメモリをオフセット 1000 まで拡張** します。拡張はガスを消費し、**32 KB を超えると二次曲線**：

\`\`\`
gas_cost(size_in_words) = 3 × words + words² / 512
\`\`\`

これが長いバイト配列操作が一気に高くなる理由。1 MB のメモリ拡張は **空間だけ** で約 200 万ガス、書き込む前に。

### 2. メモリはフレーム終了で消える

\`CALL\` がリターンしたり \`STOP\` が halt したりすると、メモリは消えます。次の call は新しい空のメモリをオフセット 0 から得ます。

## Calldata — 不変の入力バッファ

コントラクトを呼ぶとき、calldata は入力バイト — 関数セレクタ (4 バイト) と ABI エンコード済み引数。**読み取り専用** で、オフセット 0 からアドレス指定。

\`\`\`
CALLDATALOAD offset → calldata から 32 バイトロード
CALLDATASIZE        → calldata サイズを push
CALLDATACOPY        → calldata をメモリへコピー
\`\`\`

Calldata 読み取りは安く、拡張コストもなし — call 作成時に既に支払い済み。

## Storage — 永続マップ

ワールドステートを理解する上で最重要のストア。

**各コントラクトは自分のストレージを持ち**、**\`U256\` キーから \`U256\` 値へのマップ** としてモデル化されます：

\`\`\`
storage[address]: HashMap<U256, U256>
\`\`\`

キーは 32 バイトワード。値は 32 バイトワード。固定スロットはない — \`U256\` 空間内のすべてのキーが *仮想的に* 存在し、デフォルトはゼロ。

2 つの opcode：

- \`SLOAD key\` → storage[key] を読み、スタックへ push
- \`SSTORE key value\` → storage[key] へ value を書き込み

### Cold vs warm — ガストラップ

トランザクション内で同一スロットへの最初の \`SLOAD\` は **cold** — 2100 ガス。
同 tx 内の同一スロットへの後続 \`SLOAD\` は **warm** — 100 ガス。

なぜか? 実装はそのスロットが触られたか確認する必要があり (Merkle Patricia Trie ルックアップ) — 後続アクセスはキャッシュされる。

これは **EIP-2929**、後付けで Ethereum に追加されたもの。攻撃者が cold スロットへの \`SLOAD\` 連発で安くネットワークを DoS できると判明したから。cold/warm 区別が修正策。

### Solidity がストレージをどう使うか

Solidity はコンパイル時にストレージスロットを割り当てます。\`uint256 private balance\` はスロット 0、\`mapping(address => uint256) balances\` は \`keccak256(address . slot_index)\` 等。Solidity は raw \`U256 → U256\` マップ **の上で** スロット割り当てをやっている。

中級レッスン 3 (Database トレイト) で：

\`\`\`rust
fn storage(&mut self, address: Address, index: StorageKey)
    -> Result<StorageValue, Self::Error>;
\`\`\`

— このシグネチャは **上のモデルそのまま**。トレイトは「コントラクトアドレスとスロットキーを与えれば U256 値を返す」と言っている。それがストレージマップ。

## ワールドステート — どこにでもアカウント

ここまで 1 コントラクトを記述してきた。Ethereum のワールドステート全体は **アドレスからアカウントへのマップ**：

\`\`\`
world_state: HashMap<Address, Account>

struct Account {
    nonce: u64,
    balance: U256,
    code_hash: B256,        // このアカウントのバイトコードの keccak256 (EOA は空)
    storage_root: B256,     // このコントラクトのストレージ trie のルート
}
\`\`\`

Ethereum のすべてのアカウント — あなたのも、各コントラクトも、各ウォレットも — このマップの 1 行。興味深いフィールド：

- **\`code_hash\`**: 外部所有アカウント (EOA) なら空、コントラクトならバイトコードを指す
- **\`storage_root\`**: *このコントラクトの* ストレージマップの Merkle ルート (Expert で扱う trie)

トランザクションを送ると、このマップを更新している: nonce のインクリメント、残高の振替、コントラクトストレージの変更。

Revm の \`Database\` トレイトで、\`fn basic(&mut self, address: Address)\` はアドレスに対する \`Option<AccountInfo>\` を返す。それがこのマップでの行ルックアップ。

## 全部まとめると

Solidity で書いた 1 つの \`SSTORE\` がこうなる：

1. Solidity がスロットキーを計算 (例: \`keccak256(msg.sender . 5)\`)
2. コンパイラが \`PUSH32 <key>\` の後に \`SSTORE\` を吐く
3. EVM が SSTORE を実行: cold → 22100 ガス (書き込み + 初回触れ)、warm → 5000 ガス
4. インタープリタが \`Database\` のストレージ書き込みパスを呼ぶ
5. このコントラクトの MPT が更新され、最終的に Account の \`storage_root\` が変わり、最終的にグローバル \`stateRoot\` が変わる

Solidity 1 行とチェーンの state root の間に 5 つのレイヤー。**5 つすべてが中級と Expert で読むソースの中にある**。

## 読み物リスト

1. **[evm.codes](https://www.evm.codes) を開いて** MLOAD・MSTORE・SLOAD・SSTORE・CALLDATALOAD を探す。ガスメモを読む。
2. **[Etherscan](https://etherscan.io) で実コントラクトを探し**、バイトコードを見る、\`SLOAD\` (\`0x54\`) と \`SSTORE\` (\`0x55\`) のバイトを検索。至る所にある。
3. **Foundry で** 1 つの \`uint256\` 状態変数を持つコントラクトを書く。1 関数内で 2 度読む。\`forge test --gas-report\` でガス計測。2 度目の読みが約 2000 ガス安い — それが cold-vs-warm の実例。

## このレッスンで持ち帰るもの

- Stack・memory・calldata・storage は **4 つの異なるストア** で、寿命・コスト・API が異なる。
- **Storage** はコントラクトごとの \`U256 → U256\` マップ — Solidity のスロット割り当てはその上のパッキング。
- **ワールドステート** は \`Address → Account\` マップ。各 Account が自分のストレージ trie を指す。
- Revm \`Database\` トレイトの 3 つのコアメソッド (\`basic\`、\`code_by_hash\`、\`storage\`) は **このワールドステートモデルを直接ミラー** している。

中級レッスン 3 で Database トレイトを見たとき、これがまさにこの絵を Rust トレイトで表現したものだと認識できるはず。`,
                },
                {
                  title: 'ガス機構の深掘りとコールフレーム',
                  slug: 'gas-call-frames-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# ガス機構の深掘りとコールフレーム

> 🧭 **このレッスンの位置づけ:** **VM の計量モデル** — ガス、コールフレーム、revert — を導入する回。CPU の命令カウント予算と入れ子の関数フレームを合わせた構造を、敵対的実行向けに制約したかたち。

「ガスはお金がかかる」は知っているはず。本レッスンではもう 1 段掘り下げる — ガスが実際どこへ消えるか、そして 1 つのトランザクションがどう **コールフレーム** のツリーを生成するか、各フレームが独自のコンテキストを持つこと。

両トピックとも、カスタム opcode・precompile・ExEx の 中級レッスンで前提知識として扱われます。

## ガス — 3 カテゴリ

各トランザクションのガス予算は 3 通りに消費される：

### 1. 内在ガス (intrinsic) — opcode 実行前に支払う

ただ *トランザクションである* だけで：

- **21,000 ガス** の固定 tx 料
- **calldata のゼロバイトあたり +4 ガス**
- **calldata の非ゼロバイトあたり +16 ガス**
- コントラクト作成 tx なら **+32,000 ガス**

これは最初の opcode が実行される *前* に支払う。tx に内在ガスを賄うガスもないなら、ブロックに入れない。

### 2. opcode ごとのガス — 固定と動的

ほとんどの opcode は **固定コスト**: ADD = 3、MUL = 5、JUMP = 8、MLOAD = 3。

少数は **コンテキスト依存の動的コスト**：

| Opcode | 動的の理由 |
| :--- | :--- |
| \`SLOAD\` | Cold (2100) vs warm (100) — その tx でスロットが触れられたかに依存 |
| \`SSTORE\` | Cold-write、warm-write、ゼロからの書き、ゼロへの書き、すべて別価格 |
| \`CALL\` / \`CALLCODE\` / \`DELEGATECALL\` / \`STATICCALL\` | 呼び先アカウントの cold/warm、value 転送、アカウント作成に依存 |
| \`EXP\` | 大きな指数ほど高い |
| \`KECCAK256\` | 大きな入力ほど高い |
| \`CALLDATACOPY\` / \`CODECOPY\` / \`MCOPY\` | 大きなコピーほど高い |
| メモリに触る opcode | メモリを伸ばすなら拡張ガスを払う |

### 3. リファンド — 戻ってくるガス

一部の操作は *リファンド* される：

- **スロットをクリアする SSTORE** (非ゼロスロットにゼロを書く): 4800 ガスリファンド
- **SELFDESTRUCT** (レガシー、EIP-6780 でほぼ削除): 24,000 ガスリファンド

リファンドは **gas_used / 5** にキャップされる (EIP-3529)。小さい tx で千個のスロットをクリアしてもシステムを欺けない。

## OOG vs revert — 似て非なるもの

両方とも実行を halt するが、違いが重要：

| | Out-Of-Gas | REVERT |
| :--- | :--- | :--- |
| **残りガス** | 全部消費 | 呼び出し元に返す |
| **状態変更** | すべて巻き戻し | すべて巻き戻し |
| **Returndata** | 空 | REVERT オペランドからのデータ |
| **呼び出し元が見る** | 「call 失敗、データなし」 | 「call 失敗、データあり」 |

Solidity の \`require(x, "msg")\` で、EVM はエンコード済み "msg" を returndata として REVERT を吐く。Solidity ≥ 0.8 の算術オーバーフローも同様 — REVERT に Panic(uint256) エラーコード。

OOG は別物。フレームが実行中にガス枯渇すると起きる。フレームはすべて (状態 + 残りガス) を失い、呼び出し元は汎用失敗を見る。

中級レッスン 1 で Revm の \`PrecompileHalt::OutOfGas\` と他の halt が出てくる時、この区別がモデル化されている。

## コールフレーム — EVM のコールスタック

トランザクションは **1 フレーム** で始まる — EOA からコントラクトへのトップレベル call (もしくはコントラクト作成)。

そのフレームが \`CALL\` (もしくは \`DELEGATECALL\` / \`STATICCALL\` / \`CREATE\`) を実行すると、**新しいフレームが生まれる**。新フレームは独自に持つ：

- スタック (新規)
- メモリ (新規、空)
- Calldata (call opcode からの入力バイト)
- PC (呼ばれたコントラクトのコードのオフセット 0 から開始)
- ガス予算 (呼び出し元の残りガスのサブセット)

内側フレームが halt すると、制御が外側フレームに戻る。外側は以下を見る：

- 成功 / 失敗フラグ
- Returndata バッファ
- 残りガス (外側の予算に戻される)

このネストは **1024 レベル** まで可能。それを超えるとコールスタックオーバーフロー。

## 4 つの call 系 opcode — 何を所有するか

Solidity 開発者を最も混乱させる表：

| Opcode | 内側の \`address(this)\` | 内側の \`msg.sender\` | 触るストレージ | 走るコード |
| :--- | :--- | :--- | :--- | :--- |
| **\`CALL\`** | 呼び先コントラクト | 呼び出し元 | 呼び先のストレージ | 呼び先のコード |
| **\`STATICCALL\`** | CALL と同じ | CALL と同じ | 同じ — ただし書き込みは revert | CALL と同じ |
| **\`DELEGATECALL\`** | **呼び出し元** | 呼び出し元の呼び出し元 | **呼び出し元の** ストレージ | 呼び先のコード |
| **\`CALLCODE\`** | (廃止) | (廃止) | (廃止) | (廃止) |

3 つがモダン Ethereum で生きている。表を 2 度読んでください。バグを理解する上で重要なもの：

### CALL

最も一般的。コントラクト \`X\` から \`A.foo()\`: 新フレームが A のコードを走らせ、A のストレージを見て、\`msg.sender = X\`。A が書くものは A のストレージへ。**ストレージとコードが揃う**。

### STATICCALL

CALL と同じ形だが、内側フレームは **状態書き込み禁止** (SSTORE、LOG、CREATE、SELFDESTRUCT、value 付き CALL すべて revert で halt)。「view」call 用 — Solidity が \`view\` 関数呼び出しで STATICCALL を吐く。

### DELEGATECALL

危険なやつ。**A のコードが X のコンテキストで走る**。つまり: \`address(this)\` は X。\`msg.sender\` は X の呼び出し元。ストレージ読み書きは **X のストレージへ、A のではない**。コードは A から読む。

これがプロキシパターン (UUPS、Transparent Proxy、Diamond) の動作原理: プロキシコントラクト (X) が実装コントラクト (A) に DELEGATECALL し、X のストレージが A のロジックで変更される。

これが多くの著名な hack の元凶でもある — Wormhole、Parity マルチシグ、等 — A のストレージレイアウトが X と一致しないと、書き込みが X の予期しないスロットを破壊する。

中級レッスン 6 (ExEx) で「この tx がこれらのアカウントのこれらのストレージスロットに触れた」と出た時、CALL vs DELEGATECALL を知っていることが理解の鍵。

## 実コールグラフ

\`\`\`
EOA がコントラクト X に tx 送信
│
├── X のコードが走る (frame 1)
│    │
│    ├── X.transfer() → コントラクト Y へ CALL
│    │    │
│    │    └── Y のコードが走る (frame 2、新規メモリ/スタック)
│    │          │
│    │          └── Y は Y.storage から読む (SLOAD で)
│    │
│    ├── X がコントラクト Z に STATICCALL (view 関数)
│    │    │
│    │    └── Z のコードが走る (frame 3、新規、書き込みロック)
│    │
│    └── X がコントラクト W に DELEGATECALL (実装)
│         │
│         └── W のコードが走る (frame 4) — でも書き込みは X のストレージへ!
│
└── tx 完了; receipt が全フレームのログを発行
\`\`\`

各フレームが独自のメモリ/スタック。Returndata は各 return で上に流れる。ガス会計はフレームごとに消費を追跡。

## 読み物リスト

1. **[evm.codes](https://www.evm.codes)** で CALL・DELEGATECALL・STATICCALL を読む。パラメータ (gas, address, value, argsOffset, argsSize, retOffset, retSize) を見る — DELEGATECALL/STATICCALL が \`value\` を落とす以外は同じ。
2. **Foundry で** 小さいプロキシ + 実装ペアをデプロイ。\`forge test -vvvv\` でコールトレースを見る — 各 CALL と DELEGATECALL がフレームネスト付きで表示される。
3. **[Wormhole hack postmortem](https://www.coinbase.com/blog/decoding-the-wormhole-attack)** を読む — バグは DELEGATECALL セマンティクスの誤解。本レッスンが頭に入っていれば、exploit の正体が一目でわかる。

## このレッスンで持ち帰るもの

- ガスは **3 つの形** で来る: 内在 (per-tx)、opcode ごと (固定 + 動的)、リファンド (キャップ付き)。
- **OOG と REVERT** は似ているが returndata と残りガスで違う。
- tx は **コールフレームのツリー**。各フレームが独自の stack/memory/PC/gas を持つ。
- **DELEGATECALL** は呼び先のコードを呼び出し元のコンテキストで走らせる call スタイル — プロキシパターンの基盤、多くのバグの元凶。

中級レッスン 5 (カスタム precompile) でガス価格モデル、もしくは lesson 6 (ExEx) で複数のコミット済みトランザクションを跨いで再構成する話が出た時、コールフレームとガスモデルはすでに頭の中にある — 抽象概念ではなく、具体的な機械として。`,
                },
              ],
            },
          },
          {
            title: 'ブロックレベルの Ethereum',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'ブロック・レシート・reorg',
                  slug: 'blocks-receipts-reorgs-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# ブロック・レシート・reorg

> 🧭 **このレッスンの位置づけ:** **分散システム層** — ブロック、レシート、reorg — を導入する回。データベースの WAL + レプリケーション + 競合解決の組み合わせを、合意プロトコルとして表現したもの。以降の ExEx / ステージドシンク回はすべて、このモデルを前提にする。

ここまで 1 トランザクションずつ扱ってきました。チェーンは別のレベルで動きます: トランザクションの **ブロック**、何をしたかの **レシート**、そして時々起きる **reorg** (チェーンが直近の歴史を書き換えること)。

これは Reth の Staged Sync と ExEx の 中級レッスンが暗黙の前提とするレイヤー。

## ブロック — 3 つの部分

各 Ethereum ブロックは概念的に 3 つの束：

| 部分 | 中身 | ハッシング |
| :--- | :--- | :--- |
| **ヘッダー** | メタデータ: 親ハッシュ、state root、tx root、receipts root、ガスリミット、タイムスタンプ等 | ブロックの「身元」ハッシュは keccak256(header) |
| **ボディ** | トランザクションの実リスト、順序付き | ヘッダーの tx root はこのリストの Merkle root |
| **レシート** | tx ごと 1 レシート: ステータス、使用ガス、発行ログ/イベント | ヘッダーの receipts root がこのリストにコミット |

「ブロックハッシュ 0x123...」と聞いたら、それはヘッダーの keccak256 — ボディとレシートはヘッダーを *経由して* コミットされるが、ハッシュに直接は入らない。

### なぜヘッダーに 3 つの root?

ヘッダーは 3 つの Merkle root を持つ: state、transactions、receipts。各 root はチェーンデータの異なる部分にコミット：

- **\`state_root\`**: このブロックの tx 実行 *後* のワールドステート MPT のルート
- **\`transactions_root\`**: このブロックの全 tx の MPT のルート (「tx X はブロック N にあった」を証明できる)
- **\`receipts_root\`**: 全レシートの MPT のルート (「tx X がログ Y を発行した」を証明できる)

ライトクライアントはヘッダーだけを持ち、proof をたどればどれでも検証できます (Expert で扱います)。

## レシートとログ — 監査証跡

各トランザクションは **レシート** を生成：

\`\`\`
struct Receipt {
    status: bool,           // 成功 / 失敗
    cumulative_gas_used: u64,
    logs: Vec<Log>,
    bloom: BloomFilter,     // ログフィルタ、高速検索用
}

struct Log {
    address: Address,       // 発行コントラクト
    topics: Vec<B256>,      // 最大 4 つ、indexed
    data: Bytes,            // unindexed payload
}
\`\`\`

重要なポイントが 2 つ：

### 1. ログが Solidity \`event\` をオフチェーンに届ける手段

Solidity で \`emit Transfer(from, to, amount)\` を書くと、EVM は \`LOG3\` opcode を実行：

- topic[0] = keccak256("Transfer(address,address,uint256)") — イベントシグネチャ
- topic[1] = from (indexed)
- topic[2] = to (indexed)
- data = ABI エンコード済み amount (indexed でない)

ログがレシートに入る。インデクサ・MEV ボット・ExEx すべてがこれを消費する。

### 2. ブルームフィルタは「このブロックは X に触れたか?」の高速チェック

各ブロックの receipts root は **256 バイトのブルームフィルタ** を持ち、ブロック内の全ログアドレスとトピックを要約。ライトクライアントとインデクサがこれを使って、自分が気にするアドレスを言及していないブロックを高速にスキップする — フルレシートをダウンロードせずに。

中級レッスン 7 (本番 MEV) で ExEx コードがアドレスでログをフィルタする時、このブルームが事前フィルタを高速にする。

## ブロックは実際どう作られるか

典型的なブロックライフサイクル：

\`\`\`
1. ブロックプロポーザ (validator) がスロット N で選ばれる
2. プロポーザが mempool (もしくはビルダー) から保留中 tx を集める
3. 各 tx について (順番に):
   a. フレームを開いて EVM 実行
   b. 成功ならワールドステート更新、失敗なら巻き戻し
   c. レシート追記
4. root 計算: state_root, transactions_root, receipts_root
5. ログからブルームフィルタ計算
6. 全 root + parent_hash + timestamp + ... でヘッダー構築
7. 署名して伝播
\`\`\`

このブロックを実行するフルノードは **同じ実行を** 検証のために行う — ボディを取得、各 tx を実行、結果の state_root がヘッダーに一致するか確認。一致しなければブロックは却下。

中級レッスン 4 で Reth の \`ExecutionStage\` を読む時、それが正にこの検証パス: 各ブロックの tx を再生し、状態変更を蓄積、結果のルートを検証。

## Reorg — チェーンが自分を書き換える

通常チェーンは線形に伸びる：

\`\`\`
... → block 100 → block 101 → block 102 → block 103
\`\`\`

しかし時々、2 人の validator が同じスロットでブロックを提案したり、ネットワーク分断が回復したりすると、**正準チェーンが切り替わる**。先端 (tip) の数ブロックが *巻き戻され*、チェーンは別の経路で再び伸びていく：

\`\`\`
                                    ┌─→ 102b → 103b   (新しい正準)
... → 100 → 101 → 102a → 103a ──────┘
                  └────────── 巻き戻し (もう正準ではない)
\`\`\`

これが **reorg**。ノードの視点から：

1. 新チェーンセグメント到着、現在より長いか attestation が多い
2. 共通祖先まで遡る (例だと block 101)
3. 102a, 103a の状態変更を **巻き戻す** (逆順で)
4. 102b, 103b の状態変更を **適用**
5. 新正準 tip は 103b

モダン Ethereum (Merge 後 PoS) では **1-2 ブロックより深い reorg は稀** だが起きる。validator の proposal 欠落や equivocation を契機に再構成が走る。

### オフチェーン消費者にとっての意味

「ブロック N コミット → 自分の DB に txs を書き込む」というインデクサを書いたとして、ブロック N が reorg されたら：

- DB に **正準チェーン上で起きなかった** トランザクションの行が残る
- reorg 検知時にそれらの行を **削除する必要** がある
- そして新正準ブロック N の tx の行を再挿入

これが **まさに** ExEx に 3 通知タイプがある理由 — \`ChainCommitted\`、\`ChainReorged\`、\`ChainReverted\`。\`ChainCommitted\` だけ扱う naive インデクサは reorg のたびに導出状態を破壊する。(中級レッスン 6 で詳しく扱う。)

### なぜ Reth の Staged Sync が対称なのか

Reth の各 Stage は \`execute\` (forward) と \`unwind\` (backward) を持つ。Stage は reorg を「特殊ケース」として設計されていない — reorg は **通常運用**、同じトレイトでモデル化される。1000 ブロック前進: \`execute\`。reorg で 3 ブロック後退: \`unwind\`。同じコードパス、逆方向。

これは 中級レッスン 4 (Staged Sync アーキテクチャ) で評価できる設計判断。

## 読み物リスト

1. **[Etherscan](https://etherscan.io) で実ブロックを探す**。ヘッダーの「Click to see More」をクリックして全フィールドを見る。parentHash、stateRoot、transactionsRoot、receiptsRoot、logsBloom を見つける。
2. **そのトランザクションの 1 つを開いて** Logs タブを見る。各ログが Address・Topics・Data を持つ — それが上の構造。
3. **本番での reorg の感覚を得るには** [reth.rs ブログ](https://reth.rs/) や Ethereum クライアントのリリースノートで「reorg」を検索 — 運用者は reorg ハンドリングの正しさを大いに気にする。

## このレッスンで持ち帰るもの

- **ブロック** = ヘッダー + ボディ + レシート。ヘッダーは 3 つの Merkle root (state・txs・receipts) を持つ。
- **レシート** が各 tx のステータス・ガス・ログを記録 (Solidity \`event\` は LOG opcode 経由でログになる)。
- **Reorg** は直近の歴史を書き換える。オフチェーン消費者は巻き戻しを明示的に扱う必要がある。
- Reth の Staged Sync は **対称** (execute / unwind) — それは reorg が例外ではなく通常運用だから。

中級レッスン 4 で Stage トレイトを読み解く時、lesson 6 で ExEx 通知タイプを読み解く時、モデルはすでに頭にある。あとは実装している Rust を読むだけです。`,
                },
              ],
            },
          },
          {
            title: 'ソース読みのための Rust',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'Solidity エンジニアのための Rust — 移行マップ',
                  slug: 'rust-for-solidity-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 35,
                  content: `# Solidity エンジニアのための Rust — 移行マップ

> 🧭 **このレッスンの位置づけ:** Solidity 側の勘を、Rust のイディオムに対応付ける回。ツールを作る Solidity エンジニアが必ず通る、概念上の乗り換え。Inside ティアの途中で行うより、ここで先に済ませる方が安い。

Solidity でコントラクトを書いてきたなら、EVM の挙動について *気にすべきこと* はすでに身についています。足りないのは、**自分のコントラクトを走らせているエンジン側を読むための Rust の捉え方** だけ。本レッスンは、続く濃密な Rust の章に進む前に、そのギャップを埋める対訳表です。

Rust をゼロから教えるレッスンではありません。あなたが信頼している Solidity の概念が、Rust ではどう写る（あるいは写らない）か、1 行ずつ示します。1 時間後に \`bluealloy/revm\` を開いたとき、画面いっぱいの Rust が「ああ、これは Solidity でいつもやっていることを別の書き方で書いているだけだ」と見えるようにするためです。

> 📌 **対象。** Solidity コントラクトを書いた経験がある人向けです。Solidity を触ったことがなければ、このレッスンは飛ばしてください — 続く Rust の章はジェネリクスから直接始まります。

## 1. 基本データ型はほぼ 1:1

| Solidity | Rust (alloy / revm) | 備考 |
| :--- | :--- | :--- |
| \`address\` | \`Address\` (= \`B160\` = 20 byte 固定配列) | 同じ 20 byte。型付きラッパ |
| \`uint256\` | \`U256\` | 256-bit 符号なし。\`alloy-primitives\` で定義、Rust EVM ツール全部が使う |
| \`int256\` | \`I256\` | 同じだが符号あり |
| \`bytes32\` | \`B256\` (= 32 byte 固定配列) | ハッシュ・スロットキー・tx ハッシュに使う |
| \`bytes\` | \`Bytes\` (\`Vec<u8>\` のラッパ) | 動的バイト列 |
| \`string\` | \`String\` | 同じ概念; UTF-8 所有文字列 |
| \`bool\` | \`bool\` | 同じ |
| \`mapping(K => V)\` | \`HashMap<K, V>\` | ただし — §3 の所有権を参照 |
| \`uint256[]\` | \`Vec<U256>\` | ヒープ確保の伸長可能ベクタ |

**型はほぼ同型** です。\`U256::from(100)\`、\`Address::from_slice(...)\`、\`B256::random()\` — Solidity の \`uint256(100)\` や \`address(0x...)\` と同じ感覚で組み合わせられます。驚きはありません。

> 🔍 **リポジトリで確認。** \`alloy/crates/primitives/src/\` に \`Address\`、\`U256\`、\`B256\` が住んでいます。1 ファイル開いてみてください。**筋肉記憶になっている Solidity 型は、すべてこの 1 つの crate にまとまっています。**

## 2. Contract の形 ≈ struct + impl

Solidity の contract は *状態* (storage フィールド) + *挙動* (関数)。Rust はこれを 2 つの宣言に分ける:

\`\`\`solidity
contract Vault {
    mapping(address => uint256) public balances;
    address public owner;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
}
\`\`\`

Rust 版（概念上 — 実際には contract をこう書かない; これは *形* の話）:

\`\`\`rust
struct Vault {
    balances: HashMap<Address, U256>,
    owner: Address,
}

impl Vault {
    fn deposit(&mut self, sender: Address, value: U256) {
        *self.balances.entry(sender).or_insert(U256::ZERO) += value;
    }
}
\`\`\`

変わった点:

- **\`msg.sender\` と \`msg.value\` が消えた。** 明示的なパラメータになります。Solidity はこれらをグローバルに隠していましたが、Rust は呼び出し側に渡すことを強制します（Revm もこの方針です — 各 opcode は \`context\` パラメータを取り、その中に等価物が入っています）。
- **\`payable\` がない。** これは元から Solidity レベルの約束ごとで ABI にエンコードされていただけです。Rust は「この関数は値を受け取る」という概念をモデル化しません。
- **\`&mut self\`** が新しい部分です。\`deposit\` 関数が「コントラクトの状態を書き換える必要がある」と宣言しています。

\`&mut self\` が Solidity の暗黙の \`this\` ではくれない何を渡してくれるかというと、**\`deposit\` 実行中に他の誰もこの struct を読み書きしていない** という、コンパイラが検証済みの保証です。Solidity では EVM レベルでは真（同時に 1 tx だけ走る）ですが、言語自体にそれを表現する手段がありません。Rust では型システムがそれを — スレッドをまたいでも、非同期タスクをまたいでも、どこでも — 強制します。これがエンジン層に Rust が持ち込む価値です — **同時書き換えのバグを設計段階で排除できる**。

## 3. 所有権: Solidity に対応物がない部分

ここから Solidity の直感は効かなくなります。Solidity に *所有権* の概念はありません。すべては storage（コントラクトが永遠に所有）か memory（呼び出し 1 回ぶんのスコープ）に置かれます。「この値の所有者は誰か?」と疑問に思ったことがないのは、答えが常に「コントラクト」だからです。

Rust はすべての値について、この質問に答えることを要求します。

| Solidity 側 | Rust 側 | なぜ重要か |
| :--- | :--- | :--- |
| 暗黙の storage | \`&self\` / \`&mut self\` / 所有する \`self\` | 「読むだけか・書き換えるか・消費するか」が関数のシグネチャに現れる |
| \`memory\` キーワード | デフォルト挙動 — Rust の値は box しない限りスタック上 | キーワード不要 |
| 暗黙の値コピー | 所有型は明示的な \`.clone()\`、プリミティブは安価な \`Copy\` | 「この代入は高くつくか?」が呼び出し地点で見える |
| 参照安全性なし | ライフタイム (\`'a\`) が参照の有効期間を記述 | 参照が借用元より長生きしうる場合、コンパイラがそれを拒否する |

捉え方の反転は、**Rust ではどの値も、ある時点で所有者がただ 1 つだけ** という点です。所有者だけが借用を配ることができ、\`&mut\` の借用は 1 つだけ、または \`&\` の借用が任意の数 — 両方を同時に成立させることはできません。これが GC なしで並行コードを安全に保つ仕組みで、最初の 2〜3 週間で文法を重く感じさせる正体でもあります。

良いニュースとして、**これから読む EVM ソースの大半は所有権の「退屈な」領域に留まります** — struct が状態を持ち、関数が \`&mut\` か \`&\` を取る、それで 9 割。関数の境界を抜けるライフタイムや \`Pin\`、自己参照 struct のような難物は非同期 / unsafe の隅でしか出てこず、opcode 本体にはほぼ現れません。

ちなみに、Solidity では「他の誰かが \`balances\` を書き換えていないか?」を聞く手段がありません。並行性がないからです。Rust は \`&mut\` を書くたびにその質問をします。Reth や revm の中で答えが「誰も書き換えない」から「誰かが書き換えうる」に変わるのは、実行と並走するトレース、複数 ExEx サブスクライバ、複数スレッドの fuzz ハーネスなど、複数のことを並行で走らせる場所です。Solidity はこれを考えなくてよかった。エンジン側 *は* 考える必要があり、所有権がその答えを表現する文法です。

## 4. エラー: \`require\` は \`Result\` になる

Solidity:

\`\`\`solidity
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    balances[msg.sender] -= amount;
    payable(msg.sender).transfer(amount);
}
\`\`\`

Rust:

\`\`\`rust
fn withdraw(&mut self, sender: Address, amount: U256) -> Result<(), VaultError> {
    let balance = self.balances.get(&sender).copied().unwrap_or(U256::ZERO);
    if balance < amount {
        return Err(VaultError::InsufficientBalance);
    }
    *self.balances.get_mut(&sender).unwrap() -= amount;
    Ok(())
}
\`\`\`

押さえるべき違いは 2 つあります。

- **\`Result<T, E>\` はただの enum** です。魔法はありません。関数は \`Ok(value)\` か \`Err(reason)\` のどちらかを返し、呼び出し側は両方の腕を扱うか、\`?\` 演算子で伝播する必要があります。コンパイラはエラーを無視することを許しません — Solidity でいえば「revert の処理を忘れたらコンパイルエラー」に近い厳しさです。
- **エラーが型付き** です。\`VaultError\` はあなた自身の enum で、\`InsufficientBalance\`、\`Unauthorized\` のようなバリアントを持ちます。Rust EVM スタックではどこでもこの形が使われていて、Revm の \`InstructionResult\`、Reth の \`StageError\` などが典型例です。各バリアントが「何が起きたか」を読み手に正確に伝えます。

\`require(...)\` は失敗パターンのうち *1 つ*（文字列付きで revert する）でしかありません。\`Result\` は失敗パターンの *一般形* です。これが腑に落ちると、Rust のソースで「ここで X が失敗したらどうなるか?」というすべての疑問に正確に答えが出ます — 関数の戻り型を読めばいい、それだけです。

## 5. 継承が消える — trait が仕事をする

Solidity の \`is\` (継承):

\`\`\`solidity
contract ERC20Token is Ownable, ReentrancyGuard {
    function transfer(address to, uint256 amount) public onlyOwner nonReentrant { ... }
}
\`\`\`

Rust にクラス継承はない。代わりに **trait** がある — Java/C# のインターフェースに似ているが、重要な違いがある:

\`\`\`rust
trait Token {
    fn transfer(&mut self, to: Address, amount: U256) -> Result<(), Error>;
}

trait Ownable {
    fn owner(&self) -> Address;
    fn assert_owner(&self, caller: Address) -> Result<(), Error> {
        if self.owner() != caller {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }
}

impl Token for MyToken { /* ... */ }
impl Ownable for MyToken { /* ... */ }
\`\`\`

Solidity エンジニアがすぐ役立つと感じる点は 2 つあります。

- **デフォルトのメソッド本体が書ける** こと。上の \`assert_owner\` を見てください — trait が *実装* を提供しています。実装する側は、明示的に上書きしない限り、これを無料で受け取れます。alloy の \`Provider\` トレイトが \`root()\` というアクセサ 1 つから 30 以上の RPC メソッドのデフォルト実装を派生させているのは、この仕組みです（Inside Alloy で詳しく扱います）。
- **ダイヤモンド継承問題がない** こと。struct は複数の trait を実装でき、継承の順序という概念がありません。Solidity で \`Ownable + ReentrancyGuard + Pausable\` を「継承」すると微妙な落とし穴に出会いますが、Rust なら \`impl Trait1\` + \`impl Trait2\` + \`impl Trait3\` と並べるだけ。順序にも依存しません。

Reth のソースは **トレイトが非常に密** です — \`Stage\`、\`Provider\`、\`Database\`、\`Network\`、\`Signer\`、その他多数。各トレイトは「ここに契約がある、実装者はそれに従ってほしい」と言っています。Solidity の \`interface IERC20\` を読むのと同じ感覚でトレイトを読めるようになれば、コードベース全体が開けて見えてきます。

## 6. 怖い 2 つの語: ライフタイムと async

ここからは Solidity に本当に対応物がない部分です。事前のオリエンテーションとして 2 段落だけ書きます — 詳しくは続く専用レッスンで扱います。

**ライフタイム (\`'a\`)** は参照の有効期間を表す印です。Solidity には関数境界を生き延びる参照がありません — ローカルなポインタは関数の終わりとともに消えます。Rust では参照が生き残ることができ、コンパイラがそれを「借用元より長生きしない」ことを証明させます。\`fn foo<'a>(x: &'a Bar)\` は「この参照 \`x\` は少なくともライフタイム \`'a\` のあいだ生きている」という意味です。95% の時間はライフタイムを意識せずに済みます（コンパイラが推論してくれる）。自分で書くことになる残り 5% が、放っておくとバグが忍び込む場所です。

**\`async fn\` と \`.await\`** は、Rust が non-blocking な I/O を表現する仕組みです。Solidity の関数は 1 つの tx の中で同期的に走りますが、Rust のノードは同時に多くのことを行います（RPC リクエスト、P2P メッセージ、ディスク書き込み）。\`async\` は「これを待っているあいだに他のことをする」を表す書き方です。背後の仕組み（\`Future\`、\`Pin\`、ランタイム）は初見では重く感じますが、書き手から見える表面は小さい — \`async fn\` と書いて、待ちたい場所に \`.await\` を置く、それだけです。

## 7. Solidity → Rust 移行チートシート

1 時間後にソースを読むときに:

| Rust で見えるもの | Solidity に対応するもの | 持ち越し方 |
| :--- | :--- | :--- |
| \`U256\`、\`Address\`、\`B256\` | \`uint256\`、\`address\`、\`bytes32\` | 同じ byte、型付きラッパ |
| \`struct Foo { ... }\` | contract の状態フィールド | 状態の形 |
| \`impl Foo { ... }\` | contract の関数 | 挙動 |
| \`&mut self\` | 暗黙の storage を mutate する関数 | コンパイラ検証済み排他 |
| \`Result<T, E>\` | \`require\` / \`revert\` | 型付きエラー。\`?\` 演算子で伝搬 |
| \`trait X { ... }\` | \`interface IX\` + おそらく library | trait はデフォルト impl を持てる |
| \`Option<T>\` | 「ゼロかも / 見つからないかも」 | \`Some(value)\` か \`None\` |
| \`Arc<T>\` | 「共有・複数 reader」 | 共有所有レッスンで扱う |
| \`Box<dyn Trait>\` | 実行時多態 | ヒープ確保 + vtable |
| \`async fn\` / \`.await\` | (対応物なし) | Non-blocking I/O。別レッスンで扱う |
| ライフタイム (\`'a\`) | (対応物なし) | コンパイラ強制の参照スコープ |

続く 4 つのレッスンは、ジェネリクス・共有所有・unsafe・マクロ — ソース読解 tier の **背骨となる Rust** を扱います。本レッスンを先に読んでおけば、それぞれが綺麗に着地します。

## ドリル

1. **Solidity コントラクトを 1 つ翻訳してみる。** 自分で書いた小さなコントラクト（あるいは [\`solady\`](https://github.com/Vectorized/solady) の ERC20）を選んで、紙の上で同じ状態と 1〜2 個のメソッドを持つ Rust の struct + impl を書いてみてください。動かさなくていい — 形だけで構いません。30 分。
2. **alloy の Rust struct を 1 つ読む。** \`alloy/crates/primitives/src/address.rs\` を開いて、\`Address\` 型を探してください。何が \`struct\`、何が \`impl\` ブロック、何が trait の impl かを観察します。**Solidity に対応物がない部分**（ライフタイム、derive、属性マクロ）を見つけてください。30 分。
3. **エラー処理を比較する。** \`require\` 文を 2 つ持つ Solidity 関数を 1 つ選んで、それを 2 バリアントのカスタムエラー enum と \`Result\` を使った Rust に書き換えてみてください。**型が** 各失敗モードをどう文書化しているかを観察します。45 分。

このレッスンを終えれば、続く Rust の章（ジェネリクス・Arc・unsafe・マクロ）が、すでに持っているモデルの上に乗る追加の語彙として読めるはずです。**ゼロから Rust を学ぶのではなく、エンジン層のコードに Solidity の直感を翻訳するための Rust の慣用句を学んでいる** — そう捉えてください。
`,
                },
                {
                  title: 'Generics・trait bounds・?Sized・dyn vs impl',
                  slug: 'rust-generics-traits-bounds-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 30,
                  content: `# Generics・trait bounds・?Sized・dyn vs impl

> 🧭 **このレッスンの位置づけ:** 抽象化の道具立て（generics + trait bounds + \`?Sized\` + \`dyn\` vs \`impl\`）は、alloy がチェーン横断で \`Provider\` を成立させ、Revm がバックエンド横断で \`Database\` を成立させるために使っているもの。ここで仕込んでおくと、Inside ティアのコードが「魔法」から「パターン」に見えるようになる。

これが \`pub fn add<IT: ITy, H: ?Sized>(...)\` を見て怯まず読み解けるようになるためのレッスン。Reth と Revm のソースは **generics が密集** — 関数シグネチャに型パラメータが 3 つあるのは普通。本レッスンで、その仕組みを 1 つずつ解きほぐしていきます。

## Generics 101 — 基本の形

ジェネリック関数は **型パラメータ** を山括弧で取り、それを通常の型のように使う：

\`\`\`rust
fn first<T>(items: &[T]) -> Option<&T> {
    items.first()
}

let nums = [1, 2, 3];
let first_num = first(&nums);          // T は i32 と推論

let words = ["hello", "world"];
let first_word = first(&words);        // T は &str と推論
\`\`\`

コンパイラは **モノモーフ化** する — 各具象 \`T\` 用に \`first\` の特殊化コピーを生成する。\`first::<i32>\` と \`first::<&str>\` はコンパイル後のバイナリでは別関数で、両方とも手書きの非ジェネリックコードと比べて実行時コストゼロ。

## Trait bounds — 「T はこれらの操作をサポートする必要がある」

裸の \`<T>\` は「T は何でも良い」と言う。多くの場合 T で *何かする* 必要がある — メソッド呼び出し、比較、フォーマット。そこで **trait bounds** が登場：

\`\`\`rust
use std::fmt::Display;

fn print_first<T: Display>(items: &[T]) {
    if let Some(first) = items.first() {
        println!("{}", first);          // T: Display が要る
    }
}
\`\`\`

\`<T: Display>\` は「T は Display トレイトを実装している必要がある」と読む。これがないとコンパイラは拒否 — T が \`{}\` フォーマッタを持つか知らない。

\`+\` で複数 bound：

\`\`\`rust
fn process<T: Display + Clone>(item: T) {
    let copy = item.clone();
    println!("{} (cloned: {})", item, copy);
}
\`\`\`

## \`where\` 節 — 同じこと、別構文

bound が長くなるとシグネチャの下に移動：

\`\`\`rust
fn process<T>(item: T)
where
    T: Display + Clone + Send + 'static,
{
    // 本体
}
\`\`\`

これは純粋に表記の話。\`<T: Bound>\` と \`where T: Bound\` は完全に同じ意味。Reth コードは長さに応じて両方使う。

## Sized — あなたが知らなかった暗黙 bound

Rust のすべての型パラメータ \`T\` には **暗黙の \`Sized\` bound** がある。つまり \`<T>\` は静かに \`<T: Sized>\` になっている。\`Sized\` は「コンパイラがコンパイル時に型のサイズを知っている」という意味。

ほとんどの型は Sized: \`i32\` は 4 バイト、\`String\` は 24 バイト (ポインタ + 長さ + 容量)、自作の struct は既知のサイズ。

一部の型は **Sized でない**：

- \`str\` (裸の文字列型、\`&str\` ではない) — 長さは中身次第
- \`[i32]\` (裸のスライス型、\`&[i32]\` ではない) — 同様
- \`dyn Trait\` (これから扱う) — 裏の具象型は何でもありうる

\`<T: ?Sized>\` と書くと、**暗黙の Sized bound から opt out している**。T は unsized でも良くなる。\`?\` は「Sized かもしれない、そうでないかもしれない」。

なぜそうするか? **\`&T\`** と **\`Box<T>\`** は T が \`?Sized\` なら unsized 型を保持できるから。\`?Sized\` がないと \`fn foo<T>(x: &T)\` を書いて \`&dyn Trait\` を渡すことは絶対にできない — コンパイラは \`T: Sized\` を強制し、\`dyn Trait\` はそれを満たさない。

Revm がこう書く時：

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
\`\`\`

\`H: ?Sized\` は *まさに* \`H\` が \`dyn Host\` になれるため。関数は \`&MyConcreteHost\` (Sized) と \`&mut dyn Host\` (unsized、\`?Sized\`) の両方で動く。

**この 1 文字 (\`?\`) が、関数がトレイトオブジェクトを受け入れるかを決める**。

## \`dyn Trait\` — トレイトオブジェクト

\`dyn Trait\` は **トレイトオブジェクト**。「ポインタ + vtable」のペア：

- ポインタが具象値を指す
- vtable は関数ポインタの表 — トレイトの各メソッドに 1 つ

\`dyn Trait\` で \`obj.method()\` を呼ぶと、コンパイラは **vtable ルックアップ** を吐く: vtable からメソッドポインタをロード、間接呼び出し。これが **動的ディスパッチ** — 実行時に解決される。

\`dyn Trait\` 自体は unsized (ポインタの裏の具象型はどんなサイズでもありうる)。だから常に何らかのポインタ越しに見る：

\`\`\`rust
&dyn Trait        // 共有参照
&mut dyn Trait    // 排他参照
Box<dyn Trait>    // 所有、ヒープ確保
Rc<dyn Trait>     // 共有所有、シングルスレッド
Arc<dyn Trait>    // 共有所有、スレッドセーフ
\`\`\`

混在実装のベクタ：

\`\`\`rust
trait Greet { fn greet(&self); }
struct En; struct Ja;
impl Greet for En { fn greet(&self) { println!("Hi"); } }
impl Greet for Ja { fn greet(&self) { println!("こんにちは"); } }

let mixed: Vec<Box<dyn Greet>> = vec![Box::new(En), Box::new(Ja)];
for g in &mixed { g.greet(); }
\`\`\`

\`dyn\` がないと不可能 — \`Vec<T>\` は全要素が同じ具象型である必要がある。

## \`impl Trait\` — 静的な対応物

\`impl Trait\` は似て見えるが根本的に違う：

\`\`\`rust
fn make_greeter(lang: &str) -> impl Greet {
    if lang == "ja" { Ja } else { En }
    // ❌ コンパイルしない — 戻り型は単一の具象型でないと
}
\`\`\`

戻り位置の \`impl Trait\` は「Trait を実装する *特定の型* を返すが、呼び出し元から隠している」と意味する。**静的ディスパッチ** — コンパイラが 1 つの型を選び、モノモーフ化、vtable なし。

トレードオフ：

| | \`impl Trait\` | \`dyn Trait\` |
| :--- | :--- | :--- |
| **ディスパッチ** | 静的 (コンパイル時) | 動的 (実行時 vtable) |
| **速度** | 速い (インライン化可能) | 少し遅い (1 度の間接呼び出し) |
| **異種コレクション** | ❌ 不可 | ✅ 可 (Vec<Box<dyn Trait>>) |
| **オブジェクト安全性** | 関係なし | 必要 (一部のトレイトはオブジェクト安全でない) |

Reth と Revm は **両方** 使う。\`impl\` がデフォルトで、\`dyn\` は異種性が重要なケース (stage のリスト、プラグイン点) のために予約。

## オブジェクト安全性 — \`dyn Trait\` がコンパイルしない時

\`dyn Trait\` として使うにはトレイトが **オブジェクト安全** でなければならない。ルールは微妙だが、よく踏むのは：

- トレイト内の **ジェネリックメソッド禁止** (ライフタイム以外で)
- \`Self: Sized\` でないメソッドの **\`Self\` 戻り型禁止**
- **関連定数禁止**

\`Box<dyn MyTrait>\` を試してトレイトがオブジェクト安全でないと、「cannot be made into an object」のようなコンパイルエラーが出る。修正は通常、問題のメソッドに \`where Self: Sized\` を追加するか、トレイトを分割する。

Reth/Revm コードの *消費者* としてはあまりヒットしないが、なぜソースの一部のトレイトが \`dyn\` 化できないかを説明する。

## 全部まとめる — 実シグネチャを読む

戻ろう：

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
\`\`\`

これで単語ずつ読める：

- \`pub fn add\` — \`add\` という名前のパブリック関数
- \`<IT: ITy, H: ?Sized>\` — 型パラメータ 2 つ:
  - \`IT\` は \`ITy\` トレイトを実装する必要がある (interpreter-types マーカー — 通常 vs トレース vs サンドボックス)
  - \`H\` は unsized で良い (なので \`dyn Host\` になれる)
- \`context: Ictx<'_, H, IT>\` — 両方でパラメータ化されたコンテキストを取る
- \`-> Result\` — Result を返す

同じ関数、**2 つの特殊化パス**: 1 つは \`(具象IT, 具象Host)\` 用 (完全モノモーフ化、最速)、もう 1 つは \`(具象IT, dyn Host)\` 用 (Host 呼び出しは vtable)。\`?Sized\` が 2 つ目のパスを可能にする。

これが **Revm が「モジュラー」である理由**: 同じ opcode 関数が異なる実行モード用に複数バイナリにコンパイルされ、ディスパッチは実行時の分岐ではなく型システムレベルで決まる。

## 読み物リスト

1. **Rust Book 章 10 (Generics, Traits, Lifetimes)、章 17 (Trait Objects)** — 開いて、せめてセクション見出しだけでもスキム。無料リファレンス。
2. **\`reth/crates\` で型パラメータが 3 つ以上の関数を見つける**。シグネチャを読む。各部品を「この関数はどんな具象形で valid か」に翻訳できるはず。
3. **思考実験**: \`add\` シグネチャの \`H\` から \`?Sized\` を取り除いたら、\`&mut dyn Host\` を渡す呼び出し元にコンパイラはどんな具体的なエラーを出す? (答え: 「the trait \`Sized\` is not implemented for \`dyn Host\`」)

## このレッスンで持ち帰るもの

- **Generics + bounds** は Rust 版の「インターフェース」: 「T は何でもいいが、これらの操作をサポートする必要がある」。
- **\`Sized\` は暗黙** に各型パラメータに付く; \`?Sized\` が opt out してパラメータをトレイトオブジェクトにできるようにする。
- **\`dyn Trait\`** は実行時ディスパッチのポインタ + vtable; **\`impl Trait\`** はコンパイル時モノモーフ化。
- Revm の重い generics 使用は **型レベルでのモジュラリティ** — 同じコード、複数特殊化。

中級レッスン 1 でいきなり 1 行目に型パラメータ 3 つと \`?Sized\` をぶつけられた時、それを 5 つの威圧的なトークンではなく、1 つの繋がった文として読めるはず。`,
                },
                {
                  title: '所有権の共有: Arc・Mutex・RwLock',
                  slug: 'rust-shared-ownership-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# 所有権の共有: Arc・Mutex・RwLock

> 🧭 **このレッスンの位置づけ:** \`Arc\` / \`Mutex\` / チャネルは、Reth のパイプラインが Tokio タスク間で状態を共有する手段であり、Inside REVM の \`Database\` 設計が複数のコンシューマに同じバックエンドを共有させる手段でもある。共有所有の道具立ては、スタックの並行性まわりすべての土台を成している。

Rust の「ただ一人のオーナー」ルールは厳しい — そして 90% の場合は助かる。残り 10% は **複数の場所から同じ値を保持** する必要があり、スレッド跨ぎだったり、変更ありだったりする。それがこのレッスン。

Reth と ExEx のコードは **\`Arc\` と \`Mutex\` で埋め尽くされている**。本レッスンを経ていないと、それらのラッパーは雑音にしか感じられない。経た上で読めば、Reth が状態を非同期タスク間でどう共有しているかを支える、欠かせない部品として見えてきます。

## 問題 — なぜ所有権だけでは不十分か

インデクサを想像してみてください：

- チェーンから新ブロックを受け取る (1 タスク)
- RPC サーバが現在の状態をクエリする (多タスク)
- 定期的に状態をディスクへスナップショットとして書き出す (1 タスク)

3 つすべてが同じインメモリ状態にアクセスする必要がある。素の Rust 所有権は「ただ一人のオーナー」を要求する — でもここでは *本当に* 共有アクセスが必要。

答える質問が 2 つ：

1. **誰が値を所有するか?** 複数の場所。
2. **誰が変更できるか?** 場合による。

## Arc — 多重所有、不変共有

\`Arc<T>\` ("Atomically Reference-Counted") は複数のオーナーが値を共有できるようにし、最後のオーナーが drop した時に値を解放する。

\`\`\`rust
use std::sync::Arc;

let data = Arc::new(String::from("hello"));
let clone1 = Arc::clone(&data);   // refcount: 1 → 2
let clone2 = Arc::clone(&data);   // refcount: 2 → 3

std::thread::spawn(move || {
    println!("{}", clone1);       // 別スレッドへ move 可能
});
println!("{}", clone2);
// clone2 drop → refcount: 3 → 2
// clone1 drop (spawn 先で) → refcount: 2 → 1
// data drop → refcount: 1 → 0 → メモリ解放
\`\`\`

重要な性質が 2 つ：

### \`Arc::clone\` は安い

\`Arc::clone(&x)\` は内部の T を **deep copy しない**。やるのは：

1. アトミックにカウンタをインクリメント
2. 同じヒープ確保への新しいポインタを返す

コスト: アトミック add 1 回。内部の T は触らない。だから Reth で \`Arc::clone(&shared_state)\` がどこにでもある — 実質タダ。

### Arc は読み取り専用共有を提供

\`Arc<T>\` 経由では T の \`&self\` メソッドしか呼べない。**変更不可**。設計上そう — 同じ \`Arc<T>\` を持つ複数スレッドは同時に読み書きできない、同期なしでは。Rust が型レベルで強制する。

変更が必要なら、最初に T を \`Mutex\` か \`RwLock\` で包む。

### Arc vs Rc

\`Rc<T>\` は同じ形だが **シングルスレッド**。通常 (非アトミック) カウンタを使う。速いがスレッド跨ぎでは健全でない (unsound)。Reth と ExEx は \`Arc\` 一本 — マルチスレッド設計だから。

## Mutex — 排他読み書きアクセス

\`Mutex<T>\` は値をロックでラップする。読み書きには \`lock()\` が必要：

\`\`\`rust
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0u64));

let c = Arc::clone(&counter);
std::thread::spawn(move || {
    let mut guard = c.lock().unwrap();   // ロック取得
    *guard += 1;                          // 変更
    // guard がここで drop → ロック解放
});
\`\`\`

\`lock()\` は \`MutexGuard<T>\` を返す — スマートポインタで：

- **\`Deref\` 実装** で \`&T\` (読み) や \`&mut T\` (書き) のように使える
- **drop 時にロック解放** (RAII パターン — 手動 unlock 不要)
- **他スレッドがロック保持中なら呼び出しスレッドをブロック**

### \`.unwrap()\` は何で panic するか — poisoning

\`.lock().unwrap()\` を至る所で見るはず。なぜ \`unwrap\`?

\`lock()\` は \`Result<MutexGuard, PoisonError>\` を返すから。エラーケースは **mutex poisoning** — スレッドがロック保持中に panic すると、mutex は「poisoned」とマークされ、後続のロッカーがデータが不整合かもしれないと知る。

ほとんどの Reth コードは特別扱いせず poisoning を伝播 (panic) させる選択。\`.unwrap()\` が正しい呼び方なのは、部分更新の不整合を推論できない時。

自分のログで Mutex poisoning を見たら、**根本のバグは元の panic** であってロックではない — 何が panic したかを見つけて修正する。

### パターン: \`Arc<Mutex<T>>\`

この組み合わせは至るところで目にします：

\`\`\`rust
let shared_state: Arc<Mutex<MyState>> = Arc::new(Mutex::new(MyState::default()));

for _ in 0..10 {
    let s = Arc::clone(&shared_state);
    std::thread::spawn(move || {
        let mut guard = s.lock().unwrap();
        guard.do_work();
    });
}
\`\`\`

\`Arc\` が多オーナーポインタを提供; \`Mutex\` が変更安全性を提供。組み合わせ: スレッドセーフな共有可変状態。

## RwLock — 多 reader OR 単 writer

\`Mutex\` は排他 — 一度に 1 スレッド、読みでも。読みが書きを大幅に上回る場合は無駄。

\`RwLock<T>\` は許す：

- **多くの並行 reader** (\`.read()\`)
- **または排他的な 1 writer** (\`.write()\`)
- 同時には決して両方ではない

\`\`\`rust
use std::sync::{Arc, RwLock};

let cache = Arc::new(RwLock::new(HashMap::<String, u64>::new()));

// 多スレッドが同時に読める
let c = Arc::clone(&cache);
std::thread::spawn(move || {
    let guard = c.read().unwrap();      // 共有読み
    if let Some(v) = guard.get("key") {
        println!("{}", v);
    }
});

// 1 スレッドが書く (全 reader と他 writer をブロック)
let c2 = Arc::clone(&cache);
std::thread::spawn(move || {
    let mut guard = c2.write().unwrap();
    guard.insert("key".to_string(), 42);
});
\`\`\`

選び方：

| パターン | 選ぶもの |
| :--- | :--- |
| 50/50 の読み書き | \`Mutex\` (シンプル) |
| 多読み・少書き (キャッシュ・config) | \`RwLock\` |
| 書き専用のタイトな内側ループ | \`Mutex\` |
| シングルスレッド | どちらも不要 — \`RefCell\` を使う |

\`RwLock\` は writer に対して \`Mutex\` よりやや重い (簿記が多い)、なので読みが支配的でない限り手を出さない。

## async の話 — \`tokio::sync::Mutex\`

標準 \`std::sync::Mutex\` は **同期的**: \`.lock()\` は OS スレッドをブロックする。async コンテキスト (Tokio) ではスレッドをブロックするのは悪い — 同じワーカー上の他タスクを飢えさせる。

async コードには \`tokio::sync::Mutex\`：

\`\`\`rust
use tokio::sync::Mutex;
let m = Arc::new(Mutex::new(0u64));

let m_clone = Arc::clone(&m);
tokio::spawn(async move {
    let mut guard = m_clone.lock().await;   // .await、.unwrap() ではない
    *guard += 1;
});
\`\`\`

違い：

- \`.lock()\` は Future を返す — \`.await\` する
- 待機中タスクは **runtime に yield** する (ワーカーをブロックしない)
- poisoning の概念なし (async タスク内の panic は Tokio が処理)

Reth は両方使う: \`.await\` を跨がない高速クリティカルセクションには \`std::sync::Mutex\`、await を跨ぐ guarded 状態には \`tokio::sync::Mutex\`。

**経験則**: クリティカルセクションが \`.await\` を含むなら \`tokio::sync::Mutex\`。そうでなければ \`std::sync::Mutex\` で OK、やや速い。

## Reth の実パターン — DB ハンドルの共有

Reth が DB をタスク間で共有するパターンの単純化版：

\`\`\`rust
struct Node {
    db: Arc<Database>,                     // 共有、不変ハンドル
    blockchain_tree: Arc<RwLock<Tree>>,    // 共有、ほぼ読み
    metrics: Arc<Mutex<MetricsCollector>>, // 共有、書き重め
}

impl Node {
    fn spawn_indexer(&self) {
        let db = Arc::clone(&self.db);
        let metrics = Arc::clone(&self.metrics);
        tokio::spawn(async move {
            // db: Arc 経由で読み専用、ロック不要
            // metrics: カウンタ更新にロック
            metrics.lock().unwrap().increment("blocks_indexed");
        });
    }
}
\`\`\`

3 つの異なる共有パターンが 1 つの struct に。**各選択は意図的** — ロック粒度がアクセスパターンに合っている。

Reth ソースで \`Arc<RwLock<Foo>>\` の隣に \`Arc<Mutex<Bar>>\` を見たら、それは著者がどちらが正しいかを考え抜いた跡。今やあなたはその判断を読み解けます。

## 読み物リスト

1. **Rust Book 章 16 (Fearless Concurrency)** — \`Arc\` と \`Mutex\` のセクションを読む。
2. **\`tokio::sync\` ドキュメント** — \`Mutex\`・\`RwLock\`・\`broadcast\`・\`oneshot\` のページをスキム。各々が Reth のタスクコードの実パターンにマップする。
3. **Reth ソースで \`Arc<RwLock\` と \`Arc<Mutex\` を検索**。いくつか選ぶ。どちらを選ぶかは常に意図的 — なぜか説明してみる。

## このレッスンで持ち帰るもの

- **\`Arc<T>\`** は多オーナー、不変、clone が安い (アトミック add 1 回)。
- **\`Mutex<T>\`** は排他 (一度に reader-or-writer 1 つ)、\`.lock()\` がスレッドをブロック。
- **\`RwLock<T>\`** は多 reader OR 単 writer — 読みが支配的な時に使う。
- **\`tokio::sync::Mutex\`** は async-aware 版 — クリティカルセクションが \`.await\` を跨ぐ時に使う。
- **\`Arc<Mutex<T>>\`** は正準の「共有可変状態」パターン — Reth/ExEx の至る所で見る。

中級レッスン 6 (ExEx) で \`Arc<...>\` フィールドが 3 つあるような struct を見て「なぜラッパーだらけ?」と思った時、各々がそのコンポーネントを runtime のタスク間でどう共有するかを支える、欠かせない部品なのだと分かるはずです。`,
                },
                {
                  title: 'unsafe Rust',
                  slug: 'rust-unsafe-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 20,
                  content: `# unsafe Rust

標準 Rust 教科書が *薄い* 2 領域のうちの 1 つで、Revm のインタープリタが *深く* 踏み込む領域でもあります。本レッスンで、\`unsafe { ... }\` ブロックを含む Revm のホットパスを怯まずに読み解くための語彙を身につけます。(もう 1 つの領域 — \`macro_rules!\` — は次のレッスン。両方合わせて \`popn_top!\` 等を読むのに必要。)

## \`unsafe\` が実際に許すもの

Rust の安全性保証 (データ競合なし、use-after-free なし、境界外アクセスなし) はコンパイラが強制する — でも **safe Rust** に対してだけ。\`unsafe\` コードだけが許される 5 つのこと：

1. **生ポインタの dereference** (\`*const T\` または \`*mut T\`)
2. **\`unsafe fn\` の呼び出し** (コンパイラが検証できない関数)
3. **可変 static 変数のアクセス・変更**
4. **\`unsafe trait\` の実装** (\`Send\` や \`Sync\` を手動で)
5. **\`union\` のフィールドアクセス**

以上がリストのすべて。重要なのは、\`unsafe\` はローカル変数の借用チェッカーを *無効化せず*、null ポインタ deref を *自動的に* 許可せず、型チェックをスキップさせないということ。

## 契約 — \`unsafe\` が *する* こと

\`unsafe\` はあなたからコンパイラへの **約束**: 「このコードが Rust の安全性不変条件を維持していることを手動で検証した。信用していい」。

その約束が間違っていると、**未定義動作 (UB)** が起きる — UB は *破滅的*。一度 UB が起きると、プログラム全体が不整合状態。コンパイラは UB が起きないという前提で最適化している可能性があり、その結果、実行時の振る舞いは何でもありうる: クラッシュ・誤った結果・セキュリティホール・もっともらしいけれど誤った出力。

**「小さな UB」は存在しない**。UB のあるプログラムは間違っている、それだけ。

## なぜ Revm はホットパスで \`unsafe\` を使うか

中級レッスン 1 の Revm の \`popn_top!\` マクロには：

\`\`\`rust
let ([$( $x ),*], $top) = unsafe {
    $crate::interpreter_types::StackTr::popn_top(&mut $interpreter.stack)
        .unwrap_unchecked()
};
\`\`\`

呼ばれている関数は \`Option<...>\` を返す。\`unwrap_unchecked()\` は **\`unwrap()\` の unsafe 版** — 実行時の「これは Some か?」チェックをスキップする。

なぜここで安全か? 直前のコードが：

\`\`\`rust
if $interpreter.stack.len() < (1 + $crate::_count!($($x)*)) {
    return Err(...);
}
\`\`\`

だから \`unwrap_unchecked()\` の瞬間、スタック長は **証明可能に** 十分。著者は目視で \`popn_top\` が Some を返すと検証済み。\`.unwrap()\` を呼ぶと冗長な実行時チェックが入る; \`.unwrap_unchecked()\` がそれをスキップ。

節約されるコスト: opcode 実行ごとに 1 分岐。何十億回走るインタープリタのホットパスで、それは計測できる。

## Revm/Reth での \`unsafe\` 規律

慣用的な \`unsafe\` 使用はこんな感じ：

\`\`\`rust
// 安全性不変条件を説明するコメントブロック
// SAFETY: We just checked stack.len() >= N+1 above, so popn_top
// is guaranteed to return Some.
let result = unsafe { popn_top.unwrap_unchecked() };
\`\`\`

よく書かれた Rust の各 \`unsafe\` ブロックには **\`// SAFETY:\` コメント** があり、なぜ unsafe が健全かを記述する。レビュアーはこれを探す; 不在は code smell。

## \`unsafe fn\` vs \`unsafe { ... }\`

関連するが異なる 2 つの概念：

| 形 | 意味 |
| :--- | :--- |
| \`unsafe { ... }\` ブロック | 「5 つある unsafe な操作のうち 1 つを実行している、不変条件は検証済み」 |
| \`unsafe fn foo(...)\` | 「この関数を呼ぶには unsafe が必要 — *呼び出し元* が不変条件を検証する必要がある」 |

\`unwrap_unchecked()\` は \`unsafe fn\`。呼ぶには呼び出し場所を \`unsafe { ... }\` で囲む。それが契約: 関数が「事前条件がある」と宣言、呼び出し元が「チェック済み」と宣言。

## まだ知らなくて良いもの

- \`Send\` / \`Sync\` の手動実装 (Reth はあまりやらない)
- インラインアセンブリ (ほぼなし)
- C への FFI (jemalloc 関連だけ、それも 1 つのグローバル設定)

Revm/Reth ソースを読むには、**上のパターン (手動安全性検証 + チェック後の \`unwrap_unchecked\`) が見るものの 95%**。

## このレッスンで持ち帰るもの

- **\`unsafe\`** は 5 つの特定のことを許す; ライセンスではなくコンパイラとの *契約*
- **\`unwrap_unchecked()\`** + 直前の長さ/状態チェックは、Revm のホットパスで冗長な実行時チェックをスキップする正準パターン
- **\`// SAFETY:\` コメント** 規律 — よく書かれた Rust の各 unsafe ブロックは、それを正当化する不変条件を文書化する

次のレッスンは \`macro_rules!\` を扱う — Revm のインタープリタソースを読むのに必要な、もう一方の半分。`,
                },
                {
                  title: 'macro_rules! 基礎',
                  slug: 'rust-macros-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 10,
                  xpReward: 20,
                  content: `# macro_rules! 基礎

標準 Rust 教科書が *薄い* 2 領域のうちのもう 1 つ。前のレッスンが \`unsafe\` をカバー、これが \`macro_rules!\`。両方合わせて Revm のホットパスソース — \`popn_top!\`、\`gas!\` 等 — を読むのに必要なもの。

Revm のインタープリタは **マクロで埋め尽くされている**。\`popn_top!\`、\`gas!\`、\`push!\`、\`as_usize_or_fail!\` — これらは関数呼び出しではなく、コンパイル時のテキスト展開。読むには構文を知る必要がある。

## 基本の形

\`macro_rules!\` マクロは **パターン → 展開**。パターンが呼び出し構文にマッチ、展開がコードを生成：

\`\`\`rust
macro_rules! square {
    ($x:expr) => {
        $x * $x
    };
}

let n = square!(3 + 4);    // 展開: (3 + 4) * (3 + 4) → 49
\`\`\`

\`$x:expr\` 部分が **メタ変数** \`$x\` を宣言、任意の式にマッチ。\`expr\` は **フラグメント specifier**、パーサに何の構文を期待するか教える。

## 一般的なフラグメント specifier

| Specifier | マッチ対象 |
| :--- | :--- |
| \`expr\` | 任意の Rust 式 |
| \`ident\` | 識別子 (変数名、関数名) |
| \`tt\` | 単一の token tree (最も柔軟) |
| \`stmt\` | 文 |
| \`pat\` | パターン (match arm、let 束縛で) |
| \`ty\` | 型 |
| \`block\` | \`{ ... }\` ブロック |

ソース読みには \`expr\`・\`ident\`・\`tt\` でほとんど足りる。

## 繰り返し: \`$( ... ),*\`

マクロは **リスト** を繰り返し構文でマッチできる：

\`\`\`rust
macro_rules! print_all {
    ( $( $x:expr ),* ) => {
        $(
            println!("{}", $x);
        )*
    };
}

print_all!(1, "hello", 3.14);
// 展開:
// println!("{}", 1);
// println!("{}", "hello");
// println!("{}", 3.14);
\`\`\`

構文を読む：

- \`$( ... )\` が繰り返しグループを宣言
- \`,*\` が「カンマ区切り、ゼロ回以上」(\`,+\` で 1 回以上)
- 展開内の \`$( ... )*\` が本体をマッチ 1 つにつき 1 回繰り返す

## Revm の \`popn_top!\` を読む

基礎を装備して：

\`\`\`rust
macro_rules! popn_top {
    ([ $($x:ident),* ], $top:ident, $interpreter:expr) => {
        // ... 本体
    };
}
\`\`\`

翻訳：

- パターンは \`[\` で始まり、\`$($x:ident),*\` (識別子のカンマ区切りリスト)、それから \`]\`
- それからカンマ、それから \`$top:ident\` (1 つの識別子)
- それからカンマ、それから \`$interpreter:expr\` (式)

なので \`popn_top!([op1], op2, ctx.interpreter)\` を呼ぶとマッチは：

- \`$x\` = 識別子 1 つのリスト: \`op1\`
- \`$top\` = \`op2\`
- \`$interpreter\` = \`ctx.interpreter\`

\`popn_top!([a, b, c], top, ctx.interpreter)\` を呼ぶと \`$x\` は 3 つのリスト。

展開は \`$($x),*\` を使って同じ識別子リストを destructuring パターンに展開する。

## マクロの hygiene — マクロがあなたのスコープを汚染できない理由

\`macro_rules!\` マクロは **hygienic**: マクロ内で導入された変数名は呼び出し元のスコープの変数と衝突しない。

\`\`\`rust
macro_rules! double {
    ($e:expr) => {{
        let temp = $e;       // マクロ内の 'temp'
        temp * 2
    }};
}

let temp = "important";      // 呼び出し元の 'temp'
let n = double!(5);          // 呼び出し元の 'temp' を壊さず展開
println!("{}", temp);        // まだ "important"
\`\`\`

Hygiene は \`macro_rules!\` の特徴 (そして C スタイルのマクロより好まれる主な理由)。

## \`macro_rules!\` vs \`proc_macro\`

両方に出会う。簡単な区別：

| | \`macro_rules!\` | proc-macro |
| :--- | :--- | :--- |
| **定義** | パターンマッチルール | 別の \`proc-macro\` クレート内の Rust 関数 |
| **操作対象** | Token tree (リテラル構文) | TokenStream (コンパイラのパース後表現) |
| **力** | 限定的だがほぼ十分 | 任意のコード生成 |
| **例** | \`vec!\`、\`println!\`、\`popn_top!\`、\`gas!\` | \`#[derive(Serialize)]\`、\`sol!\`、\`address!\` の裏の \`hex!\` |

\`macro_rules!\` が Revm のインタープリタが使うものをカバー。\`sol!\` と重い proc-macro は Expert ティアのトピック。

## 全部まとめる

中級レッスン 1 で \`revm/crates/interpreter/src/instructions/macros.rs\` を開くと：

\`\`\`rust
macro_rules! popn_top {
    ([ $($x:ident),* ], $top:ident, $interpreter:expr) => {
        if $interpreter.stack.len() < (1 + $crate::_count!($($x)*)) {
            $crate::primitives::hints_util::cold_path();
            return Err($crate::InstructionResult::StackUnderflow);
        }
        let ([$( $x ),*], $top) = unsafe {
            $crate::interpreter_types::StackTr::popn_top(&mut $interpreter.stack)
                .unwrap_unchecked()
        };
    };
}
\`\`\`

これを単語ずつ読める：

- \`macro_rules!\` — 宣言的マクロ定義
- パターン \`([ $($x:ident),* ], $top:ident, $interpreter:expr)\` — 呼び出し引数を destructure
- 本体: 長さチェック、それから \`unsafe { ... }\` ブロックで \`unwrap_unchecked()\` を呼ぶ (長さが直前で検証済みだから)
- \`SAFETY\` の根拠は長さチェック — コメントは暗黙 (Revm はタイトなコードでは時々省略)

魔法を読んでいるわけではない。**すでに知っているパターンを** 読んでいるだけです。

## 読み物リスト

1. **Rust Book 章 19.5 (Macros)** — 簡潔。1 度読んで、必要時に戻る。
2. **The Little Book of Rust Macros** ([danielkeep.github.io](https://danielkeep.github.io/tlborm/book/index.html)) — 無料、最高のマクロ-by-example リファレンス。

## このレッスンで持ち帰るもの

- **\`macro_rules!\`** は token パターンにマッチしてコンパイル時にコードに展開する
- フラグメント specifier (\`$x:expr\`、\`$x:ident\`、\`$x:tt\`) が各メタ変数がマッチする構文を宣言
- 繰り返し構文 \`$( ... ),*\` で 1 つのパターンが引数のリストにマッチできる
- **Hygiene** がマクロが呼び出し元のスコープを汚染するのを防ぐ
- **proc-macros** は重い兄弟 — 別クレート、TokenStream で動く — Expert で扱う

## 技術的前提知識は完了

これで **スタックを読む — 中級への橋渡し** の **技術的** 前提は終了：

- ✓ EVM をバイト単位で (dispatch loop、ストア、ガス、コールフレーム)
- ✓ ブロックレベルの Ethereum (ブロック、レシート、reorg)
- ✓ ソース読みのための Rust (generics、dyn、Arc、unsafe、マクロ)

進む前に、簡単なゲートチェック。最初の中級レッスンを開くとこれが見えるはず：

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

各部品が、今や 1 つの繋がった文として読めるはず：

- シグネチャ: 型パラメータ 2 つ、片方が \`?Sized\` で \`dyn Host\` になれる
- マクロ呼び出し: 1 pop、新トップへの可変参照、内側の長さチェックで正当化された unsafe \`unwrap_unchecked\`
- 算術: \`wrapping_add\` は EVM の \`ADD\` が mod 2²⁵⁶ だから

この 3 文がしっくり来たら、技術的前提は身についています。

## あと 1 レッスン — 中級コースの読み方

中級ティアは **3 つの独立したコース**（Revm・Reth・Alloy）で、すべてが同じ編集スタイル — Predict プロンプト、クイズゲート、積み上げ → ウォークスルー → クイズ → ドリルのチェーン構造 — を共有します。次は **「中級コースの読み方」** を読んでください。3 つの中級コース全てに適用されるメタオリエンテーション、つまり 1 度読めば済む内容です。

それから、コースを 1 つ選んで始める。`,
                },
                {
                  title: 'ソース読解コースの読み方',
                  slug: 'advanced-tier-orientation-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 6,
                  xpReward: 15,
                  content: `# ソース読解コースの読み方

> 🧭 **このレッスンの位置づけ:** 中級ティアへのゲート — 「Rust EVM スタックをソースレベルで読む」が実際に何を要求するか、その契約を確認する回。Inside Alloy / REVM / Reth がどれくらいの深さを要求するか、ここで読み手側の期待値を整える。

あなたは **Intermediate ティア** の入口に立っています — **3 つの独立したコース**（**Inside Revm**・**Inside Reth**・**Inside Alloy**）はすべて同じスキルを教えます: **本番の Rust ソースを 1 行ずつ読む。** この短いレッスンは、それらのコースがどう構成されているかを説明し、レッスン 1 から正しいマインドセットで臨めるようにします — どのコースから始めても。

(各コースにも、コース固有の前提とセットアップを扱う短いウェルカムがあります。*このレッスン* は、1 度読めば済む **汎用的な** オリエンテーション。)

## ティアシフト

Beginner ティア (Beginner / Fundamentals / 中級への橋渡し) は、スタックの **形** を教えました — Alloy 型はどんなものか、Foundry の使い方、EVM が高レベルで何をしているか。

Intermediate ティアは別のことを要求します。**Reth・Revm・Alloy・Foundry の本物の本番ソースを 1 行ずつ読みます。** レッスンはあなたが既にこのスタックを使えることを前提にしている — *読めるように* 教えます。

前のレッスンで技術的前提が身についたことを確認しました（\`add\` Opcode のシグネチャを読める）。残るは、レッスン *自体* がどう書かれているか、そしてあなたに期待するリズムです。

## レッスンの書き方 — そしてその理由

ソース読解レッスンは、これまでのティアにはない **能動学習プロンプト** を使います：

- 🛑 **Predict (予測)** — *止まる。解説を読む前に、これに頭の中で答えてください。* ポイントは質問に取り組むこと。間違っていてもいい。間違った予測こそが学習の起点。
- 🔍 **Find in repo (リポジトリで確認)** — 実際のソースファイルを開いて、レッスンの主張を検証する。レッスンはガイダンス、ソースが真実。
- **理解度チェック (Anti-fluency)** — *自分の言葉で、なぜこれが効くか?* 答えられないなら、レッスンは明示的に「戻れ」と言います。**スキップしないこと。**
- **末尾の想起テスト** — ほとんどのレッスンが「自分の言葉で X に答えられないうちは、このレッスンはまだあなたを離しません」で終わります。文字通り受け取ってください。
- **クイズゲート** — すべての主要トピックは 4 問のクイズで終わり、進行をゲートします。**クイズはうなずきで通せない** — それが設計。2 問落としたら積み上げが内面化していない、戻る。

編集スタイルはこれまでのチュートリアルより難しい。意図的にそうしています。**滑らかなチュートリアル散文は「わかった気になる」罠を生む** — 読者は複雑な内容を流して読み、浅い理解で去ってしまう。Predict / Recall / Quiz パターンは実際のエンゲージメントを強制します。

これは **設計上の摩擦**。受け入れて。

## レッスンの実際の読み方

各主要ソース読解トピック（\`add\`・カスタム Opcode・Database トレイト・Staged Sync・ExEx・Reth SDK・Provider トレイト）はそれぞれ **3〜4 本のアトミックなレッスンの「チェーン」** に分割されています：

1. **積み上げレッスン (Build-up)** — まず最も素朴に書ける版から始め、複雑さを 1 つずつ意味付きで獲得していく。終わりには本物の本番ソースの全行を、動機付きで自分で組み立てたことになる。各ステップで Predict プロンプト。
2. **ウォークスルー / パイプライン / 仲間トレイトのレッスン**（チェーンによって 1 本ある）— 周辺の本番コードを詳しく読む。Predict と Find-in-repo プロンプト付き。
3. **クイズ** — 4〜5 問の選択式で進行をゲート。通れば次へ、落とし過ぎたら戻る。
4. **ドリル** — 本物のチェックアウトでの実践（\`cargo build\`、ソース改変、挙動観察）。1 日経ってもレッスンが残るのは、この読みではなく「やる」段階のおかげ。

各レッスン内のリズム：

1. 解説の前に 🛑 **Predict** プロンプトが出てきたら、止まる。頭の中か紙で答える。それから続ける。
2. 解説を読む。予測と比較。**間違っていた箇所が学びの場所。**
3. 🔍 **Find-in-repo** プロンプトが出てきたら、リポジトリを開く。実際のファイルを見つける。レッスンの主張を検証。
4. 末尾の想起テスト。自分の言葉で答えられたらタブを閉じる。答えられないならスクロールバック。

これは典型的なチュートリアルより遅い。**しかし身体に染み込む**。意図的なトレードオフです。

## ペース

各アトミックレッスンは表示上 **8〜12 分、プロンプトに本気で取り組むと〜15〜25 分**。1 つのトピックチェーン全体（積み上げ → ウォークスルー → クイズ → ドリル、3〜4 本）は **おおよそ 45〜80 分** — 1 晩がかりの仕事。**Advanced ティア（Intermediate の先の L1 Architect 系）** のチェーンはさらに長い — 1 セッションに 1.5〜3 時間が普通。実際の L1 アーキテクトの仕事が要求する長さだから。

**正しい単位はセッションあたり 1 チェーン**。チェーン（例えば Inside Revm の \`add\` の 4 本）を始めたら、その日のうちに終わらせる計画で。積み上げ・ウォークスルー・クイズが互いに強化し合い、ドリルで「読み」が「記憶」に変わる。チェーンを跨日で割る — 今晩は積み上げの半分、来週に残りとドリル — はモデルを壊します。

時間がないなら: 2 本を流すよりも *1 本を丁寧に*。このティアではエンゲージメントが網羅性より重要。

## さあ、コースを選ぶ

3 つのソース読解コースは独立していて任意の順序で進められます — ただし **Inside Revm を最初に推奨**、その型（\`Address\`、\`U256\`、\`Database\` トレイト）が Reth と Alloy の前提になるから:

- **Inside Revm** — EVM エンジンの内部
- **Inside Reth** — Reth の内部: Staged Sync・ExEx・Reth SDK
- **Inside Alloy** *(近日公開)* — Alloy の内部: Provider・Network・Signer

各コースに、コース固有の前提とセットアップを扱う短いウェルカムがあります。それを読んでレッスン 1 を始めてください。

## Intermediate の先 — Advanced ティア (L1 Architect)

Intermediate のソース読解を完走すると、次は **Advanced ティア**（5 コース、難易度 **ADVANCED**、track \`reth-l1-architect\`）が待っています。Intermediate が「本番ソースを **読む**」を教えるなら、Advanced は「自分で L1 を **設計する**」を教える — Hyperliquid や Tempo クラスの L1 をアーキテクトするための実装スキル。

- **Consensus Engineering** — PoS / BFT / Tendermint の内部、レイテンシ・ライブネス・finality の設計トレードオフ
- **Cross-Chain Bridges** — CCIP・OP Standard Bridge・light client を本番ソースで読み、自分で書く
- **Sequencer & Rollup アーキテクチャ** — 中央集権 sequencer から共有 sequencer まで、MEV 防衛と forced inclusion
- **P2P ネットワーキング内部** — devp2p・libp2p・gossip サブプロトコル・ピアスコアリングの実装読解
- **Validator 運用** — 鍵管理、slashing 条件、協調アップグレード

各チェーンは Intermediate のソース読解チェーンの 1.5〜3 倍の長さ。**今は気にしないこと** — まずソース読解のチェーンを 1 つ完走するのが先。Advanced (L1 Architect) は遠い目的地としてだけ意識しておけば十分。

準備完了。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
