import { jest } from '@jest/globals';
import { PaymentService, PaymentStatus, PaymentType, PaymentEventType } from '../../src/services/PaymentService';
import { PrismaClient } from '@prisma/client';
import { redis } from '../../src/config/redis';
import {
    ApiTestUtils,
    RedisTestUtils,
    ErrorTestUtils
} from '../helpers/testUtils';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/config/redis');
jest.mock('../../src/services/ContractService');
jest.mock('../../src/services/YieldService');
jest.mock('../../src/services/NotificationService');

const mockPrisma = {
    payment: {
        create: jest.fn() as jest.MockedFunction<any>,
        findUnique: jest.fn() as jest.MockedFunction<any>,
        findMany: jest.fn() as jest.MockedFunction<any>,
        update: jest.fn() as jest.MockedFunction<any>,
        count: jest.fn() as jest.MockedFunction<any>,
        aggregate: jest.fn() as jest.MockedFunction<any>,
        groupBy: jest.fn() as jest.MockedFunction<any>,
        updateMany: jest.fn() as jest.MockedFunction<any>
    },
    merchant: {
        findFirst: jest.fn() as jest.MockedFunction<any>,
        create: jest.fn() as jest.MockedFunction<any>
    },
    paymentEvent: {
        create: jest.fn() as jest.MockedFunction<any>
    },
    yieldEarning: {
        create: jest.fn() as jest.MockedFunction<any>,
        updateMany: jest.fn() as jest.MockedFunction<any>,
        aggregate: jest.fn() as jest.MockedFunction<any>,
        groupBy: jest.fn() as jest.MockedFunction<any>
    },
    yieldStrategy: {
        findFirst: jest.fn() as jest.MockedFunction<any>,
        findUnique: jest.fn() as jest.MockedFunction<any>
    }
};

const mockRedis = RedisTestUtils.createMockRedisClient();
const mockContractService = {
    createEscrow: jest.fn() as jest.MockedFunction<any>,
    releasePayment: jest.fn() as jest.MockedFunction<any>,
    cancelPayment: jest.fn() as jest.MockedFunction<any>,
    calculateYield: jest.fn() as jest.MockedFunction<any>,
    getTransactionReceipt: jest.fn() as jest.MockedFunction<any>
};
const mockYieldService = {
    startYieldGeneration: jest.fn() as jest.MockedFunction<any>,
    calculateFinalYield: jest.fn() as jest.MockedFunction<any>,
    calculateCurrentYield: jest.fn() as jest.MockedFunction<any>
};
const mockNotificationService = {
    sendPaymentCreated: jest.fn() as jest.MockedFunction<any>,
    sendPaymentStatusUpdate: jest.fn() as jest.MockedFunction<any>,
    sendPaymentFailed: jest.fn() as jest.MockedFunction<any>,
    sendPaymentCancelled: jest.fn() as jest.MockedFunction<any>,
    sendYieldUpdate: jest.fn() as jest.MockedFunction<any>,
    sendWebhook: jest.fn() as jest.MockedFunction<any>,
    sendSystemAlert: jest.fn() as jest.MockedFunction<any>
};

