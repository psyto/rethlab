import { PrismaClient } from '@prisma/client';

export async function seedRethBridgeToAdvancedJA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'evm', 'rust', 'bridge'];

  await prisma.course.create({
    data: {
      slug: 'reth-bridge-to-advanced-ja',
      title: 'スタックを読む — Advanced への橋渡し',
      description:
        'Fundamentals は終えた。でも Advanced のソース読みは依然として圧倒的。このコースがそのギャップを埋めます。EVM をバイト単位で（ディスパッチループ・ワールドステート・コールフレーム・reorg）、そして Reth/Revm のソースが暗黙の前提とする中級 Rust（generics・dyn・Arc・unsafe・macro_rules）。',
      difficulty: 'INTERMEDIATE',
      duration: 180,
      xpReward: 200,
      track: 'reth-bridge-to-advanced',
      tags,
      isPublished: true,
      sortOrder: 250,
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

Solidity を書いてきた。Foundry でデプロイとテストもした。でも、デプロイ後の EVM は **実際に何をやっているのか?** このレッスンは1段階下のレイヤー — バイトの世界 — に降りていきます。

これが Advanced レッスンが暗黙の前提にしているレイヤー。これがないと \`revm/crates/interpreter\` のソースは雑音にしか読めません。

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

## なぜ Advanced で重要か

Advanced コースで \`revm/crates/interpreter/src/instructions/arithmetic.rs\` を開くと、こう書いてあります：

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

このレッスン抜きだと「何かの Rust 関数」にしか見えない。あった上では：

- これは **256 エントリ命令テーブルのスロット 0x01 にある関数ポインタ**。
- インタープリタループが **bytecode から 0x01 を fetch して、これを呼んだ**。
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
- **カスタマイズ容易**: フォークは **1 スロット** を置き換えるだけでカスタム opcode を追加できる（Advanced lesson 2 で出てきます）。

## 読み物リスト — Advanced 前にやること

1. **[evm.codes](https://www.evm.codes) を開いて** クリックして回る。各 opcode、ガスコスト、スタック効果。ブックマーク必須。
2. **[Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf) の EVM セクション**、9–13 ページをスキム。通読しなくていい。ループと opcode の形式定義を見るだけ。見た目より読みやすい。
3. **1 行の Solidity コントラクトを \`forge build\` でコンパイル**。\`out/Contract.sol/Contract.json\` を開いて \`bytecode.object\` を見る。認識できるバイト (PUSH, MSTORE, JUMP) を探す。

## このレッスンで持ち帰るもの

- EVM は **バイト駆動の dispatch ループ**: バイトを fetch、256 スロットの関数テーブルを引く、ハンドラを実行、PC を進める。
- 各 opcode は **固定の契約** を持つ小さな Rust 関数（Revm の場合）: スタック・メモリ・ガス・必要ならストレージに触れて、制御を返す。
- Advanced lesson 1 で見るすべての詳細（\`add<IT, H>\`、命令テーブル、PC、halt）はこのモデルに直接マッピングされる。

Advanced を始めたら、最初のレッスンで **まったく同じ** \`add\` 関数が出てきます。それが何か驚きはない — あなたが既に理解している何かの本番グレード実装を読むだけです。`,
                },
                {
                  title: 'メモリ・ストレージ・ワールドステート',
                  slug: 'memory-storage-world-state-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# メモリ・ストレージ・ワールドステート

dispatch loop は opcode が *何* かを見せました。ほとんどの opcode は 4 つのストアのうちの 1 つに触れます。このレッスンはそれらを順に歩きます — そして Solidity が隠しているけれど Advanced レッスンが前提とするワールドステートのモデルも。

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

Advanced lesson 3 (Database トレイト) で：

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

Solidity 1 行とチェーンの state root の間に 5 つのレイヤー。**5 つすべてが Advanced と Expert で読むソースの中にある**。

## 読み物リスト

1. **[evm.codes](https://www.evm.codes) を開いて** MLOAD・MSTORE・SLOAD・SSTORE・CALLDATALOAD を探す。ガスメモを読む。
2. **[Etherscan](https://etherscan.io) で実コントラクトを探し**、バイトコードを見る、\`SLOAD\` (\`0x54\`) と \`SSTORE\` (\`0x55\`) のバイトを検索。至る所にある。
3. **Foundry で** 1 つの \`uint256\` 状態変数を持つコントラクトを書く。1 関数内で 2 度読む。\`forge test --gas-report\` でガス計測。2 度目の読みが約 2000 ガス安い — それが cold-vs-warm の実例。

## このレッスンで持ち帰るもの

- Stack・memory・calldata・storage は **4 つの異なるストア** で、寿命・コスト・API が異なる。
- **Storage** はコントラクトごとの \`U256 → U256\` マップ — Solidity のスロット割り当てはその上のパッキング。
- **ワールドステート** は \`Address → Account\` マップ。各 Account が自分のストレージ trie を指す。
- Revm \`Database\` トレイトの 3 つのコアメソッド (\`basic\`、\`code_by_hash\`、\`storage\`) は **このワールドステートモデルを直接ミラー** している。

Advanced lesson 3 で Database トレイトを見たとき、これがまさにこの絵を Rust トレイトで表現したものだと認識できるはず。`,
                },
                {
                  title: 'ガス機構の深掘りとコールフレーム',
                  slug: 'gas-call-frames-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# ガス機構の深掘りとコールフレーム

「ガスはお金がかかる」は知っている。このレッスンはもう 1 段下げる — ガスが実際どこに行くか、そして 1 つのトランザクションがどう **コールフレーム** のツリーを生成するか、各フレームが独自のコンテキストを持つこと。

両トピックとも、カスタム opcode・precompile・ExEx の Advanced レッスンで前提知識として扱われます。

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

Advanced lesson 1 で Revm の \`PrecompileHalt::OutOfGas\` と他の halt が出てくる時、この区別がモデル化されている。

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

Advanced lesson 6 (ExEx) で「この tx がこれらのアカウントのこれらのストレージスロットに触れた」と出た時、CALL vs DELEGATECALL を知っていることが理解の鍵。

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
3. **[Wormhole hack postmortem](https://www.coinbase.com/blog/decoding-the-wormhole-attack)** を読む — バグは DELEGATECALL セマンティクスの誤解。このレッスンが頭にあると exploit が明白になる。

## このレッスンで持ち帰るもの

- ガスは **3 つの形** で来る: 内在 (per-tx)、opcode ごと (固定 + 動的)、リファンド (キャップ付き)。
- **OOG と REVERT** は似ているが returndata と残りガスで違う。
- tx は **コールフレームのツリー**。各フレームが独自の stack/memory/PC/gas を持つ。
- **DELEGATECALL** は呼び先のコードを呼び出し元のコンテキストで走らせる call スタイル — プロキシパターンの基盤、多くのバグの元凶。

Advanced lesson 5 (カスタム precompile) でガス価格モデル、もしくは lesson 6 (ExEx) で複数のコミット済みトランザクションを跨いで再構成する話が出た時、コールフレームとガスモデルが頭にある — 抽象概念ではなく具体的な機械として。`,
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

ここまで 1 トランザクションずつ扱ってきました。チェーンは別のレベルで動きます: トランザクションの **ブロック**、何をしたかの **レシート**、そして時々起きる **reorg** (チェーンが直近の歴史を書き換えること)。

これは Reth の Staged Sync と ExEx の Advanced レッスンが暗黙の前提とするレイヤー。

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

ライトクライアントはヘッダーだけを持ち、proof を歩いてどれでも検証可能 (Expert で見ます)。

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

Advanced lesson 7 (本番 MEV) で ExEx コードがアドレスでログをフィルタする時、このブルームが事前フィルタを高速にする。

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

Advanced lesson 4 で Reth の \`ExecutionStage\` を読む時、それが正にこの検証パス: 各ブロックの tx を再生し、状態変更を蓄積、結果のルートを検証。

## Reorg — チェーンが自分を書き換える

通常チェーンは線形に伸びる：

\`\`\`
... → block 100 → block 101 → block 102 → block 103
\`\`\`

しかし時々、2 人の validator が同じスロットでブロックを提案したり、ネットワーク分断が回復したりすると、**正準チェーンが切り替わる**。tip の数ブロックが *巻き戻され*、チェーンは別のパスで再延伸：

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

モダン Ethereum (Merge 後 PoS) では **1-2 ブロックより深い reorg は稀** だが起きる。validator が proposal 欠落や equivocation 周りで再構成する。

### オフチェーン消費者にとっての意味

「ブロック N コミット → 自分の DB に txs 書き込み」というインデクサを書いて、ブロック N が reorg されたら：

- DB に **正準チェーン上で起きなかった** トランザクションの行が残る
- reorg 検知時にそれらの行を **削除する必要** がある
- そして新正準ブロック N の tx の行を再挿入

これが **まさに** ExEx に 3 通知タイプがある理由 — \`ChainCommitted\`、\`ChainReorged\`、\`ChainReverted\`。\`ChainCommitted\` だけ扱う naive インデクサは reorg のたびに導出状態を破壊する。(Advanced lesson 6 で詳しく扱う。)

### なぜ Reth の Staged Sync が対称なのか

Reth の各 Stage は \`execute\` (forward) と \`unwind\` (backward) を持つ。Stage は reorg を「特殊ケース」として設計されていない — reorg は **通常運用**、同じトレイトでモデル化される。1000 ブロック前進: \`execute\`。reorg で 3 ブロック後退: \`unwind\`。同じコードパス、逆方向。

これは Advanced lesson 4 (Staged Sync アーキテクチャ) で評価できる設計判断。

## 読み物リスト

1. **[Etherscan](https://etherscan.io) で実ブロックを探す**。ヘッダーの「Click to see More」をクリックして全フィールドを見る。parentHash、stateRoot、transactionsRoot、receiptsRoot、logsBloom を見つける。
2. **そのトランザクションの 1 つを開いて** Logs タブを見る。各ログが Address・Topics・Data を持つ — それが上の構造。
3. **本番での reorg の感覚を得るには** [reth.rs ブログ](https://reth.rs/) や Ethereum クライアントのリリースノートで「reorg」を検索 — 運用者は reorg ハンドリングの正しさを大いに気にする。

## このレッスンで持ち帰るもの

- **ブロック** = ヘッダー + ボディ + レシート。ヘッダーは 3 つの Merkle root (state・txs・receipts) を持つ。
- **レシート** が各 tx のステータス・ガス・ログを記録 (Solidity \`event\` は LOG opcode 経由でログになる)。
- **Reorg** は直近の歴史を書き換える。オフチェーン消費者は巻き戻しを明示的に扱う必要がある。
- Reth の Staged Sync は **対称** (execute / unwind) — それは reorg が例外ではなく通常運用だから。

Advanced lesson 4 で Stage トレイトを歩く時、lesson 6 で ExEx 通知タイプを歩く時、モデルが既に頭にある。実装する Rust を読むだけ。`,
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
                  title: 'Generics・trait bounds・?Sized・dyn vs impl',
                  slug: 'rust-generics-traits-bounds-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 30,
                  content: `# Generics・trait bounds・?Sized・dyn vs impl

これが \`pub fn add<IT: ITy, H: ?Sized>(...)\` を見て怯まないで読めるようになるレッスン。Reth と Revm のソースは **generics でぎっしり** — 関数シグネチャに型パラメータが 3 つあるのは普通。このレッスンでその機械を 1 つずつ歩きます。

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

\`dyn Trait\` として使うにはトレイトが **オブジェクト安全** でなければならない。ルールは微妙だが、最頻 gotcha：

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

Advanced lesson 1 でいきなり 1 行目に型パラメータ 3 つと \`?Sized\` をぶつけられた時、それを 5 つの威圧的なトークンではなく、1 つの繋がった文として読めるはず。`,
                },
                {
                  title: '所有権の共有: Arc・Mutex・RwLock',
                  slug: 'rust-shared-ownership-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# 所有権の共有: Arc・Mutex・RwLock

Rust の「ただ一人のオーナー」ルールは厳しい — そして 90% の場合は助かる。残り 10% は **複数の場所から同じ値を保持** する必要があり、スレッド跨ぎだったり、変更ありだったりする。それがこのレッスン。

Reth と ExEx のコードは **\`Arc\` と \`Mutex\` がぎっしり**。このレッスンなしだと、それらのラッパーは雑音に感じる。あった上では、Reth が状態を非同期タスク間でどう共有しているかの load-bearing な部品。

## 問題 — なぜ所有権だけでは不十分か

インデクサが：

- チェーンから新ブロックを受け取る (1 タスク)
- RPC サーバが現在の状態をクエリする (多タスク)
- 定期的に状態をディスクへスナップショット (1 タスク)

3 つすべてが同じインメモリ状態にアクセスする必要がある。素の Rust 所有権は「ただ一人のオーナー」と言う — でもここでは *本当に* 共有アクセスが必要。

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

\`Rc<T>\` は同じ形だが **シングルスレッド**。通常 (非アトミック) カウンタを使う。速いがスレッド跨ぎでは unsound。Reth と ExEx は \`Arc\` 一本 — マルチスレッド設計だから。

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

この組み合わせを常に見ます：

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

Reth が DB をタスク間で共有する単純化版：

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

Reth ソースを読んで \`Arc<RwLock<Foo>>\` の隣に \`Arc<Mutex<Bar>>\` を見たら、著者がどちらが正しいか考えている。今やあなたはその判断を読める。

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

Advanced lesson 6 (ExEx) で \`Arc<...>\` フィールドが 3 つあるような struct を見て「なぜラッパーだらけ?」と思った時、各々がそのコンポーネントが runtime のタスク間でどう共有されるかの load-bearing 部品だと知っているはず。`,
                },
                {
                  title: 'unsafe Rust と macro_rules! 基礎',
                  slug: 'rust-unsafe-and-macros-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 30,
                  content: `# unsafe Rust と macro_rules! 基礎

標準 Rust 教科書が *薄い* 2 領域、そして Revm のインタープリタが *深く* 入る 2 領域。このレッスンで、Revm のホットパスを \`unsafe { ... }\` ブロックや \`$d:tt\` だらけのマクロ定義に怯まず読める語彙を得ます。

## Part 1: \`unsafe\` Rust

### \`unsafe\` が実際に許すもの

Rust の安全性保証 (データ競合なし、use-after-free なし、境界外アクセスなし) はコンパイラが強制する — でも **safe Rust** に対してだけ。\`unsafe\` コードだけが許される 5 つのこと：

1. **生ポインタの dereference** (\`*const T\` または \`*mut T\`)
2. **\`unsafe fn\` の呼び出し** (コンパイラが検証できない関数)
3. **可変 static 変数のアクセス・変更**
4. **\`unsafe trait\` の実装** (\`Send\` や \`Sync\` を手動で)
5. **\`union\` のフィールドアクセス**

それが *リスト全部*。重要なことに、\`unsafe\` はローカル変数の借用チェッカーを *無効化しない*、null ポインタ deref を *自動的に* 許可しない、型チェックをスキップさせない。

### 契約 — \`unsafe\` が *する* こと

\`unsafe\` はあなたからコンパイラへの **約束**: 「このコードが Rust の安全性不変条件を維持していることを手動で検証した。信用していい」。

その約束が間違っていると、**未定義動作 (UB)** が起きる — UB は *破滅的*。一度 UB が起きると、プログラム全体が不整合状態。コンパイラは UB が起きないと仮定して最適化していたかもしれない、なので実行時の振る舞いは何でもありうる: クラッシュ・誤った結果・セキュリティホール・もっともらしいけど誤った出力。

**「小さな UB」は存在しない**。UB のあるプログラムは間違っている、それだけ。

### なぜ Revm はホットパスで \`unsafe\` を使うか

Advanced lesson 1 の Revm の \`popn_top!\` マクロには：

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

### Revm/Reth での \`unsafe\` 規律

慣用的な \`unsafe\` 使用はこんな感じ：

\`\`\`rust
// 安全性不変条件を説明するコメントブロック
// SAFETY: We just checked stack.len() >= N+1 above, so popn_top
// is guaranteed to return Some.
let result = unsafe { popn_top.unwrap_unchecked() };
\`\`\`

よく書かれた Rust の各 \`unsafe\` ブロックには **\`// SAFETY:\` コメント** があり、なぜ unsafe が健全かを記述する。レビュアーはこれを探す; 不在は code smell。

### \`unsafe fn\` vs \`unsafe { ... }\`

関連するが異なる 2 つの概念：

| 形 | 意味 |
| :--- | :--- |
| \`unsafe { ... }\` ブロック | 「5 つの unsafe な事の 1 つをやっている、不変条件を検証済み」 |
| \`unsafe fn foo(...)\` | 「この関数を呼ぶには unsafe が必要 — *呼び出し元* が不変条件を検証する必要がある」 |

\`unwrap_unchecked()\` は \`unsafe fn\`。呼ぶには呼び出し場所を \`unsafe { ... }\` で囲む。それが契約: 関数が「事前条件がある」と宣言、呼び出し元が「チェック済み」と宣言。

### まだ知らなくて良いもの

- \`Send\` / \`Sync\` の手動実装 (Reth はあまりやらない)
- インラインアセンブリ (ほぼなし)
- C への FFI (jemalloc 関連だけ、それも 1 つのグローバル設定)

Revm/Reth ソースを読むには、**上のパターン (手動安全性検証 + チェック後の \`unwrap_unchecked\`) が見るものの 95%**。

---

## Part 2: \`macro_rules!\`

Revm のインタープリタは **マクロでぎっしり**。\`popn_top!\`、\`gas!\`、\`push!\`、\`as_usize_or_fail!\` — これらは関数呼び出しではなく、コンパイル時のテキスト展開。読むには構文を知る必要がある。

### 基本の形

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

### 一般的なフラグメント specifier

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

### 繰り返し: \`$( ... ),*\`

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

### Revm の \`popn_top!\` を読む

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

### マクロの hygiene — マクロがあなたのスコープを汚染できない理由

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

### \`macro_rules!\` vs \`proc_macro\`

両方に出会う。簡単な区別：

| | \`macro_rules!\` | proc-macro |
| :--- | :--- | :--- |
| **定義** | パターンマッチルール | 別の \`proc-macro\` クレート内の Rust 関数 |
| **操作対象** | Token tree (リテラル構文) | TokenStream (コンパイラのパース後表現) |
| **力** | 限定的だがほぼ十分 | 任意のコード生成 |
| **例** | \`vec!\`、\`println!\`、\`popn_top!\`、\`gas!\` | \`#[derive(Serialize)]\`、\`sol!\`、\`address!\` の裏の \`hex!\` |

\`macro_rules!\` が Revm のインタープリタが使うものをカバー。\`sol!\` と重い proc-macro は Expert ティアのトピック。

## 全部まとめる

Advanced lesson 1 で \`revm/crates/interpreter/src/instructions/macros.rs\` を開くと：

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

魔法を読んでいない。**今や知っているパターンを** 読んでいる。

## 読み物リスト

1. **Rust Book 章 19.5 (Macros) と章 19.1 (Unsafe Rust)** — 両方とも簡潔。1 度読んで、必要時に戻る。
2. **The Little Book of Rust Macros** ([danielkeep.github.io](https://danielkeep.github.io/tlborm/book/index.html)) — 無料、最高のマクロ-by-example リファレンス。
3. **Revm で \`unsafe {\` を検索** して周辺コードを \`SAFETY:\` レンズで読む — 事前条件は何? どこで検証されている?

## このレッスンで持ち帰るもの

- **\`unsafe\`** は 5 つの特定のことを許す; ライセンスではなくコンパイラとの *契約*
- **\`unwrap_unchecked()\`** + 直前の長さ/状態チェックは、Revm のホットパスで冗長な実行時チェックをスキップする正準パターン
- **\`macro_rules!\`** は token パターンにマッチしてコードに展開する; \`$x:expr\`、\`$($x),*\`、フラグメント specifier、hygiene
- **proc-macros** は重い兄弟 — 別クレート、TokenStream で動く — Expert で扱う

## コース完了 — 次のステップ

これで **スタックを読む — Advanced への橋渡し** を完了：

- ✓ EVM をバイト単位で (dispatch loop、ストア、ガス、コールフレーム)
- ✓ ブロックレベルの Ethereum (ブロック、レシート、reorg)
- ✓ ソース読みのための Rust (generics、dyn、Arc、unsafe、マクロ)

Advanced lesson 1 を開くと：

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

そしてその全部品が、今や 1 つの繋がった文として読めるはず：

- シグネチャ: 型パラメータ 2 つ、片方が \`?Sized\` で \`dyn Host\` になれる
- マクロ呼び出し: 1 pop、新トップへの可変参照、内側の長さチェックで正当化された unsafe \`unwrap_unchecked\`
- 算術: \`wrapping_add\` は EVM の \`ADD\` が mod 2²⁵⁶ だから

準備完了。Advanced を始めましょう。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
