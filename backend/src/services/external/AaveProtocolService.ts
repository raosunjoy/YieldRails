import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from 'pino';
import { logger } from '../../config/logger';
import { environment } from '../../config/environment';

// Aave Protocol API Types
export interface AaveMarketInfo {
  marketId: string;
  name: string;
  chainId: number;
  liquidityPoolAddress: string;
  totalLiquidity: string;
  totalBorrowed: string;
  liquidityRate: number; // APY for suppliers
  borrowRate: number; // APY for borrowers
  utilizationRate: number;
  status: 'ACTIVE' | 'PAUSED' | 'FROZEN';
}

export interface AaveAssetInfo {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  priceUSD: string;
  liquidityRate: number;
  borrowRate: number;
  availableLiquidity: string;
  totalBorrowed: string;
  utilizationRate: number;
  ltv: number; // Loan to Value ratio
  liquidationThreshold: number;
  liquidationBonus: number;
  reserveFactor: number;
  canBeCollateral: boolean;
  canBeBorrowed: boolean;
  canBeSupplied: boolean;
  isActive: boolean;
  isFrozen: boolean;
}

export interface AaveSupplyRequest {
  marketId: string;
  asset: string;
  amount: string;
  userAddress: string;
  onBehalfOf?: string;
}

export interface AaveSupplyResponse {
  transactionId: string;
  marketId: string;
  asset: string;
  amount: string;
  aTokenAmount: string;
  currentLiquidityRate: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  blockchainTxHash?: string;
  gasEstimate?: string;
}

export interface AaveWithdrawRequest {
  marketId: string;
  asset: string;
  amount: string; // Use 'MAX' for full withdrawal
  userAddress: string;
}

export interface AaveWithdrawResponse {
  transactionId: string;
  marketId: string;
  asset: string;
  amount: string;
  aTokensBurned: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  blockchainTxHash?: string;
}

export interface AaveUserReserveData {
  asset: string;
  currentBalance: string;
  currentBalanceUSD: string;
  principalBalance: string;
  accruedInterest: string;
  liquidityRate: number;
  usageAsCollateralEnabled: boolean;
  aTokenAddress: string;
}

export interface AaveUserAccountData {
  totalCollateralUSD: string;
  totalBorrowsUSD: string;
  availableBorrowsUSD: string;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: string;
  reserves: AaveUserReserveData[];
}

export interface AaveRewardsInfo {
  asset: string;
  rewardToken: string;
  emissionPerSecond: string;
  totalEmission: string;
  distributionEnd: string;
  rewardTokenPrice: string;
  incentivizedActions: ('SUPPLY' | 'BORROW')[];
}

export interface AaveProtocolError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Service for integrating with Aave Protocol for lending yield strategies
 * Aave is a decentralized lending protocol that allows users to supply
 * liquidity and earn interest, or borrow assets using collateral
 */
export class AaveProtocolService {
  private readonly client: AxiosInstance;
  private readonly logger: Logger;
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly isTestMode: boolean;

