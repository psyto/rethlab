# Mastering Foundry — L4 draft (JA)

> openhl SHA pin はなし（`cast` は contract ではなく Foundry の CLI ツール）。rethlab の openhl-fundamentals "alloy-provider" レッスンを cross-reference する — `cast` は alloy bindings を terminal コマンドとして露出させたものだ。Public RPC endpoint `https://ethereum.reth.rs/rpc`（Reth プロジェクトの mainnet ノード）を全体で使用する。

## L4 — `foundry-cast-cli-ja`

**Title**: レッスン 4 — `cast` — EVM の `curl` + `jq`

**Duration**: 30 分 · **XP**: 60

---

````markdown
# レッスン 4 — `cast` — EVM の `curl` + `jq`

## ゴール

このレッスンで掴む概念:

- **`cast` は `alloy::Provider` を terminal コマンドとして露出させたものだ。** すべての `cast` subcommand が `alloy_provider::Provider` の method に map する — rethlab の `alloy-provider` レッスンで Rust コードから呼んだのと同じ trait だ。`cast call` ↔ `provider.call(...)`、`cast block` ↔ `provider.get_block(...)`、`cast send` ↔ `provider.send_transaction(...)`。CLI は同じ Rust code path への thin な shell wrapper にすぎない。Rust で `provider.call().await?` をすでに書いたなら、新しいメンタルモデル（Mental model）は要らない。タイピングの筋肉記憶（Muscle memory）を更新するだけだ。**`cast` は alloy bindings + shell prompt。背後の RPC リクエストは同一だ。**
- **`cast` は *何を尋ねるか* と *どのチェーンに尋ねるか* を分離する。** どのコマンドも `--rpc-url <URL>` フラグを option として取り、ノードを指す。フラグなしなら `cast` は環境変数 `$ETH_RPC_URL` を使う。同じ `cast call` を mainnet、sepolia、ローカル anvil instance のいずれに対しても、フラグ 1 つ変えるだけで実行できる。コマンド自体は同一だ。**ターゲットチェーンは束縛（Binding）ではなく引数（Parameter）。** これが L1 エンジニアにとっての payoff だ。同じクエリが prod、staging、forked simulation を読む。置換 1 つで。
- **`cast call`（読み取り専用）と `cast send`（state-changing）の 2 つが 90% の時間使う動詞だ。** `cast call` は view / pure 関数を走らせるか、broadcast せずに transaction を simulate する。関数の return 値を raw bytes として（あるいは function signature を渡せば decoded で）返す。`cast send` は実際に transaction を broadcast する。`--private-key` を要求し、transaction hash を表示する。残りのコマンド (`cast block`、`cast tx`、`cast logs`、`cast abi-encode`、`cast 4byte`) は内省（Introspection）とデータ操作のツールだ。便利だが、load-bearing なペアは `call` と `send`。**Production debug の大半は forked anvil に対する `cast call`。Production deploy の大半は testnet に続いて mainnet への `cast send`。**
- **`cast abi-encode` / `cast abi-decode` がデータレイヤーのループを閉じる。** Calldata を手で構築する必要があるとき (`cast send --create` 用、multisig 提出用、Solidity script への埋め込み用)、`cast abi-encode "transfer(address,uint256)" 0x... 1000` がオンチェーンで送られる exact bytes を生成する。`cast abi-decode` は逆。calldata と function signature を与えると、type 付き引数を取り出す。これは `forge` の test runner が内部で使うのと *同じ* ABI 機構（ABI machinery）が CLI で露出されたものだ。**Calldata を手で debug したことがあるなら、`cast abi-decode` は何年も前に shell alias に入れておくべきだったツールだ。**

確認:

```bash
cast --version
cast call --rpc-url https://ethereum.reth.rs/rpc \
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 "totalSupply()(uint256)"
```

…で Reth プロジェクトの public RPC 経由で real mainnet に対して走り、USDC の現在の total supply を返す（~12 桁の数字、6 桁 decimal 精度）。本レッスン完走後は次の 3 つを手にする。どの `cast` subcommand がどの alloy method に map するか、`cast call` と `cast send` のどちらに手を伸ばすべきか、calldata を必要に応じて手で組み立てる方法。

