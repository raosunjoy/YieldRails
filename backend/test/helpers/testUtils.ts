import { Request, Response } from 'express';
import { jest } from '@jest/globals';

/**
 * Test utilities for backend testing
 */

export interface MockRequest extends Partial<Request> {
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
  user?: any;
}

export interface MockResponse extends Partial<Response> {
  status: jest.MockedFunction<any>;
  json: jest.MockedFunction<any>;
  send: jest.MockedFunction<any>;
  cookie: jest.MockedFunction<any>;
  clearCookie: jest.MockedFunction<any>;
}

/**
 * Create a mock Express request object
 */
export const createMockRequest = (options: MockRequest = {}): MockRequest => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...options,
  };
};

/**
 * Create a mock Express response object
 */
export const createMockResponse = (): MockResponse => {
  const res: MockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
};

/**
 * Create a mock next function
 */
export const createMockNext = () => jest.fn();

/**
 * Database test utilities
 */
export class DatabaseTestUtils {
  /**
   * Clean all test data from database
   */
  static async cleanDatabase() {
    // Implementation would depend on your database setup
    // This is a placeholder for actual database cleanup
    console.log('Cleaning test database...');
  }

  /**
   * Seed test data
   */
  static async seedTestData() {
    // Implementation would depend on your database setup
    // This is a placeholder for test data seeding
    console.log('Seeding test data...');
  }
}

/**
 * Mock blockchain utilities
 */
export class BlockchainTestUtils {
  /**
   * Create mock contract instance
   */
  static createMockContract() {
    return {
      address: '0x1234567890123456789012345678901234567890',
      interface: {
        encodeFunctionData: jest.fn(),
        decodeFunctionResult: jest.fn(),
      },
      connect: jest.fn().mockReturnThis(),
      deployed: jest.fn().mockResolvedValue(true),
      // Add common contract methods
      balanceOf: jest.fn(),
      transfer: jest.fn(),
      approve: jest.fn(),
      deposit: jest.fn(),
      withdraw: jest.fn(),
    };
  }

  /**
   * Create mock wallet
   */
  static createMockWallet() {
    return {
      address: '0x1234567890123456789012345678901234567890',
      privateKey: '0x0123456789012345678901234567890123456789012345678901234567890123',
      connect: jest.fn().mockReturnThis(),
      getBalance: jest.fn().mockResolvedValue('1000000000000000000'), // 1 ETH
      signTransaction: jest.fn(),
      sendTransaction: jest.fn(),
    };
  }

  /**
   * Create mock provider
   */
  static createMockProvider() {
    return {
      getNetwork: jest.fn().mockResolvedValue({ chainId: 1, name: 'mainnet' }),
      getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
      getTransactionCount: jest.fn().mockResolvedValue(0),
      estimateGas: jest.fn().mockResolvedValue('21000'),
      getGasPrice: jest.fn().mockResolvedValue('20000000000'),
      sendTransaction: jest.fn(),
      waitForTransaction: jest.fn(),
    };
  }
}

/**
 * API test utilities
 */
export class ApiTestUtils {
  /**
   * Create test JWT token
   */
  static createTestToken(payload: any = {}) {
    // This would use your actual JWT signing logic
    return 'test-jwt-token';
  }

  /**
   * Create test user data
   */
  static createTestUser(overrides: any = {}) {
    return {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create test payment data
   */
  static createTestPayment(overrides: any = {}) {
    return {
      id: '1',
      amount: '100.00',
      currency: 'USDC',
      status: 'pending',
      merchantId: '1',
      userId: '1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
}

/**
 * Time utilities for testing
 */
export class TimeTestUtils {
  /**
   * Mock Date.now() to return a fixed timestamp
   */
  static mockCurrentTime(timestamp: number) {
    const mockDate = new Date(timestamp);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
    jest.spyOn(Date, 'now').mockReturnValue(timestamp);
  }

  /**
   * Restore original Date implementation
   */
  static restoreTime() {
    jest.restoreAllMocks();
  }

  /**
   * Sleep for testing async operations
   */
  static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Error testing utilities
 */
export class ErrorTestUtils {
  /**
   * Create a test error with specific properties
   */
  static createTestError(message: string, code?: string, statusCode?: number) {
    const error = new Error(message) as any;
    if (code) error.code = code;
    if (statusCode) error.statusCode = statusCode;
    return error;
  }

  /**
   * Assert that a function throws a specific error
   */
  static async expectToThrow(fn: () => Promise<any>, expectedError: string | RegExp) {
    await expect(fn()).rejects.toThrow(expectedError);
  }
}

/**
 * Redis test utilities
 */
export class RedisTestUtils {
  /**
   * Create mock Redis client
   */
  static createMockRedisClient() {
    return {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      flushall: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }
}

/**
 * WebSocket test utilities
 */
export class WebSocketTestUtils {
  /**
   * Create mock WebSocket server
   */
  static createMockWebSocketServer() {
    return {
      on: jest.fn(),
      emit: jest.fn(),
      close: jest.fn(),
      clients: new Set(),
    };
  }

  /**
   * Create mock WebSocket client
   */
  static createMockWebSocketClient() {
    return {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1, // WebSocket.OPEN
    };
  }
}