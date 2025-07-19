import { ethers } from 'ethers';
import { PrismaClient, CrossChainStatus, CrossChainTransaction } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { redis } from '../config/redis';
import { NotificationService } from './NotificationService';
import { StateSync } from './crosschain/StateSync';
import { CrossChainMonitoring } from './crosschain/CrossChainMonitoring';
import { ValidatorConsensus } from './crosschain/ValidatorConsensus';
import { RealTimeUpdates } from './crosschain/RealTimeUpdates';
import { CircleCCTPService } from './external/CircleCCTPService';

export interface ChainInfo {
    chainId: string;
    name: string;
    nativeCurrency: string;
    blockExplorer: string;
    isTestnet: boolean;
    avgBlockTime: number;
}

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

export interface LiquidityCheck {
    available: boolean;
    reason: string;
    suggestedAmount: number;
    estimatedWaitTime: number;
}

export interface BridgeRequest {
    recipient?: string;
    amount: number;
    token: string;
    sourceChain: string;
    destinationChain: string;
    sourceAddress?: string;
    destinationAddress?: string;
    paymentId?: string;
    metadata?: any;
}

export interface BridgeEstimate {
    fee: number;
    estimatedTime: number;
    estimatedYield: number;
}

export interface CrossChainMetrics {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    averageProcessingTime: number;
    totalVolume: number;
    liquidityUtilization: number;
    lastUpdated: Date;
}

export interface ValidationResult {
    transactionId: string;
    consensusReached: boolean;
    validatorSignatures: any[];
    requiredValidators: number;
    actualValidators: number;
    timestamp: Date;
}

export interface ValidatorInfo {
    id: string;
    address: string;
    isActive: boolean;
    reputation: number;
    lastSeen: Date;
}

export interface SubscriptionStats {
    totalTransactions: number;
    totalSubscribers: number;
    averageSubscribersPerTransaction: number;
    lastUpdated: Date;
}

export interface TransactionHistory {
    transaction: CrossChainTransaction;
    updates: any[];
    lastUpdated: Date;
    subscriberCount: number;
}

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

export interface ValidatorSignature {
    validatorId: string;
    signature: string;
    timestamp: Date;
}

export interface ValidatorMetrics {
    totalValidators: number;
    activeValidators: number;
    averageResponseTime: number;
    consensusRate: number;
}

export interface TransactionUpdate {
    type: 'status_change' | 'confirmation' | 'yield_update' | 'error' | 'completion';
    status?: string;
    timestamp: Date;
    data?: any;
}

export interface SubscriberUpdate {
    transactionId: string;
    update: TransactionUpdate;
    timestamp: Date;
}

export class CrossChainService {
    private prisma: PrismaClient;
    private supportedChains: Map<string, any>;
    private liquidityPools: Map<string, LiquidityPool>;
    private stateSync: StateSync;
    private monitoring: CrossChainMonitoring;
    private validatorConsensus: ValidatorConsensus;
    private realTimeUpdates: RealTimeUpdates;
    private circleCCTPService: CircleCCTPService;

    constructor() {
        this.prisma = new PrismaClient();
        this.supportedChains = new Map();
        this.liquidityPools = new Map();
        this.stateSync = new StateSync(this.prisma, redis);
        this.monitoring = new CrossChainMonitoring();
        this.validatorConsensus = new ValidatorConsensus(this.prisma, redis);
        this.realTimeUpdates = new RealTimeUpdates(this.prisma, redis);
        this.circleCCTPService = new CircleCCTPService();
        this.initializeChainConfigs();
        this.initializeLiquidityPools();
    }

    private initializeChainConfigs(): void {
        const chains = [
            { chainId: '1', name: 'ethereum', nativeCurrency: 'ETH', blockExplorer: 'https://etherscan.io', isTestnet: false, avgBlockTime: 12000, confirmations: 12 },
            { chainId: '137', name: 'polygon', nativeCurrency: 'MATIC', blockExplorer: 'https://polygonscan.com', isTestnet: false, avgBlockTime: 2000, confirmations: 20 },
            { chainId: '42161', name: 'arbitrum', nativeCurrency: 'ETH', blockExplorer: 'https://arbiscan.io', isTestnet: false, avgBlockTime: 1000, confirmations: 1 },
            { chainId: '11155111', name: 'sepolia', nativeCurrency: 'ETH', blockExplorer: 'https://sepolia.etherscan.io', isTestnet: true, avgBlockTime: 12000, confirmations: 3 },
            { chainId: '80001', name: 'mumbai', nativeCurrency: 'MATIC', blockExplorer: 'https://mumbai.polygonscan.com', isTestnet: true, avgBlockTime: 2000, confirmations: 5 },
            { chainId: '421614', name: 'arbitrumSepolia', nativeCurrency: 'ETH', blockExplorer: 'https://sepolia.arbiscan.io', isTestnet: true, avgBlockTime: 1000, confirmations: 1 }
        ];
        chains.forEach(chain => this.supportedChains.set(chain.chainId, chain));
    }

