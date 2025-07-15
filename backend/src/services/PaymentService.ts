import { ethers } from 'ethers';
import { PrismaClient, PaymentStatus, PaymentType, PaymentEventType } from '@prisma/client';
import { chainConfigs, supportedTokens } from '../config/environment';
import { logger, logBlockchainOperation, logBusinessEvent } from '../utils/logger';
import { ContractService } from './ContractService';
import { YieldService } from './YieldService';
import { NotificationService } from './NotificationService';

// Import modular components
import { PaymentValidator } from './payment/PaymentValidator';
import { PaymentCache } from './payment/PaymentCache';
import { PaymentOperations } from './payment/PaymentOperations';
import { 
    CreatePaymentRequest,
    PaymentAnalytics,
    PaymentHistoryResponse,
    PaymentMetrics,
    PaymentWithBlockchainStatus,
    BatchProcessingResult,
    EscrowResult
} from './payment/types';

// Export types for external use
export { 
    PaymentStatus, 
    PaymentType, 
    PaymentEventType,
    CreatePaymentRequest,
    PaymentAnalytics,
    PaymentHistoryResponse,
    PaymentMetrics
} from './payment/types';

/**
 * Core payment processing service with blockchain integration
 */
export class PaymentService {
    private operations: PaymentOperations;

    constructor(
        private contractService: ContractService = new ContractService(),
        private yieldService: YieldService = new YieldService(),
        private notificationService: NotificationService = new NotificationService(),
        private prisma: PrismaClient = new PrismaClient()
    ) {
        this.operations = new PaymentOperations(
            this.prisma,
            this.contractService,
            this.yieldService,
            this.notificationService
        );
    }

    /**
     * Create a new payment with blockchain integration
     */
    async createPayment(request: CreatePaymentRequest, userId: string): Promise<any> {
        const startTime = Date.now();

        try {
            if (!userId) {
                throw new Error('User ID is required for payment creation');
            }

            // Validate request
            await PaymentValidator.validatePaymentRequest(request);

            // Find or create merchant
            const merchant = await this.findOrCreateMerchant(request.merchantAddress);

            // Create escrow transaction on blockchain
            const escrowResult = await this.createEscrowTransaction(request);

            // Store payment in database
            const payment = await this.storePayment(userId, merchant.id, request, escrowResult);

            // Create payment event
            await this.createPaymentEvent(payment.id, PaymentEventType.CREATED, {
                escrowAddress: escrowResult.escrowAddress,
                transactionHash: escrowResult.transactionHash
            });

            // Cache payment for quick access
            await PaymentCache.cachePayment(payment);

            // Log business event
            logBusinessEvent('payment_created', userId, {
                paymentId: payment.id,
                amount: request.amount,
                token: request.token,
                chain: request.chain,
                yieldEnabled: request.yieldEnabled,
            });

            logger.info(`Payment created successfully: ${payment.id}`, {
                duration: Date.now() - startTime,
                paymentId: payment.id,
                merchantAddress: request.merchantAddress,
                amount: request.amount,
                token: request.token,
                chain: request.chain,
            });

            return payment;

        } catch (error) {
            logger.error('Failed to create payment:', error);
            throw error;
        }
    }

