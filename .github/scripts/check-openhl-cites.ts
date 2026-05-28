#!/usr/bin/env tsx
/**
 * openhl SHA + source-path cite checker.
 *
 * Greps the openhl course seed files (`prisma/seed-reth-openhl-*.ts`) for
 * two kinds of reference into the openhl codebase and verifies each against
 * a local openhl git checkout:
 *
 *   1. **SHA references** — 7–40 char commit hashes the lessons pin against
 *      (e.g. "Stage 10d (d66b44a)"). Verified to resolve to a real commit.
 *   2. **Source-file paths** — `crates/.../*.rs` / `bin/.../*.rs` paths the
 *      lessons tell readers to open. Verified to exist at openhl HEAD.
 *
 * History: this checker originally verified precise `path:line@SHA` cites in
 * `drafts/openhl_*.md`. Those drafts were removed (the seeds became the
 * source of truth, commit 3f7b413) and the seeds never carried the
 * line-pinned cite form — so the check was rewritten to grep the seeds for
 * the reference shapes they actually use. The line-bounds check is gone (no
 * line pins to check); the existence checks (SHA resolves, file still there)
 * catch the common drift modes: file rename, file deletion, and a SHA that
 * was rebased / force-pushed away.
 *
 * Companion to check-source-links.ts (GitHub blob URLs) and
 * check-external-links.ts (everything else).
 *
 * Run locally:
 *   npx tsx .github/scripts/check-openhl-cites.ts
 *
 * Override the openhl checkout location (default: ../openhl sibling):
 *   OPENHL_REPO=/path/to/openhl npx tsx .github/scripts/check-openhl-cites.ts
 *
 * Override the seeds directory (default: ./prisma):
 *   SEEDS_DIR=/path/to/prisma npx tsx .github/scripts/check-openhl-cites.ts
 *
 * Exit code: 0 if every reference resolves; 1 if any is broken; 2 on setup
 * error (no openhl checkout, no seeds).
 */
import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname, basename } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const RETHLAB_ROOT = resolve(SCRIPT_DIR, '..', '..');

const OPENHL_REPO = process.env.OPENHL_REPO
  ? resolve(process.env.OPENHL_REPO)
  : resolve(RETHLAB_ROOT, '..', 'openhl');
const SEEDS_DIR = process.env.SEEDS_DIR
  ? resolve(process.env.SEEDS_DIR)
  : join(RETHLAB_ROOT, 'prisma');

