import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Courses',
  description:
    'Browse the RethLab course catalog — Beginner, Fundamentals, and Advanced tiers covering Reth, Revm, and Alloy in English and Japanese.',
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