具体的な変更:

- **ソースファイル編集なし。** L4 はすべて CLI invocation。Mainnet に対して ~8 種類の `cast` コマンドを走らせ、（option として）ローカル anvil に対しても走らせる。
- **`.env`**（option）— `ETH_RPC_URL=https://ethereum.reth.rs/rpc` を設定して、毎コマンドに `--rpc-url` を渡すのを避けたいかもしれない。L5 で anvil を扱う際、terminal session ごとに `ETH_RPC_URL` を mainnet と forked anvil の間で切り替えるデモをする。

合計で Solidity ゼロ行。L4 は shell time。Pedagogical move は alloy-method ↔ cast-subcommand マッピングを内面化すること。次に Rust の `Provider` に手を伸ばすとき、まず `cast` に手を伸ばすようになる。

## おさらい

L3 の後はこうなっている。
- `forge invariant` が Handler に対してランダム call 系列を走らせ、毎 call 後に `invariant_*` を check する。
- Handler が target を wrap し、入力を bound し、ghost variable (shadow specification) を track する。
- Sequence shrinking が 30+ call の失敗を 2-call minimal counterexample まで reduce する。

L3 は `test/` ファイル内に住んだ。L4 は test ディレクトリを完全に離れる。`cast` は、deploy 済み contract、transaction hash、decode したい calldata があり、それを見るためだけに Solidity script を書きたくないときに手を伸ばすツールだ。**L1 エンジニアの debug ループは `forge test` だけではなく、`forge test` の後の `cast call` だ。**

## 計画

invocation のカテゴリが 5 つ。

1. **`cast call`** — terminal から mainnet state を読む。USDC の `totalSupply()` と既知 address の `balanceOf(address)` をクエリする。
2. **`cast block` / `cast tx`** — チェーン内省。最近の mainnet block を lookup する。Hash で特定 transaction を検査する。
3. **`cast abi-encode` / `cast abi-decode`** — calldata 操作。ERC-20 transfer call の bytes を構築する。Bytes を type 付き引数へ decode して戻す。
4. **`cast 4byte` / `cast 4byte-decode`** — function-selector lookup。Calldata の先頭 4 bytes を与えると、public な 4byte directory 経由で人間可読 function 名を見つける。
5. **ローカル anvil に対する `cast send`（preview）** — state-changing transaction。重要なものは deploy しない。この演習は `cast send` がチェーンとどう interact するかをデモする (L5 が anvil 自体を深掘りする)。

> 🛑 **予測。** 続きを読む前に: rethlab の `alloy-provider` レッスンで、`eth_call` semantics で構築した `tx` を使って (paraphrased) `let supply = provider.call(&tx).await?` と書いた。同じ結果を mainnet に対して生成する exact な `cast` invocation は何か?

(答え: **`cast call --rpc-url <URL> <contract-address> "<function-signature>" [args...]`**。各ピースが直接 map する。`--rpc-url` フラグは alloy の `RootProvider` の underlying transport URL。Contract address は transaction の `to` フィールド。Function signature は cast が内部で 4-byte selector に hash する人間可読 ABI 短縮形 (alloy が同じ `Function::parse` 機構を使う)。任意の args は positional。Return は raw hex (function signature の後に `"(...returntypes)"` で return type を指定しない限り)。指定すれば cast が decode する。**同じ code path、2 つの surface。プログラム用は Rust、shell 用は cast。**)

## `cast` が `alloy::Provider` にどう map するか

