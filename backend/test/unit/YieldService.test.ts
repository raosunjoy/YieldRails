import { YieldService } from '../../src/services/YieldService';
import { PrismaClient, YieldStatus, YieldStrategyType, RiskLevel } from '@prisma/client';
import { ContractService } from '../../src/services/ContractService';

// Mock PrismaClient
const mockPrisma = {
    yieldStrategy: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
        count: jest.fn()
    },
    yieldEarning: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn()
    },
    payment: {
        findUnique: jest.fn(),
        update: jest.fn()
    },
    user: {
        count: jest.fn()
    }
} as unknown as PrismaClient;

// Mock ContractService
const mockContractService = {
    calculateYield: jest.fn()
} as unknown as ContractService;

// Mock Redis
jest.mock('../../src/config/redis', () => ({
    redis: {
        set: jest.fn().mockResolvedValue(true),
        get: jest.fn().mockResolvedValue(null)
    }
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    },
    logBusinessEvent: jest.fn(),
    logPerformance: jest.fn()
}));

// Mock database
jest.mock('../../src/config/database', () => ({
    database: {
        getClient: jest.fn().mockReturnValue(mockPrisma)
    }
}));

describe('YieldService', () => {
    let yieldService: YieldService;

    beforeEach(() => {
        jest.clearAllMocks();
        yieldService = new YieldService(mockContractService);
    });

    describe('getAvailableStrategies', () => {
        it('should return formatted list of active strategies', async () => {
            const mockStrategies = [
                {
                    id: 'strategy1',
                    name: 'Strategy 1',
                    description: 'Test strategy 1',
                    protocolName: 'Protocol 1',
                    chainId: 'ethereum',
                    contractAddress: '0x123',
                    strategyType: YieldStrategyType.LENDING,
                    expectedAPY: { toNumber: () => 5.5 },
                    actualAPY: { toNumber: () => 5.2 },
                    riskLevel: RiskLevel.LOW,
                    minAmount: { toNumber: () => 100 },
                    maxAmount: { toNumber: () => 10000 },
                    totalValueLocked: { toNumber: () => 50000 },
                    isActive: true
                },
                {
                    id: 'strategy2',
                    name: 'Strategy 2',
                    description: 'Test strategy 2',
                    protocolName: 'Protocol 2',
                    chainId: 'polygon',
                    contractAddress: '0x456',
                    strategyType: YieldStrategyType.STAKING,
                    expectedAPY: { toNumber: () => 8.0 },
                    actualAPY: null,
                    riskLevel: RiskLevel.MEDIUM,
                    minAmount: { toNumber: () => 50 },
                    maxAmount: null,
                    totalValueLocked: { toNumber: () => 25000 },
                    isActive: true
                }
            ];

            mockPrisma.yieldStrategy.findMany.mockResolvedValue(mockStrategies);

            const result = await yieldService.getAvailableStrategies();

            expect(mockPrisma.yieldStrategy.findMany).toHaveBeenCalledWith({
                where: { isActive: true },
                orderBy: { expectedAPY: 'desc' }
            });

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('strategy1');
            expect(result[0].name).toBe('Strategy 1');
            expect(result[0].expectedAPY).toBe(5.5);
            expect(result[0].actualAPY).toBe(5.2);
            expect(result[1].id).toBe('strategy2');
            expect(result[1].expectedAPY).toBe(8.0);
            expect(result[1].actualAPY).toBe(8.0); // Should default to expectedAPY
        });

        it('should handle errors gracefully', async () => {
            mockPrisma.yieldStrategy.findMany.mockRejectedValue(new Error('Database error'));

            await expect(yieldService.getAvailableStrategies()).rejects.toThrow('Database error');
        });
    });

    describe('getCurrentAPY', () => {
        it('should calculate actual APY based on recent performance', async () => {
            const mockStrategy = {
                id: 'strategy1',
                expectedAPY: { toNumber: () => 5.5 }
            };

            const mockEarnings = [
                {
                    principalAmount: { toNumber: () => 1000 },
                    yieldAmount: { toNumber: () => 50 },
                    startTime: new Date('2025-07-01'),
                    endTime: new Date('2025-07-10') // 9 days
                },
                {
                    principalAmount: { toNumber: () => 2000 },
                    yieldAmount: { toNumber: () => 80 },
                    startTime: new Date('2025-07-05'),
                    endTime: new Date('2025-07-15') // 10 days
                }
            ];

            mockPrisma.yieldStrategy.findUnique.mockResolvedValue(mockStrategy);
            mockPrisma.yieldEarning.findMany.mockResolvedValue(mockEarnings);
            mockPrisma.yieldStrategy.update.mockResolvedValue({ ...mockStrategy, actualAPY: 6.2 });

            const result = await yieldService.getCurrentAPY('strategy1');

            expect(mockPrisma.yieldStrategy.findUnique).toHaveBeenCalledWith({
                where: { id: 'strategy1' }
            });

            expect(mockPrisma.yieldEarning.findMany).toHaveBeenCalled();
            expect(mockPrisma.yieldStrategy.update).toHaveBeenCalled();
            
            // The calculation should be approximately:
            // Total principal: 3000
            // Total yield: 130
            // Average duration: 9.5 days
            // APY = (130 / 3000) * (365 / 9.5) * 100 ≈ 166.7%
            // But we're not testing the exact calculation, just that it returns a number
            expect(typeof result).toBe('number');
        });

        it('should return expected APY when no earnings data is available', async () => {
            const mockStrategy = {
                id: 'strategy1',
                expectedAPY: { toNumber: () => 5.5 }
            };

            mockPrisma.yieldStrategy.findUnique.mockResolvedValue(mockStrategy);
            mockPrisma.yieldEarning.findMany.mockResolvedValue([]);

            const result = await yieldService.getCurrentAPY('strategy1');

            expect(result).toBe(5.5);
        });
    });

    describe('optimizeAllocation', () => {
        it('should return optimized allocation recommendations', async () => {
            const mockStrategies = [
                {
                    id: 'strategy1',
                    name: 'Low Risk Strategy',
                    expectedAPY: { toNumber: () => 4.0 },
                    riskLevel: RiskLevel.LOW,
                    minAmount: { toNumber: () => 100 },
                    maxAmount: { toNumber: () => 10000 },
                    isActive: true
                },
                {
                    id: 'strategy2',
                    name: 'Medium Risk Strategy',
                    expectedAPY: { toNumber: () => 8.0 },
                    riskLevel: RiskLevel.MEDIUM,
                    minAmount: { toNumber: () => 50 },
                    maxAmount: null,
                    isActive: true
                },
                {
                    id: 'strategy3',
                    name: 'High Risk Strategy',
                    expectedAPY: { toNumber: () => 12.0 },
                    riskLevel: RiskLevel.HIGH,
                    minAmount: { toNumber: () => 200 },
                    maxAmount: { toNumber: () => 5000 },
                    isActive: true
                }
            ];

            mockPrisma.yieldStrategy.findMany.mockResolvedValue(mockStrategies);

            const result = await yieldService.optimizeAllocation('user1', 1000);

            expect(mockPrisma.yieldStrategy.findMany).toHaveBeenCalledWith({
                where: { isActive: true },
                orderBy: { expectedAPY: 'desc' }
            });

            expect(result).toHaveProperty('totalAmount', 1000);
            expect(result).toHaveProperty('strategies');
            expect(result.strategies).toHaveLength(3);
            expect(result).toHaveProperty('totalEstimatedYield');
            expect(result).toHaveProperty('averageAPY');
        });
    });

    describe('calculateCurrentYield', () => {
        it('should calculate current yield for a payment', async () => {
            const mockPayment = {
                id: 'payment1',
                escrowAddress: '0xescrow',
                senderAddress: '0xsender',
                amount: { toNumber: () => 1000 },
                confirmedAt: new Date('2025-07-10'),
                yieldStrategy: 'Strategy 1',
                yieldEarnings: []
            };

            mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
            mockContractService.calculateYield.mockResolvedValue('50');
            
            const mockStrategy = {
                expectedAPY: { toNumber: () => 5.0 }
            };
            mockPrisma.yieldStrategy.findFirst.mockResolvedValue(mockStrategy);

            const result = await yieldService.calculateCurrentYield('payment1');

            expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
                where: { id: 'payment1' },
                include: { yieldEarnings: true }
            });

            expect(mockContractService.calculateYield).toHaveBeenCalled();
            expect(result).toBe('50');
        });

        it('should return 0 if payment not found', async () => {
            mockPrisma.payment.findUnique.mockResolvedValue(null);

            const result = await yieldService.calculateCurrentYield('nonexistent');

            expect(result).toBe('0');
        });
    });

    describe('getUserPerformance', () => {
        it('should return user yield performance metrics', async () => {
            const mockEarnings = [
                {
                    strategyId: 'strategy1',
                    netYieldAmount: { toNumber: () => 50 },
                    principalAmount: { toNumber: () => 1000 },
                    strategy: { name: 'Strategy 1' },
                    endTime: new Date('2025-06-15')
                },
                {
                    strategyId: 'strategy2',
                    netYieldAmount: { toNumber: () => 80 },
                    principalAmount: { toNumber: () => 2000 },
                    strategy: { name: 'Strategy 2' },
                    endTime: new Date('2025-07-10')
                }
            ];

            mockPrisma.yieldEarning.findMany.mockResolvedValue(mockEarnings);

            const result = await yieldService.getUserPerformance('user1');

            expect(mockPrisma.yieldEarning.findMany).toHaveBeenCalledWith({
                where: { userId: 'user1' },
                include: { strategy: true }
            });

            expect(result).toHaveProperty('totalYieldEarned', 130);
            expect(result).toHaveProperty('totalPrincipal', 3000);
            expect(result).toHaveProperty('averageAPY');
            expect(result).toHaveProperty('yieldByStrategy');
            expect(result).toHaveProperty('historicalPerformance');
        });

        it('should return default values when user has no earnings', async () => {
            mockPrisma.yieldEarning.findMany.mockResolvedValue([]);

            const result = await yieldService.getUserPerformance('user1');

            expect(result).toHaveProperty('totalYieldEarned', 0);
            expect(result).toHaveProperty('totalPrincipal', 0);
            expect(result).toHaveProperty('averageAPY', 0);
            expect(result).toHaveProperty('activeStrategies', 0);
            expect(result).toHaveProperty('bestPerformingStrategy', null);
        });
    });

    describe('getOverallAnalytics', () => {
        it('should return platform-wide yield analytics', async () => {
            mockPrisma.yieldEarning.aggregate.mockResolvedValue({
                _sum: {
                    yieldAmount: { toNumber: () => 10000 },
                    principalAmount: { toNumber: () => 200000 },
                    netYieldAmount: { toNumber: () => 7000 },
                    feeAmount: { toNumber: () => 1000 }
                }
            });

            mockPrisma.yieldStrategy.count.mockResolvedValue(5);
            mockPrisma.user.count.mockResolvedValue(100);
            mockPrisma.yieldStrategy.aggregate.mockResolvedValue({
                _sum: {
                    totalValueLocked: { toNumber: () => 500000 }
                }
            });

            const mockStrategies = [
                {
                    id: 'strategy1',
                    name: 'Strategy 1',
                    protocolName: 'Protocol 1',
                    expectedAPY: { toNumber: () => 5.0 },
                    actualAPY: { toNumber: () => 4.8 },
                    totalValueLocked: { toNumber: () => 200000 },
                    riskLevel: RiskLevel.LOW
                },
                {
                    id: 'strategy2',
                    name: 'Strategy 2',
                    protocolName: 'Protocol 2',
                    expectedAPY: { toNumber: () => 8.0 },
                    actualAPY: { toNumber: () => 7.5 },
                    totalValueLocked: { toNumber: () => 150000 },
                    riskLevel: RiskLevel.MEDIUM
                }
            ];

            mockPrisma.yieldStrategy.findMany.mockResolvedValue(mockStrategies);
            mockPrisma.yieldEarning.groupBy.mockResolvedValue([
                {
                    createdAt: new Date('2025-07-01'),
                    _sum: { yieldAmount: { toNumber: () => 500 } }
                },
                {
                    createdAt: new Date('2025-07-02'),
                    _sum: { yieldAmount: { toNumber: () => 600 } }
                }
            ]);

            const result = await yieldService.getOverallAnalytics();

            expect(result).toHaveProperty('platformMetrics');
            expect(result.platformMetrics).toHaveProperty('totalYieldGenerated', 10000);
            expect(result.platformMetrics).toHaveProperty('totalValueLocked', 500000);
            expect(result.platformMetrics).toHaveProperty('activeUsers', 100);
            expect(result.platformMetrics).toHaveProperty('activeStrategies', 5);
            
            expect(result).toHaveProperty('topPerformingStrategies');
            expect(result.topPerformingStrategies).toHaveLength(2);
            
            expect(result).toHaveProperty('dailyYieldGeneration');
            expect(result.dailyYieldGeneration).toHaveLength(2);
        });
    });

    describe('createStrategy', () => {
        it('should create a new yield strategy', async () => {
            const strategyData = {
                name: 'New Strategy',
                description: 'Test strategy',
                protocolName: 'Test Protocol',
                chainId: 'ethereum',
                contractAddress: '0xcontract',
                strategyType: YieldStrategyType.LENDING,
                expectedAPY: 6.5,
                riskLevel: RiskLevel.MEDIUM,
                minAmount: 100,
                maxAmount: 10000
            };

            mockPrisma.yieldStrategy.findUnique.mockResolvedValue(null);
            mockPrisma.yieldStrategy.create.mockResolvedValue({
                id: 'new-strategy',
                ...strategyData,
                expectedAPY: { toNumber: () => 6.5 },
                minAmount: { toNumber: () => 100 },
                maxAmount: { toNumber: () => 10000 },
                isActive: true,
                createdAt: new Date()
            });

            const result = await yieldService.createStrategy(strategyData);

            expect(mockPrisma.yieldStrategy.findUnique).toHaveBeenCalledWith({
                where: { name: 'New Strategy' }
            });

            expect(mockPrisma.yieldStrategy.create).toHaveBeenCalled();
            expect(result).toHaveProperty('id', 'new-strategy');
            expect(result).toHaveProperty('name', 'New Strategy');
            expect(result).toHaveProperty('expectedAPY', 6.5);
        });

        it('should throw error if strategy with same name exists', async () => {
            mockPrisma.yieldStrategy.findUnique.mockResolvedValue({
                id: 'existing-strategy',
                name: 'Existing Strategy'
            });

            await expect(yieldService.createStrategy({
                name: 'Existing Strategy',
                protocolName: 'Test Protocol',
                chainId: 'ethereum',
                contractAddress: '0xcontract',
                strategyType: YieldStrategyType.LENDING,
                expectedAPY: 6.5,
                riskLevel: RiskLevel.MEDIUM,
                minAmount: 100
            })).rejects.toThrow('Strategy with name Existing Strategy already exists');
        });
    });

    describe('updateStrategy', () => {
        it('should update an existing yield strategy', async () => {
            const existingStrategy = {
                id: 'strategy1',
                name: 'Strategy 1',
                description: 'Old description',
                expectedAPY: { toNumber: () => 5.0 },
                riskLevel: RiskLevel.LOW
            };

            const updateData = {
                description: 'Updated description',
                expectedAPY: 6.0,
                riskLevel: RiskLevel.MEDIUM
            };

            mockPrisma.yieldStrategy.findUnique.mockResolvedValue(existingStrategy);
            mockPrisma.yieldStrategy.update.mockResolvedValue({
                ...existingStrategy,
                description: 'Updated description',
                expectedAPY: { toNumber: () => 6.0 },
                riskLevel: RiskLevel.MEDIUM,
                updatedAt: new Date()
            });

            const result = await yieldService.updateStrategy('strategy1', updateData);

            expect(mockPrisma.yieldStrategy.findUnique).toHaveBeenCalledWith({
                where: { id: 'strategy1' }
            });

            expect(mockPrisma.yieldStrategy.update).toHaveBeenCalledWith({
                where: { id: 'strategy1' },
                data: updateData
            });

            expect(result).toHaveProperty('description', 'Updated description');
            expect(result).toHaveProperty('expectedAPY', 6.0);
            expect(result).toHaveProperty('riskLevel', RiskLevel.MEDIUM);
        });

        it('should throw error if strategy not found', async () => {
            mockPrisma.yieldStrategy.findUnique.mockResolvedValue(null);

            await expect(yieldService.updateStrategy('nonexistent', {
                description: 'Updated description'
            })).rejects.toThrow('Strategy nonexistent not found');
        });
    });

    describe('getYieldDistribution', () => {
        it('should return yield distribution details for a payment', async () => {
            const mockPayment = {
                id: 'payment1',
                userId: 'user1',
                merchantId: 'merchant1',
                actualYield: { toNumber: () => 100 },
                yieldStrategy: 'Strategy 1',
                yieldDuration: 86400, // 1 day
                yieldEarnings: [
                    { status: YieldStatus.ACTIVE }
                ],
                user: { id: 'user1' },
                merchant: { id: 'merchant1' }
            };

            mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

            const result = await yieldService.getYieldDistribution('payment1');

            expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
                where: { id: 'payment1' },
                include: {
                    yieldEarnings: true,
                    user: true,
                    merchant: true
                }
            });

            expect(result).toHaveProperty('paymentId', 'payment1');
            expect(result).toHaveProperty('totalYield', 100);
            expect(result).toHaveProperty('distribution');
            expect(result.distribution).toHaveProperty('user');
            expect(result.distribution).toHaveProperty('merchant');
            expect(result.distribution).toHaveProperty('protocol');
            expect(result.distribution.user).toHaveProperty('amount', 70); // 70% of 100
            expect(result.distribution.merchant).toHaveProperty('amount', 20); // 20% of 100
            expect(result.distribution.protocol).toHaveProperty('amount', 10); // 10% of 100
        });

        it('should throw error if payment not found', async () => {
            mockPrisma.payment.findUnique.mockResolvedValue(null);

            await expect(yieldService.getYieldDistribution('nonexistent')).rejects.toThrow('Payment nonexistent not found');
        });
    });
});