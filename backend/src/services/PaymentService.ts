import { ethers } from 'ethers';
import { PrismaClient, PaymentStatus, PaymentType, PaymentEventType, YieldStatus } from '@prisma/client';
import { redis } from '../config/redis';
import { chainConfigs, supportedTokens, ChainName, TokenSymbol } from '../config/environment';
import { logger, logBlockchainOperation, logBusinessEvent } from '../utils/logger';
import { ContractService } from './ContractService';
import { YieldService } from './YieldService';
import { NotificationService } from './NotificationService';
import { number } from 'zod';
import { string } from 'zod';
import { string } from 'zod';
import { error } from 'console';
import { boolean } from 'zod';
import { any } from 'zod';
import { error } from 'console';
import { number } from 'zod';
import { number } from 'zod';
import { number } from 'zod';
import { number } from 'zod';
import { any } from 'zod';
import { string } from 'zod';
import { string } from 'zod';
import { string } from 'zod';
import { string } from 'zod';
import { any } from 'zod';
import { string } from 'zod';
import { any } from 'zod';
import { any } from 'zod';
import { string } from 'zod';
import { any } from 'zod';
import { any } from 'zod';
import { string } from 'zod';
import { any } from 'zod';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { any } from 'zod';
import { any } from 'zod';
import { any } from 'zod';
import { request } from 'http';
import { string } from 'zod';
import { string } from 'zod';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { token } from 'morgan';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { any } from 'zod';
import { any } from 'zod';
import { request } from 'http';
import { string } from 'zod';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { request } from 'http';
import { error } from 'console';
import { error } from 'console';
import { error } from 'console';
import { error } from 'console';
import { error } from 'console';
import { error } from 'console';
import { number } from 'zod';
import { any } from 'zod';
import { error } from 'console';
import { string } from 'zod';
import { string } from 'zod';
import { error } from 'console';
import { error } from 'console';
import { error } from 'console';
import { error } from 'console';
import { error } from 'console';
import { any } from 'zod';
import { error } from 'console';
import { string } from 'zod';
import { string } from 'zod';
import { number } from 'zod';
import { any } from 'zod';
import { any } from 'zod';
import { any } from 'zod';
import { number } from 'zod';
import { number } from 'zod';
import { string } from 'zod';
import { any } from 'zod';
import { any } from 'zod';
import { string } from 'zod';
import { string } from 'zod';
import { string } from 'zod';
import { any } from 'zod';
import { any } from 'zod';
import { string } from 'zod';
import { any } from 'zod';
import { any } from 'zod';
import { string } from 'zod';
import { string } from 'zod';
import { boolean } from 'zod';
import { error } from 'console';
import { request } from 'http';
import { token } from 'morgan';
import { request } from 'http';
import { request } from 'http';
import { error } from 'console';
import { error } from 'console';
import { error } from 'console';

// Export the types for use in other files
export { PaymentStatus, PaymentType, PaymentEventType } from '@prisma/client';

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
 * Core payment processing service with blockchain integration
 */
export class PaymentService {
    private contractService: ContractService;
    private yieldService: YieldService;
    private notificationService: NotificationService;
    private prisma: PrismaClient;

    constructor(
        contractService?: ContractService,
        yieldService?: YieldService,
        notificationService?: NotificationService,
        prisma?: PrismaClient
    ) {
        this.contractService = contractService || new ContractService();
        this.yieldService = yieldService || new YieldService();
        this.notificationService = notificationService || new NotificationService();
        this.prisma = prisma || new PrismaClient();
    }

