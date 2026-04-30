'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Heart, Github, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocale } from '@/contexts/locale-context';

const PRESETS = [5, 10, 25, 50] as const;

const GITHUB_SPONSORS_URL =
  process.env.NEXT_PUBLIC_GITHUB_SPONSORS_URL ?? 'https://github.com/sponsors/psyto';

export default function DonatePage() {
  const { t } = useLocale();
  const [selected, setSelected] = useState<number | 'custom'>(10);
  const [customAmount, setCustomAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAmount =
    selected === 'custom' ? Number(customAmount) : (selected as number);

  const handleCheckout = async () => {
    if (!Number.isFinite(effectiveAmount) || effectiveAmount < 1) {
      setError(t('donate.errors.minAmount'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/rethlab/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amountUsd: effectiveAmount }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || t('donate.errors.generic'));
        setSubmitting(false);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      setError(t('donate.errors.generic'));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('errors.backHome')}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-xs text-muted-foreground">
          <Heart className="h-3 w-3 text-primary" />
          {t('donate.tag')}
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t('donate.title')}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {t('donate.subtitle')}
        </p>
      </motion.div>

      {/* GitHub Sponsors — recurring */}
      <motion.div
        className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
            <Github className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t('donate.recurring.title')}</h2>
            <p className="text-xs text-muted-foreground">{t('donate.recurring.note')}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {t('donate.recurring.body')}
        </p>
        <a
          href={GITHUB_SPONSORS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80 sm:w-auto"
        >
          <Github className="h-4 w-4" />
          {t('donate.recurring.cta')}
          <ArrowRight className="h-4 w-4" />
        </a>
      </motion.div>

      {/* One-time via Stripe */}
      <motion.div
        className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t('donate.oneTime.title')}</h2>
            <p className="text-xs text-muted-foreground">
              {t('donate.oneTime.note')}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRESETS.map((amount) => {
            const active = selected === amount;
            return (
              <button
                key={amount}
                type="button"
                onClick={() => setSelected(amount)}
                className={`rounded-xl border px-4 py-3 text-center font-mono text-sm font-semibold transition-all ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/40'
                }`}
              >
                ${amount}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <label
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
              selected === 'custom'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background'
            }`}
          >
            <input
              type="radio"
              name="amount"
              checked={selected === 'custom'}
              onChange={() => setSelected('custom')}
              className="h-3.5 w-3.5 accent-primary"
            />
            <span className="text-sm text-muted-foreground">
              {t('donate.oneTime.custom')}
            </span>
            <div className="ml-auto flex items-center gap-1 font-mono text-sm">
              <span className="text-muted-foreground">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                placeholder="100"
                value={customAmount}
                onFocus={() => setSelected('custom')}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-24 rounded-md border border-border bg-card px-2 py-1 text-right text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </label>
        </div>

        {error && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleCheckout}
          disabled={submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fabrknt-gradient px-6 py-3 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Heart className="h-4 w-4" />
              {t('donate.oneTime.cta')} ${effectiveAmount || ''}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t('donate.oneTime.poweredBy')}
        </p>
      </motion.div>

      {/* Where the money goes */}
      <motion.div
        className="mt-6 rounded-xl border border-border bg-card/60 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <h3 className="text-sm font-semibold">{t('donate.use.title')}</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· {t('donate.use.item1')}</li>
          <li>· {t('donate.use.item2')}</li>
          <li>· {t('donate.use.item3')}</li>
        </ul>
      </motion.div>
    </div>
  );
}
