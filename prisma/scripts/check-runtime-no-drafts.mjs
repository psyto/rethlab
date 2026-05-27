import { execFileSync } from 'node:child_process';

// Production/runtime surface should never read from drafts/.
// drafts/ is editorial source material only.
const targets = [
  'src',
  'next.config.js',
  'package.json',
  'prisma/seed.ts',
  'prisma/seed-upsert.ts',
].join(' ');

const patterns = [
  String.raw`drafts/`,
  String.raw`from "\.\./drafts`,
  String.raw`from '\.\./drafts`,
  String.raw`from "\./drafts`,
  String.raw`from '\./drafts`,
  String.raw`readFileSync\(.+drafts`,
];

try {
  const args = ['-n', '--hidden', '--glob', '!drafts/**', '--glob', '!.git/**'];
  for (const p of patterns) args.push('-e', p);
  args.push(...targets.split(' '));

  const out = execFileSync('rg', args, { encoding: 'utf8' }).trim();
  if (out.length > 0) {
    console.error('Runtime must not reference drafts/.');
    console.error('Found references:\n');
    console.error(out);
    process.exit(1);
  }
} catch (err) {
  // rg exits with code 1 when no matches are found.
  if (typeof err?.status === 'number' && err.status === 1) {
    console.log('OK: runtime has no drafts/ references.');
    process.exit(0);
  }
  console.error('Failed to run runtime-drafts check.');
  console.error(err?.message ?? String(err));
  process.exit(2);
}
