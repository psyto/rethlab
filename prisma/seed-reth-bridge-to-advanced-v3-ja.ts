import { PrismaClient } from '@prisma/client';

export async function seedRethBridgeToAdvancedV3JA(prisma: PrismaClient) {
  const tags = ['rust', 'evm', 'bridge', 'beginner-to-advanced', 'reth'];

  await prisma.course.create({
    data: {
      slug: 'reth-bridge-to-advanced-v3-ja',
      title: 'スタックを読む — 中級への橋渡し',
      description:
        'Beginner（Reth Fundamentals / Reth 入門）を終えて、3 中級コース（Inside Revm / Inside Reth / Inside Alloy）に進む前の橋渡し。10 レッスンで Solidity → bytecode 翻訳、EVM の 5 記憶領域、ガス機構とコールフレーム、ブロック・レシート・reorg、Solidity → Rust 移行マップ、generics / trait bounds / ?Sized / dyn vs impl、Arc / Mutex / RwLock、unsafe Rust、macro_rules!、最後にソース読解コースの読み方。中級コースのソース読みに必要な語彙と Rust 文法の最小セットを揃える。',
      difficulty: 'BEGINNER',
      duration: 119,
      xpReward: 245,
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
                  title: 'レッスン0 — Solidity からバイトコードへ — ディスパッチループ',
                  slug: 'bytecode-dispatch-loop-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン0 — Solidity からバイトコードへ — ディスパッチループ

## 問い

Solidity を書いて Foundry でデプロイしてきた。**デプロイ後の EVM が実際に何をしているか** — バイトの世界へ降りる。これがないと \`revm/crates/interpreter\` ソースは雑音にしか読めない。

## 原理（最小モデル）

- **Bytecode = バイト列.** \`0x60 0x80 0x60 0x40 0x52 ...\` 等、各バイトが opcode or リテラル、EVM 版の x86 機械語。
- **\`PUSH1 0x60\` 等のリテラル付き opcode.** 1 バイトの literal を読み込んでスタックに push、PC は 2 進む（PUSH32 は 33 進む）。
- **PC（Program Counter）+ コアループ.** \`loop { opcode = bytecode[pc]; handler = instruction_table[opcode]; handler(...); pc++; if halted break; }\` の擬似コード 3 行 = EVM の全部。
- **256 エントリの instruction_table.** バイト値 0x00-0xFF 各 1 スロット、各スロットが opcode ハンドラへの関数ポインタ、O(1) ディスパッチ。
- **Halt opcode.** STOP / RETURN / REVERT / INVALID / Out-Of-Gas、すべてループを break、結果（成功 / 失敗 / 状態巻き戻し）は異なる。
- **JUMP / JUMPI で PC 任意設定.** Solidity の \`if\` / \`for\` / 関数呼び出しが JUMP に compile される、PC を直接動かす制御フロー。
- **Solidity ABI と function selector.** コントラクト最初の 4 バイトが function selector（keccak256(signature)[..4]）、ディスパッチが「どの関数を呼ぶか」を判定。

## 具体例 + ステップで組み立てる

# Solidityからバイトコードへ — ディスパッチループ


Solidity を書き、Foundry でデプロイとテストもしてきた。次の問いは、デプロイ後の EVM が実際に何をしているかである。このレッスンは 1 段下のレイヤー、つまりバイトの世界へ降りる。

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

EVM は **program counter (PC)**、すなわち現在のバイトを指す整数を持つ。コアループ:

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

中級に進むと、最初のレッスンで **まったく同じ** \`add\` 関数が出てくる。驚く点はなく、既に理解している中身の本番実装を読むだけである。

## 📺 関連動画

\`\`\`youtube
RxL_1AfV7N4 | EVM: From Solidity to byte code, memory, and storage
\`\`\`

## まとめ（3行）

- EVM コアループ = \`loop { fetch → table lookup → handler → pc++ }\` の擬似コード 3 行、256 エントリ関数ポインタテーブル、O(1) ディスパッチ。
- \`PUSH1\` 等のリテラル付き opcode は PC を進めるバイト数が違う、JUMP/JUMPI は PC 任意設定、halt opcode が結果別れる。
- 次レッスンでメモリ・ストレージ・ワールドステートの 5 記憶領域に踏み込み、bytecode が触る対象を理解する。
`,
                },
                {
                  title: 'レッスン1 — メモリ・ストレージ・ワールドステート',
                  slug: 'memory-storage-world-state-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン1 — メモリ・ストレージ・ワールドステート

## 問い

EVM の bytecode が触る対象 = **5 記憶領域**。Stack / Memory / Calldata / Storage / Code。それぞれ寿命・コスト・容量が違う。**どれが永続化される / どれが揮発 / どれが読み専用 / どれが世界状態か**。

## 原理（最小モデル）

- **Stack.** 1024 段の値置き場、tx 内のみ揮発、最も安価（3 gas / push）、現行計算の対象。
- **Memory.** 線形配列、tx 内のみ揮発、\`MSTORE\` / \`MLOAD\` で読み書き、拡張するとガスコスト上昇（quadratic for large）。
- **Calldata.** tx 入力の読み専用領域、外部呼び出し時のみセット、\`CALLDATALOAD\` / \`CALLDATASIZE\` で読み出し、最安。
- **Storage.** **永続化される唯一の領域**、コントラクトごと、\`SLOAD\` 2,100 gas（cold）/ 100 gas（warm）、\`SSTORE\` 20K gas（新規）/ 5K（変更）、最も高い。
- **Code.** デプロイ済みコントラクトのバイトコード、読み専用、\`EXTCODECOPY\` / \`CODECOPY\` で読み出し。
- **World state.** 全コントラクトの全 Storage + すべての EOA 残高、Merkle Patricia Trie で管理、state root がブロックヘッダに。
- **MPT（Merkle Patricia Trie）.** Ethereum 状態の永続化構造、3 種ノード（Branch / Extension / Leaf）+ keccak256 でルートハッシュ、L1 同期はこのトライを構築する。

## 具体例 + ステップで組み立てる

# メモリ・ストレージ・ワールドステート


dispatch loop で opcode が何かは見えた。ほとんどの opcode は 4 つのストアのうち 1 つに触れる。本レッスンではそれらを順に見て、Solidity が隠している world state モデルも確認する。

## 4 つのストア

| ストア | 寿命 | コスト形状 | Solidity 表面 |
| :--- | :--- | :--- | :--- |
| **Stack** | 1 コールフレーム | 安い (3 ガス / op) | 暗黙 |
| **Memory** | 1 コールフレーム | 安いが二次曲線で増加 | \`memory\` キーワード |
| **Calldata** | 1 コールフレーム、読み取り専用 | 読み取り安い | 関数引数 |
| **Storage** | 永続 (コントラクトごと) | 高い (cold = 2100, warm = 100) | 状態変数 |

各ストアは固有の opcode を持つ。混同は Solidity 開発者の頻出バグの 1 つである。

## Stack — EVM の主要スクラッチ空間

既に見た通り、最大 1024 アイテム、各 32 バイト（1 EVM word）である。算術・比較・論理 opcode はスタックトップから読み、トップへ書き戻す。

スタックオーバーフロー（深さ > 1024）とアンダーフロー（空スタックから pop）は、どちらもフレームを halt させる。

## Memory — リニア、伸縮、フレームローカル

メモリは **バイトのフラット配列**。オフセット 0 からアドレス指定、必要に応じて伸びる。2 つの opcode が中心：

- \`MLOAD offset\` → memory[offset..offset+32] から 32 バイト読み込み、スタックへ push
- \`MSTORE offset value\` → スタックから 32 バイトの値を memory[offset..offset+32] へ書き込み

(\`MSTORE8\` は 1 バイト書き込み。\`MCOPY\` はメモリ間コピー。)

重要なポイントが 2 つ：

### 1. メモリは要求時に伸びる — そしてその対価を払う

オフセット 1000 に書き込む時点でメモリサイズが 64 バイトなら、EVM は **書き込み前にオフセット 1000 まで拡張** する。拡張はガスを消費し、**32 KB 超で二次曲線** になる:

\`\`\`
gas_cost(size_in_words) = 3 × words + words² / 512
\`\`\`

これが長いバイト配列操作が一気に高くなる理由。1 MB のメモリ拡張は **空間だけ** で約 200 万ガス、書き込む前に。

### 2. メモリはフレーム終了で消える

\`CALL\` が return するか \`STOP\` が halt すると、メモリは消える。次の call は空のメモリをオフセット 0 から使う。

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

Solidity はコンパイル時にストレージスロットを割り当てる。\`uint256 private balance\` はスロット 0、\`mapping(address => uint256) balances\` は \`keccak256(address . slot_index)\` などで決まる。つまり raw \`U256 → U256\` マップ **の上** でスロット管理している。

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

中級レッスン 3 で Database トレイトを見たとき、これがまさにこの絵を Rust トレイトで表現したものだと認識できるはず。

## まとめ（3行）

- 5 記憶領域 = Stack 1024 段揮発 / Memory 揮発 quadratic コスト / Calldata 読み専用入力 / Storage 永続化最高コスト / Code 読み専用 bytecode。
- 永続化されるのは Storage のみ、World state = 全コントラクトの Storage + EOA 残高、MPT で管理して state root がブロックヘッダに。
- 次レッスンでガス機構とコールフレームに踏み込み、各 opcode のコスト構造とコントラクト間呼び出しを理解。
`,
                },
                {
                  title: 'レッスン2 — ガス機構の深掘りとコールフレーム',
                  slug: 'gas-call-frames-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン2 — ガス機構の深掘りとコールフレーム

## 問い

EVM は **gas** で実行を計測 + 課金する。tx には gas limit、超えると停止。コントラクトが別コントラクトを呼ぶ（CALL / DELEGATECALL / STATICCALL）と **コールフレーム** が積まれる。**ガス課金の仕組みとフレーム間の親子関係**を理解する。

## 原理（最小モデル）

- **Intrinsic gas.** Tx 発火時の固定コスト（21K + calldata bytes 4/16 gas）+ access list の事前購入、これが消えた後 bytecode 実行。
- **Per-opcode gas.** 各 opcode 固定 or 動的コスト、ADD = 3、SLOAD cold = 2100、SSTORE 新規 = 20K、EIP-2929 で cold/warm 概念導入。
- **EIP-2929 cold/warm.** 同じスロット 2 回目以降は warm（100 gas）、初回は cold（2100 gas）= 状態アクセスの実コスト反映。
- **Gas refund.** SSTORE で値を 0 に戻す等で refund、tx 終了時に gas_used の 1/5 まで返却、cap 制限あり。
- **コールフレーム.** CALL / DELEGATECALL / STATICCALL で新フレーム積む、親フレームから子フレームへ gas 渡し（63/64 ルール）、子のリターン値が親のスタックに。
- **CALL vs DELEGATECALL vs STATICCALL.** CALL = 新 context（msg.sender 変わる）、DELEGATECALL = 親 context（library パターン）、STATICCALL = 読み専用（state 変更不可）。
- **Out-of-gas.** 子フレームで gas 枯渇 → REVERT で巻き戻し、親フレームは続行可能（CALL のリターン値が 0 = 失敗）。
- **msg.sender / tx.origin の違い.** msg.sender = 直接呼び出し元（フレーム単位）、tx.origin = tx 発火 EOA（ずっと同じ）、攻撃面で重要。

## 具体例 + ステップで組み立てる

# ガス機構の深掘りとコールフレーム


「ガスはお金がかかる」は知っているはず。本レッスンではもう 1 段掘り下げる — ガスが実際どこへ消えるか、そして 1 つのトランザクションがどう **コールフレーム** のツリーを生成するか、各フレームが独自のコンテキストを持つこと。

両トピックは、カスタム opcode・precompile・ExEx の中級レッスンで前提知識として扱う。

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

3 つがモダン Ethereum で使われる。表を 2 度読む。バグ理解で重要なのは次の点である:

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

中級レッスン 5 (カスタム precompile) でガス価格モデル、もしくは lesson 6 (ExEx) で複数のコミット済みトランザクションを跨いで再構成する話が出た時、コールフレームとガスモデルはすでに頭の中にある — 抽象概念ではなく、具体的な機械として。

## まとめ（3行）

- Gas = intrinsic（21K + calldata）+ per-opcode（cold/warm）+ refund（cap 制限）、tx 終了時 gas_used の 1/5 まで返却。
- コールフレーム = CALL / DELEGATECALL / STATICCALL で積む、63/64 ルールで子へ gas 渡し、CALL は新 context、DELEGATECALL は親 context（library）、STATICCALL は読み専用。
- msg.sender はフレーム単位、tx.origin は tx 発火 EOA、Out-of-gas は子だけ REVERT、次モジュールでブロック・レシート・reorg。
`,
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
                  title: 'レッスン3 — ブロック・レシート・reorg',
                  slug: 'blocks-receipts-reorgs-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン3 — ブロック・レシート・reorg

## 問い

tx の中身はこれまで見た。**1 段上 = ブロック**。ブロックは tx の列 + header + receipts + state root。**reorg** は信頼の浅いブロックが捨てられて別のチェーンに置き換わる現象、L1 同期コードの最大の複雑性源。

## 原理（最小モデル）

- **ブロック構造.** Header（親ハッシュ / state root / receipts root / timestamp / number / gas used / gas limit 等）+ Body（tx 列 + uncles）+ Receipts（tx 結果）。
- **State root.** 全コントラクトの Storage + EOA 残高の MPT ルートハッシュ、ブロック実行前後で変化、validator が独立に検証可能。
- **Receipts root.** 各 tx の結果（status / gas used / logs / events）の MPT ルート、tx の結果が証明可能。
- **Reorg = 信頼の浅いブロックの差し替え.** PoS では概ね 2-3 ブロック以内が reorg 可能、\`finalized\` ブロックは reorg 不可（~12 ブロック後）。
- **Reorg 時の挙動.** Old chain の tx を巻き戻し → new chain の tx を再実行、subscriber には \`ChainReorged\` イベント、state DB は old/new 両方の view を持つ必要。
- **Finality 3 段.** \`latest\`（未確認）/ \`safe\`（~32 ブロック前、likely finalize）/ \`finalized\`（不可逆、~12 分後）= 開発時にどの段で読むか。
- **Block-level data 例.** \`block.number\` / \`block.timestamp\` / \`block.coinbase\` / \`block.basefee\`、tx で読める EVM 露出データ。
- **Reth の reorg 対応.** ExEx（Execution Extension）通知 で 3 バリアント（Committed / ChainReorged / Reverted）、indexer は 3 つ全部処理する必要。

## 具体例 + ステップで組み立てる

# ブロック・レシート・reorg


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

中級レッスン 4 で Stage トレイトを読むときも、lesson 6 で ExEx 通知型を読むときも、モデルはすでに頭にある。あとは実装された Rust を読むだけでよい。

## まとめ（3行）

- ブロック構造 = Header + Body（tx 列）+ Receipts、state root / receipts root が MPT ルートでブロックヘッダに、validator 独立検証。
- Reorg = 信頼の浅いブロックの差し替え、PoS で 2-3 ブロック以内、finalized 不可、Reth ExEx 通知 3 バリアント（Committed / ChainReorged / Reverted）。
- 3 段 finality（latest / safe / finalized）、indexer は reorg 対応必須、次モジュールで Solidity → Rust 移行マップに踏み込む。
`,
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
                  title: 'レッスン4 — Solidity エンジニアのための Rust — 移行マップ',
                  slug: 'rust-for-solidity-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 35,
                  content: `# レッスン4 — Solidity エンジニアのための Rust — 移行マップ

## 問い

Solidity を書いてきた人が Rust source（Reth / Revm / Alloy）を読むときの **移行マップ**。Solidity の概念と Rust の対応 + 違い + 注意点。**Solidity 経験が活きる場所と頭の切り替えが必要な場所**を整理。

## 原理（最小モデル）

- **型システム.** Solidity の \`uint256\` → Rust の \`U256\`（256 ビット）/ \`address\` → \`Address\`（20 バイト）/ \`bytes32\` → \`B256\`、Alloy primitive で 1:1 対応。
- **所有権 = メモリ管理.** Solidity は EVM が自動管理、Rust はコンパイル時所有権 + 借用 = GC なし + 二重解放防止 + データ競合防止。
- **Solidity の状態変数 = Rust の struct field.** \`contract C { uint x; }\` → \`struct C { x: U256 }\`、メソッドは \`impl C { fn ... }\`。
- **Solidity の \`function\` = Rust の \`fn\`.** \`function add(uint a, uint b) public returns (uint)\` → \`fn add(&self, a: U256, b: U256) -> U256\`、Solidity の \`view\` / \`pure\` 修飾は Rust の \`&self\` / 引数のみで暗黙。
- **Solidity の \`msg.sender\` = Rust では明示引数.** Solidity は EVM が暗黙提供、Rust では関数引数で受け取る or context 構造体経由、暗黙でない。
- **Solidity の event = Rust では \`Event\` 構造体 + emit.** Alloy では \`sol!\` マクロで Solidity ABI を Rust 型に変換、type-safe な emit。
- **Solidity の \`require\` / \`revert\` = Rust の \`Result<T, E>\`.** \`require(cond, "msg")\` → \`if !cond { return Err(...) }\`、\`?\` 演算子で伝播。
- **Solidity の mapping = Rust の \`HashMap\`.** \`mapping(address => uint)\` → \`HashMap<Address, U256>\`、Rust ではキー / 値の型を明示。
- **Solidity の inheritance = Rust の trait composition.** \`contract A is B, C\` → \`impl Trait1 + Trait2 for Struct\`、Rust は trait による mixin。
- **Rust の async = Solidity にない.** Solidity は同期的、Rust は async/await + Future、Alloy / Reth の RPC は全部 async。

## 具体例 + ステップで組み立てる

# Solidity エンジニアのための Rust — 移行マップ


Solidity でコントラクトを書いてきたなら、EVM 挙動で気にすべき点はすでに身についている。足りないのは、**そのコントラクトを走らせるエンジン側を読むための Rust の見方** だけである。本レッスンは、続く Rust 章に入る前の対訳表としてその差分を埋める。

Rust をゼロから教える回ではない。ここで示すのは、信頼している Solidity の概念が Rust でどう写るか（あるいは写らないか）である。1 時間後に \`bluealloy/revm\` を開いたとき、画面いっぱいの Rust を「Solidity で知っていることの別表現」として読める状態を狙う。

> 📌 **対象。** Solidity コントラクトを書いた経験がある読者向けである。未経験ならこのレッスンは飛ばす。続く Rust 章はジェネリクスから直接始まる。

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

**型はほぼ同型** である。\`U256::from(100)\`、\`Address::from_slice(...)\`、\`B256::random()\` は Solidity の \`uint256(100)\` や \`address(0x...)\` と同じ感覚で扱える。

> 🔍 **リポジトリで確認。** \`alloy/crates/primitives/src/\` に \`Address\`、\`U256\`、\`B256\` がある。1 ファイル開いて確認する。**筋肉記憶になっている Solidity 型は、この 1 つの crate に集約されている。**

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

- **\`msg.sender\` と \`msg.value\` が消える。** どちらも明示パラメータになる。Rust は呼び出し側への受け渡しを強制する（Revm も同様）。
- **\`payable\` がない。** Solidity/ABI 側の約束であり、Rust の関数概念には直接存在しない。
- **\`&mut self\` が新しい。** \`deposit\` が状態を書き換える関数であることを型で宣言する。

\`&mut self\` は、**\`deposit\` 実行中に他の誰もこの struct を読み書きしていない** ことを型で保証する。Solidity では EVM 上は同時実行しないが、言語としてその保証を表現しにくい。Rust はこの保証を型システムで強制し、同時書き換えバグを設計段階で排除する。

## 3. 所有権: Solidity に対応物がない部分

ここからは Solidity の直感が効きにくい。Solidity に *所有権* の概念はなく、値は storage（永続）か memory（呼び出し単位）に置かれる。「所有者は誰か」を意識しないのは、答えが常にコントラクトだからである。

Rust はすべての値で、この質問への回答を要求する。

| Solidity 側 | Rust 側 | なぜ重要か |
| :--- | :--- | :--- |
| 暗黙の storage | \`&self\` / \`&mut self\` / 所有する \`self\` | 「読むだけか・書き換えるか・消費するか」が関数のシグネチャに現れる |
| \`memory\` キーワード | デフォルト挙動 — Rust の値は box しない限りスタック上 | キーワード不要 |
| 暗黙の値コピー | 所有型は明示的な \`.clone()\`、プリミティブは安価な \`Copy\` | 「この代入は高くつくか?」が呼び出し地点で見える |
| 参照安全性なし | ライフタイム (\`'a\`) が参照の有効期間を記述 | 参照が借用元より長生きしうる場合、コンパイラがそれを拒否する |

捉え方の反転は、**Rust ではどの値も、ある時点で所有者がただ 1 つだけ** という点にある。所有者だけが借用を配れ、\`&mut\` の借用は 1 つだけ、または \`&\` の借用を任意数という制約になる。これが GC なしで並行コードを安全に保つ仕組みであり、最初の 2〜3 週間で文法を重く感じる理由でもある。

良いニュースとして、**これから読む EVM ソースの大半は所有権の「退屈な」領域に留まります** — struct が状態を持ち、関数が \`&mut\` か \`&\` を取る、それで 9 割。関数の境界を抜けるライフタイムや \`Pin\`、自己参照 struct のような難物は非同期 / unsafe の隅でしか出てこず、opcode 本体にはほぼ現れません。

ちなみに Solidity には、「他の誰かが \`balances\` を書き換えていないか」を問う手段がない。並行性がないためである。Rust は \`&mut\` を書くたびにこの問いを課す。Reth / revm で答えが「誰も書き換えない」から「誰かが書き換えうる」に変わるのは、トレース、複数 ExEx サブスクライバ、複数スレッド fuzz などを並行実行する場面である。エンジン側ではこの判断が必須で、所有権がその表現手段になる。

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

押さえるべき違いは 2 つである。

- **\`Result<T, E>\` は enum** である。関数は \`Ok\` か \`Err\` を返し、呼び出し側は処理か \`?\` 伝播を選ぶ。コンパイラはエラー無視を許さない。
- **エラーは型付き** である。\`VaultError\` の各バリアントが失敗理由を明示し、Revm の \`InstructionResult\` や Reth の \`StageError\` と同じ設計思想で読める。

\`require(...)\` は失敗パターンの *1 つ*（文字列付き revert）にすぎない。\`Result\` は失敗の一般形である。これが腹落ちすれば、「ここで X が失敗したらどうなるか」は戻り型を読むだけで答えられる。

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

Solidity エンジニアにとって実用上重要なのは 2 点である。

- **デフォルト実装を書ける。** 上の \`assert_owner\` のように trait 側が実装を提供できる。実装側は上書きしない限り自動で受け取る。alloy の \`Provider\` が \`root()\` 1 つから多数の RPC デフォルト実装を導出するのも同じ仕組みである。
- **ダイヤモンド継承問題がない** こと。struct は複数の trait を実装でき、継承の順序という概念がありません。Solidity で \`Ownable + ReentrancyGuard + Pausable\` を「継承」すると微妙な落とし穴に出会いますが、Rust なら \`impl Trait1\` + \`impl Trait2\` + \`impl Trait3\` と並べるだけ。順序にも依存しません。

Reth のソースは **トレイト密度が高い**。\`Stage\`、\`Provider\`、\`Database\`、\`Network\`、\`Signer\` など、各トレイトは実装契約を宣言する。Solidity の \`interface IERC20\` と同じ感覚で読めるようになると、コードベース全体が見通せる。

## 6. 怖い 2 つの語: ライフタイムと async

ここからは Solidity に直接対応しない領域である。ここでは事前オリエンテーションとして 2 段落だけ示し、詳細は後続レッスンに譲る。

**ライフタイム (\`'a\`)** は参照の有効期間を示す。Solidity には関数境界を越える参照概念がないが、Rust では参照が生き残るため、コンパイラが「借用元より長生きしない」ことを検証する。\`fn foo<'a>(x: &'a Bar)\` は参照 \`x\` の生存期間を示す。大半は推論されるが、明示が必要な残りの場面がバグ混入点になる。

**\`async fn\` と \`.await\`** は Rust の non-blocking I/O 表現である。Solidity が 1 tx 内で同期実行されるのに対し、Rust ノードは RPC・P2P・ディスクを同時進行する。\`async\` は「待っている間に他の仕事を進める」記法であり、表面上は \`async fn\` と \`.await\` の 2 つを押さえればよい。

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

続く 4 レッスン（ジェネリクス・共有所有・unsafe・マクロ）は、ソース読解 tier の背骨となる Rust を扱う。本レッスンを先に通すと、各回の着地が安定する。

## ドリル

1. **Solidity コントラクトを 1 つ翻訳してみる。** 自分で書いた小さなコントラクト（あるいは [\`solady\`](https://github.com/Vectorized/solady) の ERC20）を選んで、紙の上で同じ状態と 1〜2 個のメソッドを持つ Rust の struct + impl を書いてみてください。動かさなくていい — 形だけで構いません。30 分。
2. **alloy の Rust struct を 1 つ読む。** \`alloy/crates/primitives/src/address.rs\` を開き、\`Address\` 型を探す。何が \`struct\`、何が \`impl\` ブロック、何が trait の impl かを観察する。**Solidity に対応物がない部分**（ライフタイム、derive、属性マクロ）を見つける。30 分。
3. **エラー処理を比較する。** \`require\` を 2 つ持つ Solidity 関数を選び、2 バリアントのカスタムエラー enum と \`Result\` を使う Rust へ書き換える。**型が** 失敗モードをどう文書化するかを観察する。45 分。

このレッスンを終えると、続く Rust 章（ジェネリクス・Arc・unsafe・マクロ）を、既存モデルに追加される語彙として読める。**ゼロから Rust を学ぶのではなく、エンジン層コードへ Solidity の直感を翻訳する Rust 慣用句を学んでいる** と捉える。

## まとめ（3行）

- 型システム 1:1（U256 / Address / B256）、状態変数 → struct field、関数 → fn、msg.sender → 明示引数、require → Result<T, E>。
- Mapping → HashMap、inheritance → trait composition、event → sol! マクロ + emit、Rust は all async（Solidity にない）。
- 所有権 + 借用は新概念（最初の壁）だが、Solidity 経験で型システム / 制御フロー / ガス意識は持ち越せる、次は generics と trait bounds。
`,
                },
                {
                  title: 'レッスン5 — Generics・trait bounds・?Sized・dyn vs impl',
                  slug: 'rust-generics-traits-bounds-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 30,
                  content: `# レッスン5 — Generics・trait bounds・?Sized・dyn vs impl

## 問い

Reth / Revm / Alloy のソースで頻出する **ジェネリクス + trait bounds**。\`<T: Bound>\` / \`?Sized\` / \`dyn Trait\` / \`impl Trait\` — それぞれ何を意味し、なぜ使い分けるか。**コードを読むのに必須の 4 概念**。

## 原理（最小モデル）

- **ジェネリクス \`<T>\`.** 型パラメータ、コンパイル時に具象化（モノモーフ化）= 実行時オーバーヘッドなし + 各具象型用バイナリ生成。
- **Trait bounds \`T: Trait\`.** 型パラメータに制約、\`fn print<T: Display>(x: T)\` で「Display 実装してれば何でも」、複数 bounds は \`T: A + B + \\'static\`。
- **\`?Sized\`.** デフォルトの \`Sized\` 制約を外す、\`dyn Trait\`（実行時サイズ）を受け入れる、\`<T: ?Sized>\` で trait object を渡せる。
- **\`dyn Trait\`.** 実行時ディスパッチ、vtable 経由、\`Box<dyn Trait>\` / \`&dyn Trait\`、複数具象型を統一して扱う、サイズ未知。
- **\`impl Trait\`.** 引数 = 「Trait 実装の何か」（ジェネリクスの短縮）、戻り値 = 「具体的な型を隠蔽」、戻り値の場合は単一具象型に限定。
- **ジェネリクス vs \`dyn\`.** ジェネリクス = 静的ディスパッチ + モノモーフ化（速い、コード膨張）、\`dyn\` = 動的ディスパッチ + vtable（柔軟、若干遅い）。
- **\`Send + Sync\`.** スレッド間移動 / 共有可能性のマーカー trait、Tokio タスクには \`T: Send + \\'static\` 必要、Rust 並行性の土台。
- **\`\\'static\` ライフタイム.** プログラム全体生存 or 借用なし、グローバル定数 / \`String::from("...")\` / \`Vec<T>\` 等、\`Send + \\'static\` でタスク移動可能。

## 具体例 + ステップで組み立てる

# Generics・trait bounds・?Sized・dyn vs impl


これは \`pub fn add<IT: ITy, H: ?Sized>(...)\` を怯まず読めるようにするためのレッスンである。Reth / Revm のソースは **generics が密集** し、関数シグネチャに型パラメータ 3 つは珍しくない。本レッスンではその仕組みを 1 つずつ解きほぐす。

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

中級レッスン 1 でいきなり 1 行目に型パラメータ 3 つと \`?Sized\` をぶつけられた時、それを 5 つの威圧的なトークンではなく、1 つの繋がった文として読めるはず。

## まとめ（3行）

- 4 概念 = ジェネリクス \`<T>\`（コンパイル時具象化）+ trait bounds \`T: Bound\`（制約）+ \`?Sized\`（trait object 許可）+ \`dyn\` / \`impl Trait\`（実行時 vs 静的）。
- \`Send + Sync + \\'static\` でスレッド間移動 / 共有 / プログラム全体生存、Tokio タスクの土台。
- 次は Arc / Mutex / RwLock で共有所有権、並行性プリミティブを理解。
`,
                },
                {
                  title: 'レッスン6 — 所有権の共有：Arc・Mutex・RwLock',
                  slug: 'rust-shared-ownership-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン6 — 所有権の共有：Arc・Mutex・RwLock

## 問い

Rust の所有権は「1 つの所有者」だが、**複数スレッドで共有したい**ときは？ \`Arc\`（参照カウント）+ \`Mutex\` / \`RwLock\`（排他制御）の組み合わせ。**並行コードで頻出する 3 プリミティブ**を理解。

## 原理（最小モデル）

- **\`Rc<T>\`.** Reference Counted、同一スレッド内で複数所有、\`Rc::clone\` で参照カウント++、最後のドロップで解放、\`!Send\` / \`!Sync\`。
- **\`Arc<T>\`.** Atomic Reference Counted、\`Rc\` のスレッド間版、\`Send + Sync\`、atomic 操作で参照カウント、Tokio タスクで頻出。
- **\`Mutex<T>\`.** 排他制御、\`lock()\` で MutexGuard 取得 + ドロップで解放、デッドロック注意、同期版（\`std::sync::Mutex\`）と非同期版（\`tokio::sync::Mutex\`）。
- **\`RwLock<T>\`.** 読み書き分離、\`read()\` 複数可 / \`write()\` 排他、読みが多い場合に有利、同様に同期版と非同期版。
- **\`Arc<Mutex<T>>\`.** 最頻出パターン、複数スレッドで T を共有 + 排他制御、\`let shared = Arc::new(Mutex::new(value));\` + \`shared.clone()\` でスレッドへ。
- **Atomic primitives.** \`AtomicUsize\` / \`AtomicBool\` 等、ロックなしで read-modify-write、\`Ordering\` で memory ordering 制御、最も軽量。
- **\`Cell<T>\` / \`RefCell<T>\`.** 内部可変性、\`&self\` から内側を変更、\`Cell\` は Copy 型のみ、\`RefCell\` は実行時 borrow check、シングルスレッド限定。
- **Tokio の \`tokio::sync::*\`.** async 版 Mutex / RwLock / oneshot / mpsc、\`.await\` で待機、async タスクで使う、\`std::sync::Mutex\` を \`.await\` 内で持つとデッドロック。

## 具体例 + ステップで組み立てる

# 所有権の共有: Arc・Mutex・RwLock


Rust の「ただ一人のオーナー」ルールは厳しい — そして 90% の場合は助かる。残り 10% は **複数の場所から同じ値を保持** する必要があり、スレッド跨ぎだったり、変更ありだったりする。それがこのレッスン。

Reth と ExEx のコードは **\`Arc\` と \`Mutex\` で埋め尽くされる**。本レッスン前だとラッパーは雑音に見えやすいが、通過後は、非同期タスク間で状態共有を支える必須部品として読める。

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

Reth ソースで \`Arc<RwLock<Foo>>\` の隣に \`Arc<Mutex<Bar>>\` を見たら、それは著者が用途ごとに選択した結果である。いまならその判断を読み解ける。

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

中級レッスン 6 (ExEx) で \`Arc<...>\` フィールドが 3 つある struct を見ても、「なぜラッパーだらけか」を説明できるはずだ。各ラッパーは、そのコンポーネントを runtime タスク間で共有するための必須部品である。

## まとめ（3行）

- \`Arc<T>\` でスレッド間共有、\`Mutex<T>\` / \`RwLock<T>\` で排他制御、\`Arc<Mutex<T>>\` が最頻出パターン、Atomic はロックなしの軽量版。
- 内部可変性 = \`Cell\` / \`RefCell\`（シングルスレッド）/ \`Mutex\` / \`RwLock\`（マルチスレッド）、\`&self\` から内側変更したいときに。
- Tokio async 版（\`tokio::sync::*\`）を async タスクで使う、\`std::sync::Mutex\` を \`.await\` 内で持つとデッドロック、次は unsafe Rust。
`,
                },
                {
                  title: 'レッスン7 — unsafe Rust',
                  slug: 'rust-unsafe-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 20,
                  content: `# レッスン7 — unsafe Rust

## 問い

Rust の安全保証を一時的に外す **\`unsafe\` ブロック**。本来は使わない、でも Reth / Revm のホットパスでは性能のために使われる。**いつ使う / なぜ安全 / どう読むか**。

## 原理（最小モデル）

- **\`unsafe\` で可能になる 5 操作.** ① raw pointer dereference、② mutable static 変更、③ unsafe 関数呼び出し、④ unsafe trait 実装、⑤ union field アクセス。
- **Rust の安全保証.** メモリ安全 + データ競合なし + 未定義動作なし、所有権 / 借用 / ライフタイムでコンパイル時保証、\`unsafe\` でこれを一時的に外す。
- **契約パターン.** \`unsafe\` ブロック内で「自分でチェックした不変条件」を符号化、コンパイラに「信用して」と伝える、契約破ると即 UB。
- **\`unwrap_unchecked()\`.** \`Option::unwrap\` の unsafe 版、None で UB だが panic check スキップ、ホットパスで「事前に Some を保証」した後の高速化。
- **Revm の \`popn_top!\` マクロ.** \`if stack.len() < N { return Err }\` でガード → \`unwrap_unchecked\` で実行時 Some チェックスキップ、ガードが不変条件を保証。
- **\`unsafe fn\` の宣伝.** 関数自体が unsafe = 呼び出し側が契約を満たす責任、\`pub unsafe fn\` でドキュメントに契約を書く。
- **Soundness.** unsafe コードは soundness（任意の入力で UB を起こさない性質）を満たすべき、契約を満たさない入力で UB なら soundness 違反。
- **読むときの注意.** \`unsafe\` を見たら「なぜここで必要か」+ 「どの不変条件を前提にしているか」を理解、コメント / docs を必ず読む。

## 具体例 + ステップで組み立てる

# unsafe Rust

標準 Rust 教科書が薄く、Revm インタープリタが深く踏み込む 2 領域の 1 つである。本レッスンでは \`unsafe { ... }\` を含む Revm ホットパスを読む語彙を身につける。（もう 1 つの領域 \`macro_rules!\` は次レッスンで扱う。）

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

次のレッスンは \`macro_rules!\` を扱う — Revm のインタープリタソースを読むのに必要な、もう一方の半分。

## まとめ（3行）

- \`unsafe\` = 5 操作可能 + Rust の安全保証を一時的に外す、契約パターンで「自分でチェックした不変条件」をコンパイラに伝える。
- Revm の \`popn_top!\` 等のホットパスで \`unwrap_unchecked\` 使用、ガードが Some を保証 → 実行時チェックスキップで高速化。
- 読むときは「なぜ必要 / どの不変条件 / soundness」を理解、\`unsafe\` は最後の手段、次は \`macro_rules!\` 基礎。
`,
                },
                {
                  title: 'レッスン8 — `macro_rules!` 基礎',
                  slug: 'rust-macros-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 10,
                  xpReward: 20,
                  content: `# レッスン8 — \`macro_rules!\` 基礎

## 問い

Rust の **マクロ** — \`println!\` / \`vec!\` / \`format!\` 等の \`!\` 付き呼び出し。コンパイル時にコード展開、関数より柔軟。Reth / Revm のソースで \`popn_top!\` / \`gas!\` 等のマクロが頻出する。**\`macro_rules!\` の読み方**。

## 原理（最小モデル）

- **マクロ = コンパイル時コード展開.** 関数の呼び出し時に AST に展開、関数より柔軟（可変アリティ / 任意の構文）、トレードオフはデバッグの難しさ。
- **\`macro_rules!\` の構文.** \`macro_rules! name { ($x:expr) => { ... } }\`、パターン → 展開のルール、\`expr\` / \`ident\` / \`ty\` / \`pat\` / \`stmt\` 等の fragment specifier。
- **可変アリティ.** \`$($x:expr),*\` でカンマ区切りの式リスト、\`$( ... )*\` で繰り返し展開、\`println!("{} {}", a, b)\` のような可変引数を実現。
- **ヒジエン（hygiene）.** マクロ内の変数名がスコープ汚染しない、外側の同名変数と衝突しない、安全な抽象化。
- **Revm の \`popn_top!\`.** スタック pop + アンダーフロー事前チェック + \`unwrap_unchecked\` を 1 マクロに集約、\`add\` / \`mul\` / \`sub\` 等 30+ opcode で再利用。
- **\`gas!\` マクロ.** ガス課金 + cold_path ヒント + 早期 return を集約、5 行版、ホットパスのボイラープレート削減。
- **手続きマクロ（proc-macro）.** \`#[derive(...)]\` / \`#[tokio::main]\` / \`sol!\` 等、\`macro_rules!\` より強力、Rust 関数として実装、Expert で深掘り。
- **読むときの注意.** マクロ展開を \`cargo expand\` で見る、展開後コードを読めば理解できる、\`macro_rules!\` 自体の構文は慣れ。

## 具体例 + ステップで組み立てる

# macro_rules! 基礎

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

魔法を読んでいるわけではない。**すでに知っているパターンを** 読んでいるだけである。

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

この 3 文がしっくり来るなら、技術的前提は身についている。

## あと 1 レッスン — 中級コースの読み方

中級ティアは **3 つの独立コース**（Revm・Reth・Alloy）で、いずれも同じ編集スタイル（Predict、クイズゲート、積み上げ→ウォークスルー→クイズ→ドリル）を共有する。次は **「中級コースの読み方」** を読む。3 コース共通で 1 度読めば済むメタオリエンテーションである。

それから、コースを 1 つ選んで始める。

## まとめ（3行）

- \`macro_rules!\` = コンパイル時コード展開、可変アリティ + ヒジエン + fragment specifier（expr / ident / ty 等）、関数より柔軟。
- Revm の \`popn_top!\` / \`gas!\` 等は opcode 実装のボイラープレート削減、30+ opcode で再利用。
- \`cargo expand\` で展開後コード確認、手続きマクロ（\`#[derive]\` / \`sol!\` 等）は Expert で深掘り、次は最後のレッスン（ソース読解コースの読み方）。
`,
                },
                {
                  title: 'レッスン9 — ソース読解コースの読み方',
                  slug: 'advanced-tier-orientation-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 6,
                  xpReward: 15,
                  content: `# レッスン9 — ソース読解コースの読み方

## 問い

Bridge to Advanced 完走 = 中級 3 コース（Inside Revm / Inside Reth / Inside Alloy）への準備完了。**中級コースをどう読むか** — 編集スタイル / クイズゲート / 積み上げ→ウォークスルー→クイズ→ドリル のチェーン構造 + ペース配分。

## 原理（最小モデル）

- **3 中級コース.** Inside Revm（EVM 実行エンジン）/ Inside Reth（Staged Sync + ExEx + SDK）/ Inside Alloy（Provider + Network + Signer）= 順序自由、依存的には Alloy → Revm → Reth 推奨。
- **チェーン構造.** 各トピック = buildup（素朴版 → 本物へ積み上げ）→ walkthrough（実ソース 1 行ずつ）→ クイズ（進行ゲート）→ ドリル（手を動かす証明）。
- **Predict プロンプト + クイズゲート.** 「ここで止まって予測せよ」が至る所、クイズで 2 問以上落としたら前レッスンに戻る = 「読んだ気」を防ぐ強制。
- **ペース配分.** レッスンあたり 30-40 分、1 日 1-2 レッスンが現実的、ドリルは別 30-60 分、週末 capstone は半日。
- **セットアップ必須.** \`git clone bluealloy/revm\` / \`git clone paradigmxyz/reth\` / \`cargo-expand\` インストール / セカンドモニタ or 分割端末、これなしでドリルできない。
- **コードを読むメンタルモデル.** トレイトヘッダーから読む → 主要 struct → 関数本体、\`grep\` / \`rg\` で関連箇所、\`cargo doc --open\` で API ドキュメント。
- **詰まったときの対処.** 不明箇所はマークして先進む、後で戻る、Discord / GitHub で質問、答えを見る前に 30 分自力で。
- **完走後.** Advanced / Expert で本番 production 視点、Foundry で Solidity 側、openhl DIY Perp で 1 つの本物を作る、選択肢が広がる。

## 具体例 + ステップで組み立てる

# ソース読解コースの読み方


あなたは **Intermediate ティア** の入口にいる。**3 つの独立コース**（**Inside Revm**・**Inside Reth**・**Inside Alloy**）はいずれも同じスキル、つまり **本番 Rust ソースを 1 行ずつ読む力** を扱う。この短いレッスンは構成と学習姿勢をそろえるための共通ガイドである。

(各コースにも、固有の前提とセットアップを扱う短いウェルカムがある。*このレッスン* は 1 度読めば済む **汎用的な** オリエンテーション。)

## ティアシフト

Beginner ティア (Beginner / Fundamentals / 中級への橋渡し) は、スタックの **形** を教えました — Alloy 型はどんなものか、Foundry の使い方、EVM が高レベルで何をしているか。

Intermediate ティアが要求するのは別の能力である。**Reth・Revm・Alloy・Foundry の本番ソースを 1 行ずつ読む。** レッスンはスタック利用経験を前提に、*読める状態* へ引き上げる。

前レッスンで技術的前提（\`add\` Opcode シグネチャ読解）を確認した。残るのは、レッスン自体の書き方と、ここで要求する学習リズムである。

## レッスンの書き方 — そしてその理由

ソース読解レッスンは、これまでのティアにはない **能動学習プロンプト** を使います：

- 🛑 **Predict (予測)** — *止まる。解説を読む前に、これに頭の中で答えてください。* ポイントは質問に取り組むこと。間違っていてもいい。間違った予測こそが学習の起点。
- 🔍 **Find in repo (リポジトリで確認)** — 実際のソースファイルを開いて、レッスンの主張を検証する。レッスンはガイダンス、ソースが真実。
- **理解度チェック (Anti-fluency)** — *自分の言葉で、なぜ効くか。* 答えられないなら戻る。**スキップしない。**
- **末尾の想起テスト** — 多くのレッスンは「自分の言葉で答えられるまで終わらない」という設計で終わる。文字通り受け取る。
- **クイズゲート** — 主要トピックは 4 問クイズで終わり、進行をゲートする。**うなずきでは通せない** 設計であり、2 問落としたら積み上げに戻る。

編集スタイルは従来チュートリアルより難しい。意図的である。**滑らかな散文は「わかった気になる」罠を生みやすい。** Predict / Recall / Quiz は実エンゲージメントを強制するための設計である。

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

これは典型的チュートリアルより遅い。**ただし定着する。** 意図的なトレードオフである。

## ペース

各アトミックレッスンは表示上 **8〜12 分、プロンプトに本気で取り組むと 15〜25 分**。1 つのトピックチェーン全体（積み上げ → ウォークスルー → クイズ → ドリル、3〜4 本）は **おおよそ 45〜80 分** — 1 晩がかりの仕事。**Advanced ティア（Intermediate の先の L1 Architect 系）** のチェーンはさらに長い — 1 セッションに 1.5〜3 時間が普通。実際の L1 アーキテクトの仕事が要求する長さだから。

**正しい単位はセッションあたり 1 チェーン** である。チェーン（例: Inside Revm の \`add\` 4 本）を始めたら、その日で終える計画を立てる。積み上げ・ウォークスルー・クイズが相互強化し、ドリルで「読み」が「記憶」に変わる。跨日で分割するとモデルが壊れやすい。

時間がないなら: 2 本を流すよりも *1 本を丁寧に*。このティアではエンゲージメントが網羅性より重要。

## さあ、コースを選ぶ

3 つのソース読解コースは独立していて任意の順序で進められます — ただし **Inside Revm を最初に推奨**、その型（\`Address\`、\`U256\`、\`Database\` トレイト）が Reth と Alloy の前提になるから:

- **Inside Revm** — EVM エンジンの内部
- **Inside Reth** — Reth の内部: Staged Sync・ExEx・Reth SDK
- **Inside Alloy** — Alloy の内部: Provider・Network・Signer

各コースには、固有の前提とセットアップを扱う短いウェルカムがある。それを読んでレッスン 1 を始める。

## Intermediate の先 — Advanced ティア (L1 Architect)

Intermediate のソース読解を完走すると、次は **Advanced ティア**（5 コース、難易度 **ADVANCED**、track \`reth-l1-architect\`）である。Intermediate が本番ソースを **読む** 力を育てるのに対し、Advanced は自分で レッスン1を **設計する** 実装力を扱う。

- **Consensus Engineering** — PoS / BFT / Tendermint の内部、レイテンシ・ライブネス・finality の設計トレードオフ
- **Cross-Chain Bridges** — CCIP・OP Standard Bridge・light client を本番ソースで読み、自分で書く
- **Sequencer & Rollup アーキテクチャ** — 中央集権 sequencer から共有 sequencer まで、MEV 防衛と forced inclusion
- **P2P ネットワーキング内部** — devp2p・libp2p・gossip サブプロトコル・ピアスコアリングの実装読解
- **Validator 運用** — 鍵管理、slashing 条件、協調アップグレード

各チェーンは Intermediate のソース読解チェーンの 1.5〜3 倍の長さ。**今は気にしないこと** — まずソース読解のチェーンを 1 つ完走するのが先。Advanced (L1 Architect) は遠い目的地としてだけ意識しておけば十分。

準備完了。

## まとめ（3行）

- 3 中級コース（Revm / Reth / Alloy）= buildup → walkthrough → クイズ → ドリル の 4 連、Predict プロンプト + クイズゲートで「読んだ気」防止。
- セットアップ必須（revm / reth clone + cargo-expand + 2 モニタ）、ペース配分は 1 日 1-2 レッスン + ドリル別、週末 capstone は半日。
- Bridge to Advanced 完走、3 中級コースへの準備完了、選択肢広がる（Advanced / Expert / Foundry / openhl DIY Perp）、Rust + Ethereum + systems キャリアの出発点。
`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
