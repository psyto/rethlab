import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Signals',
  description: 'Real-time signals dashboard.',
};

export default function SignalsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
