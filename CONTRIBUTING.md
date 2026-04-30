# Contributing to RethLab

Thanks for the interest. This document covers the **lesson-authoring style** that keeps RethLab cohesive, plus the practical mechanics of contributing.

---

## Lesson style guide

Every lesson — especially Advanced and Expert — should ground its concept in **real, currently-shipping source code**.

### The four-part structure

```
1. Real source excerpt — verbatim, with a GitHub deep-link
2. Line-by-line walkthrough — what each part actually does
3. Design intent — why it's written this way (perf, safety, modularity)
4. Drill — a concrete exercise the learner can do in 15–30 minutes
```

Bad: "The EVM has a stack."
Good: Show the real `Stack` struct from `revm/crates/interpreter/src/interpreter/stack.rs`, link it, walk through `STACK_LIMIT = 1024` and the `popn<const N: usize>()` const-generic optimization, and ask the learner to grep for the underflow check in `push`.

### When to cite real code

- **Beginner / Fundamentals**: keep concept-first; cite real code only where it directly demystifies a Rust idiom (e.g., showing `sign_message.rs` from `alloy-rs/examples`).
- **Advanced**: every lesson should anchor on at least one real source excerpt.
- **Expert**: every lesson should anchor on **multiple** real source excerpts and show how they fit together.

### Source pinning

Lessons reference `main` branch of upstream repos. This is intentional — we want learners to see current code, not a fossilized snapshot. The trade-off is that excerpts may go stale; please flag drift in PRs.

If a lesson cites code that has been refactored upstream, update the lesson with the new code rather than reverting to the stale version.

### Excerpt formatting

Use a fenced ` ```rust ` block, paste the source verbatim. **Do not paraphrase.** If you trim for length, mark with `// ...` and explain what was removed in the walkthrough.

Add a sentence above the block citing the source:

```
From [`crates/interpreter/src/instructions/arithmetic.rs`](https://github.com/bluealloy/revm/blob/main/crates/interpreter/src/instructions/arithmetic.rs):
```

### Bilingual parity

Each lesson exists in EN and JA. When you change one, **change the other** in the same PR. The two should explain the same code with the same depth — translation is not literal; idiomatic Japanese is preferred over word-for-word English transliteration.

---

## Adding or editing lessons

Lesson content lives in `prisma/seed-reth-{tier}-{lang}.ts`. Each lesson is a Prisma `lesson.create` entry whose `content` field is a Markdown string.

```ts
{
  title: 'Reading the interpreter',
  slug: 'revm-interpreter-en',
  type: 'CONTENT',          // CONTENT | CHALLENGE | QUIZ
  sortOrder: 0,
  duration: 15,             // minutes
  xpReward: 30,
  content: `# Reading the interpreter

[Markdown body — supports tables, code blocks, links]
`,
}
```

### Slugs

`slug` follows `kebab-case-{en,ja}`. **Once a lesson is in production, do not change its slug** — it breaks bookmarks and progress tracking.

### Sort order

`sortOrder` is per-module and starts at 0. When inserting in the middle, you must bump subsequent lessons' `sortOrder` to maintain the sequence.

### Lesson types

- `CONTENT` — Markdown body, optional code samples
- `CHALLENGE` — Markdown + `starterCode` + `solutionCode` + `hints`. Renders the Monaco editor.
- `QUIZ` — Markdown intro + `quizQuestions` (array of `{question, options, correctIndex, explanation}`)

---

## Running locally

```bash
npm install
cp .env.example .env       # fill in DATABASE_URL, AUTH_SECRET, OAuth secrets
npx prisma db push
npx prisma db seed
npm run dev
```

URL: [http://localhost:3000/rethlab](http://localhost:3000/rethlab)

### Re-seed during development

```bash
npx prisma db seed         # full reset, drops user data
```

To preserve user data while iterating on content:

```bash
curl -X POST "http://localhost:3000/rethlab/api/admin/seed?key=$AUTH_SECRET&mode=add"
```

---

## PR checklist

- [ ] Lesson follows the four-part structure (where applicable)
- [ ] EN and JA versions both updated
- [ ] Real-code excerpts have GitHub deep-links
- [ ] `slug` not renamed (or, if renamed, justified in PR description)
- [ ] `sortOrder` is consistent within the module
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm test` passes (`prisma/`, `src/lib/services/`)
- [ ] Manual test: re-seeded database renders the lesson correctly in the browser

---

## Issue reports

Helpful issues include:

- **Stale code excerpt**: `lesson <slug>` shows an old version of `<file>` (link the upstream commit that diverged)
- **Translation gap**: EN and JA say different things about the same code
- **Broken link**: a GitHub deep-link 404s after upstream restructured

Less helpful:

- "I don't understand X" without specifying which lesson and which paragraph
- Feature requests without a use case

---

## Authoring an entire new tier

If you're adding a new specialization (e.g., "Parallel EVM" or "Hyperliquid Internals"):

1. Pick lessons that map to **one real codebase or whitepaper** each. Don't write content unanchored to a primary source.
2. Stay at 8–10 lessons per course. More than that and the tier loses focus.
3. Update `prisma/seed.ts` to call your new seeder.
4. Update `src/app/api/admin/seed/route.ts` to include it.
5. Update the home page tracks card count.

Open an RFC issue first if the new tier touches more than ~15 lessons — coordination saves rework.
