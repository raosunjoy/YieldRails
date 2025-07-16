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
    return this.apiClient.post<BridgeTransaction>('/api/crosschain/bridge', request);
  }

  /**
   * Get bridge transaction by ID
   */
  public async getBridgeTransaction(transactionId: string): Promise<BridgeTransaction> {
    return this.apiClient.get<BridgeTransaction>(`/api/crosschain/transactions/${transactionId}`);
  }

  /**
   * Get bridge transaction history
   */
  public async getBridgeHistory(params?: PaginationParams & {
    status?: BridgeStatus;
    sourceChain?: ChainName;
    destinationChain?: ChainName;
    fromDate?: string;
    toDate?: string;
  }): Promise<PaginatedResponse<BridgeTransaction>> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.sourceChain) queryParams.append('sourceChain', params.sourceChain);
    if (params?.destinationChain) queryParams.append('destinationChain', params.destinationChain);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);

    const url = `/api/crosschain/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.apiClient.get<PaginatedResponse<BridgeTransaction>>(url);
  }

  /**
   * Get bridge fee and time estimate
   */
  public async getBridgeEstimate(
    sourceChain: ChainName,
    destinationChain: ChainName,
    token: TokenSymbol,
    amount: string
  ): Promise<BridgeEstimate> {
    return this.apiClient.post<BridgeEstimate>('/api/crosschain/estimate', {
      sourceChain,
      destinationChain,
      token,
      amount,
    });
  }

  /**
   * Check liquidity availability for bridge
   */
  public async checkLiquidity(
    chain: ChainName,
    token: TokenSymbol,
    amount?: string
  ): Promise<LiquidityInfo> {
    return this.apiClient.post<LiquidityInfo>('/api/crosschain/liquidity/check', {
      chain,
      token,
      amount,
    });
  }

  /**
   * Get supported bridge routes
   */
  public async getSupportedRoutes(): Promise<Array<{
    sourceChain: ChainName;
    destinationChain: ChainName;
    supportedTokens: TokenSymbol[];
    estimatedDuration: number;
    isActive: boolean;
  }>> {
    return this.apiClient.get('/api/crosschain/routes');
  }

  /**
   * Cancel a pending bridge transaction
   */
  public async cancelBridge(transactionId: string, reason?: string): Promise<BridgeTransaction> {
    return this.apiClient.post<BridgeTransaction>(`/api/crosschain/transaction/${transactionId}/cancel`, {
      reason,
    });
  }

  /**
   * Retry a failed bridge transaction
   */
  public async retryBridge(transactionId: string): Promise<BridgeTransaction> {
    return this.apiClient.post<BridgeTransaction>(`/api/crosschain/transaction/${transactionId}/retry`);
  }

  /**
   * Get bridge transaction events
   */
  public async getBridgeEvents(transactionId: string): Promise<Array<{
    id: string;
    type: string;
    data: Record<string, any>;
    createdAt: string;
  }>> {
    return this.apiClient.get(`/api/crosschain/transactions/${transactionId}/events`);
  }

  /**
   * Get bridge analytics
   */
  public async getBridgeAnalytics(
    fromDate?: string,
    toDate?: string
  ): Promise<{
    totalTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    totalVolume: string;
    totalFees: string;
    totalYieldGenerated: string;
    averageCompletionTime: number;
    routePerformance: Array<{
      sourceChain: ChainName;
      destinationChain: ChainName;
      transactionCount: number;
      successRate: number;
      averageTime: number;
    }>;
  }> {
    const queryParams = new URLSearchParams();
    
    if (fromDate) queryParams.append('fromDate', fromDate);
    if (toDate) queryParams.append('toDate', toDate);

    const url = `/api/crosschain/analytics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.apiClient.get(url);
  }

  /**
   * Get real-time bridge status
   */
  public async getBridgeStatus(): Promise<{
    totalLiquidity: string;
    activeRoutes: number;
    averageCompletionTime: number;
    systemHealth: 'healthy' | 'degraded' | 'down';
    chainStatus: Array<{
      chain: ChainName;
      isActive: boolean;
      blockHeight: number;
      lastUpdate: string;
    }>;
  }> {
    return this.apiClient.get('/api/crosschain/status');
  }
}