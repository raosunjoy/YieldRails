import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from 'pino';
import { logger } from '../../config/logger';
import { environment } from '../../config/environment';

// Noble Protocol API Types
export interface NoblePoolInfo {
  poolId: string;
  name: string;
  symbol: string;
  totalSupply: string;
  totalAssets: string;
  currentAPY: number;
  maturityDate?: string;
  minimumDeposit: string;
  maximumDeposit: string;
  status: 'ACTIVE' | 'PAUSED' | 'MATURED';
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
  underlyingAssets: string[];
}

export interface NobleDepositRequest {
  poolId: string;
  amount: string;
  userAddress: string;
  referralCode?: string;
}

export interface NobleDepositResponse {
  transactionId: string;
  poolId: string;
  amount: string;
  shares: string;
  estimatedAPY: number;
  maturityDate?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  blockchainTxHash?: string;
}

export interface NobleWithdrawRequest {
  poolId: string;
  shares: string;
  userAddress: string;
  isEmergency?: boolean;
}

export interface NobleWithdrawResponse {
  transactionId: string;
  poolId: string;
  shares: string;
  amount: string;
  penalty?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  blockchainTxHash?: string;
}

export interface NoblePositionInfo {
  poolId: string;
  userAddress: string;
  shares: string;
  currentValue: string;
  originalDeposit: string;
  accruedYield: string;
  currentAPY: number;
  depositDate: string;
  maturityDate?: string;
  status: 'ACTIVE' | 'MATURED' | 'WITHDRAWN';
}

export interface NobleYieldData {
  poolId: string;
  dailyYield: string;
  weeklyYield: string;
  monthlyYield: string;
  totalYield: string;
  currentAPY: number;
  projectedAPY: number;
  lastUpdated: string;
}

export interface NobleProtocolError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Service for integrating with Noble Protocol for T-bill yield strategies
 * Noble Protocol provides institutional-grade treasury bill investments
 * with tokenized access and automated yield distribution
 */
export class NobleProtocolService {
  private readonly client: AxiosInstance;
  private readonly logger: Logger;
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly isTestMode: boolean;

