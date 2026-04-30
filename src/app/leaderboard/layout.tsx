import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Top Fabrknt Learn learners ranked by XP. See who is mastering perpetual DEX trading.',
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
