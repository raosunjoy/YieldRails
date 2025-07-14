import { jest } from '@jest/globals';

// Integration test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/yieldrails_integration_test';
process.env.REDIS_URL = 'redis://localhost:6379/2';
process.env.JWT_SECRET = 'integration-test-jwt-secret-key';
process.env.LOG_LEVEL = 'warn';

// Mock external services for integration tests
jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn(),
  Wallet: jest.fn(),
  Contract: jest.fn(),
  formatEther: jest.fn(),
  parseEther: jest.fn()
}));

// Global setup for integration tests
beforeAll(async () => {
  process.env.TZ = 'UTC';
  // Additional integration test setup can go here
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(30000);