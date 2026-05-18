#!/usr/bin/env tsx
/**
 * openhl SHA-pinned cite checker.
 *
 * Greps every `path/to/file.rs:LINE@SHA` cite out of the openhl lesson
 * drafts in `drafts/openhl_*.md` and verifies each one resolves in a
 * local openhl git checkout — i.e., the file exists at that SHA AND the
 * line number is within the file's bounds at that SHA.
 *
 * Companion to check-source-links.ts (GitHub blob URLs) and
 * check-external-links.ts (everything else). This one watches for drift
 * between rethlab drafts and the openhl codebase they cite.
 *
 * Run locally:
 *   npx tsx .github/scripts/check-openhl-cites.ts
 *
 * Override the openhl checkout location (default: ../openhl sibling):
 *   OPENHL_REPO=/path/to/openhl npx tsx .github/scripts/check-openhl-cites.ts
 *
 * Override the drafts directory (default: ./drafts):
 *   DRAFTS_DIR=/path/to/drafts npx tsx .github/scripts/check-openhl-cites.ts
 *
 * Exit code: 0 if every cite resolves; 1 if any cite is broken.
 *
 * Why this exists: the lessons in `drafts/` cite real openhl code by
 * `file:line@SHA`. As openhl evolves, line numbers drift. Catching the
 * drift before publish is what keeps the curriculum honest. The
 * existence + line-bounds check catches the common drift modes (file
 * rename, function move, deletion). A semantic check ("the cited line
 * still says what the lesson claims") is out of scope — that's editorial
 * review.
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
const DRAFTS_DIR = process.env.DRAFTS_DIR
  ? resolve(process.env.DRAFTS_DIR)
  : join(RETHLAB_ROOT, 'drafts');

// Pattern matches:
//   crates/X.rs              — bare path (skipped; no SHA pin to check)
//   crates/X.rs:N            — path with line (skipped; no SHA pin)
//   crates/X.rs:N@SHA        — pinned single line
//   crates/X.rs:N-M@SHA      — pinned range
//   crates/X.rs@SHA          — whole-file pin (existence-only check)
//   bin/X.rs@SHA (etc.)      — same shape under bin/
const CITE_RE =
  /\b(crates|bin)\/[a-zA-Z0-9_/.-]+\.rs(:[0-9]+(?:-[0-9]+)?)?@[a-f0-9]{7,40}\b/g;

interface Cite {
  raw: string;
  path: string;
  lineStart: number | null;
  lineEnd: number | null;
  sha: string;
  file: string; // markdown file the cite came from
}

interface CheckResult {
  cite: Cite;
  ok: boolean;
  reason?: string;
}

function parseCite(raw: string, file: string): Cite | null {
  // raw looks like "crates/x.rs:10-20@abc1234" or similar.
  const atIdx = raw.lastIndexOf('@');
  if (atIdx < 0) return null;
  const sha = raw.slice(atIdx + 1);
  const rest = raw.slice(0, atIdx);

  const colonIdx = rest.indexOf(':');
  if (colonIdx < 0) {
    return { raw, path: rest, lineStart: null, lineEnd: null, sha, file };
  }
  const path = rest.slice(0, colonIdx);
  const spec = rest.slice(colonIdx + 1);
  const dashIdx = spec.indexOf('-');
  if (dashIdx < 0) {
    const n = Number.parseInt(spec, 10);
    if (Number.isNaN(n)) return null;
    return { raw, path, lineStart: n, lineEnd: null, sha, file };
  }
  const start = Number.parseInt(spec.slice(0, dashIdx), 10);
  const end = Number.parseInt(spec.slice(dashIdx + 1), 10);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { raw, path, lineStart: start, lineEnd: end, sha, file };
}

function checkCite(cite: Cite): CheckResult {
  // Does the file exist at this SHA?
  try {
    execFileSync('git', ['-C', OPENHL_REPO, 'cat-file', '-e', `${cite.sha}:${cite.path}`], {
      stdio: 'pipe',
    });
  } catch {
    return { cite, ok: false, reason: 'file not found at SHA' };
  }

  if (cite.lineStart === null) {
    return { cite, ok: true };
  }

  // Read the file at the SHA and count lines.
  let content: string;
  try {
    content = execFileSync('git', ['-C', OPENHL_REPO, 'show', `${cite.sha}:${cite.path}`], {
      stdio: 'pipe',
      encoding: 'utf8',
    });
  } catch (err) {
    return {
      cite,
      ok: false,
      reason: `git show failed: ${(err as Error).message}`,
    };
  }
  const totalLines = content.split('\n').length;

  const hi = cite.lineEnd ?? cite.lineStart;
  if (cite.lineStart < 1 || cite.lineStart > totalLines) {
    return {
      cite,
      ok: false,
      reason: `line ${cite.lineStart} out of range (file has ${totalLines} lines)`,
    };
  }
  if (hi < cite.lineStart || hi > totalLines) {
    return {
      cite,
      ok: false,
      reason: `line ${hi} out of range (file has ${totalLines} lines)`,
    };
  }
  return { cite, ok: true };
}

async function main(): Promise<void> {
  // Pre-flight: openhl repo exists and is a git checkout.
  if (!existsSync(join(OPENHL_REPO, '.git'))) {
    console.error(`ERROR: ${OPENHL_REPO} is not a git checkout`);
    console.error('  set OPENHL_REPO=/path/to/openhl or place rethlab and openhl as siblings');
    process.exit(2);
  }
  if (!existsSync(DRAFTS_DIR)) {
    console.error(`ERROR: ${DRAFTS_DIR} does not exist`);
    process.exit(2);
  }

  const files = (await readdir(DRAFTS_DIR))
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(DRAFTS_DIR, f));

  if (files.length === 0) {
    console.error(`ERROR: no .md files in ${DRAFTS_DIR}`);
    process.exit(2);
  }

  console.log('openhl cite-check');
  console.log(`  rethlab drafts:  ${DRAFTS_DIR}`);
  console.log(`  openhl repo:     ${OPENHL_REPO}`);
  console.log(`  files:           ${files.length}`);
  console.log();

  let grandTotal = 0;
  let grandFail = 0;

  for (const file of files.sort()) {
    const text = await readFile(file, 'utf8');
    const matches = [...text.matchAll(CITE_RE)].map((m) => m[0]);
    const unique = [...new Set(matches)];

    console.log(`── ${basename(file)} ──`);
    if (unique.length === 0) {
      console.log('  (no openhl SHA-pinned cites)');
      continue;
    }

    let fileFail = 0;
    for (const raw of unique.sort()) {
      const cite = parseCite(raw, file);
      if (!cite) {
        console.log(`  ✗ ${raw}  — could not parse cite`);
        fileFail++;
        grandFail++;
        grandTotal++;
        continue;
      }
      grandTotal++;
      const result = checkCite(cite);
      if (!result.ok) {
        console.log(`  ✗ ${cite.raw}  — ${result.reason}`);
        fileFail++;
        grandFail++;
      }
    }
    if (fileFail === 0) {
      console.log(`  ✓ ${unique.length} cite(s) OK`);
    }
  }

  console.log();
  console.log(`Summary: ${grandTotal} cite(s) checked, ${grandFail} failure(s)`);
  process.exit(grandFail === 0 ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error('UNCAUGHT:', err);
  process.exit(2);
});