// SHA references. The seeds phrase commit pins a handful of ways, all of
// which put the hash inside parens or backticks right after a marker word.
// Anchoring on those markers avoids matching incidental hex (addresses,
// hashes in code samples, etc.).
//   "Stage 10d (d66b44a)"      "SHA `d66b44a`"      "at `d66b44a`"
//   "(d66b44a)" after a Stage   "`0a8464e`"
const SHA_RE =
  /(?:Stage\s+[0-9]+[a-z]?\s*\(|SHA\s+`|at\s+`|pinned to\s+`|\bcommit\s+`)([a-f0-9]{7,40})`?\)?/gi;

// Source-file paths the lessons tell readers to open.
const PATH_RE = /\b(?:crates|bin)\/[a-zA-Z0-9_/.-]+\.rs\b/g;

interface Ref {
  raw: string; // the SHA or path token
  kind: 'sha' | 'path';
  files: Set<string>; // seed files it appears in
}

function gitOk(args: string[]): boolean {
  try {
    execFileSync('git', ['-C', OPENHL_REPO, ...args], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  // Pre-flight: openhl repo exists and is a git checkout.
  if (!existsSync(join(OPENHL_REPO, '.git'))) {
    console.error(`ERROR: ${OPENHL_REPO} is not a git checkout`);
    console.error('  set OPENHL_REPO=/path/to/openhl or place rethlab and openhl as siblings');
    process.exit(2);
  }
  if (!existsSync(SEEDS_DIR)) {
    console.error(`ERROR: ${SEEDS_DIR} does not exist`);
    process.exit(2);
  }

  const files = (await readdir(SEEDS_DIR))
    .filter((f) => /^seed-reth-openhl-.*\.ts$/.test(f))
    .map((f) => join(SEEDS_DIR, f));

  if (files.length === 0) {
    console.error(`ERROR: no seed-reth-openhl-*.ts files in ${SEEDS_DIR}`);
    process.exit(2);
  }

  // Collect unique refs across all seed files.
  const shaRefs = new Map<string, Ref>();
  const pathRefs = new Map<string, Ref>();

  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const short = basename(file);

    for (const m of text.matchAll(SHA_RE)) {
      const sha = m[1].toLowerCase();
      const existing = shaRefs.get(sha) ?? { raw: sha, kind: 'sha' as const, files: new Set() };
      existing.files.add(short);
      shaRefs.set(sha, existing);
    }
    for (const m of text.matchAll(PATH_RE)) {
      const p = m[0];
      // Skip intentional "wrong path" teaching contrasts, where a lesson shows
      // the correct path then explicitly names the incorrect one. Two shapes:
      //   EN: "...`.../src/bridge.rs`, not `crates/consensus/bridge.rs`..."
      //   JA: "...`.../src/bridge.rs` であって `crates/consensus/bridge.rs` ではない"
      // Inside a TS template literal the backtick is escaped (\`), so allow an
      // optional backslash adjacent to the backtick on either side.
      const idx = m.index ?? 0;
      const before = text.slice(Math.max(0, idx - 8), idx);
      const after = text.slice(idx + p.length, idx + p.length + 12);
      if (/not\s+\\?`$/i.test(before)) continue; // EN: "not `<wrong>`"
      if (/^\\?`\s*ではない/.test(after)) continue; // JA: "`<wrong>` ではない"
      const existing = pathRefs.get(p) ?? { raw: p, kind: 'path' as const, files: new Set() };
      existing.files.add(short);
      pathRefs.set(p, existing);
    }
  }

  console.log('openhl cite-check (seed-based)');
  console.log(`  seeds:       ${SEEDS_DIR} (${files.length} openhl seed files)`);
  console.log(`  openhl repo: ${OPENHL_REPO}`);
  console.log(`  SHA refs:    ${shaRefs.size}`);
  console.log(`  path refs:   ${pathRefs.size}`);
  console.log();

  let fail = 0;

  // 1. SHA references resolve to real commits.
  console.log('── SHA references ──');
  for (const sha of [...shaRefs.keys()].sort()) {
    const ref = shaRefs.get(sha)!;
    // `<sha>^{commit}` forces the object to resolve as a commit.
    if (!gitOk(['cat-file', '-e', `${sha}^{commit}`])) {
      console.log(`  ✗ ${sha}  — not a commit in openhl  (${[...ref.files].join(', ')})`);
      fail++;
    }
  }
  if (fail === 0) console.log(`  ✓ all ${shaRefs.size} SHA(s) resolve`);

  // 2. Source-file paths exist at HEAD.
  console.log('── source paths (at HEAD) ──');
  let pathFail = 0;
  for (const p of [...pathRefs.keys()].sort()) {
    const ref = pathRefs.get(p)!;
    if (!gitOk(['cat-file', '-e', `HEAD:${p}`])) {
      console.log(`  ✗ ${p}  — not found at openhl HEAD  (${[...ref.files].join(', ')})`);
      pathFail++;
      fail++;
    }
  }
  if (pathFail === 0) console.log(`  ✓ all ${pathRefs.size} path(s) exist at HEAD`);

  console.log();
  console.log(`Summary: ${shaRefs.size} SHA + ${pathRefs.size} path checked, ${fail} failure(s)`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error('UNCAUGHT:', err);
  process.exit(2);
});
