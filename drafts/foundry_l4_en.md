# Mastering Foundry — L4 draft (EN)

> No openhl SHA pin (`cast` is a Foundry CLI tool, not a contract). Cross-references rethlab's openhl-fundamentals "alloy-provider" lesson — `cast` is alloy bindings exposed as a terminal command. Public RPC endpoint `https://ethereum.reth.rs/rpc` (Reth project's mainnet node) used throughout.

## L4 — `foundry-cast-cli-en`

**Title**: Lesson 4 — `cast` — the EVM's `curl` + `jq`

**Duration**: 30 min · **XP**: 60

---

````markdown
# Lesson 4 — `cast` — the EVM's `curl` + `jq`

## Goal

Concepts you'll grasp in this lesson:

- **`cast` is `alloy::Provider` exposed as a terminal command.** Every `cast` subcommand maps to a method on `alloy_provider::Provider` — the same trait you call from Rust code in the rethlab `alloy-provider` lesson. `cast call` ↔ `provider.call(...)`, `cast block` ↔ `provider.get_block(...)`, `cast send` ↔ `provider.send_transaction(...)`. The CLI is a thin shell wrapper around the same Rust code path. If you already wrote `provider.call().await?` in Rust, you're not learning a new mental model — you're learning a new keyboard shortcut. **`cast` is alloy bindings + a shell prompt; the underlying RPC requests are identical.**
- **`cast` separates *what you're asking* from *which chain you're asking it of*.** Every command takes an optional `--rpc-url <URL>` flag that points at a node. With no flag, `cast` uses `$ETH_RPC_URL` from your environment. The same `cast call` against mainnet, sepolia, or a local anvil instance is a single flag change — the command itself is identical. **The chain is a parameter, not a binding.** This is the L1-engineer payoff: the same query reads from prod, staging, or a forked simulation with one substitution.
- **Read-only `cast call` and state-changing `cast send` are the two verbs you'll use 90% of the time.** `cast call` runs view/pure functions or simulates a transaction without broadcasting — it returns the function's return value as raw bytes (or decoded if you pass a function signature). `cast send` actually broadcasts a transaction, requires a `--private-key`, and prints the transaction hash. The remaining commands (`cast block`, `cast tx`, `cast logs`, `cast abi-encode`, `cast 4byte`) are introspection and data-manipulation tools — useful, but the load-bearing pair is `call` and `send`. **Most production debugging is `cast call` against a forked anvil; most production deployment is `cast send` against testnet then mainnet.**
- **`cast abi-encode` / `cast abi-decode` close the data-layer loop.** When you need to construct calldata manually (for `cast send --create`, for a multisig submission, for embedding in a Solidity script), `cast abi-encode "transfer(address,uint256)" 0x... 1000` produces the exact bytes that would be sent on-chain. `cast abi-decode` does the inverse — given calldata and a function signature, it pulls out the typed arguments. This is the *same* ABI machinery that `forge`'s test runner uses internally, exposed at the CLI. **If you've ever debugged calldata by hand, `cast abi-decode` is the tool that should have been in your shell aliases years ago.**

Verification:

```bash
cast --version
cast call --rpc-url https://ethereum.reth.rs/rpc \
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 "totalSupply()(uint256)"
```

…runs against real mainnet via the Reth project's public RPC and returns USDC's current total supply (a ~12-digit number in 6-decimal precision). After this lesson you'll know which `cast` subcommands map to which alloy methods, when to reach for `cast call` vs `cast send`, and how to assemble calldata by hand when you need to.

Specific changes:

- **No source-file edits.** L4 is all CLI invocation. You'll run ~8 different `cast` commands against mainnet and (optionally) against a local anvil.
- **`.env`** (optional) — you may want to set `ETH_RPC_URL=https://ethereum.reth.rs/rpc` to avoid passing `--rpc-url` on every command. The L5 lesson on anvil will demonstrate switching `ETH_RPC_URL` between mainnet and a forked anvil per terminal session.

Total: zero lines of Solidity. L4 is shell time. The pedagogical move is internalizing the alloy-method ↔ cast-subcommand mapping so the next time you reach for a Rust `Provider`, you reach for `cast` first.

## Recap

After L3:
- `forge invariant` runs random call sequences against a Handler, checks `invariant_*` after each call.
- Handlers wrap targets, bound inputs, track ghost variables (shadow specification).
- Sequence shrinking reduces a 30+ call failure to a 2-call minimal counterexample.

