import { PrismaClient } from '@prisma/client';

export async function seedRethFundamentalsEN(prisma: PrismaClient) {
  const tags = ['rust', 'alloy', 'evm', 'fundamentals', 'beginner'];

  await prisma.course.create({
    data: {
      slug: 'reth-fundamentals-en',
      title: 'Reth Fundamentals — Your First Steps with Alloy',
      description:
        'The first toolkit for Rust × Ethereum in 11 lessons — Rust ownership / Result / async, Alloy Address / U256 / Signer / Provider, EVM stack machine + 5 memory regions, Revm execution engine, Foundry toolchain. BEGINNER tier, three quizzes for retention. By the end you\'re ready for the three Intermediate courses (Inside Revm / Inside Reth / Inside Alloy).',
      difficulty: 'BEGINNER',
      duration: 139,
      xpReward: 290,
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
                  title: 'Lesson 1 — Rust: ownership and borrowing in 5 minutes',
                  slug: 'rust-ownership-borrowing-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# Lesson 1 — Rust: ownership and borrowing in 5 minutes

## Question

As soon as you start writing Alloy, you hit **ownership** — Rust's defining feature and the first wall. Perfect understanding isn't the goal; the target is **"can recall the rules while reading code"**.

## Principle (minimum model)

- **Ownership = compile-time memory management.** C/C++ humans manage memory; Java/JS GCs manage it; Rust the compiler verifies "who owns and when to free" → no GC, no double-free, no data races.
- **Three rules.** (1) Every value has exactly one owner. (2) When the owner goes out of scope, the value is dropped. (3) Values are either moved or borrowed.
- **Borrows \`&\` and \`&mut\`.** \`&\` = read (many at a time) / \`&mut\` = write (one at a time, exclusively) — data races prevented at compile time.
- **\`&str\` = a borrowed string.** A \`String\` owns; a \`&str\` borrows a slice. \`&str\` in a function signature means "read-only, no ownership needed".
- **Three common Alloy patterns.** \`"...".parse()?\` (string parse + error propagation) / \`provider.get_balance(&address).await?\` (borrow) / \`let mut signer = ...\` (mutable).

## Worked example + steps

# Rust: ownership and borrowing in 5 minutes


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

You won't fully internalize ownership until you've fought a few compile errors. That's normal. Move on — the next lesson exercises this.

## Summary (3 lines)

- Three ownership rules = one owner, dropped on scope exit, move or borrow. Compile-time memory management means no GC and no data races.
- \`&\` read (many) + \`&mut\` write (one) prevent races; \`&str\` is a \`String\` borrow.
- Perfect understanding not needed — "recall while reading" is. Next lesson: Alloy primitives and signing.
`,
                },
                {
                  title: 'Lesson 2 — Alloy primitives and signing',
                  slug: 'alloy-primitives-signing-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 25,
                  content: `# Lesson 2 — Alloy primitives and signing

## Question

The first toolkit for working with Ethereum in Alloy — **\`Address\` / \`U256\` / \`B256\` and signing**. The type system distinguishes "this is an Address" from "this is a uint256", so you can't mix them by accident.

## Principle (minimum model)

- **Three primitives.** \`Address\` (20 bytes, contract or EOA) / \`U256\` (256-bit unsigned, wei amounts) / \`B256\` (32 bytes, hashes and slot keys).
- **\`.parse::<Address>()\`.** String → \`Address\`, with checksum validation. Returns \`Err\` on invalid input.
- **\`U256\` literals.** \`U256::from(1_000_000)\` (from u64) / \`"1000000".parse()?\` (from string) / \`parse_ether("1")?\` (ETH units).
- **\`Signer\` trait.** An abstraction over "holds a key and can sign". \`PrivateKeySigner::random()\` creates a fresh key; \`.address()\` returns the public address.
- **Ledger / AWS KMS via the same \`Signer\` trait.** Detailed in Inside Alloy; for now "Signer = something that can sign" is enough.

## Worked example + steps

# Alloy primitives and signing


Time touch **Alloy** directly. Alloy is the de facto Ethereum library suite for Rust, and Reth uses it everywhere.

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

    // Optionally, the wallet's chain id can be set, to use EIP-155
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

Next up: \`Result\`, \`Option\`, and \`?\` — the error-handling vocabulary you'll need before touching a real Provider.

## Summary (3 lines)

- Three primitives: \`Address\` 20-byte / \`U256\` 256-bit / \`B256\` 32-byte. The type system separates "Address" from "wei" at compile time.
- \`.parse()\` does string→type; \`U256::from()\` does numeric; \`parse_ether("1")\` does ETH units. Use \`U256\`, never \`f64\`, for money.
- \`Signer\` abstracts "something that can sign"; \`PrivateKeySigner::random()\` makes a fresh key; \`.address()\` returns the public address. Next: Result/Option/?.
`,
                },
                {
                  title: 'Lesson 3 — Rust: Result, Option, and the `?` operator',
                  slug: 'rust-result-option-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 25,
                  content: `# Lesson 3 — Rust: Result, Option, and the \`?\` operator

## Question

Rust has tons of fallible functions. Unwrapping each one by hand would turn your code into **try/catch soup**. Rust's \`?\` operator does "early-return on error, unwrap on success" in one character. **That's why you see \`?\` everywhere in Alloy code.**

## Principle (minimum model)

- **\`Result<T, E>\`.** Success = \`Ok(T)\`, failure = \`Err(E)\`. A function return type that expresses "this can fail".
- **\`Option<T>\`.** Some = \`Some(T)\`, none = \`None\`. Replaces null; no unwrap needed.
- **\`?\` operator.** \`result?\` = \`match result { Ok(v) => v, Err(e) => return Err(e.into()) }\` — sugar. Errors propagate to the caller automatically.
- **\`.await?\` combo.** Ubiquitous in async functions. \`.await\` waits for the Future + \`?\` propagates errors → synchronous-looking async code.
- **\`unwrap()\` vs \`?\`.** \`unwrap()\` = panic on error (learning / prototype). \`?\` = propagate to caller (production code).

## Worked example + steps

# Rust: Result, Option, and the \`?\` operator


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

Almost every line uses \`?\`. Mental model: **"keep going on success, send the error up on failure."**

## Summary (3 lines)

- \`Result<T, E>\` success/failure + \`Option<T>\` value/none = Rust's expression of "can fail" and "may be missing". The type system enforces handling.
- \`?\` = early-return on error; \`.await?\` = async + error propagation. Avoids try/catch soup in one character.
- \`unwrap()\` = learning; \`?\` = production. Next lesson: Provider for connecting to a node.
`,
                },
                {
                  title: 'Lesson 4 — Provider — connecting to a node',
                  slug: 'alloy-provider-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# Lesson 4 — Provider — connecting to a node

## Question

Three lessons in, you can read Rust + Alloy types. **Next: talking to an Ethereum node** — \`Provider\` is the interface. HTTP / WebSocket / IPC / Anvil-fork all use **the same trait and the same methods**.

## Principle (minimum model)

- **\`Provider\` trait.** The RPC-client abstraction. Verbs: \`get_block_number\` / \`get_balance\` / \`call\` / \`send_transaction\` etc.
- **\`ProviderBuilder::new().connect_http(url)\`.** Creates an HTTP provider. \`url.parse()?\` produces a \`Url\` type.
- **Public RPC endpoints.** \`https://ethereum.reth.rs/rpc\` (official, free) / \`https://eth.llamarpc.com\` (llamarpc) / Alchemy / Infura (API key needed).
- **async methods.** \`provider.get_block_number().await?\` = a network round trip; runs on a Tokio runtime.
- **\`#[tokio::main]\`.** Makes \`main()\` async, sets up the runtime, blocks until done. Beginner boilerplate.

## Worked example + steps

# Provider — connecting to a node


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

You can now read state. The next module dives into how the EVM actually executes — stack, memory, opcodes — which prepares you for Revm.

## Summary (3 lines)

- \`Provider\` = the RPC-client abstraction. HTTP / WebSocket / IPC / Anvil-fork all use the same trait and same methods.
- \`ProviderBuilder::new().connect_http(url)\` creates one. Public RPCs include \`ethereum.reth.rs/rpc\`. async methods do network round trips.
- \`#[tokio::main]\` makes main async. Next: a balance-checker quiz combining everything so far.
`,
                },
                {
                  title: 'Quiz — Balance Checker',
                  slug: 'balance-checker-challenge-en',
                  type: 'QUIZ',
                  sortOrder: 4,
                  duration: 15,
                  xpReward: 30,
                  content: `# Quiz — Balance Checker

## Question

Write a function that returns \`true\` if a given address has zero ETH balance. **Practical quiz combining Provider + get_balance + \`.await?\` + Option/Result in one function.** Verify against Vitalik's address.

## Principle (minimum model)

- **Function signature.** \`async fn is_empty_wallet(provider: &impl Provider, address: Address) -> eyre::Result<bool>\`.
- **\`&impl Provider\`.** Accepts any Provider implementation → trait-bound polymorphism. Works with HTTP / WebSocket / Anvil-fork alike.
- **\`get_balance(address).await?\`.** Wait for the Future + propagate errors; extract the \`U256\` balance.
- **\`.is_zero()\`.** Idiomatic zero-check on \`U256\`. \`balance == 0u64\` is a type mismatch and won't compile.
- **Wei units.** \`get_balance\` returns **wei** as \`U256\`. ETH = 10¹⁸ wei. \`format_ether\` for display. **Never use \`f64\` for money** — precision loss.

## Worked example + steps

# Quiz: balance checker

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

## Quiz

## Summary (3 lines)

- \`async fn is_empty_wallet(&impl Provider, Address) -> eyre::Result<bool>\` + \`get_balance(addr).await?.is_zero()\` — one line.
- \`impl Provider\` = trait-bound polymorphism. \`is_zero()\` is the idiomatic zero-check. Wei in \`U256\`, not \`f64\`.
- Next module: Inside the EVM, starting with the stack-machine basics.
`,
                  quizQuestions: [
                    {
                      "question": "Which Rust + Alloy snippet correctly checks whether a wallet has zero balance?",
                      "options": [
                        "`provider.balance(addr) == 0`",
                        "`provider.get_balance(addr).await?.is_zero()`",
                        "`provider.is_zero(addr).await?`",
                        "`provider.get_balance(addr) == U256::ZERO`"
                      ],
                      "correctIndex": 1,
                      "explanation": "`get_balance` is async and returns `Result<U256>`. `await?` waits for the response and propagates errors. `is_zero()` is the idiomatic zero check on `U256`."
                    },
                    {
                      "question": "Why do we write `.await?` on the line that calls `get_balance`?",
                      "options": [
                        "`.await` is decorative; only `?` matters",
                        "Because it's an `async fn`",
                        "`.await` waits for the future to resolve, and `?` propagates the error if it fails",
                        "`.await` makes it run faster"
                      ],
                      "correctIndex": 2,
                      "explanation": "These are two separate operators composed: `.await` polls the future to completion (since `get_balance` is async), and `?` returns early from the surrounding function if the result is an `Err`."
                    },
                    {
                      "question": "What happens if you compare `balance` (`U256`) directly to `0u64` with `==`?",
                      "options": [
                        "It works because `0` is automatically converted",
                        "It compiles but issues a warning",
                        "Compile error — the types don't match",
                        "It panics at runtime"
                      ],
                      "correctIndex": 2,
                      "explanation": "Rust does not implicitly convert numeric types. `U256 == u64` is a compile error. You'd either use `balance == U256::from(0)` or, more idiomatically, `balance.is_zero()`."
                    },
                    {
                      "question": "What unit does Provider's `get_balance` return?",
                      "options": [
                        "ETH (a floating point)",
                        "Gwei",
                        "Wei (as a `U256`)",
                        "Lamport"
                      ],
                      "correctIndex": 2,
                      "explanation": "`get_balance` returns the balance in **wei** as a `U256`. To display ETH you divide by 10^18 — but never as `f64`, since precision matters in money. Use `format_ether` from Alloy."
                    },
                    {
                      "question": "Why does the function signature take `&impl Provider` rather than a concrete type?",
                      "options": [
                        "`impl` is just shorthand syntax — there's no real difference",
                        "It accepts any Provider implementation (HTTP, WebSocket, Anvil-fork) — trait-bound polymorphism",
                        "It's required by `await`",
                        "To save memory"
                      ],
                      "correctIndex": 1,
                      "explanation": "`impl Provider` means \"some concrete type that implements the `Provider` trait.\" This lets the same function work against an HTTP provider, a WebSocket provider, or an in-memory test provider — without rewriting it."
                    }
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
                  title: 'Lesson 6 — The EVM is a stack machine',
                  slug: 'evm-stack-machine-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 12,
                  xpReward: 25,
                  content: `# Lesson 6 — The EVM is a stack machine

## Question

You've been talking to Ethereum "from outside" via Alloy. **Now peek inside the EVM** — what the Ethereum Virtual Machine is and how it works. The EVM is a **stack machine** — no registers, no memory addresses — just "push and pop" computation.

## Principle (minimum model)

- **Stack machine vs register machine.** Stack = one place to put values (the top); register = named places (R0, R1, ...). The EVM has a 1024-deep stack only.
- **Five memory regions.** Stack (1024 deep, current computation) / Memory (volatile, within a tx) / Calldata (read-only, tx input) / Storage (persisted, blockchain state) / Code (read-only, contract bytecode).
- **Opcode = a 1-byte instruction.** \`0x01 ADD\` / \`0x60 PUSH1\` / \`0x52 MSTORE\` / \`0x55 SSTORE\`. ADD pops two stack values and pushes the sum.
- **Gas.** Every opcode has a cost. A tx has a gas limit; if exhausted, execution halts. Storage writes are the most expensive (they're persisted).
- **Why a stack machine?** Smaller instruction set + simpler operand encoding → fewer consensus bugs, easier to verify and to compile to ZK circuits. Trade-off: runtime efficiency vs native register code.

## Worked example + steps

# The EVM is a stack machine


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

Now build a tiny stack machine yourself in the next lesson.

## Summary (3 lines)

- EVM = stack machine. 1024-deep stack + 5 memory regions (Stack / Memory / Calldata / Storage / Code). Only Storage is persisted.
- 1-byte opcodes; ADD = pop 2 + push 1; wrapping arithmetic (mod 2²⁵⁶); every opcode has gas; Storage writes most expensive.
- Stack machine choice = smaller instruction set, easier ZK circuits, harder to consensus-bug. Trade-off is raw runtime speed. Next: mini EVM stack quiz.
`,
                },
                {
                  title: 'Quiz — A Mini EVM Stack',
                  slug: 'mini-evm-stack-en',
                  type: 'QUIZ',
                  sortOrder: 1,
                  duration: 15,
                  xpReward: 30,
                  content: `# Quiz — A Mini EVM Stack

## Question

Reproduce EVM stack operations **in a Rust \`Vec\`**. \`pop\` + \`push\` + wrapping arithmetic + the \`unwrap_unchecked\` safety pattern — the same mechanics power Revm's hot path.

## Principle (minimum model)

- **\`Vec::pop\` returns \`Option<T>\`.** Empty → \`None\`, \`Some(v)\` → value. The null check is enforced by the type system.
- **EVM stack limit = 1024.** Revm has \`pub const STACK_LIMIT: usize = 1024;\`. Exceeding → \`StackOverflow\`.
- **EVM ADD uses \`wrapping_add\`.** mod 2²⁵⁶. \`saturating_add\` or \`checked_add\` are off-consensus. \`+\` diverges between debug and release.
- **\`unwrap_unchecked()\` + \`unsafe\`.** When the length was just checked, the panic path becomes dead code → \`unwrap_unchecked\` removes it from the hot path. Hand-check + encode the invariant in \`unsafe\`.
- **Stack machine vs register machine, redux.** Smaller instruction set + simpler operand encoding → easier to ZK-circuit / formally verify; runtime speed trades for verifiability.

## Worked example + steps

# Quiz: a mini EVM stack


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

## Quiz

## Summary (3 lines)

- \`Vec::pop -> Option<T>\` enforces the empty check at the type level. EVM stack limit 1024 (Revm \`STACK_LIMIT\`). ADD is \`wrapping_add\`.
- \`unwrap_unchecked\` + \`unsafe\` = post-guard hot-path optimisation. Encode the invariant in \`unsafe\`.
- Stack-machine choice trades raw runtime speed for verifiability. Next: async + traits + generics.
`,
                  quizQuestions: [
                    {
                      "question": "What is the return type of `Vec::pop`?",
                      "options": [
                        "`T`",
                        "`Option<T>` — `Some(value)` or `None` when empty",
                        "`Result<T, Error>`",
                        "`&T`"
                      ],
                      "correctIndex": 1,
                      "explanation": "`pop` returns `Option<T>`. Rust encodes the \"stack might be empty\" possibility in the type system, so you cannot accidentally unwrap a missing value without acknowledging it."
                    },
                    {
                      "question": "What is the EVM stack's hard size limit?",
                      "options": [
                        "256 items",
                        "512 items",
                        "1024 items",
                        "unlimited (memory permitting)"
                      ],
                      "correctIndex": 2,
                      "explanation": "EVM enforces a hard limit of 1024 stack items. Revm has `pub const STACK_LIMIT: usize = 1024;` exactly because of this. Going over yields `StackOverflow`."
                    },
                    {
                      "question": "For the real EVM ADD opcode, which arithmetic semantics are correct?",
                      "options": [
                        "`wrapping_add` — overflow wraps around mod 2²⁵⁶",
                        "`saturating_add` — overflow saturates to max",
                        "`checked_add` — returns `Option`, panics on overflow",
                        "Any of the above is fine"
                      ],
                      "correctIndex": 0,
                      "explanation": "EVM uses wrap-around (modulo 2²⁵⁶) arithmetic. This is what Solidity's `unchecked { ... }` blocks expose, and what you must use to match consensus. `saturating` or `checked` would diverge from the spec."
                    },
                    {
                      "question": "Why does Revm's `popn_top!` macro use `unwrap_unchecked()` (in `unsafe`) instead of `unwrap()`?",
                      "options": [
                        "It's a bug — `unwrap()` would also work",
                        "The length is checked just before, so the panic path is dead code; `unwrap_unchecked` lets the compiler eliminate it from the hot path",
                        "For thread safety",
                        "To save memory"
                      ],
                      "correctIndex": 1,
                      "explanation": "The macro guards with a length check, then uses `unwrap_unchecked()` so the compiler can omit the panic-path code from the hot path. This is an optimization technique: encode invariants in `unsafe` after a manual check."
                    },
                    {
                      "question": "Compared to a register machine, what is one practical advantage of a stack machine like the EVM?",
                      "options": [
                        "Higher raw execution speed on modern hardware",
                        "Smaller, simpler instruction set with simpler operand encoding — fewer consensus bugs and easier to verify",
                        "Better cache locality",
                        "Lower power consumption"
                      ],
                      "correctIndex": 1,
                      "explanation": "Stack machines have very small instruction sets (no register arguments to encode). For Ethereum that means: simpler interpreter, easier formal verification, easier ZK circuit construction. The trade-off is some runtime efficiency vs. native register code."
                    }
                  ],
                },
                {
                  title: 'Lesson 8 — Rust: async, traits, and generics',
                  slug: 'rust-async-traits-generics-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 30,
                  content: `# Lesson 8 — Rust: async, traits, and generics

## Question

Open Alloy / Reth / Revm source and you'll always see \`async\` / \`trait\` / \`<T: Bound>\`. **Make sure you can read these three.** async = a function that returns a Future; trait = Java's interface; generics = type parameters for reuse.

## Principle (minimum model)

- **\`async fn\`.** Returns a **Future** (an unfinished computation). \`.await\` drives it to completion. Runs on a runtime (Tokio etc).
- **\`trait\`.** A shared interface. Like Java/Kotlin's \`interface\`. \`impl Trait for Type\` implements it; resolved at compile time.
- **\`Box<dyn Trait>\` / \`&dyn Trait\`.** Runtime dispatch. Multiple concrete types treated uniformly. Vtable-based; slower than static but flexible.
- **Generics \`<T>\` + bounds \`T: Bound\`.** Compile-time type parameters, monomorphised → no runtime overhead.
- **\`impl Trait\` syntax.** Argument \`&impl Provider\` = "anything that implements Provider"; return \`impl Future<Output=T>\` = "some concrete type, hidden".
- **\`async + trait\`.** Trait methods returning async used to require \`#[async_trait]\`; from Rust 1.75 it's standard.

## Worked example + steps

# Rust: async, traits, and generics


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

Next: step into the Revm world itself.

## Summary (3 lines)

- \`async fn\` = returns a Future; \`.await\` waits. Tokio runtime. Alloy's entire RPC surface is async.
- \`trait\` = shared interface; \`<T: Bound>\` = compile-time generics; \`impl Trait\` = shorthand at argument/return positions.
- \`Box<dyn Trait>\` = vtable runtime dispatch; generics = static monomorphisation. Next: Revm execution engine.
`,
                },
                {
                  title: 'Lesson 9 — Revm — the execution engine',
                  slug: 'revm-introduction-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# Lesson 9 — Revm — the execution engine

## Question

**Revm = the Rust EVM execution engine.** Reth, Foundry, Hyperliquid, Tempo, Berachain — anywhere in the Rust ecosystem you need to execute EVM, you find Revm. **Why Revm, and what does it provide as a library?**

## Principle (minimum model)

- **Revm is a library.** Not a chain, not a node — just an **EVM execution engine**. Reth adds state + consensus; Foundry adds a test harness.
- **Modular design.** Interpreter / instruction table / Database trait / Inspector are all independent and swappable. Hyperliquid adds custom precompiles; MEV bots observe via Inspector.
- **Database trait.** The abstraction over state. HashMap (testing) / JSON-RPC (mainnet fork) / MDBX (production) all conform to the same trait.
- **Adopted by Foundry / Reth / OP-Reth / zkVMs / MEV bots.** Anywhere Rust meets EVM, Revm is the shared substrate.
- **Inside Revm course (Intermediate).** Walks add / instruction table / Database trait line by line. This lesson is the entry point.

## Worked example + steps

# Revm — the execution engine


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

## Summary (3 lines)

- Revm = Rust EVM execution engine (library). Adopted by Reth / Foundry / Hyperliquid / Tempo / Berachain as a shared substrate.
- Modular: interpreter + instruction table + Database + Inspector are independent. Database trait abstracts HashMap / JSON-RPC / MDBX behind one type.
- Inside Revm Intermediate course deep-dives the internals. Next: Foundry toolchain.
`,
                },
                {
                  title: 'Lesson 10 — Foundry — the Rust EVM toolchain',
                  slug: 'foundry-toolchain-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 10,
                  xpReward: 20,
                  content: `# Lesson 10 — Foundry — the Rust EVM toolchain

## Question

**Foundry = the Rust-native Solidity toolchain.** Four binaries (\`forge\` test+build / \`cast\` chain CLI / \`anvil\` local node / \`chisel\` Solidity REPL), all using Revm internally. **20–30× faster than the JS toolchains (Hardhat / Truffle)** because it's in-process.

## Principle (minimum model)

- **Four binaries.** \`forge\` (tests + compile) / \`cast\` (curl + jq for EVM) / \`anvil\` (local node, \`--fork-url\` for mainnet fork) / \`chisel\` (Solidity REPL).
- **Install with \`foundryup\`.** \`curl -L https://foundry.paradigm.xyz | bash && foundryup\` — one-liner; updates the whole toolchain.
- **\`forge test\` = the Solidity-side \`cargo test\`.** \`.t.sol\` files + \`test*\` functions are auto-discovered; sub-second feedback via in-process Revm.
- **Cheatcodes = precompiles.** \`vm.warp\` / \`vm.deal\` / \`vm.prank\` are calls to the precompile at \`0x71097...\`. Structurally different from Hardhat's \`evm_snapshot\` (which is JSON-RPC).
- **Mastering Foundry course (Intermediate).** Discipline transfer (Rust proptest! → forge fuzz / forge invariant), Capstone proves \`InsuranceFund\` in two languages. This lesson is the entry point.

## Worked example + steps

# Foundry — the Rust EVM toolchain (orientation)


Foundry is the Rust EVM toolchain in the same lineage as Reth / Revm / Alloy, made up of four main tools:

| Tool | Role |
| :--- | :--- |
| **forge** | Solidity build / test |
| **cast** | RPC / calldata / storage inspection |
| **anvil** | Local node (including fork mode) |
| **chisel** | Solidity REPL |

Minimal setup:

\`\`\`bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge init counter && cd counter
forge test
\`\`\`

The one takeaway here: **\`forge test\` runs on top of Revm.** Foundry is not a parallel world cut off from node development — it's the developer-facing interface to the same execution engine.

## Where to go next

- Full Foundry orientation: \`/courses/mastering-foundry-en/lessons/foundry-orientation-en\`
- Cheatcode internals: \`/courses/mastering-foundry-en/lessons/foundry-anvil-cheatcodes-en\`
- Production-grade test discipline (fuzz / invariant / cheatcode) lives in the main Foundry course

## Test posture (minimum for this page)

Memorise three Foundry test shapes:

1. **unit** (\`forge test\`)
2. **fuzz** (input-space exploration)
3. **invariant** (preservation laws across call orderings)

Minimal cycle:

\`\`\`bash
forge test
forge test -vvv
forge snapshot
\`\`\`

Pre-production minimums:

- Verify failure paths with \`vm.expectRevert\`
- Verify key events with \`vm.expectEmit\`
- Fuzz public inputs that contain arithmetic
- Enforce accounting invariants with \`invariant\`

## Beyond this page (deduplicated into the dedicated course)

- Full test discipline: \`/courses/mastering-foundry-en/lessons/foundry-orientation-en\`
- Fuzz in practice: \`/courses/mastering-foundry-en/lessons/foundry-forge-fuzz-en\`
- Invariant in practice: \`/courses/mastering-foundry-en/lessons/foundry-forge-invariant-en\`
- Cheatcode / fork in practice: \`/courses/mastering-foundry-en/lessons/foundry-anvil-cheatcodes-en\`

## Summary (3 lines)

- Foundry = Rust Solidity toolchain; four binaries (forge / cast / anvil / chisel) on Revm; 20–30× faster than Hardhat/Truffle.
- \`forge test\` = \`cargo test\`-equivalent on in-process Revm. Cheatcodes are precompiles (\`vm.warp\` / \`vm.deal\` / \`vm.prank\` etc).
- Mastering Foundry Intermediate course deep-dives the discipline transfer. Next: Fundamentals final quiz.
`,
                },
                {
                  title: 'Quiz — Fundamentals',
                  slug: 'fundamentals-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 5,
                  duration: 12,
                  xpReward: 30,
                  content: `# Quiz — Fundamentals

## Question

Final check after 11 Fundamentals lessons — Alloy's Signer + Provider, EVM's ADD as a stack-machine instruction, Revm's modular design, which memory regions persist. **Five questions to consolidate the basics.**

## Principle (minimum model)

- **Alloy recap.** \`PrivateKeySigner::random()\` makes a signer; \`ProviderBuilder::new().connect_http(url)\` connects to a node; \`get_balance().await?\` fetches a balance.
- **EVM recap.** ADD = pop 2 + push 1 (wrapping); only **Storage** of the five regions persists (Stack / Memory / Calldata / Code are volatile).
- **Revm recap.** Modular design = easy to embed + Rust safety + performance = adopted by Foundry / Reth / OP-Reth / zkVMs / MEV bots.
- **Next step.** Bridge to Intermediate then the three Intermediate courses (Inside Revm / Inside Reth / Inside Alloy).

## Worked example + steps

# Fundamentals quiz

Check your grasp on Alloy, the EVM, and where Revm fits.

## Summary (3 lines)

- Five questions check the 11-lesson basics: Alloy Signer/Provider, EVM ADD + 5 regions, Revm modularity, Storage as the only persisted region.
- Fundamentals complete. Next: Bridge to Intermediate bridges to the three Intermediate courses (Revm / Reth / Alloy).
- Before moving on, run \`cargo new\` / \`forge init\` / \`anvil\` once each locally to make the muscle memory stick.
`,
                  quizQuestions: [
                    {
                      "question": "What does Alloy's `PrivateKeySigner::random()` give you?",
                      "options": [
                        "A connection to a public node",
                        "A signer object backed by a fresh random private key",
                        "A gas estimate",
                        "An audited smart contract"
                      ],
                      "correctIndex": 1,
                      "explanation": "PrivateKeySigner holds the private key and exposes signing methods. Use .address() to get the derived public address."
                    },
                    {
                      "question": "`ProviderBuilder::new().connect_http(url)` produces:",
                      "options": [
                        "A local web server",
                        "A Provider that talks JSON-RPC to a node",
                        "A wallet app",
                        "A new blockchain"
                      ],
                      "correctIndex": 1,
                      "explanation": "Provider is the RPC client. It exposes get_block_number, get_balance, etc."
                    },
                    {
                      "question": "How does the EVM `ADD` opcode work?",
                      "options": [
                        "Adds the first two bytes of memory",
                        "Pops two values from the stack and pushes their sum",
                        "Adds storage slots 0 and 1 and writes to slot 2",
                        "Doubles the gas limit"
                      ],
                      "correctIndex": 1,
                      "explanation": "The EVM is a stack machine. ADD pops two, sums them with uint256 wrap-around, and pushes the result."
                    },
                    {
                      "question": "Why is Revm the de facto execution engine in Foundry, Reth, and others?",
                      "options": [
                        "It's the only free Rust EVM",
                        "Its modular design lets you embed and customize it, with Rust's safety and speed",
                        "For Geth (Go) compatibility",
                        "It bundles the Solidity compiler"
                      ],
                      "correctIndex": 1,
                      "explanation": "The library-first design plus Rust ergonomics make it the reusable building block for EVM tools."
                    },
                    {
                      "question": "Which EVM region is persistent on-chain?",
                      "options": [
                        "Stack",
                        "Memory",
                        "Storage",
                        "Calldata"
                      ],
                      "correctIndex": 2,
                      "explanation": "Stack and memory are transient within a tx. Only Storage writes persist on-chain — and they're the most expensive."
                    }
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
