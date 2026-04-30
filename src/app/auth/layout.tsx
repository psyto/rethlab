import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to RethLab to track your progress through the Rust Ethereum curriculum.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
