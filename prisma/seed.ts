import { PrismaClient } from '@prisma/client';
import { seedRethBeginnerJA } from './seed-reth-beginner-ja';
import { seedRethBeginnerEN } from './seed-reth-beginner-en';
import { seedRethBeginnerV2JA } from './seed-reth-beginner-v2-ja';
import { seedRethBeginnerV2EN } from './seed-reth-beginner-v2-en';
import { seedRethFundamentalsJA } from './seed-reth-fundamentals-ja';
import { seedRethFundamentalsEN } from './seed-reth-fundamentals-en';
import { seedRethBridgeToAdvancedEN } from './seed-reth-bridge-to-advanced-en';
import { seedRethBridgeToAdvancedJA } from './seed-reth-bridge-to-advanced-ja';
import { seedRethAlloyAdvancedEN } from './seed-reth-alloy-advanced-en';
import { seedRethAlloyAdvancedJA } from './seed-reth-alloy-advanced-ja';
import { seedRethAlloyAdvancedV2JA } from './seed-reth-alloy-advanced-v2-ja';
import { seedRethRevmAdvancedEN } from './seed-reth-revm-advanced-en';
import { seedRethRevmAdvancedJA } from './seed-reth-revm-advanced-ja';
import { seedRethRevmAdvancedV2JA } from './seed-reth-revm-advanced-v2-ja';
import { seedRethAdvancedJA } from './seed-reth-advanced-ja';
import { seedRethAdvancedEN } from './seed-reth-advanced-en';
import { seedRethAdvancedV2JA } from './seed-reth-advanced-v2-ja';
import { seedRethExpertJA } from './seed-reth-expert-ja';
import { seedRethExpertEN } from './seed-reth-expert-en';
import { seedRethBuildingEN } from './seed-reth-building-en';
import { seedRethBuildingJA } from './seed-reth-building-ja';
import { seedRethConsensusEngineeringEN } from './seed-reth-consensus-engineering-en';
import { seedRethConsensusEngineeringJA } from './seed-reth-consensus-engineering-ja';
import { seedRethConsensusEngineeringV2JA } from './seed-reth-consensus-engineering-v2-ja';
import { seedRethCrossChainBridgesEN } from './seed-reth-cross-chain-bridges-en';
import { seedRethCrossChainBridgesJA } from './seed-reth-cross-chain-bridges-ja';
import { seedRethSequencerRollupEN } from './seed-reth-sequencer-rollup-en';
import { seedRethSequencerRollupJA } from './seed-reth-sequencer-rollup-ja';
import { seedRethP2PNetworkingEN } from './seed-reth-p2p-networking-en';
import { seedRethP2PNetworkingJA } from './seed-reth-p2p-networking-ja';
import { seedRethValidatorOpsEN } from './seed-reth-validator-ops-en';
import { seedRethValidatorOpsJA } from './seed-reth-validator-ops-ja';
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
import { seedRethOpenHlConsensusV2JA } from './seed-reth-openhl-consensus-v2-ja';
import { seedRethOpenHlConsensusV3JA } from './seed-reth-openhl-consensus-v3-ja';
import { seedRethOpenHlClobEN } from './seed-reth-openhl-clob-en';
import { seedRethOpenHlClobJA } from './seed-reth-openhl-clob-ja';
import { seedRethOpenHlPrecompilesEN } from './seed-reth-openhl-precompiles-en';
import { seedRethOpenHlPrecompilesJA } from './seed-reth-openhl-precompiles-ja';
import { seedRethOpenHlFundingEN } from './seed-reth-openhl-funding-en';
import { seedRethOpenHlFundingJA } from './seed-reth-openhl-funding-ja';
import { seedRethOpenHlLiquidationEN } from './seed-reth-openhl-liquidation-en';
import { seedRethOpenHlLiquidationJA } from './seed-reth-openhl-liquidation-ja';
import { seedRethOpenHlAdlEN } from './seed-reth-openhl-adl-en';
import { seedRethOpenHlAdlJA } from './seed-reth-openhl-adl-ja';
import { seedRethOpenHlAdlV3JA } from './seed-reth-openhl-adl-v3-ja';
import { seedRethOpenHlClobV3JA } from './seed-reth-openhl-clob-v3-ja';
import { seedRethOpenHlPrecompilesV3JA } from './seed-reth-openhl-precompiles-v3-ja';
import { seedRethOpenHlFundingV3JA } from './seed-reth-openhl-funding-v3-ja';
import { seedRethOpenHlLiquidationV3JA } from './seed-reth-openhl-liquidation-v3-ja';
import { seedRethBuildingV3JA } from './seed-reth-building-v3-ja';
import { seedRethConsensusEngineeringV3JA } from './seed-reth-consensus-engineering-v3-ja';
import { seedRethExpertV3JA } from './seed-reth-expert-v3-ja';
import { seedRethSequencerRollupV3JA } from './seed-reth-sequencer-rollup-v3-ja';
import { seedRethCrossChainBridgesV3JA } from './seed-reth-cross-chain-bridges-v3-ja';
import { seedRethP2PNetworkingV3JA } from './seed-reth-p2p-networking-v3-ja';
import { seedRethValidatorOpsV3JA } from './seed-reth-validator-ops-v3-ja';
import { seedRethAdvancedV3JA } from './seed-reth-advanced-v3-ja';
import { seedRethFoundryEN } from './seed-reth-foundry-en';
import { seedRethFoundryJA } from './seed-reth-foundry-ja';
import { seedRethFoundryV2JA } from './seed-reth-foundry-v2-ja';
import { seedRethPerpPrimerEN } from './seed-reth-perp-primer-en';
import { seedRethPerpPrimerJA } from './seed-reth-perp-primer-ja';

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
  await seedRethBeginnerJA(prisma);
  await seedRethBeginnerV2EN(prisma);
  await seedRethBeginnerV2JA(prisma);
  console.log('  Seeded Beginner (EN + JA)');

  console.log('\nSeeding Fundamentals courses...');
  await seedRethFundamentalsEN(prisma);
  await seedRethFundamentalsJA(prisma);
  console.log('  Seeded Fundamentals (EN + JA)');

  console.log('\nSeeding Bridge to Advanced courses...');
  await seedRethBridgeToAdvancedEN(prisma);
  await seedRethBridgeToAdvancedJA(prisma);
  console.log('  Seeded Bridge to Advanced (EN + JA)');

  console.log('\nSeeding Alloy Advanced course (EN + JA draft, isPublished=false)...');
  await seedRethAlloyAdvancedEN(prisma);
  await seedRethAlloyAdvancedJA(prisma);
  await seedRethAlloyAdvancedV2JA(prisma);
  console.log('  Seeded Alloy Advanced (EN + JA draft)');

  console.log('\nSeeding Revm Advanced courses...');
  await seedRethRevmAdvancedEN(prisma);
  await seedRethRevmAdvancedJA(prisma);
  await seedRethRevmAdvancedV2JA(prisma);
  console.log('  Seeded Revm Advanced (EN + JA)');

  console.log('\nSeeding Reth Advanced courses...');
  await seedRethAdvancedEN(prisma);
  await seedRethAdvancedJA(prisma);
  await seedRethAdvancedV2JA(prisma);
  console.log('  Seeded Reth Advanced (EN + JA)');

  console.log('\nSeeding Expert courses...');
  await seedRethExpertEN(prisma);
  await seedRethExpertJA(prisma);
  console.log('  Seeded Expert (EN + JA)');

  console.log('\nSeeding Building courses...');
  await seedRethBuildingEN(prisma);
  await seedRethBuildingJA(prisma);
  console.log('  Seeded Building (EN + JA)');

  console.log('\nSeeding Consensus Engineering courses...');
  await seedRethConsensusEngineeringEN(prisma);
  await seedRethConsensusEngineeringJA(prisma);
  await seedRethConsensusEngineeringV2JA(prisma);
  console.log('  Seeded Consensus Engineering (EN + JA)');

  console.log('\nSeeding Cross-Chain Bridges courses...');
  await seedRethCrossChainBridgesEN(prisma);
  await seedRethCrossChainBridgesJA(prisma);
  console.log('  Seeded Cross-Chain Bridges (EN + JA)');

  console.log('\nSeeding Sequencer & Rollup Architecture courses...');
  await seedRethSequencerRollupEN(prisma);
  await seedRethSequencerRollupJA(prisma);
  console.log('  Seeded Sequencer & Rollup (EN + JA)');

  console.log('\nSeeding P2P Networking courses...');
  await seedRethP2PNetworkingEN(prisma);
  await seedRethP2PNetworkingJA(prisma);
  console.log('  Seeded P2P Networking (EN + JA)');

  console.log('\nSeeding Validator Operations courses...');
  await seedRethValidatorOpsEN(prisma);
  await seedRethValidatorOpsJA(prisma);
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
  await seedRethOpenHlConsensusV2JA(prisma);
  await seedRethOpenHlConsensusV3JA(prisma);
  console.log('  Seeded Building OpenHL — Consensus Substrate (EN + JA)');
  await seedRethOpenHlClobEN(prisma);
  await seedRethOpenHlClobJA(prisma);
  console.log('  Seeded Building OpenHL — CLOB matching engine (EN + JA)');
  await seedRethOpenHlPrecompilesEN(prisma);
  await seedRethOpenHlPrecompilesJA(prisma);
  console.log('  Seeded Building OpenHL — Precompiles (EN + JA)');
  await seedRethOpenHlFundingEN(prisma);
  await seedRethOpenHlFundingJA(prisma);
  console.log('  Seeded Building OpenHL — Funding (EN + JA)');
  await seedRethOpenHlLiquidationEN(prisma);
  await seedRethOpenHlLiquidationJA(prisma);
  console.log('  Seeded Building OpenHL — Liquidation (EN + JA)');
  await seedRethOpenHlAdlEN(prisma);
  await seedRethOpenHlAdlJA(prisma);
  await seedRethOpenHlAdlV3JA(prisma);
  await seedRethOpenHlClobV3JA(prisma);
  await seedRethOpenHlPrecompilesV3JA(prisma);
  await seedRethOpenHlFundingV3JA(prisma);
  await seedRethOpenHlLiquidationV3JA(prisma);
  await seedRethBuildingV3JA(prisma);
  await seedRethConsensusEngineeringV3JA(prisma);
  await seedRethExpertV3JA(prisma);
  await seedRethSequencerRollupV3JA(prisma);
  await seedRethCrossChainBridgesV3JA(prisma);
  await seedRethP2PNetworkingV3JA(prisma);
  await seedRethValidatorOpsV3JA(prisma);
  await seedRethAdvancedV3JA(prisma);
  console.log('  Seeded Building OpenHL — ADL (EN + JA)');
  await seedRethFoundryEN(prisma);
  await seedRethFoundryJA(prisma);
  await seedRethFoundryV2JA(prisma);
  console.log('  Seeded Mastering Foundry (EN + JA)');
  await seedRethPerpPrimerEN(prisma);
  await seedRethPerpPrimerJA(prisma);
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