```
┌─────────────────────────┬────────────────────────────────────────────────┐
│  cast subcommand        │  alloy::Provider method                        │
├─────────────────────────┼────────────────────────────────────────────────┤
│  cast call              │  provider.call(tx)                             │
│  cast send              │  provider.send_transaction(tx)                 │
│  cast block             │  provider.get_block(block_id)                  │
│  cast tx <hash>         │  provider.get_transaction_by_hash(hash)        │
│  cast receipt <hash>    │  provider.get_transaction_receipt(hash)        │
│  cast logs              │  provider.get_logs(filter)                     │
│  cast balance <addr>    │  provider.get_balance(addr)                    │
│  cast nonce <addr>      │  provider.get_transaction_count(addr)          │
│  cast chain-id          │  provider.get_chain_id()                       │
│  cast gas-price         │  provider.get_gas_price()                      │
│  cast block-number      │  provider.get_block_number()                   │
├─────────────────────────┼────────────────────────────────────────────────┤
│  cast abi-encode        │  alloy_dyn_abi::DynSolType::abi_encode         │
│  cast abi-decode        │  alloy_dyn_abi::DynSolType::abi_decode         │
│  cast 4byte             │  (public 4byte directory lookup, not RPC)      │
│  cast keccak <data>     │  alloy_primitives::keccak256(data)             │
└─────────────────────────┴────────────────────────────────────────────────┘
```

構造的に押さえるべきこと。`cast` ≈ `alloy::Provider`（RPC operation 用）、`cast` ≈ `alloy_dyn_abi`（ABI operation 用）。rethlab Fundamentals コースでこれら 2 つの crate を grok 済みなら、すべての `cast` subcommand が何をするかをすでに知っている。まだ引数構文を知らないだけだ。

## 手を動かす walk-through

### Step 1: 方角合わせ — `cast --version` と `cast help`

```bash
cast --version
```

`forge` version (両者は同じ `foundry-rs/foundry` バイナリ配布から船出する) と一致する `cast Version: 1.7.x` のような表示が見えるはず。

```bash
cast help
```

出力は subcommand のフラットなリスト。押さえる点が 3 つ。

1. **Subcommand は何に触るかでカテゴリ分けされている。** `cast call`、`cast send`、`cast call --trace` はチェーン state と interact する。`cast abi-*`、`cast keccak`、`cast 4byte` はローカルデータ操作ツール (RPC なし)。`cast wallet` は鍵を管理する。頭の中で bucket 分けする。*RPC コマンドは `--rpc-url` を要求する。ローカルコマンドはしない*。
2. **多くの subcommand に alias がある。** `cast call` は `cast c` でもある。`cast send` は `cast s` でもある。Interactive 利用では長形を打つ必要はない。Full name はスクリプトに現れる。
3. **`cast help <subcommand>`** が任意の subcommand の詳細フラグを与える。`cast help call` は `cast call` が受け付けるすべてのフラグを表示する (block tag、value、gas override 等)。**迷ったら docs を読むより `cast help <subcommand>` のほうが速い。**

### Step 2: `cast call` で mainnet state を読む

レッスン全体で使う public RPC endpoint: `https://ethereum.reth.rs/rpc`（Reth プロジェクトの public ノード — rethlab `alloy-provider` レッスンと同じもの）。

```bash
cast call --rpc-url https://ethereum.reth.rs/rpc \
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  "totalSupply()(uint256)"
```

これは mainnet 上の USDC contract address に対し、`totalSupply()` を呼び、cast に return を `uint256` として decode してくれと頼んでいる。

期待される出力:

```
35234876543210000000  # 実際の数字は変わる。~350 億 USDC、6 桁 decimal 精度
```

押さえる点が 6 つ。

