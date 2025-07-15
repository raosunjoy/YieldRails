import { PrismaClient, CrossChainStatus, CrossChainTransaction } from '@prisma/client';
import { logger } from '../../utils/logger';
import { redis } from '../../config/redis';
import { NotificationService } from '../NotificationService';
import { ChainConfig } from '../CrossChainService';

/**
 * Bridge processor service for handling cross-chain transaction processing
 * Manages the complete bridge transaction lifecycle
 */
export class BridgeProcessor {
    private prisma: PrismaClient;
    private notificationService: NotificationService;
    private supportedChains: Map<string, ChainConfig>;

    constructor(prisma: PrismaClient, supportedChains: Map<string, ChainConfig>) {
        this.prisma = prisma;
        this.notificationService = new NotificationService();
        this.supportedChains = supportedChains;
    }

    /**
     * Process bridge transaction through multiple stages
     */
    public async processBridgeTransaction(transactionId: string): Promise<void> {
        try {
            const transaction = await this.getBridgeTransaction(transactionId);
            if (!transaction) {
                throw new Error('Bridge transaction not found');
            }

            logger.info('Starting bridge transaction processing', { transactionId });

            // Stage 1: Confirm source transaction
            await this.confirmSourceTransaction(transaction);

            // Stage 2: Execute bridge operation
            await this.executeBridgeOperation(transaction);

            // Stage 3: Confirm destination transaction
            await this.confirmDestinationTransaction(transaction);

            // Stage 4: Complete bridge with yield calculation
            await this.completeBridgeTransaction(transaction);

            logger.info('Bridge transaction processing completed successfully', { transactionId });

        } catch (error) {
            logger.error('Bridge transaction processing failed', { error, transactionId });
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.handleBridgeFailure(transactionId, errorMessage);
        }
    }

    /**
     * Confirm source chain transaction
     */
    private async confirmSourceTransaction(transaction: CrossChainTransaction): Promise<void> {
        const sourceChain = this.supportedChains.get(transaction.sourceChain);
        if (!sourceChain) {
            throw new Error(`Unsupported source chain: ${transaction.sourceChain}`);
        }

        logger.info('Confirming source transaction', { 
            transactionId: transaction.id,
            sourceChain: transaction.sourceChain 
        });

        // In test environment, skip the actual waiting
        if (process.env.NODE_ENV !== 'test') {
            // Wait for required confirmations
            const requiredConfirmations = sourceChain.confirmations;
            let confirmations = 0;

            // Simulate confirmation process (in production, this would monitor actual blockchain)
            while (confirmations < requiredConfirmations) {
                await new Promise(resolve => setTimeout(resolve, sourceChain.avgBlockTime));
                confirmations++;
                
                logger.debug('Waiting for source confirmations', {
                    transactionId: transaction.id,
                    confirmations,
                    required: requiredConfirmations
                });
            }
        }

        // Update transaction status
        await this.updateBridgeStatus(transaction.id, CrossChainStatus.SOURCE_CONFIRMED, {
            sourceConfirmedAt: new Date(),
            sourceTransactionHash: `0x${Math.random().toString(16).substr(2, 64)}` // Mock hash
        });

        logger.info('Source transaction confirmed', { transactionId: transaction.id });
    }

