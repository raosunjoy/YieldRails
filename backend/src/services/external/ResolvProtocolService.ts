import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from 'pino';
import { logger } from '../../config/logger';
import { environment } from '../../config/environment';

// Resolv Protocol API Types
export interface ResolvVaultInfo {
  vaultId: string;
  name: string;
  symbol: string;
  strategy: 'DELTA_NEUTRAL' | 'YIELD_FARMING' | 'ARBITRAGE';
  totalValueLocked: string;
  currentAPY: number;
  riskScore: number;
  minimumDeposit: string;
  maximumDeposit: string;
  lockupPeriod: number; // in seconds
  status: 'ACTIVE' | 'PAUSED' | 'EMERGENCY_EXIT';
  underlyingTokens: string[];
  collateralRatio: number;
  liquidationThreshold: number;
}

export interface ResolvPositionRequest {
  vaultId: string;
  amount: string;
  userAddress: string;
  slippageTolerance: number; // basis points
  deadline?: number; // unix timestamp
}

export interface ResolvPositionResponse {
  transactionId: string;
  vaultId: string;
  amount: string;
  shares: string;
  expectedAPY: number;
  entryPrice: string;
  leverageRatio: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  blockchainTxHash?: string;
  gasEstimate?: string;
}

export interface ResolvExitRequest {
  vaultId: string;
  shares: string;
  userAddress: string;
  slippageTolerance: number;
  isEmergencyExit?: boolean;
}

export interface ResolvExitResponse {
  transactionId: string;
  vaultId: string;
  shares: string;
  amount: string;
  exitPrice: string;
  realizedPnL: string;
  fees: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  blockchainTxHash?: string;
}

export interface ResolvPositionInfo {
  vaultId: string;
  userAddress: string;
  shares: string;
  currentValue: string;
  originalDeposit: string;
  unrealizedPnL: string;
  realizedPnL: string;
  currentAPY: number;
  entryPrice: string;
  currentPrice: string;
  leverageRatio: number;
  healthFactor: number;
  liquidationPrice: string;
  entryDate: string;
  status: 'ACTIVE' | 'LIQUIDATED' | 'EXITED';
}

export interface ResolvRiskMetrics {
  vaultId: string;
  impermanentLoss: string;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: string;
  liquidationRisk: number;
  correlationMatrix: Record<string, number>;
  hedgeEffectiveness: number;
}

export interface ResolvRebalanceInfo {
  vaultId: string;
  lastRebalance: string;
  nextRebalance: string;
  rebalanceThreshold: number;
  currentImbalance: number;
  recommendedAction: 'HOLD' | 'REBALANCE' | 'HEDGE_ADJUST';
  expectedCost: string;
}

export interface ResolvProtocolError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Service for integrating with Resolv Protocol for delta-neutral DeFi strategies
 * Resolv Protocol provides sophisticated delta-neutral positioning and automated hedging
 * for yield generation while minimizing directional risk exposure
 */
export class ResolvProtocolService {
  private readonly client: AxiosInstance;
  private readonly logger: Logger;
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly isTestMode: boolean;