  constructor() {
    this.logger = logger.child({ service: 'AaveProtocolService' });
    this.baseURL = environment.AAVE_API_URL || 'https://api.aave.com';
    this.apiKey = environment.AAVE_API_KEY || '';
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
        this.logger.debug('Aave API request', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        this.logger.error('Aave API request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.debug('Aave API response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        this.logger.error('Aave API response error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.message || error.message,
        });
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: any): AaveProtocolError {
    if (error.response) {
      return {
        code: `AAVE_API_ERROR_${error.response.status}`,
        message: error.response.data?.message || `API request failed with status ${error.response.status}`,
        details: error.response.data,
      };
    }

    if (error.request) {
      return {
        code: 'AAVE_NETWORK_ERROR',
        message: 'Network error communicating with Aave Protocol',
        details: error.message,
      };
    }

    return {
      code: 'AAVE_UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      details: error,
    };
  }

  /**
   * Get available markets from Aave Protocol
   */
  async getAvailableMarkets(): Promise<AaveMarketInfo[]> {
    try {
      this.logger.info('Fetching available Aave Protocol markets');

      if (!this.apiKey && this.isTestMode) {
        return this.getMockMarkets();
      }

      const response = await this.client.get('/v1/markets');
      
      const markets: AaveMarketInfo[] = response.data.markets.map((market: any) => ({
        marketId: market.id,
        name: market.name,
        chainId: market.chainId,
        liquidityPoolAddress: market.liquidityPoolAddress,
        totalLiquidity: market.totalLiquidity,
        totalBorrowed: market.totalBorrowed,
        liquidityRate: parseFloat(market.liquidityRate),
        borrowRate: parseFloat(market.borrowRate),
        utilizationRate: parseFloat(market.utilizationRate),
        status: market.status,
      }));

      this.logger.info('Successfully fetched Aave Protocol markets', { count: markets.length });
      return markets;
    } catch (error) {
      this.logger.error('Failed to fetch Aave Protocol markets', { error });
      throw error;
    }
  }

  /**
   * Get assets information for a specific market
   */
  async getMarketAssets(marketId: string): Promise<AaveAssetInfo[]> {
    try {
      this.logger.info('Fetching Aave Protocol market assets', { marketId });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockAssets(marketId);
      }

      const response = await this.client.get(`/v1/markets/${marketId}/assets`);
      
      const assets: AaveAssetInfo[] = response.data.assets.map((asset: any) => ({
        symbol: asset.symbol,
        name: asset.name,
        decimals: asset.decimals,
        address: asset.address,
        priceUSD: asset.priceUSD,
        liquidityRate: parseFloat(asset.liquidityRate),
        borrowRate: parseFloat(asset.borrowRate),
        availableLiquidity: asset.availableLiquidity,
        totalBorrowed: asset.totalBorrowed,
        utilizationRate: parseFloat(asset.utilizationRate),
        ltv: parseFloat(asset.ltv),
        liquidationThreshold: parseFloat(asset.liquidationThreshold),
        liquidationBonus: parseFloat(asset.liquidationBonus),
        reserveFactor: parseFloat(asset.reserveFactor),
        canBeCollateral: asset.canBeCollateral,
        canBeBorrowed: asset.canBeBorrowed,
        canBeSupplied: asset.canBeSupplied,
        isActive: asset.isActive,
        isFrozen: asset.isFrozen,
      }));

      this.logger.info('Successfully fetched Aave Protocol market assets', { 
        marketId, 
        count: assets.length 
      });
      return assets;
    } catch (error) {
      this.logger.error('Failed to fetch Aave Protocol market assets', { marketId, error });
      throw error;
    }
  }

