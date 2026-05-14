import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(__dirname, '../../.env.production.local'), override: true });

import { PrismaClient } from '@prisma/client';
const dbUrl = new URL(process.env.DATABASE_URL!);
dbUrl.searchParams.set('connect_timeout', '60');
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl.toString() } } });

// Phrases that exist only in the NEW (polished) JA prose, not the old (translation-ese) version.
const NEW_PHRASES = [
  '同じ手順を要求してきます',     // was: "同じダンスを強要してくる"
  'この前提を変えます',           // was: "この契約を変える"
  '本レッスンでは、3 つのソースを並行して読んでいきます',  // was: "本レッスンはソースを読む" (grammatical error)
  '期待値を正しく持つ',           // was: "適切にヘッジする"
  '全権の鍵は渡さず',             // was: "王国の鍵は渡すな"
  'そのまま機能します',           // was: "Just Works"
];

const OLD_PHRASES = [
  '同じダンスを強要',
  '本レッスンはソースを読む:',
  '王国の鍵',
  'Just Works',
];

async function main() {
  const lesson = await prisma.lesson.findFirst({
    where: { slug: 'build-mpp-payments-ja' },
    select: { content: true, updatedAt: true },
  });
  if (!lesson) {
    console.log('NOT FOUND');
    return;
  }
  console.log(`Updated at: ${lesson.updatedAt.toISOString()}\n`);
  console.log('NEW (polished) phrases — should all be present:');
  for (const p of NEW_PHRASES) {
    const ok = lesson.content.includes(p);
    console.log(`  ${ok ? '✓' : '❌'}  ${p}`);
  }
  console.log('\nOLD (translation-ese) phrases — should all be ABSENT:');
  for (const p of OLD_PHRASES) {
    const gone = !lesson.content.includes(p);
    console.log(`  ${gone ? '✓' : '❌ STILL PRESENT'}  ${p}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
