import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your RethLab profile — name, settings, and completed courses.',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
