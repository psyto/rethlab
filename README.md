# RethLab — Hardcore Rust Ethereum Developer Training

> A demanding, source-first training program in **Reth, Revm, Alloy, and Foundry**. Hyperliquid runs on a Reth fork. Tempo launched on Reth. Paradigm built and aggressively maintains the whole stack — Reth, Revm, Foundry, Alloy. The Rust EVM stack is having its moment in crypto infrastructure, and the engineers who can read it are still scarce. RethLab takes you from "I know some Rust" to "I can read the source AND ship a real app."

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

## The course catalog

**18 courses split across two pedagogical modes**: source-reading + skill progression (Reth stack, 13 courses), and project build-alongs (DIY Perp, 5 courses).

### Reth stack — source-first courses

| Course | Focus | Highlight |
| :--- | :--- | :--- |
| **Beginner** | Why Rust EVM matters, environment setup | First Rust program, three-pillar overview |
| **Fundamentals** | Alloy + EVM internals + **Foundry** | Real `sign_message.rs`, real Provider, real Revm Stack, forge/cast/anvil |
| **Bridge to Advanced** | EVM at the bytes level (dispatch loop, world state, gas, call frames, reorgs) + intermediate Rust (generics, ?Sized, dyn, Arc, unsafe, macros) | Smooth tutorial bridge for Solidity-native developers — closes the gap before source-walking begins |
| **Reth + Alloy Advanced** | Alloy Provider/Network/Signer at production scale | Reading real `eth_call` paths through Alloy types, custom signer impls |
| **Reth + Revm Advanced** | Revm interpreter and Database trait, line by line | Reading the actual ADD opcode, custom opcodes, the `Database` interface |
| **Advanced** | Reth Staged Sync, ExEx, Reth SDK, NodeBuilder for App-chains | Predict / Find-in-repo / Anti-fluency prompts throughout |
| **Expert** | Performance engineering, MDBX, Tokio internals, procedural macros, custom precompiles, MPT, MEV pipelines, zkEVM, production fork ops, **Reth-based chains** (op-stack, alphanet, Tempo) via the extension pattern | Foundry cheatcodes as precompiles, real Steel zkVM guest, MEV decoding from `op-bridge`, reading op-stack-on-reth and predicting Tempo's node-crate shape |
| **Building with the Stack** | Real-world apps in Rust + Alloy + Revm — the payoff for reading the source | L1: minimal MEV searcher. L2: reorg-aware Postgres indexer via ExEx. L3: custom RPC via `extend_rpc_modules`. L4: wallet backend (signer pool + nonce mgr + replace-on-stuck). L5: EIP-7702 sponsor (Type 4 tx + paymaster). L6: Foundry-style cheatcode (custom precompile + harness). L7: swap aggregator (Revm fork + cross-venue quotes). **L8 Capstone**: frontrun-resistant order router that integrates everything above. L9: cross-client validation harness (validate Revm sims against a production Geth-served provider) |
| **Consensus Engineering** | The L1 architect tier — what reading reth doesn't teach. BFT theory (FLP, 3f+1, safety/liveness), real consensus code (reth's `Consensus` trait, Malachite, bera-reth's Proof-of-Liquidity), wiring custom consensus on Reth, validator economics + slashing | M1: BFT problem, 3 families (PoW/PoS/BFT), Ethereum PoS, HotStuff/HyperBFT. M2: reading reth `Consensus`, Malachite, bera-reth. M3: NodeBuilder wiring, minimal single-leader BFT, validator economics |
| **Cross-Chain Bridges** | The honest accounting of value movement between chains. Trust models, attack history ($2B+ stolen), reading production bridge code (OP Standard, CCIP, Wormhole, IBC), building a minimal light-client-verified bridge on Reth | M1: trust spectrum, light clients (Helios). M2: OP Standard Bridge, Chainlink CCIP, Wormhole + IBC. M3: build a minimal trust-minimized bridge with relayer + light client |
| **Sequencer & Rollup Architecture** | How modern L2s actually work: centralized vs decentralized sequencers, batch posting and DA, fraud proofs vs ZK proofs, reading op-rbuilder, building a minimal sequencer (~300 lines), decentralization paths to shared sequencers | M1: rollup model, batch posting + EIP-4844 blobs. M2: op-rbuilder, fraud proofs (Cannon) vs validity proofs (SP1). M3: build a minimal sequencer + decentralization paths (PoS sets, shared sequencers like Espresso/Astria) |
| **P2P Networking Internals** | The network layer every blockchain depends on. devp2p vs libp2p, peer discovery (Kademlia/ENR), RLPx, eth/68 sub-protocol, reading reth's network crate, custom gossip for MEV/private orderflow/sequencer coordination | M1: P2P fundamentals (devp2p, discv5, eth/68), reading reth's network crate, building custom gossip (MEV-Boost-style on Reth) |
| **Validator Operations** | The operational layer between consensus code and production. Key management (HSM, MPC, threshold signatures), slashing detection/prevention, coordinated hardforks | M1: key management, slashing detection, hot upgrades — the skills that turn working consensus into a production L1 that doesn't lose operators' stake |