1. **Function signature は 4-byte selector ではなく人間可読 Solidity 形式だ。** cast が内部で `"totalSupply()(uint256)"` を alloy と同じ parser で parse し、signature を keccak256 で hash し、先頭 4 bytes を取り、それを背後の `eth_call` における function selector として使う。**書くのは Solidity-ergonomic な構文、encode は cast がやる。**
2. **Function 名の後の `(uint256)` が return type の annotation だ。** これがないと cast は raw hex bytes (`0x0000...`) を表示する。あれば cast は return を `uint256` として decode し、decimal を表示する。複数 return の関数も同じパターンに従う — `"slot0()(uint160,int24,uint16,uint16,uint16,uint8,bool)"` は Uniswap V3 pool の slot0 signature で、cast は各 tuple 要素を 1 行ずつ表示する。Inline decode が exotic な signature で躓いた場合（稀だが起こり得る。動的配列を含む struct が典型）、安定したフォールバックは return-type annotation を完全に省き、生 hex を `cast abi-decode "<full-signature>"` にパイプすることだ。同じ parser を使うが、より permissive な context で走る。**実 production の signature の大半では inline 形式で動く。動かないときだけ `cast abi-decode` に手を伸ばす。**
3. **Private key 不要。** `cast call` は read-only。Broadcast せずノードの state view に対して実行する。これが production debug のワークホースだ。mainnet に対して任意の view 関数を 1 wei も使わずに simulate できる。
4. **`--rpc-url` は shell 環境の `ETH_RPC_URL` で代替できる。** `export ETH_RPC_URL=https://ethereum.reth.rs/rpc` を 1 回設定し、以降のコマンドからフラグを落とす。L5 で anvil を扱う際、terminal session ごとに `ETH_RPC_URL` を mainnet と forked anvil の間で切り替えるデモをする。
5. **出力 decimal は人間フォーマットされていない、raw integer だ。** USDC は decimal 6 桁。`35,234,876,543,210,000,000` raw は `35,234,876,543,210.000000 USDC` を意味する。cast は decimal scaling を適用しない。それは自分の仕事だ。あるいは `cast --to-unit <value> ether` で変換する (名前にもかかわらず、unit conversion は汎用)。
6. **`cast call` で使われる mainnet block は default ではチェーンの現在の head だ。** 特定 block に対して call するには `--block <number-or-hash-or-tag>` を追加する。過去 state の replay に便利。`--block 12345678` がその block 時点で `totalSupply()` が返したであろう値を simulate する。

もう 1 つ試す — 特定 address の USDC balance をクエリ:

```bash
cast call --rpc-url https://ethereum.reth.rs/rpc \
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  "balanceOf(address)(uint256)" \
  0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503  # 任意の mainnet address
```

これが Rust の `provider.call(USDC.balanceOf(addr).await?)` の CLI 等価物だ。背後の RPC は同一、違うのはキーボード ergonomics だけ。

### Step 3: Block と transaction を検査する

現在の block を見る:

```bash
cast block latest --rpc-url https://ethereum.reth.rs/rpc
```

YAML-style な dump が見える: `number`、`hash`、`parentHash`、`timestamp`、`gasLimit`、`gasUsed`、`baseFeePerGas`、`miner`、full transactions list、withdrawals 等。Alloy の `Block` type が持つのと同じデータ構造、terminal 読み用にフォーマットされている。

```bash
cast block 19000000 --rpc-url https://ethereum.reth.rs/rpc
```

Number で lookup して過去 block を replay する。「contract X が block N でどんな state を持っていたか」を debug するときに有用。

特定 transaction を検査:

```bash
cast tx 0xa84a9... --rpc-url https://ethereum.reth.rs/rpc  # 任意の real な mainnet tx hash
```

Transaction の `from`、`to`、`value`、`input` (calldata)、`gas`、`gasPrice`、`nonce`、signature components を返す。**`input` フィールドこそが次に `cast abi-decode` を使いたくなる場所だ。**

Receipt — tx が mine されたとき実際に何が起きたか:

```bash
cast receipt 0xa84a9... --rpc-url https://ethereum.reth.rs/rpc
```

`status` (1 = success、0 = reverted)、`gasUsed`、emit された `logs` (events)、`blockNumber` 等を含む。**「deploy は成功したか」を debug するとき、`cast send` の後の最初のコマンドは `cast receipt`。**

### Step 4: `cast abi-encode` / `cast abi-decode` で calldata を操作する

ERC-20 `transfer(address,uint256)` call の calldata を構築:

```bash
cast abi-encode "transfer(address,uint256)" \
  0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503 \
  1000000  # 1 USDC、6-decimal 精度
```

出力 (call の実際の calldata bytes):

```
0xa9059cbb00000000000000000000000047ac0fb4f2d84898e4d9e7b4dab3c24507a6d50300000000000000000000000000000000000000000000000000000000000f4240
```

3 セクションを読む。
- `0xa9059cbb` — `transfer(address,uint256)` の 4-byte selector (signature の keccak256 の先頭 4 bytes)
- `0000...0047ac...` — 第 1 引数 (address)、32 bytes に padded
- `0000...0f4240` — 第 2 引数 (uint256 1,000,000 = 0xf4240)、32 bytes に padded

