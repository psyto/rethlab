import { PrismaClient } from '@prisma/client';

export async function seedRethAlloyAdvancedEN(prisma: PrismaClient) {
  const tags = ['alloy', 'rust', 'advanced', 'rpc', 'provider'];

  await prisma.course.create({
    data: {
      slug: 'alloy-advanced-en',
      title: 'Alloy Advanced — Reading the Rust Ethereum Library',
      description:
        'Read the alloy source line by line — the `Provider` trait, the `Network` abstraction, and the `Signer`/`Filler` model. The third of three independent Advanced courses (Revm, Reth, Alloy) you can take in any order. Alloy is the foundation Reth and dapps build on, so this course pays back wherever you build Rust Ethereum code.',
      difficulty: 'INTERMEDIATE',
      duration: 120,
      xpReward: 340,
      track: 'alloy-advanced',
      tags,
      isPublished: true,
      sortOrder: 200,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Inside Alloy',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Welcome to Alloy Advanced — how this course works',
                  slug: 'alloy-advanced-welcome-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 7,
                  xpReward: 15,
                  content: `# Welcome to Alloy Advanced — how this course works

This is one of three independent Advanced-tier courses on RethLab:

- **Revm Advanced** — Inside the EVM engine
- **Reth Advanced** — Inside Reth: Staged Sync, ExEx, the Reth SDK
- **Alloy Advanced** (you are here) — Inside Alloy: Provider, Network, Signer

Alloy is the foundation everyone else builds on — Reth uses alloy types, Revm uses alloy primitives, and every dapp / MEV bot / indexer that talks to Ethereum from Rust uses the alloy \`Provider\`. This course teaches you to **read the alloy source**, the same way Revm Advanced teaches you to read revm.

> 📋 **First time at the Advanced tier?** Read **"How Advanced courses work"** at the end of *Bridge to Advanced* before starting. It explains the editorial style (Predict prompts, Quiz gates, the build-up → walkthrough → quiz → drill chain shape) and pacing — applies to all three Advanced courses, so you only read it once.

## What this course teaches

You'll read the [\`alloy-rs/alloy\`](https://github.com/alloy-rs/alloy) source line by line:

- The **\`Provider\` trait** — the central abstraction for talking to Ethereum nodes
- The **\`Network\` abstraction** — how alloy supports Ethereum, Optimism, Anvil, custom L2s with the same API surface
- The **\`Signer\` / \`Filler\` model** — how transaction signing, gas estimation, and nonce management compose into layered providers

Three topic chains, each with build-up + walkthrough + quiz + drill.

By the end, you'll be able to read alloy's hot path and build custom Provider layers — the same kind of code MEV pipelines, indexers, and Reth-SDK App-chains ship to production.

## Prerequisites

**Intermediate Rust** (covered in Bridge to Advanced):
- Generics with trait bounds, associated types, default type parameters
- \`Arc<T>\`, \`dyn Trait\`, layered ownership
- \`async\` / \`Future\` basics, the Tokio runtime model
- \`auto_impl\` macros and procedural attributes

**No EVM internals required.** Alloy operates above the EVM — it talks to nodes, not to opcodes. (If you're doing all three Advanced courses, you'll see EVM internals in Revm Advanced.)

**Familiarity with using alloy as a user** — \`Provider::get_balance\`, \`ProviderBuilder\`, signing a tx — covered in Fundamentals (\`alloy-primitives-signing\`, \`alloy-provider\`). If those concepts are shaky, do those Fundamentals lessons first; this course teaches you to *read* alloy, not to *use* it.

## Setup — do this once

Before lesson 1, have these ready in another window:

1. **\`alloy-rs/alloy\` cloned** — \`git clone https://github.com/alloy-rs/alloy\`
2. **A working \`cargo\` toolchain** — \`rustc --version\` should print something modern
3. **A second monitor or split terminal** — you'll be cross-referencing source while you read

The "Find in repo" prompts only work if you actually have the repo open. Close that loop before starting.

## You're ready

Scroll back to the course detail and start with **Building the \`Provider\` trait step by step**.

After Alloy Advanced: you've completed all three Advanced courses. **Expert** picks up the procedural-macro and zkVM-integration deep dives.`,
                },
                {
                  title: 'Building the \`Provider\` trait step by step',
                  slug: 'alloy-provider-buildup-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 25,
                  content: `# Building the \`Provider\` trait step by step

[\`alloy-rs/alloy\`](https://github.com/alloy-rs/alloy)'s \`Provider\` is the central abstraction for talking to Ethereum nodes. Every Rust dapp, MEV bot, indexer, and Reth-SDK app that touches an RPC endpoint uses it. Open \`crates/provider/src/provider/trait.rs\` and the trait looks like this (excerpted):

\`\`\`rust
#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait Provider<N: Network = Ethereum>: Send + Sync {
    fn root(&self) -> &RootProvider<N>;

    fn client(&self) -> ClientRef<'_> { self.root().client() }
    fn weak_client(&self) -> WeakClient { self.root().weak_client() }

    fn get_block_number(&self) -> ProviderCall<NoParams, U64, BlockNumber> { /* ... */ }
    fn get_balance(&self, address: Address) -> RpcWithBlock<Address, U256> { /* ... */ }
    fn call(&self, tx: N::TransactionRequest) -> EthCall<N> { /* ... */ }
    fn send_transaction(&self, tx: N::TransactionRequest) -> SendTransaction<N> { /* ... */ }
    // ...many more RPC methods
}
\`\`\`

Several things are happening at once: a generic over \`N: Network\` with a default, a \`root()\` accessor returning a separate \`RootProvider\` type, methods that return weird wrapper types (\`ProviderCall\`, \`RpcWithBlock\`, \`EthCall\`), and \`auto_impl\` covering five wrapper types.

Walk it cold and you get six new ideas at once. Easier path: **build it up.** Start from the dumbest RPC client you could write, then earn each piece of complexity. By the end you'll have built the real shape — Network parameterization, transport indirection, layered providers, and all.

> 📂 **Open \`alloy-rs/alloy\` in another tab.** Cross-check at every step. The exact module paths drift across releases; the structural shape we'll build is durable.

## Step 0 — The naive RPC client

If you were writing a Rust ↔ Ethereum bridge without thinking, your \`get_balance\` would look like:

\`\`\`rust
async fn get_balance(addr: Address) -> Result<U256, Box<dyn Error>> {
    let body = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "eth_getBalance",
        "params": [addr, "latest"],
        "id": 1,
    });
    let client = reqwest::Client::new();
    let resp = client.post("http://localhost:8545").json(&body).send().await?;
    let parsed: serde_json::Value = resp.json().await?;
    Ok(U256::from_str_radix(&parsed["result"].as_str().unwrap()[2..], 16)?)
}
\`\`\`

A free function. Hardcoded URL. Hardcoded transport (HTTP). Hardcoded chain (Ethereum-shaped JSON-RPC).

> 🛑 **Predict.** Without scrolling: name three reasons this naive design doesn't survive contact with production. Hint — each is a different *kind of* problem.

The three:

1. **URL hardcoded.** No way to point at Anvil, mainnet via Alchemy, a private node, or a fork harness without rewriting the function.
2. **Transport hardcoded.** Only HTTP. WebSocket subscriptions and IPC connections are different transport mechanics; baking HTTP in means writing the function three times for the three transports.
3. **Chain hardcoded.** Optimism transactions have an \`L1Cost\` field. Custom L2s have their own envelope shapes. JSON-RPC method names overlap but parameter and response types differ. Hardcoding Ethereum's shape means you can't talk to anything else.

The fix: **abstract these three axes into traits.** Each axis becomes a generic parameter, the user picks once at construction, the trait method body stays the same.

## Step 1 — First trait: a Provider over RPC methods

\`\`\`rust
#[async_trait]
pub trait Provider {
    async fn get_balance(&self, address: Address) -> Result<U256>;
    async fn get_block_number(&self) -> Result<u64>;
    async fn call(&self, tx: TransactionRequest) -> Result<Bytes>;
    async fn send_transaction(&self, tx: TransactionRequest) -> Result<TxHash>;
    // ... 30+ more methods, one per Ethereum RPC verb
}
\`\`\`

\`Provider\` is now a trait. Implementations pick how to actually fulfill the calls (HTTP, WebSocket, mock, etc.). The user works against the trait and never thinks about transport.

This works for *Ethereum*. But the moment you want Optimism, the trait is wrong.

## Step 2 — Multiple chains: the \`Network\` abstraction

Optimism's \`TransactionRequest\` includes an \`l1_block_number\` hint. Optimism receipts have an \`l1_fee\` field. The same RPC method names exist (\`eth_sendTransaction\`, \`eth_getTransactionReceipt\`), but the *types* differ.

You don't want to write \`OptimismProvider\` as a parallel trait — it'd be 90% identical. Instead, **abstract the chain primitives behind a \`Network\` trait**:

\`\`\`rust
pub trait Network: Send + Sync + 'static {
    type TxEnvelope: ...;            // signed transaction representation
    type UnsignedTx: ...;            // unsigned tx
    type ReceiptEnvelope: ...;       // signed receipt
    type Header: ...;                // block header
    type TransactionRequest: ...;    // RPC call shape
    type TransactionResponse: ...;   // RPC response
    type ReceiptResponse: ...;
    type HeaderResponse: ...;
    type BlockResponse: ...;
}

pub struct Ethereum;
impl Network for Ethereum { /* ...standard types... */ }

pub struct Optimism;
impl Network for Optimism { /* ...op-specific types... */ }
\`\`\`

\`Network\` is a *type-level dictionary* — picking \`N: Network\` selects the bundle of types the chain uses, all in one place.

Now \`Provider\` becomes generic over \`N\`:

\`\`\`rust
pub trait Provider<N: Network> {
    async fn get_balance(&self, address: Address) -> Result<U256>;  // unchanged — common to all chains
    async fn call(&self, tx: N::TransactionRequest) -> Result<Bytes>;  // chain-specific
    async fn send_transaction(&self, tx: N::TransactionRequest) -> Result<...>;  // chain-specific
    // ...
}
\`\`\`

> 🛑 **Predict.** Why is \`N: Network = Ethereum\` (with a default type parameter) better than \`N: Network\` with no default?

Because **99% of users want Ethereum.** A default lets them write \`Provider\` instead of \`Provider<Ethereum>\` everywhere. Only Optimism / custom-L2 users override. Default type parameters keep the common case ergonomic and the rare case explicit.

The real alloy trait has exactly this default: \`pub trait Provider<N: Network = Ethereum>\`.

## Step 3 — Multiple transports: the indirection

Now picture two implementations: \`HttpProvider\` and \`WsProvider\`. Both fulfill the trait. But the *underlying client* (a thing that knows how to send JSON-RPC payloads) is different — one is a \`reqwest::Client\`, the other is a WebSocket connection.

If transport is part of the type, you'd have:

\`\`\`rust
struct HttpProvider<N: Network> { client: reqwest::Client, url: Url, _phantom: PhantomData<N> }
struct WsProvider<N: Network>   { conn: WsConnection, _phantom: PhantomData<N> }
struct IpcProvider<N: Network>  { /* ... */ }
\`\`\`

Three structs with the same trait methods, copy-pasted bodies. Bad.

Better: **introduce a transport trait**. The provider holds *something* that can send JSON-RPC; the something is itself a trait object:

\`\`\`rust
pub trait Transport {
    async fn send(&self, request: RpcRequest) -> Result<RpcResponse>;
}

// One concrete provider, parameterized over transport
pub struct ProviderImpl<T: Transport, N: Network> {
    transport: T,
    _network: PhantomData<N>,
}
\`\`\`

> 🔍 **Find in repo.** Search alloy for \`alloy-transport\` and \`alloy-transport-http\`. Notice how transports are separate crates. That's so you can depend on \`alloy-transport-http\` *or* \`alloy-transport-ws\` without pulling in the other.

(In current alloy, the transport trait has evolved into a more elaborate \`Transport\` + \`TransportConnect\` design with \`tower::Service\` underneath, but the structural decision — abstracting transport so one provider impl works for all — is the durable shape.)

## Step 4 — \`RootProvider\` and the \`root()\` indirection

So far we have one struct: \`ProviderImpl<T, N>\`. But there's a problem the SDK people who designed alloy ran into: **users want to wrap providers**.

Imagine you want a provider that *automatically signs* outgoing transactions. You'd write \`SignerProvider\` that wraps an inner \`Provider\` and overrides \`send_transaction\`:

\`\`\`rust
pub struct SignerProvider<P: Provider, S: Signer> {
    inner: P,
    signer: S,
}
\`\`\`

If \`SignerProvider\` itself implements \`Provider\` (forwarding most methods to \`inner\` and overriding \`send_transaction\`), users can stack: \`SignerProvider<NonceFiller<HttpProvider>>\`.

But these wrappers don't have their own transport — they need to delegate to the *innermost* provider for transport access. Hence the \`root()\` method:

\`\`\`rust
pub trait Provider<N: Network = Ethereum> {
    fn root(&self) -> &RootProvider<N>;
    // default impls of every RPC method delegate through self.root()
}

pub struct RootProvider<N: Network = Ethereum> {
    client: ClientRef<'_>,  // the actual transport
    _network: PhantomData<N>,
}
\`\`\`

\`RootProvider\` is the **concrete struct that owns the transport**. Every other Provider impl just holds an inner provider and forwards \`root()\` to that inner. The trait's default methods can fall back to \`self.root()\` for transport access — so wrapper authors only override what they specifically want to change.

> 🛑 **Anti-fluency check.** Without scrolling: imagine you're writing \`SignerProvider\`. Which method do you override, which do you let the default handle? Why does the \`root()\` indirection make this clean?

You override \`send_transaction\` (sign the tx, then forward to inner). For everything else (\`get_balance\`, \`call\`, etc.), you let the trait's default impls fire — they use \`self.root()\` to get the transport. **You write 1 method body instead of 30.**

## Step 5 — Layered providers: \`FillProvider\` and \`Filler\`

The wrapper pattern from Step 4 generalizes. Common needs:

- **Sign outgoing transactions** (\`Signer\`)
- **Fill in nonces** (query \`get_transaction_count\` if the user didn't specify one)
- **Fill in gas estimates** (run \`estimate_gas\` if the user didn't specify gas limit)
- **Fill in chain ID** (query \`chain_id\` once, attach to every tx)

Each is a \`Filler\` — a small piece of logic that mutates an outgoing \`TransactionRequest\` before sending. Composed via:

\`\`\`rust
pub struct FillProvider<F: Filler<N>, P: Provider<N>, N: Network> {
    filler: F,
    inner: P,
    _network: PhantomData<N>,
}

impl<F: Filler<N>, P: Provider<N>, N: Network> Provider<N> for FillProvider<F, P, N> {
    fn root(&self) -> &RootProvider<N> { self.inner.root() }

    async fn send_transaction(&self, mut tx: N::TransactionRequest) -> Result<...> {
        self.filler.fill(&mut tx).await?;
        self.inner.send_transaction(tx).await
    }
}
\`\`\`

Stack them: \`FillProvider<NonceFiller, FillProvider<GasFiller, FillProvider<SignerFiller, RootProvider>>>\`. Each layer fills one piece. The user assembles via the builder:

\`\`\`rust
let provider = ProviderBuilder::new()
    .filler(NonceFiller)
    .filler(GasFiller)
    .signer(my_signer)
    .on_http(url);
\`\`\`

Each \`.filler(...)\` call wraps the inner provider in another \`FillProvider\` layer. **Composition over inheritance, applied to RPC client construction.**

## Step 6 — \`auto_impl\` for shared usage

Last piece. Real alloy has:

\`\`\`rust
#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait Provider<N: Network = Ethereum>: Send + Sync { /* ... */ }
\`\`\`

\`auto_impl\` derives \`Provider\` for \`&P\`, \`&mut P\`, \`Box<P>\`, \`Rc<P>\`, \`Arc<P>\` whenever \`P: Provider\`. Why?

Because **MEV bots, indexers, and dapp servers all want to share one provider across many tasks**. The natural shape is \`Arc<Provider>\` — clone the Arc cheaply, hand it to a thousand worker tasks, they all hit the same connection pool. \`auto_impl\` makes \`Arc<P>\` implement \`Provider\` for free, so callers can use \`Arc<dyn Provider>\` or \`Arc<P>\` interchangeably with \`P\` itself.

## What you've built

\`\`\`rust
#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait Provider<N: Network = Ethereum>: Send + Sync {
    fn root(&self) -> &RootProvider<N>;
    // default-impl'd RPC methods that delegate via self.root()
}
\`\`\`

Every piece earned its keep:

- **\`N: Network = Ethereum\`** (Step 2) — type-level dictionary, default keeps Ethereum users ergonomic
- **Transport trait abstraction** (Step 3) — one provider impl works across HTTP / WS / IPC
- **\`RootProvider\` + \`root()\`** (Step 4) — wrappers can delegate transport access without re-implementing 30 methods
- **\`FillProvider\` / \`Filler\`** (Step 5) — composable layering for signing, nonces, gas
- **\`auto_impl\`** (Step 6) — \`Arc<P>\` works as \`Provider\`; cheap to share across tasks

The next lesson reads alloy's actual \`crates/provider/src/provider/trait.rs\` line by line, mapping every line back to the build-up step that motivated it.

## Recall before moving on

Without scrolling:

1. Why is \`N: Network = Ethereum\` (with a default) better than \`N: Network\` (no default)?
2. What problem does \`root()\` solve that "every Provider impl owns its own transport" wouldn't?
3. Sketch what the \`Provider\` impl on \`SignerProvider\` looks like — which method body do you write, and which use the default?
4. Why is \`auto_impl(Arc, ...)\` important for production usage of alloy?

If any answer is shaky, scroll back. The next lesson is a guided walkthrough of the real alloy \`Provider\` source.
`,
                },
                {
                  title: 'Reading the real \`Provider\` trait',
                  slug: 'alloy-provider-walkthrough-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 10,
                  xpReward: 25,
                  content: `# Reading the real \`Provider\` trait

The build-up constructed every part of \`Provider\` from a naive starting point. This lesson does the inverse — opens [\`crates/provider/src/provider/trait.rs\`](https://github.com/alloy-rs/alloy/blob/main/crates/provider/src/provider/trait.rs) and reads the production version line by line, mapping each piece back to its motivation.

Most importantly, this lesson covers what the build-up deliberately glossed over: the **return-type machinery** (\`ProviderCall\`, \`RpcWithBlock\`, \`EthCall\`, \`PendingTransactionBuilder\`). Those wrapper types are the part of alloy that newcomers find weirdest — and once you see why they exist, the trait surface stops looking arbitrary.

> 📂 **Open \`alloy-rs/alloy/crates/provider/src/provider/trait.rs\` now.** The exact line numbers and method bodies drift; the structural points are durable. When the lesson says "in current alloy main," **verify yourself** before quoting it elsewhere.

## The trait header

\`\`\`rust
#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait Provider<N: Network = Ethereum>: Send + Sync {
    fn root(&self) -> &RootProvider<N>;

    fn client(&self) -> ClientRef<'_> {
        self.root().client()
    }

    fn weak_client(&self) -> WeakClient {
        self.root().weak_client()
    }
    // ...many RPC methods, all default-impl'd
}
\`\`\`

Three things to look hard at:

### \`Send + Sync\` supertraits

Every \`Provider\` implementation must be safe to send across threads (\`Send\`) and reference from multiple threads (\`Sync\`). This isn't decorative — production users wrap providers in \`Arc<P>\` and clone the Arc into many task handlers (workers, MEV searchers, indexer streams). Without \`Send + Sync\`, those usages don't compile.

### \`#[auto_impl(&, &mut, Box, Rc, Arc)]\`

Five wrappers. Same shape as \`DatabaseRef\` from Revm Advanced, and for the same reason: \`Provider\` only needs \`&self\` to read state — no \`&mut self\` mutation in the method signatures — so all five wrapper types work through the trait. \`Arc<P>\` and \`Rc<P>\` give you cheap shareable handles.

> 🛑 **Predict.** \`Database\` (in revm) had \`auto_impl(&mut, Box)\` — only two wrappers. \`Provider\` (here) has five. **What's the structural difference between \`Database\` and \`Provider\` that drives the asymmetry?**

\`Database\`'s methods take \`&mut self\` (so impls can cache reads in place). That excludes \`&\`/\`Rc\`/\`Arc\` because those don't give out \`&mut T\`. \`Provider\`'s methods take \`&self\` — caching, if needed, has to use interior mutability inside the implementation (\`Mutex\`, \`OnceLock\`, atomic primitives). The wider \`auto_impl\` list is a direct consequence of the \`&self\` choice. Same trade-off shape, different decision per use case.

### \`root()\` is the one required method

Everything else has a default impl. **An impl just needs to point at the root.** Wrapping providers (signer, gas filler, nonce filler) implement \`root()\` by forwarding to their inner: \`self.inner.root()\`. The trait's default methods then route through \`self.root()\` for transport access. **Wrapper authors write one line.**

> 🔍 **Find in repo.** Search for \`fn root(&self) -> &RootProvider\` across alloy. Count the impls — every wrapper provider, every adapter, every test fixture has one. This is the load-bearing method of the whole design.

## The transport accessors: \`client()\` vs \`weak_client()\`

Two flavors:

\`\`\`rust
fn client(&self) -> ClientRef<'_>     // strong reference, lifetime-bounded
fn weak_client(&self) -> WeakClient   // owned weak reference, no lifetime
\`\`\`

Why two?

- **\`client()\`** for synchronous calls: you borrow the client briefly, send a request, get a response. Lifetime-bounded — you can't outlive the borrow.
- **\`weak_client()\`** for tasks that outlive the borrow: subscriptions, long-lived background tasks, anything spawned with \`tokio::spawn\` that needs a handle to the client without keeping the provider alive. \`Weak\` references don't prevent drop; if the provider is dropped, the task notices and shuts down.

The asymmetry maps to the two operational modes alloy supports: short-lived RPC calls and long-lived subscription streams.

## The RPC method surface — three representative shapes

Don't try to read all 30+ methods. Read three that show the *return-type pattern*:

### \`get_block_number\` — no params, simple result

\`\`\`rust
fn get_block_number(&self) -> ProviderCall<NoParams, U64, BlockNumber> {
    self.client().request_noparams("eth_blockNumber").into()
}
\`\`\`

\`ProviderCall<P, R, F>\` is a **future-builder** — it represents an in-flight RPC call you haven't \`await\`ed yet. The three type parameters: \`P\` = params type, \`R\` = raw response type, \`F\` = final user-facing type (e.g., \`BlockNumber\` is \`U64\` re-typed for ergonomics).

Why isn't it just \`impl Future<Output = u64>\`? Because **\`ProviderCall\` lets you customize the call before awaiting it.** For \`get_block_number\` there's not much to customize, but the trait uses the same shape for all RPC methods, so the customization machinery is always available.

### \`get_balance\` — block selector via builder

\`\`\`rust
fn get_balance(&self, address: Address) -> RpcWithBlock<Address, U256> {
    RpcWithBlock::new_provider(move |block| {
        self.client().request("eth_getBalance", (address, block)).into()
    })
}
\`\`\`

\`RpcWithBlock\` is a builder that lets the user pick **which block** to query at the call site:

\`\`\`rust
provider.get_balance(addr).await                            // latest (default)
provider.get_balance(addr).block_id(1_000_000.into()).await // historical
provider.get_balance(addr).hash(some_hash).await            // by block hash
provider.get_balance(addr).pending().await                  // pending block
\`\`\`

Hardcoding "latest" inside \`get_balance\` would force users who want historical or pending queries to construct different method calls. The builder pattern keeps **one method, many ways to query**.

> 🛑 **Anti-fluency.** Why is the block selector chosen at the call site (via \`.block_id(...)\`) rather than passed as a function argument like \`get_balance(addr, block_id)\`?

Because most calls want \`latest\` and bloating every method's signature with a \`block_id\` parameter would be noisy at every call site. The builder pattern keeps the common case (\`get_balance(addr).await\`) terse and the rare case (\`...block_id(N).await\`) explicit. Same trade-off as default type parameters — bias the API toward the 95% case.

### \`call\` — the customization-heavy one

\`\`\`rust
fn call(&self, tx: N::TransactionRequest) -> EthCall<N> {
    EthCall::new(self.client(), tx)
}
\`\`\`

\`EthCall\` is the most elaborate builder. Look at what you can chain on it:

- \`.block(BlockId)\` — eth_call against a specific block
- \`.overrides(state_overrides)\` — eth_call with state overrides (impersonate accounts, override balances, override code)
- \`.gas(...)\`, \`.value(...)\`, \`.from(...)\` — modify the tx before the call

The \`eth_call\` JSON-RPC method has 4-5 optional parameters. Encoding all of them in one method signature would be an unreadable mess. The builder pattern factors them out into chainable methods. **Each is its own \`fn\` on \`EthCall\`, independent of \`Provider\`.**

> 🔍 **Find in repo.** Open \`crates/provider/src/provider/eth_call.rs\` (or wherever \`EthCall\` lives in the version you have). Count the chainable methods. That count IS the API surface of \`eth_call\` — they map 1:1 with the optional fields of the JSON-RPC method.

## The pattern: builder return types

Three return shapes (\`ProviderCall\`, \`RpcWithBlock\`, \`EthCall\`) might look like API bloat. They're not. **Each one is a generic builder pattern matched to the optionality structure of the underlying RPC method.**

| RPC method | Optional params | Return type |
| :--- | :--- | :--- |
| \`eth_blockNumber\` | none | \`ProviderCall\` (just await) |
| \`eth_getBalance\` | block | \`RpcWithBlock\` (one optional dimension) |
| \`eth_call\` | block, from, gas, value, state | \`EthCall\` (many optional dimensions) |

Each return type exposes exactly the customizations that match the JSON-RPC spec for that method. **Type-driven discoverability** — the IDE shows you the legal optionals via the builder methods on the return type.

## How default impls work

The trait body is mostly default impls. Almost every method follows this shape:

\`\`\`rust
fn get_X(&self, args...) -> SomeReturnType {
    self.client().request("rpc_methodName", args).into()
}
\`\`\`

Build the request via the client (\`self.client()\` ultimately reaches \`RootProvider\`'s transport). Convert into the appropriate builder/future type via \`.into()\`.

This is why **wrapper providers don't have to override anything except what they actually change.** \`SignerProvider\` overrides \`send_transaction\`; everything else falls through to the default, which uses \`self.root()\` (and from there, the transport) automatically.

## \`PendingTransactionBuilder\` — sending transactions

One method worth a separate look:

\`\`\`rust
fn send_transaction(&self, tx: N::TransactionRequest) -> SendTransaction<N>
\`\`\`

\`SendTransaction\` is similar to the builders above, but it handles a multi-step interaction:

1. Submit the transaction (returns a \`PendingTransactionBuilder\`)
2. Optionally configure: how many confirmations to wait for, timeout, etc.
3. Await — get back the receipt once the transaction is mined

The builder lets the user choose the level of "waiting":

\`\`\`rust
provider.send_transaction(tx).await?                       // tx hash only, no waiting
provider.send_transaction(tx).with_required_confirmations(3).get_receipt().await? // wait 3 blocks
\`\`\`

Same builder pattern, but stretched across the **state machine of "tx submitted → mined → confirmed."**

## Recall before the quiz

Without scrolling:

1. \`Provider\` has \`auto_impl(&, &mut, Box, Rc, Arc)\` while \`Database\` has \`auto_impl(&mut, Box)\`. What's the load-bearing structural difference between the two traits that drives that?
2. Why does \`get_balance\` return \`RpcWithBlock\` instead of \`impl Future<Output = U256>\`?
3. \`SignerProvider\` (a wrapper provider) needs to forward 30+ methods to its inner provider. How many method bodies does the author actually write, and why?
4. \`weak_client()\` exists alongside \`client()\`. When would you use the weak version?

The next lesson is a quiz that gates progression. **You can't nod past a quiz** — engage with these recalls now if any answer is shaky.
`,
                },
                {
                  title: 'Quiz: did the \`Provider\` trait shape stick?',
                  slug: 'alloy-provider-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 4,
                  xpReward: 25,
                  content: `# Quiz: did the \`Provider\` trait shape stick?

Four questions covering the design decisions across the buildup and walkthrough. Same rule as the other Advanced quizzes: **you can't nod past a quiz.**

If you miss two or more, scroll back to *Building the \`Provider\` trait step by step* before going on to the drill.`,
                  quizQuestions: [
                    {
                      question: "`Provider` has `auto_impl(&, &mut, Box, Rc, Arc)` (5 wrappers) while Revm's `Database` has `auto_impl(&mut, Box)` (2 wrappers). What's the load-bearing structural difference between the two traits that drives this asymmetry?",
                      options: [
                        "`Database` is older; the auto_impl list grew over time as newer wrappers were added.",
                        "`Provider` requires `Send + Sync`; `Database` doesn't, so more wrapper types are valid.",
                        "`Provider`'s methods take `&self` (caching is delegated to interior mutability inside the impl). `Database`'s methods take `&mut self` so impls can mutate caches in place — but `&mut self` excludes `&`/`Rc`/`Arc` because those only yield `&T`.",
                        "The auto_impl crate doesn't support `Rc`/`Arc` for traits with operations that may fail.",
                      ],
                      correctIndex: 2,
                      explanation: "The receiver type drives wrapper compatibility. `&mut self` excludes `&`/`Rc`/`Arc` because those only give out `&T`. `&self` works through all wrappers because they all give out `&T`. Both designs are valid — the trade-off is between in-place caching (Database's choice) and shared concurrent access (Provider's choice). Database picks &mut to avoid forcing every impl to wrap its cache in `RwLock`. Provider picks &self because production users want to share one provider across many tasks via `Arc<P>`.",
                    },
                    {
                      question: "Why is `Provider<N: Network = Ethereum>` parameterized with a *default* type parameter rather than just `Provider<N: Network>`?",
                      options: [
                        "Rust requires generic traits to have defaults to support `dyn Trait`.",
                        "The vast majority of users want Ethereum. The default lets them write `Provider` instead of `Provider<Ethereum>` everywhere — only Optimism / custom-L2 users override.",
                        "`Network` is not a real trait — it's a marker for documentation purposes only.",
                        "Alloy started as an Ethereum-only library and the generic parameter is a backwards-compat shim.",
                      ],
                      correctIndex: 1,
                      explanation: "Default type parameters keep the common case ergonomic and the rare case explicit. Without the default, every Ethereum user would have to spell out `Provider<Ethereum>` everywhere. The trait isn't Ethereum-only by design — alloy explicitly supports Optimism, Anvil, and custom L2s — but Ethereum is the 95% case so the API biases toward it. Same shape as Revm's `IT: ITy` generic — abstract over the variation, default to the dominant case.",
                    },
                    {
                      question: "Why does `get_balance` return `RpcWithBlock<Address, U256>` instead of `impl Future<Output = U256>`?",
                      options: [
                        "`RpcWithBlock` is faster than `Future` — it implements lazy evaluation that `Future` cannot.",
                        "`RpcWithBlock` is a builder that lets the user pick which block to query at the call site (`.block_id(N)`, `.hash(...)`, `.pending()`) before awaiting. Hardcoding 'latest' inside `get_balance` would force users with historical queries into a different method.",
                        "Rust doesn't allow trait methods to return `impl Future` directly.",
                        "`RpcWithBlock` is a backwards-compat wrapper around the eventual `impl Future`; future versions of alloy will drop it.",
                      ],
                      correctIndex: 1,
                      explanation: "Each RPC method has a specific *optionality structure* — `eth_getBalance` can be queried at any block. The builder return type exposes those options as chainable methods. The common case (`.await` for latest) stays terse; the rare case (`.block_id(N).await`) is explicit. `EthCall` does the same thing for `eth_call`'s 4-5 optional parameters. The shape is **type-driven discoverability**: the IDE shows you the legal optionals via the builder methods on the return type.",
                    },
                    {
                      question: "You're writing `SignerProvider` — a wrapper provider that signs outgoing transactions before forwarding them to an inner provider. The trait has 30+ methods. How many method bodies do you actually write?",
                      options: [
                        "30+ — every method has to be implemented because the trait is non-default.",
                        "1 — just `send_transaction`. The other methods come from `auto_impl`.",
                        "2 — `root()` (forward to `self.inner.root()`) and `send_transaction` (sign, then forward to inner). Every other method's default impl uses `self.root()` automatically — routing through the inner provider's transport.",
                        "Around 5 — `root()`, `send_transaction`, plus the related methods `estimate_gas`, `get_transaction_count`, and `chain_id` for nonce / gas / chain handling.",
                      ],
                      correctIndex: 2,
                      explanation: "Two methods total. `root()` is the only *required* method (one line forwarding to `self.inner.root()`). `send_transaction` is the one we want to customize. Everything else gets the trait's default impl, which uses `self.root()` to access the transport — and that automatically routes through the inner provider's transport because the inner's `root()` is what we forwarded to. This is why the `root()` indirection from Step 4 of the buildup is the **load-bearing** design choice. (Nonce, gas, and chain-id filling are handled by separate `Fillers` — composed alongside `SignerProvider` in a `FillProvider` chain.)",
                    },
                  ],
                },
                {
                  title: 'Drill: build a logging Provider wrapper',
                  slug: 'alloy-provider-drill-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 12,
                  xpReward: 25,
                  content: `# Drill: build a logging Provider wrapper

Reading is rehearsal. **Doing is memory.** This drill takes you from "I've read about wrapper providers" to "I have written one, run it against a real RPC endpoint, and watched my code on the path of every call."

You'll write a \`LoggingProvider\` that wraps any other Provider and logs every selected RPC call before forwarding to the inner provider. This is **exactly the kind of code production indexers and MEV pipelines ship**: observability layered on top of an RPC client without forking alloy.

## Setup

You'll need three things:

1. **Foundry / Anvil** — the local Ethereum dev node alloy talks to:

   \`\`\`bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   \`\`\`

2. **A fresh cargo project** — separate from the alloy clone, but depending on alloy:

   \`\`\`bash
   cargo new alloy-logging-drill --bin
   cd alloy-logging-drill
   \`\`\`

3. **Add alloy + tokio + tracing to \`Cargo.toml\`**:

   \`\`\`toml
   [dependencies]
   alloy = { version = "0.x", features = ["full", "provider-http", "node-bindings"] }
   tokio = { version = "1", features = ["full"] }
   tracing = "0.1"
   tracing-subscriber = { version = "0.3", features = ["env-filter"] }
   \`\`\`

   (Pin to whichever current alloy version you cloned for the find-in-repo prompts. The structural shape of \`Provider\` is durable across versions; specific feature flags drift.)

## Drill 1 — Read \`FillProvider\` first

Before writing your own wrapper, read alloy's existing one. Open the \`alloy-rs/alloy\` clone and find:

\`\`\`
crates/provider/src/fillers/mod.rs
\`\`\`

> 🔍 **Find \`impl<F, P, N> Provider<N> for FillProvider<F, P, N>\`** (or the equivalent shape in your version). Look at:
>
> 1. The \`root()\` method — what does it return? *(should forward to \`self.inner.root()\`)*
> 2. Which RPC methods does \`FillProvider\` explicitly override? *(should be a small handful — \`send_transaction\`, maybe \`call\`/\`estimate_gas\` for gas filling)*
> 3. The methods that AREN'T overridden — they fall through to the trait's default impls. **What gives those defaults access to the inner provider's transport?**

> 🛑 **Question (write it down before scrolling):** \`FillProvider\` overrides ~3-5 methods out of 30+. The other ~25 methods route correctly without any code in \`FillProvider\`. **How?**

Because the trait's default impls call \`self.client()\`, which falls back to \`self.root().client()\`. \`FillProvider\`'s \`root()\` returns \`self.inner.root()\` — so every default-impl method automatically routes through the inner provider's transport. **No code per method.** This is the payoff of the \`root()\` indirection from the buildup.

## Drill 2 — Sketch your \`LoggingProvider\`

In your \`src/main.rs\` (or a separate \`src/logging_provider.rs\` if you prefer):

\`\`\`rust
use alloy::network::{Ethereum, Network};
use alloy::primitives::Address;
use alloy::providers::{Provider, RootProvider};
use std::marker::PhantomData;

pub struct LoggingProvider<P, N: Network = Ethereum> {
    inner: P,
    _network: PhantomData<N>,
}

impl<P, N: Network> LoggingProvider<P, N> {
    pub fn new(inner: P) -> Self {
        Self { inner, _network: PhantomData }
    }
}

impl<P, N> Provider<N> for LoggingProvider<P, N>
where
    P: Provider<N>,
    N: Network,
{
    fn root(&self) -> &RootProvider<N> {
        self.inner.root()
    }

    fn get_balance(&self, address: Address) -> alloy::providers::RpcWithBlock<Address, alloy::primitives::U256> {
        tracing::info!(?address, "LoggingProvider: get_balance called");
        self.inner.get_balance(address)
    }
}
\`\`\`

(The exact return type of \`get_balance\` may have a slightly different alias in your version of alloy. Adjust to match what your IDE shows for the trait's signature; the structure is the same.)

> 🛑 **Predict before continuing.** You wrote 2 method bodies (\`root\` + \`get_balance\`). Will calling \`logging_provider.get_block_number().await\` log anything? Why or why not?

It won't — you only intercepted \`get_balance\`. \`get_block_number\` falls through to the trait's default impl, which uses \`self.client()\` to route directly to the underlying transport via \`self.root()\`. **Logging is opt-in per method**: the wrapper only sees what you explicitly intercept.

For a production observability layer, you'd intercept the methods that matter (\`send_transaction\`, \`call\`, \`get_logs\`, \`get_balance\`) — not all 30+. Same payoff: write the bodies that earn their keep, default the rest.

## Drill 3 — Wire it up against Anvil

Start Anvil in a second terminal:

\`\`\`bash
anvil
\`\`\`

(Default: \`http://localhost:8545\`, chain ID 31337, with 10 prefunded accounts.)

In your \`main.rs\`:

\`\`\`rust
use alloy::providers::ProviderBuilder;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    let inner = ProviderBuilder::new()
        .on_http("http://localhost:8545".parse()?);

    let provider = LoggingProvider::new(inner);

    // First prefunded Anvil account
    let addr: Address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".parse()?;
    let balance = provider.get_balance(addr).await?;
    println!("balance: {balance}");

    // This should NOT log (we didn't intercept get_block_number)
    let block_number = provider.get_block_number().await?;
    println!("block: {block_number}");

    Ok(())
}
\`\`\`

\`cargo run\`. You should see:

\`\`\`
INFO LoggingProvider: get_balance called address=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
balance: 10000000000000000000000
block: 0
\`\`\`

> 🛑 **Watch the output.** Confirm the log fires *only* for \`get_balance\`, not for \`get_block_number\`. If both log, your code is wrong (you accidentally overrode something else). If neither logs, the wrapper isn't being used (you forgot to wrap, or \`tracing_subscriber\` isn't initialized).

## Drill 4 — Stack it with \`ProviderBuilder\`'s Fillers

Real production providers are usually *already* wrapped in \`FillProvider\`s for nonce/gas/chain-id management. Your \`LoggingProvider\` should compose with those, not replace them.

Modify your wiring to include alloy's recommended fillers:

\`\`\`rust
let inner = ProviderBuilder::new()
    .with_recommended_fillers()  // adds nonce + gas + chain-id fillers
    .on_http("http://localhost:8545".parse()?);

let provider = LoggingProvider::new(inner);

let bal = provider.get_balance(addr).await?;
\`\`\`

> 🔍 **Question:** Run it. Does the log still fire? Why does the layering work — \`LoggingProvider<FillProvider<NonceFiller, FillProvider<GasFiller, FillProvider<ChainIdFiller, RootProvider>>>>\` is a tower of wrappers. **What property of \`Provider\` makes this composition automatic?**

Because every wrapper's \`root()\` forwards to the next inner level, and the trait's default impls only need access to the root via \`self.root()\`. The whole tower flattens at the trait level — **N levels of wrappers, 1 indirection chain at runtime.**

This is the architectural unlock: arbitrary composition of wrappers, no wrapper is aware of the others, and adding a new wrapper layer is purely additive code.

## End-of-lesson recall

Without scrolling, in your own words:

1. \`FillProvider\` overrides ~3-5 methods out of 30+. **What gives the un-overridden methods access to the inner provider's transport?**
2. Your \`LoggingProvider\` only logs \`get_balance\`. Why does \`get_block_number\` not log even though it's called on the same wrapper?
3. \`LoggingProvider<FillProvider<...>>\` is a stack of wrappers. **What single trait-level property makes this composition automatic, without each wrapper knowing about the others?**

If any answer is shaky, the lesson isn't done with you. Re-run the drill or re-read the buildup's Step 4 (\`root()\`).

After this drill, you've shipped the same kind of code MEV pipelines and indexers use in production — observability layered on top of alloy without forking it. **Next chain: the \`Network\` abstraction.**`,
                },
                {
                  title: 'Building the \`Network\` trait step by step',
                  slug: 'alloy-network-buildup-en',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 10,
                  xpReward: 25,
                  content: `# Building the \`Network\` trait step by step

The Provider chain mentioned \`N: Network = Ethereum\` but treated \`Network\` as a black box. **This chain opens it up.** \`Network\` is alloy's *type-level dictionary* for chain-specific primitives — the mechanism that lets one \`Provider\` impl talk to Ethereum, Optimism, Anvil, and custom L2s with the same API surface.

By the end of this lesson you'll have built every piece of:

\`\`\`rust
pub trait Network: Send + Sync + 'static {
    type TxType: ...;
    type TxEnvelope: ...;
    type UnsignedTx: ...;
    type ReceiptEnvelope: ...;
    type Header: ...;
    type TransactionRequest: ...;
    type TransactionResponse: ...;
    type ReceiptResponse: ...;
    type HeaderResponse: ...;
    type BlockResponse: ...;
}
\`\`\`

Ten associated types. The shape looks weird until you see the failure modes that drive each one.

> 📂 **Open \`alloy-rs/alloy/crates/network\` in another tab.** And keep \`crates/consensus\` ready — most of the concrete types (\`TxEnvelope\`, \`Header\`, etc.) live there.

## Step 0 — The naive Provider, hardcoded to Ethereum

Earlier, our Provider \`send_transaction\` looked like:

\`\`\`rust
fn send_transaction(&self, tx: EthereumTransactionRequest) -> SendTransaction;
\`\`\`

Hardcoded \`EthereumTransactionRequest\`. Hardcoded receipts. Hardcoded block headers.

> 🛑 **Predict.** Without scrolling: name three production chains where this hardcoded design breaks. Hint — each is a *different shape* of transaction or receipt.

The three:

1. **Optimism.** Tx envelopes include a \`mint\` field for L1-deposit-derived ETH. Receipts include \`l1_gas_used\` and \`l1_block_number\`. Hardcoded Ethereum types can't carry these.
2. **Anvil / Hardhat with custom hardforks.** Anvil's \`impersonateAccount\` returns receipts with debug fields the standard Ethereum types don't have.
3. **Custom L2s with bespoke tx envelopes.** Polygon zkEVM, Scroll, Linea — each has its own tx envelope variant for L1-data fees, sequencer signatures, etc.

The fix: **abstract the chain-specific types behind a trait.**

## Step 1 — First sketch: one type per concept

Naive trait:

\`\`\`rust
trait Network {
    type Transaction;
    type Receipt;
    type Block;
}

struct Ethereum;
impl Network for Ethereum {
    type Transaction = EthereumTx;
    type Receipt    = EthereumReceipt;
    type Block      = EthereumBlock;
}

struct Optimism;
impl Network for Optimism {
    type Transaction = OpTx;
    type Receipt    = OpReceipt;
    type Block      = OpBlock;
}
\`\`\`

This is *almost* right. Three associated types. Ethereum and Optimism each pick their own bundle. Generic-over-Network code (like \`Provider<N: Network>\`) reads/writes through the associated types.

But "transaction" isn't one type — it's *several*, each playing a different role.

## Step 2 — Transactions have multiple lives

A single transaction passes through several representations:

- **\`TransactionRequest\`** — what the user *constructs*. Most fields optional. Built via a builder API: \`TransactionRequest::default().with_to(addr).with_value(...)\`.
- **\`UnsignedTx\`** — request *fully filled*: nonce resolved, gas estimated, chain_id set. Ready to hash for signing.
- **\`TxEnvelope\`** — signed transaction. The \`UnsignedTx\` plus the signature. What gets broadcast over the wire.
- **\`TransactionResponse\`** — transaction as returned by \`eth_getTransactionByHash\`. Has \`block_hash\`, \`block_number\`, \`transaction_index\` baked in.

Each role has different fields, validation, serialization. Hammering them into one \`Transaction\` type would force every method to take a wide union and validate at runtime. Splitting them lets the type system enforce "you can't broadcast a \`TransactionRequest\`" or "you can't sign a \`TransactionResponse\`."

> 🛑 **Anti-fluency.** "Same data, different states" sounds plausible but it's not the right framing. **What's wrong with one type that has optional signature, optional block_hash, etc.?**

Validation gets pushed to runtime. \`broadcast(&tx)\` would have to check "is the signature actually present? is block_hash absent (because broadcasting a tx that already has a block_hash is nonsense)?" — runtime errors that the compiler should reject. Splitting into \`TransactionRequest\` / \`UnsignedTx\` / \`TxEnvelope\` / \`TransactionResponse\` makes those impossible-by-construction. Each function's signature only accepts the right state.

So our trait grows:

\`\`\`rust
trait Network {
    type TxEnvelope;
    type UnsignedTx;
    type TransactionRequest;
    type TransactionResponse;
    type Receipt;
    type Block;
}
\`\`\`

Six associated types. Receipts and blocks turn out to need similar splitting.

## Step 3 — Receipts and headers split, too

\`eth_getTransactionReceipt\` returns a receipt-like object with consensus-defined fields *plus* RPC-decoration fields (transaction_hash, block_hash, block_number, transaction_index, etc.). The pure consensus shape — what goes into the Merkle root — is different from the API response.

Same split:

- **\`ReceiptEnvelope\`** — consensus shape. Whatever the consensus protocol cares about.
- **\`ReceiptResponse\`** — RPC return type, with extra "where in the chain" metadata.

Same shape for headers:

- **\`Header\`** — consensus header
- **\`HeaderResponse\`** — RPC-formatted header (with hash already computed, gas_used as a string for JSON, etc.)
- **\`BlockResponse\`** — full block payload as returned over RPC

Plus one more — Ethereum and Optimism need to identify which *kind* of transaction they're dealing with (Legacy / EIP-1559 / EIP-4844 / OP-Deposit). That's:

- **\`TxType\`** — enum tag for transaction category

Now the trait has:

\`\`\`rust
trait Network {
    type TxType;
    type TxEnvelope;
    type UnsignedTx;
    type TransactionRequest;
    type TransactionResponse;
    type ReceiptEnvelope;
    type ReceiptResponse;
    type Header;
    type HeaderResponse;
    type BlockResponse;
}
\`\`\`

Ten associated types. Each one earns its keep against a specific failure mode.

## Step 4 — Why associated types, not generic parameters

Here's the design choice that confused me when I first read alloy: **why is this an associated-type trait, not a struct of generic parameters?** Like:

\`\`\`rust
struct Provider<TxRequest, TxEnvelope, Receipt, Block, ...> { ... }
\`\`\`

> 🛑 **Predict.** Without scrolling: what's wrong with the multi-generic struct?

Three problems:

1. **No cohesion.** \`Provider<EthereumTxRequest, OptimismTxEnvelope, ...>\` would compile. There's nothing stopping you from mixing types from different chains. Associated types group them under one \`Network\` impl — you pick \`Ethereum\` or \`Optimism\`, you get the whole coherent set.
2. **Verbosity at every callsite.** Every signature mentioning \`Provider\` would have to spell out 10 generic parameters. \`Provider<N: Network>\` is one parameter that pulls 10 types in.
3. **No type-level identity.** \`Network\` is a *trait*, so we can write functions like \`fn for_network<N: Network>(...) -> N::TransactionRequest\`. The Network name carries identity. Loose generics don't.

**Associated types express "these go together."** Generic parameters express "any combination is valid." For chain primitives, the former is the correct semantics.

The real alloy uses associated types for exactly this reason. Look at any function in alloy that touches "the chain's tx envelope" — it's \`N::TxEnvelope\` (associated-type access), not \`E\` (generic parameter).

## Step 5 — Trait bounds: \`Send + Sync + 'static\`

\`\`\`rust
pub trait Network: Send + Sync + 'static { ... }
\`\`\`

Three bounds.

- **\`Send + Sync\`** — for the same reason \`Provider\` requires them: production users wrap providers in \`Arc<Provider<N>>\` and clone across tasks. The associated types and the network type itself need to be safe to send/share. Without these, \`Arc<Provider<MyNetwork>>\` wouldn't compile.
- **\`'static\`** — \`Provider\` stores \`PhantomData<N>\`. If \`N\` had a non-static lifetime parameter, every \`Provider\` instance would be lifetime-bounded — a sharp constraint that breaks the "stash a Provider in a global Arc" pattern.

> 🛑 **Anti-fluency.** "\`'static\` means it lives forever" is parroting. In your own words: what *concretely* breaks if \`Network\` impls were allowed to have non-\`'static\` lifetime parameters? Sketch the failure.

If \`MyNetwork\` had a borrowed lifetime (e.g., \`MyNetwork<'a>\` where \`'a\` was the lifetime of some external config), \`Provider<MyNetwork<'a>>\` would inherit that lifetime. Storing the provider in an \`Arc\` (\`Arc<Provider<MyNetwork<'a>>>\`) means the \`Arc\` is also bounded by \`'a\`. **The Arc can't outlive whatever the config was borrowed from.** \`'static\` rules out that pattern: \`MyNetwork\` impls own all their data, no borrows. Arcs become free-standing.

## Step 6 — Putting it together

\`\`\`rust
pub trait Network: Send + Sync + 'static {
    type TxType: ...;
    type TxEnvelope: ...;
    type UnsignedTx: ...;
    type ReceiptEnvelope: ...;
    type Header: ...;
    type TransactionRequest: ...;
    type TransactionResponse: ...;
    type ReceiptResponse: ...;
    type HeaderResponse: ...;
    type BlockResponse: ...;
}
\`\`\`

Each associated type has its own trait bounds (e.g., \`Serialize + DeserializeOwned\`, \`Clone\`, \`Encodable\`) — those make the responses RPC-serializable and the envelopes RLP-encodable. We're skipping those bounds in this lesson; the next lesson reads them in detail.

The shape:

- **TxType** — enum tag (Legacy / EIP1559 / EIP4844 / chain-specific variants)
- **TxEnvelope / UnsignedTx** — pre/post-signature consensus shape
- **TransactionRequest / TransactionResponse** — what the user builds vs what RPC returns
- **ReceiptEnvelope / ReceiptResponse** — consensus shape vs RPC return
- **Header / HeaderResponse / BlockResponse** — consensus header, RPC header, RPC block

Concrete impls in alloy: \`Ethereum\` (in \`alloy-network\`), \`Optimism\` (in \`alloy-op-network\`), \`AnyNetwork\` (a permissive impl with serde-flavored types for "I don't know the chain ahead of time" tooling).

## Recall before moving on

Without scrolling:

1. \`TransactionRequest\` and \`TxEnvelope\` are different associated types. **What does the type system enforce by keeping them separate that a unified \`Transaction\` type wouldn't?**
2. \`Network\` uses *associated types*, not generic parameters. **Name two concrete consequences of that choice for code that's generic over Network.**
3. **\`'static\`** is one of the trait's bounds. What pattern would break if it were \`Network: Send + Sync\` (no \`'static\`)?
4. Optimism deposits include an L1 \`mint\` field. **Which associated type would need to differ between \`Ethereum\` and \`Optimism\` to support that?**

If any answer is shaky, scroll back. The next lesson reads alloy's real \`Network\` trait + the \`Ethereum\` and \`Optimism\` impls in detail.
`,
                },
                {
                  title: 'Reading the real \`Network\` trait + Ethereum / Optimism impls',
                  slug: 'alloy-network-walkthrough-en',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 25,
                  content: `# Reading the real \`Network\` trait + Ethereum / Optimism impls

The buildup justified each of the 10 associated types and the trait bounds. **This lesson reads the real source** — including the per-associated-type trait bounds the buildup glossed over, the \`Ethereum\` impl, the \`Optimism\` impl side-by-side, and the related \`TransactionBuilder\` helper trait.

The cohesion property from buildup Step 4 ("changing one slot cascades to others") becomes concrete here: you'll see exactly which slots Optimism overrides and which it reuses from Ethereum.

> 📂 **Open three files in tabs:**
> - \`crates/network/src/lib.rs\` — the \`Network\` trait
> - \`crates/network/src/ethereum/mod.rs\` — the \`Ethereum\` impl
> - \`alloy-rs/op-alloy\` (separate repo) — for the \`Optimism\` impl
>
> The exact module paths drift across releases. The shape is durable.

## The trait with all the trait bounds

The real \`Network\` trait has trait bounds on every associated type — the buildup wrote them as \`...\`. Here's the rough shape:

\`\`\`rust
pub trait Network: Debug + Clone + Copy + Send + Sync + Sized + 'static {
    // Transaction-side
    type TxType: Into<u8> + PartialEq + Eq + TryFrom<u8> + Send + Sync + 'static;
    type TxEnvelope: TransactionEnvelope<Self> + ...;
    type UnsignedTx: From<Self::TxEnvelope> + ...;
    type TransactionRequest: TransactionBuilder<Self> + ...;
    type TransactionResponse: Transaction<Self> + ...;

    // Receipt-side
    type ReceiptEnvelope: ReceiptEnvelope<Self> + ...;
    type ReceiptResponse: ReceiptResponse + ...;

    // Header / Block side
    type Header: BlockHeader + ...;
    type HeaderResponse: HeaderResponse + ...;
    type BlockResponse: BlockResponse<Self> + ...;
}
\`\`\`

Three things to look hard at:

### \`Debug + Clone + Copy + Send + Sync + Sized + 'static\` on \`Network\` itself

The buildup mentioned \`Send + Sync + 'static\`. The real trait adds:

- **\`Debug\`** — Network impls have to be \`{:?}\`-printable. Mostly for tracing logs ("constructed Provider on chain Ethereum...").
- **\`Clone + Copy\`** — \`Network\` impls are *zero-sized marker types*. \`struct Ethereum;\` is one byte (or zero, depending on alignment). \`Copy\` lets you pass them by value freely without lifetime concerns.
- **\`Sized\`** — explicit, even though it's the default. Makes \`PhantomData<N>\` work in struct fields.

> 🛑 **Predict.** Why is \`Network\` deliberately a zero-sized marker, not a struct that holds chain configuration?

Because chain configuration (chain ID, hardfork schedule, etc.) varies *per provider connection*, not per network type. A user pointing at mainnet vs Sepolia uses *the same* \`Ethereum\` network type — the difference is in the chain spec, which lives elsewhere. \`Network\` answers "*which family of types* do I use?" — that's a static, type-level question, not a runtime configuration. Marker structs encode that perfectly.

### \`TxType: Into<u8> + TryFrom<u8>\`

This is the consensus serialization hook. EIP-2718 transactions are typed by a single byte prefix (0x01 = EIP-2930, 0x02 = EIP-1559, 0x03 = EIP-4844). The \`Into<u8>\` and \`TryFrom<u8>\` bounds let you map between the high-level enum and the wire byte:

\`\`\`rust
let tx_type: TxType = bytes[0].try_into()?;
let byte: u8 = tx_type.into();
\`\`\`

\`TryFrom\` (not \`From\`) — because not every byte is a valid tx type. Optimism extends this set: \`0x7E\` is the OP-Deposit transaction. So Optimism's \`TxType\` is a *different* enum with a different \`TryFrom\` impl, even though both are \`Into<u8>\`. **The trait shape is the same; the variant set differs per chain.**

### \`TransactionEnvelope<Self>\` — the trait-bound-on-associated-type pattern

Look at \`type TxEnvelope: TransactionEnvelope<Self>\`. The associated type itself has to implement another trait (\`TransactionEnvelope\`), and that trait is *parameterized by the network it belongs to*.

This is alloy's idiom for "consistent helper traits across associated types": every \`Network::TxEnvelope\` implements \`TransactionEnvelope<Self>\`, which gives generic-over-N code a uniform way to call methods like \`.tx_hash()\` or \`.signer()\` regardless of chain.

Same pattern for \`ReceiptEnvelope<Self>\`, \`BlockResponse<Self>\`, \`TransactionBuilder<Self>\`. The associated types are *constrained to implement helpers parameterized by Self*. The same trick \`Provider<N>\` uses on the Provider side.

## The \`Ethereum\` impl

\`\`\`rust
#[derive(Debug, Clone, Copy)]
pub struct Ethereum;

impl Network for Ethereum {
    type TxType = alloy_consensus::TxType;
    type TxEnvelope = alloy_consensus::TxEnvelope;
    type UnsignedTx = alloy_consensus::TypedTransaction;
    type ReceiptEnvelope = alloy_consensus::ReceiptEnvelope;
    type Header = alloy_consensus::Header;

    type TransactionRequest = alloy_rpc_types_eth::TransactionRequest;
    type TransactionResponse = alloy_rpc_types_eth::Transaction;
    type ReceiptResponse = alloy_rpc_types_eth::TransactionReceipt;
    type HeaderResponse = alloy_rpc_types_eth::Header;
    type BlockResponse = alloy_rpc_types_eth::Block;
}
\`\`\`

Two things to notice:

1. **The associated types live in two crates.** Consensus shapes (\`TxEnvelope\`, \`Header\`, \`ReceiptEnvelope\`) come from \`alloy-consensus\`. RPC shapes (\`Transaction\`, \`TransactionReceipt\`, \`Block\`) come from \`alloy-rpc-types-eth\`. **Crate boundaries match the conceptual split** between "what consensus cares about" and "what RPC returns."
2. **\`UnsignedTx = TypedTransaction\`.** Slightly surprising name. \`TypedTransaction\` is alloy's name for "any of the EIP-2718 typed-transaction variants, fully populated, ready to sign." It's the post-fill-pre-sign state from the buildup.

> 🔍 **Find in repo.** Open \`alloy_consensus::TxEnvelope\`. It's an enum with one variant per tx type (\`Legacy\`, \`Eip2930\`, \`Eip1559\`, \`Eip4844\`). Confirm: is \`TxEnvelope\` *signed* (envelope = sig included), and \`TypedTransaction\` *unsigned*? **Yes.** That's the lifecycle Step 2 of the buildup described.

## The \`Optimism\` impl — what changes

\`\`\`rust
#[derive(Debug, Clone, Copy)]
pub struct Optimism;

impl Network for Optimism {
    type TxType = op_alloy_consensus::OpTxType;          // ← differs (extra Deposit)
    type TxEnvelope = op_alloy_consensus::OpTxEnvelope;  // ← differs
    type UnsignedTx = op_alloy_consensus::OpTypedTransaction;  // ← differs
    type ReceiptEnvelope = op_alloy_consensus::OpReceiptEnvelope; // ← differs (l1_fee fields)

    type Header = alloy_consensus::Header;  // ← REUSED from Ethereum
    type HeaderResponse = alloy_rpc_types_eth::Header;  // ← REUSED

    type TransactionRequest = op_alloy_rpc_types::TransactionRequest;  // ← differs (mint field)
    type TransactionResponse = op_alloy_rpc_types::Transaction;  // ← differs
    type ReceiptResponse = op_alloy_rpc_types::OpTransactionReceipt;  // ← differs
    type BlockResponse = op_alloy_rpc_types::Block;  // ← differs (carries OP txs)
}
\`\`\`

(Module paths approximate; check current op-alloy.)

**The cohesion property in action:**

- All four *transaction* slots (TxType, TxEnvelope, UnsignedTx, TransactionRequest, TransactionResponse) differ from Ethereum. Optimism's deposit-tx variant cascades through all of them.
- All three *receipt* slots (ReceiptEnvelope, ReceiptResponse) differ. The L1 gas / L1 block fields cascade through.
- The *header* type and \`HeaderResponse\` are **shared with Ethereum**. Optimism's blocks have the same header structure (it's a side-effect of OP being EVM-compatible at the consensus header level).
- \`BlockResponse\` differs because *the block's transaction list* contains OP-typed transactions. Reusing Ethereum's \`Block\` would force serialization of OP deposits as Ethereum-typed txs — wrong.

> 🛑 **Anti-fluency.** A naive design would have every chain define all 10 types from scratch — even when most chains share most types with Ethereum. **Why is "associated type from a separate crate" the right pattern here, instead of "every Network impl reimplements every type"?**

Because the cohesion property is *bidirectional*. Where types differ, you must override. Where they don't, you must share — otherwise multiple chains can't interop with shared tooling (e.g., a generic block explorer that reads any chain's headers). The associated-type approach lets you mix: override the slots that vary, share the slots that don't. **Optimism's \`Header\` literally being \`alloy_consensus::Header\` means a header parser written generic-over-N works on Ethereum and Optimism without recompilation.**

## The \`TransactionBuilder\` helper trait

The associated type \`TransactionRequest\` has a trait bound: \`TransactionBuilder<Self>\`. That's a *separate* trait that exposes fluent build methods:

\`\`\`rust
pub trait TransactionBuilder<N: Network>: ... {
    fn input(&self) -> Option<&Bytes>;
    fn set_input(&mut self, input: Bytes);
    fn with_input(mut self, input: Bytes) -> Self { ... }

    fn from(&self) -> Option<Address>;
    fn set_from(&mut self, from: Address);
    fn with_from(mut self, from: Address) -> Self { ... }

    fn to(&self) -> Option<Address>;
    fn set_to(&mut self, to: Address);
    fn with_to(mut self, to: Address) -> Self { ... }

    // ...with_value, with_gas_price, with_chain_id, with_nonce, etc.
}
\`\`\`

This is what gives \`TransactionRequest::default().with_to(addr).with_value(eth(1))\` its fluent feel.

> 🔍 **Find in repo.** Open \`crates/network/src/transaction/builder.rs\`. Count the \`with_*\` and \`set_*\` methods. There are dozens. **Why is it a separate trait from \`Network\`, instead of methods directly on the associated type?**

Because the same builder methods need to work for both Ethereum's \`TransactionRequest\` and Optimism's \`TransactionRequest\` — and because \`TransactionBuilder<N>\` is a trait, you can write generic-over-N code that builds requests:

\`\`\`rust
fn build_request<N: Network>() -> N::TransactionRequest {
    <N::TransactionRequest>::default()
        .with_to(Address::ZERO)
        .with_value(U256::from(1_000))
}
\`\`\`

Same code, works on Ethereum, Optimism, AnyNetwork, custom L2s. **Type-level dictionary + helper traits = portable code across chains.**

## \`AnyNetwork\` — the permissive escape hatch

There's a third Network impl: \`AnyNetwork\` in \`alloy-network\`. It's a "I don't know the chain ahead of time" mode — uses serde-flavored types that accept arbitrary fields:

\`\`\`rust
impl Network for AnyNetwork {
    type TxType = WithOtherFields<...>;
    type TxEnvelope = AnyTxEnvelope;
    type TransactionResponse = AnyRpcTransaction;
    // ...
}
\`\`\`

Tooling like block explorers, multi-chain indexers, generic RPC proxies use \`AnyNetwork\` because they need to accept whatever fields show up in the RPC response without knowing the chain at compile time. The trade-off: you lose static typing for chain-specific fields and have to extract them via \`.other()\` accessors.

When you write *application* code, pick \`Ethereum\` or \`Optimism\` (or a real Network impl). When you write *tooling that handles arbitrary chains*, pick \`AnyNetwork\`.

## Recall before the quiz

Without scrolling:

1. \`Network\` requires \`Debug + Clone + Copy + Send + Sync + Sized + 'static\`. Why \`Copy\` specifically — what does it enable that \`Clone\` alone wouldn't?
2. Optimism's \`Network\` impl reuses Ethereum's \`Header\` but defines its own \`BlockResponse\`. **Why does the latter differ if the former doesn't?**
3. \`TransactionBuilder<N>\` is a *separate* trait, not just methods on \`Network::TransactionRequest\`. What kind of code does that separation enable?
4. When would you use \`AnyNetwork\` over a concrete \`Ethereum\` / \`Optimism\` impl?

The next lesson is a quiz. Engage with these recalls now if any answer is shaky.
`,
                },
                {
                  title: 'Quiz: did the \`Network\` trait shape stick?',
                  slug: 'alloy-network-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 7,
                  duration: 4,
                  xpReward: 25,
                  content: `# Quiz: did the \`Network\` trait shape stick?

Four questions covering the design decisions across the buildup and walkthrough. Same rule as the other Advanced quizzes: **you can't nod past a quiz.**

If you miss two or more, scroll back to *Building the \`Network\` trait step by step* before going on to the drill.`,
                  quizQuestions: [
                    {
                      question: "`Network` uses *associated types* for its 10 chain-specific shapes (TxType, TxEnvelope, TransactionRequest, etc.) rather than 10 generic parameters on a struct. What's the load-bearing benefit of that choice for code that's generic over Network?",
                      options: [
                        "Associated types compile faster than generic parameters.",
                        "Cohesion + concision: associated types group 'these go together' (so `Provider<EthereumTxRequest, OptimismReceipt>` can't be constructed by accident), and call sites only spell out one parameter (`<N: Network>`) instead of 10.",
                        "Generic parameters can't appear inside trait method signatures, only inside trait bodies.",
                        "Associated types support `dyn Trait`; generic parameters don't.",
                      ],
                      correctIndex: 1,
                      explanation: "The cohesion property is the killer feature. Generic parameters express 'any combination is valid'; associated types express 'these go together.' For chain primitives — where `EthereumTxRequest` has to be paired with `EthereumTxEnvelope` — you need the latter semantics. Bonus: every signature mentioning Provider would have to spell out 10 parameters with raw generics; one `N: Network` pulls them all in. (The compile-time and `dyn`-compatibility distractors are technically wrong; both work fine for either approach.)",
                    },
                    {
                      question: "`Network` has separate associated types for `TransactionRequest`, `UnsignedTx`, `TxEnvelope`, and `TransactionResponse` — four representations of what feels like the same data. Why the split?",
                      options: [
                        "Backward compatibility — older alloy versions used different types.",
                        "Each representation is the same data with optional fields; the split is decorative for documentation purposes.",
                        "Each representation has a different role in the transaction lifecycle (build → fill → sign → return). Splitting them makes invalid states impossible: the type system rejects `broadcast(&request)` or `sign(&response)` at compile time. A unified type would push validation to runtime.",
                        "Performance — each type has its own optimized memory layout.",
                      ],
                      correctIndex: 2,
                      explanation: "Validation gets pushed to runtime if you have one type with optional signature, optional block_hash, etc. `broadcast(&tx)` would have to check 'is the signature present? is block_hash absent?' — runtime errors the compiler should reject. Splitting makes those states impossible by construction. Each function signature only accepts the right lifecycle state. Same trade-off as Rust's typestate pattern, applied to Ethereum txs.",
                    },
                    {
                      question: "Optimism's `Network` impl defines its own `BlockResponse` but reuses Ethereum's `Header`. Why the asymmetry?",
                      options: [
                        "`BlockResponse` was added to alloy more recently than `Header`; the Optimism type just hasn't been refactored yet.",
                        "`Header` is consensus-defined and Optimism is EVM-compatible at the header level — same structure (number, hash, timestamp). But `BlockResponse` includes the *block's transaction list*, and Optimism's transactions include the OP-specific Deposit variant. Reusing Ethereum's `Block` would force OP deposits to serialize as Ethereum-typed txs — wrong.",
                        "Headers are smaller than blocks, so reusing them costs less memory.",
                        "`BlockResponse` is a newer concept than `Header`; Optimism eventually plans to share Ethereum's.",
                      ],
                      correctIndex: 1,
                      explanation: "This is the cohesion property's subtlety. Where types are *content-identical* across chains, the trait lets you share — Optimism's header literally IS `alloy_consensus::Header`. Where types embed chain-specific content (like a tx list containing OP-typed txs), you must override — otherwise tooling can't correctly serialize. **The choice is forced by data, not stylistic.** Same logic applies to ReceiptResponse (different because L1 fee fields).",
                    },
                    {
                      question: "`TransactionBuilder<N>` is a *separate* trait that `Network::TransactionRequest` is bound to implement, rather than methods directly on the associated type. What does the separation enable?",
                      options: [
                        "Each `Network::TransactionRequest` impl can override the builder methods individually.",
                        "Rust requires methods on associated types to be defined via separate traits.",
                        "It enables generic-over-N code: `fn build_request<N: Network>() -> N::TransactionRequest { <N::TransactionRequest>::default().with_to(addr).with_value(v) }`. The same code works for Ethereum, Optimism, and AnyNetwork because `TransactionBuilder<N>` is a trait with the same method names regardless of which chain's `TransactionRequest` is selected.",
                        "It's a backward-compat shim; future versions of alloy will inline the methods.",
                      ],
                      correctIndex: 2,
                      explanation: "The pattern is **type-level dictionary (Network) + helper traits parameterized by the dictionary key (TransactionBuilder<N>) = portable code across chains.** Without the separate trait, `with_to(...)` and `with_value(...)` would be inherent methods on `EthereumTransactionRequest` and `OpTransactionRequest` — not callable through `N::TransactionRequest`. The separate trait + bound makes `<N::TransactionRequest>::default().with_to(...)` work generically. Same idiom: `TransactionEnvelope<Self>` on `TxEnvelope`, `BlockResponse<Self>` on `BlockResponse`.",
                    },
                  ],
                },
                {
                  title: 'Drill: write generic-over-N code that works on Ethereum *and* Optimism',
                  slug: 'alloy-network-drill-en',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 12,
                  xpReward: 25,
                  content: `# Drill: write generic-over-N code that works on Ethereum *and* Optimism

Reading is rehearsal. **Doing is memory.** This drill takes you from "I've read about \`Network\` as a type-level dictionary" to "I have written one function that runs against both Ethereum and Optimism with no per-chain code."

The payoff in production: a block explorer, an indexer, an MEV bot — anything that wants to support multiple EVM-compatible chains writes its core logic once, generic over \`N: Network\`. That's what you'll do here.

## Setup

Two terminals:

**Terminal 1 — Anvil (local Ethereum):**

\`\`\`bash
anvil
\`\`\`

(If you don't have Foundry installed: \`curl -L https://foundry.paradigm.xyz | bash && foundryup\`.)

**Terminal 2 — your project:**

\`\`\`bash
cargo new alloy-network-drill --bin
cd alloy-network-drill
\`\`\`

Add to \`Cargo.toml\`:

\`\`\`toml
[dependencies]
alloy = { version = "0.x", features = ["full", "provider-http"] }
op-alloy = { version = "0.x" }   # for Optimism Network impl
tokio = { version = "1", features = ["full"] }
eyre = "0.6"
\`\`\`

(Pin to current versions; the exact crate names of \`op-alloy\` may vary across releases — search crates.io for the current packaging.)

## Drill 1 — Read op-alloy's \`Network\` impl

Before writing code, verify the walkthrough's claims against real source.

> 🔍 **Find** the \`impl Network for Optimism\` block in op-alloy. The path varies — try \`crates/network/src/lib.rs\` or similar.

Read each associated type's RHS:

| Slot | Ethereum's value | Optimism's value | Same? |
| :--- | :--- | :--- | :--- |
| \`TxType\` | \`alloy_consensus::TxType\` | \`op_alloy_consensus::OpTxType\` | ❌ |
| \`TxEnvelope\` | \`alloy_consensus::TxEnvelope\` | \`op_alloy_consensus::OpTxEnvelope\` | ❌ |
| \`UnsignedTx\` | \`alloy_consensus::TypedTransaction\` | OP analog | ❌ |
| \`ReceiptEnvelope\` | \`alloy_consensus::ReceiptEnvelope\` | OP analog | ❌ |
| \`Header\` | \`alloy_consensus::Header\` | \`alloy_consensus::Header\` | ✅ |
| \`TransactionRequest\` | \`alloy_rpc_types_eth::TransactionRequest\` | OP analog | ❌ |
| \`TransactionResponse\` | \`alloy_rpc_types_eth::Transaction\` | OP analog | ❌ |
| \`ReceiptResponse\` | \`alloy_rpc_types_eth::TransactionReceipt\` | OP analog | ❌ |
| \`HeaderResponse\` | \`alloy_rpc_types_eth::Header\` | \`alloy_rpc_types_eth::Header\` (likely) | ✅ |
| \`BlockResponse\` | \`alloy_rpc_types_eth::Block\` | OP analog | ❌ |

> 🛑 **Question (write down the answer before scrolling):** Verify the table on the actual code. **How many slots differ from Ethereum?** It should be ~7-8 out of 10. The exact count tells you where Optimism's chain-specific shape lives — and it's exactly where the cohesion property forces overrides.

The two slots that *don't* differ (\`Header\` and \`HeaderResponse\`) are the ones whose data is content-identical across the two chains. Everywhere a tx, receipt, or block payload is involved, the tx-list cohesion forces an override.

## Drill 2 — Write a generic-over-N block summary

In \`src/main.rs\`, write a function that takes *any* chain's block and produces a summary string. The function is generic over \`N: Network\`:

\`\`\`rust
use alloy::network::{primitives::BlockTransactionsKind, Network};
use alloy::providers::Provider;
use alloy::rpc::types::BlockId;

async fn block_summary<N, P>(provider: &P, block_id: BlockId) -> eyre::Result<String>
where
    N: Network,
    P: Provider<N>,
{
    let block = provider
        .get_block(block_id)
        .kind(BlockTransactionsKind::Hashes)
        .await?
        .ok_or_else(|| eyre::eyre!("block not found"))?;

    // BlockResponse trait gives us .header() and .transactions()
    use alloy::network::BlockResponse;
    let header = block.header();

    use alloy::network::primitives::HeaderResponse;
    Ok(format!(
        "block {} on chain — hash={:?}",
        header.number(),
        header.hash(),
    ))
}
\`\`\`

(Method names approximate to current alloy. Your IDE will show you the exact \`HeaderResponse\` and \`BlockResponse\` trait methods. The point is: **\`block.header()\` and \`header.number()\` work generically, regardless of \`N\`.**)

> 🛑 **Predict.** Before writing main, ask: this function takes \`&P: Provider<N>\` and \`N: Network\` is generic. **What does the call site look like for Ethereum vs Optimism — is it the same code or different code?**

Same code, different type parameters. The call site instantiates \`N\` to either \`Ethereum\` or \`op_alloy::network::Optimism\`. The function body is unchanged.

## Drill 3 — Run against Ethereum (Anvil)

Add the main:

\`\`\`rust
use alloy::network::Ethereum;
use alloy::providers::ProviderBuilder;

#[tokio::main]
async fn main() -> eyre::Result<()> {
    // Ethereum (Anvil)
    let eth_provider = ProviderBuilder::new()
        .on_http("http://localhost:8545".parse()?);
    let s = block_summary::<Ethereum, _>(&eth_provider, BlockId::latest()).await?;
    println!("ETH: {s}");

    Ok(())
}
\`\`\`

Run: \`cargo run\`. You should see something like:

\`\`\`
ETH: block 0 on chain — hash=0x...
\`\`\`

(Anvil starts at block 0. Mine a few blocks via \`anvil_mine\` if you want a higher number; not required for the drill.)

## Drill 4 — Same function, against op-mainnet (Optimism)

Add an Optimism call to \`main\`:

\`\`\`rust
use op_alloy::network::Optimism;

// ... after the Ethereum call ...

let op_provider = ProviderBuilder::<_, _, Optimism>::default()
    .on_http("https://mainnet.optimism.io".parse()?);
let s = block_summary::<Optimism, _>(&op_provider, BlockId::latest()).await?;
println!(" OP: {s}");
\`\`\`

(The exact \`ProviderBuilder\` syntax for non-Ethereum networks may differ; check op-alloy's examples. The structural point is: same function, different \`N\`.)

Run again. You should see two block summaries — one for Anvil (block 0 or similar), one for op-mainnet (a real block number, e.g. 130 million-ish at time of writing).

> 🔧 **The same function body produced both outputs.** That's the type-level-dictionary payoff: \`block_summary\` is written once, instantiated with two different \`N\` parameters, and the compiler emits two specialized copies that work against the appropriate types per chain.

## Drill 5 — Anti-fluency: what happens if you mix?

Try (this should NOT compile):

\`\`\`rust
let eth_block = eth_provider.get_block(BlockId::latest()).await?;
let s = block_summary::<Optimism, _>(&eth_provider, BlockId::latest()).await?;
\`\`\`

> 🛑 **Predict the error before running.** \`block_summary\` is parameterized over \`N: Network\` and the provider must be \`Provider<N>\`. \`eth_provider\` is \`Provider<Ethereum>\`. **What does the compiler reject?**

The compiler rejects the second call because \`eth_provider\`'s associated types don't match \`Optimism\`'s. The error will mention something like "expected \`Optimism::TransactionRequest\`, found \`Ethereum::TransactionRequest\`."

This is the cohesion property protecting you at compile time. **You cannot accidentally feed Ethereum-typed responses into Optimism-typed code.** That's what made associated types better than 10 raw generic parameters from the buildup's Step 4.

## End-of-lesson recall

Without scrolling, in your own words:

1. \`block_summary\` is one function body. **How many specialized copies does the compiler emit when it's instantiated for both Ethereum and Optimism?** Why does that matter for performance?
2. \`Header\` is reused between Ethereum and Optimism, but \`BlockResponse\` differs. **What does Drill 1's table reveal about *which kinds of data* force overrides vs allow sharing?**
3. The compiler rejects \`block_summary::<Optimism>(&eth_provider, ...)\`. Trace through: which trait bound is violated, and which associated type's mismatch produces the error?
4. If you wanted to add Polygon zkEVM as a third chain, what would you write? (Hint: a new \`struct PolygonZkEvm; impl Network for PolygonZkEvm { ... }\`.)

After this drill, you've shipped the same shape multi-chain tooling production indexers and explorers ship: one core function, generic over \`N: Network\`, specialized at compile time per chain. **Next chain: the \`Signer\` model — how alloy composes signing, gas, and nonce filling into layered Providers.**`,
                },
                {
                  title: 'Building the \`Signer\` trait step by step',
                  slug: 'alloy-signer-buildup-en',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 10,
                  xpReward: 25,
                  content: `# Building the \`Signer\` trait step by step

You've built the \`Provider\` (RPC abstraction) and the \`Network\` (chain primitives). The third foundational alloy concept is **how transactions get signed**. Production users sign with raw private keys, AWS KMS, hardware wallets, mnemonic-derived keys, or remote signing services — and the *same* application code has to work across all of them.

This chain is about the abstractions that make that possible: the \`Signer\` trait, the \`TxSigner<N>\` chain-specific variant, the async/sync split, and the \`WalletFiller\` that ties signing into the \`ProviderBuilder\` you used in the Provider drill.

By the end of this lesson you'll have built every piece of:

\`\`\`rust
#[async_trait]
pub trait Signer<Sig = Signature> {
    async fn sign_hash(&self, hash: &B256) -> Result<Sig>;
    async fn sign_message(&self, message: &[u8]) -> Result<Sig> { /* default: hash, then sign_hash */ }
    fn address(&self) -> Address;
    fn chain_id(&self) -> Option<ChainId>;
    fn set_chain_id(&mut self, chain_id: Option<ChainId>);
}

#[async_trait]
pub trait TxSigner<Sig> {
    fn address(&self) -> Address;
    async fn sign_transaction(&self, tx: &mut dyn SignableTransaction<Sig>) -> Result<Sig>;
}

pub trait SignerSync<Sig = Signature> { /* sync mirror of Signer */ }
\`\`\`

Three traits. Each earns its keep against a specific failure mode you'll see if you try to short-circuit them.

> 📂 **Open \`alloy-rs/alloy/crates/signer\` in another tab.**

## Step 0 — The naive sign function

Without thinking, you'd write signing as one free function:

\`\`\`rust
fn sign_tx(privkey: B256, mut tx: TypedTransaction) -> Result<TxEnvelope> {
    let hash = tx.signature_hash();
    let sig = secp256k1_sign(privkey, hash)?;
    Ok(tx.with_signature(sig))
}
\`\`\`

A function. Hardcoded \`B256\` private key. Hardcoded \`TypedTransaction\` (an Ethereum type). Hardcoded \`secp256k1_sign\` (in-process, sync, no I/O).

> 🛑 **Predict.** Without scrolling: name three production scenarios this naive design fails. (Hint: each is a *different category* of signing — none of them have raw private keys in process.)

The three:

1. **AWS KMS / Cloud HSM.** The private key never leaves AWS. Signing is an *async network call* to a remote service. The function returns a signature; the caller never holds the key.
2. **Hardware wallets (Ledger, Trezor).** Key on the device. Signing is an *async USB / IPC* call that waits for human button press.
3. **Multi-chain.** Optimism's \`UnsignedTx\` is \`OpTypedTransaction\` (with deposit variants), not Ethereum's \`TypedTransaction\`. Hardcoding one type means the function doesn't work on the other chain.

Plus a fourth (cross-cutting): **signing isn't always tx-signing**. \`personal_sign\` (a.k.a. \`eth_sign\` with the EIP-191 prefix), \`signTypedData_v4\` (EIP-712), raw hash signing for off-chain commitments — all need *some* signing capability but operate on different inputs.

The fix: **abstract along three axes.** Signer location (in-process / cloud / hardware), what's being signed (hash / message / tx), and async vs sync. Each axis gets its own trait or trait method.

## Step 1 — First sketch: a single \`Signer\` trait

\`\`\`rust
#[async_trait]
trait Signer {
    async fn sign_hash(&self, hash: B256) -> Result<Signature>;
}

struct LocalSigner { privkey: B256 }
impl Signer for LocalSigner { /* in-process */ }

struct AwsSigner { client: AwsKmsClient, key_id: String }
impl Signer for AwsSigner { /* network call */ }

struct LedgerSigner { dev: LedgerDevice }
impl Signer for LedgerSigner { /* USB call */ }
\`\`\`

One method: take a 32-byte hash, return a signature. Async (so cloud and hardware impls can do I/O). Each \`Signer\` impl picks where it stores the key.

This works for *raw hash* signing. But the user almost never calls \`sign_hash\` directly — they call something higher-level:

- \`sign_message(b"hello")\` — apply EIP-191 prefix, hash, then sign
- \`sign_transaction(tx)\` — encode tx, hash, then sign

These methods do extra work *before* the hash. So we add them.

## Step 2 — Add \`sign_message\` with a default impl

\`\`\`rust
#[async_trait]
trait Signer {
    async fn sign_hash(&self, hash: &B256) -> Result<Signature>;

    async fn sign_message(&self, message: &[u8]) -> Result<Signature> {
        let prefixed = eip191_hash(message);  // "\\x19Ethereum Signed Message:\\n" + len + msg
        self.sign_hash(&prefixed).await
    }
}
\`\`\`

\`sign_message\` has a *default impl* that does the EIP-191 prefixing and calls \`sign_hash\`. **Every \`Signer\` gets \`sign_message\` for free**, but a remote signer can override it if the remote service has its own prefix logic.

> 🛑 **Anti-fluency.** Why a default impl, not a free function \`fn sign_message<S: Signer>(s: &S, msg: &[u8])\`?

Because **default impls let signers override behavior.** AWS KMS might want to forward the message bytes to a service that does its own prefixing — overriding \`sign_message\` on \`AwsSigner\` lets it do that without changing callers. A free function can't be overridden. Default impls are the right tool when you want "common behavior with optional per-impl customization."

This is the same shape as \`Provider\` (Step 4 of the Provider chain): default impls handle the common case, overrides handle the chain-specific case, all behind one trait.

## Step 3 — Tx signing isn't just hash signing

Now consider \`sign_transaction\`:

\`\`\`rust
async fn sign_transaction(&self, tx: TypedTransaction) -> Result<TxEnvelope> { ... }
\`\`\`

It needs to:

1. Encode the tx according to its type (Legacy / EIP-1559 / etc.)
2. Hash that encoding (the *signing hash*, distinct from the *transaction hash*)
3. Sign the hash
4. Attach the signature to produce a \`TxEnvelope\`

Here's the problem: **\`TypedTransaction\` is an Ethereum-specific type**. Optimism's deposit txs aren't \`TypedTransaction\` — they're \`OpTypedTransaction\`. If we put \`sign_transaction(&TypedTransaction)\` on \`Signer\`, OP signers can't implement it without dropping back to Ethereum-only.

Two options:

- **Option A:** Make \`Signer\` generic over network: \`Signer<N: Network>\` with \`sign_transaction(&N::UnsignedTx)\`.
- **Option B:** Split tx-signing into a *separate trait* that handles the chain-aware part, while \`Signer\` stays chain-agnostic.

> 🛑 **Predict.** Which option does alloy pick, and why? (Hint — think about how often you sign a tx vs how often you sign a raw hash.)

Alloy picks **Option B**: \`Signer\` stays simple (chain-agnostic, just hashes); \`TxSigner<N>\` is a separate trait for tx-signing. Reasons:

1. **Most signing operations aren't tx-signing.** EIP-191 messages and EIP-712 typed data are far more common in dapps. Forcing every \`Signer\` to be parameterized by \`N\` for the rare tx case would bloat every signer signature.
2. **\`Signer\` impls are reusable across chains.** \`LocalSigner\` doesn't care if you're on Ethereum or Optimism — it just signs hashes. Tagging it with \`N\` would force one signer struct per chain.
3. **Tx-signing is naturally polymorphic.** A signer can implement \`TxSigner<Ethereum>\` and \`TxSigner<Optimism>\` separately, with different code paths. Bundling them into one trait makes that harder.

So:

\`\`\`rust
#[async_trait]
pub trait TxSigner<Sig> {
    fn address(&self) -> Address;
    async fn sign_transaction(&self, tx: &mut dyn SignableTransaction<Sig>) -> Result<Sig>;
}
\`\`\`

(\`SignableTransaction\` is a trait implemented by every chain's \`UnsignedTx\` type. The \`Signer\` doesn't need to know which chain — it just needs to know how to sign whatever \`SignableTransaction\` is given.)

## Step 4 — Async vs sync: the \`SignerSync\` split

Async is fine for AWS / Ledger. But for in-process key signing — the most common case — async is overhead. Every \`sign_hash\` call goes through a future even though there's no I/O.

Two ways to handle this:

- Accept the overhead: \`async fn\` everywhere, even for in-process.
- Provide a parallel **sync** trait, and let in-process signers implement both.

Alloy picks the second:

\`\`\`rust
pub trait SignerSync<Sig = Signature> {
    fn sign_hash_sync(&self, hash: &B256) -> Result<Sig>;
    fn sign_message_sync(&self, message: &[u8]) -> Result<Sig> { /* default */ }
    fn chain_id_sync(&self) -> Option<ChainId>;
}
\`\`\`

\`LocalSigner\` implements both \`Signer\` (async) and \`SignerSync\` (sync). \`AwsSigner\` and \`LedgerSigner\` only implement \`Signer\` — they can't sign sync because they're network-bound.

Generic-over-S code can require either bound: \`fn foo<S: Signer>\` for code that must be async-tolerant, \`fn bar<S: SignerSync>\` for code that needs the cheaper path.

> 🛑 **Anti-fluency.** Why is \`SignerSync\` not just \`Signer\` with a non-async \`sign_hash\`? Why are they distinct traits?

Because **traits with \`async fn\` and traits without \`async fn\` are different kinds of things in Rust.** An in-process signer can implement both — its sync method does the actual work, its async method just wraps in \`async\` for compatibility. A network-bound signer can only implement the async trait. Generic-over-S code chooses which contract to require. Fusing them would force every signer to commit to async, losing the cheaper-sync optimization.

## Step 5 — Tying it back to \`Provider\`: the \`WalletFiller\`

Recall from the Provider chain: \`FillProvider<F: Filler<N>, P, N>\` lets you stack chain-aware logic in front of the inner provider. Signing is one such Filler:

\`\`\`rust
pub struct WalletFiller<W> {
    wallet: W,
}

impl<W: TxSigner<...>, N: Network> Filler<N> for WalletFiller<W> {
    async fn fill(&self, tx: &mut N::TransactionRequest) -> Result<()> {
        // 1. resolve the unsigned tx from the request
        // 2. self.wallet.sign_transaction(...)
        // 3. attach signature
    }
}
\`\`\`

(Approximate shape — exact alloy has more nuance around how the unsigned tx is built and signed.)

This is the bridge: the \`Signer\` (or \`TxSigner<N>\`) trait abstracts *how* signing happens; the \`WalletFiller\` is the Filler-side machinery that *invokes* signing at the right point in the request flow.

User code:

\`\`\`rust
let signer = PrivateKeySigner::random();
let provider = ProviderBuilder::new()
    .wallet(signer)               // installs WalletFiller(signer)
    .with_recommended_fillers()
    .on_http(url);

provider.send_transaction(tx).await?;  // tx is signed by the WalletFiller
\`\`\`

The \`.wallet(...)\` builder method is a Filler installer that wraps the signer in a \`WalletFiller\` and stacks it onto the FillProvider chain. The user never thinks about \`Signer\` directly — they think "hand the wallet to the builder."

## What you've built

\`\`\`rust
// Lowest-level: chain-agnostic hash/message signing
#[async_trait]
pub trait Signer<Sig = Signature> {
    async fn sign_hash(&self, hash: &B256) -> Result<Sig>;
    async fn sign_message(&self, message: &[u8]) -> Result<Sig> { /* default */ }
    fn address(&self) -> Address;
    fn chain_id(&self) -> Option<ChainId>;
    fn set_chain_id(&mut self, chain_id: Option<ChainId>);
}

// Sync mirror for in-process keys
pub trait SignerSync<Sig = Signature> { /* parallel sync API */ }

// Tx-signing: separate trait, works against any SignableTransaction
#[async_trait]
pub trait TxSigner<Sig> {
    fn address(&self) -> Address;
    async fn sign_transaction(&self, tx: &mut dyn SignableTransaction<Sig>) -> Result<Sig>;
}
\`\`\`

Every piece earned its keep:

- **\`Signer\` async** (Step 1) — handles cloud and hardware signers.
- **\`sign_message\` default impl** (Step 2) — common EIP-191 path with override hook.
- **\`TxSigner\` separate trait** (Step 3) — keeps \`Signer\` chain-agnostic; lets a signer implement multiple chains.
- **\`SignerSync\` parallel trait** (Step 4) — in-process keys avoid async overhead; net-bound signers only do async.
- **\`WalletFiller\`** (Step 5) — bridges \`Signer\`/\`TxSigner\` into the \`Provider\` request flow via the Filler machinery from the Provider chain.

The next lesson reads alloy's real \`Signer\` trait, the \`PrivateKeySigner\` impl, the \`AwsSigner\` impl, and the \`WalletFiller\` source line by line.

## Recall before moving on

Without scrolling:

1. **Why is \`Signer\` async, not sync?** Name two production signers that *need* async.
2. **Why is \`TxSigner<Sig>\` a separate trait from \`Signer\`?** What would break if tx-signing were just a method on \`Signer\`?
3. **Why does \`SignerSync\` exist?** What does an in-process signer gain by implementing it alongside \`Signer\`?
4. The user code \`ProviderBuilder.wallet(signer)\` doesn't mention \`WalletFiller\` or \`Filler\` directly. How do those connect under the hood?

If any answer is shaky, scroll back. The next lesson reads alloy's real \`Signer\` source + concrete impls.
`,
                },
                {
                  title: 'Reading the real \`Signer\` trait + \`PrivateKeySigner\` / \`AwsSigner\` / \`WalletFiller\`',
                  slug: 'alloy-signer-walkthrough-en',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 10,
                  xpReward: 25,
                  content: `# Reading the real \`Signer\` trait + \`PrivateKeySigner\` / \`AwsSigner\` / \`WalletFiller\`

The buildup justified the three-trait split (\`Signer\` / \`TxSigner\` / \`SignerSync\`) and the \`WalletFiller\` bridge. **This lesson reads the real source** — the trait header with all its bounds, the in-process \`PrivateKeySigner\`, the cloud \`AwsSigner\`, the \`SignableTransaction\` glue, and \`WalletFiller\`'s integration into the FillProvider chain.

> 📂 **Open four files in tabs:**
> - \`crates/signer/src/signer.rs\` — the \`Signer\` and \`SignerSync\` traits
> - \`crates/signer-local/src/private_key.rs\` — the \`PrivateKeySigner\` impl
> - \`crates/signer-aws/src/signer.rs\` — the \`AwsSigner\` impl
> - \`crates/provider/src/fillers/wallet.rs\` — the \`WalletFiller\`
>
> The exact paths drift; structural shape is durable.

## The trait header (real source)

\`\`\`rust
#[async_trait]
#[auto_impl(&mut, Box, Arc)]
pub trait Signer<Sig = Signature>: Send + Sync {
    async fn sign_hash(&self, hash: &B256) -> Result<Sig>;

    async fn sign_message(&self, message: &[u8]) -> Result<Sig> {
        self.sign_hash(&eip191_hash_message(message)).await
    }

    fn address(&self) -> Address;
    fn chain_id(&self) -> Option<ChainId>;
    fn set_chain_id(&mut self, chain_id: Option<ChainId>);
}
\`\`\`

Three things to look hard at:

### \`Sig = Signature\` — default associated type-style parameter

The buildup wrote \`Signer<Sig = Signature>\`. The \`Sig\` parameter exists because not every chain uses ECDSA k1 secp256k1 signatures. Some L2s use BLS, some use ed25519, some use post-quantum schemes. Defaulting to \`Signature\` (alloy's k1 secp256k1 type) keeps the common case ergonomic — \`impl Signer\` is implicitly \`impl Signer<Signature>\` — while letting alternative schemes plug in.

> 🛑 **Predict.** Why is \`Sig\` a *generic parameter on the trait*, not an *associated type* (the way \`Network::TxEnvelope\` is)?

Because **the same signer might produce different signature types for different operations**. A single \`PrivateKeySigner\` that holds an ECDSA key could implement both \`Signer<Signature>\` (for hash signing) and \`TxSigner<Signature>\` (for tx signing) — or, if you wanted, \`Signer<RawBytes>\` for a raw-bytes-out variant. Generic parameter = "I can implement this trait multiple times with different \`Sig\`." Associated type = "I commit to exactly one \`Sig\` per impl." For signers, generic is the right shape.

### \`auto_impl(&mut, Box, Arc)\`

Three wrappers — narrower than \`Provider\`'s five (\`&, &mut, Box, Rc, Arc\`).

The omissions are deliberate:

- **No \`&\`** — \`set_chain_id(&mut self, ...)\` is a mutating method. \`&self\` wouldn't compile through the trait. (\`Provider\` doesn't have any \`&mut self\` methods, hence its wider list.)
- **No \`Rc\`** — \`Signer\` requires \`Send + Sync\`, but \`Rc<T>\` is \`!Send\` and \`!Sync\` because \`Rc\`'s ref count isn't atomic. \`Arc<T>\` is the thread-safe version and stays.

Two omissions, two different reasons. **The auto_impl list is a precise statement about the trait's contract.**

### \`Send + Sync\` supertraits

For the same reason \`Provider\` requires them: production code wraps signers in \`Arc<S>\` and shares them across tasks. The trait bounds make \`Arc<dyn Signer>\` and \`Arc<S: Signer>\` work as the natural sharing primitive.

## \`PrivateKeySigner\` — the in-process impl

\`\`\`rust
pub struct PrivateKeySigner {
    /// The \`SigningKey\` from k256 (Rust BIP-340 secp256k1).
    signer: SigningKey,
    /// The Ethereum address derived from the public key.
    address: Address,
    /// Chain ID for EIP-155 replay protection.
    chain_id: Option<ChainId>,
}
\`\`\`

Three fields. The \`SigningKey\` is the actual private key. \`address\` is *cached at construction* (deriving it from the public key is non-trivial — keccak of the uncompressed pubkey, take last 20 bytes — so it's computed once). \`chain_id\` is per-signer, not per-call, because most users want one signer pinned to one chain.

### Constructors

\`\`\`rust
impl PrivateKeySigner {
    pub fn random() -> Self { /* OsRng → SigningKey */ }
    pub fn random_with(rng: &mut impl CryptoRng) -> Self { /* tests */ }
    pub fn from_bytes(bytes: &B256) -> Result<Self> { /* parse k256 key */ }
    pub fn from_str(s: &str) -> Result<Self> { /* hex → from_bytes */ }
    pub fn from_signing_key(signer: SigningKey) -> Self { /* direct */ }
}
\`\`\`

Five constructors covering the realistic key sources: random for tests, from-bytes for stored keys, from-string for hex, direct for callers that already have a \`SigningKey\` from elsewhere. **Construction is the one place \`PrivateKeySigner\` differs from network-bound signers** — they have their own connect/configure flows.

### Both \`Signer\` and \`SignerSync\`

\`PrivateKeySigner\` implements *both* the async \`Signer\` trait and the sync \`SignerSync\` trait. Generic-over-S code can use either:

\`\`\`rust
fn high_throughput_path<S: SignerSync>(signer: &S) { /* sync, no future overhead */ }
fn cloud_compatible_path<S: Signer>(signer: &S) { /* async, works for AWS too */ }
\`\`\`

\`PrivateKeySigner\`'s sync path does the actual signing work; its async path is a thin wrapper that calls the sync path inside an \`async\` block. **Async impls compose cheaply over sync ones; the reverse doesn't work**, which is why \`SignerSync\` exists as a separate trait that fewer impls satisfy.

> 🔍 **Find in repo.** Open \`alloy-signer-local/src/private_key.rs\`. Confirm both \`impl Signer for PrivateKeySigner\` and \`impl SignerSync for PrivateKeySigner\` are present. Read the async \`sign_hash\` body — is it just \`async { self.sign_hash_sync(...) }\`?

## \`AwsSigner\` — the cloud impl

\`\`\`rust
pub struct AwsSigner {
    client: Client,         // the \`aws-sdk-kms\` Client
    key_id: String,
    address: Address,       // cached
    chain_id: Option<ChainId>,
}

#[async_trait]
impl Signer for AwsSigner {
    async fn sign_hash(&self, hash: &B256) -> Result<Signature> {
        let resp = self.client
            .sign()
            .key_id(&self.key_id)
            .message(Blob::new(hash.to_vec()))
            .message_type(MessageType::Digest)
            .send()
            .await?;
        // resp.signature is DER-encoded; convert to alloy Signature
        let sig = der_to_alloy(&resp.signature.as_ref())?;
        // recover the recovery id by trying both possibilities and matching address
        let recid = recover_recid(hash, &sig, &self.address)?;
        Ok(Signature { /* ... */ })
    }
    // ...
}

// AwsSigner does NOT impl SignerSync — there's no sync path through AWS KMS.
\`\`\`

(Approximate — exact alloy is more elaborate around DER decoding and recovery-id resolution.)

Three things worth noting:

1. **AWS returns DER-encoded signatures**, not the (r, s, v) tuple alloy uses. The signer's responsibility is to decode and adapt.
2. **Recovery ID isn't returned by AWS.** AWS only returns r and s. The \`v\` (recovery byte) has to be *recovered* by trying both possibilities and checking which one produces the cached \`address\`. **One AWS call → two address-derivation attempts → one matched signature.**
3. **No \`SignerSync\` impl.** AWS calls cross the network, so there's no sync path. Generic-over-S code that needs sync must accept that AWS signers are excluded.

> 🛑 **Anti-fluency.** \`PrivateKeySigner\` caches \`address\` at construction (one-shot pubkey derivation). \`AwsSigner\` caches it because it's looked up via \`describe_key\`. **Why does every signer cache the address? What goes wrong if \`address()\` were a network call every time?**

Because \`address()\` is called *for every transaction*, often *multiple times per tx* (for tracking, logging, signing-eligibility checks, building call frames). If it were a network call, every transaction would incur AWS round-trip latency *just to learn whose key signed it*. Caching at construction trades a one-time setup for amortized zero per-call cost.

## \`SignableTransaction\` — the chain-aware glue

\`\`\`rust
pub trait SignableTransaction<Sig> {
    fn set_chain_id(&mut self, chain_id: ChainId);
    fn set_chain_id_checked(&mut self, chain_id: ChainId) -> bool;
    fn encode_for_signing(&self, out: &mut dyn BufMut);
    fn signature_hash(&self) -> B256;
    fn into_signed(self, signature: Sig) -> Signed<Self, Sig>
    where
        Self: Sized;
}
\`\`\`

Every chain's \`UnsignedTx\` type (\`alloy_consensus::TypedTransaction\` for Ethereum, \`OpTypedTransaction\` for Optimism) implements \`SignableTransaction<Signature>\`. That's what gives \`TxSigner::sign_transaction\` something to operate on without knowing the chain:

\`\`\`rust
async fn sign_transaction(&self, tx: &mut dyn SignableTransaction<Signature>) -> Result<Signature> {
    let hash = tx.signature_hash();
    self.sign_hash(&hash).await
}
\`\`\`

The \`TxSigner\` doesn't know what kind of tx it is. It just calls \`signature_hash()\` on the trait object, gets back a 32-byte hash, signs that. **Chain-agnostic signer + chain-specific UnsignedTx via the SignableTransaction bridge.**

> 🔍 **Find in repo.** Open \`alloy_consensus::TypedTransaction\`. Find the \`impl SignableTransaction<Signature> for TypedTransaction\`. Note that \`signature_hash\` dispatches by tx type (Legacy uses RLP-encoded tx, EIP-1559 uses keccak of \`0x02 || rlp(tx)\`, etc.) — the encoding rules are *inside* the impl. The signer never sees them.

## \`WalletFiller\` — the bridge into Provider machinery

\`\`\`rust
pub struct WalletFiller<W> {
    pub wallet: W,
}

impl<W, N: Network> TxFiller<N> for WalletFiller<W>
where
    W: NetworkWallet<N>,
{
    type Fillable = Sendable<N::TxEnvelope>;

    // ...build the unsigned tx, sign it, attach the signature to the request
    async fn fill(&self, fillable: Self::Fillable, tx: &mut SendableTx<N>) -> TransportResult<...> {
        let envelope = self.wallet.sign_request(/* the unsigned tx from fillable */).await?;
        tx.envelope = Some(envelope);
        Ok(...)
    }
    // ...
}
\`\`\`

(The exact alloy code involves several traits — \`NetworkWallet<N>\`, \`TxFiller<N>\`, \`Sendable\` — that we're skipping. The structural point: \`WalletFiller\` is generic over the wallet type \`W\`, parameterized by network \`N\`, and implements the same \`TxFiller<N>\` trait as nonce/gas/chain-id fillers from the Provider chain.)

The user-facing builder method \`.wallet(signer)\`:

\`\`\`rust
impl<P, N> ProviderBuilder<P, N>
where
    P: ProviderLayer<...>,
    N: Network,
{
    pub fn wallet<W: NetworkWallet<N>>(self, wallet: W) -> ProviderBuilder<...> {
        self.layer(WalletFiller::new(wallet))
    }
}
\`\`\`

\`.wallet(signer)\` is a \`.layer(WalletFiller::new(signer))\` in disguise. **Same composition mechanism as nonce/gas/chain-id fillers.** The signer integrates into the FillProvider chain by being wrapped in a \`WalletFiller\` and stacked alongside the others.

That's why the user never sees \`WalletFiller\` directly: \`ProviderBuilder.wallet(...)\` is the documented surface. Underneath, it's the same Filler machinery from the Provider chain.

## \`sign_dynamic_typed_data\` — EIP-712 (briefly)

For completeness: alloy has a separate \`SignerSync::sign_dynamic_typed_data(typed_data: &TypedData) -> Result<Signature>\` for EIP-712 signing (typed data with domain separator, used heavily by dapps for off-chain signed orders). The shape is:

1. Compute the EIP-712 hash (domain hash + struct hash, prefixed with \`0x1901\`)
2. Call \`sign_hash\` with the result

Same default-impl pattern as \`sign_message\`: lower-level \`sign_hash\` does the work; the higher-level method handles the EIP-712 prefixing and calls down. **One trait, multiple input types, all routing through the same low-level signing op.**

## Recall before the quiz

Without scrolling:

1. \`Signer\`'s \`auto_impl\` list is \`(&mut, Box, Arc)\`. Why no \`&\`, why no \`Rc\`?
2. \`PrivateKeySigner\` caches the \`address\` at construction. Trace through: how would \`AwsSigner\` perform if \`address()\` were uncached?
3. \`AwsSigner\` only returns \`(r, s)\` from KMS. What recovery-id work does \`AwsSigner::sign_hash\` do that \`PrivateKeySigner::sign_hash\` doesn't?
4. The user calls \`ProviderBuilder.wallet(signer)\`. Trace through the \`WalletFiller\` machinery: what's the layered structure of the resulting provider, and where does the signer's \`sign_transaction\` actually get invoked?

The next lesson is a quiz. Engage with these recalls now if any answer is shaky.
`,
                },
                {
                  title: 'Quiz: did the \`Signer\` model stick?',
                  slug: 'alloy-signer-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 11,
                  duration: 4,
                  xpReward: 25,
                  content: `# Quiz: did the \`Signer\` model stick?

Four questions covering the design decisions across the Signer buildup and walkthrough. Same rule as the other Advanced quizzes: **you can't nod past a quiz.**

If you miss two or more, scroll back to *Building the \`Signer\` trait step by step* before going on to the drill.`,
                  quizQuestions: [
                    {
                      question: "Alloy splits signing into two traits: `Signer` (chain-agnostic, signs hashes/messages) and `TxSigner<Sig>` (chain-aware, signs transactions via `SignableTransaction`). Why is `TxSigner` a *separate* trait, not just a method on `Signer`?",
                      options: [
                        "Backward compatibility — older alloy versions had only `Signer`, and `TxSigner` was added later as a non-breaking addition.",
                        "Most signing operations aren't tx-signing (EIP-191 messages and EIP-712 typed data dominate dapp usage). Forcing every `Signer` to be chain-parameterized for the rare tx case would bloat every signer's signature. Plus, `Signer` impls (like `PrivateKeySigner`) are chain-agnostic and reusable across networks — tagging them with `N` would force one signer struct per chain.",
                        "Rust's trait coherence rules forbid putting both a sync and async method in the same trait.",
                        "`Signer` is implemented by external libraries; `TxSigner` is implemented by alloy. Splitting maintains a clear boundary.",
                      ],
                      correctIndex: 1,
                      explanation: "Two reasons compound. First, signing isn't usually tx-signing — most production code signs EIP-191 messages or EIP-712 typed data. Putting tx-signing on `Signer` would make every signer parameterized over the rare case. Second, `PrivateKeySigner` is chain-agnostic by nature (a secp256k1 key doesn't care if the chain is Ethereum or Optimism). Tagging `Signer` with `N` would force `PrivateKeySigner<Ethereum>` and `PrivateKeySigner<Optimism>` as distinct types — wasteful. The split keeps `Signer` chain-agnostic and reusable, while `TxSigner<N>` carries the chain-specific tx-signing capability that a *single* `Signer` impl can provide for *multiple* chains.",
                    },
                    {
                      question: "`Signer<Sig = Signature>` parameterizes `Sig` as a *generic parameter on the trait*, not an associated type (the way `Network::TxEnvelope` is). What's the load-bearing reason?",
                      options: [
                        "Generic parameters compile faster than associated types.",
                        "Associated types can't have defaults; generic parameters can. Defaulting to `Signature` is the only reason.",
                        "A single signer might want to implement the trait *multiple times* with different `Sig` types — e.g., `impl Signer<Signature> for X` and `impl Signer<RawBytes> for X` for the same struct. Generic parameter = 'I can implement this trait with any compatible Sig.' Associated type = 'I commit to exactly one Sig per impl.' For signers, multi-impl is the right semantics.",
                        "Generic parameters allow `dyn Trait`; associated types don't.",
                      ],
                      correctIndex: 2,
                      explanation: "The choice is determined by whether multiple impls per type make sense. Network's `TxEnvelope` is fixed per chain (you can't have two valid TxEnvelope types for Ethereum) — associated type. Signer's `Sig` is per-operation: an ECDSA-key signer might produce `Signature` for normal use but `Bytes` for a raw-output API — generic parameter lets you implement both. **Generic = 'multiple impls valid.' Associated = 'one impl per type.'** Same trait shape decision, different answer per use case. (Default values work for both forms — that's not the reason.)",
                    },
                    {
                      question: "Both `PrivateKeySigner` and `AwsSigner` cache the `address` at construction rather than computing it on each `address()` call. Why does this matter — what's the cost model?",
                      options: [
                        "Because `address()` is private — it's not actually called from outside the signer crate, so caching is a stylistic choice.",
                        "`address()` is called *for every transaction* (often multiple times per tx — for tracking, logging, signing-eligibility checks, building call frames). For `AwsSigner`, an uncached `address()` would be an AWS network round-trip *per call*, adding ~50-200ms latency per transaction. For `PrivateKeySigner`, uncached means one keccak256-of-pubkey per call — cheaper but still wasteful. Caching at construction trades a one-time setup for amortized zero per-call cost.",
                        "The Ethereum protocol requires `address()` to return a stable value across all calls within a session.",
                        "Rust's borrow checker doesn't allow `address()` to be a method that does work — it must read a precomputed value.",
                      ],
                      correctIndex: 1,
                      explanation: "The access pattern is the key. Every transaction touches `address()` at least once (sender check, signing eligibility), often more (logging, monitoring, call-frame building). For `AwsSigner` specifically, uncached would mean `describe_key` round-trips per tx — making *every* transaction wait for AWS network latency just to learn whose key is signing. Caching once at construction (in `AwsSigner::new`) means the cost is paid one time. For `PrivateKeySigner` the per-call cost is keccak256-of-uncompressed-pubkey-take-last-20-bytes — cheap but pointless to redo. **Cache costs that recur per-tx; don't cache costs that are already cheap.**",
                    },
                    {
                      question: "User code calls `ProviderBuilder.wallet(signer).build()`. Tracing through alloy: what's the actual layered structure of the resulting provider, and where does `sign_transaction` get invoked?",
                      options: [
                        "`ProviderBuilder.wallet(signer)` directly stores the signer on the provider; `send_transaction` calls `signer.sign_transaction()` internally before forwarding to the inner provider.",
                        "`.wallet(signer)` desugars to `.layer(WalletFiller::new(signer))` — installing a `WalletFiller<W>` as a `TxFiller<N>` in the FillProvider chain (alongside `NonceFiller`, `GasFiller`, `ChainIdFiller`). When the user calls `provider.send_transaction(...)`, each filler's `fill()` runs in chain order; `WalletFiller::fill` invokes `wallet.sign_transaction()` on the populated unsigned tx and attaches the signature.",
                        "`.wallet(signer)` is purely a convenience method — the signer is moved into the request type and signing happens at the transport layer, after RPC encoding.",
                        "`.wallet(signer)` is a marker that tells the next provider layer to expect signed requests; signing happens externally before `send_transaction` is called.",
                      ],
                      correctIndex: 1,
                      explanation: "`.wallet(signer)` is sugar for `.layer(WalletFiller::new(signer))`. The signer enters the Provider chain via the same Filler machinery as nonce/gas/chain-id — the `WalletFiller<W>` is a `TxFiller<N>` that runs in the FillProvider chain. When a request flows through, each filler runs in stack order (typically: nonce → gas → chain-id → wallet → send). The wallet filler is positioned last because it needs the unsigned tx to be fully populated (nonce/gas/chainid filled in) before it can compute the signature hash. The cross-chain composition pattern from the Provider chain is the same here, just with signing as the new participant.",
                    },
                  ],
                },
                {
                  title: 'Drill: ship an end-to-end signed tx via the FillProvider chain',
                  slug: 'alloy-signer-drill-en',
                  type: 'CONTENT',
                  sortOrder: 12,
                  xpReward: 25,
                  duration: 12,
                  content: `# Drill: ship an end-to-end signed tx via the FillProvider chain

Reading is rehearsal. **Doing is memory.** This drill takes you from "I've read about \`Signer\` and \`WalletFiller\`" to "I have wired a real signer into a real ProviderBuilder, sent a signed transaction against Anvil, and observed the FillProvider chain do nonce / gas / chain-id / signing in stack order."

This is the **capstone** for the Provider, Network, and Signer chains: all three trait families come together in one runnable program.

## Setup

Two terminals:

**Terminal 1 — Anvil:**

\`\`\`bash
anvil
\`\`\`

(Anvil prints 10 prefunded accounts at start; we'll use the first one.)

**Terminal 2 — your project:**

\`\`\`bash
cargo new alloy-signer-drill --bin
cd alloy-signer-drill
\`\`\`

\`Cargo.toml\`:

\`\`\`toml
[dependencies]
alloy = { version = "0.x", features = ["full", "provider-http", "signer-local"] }
tokio = { version = "1", features = ["full"] }
eyre = "0.6"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
\`\`\`

## Drill 1 — Sign a hash directly with \`PrivateKeySigner\`

Before wiring up the full Provider chain, exercise the lowest-level \`Signer::sign_hash\` interface. Verify by recovering the signer's address from the resulting signature.

\`src/main.rs\`:

\`\`\`rust
use alloy::primitives::{B256, keccak256};
use alloy::signers::{Signer, local::PrivateKeySigner};

#[tokio::main]
async fn main() -> eyre::Result<()> {
    tracing_subscriber::fmt().with_env_filter("info").init();

    // Drill 1: sign a hash directly
    let signer = PrivateKeySigner::random();
    let signer_addr = signer.address();
    println!("signer address: {signer_addr}");

    let message = b"hello, alloy";
    let hash = keccak256(message);
    let sig = signer.sign_hash(&hash).await?;

    let recovered = sig.recover_address_from_prehash(&hash)?;
    assert_eq!(recovered, signer_addr);
    println!("recovered: {recovered}  (matches: {})", recovered == signer_addr);

    Ok(())
}
\`\`\`

\`cargo run\`. You should see the signer's address, then a recovered address that matches.

> 🛑 **Question (write it down):** \`signer.sign_hash(&hash)\` returns a \`Result<Signature>\`. \`Signature\` is alloy's \`(r, s, v)\` tuple. **What did the signer have to do internally to compute \`v\` (the recovery byte)?**

For \`PrivateKeySigner\`, \`v\` falls out of the \`k256\` ECDSA-recoverable signing primitive directly — the secp256k1 sign-recoverable function returns it as part of the signature. **No extra work.** This is why \`PrivateKeySigner::sign_hash\` is one line of crypto: \`(r, s, v) = k256::sign_recoverable(privkey, hash)\`.

For \`AwsSigner\`, \`v\` would have to be *recovered manually* (try v=0 and v=1, see which one produces the cached \`address\`). That's the cost of cloud signing the walkthrough flagged.

## Drill 2 — Wire the signer into \`ProviderBuilder\` and send a real tx

Now exercise the full FillProvider chain. Use \`ProviderBuilder.wallet(signer)\` to install the signer, plus \`with_recommended_fillers()\` to add nonce / gas / chain-id fillers.

Add to \`main.rs\` (after the Drill 1 code):

\`\`\`rust
use alloy::providers::{Provider, ProviderBuilder};
use alloy::primitives::{Address, U256, address};

// Drill 2: real signed tx via FillProvider
// Use one of Anvil's prefunded accounts (private key from Anvil's startup output)
let funded_pk = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
let funded_signer: PrivateKeySigner = funded_pk.parse()?;
let funded_addr = funded_signer.address();
println!("funded sender: {funded_addr}");

let provider = ProviderBuilder::new()
    .with_recommended_fillers()  // nonce + gas + chain_id
    .wallet(funded_signer)        // signing
    .on_http("http://localhost:8545".parse()?);

// Send 1 ETH to a fresh address
let recipient: Address = address!("000000000000000000000000000000000000beef");
let value = U256::from(1_000_000_000_000_000_000u128);  // 1 ETH

let pending = provider
    .send_transaction(
        alloy::rpc::types::TransactionRequest::default()
            .with_to(recipient)
            .with_value(value)
    )
    .await?;
let receipt = pending.get_receipt().await?;
println!("tx hash: {:?}", receipt.transaction_hash);
println!("status: {:?}", receipt.status());

let recipient_balance = provider.get_balance(recipient).await?;
println!("recipient balance: {recipient_balance}");
\`\`\`

(The \`.with_to(...)\`, \`.with_value(...)\` calls are the \`TransactionBuilder<N>\` trait methods from the Network chain. Notice how everything composes: Provider chain's \`ProviderBuilder\`, Network chain's \`TransactionBuilder\`, Signer chain's \`.wallet()\` — three chains, one runnable program.)

\`cargo run\` should produce something like:

\`\`\`
signer address: 0x... (random)
recovered: 0x... (matches: true)
funded sender: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
tx hash: 0x...
status: true
recipient balance: 1000000000000000000
\`\`\`

The recipient balance is exactly 1 ETH (1_000_000_000_000_000_000 wei). **The signed transaction landed; the FillProvider chain did its job.**

## Drill 3 — Trace the fillers that ran

The \`with_recommended_fillers()\` + \`.wallet(signer)\` calls layered four \`TxFiller\`s into the chain. Before \`send_transaction\` could submit anything, each filler ran in stack order on the outgoing \`TransactionRequest\`.

> 🛑 **Predict (write it down before scrolling):** Your \`TransactionRequest::default().with_to(recipient).with_value(value)\` set only \`to\` and \`value\`. The receipt shows the tx had nonce, gas limit, gas price (or maxFeePerGas), chain_id, and a signature. **For each missing field, name *which filler* populated it and *what action* it took.**

The four fillers and their actions:

| Filler | Field(s) populated | Action |
| :--- | :--- | :--- |
| \`NonceFiller\` | \`nonce\` | Calls \`eth_getTransactionCount(from, "pending")\` |
| \`GasFiller\` | \`gas\`, \`gasPrice\` (legacy) or \`maxFeePerGas\` + \`maxPriorityFeePerGas\` (EIP-1559) | Calls \`eth_estimateGas\` and \`eth_gasPrice\` (or \`eth_feeHistory\` for EIP-1559) |
| \`ChainIdFiller\` | \`chainId\` | Calls \`eth_chainId\` once and caches |
| \`WalletFiller\` | \`signature\` (which becomes the \`TxEnvelope\`) | Builds \`SignableTransaction\` from the request, calls \`signer.sign_transaction()\`, attaches the signature to produce a signed envelope |

Order matters: \`WalletFiller\` runs *after* the others because it needs nonce/gas/chain_id to be present before computing the signature hash. **Sign-after-fill is non-negotiable.**

> 🔍 **Find in repo.** Open \`crates/provider/src/fillers/\` (or wherever fillers live). Confirm: there's a \`TxFiller<N>\` trait, and \`NonceFiller\`, \`GasFiller\`, \`ChainIdFiller\`, \`WalletFiller\` are all \`impl TxFiller<N>\`. **They are interchangeable; the order is determined by how \`with_recommended_fillers\` and \`.wallet()\` insert them.**

## Drill 4 — Anti-fluency: skip the fillers, observe the failure

Modify your code to *skip* \`with_recommended_fillers()\`:

\`\`\`rust
let provider_no_fillers = ProviderBuilder::new()
    .wallet(funded_signer.clone())  // only the wallet, no nonce/gas/chain_id
    .on_http("http://localhost:8545".parse()?);

let result = provider_no_fillers
    .send_transaction(
        TransactionRequest::default()
            .with_to(recipient)
            .with_value(U256::from(1_000_000_000_000_000_000u128))
    )
    .await;
println!("no-filler result: {:?}", result);
\`\`\`

> 🛑 **Predict before running.** What error do you expect? Hint — the WalletFiller still runs (it's the wallet), but everything else is missing.

You'll see something like \`"Error: missing nonce"\` or \`"Error: missing gas\`/\`maxFeePerGas\`"\`, depending on which validation fires first. **The error proves the fillers do real work** — without them, the request is incomplete. Adding them back makes the program work.

> 🔍 **Try one more variation.** Add only the nonce filler, observe what's missing next. Add gas, observe what's missing next. **Each filler closes one gap.**

## Drill 5 — Inspect the final Provider type (optional)

If you want to *see* the layered FillProvider type, add this and let \`cargo\` complain:

\`\`\`rust
let _: () = provider;  // type mismatch error will print the real type
\`\`\`

The compiler will print something like:

\`\`\`
expected (), found
  FillProvider<JoinFill<JoinFill<JoinFill<JoinFill<Identity, GasFiller>, NonceFiller>, ChainIdFiller>, WalletFiller<EthereumWallet>>, RootProvider, Ethereum>
\`\`\`

(The exact type depends on alloy's internal naming.) Read left-to-right: \`FillProvider\` wraps the inner provider; the \`JoinFill<...>\` chain is the four fillers stacked. The wallet sits at the outermost layer, applied last during \`send_transaction\`.

**This is the type-level realization of the Provider chain's "build the right tower" lesson** — the type itself encodes the filler stack order.

## End-of-lesson recall

Without scrolling, in your own words:

1. \`PrivateKeySigner\` doesn't have to do recovery-id work; \`AwsSigner\` does. **What's the architectural cause?** Where does \`v\` come from for each?
2. Trace through Drill 2: between \`provider.send_transaction(req)\` being called and the network seeing a signed envelope, **which fillers ran in what order, and what RPC calls did they make?**
3. **Why is \`WalletFiller\` *last* in the filler chain?** What would break if it ran before \`NonceFiller\`?
4. The compiler-printed type for your provider is a deep \`FillProvider<JoinFill<JoinFill<...>>>\`. **What does the depth of nesting represent at runtime?**

If any answer is shaky, the lesson isn't done with you. Re-run the drills or re-read the buildup.

After this drill, you've shipped a *signed transaction through the full Provider/Network/Signer trio* — the same shape every dapp, MEV bot, and indexer uses in production. **Provider, Network, and Signer chains are complete.** The course's final quiz is the next stop.`,
                },
                {
                  title: 'Alloy Advanced final quiz',
                  slug: 'alloy-advanced-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 13,
                  duration: 8,
                  xpReward: 25,
                  content: `# Alloy Advanced final quiz

Final check across the three chains: \`Provider\`, \`Network\`, \`Signer\`.

Three questions. Same rule: **you can't nod past a quiz.** Miss two and re-read the relevant chain's build-up before claiming you're done with Alloy Advanced.`,
                  quizQuestions: [
                    {
                      question: "`Provider`'s `root()` method is the only required method on the trait — every other RPC method has a default impl. What's its load-bearing architectural purpose?",
                      options: [
                        "It returns the provider's name for logging/tracing.",
                        "It enables wrapper providers (signing, filler chains, custom layers) to delegate transport access without re-implementing all 30+ RPC methods. Wrappers forward `root()` to their inner provider's `root()`; the trait's default impls then route through `self.root()` to the actual transport — automatically threaded through the wrapper stack.",
                        "It's a backward-compat method retained for API stability.",
                        "It's required by Rust's `dyn Provider` infrastructure.",
                      ],
                      correctIndex: 1,
                      explanation: "The `root()` indirection is what makes the FillProvider stack work. Wrapper authors write *one method body* (root forwarding) plus whatever specific methods they want to override; the other 30+ methods come for free via the trait's default impls. This is what lets `LoggingProvider`, `FillProvider`, `WalletFiller`, and arbitrary custom layers compose without N×M wrapper-method-body explosion. The pattern from the Provider chain's Step 4.",
                    },
                    {
                      question: "`Network` uses 10 *associated types* (TxType, TxEnvelope, TransactionRequest, TransactionResponse, ReceiptEnvelope, ReceiptResponse, Header, HeaderResponse, BlockResponse, UnsignedTx) rather than 10 generic parameters on the trait. What's the load-bearing benefit for code that's generic over Network?",
                      options: [
                        "Associated types compile faster than generic parameters.",
                        "Cohesion + concision: associated types group 'these go together' (Ethereum's TxRequest must pair with Ethereum's TxEnvelope, never with Optimism's), AND call sites only spell out one parameter (`<N: Network>`) instead of 10 raw generics.",
                        "Generic parameters can't be used in trait method signatures, only in the trait body.",
                        "Associated types support `dyn Trait`; generic parameters don't.",
                      ],
                      correctIndex: 1,
                      explanation: "Cohesion is the killer feature: `Provider<EthereumTxRequest, OptimismReceipt>` would compile if these were raw generics — there's nothing stopping you from mixing types from different chains. Associated types group them under one `Network` impl, so picking `Ethereum` selects a coherent set. Plus every signature mentioning Provider would have to spell out 10 parameters with raw generics; one `N: Network` pulls them all in. Same idiom in the rest of alloy: \`TransactionEnvelope<Self>\`, \`BlockResponse<Self>\` — helper traits parameterized by the dictionary key keep code generic-over-N portable.",
                    },
                    {
                      question: "User code calls `ProviderBuilder.wallet(signer).on_http(url)`. Tracing through alloy: what's the actual mechanism that integrates `signer` into the Provider chain?",
                      options: [
                        "`.wallet(signer)` directly stores the signer on the provider; `send_transaction` calls `signer.sign_transaction()` internally.",
                        "`.wallet(signer)` desugars to `.layer(WalletFiller::new(signer))` — installing a `WalletFiller<W>` as a `TxFiller<N>` in the FillProvider chain, alongside `NonceFiller`/`GasFiller`/`ChainIdFiller`. When `send_transaction` runs, each filler's `fill()` runs in stack order; `WalletFiller::fill` invokes `signer.sign_transaction()` on the populated unsigned tx and attaches the signature.",
                        "`.wallet(signer)` is a marker that tells the next provider layer to expect signed requests; signing happens externally.",
                        "`.wallet(signer)` mutates the underlying transport to inject signatures into outgoing JSON-RPC payloads.",
                      ],
                      correctIndex: 1,
                      explanation: "`.wallet(signer)` is sugar for `.layer(WalletFiller::new(signer))`. The signer enters the Provider chain via the same Filler machinery as nonce/gas/chain-id — the `WalletFiller<W>` is a `TxFiller<N>` that runs in the FillProvider chain. Order matters: `WalletFiller` runs *last* because it needs nonce/gas/chain_id filled in before it can compute the signature hash. Three chains (Provider's `Filler`, Network's `TxFiller<N>`, Signer's `Signer` + `WalletFiller`) compose into one runnable program — the architectural payoff of doing all three.",
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
