import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your RethLab profile — achievements, completed courses, and skills.',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