これが生 transaction の `data` フィールドに埋め込む exact な bytes。**Multisig 提案、governance calldata、external call を構築する必要のある Solidity script のために bytes を build する方法はこれだ。**

逆操作。calldata を与えて、type 付き引数を recover する。

```bash
cast abi-decode "transfer(address,uint256)" \
  0xa9059cbb00000000000000000000000047ac0fb4f2d84898e4d9e7b4dab3c24507a6d50300000000000000000000000000000000000000000000000000000000000f4240
```

出力:

```
0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503
1000000
```

**`abi-decode` は、謎 calldata blob と function signature を持っているときに手を伸ばすツールだ。** Production debug の大半は「tx からの calldata がある、これが実際に何をするのか」。それこそが `cast abi-decode` が解く問題だ。

### Step 5: `cast 4byte` で function-selector lookup

時に calldata はあるが function signature を *知らない*。先頭 4 bytes が selector だ。cast が public directory (4byte.directory) をクエリして人間可読名を recover する。

```bash
cast 4byte 0xa9059cbb
```

出力:

```
transfer(address,uint256)
```

複数候補 signature が同じ 4 bytes に hash すれば、cast はすべてを列挙する。selector の衝突は存在する (production 関数では稀、obscure な関数では一般的)。**`cast 4byte` は unknown calldata に最初に走らせるコマンドで、その後に `cast abi-decode` を出す。**

Unknown-calldata の full な debug ループ。

```bash
# Step 5a — 謎 calldata を与えて、function 名を見つける:
cast 4byte 0xa9059cbb
# → transfer(address,uint256)

# Step 5b — recover した signature を使って calldata を decode する:
cast abi-decode "transfer(address,uint256)" 0xa9059cbb...
# → 0x47ac... 1000000
```

### Step 6: ローカル anvil に対する `cast send` の preview

`cast send` は `cast call` の state-changing なツインだ。Private key を要求し (あるいは wallet 管理コマンドの 1 つ)、transaction を broadcast し、結果の transaction hash を表示する。重要なものは実際には送らない (L5 が anvil と full なローカル開発ループを扱う)。だが構文は見ておく価値がある。

```bash
# 別 terminal でローカル anvil を起動 (L5 が深掘りする):
#   anvil
# anvil は 10 個の funded test account とその private key を表示する。

# ローカル anvil に対して transaction を送る:
cast send --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  "transfer(address,uint256)" \
  0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503 \
  1000000
```

押さえる点が 3 つ (走らせなくても見える)。

1. **`cast call` に対して `--private-key` だけが新しいフラグ。** 他はすべて同一だ。cast が key で transaction を sign し、RPC で broadcast し、hash を表示する。
2. **anvil の default private key `0xac0974...` は事前 fund 済みだ。** anvil が起動時に 10 個の deterministic account を seed する。毎回同じ private key、ローカル開発のみ safe。**anvil の default key を任意の real network に対して決して使うな。**
3. **出力は transaction hash。** それを `cast receipt $tx` に pipe する (hash を back-tick) と status、gas used、emit された logs が見える。2-step pattern は `cast send` → `cast receipt`。Alloy では `provider.send_transaction(...).await?.get_receipt().await?` をやるのと同じだ。

L5 (次のレッスン) が anvil に mainnet forking で戻る。そこで `cast send` が真に有用になる。real な mainnet transaction を forked state に対して、real ETH を使わずに simulate できる。

## よくある失敗パターン

- **`error sending request for url`** — `--rpc-url` が到達不可能。URL、自分のネットワーク、または別の public RPC (Cloudflare、Ankr 等) にフォールバックを check する。
- **`Error: Wrong function selector ...`** — 渡した function signature が contract と一致していない。Contract の実際の calldata に `cast 4byte` を使って正しい signature を recover するか、block explorer から contract の ABI を読む。
- **`Error: missing field "input"`** — 指している chain に存在しない transaction hash をクエリしている (例: testnet RPC に対して mainnet hash を使った)。Chain を検証する。
- **`cast send` が tx hash を返すが receipt は `status: 0` を表示する** — tx は mine されたが revert した。同じ calldata で `cast call` を走らせて revert reason を見る (cast call は broadcast せずに simulate し、revert message を表示する)。
- **`Error: insufficient funds`** — `--private-key` が target chain で ETH を持たない account を制御している。ローカル anvil なら anvil の seed 済み account を使う。Testnet なら faucet からリクエストする。

