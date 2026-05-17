#!/usr/bin/env tsx
/**
 * External link freshness checker.
 *
 * Greps every https:// URL out of the seed files (excluding GitHub /blob/
 * source code URLs, which are handled by check-source-links.ts) and HEADs
 * each one. Anything that returns a non-2xx status (typically a 404 from
 * a moved blog post, retired docs page, or dead external resource) is
 * reported.
 *
 * Run locally:
 *   npx tsx .github/scripts/check-external-links.ts
 *
 * In CI: see .github/workflows/external-link-check.yml — runs weekly and
 * opens an issue on failure.
 *
 * Companion to check-source-links.ts: that one watches for upstream
 * Reth/Revm/Alloy source moves; this one watches for everything else
 * (EIPs, docs sites, blog posts, papers, video links).
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PRISMA_DIR = join(process.cwd(), 'prisma');

// Match any https URL, stopping at whitespace, ), `, ], ", ', <, or >.
const URL_RE = /https:\/\/[^\s)`\]"'<>]+/g;

// Exclude URLs handled by the companion check-source-links.ts checker.
const EXCLUDE_GITHUB_BLOB_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/blob\//;

// Exclude placeholders, RPC endpoints (which fail without a proper RPC
// payload), and blog sites with aggressive bot protection (false-positive
// 403/429 in CI). NOT excluding real content URLs — those should report
// when they 404.
const EXCLUDE_PATTERNS = [
  // Placeholders
  /^https:\/\/example\.com/,
  /^https:\/\/your-domain/,
  /^https:\/\/your-rpc-provider/,
  /^https:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/,
  /^https:\/\/mainnet\.example/,
  /^https:\/\/tempo-rpc\.url/,
  /^https:\/\/tidx\.example/,

  // RPC endpoints — expected to fail without an RPC payload, not actual link rot
  /^https:\/\/mainnet\.optimism\.io/,
  /^https:\/\/reth-ethereum\.ithaca\.xyz\/rpc/,
  /^https:\/\/rpc\.flashbots\.net/,
  /^https:\/\/rpc\.moderato\.tempo\.xyz/,
  /^https:\/\/mpp\.dev\/api/,
  /^https:\/\/eth\.llamarpc\.com/,
  /^https:\/\/ethereum-rpc\.url/,
  /^https:\/\/api\.hyperliquid\.xyz/,
  /^https:\/\/aviationstack\.mpp\.tempo\.xyz/,

  // Sites with aggressive bot protection — false-positive 403/429 in CI but
  // resolve fine for humans. Trade-off: occasional real rot here goes uncaught.
  /^https:\/\/www\.coinbase\.com\/blog/,
  /^https:\/\/www\.coindesk\.com/,
  /^https:\/\/crates\.io/,
];

const CONCURRENCY = 8;
const REQUEST_HEADERS: HeadersInit = {
  'User-Agent': 'rethlab-external-link-checker (+https://github.com/psyto/rethlab)',
};

interface Finding {
  url: string;
  status: number | string;
  files: Set<string>;
}

function shouldCheck(url: string): boolean {
  if (EXCLUDE_GITHUB_BLOB_RE.test(url)) return false;
  for (const pat of EXCLUDE_PATTERNS) {
    if (pat.test(url)) return false;
  }
  return true;
}

async function collectUrls(): Promise<Map<string, Set<string>>> {
  const entries = await readdir(PRISMA_DIR);
  const seedFiles = entries
    .filter((f) => f.startsWith('seed-reth-') && f.endsWith('.ts'))
    .map((f) => join(PRISMA_DIR, f));

  const urlToFiles = new Map<string, Set<string>>();

  for (const file of seedFiles) {
    const content = await readFile(file, 'utf-8');
    const matches = content.matchAll(URL_RE);
    for (const m of matches) {
      // Strip trailing punctuation that markdown commonly attaches.
      const url = m[0].replace(/[.,;:]+$/, '');
      if (!shouldCheck(url)) continue;
      const set = urlToFiles.get(url) ?? new Set();
      set.add(file.replace(`${process.cwd()}/`, ''));
      urlToFiles.set(url, set);
    }
  }

  return urlToFiles;
}

async function checkOne(url: string): Promise<{ ok: boolean; status: number | string }> {
  try {
    let res = await fetch(url, { method: 'HEAD', headers: REQUEST_HEADERS, redirect: 'follow' });
    // Many sites reject HEAD with 405 / 403 / 400; fall through to GET.
    if (res.status === 405 || res.status === 403 || res.status === 400) {
      res = await fetch(url, { method: 'GET', headers: REQUEST_HEADERS, redirect: 'follow' });
    }
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: err instanceof Error ? err.message : String(err) };
  }
}

async function pool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  const urlToFiles = await collectUrls();
  const urls = [...urlToFiles.keys()].sort();

  if (urls.length === 0) {
    console.log('No external URLs found in seed files. Nothing to check.');
    return;
  }

  console.log(`Checking ${urls.length} external links (non-GitHub-blob)...`);

  const results = await pool(urls, CONCURRENCY, checkOne);

  const findings: Finding[] = [];
  for (let i = 0; i < urls.length; i++) {
    const r = results[i];
    if (!r.ok) {
      findings.push({ url: urls[i], status: r.status, files: urlToFiles.get(urls[i])! });
    }
  }

  console.log(`\nChecked ${urls.length} URLs. ${findings.length} broken.`);

  if (findings.length === 0) {
    console.log('All external links resolve.');
    return;
  }

  console.log('\nBroken links:');
  for (const f of findings) {
    console.log(`  [${f.status}] ${f.url}`);
    for (const file of f.files) {
      console.log(`    in: ${file}`);
    }
  }

  process.exit(1);
}

main().catch((err) => {
  console.error('external-link-check failed:', err);
  process.exit(2);
});
