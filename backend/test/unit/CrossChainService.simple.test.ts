import { CrossChainService } from '../../src/services/CrossChainService';
import { PrismaClient } from '@prisma/client';
import { redis } from '../../src/config/redis';
import { NotificationService } from '../../src/services/NotificationService';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/config/redis');
jest.mock('../../src/services/NotificationService');
jest.mock('../../src/utils/logger');

describe('CrossChainService - Simple Test', () => {
    let crossChainService: CrossChainService;

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
        (redis as any).get = jest.fn();
        (redis as any).set = jest.fn();
        (redis as any).del = jest.fn();

        // Mock NotificationService
        (NotificationService as jest.Mock).mockImplementation(() => ({
            sendBridgeCompletionNotification: jest.fn().mockResolvedValue(undefined),
            sendBridgeFailureNotification: jest.fn().mockResolvedValue(undefined),
        }));

        crossChainService = new CrossChainService();
    });

    afterEach(async () => {
        crossChainService.stopMonitoring();
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    describe('Basic Functionality', () => {
        it('should initialize successfully', () => {
            expect(crossChainService).toBeDefined();
        });

        it('should return supported chains', () => {
            const chains = crossChainService.getSupportedChains();
            expect(Array.isArray(chains)).toBe(true);
            expect(chains.length).toBeGreaterThan(0);
        });

        it('should return liquidity pools', () => {
            const pools = crossChainService.getLiquidityPools();
            expect(Array.isArray(pools)).toBe(true);
            expect(pools.length).toBeGreaterThan(0);
        });

        it('should estimate bridge time', () => {
            const time = crossChainService.estimateBridgeTime('1', '137');
            expect(typeof time).toBe('number');
            expect(time).toBeGreaterThan(0);
        });

        it('should get monitoring metrics', () => {
            const metrics = crossChainService.getMonitoringMetrics();
            expect(metrics).toHaveProperty('totalTransactions');
            expect(metrics).toHaveProperty('successfulTransactions');
            expect(metrics).toHaveProperty('failedTransactions');
        });

        it('should start and stop monitoring', () => {
            expect(() => crossChainService.startMonitoring()).not.toThrow();
            expect(() => crossChainService.stopMonitoring()).not.toThrow();
        });
    });
});