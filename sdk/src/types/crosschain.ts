/**
 * Cross-chain related types
 */

import { ChainName, TokenSymbol } from './common';

export enum BridgeStatus {
  INITIATED = 'INITIATED',
  VALIDATED = 'VALIDATED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export interface BridgeRequest {
  recipient: string;
  amount: string;
  token: TokenSymbol;
  sourceChain: ChainName;
  destinationChain: ChainName;
  metadata?: Record<string, any>;
}

export interface BridgeTransaction {
  id: string;
  userId: string;
  recipient: string;
  amount: string;
  token: TokenSymbol;
  sourceChain: ChainName;
  destinationChain: ChainName;
  status: BridgeStatus;
  
  // Transaction hashes
  sourceTransactionHash?: string;
  destinationTransactionHash?: string;
  
  // Fees and yield
  bridgeFee: string;
  estimatedYield: string;
  actualYield?: string;
  
  // Timing
  estimatedDuration: number; // in seconds
  actualDuration?: number;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BridgeEstimate {
  fee: string;
  estimatedDuration: number; // in seconds
  estimatedYield: string;
  route: Array<{
    chain: ChainName;
    protocol: string;
    estimatedTime: number;
  }>;
}

export interface LiquidityInfo {
  chain: ChainName;
  token: TokenSymbol;
  availableLiquidity: string;
  utilizationRate: string;
  isAvailable: boolean;
}