# RethLab — Master Reth, Revm, and Alloy

A tiered learning path through the Rust Ethereum stack — from beginner Rust scripts that talk to a node, through the EVM internals that power Revm, to ExEx and custom Reth nodes. Self-paced courses in English and Japanese.

A [Fabrknt](https://fabrknt.com) project.

## Stack

- **Next.js 16** + React 19 + TypeScript
- **Prisma** + PostgreSQL
- **NextAuth v5** (Google & GitHub OAuth)
- **Tailwind CSS** + Radix UI
- **Monaco Editor** for coding challenges
- **Vercel Analytics**

## Getting Started

```bash
npm install
cp .env.example .env  # Configure your database and OAuth credentials
npx prisma db push
npx prisma db seed
npm run dev
```

## Tracks

- **Beginner** — Why the Rust Ethereum stack matters, your first Alloy script, environment setup
- **Fundamentals** — Alloy types, signing, providers, EVM concepts (stack, memory, opcodes), Revm intro
- **Advanced** — Revm interpreter internals, custom opcodes, the `Database` trait, Reth Staged Sync, ExEx

## Languages

- English
- Japanese (native)

## License

MIT
