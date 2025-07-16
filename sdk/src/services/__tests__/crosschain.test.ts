/**
 * Tests for CrossChainService
 */

import { CrossChainService } from '../crosschain';
import { ApiClient } from '../../client/api-client';
import {
  BridgeRequest,
  BridgeTransaction,
  BridgeEstimate,
  LiquidityInfo,
  BridgeStatus,
} from '../../types/crosschain';
import { ChainName, TokenSymbol } from '../../types/common';

// Mock ApiClient
jest.mock('../../client/api-client');
const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe('CrossChainService', () => {
  let crossChainService: CrossChainService;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;

    MockedApiClient.mockImplementation(() => mockApiClient);
    crossChainService = new CrossChainService(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateBridge', () => {
    it('should initiate a cross-chain bridge transaction', async () => {
      const request: BridgeRequest = {
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        amount: '500.00',
        token: TokenSymbol.USDC,
        sourceChain: ChainName.ethereum,
        destinationChain: ChainName.polygon,
        metadata: {
          purpose: 'Cross-chain payment',
        },
      };

      const mockTransaction: BridgeTransaction = {
        id: 'bridge-tx-1',
        userId: 'user-1',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        amount: '500.00',
        token: TokenSymbol.USDC,
        sourceChain: ChainName.ethereum,
        destinationChain: ChainName.polygon,
        status: BridgeStatus.INITIATED,
        bridgeFee: '5.00',
        estimatedYield: '2.50',
        estimatedDuration: 300,
        metadata: {
          purpose: 'Cross-chain payment',
        },
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValue(mockTransaction);

      const result = await crossChainService.initiateBridge(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/crosschain/bridge', request);
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('getBridgeTransaction', () => {
    it('should get bridge transaction by ID', async () => {
      const mockTransaction: BridgeTransaction = {
        id: 'bridge-tx-1',
        userId: 'user-1',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        amount: '500.00',
        token: TokenSymbol.USDC,
        sourceChain: ChainName.ethereum,
        destinationChain: ChainName.polygon,
        status: BridgeStatus.COMPLETED,
        sourceTransactionHash: '0xabc123...',
        destinationTransactionHash: '0xdef456...',
        bridgeFee: '5.00',
        estimatedYield: '2.50',
        actualYield: '2.45',
        estimatedDuration: 300,
        actualDuration: 285,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:05:00Z',
        completedAt: '2023-01-01T00:05:00Z',
      };

      mockApiClient.get.mockResolvedValue(mockTransaction);

      const result = await crossChainService.getBridgeTransaction('bridge-tx-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/crosschain/transactions/bridge-tx-1');
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('getBridgeHistory', () => {
    it('should get bridge transaction history without filters', async () => {
      const mockHistory = {
        data: [
          {
            id: 'bridge-tx-1',
            userId: 'user-1',
            recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
            amount: '500.00',
            token: TokenSymbol.USDC,
            sourceChain: ChainName.ethereum,
            destinationChain: ChainName.polygon,
            status: BridgeStatus.COMPLETED,
            bridgeFee: '5.00',
            estimatedYield: '2.50',
            actualYield: '2.45',
            estimatedDuration: 300,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:05:00Z',
          },
        ],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      mockApiClient.get.mockResolvedValue(mockHistory);

      const result = await crossChainService.getBridgeHistory();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/crosschain/transactions');
      expect(result).toEqual(mockHistory);
    });

    it('should get bridge transaction history with filters', async () => {
      const params = {
        limit: 5,
        offset: 10,
        status: BridgeStatus.COMPLETED,
        sourceChain: ChainName.ethereum,
        destinationChain: ChainName.polygon,
        fromDate: '2023-01-01',
        toDate: '2023-12-31',
      };

      const mockHistory = {
        data: [],
        total: 0,
        limit: 5,
        offset: 10,
        hasMore: false,
      };

      mockApiClient.get.mockResolvedValue(mockHistory);

      const result = await crossChainService.getBridgeHistory(params);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/crosschain/transactions?limit=5&offset=10&status=COMPLETED&sourceChain=ethereum&destinationChain=polygon&fromDate=2023-01-01&toDate=2023-12-31'
      );
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getBridgeEstimate', () => {
    it('should get bridge fee and time estimate', async () => {
      const mockEstimate: BridgeEstimate = {
        fee: '5.00',
        estimatedDuration: 300,
        estimatedYield: '2.50',
        route: [
          {
            chain: ChainName.ethereum,
            protocol: 'Circle CCTP',
            estimatedTime: 150,
          },
          {
            chain: ChainName.polygon,
            protocol: 'Circle CCTP',
            estimatedTime: 150,
          },
        ],
      };

      mockApiClient.post.mockResolvedValue(mockEstimate);

      const result = await crossChainService.getBridgeEstimate(
        ChainName.ethereum,
        ChainName.polygon,
        TokenSymbol.USDC,
        '500.00'
      );

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/crosschain/estimate', {
        sourceChain: ChainName.ethereum,
        destinationChain: ChainName.polygon,
        token: TokenSymbol.USDC,
        amount: '500.00',
      });
      expect(result).toEqual(mockEstimate);
    });
  });

  describe('checkLiquidity', () => {
    it('should check liquidity availability for bridge', async () => {
      const mockLiquidity: LiquidityInfo = {
        chain: ChainName.polygon,
        token: TokenSymbol.USDC,
        availableLiquidity: '1000000.00',
        utilizationRate: '75.5',
        isAvailable: true,
      };

      mockApiClient.post.mockResolvedValue(mockLiquidity);

      const result = await crossChainService.checkLiquidity(
        ChainName.polygon,
        TokenSymbol.USDC,
        '1000.00'
      );

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/crosschain/liquidity/check', {
        chain: ChainName.polygon,
        token: TokenSymbol.USDC,
        amount: '1000.00',
      });
      expect(result).toEqual(mockLiquidity);
    });

    it('should check liquidity availability without amount', async () => {
      const mockLiquidity: LiquidityInfo = {
        chain: ChainName.polygon,
        token: TokenSymbol.USDC,
        availableLiquidity: '1000000.00',
        utilizationRate: '75.5',
        isAvailable: true,
      };

      mockApiClient.post.mockResolvedValue(mockLiquidity);

      const result = await crossChainService.checkLiquidity(
        ChainName.polygon,
        TokenSymbol.USDC
      );

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/crosschain/liquidity/check', {
        chain: ChainName.polygon,
        token: TokenSymbol.USDC,
        amount: undefined,
      });
      expect(result).toEqual(mockLiquidity);
    });
  });

  describe('getSupportedRoutes', () => {
    it('should get supported bridge routes', async () => {
      const mockRoutes = [
        {
          sourceChain: ChainName.ethereum,
          destinationChain: ChainName.polygon,
          supportedTokens: [TokenSymbol.USDC, TokenSymbol.USDT],
          estimatedDuration: 300,
          isActive: true,
        },
        {
          sourceChain: ChainName.ethereum,
          destinationChain: ChainName.arbitrum,
          supportedTokens: [TokenSymbol.USDC],
          estimatedDuration: 600,
          isActive: true,
        },
      ];

      mockApiClient.get.mockResolvedValue(mockRoutes);

      const result = await crossChainService.getSupportedRoutes();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/crosschain/routes');
      expect(result).toEqual(mockRoutes);
    });
  });

  describe('cancelBridge', () => {
    it('should cancel a pending bridge transaction', async () => {
      const mockTransaction: BridgeTransaction = {
        id: 'bridge-tx-1',
        userId: 'user-1',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        amount: '500.00',
        token: TokenSymbol.USDC,
        sourceChain: ChainName.ethereum,
        destinationChain: ChainName.polygon,
        status: BridgeStatus.REFUNDED,
        bridgeFee: '5.00',
        estimatedYield: '2.50',
        estimatedDuration: 300,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:02:00Z',
      };

      mockApiClient.post.mockResolvedValue(mockTransaction);

      const result = await crossChainService.cancelBridge('bridge-tx-1', 'User requested cancellation');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/crosschain/transaction/bridge-tx-1/cancel', {
        reason: 'User requested cancellation',
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should cancel bridge transaction without reason', async () => {
      const mockTransaction: BridgeTransaction = {
        id: 'bridge-tx-1',
        userId: 'user-1',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        amount: '500.00',
        token: TokenSymbol.USDC,
        sourceChain: ChainName.ethereum,
        destinationChain: ChainName.polygon,
        status: BridgeStatus.REFUNDED,
        bridgeFee: '5.00',
        estimatedYield: '2.50',
        estimatedDuration: 300,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:02:00Z',
      };

      mockApiClient.post.mockResolvedValue(mockTransaction);

      const result = await crossChainService.cancelBridge('bridge-tx-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/crosschain/transaction/bridge-tx-1/cancel', {
        reason: undefined,
      });
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('retryBridge', () => {
    it('should retry a failed bridge transaction', async () => {
      const mockTransaction: BridgeTransaction = {
        id: 'bridge-tx-1',
        userId: 'user-1',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
        amount: '500.00',
        token: TokenSymbol.USDC,
        sourceChain: ChainName.ethereum,
        destinationChain: ChainName.polygon,
        status: BridgeStatus.PROCESSING,
        bridgeFee: '5.00',
        estimatedYield: '2.50',
        estimatedDuration: 300,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:10:00Z',
      };

      mockApiClient.post.mockResolvedValue(mockTransaction);

      const result = await crossChainService.retryBridge('bridge-tx-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/crosschain/transaction/bridge-tx-1/retry');
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('getBridgeEvents', () => {
    it('should get bridge transaction events', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          type: 'bridge:initiated',
          data: {
            transactionId: 'bridge-tx-1',
            sourceChain: 'ethereum',
            destinationChain: 'polygon',
          },
          createdAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 'event-2',
          type: 'bridge:validated',
          data: {
            transactionId: 'bridge-tx-1',
            validators: 3,
          },
          createdAt: '2023-01-01T00:02:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValue(mockEvents);

      const result = await crossChainService.getBridgeEvents('bridge-tx-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/crosschain/transactions/bridge-tx-1/events');
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getBridgeAnalytics', () => {
    it('should get bridge analytics without date filters', async () => {
      const mockAnalytics = {
        totalTransactions: 150,
        completedTransactions: 142,
        failedTransactions: 8,
        totalVolume: '750000.00',
        totalFees: '7500.00',
        totalYieldGenerated: '3750.00',
        averageCompletionTime: 285,
        routePerformance: [
          {
            sourceChain: ChainName.ethereum,
            destinationChain: ChainName.polygon,
            transactionCount: 75,
            successRate: 0.96,
            averageTime: 280,
          },
        ],
      };

      mockApiClient.get.mockResolvedValue(mockAnalytics);

      const result = await crossChainService.getBridgeAnalytics();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/crosschain/analytics');
      expect(result).toEqual(mockAnalytics);
    });

    it('should get bridge analytics with date filters', async () => {
      const fromDate = '2023-01-01';
      const toDate = '2023-12-31';

      const mockAnalytics = {
        totalTransactions: 150,
        completedTransactions: 142,
        failedTransactions: 8,
        totalVolume: '750000.00',
        totalFees: '7500.00',
        totalYieldGenerated: '3750.00',
        averageCompletionTime: 285,
        routePerformance: [],
      };

      mockApiClient.get.mockResolvedValue(mockAnalytics);

      const result = await crossChainService.getBridgeAnalytics(fromDate, toDate);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/crosschain/analytics?fromDate=2023-01-01&toDate=2023-12-31'
      );
      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('getBridgeStatus', () => {
    it('should get real-time bridge status', async () => {
      const mockStatus = {
        totalLiquidity: '10000000.00',
        activeRoutes: 6,
        averageCompletionTime: 285,
        systemHealth: 'healthy' as const,
        chainStatus: [
          {
            chain: ChainName.ethereum,
            isActive: true,
            blockHeight: 18500000,
            lastUpdate: '2023-01-01T00:00:00Z',
          },
          {
            chain: ChainName.polygon,
            isActive: true,
            blockHeight: 48500000,
            lastUpdate: '2023-01-01T00:00:00Z',
          },
        ],
      };

      mockApiClient.get.mockResolvedValue(mockStatus);

      const result = await crossChainService.getBridgeStatus();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/crosschain/status');
      expect(result).toEqual(mockStatus);
    });
  });
});