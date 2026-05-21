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

### Diagrams (Mermaid)

For architectural concepts that don't translate to prose alone — pipelines, sequence-of-calls, dependency trees, state machines — use a fenced ` ```mermaid ` block. The lesson renderer wires these to a Mermaid component with a dark theme matching the site palette.

Guidelines:

- **One diagram per concept**, placed adjacent to the prose explaining it.
- **Avoid `{` and `}` inside node labels** — they're decision-node syntax in Mermaid and break parsing. If you must show code shapes, write `sol! macro` rather than `sol! { ... }`.
- **Wrap labels with special characters in double quotes**: `Types[".with_types EthereumNode"]`.
- **Prefer `flowchart LR` for pipelines** (HeaderStage → BodyStage → ...), `sequenceDiagram` for call flows (Opcode → Interpreter → Database trait), `graph TD` for trees / dependency hierarchies.

Don't add diagrams to Rust-syntax lessons (ownership, lifetimes, async) or pure source walkthroughs — the code itself is the explanation.

### YouTube embeds (Further watching)

For lessons where there's a strong public talk by the maintainer or a Paradigm/Frontiers/Devcon speaker, append a `## 📺 Further watching` (EN) / `## 📺 関連動画` (JA) section at the end of the lesson body and use a `youtube` fenced block:

```
\```youtube
<video_id>[ | <optional title>][ @<start_seconds>]
\```
```

The lesson renderer converts the block into a lazy-loaded thumbnail; the actual iframe only mounts after the user clicks play, so a lesson with three embeds still costs zero requests to Google on first paint.

Guidelines:

- **One video per concept**, ideally the most current talk by the actual maintainer (e.g., Rakita for Revm, Georgios for Reth direction). Multiple videos are fine when they cover different angles (architecture intro + perf deep-dive).
- **Place at the end** of the lesson, never above the source-walking content. The course is source-first; videos are supplementary.
- **Skip when there's no clean fit.** A weak generic tutorial dilutes the section — better empty than diluted.
- **Embed-disabled videos** show a "Video unavailable" iframe; if you spot one in the wild, swap to an alternative or remove the block.

### Bilingual parity

Each lesson exists in EN and JA. When you change one, **change the other** in the same PR. The two should explain the same code with the same depth — translation is not literal; idiomatic Japanese is preferred over word-for-word English transliteration.

---

## Adding or editing lessons

Two workflows depending on the course's pedagogical format.

### Reth stack courses (source-reading)

Lesson content lives in `prisma/seed-reth-{tier}-{lang}.ts`. Each lesson is a Prisma `lesson.create` entry whose `content` field is a Markdown string — edited inline in the seed file.

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

After editing, run `npm run seed:upsert` (preserves user data) or `npx prisma db seed` (full reseed).

### DIY Perp build-along courses (project construction)

The openhl courses (consensus, clob, precompiles, funding, liquidation) use a different pattern. Lesson bodies live in **markdown drafts** under `drafts/`, and the seed files are **auto-generated** by builder scripts. To edit:

1. Edit `drafts/openhl_{l<N>,clob_l<N>,precompiles_l<N>,funding_l<N>,liquidation_l<N>}_{en,ja}.md`. Each draft file wraps the lesson body in a ` ```` markdown ... ```` ` fence; the builder extracts the fenced block.
2. Re-run the builder for that course, e.g.:
   ```bash
   npx tsx .github/scripts/build-openhl-funding-seed.ts
   npx tsx .github/scripts/build-openhl-funding-seed.ts --locale=ja
   ```
3. `npm run seed:upsert` to apply.

Each builder uses three matching fields per lesson — `draftFile`, `h1Marker`, `startSignature` — to find the right fenced block in the draft. If you change the H1 or the opening line of the body, update the matching field in the builder.

Build-along lessons follow a 3-part Goal section convention introduced after extensive UX review:

```markdown
## Goal

Concepts you'll grasp in this lesson:

- **[Concept 1]** — 1-line explanation
- **[Concept 2]** — 1-line explanation

Verification:

```bash
cargo test -p openhl-funding
```

…passes 5 tests (4 from L4 + 1 new proptest).

Specific changes:

- **`src/types.rs`** — adds `MarkPrice`, `IndexPrice`, ...
```

The Goal opens with **semantic learning outcomes**, not mechanical verification — the cargo command moves to a "Verification" subsection. This split was applied across all 4 openhl courses; new build-along lessons should follow the same structure.

### Slugs

`slug` follows `kebab-case-{en,ja}`. **Once a lesson is in production, do not change its slug** — lesson URLs are keyed on slug (`/courses/<course-slug>/lessons/<lesson-slug>`), so renaming breaks every external link, bookmark, and stored localStorage completion record. The CUID `id` regenerates on every full reseed; the slug is the only stable identifier.

### Sort order

`sortOrder` is per-module and starts at 0. When inserting in the middle, you must bump subsequent lessons' `sortOrder` to maintain the sequence.

### Lesson types

- `CONTENT` — Markdown body, optional code samples and Mermaid diagrams
- `CHALLENGE` — Markdown + `starterCode` + `solutionCode` + `hints`. Renders the Monaco editor.
- `QUIZ` — Markdown intro + `quizQuestions` (array of `{question, options, correctIndex, explanation}`). Multiple-choice; passes at 70% correct.

`xpReward` and `duration` exist on lesson rows for legacy reasons but the UI no longer surfaces XP. Set them to anything reasonable (15–30 minutes for `duration`, 20–40 for `xpReward`); they don't affect what learners see.

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
2. Stay at 8–10 lessons per course for source-reading tiers, or 10–15 lessons for build-along projects.
3. Decide the format up front:
   - **Source-reading**: inline markdown in `prisma/seed-reth-<tier>-{en,ja}.ts`. Best for "read this code, understand it" content.
   - **Build-along project**: markdown drafts in `drafts/<project>_l<N>_{en,ja}.md`, builder script under `.github/scripts/build-<project>-seed.ts`, byte-identical reference implementation pinned per lesson via a SHA. Best for "build this from scratch" content.
4. Update `prisma/seed.ts` and `prisma/seed-upsert.ts` to register your new seeder.
5. Update `src/app/api/admin/seed/route.ts` to include it.
6. If the new tier is a *project* category (like DIY Perp) rather than a difficulty tier, add a track key to `src/lib/i18n/{en,ja}.ts` (`courses.categories.<yourTrack>` and `page.tracks.<yourTrack>Desc`) and add a card to `src/app/page.tsx`.

Open an RFC issue first if the new tier touches more than ~15 lessons — coordination saves rework.

Note: any new tier should also be free. RethLab does not gate content behind payment or sign-in.
