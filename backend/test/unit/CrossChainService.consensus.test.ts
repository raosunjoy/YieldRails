import { CrossChainService, BridgeRequest } from '../../src/services/CrossChainService';
import { PrismaClient, CrossChainStatus } from '@prisma/client';
import { redis } from '../../src/config/redis';
import { NotificationService } from '../../src/services/NotificationService';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/config/redis');
jest.mock('../../src/services/NotificationService');
jest.mock('../../src/utils/logger');

describe('CrossChainService - Validator Consensus', () => {
    let crossChainService: CrossChainService;
    let mockPrismaCreate: jest.Mock;
    let mockPrismaFindUnique: jest.Mock;
    let mockPrismaUpdate: jest.Mock;
    let mockRedisGet: jest.Mock;
    let mockRedisSet: jest.Mock;

    beforeEach(() => {
        // Set test environment
        process.env.NODE_ENV = 'test';
        
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock Prisma methods
        mockPrismaCreate = jest.fn();
        mockPrismaFindUnique = jest.fn();
        mockPrismaUpdate = jest.fn();
        
        // Mock Prisma Client
        (PrismaClient as jest.Mock).mockImplementation(() => ({
            crossChainTransaction: {
                create: mockPrismaCreate,
                findUnique: mockPrismaFindUnique,
                findMany: jest.fn(),
                update: mockPrismaUpdate,
            },
        }));

        // Mock Redis
        mockRedisGet = jest.fn();
        mockRedisSet = jest.fn();
        
        (redis as any).get = mockRedisGet;
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

    describe('requestValidatorConsensus', () => {
        it('should request validator consensus for transaction', async () => {
            const transactionId = 'tx-123';
            const transactionData = {
                sourceChain: '1',
                destinationChain: '137',
                amount: 1000,
                sourceAddress: '0x742d35Cc6aB8827279cffFb92266',
                destinationAddress: '0x8ba1f109551bD432803012645Hac136c'
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

        it('should achieve consensus with sufficient validators', async () => {
            mockRedisSet.mockResolvedValue('OK');

            const result = await crossChainService.requestValidatorConsensus('tx-123', {});

            expect(result.consensusReached).toBe(true);
            expect(result.actualValidators).toBeGreaterThanOrEqual(result.requiredValidators);
        });

        it('should handle validator consensus failure', async () => {
            mockRedisSet.mockRejectedValue(new Error('Redis error'));

            await expect(crossChainService.requestValidatorConsensus('tx-123', {}))
                .rejects.toThrow('Failed to achieve validator consensus');
        });
    });

    describe('getValidationResult', () => {
        it('should return cached validation result', async () => {
            const mockValidationResult = {
                transactionId: 'tx-123',
                consensusReached: true,
                validatorSignatures: [],
                requiredValidators: 2,
                actualValidators: 3,
                timestamp: new Date()
            };

            mockRedisGet.mockResolvedValue(JSON.stringify(mockValidationResult));

            const result = await crossChainService.getValidationResult('tx-123');

            expect(result).toEqual(mockValidationResult);
            expect(mockRedisGet).toHaveBeenCalledWith('validation:tx-123');
        });

        it('should return null if validation result not found', async () => {
            mockRedisGet.mockResolvedValue(null);

            const result = await crossChainService.getValidationResult('nonexistent');

            expect(result).toBeNull();
        });

        it('should handle Redis errors gracefully', async () => {
            mockRedisGet.mockRejectedValue(new Error('Redis error'));

            const result = await crossChainService.getValidationResult('tx-123');

            expect(result).toBeNull();
        });
    });

    describe('getActiveValidators', () => {
        it('should return list of active validators', () => {
            const validators = crossChainService.getActiveValidators();

            expect(validators).toBeInstanceOf(Array);
            expect(validators.length).toBeGreaterThan(0);
            expect(validators[0]).toHaveProperty('id');
            expect(validators[0]).toHaveProperty('address');
            expect(validators[0]).toHaveProperty('isActive', true);
            expect(validators[0]).toHaveProperty('reputation');
        });

        it('should only return active validators', () => {
            const validators = crossChainService.getActiveValidators();

            validators.forEach(validator => {
                expect(validator.isActive).toBe(true);
            });
        });
    });

    describe('initiateBridgeWithConsensus', () => {
        it('should initiate bridge with validator consensus', async () => {
            const mockTransaction = {
                id: 'tx-123',
                paymentId: 'payment-123',
                sourceChain: '1',
                destinationChain: '137',
                sourceAmount: 1000,
                bridgeFee: 3,
                sourceAddress: '0x742d35Cc6aB8827279cffFb92266',
                destinationAddress: '0x8ba1f109551bD432803012645Hac136c',
                status: CrossChainStatus.INITIATED,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrismaCreate.mockResolvedValue(mockTransaction as any);
            mockPrismaFindUnique.mockResolvedValue(mockTransaction as any);
            mockPrismaUpdate.mockResolvedValue(mockTransaction as any);
            mockRedisSet.mockResolvedValue('OK');

            const bridgeRequest: BridgeRequest = {
                paymentId: 'payment-123',
                sourceChain: '1',
                destinationChain: '137',
                amount: 1000,
                sourceAddress: '0x742d35Cc6aB8827279cffFb92266',
                destinationAddress: '0x8ba1f109551bD432803012645Hac136c'
            };

            // Mock the async processing to avoid timing issues
            jest.spyOn(crossChainService as any, 'processBridgeTransactionWithConsensus')
                .mockResolvedValue(undefined);

            const result = await crossChainService.initiateBridgeWithConsensus(bridgeRequest);

            expect(result).toBeTruthy();
            expect(result.id).toBe('tx-123');
            expect(mockPrismaCreate).toHaveBeenCalled();
        });

        it('should handle consensus failure during bridge initiation', async () => {
            const bridgeRequest: BridgeRequest = {
                sourceChain: '1',
                destinationChain: '137',
                amount: 1000,
                sourceAddress: '0x742d35Cc6aB8827279cffFb92266',
                destinationAddress: '0x8ba1f109551bD432803012645Hac136c'
            };

            mockPrismaCreate.mockRejectedValue(new Error('Consensus failed'));

            await expect(crossChainService.initiateBridgeWithConsensus(bridgeRequest))
                .rejects.toThrow('Bridge initiation failed');
        });

        it('should validate bridge request before consensus', async () => {
            const invalidRequest: BridgeRequest = {
                sourceChain: 'invalid',
                destinationChain: '137',
                amount: 1000,
                sourceAddress: '0x742d35Cc6aB8827279cffFb92266',
                destinationAddress: '0x8ba1f109551bD432803012645Hac136c'
            };

            await expect(crossChainService.initiateBridgeWithConsensus(invalidRequest))
                .rejects.toThrow('Bridge initiation failed');
        });
    });
});