    /**
     * Execute bridge operation
     */
    private async executeBridgeOperation(transaction: CrossChainTransaction): Promise<void> {
        logger.info('Executing bridge operation', { transactionId: transaction.id });

        await this.updateBridgeStatus(transaction.id, CrossChainStatus.BRIDGE_PENDING);

        // In test environment, skip the actual waiting
        if (process.env.NODE_ENV !== 'test') {
            // Simulate bridge processing time
            const bridgeTime = this.calculateBridgeTime(transaction.sourceChain, transaction.destinationChain);
            await new Promise(resolve => setTimeout(resolve, bridgeTime));
        }

        // Generate bridge transaction ID
        const bridgeTransactionId = `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await this.updateBridgeStatus(transaction.id, CrossChainStatus.BRIDGE_COMPLETED, {
            bridgeTransactionId
        });

        logger.info('Bridge operation completed', { 
            transactionId: transaction.id,
            bridgeTransactionId 
        });
    }

    /**
     * Confirm destination chain transaction
     */
    private async confirmDestinationTransaction(transaction: CrossChainTransaction): Promise<void> {
        const destChain = this.supportedChains.get(transaction.destinationChain);
        if (!destChain) {
            throw new Error(`Unsupported destination chain: ${transaction.destinationChain}`);
        }

        logger.info('Confirming destination transaction', { 
            transactionId: transaction.id,
            destinationChain: transaction.destinationChain 
        });

        await this.updateBridgeStatus(transaction.id, CrossChainStatus.DESTINATION_PENDING);

        // In test environment, skip the actual waiting
        if (process.env.NODE_ENV !== 'test') {
            // Wait for destination confirmations
            const requiredConfirmations = destChain.confirmations;
            await new Promise(resolve => setTimeout(resolve, destChain.avgBlockTime * requiredConfirmations));
        }

        // Calculate destination amount (source amount - bridge fee + yield)
        const yieldGenerated = await this.calculateBridgeYield(transaction);
        const sourceAmountNum = Number(transaction.sourceAmount);
        const bridgeFeeNum = Number(transaction.bridgeFee || 0);
        const destinationAmount = sourceAmountNum - bridgeFeeNum + yieldGenerated;

        await this.updateBridgeStatus(transaction.id, CrossChainStatus.COMPLETED, {
            destConfirmedAt: new Date(),
            destTransactionHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock hash
            destinationAmount: destinationAmount as any // Prisma will handle the conversion
        });

        logger.info('Destination transaction confirmed', { 
            transactionId: transaction.id,
            destinationAmount: destinationAmount.toString()
        });
    }

    /**
     * Complete bridge transaction with final yield calculation
     */
    private async completeBridgeTransaction(transaction: CrossChainTransaction): Promise<void> {
        const updatedTransaction = await this.getBridgeTransaction(transaction.id);
        if (!updatedTransaction) {
            throw new Error('Transaction not found for completion');
        }

        // Send completion notification
        if (updatedTransaction.paymentId) {
            await this.notificationService.sendBridgeCompletionNotification(
                updatedTransaction.paymentId,
                updatedTransaction.id,
                updatedTransaction.destinationAmount?.toString() || '0'
            );
        }

        // Update cache
        await this.cacheBridgeTransaction(updatedTransaction);

        logger.info('Bridge transaction completed successfully', { 
            transactionId: transaction.id,
            totalTime: Date.now() - transaction.createdAt.getTime()
        });
    }

    /**
     * Calculate yield generated during bridge transit
     */
    private async calculateBridgeYield(transaction: CrossChainTransaction): Promise<number> {
        if (!transaction.sourceConfirmedAt || !transaction.destConfirmedAt) {
            return 0;
        }

        const transitTime = transaction.destConfirmedAt.getTime() - transaction.sourceConfirmedAt.getTime();
        const transitHours = transitTime / (1000 * 60 * 60);

        // Assume 5% APY during transit
        const annualYieldRate = 0.05;
        const hourlyYieldRate = annualYieldRate / (365 * 24);

        const sourceAmountNum = Number(transaction.sourceAmount);
        const yieldGenerated = sourceAmountNum * hourlyYieldRate * transitHours;

        logger.debug('Bridge yield calculated', {
            transactionId: transaction.id,
            transitHours,
            yieldGenerated
        });

        return yieldGenerated;
    }

    /**
     * Handle bridge transaction failure
     */
    private async handleBridgeFailure(transactionId: string, reason: string): Promise<void> {
        try {
            await this.updateBridgeStatus(transactionId, CrossChainStatus.FAILED);

            const transaction = await this.getBridgeTransaction(transactionId);
            if (transaction?.paymentId) {
                await this.notificationService.sendBridgeFailureNotification(
                    transaction.paymentId,
                    transactionId,
                    reason
                );
            }

            logger.error('Bridge transaction failed', { transactionId, reason });

        } catch (error) {
            logger.error('Failed to handle bridge failure', { error, transactionId });
        }
    }

    /**
     * Get bridge transaction by ID
     */
    private async getBridgeTransaction(transactionId: string): Promise<CrossChainTransaction | null> {
        try {
            // Try cache first
            const cached = await redis.get(`bridge:${transactionId}`);
            if (cached) {
                return JSON.parse(cached);
            }

            // Fallback to database
            const transaction = await this.prisma.crossChainTransaction.findUnique({
                where: { id: transactionId },
                include: { payment: true }
            });

            if (transaction) {
                await this.cacheBridgeTransaction(transaction);
            }

            return transaction;

        } catch (error) {
            logger.error('Failed to get bridge transaction', { error, transactionId });
            return null;
        }
    }

    /**
     * Update bridge transaction status
     */
    private async updateBridgeStatus(
        transactionId: string, 
        status: CrossChainStatus, 
        additionalData?: Partial<CrossChainTransaction>
    ): Promise<void> {
        const updateData: any = { status, updatedAt: new Date() };
        
        if (additionalData) {
            Object.assign(updateData, additionalData);
        }

        await this.prisma.crossChainTransaction.update({
            where: { id: transactionId },
            data: updateData
        });

        // Update cache
        const transaction = await this.getBridgeTransaction(transactionId);
        if (transaction) {
            await this.cacheBridgeTransaction(transaction);
        }
    }

    /**
     * Cache bridge transaction for quick access
     */
    private async cacheBridgeTransaction(transaction: CrossChainTransaction): Promise<void> {
        const cacheKey = `bridge:${transaction.id}`;
        const ttl = 3600; // 1 hour

        await redis.set(cacheKey, JSON.stringify(transaction), ttl);
    }

    /**
     * Calculate bridge processing time
     */
    private calculateBridgeTime(sourceChain: string, destinationChain: string): number {
        // Base bridge time: 30 seconds
        let bridgeTime = 30000;

        // Cross-ecosystem bridges take longer
        if (this.isCrossEcosystemBridge(sourceChain, destinationChain)) {
            bridgeTime += 60000; // Additional 1 minute
        }

        return bridgeTime;
    }

    /**
     * Check if bridge is cross-ecosystem (e.g., Ethereum to Polygon)
     */
    private isCrossEcosystemBridge(sourceChain: string, destinationChain: string): boolean {
        const sourceEcosystem = this.getChainEcosystem(sourceChain);
        const destEcosystem = this.getChainEcosystem(destinationChain);

        return sourceEcosystem !== destEcosystem;
    }

    /**
     * Get chain ecosystem
     */
    private getChainEcosystem(chainId: string): string {
        if (['1', '11155111'].includes(chainId)) return 'ethereum';
        if (['137', '80001'].includes(chainId)) return 'polygon';
        if (['42161', '421614'].includes(chainId)) return 'arbitrum';
        return 'unknown';
    }

    /**
     * Process bridge transaction with validator consensus
     */
    public async processBridgeTransactionWithConsensus(
        transactionId: string, 
        validatorConsensus: any
    ): Promise<void> {
        try {
            const transaction = await this.getBridgeTransaction(transactionId);
            if (!transaction) {
                throw new Error('Bridge transaction not found');
            }

            logger.info('Starting bridge transaction processing with consensus', { transactionId });

            // Request validator consensus
            const validationResult = await validatorConsensus.requestValidation(transactionId, {
                sourceChain: transaction.sourceChain,
                destinationChain: transaction.destinationChain,
                amount: transaction.sourceAmount,
                sourceAddress: transaction.sourceAddress,
                destinationAddress: transaction.destinationAddress
            });

            if (!validationResult.consensusReached) {
                throw new Error('Validator consensus not reached');
            }

            logger.info('Validator consensus achieved, proceeding with bridge processing', { 
                transactionId,
                validators: validationResult.actualValidators,
                required: validationResult.requiredValidators
            });

            // Continue with normal bridge processing
            await this.processBridgeTransaction(transactionId);

        } catch (error) {
            logger.error('Bridge transaction processing with consensus failed', { error, transactionId });
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.handleBridgeFailure(transactionId, errorMessage);
        }
    }

    /**
     * Get processing statistics
     */
    public async getProcessingStats(): Promise<ProcessingStats> {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const recentTransactions = await this.prisma.crossChainTransaction.findMany({
            where: {
                createdAt: {
                    gte: dayAgo
                }
            }
        });

        const completedTransactions = recentTransactions.filter(tx => tx.status === CrossChainStatus.COMPLETED);
        const failedTransactions = recentTransactions.filter(tx => tx.status === CrossChainStatus.FAILED);
        const pendingTransactions = recentTransactions.filter(tx => 
            ![CrossChainStatus.COMPLETED, CrossChainStatus.FAILED].includes(tx.status)
        );

        const averageProcessingTime = completedTransactions.length > 0
            ? completedTransactions.reduce((sum, tx) => {
                return sum + (tx.updatedAt.getTime() - tx.createdAt.getTime());
            }, 0) / completedTransactions.length
            : 0;

        return {
            totalTransactions: recentTransactions.length,
            completedTransactions: completedTransactions.length,
            failedTransactions: failedTransactions.length,
            pendingTransactions: pendingTransactions.length,
            successRate: recentTransactions.length > 0 ? completedTransactions.length / recentTransactions.length : 0,
            averageProcessingTime,
            lastUpdated: new Date()
        };
    }
}

interface ProcessingStats {
    totalTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    successRate: number;
    averageProcessingTime: number;
    lastUpdated: Date;
}