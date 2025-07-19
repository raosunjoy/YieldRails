/**
 * External service integration methods for the YieldRails SDK
 */

import { ApiClient } from '../client/api-client';

export interface ExternalServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  services: {
    circleCCTP: ServiceStatus;
    noble: ServiceStatus;
    resolv: ServiceStatus;
    aave: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  error?: string;
  lastChecked: string;
}

export interface NoblePool {
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

export interface ResolvVault {
  vaultId: string;
  name: string;
  symbol: string;
  strategy: 'DELTA_NEUTRAL' | 'YIELD_FARMING' | 'ARBITRAGE';
  totalValueLocked: string;
  currentAPY: number;
  riskScore: number;
  minimumDeposit: string;
  maximumDeposit: string;
  lockupPeriod: number;
  status: 'ACTIVE' | 'PAUSED' | 'EMERGENCY_EXIT';
  underlyingTokens: string[];
  collateralRatio: number;
  liquidationThreshold: number;
}

export interface AaveMarket {
  marketId: string;
  name: string;
  chainId: number;
  liquidityPoolAddress: string;
  totalLiquidity: string;
  totalBorrowed: string;
  liquidityRate: number;
  borrowRate: number;
  utilizationRate: number;
  status: 'ACTIVE' | 'PAUSED' | 'FROZEN';
}

export interface CircleTransferInfo {
  transferId: string;
  sourceChain: number;
  destinationChain: number;
  amount: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  estimatedTime: number;
  fees: string;
  blockchainTxHash?: string;
}

export class ExternalService {
  constructor(private apiClient: ApiClient) {}

  /**
   * Get health status of all external services
   */
  async getServiceHealth(): Promise<ExternalServiceHealth> {
    const response = await this.apiClient.get('/api/health/external');
    return response.data;
  }

  /**
   * Get available Noble Protocol T-bill pools
   */
  async getNoblePools(): Promise<NoblePool[]> {
    const response = await this.apiClient.get('/api/external/noble/pools');
    return response.data;
  }

  /**
   * Get specific Noble pool information
   */
  async getNoblePool(poolId: string): Promise<NoblePool> {
    const response = await this.apiClient.get(`/api/external/noble/pools/${poolId}`);
    return response.data;
  }

  /**
   * Initiate deposit into Noble Protocol T-bill pool
   */
  async initiateNobleDeposit(request: {
    poolId: string;
    amount: string;
    userAddress: string;
    referralCode?: string;
  }): Promise<{
    transactionId: string;
    poolId: string;
    amount: string;
    shares: string;
    estimatedAPY: number;
    maturityDate?: string;
    status: 'PENDING' | 'CONFIRMED' | 'FAILED';
    blockchainTxHash?: string;
  }> {
    const response = await this.apiClient.post('/api/external/noble/deposit', request);
    return response.data;
  }

  /**
   * Get user position in Noble Protocol pool
   */
  async getNoblePosition(poolId: string, userAddress: string): Promise<{
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
  } | null> {
    const response = await this.apiClient.get(`/api/external/noble/positions/${poolId}/${userAddress}`);
    return response.data;
  }

  /**
   * Get available Resolv Protocol delta-neutral vaults
   */
  async getResolvVaults(): Promise<ResolvVault[]> {
    const response = await this.apiClient.get('/api/external/resolv/vaults');
    return response.data;
  }

  /**
   * Get specific Resolv vault information
   */
  async getResolvVault(vaultId: string): Promise<ResolvVault> {
    const response = await this.apiClient.get(`/api/external/resolv/vaults/${vaultId}`);
    return response.data;
  }

  /**
   * Enter a Resolv Protocol delta-neutral position
   */
  async enterResolvPosition(request: {
    vaultId: string;
    amount: string;
    userAddress: string;
    slippageTolerance: number;
    deadline?: number;
  }): Promise<{
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
  }> {
    const response = await this.apiClient.post('/api/external/resolv/enter', request);
    return response.data;
  }

  /**
   * Get user position in Resolv Protocol vault
   */
  async getResolvPosition(vaultId: string, userAddress: string): Promise<{
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
  } | null> {
    const response = await this.apiClient.get(`/api/external/resolv/positions/${vaultId}/${userAddress}`);
    return response.data;
  }

