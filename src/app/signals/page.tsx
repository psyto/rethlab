'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/locale-context';
import { Activity, TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketSignal {
  asset: string;
  price: number;
  hlFunding: number | null;
  driftFunding: number | null;
  binanceFunding: number | null;
  bybitFunding: number | null;
  hlSpread: number | null;
  driftSpread: number | null;
  hlOI: number;
  driftOI: number;
  fundingSeverity: number;
  regime: string;
  platforms: string[];
}

interface SignalData {
  timestamp: string;
  signals: MarketSignal[];
}

const REGIME_COLORS: Record<string, string> = {
  calm: 'bg-green-500/10 text-green-400 border-green-500/20',
  elevated: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  volatile: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  extreme: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const REGIME_ICONS: Record<string, typeof Shield> = {
  calm: Shield,
  elevated: Activity,
  volatile: Zap,
  extreme: AlertTriangle,
};

function formatFunding(rate: number | null): string {
  if (rate === null) return '—';
  const sign = rate >= 0 ? '+' : '';
  return `${sign}${rate.toFixed(1)}%`;
}

function formatOI(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  if (value === 0) return '—';
  return `$${value.toFixed(0)}`;
}

function formatPrice(price: number): string {
  if (price === 0) return '—';
  if (price >= 1000) return `$${price.toFixed(0)}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

function FundingCell({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      {rate > 1 ? <TrendingUp className="h-3.5 w-3.5 text-green-400" /> :
       rate < -1 ? <TrendingDown className="h-3.5 w-3.5 text-red-400" /> :
       <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
      <span className={rate >= 0 ? 'text-green-400' : 'text-red-400'}>
        {formatFunding(rate)}
      </span>
    </div>
  );
}

export default function SignalsPage() {
  const { t } = useLocale();
  const [data, setData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const severityLabels = [
    t('page.signals.severityNone'),
    t('page.signals.severityLow'),
    t('page.signals.severityHigh'),
    t('page.signals.severityCritical'),
  ];

  const SEVERITY_COLORS = [
    'text-muted-foreground',
    'text-yellow-400',
    'text-orange-400',
    'text-red-400',
  ];

  const fetchSignals = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/signals');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch {
      setError(t('page.signals.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('page.signals.title')}</h1>
          <p className="mt-2 text-muted-foreground">
            {t('page.signals.subtitle')}
          </p>
        </div>
        <button
          onClick={fetchSignals}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          {t('page.signals.refresh')}
        </button>
      </div>

      {lastRefresh && (
        <p className="mb-6 text-xs text-muted-foreground">
          {t('page.signals.lastUpdated')} {lastRefresh.toLocaleTimeString()}
        </p>
      )}

      {error && (
        <div className="mb-8 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Regime Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.signals.map((signal) => {
              const RegimeIcon = REGIME_ICONS[signal.regime] || Shield;
              const bestFunding = signal.hlFunding !== null && signal.driftFunding !== null
                ? Math.max(signal.hlFunding, signal.driftFunding)
                : signal.hlFunding ?? signal.driftFunding ?? 0;
              const bestPlatform = signal.hlFunding !== null && signal.driftFunding !== null
                ? (signal.hlFunding >= signal.driftFunding ? 'HL' : 'Drift')
                : signal.hlFunding !== null ? 'HL' : 'Drift';
              return (
                <div
                  key={signal.asset}
                  className={cn('rounded-xl border p-5', REGIME_COLORS[signal.regime])}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RegimeIcon className="h-5 w-5" />
                      <span className="text-lg font-bold">{signal.asset}</span>
                    </div>
                    <span className="text-sm font-medium">{formatPrice(signal.price)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>{t('page.signals.regime')}</span>
                    <span className="font-semibold capitalize">{signal.regime}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span>{t('page.signals.bestFunding')}</span>
                    <span className={cn('font-semibold', bestFunding >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {formatFunding(bestFunding)} ({bestPlatform})
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {signal.platforms.map((p) => (
                      <span key={p} className="rounded bg-background/30 px-1.5 py-0.5 text-[10px]">{p}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cross-Venue Funding Rates Table */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold">{t('page.signals.crossVenue')}</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-card text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Hyperliquid</th>
                    <th className="px-4 py-3">Drift</th>
                    <th className="px-4 py-3">Binance</th>
                    <th className="px-4 py-3">Bybit</th>
                    <th className="px-4 py-3">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.signals.map((signal) => (
                    <tr key={signal.asset} className="border-b border-border/50 transition-colors hover:bg-card/50">
                      <td className="px-4 py-3 font-semibold">{signal.asset}</td>
                      <td className="px-4 py-3"><FundingCell rate={signal.hlFunding} /></td>
                      <td className="px-4 py-3"><FundingCell rate={signal.driftFunding} /></td>
                      <td className="px-4 py-3"><FundingCell rate={signal.binanceFunding} /></td>
                      <td className="px-4 py-3"><FundingCell rate={signal.bybitFunding} /></td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium', SEVERITY_COLORS[signal.fundingSeverity])}>
                          {severityLabels[signal.fundingSeverity]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* OI Table */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold">{t('page.signals.openInterest')}</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-card text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Hyperliquid</th>
                    <th className="px-4 py-3">Drift</th>
                  </tr>
                </thead>
                <tbody>
                  {data.signals.map((signal) => (
                    <tr key={signal.asset} className="border-b border-border/50 transition-colors hover:bg-card/50">
                      <td className="px-4 py-3 font-semibold">{signal.asset}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatOI(signal.hlOI)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatOI(signal.driftOI)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Explanation */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold">{t('page.signals.howToRead')}</h3>
            <div className="mt-3 grid gap-4 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <p className="font-medium text-foreground">{t('page.signals.fundingComparison')}</p>
                <p className="mt-1">{t('page.signals.fundingComparisonDesc')}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">{t('page.signals.hypeOnly')}</p>
                <p className="mt-1">{t('page.signals.hypeOnlyDesc')}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">{t('page.signals.regimeLabel')}</p>
                <p className="mt-1">{t('page.signals.regimeDesc')}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">{t('page.signals.bestFundingLabel')}</p>
                <p className="mt-1">{t('page.signals.bestFundingDesc')}</p>
              </div>
            </div>
          </div>

          {/* Consulting CTA */}
          <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">{t('page.consulting.deployTitle')}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('page.consulting.signalsDesc')}
                </p>
              </div>
              <a
                href="https://twitter.com/fabrknt"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t('page.consulting.cta')}
              </a>
            </div>
          </div>
        </>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