    /**
     * Create a new payment with blockchain integration
     */
    public async createPayment(request: CreatePaymentRequest, userId: string): Promise<any> {
        const startTime = Date.now();

        try {
            if (!userId) {
                throw new Error('User ID is required for payment creation');
            }

            // Validate request
            await this.validatePaymentRequest(request);

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
            await this.cachePayment(payment);

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
    }    /*
*
     * Get payment by ID with caching
     */
    public async getPayment(paymentId: string): Promise<any | null> {
        try {
            // Try cache first
            const cached = await this.getCachedPayment(paymentId);
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
                await this.cachePayment(payment);
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
    public async updatePaymentStatus(
        paymentId: string,
        status: PaymentStatus,
        transactionHash?: string,
        metadata?: Record<string, any>
    ): Promise<any> {
        try {
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

            const payment = await this.prisma.payment.update({
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
            await this.cachePayment(payment);

            // Send notifications
            await this.notificationService.sendPaymentStatusUpdate(payment);

            // Start yield generation if confirmed and enabled
            if (status === PaymentStatus.CONFIRMED && payment.yieldStrategy) {
                await this.startYieldGeneration(paymentId);
            }

            logBusinessEvent('payment_status_updated', payment.userId, {
                paymentId,
                status,
                transactionHash,
            });

            logger.info(`Payment status updated: ${paymentId} -> ${status}`);

            return payment;

        } catch (error) {
            logger.error(`Failed to update payment status ${paymentId}:`, error);
            throw error;
        }
    }    /
**
     * Confirm a payment with blockchain transaction
     */
    public async confirmPayment(paymentId: string, transactionHash: string): Promise<any> {
        try {
            const payment = await this.prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: PaymentStatus.CONFIRMED,
                    sourceTransactionHash: transactionHash,
                    confirmedAt: new Date()
                }
            });

            // Create payment event
            await this.createPaymentEvent(paymentId, PaymentEventType.CONFIRMED, {
                transactionHash,
                confirmedAt: new Date()
            });

            // Update cache
            await this.cachePayment(payment);

            // Send notifications
            await this.notificationService.sendPaymentStatusUpdate(payment);

            // Start yield generation if enabled
            if (payment.yieldStrategy) {
                await this.startYieldGeneration(paymentId);
            }

            logBusinessEvent('payment_confirmed', payment.userId, { paymentId, transactionHash });
            return payment;
        } catch (error) {
            logger.error('Error confirming payment:', error);
            throw error;
        }
    }

    /**
     * Release payment with yield calculation
     */
    public async releasePayment(paymentId: string): Promise<any> {
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
                await this.createYieldEarning(payment, finalYield);
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
            await this.cachePayment(updatedPayment);

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
    }    /*
*
     * Start real-time yield generation
     */
    public async startYieldGeneration(paymentId: string): Promise<void> {
        try {
            const payment = await this.getPayment(paymentId);
            if (!payment) {
                throw new Error(`Payment ${paymentId} not found`);
            }

            if (payment.status !== PaymentStatus.CONFIRMED) {
                throw new Error(`Payment ${paymentId} is not confirmed`);
            }

            // Start yield generation
            await this.yieldService.startYieldGeneration(paymentId, {
                amount: payment.amount,
                token: payment.tokenSymbol,
                strategy: payment.yieldStrategy,
                startTime: new Date()
            });

            // Create yield earning record
            await this.prisma.yieldEarning.create({
                data: {
                    userId: payment.userId,
                    paymentId: payment.id,
                    strategyId: await this.getStrategyId(payment.yieldStrategy),
                    principalAmount: payment.amount,
                    yieldAmount: 0,
                    feeAmount: 0,
                    netYieldAmount: 0,
                    tokenAddress: payment.tokenAddress || '',
                    tokenSymbol: payment.tokenSymbol || '',
                    chainId: payment.sourceChain,
                    startTime: new Date(),
                    status: YieldStatus.ACTIVE
                }
            });

            // Create payment event
            await this.createPaymentEvent(paymentId, PaymentEventType.YIELD_STARTED, {
                strategy: payment.yieldStrategy,
                startTime: new Date()
            });

            logger.info(`Yield generation started for payment: ${paymentId}`);
        } catch (error) {
            logger.error(`Failed to start yield generation for payment ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Update real-time yield for a payment
     */
    public async updatePaymentYield(paymentId: string): Promise<void> {
        try {
            const payment = await this.getPayment(paymentId);
            if (!payment || payment.status !== PaymentStatus.CONFIRMED) {
                return;
            }

            // Calculate current yield
            const currentYield = await this.yieldService.calculateCurrentYield(paymentId);

            // Update payment with current yield
            await this.prisma.payment.update({
                where: { id: paymentId },
                data: {
                    actualYield: parseFloat(currentYield)
                }
            });

            // Update yield earning record
            await this.prisma.yieldEarning.updateMany({
                where: { 
                    paymentId: paymentId,
                    status: YieldStatus.ACTIVE
                },
                data: {
                    yieldAmount: parseFloat(currentYield),
                    netYieldAmount: parseFloat(currentYield) * 0.7, // 70% to user
                    updatedAt: new Date()
                }
            });

            // Create yield event
            await this.createPaymentEvent(paymentId, PaymentEventType.YIELD_EARNED, {
                yieldAmount: currentYield,
                timestamp: new Date()
            });

            // Update cache
            const updatedPayment = await this.getPayment(paymentId);
            await this.cachePayment(updatedPayment);

            // Send real-time notification
            await this.notificationService.sendYieldUpdate(updatedPayment, currentYield);

        } catch (error) {
            logger.error(`Failed to update yield for payment ${paymentId}:`, error);
        }
    }    /**

     * Get merchant payment analytics
     */
    public async getMerchantAnalytics(
        merchantId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<any> {
        try {
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

            return {
                totalPayments,
                completedPayments,
                completionRate: totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
                totalVolume: totalVolume._sum.amount || 0,
                totalYieldGenerated: totalYieldGenerated._sum.actualYield || 0,
                averagePaymentAmount: averagePaymentAmount._avg.amount || 0,
                paymentsByStatus: paymentsByStatus.reduce((acc, item) => {
                    acc[item.status] = item._count.status;
                    return acc;
                }, {} as Record<string, number>),
                yieldByStrategy: yieldByStrategy.map(item => ({
                    strategyId: item.strategyId,
                    totalYield: item._sum.yieldAmount || 0,
                    paymentCount: item._count.strategyId
                }))
            };
        } catch (error) {
            logger.error(`Failed to get merchant analytics for ${merchantId}:`, error);
            throw error;
        }
    }

    /**
     * Get merchant payments with pagination
     */
    public async getMerchantPayments(
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

            return {
                payments,
                total,
            };

        } catch (error) {
            logger.error(`Failed to get merchant payments for ${merchantId}:`, error);
            throw error;
        }
    }   
 /**
     * Handle blockchain transaction failures with retry logic
     */
    public async handleTransactionFailure(
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
            await this.cachePayment(payment);

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
     * Enhanced blockchain error handling with retry logic
     */
    public async handleBlockchainError(
        paymentId: string,
        operation: string,
        error: any,
        retryCount: number = 0
    ): Promise<void> {
        const maxRetries = 3;
        
        try {
            logger.error(`Blockchain error for payment ${paymentId} during ${operation}:`, {
                error: error.message,
                retryCount,
                paymentId,
                operation
            });

            // Determine if error is retryable
            const isRetryable = this.isRetryableError(error);
            
            if (isRetryable && retryCount < maxRetries) {
                // Exponential backoff retry
                const delay = Math.pow(2, retryCount) * 1000;
                setTimeout(async () => {
                    await this.retryBlockchainOperation(paymentId, operation, retryCount + 1);
                }, delay);
                return;
            }

            // Mark payment as failed after max retries
            await this.handleTransactionFailure(paymentId, '', error);

            // Send system alert for critical errors
            await this.notificationService.sendSystemAlert(
                'Blockchain Operation Failed',
                `Payment ${paymentId} failed during ${operation} after ${retryCount} retries`,
                {
                    paymentId,
                    operation,
                    error: error.message,
                    retryCount
                }
            );

        } catch (handlingError) {
            logger.error(`Failed to handle blockchain error for payment ${paymentId}:`, handlingError);
        }
    }    
/**
     * Private helper methods
     */
    
    private async validatePaymentRequest(request: CreatePaymentRequest): Promise<void> {
        // Validate amount
        const amount = parseFloat(request.amount);
        if (amount <= 0) {
            throw new Error('Payment amount must be greater than 0');
        }

        // Validate merchant address
        if (!ethers.isAddress(request.merchantAddress)) {
            throw new Error('Invalid merchant address');
        }

        // Validate chain and token combination
        const tokenConfig = supportedTokens[request.token];
        if (!tokenConfig?.addresses) {
            throw new Error(`Token ${request.token} not supported`);
        }
        
        const chainAddresses = tokenConfig.addresses as Record<string, string>;
        if (!chainAddresses[request.chain]) {
            throw new Error(`Token ${request.token} not supported on chain ${request.chain}`);
        }

        // Validate expiration
        if (request.expiresAt && request.expiresAt <= new Date()) {
            throw new Error('Expiration date must be in the future');
        }
    }

    private async findOrCreateMerchant(merchantAddress: string) {
        let merchant = await this.prisma.merchant.findFirst({
            where: {
                name: { contains: merchantAddress.slice(0, 8) }
            }
        });

        if (!merchant) {
            // Create a basic merchant record
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

    private async createEscrowTransaction(request: CreatePaymentRequest): Promise<any> {
        const chainConfig = chainConfigs[request.chain];
        
        logBlockchainOperation('create_escrow', chainConfig.chainId, undefined, undefined, {
            amount: request.amount,
            token: request.token,
        });

        try {
            // Get token address for the chain
            const tokenConfig = supportedTokens[request.token];
            const chainAddresses = tokenConfig?.addresses as Record<string, string> | undefined;
            const tokenAddress = chainAddresses?.[request.chain] || '';

            // Call the contract service to create escrow
            const escrowAddress = (chainConfig.contracts as any)?.yieldEscrow || '0x0000000000000000000000000000000000000000';
            const result = await this.contractService.createEscrow(
                escrowAddress,
                request.chain,
                request.amount,
                tokenAddress,
                request.merchantAddress,
                '0x0000000000000000000000000000000000000000', // Default yield strategy
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
    }    p
rivate async storePayment(userId: string, merchantId: string, request: CreatePaymentRequest, escrowResult: any): Promise<any> {
        const tokenConfig = supportedTokens[request.token];
        const amountDecimal = parseFloat(request.amount);
        
        // Get token address with proper type handling
        const chainAddresses = tokenConfig?.addresses as Record<string, string> | undefined;
        const tokenAddress = chainAddresses?.[request.chain] || '';

        const payment = await this.prisma.payment.create({
            data: {
                userId,
                merchantId,
                amount: amountDecimal,
                currency: 'USD', // Default to USD, could be derived from token
                tokenAddress,
                tokenSymbol: request.token,
                status: PaymentStatus.PENDING,
                type: PaymentType.MERCHANT_PAYMENT,
                sourceChain: request.chain,
                destinationChain: request.chain,
                senderAddress: '0x0000000000000000000000000000000000000000', // Will be updated on confirmation
                recipientAddress: request.merchantAddress,
                escrowAddress: escrowResult.escrowAddress,
                estimatedYield: request.yieldEnabled ? amountDecimal * 0.05 : null, // 5% estimated yield
                yieldStrategy: request.yieldEnabled ? 'Circle USDC Lending' : null,
                description: `Payment to ${request.merchantAddress.slice(0, 8)}...`,
                metadata: request.metadata || {},
                expiresAt: request.expiresAt,
            },
        });

        return payment;
    }

    private async cachePayment(payment: any): Promise<void> {
        const cacheKey = `payment:${payment.id}`;
        await redis.set(cacheKey, JSON.stringify(payment), 3600); // Cache for 1 hour
    }

    private async getCachedPayment(paymentId: string): Promise<any | null> {
        try {
            const cacheKey = `payment:${paymentId}`;
            const cached = await redis.get(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            logger.warn('Redis cache error, falling back to database:', error);
            return null;
        }
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
    }    private 
async sendWebhookNotification(payment: any, eventType: string): Promise<void> {
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

    private async createYieldEarning(payment: any, yieldAmount: string): Promise<void> {
        const yieldAmountDecimal = parseFloat(yieldAmount);
        const userYield = yieldAmountDecimal * 0.7; // 70% to user
        const merchantYield = yieldAmountDecimal * 0.2; // 20% to merchant
        const protocolYield = yieldAmountDecimal * 0.1; // 10% to protocol

        await this.prisma.yieldEarning.create({
            data: {
                userId: payment.userId,
                paymentId: payment.id,
                strategyId: await this.getStrategyId(payment.yieldStrategy),
                principalAmount: payment.amount,
                yieldAmount: yieldAmountDecimal,
                feeAmount: protocolYield,
                netYieldAmount: userYield,
                tokenAddress: payment.tokenAddress || '',
                tokenSymbol: payment.tokenSymbol || '',
                chainId: payment.sourceChain,
                startTime: payment.confirmedAt || payment.createdAt,
                endTime: new Date(),
                actualAPY: await this.calculateAPY(payment, yieldAmountDecimal),
                status: YieldStatus.COMPLETED
            }
        });
    }

    private async getStrategyId(strategyName: string | null): Promise<string> {
        if (!strategyName) {
            return 'default-strategy-id';
        }

        const strategy = await this.prisma.yieldStrategy.findFirst({
            where: { name: strategyName }
        });

        return strategy?.id || 'default-strategy-id';
    }

    private async calculateAPY(payment: any, yieldAmount: number): Promise<number> {
        const startTime = payment.confirmedAt || payment.createdAt;
        const endTime = new Date();
        const durationInDays = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
        
        if (durationInDays <= 0) return 0;
        
        const yieldRate = yieldAmount / payment.amount;
        const annualizedRate = (yieldRate * 365) / durationInDays;
        
        return annualizedRate * 100; // Convert to percentage
    }

    private isRetryableError(error: any): boolean {
        const retryableErrors = [
            'network timeout',
            'connection refused',
            'rate limit',
            'temporary failure',
            'insufficient funds', // Sometimes temporary
            'nonce too low'
        ];

        const errorMessage = error.message?.toLowerCase() || '';
        return retryableErrors.some(retryableError => 
            errorMessage.includes(retryableError)
        );
    }

    private async retryBlockchainOperation(
        paymentId: string,
        operation: string,
        retryCount: number
    ): Promise<void> {
        try {
            logger.info(`Retrying blockchain operation for payment ${paymentId}:`, {
                operation,
                retryCount
            });

            // Implement specific retry logic based on operation type
            switch (operation) {
                case 'createEscrow':
                    // Retry escrow creation
                    break;
                case 'releasePayment':
                    // Retry payment release
                    break;
                case 'cancelPayment':
                    // Retry payment cancellation
                    break;
                default:
                    logger.warn(`Unknown operation for retry: ${operation}`);
            }

        } catch (error) {
            await this.handleBlockchainError(paymentId, operation, error, retryCount);
        }
    }
}