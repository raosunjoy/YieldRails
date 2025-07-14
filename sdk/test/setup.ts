import { jest } from '@jest/globals';

// Mock environment variables for SDK testing
process.env.NODE_ENV = 'test';

// Mock external dependencies
jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn(),
  Wallet: jest.fn(),
  Contract: jest.fn(),
  formatEther: jest.fn(),
  parseEther: jest.fn(),
  formatUnits: jest.fn(),
  parseUnits: jest.fn(),
}));

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('ws', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1, // WebSocket.OPEN
  }));
});

// Global test setup
beforeAll(() => {
  process.env.TZ = 'UTC';
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  throw reason;
});

jest.setTimeout(10000);