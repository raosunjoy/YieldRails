const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'E2E Tests',
  testMatch: ['**/test/e2e/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup/e2e.ts'],
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/test/setup/globalTeardown.ts',
  maxWorkers: 1, // Run E2E tests sequentially
  testTimeout: 60000, // 60 seconds for E2E tests
  collectCoverage: false, // Don't collect coverage for E2E tests
  verbose: true
};