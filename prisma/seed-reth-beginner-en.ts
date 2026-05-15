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
      duration: 75,
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

\`\`\`mermaid
graph TD
    Reth["Reth — full node"]
    Revm["Revm — EVM execution engine"]
    Alloy["Alloy — primitives, signing, RPC"]
    Reth -->|uses| Revm
    Reth -->|uses| Alloy
    Revm -->|uses| Alloy
\`\`\`

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

## Where Reth fits in the EVM client landscape

Reth is **not the only Ethereum execution client** — and not the dominant one yet. Per [clientdiversity.org](https://clientdiversity.org/) (May 2026):

| Client | Approx. share | Language |
| :--- | :--- | :--- |
| **Geth** | ~50% | Go |
| **Nethermind** | ~25% | C# |
| **Besu** | ~9% | Java |
| **Reth** | **~7-12%** | **Rust** |
| **Erigon** | ~7% | Go |

Two things follow from this picture:

1. **Reth is emerging, not dominant.** It grew from <1% at its 2023 release to today's ~7-12% in three years — a fast trajectory, but Geth still serves the majority of mainnet RPC calls you make. **The Alloy code you write will mostly talk to Geth-served chains in production.** That's fine — Alloy speaks to any execution client over JSON-RPC.

2. **Revm-based simulation needs to match what production clients do.** When you run a transaction in a local Revm fork (the pattern you'll use in Intermediate + Building tiers), the result has to match what a Geth or Nethermind node would produce for the same transaction. This usually just works — Revm follows the EVM spec — but the discipline of **validating Revm against a non-Revm provider** is a production must. The Building tier capstone covers this.

So when you hear "the Rust EVM stack," read it as **emerging + extensible**, not as "winner take all." The reason Paradigm + Hyperliquid + Tempo build on Reth/Revm is what they enable (modularity, embeddability, performance), not market share.

## Suggested learning order

> **Alloy → Revm → Reth**
>
> Going micro (types) → middle (execution) → macro (whole node) is the path of least friction.

The next tier of this course (**Fundamentals**) starts by getting your hands on Alloy directly. But before we set up Rust, one objection that always comes up is worth addressing head-on: *"Solana is also Rust — why bother with EVM at all?"* That's the next lesson.`,
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

## The 2026 reality — not "either/or" but "intersection"

The picture has gotten more interesting. **Tempo** — a Reth-based payments abstraction layer — is emerging as the connective tissue between Stripe (fiat-side distribution) and Solana (crypto-side distribution). When Meta launched USDC payments, they didn't build their own chain — they composed existing networks (Solana + Stripe). Stripe is a central player in Tempo, so the structural connection Meta — Stripe — Tempo — Solana is forming.

So the question shifts from "should I learn Solana or Rust EVM" to **"which distribution do I want to bet on."** The Rust EVM side (this course) covers: app-chains (Hyperliquid), stablecoin payments (Tempo), L2s (Base / OP-Reth) — Reth is becoming the foundation for "Stripe-of-crypto"–style infrastructure.

> **Key point**: Stablecoins are the base currency of DeFi. Owning a stablecoin payment rail also means opening the path to DeFi onboarding later. Today, Stripe / Tempo abstract crypto away to onboard TradFi users — but lending, swap, and perps will eventually layer on top of that rail. Reth/Revm engineers who can read **both the rail and the protocol** sit in scarce-talent territory.

## Next up

