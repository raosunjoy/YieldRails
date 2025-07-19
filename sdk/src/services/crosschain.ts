/**
 * Cross-chain service for YieldRails SDK
 */

import { ApiClient } from '../client/api-client';
import {
  BridgeRequest,
  BridgeTransaction,
  BridgeEstimate,
  LiquidityInfo,
  BridgeStatus,
  BridgeTransactionDetail,
  BridgeTransactionHistory,
  ValidatorInfo,
  MonitoringMetrics,
  LiquidityPool,
  BridgeAnalytics,
  ChainInfo
} from '../types/crosschain';
import { ChainName, TokenSymbol, PaginatedResponse, PaginationParams } from '../types/common';

export class CrossChainService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Initiate a cross-chain bridge transaction
   */
  public async initiateBridge(request: BridgeRequest): Promise<BridgeTransaction> {
    const response = await this.apiClient.post('/api/crosschain/bridge', request);
    return response.data;
  }

  /**
   * Get bridge transaction by ID
   */
  public async getBridgeTransaction(transactionId: string): Promise<BridgeTransaction> {
    const response = await this.apiClient.get(`/api/crosschain/transaction/${transactionId}`);
    return response.data;
  }

  /**
   * Get comprehensive bridge transaction status
   */
  public async getBridgeTransactionStatus(transactionId: string): Promise<BridgeTransactionDetail> {
    const response = await this.apiClient.get(`/api/crosschain/transaction/${transactionId}/status`);
    return response.data;
  }

  /**
   * Get bridge transaction history with updates
   */
  public async getBridgeTransactionHistory(transactionId: string): Promise<BridgeTransactionHistory> {
    const response = await this.apiClient.get(`/api/crosschain/transaction/${transactionId}/history`);
    return response.data;
  }

  /**
   * Get user bridge transactions
   */
  public async getUserBridgeTransactions(
    address: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedResponse<BridgeTransaction>> {
    const response = await this.apiClient.get(`/api/crosschain/user/${address}/transactions`, {
      params: { limit, offset }
    });
    return response.data;
  }

  /**
   * Get bridge fee and time estimate
   */
  public async getBridgeEstimate(
    sourceChain: string,
    destinationChain: string,
    amount: string | number,
    token: string = 'USDC'
  ): Promise<BridgeEstimate> {
    const response = await this.apiClient.post('/api/crosschain/estimate', {
      sourceChain,
      destinationChain,
      amount: amount.toString(),
      token
    });
    return response.data;
  }

  /**
   * Process a bridge transaction
   */
  public async processBridgeTransaction(transactionId: string): Promise<{ transactionId: string }> {
    const response = await this.apiClient.post(`/api/crosschain/transaction/${transactionId}/process`);
    return response.data;
  }

  /**
   * Cancel a pending bridge transaction
   */
  public async cancelBridgeTransaction(transactionId: string): Promise<{ transactionId: string }> {
    const response = await this.apiClient.post(`/api/crosschain/transaction/${transactionId}/cancel`);
    return response.data;
  }

  /**
   * Retry a failed bridge transaction
   */
  public async retryBridgeTransaction(transactionId: string): Promise<{ transactionId: string }> {
    const response = await this.apiClient.post(`/api/crosschain/transaction/${transactionId}/retry`);
    return response.data;
  }

  /**
   * Get supported chains for bridging
   */
  public async getSupportedChains(): Promise<ChainInfo[]> {
    const response = await this.apiClient.get('/api/crosschain/supported-chains');
    return response.data.chains;
  }

  /**
   * Get liquidity pools information
   */
  public async getLiquidityPools(): Promise<LiquidityPool[]> {
    const response = await this.apiClient.get('/api/crosschain/liquidity');
    return response.data.pools;
  }

  /**
   * Check liquidity availability for a bridge transaction
   */
  public async checkLiquidityAvailability(
    sourceChain: string,
    destinationChain: string,
    amount: string | number,
    token: string = 'USDC'
  ): Promise<LiquidityInfo> {
    const response = await this.apiClient.post('/api/crosschain/liquidity/check', {
      sourceChain,
      destinationChain,
      amount: amount.toString(),
      token
    });
    return response.data;
  }

  /**
   * Get bridge analytics
   */
  public async getBridgeAnalytics(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<BridgeAnalytics> {
    const response = await this.apiClient.get('/api/crosschain/analytics', {
      params: { timeRange }
    });
    return response.data;
  }

  /**
   * Get active validators information
   */
  public async getActiveValidators(): Promise<{
    validators: ValidatorInfo[];
    count: number;
    requiredForConsensus: number;
  }> {
    const response = await this.apiClient.get('/api/crosschain/validators');
    return response.data;
  }

  /**
   * Get bridge monitoring metrics (admin only)
   */
  public async getMonitoringMetrics(): Promise<MonitoringMetrics> {
    const response = await this.apiClient.get('/api/crosschain/monitoring');
    return response.data;
  }

  /**
   * Subscribe to real-time updates for a transaction
   */
  public async subscribeToTransactionUpdates(
    transactionId: string,
    subscriberId: string
  ): Promise<{ transactionId: string; subscriberId: string }> {
    const response = await this.apiClient.post(`/api/crosschain/subscribe/${transactionId}`, {
      subscriberId
    });
    return response.data;
  }

  /**
   * Unsubscribe from real-time updates for a transaction
   */
  public async unsubscribeFromTransactionUpdates(
    transactionId: string,
    subscriberId: string
  ): Promise<{ transactionId: string; subscriberId: string }> {
    const response = await this.apiClient.delete(`/api/crosschain/subscribe/${transactionId}`, {
      data: { subscriberId }
    });
    return response.data;
  }

  /**
   * Get all updates for a subscriber
   */
  public async getSubscriberUpdates(
    subscriberId: string
  ): Promise<{
    subscriberId: string;
    updates: any[];
    count: number;
  }> {
    const response = await this.apiClient.get(`/api/crosschain/subscriber/${subscriberId}/updates`);
    return response.data;
  }
}