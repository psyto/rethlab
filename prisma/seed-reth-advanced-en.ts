import { PrismaClient } from '@prisma/client';

export async function seedRethAdvancedEN(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'advanced', 'exex', 'opcode'];

  await prisma.course.create({
    data: {
      slug: 'reth-advanced-en',
      title: 'Reth Advanced — Inside Revm and ExEx',
      description:
        'Read the Revm interpreter, learn how custom opcodes and the Database trait work, and pick up Reth Staged Sync and Execution Extensions (ExEx) — the path to building your own EVM infrastructure.',
      difficulty: 'ADVANCED',
      duration: 180,
      xpReward: 350,
      track: 'reth-advanced',
      tags,
      isPublished: true,
      sortOrder: 300,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Inside Revm',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Reading the interpreter',
                  slug: 'revm-interpreter-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 30,
                  content: `# Reading the interpreter

We're going inside [\`bluealloy/revm\`](https://github.com/bluealloy/revm). The folder that matters is \`crates/interpreter\` — that's where every EVM opcode is implemented in Rust.

## Layout

\`\`\`
revm/
├── crates/
│   ├── interpreter/        ← we are here
│   │   ├── src/
│   │   │   ├── instructions/
│   │   │   │   ├── arithmetic.rs   ← ADD, MUL, SUB, ...
│   │   │   │   ├── stack.rs        ← PUSH, POP, DUP, SWAP
│   │   │   │   ├── memory.rs       ← MLOAD, MSTORE, ...
│   │   │   │   ├── macros.rs       ← gas!, popn_top!, push! ...
│   │   │   │   └── ...
│   │   │   └── interpreter.rs
│   ├── primitives/         ← Address, U256, B256
│   ├── database-interface/ ← the Database trait
│   ├── precompile/         ← built-in precompiles
│   └── ...
\`\`\`

## The real \`add\` opcode

Pulled from [\`crates/interpreter/src/instructions/arithmetic.rs\`](https://github.com/bluealloy/revm/blob/main/crates/interpreter/src/instructions/arithmetic.rs):

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

Three lines. But every detail matters:

### 1. \`<IT: ITy, H: ?Sized>\`
Two generics:
- \`IT\` is an **interpreter-types** marker — concrete vs traced vs sandboxed (Inspector). The same \`add\` works for all three.
- \`H: ?Sized\` is the **Host** trait, the callback into the outer environment (state reads, gas refund, log emission). \`?Sized\` lets you pass a \`&mut dyn Host\`.

This is why "modular" is more than marketing. One ADD, all execution modes.

### 2. \`popn_top!([op1], op2, context.interpreter)\`

That's a macro. Its real definition lives in \`instructions/macros.rs\`:

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

What this does:
- \`stack.len()\` check ensures we have at least \`N+1\` items
- On underflow → \`cold_path()\` hints the CPU's branch predictor that the error path is rare → straight-line code stays hot
- On the happy path, we use \`unwrap_unchecked()\` (in \`unsafe\`) because the length was just checked. **No double-checking, no panic machinery on the hot path.**

This is performance engineering at the cycle level.

### 3. \`*op2 = op1.wrapping_add(*op2)\`

\`op2\` is a **mutable reference to the new top of stack**. We don't pop, add, push — we **write through the reference**. One memory write, not three.

Notice \`wrapping_add\` (modulo 2²⁵⁶), the exact uint256 semantics of EVM.

## The \`gas!\` macro

You'll see this everywhere too:

\`\`\`rust
macro_rules! gas {
    ($interpreter:expr, $gas:expr) => {
        if !$interpreter.gas.record_regular_cost($gas) {
            $crate::primitives::hints_util::cold_path();
            return Err($crate::InstructionResult::OutOfGas);
        }
    };
}
\`\`\`

Charge gas, branch-hint on out-of-gas, return early. Every opcode pays gas this way.

## Where the dispatch lives

Each opcode is bound to a function pointer in an **instruction table**. Reading order if you open the repo:

1. \`crates/interpreter/src/instructions/mod.rs\` — declares the modules
2. \`crates/interpreter/src/instructions/arithmetic.rs\` — \`add\`, \`mul\`, \`sub\`, \`div\`, \`sdiv\`, \`mod\`, \`smod\`, \`addmod\`, \`mulmod\`, \`exp\`, \`signextend\`
3. \`crates/interpreter/src/table.rs\` (or wherever the dispatch is wired) — the array \`[Instruction; 256]\`

## Drill

Open \`arithmetic.rs\` in the repo. Then:

1. Find \`mul\` — confirm it has the same shape as \`add\` but uses \`wrapping_mul\`
2. Find \`exp\` — notice it's longer; figure out where the dynamic gas cost is computed (hint: \`gas\` calls)
3. Modify \`add\` locally to use \`saturating_add\` instead of \`wrapping_add\`. Build, run the test suite. Watch tests fail for transactions that depend on overflow. **You've just discovered why consensus is so fragile.**

After this drill, you've already read more EVM source than 99% of Solidity developers ever will.`,
                },
                {
                  title: 'Custom opcodes — the design space',
                  slug: 'custom-opcodes-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# Custom opcodes — the design space

When Hyperliquid or Tempo say "we picked Revm because it's modular," **adding custom opcodes** is the headline feature. Now we'll see exactly where they hook in.

## The real instruction table

From [\`crates/interpreter/src/instructions.rs\`](https://github.com/bluealloy/revm/blob/main/crates/interpreter/src/instructions.rs):

\`\`\`rust
#[derive(Debug)]
pub struct Instruction<W: InterpreterTypes, H: ?Sized> {
    fn_: fn(InstructionContext<'_, H, W>) -> InstructionExecResult,
}

impl<W: InterpreterTypes, H: Host + ?Sized> Instruction<W, H> {
    #[inline]
    pub const fn new(fn_: fn(InstructionContext<'_, H, W>) -> InstructionExecResult) -> Self {
        Self { fn_ }
    }
}

const fn instruction_table_impl<WIRE: InterpreterTypes, H: Host>()
    -> InstructionTable<WIRE, H>
{
    use bytecode::opcode::*;
    let mut table = [Instruction::unknown(); 256];

    table[ADD as usize] = Instruction::new(arithmetic::add);
    table[MUL as usize] = Instruction::new(arithmetic::mul);
    table[SUB as usize] = Instruction::new(arithmetic::sub);
    table[DIV as usize] = Instruction::new(arithmetic::div);
    table[SDIV as usize] = Instruction::new(arithmetic::sdiv);
    table[MOD as usize] = Instruction::new(arithmetic::rem);
    table[SMOD as usize] = Instruction::new(arithmetic::smod);
    // ...

    table[LT as usize] = Instruction::new(bitwise::lt);
    table[GT as usize] = Instruction::new(bitwise::gt);
    table[EQ as usize] = Instruction::new(bitwise::eq);
    table[AND as usize] = Instruction::new(bitwise::bitand);
    // ...
}
\`\`\`

Three things to notice:

1. **\`const fn\`** — the table is built **at compile time**. There's no runtime cost to dispatch setup.
2. **\`[Instruction::unknown(); 256]\`** — every byte 0x00–0xFF starts mapped to "unknown opcode" (which halts the EVM with an error). Only the opcodes Ethereum has defined get overwritten with real implementations.
3. **\`Instruction::new(arithmetic::add)\`** — each slot holds a typed function pointer. The opcode byte is the array index. **Dispatch is one indexed lookup.**

## The opcode byte map

Quick reference (from [\`bytecode::opcode\`](https://github.com/bluealloy/revm/blob/main/crates/bytecode/src/opcode.rs)):

| Byte | Opcode |
| :--- | :--- |
| 0x01 | ADD |
| 0x02 | MUL |
| 0x03 | SUB |
| 0x10 | LT |
| 0x14 | EQ |
| 0x16 | AND |
| 0x60–0x7F | PUSH1–PUSH32 |
| 0x80–0x8F | DUP1–DUP16 |
| 0xA0–0xA4 | LOG0–LOG4 |
| **0x0C–0x0F** | **unallocated** ← this is where you add custom opcodes |
| **0x21–0x2F** | **unallocated** |

There are several gaps the standard EVM hasn't claimed. Your fork picks one (say \`0x0C\`) and slots in your function:

\`\`\`rust
const HYPER_FAST_SWAP: u8 = 0x0C;

let mut table = standard_table();
table[HYPER_FAST_SWAP as usize] = Instruction::new(my_hyper_fast_swap);
\`\`\`

Where \`my_hyper_fast_swap\` follows the exact \`add\` shape from the previous lesson:

\`\`\`rust
pub fn my_hyper_fast_swap<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([amount_in, pool_id], amount_out, context.interpreter);
    *amount_out = compute_swap_native(*amount_in, *pool_id);
    Ok(())
}
\`\`\`

## What you actually buy

The cost saving comes from **two places**:

1. **No interpreter loop overhead per inner step** — a complex Solidity function might be 200 EVM instructions; one custom opcode is 1 dispatch.
2. **You can use SIMD, FFI, or pre-computed tables in Rust** — none of which are available to bytecode.

This is why a "complex options pricer" can drop from 500K gas in Solidity to 5K gas as a single custom opcode.

## Caveats

1. **Consensus compatibility**: deviating from standard EVM means you can't share blocks with other Ethereum clients. Only valid for **your own chain**.
2. **Gas pricing**: a powerful shortcut needs a properly priced gas cost — otherwise it's a DoS vector.
3. **Provability**: if your chain wants ZK proofs, every new opcode needs to be made provable inside your zkVM.

## Drill

1. Open \`instructions.rs\` in the repo. Find the unallocated opcode bytes by looking for slots that **don't appear** in the table assignments.
2. Pick one. Define a constant for it.
3. Implement a function with the same signature as \`add\` that does **2x multiplication** (\`*op2 = (*op2).wrapping_mul(U256::from(2))\`).
4. Add \`table[YOUR_OPCODE as usize] = Instruction::new(your_fn);\`.
5. Encode bytecode that uses your opcode. Run the EVM. **You just shipped a fork.**`,
                },
                {
                  title: 'The Database trait — supplying state',
                  slug: 'revm-database-trait-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# The Database trait — supplying state

Revm is the "execution engine," but **it doesn't own state**. Storage reads happen through the external \`Database\` trait. Implement it and you can drive Revm against anything: an in-memory map, a forked mainnet, a custom MDBX schema, even a network of remote nodes.

\`\`\`mermaid
sequenceDiagram
    participant Op as Opcode (e.g., SLOAD)
    participant I as Revm Interpreter
    participant DB as Database trait impl
    participant State as Backing store

    Op->>I: needs storage[addr][key]
    I->>DB: storage(addr, key)
    DB->>State: lookup
    State-->>DB: U256 value
    DB-->>I: Ok(value)
    I-->>Op: pushes value to stack
\`\`\`

The opcode never touches the store directly — it only knows about the trait. Swap the impl, change the world: in-memory, forked mainnet, MDBX, RPC. Same Revm, different reality.

## The real trait — verbatim

From [\`crates/database/interface/src/lib.rs\`](https://github.com/bluealloy/revm/blob/main/crates/database/interface/src/lib.rs) (current main):

\`\`\`rust
#[auto_impl(&mut, Box)]
pub trait Database {
    type Error: DBErrorMarker;

    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;

    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error>;

    fn storage(&mut self, address: Address, index: StorageKey)
        -> Result<StorageValue, Self::Error>;

    #[inline]
    fn storage_by_account_id(
        &mut self,
        address: Address,
        account_id: AccountId,
        storage_key: StorageKey,
    ) -> Result<StorageValue, Self::Error> {
        let _ = account_id;
        self.storage(address, storage_key)
    }

    fn block_hash(&mut self, number: u64) -> Result<B256, Self::Error>;
}
\`\`\`

### Notice these things

- **\`#[auto_impl(&mut, Box)]\`** — \`auto_impl\` derives \`Database\` automatically for \`&mut T\` and \`Box<T>\`. So you can pass \`&mut my_db\` or \`Box::new(my_db)\` anywhere a \`Database\` is wanted. Free ergonomics.
- **\`type Error: DBErrorMarker\`** — every implementation picks its own error type but must implement a marker trait. This is how Revm composes user errors with its own.
- **\`storage_by_account_id\` with a default** — a recent optimization. If you've already located the account in your storage, pass its internal ID and skip the address lookup. Default forwards to \`storage\`. **Performance is in the trait API, not just the implementation.**

## Companion traits

Same file, two more traits to know:

\`\`\`rust
#[auto_impl(&mut, Box)]
pub trait DatabaseCommit {
    fn commit(&mut self, changes: AddressMap<Account>);
    // ...
}

#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait DatabaseRef {
    type Error: DBErrorMarker;

    fn basic_ref(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;
    fn code_by_hash_ref(&self, code_hash: B256) -> Result<Bytecode, Self::Error>;
    fn storage_ref(&self, address: Address, index: StorageKey)
        -> Result<StorageValue, Self::Error>;
    fn block_hash_ref(&self, number: u64) -> Result<B256, Self::Error>;
}
\`\`\`

| Trait | Use it for |
| :--- | :--- |
| \`Database\` | normal execution (mutable: caching is allowed) |
| \`DatabaseRef\` | shared, immutable view — \`&self\` lets you wrap in \`Arc\` for parallel tasks |
| \`DatabaseCommit\` | optional: write-back path, used by \`commit_state\` |

## Real implementations to skim

| Impl | Where | When to read |
| :--- | :--- | :--- |
| \`InMemoryDB\` | \`crates/database/src/in_memory_db.rs\` | minimal \`HashMap\`-backed; the toy version |
| \`AlloyDB\` | \`crates/database/src/alloydb.rs\` | fetches over JSON-RPC — fork-mainnet pattern |
| \`StateProviderDatabase\` | reth: \`crates/storage/storage-api/src/database_provider.rs\` | the production MDBX-backed Reth implementation |

Reading these in order — toy → networked → production — is one of the fastest ways to internalize how serious EVM systems wire state.

## Drill

Implement a \`Database\` that always returns "balance = 0, no code, slot = 0":

\`\`\`rust
struct ZeroDb;

impl Database for ZeroDb {
    type Error = std::convert::Infallible;

    fn basic(&mut self, _: Address) -> Result<Option<AccountInfo>, Self::Error> {
        Ok(Some(AccountInfo::default()))
    }
    fn code_by_hash(&mut self, _: B256) -> Result<Bytecode, Self::Error> {
        Ok(Bytecode::default())
    }
    fn storage(&mut self, _: Address, _: StorageKey) -> Result<StorageValue, Self::Error> {
        Ok(StorageValue::ZERO)
    }
    fn block_hash(&mut self, _: u64) -> Result<B256, Self::Error> {
        Ok(B256::ZERO)
    }
}
\`\`\`

Plug this into a Revm and execute a 1-tx block. Even though everything reads zero, the EVM runs cleanly. **Now you understand the entire harness around Revm — every other database is just this, with real data.**`,
                },
              ],
            },
          },
          {
            title: 'Reth — Hooking the Execution Loop',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Staged Sync — the Reth architecture',
                  slug: 'staged-sync-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# Staged Sync — the Reth architecture

Staged Sync is the spine of Reth: instead of "process one block at a time," sync is split into stages, each operating on a range of blocks. Each stage is a Rust type that implements one trait. Let's read it.

## The real \`Stage\` trait

From [\`crates/stages/api/src/stage.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/stages/api/src/stage.rs):

\`\`\`rust
#[auto_impl::auto_impl(Box)]
pub trait Stage<Provider>: Send {
    fn id(&self) -> StageId;

    fn poll_execute_ready(
        &mut self,
        _cx: &mut Context<'_>,
        _input: ExecInput,
    ) -> Poll<Result<(), StageError>> {
        Poll::Ready(Ok(()))
    }

    fn execute(&mut self, provider: &Provider, input: ExecInput) -> Result<ExecOutput, StageError>;

    fn post_execute_commit(&mut self) -> Result<(), StageError> {
        Ok(())
    }

    fn unwind(
        &mut self,
        provider: &Provider,
        input: UnwindInput,
    ) -> Result<UnwindOutput, StageError>;

    fn post_unwind_commit(&mut self) -> Result<(), StageError> {
        Ok(())
    }
}
\`\`\`

Notice the **symmetry**: every stage has both \`execute\` and \`unwind\`. Reorgs aren't a special case — they're a **normal mode of operation**. Going forward = call \`execute\` over a range. Going back = call \`unwind\` over a range. **Same trait, two directions.**

## The input/output types

\`\`\`rust
#[derive(Debug, Default, PartialEq, Eq, Clone, Copy)]
pub struct ExecInput {
    pub target: Option<BlockNumber>,
    pub checkpoint: Option<StageCheckpoint>,
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct ExecOutput {
    pub checkpoint: StageCheckpoint,
    pub done: bool,
}

#[derive(Debug, Default, PartialEq, Eq, Clone, Copy)]
pub struct UnwindInput {
    pub checkpoint: StageCheckpoint,
    pub unwind_to: BlockNumber,
    pub bad_block: Option<BlockNumber>,
}
\`\`\`

| Field | What it does |
| :--- | :--- |
| \`ExecInput.target\` | "Process up to this block" — the orchestrator decides batch size |
| \`ExecInput.checkpoint\` | "Last time this stage ran, it stopped here" — resume from disk |
| \`ExecOutput.done\` | \`false\` = "more to do, call me again" — gives the orchestrator backpressure control |
| \`UnwindInput.bad_block\` | If a reorg was triggered by a specific bad block, the stage gets it |

This is **explicitly resumable**. A node restart picks up exactly where the previous run stopped. No "scan from zero" hack.

## What \`#[auto_impl(Box)]\` buys you

The orchestrator stores stages as \`Box<dyn Stage<...>>\` so it can hold a mixed list. \`auto_impl\` derives \`Stage\` for \`Box<S: Stage>\` automatically — without it, you'd need to manually forward every method through the box.

## The actual stages

Reth's stage pipeline (\`crates/stages/stages/src/stages/\`):

\`\`\`mermaid
flowchart LR
    H[HeaderStage] --> B[BodyStage]
    B --> S[SenderRecoveryStage]
    S --> E[ExecutionStage]
    E --> AH[AccountHashingStage]
    AH --> SH[StorageHashingStage]
    SH --> M[MerkleStage]
    M --> T[TransactionLookupStage]
    T --> I[IndexHistoryStages]
    I --> F[FinishStage]
\`\`\`

1. **\`HeaderStage\`** — download headers
2. **\`BodyStage\`** — download transaction bodies
3. **\`SenderRecoveryStage\`** — ECDSA-recover sender addresses (massively parallel)
4. **\`ExecutionStage\`** — run Revm, accumulate state changes
5. **\`AccountHashingStage\`** — sort hashed account changes
6. **\`StorageHashingStage\`** — sort hashed storage changes
7. **\`MerkleStage\`** — update Merkle Patricia Trie roots
8. **\`TransactionLookupStage\`** — build the txhash → (block, index) index
9. **\`IndexAccountHistoryStage\`** + **\`IndexStorageHistoryStage\`** — historical access indices
10. **\`FinishStage\`** — finalize

Each is a separate file; each implements the trait above. Open one (\`SenderRecoveryStage\` is the most readable) and you'll see the whole shape: \`execute\` reads a block range, processes it, returns a checkpoint with \`done: false\` until the range is exhausted.

## Drill

In the \`reth\` repo, open \`crates/stages/stages/src/stages/sender_recovery.rs\`:

1. Find the \`execute\` method
2. Spot the **batch loop** — it processes blocks in chunks, not all at once
3. Find where it returns \`done: false\` vs \`done: true\`
4. Look at the parallelism — \`SenderRecoveryStage\` uses Rayon to recover senders across CPU cores

You're now reading the same code Paradigm uses to keep Reth in sync.`,
                },
                {
                  title: 'Rust: lifetimes, Box, Arc, dyn Trait',
                  slug: 'rust-lifetimes-arc-dyn-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 30,
                  content: `# Rust: lifetimes, Box, Arc, dyn Trait

Four "advanced but actually simple" Rust features you need to read ExEx and Reth SDK code.

## 1. Lifetimes \`'a\`

A lifetime annotation tells the compiler **how long a borrow lives**.

\`\`\`rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() >= y.len() { x } else { y }
}
\`\`\`

- \`'a\` is a label for "some lifetime"
- Both inputs and the output share the same \`'a\` → "the returned reference lives at least as long as both inputs"
- Often the compiler infers them — **most signatures don't need explicit lifetimes**

### \`'static\`

\`'static\` means **"lives for the entire program."** String literals are \`&'static str\`:

\`\`\`rust
let s: &'static str = "hello";
\`\`\`

Long-running tasks (like ExEx) often require \`'static\` bounds because they can outlive any local scope.

## 2. \`Box<T>\` — heap allocation

When you want a value on the heap rather than the stack, wrap it in \`Box<T>\`:

\`\`\`rust
let boxed: Box<i64> = Box::new(42);
println!("{}", *boxed);   // 42
\`\`\`

Common reasons:

- **Recursive types** (linked lists) need a fixed-size pointer
- Holding a **dynamically-sized** value (\`dyn Trait\`)
- **Move** large values cheaply instead of copying

## 3. \`Rc<T>\` and \`Arc<T>\` — shared ownership

Rust's "one owner" rule sometimes gets in the way: you want **multiple parts of the program to hold the same value**.

| Type | Use |
| :--- | :--- |
| \`Rc<T>\` | single-threaded reference counting |
| \`Arc<T>\` | **thread-safe** (atomic reference counting) |

\`\`\`rust
use std::sync::Arc;

let shared = Arc::new(String::from("hello"));
let clone1 = Arc::clone(&shared);   // refcount += 1
let clone2 = Arc::clone(&shared);   // refcount += 1

// Send to another thread — Arc is Send
std::thread::spawn(move || println!("{}", clone1));
\`\`\`

**Reth and ExEx code is full of \`Arc<...>\`** — multiple async tasks need to read the same component.

## 4. \`Mutex\` / \`RwLock\` — shared mutability

\`Arc<T>\` alone is read-only. To mutate shared state, wrap in \`Mutex\` or \`RwLock\`:

\`\`\`rust
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0));

let c = Arc::clone(&counter);
std::thread::spawn(move || {
    let mut n = c.lock().unwrap();
    *n += 1;
});
\`\`\`

| Type | Use |
| :--- | :--- |
| \`Mutex\` | exclusive read/write |
| \`RwLock\` | many readers OR one writer |

## 5. \`dyn Trait\` — dynamic dispatch

A trait object — like a TypeScript / Java interface, but you opt into runtime method resolution explicitly.

\`\`\`rust
trait Greet {
    fn greet(&self);
}

struct En;
struct Ja;
impl Greet for En { fn greet(&self) { println!("Hello"); } }
impl Greet for Ja { fn greet(&self) { println!("こんにちは"); } }

let g: Box<dyn Greet> = if std::env::var("LANG").unwrap_or_default().starts_with("ja") {
    Box::new(Ja)
} else {
    Box::new(En)
};
g.greet();
\`\`\`

### \`impl Trait\` vs \`dyn Trait\`

| Form | Meaning |
| :--- | :--- |
| \`impl Trait\` | static dispatch (concrete type at compile time) |
| \`dyn Trait\` | dynamic dispatch (resolve at runtime, needs Box or & ) |

\`impl\` is faster, but \`dyn\` lets you have heterogeneous collections like \`Vec<Box<dyn Trait>>\`.

## 6. What you'll see in ExEx code

\`\`\`rust
async fn my_exex<Node: FullNodeComponents>(
    mut ctx: ExExContext<Node>,
) -> eyre::Result<()> {
    while let Some(notification) = ctx.notifications.recv().await {
        // ...
    }
    Ok(())
}
\`\`\`

- \`Node: FullNodeComponents\` — trait bound
- \`ExExContext<Node>\` — generic
- Internally uses \`Arc<...>\` for shared components
- Lifetime annotations are elided but \`'static\` is required

## Cheat sheet

| Feature | One-liner |
| :--- | :--- |
| \`'a\` / \`'static\` | how long borrows live |
| \`Box<T>\` | heap allocation |
| \`Rc<T>\` / \`Arc<T>\` | shared ownership (Arc is thread-safe) |
| \`Mutex<T>\` | safely mutate shared data |
| \`dyn Trait\` | runtime method dispatch |

These are the tools you need to read serious Reth code. Next lesson: ExEx itself, where you'll see them in action.`,
                },
                {
                  title: 'ExEx — Execution Extensions',
                  slug: 'reth-exex-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 30,
                  content: `# ExEx — Execution Extensions

**ExEx** is Reth's mechanism for injecting Rust code into the execution loop. With it you build node-speed indexers, MEV bots, and live risk engines — directly in the same process as the chain itself.

\`\`\`mermaid
flowchart LR
    subgraph Reth
        Sync[Sync] --> Exec[ExecutionStage]
        Exec --> Commit[Chain commit]
    end
    Commit -->|notification| ExEx[Your ExEx]
    ExEx -->|FinishedHeight| Prune[Reth pruner]
\`\`\`

The chain executes; Reth pushes a notification for every committed block (or reorg / revert) into your ExEx's stream; you process it and report back the highest block you've finished — that lets Reth prune older history safely.

## The minimal ExEx — verbatim

This is the entire \`main.rs\` of [\`paradigmxyz/reth-exex-examples/minimal\`](https://github.com/paradigmxyz/reth-exex-examples/tree/main/minimal):

\`\`\`rust
use futures::{Future, TryStreamExt};
use reth_exex::{ExExContext, ExExEvent, ExExNotification};
use reth_node_api::FullNodeComponents;
use reth_node_ethereum::EthereumNode;
use reth_tracing::tracing::info;

async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    Ok(exex(ctx))
}

async fn exex<Node: FullNodeComponents>(mut ctx: ExExContext<Node>) -> eyre::Result<()> {
    while let Some(notification) = ctx.notifications.try_next().await? {
        match &notification {
            ExExNotification::ChainCommitted { new } => {
                info!(committed_chain = ?new.range(), "Received commit");
            }
            ExExNotification::ChainReorged { old, new } => {
                info!(from_chain = ?old.range(), to_chain = ?new.range(), "Received reorg");
            }
            ExExNotification::ChainReverted { old } => {
                info!(reverted_chain = ?old.range(), "Received revert");
            }
        };

        if let Some(committed_chain) = notification.committed_chain() {
            ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
        }
    }

    Ok(())
}

fn main() -> eyre::Result<()> {
    reth::cli::Cli::parse_args().run(|builder, _| async move {
        let handle = builder
            .node(EthereumNode::default())
            .install_exex("Minimal", exex_init)
            .launch_with_debug_capabilities()
            .await?;

        handle.wait_for_node_exit().await
    })
}
\`\`\`

That's a working production-shaped ExEx. ~40 lines.

## Reading it in detail

### \`exex_init\` vs \`exex\`

\`\`\`rust
async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    Ok(exex(ctx))
}
\`\`\`

Reth calls \`exex_init\` once at startup and **expects you to return a Future to be polled forever**. The two-stage pattern lets you do **synchronous setup** in \`exex_init\` (open files, prepare state) before the long-running future starts.

### The notification stream

\`\`\`rust
while let Some(notification) = ctx.notifications.try_next().await? {
\`\`\`

\`ctx.notifications\` is a Stream — \`try_next\` returns \`Result<Option<ExExNotification>>\`. When the node shuts down or an error occurs, the loop exits cleanly.

### Three notification types — what each means

\`\`\`rust
ExExNotification::ChainCommitted { new }       // canonical blocks added
ExExNotification::ChainReorged { old, new }    // reorg: old segment replaced by new
ExExNotification::ChainReverted { old }        // segment removed (no replacement yet)
\`\`\`

A correct ExEx handles **all three**. A naive implementation that only listens to \`ChainCommitted\` will silently corrupt its derived state on every reorg. **This is the #1 ExEx bug.**

### The \`FinishedHeight\` event

\`\`\`rust
if let Some(committed_chain) = notification.committed_chain() {
    ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
}
\`\`\`

This tells Reth: "I've processed up to this block hash; you can prune older history that I'd no longer need." Without it, **Reth keeps everything forever** because it doesn't know what your ExEx still wants to read.

### \`install_exex\`

\`\`\`rust
.install_exex("Minimal", exex_init)
\`\`\`

The first arg is a name (used in metrics and logs); the second is the init function. You can chain multiple \`.install_exex(...)\` calls — each ExEx gets its own notification stream.

## What real ExExes do

The same repo has more substantial examples — read them once you've got \`minimal\` running:

| Example | What it does |
| :--- | :--- |
| \`backfill\` | Replays historical blocks through your handler at startup |
| \`in_memory_state\` | Maintains a custom indexed state derived from each block |
| \`tracking-state\` | Persists ExEx-internal state to a separate DB (so restarts are cheap) |
| \`rollup\` | Implements a minimal rollup using only ExEx hooks |

## Drill

1. Clone \`reth-exex-examples\`, run \`minimal\` against a synced node
2. Modify the \`ChainCommitted\` arm to print the **transaction count** of each block: \`new.tip().body.transactions.len()\`
3. Add a \`HashMap<Address, u64>\` that counts how many txs each address sent — survive a reorg correctly (subtract on \`ChainReverted\`, re-add on \`ChainCommitted\` for the new chain)

When that works, you've written a node-speed indexer.`,
                },
                {
                  title: 'Reth SDK — building an App-chain',
                  slug: 'reth-sdk-appchain-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# Reth SDK — building an App-chain

ExEx extends an existing Ethereum node. The Reth SDK lets you build **your own App-chain** in Rust by composing components.

## A real custom-node main.rs — verbatim

This is from [\`paradigmxyz/reth/examples/custom-node-components/src/main.rs\`](https://github.com/paradigmxyz/reth/tree/main/examples/custom-node-components):

\`\`\`rust
use reth_ethereum::{
    chainspec::ChainSpec,
    cli::interface::Cli,
    evm::primitives::ConfigureEvm,
    node::{
        api::{FullNodeTypes, NodeTypes},
        builder::{components::PoolBuilder, BuilderContext},
        node::EthereumAddOns,
        EthereumNode,
    },
    pool::{
        blobstore::InMemoryBlobStore, CoinbaseTipOrdering, EthTransactionPool, Pool, PoolConfig,
        TransactionValidationTaskExecutor,
    },
    provider::CanonStateSubscriptions,
    EthPrimitives,
};

fn main() {
    Cli::parse_args()
        .run(async move |builder, _| {
            let handle = builder
                .with_types::<EthereumNode>()
                .with_components(EthereumNode::components().pool(CustomPoolBuilder::default()))
                .with_add_ons(EthereumAddOns::default())
                .launch()
                .await?;

            handle.wait_for_node_exit().await
        })
        .unwrap();
}
\`\`\`

That's a working chain binary. Read the four key calls in the chain:

### \`.with_types::<EthereumNode>()\`
Picks the **type bundle** — chain spec, primitives (block, tx, header types), engine API. \`EthereumNode\` ships defaults; replace with \`OpNode\`, your custom types, or any \`NodeTypes\` impl.

### \`.with_components(...)\`
This is where customization lives. You take the base set (\`EthereumNode::components()\`) and override individual builders:

- \`.pool(CustomPoolBuilder::default())\` — custom transaction pool (the example does this)
- \`.network(...)\` — custom P2P
- \`.payload(...)\` — custom block builder
- \`.executor(...)\` — custom EVM executor (this is where custom opcodes/precompiles plug in)
- \`.consensus(...)\` — custom consensus

### \`.with_add_ons(...)\`
RPC namespaces, engine API extensions, ExEx installations. \`EthereumAddOns::default()\` gives you the standard Ethereum RPC; you can chain \`.install_exex(...)\` here.

### \`.launch()\`
Boots everything: opens MDBX, starts P2P, spawns Tokio tasks for stages, exposes RPC. Returns a \`NodeHandle\` you can \`wait_for_node_exit\` on.

## What customization unlocks

| Component | What changes |
| :--- | :--- |
| \`with_types\` | block/tx structure, header layout, chain ID semantics |
| \`with_components.executor\` | **EVM** — custom opcodes (lesson 2), custom precompiles (Expert), custom gas |
| \`with_components.consensus\` | PoS → HyperBFT, PoA, Tendermint, anything |
| \`with_components.pool\` | priority lanes (Tempo-style), custom tx admission rules |
| \`with_components.payload\` | custom block-building (e.g., MEV-aware ordering) |
| \`with_components.network\` | private subnets, peer policy |
| \`with_add_ons\` | custom JSON-RPC, ExEx install |

## Production examples in the wild

- **Hyperliquid HyperEVM** — HyperBFT + custom execution + order-book-coupled DB
- **Tempo** — payment-specialized priority lanes
- **Berachain (bera-reth)** — Proof of Liquidity consensus

These all replace one or more \`with_components\` builders with their own. The framework above is what they extend.

## Drill

1. Clone \`reth\` and \`cd examples/custom-node-components\`
2. Read \`CustomPoolBuilder\` — see how it implements \`PoolBuilder\` to swap the pool
3. Modify it to **log every transaction's gas price** as it enters the pool
4. \`cargo run\` against a dev chain. Watch your custom log fire.

Now you've shipped a 1-line component swap. Scale this pattern to consensus or executor and you're building HyperEVM-class infra.`,
                },
                {
                  title: 'Bridge to Expert — what comes next',
                  slug: 'reth-bridge-to-expert-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 10,
                  xpReward: 20,
                  content: `# Bridge to Expert — what comes next

You've climbed **Alloy → Revm → Reth (Staged Sync, ExEx, custom NodeBuilder)**. You can now read the source of all three projects with intent.

But "reading" is only half. The **Expert** tier crosses from "I can read it" to "I can ship it in production."

## What awaits in Expert

| Lesson | Focus |
| :--- | :--- |
| **Performance engineering** | flamegraph, Criterion, jemalloc, Reth's \`maxperf\` build profile |
| **MDBX storage internals** | Reth's actual \`Database\` / \`DbTx\` / \`DbTxMut\` traits, B+tree mmap, MVCC |
| **Tokio runtime internals** | work-stealing, \`spawn_critical_task\`, panic supervision |
| **Procedural macros** | how \`address!\` and \`sol!\` actually work — the \`fixed_bytes_macros!\` meta-pattern |
| **Custom precompiles** | the real Revm \`identity_run\` + how Foundry's cheatcodes are precompiles |
| **Merkle Patricia Trie** | reth's actual \`AccountProof\` / \`StorageProof\` and verification logic |
| **MEV in practice** | mempool ingest, sol! decoding, Revm forking, ExEx as a private mempool |
| **zkEVM with Revm** | Steel + Risc0 guest source — proving Ethereum execution |
| **Production fork ops** | reth's real \`maxperf\` Cargo profile, systemd, monitoring, diff testing |

## The mindset shift

Advanced taught you the **structures**. Expert teaches you the **decisions** behind those structures:

- *Why* does Reth use MDBX and not RocksDB? (read latency under compaction stalls)
- *Why* does Revm pop one and write through a reference instead of pop/pop/push? (one fewer memory write per ADD)
- *Why* does \`#[track_caller]\` matter on \`Database::tx()\`? (panic shows the buggy caller, not the trait)
- *Why* are Foundry cheatcodes precompiles and not opcodes? (consensus compatibility with vanilla EVM)

Once you internalize the *why*, you can defend design choices to a Paradigm engineer or a Hyperliquid validator op — and that's the gate to grant-eligible work.

## Before you continue

Make sure you can explain, in your own words:

1. What \`popn_top!\` does and *why* it uses \`unwrap_unchecked()\`
2. Why \`Database\` and \`DatabaseRef\` are separate traits
3. What \`ExExEvent::FinishedHeight\` tells Reth's pruner

If any of these are fuzzy, re-read the relevant Advanced lesson before starting Expert. Pace yourself — Expert lessons are denser, and most people benefit from running the linked code locally as they read.

> The first three months in infra learning are the hardest. Documentation is sparse — **the source code is the textbook**. The Expert tier is where that lesson pays off.`,
                },
                {
                  title: 'Advanced quiz',
                  slug: 'advanced-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 5,
                  duration: 12,
                  xpReward: 35,
                  content: `# Advanced quiz

Final check across Revm internals, ExEx, and the Reth SDK.`,
                  quizQuestions: [
                    {
                      question: "What is `crates/interpreter` in the Revm repo mainly responsible for?",
                      options: [
                        'Block sync and P2P networking',
                        'Implementing each EVM opcode in Rust',
                        'JSON-RPC server definitions',
                        'Consensus leader election',
                      ],
                      correctIndex: 1,
                      explanation: 'crates/interpreter holds the per-opcode implementations: ADD, MUL, PUSH, JUMP, SLOAD, SSTORE, etc.',
                    },
                    {
                      question: 'What does "adding a custom opcode" to Revm let you do?',
                      options: [
                        'Run private opcodes on Ethereum mainnet',
                        'Provide a fast, single-instruction shortcut on your own chain (consensus-incompatible with mainnet)',
                        'Replace Geth with a Rust binary',
                        "Change Solidity's syntax",
                      ],
                      correctIndex: 1,
                      explanation: 'Custom opcodes break consensus with mainnet, so they only make sense on your own App-chain. Inside that chain they\'re a powerful optimization.',
                    },
                    {
                      question: 'The main role of Revm\'s `Database` trait is:',
                      options: [
                        'To commit EVM execution directly',
                        'To supply account info, contract code, storage slots, and past block hashes that the EVM needs to execute',
                        'To manage P2P networking',
                        'To swap the gas-pricing algorithm',
                      ],
                      correctIndex: 1,
                      explanation: 'Database abstracts the state source. Different impls let you back the EVM with in-memory data, RPC, production storage, or custom DBs.',
                    },
                    {
                      question: 'What is the advantage of Reth\'s Staged Sync?',
                      options: [
                        'Full Geth database compatibility',
                        'Processing blocks in stages (over ranges) maximizes I/O, CPU, and cache efficiency',
                        'Verifying all blocks in parallel and ignoring ordering',
                        'It works without ZK proofs',
                      ],
                      correctIndex: 1,
                      explanation: 'Staged Sync — Headers → Bodies → Senders → Execution → Merkle → TxLookup — processes ranges of blocks per stage, which is critical for managing huge chain state.',
                    },
                    {
                      question: 'What can you do with ExEx (Execution Extensions)?',
                      options: [
                        'Rewrite mainnet consensus',
                        'Run Rust code in-process on every chain commit, reorg, or revert at near-execution-time latency',
                        'Execute arbitrary Solidity for free',
                        'Disable Ethereum RPC',
                      ],
                      correctIndex: 1,
                      explanation: 'ExEx receives ChainCommitted / ChainReorged / ChainReverted notifications. It\'s the basis for indexers, MEV tools, and real-time monitoring at node speed.',
                    },
                    {
                      question: 'Which components do you typically customize when building an App-chain with the Reth SDK?',
                      options: [
                        'Only the Solidity compiler version',
                        'EVM config (opcodes, gas), consensus, storage, and RPC',
                        'The user\'s web browser',
                        'TypeScript type definitions',
                      ],
                      correctIndex: 1,
                      explanation: 'Reth SDK exposes pluggable EVMConfig, Consensus, Storage, Network, and RPC — the foundations of an App-chain.',
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
