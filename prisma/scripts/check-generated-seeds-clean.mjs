import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

function digest(path) {
  return readFileSync(path, 'utf8');
}

const locales = (process.env.CONTENT_CHECK_LOCALES || 'en,ja')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const scriptBases = [
  '.github/scripts/build-openhl-seed.ts',
  '.github/scripts/build-openhl-clob-seed.ts',
  '.github/scripts/build-openhl-precompiles-seed.ts',
  '.github/scripts/build-openhl-funding-seed.ts',
  '.github/scripts/build-openhl-liquidation-seed.ts',
  '.github/scripts/build-openhl-adl-seed.ts',
  '.github/scripts/build-foundry-seed.ts',
  '.github/scripts/build-perp-primer-seed.ts',
];

const buildCommands = [];
for (const locale of locales) {
  for (const base of scriptBases) {
    buildCommands.push(`npx tsx ${base} --locale=${locale}`);
  }
}

const generatedTargets = locales.flatMap((locale) => [
  `prisma/seed-reth-openhl-consensus-${locale}.ts`,
  `prisma/seed-reth-openhl-clob-${locale}.ts`,
  `prisma/seed-reth-openhl-precompiles-${locale}.ts`,
  `prisma/seed-reth-openhl-funding-${locale}.ts`,
  `prisma/seed-reth-openhl-liquidation-${locale}.ts`,
  `prisma/seed-reth-openhl-adl-${locale}.ts`,
  `prisma/seed-reth-foundry-${locale}.ts`,
  `prisma/seed-reth-perp-primer-${locale}.ts`,
]);

console.log('Checking generated seed files are up to date...');
if (!existsSync('drafts')) {
  console.log('SKIP: drafts/ directory not found. Seed files are treated as source-of-truth.');
  process.exit(0);
}
const before = new Map(generatedTargets.map((p) => [p, digest(p)]));
for (const command of buildCommands) {
  run(command);
}

const touched = generatedTargets.filter((p) => before.get(p) !== digest(p));
if (touched.length > 0) {
  console.error('\nGenerated seed files are out of date.');
  console.error('These files changed after running builders:');
  for (const path of touched) console.error(`- ${path}`);
  console.error('\nRun builder scripts and commit updated prisma/seed-reth-*.ts files.');
  process.exit(1);
}

console.log('\nOK: generated seed files are up to date.');
