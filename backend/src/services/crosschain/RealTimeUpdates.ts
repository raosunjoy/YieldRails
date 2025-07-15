import { PrismaClient, CrossChainTransaction } from '@prisma/client';
import { logger } from '../../utils/logger';
import { TransactionHistory, TransactionUpdate, SubscriberUpdate, SubscriptionStats } from '../CrossChainService';

/**
 * Real-time updates service for cross-chain transactions
 * Manages subscriptions and broadcasts transaction status updates
 */
export class RealTimeUpdates {
    private prisma: PrismaClient;
    private redis: any;
    private subscriptions: Map<string, Set<string>>;
    private updateHistory: Map<string, TransactionUpdate[]>;

    constructor(prisma: PrismaClient, redis: any) {
        this.prisma = prisma;
        this.redis = redis;
        this.subscriptions = new Map();
        this.updateHistory = new Map();
    }

    /**
     * Subscribe to transaction updates
     */
    public subscribe(transactionId: string, subscriberId: string): void {
        if (!this.subscriptions.has(transactionId)) {
            this.subscriptions.set(transactionId, new Set());
        }
        this.subscriptions.get(transactionId)!.add(subscriberId);

        logger.debug('Subscriber added to transaction updates', { transactionId, subscriberId });
    }

    /**
     * Unsubscribe from transaction updates
     */
    public unsubscribe(transactionId: string, subscriberId: string): void {
        const subscribers = this.subscriptions.get(transactionId);
        if (subscribers) {
            subscribers.delete(subscriberId);
            if (subscribers.size === 0) {
                this.subscriptions.delete(transactionId);
                // Clean up update history for transactions with no subscribers
                this.updateHistory.delete(transactionId);
            }
        }

        logger.debug('Subscriber removed from transaction updates', { transactionId, subscriberId });
    }

    /**
     * Broadcast transaction update to all subscribers
     */
    public async broadcastTransactionUpdate(transactionId: string, update: TransactionUpdate): Promise<void> {
        try {
            const subscribers = this.subscriptions.get(transactionId);
            if (!subscribers || subscribers.size === 0) {
                return; // No subscribers for this transaction
            }

            // Store update in history
            if (!this.updateHistory.has(transactionId)) {
                this.updateHistory.set(transactionId, []);
            }
            this.updateHistory.get(transactionId)!.push(update);

            // Broadcast to all subscribers
            const subscriberUpdate: SubscriberUpdate = {
                transactionId,
                update,
                timestamp: new Date()
            };

            for (const subscriberId of subscribers) {
                await this.sendUpdateToSubscriber(subscriberId, subscriberUpdate);
            }

            logger.debug('Transaction update broadcasted', {
                transactionId,
                updateType: update.type,
                subscriberCount: subscribers.size
            });

        } catch (error) {
            logger.error('Failed to broadcast transaction update', { error, transactionId });
        }
    }

    /**
     * Send update to individual subscriber
     */
    private async sendUpdateToSubscriber(subscriberId: string, update: SubscriberUpdate): Promise<void> {
        try {
            // Store update for subscriber
            const subscriberUpdatesKey = `subscriber:${subscriberId}:updates`;
            const existingUpdates = await this.redis.get(subscriberUpdatesKey);
            const updates = existingUpdates ? JSON.parse(existingUpdates) : [];
            
            updates.push(update);
            
            // Keep only last 100 updates per subscriber
            if (updates.length > 100) {
                updates.splice(0, updates.length - 100);
            }

            await this.redis.set(subscriberUpdatesKey, JSON.stringify(updates), 3600); // 1 hour TTL

            // In production, this would also send real-time notifications via WebSocket, SSE, etc.
            logger.debug('Update sent to subscriber', { subscriberId, transactionId: update.transactionId });

        } catch (error) {
            logger.error('Failed to send update to subscriber', { error, subscriberId });
        }
    }

    /**
     * Get transaction history with real-time updates
     */
    public async getTransactionHistory(transactionId: string): Promise<TransactionHistory> {
        const transaction = await this.prisma.crossChainTransaction.findUnique({
            where: { id: transactionId }
        });

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        const updates = this.updateHistory.get(transactionId) || [];
        const subscribers = this.subscriptions.get(transactionId);

        return {
            transaction,
            updates,
            lastUpdated: new Date(),
            subscriberCount: subscribers ? subscribers.size : 0
        };
    }

