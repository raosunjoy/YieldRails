import { CrossChainService } from '../../src/services/CrossChainService';
import { PrismaClient, CrossChainStatus } from '@prisma/client';
import { redis } from '../../src/config/redis';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/config/redis');
jest.mock('../../src/utils/logger');

describe('CrossChainService - Bridge Transaction Management', () => {
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

    describe('initiateBridgeTransaction', () => {
        it('should successfully initiate a bridge transaction', async () => {
            const mockTransaction = {
                id: 'bridge-tx-123',
                sourceChain: '1',
                destinationChain: '137',
                sourceAmount: '1000',
                destinationAmount: '999',
                token: 'USDC',
                senderAddress: '0x123',
                recipientAddress: '0x456',
                bridgeFee: '1',
                estimatedYield: '0.1',
                status: CrossChainStatus.INITIATED,
                paymentId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Mock liquidity check to return available
            jest.spyOn(crossChainService, 'checkLiquidityAvailability').mockResolvedValue({
                available: true,
                reason: 'Sufficient liquidity available',
                suggestedAmount: 1000,
                estimatedWaitTime: 0
            });

            mockPrisma.crossChainTransaction.create.mockResolvedValue(mockTransaction);
            (redis as any).set.mockResolvedValue('OK');

            const result = await crossChainService.initiateBridgeTransaction(
                '1',
                '137',
                1000,
                'USDC',
                '0x456',
                '0x123',
                'payment-123'
            );

            expect(result).toEqual(mockTransaction);
            expect(mockPrisma.crossChainTransaction.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    sourceChain: '1',
                    destinationChain: '137',
                    sourceAmount: '1000',
                    token: 'USDC',
                    senderAddress: '0x123',
                    recipientAddress: '0x456',
                    status: CrossChainStatus.INITIATED,
                    paymentId: 'payment-123'
                })
            });
            expect(redis.set).toHaveBeenCalledWith(
                `bridge:${mockTransaction.id}`,
                JSON.stringify(mockTransaction),
                3600
            );
        });

        it('should throw error when liquidity is insufficient', async () => {
            // Mock insufficient liquidity
            jest.spyOn(crossChainService, 'checkLiquidityAvailability').mockResolvedValue({
                available: false,
                reason: 'Insufficient liquidity',
                suggestedAmount: 500,
                estimatedWaitTime: 600000
            });

            await expect(
                crossChainService.initiateBridgeTransaction(
                    '1',
                    '137',
                    2000000, // Large amount
                    'USDC',
                    '0x456',
                    '0x123'
                )
            ).rejects.toThrow('Insufficient liquidity: Insufficient liquidity');
        });

        it('should handle database errors gracefully', async () => {
            // Mock liquidity check to pass first
            jest.spyOn(crossChainService, 'checkLiquidityAvailability').mockResolvedValue({
                available: true,
                reason: 'Sufficient liquidity available',
                suggestedAmount: 1000,
                estimatedWaitTime: 0
            });

            mockPrisma.crossChainTransaction.create.mockRejectedValue(new Error('Database error'));

            await expect(
                crossChainService.initiateBridgeTransaction(
                    '1',
                    '137',
                    1000,
                    'USDC',
                    '0x456',
                    '0x123'
                )
            ).rejects.toThrow('Database error');
        });
    });

    describe('processBridgeTransaction', () => {
        const mockTransaction = {
            id: 'bridge-tx-123',
            sourceChain: '1',
            destinationChain: '137',
            sourceAmount: '1000',
            destinationAmount: '999',
            token: 'USDC',
            senderAddress: '0x123',
            recipientAddress: '0x456',
            bridgeFee: '1',
            estimatedYield: '0.1',
            status: CrossChainStatus.INITIATED,
            paymentId: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        it('should successfully process a bridge transaction', async () => {
            mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(mockTransaction);
            mockPrisma.crossChainTransaction.update.mockResolvedValue({
                ...mockTransaction,
                status: CrossChainStatus.COMPLETED
            });

            // Mock validator consensus success
            jest.spyOn(crossChainService, 'requestValidatorConsensus').mockResolvedValue({
                transactionId: 'bridge-tx-123',
                consensusReached: true,
                validatorSignatures: [
                    { validatorId: 'val-1', signature: '0x123', timestamp: new Date() },
                    { validatorId: 'val-2', signature: '0x456', timestamp: new Date() }
                ],
                requiredValidators: 2,
                actualValidators: 2,
                timestamp: new Date()
            });

            await crossChainService.processBridgeTransaction('bridge-tx-123');

            expect(mockPrisma.crossChainTransaction.update).toHaveBeenCalledWith({
                where: { id: 'bridge-tx-123' },
                data: expect.objectContaining({
                    status: CrossChainStatus.COMPLETED
                })
            });
        });

        it('should fail when validator consensus is not reached', async () => {
            mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(mockTransaction);
            mockPrisma.crossChainTransaction.update.mockResolvedValue({
                ...mockTransaction,
                status: CrossChainStatus.FAILED
            });

            // Mock validator consensus failure
            jest.spyOn(crossChainService, 'requestValidatorConsensus').mockResolvedValue({
                transactionId: 'bridge-tx-123',
                consensusReached: false,
                validatorSignatures: [],
                requiredValidators: 3,
                actualValidators: 1,
                timestamp: new Date()
            });

            await expect(
                crossChainService.processBridgeTransaction('bridge-tx-123')
            ).rejects.toThrow('Validator consensus not reached');

            expect(mockPrisma.crossChainTransaction.update).toHaveBeenCalledWith({
                where: { id: 'bridge-tx-123' },
                data: expect.objectContaining({
                    status: CrossChainStatus.FAILED
                })
            });
        });

        it('should throw error when transaction not found', async () => {
            mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(null);

            await expect(
                crossChainService.processBridgeTransaction('non-existent-tx')
            ).rejects.toThrow('Transaction not found');
        });
    });

    describe('updateTransactionStatus', () => {
        it('should update transaction status in database and cache', async () => {
            const mockTransaction = {
                id: 'bridge-tx-123',
                status: CrossChainStatus.INITIATED,
                updatedAt: new Date()
            };

            mockPrisma.crossChainTransaction.update.mockResolvedValue({
                ...mockTransaction,
                status: CrossChainStatus.BRIDGE_PENDING
            });
            (redis as any).get.mockResolvedValue(JSON.stringify(mockTransaction));
            (redis as any).set.mockResolvedValue('OK');

            await crossChainService.updateTransactionStatus('bridge-tx-123', CrossChainStatus.BRIDGE_PENDING);

            expect(mockPrisma.crossChainTransaction.update).toHaveBeenCalledWith({
                where: { id: 'bridge-tx-123' },
                data: {
                    status: CrossChainStatus.BRIDGE_PENDING,
                    updatedAt: expect.any(Date)
                }
            });

            expect(redis.set).toHaveBeenCalledWith(
                'bridge:bridge-tx-123',
                expect.stringContaining('"status":"BRIDGE_PENDING"'),
                3600
            );
        });

        it('should handle cache miss gracefully', async () => {
            mockPrisma.crossChainTransaction.update.mockResolvedValue({
                id: 'bridge-tx-123',
                status: CrossChainStatus.BRIDGE_PENDING
            });
            (redis as any).get.mockResolvedValue(null);

            await expect(
                crossChainService.updateTransactionStatus('bridge-tx-123', CrossChainStatus.BRIDGE_PENDING)
            ).resolves.not.toThrow();
        });
    });

    describe('getBridgeTransaction', () => {
        const mockTransaction = {
            id: 'bridge-tx-123',
            sourceChain: '1',
            destinationChain: '137',
            status: CrossChainStatus.INITIATED
        };

        it('should return transaction from cache if available', async () => {
            (redis as any).get.mockResolvedValue(JSON.stringify(mockTransaction));

            const result = await crossChainService.getBridgeTransaction('bridge-tx-123');

            expect(result).toEqual(mockTransaction);
            expect(redis.get).toHaveBeenCalledWith('bridge:bridge-tx-123');
            expect(mockPrisma.crossChainTransaction.findUnique).not.toHaveBeenCalled();
        });

        it('should fallback to database when cache miss', async () => {
            (redis as any).get.mockResolvedValue(null);
            mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(mockTransaction);
            (redis as any).set.mockResolvedValue('OK');

            const result = await crossChainService.getBridgeTransaction('bridge-tx-123');

            expect(result).toEqual(mockTransaction);
            expect(mockPrisma.crossChainTransaction.findUnique).toHaveBeenCalledWith({
                where: { id: 'bridge-tx-123' }
            });
            expect(redis.set).toHaveBeenCalledWith(
                'bridge:bridge-tx-123',
                JSON.stringify(mockTransaction),
                3600
            );
        });

        it('should return null when transaction not found', async () => {
            (redis as any).get.mockResolvedValue(null);
            mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(null);

            const result = await crossChainService.getBridgeTransaction('non-existent-tx');

            expect(result).toBeNull();
        });
    });

    describe('getUserBridgeTransactions', () => {
        it('should return user bridge transactions with pagination', async () => {
            const mockTransactions = [
                { id: 'tx-1', senderAddress: '0x123', createdAt: new Date() },
                { id: 'tx-2', senderAddress: '0x123', createdAt: new Date() }
            ];

            mockPrisma.crossChainTransaction.findMany.mockResolvedValue(mockTransactions);

            const result = await crossChainService.getUserBridgeTransactions('0x123', 10, 0);

            expect(result).toEqual(mockTransactions);
            expect(mockPrisma.crossChainTransaction.findMany).toHaveBeenCalledWith({
                where: { senderAddress: '0x123' },
                orderBy: { createdAt: 'desc' },
                take: 10,
                skip: 0
            });
        });

        it('should handle database errors gracefully', async () => {
            mockPrisma.crossChainTransaction.findMany.mockRejectedValue(new Error('Database error'));

            const result = await crossChainService.getUserBridgeTransactions('0x123');

            expect(result).toEqual([]);
        });
    });

    describe('cancelBridgeTransaction', () => {
        it('should cancel transaction in early stages', async () => {
            const mockTransaction = {
                id: 'bridge-tx-123',
                status: CrossChainStatus.INITIATED
            };

            jest.spyOn(crossChainService, 'getBridgeTransaction').mockResolvedValue(mockTransaction as any);
            jest.spyOn(crossChainService, 'updateTransactionStatus').mockResolvedValue();

            const result = await crossChainService.cancelBridgeTransaction('bridge-tx-123');

            expect(result).toBe(true);
            expect(crossChainService.updateTransactionStatus).toHaveBeenCalledWith(
                'bridge-tx-123',
                CrossChainStatus.FAILED
            );
        });

        it('should not cancel transaction in advanced stages', async () => {
            const mockTransaction = {
                id: 'bridge-tx-123',
                status: CrossChainStatus.COMPLETED
            };

            jest.spyOn(crossChainService, 'getBridgeTransaction').mockResolvedValue(mockTransaction as any);

            const result = await crossChainService.cancelBridgeTransaction('bridge-tx-123');

            expect(result).toBe(false);
        });

        it('should return false for non-existent transaction', async () => {
            jest.spyOn(crossChainService, 'getBridgeTransaction').mockResolvedValue(null);

            const result = await crossChainService.cancelBridgeTransaction('non-existent-tx');

            expect(result).toBe(false);
        });
    });

    describe('retryBridgeTransaction', () => {
        it('should retry failed transaction', async () => {
            const mockTransaction = {
                id: 'bridge-tx-123',
                status: CrossChainStatus.FAILED
            };

            jest.spyOn(crossChainService, 'getBridgeTransaction').mockResolvedValue(mockTransaction as any);
            jest.spyOn(crossChainService, 'updateTransactionStatus').mockResolvedValue();
            jest.spyOn(crossChainService, 'processBridgeTransaction').mockResolvedValue();

            const result = await crossChainService.retryBridgeTransaction('bridge-tx-123');

            expect(result).toBe(true);
            expect(crossChainService.updateTransactionStatus).toHaveBeenCalledWith(
                'bridge-tx-123',
                CrossChainStatus.INITIATED
            );
            expect(crossChainService.processBridgeTransaction).toHaveBeenCalledWith('bridge-tx-123');
        });

        it('should not retry non-failed transaction', async () => {
            const mockTransaction = {
                id: 'bridge-tx-123',
                status: CrossChainStatus.COMPLETED
            };

            jest.spyOn(crossChainService, 'getBridgeTransaction').mockResolvedValue(mockTransaction as any);

            const result = await crossChainService.retryBridgeTransaction('bridge-tx-123');

            expect(result).toBe(false);
        });
    });

    describe('getBridgeStatus', () => {
        it('should return comprehensive bridge status', async () => {
            const mockTransaction = {
                id: 'bridge-tx-123',
                status: CrossChainStatus.BRIDGE_PENDING,
                createdAt: new Date(),
                sourceChain: '1',
                destinationChain: '137'
            };

            const mockValidation = {
                transactionId: 'bridge-tx-123',
                consensusReached: true,
                validatorSignatures: [],
                requiredValidators: 3,
                actualValidators: 3,
                timestamp: new Date()
            };

            const mockHistory = {
                transaction: mockTransaction,
                updates: [],
                lastUpdated: new Date(),
                subscriberCount: 0
            };

            jest.spyOn(crossChainService, 'getBridgeTransaction').mockResolvedValue(mockTransaction as any);
            jest.spyOn(crossChainService, 'getValidationResult').mockResolvedValue(mockValidation);
            jest.spyOn(crossChainService, 'getTransactionHistory').mockResolvedValue(mockHistory as any);

            const result = await crossChainService.getBridgeStatus('bridge-tx-123');

            expect(result).toEqual({
                transaction: mockTransaction,
                validation: mockValidation,
                history: mockHistory,
                estimatedCompletion: expect.any(Date),
                canCancel: true,
                canRetry: false
            });
        });

        it('should return null for non-existent transaction', async () => {
            jest.spyOn(crossChainService, 'getBridgeTransaction').mockResolvedValue(null);

            const result = await crossChainService.getBridgeStatus('non-existent-tx');

            expect(result).toBeNull();
        });
    });

    describe('Yield Calculation', () => {
        it('should calculate transit yield correctly', () => {
            const amount = 1000;
            const transitTimeMs = 24 * 60 * 60 * 1000; // 1 day
            
            // Access private method for testing
            const calculateTransitYield = (crossChainService as any).calculateTransitYield;
            const yieldAmount = calculateTransitYield(amount, transitTimeMs);
            
            // Expected: 1000 * 0.05 * (1/365) ≈ 0.137
            expect(yieldAmount).toBeCloseTo(0.137, 3);
        });

        it('should handle zero transit time', () => {
            const amount = 1000;
            const transitTimeMs = 0;
            
            const calculateTransitYield = (crossChainService as any).calculateTransitYield;
            const yieldAmount = calculateTransitYield(amount, transitTimeMs);
            
            expect(yieldAmount).toBe(0);
        });
    });

    describe('Liquidity Pool Updates', () => {
        it('should update liquidity pools after transaction', async () => {
            // Mock the getLiquidityPool method to return a pool
            jest.spyOn(crossChainService, 'getLiquidityPool').mockReturnValue({
                id: 'usdc-eth-polygon',
                sourceChain: '1',
                destinationChain: '137',
                token: 'USDC',
                sourceBalance: 1000000,
                destinationBalance: 1000000,
                utilizationRate: 0.3,
                rebalanceThreshold: 0.8,
                minLiquidity: 100000,
                maxLiquidity: 5000000,
                isActive: true
            });

            // Call the private method with correct context
            const updateLiquidityPools = (crossChainService as any).updateLiquidityPools.bind(crossChainService);

            await expect(
                updateLiquidityPools('1', '137', 10000, 'USDC')
            ).resolves.not.toThrow();
        });
    });
});