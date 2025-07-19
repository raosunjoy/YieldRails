import { PaymentService } from '@services/PaymentService';
import { ApiService } from '@services/ApiService';
import { mockPayment, mockApiResponse, mockApiError } from '@utils/testHelpers';

// Mock the ApiService
jest.mock('@services/ApiService');

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockApiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    // Create mock instance
    mockApiService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      setAuthToken: jest.fn(),
      clearAuthToken: jest.fn(),
    } as any;

    // Mock getInstance to return our mock
    (ApiService.getInstance as jest.Mock).mockReturnValue(mockApiService);

    paymentService = PaymentService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const paymentRequest = {
        amount: '100.00',
        currency: 'USDC',
        recipient: '0x742d35Cc6C16C4aFF5D68Ab13C50FcA7C71F1234',
        type: 'standard' as const,
        memo: 'Test payment',
      };

      mockApiService.post.mockResolvedValue(mockApiResponse(mockPayment));

      const result = await paymentService.createPayment(paymentRequest);

      expect(mockApiService.post).toHaveBeenCalledWith('/payments', paymentRequest);
      expect(result).toEqual(mockPayment);
    });

    it('should handle create payment error', async () => {
      const paymentRequest = {
        amount: '100.00',
        currency: 'USDC',
        recipient: '0x742d35Cc6C16C4aFF5D68Ab13C50FcA7C71F1234',
        type: 'standard' as const,
      };

      mockApiService.post.mockRejectedValue(mockApiError('Payment creation failed'));

      await expect(paymentService.createPayment(paymentRequest)).rejects.toThrow('Failed to create payment');
    });
  });

  describe('getPayments', () => {
    it('should fetch payments successfully', async () => {
      const payments = [mockPayment];
      mockApiService.get.mockResolvedValue(mockApiResponse(payments));

      const result = await paymentService.getPayments();

      expect(mockApiService.get).toHaveBeenCalledWith('/payments?');
      expect(result).toEqual(payments);
    });

    it('should fetch payments with filters', async () => {
      const filter = {
        status: 'completed' as const,
        type: 'standard' as const,
        minAmount: '50',
      };
      const payments = [mockPayment];
      mockApiService.get.mockResolvedValue(mockApiResponse(payments));

      const result = await paymentService.getPayments(filter);

      expect(mockApiService.get).toHaveBeenCalledWith('/payments?status=completed&type=standard&minAmount=50');
      expect(result).toEqual(payments);
    });

    it('should handle get payments error', async () => {
      mockApiService.get.mockRejectedValue(mockApiError('Fetch failed'));

      await expect(paymentService.getPayments()).rejects.toThrow('Failed to fetch payments');
    });
  });

  describe('getPayment', () => {
    it('should fetch a single payment successfully', async () => {
      const paymentId = 'payment-123';
      mockApiService.get.mockResolvedValue(mockApiResponse(mockPayment));

      const result = await paymentService.getPayment(paymentId);

      expect(mockApiService.get).toHaveBeenCalledWith(`/payments/${paymentId}`);
      expect(result).toEqual(mockPayment);
    });

    it('should handle get payment error', async () => {
      const paymentId = 'payment-123';
      mockApiService.get.mockRejectedValue(mockApiError('Payment not found', 404));

      await expect(paymentService.getPayment(paymentId)).rejects.toThrow('Failed to fetch payment');
    });
  });

  describe('cancelPayment', () => {
    it('should cancel a payment successfully', async () => {
      const paymentId = 'payment-123';
      const cancelledPayment = { ...mockPayment, status: 'cancelled' as const };
      mockApiService.post.mockResolvedValue(mockApiResponse(cancelledPayment));

      const result = await paymentService.cancelPayment(paymentId);

      expect(mockApiService.post).toHaveBeenCalledWith(`/payments/${paymentId}/cancel`);
      expect(result).toEqual(cancelledPayment);
    });

    it('should handle cancel payment error', async () => {
      const paymentId = 'payment-123';
      mockApiService.post.mockRejectedValue(mockApiError('Cannot cancel payment'));

      await expect(paymentService.cancelPayment(paymentId)).rejects.toThrow('Failed to cancel payment');
    });
  });

  describe('getPaymentStats', () => {
    it('should fetch payment statistics successfully', async () => {
      const stats = {
        totalPayments: 10,
        totalVolume: '1000.00',
        avgPaymentAmount: '100.00',
        successRate: 95,
        totalYieldEarned: '50.00',
      };
      mockApiService.get.mockResolvedValue(mockApiResponse(stats));

      const result = await paymentService.getPaymentStats();

      expect(mockApiService.get).toHaveBeenCalledWith('/payments/stats');
      expect(result).toEqual(stats);
    });

    it('should handle get payment stats error', async () => {
      mockApiService.get.mockRejectedValue(mockApiError('Stats unavailable'));

      await expect(paymentService.getPaymentStats()).rejects.toThrow('Failed to fetch payment stats');
    });
  });

  describe('estimatePaymentFees', () => {
    it('should estimate payment fees successfully', async () => {
      const paymentRequest = {
        amount: '100.00',
        currency: 'USDC',
        recipient: '0x742d35Cc6C16C4aFF5D68Ab13C50FcA7C71F1234',
        type: 'cross_chain' as const,
        sourceChain: 'ethereum',
        targetChain: 'polygon',
      };
      const feeEstimate = {
        gasFee: '0.001',
        bridgeFee: '0.1',
        estimatedYield: '5.0',
      };
      mockApiService.post.mockResolvedValue(mockApiResponse(feeEstimate));

      const result = await paymentService.estimatePaymentFees(paymentRequest);

      expect(mockApiService.post).toHaveBeenCalledWith('/payments/estimate', paymentRequest);
      expect(result).toEqual(feeEstimate);
    });

    it('should handle estimate payment fees error', async () => {
      const paymentRequest = {
        amount: '100.00',
        currency: 'USDC',
        recipient: '0x742d35Cc6C16C4aFF5D68Ab13C50FcA7C71F1234',
        type: 'standard' as const,
      };
      mockApiService.post.mockRejectedValue(mockApiError('Estimation failed'));

      await expect(paymentService.estimatePaymentFees(paymentRequest)).rejects.toThrow('Failed to estimate payment fees');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PaymentService.getInstance();
      const instance2 = PaymentService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});