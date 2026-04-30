import { PrismaClient } from '@prisma/client';

export async function seedRethBeginnerEN(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'beginner'];

  await prisma.course.create({
    data: {
      slug: 'reth-beginner-en',
      title: 'Intro to Reth — Welcome to Rust Ethereum',
      description:
        'Get oriented in the Rust Ethereum stack. Learn what Reth, Revm, and Alloy actually are, why they matter, set up your Rust environment, and run your first small Rust program.',
      difficulty: 'BEGINNER',
      duration: 90,
      xpReward: 150,
      track: 'reth-beginner',
      tags,
      isPublished: true,
      sortOrder: 100,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Why the Rust Ethereum Stack',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Why learn Reth, Revm, and Alloy?',
                  slug: 'why-rust-ethereum-stack-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 20,
                  content: `# Why learn Reth, Revm, and Alloy?

Take a look at the most performant chains being built today — Hyperliquid, Tempo, Monad, Berachain — and you'll find a common pattern: **a Rust implementation of the Ethereum stack**, namely **Reth, Revm, and Alloy**.

## What's the deal?

| | Geth (Go) | Reth + Revm (Rust) |
| :--- | :--- | :--- |
| **Language** | Go | **Rust (memory-safe + fast)** |
| **Design** | Monolithic | **Modular (usable as building blocks)** |
| **Adoption** | Most existing nodes | **App-chains, L2s, MEV infra** |

The decisive property is **modularity**. Reth is not just a node binary — it's an SDK for building blockchains.

## Why now?

- **Hyperliquid's HyperEVM** and **Tempo** use Revm internally
- **Foundry** — the standard Solidity toolkit — runs on Revm
- **OP-Reth** (Optimism) and most **zkEVMs** are built on Revm

In other words, this stack is becoming the **lingua franca of next-gen Ethereum infra**.

## Goals for this course

- Understand the distinct roles of Reth, Revm, and Alloy
- Be able to explain in your own words why this stack is winning
- Set up Rust, write your first program, and graduate to the Fundamentals tier

By the end, you'll have "I know some Rust and I know what these projects do" — enough to start using Alloy directly in the Fundamentals course.`,
                },
                {
                  title: 'Reth, Revm, Alloy — three pillars',
                  slug: 'three-pillars-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 20,
                  content: `# Reth, Revm, Alloy — three pillars

These three names get muddled all the time, but they play very different roles. The cleanest analogy: **building a car**.

| Project | Role | Analogy |
| :--- | :--- | :--- |
| **Alloy** | Library suite (types, signing, RPC) | Engine, tires, screws |
| **Revm** | EVM execution engine | Combustion chamber |
| **Reth** | Full node implementation | The finished car |

## Direction of dependency

- **Reth** depends on **Alloy** and **Revm** internally.
- "Learning Reth" automatically means touching Alloy and Revm.

## What each one is for

### Alloy (you'll touch this most often)
- Primitives like \`Address\`, \`U256\`
- Signing via \`PrivateKeySigner\` (EIP-191, EIP-712, etc.)
- JSON-RPC clients via \`Provider\`
- The successor to \`ethers-rs\`

### Revm
- Smart contract **simulation** (compute outcomes before paying gas)
- Custom execution engines (custom opcodes, custom gas)
- High-speed tracing and backtesting

### Reth
- Run a stock Ethereum full node
- Hook into the execution loop with **ExEx (Execution Extensions)**
- Use as the foundation for your own App-chain

## Suggested learning order

> **Alloy → Revm → Reth**
>
> Going micro (types) → middle (execution) → macro (whole node) is the path of least friction.

The next tier of this course (**Fundamentals**) starts by getting your hands on Alloy directly.`,
                },
                {
                  title: 'Why not just use Solana?',
                  slug: 'why-not-solana-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 8,
                  xpReward: 15,
                  content: `# Why not just use Solana?

A reasonable question: "Solana is fast and also Rust — why bother with Rust EVM at all?"

The honest answer is **it depends on what you want to build**, but here's the comparison.

## Side-by-side

| | **Reth stack (Rust EVM)** | **Solana (SVM)** |
| :--- | :--- | :--- |
| **Language** | Rust (infra) + Solidity | Rust (infra + contracts) |
| **Execution model** | Sequential / Parallel EVM | **Fully parallel (Sealevel)** |
| **Learning curve** | Medium-high | **Very high** (custom memory model) |
| **Future flexibility** | **Applies across EVM chains** | Solana-specific |
| **Adopters** | Hyperliquid, Tempo, Monad, Berachain | Solana, Pyth, Jito, Jupiter |

## Why Rust EVM tends to win in 2026

1. **EVM liquidity**: existing wallets, tooling, and developer mindshare carry over
2. **Modularity**: you can reshape the infra to fit your app (Hyperliquid did exactly this with HyperBFT + HyperEVM)
3. **Vertical integration**: optimize app and execution layer together

## How to choose

If your priority is **trend, breadth, and reusability**, Rust EVM wins. Solana is still excellent, but Reth + Revm offers the unique combination of "EVM developer experience × Rust performance."

## Next up

Now that you can place these projects on a map, let's get Rust running on your machine.`,
                },
              ],
            },
          },
          {
            title: 'Set Up Rust',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'rustup and VS Code setup',
                  slug: 'setup-rust-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 15,
                  content: `# rustup and VS Code setup

Surprisingly, the Rust dev environment is just **rustup + a VS Code extension**.

## 1. Install Rust via rustup

\`\`\`bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify
rustc --version
cargo --version
\`\`\`

\`cargo\` is Rust's package manager *and* build tool. Despite the name suggesting "package manager," you'll actually use it for building, testing, and running too — every day.

## 2. Add rust-analyzer to VS Code

Search the extensions marketplace for \`rust-analyzer\` and install it. Without this, Rust development is essentially impossible:

- Real-time type errors
- Autocomplete and "go to definition"
- Inline type hints over variables

> **Tip**: rust-analyzer only activates when the open folder contains a \`Cargo.toml\`. We'll create one in the next step.

## 3. Your first project

\`\`\`bash
cargo new hello_reth
cd hello_reth
cargo run
\`\`\`

If you see "\`Hello, world!\`", you're ready.

## 4. Need to test something quickly?

Use [Rust Playground](https://play.rust-lang.org/). It runs real Rust in the browser — no install needed.

Next, a fast tour of the Rust syntax you'll see throughout the course — then your first challenge.`,
                },
                {
                  title: 'Rust quick reference',
                  slug: 'rust-quick-reference-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 20,
                  content: `# Rust quick reference

A fast tour of the Rust syntax you'll see throughout the course. There's no separate "learn Rust" course here — you pick up the language by going through the EVM material, with explanations the moment you need them.

## 1. Variables: \`let\` and \`let mut\`

Rust variables are **immutable by default**. Add \`mut\` to allow reassignment.

\`\`\`rust
let x = 10;        // immutable
// x = 11;         // compile error

let mut y = 10;    // mutable
y = 11;            // OK
\`\`\`

## 2. Primitive types

| Type | Meaning |
| :--- | :--- |
| \`i32\`, \`i64\` | signed integers |
| \`u32\`, \`u64\`, \`u128\` | unsigned integers |
| \`bool\` | true / false |
| \`&str\` | **borrowed string** (read-only, lightweight) |
| \`String\` | **owned string** (mutable, heap-allocated) |

> The \`&str\` vs \`String\` distinction trips everyone up at first. For now: **\`&str\` is "looking at someone else's house," \`String\` is "owning your own house."** We'll do ownership properly in the next tier.

## 3. Functions

\`\`\`rust
fn add(a: i64, b: i64) -> i64 {
    a + b   // no semicolon → it's an "expression" and becomes the return value
}
\`\`\`

- Parameters use \`name: type\`
- Return type after \`->\`
- The trailing expression (no semicolon) is the implicit return

## 4. Methods

Rust values have methods you call with \`.\`:

\`\`\`rust
let s = "0x123";
s.starts_with("0x");      // true / false
s.len();                  // 5
"hello".to_uppercase();   // "HELLO"
\`\`\`

## 5. Control flow: \`if\` / \`else\`

\`\`\`rust
let n = 7;
if n % 2 == 0 {
    println!("even");
} else {
    println!("odd");
}
\`\`\`

\`if\` is itself an **expression**, so it can produce a value:

\`\`\`rust
let parity = if n % 2 == 0 { "even" } else { "odd" };
\`\`\`

## 6. Printing: \`println!\`

The \`!\` means it's a **macro**, not a function. \`{}\` is a placeholder.

\`\`\`rust
let name = "Alloy";
println!("Hello, {}!", name);          // Hello, Alloy!
println!("{} + {} = {}", 1, 2, 1 + 2); // 1 + 2 = 3
\`\`\`

## 7. Collections: \`Vec\`

A growable array. You'll see it everywhere in EVM code — stacks, transaction lists, byte buffers.

\`\`\`rust
let mut v: Vec<i64> = Vec::new();
v.push(10);
v.push(20);
let last = v.pop();   // Some(20)
println!("{:?}", v);  // [10]
\`\`\`

\`{:?}\` is the **debug** placeholder — handy for printing structures while you're learning.

## 8. That's the minimum

You now have enough Rust to read the first chunks of Alloy code. The next lesson exercises this directly.

| Syntax | One-liner |
| :--- | :--- |
| \`let x = ...\` | immutable variable |
| \`let mut x = ...\` | mutable variable |
| \`fn name(arg: T) -> R {}\` | function |
| \`x.method()\` | method call |
| \`if .. else ..\` | branching (also an expression) |
| \`println!("{}", x)\` | print |
| \`Vec<T>\` | growable list |

> Don't try to memorize. **Recognize it when you see it** — that's the goal here.`,
                },
                {
                  title: 'First homework: 0x check',
                  slug: 'first-homework-en',
                  type: 'CHALLENGE',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 25,
                  challengeLanguage: 'typescript',
                  content: `# First homework: 0x check

The simplest possible task:

> Given a string that's supposed to be an Ethereum address, check whether it starts with \`0x\` and print a message.

## Why this is the right "first step"

1. **Variables** — declaring data
2. **Methods** — calling \`starts_with\` (a built-in)
3. **Conditionals** — \`if / else\`

These primitives appear in every Rust program you'll ever write.

## Rust hint

\`\`\`rust
fn main() {
    let address = "0x1234567890abcdef1234567890abcdef12345678";

    if address.starts_with("0x") {
        // print success
    } else {
        // print error
    }
}
\`\`\`

## Try it

The editor below has a TypeScript version of the same problem. The Rust equivalent is essentially identical — paste the snippet above into [Rust Playground](https://play.rust-lang.org/) and tweak it.

## Stretch goals

- Also check that the address is **42 characters** long (\`address.len()\` in Rust, \`address.length\` in TS)
- Wrap it in a function: \`fn is_valid_address(addr: &str) -> bool\``,
                  starterCode: `function isValidEthAddress(address: string): boolean {
  // TODO: return true if address starts with "0x" and is 42 chars long
  return false;
}

console.log(isValidEthAddress("0x1234567890abcdef1234567890abcdef12345678")); // true
console.log(isValidEthAddress("1234567890abcdef1234567890abcdef12345678"));   // false
`,
                  solutionCode: `function isValidEthAddress(address: string): boolean {
  return address.startsWith("0x") && address.length === 42;
}

console.log(isValidEthAddress("0x1234567890abcdef1234567890abcdef12345678"));
console.log(isValidEthAddress("1234567890abcdef1234567890abcdef12345678"));
`,
                  hints: [
                    'In TypeScript, use String.prototype.startsWith(). In Rust the same method is named starts_with.',
                    'An Ethereum address is 42 characters including the "0x" prefix.',
                    'Use && to combine the two conditions.',
                  ],
                },
                {
                  title: 'Beginner quiz',
                  slug: 'beginner-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 25,
                  content: `# Beginner quiz

Check your grasp on the roles of Reth, Revm, and Alloy.`,
                  quizQuestions: [
                    {
                      question: 'Which mapping is correct?',
                      options: [
                        'Reth = library suite, Revm = node, Alloy = execution engine',
                        'Reth = node, Revm = execution engine, Alloy = library suite (types/RPC/signing)',
                        'Reth = execution engine, Revm = node, Alloy = wallet',
                        'They are all the same project under different names',
                      ],
                      correctIndex: 1,
                      explanation: 'Reth is the full node, Revm is the EVM execution engine, and Alloy provides the foundational types, RPC, and signing libraries.',
                    },
                    {
                      question: 'Why is Revm chosen by Foundry, Reth, and Hyperliquid?',
                      options: [
                        "It's the only Rust EVM in existence",
                        "It's designed as a library, easy to embed and customize, with Rust's performance and safety",
                        'Solidity runs on it without compilation',
                        "It's the only free EVM",
                      ],
                      correctIndex: 1,
                      explanation: 'Revm\'s "library-first" design and Rust performance/safety make it the standard for Foundry, Reth, OP-Reth, zkVMs, and MEV tools.',
                    },
                    {
                      question: 'Recommended learning order in this course?',
                      options: [
                        'Reth → Revm → Alloy (macro to micro)',
                        'Alloy → Revm → Reth (micro to macro)',
                        'Revm → Alloy → Reth',
                        'Any order, learner\'s choice',
                      ],
                      correctIndex: 1,
                      explanation: 'Going from primitives (Alloy) to engine (Revm) to whole-node (Reth) is the lowest-friction path.',
                    },
                    {
                      question: 'Which VS Code extension is essentially mandatory for Rust development?',
                      options: ['Rust Helper', 'rust-analyzer', 'cargo-vscode', 'Rustacean'],
                      correctIndex: 1,
                      explanation: 'rust-analyzer is the official language server providing diagnostics, completion, type hints, and navigation.',
                    },
                    {
                      question: 'Which of the following is NOT a real practical advantage of Rust EVM over Solana?',
                      options: [
                        'EVM ecosystem (wallets, tools) carries over directly',
                        'You can customize the infra layer for your specific app',
                        'It is always faster than Solana in raw throughput',
                        'EVM knowledge applies across many chains',
                      ],
                      correctIndex: 2,
                      explanation: '"Always faster" is wrong. Solana wins on pure TPS in many scenarios. Rust EVM wins on customizability, ecosystem reuse, and Rust safety.',
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
