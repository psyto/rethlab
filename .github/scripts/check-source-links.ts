#!/usr/bin/env tsx
/**
 * Source-link freshness checker.
 *
 * Greps every github.com/<owner>/<repo>/blob/... URL out of the seed files
 * and HEADs each one. Anything that returns a non-2xx status (typically a
 * 404 from an upstream rename or deletion) is reported.
 *
 * Run locally:
 *   npx tsx .github/scripts/check-source-links.ts
 *
 * In CI: see .github/workflows/source-link-check.yml — runs weekly and
 * opens an issue on failure.
 *
 * Why this exists: Reth and Revm refactor often. Lessons that link to
 * specific files in those repos can rot without us noticing. The fix
 * promised in the Show HN body — there it is.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PRISMA_DIR = join(process.cwd(), 'prisma');
// Match GitHub blob URLs: https://github.com/<owner>/<repo>/blob/<branch>/<path>
// Stops at whitespace, ), `, ], ", or end of string.
const URL_RE = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/blob\/[\w.-]+\/[^\s)`\]"]+/g;

const CONCURRENCY = 8;
// Be polite to GitHub. They throttle aggressive crawlers.
const REQUEST_HEADERS: HeadersInit = {
  'User-Agent': 'rethlab-source-link-checker (+https://github.com/psyto/rethlab)',
};

interface Finding {
  url: string;
  status: number | string;
  files: Set<string>;
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
      const set = urlToFiles.get(url) ?? new Set();
      set.add(file.replace(`${process.cwd()}/`, ''));
      urlToFiles.set(url, set);
    }
  }

  return urlToFiles;
}

async function checkOne(url: string): Promise<{ ok: boolean; status: number | string }> {
  try {
    // GitHub HEAD on /blob/ URLs sometimes returns 405; fall through to GET.
    let res = await fetch(url, { method: 'HEAD', headers: REQUEST_HEADERS, redirect: 'follow' });
    if (res.status === 405 || res.status === 403) {
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
    console.log('No GitHub blob URLs found in seed files. Nothing to check.');
    return;
  }

  console.log(`Checking ${urls.length} GitHub source links...`);

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
    console.log('All source links resolve.');
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
  console.error('source-link-check failed:', err);
  process.exit(2);
});
