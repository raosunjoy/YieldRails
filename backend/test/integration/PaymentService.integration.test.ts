import { jest } from '@jest/globals';
import { PaymentService, PaymentStatus, PaymentType } from '../../src/services/PaymentService';
import { ContractService } from '../../src/services/ContractService';
import { YieldService } from '../../src/services/YieldService';
import { NotificationService } from '../../src/services/NotificationService';
import { PrismaClient } from '@prisma/client';
import { redis } from '../../src/config/redis';
import { DatabaseTestUtils, ApiTestUtils } from '../helpers/testUtils';

describe('PaymentService Integration Tests', () => {
    let paymentService: PaymentService;
    let prisma: PrismaClient;
    let testUser: any;
    let testMerchant: any;

    beforeAll(async () => {
        // Initialize test database
        prisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/yieldrails_test'
                }
            }
        });

        // Clean database
        await DatabaseTestUtils.cleanDatabase();
        
        // Seed test data
        await DatabaseTestUtils.seedTestData();
    });

    beforeEach(async () => {
        // Create fresh service instances for each test
        paymentService = new PaymentService();

        // Create test user
        testUser = await prisma.user.create({
            data: {
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                walletAddress: '0x1234567890123456789012345678901234567890',
                kycStatus: 'APPROVED',
                role: 'USER'
            }
        });

        // Create test merchant
        testMerchant = await prisma.merchant.create({
            data: {
                name: 'Test Merchant',
                email: 'merchant@test.com',
                defaultCurrency: 'USD',
                supportedChains: ['ethereum'],
                verificationStatus: 'APPROVED'
            }
        });
    });

    afterEach(async () => {
        // Clean up test data
        await prisma.paymentEvent.deleteMany();
        await prisma.yieldEarning.deleteMany();
        await prisma.payment.deleteMany();
        await prisma.merchant.deleteMany();
        await prisma.user.deleteMany();
        
        // Clear Redis cache
        await redis.flushAll();
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await redis.disconnect();
    });

    describe('End-to-End Payment Flow', () => {
        it('should complete full payment lifecycle', async () => {
            // Step 1: Create payment
            const createRequest = {
                merchantAddress: '0x9876543210987654321098765432109876543210',
                amount: '100.00',
                token: 'USDC' as any,
                chain: 'ethereum' as any,
                customerEmail: 'customer@test.com',
                yieldEnabled: true
            };

            const payment = await paymentService.createPayment(createRequest, testUser.id);
            
            expect(payment).toBeDefined();
            expect(payment.status).toBe(PaymentStatus.PENDING);
            expect(payment.amount).toBe(100);
            expect(payment.userId).toBe(testUser.id);

            // Verify payment was stored in database
            const storedPayment = await prisma.payment.findUnique({
                where: { id: payment.id }
            });
            expect(storedPayment).toBeDefined();

            // Verify payment event was created
            const events = await prisma.paymentEvent.findMany({
                where: { paymentId: payment.id }
            });
            expect(events).toHaveLength(1);
            expect(events[0].eventType).toBe('CREATED');

            // Step 2: Confirm payment
            const confirmedPayment = await paymentService.updatePaymentStatus(
                payment.id,
                PaymentStatus.CONFIRMED,
                '0xconfirmed123'
            );

            expect(confirmedPayment.status).toBe(PaymentStatus.CONFIRMED);
            expect(confirmedPayment.sourceTransactionHash).toBe('0xconfirmed123');
            expect(confirmedPayment.confirmedAt).toBeDefined();

            // Step 3: Start yield generation
            await paymentService.startYieldGeneration(payment.id);

            // Verify yield earning record was created
            const yieldEarnings = await prisma.yieldEarning.findMany({
                where: { paymentId: payment.id }
            });
            expect(yieldEarnings).toHaveLength(1);
            expect(yieldEarnings[0].status).toBe('ACTIVE');

            // Step 4: Update yield (simulate real-time updates)
            await paymentService.updatePaymentYield(payment.id);

            // Step 5: Release payment
            const releasedPayment = await paymentService.releasePayment(payment.id);

            expect(releasedPayment.status).toBe(PaymentStatus.COMPLETED);
            expect(releasedPayment.releasedAt).toBeDefined();
            expect(releasedPayment.actualYield).toBeGreaterThan(0);

            // Verify final yield earning record
            const finalYieldEarnings = await prisma.yieldEarning.findMany({
                where: { paymentId: payment.id }
            });
            expect(finalYieldEarnings.some(e => e.status === 'COMPLETED')).toBe(true);

            // Verify all payment events were created
            const allEvents = await prisma.paymentEvent.findMany({
                where: { paymentId: payment.id },
                orderBy: { createdAt: 'asc' }
            });
            expect(allEvents.length).toBeGreaterThanOrEqual(4);
            expect(allEvents.map(e => e.eventType)).toContain('CREATED');
            expect(allEvents.map(e => e.eventType)).toContain('CONFIRMED');
            expect(allEvents.map(e => e.eventType)).toContain('YIELD_STARTED');
            expect(allEvents.map(e => e.eventType)).toContain('RELEASED');
        });

        it('should handle payment cancellation', async () => {
            // Create payment
            const createRequest = {
                merchantAddress: '0x9876543210987654321098765432109876543210',
                amount: '50.00',
                token: 'USDC' as any,
                chain: 'ethereum' as any
            };

            const payment = await paymentService.createPayment(createRequest, testUser.id);

            // Cancel payment
            const cancelledPayment = await paymentService.cancelPayment(
                payment.id,
                'User requested cancellation'
            );

            expect(cancelledPayment.status).toBe(PaymentStatus.CANCELLED);

            // Verify cancellation event
            const events = await prisma.paymentEvent.findMany({
                where: { 
                    paymentId: payment.id,
                    eventType: 'CANCELLED'
                }
            });
            expect(events).toHaveLength(1);
            expect(events[0].eventData).toEqual(
                expect.objectContaining({
                    reason: 'User requested cancellation'
                })
            );
        });

        it('should handle payment failure', async () => {
            // Create payment
            const createRequest = {
                merchantAddress: '0x9876543210987654321098765432109876543210',
                amount: '75.00',
                token: 'USDC' as any,
                chain: 'ethereum' as any
            };

            const payment = await paymentService.createPayment(createRequest, testUser.id);

            // Simulate transaction failure
            const error = new Error('Transaction reverted: insufficient funds');
            await paymentService.handleTransactionFailure(
                payment.id,
                '0xfailed123',
                error
            );

            // Verify payment status
            const failedPayment = await prisma.payment.findUnique({
                where: { id: payment.id }
            });
            expect(failedPayment?.status).toBe(PaymentStatus.FAILED);
            expect(failedPayment?.sourceTransactionHash).toBe('0xfailed123');

            // Verify failure event
            const events = await prisma.paymentEvent.findMany({
                where: { 
                    paymentId: payment.id,
                    eventType: 'FAILED'
                }
            });
            expect(events).toHaveLength(1);
            expect(events[0].eventData).toEqual(
                expect.objectContaining({
                    error: error.message
                })
            );
        });
    });

    describe('Merchant Analytics Integration', () => {
        it('should provide accurate merchant analytics', async () => {
            // Create multiple payments for the merchant
            const payments = [];
            for (let i = 0; i < 5; i++) {
                const createRequest = {
                    merchantAddress: '0x9876543210987654321098765432109876543210',
                    amount: `${(i + 1) * 20}.00`,
                    token: 'USDC' as any,
                    chain: 'ethereum' as any,
                    yieldEnabled: true
                };

                const payment = await paymentService.createPayment(createRequest, testUser.id);
                payments.push(payment);

                // Complete some payments
                if (i < 3) {
                    await paymentService.updatePaymentStatus(
                        payment.id,
                        PaymentStatus.CONFIRMED,
                        `0xconfirmed${i}`
                    );
                    await paymentService.startYieldGeneration(payment.id);
                    await paymentService.releasePayment(payment.id);
                }
            }

            // Get analytics
            const analytics = await paymentService.getMerchantAnalytics(testMerchant.id);

            expect(analytics.totalPayments).toBe(5);
            expect(analytics.completedPayments).toBe(3);
            expect(analytics.completionRate).toBe(60);
            expect(analytics.totalVolume).toBe(300); // 20+40+60+80+100
            expect(analytics.averagePaymentAmount).toBe(60);
            expect(analytics.paymentsByStatus[PaymentStatus.COMPLETED]).toBe(3);
            expect(analytics.paymentsByStatus[PaymentStatus.PENDING]).toBe(2);
        });

        it('should filter analytics by date range', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-06-30');

            // Create payment within date range
            const createRequest = {
                merchantAddress: '0x9876543210987654321098765432109876543210',
                amount: '100.00',
                token: 'USDC' as any,
                chain: 'ethereum' as any
            };

            await paymentService.createPayment(createRequest, testUser.id);

            const analytics = await paymentService.getMerchantAnalytics(
                testMerchant.id,
                startDate,
                endDate
            );

            expect(analytics).toBeDefined();
            expect(analytics.totalPayments).toBeGreaterThanOrEqual(0);
        });
    });

    describe('User Payment History Integration', () => {
        it('should provide comprehensive user payment history', async () => {
            // Create multiple payments for the user
            const payments = [];
            for (let i = 0; i < 3; i++) {
                const createRequest = {
                    merchantAddress: '0x9876543210987654321098765432109876543210',
                    amount: `${(i + 1) * 50}.00`,
                    token: 'USDC' as any,
                    chain: 'ethereum' as any,
                    yieldEnabled: true
                };

                const payment = await paymentService.createPayment(createRequest, testUser.id);
                payments.push(payment);

                // Complete payments to generate yield
                await paymentService.updatePaymentStatus(
                    payment.id,
                    PaymentStatus.CONFIRMED,
                    `0xconfirmed${i}`
                );
                await paymentService.startYieldGeneration(payment.id);
                await paymentService.releasePayment(payment.id);
            }

            // Get payment history
            const history = await paymentService.getUserPaymentHistory(testUser.id);

            expect(history.payments).toHaveLength(3);
            expect(history.analytics.totalPayments).toBe(3);
            expect(history.analytics.totalVolume).toBe(300); // 50+100+150
            expect(history.analytics.totalYieldEarned).toBeGreaterThan(0);
            expect(history.analytics.averagePaymentAmount).toBe(100);

            // Verify payments are ordered by creation date (newest first)
            const createdDates = history.payments.map(p => new Date(p.createdAt).getTime());
            for (let i = 1; i < createdDates.length; i++) {
                expect(createdDates[i-1]).toBeGreaterThanOrEqual(createdDates[i]);
            }
        });

        it('should handle pagination correctly', async () => {
            // Create 10 payments
            for (let i = 0; i < 10; i++) {
                const createRequest = {
                    merchantAddress: '0x9876543210987654321098765432109876543210',
                    amount: '10.00',
                    token: 'USDC' as any,
                    chain: 'ethereum' as any
                };

                await paymentService.createPayment(createRequest, testUser.id);
            }

            // Test pagination
            const firstPage = await paymentService.getUserPaymentHistory(testUser.id, 5, 0);
            const secondPage = await paymentService.getUserPaymentHistory(testUser.id, 5, 5);

            expect(firstPage.payments).toHaveLength(5);
            expect(secondPage.payments).toHaveLength(5);

            // Ensure no overlap
            const firstPageIds = firstPage.payments.map(p => p.id);
            const secondPageIds = secondPage.payments.map(p => p.id);
            const intersection = firstPageIds.filter(id => secondPageIds.includes(id));
            expect(intersection).toHaveLength(0);
        });
    });

    describe('Caching Integration', () => {
        it('should cache and retrieve payments correctly', async () => {
            // Create payment
            const createRequest = {
                merchantAddress: '0x9876543210987654321098765432109876543210',
                amount: '100.00',
                token: 'USDC' as any,
                chain: 'ethereum' as any
            };

            const payment = await paymentService.createPayment(createRequest, testUser.id);

            // First retrieval should cache the payment
            const retrieved1 = await paymentService.getPayment(payment.id);
            expect(retrieved1).toEqual(expect.objectContaining({
                id: payment.id,
                amount: payment.amount
            }));

            // Verify it's cached
            const cached = await redis.get(`payment:${payment.id}`);
            expect(cached).toBeDefined();

            // Second retrieval should use cache
            const retrieved2 = await paymentService.getPayment(payment.id);
            expect(retrieved2).toEqual(retrieved1);
        });

        it('should invalidate cache on payment updates', async () => {
            // Create payment
            const createRequest = {
                merchantAddress: '0x9876543210987654321098765432109876543210',
                amount: '100.00',
                token: 'USDC' as any,
                chain: 'ethereum' as any
            };

            const payment = await paymentService.createPayment(createRequest, testUser.id);

            // Cache the payment
            await paymentService.getPayment(payment.id);

            // Update payment status
            await paymentService.updatePaymentStatus(
                payment.id,
                PaymentStatus.CONFIRMED,
                '0xconfirmed'
            );

            // Verify cache was updated
            const cached = await redis.get(`payment:${payment.id}`);
            expect(cached).toBeDefined();
            
            const cachedPayment = JSON.parse(cached!);
            expect(cachedPayment.status).toBe(PaymentStatus.CONFIRMED);
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle database constraint violations', async () => {
            // Try to create payment with invalid user ID
            const createRequest = {
                merchantAddress: '0x9876543210987654321098765432109876543210',
                amount: '100.00',
                token: 'USDC' as any,
                chain: 'ethereum' as any
            };

            await expect(
                paymentService.createPayment(createRequest, 'non-existent-user-id')
            ).rejects.toThrow();
        });

        it('should handle concurrent payment operations', async () => {
            // Create payment
            const createRequest = {
                merchantAddress: '0x9876543210987654321098765432109876543210',
                amount: '100.00',
                token: 'USDC' as any,
                chain: 'ethereum' as any
            };

            const payment = await paymentService.createPayment(createRequest, testUser.id);

            // Confirm payment
            await paymentService.updatePaymentStatus(
                payment.id,
                PaymentStatus.CONFIRMED,
                '0xconfirmed'
            );

            // Try concurrent operations
            const operations = [
                paymentService.startYieldGeneration(payment.id),
                paymentService.updatePaymentYield(payment.id),
                paymentService.getPayment(payment.id)
            ];

            // All operations should complete without errors
            const results = await Promise.allSettled(operations);
            const failures = results.filter(r => r.status === 'rejected');
            expect(failures).toHaveLength(0);
        });
    });

    describe('Performance Tests', () => {
        it('should handle bulk payment creation efficiently', async () => {
            const startTime = Date.now();
            const paymentPromises = [];

            // Create 50 payments concurrently
            for (let i = 0; i < 50; i++) {
                const createRequest = {
                    merchantAddress: '0x9876543210987654321098765432109876543210',
                    amount: '10.00',
                    token: 'USDC' as any,
                    chain: 'ethereum' as any
                };

                paymentPromises.push(
                    paymentService.createPayment(createRequest, testUser.id)
                );
            }

            const payments = await Promise.all(paymentPromises);
            const endTime = Date.now();

            expect(payments).toHaveLength(50);
            expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

            // Verify all payments were created
            const storedPayments = await prisma.payment.findMany({
                where: { userId: testUser.id }
            });
            expect(storedPayments).toHaveLength(50);
        });

        it('should efficiently retrieve large payment histories', async () => {
            // Create 100 payments
            const paymentPromises = [];
            for (let i = 0; i < 100; i++) {
                const createRequest = {
                    merchantAddress: '0x9876543210987654321098765432109876543210',
                    amount: '10.00',
                    token: 'USDC' as any,
                    chain: 'ethereum' as any
                };

                paymentPromises.push(
                    paymentService.createPayment(createRequest, testUser.id)
                );
            }
            await Promise.all(paymentPromises);

            // Retrieve payment history
            const startTime = Date.now();
            const history = await paymentService.getUserPaymentHistory(testUser.id, 100, 0);
            const endTime = Date.now();

            expect(history.payments).toHaveLength(100);
            expect(history.analytics.totalPayments).toBe(100);
            expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
        });
    });
});