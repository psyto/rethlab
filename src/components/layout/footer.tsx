'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLocale } from '@/contexts/locale-context';

export function Footer() {
  const { t } = useLocale();
  const { data: session } = useSession();

  return (
    <footer className="border-t border-border mt-12">
      <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          {t('footer.builtBy')}
        </span>
        <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap justify-center md:justify-end">
          <Link href="/courses" className="hover:text-foreground transition-colors">{t('nav.courses')}</Link>
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          <Link href="/donate" className="hover:text-foreground transition-colors">Sponsor</Link>
          <a href="https://fabrknt.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Sandboxes</a>
          <a href="https://github.com/psyto/failsafe" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Failsafe</a>
          <a href="https://github.com/psyto/rethlab" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          <a href="https://x.com/psyto" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">X</a>
          {!session && (
            <Link href="/auth/signin" className="hover:text-foreground transition-colors">{t('common.signIn')}</Link>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-6">
        <p className="text-center text-[10px] text-muted-foreground/60">
          {t('footer.disclaimer')}
        </p>
      </div>
    </footer>
  );
}
