import { CrossChainService } from '../../src/services/CrossChainService';
import { PrismaClient, CrossChainStatus } from '@prisma/client';
import { redis } from '../../src/config/redis';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/config/redis');
jest.mock('../../src/utils/logger');

describe('CrossChainService - Integration Tests', () => {
    let crossChainService: CrossChainService;
    let mockPrisma: any;

    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        jest.clearAllMocks();
        
        mockPrisma = {
            crossChainTransaction: {
                create: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
            },
        };

        (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

        (redis as any).get = jest.fn();
        (redis as any).set = jest.fn();
        (redis as any).del = jest.fn();

        crossChainService = new CrossChainService();
    });

    afterEach(async () => {
        crossChainService.stopMonitoring();
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    describe('Complete Bridge Transaction Flow', () => {
        it('should handle complete bridge transaction lifecycle', async () => {
            // Step 1: Initiate bridge transaction
            const mockTransaction = {
                id: 'bridge-tx-integration-123',
                sourceChain: '1',
                destinationChain: '137',
                sourceAmount: '1000',
                destinationAmount: '999',
                token: 'USDC',
                senderAddress: '0x123',
                recipientAddress: '0x456',
                sourceAddress: '0x123',
                destinationAddress: '0x456',
                bridgeFee: '1',
                estimatedYield: '0.1',
                status: CrossChainStatus.INITIATED,
                paymentId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Mock liquidity check
            jest.spyOn(crossChainService, 'checkLiquidityAvailability').mockResolvedValue({
                available: true,
                reason: 'Sufficient liquidity available',
                suggestedAmount: 1000,
                estimatedWaitTime: 0
            });

            mockPrisma.crossChainTransaction.create.mockResolvedValue(mockTransaction);
            (redis as any).set.mockResolvedValue('OK');

            // Initiate transaction
            const initiatedTransaction = await crossChainService.initiateBridgeTransaction(
                '1',
                '137',
                1000,
                'USDC',
                '0x456',
                '0x123',
                'payment-123'
            );

            expect(initiatedTransaction.status).toBe(CrossChainStatus.INITIATED);
            expect(initiatedTransaction.sourceAmount).toBe('1000');

            // Step 2: Process bridge transaction
            mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(mockTransaction);
            
            // Mock successful validator consensus
            jest.spyOn(crossChainService, 'requestValidatorConsensus').mockResolvedValue({
                transactionId: 'bridge-tx-integration-123',
                consensusReached: true,
                validatorSignatures: [
                    { validatorId: 'val-1', signature: '0x123', timestamp: new Date() },
                    { validatorId: 'val-2', signature: '0x456', timestamp: new Date() },
                    { validatorId: 'val-3', signature: '0x789', timestamp: new Date() }
                ],
                requiredValidators: 3,
                actualValidators: 3,
                timestamp: new Date()
            });

            // Mock transaction updates
            mockPrisma.crossChainTransaction.update.mockImplementation(({ data }: any) => {
                return Promise.resolve({
                    ...mockTransaction,
                    ...data,
                    updatedAt: new Date()
                });
            });

            // Process the transaction
            await crossChainService.processBridgeTransaction('bridge-tx-integration-123');

            // Verify transaction was processed through all stages
            expect(mockPrisma.crossChainTransaction.update).toHaveBeenCalledWith({
                where: { id: 'bridge-tx-integration-123' },
                data: expect.objectContaining({
                    status: CrossChainStatus.BRIDGE_PENDING
                })
            });

            expect(mockPrisma.crossChainTransaction.update).toHaveBeenCalledWith({
                where: { id: 'bridge-tx-integration-123' },
                data: expect.objectContaining({
                    status: CrossChainStatus.SOURCE_CONFIRMED
                })
            });

            expect(mockPrisma.crossChainTransaction.update).toHaveBeenCalledWith({
                where: { id: 'bridge-tx-integration-123' },
                data: expect.objectContaining({
                    status: CrossChainStatus.COMPLETED
                })
            });

            // Step 3: Verify final state
            const completedTransaction = {
                ...mockTransaction,
                status: CrossChainStatus.COMPLETED,
                actualYield: '0.137',
                completedAt: new Date()
            };

            mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(completedTransaction);
            (redis as any).get.mockResolvedValue(JSON.stringify(completedTransaction));

            const finalTransaction = await crossChainService.getBridgeTransaction('bridge-tx-integration-123');
            expect(finalTransaction?.status).toBe(CrossChainStatus.COMPLETED);
        });

        it('should handle bridge transaction failure with proper cleanup', async () => {
            const mockTransaction = {
                id: 'bridge-tx-fail-123',
                sourceChain: '1',
                destinationChain: '137',
                sourceAmount: '1000',
                status: CrossChainStatus.INITIATED,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(mockTransaction);

            // Mock validator consensus failure
            jest.spyOn(crossChainService, 'requestValidatorConsensus').mockResolvedValue({
                transactionId: 'bridge-tx-fail-123',
                consensusReached: false,
                validatorSignatures: [],
                requiredValidators: 3,
                actualValidators: 1,
                timestamp: new Date()
            });

            mockPrisma.crossChainTransaction.update.mockResolvedValue({
                ...mockTransaction,
                status: CrossChainStatus.FAILED
            });

            // Process should fail
            await expect(
                crossChainService.processBridgeTransaction('bridge-tx-fail-123')
            ).rejects.toThrow('Validator consensus not reached');

            // Verify transaction was marked as failed
            expect(mockPrisma.crossChainTransaction.update).toHaveBeenCalledWith({
                where: { id: 'bridge-tx-fail-123' },
                data: expect.objectContaining({
                    status: CrossChainStatus.FAILED
                })
            });
        });

        it('should handle real-time updates throughout transaction lifecycle', async () => {
            const transactionId = 'bridge-tx-realtime-123';
            const subscriberId = 'subscriber-123';

            // Subscribe to updates
            crossChainService.subscribeToTransactionUpdates(transactionId, subscriberId);

            // Verify subscription
            const stats = crossChainService.getSubscriptionStats();
            expect(stats.totalTransactions).toBe(1);
            expect(stats.totalSubscribers).toBe(1);

            // Get transaction history (should include updates)
            const mockTransaction = {
                id: transactionId,
                sourceChain: '1',
                destinationChain: '137',
                status: CrossChainStatus.COMPLETED,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(mockTransaction);

            const history = await crossChainService.getTransactionHistory(transactionId);
            expect(history.transaction).toEqual(mockTransaction);
            expect(history.subscriberCount).toBe(1);

            // Unsubscribe
            crossChainService.unsubscribeFromTransactionUpdates(transactionId, subscriberId);

            const finalStats = crossChainService.getSubscriptionStats();
            expect(finalStats.totalTransactions).toBe(0);
            expect(finalStats.totalSubscribers).toBe(0);
        });

        it('should provide comprehensive bridge analytics', async () => {
            const mockTransactions = [
                {
                    id: 'tx-1',
                    sourceAmount: 1000,
                    bridgeFee: 10,
                    status: CrossChainStatus.COMPLETED,
                    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
                },
                {
                    id: 'tx-2',
                    sourceAmount: 2000,
                    bridgeFee: 20,
                    status: CrossChainStatus.COMPLETED,
                    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
                },
                {
                    id: 'tx-3',
                    sourceAmount: 500,
                    bridgeFee: 5,
                    status: CrossChainStatus.FAILED,
                    createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
                }
            ];

            mockPrisma.crossChainTransaction.findMany.mockResolvedValue(mockTransactions);

            const analytics = await crossChainService.getBridgeAnalytics('day');

            expect(analytics.totalTransactions).toBe(3);
            expect(analytics.successfulTransactions).toBe(2);
            expect(analytics.failedTransactions).toBe(1);
            expect(analytics.successRate).toBeCloseTo(0.667, 3);
            expect(analytics.totalVolume).toBe(3500);
            expect(analytics.totalFees).toBe(35);
        });

        it('should handle liquidity management and optimization', async () => {
            // Test liquidity availability check
            const liquidityCheck = await crossChainService.checkLiquidityAvailability('1', '137', 100000);
            expect(liquidityCheck.available).toBe(true);
            expect(liquidityCheck.suggestedAmount).toBe(100000);

            // Test insufficient liquidity
            const insufficientCheck = await crossChainService.checkLiquidityAvailability('1', '137', 2000000);
            expect(insufficientCheck.available).toBe(false);
            expect(insufficientCheck.reason).toBe('Insufficient liquidity');

            // Test liquidity optimization
            await expect(crossChainService.optimizeLiquidityAllocation()).resolves.not.toThrow();

            // Test getting liquidity pools
            const pools = crossChainService.getLiquidityPools();
            expect(pools.length).toBeGreaterThan(0);
            expect(pools[0]).toHaveProperty('id');
            expect(pools[0]).toHaveProperty('sourceBalance');
            expect(pools[0]).toHaveProperty('destinationBalance');
        });

        it('should handle monitoring and health checks', async () => {
            // Start monitoring
            crossChainService.startMonitoring();

            // Get initial metrics
            const initialMetrics = crossChainService.getMonitoringMetrics();
            expect(initialMetrics).toHaveProperty('totalTransactions');
            expect(initialMetrics).toHaveProperty('successfulTransactions');
            expect(initialMetrics).toHaveProperty('failedTransactions');

            // Record some transactions
            const monitoring = (crossChainService as any).monitoring;
            monitoring.recordTransaction(true, 5000, 1000);
            monitoring.recordTransaction(true, 3000, 2000);
            monitoring.recordTransaction(false, 10000, 500);

            const updatedMetrics = crossChainService.getMonitoringMetrics();
            expect(updatedMetrics.totalTransactions).toBe(3);
            expect(updatedMetrics.successfulTransactions).toBe(2);
            expect(updatedMetrics.failedTransactions).toBe(1);

            // Stop monitoring
            crossChainService.stopMonitoring();
        });

        it('should handle validator consensus properly', async () => {
            const validators = crossChainService.getActiveValidators();
            expect(validators.length).toBeGreaterThan(0);
            expect(validators[0]).toHaveProperty('id');
            expect(validators[0]).toHaveProperty('address');
            expect(validators[0]).toHaveProperty('isActive', true);

            // Test consensus request
            const consensusResult = await crossChainService.requestValidatorConsensus('test-tx-123', {
                sourceChain: '1',
                destinationChain: '137',
                amount: 1000
            });

            expect(consensusResult.transactionId).toBe('test-tx-123');
            expect(consensusResult).toHaveProperty('consensusReached');
            expect(consensusResult).toHaveProperty('validatorSignatures');
            expect(consensusResult).toHaveProperty('requiredValidators');
            expect(consensusResult).toHaveProperty('actualValidators');

            // Test getting validation result
            // Mock Redis to return the cached validation result
            (redis as any).get.mockResolvedValue(JSON.stringify(consensusResult));
            
            const validationResult = await crossChainService.getValidationResult('test-tx-123');
            expect(validationResult).toBeTruthy();
            expect(validationResult?.transactionId).toBe('test-tx-123');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle network failures gracefully', async () => {
            // Mock network failure
            mockPrisma.crossChainTransaction.create.mockRejectedValue(new Error('Network timeout'));

            // Mock liquidity check to pass
            jest.spyOn(crossChainService, 'checkLiquidityAvailability').mockResolvedValue({
                available: true,
                reason: 'Sufficient liquidity available',
                suggestedAmount: 1000,
                estimatedWaitTime: 0
            });

            await expect(
                crossChainService.initiateBridgeTransaction('1', '137', 1000, 'USDC', '0x456', '0x123')
            ).rejects.toThrow('Network timeout');
        });

        it('should handle invalid chain combinations', async () => {
            const estimate = await crossChainService.getBridgeEstimate('999', '888', 1000);
            expect(estimate.estimatedTime).toBe(300000); // Default fallback time

            const liquidityCheck = await crossChainService.checkLiquidityAvailability('999', '888', 1000);
            expect(liquidityCheck.available).toBe(false);
            expect(liquidityCheck.reason).toBe('No active liquidity pool found');
        });

        it('should handle concurrent transaction processing', async () => {
            const transactionIds = ['tx-1', 'tx-2', 'tx-3'];
            const mockTransaction = {
                id: 'concurrent-tx',
                sourceChain: '1',
                destinationChain: '137',
                status: CrossChainStatus.INITIATED,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(mockTransaction);
            mockPrisma.crossChainTransaction.update.mockResolvedValue({
                ...mockTransaction,
                status: CrossChainStatus.COMPLETED
            });

            // Mock successful consensus for all
            jest.spyOn(crossChainService, 'requestValidatorConsensus').mockResolvedValue({
                transactionId: 'concurrent-tx',
                consensusReached: true,
                validatorSignatures: [],
                requiredValidators: 3,
                actualValidators: 3,
                timestamp: new Date()
            });

            // Process multiple transactions concurrently
            const promises = transactionIds.map(id => 
                crossChainService.processBridgeTransaction(id)
            );

            await expect(Promise.all(promises)).resolves.not.toThrow();
        });
    });
});