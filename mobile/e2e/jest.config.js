module.exports = {
  preset: '@testing-library/react-native',
  testEnvironment: 'node',
  testTimeout: 120000,
  testMatch: ['<rootDir>/**/*.e2e.js', '<rootDir>/**/*.e2e.ts'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/init.js'],
  verbose: true,
  reporters: ['default', 'jest-junit'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    '../src/**/*.{js,jsx,ts,tsx}',
    '!../src/**/*.d.ts',
    '!../src/utils/testSetup.ts',
    '!../src/**/index.ts',
  ],
};