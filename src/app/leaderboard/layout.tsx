import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Top RethLab learners ranked by XP across the Rust Ethereum curriculum.',
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
