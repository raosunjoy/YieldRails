/**
 * Payment service for YieldRails SDK
 */

import { ApiClient } from '../client/api-client';
import {
  CreatePaymentRequest,
  Payment,
  PaymentHistoryParams,
  PaymentHistoryResponse,
  PaymentAnalytics,
  PaymentEvent,
  PaymentStatus,
} from '../types/payment';
import { PaginatedResponse } from '../types/common';

export class PaymentService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Create a new payment
   */
  public async createPayment(request: CreatePaymentRequest): Promise<Payment> {
    return this.apiClient.post<Payment>('/api/payments', request);
  }

  /**
   * Get payment by ID
   */
  public async getPayment(paymentId: string): Promise<Payment> {
    return this.apiClient.get<Payment>(`/api/payments/${paymentId}`);
  }

  /**
   * Get payment history with optional filters
   */
  public async getPaymentHistory(params?: PaymentHistoryParams): Promise<PaymentHistoryResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.merchantId) queryParams.append('merchantId', params.merchantId);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);

    const url = `/api/payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.apiClient.get<PaymentHistoryResponse>(url);
  }

  /**
   * Confirm payment by depositing funds
   */
  public async confirmPayment(paymentId: string, transactionHash?: string): Promise<Payment> {
    return this.apiClient.post<Payment>(`/api/payments/${paymentId}/confirm`, {
      transactionHash,
    });
  }

  /**
   * Release payment to merchant
   */
  public async releasePayment(paymentId: string): Promise<Payment> {
    return this.apiClient.post<Payment>(`/api/payments/${paymentId}/release`);
  }

  /**
   * Cancel a pending payment
   */
  public async cancelPayment(paymentId: string, reason?: string): Promise<Payment> {
    return this.apiClient.post<Payment>(`/api/payments/${paymentId}/cancel`, {
      reason,
    });
  }

  /**
   * Update payment status
   */
  public async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    metadata?: Record<string, any>
  ): Promise<Payment> {
    return this.apiClient.put<Payment>(`/api/payments/${paymentId}/status`, {
      status,
      metadata,
    });
  }

  /**
   * Get payment events/history
   */
  public async getPaymentEvents(paymentId: string): Promise<PaymentEvent[]> {
    return this.apiClient.get<PaymentEvent[]>(`/api/payments/${paymentId}/events`);
  }

  /**
   * Get payment analytics
   */
  public async getPaymentAnalytics(
    fromDate?: string,
    toDate?: string,
    merchantId?: string
  ): Promise<PaymentAnalytics> {
    const queryParams = new URLSearchParams();
    
    if (fromDate) queryParams.append('fromDate', fromDate);
    if (toDate) queryParams.append('toDate', toDate);
    if (merchantId) queryParams.append('merchantId', merchantId);

    const url = `/api/payments/analytics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.apiClient.get<PaymentAnalytics>(url);
  }

  /**
   * Get merchant payments (for merchant users)
   */
  public async getMerchantPayments(
    merchantId: string,
    params?: PaymentHistoryParams
  ): Promise<PaginatedResponse<Payment>> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);

    const url = `/api/merchants/${merchantId}/payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.apiClient.get<PaginatedResponse<Payment>>(url);
  }

  /**
   * Estimate payment with yield calculation
   */
  public async estimatePayment(request: CreatePaymentRequest): Promise<{
    estimatedYield: string;
    estimatedFees: string;
    estimatedTotal: string;
    yieldStrategy?: string;
  }> {
    return this.apiClient.post('/api/payments/estimate', request);
  }

  /**
   * Get supported tokens and chains
   */
  public async getSupportedTokens(): Promise<Array<{
    symbol: string;
    name: string;
    address: string;
    chain: string;
    decimals: number;
  }>> {
    return this.apiClient.get('/api/payments/supported-tokens');
  }

  /**
   * Get payment limits for user
   */
  public async getPaymentLimits(): Promise<{
    dailyLimit: string;
    monthlyLimit: string;
    perTransactionLimit: string;
    remainingDaily: string;
    remainingMonthly: string;
  }> {
    return this.apiClient.get('/api/payments/limits');
  }
}