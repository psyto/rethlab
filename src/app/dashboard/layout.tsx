import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View your learning progress, XP, level, and streaks on Fabrknt Learn.',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
