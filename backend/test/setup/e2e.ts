import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// E2E test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/yieldrails_e2e_test';
process.env.REDIS_URL = 'redis://localhost:6379/3';
process.env.JWT_SECRET = 'e2e-test-jwt-secret-key';
process.env.LOG_LEVEL = 'error';
process.env.PORT = '3001'; // Use different port for E2E tests
process.env.CHAINALYSIS_API_KEY = 'test-chainalysis-key';
process.env.CIRCLE_API_KEY = 'test-circle-key';
process.env.MOONPAY_API_KEY = 'test-moonpay-key';

// Shared resources
let prisma: PrismaClient;
let redis: Redis;

// Global setup for E2E tests
beforeAll(async () => {
  process.env.TZ = 'UTC';
  
  console.log('🚀 Setting up E2E test environment...');
  
  // Initialize database and Redis clients
  prisma = new PrismaClient();
  redis = new Redis(process.env.REDIS_URL);
  
  try {
    // Ensure database is clean
    await cleanDatabase();
    
    // Apply migrations
    await execAsync('npx prisma migrate deploy', { env: process.env });
    console.log('✅ Database migrations applied');
    
    // Seed test data if needed
    await seedTestData();
    console.log('✅ Test data seeded');
  } catch (error) {
    console.error('❌ E2E setup error:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  
  try {
    // Clean up test data
    await cleanDatabase();
    
    // Close connections
    await prisma.$disconnect();
    await redis.quit();
    
    console.log('✅ E2E test environment cleanup complete');
  } catch (error) {
    console.error('❌ E2E cleanup error:', error);
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Increase timeout for E2E tests
jest.setTimeout(60000);

// Helper functions
async function cleanDatabase() {
  // Clean up test data
  const tables = [
    'Payment',
    'YieldEarning',
    'CrossChainTransaction',
    'ComplianceCheck',
    'YieldStrategy',
    'User'
  ];
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (error) {
      console.warn(`⚠️ Could not truncate ${table}:`, error);
    }
  }
  
  // Clear Redis cache
  await redis.flushdb();
}

async function seedTestData() {
  // Create test yield strategies
  await prisma.yieldStrategy.createMany({
    data: [
      {
        id: 'noble-tbill',
        name: 'Noble T-Bill Strategy',
        protocolName: 'Noble',
        chainId: '1',
        contractAddress: '0x1234567890123456789012345678901234567890',
        strategyType: 'TREASURY_BILLS',
        expectedAPY: '4.5',
        riskLevel: 'LOW',
        totalValueLocked: '1000000',
        isActive: true
      },
      {
        id: 'aave-lending',
        name: 'Aave Lending Strategy',
        protocolName: 'Aave',
        chainId: '1',
        contractAddress: '0x2345678901234567890123456789012345678901',
        strategyType: 'LENDING',
        expectedAPY: '3.2',
        riskLevel: 'MEDIUM',
        totalValueLocked: '500000',
        isActive: true
      },
      {
        id: 'resolv-delta-neutral',
        name: 'Resolv Delta-Neutral Strategy',
        protocolName: 'Resolv',
        chainId: '1',
        contractAddress: '0x3456789012345678901234567890123456789012',
        strategyType: 'YIELD_FARMING',
        expectedAPY: '8.5',
        riskLevel: 'HIGH',
        totalValueLocked: '250000',
        isActive: true
      }
    ]
  });
}