## 設計の振り返り

`cast` の設計に焼き込んだ load-bearing な決定が 3 つ。

1. **`cast` は背後で alloy を再利用する。別の JSON-RPC クライアントなし。** Foundry の `cast` バイナリは Reth が使うのと同じ `alloy` crate に link する。すべての `cast` invocation が、自分の Rust プログラムが歩むのと同じ code path を歩む。含意はこうだ。Reth が新しい RPC method (例えば新しい tracing endpoint) をサポートすれば、alloy version が bump された時点で `cast` はそれを無料で得る。**実装は 1 つ、surface は 2 つ。CLI は library と別に保守されていない。**

2. **Function signature は 4-byte selector ではなく人間可読だ。** cast は `transfer(address,uint256)` に対して `0xa9059cbb` を渡せと要求することもできた (Geth の `eth_call` は raw bytes を取る)。cast はどちらも受け付けるが、人間可読形式が documented default だ。規律はこうだ。*キーボード ergonomics が自分の書いた Solidity ソースと一致する*。**cast に打ち込むものが、Solidity に打ち込んだものと一致する。メンタルな翻訳ステップなし。**

3. **`--rpc-url` は session 単位ではなく command 単位だ。** 環境に `ETH_RPC_URL` を 1 回設定できるが、個々の `cast` invocation が inline でそれを上書きできる。これは deliberate に stateless。`npm` が `npm config set registry` で持つような「現在の chain」モードはない。理由はこうだ。chain mistake は破滅的だ (testnet を意図して mainnet に送る)。cast の設計はすべての state-changing コマンドで chain を可視に保つことを強制する。**ステートレス性（Statelessness）は usability の見落としではなく safety feature だ。**

## 答え合わせ

L4 の後、shell history はこんな具合に含む。

```bash
# Mainnet を読む
cast call --rpc-url https://ethereum.reth.rs/rpc \
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  "totalSupply()(uint256)"

# Block を検査
cast block latest --rpc-url https://ethereum.reth.rs/rpc

# Calldata を build
cast abi-encode "transfer(address,uint256)" 0x... 1000000

# 謎 calldata を decode
cast 4byte 0xa9059cbb
cast abi-decode "transfer(address,uint256)" 0xa9059cbb...

# Option: ローカル anvil に対して送る
cast send --rpc-url http://localhost:8545 \
  --private-key 0xac09... 0xA0b8... "transfer(address,uint256)" 0x47ac... 1000000
```

L4 の後はこれができる。
- 任意の chain 上の任意の contract の任意の view 関数を terminal から読む
- Block explorer を開かずに block と transaction を検査する
- Multisig 提案、governance、scripts 用に calldata を build / decode する
- 4byte 経由で unknown function selector を lookup する
- ローカル anvil に対して transaction を送る (L5 で anvil を full に扱う)

## よくある質問

**Q1: Etherscan + ブラウザで同じことができるのに、なぜ `cast` を使うのか?**

理由は 3 つ。**(a) 合成可能性（Composability）** — `cast` の出力はプレインテキストなので、Unix のパイプライン思想そのままに `jq`、`awk`、`xargs`、`grep` へ直接流し込める。自動化スクリプトへの組み込みが容易だ。Etherscan の出力はブラウザの中だ。**(b) 再現性（Reproducibility）** — cast コマンドは単一の bash one-liner としてチーム内で共有できる。Etherscan ワークフローはランブックに paste できないクリックの連続だ。**(c) スピード** — ローカル Reth ノードに対する `cast call` は milliseconds で返る。Etherscan は rate limit 付きで重い Web ブラウザのロードを待たされる。1 時間に数十の view クエリを投げる L1 エンジニアには、思考の同期を保つために cast の 10×+ の速度差が死活問題だ。**Etherscan は一度きりの探索用、cast はそれ以外のすべてに。**

