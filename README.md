# RethLab — Hardcore Rust Ethereum Developer Training

> A demanding, source-first training program in **Reth, Revm, Alloy, and Foundry**. Built to take you from "I know some Rust" to "I can ship custom EVM infrastructure" — using the same stack Paradigm, Hyperliquid, and Tempo run in production.

Every advanced lesson walks through **actual production source code** — line by line, with the design intent. Bilingual: English + Japanese. A [Fabrknt](https://fabrknt.com) project.

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

---

## What you'll be able to do

After finishing the program, you'll be able to:

- **Read** Reth's stages, Revm's interpreter, and Alloy's procedural macros — and explain *why* they're written that way
- **Extend** Revm with custom opcodes and precompiles (the same mechanism Foundry uses for cheatcodes)
- **Ship** an Execution Extension (ExEx) on top of Reth — a node-speed indexer or MEV-aware service
- **Build** a custom Reth fork with a different EVM config, consensus, or storage layer
- **Apply** for grant work at Monad / Hyperliquid / Paradigm-style infra teams with code samples that prove you understand the stack

This is a serious training program — not a casual tutorial.

## The 4 tiers

| Tier | Focus | Highlight |
| :--- | :--- | :--- |
| **Beginner** (1 course) | Why Rust EVM matters, environment setup | First Rust program, three-pillar overview |
| **Fundamentals** (1 course) | Alloy + EVM internals + **Foundry** | Real `sign_message.rs`, real Provider, real Revm Stack, forge/cast/anvil |
| **Advanced** (1 course) | Revm interpreter, Database trait, Reth Staged Sync, ExEx, Reth SDK | Reading the actual ADD opcode, custom opcodes, NodeBuilder for App-chains |
| **Expert** (1 course) | Performance engineering, MDBX, Tokio internals, procedural macros, custom precompiles, MPT, MEV pipelines, zkEVM, production fork ops | Foundry cheatcodes as precompiles, real Steel zkVM guest, MEV decoding from `op-bridge` |

**Total: 8 courses (4 × EN + JA), 16 modules, 74 lessons.**

---

## Stack

- **Next.js 16** + React 19 + TypeScript
- **Prisma** + PostgreSQL
- **NextAuth v5** (Google & GitHub OAuth, plus dev-mode credentials)
- **Tailwind CSS** + Radix UI
- **Monaco Editor** for in-browser coding challenges
- **Vercel Analytics**

---

## Quick start

```bash
# Install
npm install

# Configure your local Postgres + OAuth
cp .env.example .env
# edit .env with your DATABASE_URL, AUTH_SECRET, OAuth secrets

# Push schema and seed all 74 lessons
npx prisma db push
npx prisma db seed

# Run
npm run dev
```

Then open [http://localhost:3000/rethlab](http://localhost:3000/rethlab) (note the `basePath`).

### What `db seed` does

The seeder lives in `prisma/seed.ts` and pulls from 8 individual tier files (`prisma/seed-reth-{beginner,fundamentals,advanced,expert}-{en,ja}.ts`). It clears all course tables and re-creates 8 courses / 16 modules / 74 lessons in one shot.

### Re-seeding without losing user data

Use the admin endpoint instead:

```bash
curl -X POST "http://localhost:3000/rethlab/api/admin/seed?key=$AUTH_SECRET&mode=add"
```

`mode=add` only adds courses that don't exist yet (preserves user enrollments, XP, streaks).

---

## Repository layout

```
rethlab/
├── prisma/
│   ├── schema.prisma                          # User, Course, Module, Lesson, ...
│   ├── seed.ts                                # Top-level orchestrator
│   ├── seed-reth-beginner-{en,ja}.ts          # 7 lessons each
│   ├── seed-reth-fundamentals-{en,ja}.ts      # 11 lessons each (incl. Foundry)
│   ├── seed-reth-advanced-{en,ja}.ts          # 9 lessons each
│   └── seed-reth-expert-{en,ja}.ts            # 10 lessons each
├── src/
│   ├── app/                                   # Next.js App Router pages
│   │   ├── courses/                           # Course catalog + detail pages
│   │   ├── api/                               # API routes (courses, auth, admin)
│   │   └── ...
│   ├── components/                            # UI components (header, footer, lesson viewer)
│   ├── contexts/                              # Locale context (EN / JA / ZH)
│   ├── lib/                                   # i18n, db, utils, services
│   └── types/                                 # TypeScript types
└── public/                                    # OG image, favicon
```

---

## Languages

- **English** (parity with Japanese)
- **Japanese** (native — original course material was authored in Japanese)
- **Chinese** (UI only; course content in EN/JA)

The `Locale` switcher is in the header. Each lesson has `slug-en` and `slug-ja` siblings.

---

## Contributing

The course content is in `prisma/seed-reth-*-{en,ja}.ts`. Each lesson is a single string of Markdown. To add or modify content:

1. Edit the relevant seed file
2. `npx prisma db seed` (re-seeds everything; or use the admin endpoint with `mode=add` to preserve user data)
3. Refresh the browser

When adding a lesson that references real source code, please use the same shape as existing lessons:

> **real source excerpt (with GitHub deep-link) → line-by-line walkthrough → design intent → drill**

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full lesson-authoring style guide.

---

## License

MIT