Now that you can place these projects on a map, let's get Rust running on your machine.`,
                },
                {
                  title: 'From Solana / Anchor to Reth — what carries over (skip if not from Solana)',
                  slug: 'solana-to-reth-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 20,
                  content: `# From Solana / Anchor to Reth — what carries over (skip if not from Solana)

> 📌 **Audience.** This lesson is **only useful if you've shipped on Solana** — Anchor program, Jito MEV bot, Solana program tests, Firedancer contributor, anything with \`solana-program\` or \`anchor-lang\`. If you've never touched Solana, skip to *Set Up Rust*. Nothing in the rest of the curriculum depends on this lesson.

Most curricula assume you're coming from Solidity. You're not — you're coming from Rust on a fundamentally different runtime model. This lesson is the translation layer.

## 1. What carries over (a lot, actually)

Your hard-won skills on the Solana side **all stay valuable** in the Rust EVM stack:

| Skill from Solana | How it lands here |
| :--- | :--- |
| **Rust ownership / lifetimes / async** | Identical. You skip ~3 weeks of "Rust onboarding" that Solidity migrants need. |
| **Reading low-level systems code** | Reth and Revm are denser than \`solana-program\`, but the *reading discipline* is the same — work outside in, trust trait shapes, verify against tests. |
| **Mental model for "engine you don't own"** | If you've patched Firedancer or read Jito's relayer source, the Reth fork model is immediately legible. |
| **Comfort with parallel execution** | Sealevel made you think about concurrent state access. Reth's stage pipeline runs different concerns concurrently; the muscle transfers. |
| **\`cargo\` toolchain fluency** | Same. Workspaces, features, \`cargo expand\` for macro debugging — all of it. |

The honest framing: **your Rust skills are an asset most EVM-side engineers don't have**. The curriculum's harder section — *Bridge to Intermediate*'s Rust module — is mostly review for you.

## 2. What's structurally different

The model gap that *does* matter:

| Concept | Solana | Reth / EVM |
| :--- | :--- | :--- |
| **State** | Per-account, declared in advance (account model) | Per-contract storage, dynamic (\`SLOAD\` / \`SSTORE\` on slot keys) |
| **Parallelism** | Per-account, runtime-scheduled (Sealevel) | Sequential within a block; ExEx / Reth SDK lets you add parallel components |
| **Programs** | One global program, accounts passed in | Each contract is its own deployed bytecode with its own storage |
| **Compute units** | Linear gas-like budget per tx | EVM gas with non-trivial cost curves per opcode |
| **Verification** | BPF VM with custom syscalls | EVM with EOF + spec-tests |
| **Wallet / signer** | Ed25519 throughout | secp256k1 mostly, eventually post-quantum via account abstraction |

The biggest mental flip: **storage is per-contract, not per-account**. In Solana you pass the account that holds the state; in EVM the contract *is* the state. Read this carefully when you reach Inside Revm's \`Database\` trait — that trait is the EVM-side answer to "what AccountInfo do I touch?"

> 🛑 **Predict.** You've written a Solana program that updates per-user counters. In EVM, what does the equivalent storage look like? Where does the data live?

A \`mapping(address => uint256) counter\` inside the contract. The contract owns the slot keys; each user's counter is at \`keccak256(user_address . slot)\`. Solana would have one account per user; EVM packs them all into one contract's storage trie. Same problem, different model.

## 3. Where the two stacks meet: HyperEVM, Tempo

These chains are **specifically built to bring Solana-style performance to EVM semantics**. They are the natural landing zone for a Solana migrant:

- **HyperEVM (Hyperliquid)**: Reth fork with HyperBFT consensus. The execution layer runs EVM bytecode at performance levels Solana engineers expect. Reading HyperEVM means you carry your Solana performance intuitions into EVM territory — this is exactly what Inside Reth + the L1 Architect tier prepare you for.
- **Tempo**: a Reth-based payments chain backed by Stripe. Designed for high-throughput stablecoin transfers. Solana's payment-rail experience (Stripe's earlier Solana integration was the predecessor) translates directly.
- **MegaETH**: another Reth-based high-performance chain pursuing Solana-like UX.

**The Solana → Reth path is not a downgrade.** It's a move from a chain-specific runtime to an execution engine that the next generation of high-performance L1s and L2s are building on. The Rust EVM stack is where your skills compound.

## 4. The specific cultural difference: source-first vs abstraction-first

This is the point Solana engineers tell us about most:

- **Anchor**: heavy abstraction. The framework hides the SVM, hides the serialization, hides the account validation. You write \`#[derive(Accounts)]\` and trust it. When something breaks, the trail to the actual SVM behaviour is long.
- **Firedancer / Jito**: source-first. You read the C, you read the relayer, you patch and rebuild. Excellent culture, narrow access (Firedancer's contribution funnel is effectively closed; Jito is open but Solana-specific).
- **Reth / Revm / Foundry**: source-first by *design*, with *broad* contribution access. The maintainers explicitly publish "read this, ship a custom node" patterns. This is the discipline RethLab is built around.

If Anchor's abstraction felt opaque to you, RethLab will feel like home. If you enjoyed reading Firedancer / Jito but wanted a broader application surface, the Rust EVM stack is the larger version of that.

## 5. The curriculum, mapped for you

Given your Rust background, here's an honest recommendation on which lessons you can skip / accelerate:

| Section | Recommendation |
| :--- | :--- |
| **Beginner — *Set Up Rust*** | Skim. You have \`rustup\`. |
| **Fundamentals — Rust async / traits / generics** | Skim. You have this. |
| **Fundamentals — EVM concepts** | **Read carefully.** This is where your model differs from Solana. |
| **Bridge to Intermediate — EVM at the bytes level** | **Read carefully.** Dispatch loop, gas, call frames — all new. |
| **Bridge to Intermediate — Rust for source-reading** | Skim. Generics, Arc, unsafe, macros — review for you. |
| **Inside Revm / Inside Reth / Inside Alloy** | **Read carefully.** The payoff. |
| **L1 Architecture (Advanced) tier** | **The reason you came.** Especially Consensus + Cross-Chain Bridges. |
| **Expert + Building** | The output. Apply what you read. |

## 6. The bet you're making

Solana's runtime is good but Solana-specific. Reth is the **substrate for many chains** — Hyperliquid, Tempo, OP-Reth, MegaETH, Berachain — and the count keeps growing. The Rust EVM stack is where your skills compound across the broader L1/L2 surface, not just one chain.

This isn't a takedown of Solana. It's the observation that **the engineers who can read Reth are scarcer than the engineers who can read Solana programs, and the chains betting on Reth are growing fast**. Your Solana-trained Rust intuitions land you in that scarce-talent niche faster than anyone migrating from Solidity.

## Next up

You can either skip *Set Up Rust* and head straight to *Fundamentals* (Rust toolchain is yours already), or skim *Set Up Rust* to install Foundry / Anvil if you haven't seen those tools.
`,
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
                  type: 'QUIZ',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 25,
                  content: `# First homework: 0x check

The simplest possible task:

> Given a string that's supposed to be an Ethereum address, check whether it starts with \`0x\` and print a message. As a stretch: also verify the length (42 characters total).

## What you'll need

This is your first Rust program in the EVM stack tradition. Three primitives appear in every Rust program you'll ever write:

1. **Variables** — \`let\` and \`let mut\` (we just covered these)
2. **Methods** — Rust strings have built-in methods. There's one that checks whether a string begins with another string. **Find it in the std docs**: [\`&str\` documentation](https://doc.rust-lang.org/std/primitive.str.html)
3. **Conditionals** — \`if\` / \`else\`

You also need to know the **length** of an Ethereum address. Look it up if unsure (hint: 40 hex chars + the \`0x\` prefix).

## Try it yourself

Open [Rust Playground](https://play.rust-lang.org/) and write a function with this signature:

\`\`\`rust
fn is_valid_address(addr: &str) -> bool {
    // your code
}
\`\`\`

Test it against:

\`\`\`rust
fn main() {
    println!("{}", is_valid_address("0x1234567890abcdef1234567890abcdef12345678")); // true
    println!("{}", is_valid_address("1234567890abcdef1234567890abcdef12345678"));   // false
}
\`\`\`

A few hints if you get stuck:

- \`addr.\`-something — there's a method on \`&str\` whose name is exactly what you want
- \`addr.len()\` returns the character byte length
- Two boolean conditions are joined with \`&&\`

Don't peek at the answer until you've **tried writing it**. The whole point of Rust is the compiler teaches you — let it.

## Quiz

Once you've written and run your version, take the quiz below. Each question targets a specific Rust idiom — you should be able to answer them all from the experience of having written this function.`,
                  quizQuestions: [
                    {
                      question: "Which Rust expression correctly checks whether the string `address` starts with `\"0x\"`?",
                      options: [
                        '`address.has_prefix("0x")`',
                        '`address.starts_with("0x")`',
                        '`address.contains("0x")`',
                        '`address[0..2] == "0x"`',
                      ],
                      correctIndex: 1,
                      explanation: '`starts_with` is the standard `&str` method. `has_prefix` does not exist. `contains` matches anywhere in the string, not just the start. Direct slice indexing on `&str` panics if the boundary isn\'t a UTF-8 char boundary, so it\'s unsafe as a general check.',
                    },
                    {
                      question: 'A complete validity check for an Ethereum address string requires:',
                      options: [
                        'just confirming the `0x` prefix',
                        'the `0x` prefix, exact length of 42, and all hex digits after the prefix',
                        '40 characters and all hex digits',
                        'nothing — just receive it as `Address` type instead of `&str`',
                      ],
                      correctIndex: 1,
                      explanation: 'A canonical Ethereum address is 40 hex digits (20 bytes), prefixed with `0x`, total 42 characters. All three checks together prevent garbage input. Note: in production Rust EVM code you\'d usually parse into `Address` directly via `address.parse::<Address>()` and let Alloy do this.',
                    },
                    {
                      question: 'Why does Rust let you write `if condition { a } else { b }` as an expression?',
                      options: [
                        'Because Rust has no ternary operator (`?:`), so `if/else` is the way to express conditional values',
                        'Because it\'s faster than `match`',
                        'Because it lets you skip semicolons',
                        'Because it\'s required for borrow checking',
                      ],
                      correctIndex: 0,
                      explanation: 'Rust intentionally has no ternary operator. Instead, `if/else` is itself an expression that evaluates to a value, so you write `let x = if cond { a } else { b };`. This keeps the language smaller and more uniform.',
                    },
                    {
                      question: 'The Alloy `address!("0x...")` macro provides what benefit over a runtime parse?',
                      options: [
                        'It runs faster at runtime',
                        'It validates the address literal at compile time, so an invalid address fails to compile',
                        'It\'s required for Solidity ABI compatibility',
                        'It encodes the address as ABI bytes',
                      ],
                      correctIndex: 1,
                      explanation: '`address!` is a macro that runs in the compiler. It validates the hex digits and length while compiling. Typo a digit and the program won\'t build — much safer than discovering it at runtime when a user clicks a button.',
                    },
                    {
                      question: 'What does `mut` add to `let mut x = 5;` versus `let x = 5;`?',
                      options: [
                        '`mut` makes access faster',
                        'Without `mut`, you cannot reassign (`x = 6` would be a compile error)',
                        'Without `mut`, you cannot shadow with `let x = ...`',
                        'There is no functional difference',
                      ],
                      correctIndex: 1,
                      explanation: 'Variables are immutable by default in Rust. `mut` permits reassignment. Shadowing with another `let` is independent of `mut` — you can shadow even immutable variables.',
                    },
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
