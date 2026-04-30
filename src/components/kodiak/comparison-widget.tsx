'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, TrendingUp, Shield, Zap, BarChart3, Wallet, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/locale-context';
import { KODIAK_ENABLED } from '@/lib/kodiak-config';

const KODIAK_URL = 'https://app.hyperliquid.xyz/vaults'; // TODO: replace with actual Kodiak vault URL

interface VaultData {
  name: string;
  strategy: string;
  apyRange: string;
  maxDrawdown: string;
  riskLevel: string;
  riskColor: string;
  fees: string;
  highlight?: boolean;
}

const VAULTS: VaultData[] = [
  {
    name: 'HLP',
    strategy: 'Market Making',
    apyRange: '5–15%',
    maxDrawdown: '~20%',
    riskLevel: 'High',
    riskColor: 'text-red-400',
    fees: '10% profit share',
  },
  {
    name: 'Liminal',
    strategy: 'Delta-Neutral',
    apyRange: '8–12%',
    maxDrawdown: '~5%',
    riskLevel: 'Low',
    riskColor: 'text-green-400',
    fees: '2% + 20% perf',
  },
  {
    name: 'Harmonix',
    strategy: 'Options Selling',
    apyRange: '10–20%',
    maxDrawdown: '~15%',
    riskLevel: 'Medium',
    riskColor: 'text-yellow-400',
    fees: '2% + 15% perf',
  },
  {
    name: 'Kodiak',
    strategy: 'DN + Funding + Tilt',
    apyRange: '12–20%',
    maxDrawdown: '~3%',
    riskLevel: 'Low',
    riskColor: 'text-green-400',
    fees: 'Coming soon',
    highlight: true,
  },
];

interface ComparisonWidgetProps {
  variant: 'gate' | 'lesson' | 'cta';
  showCta?: boolean;
  ctaUrl?: string;
}

