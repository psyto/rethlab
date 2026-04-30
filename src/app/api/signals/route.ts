import { NextResponse } from 'next/server';

const HL_API = 'https://api.hyperliquid.xyz';
const DRIFT_DATA_API = 'https://data.api.drift.trade';

const TARGET_ASSETS = ['HYPE', 'SOL', 'BTC', 'ETH'];

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

async function fetchJSON(url: string, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function postJSON(url: string, body: object, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function classifySeverity(value: number, low: number, high: number, critical: number): number {
  if (Math.abs(value) >= critical) return 3;
  if (Math.abs(value) >= high) return 2;
  if (Math.abs(value) >= low) return 1;
  return 0;
}

// Parse HL predictedFundings: [[coin, [[venue, {fundingRate, fundingIntervalHours}], ...]], ...]
interface ParsedFunding {
  hlFunding: number | null;       // annualized %
  binanceFunding: number | null;
  bybitFunding: number | null;
}

function parseHLFundings(data: any[]): Map<string, ParsedFunding> {
  const result = new Map<string, ParsedFunding>();
  if (!Array.isArray(data)) return result;

  for (const item of data) {
    const coin = item[0];
    if (!TARGET_ASSETS.includes(coin)) continue;

    const venues: Record<string, any> = {};
    if (Array.isArray(item[1])) {
      for (const [venue, vData] of item[1]) {
        if (vData) venues[venue] = vData;
      }
    }

    const annualize = (rate: string | number, intervalHours: number): number => {
      return Number(rate) * (24 / intervalHours) * 365 * 100;
    };

    result.set(coin, {
      hlFunding: venues['HlPerp']
        ? annualize(venues['HlPerp'].fundingRate, venues['HlPerp'].fundingIntervalHours || 1)
        : null,
      binanceFunding: venues['BinPerp']
        ? annualize(venues['BinPerp'].fundingRate, venues['BinPerp'].fundingIntervalHours || 8)
        : null,
      bybitFunding: venues['BybitPerp']
        ? annualize(venues['BybitPerp'].fundingRate, venues['BybitPerp'].fundingIntervalHours || 8)
        : null,
    });
  }
  return result;
}

// Parse HL metaAndAssetCtxs for price + OI
function parseHLMarkets(data: any[]): Map<string, { price: number; oi: number }> {
  const result = new Map<string, { price: number; oi: number }>();
  if (!Array.isArray(data) || data.length < 2) return result;

  const meta = data[0];
  const ctxs = data[1];

  if (meta?.universe && Array.isArray(ctxs)) {
    for (let i = 0; i < meta.universe.length && i < ctxs.length; i++) {
      const coin = meta.universe[i]?.name;
      const ctx = ctxs[i];
      if (coin && ctx && TARGET_ASSETS.includes(coin)) {
        result.set(coin, {
          price: Number(ctx.markPx || 0),
          oi: Number(ctx.openInterest || 0) * Number(ctx.markPx || 0),
        });
      }
    }
  }
  return result;
}

// Fetch all Drift funding rates + OI in two calls
// Returns annualized % and OI for each market
interface DriftMarketData {
  funding: number;  // annualized %
  oi: number;       // USD
  price: number;
}

async function getDriftMarketData(): Promise<Map<string, DriftMarketData>> {
  const [fundingData, marketData] = await Promise.all([
    fetchJSON(`${DRIFT_DATA_API}/stats/fundingRates`),
    fetchJSON(`${DRIFT_DATA_API}/stats/markets`),
  ]);

  const result = new Map<string, DriftMarketData>();

  const symbolToAsset: Record<string, string> = {
    'SOL-PERP': 'SOL',
    'BTC-PERP': 'BTC',
    'ETH-PERP': 'ETH',
  };

  // Parse funding rates
  const fundingMap = new Map<string, number>();
  if (fundingData?.success && fundingData?.markets) {
    for (const m of fundingData.markets) {
      const asset = symbolToAsset[m.symbol];
      if (!asset) continue;
      const rate24h = Number(m.fundingRates['24h']);
      fundingMap.set(asset, rate24h * 365 * 100);
    }
  }

  // Parse OI + price from stats/markets
  if (marketData?.success && marketData?.markets) {
    for (const m of marketData.markets) {
      const asset = symbolToAsset[m.symbol];
      if (!asset || m.marketType !== 'perp') continue;
      const longOI = Number(m.openInterest?.long || 0);
      const shortOI = Math.abs(Number(m.openInterest?.short || 0));
      const price = Number(m.oraclePrice || 0);
      result.set(asset, {
        funding: fundingMap.get(asset) || 0,
        oi: (longOI + shortOI) * price,
        price,
      });
    }
  }

  return result;
}

export async function GET() {
  try {
    // Fetch all HL data in 2 calls (covers funding + price + OI for all assets)
    const [hlFundingsRaw, hlMarketsRaw] = await Promise.all([
      postJSON(`${HL_API}/info`, { type: 'predictedFundings' }),
      postJSON(`${HL_API}/info`, { type: 'metaAndAssetCtxs' }),
    ]);

    const hlFundings = parseHLFundings(hlFundingsRaw || []);
    const hlMarkets = parseHLMarkets(hlMarketsRaw || []);

    // Fetch Drift data: funding + OI in two API calls
    const driftData = await getDriftMarketData();

    // Build signals
    const signals: MarketSignal[] = TARGET_ASSETS.map((asset) => {
      const hlF = hlFundings.get(asset);
      const hlM = hlMarkets.get(asset);
      const drift = driftData.get(asset);

      const hlFunding = hlF?.hlFunding ?? null;
      const driftFunding = drift?.funding ?? null;
      const binanceFunding = hlF?.binanceFunding ?? null;
      const bybitFunding = hlF?.bybitFunding ?? null;

      const price = hlM?.price || drift?.price || 0;
      const hlOI = hlM?.oi || 0;
      const driftOI = drift?.oi || 0;

      // Calculate spreads vs CEX average
      const cexRates = [binanceFunding, bybitFunding].filter((r): r is number => r !== null);
      const avgCEX = cexRates.length > 0 ? cexRates.reduce((a, b) => a + b, 0) / cexRates.length : null;

      const hlSpread = hlFunding !== null && avgCEX !== null ? hlFunding - avgCEX : null;
      const driftSpread = driftFunding !== null && avgCEX !== null ? driftFunding - avgCEX : null;

      // Severity based on max spread from CEX
      const maxSpread = Math.max(
        hlSpread !== null ? Math.abs(hlSpread) : 0,
        driftSpread !== null ? Math.abs(driftSpread) : 0
      );
      const fundingSeverity = classifySeverity(maxSpread, 5, 15, 30);
      const regime = fundingSeverity >= 3 ? 'extreme' : fundingSeverity >= 2 ? 'volatile' : fundingSeverity >= 1 ? 'elevated' : 'calm';

      const platforms: string[] = [];
      if (hlFunding !== null || hlOI > 0) platforms.push('Hyperliquid');
      if (driftFunding !== null || driftOI > 0) platforms.push('Drift');

      return {
        asset,
        price,
        hlFunding,
        driftFunding,
        binanceFunding,
        bybitFunding,
        hlSpread,
        driftSpread,
        hlOI,
        driftOI,
        fundingSeverity,
        regime,
        platforms,
      };
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      signals,
    });
  } catch (error) {
    console.error('Signal fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
  }
}
