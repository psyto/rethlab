import { PrismaClient } from '@prisma/client';

export async function seedRethExpertEN(prisma: PrismaClient) {
  const tags = ['reth', 'expert', 'production', 'performance', 'mev'];

  await prisma.course.create({
    data: {
      slug: 'reth-expert-en',
      title: 'Reth Expert — Production Engineering',
      description:
        'Production engineering at L1 scale. 24 lessons across three modules: Performance & Systems (cargo flamegraph + MDBX + Tokio + proc-macros + tracing) / Production Engineering (custom precompiles + MPT + stateless + MEV + zkEVM + production fork + differential fuzzing + EVM privacy + chaos engineering + systems auditing + OSS workflow) / Reth-based Chains (library-not-fork + op-stack-on-reth + custom ChainSpec + Executor + PayloadBuilder + Paradigm stack case study). By the end you operate Reth-based chains in production with confidence.',
      difficulty: 'EXPERT',
      duration: 457,
      xpReward: 1105,
      track: 'reth-expert',
      tags,
      isPublished: true,
      sortOrder: 1400,
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
                  title: 'Lesson 1 — Performance engineering for Reth',
                  slug: 'performance-engineering-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 40,
                  content: `# Lesson 1 — Performance engineering for Reth

## Question

**Reth's perf engineering is the production discipline.** Profile + optimise + measure. The patterns transfer to any Rust system.

## Principle (minimum model)

- **Profile first.** \`cargo flamegraph\` reveals hot paths. Don't guess; measure.
- **Hot paths in Reth.** revm interpreter (~70 % time), MDBX I/O (~15 %), serde (~5 %), other (~10 %). Optimisation effort follows.
- **Optimisation tools.** rayon (parallelism), inline (avoid function call), branchless (avoid mispredict), const fn (compile-time eval).
- **Common patterns.** Pre-allocate Vec capacity; use \`SmallVec<T, N>\` for fixed-size collections; cache hot computations; batch I/O.
- **Profile-guided.** Reth's CI runs benchmarks; regressions blocked at PR-time. Production discipline.
- **Cross-cutting metrics.** Sync time, peak memory, per-stage throughput. Monitored in production.

## Worked example + steps

# Performance engineering for Reth

A Reth fork ships. Block import was 12ms in your benches; in production it's 80ms. Where did the 68ms go? You don't know — because nobody profiled. This is the failure mode this lesson exists to prevent: **invisible slowdowns**, the kind that compound silently until a validator falls 200 blocks behind.

If you're going to ship a Reth fork or write hot-path code in Revm, **profiling and benchmarking are non-negotiable**. Premature optimization is bad; *invisible* slowdowns are worse.


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


### Whole-node benchmarks: snapshot the disk

The anti-fluency prompt above lands the real problem: microbenchmarks don't capture system effects. The fix is to benchmark a whole-node workload, but that needs the same on-disk state every run — and a 500 GB Reth database takes hours to rebuild between runs. Paradigm uses [\`tempoxyz/schelk\`](https://github.com/tempoxyz/schelk) for exactly this: a block-device snapshot/rollback tool that restores the scratch volume by copying only the blocks that the benchmark *wrote* (tracked via \`dm-era\`), so rollback takes seconds instead of hours, and the workload still runs against plain ext4 on real NVMe with no overlay or CoW filesystem in the read path.

The pedagogical point: when you read perf claims about Reth ("we shaved 15% off staged sync"), assume the authors are using something like schelk between runs. A benchmark without rollback discipline is unrepeatable; a benchmark with the wrong rollback (LVM thin overlays, btrfs snapshots) measures the rollback machinery as much as the workload.

> 🔍 **Find in repo.** Open [\`tempoxyz/schelk\`](https://github.com/tempoxyz/schelk) and read \`docs/SKILL.md\`. **Three things will surprise you about how it does rollback.** Name them before continuing — then verify against the repo.

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

> Final check: revisit your "junior engineer wants to swap HashMap for BTreeMap" prediction from the top. Did you cite measurement, profiling, and re-verification? If you cited "well, BTreeMap is sometimes slower" — that's also wrong reasoning, just on the other side. **The point isn't which container; the point is that the question is unanswerable without data.**

You're now equipped to start opening Reth's perf-critical files (\`crates/storage/db\`, \`crates/blockchain-tree\`) with intent rather than just curiosity.

## Summary (3 lines)

- Reth perf = profile (cargo flamegraph) + optimise hot paths (revm 70 % / MDBX 15 %) + measure (CI benchmarks).
- Tools: rayon, inline, branchless, const fn. Patterns: pre-alloc, SmallVec, cache, batch I/O.
- Production discipline; PR-time regression-blocking. Patterns transfer to any Rust system.
`,
                },
                {
                  title: 'Lesson 2 — MDBX & storage internals',
                  slug: 'mdbx-storage-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 40,
                  content: `# Lesson 2 — MDBX & storage internals

## Question

**Reth uses MDBX (libmdbx) for state storage.** B+tree on disk; mmap-backed; COW transactions. Why this choice + production tuning.

## Principle (minimum model)

- **MDBX = libmdbx, a forked Berkeley DB-style B+tree.** Mmap-backed for OS-managed paging.
- **COW (copy-on-write) transactions.** Writers see fresh snapshot; readers see consistent old snapshot. No locks for readers.
- **Why MDBX over RocksDB / LMDB?** Simpler ops profile; better Rust bindings (\`reth-mdbx\`); deterministic perf.
- **Disk format.** Pages (typically 4 KB) organised in a B+tree. Indexes hot data first via key access patterns.
- **Tuning.** map_size (max mmap), sync_period (durability vs perf trade), max readers (concurrency).
- **Production gotchas.** Mmap exhaustion on 32-bit; transaction expiry on long-running reads; cache size for high-traffic keys.
- **Reth conventions.** Table per data type (accounts / storage / receipts); per-table compaction.

## Worked example + steps

# MDBX & storage internals

Every account balance, every storage slot, every receipt — Reth keeps all of it in **one** key-value store: **MDBX**. Not Postgres, not RocksDB, not a custom format. MDBX is a memory-mapped B+tree (a balanced tree where each node holds multiple keys to fit a disk page) descended from LMDB. The whole 500GB database is exposed to your Rust code as if it were a giant in-memory slice — the OS handles the disk-vs-RAM dance through mmap.

Understanding MDBX is what separates "I can use Reth" from "I can extend Reth."


## 1. Why MDBX (not LevelDB / RocksDB)?

| Feature | RocksDB | MDBX |
| :--- | :--- | :--- |
| **Architecture** | LSM tree | **B+tree, mmap'd** |
| **Read latency** | Variable (compactions) | **Predictable** |
| **Write amplification** | High | **~1x** |
| **Crash safety** | Manual flush | **ACID via MVCC** |
| **Read concurrency** | Locks | **Lock-free reads** |

Reth picks MDBX because Ethereum is **read-heavy** and **latency-sensitive**. LSM trees (the log-structured-merge design RocksDB and LevelDB use — fast writes, periodic background rewrites) do well at writes but **stall on compactions** — the moments where they pause everything to rewrite tiers — and those stalls are fatal for sync speed and validator latency.


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

Four things matter most:

### \`<T: Table>\` — table is a type, not a string

Each table is a Rust **type** that implements the \`Table\` trait. The compiler enforces "key/value types must match this table's schema." **A typo in a table name is a compile error.**

### \`append\` vs \`put\`

\`put\` works for any key. \`append\` is **only valid when the key is greater than the current max** — but it's faster because it skips a B+tree search. When you're processing blocks sequentially, you use \`append\`; when reorging, you fall back to \`put\`.


### Cursors

For range scans, you use a **cursor** instead of repeated \`get\` calls. A cursor positions itself in the B+tree once and walks neighboring entries — orders of magnitude faster than independent gets, because adjacent keys likely share the same page.


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

## 6. The comparator: MegaETH's SALT

MDBX is the right default for a vanilla Reth node. But "right default" is not the same as "right for every chain." MegaETH replaced MDBX entirely with **[SALT](https://github.com/megaeth-labs/salt)** (Small Authentication Large Trie) to push throughput beyond what a disk-backed B+tree allows.

The design contrast is worth holding in your head when you read either:

| Aspect | **MDBX** (Reth default) | **SALT** (MegaETH) |
| :--- | :--- | :--- |
| Form | Memory-mapped B+tree | Two-tier: 4-level complete 256-ary trie + SHI hash-table buckets |
| Storage model | All data on disk, OS pages it in via mmap | Authentication layer lives **fully in memory** (~1 GB per 3 B items); data sits in buckets |
| State-root update | Walks the MPT, touches many random disk pages | Bucket-local updates; eliminates random disk I/O during root recomputation |
| Trie shape | None — Reth maintains the MPT separately on top of MDBX | Trie *is* the storage; commitments are intrinsic |
| Insertion-order invariance | N/A (KV agnostic) | SHI (Strongly History-Independent) — canonical commitment regardless of insertion order |
| Strengths | Mature, crash-safe, ACID, deep tool ecosystem | Memory-efficient authentication at billion-scale, no random disk I/O on state roots |
| Trade-offs | Random I/O during state root updates becomes the bottleneck at high TPS | New (~2026 design), narrower deployment, sensitive to memory pressure |

The pedagogical point is **not** "SALT is better." It's that MDBX's design assumptions become visible only when you see what someone else chose differently and why. If you've only ever read one storage layer, you can't tell which decisions are essential vs. accidental.

Read [\`megaeth-labs/salt\`](https://github.com/megaeth-labs/salt) alongside Reth's MDBX wrapper. The questions that surface when you do — "where does Reth pay for crash safety we don't need at high TPS?" "what does SALT give up to fit authentication in memory?" — are the design questions you'll face when extending Reth's storage layer for your own chain.

## Drill

Open [\`crates/storage/db-api/src/tables\`](https://github.com/paradigmxyz/reth/tree/main/crates/storage/db-api/src/tables) in the repo:


1. Find the \`Headers\` table — note its key (\`BlockNumber\`) and value (\`Header\`)
2. Find a \`DupSort\` table — these are tables where one key has multiple values. **Why does \`DupSort\` exist? What kind of data needs it?**
3. Trace one Execution-stage read through: which tables does it consult, in what order?

You'll come out the other side knowing where every byte of Ethereum state lives in Reth.

> Final check: in one sentence, why does mmap let you treat a 500GB DB like a Rust slice? **Where does the OS fit in?** If you can't explain the page-fault → page-load mechanism, the "pointer dereference, not syscall" claim is words to you, not understanding.

## Summary (3 lines)

- MDBX = libmdbx (forked Berkeley DB-style B+tree). Mmap-backed; COW transactions; no reader locks.
- Tuning: map_size + sync_period + max readers. Gotchas: mmap on 32-bit + long-running reads.
- Reth: table per data type + per-table compaction. Deterministic perf.
`,
                },
                {
                  title: 'Lesson 3 — Tokio runtime internals',
                  slug: 'tokio-internals-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 40,
                  content: `# Lesson 3 — Tokio runtime internals

## Question

**Reth runs on Tokio.** Understanding Tokio's internals = understanding Reth's parallelism. Work-stealing scheduler + reactors.

## Principle (minimum model)

- **Tokio runtime structure.** N worker threads (CPU-bound) + 1 reactor thread (I/O-bound). Default to CPUs.
- **Work-stealing scheduler.** Each worker has a queue; idle workers steal from busy ones. Balances load automatically.
- **Async tasks vs blocking.** Async = green-thread on worker pool; blocking = \`tokio::task::spawn_blocking\` on separate thread pool. Don't mix.
- **Reth conventions.** Per-component async; CPU-bound (revm exec) wrapped in \`spawn_blocking\`. Pattern transfers.
- **Reactor.** Polls epoll/kqueue for I/O readiness; wakes appropriate task. Single thread; high throughput.
- **Pitfalls.** Holding std Mutex across \`.await\` = deadlock. Use \`tokio::sync::Mutex\` for async-safe.
- **Performance.** Tokio's scheduler overhead is ~1 µs per task switch. Compare to OS threads (~10 µs). Wins on high-task-count.

## Worked example + steps

# Tokio runtime internals

You've been writing \`#[tokio::main]\` and sprinkling \`.await\` over every async call. Reth has 200+ of those scattered through its codebase, and at peak load it handles thousands of concurrent peer connections plus dozens of background tasks on **8 worker threads**. No magic; just a state machine the compiler wrote for you, a work-stealing scheduler, and an epoll loop. This lesson is what's underneath the \`.await\`.


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

> Final check: in one sentence, what's the difference between \`async fn\` and \`fn\` *as Rust types*? If your answer is "one returns a Future and one doesn't," go deeper — what *is* a Future, structurally? **The lesson isn't done with you until "Tokio is magic" becomes "Tokio polls compiler-generated state machines on a work-stealing scheduler."**

## Summary (3 lines)

- Tokio = N work-stealing workers + 1 reactor. Worker = async tasks; reactor = epoll/kqueue I/O.
- CPU-bound code → \`spawn_blocking\`; async → worker pool. Std Mutex across await = deadlock.
- Reth conventions: per-component async, revm exec wrapped in spawn_blocking. ~1 µs task switch.
`,
                },
                {
                  title: 'Lesson 4 — Procedural macros — how `sol!` and `address!` work',
                  slug: 'procedural-macros-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 15,
                  xpReward: 35,
                  content: `# Lesson 4 — Procedural macros — how \`sol!\` and \`address!\` work

## Question

**Procedural macros generate Rust code at compile time.** \`sol!\` macro turns Solidity ABI into Rust types; \`address!\` validates addresses at compile time.

## Principle (minimum model)

- **\`sol! { contract Foo { ... } }\`** = expand to Rust types matching the Solidity interface. \`Foo::Bar\` becomes a Rust struct.
- **How it works.** Macro parses Solidity → generates Rust AST → injects into surrounding code. Compile-time expansion.
- **\`address!("0x...")\`** = parse the address at compile time. Invalid address → compile error, not runtime.
- **Why proc-macros.** Compile-time validation catches mistakes early; generated code is zero-cost.
- **Implementation.** Each proc-macro is a separate Rust crate with \`proc-macro = true\`. \`syn\` for parsing, \`quote\` for code-gen.
- **Common patterns.** Derive macros (\`#[derive(...)]\`) generate trait impls. Attribute macros (\`#[some_attr]\`) wrap items. Function-like (\`sol! { ... }\`) replace with code.
- **Reading proc-macro source.** Read top-down: input AST → transformation → output code. \`cargo expand\` shows the result.

## Worked example + steps

# Procedural macros — how \`sol!\` and \`address!\` work

\`address!("0xabc...")\` looks like a function call but **runs at compile time**. So does \`sol! { contract IERC20 { ... } }\`.


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

Now you can read what your macro is producing and pinpoint any wrong codegen.

> Final check: explain in one sentence the difference between \`macro_rules!\` and a procedural macro. If your answer is just "one's older," go deeper — what does each operate on, and where does each run? **The Rust ecosystem is built on this distinction; without it, you can't read the code that builds your binary.**

## Summary (3 lines)

- Proc-macros = compile-time code generation. \`sol! { ... }\` → Rust types from Solidity ABI; \`address!("0x...")\` → compile-time validation.
- Three flavours: derive (\`#[derive(...)]\`) / attribute (\`#[some_attr]\`) / function-like (\`sol! { ... }\`).
- Build with \`syn\` (parse) + \`quote\` (gen). \`cargo expand\` shows expanded code. Zero-cost at runtime.
`,
                },
                {
                  title: 'Lesson 5 — Tracing internals — how Reth observes itself',
                  slug: 'tracing-internals-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 20,
                  xpReward: 45,
                  content: `# Lesson 5 — Tracing internals — how Reth observes itself

## Question

**Reth uses the \`tracing\` crate for observability.** Spans + events + structured logging. Production tooling for diagnosing distributed systems.

## Principle (minimum model)

- **\`tracing\` crate.** Structured logging with spans (parent-child relationships). Each request → a span; each event → in that span.
- **\`#[tracing::instrument]\`.** Wraps a function in a span. Captures arguments + duration. Hot paths: don't use without sampling.
- **Subscribers.** Process events; output to stdout / files / OpenTelemetry. \`tracing-subscriber\` provides defaults.
- **OpenTelemetry export.** Send spans to Jaeger / Tempo (the cloud service, not the L1). Distributed trace viewing.
- **Levels.** \`trace\` (everything) / \`debug\` (dev) / \`info\` (key events) / \`warn\` (issues) / \`error\` (failures). Production runs at \`info\`.
- **Filter via env.** \`RUST_LOG=reth=info,reth_network=debug\`. Per-crate granularity. Production tunable.
- **Performance.** Disabled spans are zero-cost (compiled out). Enabled spans = ~50 ns per span. Hot-path: use \`target_level\`.

## Worked example + steps

# Tracing internals — how Reth observes itself

Performance tuning, debugging a deadlock, diagnosing why a stage suddenly stalls — all of these require **the node telling you what it's doing**. Reth's answer is \`tracing\`, the Rust ecosystem's structured-logging crate. Every interesting code path in Reth is instrumented with \`tracing\` spans and events, and the whole observability surface (logs, metrics, distributed tracing) is built on top of one consistent foundation. This lesson is how it works and how you extend it.

> 📌 **Why this sits in Performance & Systems.** You can't optimize what you can't measure. \`tracing\` is the measurement layer. Every performance lesson that comes after this — flamegraphs, MDBX tuning, Tokio runtime work — assumes you can pull the right signal out of a running node, and that pulling is via \`tracing\`.

## 1. The \`tracing\` crate's two primitives

The whole ecosystem reduces to two ideas:

- **Span** — a *region* of execution. "I am inside \`SenderRecoveryStage::execute\` for blocks 100..200." Spans nest; they capture context (block range, peer ID, request ID) that flows to every log line inside them.
- **Event** — a *point-in-time* log line. "I just committed batch 17 with 12,000 senders." Events fire inside the currently-active span and inherit its context.

In code:

\`\`\`rust
use tracing::{info, debug, instrument};

#[instrument(skip(self, provider))]
async fn execute(&mut self, provider: &Provider, input: ExecInput) -> Result<ExecOutput> {
    let span = tracing::info_span!("execute", target = ?input.target);
    let _enter = span.enter();

    debug!("starting sender recovery");
    let batches = self.compute_batches(input).await?;
    info!(num_batches = batches.len(), "computed batches");

    for batch in batches {
        let _bspan = tracing::info_span!("batch", n = batch.id).entered();
        process_batch(batch).await?;
        info!("batch committed");
    }
    Ok(...)
}
\`\`\`

\`#[instrument]\` is a procedural macro (the previous lesson covered the genre) that wraps the function body in a span automatically. \`info!\` and \`debug!\` emit events at different levels. **Every log line a Reth user ever sees comes from one of these two primitives.**

## 2. Levels and the \`RUST_LOG\` filter

Events have levels (\`error\`, \`warn\`, \`info\`, \`debug\`, \`trace\`). The user picks which levels to print at runtime via the \`RUST_LOG\` environment variable:

\`\`\`bash
# Show info+ globally, but debug+ for the stages module
RUST_LOG=info,reth_stages=debug cargo run --bin reth -- node

# Show everything from one specific module
RUST_LOG=reth_exex=trace cargo run --bin reth -- node

# Combine targets
RUST_LOG=info,reth_stages=debug,reth_exex=trace,reth_network=warn
\`\`\`

The matching engine is \`EnvFilter\` (from \`tracing-subscriber\`). It matches against the **module path** of each event/span, which Rust derives from the crate + module hierarchy. \`reth_stages=debug\` means "for any event whose module path starts with \`reth_stages\`, show debug-level and above."


Approximately: \`RUST_LOG=warn,reth_stages::stages::sender_recovery=debug\` — warn level globally (catches anything critical from other modules), debug for the exact stage you're investigating. The module path comes from the file's location in the crate (\`reth-stages\` crate → \`stages\` module → \`sender_recovery\` sub-module). **Surgical filtering is the whole point.**

## 3. The subscriber: where events go

The \`tracing\` crate only *records* events. A separate **subscriber** (from \`tracing-subscriber\`) decides what to do with them:

| Subscriber | What it does | When to use |
| :--- | :--- | :--- |
| **\`fmt\`** | Pretty-prints to stdout/stderr | Local development, CLI debugging |
| **\`json\`** | Structured JSON output (one event per line) | Production log shipping (Datadog, Loki, ELK) |
| **\`opentelemetry\`** | Exports to an OTLP collector | Distributed tracing across multiple services |
| **Custom layer** | Hook into events, send to metrics / DB / pager | Building observability infrastructure |

Reth's \`main\` initializes a subscriber early:

\`\`\`rust
use tracing_subscriber::{fmt, EnvFilter};

tracing_subscriber::registry()
    .with(EnvFilter::from_default_env())  // RUST_LOG honored
    .with(fmt::layer())                    // pretty stdout
    .init();
\`\`\`

The \`registry()\` + \`.with(...)\` pattern is composable. You can stack \`fmt\` (for humans) AND \`json\` (for log shipping) AND a metrics layer (for Prometheus counts) on the same event stream. Each layer sees every event and decides what to do.

## 4. Spans and async — the part that bites

The trick that makes \`tracing\` work across async boundaries: spans are \`Send\` and have lifetimes. When you \`.enter()\` a span, it activates *for the current thread*. If an async task suspends and resumes on a different thread, you need spans to follow.

\`tracing\` solves this with **the \`Instrumented\` future wrapper** (used internally by \`#[instrument]\`):

\`\`\`rust
// Naive — span only active on first poll
async fn naive(input: Input) {
    let _span = tracing::info_span!("naive").entered();
    do_thing(input).await;  // span dropped before await resumes!
}

// Correct — span lifetime tied to the future itself
async fn correct(input: Input) {
    async {
        do_thing(input).await;
    }.instrument(tracing::info_span!("correct")).await;
}

// Or just use the macro
#[instrument]
async fn easy(input: Input) {
    do_thing(input).await;
}
\`\`\`

**Forgetting this is the #1 \`tracing\` bug in Rust async code.** Your logs say "I started processing batch 17" and then nothing — because the span exited when the function suspended, and you never instrumented the suspended portion.

> 🔍 **Find in repo.** Open Reth's source and search for \`#[instrument(\`. Notice it's used everywhere async work happens. Each \`#[instrument]\` annotation wraps the function's future so the span survives await points.

## 5. The metrics integration

Reth doesn't only emit logs — it also exposes Prometheus metrics. **Both come from the same \`tracing\` substrate.** The metrics layer subscribes to events at specific targets (e.g., \`reth_metrics=info\`) and translates them into counters / histograms.

\`\`\`rust
use tracing::info;
use reth_metrics::metrics::counter;

// Direct metric (preferred for hot paths)
counter!("reth_blocks_processed").increment(1);

// Via tracing (sampled by metrics layer)
info!(target: "reth_metrics", block_number = block.number, "block processed");
\`\`\`

In production Reth deployments, you scrape \`http://node:9001/metrics\` with Prometheus, build Grafana dashboards on top, and alert on slow stages, peer disconnections, RPC error rates. **The instrumentation in source is what makes that dashboard possible.** Skip it and you can't see your node.

## 6. Distributed tracing — when the node is one of many

Reth integrates with [OpenTelemetry](https://opentelemetry.io/) for distributed tracing. When your indexer (built on ExEx) processes a notification that originated from the node, you want the trace span to **carry across the process boundary** so a single request shows up as one trace in Jaeger / Tempo / Datadog APM.

Setup:

\`\`\`rust
use tracing_subscriber::prelude::*;
use opentelemetry_otlp::WithExportConfig;

let otlp_exporter = opentelemetry_otlp::new_pipeline()
    .tracing()
    .with_exporter(opentelemetry_otlp::new_exporter().tonic().with_endpoint("http://collector:4317"))
    .install_batch(opentelemetry::runtime::Tokio)
    .unwrap();

tracing_subscriber::registry()
    .with(EnvFilter::from_default_env())
    .with(fmt::layer())
    .with(tracing_opentelemetry::layer().with_tracer(otlp_exporter))  // ← OTel export
    .init();
\`\`\`

Now every \`tracing\` span gets exported as an OTLP span. The OTLP collector aggregates spans from multiple processes (the Reth node + your downstream services) by trace ID. **You see the full request path across N processes in one Jaeger view.** This is how MEV teams trace a mempool-to-bundle pipeline that crosses 3+ services.

## 7. The performance cost

\`tracing\` is *not free*. Each event involves at minimum:

- A check whether the event level passes the current filter
- If yes, allocation of a structured event record
- Dispatch to each subscriber layer

For \`info\` and above, this is fine for the hottest production loop. **\`debug\` and \`trace\` are different** — leaving \`trace\` enabled in revm's interpreter loop will tank throughput by 10×+ because every opcode emits an event.

The discipline:

- **Hot path code uses \`trace!\` for the deepest detail.** Leave it off in production.
- **Per-block / per-tx code uses \`debug!\` for normal operation diagnostics.** Enable selectively when investigating.
- **Per-stage / per-batch code uses \`info!\`.** Always on in production.
- **Errors and warnings use \`warn!\` / \`error!\`.** Always on.

This level discipline is what makes \`tracing\` viable in a production high-throughput node. Get it wrong and your observability tool becomes a performance liability.


Because \`debug\` is *not* statically compiled out — even if \`RUST_LOG\` disables it, the level check still happens for every event. In a function that runs millions of times per block, that check itself becomes a measurable cost. The calls should be \`trace!\`, which can be compiled out entirely via the \`max_level_*\` cargo features in production builds.

## Drill

1. **Run Reth with surgical filtering.** Boot \`reth node --dev\` with three different \`RUST_LOG\` settings: (a) \`info\`, (b) \`info,reth_stages=debug\`, (c) \`reth_exex=trace\`. **Observe how the output volume and content shifts.** 20 minutes.
2. **Find an \`#[instrument]\` in source.** Open Reth, search \`#[instrument(\`. Pick one. Read the function. **What span fields does the macro auto-include? What does it skip via \`skip(...)\`?** 30 minutes.
3. **Add a custom span to a small Rust program.** Use \`tracing\` + \`tracing-subscriber\` in a hello-world. Add \`#[instrument]\` on a function and observe the indented output. **Notice how spans nest.** 30 minutes.
4. **Hit Reth's Prometheus endpoint.** With Reth running, \`curl http://localhost:9001/metrics\`. Find a metric whose label says "stage" or "sync" — that's a \`tracing\`-derived counter or histogram. Trace it back to the source event. 45 minutes.

After this you can read every observability story in Reth's source, instrument your own custom stages / ExEx with the same idiom, and pull production diagnostics from a running node without changing code.


## 📺 Further reading

- [\`tracing\` crate docs](https://docs.rs/tracing/latest/tracing/)
- [\`tracing-subscriber\` patterns](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/)
- [Tokio Console](https://github.com/tokio-rs/console) — interactive async-runtime inspector built on the same \`tracing\` substrate

## Summary (3 lines)

- \`tracing\` = structured logging with spans (parent-child). \`#[tracing::instrument]\` wraps function in span.
- Subscribers process events; OpenTelemetry export → Jaeger / Grafana Tempo. Levels: trace / debug / info / warn / error.
- \`RUST_LOG=reth=info,reth_network=debug\` filter per-crate. Disabled spans = zero-cost; enabled = ~50 ns.
`,
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
                  title: 'Lesson 6 — Custom precompiles',
                  slug: 'custom-precompiles-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 35,
                  content: `# Lesson 6 — Custom precompiles

## Question

**Precompiles = built-in Solidity functions at magic addresses (0x01-0x09).** Add your own = extend the EVM for chain-specific operations.

## Principle (minimum model)

- **Precompile architecture.** Address (e.g. 0x1A) + Rust function \`fn(input: &[u8], gas_limit: u64) -> (Bytes, u64)\`. Returns output + gas used.
- **Why precompiles.** Common operations too slow in pure Solidity (e.g. ed25519 verify); shared utility (CLOB ops); chain-specific (HyperEVM order placement).
- **Integration via revm.** \`EvmConfig::with_precompiles(custom_precompiles)\`. Revm dispatches to your function at the address.
- **Gas cost.** Determined by you. Underprice → DoS; overprice → unusable. Benchmark.
- **Failure semantics.** Return empty Bytes + gas charge OR revert. Pick deliberate semantics.
- **Production examples.** Hyperliquid CLOB precompiles (0xCL...AB read best bid; 0xCL...C1 place order). Tempo merchant attestation precompile.
- **Tests.** Deploy a Solidity contract that calls the precompile; assert correct output + gas charge.

## Worked example + steps

# Custom precompiles

You want SHA-256 inside the EVM. Two roads: add a new **opcode** (a new byte in the instruction stream — \`SHA256\` next to \`ADD\`), or add a **precompile** (a native Rust function the EVM calls when a contract does \`CALL 0x00...02\`). Real Ethereum picked the second: precompiles at addresses \`0x01\` through \`0x0a\` cover ecrecover, sha256, modexp, and the BN254 elliptic-curve ops. Foundry's cheatcodes (\`vm.deal\`, \`vm.warp\`) are the same trick at industrial scale.

Custom opcodes break consensus with every wallet, indexer, and Solidity compiler on the planet. Custom precompiles **don't**. This lesson is why the answer is different, and how to register one.


## 1. Opcode vs precompile

| | Opcode | Precompile |
| :--- | :--- | :--- |
| **Invocation** | bytecode instruction | \`CALL\` to a special address |
| **Adding** | modifies interpreter | adds an entry in the precompile registry |
| **Tooling impact** | breaks Solidity, ABIs | mostly transparent |
| **Use case** | tight inner loops | heavy operations like pairings, hashing |

Real Ethereum already has precompiles at addresses 0x01–0x0a (ecrecover, sha256, ripemd160, identity, modexp, BN254 ops, BLAKE2F, point eval).

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

After this, your precompile is cheap to use in normal code and prohibitively expensive to abuse.

> Final check: you ship a precompile at gas cost = 100. An attacker discovers an input shape that takes **10x normal CPU time** at the same 100 gas. **What's the economic attack? How much does it cost the attacker per second of node CPU?** If you can't sketch the math, you can't safely price a precompile — re-read Section 6 and Ethereum's EIP-2929 for what real underpricing has cost mainnet.

## Summary (3 lines)

- Custom precompile = address + Rust function (input, gas_limit) → (output, gas_used). Magic-address dispatch via revm.
- Why: too-slow in Solidity (crypto) + shared utility (CLOB ops) + chain-specific (HyperEVM ops).
- Gas cost benchmarked; failure semantics deliberate. Production: Hyperliquid CLOB + Tempo attestation precompiles.
`,
                },
                {
                  title: 'Lesson 7 — Merkle Patricia Trie & state proofs',
                  slug: 'mpt-state-proofs-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 40,
                  content: `# Lesson 7 — Merkle Patricia Trie & state proofs

## Question

**MPT = Ethereum's state structure**. Modified Patricia Trie + Merkle hash → verifiable state. Generate + verify state proofs.

## Principle (minimum model)

- **Trie structure.** Branches + extensions + leaves. Hash up via keccak; root in block header.
- **State proof = path from root to leaf.** Includes hashes of sibling nodes; allows verification without full state.
- **\`AccountProof\` type.** Account info + storage proof + balance + nonce + code hash. Lets a light client verify "this account has this balance".
- **Use cases.** Light clients (Helios), zkEVM verification, cross-chain proofs (Cosmos IBC pattern).
- **Performance.** Generation: ~10 ms per account. Verification: ~5 ms.
- **Stateless verification.** Future direction. Have ProverChain produce trie proofs + execution proof; consumer chain verifies without state.
- **Reth's impl.** \`reth-mpt\` crate; uses MDBX for trie storage. Production-tuned.

## Worked example + steps

# Merkle Patricia Trie & state proofs

A phone-sized device wants to know "does Alice's account hold 1 ETH?" — and it cannot store Ethereum's 500GB state. So it asks a full node, which sends back **a few hundred bytes**. The phone runs a hash loop, compares the result to **32 trusted bytes** it already knows, and gets a cryptographic answer: yes or no. That's a light client. The 32 trusted bytes are Ethereum's **stateRoot**, and the data structure that makes this work is the **Merkle Patricia Trie (MPT)**.

Understand the MPT and you understand state roots, light clients, witnesses, \`eth_getProof\`, and the entire stateless-client roadmap. You can also write your own.


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

Do this and \`eth_getProof\` becomes a structure you can reason about, write, and debug — not magic.

> Final check: in two sentences, explain why a state proof gives a stronger guarantee than "trust me, I'm a node operator." What property does Merkle hashing give you that a non-cryptographic claim cannot? **The lesson isn't done with you until you can argue this convincingly to someone who has never used a light client.**

## Summary (3 lines)

- MPT = branch + extension + leaf, keccak-hashed up to root in block header. State proof = path from root to leaf.
- AccountProof type lets light clients verify balances. Gen ~10 ms; verify ~5 ms.
- Use cases: light clients, zkEVM, cross-chain. Reth: reth-mpt crate, MDBX-backed. Stateless verification is the future direction.
`,
                },
                {
                  title: 'Lesson 8 — Stateless Ethereum — reading ress and stateless-validator side by side',
                  slug: 'stateless-ethereum-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 45,
                  content: `# Lesson 8 — Stateless Ethereum — reading ress and stateless-validator side by side

## Question

**Stateless Ethereum = validators run without state**. Provers generate witness data + execution proof; validators verify with no DB. Read the two reference impls side by side.

## Principle (minimum model)

- **Stateless validator.** Receives (block + state proof + execution proof) → verifies → finalises. No state DB; no MPT.
- **Prover side.** Has the state; computes the trie proof + execution proof for each block. Heavier compute; lighter consumers.
- **Reference impl 1: \`ress\`.** Ethereum Foundation's stateless-validator reference. Verkle-tree-based (next-gen of MPT).
- **Reference impl 2: \`stateless-validator\` (reth).** Reth's stateless mode. MPT-based; production-tuneable.
- **Trade-off.** Verkle (smaller proofs, harder DX) vs MPT (larger proofs, more compat).
- **Hardware cost.** Stateless validator runs on a Raspberry Pi; full validator needs SSD + RAM.
- **Future.** Pectra / Prague hard fork will enable stateless verification. Major shift in chain economics.
- **Production impact.** Smaller validators → more decentralisation. Lower hardware cost → more participation.

## Worked example + steps

# Stateless Ethereum — reading ress and stateless-validator side by side

A full Reth node on mainnet today wants **~3 TB of disk** and the IOPS that match. Most of the people reading this lesson can't run one — not on a laptop, not on a typical VPS, not even on a hobbyist NUC. So the people who *do* run them become a small priesthood, and Ethereum's "anyone can verify" claim quietly stops being true at the validator layer.

A **stateless client** is the way out. Paradigm's [\`ress\`](https://github.com/paradigmxyz/ress) re-validates every mainnet block with **14 GB** of disk. MegaETH's [\`stateless-validator\`](https://github.com/megaeth-labs/stateless-validator) re-validates an entire high-TPS L2 on commodity hardware. Both are Rust. Both verify Ethereum-equivalent state transitions. They made **different design choices** at every interesting layer — and reading them side by side is the cheapest way to learn what those choices even are.


## 1. Why stateless matters beyond "less disk"

The Paradigm [blog post that ships with ress](https://www.paradigm.xyz/2025/03/stateless-reth-nodes) names four use cases. None of them is "save a hard drive."

- **L1 decentralization.** Anyone with a laptop can run a fully validating execution client. Validator set is no longer hardware-gated.
- **L1 gas scaling.** Today the gas limit is bottlenecked on what a *stateful* full node can keep up with — random-I/O for state reads dominates. A stateless verifier reads the witness from memory; the I/O ceiling moves.
- **Optimistic L2 security.** Fraud-proof watchtowers don't want to run \`reth\` for every L2 chain they watch. A stateless verifier per chain is cheap.
- **Native rollups.** The "EVM as a service" direction Vitalik described needs a re-executable verifier embedded in L1 — and that verifier can't carry a 3 TB state.

So stateless is not a "small node" feature. It's a **verifier-layer feature** for a particular class of clients that need to re-execute Ethereum cheaply, repeatedly, possibly inside a zkVM, possibly on hundreds of chains at once.

## 2. What "stateless" means, precisely

A stateless client validates a block **without holding the entire world state in storage**. To do that, every state read the block performs (and the post-state root it has to recompute) must come from a **witness** — a cryptographic bundle proving, against the *previous* block's trusted state root, exactly what values were at the slots the block touches.

The stateless party never sees the rest of the state. It does see — and re-derive — the post-state root, which then becomes the trusted root for the *next* witness.

The witness has to come from somewhere. In every stateless design, **some non-stateless party** (a Reth full node in ress's case, a MegaETH sequencer in stateless-validator's case) generates it. That asymmetry is the whole bargain: a small number of stateful witness-providers makes a much larger number of stateless verifiers possible.


## 3. Two independent implementations

Two production Rust stateless clients exist as of 2026. They were built by different teams, for different chains, with different priorities. **That's the gift** — most curricula get one reference implementation to study. We get two.

### Paradigm's \`ress\` (Reth Stateless)

- **Repo:** [\`paradigmxyz/ress\`](https://github.com/paradigmxyz/ress)
- **Target chain:** Ethereum mainnet, fully validating.
- **Disk:** 14 GB (vs ~3 TB for full Reth).
- **Witness source:** any full Reth node running with \`--ress.enable\`. Ress peers with it over a dedicated RLPx subprotocol named \`ress\` — see [\`crates/ress/protocol\` in Reth](https://github.com/paradigmxyz/ress).
- **Witness format:** Merkle Patricia Trie proofs (the format you saw in the MPT lesson — same \`AccountProof\` / \`StorageProof\` shape).
- **Bytecode:** fetched from the stateful peer **on demand** (via a separate \`GetBytecode\` message). Ress caches what it has seen; missing entries pull from the peer.
- **Validation flow:** consensus client sends \`NewPayload\` → ress requests witness + missing bytecode from a Reth peer → validates payload in memory → returns \`PayloadStatus\`.
- **Production status:** experimental, but the team ran ress-backed validators on Holesky and passed 206 of 226 Hive Cancun tests.

### MegaETH's \`stateless-validator\`

- **Repo:** [\`megaeth-labs/stateless-validator\`](https://github.com/megaeth-labs/stateless-validator)
- **Target chain:** MegaETH (a high-TPS Ethereum-compatible L2, OP-Stack-derived).
- **Witness source:** the MegaETH sequencer, served via a dedicated witness RPC endpoint (\`--witness-endpoint\`).
- **Witness format:** **SALT** proofs, not MPT — see [\`megaeth-labs/salt\`](https://github.com/megaeth-labs/salt). SALT is a static 4-level 256-ary trie whose leaves are SHI hash-table buckets, committed with **Banderwagon + IPA** — Banderwagon is a prime-order elliptic curve derived from Bandersnatch (a curve defined over BLS12-381's scalar field, picked for vector-commitment efficiency); IPA is Inner Product Argument, a logarithmic-size proof primitive originally from Bulletproofs and reused in Ethereum's Verkle tree research. ~1 GB of memory authenticates 3 billion items.
- **Bytecode:** **partial statelessness.** Contract code is NOT in the witness. The validator fetches bytecode on demand from a public RPC and caches it locally in a bounded \`ContractCache\` (\`crates/stateless-db/src/cache.rs\`).
- **Validation flow:** three-stage pipeline (FETCH → PROCESS → ADVANCE) in [\`crates/stateless-core/src/pipeline\`](https://github.com/megaeth-labs/stateless-validator/tree/main/crates/stateless-core/src/pipeline). Multiple validation workers run in parallel on different blocks — embarrassingly parallel because each block has its own witness and its own pre-state root.
- **Execution engine:** **pluggable**. Default is vanilla revm. A second backend uses the formal [K semantics of the EVM](https://github.com/Pi-Squared-Inc/evm-semantics) developed with Pi². Together with the JIT-compiled sequencer executor, that gives MegaETH **three independent client implementations** of the same state transition function.
- **Trust model:** the validator only checks the state transition. Canonicality comes from \`op-node\` deriving the L2 chain from L1 + DA — that's what makes the validator *trust-minimized*, not just trustless against a single RPC provider.

> 🔍 **Find in repo.** Open [\`bin/stateless-validator/src/app.rs\`](https://github.com/megaeth-labs/stateless-validator/blob/main/bin/stateless-validator/src/app.rs) and find where the validator wires up the pipeline. Compare against ress's main entry — what does each treat as the "outer loop" of the node?

## 4. Side-by-side

| Aspect | \`ress\` (Paradigm) | \`stateless-validator\` (MegaETH) |
| :--- | :--- | :--- |
| **Target chain** | Ethereum mainnet (L1) | MegaETH (L2) |
| **Witness format** | MPT proofs | SALT proofs (Banderwagon + IPA) |
| **Witness source** | Reth peer over \`ress\` RLPx subprotocol | Sequencer over JSON-RPC \`--witness-endpoint\` |
| **Bytecode handling** | Fetched on demand from peer, cached | Fetched on demand from RPC, cached in \`ContractCache\` |
| **Statelessness** | Full (state) | **Partial** — state is stateless, bytecode is not |
| **Execution engine** | revm (single) | revm **and** formal K-semantics (pluggable) |
| **Parallelism** | One block at a time (CL pacing) | Embarrassingly parallel across blocks (N workers) |
| **Canonicality** | Trusts consensus client (Engine API) | Trusts \`op-node\` (L1 + DA derivation) |
| **Disk footprint** | ~14 GB | Bounded by \`ContractCache\` + redb metadata |

## 5. Predict why partial statelessness


The MegaETH README spells it out: contract code **changes infrequently** compared to state. Hot DeFi contracts emit and read state every block; their bytecode hasn't changed since deployment. Embedding bytecode in every witness re-ships the same hundred kilobytes block after block. Fetching it once and caching locally is the obvious move — *if* you're willing to accept that the validator now has a small persistent store (it does — the bounded \`ContractCache\` in \`crates/stateless-db/src/cache.rs\`).

Ress doesn't get the same easy win because it's targeting mainnet, where one chain's worth of contract code is large but not unbounded, and the symmetry of "everything comes from one peer" simplifies the protocol. Different chain, different trade.

## 6. Predict why two execution engines


A consensus bug in revm is a consensus bug across every Reth fork in existence. If MegaETH ran only revm-derived clients, a single subtle interpreter bug — even one revm shares with itself across versions — could split or freeze the chain with no second opinion available. A formally-specified K-semantics executor disagrees with a buggy revm by *design*: the bug doesn't exist in the math. The MegaETH README calls this the **small Trusted Computing Base** principle and explicitly frames the pluggable engine as preventing single-points-of-failure.

This is also why the validator chose a **single-threaded vanilla revm interpreter and in-memory storage** as the *default* — simplicity over performance, so the TCB is small enough to audit thoroughly. The JIT-compiled sequencer takes the performance hit so the validator doesn't have to.

## 7. What the contrast teaches that one alone can't

If you'd only read ress, you'd come away thinking:

- Witnesses are MPT proofs (they aren't always)
- Stateless means fully stateless (it doesn't have to)
- The execution engine is the EVM's interpreter (it's a choice)
- Stateless clients are paced by the consensus layer (they don't have to be)

If you'd only read stateless-validator, you'd come away thinking:

- Stateless clients always need a custom commitment scheme (mainnet ones use MPT)
- Stateless clients always need an L2-style trust-minimized derivation pipeline (mainnet ones use Engine API)
- Statelessness is L2-shaped (it isn't — Paradigm's pitch is explicitly L1)

The contrast teaches the **degrees of freedom** in stateless design. Every aspect in the table above is a design choice someone made — not a fact about statelessness. When you fork either codebase for your own chain, those are the dials you'll be turning.

> 🔍 **Find in repo.** Open [\`crates/stateless-core/src/evm_database.rs\`](https://github.com/megaeth-labs/stateless-validator/blob/main/crates/stateless-core/src/evm_database.rs) and find \`WitnessDatabase\`. It implements \`revm::DatabaseRef\` — every state read during execution goes through it. **What does it return on a read that isn't in the witness?** That answer is the contract between witness-generation (sequencer) and witness-consumption (validator). The same contract exists in ress, structured differently — find it.

## 8. Recall before you move on

Without scrolling:

1. Why is a stateless client useful beyond saving disk? Name two non-disk use cases.
2. What's the witness, and what does the verifier *cryptographically* check it against before reading any value out of it?
3. \`ress\` and \`stateless-validator\` make opposite calls on bytecode. State the call each made and the workload reason for the difference.
4. Why does MegaETH ship two execution engines for one chain? What failure does that prevent?
5. Of every aspect in the Section 4 table, which **single** difference do you think drives the most downstream design? Argue your pick in one sentence.

If 1–4 are shaky, scroll back. If you can't argue 5, **you haven't internalized the contrast yet** — the table is a flat list, but every row is connected to several others, and the lesson isn't done with you until you can trace at least two of those connections.

## Further reading

- [Paradigm blog: Stateless Reth Nodes](https://www.paradigm.xyz/2025/03/stateless-reth-nodes) — the use-case framing in Section 1 comes from here.
- [\`paradigmxyz/ress\`](https://github.com/paradigmxyz/ress) — README, then \`bin/\` entry point, then the RLPx subprotocol in [\`paradigmxyz/reth/crates/ress/protocol\`](https://github.com/paradigmxyz/ress).
- [\`megaeth-labs/stateless-validator\`](https://github.com/megaeth-labs/stateless-validator) — README, then \`crates/stateless-core/src/pipeline\`, then \`crates/stateless-core/src/executor.rs\`.
- [\`megaeth-labs/salt\`](https://github.com/megaeth-labs/salt) — the authenticated KV store that replaces the MPT in MegaETH's witness format.

## Summary (3 lines)

- Stateless Ethereum = validators verify without state. Prover does heavy compute; consumers verify witness + execution proof.
- Two refs: \`ress\` (Verkle) + reth \`stateless-validator\` (MPT). Verkle smaller proofs; MPT more compat.
- Future: Pectra / Prague enables stateless. Major shift: validator hardware cost down, decentralisation up.
`,
                },
                {
                  title: 'Lesson 9 — MEV in practice — mempool, ExEx, simulation',
                  slug: 'mev-in-practice-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 20,
                  xpReward: 45,
                  content: `# Lesson 9 — MEV in practice — mempool, ExEx, simulation

## Question

**MEV in production**: watch mempool + simulate bundles + submit to builder. 3-component pipeline; ~1000 lines of Rust per searcher.

## Principle (minimum model)

- **Mempool watcher.** Subscribe to pending txs; parse for opportunities. Use Alloy.
- **Revm simulation.** Fork mainnet; run candidate bundle through revm; compute profit. Use forked-anvil or CacheDB.
- **Bundle submitter.** Sign + submit to Flashbots / mev-share / custom builder. Use \`eth_sendBundle\`.
- **Strategies.** Liquidation (oracle-driven) + arbitrage (DEX-driven) + sandwich (mempool-driven). Each ~500-1000 lines.
- **Profit optimisation.** Gas + builder tip + slippage. The math is the differentiator.
- **ExEx integration.** Tempo's tidx + MEV searcher = combined on-chain + off-chain analysis. Production trend.
- **Risk.** Front-runner could front-run you. Use private submission (Flashbots) to mitigate.
- **Production realities.** ~$100M / year MEV captured across all searchers. Heavy competition; razor margins.

## Worked example + steps

# MEV in practice — mempool, ExEx, simulation

A pending tx hits the mempool. 80 milliseconds later, your bundle either landed or it didn't — beaten by a competing searcher who decoded the same tx 5ms faster, simulated the outcome 10ms faster, and submitted to the same builder 2ms ahead. MEV (Maximal Extractable Value — the profit a tx-orderer can pull out of pending transactions) is **systems engineering meeting game theory** at single-digit-millisecond timescales. This lesson is the shape of a serious 2026-era pipeline.


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

This is **production-shape MEV decoding**. Two \`flat_map\`s and a \`filter_map\`, stacked:

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

> Final check: your bundle landed in block 1000. The chain reorgs and block 1000 is replaced. **Where is your money — your ETH, the victim's ETH, the gas you paid?** Trace the P&L through the reorg. If you can't, you don't yet understand why the ChainReverted handler exists in ExEx — re-read the Intermediate ExEx lesson.

## Summary (3 lines)

- MEV pipeline = mempool watcher + revm simulation + bundle submitter. ~1000 lines of Rust per strategy.
- Strategies: liquidation / arbitrage / sandwich. Profit math is the differentiator.
- Risk: front-running mitigated via Flashbots private. ExEx + searcher integration = production trend. ~$100M/year captured.
`,
                },
                {
                  title: 'Lesson 10 — zkEVM with Revm',
                  slug: 'zkevm-revm-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 15,
                  xpReward: 35,
                  content: `# Lesson 10 — zkEVM with Revm

## Question

**zkEVMs prove EVM execution via ZK SNARKs.** Revm runs the execution; ZK circuit verifies the trace. ~1 minute proof generation per block.

## Principle (minimum model)

- **zkEVM architecture.** Revm executes (untrusted) + ZK circuit verifies the execution trace (trusted). Output: proof that EVM ran correctly.
- **Trace capture.** Revm with custom tracer that records every opcode + state read/write. Trace is gigabytes.
- **Witness generation.** Circuit consumes the trace + computes proof. ~10 minutes on dedicated hardware.
- **Verification.** ~50 ms on consumer hardware. Asymmetric: cheap to verify, expensive to prove.
- **Production zkEVMs.** Polygon zkEVM + Scroll + Linea + ZKsync + Taiko. Each ~$100M+ TVL.
- **Trade-offs.** ZK = trustless + cheap verification; opt-rollup = trust but cheaper. Different use cases.
- **Risc0 / Succinct.** ZK VMs that run any Rust code (not just EVM). Future direction.
- **zkEVM with revm.** Custom revm Database + custom precompiles for ZK-friendly cryptography. Production trend.

## Worked example + steps

# zkEVM with Revm

Linea, zkSync, Scroll, Polygon zkEVM — every production zkEVM rollup makes the same claim: "the verifier doesn't trust us, the verifier checks a 250-byte proof and that's it." No re-execution. No "trust the operator." A 32-byte commitment, a SNARK or STARK, and a smart contract that says yes or no.

The thing producing the proof is called a **prover**. The prover doesn't run geth, doesn't run nethermind — it runs **Revm**, the Rust EVM, compiled to RISC-V (a clean reduced-instruction-set CPU architecture that zkVMs can model cheaply) and executed inside a zkVM. This lesson is why Revm specifically, and what the prover-side code actually looks like.


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

## 4. Why Revm specifically?

- It's **modular** (Database trait makes the witness/oracle pattern clean)
- It's **deterministic** — every run with the same inputs produces the same outputs
- It's **fast in CPU**, which translates to fewer cycles, which translates to smaller proofs

Geth in Go would be a nightmare to compile and minimize for a zkVM. Revm just works.

## 5. The witness pattern

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


## 6. Performance reality

Proving a single Ethereum block in 2026:

| System | Approx. proving time (single block) | Hardware |
| :--- | :--- | :--- |
| **Risc0** | seconds–minutes | GPU |
| **SP1** | seconds | GPU + recursion |
| **Custom zkEVM (Linea, Scroll)** | sub-second per block | dedicated infra |

Generic zkVMs (Risc0/SP1) trade some prover speed for **flexibility** — they can prove *any* Rust program, not just EVM. Custom zkEVMs are faster but rebuild the whole stack from scratch.


## 7. Why this matters

- **L2s using zkEVM** rely on this pipeline (Linea, zkSync, Scroll, Polygon zkEVM)
- **Optimistic rollups** are migrating toward "validity proofs as fast finality"
- **Stateless clients** could let you sync without holding state — relying on witnesses + proofs

Reading [risc0/risc0-ethereum](https://github.com/risc0/risc0-ethereum) is the most direct path to understanding zk + Revm in production.

## 8. Practice

Before claiming familiarity, write the smallest possible host/guest pair:

1. Guest reads two integers, returns their sum
2. Host generates and verifies the proof
3. Modify the guest to call Revm on a 1-tx block
4. Compare guest cycle counts before/after — that's where the perf engineering lives

Now you know what "L2 prover" actually does.

> Final check: in two sentences, explain what makes a zk proof of EVM execution **trustless** — versus a node operator just claiming "I ran the block, here's the result." If your answer doesn't reference the verifier-side check (commitment + recomputation in the verifier contract), the lesson isn't done with you.

## Summary (3 lines)

- zkEVM = revm executes + ZK circuit verifies trace. Trace gigabytes; proof gen ~10 minutes; verify ~50 ms.
- Production zkEVMs: Polygon / Scroll / Linea / ZKsync / Taiko. Each $100M+ TVL.
- Trade-off: ZK trustless+cheap-verify vs opt-rollup cheap-prove. Risc0 / Succinct = future ZK VMs. Revm + custom precompiles enables zkEVM.
`,
                },
                {
                  title: 'Lesson 11 — Running a Reth fork in production',
                  slug: 'reth-fork-production-en',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 18,
                  xpReward: 40,
                  content: `# Lesson 11 — Running a Reth fork in production

## Question

**Running a custom Reth fork in production.** Disciplines: chainspec + upgrade path + monitoring + emergency response.

## Principle (minimum model)

- **Chainspec.** Custom genesis + custom forks. Deterministic; reproducible.
- **Upgrade path.** Add a new fork at a future block. Coordinate with users; staged rollout.
- **Monitoring.** Prometheus + Grafana. Metrics: sync time, peer count, mempool size, gas usage.
- **Alerts.** Page on critical failures (sync stalled > 1 hour, peer count < 10, OOM).
- **Emergency response.** Documented procedures for: stuck chain, fork resolution, key compromise. Practiced.
- **Coordination.** Telegram / Discord channels for validators. Status page for users.
- **Validator discipline.** Documented procedures + on-call rotation + post-mortem culture.
- **Production examples.** OP Mainnet + Hyperliquid + Tempo + Berachain. Each runs ~10-50 validators; ~24/7 ops.

## Worked example + steps

# Running a Reth fork in production

It's 3 a.m. Your validator stopped producing blocks 40 minutes ago. The dashboard shows: file-descriptor exhaustion, MDBX page-cache pressure, peer count at 2. None of these would have shown up in unit tests. None of them would have shown up the day you shipped. They show up at month 3, all at once. This lesson is the **ops checklist** that prevents that 3 a.m. page — build flags, systemd limits, diff testing against vanilla, the deployment topology that lets your fork survive contact with reality.


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

You now have a complete picture: develop, profile, extend, deploy, monitor. Welcome to the small club.

> Final check: in one sentence, why is "diff testing against vanilla Reth" the highest-value test you can write for a fork? **What class of bug does it catch that no unit test ever will?** If your answer doesn't mention "consensus" or "the only output that matters is stateRoot," re-read Section 5.

## Summary (3 lines)

- Production Reth fork = chainspec + upgrade path + monitoring + emergency response.
- Monitoring: Prometheus + Grafana + alerts. Emergency procedures documented + practiced.
- Coordination via Telegram/Discord + status page. Production examples: OP / Hyperliquid / Tempo / Berachain.
`,
                },
                {
                  title: 'Lesson 12 — Differential fuzzing & execution-spec-tests — the consensus correctness toolkit',
                  slug: 'expert-differential-fuzzing-en',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 26,
                  xpReward: 60,
                  content: `# Lesson 12 — Differential fuzzing & execution-spec-tests — the consensus correctness toolkit

## Question

**Differential fuzzing finds consensus bugs by running same input through multiple clients.** Reth + geth differ → bug. Execution-spec-tests are the golden standard.

## Principle (minimum model)

- **Differential fuzzing.** Generate random tx; run through reth + geth; compare post-state. Any difference = bug in one or both.
- **Execution-spec-tests.** Ethereum Foundation's test suite, generated from execution-spec. Source of truth for canonical behaviour.
- **Why this works.** Two independent impls diverging is statistically improbable if both are correct. Diff = correctness signal.
- **Fuzzer.** AFL / libFuzzer / cargo-fuzz. Mutates inputs to find new code paths.
- **Coverage.** Cargo-llvm-cov measures which code lines are tested. >95 % is standard.
- **Found bugs.** EIP-2930 access list (early), various opcode edge cases, gas refund bugs. All caught via differential fuzzing.
- **Production discipline.** Reth CI runs differential fuzzing nightly. Bugs filed against execution-specs.
- **Future direction.** ZK-based differential testing — prove equivalence directly. Bleeding edge.

## Worked example + steps

# Differential fuzzing & execution-spec-tests — the consensus correctness toolkit

You've shipped a fork. Custom precompiles, custom payload builder, maybe a tweaked gas schedule. Your unit tests pass. Diff testing against vanilla Reth (from the previous lesson) tells you the *changed* parts behave the same in the *unchanged* paths. **But how do you know the *unchanged* paths haven't been broken by your changes?** And — harder — how do you find the bug that lives in a path no human thought to test?

The answer: **automated correctness pressure from two angles** — \`execution-spec-tests\` to assert spec compliance by construction, and **differential fuzzing** to surface bugs no one knew to look for. Every L1 team running a Revm/Reth fork in production runs both. This lesson is how.

> 📌 **Where this fits.** Inside REVM's *How Revm tests itself* lesson taught you the formats: state tests, EOF tests, execution-spec-tests. **This lesson is the production-engineering counterpart**: how a chain team applies these tools to *their own fork*, not to vanilla Revm.

## 1. execution-spec-tests, applied to your fork

Vanilla Revm passes the upstream EEST suite. Your fork — different gas schedule, custom precompiles, different ChainSpec — has to **prove the same**. Run EEST against your fork's binary; flag every divergence as either an intentional spec deviation (document it) or a bug (fix it).

\`\`\`bash
# Clone the spec-tests framework
git clone https://github.com/ethereum/execution-spec-tests
cd execution-spec-tests
uv sync

# Build your fork's spec-test runner binary (each fork ships its own; revm has \`revme\`)
cargo build --release -p revme

# Run the suite against the binary
uv run consume direct \\
  --bin /path/to/your/fork/target/release/revme \\
  -- ./tests/cancun/      # or any subset
\`\`\`

The output: **N tests pass, M tests fail, K tests skipped.** Each failure is a tx the spec says should produce state-root \`0xA\`, your fork produces \`0xB\`. **Triage: is the divergence intentional (your fork added a precompile that costs less gas — fine, document) or unintentional (your gas-schedule patch broke an unrelated opcode's pricing — bug)?**

> 🔍 **Find in repo.** Look at how revm wires its spec-test runner: search the [\`bluealloy/revm\`](https://github.com/bluealloy/revm) repo for \`statetest\` or \`spectest\` or \`revme\`. Note the runner takes a JSON test, executes it via Revm, and reports state-root match/mismatch. **Your fork's runner has the exact same shape**, but configured for your ChainSpec.

The discipline: **EEST runs on every CI push for your fork, and a non-zero failure delta from yesterday is a build break.** Without this, your fork drifts from spec silently.

## 2. Differential fuzzing — surface bugs no one wrote a test for

EEST proves "my fork matches the spec for cases someone wrote down." **Differential fuzzing finds bugs in cases no one wrote down.** The pattern:

\`\`\`
random tx → [Your fork] → state_root_A
                    ↓
            [Reference impl] → state_root_B

assert(state_root_A == state_root_B)
\`\`\`

For 100,000 random txs. If the two roots ever diverge, you've found a bug — *somewhere*. Fuzz harness output is reduced (Foundry-style shrinking) to a minimal repro: usually 50–200 bytes of bytecode + a tiny calldata. Then a human reads the repro and identifies the divergence root cause.

**Reference implementations to diff against:**
- **Vanilla Revm** — for forks that should match Revm semantics in unchanged paths
- **Geth** (\`debug_traceTransaction\`) — for forks that should match mainnet consensus in unchanged paths
- **Erigon** — same, useful when Geth and Revm both have shared lineage you want to escape
- **A formal spec interpreter** (e.g., the Python EELS) — for cases where you want to compare against the *spec* rather than another implementation

\`\`\`rust
// tests/differential_fuzz.rs
use libafl::prelude::*;       // or proptest, arbitrary, custom harness

fn fuzz_target(input: &[u8]) -> Result<()> {
    let tx = arbitrary_tx_from_bytes(input)?;
    let pre = arbitrary_pre_state_from_bytes(input)?;

    let your_root = your_fork_execute(pre.clone(), tx.clone())?.state_root;
    let ref_root  = reference_execute(pre, tx)?.state_root;

    if your_root != ref_root {
        return Err(format!("DIFFERENTIAL: your={your_root}, ref={ref_root}").into());
    }
    Ok(())
}
\`\`\`

Run for 24-48 hours; each crash is a candidate consensus bug. The fuzzer shrinks to a 100-byte tx; you stare at it; you find that your custom \`MUL_HALF\` precompile rounds differently when the input has a leading bit set. **Caught a bug humans wouldn't have written a test for.**

> 💡 **Why this is uniquely valuable for forks.** Vanilla EVM has been fuzzed for years. Bugs exist mostly in untested combinations of new features. Your fork *is* the new feature. **The first 6 months of your fork's life is the period when fuzzing's hit rate is highest.**

## 3. The combined production discipline

Spec compliance + fuzzing aren't substitutes — they're complements:

| Tool | Catches | Misses |
| :--- | :--- | :--- |
| **EEST** | regressions on cases the Ethereum spec covers explicitly | bugs in spec-undefined behavior, fork-specific edge cases |
| **Differential fuzzing** | divergences from a reference, including spec-undefined paths | spec violations where reference and your fork are *both* wrong |
| **Both together** | a high coverage fraction of consensus-critical bugs | the rare bug where spec is silent, no reference exists, and the fuzzer doesn't reach the input |

**Production L1 teams (Hyperliquid, Tempo, Berachain) run both on every CI cycle.** A spec-test regression is a build break; a fuzz divergence is a P0. Their forks ship without consensus incidents largely because of this discipline.

## 4. Beyond differential fuzzing — fault injection

A more advanced variant: instead of fuzzing inputs, fuzz the *environment*. Inject database read failures, network partitions, partial writes, OOM conditions; assert your fork's safety properties (no double-spend, no invalid state acceptance, recoverable shutdown) hold under all of them. **This is what catches the "I crashed mid-write and now my chain is corrupted" class of bug** — the kind that doesn't show up in any unit test or differential fuzz.

For Reth this means: kill the process mid-execution, restart, assert the DB is recoverable; corrupt a random page in MDBX, assert detection at startup; force network reorgs in the test harness, assert the indexer/ExEx state stays consistent. Reth's own CI doesn't run all of this; production fork teams add it.

## How this connects to everything else

Every prior testing lesson has been a precondition for this one:

- **Foundry tests** (Fundamentals) — the cheatcodes you'd use to construct fuzz inputs and assert state.
- **Inside REVM's testing lesson** — the EEST format you're now running against your fork.
- **Inside Reth's testing lesson** — the harness that lets your fuzzer drive Reth in-process.
- **Building tier's *Validate Your Revm Simulation Against a Production Provider*** — differential testing applied per-tx; this lesson scales it to per-input-fuzzing.

**This lesson is the apex.** When you ship a Revm/Reth fork to production, the answer to "how do you know it's correct?" is *this entire pipeline running on every commit*.

## Drill

1. **Run revm's existing EEST runner against vanilla revm.** Clone \`bluealloy/revm\`, build \`revme\`, fetch the EEST suite (\`uv tool install eest\` then \`uv run consume direct ...\`), run a small subset (e.g., \`tests/cancun/eip4844_blobs/\`). **Verify all pass.** This is the baseline. 1 hour.
2. **Modify one Revm opcode and re-run.** Patch a single opcode (change \`ADD\` to \`SUB\` for instance, just to break it). Re-run the suite. **Watch failures appear.** Note which tests failed and why. Revert. 1 hour.
3. **Write a minimal differential fuzz harness.** Take two implementations (your patched Revm and vanilla; or Revm and Geth's \`debug_traceTransaction\`). Use \`proptest\` to generate random tx + pre-state, execute on both, assert state-root equality. Run for 1 hour, log any divergences. 3 hours.
4. **Read one production fuzz fix.** Search the [\`bluealloy/revm\` issues](https://github.com/bluealloy/revm/issues?q=is%3Aissue+fuzz) for one that originated from a fuzz finding. Read the bug, the fix, the regression test. **This is what fuzzing pays for.** 1 hour.
5. **Sketch your fork's CI matrix.** On paper: what spec-test subsets run on every push? What fuzz duration? What reference impls? Where do failures get triaged? 1 hour. *(No code; this is the planning artifact you'd hand to your team.)*

After drill 5, you have the full mental model for shipping a Revm/Reth fork with production-grade correctness assurance.


## 📺 Further reading

- [execution-spec-tests docs](https://eest.ethereum.org/) — the spec-test framework
- [\`bluealloy/revm\` test crates](https://github.com/bluealloy/revm) — reference implementations of the differential pattern
- The historical [Geth Yellow Paper Test Suite](https://github.com/ethereum/tests) — for understanding test-corpus evolution

## Summary (3 lines)

- Differential fuzzing = same input → multiple clients → compare. Reth + geth diverging = bug.
- Execution-spec-tests = canonical test source. cargo-fuzz / AFL for mutation. Coverage >95 % standard.
- CI runs nightly. Bugs filed against execution-specs. Future: ZK-based equivalence proofs.
`,
                },
                {
                  title: 'Lesson 13 — EVM privacy — reading Tempo Zones',
                  slug: 'evm-privacy-tempo-zones-en',
                  type: 'CONTENT',
                  sortOrder: 7,
                  duration: 28,
                  xpReward: 60,
                  content: `# Lesson 13 — EVM privacy — reading Tempo Zones

## Question

**EVM privacy = transactions visible to all by default**. Tempo Zones is one approach: encrypted regions of state. Read how it works.

## Principle (minimum model)

- **The problem.** Public chain → every tx is visible. For payments / supply chains / etc, this is a non-starter.
- **Approaches.** Off-chain (Lightning / payment channels) / sub-chain (Aztec, Stark-zk) / zone-based (Tempo).
- **Tempo Zones.** Specific regions of state are encrypted; only authorized parties can decrypt. Per-zone access control.
- **Encryption scheme.** Threshold ElGamal + zkSNARKs. Threshold = M-of-N can decrypt; zkSNARK = prove correct decryption.
- **Trade-off.** Privacy = harder DX + computation overhead. Worth it for high-privacy use cases.
- **Production status.** Tempo is in development; ETA 2026. Other chains (Aztec) ship today.
- **Why this matters.** Stablecoin payments + supply chain + healthcare → privacy is non-negotiable. Tempo aimed at this.
- **Future direction.** Universal privacy via FHE (Fully Homomorphic Encryption). Bleeding edge.

## Worked example + steps

# EVM privacy — reading Tempo Zones


> 📌 **Moving target.** Tempo Zones is "actively under development, not recommended for production use." Specific contract signatures, gas costs, and method names may shift. The architectural choices below are what stays stable — read for the shape of the design, not the exact bytes.

Privacy is the topic crypto talks about most and engineers ship the least. Most "EVM privacy" tutorials describe what a shielded pool *is*. This lesson reads the actual Rust source of one production-grade design — Tempo Zones — and uses it to derive the SE framework for reading any future EVM privacy stack (Arc, Anomaly, post-Tempo iterations).

## 1. The privacy tradeoff space (three dials)

Every EVM privacy design picks a setting on three independent dials:

| Dial | Range | What it controls |
|---|---|---|
| **Trust model** | trustless ↔ operator-trusted | Who is allowed to see plaintext |
| **Crypto primitives** | classical ↔ full ZK | What cryptography lives at the VM layer |
| **DX surface** | custom DSL ↔ standard EVM | What contract authors have to learn |

Three published designs occupy three different corners of this space:

| Design | Trust | Crypto | DX |
|---|---|---|---|
| **Aztec L2** | trustless | full ZK (UltraHonk) | custom DSL (Noir) |
| **Railgun** | trustless | SNARKs in EVM | standard contracts (shielded ERC-20 only) |
| **Tempo Zones** | **sequencer-trusted** | classical (Chaum-Pedersen + AES-GCM) + pluggable proof | standard EVM execution |

Tempo's bet is the load-bearing reading of this lesson: **institutions need compliance + low operating cost + standard EVM tooling more than they need cryptographic trustlessness.** Whether that bet pays off is a market question. The bet itself is a coherent SE choice — and the rest of this lesson reads how it's implemented.

## 2. The Zones architecture in one paragraph

A Zone is a **validium-style private L2** anchored to Tempo. The spec says it cleanly:

> *"A Tempo Zone is a private execution environment anchored to Tempo. Inside a zone, balances, transfers, and transaction history are invisible to block explorers, indexers, and other users. Each zone is operated by a dedicated sequencer that is the sole block producer, settling back to Tempo through a proof-agnostic verification system."* — [zones spec](https://github.com/tempoxyz/zones/blob/main/specs/spec.md)

Funds enter via deposits locked in a portal contract on Tempo, and the zone mints equivalent tokens. Users transact privately on the zone. To exit, tokens burn on the zone, the sequencer batches withdrawals + a proof, submits to Tempo, and tokens release from the portal.

The load-bearing trust statement is one sentence:

> *"Privacy protects against public observers on Tempo, not against the sequencer."*

This is the single most important design choice in the entire stack. **Compare with Aztec, where the proving system is constructed so that no one — including the prover — sees plaintext.** Tempo trades that property for compliance, simplicity, and roughly 25× cheaper crypto. Whether that trade is right depends entirely on the use case; for regulated stablecoin issuers and payment rails, it is defensible. For anonymous self-custody, it is not.

## 3. The Chaum-Pedersen precompile — reading the Rust source

Open \`crates/precompiles/src/chaum_pedersen.rs\` in \`tempoxyz/zones\`. The file header tells you most of what you need:

\`\`\`rust
//! Chaum-Pedersen DLOG equality proof verification precompile.
//!
//! Registered at [\`CHAUM_PEDERSEN_VERIFY_ADDRESS\`] (\`0x1C00...0100\`).
//!
//! Verifies that the sequencer correctly derived the ECDH shared secret
//! from the depositor's ephemeral public key, without revealing the
//! sequencer's private key to the EVM.
//!
//! Uses the NCC-audited [\`k256\`] crate (v0.13.4) for secp256k1 operations.
\`\`\`

The precompile itself plugs straight into the standard Revm precompile machinery from Inside REVM:

\`\`\`rust
pub const CHAUM_PEDERSEN_VERIFY_ADDRESS: Address =
    address!("0x1C00000000000000000000000000000000000100");

const CP_VERIFY_GAS: u64 = 6_000;

pub struct ChaumPedersenVerify;

impl Precompile for ChaumPedersenVerify {
    fn precompile_id(&self) -> &PrecompileId { &CP_PRECOMPILE_ID }
    fn call(&self, input: PrecompileInput<'_>) -> PrecompileResult {
        // decode verifyProof selector, verify, return bool
    }
}
\`\`\`

The crate is \`no_std\` — its \`lib.rs\` says it explicitly:

\`\`\`rust
//! This crate is \`no_std\` compatible so these precompiles can run inside the
//! SP1 prover guest (RISC-V) as well as in the zone node.
\`\`\`

That is the SE move worth pausing on. **The precompile runs both in the live zone node and inside the SP1 zkVM prover guest, from the same source.** No fork, no port, no second implementation. Same code, two runtimes — exactly the pattern Inside REVM teaches with \`auto_impl\` and trait abstraction, applied at a different layer.


Chaum-Pedersen is ~6,000 gas, ~50 lines of code, no trusted setup, no proving system to maintain. Groth16 verification would be ~150,000 gas + a multi-MB verification key + trusted setup ceremony + a proving system that needs upgrades as the SOTA shifts. **Tempo only needs to prove one thing — that the sequencer's ECDH derivation is correct — so they use a 1992 protocol that does exactly that, at a 25× gas discount.** Don't use a general tool when you need a specific one. The fact that this is *boring* crypto is the point: boring crypto is auditable crypto.

## 4. The AES-GCM precompile — encryption at the VM level

The companion precompile at \`0x1C00...0101\` does symmetric decryption. From the spec:

| | |
|---|---|
| **Address** | \`0x1c00000000000000000000000000000000000101\` |
| **Gas** | ~1,000 base + ~500 per 32 bytes of ciphertext |

\`\`\`solidity
function decrypt(
    bytes32 key,
    bytes12 nonce,
    bytes calldata ciphertext,
    bytes calldata aad,
    bytes16 tag
) external view returns (bytes memory plaintext, bool valid);
\`\`\`

The reason this is at the precompile layer and not pure-EVM is performance: AES-256-GCM in EVM bytecode is roughly 100× slower than a native implementation. The Tempo team only put primitives at the precompile layer where the speedup is dramatic. One revealing example: **HKDF-SHA256 (used to derive the AES key from the ECDH shared secret) is *not* a precompile.** From the spec:

> *"HKDF-SHA256 key derivation (used to derive the AES key from the ECDH shared secret) is implemented in Solidity using the SHA256 precompile at \`0x02\`, keeping this precompile minimal."*


HKDF is just iterated HMAC-SHA256, and SHA256 is already an EVM precompile at \`0x02\`. Implementing HKDF as Solidity that calls \`0x02\` is roughly the same speed as a dedicated precompile. AES is not. **Minimize precompile surface: only precompile what is actually expensive.** This is the same discipline behind the EVM precompile set itself (BN254, BLS, modexp, ecrecover, identity, sha256, ripemd160) — every precompile justifies its existence with a benchmark.

## 5. The encrypted-deposit flow — putting both precompiles together

Now you can read the actual privacy use case end-to-end. The user wants to deposit USDC into a Zone without revealing the on-Zone recipient.

**On Tempo (public):**

1. User generates an ephemeral keypair, runs ECDH with the sequencer's published public key → shared secret.
2. User derives an AES-256 key from the shared secret using HKDF-SHA256.
3. User encrypts \`(to || memo || padding)\` with AES-256-GCM → ciphertext + nonce + tag.
4. User calls \`ZonePortal.depositEncrypted(token, amount, keyIndex, encryptedPayload, bouncebackRecipient)\`. The portal locks tokens and emits \`EncryptedDepositMade\`.

The on-Tempo log reveals \`(token, sender, amount, bouncebackRecipient)\` — required for accounting and refund — but \`(to, memo)\` are encrypted.

**On the Zone (private execution):**

5. Sequencer observes the encrypted deposit, computes the actual shared secret (using its private key + the user's ephemeral pubkey), and generates a Chaum-Pedersen proof of correct derivation.
6. Zone calls the **Chaum-Pedersen Verify precompile** with the sequencer's claimed shared secret + proof. If the proof checks, the sequencer demonstrably derived the right shared secret without revealing their private key.
7. Zone runs HKDF-SHA256 in Solidity (using the standard \`0x02\` SHA256 precompile) to derive the AES key.
8. Zone calls the **AES-GCM Decrypt precompile** with the AES key, nonce, ciphertext, and tag. If the GCM tag validates, the precompile returns the plaintext \`(to, memo)\`.
9. Zone calls \`TIP20.mint(decryptedTo, amount)\`.


Because without the proof, the sequencer could substitute *any* shared secret — including one that decrypts the ciphertext to a different recipient — and no one could catch them. The proof binds the shared secret cryptographically to the sequencer's public key (which is recorded in onchain history, not user-supplied), so substitution is detectable. **The sequencer is trusted for liveness and data availability, but not trusted to redirect funds.** Different trust assumptions for different concerns — the SE discipline of *not* collapsing "the sequencer" into a single trust statement.

And if the user submits garbage ciphertext (intentionally griefing)? The Chaum-Pedersen proof passes (sequencer derived shared secret correctly), but the GCM tag fails. The deposit bounces back to \`bouncebackRecipient\` on Tempo. **The proof distinguishes "sequencer lied about decryption" from "user submitted invalid ciphertext"** — two failure modes that look the same to a naive observer but require completely different protocol responses.

## 6. The proof-agnostic verifier — \`IVerifier\`

The settlement layer back to Tempo is where the proving system lives. The spec's design choice:

> *"The proving system is proof-agnostic. The core is a pure state transition function that takes a witness, executes zone blocks, and outputs commitments for onchain verification. ... Any proving backend (ZKVM, TEE, or otherwise) can implement the interface."*

The state transition function is a single \`no_std\` Rust function:

\`\`\`rust
pub fn prove_zone_batch(witness: BatchWitness) -> Result<BatchOutput, Error>
\`\`\`

And the on-Tempo verifier is an interface, not an implementation:

\`\`\`solidity
interface IVerifier {
    function verify(
        uint64 tempoBlockNumber,
        uint64 anchorBlockNumber,
        bytes32 anchorBlockHash,
        uint64 expectedWithdrawalBatchIndex,
        address sequencer,
        BlockTransition calldata blockTransition,
        DepositQueueTransition calldata depositQueueTransition,
        bytes32 withdrawalQueueHash,
        bytes calldata verifierConfig,
        bytes calldata proof
    ) external view returns (bool);
}
\`\`\`


The proving market is moving fast. UltraHonk, Honk, Boojum, RISC0, SP1, Jolt, Nova — the SOTA shifts every 12-18 months. And TEE-based verification (Intel SGX, AMD SEV-SNP, Nitro) is also a viable backend for some compliance contexts. Locking in one proving system at the portal contract layer would force a redeploy every time the SOTA shifts. **By making the verifier an interface, Tempo can swap proving backends without touching the portal.** Moving parts at one layer (proving backend) should be isolated from moving parts at another layer (settlement contract). Same SE principle as the \`Database\` trait in Revm: don't couple a fast-moving implementation to a stable abstraction.

This is also why the deployment-modes section is one line:

> *"The state transition function runs in any backend that can execute the \`no_std\` Rust function. Examples include ZKVMs and TEE environments."*

## 7. The Reth fork — \`Cargo.toml\` as the proof

Open \`crates/tempo-zone/Cargo.toml\`. The very first line:

\`\`\`toml
[package]
name = "zone"
description = "Tempo Zone node - a lightweight L2 node built on reth"
\`\`\`

And the dependency block:

\`\`\`toml
# reth
reth-basic-payload-builder.workspace = true
reth-chainspec.workspace = true
reth-evm.workspace = true
reth-node-api.workspace = true
reth-node-builder.workspace = true
reth-payload-builder.workspace = true
reth-revm.workspace = true
reth-rpc.workspace = true
reth-rpc-builder.workspace = true
reth-storage-api.workspace = true
reth-tasks.workspace = true
reth-transaction-pool.workspace = true
# ...
\`\`\`

This is exactly the Reth SDK pattern from Inside Reth (\`with_types\` / \`with_components\` / \`with_add_ons\` / \`launch\`), used in anger. Tempo Zones plugs custom precompiles (the \`zone-precompiles\` crate above), custom payload validation (privacy modifications), and a private RPC into a stock Reth node and gets a working L2.


Reth is roughly 50,000+ lines handling the boring parts: devp2p, MDBX storage, staged sync, RPC scaffolding, transaction pool, consensus interfaces, gas accounting. Tempo's actual contribution — the part that is distinctive — is maybe 3 custom precompiles + private RPC modifications + custom block validation + the zone-specific payload builder. **The substrate pays for itself in everything you don't have to re-implement.** This is the same SE move Hyperliquid, OP-Reth, and Tempo all make: write the delta from Reth, not the full stack. The Inside Reth SDK lesson teaches the mechanism; this lesson reads a real production application of it.

## 8. EVM-level privacy enforcement — not RPC-level

Quote the spec's "Privacy Modifications" section directly, because the choice it makes is non-obvious:

> *"Zone execution differs from standard Tempo execution in three areas. These changes are enforced at the EVM level, not just at the RPC layer, so they apply to all code paths including user transactions, \`eth_call\` simulations, and prover re-execution."*

The three modifications:
- \`balanceOf(account)\` reverts unless \`msg.sender\` is the account owner or the sequencer.
- All TIP-20 transfer operations charge a fixed 100,000 gas regardless of storage layout.
- \`CREATE\` and \`CREATE2\` revert. The zone runs only predeploys.


Storage-slot warmth (whether a slot has been touched in this tx) reveals state. If a transfer to a fresh recipient costs 20k gas and to an existing recipient costs 5k gas, an observer who can see the gas cost can infer prior balance state. **Fixed gas closes this side channel.** Privacy on a public-bytecode VM isn't just hiding values — it's closing all observable channels, including timing and resource cost. The same discipline shows up in constant-time crypto implementations (\`subtle\` crate in Rust, libsodium in C) for the same reason.

And why is \`CREATE\` disabled? Because arbitrary contracts could be written to circumvent the EVM-level privacy controls. **Privacy enforcement at the EVM layer only works if the EVM only runs trusted code.** Validium with privacy + EVM-level discipline + restricted deployment is a coherent package; remove any one and the privacy claim breaks.

## 9. The compliance angle — TIP-403 inheritance

This is the angle that makes Tempo Zones legible to financial institutions. From the spec:

> *"Zones inherit compliance policies from Tempo automatically. Token issuers set transfer policies once on Tempo, and zones enforce them without any additional configuration."*

Mechanically: the zone deploys a read-only \`TIP403Registry\` proxy at the same address as Tempo's registry. Zone-side TIP-20 transfers check \`isAuthorized(policyId, from)\` and \`isAuthorized(policyId, to)\` before executing. The proxy reads the actual policy state from Tempo via \`TempoState.readTempoStorageSlot(...)\`. If the issuer freezes an address on Tempo, the zone inherits the freeze the next time \`advanceTempo\` imports a Tempo block containing the update.


They push the freeze once to Tempo's TIP-403 registry. Every zone automatically inherits the freeze in its next block (after the next \`advanceTempo\`). **The compliance state is a single shared resource across mainnet and every zone — written once, read everywhere.** That is the architectural property that makes "privacy + compliance" a coherent product position for institutions, not an oxymoron.

## 10. The 3-dial framework, refilled

You can now re-read the original tradeoff table with concrete grounding:

| Dial | Tempo Zones setting | Why |
|---|---|---|
| **Trust model** | sequencer-trusted, plaintext visible to one party | Compliance + auditability + low operating cost |
| **Crypto** | Chaum-Pedersen + AES-GCM at precompile layer, no general ZK at VM | Specific primitives 25× cheaper than general ZK; HKDF stays in Solidity to minimize precompile surface |
| **DX** | standard EVM, no custom DSL, contracts opt into privacy via \`depositEncrypted\` flow | Solidity engineers ship without learning Noir or Cairo |
| **Settlement** | validium-style portal + proof-agnostic IVerifier | Pluggable proving backend (ZKVM or TEE) without redeploy |
| **Compliance** | inherited from base chain via TIP-403 read-through proxy | Single source of truth for policy across mainnet + zones |

A different design (Aztec, Railgun, future Arc) is a different setting of the same dials. The framework is what transfers; the specific design is one instance.

## 11. The forward-looking gap

What this lesson doesn't yet cover, because the source isn't public:

- **Circle's Arc** (announced 2025-08): claims privacy support; design unpublished as of writing.
- **Anomaly and other stablecoin-purpose-built chains**: position is similar to Tempo's; designs not yet readable at the source level.
- **Tempo's production proving backend selection**: spec is proof-agnostic; production choice (which ZKVM, or TEE attestation) is forthcoming.

When any of these publish, the 3-dial framework above is what you'll use to read them. That is the lesson's actual durable artifact — not the specific Tempo bytes, which will shift, but the framework for reading any future EVM privacy stack.

## Recall

Without scrolling:

1. **What does Chaum-Pedersen prove, and why is it cheaper than Groth16 for this use case?**
2. **Why is AES-GCM a precompile but HKDF is not?**
3. **The Tempo verifier is abstracted behind \`IVerifier\`. What does this enable that a hard-coded prover wouldn't?**
4. **Why is \`CREATE\` disabled on Zones? What property would break without that restriction?**
5. **Tempo Zones uses Reth as a base. What does the \`Cargo.toml\` reveal about the moat-vs-substrate split?**

If any answer is shaky, re-read the section referenced.

## 📂 Source repos worth keeping open

- [\`tempoxyz/zones\`](https://github.com/tempoxyz/zones) — the case study, especially \`specs/spec.md\` and \`crates/precompiles/src/\`.
- [\`paradigmxyz/reth\`](https://github.com/paradigmxyz/reth) — the substrate Tempo Zones forks.
- [\`bluealloy/revm\`](https://github.com/bluealloy/revm) — for the precompile trait machinery the Zones precompiles plug into.
- [\`AztecProtocol/aztec-packages\`](https://github.com/AztecProtocol/aztec-packages) — for the opposite-corner contrast (trustless, full ZK, custom DSL).
- [\`Railgun-Community\`](https://github.com/Railgun-Community) — for the middle-corner contrast (trustless, SNARKs-in-EVM, standard contracts).

---

**You've reached the end of Reth Expert.** The Building tier puts every pattern from this course into production apps; the L1 Architect tier (Advanced) uses the same discipline at the protocol design layer. Across Expert you've read performance internals, MDBX storage, Tokio concurrency, proc macros, tracing, custom precompiles, MPT proofs, stateless execution, MEV in production, zkEVM, fork ops, differential fuzzing, and — with this lesson — production privacy stack design. That is the source-level vocabulary every team you'd want to work on this stack with is already using.

## Summary (3 lines)

- EVM privacy approaches: off-chain / sub-chain (Aztec) / zone-based (Tempo). Each makes different trade-off.
- Tempo Zones = encrypted state regions + threshold decryption + zkSNARK proof. Production-aimed at stablecoin payments + supply chain.
- Aztec ships today; Tempo ETA 2026. Future: FHE for universal privacy.
`,
                },
                {
                  title: 'Lesson 14 — Chaos engineering for Rust EVM nodes — break your own L1 before someone else does',
                  slug: 'chaos-engineering-rust-evm-en',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 28,
                  xpReward: 60,
                  content: `# Lesson 14 — Chaos engineering for Rust EVM nodes — break your own L1 before someone else does

## Question

**Chaos engineering = deliberately injecting failures** to find weak points. Kill a node, drop network packets, fill disk → see what breaks.

## Principle (minimum model)

- **Why chaos.** Production failures cost real money. Better to find weak points in staging.
- **Patterns.** Network partition (drop 50 % packets); node kill (random validator); disk full (fill /var); clock skew (drift wall clock).
- **Tools.** Toxiproxy (network), chaos-mesh (k8s), custom Rust scripts (in-process).
- **Validate recovery.** Post-failure, assert state is consistent + sync resumes + alerts fired correctly.
- **Reth-specific tests.** Inject reorg (rewrite recent blocks); inject sync stall (block fetch slows); inject mempool flood (1000 spam txs/sec).
- **Practice in staging.** Run chaos drills monthly. Document playbook for each failure.
- **Production examples.** Hyperliquid + Tempo + Coinbase run regular chaos exercises. Catches weak points before real failures.
- **Mindset.** "If we can't break it deliberately, we don't understand it well enough."

## Worked example + steps

# Chaos engineering for Rust EVM nodes — break your own L1 before someone else does


> 📌 **Moving target.** The tools section references specific projects (Toxiproxy, chaosfs, libfaketime, etc.) — projects in this space move and APIs change. The patterns below stay stable; specific commands may need adjustment.

Most teams shipping a custom Reth fork run the same test suite the upstream maintainers run and call it a day. That's wrong. Upstream tests verify that Reth behaves correctly on a *happy* network — every peer honest, every disk healthy, every clock accurate. Your fork is going to run in adversarial conditions: validator nodes get DoS'd, MDBX returns corrupt pages, clocks drift, peers send byzantine blocks. **Tests that don't deliberately break the system don't tell you what happens when the system breaks.**

This lesson is about closing that gap.

## 1. What differential fuzzing leaves out

The Expert tier's differential fuzzing lesson covered the discipline of comparing your Revm fork against a reference EVM implementation across thousands of historical transactions. That answers: *"Does my implementation produce the same outputs as the reference under valid inputs?"*

It doesn't answer:
- What happens when a validator goes offline mid-round?
- What happens when MDBX returns a corrupted page in the middle of a state-root computation?
- What happens when an adversarial peer sends a block with a valid header but a corrupted body?
- What happens when wall-clock time jumps backwards 30 seconds?

Those questions belong to **chaos engineering**: deliberately injecting failures to discover failure modes before production does.

Both disciplines are needed. Fuzzing catches the "wrong answer under correct inputs" bug class. Chaos catches the "right answer ceases to be possible under perturbed conditions" bug class. **Neither covers the other.**

## 2. The 4 categories of chaos for L1 nodes

Every chaos exercise for a Rust EVM node fits in one of these four buckets:

| Category | What you inject | Real-world equivalent |
|---|---|---|
| **Network chaos** | Packet loss, latency spikes, partitions, peer-eviction storms | Cloud-region outage, BGP misconfiguration, DDoS |
| **Disk chaos** | MDBX page corruption, write failures, latency spikes | Failing SSD, bit rot, filesystem bug |
| **Time chaos** | Clock skew, NTP drift, monotonic-clock regressions | Server clock drift, leap seconds, virtualization clock skew |
| **Byzantine chaos** | Adversarial peer sends invalid blocks, conflicting votes, lies about state | Malicious validator, compromised key, network MitM |

Each category has its own tooling, its own failure-mode signatures, and its own response patterns. A complete chaos discipline exercises all four.

## 3. Network chaos — \`tc\`, Toxiproxy, Pumba

The simplest network chaos lives on the Linux side: \`tc\` (traffic control). To drop 30% of packets on a validator's P2P port:

\`\`\`bash
tc qdisc add dev eth0 root netem loss 30%
\`\`\`

To add 200ms of latency:

\`\`\`bash
tc qdisc add dev eth0 root netem delay 200ms
\`\`\`

For Docker-based testnets, **Pumba** wraps these into container-friendly commands:

\`\`\`bash
pumba netem --duration 5m loss --percent 30 my-reth-validator
\`\`\`

For application-level proxying with finer control (e.g., killing only one peer connection, not the whole interface), **Toxiproxy** lets you inject failures programmatically. The Reth node connects through Toxiproxy; you script the failure pattern.

**The chaos exercise:** Spin up a 4-validator BFT testnet. Pick one validator. Inject 80% packet loss on its P2P port for 30 seconds.

**What you're checking:**
- Does the remaining 3-node quorum continue producing blocks? (BFT safety: yes, 3 of 4 is still ≥ 2f+1 for f=1)
- When the dropped validator recovers, does it catch up cleanly? (Liveness: should resync without manual intervention)
- Does the dropped validator get slashed for inactivity? (Policy: depends on your spec — verify expected behavior)

**The bug class this finds:** assumptions that "all validators are reachable most of the time" baked into code paths that don't survive transient unreachability.

## 4. Disk chaos — chaosfs, kernel fault injection

Most teams don't test what happens when their database backend *lies*. **Chaosfs** (a FUSE filesystem that returns deliberately corrupted bytes for specific files) lets you find out.

\`\`\`bash
# Mount chaosfs over your MDBX data directory
chaosfs --backend ./reth-data --mount ./reth-mdbx --corrupt-rate 0.001
\`\`\`

Now 0.1% of reads from MDBX return corrupted bytes. Run your Reth node against the mounted directory and observe.

**What you're checking:**
- Does Reth detect the corruption? (Checksums on MDBX pages should catch most cases.)
- If it does, does it halt the node gracefully or silently serve bad state? (Silent corruption is the worst failure mode for an L1 — divergent forks across nodes.)
- Does the corruption surface in release builds or only in debug builds?

**The Linux kernel alternative:** \`fail/fail_injection\` lets you inject arbitrary failures into specific syscalls. To make every 100th \`read()\` fail:

\`\`\`bash
echo 1 > /sys/kernel/debug/fail_io_timeout/probability
echo 100 > /sys/kernel/debug/fail_io_timeout/interval
\`\`\`

Wrap your Reth node start with \`LD_PRELOAD=fail-syscalls.so\` to make this active for that process only.

**The bug class this finds:** code paths that assume MDBX read/write always succeeds, or that silent corruption doesn't happen.

## 5. Time chaos — \`libfaketime\`, kernel time stretching

Reth and Revm both make assumptions about time. Block timestamps. Reorg windows. Validator slot timing. Consensus timeouts. If your wall clock drifts 30 seconds or jumps backwards, things break.

The simplest tool is \`libfaketime\`:

\`\`\`bash
LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libfaketime.so.1 FAKETIME=+30s reth node
\`\`\`

This makes the Reth process see the system clock as 30 seconds ahead of real time. Now spin up a testnet where one node has this drift active and observe.

**What you're checking:**
- Does the drifted validator produce blocks with timestamps the rest of the network rejects?
- Does consensus stall while waiting for the drifted validator to catch up?
- Does the drifted validator get slashed for proposing blocks "in the future"?

**The harder case:** **monotonic-clock regressions**. Rust's \`Instant\` is guaranteed monotonic per-process, but on suspended/resumed VMs or migrated containers, you can see clock jumps. \`libfaketime\` doesn't simulate this; you need kernel time stretching or VM-level pause/resume.

**The bug class this finds:** consensus or networking code that assumes time advances monotonically and uniformly across the network.

## 6. Byzantine chaos — a deliberately misbehaving Reth fork

The hardest chaos to inject is also the most important: a peer that's intentionally lying. The reliability question: *does your node detect and reject a peer that sends a block with a valid header but a state-root claim that's wrong by one byte?*

You can't inject this via \`tc\` or chaosfs — the peer needs to be running Reth code that actively misbehaves. The standard pattern: build a small Reth fork that overrides the block-production code to insert specific bugs.

\`\`\`rust
// In your byzantine-reth fork: replace the standard payload builder with one that
// proposes blocks with a single bit flipped in the state root.
impl PayloadBuilder for ByzantinePayloadBuilder {
    fn build(&self, attrs: PayloadAttributes) -> ExecutionPayload {
        let mut block = self.honest.build(attrs);
        block.state_root ^= 1; // flip one bit
        block
    }
}
\`\`\`

Spin up a testnet where one validator runs this misbehaving fork.

**What you're checking:**
- Does the honest network reject the byzantine block within one slot?
- Does the misbehaving validator get slashed (or whatever your spec mandates)?
- Does honest nodes' state stay clean — no temporary "accepted then reverted" — under the byzantine input?

**The bug class this finds:** trust assumptions that should have been validations. Every time you trust a peer-supplied value (block hash, transaction signature, state-trie node), there's an opportunity for a byzantine peer to lie. Your tests should include peers that do lie.

## 7. The pattern — chaos as continuous practice

A one-off chaos exercise finds the bugs you happened to inject. Continuous chaos finds the regressions you'd otherwise ship.

Three levels of practice:

- **Chaos in CI** — a subset of chaos exercises runs on every PR. Network loss + clock skew + disk fault on a 4-node testnet, every commit. Slow but catches regressions before merge.
- **Game days** — quarterly half-day exercises where the team manually injects realistic failures into a staging chain. Finds both bugs *and* gaps in runbook documentation.
- **Production chaos** — Netflix-style. Deliberately fail one production validator per week, in a controlled window. The most disciplined teams (Tempo, OP, Hyperliquid likely) do this. The lesson: production chaos isn't a tool, it's a culture — engineers have to be on call and ready to revert.

## 8. What chaos engineering doesn't replace

Three adjacent disciplines that all complement chaos:

- **Differential fuzzing** — checks correctness on benign inputs (the Expert tier lesson). Chaos doesn't replace fuzzing because chaos exercises a small number of injected failures while fuzzing exercises a wide input space.
- **Systems-code auditing** — finds latent design bugs by reading code (the next Expert lesson). Chaos doesn't replace auditing because chaos can only find bugs that show up under the failures you injected; auditing finds bugs that haven't been triggered yet.
- **Formal verification** — proves invariants algebraically (out of scope for most teams). Chaos doesn't replace formal verification because chaos provides empirical confidence, not proof.

The complete reliability triangle: **fuzzing (correctness) + chaos (resilience) + auditing (latent bugs)**.

## Recall

Without scrolling:

1. **Differential fuzzing and chaos engineering each catch a different class of bug. Name the class each catches.**
2. **You're testing a 4-validator BFT testnet. You drop one validator with 80% packet loss for 30 seconds. What three things should happen? What single thing should NOT happen?**
3. **Silent disk corruption is "the worst possible failure mode for an L1." Why? What does "silent" mean here, and what's the cascading consequence?**
4. **What does \`libfaketime\` simulate, and what important time-related failure mode does it NOT simulate?**
5. **Why do you need a custom Reth fork for byzantine chaos rather than \`tc\` or \`chaosfs\`?**

If any answer is shaky, re-read the section.

## 📂 Repos and references worth keeping open

- [tigerbeetle/tigerbeetle](https://github.com/tigerbeetle/tigerbeetle) — deterministic simulation testing, the highest-discipline chaos practice in the financial-systems world
- [shopify/toxiproxy](https://github.com/Shopify/toxiproxy) — application-level network chaos
- [alexei-led/pumba](https://github.com/alexei-led/pumba) — Docker container chaos
- [wolfcw/libfaketime](https://github.com/wolfcw/libfaketime) — time chaos
- [chaos-mesh/chaos-mesh](https://github.com/chaos-mesh/chaos-mesh) — Kubernetes chaos platform (cluster-level)

---

**🧭 Where you are now in the stack:** you've added chaos engineering to your toolkit. The next lesson covers the third pillar of the reliability triangle — **systems-code auditing**: finding latent design bugs that neither fuzzing nor chaos can catch because they haven't been triggered yet. Together, these three disciplines are what separate "Revm code that runs" from "Revm code that's safe to ship as the heart of an L1."

## Summary (3 lines)

- Chaos engineering = deliberately inject failures. Find weak points in staging, not production.
- Patterns: network partition, node kill, disk full, clock skew. Tools: Toxiproxy, chaos-mesh, custom Rust.
- Reth-specific: reorg injection, sync stall, mempool flood. Run drills monthly; document playbook. Production: Hyperliquid / Tempo / Coinbase do this regularly.
`,
                },
                {
                  title: 'Lesson 15 — Systems-code auditing — finding bugs in Reth / Revm / consensus impls',
                  slug: 'systems-code-auditing-en',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 28,
                  xpReward: 60,
                  content: `# Lesson 15 — Systems-code auditing — finding bugs in Reth / Revm / consensus impls

## Question

**Auditing Rust systems code = reading for bugs**. Specific patterns: race conditions, type-system bypasses, gas misaccounting, consensus divergence.

## Principle (minimum model)

- **Read for patterns, not lines.** Bug-prone patterns: unsafe blocks, lock holding across await, arithmetic without saturating, panic in hot path.
- **Type-system bypasses.** \`transmute\`, \`from_raw_parts\`, manual \`Send/Sync\` impls. Each is a known bug source.
- **Concurrency bugs.** Hold \`std::sync::Mutex\` across \`.await\` = deadlock; missed wakeups; race conditions in shared state.
- **Consensus bugs.** Diverging behaviour between Reth + geth = consensus bug. Differential fuzzing catches most.
- **Gas bugs.** Misaccounting → DoS or chain-fork. Audit every gas computation path.
- **Documentation as audit signal.** Code without "why" comments is suspect; assumptions hidden = future bugs.
- **Tools.** Rust analyzer + cargo clippy + cargo audit + miri (UB detection). Each catches different bug classes.
- **Production audit process.** External auditor + bug bounty + continuous internal review. Layered.

## Worked example + steps

# Systems-code auditing — finding bugs in Reth / Revm / consensus impls


> 📌 **Scope honesty.** This is *systems-code* auditing — Reth / Revm / Rust consensus impls. **Not** smart-contract auditing (Solidity bugs, EVM exploits at the contract layer). The latter is well-covered elsewhere (Trail of Bits, Code4rena, Spearbit material); RethLab has no unique angle on contract auditing. Systems-code auditing is the angle nobody else covers, and where RethLab's source-first thesis pays off.

You've shipped the differential fuzz harness. You've shipped chaos drills. The code passes both. Are you done?

No. Both disciplines exercise the code by *running* it. Audit catches what running doesn't surface — code paths that haven't been exercised yet, invariants that work today but break under future modifications, trust assumptions that aren't validated. **Reading is its own discipline.**

## 1. Why systems-code auditing is different from smart-contract auditing

Smart-contract auditing has a well-known taxonomy: integer overflow, reentrancy, access-control bugs, oracle manipulation, flash-loan exploits. The bug-class library is finite and well-cataloged. The unit of bug is at the Solidity / EVM contract level.

Systems-code auditing has a different taxonomy:
- Race conditions (Tokio task interleavings that produce wrong state)
- State corruption windows (non-atomic writes that interrupt in the wrong place)
- Consensus invariant violations (safety/liveness assumptions silently broken)
- \`unsafe\` block correctness (every \`unsafe\` is a soundness boundary)
- Trust-boundary leaks (P2P peer trust, RPC auth bypass, signer trust)

Different bug shapes, different mental models, different tools. The auditor of a Solidity contract and the auditor of a Reth fork are doing **different jobs**, even though both are called "auditing."

This lesson covers the systems-code side. It's the audit that matters for a Tempo / OP / Hyperliquid fork.

## 2. The 5 bug classes in the Rust EVM stack

### 2.1 State corruption windows

A "state corruption window" is a code path where state is partially updated when an unexpected interruption happens (process crash, MDBX write failure, panic in a downstream call). If the partial update isn't rolled back, the on-disk state becomes inconsistent.

The audit question: **for every state mutation, what happens if execution stops mid-way?**

Common patterns to look for:
- Multi-step writes without a transaction wrapper
- "Save then return" sequences where the save can fail silently
- Caches updated before the underlying store is committed
- Indexes updated separately from the data they index

Reth's stage commit logic is the canonical example to audit. Every stage's \`execute\` should be paired with an \`unwind\` that perfectly undoes whatever \`execute\` did. The auditor reads both and asks: **is there any state mutation in \`execute\` that \`unwind\` doesn't undo?** If yes, that's a corruption window.

### 2.2 Concurrency bugs

Rust's type system prevents data races at compile time. It does not prevent *logic races* — situations where multiple Tokio tasks interleave in ways that produce wrong outputs.

The audit question: **for every shared state, what's the contract on who modifies it and when?**

Common patterns to look for:
- \`Arc<Mutex<T>>\` held across \`await\` (deadlock risk; sometimes correctness risk)
- Multiple tasks reading-then-writing the same \`Arc<AtomicU64>\` (TOCTOU)
- Channel receivers that assume sender ordering preserves causality
- \`tokio::spawn\` of a task that captures a stale snapshot of state

Tools that help: \`loom\` (concurrency permutation testing), \`miri\` (UB detection under multi-threaded execution).

### 2.3 Consensus invariant violations

Every consensus protocol has explicit invariants (no two finalized blocks at the same height) and implicit ones (proposer rotation produces fair distribution, validator votes can't be replayed). When you fork or customize a consensus impl, these invariants are easy to silently violate.

The audit question: **for every consensus-relevant code path, which invariant does it touch, and does this code path preserve it?**

Common patterns to look for:
- Vote processing that doesn't deduplicate by \`(validator, slot)\` — replay attack
- Fork-choice code that assumes monotonic timestamps — fails on clock drift
- Finality logic that doesn't check the 2f+1 quorum strictly — accepts under-quorum
- Slashing-evidence handling that doesn't verify the signed-by-validator condition — false-positive slashing

Auditing a HotStuff or Tendermint impl is heavy work — you need the protocol paper open in one window, the code in another, and a spreadsheet of "invariant X is preserved by code path Y."

### 2.4 \`unsafe\` block correctness

Every \`unsafe\` block in Rust is a security boundary. It opts out of the borrow checker's guarantees and asserts that the programmer manually maintained the safety invariants the compiler would have otherwise enforced.

The audit question (3-part, for every \`unsafe\`):
1. **What invariant is this \`unsafe\` block relying on?**
2. **What conditions, present or future, could violate that invariant?**
3. **How is the invariant verified — tests, types, code-comment proof?**

If any answer is "I'm not sure," the \`unsafe\` block is an audit finding.

Real example: Revm's stack operations sometimes use \`unsafe\` \`get_unchecked\` for performance. The invariant relied on is "stack depth was verified before this call." The condition that could violate it: a refactor that splits stack-depth verification from stack-access. The verification: tests that exercise underflow scenarios.

Tools: \`cargo geiger\` counts \`unsafe\` blocks per crate. The audit isn't about reducing the count to zero — it's about ensuring each one has a clear, documented invariant.

### 2.5 Trust-boundary leaks

Every external input to a node is a trust boundary. The auditor maps every boundary and asks: **what's validated at the boundary, and what's silently trusted?**

The four major trust boundaries in a Reth node:
- **RPC** — clients can submit arbitrary requests. Auth, rate-limiting, payload validation should all be at this boundary.
- **P2P** — peers send blocks, transactions, state-trie nodes. Each must be validated before being trusted.
- **CLI / config** — node operator's config file. Less adversarial but still a boundary (typos in genesis hash, etc.).
- **Engine API** — consensus client supplies block-execution requests. Should be validated against the consensus rules.

Common bugs at each boundary:
- RPC: missing auth on a privileged method (e.g., \`admin_addPeer\`)
- P2P: accepting a peer's claim about state without verifying against the state root
- CLI: not validating that a chainspec is internally consistent
- Engine API: accepting a block that violates a hardfork rule the EL doesn't yet know about

## 3. Reading a Reth PR — a worked example

Auditing isn't always a separate review session. Reading every PR that touches consensus-affecting code IS auditing, if you read it with the right questions in mind.

Worked example: imagine a Reth PR that refactors \`stage commit logic\` to add a new optimization — batch commit groups of stages together rather than one at a time.

The questions to ask while reading:
1. **What was the old \`execute → commit → unwind\` flow? What's the new one?**
2. **For each new "batch commit," what state does it touch?**
3. **What happens if the batch commit fails halfway?** Specifically: did the new code introduce a state corruption window?
4. **Did \`unwind\` get updated to handle the batched case?** If not, that's the bug.
5. **Are there tests for "execute partial-batch then crash then restart"?** If not, the test gap is itself a finding.

This is what reading a PR for bugs looks like. The 5 questions are the same shape every time — just applied to whatever code area the PR changes.

## 4. Auditing a consensus impl against its invariants

A consensus implementation is auditable in a structured way: list the protocol's invariants, then for each invariant trace through code paths that affect it.

Example: HotStuff has the safety invariant *"a correct replica will not vote for two conflicting blocks at the same height."* The audit:

1. **Find every code path where the replica produces a vote.** Usually 1–3 places in the codebase.
2. **For each, check what state is consulted before voting.** Specifically: is the validator's local "last voted block at height N" checked?
3. **What persists this state across restarts?** If it's in-memory only, a restart-induced double-vote is a bug.
4. **Is the check atomic with the vote emission?** If there's a window between "check" and "send vote," a concurrent code path could vote twice.

Repeat for every invariant the protocol specifies. Tedious but mechanical.

## 5. Tools for the systems-code auditor

A small toolbox carries you a long way:

| Tool | What it does | When to use |
|---|---|---|
| \`cargo audit\` | Checks for known CVEs in dependencies | Run on every CI; baseline hygiene |
| \`cargo geiger\` | Counts \`unsafe\` blocks per crate | Use to scope your audit — which crates need the most \`unsafe\` review? |
| \`kani\` | Model checker for Rust | Use on small \`unsafe\` blocks or critical functions; doesn't scale to whole programs |
| \`loom\` | Concurrency permutation testing | Use on \`Arc<Mutex<T>>\`-heavy code paths; finds race conditions deterministically |
| \`miri\` | UB detection at runtime | Run a subset of your tests under \`miri\` to detect undefined behavior in \`unsafe\` |
| \`cargo clippy -- -W clippy::all\` | Lint-based bug finding | Baseline; catches common mistakes |
| Manual review checklist | Apply the 5 bug classes above systematically | Always |

None of these tools find bugs that the reviewer doesn't think to look for. **Tools amplify a careful auditor, they don't replace one.**

## 6. The auditor's deliverable

A systems-code audit produces a report. The industry-standard structure (used by Trail of Bits, Sigma Prime, OpenZeppelin, ConsenSys Diligence, Spearbit):

For each finding:
- **Severity** (Critical / High / Medium / Low / Informational)
- **Title** (one-line summary)
- **Location** (file and line numbers)
- **Description** (what the bug is, in 2–3 sentences)
- **Exploit / consequence** (what could happen if this bug is triggered)
- **Recommendation** (what to change, specifically)
- **Status** (Open / Acknowledged / Fixed)

For the report as a whole:
- **Executive summary** (1 page; what was audited, scope, top-line findings)
- **Methodology** (how the audit was conducted)
- **Findings** (the list above)
- **Out-of-scope items** (what was deliberately not audited and why)

Good audit reports are public. Read existing audits of Reth / Revm / Foundry / other Rust EVM components from Sigma Prime, OpenZeppelin, Spearbit — they're freely available, and the format is the same across firms.

## 7. The reliability triangle, revisited

Three reliability disciplines, each catching a different bug class:

| Discipline | Catches | Misses |
|---|---|---|
| **Differential fuzzing** | Wrong answer under valid input | Failure modes; latent design bugs |
| **Chaos engineering** | Right answer ceases under perturbed conditions | Bugs in code paths never injected; latent bugs |
| **Systems-code auditing** | Latent design bugs in code paths not yet exercised | Bugs that need specific runtime triggers; unknown unknowns |

The three together are the reliability bar a serious L1 team holds itself to. Ship none, and you ship known-broken code. Ship one or two, you ship code with known gaps. Ship all three, and you've earned the right to call your fork "production-grade."

## Recall

Without scrolling:

1. **Smart-contract auditing and systems-code auditing are different jobs. Name three bug classes each catches that the other doesn't.**
2. **For every \`unsafe\` block, you should ask 3 questions. What are they?**
3. **Reth's stage \`execute\` and \`unwind\` should be perfectly symmetric. What's the audit question this symmetry implies?**
4. **Loom and Miri serve different purposes. When do you reach for each?**
5. **Why is "differential fuzzing + chaos engineering + auditing" the reliability bar, rather than any one or two of them?**

If any answer is shaky, re-read the section.

## 📂 Reference audits worth reading

- [Sigma Prime — public audits](https://github.com/sigp/public-audits) — the closest industry reference for systems-code audit format
- [Trail of Bits — publications](https://github.com/trailofbits/publications) — many Rust audits; good examples
- [OpenZeppelin — security audits](https://blog.openzeppelin.com/security-audits/) — strong on consensus invariant analysis
- [ConsenSys Diligence — audit reports](https://consensys.io/diligence/audits/) — broad coverage including infrastructure
- [Spearbit — audit portfolio](https://github.com/spearbit/portfolio) — Rust / Solidity / consensus

---

**🧭 Where you are now in the stack:** the reliability triangle is complete. You have **differential fuzzing** (correctness), **chaos engineering** (resilience), and **systems-code auditing** (latent bugs). These three together — paired with the SE substrate (DB / VM / network / concurrency) and the 4 forces (adversarial / verifiable / ordered / live-migrating) — are the skill set that distinguishes "I can write Rust EVM code" from "I can ship Rust EVM code at a Hyperliquid / Tempo / OP-stack quality bar." The Building tier is where you apply all of this to real apps.

## Summary (3 lines)

- Systems-code auditing = reading for bugs. Patterns: unsafe blocks, lock-across-await, arithmetic-without-saturating, panic-in-hotpath.
- Type-system bypasses (transmute, manual Send/Sync), concurrency (deadlock, race), consensus (divergence), gas (misaccounting).
- Tools: rust-analyzer + clippy + cargo audit + miri. Production: external auditor + bug bounty + continuous internal review.
`,
                },
                {
                  title: 'Lesson 16 — Open-source contributor workflow — getting Paradigm-quality PRs merged into Reth / Revm / Alloy',
                  slug: 'oss-contributor-workflow-en',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 28,
                  xpReward: 60,
                  content: `# Lesson 16 — Open-source contributor workflow — getting Paradigm-quality PRs merged into Reth / Revm / Alloy

## Question

**Getting your PR merged into Reth / Revm / Alloy** = following Paradigm's contributor workflow. Specific discipline; predictable process.

## Principle (minimum model)

- **Find an issue.** Filter by \`good first issue\` + \`help wanted\`. Match your skill level.
- **Reproduce the bug.** Local devnet + reproduction case. Without this, maintainers can't triage.
- **Fix discipline.** Minimal diff; passing tests; benchmarks if perf-sensitive; documentation if API-changing.
- **PR description.** What + Why + How. Link to issue. Test plan. Performance impact.
- **Review iteration.** Maintainer comments → address; reviewer + comment → discuss; re-request review. ~2-3 iterations typical.
- **Test gate.** CI green; benchmarks neutral or positive; tests added for fixes.
- **Lockstep with upstream.** Rebase if upstream drifts. Keep diff small.
- **Cultural fit.** Paradigm values: code quality + test coverage + documentation + benchmark discipline. Each PR judged against these.
- **Career angle.** Merged PRs to Reth / Revm / Alloy = strong CV signal. Top contributors get hired.

## Worked example + steps

# Open-source contributor workflow — getting Paradigm-quality PRs merged into Reth / Revm / Alloy


> 📌 **Audience.** Written assuming you've read most of Inside Alloy / Revm / Reth and have a working Rust toolchain. If you haven't — the contributor-workflow concepts still apply, but the specific examples land harder once you've internalized the patterns those courses cover.

Most engineers in crypto can write Rust code that compiles. Few can write Rust code that gets merged into Reth, Revm, or Alloy on the first review. The gap between those two is what this lesson closes.

Why the gap matters: **Paradigm hires people whose work they recognize from the upstream PR queue.** Same for Tempo. Same for Hyperliquid. Not GitHub stars. Not Twitter posts. Actual merged PRs in projects they care about. The skills RethLab teaches across 13 courses are necessary; being recognizable on the upstream PR queue is what makes you hire-able into the teams whose work you study.

This lesson is about being recognizable.

## 1. Why this is its own skill

You can be a brilliant systems engineer and still get your PRs ignored. The reasons:

- Title is unclear; reviewers skip
- Description doesn't say *why*; reviewers don't know how to evaluate
- Commits aren't atomic; reviewers can't trust the diff
- Code doesn't match upstream style; reviewers have to clean up
- Tests don't exist or don't match the test conventions; reviewers have to write them
- Response to feedback is defensive; reviewers move on to easier PRs

Each one is small. Together they're the difference between "PR merged in 3 days" and "PR sits open for 6 months and then closes."

The good news: every one of these is a learnable skill. Most engineers don't learn them because nobody explicitly teaches them. This lesson does.

## 2. Read the room — upstream norms before you write a line

Every project has implicit conventions you can't infer from reading code in isolation. Spend the first two weeks reading:

- **CONTRIBUTING.md** — the official version of the rules
- **The last 20 merged PRs** — what actually gets accepted (often differs from the official rules)
- **The last 10 closed-without-merge PRs** — what doesn't (more informative)
- **The maintainers' own recent PRs** — the gold standard for what counts as "good"
- **Issues with \`good first issue\` label** — explicitly marked as suitable for newcomers
- **The codebase's TODO / FIXME comments** — often "would-be PRs waiting for someone to write them"

For Reth specifically:
- \`paradigmxyz/reth\` CONTRIBUTING.md (read it; it's specific)
- The Discord (\`#contributing\` channel)
- Weekly office hours (announced in Discord)

For Revm:
- \`bluealloy/revm\` CONTRIBUTING.md
- The maintainer's preferences are stricter than upstream Reth; read recent PRs to calibrate

For Alloy:
- Active project; conventions move; check recent PRs more frequently than docs

The lurking time matters. Engineers who skip this step and start submitting PRs immediately get ignored — they don't know the room.

## 3. Find the right first PR

The first PR's job is not to make a big technical contribution. It's to **establish your existence in the project's social graph**. So pick something small.

The escalation ladder:

1. **Docs / README typo** — almost guaranteed merge. Establishes you as someone who reads carefully.
2. **Test case addition** — covers an edge case the existing tests miss. Establishes you as someone who thinks about correctness.
3. **Small bug fix** — for a \`good first issue\` labeled issue. Establishes you as someone who can navigate the codebase.
4. **Small feature** — a useful but non-load-bearing addition. Establishes you as someone with judgment.
5. **Architectural change** — only after the previous four. Without that history, you'll get ignored.

The counter-pattern: starting with #5. Engineers who open their first PR with "I noticed subsystem X has design problem Y and here's a refactor" get ignored even when they're technically right. Reputation has to come first.

## 4. Anatomy of a Paradigm-quality PR

Pull up any merged PR from Reth's main contributors. Study its structure:

**Title** — imperative form, tight scope. Bad: "Some improvements to staging." Good: "stages: fix unwind for SenderRecoveryStage on partial commit"

**Description** — three sections:
1. **What changed** — one paragraph, what the diff does
2. **Why** — one paragraph, the motivation; cite issue numbers if applicable
3. **How to verify** — explicit reviewer instructions: which tests to run, what behavior to check manually

**Commits** — each one is a logical unit. A commit message tells the story of what changed and why. If you can't summarize a commit in one line, the commit is too big.

**Code** — passes \`cargo fmt\` and \`cargo clippy -- -W clippy::all\`. Matches the project's existing patterns (look at neighboring files). No "improvements" to style that aren't part of the actual fix.

**Tests** — new tests where new behavior, regression tests where bug fix. The naming convention matches the project (e.g., Reth uses \`tests/it/\` for integration tests, \`#[test]\` for unit). Failing tests should fail meaningfully ("expected X, got Y") not opaquely ("assertion failed").

**Performance claims** — if you say "this is faster," include benchmark numbers. If you don't have benchmarks, don't claim performance.

The pattern: every choice should be defensible. If a reviewer asks "why this way?", you should have an answer ready.

## 5. The RFC pattern for non-trivial changes

For anything bigger than a small fix, write an RFC (Request for Comments) before writing code. The disciplined version:

**When to RFC:**
- Changes affecting more than one crate
- New public traits or types
- Breaking API changes
- New external dependencies
- Anything touching consensus-affecting behavior

**RFC structure (Reth's loose convention):**
1. **Motivation** — what problem are you solving, why now
2. **Design** — what you propose, with API sketches
3. **Alternatives** — what else you considered and why you rejected them
4. **Drawbacks** — honest list of what's worse about your proposal
5. **Prior art** — how other Rust EVM projects (or non-EVM systems) handle this

**Where to post:** a GitHub issue with the \`rfc\` label, or a forum post for the project (Reth has a forum thread structure).

The discipline: you think hard about the design *before* writing 2000 lines of code that need to be redesigned after review. Most senior contributors RFC even when they could get away without — it forces clarity.

**Reading recommendation:** find a recent merged RFC for Reth or Revm, read it, and notice how much of the work is in the "alternatives" and "drawbacks" sections.

## 6. Write code that reads like upstream code

The reviewer's hidden test: *"if I didn't know this PR was from a contributor, would I think it was written by the team?"*

Code that passes this test:
- Uses the same trait-first patterns the rest of the codebase uses (generic over \`N: Network\`, \`auto_impl\` where appropriate, builder pattern for configuration)
- Doesn't introduce new abstractions just to be clever
- Names types and functions the way neighboring code names them
- Avoids \`unsafe\` unless there's a specific perf justification you can articulate
- Uses the project's error types (\`eyre::Result\`, \`RethError\`, etc.) consistently with neighbors
- Comments the *why*, not the *what*

The auditor's mindset from the systems-code auditing lesson maps directly here. The questions an auditor asks ("what invariant does this assume?", "what happens on error?", "what scales?") are the same questions a reviewer asks. **Code that's easy to audit is code that's easy to review.**

A pre-submission checklist:
- Does my code match the surrounding style?
- Are my tests in the right directory with the right naming?
- Do my commits each tell a story?
- Is my PR description specific enough that a reviewer can verify without running my code?
- Have I anticipated and answered the 2–3 most likely reviewer questions?

## 7. Communication patterns that get PRs merged

Once your PR is up, your job is to make the reviewer's job easy.

**Fast response pattern (good):**
- Reviewer: "What about case X?"
- You: "Good catch. Will add a test + fix." (within hours)
- You: [push commit] (within 1–2 days)
- Reviewer: ✓ merged

**Slow response pattern (bad):**
- Reviewer: "What about case X?"
- You: [200-word defense of why your original design handles X correctly]
- Reviewer: [doesn't engage, moves to easier PR]
- 3 weeks later: PR closes for inactivity

The pattern: **assume the reviewer is right by default.** If you disagree, ask "what would make this OK?" rather than re-arguing. Reviewers have many PRs to handle; they don't have bandwidth for long debates.

**When reviewers disagree with each other** (happens in multi-maintainer projects): don't pick a side. Wait for them to align. If a week passes with no convergence, ping with "is there a way I can break the deadlock — split into two PRs? choose the simpler approach for now and revisit?"

**When your PR sits:** ping once after 14 days. If no response, ping once more after 28 days. After that, the silence is the answer — your work isn't the maintainers' priority right now. Move on. Don't burn social capital nagging.

## 8. The contributor's reputation arc

**First PR (small fix, merged):** you exist in the social graph. Maintainers might not remember your name yet.

**Five merged PRs:** maintainers recognize your handle. They start looking at your PRs more readily because past PRs were clean.

**Ten merged PRs:** you're a known reliable contributor in some area. Maintainers might ping you on issues adjacent to your area.

**Twenty merged PRs:** you're the unofficial expert on some piece of the codebase. New contributors get pointed at your past PRs as examples.

**Fifty+ merged PRs:** you're effectively part of the team. Maintainers consult you on design decisions in your area. **This is the level at which Paradigm starts thinking about hiring you.**

The arc is slow. Counter to most engineering advice, the "fast path" doesn't exist. The teams that hire from this stack hire from this arc; there's no shortcut.

## 9. What NOT to do

A non-exhaustive list of how to ensure your PRs get ignored:

- **Drive-by PR** — open one, then disappear. Maintainers learn not to invest review time in contributors who won't be back.
- **Auto-generated permission asks** — "Hi, would you be interested in a PR that adds X?" Just submit the PR; the answer is "show, don't ask."
- **Refactor PRs as first contribution** — "I noticed your code uses pattern X, here's the same code using pattern Y." Without history, this reads as criticism, not contribution.
- **Issues without research** — "Does Reth support feature X?" when the answer is in the docs or CONTRIBUTING.md.
- **Defensive review responses** — see §7.
- **Marketing posts about your PRs** — posting on Twitter "I just contributed to Reth!" before the PR merges. The maintainers see this. It reads as self-promotion before collaboration.

## 10. Four sources to monitor

To stay in the contributor flow without burning out:

1. **Issue tracker** — filter to \`good first issue\` + \`help wanted\` labels. Subscribe to issues in areas you understand.
2. **PR queue** — read open PRs (especially reviewed ones with active discussion). The review comments are free education.
3. **Discord / Telegram** — low-stakes channels for "is this the right approach?" questions before opening a PR.
4. **The codebase's TODO / FIXME comments** — these are often "would-be PRs waiting for someone to write them."

Spend ~30 minutes per week on these. The information compounds.

## Recall

Without scrolling:

1. **Why is the first PR's job NOT "make a big technical contribution"? What IS its job?**
2. **A reviewer asks "what about case X?" There are two response patterns. Which one gets the PR merged, and why?**
3. **When should you write an RFC before writing code? Name two triggers.**
4. **The "would I think this was written by the team?" test is applied mentally by the reviewer. Name three things to check before submitting that get you to pass it.**
5. **The reputation arc has 5 stages. At which stage does Paradigm start thinking about hiring? Why does that stage take years, not months?**

If any answer is shaky, re-read the section.

## 📂 References worth keeping open

- [paradigmxyz/reth — CONTRIBUTING.md](https://github.com/paradigmxyz/reth/blob/main/CONTRIBUTING.md)
- [bluealloy/revm — repository + book](https://github.com/bluealloy/revm)
- [alloy-rs/alloy — CONTRIBUTING.md](https://github.com/alloy-rs/alloy/blob/main/CONTRIBUTING.md)
- [Reth's recent merged PRs](https://github.com/paradigmxyz/reth/pulls?q=is%3Apr+is%3Amerged) — the calibration source
- [Reth Discord](https://discord.gg/reth) — \`#contributing\` channel for the lurking phase

---

**🧭 Where you are now in the stack:** the systems-code auditing lesson taught you what reviewers look for. This lesson taught you how to write code that passes their review and how to navigate the social process around it. Together they're the two halves of "be the contributor Paradigm recognizes." With the SE substrate (5 layers), the 4 forces (adversarial / verifiable / ordered / live-migrating), the reliability triangle (fuzzing / chaos / auditing), and now the contributor workflow, you have the full skill set the teams shipping this stack actually hire on. **The rest is doing the work — show up to the PR queue regularly.**

## Summary (3 lines)

- Paradigm contributor workflow = find issue + reproduce bug + minimal-diff fix + clear PR description + iterate.
- CI gate + benchmark neutral/positive + tests added. Cultural fit: code quality + tests + docs + perf.
- Merged PRs = strong CV signal; top contributors get hired. Predictable + meritocratic process.
`,
                },
                {
                  title: 'Quiz — Expert',
                  slug: 'expert-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 11,
                  duration: 15,
                  xpReward: 50,
                  content: `# Quiz — Expert

## Question

Final Expert module quiz: 10 questions across all 16 production-engineering lessons.

## Principle (minimum model)

- Perf + MDBX + Tokio + proc-macros + tracing + custom precompiles + MPT + stateless + MEV + zkEVM + Reth fork prod + differential fuzzing + EVM privacy + chaos engineering + systems auditing + OSS contribution.

## Worked example + steps

# Expert quiz

A final stress test on the production engineering layer.

## Summary (3 lines)

- Final Production Engineering quiz; 10 questions.
- Get three+ wrong → re-read relevant lessons.
- Pass → unlock Module 3: Reth-based Chains.
`,
                  quizQuestions: [
                    {
                      "question": "Why does Reth use MDBX instead of RocksDB for chain state?",
                      "options": [
                        "RocksDB's LSM-tree compactions improve write throughput but add unpredictable read latency — Reth picks MDBX (B+tree + mmap + MVCC) for predictable latency and lock-free reads",
                        "MDBX supports range scans natively while RocksDB requires building secondary indices",
                        "MDBX is written in Rust, so it integrates better with the rest of the Reth stack",
                        "MDBX's mmap design eliminates the kernel-userspace copy on every read, which RocksDB cannot do"
                      ],
                      "correctIndex": 0,
                      "explanation": "Ethereum is read-heavy and latency-sensitive. MDBX is C, not Rust (eliminates option 3). RocksDB does support range scans via iterators (eliminates option 2). The mmap claim in option 4 is partially true but is a consequence, not the design driver — the driver is compaction-stall avoidance for validator latency."
                    },
                    {
                      "question": "When optimizing Rust performance for a Reth fork, what should always come first?",
                      "options": [
                        "Add #[inline] hints to the functions you suspect are hot",
                        "Switch the global allocator to jemalloc — Reth already does this",
                        "Profile (flamegraph) and benchmark (Criterion) to identify the **actual** hot path before changing anything",
                        "Rewrite hot loops with the std::simd intrinsics for vectorization"
                      ],
                      "correctIndex": 2,
                      "explanation": "Premature optimization is bad; invisible slowdowns are worse. Each of the other three options is a real, defensible optimization — but applying any of them without measurement first is the failure mode this lesson exists to prevent."
                    },
                    {
                      "question": "What's the right way to do CPU-bound work inside a Tokio runtime?",
                      "options": [
                        "Wrap the call in tokio::spawn so it runs concurrently with other async tasks",
                        "Use tokio::task::spawn_blocking, which moves the work to a separate threadpool sized for blocking work",
                        "Use std::thread::spawn directly so the CPU work never touches Tokio",
                        "Annotate the function with #[tokio::task] so Tokio routes it appropriately"
                      ],
                      "correctIndex": 1,
                      "explanation": "tokio::spawn (option 1) still puts the work on the async worker pool — it starves the runtime exactly the same way as a direct call. std::thread::spawn (option 3) bypasses Tokio entirely, which loses you the JoinHandle integration. There is no #[tokio::task] attribute (option 4 is fabricated). spawn_blocking is the discipline."
                    },
                    {
                      "question": "When does a procedural macro run?",
                      "options": [
                        "At runtime, but the result is cached after the first invocation",
                        "At compile time, transforming an input TokenStream into an output TokenStream",
                        "At parse time, before the lexer runs — that is why proc macros can use raw bytes",
                        "After compilation but before linking, as part of the build script pipeline"
                      ],
                      "correctIndex": 1,
                      "explanation": "Proc macros run as the compiler is parsing your code, after lexing (eliminates option 3) and well before linking (eliminates option 4). They are not invoked at runtime at all (eliminates option 1). cargo expand shows you the result."
                    },
                    {
                      "question": "What is the key difference between a custom opcode and a custom precompile in Revm?",
                      "options": [
                        "Opcodes execute in the EVM interpreter loop; precompiles run in a separate process and communicate over IPC",
                        "Opcodes modify the EVM instruction set (breaking consensus with vanilla EVM); precompiles add native functions called via CALL to a reserved address (mostly transparent to Solidity/ABI tooling)",
                        "Custom opcodes are valid on mainnet; custom precompiles are restricted to App-chains",
                        "Opcodes can be invoked from any contract address; precompiles require a special precompile-enabled compiler"
                      ],
                      "correctIndex": 1,
                      "explanation": "Both run in-process — there is no IPC (eliminates option 1). Custom opcodes break consensus, custom precompiles do not (the OPPOSITE of option 3 is true). Precompiles are called via standard CALL — no special compiler needed (eliminates option 4)."
                    },
                    {
                      "question": "Why does Ethereum use a Merkle Patricia Trie (MPT) for state?",
                      "options": [
                        "Patricia tries are the fastest indexed data structure for arbitrary 256-bit keys",
                        "It commits to the entire world state in a single 32-byte hash, supports inclusion / non-inclusion proofs, and is space-efficient via path compression",
                        "It is resistant to hash-collision attacks because each tree level uses a different hash function",
                        "It supports parallel modification across all leaves without locking — critical for staged sync"
                      ],
                      "correctIndex": 1,
                      "explanation": "MPT is not the fastest lookup structure (eliminates option 1 — a HashMap is faster, but commits to nothing). It uses keccak256 throughout, not different hashes per level (eliminates option 3). Parallel modification is *not* an MPT property — sequential rehashing up to the root is required (eliminates option 4). The cryptographic commitment is the whole point."
                    },
                    {
                      "question": "In a production zkEVM proving pipeline using Revm, what is a \"witness\"?",
                      "options": [
                        "A cryptographic signature from a node operator attesting that the transaction was observed in the mempool",
                        "The set of state values the block accessed (accounts, code, storage slots, recent block hashes) that the prover consumes — since it cannot read disk inside the zkVM",
                        "A precomputed table of all gas costs for the opcodes used in the block",
                        "The full chain state snapshotted at the proven block, sent into the zkVM"
                      ],
                      "correctIndex": 1,
                      "explanation": "No signature is involved (eliminates option 1). Gas costs are constants in the EVM spec, not part of a witness (eliminates option 3). Sending the *full* state would defeat the purpose — witnesses are minimal subsets, not snapshots (eliminates option 4). If the block reads anything not in the witness, the proof fails."
                    },
                    {
                      "question": "For an MEV searcher, why is ExEx valuable?",
                      "options": [
                        "It includes a built-in JSON-RPC simulation endpoint that runs faster than the standard mainnet RPC",
                        "It receives every chain commit / reorg / revert notification at near-zero latency, in-process with full state access — perfect for warm caches and fast simulation",
                        "It bypasses Ethereum consensus rules so the searcher can simulate alternative orderings deterministically",
                        "It runs on a CPU core reserved by the OS scheduler so other workloads cannot preempt it"
                      ],
                      "correctIndex": 1,
                      "explanation": "ExEx is not an RPC endpoint (eliminates option 1) — it is a callback into your Rust code. It cannot bypass consensus; that is exactly the rules its notifications obey (eliminates option 3). Tokio scheduling has nothing to do with OS-level CPU pinning (eliminates option 4). The win is in-process latency on every chain event."
                    },
                    {
                      "question": "What is the cardinal rule when pricing a custom precompile?",
                      "options": [
                        "Set the gas to roughly 1/10 of the equivalent Solidity implementation so adoption is incentivized",
                        "Gas cost should track CPU cost — typically benchmark on the worst realistic input, multiply by a 2–5x abuse factor, then validate against adversarial inputs",
                        "Charge a flat per-call cost so the gas model stays predictable for users",
                        "Use the gas cost of the most-similar standard precompile (e.g., ecrecover) as a baseline"
                      ],
                      "correctIndex": 1,
                      "explanation": "Underpricing for adoption (option 1) is exactly the DoS vector EIP-2929 had to retrofit. A flat cost (option 3) breaks the moment input size matters. Borrowing another precompile's number (option 4) is fine as a sanity check but ignores your specific CPU profile. The real workflow is benchmark → abuse factor → adversarial validation."
                    },
                    {
                      "question": "For a custom Reth fork running an App-chain, what is the realistic minimum production deployment?",
                      "options": [
                        "Three validators co-located in a single datacenter behind one load balancer (lowest latency)",
                        "≥4 validators distributed across 3 datacenters, with sentry nodes shielding each validator, separate archive nodes for analytics, and a rate-limited RPC fleet — never co-locating validator and public RPC",
                        "Five validators in the same cloud region (cross-region adds too much consensus latency)",
                        "Two validators in active-passive failover with a hot standby (keeps the ops team small)"
                      ],
                      "correctIndex": 1,
                      "explanation": "BFT safety needs a quorum across failure domains — single-DC (option 1) and single-region (option 3) collapse on one fault. Two validators (option 4) cannot tolerate any byzantine behavior. The realistic minimum is geographic distribution + sentry separation + dedicated RPC fleet, because one DDoS on a public RPC must not halt consensus."
                    }
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
                  title: 'Lesson 17 — The Reth extension pattern — library, not fork',
                  slug: 'reth-extension-pattern-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 14,
                  xpReward: 40,
                  content: `# Lesson 17 — The Reth extension pattern — library, not fork

## Question

**Reth as a library, not a fork.** Extend without forking the codebase. Use the NodeBuilder + trait impls; track upstream.

## Principle (minimum model)

- **Library pattern.** Import Reth as \`Cargo.toml\` dep; instantiate \`NodeBuilder\`; customise via trait impls. Upstream upgrades = bump version.
- **Fork pattern (anti-pattern).** Clone Reth; modify in-tree; diverge from upstream. Hard to track upstream; freeze the version.
- **Why library wins.** Smaller maintenance burden; track upstream; community ecosystem.
- **OP Stack uses library.** OP-Reth = Reth + custom executor + custom chainspec. Tracks Reth upstream.
- **bera-reth uses library.** Custom Consensus impl + chainspec. Tracks upstream.
- **Tempo uses library.** Custom Pool + custom precompiles. Tracks upstream.
- **Anti-pattern: forking.** Some custom L1s fork. Heavy maintenance burden; upstream improvements blocked.

## Worked example + steps

# The Reth extension pattern — library, not fork

If you've worked with **op-geth**, **bsc-geth**, or **bor** (Polygon), you know the geth-fork story: clone the upstream, apply your patches, rebase forever. Every upstream merge is a weekend of conflict resolution, and the audit surface drifts away from mainline.

**Reth was designed to make this model obsolete.** Optimism, Base, Berachain, Scroll, Seismic, Sova, alphanet, and Tempo all run on Reth — and almost none of them are forks in the traditional sense. They are *node crates* that **depend on reth as a library** and override the parts they care about via traits.


## 1. The two models

| Model | How it works | Cost over time |
| :--- | :--- | :--- |
| **Fork model** (geth-style) | Clone upstream, patch source, rebase periodically | Drift cost is **superlinear** — patches and upstream diverge, conflicts compound |
| **Extension model** (reth-style) | Depend on reth crates, implement chain-specific traits in a separate crate | Drift cost is **localized** — your code changes only when trait signatures change |

Reth's whole architecture is built around the second model. The NodeBuilder / components / ChainSpec pattern you saw in the Intermediate course exists precisely so that **you never have to patch reth's source to ship a chain**.

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


## 4. Concrete examples to read

Order them from "shipped to mainnet" → "R&D":

1. **\`crates/optimism/\`** in [paradigmxyz/reth](https://github.com/paradigmxyz/reth) — Optimism / Base / Mode / OP Stack. The most production-tested extension on the planet.
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

> Final check: in one sentence, what is the structural reason a Reth-based chain rarely needs to patch reth's source? If your answer doesn't reference **trait-based extension** and **NodeBuilder composition**, the lesson hasn't stuck. Re-read sections 1 and 2.

## Summary (3 lines)

- Reth as a library, not a fork. Import + customise via trait impls + track upstream.
- Library examples: OP-Reth / bera-reth / Tempo. All track Reth upstream.
- Fork pattern is anti-pattern: heavy maintenance, upstream improvements blocked. Next: op-stack-on-reth.
`,
                },
                {
                  title: 'Lesson 18 — Reading op-stack-on-reth — the anatomy of a Reth-based L2',
                  slug: 'reading-op-stack-on-reth-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 45,
                  content: `# Lesson 18 — Reading op-stack-on-reth — the anatomy of a Reth-based L2

## Question

**op-stack-on-reth = the canonical Reth-based L2**. Reading it teaches the Reth extension pattern.

## Principle (minimum model)

- **Project structure.** \`crates/optimism/node\` + \`crates/optimism/chainspec\` + \`crates/optimism/executor\`. Each is a customisation of a slot.
- **Custom Consensus.** OP-specific block-validation rules. Replaces Reth's default.
- **Custom Executor.** OP-specific tx processing (including L1 fee).
- **Custom Chainspec.** OP-specific genesis + forks + hardforks.
- **RPC extensions.** OP-specific JSON-RPC methods (\`optimism_outputAtBlock\` etc).
- **NodeBuilder wiring.** ~30 lines in \`main.rs\` that ties everything together.
- **Tracks Reth upstream.** Bumps Reth version; runs the test suite; ships.
- **Production status.** OP Mainnet + Base + Zora all run op-stack-on-reth.

## Worked example + steps

# Reading op-stack-on-reth — the anatomy of a Reth-based L2

Optimism is the canonical "Reth-based L2." Its node code lives at \`paradigmxyz/reth/crates/optimism/\`. If Tempo's node crate looked anything like this, you'd already know how to read it. So that's the goal of this lesson: **make the directory shape obvious.**


## 1. Where to look

Browse: [paradigmxyz/reth → crates/optimism/](https://github.com/paradigmxyz/reth)

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

> Final check: in two sentences, describe **the shape of a Reth-based chain repo**, in words that would let a new hire find anything in 10 minutes. If you start with "it has a folder," start over and lead with the *concept* (extension via traits + NodeBuilder composition).

## Summary (3 lines)

- op-stack-on-reth = canonical Reth-based L2. Custom Consensus / Executor / Chainspec / RPC; ~30-line NodeBuilder wiring.
- Production: OP Mainnet + Base + Zora.
- Reading it teaches the extension pattern. Next: custom Chainspec.
`,
                },
                {
                  title: 'Lesson 19 — Custom ChainSpec — forks, genesis, and the precompile schedule',
                  slug: 'custom-chainspec-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 14,
                  xpReward: 40,
                  content: `# Lesson 19 — Custom ChainSpec — forks, genesis, and the precompile schedule

## Question

**ChainSpec = genesis + forks + precompile schedule + chain ID**. Customise per chain. Reth's NodeBuilder takes one as input.

## Principle (minimum model)

- **Genesis state.** Pre-deployed contracts + initial balances + nonces. Defined in JSON.
- **Hardfork schedule.** Block-number-keyed list: "at block 100, activate Berlin. At block 200, activate London."
- **Precompile schedule.** Which precompiles at which block. Mainnet has 9; custom chains may add more at specific blocks.
- **Chain ID.** Unique per chain. 1 = mainnet, 137 = polygon, etc. Custom = pick unused.
- **Validation.** Reth's \`ChainSpec::validate\` checks for consistency. Conflicts fail fast.
- **Testing.** Spin up a node with the chainspec; mine some blocks; assert hardforks activate.
- **Production examples.** Sepolia testnet, OP Mainnet, Hyperliquid, Tempo. Each has its own chainspec.

## Worked example + steps

# Custom ChainSpec — forks, genesis, and the precompile schedule

The block validates on mainnet but rejects on your chain. Same block, same client binary, same Revm — different result. Why? Because something inside \`ChainSpec\` said "at this height, the rules are different here." A wrong fork height, a wrong precompile schedule entry, a wrong base-fee parameter — any one of them, and your chain forks itself off the network in one block.

\`ChainSpec\` is the Rust struct that owns "what makes this chain different from mainnet Ethereum at the **protocol** level" — chain ID, fork activation, base fee curve, genesis allocation, precompile schedule. If you're going to read or build a Reth-based chain, **this is the type you read first**.


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

> Final check: if I asked you "what fork activation rule does chain X use at block N?", what files would you need to read, and in what order? If your answer is more than 2 files, you're over-complicating it — ChainSpec + the activation table is the whole story.

## Summary (3 lines)

- ChainSpec = genesis + hardfork schedule + precompile schedule + chain ID. JSON config.
- Validation via \`ChainSpec::validate\`. Test by spinning up node + mining.
- Production: each L1/L2 has its own chainspec. Reth: pluggable via NodeBuilder. Next: custom Executor.
`,
                },
                {
                  title: 'Lesson 20 — Custom executor — swapping the execution layer',
                  slug: 'custom-executor-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 18,
                  xpReward: 45,
                  content: `# Lesson 20 — Custom executor — swapping the execution layer

## Question

**Custom Executor = override how Reth processes txs**. Standard = revm with mainnet rules. Custom = OP fee handling, custom precompiles, etc.

## Principle (minimum model)

- **Executor trait.** \`execute_block(block, state) -> ExecutionResult\`. Reth calls this per block.
- **Standard impl.** \`EthExecutor\` runs revm. Used by default.
- **Custom impl.** Override \`execute_block\` to use revm with custom precompiles + custom fee handling.
- **Wire via NodeBuilder.** \`NodeBuilder::executor(YourExecutor::default())\`.
- **Test.** Run a tx through; assert behaviour differs from default Eth.
- **Common customisations.** OP L1 fee handling, Hyperliquid CLOB precompiles, Tempo merchant attestation, Berachain PoL.
- **Composes with other components.** Custom Executor + Custom Pool + Custom Consensus = a fully custom L1.
- **Production parallel.** All Reth-based L1s/L2s ship custom executors.

## Worked example + steps

# Custom executor — swapping the execution layer

The executor is "what actually runs the transactions and produces the post-state." For Ethereum mainnet, this is vanilla revm. For Optimism, it's revm **plus deposit-tx handling**, **plus L1 cost computation**, **plus a slightly different precompile list**. This lesson is about how Reth lets you swap that in.


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

> Final check: name the two things that **must** be in the executor (not in a precompile, not in the mempool) for a Reth-based chain, and explain why each must live there. If you can't, re-read sections 4 and 5.

## Summary (3 lines)

- Custom Executor = override Reth's tx-processing. Trait impl + NodeBuilder wiring.
- Common customisations: OP L1 fee, Hyperliquid CLOB precompiles, Tempo merchant attestation, Berachain PoL.
- Composes with custom Pool + Consensus. Production: all Reth-based L1/L2s ship custom executors.
`,
                },
                {
                  title: 'Lesson 21 — Custom payload builder — sequencer-mode block production',
                  slug: 'custom-payload-builder-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 16,
                  xpReward: 45,
                  content: `# Lesson 21 — Custom payload builder — sequencer-mode block production

## Question

**Custom PayloadBuilder = sequencer-mode block production**. Reth-as-sequencer (centralised L2) needs this. Read the customisation pattern.

## Principle (minimum model)

- **PayloadBuilder trait.** \`build_payload(attrs) -> Payload\`. Called by sequencer to mint a block.
- **Standard impl.** Takes mempool txs; orders by gas price; builds block. Used by Eth nodes.
- **Custom impl.** Override to add: bundle txs from MEV searcher, drain pending fills (CLOB), system txs (L1 messages), priority queue (payment rail).
- **Wire via NodeBuilder.** \`NodeBuilder::payload_builder(YourBuilder::default())\`.
- **Hot path.** Called every 12 seconds (or your block time). Performance matters.
- **Tests.** Build a payload; assert it contains expected txs + system txs.
- **Production examples.** op-rbuilder (Flashbots) for OP Mainnet, Hyperliquid sequencer, Tempo sequencer.
- **Sequencer mode = centralised.** Trade-off: faster blocks vs decentralisation. Production L2s pick the trade-off explicitly.

## Worked example + steps

# Custom payload builder — sequencer-mode block production

For Ethereum mainnet, blocks are produced by **validators** running the consensus client and pulling proposed payloads from the execution client. For an L2 or any centralized-sequencer chain, the block-production model is different: **the sequencer is the block producer**, full stop. The payload builder is the component that knows how.


## 1. The trait surface

\`PayloadBuilder\` (and friends) is the slot in reth's NodeBuilder for "how to build a block." It takes:

- A parent block (where we're building from)
- Current chain state
- A pool of pending transactions
- A timestamp / slot

...and returns a built block (the "payload"). On mainnet, the validator's consensus client triggers this via the Engine API. On a sequencer L2, the sequencer triggers it directly.

## 2. Three production-relevant builders

The reth ecosystem has multiple payload builders to study:

| Builder | Where | Use case |
| :--- | :--- | :--- |
| Default Ethereum builder | \`crates/payload/builder/\` | Mainnet validators |
| OP payload builder | \`crates/optimism/payload/\` | OP Stack sequencer |
| **op-rbuilder** | [flashbots/rbuilder](https://github.com/flashbots/rbuilder) | High-perf external block builder for OP Stack |

The first two are inside reth. **op-rbuilder** is a separate repo, more aggressive about MEV and ordering policy, and is the production builder several OP Stack chains use.

## 3. What an L2 builder does differently

Sequencer-mode block production typically:

1. **Force-includes deposit txs** at the top of the block (from a known L1 oracle queue)
2. **Sorts the rest of the block** by either FIFO (first-come-first-serve) or priority-fee
3. **Updates the L1 block oracle storage slot** as the first state write
4. **Caps the block at the L2 gas limit** (not the mainnet limit)
5. **Tags the block with the sequencer's signature** (some L2s commit to sequencer identity)

Notice that several of these are **not in the executor** — they're in the *builder*. Why? Because the builder controls *what goes into a block*; the executor only runs *what's in a block*.


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

[flashbots/rbuilder](https://github.com/flashbots/rbuilder) is the external builder Paradigm built for OP Stack. Worth studying because:

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

Then read [op-rbuilder's README](https://github.com/flashbots/op-rbuilder) for the "external builder" model.

> Final check: in one sentence, what does the payload builder **decide** that the executor does not? If your answer doesn't include the word "ordering" or "selection," go back and re-read section 3.

## Summary (3 lines)

- Custom PayloadBuilder = sequencer-mode block production. Override \`build_payload\`.
- Customisations: MEV bundles, CLOB fills, system txs, priority queue. Hot path; performance matters.
- Production: op-rbuilder (OP) + Hyperliquid + Tempo sequencers. Centralised; trade-off accepted.
`,
                },
                {
                  title: 'Lesson 22 — Case study — Paradigm\'s stack: alphanet, Tempo, and the L1 pattern',
                  slug: 'paradigm-stack-case-study-en',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 18,
                  xpReward: 50,
                  content: `# Lesson 22 — Case study — Paradigm's stack: alphanet, Tempo, and the L1 pattern

## Question

**Paradigm's stack** = alphanet (testbed) + Tempo (production) + reusable patterns. Read the architecture choices.

## Principle (minimum model)

- **alphanet.** Paradigm's research-grade testnet. Experiments live here before production.
- **Tempo.** Production-grade payment rail. Stable coin + machine payment + custom precompiles.
- **Pattern: library-first.** Both alphanet + Tempo use Reth as a library. Track upstream.
- **Pattern: explicit customisation.** Document every diff from mainnet. Tempo's chainspec + precompiles + pool are all documented.
- **Pattern: production discipline.** Continuous monitoring + chaos drills + bug bounty + rapid response.
- **Pattern: external partnerships.** Chainlink CCIP for cross-chain. Worldcoin for IDs. Builds composition.
- **Pattern: open-source.** Paradigm publishes architectures + code. Lowers integration cost for ecosystem.
- **Why this matters.** Paradigm is the modal contributor to Reth + Revm + Alloy + openhl + Tempo + many more. Their stack = the de-facto standard.

## Worked example + steps

# Case study — Paradigm's stack: alphanet, Tempo, and the L1 pattern

You've now seen the four extension slots (ChainSpec, executor, payload builder, RPC) and the dependency shape of a Reth-based chain. This lesson is the **synthesis**: what does Paradigm's full stack look like, and now that **Tempo's source is public**, how do you read it against the structure you just learned?


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

## 5. MegaETH — same pattern, deeper customization

If Tempo shows the **shallow end** of the SDK (swap a few components, keep everything else), [\`megaeth-labs\`](https://github.com/megaeth-labs) shows the **deep end**:

- **[\`megaeth-labs/reth\`](https://github.com/megaeth-labs/reth)** — empty fork (**0 commits ahead, 7666 commits behind**). Same compose-don't-fork pattern as Tempo, just further out of sync.
- **[\`megaeth-labs/mega-evm\`](https://github.com/megaeth-labs/mega-evm)** — custom EVM built on revm + op-revm with MegaETH-specific specs (\`EQUIVALENCE\` through \`REX4\`). The sequencer runs JIT/AOT compiled execution via Paradigm's [\`revmc\`](https://github.com/paradigmxyz/revmc).
- **[\`megaeth-labs/salt\`](https://github.com/megaeth-labs/salt)** — they replaced **MDBX with a custom authenticated KV store**. ~1 GB of memory authenticates 3 B items; random disk I/O during state-root updates is eliminated. This goes far past the standard 6 component slots.
- **[\`megaeth-labs/stateless-validator\`](https://github.com/megaeth-labs/stateless-validator)** — a **different validator binary** entirely, separate from the sequencer. Reads SALT witnesses, runs blocks against a vanilla revm interpreter, fits on commodity hardware. The architectural move: separate the high-spec sequencer from low-spec validators by giving them entirely different node code.

The point of putting MegaETH next to Tempo in this lesson: **the SDK doesn't constrain how deep you customize.** Tempo swaps three components and inherits ~80% of upstream. MegaETH swaps the EVM executor, replaces the storage layer, and ships an entirely separate validator client — and **still does not fork Reth** (\`megaeth-labs/reth\`: 0 ahead, 7666 behind). The ceiling is much higher than first reading suggests.

## 6. The L1 vs L2 distinction in the extension model

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

## 7. Why this matters for what you ship

If you are building on top of Tempo:

| Project | Why Reth-on-Tempo knowledge matters |
| :--- | :--- |
| Cross-VM intent matcher | Intent matching needs deterministic EVM semantics. Reading Tempo's executor crate tells you exact gas costs, precompile availability, and execution edge cases. |
| Cross-chain settlement layer | Settlement proofs on the EVM side must match Tempo's state exactly. Reading Tempo's chainspec and executor gives you the source of truth. |
| Merchant treasury / payment ops | Merchant operations need predictable confirmation semantics. Tempo's payload builder + mempool policy tells you when a tx becomes inclusion-final. |

You are **months ahead** of anyone who shows up at Tempo's launch without having read reth at the trait level.

## 8. Final practice

The deliverable for this module: open [\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo) and write a 1-page architectural summary in a single sitting by reading:

1. The Tempo node crate's \`Cargo.toml\` — confirm the reth dependency is upstream and unforked
2. The chainspec crate — hardforks + precompile schedule
3. The NodeBuilder composition (likely in \`node/src/lib.rs\` or similar) — which of the 6 components are swapped, which inherit
4. Each swapped crate in order — payload, pool, RPC namespace
5. The tests directory — what behaviors did they care enough about to assert?

If you've never read alphanet end-to-end, do that first as practice — it's smaller and cleaner.

> Final check: write **5 specific things you verified by reading \`tempoxyz/tempo\` source**, ranked by importance for your own work. If you can't list 5, this module hasn't fully landed — re-read sections 4 and 5, then go back to the source.

## Summary (3 lines)

- Paradigm stack = alphanet (testbed) + Tempo (prod) + library-first Reth + explicit customisation + production discipline.
- Patterns: library-first / explicit-diff documentation / external partnerships (CCIP, Worldcoin) / open-source.
- Paradigm is modal contributor to Reth / Revm / Alloy / openhl / Tempo. Their stack = de-facto standard. Next: quiz.
`,
                },
                {
                  title: 'Quiz — Reth Chains',
                  slug: 'reth-chains-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 6,
                  duration: 15,
                  xpReward: 50,
                  content: `# Quiz — Reth Chains

## Question

Final Reth-based Chains quiz: extension pattern + OP-stack + chainspec + executor + payload builder + Paradigm case study.

## Principle (minimum model)

- Library vs fork + op-stack-on-reth anatomy + ChainSpec + Custom Executor + Custom PayloadBuilder + Paradigm stack patterns.

## Worked example + steps

# Quiz: did the extension pattern stick?

A short test on the extension model and where each customization lives. No fluency — every question has a real "which trait / which crate" answer.

## Summary (3 lines)

- Final Reth Chains quiz; 10 questions.
- Get three+ wrong → re-read the relevant lesson chain.
- Pass → Reth Expert complete. Course total: 24 lessons across Performance/Systems + Production Engineering + Reth Chains.
`,
                  quizQuestions: [
                    {
                      "question": "Why do most Reth-based chains use the extension model rather than the geth-style fork model?",
                      "options": [
                        "Reth is faster than geth, so chains are forced to adopt it for performance",
                        "Reth's modular trait architecture (NodeBuilder + ChainSpec + ExecutorBuilder + PayloadBuilder) lets a chain customize only the parts it needs while consuming the rest as a library — eliminating rebase cost",
                        "Rust prevents source-level forking due to its module system",
                        "Paradigm enforces an extension-only policy on all chains that use Reth"
                      ],
                      "correctIndex": 1,
                      "explanation": "Speed (option 1) is a happy side-effect, not the architectural reason. Rust does not prevent forking (option 3 is wrong). Paradigm enforces nothing on independent chains (option 4 is wrong). The real driver is the trait architecture — chains override the slots that matter and inherit the rest."
                    },
                    {
                      "question": "Where does a Reth-based chain's hardfork activation logic live?",
                      "options": [
                        "In the payload builder, because the builder is what produces blocks at each fork",
                        "In ChainSpec — which fork is active at a given block height / timestamp is a consensus rule, and ChainSpec owns consensus rules",
                        "In the executor, because forks change execution behavior",
                        "In the genesis JSON, alongside the initial state allocations"
                      ],
                      "correctIndex": 1,
                      "explanation": "Multiple layers read the fork state, but only one owns it: ChainSpec. Builder (option 1) and executor (option 3) read fork state to make decisions, but they consult ChainSpec — they do not own activation. Genesis (option 4) is the *initial* state, not the fork schedule."
                    },
                    {
                      "question": "OP Stack charges an L1 data cost in addition to L2 gas. Which trait's implementation contains that logic, and why?",
                      "options": [
                        "A custom precompile, because precompiles are the natural place to put native fee logic",
                        "The mempool policy, because the fee is calculated at admission time",
                        "The block execution strategy / executor, because charging an account before tx execution is a consensus-critical state mutation that every node must compute identically",
                        "The RPC layer, because clients need to know the L1 cost before they submit"
                      ],
                      "correctIndex": 2,
                      "explanation": "A precompile (option 1) cannot deduct from arbitrary accounts on its own — that requires executor-level authority. Mempool (option 2) might *estimate* the cost but cannot enforce consensus state changes. RPC (option 4) is informational, not consensus-critical. The executor is the only layer with both the authority and the consensus-critical position."
                    },
                    {
                      "question": "A Reth-based L2 needs to force-include deposit transactions at the top of every block. Which trait should handle that?",
                      "options": [
                        "The ChainSpec — deposit handling is a chain rule",
                        "The payload builder — it decides what goes into a block and in what order",
                        "The mempool — deposit txs sit in a separate queue and the mempool drains them first",
                        "Custom consensus — only consensus can enforce ordering"
                      ],
                      "correctIndex": 1,
                      "explanation": "ChainSpec (option 1) defines *what* a deposit tx is, not how it's selected. Mempool (option 3) can track deposit queues but the *include-at-top* rule is a block-composition decision. Consensus (option 4) is overkill — selection is a builder concern, not a finality concern. The payload builder is the single component that decides block composition and order."
                    },
                    {
                      "question": "When you write a custom precompile for a Reth-based chain, where does the *registration* of that precompile happen?",
                      "options": [
                        "In the precompile crate itself, via a static registry",
                        "In the chain's EVM config (a ConfigureEvm impl), which hands revm the active precompile set — gated by the chain's hardfork schedule",
                        "In reth's core, by editing the precompile dispatch table",
                        "In the genesis JSON, as part of the initial code allocation"
                      ],
                      "correctIndex": 1,
                      "explanation": "Static registries (option 1) cannot be gated by chain rules. Editing reth core (option 3) is exactly the fork-model anti-pattern we are avoiding. Genesis (option 4) holds state, not protocol-level functions. The EVM config is the right slot: it joins ChainSpec (which fork?) with revm (what runs)."
                    },
                    {
                      "question": "Which of the following best describes the relationship between alphanet and Tempo?",
                      "options": [
                        "They are the same project under two names",
                        "alphanet is the test deployment of Tempo",
                        "alphanet is an R&D testnet where Paradigm validates EVM extensions (e.g., custom precompiles) that may later ship in production chains like Tempo or be proposed as Ethereum EIPs",
                        "Tempo is built on alphanet, which is built on Reth",
                        "They are unrelated except for shared maintainership"
                      ],
                      "correctIndex": 2,
                      "explanation": "alphanet is the playground; Tempo is a production rail. Option 1 and 2 conflate them. Option 4 has the dependency order wrong — both depend on Reth, not on each other. Option 5 is too weak: the technical lineage of precompile experiments is real and traceable."
                    },
                    {
                      "question": "On a centralized-sequencer L2, what does the payload builder decide that the executor does not?",
                      "options": [
                        "The payload builder decides gas pricing; the executor decides ordering",
                        "The payload builder decides which transactions to include in the block and in what order; the executor merely runs whatever the builder hands it, in the given order",
                        "They make identical decisions — the builder is a thin wrapper around the executor",
                        "The payload builder validates signatures; the executor applies state changes"
                      ],
                      "correctIndex": 1,
                      "explanation": "Gas pricing (option 1 swap) is mostly chainspec, not builder vs executor. Identical (option 3) is wrong — the separation is the entire point. Signature validation (option 4) is at the executor / tx validator layer, not the builder. The clean split: builder = selection + ordering, executor = run-what-you-are-told."
                    },
                    {
                      "question": "You open `tempoxyz/tempo` for the first time and want to confirm Paradigm followed the \"compose, don't fork\" model. What is the single highest-signal check?",
                      "options": [
                        "Read the README and announcement blog posts",
                        "Open `tempoxyz/reth` and check its commits-ahead/behind count against `paradigmxyz/reth`",
                        "Count the number of crates in the `tempoxyz/tempo` workspace",
                        "Run a benchmark comparing Tempo and upstream Reth throughput"
                      ],
                      "correctIndex": 1,
                      "explanation": "README / blog posts (option 1) say the right things but don't prove them. Crate count (option 3) is loosely correlated but noisy. Benchmarks (option 4) measure perf, not whether they forked. The fork check (option 2) is the definitive structural test — and the answer is \"0 ahead, 1374 behind,\" which is the strongest empirical proof of the compose-don't-fork thesis."
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
