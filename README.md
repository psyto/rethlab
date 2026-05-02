# RethLab — Hardcore Rust Ethereum Developer Training

> A demanding, source-first training program in **Reth, Revm, Alloy, and Foundry**. The new wave of EVM is **purpose-built L1s** — Hyperliquid for perps, Tempo for payments, Base for the consumer L2 — and they all run on this Rust stack. RethLab takes you from "I know some Rust" to "I can ship the next one."

Every advanced lesson walks through **actual production source code** — line by line, with the design intent. Bilingual: English + Japanese. Free and open. Built by [@psyto](https://github.com/psyto).

---

## What makes this different

Most EVM tutorials describe what's happening. The kind of engineers Paradigm, Hyperliquid, and Monad hire have **actually read the source**. RethLab closes that gap by walking you through the actual code that runs Ethereum — line by line:

- Real **`add` opcode** from [`bluealloy/revm`](https://github.com/bluealloy/revm/blob/main/crates/interpreter/src/instructions/arithmetic.rs), with the `popn_top!` and `gas!` macros explained
- Real **`Database` trait** from [`revm/database/interface`](https://github.com/bluealloy/revm/blob/main/crates/database/interface/src/lib.rs)
- Real **`Stage` trait** from [`reth/crates/stages/api`](https://github.com/paradigmxyz/reth/blob/main/crates/stages/api/src/stage.rs)
- Real **ExEx example** from [`reth-exex-examples/minimal`](https://github.com/paradigmxyz/reth-exex-examples/tree/main/minimal)
- Real **NodeBuilder** from [`reth/examples/custom-node-components`](https://github.com/paradigmxyz/reth/tree/main/examples/custom-node-components)
- Real **AccountProof / StorageProof** from [`reth/crates/trie/common`](https://github.com/paradigmxyz/reth/blob/main/crates/trie/common/src/proofs.rs)
- Real **Foundry cheatcode address** (`0x7109...`) and how it's a custom Revm precompile
- Real **Steel + Risc0 zkEVM guest** from [`boundless-xyz/steel`](https://github.com/boundless-xyz/steel)

Each lesson follows the structure: **real source excerpt → line-by-line walkthrough → design intent → drill**. By the time you open a Reth crate, you've already seen its key code.

Architectural concepts (Reth Staged Sync, Revm Database trait, ExEx pipeline, MPT, zkVM proof flow, etc.) come with **Mermaid diagrams** rendered alongside the prose so the structural shape is visible, not just described.

---

## What you'll be able to do

After finishing the program, you'll be able to:

- **Read** Reth's stages, Revm's interpreter, and Alloy's procedural macros — and explain *why* they're written that way
- **Extend** Revm with custom opcodes and precompiles (the same mechanism Foundry uses for cheatcodes)
- **Ship** an Execution Extension (ExEx) on top of Reth — a node-speed indexer or MEV-aware service
- **Build** a custom Reth fork with a different EVM config, consensus, or storage layer
- **Apply** for grant work at Monad / Hyperliquid / Paradigm-style infra teams with code samples that prove you understand the stack

This is a serious training program — not a casual tutorial.

## The 5 courses

| Course | Focus | Highlight |
| :--- | :--- | :--- |
| **Beginner** | Why Rust EVM matters, environment setup | First Rust program, three-pillar overview |
| **Fundamentals** | Alloy + EVM internals + **Foundry** | Real `sign_message.rs`, real Provider, real Revm Stack, forge/cast/anvil |
| **Bridge to Advanced** | EVM at the bytes level (dispatch loop, world state, gas, call frames, reorgs) + intermediate Rust (generics, ?Sized, dyn, Arc, unsafe, macros) | Smooth tutorial bridge for Solidity-native developers — closes the gap before source-walking begins |
| **Advanced** | Revm interpreter, Database trait, Reth Staged Sync, ExEx, Reth SDK | Reading the actual ADD opcode, custom opcodes, NodeBuilder for App-chains. Active-learning style — Predict / Find-in-repo / Anti-fluency prompts throughout |
| **Expert** | Performance engineering, MDBX, Tokio internals, procedural macros, custom precompiles, MPT, MEV pipelines, zkEVM, production fork ops | Foundry cheatcodes as precompiles, real Steel zkVM guest, MEV decoding from `op-bridge` |

**Total: 10 courses (5 × EN + JA), 18 modules, 90 lessons.**

All courses are free. Reading every lesson works without an account; sign-in only enables progress tracking and shows up on the user's profile page.

---

## Stack

- **Next.js 16** + React 19 + TypeScript (App Router, deployed at `rethlab.fabrknt.com`)
- **Prisma** + PostgreSQL
- **NextAuth v5** (Google & GitHub OAuth, plus dev-mode credentials) — anonymous-first; sign-in is optional
- **Tailwind CSS** + Radix UI
- **react-markdown** + remark-gfm + rehype-highlight + **Mermaid** for lesson rendering
- **Stripe** for one-time donations; **GitHub Sponsors** link for recurring support
- **Vercel Analytics**

---

## Quick start

```bash
# Install
npm install

# Configure your local Postgres + OAuth
cp .env.example .env
# edit .env with DATABASE_URL, AUTH_SECRET, OAuth secrets,
# STRIPE_SECRET_KEY (test key OK for dev), and
# NEXT_PUBLIC_GITHUB_SPONSORS_URL

# Push schema and seed all 90 lessons
npx prisma db push
npx prisma db seed

# Run
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### What `db seed` does

The seeder lives in `prisma/seed.ts` and pulls from 10 individual course files (`prisma/seed-reth-{beginner,fundamentals,bridge-to-advanced,advanced,expert}-{en,ja}.ts`). It clears all course tables and re-creates 10 courses / 18 modules / 90 lessons in one shot.

### Re-seeding without losing user data

Use the admin endpoint instead:

```bash
curl -X POST "http://localhost:3000/api/admin/seed?key=$AUTH_SECRET&mode=add"
```

`mode=add` only adds courses that don't exist yet (preserves user enrollments and lesson-completion progress).

---

## Repository layout

```
rethlab/
├── prisma/
│   ├── schema.prisma                          # User, Course, Module, Lesson, ...
│   ├── seed.ts                                # Top-level orchestrator
│   ├── seed-reth-beginner-{en,ja}.ts          # 7 lessons each
│   ├── seed-reth-fundamentals-{en,ja}.ts      # 11 lessons each (incl. Foundry)
│   ├── seed-reth-bridge-to-advanced-{en,ja}.ts # 7 lessons each
│   ├── seed-reth-advanced-{en,ja}.ts          # 10 lessons each (incl. orientation)
│   └── seed-reth-expert-{en,ja}.ts            # 10 lessons each
├── src/
│   ├── app/                                   # Next.js App Router pages
│   │   ├── courses/                           # Course catalog + detail + lesson pages
│   │   ├── donate/                            # Donation page + thanks/cancel
│   │   ├── about/                             # About + Support section
│   │   ├── api/                               # API routes (courses, auth, checkout, admin)
│   │   └── ...
│   ├── components/
│   │   ├── lesson/                            # LessonMarkdown + MermaidDiagram
│   │   ├── quiz/                              # QuizPlayer
│   │   ├── layout/                            # Header + Footer
│   │   └── ...
│   ├── contexts/                              # Locale context (EN / JA)
│   ├── lib/                                   # i18n, db, stripe, services
│   └── types/                                 # TypeScript types
└── public/                                    # OG image, favicon
```

---

## Languages

- **English** (parity with Japanese)
- **Japanese** (native — original course material was authored in Japanese)

The `Locale` switcher is in the header. Each lesson has `slug-en` and `slug-ja` siblings.

---

## Monetization

RethLab is free and open. Two voluntary support paths:

- **GitHub Sponsors** — recurring monthly support. URL is configured via `NEXT_PUBLIC_GITHUB_SPONSORS_URL` (defaults to `https://github.com/sponsors/psyto`).
- **Stripe Checkout** — one-time donations on `/donate`. Requires `STRIPE_SECRET_KEY` to enable; test keys (`sk_test_...`) work for development.

Both surfaces are presented post-value (after a quiz pass, on course completion, on the About page); no content is paywalled.

---

## Sharing

Lesson and completion screens include a one-click "Share on X" button that opens a Twitter intent prefilled with the page URL. The OG card is the real ADD opcode in a terminal-style frame, so a posted link previews as a code excerpt rather than generic marketing.

---

## Contributing

The course content is in `prisma/seed-reth-*-{en,ja}.ts`. Each lesson is a single string of Markdown (with optional Mermaid blocks). To add or modify content:

1. Edit the relevant seed file
2. `npx prisma db seed` (re-seeds everything; or use the admin endpoint with `mode=add` to preserve user data)
3. Refresh the browser

When adding a lesson that references real source code, please use the same shape as existing lessons:

> **real source excerpt (with GitHub deep-link) → line-by-line walkthrough → design intent → drill**

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full lesson-authoring style guide, including Mermaid diagram conventions.

---

## License

MIT
