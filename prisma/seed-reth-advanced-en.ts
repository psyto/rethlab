import { PrismaClient } from '@prisma/client';

export async function seedRethAdvancedEN(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'advanced', 'exex', 'opcode'];

  await prisma.course.create({
    data: {
      slug: 'reth-advanced-en',
      title: 'Reth Advanced — Inside Revm and ExEx',
      description:
        'Read the Revm interpreter, learn how custom opcodes and the Database trait work, and pick up Reth Staged Sync and Execution Extensions (ExEx) — the path to building your own EVM infrastructure.',
      difficulty: 'ADVANCED',
      duration: 236,
      xpReward: 715,
      track: 'reth-advanced',
      tags,
      isPublished: true,
      sortOrder: 300,
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
                  title: 'Welcome to Advanced — how this tier works',
                  slug: 'advanced-welcome-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 7,
                  xpReward: 15,
                  content: `# Welcome to Advanced — how this tier works

You've finished Fundamentals (and ideally the Bridge to Advanced course). The Beginner and Fundamentals lessons walked alongside you. **Advanced is different.** This short orientation explains how, so you can engage with the right mindset from lesson 1.

## What changes here

Beginner and Fundamentals taught you the *shape* of the stack — what Alloy types look like, how to use Foundry, what the EVM does at a high level.

Advanced asks something different. **You will read the actual production source of Reth, Revm, Alloy, and Foundry, line by line.** The lessons assume you can already use the stack — they teach you to *read* it.

That's a real shift. You'll see code like:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

— from lesson 1 onward. (If that signature is unfamiliar, the Bridge to Advanced course's Rust module covers every piece of it.)

## The editorial style — and why

Advanced lessons use **active-learning prompts** that you don't see in earlier tiers:

- 🛑 **Predict** — *Stop. Before reading the explanation, answer this in your head.* The point is to engage with the question, even if you're wrong. Wrong predictions are where the learning happens.
- 🔍 **Find in repo** — Open the actual source file and verify the lesson's claim. The lesson is guidance; the source is truth.
- **Anti-fluency checks** — *In your own words, why does this work?* If you can't answer, the lesson explicitly tells you to scroll back. **Don't skip these.**
- **End-of-lesson recall tests** — Most lessons close with "the lesson isn't done with you until you can answer X." Take that literally.

The editorial style is harder than tutorials you've read. It's deliberately so. **Smooth tutorial prose creates a "わかった気になる" trap** — readers nod through complex material and walk away with shallow comprehension. The Predict / Recall pattern forces actual engagement.

This is friction by design. Lean into it.

## Prerequisites — be honest with yourself

Before lesson 1, you should be comfortable with:

**EVM internals**:
- Bytecode and the dispatch loop (opcodes as bytes, PC, instruction table)
- Stack / memory / calldata / storage — what each is and how they differ
- Cold vs warm gas (EIP-2929)
- Call frames: CALL / DELEGATECALL / STATICCALL semantics
- Block structure (header / body / receipts), reorgs as a normal phenomenon

**Intermediate Rust**:
- Generics with trait bounds, \`?Sized\`, \`dyn Trait\` vs \`impl Trait\`
- \`Arc<T>\`, \`Mutex<T>\`, \`RwLock<T>\` — when to use each
- \`unsafe\` blocks and \`unwrap_unchecked()\`
- \`macro_rules!\` syntax (\`$x:ident\`, \`$($x),*\`, fragment specifiers)

**Shaky on any of these?** Don't push through hoping you'll catch up. Go to the **Bridge to Advanced** course and work through the relevant lesson first. Each one is exactly the prep this tier assumes.

(There's also a *Rust: lifetimes, Box, Arc, dyn Trait* lesson inside Advanced — but that's a *test*, not a *teach*. The Bridge course is the teach.)

## Setup — do this once

Have these ready in another window before you start lesson 1:

1. **\`bluealloy/revm\` cloned** — \`git clone https://github.com/bluealloy/revm\`
2. **\`paradigmxyz/reth\` cloned** — \`git clone https://github.com/paradigmxyz/reth\`
3. **A working \`cargo\` toolchain** — \`rustc --version\` should print something modern
4. **\`cargo-expand\`** — \`cargo install cargo-expand\` (you'll want it for the procedural macros lesson in Expert)
5. **A second monitor or split terminal** — you'll be cross-referencing source while you read

The "Find in repo" prompts only work if you actually have the repos open. Close that loop before starting.

## How to actually read these lessons

The pattern across every Advanced lesson:

1. **Open the lesson, see a real source excerpt** (with a GitHub link).
2. **Hit a 🛑 Predict prompt before the explanation.** Stop. Answer in your head or on paper. Then continue.
3. **Read the walkthrough.** Compare to your prediction. Where you were wrong is where the learning happens.
4. **Hit a 🔍 Find-in-repo prompt.** Open the repo. Find the actual file. Verify the lesson's claim.
5. **End-of-lesson recall test.** Close the tab if you can answer in your own words. If not, scroll back.

This is slower than typical tutorials. **It also internalizes.** The trade is intentional.

## Pacing

A single Advanced lesson takes **30–60 minutes** if you actually do the prompts. Expert lessons go longer.

**Don't try to do five in one sitting.** One or two per evening, with the code open and the predict prompts engaged, is the right pace. Sprinting through breaks the active-learning model the lessons are built around.

## You're ready

If the prerequisite list looked familiar and you have the repos open: scroll back to the course detail and start with **Building \`add\` step by step: signature and body**.

If the prerequisite list felt shaky: go work through the Bridge to Advanced course first. Come back when each item on that list reads like vocabulary you own, not concepts you'd have to re-look-up.

Either path is fine. The wrong choice is to ignore the gap and brute-force through Advanced — that's the path that ends with "I read all the lessons but couldn't tell you what \`?Sized\` actually does." Spend the prep time. The source-walking pays off only if you can read the source.`,
                },
                {
                  title: 'Building \`add\` step by step: signature and body',
                  slug: 'revm-add-buildup-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 8,
                  xpReward: 20,
                  content: `# Building \`add\` step by step: signature and body

The real \`add\` opcode in [\`bluealloy/revm\`](https://github.com/bluealloy/revm) looks intimidating:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

Walk that line by line and you get six new ideas at once. Easier path: **build it up.** Start from the dumbest \`add\` you could write, and earn each piece of complexity. By the end of *this* lesson you'll have built everything except the macro on line 2 — that's the next lesson.

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

Each of these has a slightly different stack/state shape. We don't want six copies of \`add\`.

First-attempt fix: a generic over a \`Host\` trait.

\`\`\`rust
pub fn add<H: Host>(host: &mut H) -> Result {
    // ... same body, but calling host.stack instead of a concrete Vec
}
\`\`\`

\`H: Host\` reads as "any type that implements the \`Host\` trait." One source. **One specialized binary per concrete \`H\`** at compile time.

> 🛑 **Predict.** What's the catch with \`<H: Host>\`? Why might revm not stop here?

Two catches:

1. With many host types, monomorphization explodes compile times.
2. **You can't pass a trait object** like \`&mut dyn Host\` — \`<H: Host>\` only accepts types whose size is known at compile time.

Why would you want a trait object? Because sometimes you build the host at runtime (selected by a config flag, or constructed dynamically by a test harness). Trait objects are the way you say "I don't know which concrete \`Host\` impl this is until runtime — please use a vtable."

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

You now have the real signature of \`add\` (the parameter type is wrapped in revm's \`Ictx<...>\` for ergonomics, but the generics are exactly what we built):

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

Three stack operations. Each is a memory write or capacity check. The interpreter's hot path runs this *hundreds of millions* of times per block — that overhead is the difference between competitive and uncompetitive throughput.

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

Last lesson, you built up to:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    let op1 = context.interpreter.stack.pop().ok_or(StackUnderflow)?;
    let op2 = context.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

That's \`add\` semantically. The real source is shorter:

\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    popn_top!([op1], op2, context.interpreter);
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`

The first two lines from your hand-written version became one macro call. **This lesson is just that refactor.** Why a macro, what's inside it, and why three details inside earn their keep.

## Step 1 — Why a macro at all

Look at \`mul\`, \`sub\`, \`div\`, \`mod\`, \`lt\`, \`gt\`, \`eq\`, \`and\`, \`or\`, \`xor\`, ... — every binary opcode begins with the same two lines:

\`\`\`rust
let op1 = ctx.interpreter.stack.pop().ok_or(StackUnderflow)?;
let op2 = ctx.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
\`\`\`

Repeated 30+ times across the codebase. **That's a refactor opportunity.**

> 🛑 **Predict.** Why a \`macro_rules!\` and not a regular function? (Two reasons; name at least one.)

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

Stack underflow is a bug, not a normal path. You don't want the rare-failure code in your hot instruction cache.

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

This quiz isn't decoration. It exists because the previous lesson's "predict" prompts are easy to nod past — and a day from now, "I read it, nodded, and couldn't reproduce it" is the failure mode that breaks Advanced.

Five questions. Each one maps to a piece of the previous lesson. **If you find yourself guessing**, stop and re-read the relevant section before answering. The quiz will still be here.

If you miss two or more, the lesson hasn't internalized — re-read \`Reading add\` before going on to the drill.`,
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

Reading is rehearsal. **Doing is memory.** This lesson is three drills you run yourself, in a real revm checkout, with cargo open in another window. Every drill is *do, then write down what you observed* — not "read about."

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

> 📋 **Recall before reading.** Three questions from the last lessons. If any are shaky, scroll back to *Building \`add\` step by step* or its drill — the rest of this lesson assumes the answers are vocabulary you own.
>
> 1. What does the type signature \`<IT: ITy, H: ?Sized>\` on an opcode function buy us at compile time?
> 2. The \`popn_top!\` macro binds \`op2\` as a \`&mut\`. Why a reference, not a value?
> 3. \`add\` uses \`wrapping_add\`. What test failure mode did you observe when you swapped it for \`saturating_add\` and reran \`cargo test -p revm-interpreter\`?

---

When the EVM sees byte \`0x01\` in bytecode, **what mechanism** decides that \`add\` runs? This lesson is the answer — and the answer earns its complexity, just like \`add\` did. We'll start from the dumbest dispatch you could write and build up to revm's actual instruction table.

By the end you'll have built every piece of:

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

The naive code builds the table at runtime — push the assignments through and hope the optimizer hoists them out of the hot path. Better: build it **at compile time**, so dispatch starts up with the table already populated.

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
2. **Type discipline.** \`Instruction::new(arithmetic::add)\` is more type-safe than a bare function pointer assignment — the compiler verifies the signature matches the table's slot type at the call site.

The generics \`W: InterpreterTypes, H: ?Sized\` are exactly the same \`IT\`/\`H\` we built up two lessons ago. Same reasoning — let one table work across all execution modes and host types.

## Step 4 — The full real instruction table

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

Last lesson, you built up to revm's instruction table — a 256-slot array of \`Instruction\` structs, baked at compile time. **Now slot in your own opcode.**

This lesson is half mechanics (it's actually short) and half caveats (it's not). The mechanics fit on a notecard. The caveats are why "Hyperliquid picked Revm because it's modular" is *not* a free lunch.

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

A complex options pricer can drop from **500K gas in Solidity → 5K gas as a single custom opcode**. That's why Hyperliquid added perp-specific opcodes; that's the kind of compression payment-layer chains explore for stablecoin operations.

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

Reading is rehearsal. **Doing is memory.** This drill takes you from "I've read about custom opcodes" to "I have wired one in a real revm checkout and seen it execute."

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

Revm is the "execution engine," but **it doesn't own state.** Storage reads happen through an external \`Database\` trait — implement it and you can drive Revm against anything: an in-memory map, a forked mainnet, a custom MDBX schema, a network of remote nodes.

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

Define a trait that *describes* what Revm needs from state, without owning the storage:

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

Twelve method bodies of identical forwarding boilerplate (across \`Database\`, \`DatabaseRef\`, \`DatabaseCommit\`).

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

Last lesson, you built up \`Database\`. We ended on a hint: the \`&mut self\` requirement means \`Arc<MyDb>\` *can't* implement it. **This lesson explains why that's OK** — revm has a companion read-only trait, plus a separate write-back trait, plus a perf optimization in the trait API itself, plus three reference impls that show how the same shape scales from toy to production.

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

Same pattern as Rust's \`Read\` and \`Write\` in \`std::io\` — mixing them into one trait would force every reader to think about writing.

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

Reading is rehearsal. **Implementing is memory.** This drill takes you from "I can describe the \`Database\` trait" to "I have implemented one and watched the EVM run against it."

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

After this drill, you have a working mental model of how revm gets state — every other database is just \`ZeroDb\` with real data behind it. Next module: how Reth wires execution into a full sync pipeline.`,
                },
              ],
            },
          },
          {
            title: 'Reth — Hooking the Execution Loop',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Building the \`Stage\` trait step by step',
                  slug: 'staged-sync-buildup-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 10,
                  xpReward: 25,
                  content: `# Building the \`Stage\` trait step by step

Staged Sync is the spine of Reth. **It also looks intimidating** — the real \`Stage\` trait has 6 methods, async readiness, two-direction symmetry, and an \`auto_impl(Box)\` attribute. Walk it cold and you get six new ideas at once.

This lesson builds the trait up from the simplest possible sync loop. By the end you'll have built every piece of:

\`\`\`rust
#[auto_impl::auto_impl(Box)]
pub trait Stage<Provider>: Send {
    fn id(&self) -> StageId;
    fn poll_execute_ready(&mut self, _cx: &mut Context<'_>, _input: ExecInput)
        -> Poll<Result<(), StageError>> { Poll::Ready(Ok(())) }
    fn execute(&mut self, provider: &Provider, input: ExecInput)
        -> Result<ExecOutput, StageError>;
    fn post_execute_commit(&mut self) -> Result<(), StageError> { Ok(()) }
    fn unwind(&mut self, provider: &Provider, input: UnwindInput)
        -> Result<UnwindOutput, StageError>;
    fn post_unwind_commit(&mut self) -> Result<(), StageError> { Ok(()) }
}
\`\`\`

> 📂 **Open \`paradigmxyz/reth\` in another tab.** Cross-check at every step.

## Step 0 — The naive sync: block by block

Without thinking, you'd write Ethereum sync as:

\`\`\`rust
fn sync_to_tip(client: &mut RethNode) -> Result<(), Error> {
    while let Some(block) = client.next_block()? {
        let header = client.fetch_header(block)?;
        let body   = client.fetch_body(block)?;
        let senders = recover_senders(&body)?;
        let receipts = client.execute(&block, &header, &body)?;
        client.update_state(receipts)?;
        client.update_merkle_root(&block)?;
        client.write_indexes(&block)?;
        client.commit()?;
    }
    Ok(())
}
\`\`\`

One block at a time. Each block goes through every phase before the next block starts.

> 🛑 **Predict.** Without scrolling: name three reasons this naive design is *catastrophically* slow at 20M blocks. (Hint: each is a different *kind of* inefficiency.)

The three:

1. **No batching.** ECDSA sender recovery is the same operation 200 times per block. Doing it in 200 separate calls is 200 separate setup costs.
2. **No I/O amortization.** Writing one Merkle root per block means 20M \`commit()\` calls — each touches disk. Batched, you write Merkle roots once per million blocks.
3. **No parallelism.** Headers don't depend on tx execution; sender recovery doesn't depend on the previous block. But the loop blocks on each phase.

The fix: **split the work into stages.** Each stage processes a *range of blocks* end-to-end before handing off.

## Step 1 — Sketch the stages

\`\`\`rust
let stages = vec![
    HeaderStage,       // download headers for blocks [N..M]
    BodyStage,         // download tx bodies
    SenderRecovery,    // ECDSA-recover senders (parallel)
    Execution,         // run Revm, accumulate state diffs
    Hashing,           // sort hashed account/storage changes
    Merkle,            // compute Merkle roots for the range
    Indexes,           // build txhash → (block, index) etc.
    Finish,            // commit + report
];

for stage in &mut stages {
    stage.run(blocks_n_to_m)?;
}
\`\`\`

Now sender recovery batches across blocks, Merkle roots are amortized, and you can parallelize within stages. **The data structure is a list of stages, each implementing one trait.** Build the trait next.

## Step 2 — The first stab at \`Stage\`

> 🛑 **Predict.** Sketch the trait. What method does the orchestrator call? What does the stage return? Hold your guess.

First attempt:

\`\`\`rust
trait Stage {
    fn execute(&mut self, blocks: BlockRange) -> Result<(), StageError>;
}
\`\`\`

One method. Caller passes a range, stage processes it. Done.

This works for forward sync — but it has a critical hole.

## Step 3 — \`unwind\`: reorgs are not optional

> 🛑 **Predict.** Ethereum reorgs aren't a special case — they happen routinely. Without scrolling: how does this single-method \`Stage\` handle a reorg from block 1000 → block 980?

You'd need a *separate* method, not on this trait — and a separate code path in the orchestrator. Half the codebase becomes "the reorg path." That's exactly what other Ethereum clients have, and exactly what Reth was designed to avoid.

Reth's answer: **add \`unwind\` to the same trait**:

\`\`\`rust
trait Stage {
    fn execute(&mut self, blocks: BlockRange) -> Result<(), StageError>;
    fn unwind(&mut self, blocks: BlockRange) -> Result<(), StageError>;
}
\`\`\`

Going forward = call \`execute\` over a range. Going back = call \`unwind\` over a range. **Same trait, two directions.** Reorgs become a normal mode of operation, not a special case. **This symmetry is the architectural keystone.**

## Step 4 — \`ExecInput\` / \`ExecOutput\`: explicit resumability

\`BlockRange\` is too thin. The orchestrator needs to tell the stage:

- *Where to stop.* A target block.
- *Where to resume.* The stage's checkpoint from the last run (after a node restart).

And the stage needs to tell the orchestrator:

- *Where it stopped.* New checkpoint.
- *Whether it's done.* If \`false\`, the orchestrator should call again — backpressure control.

\`\`\`rust
pub struct ExecInput {
    pub target: Option<BlockNumber>,
    pub checkpoint: Option<StageCheckpoint>,
}
pub struct ExecOutput {
    pub checkpoint: StageCheckpoint,
    pub done: bool,
}
pub struct UnwindInput {
    pub checkpoint: StageCheckpoint,
    pub unwind_to: BlockNumber,
    pub bad_block: Option<BlockNumber>,
}
\`\`\`

> 🛑 **Anti-fluency.** Why is \`done\` returned as a *flag inside* \`ExecOutput\`, not a separate \`has_more()\` method? What design constraint is that choice serving?

Atomic call/return. The orchestrator wants exactly one piece of feedback per turn: "I made progress to checkpoint X; whether you call me again is your decision." A separate \`has_more()\` would force the orchestrator into two calls per turn and open a class of bugs where checkpoint and has_more disagree.

## Step 5 — Async readiness: \`poll_execute_ready\`

A stage that downloads headers can't always execute *immediately* — it has to wait for network responses. But the orchestrator wants to schedule across stages without blocking on one slow stage.

\`\`\`rust
fn poll_execute_ready(&mut self, _cx: &mut Context<'_>, _input: ExecInput)
    -> Poll<Result<(), StageError>>
{
    Poll::Ready(Ok(()))  // default: always ready
}
\`\`\`

A Rust async-style poll method. Stages that are always ready (most of them) take the default. Stages that wait on I/O override it to return \`Poll::Pending\` while their futures are in flight.

**The orchestrator polls each stage; if pending, it moves on.** No stage blocks the others.

## Step 6 — Commit hooks: \`post_execute_commit\` / \`post_unwind_commit\`

Some stages need to do work *after* their data is committed to disk — emit metrics, broadcast a notification, prune old data. These hooks let stages do that without polluting \`execute\` with "are we committed yet?" logic.

\`\`\`rust
fn post_execute_commit(&mut self) -> Result<(), StageError> { Ok(()) }
fn post_unwind_commit(&mut self) -> Result<(), StageError> { Ok(()) }
\`\`\`

Default no-op; stages override only when they need it. **Most don't.** Opt-in lifecycle, not mandatory plumbing.

## Step 7 — \`#[auto_impl(Box)]\`: heterogeneous stage list

The orchestrator stores stages in a \`Vec<Box<dyn Stage<...>>>\`. That requires \`Stage\` to be implemented for \`Box<S>\` where \`S: Stage\`.

Without the attribute, you'd manually write:

\`\`\`rust
impl<S: Stage<P>> Stage<P> for Box<S> {
    // forward all 6 methods through (**self).method(...)
}
\`\`\`

\`auto_impl\` is a procedural macro that generates this forwarding. With \`#[auto_impl(Box)]\`, the orchestrator can hold a list of differently-typed stages and call them all through the same trait object.

## What you've built

Every piece earned its keep:

- **\`execute\` / \`unwind\`** (Steps 3–4) — symmetry: forward and reorg use the same surface
- **\`ExecInput\` / \`ExecOutput\`** (Step 4) — explicit resumability across restarts
- **\`done\` as a flag** (Step 4) — atomic call/return
- **\`poll_execute_ready\`** (Step 5) — async readiness, non-blocking scheduling
- **\`post_*_commit\`** (Step 6) — opt-in lifecycle hooks
- **\`#[auto_impl(Box)]\`** (Step 7) — heterogeneous stage list

The next lesson tours Reth's actual 10-stage pipeline — what each stage does and why the order matters.

## Recall before moving on

Without scrolling:

1. Why is \`unwind\` on the same trait as \`execute\`?
2. What does \`done: bool\` enable that \`has_more()\` wouldn't?
3. Why does \`poll_execute_ready\` exist? Which stages would override it?
4. What does \`#[auto_impl(Box)]\` save you from writing?

If any answer is shaky, scroll back. The next lesson is Reth's actual pipeline.
`,
                },
                {
                  title: "Reth's pipeline: 10 stages, in order",
                  slug: 'staged-sync-pipeline-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 25,
                  content: `# Reth's pipeline: 10 stages, in order

Last lesson, you built up the \`Stage\` trait. **Now: meet the actual stages.** Reth's pipeline is 10 stages in a fixed order, each implementing the trait you just built. The order is not arbitrary — every constraint between stages is encoded in *which stage runs when*.

\`\`\`mermaid
flowchart LR
    H[HeaderStage] --> B[BodyStage]
    B --> S[SenderRecoveryStage]
    S --> E[ExecutionStage]
    E --> AH[AccountHashingStage]
    AH --> SH[StorageHashingStage]
    SH --> M[MerkleStage]
    M --> T[TransactionLookupStage]
    T --> I[IndexHistoryStages]
    I --> F[FinishStage]
\`\`\`

Open \`crates/stages/stages/src/stages/\` in the Reth repo as you read.

## The 10 stages

| # | Stage | What it does | Hot loop |
| - | ----- | ------------ | -------- |
| 1 | \`HeaderStage\` | Download block headers | network I/O |
| 2 | \`BodyStage\` | Download tx bodies + uncles | network I/O |
| 3 | \`SenderRecoveryStage\` | ECDSA-recover sender from each tx signature | CPU (parallel) |
| 4 | \`ExecutionStage\` | Run Revm; accumulate state diffs | CPU (Revm) |
| 5 | \`AccountHashingStage\` | Sort account changes by hashed key | sort + write |
| 6 | \`StorageHashingStage\` | Sort storage changes by hashed key | sort + write |
| 7 | \`MerkleStage\` | Update Merkle Patricia Trie roots | tree compute |
| 8 | \`TransactionLookupStage\` | Build \`tx_hash → (block, index)\` index | sort + write |
| 9 | \`IndexAccountHistoryStage\` + \`IndexStorageHistoryStage\` | Historical access indices | sort + write |
| 10 | \`FinishStage\` | Bookkeep, finalize | none |

> 🛑 **Compare your prediction from last lesson.** What stages did you list that *aren't* here? Sometimes the omissions are more revealing than the inclusions — Paradigm chose not to bundle "PrunerStage" into this list (pruning runs separately, on its own schedule).

## Order matters: three constraints

### Constraint 1 — \`MerkleStage\` must come *after* hashing

> 🛑 **Predict.** A Merkle Patricia Trie root needs leaves in sorted-by-hashed-key order. **What does that say about how hashing must be staged?**

The Merkle stage *consumes* sorted hashed keys. So account hashing and storage hashing must complete and commit their sort *before* Merkle starts. You can't interleave hashing and Merkle computation across blocks — the Merkle stage needs the *whole sorted set* for the block range it's processing.

This is why \`AccountHashingStage\` (5) and \`StorageHashingStage\` (6) come before \`MerkleStage\` (7). Not "in some order" but **in this specific order, with full commits between them.**

### Constraint 2 — \`AccountHashingStage\` and \`StorageHashingStage\` *could* run in parallel

They both consume the output of \`ExecutionStage\`. They produce independent sorted change sets (account-keyed vs storage-keyed). **Why does the pipeline run them sequentially?**

> 🔍 **Open \`account_hashing.rs\` and \`storage_hashing.rs\`.** Read the first 30 lines of each. What do they share? What's the practical reason Reth doesn't fork off two threads here?

Two reasons typically hold:

1. **Disk write contention.** Both stages write to MDBX. Running them in parallel would contend on the database lock with no compute benefit.
2. **Pipeline simplicity.** Sequential execution means the orchestrator's scheduler is a flat list. Adding parallel branches would require a DAG scheduler — more complexity, marginal gain.

The Frontiers 2025 talk (linked at the bottom) discusses exactly this trade-off — what *did* get parallelized and what stayed sequential, and why.

### Constraint 3 — \`SenderRecoveryStage\` is the parallelism win

> 🛑 **Predict.** Of all 10 stages, which one benefits *most* from parallelism, and why?

\`SenderRecoveryStage\`. ECDSA-recover sender addresses from transaction signatures — pure CPU, no shared state, embarrassingly parallel. Reth uses Rayon to fan it out across all CPU cores.

Why is this stage the standout?

- **Massive batch size.** Each block has 100–300 transactions; a stage call processes 100K+ blocks at a time = 10–30M signatures per call.
- **No data dependencies.** Each signature recovery is independent — no need to wait for previous results.
- **Pure compute.** No I/O between recoveries.

\`ExecutionStage\` (4) is also CPU-bound but has *sequential* state dependencies — block N's storage writes affect block N+1's reads. You can't trivially parallelize it without optimistic execution (Block-STM, etc.), which has its own consensus complications.

## Why staged sync wins

Three compounding factors explain the architecture:

1. **Batching.** Sender recovery, hashing, Merkle root computation — all amortized across thousands of blocks per call.
2. **Stage-level parallelism.** Within a stage (especially \`SenderRecoveryStage\`), Rayon fans work across all cores.
3. **I/O amortization.** Disk writes happen in big sorted batches at stage boundaries, not after every block.

> 🛑 **Final predict.** A node-by-node sync (geth's old default) does ~50–100 blocks/sec at full tilt. Staged sync does 10K+ blocks/sec. Where does the 100× factor come from?

The factor isn't any single trick. It's the compounding of: (1) ECDSA recovery batched + parallelized (~10× alone), (2) Merkle root once per range, not per block (~10× alone), (3) disk writes batched into sorted ranges that MDBX writes efficiently (~3× alone). Multiplied: ~300×; the practical number lands around 100–200× depending on hardware.

## Recall before the quiz

Without scrolling:

1. Why is \`MerkleStage\` *after* hashing, not interleaved?
2. Why don't \`AccountHashingStage\` and \`StorageHashingStage\` run in parallel, even though they could?
3. Of the 10 stages, which has the biggest parallelism win and why?
4. Three reasons staged sync is faster than block-by-block?

The next lesson is a quiz. Engage with these recalls now if any answer is shaky.

## 📺 Further watching

\`\`\`youtube
zntRpCKHyDc | Georgios Konstantopoulos — Reth: A New Rust Ethereum Client (architecture intro)
\`\`\`

\`\`\`youtube
z3tj8Lk_Ydo | Alexey Shekhirin & Dan Cline — Hyperoptimizing Reth (Frontiers 2025, pipeline perf)
\`\`\`
`,
                },
                {
                  title: 'Quiz: did the Stage trait + pipeline shape stick?',
                  slug: 'staged-sync-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 2,
                  duration: 4,
                  xpReward: 25,
                  content: `# Quiz: did the Stage trait + pipeline shape stick?

Four questions covering the trait design and the pipeline ordering constraints. Same rule: **you can't nod past a quiz.**

If you miss two or more, scroll back to *Building the Stage trait* before going on to the drill.`,
                  quizQuestions: [
                    {
                      question: "Why is `unwind` a method on the same `Stage` trait as `execute`, instead of a separate 'reorg' trait or method?",
                      options: [
                        "Reorgs are rare enough that it's a stylistic choice.",
                        "Rust requires symmetric methods on traits.",
                        "Reorgs are a normal mode of operation; putting them on the same trait makes 'forward over a range' and 'back over a range' structurally identical, which removes a parallel 'reorg path' from the codebase.",
                        "It's a backwards-compat shim from an older Reth version.",
                      ],
                      correctIndex: 2,
                      explanation: "Reth's design treats reorgs as routine, not special. Same trait → same orchestrator scheduler, same per-stage logic. A separate reorg trait would force every stage to be implemented twice and would split the orchestrator into a forward path and a reverse path — exactly what other clients have, and exactly what Reth was built to avoid.",
                    },
                    {
                      question: "Why does `ExecOutput.done` return a flag inside the result instead of being a separate `has_more()` method?",
                      options: [
                        "It's stylistic — both work equally well.",
                        "A separate `has_more()` would force the orchestrator into two calls per turn (execute, then has_more) and open a class of bugs where checkpoint and has_more disagree. The flag inside the output makes the call atomic — `execute` returns one snapshot of its state.",
                        "Rust's type system can't express `has_more()`.",
                        "To enable async cancellation.",
                      ],
                      correctIndex: 1,
                      explanation: "Atomic call/return matters here. The orchestrator wants exactly one piece of feedback per turn: 'I made progress to checkpoint X; whether you call me again is your decision.' Splitting that into two methods opens reasoning gaps about what happens between them.",
                    },
                    {
                      question: "Why is `MerkleStage` placed *after* both `AccountHashingStage` and `StorageHashingStage`, not interleaved?",
                      options: [
                        "It's a historical accident; the order could be different.",
                        "A Merkle Patricia Trie root requires leaves in sorted-by-hashed-key order. The hashing stages produce that sorted order; Merkle needs the full sorted set for its block range, so hashing must complete and commit before Merkle starts.",
                        "`MerkleStage` is slower than hashing; it's placed last for performance.",
                        "To save memory.",
                      ],
                      correctIndex: 1,
                      explanation: "An algorithmic constraint: Merkle root computation cannot start until its sorted leaves are committed. Hashing is the producer, Merkle is the consumer. Producer completes, then consumer runs. Interleaving would force partial Merkle recomputation, which costs more than just batching properly.",
                    },
                    {
                      question: "Of Reth's 10 stages, `SenderRecoveryStage` benefits most from parallelism. Why is it the one, not (say) `ExecutionStage`?",
                      options: [
                        "`SenderRecoveryStage` has more transactions to process than `ExecutionStage`.",
                        "Sender recovery is embarrassingly parallel: each ECDSA recovery is independent of every other, no shared state. Execution has sequential state dependencies — block N's storage writes affect block N+1's reads — so it can't be trivially parallelized.",
                        "Rayon doesn't work inside `ExecutionStage`.",
                        "`ExecutionStage` already saturates a single core, so parallelism wouldn't help.",
                      ],
                      correctIndex: 1,
                      explanation: "ECDSA recovery is independent across signatures; you can fan it across all cores trivially. Execution has consensus-defined sequential state dependencies — parallelizing it requires optimistic execution (Block-STM, etc.) with its own complications. Sender recovery is the standout because its work shape matches Rayon's model perfectly.",
                    },
                  ],
                },
                {
                  title: 'Drill: read \`SenderRecoveryStage\` end-to-end',
                  slug: 'staged-sync-drill-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 25,
                  content: `# Drill: read \`SenderRecoveryStage\` end-to-end

Reading is rehearsal. **Doing is memory.** This drill takes you from "I've read about staged sync" to "I have read \`SenderRecoveryStage\` line by line and answered three architectural questions about it from the source."

## Setup

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth
\`\`\`

You don't need to build it — this is a reading drill, not a compile drill.

## The target file

\`crates/stages/stages/src/stages/sender_recovery.rs\`

Open it. We'll work through it in order.

## Drill 1 — Find the \`Stage\` impl

> 🛑 **Predict before scrolling.** What does \`SenderRecoveryStage::execute\` do, in one sentence? What's the "compute" inside it? What's the "I/O" around the compute? Hold your sentences.

Open the file. Find \`impl<Provider> Stage<Provider> for SenderRecoveryStage\`. The \`execute\` method is your target.

Skim the method body. Identify three sections:

1. **Read** — pull tx envelopes for blocks in the input range from MDBX
2. **Compute** — ECDSA-recover senders for each tx (this is where Rayon enters)
3. **Write** — write recovered senders back to MDBX, update checkpoint

If your sentences from the predict prompt missed the read/compute/write split, scroll back and re-read the build-up lesson's Step 1 — that shape is the entire pipeline pattern, not unique to this stage.

## Drill 2 — Find the batch loop

The stage doesn't process *every* block in \`ExecInput.target\` at once. It batches.

> 🔍 **Find the batch loop.** Search for \`commit_threshold\` or \`chunk\` or \`batch\` in the file.

> 🛑 **Question (write it down):** Why batch? Why not process every block in the range in one shot?

Two reasons:

1. **Memory.** Holding 10M signatures' worth of envelope buffers in RAM is expensive. Batches keep the working set bounded.
2. **Backpressure.** After each batch, the stage can return \`done: false\` and let the orchestrator decide whether to commit and move on, or call again. Without batching, the stage commits everything or nothing.

The \`commit_threshold\` field on the stage struct controls the batch size. **Find its default value** — that's a tunable that matters in production.

## Drill 3 — Find where \`done: false\` is returned

Search for \`done: false\` or \`ExecOutput { done\` in the method body.

> 🛑 **Question:** What condition makes \`done\` flip to \`true\`?

When the stage has processed all blocks up to \`ExecInput.target\` (no more work in this range). Until then, \`done: false\` tells the orchestrator "call me again on the next batch." Once true, the orchestrator advances to the next stage.

## Drill 4 — Find the Rayon parallelism

Search for \`par_iter\` or \`rayon::\` in the file.

> 🔍 **Question:** Where does Rayon enter? On what data?

It's on the inner ECDSA recovery loop — usually shaped like:

\`\`\`rust
chunk.par_iter()
    .map(|tx| recover_signer(tx))
    .collect::<Vec<_>>()
\`\`\`

Each transaction's sender recovery is independent → safe to fan across cores → Rayon does the work.

> 🛑 **Final question (write your answer down):** If the chain had 20× more transactions per block but the same number of cores, would \`SenderRecoveryStage\` get *20×* slower? Why or why not?

It scales sub-linearly. With more transactions per block, each Rayon batch grows but core count stays the same — wall-clock time grows roughly linearly with total signatures, but per-batch overhead (chunking, channel coordination) is amortized over more work, so total throughput improves slightly. **Net: ~15–18× slower for 20× more signatures**, depending on cache behavior.

## End-of-lesson recall

Without scrolling, in your own words:

1. What's the read/compute/write structure of \`SenderRecoveryStage::execute\`?
2. What does \`commit_threshold\` control, and why does it exist?
3. Why is Rayon's parallelism applied to ECDSA recovery and not (say) MDBX writes?
4. Why does \`done: false\` exist as a return state at all? What would break if every \`execute\` had to finish the whole range?

If any answer is shaky, the lesson isn't done with you. Re-read the relevant build-up step or re-open the file.

After this drill, you've read the same code Paradigm uses to keep Reth in sync.`,
                },
                {
                  title: 'Rust: lifetimes, Box, Arc, dyn Trait',
                  slug: 'rust-lifetimes-arc-dyn-en',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 15,
                  xpReward: 30,
                  content: `# Rust: lifetimes, Box, Arc, dyn Trait

Four "advanced but actually simple" Rust features you need to read ExEx and Reth SDK code. **This lesson tests you, not teaches you** — if you stumble on the predict prompts, the gap is real and worth closing.

> 🛑 **Cold start: define each in one sentence.** Without scrolling:
> - \`'a\` (a lifetime parameter)
> - \`'static\`
> - \`Box<T>\`
> - \`Arc<T>\` (vs \`Rc<T>\`)
> - \`Mutex<T>\`
> - \`dyn Trait\`
>
> If you stumbled on more than two, this lesson earns its place. If you breezed through, the lesson tests whether your definitions are *actually right*.

## 1. Lifetimes \`'a\`

A lifetime annotation tells the compiler **how long a borrow lives**.

\`\`\`rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() >= y.len() { x } else { y }
}
\`\`\`

- \`'a\` is a label for "some lifetime"
- Both inputs and the output share the same \`'a\` → "the returned reference lives at least as long as both inputs"
- Often the compiler infers them — **most signatures don't need explicit lifetimes**

> 🛑 **Anti-fluency.** Delete the \`'a\` annotations from \`longest\`. What error does the compiler give? Be precise — name the rule it cites.

### \`'static\`

\`'static\` means **"lives for the entire program."** String literals are \`&'static str\`:

\`\`\`rust
let s: &'static str = "hello";
\`\`\`

Long-running tasks (like ExEx) often require \`'static\` bounds because they can outlive any local scope.

> 🛑 **Predict.** When does a closure passed to \`tokio::spawn\` need to be \`'static\`? Why? Answer before continuing — this exact bound shows up in every ExEx file you'll ever read.

## 2. \`Box<T>\` — heap allocation

When you want a value on the heap rather than the stack, wrap it in \`Box<T>\`:

\`\`\`rust
let boxed: Box<i64> = Box::new(42);
println!("{}", *boxed);   // 42
\`\`\`

Common reasons:

- **Recursive types** (linked lists) need a fixed-size pointer
- Holding a **dynamically-sized** value (\`dyn Trait\`)
- **Move** large values cheaply instead of copying

> 🛑 **Predict.** Without \`Box\`, why can't you write \`enum List { Cons(i32, List), Nil }\`? Spell out the compiler's complaint.

## 3. \`Rc<T>\` and \`Arc<T>\` — shared ownership

Rust's "one owner" rule sometimes gets in the way: you want **multiple parts of the program to hold the same value**.

| Type | Use |
| :--- | :--- |
| \`Rc<T>\` | single-threaded reference counting |
| \`Arc<T>\` | **thread-safe** (atomic reference counting) |

\`\`\`rust
use std::sync::Arc;

let shared = Arc::new(String::from("hello"));
let clone1 = Arc::clone(&shared);   // refcount += 1
let clone2 = Arc::clone(&shared);   // refcount += 1

// Send to another thread — Arc is Send
std::thread::spawn(move || println!("{}", clone1));
\`\`\`

**Reth and ExEx code is full of \`Arc<...>\`** — multiple async tasks need to read the same component.

> 🛑 **Anti-fluency.** \`Arc::clone(&x)\` doesn't deep-copy the inner \`T\`. So what does it copy, exactly? What's the cost? Why "atomic" in "Arc"?

## 4. \`Mutex\` / \`RwLock\` — shared mutability

\`Arc<T>\` alone is read-only. To mutate shared state, wrap in \`Mutex\` or \`RwLock\`:

\`\`\`rust
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0));

let c = Arc::clone(&counter);
std::thread::spawn(move || {
    let mut n = c.lock().unwrap();
    *n += 1;
});
\`\`\`

| Type | Use |
| :--- | :--- |
| \`Mutex\` | exclusive read/write |
| \`RwLock\` | many readers OR one writer |

> 🛑 **Predict.** What does \`.lock().unwrap()\` panic on? When does that happen? (Hint: search for "poisoning" if you don't know.) **Reth code uses \`.lock().unwrap()\` everywhere — understand when it can crash.**

## 5. \`dyn Trait\` — dynamic dispatch

A trait object — like a TypeScript / Java interface, but you opt into runtime method resolution explicitly.

\`\`\`rust
trait Greet {
    fn greet(&self);
}

struct En;
struct Ja;
impl Greet for En { fn greet(&self) { println!("Hello"); } }
impl Greet for Ja { fn greet(&self) { println!("こんにちは"); } }

let g: Box<dyn Greet> = if std::env::var("LANG").unwrap_or_default().starts_with("ja") {
    Box::new(Ja)
} else {
    Box::new(En)
};
g.greet();
\`\`\`

### \`impl Trait\` vs \`dyn Trait\`

| Form | Meaning |
| :--- | :--- |
| \`impl Trait\` | static dispatch (concrete type at compile time) |
| \`dyn Trait\` | dynamic dispatch (resolve at runtime, needs Box or & ) |

\`impl\` is faster, but \`dyn\` lets you have heterogeneous collections like \`Vec<Box<dyn Trait>>\`.

> 🛑 **Anti-fluency.** \`Box<dyn Greet>\` is more expensive than \`Box<En>\` at the call site. **Where exactly is the cost?** What's a vtable? If you can't answer, you don't yet understand dynamic dispatch — re-read.

## 6. What you'll see in ExEx code

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

> 🛑 **Stop. Annotate this signature in your head before scrolling.** Which piece is generics? Which is a trait bound? Which uses shared ownership internally? Which lifetime is implicit?

- \`Node: FullNodeComponents\` — trait bound
- \`ExExContext<Node>\` — generic over the node bundle
- Internally uses \`Arc<...>\` for shared components
- Lifetime annotations are elided but \`'static\` is required

## Cheat sheet

| Feature | One-liner |
| :--- | :--- |
| \`'a\` / \`'static\` | how long borrows live |
| \`Box<T>\` | heap allocation |
| \`Rc<T>\` / \`Arc<T>\` | shared ownership (Arc is thread-safe) |
| \`Mutex<T>\` | safely mutate shared data |
| \`dyn Trait\` | runtime method dispatch |

> Final check: close this tab. Write the ExEx \`my_exex\` signature from memory. If you can't, you don't yet own the vocabulary — open it back up. The next lesson reads ExEx in detail; you'll need each of these without the cheat sheet.`,
                },
                {
                  title: 'Building the ExEx API step by step',
                  slug: 'reth-exex-buildup-en',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 10,
                  xpReward: 25,
                  content: `# Building the ExEx API step by step

**ExEx (Execution Extension)** is Reth's mechanism for injecting Rust code into the execution loop. With it you build node-speed indexers, MEV bots, and live risk engines — directly in the same process as the chain itself.

But the API has 4 parts that look weighty: an init/run split, a notification *enum* with 3 variants, an event channel for pruning hints, and an install method on the node builder. Walk it cold and you get four ideas at once.

This lesson builds the API up from the simplest possible "block listener." By the end you'll have built every piece of the real minimal ExEx — which the next lesson reads in detail.

> 📂 **Open \`paradigmxyz/reth-exex-examples/minimal\` in another tab.** That's the file we're building toward.

## Step 0 — The naive indexer: separate process polling RPC

Without thinking, you'd index Ethereum like this:

\`\`\`rust
fn main() {
    let rpc = HttpProvider::new("http://localhost:8545");
    let mut last_block = 0;
    loop {
        let head = rpc.get_block_number().unwrap();
        for n in (last_block+1)..=head {
            let block = rpc.get_block(n).unwrap();
            index(block);
        }
        last_block = head;
        sleep(Duration::from_secs(1));
    }
}
\`\`\`

A separate process. Polls the RPC every second. Indexes any new blocks.

> 🛑 **Predict.** Without scrolling: name three reasons this naive design is *significantly worse* than running in-process inside Reth. (Hint: each is a different *kind of* problem.)

The three:

1. **Latency.** The RPC poll has request/response overhead. The indexer is always seconds behind the tip — useless for MEV, risk, real-time UX.
2. **Atomicity.** Reth commits a new block to disk *before* your indexer sees it. There's a window where Reth has a block your code hasn't processed. If your code is the source of truth for a derived view, that window is a race condition.
3. **Reorgs.** Polling sees \`head = N\`, then later \`head = N\` (different block). Your indexer has to detect and handle reorgs from outside, with weaker information than Reth itself has.

The fix: **run in the same process as Reth.** Get notified the moment a block commits, with full chain context.

## Step 1 — First stab: a callback per block

Naive in-process API:

\`\`\`rust
fn on_new_block<F: Fn(&Block)>(reth: &mut Reth, callback: F) {
    reth.add_listener(callback);
}
\`\`\`

Reth calls your closure for every new block. Simple.

> 🛑 **Predict.** What's missing? (Two big things.)

The two:

1. **Reorgs aren't append-only.** A callback that only fires on "new block added" can't represent "block N at hash X was replaced by block N at hash Y." Your indexer's derived state silently corrupts on every reorg.
2. **No way to tell Reth you're done.** If your indexer is processing block N, Reth doesn't know whether it can prune block N-100,000's data. Without this signal, **Reth keeps everything forever.**

## Step 2 — A richer notification: the three chain events

Replace the bare callback with an enum that captures all three things that can happen to the chain:

\`\`\`rust
enum ExExNotification {
    ChainCommitted { new: Chain },             // canonical blocks added
    ChainReorged   { old: Chain, new: Chain }, // old replaced by new
    ChainReverted  { old: Chain },             // removed (no replacement yet)
}
\`\`\`

Each variant carries enough information for the indexer to undo or redo derived state:

- **\`ChainCommitted { new }\`** — append the new blocks' state to your index.
- **\`ChainReorged { old, new }\`** — undo \`old\`'s state, apply \`new\`'s state. Atomic swap.
- **\`ChainReverted { old }\`** — undo \`old\`'s state, wait. Reth will follow up with a future \`ChainCommitted\` once it picks a new tip.

> 🛑 **Anti-fluency.** You're indexing transactions to a \`HashMap\`. You handle only \`ChainCommitted\`. The chain reorgs 5 blocks deep. **What's wrong with your HashMap?** Be specific — write the failure mode in two sentences.

The HashMap contains the *old* chain's transactions, but the canonical chain is now the *new* chain. Any later read off your index will return transactions that no longer exist on the canonical chain — a phantom-data bug. Worse: the *new* chain's transactions never got indexed (you didn't see a \`ChainCommitted\` for them — you saw a \`ChainReorged\` you ignored).

This is the **#1 ExEx bug.** The three-variant enum exists specifically to prevent it.

## Step 3 — Tell Reth what you've finished: \`FinishedHeight\`

If your indexer has processed block N, Reth needs to know. Otherwise it can't safely prune anything below N.

\`\`\`rust
ctx.events.send(ExExEvent::FinishedHeight(block_number_hash))?;
\`\`\`

\`ctx.events\` is a write-only channel back to Reth. Whenever your handler finishes a block (or chain), you send \`FinishedHeight(N)\`. Reth aggregates the minimum across all installed ExExes and prunes below that.

> 🛑 **Predict the disk consequence.** You ship an ExEx without the \`FinishedHeight\` event. Six months later your node is at block 21M. What's the disk usage relative to a node without ExEx? Why?

The node retains *all* historical state Reth would otherwise prune — because it can't safely prune anything your ExEx might want to read later. **Disk usage compounds.** Without \`FinishedHeight\`, an "innocuous indexer" turns Reth into a full-archive node by accident.

## Step 4 — The notification stream: async pull, not callback

A callback would force Reth to wait for your slow code on every block. Better: push notifications into a stream, your handler pulls when ready:

\`\`\`rust
while let Some(notification) = ctx.notifications.try_next().await? {
    // process at your pace
}
\`\`\`

\`ctx.notifications\` is a \`Stream\` of \`ExExNotification\`. \`try_next\` is async — your handler runs in the same async runtime as Reth. **Reth's progress isn't gated on your indexing speed**, but your handler still observes every event in order.

When Reth shuts down or the channel closes, the loop exits cleanly with \`Ok(())\`.

## Step 5 — The init/run split

A user wants to do *synchronous setup* (open files, init a database, allocate a buffer) before the async loop starts. A single \`async fn\` would force this setup into the future itself, where it can't be reasoned about clearly:

\`\`\`rust
async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    // synchronous setup goes here
    Ok(exex(ctx))  // return the long-running future
}
\`\`\`

Two functions:

- **\`exex_init\`** — runs *once* at node startup. Synchronous setup. Returns a future.
- **\`exex\`** (the future) — runs *forever* (or until shutdown). Polls the notification stream.

> 🛑 **Predict.** Why is the init/run split necessary? What concrete bug would happen if you put file-open inside \`exex\` instead of \`exex_init\`?

Reth needs to *acknowledge* the ExEx is alive before it starts pushing notifications. If you put \`File::open(...)\` inside \`exex\`, the file open happens *after* Reth has already started buffering notifications — and if it fails (permissions, missing path), notifications pile up while Reth thinks the ExEx is healthy. The init/run split lets Reth distinguish "ExEx couldn't start" from "ExEx ran for a while and crashed."

## Step 6 — \`install_exex\`: multiple extensions

Your \`main\` wires the ExEx into the node builder:

\`\`\`rust
.install_exex("MyIndexer", exex_init)
\`\`\`

The first arg is a name (used in metrics and logs); the second is the init function. **You can chain multiple \`.install_exex(...)\` calls** — each ExEx gets its own notification stream and its own \`FinishedHeight\` channel. The pruner aggregates.

## What you've built

Every piece earned its keep:

- **\`ExExNotification\` enum with 3 variants** (Step 2) — handles append, reorg, revert
- **\`FinishedHeight\` event** (Step 3) — opt-in pruning, prevents disk bloat
- **Stream-pulled notifications** (Step 4) — Reth doesn't block on your handler
- **init/run split** (Step 5) — synchronous setup before async loop
- **\`install_exex\`** (Step 6) — multiple extensions, each with its own stream

The next lesson reads the minimal ExEx — \`~40 lines of main.rs\` — and shows how all six pieces fit together in real code.

## Recall before moving on

Without scrolling:

1. Why does the API push notifications via a stream instead of calling your code directly?
2. What are the three \`ExExNotification\` variants, and why do you need all three?
3. What does \`FinishedHeight\` tell Reth, and what's the disk consequence of forgetting it?
4. Why is the API split into \`exex_init\` (sync) and \`exex\` (async future)?

If any answer is shaky, scroll back. The next lesson reads the real minimal ExEx in detail.
`,
                },
                {
                  title: 'Reading the minimal ExEx, line by line',
                  slug: 'reth-exex-walkthrough-en',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 25,
                  content: `# Reading the minimal ExEx, line by line

Last lesson, you built up the API. **Now: see it in real code.** This is the entire \`main.rs\` of [\`paradigmxyz/reth-exex-examples/minimal\`](https://github.com/paradigmxyz/reth-exex-examples/tree/main/minimal) — a working production-shaped ExEx in ~40 lines.

\`\`\`rust
use futures::{Future, TryStreamExt};
use reth_exex::{ExExContext, ExExEvent, ExExNotification};
use reth_node_api::FullNodeComponents;
use reth_node_ethereum::EthereumNode;
use reth_tracing::tracing::info;

async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    Ok(exex(ctx))
}

async fn exex<Node: FullNodeComponents>(mut ctx: ExExContext<Node>) -> eyre::Result<()> {
    while let Some(notification) = ctx.notifications.try_next().await? {
        match &notification {
            ExExNotification::ChainCommitted { new } => {
                info!(committed_chain = ?new.range(), "Received commit");
            }
            ExExNotification::ChainReorged { old, new } => {
                info!(from_chain = ?old.range(), to_chain = ?new.range(), "Received reorg");
            }
            ExExNotification::ChainReverted { old } => {
                info!(reverted_chain = ?old.range(), "Received revert");
            }
        };

        if let Some(committed_chain) = notification.committed_chain() {
            ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
        }
    }

    Ok(())
}

fn main() -> eyre::Result<()> {
    reth::cli::Cli::parse_args().run(|builder, _| async move {
        let handle = builder
            .node(EthereumNode::default())
            .install_exex("Minimal", exex_init)
            .launch_with_debug_capabilities()
            .await?;

        handle.wait_for_node_exit().await
    })
}
\`\`\`

40 lines. Every line maps back to a build-up step from the previous lesson.

## Walk it, line by line

### \`exex_init\` — the init/run split (Step 5)

\`\`\`rust
async fn exex_init<Node: FullNodeComponents>(
    ctx: ExExContext<Node>,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>> {
    Ok(exex(ctx))
}
\`\`\`

\`exex_init\` is called *once* at node startup. Reth passes you \`ExExContext\` (which contains \`notifications\`, \`events\`, and node access). You return a future to be polled forever.

This minimal ExEx does no synchronous setup — it just hands \`ctx\` straight to \`exex\`. **Real ExExes** that need \`File::open(...)\` or \`Database::connect(...)\` would do that work inside \`exex_init\`, *before* returning the future.

> 🔍 **Find in repo.** Open the \`tracking-state\` example. What does its \`exex_init\` do that \`minimal\` doesn't?

### \`exex\` — the long-running future

\`\`\`rust
async fn exex<Node: FullNodeComponents>(mut ctx: ExExContext<Node>) -> eyre::Result<()> {
    while let Some(notification) = ctx.notifications.try_next().await? {
        // ...
    }
    Ok(())
}
\`\`\`

The loop. \`ctx.notifications.try_next()\` is async — when no notification is available, the runtime parks the task and runs other ExExes / Reth itself. Cooperative concurrency, no blocking.

When the channel closes (node shutdown), \`try_next()\` returns \`Ok(None)\`, the \`while let\` exits, and the function returns \`Ok(())\`. Clean termination.

### The three-arm match (Step 2)

\`\`\`rust
match &notification {
    ExExNotification::ChainCommitted { new } => { /* ... */ }
    ExExNotification::ChainReorged { old, new } => { /* ... */ }
    ExExNotification::ChainReverted { old } => { /* ... */ }
};
\`\`\`

This is the load-bearing decision. **All three arms must be present** in any non-toy ExEx, because:

- **Missing \`ChainReorged\`** → your derived state contains the *old* chain's data forever; the new canonical chain's data is missing because you never saw a \`ChainCommitted\` for it.
- **Missing \`ChainReverted\`** → after a reorg-trigger but before Reth picks a new tip, your state is one chain ahead of canonical with no way to roll back.

The minimal ExEx logs each variant; that's instructive but not useful. **Real ExExes update derived state** — and getting all three arms right is what separates a working indexer from a phantom-data bug.

> 🛑 **Anti-fluency.** Read the \`ChainReorged\` arm. The \`old\` and \`new\` chains are both passed. **Why both?** Why not just \`new\` (the post-reorg tip)?

Because the indexer needs to *undo* \`old\`'s state changes before *applying* \`new\`'s. If you only got \`new\`, you'd have no way to roll back the old chain's effect on your derived state — and you'd silently double-count or skip transactions.

### \`committed_chain()\` and \`FinishedHeight\` (Step 3)

\`\`\`rust
if let Some(committed_chain) = notification.committed_chain() {
    ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
}
\`\`\`

Two methods to know:

- **\`notification.committed_chain()\`** — returns \`Some(Chain)\` for \`ChainCommitted\` *and* \`ChainReorged\` (the new chain), \`None\` for \`ChainReverted\`. **It's the "what's the canonical state after this notification" accessor.**
- **\`ctx.events.send(ExExEvent::FinishedHeight(...))\`** — tells Reth's pruner "I've processed up to this block; you can prune below this hash."

**Send \`FinishedHeight\` after every commit-shaped notification.** Forget this and your node accumulates archive data forever (Step 3's disk-bloat scenario from the previous lesson).

> 🔍 **Verify.** Open the source of \`notification.committed_chain()\` in \`reth-exex\`. Confirm the three-cases behavior we just described.

### \`main\`: wiring the ExEx into a node

\`\`\`rust
fn main() -> eyre::Result<()> {
    reth::cli::Cli::parse_args().run(|builder, _| async move {
        let handle = builder
            .node(EthereumNode::default())
            .install_exex("Minimal", exex_init)
            .launch_with_debug_capabilities()
            .await?;

        handle.wait_for_node_exit().await
    })
}
\`\`\`

This is "ordinary Reth node, plus one extension." The \`install_exex("Minimal", exex_init)\` is the only ExEx-specific line. **Stack multiple \`install_exex\` calls** to compose extensions.

## What real ExExes do

The same repo has more substantial examples:

| Example | What it does |
| :--- | :--- |
| \`backfill\` | Replays historical blocks through your handler at startup |
| \`in_memory_state\` | Maintains a custom indexed state derived from each block |
| \`tracking-state\` | Persists ExEx-internal state to a separate DB (so restarts are cheap) |
| \`rollup\` | Implements a minimal rollup using only ExEx hooks |

> 🔍 **Open \`rollup\`.** Read until you find where it commits state changes. **A rollup as an ExEx — sit with that for a moment.** That's the architectural unlock: you don't need to fork Reth to build a rollup; you can build one as an extension.

## Recall before the quiz

Without scrolling:

1. What does \`exex_init\` do that \`exex\` (the future) cannot?
2. Why must a non-toy ExEx handle all three notification variants?
3. What does \`notification.committed_chain()\` return for each of the three variants?
4. What does a "rollup as an ExEx" rely on for finality and data availability?

The next lesson is a quiz. Engage with these recalls now if any answer is shaky.
`,
                },
                {
                  title: 'Quiz: did the ExEx API stick?',
                  slug: 'reth-exex-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 7,
                  duration: 4,
                  xpReward: 25,
                  content: `# Quiz: did the ExEx API stick?

Four questions covering the API design and the failure modes the design prevents. Same rule: **you can't nod past a quiz.**

If you miss two or more, scroll back to *Building the ExEx API* before going on to the drill.`,
                  quizQuestions: [
                    {
                      question: "Why is the ExEx API an init/run split (`exex_init` returns a future) rather than a single `async fn`?",
                      options: [
                        "Rust requires a setup function for `async` traits.",
                        "It's a backwards-compat shim from an older Reth version.",
                        "Init/run lets you do synchronous setup (open files, init DBs) at node startup before the long-running notification loop begins. Reth distinguishes 'ExEx couldn't start' from 'ExEx ran for a while and crashed.'",
                        "Performance — split functions inline better.",
                      ],
                      correctIndex: 2,
                      explanation: "A single `async fn` would force setup into the future itself — making 'ExEx never started' indistinguishable from 'ExEx crashed during the loop.' The init/run split gives Reth a clean acknowledgment moment for 'this extension is alive and ready' before notifications start.",
                    },
                    {
                      question: "You implement an ExEx that only handles `ChainCommitted`, ignoring `ChainReorged` and `ChainReverted`. The chain reorgs 5 blocks deep. What's wrong with your derived state?",
                      options: [
                        "It contains 5 extra blocks that should have been pruned.",
                        "It contains the *old* chain's data (from the segment that's no longer canonical) AND is missing the *new* chain's data (because no `ChainCommitted` fires for replaced segments). Phantom data + missing data simultaneously.",
                        "It crashes with a panic.",
                        "The state is fine; Reth re-emits `ChainCommitted` for the new chain.",
                      ],
                      correctIndex: 1,
                      explanation: "This is the #1 ExEx bug. `ChainReorged` carries both `old` and `new` so the indexer can undo `old`'s effects and apply `new`'s. Ignoring it leaves both halves wrong — old data still indexed, new data never indexed.",
                    },
                    {
                      question: "What does `ctx.events.send(ExExEvent::FinishedHeight(N))` tell Reth?",
                      options: [
                        "'Stop sending me notifications below block N.'",
                        "'I've processed up to block N; you can safely prune historical state below N.' Reth aggregates the minimum across all installed ExExes for its pruning decision.",
                        "'Block N is bad — discard it.'",
                        "'Resume from block N on next restart.'",
                      ],
                      correctIndex: 1,
                      explanation: "Without `FinishedHeight`, Reth can't safely prune anything your ExEx might want to read later — it conservatively keeps everything forever. Forgetting this event turns an 'innocuous indexer' into an accidental archive node.",
                    },
                    {
                      question: "An ExEx-based indexer is faster than a separate process polling the RPC. What's the *primary* architectural reason?",
                      options: [
                        "The indexer runs on a faster CPU.",
                        "Same process, no I/O round trip. The ExEx receives a notification the moment Reth commits a block — no RPC request/response, no polling interval, no atomicity gap. Plus full chain context (including reorg structure) Reth already computed.",
                        "ExEx skips the EVM execution step.",
                        "The RPC has a rate limiter; ExEx doesn't.",
                      ],
                      correctIndex: 1,
                      explanation: "The architectural unlock is colocation. Polling RPC = at best ~1s lag, often more under load, plus reorgs are seen second-hand. ExEx = zero-lag, full context, no IPC.",
                    },
                  ],
                },
                {
                  title: 'Drill: build a reorg-safe indexer',
                  slug: 'reth-exex-drill-en',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 12,
                  xpReward: 25,
                  content: `# Drill: build a reorg-safe indexer

Reading is rehearsal. **Doing is memory.** This drill takes you from "I've read about ExEx" to "I have written one and watched it survive a reorg correctly."

## Setup

\`\`\`bash
git clone https://github.com/paradigmxyz/reth-exex-examples
cd reth-exex-examples/minimal
cargo build
\`\`\`

If the build fails, fix that before proceeding.

## Drill 1 — Run the minimal ExEx against a node

You need an existing Reth node, or run with \`--chain holesky\` for a small testnet (faster initial sync, more frequent reorgs):

\`\`\`bash
cargo run -- node --chain holesky
\`\`\`

> 🛑 **Question (write it down):** What gets logged for the first 10 blocks? Is every log line a \`ChainCommitted\`, or do you see other variants?

For a fresh sync, you'll see \`ChainCommitted\` for every block. \`ChainReorged\` and \`ChainReverted\` are rarer — they require an actual chain disagreement, which holesky generates more often than mainnet (lower hashpower → more contested forks).

## Drill 2 — Add a transaction counter

Modify the \`ChainCommitted\` arm to print transaction count per block:

\`\`\`rust
ExExNotification::ChainCommitted { new } => {
    let total: usize = new.blocks().values()
        .map(|b| b.body.transactions.len())
        .sum();
    info!(committed_chain = ?new.range(), tx_count = total, "Received commit");
}
\`\`\`

> 🛑 **Predict.** Run again. What's the average transaction count per holesky block? Per mainnet block?

Holesky: low — usually 5–20 tx per block, sometimes 0. Mainnet: 100–300, depending on block fullness. **You're now reading real chain data at zero latency.**

## Drill 3 — Add a reorg-safe HashMap

Track how many transactions each address sent. **Survive reorgs correctly** — that's the whole point.

\`\`\`rust
use std::collections::HashMap;
use alloy_primitives::Address;

let mut tx_count: HashMap<Address, u64> = HashMap::new();

while let Some(notification) = ctx.notifications.try_next().await? {
    match &notification {
        ExExNotification::ChainCommitted { new } => {
            for (_, block) in new.blocks() {
                for tx in block.body.transactions() {
                    *tx_count.entry(tx.signer()).or_insert(0) += 1;
                }
            }
        }
        ExExNotification::ChainReorged { old, new } => {
            // Undo old, then apply new — order matters
            for (_, block) in old.blocks() {
                for tx in block.body.transactions() {
                    *tx_count.entry(tx.signer()).or_insert(0) -= 1;
                }
            }
            for (_, block) in new.blocks() {
                for tx in block.body.transactions() {
                    *tx_count.entry(tx.signer()).or_insert(0) += 1;
                }
            }
        }
        ExExNotification::ChainReverted { old } => {
            // Undo old, no replacement yet
            for (_, block) in old.blocks() {
                for tx in block.body.transactions() {
                    *tx_count.entry(tx.signer()).or_insert(0) -= 1;
                }
            }
        }
    };

    if let Some(committed_chain) = notification.committed_chain() {
        ctx.events.send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
    }
}
\`\`\`

(Adjust the API names to your local reth's current shape — \`block.body.transactions()\` vs \`.transactions\`, \`tx.signer()\` vs \`tx.recover_signer()\`. The point is the *structure*, not the exact identifier.)

> 🛑 **Question:** Read the three arms. **What invariant must hold for \`tx_count\` to be correct after any sequence of notifications?**

**For every \`Address\`, the count equals (txs sent on the *canonical* chain) − (txs sent on segments that were committed-then-reverted).** The reorg arm is the trick: it undoes \`old\` *and* applies \`new\` in a single notification, atomically.

If you forget the \`-=\` in \`ChainReverted\`, your counts grow forever. If you forget the \`-=\` in \`ChainReorged\`, your counts represent the union of old and new chains, not just canonical.

## Drill 4 — Verify reorg handling

Holesky generates reorgs occasionally. Run for a few hours.

> 🔍 **Find the reorg.** Search your logs for "Received reorg". When one appears:
>
> 1. Note the \`from_chain\` and \`to_chain\` ranges.
> 2. Spot-check a high-tx address in \`tx_count\` *before* the reorg log line — record its count.
> 3. After the reorg log line — record again.
> 4. Manually verify: did the count change consistently with the difference between the old and new chain segments at that address?

If yes — your indexer is reorg-safe. **You've written the same kind of code production-grade indexers (e.g., goldsky, the graph) ship.**

> 🛑 **Final question:** Why does the *order* of operations in the \`ChainReorged\` arm matter? Specifically: does it matter if you apply \`new\` *before* undoing \`old\`?

It matters in exactly one case: when \`old\` and \`new\` share a common prefix that the runtime helpfully *omits* from both — but if the implementation does include any shared blocks in both, applying \`new\` first would double-count them, then \`old\`'s undo would zero them out. The convention is **undo \`old\` first, then apply \`new\`**, which mirrors the chronological order Reth itself processes the reorg.

## End-of-lesson recall

Without scrolling, in your own words:

1. What's the rationale for handling \`ChainReorged\` with both \`old\` and \`new\` in the same notification?
2. What invariant does the three-arm pattern preserve in your derived state?
3. If you forget \`FinishedHeight\`, what specifically grows on disk over time?
4. What's the one architectural reason an ExEx beats a separate RPC-polling indexer?

After this drill, you've shipped a reorg-safe node-speed indexer. **The same tool now lets you build MEV bots, live risk engines, and rollups.**`,
                },
                {
                  title: 'Reth SDK — building an App-chain',
                  slug: 'reth-sdk-appchain-en',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 12,
                  xpReward: 25,
                  content: `# Reth SDK — building an App-chain

ExEx extends an existing Ethereum node. The Reth SDK lets you build **your own App-chain** in Rust by composing components. This is the lesson where "purpose-built EVM L1" stops being a thesis and starts being a binary you can compile.

> 🛑 **Predict before scrolling.** You're building Tempo (a payments-focused L1). Which Reth components do you need to swap? Which can you keep as-is? Write a list of 3-4 swaps before reading the example.

## A real custom-node main.rs — verbatim

This is from [\`paradigmxyz/reth/examples/custom-node-components/src/main.rs\`](https://github.com/paradigmxyz/reth/tree/main/examples/custom-node-components):

\`\`\`rust
use reth_ethereum::{
    chainspec::ChainSpec,
    cli::interface::Cli,
    evm::primitives::ConfigureEvm,
    node::{
        api::{FullNodeTypes, NodeTypes},
        builder::{components::PoolBuilder, BuilderContext},
        node::EthereumAddOns,
        EthereumNode,
    },
    pool::{
        blobstore::InMemoryBlobStore, CoinbaseTipOrdering, EthTransactionPool, Pool, PoolConfig,
        TransactionValidationTaskExecutor,
    },
    provider::CanonStateSubscriptions,
    EthPrimitives,
};

fn main() {
    Cli::parse_args()
        .run(async move |builder, _| {
            let handle = builder
                .with_types::<EthereumNode>()
                .with_components(EthereumNode::components().pool(CustomPoolBuilder::default()))
                .with_add_ons(EthereumAddOns::default())
                .launch()
                .await?;

            handle.wait_for_node_exit().await
        })
        .unwrap();
}
\`\`\`

That's a working chain binary. ~30 lines.

> 🛑 **Stop. Without scrolling, name the four chained calls** (\`with_types\`, \`with_components\`, \`with_add_ons\`, \`launch\`). What does each one decide? Hold your guess — compare below.

Read the four key calls in the chain:

### \`.with_types::<EthereumNode>()\`
Picks the **type bundle** — chain spec, primitives (block, tx, header types), engine API. \`EthereumNode\` ships defaults; replace with \`OpNode\`, your custom types, or any \`NodeTypes\` impl.

### \`.with_components(...)\`
This is where customization lives. You take the base set (\`EthereumNode::components()\`) and override individual builders:

- \`.pool(CustomPoolBuilder::default())\` — custom transaction pool (the example does this)
- \`.network(...)\` — custom P2P
- \`.payload(...)\` — custom block builder
- \`.executor(...)\` — custom EVM executor (this is where custom opcodes/precompiles plug in)
- \`.consensus(...)\` — custom consensus

> 🛑 **Anti-fluency.** Pick *one* component above. Sketch the trait you'd implement to swap it. (Just the method signatures — no real impl needed.) If you can't, you don't yet "see" the customization point — open the source for that builder before continuing.

### \`.with_add_ons(...)\`
RPC namespaces, engine API extensions, ExEx installations. \`EthereumAddOns::default()\` gives you the standard Ethereum RPC; you can chain \`.install_exex(...)\` here.

### \`.launch()\`
Boots everything: opens MDBX, starts P2P, spawns Tokio tasks for stages, exposes RPC. Returns a \`NodeHandle\` you can \`wait_for_node_exit\` on.

\`\`\`mermaid
flowchart TB
    Builder[Cli builder] --> Types[".with_types EthereumNode"]
    Types --> Comps[".with_components"]
    Comps --> Pool["pool — admission rules"]
    Comps --> Net["network — P2P"]
    Comps --> Exec["executor — EVM, opcodes, gas"]
    Comps --> Cons["consensus — PoS / HyperBFT / etc."]
    Comps --> Payload["payload — block building"]
    Comps --> AddOns[".with_add_ons RPC + ExEx"]
    AddOns --> Launch[".launch — your chain"]
\`\`\`

## What customization unlocks

| Component | What changes |
| :--- | :--- |
| \`with_types\` | block/tx structure, header layout, chain ID semantics |
| \`with_components.executor\` | **EVM** — custom opcodes (lesson 2), custom precompiles (Expert), custom gas |
| \`with_components.consensus\` | PoS → HyperBFT, PoA, Tendermint, anything |
| \`with_components.pool\` | priority lanes (Tempo-style), custom tx admission rules |
| \`with_components.payload\` | custom block-building (e.g., MEV-aware ordering) |
| \`with_components.network\` | private subnets, peer policy |
| \`with_add_ons\` | custom JSON-RPC, ExEx install |

## Production examples in the wild

> 🛑 **Predict before reading.** For each of these chains, **which Reth components do they swap?** Make a guess for all three:
> - **Hyperliquid HyperEVM**
> - **Tempo**
> - **Berachain (bera-reth)**
>
> Then check below.

- **Hyperliquid HyperEVM** — HyperBFT + custom execution + order-book-coupled DB
- **Tempo** — payment-specialized priority lanes
- **Berachain (bera-reth)** — Proof of Liquidity consensus

These all replace one or more \`with_components\` builders with their own. The framework above is what they extend. **Compare to your prediction** — what did you get right? What surprised you?

## Drill

1. Clone \`reth\` and \`cd examples/custom-node-components\`
2. Read \`CustomPoolBuilder\` — see how it implements \`PoolBuilder\` to swap the pool
3. Modify it to **log every transaction's gas price** as it enters the pool
4. \`cargo run\` against a dev chain. Watch your custom log fire.

Now you've shipped a 1-line component swap. Scale this pattern to consensus or executor and you're building HyperEVM-class infra.

> Final check: in one sentence, why is the Reth SDK's component-builder pattern more useful for shipping a purpose-built L1 than forking the entire codebase? If your answer doesn't mention "you only own the parts you change," re-read \`with_components\` — that's the entire architectural idea.

## 📺 Further watching

\`\`\`youtube
cc45Rcmrro4 | The Future of Reth (Frontiers 2025)
\`\`\`
`,
                },
                {
                  title: 'Bridge to Expert — what comes next',
                  slug: 'reth-bridge-to-expert-en',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 10,
                  xpReward: 20,
                  content: `# Bridge to Expert — what comes next

> 🛑 **Gate check.** Before claiming you've finished Advanced, answer these — out loud or on paper, no scrolling back through previous lessons:
>
> 1. What does \`popn_top!\` expand to? Why does it use \`unwrap_unchecked()\` inside \`unsafe\`?
> 2. Why are \`Database\` and \`DatabaseRef\` separate traits? What does the asymmetric \`auto_impl\` list (\`&mut, Box\` vs \`&, &mut, Box, Rc, Arc\`) tell you?
> 3. What does \`ExExEvent::FinishedHeight\` tell Reth's pruner — and what's the disk consequence of forgetting it?
> 4. Why is \`MerkleStage\` *after* hashing, not interleaved?
> 5. To ship a purpose-built L1 like Tempo, which Reth components do you swap?
>
> **Got fewer than 4 right?** Don't continue. Go back to the relevant Advanced lesson. Expert assumes these as fluent vocabulary, not concepts you'll re-look-up.

If you cleared the gate: you've climbed **Alloy → Revm → Reth (Staged Sync, ExEx, custom NodeBuilder)**. You can read the source of all three with intent.

But "reading" is only half. **Expert** crosses from "I can read it" to "I can ship it in production."

## What awaits in Expert

| Lesson | Focus |
| :--- | :--- |
| **Performance engineering** | flamegraph, Criterion, jemalloc, Reth's \`maxperf\` build profile |
| **MDBX storage internals** | Reth's actual \`Database\` / \`DbTx\` / \`DbTxMut\` traits, B+tree mmap, MVCC |
| **Tokio runtime internals** | work-stealing, \`spawn_critical_task\`, panic supervision |
| **Procedural macros** | how \`address!\` and \`sol!\` actually work — the \`fixed_bytes_macros!\` meta-pattern |
| **Custom precompiles** | the real Revm \`identity_run\` + how Foundry's cheatcodes are precompiles |
| **Merkle Patricia Trie** | reth's actual \`AccountProof\` / \`StorageProof\` and verification logic |
| **MEV in practice** | mempool ingest, sol! decoding, Revm forking, ExEx as a private mempool |
| **zkEVM with Revm** | Steel + Risc0 guest source — proving Ethereum execution |
| **Production fork ops** | reth's real \`maxperf\` Cargo profile, systemd, monitoring, diff testing |

## The mindset shift

Advanced taught you the **structures**. Expert teaches you the **decisions** behind them.

> 🛑 **Predict the answers before reading mine.** Have an opinion first — even a wrong one. Engineers shipping infra do.
>
> - *Why* does Reth use MDBX and not RocksDB?
> - *Why* does Revm pop one and write through a reference instead of pop/pop/push?
> - *Why* does \`#[track_caller]\` matter on \`Database::tx()\`?
> - *Why* are Foundry cheatcodes precompiles and not opcodes?

---

Now mine:

- **MDBX vs RocksDB** — read latency under compaction stalls.
- **Pop-one-write-through** — one fewer memory write per ADD opcode.
- **\`#[track_caller]\`** — panic backtrace shows the buggy caller, not the trait method.
- **Cheatcodes as precompiles** — consensus compatibility with vanilla EVM (precompiles are reserved addresses, not new opcodes — your fork still parses mainnet bytecode).

The point isn't that you matched my wording. The point is: did you have an *opinion* before reading? **Once you internalize the *why*, you can defend design choices to a Paradigm engineer or a Hyperliquid validator op — and that's the gate to grant-eligible work.**

## Before you continue

If the Gate check at the top felt easy, jump into Expert.

If any of the five questions sent you back to a previous lesson — re-read them now. Expert is denser. Running the linked code locally as you go is no longer optional.

> The first three months in infra learning are the hardest. Documentation is sparse — **the source code is the textbook**. The Expert tier is where that lesson pays off.`,
                },
                {
                  title: 'Advanced quiz',
                  slug: 'advanced-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 11,
                  duration: 12,
                  xpReward: 35,
                  content: `# Advanced quiz

Final check across Revm internals, ExEx, and the Reth SDK.`,
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
                    {
                      question: "What's the actual advantage of Reth's Staged Sync over block-by-block sync?",
                      options: [
                        'Allows blocks to be downloaded but never executed, saving disk',
                        'Processing in stages over block ranges maximizes I/O, CPU, and cache efficiency — and makes reorgs symmetrical via unwind',
                        'Skips Merkle root computation by deferring it indefinitely',
                        'Removes the database — state is derived on demand at query time',
                      ],
                      correctIndex: 1,
                      explanation: 'Staged Sync (Headers → Bodies → Senders → Execution → Hashing → Merkle → TxLookup → Indexes → Finish) processes ranges per stage. Sender recovery parallelizes via Rayon. Hashing is sorted before MerkleStage runs. And every stage has both `execute` and `unwind` — making reorgs a normal mode of operation, not a special case.',
                    },
                    {
                      question: 'What can you do with ExEx (Execution Extensions)?',
                      options: [
                        'Inject custom logic into the JSON-RPC pipeline before responses are sent',
                        'Run Rust code in-process on every chain commit, reorg, or revert at near-execution-time latency',
                        'Override how transactions are gossiped on the P2P network',
                        "Replace Reth's consensus engine with a custom one",
                      ],
                      correctIndex: 1,
                      explanation: 'ExEx receives ChainCommitted / ChainReorged / ChainReverted notifications in-process — perfect for indexers, MEV pipelines, and real-time risk engines. (RPC customization is via add_ons, network and consensus customization is via with_components — different SDK surfaces.)',
                    },
                    {
                      question: 'Which of these is the realistic customization surface when building an App-chain with the Reth SDK?',
                      options: [
                        'Only the chain ID and gas limit at the genesis level',
                        'Pool, network, payload, executor (EVM), and consensus components — plus RPC and ExEx via add-ons',
                        'Only Stage<Provider> implementations — the rest is locked',
                        'Database tables and indices only — the EVM itself is fixed',
                      ],
                      correctIndex: 1,
                      explanation: 'The SDK exposes `with_components.{pool, network, payload, executor, consensus}` plus `with_add_ons` for RPC and ExEx. Everything from a custom mempool (Tempo-style priority lanes) to a custom consensus (HyperBFT) to a custom EVM (custom opcodes / precompiles) is one builder swap away.',
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
