import { jest } from '@jest/globals';
import { NotificationService } from '../../src/services/NotificationService';
import { PrismaClient, NotificationType, NotificationChannel } from '@prisma/client';
import axios from 'axios';
import { ApiTestUtils, ErrorTestUtils, TimeTestUtils } from '../helpers/testUtils';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('axios');

const mockPrisma = {
    notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn()
    }
};

const mockAxios = axios as jest.Mocked<typeof axios>;

describe('NotificationService', () => {
    let notificationService: NotificationService;
    let testPayment: any;
    let testUser: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup mocks
        (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any);
        
        notificationService = new NotificationService();

        // Test data
        testUser = ApiTestUtils.createTestUser();
        testPayment = ApiTestUtils.createTestPayment({
            userId: testUser.id,
            amount: 100,
            tokenSymbol: 'USDC',
            status: 'PENDING',
            user: testUser
        });
    });

    describe('sendPaymentCreated', () => {
        beforeEach(() => {
            mockPrisma.notification.create.mockResolvedValue({});
        });

        it('should send payment created notification successfully', async () => {
            await notificationService.sendPaymentCreated(testPayment, 'customer@test.com');

            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: testPayment.userId,
                    type: NotificationType.PAYMENT_RECEIVED,
                    title: 'Payment Created',
                    message: expect.stringContaining('Your payment of 100 USDC has been created'),
                    data: expect.objectContaining({
                        paymentId: testPayment.id,
                        amount: testPayment.amount,
                        currency: testPayment.tokenSymbol
                    }),
                    channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH]
                })
            });
        });

        it('should handle notification creation without customer email', async () => {
            await notificationService.sendPaymentCreated(testPayment);

            expect(mockPrisma.notification.create).toHaveBeenCalled();
            // Should not attempt to send email
        });

        it('should handle notification creation errors gracefully', async () => {
            mockPrisma.notification.create.mockRejectedValue(new Error('Database error'));

            // Should not throw error
            await expect(notificationService.sendPaymentCreated(testPayment))
                .resolves.not.toThrow();
        });
    });

    describe('sendPaymentStatusUpdate', () => {
        beforeEach(() => {
            mockPrisma.notification.create.mockResolvedValue({});
        });

        it('should send status update for confirmed payment', async () => {
            const confirmedPayment = { ...testPayment, status: 'CONFIRMED' };

            await notificationService.sendPaymentStatusUpdate(confirmedPayment);

            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: NotificationType.PAYMENT_RECEIVED,
                    title: 'Payment Confirmed',
                    message: expect.stringContaining('has been confirmed and is now generating yield')
                })
            });
        });

        it('should send status update for completed payment', async () => {
            const completedPayment = { 
                ...testPayment, 
                status: 'COMPLETED',
                actualYield: 5.0
            };

            await notificationService.sendPaymentStatusUpdate(completedPayment);

            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: NotificationType.PAYMENT_COMPLETED,
                    title: 'Payment Completed',
                    message: expect.stringContaining('Total yield earned: 5')
                })
            });
        });

        it('should send status update for failed payment', async () => {
            const failedPayment = { ...testPayment, status: 'FAILED' };

            await notificationService.sendPaymentStatusUpdate(failedPayment);

            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: NotificationType.SECURITY_ALERT,
                    title: 'Payment Failed',
                    message: expect.stringContaining('has failed')
                })
            });
        });

        it('should handle unknown payment status', async () => {
            const unknownStatusPayment = { ...testPayment, status: 'UNKNOWN_STATUS' };

            await notificationService.sendPaymentStatusUpdate(unknownStatusPayment);

            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: NotificationType.SYSTEM_UPDATE,
                    title: 'Payment Update',
                    message: expect.stringContaining('status has been updated to UNKNOWN_STATUS')
                })
            });
        });
    });

    describe('sendYieldUpdate', () => {
        beforeEach(() => {
            mockPrisma.notification.create.mockResolvedValue({});
        });

        it('should send yield update notification', async () => {
            await notificationService.sendYieldUpdate(testPayment, '2.5');

            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: NotificationType.YIELD_EARNED,
                    title: 'Yield Earned',
                    message: expect.stringContaining("You've earned 2.5 USDC in yield"),
                    data: expect.objectContaining({
                        paymentId: testPayment.id,
                        yieldAmount: '2.5',
                        currency: testPayment.tokenSymbol
                    })
                })
            });
        });
    });

    describe('sendPaymentFailed', () => {
        beforeEach(() => {
            mockPrisma.notification.create.mockResolvedValue({});
        });

        it('should send payment failed notification', async () => {
            const error = new Error('Transaction reverted');

            await notificationService.sendPaymentFailed(testPayment, error);

            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: NotificationType.SECURITY_ALERT,
                    title: 'Payment Failed',
                    message: expect.stringContaining('has failed'),
                    data: expect.objectContaining({
                        paymentId: testPayment.id,
                        error: error.message,
                        amount: testPayment.amount
                    })
                })
            });
        });
    });

    describe('sendPaymentCancelled', () => {
        beforeEach(() => {
            mockPrisma.notification.create.mockResolvedValue({});
        });

        it('should send payment cancelled notification', async () => {
            const reason = 'User requested cancellation';

            await notificationService.sendPaymentCancelled(testPayment, reason);

            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: NotificationType.SYSTEM_UPDATE,
                    title: 'Payment Cancelled',
                    message: expect.stringContaining('has been cancelled'),
                    data: expect.objectContaining({
                        paymentId: testPayment.id,
                        reason,
                        amount: testPayment.amount
                    })
                })
            });
        });

        it('should handle cancellation without reason', async () => {
            await notificationService.sendPaymentCancelled(testPayment);

            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    data: expect.objectContaining({
                        reason: undefined
                    })
                })
            });
        });
    });

    describe('sendWebhook', () => {
        const webhookUrl = 'https://merchant.com/webhook';
        const payload = {
            event: 'payment.completed',
            payment: { id: 'payment-1', amount: 100 }
        };

        beforeEach(() => {
            mockAxios.post.mockResolvedValue({ status: 200 });
        });

        it('should send webhook successfully', async () => {
            await notificationService.sendWebhook(webhookUrl, payload);

            expect(mockAxios.post).toHaveBeenCalledWith(
                webhookUrl,
                payload,
                expect.objectContaining({
                    timeout: 10000,
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'User-Agent': 'YieldRails-Webhook/1.0',
                        'X-YieldRails-Signature': expect.any(String)
                    })
                })
            );
        });

        it('should retry webhook on failure', async () => {
            mockAxios.post
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ status: 200 });

            await notificationService.sendWebhook(webhookUrl, payload);

            expect(mockAxios.post).toHaveBeenCalledTimes(3);
        });

        it('should give up after max retries', async () => {
            mockAxios.post.mockRejectedValue(new Error('Network error'));

            await notificationService.sendWebhook(webhookUrl, payload);

            expect(mockAxios.post).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        it('should retry on non-2xx status codes', async () => {
            mockAxios.post
                .mockResolvedValueOnce({ status: 500 })
                .mockResolvedValueOnce({ status: 200 });

            await notificationService.sendWebhook(webhookUrl, payload);

            expect(mockAxios.post).toHaveBeenCalledTimes(2);
        });

        it('should implement exponential backoff', async () => {
            jest.useFakeTimers();
            
            mockAxios.post
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ status: 200 });

            const webhookPromise = notificationService.sendWebhook(webhookUrl, payload);
            
            // Fast-forward through the backoff delay
            jest.advanceTimersByTime(2000); // 2^1 * 1000ms
            
            await webhookPromise;

            expect(mockAxios.post).toHaveBeenCalledTimes(2);
            
            jest.useRealTimers();
        });
    });

    describe('sendEmail', () => {
        it('should log email sending attempt', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await notificationService.sendEmail(
                'test@example.com',
                'Test Subject',
                '<h1>Test Email</h1>'
            );

            // In the mock implementation, it just logs
            // In production, this would integrate with an email service
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });

    describe('broadcastRealTime', () => {
        it('should log real-time broadcast attempt', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await notificationService.broadcastRealTime(
                'user-1',
                'payment:updated',
                { paymentId: 'payment-1', status: 'CONFIRMED' }
            );

            // In the mock implementation, it just logs
            // In production, this would broadcast via WebSocket
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });

    describe('getUserNotifications', () => {
        const mockNotifications = [
            {
                id: 'notif-1',
                type: NotificationType.PAYMENT_RECEIVED,
                title: 'Payment Created',
                message: 'Your payment has been created',
                isRead: false,
                createdAt: new Date()
            },
            {
                id: 'notif-2',
                type: NotificationType.YIELD_EARNED,
                title: 'Yield Earned',
                message: 'You earned yield',
                isRead: true,
                createdAt: new Date()
            }
        ];

        beforeEach(() => {
            mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
            mockPrisma.notification.count.mockResolvedValue(1); // 1 unread
        });

        it('should return user notifications with unread count', async () => {
            const result = await notificationService.getUserNotifications('user-1');

            expect(result).toEqual({
                notifications: mockNotifications,
                unreadCount: 1,
                total: mockNotifications.length
            });

            expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                orderBy: { createdAt: 'desc' },
                take: 50,
                skip: 0
            });

            expect(mockPrisma.notification.count).toHaveBeenCalledWith({
                where: { userId: 'user-1', isRead: false }
            });
        });

        it('should handle pagination parameters', async () => {
            await notificationService.getUserNotifications('user-1', 25, 50);

            expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                orderBy: { createdAt: 'desc' },
                take: 25,
                skip: 50
            });
        });

        it('should handle database errors', async () => {
            mockPrisma.notification.findMany.mockRejectedValue(new Error('Database error'));

            await ErrorTestUtils.expectToThrow(
                () => notificationService.getUserNotifications('user-1'),
                'Database error'
            );
        });
    });

    describe('markAsRead', () => {
        beforeEach(() => {
            mockPrisma.notification.update.mockResolvedValue({});
        });

        it('should mark notification as read', async () => {
            await notificationService.markAsRead('notif-1', 'user-1');

            expect(mockPrisma.notification.update).toHaveBeenCalledWith({
                where: { 
                    id: 'notif-1',
                    userId: 'user-1'
                },
                data: { 
                    isRead: true,
                    updatedAt: expect.any(Date)
                }
            });
        });

        it('should handle database errors', async () => {
            mockPrisma.notification.update.mockRejectedValue(new Error('Database error'));

            await ErrorTestUtils.expectToThrow(
                () => notificationService.markAsRead('notif-1', 'user-1'),
                'Database error'
            );
        });
    });

    describe('Email Template Generation', () => {
        it('should generate payment created email template', () => {
            const template = notificationService['generatePaymentCreatedEmailTemplate'](testPayment);

            expect(template).toContain('Payment Created Successfully');
            expect(template).toContain(testPayment.amount.toString());
            expect(template).toContain(testPayment.tokenSymbol);
            expect(template).toContain(testPayment.id);
        });

        it('should generate status update email template', () => {
            const completedPayment = { ...testPayment, status: 'COMPLETED', actualYield: 5.0 };
            const template = notificationService['generateStatusUpdateEmailTemplate'](completedPayment);

            expect(template).toContain('Payment Status Update');
            expect(template).toContain('COMPLETED');
            expect(template).toContain('5');
        });

        it('should generate payment failed email template', () => {
            const error = new Error('Transaction failed');
            const template = notificationService['generatePaymentFailedEmailTemplate'](testPayment, error);

            expect(template).toContain('Payment Failed');
            expect(template).toContain(error.message);
            expect(template).toContain(testPayment.id);
        });

        it('should generate payment cancelled email template', () => {
            const reason = 'User requested';
            const template = notificationService['generatePaymentCancelledEmailTemplate'](testPayment, reason);

            expect(template).toContain('Payment Cancelled');
            expect(template).toContain(reason);
            expect(template).toContain(testPayment.id);
        });

        it('should handle cancelled email template without reason', () => {
            const template = notificationService['generatePaymentCancelledEmailTemplate'](testPayment);

            expect(template).toContain('Payment Cancelled');
            expect(template).not.toContain('<p><strong>Reason:</strong>');
        });
    });

    describe('Webhook Signature Generation', () => {
        it('should generate consistent webhook signatures', () => {
            const payload = { test: 'data' };
            
            const signature1 = notificationService['generateWebhookSignature'](payload);
            const signature2 = notificationService['generateWebhookSignature'](payload);

            expect(signature1).toBe(signature2);
            expect(signature1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
        });

        it('should generate different signatures for different payloads', () => {
            const payload1 = { test: 'data1' };
            const payload2 = { test: 'data2' };
            
            const signature1 = notificationService['generateWebhookSignature'](payload1);
            const signature2 = notificationService['generateWebhookSignature'](payload2);

            expect(signature1).not.toBe(signature2);
        });
    });

    describe('Notification Type Mapping', () => {
        it('should map payment statuses to notification types correctly', () => {
            expect(notificationService['getNotificationTypeFromStatus']('CONFIRMED'))
                .toBe(NotificationType.PAYMENT_RECEIVED);
            expect(notificationService['getNotificationTypeFromStatus']('COMPLETED'))
                .toBe(NotificationType.PAYMENT_COMPLETED);
            expect(notificationService['getNotificationTypeFromStatus']('FAILED'))
                .toBe(NotificationType.SECURITY_ALERT);
            expect(notificationService['getNotificationTypeFromStatus']('UNKNOWN'))
                .toBe(NotificationType.SYSTEM_UPDATE);
        });
    });

    describe('Status Update Titles and Messages', () => {
        it('should generate appropriate titles for different statuses', () => {
            expect(notificationService['getStatusUpdateTitle']('CONFIRMED'))
                .toBe('Payment Confirmed');
            expect(notificationService['getStatusUpdateTitle']('COMPLETED'))
                .toBe('Payment Completed');
            expect(notificationService['getStatusUpdateTitle']('FAILED'))
                .toBe('Payment Failed');
            expect(notificationService['getStatusUpdateTitle']('CANCELLED'))
                .toBe('Payment Cancelled');
            expect(notificationService['getStatusUpdateTitle']('UNKNOWN'))
                .toBe('Payment Update');
        });

        it('should generate appropriate messages for different statuses', () => {
            const confirmedPayment = { ...testPayment, status: 'CONFIRMED' };
            const completedPayment = { ...testPayment, status: 'COMPLETED', actualYield: 5.0 };
            const failedPayment = { ...testPayment, status: 'FAILED' };

            expect(notificationService['getStatusUpdateMessage'](confirmedPayment))
                .toContain('confirmed and is now generating yield');
            expect(notificationService['getStatusUpdateMessage'](completedPayment))
                .toContain('Total yield earned: 5');
            expect(notificationService['getStatusUpdateMessage'](failedPayment))
                .toContain('has failed');
        });
    });

    describe('Error Handling', () => {
        it('should handle notification creation errors gracefully', async () => {
            mockPrisma.notification.create.mockRejectedValue(new Error('Database error'));

            // Should not throw errors for any notification method
            await expect(notificationService.sendPaymentCreated(testPayment)).resolves.not.toThrow();
            await expect(notificationService.sendPaymentStatusUpdate(testPayment)).resolves.not.toThrow();
            await expect(notificationService.sendYieldUpdate(testPayment, '1.0')).resolves.not.toThrow();
        });

        it('should handle webhook errors gracefully', async () => {
            mockAxios.post.mockRejectedValue(new Error('Network error'));

            // Should not throw error even when all retries fail
            await expect(notificationService.sendWebhook('https://test.com', {}))
                .resolves.not.toThrow();
        });

        it('should handle email sending errors gracefully', async () => {
            // Mock email service error (in production implementation)
            await expect(notificationService.sendEmail('test@test.com', 'Subject', 'Body'))
                .resolves.not.toThrow();
        });

        it('should handle real-time broadcast errors gracefully', async () => {
            // Mock WebSocket service error (in production implementation)
            await expect(notificationService.broadcastRealTime('user-1', 'event', {}))
                .resolves.not.toThrow();
        });
    });

    describe('Sleep Utility', () => {
        it('should implement sleep correctly', async () => {
            jest.useFakeTimers();
            
            const sleepPromise = notificationService['sleep'](1000);
            
            jest.advanceTimersByTime(1000);
            
            await expect(sleepPromise).resolves.toBeUndefined();
            
            jest.useRealTimers();
        });
    });
});