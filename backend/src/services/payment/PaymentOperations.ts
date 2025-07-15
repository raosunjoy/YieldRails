import { PrismaClient, PaymentStatus, PaymentEventType, YieldStatus } from '@prisma/client';
import { logger, logBusinessEvent } from '../../utils/logger';
import { ContractService } from '../ContractService';
import { YieldService } from '../YieldService';
import { NotificationService } from '../NotificationService';
import { PaymentCache } from './PaymentCache';
import { PaymentValidator } from './PaymentValidator';
import { 
    PaymentWithBlockchainStatus, 
    BatchProcessingResult,
    YieldGenerationParams 
} from './types';

/**
 * Core payment operations
 */
export class PaymentOperations {
    constructor(
        private prisma: PrismaClient,
        private contractService: ContractService,
        private yieldService: YieldService,
        private notificationService: NotificationService
    ) {}

    /**
     * Cancel a payment
     */
    async cancelPayment(paymentId: string, reason?: string): Promise<any> {
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { id: paymentId },
                include: { merchant: true }
            });

            if (!payment) {
                throw new Error(`Payment ${paymentId} not found`);
            }

            if (payment.status === PaymentStatus.COMPLETED) {
                throw new Error(`Payment ${paymentId} is already completed and cannot be cancelled`);
            }

            if (payment.status === PaymentStatus.CANCELLED) {
                throw new Error(`Payment ${paymentId} is already cancelled`);
            }

            // If payment is confirmed, we need to cancel on blockchain
            if (payment.status === PaymentStatus.CONFIRMED && payment.escrowAddress) {
                await this.contractService.cancelPayment(payment.escrowAddress, reason || 'User cancellation');
            }

            // Update payment status
            const updatedPayment = await this.prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: PaymentStatus.CANCELLED,
                    updatedAt: new Date()
                }
            });

            // Create cancellation event
            await this.prisma.paymentEvent.create({
                data: {
                    paymentId,
                    eventType: PaymentEventType.CANCELLED,
                    eventData: { reason: reason || 'User cancellation', cancelledAt: new Date() }
                }
            });

            // Update cache
            await PaymentCache.cachePayment(updatedPayment);

            // Send notifications
            await this.notificationService.sendPaymentCancelled(updatedPayment, reason);

            logBusinessEvent('payment_cancelled', payment.userId, { paymentId, reason });

            return updatedPayment;
        } catch (error) {
            logger.error(`Failed to cancel payment ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Get payment status with blockchain verification
     */
    async getPaymentStatusWithBlockchainVerification(paymentId: string): Promise<PaymentWithBlockchainStatus> {
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    user: true,
                    merchant: true,
                    yieldEarnings: true,
                    paymentEvents: true
                }
            });

            if (!payment) {
                throw new Error(`Payment ${paymentId} not found`);
            }

            let blockchainStatus = null;
            let currentYield = undefined;

            // Get blockchain verification if transaction hash exists
            if (payment.sourceTransactionHash && payment.sourceChain) {
                try {
                    const receipt = await this.contractService.getTransactionReceipt(
                        payment.sourceChain as any,
                        payment.sourceTransactionHash
                    );

                    if (receipt) {
                        blockchainStatus = {
                            confirmed: receipt.status === 1,
                            blockNumber: receipt.blockNumber,
                            gasUsed: receipt.gasUsed?.toString(),
                            confirmations: receipt.confirmations || 0
                        };
                    }
                } catch (error) {
                    logger.warn(`Failed to get blockchain status for payment ${paymentId}:`, error);
                }
            }

            // Get current yield if payment has yield strategy
            if (payment.yieldStrategy && payment.status === PaymentStatus.CONFIRMED) {
                try {
                    const yieldAmount = await this.yieldService.calculateCurrentYield(paymentId);
                    currentYield = parseFloat(yieldAmount);
                } catch (error) {
                    logger.warn(`Failed to get current yield for payment ${paymentId}:`, error);
                }
            }

            return {
                payment,
                blockchainStatus,
                currentYield
            };
        } catch (error) {
            logger.error(`Failed to get payment status with blockchain verification ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Batch process payments for yield updates
     */
    async batchProcessPayments(paymentIds: string[]): Promise<BatchProcessingResult> {
        const result: BatchProcessingResult = {
            success: [],
            failed: [],
            errors: {}
        };

        const batchSize = 10;
        const batches = [];

        // Split into batches
        for (let i = 0; i < paymentIds.length; i += batchSize) {
            batches.push(paymentIds.slice(i, i + batchSize));
        }

        // Process each batch
        for (const batch of batches) {
            const batchPromises = batch.map(async (paymentId) => {
                try {
                    await this.updatePaymentYield(paymentId);
                    result.success.push(paymentId);
                } catch (error) {
                    result.failed.push(paymentId);
                    result.errors[paymentId] = error instanceof Error ? error.message : 'Unknown error';
                    logger.error(`Failed to process payment ${paymentId} in batch:`, error);
                }
            });

            await Promise.allSettled(batchPromises);
        }

        logger.info(`Batch processing completed: ${result.success.length} success, ${result.failed.length} failed`);
        return result;
    }

    /**
     * Start yield generation for a payment
     */
    async startYieldGeneration(paymentId: string): Promise<void> {
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { id: paymentId }
            });

            if (!payment) {
                throw new Error(`Payment ${paymentId} not found`);
            }

            if (payment.status !== PaymentStatus.CONFIRMED) {
                throw new Error(`Payment ${paymentId} is not confirmed`);
            }

            // Start yield generation
            const yieldParams: YieldGenerationParams = {
                amount: Number(payment.amount),
                token: payment.tokenSymbol || '',
                strategy: payment.yieldStrategy,
                startTime: new Date()
            };

            await this.yieldService.startYieldGeneration(paymentId, yieldParams);

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
            await this.prisma.paymentEvent.create({
                data: {
                    paymentId,
                    eventType: PaymentEventType.YIELD_STARTED,
                    eventData: {
                        strategy: payment.yieldStrategy,
                        startTime: new Date()
                    }
                }
            });

            logger.info(`Yield generation started for payment: ${paymentId}`);
        } catch (error) {
            logger.error(`Failed to start yield generation for payment ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Update payment yield
     */
    async updatePaymentYield(paymentId: string): Promise<void> {
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { id: paymentId }
            });

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
            await this.prisma.paymentEvent.create({
                data: {
                    paymentId,
                    eventType: PaymentEventType.YIELD_EARNED,
                    eventData: {
                        yieldAmount: currentYield,
                        timestamp: new Date()
                    }
                }
            });

            // Update cache
            const updatedPayment = await this.prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    user: true,
                    merchant: true,
                    yieldEarnings: true
                }
            });

            if (updatedPayment) {
                await PaymentCache.cachePayment(updatedPayment);
                // Send real-time notification
                await this.notificationService.sendYieldUpdate(updatedPayment, currentYield);
            }

        } catch (error) {
            logger.error(`Failed to update yield for payment ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Create yield earning record
     */
    async createYieldEarning(payment: any, yieldAmount: string): Promise<void> {
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

    /**
     * Get strategy ID by name
     */
    private async getStrategyId(strategyName: string | null): Promise<string> {
        if (!strategyName) {
            return 'default-strategy-id';
        }

        const strategy = await this.prisma.yieldStrategy.findFirst({
            where: { name: strategyName }
        });

        return strategy?.id || 'default-strategy-id';
    }

    /**
     * Calculate APY for a payment
     */
    private async calculateAPY(payment: any, yieldAmount: number): Promise<number> {
        const startTime = payment.confirmedAt || payment.createdAt;
        const endTime = new Date();
        const durationInDays = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
        
        if (durationInDays <= 0) return 0;
        
        const yieldRate = yieldAmount / payment.amount;
        const annualizedRate = (yieldRate * 365) / durationInDays;
        
        return annualizedRate * 100; // Convert to percentage
    }
}