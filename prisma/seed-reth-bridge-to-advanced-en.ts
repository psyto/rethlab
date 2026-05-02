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
              ],
            },
          },
        ],
      },
    },
  });
}
