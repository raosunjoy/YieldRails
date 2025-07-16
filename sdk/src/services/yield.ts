/**
 * Yield service for YieldRails SDK
 */

import { ApiClient } from '../client/api-client';
import {
  YieldStrategy,
  YieldEarning,
  YieldOptimizationRequest,
  YieldOptimizationResponse,
  YieldPerformanceMetrics,
  YieldStatus,
} from '../types/yield';
import { PaginatedResponse, PaginationParams } from '../types/common';

export class YieldService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get all available yield strategies
   */
  public async getStrategies(): Promise<YieldStrategy[]> {
    return this.apiClient.get<YieldStrategy[]>('/api/yield/strategies');
  }

  /**
   * Get specific yield strategy by ID
   */
  public async getStrategy(strategyId: string): Promise<YieldStrategy> {
    return this.apiClient.get<YieldStrategy>(`/api/yield/strategies/${strategyId}`);
  }

  /**
   * Get yield optimization recommendations
   */
  public async optimizeYield(request: YieldOptimizationRequest): Promise<YieldOptimizationResponse> {
    return this.apiClient.post<YieldOptimizationResponse>('/api/yield/optimize', request);
  }

  /**
   * Get user's yield earnings
   */
  public async getEarnings(params?: PaginationParams & {
    status?: YieldStatus;
    strategyId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<PaginatedResponse<YieldEarning>> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.strategyId) queryParams.append('strategyId', params.strategyId);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);

    const url = `/api/yield/earnings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.apiClient.get<PaginatedResponse<YieldEarning>>(url);
  }

  /**
   * Get specific yield earning by ID
   */
  public async getEarning(earningId: string): Promise<YieldEarning> {
    return this.apiClient.get<YieldEarning>(`/api/yield/earnings/${earningId}`);
  }

  /**
   * Get yield performance metrics
   */
  public async getPerformanceMetrics(
    fromDate?: string,
    toDate?: string
  ): Promise<YieldPerformanceMetrics> {
    const queryParams = new URLSearchParams();
    
    if (fromDate) queryParams.append('fromDate', fromDate);
    if (toDate) queryParams.append('toDate', toDate);

    const url = `/api/yield/performance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.apiClient.get<YieldPerformanceMetrics>(url);
  }

  /**
   * Start yield generation for a payment
   */
  public async startYieldGeneration(
    paymentId: string,
    strategyId?: string
  ): Promise<YieldEarning> {
    return this.apiClient.post<YieldEarning>(`/api/yield/payment/${paymentId}/start`, {
      strategyId,
    });
  }

  /**
   * Stop yield generation for a payment
   */
  public async stopYieldGeneration(paymentId: string): Promise<YieldEarning> {
    return this.apiClient.post<YieldEarning>(`/api/yield/payment/${paymentId}/stop`);
  }

  /**
   * Withdraw yield earnings
   */
  public async withdrawYield(
    earningId: string,
    amount?: string
  ): Promise<{
    transactionHash: string;
    amount: string;
    fee: string;
    netAmount: string;
  }> {
    return this.apiClient.post(`/api/yield/earnings/${earningId}/withdraw`, {
      amount,
    });
  }

  /**
   * Get strategy performance history
   */
  public async getStrategyPerformance(
    strategyId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<Array<{
    date: string;
    apy: string;
    tvl: string;
    volume: string;
  }>> {
    return this.apiClient.get(`/api/yield/strategies/${strategyId}/performance?period=${period}`);
  }

  /**
   * Compare strategies
   */
  public async compareStrategies(
    strategyIds: string[],
    amount: string,
    duration: number
  ): Promise<Array<{
    strategyId: string;
    strategy: YieldStrategy;
    estimatedYield: string;
    estimatedAPY: string;
    riskScore: number;
    projectedEarnings: Array<{
      day: number;
      cumulativeYield: string;
      dailyYield: string;
    }>;
  }>> {
    return this.apiClient.post('/api/yield/strategies/compare', {
      strategyIds,
      amount,
      duration,
    });
  }

  /**
   * Get yield calculator results
   */
  public async calculateYield(
    amount: string,
    strategyId: string,
    duration: number
  ): Promise<{
    estimatedYield: string;
    estimatedAPY: string;
    breakdown: Array<{
      day: number;
      dailyYield: string;
      cumulativeYield: string;
      compoundedAmount: string;
    }>;
  }> {
    return this.apiClient.post('/api/yield/calculate', {
      amount,
      strategyId,
      duration,
    });
  }

  /**
   * Get real-time yield rates
   */
  public async getCurrentRates(): Promise<Array<{
    strategyId: string;
    name: string;
    currentAPY: string;
    change24h: string;
    tvl: string;
    isActive: boolean;
  }>> {
    return this.apiClient.get('/api/yield/rates');
  }
}