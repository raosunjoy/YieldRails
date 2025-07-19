/**
 * Tests for YieldRailsSDK
 */

import { YieldRailsSDK } from '../yieldrails-sdk';
import { ApiClient } from '../client/api-client';
import { WebSocketClient } from '../client/websocket-client';
import { ContractHelper } from '../blockchain/contract-helper';
import { SDKConfig, ChainName } from '../types/common';
import { ethers } from 'ethers';

// Mock dependencies
jest.mock('../client/api-client');
jest.mock('../client/websocket-client');
jest.mock('../services/auth');
jest.mock('../services/payment');
jest.mock('../services/yield');
jest.mock('../services/crosschain');
jest.mock('../services/compliance');
jest.mock('../blockchain/contract-helper');
jest.mock('ethers');

const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
const MockedWebSocketClient = WebSocketClient as jest.MockedClass<typeof WebSocketClient>;
const MockedContractHelper = ContractHelper as jest.MockedClass<typeof ContractHelper>;

describe('YieldRailsSDK', () => {
  let sdk: YieldRailsSDK;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockWebSocketClient: jest.Mocked<WebSocketClient>;
  let mockContractHelper: jest.Mocked<ContractHelper>;

  const config: SDKConfig = {
    apiUrl: 'https://api.yieldrails.com',
    apiKey: 'test-api-key',
    timeout: 30000,
    debug: false,
  };

  beforeEach(() => {
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      getConfig: jest.fn().mockReturnValue(config),
      updateConfig: jest.fn(),
      setAccessToken: jest.fn(),
      clearAccessToken: jest.fn(),
    } as any;

    mockWebSocketClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn().mockReturnValue(false),
      on: jest.fn(),
      off: jest.fn(),
    } as any;
    
    mockContractHelper = {
      initContract: jest.fn().mockReturnValue({}),
      initContractOnChain: jest.fn().mockReturnValue({}),
      getProvider: jest.fn(),
      getExplorerUrl: jest.fn().mockReturnValue('https://etherscan.io/tx/0xabc123'),
      waitForTransaction: jest.fn().mockResolvedValue({ status: 1 }),
      readContract: jest.fn(),
      writeContract: jest.fn(),
    } as any;

    MockedApiClient.mockImplementation(() => mockApiClient);
    MockedWebSocketClient.mockImplementation(() => mockWebSocketClient);
    MockedContractHelper.mockImplementation(() => mockContractHelper);

    sdk = new YieldRailsSDK(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct config', () => {
      expect(MockedApiClient).toHaveBeenCalledWith(config);
      expect(sdk.auth).toBeDefined();
      expect(sdk.payments).toBeDefined();
      expect(sdk.yield).toBeDefined();
      expect(sdk.crosschain).toBeDefined();
      expect(sdk.compliance).toBeDefined();
      expect(sdk.blockchain).toBeDefined();
    });
  });

  describe('WebSocket management', () => {
    it('should initialize WebSocket client', () => {
      const wsConfig = {
        reconnect: true,
        maxReconnectAttempts: 3,
      };

      const wsClient = sdk.initializeWebSocket(wsConfig);

      expect(MockedWebSocketClient).toHaveBeenCalledWith({
        url: 'wss://api.yieldrails.com/ws',
        reconnect: true,
        maxReconnectAttempts: 3,
      });
      expect(wsClient).toBe(mockWebSocketClient);
    });

    it('should get WebSocket client', () => {
      sdk.initializeWebSocket();
      const wsClient = sdk.getWebSocketClient();
      expect(wsClient).toBe(mockWebSocketClient);
    });

    it('should return undefined if WebSocket not initialized', () => {
      const wsClient = sdk.getWebSocketClient();
      expect(wsClient).toBeUndefined();
    });

    it('should connect WebSocket', async () => {
      sdk.initializeWebSocket();
      mockWebSocketClient.connect.mockResolvedValue();

      await sdk.connectWebSocket();

      expect(mockWebSocketClient.connect).toHaveBeenCalledWith(undefined);
    });

    it('should throw error if WebSocket not initialized when connecting', async () => {
      await expect(sdk.connectWebSocket()).rejects.toThrow(
        'WebSocket not initialized. Call initializeWebSocket() first.'
      );
    });

    it('should disconnect WebSocket', () => {
      sdk.initializeWebSocket();
      sdk.disconnectWebSocket();

      expect(mockWebSocketClient.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect when WebSocket not initialized', () => {
      // Should not throw error
      sdk.disconnectWebSocket();
    });
  });

  describe('configuration management', () => {
    it('should update config', () => {
      const updates = {
        timeout: 60000,
        debug: true,
      };

      sdk.updateConfig(updates);

      expect(mockApiClient.updateConfig).toHaveBeenCalledWith(updates);
    });

    it('should get current config', () => {
      const currentConfig = sdk.getConfig();

      expect(mockApiClient.getConfig).toHaveBeenCalled();
      expect(currentConfig).toEqual(config);
    });
  });

  describe('authentication', () => {
    it('should check authentication status', () => {
      // Mock auth service
      const mockAuthService = {
        isAuthenticated: jest.fn().mockReturnValue(true),
      };
      (sdk as any).auth = mockAuthService;

      const isAuth = sdk.isAuthenticated();

      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(isAuth).toBe(true);
    });

    it('should enable auto token refresh', () => {
      const mockAuthService = {
        ensureValidToken: jest.fn().mockResolvedValue(undefined),
      };
      (sdk as any).auth = mockAuthService;

      // Mock setInterval
      const mockSetInterval = jest.spyOn(global, 'setInterval');

      sdk.enableAutoTokenRefresh();

      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 60000);

      // Clean up
      mockSetInterval.mockRestore();
    });

    it('should restore session', () => {
      const mockAuthService = {
        setTokens: jest.fn(),
      };
      (sdk as any).auth = mockAuthService;

      sdk.restoreSession('access-token', 'refresh-token', 3600);

      expect(mockAuthService.setTokens).toHaveBeenCalledWith(
        'access-token',
        'refresh-token',
        3600
      );
    });

    it('should logout and disconnect WebSocket', async () => {
      const mockAuthService = {
        logout: jest.fn().mockResolvedValue(undefined),
      };
      (sdk as any).auth = mockAuthService;

      sdk.initializeWebSocket();
      mockWebSocketClient.disconnect.mockImplementation(() => {});

      await sdk.logout();

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockWebSocketClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should return SDK version', () => {
      const version = sdk.getVersion();
      expect(version).toBe('0.2.0');
    });

    it('should return supported chains', () => {
      const chains = sdk.getSupportedChains();
      expect(chains).toEqual(['ethereum', 'polygon', 'arbitrum', 'base', 'xrpl', 'solana']);
    });

    it('should return supported tokens', () => {
      const tokens = sdk.getSupportedTokens();
      expect(tokens).toEqual(['USDC', 'USDT', 'EURC', 'RLUSD']);
    });

    it('should validate payment request successfully', () => {
      const validRequest = {
        merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        amount: '100.00',
        token: 'USDC' as any,
        chain: 'ethereum' as any,
      };

      const validation = sdk.validatePaymentRequest(validRequest);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should validate payment request with errors', () => {
      const invalidRequest = {
        merchantAddress: 'invalid-address',
        amount: '0',
        token: 'INVALID' as any,
        chain: 'invalid' as any,
      };

      const validation = sdk.validatePaymentRequest(invalidRequest);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Valid amount is required');
      expect(validation.errors).toContain('Supported token is required');
      expect(validation.errors).toContain('Supported chain is required');
      expect(validation.errors).toContain('Invalid merchant address format');
    });

    it('should create payment with validation', async () => {
      const validRequest = {
        merchantAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        amount: '100.00',
        token: 'USDC' as any,
        chain: 'ethereum' as any,
      };

      const mockPayment = { id: 'payment-123', ...validRequest };
      const mockPaymentService = {
        createPayment: jest.fn().mockResolvedValue(mockPayment),
      };
      (sdk as any).payments = mockPaymentService;

      const result = await sdk.createPaymentWithValidation(validRequest);

      expect(mockPaymentService.createPayment).toHaveBeenCalledWith(validRequest);
      expect(result).toEqual(mockPayment);
    });

    it('should throw error for invalid payment request', async () => {
      const invalidRequest = {
        merchantAddress: '',
        amount: '0',
        token: 'INVALID' as any,
        chain: 'invalid' as any,
      };

      await expect(sdk.createPaymentWithValidation(invalidRequest)).rejects.toThrow(
        'Payment validation failed:'
      );
    });

    it('should get payments in batch', async () => {
      const paymentIds = ['payment-1', 'payment-2', 'payment-3'];
      const mockPayments = [
        { id: 'payment-1', amount: '100' },
        { id: 'payment-2', amount: '200' },
      ];

      const mockPaymentService = {
        getPayment: jest.fn()
          .mockResolvedValueOnce(mockPayments[0])
          .mockResolvedValueOnce(mockPayments[1])
          .mockRejectedValueOnce(new Error('Payment not found')),
      };
      (sdk as any).payments = mockPaymentService;

      const result = await sdk.getPaymentsBatch(paymentIds);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.successful).toEqual(mockPayments);
      expect(result.failed[0]).toHaveProperty('error');
      expect(result.failed[0]).toHaveProperty('id', 'payment-3');
    });

    it('should perform health check', async () => {
      const mockAuthService = {
        isAuthenticated: jest.fn().mockReturnValue(true),
      };
      (sdk as any).auth = mockAuthService;

      mockApiClient.get.mockResolvedValue({ status: 'ok' });
      sdk.initializeWebSocket();
      mockWebSocketClient.isConnected.mockReturnValue(true);

      const health = await sdk.healthCheck();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/health');
      expect(health).toEqual({
        api: true,
        websocket: true,
        authenticated: true,
        timestamp: expect.any(String),
      });
    });

    it('should handle health check API failure', async () => {
      const mockAuthService = {
        isAuthenticated: jest.fn().mockReturnValue(false),
      };
      (sdk as any).auth = mockAuthService;

      mockApiClient.get.mockRejectedValue(new Error('API Error'));

      const health = await sdk.healthCheck();

      expect(health).toEqual({
        api: false,
        websocket: false,
        authenticated: false,
        timestamp: expect.any(String),
      });
    });

    it('should handle health check without WebSocket', async () => {
      const mockAuthService = {
        isAuthenticated: jest.fn().mockReturnValue(false),
      };
      (sdk as any).auth = mockAuthService;

      mockApiClient.get.mockResolvedValue({ status: 'ok' });

      const health = await sdk.healthCheck();

      expect(health).toEqual({
        api: true,
        websocket: false,
        authenticated: false,
        timestamp: expect.any(String),
      });
    });

    it('should get dashboard data', async () => {
      const mockPaymentAnalytics = {
        totalVolume: '10000',
        totalYieldGenerated: '250',
        completionRate: 0.95,
      };
      const mockYieldMetrics = {
        averageAPY: '5.5',
      };
      const mockPaymentHistory = {
        payments: [{ id: 'payment-1' }, { id: 'payment-2' }],
      };

      const mockPaymentService = {
        getPaymentAnalytics: jest.fn().mockResolvedValue(mockPaymentAnalytics),
        getPaymentHistory: jest.fn().mockResolvedValue(mockPaymentHistory),
      };
      const mockYieldService = {
        getPerformanceMetrics: jest.fn().mockResolvedValue(mockYieldMetrics),
      };

      (sdk as any).payments = mockPaymentService;
      (sdk as any).yield = mockYieldService;

      const result = await sdk.getDashboardData('month');

      expect(result.timeframe).toBe('month');
      expect(result.payments).toEqual(mockPaymentAnalytics);
      expect(result.yield).toEqual(mockYieldMetrics);
      expect(result.recentPayments).toEqual(mockPaymentHistory.payments);
      expect(result.summary.totalVolume).toBe('10000');
      expect(result.summary.averageAPY).toBe('5.5');
    });

    it('should estimate yield for payment', async () => {
      const mockStrategies = [
        { id: 'strategy-1', name: 'Strategy 1', expectedAPY: '5.0', riskLevel: 'LOW' },
        { id: 'strategy-2', name: 'Strategy 2', expectedAPY: '7.0', riskLevel: 'MEDIUM' },
      ];
      const mockCalculations = [
        { estimatedYield: '12.50' },
        { estimatedYield: '17.50' },
      ];

      const mockYieldService = {
        getStrategies: jest.fn().mockResolvedValue(mockStrategies),
        calculateYield: jest.fn()
          .mockResolvedValueOnce(mockCalculations[0])
          .mockResolvedValueOnce(mockCalculations[1]),
      };

      (sdk as any).yield = mockYieldService;

      const result = await sdk.estimateYieldForPayment('1000', 'USDC', 30);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        strategy: 'Strategy 1',
        strategyId: 'strategy-1',
        expectedAPY: '5.0',
        estimatedYield: '12.50',
        riskLevel: 'LOW',
      });
      expect(result[1]).toEqual({
        strategy: 'Strategy 2',
        strategyId: 'strategy-2',
        expectedAPY: '7.0',
        estimatedYield: '17.50',
        riskLevel: 'MEDIUM',
      });
    });
  });

  describe('blockchain methods', () => {
    it('should initialize contract', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9';
      const abi = [{ name: 'test', type: 'function' }];
      
      sdk.initContract('test-contract', address, abi);
      
      expect(mockContractHelper.initContract).toHaveBeenCalledWith(
        'test-contract',
        { address, abi, signer: undefined }
      );
    });
    
    it('should initialize contract on specific chain', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9';
      const abi = [{ name: 'test', type: 'function' }];
      const chain = ChainName.ethereum;
      
      sdk.initContract('test-contract', address, abi, chain);
      
      expect(mockContractHelper.initContractOnChain).toHaveBeenCalledWith(
        'test-contract',
        chain,
        address,
        abi,
        undefined
      );
    });
    
    it('should connect wallet', async () => {
      const mockProvider = {
        getSigner: jest.fn().mockResolvedValue('signer')
      } as any;
      
      const signer = await sdk.connectWallet(mockProvider);
      
      expect(mockProvider.getSigner).toHaveBeenCalled();
      expect(signer).toBe('signer');
    });
    
    it('should get transaction explorer URL', () => {
      const url = sdk.getTransactionExplorerUrl(ChainName.ethereum, '0xabc123');
      
      expect(mockContractHelper.getExplorerUrl).toHaveBeenCalledWith(
        ChainName.ethereum,
        '0xabc123'
      );
      expect(url).toBe('https://etherscan.io/tx/0xabc123');
    });
    
    it('should wait for transaction confirmation', async () => {
      const receipt = await sdk.waitForTransaction(
        ChainName.ethereum,
        '0xabc123',
        2
      );
      
      expect(mockContractHelper.waitForTransaction).toHaveBeenCalledWith(
        ChainName.ethereum,
        '0xabc123',
        2
      );
      expect(receipt).toEqual({ status: 1 });
    });
  });

  describe('error handling', () => {
    it('should handle auto token refresh errors gracefully', async () => {
      const mockAuthService = {
        ensureValidToken: jest.fn().mockRejectedValue(new Error('Refresh failed')),
      };
      (sdk as any).auth = mockAuthService;

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockSetInterval = jest.spyOn(global, 'setInterval');

      sdk.enableAutoTokenRefresh();

      // Trigger the interval callback
      const intervalCallback = mockSetInterval.mock.calls[0][0] as Function;
      await intervalCallback();

      expect(consoleSpy).toHaveBeenCalledWith('Auto token refresh failed:', expect.any(Error));

      // Clean up
      consoleSpy.mockRestore();
      mockSetInterval.mockRestore();
    });
    
    it('should handle wallet connection errors', async () => {
      const mockProvider = {
        getSigner: jest.fn().mockRejectedValue(new Error('Connection failed'))
      } as any;
      
      await expect(sdk.connectWallet(mockProvider)).rejects.toThrow(
        'Failed to connect wallet: Connection failed'
      );
    });
  });
});