describe('PaymentService', () => {
    let paymentService: PaymentService;
    let testUser: any;
    let testPayment: any;
    let testMerchant: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup mocks
        (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any);
        (redis as any) = mockRedis;
        
        paymentService = new PaymentService(
            mockContractService as any,
            mockYieldService as any,
            mockNotificationService as any,
            mockPrisma as any
        );

        // Test data
        testUser = ApiTestUtils.createTestUser();
        testMerchant = {
            id: 'merchant-1',
            name: 'Test Merchant',
            email: 'merchant@test.com',
            webhookUrl: 'https://merchant.com/webhook'
        };
        testPayment = ApiTestUtils.createTestPayment({
            userId: testUser.id,
            merchantId: testMerchant.id,
            amount: 100,
            tokenSymbol: 'USDC',
            sourceChain: 'ethereum',
            escrowAddress: '0x1234567890123456789012345678901234567890'
        });
    });

    describe('createPayment', () => {
        const validRequest = {
            merchantAddress: '0x1234567890123456789012345678901234567890',
            amount: '100.00',
            token: 'USDC' as any,
            chain: 'ethereum' as any,
            customerEmail: 'customer@test.com',
            yieldEnabled: true
        };

        beforeEach(() => {
            mockPrisma.merchant.findFirst.mockResolvedValue(testMerchant);
            mockPrisma.payment.create.mockResolvedValue(testPayment);
            mockPrisma.paymentEvent.create.mockResolvedValue({});
            mockRedis.set.mockResolvedValue('OK');
            mockContractService.createEscrow.mockResolvedValue({
                transactionHash: '0xabcdef',
                depositIndex: 0
            });
        });

        it('should create payment successfully', async () => {
            const result = await paymentService.createPayment(validRequest, testUser.id);

            expect(result).toBeDefined();
            expect(mockPrisma.payment.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: testUser.id,
                    merchantId: testMerchant.id,
                    amount: 100,
                    tokenSymbol: 'USDC',
                    status: PaymentStatus.PENDING,
                    type: PaymentType.MERCHANT_PAYMENT
                })
            });
            expect(mockPrisma.paymentEvent.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    paymentId: testPayment.id,
                    eventType: PaymentEventType.CREATED
                })
            });
            expect(mockRedis.set).toHaveBeenCalled();
        });

        it('should throw error for invalid amount', async () => {
            const invalidRequest = { ...validRequest, amount: '0' };
            
            await ErrorTestUtils.expectToThrow(
                () => paymentService.createPayment(invalidRequest, testUser.id),
                'Payment amount must be greater than 0'
            );
        });

        it('should throw error for invalid merchant address', async () => {
            const invalidRequest = { ...validRequest, merchantAddress: 'invalid-address' };
            
            await ErrorTestUtils.expectToThrow(
                () => paymentService.createPayment(invalidRequest, testUser.id),
                'Invalid merchant address'
            );
        });

        it('should throw error for missing user ID', async () => {
            await ErrorTestUtils.expectToThrow(
                () => paymentService.createPayment(validRequest, ''),
                'User ID is required for payment creation'
            );
        });

        it('should create merchant if not exists', async () => {
            mockPrisma.merchant.findFirst.mockResolvedValue(null);
            mockPrisma.merchant.create.mockResolvedValue(testMerchant);

            await paymentService.createPayment(validRequest, testUser.id);

            expect(mockPrisma.merchant.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: expect.stringContaining('Merchant'),
                    email: expect.stringContaining('@example.com')
                })
            });
        });
    });

    describe('getPayment', () => {
        it('should return cached payment if available', async () => {
            mockRedis.get.mockResolvedValue(JSON.stringify(testPayment));

            const result = await paymentService.getPayment(testPayment.id);

            expect(result).toEqual(expect.objectContaining({
                id: testPayment.id,
                amount: testPayment.amount,
                userId: testPayment.userId
            }));
            expect(mockRedis.get).toHaveBeenCalledWith(`payment:${testPayment.id}`);
            expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled();
        });

        it('should fetch from database if not cached', async () => {
            mockRedis.get.mockResolvedValue(null);
            mockPrisma.payment.findUnique.mockResolvedValue(testPayment);
            mockRedis.set.mockResolvedValue('OK');

            const result = await paymentService.getPayment(testPayment.id);

            expect(result).toEqual(testPayment);
            expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
                where: { id: testPayment.id },
                include: expect.any(Object)
            });
            expect(mockRedis.set).toHaveBeenCalled();
        });

        it('should return null if payment not found', async () => {
            mockRedis.get.mockResolvedValue(null);
            mockPrisma.payment.findUnique.mockResolvedValue(null);

            const result = await paymentService.getPayment('non-existent-id');

            expect(result).toBeNull();
        });
    });

    describe('updatePaymentStatus', () => {
        beforeEach(() => {
            mockPrisma.payment.findUnique.mockResolvedValue(testPayment);
            mockPrisma.payment.update.mockResolvedValue({
                ...testPayment,
                status: PaymentStatus.CONFIRMED
            });
            mockPrisma.paymentEvent.create.mockResolvedValue({});
            mockRedis.set.mockResolvedValue('OK');
        });

        it('should update payment status successfully', async () => {
            const result = await paymentService.updatePaymentStatus(
                testPayment.id,
                PaymentStatus.CONFIRMED,
                '0xabcdef'
            );

            expect(mockPrisma.payment.update).toHaveBeenCalledWith({
                where: { id: testPayment.id },
                data: expect.objectContaining({
                    status: PaymentStatus.CONFIRMED,
                    sourceTransactionHash: '0xabcdef'
                })
            });
            expect(mockPrisma.paymentEvent.create).toHaveBeenCalled();
            expect(mockRedis.set).toHaveBeenCalled();
        });

        it('should set confirmedAt when status is CONFIRMED', async () => {
            await paymentService.updatePaymentStatus(
                testPayment.id,
                PaymentStatus.CONFIRMED
            );

            expect(mockPrisma.payment.update).toHaveBeenCalledWith({
                where: { id: testPayment.id },
                data: expect.objectContaining({
                    confirmedAt: expect.any(Date)
                })
            });
        });

        it('should set releasedAt when status is COMPLETED', async () => {
            await paymentService.updatePaymentStatus(
                testPayment.id,
                PaymentStatus.COMPLETED
            );

            expect(mockPrisma.payment.update).toHaveBeenCalledWith({
                where: { id: testPayment.id },
                data: expect.objectContaining({
                    releasedAt: expect.any(Date)
                })
            });
        });
    });

    describe('releasePayment', () => {
        beforeEach(() => {
            const confirmedPayment = {
                ...testPayment,
                status: PaymentStatus.CONFIRMED,
                merchant: testMerchant
            };
            
            mockPrisma.payment.findUnique.mockResolvedValue(confirmedPayment);
            mockPrisma.payment.update.mockResolvedValue({
                ...confirmedPayment,
                status: PaymentStatus.COMPLETED
            });
            mockYieldService.calculateFinalYield.mockResolvedValue('5.0');
            mockContractService.releasePayment.mockResolvedValue({
                transactionHash: '0xrelease',
                gasUsed: '50000'
            });
            mockPrisma.yieldEarning.create.mockResolvedValue({});
            mockPrisma.paymentEvent.create.mockResolvedValue({});
            mockRedis.set.mockResolvedValue('OK');
        });

        it('should release payment successfully', async () => {
            const result = await paymentService.releasePayment(testPayment.id);

            expect(mockYieldService.calculateFinalYield).toHaveBeenCalledWith(testPayment.id);
            expect(mockContractService.releasePayment).toHaveBeenCalled();
            expect(mockPrisma.payment.update).toHaveBeenCalledWith({
                where: { id: testPayment.id },
                data: expect.objectContaining({
                    status: PaymentStatus.COMPLETED,
                    actualYield: 5.0
                })
            });
            expect(mockNotificationService.sendPaymentStatusUpdate).toHaveBeenCalled();
            expect(mockNotificationService.sendWebhook).toHaveBeenCalled();
        });

        it('should throw error if payment not found', async () => {
            mockPrisma.payment.findUnique.mockResolvedValue(null);

            await ErrorTestUtils.expectToThrow(
                () => paymentService.releasePayment('non-existent-id'),
                'Payment non-existent-id not found'
            );
        });

        it('should throw error if payment not confirmed', async () => {
            mockPrisma.payment.findUnique.mockResolvedValue({
                ...testPayment,
                status: PaymentStatus.PENDING
            });

            await ErrorTestUtils.expectToThrow(
                () => paymentService.releasePayment(testPayment.id),
                'is not confirmed and cannot be released'
            );
        });
    });

    describe('cancelPayment', () => {
        beforeEach(() => {
            const pendingPayment = {
                ...testPayment,
                status: PaymentStatus.PENDING
            };
            
            mockPrisma.payment.findUnique.mockResolvedValue(pendingPayment);
            mockPrisma.payment.update.mockResolvedValue({
                ...pendingPayment,
                status: PaymentStatus.CANCELLED
            });
            mockPrisma.paymentEvent.create.mockResolvedValue({});
            mockRedis.set.mockResolvedValue('OK');
        });

        it('should cancel payment successfully', async () => {
            const reason = 'User requested cancellation';

            const result = await paymentService.cancelPayment(testPayment.id, reason);

            expect(mockPrisma.payment.update).toHaveBeenCalledWith({
                where: { id: testPayment.id },
                data: expect.objectContaining({
                    status: PaymentStatus.CANCELLED
                })
            });
            expect(mockPrisma.paymentEvent.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    eventType: PaymentEventType.CANCELLED,
                    eventData: expect.objectContaining({ reason })
                })
            });
            expect(mockNotificationService.sendPaymentCancelled).toHaveBeenCalledWith(result, reason);
        });

        it('should call contract service for confirmed payments', async () => {
            const confirmedPayment = {
                ...testPayment,
                status: PaymentStatus.CONFIRMED,
                escrowAddress: '0x1234567890123456789012345678901234567890'
            };
            
            mockPrisma.payment.findUnique.mockResolvedValue(confirmedPayment);
            mockContractService.cancelPayment.mockResolvedValue({
                transactionHash: '0xcancel'
            });

            await paymentService.cancelPayment(testPayment.id, 'Test reason');

            expect(mockContractService.cancelPayment).toHaveBeenCalledWith(
                confirmedPayment.escrowAddress,
                'Test reason'
            );
        });
    });

    describe('getUserPaymentHistory', () => {
        beforeEach(() => {
            mockRedis.get.mockResolvedValue(null);
            mockPrisma.payment.findMany.mockResolvedValue([testPayment]);
            mockPrisma.payment.count.mockResolvedValue(1);
            mockPrisma.payment.aggregate.mockResolvedValue({
                _sum: { amount: 100 }
            });
            mockPrisma.yieldEarning.aggregate.mockResolvedValue({
                _sum: { netYieldAmount: 5 }
            });
            mockRedis.set.mockResolvedValue('OK');
        });

        it('should return user payment history with analytics', async () => {
            const result = await paymentService.getUserPaymentHistory(testUser.id);

            expect(result).toEqual({
                payments: [testPayment],
                total: 1,
                analytics: {
                    totalPayments: 1,
                    totalVolume: 100,
                    totalYieldEarned: 5,
                    averagePaymentAmount: 100
                }
            });
        });

        it('should handle pagination parameters', async () => {
            await paymentService.getUserPaymentHistory(testUser.id, 25, 50);

            expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
                where: { userId: testUser.id },
                include: expect.any(Object),
                orderBy: { createdAt: 'desc' },
                take: 25,
                skip: 50
            });
        });
    });

    describe('getMerchantAnalytics', () => {
        beforeEach(() => {
            mockRedis.get.mockResolvedValue(null);
            mockPrisma.payment.count
                .mockResolvedValueOnce(100) // Total payments
                .mockResolvedValueOnce(80); // Completed payments
            mockPrisma.payment.aggregate.mockResolvedValue({
                _sum: { amount: 10000, actualYield: 500 },
                _avg: { amount: 100 }
            });
            mockPrisma.payment.groupBy.mockResolvedValue([
                { status: PaymentStatus.COMPLETED, _count: { status: 80 } },
                { status: PaymentStatus.PENDING, _count: { status: 20 } }
            ]);
            mockPrisma.yieldEarning.groupBy.mockResolvedValue([
                { strategyId: 'strategy-1', _sum: { yieldAmount: 300 }, _count: { strategyId: 60 } },
                { strategyId: 'strategy-2', _sum: { yieldAmount: 200 }, _count: { strategyId: 40 } }
            ]);
            mockRedis.set.mockResolvedValue('OK');
        });

        it('should return comprehensive merchant analytics', async () => {
            const result = await paymentService.getMerchantAnalytics(testMerchant.id);

            expect(result).toEqual({
                totalPayments: 100,
                completedPayments: 80,
                completionRate: 80,
                totalVolume: 10000,
                totalYieldGenerated: 500,
                averagePaymentAmount: 100,
                paymentsByStatus: {
                    [PaymentStatus.COMPLETED]: 80,
                    [PaymentStatus.PENDING]: 20
                },
                yieldByStrategy: [
                    { strategyId: 'strategy-1', totalYield: 300, paymentCount: 60 },
                    { strategyId: 'strategy-2', totalYield: 200, paymentCount: 40 }
                ]
            });
        });

        it('should handle date range filtering', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');

            await paymentService.getMerchantAnalytics(testMerchant.id, startDate, endDate);

            expect(mockPrisma.payment.count).toHaveBeenCalledWith({
                where: {
                    merchantId: testMerchant.id,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
        });
    });

    describe('getPaymentMetrics', () => {
        beforeEach(() => {
            const now = new Date();
            const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            mockPrisma.payment.count
                .mockResolvedValueOnce(100) // Total payments
                .mockResolvedValueOnce(80)  // Completed payments
                .mockResolvedValueOnce(5);  // Failed payments
            
            mockPrisma.payment.aggregate
                .mockResolvedValueOnce({ _sum: { amount: 10000 } }) // Total volume
                .mockResolvedValueOnce({ _sum: { actualYield: 500 } }) // Total yield
                .mockResolvedValueOnce({ _avg: { amount: 100 } }); // Average amount
            
            mockPrisma.payment.findMany.mockResolvedValue([
                {
                    confirmedAt: dayAgo,
                    releasedAt: now
                }
            ]);
        });

        it('should return comprehensive payment metrics', async () => {
            const result = await paymentService.getPaymentMetrics();

            expect(result).toEqual({
                totalPayments: 100,
                completedPayments: 80,
                failedPayments: 5,
                successRate: 80,
                failureRate: 5,
                totalVolume: 10000,
                totalYieldGenerated: 500,
                averagePaymentAmount: 100,
                averageProcessingTimeMs: expect.any(Number),
                averageProcessingTimeHours: expect.any(Number)
            });
        });

        it('should handle date range filtering', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');

            await paymentService.getPaymentMetrics(startDate, endDate);

            expect(mockPrisma.payment.count).toHaveBeenCalledWith({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
        });
    });

    describe('handleTransactionFailure', () => {
        beforeEach(() => {
            mockPrisma.payment.update.mockResolvedValue({
                ...testPayment,
                status: PaymentStatus.FAILED
            });
            mockPrisma.payment.findUnique.mockResolvedValue(testPayment);
            mockPrisma.paymentEvent.create.mockResolvedValue({});
            mockRedis.set.mockResolvedValue('OK');
        });

        it('should handle transaction failure correctly', async () => {
            const error = new Error('Transaction reverted');
            const txHash = '0xfailed';

            await paymentService.handleTransactionFailure(testPayment.id, txHash, error);

            expect(mockPrisma.payment.update).toHaveBeenCalledWith({
                where: { id: testPayment.id },
                data: expect.objectContaining({
                    status: PaymentStatus.FAILED,
                    sourceTransactionHash: txHash
                })
            });
            expect(mockPrisma.paymentEvent.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    eventType: PaymentEventType.FAILED,
                    eventData: expect.objectContaining({
                        error: error.message
                    })
                })
            });
            expect(mockNotificationService.sendPaymentFailed).toHaveBeenCalledWith(testPayment, error);
        });
    });
});