    /**
     * Get subscriber updates
     */
    public async getSubscriberUpdates(subscriberId: string): Promise<SubscriberUpdate[]> {
        try {
            const subscriberUpdatesKey = `subscriber:${subscriberId}:updates`;
            const cached = await this.redis.get(subscriberUpdatesKey);
            return cached ? JSON.parse(cached) : [];
        } catch (error) {
            logger.error('Failed to get subscriber updates', { error, subscriberId });
            return [];
        }
    }

    /**
     * Get subscription statistics
     */
    public getSubscriptionStats(): SubscriptionStats {
        const totalTransactions = this.subscriptions.size;
        const totalSubscribers = Array.from(this.subscriptions.values())
            .reduce((sum, subscribers) => sum + subscribers.size, 0);
        const averageSubscribersPerTransaction = totalTransactions > 0 ? totalSubscribers / totalTransactions : 0;

        return {
            totalTransactions,
            totalSubscribers,
            averageSubscribersPerTransaction,
            lastUpdated: new Date()
        };
    }

    /**
     * Create transaction status update
     */
    public createStatusUpdate(status: string, data?: any): TransactionUpdate {
        return {
            type: 'status_change',
            status,
            timestamp: new Date(),
            data
        };
    }

    /**
     * Create transaction confirmation update
     */
    public createConfirmationUpdate(confirmationType: string, transactionHash: string, confirmations: number): TransactionUpdate {
        return {
            type: 'confirmation',
            timestamp: new Date(),
            data: {
                confirmationType,
                transactionHash,
                confirmations
            }
        };
    }

    /**
     * Create yield update
     */
    public createYieldUpdate(yieldAmount: number, yieldRate: number): TransactionUpdate {
        return {
            type: 'yield_update',
            timestamp: new Date(),
            data: {
                yieldAmount,
                yieldRate
            }
        };
    }

    /**
     * Create error update
     */
    public createErrorUpdate(error: string, errorCode?: string): TransactionUpdate {
        return {
            type: 'error',
            timestamp: new Date(),
            data: {
                error,
                errorCode
            }
        };
    }

    /**
     * Create completion update
     */
    public createCompletionUpdate(finalAmount: number, totalYield: number, processingTime: number): TransactionUpdate {
        return {
            type: 'completion',
            timestamp: new Date(),
            data: {
                finalAmount,
                totalYield,
                processingTime
            }
        };
    }

    /**
     * Get all subscribers for a transaction
     */
    public getTransactionSubscribers(transactionId: string): string[] {
        const subscribers = this.subscriptions.get(transactionId);
        return subscribers ? Array.from(subscribers) : [];
    }

    /**
     * Get all transactions a subscriber is following
     */
    public getSubscriberTransactions(subscriberId: string): string[] {
        const transactions: string[] = [];
        
        for (const [transactionId, subscribers] of this.subscriptions.entries()) {
            if (subscribers.has(subscriberId)) {
                transactions.push(transactionId);
            }
        }

        return transactions;
    }

    /**
     * Clean up old subscriptions and updates
     */
    public async cleanupOldData(): Promise<void> {
        try {
            const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

            // Clean up update history
            for (const [transactionId, updates] of this.updateHistory.entries()) {
                const recentUpdates = updates.filter(update => update.timestamp > cutoffTime);
                if (recentUpdates.length === 0) {
                    this.updateHistory.delete(transactionId);
                } else {
                    this.updateHistory.set(transactionId, recentUpdates);
                }
            }

            logger.info('Old real-time data cleaned up');

        } catch (error) {
            logger.error('Failed to clean up old real-time data', { error });
        }
    }

    /**
     * Get update statistics
     */
    public getUpdateStats(): UpdateStats {
        let totalUpdates = 0;
        let oldestUpdate: Date | null = null;
        let newestUpdate: Date | null = null;

        for (const updates of this.updateHistory.values()) {
            totalUpdates += updates.length;
            
            for (const update of updates) {
                if (!oldestUpdate || update.timestamp < oldestUpdate) {
                    oldestUpdate = update.timestamp;
                }
                if (!newestUpdate || update.timestamp > newestUpdate) {
                    newestUpdate = update.timestamp;
                }
            }
        }

        return {
            totalUpdates,
            transactionsWithUpdates: this.updateHistory.size,
            oldestUpdate,
            newestUpdate,
            averageUpdatesPerTransaction: this.updateHistory.size > 0 ? totalUpdates / this.updateHistory.size : 0
        };
    }
}

interface UpdateStats {
    totalUpdates: number;
    transactionsWithUpdates: number;
    oldestUpdate: Date | null;
    newestUpdate: Date | null;
    averageUpdatesPerTransaction: number;
}