  constructor() {
    this.logger = logger.child({ service: 'ResolvProtocolService' });
    this.baseURL = environment.RESOLV_API_URL || 'https://api.resolv.xyz';
    this.apiKey = environment.RESOLV_API_KEY || '';
    this.isTestMode = environment.NODE_ENV !== 'production';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 45000, // Longer timeout for complex DeFi operations
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'User-Agent': 'YieldRails/1.0.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug('Resolv API request', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        this.logger.error('Resolv API request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.debug('Resolv API response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        this.logger.error('Resolv API response error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.message || error.message,
        });
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: any): ResolvProtocolError {
    if (error.response) {
      return {
        code: `RESOLV_API_ERROR_${error.response.status}`,
        message: error.response.data?.message || `API request failed with status ${error.response.status}`,
        details: error.response.data,
      };
    }

    if (error.request) {
      return {
        code: 'RESOLV_NETWORK_ERROR',
        message: 'Network error communicating with Resolv Protocol',
        details: error.message,
      };
    }

    return {
      code: 'RESOLV_UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      details: error,
    };
  }

  /**
   * Get available delta-neutral vaults from Resolv Protocol
   */
  async getAvailableVaults(): Promise<ResolvVaultInfo[]> {
    try {
      this.logger.info('Fetching available Resolv Protocol vaults');

      if (!this.apiKey && this.isTestMode) {
        return this.getMockVaults();
      }

      const response = await this.client.get('/v1/vaults');
      
      const vaults: ResolvVaultInfo[] = response.data.vaults.map((vault: any) => ({
        vaultId: vault.id,
        name: vault.name,
        symbol: vault.symbol,
        strategy: vault.strategy,
        totalValueLocked: vault.totalValueLocked,
        currentAPY: parseFloat(vault.currentAPY),
        riskScore: vault.riskScore,
        minimumDeposit: vault.minimumDeposit,
        maximumDeposit: vault.maximumDeposit,
        lockupPeriod: vault.lockupPeriod,
        status: vault.status,
        underlyingTokens: vault.underlyingTokens,
        collateralRatio: vault.collateralRatio,
        liquidationThreshold: vault.liquidationThreshold,
      }));

      this.logger.info('Successfully fetched Resolv Protocol vaults', { count: vaults.length });
      return vaults;
    } catch (error) {
      this.logger.error('Failed to fetch Resolv Protocol vaults', { error });
      throw error;
    }
  }

  /**
   * Get specific vault information
   */
  async getVaultInfo(vaultId: string): Promise<ResolvVaultInfo> {
    try {
      this.logger.info('Fetching Resolv Protocol vault info', { vaultId });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockVaultInfo(vaultId);
      }

      const response = await this.client.get(`/v1/vaults/${vaultId}`);
      
      const vault = response.data;
      return {
        vaultId: vault.id,
        name: vault.name,
        symbol: vault.symbol,
        strategy: vault.strategy,
        totalValueLocked: vault.totalValueLocked,
        currentAPY: parseFloat(vault.currentAPY),
        riskScore: vault.riskScore,
        minimumDeposit: vault.minimumDeposit,
        maximumDeposit: vault.maximumDeposit,
        lockupPeriod: vault.lockupPeriod,
        status: vault.status,
        underlyingTokens: vault.underlyingTokens,
        collateralRatio: vault.collateralRatio,
        liquidationThreshold: vault.liquidationThreshold,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Resolv Protocol vault info', { vaultId, error });
      throw error;
    }
  }

  /**
   * Enter a delta-neutral position
   */
  async enterPosition(request: ResolvPositionRequest): Promise<ResolvPositionResponse> {
    try {
      this.logger.info('Entering Resolv Protocol position', { 
        vaultId: request.vaultId, 
        amount: request.amount 
      });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockPositionResponse(request);
      }

      const response = await this.client.post('/v1/positions/enter', {
        vaultId: request.vaultId,
        amount: request.amount,
        userAddress: request.userAddress,
        slippageTolerance: request.slippageTolerance,
        deadline: request.deadline || Math.floor(Date.now() / 1000) + 1800, // 30 minutes default
      });

      const position = response.data;
      return {
        transactionId: position.transactionId,
        vaultId: position.vaultId,
        amount: position.amount,
        shares: position.shares,
        expectedAPY: parseFloat(position.expectedAPY),
        entryPrice: position.entryPrice,
        leverageRatio: position.leverageRatio,
        status: position.status,
        blockchainTxHash: position.blockchainTxHash,
        gasEstimate: position.gasEstimate,
      };
    } catch (error) {
      this.logger.error('Failed to enter Resolv Protocol position', { request, error });
      throw error;
    }
  }

  /**
   * Exit a delta-neutral position
   */
  async exitPosition(request: ResolvExitRequest): Promise<ResolvExitResponse> {
    try {
      this.logger.info('Exiting Resolv Protocol position', { 
        vaultId: request.vaultId, 
        shares: request.shares 
      });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockExitResponse(request);
      }

      const response = await this.client.post('/v1/positions/exit', {
        vaultId: request.vaultId,
        shares: request.shares,
        userAddress: request.userAddress,
        slippageTolerance: request.slippageTolerance,
        isEmergencyExit: request.isEmergencyExit || false,
      });

      const exit = response.data;
      return {
        transactionId: exit.transactionId,
        vaultId: exit.vaultId,
        shares: exit.shares,
        amount: exit.amount,
        exitPrice: exit.exitPrice,
        realizedPnL: exit.realizedPnL,
        fees: exit.fees,
        status: exit.status,
        blockchainTxHash: exit.blockchainTxHash,
      };
    } catch (error) {
      this.logger.error('Failed to exit Resolv Protocol position', { request, error });
      throw error;
    }
  }

  /**
   * Get user position information
   */
  async getUserPosition(vaultId: string, userAddress: string): Promise<ResolvPositionInfo | null> {
    try {
      this.logger.info('Fetching Resolv Protocol user position', { vaultId, userAddress });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockUserPosition(vaultId, userAddress);
      }

      const response = await this.client.get(`/v1/positions/${vaultId}/${userAddress}`);
      
      if (!response.data.position) {
        return null;
      }

      const position = response.data.position;
      return {
        vaultId: position.vaultId,
        userAddress: position.userAddress,
        shares: position.shares,
        currentValue: position.currentValue,
        originalDeposit: position.originalDeposit,
        unrealizedPnL: position.unrealizedPnL,
        realizedPnL: position.realizedPnL,
        currentAPY: parseFloat(position.currentAPY),
        entryPrice: position.entryPrice,
        currentPrice: position.currentPrice,
        leverageRatio: position.leverageRatio,
        healthFactor: position.healthFactor,
        liquidationPrice: position.liquidationPrice,
        entryDate: position.entryDate,
        status: position.status,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Resolv Protocol user position', { vaultId, userAddress, error });
      throw error;
    }
  }

  /**
   * Get risk metrics for a vault
   */
  async getRiskMetrics(vaultId: string): Promise<ResolvRiskMetrics> {
    try {
      this.logger.info('Fetching Resolv Protocol risk metrics', { vaultId });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockRiskMetrics(vaultId);
      }

      const response = await this.client.get(`/v1/vaults/${vaultId}/risk`);
      
      const risk = response.data;
      return {
        vaultId: risk.vaultId,
        impermanentLoss: risk.impermanentLoss,
        volatility: risk.volatility,
        sharpeRatio: risk.sharpeRatio,
        maxDrawdown: risk.maxDrawdown,
        liquidationRisk: risk.liquidationRisk,
        correlationMatrix: risk.correlationMatrix,
        hedgeEffectiveness: risk.hedgeEffectiveness,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Resolv Protocol risk metrics', { vaultId, error });
      throw error;
    }
  }

  /**
   * Get rebalance information for a vault
   */
  async getRebalanceInfo(vaultId: string): Promise<ResolvRebalanceInfo> {
    try {
      this.logger.info('Fetching Resolv Protocol rebalance info', { vaultId });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockRebalanceInfo(vaultId);
      }

      const response = await this.client.get(`/v1/vaults/${vaultId}/rebalance`);
      
      const rebalance = response.data;
      return {
        vaultId: rebalance.vaultId,
        lastRebalance: rebalance.lastRebalance,
        nextRebalance: rebalance.nextRebalance,
        rebalanceThreshold: rebalance.rebalanceThreshold,
        currentImbalance: rebalance.currentImbalance,
        recommendedAction: rebalance.recommendedAction,
        expectedCost: rebalance.expectedCost,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Resolv Protocol rebalance info', { vaultId, error });
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<{ status: string; blockchainTxHash?: string }> {
    try {
      this.logger.info('Fetching Resolv Protocol transaction status', { transactionId });

      if (!this.apiKey && this.isTestMode) {
        return { status: 'CONFIRMED', blockchainTxHash: '0x' + '1'.repeat(64) };
      }

      const response = await this.client.get(`/v1/transactions/${transactionId}`);
      
      return {
        status: response.data.status,
        blockchainTxHash: response.data.blockchainTxHash,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Resolv Protocol transaction status', { transactionId, error });
      throw error;
    }
  }

  /**
   * Health check for Resolv Protocol API
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey && this.isTestMode) {
        return { status: 'healthy', latency: 75 };
      }

      await this.client.get('/v1/health');
      const latency = Date.now() - startTime;
      
      return { status: 'healthy', latency };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Mock data methods for testing and development
  private getMockVaults(): ResolvVaultInfo[] {
    return [
      {
        vaultId: 'resolv-delta-eth-usdc',
        name: 'ETH-USDC Delta Neutral',
        symbol: 'rETH-USDC-DN',
        strategy: 'DELTA_NEUTRAL',
        totalValueLocked: '25000000000000000000000000',
        currentAPY: 8.25,
        riskScore: 35,
        minimumDeposit: '1000000000000000000000',
        maximumDeposit: '5000000000000000000000000',
        lockupPeriod: 0,
        status: 'ACTIVE',
        underlyingTokens: ['ETH', 'USDC'],
        collateralRatio: 1.5,
        liquidationThreshold: 1.2,
      },
      {
        vaultId: 'resolv-delta-btc-usdt',
        name: 'BTC-USDT Delta Neutral',
        symbol: 'rBTC-USDT-DN',
        strategy: 'DELTA_NEUTRAL',
        totalValueLocked: '15000000000000000000000000',
        currentAPY: 7.95,
        riskScore: 40,
        minimumDeposit: '1000000000000000000000',
        maximumDeposit: '5000000000000000000000000',
        lockupPeriod: 0,
        status: 'ACTIVE',
        underlyingTokens: ['BTC', 'USDT'],
        collateralRatio: 1.4,
        liquidationThreshold: 1.15,
      }
    ];
  }

  private getMockVaultInfo(vaultId: string): ResolvVaultInfo {
    const vaults = this.getMockVaults();
    const vault = vaults.find(v => v.vaultId === vaultId);
    if (!vault) {
      throw { code: 'VAULT_NOT_FOUND', message: 'Vault not found' };
    }
    return vault;
  }

  private getMockPositionResponse(request: ResolvPositionRequest): ResolvPositionResponse {
    return {
      transactionId: `resolv_enter_${Date.now()}`,
      vaultId: request.vaultId,
      amount: request.amount,
      shares: (parseFloat(request.amount) * 0.98).toString(), // 2% fees
      expectedAPY: 8.25,
      entryPrice: '2000000000000000000000',
      leverageRatio: 1.5,
      status: 'CONFIRMED',
      blockchainTxHash: '0x' + Math.random().toString(16).substr(2, 64),
      gasEstimate: '250000',
    };
  }

  private getMockExitResponse(request: ResolvExitRequest): ResolvExitResponse {
    const amount = parseFloat(request.shares) * 1.02; // 2% profit
    return {
      transactionId: `resolv_exit_${Date.now()}`,
      vaultId: request.vaultId,
      shares: request.shares,
      amount: amount.toString(),
      exitPrice: '2040000000000000000000',
      realizedPnL: (amount - parseFloat(request.shares)).toString(),
      fees: (amount * 0.005).toString(), // 0.5% exit fee
      status: 'CONFIRMED',
      blockchainTxHash: '0x' + Math.random().toString(16).substr(2, 64),
    };
  }

  private getMockUserPosition(vaultId: string, userAddress: string): ResolvPositionInfo {
    return {
      vaultId,
      userAddress,
      shares: '5000000000000000000000',
      currentValue: '5200000000000000000000',
      originalDeposit: '5000000000000000000000',
      unrealizedPnL: '200000000000000000000',
      realizedPnL: '0',
      currentAPY: 8.25,
      entryPrice: '2000000000000000000000',
      currentPrice: '2040000000000000000000',
      leverageRatio: 1.5,
      healthFactor: 2.1,
      liquidationPrice: '1600000000000000000000',
      entryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ACTIVE',
    };
  }

  private getMockRiskMetrics(vaultId: string): ResolvRiskMetrics {
    return {
      vaultId,
      impermanentLoss: '50000000000000000000',
      volatility: 0.15,
      sharpeRatio: 1.8,
      maxDrawdown: '300000000000000000000',
      liquidationRisk: 0.05,
      correlationMatrix: {
        'ETH-USDC': -0.95,
        'BTC-USDT': -0.92,
      },
      hedgeEffectiveness: 0.94,
    };
  }

  private getMockRebalanceInfo(vaultId: string): ResolvRebalanceInfo {
    return {
      vaultId,
      lastRebalance: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      nextRebalance: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
      rebalanceThreshold: 0.05,
      currentImbalance: 0.02,
      recommendedAction: 'HOLD',
      expectedCost: '25000000000000000000',
    };
  }
}