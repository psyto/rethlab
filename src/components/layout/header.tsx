'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useLocale } from '@/contexts/locale-context';
import { type Locale, localeNames } from '@/lib/i18n';
import { Globe, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'RethLab', active: true },
];

export function Header() {
  const { data: session } = useSession();
  const { t, locale, setLocale } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="https://fabrknt.com" className="text-lg font-bold tracking-tight text-foreground">
          Fabrknt
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {NAV_LINKS.map((link) =>
            link.active ? (
              <Link
                key={link.label}
                href={link.href}
                className="text-foreground font-medium"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            )
          )}

          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              aria-label={t('settings.preferences.language')}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span>{locale.toUpperCase()}</span>
            </button>
            {langMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-36 rounded-lg border border-border bg-card p-1 shadow-lg">
                  {(Object.entries(localeNames) as [Locale, string][]).map(([key, name]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setLocale(key);
                        setLangMenuOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors',
                        locale === key
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* User */}
          {session ? (
            <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User avatar'}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </Link>
          ) : (
            <Link
              href="/auth/signin"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('common.signIn')}
            </Link>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? t('common.closeMenu') : t('common.openMenu')}
          className="text-muted-foreground hover:text-foreground md:hidden"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-border md:hidden">
          <nav className="mx-auto max-w-6xl px-6 py-3 space-y-1">
            {NAV_LINKS.map((link) =>
              link.active ? (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm text-foreground font-medium"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              )
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
