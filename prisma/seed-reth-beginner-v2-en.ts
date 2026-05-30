import { PrismaClient } from '@prisma/client';

export async function seedRethBeginnerV2EN(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'beginner', 'v2'];

  await prisma.course.create({
    data: {
      slug: 'reth-beginner-v2-en',
      title: 'Intro to Reth v2 - Root-First Short Track',
      description:
        'A shorter beginner track that keeps first-principles understanding of Reth, Revm, and Alloy.',
      difficulty: 'BEGINNER',
      duration: 30,
      xpReward: 90,
      track: 'reth-beginner',
      tags,
      isPublished: true,
      sortOrder: 101,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Why the Rust Ethereum Stack (v2)',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Why learn Reth, Revm, and Alloy?',
                  slug: 'why-rust-ethereum-stack-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 20,
                  content: `# Why learn Reth, Revm, and Alloy?

## Question
Why is the Rust Ethereum stack worth learning now?

## Principle (minimal model)
The core advantage is **composability of the EVM stack**.

- **Alloy**: primitives, signing, RPC
- **Revm**: EVM execution engine
- **Reth**: full node implementation

Because these are separate layers, you can use one layer without owning all layers.

## Concrete example
Foundry uses Revm for execution.
That means your dev-tool mental model aligns with production execution internals.

## Failure mode (common misconception)
"Learn Reth because it already dominates market share" is the wrong reason.
The stronger reason is **modularity plus extension surface**.

## Exercise (one prompt)
Map each task to Alloy, Revm, or Reth:
1. Sign and send transactions over RPC
2. Execute EVM bytecode locally
3. Sync blocks and maintain node state

## Summary
- Rust Ethereum is a modular EVM stack.
- Alloy, Revm, and Reth solve different layers.
- Best learning path: Alloy -> Revm -> Reth.`,
                },
                {
                  title: 'Reth, Revm, Alloy - three pillars',
                  slug: 'three-pillars-en',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 20,
                  content: `# Reth, Revm, Alloy - three pillars

## Question
How do we separate these three names so architecture choices become obvious?

## Principle (minimal model)
Use responsibility boundaries.

- **Alloy**: language for talking to Ethereum (types, signing, RPC)
- **Revm**: compute core of EVM execution
- **Reth**: full node that integrates networking and execution

Dependency direction:

\`Reth -> Revm -> Alloy\`

## Concrete example
- "I need faster transaction simulation" belongs to Revm.
- "I need hook points in node execution" belongs to Reth.
- "I need type-safe RPC calls" belongs to Alloy.

## Failure mode (common misconception)
"If I learn Reth, I can ignore Alloy" is incorrect.
In day-to-day work, Alloy is usually the most frequently touched layer.

## Exercise (one prompt)
Classify these tasks into Alloy / Revm / Reth:
- EIP-712 signing
- local EVM simulation
- node sync extension

## Summary
- The three are layered, not competing.
- Responsibility boundaries remove design confusion.
- Starting with Alloy gives the fastest practical ramp.`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
