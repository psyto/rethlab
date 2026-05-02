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
        ],
      },
    },
  });
}
