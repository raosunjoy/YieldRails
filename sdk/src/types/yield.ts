/**
 * Yield-related types
 */

import { ChainName, TokenSymbol } from './common';

export enum YieldStrategyType {
  LENDING = 'LENDING',
  STAKING = 'STAKING',
  LIQUIDITY_PROVIDING = 'LIQUIDITY_PROVIDING',
  TREASURY_BILLS = 'TREASURY_BILLS',
  YIELD_FARMING = 'YIELD_FARMING'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

export enum YieldStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  WITHDRAWN = 'WITHDRAWN'
}

export interface YieldStrategy {
  id: string;
  name: string;
  description?: string;
  protocolName: string;
  chainId: string;
  contractAddress: string;
  strategyType: YieldStrategyType;
  expectedAPY: string;
  riskLevel: RiskLevel;
  minAmount: string;
  maxAmount?: string;
  isActive: boolean;
  
  // Configuration
  strategyConfig: Record<string, any>;
  
  // Performance metrics
  totalValueLocked: string;
  actualAPY?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface YieldEarning {
  id: string;
  userId: string;
  paymentId: string;
  strategyId: string;
  principalAmount: string;
  yieldAmount: string;
  netYieldAmount: string;
  tokenAddress: string;
  tokenSymbol: TokenSymbol;
  startTime: string;
  endTime?: string;
  status: YieldStatus;
  createdAt: string;
  updatedAt: string;
}

export interface YieldOptimizationRequest {
  amount: string;
  token: TokenSymbol;
  chain: ChainName;
  riskTolerance: RiskLevel;
  duration?: number; // in days
}

export interface YieldOptimizationResponse {
  recommendedStrategy: YieldStrategy;
  estimatedAPY: string;
  estimatedYield: string;
  riskScore: number;
  alternatives: Array<{
    strategy: YieldStrategy;
    estimatedAPY: string;
    estimatedYield: string;
    riskScore: number;
  }>;
}

export interface YieldPerformanceMetrics {
  totalEarned: string;
  totalPrincipal: string;
  averageAPY: string;
  bestPerformingStrategy: {
    strategyId: string;
    name: string;
    apy: string;
  };
  earningsByStrategy: Array<{
    strategyId: string;
    name: string;
    totalEarned: string;
    apy: string;
    paymentCount: number;
  }>;
  earningsByToken: Array<{
    token: TokenSymbol;
    totalEarned: string;
    paymentCount: number;
  }>;
}