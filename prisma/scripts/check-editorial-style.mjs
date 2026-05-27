import { execFileSync } from 'node:child_process';

const checks = [
  {
    label: 'time format',
    pattern: String.raw`\b3am\b|\b3pm\b`,
    message: 'Use "3 a.m." / "3 p.m." format.',
  },
  {
    label: 'seconds abbreviation',
    pattern: String.raw`\bunder\s+\d+\s+sec\b`,
    message: 'Use "second/seconds" instead of "sec".',
  },
  {
    label: 'math spacing',
    pattern: String.raw`\bn=\d{2,4}\b`,
    message: 'Use spaced math style: "n = 100".',
  },
  {
    label: 'large number shorthand',
    pattern: String.raw`\b\d+M\s+messages\b`,
    message: 'Prefer full wording, e.g., "1 million messages".',
  },
];

const targetFiles = execFileSync('rg', ['--files', 'prisma'], { encoding: 'utf8' })
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((p) => /seed-reth-.*-(en|ja)\.ts$/.test(p));

let hasError = false;

for (const check of checks) {
  try {
    const args = ['-n', '--glob', '!.git/**', '-e', check.pattern, ...targetFiles];
    const out = execFileSync('rg', args, { encoding: 'utf8' }).trim();
    if (out.length > 0) {
      hasError = true;
      console.error(`\n[editorial:${check.label}] ${check.message}`);
      console.error(out);
    }
  } catch (err) {
    // rg exits 1 when no matches found
    if (typeof err?.status === 'number' && err.status === 1) {
      continue;
    }
    throw err;
  }
}

if (hasError) {
  process.exit(1);
}

console.log('OK: editorial style checks passed.');