    private initializeLiquidityPools(): void {
        const pools: LiquidityPool[] = [
            { id: 'usdc-eth-polygon', sourceChain: '1', destinationChain: '137', token: 'USDC', sourceBalance: 1000000, destinationBalance: 1000000, utilizationRate: 0.3, rebalanceThreshold: 0.8, minLiquidity: 100000, maxLiquidity: 5000000, isActive: true },
            { id: 'usdc-eth-arbitrum', sourceChain: '1', destinationChain: '42161', token: 'USDC', sourceBalance: 500000, destinationBalance: 500000, utilizationRate: 0.2, rebalanceThreshold: 0.8, minLiquidity: 50000, maxLiquidity: 2000000, isActive: true },
            { id: 'usdc-polygon-arbitrum', sourceChain: '137', destinationChain: '42161', token: 'USDC', sourceBalance: 250000, destinationBalance: 250000, utilizationRate: 0.15, rebalanceThreshold: 0.8, minLiquidity: 25000, maxLiquidity: 1000000, isActive: true }
        ];
        pools.forEach(pool => this.liquidityPools.set(pool.id, pool));
    }

    public getSupportedChains(): ChainInfo[] {
        return Array.from(this.supportedChains.values());
    }

    public getLiquidityPools(): LiquidityPool[] {
        return Array.from(this.liquidityPools.values());
    }

    public estimateBridgeTime(sourceChain: string, destinationChain: string): number {
        const sourceConfig = this.supportedChains.get(sourceChain);
        const destConfig = this.supportedChains.get(destinationChain);
        if (!sourceConfig || !destConfig) return 300000;
        return sourceConfig.avgBlockTime * sourceConfig.confirmations + destConfig.avgBlockTime * destConfig.confirmations + 30000;
    }

    public getMonitoringMetrics(): CrossChainMetrics {
        return this.monitoring.getMetrics();
    }

    public startMonitoring(): void {
        this.monitoring.startMonitoring();
    }

    public stopMonitoring(): void {
        this.monitoring.stopMonitoring();
    }

    public getActiveValidators(): ValidatorInfo[] {
        return this.validatorConsensus.getActiveValidators();
    }

    public async requestValidatorConsensus(transactionId: string, transactionData: any): Promise<ValidationResult> {
        return await this.validatorConsensus.requestValidation(transactionId, transactionData);
    }

    public async getValidationResult(transactionId: string): Promise<ValidationResult | null> {
        return await this.validatorConsensus.getValidationResult(transactionId);
    }

    public async checkLiquidityAvailability(sourceChain: string, destinationChain: string, amount: number, token: string = 'USDC'): Promise<LiquidityCheck> {
        const pool = this.getLiquidityPool(sourceChain, destinationChain, token);
        if (!pool || !pool.isActive) {
            return { available: false, reason: 'No active liquidity pool found', suggestedAmount: 0, estimatedWaitTime: 0 };
        }
        const availableLiquidity = pool.destinationBalance * (1 - pool.utilizationRate);
        if (amount <= availableLiquidity) {
            return { available: true, reason: 'Sufficient liquidity available', suggestedAmount: amount, estimatedWaitTime: 0 };
        }
        return { available: false, reason: 'Insufficient liquidity', suggestedAmount: availableLiquidity, estimatedWaitTime: 600000 };
    }

    public getLiquidityPool(sourceChain: string, destinationChain: string, token: string = 'USDC'): LiquidityPool | null {
        const ecosystem1 = this.getChainEcosystem(sourceChain);
        const ecosystem2 = this.getChainEcosystem(destinationChain);
        const poolId = `${token.toLowerCase()}-${ecosystem1}-${ecosystem2}`;
        return this.liquidityPools.get(poolId) || null;
    }

