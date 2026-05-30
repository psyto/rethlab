import { PrismaClient } from '@prisma/client';
import { seedRethBeginnerEN } from './seed-reth-beginner-en';
import { seedRethFundamentalsEN } from './seed-reth-fundamentals-en';
import { seedRethBridgeToAdvancedEN } from './seed-reth-bridge-to-advanced-en';
import { seedRethAlloyAdvancedEN } from './seed-reth-alloy-advanced-en';
import { seedRethRevmAdvancedEN } from './seed-reth-revm-advanced-en';
import { seedRethAdvancedEN } from './seed-reth-advanced-en';
import { seedRethExpertEN } from './seed-reth-expert-en';
import { seedRethBuildingEN } from './seed-reth-building-en';
import { seedRethConsensusEngineeringEN } from './seed-reth-consensus-engineering-en';
import { seedRethCrossChainBridgesEN } from './seed-reth-cross-chain-bridges-en';
import { seedRethSequencerRollupEN } from './seed-reth-sequencer-rollup-en';
import { seedRethP2PNetworkingEN } from './seed-reth-p2p-networking-en';
import { seedRethValidatorOpsEN } from './seed-reth-validator-ops-en';
import { seedRethValidatorOpsBootcampEN } from './seed-reth-validator-ops-bootcamp-en';
import { seedRethValidatorOpsBootcampJA } from './seed-reth-validator-ops-bootcamp-ja';
import { seedRethConsensusEconomicsEN } from './seed-reth-consensus-economics-en';
import { seedRethConsensusEconomicsJA } from './seed-reth-consensus-economics-ja';
import { seedRethMultinodeTestnetEN } from './seed-reth-multinode-testnet-en';
import { seedRethMultinodeTestnetJA } from './seed-reth-multinode-testnet-ja';
import { seedRethPerformanceCapacityEN } from './seed-reth-performance-capacity-en';
import { seedRethPerformanceCapacityJA } from './seed-reth-performance-capacity-ja';
import { seedRethSecurityGovernanceEN } from './seed-reth-security-governance-en';
import { seedRethSecurityGovernanceJA } from './seed-reth-security-governance-ja';
import { seedRethOpenHlConsensusEN } from './seed-reth-openhl-consensus-en';
import { seedRethOpenHlConsensusJA } from './seed-reth-openhl-consensus-ja';
import { seedRethOpenHlClobEN } from './seed-reth-openhl-clob-en';
import { seedRethOpenHlPrecompilesEN } from './seed-reth-openhl-precompiles-en';
import { seedRethOpenHlFundingEN } from './seed-reth-openhl-funding-en';
import { seedRethOpenHlLiquidationEN } from './seed-reth-openhl-liquidation-en';
import { seedRethOpenHlAdlEN } from './seed-reth-openhl-adl-en';
import { seedRethOpenHlAdlJA } from './seed-reth-openhl-adl-ja';
import { seedRethOpenHlClobJA } from './seed-reth-openhl-clob-ja';
import { seedRethOpenHlPrecompilesJA } from './seed-reth-openhl-precompiles-ja';
import { seedRethOpenHlFundingJA } from './seed-reth-openhl-funding-ja';
import { seedRethOpenHlLiquidationJA } from './seed-reth-openhl-liquidation-ja';
import { seedRethBuildingJA } from './seed-reth-building-ja';
import { seedRethConsensusEngineeringJA } from './seed-reth-consensus-engineering-ja';
import { seedRethExpertJA } from './seed-reth-expert-ja';
import { seedRethSequencerRollupJA } from './seed-reth-sequencer-rollup-ja';
import { seedRethCrossChainBridgesJA } from './seed-reth-cross-chain-bridges-ja';
import { seedRethP2PNetworkingJA } from './seed-reth-p2p-networking-ja';
import { seedRethValidatorOpsJA } from './seed-reth-validator-ops-ja';
import { seedRethAdvancedJA } from './seed-reth-advanced-ja';
import { seedRethAlloyAdvancedJA } from './seed-reth-alloy-advanced-ja';
import { seedRethRevmAdvancedJA } from './seed-reth-revm-advanced-ja';
import { seedRethFoundryJA } from './seed-reth-foundry-ja';
import { seedRethPerpPrimerJA } from './seed-reth-perp-primer-ja';
import { seedRethFundamentalsJA } from './seed-reth-fundamentals-ja';
import { seedRethBeginnerJA } from './seed-reth-beginner-ja';
import { seedRethBridgeToAdvancedJA } from './seed-reth-bridge-to-advanced-ja';
import { seedRethFoundryEN } from './seed-reth-foundry-en';
import { seedRethPerpPrimerEN } from './seed-reth-perp-primer-en';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding RethLab database...');

  // Clear existing data
  await prisma.xPEvent.deleteMany();
  await prisma.streakDay.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // Dev user
  const devUser = await prisma.user.create({
    data: {
      name: 'Dev User',
      displayName: 'RethDev',
      email: 'dev@rethlab.com',
      totalXP: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
  });

  console.log('\nSeeding Beginner courses...');
  await seedRethBeginnerEN(prisma);
  console.log('  Seeded Beginner (EN + JA)');

  console.log('\nSeeding Fundamentals courses...');
  await seedRethFundamentalsEN(prisma);
  console.log('  Seeded Fundamentals (EN + JA)');

  console.log('\nSeeding Bridge to Advanced courses...');
  await seedRethBridgeToAdvancedEN(prisma);
  console.log('  Seeded Bridge to Advanced (EN + JA)');

  console.log('\nSeeding Alloy Advanced course (EN + JA draft, isPublished=false)...');
  await seedRethAlloyAdvancedEN(prisma);
  console.log('  Seeded Alloy Advanced (EN + JA draft)');

  console.log('\nSeeding Revm Advanced courses...');
  await seedRethRevmAdvancedEN(prisma);
  console.log('  Seeded Revm Advanced (EN + JA)');

  console.log('\nSeeding Reth Advanced courses...');
  await seedRethAdvancedEN(prisma);
  console.log('  Seeded Reth Advanced (EN + JA)');

  console.log('\nSeeding Expert courses...');
  await seedRethExpertEN(prisma);
  console.log('  Seeded Expert (EN + JA)');

  console.log('\nSeeding Building courses...');
  await seedRethBuildingEN(prisma);
  console.log('  Seeded Building (EN + JA)');

  console.log('\nSeeding Consensus Engineering courses...');
  await seedRethConsensusEngineeringEN(prisma);
  console.log('  Seeded Consensus Engineering (EN + JA)');

  console.log('\nSeeding Cross-Chain Bridges courses...');
  await seedRethCrossChainBridgesEN(prisma);
  console.log('  Seeded Cross-Chain Bridges (EN + JA)');

  console.log('\nSeeding Sequencer & Rollup Architecture courses...');
  await seedRethSequencerRollupEN(prisma);
  console.log('  Seeded Sequencer & Rollup (EN + JA)');

  console.log('\nSeeding P2P Networking courses...');
  await seedRethP2PNetworkingEN(prisma);
  console.log('  Seeded P2P Networking (EN + JA)');

  console.log('\nSeeding Validator Operations courses...');
  await seedRethValidatorOpsEN(prisma);
  console.log('  Seeded Validator Operations (EN + JA)');

  console.log('\nSeeding L1 Professionalization extension courses (EN + JA drafts)...');
  await seedRethValidatorOpsBootcampEN(prisma);
  await seedRethValidatorOpsBootcampJA(prisma);
  console.log('  Seeded Validator Ops Bootcamp (EN + JA)');
  await seedRethConsensusEconomicsEN(prisma);
  await seedRethConsensusEconomicsJA(prisma);
  console.log('  Seeded Consensus Economics & Slashing Lab (EN + JA)');
  await seedRethMultinodeTestnetEN(prisma);
  await seedRethMultinodeTestnetJA(prisma);
  console.log('  Seeded Multi-Node Devnet to Testnet (EN + JA)');
  await seedRethPerformanceCapacityEN(prisma);
  await seedRethPerformanceCapacityJA(prisma);
  console.log('  Seeded Performance & Capacity Engineering (EN + JA)');
  await seedRethSecurityGovernanceEN(prisma);
  await seedRethSecurityGovernanceJA(prisma);
  console.log('  Seeded Production Security & Governance (EN + JA)');

  console.log('\nSeeding Building OpenHL courses (EN + JA, both isPublished=false)...');
  await seedRethOpenHlConsensusEN(prisma);
  await seedRethOpenHlConsensusJA(prisma);
  console.log('  Seeded Building OpenHL — Consensus Substrate (EN + JA)');
  await seedRethOpenHlClobEN(prisma);
  console.log('  Seeded Building OpenHL — CLOB matching engine (EN + JA)');
  await seedRethOpenHlPrecompilesEN(prisma);
  console.log('  Seeded Building OpenHL — Precompiles (EN + JA)');
  await seedRethOpenHlFundingEN(prisma);
  console.log('  Seeded Building OpenHL — Funding (EN + JA)');
  await seedRethOpenHlLiquidationEN(prisma);
  console.log('  Seeded Building OpenHL — Liquidation (EN + JA)');
  await seedRethOpenHlAdlEN(prisma);
  await seedRethOpenHlAdlJA(prisma);
  await seedRethOpenHlClobJA(prisma);
  await seedRethOpenHlPrecompilesJA(prisma);
  await seedRethOpenHlFundingJA(prisma);
  await seedRethOpenHlLiquidationJA(prisma);
  await seedRethBuildingJA(prisma);
  await seedRethConsensusEngineeringJA(prisma);
  await seedRethExpertJA(prisma);
  await seedRethSequencerRollupJA(prisma);
  await seedRethCrossChainBridgesJA(prisma);
  await seedRethP2PNetworkingJA(prisma);
  await seedRethValidatorOpsJA(prisma);
  await seedRethAdvancedJA(prisma);
  await seedRethAlloyAdvancedJA(prisma);
  await seedRethRevmAdvancedJA(prisma);
  await seedRethFoundryJA(prisma);
  await seedRethPerpPrimerJA(prisma);
  await seedRethFundamentalsJA(prisma);
  await seedRethBeginnerJA(prisma);
  await seedRethBridgeToAdvancedJA(prisma);
  console.log('  Seeded Building OpenHL — ADL (EN + JA)');
  await seedRethFoundryEN(prisma);
  console.log('  Seeded Mastering Foundry (EN + JA)');
  await seedRethPerpPrimerEN(prisma);
  console.log('  Seeded Perp DEX Primer (EN + JA)');

  const courseCount = await prisma.course.count();
  const moduleCount = await prisma.module.count();
  const lessonCount = await prisma.lesson.count();
  console.log(`\nTotal courses: ${courseCount}`);
  console.log(`Total modules: ${moduleCount}`);
  console.log(`Total lessons: ${lessonCount}`);
  console.log(`Dev user: ${devUser.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\nSeeding complete!');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
