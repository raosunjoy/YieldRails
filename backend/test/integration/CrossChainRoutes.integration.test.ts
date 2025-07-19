import request from 'supertest';
import express from 'express';
import { crossChainRouter } from '../../src/routes/crosschain';
import { CrossChainService } from '../../src/services/CrossChainService';

// Mock CrossChainService
jest.mock('../../src/services/CrossChainService');
const MockCrossChainService = CrossChainService as jest.MockedClass<typeof CrossChainService>;

// Create test Express app
const app = express();
app.use(express.json());

// Mock auth middleware for testing
app.use((req: any, res: any, next: any) => {
    req.user = { 
        id: 'test-user-id', 
        role: 'user',
        address: '0x1234567890123456789012345678901234567890'
    };
    next();
});

app.use('/api/crosschain', crossChainRouter);

describe('CrossChain API Integration Tests', () => {
    let mockCrossChainService: jest.Mocked<CrossChainService>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockCrossChainService = MockCrossChainService.mock.instances[0] as jest.Mocked<CrossChainService>;
    });

    describe('POST /api/crosschain/bridge', () => {
        it('should initiate a bridge transaction successfully', async () => {
            // Mock the CrossChainService.initiateBridgeTransaction method
            mockCrossChainService.initiateBridgeTransaction.mockResolvedValue({
                id: 'bridge-tx-123',
                sourceChain: 'ethereum',
                destinationChain: 'polygon',
                sourceAmount: '100',
                destinationAmount: '99',
                token: 'USDC',
                senderAddress: '0x1234567890123456789012345678901234567890',
                recipientAddress: '0x0987654321098765432109876543210987654321',
                bridgeFee: '1',
                estimatedYield: '0.5',
                status: 'INITIATED',
                createdAt: new Date(),
                updatedAt: new Date()
            } as any);

            mockCrossChainService.estimateBridgeTime.mockReturnValue(300000); // 5 minutes

            const response = await request(app)
                .post('/api/crosschain/bridge')
                .send({
                    sourceChain: 'ethereum',
                    destinationChain: 'polygon',
                    amount: '100',
                    sourceAddress: '0x1234567890123456789012345678901234567890',
                    destinationAddress: '0x0987654321098765432109876543210987654321',
                    token: 'USDC'
                })
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    transactionId: 'bridge-tx-123',
                    status: 'INITIATED',
                    sourceChain: 'ethereum',
                    destinationChain: 'polygon',
                    amount: '100',
                    bridgeFee: '1',
                    estimatedTime: 300000
                }
            });

            expect(mockCrossChainService.initiateBridgeTransaction).toHaveBeenCalledWith(
                'ethereum',
                'polygon',
                100,
                'USDC',
                '0x0987654321098765432109876543210987654321',
                '0x1234567890123456789012345678901234567890',
                undefined
            );
        });

        it('should return validation error for invalid input', async () => {
            const response = await request(app)
                .post('/api/crosschain/bridge')
                .send({
                    sourceChain: 'ethereum',
                    destinationChain: 'polygon',
                    amount: '-100', // Invalid amount
                    sourceAddress: 'invalid-address',
                    destinationAddress: '0x0987654321098765432109876543210987654321'
                })
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(mockCrossChainService.initiateBridgeTransaction).not.toHaveBeenCalled();
        });
    });

    describe('GET /api/crosschain/transaction/:transactionId', () => {
        it('should get bridge transaction successfully', async () => {
            // Mock the CrossChainService.getBridgeTransaction method
            mockCrossChainService.getBridgeTransaction.mockResolvedValue({
                id: 'bridge-tx-123',
                sourceChain: 'ethereum',
                destinationChain: 'polygon',
                sourceAmount: '100',
                destinationAmount: '99',
                token: 'USDC',
                senderAddress: '0x1234567890123456789012345678901234567890',
                recipientAddress: '0x0987654321098765432109876543210987654321',
                bridgeFee: '1',
                estimatedYield: '0.5',
                status: 'COMPLETED',
                createdAt: new Date(),
                updatedAt: new Date(),
                sourceTransactionHash: '0xabcdef',
                destTransactionHash: '0x123456',
                bridgeTransactionId: 'external-tx-123'
            } as any);

            const response = await request(app)
                .get('/api/crosschain/transaction/bridge-tx-123')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    transactionId: 'bridge-tx-123',
                    status: 'COMPLETED',
                    sourceChain: 'ethereum',
                    destinationChain: 'polygon',
                    sourceAmount: '100',
                    destinationAmount: '99',
                    bridgeFee: '1',
                    sourceTransactionHash: '0xabcdef',
                    destTransactionHash: '0x123456'
                }
            });

            expect(mockCrossChainService.getBridgeTransaction).toHaveBeenCalledWith('bridge-tx-123');
        });

        it('should return 404 for non-existent transaction', async () => {
            // Mock the CrossChainService.getBridgeTransaction method to return null
            mockCrossChainService.getBridgeTransaction.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/crosschain/transaction/non-existent-tx')
                .expect(404);

            expect(response.body.error).toBe('Not Found');
            expect(mockCrossChainService.getBridgeTransaction).toHaveBeenCalledWith('non-existent-tx');
        });
    });
}); 
   describe('GET /api/crosschain/supported-chains', () => {
        it('should get supported chains successfully', async () => {
            // Mock the CrossChainService.getSupportedChains method
            mockCrossChainService.getSupportedChains.mockReturnValue([
                { chainId: '1', name: 'ethereum', nativeCurrency: 'ETH', blockExplorer: 'https://etherscan.io', isTestnet: false, avgBlockTime: 12000 },
                { chainId: '137', name: 'polygon', nativeCurrency: 'MATIC', blockExplorer: 'https://polygonscan.com', isTestnet: false, avgBlockTime: 2000 }
            ]);

            const response = await request(app)
                .get('/api/crosschain/supported-chains')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    chains: [
                        { chainId: '1', name: 'ethereum' },
                        { chainId: '137', name: 'polygon' }
                    ],
                    count: 2
                }
            });

            expect(mockCrossChainService.getSupportedChains).toHaveBeenCalled();
        });
    });

    describe('POST /api/crosschain/estimate', () => {
        it('should get bridge estimate successfully', async () => {
            // Mock the CrossChainService.getBridgeEstimate method
            mockCrossChainService.getBridgeEstimate.mockResolvedValue({
                fee: 1,
                estimatedTime: 300000,
                estimatedYield: 0.5
            });

            const response = await request(app)
                .post('/api/crosschain/estimate')
                .send({
                    sourceChain: 'ethereum',
                    destinationChain: 'polygon',
                    amount: '100'
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    sourceChain: 'ethereum',
                    destinationChain: 'polygon',
                    amount: 100,
                    estimatedFee: 1,
                    estimatedTime: 300000,
                    estimatedYield: 0.5,
                    netAmount: 99.5 // 100 - 1 + 0.5
                }
            });

            expect(mockCrossChainService.getBridgeEstimate).toHaveBeenCalledWith('ethereum', 'polygon', 100);
        });

        it('should return validation error for invalid input', async () => {
            const response = await request(app)
                .post('/api/crosschain/estimate')
                .send({
                    sourceChain: 'ethereum',
                    destinationChain: 'polygon',
                    amount: '-100' // Invalid amount
                })
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(mockCrossChainService.getBridgeEstimate).not.toHaveBeenCalled();
        });
    });

    describe('POST /api/crosschain/transaction/:transactionId/process', () => {
        it('should process bridge transaction successfully', async () => {
            // Mock the CrossChainService.processBridgeTransaction method
            mockCrossChainService.processBridgeTransaction.mockResolvedValue(undefined);

            const response = await request(app)
                .post('/api/crosschain/transaction/bridge-tx-123/process')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Bridge transaction processing initiated',
                data: {
                    transactionId: 'bridge-tx-123'
                }
            });

            expect(mockCrossChainService.processBridgeTransaction).toHaveBeenCalledWith('bridge-tx-123');
        });
    });

    describe('POST /api/crosschain/transaction/:transactionId/cancel', () => {
        it('should cancel bridge transaction successfully', async () => {
            // Mock the CrossChainService.cancelBridgeTransaction method
            mockCrossChainService.cancelBridgeTransaction.mockResolvedValue(true);

            const response = await request(app)
                .post('/api/crosschain/transaction/bridge-tx-123/cancel')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Bridge transaction cancelled successfully',
                data: {
                    transactionId: 'bridge-tx-123'
                }
            });

            expect(mockCrossChainService.cancelBridgeTransaction).toHaveBeenCalledWith('bridge-tx-123');
        });

        it('should return 400 if transaction cannot be cancelled', async () => {
            // Mock the CrossChainService.cancelBridgeTransaction method to return false
            mockCrossChainService.cancelBridgeTransaction.mockResolvedValue(false);

            const response = await request(app)
                .post('/api/crosschain/transaction/bridge-tx-123/cancel')
                .expect(400);

            expect(response.body.error).toBe('Cannot Cancel');
            expect(mockCrossChainService.cancelBridgeTransaction).toHaveBeenCalledWith('bridge-tx-123');
        });
    });

    describe('POST /api/crosschain/transaction/:transactionId/retry', () => {
        it('should retry bridge transaction successfully', async () => {
            // Mock the CrossChainService.retryBridgeTransaction method
            mockCrossChainService.retryBridgeTransaction.mockResolvedValue(true);

            const response = await request(app)
                .post('/api/crosschain/transaction/bridge-tx-123/retry')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Bridge transaction retry initiated',
                data: {
                    transactionId: 'bridge-tx-123'
                }
            });

            expect(mockCrossChainService.retryBridgeTransaction).toHaveBeenCalledWith('bridge-tx-123');
        });

        it('should return 400 if transaction cannot be retried', async () => {
            // Mock the CrossChainService.retryBridgeTransaction method to return false
            mockCrossChainService.retryBridgeTransaction.mockResolvedValue(false);

            const response = await request(app)
                .post('/api/crosschain/transaction/bridge-tx-123/retry')
                .expect(400);

            expect(response.body.error).toBe('Cannot Retry');
            expect(mockCrossChainService.retryBridgeTransaction).toHaveBeenCalledWith('bridge-tx-123');
        });
    }); 
   describe('GET /api/crosschain/transaction/:transactionId/status', () => {
        it('should get comprehensive bridge transaction status', async () => {
            // Mock the CrossChainService.getBridgeStatus method
            mockCrossChainService.getBridgeStatus.mockResolvedValue({
                transactionId: 'bridge-tx-123',
                status: 'COMPLETED',
                progress: 100,
                sourceChain: 'ethereum',
                destinationChain: 'polygon',
                sourceAmount: '100',
                destinationAmount: '99',
                token: 'USDC',
                bridgeFee: '1',
                estimatedYield: '0.5',
                actualYield: '0.6',
                timing: {
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    completedAt: new Date(),
                    elapsedMinutes: 5,
                    estimatedMinutes: 5,
                    remainingMinutes: 0
                }
            });

            const response = await request(app)
                .get('/api/crosschain/transaction/bridge-tx-123/status')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    transactionId: 'bridge-tx-123',
                    status: 'COMPLETED',
                    progress: 100,
                    sourceChain: 'ethereum',
                    destinationChain: 'polygon',
                    sourceAmount: '100',
                    destinationAmount: '99',
                    token: 'USDC',
                    bridgeFee: '1',
                    estimatedYield: '0.5',
                    actualYield: '0.6'
                }
            });

            expect(mockCrossChainService.getBridgeStatus).toHaveBeenCalledWith('bridge-tx-123');
        });

        it('should return 404 for non-existent transaction', async () => {
            // Mock the CrossChainService.getBridgeStatus method to return null
            mockCrossChainService.getBridgeStatus.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/crosschain/transaction/non-existent-tx/status')
                .expect(404);

            expect(response.body.error).toBe('Not Found');
            expect(mockCrossChainService.getBridgeStatus).toHaveBeenCalledWith('non-existent-tx');
        });
    });

    describe('GET /api/crosschain/user/:address/transactions', () => {
        it('should get user bridge transactions successfully', async () => {
            // Mock the CrossChainService.getUserBridgeTransactions method
            mockCrossChainService.getUserBridgeTransactions.mockResolvedValue([
                {
                    id: 'bridge-tx-123',
                    sourceChain: 'ethereum',
                    destinationChain: 'polygon',
                    sourceAmount: '100',
                    status: 'COMPLETED',
                    createdAt: new Date()
                },
                {
                    id: 'bridge-tx-456',
                    sourceChain: 'polygon',
                    destinationChain: 'arbitrum',
                    sourceAmount: '200',
                    status: 'INITIATED',
                    createdAt: new Date()
                }
            ] as any);

            const response = await request(app)
                .get('/api/crosschain/user/0x1234567890123456789012345678901234567890/transactions')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    transactions: [
                        { id: 'bridge-tx-123', sourceChain: 'ethereum', destinationChain: 'polygon' },
                        { id: 'bridge-tx-456', sourceChain: 'polygon', destinationChain: 'arbitrum' }
                    ],
                    pagination: {
                        limit: 50,
                        offset: 0,
                        count: 2
                    }
                }
            });

            expect(mockCrossChainService.getUserBridgeTransactions).toHaveBeenCalledWith(
                '0x1234567890123456789012345678901234567890',
                50,
                0
            );
        });

        it('should return validation error for invalid address', async () => {
            const response = await request(app)
                .get('/api/crosschain/user/invalid-address/transactions')
                .expect(400);

            expect(response.body.error).toBe('Validation Error');
            expect(mockCrossChainService.getUserBridgeTransactions).not.toHaveBeenCalled();
        });
    });

    describe('GET /api/crosschain/analytics', () => {
        it('should get bridge analytics successfully', async () => {
            // Mock the CrossChainService.getBridgeAnalytics method
            mockCrossChainService.getBridgeAnalytics.mockResolvedValue({
                timeRange: 'day',
                totalTransactions: 100,
                successfulTransactions: 90,
                failedTransactions: 5,
                pendingTransactions: 5,
                successRate: 0.9,
                totalVolume: 10000,
                totalFees: 100,
                validatorMetrics: {},
                liquidityMetrics: {}
            });

            const response = await request(app)
                .get('/api/crosschain/analytics?timeRange=day')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    timeRange: 'day',
                    totalTransactions: 100,
                    successfulTransactions: 90,
                    failedTransactions: 5,
                    pendingTransactions: 5,
                    successRate: 0.9,
                    totalVolume: 10000,
                    totalFees: 100
                }
            });

            expect(mockCrossChainService.getBridgeAnalytics).toHaveBeenCalledWith('day');
        });
    });

    describe('GET /api/crosschain/liquidity', () => {
        it('should get liquidity pools successfully', async () => {
            // Mock the CrossChainService.getLiquidityPools method
            mockCrossChainService.getLiquidityPools.mockReturnValue([
                {
                    id: 'usdc-eth-polygon',
                    sourceChain: '1',
                    destinationChain: '137',
                    token: 'USDC',
                    sourceBalance: 1000000,
                    destinationBalance: 1000000,
                    utilizationRate: 0.3
                },
                {
                    id: 'usdc-eth-arbitrum',
                    sourceChain: '1',
                    destinationChain: '42161',
                    token: 'USDC',
                    sourceBalance: 500000,
                    destinationBalance: 500000,
                    utilizationRate: 0.2
                }
            ]);

            const response = await request(app)
                .get('/api/crosschain/liquidity')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    pools: [
                        { id: 'usdc-eth-polygon', token: 'USDC', utilizationRate: 0.3 },
                        { id: 'usdc-eth-arbitrum', token: 'USDC', utilizationRate: 0.2 }
                    ],
                    count: 2
                }
            });

            expect(mockCrossChainService.getLiquidityPools).toHaveBeenCalled();
        });
    });

    describe('POST /api/crosschain/liquidity/check', () => {
        it('should check liquidity availability successfully', async () => {
            // Mock the CrossChainService.checkLiquidityAvailability method
            mockCrossChainService.checkLiquidityAvailability.mockResolvedValue({
                available: true,
                reason: 'Sufficient liquidity available',
                suggestedAmount: 100,
                estimatedWaitTime: 0
            });

            const response = await request(app)
                .post('/api/crosschain/liquidity/check')
                .send({
                    sourceChain: '1',
                    destinationChain: '137',
                    amount: '100',
                    token: 'USDC'
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    available: true,
                    reason: 'Sufficient liquidity available',
                    suggestedAmount: 100,
                    estimatedWaitTime: 0
                }
            });

            expect(mockCrossChainService.checkLiquidityAvailability).toHaveBeenCalledWith(
                '1',
                '137',
                100,
                'USDC'
            );
        });
    });

    // Test the new endpoints
    describe('GET /api/crosschain/transaction/:transactionId/history', () => {
        it('should get transaction history successfully', async () => {
            // Mock the CrossChainService.getTransactionHistory method
            mockCrossChainService.getTransactionHistory.mockResolvedValue({
                transaction: { id: 'bridge-tx-123' } as any,
                updates: [
                    { type: 'status_change', status: 'INITIATED', timestamp: new Date() },
                    { type: 'status_change', status: 'COMPLETED', timestamp: new Date() }
                ],
                lastUpdated: new Date(),
                subscriberCount: 2
            });

            const response = await request(app)
                .get('/api/crosschain/transaction/bridge-tx-123/history')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    transaction: { id: 'bridge-tx-123' },
                    updates: [
                        { type: 'status_change', status: 'INITIATED' },
                        { type: 'status_change', status: 'COMPLETED' }
                    ],
                    subscriberCount: 2
                }
            });

            expect(mockCrossChainService.getTransactionHistory).toHaveBeenCalledWith('bridge-tx-123');
        });
    });

    describe('GET /api/crosschain/validators', () => {
        it('should get active validators successfully', async () => {
            // Mock the CrossChainService.getActiveValidators method
            mockCrossChainService.getActiveValidators.mockReturnValue([
                { id: 'validator-1', address: '0x1111', isActive: true, reputation: 100, lastSeen: new Date() },
                { id: 'validator-2', address: '0x2222', isActive: true, reputation: 95, lastSeen: new Date() }
            ]);

            const response = await request(app)
                .get('/api/crosschain/validators')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    validators: [
                        { id: 'validator-1', address: '0x1111', isActive: true, reputation: 100 },
                        { id: 'validator-2', address: '0x2222', isActive: true, reputation: 95 }
                    ],
                    count: 2,
                    requiredForConsensus: 2 // 2/3 of 2 rounded up
                }
            });

            expect(mockCrossChainService.getActiveValidators).toHaveBeenCalled();
        });
    });

    describe('GET /api/crosschain/monitoring', () => {
        it('should get monitoring metrics for admin users', async () => {
            // Set user role to admin
            app.use((req: any, res: any, next: any) => {
                req.user = { id: 'admin-id', role: 'admin' };
                next();
            });

            // Mock the CrossChainService.getMonitoringMetrics method
            mockCrossChainService.getMonitoringMetrics.mockReturnValue({
                totalTransactions: 1000,
                successfulTransactions: 950,
                failedTransactions: 50,
                averageProcessingTime: 300000,
                totalVolume: 100000,
                liquidityUtilization: 0.3,
                lastUpdated: new Date()
            });

            const response = await request(app)
                .get('/api/crosschain/monitoring')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    totalTransactions: 1000,
                    successfulTransactions: 950,
                    failedTransactions: 50,
                    averageProcessingTime: 300000,
                    totalVolume: 100000,
                    liquidityUtilization: 0.3
                }
            });

            expect(mockCrossChainService.getMonitoringMetrics).toHaveBeenCalled();
        });
    });
});