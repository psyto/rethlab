import { PrismaClient } from '@prisma/client';

export async function seedRethRevmAdvancedEN(prisma: PrismaClient) {
  const tags = ['revm', 'rust', 'advanced', 'opcode', 'evm-internals'];

  await prisma.course.create({
    data: {
      slug: 'revm-advanced-en',
      title: 'Inside Revm — Reading the EVM Engine',
      description:
        'Read the Revm interpreter line by line — the **compiler / VM layer** of the Rust EVM stack. Walk the real `add` opcode, custom opcodes, the `Database` trait that supplies state, parallel execution (block-stm), and the EVM-privacy precompiles design. One of three independent Intermediate courses (Revm, Reth, Alloy) you can take in any order — though Revm gives you the type vocabulary the others assume.',
      difficulty: 'INTERMEDIATE',
      duration: 120,
      xpReward: 340,
      track: 'revm-advanced',
      tags,
      isPublished: true,
      sortOrder: 210,
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
                  title: 'Welcome to Inside Revm — how this course works',
                  slug: 'revm-advanced-welcome-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 7,
                  xpReward: 15,
                  content: `# Welcome to Inside Revm — how this course works

Revm is the **execution engine** inside every Rust EVM client: Reth, Hyperliquid's HyperEVM, Berachain's bera-reth, Tempo. When a chain says "we run Revm," it means: the opcode loop, the gas accounting, the way state gets read — *that's the same code*, no matter whose fork you're looking at. Read it once and you can read all of them.

This is one of three independent Intermediate-tier courses on RethLab:

- **Inside Revm** (you are here) — Inside the EVM engine
- **Inside Reth** — Inside Reth: Staged Sync, ExEx, the Reth SDK
- **Inside Alloy** *(coming soon)* — Inside Alloy: Provider, Network, Signer

Revm goes first because its types (\`Address\`, \`U256\`, \`B256\`, the \`Database\` trait) underpin most of what Reth and Alloy do. The three courses are independent — pick the one that matches what you're building.

> 📋 **First time at the Intermediate tier?** Read **"How Intermediate courses work"** at the end of *Bridge to Intermediate* before starting. It explains the editorial style (Predict prompts, Quiz gates, the build-up → walkthrough → quiz → drill chain shape) and pacing — applies to all three Intermediate courses, so you only read it once.

## What this course teaches

You'll read the [\`bluealloy/revm\`](https://github.com/bluealloy/revm) source line by line: the \`add\` opcode and the macro stack around it, custom opcodes and the instruction dispatch table, the \`Database\` trait that supplies state to the EVM. Three topic chains, each with build-up + walkthrough + quiz + drill.

By the end, you'll have read every line of revm's hot path and be able to explain what each piece does in your own words.

## Prerequisites

**EVM internals** (covered in Bridge to Intermediate — go back if shaky):
- Bytecode and the dispatch loop (opcodes as bytes, PC, instruction table)
- Stack / memory / calldata / storage — what each is and how they differ
- Cold vs warm gas (EIP-2929)
- Call frames: CALL / DELEGATECALL / STATICCALL semantics
- Block structure (header / body / receipts), reorgs as a normal phenomenon

**Intermediate Rust** (also Bridge to Intermediate; there's a *Rust: lifetimes, Box, Arc, dyn Trait* lesson inside Inside Reth for self-checking):
- Generics with trait bounds, \`?Sized\`, \`dyn Trait\` vs \`impl Trait\`
- \`Arc<T>\`, \`Mutex<T>\`, \`RwLock<T>\` — when to use each
- \`unsafe\` blocks and \`unwrap_unchecked()\`
- \`macro_rules!\` syntax (\`$x:ident\`, \`$($x),*\`, fragment specifiers)

## Setup — do this once

Before lesson 1, have these ready in another window:

1. **\`bluealloy/revm\` cloned** — \`git clone https://github.com/bluealloy/revm\`
2. **A working \`cargo\` toolchain** — \`rustc --version\` should print something modern
3. **\`cargo-expand\`** — \`cargo install cargo-expand\` (you'll want it for the procedural macros lesson in Expert)
4. **A second monitor or split terminal** — you'll be cross-referencing source while you read

The "Find in repo" prompts only work if you actually have the repos open. Close that loop before starting.

## You're ready

Scroll back to the course detail and start with **Building \`add\` step by step: signature and body**.

After Inside Revm: head to **Inside Reth** for the Reth-specific sync pipeline + ExEx + SDK, or **Inside Alloy** when it's available.`,
                },
                {
                  title: 'Building \`add\` step by step: signature and body',
                  slug: 'revm-add-buildup-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 8,
                  xpReward: 20,
                  content: `# Building \`add\` step by step: signature and body

> 🧭 **Where this lives in the systems-engineering stack:** the **compiler / VM layer**, at the per-opcode level. The same problem CPython, JVM, and LuaJIT have written volumes about — "implement this trivial primitive in the fewest possible instructions, parameterized so the same source compiles into traced / inspected / production builds." This lesson is that lineage applied to EVM \`ADD\`.

\`ADD\` is the simplest non-trivial EVM opcode: pop two numbers, push their sum. A weekend hobby EVM would do it in five lines of Rust. Revm does it in **four**, but those four lines hide a generic signature with two type parameters, a \`?Sized\` opt-out, a macro that compiles to a stack-underflow guard with a branch-prediction hint, and a \`wrapping_add\` whose alternative would fork your client off mainnet on the first overflow.

Here's the real source from [\`bluealloy/revm\`](https://github.com/bluealloy/revm):

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

Walk it line by line and you get six new ideas at once. Easier path: **build it up.** Start from the dumbest \`add\` you could write, and earn each piece of complexity. By the end of *this* lesson you'll have built everything except the macro on line 2 — that's the next one.

> 📂 **Open \`bluealloy/revm\` in another tab.** You'll be cross-checking the build-up against the real source.

## Step 0 — The naive \`add\`

If you were writing an EVM in Rust without thinking too hard, your \`add\` would look like:

\`\`\`rust
pub fn add(stack: &mut Vec<U256>) -> Result<(), &'static str> {
    let a = stack.pop().ok_or("underflow")?;
    let b = stack.pop().ok_or("underflow")?;
    stack.push(a + b);
    Ok(())
}
\`\`\`

Pop two values. Add them. Push the result. Done.

> 🛑 **Predict.** Without scrolling: name **two** things this version does that revm's real \`add\` deliberately avoids. (Hint: one is in the signature, one is in the body.) Hold your guesses — we'll fix each.

The two are:

1. **It only works with one host environment.** \`&mut Vec<U256>\` is a concrete type. You can't swap in a tracer's stack, a fuzzer's stack, or an Inspector-sandboxed stack without rewriting the function.
2. **It pops *and* pushes — three stack operations.** Real \`add\` does *one* — overwrite the new top in place.

We'll fix #1 first (the signature), then #2 (the body).

## Step 1 — Make it generic over the host

Revm has to plug into multiple environments:

- **Production execution** (the main path)
- **Tracing** (record every stack op for debugging)
- **Inspector sandbox** (let an external observer step the EVM)
- **Fuzzers, mainnet forks, state-test runners**

Each has a slightly different stack/state shape. We don't want six copies of \`add\`.

First-attempt fix: make the function generic over a \`Host\` trait (a Rust trait is a shared interface — like a Java interface, but resolved at compile time).

\`\`\`rust
pub fn add<H: Host>(host: &mut H) -> Result {
    // ... same body, but calling host.stack instead of a concrete Vec
}
\`\`\`

\`H: Host\` reads as "any type that implements the \`Host\` trait." One source. **One specialized binary per concrete \`H\`** at compile time (Rust's *monomorphization* — the compiler stamps out a copy per type that uses it).

> 🛑 **Predict.** What's the catch with \`<H: Host>\`? Why might revm not stop here?

Two catches:

1. With many host types, monomorphization explodes compile times.
2. **You can't pass a trait object** like \`&mut dyn Host\` (a \`dyn Trait\` is Rust's runtime-dispatched trait pointer, the equivalent of a Java interface reference). \`<H: Host>\` only accepts types whose size is known at compile time.

Why would you want a trait object? Because sometimes you build the host at runtime — selected by a config flag, or constructed dynamically by a test harness. Trait objects are how you say "I don't know which concrete \`Host\` impl this is until runtime — please use a vtable."

That's where \`?Sized\` comes in.

## Step 2 — Allow trait objects: \`H: ?Sized\`

Rust silently adds a \`Sized\` bound to **every** generic parameter. Without \`?Sized\`, \`H\` must be a type whose size is known at compile time — which excludes \`dyn Host\` (a trait object's size depends on the runtime concrete type behind it).

Adding \`?Sized\`:

\`\`\`rust
pub fn add<H: Host + ?Sized>(host: &mut H) -> Result {
    // ...
}
\`\`\`

Now \`host: &mut dyn Host\` is a valid argument. **One compiled \`add\` works against any \`Host\` impl,** at the cost of a vtable indirection per host call.

> 🛑 **Anti-fluency check.** "It opts out of \`Sized\`" is parroting. In your own words: *why* must we accept an unknown-size type at all? If you can't motivate it without scrolling, re-read.

> 🔍 **Open \`revm/src/host.rs\`.** Find one place where \`dyn Host\` is actually constructed. That's the empirical proof this opt-out earns its complexity.

## Step 3 — Add the second generic: \`IT: ITy\`

\`H\` handles host plug-ability. But what about the **execution mode** — production vs. traced vs. Inspector-sandboxed?

Revm uses a *second* generic, \`IT\`, to select that at compile time:

\`\`\`rust
pub fn add<IT: ITy, H: Host + ?Sized>(host: &mut H) -> Result {
    // ...
}
\`\`\`

\`IT\` is an "interpreter-types" marker — think of it as a strategy parameter. The same source compiles to specialized binaries, **one per execution mode.** Without \`IT\`, you'd write \`add\` three times — once for production, once for tracing, once for the sandbox.

You now have the real signature of \`add\` (the parameter type is wrapped in revm's \`Ictx<...>\` for ergonomics, and the explicit \`Host\` bound moves into \`Ictx\` itself — the generics that remain on \`add\` are the \`IT: ITy\` and \`H: ?Sized\` we just earned):

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
\`\`\`

That matches the source. **You built it.**

## Step 4 — Fix the body: write through a reference

Naive body:

\`\`\`rust
let a = stack.pop().ok_or(StackUnderflow)?;
let b = stack.pop().ok_or(StackUnderflow)?;
stack.push(a + b);
\`\`\`

Three stack operations. Each is a memory write or capacity check. The interpreter's hot path (the inner loop that runs once per opcode in every transaction) runs this *thousands to tens of thousands of times per tx, millions per mainnet block, hundreds of millions per second under CI / fuzz* — that overhead is the difference between competitive and uncompetitive throughput.

Better: pop *one* value, then mutate the new top **in place** through a \`&mut\` reference.

\`\`\`rust
let a = stack.pop().ok_or(StackUnderflow)?;       // pop op1
let b = stack.last_mut().ok_or(StackUnderflow)?;  // &mut to new top
*b = a + *b;                                       // overwrite in place
\`\`\`

One pop, one in-place write. **No push.**

> 🛑 **Predict.** Now that the body writes through \`&mut\`, what does the function actually need to *return* on success?

Just \`Ok(())\` — there's nothing to return because the data flow happens through the reference, not the return value. Look back at the real signature: \`-> Result\` with no associated value. That's why.

## Step 5 — Use \`wrapping_add\`

One detail left. Replace \`+\` with \`wrapping_add\`:

\`\`\`rust
*b = a.wrapping_add(*b);
\`\`\`

Why? **EVM consensus requires \`ADD\` to wrap modulo 2²⁵⁶.** Use \`+\` and you have a release/debug-divergent client (Rust's \`+\` panics in debug, wraps in release). Use \`saturating_add\` and you fork the network on first overflow — you'll prove that empirically in the drill lesson.

> 🛑 **Predict.** What hex value does \`U256::MAX.wrapping_add(U256::from(1))\` produce?

If your answer wasn't \`0x0\`, pause. EVM consensus depends on this exact behavior.

## What you've built

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    let op1 = context.interpreter.stack.pop().ok_or(StackUnderflow)?;
    let op2 = context.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

That is **the real \`add\` semantically**, just with the stack manipulation done by hand. The real source factors those middle two lines into a macro called \`popn_top!\` — which earns its own lesson, next.

## Recall before moving on

Without scrolling, in your own words:

1. What does \`IT: ITy\` buy us at compile time? What would happen without it?
2. What does \`?Sized\` allow that the default doesn't?
3. Why is the body one in-place write instead of pop-add-push?
4. What does \`U256::MAX.wrapping_add(U256::from(1))\` produce, and why does it matter?

If any answer is shaky, scroll back. The next lesson refactors the body into a macro — you can't follow the refactor if you don't own the version we just built.

> **🧭 Where you are now in the stack:** you've built one **VM-layer opcode** to functional parity with the real Revm source, in 4 lines that exercise \`IT: ITy\`, \`?Sized\`, in-place stack ops, and \`wrapping_add\`. Next lesson extracts the body into a macro — the boilerplate-reduction pattern CPython and the JVM have practiced for decades, EVM-flavored.
`,
                },
                {
                  title: 'Reading \`add\`: factoring out the macro',
                  slug: 'revm-add-macro-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 8,
                  xpReward: 25,
                  content: `# Reading \`add\`: factoring out the macro

Open \`crates/interpreter/src/instructions/arithmetic.rs\` and you'll see \`add\`, \`mul\`, \`sub\`, \`div\`, \`mod\`, \`lt\`, \`gt\`, \`eq\`, \`and\`, \`or\`, \`xor\` — 30+ binary opcodes. **Every one of them starts with the same two lines of stack-popping boilerplate.** That's a refactor begging to happen, and revm did it: one macro, \`popn_top!\`, replaces those two lines everywhere.

Last lesson, you built up to the hand-written version:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    let op1 = context.interpreter.stack.pop().ok_or(StackUnderflow)?;
    let op2 = context.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

The real source replaces those middle two lines with one macro call:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

**This lesson is just that refactor.** Why a macro, what's inside it, and why three small details inside earn their keep.

## Step 1 — Why a macro at all

Every binary opcode begins with the same two lines:

\`\`\`rust
let op1 = ctx.interpreter.stack.pop().ok_or(StackUnderflow)?;
let op2 = ctx.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
\`\`\`

Repeated 30+ times across the codebase. The question isn't *whether* to factor that — it's *how*.

> 🛑 **Predict.** Why a \`macro_rules!\` (Rust's pattern-matching macro system that operates on syntax at compile time) and not a regular function? (Two reasons; name at least one.)

Two reasons:

1. **Variable arity.** Some opcodes pop 1, some pop 2, some pop 3. A macro matches \`[op1]\`, \`[op1, op2]\`, \`[op1, op2, op3]\` with the same arm — a function would need \`popn_top1\`, \`popn_top2\`, \`popn_top3\`, or const-generic gymnastics.
2. **Direct early return.** A function returning \`Result\` would force \`?\` boilerplate at every call site. The macro emits a \`return Err(StackUnderflow);\` that returns from the *opcode* function directly — no \`?\`, no \`Result\` plumbing.

## Step 2 — A naive version of the macro

If you were writing it without thinking about the optimizer, you'd write:

\`\`\`rust
macro_rules! popn_top_naive {
    ([ $($x:ident),* ], $top:ident, $interpreter:expr) => {
        $(
            let $x = $interpreter.stack.pop().ok_or(StackUnderflow)?;
        )*
        let $top = $interpreter.stack.last_mut().ok_or(StackUnderflow)?;
    };
}
\`\`\`

**Read the syntax slowly:**

- \`$($x:ident),*\` matches a comma-separated list of identifiers (zero or more). With \`[op1]\`, the list has one element. With \`[op1, op2]\`, it has two.
- \`$( ... )*\` repeats whatever's inside per element of the list. Here it pops once per identifier.

That works. It's also slower than the real version, in two ways revm cares about.

> 🛑 **Predict.** Where is the slowness? (Hint: think about (a) repeated bounds checks per pop, and (b) what the optimizer can prove.)

## Step 3 — Pre-check the underflow once

Calling \`.pop()\` N times means N internal bounds checks. **Better: check once, up-front.**

\`\`\`rust
if $interpreter.stack.len() < (1 + $crate::_count!($($x)*)) {
    return Err(StackUnderflow);
}
// ... now do the pops without re-checking
\`\`\`

\`_count!\` is a helper macro that counts the identifiers in the repetition. For \`[op1]\`, the guard becomes \`stack.len() < 2\` (one popped + one mutable-borrowed). Once that guard passes, **the subsequent pops are provably safe** — we just verified there are enough items.

## Step 4 — \`cold_path()\`: tell LLVM the failure branch is rare

Stack underflow is a bug, not a normal path. You don't want the rare-failure code in the hot instruction cache (the CPU's icache, where the bytes of the currently-executing function live). Cold instructions there evict the hot ones.

\`\`\`rust
if $interpreter.stack.len() < (1 + $crate::_count!($($x)*)) {
    $crate::primitives::hints_util::cold_path();
    return Err(StackUnderflow);
}
\`\`\`

> 🛑 **Predict.** What does \`cold_path()\` actually compile to?

It compiles to **nothing at runtime.** It's a compile-time hint to LLVM: "the code reachable through this branch is statistically rare." The optimizer responds by laying out the rare-branch code far from the hot path's machine instructions, keeping the hot path one straight line of cache-warm assembly.

Zero-cost optimization hint. That's the whole pattern.

## Step 5 — \`unwrap_unchecked()\`: cash in the guard

Now we've manually verified \`stack.len() >= N\`. But Rust's \`pop()\` returns \`Option<T>\` — so naive code would write \`.unwrap()\` (panics on \`None\`) or \`.ok_or(...)?\` (re-checks). Both repeat the work the guard already did.

The real macro instead does:

\`\`\`rust
let ([$( $x ),*], $top) = unsafe {
    $crate::interpreter_types::StackTr::popn_top(&mut $interpreter.stack)
        .unwrap_unchecked()
};
\`\`\`

\`unwrap_unchecked()\` skips the runtime \`Some\` check. **It's only safe when you can prove the value is \`Some\` — and the guard we wrote in Step 3 just proved exactly that.** The \`unsafe\` block is the contract: *"I checked, so don't double-check."* Delete the guard and you've made it instant UB.

> 🛑 **Anti-fluency.** Without scrolling: why doesn't the compiler optimize the \`Some\` check away itself? Why force \`unwrap_unchecked\`?

The compiler can't prove the relationship between \`stack.len() >= N\` and \`popn_top\` returning \`Some\` — that's a domain invariant (we know what \`popn_top\` does), not a type invariant the type system can see. \`unwrap_unchecked\` is the seam between domain knowledge and type-system limits — how you tell the compiler "trust me, I checked."

## Step 6 — The full \`popn_top!\`

Putting it all together:

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

Three details, each earning its keep:

- **\`cold_path()\`** — keeps the rare-failure code out of the hot icache (zero-cost hint)
- **\`unwrap_unchecked\`** — skips the runtime check the guard already did
- **The arity-N matcher** — one macro for any opcode that pops N

> 🔍 **Find in repo.** Open \`crates/interpreter/src/instructions/macros.rs\`. Find \`popn_top!\`. Confirm what we just walked is what's in the file (modulo formatting).

## Step 7 — \`gas!\`: the same pattern, applied elsewhere

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

Same shape: check, cold-hint on failure, return early. Charge gas; fall off the cliff if you can't afford it. Once you've internalized \`popn_top!\`, \`gas!\` is the same pattern in five lines.

> 🔍 **Find in repo.** Why isn't \`gas!\` called inside the body of \`add\`? Look at \`arithmetic.rs\`. Form a hypothesis. Then open \`interpreter.rs\` and find where constant-gas opcodes are charged.

Hint: \`add\` has a *fixed* gas cost (3 in current Ethereum). Fixed costs get paid up-front by the dispatch loop, before each opcode function runs. Only opcodes with **operand-dependent** costs (\`exp\`, \`sha3\`, the memory-touching ops) charge inside their bodies — you'll meet one such case in the drill.

## Recall before the quiz

Without scrolling:

1. Why is \`popn_top!\` a macro instead of a function? (Name one mechanical reason.)
2. What does \`cold_path()\` compile to at runtime?
3. Why is \`unwrap_unchecked\` not UB inside \`popn_top!\`?
4. What's the structural relationship between \`popn_top!\` and \`gas!\`?

The next lesson is a quiz that gates progression. **You can't nod through a quiz** — engage with these recalls now if any answer is shaky.

## 📺 Further watching

\`\`\`youtube
Nh19f_2fWLc | Dragan Rakita — EVM Technical walkthrough
\`\`\`
`,
                },
                {
                  title: 'Quiz: did \`add\` actually stick?',
                  slug: 'revm-add-opcode-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 5,
                  xpReward: 30,
                  content: `# Quiz: did \`add\` actually stick?

This quiz isn't decoration. It exists because the previous two lessons' "predict" prompts are easy to nod past — and a day from now, "I read it, nodded, and couldn't reproduce it" is the failure mode that breaks Intermediate.

Five questions, covering both the build-up and the macro refactor. **If you find yourself guessing**, stop and re-read the relevant section before answering. The quiz will still be here.

If you miss two or more, the lessons haven't internalized — re-read both *Building \`add\` step by step* and *Reading \`add\`: factoring out the macro* before going on to the drill.`,
                  quizQuestions: [
                    {
                      question: 'What does removing the `?` from `H: ?Sized` actually break in the `add` function signature?',
                      options: [
                        'Nothing — `?Sized` is a stylistic hint the compiler ignores.',
                        '`add` would no longer compile, because `H` is implicitly `?Sized` already.',
                        '`&mut dyn Host` would no longer be a valid argument — only concrete, sized types could be passed as `H`.',
                        '`unwrap_unchecked()` inside `popn_top!` would become undefined behavior.',
                      ],
                      correctIndex: 2,
                      explanation: 'Rust adds an implicit `Sized` bound to every generic type parameter by default. `?Sized` opts out of that bound. Without it, `H` must be a type whose size is known at compile time — which excludes trait objects like `dyn Host` (their size depends on the runtime concrete type). The whole reason `&mut dyn Host` compiles is the `?Sized` opt-out.',
                    },
                    {
                      question: 'Why is the `unwrap_unchecked()` call inside `popn_top!` not undefined behavior?',
                      options: [
                        'Because `unsafe` blocks suspend UB checks at runtime.',
                        "Because the macro's preceding `if stack.len() < ...` guard just proved the popped value would be `Some`.",
                        'Because `cold_path()` ensures the underflow branch can never execute.',
                        'Because Rust automatically validates `Option` types inside `unsafe` blocks.',
                      ],
                      correctIndex: 1,
                      explanation: "`unwrap_unchecked` is undefined behavior if the value is `None`. The macro's `if` guard returns early when the stack has fewer items than required — so by the time `unwrap_unchecked` runs, the value is provably `Some`. Delete the guard and it becomes instant UB. The `unsafe` block is the contract: *\"I checked manually, so the runtime doesn't need to.\"*",
                    },
                    {
                      question: 'What does `cold_path()` actually compile to in the generated assembly?',
                      options: [
                        'An unconditional jump to a panic handler.',
                        "Nothing at runtime — it's a hint to LLVM that the branch is statistically rare.",
                        'A `std::process::abort()` call.',
                        'A logging call that prints a stack trace.',
                      ],
                      correctIndex: 1,
                      explanation: "`cold_path()` emits no instructions. It tells LLVM \"the code reachable through this branch is rare,\" and the optimizer responds by laying that branch's code out away from the hot instruction cache. The happy path stays as one straight line of cache-warm assembly — that's the entire point.",
                    },
                    {
                      question: 'What hex value does `U256::MAX.wrapping_add(U256::from(1))` produce?',
                      options: [
                        '`0xFFFF...FF` — saturated at the maximum.',
                        'A panic on overflow.',
                        '`0x0` — wraps modulo 2²⁵⁶.',
                        'The transaction reverts.',
                      ],
                      correctIndex: 2,
                      explanation: "EVM's `ADD` opcode is *required* by consensus to wrap modulo 2²⁵⁶. `wrapping_add` implements exactly that. Replace it with `saturating_add` or `checked_add` and your client forks the network the first time anyone overflows — which the drill lesson makes you prove empirically.",
                    },
                    {
                      question: 'The `add` function body never visibly returns the sum. Where does the EVM observe the new top of stack?',
                      options: [
                        'Through the `Result` return value, which carries the sum on success.',
                        'Through `*op2 = ...` — `op2` is a mutable reference into the stack, so writing through it mutates the stack in place.',
                        'Through a thread-local side channel maintained by the interpreter.',
                        "Through `popn_top!`'s implicit return value, which the dispatch loop reads.",
                      ],
                      correctIndex: 1,
                      explanation: "`popn_top!` binds `op2` as `&mut U256` pointing at the new top of stack (the slot just below where `op1` was). Writing `*op2 = ...` mutates the stack in place — one memory write, no pop-then-push. That's why the function's `Result` only carries success/failure: the data flow is through the reference, not the return value.",
                    },
                  ],
                },
                {
                  title: 'Drill: prove you can read interpreter source',
                  slug: 'revm-add-opcode-drill-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 12,
                  xpReward: 25,
                  content: `# Drill: prove you can read interpreter source

You've read \`add\` and its macro. **Now prove you can read the rest of the file without the lesson holding your hand.** Three drills, run in a real revm checkout with \`cargo\` open in another window. Every one is *do, then write down what you observed* — not "read about."

## Setup

\`\`\`bash
git clone https://github.com/bluealloy/revm
cd revm
cargo build  # warm the toolchain
\`\`\`

If \`cargo build\` failed, fix that before proceeding. The remaining drills assume a working build — there is no version of these drills that's "read along."

## Drill 1 — Find \`mul\`, prove the shape

Open \`crates/interpreter/src/instructions/arithmetic.rs\`. Find the \`mul\` function. Compare it line-by-line to \`add\`.

> 🛑 **Question (write the answer down before scrolling):** \`mul\` and \`add\` are structurally identical down to the line count. **Why?** Not "because they're both arithmetic" — be specific about *what mechanical property* of the EVM forces them into the same shape.

The answer: both are **2-stack-in, 1-stack-out, fixed-gas, no-side-effect** opcodes. Anything matching that profile compiles to the exact same control-flow shape: \`popn_top!([a], b, ctx.interpreter); *b = a.OP(*b); Ok(())\`. The differences are the \`OP\` (\`wrapping_add\` vs \`wrapping_mul\`) and the gas charge (both happen to be 3, in current Ethereum).

If your written answer was less specific than that, you didn't earn this drill — re-read.

## Drill 2 — Find \`exp\`, find the dynamic gas charge

\`exp\` is in the same file. It's longer than \`add\` and \`mul\`. Two reasons:

1. The math is more complex (it's exponentiation, not a single op).
2. The gas charge is **dynamic** — it depends on the size of the exponent.

> 🔍 **Find** the \`gas!\` macro call inside \`exp\` that charges *per byte* of the exponent. Read its arithmetic.

> 🛑 **Question (write it down):** Why is \`exp\` charged dynamically when \`add\` is charged statically by the dispatch loop?

The answer: dispatch can charge a *fixed* cost up-front, but \`exp\`'s cost depends on a runtime value (the size of the exponent operand). You can only know that cost *inside* the function body, after you've inspected the operand. So \`exp\` charges itself.

This generalizes. Any opcode whose cost is shaped by an operand has to charge mid-function. File this — you'll meet the same pattern in \`sha3\`, \`mload\`, and the \`call\`-family opcodes.

## Drill 3 — Break consensus on purpose

This is the canonical "prove you understand" drill. **You won't believe how brittle consensus is until you've broken it on purpose.**

1. Open \`crates/interpreter/src/instructions/arithmetic.rs\`.
2. Find \`add\`. Change \`wrapping_add\` to \`saturating_add\`. Save.
3. From the repo root: \`cargo test -p revm-interpreter\`.
4. **Watch tests fail.** Read at least one failure message — note that the failure is a numeric mismatch, not a panic.

What you've just done: patched a single library function call, and your client now disagrees with every other Ethereum client in the world about the result of \`0xFFF...FF + 1\`. The first transaction that overflows \`ADD\` would fork your node off mainnet.

> 🔧 **Now revert your change** and confirm the tests pass again:
>
> \`\`\`bash
> git checkout crates/interpreter/src/instructions/arithmetic.rs
> cargo test -p revm-interpreter
> \`\`\`
>
> The point isn't the change. It's the empirical proof that consensus is **one library function call away** from being lost — and now you've felt that.

If you didn't actually run \`cargo test\` and watch real output, you skipped the drill. The drill *is* the running. There's no version of this drill where you read it and "got it."

## Drill 4 — Instrument \`add\` and watch the data flow

Reading source is one mode. *Watching data move through the source you read* is a stronger one.

1. Open \`crates/interpreter/src/instructions/arithmetic.rs\`.
2. Add \`eprintln!\` at the top and bottom of \`add\`:

   \`\`\`rust
   pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
       popn_top!([op1], op2, context.interpreter);
       eprintln!("ADD: {:#x} + {:#x} = ?", op1, *op2);  // ← add this
       *op2 = op1.wrapping_add(*op2);
       eprintln!("ADD result: {:#x}", *op2);              // ← and this
       Ok(())
   }
   \`\`\`

3. Re-run with \`cargo test -p revm-interpreter -- --nocapture\`. The \`--nocapture\` flag tells cargo to show \`eprintln!\` output.
4. Read the output. **Count how many times ADD ran across the test suite.**

This is the production reality compressed to your terminal: every Ethereum mainnet transaction containing \`0x01\` causes this exact function to run, with these exact operands, producing this exact result. Across years, on millions of nodes.

> 🔧 **Revert when done.** \`git checkout crates/interpreter/src/instructions/arithmetic.rs\`. The \`eprintln!\` is for learning; production code never instruments hot paths this way (it uses the existing tracing integration — covered in Inside Reth).

After watching ADD execute, the "the interpreter is just a Rust function loop" framing stops being theoretical.

## End-of-lesson recall

Without scrolling, in your own words on paper:

1. What is the *mechanical* property of \`add\` and \`mul\` that makes their source identical?
2. Why does \`exp\` charge gas inside its body instead of via dispatch?
3. What single change converts \`add\` from EVM-compliant to EVM-incompatible — and what test failure mode did you observe?

If any answer is shaky, the lesson isn't done with you. Re-run the drill or re-read.

After this, you've read more EVM source than 99% of Solidity developers ever will — and you've proven it by making the chain disagree with itself, then putting it back. The next lesson zooms out from one opcode to the table that dispatches all 256.`,
                },
                {
                  title: 'Building the instruction table step by step',
                  slug: 'custom-opcodes-table-en',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 10,
                  xpReward: 25,
                  content: `# Building the instruction table step by step

> 🧭 **Where this lives in the systems-engineering stack:** the **compiler / VM layer's instruction dispatch** — the universal pattern in every interpreter built since 1990. Function-pointer tables, computed gotos, threaded code — CPython, JVM, Lua, Erlang's BEAM all wrestle with the same problem ("turn one byte into one function call, cheaply, deterministically"). This lesson is that pattern realized for EVM.

> 📋 **Recall before reading.** Three questions from the last lessons. If any are shaky, scroll back to *Building \`add\` step by step* or its drill — the rest of this lesson assumes the answers are vocabulary you own.
>
> 1. What does the type signature \`<IT: ITy, H: ?Sized>\` on an opcode function buy us at compile time?
> 2. The \`popn_top!\` macro binds \`op2\` as a \`&mut\`. Why a reference, not a value?
> 3. \`add\` uses \`wrapping_add\`. What test failure mode did you observe when you swapped it for \`saturating_add\` and reran \`cargo test -p revm-interpreter\`?

---

When the EVM sees byte \`0x01\` in bytecode, **what mechanism** decides that \`add\` runs? That's *dispatch* — the lookup that turns one byte into one function call, repeated for every opcode in every transaction. Hot path of the hottest path. Get it wrong and your client is uncompetitive; get it right and a custom opcode is three lines of code (next lesson).

We'll start from the dumbest dispatch you could write and build up to revm's actual instruction table. By the end you'll have built every piece of:

\`\`\`rust
const fn instruction_table_impl<WIRE: InterpreterTypes, H: Host>()
    -> InstructionTable<WIRE, H>
{
    let mut table = [Instruction::unknown(); 256];
    table[ADD as usize] = Instruction::new(arithmetic::add);
    table[MUL as usize] = Instruction::new(arithmetic::mul);
    // ...
}
\`\`\`

> 📂 **Open \`bluealloy/revm\` in another tab.** As before — every claim below should be verified against the actual file.

## Step 0 — The naive dispatch

Without thinking, you'd write:

\`\`\`rust
fn dispatch(byte: u8, ctx: &mut Context) -> Result {
    match byte {
        0x01 => add(ctx),
        0x02 => mul(ctx),
        0x03 => sub(ctx),
        // ... 256 arms
        _ => return Err(Unknown),
    }
}
\`\`\`

256 match arms. The compiler *might* turn this into a jump table — or might not. Worse: every time you add or rename an opcode, you touch this giant match.

> 🛑 **Predict.** Without scrolling: name two reasons revm doesn't ship this naive version. (One is about the compiler, one is about maintenance.)

The two:

1. **No guarantee of jump-table compilation.** A 256-arm match is large enough that LLVM usually does the right thing, but "usually" is not a contract you ship consensus on. You want a guaranteed O(1) lookup.
2. **Opcode mutation is expensive.** Adding a custom opcode means editing this match. A "modular" custom-opcodes feature whose user-friendliness is "modify the dispatch match" is broken-by-design.

## Step 1 — Function pointers in an array

Replace the match with an array indexed by opcode byte. Each slot holds a function pointer:

\`\`\`rust
let mut table: [fn(&mut Context) -> Result; 256] = [unknown; 256];
table[0x01] = add;
table[0x02] = mul;
// ...
fn dispatch(byte: u8, ctx: &mut Context) -> Result {
    (table[byte as usize])(ctx)
}
\`\`\`

Dispatch is now **one indexed lookup** — no match, no jump table the compiler builds for you. The shape is guaranteed.

> 🛑 **Predict.** Why is the array sized exactly \`256\` and not \`usize::MAX\` or whatever fits the defined opcodes?

Because the EVM opcode is one byte. There are only 256 possible values, period. A fixed-size array exhausts the space — every byte either has an opcode or maps to \`unknown\`.

## Step 2 — Make the table \`const\`

The naive code builds the table at runtime — push the assignments through at startup and hope the optimizer hoists them. Better: build it **at compile time** so the table is already populated the moment the binary loads.

\`\`\`rust
const fn build_table() -> [fn(&mut Context) -> Result; 256] {
    let mut t = [unknown; 256];
    t[0x01] = add;
    t[0x02] = mul;
    // ...
    t
}
const TABLE: [fn(&mut Context) -> Result; 256] = build_table();
\`\`\`

\`const fn\` reads as "this function can be evaluated at compile time." The compiler executes \`build_table()\` *during compilation*, freezes the resulting array, and bakes it into the binary's data section. Dispatch never runs \`build_table\` at runtime — it just reads from the baked array.

> 🛑 **Anti-fluency.** "It runs at compile time" is parroting. In your own words: what *exactly* runs zero times that would otherwise run once? Be specific.

What runs zero times: the loop/sequence that populates the table slots. The runtime \`TABLE\` is identical to a literal \`[unknown, add, mul, sub, ...; 256]\` written by hand. **Zero runtime cost to set up dispatch.** That's the whole point.

## Step 3 — Wrap function pointers in an \`Instruction\` struct

Bare \`fn\` pointers work, but they're inflexible — you can't attach metadata (gas costs, opcode names) without breaking the dispatch type. Revm wraps the function pointer in a struct:

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
\`\`\`

> 🛑 **Predict.** Why a struct around a single field \`fn_:\`? What does this enable that a bare \`fn\` doesn't?

Two things:

1. **Future metadata.** You could later add \`gas_cost: u16\`, \`name: &'static str\`, etc. without changing the dispatch signature.
2. **Type discipline.** \`Instruction::new(arithmetic::add)\` is more type-safe than a bare function pointer assignment — the compiler verifies the signature matches the table's slot type at the call site. Concretely, with a bare \`fn\` the following **compiles**:

   \`\`\`rust
   table[ADD as usize] = some_fn_with_wrong_signature;
   // e.g. fn(InstructionContext, ExtraArg) -> SomethingElse
   // Function-pointer types coerce far enough that the assignment passes —
   // you find out at runtime when the dispatcher actually calls it.
   \`\`\`

   \`Instruction::new(...)\` is an explicit typed constructor, so a signature mismatch fails **at the assignment line**, not at runtime. Bug shifted from runtime to compile time.

The generics \`W: InterpreterTypes, H: ?Sized\` are exactly the same \`IT\`/\`H\` we built up two lessons ago. Same reasoning — let one table work across all execution modes and host types.

> 🛑 **Recall check.** Why does \`Instruction\` carry the \`<W, H>\` generics? What breaks if you hardcode the concrete types as \`Instruction { fn_: fn(InstructionContext) -> InstructionExecResult }\`?

You'd need a separate \`Instruction\` type per execution mode (production / tracing / Inspector sandbox) and per host type — meaning a separate table and a separate dispatcher per combination. \`Instruction<W, H>\` lets one table + one dispatcher cover all modes × all hosts. Same reasoning that made \`add\` itself generic in the previous lesson.

## Step 4 — The full real instruction table

> 🛑 **Predict.** What does combining Steps 1–3 produce? Sketch the signature: a function returning a table, it'll be a \`const fn\`, the generics are…?

Putting it together, the actual revm code from [\`crates/interpreter/src/instructions.rs\`](https://github.com/bluealloy/revm/blob/main/crates/interpreter/src/instructions.rs):

\`\`\`rust
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
    // ...
    table[LT as usize] = Instruction::new(bitwise::lt);
    table[GT as usize] = Instruction::new(bitwise::gt);
    // ...

    table
}
\`\`\`

You built every piece:

- **Array indexed by opcode byte** (Step 1) — guaranteed O(1) dispatch
- **\`const fn\`** (Step 2) — table baked at compile time, zero startup cost
- **\`Instruction::unknown()\` everywhere first** — every undefined byte halts cleanly; defined opcodes overwrite their slot
- **\`Instruction::new(fn)\`** (Step 3) — typed wrapper, future-proof for metadata

## The opcode byte map (reference)

From [\`bytecode::opcode\`](https://github.com/bluealloy/revm/blob/main/crates/bytecode/src/opcode.rs):

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
| **0x0C–0x0F** | **unallocated** ← gaps for custom opcodes |
| **0x21–0x2F** | **unallocated** |

> 🔍 **Verify, don't trust.** Open \`bytecode::opcode\` in the repo. Confirm \`0x0C\` is genuinely unassigned **on the version you'd actually fork**. The gaps shift across hard forks — a table in a lesson is a snapshot, not a contract.

## Recall before moving on

Without scrolling:

1. Why an array of function pointers, not a \`match\` statement or a \`HashMap<u8, fn>\`?
2. What does \`const fn\` save at runtime?
3. Why is every slot initialized to \`Instruction::unknown()\` before defined opcodes overwrite their slots?
4. Why a struct \`Instruction { fn_ }\` around the function pointer instead of a bare \`fn\`?

Next lesson: now that you have the table, slot in your own opcode.

> 🛣️ **The road not taken (Solana):** Solana programs don't dispatch through a table like this — they compile to **SBPF**, an eBPF-derived **register VM**. Operands live in registers (not on a stack), instructions are JIT-compiled into native code, and dispatch happens through the JIT-emitted control flow, not through a function-pointer table. EVM's stack-machine + table-dispatch choice keeps the bytecode tiny, the interpreter portable, and formal reasoning about execution tractable. Solana's register-VM + JIT choice optimizes for raw throughput and lets a single compiled program execute at near-native speed. Two valid VM-design answers; the choice between them is a tradeoff between provability + portability and runtime throughput.

> **🧭 Where you are now in the stack:** you've built the **VM-layer instruction dispatch** — 256-slot const table + \`Instruction<W,H>\` wrapper, O(1) dispatch guaranteed at compile time. Same shape as CPython's bytecode dispatcher and the JVM's interpreter tables. Next lesson inserts your own opcode into this table — the dispatch surface is the extension point.
`,
                },
                {
                  title: 'Wiring a custom opcode — and the failure modes',
                  slug: 'custom-opcodes-wiring-en',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 25,
                  content: `# Wiring a custom opcode — and the failure modes

Hyperliquid runs perpetuals on its own EVM and added a handful of order-book-specific opcodes — direct calls into native code, dispatched as a single byte instead of a 200-instruction Solidity function. **That's what a custom opcode buys you: a 100× shortcut on your own chain.** The wiring is *three lines.* The shortcut is real. The reason most chains *don't* ship 50 of them is three caveats that are not optional.

You've built up revm's instruction table — a 256-slot array of \`Instruction\` structs, baked at compile time. Now slot in your own opcode.

This lesson is half mechanics (short) and half caveats (not short). The mechanics fit on a notecard. The caveats are why "Hyperliquid picked Revm because it's modular" is *not* a free lunch.

## The mechanics — three lines

Pick an unallocated byte. Slot in your function:

\`\`\`rust
const HYPER_FAST_SWAP: u8 = 0x0C;

let mut table = standard_table();
table[HYPER_FAST_SWAP as usize] = Instruction::new(my_hyper_fast_swap);
\`\`\`

Where \`my_hyper_fast_swap\` follows the exact \`add\` shape from two lessons ago:

\`\`\`rust
pub fn my_hyper_fast_swap<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([amount_in, pool_id], amount_out, context.interpreter);
    *amount_out = compute_swap_native(*amount_in, *pool_id);
    Ok(())
}
\`\`\`

**That's it.** You took the standard table, copied it, overwrote one slot. The dispatch loop now routes byte \`0x0C\` to your function.

\`\`\`mermaid
flowchart LR
    Std[standard_table — 256 slots] -->|copy| Mine[my fork's table]
    Mine -->|override 0x0C| Custom[my_hyper_fast_swap]
    Bytecode[bytecode 0x0C ...] -->|interpreter dispatch| Mine
    Mine --> Custom
    Custom --> Result[result on stack]
\`\`\`

## What this actually buys you

Two compounding wins:

1. **No interpreter loop overhead per inner step.** A complex Solidity function might be 200 EVM instructions; one custom opcode is 1 dispatch.
2. **SIMD, FFI, or pre-computed tables in Rust.** None of those are available to bytecode.

A complex options pricer can drop from **500K gas in Solidity → 5K gas as a single custom opcode**. That's why Hyperliquid added perp-specific opcodes; that's the kind of compression payment-layer chains (Tempo, etc.) explore for stablecoin operations.

> 🛑 **Predict the failure modes** before scrolling. You're shipping a custom opcode tomorrow. List 3 things that will go wrong if you treat this casually. Hold your list — compare to the caveats below.

## Caveats — these aren't optional

### 1. Consensus compatibility

Deviating from standard EVM means **you can't share blocks with other Ethereum clients.** Valid only on **your own chain**. Fork mainnet with this opcode and try to peer with go-ethereum → instant disconnect on the first transaction that touches \`0x0C\`.

> 🔍 **Reason about an experiment you could run.** If you spun up a Reth node with your custom opcode, then pointed a stock geth at the same chain head: at what point does geth disconnect? (Answer: as soon as it tries to execute a block containing \`0x0C\`. The block fails state-root validation because geth executes \`0x0C\` as INVALID and your Reth executed it as a swap.) The "you can't share blocks" claim is something you should *feel*, not just read.

### 2. Gas pricing is not optional

A powerful shortcut needs a properly priced gas cost — otherwise it's a DoS vector.

> 🛑 **Question (write it down):** How would you derive the gas price for \`my_hyper_fast_swap\`? If you can't sketch a methodology in three sentences, you can't safely ship this opcode.

A defensible methodology:

1. **Benchmark the worst case.** Run the opcode against pathological inputs (max-size pool ID, max amount). Measure wall-clock time.
2. **Convert to a gas budget.** Pick a target throughput (say, 1 second per block of pure-opcode load). Divide the budget by worst-case time.
3. **Add safety margin.** 2–3× for variance, future hardware changes, and the gap between *your* benchmark and *an attacker's* benchmark.

If your three-sentence answer wasn't shaped like that, your opcode is a DoS waiting to happen.

### 3. Provability — if you want ZK

If your chain wants ZK proofs (a real concern for app-chains aiming at L2 settlement), every new opcode needs to be made provable inside your zkVM. **That's potentially weeks of additional work *per opcode*.**

This is why "we picked Revm because it's modular" doesn't translate to "we ship 50 custom opcodes." Each one carries:

- **Consensus risk** (you fork on every implementation bug)
- **Pricing risk** (DoS vector if mis-priced)
- **Provability cost** (weeks of zkVM integration if you want proofs)

The right number of custom opcodes for most chains is **0–3**. Hyperliquid added a small handful. Most production app-chains exploring this end up with a similarly small footprint.

## Recall before the quiz

Without scrolling:

1. The mechanics of slotting in a custom opcode are **three lines.** Sketch them from memory.
2. The "modular" pitch hides three caveats. What are they?
3. What's the rough order-of-magnitude gas savings for compiling complex logic into a custom opcode? (And why?)
4. If you wanted to ship a custom opcode that does pairing-friendly elliptic curve operations, **which caveat hits hardest?**

Next: a quiz that gates progression, then a drill where you actually wire one in a fork.
`,
                },
                {
                  title: 'Quiz: did the table mechanics stick?',
                  slug: 'custom-opcodes-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 7,
                  duration: 4,
                  xpReward: 25,
                  content: `# Quiz: did the table mechanics stick?

Four questions covering the instruction table and the wiring mechanics. Same rule as before: **you can't nod past a quiz.** These are gates, not decoration.

If you miss two or more, scroll back to *Building the instruction table* before going on to the drill.`,
                  quizQuestions: [
                    {
                      question: "Why is the instruction table a fixed-size `[Instruction; 256]` array, not a `HashMap<u8, Instruction>` or a `match` statement?",
                      options: [
                        "A HashMap would handle missing opcodes more elegantly than the array.",
                        "The compiler optimizes a 256-arm match identically to an indexed array — they're equivalent.",
                        "An indexed array gives guaranteed O(1) dispatch with no hashing or compiler-dependent jump-table compilation, and 256 slots exhausts the byte space.",
                        "HashMap is unsafe at compile time.",
                      ],
                      correctIndex: 2,
                      explanation: "Opcode bytes are 1 byte = 256 possible values, so a fixed array exhausts the space. Indexing is guaranteed O(1) — no hashing, no compiler hand-waving about whether `match` becomes a jump table. Every byte either has a defined opcode or maps to `unknown`. Both shape and worst-case latency are part of the contract.",
                    },
                    {
                      question: "What does `const fn` do for `instruction_table_impl()`?",
                      options: [
                        "It forces the function to be inlined at every call site.",
                        "It allows the compiler to evaluate the function at compile time, baking the populated table directly into the binary so no setup runs at startup.",
                        "It marks the function as thread-safe.",
                        "It disables runtime mutation of the resulting table.",
                      ],
                      correctIndex: 1,
                      explanation: "`const fn` reads as 'this function can be evaluated at compile time.' The table-population code runs during compilation; the runtime `TABLE` is identical to a hand-written array literal. Zero startup cost to set up dispatch — that's the whole point of using `const fn` here.",
                    },
                    {
                      question: "Why is every slot initialized to `Instruction::unknown()` before defined opcodes overwrite their slots?",
                      options: [
                        "It's a debugging hint — `unknown` is just a placeholder name.",
                        "It ensures every byte 0x00–0xFF maps to a halt-cleanly handler, so undefined opcodes can't be silently skipped or cause memory unsafety.",
                        "It's the only way to satisfy Rust's array initialization syntax.",
                        "It's a pre-allocation step that gets optimized away.",
                      ],
                      correctIndex: 1,
                      explanation: "Two reasons combined, but the safety one dominates: every undefined byte should produce a clean `Unknown` halt rather than UB or a silent miss. `Instruction::unknown()` is the safe default; defined opcodes overwrite. Rust's array init does need all slots filled, but `MaybeUninit` would let you defer — using `unknown()` is a deliberate safety choice.",
                    },
                    {
                      question: "You're shipping a custom opcode that does an expensive cryptographic operation (e.g., pairing-friendly EC). Which caveat is the *highest-cost item* in practice?",
                      options: [
                        "Consensus compatibility — you can't share blocks with mainnet.",
                        "Gas pricing — getting it wrong creates a DoS vector.",
                        "Provability inside a zkVM — every new opcode is potentially weeks of zkVM integration work, and crypto ops are notoriously hard to constrain.",
                        "Type-system limits in Rust.",
                      ],
                      correctIndex: 2,
                      explanation: "All three caveats apply, but provability is the killer for crypto ops specifically. ZK-unfriendly cryptography (pairing, certain hash functions) can take weeks of zkVM specification work per opcode — vastly more than designing the gas pricing or accepting the consensus split. Production chains' small custom-opcode counts are partly governed by exactly this cost.",
                    },
                  ],
                },
                {
                  title: 'Drill: ship a fork',
                  slug: 'custom-opcodes-drill-en',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 12,
                  xpReward: 25,
                  content: `# Drill: ship a fork

You've read the three-line mechanics and the three caveats. **Now wire one yourself.** This drill takes you from "I've read about custom opcodes" to "I have wired one in a real revm checkout and watched it execute." Three lines plus the surrounding harness — bring \`cargo\` up in another window.

## Setup

You should already have the revm checkout from the earlier drill. If not:

\`\`\`bash
git clone https://github.com/bluealloy/revm
cd revm
cargo build  # confirm clean build before proceeding
\`\`\`

If \`cargo build\` failed, fix that before the drill.

## Drill 1 — Find unallocated opcode bytes (don't trust the lesson)

The lesson showed \`0x0C–0x0F\` as unallocated. **Verify on the actual file** of the version you'd fork.

> 🔍 **Open** \`crates/interpreter/src/instructions.rs\`. Scan the table-construction function. Any byte that *does not appear* on the left side of an assignment is unallocated.

> 🛑 **Question (write it down before scrolling):** What's the most surprising unallocated byte you found? (One that's adjacent to allocated ones — the gaps tell you which proposals were considered and rejected, or are reserved for future EIPs.)

There's no single right answer — but if your answer is "I just trusted the lesson's table," you skipped the drill. Verify against source.

## Drill 2 — Define your own opcode

Pick one unallocated byte. Define a constant for it. Implement a function with the same shape as \`add\` — but stack-profile **1-in, 1-out, in-place** (a "double the top" opcode):

\`\`\`rust
const DOUBLE_TOP: u8 = 0x0C;  // or whichever you picked

pub fn double_top<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([], op, context.interpreter);
    *op = (*op).wrapping_mul(U256::from(2));
    Ok(())
}
\`\`\`

> 🛑 **Question:** Why \`popn_top!([], op, ...)\` and not \`popn_top!([op1], op2, ...)\`? What's the structural difference, and what is it telling you about this opcode's stack profile?

The empty \`[]\` means **no values popped** — only \`op\` is bound, as a \`&mut\` to the current top of stack. That's how you express a 1-stack-in, 1-stack-out, in-place-mutating opcode (vs. \`add\`'s 2-in, 1-out). The macro's arity matcher pays off here — same macro, different stack profiles, no second function.

## Drill 3 — Wire it into the table

Add to your standard-table copy:

\`\`\`rust
let mut table = standard_table();
table[DOUBLE_TOP as usize] = Instruction::new(double_top);
\`\`\`

That's all the wiring. The dispatch loop will now call \`double_top\` whenever it sees byte \`0x0C\`.

## Drill 4 — Run bytecode that uses your opcode

Encode bytecode that pushes a value, executes your opcode, and stops:

\`\`\`
PUSH1 0x05  // push 5 onto the stack — bytes: 0x60 0x05
DOUBLE_TOP  // your custom opcode — byte: 0x0C
STOP        // 0x00
\`\`\`

In hex: \`60 05 0C 00\`.

Run this bytecode in your revm-with-table fork. The stack should end with \`10\` (= 5 × 2).

> 🔧 **The wiring is left as the drill.** Use revm's existing test harness in \`crates/interpreter/tests/\` (or write a one-shot binary in \`examples/\`). The point is to construct the EVM context, install your modified table, run the bytecode, and assert the final stack value.

If you got \`10\` on the stack, **you've shipped a fork.** Your client now executes a chain incompatible with mainnet — and you've felt the difference between "I read about it" and "I did it."

## Drill 5 — Instrument the opcode and watch the dispatch reach you

Add an \`eprintln!\` inside \`double_top\` so you can *see* dispatch actually reach your Rust function:

\`\`\`rust
pub fn double_top<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([], op, context.interpreter);
    let before = *op;
    *op = (*op).wrapping_mul(U256::from(2));
    eprintln!("DOUBLE_TOP: {:#x} -> {:#x}", before, *op);  // ← add this
    Ok(())
}
\`\`\`

Run with \`cargo run\` (or \`cargo test -- --nocapture\`). Feed bytecode \`60 05 0C 00\` and you should see **exactly one** log line: \`DOUBLE_TOP: 0x5 -> 0xa\`. That is the moment the instruction-table dispatch reached the Rust function you wrote. **One byte of bytecode (\`0x0C\`) triggered three lines of Rust** — and you've physically observed the causal chain.

Try a bytecode with branching (e.g. \`PUSH1 3 PUSH1 1 LT JUMPI ... DOUBLE_TOP\`) and watch the \`eprintln!\` line appear / not appear depending on the branch. That is dispatch's net behaviour.

## End-of-lesson recall

Without scrolling, in your own words:

1. What's the mechanical difference between \`popn_top!([op1], op2, ...)\` and \`popn_top!([], op, ...)\`? What does each tell you about the opcode's stack profile?
2. What stack profile does your \`double_top\` have? (X-in, Y-out, side-effects?)
3. If you wanted to ship \`double_top\` to mainnet, what's the *first* thing that would break — and at which moment in time?

If any answer is shaky, the lesson isn't done with you. Re-do the drill or re-read.

After this drill, you've actually shipped a custom opcode in code. **More importantly: you've felt the cost.** Next: how revm gets state — the \`Database\` trait.`,
                },
                {
                  title: 'Building the \`Database\` trait — read API',
                  slug: 'revm-database-buildup-en',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 10,
                  xpReward: 25,
                  content: `# Building the \`Database\` trait — read API

> 🧭 **Where this lives in the systems-engineering stack:** the **seam between the VM / compiler layer and the database layer**. Same problem any embedded compute engine faces — "let the engine ask 'give me this value' without coupling to a specific storage backend." JDBC, ODBC, the LLVM \`MemoryBuffer\` API, SQLite's VFS layer all solve variations of this. The Revm \`Database\` trait is that pattern for EVM state access.

When the EVM hits an \`SLOAD\`, where does the value come from? Not from Revm — Revm is the **execution engine** and doesn't own state. The answer comes through a trait called \`Database\`, and **implementing that trait is how you connect Revm to anything**: an in-memory map for tests, a remote JSON-RPC node to fork mainnet, MDBX for a real Reth client, a network of shards for an exotic L1. Same four-method shape, four wildly different backends.

This lesson builds that trait up from the simplest possible sketch. By the end you'll have built every piece of:

\`\`\`rust
#[auto_impl(&mut, Box)]
pub trait Database {
    type Error: DBErrorMarker;
    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;
    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error>;
    fn storage(&mut self, address: Address, index: StorageKey)
        -> Result<StorageValue, Self::Error>;
    fn block_hash(&mut self, number: u64) -> Result<B256, Self::Error>;
}
\`\`\`

> 📂 **Open \`bluealloy/revm\` in another tab.** Cross-check at every step.

## Step 0 — The naive Revm: state baked in

Without thinking, you'd write Revm with state owned internally:

\`\`\`rust
pub struct Revm {
    stack: Vec<U256>,
    storage: HashMap<(Address, U256), U256>,
    accounts: HashMap<Address, AccountInfo>,
    // ...
}
\`\`\`

The interpreter calls \`self.storage.get(...)\` directly. Simple. Works for a toy.

> 🛑 **Predict.** Without scrolling: name three production scenarios this naive design *can't* handle. (Hint: each is a different *kind of* state source.)

The three:

1. **Forked mainnet.** State lives on a remote RPC, not in your \`HashMap\`.
2. **MDBX-backed production.** A real Reth node uses on-disk MDBX, not in-memory maps.
3. **Custom schemas.** Your app-chain might want a sparse Merkle store, a network of remote shards, or anything else.

Each requires *different code* to fetch state. You don't want to fork Revm three ways.

## Step 1 — Push state behind a trait

The fix is the classic **dependency inversion** move (instead of Revm depending on a *concrete* storage implementation, both Revm and any storage backend depend on an *abstract* trait — the dependency arrow gets inverted). Don't make Revm own storage; make it *ask* for what it needs through an interface. Define a trait that describes what Revm needs from state, without owning the storage:

\`\`\`rust
pub trait Database {
    fn storage(&mut self, address: Address, key: U256) -> U256;
    fn balance(&mut self, address: Address) -> U256;
    fn code(&mut self, address: Address) -> Vec<u8>;
    fn block_hash(&mut self, number: u64) -> B256;
}
\`\`\`

Now the interpreter takes \`db: &mut dyn Database\` instead of owning storage. Anyone can implement the trait — your forked-mainnet impl, your MDBX impl, your in-memory impl all fit the same socket.

> 🛑 **Predict.** Why \`&mut self\`, not \`&self\`? What does \`&mut\` allow that \`&self\` would forbid?

**Caching.** A real implementation (forked mainnet, RPC-backed) wants to cache reads — first call to \`storage(addr, key)\` hits the network; subsequent calls return from a local cache. Cache mutation requires \`&mut self\`. \`&self\` would force every impl to wrap its cache in \`RwLock\` or \`RefCell\` — fine sometimes, but a tax overall. Default to \`&mut\`. (Lesson 2 covers the \`&self\` case via a companion trait.)

## Step 2 — Group the methods correctly

Look at the naive trait: \`balance\` and \`code\` both ask about an account, but they're separate methods. **Are they really independent?**

In practice, you almost always want both. Networked impls especially — you don't want two RPC round-trips for the same account. Better: one method that returns *both*, and let the impl decide how to fetch them.

\`\`\`rust
fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;
\`\`\`

\`AccountInfo\` bundles balance, nonce, and code hash. **One round-trip, three pieces of data.** The \`Option\` lets the impl signal "no such account" cleanly — useful for \`EXTCODEHASH\`, which has special semantics for unknown accounts.

Code stays separate, addressed by *hash*:

\`\`\`rust
fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error>;
\`\`\`

> 🛑 **Predict.** Why split \`code_by_hash\` from \`basic\`? Why is code addressed by *hash*, not by address?

Because contract code is **content-addressed.** A given bytecode (a popular DEX router, say) is shared across many addresses — caching by hash dedupes automatically. \`basic\` returns just the hash; \`code_by_hash\` materializes the bytes only if you actually need to execute. Lazy load with content addressing.

## Step 3 — Add \`Result\` and an associated \`Error\` type

Networked impls fail. RPC times out, MDBX returns a stale lock, an Arc gets poisoned. **Every method must be allowed to fail.**

\`\`\`rust
fn basic(&mut self, ...) -> Result<Option<AccountInfo>, Self::Error>;
\`\`\`

But \`Self::Error\` — why an associated type instead of a fixed enum?

Because **revm cannot know what your errors look like.** RPC errors, disk I/O errors, lock poisoning — all different shapes. A fixed enum would either be too narrow (and force every impl to flatten its real errors) or too wide (and force revm to handle 50 variants).

\`\`\`rust
type Error: DBErrorMarker;
\`\`\`

\`DBErrorMarker\` is a vacuous bound (auto-implemented for any sensible type). Its purpose: **document intent** ("this is the kind of error a database can produce") and give revm a hook to add bounds later (e.g. \`Send\`, \`Sync\`) without breaking impls.

> 🛑 **Anti-fluency.** "It's open for extension" is parroting. In your own words: imagine you're writing a fork-mainnet impl using \`reqwest\`. What *specifically* breaks if \`Error\` is a fixed \`DatabaseError\` enum?

You'd have to flatten \`reqwest::Error\`, \`serde_json::Error\`, network timeouts, and parse errors into the closed enum's variants — and *every* new failure mode would require a PR against revm. The associated type lets your error stay yours.

## Step 4 — \`#[auto_impl(&mut, Box)]\`

Without this attribute, you'd write the same forwarding code by hand:

\`\`\`rust
impl<T: Database> Database for &mut T {
    type Error = T::Error;
    fn basic(&mut self, addr: Address) -> Result<Option<AccountInfo>, T::Error> {
        (**self).basic(addr)
    }
    // ... 3 more methods, all the same pattern
}
impl<T: Database> Database for Box<T> { /* ... same 4 methods ... */ }
\`\`\`

Eight method bodies of identical forwarding boilerplate just for \`Database\` (4 methods × \`&mut\` and \`Box\`) — and the same pattern repeats across \`DatabaseRef\` and \`DatabaseCommit\`.

\`auto_impl\` is a procedural macro that generates these forwarding impls automatically. With \`#[auto_impl(&mut, Box)]\`, both \`&mut MyDb\` and \`Box<MyDb>\` automatically implement \`Database\` if \`MyDb\` does. **No user-written boilerplate.**

> 🛑 **Predict.** What if you want \`Database\` to also work for \`Arc<MyDb>\`? Why doesn't \`auto_impl(&mut, Box, Arc)\` solve it?

You can't — at least not directly. \`Arc<T>\` only gives you \`&T\`, not \`&mut T\`. Since \`Database\`'s methods take \`&mut self\`, \`Arc<MyDb>\` cannot implement \`Database\`. **This forces a design split** that the next lesson resolves: revm has a *companion* read-only trait (\`DatabaseRef\`) for exactly the \`Arc\` case.

## What you've built

\`\`\`rust
#[auto_impl(&mut, Box)]
pub trait Database {
    type Error: DBErrorMarker;
    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;
    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error>;
    fn storage(&mut self, address: Address, index: StorageKey)
        -> Result<StorageValue, Self::Error>;
    fn block_hash(&mut self, number: u64) -> Result<B256, Self::Error>;
}
\`\`\`

Every piece earned its keep:

- **\`&mut self\`** (Step 1) — caching without \`RefCell\`/\`RwLock\` overhead
- **\`basic\` returning \`AccountInfo\`** (Step 2) — one round-trip per account
- **\`code_by_hash\`** (Step 2) — content-addressed, deduped across contracts
- **\`type Error: DBErrorMarker\`** (Step 3) — open error taxonomy, marker bound
- **\`#[auto_impl(&mut, Box)]\`** (Step 4) — automatic forwarding

The next lesson covers what \`auto_impl\` *can't* do (Arc), how revm splits read from write, and the three real impls that show how the same trait scales from 50 lines to thousands.

## Recall before moving on

Without scrolling:

1. Why does \`Database\` use \`&mut self\` and not \`&self\`?
2. What's the difference between \`basic\` and \`code_by_hash\`, and why split them?
3. Why is \`Error\` an associated type instead of a fixed enum?
4. What does \`#[auto_impl(&mut, Box)]\` save you from writing?

If any answer is shaky, scroll back. Next lesson: the read/write split.

> 🛣️ **The road not taken (Solana):** Solana's \`Database\`-equivalent has a different shape. Solana state is a flat map of accounts, each storing its own data blob — *not* a trie of slots within contracts. So Solana's "database trait" is account-keyed, with no \`storage(address, key)\` method: storage isn't an indirection layer, just an account field. The four-method shape you just built — \`basic\` / \`code_by_hash\` / \`storage\` / \`block_hash\` — is the trait-level fingerprint of EVM's "trie + per-contract storage" design choice. Different state models lead to different decoupling seams.

> **🧭 Where you are now in the stack:** you've built the **VM–DB seam** (read API) — 4 methods + associated \`Error\` + \`auto_impl\`. The same Revm now runs against an in-memory map, a remote JSON-RPC, MDBX, or a shard network without any of them touching the VM. Next lesson opens the read/write split — the design decision that lets \`Arc\` work and decouples eager vs lazy fetch.
`,
                },
                {
                  title: 'Companion traits, optimizations, and real impls',
                  slug: 'revm-database-companions-en',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 10,
                  xpReward: 25,
                  content: `# Companion traits, optimizations, and real impls

You finished the last lesson holding a four-method \`Database\` trait that takes \`&mut self\` — and an awkward dangling problem: \`Arc<MyDb>\` (Rust's atomic reference-counted pointer, the standard way to share data across threads) only hands out \`&T\`, never \`&mut T\`. So **parallel readers can't share a \`Database\` at all.** Production needs that, so revm solves it with three more pieces: a read-only companion trait, a separate write-back trait, and one perf escape hatch that lives in the trait API itself. Plus three reference impls that show the same shape stretching from 50 lines to thousands.

## Step 1 — \`DatabaseRef\`: read-only access

\`\`\`rust
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

Same four methods as \`Database\`. Two differences:

- **\`&self\` instead of \`&mut self\`.** No interior mutation allowed (without \`RwLock\` / \`OnceLock\` etc.).
- **\`auto_impl\` list is longer** — \`&, &mut, Box, Rc, Arc\` (five wrappers vs. \`Database\`'s two).

> 🛑 **Predict.** Why is the \`auto_impl\` list longer for \`DatabaseRef\`? What does the asymmetry tell you?

Because \`&self\` access is *strictly less restrictive* than \`&mut self\`. \`Arc<T>\` and \`Rc<T>\` give you cheap, shareable \`&T\` but never \`&mut T\`. So \`DatabaseRef\` works through them; \`Database\` doesn't. The longer list is mechanical, not a design choice.

The pattern: **need shared concurrent access? Implement \`DatabaseRef\`. Need caching? Implement \`Database\`. Need both? Implement both** — revm has helpers like \`WrapDatabaseRef\` to lift one to the other.

## Step 2 — \`DatabaseCommit\`: separate write-back trait

\`\`\`rust
#[auto_impl(&mut, Box)]
pub trait DatabaseCommit {
    fn commit(&mut self, changes: AddressMap<Account>);
}
\`\`\`

A separate trait for write-back. Why?

> 🛑 **Predict.** Without scrolling: why isn't \`commit\` just another method on \`Database\`?

Two reasons:

1. **Read-only databases exist.** A forked-mainnet impl reads from RPC but has no business committing — there's no real backing store to write to. Forcing it to implement \`commit\` would require a panicking stub or pollute the type with a bogus method.
2. **Different lifecycle.** Reading is per-call; committing is end-of-transaction. Splitting the trait makes that lifecycle explicit and lets the type system enforce it.

Same pattern as Rust's \`Read\` and \`Write\` in \`std::io\` (the standard library's two-trait split for streams) — mixing them into one trait would force every reader to think about writing.

## Step 3 — \`storage_by_account_id\` (the optimization)

\`Database\` has one more method we didn't show last lesson:

\`\`\`rust
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
\`\`\`

Note: it has a **default implementation** that ignores \`account_id\` and forwards to \`storage\`. That default is the key feature.

> 🛑 **Predict.** Why is this method here at all? When does the default's "ignore \`account_id\`, fall through to \`storage\`" *not* satisfy revm's needs?

For impls with **internal account indexing** — e.g., MDBX-backed Reth, where the account has been resolved to an internal numeric ID earlier in the call frame. Passing \`account_id\` skips a redundant address-to-account-ID lookup on each storage hit. The default forwards safely; impls that *can* go faster override.

**Performance lives in the trait API, not just the implementation.** A naive impl (in-memory) takes the default and runs fine. A production impl (MDBX) overrides and gets paid back for the work.

## Step 4 — Three real implementations to skim

Same trait, three radically different backends:

| Impl | Where | Backing | Lines |
| :--- | :--- | :--- | :--- |
| \`InMemoryDB\` | \`crates/database/src/in_memory_db.rs\` | \`HashMap\`s | ~50 |
| \`AlloyDB\` | \`crates/database/src/alloydb.rs\` | JSON-RPC over the network | ~150 |
| \`StateProviderDatabase\` | reth: \`crates/storage/storage-api/src/database_provider.rs\` | MDBX, sparse Merkle | thousands |

> 🔍 **Read all three openings.** Just the type definitions and the first method (\`basic\`). Compare:
> - \`InMemoryDB::basic\` — direct \`HashMap::get\`, infallible
> - \`AlloyDB::basic\` — async RPC call wrapped in a sync façade, fallible
> - \`StateProviderDatabase::basic\` — MDBX cursor lookup, fallible
>
> Three different worlds, one trait shape.

> 🛑 **Anti-fluency.** Without scrolling: which would you reach for to *fork mainnet at block N* and run arbitrary transactions on top? Why?

\`AlloyDB\`. It fetches state lazily over RPC — no need to download a full archive node. The first time your tx hits a slot or account, \`AlloyDB\` queries the upstream node; subsequent reads come from its in-memory cache. **The fork-mainnet pattern is exactly 150 lines of glue around \`Database\`.**

## Recall before the quiz

Without scrolling:

1. Why does \`DatabaseRef\`'s \`auto_impl\` list include \`Rc\` and \`Arc\` while \`Database\`'s doesn't?
2. Why is \`commit\` on a separate trait from \`Database\`?
3. What does overriding \`storage_by_account_id\` actually save in the MDBX impl?
4. Among \`InMemoryDB\`, \`AlloyDB\`, \`StateProviderDatabase\` — which would you pick to fork mainnet?

The next lesson is a quiz. Engage with these recalls now if any answer is shaky.
`,
                },
                {
                  title: 'Quiz: did the \`Database\` trait shape stick?',
                  slug: 'revm-database-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 11,
                  duration: 4,
                  xpReward: 25,
                  content: `# Quiz: did the \`Database\` trait shape stick?

Four questions covering the trait's design decisions and the read/write split. Same rule: **you can't nod past a quiz.**

If you miss two or more, scroll back to *Building the \`Database\` trait* before going on to the drill.`,
                  quizQuestions: [
                    {
                      question: "Why does `Database` take `&mut self` instead of `&self` on its methods?",
                      options: [
                        "To prevent shared concurrent access from multiple threads.",
                        "To allow implementations to mutate internal caches (e.g., a forked-mainnet impl caching the result of a network read) without RefCell/RwLock scaffolding.",
                        "Because the EVM needs to *write* state through `Database` methods.",
                        "It's a Rust requirement — `&self` traits can't be `dyn`-compatible.",
                      ],
                      correctIndex: 1,
                      explanation: "`&mut self` lets impls mutate caches directly. A networked impl wants to cache RPC results across calls; `&self` would force interior-mutability scaffolding (RwLock/RefCell). For users who genuinely need shared `&self` access (Arc-wrapped, parallel tasks), revm provides the companion `DatabaseRef` trait — a deliberate design split.",
                    },
                    {
                      question: "Why is `Error` an associated type bounded by the marker trait `DBErrorMarker`?",
                      options: [
                        "It's an open extension point: each impl picks its own error type, but revm can tighten bounds (Send, Sync) later via the marker without breaking impls.",
                        "It's a Rust limitation — traits can't have generic methods.",
                        "The marker is a vacuous bound; it serves no design purpose.",
                        "It's a back-compat shim for an older revm API.",
                      ],
                      correctIndex: 0,
                      explanation: "A fixed `enum DatabaseError` would force you to flatten `reqwest::Error`, `serde_json::Error`, MDBX errors, etc., into closed variants — and require a revm PR every time you needed a new failure mode. The associated type leaves your error yours. The marker trait gives revm a place to *tighten* requirements without breaking impls.",
                    },
                    {
                      question: "Why is `auto_impl` longer for `DatabaseRef` (`&, &mut, Box, Rc, Arc`) than for `Database` (`&mut, Box`)?",
                      options: [
                        "`Rc` and `Arc` aren't thread-safe, so they can't implement `Database`.",
                        "`DatabaseRef` is older; the list grew over time.",
                        "`Rc<T>` and `Arc<T>` give shared `&T` access but cannot provide `&mut T`. `DatabaseRef`'s methods take `&self`, so they fit through Rc/Arc. `Database`'s `&mut self` methods don't.",
                        "`DatabaseRef` requires `Send + Sync`; `Database` doesn't.",
                      ],
                      correctIndex: 2,
                      explanation: "Mechanical, not stylistic. `Arc<T>` only gives out `&T`. So any `&self`-only trait works through `Arc`, but `&mut self` traits don't. The longer list is a consequence of `DatabaseRef`'s read-only methods — it's not a design choice in the trait itself.",
                    },
                    {
                      question: "Among `InMemoryDB`, `AlloyDB`, and `StateProviderDatabase`, which is the right choice for 'fork mainnet at block N and run arbitrary transactions'?",
                      options: [
                        "`InMemoryDB` — pre-load all of mainnet state into RAM.",
                        "`AlloyDB` — fetch state lazily over JSON-RPC; the upstream node is the source of truth.",
                        "`StateProviderDatabase` — direct MDBX access requires a full Reth archive locally.",
                        "Any of them, equally — they're interchangeable.",
                      ],
                      correctIndex: 1,
                      explanation: "`AlloyDB` is purpose-built for this — it queries an upstream RPC for state slots and accounts as the EVM touches them, then caches. `InMemoryDB` would need you to pre-load all of mainnet (impractical). `StateProviderDatabase` requires a local MDBX with an actual Reth node behind it.",
                    },
                  ],
                },
                {
                  title: 'Drill: implement \`ZeroDb\` and watch revm read state',
                  slug: 'revm-database-drill-en',
                  type: 'CONTENT',
                  sortOrder: 12,
                  duration: 12,
                  xpReward: 25,
                  content: `# Drill: implement \`ZeroDb\` and watch revm read state

You've read the trait shape and the three reference impls. **Now build your own — the smallest one anyone can write.** A \`Database\` that always says "balance zero, slot zero, no code." Stub four methods, plug it into Revm, run a transaction, and watch exactly which reads the EVM actually performs. (Spoiler: fewer than you'd guess. The EVM is *very* lazy about state.)

## The target

A \`Database\` impl that always returns "balance = 0, no code, slot = 0":

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

\`type Error = std::convert::Infallible\` — we literally cannot fail. Every call returns \`Ok(...)\`. \`Infallible\` is the conventional "this never errors" type.

## Drill 1 — Predict before plugging it in

> 🛑 **Question (write your answers down before scrolling):** Each of these EVM operations runs against \`ZeroDb\`. What happens?
>
> 1. \`BALANCE\` of any address.
> 2. \`SLOAD\` of any slot.
> 3. \`EXTCODESIZE\` of any address.
> 4. \`CALL\` to an address with no code, transferring 0 ETH.
> 5. \`BLOCKHASH(N)\` for any block number \`N\`.

Answers:

1. **Returns 0.** \`basic\` returns \`AccountInfo::default()\` (balance 0).
2. **Returns 0.** \`storage\` returns \`U256::ZERO\` — same as a fresh Ethereum slot.
3. **Returns 0.** \`code_by_hash\` returns empty \`Bytecode\` (length 0).
4. **Succeeds with no execution.** A \`CALL\` to an EOA (no code) is a valid Ethereum operation — transfer value (here zero), return. **No revert.**
5. **Returns \`B256::ZERO\`.** Useful as a placeholder for tests.

If you missed any of these, your mental model of \`Database\` × EVM semantics needs another pass — re-read the build-up lesson before continuing the drill.

## Drill 2 — Plug \`ZeroDb\` into Revm and execute a 1-tx block

Write a one-shot \`examples/zero_db_drill.rs\` (or use revm's existing test harness):

\`\`\`rust
use revm::{database_interface::Database, Evm, primitives::*};

fn main() {
    let mut evm = Evm::builder()
        .with_db(ZeroDb)
        .build();

    // PUSH1 0x42 PUSH1 0x00 SSTORE STOP
    // Push 0x42, push 0x00, write 0x42 to slot 0, stop.
    let bytecode = hex::decode("604260005500").unwrap();

    let result = evm.transact(&bytecode);
    println!("{:?}", result);
}
\`\`\`

> 🛑 **Predict.** Will this transaction succeed against \`ZeroDb\`?

Yes. \`SSTORE\` is a *write*, not a read — and \`Database\` doesn't see writes (those go through \`DatabaseCommit\`, which we deliberately didn't implement). The pre-existing slot value is read via \`storage\` (returns 0, fine). The new value 0x42 is staged in revm's journaling layer and never reaches \`ZeroDb\`. The tx commits successfully.

## Drill 3 — Now watch reads happen

Add \`println!\`s to \`ZeroDb\`:

\`\`\`rust
fn basic(&mut self, addr: Address) -> Result<Option<AccountInfo>, Self::Error> {
    println!("[ZeroDb] basic({addr})");
    Ok(Some(AccountInfo::default()))
}
fn storage(&mut self, addr: Address, key: StorageKey) -> Result<StorageValue, Self::Error> {
    println!("[ZeroDb] storage({addr}, {key})");
    Ok(StorageValue::ZERO)
}
// ... same pattern for code_by_hash and block_hash
\`\`\`

Re-run. **You'll see exactly which reads revm needs** — and *only* those reads. No phantom queries. No eager state loading. Lazy, on-demand, exact.

> 🔧 **Question:** How many distinct method calls did you observe? Which methods? On which keys?

The exact answer depends on the bytecode and harness, but for \`PUSH1 0x42 PUSH1 0x00 SSTORE STOP\` you'll see something like:

- One \`basic(tx.from)\` to validate the sender's nonce/balance
- One \`storage(tx.to, 0)\` to read the existing slot for SSTORE refund accounting

Two reads. That's it. **You now understand the entire harness around Revm — every other database is just this, with real data.**

## Drill 4 — Make it fail (optional, harder)

Replace \`Infallible\` with a custom error and have \`storage\` return \`Err(...)\` for one key:

\`\`\`rust
#[derive(Debug)]
struct DbErr(String);
impl revm::database_interface::DBErrorMarker for DbErr {}

struct PickyDb;

impl Database for PickyDb {
    type Error = DbErr;
    // basic, code_by_hash, block_hash all Ok(...)
    fn storage(&mut self, _: Address, key: StorageKey) -> Result<StorageValue, Self::Error> {
        if key == StorageKey::from(13u64) {
            Err(DbErr("slot 13 is unlucky".into()))
        } else {
            Ok(StorageValue::ZERO)
        }
    }
    // ... rest
}
\`\`\`

Run a tx that does \`SLOAD(13)\`. **What does revm do?** (Hint: it's *not* a revert — it's a different category of failure.)

The tx aborts as a "fatal external error" — distinct from a revert. Reverts are *consensus*; database errors are *infrastructure*. Revm bubbles \`Self::Error\` up to the caller without converting it to a revert, so your harness can decide whether to retry, log, or propagate. **That's why \`Error\` is your type, not revm's.**

## End-of-lesson recall

Without scrolling, in your own words:

1. Why does \`ZeroDb::basic\` return \`Ok(Some(AccountInfo::default()))\` instead of \`Ok(None)\`?
2. Why didn't \`SSTORE\` in Drill 2 ever call \`ZeroDb\` for the *write*?
3. What's the difference between a tx revert and a \`Database::Error\` bubbling up?

If any answer is shaky, the lesson isn't done with you. Re-run the drill or re-read the build-up.

After this drill, you have a working mental model of how revm gets state — every other database is just \`ZeroDb\` with real data behind it.

Two lessons left before the final quiz. First, **how Revm itself is tested** — the harness that proves correctness against the Ethereum spec for every fork. Then revmc, the JIT/AOT compilation path. After both, Inside Revm is done.`,
                },
                {
                  title: 'How Revm tests itself — state tests, EOF tests, and execution-spec compliance',
                  slug: 'revm-testing-en',
                  type: 'CONTENT',
                  sortOrder: 13,
                  duration: 22,
                  xpReward: 45,
                  content: `# How Revm tests itself — state tests, EOF tests, and execution-spec compliance

You walked the interpreter, the instruction table, and the Database trait. **Now: how does the Revm team prove that Revm actually executes the EVM correctly?** The answer is not "we read it and nodded." A consensus-critical engine — one bug ships a chain split — is held to a different bar. This lesson reads the test infrastructure that bar requires.

## The three test surfaces every EVM implementation has to pass

| Test surface | Where it lives | What it proves |
| :--- | :--- | :--- |
| **State tests** ([\`ethereum/tests\`](https://github.com/ethereum/tests)) | the canonical, multi-client test corpus | a single transaction takes a pre-state to the right post-state with the right gas cost |
| **EOF tests** ([\`ethereum/tests/EOFTests\`](https://github.com/ethereum/tests/tree/develop/EOFTests)) | EVM Object Format conformance | the new bytecode container format (validation, sub-containers) accepts/rejects what the spec says |
| **execution-spec-tests** ([\`ethereum/execution-spec-tests\`](https://github.com/ethereum/execution-spec-tests)) | spec-derived test generator | tests are *generated from* the spec, so passing them = matching the spec by construction |

Revm runs all three. **Passing them is what makes Revm safe to ship as the engine inside Reth, Hyperliquid's HyperEVM, Foundry, Tempo.** Without this discipline, every downstream consumer is exposed to consensus bugs.

## 1. State tests — the standard format

A state test is a JSON file. Open any one in [\`ethereum/tests/GeneralStateTests\`](https://github.com/ethereum/execution-spec-tests). The shape:

\`\`\`json
{
  "TestName": {
    "env": { "currentNumber": "...", "currentTimestamp": "...", "currentGasLimit": "..." },
    "pre": {
      "0xAlice": { "balance": "0x..", "nonce": "0x..", "code": "0x..", "storage": {} }
    },
    "transaction": {
      "data": ["0x..."],
      "gasLimit": ["0x..."],
      "to": "0xBob",
      "value": ["0x.."]
    },
    "post": {
      "Cancun": [{
        "hash":   "0x...post-state-trie-root...",
        "logs":   "0x...logs-bloom...",
        "indexes": { "data": 0, "gas": 0, "value": 0 }
      }]
    }
  }
}
\`\`\`

Three sections: \`pre\` (account state before), \`transaction\` (what to apply), \`post\` (the state-root + logs hash that should result, per fork). The runner builds the pre-state, executes the tx, hashes the post-state, and compares against \`post.Cancun[].hash\`. Match → pass. Diverge → bug.

> 🔍 **Find in repo.** In [\`bluealloy/revm\`](https://github.com/bluealloy/revm), search for \`statetest\` (likely under \`bins/revme/\` or a similar runner crate). Note that the runner is a separate binary — you can run it locally against the upstream test suite. **The same suite Geth, Erigon, Nethermind, and Besu run.**

## 2. EOF tests — validation conformance

EOF (EVM Object Format, EIP-3540 family) introduces a new bytecode container with sections, type signatures, and structural validation. Unlike legacy bytecode (anything-goes), EOF must be parsed and validated before execution. The validator is consensus-critical: accepting a malformed container or rejecting a valid one is a chain split.

EOF tests are JSON like state tests, but the assertion is just "this bytecode validates" or "this bytecode is rejected with this error code":

\`\`\`json
{
  "EmptyContainer": {
    "code": "0x",
    "results": { "Cancun": { "exception": "EOFException.MISSING_HEADER" } }
  }
}
\`\`\`

Hundreds of these cover edge cases: misaligned section sizes, invalid type sections, unreachable code, jump tables that escape sub-containers. The Revm validator is run against all of them on every CI run.

## 3. execution-spec-tests — tests generated from the spec

The most powerful tier. [\`ethereum/execution-spec-tests\`](https://github.com/ethereum/execution-spec-tests) is a Python framework where you write test scenarios in spec-aware DSL, and the framework generates concrete state tests across all forks:

\`\`\`python
@pytest.mark.valid_from("Cancun")
def test_my_opcode(state_test, fork):
    pre = { Address(0x1000): Account(code=Op.MY_NEW_OPCODE + Op.STOP) }
    tx = Transaction(to=Address(0x1000), gas_limit=100_000)
    post = { Address(0x1000): Account(storage={0: 1}) }  # opcode wrote 1 to slot 0
    state_test(env=Environment(), pre=pre, post=post, tx=tx)
\`\`\`

The framework runs this test against every fork that defined \`MY_NEW_OPCODE\` — automatically generating the right pre-state, gas costs, and post-state hashes from the spec. **Passing execution-spec-tests means matching the spec by construction**, not "we wrote some tests and they happen to agree."

This is how new EIPs get coverage before they ship. **Every new opcode, every new precompile, every gas-rule change** comes with execution-spec-tests; client implementations (Geth, Erigon, Revm-based clients) run them and report compatibility before mainnet activation.

## What this teaches the Revm consumer

You will not (usually) write state tests yourself — they're written upstream and you consume them. But the *patterns* matter for any code you write that re-implements EVM behavior:

1. **Pre-state → tx → post-state** is the universal shape of "I claim to execute the EVM correctly." Use it whenever you build something that processes transactions (Foundry cheatcode, custom precompile, ExEx that re-executes).
2. **Differential against a non-Revm reference** is the "I'm not the spec, but I match it" pattern. The Building tier's *Validate Your Revm Simulation Against a Production Provider* lesson is exactly this discipline applied at the application layer.
3. **Generated tests ≥ hand-written** when the spec is authoritative. If you build something with formal semantics (a custom CFMM, a sponsorship policy), generating tests from the semantics catches the bugs hand-written tests miss.

> 🛑 **Predict before scrolling.** Suppose a new EIP changes the gas cost of \`SLOAD\` for cold accounts. Walk through which of the three test surfaces would catch a Revm bug that miscomputes the new gas cost. **Hold your guess.**

---

All three would catch it, but at different latencies:

- **execution-spec-tests** would catch it *first* — the spec change generates new tests automatically; CI runs them on the EIP draft branch before activation. **Issue filed before the EIP merges.**
- **State tests** catch it *next* — once the spec is finalized, the Ethereum tests team produces canonical state tests for the new behavior. CI catches divergence before mainnet activation. **Issue filed during fork rollout.**
- **EOF tests** would not catch this specific bug (gas cost is opcode behavior, not container validation). **EOF tests catch a different class of bug — structural validation, not execution semantics.**

The lesson: **the three test surfaces are not redundant — they partition the consensus-correctness space.**

## Drill

1. **Run the state-test runner locally.** Clone [\`bluealloy/revm\`](https://github.com/bluealloy/revm) and find the \`statetest\` binary (often under \`bins/revme/\`). Clone [\`ethereum/tests\`](https://github.com/ethereum/tests). Run the runner against a small subset (e.g., \`GeneralStateTests/stArgsZeroOneBalance/\`). **Verify all pass.** 30 minutes.
2. **Read one state test JSON end-to-end.** Pick a single test (e.g., one of the \`stArgsZeroOneBalance\` files). Map every field in the JSON to where the Revm runner uses it. **Trace one full execution mentally.** 30 minutes.
3. **Read one execution-spec-test source.** Pick any test in [\`execution-spec-tests/tests/\`](https://github.com/ethereum/execution-spec-tests/tree/main/tests). Identify the DSL operators (\`Op.X\`, \`Account(...)\`, \`Transaction(...)\`) and read the docs to understand how they generate concrete state tests. 45 minutes.
4. **Find a Revm-resolved consensus issue.** Search [\`bluealloy/revm\` closed issues](https://github.com/bluealloy/revm/issues?q=is%3Aissue+is%3Aclosed+state+test) for one that was caught by state tests. Read the bug, the fix, and the regression test added. **This is what consensus correctness costs in practice.** 45 minutes.

After drill 4 you've seen the full feedback loop: spec changes → tests generated → Revm fails → Revm fixed → regression test added → consensus protected.

> 🛑 **Final check.** In one sentence: why does Revm — a library, not a chain — need to run state tests at all, when state tests are usually associated with full clients? If your answer doesn't mention "every client embedding Revm inherits Revm's correctness; a Revm bug is a bug in *every* downstream client," re-read the opening — that's the entire reason this discipline exists at the engine layer.

## 📺 Further reading

- [Ethereum tests README](https://github.com/ethereum/tests) — the canonical state-test corpus
- [execution-spec-tests docs](https://eest.ethereum.org/) — the test-generation framework
- [EIP-3540 — EOF v1](https://eips.ethereum.org/EIPS/eip-3540) — the format whose validator the EOF tests cover
`,
                },
                {
                  title: 'Parallel execution — beyond the serial interpreter loop',
                  slug: 'revm-parallel-execution-en',
                  type: 'CONTENT',
                  sortOrder: 14,
                  duration: 24,
                  xpReward: 50,
                  content: `# Parallel execution — beyond the serial interpreter loop

Every Inside Revm lesson so far has treated execution as serial: one transaction at a time, through the interpreter, then commit, then next. This is how Reth and revm ship today and how mainnet has worked for a decade. **It is also the single biggest performance ceiling on the EVM**, and a list of teams — Sei, Monad, MegaETH, Aptos (origin of the technique) — have shipped or are shipping parallel EVMs. Reth itself has experimental parallel-execution paths in the source tree. This lesson teaches you the model.

> 📌 **Honest framing.** Parallel EVM is a *moving target*. The specific implementations differ across Sei, Monad, MegaETH, and Reth's experimental work. What stays constant — and what this lesson teaches — is the **block-stm** pattern (optimistic concurrency control with read/write conflict detection), plus how it maps onto the \`Database\` trait you've already walked.

## 1. Why serial execution is the ceiling

A block contains N transactions. The interpreter executes them one at a time because each tx might read state another tx wrote. If tx 5 reads slot \`X\` and tx 3 wrote slot \`X\`, you have to run 3 before 5.

> 🛑 **Predict before scrolling.** A mainnet block has ~200 transactions. How many of them actually conflict with each other (i.e., one writes a slot another reads)? Take a guess as a percentage.

Empirically: **roughly 10–20%** of mainnet transactions touch state another tx in the same block also touches. The rest are independent — DEX swaps on different pools, transfers to different accounts, oracle updates that nobody else reads in that block. **80% of the block is being executed serially for no semantic reason.** That gap is the prize parallel EVM goes for.

## 2. The block-stm pattern (the dominant approach)

Block-stm (block-level Software Transactional Memory) was introduced by Aptos for Move and ported to EVM by Sei, then adapted by Monad, MegaETH, and others. The core idea:

\`\`\`
1. Speculatively execute all N transactions in parallel (multiple workers).
2. While each tx runs, record what it reads (read set) and what it writes (write set).
3. After execution, validate in commit order:
   - If tx i's read set overlaps any earlier tx j's write set (j < i, j committed after i started),
     i used stale data → re-execute i.
4. Repeat validation + re-execution until all N transactions are valid in serial order.
\`\`\`

This is **optimistic concurrency control**: assume conflicts are rare, run in parallel, fix the ones that actually conflict. The 80% non-conflicting case runs once in parallel. The 20% conflicting case re-runs serially. Net throughput: 3–8× depending on workload.

> 🛑 **Predict.** A block has 100 transactions. 90 of them are independent (different addresses, different storage slots). 10 of them are all sandwich-arb attempts on the same Uniswap pool. **What does block-stm do?**

The 90 independent ones execute in parallel and commit cleanly on first pass. The 10 sandwich-arb ones all read and write the same pool state — they get speculatively executed in parallel, then 9 of them detect they used stale read sets and re-execute. After ~2 re-execution waves the 10 commit serially. Total wall-clock: ~1 parallel pass + 2 small re-execution waves, instead of 100 serial steps. **The conflicts cost you, but only proportionally.**

> 🛣️ **The road not taken (Solana):** Solana solves the same throughput problem with the opposite bet. Every Solana transaction declares its read / write account set *upfront*, encoded in the tx message itself. The runtime (Banking Stage scheduler) then groups non-overlapping tx and runs them in parallel with **zero speculation and zero retry** — you never execute a tx whose dependencies are wrong, because the dependencies are known statically before execution. EVM's block-stm takes the opposite bet: keep the developer model permissive (no declared lock sets, contracts can touch arbitrary storage), and pay for it at the runtime layer with conflict tracking + re-execution. Two valid SE answers to the same problem; the choice between them is a tradeoff between developer ergonomics and runtime cost, not "right vs wrong."

## 3. Where this lives in the \`Database\` trait

Look back at the \`Database\` trait you walked in the Database chain:

\`\`\`rust
pub trait Database {
    type Error: DBErrorMarker;
    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error>;
    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error>;
    fn storage(&mut self, address: Address, key: StorageKey) -> Result<StorageValue, Self::Error>;
    fn block_hash(&mut self, number: u64) -> Result<B256, Self::Error>;
}
\`\`\`

In serial execution, the executor just calls these and gets values. **In parallel execution, every \`basic\` / \`storage\` call is also a read-set entry**, and every state mutation is a write-set entry. The block-stm scheduler wraps the standard \`Database\` with a tracking layer:

\`\`\`rust
pub struct TrackedDatabase<D: Database> {
    inner: D,
    read_set: HashSet<(Address, StorageKey)>,         // populated by storage()
    read_accounts: HashSet<Address>,                  // populated by basic()
    // write_set lives in the executor's journaling layer
}

impl<D: Database> Database for TrackedDatabase<D> {
    type Error = D::Error;
    fn storage(&mut self, addr: Address, key: StorageKey) -> Result<StorageValue, Self::Error> {
        self.read_set.insert((addr, key));            // ← record the read
        self.inner.storage(addr, key)                 // ← delegate to real source
    }
    // ... basic(), code_by_hash(), block_hash() similarly track
}
\`\`\`

**This is why the \`Database\` trait shape pays off so heavily here.** The lesson that walked it didn't say "this is also the seam where parallel execution plugs in," but it is. Any code that depends on \`Database\` works in parallel as long as the wrapper tracks reads; no executor or interpreter rewrite required.

> 🔍 **Find in repo.** Search [\`bluealloy/revm\`](https://github.com/bluealloy/revm) for \`parallel\` or \`stm\`. There's experimental code (often in a feature flag or separate crate) that does exactly this tracking-wrapper pattern. **Read 50 lines of it.** Notice how it composes with everything else you've walked.

## 4. The hard parts

Block-stm sounds easy in the abstract; the production complexity lives in:

| Problem | What makes it hard |
| :--- | :--- |
| **Write set propagation** | tx i's writes need to be visible to tx j>i when re-executing j, but not to tx k that hasn't committed yet. Requires a versioned-storage layer (think MVCC). |
| **Re-execution ordering** | After invalidation, re-execute in dependency order. A naive "re-run failed ones" loop can thrash if you re-execute in the wrong order. |
| **Estimating read/write sets cheaply** | A tx's read set is only known *after* it executes. Pre-execution prediction (via static analysis or hints) is a research area. |
| **Hot contracts** | All sandwich txs on the same pool form an unavoidable serialization. block-stm doesn't help; it just doesn't make it worse. The fix is at the application layer (multiple pools, AMM redesign). |
| **Gas accounting** | Parallel execution costs more gas total (re-executions) than serial. Who pays? Schemes differ. |
| **Determinism** | Multiple workers executing in parallel must produce the *exact same state root* every time. Race conditions in the tracker = consensus bug = chain split. |

The last row is the consensus-critical one. Parallel EVM's bug surface is *huge* compared to serial; this is why production rollouts have been cautious.

## 5. What different chains actually do

- **Sei v2** (the first production EVM with block-stm): runs parallel by default. Their fork of revm includes the tracking-wrapper pattern from §3.
- **Monad**: parallel execution from day one. Custom interpreter (not revm), but the read/write-set tracking model is similar.
- **MegaETH**: parallel execution targeted, plus other optimizations (in-memory state, custom consensus).
- **Reth**: experimental. The mainline interpreter is serial; parallel execution work exists in branches and crates (Compass is one such effort) but is not production default.
- **Mainnet Ethereum**: serial. Parallel execution at the protocol layer is a long-running discussion (EIP-7960 family) but not active.

> 🛑 **Predict.** Why is mainnet conservative about parallel execution while Sei / Monad / MegaETH ship it eagerly?

Mainnet's conservatism is about *consensus risk* and *backward compatibility*. A bug in parallel execution affects every node simultaneously and could split the chain — and mainnet has $400B+ on it. New chains can ship aggressive parallel execution because their TVL starts low and they iterate fast. **The same code, same risk profile, different cost of failure.** This is why new L1s eat mainnet's lunch on raw throughput — they can take the bet mainnet can't.

## 6. What this means for your career

Parallel EVM is **the** active research and engineering frontier in 2026. Teams shipping it (Sei, Monad, MegaETH) are hiring aggressively for engineers who can read revm's tracking-wrapper, understand block-stm, and contribute to either the scheduler or the conflict-detection layer. **None of this work is possible without the Inside Revm + Inside Reth foundation you have now.**

The path forward, if you want to make this your specialization:

1. Read Sei's revm fork for the production block-stm pattern (open source)
2. Read Aptos's original [block-stm paper](https://arxiv.org/abs/2203.06871) for the theoretical foundation
3. Build a toy parallel executor against revm using the \`Database\` tracking pattern from §3 (a weekend project for someone with this curriculum's foundations)
4. Contribute to Reth's experimental parallel work or apply to Sei / Monad / MegaETH

## Drill

1. **Read a real block-stm implementation.** Open Sei's [\`sei-protocol/revm\`](https://github.com/sei-protocol/sei-chain) fork (or their parallel-EVM crate). Find the tracking-wrapper struct. Map its methods to the \`Database\` trait you walked. **30 minutes.**
2. **Identify a parallelization-friendly block.** Open Etherscan, pick a recent mainnet block. Skim the tx list. Count how many touch unique contracts (independent) vs how many touch the top 3 contracts (likely conflicting). **What's your estimate of the parallel speedup ceiling for that block?** 30 minutes.
3. **Read the original block-stm paper.** [arxiv:2203.06871](https://arxiv.org/abs/2203.06871). Skim sections 1, 3, 4. The Aptos model is for Move, but section 3's optimistic execution + validation diagram is the universal pattern. 45 minutes.
4. **Sketch your own tracking wrapper.** In your fork of revm, write a \`TrackedDb\` that implements \`Database\` and prints every read. Run a small bytecode through it (like \`PUSH1 0x42 PUSH1 0x00 SSTORE STOP\` from earlier drills). **See exactly which reads happen.** This is the data block-stm uses to decide what conflicts. 1.5 hours.

## Why this matters before the next lesson

The next lesson covers JIT/AOT compilation via revmc. **Parallel and JIT are the two "beyond interpretation" frontiers** — they attack the same throughput ceiling from different angles (parallel: more cores, JIT: faster cores). Production high-performance EVMs (Sei, Monad, MegaETH) are starting to combine both. After both lessons you have the vocabulary to read either path's source and understand what trade-offs each team picked.

> 🛑 **Final check.** In one sentence: why does the \`Database\` trait shape make parallel execution possible without rewriting the interpreter? If your answer doesn't mention "wrap with read/write tracking, executor unchanged," re-read §3 — that composability is the load-bearing piece.

## 📺 Further reading

- [Aptos block-stm paper (arxiv:2203.06871)](https://arxiv.org/abs/2203.06871) — the original
- [Sei's parallel EVM technical post](https://blog.sei.io/) — production case study
- Monad's blog — different architecture, similar principles
`,
                },
                {
                  title: 'Beyond interpretation — JIT/AOT compilation with revmc',
                  slug: 'revm-jit-aot-revmc-en',
                  type: 'CONTENT',
                  sortOrder: 15,
                  duration: 16,
                  xpReward: 40,
                  content: `# Beyond interpretation — JIT/AOT compilation with revmc

Everything in this course so far treats Revm as an **interpreter**: read an opcode byte, dispatch to a Rust function, mutate the stack, advance the program counter, loop. That's still revm's main mode of operation — and for normal mainnet workloads it's fast enough that no one cares.

It stops being fast enough for L1s that target six-digit TPS. MegaETH advertises 100K+ TPS on the EVM; that's roughly 1000× the per-second opcode budget of mainnet Ethereum. Once you push throughput that far, **the interpreter loop itself becomes the bottleneck** — not Solidity gas costs, not state access, but the cost of doing dispatch-then-execute-then-advance a few hundred million times a second.

The escape hatch is to **stop interpreting and start compiling.** Take EVM bytecode and turn it into native code that runs at machine speed, no per-opcode dispatch. That's what Paradigm's [\`paradigmxyz/revmc\`](https://github.com/paradigmxyz/revmc) does — and it's *built on revm*, not in place of it. Revm's interpreter is still the spec the compiler has to match.

revmc is **experimental** — the README says so up front — but it's the most legible Rust-native answer to the question "what comes after the interpreter?", and it's the toolchain real L1 teams are watching. This lesson is the bridge between "I can read revm's interpreter" (the rest of this course) and "I know what 'compiled EVM' actually means."

> 🛑 **Anti-fluency check, before we start.** Without scrolling: predict what "compile EVM bytecode" means concretely. Output format? Where does the compiled artifact live? When does it run? Hold your guess.

## What "compile EVM bytecode" actually means

Two flavors. Same destination (native machine code), different timing.

**JIT (just-in-time).** First time a contract is called at runtime, revmc compiles its bytecode to native code via LLVM and caches the resulting function pointer keyed by code hash. Second call hits the cache and dispatches to the compiled function directly. Cold call pays compile cost; warm calls run at native speed.

**AOT (ahead-of-time).** You pick a set of bytecodes you *know* will be hot — Uniswap V2/V3 routers, the chain's system contracts, ERC-20 transfer hot paths — compile them offline into a shared object or static library, and ship that binary alongside the node. Zero compile cost at runtime; the trade-off is you commit to which contracts get the treatment.

Both produce the same kind of artifact: a native function with a fixed C-ABI signature that takes the EVM context plus a stack pointer and runs the contract to completion (or to a host callout). The difference is *when* compilation happens.

> 🔍 **Find-in-repo.** Open [\`crates/revmc/src/lib.rs\`](https://github.com/paradigmxyz/revmc/blob/main/crates/revmc/src/lib.rs). Notice the crate is a thin re-export of \`revmc-codegen\`, \`revmc-runtime\`, \`revmc-backend\`, \`revmc-context\`. **Why one façade crate over four?** Because the compiler ([\`revmc-codegen\`]), the backend trait ([\`revmc-backend\`]), the LLVM impl ([\`revmc-llvm\`]), and the runtime glue ([\`revmc-context\`]) are designed to vary independently — you could write a Cranelift backend tomorrow without touching codegen.

## Why this is hard — three problems that aren't obvious

A naive reading of "compile EVM bytecode to native code" makes it sound like a normal LLVM frontend exercise. It's not. The EVM has three properties that fight the compiler.

### Problem 1: gas accounting must stay deterministic

Gas is **consensus-critical state.** Every opcode has a defined gas cost; every block's gas used is part of the header; nodes that disagree on gas usage fork the chain. The interpreter satisfies this by deducting gas inside each opcode handler before running it. The compiler has to do the same — except the compiler's whole job is to *delete code that isn't necessary for correctness*.

> 🛑 **Predict.** Without scrolling: what's an "optimization" that looks safe on normal code but breaks gas accounting?

Three landmines, at least:

1. **Dead-store elimination across opcodes.** A naive LLVM optimizer might notice "this \`MSTORE\` writes a value that's overwritten before being read" and remove the write. But \`MSTORE\` has a *gas cost that depends on whether memory grows.* The write is dead in the data-flow sense, alive in the gas sense.
2. **Constant folding through arithmetic opcodes.** \`PUSH1 2, PUSH1 3, ADD\` looks like "push 5." The compiler is allowed to fold this — but only if it still charges 3 + 3 + 3 = 9 gas. The folded literal pushes one value, not three.
3. **Loop-invariant code motion past \`GAS\`-reading opcodes.** The \`GAS\` opcode reads the *current* gas remaining. Hoisting work past it changes what \`GAS\` reads. Same observable difference; same consensus fork.

revmc's defense: gas metering is **explicit IR**, not implicit. Each opcode emits IR to decrement \`gas.remaining\`, branch to an \`OutOfGas\` block if it underflows, then run. **The optimizer sees the gas writes and can't elide them without proving they're unobservable** — which they almost never are.

> 🔍 **Find-in-repo — gas metering in IR.** Open [\`crates/revmc-codegen/src/compiler/translate/mod.rs\`](https://github.com/paradigmxyz/revmc/blob/main/crates/revmc-codegen/src/compiler/translate/mod.rs) and search for \`gas_cost_imm\` and \`gas_remaining_addr\`. You'll see that every static gas deduction emits an explicit IR \`load → sub → compare → conditional branch to OutOfGas\` — same shape every opcode. That's the compiler making gas a first-class citizen of the IR. There's also a \`gas_metering: bool\` config flag — flip it off and you get fast-but-non-consensus code, useful for off-chain re-execution where you trust the input was already gas-valid.

### Problem 2: EVM's stack/memory model is not native

EVM is a stack machine: a 1024-deep stack of 256-bit words plus a byte-addressable memory region that grows linearly. Native code is register-based with a separate machine stack and machine memory.

revmc handles this by **giving the compiled function a heap-allocated stack and memory passed in via the EVM context**, not by mapping the EVM stack to native registers. The compiler tracks stack depth statically where it can, then emits loads/stores to the stack buffer. \`U256\` doesn't fit in a register on most targets, so even arithmetic opcodes lower to load-load-op-store sequences against the stack buffer, not register ops.

Counter-intuitive consequence: **compiled EVM is not as fast as compiled C.** A native \`a + b\` on \`u64\` is one instruction. The compiled EVM equivalent on \`U256\` is several. The win over the interpreter isn't "now it's like native code" — it's "now there's no dispatch loop and the optimizer can see across opcodes."

### Problem 3: side effects must remain visible to the host

SLOAD reads chain state. SSTORE writes chain state. CALL recursively invokes another contract. BALANCE asks the host about an arbitrary account. These can't be elided, reordered, or folded — they're calls **out of the compiled function back into revm's host environment** (i.e., your \`Database\` impl from the previous module).

In revmc, every such opcode lowers to a call to a runtime *builtin* — a Rust function in [\`revmc-builtins\`](https://github.com/paradigmxyz/revmc/tree/main/crates/revmc-builtins) that does the host callout via the same \`EvmContext\` the interpreter would use. The optimizer treats builtin calls as opaque side-effecting calls (LLVM \`call\`, not \`readonly\`/\`readnone\`) and won't reorder them.

> 🛑 **Recall check.** Without scrolling: of the three problems above, which is the one that constrains the LLVM optimizer most aggressively? (Answer: #3 — opaque calls block almost all optimizer reordering. #1 is solved by making gas IR-explicit, #2 is mostly a perf ceiling rather than a correctness issue.)

## How revmc plugs into revm

revmc is not a fork of revm — it's a layer **on top** of it.

The integration point is [\`JitEvm\`](https://github.com/paradigmxyz/revmc/blob/main/crates/revmc-context/src/jit_evm.rs) in \`revmc-context\`. \`JitEvm\` wraps any \`EvmTr\`-based EVM and overrides \`frame_run\`. When a frame starts, it looks up the code hash:

\`\`\`rust
// Conceptual shape — see crates/revmc-context/src/jit_evm.rs for the real version.
pub struct JitEvm<EVM, F = ...> {
    inner: EVM,
    functions: B256Map<RawEvmCompilerFn>, // code hash -> compiled fn
    on_miss: F,                            // optional JIT-on-the-fly hook
}
\`\`\`

If the code hash is in the precompiled map, dispatch goes to the compiled function. Otherwise, optionally call the \`on_miss\` hook (compile-on-first-call, i.e. JIT), or fall back to the interpreter. **The interpreter is the safety net.** Anything revmc can't compile — unsupported opcodes, debug builds, anything weird — silently routes through revm's normal interpreter path. There's no failure mode where "the compiled path is wrong" — at worst it's "the compiled path isn't taken."

The other half is the runtime: AOT-compiled artifacts need a set of Rust symbols (the builtins) to link against. That's the [\`revmc-build\`](https://github.com/paradigmxyz/revmc/tree/main/crates/revmc-build) build script that node operators run when they ship an AOT binary.

> 🔍 **Find-in-repo — see dispatch in action.** Open [\`examples/runner/src/lib.rs\`](https://github.com/paradigmxyz/revmc/blob/main/examples/runner/src/lib.rs). Notice the entire integration is: build a normal \`MainnetEvm\`, wrap it in \`JitEvm::new(inner, functions)\` where \`functions\` maps the Fibonacci bytecode's hash to its compiled function. That's it. Eight lines. The compiled fibonacci runs; everything else interprets.

## AOT vs JIT in production

Pick AOT when:

- You know the hot set. The chain's system contracts. WETH. The router on your top DEX. Things called in nearly every block.
- You need predictable startup latency. AOT artifacts are loaded once at node start; no per-contract compile pause.
- You're shipping a node binary anyway and can afford to bake compiled contracts into your release.

Pick JIT when:

- The hot set is workload-dependent. A general-purpose RPC node or an indexer can't predict what users will call.
- Compile-once-cache-forever amortizes well over a node's uptime.
- You want a single binary that adapts to any chain.

In practice high-throughput L1s use both: AOT for the known hot set, JIT for everything else, interpreter as the fallback under all of it.

## Where this goes next

Once you accept "EVM bytecode is compilable," several adjacent problems get the same treatment:

- **Native rollups / Stateless re-execution.** Block re-execution for proof generation runs the same bytecode many times; compiling once and replaying the compiled artifact dominates.
- **zkEVM proving.** Some zk stacks lower EVM bytecode through a similar pipeline; revmc's IR-explicit gas metering is a useful primitive even when the eventual backend is a SNARK circuit rather than LLVM.
- **Indexers and tracers.** Anything that re-runs historical blocks to extract derived data benefits from compilation, since the workload is "the same bytecode, millions of times."

This is also where the EVM-L1 ecosystem (MegaETH, Reth-fork chains, Paradigm-adjacent infra) is moving as a whole. "Revm is the spec, revmc is the fast path" is a defensible architecture for the next round of EVM L1s.

## End-of-lesson recall

Without scrolling, in your own words:

1. Why does revmc deliberately make gas metering explicit IR (load/sub/branch) instead of letting the optimizer reason about it?
2. What's the integration boundary between revmc and revm — what does \`JitEvm\` actually intercept?
3. Why isn't compiled EVM as fast as compiled C even after JIT? Name two reasons.
4. When would you choose AOT over JIT for a node you're operating?

If any answer is shaky, re-skim the relevant section. Don't carry the gap into the final quiz.

This is the last content lesson of Inside Revm. The final quiz is next — and after that, the natural next stop is **Inside Reth** (Staged Sync, ExEx, the Reth SDK), where the same source-first treatment continues at the node layer.`,
                },
                {
                  title: 'Inside Revm final quiz',
                  slug: 'revm-advanced-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 16,
                  duration: 8,
                  xpReward: 25,
                  content: `# Inside Revm final quiz

Final check across Revm internals: the interpreter, custom opcodes, and the Database trait.

Three questions. Same rule: **you can't nod past a quiz.** Miss two and re-read the relevant build-up before claiming you're done with Inside Revm.`,
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
