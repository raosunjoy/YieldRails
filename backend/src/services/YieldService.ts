import { PrismaClient, YieldStatus, YieldStrategyType, RiskLevel } from '@prisma/client';
import { redis } from '../config/redis';
import { logger, logBusinessEvent, logPerformance } from '../utils/logger';
import { ContractService } from './ContractService';
import { ErrorTypes } from '../middleware/errorHandler';
import { database } from '../config/database';

const prisma = database.getClient();

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
     * Get available yield strategies
     */
    public async getAvailableStrategies(): Promise<any[]> {
        try {
            const strategies = await prisma.yieldStrategy.findMany({
                where: { isActive: true },
                orderBy: { expectedAPY: 'desc' }
            });

            // Format the response
            return strategies.map(strategy => ({
                id: strategy.id,
                name: strategy.name,
                description: strategy.description,
                protocolName: strategy.protocolName,
                chainId: strategy.chainId,
                strategyType: strategy.strategyType,
                expectedAPY: strategy.expectedAPY.toNumber(),
                actualAPY: strategy.actualAPY?.toNumber() || strategy.expectedAPY.toNumber(),
                riskLevel: strategy.riskLevel,
                minAmount: strategy.minAmount.toNumber(),
                maxAmount: strategy.maxAmount?.toNumber(),
                totalValueLocked: strategy.totalValueLocked.toNumber(),
                isActive: strategy.isActive
            }));
        } catch (error) {
            logger.error('Failed to get available strategies:', error);
            throw error;
        }
    }

    /**
     * Get strategy performance comparison
     */
    public async getStrategyComparison(): Promise<any> {
        try {
            const strategies = await prisma.yieldStrategy.findMany({
                where: { isActive: true }
            });

            // Get historical performance data for each strategy
            const performanceData = await Promise.all(
                strategies.map(async (strategy) => {
                    // Get historical APY data (last 30 days)
                    const historicalData = await this.getStrategyHistoricalPerformance(strategy.id);
                    
                    // Calculate risk-adjusted returns
                    const riskMultiplier = this.getRiskMultiplier(strategy.riskLevel);
                    const riskAdjustedAPY = strategy.expectedAPY.toNumber() * riskMultiplier;
                    
                    return {
                        id: strategy.id,
                        name: strategy.name,
                        protocolName: strategy.protocolName,
                        expectedAPY: strategy.expectedAPY.toNumber(),
                        actualAPY: strategy.actualAPY?.toNumber() || strategy.expectedAPY.toNumber(),
                        riskLevel: strategy.riskLevel,
                        riskAdjustedAPY,
                        totalValueLocked: strategy.totalValueLocked.toNumber(),
                        historicalPerformance: historicalData,
                        volatility: this.calculateVolatility(historicalData),
                        sharpeRatio: this.calculateSharpeRatio(historicalData, 0.01) // 1% risk-free rate
                    };
                })
            );

            // Sort by risk-adjusted returns
            performanceData.sort((a, b) => b.riskAdjustedAPY - a.riskAdjustedAPY);

            return {
                strategies: performanceData,
                bestPerforming: performanceData[0],
                lowestRisk: performanceData.sort((a, b) => 
                    this.getRiskScore(a.riskLevel) - this.getRiskScore(b.riskLevel)
                )[0],
                highestSharpeRatio: performanceData.sort((a, b) => b.sharpeRatio - a.sharpeRatio)[0]
            };
        } catch (error) {
            logger.error('Failed to get strategy comparison:', error);
            throw error;
        }
    }

    /**
     * Get historical performance for a strategy
     */
    public async getStrategyHistoricalPerformance(strategyId: string): Promise<any[]> {
        try {
            // Get strategy details
            const strategy = await prisma.yieldStrategy.findUnique({
                where: { id: strategyId }
            });

            if (!strategy) {
                throw ErrorTypes.NOT_FOUND(`Strategy ${strategyId} not found`);
            }

            // Get historical yield earnings for this strategy
            const earnings = await prisma.yieldEarning.findMany({
                where: {
                    strategyId,
                    status: YieldStatus.COMPLETED,
                    endTime: {
                        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
                    }
                },
                orderBy: { endTime: 'asc' }
            });

            // Group by day and calculate average APY
            const dailyPerformance = new Map<string, { totalAPY: number, count: number }>();
            
            earnings.forEach(earning => {
                if (earning.endTime && earning.actualAPY) {
                    const day = earning.endTime.toISOString().split('T')[0];
                    const current = dailyPerformance.get(day) || { totalAPY: 0, count: 0 };
                    
                    dailyPerformance.set(day, {
                        totalAPY: current.totalAPY + earning.actualAPY.toNumber(),
                        count: current.count + 1
                    });
                }
            });

            // Convert to array of daily APY values
            const historicalData = Array.from(dailyPerformance.entries()).map(([date, data]) => ({
                date,
                averageAPY: data.totalAPY / data.count
            }));

            // If we have less than 7 data points, add some based on expected APY
            if (historicalData.length < 7) {
                const today = new Date();
                for (let i = 0; i < 7; i++) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    
                    if (!dailyPerformance.has(dateStr)) {
                        historicalData.push({
                            date: dateStr,
                            averageAPY: strategy.expectedAPY.toNumber()
                        });
                    }
                }
                
                // Sort by date
                historicalData.sort((a, b) => a.date.localeCompare(b.date));
            }

            return historicalData;
        } catch (error) {
            logger.error(`Failed to get historical performance for strategy ${strategyId}:`, error);
            throw error;
        }
    }

    /**
     * Get user yield performance metrics
     */
    public async getUserPerformance(userId: string): Promise<any> {
        try {
            // Get all user yield earnings
            const earnings = await prisma.yieldEarning.findMany({
                where: { userId },
                include: { strategy: true }
            });

            if (earnings.length === 0) {
                return {
                    totalYieldEarned: 0,
                    totalPrincipal: 0,
                    averageAPY: 0,
                    activeStrategies: 0,
                    bestPerformingStrategy: null,
                    yieldByStrategy: [],
                    historicalPerformance: []
                };
            }

            // Calculate total yield and principal
            const totalYield = earnings.reduce((sum, e) => sum + e.netYieldAmount.toNumber(), 0);
            const totalPrincipal = earnings.reduce((sum, e) => sum + e.principalAmount.toNumber(), 0);
            const averageAPY = totalPrincipal > 0 ? (totalYield / totalPrincipal) * 100 : 0;

            // Group by strategy
            const strategiesMap = new Map<string, {
                strategyId: string,
                name: string,
                totalYield: number,
                totalPrincipal: number,
                averageAPY: number,
                earnings: number
            }>();

            earnings.forEach(earning => {
                const strategyId = earning.strategyId;
                const current = strategiesMap.get(strategyId) || {
                    strategyId,
                    name: earning.strategy.name,
                    totalYield: 0,
                    totalPrincipal: 0,
                    averageAPY: 0,
                    earnings: 0
                };

                strategiesMap.set(strategyId, {
                    ...current,
                    totalYield: current.totalYield + earning.netYieldAmount.toNumber(),
                    totalPrincipal: current.totalPrincipal + earning.principalAmount.toNumber(),
                    earnings: current.earnings + 1
                });
            });

            // Calculate APY for each strategy
            const yieldByStrategy = Array.from(strategiesMap.values()).map(strategy => ({
                ...strategy,
                averageAPY: strategy.totalPrincipal > 0 ? 
                    (strategy.totalYield / strategy.totalPrincipal) * 100 : 0
            }));

            // Find best performing strategy
            const bestPerformingStrategy = yieldByStrategy.length > 0 ?
                yieldByStrategy.reduce((best, current) => 
                    current.averageAPY > best.averageAPY ? current : best
                ) : null;

            // Get historical performance (monthly)
            const now = new Date();
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            
            const monthlyPerformance = [];
            for (let i = 0; i < 6; i++) {
                const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
                
                const monthEarnings = earnings.filter(e => {
                    const earningDate = e.endTime || e.createdAt;
                    return earningDate >= month && earningDate < nextMonth;
                });
                
                const monthYield = monthEarnings.reduce((sum, e) => sum + e.netYieldAmount.toNumber(), 0);
                const monthPrincipal = monthEarnings.reduce((sum, e) => sum + e.principalAmount.toNumber(), 0);
                const monthAPY = monthPrincipal > 0 ? (monthYield / monthPrincipal) * 100 : 0;
                
                monthlyPerformance.push({
                    month: month.toISOString().substring(0, 7), // YYYY-MM format
                    yield: monthYield,
                    principal: monthPrincipal,
                    apy: monthAPY
                });
            }

            // Reverse to get chronological order
            monthlyPerformance.reverse();

            return {
                totalYieldEarned: totalYield,
                totalPrincipal,
                averageAPY,
                activeStrategies: strategiesMap.size,
                bestPerformingStrategy,
                yieldByStrategy,
                historicalPerformance: monthlyPerformance
            };
        } catch (error) {
            logger.error(`Failed to get performance metrics for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get overall yield analytics
     */
    public async getOverallAnalytics(): Promise<any> {
        try {
            const startTime = Date.now();
            
            // Get platform-wide metrics
            const [
                totalEarnings,
                activeStrategies,
                totalUsers,
                totalValueLocked
            ] = await Promise.all([
                prisma.yieldEarning.aggregate({
                    _sum: {
                        yieldAmount: true,
                        principalAmount: true,
                        netYieldAmount: true,
                        feeAmount: true
                    }
                }),
                prisma.yieldStrategy.count({
                    where: { isActive: true }
                }),
                prisma.user.count({
                    where: {
                        yieldEarnings: {
                            some: {}
                        }
                    }
                }),
                prisma.yieldStrategy.aggregate({
                    _sum: {
                        totalValueLocked: true
                    }
                })
            ]);

            // Get strategy performance
            const strategies = await prisma.yieldStrategy.findMany({
                where: { isActive: true },
                orderBy: { expectedAPY: 'desc' }
            });

            // Get daily yield generation (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const dailyYields = await prisma.yieldEarning.groupBy({
                by: ['createdAt'],
                where: {
                    createdAt: {
                        gte: thirtyDaysAgo
                    }
                },
                _sum: {
                    yieldAmount: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            // Format daily yields
            const dailyYieldData = dailyYields.map(day => ({
                date: day.createdAt.toISOString().split('T')[0],
                yield: day._sum.yieldAmount?.toNumber() || 0
            }));

            // Calculate platform metrics
            const totalYield = totalEarnings._sum.yieldAmount?.toNumber() || 0;
            const totalPrincipal = totalEarnings._sum.principalAmount?.toNumber() || 0;
            const platformAPY = totalPrincipal > 0 ? (totalYield / totalPrincipal) * 100 : 0;
            const protocolFees = totalEarnings._sum.feeAmount?.toNumber() || 0;
            const tvl = totalValueLocked._sum.totalValueLocked?.toNumber() || 0;

            // Get top performing strategies
            const topStrategies = strategies.map(s => ({
                id: s.id,
                name: s.name,
                protocolName: s.protocolName,
                expectedAPY: s.expectedAPY.toNumber(),
                actualAPY: s.actualAPY?.toNumber() || s.expectedAPY.toNumber(),
                tvl: s.totalValueLocked.toNumber(),
                riskLevel: s.riskLevel
            })).sort((a, b) => b.actualAPY - a.actualAPY).slice(0, 5);

            logPerformance('getOverallAnalytics', Date.now() - startTime);

            return {
                platformMetrics: {
                    totalYieldGenerated: totalYield,
                    totalValueLocked: tvl,
                    averagePlatformAPY: platformAPY,
                    protocolFees,
                    activeUsers: totalUsers,
                    activeStrategies
                },
                topPerformingStrategies: topStrategies,
                dailyYieldGeneration: dailyYieldData,
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('Failed to get overall yield analytics:', error);
            throw error;
        }
    }

    /**
     * Create a new yield strategy
     */
    public async createStrategy(strategyData: {
        name: string;
        description?: string;
        protocolName: string;
        chainId: string;
        contractAddress: string;
        strategyType: YieldStrategyType;
        expectedAPY: number;
        riskLevel: RiskLevel;
        minAmount: number;
        maxAmount?: number;
        strategyConfig?: Record<string, any>;
    }): Promise<any> {
        try {
            // Check if strategy with same name already exists
            const existingStrategy = await prisma.yieldStrategy.findUnique({
                where: { name: strategyData.name }
            });

            if (existingStrategy) {
                throw ErrorTypes.CONFLICT(`Strategy with name ${strategyData.name} already exists`);
            }

            // Create new strategy
            const strategy = await prisma.yieldStrategy.create({
                data: {
                    name: strategyData.name,
                    description: strategyData.description,
                    protocolName: strategyData.protocolName,
                    chainId: strategyData.chainId,
                    contractAddress: strategyData.contractAddress,
                    strategyType: strategyData.strategyType,
                    expectedAPY: strategyData.expectedAPY,
                    riskLevel: strategyData.riskLevel || RiskLevel.MEDIUM,
                    minAmount: strategyData.minAmount,
                    maxAmount: strategyData.maxAmount,
                    strategyConfig: strategyData.strategyConfig || {},
                    isActive: true
                }
            });

            logBusinessEvent('yield_strategy_created', null, {
                strategyId: strategy.id,
                name: strategy.name,
                protocolName: strategy.protocolName
            });

            return {
                id: strategy.id,
                name: strategy.name,
                description: strategy.description,
                protocolName: strategy.protocolName,
                chainId: strategy.chainId,
                strategyType: strategy.strategyType,
                expectedAPY: strategy.expectedAPY.toNumber(),
                riskLevel: strategy.riskLevel,
                minAmount: strategy.minAmount.toNumber(),
                maxAmount: strategy.maxAmount?.toNumber(),
                isActive: strategy.isActive,
                createdAt: strategy.createdAt
            };
        } catch (error) {
            logger.error('Failed to create yield strategy:', error);
            throw error;
        }
    }

    /**
     * Update a yield strategy
     */
    public async updateStrategy(
        strategyId: string,
        updateData: {
            description?: string;
            expectedAPY?: number;
            riskLevel?: RiskLevel;
            minAmount?: number;
            maxAmount?: number;
            isActive?: boolean;
            strategyConfig?: Record<string, any>;
        }
    ): Promise<any> {
        try {
            // Check if strategy exists
            const existingStrategy = await prisma.yieldStrategy.findUnique({
                where: { id: strategyId }
            });

            if (!existingStrategy) {
                throw ErrorTypes.NOT_FOUND(`Strategy ${strategyId} not found`);
            }

            // Update strategy
            const strategy = await prisma.yieldStrategy.update({
                where: { id: strategyId },
                data: updateData
            });

            logBusinessEvent('yield_strategy_updated', null, {
                strategyId: strategy.id,
                name: strategy.name,
                changes: Object.keys(updateData).join(', ')
            });

            return {
                id: strategy.id,
                name: strategy.name,
                description: strategy.description,
                protocolName: strategy.protocolName,
                chainId: strategy.chainId,
                strategyType: strategy.strategyType,
                expectedAPY: strategy.expectedAPY.toNumber(),
                actualAPY: strategy.actualAPY?.toNumber(),
                riskLevel: strategy.riskLevel,
                minAmount: strategy.minAmount.toNumber(),
                maxAmount: strategy.maxAmount?.toNumber(),
                isActive: strategy.isActive,
                updatedAt: strategy.updatedAt
            };
        } catch (error) {
            logger.error(`Failed to update yield strategy ${strategyId}:`, error);
            throw error;
        }
    }

    /**
     * Get yield distribution details
     */
    public async getYieldDistribution(paymentId: string): Promise<any> {
        try {
            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    yieldEarnings: true,
                    user: true,
                    merchant: true
                }
            });

            if (!payment) {
                throw ErrorTypes.NOT_FOUND(`Payment ${paymentId} not found`);
            }

            const yieldAmount = payment.actualYield?.toNumber() || 0;
            
            // Calculate distribution based on 70/20/10 split
            const userYield = yieldAmount * 0.7; // 70% to user
            const merchantYield = yieldAmount * 0.2; // 20% to merchant
            const protocolFee = yieldAmount * 0.1; // 10% protocol fee

            return {
                paymentId: payment.id,
                totalYield: yieldAmount,
                distribution: {
                    user: {
                        userId: payment.userId,
                        amount: userYield,
                        percentage: 70
                    },
                    merchant: payment.merchantId ? {
                        merchantId: payment.merchantId,
                        amount: merchantYield,
                        percentage: 20
                    } : null,
                    protocol: {
                        amount: protocolFee,
                        percentage: 10
                    }
                },
                yieldStrategy: payment.yieldStrategy,
                yieldDuration: payment.yieldDuration || 0,
                status: payment.yieldEarnings[0]?.status || 'PENDING'
            };
        } catch (error) {
            logger.error(`Failed to get yield distribution for payment ${paymentId}:`, error);
            throw error;
        }
    }

    /**
     * Helper methods for yield calculations and analytics
     */
    private getRiskScore(riskLevel: string): number {
        switch (riskLevel) {
            case 'LOW': return 1;
            case 'MEDIUM': return 2;
            case 'HIGH': return 3;
            case 'VERY_HIGH': return 4;
            default: return 2;
        }
    }

    private calculateVolatility(historicalData: any[]): number {
        if (historicalData.length < 2) {
            return 0;
        }

        const apyValues = historicalData.map(d => d.averageAPY);
        const mean = apyValues.reduce((sum, val) => sum + val, 0) / apyValues.length;
        
        const squaredDiffs = apyValues.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
        
        return Math.sqrt(variance);
    }

    private calculateSharpeRatio(historicalData: any[], riskFreeRate: number): number {
        if (historicalData.length < 2) {
            return 0;
        }

        const apyValues = historicalData.map(d => d.averageAPY);
        const mean = apyValues.reduce((sum, val) => sum + val, 0) / apyValues.length;
        const volatility = this.calculateVolatility(historicalData);
        
        if (volatility === 0) {
            return 0;
        }
        
        return (mean - riskFreeRate) / volatility;
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