### DIY Perp — build your own open-source implementation of Hyperliquid

**Hyperliquid is the largest perpetual DEX by volume, and its entire stack is closed source.** HyperBFT consensus, the HyperCore matching engine, and HyperEVM execution — none of it is published. If you want to read how an L1 like that actually works, line by line, there has been nothing to read.

[`psyto/openhl`](https://github.com/psyto/openhl) is the **open-source implementation of Hyperliquid** (a reference implementation, not THE Hyperliquid): a Rust workspace that wires real Reth (EVM execution) into real Malachite (BFT consensus) and adds three pure state-machine subsystems on top — a CLOB matching engine, funding/oracle/liquidation, and a protocol-native vault primitive. The CL/EL boundary is exactly four messages (`build_payload`, `payload_ready`, `validate_payload`, `commit`); the state machines are I/O-free and deterministic, validated by proptest at microseconds per case. See the [openhl architecture doc](https://github.com/psyto/openhl/blob/main/docs/architecture.md) for the full design.

The DIY Perp track in rethlab is the **build-along course series** for openhl. You start from `cargo init` on an empty directory and reach a runnable open-source implementation of Hyperliquid over four courses, with openhl as the byte-identical answer key — each lesson pins to a specific openhl commit SHA and ends with `git diff` against that revision as the verification step.

| rethlab course | openhl module | Lessons | What you ship + highlight |
| :--- | :--- | :--- | :--- |
| **Build OpenHL — Consensus** | Module 1: Consensus substrate | 16 | Real Reth (EVM) + real Malachite (BFT) producing blocks end-to-end. Final lesson: `cargo test first_block_via_engine_actors` runs a single-validator round in ~0.02 s against code you wrote yourself |
| **Build OpenHL — CLOB** | Module 2: CLOB matching engine | 13 | Pure-state price-time-priority matching engine. Bridge integration pushes fills through `LiveRethEvmBridge::build_payload` into consensus-committed payloads |
| **Build OpenHL — Precompiles** | Module 3: Core ↔ EVM precompiles | 12 | Smart contracts read CLOB state and place orders via custom EVM precompiles at `0x...0c1b` (read) and `0x...0c1c` (write). The `EvmFactory` "swap one slot" pattern, process-global `CLOB_STATE`, fill-sink routing back to the bridge |
| **Build OpenHL — Funding** | Module 4 (partial): Funding state machine | 12 | Deterministic fixed-point funding math (`RATE_SCALE = 1e9` parts-per-billion) gated by an interval clock with no-catch-up semantics. Saturate-not-panic philosophy, balanced-book zero-sum proptest |
| **Build OpenHL — Liquidation** | Module 4 (partial): Liquidation engine | 8 (Stage 10a) | Pure-compute margin engine with 4-state classification (Safe / AtRisk / Liquidatable / Underwater) and the leveraged-regime non-monotonicity discovery: write the proptest, watch it fail, trace the failure, refine with `prop_assume!`. Stage 10a [shipped in openhl](https://github.com/psyto/openhl/commit/22eedf9). Lessons for Stage 10b (insurance fund) and 10c (multi-account scanner) will land when those openhl sub-stages do. |

Module 4 oracle integration and Module 5 vault primitive are still openhl work-in-progress — the matching rethlab courses land when the reference code does.

**Total: 18 courses (× EN + JA), 54 modules, 212 lessons per locale (424 lesson records in DB).**

All courses are free. Reading every lesson works without an account. Anonymous visitors get **browser-local completion tracking** (lesson checkmarks + per-course progress bars persisted in `localStorage`); sign-in adds cross-device sync, XP, and a profile page.

---

## Stack

- **Next.js 16** + React 19 + TypeScript (App Router, deployed at `rethlab.fabrknt.com`)
- **Prisma** + PostgreSQL
- **NextAuth v5** (Google & GitHub OAuth, plus dev-mode credentials) — anonymous-first; sign-in is optional
- **Tailwind CSS** + Radix UI
- **react-markdown** + remark-gfm + rehype-highlight + **Mermaid** for lesson rendering, plus a lazy YouTube embed (thumbnail only — the iframe and Google's tracking JS load only after the user clicks play)
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

# Push schema and seed all courses
npx prisma db push
npx prisma db seed

# Run
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### What `db seed` does

The seeder lives in `prisma/seed.ts` and pulls from 18 generated course files (`prisma/seed-reth-*-{en,ja}.ts`). It clears all course tables and re-creates 18 courses / 54 modules / 212 lessons per locale (424 lesson records combined) in one shot.

Two pedagogical formats live in those seeds:

- **Reth stack courses** — markdown bodies are inlined directly in `prisma/seed-reth-{beginner,fundamentals,...}-{en,ja}.ts`. Edit those files to update lesson content.
- **DIY Perp build-along courses** — markdown bodies live in `drafts/openhl_{consensus,clob,precompiles,funding,liquidation}_l<N>_{en,ja}.md`. The `prisma/seed-reth-openhl-*-{en,ja}.ts` files are **auto-generated** from those drafts by builder scripts under `.github/scripts/build-openhl-*-seed.ts`. To edit a build-along lesson, edit the markdown draft and re-run the relevant builder.

Lesson URLs key on the **slug** (stable across reseeds), not the database CUID, so a full reseed never breaks shared links.

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
│   ├── seed-upsert.ts                         # Upsert-by-slug (preserves user data)
│   ├── seed-reth-beginner-{en,ja}.ts          # Reth stack courses — markdown
│   ├── seed-reth-fundamentals-{en,ja}.ts      #   bodies inlined directly here.
│   ├── seed-reth-{bridge-to-advanced,alloy-advanced,revm-advanced,
│   │              advanced,expert,building,consensus-engineering,
│   │              cross-chain-bridges,sequencer-rollup,p2p-networking,
│   │              validator-ops}-{en,ja}.ts
│   └── seed-reth-openhl-{consensus,clob,precompiles,funding,liquidation}-{en,ja}.ts
│                                              # DIY Perp courses — auto-generated
│                                              # from drafts/ by .github/scripts/
├── drafts/
│   └── openhl_{l<N>,clob_l<N>,precompiles_l<N>,funding_l<N>,liquidation_l<N>}_{en,ja}.md
│                                              # Build-along lesson markdown drafts.
│                                              # Edit these, then re-run the builder.
├── .github/
│   └── scripts/
│       ├── build-openhl-seed.ts               # Build seed-reth-openhl-consensus
│       ├── build-openhl-clob-seed.ts          # Build seed-reth-openhl-clob
│       ├── build-openhl-precompiles-seed.ts
│       ├── build-openhl-funding-seed.ts
│       └── build-openhl-liquidation-seed.ts
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

Lesson URLs are slug-based (`/courses/<course-slug>/lessons/<lesson-slug>`) and stay valid across content updates, so a link posted today still resolves after the next reseed.

---

## Contributing

Two workflows depending on which kind of course you're editing:

**Reth stack courses** — markdown bodies are inlined in `prisma/seed-reth-*-{en,ja}.ts`. To add or modify content:

1. Edit the relevant seed file directly
2. `npm run seed:upsert` (preserves user enrollments and progress; safe for content updates after launch)
3. Refresh the browser

When adding a lesson that references real source code, please use the same shape as existing lessons:

> **real source excerpt (with GitHub deep-link) → line-by-line walkthrough → design intent → drill**

**DIY Perp build-along courses** — lesson bodies live in `drafts/openhl_*_{en,ja}.md`; the `prisma/seed-reth-openhl-*-{en,ja}.ts` files are auto-generated. To add or modify content:

1. Edit the markdown draft in `drafts/`
2. Re-run the builder, e.g. `npx tsx .github/scripts/build-openhl-funding-seed.ts --locale=ja`
3. `npm run seed:upsert`

### Draft safety policy

- `drafts/` is an editorial source directory, not a runtime content source.
- Production/runtime code must read from database content seeded by `prisma/seed-reth-*.ts`.
- Guardrails:
  - `npm run check:runtime-no-drafts` verifies runtime code does not reference `drafts/`.
  - `npm run check:generated-seeds-clean` verifies generated seed files are in sync with drafts.
4. Refresh the browser

Build-along lessons follow a different structure than source-reading lessons:

> **Goal (concepts you'll grasp + verification + specific changes) → Recap → Plan → Walk-through → Test → Design reflection → Answer key (diff against openhl reference SHA) → Common questions**

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full lesson-authoring style guide for both workflows.

---

## License

RethLab uses a **dual-license** split to keep the platform open while protecting
the lesson content:

- **Platform code** (Next.js app, React components, Prisma schema, API routes,
  build config — everything except the lesson bodies) — **MIT License**. See
  [LICENSE](LICENSE).
- **Lesson content** (markdown bodies inside `prisma/seed-reth-*.ts`, quiz
  questions, course / module / lesson structure) — **Creative Commons
  Attribution-NonCommercial-ShareAlike 4.0** (CC BY-NC-SA 4.0). See
  [LICENSE-CONTENT](LICENSE-CONTENT).

In plain language:

- Anyone can fork the **platform** and build their own thing with it (commercial
  or otherwise). It's just a Next.js + Prisma reference.
- Anyone can **read, share, translate, and remix** the lessons — for free,
  forever — as long as they credit RethLab and don't use them commercially. No
  reposting under a different license, no paid courses built on top of this
  content.

If you want to use the lesson content for something the license doesn't clearly
cover (corporate training, conference workshop, a derived non-commercial project
that needs different terms), open an issue and let's talk.
