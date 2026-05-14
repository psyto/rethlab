import { PrismaClient } from '@prisma/client';

export async function seedRethExpertEN(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'expert', 'performance', 'mdbx', 'mev', 'zkvm'];

  await prisma.course.create({
    data: {
      slug: 'reth-expert-en',
      title: 'Reth Expert — Production Engineering',
      description:
        'Hardcore systems work: profiling and cache-aware Rust, MDBX storage internals, Tokio runtime, procedural macros, custom precompiles, Merkle Patricia Trie, MEV in production, zkEVM, shipping a custom Reth fork, and reading Reth-based chains (op-stack, alphanet, Tempo) via the extension pattern.',
      difficulty: 'EXPERT',
      duration: 290,
      xpReward: 815,
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

A Reth fork ships. Block import was 12ms in your benches; in production it's 80ms. Where did the 68ms go? You don't know — because nobody profiled. This is the failure mode this lesson exists to prevent: **invisible slowdowns**, the kind that compound silently until a validator falls 200 blocks behind.

If you're going to ship a Reth fork or write hot-path code in Revm, **profiling and benchmarking are non-negotiable**. Premature optimization is bad; *invisible* slowdowns are worse.

> 🛑 **Predict before scrolling.** A junior engineer says "the node feels slow, let me try replacing the HashMap with a BTreeMap." **List 3 things wrong with that approach** before reading the lesson. Hold your list.

## 1. Profile first, optimize second

The discipline: never optimize anything you haven't measured. Two tools cover the two questions you'll ever ask:

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

> 🛑 **Anti-fluency.** Your Criterion bench shows function X is 20% faster after a change. Is the **node** 20% faster? Why might it not be? Be specific — name two reasons a microbench can lie about real-world impact.

## 2. Cache lines, not lines of code

On a modern CPU, reading from RAM is ~100x slower than doing arithmetic on a register. So "make the code shorter" is the wrong knob — **make the memory layout friendlier** is the right one. The unit the CPU actually loads is a **64-byte cache line** (not a byte, not a struct field — a fixed 64-byte chunk).

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

> 🛑 **Predict.** You have a million-element \`Vec<Row>\`. You iterate, summing only \`row.id\`. The big_blob is never read. **How much memory does the CPU actually load through cache?** Why?

## 3. Allocator choice

Every \`Vec::push\` and \`Box::new\` eventually calls into the global allocator. Which allocator you use changes the latency distribution — not the throughput, the **tails**. Reth picks **jemalloc** (Facebook's allocator, now under the tikv-jemallocator crate) over the system default (glibc malloc on Linux) because jemalloc keeps p99 stable under heavy fragmentation.

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

> 🛑 **Anti-fluency.** Where exactly does jemalloc save the 10-30%? **Average** latency or **tail** latency? Under what kind of load does the gap widen? If your answer is just "it's faster," you don't yet understand allocator design — re-read.

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

> 🛑 **Predict.** Why would you NEVER use \`maxperf\` for daily development builds? Be specific about the cost. (Hint: \`codegen-units = 1\` and \`lto = "fat"\` together — what do they do to the compiler?)

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

> Final check: revisit your "junior engineer wants to swap HashMap for BTreeMap" prediction from the top. Did you cite measurement, profiling, and re-verification? If you cited "well, BTreeMap is sometimes slower" — that's also wrong reasoning, just on the other side. **The point isn't which container; the point is that the question is unanswerable without data.**

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

Every account balance, every storage slot, every receipt — Reth keeps all of it in **one** key-value store: **MDBX**. Not Postgres, not RocksDB, not a custom format. MDBX is a memory-mapped B+tree (a balanced tree where each node holds multiple keys to fit a disk page) descended from LMDB. The whole 500GB database is exposed to your Rust code as if it were a giant in-memory slice — the OS handles the disk-vs-RAM dance through mmap.

Understanding MDBX is what separates "I can use Reth" from "I can extend Reth."

> 🛑 **Predict before scrolling.** RocksDB is the dominant KV store in many blockchain clients (geth, erigon historically). **Why does Reth pick MDBX instead?** Form a hypothesis citing one of: write throughput, read latency, crash safety, mmap, compaction. Hold your guess.

## 1. Why MDBX (not LevelDB / RocksDB)?

| Feature | RocksDB | MDBX |
| :--- | :--- | :--- |
| **Architecture** | LSM tree | **B+tree, mmap'd** |
| **Read latency** | Variable (compactions) | **Predictable** |
| **Write amplification** | High | **~1x** |
| **Crash safety** | Manual flush | **ACID via MVCC** |
| **Read concurrency** | Locks | **Lock-free reads** |

Reth picks MDBX because Ethereum is **read-heavy** and **latency-sensitive**. LSM trees (the log-structured-merge design RocksDB and LevelDB use — fast writes, periodic background rewrites) do well at writes but **stall on compactions** — the moments where they pause everything to rewrite tiers — and those stalls are fatal for sync speed and validator latency.

> 🛑 **Anti-fluency.** What is a **compaction** in an LSM tree? Why does it stall reads? B+tree doesn't compact — what does it do instead to reclaim space? If you can't answer in two sentences each, you're trusting the table without understanding it.

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

> 🛑 **Predict.** Why does this trait have **two** associated types (\`TX\` and \`TXMut\`) instead of one? What invariant does the split enforce that a single \`Tx\` type couldn't?

Read this carefully:

- **Two associated transaction types** — \`TX\` (read-only) and \`TXMut\` (read-write). Different methods on each. The split prevents you from accidentally calling \`put\` on a read transaction at compile time.
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

> 🛑 **Predict.** You call \`append\` with a key that's *smaller* than the current max. What happens? Crash? Silent corruption? Error? Why is it on you (not MDBX) to enforce the invariant? If you can't answer, you don't yet understand why \`append\` is faster — re-read.

### Cursors

For range scans, you use a **cursor** instead of repeated \`get\` calls. A cursor positions itself in the B+tree once and walks neighboring entries — orders of magnitude faster than independent gets, because adjacent keys likely share the same page.

> 🛑 **Anti-fluency.** Why is a cursor so much faster than N independent \`get\`s for adjacent keys? The answer involves **B+tree structure** AND **page cache locality**. Name both, in two sentences.

### \`disable_long_read_transaction_safety\`

A real-life ergonomic detail. Long read tx blocks GC, which grows the DB. Reth normally aborts read txs that have been open too long. Set this when you **really** need a long snapshot (and accept the cost).

## 4. Why this matters for hot paths

Because reads are mmap'd:

- A "warm" header lookup is a **pointer dereference**, not a syscall
- The OS page cache becomes your read cache for free
- **Locality matters**: keep related data on the same page

Reth's tables are designed so that Execution-stage reads (account → storage → code) hit pages that are already warm.

## 5. Pitfalls

1. **Long read transactions block writers' garbage collection.** Don't keep a read tx open for hours; the DB grows.
2. **Page size and key ordering matter.** B+tree fanout depends on key size; a 200-byte key is a different beast than a 32-byte one.
3. **mmap means OS pressure.** A 500GB DB on a 16GB machine will thrash unless your access pattern is local.

## Drill

Open [\`crates/storage/db-api/src/tables\`](https://github.com/paradigmxyz/reth/tree/main/crates/storage/db-api/src/tables) in the repo:

> 🛑 **Before opening, predict.** What's the key/value of the \`Headers\` table? \`Transactions\`? \`PlainAccountState\`? Make a guess. Then verify.

1. Find the \`Headers\` table — note its key (\`BlockNumber\`) and value (\`Header\`)
2. Find a \`DupSort\` table — these are tables where one key has multiple values. **Why does \`DupSort\` exist? What kind of data needs it?**
3. Trace one Execution-stage read through: which tables does it consult, in what order?

You'll come out the other side knowing where every byte of Ethereum state lives in Reth.

> Final check: in one sentence, why does mmap let you treat a 500GB DB like a Rust slice? **Where does the OS fit in?** If you can't explain the page-fault → page-load mechanism, the "pointer dereference, not syscall" claim is words to you, not understanding.`,
                },
                {
                  title: 'Tokio runtime internals',
                  slug: 'tokio-internals-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 40,
                  content: `# Tokio runtime internals

You've been writing \`#[tokio::main]\` and sprinkling \`.await\` over every async call. Reth has 200+ of those scattered through its codebase, and at peak load it handles thousands of concurrent peer connections plus dozens of background tasks on **8 worker threads**. No magic; just a state machine the compiler wrote for you, a work-stealing scheduler, and an epoll loop. This lesson is what's underneath the \`.await\`.

> 🛑 **Predict before scrolling.** You write \`async fn foo() { bar().await; }\`. The compiler generates *something* concrete. **What?** Specifically:
> - What trait does the resulting type implement?
> - What's the runtime cost vs a plain function call?
> - Where do local variables live across an \`await\` point?
>
> If any answer is fuzzy, this lesson is what you need.

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

The problem: 8 worker threads, thousands of tasks. How do you distribute them without all 8 threads fighting over one shared queue? Tokio's answer: give each worker its own **local queue** (cheap, no contention), plus a fallback **global queue**. When a worker runs dry, it **steals** tasks from a busy neighbor's queue.

\`\`\`
Worker A: [task1, task2, task3, task4]   ← busy
Worker B: []                              ← idle, steals from A
Worker A: [task1, task2]
Worker B: [task3, task4]
\`\`\`

This avoids contention on a global mutex while still balancing load.

> 🛑 **Anti-fluency.** Without work-stealing, what's the alternative for distributing tasks across workers? Why is it worse? (Hint: think about a global mutex on a single shared queue, hot under contention.)

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

> 🛑 **Predict.** You ignore the rule. You call \`expensive_sync_calc()\` directly inside an async fn. The node runs. **What's the symptom in production?** Be specific — what would Prometheus / your dashboard show? How would oncall discover this? (Hint: it's not a crash.)

## 4. Channels — picking the right one

| Channel | Use |
| :--- | :--- |
| \`tokio::sync::mpsc\` | many producers, one consumer |
| \`tokio::sync::broadcast\` | one producer, many consumers (e.g., chain events) |
| \`tokio::sync::watch\` | latest-value broadcast (e.g., latest block) |
| \`tokio::sync::oneshot\` | a single value, request-response |

ExEx uses **broadcast** for chain notifications because every ExEx wants every event.

> 🛑 **Anti-fluency.** Why doesn't ExEx use \`mpsc\`? With \`mpsc\`, what happens to event delivery if you have 3 ExExes registered? Spell out the failure mode \`broadcast\` prevents.

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

> 🛑 **Predict.** You spawn a background "verify pruner state" task with \`spawn_task\`. Six weeks later it panics on a corrupted entry. Reth keeps running. **What's the user-visible symptom?** Why is "fail loudly" better than "fail silently" for infra?

This is real production discipline: you don't want a silently-dead background task to leave your node running in a degraded state. **Critical tasks fail loudly.**

The \`TaskExecutor = Runtime\` alias lets you pass it through stage code without dragging in raw Tokio types — clean abstraction with the safety net underneath.

## 7. Reading list

- \`tokio/tokio/src/runtime/scheduler/multi_thread_alt\` — the modern multi-thread scheduler
- \`reth/crates/tasks/src/runtime.rs\` — Reth's task supervisor wrapping Tokio

> Final check: in one sentence, what's the difference between \`async fn\` and \`fn\` *as Rust types*? If your answer is "one returns a Future and one doesn't," go deeper — what *is* a Future, structurally? **The lesson isn't done with you until "Tokio is magic" becomes "Tokio polls compiler-generated state machines on a work-stealing scheduler."**`,
                },
                {
                  title: 'Procedural macros — how `sol!` and `address!` work',
                  slug: 'procedural-macros-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 15,
                  xpReward: 35,
                  content: `# Procedural macros — how \`sol!\` and \`address!\` work

\`address!("0xabc...")\` looks like a function call but **runs at compile time**. So does \`sol! { contract IERC20 { ... } }\`.

> 🛑 **Predict before scrolling.** When you write \`address!("0xabc123...")\`:
> - **Where** does the hex parsing happen — at compile time, or at runtime?
> - If compile-time, **what tool** in the Rust compiler does it?
> - What error do you get if you write \`address!("0xZZZ")\`?
>
> Hold your guesses. The lesson has at least one surprise about \`address!\` that disagrees with the common explanation.

## 1. The three kinds

| Kind | Looks like | Example |
| :--- | :--- | :--- |
| **Function-like** | \`my_macro!(...)\` | \`address!\`, \`sol!\` |
| **Derive** | \`#[derive(MyTrait)]\` | \`#[derive(Serialize)]\` |
| **Attribute** | \`#[my_attr]\` | \`#[tokio::main]\` |

All three live in crates marked \`crate-type = ["proc-macro"]\` in their Cargo.toml. The compiler loads such a crate as a plugin and calls functions inside it that take a \`TokenStream\` (the parsed-but-not-yet-typechecked tokens of the macro's input) and return another \`TokenStream\` (what the compiler will continue compiling in its place).

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

Here's what's surprising: **\`address!\` is not a procedural macro at all.** It's a regular \`macro_rules!\` declarative macro.

> 🛑 **If \`address!\` is just declarative, what does it delegate to that IS procedural?** Predict — read the source below to verify.

Here's the real source from [\`crates/primitives/src/bits/macros.rs\`](https://github.com/alloy-rs/core/blob/main/crates/primitives/src/bits/macros.rs):

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

> 🛑 **Anti-fluency.** If you removed the \`$d:tt\` trick and wrote a literal \`$\` inside the inner macro, what error would the compiler give? (Hint: it's not "syntax error" — it's about which macro owns the metavariable.) If you can't predict the error class, the trick is just folklore to you.

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

> 🛑 **Predict.** The selector for \`balanceOf(address)\` is \`0x70a08231\` — the first 4 bytes of \`keccak256("balanceOf(address)")\`. **At what point in the build is the keccak hash computed?** If your answer is "at runtime, the first time you call .balanceOf," re-read — that's exactly the runtime cost \`sol!\` eliminates.

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

Now you can read what your macro is producing and pinpoint any wrong codegen.

> Final check: explain in one sentence the difference between \`macro_rules!\` and a procedural macro. If your answer is just "one's older," go deeper — what does each operate on, and where does each run? **The Rust ecosystem is built on this distinction; without it, you can't read the code that builds your binary.**`,
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

You want SHA-256 inside the EVM. Two roads: add a new **opcode** (a new byte in the instruction stream — \`SHA256\` next to \`ADD\`), or add a **precompile** (a native Rust function the EVM calls when a contract does \`CALL 0x00...02\`). Real Ethereum picked the second: precompiles at addresses \`0x01\` through \`0x0a\` cover ecrecover, sha256, modexp, and the BN254 elliptic-curve ops. Foundry's cheatcodes (\`vm.deal\`, \`vm.warp\`) are the same trick at industrial scale.

Custom opcodes break consensus with every wallet, indexer, and Solidity compiler on the planet. Custom precompiles **don't**. This lesson is why the answer is different, and how to register one.

> 🛑 **Predict before scrolling.** A custom *opcode* breaks consensus with mainnet (you saw this in Advanced). A custom *precompile* doesn't — even though it's also new code that didn't exist in vanilla EVM. **Why is the answer different?** Form a hypothesis citing the EVM bytecode parser. Hold your guess.

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

> 🛑 **Predict.** You CALL the identity precompile with 1 KB of input. **Compute the gas cost.** Show your work: how many words, what's the formula, what's the answer? If you can't, the gas math is just numbers to you — calculate it now.

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

> 🛑 **Predict before reading.** \`vm.deal(addr, 1 ether)\` mutates state — gives an arbitrary account ETH out of thin air. **Standard precompiles can't mutate state** (look at \`identity_run\` — pure function, input → output). So how does Foundry implement \`vm.deal\`? Form a hypothesis.

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

After this, your precompile is cheap to use in normal code and prohibitively expensive to abuse.

> Final check: you ship a precompile at gas cost = 100. An attacker discovers an input shape that takes **10x normal CPU time** at the same 100 gas. **What's the economic attack? How much does it cost the attacker per second of node CPU?** If you can't sketch the math, you can't safely price a precompile — re-read Section 6 and Ethereum's EIP-2929 for what real underpricing has cost mainnet.`,
                },
                {
                  title: 'Merkle Patricia Trie & state proofs',
                  slug: 'mpt-state-proofs-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 40,
                  content: `# Merkle Patricia Trie & state proofs

A phone-sized device wants to know "does Alice's account hold 1 ETH?" — and it cannot store Ethereum's 500GB state. So it asks a full node, which sends back **a few hundred bytes**. The phone runs a hash loop, compares the result to **32 trusted bytes** it already knows, and gets a cryptographic answer: yes or no. That's a light client. The 32 trusted bytes are Ethereum's **stateRoot**, and the data structure that makes this work is the **Merkle Patricia Trie (MPT)**.

Understand the MPT and you understand state roots, light clients, witnesses, \`eth_getProof\`, and the entire stateless-client roadmap. You can also write your own.

> 🛑 **Predict before scrolling.** You want to cryptographically prove "account X has balance Y" — to a verifier who **doesn't have the full state**, only a 32-byte trusted root. **Sketch your protocol.** What do you send the verifier? What do they hash? How do they conclude proof or rejection?
>
> Write 3-4 lines. Then read the lesson and find what you missed.

## 1. What an MPT is

Combine three ideas:

- **Trie**: tree where the path from root to leaf spells the key
- **Patricia**: collapse single-child paths so the trie stays compact
- **Merkle**: each node hashes its children, so the root commits to all data

Result: a **256-bit \`stateRoot\`** that uniquely identifies the entire world state. Change any byte → root changes.

> 🛑 **Anti-fluency.** Patricia's path-compression is an optimization. **What's the cost if you skip it** and use a plain trie? Why does Ethereum care enough to add the complexity? (Hint: think about a 64-nibble key with mostly-empty trie. How many nodes does the path traverse with vs without compression?)

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

> 🛑 **Predict.** You receive a witness for account X — a list of trie node bytes. The verifier hashes back up to the root. **What does the verifier need that's NOT in the witness?** What's the verifier's only secret/trusted input? If you can't answer, you don't yet understand what makes this *cryptographic* (not just "I trust the bytes you sent me").

## 4. Witnesses

A **witness** is the bundle of trie nodes you need to *re-execute a block* without holding the whole state. Instead of "give me the 500GB DB," you ask "give me only the parts this block touched." zkEVM provers consume witnesses (they cannot read disk inside a zkVM). Stateless clients use them (so they can verify without syncing). Some MEV searchers use them for forked simulation.

A typical block's witness is a few hundred KB to a few MB.

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

> 🛑 **Predict.** When is a non-inclusion proof useful in practice? Name a concrete scenario where you'd want to prove "this address has NEVER held tokens." (Hint: airdrops, sybil resistance, slashing eligibility — pick one and trace the protocol.)

### \`StorageProof.nibbles: Nibbles\`
Pre-computed nibble representation of the storage key. Reth caches this because nibble conversion is on the hot path.

### \`AccountProof::verify(&self, root: B256)\`
Pure logic — given a trusted state root, verify the proof. **This is the entire light-client check.** A few hundred bytes of bytecode, runs in milliseconds, gives you a cryptographic guarantee about state.

## 6. The pitfall: storage tries

> 🛑 **Predict.** Why does each contract have its **own** storage MPT? What if Ethereum used one giant MPT keyed by \`(contract, slot)\`? Spell out the trade-off.

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

Do this and \`eth_getProof\` becomes a structure you can reason about, write, and debug — not magic.

> Final check: in two sentences, explain why a state proof gives a stronger guarantee than "trust me, I'm a node operator." What property does Merkle hashing give you that a non-cryptographic claim cannot? **The lesson isn't done with you until you can argue this convincingly to someone who has never used a light client.**`,
                },
                {
                  title: 'MEV in practice — mempool, ExEx, simulation',
                  slug: 'mev-in-practice-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 20,
                  xpReward: 45,
                  content: `# MEV in practice — mempool, ExEx, simulation

A pending tx hits the mempool. 80 milliseconds later, your bundle either landed or it didn't — beaten by a competing searcher who decoded the same tx 5ms faster, simulated the outcome 10ms faster, and submitted to the same builder 2ms ahead. MEV (Maximal Extractable Value — the profit a tx-orderer can pull out of pending transactions) is **systems engineering meeting game theory** at single-digit-millisecond timescales. This lesson is the shape of a serious 2026-era pipeline.

> 🛑 **Predict before scrolling.** Ethereum block time is 12 seconds. **Yet a serious MEV pipeline targets <100ms end-to-end.** Why is the budget that tight? What eats the other ~11.9 seconds? Form a hypothesis citing competition, network propagation, or block proposer timing.

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

> 🛑 **Anti-fluency.** Three nested \`flat_map\`s. Could you collapse them into one \`fold\`? Why did the author stack them this way? (Hint: think about iterator laziness and where filter happens — early or late.)

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

> 🛑 **Predict.** You simulate against \`latest\` instead of the parent of your target slot. **What goes wrong?** Be specific — what does your simulator see that the real block won't? (Hint: the victim tx in your bundle has already executed in your sim's "latest" view.)

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

> Final check: your bundle landed in block 1000. The chain reorgs and block 1000 is replaced. **Where is your money — your ETH, the victim's ETH, the gas you paid?** Trace the P&L through the reorg. If you can't, you don't yet understand why the ChainReverted handler exists in ExEx — re-read the Advanced ExEx lesson.`,
                },
                {
                  title: 'zkEVM with Revm',
                  slug: 'zkevm-revm-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 15,
                  xpReward: 35,
                  content: `# zkEVM with Revm

Linea, zkSync, Scroll, Polygon zkEVM — every production zkEVM rollup makes the same claim: "the verifier doesn't trust us, the verifier checks a 250-byte proof and that's it." No re-execution. No "trust the operator." A 32-byte commitment, a SNARK or STARK, and a smart contract that says yes or no.

The thing producing the proof is called a **prover**. The prover doesn't run geth, doesn't run nethermind — it runs **Revm**, the Rust EVM, compiled to RISC-V (a clean reduced-instruction-set CPU architecture that zkVMs can model cheaply) and executed inside a zkVM. This lesson is why Revm specifically, and what the prover-side code actually looks like.

> 🛑 **Predict before scrolling.** Risc0 and SP1 use **Revm**, not geth, to prove Ethereum execution inside their zkVMs. **List 3 properties of Revm** that make it the right choice for in-zkVM use. (Hint: think about what a zkVM punishes — non-determinism, syscalls, large binaries, dynamic dispatch. Revm earns its place by being friendly to all of those.)

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

> 🛑 **Anti-fluency.** "If a single byte is wrong, this fails." **HOW does the verifier know it's wrong?** What's the exact mechanism — what does the verifier compare to what? You learned this in the MPT lesson; recall it without scrolling. If you can't, you don't yet understand why the proof is *cryptographic*.

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

> 🛑 **Predict.** An attacker submits an Input where the witness has correct state for everything *except* one storage slot the call needs. **Where in the guest does it abort?** What's the failure visible to the prover? Be specific — name the line.

## 5. Performance reality

Proving a single Ethereum block in 2026:

| System | Approx. proving time (single block) | Hardware |
| :--- | :--- | :--- |
| **Risc0** | seconds–minutes | GPU |
| **SP1** | seconds | GPU + recursion |
| **Custom zkEVM (Linea, Scroll)** | sub-second per block | dedicated infra |

Generic zkVMs (Risc0/SP1) trade some prover speed for **flexibility** — they can prove *any* Rust program, not just EVM. Custom zkEVMs are faster but rebuild the whole stack from scratch.

> 🛑 **Predict.** A custom zkEVM (Linea, Scroll) is **orders of magnitude faster per block** than Risc0. **Why would anyone use Risc0 anyway?** Name two production scenarios where the genericity is worth the slowdown.

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

Now you know what "L2 prover" actually does.

> Final check: in two sentences, explain what makes a zk proof of EVM execution **trustless** — versus a node operator just claiming "I ran the block, here's the result." If your answer doesn't reference the verifier-side check (commitment + recomputation in the verifier contract), the lesson isn't done with you.`,
                },
                {
                  title: 'Running a Reth fork in production',
                  slug: 'reth-fork-production-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 18,
                  xpReward: 40,
                  content: `# Running a Reth fork in production

It's 3am. Your validator stopped producing blocks 40 minutes ago. The dashboard shows: file-descriptor exhaustion, MDBX page-cache pressure, peer count at 2. None of these would have shown up in unit tests. None of them would have shown up the day you shipped. They show up at month 3, all at once. This lesson is the **ops checklist** that prevents that 3am page — build flags, systemd limits, diff testing against vanilla, the deployment topology that lets your fork survive contact with reality.

> 🛑 **Predict before scrolling.** You ship your fork built with **default \`cargo build --release\`** — no jemalloc, no asm-keccak, no \`target-cpu=native\`. List the production symptoms you'd see in **week 1, week 4, month 3**. (Hint: which symptoms creep in slowly versus hit immediately?)

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

> 🛑 **Anti-fluency.** You set \`LimitNOFILE=8192\` (a typical default-ish value). Reth runs fine for hours, then breaks. **What's the failure signature in logs?** What system call returns the error, and what does Reth do with it? If you can't predict the error message, you'll waste an oncall shift on it.

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

> 🛑 **Predict.** Your diff harness reports a stateRoot divergence on block N. **Name the 3 most likely root causes in YOUR fork** (not vanilla Reth's bug — your fork's). Be specific: which of your changes is the prime suspect? Which is the second-most likely? If you can't, your fork has too many active changes to debug — re-read your own commits.

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

> 🛑 **Predict.** You announce activation at block 1000. 3 of 4 validators upgrade in time. The 4th doesn't. **At block 1001, what does each validator see?** When does the chain detect divergence? **What's the recovery path** for the lagging validator?

## 8. Reading list

- [Reth Book "Run a node" + "Custom chain"](https://reth.rs/) sections
- The validator ops post-mortem from any major chain incident — they're gold for ops intuition

You now have a complete picture: develop, profile, extend, deploy, monitor. Welcome to the small club.

> Final check: in one sentence, why is "diff testing against vanilla Reth" the highest-value test you can write for a fork? **What class of bug does it catch that no unit test ever will?** If your answer doesn't mention "consensus" or "the only output that matters is stateRoot," re-read Section 5.`,
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
                      question: 'Why does Reth use MDBX instead of RocksDB for chain state?',
                      options: [
                        "RocksDB's LSM-tree compactions improve write throughput but add unpredictable read latency — Reth picks MDBX (B+tree + mmap + MVCC) for predictable latency and lock-free reads",
                        'MDBX supports range scans natively while RocksDB requires building secondary indices',
                        'MDBX is written in Rust, so it integrates better with the rest of the Reth stack',
                        "MDBX's mmap design eliminates the kernel-userspace copy on every read, which RocksDB cannot do",
                      ],
                      correctIndex: 0,
                      explanation: 'Ethereum is read-heavy and latency-sensitive. MDBX is C, not Rust (eliminates option 3). RocksDB does support range scans via iterators (eliminates option 2). The mmap claim in option 4 is partially true but is a consequence, not the design driver — the driver is compaction-stall avoidance for validator latency.',
                    },
                    {
                      question: 'When optimizing Rust performance for a Reth fork, what should always come first?',
                      options: [
                        'Add #[inline] hints to the functions you suspect are hot',
                        'Switch the global allocator to jemalloc — Reth already does this',
                        'Profile (flamegraph) and benchmark (Criterion) to identify the **actual** hot path before changing anything',
                        'Rewrite hot loops with the std::simd intrinsics for vectorization',
                      ],
                      correctIndex: 2,
                      explanation: 'Premature optimization is bad; invisible slowdowns are worse. Each of the other three options is a real, defensible optimization — but applying any of them without measurement first is the failure mode this lesson exists to prevent.',
                    },
                    {
                      question: "What's the right way to do CPU-bound work inside a Tokio runtime?",
                      options: [
                        'Wrap the call in tokio::spawn so it runs concurrently with other async tasks',
                        'Use tokio::task::spawn_blocking, which moves the work to a separate threadpool sized for blocking work',
                        'Use std::thread::spawn directly so the CPU work never touches Tokio',
                        'Annotate the function with #[tokio::task] so Tokio routes it appropriately',
                      ],
                      correctIndex: 1,
                      explanation: 'tokio::spawn (option 1) still puts the work on the async worker pool — it starves the runtime exactly the same way as a direct call. std::thread::spawn (option 3) bypasses Tokio entirely, which loses you the JoinHandle integration. There is no #[tokio::task] attribute (option 4 is fabricated). spawn_blocking is the discipline.',
                    },
                    {
                      question: 'When does a procedural macro run?',
                      options: [
                        'At runtime, but the result is cached after the first invocation',
                        'At compile time, transforming an input TokenStream into an output TokenStream',
                        'At parse time, before the lexer runs — that is why proc macros can use raw bytes',
                        'After compilation but before linking, as part of the build script pipeline',
                      ],
                      correctIndex: 1,
                      explanation: 'Proc macros run as the compiler is parsing your code, after lexing (eliminates option 3) and well before linking (eliminates option 4). They are not invoked at runtime at all (eliminates option 1). cargo expand shows you the result.',
                    },
                    {
                      question: 'What is the key difference between a custom opcode and a custom precompile in Revm?',
                      options: [
                        'Opcodes execute in the EVM interpreter loop; precompiles run in a separate process and communicate over IPC',
                        'Opcodes modify the EVM instruction set (breaking consensus with vanilla EVM); precompiles add native functions called via CALL to a reserved address (mostly transparent to Solidity/ABI tooling)',
                        'Custom opcodes are valid on mainnet; custom precompiles are restricted to App-chains',
                        'Opcodes can be invoked from any contract address; precompiles require a special precompile-enabled compiler',
                      ],
                      correctIndex: 1,
                      explanation: 'Both run in-process — there is no IPC (eliminates option 1). Custom opcodes break consensus, custom precompiles do not (the OPPOSITE of option 3 is true). Precompiles are called via standard CALL — no special compiler needed (eliminates option 4).',
                    },
                    {
                      question: 'Why does Ethereum use a Merkle Patricia Trie (MPT) for state?',
                      options: [
                        'Patricia tries are the fastest indexed data structure for arbitrary 256-bit keys',
                        'It commits to the entire world state in a single 32-byte hash, supports inclusion / non-inclusion proofs, and is space-efficient via path compression',
                        'It is resistant to hash-collision attacks because each tree level uses a different hash function',
                        'It supports parallel modification across all leaves without locking — critical for staged sync',
                      ],
                      correctIndex: 1,
                      explanation: 'MPT is not the fastest lookup structure (eliminates option 1 — a HashMap is faster, but commits to nothing). It uses keccak256 throughout, not different hashes per level (eliminates option 3). Parallel modification is *not* an MPT property — sequential rehashing up to the root is required (eliminates option 4). The cryptographic commitment is the whole point.',
                    },
                    {
                      question: 'In a production zkEVM proving pipeline using Revm, what is a "witness"?',
                      options: [
                        'A cryptographic signature from a node operator attesting that the transaction was observed in the mempool',
                        'The set of state values the block accessed (accounts, code, storage slots, recent block hashes) that the prover consumes — since it cannot read disk inside the zkVM',
                        'A precomputed table of all gas costs for the opcodes used in the block',
                        'The full chain state snapshotted at the proven block, sent into the zkVM',
                      ],
                      correctIndex: 1,
                      explanation: 'No signature is involved (eliminates option 1). Gas costs are constants in the EVM spec, not part of a witness (eliminates option 3). Sending the *full* state would defeat the purpose — witnesses are minimal subsets, not snapshots (eliminates option 4). If the block reads anything not in the witness, the proof fails.',
                    },
                    {
                      question: 'For an MEV searcher, why is ExEx valuable?',
                      options: [
                        'It includes a built-in JSON-RPC simulation endpoint that runs faster than the standard mainnet RPC',
                        'It receives every chain commit / reorg / revert notification at near-zero latency, in-process with full state access — perfect for warm caches and fast simulation',
                        'It bypasses Ethereum consensus rules so the searcher can simulate alternative orderings deterministically',
                        'It runs on a CPU core reserved by the OS scheduler so other workloads cannot preempt it',
                      ],
                      correctIndex: 1,
                      explanation: 'ExEx is not an RPC endpoint (eliminates option 1) — it is a callback into your Rust code. It cannot bypass consensus; that is exactly the rules its notifications obey (eliminates option 3). Tokio scheduling has nothing to do with OS-level CPU pinning (eliminates option 4). The win is in-process latency on every chain event.',
                    },
                    {
                      question: 'What is the cardinal rule when pricing a custom precompile?',
                      options: [
                        'Set the gas to roughly 1/10 of the equivalent Solidity implementation so adoption is incentivized',
                        'Gas cost should track CPU cost — typically benchmark on the worst realistic input, multiply by a 2–5x abuse factor, then validate against adversarial inputs',
                        'Charge a flat per-call cost so the gas model stays predictable for users',
                        'Use the gas cost of the most-similar standard precompile (e.g., ecrecover) as a baseline',
                      ],
                      correctIndex: 1,
                      explanation: 'Underpricing for adoption (option 1) is exactly the DoS vector EIP-2929 had to retrofit. A flat cost (option 3) breaks the moment input size matters. Borrowing another precompile\'s number (option 4) is fine as a sanity check but ignores your specific CPU profile. The real workflow is benchmark → abuse factor → adversarial validation.',
                    },
                    {
                      question: 'For a custom Reth fork running an App-chain, what is the realistic minimum production deployment?',
                      options: [
                        'Three validators co-located in a single datacenter behind one load balancer (lowest latency)',
                        '≥4 validators distributed across 3 datacenters, with sentry nodes shielding each validator, separate archive nodes for analytics, and a rate-limited RPC fleet — never co-locating validator and public RPC',
                        'Five validators in the same cloud region (cross-region adds too much consensus latency)',
                        'Two validators in active-passive failover with a hot standby (keeps the ops team small)',
                      ],
                      correctIndex: 1,
                      explanation: 'BFT safety needs a quorum across failure domains — single-DC (option 1) and single-region (option 3) collapse on one fault. Two validators (option 4) cannot tolerate any byzantine behavior. The realistic minimum is geographic distribution + sentry separation + dedicated RPC fleet, because one DDoS on a public RPC must not halt consensus.',
                    },
                  ],
                },
              ],
            },
          },
          {
            title: 'Reth-based Chains — Reading the Extension Pattern',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'The Reth extension pattern — library, not fork',
                  slug: 'reth-extension-pattern-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 14,
                  xpReward: 40,
                  content: `# The Reth extension pattern — library, not fork

If you've worked with **op-geth**, **bsc-geth**, or **bor** (Polygon), you know the geth-fork story: clone the upstream, apply your patches, rebase forever. Every upstream merge is a weekend of conflict resolution, and the audit surface drifts away from mainline.

**Reth was designed to make this model obsolete.** Optimism, Base, Berachain, Scroll, Seismic, Sova, alphanet, and Tempo all run on Reth — and almost none of them are forks in the traditional sense. They are *node crates* that **depend on reth as a library** and override the parts they care about via traits.

> 🛑 **Predict before scrolling.** A geth-fork chain ships a critical security patch from upstream. The fork is 18 months out of date. **Estimate how long the rebase takes** and **list 3 ways the rebase can introduce its own consensus bug**. Hold your answer.

## 1. The two models

| Model | How it works | Cost over time |
| :--- | :--- | :--- |
| **Fork model** (geth-style) | Clone upstream, patch source, rebase periodically | Drift cost is **superlinear** — patches and upstream diverge, conflicts compound |
| **Extension model** (reth-style) | Depend on reth crates, implement chain-specific traits in a separate crate | Drift cost is **localized** — your code changes only when trait signatures change |

Reth's whole architecture is built around the second model. The NodeBuilder / components / ChainSpec pattern you saw in the Advanced course exists precisely so that **you never have to patch reth's source to ship a chain**.

## 2. Why Paradigm chose this

Paradigm builds Reth, alphanet, **and** Tempo. They are their own customer. Three forces pushed them toward the extension model:

1. **Rebase pain is real.** Optimism's op-geth had a fork-divergence story bad enough that the org sponsored a rewrite — folded into reth itself as \`crates/optimism/\`.
2. **Audit surface.** An auditor reading a fork has to diff against upstream and reason about every patch. An auditor reading a node crate sees one repo, one set of traits implemented.
3. **Composability.** Berachain wants reth + custom consensus. Scroll wants reth + zk-friendly state. Seismic wants reth + encrypted txs. The extension model lets all three coexist; the fork model would force each to maintain their own divergent copy.

The result: **reth's trait architecture is the API for building a chain.**

## 3. What you actually customize

A Reth-based chain typically overrides these slots:

- **\`ChainSpec\`** — fork heights, gas params, precompile schedule, genesis
- **\`ConfigureEvm\` / block execution strategy** — execution layer, custom precompiles, deposit-tx handling
- **\`PayloadBuilder\`** — how blocks get produced (sequencer mode for L2s)
- **Pool / mempool policy** — what txs are admitted, in what order
- **Custom RPC namespaces** — exposing chain-specific endpoints via \`extend_rpc_modules\`
- **Custom consensus** — for non-Ethereum-PoS chains

Everything else (P2P, MDBX storage, staged sync, ExEx, trie commitments) **comes from reth for free**.

> 🛑 **Anti-fluency.** Someone says "Berachain forked reth to add Proof-of-Liquidity." Why is the verb "forked" probably wrong, and what should it be? If you can't restate the sentence accurately, you don't have the model yet.

## 4. Concrete examples to read

Order them from "shipped to mainnet" → "R&D":

1. **\`crates/optimism/\`** in [paradigmxyz/reth](https://github.com/paradigmxyz/reth/tree/main/crates/optimism) — Optimism / Base / Mode / OP Stack. The most production-tested extension on the planet.
2. **[paradigmxyz/alphanet](https://github.com/paradigmxyz/alphanet)** — Paradigm's own OP-Stack testnet for trying custom precompiles (EIP-7212 P-256 verify, etc.) before they exist on mainnet.
3. **[SovaNetwork/sova-reth](https://github.com/SovaNetwork/sova-reth)** — Reth as a Bitcoin execution layer.
4. **[SeismicSystems/seismic-reth](https://github.com/SeismicSystems/seismic-reth)** — Reth with encrypted transactions.

Each of these is a study in "what's the smallest patch the chain needs?" The answer is usually **a few thousand lines in a node crate**, not a fork of 200k lines of execution client.

## 5. Why this matters for what you're building

If you are building anything that touches a Reth-based chain — a bridge, a settlement layer, a custom node, a sequencer integration — you need to read at the **trait level**, not the binary level. The question "how does Tempo handle X?" reduces to "which trait does Tempo's node crate override, and how?"

**Tempo's source is now public** at [\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo), and you should read it through the lens of that question: "which of these standard slots did they customize, and why?" One concrete data point before you open it: [\`tempoxyz/reth\`](https://github.com/tempoxyz/reth) is **0 commits ahead, 1374 behind** upstream Paradigm Reth — they did not fork Reth at all. Every payments-specific customization lives in the \`tempoxyz/tempo\` crate as a dependency-level extension.

## 6. Practice

1. Open [reth's workspace Cargo.toml](https://github.com/paradigmxyz/reth/blob/main/Cargo.toml) and find every crate matching \`reth-optimism-*\`
2. Note what each one owns (chainspec? evm? payload? rpc?)
3. List the 6 customization slots you'd fill to ship a real chain
4. Identify which one is "the consensus-rules-of-my-chain" slot

You should now be able to read any Reth-based chain repo without flinching at the directory structure.

> Final check: in one sentence, what is the structural reason a Reth-based chain rarely needs to patch reth's source? If your answer doesn't reference **trait-based extension** and **NodeBuilder composition**, the lesson hasn't stuck. Re-read sections 1 and 2.`,
                },
                {
                  title: 'Reading op-stack-on-reth — the anatomy of a Reth-based L2',
                  slug: 'reading-op-stack-on-reth-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 45,
                  content: `# Reading op-stack-on-reth — the anatomy of a Reth-based L2

Optimism is the canonical "Reth-based L2." Its node code lives at \`paradigmxyz/reth/crates/optimism/\`. If Tempo's node crate looked anything like this, you'd already know how to read it. So that's the goal of this lesson: **make the directory shape obvious.**

> 🛑 **Predict before scrolling.** A new Reth-based L2 ships its node crate. **List the 5 subdirectories you'd expect** to see, and what each owns. If you cannot, stop and re-read the previous lesson.

## 1. Where to look

Browse: [paradigmxyz/reth → crates/optimism/](https://github.com/paradigmxyz/reth/tree/main/crates/optimism)

You will see subcrates roughly along these lines (exact names drift across reth versions — verify in source):

| Subdirectory | What it owns |
| :--- | :--- |
| \`chainspec/\` | OP chain spec — forks, genesis, gas params, precompile schedule |
| \`node/\` | The top-level \`NodeBuilder\` wiring — "this is what an OP node is" |
| \`evm/\` | EVM config — custom precompiles, deposit-tx semantics, L1 cost logic |
| \`payload/\` | Payload builder — block production in sequencer mode |
| \`consensus/\` | Consensus engine for OP (delegates finality to L1) |
| \`rpc/\` | Custom RPC namespaces (\`optimism_*\` methods) |
| \`txpool/\` (or similar) | Deposit-tx-aware mempool policy |
| \`hardforks/\` | Bedrock, Canyon, Ecotone, Fjord, ... fork activation logic |

> **Find-in-repo.** Don't trust the table above blindly. Navigate the actual repo and **make your own table**. Versions move — your table is what matters.

## 2. The dependency shape

Run \`cargo tree -p reth-optimism-node\` (the exact crate name varies; locate it in the workspace).

What you'll see:

- \`reth-optimism-node\` depends on \`reth-node-builder\`, \`reth-chainspec\`, \`reth-evm\`, \`reth-payload-builder\`, \`reth-rpc-builder\`, \`revm\`, \`alloy-*\`
- It also depends on its OP-specific siblings: \`reth-optimism-chainspec\`, \`reth-optimism-evm\`, \`reth-optimism-payload-builder\`, ...
- It does **not** depend on \`reth-node-ethereum\` — that's the parallel mainnet node crate

**The pattern**: a chain's node crate is **siblings** with the Ethereum node crate, both consuming the same shared reth-core crates. That's the extension model in dependency form.

## 3. The "spine" you should be able to find in 5 minutes

For any Reth-based chain, you should be able to locate these five things in under 5 minutes of repo navigation:

1. **NodeBuilder composition** — where the chain says "I want these components." Usually in \`*-node/src/lib.rs\` or \`node/builder.rs\`.
2. **ChainSpec** — the consensus rule type. Usually in \`*-chainspec/src/\`.
3. **Executor / EVM config** — usually in \`*-evm/src/\`.
4. **Payload builder** — usually in \`*-payload-builder/src/\` or \`*-payload/src/\`.
5. **Genesis JSON** — sometimes inline in the chainspec crate, sometimes a separate \`.json\`.

If you can find those, you can read the chain.

> 🛑 **Anti-fluency.** You found a file called \`node.rs\` with a type \`OpNode\`. Where do you go next to understand what an \`OpNode\` **is** versus what it **does**? **Predict** the trait it implements before you scroll.

## 4. Reading order for a first pass

Recommended sequence when reading any Reth-based chain for the first time:

1. **\`README.md\`** + **\`Cargo.toml\`** at the chain root — establish what crates exist
2. **\`chainspec/\`** — read the fork activation list out loud
3. **\`node/\`** — read the NodeBuilder composition; this tells you what's customized
4. **Each customized component crate**, in the order it was named in the NodeBuilder
5. **Tests** — especially state-transition tests; they encode the actual behavioral commitments

By the end of step 3 you know **what's different**. Steps 4–5 are reading the *how*.

## 5. What Tempo will probably look like

Working hypothesis (until Paradigm publishes Tempo's node crate):

- A \`tempo-chainspec\` crate with Tempo's fork heights, gas params, payment-specific precompiles
- A \`tempo-node\` crate composing the NodeBuilder
- A \`tempo-evm\` crate with custom precompiles for payment primitives (FX rate oracle? settlement-proof verify? regulated-asset check?)
- A \`tempo-payload-builder\` crate for the sequencer
- A \`tempo-pool\` crate for payment-specific mempool policy (e.g., merchant authorization)
- Optional: \`tempo-consensus\` if Tempo doesn't use vanilla L1-anchored finality (it's an L1, so almost certainly yes)

When this lands, you read it the same way you'd read \`crates/optimism/\`.

## 6. Practice

Pick a Reth-based chain. Browse its repo. **Build the table in §1 for that chain.**

Candidates ranked by reading quality:
- \`paradigmxyz/reth/crates/optimism/\` (largest, most polished)
- \`paradigmxyz/alphanet\` (smaller, R&D-flavored — easier to read end-to-end)
- \`SovaNetwork/sova-reth\` (Bitcoin angle — different chainspec shape)

> Final check: in two sentences, describe **the shape of a Reth-based chain repo**, in words that would let a new hire find anything in 10 minutes. If you start with "it has a folder," start over and lead with the *concept* (extension via traits + NodeBuilder composition).`,
                },
                {
                  title: 'Custom ChainSpec — forks, genesis, and the precompile schedule',
                  slug: 'custom-chainspec-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 14,
                  xpReward: 40,
                  content: `# Custom ChainSpec — forks, genesis, and the precompile schedule

The block validates on mainnet but rejects on your chain. Same block, same client binary, same Revm — different result. Why? Because something inside \`ChainSpec\` said "at this height, the rules are different here." A wrong fork height, a wrong precompile schedule entry, a wrong base-fee parameter — any one of them, and your chain forks itself off the network in one block.

\`ChainSpec\` is the Rust struct that owns "what makes this chain different from mainnet Ethereum at the **protocol** level" — chain ID, fork activation, base fee curve, genesis allocation, precompile schedule. If you're going to read or build a Reth-based chain, **this is the type you read first**.

> 🛑 **Predict before scrolling.** "ChainSpec" sounds like config. **List 5 categories of information** you'd expect it to hold. If your list is shorter than 5 or all of them are gas-related, you're under-imagining what consensus rules touch.

## 1. What ChainSpec is

In \`reth-chainspec\`, \`ChainSpec\` is a struct (with various extensions in chain-specific crates) that captures:

| Category | What it controls |
| :--- | :--- |
| **Chain ID** | EIP-155 replay protection key |
| **Hardfork activation** | Block-height- or timestamp-based switches for protocol upgrades |
| **Base fee params** | EIP-1559 parameters (elasticity, change denominator) |
| **Genesis** | Initial allocations, state root, gas limit |
| **Precompile schedule** | Which precompile addresses are active at each fork |
| **Misc legacy params** | Block gas limits, DAO fork, mining difficulty (legacy) |

For Reth-based L2s, the chain provides an *extended* ChainSpec — e.g., the OP chain spec wraps the base \`ChainSpec\` and adds OP-specific fork tracking (Bedrock, Canyon, Ecotone, Fjord, ...).

> 🛑 **Find-in-repo.** Open \`crates/optimism/chainspec/\` and locate the exact type that represents an OP chain spec. Is it a struct around \`ChainSpec\`? A trait extension? **Both?** Don't read on until you've answered.

## 2. The hardfork list as the chain's history

Reading the hardfork enum out loud is the fastest way to understand a chain.

For OP Stack you'll find an enum roughly like:

\`\`\`rust
pub enum OptimismHardfork {
    Bedrock,
    Regolith,
    Canyon,
    Ecotone,
    Fjord,
    Granite,
    Holocene,
    // ...
}
\`\`\`

Each variant comes with **activation logic** (block height on mainnet, separate timestamp on each network like Sepolia, Base, etc.). Reading this enum + its activation table = reading the chain's entire protocol history.

For Tempo, you can verify the same shape directly in [\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo) — different fork names, same enum + activation-table structure.

## 3. The precompile schedule

A precompile is a "native function" living at a reserved address (\`0x00..01\` through \`0x00..0a\` on mainnet, plus optional extras). Each chain decides which precompiles exist at which fork.

OP Stack inherits most of Ethereum's precompiles and adds a few of its own. Future hardforks add more. The precompile schedule is essentially:

\`\`\`
At fork F, address A maps to native function impl I
\`\`\`

You'll find this in the chain's EVM config crate (covered in the next lesson), but the **activation gating** lives in ChainSpec — because activation is a consensus rule.

> 🛑 **Anti-fluency.** Why must precompile activation live in ChainSpec rather than in the EVM config alone? If your answer is just "consistency," go deeper. **What goes wrong if two nodes disagree on which precompile is active at block N?**

## 4. Genesis encoding

Genesis is just "the state at block 0." A custom chain ships:

- A genesis JSON file (allocations, gas limit, initial difficulty/seal)
- A \`Genesis\` Rust struct in the chainspec crate, often loadable from the JSON
- A computed genesis state root that all nodes must agree on

If you're auditing a chain, **verify the genesis state root in code matches the network**. Disagreement here means every node disagrees on block 1.

## 5. What's special about an L2 chainspec

L2 chainspecs (Optimism, Base, ...) also track:

- **L1 chain ID** the L2 is anchored to (for cross-domain message verification)
- **L1 block oracle** address on the L2 (the contract that records the current L1 block hash)
- **Sequencer address** (for sequencer-signed batch validation)
- **Withdrawal config** (the time delay for L2→L1 withdrawals)

These don't apply to a Tempo-style L1, but illustrate the *kind* of thing that lives in an extended ChainSpec.

## 6. Reading exercise

In \`crates/optimism/chainspec/\` (or wherever the OP chainspec lives in your reth checkout):

1. **Find** the struct that represents an OP chain spec
2. **Read** its hardfork list out loud
3. **Locate** the function that answers "is fork F active at block height H, timestamp T?"
4. **Find** where Bedrock's activation block is hard-coded for OP mainnet vs Base

Now do the same for any other chain in awesome-reth's "Layer 2" section.

> Final check: if I asked you "what fork activation rule does chain X use at block N?", what files would you need to read, and in what order? If your answer is more than 2 files, you're over-complicating it — ChainSpec + the activation table is the whole story.`,
                },
                {
                  title: 'Custom executor — swapping the execution layer',
                  slug: 'custom-executor-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 18,
                  xpReward: 45,
                  content: `# Custom executor — swapping the execution layer

The executor is "what actually runs the transactions and produces the post-state." For Ethereum mainnet, this is vanilla revm. For Optimism, it's revm **plus deposit-tx handling**, **plus L1 cost computation**, **plus a slightly different precompile list**. This lesson is about how Reth lets you swap that in.

> 🛑 **Predict before scrolling.** A Reth-based L2 needs to execute "deposit transactions" — txs that originate on L1 and have no signature on L2. **At which layer does the L2 customize**: the mempool? The transaction validator? The executor? **Justify** before reading.

## 1. The trait surface

The relevant traits (names may drift slightly across reth versions; verify in source):

- **\`ConfigureEvm\`** — given a block context, produce a configured revm instance (with the right precompile set, gas schedule, etc.)
- **\`BlockExecutionStrategy\`** (or similar) — the loop that pulls txs from a block and feeds them to revm, accumulating receipts and state changes
- **\`ExecutorBuilder\`** — the NodeBuilder slot that produces an executor for the running node

A chain customizes the first two via trait impls in its own crate, then registers them via the third in its NodeBuilder.

## 2. What Optimism overrides

Reading \`crates/optimism/evm/\` will show you roughly:

| Override | Why |
| :--- | :--- |
| **Custom precompile list** | OP adds a few precompiles (e.g., for L1 block hash access) |
| **Deposit transaction handling** | Deposit txs skip signature verification (they're authenticated by L1) |
| **L1 cost calculation** | Every OP tx pays both L2 gas AND an L1 data cost (calldata posting) |
| **Pre-execution hooks** | Update the L1 block oracle storage slot before the first tx in a block |

The first one is config. The other three are execution-strategy-level — they live in the block executor's main loop.

> 🛑 **Find-in-repo.** Locate the exact function in \`crates/optimism/evm/\` that decides "this is a deposit transaction; skip signature verify." **What's the function signature?** (Don't memorize — just verify you can find it.)

## 3. The custom-precompile story

You wrote a custom precompile earlier. Now ask: **where does that precompile get plugged into a chain?**

Answer: \`ConfigureEvm\` impls hand revm a precompile set. A chain's \`ConfigureEvm\` impl extends the default set with its custom precompiles, gated by the chain's hardfork schedule.

So the wiring is:

\`\`\`
ChainSpec  ──[which fork is active?]──▶  EVM config  ──[active precompile set]──▶  revm
\`\`\`

The EVM config crate is where the precompile registration code physically lives.

## 4. The L1 cost computation (and why it's a great example)

OP Stack charges every transaction an *L1 data cost* — the amortized cost of posting the transaction's calldata to L1. This is a hard requirement: every node must compute the exact same L1 cost or block validation fails.

It's implemented inside the executor by:
1. Before each tx, look up the current L1 base fee and blob gas price from a known storage slot
2. Compute \`l1_cost = calldata_gas * l1_base_fee + blob_overhead\`
3. Deduct from the sender's balance **in addition to** the L2 gas charge
4. Credit it to the fee vault

This is a **clean example of consensus-critical logic that you cannot put in a precompile** — it has to be in the executor itself.

> 🛑 **Anti-fluency.** Why can't OP's L1 cost charging be implemented as a precompile? If your answer is just "performance," go deeper — what's the **consensus reason** a precompile can't deduct from arbitrary accounts before tx execution?

## 5. The execution loop, in pseudo-code

\`\`\`
for tx in block.body:
    if is_deposit_tx(tx) and current_fork.allows_deposits():
        skip_signature_verify()
    else:
        verify_signature(tx)?

    db = state_provider.load_relevant_accounts(tx)
    cfg = configure_evm(chainspec, block, db)   // sets precompiles, gas schedule
    result = revm.transact(cfg, tx)
    apply_l1_cost(tx, result, db)               // L2-specific
    state.commit(result.state_changes)
    receipts.push(result.receipt)
return post_state_root(state), receipts
\`\`\`

For Ethereum mainnet, lines 3 and 9 disappear. **Everything else is identical.** That's the whole point of the extension model.

## 6. For Tempo, what to expect

Tempo is an L1, so:
- No "deposit tx" concept (no parent chain to be deposited from)
- No L1 cost charge

But likely YES:
- Custom precompiles for payment primitives (FX, settlement attestations, ...)
- Pre-execution hooks if Tempo has a built-in "current FX rate" oracle slot, by analogy with OP's L1 block hash slot
- A different fee market structure (Tempo is stablecoin-native; the fee-asset choice is interesting)

Tempo's executor is now public — find it in [\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo); the equivalent file is where you'd verify each of the above hypotheses against actual code.

## 7. Practice

In \`crates/optimism/evm/\`:

1. **Find** the \`ConfigureEvm\` impl for OP
2. **List** every precompile address that's NOT on Ethereum mainnet
3. **Find** the function that adds the L1 cost charge
4. **Trace** how a deposit transaction bypasses signature verification

> Final check: name the two things that **must** be in the executor (not in a precompile, not in the mempool) for a Reth-based chain, and explain why each must live there. If you can't, re-read sections 4 and 5.`,
                },
                {
                  title: 'Custom payload builder — sequencer-mode block production',
                  slug: 'custom-payload-builder-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 16,
                  xpReward: 45,
                  content: `# Custom payload builder — sequencer-mode block production

For Ethereum mainnet, blocks are produced by **validators** running the consensus client and pulling proposed payloads from the execution client. For an L2 or any centralized-sequencer chain, the block-production model is different: **the sequencer is the block producer**, full stop. The payload builder is the component that knows how.

> 🛑 **Predict before scrolling.** On a centralized-sequencer L2, who/what decides **transaction ordering** inside a block? **What does the sequencer optimize for**, and what's the MEV implication? Hold your prediction.

## 1. The trait surface

\`PayloadBuilder\` (and friends) is the slot in reth's NodeBuilder for "how to build a block." It takes:

- A parent block (where we're building from)
- Current chain state
- A pool of pending transactions
- A timestamp / slot

...and returns a built block (the "payload"). On mainnet, the validator's consensus client triggers this via the Engine API. On a sequencer L2, the sequencer triggers it directly.

## 2. Two production-relevant builders

The reth ecosystem has multiple payload builders to study:

| Builder | Where | Use case |
| :--- | :--- | :--- |
| Default Ethereum builder | \`crates/payload/builder/\` | Mainnet validators |
| OP payload builder | \`crates/optimism/payload/\` | OP Stack sequencer |
| **op-rbuilder** | [paradigmxyz/rbuilder](https://github.com/paradigmxyz/rbuilder) | High-perf external block builder for OP Stack |

The first two are inside reth. **op-rbuilder** is a separate repo, more aggressive about MEV and ordering policy, and is the production builder several OP Stack chains use.

## 3. What an L2 builder does differently

Sequencer-mode block production typically:

1. **Force-includes deposit txs** at the top of the block (from a known L1 oracle queue)
2. **Sorts the rest of the block** by either FIFO (first-come-first-serve) or priority-fee
3. **Updates the L1 block oracle storage slot** as the first state write
4. **Caps the block at the L2 gas limit** (not the mainnet limit)
5. **Tags the block with the sequencer's signature** (some L2s commit to sequencer identity)

Notice that several of these are **not in the executor** — they're in the *builder*. Why? Because the builder controls *what goes into a block*; the executor only runs *what's in a block*.

> 🛑 **Anti-fluency.** A junior engineer says "we'll just FIFO the mempool and that's our sequencer." **Name 3 attacks** they haven't considered. (Hint: think about latency on tx submission, about toxic order flow, about reorg.)

## 4. The MEV question

A sequencer that orders transactions can extract MEV in ways a validator can't (it has no consensus competitor inside its block).

Three positions a sequencer can take:

| Position | What it means | Examples |
| :--- | :--- | :--- |
| **MEV-blind** | Strict FIFO, no peeking into tx semantics | Some smaller L2s claim this |
| **MEV-aware, public** | Public order flow, builder accepts MEV-share-style bids | OP Stack with op-rbuilder |
| **MEV-extracting** | Sequencer runs internal searchers | (Often opaque; centralized chains can do whatever they want) |

The choice ends up in the **payload builder's source code**, gated by feature flags or external builder integrations. Reading a chain's payload builder is reading its MEV policy.

## 5. op-rbuilder — the production-grade reference

[paradigmxyz/rbuilder](https://github.com/paradigmxyz/rbuilder) is the external builder Paradigm built for OP Stack. Worth studying because:

- It implements **bundle merging** (private order flow + public mempool)
- It supports **sealing strategies** (greedy, parallelizable algorithms)
- It exposes a **builder API** other parties can submit bundles to
- It's the closest thing in the open-source world to a "real" production block builder

If Tempo uses or extends op-rbuilder for sequencer-mode block production, this is the codebase to study first.

## 6. For Tempo specifically

Predictions:
- Tempo will have a **payment-aware payload builder** — payments may get priority over generic txs
- A **merchant authorization filter** at the builder level — only authorized merchants can submit certain tx types
- A **rate limiter** on per-merchant tx volume to prevent abuse
- Likely **no public mempool** at launch (sequencer-private)

Each of those is one trait impl in a payload-builder crate.

## 7. Practice

Open \`crates/optimism/payload/\` and:

1. **Find** the \`PayloadBuilder\` trait impl
2. **Trace** how deposit txs get included at the top of the block
3. **Identify** where the block gas cap is enforced
4. **Find** the function that signs/seals the built block

Then read [op-rbuilder's README](https://github.com/paradigmxyz/rbuilder) for the "external builder" model.

> Final check: in one sentence, what does the payload builder **decide** that the executor does not? If your answer doesn't include the word "ordering" or "selection," go back and re-read section 3.`,
                },
                {
                  title: "Case study — Paradigm's stack: alphanet, Tempo, and the L1 pattern",
                  slug: 'paradigm-stack-case-study-en',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 18,
                  xpReward: 50,
                  content: `# Case study — Paradigm's stack: alphanet, Tempo, and the L1 pattern

You've now seen the four extension slots (ChainSpec, executor, payload builder, RPC) and the dependency shape of a Reth-based chain. This lesson is the **synthesis**: what does Paradigm's full stack look like, and now that **Tempo's source is public**, how do you read it against the structure you just learned?

> 🛑 **Predict before scrolling.** Paradigm has shipped, in order: **revm → alloy → reth → alphanet → op-stack-on-reth → Tempo**. **What's the trajectory** that sequence describes? Hold your answer; the lesson will compare.

## 1. The stack, top to bottom

| Layer | Component | What it does |
| :--- | :--- | :--- |
| **EVM core** | revm | The byte-level EVM interpreter |
| **Toolkit** | alloy | Rust types, providers, signers, ABI |
| **Execution client** | reth | Full Ethereum node — staged sync, mempool, RPC, MDBX, P2P |
| **Reth-based chain** | reth's \`crates/optimism/\` | OP Stack execution as a reth node crate |
| **R&D testnet** | alphanet | "What if Ethereum had EIP-X precompile?" playground |
| **Production L1** | Tempo | Paradigm's payment rail |

**Every layer below depends only on the layers above it.** That's the architectural invariant. Tempo doesn't fork reth — it builds *on* reth.

## 2. alphanet — the precompile R&D playground

[paradigmxyz/alphanet](https://github.com/paradigmxyz/alphanet) is an OP-Stack-compatible testnet rollup. Its explicit purpose: **try EVM extensions before they exist on mainnet**.

Examples of what alphanet has shipped or experimented with:
- **EIP-7212** — \`secp256r1\` (P-256) verification precompile (relevant for WebAuthn / Passkeys)
- **EIP-3074 / 7702** — account abstraction primitives
- Various opcode and gas tweaks

Why this matters as a *learning target*: alphanet is **small enough to read end-to-end**, and the customizations are educational by design. It's the cleanest "how do I add a precompile to a chain" example in the wild.

> 🛑 **Find-in-repo.** Open alphanet's repo and locate the file where the P-256 precompile is **registered with the chain**. (Not where the math is implemented — where it joins the chain's active precompile set.) **Why does it live there?**

## 3. From alphanet to production

The trajectory matters: alphanet is where Paradigm tries things, and then either:
- The experiment graduates into **mainnet Ethereum** as an EIP (e.g., 7212 is on the path), or
- The experiment graduates into **a production Reth-based chain** (e.g., Tempo)

If you want to predict what Tempo has, **look at what's been validated in alphanet recently**. The technical lineage is direct.

## 4. Tempo — Paradigm's payment L1 on Reth

Now public, and the structure validates the entire thesis of this module:

- **[\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo)** (900+★, Rust) — "the blockchain for payments." This is the L1 node crate.
- **[\`tempoxyz/reth\`](https://github.com/tempoxyz/reth)** — **0 commits ahead, 1374 commits behind** upstream Paradigm Reth. They did not fork Reth. Tempo depends on upstream Reth as a library. This is the textbook example of "compose, don't fork."
- **Tempo Moderato** is the public testnet.
- **Chainlink CCIP** is the cross-chain rail (CCTP doesn't cover Tempo).

Adjacent crates shipped alongside the L1:
- **[\`tempoxyz/zones\`](https://github.com/tempoxyz/zones)** — confidential blockchains anchored to Tempo. Encrypted deposits/withdrawals, 250ms block time, compliance (TIP-403) inherited from L1.
- **[\`tempoxyz/mpp-specs\`](https://github.com/tempoxyz/mpp-specs)** — Machine Payments Protocol: an HTTP-402-based payment protocol for agent/machine transactions. IETF draft. Payment-method agnostic (Tempo, Stripe, ACH).
- **[\`tempoxyz/tempo-foundry\`](https://github.com/tempoxyz/tempo-foundry)** — Foundry fork with Tempo support (also a thin fork, same compose-don't-fork pattern).
- **[\`tempoxyz/tidx\`](https://github.com/tempoxyz/tidx)** — hybrid PostgreSQL + ClickHouse indexer (OLTP point lookups + OLAP analytics).

What to expect when you open [\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo), matching what you just learned:

- **Custom ChainSpec** with Tempo-specific forks and precompile schedule
- **Custom executor** with payment-specific precompiles (FX rate read, settlement attestation, regulated-asset checks)
- **Custom payload builder** with merchant-aware ordering and rate-limiting
- **Custom RPC namespace** (\`tempo_*\` methods) for merchant/payment endpoints, plus integration with the Machine Payments Protocol
- **Custom mempool policy** — likely private mempool at launch, restricted to authorized submitters

What to verify is *absent* (because the SDK lets it be absent):
- A divergent fork of reth core (confirmed — the fork is empty)
- A bespoke EVM implementation (revm is the EVM)
- A custom networking stack (reth's P2P is reused)

## 5. The L1 vs L2 distinction in the extension model

Reading op-stack-on-reth and (eventually) reading tempo-on-reth will look structurally similar but differ in:

| Aspect | OP Stack (L2) | Tempo (L1) |
| :--- | :--- | :--- |
| **Deposit txs** | Yes (from L1) | No |
| **L1 cost charge** | Yes | No |
| **L1 block oracle slot** | Yes | No |
| **Standalone consensus** | No (anchored to L1) | Yes (Tempo runs its own consensus) |
| **Sequencer model** | Centralized at launch, decentralization roadmap | Likely centralized, payment-rail justification |
| **Native asset** | ETH-equivalent | Likely USD stablecoin |

The L1-ness of Tempo means **the consensus layer is also a customization point**, not just the execution layer. That's a slot most L2 chains skip.

## 6. Why this matters for what you ship

If you are building on top of Tempo:

| Project | Why Reth-on-Tempo knowledge matters |
| :--- | :--- |
| Cross-VM intent matcher | Intent matching needs deterministic EVM semantics. Reading Tempo's executor crate tells you exact gas costs, precompile availability, and execution edge cases. |
| Cross-chain settlement layer | Settlement proofs on the EVM side must match Tempo's state exactly. Reading Tempo's chainspec and executor gives you the source of truth. |
| Merchant treasury / payment ops | Merchant operations need predictable confirmation semantics. Tempo's payload builder + mempool policy tells you when a tx becomes inclusion-final. |

You are **months ahead** of anyone who shows up at Tempo's launch without having read reth at the trait level.

## 7. Final practice

The deliverable for this module: open [\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo) and write a 1-page architectural summary in a single sitting by reading:

1. The Tempo node crate's \`Cargo.toml\` — confirm the reth dependency is upstream and unforked
2. The chainspec crate — hardforks + precompile schedule
3. The NodeBuilder composition (likely in \`node/src/lib.rs\` or similar) — which of the 6 components are swapped, which inherit
4. Each swapped crate in order — payload, pool, RPC namespace
5. The tests directory — what behaviors did they care enough about to assert?

If you've never read alphanet end-to-end, do that first as practice — it's smaller and cleaner.

> Final check: write **5 specific things you verified by reading \`tempoxyz/tempo\` source**, ranked by importance for your own work. If you can't list 5, this module hasn't fully landed — re-read sections 4 and 5, then go back to the source.`,
                },
                {
                  title: 'Quiz: did the extension pattern stick?',
                  slug: 'reth-chains-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 6,
                  duration: 15,
                  xpReward: 50,
                  content: `# Quiz: did the extension pattern stick?

A short test on the extension model and where each customization lives. No fluency — every question has a real "which trait / which crate" answer.`,
                  quizQuestions: [
                    {
                      question: 'Why do most Reth-based chains use the extension model rather than the geth-style fork model?',
                      options: [
                        'Reth is faster than geth, so chains are forced to adopt it for performance',
                        "Reth's modular trait architecture (NodeBuilder + ChainSpec + ExecutorBuilder + PayloadBuilder) lets a chain customize only the parts it needs while consuming the rest as a library — eliminating rebase cost",
                        'Rust prevents source-level forking due to its module system',
                        'Paradigm enforces an extension-only policy on all chains that use Reth',
                      ],
                      correctIndex: 1,
                      explanation: 'Speed (option 1) is a happy side-effect, not the architectural reason. Rust does not prevent forking (option 3 is wrong). Paradigm enforces nothing on independent chains (option 4 is wrong). The real driver is the trait architecture — chains override the slots that matter and inherit the rest.',
                    },
                    {
                      question: "Where does a Reth-based chain's hardfork activation logic live?",
                      options: [
                        'In the payload builder, because the builder is what produces blocks at each fork',
                        'In ChainSpec — which fork is active at a given block height / timestamp is a consensus rule, and ChainSpec owns consensus rules',
                        'In the executor, because forks change execution behavior',
                        'In the genesis JSON, alongside the initial state allocations',
                      ],
                      correctIndex: 1,
                      explanation: 'Multiple layers read the fork state, but only one owns it: ChainSpec. Builder (option 1) and executor (option 3) read fork state to make decisions, but they consult ChainSpec — they do not own activation. Genesis (option 4) is the *initial* state, not the fork schedule.',
                    },
                    {
                      question: "OP Stack charges an L1 data cost in addition to L2 gas. Which trait's implementation contains that logic, and why?",
                      options: [
                        'A custom precompile, because precompiles are the natural place to put native fee logic',
                        'The mempool policy, because the fee is calculated at admission time',
                        'The block execution strategy / executor, because charging an account before tx execution is a consensus-critical state mutation that every node must compute identically',
                        "The RPC layer, because clients need to know the L1 cost before they submit",
                      ],
                      correctIndex: 2,
                      explanation: 'A precompile (option 1) cannot deduct from arbitrary accounts on its own — that requires executor-level authority. Mempool (option 2) might *estimate* the cost but cannot enforce consensus state changes. RPC (option 4) is informational, not consensus-critical. The executor is the only layer with both the authority and the consensus-critical position.',
                    },
                    {
                      question: 'A Reth-based L2 needs to force-include deposit transactions at the top of every block. Which trait should handle that?',
                      options: [
                        "The ChainSpec — deposit handling is a chain rule",
                        'The payload builder — it decides what goes into a block and in what order',
                        'The mempool — deposit txs sit in a separate queue and the mempool drains them first',
                        'Custom consensus — only consensus can enforce ordering',
                      ],
                      correctIndex: 1,
                      explanation: "ChainSpec (option 1) defines *what* a deposit tx is, not how it's selected. Mempool (option 3) can track deposit queues but the *include-at-top* rule is a block-composition decision. Consensus (option 4) is overkill — selection is a builder concern, not a finality concern. The payload builder is the single component that decides block composition and order.",
                    },
                    {
                      question: 'When you write a custom precompile for a Reth-based chain, where does the *registration* of that precompile happen?',
                      options: [
                        'In the precompile crate itself, via a static registry',
                        "In the chain's EVM config (a ConfigureEvm impl), which hands revm the active precompile set — gated by the chain's hardfork schedule",
                        "In reth's core, by editing the precompile dispatch table",
                        'In the genesis JSON, as part of the initial code allocation',
                      ],
                      correctIndex: 1,
                      explanation: 'Static registries (option 1) cannot be gated by chain rules. Editing reth core (option 3) is exactly the fork-model anti-pattern we are avoiding. Genesis (option 4) holds state, not protocol-level functions. The EVM config is the right slot: it joins ChainSpec (which fork?) with revm (what runs).',
                    },
                    {
                      question: 'Which of the following best describes the relationship between alphanet and Tempo?',
                      options: [
                        'They are the same project under two names',
                        'alphanet is the test deployment of Tempo',
                        'alphanet is an R&D testnet where Paradigm validates EVM extensions (e.g., custom precompiles) that may later ship in production chains like Tempo or be proposed as Ethereum EIPs',
                        'Tempo is built on alphanet, which is built on Reth',
                        'They are unrelated except for shared maintainership',
                      ],
                      correctIndex: 2,
                      explanation: 'alphanet is the playground; Tempo is a production rail. Option 1 and 2 conflate them. Option 4 has the dependency order wrong — both depend on Reth, not on each other. Option 5 is too weak: the technical lineage of precompile experiments is real and traceable.',
                    },
                    {
                      question: "On a centralized-sequencer L2, what does the payload builder decide that the executor does not?",
                      options: [
                        'The payload builder decides gas pricing; the executor decides ordering',
                        'The payload builder decides which transactions to include in the block and in what order; the executor merely runs whatever the builder hands it, in the given order',
                        "They make identical decisions — the builder is a thin wrapper around the executor",
                        'The payload builder validates signatures; the executor applies state changes',
                      ],
                      correctIndex: 1,
                      explanation: 'Gas pricing (option 1 swap) is mostly chainspec, not builder vs executor. Identical (option 3) is wrong — the separation is the entire point. Signature validation (option 4) is at the executor / tx validator layer, not the builder. The clean split: builder = selection + ordering, executor = run-what-you-are-told.',
                    },
                    {
                      question: 'You open `tempoxyz/tempo` for the first time and want to confirm Paradigm followed the "compose, don\'t fork" model. What is the single highest-signal check?',
                      options: [
                        "Read the README and announcement blog posts",
                        "Open `tempoxyz/reth` and check its commits-ahead/behind count against `paradigmxyz/reth`",
                        "Count the number of crates in the `tempoxyz/tempo` workspace",
                        "Run a benchmark comparing Tempo and upstream Reth throughput",
                      ],
                      correctIndex: 1,
                      explanation: 'README / blog posts (option 1) say the right things but don\'t prove them. Crate count (option 3) is loosely correlated but noisy. Benchmarks (option 4) measure perf, not whether they forked. The fork check (option 2) is the definitive structural test — and the answer is "0 ahead, 1374 behind," which is the strongest empirical proof of the compose-don\'t-fork thesis.',
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
