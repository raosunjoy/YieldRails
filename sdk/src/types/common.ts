/**
 * Common types used throughout the SDK
 */

export enum ChainName {
  ethereum = 'ethereum',
  polygon = 'polygon',
  arbitrum = 'arbitrum',
  base = 'base',
  xrpl = 'xrpl',
  solana = 'solana'
}

export enum TokenSymbol {
  USDC = 'USDC',
  USDT = 'USDT',
  EURC = 'EURC',
  RLUSD = 'RLUSD'
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
}

export class YieldRailsError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'YieldRailsError';
  }
}

export interface SDKConfig {
  apiUrl: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

export interface WebSocketConfig {
  url: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface ChainConfig {
  rpcUrl: string;
  chainId: number;
  name: string;
  blockExplorer?: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface ContractAddresses {
  YieldEscrow: string;
  YieldVault: string;
  CrossChainBridge: string;
}

export interface TokenConfig {
  symbol: TokenSymbol;
  name: string;
  decimals: number;
  addresses: Record<ChainName, string>;
}

export interface TransactionOptions {
  gasLimit?: bigint | number;
  gasPrice?: bigint | number;
  maxFeePerGas?: bigint | number;
  maxPriorityFeePerGas?: bigint | number;
  nonce?: number;
  value?: bigint | number;
}