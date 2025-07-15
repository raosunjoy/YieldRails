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
    const deployedMock = jest.fn() as jest.MockedFunction<any>;
    deployedMock.mockResolvedValue(true);
    
    return {
      address: '0x1234567890123456789012345678901234567890',
      interface: {
        encodeFunctionData: jest.fn() as jest.MockedFunction<any>,
        decodeFunctionResult: jest.fn() as jest.MockedFunction<any>,
      },
      connect: jest.fn().mockReturnThis(),
      deployed: deployedMock,
      // Add common contract methods
      balanceOf: jest.fn() as jest.MockedFunction<any>,
      transfer: jest.fn() as jest.MockedFunction<any>,
      approve: jest.fn() as jest.MockedFunction<any>,
      deposit: jest.fn() as jest.MockedFunction<any>,
      withdraw: jest.fn() as jest.MockedFunction<any>,
    };
  }

  /**
   * Create mock wallet
   */
  static createMockWallet() {
    const getBalanceMock = jest.fn() as jest.MockedFunction<any>;
    getBalanceMock.mockResolvedValue('1000000000000000000'); // 1 ETH
    
    return {
      address: '0x1234567890123456789012345678901234567890',
      privateKey: '0x0123456789012345678901234567890123456789012345678901234567890123',
      connect: jest.fn().mockReturnThis(),
      getBalance: getBalanceMock,
      signTransaction: jest.fn() as jest.MockedFunction<any>,
      sendTransaction: jest.fn() as jest.MockedFunction<any>,
    };
  }

  /**
   * Create mock provider
   */
  static createMockProvider() {
    const getNetworkMock = jest.fn() as jest.MockedFunction<any>;
    const getBalanceMock = jest.fn() as jest.MockedFunction<any>;
    const getTransactionCountMock = jest.fn() as jest.MockedFunction<any>;
    const estimateGasMock = jest.fn() as jest.MockedFunction<any>;
    const getGasPriceMock = jest.fn() as jest.MockedFunction<any>;
    
    getNetworkMock.mockResolvedValue({ chainId: 1, name: 'mainnet' });
    getBalanceMock.mockResolvedValue('1000000000000000000');
    getTransactionCountMock.mockResolvedValue(0);
    estimateGasMock.mockResolvedValue('21000');
    getGasPriceMock.mockResolvedValue('20000000000');
    
    return {
      getNetwork: getNetworkMock,
      getBalance: getBalanceMock,
      getTransactionCount: getTransactionCountMock,
      estimateGas: estimateGasMock,
      getGasPrice: getGasPriceMock,
      sendTransaction: jest.fn() as jest.MockedFunction<any>,
      waitForTransaction: jest.fn() as jest.MockedFunction<any>,
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
      get: jest.fn() as jest.MockedFunction<any>,
      set: jest.fn() as jest.MockedFunction<any>,
      del: jest.fn() as jest.MockedFunction<any>,
      exists: jest.fn() as jest.MockedFunction<any>,
      expire: jest.fn() as jest.MockedFunction<any>,
      ttl: jest.fn() as jest.MockedFunction<any>,
      flushall: jest.fn() as jest.MockedFunction<any>,
      quit: jest.fn() as jest.MockedFunction<any>,
      on: jest.fn() as jest.MockedFunction<any>,
      connect: jest.fn() as jest.MockedFunction<any>,
      disconnect: jest.fn() as jest.MockedFunction<any>,
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