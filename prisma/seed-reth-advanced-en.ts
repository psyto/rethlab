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

You're going inside [\`bluealloy/revm\`](https://github.com/bluealloy/revm). The folder that matters is \`crates/interpreter\` — every EVM opcode is implemented here, in Rust.

This lesson: read the real \`add\` opcode and the dispatch loop that calls it. Three lines of code. Half a page of nuance per line. **Reading is the easy part. Internalizing it is the lesson.**

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
│   └── precompile/         ← built-in precompiles
\`\`\`

> 📂 **Open the repo in another tab now.** Don't read the rest of this lesson without it open. Every claim below should be cross-checked against the actual file.

## The real \`add\` opcode

Pulled from [\`crates/interpreter/src/instructions/arithmetic.rs\`](https://github.com/bluealloy/revm/blob/main/crates/interpreter/src/instructions/arithmetic.rs):

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

Three lines. Six things a lazy reader will miss.

> 🛑 **Stop. Before scrolling, answer in one sentence each:**
> 1. Why is there a generic \`IT\` here at all? What would change if it were removed?
> 2. Why \`?Sized\` on \`H\`? When does removing the \`?\` break the build?
> 3. The body never returns the result anywhere visible. Where does the EVM observe the new top of stack?
>
> If any answer is "I don't know" or "something about traits," scroll up and re-read the signature before continuing. The point is not to scroll past comfortable.

---

### \`<IT: ITy, H: ?Sized>\`

- \`IT\` is an **interpreter-types** marker. It selects the execution mode at compile time: concrete, traced, or sandboxed (Inspector). The same \`add\` function compiles to specialized binaries, one per mode. **Without \`IT\`, you'd write \`add\` three times.**
- \`?Sized\` opts \`H\` *out* of the implicit \`Sized\` bound. Without \`?\`, \`H\` must be a concrete type known at compile time. With \`?\`, \`H\` can be \`dyn Host\` — a trait object whose size is unknown at compile time. That's the only reason \`&mut dyn Host\` compiles.

> 🔍 **Open \`revm/src/host.rs\`. Find one place where \`dyn Host\` is actually constructed.** That's the proof these generics earn their complexity. If you can't find one, the generics are just noise to you — find one before continuing.

### \`popn_top!([op1], op2, context.interpreter)\`

A macro. Find its definition in \`instructions/macros.rs\`:

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

> 🛑 **Predict before reading the explanation:**
> - What does this macro expand to when called as \`popn_top!([op1], op2, ctx.interpreter)\`? Write the expansion out — actually, on paper if you have to.
> - Why is \`cold_path()\` called on the error branch? What does it do to generated assembly?
> - \`unwrap_unchecked()\` inside \`unsafe\`: what *exact* condition makes this not undefined behavior?

---

Walk:

- \`$($x:ident),*\` matches a comma-separated list of identifiers. With \`[op1]\`, the list has one element. The expansion creates a binding for \`op1\` (popped value) and \`op2\` (mutable reference to the new top of stack).
- \`cold_path()\` is a hint to LLVM that the branch is statistically rare. The compiler then keeps the rare-branch code out of the hot instruction cache. **Net effect: the happy path stays one straight line of cache-warm assembly.**
- \`unwrap_unchecked()\` skips the runtime \`Some\` check. It's safe here because the \`if stack.len() < ...\` guard *just ran* — the value is provably \`Some\`. The \`unsafe\` block is the contract: *"I checked, so don't double-check."* Delete the guard and you've made it instant UB.

> 🛑 **Anti-fluency test.** Without scrolling back: in your own words, why doesn't the compiler optimize away the redundant \`Some\` check itself, requiring \`unwrap_unchecked\` instead?
>
> If you can't answer, you don't understand the macro yet — re-read.

### \`*op2 = op1.wrapping_add(*op2)\`

\`op2\` is a **mutable reference** to the new top of stack (after \`op1\` was popped). The line writes the result *through* the reference — one memory write, no pop-add-push.

\`wrapping_add\` performs addition modulo 2²⁵⁶. EVM's \`ADD\` is required to wrap, not panic.

> 🛑 **Predict.** What hex value does \`U256::MAX.wrapping_add(U256::from(1))\` produce?
>
> If your answer wasn't \`0x0\` (or \`U256::ZERO\`), pause. EVM consensus depends on this exact behavior. Get it wrong in your own implementation and you've forked the chain.

## The \`gas!\` macro

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

Same structural pattern as \`popn_top!\`: check, cold-hint on failure, return early. Charge gas, fall off the cliff if you can't afford it.

> 🔍 **Why isn't \`gas!\` called inside the body of \`add\`?** Look at \`arithmetic.rs\`. Form a hypothesis. Then open \`interpreter.rs\` and find where constant-gas opcodes are actually charged. Verify your hypothesis against the source — don't take this lesson's word for it.

## Where the dispatch lives

\`\`\`mermaid
flowchart LR
    PC[interpreter.pc] -->|fetch byte| Op[opcode 0x01]
    Op -->|index into| Table["[Instruction; 256]"]
    Table --> Fn[fn add ctx]
    Fn -->|popn_top!| Stack[Stack op1, op2 top]
    Fn -->|wrapping_add| Stack
    Fn --> PC
\`\`\`

Each opcode is a function pointer indexed by byte value. The dispatch loop fetches a byte from \`pc\`, indexes into a \`[Instruction; 256]\` table, calls. **No \`match\` statement, no jump table the compiler builds for you — an array of function pointers built at compile time.**

> 🔍 **Trace it yourself before continuing.** In the repo:
>
> 1. Open \`crates/interpreter/src/instructions/mod.rs\` — what does it declare?
> 2. Find where the table \`[Instruction; 256]\` is built. (Search for \`Instruction;\` or \`instruction_table\`.)
> 3. At index \`0x01\`, what's the function pointer? Confirm it's \`add\`.
>
> If you can't locate the table, you don't yet know how the interpreter dispatches. Don't proceed without finding it.

## Drill

Reading is rehearsal. Now do these in order:

1. **Find \`mul\`.** Confirm it has the exact same shape as \`add\` but uses \`wrapping_mul\`. **Why** are these two opcodes structurally identical down to the line count? (Answer in your own words before moving on.)
2. **Find \`exp\`.** It's longer. Locate where its **dynamic** gas cost is computed (hint: a \`gas\` call mid-function, not at entry). Why is \`exp\` charged dynamically when \`add\` is charged at dispatch?
3. **Break consensus on purpose.** Modify \`add\` locally: use \`saturating_add\` instead of \`wrapping_add\`. Build. Run the test suite. Watch tests fail. **You now have empirical proof that consensus is one library function call away from forking the network.**

---

After this drill, you've read more EVM source than 99% of Solidity developers ever will. **More importantly: you can prove it — answer the predict/recall prompts above, in your own words, without scrolling back.** If you can't, the lesson isn't done with you.`,
                },
                {
                  title: 'Custom opcodes — the design space',
                  slug: 'custom-opcodes-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# Custom opcodes — the design space

When Hyperliquid or Tempo say "we picked Revm because it's modular," **adding custom opcodes** is the headline feature. This lesson: where exactly they hook in, what it costs, and the failure modes "modular" hides.

> 🛑 **Predict before scrolling.** Without looking at the source, sketch how revm dispatches opcodes to functions:
> - Is it a \`match\` statement? A \`HashMap<u8, fn>\`? An array? Something else?
> - Wherever you guessed: **why does the choice matter?** What's the cost of the wrong shape?
>
> Hold your guess. We'll check it against the real implementation in a moment.

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

Compare your prediction. Three details earn their keep — but only if you can defend why each one matters:

### \`const fn\`
The table is built **at compile time**. Zero runtime cost to set up dispatch.

> 🛑 **Anti-fluency.** Without scrolling: what *exactly* changes if you replace \`const fn\` with \`fn\`? "It's slower because runtime" is parroting. Be precise — what runs when, and how often?

### \`[Instruction::unknown(); 256]\`
Every byte 0x00–0xFF starts mapped to "unknown opcode" — which halts the EVM. Defined Ethereum opcodes overwrite their slot with the real implementation.

### \`Instruction::new(arithmetic::add)\`
Each slot is a typed function pointer. Opcode byte = array index. **Dispatch is one indexed lookup, period.**

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

> 🔍 **Verify, don't trust.** Open \`bytecode::opcode\` in the repo. Confirm \`0x0C\` is genuinely unassigned **on the version you'd actually fork**. The gaps shift across hard forks — a table in a lesson is a snapshot, not a contract.

## Wiring a custom opcode

Pick an unallocated byte, slot in your function:

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

\`\`\`mermaid
flowchart LR
    Std[standard_table 256 slots] -->|copy| Mine[my fork's table]
    Mine -->|override 0x0C| Custom[my_hyper_fast_swap]
    Bytecode[bytecode 0x0C ...] -->|interpreter dispatch| Mine
    Mine --> Custom
    Custom --> Result[result on stack]
\`\`\`

## What this actually buys you — and what it costs

Two compounding wins:

1. **No interpreter loop overhead per inner step** — a complex Solidity function might be 200 EVM instructions; one custom opcode is 1 dispatch.
2. **SIMD, FFI, or pre-computed tables in Rust** — none available to bytecode.

A complex options pricer can drop from **500K gas in Solidity → 5K gas as a single custom opcode**.

> 🛑 **Predict the failure modes** before scrolling. You're shipping a custom opcode tomorrow. List 3 things that will go wrong if you treat this casually. Hold your list — compare to the caveats below.

### Caveats — these aren't optional

1. **Consensus compatibility**: deviating from standard EVM means you can't share blocks with other Ethereum clients. Valid only on **your own chain**. Fork mainnet with this opcode and try to peer with go-ethereum → instant disconnect on the first transaction that touches \`0x0C\`.
2. **Gas pricing**: a powerful shortcut needs a properly priced gas cost — otherwise it's a DoS vector. **How would you derive the gas price for \`my_hyper_fast_swap\`?** If you can't sketch a methodology in three sentences, you can't safely ship this opcode.
3. **Provability**: if your chain wants ZK proofs, every new opcode needs to be made provable inside your zkVM. That's potentially weeks of additional work *per opcode*.

## Drill

1. Open \`instructions.rs\` in the repo. Find unallocated opcode bytes by spotting the slots that **don't appear** in the table assignments. (Don't trust the table above — verify on the actual code you'd fork.)
2. Pick one. Define a constant for it.
3. Implement a function with the same signature as \`add\` that does **2x multiplication** (\`*op2 = (*op2).wrapping_mul(U256::from(2))\`).
4. Add \`table[YOUR_OPCODE as usize] = Instruction::new(your_fn);\`.
5. Encode bytecode that uses your opcode. Run the EVM. **You just shipped a fork.**

> Final check: explain in one sentence why a chain shipping this opcode can never participate in mainnet consensus. If you can't, scroll back to caveat #1 — the lesson isn't done with you.`,
                },
                {
                  title: 'The Database trait — supplying state',
                  slug: 'revm-database-trait-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# The Database trait — supplying state

Revm is the "execution engine," but **it doesn't own state**. Storage reads happen through the external \`Database\` trait. Implement it and you can drive Revm against anything: an in-memory map, a forked mainnet, a custom MDBX schema, a network of remote nodes.

> 🛑 **Predict before scrolling.** Without looking, write down the **minimum** API revm needs from its state store. How many methods? What signatures?
>
> Hint: think about every opcode that touches state. \`SLOAD\`, \`BALANCE\`, \`EXTCODESIZE\`, \`BLOCKHASH\` — what does revm need to ask for to satisfy each? Don't scroll until you have a draft.

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

> 🛑 **Compare your prediction.** What did you miss? More importantly: **what's NOT here that you might have predicted?**
>
> No \`set_storage\`. No \`set_balance\`. No \`commit\`. **Why is the read API and write API split into separate traits?** What design constraint is that serving?

### Three things to look hard at

- **\`#[auto_impl(&mut, Box)]\`** — \`auto_impl\` derives \`Database\` automatically for \`&mut T\` and \`Box<T>\`. Pass \`&mut my_db\` or \`Box::new(my_db)\` anywhere a \`Database\` is wanted.

> 🛑 **Anti-fluency.** Mentally delete the \`#[auto_impl]\` attribute. Now: what does the user write manually to pass \`&mut MyDatabase\` where \`Database\` is expected? Sketch the \`impl<T: Database> Database for &mut T\` block. If you can't, the macro is just noise to you — write the manual impl out before continuing.

- **\`type Error: DBErrorMarker\`** — every implementation picks its own error type but must implement a marker trait. Why a marker instead of a fixed enum? Because revm needs to compose your custom errors (network failures, MDBX errors, RPC timeouts) with its own without you being trapped in a closed taxonomy.

- **\`storage_by_account_id\` with a default** — recent optimization. If you've already located the account, pass its internal ID and skip the address lookup. The default forwards to \`storage\`. **Performance lives in the trait API, not just the implementation.**

> 🔍 **Find the call site.** Where in revm is \`storage_by_account_id\` actually invoked instead of \`storage\`? Search \`crates/handler/\`. Who benefits from the override — the database author, or revm itself?

## Companion traits — read split from write

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
| \`Database\` | normal execution (\`&mut self\` — caching is allowed) |
| \`DatabaseRef\` | shared, immutable view — \`&self\` lets you wrap in \`Arc\` for parallel tasks |
| \`DatabaseCommit\` | optional: write-back path, used by \`commit_state\` |

> 🛑 **Predict.** \`DatabaseRef\`'s \`auto_impl\` list is longer (\`&, &mut, Box, Rc, Arc\`) than \`Database\`'s (\`&mut, Box\`). Why? What does the asymmetry tell you about how each trait gets used in practice?

## Real implementations to skim

| Impl | Where | When to read |
| :--- | :--- | :--- |
| \`InMemoryDB\` | \`crates/database/src/in_memory_db.rs\` | minimal \`HashMap\`-backed; the toy version |
| \`AlloyDB\` | \`crates/database/src/alloydb.rs\` | fetches over JSON-RPC — fork-mainnet pattern |
| \`StateProviderDatabase\` | reth: \`crates/storage/storage-api/src/database_provider.rs\` | production MDBX-backed Reth implementation |

Read in order — toy → networked → production — to see how the same trait scales from 50 lines to thousands.

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

> 🛑 **Before plugging it in, predict.** What kind of bytecode would actually fail under \`ZeroDb\`? What would succeed?
>
> Specifically: \`CALL\` to an address with no code — what happens? \`SLOAD\` from an uninitialized slot — what does the EVM see? \`BALANCE\` of any account — does the tx revert?

Plug \`ZeroDb\` into a Revm and execute a 1-tx block. Even though everything reads zero, the EVM runs cleanly. **Now you understand the entire harness around Revm — every other database is just this, with real data.**

> Final check: in one sentence, why does revm split read (\`Database\`) from write (\`DatabaseCommit\`)? If you can't answer, scroll back to the trait reveal — you missed the point.`,
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

Staged Sync is the spine of Reth. Instead of "process one block at a time," sync is split into stages, each operating on a range of blocks. Each stage is a Rust type that implements one trait. Read the trait, and you've read the architecture.

> 🛑 **Predict before scrolling.** You've been told to sync 20 million blocks from genesis. What stages would *you* split it into?
>
> Write down 5-7 stages from first principles — not the names from existing implementations. What runs first? What can be done in parallel? What needs the previous stage's output?
>
> The point isn't to be right. It's to have an opinion before you see Paradigm's answer.

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

Notice the **symmetry**: every stage has both \`execute\` and \`unwind\`.

> 🛑 **If \`unwind\` weren't here, how would Reth handle a chain reorg?** Predict the alternative architecture — what additional code paths would a "no unwind" design need? Spoiler: it gets ugly fast.

Reorgs aren't a special case — they're a **normal mode of operation**. Going forward = call \`execute\` over a range. Going back = call \`unwind\` over a range. **Same trait, two directions.** This is why Reth doesn't have a separate "reorg path" eating up half the codebase.

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

> 🛑 **Anti-fluency.** Why is \`done\` returned as a flag inside \`ExecOutput\` rather than as a separate method like \`has_more()\`? What design constraint is that choice serving? (Hint: think about how the orchestrator schedules stages.)

## What \`#[auto_impl(Box)]\` buys you

The orchestrator stores stages as \`Box<dyn Stage<...>>\` so it can hold a heterogeneous list. \`auto_impl\` derives \`Stage\` for \`Box<S: Stage>\` automatically — without it, you'd manually forward every method through the box.

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

> 🛑 **Compare your prediction.** What stages did you miss? What did you guess that's NOT here? **The interesting question is the second one** — Paradigm's omissions are often more revealing than their inclusions.

> 🔍 **Why is MerkleStage *after* hashing, not interleaved?** What ordering constraint is being respected? (Hint: a Merkle root needs sorted leaves. What does that say about how hashing must be staged?)

> 🔍 **Could AccountHashingStage and StorageHashingStage run in parallel?** They take similar input from ExecutionStage. Predict yes/no — then verify by opening one of them.

## Drill

In the \`reth\` repo, open \`crates/stages/stages/src/stages/sender_recovery.rs\`:

> 🛑 **Before opening: predict.** In one sentence, what does \`SenderRecoveryStage::execute\` do? What's the "compute" inside it? What's the "I/O" around that compute? Hold your sentences.

1. Find the \`execute\` method
2. Spot the **batch loop** — it processes blocks in chunks, not all at once. **Why chunks instead of one block at a time? Why not all blocks at once?**
3. Find where it returns \`done: false\` vs \`done: true\` — what condition flips it?
4. Look at the parallelism — \`SenderRecoveryStage\` uses Rayon to recover senders across CPU cores. **Why is sender recovery the stage that benefits most from parallelism?**

You're now reading the same code Paradigm uses to keep Reth in sync.

> Final check: explain in one sentence why staged sync is faster than block-by-block sync. If your answer is "parallelism," go deeper — what specifically gets batched, sorted, or amortized? The lesson isn't done with you until you can name three.`,
                },
                {
                  title: 'Rust: lifetimes, Box, Arc, dyn Trait',
                  slug: 'rust-lifetimes-arc-dyn-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 30,
                  content: `# Rust: lifetimes, Box, Arc, dyn Trait

Four "advanced but actually simple" Rust features you need to read ExEx and Reth SDK code. **This lesson tests you, not teaches you** — if you stumble on the predict prompts, the gap is real and worth closing.

> 🛑 **Cold start: define each in one sentence.** Without scrolling:
> - \`'a\` (a lifetime parameter)
> - \`'static\`
> - \`Box<T>\`
> - \`Arc<T>\` (vs \`Rc<T>\`)
> - \`Mutex<T>\`
> - \`dyn Trait\`
>
> If you stumbled on more than two, this lesson earns its place. If you breezed through, the lesson tests whether your definitions are *actually right*.

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

> 🛑 **Anti-fluency.** Delete the \`'a\` annotations from \`longest\`. What error does the compiler give? Be precise — name the rule it cites.

### \`'static\`

\`'static\` means **"lives for the entire program."** String literals are \`&'static str\`:

\`\`\`rust
let s: &'static str = "hello";
\`\`\`

Long-running tasks (like ExEx) often require \`'static\` bounds because they can outlive any local scope.

> 🛑 **Predict.** When does a closure passed to \`tokio::spawn\` need to be \`'static\`? Why? Answer before continuing — this exact bound shows up in every ExEx file you'll ever read.

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

> 🛑 **Predict.** Without \`Box\`, why can't you write \`enum List { Cons(i32, List), Nil }\`? Spell out the compiler's complaint.

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

> 🛑 **Anti-fluency.** \`Arc::clone(&x)\` doesn't deep-copy the inner \`T\`. So what does it copy, exactly? What's the cost? Why "atomic" in "Arc"?

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

> 🛑 **Predict.** What does \`.lock().unwrap()\` panic on? When does that happen? (Hint: search for "poisoning" if you don't know.) **Reth code uses \`.lock().unwrap()\` everywhere — understand when it can crash.**

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

> 🛑 **Anti-fluency.** \`Box<dyn Greet>\` is more expensive than \`Box<En>\` at the call site. **Where exactly is the cost?** What's a vtable? If you can't answer, you don't yet understand dynamic dispatch — re-read.

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

> 🛑 **Stop. Annotate this signature in your head before scrolling.** Which piece is generics? Which is a trait bound? Which uses shared ownership internally? Which lifetime is implicit?

- \`Node: FullNodeComponents\` — trait bound
- \`ExExContext<Node>\` — generic over the node bundle
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

> Final check: close this tab. Write the ExEx \`my_exex\` signature from memory. If you can't, you don't yet own the vocabulary — open it back up. The next lesson reads ExEx in detail; you'll need each of these without the cheat sheet.`,
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

> 🛑 **Predict before scrolling.** Reth needs to tell your code about every new block. **Sketch the API.** What does Reth send you on every commit? On a reorg? How does your code tell Reth "I'm done with block N — you can prune"? Hold your guess.

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

> 🛑 **Stop. Without scrolling, name the three notification types this code handles.** Why does it handle all three? What would happen if you removed two of the three match arms?

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

> 🛑 **Predict.** Why is the init/run split necessary? What concrete bug would happen if you put file-open inside \`exex\` (the long-running loop) instead of \`exex_init\`?

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

> 🛑 **Anti-fluency.** You're indexing transactions to a HashMap. You handle only \`ChainCommitted\`. The chain reorgs 5 blocks deep. **What's wrong with your HashMap?** Be specific — write the failure mode in two sentences. Then ask: how does \`ChainReverted\` save you?

### The \`FinishedHeight\` event

\`\`\`rust
if let Some(committed_chain) = notification.committed_chain() {
    ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
}
\`\`\`

This tells Reth: "I've processed up to this block hash; you can prune older history that I'd no longer need." Without it, **Reth keeps everything forever** because it doesn't know what your ExEx still wants to read.

> 🛑 **Predict the disk consequence.** You ship an ExEx without the \`FinishedHeight\` event. Six months later your node is at block 21M. What's the disk usage relative to a node without ExEx? Why?

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

> 🔍 **Open \`rollup\`.** Read until you find where it commits state changes. **A rollup as an ExEx — sit with that for a moment.** That's the architectural unlock.

## Drill

1. Clone \`reth-exex-examples\`, run \`minimal\` against a synced node
2. Modify the \`ChainCommitted\` arm to print the **transaction count** of each block: \`new.tip().body.transactions.len()\`
3. Add a \`HashMap<Address, u64>\` that counts how many txs each address sent — survive a reorg correctly (subtract on \`ChainReverted\`, re-add on \`ChainCommitted\` for the new chain)

When that works, you've written a node-speed indexer.

> Final check: in one sentence, why is an ExEx-based indexer faster than a separate process polling the RPC? If your answer doesn't mention "same process" or "no I/O round trip," you missed the architectural reason — re-read the diagram.`,
                },
                {
                  title: 'Reth SDK — building an App-chain',
                  slug: 'reth-sdk-appchain-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# Reth SDK — building an App-chain

ExEx extends an existing Ethereum node. The Reth SDK lets you build **your own App-chain** in Rust by composing components. This is the lesson where "purpose-built EVM L1" stops being a thesis and starts being a binary you can compile.

> 🛑 **Predict before scrolling.** You're building Tempo (a payments-focused L1). Which Reth components do you need to swap? Which can you keep as-is? Write a list of 3-4 swaps before reading the example.

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

That's a working chain binary. ~30 lines.

> 🛑 **Stop. Without scrolling, name the four chained calls** (\`with_types\`, \`with_components\`, \`with_add_ons\`, \`launch\`). What does each one decide? Hold your guess — compare below.

Read the four key calls in the chain:

### \`.with_types::<EthereumNode>()\`
Picks the **type bundle** — chain spec, primitives (block, tx, header types), engine API. \`EthereumNode\` ships defaults; replace with \`OpNode\`, your custom types, or any \`NodeTypes\` impl.

### \`.with_components(...)\`
This is where customization lives. You take the base set (\`EthereumNode::components()\`) and override individual builders:

- \`.pool(CustomPoolBuilder::default())\` — custom transaction pool (the example does this)
- \`.network(...)\` — custom P2P
- \`.payload(...)\` — custom block builder
- \`.executor(...)\` — custom EVM executor (this is where custom opcodes/precompiles plug in)
- \`.consensus(...)\` — custom consensus

> 🛑 **Anti-fluency.** Pick *one* component above. Sketch the trait you'd implement to swap it. (Just the method signatures — no real impl needed.) If you can't, you don't yet "see" the customization point — open the source for that builder before continuing.

### \`.with_add_ons(...)\`
RPC namespaces, engine API extensions, ExEx installations. \`EthereumAddOns::default()\` gives you the standard Ethereum RPC; you can chain \`.install_exex(...)\` here.

### \`.launch()\`
Boots everything: opens MDBX, starts P2P, spawns Tokio tasks for stages, exposes RPC. Returns a \`NodeHandle\` you can \`wait_for_node_exit\` on.

\`\`\`mermaid
flowchart TB
    Builder[Cli builder] --> Types[".with_types EthereumNode"]
    Types --> Comps[".with_components"]
    Comps --> Pool["pool — admission rules"]
    Comps --> Net["network — P2P"]
    Comps --> Exec["executor — EVM, opcodes, gas"]
    Comps --> Cons["consensus — PoS / HyperBFT / etc."]
    Comps --> Payload["payload — block building"]
    Comps --> AddOns[".with_add_ons RPC + ExEx"]
    AddOns --> Launch[".launch — your chain"]
\`\`\`

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

> 🛑 **Predict before reading.** For each of these chains, **which Reth components do they swap?** Make a guess for all three:
> - **Hyperliquid HyperEVM**
> - **Tempo**
> - **Berachain (bera-reth)**
>
> Then check below.

- **Hyperliquid HyperEVM** — HyperBFT + custom execution + order-book-coupled DB
- **Tempo** — payment-specialized priority lanes
- **Berachain (bera-reth)** — Proof of Liquidity consensus

These all replace one or more \`with_components\` builders with their own. The framework above is what they extend. **Compare to your prediction** — what did you get right? What surprised you?

## Drill

1. Clone \`reth\` and \`cd examples/custom-node-components\`
2. Read \`CustomPoolBuilder\` — see how it implements \`PoolBuilder\` to swap the pool
3. Modify it to **log every transaction's gas price** as it enters the pool
4. \`cargo run\` against a dev chain. Watch your custom log fire.

Now you've shipped a 1-line component swap. Scale this pattern to consensus or executor and you're building HyperEVM-class infra.

> Final check: in one sentence, why is the Reth SDK's component-builder pattern more useful for shipping a purpose-built L1 than forking the entire codebase? If your answer doesn't mention "you only own the parts you change," re-read \`with_components\` — that's the entire architectural idea.`,
                },
                {
                  title: 'Bridge to Expert — what comes next',
                  slug: 'reth-bridge-to-expert-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 10,
                  xpReward: 20,
                  content: `# Bridge to Expert — what comes next

> 🛑 **Gate check.** Before claiming you've finished Advanced, answer these — out loud or on paper, no scrolling back through previous lessons:
>
> 1. What does \`popn_top!\` expand to? Why does it use \`unwrap_unchecked()\` inside \`unsafe\`?
> 2. Why are \`Database\` and \`DatabaseRef\` separate traits? What does the asymmetric \`auto_impl\` list (\`&mut, Box\` vs \`&, &mut, Box, Rc, Arc\`) tell you?
> 3. What does \`ExExEvent::FinishedHeight\` tell Reth's pruner — and what's the disk consequence of forgetting it?
> 4. Why is \`MerkleStage\` *after* hashing, not interleaved?
> 5. To ship a purpose-built L1 like Tempo, which Reth components do you swap?
>
> **Got fewer than 4 right?** Don't continue. Go back to the relevant Advanced lesson. Expert assumes these as fluent vocabulary, not concepts you'll re-look-up.

If you cleared the gate: you've climbed **Alloy → Revm → Reth (Staged Sync, ExEx, custom NodeBuilder)**. You can read the source of all three with intent.

But "reading" is only half. **Expert** crosses from "I can read it" to "I can ship it in production."

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

Advanced taught you the **structures**. Expert teaches you the **decisions** behind them.

> 🛑 **Predict the answers before reading mine.** Have an opinion first — even a wrong one. Engineers shipping infra do.
>
> - *Why* does Reth use MDBX and not RocksDB?
> - *Why* does Revm pop one and write through a reference instead of pop/pop/push?
> - *Why* does \`#[track_caller]\` matter on \`Database::tx()\`?
> - *Why* are Foundry cheatcodes precompiles and not opcodes?

---

Now mine:

- **MDBX vs RocksDB** — read latency under compaction stalls.
- **Pop-one-write-through** — one fewer memory write per ADD opcode.
- **\`#[track_caller]\`** — panic backtrace shows the buggy caller, not the trait method.
- **Cheatcodes as precompiles** — consensus compatibility with vanilla EVM (precompiles are reserved addresses, not new opcodes — your fork still parses mainnet bytecode).

The point isn't that you matched my wording. The point is: did you have an *opinion* before reading? **Once you internalize the *why*, you can defend design choices to a Paradigm engineer or a Hyperliquid validator op — and that's the gate to grant-eligible work.**

## Before you continue

If the Gate check at the top felt easy, jump into Expert.

If any of the five questions sent you back to a previous lesson — re-read them now. Expert is denser. Running the linked code locally as you go is no longer optional.

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
                      question: "Which of these is `crates/interpreter` in Revm responsible for?",
                      options: [
                        'Defining the EVM type system primitives (Address, U256, B256)',
                        'Implementing each EVM opcode in Rust',
                        'Holding the Database trait and the state-supply interface',
                        'Building the instruction dispatch table at runtime',
                      ],
                      correctIndex: 1,
                      explanation: 'crates/interpreter holds the per-opcode implementations: ADD, MUL, PUSH, JUMP, SLOAD, SSTORE, etc. (Primitives live in crates/primitives. The Database trait lives in crates/database-interface. The dispatch table is built at compile time, not runtime.) If you guessed runtime dispatch — re-read the custom opcodes lesson.',
                    },
                    {
                      question: 'What does adding a custom opcode to a Revm-based fork actually let you do?',
                      options: [
                        'Override how a standard opcode (like ADD) computes its result for all clients',
                        'Provide a fast, single-instruction shortcut on your own chain — consensus-incompatible with mainnet',
                        'Add a precompile callable at a fixed address from any Solidity contract on mainnet',
                        'Reduce gas costs for the same opcode without forking',
                      ],
                      correctIndex: 1,
                      explanation: 'Custom opcodes occupy unallocated bytes (e.g. 0x0C). Mainnet does not know your opcode, so any block using it cannot be replayed by go-ethereum. The shortcut is real *inside your fork*. Precompiles are a different mechanism (reserved addresses, not new opcode bytes) and gas costs cannot be cheaper without forking consensus.',
                    },
                    {
                      question: "The main role of Revm's `Database` trait is:",
                      options: [
                        'To commit EVM state changes back to the underlying storage',
                        'To supply account info, contract code, storage slots, and past block hashes that the EVM needs to execute',
                        'To handle the gas-accounting hot path',
                        'To provide the dispatch table from opcode bytes to functions',
                      ],
                      correctIndex: 1,
                      explanation: 'Database is the read-side state source. Writes go through DatabaseCommit. Gas accounting is internal to the interpreter. Dispatch is the instruction table. Different Database impls let you back the EVM with in-memory data, JSON-RPC (forked mainnet), production MDBX, or anything else.',
                    },
                    {
                      question: "What's the actual advantage of Reth's Staged Sync over block-by-block sync?",
                      options: [
                        'Allows blocks to be downloaded but never executed, saving disk',
                        'Processing in stages over block ranges maximizes I/O, CPU, and cache efficiency — and makes reorgs symmetrical via unwind',
                        'Skips Merkle root computation by deferring it indefinitely',
                        'Removes the database — state is derived on demand at query time',
                      ],
                      correctIndex: 1,
                      explanation: 'Staged Sync (Headers → Bodies → Senders → Execution → Hashing → Merkle → TxLookup → Indexes → Finish) processes ranges per stage. Sender recovery parallelizes via Rayon. Hashing is sorted before MerkleStage runs. And every stage has both `execute` and `unwind` — making reorgs a normal mode of operation, not a special case.',
                    },
                    {
                      question: 'What can you do with ExEx (Execution Extensions)?',
                      options: [
                        'Inject custom logic into the JSON-RPC pipeline before responses are sent',
                        'Run Rust code in-process on every chain commit, reorg, or revert at near-execution-time latency',
                        'Override how transactions are gossiped on the P2P network',
                        "Replace Reth's consensus engine with a custom one",
                      ],
                      correctIndex: 1,
                      explanation: 'ExEx receives ChainCommitted / ChainReorged / ChainReverted notifications in-process — perfect for indexers, MEV pipelines, and real-time risk engines. (RPC customization is via add_ons, network and consensus customization is via with_components — different SDK surfaces.)',
                    },
                    {
                      question: 'Which of these is the realistic customization surface when building an App-chain with the Reth SDK?',
                      options: [
                        'Only the chain ID and gas limit at the genesis level',
                        'Pool, network, payload, executor (EVM), and consensus components — plus RPC and ExEx via add-ons',
                        'Only Stage<Provider> implementations — the rest is locked',
                        'Database tables and indices only — the EVM itself is fixed',
                      ],
                      correctIndex: 1,
                      explanation: 'The SDK exposes `with_components.{pool, network, payload, executor, consensus}` plus `with_add_ons` for RPC and ExEx. Everything from a custom mempool (Tempo-style priority lanes) to a custom consensus (HyperBFT) to a custom EVM (custom opcodes / precompiles) is one builder swap away.',
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
