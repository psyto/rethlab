import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'RethLab is a Fabrknt project — a tiered learning path through the Rust Ethereum stack: Reth, Revm, and Alloy.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
