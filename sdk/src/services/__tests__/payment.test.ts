/**
 * Tests for PaymentService
 */

import { PaymentService } from '../payment';
import { ApiClient } from '../../client/api-client';
import {
  CreatePaymentRequest,
  Payment,
  PaymentStatus,
  PaymentType,
  PaymentHistoryParams,
  PaymentAnalytics,
} from '../../types/payment';
import { TokenSymbol, ChainName } from '../../types/common';

// Mock ApiClient
jest.mock('../../client/api-client');
const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockApiClient: jest.Mocked<ApiClient>;

  const mockPayment: Payment = {
    id: 'payment-123',
    userId: 'user-123',
    merchantId: 'merchant-123',
    amount: '100.00',
    currency: 'USD',
    tokenAddress: '0xA0b86a33E6441e8e421b7b4E6b4b8e6b4b8e6b4b',
    tokenSymbol: TokenSymbol.USDC,
    status: PaymentStatus.PENDING,
    type: PaymentType.STANDARD,
    sourceChain: ChainName.ethereum,
    senderAddress: '0x123...abc',
    recipientAddress: '0x456...def',
    estimatedYield: '2.50',
    yieldStrategy: 'noble-tbills',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockApiClient = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;

    MockedApiClient.mockImplementation(() => mockApiClient);
    paymentService = new PaymentService(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a new payment', async () => {
      const createRequest: CreatePaymentRequest = {
        merchantAddress: '0x456...def',
        amount: '100.00',
        token: TokenSymbol.USDC,
        chain: ChainName.ethereum,
        customerEmail: 'customer@example.com',
        yieldEnabled: true,
        metadata: { orderId: 'order-123' },
      };

      mockApiClient.post.mockResolvedValue(mockPayment);

      const result = await paymentService.createPayment(createRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/payments', createRequest);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('getPayment', () => {
    it('should get payment by ID', async () => {
      mockApiClient.get.mockResolvedValue(mockPayment);

      const result = await paymentService.getPayment('payment-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/payments/payment-123');
      expect(result).toEqual(mockPayment);
    });
  });

  describe('getPaymentHistory', () => {
    it('should get payment history without filters', async () => {
      const historyResponse = {
        payments: [mockPayment],
        total: 1,
        analytics: {
          totalPayments: 1,
          totalVolume: '100.00',
          totalYieldEarned: '2.50',
          averagePaymentAmount: '100.00',
        },
      };

      mockApiClient.get.mockResolvedValue(historyResponse);

      const result = await paymentService.getPaymentHistory();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/payments');
      expect(result).toEqual(historyResponse);
    });

    it('should get payment history with filters', async () => {
      const params: PaymentHistoryParams = {
        limit: 10,
        offset: 0,
        status: PaymentStatus.COMPLETED,
        merchantId: 'merchant-123',
        fromDate: '2023-01-01',
        toDate: '2023-01-31',
      };

      const historyResponse = {
        payments: [mockPayment],
        total: 1,
      };

      mockApiClient.get.mockResolvedValue(historyResponse);

      const result = await paymentService.getPaymentHistory(params);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/payments?limit=10&offset=0&status=COMPLETED&merchantId=merchant-123&fromDate=2023-01-01&toDate=2023-01-31'
      );
      expect(result).toEqual(historyResponse);
    });

    it('should handle pagination with page parameter', async () => {
      const params: PaymentHistoryParams = {
        page: 2,
        limit: 20,
      };

      mockApiClient.get.mockResolvedValue({ payments: [], total: 0 });

      await paymentService.getPaymentHistory(params);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/payments?limit=20&page=2');
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment', async () => {
      const confirmedPayment = {
        ...mockPayment,
        status: PaymentStatus.CONFIRMED,
        sourceTransactionHash: '0xabc123...',
      };

      mockApiClient.post.mockResolvedValue(confirmedPayment);

      const result = await paymentService.confirmPayment('payment-123', '0xabc123...');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/payments/payment-123/confirm', {
        transactionHash: '0xabc123...',
      });
      expect(result).toEqual(confirmedPayment);
    });

    it('should confirm payment without transaction hash', async () => {
      const confirmedPayment = {
        ...mockPayment,
        status: PaymentStatus.CONFIRMED,
      };

      mockApiClient.post.mockResolvedValue(confirmedPayment);

      const result = await paymentService.confirmPayment('payment-123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/payments/payment-123/confirm', {
        transactionHash: undefined,
      });
      expect(result).toEqual(confirmedPayment);
    });
  });

  describe('releasePayment', () => {
    it('should release payment to merchant', async () => {
      const releasedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        actualYield: '2.75',
        releasedAt: '2023-01-02T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValue(releasedPayment);

      const result = await paymentService.releasePayment('payment-123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/payments/payment-123/release');
      expect(result).toEqual(releasedPayment);
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment', async () => {
      const cancelledPayment = {
        ...mockPayment,
        status: PaymentStatus.CANCELLED,
      };

      mockApiClient.post.mockResolvedValue(cancelledPayment);

      const result = await paymentService.cancelPayment('payment-123', 'User requested');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/payments/payment-123/cancel', {
        reason: 'User requested',
      });
      expect(result).toEqual(cancelledPayment);
    });

    it('should cancel payment without reason', async () => {
      const cancelledPayment = {
        ...mockPayment,
        status: PaymentStatus.CANCELLED,
      };

      mockApiClient.post.mockResolvedValue(cancelledPayment);

      await paymentService.cancelPayment('payment-123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/payments/payment-123/cancel', {
        reason: undefined,
      });
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status', async () => {
      const updatedPayment = {
        ...mockPayment,
        status: PaymentStatus.PROCESSING,
      };

      mockApiClient.put.mockResolvedValue(updatedPayment);

      const result = await paymentService.updatePaymentStatus(
        'payment-123',
        PaymentStatus.PROCESSING,
        { note: 'Processing started' }
      );

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/payments/payment-123/status', {
        status: PaymentStatus.PROCESSING,
        metadata: { note: 'Processing started' },
      });
      expect(result).toEqual(updatedPayment);
    });
  });

  describe('getPaymentEvents', () => {
    it('should get payment events', async () => {
      const events = [
        {
          id: 'event-1',
          paymentId: 'payment-123',
          type: 'payment.created',
          data: { amount: '100.00' },
          createdAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 'event-2',
          paymentId: 'payment-123',
          type: 'payment.confirmed',
          data: { transactionHash: '0xabc123...' },
          createdAt: '2023-01-01T01:00:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValue(events);

      const result = await paymentService.getPaymentEvents('payment-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/payments/payment-123/events');
      expect(result).toEqual(events);
    });
  });

  describe('getPaymentAnalytics', () => {
    it('should get payment analytics', async () => {
      const analytics: PaymentAnalytics = {
        totalPayments: 100,
        completedPayments: 85,
        completionRate: 0.85,
        totalVolume: '10000.00',
        totalYieldGenerated: '250.00',
        averagePaymentAmount: '100.00',
        paymentsByStatus: {
          [PaymentStatus.COMPLETED]: 85,
          [PaymentStatus.PENDING]: 10,
          [PaymentStatus.FAILED]: 5,
        },
        yieldByStrategy: [
          {
            strategyId: 'noble-tbills',
            totalYield: '150.00',
            paymentCount: 50,
          },
          {
            strategyId: 'aave-lending',
            totalYield: '100.00',
            paymentCount: 35,
          },
        ],
      };

      mockApiClient.get.mockResolvedValue(analytics);

      const result = await paymentService.getPaymentAnalytics(
        '2023-01-01',
        '2023-01-31',
        'merchant-123'
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/payments/analytics?fromDate=2023-01-01&toDate=2023-01-31&merchantId=merchant-123'
      );
      expect(result).toEqual(analytics);
    });

    it('should get analytics without filters', async () => {
      const analytics: PaymentAnalytics = {
        totalPayments: 100,
        completedPayments: 85,
        completionRate: 0.85,
        totalVolume: '10000.00',
        totalYieldGenerated: '250.00',
        averagePaymentAmount: '100.00',
        paymentsByStatus: {},
        yieldByStrategy: [],
      };

      mockApiClient.get.mockResolvedValue(analytics);

      await paymentService.getPaymentAnalytics();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/payments/analytics');
    });
  });

  describe('getMerchantPayments', () => {
    it('should get merchant payments', async () => {
      const merchantPayments = {
        data: [mockPayment],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      mockApiClient.get.mockResolvedValue(merchantPayments);

      const result = await paymentService.getMerchantPayments('merchant-123', {
        limit: 10,
        offset: 0,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/merchants/merchant-123/payments?limit=10&offset=0'
      );
      expect(result).toEqual(merchantPayments);
    });
  });

  describe('estimatePayment', () => {
    it('should estimate payment costs and yield', async () => {
      const estimate = {
        estimatedYield: '2.50',
        estimatedFees: '0.50',
        estimatedTotal: '102.50',
        yieldStrategy: 'noble-tbills',
      };

      const createRequest: CreatePaymentRequest = {
        merchantAddress: '0x456...def',
        amount: '100.00',
        token: TokenSymbol.USDC,
        chain: ChainName.ethereum,
        yieldEnabled: true,
      };

      mockApiClient.post.mockResolvedValue(estimate);

      const result = await paymentService.estimatePayment(createRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/payments/estimate', createRequest);
      expect(result).toEqual(estimate);
    });
  });

  describe('getSupportedTokens', () => {
    it('should get supported tokens', async () => {
      const supportedTokens = [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0xA0b86a33E6441e8e421b7b4E6b4b8e6b4b8e6b4b',
          chain: 'ethereum',
          decimals: 6,
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          chain: 'ethereum',
          decimals: 6,
        },
      ];

      mockApiClient.get.mockResolvedValue(supportedTokens);

      const result = await paymentService.getSupportedTokens();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/payments/supported-tokens');
      expect(result).toEqual(supportedTokens);
    });
  });

  describe('getPaymentLimits', () => {
    it('should get payment limits', async () => {
      const limits = {
        dailyLimit: '10000.00',
        monthlyLimit: '100000.00',
        perTransactionLimit: '5000.00',
        remainingDaily: '7500.00',
        remainingMonthly: '85000.00',
      };

      mockApiClient.get.mockResolvedValue(limits);

      const result = await paymentService.getPaymentLimits();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/payments/limits');
      expect(result).toEqual(limits);
    });
  });
});