import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Courses',
  description:
    'Browse the RethLab course catalog — source-first Rust Ethereum training with Step 0–6 build-along modules (Perp Primer to ADL), plus deep dives across Reth, Revm, Alloy, and Foundry.',
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
