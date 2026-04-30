'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './providers/session-provider';
import { LocaleProvider } from '@/contexts/locale-context';
import { queryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {

  return (
    <AuthProvider>
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
