import { PrismaClient } from '@prisma/client';

export async function seedRethFundamentalsEN(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'fundamentals', 'evm'];

  await prisma.course.create({
    data: {
      slug: 'reth-fundamentals-en',
      title: 'Reth Fundamentals — Your First Steps with Alloy',
      description:
        'Use Alloy to talk to a real Ethereum node — sign messages, query balances, fetch block numbers — and learn the EVM concepts (stack, memory, opcodes) that you need before reading Revm.',
      difficulty: 'BEGINNER',
      duration: 150,
      xpReward: 250,
      track: 'reth-fundamentals',
      tags,
      isPublished: true,
      sortOrder: 110,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Working with Alloy',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Rust: ownership and borrowing in 5 minutes',
                  slug: 'rust-ownership-borrowing-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# Rust: ownership and borrowing in 5 minutes

> 🧭 **Why this matters:** ownership / borrowing is the foundation under everything concurrency-shaped in the stack — Reth's Tokio runtime, Revm's \`&mut\`-driven execution, alloy's Send-bounded providers. Load it once here and the later concurrency lessons stop feeling like new rules.

The first wall in Rust is **ownership**. You don't need to master it to read Alloy code — you need to **recognize the rules** when they show up.

## 1. Why ownership exists

C/C++ leaves memory management to you. Java/JS hides it behind a garbage collector. Rust takes a third path: **the compiler tracks ownership at compile time** and rejects programs that misuse memory.

The result:

- No garbage collector, no manual \`free\`
- Double-frees and use-after-free become compile errors
- Data races between threads become compile errors

That's the property that makes Rust uniquely good at "money-handling code."

## 2. The three rules

\`\`\`
1. Each value has exactly one owner
2. When the owner goes out of scope, the value is dropped
3. Values are either moved (transferring ownership) or borrowed
\`\`\`

## 3. Move

\`\`\`rust
let s1 = String::from("hello");
let s2 = s1;          // ownership moves s1 → s2
// println!("{}", s1); // ❌ error: s1 no longer valid
println!("{}", s2);   // OK
\`\`\`

## 4. Borrowing with \`&\` (read-only reference)

If you only want to read, don't take ownership — borrow:

\`\`\`rust
fn print_addr(addr: &String) {
    println!("{}", addr);
}

let a = String::from("0xABCD...");
print_addr(&a);   // & lends a
print_addr(&a);   // a still owns it; lend as many times as you want
\`\`\`

## 5. \`&mut\` (mutable reference)

\`\`\`rust
fn append_suffix(s: &mut String) {
    s.push_str("...");
}

let mut a = String::from("Hello");
append_suffix(&mut a);
\`\`\`

**The rule** at any moment, you can have **either**:

- **Multiple \`&\` (read-only)** OR
- **Exactly one \`&mut\` (mutable)**

This is what makes data races a compile error.

## 6. What is \`&str\`, really?

\`&str\` is just a **borrow of a string**. \`String\` owns the characters; \`&str\` is a window into them.

\`\`\`rust
let owned: String = String::from("Hello, Alloy");
let borrowed: &str = &owned;
\`\`\`

When a function takes \`&str\`, it's saying: "I just want to read — I don't need to own this."

## 7. Patterns you'll see in Alloy

\`\`\`rust
// .parse()? — parse and propagate errors
let url = "https://eth.llamarpc.com".parse()?;

// & — pass a borrow, not ownership
provider.get_balance(&address).await?;

// mut — declare a variable as mutable
let mut signer = PrivateKeySigner::random();
\`\`\`

These all flow from the rules above. When you spot \`&\`, \`&mut\`, or \`mut\` in code, the compiler is enforcing one of the three rules behind the scenes.

## Cheat sheet

| Symbol | Meaning |
| :--- | :--- |
| \`x\` | owned |
| \`&x\` | borrow (read) |
| \`&mut x\` | borrow (write) |
| \`mut x\` | variable can be reassigned |

You won't fully internalize ownership until you've fought a few compile errors. That's normal. Move on — the next lesson exercises this.`,
                },
                {
                  title: 'Alloy primitives and signing',
                  slug: 'alloy-primitives-signing-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# Alloy primitives and signing

> 🧭 **Why this matters:** introduces the type-level primitives (\`Address\`, \`U256\`, \`B256\`) and the signature surface that every later networking-layer and authentication-layer lesson reuses. These types are the lingua franca of the Rust EVM stack.

Time to touch **Alloy** directly. Alloy is the de facto Ethereum library suite for Rust, and Reth uses it everywhere.

## 1. Project setup

\`\`\`bash
cargo new hello_alloy
cd hello_alloy
\`\`\`

Add to \`Cargo.toml\` under \`[dependencies]\`:

\`\`\`toml
[dependencies]
alloy = { version = "1.0", features = ["full"] }
tokio = { version = "1", features = ["full"] }
eyre = "0.6"
\`\`\`

> **Tip**: versions move quickly. Check [crates.io](https://crates.io/crates/alloy) for the latest. \`eyre\` gives you nicer error messages.

## 2. Sign a message — real example

This is the entire \`sign_message.rs\` example from [\`alloy-rs/examples\`](https://github.com/alloy-rs/examples/blob/main/examples/wallets/examples/sign_message.rs):

\`\`\`rust
//! Example of signing a message with a signer.

use alloy::signers::{local::PrivateKeySigner, Signer};
use eyre::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // Set up a random signer.
    let signer = PrivateKeySigner::random();

    // Optionally, the wallet's chain id can be set, in order to use EIP-155
    // replay protection with different chains.
    let signer = signer.with_chain_id(Some(1337));

    // The message to sign.
    let message = b"hello";

    // Sign the message asynchronously with the signer.
    let signature = signer.sign_message(message).await?;

    println!("Signature produced by {}: {:?}", signer.address(), signature);
    println!("Signature recovered address: {}", signature.recover_address_from_msg(&message[..])?);

    Ok(())
}
\`\`\`

Copy this into \`src/main.rs\` and run \`cargo run\`. You'll see your random signer's address, the signature, and a recovered address that matches.

\`\`\`mermaid
sequenceDiagram
    participant Signer as PrivateKeySigner
    participant Msg as message bytes
    participant Hash as EIP-191 hash
    participant Sig as Signature
    participant Verify as recover_address_from_msg

    Signer->>Msg: take "hello"
    Msg->>Hash: prefix + keccak256
    Hash->>Sig: sign(privkey, hash)
    Sig-->>Verify: signature + original message
    Verify->>Hash: re-hash with prefix
    Verify-->>Signer: recovered address
\`\`\`

## 3. What this code teaches

### \`PrivateKeySigner::random()\`
Creates a new keypair via secure RNG. **Never use this for real funds** — it's for tests and learning. For production, load from environment variable, encrypted keystore, or hardware wallet.

### \`with_chain_id(Some(1337))\`
EIP-155 wraps the chain ID into the signature so a tx signed for chain A can't be replayed on chain B. This is **non-optional** in production. \`1337\` is the typical local Anvil chain ID.

### \`sign_message(message).await\`
Implements **EIP-191** (the "Ethereum signed message" prefix) — what \`personal_sign\` over JSON-RPC and \`window.ethereum.request("personal_sign", ...)\` produce. The async-ness is because hardware wallets (Ledger/Trezor) take time to respond — even local signers expose the same interface for substitution.

### \`signature.recover_address_from_msg(&message[..])\`
The verification side. Given a signature and the original message, recover the signing address. This is **how you build "sign in with Ethereum"** — the server picks a nonce, the user signs it, the server recovers the address. No password.

## 4. The \`address!\` macro

\`\`\`rust
use alloy::primitives::address;

let recipient = address!("d8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
\`\`\`

\`address!\` is a **procedural macro** that runs at compile time. If you typo a hex digit or get the length wrong, **the program won't compile** — not "fail at runtime when the user clicks send." We'll see exactly how this macro is built in the Expert tier.

## Why types matter so much

Solidity has \`address\` too, but Rust's type system is stricter:

- A function expecting \`U256\` will refuse a \`u64\` at compile time
- \`Address\` is its own type, not a generic 20-byte array
- Mixing up \`Address\` and \`B256\` produces a compile error
- This is what gives Rust EVM code its reputation for safety in money-handling logic

## Drill

Modify the example to:

1. Sign **the same message** with **two different chain IDs** — print the signatures (they should differ)
2. Try \`recover_address_from_msg\` against a **modified** message — the recovered address won't match. **That's EIP-191's tamper resistance.**

Next up: \`Result\`, \`Option\`, and \`?\` — the error-handling vocabulary you'll need before touching a real Provider.`,
                },
                {
                  title: 'Rust: Result, Option, and the `?` operator',
                  slug: 'rust-result-option-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# Rust: Result, Option, and the \`?\` operator

> 🧭 **Why this matters:** \`Result\` and \`Option\` are how every layer of the stack — RPC errors, EVM halts, database misses — talks about failure without hiding it. This lesson loads the vocabulary.

Almost every line of Alloy code ends with \`.await?\` or \`.parse()?\`. Time to understand what \`?\` actually does.

## 1. No exceptions

Rust has no try/catch. Errors are **values returned from functions**:

- A function that can fail returns **\`Result<T, E>\`**
- A function that may not have a value returns **\`Option<T>\`**

Both are \`enum\`s:

\`\`\`rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}

enum Option<T> {
    Some(T),
    None,
}
\`\`\`

## 2. \`Option\`: present or absent

\`\`\`rust
let v: Vec<i32> = vec![1, 2, 3];
let first: Option<&i32> = v.first();   // Some(&1)
let empty: Vec<i32> = vec![];
let none: Option<&i32> = empty.first();// None

match first {
    Some(n) => println!("got {}", n),
    None => println!("empty"),
}
\`\`\`

## 3. \`Result\`: success or failure

\`\`\`rust
fn parse_int(s: &str) -> Result<i32, std::num::ParseIntError> {
    s.parse::<i32>()
}

match parse_int("42") {
    Ok(n) => println!("got {}", n),
    Err(e) => println!("oops: {}", e),
}
\`\`\`

## 4. The \`?\` operator: error propagation

\`?\` says: **"if this is an error, return it from this function right now; if it's Ok, give me the inner value."**

\`\`\`rust
fn parse_two(a: &str, b: &str) -> Result<(i32, i32), std::num::ParseIntError> {
    let x = a.parse::<i32>()?;   // bail on error
    let y = b.parse::<i32>()?;   // bail on error
    Ok((x, y))
}
\`\`\`

Without \`?\`, you'd write the same logic with \`match\` blocks — about three times as much code.

## 5. \`Result<(), Box<dyn Error>>\` and \`eyre::Result<()>\`

Common return types for \`main\`:

| Type | Meaning |
| :--- | :--- |
| \`Result<(), Box<dyn std::error::Error>>\` | std-only (verbose) |
| \`eyre::Result<()>\` | the **\`eyre\`** crate's friendly version (recommended) |

\`eyre\` gives you human-readable error chains and lets different error types compose naturally. Alloy code defaults to \`eyre::Result<()>\`.

## 6. \`unwrap()\` and \`expect()\`

The "ignore the error" escape hatch — fine while learning, **don't ship it**. They panic if the value is \`Err\` or \`None\`.

\`\`\`rust
let n: i32 = "42".parse().unwrap();
let n: i32 = "42".parse().expect("not an int");
\`\`\`

## 7. What this looks like in Alloy

\`\`\`rust
async fn main() -> eyre::Result<()> {
    let provider = ProviderBuilder::new()
        .connect_http("https://eth.llamarpc.com".parse()?);  // ?: parse error → return
    let block = provider.get_block_number().await?;          // ?: RPC error → return
    Ok(())
}
\`\`\`

Almost every line uses \`?\`. Mental model: **"keep going on success, send the error up on failure."**`,
                },
                {
                  title: 'Provider — connecting to a node',
                  slug: 'alloy-provider-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# Provider — connecting to a node

> 🧭 **Why this matters:** your first proper look at the **networking layer's client trait** — the same \`Provider\` trait that the Inside Alloy tier opens up later. Read this for the surface; the buildup chain in Inside Alloy reads the design.

A **Provider** is your gateway to a node. Block numbers, balances, transactions — everything goes through it.

## Minimal example — verbatim

This is a minimal project built around the [\`alloy-rs/examples\`](https://github.com/alloy-rs/examples/blob/main/examples/providers/examples/http.rs) \`http.rs\` example.

First \`Cargo.toml\`:

\`\`\`toml
[package]
name = "hello_provider"
version = "0.1.0"
edition = "2024"

[dependencies]
alloy = "2.0.5"
alloy-provider = "2.0.5"
eyre = "0.6.12"
tokio = { version = "1", features = ["full"] }
\`\`\`

Then \`src/main.rs\`:

\`\`\`rust
use alloy::providers::{Provider, ProviderBuilder};
use eyre::Result;

#[tokio::main]
async fn main() -> Result<()> {
    let rpc_url = "https://ethereum.reth.rs/rpc".parse()?;
    let provider = ProviderBuilder::new().connect_http(rpc_url);

    let latest_block = provider.get_block_number().await?;

    println!("Latest block number: {}", latest_block);

    Ok(())
}
\`\`\`

\`cargo run\` and you should see the current mainnet block number. **This is the seed of every monitoring bot you'll ever write.**

Note the URL: \`https://ethereum.reth.rs/rpc\` is the **public RPC endpoint operated by the Reth project** — your code is literally talking to a Reth node. You're already inside the stack.

## Common Provider methods

| Method | Role |
| :--- | :--- |
| \`get_block_number\` | Latest block number |
| \`get_balance(address)\` | ETH balance |
| \`get_block(...)\` | Full block data |
| \`get_transaction_by_hash(hash)\` | Transaction details |
| \`get_logs(filter)\` | Event logs |

## Pointing at any EVM chain

Just swap the URL. HyperEVM, Optimism, your local Anvil — same code:

\`\`\`rust
let provider = ProviderBuilder::new()
    .connect_http("https://api.hyperliquid.xyz/evm".parse()?); // HyperEVM
let provider = ProviderBuilder::new()
    .connect_http("http://127.0.0.1:8545".parse()?);          // Anvil
\`\`\`

## Local dev with Anvil

[Anvil](https://book.getfoundry.sh/anvil/) (part of Foundry) runs a local Ethereum node. No real money, no rate limits — perfect for learning.

\`\`\`bash
anvil
\`\`\`

## What's next

You can now read state. The next module dives into how the EVM actually executes — stack, memory, opcodes — which prepares you for Revm.`,
                },
                {
                  title: 'Quiz: balance checker',
                  slug: 'balance-checker-challenge-en',
                  type: 'QUIZ',
                  sortOrder: 4,
                  duration: 15,
                  xpReward: 30,
                  content: `# Quiz: balance checker

Goal: write a function that returns \`true\` when a given address has zero ETH balance, \`false\` otherwise.

## What you'll need

Two pieces from Alloy you've already met:

- \`Provider\` — created via \`ProviderBuilder::new().connect_http(url)\` (Provider lesson)
- \`get_balance(address)\` — async method that returns the balance

Plus one bit from the previous Rust lesson: the **\`?\` operator** for error propagation on \`async\` calls (\`x.await?\`).

## Try it yourself

Create a new project locally (Rust Playground has no Alloy):

\`\`\`bash
cargo new balance-check && cd balance-check
\`\`\`

In \`Cargo.toml\`:

\`\`\`toml
[dependencies]
alloy = { version = "1.0", features = ["full"] }
tokio = { version = "1", features = ["full"] }
eyre = "0.6"
\`\`\`

In \`src/main.rs\`, write a function with this signature:

\`\`\`rust
async fn is_empty_wallet(
    provider: &impl Provider,
    address: Address,
) -> eyre::Result<bool> {
    // your code
}
\`\`\`

And exercise it from \`main\`:

\`\`\`rust
#[tokio::main]
async fn main() -> eyre::Result<()> {
    let provider = ProviderBuilder::new()
        .connect_http("https://ethereum.reth.rs/rpc".parse()?);

    let vitalik = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045".parse::<Address>()?;
    println!("vitalik empty? {}", is_empty_wallet(&provider, vitalik).await?);

    Ok(())
}
\`\`\`

Hints if you get stuck:

- \`provider.get_balance(address)\` returns a Future — use \`.await?\` to extract the balance
- The balance type is \`U256\`. There's an idiomatic method on it for the "is this zero?" check — find it in the Alloy docs
- You return \`Ok(...)\` from a function that returns \`Result<...>\`

\`cargo run\` will hit the public Reth RPC and tell you whether Vitalik's wallet is empty (it isn't).

## Quiz`,
                  quizQuestions: [
                    {
                      question: 'Which Rust + Alloy snippet correctly checks whether a wallet has zero balance?',
                      options: [
                        '`provider.balance(addr) == 0`',
                        '`provider.get_balance(addr).await?.is_zero()`',
                        '`provider.is_zero(addr).await?`',
                        '`provider.get_balance(addr) == U256::ZERO`',
                      ],
                      correctIndex: 1,
                      explanation: '`get_balance` is async and returns `Result<U256>`. `await?` waits for the response and propagates errors. `is_zero()` is the idiomatic zero check on `U256`.',
                    },
                    {
                      question: 'Why do we write `.await?` on the line that calls `get_balance`?',
                      options: [
                        '`.await` is decorative; only `?` matters',
                        'Because it\'s an `async fn`',
                        '`.await` waits for the future to resolve, and `?` propagates the error if it fails',
                        '`.await` makes it run faster',
                      ],
                      correctIndex: 2,
                      explanation: 'These are two separate operators composed: `.await` polls the future to completion (since `get_balance` is async), and `?` returns early from the surrounding function if the result is an `Err`.',
                    },
                    {
                      question: 'What happens if you compare `balance` (`U256`) directly to `0u64` with `==`?',
                      options: [
                        'It works because `0` is automatically converted',
                        'It compiles but issues a warning',
                        'Compile error — the types don\'t match',
                        'It panics at runtime',
                      ],
                      correctIndex: 2,
                      explanation: 'Rust does not implicitly convert numeric types. `U256 == u64` is a compile error. You\'d either use `balance == U256::from(0)` or, more idiomatically, `balance.is_zero()`.',
                    },
                    {
                      question: 'What unit does Provider\'s `get_balance` return?',
                      options: [
                        'ETH (a floating point)',
                        'Gwei',
                        'Wei (as a `U256`)',
                        'Lamport',
                      ],
                      correctIndex: 2,
                      explanation: '`get_balance` returns the balance in **wei** as a `U256`. To display ETH you divide by 10^18 — but never as `f64`, since precision matters in money. Use `format_ether` from Alloy.',
                    },
                    {
                      question: 'Why does the function signature take `&impl Provider` rather than a concrete type?',
                      options: [
                        '`impl` is just shorthand syntax — there\'s no real difference',
                        'It accepts any Provider implementation (HTTP, WebSocket, Anvil-fork) — trait-bound polymorphism',
                        'It\'s required by `await`',
                        'To save memory',
                      ],
                      correctIndex: 1,
                      explanation: '`impl Provider` means "some concrete type that implements the `Provider` trait." This lets the same function work against an HTTP provider, a WebSocket provider, or an in-memory test provider — without rewriting it.',
                    },
                  ],
                },
              ],
            },
          },
          {
            title: 'Inside the EVM',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'The EVM is a stack machine',
                  slug: 'evm-stack-machine-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# The EVM is a stack machine

> 🧭 **Why this matters:** introduces the EVM as a **stack machine** — the architectural premise every later VM-layer lesson (Revm internals, opcodes, gas, precompiles) is built on. Same shape as the JVM and CPython VM, restricted for blockchain consensus.

The Ethereum Virtual Machine is a **stack machine**. It has no general registers and no calling conventions in the C sense — almost everything happens on a stack.

## The three "places"

Every EVM instruction reads or writes one of these:

| Place | Property | Purpose |
| :--- | :--- | :--- |
| **Stack** | LIFO, max 1024 deep | Operands and results |
| **Memory** | Volatile within a tx | Temporary scratch space |
| **Storage** | Persistent (expensive) | Contract state |

## How ADD works

The \`ADD\` opcode takes two values from the top of the stack, adds them, and pushes the result back:

\`\`\`
Before: stack [..., 7, 5]
ADD
After:  stack [..., 12]
\`\`\`

That's it: pop, pop, add, push.

## The real Revm \`Stack\`

This isn't theory — it's a struct in [\`crates/interpreter/src/interpreter/stack.rs\`](https://github.com/bluealloy/revm/blob/main/crates/interpreter/src/interpreter/stack.rs):

\`\`\`rust
pub const STACK_LIMIT: usize = 1024;

#[derive(Debug, PartialEq, Eq, Hash)]
pub struct Stack {
    /// The underlying data of the stack.
    data: Vec<U256>,
}
\`\`\`

That's the entire structure: a vector of \`U256\` values, with a hard limit of 1024. The methods you'll see called all over the interpreter:

\`\`\`rust
pub fn new() -> Self
pub fn push(&mut self, value: U256) -> bool
pub fn pop(&mut self) -> Result<U256, InstructionResult>
pub fn peek(&self, no_from_top: usize) -> Result<U256, InstructionResult>
pub fn popn<const N: usize>(&mut self) -> Option<[U256; N]>
pub fn dup(&mut self, n: usize) -> bool
pub fn swap(&mut self, n: usize) -> bool
\`\`\`

Read it carefully:

- **\`push(...) -> bool\`** — \`true\` if pushed, \`false\` on overflow (more than 1024). The interpreter's macros check this and bail to \`StackOverflow\`.
- **\`pop(...) -> Result<...>\`** — explicit underflow detection, returned as \`InstructionResult::StackUnderflow\`.
- **\`popn<const N: usize>()\`** — pop **N values at once**, returning a fixed-size array. The const generic means the compiler unrolls the pop loop. **This is what makes \`popn_top!\` fast.**

## How ADD actually works

Pop two, sum, push back. Pseudocode:

\`\`\`
Before: stack [..., 7, 5]
ADD
After:  stack [..., 12]
\`\`\`

The **real** \`add\` source in Revm — which the Intermediate tier dissects line by line — doesn't even pop both then push: it pops one, writes through a mutable reference to the other. Revm's interpreter is built so the EVM mental model maps directly to Rust, but with cycle-level optimizations layered on.

## Why a stack machine?

- **Simplicity** — small instruction set means fewer consensus bugs
- **Reproducibility** — easy to re-execute and verify
- **ZK-friendliness** — stack semantics map cleanly to constraint systems (you'll see this in zkEVM later)

## Drill

Open \`crates/interpreter/src/interpreter/stack.rs\` in the repo. Find:

1. The \`STACK_LIMIT\` check inside \`push\` — what does it do on overflow?
2. The \`popn\` impl — notice how the const \`N\` lets the compiler skip the loop entirely
3. The \`dup\` and \`swap\` methods — they don't allocate; they just shuffle indices

Now build a tiny stack machine yourself in the next lesson.`,
                },
                {
                  title: 'Quiz: a mini EVM stack',
                  slug: 'mini-evm-stack-en',
                  type: 'QUIZ',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 30,
                  content: `# Quiz: a mini EVM stack

> 🧭 **Why this matters:** your first hands-on **VM-layer** build — a toy EVM with a stack + a few opcodes. The same shape Revm scales to all of EVM; this lesson is the seed.

Build a tiny Rust EVM-style stack with three operations:

- \`push(n)\` — push a number
- \`add()\` — pop two, push their sum
- \`peek()\` — read the top without removing it

You're building the same shape as the real Revm \`Stack\` you read in the previous lesson — just with \`i64\` instead of \`U256\` to keep things simple.

## What you'll need

- A \`struct\` that wraps a \`Vec<i64>\`
- An \`impl\` block with \`new()\`, \`push(&mut self, n)\`, \`add(&mut self)\`, \`peek(&self)\`
- Knowledge of \`Vec::pop\` and \`Vec::last\` return types — what does Rust hand you when the vector is empty?
- Underflow handling: what should \`add()\` do when there are fewer than 2 items?

For the EVM-faithful version, addition wraps modulo (it doesn't saturate or panic on overflow). Look up the right method on integers.

## Try it yourself

In [Rust Playground](https://play.rust-lang.org/), start with this scaffold:

\`\`\`rust
struct MiniEvmStack {
    data: Vec<i64>,
}

impl MiniEvmStack {
    fn new() -> Self {
        Self { data: Vec::new() }
    }

    // TODO: push, add, peek
}

fn main() {
    let mut s = MiniEvmStack::new();
    s.push(100);
    s.push(200);
    s.add().unwrap();
    println!("{:?}", s.peek()); // Should print: Some(300)
}
\`\`\`

Hints:

- \`Vec::pop\` returns \`Option<T>\` — empty case is encoded in the return type
- \`Vec::last\` returns \`Option<&T>\` — borrowed, not copied (cheap)
- \`add\` should return a \`Result<(), &'static str>\` so you can do \`.ok_or("stack underflow")?\` on the pop calls
- For EVM-correct addition, the integer method whose name says "wrap" is what you want

Once it works, mentally compare your design to the real Revm \`Stack\` from the previous lesson — they have the same shape.

## Quiz`,
                  quizQuestions: [
                    {
                      question: 'What is the return type of `Vec::pop`?',
                      options: [
                        '`T`',
                        '`Option<T>` — `Some(value)` or `None` when empty',
                        '`Result<T, Error>`',
                        '`&T`',
                      ],
                      correctIndex: 1,
                      explanation: '`pop` returns `Option<T>`. Rust encodes the "stack might be empty" possibility in the type system, so you cannot accidentally unwrap a missing value without acknowledging it.',
                    },
                    {
                      question: "What is the EVM stack's hard size limit?",
                      options: [
                        '256 items',
                        '512 items',
                        '1024 items',
                        'unlimited (memory permitting)',
                      ],
                      correctIndex: 2,
                      explanation: 'EVM enforces a hard limit of 1024 stack items. Revm has `pub const STACK_LIMIT: usize = 1024;` exactly because of this. Going over yields `StackOverflow`.',
                    },
                    {
                      question: 'For the real EVM ADD opcode, which arithmetic semantics are correct?',
                      options: [
                        '`wrapping_add` — overflow wraps around mod 2²⁵⁶',
                        '`saturating_add` — overflow saturates to max',
                        '`checked_add` — returns `Option`, panics on overflow',
                        'Any of the above is fine',
                      ],
                      correctIndex: 0,
                      explanation: 'EVM uses wrap-around (modulo 2²⁵⁶) arithmetic. This is what Solidity\'s `unchecked { ... }` blocks expose, and what you must use to match consensus. `saturating` or `checked` would diverge from the spec.',
                    },
                    {
                      question: "Why does Revm's `popn_top!` macro use `unwrap_unchecked()` (in `unsafe`) instead of `unwrap()`?",
                      options: [
                        "It's a bug — `unwrap()` would also work",
                        'The length is checked just before, so the panic path is dead code; `unwrap_unchecked` lets the compiler eliminate it from the hot path',
                        'For thread safety',
                        'To save memory',
                      ],
                      correctIndex: 1,
                      explanation: 'The macro guards with a length check, then uses `unwrap_unchecked()` so the compiler can omit the panic-path code from the hot path. This is an optimization technique: encode invariants in `unsafe` after a manual check.',
                    },
                    {
                      question: 'Compared to a register machine, what is one practical advantage of a stack machine like the EVM?',
                      options: [
                        'Higher raw execution speed on modern hardware',
                        'Smaller, simpler instruction set with simpler operand encoding — fewer consensus bugs and easier to verify',
                        'Better cache locality',
                        'Lower power consumption',
                      ],
                      correctIndex: 1,
                      explanation: 'Stack machines have very small instruction sets (no register arguments to encode). For Ethereum that means: simpler interpreter, easier formal verification, easier ZK circuit construction. The trade-off is some runtime efficiency vs. native register code.',
                    },
                  ],
                },
                {
                  title: 'Rust: async, traits, and generics',
                  slug: 'rust-async-traits-generics-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 30,
                  content: `# Rust: async, traits, and generics

> 🧭 **Why this matters:** async + traits + generics is the three-way intersection that the whole Rust EVM stack lives in. Reth's pipeline futures, alloy's \`<N: Network>\` providers, Revm's \`auto_impl\` traits — all here. Load this once.

Three features you have to understand to read serious Alloy/Reth code.

## 1. async / await — describe "wait for it"

For things that take time (network I/O, disk reads), Rust uses async/await.

\`\`\`rust
async fn fetch_block_number() -> u64 {
    // imagine an HTTP request here
    42
}

#[tokio::main]
async fn main() {
    let n = fetch_block_number().await;   // .await actually runs it
    println!("{}", n);
}
\`\`\`

### \`async\` returns a "future"

An \`async fn\` doesn't run when you call it — it returns a **\`Future\`**. \`.await\` is what actually drives it.

### What \`#[tokio::main]\` does

Rust's standard library doesn't include an async runtime. **tokio** is the runtime; \`#[tokio::main]\` boots it. Alloy runs on tokio.

## 2. Traits — "this type can do X"

A trait is like a TypeScript / Java interface, but more powerful. It declares a contract:

\`\`\`rust
trait HasArea {
    fn area(&self) -> f64;
}

struct Square { side: f64 }

impl HasArea for Square {
    fn area(&self) -> f64 {
        self.side * self.side
    }
}

let s = Square { side: 3.0 };
println!("{}", s.area());   // 9.0
\`\`\`

### How Alloy uses traits

\`\`\`rust
provider.get_block_number().await?;
\`\`\`

\`provider\` is some type that **implements the \`Provider\` trait**. The actual type might be HTTP, WebSocket, or IPC — but you call it the same way. That's the power of traits.

### Trait patterns you'll see often

| Pattern | Meaning |
| :--- | :--- |
| \`impl Trait for Type\` | implement Trait for Type |
| \`fn f<T: Trait>(x: T)\` | accept anything implementing Trait |
| \`Box<dyn Trait>\` | dynamic dispatch (resolve method at runtime) |
| \`async fn ... -> Result<T, E>\` | sugar for "returns a Future implementing a trait" |

## 3. Generics — "decide the type later"

The \`<i32>\` in \`Vec<i32>\` is a generic. \`Vec\` works for any element type, fixed at compile time.

\`\`\`rust
fn first<T: Clone>(v: &Vec<T>) -> T {
    v[0].clone()
}

let v = vec![10, 20, 30];
let f = first(&v);   // T inferred as i32
\`\`\`

### Alloy's \`Provider<N: Network = Ethereum>\`

Alloy's \`Provider\` actually carries a type parameter for **which network it talks to**:

\`\`\`rust
let p = ProviderBuilder::new()              // defaults to Ethereum
    .connect_http(rpc_url);

let p = ProviderBuilder::new()
    .network::<Optimism>()                  // switch to OP-stack
    .connect_http(rpc_url);
\`\`\`

The chain choice is encoded **in the type** — fewer runtime bugs.

## 4. Lifetimes (a peek)

Borrows like \`&str\` carry an implicit **lifetime** \`<'a>\`:

\`\`\`rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() >= y.len() { x } else { y }
}
\`\`\`

It says: "the returned reference lives at least as long as the inputs." For now, **read-only is fine**. The Intermediate tier covers writing them.

## 5. Putting it all together (Reth-style)

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

- \`async fn\` — long-running work
- \`<Node: FullNodeComponents>\` — generic + trait bound
- \`while let Some(x) = ...\` — pattern matching to unwrap an Option
- \`.await?\` — async + error propagation

All combinations of what you've already seen. **If you can read it, you can write it.**

Next: step into the Revm world itself.`,
                },
                {
                  title: 'Revm — the execution engine',
                  slug: 'revm-introduction-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# Revm — the execution engine

> 🧭 **Why this matters:** opens the **VM-layer engine** itself. The Inside REVM tier later opens up \`add\`, the opcode table, and \`Database\`; this lesson gives you the shape before you go in.

You've seen Alloy (the outer RPC layer) and now know the EVM is a stack machine. The next character is **Revm** — the engine that actually runs opcodes.

## Where Revm fits

\`\`\`
+----------------+
|     Reth       |  ← Full node (sync, storage, consensus)
+----------------+
|     Revm       |  ← Execution engine (this layer)
+----------------+
| Database / DB  |  ← State (Trie, KV)
+----------------+
\`\`\`

## Revm's actual top-level API

Revm exports these high-level types ([\`crates/revm/src/lib.rs\`](https://github.com/bluealloy/revm/blob/main/crates/revm/src/lib.rs)):

| Type | Role |
| :--- | :--- |
| **\`MainnetEvm\`** | the prebuilt Ethereum mainnet EVM |
| **\`ExecuteEvm\`**, **\`ExecuteCommitEvm\`** | run a transaction (commit = also write state changes back) |
| **\`SystemCallEvm\`** | system-level calls (e.g., post-Cancun BEACONROOT) |
| **\`InspectEvm\`**, **\`InspectCommitEvm\`** | tracing variants — same execution, with hooks |
| **\`Context\`** | the execution environment (block, tx, cfg) |
| **\`Journal\`**, **\`JournalEntry\`** | state-change tracking (used for revert) |
| **\`Database\`**, **\`DatabaseRef\`**, **\`DatabaseCommit\`** | the storage interfaces (covered in Intermediate) |
| **\`Inspector\`** | trait you implement to hook into execution |

The key insight: Revm is **modular by design**. \`ExecuteEvm\`, \`InspectEvm\`, \`ExecuteCommitEvm\` aren't different EVMs — they're the same engine composed with different layers. **You pick what you need.**

## What Revm provides

- **Opcode interpretation** (the Interpreter)
- **State access trait** (\`Database\`)
- **Gas accounting** and exception handling
- **Logs and tracing** via Inspectors

## Why Revm became the standard

| Adopter | Use |
| :--- | :--- |
| **Foundry** | Solidity test runner, mainnet fork simulation |
| **Reth** | The execution engine of the full node |
| **OP-Reth, Tempo** | L2s and App-chains |
| **zkEVMs (Risc0, etc.)** | Provable EVM execution |
| **MEV / simulation** | Anywhere you need to re-execute fast |

The combination of "library-first design," "Rust embeddability," and "easy customization" is what locked in adoption.

## Next

You now know enough to start reading Revm code. The **next lesson** introduces Foundry — the Rust EVM toolchain you'll actually use day-to-day. Then the **Intermediate** tier opens the interpreter folder.

## 📺 Further watching

\`\`\`youtube
xRuDWTWuxKA | Dragan Rakita — Revm Endgame (Devcon SEA 2024)
\`\`\`
`,
                },
                {
                  title: 'Foundry — the Rust EVM toolchain',
                  slug: 'foundry-toolchain-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 18,
                  xpReward: 35,
                  content: `# Foundry — the Rust EVM toolchain

> 🧭 **Why this matters:** Foundry is the **tooling layer** sitting next to Reth / Revm / Alloy — same Rust EVM stack, exposed for smart-contract developers. Useful even if your target is node-side work, because Foundry is how the rest of the ecosystem talks to your nodes.

You've seen Reth (the node) and Revm (the engine). The **third pillar of the Rust EVM stack** is **[Foundry](https://github.com/foundry-rs/foundry)** — Paradigm's Solidity dev toolchain, every part of which is built on Revm. If you write Solidity that touches a Rust EVM chain, you'll use Foundry every day.

Four binaries:

| Tool | Role |
| :--- | :--- |
| **forge** | Build, test, format Solidity — runs tests inside Revm |
| **cast** | The "swiss-army knife" — call contracts, decode calldata, query chains |
| **anvil** | Local Ethereum node (also a Revm-based fork of mainnet) |
| **chisel** | Solidity REPL — paste code, run inside Revm immediately |

## 1. Install — verbatim from the [Foundry repo README](https://github.com/foundry-rs/foundry)

\`\`\`bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
\`\`\`

\`foundryup\` is a manager that pulls the latest \`forge\`, \`cast\`, \`anvil\`, \`chisel\` into \`~/.foundry/bin\`.

## 2. \`forge\` — Solidity that runs on Revm

\`\`\`bash
forge init counter && cd counter
forge build
forge test
\`\`\`

\`forge test\` is the high point. It:

1. Compiles your Solidity tests
2. **Spawns a fresh Revm instance** with an in-memory database
3. Executes each \`testXxx\` function via Revm
4. Reports pass/fail, gas usage, traces

You're already using Revm here. \`forge test\` is, for most Solidity developers, **the production Revm consumer they touch every day.**

## 3. Cheatcodes — Foundry's secret weapon

Inside Solidity tests, you can do things normal contracts can't:

\`\`\`solidity
import "forge-std/Test.sol";

contract MyTest is Test {
    function testTransfer() public {
        vm.deal(alice, 10 ether);             // give alice 10 ETH
        vm.warp(block.timestamp + 1 days);    // skip 1 day forward
        vm.prank(alice);                       // next call comes from alice
        myContract.transfer(bob, 1 ether);
    }
}
\`\`\`

How is this possible? **Cheatcodes are calls to a special address that Foundry injects as a Revm precompile**. From [\`forge-std/src/Base.sol\`](https://github.com/foundry-rs/forge-std/blob/master/src/Base.sol):

\`\`\`solidity
address internal constant VM_ADDRESS = 0x7109709ECfa91a80626fF3989D68f67F5b1DD12D;
\`\`\`

That address has **no special cryptographic property** — it's literally:

\`\`\`solidity
address(uint160(uint256(keccak256("hevm cheat code"))))
\`\`\`

Foundry runs Revm with a **custom precompile** registered at this address. When you call \`vm.deal(...)\` from Solidity, you're really doing \`CALL\` to \`0x7109...\` with ABI-encoded arguments — and Foundry's Rust code intercepts it.

This is **exactly the precompile registration mechanism** you'll see in the Expert tier. Foundry is the most widely used real-world example of a custom precompile.

## 4. \`cast\` — the EVM swiss-army knife

\`\`\`bash
# Talk to any chain
cast block-number --rpc-url https://eth.merkle.io
cast balance vitalik.eth --ether --rpc-url https://eth.merkle.io

# Inspect calldata
cast 4byte 0xa9059cbb              # → "transfer(address,uint256)"
cast --abi-decode "balanceOf(address)(uint256)" 0x...

# Read storage
cast storage 0xUniswapV2Pair 0 --rpc-url https://eth.merkle.io

# Call without sending a tx (eth_call)
cast call $TOKEN "balanceOf(address)(uint256)" $WALLET --rpc-url ...
\`\`\`

For an MEV searcher or RPC engineer, \`cast\` is reflex-level tooling. You'll use it dozens of times a day to inspect chain state.

## 5. \`anvil\` — local node + mainnet forking

\`\`\`bash
# Standalone local chain — instant blocks, 10 funded accounts
anvil

# Fork mainnet at the latest block — interact with real protocols locally
anvil --fork-url https://eth.merkle.io
\`\`\`

The fork mode is the killer feature. It runs a **Revm instance with an \`AlloyDB\`-style backing** that lazy-loads state from the upstream RPC on demand. **You can interact with Uniswap V3 against mainnet state from your laptop, no testnet required.**

Internally, anvil is the same family of code as the \`forked_db\` pattern dissected in the Intermediate tier's MEV lesson. Anvil exposes it over JSON-RPC instead of a Rust API.

## 6. \`chisel\` — Solidity REPL

\`\`\`bash
chisel
> uint256 x = 1 + 2 * 3;
> x
7
> address(0x1).balance
0
\`\`\`

Backed by Revm. Type a line, get a result. Quick contract experiments without writing a full file.

## 7. Why this matters for hardcore Rust EVM development

If you're aiming for serious Rust EVM work, Foundry is **both your daily tool and a giant Revm consumer to learn from**:

- Reading \`foundry-rs/foundry/crates/cheatcodes\` shows you a production custom-precompile system
- The \`forge\` test runner is a real Revm orchestrator with fuzzing, invariant testing, coverage
- \`anvil\`'s state forking is the production version of the \`AlloyDB\` pattern covered in the Intermediate tier's Database lesson

## Drill

1. Install Foundry: \`curl -L https://foundry.paradigm.xyz | bash && foundryup\`
2. \`forge init my-test && cd my-test && forge test\` — run your first Revm-backed test
3. \`anvil --fork-url <RPC>\` — fork mainnet locally
4. In another terminal: \`cast call $UNISWAP_V3_POOL "slot0()" --rpc-url http://localhost:8545\` — read live Uniswap state from your local fork
5. Open [\`forge-std/src/Vm.sol\`](https://github.com/foundry-rs/forge-std/blob/master/src/Vm.sol) and skim the cheatcode interface — every entry corresponds to a function in Foundry's Rust precompile

You're now using Revm both as a learner and as a daily user.

## 📺 Further watching

\`\`\`youtube
wJnywGB33O4 | Georgios Konstantopoulos — Foundry, a portable, fast and modular toolkit for Ethereum applications
\`\`\`
`,
                },
                {
                  title: 'Writing Tests with Foundry — \`forge test\` as a Production Skill',
                  slug: 'foundry-tests-en',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 25,
                  xpReward: 50,
                  content: `# Writing Tests with Foundry — \`forge test\` as a Production Skill

> 🧭 **Why this matters:** introduces the **verification discipline** that the Building tier later holds you to. Tests are the executable spec; same standard the Reth / Revm / Foundry maintainers all hold themselves to.

The previous lesson ran \`forge test\` and showed Revm spinning up underneath. This lesson teaches you to **write** tests that catch real bugs — the kind that ship with audited contracts, MEV searchers, and L2 sequencers.

Test design is what separates a hobbyist's Solidity from production code. A contract with great prose comments and no tests is not production — it is a sketch.

## 1. The shape of every test: Arrange · Act · Assert

Every Foundry test breaks into three parts:

\`\`\`solidity
import "forge-std/Test.sol";

contract CounterTest is Test {
    Counter counter;

    function setUp() public {
        counter = new Counter();
    }

    function testIncrementsByOne() public {
        // Arrange — done in setUp() above
        uint256 before = counter.count();

        // Act
        counter.increment();

        // Assert
        assertEq(counter.count(), before + 1);
    }
}
\`\`\`

\`setUp()\` runs before every test. \`assertEq\` is the primary assertion — same idea as Rust's \`assert_eq!\`. If the values differ, the test fails with a diff in the trace.

Foundry runs each \`testXxx\` function against **a fresh Revm state** built from \`setUp()\`. Tests cannot pollute each other.

## 2. The four cheatcodes you'll use 90% of the time

The previous lesson introduced \`vm.deal\`, \`vm.warp\`, \`vm.prank\`. Those *change* state to set up a scenario. The four below *check* state — they're how you assert the contract behaved correctly.

### \`vm.expectRevert(bytes)\` — "the next call must revert"

\`\`\`solidity
function testCannotWithdrawMoreThanBalance() public {
    vm.expectRevert("Insufficient balance");
    vault.withdraw(100 ether);
}
\`\`\`

Foundry expects the very next external call to revert with the given reason string (or a 4-byte selector for custom errors). If it succeeds, the test fails. If it reverts with a different reason, the test fails and shows you both expected and actual.

This is how you test **failure paths** without writing \`try/catch\` plumbing.

### \`vm.expectEmit(...)\` — "an event must fire"

\`\`\`solidity
function testTransferEmitsEvent() public {
    vm.expectEmit(true, true, false, true);    // check topic1, topic2, topic3, data
    emit Transfer(alice, bob, 1 ether);         // the expected event
    token.transfer(bob, 1 ether);
}
\`\`\`

The boolean flags say which topics to check. Indexed event arguments become topics; non-indexed arguments are packed in \`data\`. This is how you test that ERC-20 / ERC-721 surfaces emit the events that downstream indexers and dapps depend on.

### \`vm.expectCall(address, bytes)\` — "the contract must call X"

\`\`\`solidity
function testWithdrawCallsTransfer() public {
    vm.expectCall(
        address(token),
        abi.encodeWithSelector(token.transfer.selector, alice, 1 ether)
    );
    vault.withdraw(1 ether);
}
\`\`\`

This is how you test composability — that a contract correctly delegates to its dependencies. Especially valuable when the dependency is a real production address you're forking against.

### \`vm.recordLogs()\` / \`vm.getRecordedLogs()\` — "show me everything that fired"

\`\`\`solidity
function testReentrancyEmitsTwoEvents() public {
    vm.recordLogs();
    vault.deposit{value: 1 ether}();
    Vm.Log[] memory logs = vm.getRecordedLogs();
    assertEq(logs.length, 2);
}
\`\`\`

When you do not know which events should fire ahead of time — for instance, while debugging — record everything, then assert against the array.

## 3. Fork tests — running tests against real chain state

Unit tests run against an empty Revm. Fork tests run against **a snapshot of mainnet** (or any chain) at a specific block:

\`\`\`solidity
contract UniswapV3Test is Test {
    uint256 mainnetFork;

    function setUp() public {
        mainnetFork = vm.createFork("https://eth.merkle.io", 18_500_000);
        vm.selectFork(mainnetFork);
    }

    function testPriceQuoteAgainstRealPool() public {
        IUniswapV3Pool pool = IUniswapV3Pool(0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640);
        (uint160 sqrtPriceX96,,,,,,) = pool.slot0();
        // sqrtPriceX96 is the real value at block 18_500_000
        assertGt(sqrtPriceX96, 0);
    }
}
\`\`\`

\`vm.createFork\` builds a Revm instance backed by \`AlloyDB\`-style state — every \`SLOAD\` lazy-loads from the upstream RPC and caches. **You can test against the actual deployed Uniswap V3 contracts at a specific block height**, with no testnet, no local deployment, and no chain-state mocking.

This is the production pattern for **MEV searchers, audit reproducers, and any contract that integrates with on-chain protocols**. Pin the fork to a specific block so your test is deterministic.

> 💡 **CI cost.** Fork tests hit the upstream RPC. For paid endpoints (Alchemy, Infura) this consumes quota. Either pin a block + cache the responses (Foundry caches by default in \`~/.foundry/cache\`), or use a public RPC for CI.

## 4. Fuzz tests — turn one test into thousands

Add parameters to a \`testXxx\` function and Foundry generates random inputs:

\`\`\`solidity
function testTransferAlwaysReducesSenderBalance(uint96 amount) public {
    amount = uint96(bound(amount, 1, token.balanceOf(alice)));
    uint256 before = token.balanceOf(alice);

    vm.prank(alice);
    token.transfer(bob, amount);

    assertEq(token.balanceOf(alice), before - amount);
}
\`\`\`

Foundry runs this 256 times by default with random \`amount\` values. \`bound(value, min, max)\` maps any input into the valid range — preferable to \`vm.assume()\` (which discards out-of-range inputs and slows the run) unless you specifically need to discard.

**When to fuzz**: any time the contract does math with user input. Anything that takes a \`uint256\`, \`int256\`, or \`bytes\` should be fuzzed before you trust it. The Foundry fuzzer regularly finds bugs in production audit codebases that unit tests missed.

## 5. Invariant tests — properties that must hold under any sequence

Invariants test what should **always** be true, regardless of which functions are called in which order:

\`\`\`solidity
contract VaultInvariantTest is Test {
    Vault vault;
    Handler handler;

    function setUp() public {
        vault = new Vault();
        handler = new Handler(vault);
        targetContract(address(handler));   // tell Foundry to call random functions on \`handler\`
    }

    function invariant_totalSharesMatchesAssets() public view {
        assertEq(vault.totalShares(), vault.totalAssetsBacking());
    }
}
\`\`\`

Foundry's invariant runner calls random sequences of functions on \`handler\` (which exposes the operations you want to fuzz), then runs every \`invariant_*\` between calls. If any sequence breaks the invariant, you get a minimal reproducer.

This is how DEX, lending, and vault contracts catch the "sequence of three actions that breaks accounting" bugs that simple unit fuzz cannot find.

## 6. Gas snapshots — regression detection

\`\`\`bash
forge snapshot
\`\`\`

Writes a \`.gas-snapshot\` file recording gas usage of every test. On the next run, \`forge test\` warns if any test got more expensive. CI can fail on regressions.

\`\`\`bash
forge snapshot --diff
\`\`\`

Shows what changed since the last snapshot. This is how production teams catch "you added 10K gas to every transfer" before a refactor merges.

## 7. The EVM contract testing checklist

For any production-bound contract, the question **"is it tested?"** decomposes to:

| Layer | What to assert |
| :--- | :--- |
| **State** | After every state-mutating call, the storage slots you expect to change have the values you expect |
| **Events** | Every public-facing action emits the documented event with the documented arguments |
| **Reverts** | Every revert path is exercised — bad input, unauthorized caller, insufficient balance, paused state |
| **Gas** | Hot paths have a snapshot test so refactors don't bloat them silently |
| **Composability** | Cross-contract calls happen with the right arguments (\`vm.expectCall\`) |
| **Fork integrations** | If you depend on Uniswap / Aave / a real address, you test against a pinned mainnet fork |
| **Properties (fuzz)** | Math with user input is fuzzed; conservation laws (total supply, sum of balances) are invariants |

A "complete" Foundry test suite hits every row above for every public function. Most production audits flag missing coverage on the **Reverts** and **Properties** rows.

## Drill

1. \`forge init counter && cd counter\`
2. Write a \`Counter.sol\` with \`increment()\`, \`decrement()\` (reverts on underflow), and \`set(uint256)\` (only callable by owner — emits \`CountSet(uint256 newValue)\` event).
3. Write tests that hit:
   - \`assertEq\` on \`increment\` (state)
   - \`vm.expectRevert\` on \`decrement\` from zero
   - \`vm.expectRevert\` on \`set\` from non-owner
   - \`vm.expectEmit\` on \`set\`
   - A fuzz test: \`testSetReturnsTheValueYouSet(uint256 x)\`
4. \`forge test -vvv\` — read the trace
5. \`forge snapshot\` — commit the snapshot
6. Add a useless \`unchecked\` block to \`increment\`; re-run and verify the gas snapshot detects the change

Once \`forge test\` is green and the snapshot is committed, you have crossed from "I read about testing" to "I have a tested contract."

## Why this matters before the Intermediate tier

Inside REVM walks Revm's own state-test framework. Inside Reth walks the \`Stage\` trait's unit tests. **Both assume you already think in test-first terms** — that "I'll add tests later" is a smell, not a plan. This lesson is the precondition.

## 📺 Further reading

[Foundry Book — Forge testing chapter](https://getfoundry.sh/forge/tests/overview/) for the full cheatcode reference and CLI options.
`,
                },
                {
                  title: 'Fundamentals quiz',
                  slug: 'fundamentals-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 6,
                  duration: 12,
                  xpReward: 30,
                  content: `# Fundamentals quiz

Check your grasp on Alloy, the EVM, and where Revm fits.`,
                  quizQuestions: [
                    {
                      question: 'What does Alloy\'s `PrivateKeySigner::random()` give you?',
                      options: [
                        'A connection to a public node',
                        'A signer object backed by a fresh random private key',
                        'A gas estimate',
                        'An audited smart contract',
                      ],
                      correctIndex: 1,
                      explanation: 'PrivateKeySigner holds the private key and exposes signing methods. Use .address() to get the derived public address.',
                    },
                    {
                      question: '`ProviderBuilder::new().connect_http(url)` produces:',
                      options: [
                        'A local web server',
                        'A Provider that talks JSON-RPC to a node',
                        'A wallet app',
                        'A new blockchain',
                      ],
                      correctIndex: 1,
                      explanation: 'Provider is the RPC client. It exposes get_block_number, get_balance, etc.',
                    },
                    {
                      question: 'How does the EVM `ADD` opcode work?',
                      options: [
                        'Adds the first two bytes of memory',
                        'Pops two values from the stack and pushes their sum',
                        'Adds storage slots 0 and 1 and writes to slot 2',
                        'Doubles the gas limit',
                      ],
                      correctIndex: 1,
                      explanation: 'The EVM is a stack machine. ADD pops two, sums them with uint256 wrap-around, and pushes the result.',
                    },
                    {
                      question: 'Why is Revm the de facto execution engine in Foundry, Reth, and others?',
                      options: [
                        'It\'s the only free Rust EVM',
                        'Its modular design lets you embed and customize it, with Rust\'s safety and speed',
                        'For Geth (Go) compatibility',
                        'It bundles the Solidity compiler',
                      ],
                      correctIndex: 1,
                      explanation: 'The library-first design plus Rust ergonomics make it the reusable building block for EVM tools.',
                    },
                    {
                      question: 'Which EVM region is persistent on-chain?',
                      options: ['Stack', 'Memory', 'Storage', 'Calldata'],
                      correctIndex: 2,
                      explanation: 'Stack and memory are transient within a tx. Only Storage writes persist on-chain — and they\'re the most expensive.',
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
