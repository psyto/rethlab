'use client';

import Link from 'next/link';
import { Heart, ArrowRight, Twitter } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocale } from '@/contexts/locale-context';

export default function DonateThanksPage() {
  const { t } = useLocale();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-6 text-2xl font-bold sm:text-3xl">
          {t('donate.thanks.title')}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('donate.thanks.body')}
        </p>
        <Link
          href="/courses"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-fabrknt-gradient px-6 py-3 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90"
        >
          {t('donate.thanks.cta')}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div className="mt-6">
          <button
            onClick={() => {
              const url = typeof window !== 'undefined' ? `${window.location.origin}/rethlab` : '';
              const text = t('share.donateThanksText');
              const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
              window.open(tweetUrl, '_blank', 'noopener,noreferrer');
            }}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <Twitter className="h-3.5 w-3.5" />
            {t('share.onX')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