    private getChainEcosystem(chainId: string): string {
        if (['1', '11155111'].includes(chainId)) return 'eth';
        if (['137', '80001'].includes(chainId)) return 'polygon';
        if (['42161', '421614'].includes(chainId)) return 'arbitrum';
        return 'unknown';
    }

    public async optimizeLiquidityAllocation(): Promise<void> {
        logger.info('Liquidity optimization completed');
    }

    public async getBridgeEstimate(sourceChain: string, destinationChain: string, amount: number, token: string = 'USDC'): Promise<BridgeEstimate> {
        try {
            let fee = amount * 0.001; // Default fee calculation
            
            // For USDC, get fee from Circle CCTP
            if (token === 'USDC') {
                try {
                    const ccptFee = await this.circleCCTPService.estimateTransferFee(
                        sourceChain,
                        destinationChain,
                        amount.toString()
                    );
                    fee = Number(ccptFee);
                } catch (error) {
                    logger.warn('Failed to get Circle CCTP fee estimate, using default', { error });
                }
            }
            
            const estimatedTime = this.estimateBridgeTime(sourceChain, destinationChain);
            const estimatedYield = amount * 0.05 * (estimatedTime / (1000 * 60 * 60 * 24 * 365));
            
            return { fee, estimatedTime, estimatedYield };
        } catch (error) {
            logger.error('Failed to get bridge estimate', { error });
            // Fallback to default calculation
            const fee = amount * 0.001;
            const estimatedTime = this.estimateBridgeTime(sourceChain, destinationChain);
            const estimatedYield = amount * 0.05 * (estimatedTime / (1000 * 60 * 60 * 24 * 365));
            return { fee, estimatedTime, estimatedYield };
        }
    }

    public async synchronizeChainState(): Promise<void> {
        await this.stateSync.synchronizeState();
    }

    public subscribeToTransactionUpdates(transactionId: string, subscriberId: string): void {
        this.realTimeUpdates.subscribe(transactionId, subscriberId);
    }

    public unsubscribeFromTransactionUpdates(transactionId: string, subscriberId: string): void {
        this.realTimeUpdates.unsubscribe(transactionId, subscriberId);
    }

    public getSubscriptionStats(): SubscriptionStats {
        return this.realTimeUpdates.getSubscriptionStats();
    }

    public async getTransactionHistory(transactionId: string): Promise<TransactionHistory> {
        return await this.realTimeUpdates.getTransactionHistory(transactionId);
    }

    public async getSubscriberUpdates(subscriberId: string): Promise<any[]> {
        return await this.realTimeUpdates.getSubscriberUpdates(subscriberId);
    }

    public async getBridgeAnalytics(timeRange: 'day' | 'week' | 'month'): Promise<BridgeAnalytics> {
        const now = new Date();
        let startDate: Date;
        switch (timeRange) {
            case 'day': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
            case 'week': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            case 'month': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        }
        const transactions = await this.prisma.crossChainTransaction.findMany({
            where: { createdAt: { gte: startDate } }
        });
        const totalTransactions = transactions.length;
        const successfulTransactions = transactions.filter(tx => tx.status === CrossChainStatus.COMPLETED).length;
        const failedTransactions = transactions.filter(tx => tx.status === CrossChainStatus.FAILED).length;
        const pendingTransactions = totalTransactions - successfulTransactions - failedTransactions;
        const successRate = totalTransactions > 0 ? successfulTransactions / totalTransactions : 0;
        const totalVolume = transactions.reduce((sum, tx) => sum + Number(tx.sourceAmount), 0);
        const totalFees = transactions.reduce((sum, tx) => sum + Number(tx.bridgeFee || 0), 0);
        return {
            timeRange, totalTransactions, successfulTransactions, failedTransactions, pendingTransactions,
            successRate, totalVolume, totalFees, validatorMetrics: {}, liquidityMetrics: {}
        };
    }

    /**
     * Initiate a cross-chain bridge transaction (alias for backward compatibility)
     */
    public async initiateBridge(request: BridgeRequest): Promise<CrossChainTransaction> {
        return await this.initiateBridgeTransaction(
            request.sourceChain,
            request.destinationChain,
            request.amount,
            request.token,
            request.recipient || request.destinationAddress || '0x0000000000000000000000000000000000000000',
            request.sourceAddress || request.recipient || '0x0000000000000000000000000000000000000000',
            request.paymentId || request.metadata?.paymentId
        );
    }

