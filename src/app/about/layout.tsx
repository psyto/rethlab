import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'RethLab teaches Hardcore Rust Ethereum System Engineering with Building OpenHL as the flagship path: an inspired-by-Hyperliquid, learning-oriented reference implementation (unofficial, non-compatible).',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