**Q2: `cast` はすべての JSON-RPC method を サポートする? それとも subset か?**

Subset だ。cast は ~30 の named subcommand を露出し、common method をカバーする。直接露出していないものには `cast rpc <method> [params...]` を使う。これが raw escape hatch だ。method 名と parameter を JSON-RPC リクエストとして送り、JSON response を表示する。**Typed wrapper なしで method を欲しいとき、alloy で `provider.client().request::<...>()` を使うのと同じパターンだ。**

**Q3: `cast` は `cast send` のために signed transaction をどう扱うのか?**

すべて client side で sign する。`--private-key` を渡すと、cast が client side で transaction を構築し、key (`alloy_signer_local` を使う) で sign し、*signed* な transaction を `eth_sendRawTransaction` 経由で submit する。Private key は machine を離れない。Hardware wallet ワークフローには `--ledger` か `--trezor` を代わりに使う。cast が同じ `alloy_signer_*` trait を歩む。**Signing はローカル、RPC が見るのは broadcast bytes だけ。**

**Q4: `cast` の代わりに `alloy::Provider` で Rust プログラムを書くべきはいつか?**

ワークフローが 3 コマンドより長く、bash を超える branching / loop / error handling を必要とするときだ。Rough rule。場当たり的クエリは `cast`、繰り返しのワークフローや CI で走るものは Rust + alloy。一度きりの deploy には `cast send` で十分。検証、role 設定、ownership 移譲、parameter 設定を必要とする deployment script なら Rust バイナリ (あるいは Foundry の `script/` ファイル、Solidity) を書く。**cast は 1 行 bash script までスケールする。alloy は deployment バイナリまでスケールする。**

**Q5: `cast call` で異なる `msg.sender` を持つ transaction を simulate できる?**

Yes。`--from <address>` フラグが transaction の見かけ上の sender を上書きする。Access-controlled 関数の test に有用だ。`--from <owner-address>` で owner が見るものを simulate できる。ただし注意。これは *simulated* な call だ。On-chain で address を impersonate するわけではない。Test 用に impersonation が必要なら、それは Solidity の `vm.prank` か、RPC 経由の `anvil_impersonateAccount` だ (L5 が両方を扱う)。**Simulation には cast call --from、Forked-chain testing には anvil_impersonateAccount。**

**Q6: `cast` は non-Ethereum な EVM チェーンで動くか?**

Yes。標準 JSON-RPC interface を喋るものなら何でも動く。Optimism、Arbitrum、Base、Polygon、BNB Chain、自分のカスタム L2 — すべて同一に動く。`--rpc-url` を正しい endpoint に向けるだけだ。例外は非標準 RPC method を持つ chain (Tron、NEAR、non-EVM Solana 等)。明らかに当てはまらない。**任意の EVM 互換 chain には cast がある。Non-EVM chain には chain 自身の tooling が要る。**

## 次のレッスン (L5) — `anvil` + cheatcodes — real な mainnet state でのローカル開発

L5 が最後の piece を wire する。`anvil --fork-url` 経由で *real な* mainnet state に対するローカル開発だ。学ぶこと。

- `anvil --fork-url <mainnet-rpc>` — 起動時に mainnet の現 state を mirror するローカル chain を立ち上げる
- anvil が seed する 10 個の funded test account と、なぜ deterministic か
- anvil 固有の RPC method: `anvil_impersonateAccount`、`anvil_setBalance`、`anvil_mine`、`anvil_setStorageAt`
- Foundry の `vm.*` cheatcode (L1–L3 test の) が anvil の RPC 等価物にどう map するか。同じ機構、違う surface
- Full なローカル開発ループ。`anvil --fork-url` → forked mainnet に対する `cast send` → 検証用の `cast call` → real ETH ゼロ消費

L5 完走後、laptop を離れずに real な mainnet state に対して開発できる。L5 がコースの test-discipline + CLI 部分を閉じる。L6 が capstone で、そこで openhl-liquidation Stage 10b の `InsuranceFund` を Solidity に port し、同じ 4 つの保存則を `forge invariant` で証明する。