    /**
     * Get payment by ID with caching
     */
    async getPayment(paymentId: string): Promise<any | null> {
        try {
            // Try cache first
            const cached = await PaymentCache.getCachedPayment(paymentId);
            if (cached) {
                return cached;
            }

            // Fallback to database
            const payment = await this.prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    user: true,
                    merchant: true,
                    yieldEarnings: true,
                    paymentEvents: true
                }
            });

            if (payment) {
                // Cache for future requests
                await PaymentCache.cachePayment(payment);
                return payment;
            }

            return null;

        } catch (error) {
            logger.error(`Failed to get payment ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Update payment status with blockchain verification
     */
    async updatePaymentStatus(
        paymentId: string,
        status: PaymentStatus,
        transactionHash?: string,
        metadata?: Record<string, any>
    ): Promise<any> {
        try {
            const payment = await this.getPayment(paymentId);
            if (!payment) {
                throw new Error(`Payment ${paymentId} not found`);
            }

            // Validate status transition
            if (!PaymentValidator.validateStatusTransition(payment.status, status)) {
                throw new Error(`Invalid status transition from ${payment.status} to ${status}`);
            }

            const updateData: any = {
                status,
                updatedAt: new Date(),
            };

            if (transactionHash) {
                updateData.sourceTransactionHash = transactionHash;
            }

            if (metadata) {
                updateData.metadata = metadata;
            }

            if (status === PaymentStatus.CONFIRMED) {
                updateData.confirmedAt = new Date();
            } else if (status === PaymentStatus.COMPLETED) {
                updateData.releasedAt = new Date();
            }

            const updatedPayment = await this.prisma.payment.update({
                where: { id: paymentId },
                data: updateData,
            });

            // Create payment event
            const eventType = this.getEventTypeFromStatus(status);
            await this.createPaymentEvent(paymentId, eventType, {
                transactionHash,
                metadata
            });

            // Update cache
            await PaymentCache.cachePayment(updatedPayment);

            // Send notifications
            await this.notificationService.sendPaymentStatusUpdate(updatedPayment);

            // Start yield generation if confirmed and enabled
            if (status === PaymentStatus.CONFIRMED && updatedPayment.yieldStrategy) {
                await this.operations.startYieldGeneration(paymentId);
            }

            logBusinessEvent('payment_status_updated', updatedPayment.userId, {
                paymentId,
                status,
                transactionHash,
            });

            logger.info(`Payment status updated: ${paymentId} -> ${status}`);

            return updatedPayment;

        } catch (error) {
            logger.error(`Failed to update payment status ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Confirm a payment with blockchain transaction
     */
    async confirmPayment(paymentId: string, transactionHash: string): Promise<any> {
        return this.updatePaymentStatus(paymentId, PaymentStatus.CONFIRMED, transactionHash);
    }

    /**
     * Release payment with yield calculation
     */
    async releasePayment(paymentId: string): Promise<any> {
        try {
            const payment = await this.getPayment(paymentId);
            if (!payment) {
                throw new Error(`Payment ${paymentId} not found`);
            }

            if (payment.status !== PaymentStatus.CONFIRMED) {
                throw new Error(`Payment ${paymentId} is not confirmed and cannot be released`);
            }

            // Calculate final yield before release
            const finalYield = await this.yieldService.calculateFinalYield(paymentId);

            // Release payment on blockchain
            const releaseResult = await this.contractService.releasePayment(
                payment.escrowAddress,
                payment.senderAddress,
                payment.recipientAddress,
                payment.amount.toString(),
                finalYield
            );

            // Update payment status
            const updatedPayment = await this.prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: PaymentStatus.COMPLETED,
                    releasedAt: new Date(),
                    actualYield: parseFloat(finalYield),
                    destTransactionHash: releaseResult.transactionHash
                }
            });

            // Create yield earnings record
            if (parseFloat(finalYield) > 0) {
                await this.operations.createYieldEarning(payment, finalYield);
            }

            // Create payment event
            await this.createPaymentEvent(paymentId, PaymentEventType.RELEASED, {
                transactionHash: releaseResult.transactionHash,
                finalYield,
                releasedAt: new Date()
            });

            // Send notifications
            await this.notificationService.sendPaymentStatusUpdate(updatedPayment);
            await this.sendWebhookNotification(updatedPayment, 'payment.completed');

            // Update cache
            await PaymentCache.cachePayment(updatedPayment);

            logBusinessEvent('payment_released', payment.userId, { 
                paymentId, 
                finalYield,
                transactionHash: releaseResult.transactionHash
            });

            return updatedPayment;
        } catch (error) {
            logger.error('Error releasing payment:', error);
            throw error;
        }
    }

    /**
     * Cancel a payment
     */
    async cancelPayment(paymentId: string, reason?: string): Promise<any> {
        return this.operations.cancelPayment(paymentId, reason);
    }

    /**
     * Get payment status with blockchain verification
     */
    async getPaymentStatusWithBlockchainVerification(paymentId: string): Promise<PaymentWithBlockchainStatus> {
        return this.operations.getPaymentStatusWithBlockchainVerification(paymentId);
    }

    /**
     * Batch process payments for yield updates
     */
    async batchProcessPayments(paymentIds: string[]): Promise<BatchProcessingResult> {
        return this.operations.batchProcessPayments(paymentIds);
    }

    /**
     * Get user payment history with analytics
     */
    async getUserPaymentHistory(
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<PaymentHistoryResponse> {
        try {
            // Check cache first
            const cacheKey = `${userId}:${limit}:${offset}`;
            const cached = await PaymentCache.getCachedUserHistory(cacheKey);
            if (cached) {
                return cached;
            }

            const [payments, totalPayments, totalVolume, totalYieldEarned] = await Promise.all([
                this.prisma.payment.findMany({
                    where: { userId },
                    include: {
                        merchant: true,
                        yieldEarnings: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                this.prisma.payment.count({
                    where: { userId },
                }),
                this.prisma.payment.aggregate({
                    where: { userId },
                    _sum: { amount: true }
                }),
                this.prisma.yieldEarning.aggregate({
                    where: { userId },
                    _sum: { netYieldAmount: true }
                })
            ]);

            const result: PaymentHistoryResponse = {
                payments,
                total: totalPayments,
                analytics: {
                    totalPayments,
                    totalVolume: Number(totalVolume._sum.amount || 0),
                    totalYieldEarned: Number(totalYieldEarned._sum.netYieldAmount || 0),
                    averagePaymentAmount: totalPayments > 0 ? Number(totalVolume._sum.amount || 0) / totalPayments : 0
                }
            };

            // Cache result
            await PaymentCache.cacheUserHistory(cacheKey, result);

            return result;

        } catch (error) {
            logger.error(`Failed to get user payment history for ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get merchant payment analytics
     */
    async getMerchantAnalytics(
        merchantId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<PaymentAnalytics> {
        try {
            // Check cache first
            const cacheKey = `${merchantId}:${startDate?.getTime()}:${endDate?.getTime()}`;
            const cached = await PaymentCache.getCachedAnalytics(cacheKey);
            if (cached) {
                return cached;
            }

            const whereClause: any = { merchantId };
            
            if (startDate || endDate) {
                whereClause.createdAt = {};
                if (startDate) whereClause.createdAt.gte = startDate;
                if (endDate) whereClause.createdAt.lte = endDate;
            }

            const [
                totalPayments,
                completedPayments,
                totalVolume,
                totalYieldGenerated,
                averagePaymentAmount,
                paymentsByStatus,
                yieldByStrategy
            ] = await Promise.all([
                this.prisma.payment.count({ where: whereClause }),
                this.prisma.payment.count({ 
                    where: { ...whereClause, status: PaymentStatus.COMPLETED }
                }),
                this.prisma.payment.aggregate({
                    where: whereClause,
                    _sum: { amount: true }
                }),
                this.prisma.payment.aggregate({
                    where: whereClause,
                    _sum: { actualYield: true }
                }),
                this.prisma.payment.aggregate({
                    where: whereClause,
                    _avg: { amount: true }
                }),
                this.prisma.payment.groupBy({
                    by: ['status'],
                    where: whereClause,
                    _count: { status: true }
                }),
                this.prisma.yieldEarning.groupBy({
                    by: ['strategyId'],
                    where: {
                        payment: { merchantId }
                    },
                    _sum: { yieldAmount: true },
                    _count: { strategyId: true }
                })
            ]);

            const analytics: PaymentAnalytics = {
                totalPayments,
                completedPayments,
                completionRate: totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
                totalVolume: Number(totalVolume._sum.amount || 0),
                totalYieldGenerated: Number(totalYieldGenerated._sum.actualYield || 0),
                averagePaymentAmount: Number(averagePaymentAmount._avg.amount || 0),
                paymentsByStatus: paymentsByStatus.reduce((acc, item) => {
                    acc[item.status] = item._count.status;
                    return acc;
                }, {} as Record<string, number>),
                yieldByStrategy: yieldByStrategy.map(item => ({
                    strategyId: item.strategyId,
                    totalYield: Number(item._sum.yieldAmount || 0),
                    paymentCount: item._count.strategyId
                }))
            };

            // Cache analytics
            await PaymentCache.cacheAnalytics(cacheKey, analytics);

            return analytics;
        } catch (error) {
            logger.error(`Failed to get merchant analytics for ${merchantId}:`, error);
            throw error;
        }
    }

    /**
     * Get merchant payments with pagination
     */
    async getMerchantPayments(
        merchantId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<{ payments: any[]; total: number }> {
        try {
            const [payments, total] = await Promise.all([
                this.prisma.payment.findMany({
                    where: { merchantId },
                    include: {
                        user: true,
                        yieldEarnings: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                this.prisma.payment.count({
                    where: { merchantId },
                }),
            ]);

            return { payments, total };

        } catch (error) {
            logger.error(`Failed to get merchant payments for ${merchantId}:`, error);
            throw error;
        }
    }

    /**
     * Get comprehensive payment metrics
     */
    async getPaymentMetrics(startDate?: Date, endDate?: Date): Promise<PaymentMetrics> {
        try {
            const whereClause: any = {};
            
            if (startDate || endDate) {
                whereClause.createdAt = {};
                if (startDate) whereClause.createdAt.gte = startDate;
                if (endDate) whereClause.createdAt.lte = endDate;
            }

            const [
                totalPayments,
                completedPayments,
                failedPayments,
                totalVolume,
                totalYieldGenerated,
                averagePaymentAmount,
                processingTimes
            ] = await Promise.all([
                this.prisma.payment.count({ where: whereClause }),
                this.prisma.payment.count({ 
                    where: { ...whereClause, status: PaymentStatus.COMPLETED }
                }),
                this.prisma.payment.count({ 
                    where: { ...whereClause, status: PaymentStatus.FAILED }
                }),
                this.prisma.payment.aggregate({
                    where: whereClause,
                    _sum: { amount: true }
                }),
                this.prisma.payment.aggregate({
                    where: whereClause,
                    _sum: { actualYield: true }
                }),
                this.prisma.payment.aggregate({
                    where: whereClause,
                    _avg: { amount: true }
                }),
                this.prisma.payment.findMany({
                    where: {
                        ...whereClause,
                        status: PaymentStatus.COMPLETED,
                        confirmedAt: { not: null },
                        releasedAt: { not: null }
                    },
                    select: {
                        confirmedAt: true,
                        releasedAt: true
                    }
                })
            ]);

            // Calculate average processing time
            const processingTimesMs = processingTimes
                .filter(p => p.confirmedAt && p.releasedAt)
                .map(p => p.releasedAt!.getTime() - p.confirmedAt!.getTime());

            const averageProcessingTimeMs = processingTimesMs.length > 0 
                ? processingTimesMs.reduce((a, b) => a + b, 0) / processingTimesMs.length 
                : 0;

            return {
                totalPayments,
                completedPayments,
                failedPayments,
                successRate: totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
                failureRate: totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0,
                totalVolume: Number(totalVolume._sum.amount || 0),
                totalYieldGenerated: Number(totalYieldGenerated._sum.actualYield || 0),
                averagePaymentAmount: Number(averagePaymentAmount._avg.amount || 0),
                averageProcessingTimeMs,
                averageProcessingTimeHours: averageProcessingTimeMs / (1000 * 60 * 60)
            };
        } catch (error) {
            logger.error('Failed to get payment metrics:', error);
            throw error;
        }
    }

    /**
     * Handle blockchain transaction failures with retry logic
     */
    async handleTransactionFailure(
        paymentId: string,
        transactionHash: string,
        error: any
    ): Promise<void> {
        try {
            // Update payment status to failed
            await this.prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: PaymentStatus.FAILED,
                    sourceTransactionHash: transactionHash,
                    updatedAt: new Date()
                }
            });

            // Create failure event
            await this.createPaymentEvent(paymentId, PaymentEventType.FAILED, {
                transactionHash,
                error: error.message || 'Transaction failed',
                failedAt: new Date()
            });

            // Get payment for notifications
            const payment = await this.getPayment(paymentId);
            
            // Send failure notifications
            await this.notificationService.sendPaymentFailed(payment, error);
            await this.sendWebhookNotification(payment, 'payment.failed');

            // Update cache
            await PaymentCache.cachePayment(payment);

            logBusinessEvent('payment_failed', payment.userId, {
                paymentId,
                transactionHash,
                error: error.message
            });

        } catch (err) {
            logger.error(`Failed to handle transaction failure for payment ${paymentId}:`, err);
        }
    }

    /**
     * Private helper methods
     */
    
    private async findOrCreateMerchant(merchantAddress: string) {
        let merchant = await this.prisma.merchant.findFirst({
            where: {
                name: { contains: merchantAddress.slice(0, 8) }
            }
        });

        if (!merchant) {
            merchant = await this.prisma.merchant.create({
                data: {
                    name: `Merchant ${merchantAddress.slice(0, 8)}`,
                    email: `merchant+${merchantAddress.slice(0, 8)}@example.com`,
                    defaultCurrency: 'USD',
                    supportedChains: ['ethereum'],
                    verificationStatus: 'PENDING'
                }
            });
        }

        return merchant;
    }

    private async createEscrowTransaction(request: CreatePaymentRequest): Promise<EscrowResult> {
        const chainConfig = chainConfigs[request.chain];
        
        logBlockchainOperation('create_escrow', chainConfig.chainId, undefined, undefined, {
            amount: request.amount,
            token: request.token,
        });

        try {
            const tokenConfig = supportedTokens[request.token];
            const chainAddresses = tokenConfig?.addresses as Record<string, string> | undefined;
            const tokenAddress = chainAddresses?.[request.chain] || '';

            const escrowAddress = (chainConfig.contracts as any)?.yieldEscrow || '0x0000000000000000000000000000000000000000';
            const result = await this.contractService.createEscrow(
                escrowAddress,
                request.chain,
                request.amount,
                tokenAddress,
                request.merchantAddress,
                '0x0000000000000000000000000000000000000000',
                ethers.keccak256(ethers.toUtf8Bytes(`${request.merchantAddress}-${Date.now()}`)),
                JSON.stringify(request.metadata || {})
            );

            return {
                escrowAddress,
                transactionHash: result.transactionHash,
                depositIndex: result.depositIndex
            };
        } catch (error) {
            logger.error('Contract service failed:', error);
            throw error;
        }
    }

    private async storePayment(userId: string, merchantId: string, request: CreatePaymentRequest, escrowResult: EscrowResult): Promise<any> {
        const tokenConfig = supportedTokens[request.token];
        const amountDecimal = parseFloat(request.amount);
        
        const chainAddresses = tokenConfig?.addresses as Record<string, string> | undefined;
        const tokenAddress = chainAddresses?.[request.chain] || '';

        const payment = await this.prisma.payment.create({
            data: {
                userId,
                merchantId,
                amount: amountDecimal,
                currency: 'USD',
                tokenAddress,
                tokenSymbol: request.token,
                status: PaymentStatus.PENDING,
                type: PaymentType.MERCHANT_PAYMENT,
                sourceChain: request.chain,
                destinationChain: request.chain,
                senderAddress: '0x0000000000000000000000000000000000000000',
                recipientAddress: request.merchantAddress,
                escrowAddress: escrowResult.escrowAddress,
                estimatedYield: request.yieldEnabled ? amountDecimal * 0.05 : null,
                yieldStrategy: request.yieldEnabled ? 'Circle USDC Lending' : null,
                description: `Payment to ${request.merchantAddress.slice(0, 8)}...`,
                metadata: request.metadata || {},
                expiresAt: request.expiresAt,
            },
        });

        return payment;
    }

    private async createPaymentEvent(
        paymentId: string, 
        eventType: PaymentEventType, 
        eventData?: any
    ): Promise<void> {
        await this.prisma.paymentEvent.create({
            data: {
                paymentId,
                eventType,
                eventData: eventData || {},
                createdAt: new Date()
            }
        });
    }

    private getEventTypeFromStatus(status: PaymentStatus): PaymentEventType {
        switch (status) {
            case PaymentStatus.CONFIRMED:
                return PaymentEventType.CONFIRMED;
            case PaymentStatus.COMPLETED:
                return PaymentEventType.RELEASED;
            case PaymentStatus.FAILED:
                return PaymentEventType.FAILED;
            case PaymentStatus.CANCELLED:
                return PaymentEventType.CANCELLED;
            default:
                return PaymentEventType.CREATED;
        }
    }

    private async sendWebhookNotification(payment: any, eventType: string): Promise<void> {
        try {
            if (!payment.merchant?.webhookUrl) {
                return;
            }

            const webhookPayload = {
                event: eventType,
                payment: {
                    id: payment.id,
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    tokenSymbol: payment.tokenSymbol,
                    sourceChain: payment.sourceChain,
                    actualYield: payment.actualYield,
                    createdAt: payment.createdAt,
                    confirmedAt: payment.confirmedAt,
                    releasedAt: payment.releasedAt
                },
                timestamp: new Date().toISOString()
            };

            await this.notificationService.sendWebhook(
                payment.merchant.webhookUrl,
                webhookPayload
            );

        } catch (error) {
            logger.error(`Failed to send webhook notification for payment ${payment.id}:`, error);
        }
    }

    /**
     * Start yield generation for a payment
     */
    public async startYieldGeneration(paymentId: string): Promise<void> {
        return await this.operations.startYieldGeneration(paymentId);
    }

    /**
     * Update payment yield
     */
    public async updatePaymentYield(paymentId: string): Promise<void> {
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { id: paymentId }
            });

            if (!payment) {
                throw new Error('Payment not found');
            }

            if (payment.status !== PaymentStatus.CONFIRMED) {
                throw new Error('Payment must be confirmed to update yield');
            }

            // Calculate current yield
            const currentYield = await this.yieldService.calculateYield(paymentId);
            
            // Update payment with new yield
            await this.prisma.payment.update({
                where: { id: paymentId },
                data: { actualYield: currentYield }
            });

            logger.info(`Updated yield for payment ${paymentId}: ${currentYield}`);
        } catch (error) {
            logger.error(`Failed to update payment yield: ${error}`);
            throw error;
        }
    }
}