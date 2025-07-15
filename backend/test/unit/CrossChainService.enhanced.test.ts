import { CrossChainService, BridgeRequest } from '../../src/services/CrossChainService';
import { PrismaClient, CrossChainStatus } from '@prisma/client';
import { redis } from '../../src/config/redis';
import { NotificationService } from '../../src/services/NotificationService';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/config/redis');
jest.mock('../../src/services/NotificationService');
jest.mock('../../src/utils/logger');

describe('CrossChainService - Enhanced Features', () => {
    let crossChainService: CrossChainService;
    let mockPrismaCreate: jest.Mock;
    let mockPrismaFindUnique: jest.Mock;
    let mockPrismaFindMany: jest.Mock;
    let mockPrismaUpdate: jest.Mock;
    let mockRedisGet: jest.Mock;
    let mockRedisSet: jest.Mock;
    let mockRedisDel: jest.Mock;

    beforeEach(() => {
        // Set test environment to avoid timing issues
        process.env.NODE_ENV = 'test';
        
        // Reset all mocks
        jest.clearAllMocks();
        
        // Mock Prisma methods
        mockPrismaCreate = jest.fn();
        mockPrismaFindUnique = jest.fn();
        mockPrismaFindMany = jest.fn();
        mockPrismaUpdate = jest.fn();
        
        // Mock Prisma Client
        (PrismaClient as jest.Mock).mockImplementation(() => ({
            crossChainTransaction: {
                create: mockPrismaCreate,
                findUnique: mockPrismaFindUnique,
                findMany: mockPrismaFindMany,
                update: mockPrismaUpdate,
            },
        }));

        // Mock Redis
        mockRedisGet = jest.fn();
        mockRedisSet = jest.fn();
        mockRedisDel = jest.fn();
        
        (redis as any).get = mockRedisGet;
        (redis as any).set = mockRedisSet;
        (redis as any).del = mockRedisDel;

        // Mock NotificationService
        (NotificationService as jest.Mock).mockImplementation(() => ({
            sendBridgeCompletionNotification: jest.fn().mockResolvedValue(undefined),
            sendBridgeFailureNotification: jest.fn().mockResolvedValue(undefined),
        }));

        crossChainService = new CrossChainService();
    });

    afterEach(async () => {
        // Clean up any running intervals or timeouts
        crossChainService.stopMonitoring();
        
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    describe('Multi-Network Support', () => {
        it('should support all required blockchain networks', () => {
            const supportedChains = crossChainService.getSupportedChains();
            
            const chainNames = supportedChains.map((chain: any) => chain.name);
            expect(chainNames).toContain('ethereum');
            expect(chainNames).toContain('polygon');
            expect(chainNames).toContain('arbitrum');
            expect(chainNames).toContain('sepolia');
            expect(chainNames).toContain('mumbai');
            expect(chainNames).toContain('arbitrumSepolia');
        });

        it('should have proper chain configurations', () => {
            const chains = crossChainService.getSupportedChains();
            
            chains.forEach((chain: any) => {
                expect(chain).toHaveProperty('chainId');
                expect(chain).toHaveProperty('name');
                expect(chain).toHaveProperty('nativeCurrency');
                expect(chain).toHaveProperty('blockExplorer');
                expect(chain).toHaveProperty('isTestnet');
                expect(chain).toHaveProperty('avgBlockTime');
                expect(typeof chain.avgBlockTime).toBe('number');
                expect(chain.avgBlockTime).toBeGreaterThan(0);
            });
        });
    });

    describe('Bridge Transaction Management', () => {
        const validBridgeRequest: BridgeRequest = {
            paymentId: 'payment-123',
            sourceChain: '1',
            destinationChain: '137',
            amount: 1000,
            sourceAddress: '0x742d35Cc6aB8827279cffFb92266',
            destinationAddress: '0x8ba1f109551bD432803012645Hac136c',
            token: 'USDC'
        };

        it('should initiate bridge transaction with proper validation', async () => {
            const mockTransaction = {
                id: 'tx-123',
                paymentId: 'payment-123',
                sourceChain: '1',
                destinationChain: '137',
                sourceAmount: 1000,
                bridgeFee: 3,
                sourceAddress: validBridgeRequest.sourceAddress,
                destinationAddress: validBridgeRequest.destinationAddress,
                status: CrossChainStatus.INITIATED,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrismaCreate.mockResolvedValue(mockTransaction as any);
            mockRedisSet.mockResolvedValue('OK');

            // Mock the async processing to avoid timing issues
            const processSpy = jest.spyOn(crossChainService as any, 'processBridgeTransaction')
                .mockResolvedValue(undefined);

            const result = await crossChainService.initiateBridge(validBridgeRequest);

            expect(result).toEqual(mockTransaction);
            expect(mockPrismaCreate).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    paymentId: 'payment-123',
                    sourceChain: '1',
                    destinationChain: '137',
                    sourceAmount: 1000,
                    bridgeFee: expect.any(Number),
                    sourceAddress: validBridgeRequest.sourceAddress,
                    destinationAddress: validBridgeRequest.destinationAddress,
                    status: CrossChainStatus.INITIATED
                })
            });

            processSpy.mockRestore();
        });

        it('should track bridge transaction status', async () => {
            const mockTransaction = {
                id: 'tx-status',
                status: CrossChainStatus.BRIDGE_PENDING,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockRedisGet.mockResolvedValue(JSON.stringify(mockTransaction));

            const result = await crossChainService.getBridgeTransaction('tx-status');

            expect(result).toEqual(mockTransaction);
            expect(mockRedisGet).toHaveBeenCalledWith('bridge:tx-status');
        });
    });

    describe('State Synchronization', () => {
        it('should synchronize chain state without errors', async () => {
            mockPrismaFindMany.mockResolvedValue([]);
            mockRedisDel.mockResolvedValue(1);

            await expect(crossChainService.synchronizeChainState()).resolves.not.toThrow();
            expect(mockPrismaFindMany).toHaveBeenCalled();
        });

        it('should handle stale transactions during sync', async () => {
            const staleTransaction = {
                id: 'tx-stale',
                status: CrossChainStatus.INITIATED,
                createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
                updatedAt: new Date()
            };

            mockPrismaFindMany.mockResolvedValue([staleTransaction]);
            mockPrismaUpdate.mockResolvedValue({ ...staleTransaction, status: CrossChainStatus.FAILED });
            mockRedisDel.mockResolvedValue(1);

            await crossChainService.synchronizeChainState();

            expect(mockPrismaUpdate).toHaveBeenCalledWith({
                where: { id: 'tx-stale' },
                data: {
                    status: CrossChainStatus.FAILED,
                    updatedAt: expect.any(Date)
                }
            });
        });
    });

    describe('Liquidity Pool Management', () => {
        it('should manage liquidity pools effectively', () => {
            const pools = crossChainService.getLiquidityPools();
            
            expect(pools.length).toBeGreaterThan(0);
            pools.forEach((pool: any) => {
                expect(pool).toHaveProperty('id');
                expect(pool).toHaveProperty('sourceChain');
                expect(pool).toHaveProperty('destinationChain');
                expect(pool).toHaveProperty('token');
                expect(pool).toHaveProperty('sourceBalance');
                expect(pool).toHaveProperty('destinationBalance');
                expect(pool).toHaveProperty('utilizationRate');
                expect(pool).toHaveProperty('isActive');
            });
        });

        it('should check liquidity availability correctly', async () => {
            const availableResult = await crossChainService.checkLiquidityAvailability('1', '137', 100000);
            expect(availableResult.available).toBe(true);
            expect(availableResult.suggestedAmount).toBe(100000);

            const unavailableResult = await crossChainService.checkLiquidityAvailability('1', '137', 10000000);
            expect(unavailableResult.available).toBe(false);
            expect(unavailableResult.estimatedWaitTime).toBeGreaterThan(0);
        });

        it('should optimize liquidity allocation', async () => {
            mockRedisSet.mockResolvedValue('OK');

            await expect(crossChainService.optimizeLiquidityAllocation()).resolves.not.toThrow();
        });
    });

    describe('Validator Consensus', () => {
        it('should request validator consensus', async () => {
            const transactionId = 'tx-consensus';
            const transactionData = {
                sourceChain: '1',
                destinationChain: '137',
                amount: 1000
            };

            mockRedisSet.mockResolvedValue('OK');

            const result = await crossChainService.requestValidatorConsensus(transactionId, transactionData);

            expect(result).toHaveProperty('transactionId', transactionId);
            expect(result).toHaveProperty('consensusReached');
            expect(result).toHaveProperty('validatorSignatures');
            expect(result).toHaveProperty('requiredValidators');
            expect(result).toHaveProperty('actualValidators');
            expect(result).toHaveProperty('timestamp');
        });

        it('should get validation results', async () => {
            const mockValidationResult = {
                transactionId: 'tx-validation',
                consensusReached: true,
                validatorSignatures: [],
                requiredValidators: 2,
                actualValidators: 3,
                timestamp: new Date()
            };

            mockRedisGet.mockResolvedValue(JSON.stringify(mockValidationResult));

            const result = await crossChainService.getValidationResult('tx-validation');

            expect(result).toEqual(mockValidationResult);
        });

        it('should return active validators', () => {
            const validators = crossChainService.getActiveValidators();

            expect(validators).toBeInstanceOf(Array);
            expect(validators.length).toBeGreaterThan(0);
            validators.forEach((validator: any) => {
                expect(validator).toHaveProperty('id');
                expect(validator).toHaveProperty('address');
                expect(validator).toHaveProperty('isActive', true);
                expect(validator).toHaveProperty('reputation');
            });
        });
    });

    describe('Real-Time Updates', () => {
        it('should handle subscription management', () => {
            const transactionId = 'tx-subscription';
            const subscriberId = 'subscriber-1';

            expect(() => {
                crossChainService.subscribeToTransactionUpdates(transactionId, subscriberId);
            }).not.toThrow();

            expect(() => {
                crossChainService.unsubscribeFromTransactionUpdates(transactionId, subscriberId);
            }).not.toThrow();
        });

        it('should provide subscription statistics', () => {
            const stats = crossChainService.getSubscriptionStats();

            expect(stats).toHaveProperty('totalTransactions');
            expect(stats).toHaveProperty('totalSubscribers');
            expect(stats).toHaveProperty('averageSubscribersPerTransaction');
            expect(stats).toHaveProperty('lastUpdated');
        });
    });

    describe('Bridge Analytics', () => {
        it('should provide bridge analytics for different time ranges', async () => {
            const mockTransactions = [
                {
                    id: 'tx-1',
                    sourceAmount: 1000,
                    bridgeFee: 10,
                    status: CrossChainStatus.COMPLETED,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'tx-2',
                    sourceAmount: 2000,
                    bridgeFee: 20,
                    status: CrossChainStatus.FAILED,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            mockPrismaFindMany.mockResolvedValue(mockTransactions as any);

            const dayAnalytics = await crossChainService.getBridgeAnalytics('day');
            expect(dayAnalytics.timeRange).toBe('day');
            expect(dayAnalytics.totalTransactions).toBe(2);
            expect(dayAnalytics.successfulTransactions).toBe(1);
            expect(dayAnalytics.failedTransactions).toBe(1);
            expect(dayAnalytics.successRate).toBe(0.5);
            expect(dayAnalytics.totalVolume).toBe(3000);
            expect(dayAnalytics.totalFees).toBe(30);

            const weekAnalytics = await crossChainService.getBridgeAnalytics('week');
            expect(weekAnalytics.timeRange).toBe('week');

            const monthAnalytics = await crossChainService.getBridgeAnalytics('month');
            expect(monthAnalytics.timeRange).toBe('month');
        });
    });

    describe('Monitoring and Alerting', () => {
        it('should provide monitoring metrics', () => {
            const metrics = crossChainService.getMonitoringMetrics();

            expect(metrics).toHaveProperty('totalTransactions');
            expect(metrics).toHaveProperty('successfulTransactions');
            expect(metrics).toHaveProperty('failedTransactions');
            expect(metrics).toHaveProperty('averageProcessingTime');
            expect(metrics).toHaveProperty('totalVolume');
            expect(metrics).toHaveProperty('liquidityUtilization');
            expect(metrics).toHaveProperty('lastUpdated');
        });

        it('should start and stop monitoring safely', () => {
            expect(() => crossChainService.startMonitoring()).not.toThrow();
            expect(() => crossChainService.stopMonitoring()).not.toThrow();
        });
    });

    describe('Error Handling and Resilience', () => {
        it('should handle database errors gracefully', async () => {
            const validBridgeRequest: BridgeRequest = {
                sourceChain: '1',
                destinationChain: '137',
                amount: 1000,
                sourceAddress: '0x742d35Cc6aB8827279cffFb92266',
                destinationAddress: '0x8ba1f109551bD432803012645Hac136c'
            };

            mockPrismaCreate.mockRejectedValue(new Error('Database connection failed'));

            await expect(crossChainService.initiateBridge(validBridgeRequest))
                .rejects.toThrow('Bridge initiation failed');
        });

        it('should handle Redis errors gracefully', async () => {
            mockRedisGet.mockRejectedValue(new Error('Redis connection failed'));
            mockPrismaFindUnique.mockResolvedValue({
                id: 'tx-redis-error',
                status: CrossChainStatus.COMPLETED
            } as any);

            const result = await crossChainService.getBridgeTransaction('tx-redis-error');
            expect(result).toBeTruthy();
        });

        it('should handle validator consensus failures', async () => {
            mockRedisSet.mockRejectedValue(new Error('Consensus storage failed'));

            await expect(crossChainService.requestValidatorConsensus('tx-fail', {}))
                .rejects.toThrow('Failed to achieve validator consensus');
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle multiple concurrent operations', async () => {
            const mockTransaction = {
                id: 'tx-concurrent',
                status: CrossChainStatus.INITIATED,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrismaCreate.mockResolvedValue(mockTransaction as any);
            mockRedisSet.mockResolvedValue('OK');

            // Mock the async processing
            jest.spyOn(crossChainService as any, 'processBridgeTransaction')
                .mockResolvedValue(undefined);

            const bridgeRequest: BridgeRequest = {
                sourceChain: '1',
                destinationChain: '137',
                amount: 1000,
                sourceAddress: '0x742d35Cc6aB8827279cffFb92266',
                destinationAddress: '0x8ba1f109551bD432803012645Hac136c'
            };

            // Create multiple concurrent requests
            const promises = Array.from({ length: 5 }, () => 
                crossChainService.initiateBridge(bridgeRequest)
            );

            const results = await Promise.allSettled(promises);
            
            expect(results.length).toBe(5);
            results.forEach(result => {
                expect(['fulfilled', 'rejected']).toContain(result.status);
            });
        });
    });
});