````

---

## Seed-file slot

L4 は Module 2 (CLI & state-aware testing) の sortOrder 0 に入る:

```typescript
{
  title: "レッスン 4 — cast — EVM の curl + jq",
  slug: 'foundry-cast-cli-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 4 — cast — EVM の curl + jq\n\n...`
},
```

**モジュール変更注:** L4 は Module 1 (Test discipline) ではなく Module 2 (CLI & state-aware testing) の最初のレッスンだ。Seed-builder の spec は `moduleNumber: 2`、`sortOrder: 0` が必要 — 新規モジュールの最初のレッスン。

## 翻訳セルフレビュー（paste 前）

- **L4 は意図的に L3 より短い (394 vs 379 EN 行)。** L3 はコース最大のパラダイムシフトを導入した。L4 は規律ではなく道具を導入する。密度の低さが 30 分 / 60 XP を正当化する (L3 の 40/80 と比較)。Length は content の重みを反映する、effort ではない。
- **Mermaid 図なし。** L4 の唯一の構造的視覚は alloy ↔ cast マッピング表だ。これは flowchart より ASCII 表が合う (process ではなく discrete な列挙だから)。Q4 callout が「cast から Rust バイナリへ卒業する時期」の決定木として diagram なしで機能する。
- **Real な mainnet RPC 例を全体で使う。** Public RPC `https://ethereum.reth.rs/rpc` (Reth プロジェクト自身の endpoint、rethlab Fundamentals コースで確立) を全体で使う。USDC の mainnet address を test contract として使う — 読者が返された totalSupply を Etherscan に対して sanity-check できるくらいよく知られている。**Concrete address が レッスンを copy-paste-runnable にする。**
- **alloy ↔ cast マッピング表が load-bearing な pedagogical move。** rethlab Fundamentals の `alloy-provider` レッスンを通った Rust エンジニアにとって、表が全レッスンを「ああ、shell から `provider.X()` を呼ぶだけだ」にする。L1–L3 が testing のために使った同じ discipline-transfer framing を、RPC tooling に適用したもの。
- **Q2 (`cast rpc` escape hatch) と Q4 (cast → alloy 卒業ルール) が operational tip。** Q1 (vs Etherscan) が philosophy。Q5 (`--from` simulation) と Q6 (non-Ethereum EVM chain) が practical edge case。Q3 (signing のローカル性) が security note。
- **Step 6 (anvil に対する `cast send`) は意図的に preview のみ。** anvil 自体の full な扱いは L5。今 anvil を走らせずに構文を見せることで、L4 を shell-only に保ち (daemon 管理なし)、L5 への hook を植える。
- **LaTeX なし、math なし。** L4 はすべて CLI ergonomics — string、address、hex bytes。Math は L6 capstone まで取っておく (InsuranceFund cascade が実際に必要とする)。

### JA 特有のスタイル決定

- **専門用語は英語のまま** (`cast`, `alloy::Provider`, `cast call`, `cast send`, `cast abi-encode`, `cast 4byte`, `cast rpc`, `eth_call`, `ETH_RPC_URL`, `--rpc-url`, `--private-key`, `anvil`, `JSON-RPC`, `forge-rs/foundry`, `keccak256`, `calldata`, `selector`, `mainnet`, `testnet`, `view`, `pure`, `broadcast`, `load-bearing` など)。
- **Bash / Solidity コードと in-code コメントは英語のまま**。Reader が直接 copy-paste する。
- **ASCII マッピング表は header だけ翻訳しなかった**。`cast subcommand` と `alloy::Provider method` は英語のまま — 表のすべてのセル値も英語で、混合させると読みづらい。
- **`load-bearing` は英語のまま使用**。L0–L3 と同じ。
- **`alloy bindings` / `escape hatch` / `discipline-transfer framing` も英語のまま**。技術用語として確立、翻訳すると失われるニュアンスがある。
- **`合成可能性 (Composability)`、`再現性 (Reproducibility)`、`ステートレス性 (Statelessness)`、`内省 (Introspection)`** は Q&A / 設計振り返り内で bilingual annotation 付き。