  constructor() {
    this.logger = logger.child({ service: 'NobleProtocolService' });
    this.baseURL = environment.NOBLE_API_URL || 'https://api.noble.xyz';
    this.apiKey = environment.NOBLE_API_KEY || '';
    this.isTestMode = environment.NODE_ENV !== 'production';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'User-Agent': 'YieldRails/1.0.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug('Noble API request', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        this.logger.error('Noble API request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.debug('Noble API response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        this.logger.error('Noble API response error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.message || error.message,
        });
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: any): NobleProtocolError {
    if (error.response) {
      return {
        code: `NOBLE_API_ERROR_${error.response.status}`,
        message: error.response.data?.message || `API request failed with status ${error.response.status}`,
        details: error.response.data,
      };
    }

    if (error.request) {
      return {
        code: 'NOBLE_NETWORK_ERROR',
        message: 'Network error communicating with Noble Protocol',
        details: error.message,
      };
    }

    return {
      code: 'NOBLE_UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      details: error,
    };
  }

  /**
   * Get available T-bill pools from Noble Protocol
   */
  async getAvailablePools(): Promise<NoblePoolInfo[]> {
    try {
      this.logger.info('Fetching available Noble Protocol pools');

      if (!this.apiKey && this.isTestMode) {
        return this.getMockPools();
      }

      const response = await this.client.get('/v1/pools');
      
      const pools: NoblePoolInfo[] = response.data.pools.map((pool: any) => ({
        poolId: pool.id,
        name: pool.name,
        symbol: pool.symbol,
        totalSupply: pool.totalSupply,
        totalAssets: pool.totalAssets,
        currentAPY: parseFloat(pool.currentAPY),
        maturityDate: pool.maturityDate,
        minimumDeposit: pool.minimumDeposit,
        maximumDeposit: pool.maximumDeposit,
        status: pool.status,
        riskRating: pool.riskRating,
        underlyingAssets: pool.underlyingAssets,
      }));

      this.logger.info('Successfully fetched Noble Protocol pools', { count: pools.length });
      return pools;
    } catch (error) {
      this.logger.error('Failed to fetch Noble Protocol pools', { error });
      throw error;
    }
  }

  /**
   * Get specific pool information
   */
  async getPoolInfo(poolId: string): Promise<NoblePoolInfo> {
    try {
      this.logger.info('Fetching Noble Protocol pool info', { poolId });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockPoolInfo(poolId);
      }

      const response = await this.client.get(`/v1/pools/${poolId}`);
      
      const pool = response.data;
      return {
        poolId: pool.id,
        name: pool.name,
        symbol: pool.symbol,
        totalSupply: pool.totalSupply,
        totalAssets: pool.totalAssets,
        currentAPY: parseFloat(pool.currentAPY),
        maturityDate: pool.maturityDate,
        minimumDeposit: pool.minimumDeposit,
        maximumDeposit: pool.maximumDeposit,
        status: pool.status,
        riskRating: pool.riskRating,
        underlyingAssets: pool.underlyingAssets,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Noble Protocol pool info', { poolId, error });
      throw error;
    }
  }

  /**
   * Initiate deposit into Noble Protocol T-bill pool
   */
  async initiateDeposit(request: NobleDepositRequest): Promise<NobleDepositResponse> {
    try {
      this.logger.info('Initiating Noble Protocol deposit', { 
        poolId: request.poolId, 
        amount: request.amount 
      });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockDepositResponse(request);
      }

      const response = await this.client.post('/v1/deposits', {
        poolId: request.poolId,
        amount: request.amount,
        userAddress: request.userAddress,
        referralCode: request.referralCode,
      });

      const deposit = response.data;
      return {
        transactionId: deposit.transactionId,
        poolId: deposit.poolId,
        amount: deposit.amount,
        shares: deposit.shares,
        estimatedAPY: parseFloat(deposit.estimatedAPY),
        maturityDate: deposit.maturityDate,
        status: deposit.status,
        blockchainTxHash: deposit.blockchainTxHash,
      };
    } catch (error) {
      this.logger.error('Failed to initiate Noble Protocol deposit', { request, error });
      throw error;
    }
  }

  /**
   * Initiate withdrawal from Noble Protocol T-bill pool
   */
  async initiateWithdraw(request: NobleWithdrawRequest): Promise<NobleWithdrawResponse> {
    try {
      this.logger.info('Initiating Noble Protocol withdrawal', { 
        poolId: request.poolId, 
        shares: request.shares 
      });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockWithdrawResponse(request);
      }

      const response = await this.client.post('/v1/withdrawals', {
        poolId: request.poolId,
        shares: request.shares,
        userAddress: request.userAddress,
        isEmergency: request.isEmergency || false,
      });

      const withdrawal = response.data;
      return {
        transactionId: withdrawal.transactionId,
        poolId: withdrawal.poolId,
        shares: withdrawal.shares,
        amount: withdrawal.amount,
        penalty: withdrawal.penalty,
        status: withdrawal.status,
        blockchainTxHash: withdrawal.blockchainTxHash,
      };
    } catch (error) {
      this.logger.error('Failed to initiate Noble Protocol withdrawal', { request, error });
      throw error;
    }
  }

  /**
   * Get user position in Noble Protocol pool
   */
  async getUserPosition(poolId: string, userAddress: string): Promise<NoblePositionInfo | null> {
    try {
      this.logger.info('Fetching Noble Protocol user position', { poolId, userAddress });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockUserPosition(poolId, userAddress);
      }

      const response = await this.client.get(`/v1/positions/${poolId}/${userAddress}`);
      
      if (!response.data.position) {
        return null;
      }

      const position = response.data.position;
      return {
        poolId: position.poolId,
        userAddress: position.userAddress,
        shares: position.shares,
        currentValue: position.currentValue,
        originalDeposit: position.originalDeposit,
        accruedYield: position.accruedYield,
        currentAPY: parseFloat(position.currentAPY),
        depositDate: position.depositDate,
        maturityDate: position.maturityDate,
        status: position.status,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Noble Protocol user position', { poolId, userAddress, error });
      throw error;
    }
  }

  /**
   * Get yield data for a specific pool
   */
  async getYieldData(poolId: string): Promise<NobleYieldData> {
    try {
      this.logger.info('Fetching Noble Protocol yield data', { poolId });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockYieldData(poolId);
      }

      const response = await this.client.get(`/v1/pools/${poolId}/yield`);
      
      const yieldData = response.data;
      return {
        poolId: yieldData.poolId,
        dailyYield: yieldData.dailyYield,
        weeklyYield: yieldData.weeklyYield,
        monthlyYield: yieldData.monthlyYield,
        totalYield: yieldData.totalYield,
        currentAPY: parseFloat(yieldData.currentAPY),
        projectedAPY: parseFloat(yieldData.projectedAPY),
        lastUpdated: yieldData.lastUpdated,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Noble Protocol yield data', { poolId, error });
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<{ status: string; blockchainTxHash?: string }> {
    try {
      this.logger.info('Fetching Noble Protocol transaction status', { transactionId });

      if (!this.apiKey && this.isTestMode) {
        return { status: 'CONFIRMED', blockchainTxHash: '0x' + '1'.repeat(64) };
      }

      const response = await this.client.get(`/v1/transactions/${transactionId}`);
      
      return {
        status: response.data.status,
        blockchainTxHash: response.data.blockchainTxHash,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Noble Protocol transaction status', { transactionId, error });
      throw error;
    }
  }

  /**
   * Health check for Noble Protocol API
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey && this.isTestMode) {
        return { status: 'healthy', latency: 50 };
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
  private getMockPools(): NoblePoolInfo[] {
    return [
      {
        poolId: 'noble-tbill-3m',
        name: '3-Month T-Bill Pool',
        symbol: 'NTBILL3M',
        totalSupply: '50000000000000000000000000',
        totalAssets: '50000000000000000000000000',
        currentAPY: 4.85,
        maturityDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        minimumDeposit: '1000000000000000000000',
        maximumDeposit: '10000000000000000000000000',
        status: 'ACTIVE',
        riskRating: 'LOW',
        underlyingAssets: ['US Treasury Bills'],
      },
      {
        poolId: 'noble-tbill-6m',
        name: '6-Month T-Bill Pool',
        symbol: 'NTBILL6M',
        totalSupply: '75000000000000000000000000',
        totalAssets: '75000000000000000000000000',
        currentAPY: 5.12,
        maturityDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        minimumDeposit: '1000000000000000000000',
        maximumDeposit: '10000000000000000000000000',
        status: 'ACTIVE',
        riskRating: 'LOW',
        underlyingAssets: ['US Treasury Bills'],
      }
    ];
  }

  private getMockPoolInfo(poolId: string): NoblePoolInfo {
    const pools = this.getMockPools();
    const pool = pools.find(p => p.poolId === poolId);
    if (!pool) {
      throw { code: 'POOL_NOT_FOUND', message: 'Pool not found' };
    }
    return pool;
  }

  private getMockDepositResponse(request: NobleDepositRequest): NobleDepositResponse {
    return {
      transactionId: `noble_dep_${Date.now()}`,
      poolId: request.poolId,
      amount: request.amount,
      shares: request.amount, // 1:1 ratio for simplicity
      estimatedAPY: 4.85,
      maturityDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'CONFIRMED',
      blockchainTxHash: '0x' + Math.random().toString(16).substr(2, 64),
    };
  }

  private getMockWithdrawResponse(request: NobleWithdrawRequest): NobleWithdrawResponse {
    return {
      transactionId: `noble_with_${Date.now()}`,
      poolId: request.poolId,
      shares: request.shares,
      amount: request.shares, // 1:1 ratio for simplicity
      status: 'CONFIRMED',
      blockchainTxHash: '0x' + Math.random().toString(16).substr(2, 64),
    };
  }

  private getMockUserPosition(poolId: string, userAddress: string): NoblePositionInfo {
    return {
      poolId,
      userAddress,
      shares: '5000000000000000000000',
      currentValue: '5100000000000000000000',
      originalDeposit: '5000000000000000000000',
      accruedYield: '100000000000000000000',
      currentAPY: 4.85,
      depositDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      maturityDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ACTIVE',
    };
  }

  private getMockYieldData(poolId: string): NobleYieldData {
    return {
      poolId,
      dailyYield: '10000000000000000000',
      weeklyYield: '70000000000000000000',
      monthlyYield: '300000000000000000000',
      totalYield: '500000000000000000000',
      currentAPY: 4.85,
      projectedAPY: 4.92,
      lastUpdated: new Date().toISOString(),
    };
  }
}