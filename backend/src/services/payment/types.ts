import { PaymentStatus, PaymentType, PaymentEventType, YieldStatus } from '@prisma/client';
import { ChainName, TokenSymbol } from '../../config/environment';

// Re-export Prisma types
export { PaymentStatus, PaymentType, PaymentEventType, YieldStatus };

/**
 * Payment creation request interface
 */
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

/**
 * Payment analytics interface
 */
export interface PaymentAnalytics {
    totalPayments: number;
    completedPayments: number;
    completionRate: number;
    totalVolume: number;
    totalYieldGenerated: number;
    averagePaymentAmount: number;
    paymentsByStatus: Record<string, number>;
    yieldByStrategy: Array<{
        strategyId: string;
        totalYield: number;
        paymentCount: number;
    }>;
}

/**
 * Payment history response interface
 */
export interface PaymentHistoryResponse {
    payments: any[];
    total: number;
    analytics?: {
        totalPayments: number;
        totalVolume: number;
        totalYieldEarned: number;
        averagePaymentAmount: number;
    };
}

/**
 * Payment metrics interface
 */
export interface PaymentMetrics {
    totalPayments: number;
    completedPayments: number;
    failedPayments: number;
    successRate: number;
    failureRate: number;
    totalVolume: number;
    totalYieldGenerated: number;
    averagePaymentAmount: number;
    averageProcessingTimeMs: number;
    averageProcessingTimeHours: number;
}

/**
 * Blockchain status interface
 */
export interface BlockchainStatus {
    confirmed: boolean;
    blockNumber?: number;
    gasUsed?: string;
    confirmations?: number;
}

/**
 * Payment with blockchain verification
 */
export interface PaymentWithBlockchainStatus {
    payment: any;
    blockchainStatus: BlockchainStatus | null;
    currentYield?: number;
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
    success: string[];
    failed: string[];
    errors: Record<string, string>;
}

/**
 * Escrow creation result
 */
export interface EscrowResult {
    escrowAddress: string;
    transactionHash: string;
    depositIndex: number;
}

/**
 * Yield generation parameters
 */
export interface YieldGenerationParams {
    amount: number;
    token: string;
    strategy: string | null;
    startTime: Date;
}