  /**
   * Get available Aave Protocol markets
   */
  async getAaveMarkets(): Promise<AaveMarket[]> {
    const response = await this.apiClient.get('/api/external/aave/markets');
    return response.data;
  }

  /**
   * Get Aave market assets information
   */
  async getAaveMarketAssets(marketId: string): Promise<{
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
    ltv: number;
    liquidationThreshold: number;
    liquidationBonus: number;
    reserveFactor: number;
    canBeCollateral: boolean;
    canBeBorrowed: boolean;
    canBeSupplied: boolean;
    isActive: boolean;
    isFrozen: boolean;
  }[]> {
    const response = await this.apiClient.get(`/api/external/aave/markets/${marketId}/assets`);
    return response.data;
  }

  /**
   * Supply assets to Aave Protocol
   */
  async supplyToAave(request: {
    marketId: string;
    asset: string;
    amount: string;
    userAddress: string;
    onBehalfOf?: string;
  }): Promise<{
    transactionId: string;
    marketId: string;
    asset: string;
    amount: string;
    aTokenAmount: string;
    currentLiquidityRate: number;
    status: 'PENDING' | 'CONFIRMED' | 'FAILED';
    blockchainTxHash?: string;
    gasEstimate?: string;
  }> {
    const response = await this.apiClient.post('/api/external/aave/supply', request);
    return response.data;
  }

  /**
   * Get user account data from Aave Protocol
   */
  async getAaveUserData(marketId: string, userAddress: string): Promise<{
    totalCollateralUSD: string;
    totalBorrowsUSD: string;
    availableBorrowsUSD: string;
    currentLiquidationThreshold: number;
    ltv: number;
    healthFactor: string;
    reserves: Array<{
      asset: string;
      currentBalance: string;
      currentBalanceUSD: string;
      principalBalance: string;
      accruedInterest: string;
      liquidityRate: number;
      usageAsCollateralEnabled: boolean;
      aTokenAddress: string;
    }>;
  }> {
    const response = await this.apiClient.get(`/api/external/aave/users/${userAddress}/markets/${marketId}`);
    return response.data;
  }

  /**
   * Get Circle CCTP supported chains and info
   */
  async getCircleSupportedChains(): Promise<{
    chainId: number;
    name: string;
    symbol: string;
    domain: number;
    contractAddress: string;
    isActive: boolean;
  }[]> {
    const response = await this.apiClient.get('/api/external/circle/chains');
    return response.data;
  }

  /**
   * Initiate Circle CCTP cross-chain transfer
   */
  async initiateCircleTransfer(request: {
    amount: string;
    sourceChain: number;
    destinationChain: number;
    recipient: string;
    sender: string;
  }): Promise<CircleTransferInfo> {
    const response = await this.apiClient.post('/api/external/circle/transfer', request);
    return response.data;
  }

  /**
   * Get Circle CCTP transfer status
   */
  async getCircleTransferStatus(transferId: string): Promise<CircleTransferInfo> {
    const response = await this.apiClient.get(`/api/external/circle/transfers/${transferId}`);
    return response.data;
  }

  /**
   * Get transfer fees for Circle CCTP
   */
  async getCircleTransferFees(request: {
    amount: string;
    sourceChain: number;
    destinationChain: number;
  }): Promise<{
    bridgeFee: string;
    gasFee: string;
    totalFee: string;
    estimatedTime: number;
  }> {
    const response = await this.apiClient.post('/api/external/circle/fees', request);
    return response.data;
  }

  /**
   * Monitor external service circuit breakers
   */
  async getCircuitBreakerStatus(): Promise<Record<string, {
    isOpen: boolean;
    failures: number;
  }>> {
    const response = await this.apiClient.get('/api/external/circuit-breakers');
    return response.data;
  }

  /**
   * Reset circuit breaker for a specific service
   */
  async resetCircuitBreaker(serviceName: string): Promise<{ success: boolean }> {
    const response = await this.apiClient.post(`/api/external/circuit-breakers/${serviceName}/reset`);
    return response.data;
  }
}