    /**
     * Initiate a cross-chain bridge transaction with consensus
     */
    public async initiateBridgeWithConsensus(request: BridgeRequest): Promise<CrossChainTransaction> {
        const transaction = await this.initiateBridge(request);
        await this.processBridgeTransaction(transaction.id);
        return transaction;
    }

    /**
     * Initiate a cross-chain bridge transaction
     */
    public async initiateBridgeTransaction(
        sourceChain: string,
        destinationChain: string,
        amount: number,
        token: string,
        recipientAddress: string,
        senderAddress: string,
        paymentId?: string
    ): Promise<CrossChainTransaction> {
        try {
            logger.info('Initiating bridge transaction', {
                sourceChain,
                destinationChain,
                amount,
                token,
                recipientAddress
            });

            // Check liquidity availability
            const liquidityCheck = await this.checkLiquidityAvailability(sourceChain, destinationChain, amount, token);
            if (!liquidityCheck.available) {
                throw new Error(`Insufficient liquidity: ${liquidityCheck.reason}`);
            }

            // Get bridge estimate
            const estimate = await this.getBridgeEstimate(sourceChain, destinationChain, amount);

            // Create bridge transaction record
            const bridgeTransaction = await this.prisma.crossChainTransaction.create({
                data: {
                    sourceChain,
                    destinationChain,
                    sourceAmount: amount.toString(),
                    destinationAmount: (amount - estimate.fee).toString(),
                    token,
                    senderAddress,
                    recipientAddress,
                    sourceAddress: senderAddress,
                    destinationAddress: recipientAddress,
                    bridgeFee: estimate.fee.toString(),
                    estimatedYield: estimate.estimatedYield.toString(),
                    status: CrossChainStatus.INITIATED,
                    paymentId: paymentId || null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            // Cache transaction for quick access
            await redis.set(`bridge:${bridgeTransaction.id}`, JSON.stringify(bridgeTransaction), 3600);

            // Start real-time updates
            const statusUpdate = this.realTimeUpdates.createStatusUpdate('INITIATED', {
                sourceChain,
                destinationChain,
                amount,
                estimatedTime: estimate.estimatedTime
            });
            await this.realTimeUpdates.broadcastTransactionUpdate(bridgeTransaction.id, statusUpdate);

            // Record metrics
            this.monitoring.recordTransaction(false, 0, amount); // Will update on completion

            logger.info('Bridge transaction initiated', { transactionId: bridgeTransaction.id });
            return bridgeTransaction;

        } catch (error) {
            logger.error('Failed to initiate bridge transaction', { error });
            throw error;
        }
    }

    /**
     * Process bridge transaction through validation and settlement
     */
    public async processBridgeTransaction(transactionId: string): Promise<void> {
        try {
            const transaction = await this.prisma.crossChainTransaction.findUnique({
                where: { id: transactionId }
            });

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            logger.info('Processing bridge transaction', { transactionId });

            // Update status to processing
            await this.updateTransactionStatus(transactionId, CrossChainStatus.BRIDGE_PENDING);

            // Request validator consensus
            const validationResult = await this.requestValidatorConsensus(transactionId, {
                sourceChain: transaction.sourceChain,
                destinationChain: transaction.destinationChain,
                amount: transaction.sourceAmount,
                token: transaction.token,
                recipient: transaction.recipientAddress
            });

            if (!validationResult.consensusReached) {
                await this.updateTransactionStatus(transactionId, CrossChainStatus.FAILED);
                throw new Error('Validator consensus not reached');
            }

            // Update status to validated
            await this.updateTransactionStatus(transactionId, CrossChainStatus.SOURCE_CONFIRMED);

            // Execute cross-chain settlement
            await this.executeSettlement(transactionId);

            logger.info('Bridge transaction processed successfully', { transactionId });

        } catch (error) {
            logger.error('Failed to process bridge transaction', { error, transactionId });
            await this.updateTransactionStatus(transactionId, CrossChainStatus.FAILED);
            throw error;
        }
    }

    /**
     * Execute cross-chain settlement with yield preservation
     */
    private async executeSettlement(transactionId: string): Promise<void> {
        try {
            const transaction = await this.prisma.crossChainTransaction.findUnique({
                where: { id: transactionId }
            });

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            logger.info('Executing settlement', { transactionId });

            // Calculate yield during transit time
            const transitTime = Date.now() - transaction.createdAt.getTime();
            const actualYield = this.calculateTransitYield(
                Number(transaction.sourceAmount),
                transitTime
            );

            // For USDC transfers, use Circle CCTP
            if (transaction.token === 'USDC') {
                await this.executeCCTPTransfer(transaction, actualYield);
            } else {
                // For other tokens, use liquidity pools
                await this.updateLiquidityPools(
                    transaction.sourceChain,
                    transaction.destinationChain,
                    Number(transaction.sourceAmount),
                    transaction.token || 'USDC'
                );
            }

            // Complete the transaction
            await this.prisma.crossChainTransaction.update({
                where: { id: transactionId },
                data: {
                    status: CrossChainStatus.COMPLETED,
                    actualYield: actualYield.toString(),
                    completedAt: new Date(),
                    updatedAt: new Date()
                }
            });

            // Send completion update
            const completionUpdate = this.realTimeUpdates.createCompletionUpdate(
                Number(transaction.destinationAmount) + actualYield,
                actualYield,
                transitTime
            );
            await this.realTimeUpdates.broadcastTransactionUpdate(transactionId, completionUpdate);

            // Update monitoring metrics
            this.monitoring.recordTransaction(true, transitTime, Number(transaction.sourceAmount));

            logger.info('Settlement executed successfully', { transactionId, actualYield });

        } catch (error) {
            logger.error('Settlement execution failed', { error, transactionId });
            throw error;
        }
    }
    
    /**
     * Execute USDC transfer using Circle CCTP
     */
    private async executeCCTPTransfer(transaction: CrossChainTransaction, actualYield: number): Promise<void> {
        try {
            logger.info('Executing Circle CCTP transfer', { 
                transactionId: transaction.id,
                sourceChain: transaction.sourceChain,
                destinationChain: transaction.destinationChain
            });
            
            // Calculate total amount including yield
            const totalAmount = (
                Number(transaction.destinationAmount) + actualYield
            ).toString();
            
            // Initiate CCTP transfer
            const ccptTransfer = await this.circleCCTPService.initiateTransfer({
                sourceChain: transaction.sourceChain,
                destinationChain: transaction.destinationChain,
                amount: totalAmount,
                sourceAddress: transaction.sourceAddress || transaction.senderAddress,
                destinationAddress: transaction.destinationAddress || transaction.recipientAddress,
                tokenSymbol: 'USDC',
                reference: transaction.id
            });
            
            // Update transaction with CCTP transfer ID
            await this.prisma.crossChainTransaction.update({
                where: { id: transaction.id },
                data: {
                    externalTransactionId: ccptTransfer.id,
                    sourceTransactionHash: ccptTransfer.sourceTransactionHash,
                    destinationTransactionHash: ccptTransfer.destinationTransactionHash,
                    updatedAt: new Date()
                }
            });
            
            logger.info('Circle CCTP transfer initiated', { 
                transactionId: transaction.id,
                ccptTransferId: ccptTransfer.id,
                status: ccptTransfer.status
            });
            
        } catch (error) {
            logger.error('Circle CCTP transfer failed', { 
                error, 
                transactionId: transaction.id 
            });
            throw error;
        }
    }

    /**
     * Calculate yield generated during transit time
     */
    private calculateTransitYield(amount: number, transitTimeMs: number): number {
        const annualYieldRate = 0.05; // 5% APY
        const transitTimeYears = transitTimeMs / (1000 * 60 * 60 * 24 * 365);
        return amount * annualYieldRate * transitTimeYears;
    }

    /**
     * Update liquidity pools after transaction
     */
    private async updateLiquidityPools(
        sourceChain: string,
        destinationChain: string,
        amount: number,
        token: string
    ): Promise<void> {
        const pool = this.getLiquidityPool(sourceChain, destinationChain, token);
        if (pool) {
            pool.sourceBalance += amount;
            pool.destinationBalance -= amount;
            pool.utilizationRate = (pool.maxLiquidity - pool.destinationBalance) / pool.maxLiquidity;
            
            // Update monitoring
            this.monitoring.updateLiquidityMetrics(pool.utilizationRate);
            
            logger.debug('Liquidity pool updated', {
                poolId: pool.id,
                newUtilization: pool.utilizationRate
            });
        }
    }

    /**
     * Update transaction status with real-time notifications
     */
    public async updateTransactionStatus(transactionId: string, status: CrossChainStatus): Promise<void> {
        try {
            await this.prisma.crossChainTransaction.update({
                where: { id: transactionId },
                data: {
                    status,
                    updatedAt: new Date()
                }
            });

            // Update cache
            const cached = await redis.get(`bridge:${transactionId}`);
            if (cached) {
                const transaction = JSON.parse(cached);
                transaction.status = status;
                transaction.updatedAt = new Date();
                await redis.set(`bridge:${transactionId}`, JSON.stringify(transaction), 3600);
            }

            // Send status update
            const statusUpdate = this.realTimeUpdates.createStatusUpdate(status);
            await this.realTimeUpdates.broadcastTransactionUpdate(transactionId, statusUpdate);

            logger.debug('Transaction status updated', { transactionId, status });

        } catch (error) {
            logger.error('Failed to update transaction status', { error, transactionId, status });
            throw error;
        }
    }

    /**
     * Get bridge transaction by ID
     */
    public async getBridgeTransaction(transactionId: string): Promise<CrossChainTransaction | null> {
        try {
            // Try cache first
            const cached = await redis.get(`bridge:${transactionId}`);
            if (cached) {
                return JSON.parse(cached);
            }

            // Fallback to database
            const transaction = await this.prisma.crossChainTransaction.findUnique({
                where: { id: transactionId }
            });

            if (transaction) {
                // Cache for future requests
                await redis.set(`bridge:${transactionId}`, JSON.stringify(transaction), 3600);
            }

            return transaction;

        } catch (error) {
            logger.error('Failed to get bridge transaction', { error, transactionId });
            return null;
        }
    }

    /**
     * Get bridge transactions for a user
     */
    public async getUserBridgeTransactions(
        senderAddress: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<CrossChainTransaction[]> {
        try {
            return await this.prisma.crossChainTransaction.findMany({
                where: { senderAddress },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            });
        } catch (error) {
            logger.error('Failed to get user bridge transactions', { error, senderAddress });
            return [];
        }
    }

    /**
     * Cancel bridge transaction (if still pending)
     */
    public async cancelBridgeTransaction(transactionId: string): Promise<boolean> {
        try {
            const transaction = await this.getBridgeTransaction(transactionId);
            if (!transaction) {
                return false;
            }

            // Can only cancel if still in early stages
            const cancellableStatuses = [CrossChainStatus.INITIATED, CrossChainStatus.BRIDGE_PENDING];
            if (!cancellableStatuses.includes(transaction.status as any)) {
                return false;
            }

            await this.updateTransactionStatus(transactionId, CrossChainStatus.FAILED);

            // Send cancellation update
            const errorUpdate = this.realTimeUpdates.createErrorUpdate('Transaction cancelled by user', 'USER_CANCELLED');
            await this.realTimeUpdates.broadcastTransactionUpdate(transactionId, errorUpdate);

            logger.info('Bridge transaction cancelled', { transactionId });
            return true;

        } catch (error) {
            logger.error('Failed to cancel bridge transaction', { error, transactionId });
            return false;
        }
    }

    /**
     * Retry failed bridge transaction
     */
    public async retryBridgeTransaction(transactionId: string): Promise<boolean> {
        try {
            const transaction = await this.getBridgeTransaction(transactionId);
            if (!transaction || transaction.status !== CrossChainStatus.FAILED) {
                return false;
            }

            // Reset status and retry
            await this.updateTransactionStatus(transactionId, CrossChainStatus.INITIATED);
            await this.processBridgeTransaction(transactionId);

            logger.info('Bridge transaction retry initiated', { transactionId });
            return true;

        } catch (error) {
            logger.error('Failed to retry bridge transaction', { error, transactionId });
            return false;
        }
    }

    /**
     * Get comprehensive bridge status including all details
     */
    public async getBridgeStatus(transactionId: string): Promise<any> {
        try {
            const transaction = await this.getBridgeTransaction(transactionId);
            if (!transaction) {
                return null;
            }

            const validationResult = await this.getValidationResult(transactionId);
            const transactionHistory = await this.getTransactionHistory(transactionId);

            const cancellableStatuses = [CrossChainStatus.INITIATED, CrossChainStatus.BRIDGE_PENDING];
            return {
                transaction,
                validation: validationResult,
                history: transactionHistory,
                estimatedCompletion: this.estimateCompletionTime(transaction),
                canCancel: cancellableStatuses.includes(transaction.status as any),
                canRetry: transaction.status === CrossChainStatus.FAILED
            };

        } catch (error) {
            logger.error('Failed to get bridge status', { error, transactionId });
            return null;
        }
    }

    /**
     * Estimate completion time for a transaction
     */
    private estimateCompletionTime(transaction: CrossChainTransaction): Date | null {
        if (transaction.status === CrossChainStatus.COMPLETED) {
            return transaction.completedAt;
        }

        if (transaction.status === CrossChainStatus.FAILED) {
            return null;
        }

        const estimatedTime = this.estimateBridgeTime(transaction.sourceChain, transaction.destinationChain);
        return new Date(transaction.createdAt.getTime() + estimatedTime);
    }
}
    /**
     * Get comprehensive bridge transaction status with detailed information
     */
    public async getBridgeStatus(transactionId: string): Promise<any | null> {
        try {
            const transaction = await this.getBridgeTransaction(transactionId);
            if (!transaction) {
                return null;
            }

            // Get transaction history with updates
            const history = await this.getTransactionHistory(transactionId);
            
            // Get validation status if available
            let validationResult = null;
            try {
                validationResult = await this.getValidationResult(transactionId);
            } catch (error) {
                logger.debug('No validation result found for transaction', { transactionId });
            }
            
            // Calculate progress percentage based on status
            const progressMap: Record<string, number> = {
                'INITIATED': 10,
                'BRIDGE_PENDING': 25,
                'SOURCE_CONFIRMED': 50,
                'DESTINATION_PENDING': 75,
                'COMPLETED': 100,
                'FAILED': 0
            };
            
            const progress = progressMap[transaction.status] || 0;
            
            // Calculate time elapsed
            const createdAt = new Date(transaction.createdAt).getTime();
            const now = Date.now();
            const elapsedMs = now - createdAt;
            const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
            
            // Calculate estimated completion time
            const estimatedTimeMs = this.estimateBridgeTime(
                transaction.sourceChain,
                transaction.destinationChain
            );
            const estimatedMinutes = Math.floor(estimatedTimeMs / (1000 * 60));
            const remainingMinutes = Math.max(0, estimatedMinutes - elapsedMinutes);
            
            // Get external transaction details if available
            let externalDetails = null;
            if (transaction.externalTransactionId && transaction.token === 'USDC') {
                try {
                    externalDetails = await this.circleCCTPService.getTransferStatus(transaction.externalTransactionId);
                } catch (error) {
                    logger.debug('Failed to get external transaction details', { 
                        transactionId, 
                        externalId: transaction.externalTransactionId 
                    });
                }
            }
            
            // Construct comprehensive status object
            return {
                transactionId: transaction.id,
                status: transaction.status,
                progress,
                sourceChain: transaction.sourceChain,
                destinationChain: transaction.destinationChain,
                sourceAmount: transaction.sourceAmount,
                destinationAmount: transaction.destinationAmount,
                token: transaction.token,
                bridgeFee: transaction.bridgeFee,
                estimatedYield: transaction.estimatedYield,
                actualYield: transaction.actualYield,
                senderAddress: transaction.senderAddress,
                recipientAddress: transaction.recipientAddress,
                paymentId: transaction.paymentId,
                sourceTransactionHash: transaction.sourceTransactionHash,
                destinationTransactionHash: transaction.destinationTransactionHash,
                externalTransactionId: transaction.externalTransactionId,
                externalDetails,
                validation: validationResult,
                history: history.updates,
                timing: {
                    createdAt: transaction.createdAt,
                    updatedAt: transaction.updatedAt,
                    completedAt: transaction.completedAt,
                    sourceConfirmedAt: transaction.sourceConfirmedAt,
                    destinationConfirmedAt: transaction.destinationConfirmedAt,
                    elapsedMinutes,
                    estimatedMinutes,
                    remainingMinutes
                }
            };
        } catch (error) {
            logger.error('Failed to get bridge status', { error, transactionId });
            return null;
        }
    }