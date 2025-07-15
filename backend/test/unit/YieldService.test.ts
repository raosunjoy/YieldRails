import { jest } from '@jest/globals';
import { YieldService } from '../../src/services/YieldService';
import { ContractService } from '../../src/services/ContractService';
import { PrismaClient, YieldStatus } from '@prisma/client';
import { redis } from '../../src/config/redis';
import { ApiTestUtils, RedisTestUtils, ErrorTestUtils, TimeTestUtils } from '../helpers/testUtils';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/config/redis');
jest.mock('../../src/services/ContractService');

const mockPrisma = {
    payment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    },
    yieldStrategy: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    },
    yieldEarning: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn()
    }
};

const mockRedis = RedisTestUtils.createMockRedisClient();
const mockContractService = {
    calculateYield: jest.fn()
};

describe('YieldService', () => {
    let yieldService: YieldService;
    let testPayment: any;
    let testStrategy: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup mocks
        (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any);
        (redis as any) = mockRedis;
        
        yieldService = new YieldService(mockContractService as any);

        // Test data
        testPayment = ApiTestUtils.createTestPayment({
            id: 'payment-1',
            amount: 100,
            tokenSymbol: 'USDC',
            sourceChain: 'ethereum',
            escrowAddress: '0x1234567890123456789012345678901234567890',
            senderAddress: '0x9876543210987654321098765432109876543210',
            yieldStrategy: 'Circle USDC Lending',
            confirmedAt: new Date('2024-01-01T00:00:00Z')
        });

        testStrategy = {
            id: 'strategy-1',
            name: 'Circle USDC Lending',
            expectedAPY: 5.0,
            riskLevel: 'LOW',
            minAmount: 10,
            maxAmount: 10000,
            isActive: true
        };
    });

    afterEach(() => {
        yieldService.cleanup();
    });

    describe('startYieldGeneration', () => {
        const yieldParams = {
            amount: 100,
            token: 'USDC',
            strategy: 'Circle USDC Lending',
            startTime: new Date(),
            userId: 'user-1'
        };

        beforeEach(() => {
            mockRedis.set.mockResolvedValue('OK');
        });

        it('should start yield generation successfully', async () => {
            await yieldService.startYieldGeneration('payment-1', yieldParams);

            expect(mockRedis.set).toHaveBeenCalledWith(
                'yield:payment-1',
                expect.stringContaining('"status":"active"'),
                86400
            );

            expect(mockRedis.set).toHaveBeenCalledWith(
                'yield:tracking:payment-1',
                expect.stringContaining('"paymentId":"payment-1"'),
                86400
            );
        });

        it('should handle Redis errors gracefully', async () => {
            mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));

            // Should not throw error
            await expect(yieldService.startYieldGeneration('payment-1', yieldParams))
                .resolves.not.toThrow();
        });

        it('should cache yield parameters correctly', async () => {
            await yieldService.startYieldGeneration('payment-1', yieldParams);

            const cacheCall = mockRedis.set.mock.calls.find(call => 
                call[0] === 'yield:payment-1'
            );
            expect(cacheCall).toBeDefined();
            
            const cachedData = JSON.parse(cacheCall![1]);
            expect(cachedData).toEqual(expect.objectContaining({
                amount: yieldParams.amount,
                token: yieldParams.token,
                strategy: yieldParams.strategy,
                status: 'active'
            }));
        });
    });

    describe('calculateCurrentYield', () => {
        beforeEach(() => {
            mockPrisma.payment.findUnique.mockResolvedValue(testPayment);
            mockContractService.calculateYield.mockResolvedValue('3.5');
            mockRedis.set.mockResolvedValue('OK');
        });

        it('should calculate current yield from blockchain', async () => {
            const result = await yieldService.calculateCurrentYield('payment-1');

            expect(result).toBe('3.5');
            expect(mockContractService.calculateYield).toHaveBeenCalledWith(
                testPayment.escrowAddress,
                testPayment.sourceChain,
                testPayment.senderAddress,
                0
            );
            expect(mockRedis.set).toHaveBeenCalledWith(
                'yield:current:payment-1',
                '3.5',
                300
            );
        });

        it('should fallback to time-based calculation when blockchain yield is 0', async () => {
            mockContractService.calculateYield.mockResolvedValue('0');
            mockPrisma.yieldStrategy.findFirst.mockResolvedValue(testStrategy);

            const result = await yieldService.calculateCurrentYield('payment-1');

            expect(parseFloat(result)).toBeGreaterThan(0);
        });

        it('should return 0 for payment without escrow address', async () => {
            mockPrisma.payment.findUnique.mockResolvedValue({
                ...testPayment,
                escrowAddress: null
            });

            const result = await yieldService.calculateCurrentYield('payment-1');

            expect(result).toBe('0');
            expect(mockContractService.calculateYield).not.toHaveBeenCalled();
        });

        it('should return 0 for non-existent payment', async () => {
            mockPrisma.payment.findUnique.mockResolvedValue(null);

            const result = await yieldService.calculateCurrentYield('non-existent');

            expect(result).toBe('0');
        });

        it('should handle blockchain errors gracefully', async () => {
            mockContractService.calculateYield.mockRejectedValue(new Error('Blockchain error'));
            mockPrisma.yieldStrategy.findFirst.mockResolvedValue(testStrategy);

            const result = await yieldService.calculateCurrentYield('payment-1');

            // Should fallback to time-based calculation
            expect(parseFloat(result)).toBeGreaterThanOrEqual(0);
        });
    });

    describe('calculateFinalYield', () => {
        beforeEach(() => {
            mockPrisma.payment.findUnique.mockResolvedValue(testPayment);
            mockContractService.calculateYield.mockResolvedValue('5.0');
            mockPrisma.yieldEarning.updateMany.mockResolvedValue({ count: 1 });
        });

        it('should calculate final yield successfully', async () => {
            const result = await yieldService.calculateFinalYield('payment-1');

            expect(result).toBe('5.0');
            expect(mockPrisma.yieldEarning.updateMany).toHaveBeenCalledWith({
                where: { 
                    paymentId: 'payment-1',
                    status: YieldStatus.ACTIVE
                },
                data: expect.objectContaining({
                    yieldAmount: 5.0,
                    netYieldAmount: 3.5, // 70% of 5.0
                    feeAmount: 0.5, // 10% of 5.0
                    status: YieldStatus.COMPLETED
                })
            });
        });

        it('should throw error for non-existent payment', async () => {
            mockPrisma.payment.findUnique.mockResolvedValue(null);

            await ErrorTestUtils.expectToThrow(
                () => yieldService.calculateFinalYield('non-existent'),
                'Payment non-existent not found'
            );
        });

        it('should fallback to time-based calculation when blockchain yield is 0', async () => {
            mockContractService.calculateYield.mockResolvedValue('0');
            mockPrisma.yieldStrategy.findFirst.mockResolvedValue(testStrategy);

            const result = await yieldService.calculateFinalYield('payment-1');

            expect(parseFloat(result)).toBeGreaterThan(0);
        });
    });

    describe('optimizeAllocation', () => {
        const mockStrategies = [
            {
                id: 'strategy-1',
                name: 'High Yield Strategy',
                expectedAPY: 8.0,
                riskLevel: 'HIGH',
                minAmount: 100,
                maxAmount: 5000,
                isActive: true
            },
            {
                id: 'strategy-2',
                name: 'Safe Strategy',
                expectedAPY: 4.0,
                riskLevel: 'LOW',
                minAmount: 10,
                maxAmount: 10000,
                isActive: true
            },
            {
                id: 'strategy-3',
                name: 'Medium Strategy',
                expectedAPY: 6.0,
                riskLevel: 'MEDIUM',
                minAmount: 50,
                maxAmount: 8000,
                isActive: true
            }
        ];

        beforeEach(() => {
            mockPrisma.yieldStrategy.findMany.mockResolvedValue(mockStrategies);
        });

        it('should optimize allocation based on risk-adjusted returns', async () => {
            const result = await yieldService.optimizeAllocation('user-1', 1000);

            expect(result.totalAmount).toBe(1000);
            expect(result.strategies).toHaveLength(3);
            
            // Should be sorted by adjusted APY (descending)
            const apys = result.strategies.map((s: any) => s.adjustedAPY);
            for (let i = 1; i < apys.length; i++) {
                expect(apys[i-1]).toBeGreaterThanOrEqual(apys[i]);
            }

            // Should include risk adjustments
            const highRiskStrategy = result.strategies.find((s: any) => s.name === 'High Yield Strategy');
            const lowRiskStrategy = result.strategies.find((s: any) => s.name === 'Safe Strategy');
            
            expect(highRiskStrategy.adjustedAPY).toBeLessThan(highRiskStrategy.expectedAPY);
            expect(lowRiskStrategy.adjustedAPY).toBeLessThan(lowRiskStrategy.expectedAPY);
        });

        it('should calculate recommended allocations', async () => {
            const result = await yieldService.optimizeAllocation('user-1', 1000);

            result.strategies.forEach((strategy: any) => {
                expect(strategy.recommendedAllocation).toBeGreaterThan(0);
                expect(strategy.recommendedAllocation).toBeLessThanOrEqual(1);
                expect(strategy.estimatedYield).toBeGreaterThanOrEqual(0);
            });
        });

        it('should handle empty strategies list', async () => {
            mockPrisma.yieldStrategy.findMany.mockResolvedValue([]);

            const result = await yieldService.optimizeAllocation('user-1', 1000);

            expect(result.strategies).toHaveLength(0);
            expect(result.totalEstimatedYield).toBe(0);
            expect(result.averageAPY).toBe(0);
        });
    });

    describe('getCurrentAPY', () => {
        const recentEarnings = [
            {
                principalAmount: { toNumber: () => 100 },
                yieldAmount: { toNumber: () => 5 },
                startTime: new Date('2024-01-01'),
                endTime: new Date('2024-01-31')
            },
            {
                principalAmount: { toNumber: () => 200 },
                yieldAmount: { toNumber: () => 12 },
                startTime: new Date('2024-01-15'),
                endTime: new Date('2024-02-15')
            }
        ];

        beforeEach(() => {
            mockPrisma.yieldStrategy.findUnique.mockResolvedValue(testStrategy);
            mockPrisma.yieldEarning.findMany.mockResolvedValue(recentEarnings);
            mockPrisma.yieldStrategy.update.mockResolvedValue(testStrategy);
        });

        it('should calculate actual APY from recent performance', async () => {
            const result = await yieldService.getCurrentAPY('strategy-1');

            expect(result).toBeGreaterThan(0);
            expect(mockPrisma.yieldStrategy.update).toHaveBeenCalledWith({
                where: { id: 'strategy-1' },
                data: { actualAPY: expect.any(Number) }
            });
        });

        it('should return expected APY when no recent earnings', async () => {
            mockPrisma.yieldEarning.findMany.mockResolvedValue([]);

            const result = await yieldService.getCurrentAPY('strategy-1');

            expect(result).toBe(testStrategy.expectedAPY);
        });

        it('should throw error for non-existent strategy', async () => {
            mockPrisma.yieldStrategy.findUnique.mockResolvedValue(null);

            await ErrorTestUtils.expectToThrow(
                () => yieldService.getCurrentAPY('non-existent'),
                'Strategy non-existent not found'
            );
        });

        it('should handle earnings without end time', async () => {
            const earningsWithoutEndTime = [
                {
                    principalAmount: { toNumber: () => 100 },
                    yieldAmount: { toNumber: () => 2 },
                    startTime: new Date('2024-01-01'),
                    endTime: null
                }
            ];

            mockPrisma.yieldEarning.findMany.mockResolvedValue(earningsWithoutEndTime);

            const result = await yieldService.getCurrentAPY('strategy-1');

            expect(result).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getYieldHistory', () => {
        const mockEarnings = [
            {
                id: 'earning-1',
                paymentId: 'payment-1',
                strategy: { name: 'Strategy 1' },
                principalAmount: { toNumber: () => 100 },
                yieldAmount: { toNumber: () => 5 },
                netYieldAmount: { toNumber: () => 3.5 },
                actualAPY: { toNumber: () => 5.2 },
                status: YieldStatus.COMPLETED,
                startTime: new Date('2024-01-01'),
                endTime: new Date('2024-01-31'),
                createdAt: new Date('2024-01-01')
            }
        ];

        const mockAggregates = {
            _sum: { 
                netYieldAmount: { toNumber: () => 10.5 },
                principalAmount: { toNumber: () => 300 }
            }
        };

        beforeEach(() => {
            mockPrisma.yieldEarning.findMany.mockResolvedValue(mockEarnings);
            mockPrisma.yieldEarning.aggregate.mockResolvedValue(mockAggregates);
        });

        it('should return comprehensive yield history', async () => {
            const result = await yieldService.getYieldHistory('user-1');

            expect(result.earnings).toHaveLength(1);
            expect(result.earnings[0]).toEqual(expect.objectContaining({
                id: 'earning-1',
                paymentId: 'payment-1',
                strategy: 'Strategy 1',
                principalAmount: 100,
                yieldAmount: 5,
                netYieldAmount: 3.5,
                actualAPY: 5.2,
                duration: 30, // January has 31 days, but calculation might vary
                status: YieldStatus.COMPLETED
            }));

            expect(result.summary).toEqual({
                totalYieldEarned: 10.5,
                totalPrincipal: 300,
                averageAPY: 3.5, // 10.5 / 300 * 100
                totalEarnings: 1
            });
        });

        it('should handle pagination parameters', async () => {
            await yieldService.getYieldHistory('user-1', 25, 50);

            expect(mockPrisma.yieldEarning.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                include: expect.any(Object),
                orderBy: { createdAt: 'desc' },
                take: 25,
                skip: 50
            });
        });

        it('should handle null aggregate values', async () => {
            mockPrisma.yieldEarning.aggregate.mockResolvedValue({
                _sum: { 
                    netYieldAmount: null,
                    principalAmount: null
                }
            });

            const result = await yieldService.getYieldHistory('user-1');

            expect(result.summary).toEqual({
                totalYieldEarned: 0,
                totalPrincipal: 0,
                averageAPY: 0,
                totalEarnings: 1
            });
        });

        it('should calculate duration for ongoing earnings', async () => {
            const ongoingEarnings = [{
                ...mockEarnings[0],
                endTime: null
            }];

            mockPrisma.yieldEarning.findMany.mockResolvedValue(ongoingEarnings);

            const result = await yieldService.getYieldHistory('user-1');

            expect(result.earnings[0].duration).toBeGreaterThan(0);
        });
    });

    describe('Time-based Yield Calculation', () => {
        beforeEach(() => {
            mockPrisma.yieldStrategy.findFirst.mockResolvedValue(testStrategy);
        });

        it('should calculate yield based on time duration', async () => {
            // Mock payment with 30 days duration
            const paymentWith30Days = {
                ...testPayment,
                confirmedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                amount: { toNumber: () => 1000 }
            };

            const yieldAmount = await yieldService['calculateTimeBasedYield'](paymentWith30Days);

            // Expected: 1000 * (5% / 365) * 30 ≈ 4.11
            expect(yieldAmount).toBeCloseTo(4.11, 1);
        });

        it('should use default APY when strategy not found', async () => {
            mockPrisma.yieldStrategy.findFirst.mockResolvedValue(null);

            const yieldAmount = await yieldService['calculateTimeBasedYield'](testPayment);

            expect(yieldAmount).toBeGreaterThan(0);
        });

        it('should return 0 for negative duration', async () => {
            const futurePayment = {
                ...testPayment,
                confirmedAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day in future
                amount: { toNumber: () => 1000 }
            };

            const yieldAmount = await yieldService['calculateTimeBasedYield'](futurePayment);

            expect(yieldAmount).toBe(0);
        });
    });

    describe('Risk Multiplier Calculation', () => {
        it('should apply correct risk multipliers', () => {
            expect(yieldService['getRiskMultiplier']('LOW')).toBe(0.9);
            expect(yieldService['getRiskMultiplier']('MEDIUM')).toBe(0.8);
            expect(yieldService['getRiskMultiplier']('HIGH')).toBe(0.6);
            expect(yieldService['getRiskMultiplier']('VERY_HIGH')).toBe(0.4);
            expect(yieldService['getRiskMultiplier']('UNKNOWN')).toBe(0.8);
        });
    });

    describe('Allocation Calculation', () => {
        it('should calculate allocation based on risk and limits', () => {
            const strategy = {
                maxAmount: { toNumber: () => 5000 },
                riskLevel: 'MEDIUM'
            };

            const allocation = yieldService['calculateAllocation'](strategy, 10000);

            expect(allocation).toBeGreaterThan(0);
            expect(allocation).toBeLessThanOrEqual(1);
        });

        it('should handle strategy without max amount', () => {
            const strategy = {
                maxAmount: null,
                riskLevel: 'LOW'
            };

            const allocation = yieldService['calculateAllocation'](strategy, 1000);

            expect(allocation).toBeGreaterThan(0);
            expect(allocation).toBeLessThanOrEqual(1);
        });
    });

    describe('Yield Update Scheduler', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            mockPrisma.payment.findMany.mockResolvedValue([testPayment]);
            mockPrisma.payment.update.mockResolvedValue(testPayment);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should update active yields periodically', async () => {
            // Fast-forward time to trigger the scheduler
            jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
                where: { 
                    status: 'CONFIRMED',
                    yieldStrategy: { not: null }
                },
                take: 100
            });
        });

        it('should handle errors in batch updates gracefully', async () => {
            mockPrisma.payment.findMany.mockRejectedValue(new Error('Database error'));

            // Should not throw error
            jest.advanceTimersByTime(5 * 60 * 1000);
            await new Promise(resolve => setTimeout(resolve, 0));

            // Service should continue running
            expect(yieldService).toBeDefined();
        });
    });

    describe('Cleanup', () => {
        it('should clear interval on cleanup', () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            
            yieldService.cleanup();

            expect(clearIntervalSpy).toHaveBeenCalled();
        });

        it('should handle cleanup when no interval is set', () => {
            const newYieldService = new YieldService();
            newYieldService['yieldUpdateInterval'] = null;

            // Should not throw error
            expect(() => newYieldService.cleanup()).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            mockPrisma.payment.findUnique.mockRejectedValue(new Error('Database error'));

            const result = await yieldService.calculateCurrentYield('payment-1');

            expect(result).toBe('0');
        });

        it('should handle Redis errors gracefully', async () => {
            mockRedis.set.mockRejectedValue(new Error('Redis error'));
            mockPrisma.payment.findUnique.mockResolvedValue(testPayment);
            mockContractService.calculateYield.mockResolvedValue('2.5');

            const result = await yieldService.calculateCurrentYield('payment-1');

            expect(result).toBe('2.5');
        });

        it('should handle contract service errors gracefully', async () => {
            mockPrisma.payment.findUnique.mockResolvedValue(testPayment);
            mockContractService.calculateYield.mockRejectedValue(new Error('Contract error'));
            mockPrisma.yieldStrategy.findFirst.mockResolvedValue(testStrategy);

            const result = await yieldService.calculateCurrentYield('payment-1');

            // Should fallback to time-based calculation
            expect(parseFloat(result)).toBeGreaterThanOrEqual(0);
        });
    });
});