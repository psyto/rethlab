import { PrismaClient } from '@prisma/client';

export async function seedRethBridgeToAdvancedEN(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'evm', 'rust', 'bridge'];

  await prisma.course.create({
    data: {
      slug: 'reth-bridge-to-advanced-en',
      title: 'Reading the Stack — Bridge to Advanced',
      description:
        'You finished Fundamentals. Source-walking in Advanced still feels overwhelming. This course closes the gap: EVM at the bytes level (dispatch loop, world state, call frames, reorgs) and the intermediate Rust (generics, dyn, Arc, unsafe, macros) that Reth and Revm source assume you know.',
      difficulty: 'INTERMEDIATE',
      duration: 180,
      xpReward: 200,
      track: 'reth-bridge-to-advanced',
      tags,
      isPublished: true,
      sortOrder: 250,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'EVM at the bytes level',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'From Solidity to bytecode — the dispatch loop',
                  slug: 'bytecode-dispatch-loop-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# From Solidity to bytecode — the dispatch loop

You've written Solidity. You've used Foundry to deploy and test. But what does the EVM **actually do** with your contract once it's deployed? This lesson takes you down one layer — to the bytes.

This is the layer Advanced lessons assume you already understand. Without it, the source of \`revm/crates/interpreter\` reads like noise.

## What Solidity becomes

When you compile a Solidity contract, the output is a **bytecode** — literally a sequence of bytes. Here's a fragment from a real deployed contract:

\`\`\`
0x60 0x80 0x60 0x40 0x52 0x34 0x80 0x15 0x60 0x10 0x57 ...
\`\`\`

Each byte is either:

- An **opcode** (an instruction the EVM knows about)
- A **literal value** that follows certain push opcodes

The first byte is \`0x60\` — that's the \`PUSH1\` opcode. The second byte (\`0x80\`) is the 1-byte literal to push onto the stack.

Then \`0x60 0x40\` — another PUSH1 with literal \`0x40\`.
Then \`0x52\` — that's \`MSTORE\` (write the top 2 stack items into memory).

That's not magic. It's the EVM equivalent of x86 machine code: a flat byte stream that means something specific to the runtime.

## What the EVM does with those bytes

The EVM keeps a **program counter** (PC) — an integer that points to the current byte in the bytecode. The core loop is:

\`\`\`
loop {
    let opcode = bytecode[pc];                 // fetch one byte
    let handler = instruction_table[opcode];   // O(1) array lookup
    handler(stack, memory, gas, ...);          // execute
    pc = pc + 1;                               // (or jump)
    if halted { break; }
}
\`\`\`

That is the entire EVM. Three lines of pseudocode.

The interesting parts:

1. **\`instruction_table\`** — a **256-entry array** (one slot per possible byte value 0x00–0xFF). Each slot is a function pointer to the opcode handler.
2. **PC management** — most opcodes advance PC by 1. But:
   - \`PUSH1\` advances by 2 (skipping its 1-byte literal). \`PUSH32\` advances by 33.
   - \`JUMP\` and \`JUMPI\` set PC to an arbitrary value (the branch target).
3. **Halts** — \`STOP\`, \`RETURN\`, \`REVERT\`, \`INVALID\`, and **Out-Of-Gas** all break the loop, but with different post-conditions (success / failure / state-revert / no-state-revert).

## A real opcode you've used: ADD (\`0x01\`)

ADD takes the top two stack items, adds them, pushes the result. In pseudocode:

\`\`\`
fn add(stack, gas) {
    gas.charge(3);                  // ADD costs exactly 3 gas
    let a = stack.pop();
    let b = stack.pop();
    stack.push(a.wrapping_add(b));  // mod 2^256, never panics
}
\`\`\`

Three details that matter:

- **Gas**: every opcode pays gas. ADD is fixed at 3. SLOAD is dynamic (cold = 2100, warm = 100). Out-of-gas during execution halts the frame.
- **\`wrapping_add\`**: EVM arithmetic is mod 2²⁵⁶. \`U256::MAX + 1 = 0\`. No exception. Solidity ≥ 0.8 added overflow checks **on top** of the EVM, but the underlying ADD opcode wraps.
- **Stack discipline**: pop, pop, push. The stack shrinks by 1. EVM stack is limited to 1024 items; overflow is a halt.

## Where the bytecode comes from

A deployed contract has two pieces of bytecode:

| Piece | When it runs | What it does |
| :--- | :--- | :--- |
| **Constructor (init code)** | Once, at deployment | Initializes storage, returns the runtime code |
| **Runtime code** | Every call to the contract | The dispatch logic + your functions |

When Foundry shows you "creation code" in test output, that's the init code. The runtime code is what \`eth_getCode(address)\` returns.

## A picture

\`\`\`
bytecode: 0x60 0x80 0x60 0x40 0x52 0x34 0x80 ...
                 │
                 │   PC = 0
                 ▼
            ┌────────────┐
            │  fetch byte│  ← bytecode[PC] = 0x60
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
            │   push1    │  ← runs: read literal, push to stack
            └────────────┘
                 │
                 ▼
              PC += 2     ← (1 for opcode + 1 for literal)
\`\`\`

Repeat until a halt opcode is hit, gas runs out, or an invalid opcode is encountered.

## Why this matters for Advanced

When you open \`revm/crates/interpreter/src/instructions/arithmetic.rs\` in the Advanced course, you'll see:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

Without this lesson, that's "some Rust function." With this lesson:

- This is **the function pointer at slot 0x01** of the 256-entry instruction table.
- The interpreter loop **fetched byte 0x01 from the bytecode and called this**.
- The function pops one item (\`popn_top!([op1])\`), gets a *mutable reference* to the new top (\`op2\`), and writes \`op1 + op2\` directly through the reference. **One memory write instead of pop-pop-push.** That's an optimization, but the semantics are identical to the pseudocode above.

The Rust source is doing **exactly the pseudocode** — just optimized for cache and CPU.

## Why an array, not a \`match\` statement?

A reasonable design would be:

\`\`\`rust
match opcode {
    0x01 => add(...),
    0x02 => mul(...),
    // 254 more arms
}
\`\`\`

Why an array of function pointers instead?

- **Predictable performance**: array index is one CPU instruction. A \`match\` compiles to either a branch tree or a jump table — usually fast, but the array is *always* fast.
- **Compile-time construction**: the 256-entry table can be built with \`const fn\` at compile time. Zero runtime setup cost.
- **Easy customization**: a fork can replace **one slot** to add a custom opcode (you'll see this in Advanced lesson 2).

## Reading list — do these before Advanced

1. **Open [evm.codes](https://www.evm.codes)** and click around. Every opcode, with gas cost and stack effect. Bookmark it.
2. **Skim the EVM section of the [Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf)**, pages 9–13. Don't try to read cover-to-cover; just see the formal definition of the loop and the opcodes. It looks denser than it is.
3. **Compile a one-line Solidity contract** with \`forge build\`. Open \`out/Contract.sol/Contract.json\` and look at \`bytecode.object\`. Find the bytes you can recognize (PUSH, MSTORE, JUMP).

## What you should walk away with

- The EVM is a **byte-driven dispatch loop**: fetch a byte, index into a 256-slot function table, run the handler, advance PC.
- Each opcode is a small Rust function (in Revm's case) with a **fixed contract**: it touches the stack, memory, gas, and possibly storage, then returns control.
- Every detail you'll see in Advanced lesson 1 (\`add<IT, H>\`, the instruction table, PC, halts) maps directly to this model.

When you start Advanced, the first lesson opens with the *exact* \`add\` function above. You won't be surprised by what it is — you'll just be reading the production-grade implementation of something you already understand.`,
                },
                {
                  title: 'Memory, storage, and the world state',
                  slug: 'memory-storage-world-state-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# Memory, storage, and the world state

The dispatch loop showed you what an opcode *is*. Most opcodes touch one of four stores. This lesson walks through them — and through the world-state model that Solidity hides from you but Advanced lessons assume you know.

## The four stores

| Store | Lifetime | Cost shape | Solidity surface |
| :--- | :--- | :--- | :--- |
| **Stack** | One call frame | Cheap (3 gas / op) | implicit |
| **Memory** | One call frame | Cheap, grows quadratically | the \`memory\` keyword |
| **Calldata** | One call frame, read-only | Cheap reads | function arguments |
| **Storage** | Permanent (per contract) | Expensive (cold = 2100, warm = 100) | state variables |

Each store has its own opcodes. Mixing them up is one of the most common Solidity bugs.

## Stack — the EVM's primary scratch space

You've already met this. 1024 items max, each 32 bytes (one EVM word). Every arithmetic / comparison / logic opcode reads from the top of the stack and writes back to it.

Stack overflow (depth > 1024) and stack underflow (popping an empty stack) both halt the frame.

## Memory — linear, expandable, frame-local

Memory is a **flat array of bytes**, addressed from offset 0, growing as needed. Two opcodes do the work:

- \`MLOAD offset\` → load 32 bytes from memory[offset..offset+32], push to stack
- \`MSTORE offset value\` → write a 32-byte value from stack to memory[offset..offset+32]

(\`MSTORE8\` writes one byte. \`MCOPY\` does memory-to-memory copies.)

Two things that matter:

### 1. Memory grows on demand — and you pay for it

If you write to memory at offset 1000 and the current memory size is 64 bytes, the EVM **expands memory to cover offset 1000** before the write. The expansion costs gas, and it's **quadratic past 32 KB**:

\`\`\`
gas_cost(size_in_words) = 3 × words + words² / 512
\`\`\`

That's why long byte-array operations get expensive fast. A 1 MB memory expansion costs roughly 2 million gas just for the *space*, before you write anything.

### 2. Memory dies at the end of the frame

When \`CALL\` returns or \`STOP\` halts, memory is gone. The next call gets fresh, empty memory at offset 0.

## Calldata — the immutable input buffer

When you call a contract, the calldata is the input bytes — the function selector (4 bytes) plus ABI-encoded arguments. It's **read-only** and addressed from offset 0.

\`\`\`
CALLDATALOAD offset → load 32 bytes from calldata
CALLDATASIZE        → push the size of calldata
CALLDATACOPY        → copy calldata to memory
\`\`\`

Calldata reads are cheap and there's no expansion cost — it was already paid when the call was created.

## Storage — the permanent map

This is the most important store for understanding world-state.

**Each contract has its own storage**, modeled as a **map from \`U256\` keys to \`U256\` values**:

\`\`\`
storage[address]: HashMap<U256, U256>
\`\`\`

The keys are 32-byte words. The values are 32-byte words. There are no fixed slots — every key in the entire \`U256\` space is *virtually* there, defaulting to zero.

Two opcodes:

- \`SLOAD key\` → read storage[key], push to stack
- \`SSTORE key value\` → write value to storage[key]

### Cold vs warm — the gas trap

The first \`SLOAD\` of a given slot in a transaction is **cold** — 2100 gas.
Subsequent \`SLOAD\`s of the same slot in the same tx are **warm** — 100 gas.

Why? Because the actual implementation has to check whether the slot has been touched (a Merkle Patricia Trie lookup) on the first access; subsequent accesses are cached.

This is **EIP-2929**, retrofitted into Ethereum after attackers found that a contract calling \`SLOAD\` repeatedly on cold slots could DoS the network for cheap. The cold/warm distinction is the fix.

### How Solidity uses storage

Solidity assigns storage slots at compile time. \`uint256 private balance\` lives at slot 0, \`mapping(address => uint256) balances\` lives at \`keccak256(address . slot_index)\`, etc. Solidity is doing slot allocation **on top of** the raw \`U256 → U256\` map.

When Advanced lesson 3 (Database trait) shows you:

\`\`\`rust
fn storage(&mut self, address: Address, index: StorageKey)
    -> Result<StorageValue, Self::Error>;
\`\`\`

— that signature is **exactly the model above**. The trait says: "given a contract address and a slot key, give me the U256 value." That's the storage map.

## The world state — accounts everywhere

So far we've described one contract. The full Ethereum world state is a **map from address to account**:

\`\`\`
world_state: HashMap<Address, Account>

struct Account {
    nonce: u64,
    balance: U256,
    code_hash: B256,        // keccak256 of this account's bytecode (empty for EOAs)
    storage_root: B256,     // root of this contract's storage trie
}
\`\`\`

Every Ethereum account — yours, every contract, every wallet — is a row in this map. The interesting fields:

- **\`code_hash\`**: empty for externally-owned accounts (EOAs); points to a contract's bytecode otherwise
- **\`storage_root\`**: the Merkle root of *this contract's* storage map (the trie covered in Expert lessons)

When you make a transaction, you're updating this map: incrementing nonces, transferring balances, modifying contract storage.

In Revm's \`Database\` trait, \`fn basic(&mut self, address: Address)\` returns the \`Option<AccountInfo>\` for an address. That's a row lookup in this map.

## Putting it together

A single \`SSTORE\` you write in Solidity becomes:

1. Solidity computes the slot key (e.g., \`keccak256(msg.sender . 5)\`)
2. The compiler emits \`PUSH32 <key>\` then \`SSTORE\`
3. The EVM runs SSTORE: cold → 22100 gas (write + first-touch), warm → 5000 gas
4. The interpreter calls the \`Database\`'s storage-write path
5. The MPT for this contract gets updated, eventually changing \`storage_root\` in the account, eventually changing the global \`stateRoot\`

Five layers between your line of Solidity and the chain's state root. **All five are in the source you'll read in Advanced and Expert.**

## Reading list

1. **Open [evm.codes](https://www.evm.codes)** and find: MLOAD, MSTORE, SLOAD, SSTORE, CALLDATALOAD. Read their gas notes.
2. **Find a real Solidity contract on [Etherscan](https://etherscan.io)**, look at its bytecode, search for \`SLOAD\` (\`0x54\`) and \`SSTORE\` (\`0x55\`) bytes. They're everywhere.
3. **In Foundry**, write a contract with one \`uint256\` state var. Read it twice in one function. Measure gas with \`forge test --gas-report\`. The second read is roughly 2000 gas cheaper — that's cold-vs-warm in action.

## What you should walk away with

- Stack, memory, calldata, storage are **four different stores** with different lifetimes, costs, and APIs.
- **Storage** is a per-contract \`U256 → U256\` map — Solidity slot allocation is just packing on top of it.
- **The world state** is a \`Address → Account\` map; each Account points to its own storage trie.
- The Revm \`Database\` trait's three core methods (\`basic\`, \`code_by_hash\`, \`storage\`) **directly mirror** the world-state model above.

When Advanced lesson 3 shows you the \`Database\` trait, you'll recognize it as exactly this picture, expressed as Rust traits.`,
                },
                {
                  title: 'Gas accounting in depth, and call frames',
                  slug: 'gas-call-frames-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# Gas accounting in depth, and call frames

You know "gas costs money." This lesson goes one level deeper — into where gas actually goes, and how a single transaction can trigger a tree of nested **call frames** with separate context.

Both topics are assumed knowledge in Advanced lessons on custom opcodes, precompiles, and ExEx.

## Gas — three categories

Every transaction's gas budget is consumed in three ways:

### 1. Intrinsic gas — paid before any opcode runs

Just for *being* a transaction:

- **21,000 gas** flat fee per tx
- **Plus 4 gas per zero byte** of calldata
- **Plus 16 gas per non-zero byte** of calldata
- **Plus 32,000 gas** if it's a contract-creation tx

This is paid *before* the first opcode executes. If your tx doesn't have enough gas to even cover intrinsic, it doesn't make it into the block.

### 2. Per-opcode gas — fixed and dynamic

Most opcodes have a **fixed cost**: ADD = 3, MUL = 5, JUMP = 8, MLOAD = 3.

A few have **dynamic costs** that depend on context:

| Opcode | Why dynamic |
| :--- | :--- |
| \`SLOAD\` | Cold (2100) vs warm (100) — depends on whether the slot was touched in this tx |
| \`SSTORE\` | Cold-write, warm-write, write-from-zero, write-to-zero, all priced differently |
| \`CALL\` / \`CALLCODE\` / \`DELEGATECALL\` / \`STATICCALL\` | Depends on cold/warm of the called account, value transferred, account creation |
| \`EXP\` | More gas for larger exponents |
| \`KECCAK256\` | More gas for larger inputs |
| \`CALLDATACOPY\` / \`CODECOPY\` / \`MCOPY\` | More gas for larger copies |
| Memory-touching opcodes | Pay memory expansion gas if they grow memory |

### 3. Refunds — gas you get back

Some operations *refund* gas:

- **SSTORE that clears a slot** (writes zero to a non-zero slot): refunds 4800 gas
- **SELFDESTRUCT** (legacy, mostly removed in EIP-6780): refunds 24,000 gas

Refunds are capped at **gas_used / 5** (EIP-3529). You can't game the system by SSTORE-clearing a thousand slots in a tiny tx.

## OOG vs revert — they look similar, they're not

Both halt execution. The difference matters:

| | Out-Of-Gas | REVERT |
| :--- | :--- | :--- |
| **Gas remaining** | All consumed | Returned to caller |
| **State changes** | All reverted | All reverted |
| **Returndata** | Empty | Data from REVERT operand |
| **Caller sees** | "call failed, no data" | "call failed, with data" |

In a Solidity \`require(x, "msg")\`, the EVM emits \`REVERT\` with the encoded "msg" as returndata. In an arithmetic overflow under Solidity ≥ 0.8, the same — REVERT with a Panic(uint256) error code.

OOG is different. It happens when a frame runs out of gas mid-execution. The frame loses everything (state + remaining gas), and the caller sees a generic failure.

When Advanced lesson 1 shows you Revm's \`PrecompileHalt::OutOfGas\` vs other halts, this distinction is what's being modeled.

## Call frames — the EVM's call stack

A transaction starts with **one frame** — the top-level call from the EOA to a contract (or contract creation).

When that frame executes \`CALL\` (or \`DELEGATECALL\` / \`STATICCALL\` / \`CREATE\`), it spawns a **new frame**. The new frame has its own:

- Stack (fresh)
- Memory (fresh, empty)
- Calldata (the input bytes from the call opcode)
- PC (starts at 0 of the called contract's code)
- Gas budget (subset of the caller's remaining gas)

When the inner frame halts, control returns to the outer frame, which sees:

- The success/failure flag
- The returndata buffer
- The remaining gas (added back to the outer frame's budget)

This nesting can go up to **1024 levels deep** before the call stack overflows.

## The four call-style opcodes — who owns what

This is the table that confuses Solidity developers most:

| Opcode | \`address(this)\` inside | \`msg.sender\` inside | Storage you touch | Code you run |
| :--- | :--- | :--- | :--- | :--- |
| **\`CALL\`** | the called contract | the caller | the called contract's storage | the called contract's code |
| **\`STATICCALL\`** | same as CALL | same as CALL | same — but writes will revert | same as CALL |
| **\`DELEGATECALL\`** | the **caller** | the caller's caller | **the caller's** storage | the called contract's code |
| **\`CALLCODE\`** | (deprecated) | (deprecated) | (deprecated) | (deprecated) |

Three of these are alive in modern Ethereum. Read the table twice. The ones that matter for understanding bugs:

### CALL

Most common. \`A.foo()\` from contract \`X\`: a new frame runs A's code, sees A's storage, has \`msg.sender = X\`. Anything A writes goes to A's storage. **Storage and code align.**

### STATICCALL

Same shape as CALL but the inner frame is **forbidden from writing state** (SSTORE, LOG, CREATE, SELFDESTRUCT, CALL with value all halt with revert). Used for "view" calls — Solidity emits STATICCALL when you call a \`view\` function.

### DELEGATECALL

The dangerous one. **A's code runs in X's context.** That means: \`address(this)\` is X. \`msg.sender\` is X's caller. Storage reads/writes go to **X's storage, not A's**. Code is read from A.

This is how proxy patterns work (UUPS, Transparent Proxy, Diamond): the proxy contract (X) DELEGATECALLs into an implementation contract (A), so X's storage gets modified by A's logic.

It's also the source of many high-profile hacks — Wormhole, Parity multisig, etc. — because if A's storage layout doesn't match X's, writes corrupt X's state in unexpected slots.

When Advanced lesson 6 (ExEx) shows you "this transaction touched these storage slots across these accounts," knowing CALL vs DELEGATECALL is what lets you make sense of it.

## A real call graph

\`\`\`
EOA sends tx to contract X
│
├── X's code runs (frame 1)
│    │
│    ├── X.transfer() → CALL into contract Y
│    │    │
│    │    └── Y's code runs (frame 2, fresh memory/stack)
│    │          │
│    │          └── Y reads from Y.storage (using SLOAD)
│    │
│    ├── X uses STATICCALL into contract Z (a view function)
│    │    │
│    │    └── Z's code runs (frame 3, fresh, write-locked)
│    │
│    └── X DELEGATECALLs into contract W (an implementation)
│         │
│         └── W's code runs (frame 4) — but writes go to X's storage!
│
└── tx completes; receipts emitted with logs from all frames
\`\`\`

Every frame has its own memory/stack. Returndata flows back up at each return. Gas accounting tracks per-frame consumption.

## Reading list

1. **Open [evm.codes](https://www.evm.codes)** for CALL, DELEGATECALL, STATICCALL. Read the parameters (gas, address, value, argsOffset, argsSize, retOffset, retSize) — they're identical except DELEGATECALL/STATICCALL drop \`value\`.
2. **In Foundry**, deploy a tiny proxy + implementation pair. Use \`forge test -vvvv\` and watch the call trace — every CALL and DELEGATECALL is shown, with frame nesting visible.
3. **Look up [Wormhole hack post-mortem](https://www.coinbase.com/blog/decoding-the-wormhole-attack)** — the bug was DELEGATECALL semantics misunderstood. Reading the post-mortem with this lesson fresh makes the exploit obvious.

## What you should walk away with

- Gas comes in **three shapes**: intrinsic (per-tx), per-opcode (fixed and dynamic), and refunds (capped).
- **OOG and REVERT** look similar but differ on returndata and gas remaining.
- A tx is a **tree of call frames**, each with its own stack/memory/PC/gas.
- **DELEGATECALL** is the call style that runs the callee's code in the caller's context — the foundation of proxy patterns and the source of many bugs.

When Advanced lesson 5 (custom precompiles) talks about the gas pricing model, or lesson 6 (ExEx) talks about reorganizing across multiple committed transactions, you'll have the call-frame and gas model in your head — not as abstract concepts, but as concrete machinery.`,
                },
              ],
            },
          },
          {
            title: 'Block-level Ethereum',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Blocks, receipts, and reorgs',
                  slug: 'blocks-receipts-reorgs-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# Blocks, receipts, and reorgs

You've worked with one transaction at a time. The chain operates at a different level: **blocks** of transactions, **receipts** of what they did, and the occasional **reorg** when the chain rewrites recent history.

This is the layer Advanced lessons on Reth's Staged Sync and ExEx assume you understand.

## A block — three pieces

Every Ethereum block is conceptually three things bundled together:

| Piece | What it contains | Hashing |
| :--- | :--- | :--- |
| **Header** | Metadata: parent hash, state root, tx root, receipts root, gas limit, timestamp, etc. | The block's "identity" hash is keccak256(header) |
| **Body** | The actual list of transactions, ordered | Tx root in header is the Merkle root of this list |
| **Receipts** | One receipt per transaction: status, gas used, logs/events emitted | Receipts root in header commits to this list |

When you hear "block hash 0x123...", that's keccak256 of the *header* — the body and receipts are committed to *via* the header but aren't part of the hash directly.

### Why three roots in the header?

The header carries three Merkle roots: state, transactions, receipts. Each root commits to a different piece of the chain's data:

- **\`state_root\`**: the root of the world-state MPT *after* this block's transactions executed
- **\`transactions_root\`**: the root of an MPT of all txs in this block (so you can prove "tx X was in block N")
- **\`receipts_root\`**: the root of an MPT of all receipts (so you can prove "tx X emitted log Y")

A light client can verify any of these by holding only the header and walking a proof. (You'll see this in Expert.)

## Receipts and logs — the audit trail

Each transaction produces a **receipt**:

\`\`\`
struct Receipt {
    status: bool,           // success / failed
    cumulative_gas_used: u64,
    logs: Vec<Log>,
    bloom: BloomFilter,     // log filter for fast searches
}

struct Log {
    address: Address,       // emitting contract
    topics: Vec<B256>,      // up to 4, indexed
    data: Bytes,            // unindexed payload
}
\`\`\`

Two things matter:

### 1. Logs are how Solidity \`event\`s reach off-chain

When you write \`emit Transfer(from, to, amount)\` in Solidity, the EVM executes the \`LOG3\` opcode with:

- topic[0] = keccak256("Transfer(address,address,uint256)") — the event signature
- topic[1] = from (indexed param)
- topic[2] = to (indexed param)
- data = ABI-encoded amount (not indexed)

The log goes into the receipt. Indexers, MEV bots, and ExEx all consume these.

### 2. The bloom filter is a fast "did this block touch X?" check

Each block's receipts root has a 256-byte **bloom filter** that summarizes all log addresses and topics in the block. Light clients and indexers use it to quickly skip blocks that don't mention an address they care about — without downloading the full receipts.

When Advanced lesson 7 (MEV in practice) shows you ExEx code that filters logs by address, this bloom is what makes the pre-filter fast.

## How a block actually gets built

A typical block lifecycle:

\`\`\`
1. Block proposer (validator) gets selected for slot N
2. Proposer collects pending txs from mempool (or builders)
3. For each tx (in order):
   a. Open a frame, run the EVM
   b. Update world state on success, revert on failure
   c. Append receipt
4. Compute roots: state_root, transactions_root, receipts_root
5. Compute bloom filter from logs
6. Build header with all roots + parent_hash + timestamp + ...
7. Sign and propagate
\`\`\`

The full node executing this block performs **the same execution** to verify — it gets the body, runs every tx, and checks that the resulting state_root matches the header. If it doesn't, the block is rejected.

When you read Reth's \`ExecutionStage\` in Advanced lesson 4, that's exactly the verification path: replay each block's transactions, accumulate state changes, validate the resulting root.

## Reorgs — the chain rewriting itself

Most of the time the chain extends linearly:

\`\`\`
... → block 100 → block 101 → block 102 → block 103
\`\`\`

But sometimes two validators propose blocks for the same slot, or a network partition heals, and the **canonical chain switches**. A few blocks at the tip get *unwound*, and the chain re-extends along a different path:

\`\`\`
                                    ┌─→ 102b → 103b   (new canonical)
... → 100 → 101 → 102a → 103a ──────┘
                  └────────── unwound (no longer canonical)
\`\`\`

This is a **reorg**. From the node's perspective:

1. New chain segment arrives, longer or with more attestations than current
2. Walk back to the common ancestor (block 101 in the example)
3. **Unwind** state changes from 102a, 103a (in reverse order)
4. **Apply** state changes from 102b, 103b
5. New canonical tip is 103b

In modern Ethereum (post-Merge PoS), reorgs **deeper than 1-2 blocks are rare** but happen. Validators reorganize around missed proposals or equivocations.

### What this means for off-chain consumers

If you wrote an indexer that listened to "block N committed, write txs to my DB," and then block N got reorged:

- Your DB now has rows for transactions that **never happened on the canonical chain**
- You need to **delete those rows** when the reorg is detected
- Then re-insert rows for the new canonical block N's transactions

This is **the** reason ExEx has three notification types — \`ChainCommitted\`, \`ChainReorged\`, \`ChainReverted\`. A naive indexer that handles only \`ChainCommitted\` corrupts its derived state on every reorg. (Advanced lesson 6 walks through this in detail.)

### Why Reth's Staged Sync is symmetric

Every Reth Stage has \`execute\` (forward) and \`unwind\` (backward). The stages aren't designed for reorgs as a "special case" — reorgs are a **normal mode of operation**, modeled with the same trait. Going forward 1000 blocks: \`execute\`. Going back 3 blocks for a reorg: \`unwind\`. Same code path, opposite direction.

This is a design choice you'll appreciate in Advanced lesson 4 (Staged Sync architecture).

## Reading list

1. **Find a real block on [Etherscan](https://etherscan.io)**. Click "Click to see More" on the header to see all the fields. Find: parentHash, stateRoot, transactionsRoot, receiptsRoot, logsBloom.
2. **Open one of its transactions**, look at the Logs tab. Each log has an Address, Topics, and Data — that's the structure above.
3. **For a sense of how reorgs look in production**, search "reorg" on [reth.rs blog](https://reth.rs/) or any Ethereum client release notes — operators care a lot about reorg-handling correctness.

## What you should walk away with

- A **block** is header + body + receipts; the header carries three Merkle roots committing to state, txs, and receipts.
- **Receipts** capture each tx's status, gas, and logs (Solidity \`event\`s become logs via the LOG opcodes).
- **Reorgs** rewrite recent history; off-chain consumers must handle the rewind explicitly.
- Reth's Staged Sync is **symmetric** (execute / unwind) precisely because reorgs are normal, not exceptional.

When Advanced lesson 4 walks through the Stage trait and lesson 6 walks through ExEx notification types, you'll already have the model in your head. You'll just be reading the Rust that implements it.`,
                },
              ],
            },
          },
          {
            title: 'Rust for source-reading',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'Generics, trait bounds, ?Sized, dyn vs impl',
                  slug: 'rust-generics-traits-bounds-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 30,
                  content: `# Generics, trait bounds, ?Sized, dyn vs impl

This is the lesson that lets you read \`pub fn add<IT: ITy, H: ?Sized>(...)\` without flinching. Reth and Revm source code is **dense with generics** — function signatures with three type parameters and trait bounds aren't unusual. This lesson goes through every piece of that machinery.

## Generics 101 — the basic shape

A generic function takes a **type parameter** in angle brackets, then uses it like an ordinary type:

\`\`\`rust
fn first<T>(items: &[T]) -> Option<&T> {
    items.first()
}

let nums = [1, 2, 3];
let first_num = first(&nums);          // T inferred as i32

let words = ["hello", "world"];
let first_word = first(&words);        // T inferred as &str
\`\`\`

The compiler **monomorphizes** — it generates a specialized copy of \`first\` for each concrete \`T\` you call it with. \`first::<i32>\` and \`first::<&str>\` are two separate functions in the compiled binary, both with zero runtime cost vs hand-written non-generic code.

## Trait bounds — "T must support these operations"

Plain \`<T>\` says "T can be anything." Often you need to *do* something with T — call a method, compare, format. That's where **trait bounds** come in:

\`\`\`rust
use std::fmt::Display;

fn print_first<T: Display>(items: &[T]) {
    if let Some(first) = items.first() {
        println!("{}", first);          // requires T: Display
    }
}
\`\`\`

\`<T: Display>\` reads as "T must implement the Display trait." Without it, the compiler refuses — it doesn't know that T has a \`{}\` formatter.

Multiple bounds with \`+\`:

\`\`\`rust
fn process<T: Display + Clone>(item: T) {
    let copy = item.clone();
    println!("{} (cloned: {})", item, copy);
}
\`\`\`

## \`where\` clauses — same thing, different syntax

When bounds get long, they move below the signature:

\`\`\`rust
fn process<T>(item: T)
where
    T: Display + Clone + Send + 'static,
{
    // body
}
\`\`\`

This is purely cosmetic. \`<T: Bound>\` and \`where T: Bound\` mean the exact same thing. Reth code uses both styles depending on length.

## Sized — the implicit bound you didn't know about

Every type parameter \`T\` in Rust has an **implicit \`Sized\` bound**. That is, \`<T>\` is silently \`<T: Sized>\`. \`Sized\` means "the compiler knows the type's size at compile time."

Most types are Sized: \`i32\` is 4 bytes, \`String\` is 24 bytes (pointer + length + capacity), your custom struct has a known size.

Some types are **not Sized**:

- \`str\` (the bare string type, not \`&str\`) — its length depends on what's in it
- \`[i32]\` (a bare slice type, not \`&[i32]\`) — same
- \`dyn Trait\` (we'll get to this) — the underlying concrete type can be anything

When you say \`<T: ?Sized>\`, you're **opting out of the implicit Sized bound**. T is now allowed to be unsized. The \`?\` is "maybe Sized, maybe not."

Why would you do this? Because **\`&T\`** and **\`Box<T>\`** can hold unsized types if T is \`?Sized\`. Without \`?Sized\`, you can never write \`fn foo<T>(x: &T)\` and pass a \`&dyn Trait\` to it — the compiler enforces \`T: Sized\` and \`dyn Trait\` doesn't satisfy it.

When Revm writes:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
\`\`\`

The \`H: ?Sized\` is *exactly* so that \`H\` can be \`dyn Host\`. The function works for both \`&MyConcreteHost\` (Sized) and \`&mut dyn Host\` (unsized, \`?Sized\`).

**This single character (\`?\`) decides whether the function accepts trait objects.**

## \`dyn Trait\` — the trait object

\`dyn Trait\` is a **trait object**. It's a "pointer + vtable" pair:

- The pointer points to the concrete value
- The vtable is a table of function pointers — one for each method of the trait

When you call \`obj.method()\` on a \`dyn Trait\`, the compiler emits a **vtable lookup**: load the method pointer from the vtable, call it indirectly. This is **dynamic dispatch** — resolved at runtime.

\`dyn Trait\` itself is unsized (the concrete type behind the pointer can be any size). So you always see it behind some pointer:

\`\`\`rust
&dyn Trait        // shared reference
&mut dyn Trait    // exclusive reference
Box<dyn Trait>    // owned, heap-allocated
Rc<dyn Trait>     // shared ownership, single-threaded
Arc<dyn Trait>    // shared ownership, thread-safe
\`\`\`

A vector of mixed implementations:

\`\`\`rust
trait Greet { fn greet(&self); }
struct En; struct Ja;
impl Greet for En { fn greet(&self) { println!("Hi"); } }
impl Greet for Ja { fn greet(&self) { println!("こんにちは"); } }

let mixed: Vec<Box<dyn Greet>> = vec![Box::new(En), Box::new(Ja)];
for g in &mixed { g.greet(); }
\`\`\`

Without \`dyn\`, this is impossible — \`Vec<T>\` requires all elements be the same concrete type.

## \`impl Trait\` — the static counterpart

\`impl Trait\` looks similar but is fundamentally different:

\`\`\`rust
fn make_greeter(lang: &str) -> impl Greet {
    if lang == "ja" { Ja } else { En }
    // ❌ won't compile — return type must be a single concrete type
}
\`\`\`

\`impl Trait\` in return position means "I return *some specific type* that implements Trait, but I'm hiding it from the caller." It's **static dispatch** — the compiler picks one type, monomorphizes, no vtable.

The trade-off:

| | \`impl Trait\` | \`dyn Trait\` |
| :--- | :--- | :--- |
| **Dispatch** | Static (compile-time) | Dynamic (runtime vtable) |
| **Speed** | Faster (inlinable) | Slightly slower (one indirect call) |
| **Heterogeneous collections** | ❌ no | ✅ yes (Vec<Box<dyn Trait>>) |
| **Object safety** | Doesn't matter | Required (some traits aren't object-safe) |

Reth and Revm use **both**, with \`impl\` as the default and \`dyn\` reserved for cases where heterogeneity matters (lists of stages, plug-in points).

## Object safety — when \`dyn Trait\` doesn't compile

A trait must be **object safe** to be used as \`dyn Trait\`. The rules are subtle, but the most common gotcha:

- **No generic methods** in the trait (other than over lifetimes)
- **No \`Self\` returns** in methods other than \`Self: Sized\` ones
- **No associated constants**

If you try \`Box<dyn MyTrait>\` and the trait isn't object-safe, you'll get a compile error like "cannot be made into an object." The fix is usually adding \`where Self: Sized\` to the offending method, or splitting the trait.

You won't hit this often as a *consumer* of Reth/Revm code, but it explains why some traits in the source aren't \`dyn\`-able.

## Putting it together — reading a real signature

Back to:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
\`\`\`

Now you can read it word by word:

- \`pub fn add\` — public function named \`add\`
- \`<IT: ITy, H: ?Sized>\` — two type parameters:
  - \`IT\` must implement the \`ITy\` trait (interpreter-types marker — concrete vs traced vs sandboxed)
  - \`H\` is allowed to be unsized (so it can be \`dyn Host\`)
- \`context: Ictx<'_, H, IT>\` — takes a context parameterized by both
- \`-> Result\` — returns a Result

Same function, **two specialization paths**: one for \`(ConcreteIT, ConcreteHost)\` (fully monomorphized, fastest), one for \`(ConcreteIT, dyn Host)\` (vtable for Host calls). The \`?Sized\` is what enables the second path.

This is **why Revm is "modular":** the same opcode function compiles into multiple binaries for different execution modes, with the dispatch decided at the type-system level instead of via runtime branches.

## Reading list

1. **Rust Book chapters 10 (Generics, Traits, Lifetimes), 17 (Trait Objects)** — open them, even if just to skim the section headings. Free reference.
2. **Find any function in \`reth/crates\` with three or more type parameters.** Read the signature. You should now be able to translate every piece into "what concrete shapes is this function valid for."
3. **Try this thought experiment:** if you removed \`?Sized\` from \`H\` in the \`add\` signature, what concrete error would the compiler give a caller passing \`&mut dyn Host\`? (Answer: "the trait \`Sized\` is not implemented for \`dyn Host\`.")

## What you should walk away with

- **Generics + bounds** are the Rust analog of "interface" or "concept": "T is whatever, but it must support these operations."
- **\`Sized\` is implicit** on every type parameter; \`?Sized\` opts out so the parameter can be a trait object.
- **\`dyn Trait\`** is a runtime-dispatched pointer-plus-vtable; **\`impl Trait\`** is compile-time monomorphized.
- Revm's heavy use of generics is **modularity at the type level** — same code, multiple specializations.

When Advanced lesson 1 hits you with three type parameters and \`?Sized\` in the very first line, you'll read it as one connected sentence, not as five intimidating tokens.`,
                },
                {
                  title: 'Shared ownership: Arc, Mutex, RwLock',
                  slug: 'rust-shared-ownership-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# Shared ownership: Arc, Mutex, RwLock

Rust's "one owner" rule is sharp — and helpful 90% of the time. The other 10%, you need **multiple parts of the program to hold the same value**, possibly across threads, possibly with mutation. That's what this lesson is about.

Reth and ExEx code is **densely sprinkled with \`Arc\` and \`Mutex\`**. Without this lesson those wrappers feel like noise. With it, they're the load-bearing pieces of how Reth shares state across async tasks.

## The problem — why ownership isn't enough

Imagine an indexer that:

- Receives every new block from the chain (one task)
- Lets the RPC server query its current state (many tasks)
- Periodically snapshots state to disk (one task)

All three need access to the same in-memory state. Plain Rust ownership says "one owner" — but here we *need* shared access.

Two questions to answer:

1. **Who owns the value?** Multiple places.
2. **Who can mutate it?** It depends.

## Arc — multiple owners, immutable shared

\`Arc<T>\` ("Atomically Reference-Counted") lets multiple owners share a value, with the value freed when the last owner drops it.

\`\`\`rust
use std::sync::Arc;

let data = Arc::new(String::from("hello"));
let clone1 = Arc::clone(&data);   // refcount: 1 → 2
let clone2 = Arc::clone(&data);   // refcount: 2 → 3

std::thread::spawn(move || {
    println!("{}", clone1);       // can move into another thread
});
println!("{}", clone2);
// clone2 dropped → refcount: 3 → 2
// clone1 dropped (in spawned thread) → refcount: 2 → 1
// data dropped → refcount: 1 → 0 → memory freed
\`\`\`

Two important properties:

### \`Arc::clone\` is cheap

\`Arc::clone(&x)\` does **not** deep-copy the inner T. It only:

1. Atomically increments a counter
2. Returns a new pointer to the same heap allocation

Cost: one atomic add. The inner T isn't touched. This is why you'll see \`Arc::clone(&shared_state)\` everywhere in Reth — it's effectively free.

### Arc gives you read-only sharing

Through an \`Arc<T>\`, you can only call \`&self\` methods on T. **You cannot mutate.** That's by design — multiple threads holding the same \`Arc<T>\` can't simultaneously read and write without synchronization, and Rust enforces this at the type level.

If you need mutation, wrap T in a \`Mutex\` or \`RwLock\` first.

### Arc vs Rc

\`Rc<T>\` is the same shape but **single-threaded**. It uses a regular (non-atomic) counter, which is faster but unsound across threads. Reth and ExEx use \`Arc\` exclusively — they're multi-threaded by design.

## Mutex — exclusive read/write access

\`Mutex<T>\` wraps a value with a lock. To read or write, you must \`lock()\` first:

\`\`\`rust
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0u64));

let c = Arc::clone(&counter);
std::thread::spawn(move || {
    let mut guard = c.lock().unwrap();   // acquire lock
    *guard += 1;                          // mutate
    // guard dropped here → lock released
});
\`\`\`

\`lock()\` returns a \`MutexGuard<T>\` — a smart pointer that:

- **Implements \`Deref\`** so you can use it like \`&T\` (reading) or \`&mut T\` (writing)
- **Releases the lock when dropped** (RAII pattern — no manual unlock)
- **Blocks the calling thread** if another thread already holds the lock

### What \`.unwrap()\` panics on — poisoning

You'll see \`.lock().unwrap()\` everywhere. Why \`unwrap\`?

Because \`lock()\` returns \`Result<MutexGuard, PoisonError>\`. The error case is **mutex poisoning** — if a thread holds the lock and panics, the mutex is marked "poisoned" so subsequent lockers know the data might be inconsistent.

Most Reth code chooses to propagate (panic on) poisoning rather than handle it specially. \`.unwrap()\` is the right call when you can't reason about partial-update inconsistency.

If you ever see \`Mutex\` poisoning in your own logs, **the underlying bug is the original panic**, not the lock — find what panicked and fix that.

### The pattern: \`Arc<Mutex<T>>\`

You'll see this combination constantly:

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

\`Arc\` provides the multi-owner pointer; \`Mutex\` provides the mutation safety. Together: thread-safe shared mutable state.

## RwLock — many readers OR one writer

\`Mutex\` is exclusive — only one thread at a time, even for reads. That's wasteful when reads vastly outnumber writes.

\`RwLock<T>\` allows:

- **Many concurrent readers** (\`.read()\`)
- **Or one exclusive writer** (\`.write()\`)
- Never both at the same time

\`\`\`rust
use std::sync::{Arc, RwLock};

let cache = Arc::new(RwLock::new(HashMap::<String, u64>::new()));

// Many threads can read simultaneously
let c = Arc::clone(&cache);
std::thread::spawn(move || {
    let guard = c.read().unwrap();      // shared read access
    if let Some(v) = guard.get("key") {
        println!("{}", v);
    }
});

// One thread writes (blocks all readers and other writers)
let c2 = Arc::clone(&cache);
std::thread::spawn(move || {
    let mut guard = c2.write().unwrap();
    guard.insert("key".to_string(), 42);
});
\`\`\`

When to choose:

| Pattern | Choose |
| :--- | :--- |
| 50/50 reads and writes | \`Mutex\` (simpler) |
| Many reads, few writes (caches, config) | \`RwLock\` |
| Tight write-only inner loop | \`Mutex\` |
| Single-threaded | Neither — just use \`RefCell\` |

\`RwLock\` is slightly heavier than \`Mutex\` for the writer (more bookkeeping), so don't reach for it unless reads dominate.

## The async story — \`tokio::sync::Mutex\`

Standard \`std::sync::Mutex\` is **synchronous**: \`.lock()\` blocks the OS thread. In an async context (Tokio), blocking the thread is bad — it starves other tasks on the same worker.

For async code, use \`tokio::sync::Mutex\`:

\`\`\`rust
use tokio::sync::Mutex;
let m = Arc::new(Mutex::new(0u64));

let m_clone = Arc::clone(&m);
tokio::spawn(async move {
    let mut guard = m_clone.lock().await;   // .await, not .unwrap()
    *guard += 1;
});
\`\`\`

The differences:

- \`.lock()\` returns a Future — you \`.await\` it
- The task **yields** to the runtime while waiting (doesn't block the worker)
- No poisoning concept (panicking inside an async task is handled by Tokio)

Reth uses both: \`std::sync::Mutex\` for fast critical sections that won't span an \`.await\`, \`tokio::sync::Mutex\` for guarded state shared across awaits.

**The rule of thumb**: if your critical section contains an \`.await\`, use \`tokio::sync::Mutex\`. Otherwise \`std::sync::Mutex\` is fine and slightly faster.

## A real Reth pattern — sharing a database handle

A simplified version of how Reth shares its database across tasks:

\`\`\`rust
struct Node {
    db: Arc<Database>,                     // shared, immutable handle
    blockchain_tree: Arc<RwLock<Tree>>,    // shared, mostly read
    metrics: Arc<Mutex<MetricsCollector>>, // shared, write-heavy
}

impl Node {
    fn spawn_indexer(&self) {
        let db = Arc::clone(&self.db);
        let metrics = Arc::clone(&self.metrics);
        tokio::spawn(async move {
            // db: read-only access through Arc, no lock needed
            // metrics: lock to update counters
            metrics.lock().unwrap().increment("blocks_indexed");
        });
    }
}
\`\`\`

Three different sharing patterns in one struct. **Each choice is deliberate** — the lock granularity matches the access pattern.

When you read Reth source and see \`Arc<RwLock<Foo>>\` next to \`Arc<Mutex<Bar>>\`, the author has thought about which one is right. Now you can read those decisions.

## Reading list

1. **Rust Book chapter 16 (Fearless Concurrency)** — read the section on \`Arc\` and \`Mutex\`.
2. **\`tokio::sync\` docs** — skim the page for \`Mutex\`, \`RwLock\`, \`broadcast\`, \`oneshot\`. Each maps to a real pattern in Reth's task code.
3. **Search Reth source for \`Arc<RwLock\`** and \`Arc<Mutex\`. Pick a couple. The choice between them is always intentional — try to explain why.

## What you should walk away with

- **\`Arc<T>\`** is multi-owner, immutable, cheap to clone (one atomic add).
- **\`Mutex<T>\`** is exclusive (one reader-or-writer at a time), and \`.lock()\` blocks the thread.
- **\`RwLock<T>\`** is many-reader OR one-writer — use when reads dominate.
- **\`tokio::sync::Mutex\`** is the async-aware version — use when the critical section spans \`.await\`.
- **\`Arc<Mutex<T>>\`** is the canonical "shared mutable state" pattern — you'll see it everywhere in Reth/ExEx.

When Advanced lesson 6 (ExEx) shows you a struct with three \`Arc<...>\` fields and you wonder "why all the wrappers," you'll know each one is the load-bearing piece of how that component is shared across the runtime's tasks.`,
                },
                {
                  title: 'unsafe Rust',
                  slug: 'rust-unsafe-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 10,
                  xpReward: 20,
                  content: `# unsafe Rust

One of two areas where the standard Rust book is *thin*, and where Revm's interpreter goes *deep*. This lesson gives you enough vocabulary to read Revm's hot path without flinching at \`unsafe { ... }\` blocks. (The other area — \`macro_rules!\` — is the next lesson; together they're what you need to read \`popn_top!\` and friends.)

## What \`unsafe\` actually allows

Rust's safety guarantees (no data races, no use-after-free, no out-of-bounds access) are enforced by the compiler — but only over **safe Rust**. There are five things only \`unsafe\` code can do:

1. **Dereference a raw pointer** (\`*const T\` or \`*mut T\`)
2. **Call an \`unsafe fn\`** (a function the compiler can't verify)
3. **Access or modify a mutable static variable**
4. **Implement an \`unsafe trait\`** (like \`Send\` or \`Sync\` manually)
5. **Access fields of a \`union\`**

That's *the entire list*. Crucially, \`unsafe\` doesn't turn off Rust's borrow checker for your local variables, doesn't allow null pointer derefs *automatically*, and doesn't let you skip type-checking.

## The contract — what \`unsafe\` *does*

\`unsafe\` is a **promise from you to the compiler**: "I have manually verified that this code maintains Rust's safety invariants. You can trust me."

If the promise is wrong, you get **undefined behavior (UB)** — and UB is *catastrophic*. Once UB happens, the entire program is in an inconsistent state. The compiler may have optimized assuming UB doesn't happen, so the actual runtime behavior can be anything: crashes, wrong results, security holes, plausible-looking-but-wrong output.

**There is no "small UB."** A program with UB is wrong, full stop.

## Why Revm uses \`unsafe\` on the hot path

Revm's \`popn_top!\` macro from Advanced lesson 1 contains:

\`\`\`rust
let ([$( $x ),*], $top) = unsafe {
    $crate::interpreter_types::StackTr::popn_top(&mut $interpreter.stack)
        .unwrap_unchecked()
};
\`\`\`

The function being called returns \`Option<...>\`. \`unwrap_unchecked()\` is **the unsafe version of \`unwrap()\`** — it skips the runtime "is this Some?" check.

Why is this safe here? Because the **immediately preceding code** is:

\`\`\`rust
if $interpreter.stack.len() < (1 + $crate::_count!($($x)*)) {
    return Err(...);
}
\`\`\`

So at the moment of \`unwrap_unchecked()\`, the stack length is **provably** sufficient. The author has verified by inspection that \`popn_top\` will return \`Some\`. Calling \`.unwrap()\` would do a redundant runtime check; \`.unwrap_unchecked()\` skips it.

The cost saved: one branch per opcode execution. On the hot path of an interpreter that runs billions of times, that's measurable.

## The \`unsafe\` discipline in Revm/Reth

Idiomatic \`unsafe\` use looks like this:

\`\`\`rust
// Comment block explaining the safety invariant
// SAFETY: We just checked stack.len() >= N+1 above, so popn_top
// is guaranteed to return Some.
let result = unsafe { popn_top.unwrap_unchecked() };
\`\`\`

Every \`unsafe\` block in well-written Rust has a **\`// SAFETY:\` comment** describing why the unsafe is sound. Reviewers look for these; their absence is a code smell.

## \`unsafe fn\` vs \`unsafe { ... }\`

Two related but different concepts:

| Form | Meaning |
| :--- | :--- |
| \`unsafe { ... }\` block | "I'm doing one of the 5 unsafe things, and I've verified the invariants" |
| \`unsafe fn foo(...)\` | "Calling this function requires unsafe — the *caller* must verify invariants" |

\`unwrap_unchecked()\` is an \`unsafe fn\`. To call it, you wrap the call site in \`unsafe { ... }\`. That's the contract: the function declares "I have a precondition," the caller declares "I've checked it."

## What you do NOT need to know yet

- Manual implementation of \`Send\` / \`Sync\` (Reth doesn't really do this)
- Inline assembly (almost never)
- FFI to C (only relevant for jemalloc, which is one global setting)

For reading Revm/Reth source, **the patterns above (manual safety verification + \`unwrap_unchecked\` after a check) are 95% of what you'll see**.

## What you should walk away with

- **\`unsafe\`** allows 5 specific things; it's a *contract* with the compiler, not a license
- **\`unwrap_unchecked()\`** + a preceding length/state check is the canonical Revm pattern for skipping redundant runtime checks on the hot path
- The **\`// SAFETY:\` comment** discipline — every \`unsafe\` block in well-written Rust documents the invariant that justifies it

The next lesson covers \`macro_rules!\`, the other half of what you need to read Revm's interpreter source.`,
                },
                {
                  title: 'macro_rules! basics',
                  slug: 'rust-macros-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 20,
                  content: `# macro_rules! basics

The other of two areas where the standard Rust book is *thin*. The previous lesson covered \`unsafe\`; this one covers \`macro_rules!\`. Together they're what you need to read Revm's hot-path source — \`popn_top!\`, \`gas!\`, and the rest.

Revm's interpreter is **dense with macros**. \`popn_top!\`, \`gas!\`, \`push!\`, \`as_usize_or_fail!\` — these aren't function calls, they're compile-time text expansions. Reading them requires knowing the syntax.

## The basic shape

A \`macro_rules!\` macro is **pattern → expansion**. The pattern matches caller syntax; the expansion produces code:

\`\`\`rust
macro_rules! square {
    ($x:expr) => {
        $x * $x
    };
}

let n = square!(3 + 4);    // expands to: (3 + 4) * (3 + 4) → 49
\`\`\`

The \`$x:expr\` part declares a **metavariable** \`$x\` that matches any expression. \`expr\` is a **fragment specifier** telling the parser what kind of syntax to expect.

## Common fragment specifiers

| Specifier | Matches |
| :--- | :--- |
| \`expr\` | Any Rust expression |
| \`ident\` | An identifier (variable name, function name) |
| \`tt\` | A single token tree (the most flexible) |
| \`stmt\` | A statement |
| \`pat\` | A pattern (in match arms, let bindings) |
| \`ty\` | A type |
| \`block\` | A \`{ ... }\` block |

For reading source, \`expr\` and \`ident\` and \`tt\` cover most cases.

## Repetition: \`$( ... ),*\`

Macros can match **lists** with repetition syntax:

\`\`\`rust
macro_rules! print_all {
    ( $( $x:expr ),* ) => {
        $(
            println!("{}", $x);
        )*
    };
}

print_all!(1, "hello", 3.14);
// expands to:
// println!("{}", 1);
// println!("{}", "hello");
// println!("{}", 3.14);
\`\`\`

Reading the syntax:

- \`$( ... )\` declares a repetition group
- \`,*\` says "separated by commas, zero or more times" (use \`,+\` for one or more)
- Inside the expansion, \`$( ... )*\` repeats the body once per match

## Reading Revm's \`popn_top!\`

Now armed with the basics:

\`\`\`rust
macro_rules! popn_top {
    ([ $($x:ident),* ], $top:ident, $interpreter:expr) => {
        // ... body
    };
}
\`\`\`

Translation:

- The pattern starts with \`[\`, then \`$($x:ident),*\` (a comma-separated list of identifiers), then \`]\`
- Then a comma, then \`$top:ident\` (one identifier)
- Then a comma, then \`$interpreter:expr\` (an expression)

So calling \`popn_top!([op1], op2, ctx.interpreter)\` matches with:

- \`$x\` = list of one identifier: \`op1\`
- \`$top\` = \`op2\`
- \`$interpreter\` = \`ctx.interpreter\`

Calling \`popn_top!([a, b, c], top, ctx.interpreter)\` would have \`$x\` as a list of three.

The expansion uses \`$($x),*\` to expand the same list of identifiers into the destructuring pattern.

## Macro hygiene — why a macro can't pollute your scope

\`macro_rules!\` macros are **hygienic**: variable names introduced inside a macro don't conflict with variables in the caller's scope.

\`\`\`rust
macro_rules! double {
    ($e:expr) => {{
        let temp = $e;       // 'temp' inside macro
        temp * 2
    }};
}

let temp = "important";      // 'temp' in caller
let n = double!(5);          // expands without breaking the caller's 'temp'
println!("{}", temp);        // still "important"
\`\`\`

Hygiene is a feature of \`macro_rules!\` (and a major reason it's preferred over C-style macros).

## \`macro_rules!\` vs \`proc_macro\`

You'll meet both. Quick distinction:

| | \`macro_rules!\` | proc-macro |
| :--- | :--- | :--- |
| **Defined as** | Pattern-matching rules | Rust function in a separate \`proc-macro\` crate |
| **Operates on** | Token trees (literal syntax) | TokenStream (compiler's parsed representation) |
| **Power** | Limited but enough for most things | Arbitrary code generation |
| **Examples** | \`vec!\`, \`println!\`, \`popn_top!\`, \`gas!\` | \`#[derive(Serialize)]\`, \`sol!\`, \`address!\`'s underlying \`hex!\` |

\`macro_rules!\` covers most of what Revm's interpreter uses. \`sol!\` and the heavy proc-macros are an Expert-tier topic.

## Putting it together

When you open \`revm/crates/interpreter/src/instructions/macros.rs\` in Advanced lesson 1, you'll see:

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

You can now read it word by word:

- \`macro_rules!\` — declarative macro definition
- Pattern \`([ $($x:ident),* ], $top:ident, $interpreter:expr)\` — destructure caller arguments
- Body: a length check, then an \`unsafe { ... }\` block calling \`unwrap_unchecked()\` because the length was just verified
- The \`SAFETY\` reasoning is the length check — the comment is implicit (Revm sometimes elides them on tight code)

You're not reading magic. You're reading **patterns you now know**.

## Reading list

1. **Rust Book chapter 19.5 (Macros)** — concise. Read once, refer back as needed.
2. **The Little Book of Rust Macros** ([danielkeep.github.io](https://danielkeep.github.io/tlborm/book/index.html)) — free, the best macro-by-example reference.

## What you should walk away with

- **\`macro_rules!\`** matches token patterns and expands to code at compile time
- Fragment specifiers (\`$x:expr\`, \`$x:ident\`, \`$x:tt\`) declare what kind of syntax each metavariable matches
- Repetition syntax \`$( ... ),*\` lets one pattern match a list of arguments
- **Hygiene** prevents macros from polluting caller scope
- **proc-macros** are the heavier sibling — separate crate, operates on TokenStream — covered in Expert

## Course complete — next steps

You've now finished **Reading the Stack — Bridge to Advanced**:

- ✓ EVM at the bytes level (dispatch loop, stores, gas, call frames)
- ✓ Block-level Ethereum (blocks, receipts, reorgs)
- ✓ Rust for source-reading (generics, dyn, Arc, unsafe, macros)

When you open Advanced lesson 1, you'll see:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

And every piece of it should now read like one connected sentence:

- The signature: two type parameters, one of them \`?Sized\` so it can be \`dyn Host\`
- The macro call: pop 1, get a mutable ref to the new top, with the unsafe \`unwrap_unchecked\` justified by an internal length check
- The arithmetic: \`wrapping_add\` because EVM \`ADD\` is mod 2²⁵⁶

You're ready. Start Advanced.`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