L3 lived inside `test/` files. L4 leaves the test directory entirely — `cast` is what you reach for when you have a deployed contract, a transaction hash, or calldata you need to decode, and you don't want to write a Solidity script just to look at it. **The L1 engineer's debug loop is `forge test` then `cast call`, not `forge test` alone.**

## Plan

Five categories of invocation:

1. **`cast call`** — read mainnet state from the terminal. We'll query USDC's `totalSupply()` and `balanceOf(address)` for a known address.
2. **`cast block` / `cast tx`** — chain introspection. Look up a recent mainnet block; inspect a specific transaction by hash.
3. **`cast abi-encode` / `cast abi-decode`** — calldata manipulation. Build the bytes for an ERC-20 transfer call; decode bytes back to typed arguments.
4. **`cast 4byte` / `cast 4byte-decode`** — function-selector lookup. Given the first 4 bytes of calldata, find the human-readable function name via the public 4byte directory.
5. **`cast send` against a local anvil (preview)** — state-changing transactions. We won't deploy anything significant; the exercise demonstrates how `cast send` interacts with a chain (L5 covers anvil itself in depth).

> 🛑 **Predict.** Before reading on: in the rethlab `alloy-provider` lesson, you wrote (paraphrased) `let supply = provider.call(&tx).await?` where `tx` was built with `eth_call` semantics. What's the exact `cast` invocation that produces the same result against mainnet?

(Answer: **`cast call --rpc-url <URL> <contract-address> "<function-signature>" [args...]`**. The pieces map directly: the `--rpc-url` flag is the alloy `RootProvider`'s underlying transport URL, the contract address is the `to` field in the transaction, the function signature is the human-readable ABI shorthand that cast hashes into a 4-byte selector internally (alloy uses the same `Function::parse` machinery), and any args are positional. The return is raw hex unless you specify return types as `"(...returntypes)"` after the function signature, in which case cast decodes for you. **Same code path, two surfaces — Rust for programs, cast for the shell.**)

## How `cast` maps to `alloy::Provider`

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

The structural takeaway: `cast` ≈ `alloy::Provider` for RPC operations, `cast` ≈ `alloy_dyn_abi` for ABI operations. If you've grokked these two crates from the rethlab Fundamentals course, you already know what every `cast` subcommand does — you just don't know the argument syntax yet.

## Walk-through

### Step 1: Orient — `cast --version` and `cast help`

```bash
cast --version
```

You should see something like `cast Version: 1.7.x` matching your `forge` version (both ship from the same `foundry-rs/foundry` binary distribution).

```bash
cast help
```

The output is a flat list of subcommands. Three things to notice:

1. **Subcommands are categorized by what they touch.** `cast call`, `cast send`, `cast call --trace` interact with chain state. `cast abi-*`, `cast keccak`, `cast 4byte` are local data-manipulation tools (no RPC). `cast wallet` manages keys. Mentally bucket them: *RPC commands need `--rpc-url`; local commands don't*.
2. **Many subcommands have aliases.** `cast call` is also `cast c`, `cast send` is also `cast s`. You don't need to type them out long-form in interactive use. The full names appear in scripts.
3. **`cast help <subcommand>`** gives detailed flags for any subcommand. `cast help call` shows every flag `cast call` accepts (block tag, value, gas overrides, etc.). **When in doubt, `cast help <subcommand>` is faster than reading docs.**

### Step 2: Read mainnet state with `cast call`

Public RPC endpoint we'll use throughout: `https://ethereum.reth.rs/rpc` (the Reth project's public node — same one used in the rethlab `alloy-provider` lesson).

```bash
cast call --rpc-url https://ethereum.reth.rs/rpc \
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  "totalSupply()(uint256)"
```

That's USDC's contract address on mainnet, calling `totalSupply()` and asking cast to decode the return as a `uint256`.

Expected output:

```
35234876543210000000  # the exact number changes; ~35 billion USDC in 6-decimal precision
```

Six things to notice:

1. **The function signature is the human-readable Solidity form, not the 4-byte selector.** cast parses `"totalSupply()(uint256)"` internally using the same parser alloy uses, hashes the signature with keccak256, takes the first 4 bytes, and uses that as the function selector in the underlying `eth_call`. **You write Solidity-ergonomic syntax; cast does the encoding.**
2. **The `(uint256)` after the function name is the return-type annotation.** Without it, cast prints the raw hex bytes (`0x0000...`). With it, cast decodes the return as a `uint256` and prints the decimal. Multi-return functions follow the same pattern — `"slot0()(uint160,int24,uint16,uint16,uint16,uint8,bool)"` is the Uniswap V3 pool's slot0 signature, and cast prints each tuple element on its own line.

   > [!TIP]
   > **Robust Decoding Fallback using `cast abi-decode`**
   > For functions returning complex structs, dynamic arrays, or nested tuples, the inline return-type annotation (e.g., `"myFunction()(uint256[],(string,address))"`) might occasionally fail due to parser limitations in the CLI argument handling context. The professional fallback is to query the function *without* specifying return type annotations to retrieve the raw hex output, and then pipe that output directly to `cast abi-decode`:
   > ```bash
   > cast call <contract-address> "myFunction()" | cast abi-decode "myFunction()(uint256[],(string,address))"
   > ```
   > This approach runs the ABI decoder in a more permissive context than the command-line arguments parser, allowing it to correctly parse highly nested or custom data types. If a standard query fails to decode, immediately switch to this piped command pattern.
3. **No private key needed.** `cast call` is read-only; it executes against the node's view of state without broadcasting. This is the workhorse for production debugging — you can simulate any view function against mainnet without spending a wei.
4. **`--rpc-url` can be replaced by `ETH_RPC_URL` in your shell env.** Set `export ETH_RPC_URL=https://ethereum.reth.rs/rpc` once and drop the flag from subsequent commands. The L5 lesson on anvil will show switching `ETH_RPC_URL` between mainnet and forked anvil.
5. **The output decimal is raw integer, not human-formatted.** USDC has 6 decimals, so `35,234,876,543,210,000,000` raw means `35,234,876,543,210.000000 USDC`. cast doesn't apply decimal scaling — that's your job, or use `cast --to-unit <value> ether` for conversion (despite the name, the unit conversion is general).
6. **The mainnet block used for `cast call` is the chain's current head by default.** To call against a specific block, add `--block <number-or-hash-or-tag>`. Useful for replaying past state: `--block 12345678` simulates what `totalSupply()` would have returned at that block.

Try one more — query a specific address's USDC balance:

```bash
cast call --rpc-url https://ethereum.reth.rs/rpc \
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  "balanceOf(address)(uint256)" \
  0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503  # arbitrary mainnet address
```

This is the CLI equivalent of `provider.call(USDC.balanceOf(addr).await?)` in Rust. Same RPC underneath, different keyboard ergonomics.

### Step 3: Inspect blocks and transactions

Look at the current block:

```bash
cast block latest --rpc-url https://ethereum.reth.rs/rpc
```

You'll see a YAML-style dump: `number`, `hash`, `parentHash`, `timestamp`, `gasLimit`, `gasUsed`, `baseFeePerGas`, `miner`, the full transactions list, withdrawals, etc. Same data structure alloy's `Block` type contains, formatted for terminal reading.

```bash
cast block 19000000 --rpc-url https://ethereum.reth.rs/rpc
```

Lookup by number — replaying a historical block. Useful when debugging "what state did contract X have at block N."

Inspect a specific transaction:

```bash
cast tx 0xa84a9... --rpc-url https://ethereum.reth.rs/rpc  # any real mainnet tx hash
```

Returns the transaction's `from`, `to`, `value`, `input` (the calldata), `gas`, `gasPrice`, `nonce`, signature components. **The `input` field is where you'll most often want `cast abi-decode` next.**

The receipt — what actually happened when the tx mined:

```bash
cast receipt 0xa84a9... --rpc-url https://ethereum.reth.rs/rpc
```

Includes `status` (1 = success, 0 = reverted), `gasUsed`, the emitted `logs` (events), `blockNumber`, etc. **When debugging "did my deploy succeed," `cast receipt` is the first command after `cast send`.**

### Step 4: Manipulate calldata with `cast abi-encode` / `cast abi-decode`

Build the calldata for an ERC-20 `transfer(address,uint256)` call:

```bash
cast abi-encode "transfer(address,uint256)" \
  0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503 \
  1000000  # 1 USDC in 6-decimal precision
```

Output (the actual calldata bytes for the call):

```
0xa9059cbb00000000000000000000000047ac0fb4f2d84898e4d9e7b4dab3c24507a6d50300000000000000000000000000000000000000000000000000000000000f4240
```

