/**
 * Tests for YieldService
 */

import { YieldService } from '../yield';
import { ApiClient } from '../../client/api-client';
import {
  YieldStrategy,
  YieldEarning,
  YieldOptimizationRequest,
  YieldOptimizationResponse,
  YieldPerformanceMetrics,
  YieldStatus,
  YieldStrategyType,
  RiskLevel,
} from '../../types/yield';
import { TokenSymbol, ChainName } from '../../types/common';

// Mock ApiClient
jest.mock('../../client/api-client');
const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe('YieldService', () => {
  let yieldService: YieldService;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;

    MockedApiClient.mockImplementation(() => mockApiClient);
    yieldService = new YieldService(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStrategies', () => {
    it('should get all available yield strategies', async () => {
      const mockStrategies: YieldStrategy[] = [
        {
          id: 'strategy-1',
          name: 'Noble T-Bills',
          description: 'US Treasury Bills via Noble',
          protocolName: 'Noble',
          chainId: '1',
          contractAddress: '0x123...',
          strategyType: YieldStrategyType.TREASURY_BILLS,
          expectedAPY: '4.5',
          riskLevel: RiskLevel.LOW,
          minAmount: '100',
          maxAmount: '1000000',
          isActive: true,
          strategyConfig: {},
          totalValueLocked: '50000000',
          actualAPY: '4.3',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 'strategy-2',
          name: 'Aave Lending',
          description: 'USDC lending on Aave',
          protocolName: 'Aave',
          chainId: '1',
          contractAddress: '0x456...',
          strategyType: YieldStrategyType.LENDING,
          expectedAPY: '3.2',
          riskLevel: RiskLevel.MEDIUM,
          minAmount: '50',
          isActive: true,
          strategyConfig: {},
          totalValueLocked: '25000000',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValue(mockStrategies);

      const result = await yieldService.getStrategies();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/yield/strategies');
      expect(result).toEqual(mockStrategies);
    });
  });

  describe('getStrategy', () => {
    it('should get specific yield strategy by ID', async () => {
      const mockStrategy: YieldStrategy = {
        id: 'strategy-1',
        name: 'Noble T-Bills',
        protocolName: 'Noble',
        chainId: '1',
        contractAddress: '0x123...',
        strategyType: YieldStrategyType.TREASURY_BILLS,
        expectedAPY: '4.5',
        riskLevel: RiskLevel.LOW,
        minAmount: '100',
        isActive: true,
        strategyConfig: {},
        totalValueLocked: '50000000',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      mockApiClient.get.mockResolvedValue(mockStrategy);

      const result = await yieldService.getStrategy('strategy-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/yield/strategies/strategy-1');
      expect(result).toEqual(mockStrategy);
    });
  });

  describe('optimizeYield', () => {
    it('should get yield optimization recommendations', async () => {
      const request: YieldOptimizationRequest = {
        amount: '1000',
        token: TokenSymbol.USDC,
        chain: ChainName.ethereum,
        riskTolerance: RiskLevel.MEDIUM,
        duration: 30,
      };

      const mockResponse: YieldOptimizationResponse = {
        recommendedStrategy: {
          id: 'strategy-1',
          name: 'Noble T-Bills',
          protocolName: 'Noble',
          chainId: '1',
          contractAddress: '0x123...',
          strategyType: YieldStrategyType.TREASURY_BILLS,
          expectedAPY: '4.5',
          riskLevel: RiskLevel.LOW,
          minAmount: '100',
          isActive: true,
          strategyConfig: {},
          totalValueLocked: '50000000',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        estimatedAPY: '4.5',
        estimatedYield: '37.50',
        riskScore: 2,
        alternatives: [],
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await yieldService.optimizeYield(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/yield/optimize', request);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getEarnings', () => {
    it('should get user yield earnings without filters', async () => {
      const mockEarnings = {
        data: [
          {
            id: 'earning-1',
            userId: 'user-1',
            paymentId: 'payment-1',
            strategyId: 'strategy-1',
            principalAmount: '1000',
            yieldAmount: '37.50',
            netYieldAmount: '35.00',
            tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b1d4c',
            tokenSymbol: TokenSymbol.USDC,
            startTime: '2023-01-01T00:00:00Z',
            endTime: '2023-01-31T00:00:00Z',
            status: YieldStatus.COMPLETED,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-31T00:00:00Z',
          },
        ],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      mockApiClient.get.mockResolvedValue(mockEarnings);

      const result = await yieldService.getEarnings();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/yield/earnings');
      expect(result).toEqual(mockEarnings);
    });

    it('should get user yield earnings with filters', async () => {
      const params = {
        limit: 5,
        offset: 10,
        status: YieldStatus.ACTIVE,
        strategyId: 'strategy-1',
        fromDate: '2023-01-01',
        toDate: '2023-12-31',
      };

      const mockEarnings = {
        data: [],
        total: 0,
        limit: 5,
        offset: 10,
        hasMore: false,
      };

      mockApiClient.get.mockResolvedValue(mockEarnings);

      const result = await yieldService.getEarnings(params);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/yield/earnings?limit=5&offset=10&status=ACTIVE&strategyId=strategy-1&fromDate=2023-01-01&toDate=2023-12-31'
      );
      expect(result).toEqual(mockEarnings);
    });
  });

  describe('getEarning', () => {
    it('should get specific yield earning by ID', async () => {
      const mockEarning: YieldEarning = {
        id: 'earning-1',
        userId: 'user-1',
        paymentId: 'payment-1',
        strategyId: 'strategy-1',
        principalAmount: '1000',
        yieldAmount: '37.50',
        netYieldAmount: '35.00',
        tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b1d4c',
        tokenSymbol: TokenSymbol.USDC,
        startTime: '2023-01-01T00:00:00Z',
        status: YieldStatus.COMPLETED,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-31T00:00:00Z',
      };

      mockApiClient.get.mockResolvedValue(mockEarning);

      const result = await yieldService.getEarning('earning-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/yield/earnings/earning-1');
      expect(result).toEqual(mockEarning);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should get yield performance metrics without date filters', async () => {
      const mockMetrics: YieldPerformanceMetrics = {
        totalEarned: '1250.75',
        totalPrincipal: '25000.00',
        averageAPY: '4.2',
        bestPerformingStrategy: {
          strategyId: 'strategy-1',
          name: 'Noble T-Bills',
          apy: '4.5',
        },
        earningsByStrategy: [
          {
            strategyId: 'strategy-1',
            name: 'Noble T-Bills',
            totalEarned: '750.50',
            apy: '4.5',
            paymentCount: 15,
          },
        ],
        earningsByToken: [
          {
            token: TokenSymbol.USDC,
            totalEarned: '1250.75',
            paymentCount: 20,
          },
        ],
      };

      mockApiClient.get.mockResolvedValue(mockMetrics);

      const result = await yieldService.getPerformanceMetrics();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/yield/performance');
      expect(result).toEqual(mockMetrics);
    });

    it('should get yield performance metrics with date filters', async () => {
      const fromDate = '2023-01-01';
      const toDate = '2023-12-31';

      mockApiClient.get.mockResolvedValue({} as YieldPerformanceMetrics);

      await yieldService.getPerformanceMetrics(fromDate, toDate);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/yield/performance?fromDate=2023-01-01&toDate=2023-12-31'
      );
    });
  });

  describe('startYieldGeneration', () => {
    it('should start yield generation for a payment', async () => {
      const mockEarning: YieldEarning = {
        id: 'earning-1',
        userId: 'user-1',
        paymentId: 'payment-1',
        strategyId: 'strategy-1',
        principalAmount: '1000',
        yieldAmount: '0',
        netYieldAmount: '0',
        tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b1d4c',
        tokenSymbol: TokenSymbol.USDC,
        startTime: '2023-01-01T00:00:00Z',
        status: YieldStatus.ACTIVE,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValue(mockEarning);

      const result = await yieldService.startYieldGeneration('payment-1', 'strategy-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/yield/payment/payment-1/start', {
        strategyId: 'strategy-1',
      });
      expect(result).toEqual(mockEarning);
    });

    it('should start yield generation without specific strategy', async () => {
      const mockEarning: YieldEarning = {
        id: 'earning-1',
        userId: 'user-1',
        paymentId: 'payment-1',
        strategyId: 'auto-selected',
        principalAmount: '1000',
        yieldAmount: '0',
        netYieldAmount: '0',
        tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b1d4c',
        tokenSymbol: TokenSymbol.USDC,
        startTime: '2023-01-01T00:00:00Z',
        status: YieldStatus.ACTIVE,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValue(mockEarning);

      const result = await yieldService.startYieldGeneration('payment-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/yield/payment/payment-1/start', {
        strategyId: undefined,
      });
      expect(result).toEqual(mockEarning);
    });
  });

  describe('stopYieldGeneration', () => {
    it('should stop yield generation for a payment', async () => {
      const mockEarning: YieldEarning = {
        id: 'earning-1',
        userId: 'user-1',
        paymentId: 'payment-1',
        strategyId: 'strategy-1',
        principalAmount: '1000',
        yieldAmount: '37.50',
        netYieldAmount: '35.00',
        tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b1d4c',
        tokenSymbol: TokenSymbol.USDC,
        startTime: '2023-01-01T00:00:00Z',
        endTime: '2023-01-31T00:00:00Z',
        status: YieldStatus.COMPLETED,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-31T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValue(mockEarning);

      const result = await yieldService.stopYieldGeneration('payment-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/yield/payment/payment-1/stop');
      expect(result).toEqual(mockEarning);
    });
  });

  describe('withdrawYield', () => {
    it('should withdraw yield earnings', async () => {
      const mockWithdrawal = {
        transactionHash: '0xabc123...',
        amount: '35.00',
        fee: '2.50',
        netAmount: '32.50',
      };

      mockApiClient.post.mockResolvedValue(mockWithdrawal);

      const result = await yieldService.withdrawYield('earning-1', '35.00');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/yield/earnings/earning-1/withdraw', {
        amount: '35.00',
      });
      expect(result).toEqual(mockWithdrawal);
    });

    it('should withdraw all yield earnings when amount not specified', async () => {
      const mockWithdrawal = {
        transactionHash: '0xabc123...',
        amount: '35.00',
        fee: '2.50',
        netAmount: '32.50',
      };

      mockApiClient.post.mockResolvedValue(mockWithdrawal);

      const result = await yieldService.withdrawYield('earning-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/yield/earnings/earning-1/withdraw', {
        amount: undefined,
      });
      expect(result).toEqual(mockWithdrawal);
    });
  });

  describe('getStrategyPerformance', () => {
    it('should get strategy performance history with default period', async () => {
      const mockPerformance = [
        {
          date: '2023-01-01',
          apy: '4.5',
          tvl: '50000000',
          volume: '1000000',
        },
        {
          date: '2023-01-02',
          apy: '4.6',
          tvl: '51000000',
          volume: '1100000',
        },
      ];

      mockApiClient.get.mockResolvedValue(mockPerformance);

      const result = await yieldService.getStrategyPerformance('strategy-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/yield/strategies/strategy-1/performance?period=month');
      expect(result).toEqual(mockPerformance);
    });

    it('should get strategy performance history with custom period', async () => {
      const mockPerformance = [
        {
          date: '2023-01-01',
          apy: '4.5',
          tvl: '50000000',
          volume: '1000000',
        },
      ];

      mockApiClient.get.mockResolvedValue(mockPerformance);

      const result = await yieldService.getStrategyPerformance('strategy-1', 'week');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/yield/strategies/strategy-1/performance?period=week');
      expect(result).toEqual(mockPerformance);
    });
  });

  describe('compareStrategies', () => {
    it('should compare multiple strategies', async () => {
      const strategyIds = ['strategy-1', 'strategy-2'];
      const amount = '1000';
      const duration = 30;

      const mockComparison = [
        {
          strategyId: 'strategy-1',
          strategy: {
            id: 'strategy-1',
            name: 'Noble T-Bills',
            protocolName: 'Noble',
            chainId: '1',
            contractAddress: '0x123...',
            strategyType: YieldStrategyType.TREASURY_BILLS,
            expectedAPY: '4.5',
            riskLevel: RiskLevel.LOW,
            minAmount: '100',
            isActive: true,
            strategyConfig: {},
            totalValueLocked: '50000000',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
          estimatedYield: '37.50',
          estimatedAPY: '4.5',
          riskScore: 2,
          projectedEarnings: [
            {
              day: 1,
              cumulativeYield: '1.25',
              dailyYield: '1.25',
            },
          ],
        },
      ];

      mockApiClient.post.mockResolvedValue(mockComparison);

      const result = await yieldService.compareStrategies(strategyIds, amount, duration);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/yield/strategies/compare', {
        strategyIds,
        amount,
        duration,
      });
      expect(result).toEqual(mockComparison);
    });
  });

  describe('calculateYield', () => {
    it('should calculate yield for given parameters', async () => {
      const mockCalculation = {
        estimatedYield: '37.50',
        estimatedAPY: '4.5',
        breakdown: [
          {
            day: 1,
            dailyYield: '1.25',
            cumulativeYield: '1.25',
            compoundedAmount: '1001.25',
          },
          {
            day: 30,
            dailyYield: '1.25',
            cumulativeYield: '37.50',
            compoundedAmount: '1037.50',
          },
        ],
      };

      mockApiClient.post.mockResolvedValue(mockCalculation);

      const result = await yieldService.calculateYield('1000', 'strategy-1', 30);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/yield/calculate', {
        amount: '1000',
        strategyId: 'strategy-1',
        duration: 30,
      });
      expect(result).toEqual(mockCalculation);
    });
  });

  describe('getCurrentRates', () => {
    it('should get real-time yield rates', async () => {
      const mockRates = [
        {
          strategyId: 'strategy-1',
          name: 'Noble T-Bills',
          currentAPY: '4.5',
          change24h: '+0.1',
          tvl: '50000000',
          isActive: true,
        },
        {
          strategyId: 'strategy-2',
          name: 'Aave Lending',
          currentAPY: '3.2',
          change24h: '-0.05',
          tvl: '25000000',
          isActive: true,
        },
      ];

      mockApiClient.get.mockResolvedValue(mockRates);

      const result = await yieldService.getCurrentRates();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/yield/rates');
      expect(result).toEqual(mockRates);
    });
  });
});