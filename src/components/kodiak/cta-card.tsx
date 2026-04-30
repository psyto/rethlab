'use client';

import { ArrowRight, TrendingUp } from 'lucide-react';
import { useLocale } from '@/contexts/locale-context';
import { KODIAK_ENABLED } from '@/lib/kodiak-config';

const KODIAK_URL = 'https://app.hyperliquid.xyz/vaults'; // TODO: replace with actual Kodiak vault URL

interface KodiakCtaCardProps {
  variant?: 'default' | 'completion';
  ctaUrl?: string;
}

export function KodiakCtaCard({
  variant = 'default',
  ctaUrl = KODIAK_URL,
}: KodiakCtaCardProps) {
  const { t } = useLocale();

  if (!KODIAK_ENABLED) return null;

  if (variant === 'completion') {
    const features = t('kodiak.completionFeatures').split(',');
    return (
      <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-fabrknt-gradient">
          <TrendingUp className="h-6 w-6 text-fabrknt-dark" />
        </div>
        <h3 className="mt-3 text-lg font-bold">{t('kodiak.completionTitle')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('kodiak.completionSubtitle')}
        </p>
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          {features.map((feature, i) => (
            <span key={i}>
              {i > 0 && <span className="mr-4">·</span>}
              {feature.trim()}
            </span>
          ))}
        </div>
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-fabrknt-gradient px-6 py-3 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90"
        >
          {t('kodiak.tryKodiak')}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  // Default: compact contextual CTA
  return (
    <div className="my-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fabrknt-gradient">
          <TrendingUp className="h-5 w-5 text-fabrknt-dark" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold">{t('kodiak.ctaTitle')}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('kodiak.ctaSubtitle')}
          </p>
        </div>
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-fabrknt-gradient px-4 py-2 text-xs font-semibold text-fabrknt-dark transition-all hover:opacity-90"
        >
          {t('kodiak.tryKodiak')}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
