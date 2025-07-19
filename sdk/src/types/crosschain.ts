/**
 * Cross-chain bridge types for YieldRails SDK
 */

import { ChainName, TokenSymbol } from './common';

/**
 * Bridge transaction status
 */
export type BridgeStatus = 
  | 'INITIATED'
  | 'BRIDGE_PENDING'
  | 'SOURCE_CONFIRMED'
  | 'DESTINATION_PENDING'
  | 'COMPLETED'
  | 'FAILED';

/**
 * Bridge request parameters
 */
export interface BridgeRequest {
  sourceChain: string;
  destinationChain: string;
  amount: string | number;
  sourceAddress: string;
  destinationAddress: string;
  token?: string;
  paymentId?: string;
}

/**
 * Bridge transaction response
 */
export interface BridgeTransaction {
  transactionId: string;
  status: BridgeStatus;
  sourceChain: string;
  destinationChain: string;
  amount: string;
  bridgeFee: string;
  estimatedTime: number;
  createdAt: string;
  paymentId?: string;
  sourceTransactionHash?: string;
  destTransactionHash?: string;
  bridgeTransactionId?: string;
}

/**
 * Bridge estimate response
 */
export interface BridgeEstimate {
  sourceChain: string;
  destinationChain: string;
  amount: number;
  estimatedFee: number;
  estimatedTime: number;
  estimatedYield: number;
  netAmount: number;
}

/**
 * Liquidity information
 */
export interface LiquidityInfo {
  available: boolean;
  reason: string;
  suggestedAmount: number;
  estimatedWaitTime: number;
}

/**
 * Chain information
 */
export interface ChainInfo {
  chainId: string;
  name: string;
  nativeCurrency: string;
  blockExplorer: string;
  isTestnet: boolean;
  avgBlockTime: number;
}

/**
 * Liquidity pool information
 */
export interface LiquidityPool {
  id: string;
  sourceChain: string;
  destinationChain: string;
  token: string;
  sourceBalance: number;
  destinationBalance: number;
  utilizationRate: number;
  rebalanceThreshold: number;
  minLiquidity: number;
  maxLiquidity: number;
  isActive: boolean;
}

/**
 * Bridge transaction detail
 */
export interface BridgeTransactionDetail {
  transactionId: string;
  status: BridgeStatus;
  progress: number;
  sourceChain: string;
  destinationChain: string;
  sourceAmount: string;
  destinationAmount: string;
  token: string;
  bridgeFee: string;
  estimatedYield: string;
  actualYield?: string;
  senderAddress: string;
  recipientAddress: string;
  paymentId?: string;
  sourceTransactionHash?: string;
  destinationTransactionHash?: string;
  externalTransactionId?: string;
  externalDetails?: any;
  validation?: {
    consensusReached: boolean;
    validatorSignatures: any[];
    requiredValidators: number;
    actualValidators: number;
    timestamp: string;
  };
  history?: TransactionUpdate[];
  timing: {
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    sourceConfirmedAt?: string;
    destinationConfirmedAt?: string;
    elapsedMinutes: number;
    estimatedMinutes: number;
    remainingMinutes: number;
  };
}

/**
 * Transaction update
 */
export interface TransactionUpdate {
  type: 'status_change' | 'confirmation' | 'yield_update' | 'error' | 'completion';
  status?: string;
  timestamp: string;
  data?: any;
}

/**
 * Bridge transaction history
 */
export interface BridgeTransactionHistory {
  transaction: BridgeTransaction;
  updates: TransactionUpdate[];
  lastUpdated: string;
  subscriberCount: number;
}

/**
 * Validator information
 */
export interface ValidatorInfo {
  id: string;
  address: string;
  isActive: boolean;
  reputation: number;
  lastSeen: string;
}

/**
 * Monitoring metrics
 */
export interface MonitoringMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageProcessingTime: number;
  totalVolume: number;
  liquidityUtilization: number;
  lastUpdated: string;
}

/**
 * Bridge analytics
 */
export interface BridgeAnalytics {
  timeRange: 'day' | 'week' | 'month';
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  successRate: number;
  totalVolume: number;
  totalFees: number;
  validatorMetrics: any;
  liquidityMetrics: any;
}