  /**
   * Supply assets to Aave Protocol
   */
  async supplyAsset(request: AaveSupplyRequest): Promise<AaveSupplyResponse> {
    try {
      this.logger.info('Supplying asset to Aave Protocol', { 
        marketId: request.marketId,
        asset: request.asset,
        amount: request.amount 
      });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockSupplyResponse(request);
      }

      const response = await this.client.post('/v1/supply', {
        marketId: request.marketId,
        asset: request.asset,
        amount: request.amount,
        userAddress: request.userAddress,
        onBehalfOf: request.onBehalfOf || request.userAddress,
      });

      const supply = response.data;
      return {
        transactionId: supply.transactionId,
        marketId: supply.marketId,
        asset: supply.asset,
        amount: supply.amount,
        aTokenAmount: supply.aTokenAmount,
        currentLiquidityRate: parseFloat(supply.currentLiquidityRate),
        status: supply.status,
        blockchainTxHash: supply.blockchainTxHash,
        gasEstimate: supply.gasEstimate,
      };
    } catch (error) {
      this.logger.error('Failed to supply asset to Aave Protocol', { request, error });
      throw error;
    }
  }

  /**
   * Withdraw assets from Aave Protocol
   */
  async withdrawAsset(request: AaveWithdrawRequest): Promise<AaveWithdrawResponse> {
    try {
      this.logger.info('Withdrawing asset from Aave Protocol', { 
        marketId: request.marketId,
        asset: request.asset,
        amount: request.amount 
      });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockWithdrawResponse(request);
      }

      const response = await this.client.post('/v1/withdraw', {
        marketId: request.marketId,
        asset: request.asset,
        amount: request.amount,
        userAddress: request.userAddress,
      });

      const withdrawal = response.data;
      return {
        transactionId: withdrawal.transactionId,
        marketId: withdrawal.marketId,
        asset: withdrawal.asset,
        amount: withdrawal.amount,
        aTokensBurned: withdrawal.aTokensBurned,
        status: withdrawal.status,
        blockchainTxHash: withdrawal.blockchainTxHash,
      };
    } catch (error) {
      this.logger.error('Failed to withdraw asset from Aave Protocol', { request, error });
      throw error;
    }
  }

  /**
   * Get user account data
   */
  async getUserAccountData(marketId: string, userAddress: string): Promise<AaveUserAccountData> {
    try {
      this.logger.info('Fetching Aave Protocol user account data', { marketId, userAddress });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockUserAccountData(marketId, userAddress);
      }

      const response = await this.client.get(`/v1/users/${userAddress}/markets/${marketId}`);
      
      const account = response.data;
      return {
        totalCollateralUSD: account.totalCollateralUSD,
        totalBorrowsUSD: account.totalBorrowsUSD,
        availableBorrowsUSD: account.availableBorrowsUSD,
        currentLiquidationThreshold: parseFloat(account.currentLiquidationThreshold),
        ltv: parseFloat(account.ltv),
        healthFactor: account.healthFactor,
        reserves: account.reserves.map((reserve: any) => ({
          asset: reserve.asset,
          currentBalance: reserve.currentBalance,
          currentBalanceUSD: reserve.currentBalanceUSD,
          principalBalance: reserve.principalBalance,
          accruedInterest: reserve.accruedInterest,
          liquidityRate: parseFloat(reserve.liquidityRate),
          usageAsCollateralEnabled: reserve.usageAsCollateralEnabled,
          aTokenAddress: reserve.aTokenAddress,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to fetch Aave Protocol user account data', { 
        marketId, 
        userAddress, 
        error 
      });
      throw error;
    }
  }

  /**
   * Get rewards information
   */
  async getRewardsInfo(marketId: string): Promise<AaveRewardsInfo[]> {
    try {
      this.logger.info('Fetching Aave Protocol rewards info', { marketId });

      if (!this.apiKey && this.isTestMode) {
        return this.getMockRewardsInfo(marketId);
      }

      const response = await this.client.get(`/v1/markets/${marketId}/rewards`);
      
      const rewards: AaveRewardsInfo[] = response.data.rewards.map((reward: any) => ({
        asset: reward.asset,
        rewardToken: reward.rewardToken,
        emissionPerSecond: reward.emissionPerSecond,
        totalEmission: reward.totalEmission,
        distributionEnd: reward.distributionEnd,
        rewardTokenPrice: reward.rewardTokenPrice,
        incentivizedActions: reward.incentivizedActions,
      }));

      this.logger.info('Successfully fetched Aave Protocol rewards info', { 
        marketId, 
        count: rewards.length 
      });
      return rewards;
    } catch (error) {
      this.logger.error('Failed to fetch Aave Protocol rewards info', { marketId, error });
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<{ status: string; blockchainTxHash?: string }> {
    try {
      this.logger.info('Fetching Aave Protocol transaction status', { transactionId });

      if (!this.apiKey && this.isTestMode) {
        return { status: 'CONFIRMED', blockchainTxHash: '0x' + '1'.repeat(64) };
      }

      const response = await this.client.get(`/v1/transactions/${transactionId}`);
      
      return {
        status: response.data.status,
        blockchainTxHash: response.data.blockchainTxHash,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Aave Protocol transaction status', { transactionId, error });
      throw error;
    }
  }

  /**
   * Health check for Aave Protocol API
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey && this.isTestMode) {
        return { status: 'healthy', latency: 60 };
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
  private getMockMarkets(): AaveMarketInfo[] {
    return [
      {
        marketId: 'aave-v3-ethereum',
        name: 'Aave V3 Ethereum',
        chainId: 1,
        liquidityPoolAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        totalLiquidity: '15000000000000000000000000000',
        totalBorrowed: '8000000000000000000000000000',
        liquidityRate: 3.45,
        borrowRate: 4.25,
        utilizationRate: 0.53,
        status: 'ACTIVE',
      },
      {
        marketId: 'aave-v3-polygon',
        name: 'Aave V3 Polygon',
        chainId: 137,
        liquidityPoolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
        totalLiquidity: '1200000000000000000000000000',
        totalBorrowed: '600000000000000000000000000',
        liquidityRate: 4.12,
        borrowRate: 5.05,
        utilizationRate: 0.50,
        status: 'ACTIVE',
      }
    ];
  }

  private getMockAssets(marketId: string): AaveAssetInfo[] {
    return [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        address: '0xA0b86a33E6441c474c7b79827bEb16C5E63CE86A',
        priceUSD: '1.000',
        liquidityRate: 3.45,
        borrowRate: 4.25,
        availableLiquidity: '500000000000000',
        totalBorrowed: '300000000000000',
        utilizationRate: 0.375,
        ltv: 0.77,
        liquidationThreshold: 0.80,
        liquidationBonus: 0.05,
        reserveFactor: 0.10,
        canBeCollateral: true,
        canBeBorrowed: true,
        canBeSupplied: true,
        isActive: true,
        isFrozen: false,
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        address: '0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a',
        priceUSD: '1.000',
        liquidityRate: 3.52,
        borrowRate: 4.31,
        availableLiquidity: '450000000000000',
        totalBorrowed: '280000000000000',
        utilizationRate: 0.384,
        ltv: 0.75,
        liquidationThreshold: 0.78,
        liquidationBonus: 0.05,
        reserveFactor: 0.10,
        canBeCollateral: true,
        canBeBorrowed: true,
        canBeSupplied: true,
        isActive: true,
        isFrozen: false,
      }
    ];
  }

  private getMockSupplyResponse(request: AaveSupplyRequest): AaveSupplyResponse {
    return {
      transactionId: `aave_supply_${Date.now()}`,
      marketId: request.marketId,
      asset: request.asset,
      amount: request.amount,
      aTokenAmount: request.amount, // 1:1 ratio for aTokens
      currentLiquidityRate: 3.45,
      status: 'CONFIRMED',
      blockchainTxHash: '0x' + Math.random().toString(16).substr(2, 64),
      gasEstimate: '150000',
    };
  }

  private getMockWithdrawResponse(request: AaveWithdrawRequest): AaveWithdrawResponse {
    return {
      transactionId: `aave_withdraw_${Date.now()}`,
      marketId: request.marketId,
      asset: request.asset,
      amount: request.amount,
      aTokensBurned: request.amount,
      status: 'CONFIRMED',
      blockchainTxHash: '0x' + Math.random().toString(16).substr(2, 64),
    };
  }

  private getMockUserAccountData(marketId: string, userAddress: string): AaveUserAccountData {
    return {
      totalCollateralUSD: '10500.50',
      totalBorrowsUSD: '7200.00',
      availableBorrowsUSD: '800.50',
      currentLiquidationThreshold: 0.80,
      ltv: 0.75,
      healthFactor: '1.46',
      reserves: [
        {
          asset: 'USDC',
          currentBalance: '5000000000',
          currentBalanceUSD: '5000.00',
          principalBalance: '4950000000',
          accruedInterest: '50000000',
          liquidityRate: 3.45,
          usageAsCollateralEnabled: true,
          aTokenAddress: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
        },
        {
          asset: 'USDT',
          currentBalance: '5500000000',
          currentBalanceUSD: '5500.50',
          principalBalance: '5450000000',
          accruedInterest: '50000000',
          liquidityRate: 3.52,
          usageAsCollateralEnabled: true,
          aTokenAddress: '0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811',
        }
      ],
    };
  }

  private getMockRewardsInfo(marketId: string): AaveRewardsInfo[] {
    return [
      {
        asset: 'USDC',
        rewardToken: 'AAVE',
        emissionPerSecond: '1157407407407407',
        totalEmission: '100000000000000000000000',
        distributionEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        rewardTokenPrice: '95.50',
        incentivizedActions: ['SUPPLY'],
      },
      {
        asset: 'USDT',
        rewardToken: 'AAVE',
        emissionPerSecond: '925925925925926',
        totalEmission: '80000000000000000000000',
        distributionEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        rewardTokenPrice: '95.50',
        incentivizedActions: ['SUPPLY'],
      }
    ];
  }
}