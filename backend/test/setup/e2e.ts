import { jest } from '@jest/globals';

// E2E test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/yieldrails_e2e_test';
process.env.REDIS_URL = 'redis://localhost:6379/3';
process.env.JWT_SECRET = 'e2e-test-jwt-secret-key';
process.env.LOG_LEVEL = 'error';
process.env.PORT = '3001'; // Use different port for E2E tests

// Global setup for E2E tests
beforeAll(async () => {
  process.env.TZ = 'UTC';
  // E2E test setup - start test server, etc.
});

afterAll(async () => {
  // E2E test cleanup
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Increase timeout for E2E tests
jest.setTimeout(60000);