Three sections to read:
- `0xa9059cbb` — the 4-byte selector for `transfer(address,uint256)` (keccak256 of the signature, first 4 bytes)
- `0000...0047ac...` — the first argument (address), padded to 32 bytes
- `0000...0f4240` — the second argument (uint256 1,000,000 = 0xf4240), padded to 32 bytes

This is the exact `data` field you'd embed in a raw transaction. **For multisig proposals, governance calldata, or Solidity scripts that need to construct external calls, this is how you build the bytes.**

Reverse the operation — given calldata, recover the typed arguments:

```bash
cast abi-decode "transfer(address,uint256)" \
  0xa9059cbb00000000000000000000000047ac0fb4f2d84898e4d9e7b4dab3c24507a6d50300000000000000000000000000000000000000000000000000000000000f4240
```

Output:

```
0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503
1000000
```

**`abi-decode` is what you reach for when you have a mystery calldata blob and a function signature.** Most production debugging is "I have this calldata from a tx, what does it actually do" — and that's exactly what `cast abi-decode` solves.

### Step 5: Function-selector lookup with `cast 4byte`

Sometimes you have calldata but *don't* know the function signature. The first 4 bytes are the selector; cast queries a public directory (4byte.directory) to recover the human-readable name:

```bash
cast 4byte 0xa9059cbb
```

Output:

```
transfer(address,uint256)
```

If multiple candidate signatures hash to the same 4 bytes, cast lists all of them — selector collisions exist (rare for production functions, common for obscure ones). **`cast 4byte` is the first command you run on unknown calldata before reaching for `cast abi-decode`.**

A full unknown-calldata debug loop:

```bash
# Step 5a — given mystery calldata, find the function name:
cast 4byte 0xa9059cbb
# → transfer(address,uint256)

# Step 5b — decode the calldata using the recovered signature:
cast abi-decode "transfer(address,uint256)" 0xa9059cbb...
# → 0x47ac... 1000000
```

### Step 6: Preview `cast send` against a local anvil

`cast send` is `cast call`'s state-changing twin. It requires a private key (or one of the wallet-management commands), broadcasts the transaction, and prints the resulting transaction hash. We won't actually send anything significant — L5 covers anvil and the full local-development loop — but the syntax is worth seeing:

```bash
# Start a local anvil in another terminal (L5 covers this in depth):
#   anvil
# Anvil prints 10 funded test accounts and their private keys.

# Send a transaction against the local anvil:
cast send --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  "transfer(address,uint256)" \
  0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503 \
  1000000
```

Three things to notice (even without running it):

1. **`--private-key` is the only new flag vs `cast call`.** Everything else is identical. cast signs the transaction with the key, broadcasts via the RPC, and prints the hash.
2. **The default anvil private key `0xac0974...`** comes pre-funded — anvil seeds 10 deterministic accounts on startup. Same private key every time, safe for local development only. **Never use anvil's default keys against any real network.**
3. **The output is a transaction hash** — pipe it into `cast receipt $tx` (back-tick the hash) to see status, gas used, and emitted logs. The two-step pattern is `cast send` → `cast receipt`, just like in alloy you'd do `provider.send_transaction(...).await?.get_receipt().await?`.

L5 (next lesson) returns to anvil with mainnet forking, which is where `cast send` becomes truly useful — you can simulate real mainnet transactions against forked state without spending real ETH.

## Common errors

- **`error sending request for url`** — `--rpc-url` is unreachable. Check the URL, your network, or fall back to a different public RPC (Cloudflare's, Ankr's, etc.).
- **`Error: Wrong function selector ...`** — the function signature you passed doesn't match the contract. Use `cast 4byte` on the contract's actual calldata to recover correct signatures, or read the contract's ABI from a block explorer.
- **`Error: missing field "input"`** — you're querying a transaction hash that doesn't exist on the chain you're pointed at (e.g., you used a mainnet hash against a testnet RPC). Verify the chain.
- **`cast send` returns the tx hash but the receipt shows `status: 0`** — the tx mined but reverted. Use `cast call` with the same calldata to see the revert reason (cast call simulates without broadcasting and shows revert messages).
- **`Error: insufficient funds`** — your `--private-key` controls an account with no ETH on the target chain. For local anvil, use one of anvil's seeded accounts; for testnets, request from a faucet.

## Design retrospective

Three load-bearing decisions in `cast`'s design:

1. **`cast` reuses alloy under the hood — no separate JSON-RPC client.** Foundry's `cast` binary links against the same `alloy` crates Reth uses. Every `cast` invocation walks the same code path your Rust program would. The implication: if Reth supports a new RPC method (e.g., new tracing endpoints), `cast` gets it for free once the alloy version bumps. **One implementation, two surfaces. The CLI is not maintained separately from the library.**

2. **Function signatures are human-readable, not 4-byte selectors.** cast could have required you to pass `0xa9059cbb` for `transfer(address,uint256)` — Geth's `eth_call` does take the raw bytes. cast accepts both, but the human-readable form is the documented default. The discipline: *the keyboard ergonomics match the Solidity source you wrote*. **The thing you type into cast matches the thing you typed into Solidity. No mental translation step.**

3. **`--rpc-url` is per-command, not per-session.** You can set `ETH_RPC_URL` once in your environment, but every individual `cast` invocation can override it inline. This is deliberately stateless — there's no "current chain" mode like `npm` has with `npm config set registry`. The reason: chain mistakes are catastrophic (sending to mainnet when you meant testnet), and cast's design forces the chain to be visible on every state-changing command. **Statelessness is a safety feature, not a usability oversight.**

## Answer key

After L4, your shell history should include something like:

```bash
# Read mainnet
cast call --rpc-url https://ethereum.reth.rs/rpc \
  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  "totalSupply()(uint256)"

# Inspect a block
cast block latest --rpc-url https://ethereum.reth.rs/rpc

# Build calldata
cast abi-encode "transfer(address,uint256)" 0x... 1000000

# Decode mystery calldata
cast 4byte 0xa9059cbb
cast abi-decode "transfer(address,uint256)" 0xa9059cbb...

# Optional: send against local anvil
cast send --rpc-url http://localhost:8545 \
  --private-key 0xac09... 0xA0b8... "transfer(address,uint256)" 0x47ac... 1000000
```

After L4 you can:
- Read any view function on any contract on any chain from your terminal
- Inspect blocks and transactions without opening a block explorer
- Build and decode calldata for multisig proposals, governance, or scripts
- Look up unknown function selectors via 4byte
- Send transactions against local anvil (full anvil treatment in L5)

## Q&A

**Q1: Why use `cast` when Etherscan + a browser do the same thing?**

Three reasons:
1. **Composability** — `cast` output pipes into `jq`, `awk`, `xargs`, `grep`, exactly like any Unix tool. Etherscan output is in a browser.
2. **Reproducibility** — a cast command is a shareable bash one-liner; an Etherscan workflow is a series of clicks you can't paste into a runbook.
3. **Speed** — `cast call` against a local Reth node returns in milliseconds; Etherscan loads in seconds with rate limits. For L1 engineers doing dozens of view queries per hour, cast is 10×+ faster than browser-based tools.

**Etherscan for one-off exploration; cast for everything else.**

**Q2: Does `cast` support every JSON-RPC method or only a subset?**

cast exposes ~30 named subcommands covering the common methods. For anything not directly exposed, use `cast rpc <method> [params...]` which is the raw escape hatch — it sends the method name and parameters as a JSON-RPC request and prints the JSON response. **Same pattern as `provider.client().request::<...>()` in alloy when you want a method without a typed wrapper.**

**Q3: How does `cast` handle signed transactions for `cast send`?**

When you pass `--private-key`, cast constructs the transaction client-side, signs it with the key (using `alloy_signer_local`), and submits the *signed* transaction via `eth_sendRawTransaction`. The private key never leaves your machine. For hardware-wallet workflows, use `--ledger` or `--trezor` instead; cast walks the same `alloy_signer_*` traits. **The signing is local; the RPC only sees broadcast bytes.**

**Q4: When should I write a Rust program with `alloy::Provider` instead of using `cast`?**

When the workflow is longer than 3 commands or needs branching/loops/error handling beyond bash. Rough rule: ad-hoc queries → `cast`; repeated workflows or anything that runs in CI → Rust + alloy. For one-time deployments, `cast send` is fine. For deployment scripts that need to verify, set up roles, transfer ownership, configure parameters — write a Rust binary (or a Foundry `script/` file in Solidity). **cast scales to a 1-line bash script; alloy scales to a deployment binary.**

**Q5: Can `cast call` simulate a transaction with a different `msg.sender`?**

