import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'RethLab teaches Hardcore Rust Ethereum System Engineering with Building OpenHL as the flagship path: an inspired-by-Hyperliquid, learning-oriented reference implementation (unofficial, non-compatible), now part of the rdk (Reth DeFi Kit) monorepo alongside princeps.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