export function KodiakComparisonWidget({
  variant,
  showCta = true,
  ctaUrl = KODIAK_URL,
}: ComparisonWidgetProps) {
  const { t } = useLocale();

  if (variant === 'gate') {
    return <GateView ctaUrl={ctaUrl} />;
  }

  // Hide lesson/cta variants when Kodiak is not deployed
  if (!KODIAK_ENABLED) return null;

  if (variant === 'lesson') {
    return (
      <div className="my-8">
        <ComparisonTable />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <StrategyCard
            icon={BarChart3}
            title="HLP"
            description="You're the counterparty to all traders. High yield when markets are calm, significant losses during volatile moves."
            risk="High drawdown risk"
            riskColor="text-red-400"
          />
          <StrategyCard
            icon={Shield}
            title="Liminal"
            description="Conservative delta-neutral approach. Consistent but modest returns. Proven at $30M TVL."
            risk="Low risk, lower returns"
            riskColor="text-green-400"
          />
          <StrategyCard
            icon={Zap}
            title="Harmonix"
            description="Options-based yield. Higher variance — great months and bad months. Requires understanding of options risk."
            risk="Options premium risk"
            riskColor="text-yellow-400"
          />
          <StrategyCard
            icon={TrendingUp}
            title="Kodiak"
            description="Delta-neutral + funding rate harvesting with configurable directional tilt. Active risk management, not passive exposure."
            risk="Managed risk, configurable"
            riskColor="text-primary"
            highlight
          />
        </div>
        {showCta && (
          <div className="mt-6 text-center">
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-fabrknt-gradient px-6 py-3 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90"
            >
              {t('kodiak.tryKodiak')}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    );
  }

  // variant === 'cta'
  return (
    <div className="my-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <ComparisonTable compact />
      {showCta && (
        <div className="mt-4 text-center">
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-fabrknt-gradient px-5 py-2.5 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90"
          >
            {t('kodiak.tryKodiak')}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}

function ComparisonTable({ compact }: { compact?: boolean }) {
  return (
    <div className={cn('w-full overflow-x-auto', compact ? 'max-w-lg mx-auto' : 'max-w-3xl mx-auto')}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Vault</th>
            <th className="px-3 py-2">Strategy</th>
            <th className="px-3 py-2">APY</th>
            {!compact && <th className="px-3 py-2">Max DD</th>}
            <th className="px-3 py-2">Risk</th>
            {!compact && <th className="px-3 py-2">Fees</th>}
          </tr>
        </thead>
        <tbody>
          {VAULTS.map((vault) => (
            <tr
              key={vault.name}
              className={cn(
                'border-b border-border/50 transition-colors',
                vault.highlight && 'bg-primary/5'
              )}
            >
              <td className={cn('px-3 py-2.5 font-medium', vault.highlight && 'text-primary')}>
                {vault.name}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{vault.strategy}</td>
              <td className="px-3 py-2.5 font-medium">{vault.apyRange}</td>
              {!compact && <td className="px-3 py-2.5 text-muted-foreground">{vault.maxDrawdown}</td>}
              <td className={cn('px-3 py-2.5 font-medium', vault.riskColor)}>{vault.riskLevel}</td>
              {!compact && <td className="px-3 py-2.5 text-muted-foreground">{vault.fees}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StrategyCard({
  icon: Icon,
  title,
  description,
  risk,
  riskColor,
  highlight,
}: {
  icon: typeof BarChart3;
  title: string;
  description: string;
  risk: string;
  riskColor: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        highlight
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-card'
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', highlight ? 'text-primary' : 'text-muted-foreground')} />
        <h4 className={cn('font-semibold', highlight && 'text-primary')}>{title}</h4>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
      <p className={cn('mt-2 text-xs font-medium', riskColor)}>{risk}</p>
    </div>
  );
}

function GateView({ ctaUrl }: { ctaUrl: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const [walletAddress, setWalletAddress] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<'success' | 'not-found' | null>(null);

  const handleVerify = async () => {
    if (!walletAddress.trim()) return;
    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch('/api/verify-kodiak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: walletAddress.trim() }),
      });
      const data = await res.json();

      if (data.data?.isDepositor) {
        setVerifyResult('success');
        // Store verification in localStorage for this session
        localStorage.setItem('kodiak-verified', walletAddress.trim());
        // Reload to access the lesson
        setTimeout(() => router.refresh(), 1500);
      } else {
        setVerifyResult('not-found');
      }
    } catch {
      setVerifyResult('not-found');
    } finally {
      setVerifying(false);
    }
  };

  // When Kodiak is not deployed, show simple sign-in gate
  if (!KODIAK_ENABLED) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-fabrknt-gradient">
          <Lock className="h-8 w-8 text-fabrknt-dark" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{t('kodiak.gateTitle')}</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            {t('kodiak.gateSubtitle')}
          </p>
        </div>
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-2 rounded-xl bg-fabrknt-gradient px-8 py-3.5 text-base font-semibold text-fabrknt-dark shadow-lg transition-all hover:opacity-90"
        >
          {t('kodiak.signInToLearn')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-fabrknt-gradient">
        <Lock className="h-8 w-8 text-fabrknt-dark" />
      </div>
      <div>
        <h2 className="text-2xl font-bold">{t('kodiak.gateTitle')}</h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          {t('kodiak.gateSubtitle')}
        </p>
      </div>

      <ComparisonTable />

      {/* Two unlock paths */}
      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        {/* Path 1: Try Kodiak + verify wallet */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
            <Wallet className="h-4 w-4" />
            {t('kodiak.depositors')}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('kodiak.depositDescription')}
          </p>
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-fabrknt-gradient px-5 py-2.5 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90"
          >
            {t('kodiak.tryKodiak')}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <div className="mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => {
                  setWalletAddress(e.target.value);
                  setVerifyResult(null);
                }}
                placeholder="0x... wallet address"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleVerify}
                disabled={verifying || !walletAddress.trim()}
                className="shrink-0 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
              >
                {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('kodiak.verify')}
              </button>
            </div>
            {verifyResult === 'success' && (
              <p className="mt-2 flex items-center justify-center gap-1 text-xs text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('kodiak.verified')}
              </p>
            )}
            {verifyResult === 'not-found' && (
              <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <XCircle className="h-3.5 w-3.5" />
                {t('kodiak.notFound')}
              </p>
            )}
          </div>
        </div>

        {/* Path 2: Sign in */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold">
            {t('kodiak.signIn')}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('kodiak.signInDescription')}
          </p>
          <Link
            href="/auth/signin"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-secondary px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            {t('kodiak.signInToLearn')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
