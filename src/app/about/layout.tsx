import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'RethLab teaches Rust Ethereum Systems Engineering — Reth, Revm, and Alloy treated as the database, distributed system, compiler, networking stack, and concurrency runtime that they actually are. 4 tiers, 13 courses, EN + JA. Built by @psyto.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
