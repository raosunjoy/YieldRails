import { CrossChainService, BridgeRequest } from '../../src/services/CrossChainService';
import { PrismaClient, CrossChainStatus } from '@prisma/client';
import { redis } from '../../src/config/redis';
import { NotificationService } from '../../src/services/NotificationService';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/config/redis');
jest.mock('../../src/services/NotificationService');
jest.mock('../../src/utils/logger');

describe('CrossChainService - Basic Operations', () => {
    let crossChainService: CrossChainService;
    let mockPrismaCreate: jest.Mock;
    let mockPrismaFindUnique: jest.Mock;
    let mockPrismaFindMany: jest.Mock;
    let mockPrismaUpdate: jest.Mock;
    let mockRedisGet: jest.Mock;
    let mockRedisSet: jest.Mock;
    let mockRedisDel: jest.Mock;

    beforeEach(() => {
        // Set test environment
        process.env.NODE_ENV = 'test';
        
        // Reset mocks
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
            sendBridgeCompletionNotification: jest.fn(),
            sendBridgeFailureNotification: jest.fn(),
        }));

        crossChainService = new CrossChainService();
    });

    afterEach(() => {
        // Clean up any intervals or timeouts
        crossChainService.stopMonitoring();
    });

    describe('Constructor', () => {
        it('should initialize with supported chains and liquidity pools', () => {
            const supportedChains = crossChainService.getSupportedChains();
            const liquidityPools = crossChainService.getLiquidityPools();

            expect(supportedChains.length).toBeGreaterThan(0);
            expect(liquidityPools.length).toBeGreaterThan(0);
            expect(supportedChains.some(chain => chain.name === 'ethereum')).toBe(true);
            expect(supportedChains.some(chain => chain.name === 'polygon')).toBe(true);
        });
    });

    describe('initiateBridge', () => {
        const validBridgeRequest: BridgeRequest = {
            paymentId: 'payment-123',
            sourceChain: '1',
            destinationChain: '137',
            amount: 1000,
            sourceAddress: '0x742d35Cc6aB8827279cffFb92266',
            destinationAddress: '0x8ba1f109551bD432803012645Hac136c',
            token: 'USDC'
        };

        it('should successfully initiate a bridge transaction', async () => {
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
            jest.spyOn(crossChainService as any, 'processBridgeTransaction')
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
        });

        it('should reject invalid source chain', async () => {
            const invalidRequest = { ...validBridgeRequest, sourceChain: 'invalid' };

            await expect(crossChainService.initiateBridge(invalidRequest))
                .rejects.toThrow('Unsupported source chain: invalid');
        });

        it('should reject same source and destination chains', async () => {
            const invalidRequest = { ...validBridgeRequest, destinationChain: '1' };

            await expect(crossChainService.initiateBridge(invalidRequest))
                .rejects.toThrow('Source and destination chains cannot be the same');
        });

        it('should reject invalid amount', async () => {
            const invalidRequest = { ...validBridgeRequest, amount: -100 };

            await expect(crossChainService.initiateBridge(invalidRequest))
                .rejects.toThrow('Bridge amount must be positive');
        });

        it('should reject invalid addresses', async () => {
            const invalidRequest = { ...validBridgeRequest, sourceAddress: 'invalid-address' };

            await expect(crossChainService.initiateBridge(invalidRequest))
                .rejects.toThrow('Invalid source address');
        });
    });

    describe('getBridgeTransaction', () => {
        it('should return cached transaction if available', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: CrossChainStatus.COMPLETED
            };

            mockRedisGet.mockResolvedValue(JSON.stringify(mockTransaction));

            const result = await crossChainService.getBridgeTransaction('tx-123');

            expect(result).toEqual(mockTransaction);
            expect(mockRedisGet).toHaveBeenCalledWith('bridge:tx-123');
            expect(mockPrismaFindUnique).not.toHaveBeenCalled();
        });

        it('should fallback to database if not cached', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: CrossChainStatus.COMPLETED
            };

            mockRedisGet.mockResolvedValue(null);
            mockPrismaFindUnique.mockResolvedValue(mockTransaction as any);
            mockRedisSet.mockResolvedValue('OK');

            const result = await crossChainService.getBridgeTransaction('tx-123');

            expect(result).toEqual(mockTransaction);
            expect(mockPrismaFindUnique).toHaveBeenCalledWith({
                where: { id: 'tx-123' },
                include: { payment: true }
            });
            expect(mockRedisSet).toHaveBeenCalled(); // Should cache the result
        });

        it('should return null if transaction not found', async () => {
            mockRedisGet.mockResolvedValue(null);
            mockPrismaFindUnique.mockResolvedValue(null);

            const result = await crossChainService.getBridgeTransaction('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('getSupportedChains', () => {
        it('should return list of supported chains', () => {
            const chains = crossChainService.getSupportedChains();

            expect(chains).toBeInstanceOf(Array);
            expect(chains.length).toBeGreaterThan(0);
            expect(chains[0]).toHaveProperty('chainId');
            expect(chains[0]).toHaveProperty('name');
            expect(chains[0]).toHaveProperty('nativeCurrency');
            expect(chains[0]).toHaveProperty('blockExplorer');
            expect(chains[0]).toHaveProperty('isTestnet');
        });

        it('should include both mainnet and testnet chains', () => {
            const chains = crossChainService.getSupportedChains();
            
            const hasMainnet = chains.some(chain => !chain.isTestnet);
            const hasTestnet = chains.some(chain => chain.isTestnet);

            expect(hasMainnet).toBe(true);
            expect(hasTestnet).toBe(true);
        });
    });

    describe('estimateBridgeTime', () => {
        it('should return estimated time for valid chains', () => {
            const time = crossChainService.estimateBridgeTime('1', '137');

            expect(time).toBeGreaterThan(0);
            expect(typeof time).toBe('number');
        });

        it('should return default time for invalid chains', () => {
            const time = crossChainService.estimateBridgeTime('invalid', '137');

            expect(time).toBe(300000); // 5 minutes default
        });

        it('should return longer time for cross-ecosystem bridges', () => {
            const ethToPolygonTime = crossChainService.estimateBridgeTime('1', '137');
            const ethToArbitrumTime = crossChainService.estimateBridgeTime('1', '42161');

            // Cross-ecosystem (ETH to Polygon) should take longer than same ecosystem (ETH to Arbitrum)
            expect(ethToPolygonTime).toBeGreaterThan(ethToArbitrumTime);
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            mockPrismaCreate.mockRejectedValue(new Error('Database error'));

            const validRequest: BridgeRequest = {
                sourceChain: '1',
                destinationChain: '137',
                amount: 1000,
                token: 'USDC',
                sourceAddress: '0x742d35Cc6aB8827279cffFb92266',
                destinationAddress: '0x8ba1f109551bD432803012645Hac136c'
            };

            await expect(crossChainService.initiateBridge(validRequest))
                .rejects.toThrow('Bridge initiation failed');
        });

        it('should handle Redis errors gracefully', async () => {
            mockRedisGet.mockRejectedValue(new Error('Redis error'));
            mockPrismaFindUnique.mockResolvedValue({
                id: 'tx-123',
                status: CrossChainStatus.COMPLETED
            } as any);

            const result = await crossChainService.getBridgeTransaction('tx-123');

            expect(result).toBeTruthy();
            expect(result?.id).toBe('tx-123');
        });
    });
});