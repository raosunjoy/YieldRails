/**
 * Main YieldRails SDK class
 */

import { ApiClient } from './client/api-client';
import { WebSocketClient } from './client/websocket-client';
import { AuthService } from './services/auth';
import { PaymentService } from './services/payment';
import { YieldService } from './services/yield';
import { CrossChainService } from './services/crosschain';
import { SDKConfig, WebSocketConfig } from './types/common';
import { CreatePaymentRequest } from './types/payment';

export class YieldRailsSDK {
  private apiClient: ApiClient;
  private wsClient?: WebSocketClient;

  // Services
  public readonly auth: AuthService;
  public readonly payments: PaymentService;
  public readonly yield: YieldService;
  public readonly crosschain: CrossChainService;

  constructor(config: SDKConfig) {
    // Initialize API client
    this.apiClient = new ApiClient(config);

    // Initialize services
    this.auth = new AuthService(this.apiClient);
    this.payments = new PaymentService(this.apiClient);
    this.yield = new YieldService(this.apiClient);
    this.crosschain = new CrossChainService(this.apiClient);
  }

  /**
   * Initialize WebSocket connection for real-time updates
   */
  public initializeWebSocket(config?: Partial<WebSocketConfig>): WebSocketClient {
    const wsConfig: WebSocketConfig = {
      url: this.apiClient.getConfig().apiUrl.replace('http', 'ws') + '/ws',
      ...config,
    };

    this.wsClient = new WebSocketClient(wsConfig);
    return this.wsClient;
  }

  /**
   * Get WebSocket client (if initialized)
   */
  public getWebSocketClient(): WebSocketClient | undefined {
    return this.wsClient;
  }

  /**
   * Connect to WebSocket with current authentication
   */
  public async connectWebSocket(): Promise<void> {
    if (!this.wsClient) {
      throw new Error('WebSocket not initialized. Call initializeWebSocket() first.');
    }

    // Get current access token if authenticated
    const isAuthenticated = this.auth.isAuthenticated();
    const accessToken = isAuthenticated ? this.getAccessToken() : undefined;

    await this.wsClient.connect(accessToken);
  }

  /**
   * Disconnect WebSocket
   */
  public disconnectWebSocket(): void {
    if (this.wsClient) {
      this.wsClient.disconnect();
    }
  }

  /**
   * Update SDK configuration
   */
  public updateConfig(updates: Partial<SDKConfig>): void {
    this.apiClient.updateConfig(updates);
  }

