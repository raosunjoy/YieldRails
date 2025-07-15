import { CrossChainService } from '../../src/services/CrossChainService';
import { PrismaClient } from '@prisma/client';
import { redis } from '../../src/config/redis';
import { NotificationService } from '../../src/services/NotificationService';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/config/redis');
jest.mock('../../src/services/NotificationService');
jest.mock('../../src/utils/logger');

describe('CrossChainService - Liquidity Pool Management', () => {
    let crossChainService: CrossChainService;
    let mockRedisSet: jest.Mock;

    beforeEach(() => {
        // Set test environment
        process.env.NODE_ENV = 'test';
        
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock Prisma Client
        (PrismaClient as jest.Mock).mockImplementation(() => ({
            crossChainTransaction: {
                create: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
            },
        }));

        // Mock Redis
        mockRedisSet = jest.fn();
        (redis as any).get = jest.fn();
        (redis as any).set = mockRedisSet;
        (redis as any).del = jest.fn();

        // Mock NotificationService
        (NotificationService as jest.Mock).mockImplementation(() => ({
            sendBridgeCompletionNotification: jest.fn(),
            sendBridgeFailureNotification: jest.fn(),
        }));

        crossChainService = new CrossChainService();
    });

    afterEach(() => {
        crossChainService.stopMonitoring();
    });

    describe('getLiquidityPools', () => {
        it('should return all liquidity pools', () => {
            const pools = crossChainService.getLiquidityPools();

            expect(pools).toBeInstanceOf(Array);
            expect(pools.length).toBeGreaterThan(0);
            expect(pools[0]).toHaveProperty('id');
            expect(pools[0]).toHaveProperty('sourceChain');
            expect(pools[0]).toHaveProperty('destinationChain');
            expect(pools[0]).toHaveProperty('token');
            expect(pools[0]).toHaveProperty('sourceBalance');
            expect(pools[0]).toHaveProperty('destinationBalance');
        });
    });

    describe('getLiquidityPool', () => {
        it('should return specific pool for chain pair', () => {
            const pool = crossChainService.getLiquidityPool('1', '137', 'USDC');

            expect(pool).toBeTruthy();
            expect(pool?.token).toBe('USDC');
            expect(pool?.isActive).toBe(true);
        });

        it('should return null for non-existent pool', () => {
            const pool = crossChainService.getLiquidityPool('999', '888', 'USDC');

            expect(pool).toBeNull();
        });
    });

    describe('checkLiquidityAvailability', () => {
        it('should return available for sufficient liquidity', async () => {
            const result = await crossChainService.checkLiquidityAvailability('1', '137', 100000);

            expect(result.available).toBe(true);
            expect(result.suggestedAmount).toBe(100000);
            expect(result.estimatedWaitTime).toBe(0);
        });

        it('should return unavailable for insufficient liquidity', async () => {
            const result = await crossChainService.checkLiquidityAvailability('1', '137', 10000000);

            expect(result.available).toBe(false);
            expect(result.estimatedWaitTime).toBeGreaterThan(0);
        });

        it('should return unavailable for non-existent pool', async () => {
            const result = await crossChainService.checkLiquidityAvailability('999', '888', 1000);

            expect(result.available).toBe(false);
            expect(result.reason).toBe('No active liquidity pool found');
        });
    });

    describe('optimizeLiquidityAllocation', () => {
        it('should optimize liquidity allocation without errors', async () => {
            mockRedisSet.mockResolvedValue('OK');

            await expect(crossChainService.optimizeLiquidityAllocation()).resolves.not.toThrow();
        });

        it('should handle Redis errors during optimization', async () => {
            mockRedisSet.mockRejectedValue(new Error('Redis error'));

            await expect(crossChainService.optimizeLiquidityAllocation()).resolves.not.toThrow();
        });
    });

    describe('getBridgeEstimate', () => {
        it('should return bridge estimate with fee, time, and yield', async () => {
            const estimate = await crossChainService.getBridgeEstimate('1', '137', 1000);

            expect(estimate).toHaveProperty('fee');
            expect(estimate).toHaveProperty('estimatedTime');
            expect(estimate).toHaveProperty('estimatedYield');
            expect(estimate.fee).toBeGreaterThan(0);
            expect(estimate.estimatedTime).toBeGreaterThan(0);
            expect(estimate.estimatedYield).toBeGreaterThanOrEqual(0);
        });

        it('should calculate higher fees for cross-ecosystem bridges', async () => {
            const ethToPolygonEstimate = await crossChainService.getBridgeEstimate('1', '137', 1000);
            const ethToArbitrumEstimate = await crossChainService.getBridgeEstimate('1', '42161', 1000);

            expect(ethToPolygonEstimate.fee).toBeGreaterThan(ethToArbitrumEstimate.fee);
        });

        it('should calculate lower fees for testnets', async () => {
            const mainnetEstimate = await crossChainService.getBridgeEstimate('1', '137', 1000);
            const testnetEstimate = await crossChainService.getBridgeEstimate('11155111', '80001', 1000);

            expect(testnetEstimate.fee).toBeLessThan(mainnetEstimate.fee);
        });
    });
});