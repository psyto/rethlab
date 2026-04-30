import { PrismaClient } from '@prisma/client';

export async function seedRethExpertEN(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'expert', 'performance', 'mdbx', 'mev', 'zkvm'];

  await prisma.course.create({
    data: {
      slug: 'reth-expert-en',
      title: 'Reth Expert — Production Engineering',
      description:
        'Hardcore systems work: profiling and cache-aware Rust, MDBX storage internals, Tokio runtime, procedural macros, custom precompiles, Merkle Patricia Trie, MEV in production, zkEVM, and shipping a custom Reth fork.',
      difficulty: 'ADVANCED',
      duration: 240,
      xpReward: 500,
      track: 'reth-expert',
      tags,
      isPublished: true,
      sortOrder: 400,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Performance & Systems',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Performance engineering for Reth',
                  slug: 'performance-engineering-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 40,
                  content: `# Performance engineering for Reth

If you're going to ship a Reth fork or write hot-path code in Revm, **profiling and benchmarking are non-negotiable**. Premature optimization is bad; *invisible* slowdowns are worse.

## 1. Profile first, optimize second

Two tools, two purposes:

| Tool | Purpose |
| :--- | :--- |
| **flamegraph** | "Where is time being spent overall?" |
| **Criterion** | "Did this specific change make function X faster?" |

### Flamegraph in 30 seconds

\`\`\`bash
cargo install flamegraph
cargo flamegraph --bin reth -- node --chain mainnet
# Open flamegraph.svg in a browser
\`\`\`

Wide bars at the top of the flamegraph = your hot paths. **Don't optimize anything that isn't visible there.**

### Criterion microbenchmarks

\`\`\`rust
// Cargo.toml
// [dev-dependencies]
// criterion = "0.5"

// benches/my_bench.rs
use criterion::{criterion_group, criterion_main, Criterion};

fn bench_my_thing(c: &mut Criterion) {
    c.bench_function("hash 1KB", |b| {
        let data = vec![0u8; 1024];
        b.iter(|| keccak256(&data))
    });
}

criterion_group!(benches, bench_my_thing);
criterion_main!(benches);
\`\`\`

\`cargo bench\` produces statistical comparisons. **Always commit your benchmark results** when claiming a perf improvement.

## 2. Cache lines, not lines of code

Modern CPUs make memory access ~100x slower than computation. The unit of memory access is a **64-byte cache line**.

### Implications

- **Struct of Arrays > Array of Structs** for hot loops
- **Pad hot fields to a cache line** to avoid false sharing
- **Sort data for predictable access patterns**

\`\`\`rust
// Bad: every iteration touches 200 bytes
struct Row {
    id: u64,
    big_blob: [u8; 192],
}

// Better: separate hot and cold fields
struct Hot { id: u64, version: u32 }
struct Cold { big_blob: [u8; 192] }
\`\`\`

## 3. Allocator choice

Default allocators (glibc malloc, jemalloc) have different performance profiles. Reth uses **jemalloc** for stable latency under load.

\`\`\`toml
# Cargo.toml
[dependencies]
tikv-jemallocator = "0.5"
\`\`\`

\`\`\`rust
// main.rs
#[global_allocator]
static GLOBAL: tikv_jemallocator::Jemalloc = tikv_jemallocator::Jemalloc;
\`\`\`

This single line frequently shaves 10-30% off tail latency in I/O-heavy services.

## 4. Reth's actual production build profiles

From the [\`paradigmxyz/reth\` Cargo.toml](https://github.com/paradigmxyz/reth/blob/main/Cargo.toml):

\`\`\`toml
[profile.release]
opt-level = 3
lto = "thin"
debug = "none"
strip = "symbols"
panic = "unwind"
codegen-units = 16

[profile.maxperf]
inherits = "release"
lto = "fat"
codegen-units = 1

[profile.maxperf-symbols]
inherits = "maxperf"
debug = "full"
strip = "none"
\`\`\`

This is what the Paradigm team actually ships. Three profiles, three trade-offs:

### \`release\` — daily builds
\`thin\` LTO and 16 codegen-units balance compile speed against runtime perf. Good enough for development and most production deployments.

### \`maxperf\` — validators and benchmarks
\`fat\` LTO + 1 codegen-unit. Compile times go up significantly (full cross-module inlining), but the resulting binary is genuinely faster — this is what you build for a validator that needs every cycle.

### \`maxperf-symbols\` — profiling production
Same optimization as \`maxperf\`, but keeps full debug symbols. Use it when you need a flamegraph that shows actual function names instead of mangled offsets in production-grade code. **This is the profile you build when something is slow in production and you need to find out why.**

### How to invoke

\`\`\`bash
cargo build --profile maxperf --bin reth
# Or with native CPU instructions (e.g., AVX2):
RUSTFLAGS="-C target-cpu=native" cargo build --profile maxperf --bin reth
\`\`\`

Combine with the \`jemalloc\` and \`asm-keccak\` features you saw earlier.

## 5. Three rules

1. **Measure before changing anything.** "It feels faster" is not data.
2. **Optimize the path the profiler shows you.** Anything else is busy work.
3. **Re-measure after.** Compilers can defeat your hand-optimization.

You're now equipped to start opening Reth's perf-critical files (\`crates/storage/db\`, \`crates/blockchain-tree\`) with intent rather than just curiosity.`,
                },
                {
                  title: 'MDBX & storage internals',
                  slug: 'mdbx-storage-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 40,
                  content: `# MDBX & storage internals

Reth stores all chain state in **MDBX**, a memory-mapped B+tree KV store derived from LMDB. Understanding MDBX is what separates "I can use Reth" from "I can extend Reth."

## 1. Why MDBX (not LevelDB / RocksDB)?

| Feature | RocksDB | MDBX |
| :--- | :--- | :--- |
| **Architecture** | LSM tree | **B+tree, mmap'd** |
| **Read latency** | Variable (compactions) | **Predictable** |
| **Write amplification** | High | **~1x** |
| **Crash safety** | Manual flush | **ACID via MVCC** |
| **Read concurrency** | Locks | **Lock-free reads** |

Reth picks MDBX because Ethereum is **read-heavy** and **latency-sensitive**. LSM trees do well at writes but stall on compactions — fatal for sync speed and validator latency.

## 2. Reth's actual \`Database\` trait

From [\`crates/storage/db-api/src/database.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/storage/db-api/src/database.rs):

\`\`\`rust
pub trait Database: Send + Sync + Debug {
    type TX: DbTx + Send + Sync + Debug + 'static;
    type TXMut: DbTxMut + DbTx + TableImporter + Send + Sync + Debug + 'static;

    #[track_caller]
    fn tx(&self) -> Result<Self::TX, DatabaseError>;

    #[track_caller]
    fn tx_mut(&self) -> Result<Self::TXMut, DatabaseError>;

    fn path(&self) -> PathBuf;

    fn oldest_reader_txnid(&self) -> Option<u64>;

    fn last_txnid(&self) -> Option<u64>;
}
\`\`\`

Read this carefully:

- **Two associated transaction types** — \`TX\` (read-only) and \`TXMut\` (read-write). Different methods on each.
- **\`oldest_reader_txnid\`** — exposes the oldest still-active read transaction. Operators use this to detect long-running readers that block GC.
- **\`#[track_caller]\`** — when a tx open fails, the panic shows the **caller's line number**, not the trait method. Real production debugging discipline.

## 3. \`DbTx\` and \`DbTxMut\` — the actual operations

From [\`crates/storage/db-api/src/transaction.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/storage/db-api/src/transaction.rs):

\`\`\`rust
// DbTx (read-only)
fn get<T: Table>(&self, key: T::Key) -> Result<Option<T::Value>, DatabaseError>;
fn get_by_encoded_key<T: Table>(
    &self,
    key: &<T::Key as Encode>::Encoded,
) -> Result<Option<T::Value>, DatabaseError>;
fn commit(self) -> Result<(), DatabaseError>;
fn abort(self);
fn cursor_read<T: Table>(&self) -> Result<Self::Cursor<T>, DatabaseError>;
fn cursor_dup_read<T: DupSort>(&self) -> Result<Self::DupCursor<T>, DatabaseError>;
fn entries<T: Table>(&self) -> Result<usize, DatabaseError>;
fn disable_long_read_transaction_safety(&mut self);

// DbTxMut (read-write)
fn put<T: Table>(&self, key: T::Key, value: T::Value) -> Result<(), DatabaseError>;
fn append<T: Table>(&self, key: T::Key, value: T::Value) -> Result<(), DatabaseError>;
fn delete<T: Table>(&self, key: T::Key, value: Option<T::Value>) -> Result<bool, DatabaseError>;
fn clear<T: Table>(&self) -> Result<(), DatabaseError>;
fn cursor_write<T: Table>(&self) -> Result<Self::CursorMut<T>, DatabaseError>;
fn cursor_dup_write<T: DupSort>(&self) -> Result<Self::DupCursorMut<T>, DatabaseError>;
\`\`\`

Three things matter most:

### \`<T: Table>\` — table is a type, not a string

Each table is a Rust **type** that implements the \`Table\` trait. The compiler enforces "key/value types must match this table's schema." **A typo in a table name is a compile error.**

### \`append\` vs \`put\`

\`put\` works for any key. \`append\` is **only valid when the key is greater than the current max** — but it's faster because it skips a B+tree search. When you're processing blocks sequentially, you use \`append\`; when reorging, you fall back to \`put\`.

### Cursors

For range scans, you use a **cursor** instead of repeated \`get\` calls. A cursor positions itself in the B+tree once and walks neighboring entries — orders of magnitude faster than independent gets, because adjacent keys likely share the same page.

### \`disable_long_read_transaction_safety\`

A real-life ergonomic detail. Long read tx blocks GC, which grows the DB. Reth normally aborts read txs that have been open too long. Set this when you **really** need a long snapshot (and accept the cost).

## 4. Hot path — why this matters

Because reads are mmap'd:

- A "warm" header lookup is a **pointer dereference**, not a syscall
- The OS page cache becomes your read cache for free
- **Locality matters**: keep related data on the same page

Reth's tables are designed so that Execution-stage reads (account → storage → code) hit pages that are already warm.

## 5. Drill

Open [\`crates/storage/db-api/src/tables\`](https://github.com/paradigmxyz/reth/tree/main/crates/storage/db-api/src/tables) in the repo:

1. Find the \`Headers\` table — note its key (\`BlockNumber\`) and value (\`Header\`)
2. Find a \`DupSort\` table — these are tables where one key has multiple values
3. Trace one Execution-stage read through: which tables does it consult, in what order?

You'll come out the other side knowing where every byte of Ethereum state lives in Reth.

## 3. Why this matters for hot paths

Because reads are mmap'd:

- A "warm" header lookup is a **pointer dereference**, not a syscall
- The OS page cache becomes your read cache for free
- **Locality matters**: keep related data on the same page

Reth's "tables" are designed so that Execution-stage reads (account → storage → code) hit pages that are already warm.

## 4. Pitfalls

1. **Long read transactions block writers' garbage collection.** Don't keep a read tx open for hours; the DB grows.
2. **Page size and key ordering matter.** B+tree fanout depends on key size; a 200-byte key is a different beast than a 32-byte one.
3. **mmap means OS pressure.** A 500GB DB on a 16GB machine will thrash unless your access pattern is local.

## 5. Reading the source

Files to skim, in order:

1. \`crates/storage/db/src/abstraction\` — the Database/Tx traits
2. \`crates/storage/db/src/tables\` — the table definitions (this teaches you what Reth stores)
3. \`crates/storage/db/src/implementation/mdbx\` — the MDBX glue

After this, you'll understand where every byte of Ethereum state lives in Reth.`,
                },
                {
                  title: 'Tokio runtime internals',
                  slug: 'tokio-internals-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 40,
                  content: `# Tokio runtime internals

You've been writing \`#[tokio::main]\` and \`.await\`. Now: what actually happens?

## 1. The runtime stack

Tokio is composed of:

\`\`\`
+--------------------+
|  Your async code   |  ← futures
+--------------------+
|     Executor       |  ← polls futures to completion
|  (work-stealing)   |
+--------------------+
|       I/O          |  ← epoll/kqueue/io_uring
+--------------------+
\`\`\`

When you write \`async fn\`, the compiler generates a **state machine** that implements the \`Future\` trait. The executor's job is to call \`poll()\` on that state machine until it returns \`Poll::Ready(value)\`.

## 2. Work-stealing in 60 seconds

Tokio's multi-threaded runtime gives each worker thread a **local task queue** plus access to a global queue. When a worker is idle, it **steals** tasks from busy workers' queues.

\`\`\`
Worker A: [task1, task2, task3, task4]   ← busy
Worker B: []                              ← idle, steals from A
Worker A: [task1, task2]
Worker B: [task3, task4]
\`\`\`

This avoids contention on a global mutex while still balancing load.

## 3. Spawning vs blocking

\`\`\`rust
// Concurrent: spawn onto the runtime
let h1 = tokio::spawn(async { fetch().await });
let h2 = tokio::spawn(async { fetch().await });
let (r1, r2) = (h1.await?, h2.await?);

// CPU-heavy work: keep it OFF the async workers
tokio::task::spawn_blocking(|| {
    expensive_sync_calc()  // runs on a separate threadpool
}).await?
\`\`\`

**Rule**: never call CPU-bound code in an async context without \`spawn_blocking\`. You'll starve the runtime and the whole node grinds.

## 4. Channels — picking the right one

| Channel | Use |
| :--- | :--- |
| \`tokio::sync::mpsc\` | many producers, one consumer |
| \`tokio::sync::broadcast\` | one producer, many consumers (e.g., chain events) |
| \`tokio::sync::watch\` | latest-value broadcast (e.g., latest block) |
| \`tokio::sync::oneshot\` | a single value, request-response |

ExEx uses **broadcast** for chain notifications because every ExEx wants every event.

## 5. Custom executors / Future polling

Eventually you'll want to **poll a Future manually**:

\`\`\`rust
use std::pin::Pin;
use std::task::{Context, Poll, Waker};
use std::future::Future;

let mut fut = Box::pin(my_async_fn());
let waker = Waker::noop();
let mut cx = Context::from_waker(&waker);

match fut.as_mut().poll(&mut cx) {
    Poll::Ready(v) => /* done */,
    Poll::Pending => /* not yet — re-poll later when Waker is signaled */,
}
\`\`\`

This is the foundation of writing your own Reth-internal scheduler — useful for, say, batching MEV simulations.

## 6. How Reth uses Tokio in production

Reth doesn't expose Tokio directly — it wraps it in a **\`TaskExecutor\`** that adds **panic supervision**. From [\`crates/tasks/src/runtime.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/tasks/src):

\`\`\`rust
pub fn spawn_task<F>(&self, fut: F) -> JoinHandle<()>
where
    F: Future<Output = ()> + Send + 'static,

pub fn spawn_critical_task<F>(&self, name: &'static str, fut: F) -> JoinHandle<()>
where
    F: Future<Output = ()> + Send + 'static,
\`\`\`

Two flavors:

- **\`spawn_task\`** — fire and forget. If it panics, the panic is silently lost (Tokio default).
- **\`spawn_critical_task\`** — registered with a name; if it panics, a \`TaskManager\` channel fires and **the whole node shuts down with the task's name in the log**.

This is real production discipline: you don't want a silently-dead background task to leave your node running in a degraded state. **Critical tasks fail loudly.**

The \`TaskExecutor = Runtime\` alias lets you pass it through stage code without dragging in raw Tokio types — clean abstraction with the safety net underneath.

## 7. Reading list

- \`tokio/tokio/src/runtime/scheduler/multi_thread_alt\` — the modern multi-thread scheduler
- \`reth/crates/tasks/src/runtime.rs\` — Reth's task supervisor wrapping Tokio

After this lesson, "Tokio is magic" should become "Tokio is a state-machine driver with work-stealing — and Reth wraps it with panic supervision so production failures aren't silent."`,
                },
                {
                  title: 'Procedural macros — how `sol!` and `address!` work',
                  slug: 'procedural-macros-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 15,
                  xpReward: 35,
                  content: `# Procedural macros — how \`sol!\` and \`address!\` work

\`address!("0xabc...")\` looks like a function call but **runs at compile time**. So does \`sol! { contract IERC20 { ... } }\`. Both are **procedural macros** — code that runs in the compiler, takes a TokenStream, and emits a TokenStream.

## 1. The three kinds

| Kind | Looks like | Example |
| :--- | :--- | :--- |
| **Function-like** | \`my_macro!(...)\` | \`address!\`, \`sol!\` |
| **Derive** | \`#[derive(MyTrait)]\` | \`#[derive(Serialize)]\` |
| **Attribute** | \`#[my_attr]\` | \`#[tokio::main]\` |

All three are crates of \`crate-type = ["proc-macro"]\` with functions that take and return \`proc_macro::TokenStream\`.

## 2. The toolchain

\`\`\`mermaid
flowchart LR
    Src["Your source<br/>sol! macro"] -->|compiler invokes macro| In[Input TokenStream]
    In -->|syn::parse| AST[Rust / DSL AST]
    AST -->|your logic| Tree[Generated AST]
    Tree -->|quote!| Out[Output TokenStream]
    Out -->|compiler continues| Compiled[Compiled binary]
\`\`\`

Two crates do 90% of the work:

| Crate | Job |
| :--- | :--- |
| \`syn\` | parse a TokenStream into Rust AST |
| \`quote\` | build a TokenStream from a template |

## 3. The actual \`address!\` macro

Here's what's surprising: **\`address!\` is not a procedural macro at all.** It's a regular \`macro_rules!\` declarative macro. Here's the real source from [\`crates/primitives/src/bits/macros.rs\`](https://github.com/alloy-rs/core/blob/main/crates/primitives/src/bits/macros.rs):

\`\`\`rust
macro_rules! fixed_bytes_macros {
    ($d:tt $($(#[$attr:meta])* macro $name:ident($ty:ident $($rest:tt)*);)*) => {$(
        $(#[$attr])*
        #[macro_export]
        macro_rules! $name {
            () => {
                $crate::$ty::ZERO
            };

            ($d ($d t:tt)+) => {
                $crate::$ty::new($crate::hex!($d ($d t)+))
            };
        }
    )*};
}

fixed_bytes_macros! { $
    macro address(Address);
    macro b64(B64);
    macro b128(B128);
    macro b256(B256);
    macro b512(B512);
    macro bloom(Bloom);
    macro fixed_bytes(FixedBytes<0>);
}
\`\`\`

Read it twice. There's a lot here.

### A macro that defines macros

\`fixed_bytes_macros!\` is an **outer macro that generates inner macros**. The single invocation at the bottom creates seven macros at once: \`address!\`, \`b64!\`, \`b128!\`, \`b256!\`, \`b512!\`, \`bloom!\`, \`fixed_bytes!\`. **You write the meta-pattern once, get seven typed convenience macros for free.**

### The \`$d:tt\` trick

\`$d\` matches a token tree (in practice: \`$\`). This solves a famous problem: when you generate a macro inside a macro, you can't just write \`$\` for the inner macro's variables — Rust's macro parser would consume them as the outer macro's metavariables. So \`$d\` is bound to \`$\` and \`$d ($d t:tt)+\` produces \`$ ( $ t:tt )+\` in the generated code. **This is a textbook macro-hygiene workaround.**

### Where compile-time validation lives

The actual hex parsing is delegated to \`$crate::hex!(...)\`, which **is** a procedural macro. \`hex!\` does:
1. Parse the string literal at compile time
2. Validate every character is a hex digit
3. Verify the length matches the target type (20 bytes for \`Address\`, 32 for \`B256\`, ...)
4. Emit a \`[u8; N]\` array literal

If anything fails, you get a **compile error**, not a runtime panic. \`Address::new(...)\` then takes that array and constructs the typed wrapper.

### The empty-input case

\`\`\`rust
() => { $crate::$ty::ZERO };
\`\`\`

\`address!()\` (no args) returns \`Address::ZERO\` — a const. So you can write:

\`\`\`rust
const BURN: Address = address!();
\`\`\`

That's a const-evaluable burn-address constant. Try doing **that** with a runtime parser.

## 4. \`sol!\` — the genuinely procedural macro

\`address!\` is declarative; \`sol!\` is the real procedural macro. It lives in [\`alloy-rs/core/crates/sol-macro\`](https://github.com/alloy-rs/core/tree/main/crates/sol-macro) and:

1. Parses Solidity-like syntax (custom parser, not \`syn::ItemImpl\` — Solidity isn't Rust)
2. For each function: generates a struct, computes the **selector** (first 4 bytes of \`keccak256(signature)\`), and impls ABI encode/decode
3. For each event: computes the **topic0 hash** and impls log decoding
4. For each contract: emits a wrapper struct that takes a \`Provider\` and lets you call methods naturally

When you do:

\`\`\`rust
sol! {
    interface IERC20 {
        function balanceOf(address owner) external view returns (uint256);
        event Transfer(address indexed from, address indexed to, uint256 value);
    }
}

let balance = IERC20::new(token, &provider).balanceOf(owner).call().await?;
\`\`\`

— that \`.balanceOf(owner)\` call is statically typed, the \`uint256\` becomes a real \`U256\`, the selector is computed at compile time, and the ABI encoding is monomorphized. **No reflection, no runtime parsing, no string-typed errors.**

## 5. When to write your own

Build a proc macro when you have:

- **Repeated boilerplate** that compresses neatly into a macro call
- **Compile-time validation** opportunities (like address parsing)
- **DSL ergonomics** worth the engineering investment

Don't build one for "saving 5 lines once."

## 6. Debugging tip

\`cargo expand\` shows you the code your macro generates. **Always** check the expansion when you're stuck.

\`\`\`bash
cargo install cargo-expand
cargo expand --bin my_app
\`\`\`

Now you can read what your macro is producing and pinpoint any wrong codegen.`,
                },
              ],
            },
          },
          {
            title: 'Production Engineering',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Custom precompiles',
                  slug: 'custom-precompiles-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 35,
                  content: `# Custom precompiles

Custom **opcodes** add new EVM instructions. Custom **precompiles** add native-Rust functions that are callable like ordinary contracts. Precompiles are the *less invasive* extension point — and they preserve consensus across most tooling.

## 1. Opcode vs precompile

| | Opcode | Precompile |
| :--- | :--- | :--- |
| **Invocation** | bytecode instruction | \`CALL\` to a special address |
| **Adding** | modifies interpreter | adds an entry in the precompile registry |
| **Tooling impact** | breaks Solidity, ABIs | mostly transparent |
| **Use case** | tight inner loops | heavy operations like pairings, hashing |

Real Ethereum already has precompiles at addresses 0x01–0x0a (ecrecover, sha256, ripemd160, modexp, BN254 ops, BLAKE2F, point eval).

## 2. A real precompile — the identity precompile (0x04)

This is the entire \`identity_run\` from [\`crates/precompile/src/identity.rs\`](https://github.com/bluealloy/revm/blob/main/crates/precompile/src/identity.rs):

\`\`\`rust
use super::calc_linear_cost;
use crate::{
    eth_precompile_fn, EthPrecompileOutput, EthPrecompileResult, Precompile, PrecompileHalt,
    PrecompileId,
};
use primitives::Bytes;

eth_precompile_fn!(identity_precompile, identity_run);

/// Address of the identity precompile.
pub const FUN: Precompile = Precompile::new(
    PrecompileId::Identity,
    crate::u64_to_address(4),
    identity_precompile,
);

/// The base cost of the operation
pub const IDENTITY_BASE: u64 = 15;
/// The cost per word
pub const IDENTITY_PER_WORD: u64 = 3;

/// Takes the input bytes, copies them, and returns it as the output.
pub fn identity_run(input: &[u8], gas_limit: u64) -> EthPrecompileResult {
    let gas_used = calc_linear_cost(input.len(), IDENTITY_BASE, IDENTITY_PER_WORD);
    if gas_used > gas_limit {
        return Err(PrecompileHalt::OutOfGas);
    }
    Ok(EthPrecompileOutput::new(
        gas_used,
        Bytes::copy_from_slice(input),
    ))
}
\`\`\`

That's a production precompile in Ethereum mainnet. Read it line by line:

- **Address** \`u64_to_address(4)\` → \`0x0000…0004\`. The address is part of the \`Precompile::new\` — you don't get to put it anywhere; it's compiled in.
- **Gas formula** \`base + per_word * ceil(len / 32)\`. Linear in input. \`IDENTITY_BASE = 15\`, \`IDENTITY_PER_WORD = 3\` — the real values from the Yellow Paper.
- **Halt vs revert** — \`PrecompileHalt::OutOfGas\` means the entire frame halts with no refund, distinct from a regular revert.
- **\`EthPrecompileOutput\`** carries \`(gas_used, output_bytes)\`.

## 3. Registering custom precompiles

\`\`\`mermaid
sequenceDiagram
    participant C as Contract bytecode
    participant I as Revm interpreter
    participant Reg as Precompiles registry
    participant Fn as Custom precompile fn

    C->>I: CALL 0x00...ff
    I->>Reg: lookup(addr)
    Reg-->>I: Found — Precompile
    I->>Fn: run(input, gas_limit)
    Fn-->>I: Ok(gas_used, output)
    I->>C: returndata + gas refund
\`\`\`

The \`Precompiles\` registry in [\`crates/precompile/src/lib.rs\`](https://github.com/bluealloy/revm/blob/main/crates/precompile/src/lib.rs) has an \`extend\` method designed exactly for this:

\`\`\`rust
pub fn extend(&mut self, other: impl IntoIterator<Item = Precompile>) {
    let iter = other.into_iter();
    let (lower, _) = iter.size_hint();
    self.addresses.reserve(lower);
    self.inner.reserve(lower);
    for item in iter {
        let address = *item.address();
        if let Some(short_idx) = short_address(&address) {
            self.optimized_access[short_idx] = Some(item.clone());
        }
        self.addresses.insert(address);
        self.inner.insert(address, item);
    }
}
\`\`\`

So adding your own is just:

\`\`\`rust
let my_pre = Precompile::new(
    PrecompileId::Custom("my_thing"),
    address!("00000000000000000000000000000000000000ff"),
    my_function,
);
precompiles.extend([my_pre]);
\`\`\`

\`my_function\` follows the same shape as \`identity_run\`: \`fn(&[u8], u64) -> EthPrecompileResult\`. Wire it through your custom Evm builder where the precompile set is loaded.

### The \`optimized_access\` array

Notice the \`optimized_access[short_idx]\` write. For addresses that fit in a small number, Revm uses a flat array instead of a hashmap — **dispatch becomes a single index lookup**. This is why standard precompiles (0x01–0x0a) are essentially free to dispatch.

## 4. Real-world: Foundry's cheatcodes ARE custom precompiles

The most widely-deployed custom precompile in the Rust EVM stack lives in Foundry. Every \`vm.deal\`, \`vm.warp\`, \`vm.prank\` you've ever written in a Solidity test is a **\`CALL\` to a custom precompile**.

From [\`forge-std/src/Base.sol\`](https://github.com/foundry-rs/forge-std/blob/master/src/Base.sol):

\`\`\`solidity
address internal constant VM_ADDRESS = 0x7109709ECfa91a80626fF3989D68f67F5b1DD12D;
\`\`\`

That address is computed as:

\`\`\`solidity
address(uint160(uint256(keccak256("hevm cheat code"))))
\`\`\`

Foundry constructs Revm with **a custom precompile registered at this address** that decodes the calldata as a cheatcode invocation (e.g., the selector for \`deal(address,uint256)\`) and dispatches into Foundry's Rust code. State mutations like "give this account 10 ETH" happen by directly modifying the in-memory Revm DB before continuing execution.

This is **the** production case study for the registration pattern in Section 3:

- Foundry forks the standard precompile set
- Registers an additional entry at \`0x7109...\` pointing to its cheatcode dispatcher
- The dispatcher reads calldata, matches a selector, and runs Rust to mutate the EVM state

If you want to see a production custom-precompile design in detail, read [\`foundry-rs/foundry/crates/cheatcodes\`](https://github.com/foundry-rs/foundry/tree/master/crates/cheatcodes) — it's the same pattern as our example, just at industrial scale (hundreds of cheatcodes, snapshotting, revert support).

## 5. When to reach for a precompile

- A computation is **too expensive in pure EVM bytecode** (BLS pairings, FRI verification, large-radix arithmetic)
- The same operation is needed by **many contracts** on your chain
- You can write a **provably-correct** Rust implementation

Don't add a precompile to save a few opcodes — the design overhead and consensus risk only pay off for genuinely heavy work.

## 6. Pricing

The cardinal rule: **gas cost should track CPU cost** (and ideally a multiple of the worst case). Underprice and an attacker DoSes your chain with a single weird transaction. Real Ethereum has been here multiple times — see the EIP-2929 reset of cold/warm storage costs.

A reasonable workflow:

1. Benchmark your precompile on the slowest realistic input
2. Multiply CPU time by an "abuse factor" (commonly 2–5x)
3. Convert to gas via your chain's gas/CPU ratio
4. Re-benchmark on adversarial inputs

After this, your precompile is cheap to use in normal code and prohibitively expensive to abuse.`,
                },
                {
                  title: 'Merkle Patricia Trie & state proofs',
                  slug: 'mpt-state-proofs-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 40,
                  content: `# Merkle Patricia Trie & state proofs

Ethereum's state lives in a **Merkle Patricia Trie (MPT)**. Understanding it is what lets you reason about state roots, light clients, and witnesses — and write your own.

## 1. What an MPT is

Combine three ideas:

- **Trie**: tree where the path from root to leaf spells the key
- **Patricia**: collapse single-child paths so the trie stays compact
- **Merkle**: each node hashes its children, so the root commits to all data

Result: a **256-bit \`stateRoot\`** that uniquely identifies the entire world state. Change any byte → root changes.

## 2. Node types

\`\`\`
+----------+    Branch (16 children + value)
|  Branch  |    used at points where keys diverge
+----------+

+----------+    Extension (shared prefix)
| Extension|    "the next N nibbles are the same for everyone below"
+----------+

+----------+    Leaf (final value)
|   Leaf   |
+----------+
\`\`\`

Keys are **nibbles** (4 bits each), so a 32-byte key is 64 nibbles. Every node knows its keccak hash.

\`\`\`mermaid
graph TD
    R[Branch — root<br/>16 child slots]
    R -->|nibble| E[Extension<br/>shared prefix]
    R -->|nibble| L1[Leaf<br/>account → value]
    E --> B[Branch]
    B -->|nibble| L2[Leaf<br/>account → value]
    B -->|nibble| L3[Leaf<br/>account → value]
\`\`\`

Each parent stores the **hash** of each child, so the root hash commits to every byte underneath. Change one storage slot anywhere → every parent up to the root rehashes → \`stateRoot\` changes.

## 3. Inclusion proof in 6 steps

To prove "account X has balance Y":

1. Walk from root toward X's key, collecting nodes along the path
2. Each node references its children by **hash**, not pointer
3. The verifier needs only the path nodes, not the whole trie
4. Re-hash the leaf, walk back up rehashing each parent
5. Compare the resulting root to the **trusted \`stateRoot\`**
6. If equal → X really has balance Y

That's it. **Light clients** are just verifiers with the trusted root.

## 4. Witnesses

A **witness** is the set of trie nodes needed to re-execute a block without storing the full state. zkEVM provers consume witnesses; stateless clients use them; some MEV searchers use them for forked simulation.

A typical block witness is a few hundred KB to a few MB.

## 5. Reth's actual proof types

From [\`crates/trie/common/src/proofs.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/trie/common/src/proofs.rs):

\`\`\`rust
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct AccountProof {
    pub address: Address,
    pub info: Option<Account>,
    pub proof: Vec<Bytes>,
    pub storage_root: B256,
    pub storage_proofs: Vec<StorageProof>,
}

impl AccountProof {
    pub const fn new(address: Address) -> Self;
    pub fn verify(&self, root: B256) -> Result<(), ProofVerificationError>;
}

#[derive(Clone, PartialEq, Eq, Default, Debug)]
pub struct StorageProof {
    pub key: B256,
    pub nibbles: Nibbles,
    pub value: U256,
    pub proof: Vec<Bytes>,
}

impl StorageProof {
    pub fn verify(&self, root: B256) -> Result<(), ProofVerificationError>;
}
\`\`\`

This is exactly what flows over JSON-RPC for \`eth_getProof\`. Read it field by field:

### \`AccountProof.proof: Vec<Bytes>\`
The list of trie nodes from root to the account's leaf — encoded as RLP. The verifier walks them in order, hashing each, comparing the result to the parent's child reference, and finally checking the root.

### \`AccountProof.storage_root: B256\`
**The root of the contract's separate storage trie.** As predicted: a two-layer MPT. The account leaf contains this hash; the storage proofs verify against it, not the global \`stateRoot\`.

### \`AccountProof.info: Option<Account>\`
\`None\` if the account doesn't exist (a "non-inclusion" proof). \`Some\` if it does. **Both cases are valid proofs** — proving "this address has no account" is just as important as proving balance.

### \`StorageProof.nibbles: Nibbles\`
Pre-computed nibble representation of the storage key. Reth caches this because nibble conversion is on the hot path.

### \`AccountProof::verify(&self, root: B256)\`
Pure logic — given a trusted state root, verify the proof. **This is the entire light-client check.** A few hundred bytes of bytecode, runs in milliseconds, gives you a cryptographic guarantee about state.

## 6. The pitfall: storage tries

Each contract has its **own** MPT for its storage slots. So the global state has:

\`\`\`
stateRoot
└── account leaf (returned by AccountProof.proof)
    └── storage_root (also stored in AccountProof.info.storage_root)
        └── slot leaves (proven by StorageProof.proof)
\`\`\`

A **two-layer MPT** is exactly what \`AccountProof\` encodes. Forgetting this is the #1 reason "my state proof verifier doesn't work."

## 7. Where to look in Reth

\`\`\`
crates/trie/
├── common/src/proofs.rs  ← AccountProof, StorageProof (above)
├── trie/                  ← the trie data structure itself
├── parallel/              ← parallel trie computation
├── sparse/                ← sparse trie for witness/proof generation
└── db/                    ← MDBX-backed trie
\`\`\`

Read in this order: \`common\` (types) → \`trie\` (data structure) → \`db\` (production glue).

## 8. Drill

1. Open \`crates/trie/common/src/proofs.rs\` in the repo
2. Find the \`verify\` method on \`AccountProof\` — read it
3. Notice it calls \`StorageProof::verify\` for each storage proof in \`storage_proofs\`, with \`storage_root\` (not \`root\`) as the parent
4. Now read [EIP-1186](https://eips.ethereum.org/EIPS/eip-1186) — \`AccountProof\` is the Rust mirror of the spec

Do this and \`eth_getProof\` becomes a structure you can reason about, write, and debug — not magic.`,
                },
                {
                  title: 'MEV in practice — mempool, ExEx, simulation',
                  slug: 'mev-in-practice-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 20,
                  xpReward: 45,
                  content: `# MEV in practice — mempool, ExEx, simulation

MEV (Maximal Extractable Value) is where systems engineering meets game theory. Here's how a serious searcher / builder pipeline is structured in 2026.

## 1. The pipeline

\`\`\`mermaid
flowchart LR
    M[Mempool<br/>ExEx + devp2p] --> D[Decoder<br/>Alloy sol!]
    D --> S[Simulator<br/>Revm + DB]
    S --> St[Strategy<br/>Rust logic]
    St --> B[Bundle Builder<br/>Alloy encode]
    B --> Sub[Submit<br/>Flashbots / direct]
\`\`\`

Each box is a Rust module. Latency budget for the whole loop in production: **< 100 ms** before the next block.

## 2. Mempool ingest

Two paths:

- **Mempool subscription** via Alloy WebSocket (\`pending_transactions\` filter) — easy, slow
- **devp2p directly** — you join the network, receive raw transaction announcements, parse RLP yourself — fastest, hardest

For a serious searcher, devp2p is non-negotiable. Reth exposes it via its networking crates.

## 3. Decoding — the real ExEx pattern

[\`paradigmxyz/reth-exex-examples/op-bridge\`](https://github.com/paradigmxyz/reth-exex-examples/tree/main/op-bridge) is a real production-shaped indexer that decodes contract events from every block. Here's the core decoding pattern, lifted verbatim:

\`\`\`rust
use alloy_sol_types::{sol, SolEventInterface};

sol!(L1StandardBridge, "l1_standard_bridge_abi.json");
use crate::L1StandardBridge::{
    ETHBridgeFinalized, ETHBridgeInitiated, L1StandardBridgeEvents,
};

fn decode_chain_into_events(
    chain: &Chain,
) -> impl Iterator<Item = (...)> {
    chain
        .blocks_and_receipts()
        .flat_map(|(block, receipts)| {
            block.body().transactions_iter()
                .zip(receipts.iter())
                .map(move |(tx, receipt)| (block, tx, receipt))
        })
        .flat_map(|(block, tx, receipt)| {
            receipt.logs.iter()
                .filter(|log| OP_BRIDGES.contains(&log.address))
                .map(move |log| (block, tx, log))
        })
        .filter_map(|(block, tx, log)| {
            L1StandardBridgeEvents::decode_raw_log(log.topics(), &log.data.data)
                .ok()
                .map(|event| (block, tx, log, event))
        })
}
\`\`\`

This is **production-shape MEV decoding**. Three flat_maps:

1. **\`chain.blocks_and_receipts()\`** — every block in the committed chain, paired with its receipts
2. **For each (block, receipt)** — zip transactions with their receipts and flatten
3. **For each (block, tx, receipt)** — filter logs to known bridge addresses, then decode

The final \`filter_map\` is where **\`sol!\`** earns its place. \`L1StandardBridgeEvents::decode_raw_log\` is auto-generated; it tries each variant of the event enum and returns \`Ok(Event)\` on the matching topic0. **No hand-rolled ABI parsing. Type-safe on the way out.**

Then you pattern-match on the typed event:

\`\`\`rust
match event {
    L1StandardBridgeEvents::ETHBridgeInitiated(ETHBridgeInitiated {
        amount, from, to, ..
    }) => {
        // Insert deposit into your DB
    }
    L1StandardBridgeEvents::ETHBridgeFinalized(ETHBridgeFinalized {
        amount, from, to, ..
    }) => {
        // Insert withdrawal into your DB
    }
    _ => continue,
}
\`\`\`

For an MEV searcher, replace "bridge addresses" with "DEX router addresses" and the deposit/withdrawal handlers with "swap detection + sandwich opportunity scoring." **Same shape, different filter set.**

## 4. Simulation

Pre-trade, you simulate against a forked state with Revm. Real shape:

\`\`\`rust
use revm::Evm;
use revm::primitives::{TxKind, U256};

let mut evm = Evm::builder()
    .with_db(forked_db)            // mainnet state at block N
    .with_external_context(())
    .build();

evm.cfg_mut().chain_id = 1;
evm.tx_mut().caller = bot_address;
evm.tx_mut().transact_to = TxKind::Call(target);
evm.tx_mut().data = tx_data;

let result = evm.transact()?;
let profit = compute_profit(&result.state);
\`\`\`

A bundled simulation (your tx + the victim tx + your tx) tells you the realized profit before you pay gas. Hot path; profile aggressively. The \`forked_db\` is typically built on \`AlloyDB\` (which we saw in the Database trait lesson) plus an LRU cache layer so identical reads don't re-hit the network.

## 5. ExEx as a private mempool

ExEx receives **every block** at zero latency. That makes it the perfect place for:

- A custom indexer of DEX trades
- A "warm cache" of pool reserves so simulation doesn't have to re-fetch
- A reorg-aware state diff feed

Your searcher consumes the ExEx feed and spends the saved time on simulation.

## 6. Bundle submission

Two main routes:

| Route | Latency | Privacy |
| :--- | :--- | :--- |
| **Flashbots / MEV-share** | medium | strong (no public mempool) |
| **Direct to a builder** | low | depends on builder |

Bundles are JSON-RPC; the wire format is small. Race between competing searchers is decided in **single-digit milliseconds**.

## 7. Things that will burn you

1. **Reorgs.** Your bundle can land, then disappear. Always reconcile with reality after \`ChainReorged\` notifications in ExEx.
2. **Stale state in the simulator.** Use the *exact* parent block of the slot you're targeting, not "latest."
3. **Gas griefing.** Adversaries publish high-gas transactions just to push yours out. Pay attention to the priority fee curve in real time.
4. **Toxic flow.** Some "opportunities" are sandwich bait. Run a classifier; not all profit is real.

After this lesson, you can read [reth-exex-examples](https://github.com/paradigmxyz/reth-exex-examples) and recognize each component, not as toy code but as the production architecture's skeleton.`,
                },
                {
                  title: 'zkEVM with Revm',
                  slug: 'zkevm-revm-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 15,
                  xpReward: 35,
                  content: `# zkEVM with Revm

A zkEVM proves that "this block was executed correctly" without re-executing it. Revm is the canonical EVM implementation that **provers consume**. Here's how that works.

## 1. The proving stack

\`\`\`mermaid
flowchart TB
    subgraph Host
        RPC[Ethereum RPC] --> Pre[preflight: collect witness]
    end
    Pre -->|Input: header + witness + call| Guest
    subgraph Guest [zkVM guest]
        Verify[verify witness vs stateRoot]
        Verify --> RevmRun[Revm runs the EVM call]
        RevmRun --> Journal[commit block hash + result]
    end
    Guest --> Prover[Proving system<br/>STARK / SNARK]
    Prover --> Proof[Proof + Journal]
    Proof --> Verifier[on-chain verifier contract]
\`\`\`

You compile a normal Rust program (which calls Revm) to **RISC-V**, run it inside a zkVM, and the zkVM emits a proof of correct execution.

## 2. A real guest — Steel + Risc0

This is the entire \`guest/src/main.rs\` from [\`boundless-xyz/steel/examples/erc20-counter\`](https://github.com/boundless-xyz/steel/tree/main/examples/erc20-counter):

\`\`\`rust
use alloy_primitives::U256;
use erc20_counter_core::{IERC20, Input, Journal};
use risc0_steel::{Contract, ethereum::EthChainSpec};
use risc0_zkvm::guest::env;

fn main() {
    // Read the input from the guest environment.
    let input: Input = env::read();

    // Derive the chain spec from the chain ID.
    let chain_spec = EthChainSpec::from_chain_id(input.chain_id).unwrap();

    // Converts the input into a \`EvmEnv\` for execution. It checks that the state matches the state
    // root in the header provided in the input.
    let env = input.evm_input.into_env(chain_spec);

    // Execute the view call; it returns the result in the type generated by the \`sol!\` macro.
    let call = IERC20::balanceOfCall {
        account: input.account,
    };
    let returns = Contract::new(input.erc20_contract, &env)
        .call_builder(&call)
        .call();

    // Check that the given account holds at least 1 token.
    assert!(returns >= U256::from(1));

    // Commit the block hash and number used when deriving \`view_call_env\` to the journal.
    let journal = Journal {
        commitment: env.into_commitment(),
        contract: input.erc20_contract,
    };
    env::commit_slice(&journal.abi_encode());
}
\`\`\`

That's the **entire** zkVM guest. ~25 lines. Read it carefully.

### \`env::read()\`
The guest reads its inputs from the host through a serialized stream. The \`Input\` struct holds: chain ID, target contract address, the EVM input (state proofs the guest will need), and the account to query.

### \`input.evm_input.into_env(chain_spec)\`
This is where the magic is. \`evm_input\` contains a **block header** and a **state witness** (every storage slot the call will touch, with their MPT proofs). \`.into_env(...)\` **verifies the witness against the header's stateRoot** — if a single byte is wrong, this fails. This is what guarantees the prover can't lie about state.

### \`IERC20::balanceOfCall\` (sol!)
The same \`sol!\` macro you saw in MEV — generates the typed call. **The same code that talks to a node over RPC also runs inside the zkVM.** That's the unification: ABI, encoding, type system — all shared between the off-chain world and the in-prover world.

### \`Contract::new(...).call_builder(&call).call()\`
Executes the EVM view call **inside Revm**, against the verified state. Returns a typed \`U256\`. The Revm instance reads through the witness; if it ever asks for a slot that wasn't witnessed, the proof fails.

### \`env::commit_slice(&journal.abi_encode())\`
The "public output" — what the verifier will see. Here, an ABI-encoded \`Journal\` containing a commitment (block hash, block number, stateRoot) and the contract address. Anyone with the proof and this journal can verify: "On Ethereum block N, contract X had user Y holding at least 1 token."

## 3. The host side (preflight)

You don't see the host in that file, but it's the mirror: it talks to a real Ethereum node (via Alloy + a Reth RPC), simulates the call, **collects the witness**, then ships it as \`Input\` to the prover. Steel's host helpers handle the RPC + witness collection so your binary just calls something like:

\`\`\`rust
let input = builder.preflight(&provider, contract, &call).await?;
let env = ExecutorEnv::builder().write(&input)?.build()?;
let receipt = default_prover().prove(env, ERC20_COUNTER_GUEST_ELF)?;
\`\`\`

## 3. Why Revm specifically?

- It's **modular** (Database trait makes the witness/oracle pattern clean)
- It's **deterministic** — every run with the same inputs produces the same outputs
- It's **fast in CPU**, which translates to fewer cycles, which translates to smaller proofs

Geth in Go would be a nightmare to compile and minimize for a zkVM. Revm just works.

## 4. The witness pattern

Inside the prover you can't "read state from disk." Instead, before proving you assemble a **witness**: every state value the block touched. Then your in-zkVM Database impl looks like:

\`\`\`rust
struct WitnessDB {
    accounts: HashMap<Address, AccountInfo>,
    storage: HashMap<(Address, U256), U256>,
    // ...
}

impl Database for WitnessDB {
    fn basic(&mut self, addr: Address) -> ... {
        Ok(self.accounts.get(&addr).cloned())
    }
    // ...
}
\`\`\`

If the block reads something not in the witness, the proof fails. The witness producer (your indexer / Reth ExEx) is therefore *part of the security model*.

## 5. Performance reality

Proving a single Ethereum block in 2026:

| System | Approx. proving time (single block) | Hardware |
| :--- | :--- | :--- |
| **Risc0** | seconds–minutes | GPU |
| **SP1** | seconds | GPU + recursion |
| **Custom zkEVM (Linea, Scroll)** | sub-second per block | dedicated infra |

Generic zkVMs (Risc0/SP1) trade some prover speed for **flexibility** — they can prove *any* Rust program, not just EVM. Custom zkEVMs are faster but rebuild the whole stack from scratch.

## 6. Why this matters

- **L2s using zkEVM** rely on this pipeline (Linea, zkSync, Scroll, Polygon zkEVM)
- **Optimistic rollups** are migrating toward "validity proofs as fast finality"
- **Stateless clients** could let you sync without holding state — relying on witnesses + proofs

Reading [risc0/risc0-ethereum](https://github.com/risc0/risc0-ethereum) is the most direct path to understanding zk + Revm in production.

## 7. Practice

Before claiming familiarity, write the smallest possible host/guest pair:

1. Guest reads two integers, returns their sum
2. Host generates and verifies the proof
3. Modify the guest to call Revm on a 1-tx block
4. Compare guest cycle counts before/after — that's where the perf engineering lives

Now you know what "L2 prover" actually does.`,
                },
                {
                  title: 'Running a Reth fork in production',
                  slug: 'reth-fork-production-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 18,
                  xpReward: 40,
                  content: `# Running a Reth fork in production

You've built a custom fork. Now you have to run it without it eating your weekend. This lesson is the operations checklist.

## 1. Build & release pipeline

\`\`\`bash
# Reproducible release builds
RUSTFLAGS="-C target-cpu=native -C codegen-units=1" \\
  cargo build --release --features jemalloc,asm-keccak

strip target/release/reth   # or use objcopy for separated debug
\`\`\`

| Flag | Why |
| :--- | :--- |
| \`-C target-cpu=native\` | use AVX2/AVX512 if your validators have it |
| \`codegen-units=1\` | better optimization at the cost of build time |
| \`features = [jemalloc]\` | tail-latency stability under load |
| \`features = [asm-keccak]\` | hand-tuned assembly for keccak — measurable on hot path |

## 2. Systemd unit (or equivalent)

\`\`\`ini
[Service]
ExecStart=/usr/local/bin/reth node --chain custom --datadir /var/lib/reth
Restart=on-failure
LimitNOFILE=1048576
LimitNPROC=infinity
TasksMax=infinity
\`\`\`

The file-descriptor limit matters: Reth holds many MDBX pages and many P2P connections.

## 3. Storage discipline

- **Separate volumes** for DB and logs. Never let logs fill the DB partition.
- **NVMe SSDs only**. Spinning rust will not keep up with execution.
- **Snapshot regularly**. \`reth db checkpoint\` (or filesystem-level snapshots if you can pause writes).
- **Plan for growth**. Reth's full state is hundreds of GB and growing.

## 4. Monitoring

What to alert on:

| Metric | Alert if |
| :--- | :--- |
| Sync lag (head vs network) | > N blocks for > N minutes |
| Peer count | < 5 |
| MDBX free pages | < 5% |
| Process RSS | trending up monotonically |
| Block import time | p99 > target |
| ExEx height behind tip | depends on ExEx |

Reth exposes Prometheus metrics out of the box; wire them to Grafana with **alerting on rates of change**, not just absolute values.

## 5. Diff testing

If your fork modifies execution, run **continuous diff testing** against vanilla Reth on the same blocks:

\`\`\`bash
# Pseudo-code for a diff harness
for block in mainnet[recent_1000]:
    s1 = reth_vanilla.execute(block)
    s2 = reth_fork.execute(block)
    if s1.stateRoot != s2.stateRoot:
        alert("divergence at block", block, s1, s2)
\`\`\`

Any unintended divergence — even one storage slot — means a consensus bug. **Bug = chain halt** for an App-chain.

## 6. Deployment topology for an App-chain

Minimum:

- ≥ 4 validators in **3 datacenters**
- 2 sentries in front of each validator
- A separate **archive node** (not a validator) for analytics queries
- A separate **RPC fleet** with rate-limiting and a CDN

Don't run the validator and the public RPC on the same machine. One DDoS and your chain stalls.

## 7. Upgrade procedure

The hardest part of running a fork is **upgrading** it without halting the chain.

1. Announce a target block height for activation
2. Ship the new binary to validators with a config flag, NOT enabled
3. At the activation block, the consensus rule changes — guarded by the height check
4. Validators that haven't upgraded fall off — that's why height-gating + announcement matters

This is exactly how Ethereum hard forks work; an App-chain is no different, just smaller scale.

## 8. Reading list

- [Reth Book "Run a node" + "Custom chain"](https://reth.rs/) sections
- The validator ops post-mortem from any major chain incident — they're gold for ops intuition

You now have a complete picture: develop, profile, extend, deploy, monitor. Welcome to the small club.`,
                },
                {
                  title: 'Expert quiz',
                  slug: 'expert-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 5,
                  duration: 15,
                  xpReward: 50,
                  content: `# Expert quiz

A final stress test on the production engineering layer.`,
                  quizQuestions: [
                    {
                      question: 'Why does Reth use MDBX instead of RocksDB?',
                      options: [
                        'MDBX is written in Rust',
                        'MDBX has predictable read latency (no LSM compaction stalls), ~1x write amplification, and lock-free reads via mmap+MVCC',
                        "RocksDB doesn't support transactions",
                        'MDBX has built-in Ethereum support',
                      ],
                      correctIndex: 1,
                      explanation: 'Ethereum is read-heavy and latency-sensitive. MDBX (B+tree + mmap + MVCC) gives predictable latency and lock-free reads. RocksDB (LSM tree) has compaction-induced tail latency that hurts validators and sync.',
                    },
                    {
                      question: 'When optimizing Rust performance, what should always come first?',
                      options: [
                        'Switch to unsafe Rust',
                        'Use a faster allocator',
                        'Profile (e.g., flamegraph) and benchmark (Criterion) to identify the actual hot path',
                        'Rewrite hot loops in inline assembly',
                      ],
                      correctIndex: 2,
                      explanation: 'Premature optimization is bad; invisible slowdowns are worse. Profile first to find where time is actually spent, benchmark to verify changes — then optimize.',
                    },
                    {
                      question: "What's the right way to do CPU-bound work inside a Tokio runtime?",
                      options: [
                        'Just .await the function',
                        'Use tokio::task::spawn_blocking to run it on a separate threadpool',
                        'Block the async task — the runtime will figure it out',
                        "Spawn many tokio::spawn copies and hope it's fast",
                      ],
                      correctIndex: 1,
                      explanation: 'Async runtimes are sized for concurrency, not CPU work. Blocking an async worker starves all other tasks. spawn_blocking moves the work to a dedicated threadpool.',
                    },
                    {
                      question: 'When does a procedural macro run?',
                      options: [
                        'At runtime, every time the macro call is reached',
                        'At compile time, transforming a TokenStream into another TokenStream',
                        'Inside the linker',
                        'At install time during cargo install',
                      ],
                      correctIndex: 1,
                      explanation: 'Procedural macros (function-like, derive, attribute) run during compilation. They take a TokenStream and emit a TokenStream. cargo expand shows the result.',
                    },
                    {
                      question: 'What is the key difference between a custom opcode and a custom precompile in Revm?',
                      options: [
                        'Opcodes are slower than precompiles',
                        'Opcodes modify the EVM instruction set (breaking standard tooling); precompiles add native functions called via CALL to a special address (mostly transparent to tooling)',
                        'Precompiles only work on L2s',
                        'They are the same thing',
                      ],
                      correctIndex: 1,
                      explanation: 'Opcodes are bytecode-level instructions and break consensus with vanilla EVM. Precompiles are native functions invoked via CALL — Solidity/ABIs continue to work, only the chain knows about them.',
                    },
                    {
                      question: 'Why does Ethereum use a Merkle Patricia Trie (MPT) for state?',
                      options: [
                        "It's the fastest data structure",
                        'It commits to the entire world state in a single 32-byte hash, supports inclusion proofs, and is space-efficient via path compression',
                        'It was the only option in Solidity',
                        'It uses less RAM than other tries',
                      ],
                      correctIndex: 1,
                      explanation: 'MPT combines a trie (key-as-path) with Patricia (path compression) and Merkle hashing (root commits to all data). The 32-byte stateRoot uniquely identifies the entire state and supports light-client proofs.',
                    },
                    {
                      question: 'In a production zkEVM proving pipeline using Revm, what is a "witness"?',
                      options: [
                        'The wallet that signed the transaction',
                        'The set of state values the block accessed (accounts, storage, code) that the prover consumes since it cannot read disk',
                        'A network observer node',
                        'A signature collected from validators',
                      ],
                      correctIndex: 1,
                      explanation: 'Inside a zkVM you cannot do disk I/O. The witness is a precomputed snapshot of all state values the block reads. The in-prover Database trait serves these. If the block reads anything not in the witness, the proof fails.',
                    },
                    {
                      question: 'For an MEV searcher, why is ExEx valuable?',
                      options: [
                        'It guarantees inclusion in the next block',
                        'It receives every chain commit/reorg notification at near-zero latency, in-process — perfect for warm caches and fast simulation',
                        'It is cheaper than running a node',
                        'It writes directly to the mempool',
                      ],
                      correctIndex: 1,
                      explanation: 'ExEx fires immediately on chain events with full state access in the same process. Searchers use it for warm pool caches, reorg-aware state diffs, and to skip a network round-trip in their simulation pipeline.',
                    },
                    {
                      question: 'What is the cardinal rule when pricing a custom precompile?',
                      options: [
                        'Match Bitcoin transaction fees',
                        'Gas cost should track CPU cost, often with a 2–5x abuse factor, validated against worst-case adversarial inputs',
                        'Use the same gas as the cheapest opcode',
                        'Set it to zero so it gets adopted',
                      ],
                      correctIndex: 1,
                      explanation: 'Underpriced precompiles enable DoS attacks. Benchmark on slowest realistic input, multiply by an abuse factor, then verify on adversarial inputs. Real Ethereum has had to retrofit pricing (EIP-2929) precisely because this was missed.',
                    },
                    {
                      question: 'For a custom Reth fork running an App-chain, what is the minimum production deployment?',
                      options: [
                        'A single validator on a developer\'s laptop',
                        '≥4 validators across 3 datacenters with sentries, separate archive nodes, and a rate-limited RPC fleet — never co-locating validator and public RPC',
                        'Two validators behind one load balancer',
                        'Any cloud VM auto-scaler',
                      ],
                      correctIndex: 1,
                      explanation: 'BFT safety needs a quorum across failure domains. Sentries shield validators from DDoS. Archive nodes serve heavy queries. Co-locating validator and public RPC means one DDoS halts your chain.',
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