  /**
   * Get current SDK configuration
   */
  public getConfig(): SDKConfig {
    return this.apiClient.getConfig();
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  /**
   * Get current access token (for advanced usage)
   */
  private getAccessToken(): string | undefined {
    // This is a private method to access the token
    // In a real implementation, you might need to expose this differently
    return (this.auth as any).tokenExpiresAt ? 'token' : undefined;
  }

  /**
   * Set up automatic token refresh
   */
  public enableAutoTokenRefresh(): void {
    setInterval(async () => {
      try {
        await this.auth.ensureValidToken();
      } catch (error) {
        console.error('Auto token refresh failed:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Restore session from stored tokens
   */
  public restoreSession(
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): void {
    this.auth.setTokens(accessToken, refreshToken, expiresIn);
  }

  /**
   * Clear session and logout
   */
  public async logout(): Promise<void> {
    await this.auth.logout();
    this.disconnectWebSocket();
  }

  /**
   * Get SDK version
   */
  public getVersion(): string {
    return '0.1.0';
  }

  /**
   * Get supported chains
   */
  public getSupportedChains(): string[] {
    return ['ethereum', 'polygon', 'arbitrum', 'base', 'xrpl', 'solana'];
  }

  /**
   * Get supported tokens
   */
  public getSupportedTokens(): string[] {
    return ['USDC', 'USDT', 'EURC', 'RLUSD'];
  }

  /**
   * Validate payment request before submission
   */
  public validatePaymentRequest(request: CreatePaymentRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.merchantAddress) {
      errors.push('Merchant address is required');
    }

    if (!request.amount || parseFloat(request.amount) <= 0) {
      errors.push('Valid amount is required');
    }

    if (!request.token || !this.getSupportedTokens().includes(request.token)) {
      errors.push('Supported token is required');
    }

    if (!request.chain || !this.getSupportedChains().includes(request.chain)) {
      errors.push('Supported chain is required');
    }

    // Validate merchant address format (basic check)
    if (request.merchantAddress && !request.merchantAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      errors.push('Invalid merchant address format');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create payment with validation
   */
  public async createPaymentWithValidation(request: CreatePaymentRequest) {
    const validation = this.validatePaymentRequest(request);
    
    if (!validation.valid) {
      throw new Error(`Payment validation failed: ${validation.errors.join(', ')}`);
    }

    return this.payments.createPayment(request);
  }

  /**
   * Get payment with yield information
   */
  public async getPaymentWithYield(paymentId: string) {
    const payment = await this.payments.getPayment(paymentId);
    
    // If payment has yield, get additional yield information
    if (payment.yieldStrategy) {
      try {
        const yieldEarnings = await this.yield.getEarnings({
          limit: 1,
          // Filter by payment if the API supports it
        });
        
        return {
          ...payment,
          yieldDetails: yieldEarnings.data.find(earning => earning.paymentId === paymentId),
        };
      } catch (error) {
        // Return payment without yield details if yield service fails
        return payment;
      }
    }
    
    return payment;
  }

  /**
   * Get multiple payments in batch
   */
  public async getPaymentsBatch(paymentIds: string[]) {
    const promises = paymentIds.map(id => 
      this.payments.getPayment(id).catch(error => ({ error, id }))
    );
    
    const results = await Promise.all(promises);
    
    return {
      successful: results.filter(result => !('error' in result)),
      failed: results.filter(result => 'error' in result),
    };
  }

  /**
   * Get comprehensive dashboard data
   */
  public async getDashboardData(timeframe: 'day' | 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    const fromDate = new Date();
    
    switch (timeframe) {
      case 'day':
        fromDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        fromDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        fromDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        fromDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    try {
      const [paymentAnalytics, yieldMetrics, paymentHistory] = await Promise.all([
        this.payments.getPaymentAnalytics(fromDate.toISOString(), now.toISOString()),
        this.yield.getPerformanceMetrics(fromDate.toISOString(), now.toISOString()),
        this.payments.getPaymentHistory({ limit: 10 }),
      ]);

      return {
        timeframe,
        payments: paymentAnalytics,
        yield: yieldMetrics,
        recentPayments: paymentHistory.payments,
        summary: {
          totalVolume: paymentAnalytics.totalVolume,
          totalYield: paymentAnalytics.totalYieldGenerated,
          completionRate: paymentAnalytics.completionRate,
          averageAPY: yieldMetrics.averageAPY,
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Estimate yield for a potential payment
   */
  public async estimateYieldForPayment(
    amount: string,
    _token: string,
    duration: number = 30
  ) {
    try {
      // Get available strategies
      const strategies = await this.yield.getStrategies();
      
      // Get yield calculations for each strategy
      const estimates = await Promise.all(
        strategies.map(async (strategy) => {
          try {
            const calculation = await this.yield.calculateYield(amount, strategy.id, duration);
            return {
              strategy: strategy.name,
              strategyId: strategy.id,
              expectedAPY: strategy.expectedAPY,
              estimatedYield: calculation.estimatedYield,
              riskLevel: strategy.riskLevel,
            };
          } catch (error) {
            return null;
          }
        })
      );

      return estimates.filter(estimate => estimate !== null);
    } catch (error) {
      throw new Error(`Failed to estimate yield: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check - verify SDK can connect to API
   */
  public async healthCheck(): Promise<{
    api: boolean;
    websocket: boolean;
    authenticated: boolean;
    timestamp: string;
  }> {
    const result = {
      api: false,
      websocket: false,
      authenticated: this.isAuthenticated(),
      timestamp: new Date().toISOString(),
    };

    try {
      // Test API connection
      await this.apiClient.get('/api/health');
      result.api = true;
    } catch (error) {
      // API not reachable
    }

    try {
      // Test WebSocket connection
      if (this.wsClient) {
        result.websocket = this.wsClient.isConnected();
      }
    } catch (error) {
      // WebSocket not available
    }

    return result;
  }
}