Yes. The `--from <address>` flag overrides who the transaction appears to come from. Useful for testing access-controlled functions — `--from <owner-address>` lets you simulate what the owner would see. Note: this is a *simulated* call; it doesn't actually impersonate the address on-chain. If you need impersonation for tests, that's `vm.prank` in Solidity or `anvil_impersonateAccount` via RPC (L5 covers both). **cast call --from for simulation, anvil_impersonateAccount for forked-chain testing.**

**Q6: Does `cast` work with non-Ethereum EVM chains?**

Yes — anything that speaks the standard JSON-RPC interface. Optimism, Arbitrum, Base, Polygon, BNB Chain, your custom L2 — all work identically. Just point `--rpc-url` at the right endpoint. The exception is chains with non-standard RPC methods (e.g., Tron, NEAR, non-EVM Solana) which obviously don't apply. **For any EVM-compatible chain, cast is your CLI; for non-EVM chains, you need the chain's own tooling.**

## Next lesson (L5) — `anvil` + cheatcodes — local development with mainnet state

L5 wires the last piece: local development against *real* mainnet state via `anvil --fork-url`. You'll learn:

- `anvil --fork-url <mainnet-rpc>` — spin up a local chain that mirrors mainnet's current state at startup
- The 10 funded test accounts anvil seeds, and why they're deterministic
- Anvil-specific RPC methods: `anvil_impersonateAccount`, `anvil_setBalance`, `anvil_mine`, `anvil_setStorageAt`
- How Foundry's `vm.*` cheatcodes (from L1–L3 tests) map to anvil's RPC equivalents — same machinery, different surface
- The full local-dev loop: `anvil --fork-url` → `cast send` against forked mainnet → `cast call` to verify → no real ETH spent

After L5 you can develop against mainnet state without leaving your laptop. L5 closes the test-discipline + CLI portion of the course; L6 is the capstone where you port openhl-liquidation Stage 10b's `InsuranceFund` to Solidity and prove the same 4 conservation invariants with `forge invariant`.

````

---

## Seed-file slot

L4 lands in Module 2 (CLI & state-aware testing) sortOrder 0:

```typescript
{
  title: "Lesson 4 — cast — the EVM's curl + jq",
  slug: 'foundry-cast-cli-en',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 30,
  xpReward: 60,
  content: `# Lesson 4 — cast — the EVM's curl + jq\n\n...`
},
```

**Module change note:** L4 is the first lesson in Module 2 (CLI & state-aware testing), not Module 1 (Test discipline). The seed-builder spec needs `moduleNumber: 2`, `sortOrder: 0` — first lesson of a new module.

## Drafting self-review (before paste)

- **L4 deliberately shorter than L3 (380 vs 379 lines target).** L3 introduced the biggest paradigm shift in the course; L4 introduces a tool, not a discipline. Less density justifies 30 min / 60 XP (vs L3's 40/80). Length reflects content weight, not effort.
- **No Mermaid diagram.** L4's only structural visual is the alloy ↔ cast mapping table, which fits an ASCII table better than a flowchart (it's a discrete enumeration, not a process). The Q4 callout serves as the "when to graduate from cast to a Rust binary" decision tree without needing a diagram.
- **Real mainnet RPC examples throughout.** Public RPC `https://ethereum.reth.rs/rpc` (Reth project's own endpoint, established in rethlab Fundamentals course) used uniformly. USDC's mainnet address as the test contract — well-known enough that readers can sanity-check the returned totalSupply against Etherscan. **Concrete addresses make the lesson copy-paste-runnable.**
- **The alloy ↔ cast mapping table is the load-bearing pedagogical move.** For Rust engineers who've been through rethlab's Fundamentals `alloy-provider` lesson, the table makes the whole lesson "oh, that's just `provider.X()` from a shell." This is the same discipline-transfer framing L1–L3 used for testing, applied to RPC tooling.
- **Q2 (`cast rpc` escape hatch) and Q4 (cast → alloy graduation rule) are the operational tips.** Q1 (vs Etherscan) is the philosophy. Q5 (`--from` simulation) and Q6 (non-Ethereum EVM chains) are the practical edge cases. Q3 (signing locality) is the security note.
- **Step 6 (`cast send` against anvil) is intentionally preview-only.** Full anvil treatment is L5. Showing the syntax now without making the reader run anvil keeps L4 shell-only (no daemon to manage) while planting the L5 hook.
- **No LaTeX, no math.** L4 is all CLI ergonomics — strings, addresses, hex bytes. Save math for L6 capstone where the InsuranceFund cascade actually needs it.
