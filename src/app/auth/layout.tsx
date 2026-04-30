import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Fabrknt Learn to track your progress and unlock advanced courses.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
