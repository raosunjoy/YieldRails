/**
 * Payment-related types
 */

import { ChainName, TokenSymbol } from './common';

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export enum PaymentType {
  STANDARD = 'STANDARD',
  CROSS_CHAIN = 'CROSS_CHAIN',
  YIELD_OPTIMIZED = 'YIELD_OPTIMIZED'
}

export interface CreatePaymentRequest {
  merchantAddress: string;
  amount: string;
  token: TokenSymbol;
  chain: ChainName;
  customerEmail?: string;
  metadata?: Record<string, any>;
  yieldEnabled?: boolean;
  expiresAt?: Date;
}

export interface Payment {
  id: string;
  userId: string;
  merchantId: string;
  amount: string;
  currency: string;
  tokenAddress: string;
  tokenSymbol: TokenSymbol;
  status: PaymentStatus;
  type: PaymentType;
  
  // Network information
  sourceChain: ChainName;
  destinationChain?: ChainName;
  sourceTransactionHash?: string;
  destTransactionHash?: string;
  
  // Addresses
  senderAddress: string;
  recipientAddress: string;
  escrowAddress?: string;
  
  // Yield information
  estimatedYield?: string;
  actualYield?: string;
  yieldDuration?: number;
  yieldStrategy?: string;
  
  // Fees
  platformFee?: string;
  networkFee?: string;
  totalFees?: string;
  
  // Metadata
  description?: string;
  metadata?: Record<string, any>;
  externalReference?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  releasedAt?: string;
  expiresAt?: string;
}

export interface PaymentEvent {
  id: string;
  paymentId: string;
  type: string;
  data: Record<string, any>;
  createdAt: string;
}

export interface PaymentAnalytics {
  totalPayments: number;
  completedPayments: number;
  completionRate: number;
  totalVolume: string;
  totalYieldGenerated: string;
  averagePaymentAmount: string;
  paymentsByStatus: Record<string, number>;
  yieldByStrategy: Array<{
    strategyId: string;
    totalYield: string;
    paymentCount: number;
  }>;
}

export interface PaymentHistoryParams extends PaginationParams {
  status?: PaymentStatus;
  merchantId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface PaymentHistoryResponse {
  payments: Payment[];
  total: number;
  analytics?: {
    totalPayments: number;
    totalVolume: string;
    totalYieldEarned: string;
    averagePaymentAmount: string;
  };
}

import { PaginationParams } from './common';