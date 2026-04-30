'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import { ArrowLeft, Shield, Brain, BarChart3, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function AboutPage() {
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('errors.backHome')}
      </Link>

      <motion.div {...fadeIn}>
        <h1 className="text-3xl font-bold">{t('about.title')}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {t('about.subtitle')}
        </p>
      </motion.div>

      {/* Builder profile */}
      <motion.div
        className="mt-10 rounded-2xl border border-border bg-card p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-fabrknt-gradient text-2xl font-bold text-white">
            P
          </div>
          <div>
            <h2 className="text-xl font-bold">psyto</h2>
            <p className="text-sm text-muted-foreground">@psyto</p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          {t('about.bio')}
        </p>

        {/* Background highlights */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            { icon: Shield, label: t('about.background.tradfi'), value: t('about.background.tradfiDetail') },
            { icon: Brain, label: t('about.background.blockchain'), value: t('about.background.blockchainDetail') },
            { icon: BarChart3, label: t('about.background.vaults'), value: t('about.background.vaultsDetail') },
            { icon: Globe, label: t('about.background.multilingual'), value: t('about.background.multilingualDetail') },
          ].map((item, i) => (
            <div key={i} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Why this stack */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-bold">{t('about.tech.title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('about.tech.subtitle')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            t('about.tech.signal'),
            t('about.tech.regime'),
            t('about.tech.crossvenue'),
            t('about.tech.liquidation'),
            t('about.tech.tilt'),
            t('about.tech.hyperlend'),
          ].map((feature, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-background p-3">
              <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <p className="text-xs text-muted-foreground">{feature}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* The Insight */}
      <motion.div
        className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
      >
        <p className="text-sm font-semibold text-primary">{t('page.about.insightTitle')}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('page.about.insightDesc')}
        </p>
      </motion.div>

      {/* What's Next */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-xl font-bold">{t('page.about.whatsNext')}</h2>
        <div className="mt-4 space-y-3">
          {[
            { label: t('page.about.moreContent'), detail: t('page.about.moreContentDesc') },
            { label: t('page.about.multiLanguage'), detail: t('page.about.multiLanguageDesc') },
            { label: t('page.about.moreCourses'), detail: t('page.about.moreCoursesDesc') },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Contact */}
      <motion.div
        className="mt-8 rounded-xl border border-border bg-card p-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-sm font-semibold">{t('about.contact')}</p>
        <a
          href="https://x.com/psyto"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          @psyto
        </a>
      </motion.div>
    </div>
  );
}
