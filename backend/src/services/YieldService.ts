import { PrismaClient, YieldStatus } from '@prisma/client';
import { redis } from '../config/redis';
import { logger, logBusinessEvent } from '../utils/logger';
import { ContractService } from './ContractService';

const prisma = new PrismaClient();

/**
 * Yield calculation and optimization service
 */
export class YieldService {
    private contractService: ContractService;
    private yieldUpdateInterval: NodeJS.Timeout | null = null;

    constructor(contractService?: ContractService) {
        this.contractService = contractService || new ContractService();
        this.startYieldUpdateScheduler();
    }

    /**
     * Start yield generation for a payment
     */
    public async startYieldGeneration(paymentId: string, params: any): Promise<void> {
        try {
            logger.info(`Starting yield generation for payment: ${paymentId}`, params);

            // Cache yield generation parameters
            const cacheKey = `yield:${paymentId}`;
            await redis.set(cacheKey, JSON.stringify({
                ...params,
                startTime: new Date().toISOString(),
                status: 'active'
            }), 86400); // Cache for 24 hours

            // Initialize yield tracking
            await this.initializeYieldTracking(paymentId, params);

            logBusinessEvent('yield_generation_started', params.userId, {
                paymentId,
                amount: params.amount,
                strategy: params.strategy
            });

        } catch (error) {
            logger.error(`Failed to start yield generation for payment ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Calculate current yield for a payment
     */
    public async calculateCurrentYield(paymentId: string): Promise<string> {
        try {
            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: { yieldEarnings: true }
            });

            if (!payment || !payment.escrowAddress) {
                return '0';
            }

            // Get yield from blockchain
            const blockchainYield = await this.getBlockchainYield(payment);
            
            // Calculate time-based yield
            const timeBasedYield = await this.calculateTimeBasedYield(payment);
            
            // Use the higher of the two (blockchain should be authoritative)
            const currentYield = Math.max(parseFloat(blockchainYield), timeBasedYield);

            // Cache the result
            const cacheKey = `yield:current:${paymentId}`;
            await redis.set(cacheKey, currentYield.toString(), 300); // Cache for 5 minutes

            return currentYield.toString();

        } catch (error) {
            logger.error(`Failed to calculate current yield for payment ${paymentId}:`, error);
            return '0';
        }
    }

    /**
     * Calculate final yield when payment is released
     */
    public async calculateFinalYield(paymentId: string): Promise<string> {
        try {
            logger.info(`Calculating final yield for payment: ${paymentId}`);

            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: { yieldEarnings: true }
            });

            if (!payment) {
                throw new Error(`Payment ${paymentId} not found`);
            }

            // Get final yield from blockchain
            let finalYield = '0';
            if (payment.escrowAddress) {
                finalYield = await this.getBlockchainYield(payment);
            }

            // If blockchain yield is 0, calculate based on time and strategy
            if (parseFloat(finalYield) === 0) {
                finalYield = (await this.calculateTimeBasedYield(payment)).toString();
            }

            // Update yield earning record
            await this.updateYieldEarning(paymentId, finalYield);

            logBusinessEvent('final_yield_calculated', payment.userId, {
                paymentId,
                finalYield,
                strategy: payment.yieldStrategy
            });

            return finalYield;

        } catch (error) {
            logger.error(`Failed to calculate final yield for payment ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Get yield optimization recommendations
     */
    public async optimizeAllocation(userId: string, amount: number): Promise<any> {
        try {
            // Get available strategies
            const strategies = await prisma.yieldStrategy.findMany({
                where: { isActive: true },
                orderBy: { expectedAPY: 'desc' }
            });

            // Calculate risk-adjusted returns
            const optimizedAllocation = strategies.map(strategy => {
                const riskMultiplier = this.getRiskMultiplier(strategy.riskLevel);
                const adjustedAPY = strategy.expectedAPY.toNumber() * riskMultiplier;
                const recommendedAllocation = this.calculateAllocation(strategy, amount);

                return {
                    strategyId: strategy.id,
                    name: strategy.name,
                    expectedAPY: strategy.expectedAPY.toNumber(),
                    riskLevel: strategy.riskLevel,
                    adjustedAPY,
                    recommendedAllocation,
                    estimatedYield: (amount * recommendedAllocation * adjustedAPY) / 100
                };
            });

            // Sort by adjusted APY
            optimizedAllocation.sort((a, b) => b.adjustedAPY - a.adjustedAPY);

            return {
                totalAmount: amount,
                strategies: optimizedAllocation,
                totalEstimatedYield: optimizedAllocation.reduce((sum, s) => sum + s.estimatedYield, 0),
                averageAPY: optimizedAllocation.reduce((sum, s) => sum + (s.adjustedAPY * s.recommendedAllocation), 0)
            };

        } catch (error) {
            logger.error(`Failed to optimize allocation for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get current APY for a strategy
     */
    public async getCurrentAPY(strategyId: string): Promise<number> {
        try {
            const strategy = await prisma.yieldStrategy.findUnique({
                where: { id: strategyId }
            });

            if (!strategy) {
                throw new Error(`Strategy ${strategyId} not found`);
            }

            // Get recent performance data
            const recentEarnings = await prisma.yieldEarning.findMany({
                where: {
                    strategyId,
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                    }
                }
            });

            if (recentEarnings.length === 0) {
                return strategy.expectedAPY.toNumber();
            }

            // Calculate actual APY based on recent performance
            const totalPrincipal = recentEarnings.reduce((sum, e) => sum + e.principalAmount.toNumber(), 0);
            const totalYield = recentEarnings.reduce((sum, e) => sum + e.yieldAmount.toNumber(), 0);
            const averageDuration = recentEarnings.reduce((sum, e) => {
                const duration = e.endTime ? 
                    (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60 * 60 * 24) : 
                    (Date.now() - e.startTime.getTime()) / (1000 * 60 * 60 * 24);
                return sum + duration;
            }, 0) / recentEarnings.length;

            const actualAPY = totalPrincipal > 0 ? 
                (totalYield / totalPrincipal) * (365 / averageDuration) * 100 : 
                strategy.expectedAPY.toNumber();

            // Update strategy with actual APY
            await prisma.yieldStrategy.update({
                where: { id: strategyId },
                data: { actualAPY: actualAPY }
            });

            return actualAPY;

        } catch (error) {
            logger.error(`Failed to get current APY for strategy ${strategyId}:`, error);
            return 0;
        }
    }

    /**
     * Get yield history for a user
     */
    public async getYieldHistory(
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<any> {
        try {
            const [earnings, totalEarnings, totalPrincipal] = await Promise.all([
                prisma.yieldEarning.findMany({
                    where: { userId },
                    include: {
                        strategy: true,
                        payment: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset
                }),
                prisma.yieldEarning.aggregate({
                    where: { userId },
                    _sum: { netYieldAmount: true }
                }),
                prisma.yieldEarning.aggregate({
                    where: { userId },
                    _sum: { principalAmount: true }
                })
            ]);

            const totalYield = totalEarnings._sum.netYieldAmount?.toNumber() || 0;
            const totalPrincipalAmount = totalPrincipal._sum.principalAmount?.toNumber() || 0;
            const averageAPY = totalPrincipalAmount > 0 ? (totalYield / totalPrincipalAmount) * 100 : 0;

            return {
                earnings: earnings.map(earning => ({
                    id: earning.id,
                    paymentId: earning.paymentId,
                    strategy: earning.strategy.name,
                    principalAmount: earning.principalAmount.toNumber(),
                    yieldAmount: earning.yieldAmount.toNumber(),
                    netYieldAmount: earning.netYieldAmount.toNumber(),
                    actualAPY: earning.actualAPY?.toNumber() || 0,
                    duration: earning.endTime ? 
                        Math.round((earning.endTime.getTime() - earning.startTime.getTime()) / (1000 * 60 * 60 * 24)) : 
                        Math.round((Date.now() - earning.startTime.getTime()) / (1000 * 60 * 60 * 24)),
                    status: earning.status,
                    createdAt: earning.createdAt
                })),
                summary: {
                    totalYieldEarned: totalYield,
                    totalPrincipal: totalPrincipalAmount,
                    averageAPY,
                    totalEarnings: earnings.length
                }
            };

        } catch (error) {
            logger.error(`Failed to get yield history for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Private helper methods
     */

    private async initializeYieldTracking(paymentId: string, params: any): Promise<void> {
        // Set up real-time yield tracking
        const trackingKey = `yield:tracking:${paymentId}`;
        await redis.set(trackingKey, JSON.stringify({
            paymentId,
            amount: params.amount,
            strategy: params.strategy,
            startTime: params.startTime,
            lastUpdate: new Date().toISOString(),
            currentYield: 0
        }), 86400);
    }

    private async getBlockchainYield(payment: any): Promise<string> {
        try {
            if (!payment.escrowAddress || !payment.senderAddress) {
                return '0';
            }

            // Mock deposit index - in real implementation, this would be stored
            const depositIndex = 0;
            
            return await this.contractService.calculateYield(
                payment.escrowAddress,
                payment.sourceChain,
                payment.senderAddress,
                depositIndex
            );
        } catch (error) {
            logger.error('Failed to get blockchain yield:', error);
            return '0';
        }
    }

    private async calculateTimeBasedYield(payment: any): Promise<number> {
        const startTime = payment.confirmedAt || payment.createdAt;
        const currentTime = new Date();
        const durationInDays = (currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
        
        // Get strategy APY
        let apy = 0.05; // Default 5% APY
        if (payment.yieldStrategy) {
            const strategy = await prisma.yieldStrategy.findFirst({
                where: { name: payment.yieldStrategy }
            });
            apy = strategy ? strategy.expectedAPY.toNumber() / 100 : 0.05;
        }

        // Calculate yield based on time and APY
        const dailyRate = apy / 365;
        const yieldAmount = payment.amount.toNumber() * dailyRate * durationInDays;
        
        return Math.max(0, yieldAmount);
    }

    private getRiskMultiplier(riskLevel: string): number {
        switch (riskLevel) {
            case 'LOW': return 0.9;
            case 'MEDIUM': return 0.8;
            case 'HIGH': return 0.6;
            case 'VERY_HIGH': return 0.4;
            default: return 0.8;
        }
    }

    private calculateAllocation(strategy: any, totalAmount: number): number {
        // Simple allocation based on risk level and expected APY
        const baseAllocation = Math.min(strategy.maxAmount?.toNumber() || totalAmount, totalAmount * 0.5);
        const riskAdjustment = this.getRiskMultiplier(strategy.riskLevel);
        
        return Math.min(baseAllocation * riskAdjustment, totalAmount) / totalAmount;
    }

    private async updateYieldEarning(paymentId: string, finalYield: string): Promise<void> {
        const yieldAmount = parseFloat(finalYield);
        const userYield = yieldAmount * 0.7; // 70% to user
        const feeAmount = yieldAmount * 0.1; // 10% protocol fee

        await prisma.yieldEarning.updateMany({
            where: { 
                paymentId,
                status: YieldStatus.ACTIVE
            },
            data: {
                yieldAmount,
                netYieldAmount: userYield,
                feeAmount,
                endTime: new Date(),
                status: YieldStatus.COMPLETED
            }
        });
    }

    private startYieldUpdateScheduler(): void {
        // Update yields every 5 minutes
        this.yieldUpdateInterval = setInterval(async () => {
            await this.updateAllActiveYields();
        }, 5 * 60 * 1000);
    }

    private async updateAllActiveYields(): Promise<void> {
        try {
            const activePayments = await prisma.payment.findMany({
                where: { 
                    status: 'CONFIRMED',
                    yieldStrategy: { not: null }
                },
                take: 100 // Process in batches
            });

            for (const payment of activePayments) {
                try {
                    const currentYield = await this.calculateCurrentYield(payment.id);
                    
                    // Update payment with current yield
                    await prisma.payment.update({
                        where: { id: payment.id },
                        data: { actualYield: parseFloat(currentYield) }
                    });

                } catch (error) {
                    logger.error(`Failed to update yield for payment ${payment.id}:`, error);
                }
            }

        } catch (error) {
            logger.error('Failed to update active yields:', error);
        }
    }

    /**
     * Cleanup method
     */
    public cleanup(): void {
        if (this.yieldUpdateInterval) {
            clearInterval(this.yieldUpdateInterval);
            this.yieldUpdateInterval = null;
        }
    }
}